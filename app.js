const db = window.airportManagerSupabase;
const Game = window.AirportManagerGame;
let airports = [];
let selectedAirport = null;
let state = Game.newState();
let airportMap = null;
let airportLayers = [];
const list = document.getElementById('airportList');
const msg = document.getElementById('message');

function update(){
 document.getElementById('money').textContent=`💰 $${Math.round(state.money).toLocaleString()}`;
 document.getElementById('level').textContent=`⭐ Level ${state.level}`;
 document.getElementById('reputation').textContent=`🏆 Rep ${state.reputation}`;
 document.getElementById('vehicles').textContent=Object.values(state.vehicles).reduce((a,b)=>a+b,0);
 document.getElementById('atc').textContent=state.staff.atc||0;
 document.getElementById('aircraft').textContent=state.stats.aircraft;
 document.getElementById('passengers').textContent=state.stats.passengers.toLocaleString();
 document.getElementById('finance').innerHTML=`Revenue <b>$${state.stats.revenue.toLocaleString()}</b><br>Expenses <b>$${state.stats.expenses.toLocaleString()}</b><br>Completed <b>${state.stats.completed}</b>`;
 document.getElementById('events').innerHTML=state.events.length?state.events.slice(0,6).map(e=>`<div class="event"><b>${e.title}</b><br><small>${e.description}</small></div>`).join(''):'No events yet.';
 renderFlights();
}
function render(items=airports){list.innerHTML=items.length?items.map(a=>`<div class="airport ${selectedAirport?.icao===a.icao?'active':''}" data-icao="${a.icao}"><b>${a.icao}</b> · ${a.name}<small>${a.city||''}${a.country?`, ${a.country}`:''}</small></div>`).join(''):'<p>No airports found.</p>';list.querySelectorAll('.airport').forEach(e=>e.onclick=()=>selectAirport(e.dataset.icao));}
function initMap(a){
 if(!airportMap) airportMap=L.map('map',{zoomControl:true,preferCanvas:true});
 airportMap.setView([a.latitude,a.longitude],14);
 airportLayers.forEach(layer=>airportMap.removeLayer(layer)); airportLayers=[];
 const imagery=L.tileLayer('https://global.imagery.hotosm.org/{z}/{x}/{y}.png',{maxZoom:20,attribution:'© OpenAerialMap / HOT'}).addTo(airportMap);
 airportLayers.push(imagery);
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{opacity:.18,maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(airportMap);
 airportLayers.push(imagery);
}
async function loadOSM(a){
 const q=`[out:json][timeout:25];(way["aeroway"~"^(runway|taxiway|taxilane)$"](around:8000,${a.latitude},${a.longitude});way["aeroway"="terminal"](around:8000,${a.latitude},${a.longitude});node["aeroway"~"^(gate|parking_position)$"](around:8000,${a.latitude},${a.longitude}););out body geom;`;
 try{
  const res=await fetch('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(q));
  if(!res.ok) throw new Error(`OSM ${res.status}`);
  const data=await res.json();
  data.elements.forEach(el=>{
   const tags=el.tags||{};
   if(el.type==='way'&&el.geometry?.length){
    const pts=el.geometry.map(p=>[p.lat,p.lon]);
    let layer;
    if(tags.aeroway==='runway') layer=L.polyline(pts,{color:'#e9edf2',weight:10,opacity:.9}).bindTooltip(tags.ref||'Runway');
    else if(tags.aeroway==='terminal') layer=L.polygon(pts,{color:'#38bdf8',fillColor:'#38bdf8',fillOpacity:.25,weight:2}).bindTooltip(tags.name||'Terminal');
    else layer=L.polyline(pts,{color:'#f59e0b',weight:4,opacity:.65}).bindTooltip(tags.ref||tags.name||'Taxiway');
    layer.addTo(airportMap); airportLayers.push(layer);
   } else if(el.type==='node'&&el.lat&&el.lon){
    const label=tags.ref||tags.name||(tags.aeroway==='parking_position'?'Parking position':'Gate');
    const layer=L.circleMarker([el.lat,el.lon],{radius:4,color:'#facc15',fillColor:'#facc15',fillOpacity:.9}).bindTooltip(label);
    layer.addTo(airportMap); airportLayers.push(layer);
   }
  });
  msg.textContent=`${a.name} loaded from OpenStreetMap + OpenAerialMap imagery.`;
 }catch(e){msg.textContent=`${a.name} loaded. Live airport geometry unavailable right now.`;console.warn(e);}
}
async function selectAirport(icao){
 const a=airports.find(x=>x.icao===icao);if(!a)return;
 selectedAirport=a;
 document.getElementById('airportName').textContent=a.name;
 document.getElementById('airportCode').textContent=`${a.icao} · ${a.city||''}${a.country?`, ${a.country}`:''}`;
 render();
 if(!airportMap)initMap(a); else airportMap.setView([a.latitude,a.longitude],14);
 await loadOSM(a);
}
async function loadAirports(){
 msg.textContent='Loading airports...';
 const {data,error}=await db.from('airports').select('*').order('icao');
 if(error){msg.textContent=`Supabase error: ${error.message}`;return;}
 airports=data||[];render();update();if(airports.length)selectAirport(airports[0].icao);
}
function addFlight(){const code=document.getElementById('aircraftType').value;const num=document.getElementById('flightNumber').value.trim()||'FLIGHT';const result=Game.schedule(state,code,num,'A1');if(!result[0]){msg.textContent=result[1];return;}Game.event(state,'Flight accepted',`${num} ${code} entered turnaround queue.`);msg.textContent=`${num} turnaround started.`;update();}
function advanceSim(){if(!state.flights.length){msg.textContent='No active turnarounds.';return;}Game.tick(state);msg.textContent='Simulation advanced 10%. Complete flights generate revenue.';update();}
function buyVehicle(){buyVehicleType('pushback');}
function buyVehicleType(type){const r=Game.buy(state,type);msg.textContent=r[1];if(r[0])Game.event(state,'Vehicle purchased',`${type} equipment added.`);update();}
function hireATC(){hireRole('atc');}
function hireRole(role){const r=Game.hire(state,role);msg.textContent=r[1];if(r[0])Game.event(state,'Staff hired',`${role} staff added.`);update();}
function renderFlights(){const q=document.getElementById('flightQueue');q.innerHTML=state.flights.length?state.flights.map(f=>`<div class="flight"><b>${f.flightNumber}</b> · ${f.code}<span>${f.status} · ${f.progress}%</span></div>`).join(''):'No active turnarounds.';}
document.getElementById('expandBtn').onclick=()=>{const r=Game.expand(state);msg.textContent=r[0]?`Airport expanded for $${r[1].toLocaleString()}.`:`Expansion costs $${r[1].toLocaleString()}.`;update();};
document.getElementById('search').oninput=e=>{const q=e.target.value.toLowerCase();render(airports.filter(a=>`${a.icao} ${a.name} ${a.city||''} ${a.country||''}`.toLowerCase().includes(q)));};
update();loadAirports();
setInterval(()=>{if(state.flights.some(f=>f.status!=='departed')){Game.tick(state);update();}},5000);
