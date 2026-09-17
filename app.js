const db = window.airportManagerSupabase;

let airports = [];
let selectedAirport = null;
let state = { money: 250000, vehicles: 4, atc: 6, aircraft: 3, passengers: 1240, expansions: 0 };

const list = document.getElementById('airportList');
const msg = document.getElementById('message');

function update() {
  document.querySelector('.stats').innerHTML = `<span>💰 $${state.money.toLocaleString()}</span><span>⭐ Level ${1 + state.expansions}</span>`;
  document.getElementById('vehicles').textContent = state.vehicles;
  document.getElementById('atc').textContent = state.atc;
  document.getElementById('aircraft').textContent = state.aircraft;
  document.getElementById('passengers').textContent = state.passengers.toLocaleString();
}

function render(items = airports) {
  list.innerHTML = items.length ? items.map((a, i) => `
    <div class="airport ${selectedAirport?.icao === a.icao || (!selectedAirport && i === 0) ? 'active' : ''}" data-icao="${a.icao}">
      <b>${a.icao}</b> · ${a.name}<small>${a.city || ''}${a.country ? `, ${a.country}` : ''}</small>
    </div>`).join('') : '<p>No airports found.</p>';
  list.querySelectorAll('.airport').forEach(el => el.addEventListener('click', () => selectAirport(el.dataset.icao)));
}

async function selectAirport(icao) {
  const airport = airports.find(a => a.icao === icao);
  if (!airport) return;
  selectedAirport = airport;
  document.getElementById('airportName').textContent = airport.name;
  document.getElementById('airportCode').textContent = `${airport.icao} · ${airport.city || ''}${airport.country ? `, ${airport.country}` : ''}`;
  msg.textContent = `${airport.name} loaded from Supabase.`;
  render();

  const [rw, tm, gt, im] = await Promise.all([
    db.from('runways').select('*').eq('airport_id', airport.id),
    db.from('terminals').select('*').eq('airport_id', airport.id),
    db.from('gates').select('*').eq('airport_id', airport.id),
    db.from('airport_imagery_sources').select('*').eq('airport_id', airport.id).limit(1).maybeSingle()
  ]);
  renderAirportMap(rw.data || [], tm.data || [], gt.data || [], im.data);
}

function renderAirportMap(runways, terminals, gates, imagery) {
  const map = document.getElementById('map');
  const lat = selectedAirport?.latitude;
  const lon = selectedAirport?.longitude;
  const zoom = 15;
  const satellite = imagery?.source_url;
  if (satellite && lat && lon) {
    const x = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
    const y = Math.floor((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    map.style.backgroundImage = `url(${satellite.replace('{z}', zoom).replace('{x}', x).replace('{y}', y)})`;
    map.style.backgroundSize = 'cover';
    map.style.backgroundPosition = 'center';
  } else {
    map.style.backgroundImage = '';
  }
  const runwayLabels = runways.length ? runways.map(r => r.ident).join(' · ') : 'Runways pending import';
  const terminalLabels = terminals.length ? terminals.map(t => t.name).join(' · ') : 'Terminals pending import';
  const gateLabels = gates.length ? gates.slice(0, 16).map(g => g.name).join(' · ') : 'Gates pending import';
  map.innerHTML = `<div class="mapOverlay"><b>${selectedAirport?.icao || ''}</b><br>${runwayLabels}<br>${terminalLabels}<br>${gateLabels}</div>`;
}

async function loadAirports() {
  msg.textContent = 'Loading airports from Supabase...';
  const { data, error } = await db.from('airports').select('*').order('icao');
  if (error) {
    console.error(error);
    msg.textContent = `Supabase error: ${error.message}`;
    return;
  }
  airports = data || [];
  render();
  update();
  if (airports.length) await selectAirport(airports[0].icao);
  else msg.textContent = 'Supabase is connected, but no airports are in the database yet.';
}

function buyVehicle() {
  if (state.money < 15000) return msg.textContent = 'Not enough money.';
  state.money -= 15000; state.vehicles++;
  msg.textContent = 'New ground-handling vehicle purchased.'; update();
}
function hireATC() {
  if (state.money < 8000) return msg.textContent = 'Not enough money.';
  state.money -= 8000; state.atc++;
  msg.textContent = 'ATC controller hired.'; update();
}
function addFlight() {
  state.aircraft++; state.passengers += 180; state.money += 5000;
  msg.textContent = 'Flight scheduled. Turnaround revenue received.'; update();
}

document.getElementById('expandBtn').onclick = () => {
  const cost = 50000 + state.expansions * 25000;
  if (state.money < cost) return msg.textContent = `Expansion costs $${cost.toLocaleString()}.`;
  state.money -= cost; state.expansions++;
  msg.textContent = 'Airport expanded: new capacity and facilities unlocked.'; update();
};

document.getElementById('search').oninput = e => {
  const q = e.target.value.toLowerCase();
  render(airports.filter(a => `${a.icao} ${a.name} ${a.city || ''} ${a.country || ''}`.toLowerCase().includes(q)));
};

update();
loadAirports();
