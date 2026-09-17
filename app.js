const db = window.airportManagerSupabase;
const Game = window.AirportManagerGame;
let airports = [];
let selectedAirport = null;
let state = Game.newState();
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
async function selectAirport(icao){const a=airports.find(x=>x.icao===icao);if(!a)return;selectedAirport=a;document.getElementById('airportName').textContent=a.name;document.getElementById('airportCode').textContent=`${a.icao} · ${a.city||''}${a.country?`, ${a.country}`:''}`;render();msg.textContent=`${a.name} loaded.`;const [rw,tm,gt,im]=await Promise.all([db.from('runways').select('*').eq('airport_id',a.id),db.from('terminals').select('*').eq('airport_id',a.id),db.from('gates').select('*').eq('airport_id',a.id),db.from('airport_imagery_sources').select('*').eq('airport_id',a.id).limit(1).maybeSingle()]);renderAirportMap(rw.data||[],tm.data||[],gt.data||[],im.data);}
function renderAirportMap(runways,terminals,gates,imagery){const map=document.getElementById('map');map.style.backgroundImage='';if(imagery?.source_url&&selectedAirport?.latitude&&selectedAirport?.longitude){const z=15,x=Math.floor((selectedAirport.longitude+180)/360*2**z),y=Math.floor((1-Math.asinh(Math.tan(selectedAirport.latitude*Math.PI/180))/Math.PI)/2*2**z);map.style.backgroundImage=`url(${imagery.source_url.replace('{z}',z).replace('{x}',x).replace('{y}',y)})`;map.style.backgroundSize='cover';}map.innerHTML=`<div class="mapOverlay"><b>${selectedAirport?.icao||''}</b><br>Runways: ${runways.length||'pending'}<br>Terminals: ${terminals.length||'pending'}<br>Gates: ${gates.length||'pending'}</div>`;}
async function loadAirports(){msg.textContent='Loading airports...';const {data,error}=await db.from('airports').select('*').order('icao');if(error){msg.textContent=`Supabase error: ${error.message}`;return;}airports=data||[];render();update();if(airports.length)selectAirport(airports[0].icao);}
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
