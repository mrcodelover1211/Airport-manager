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
  if (!items.length) {
    list.innerHTML = '<p>No airports found.</p>';
    return;
  }
  list.innerHTML = items.map((a, i) => `
    <div class="airport ${selectedAirport?.icao === a.icao || (!selectedAirport && i === 0) ? 'active' : ''}" data-icao="${a.icao}">
      <b>${a.icao}</b> · ${a.name}
      <small>${a.city || ''}${a.country ? `, ${a.country}` : ''}</small>
    </div>`).join('');
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

  const { data: runways } = await db.from('runways').select('*').eq('airport_id', airport.id);
  const { data: terminals } = await db.from('terminals').select('*').eq('airport_id', airport.id);
  const { data: gates } = await db.from('gates').select('*').eq('airport_id', airport.id);
  renderAirportMap(runways || [], terminals || [], gates || []);
}

function renderAirportMap(runways, terminals, gates) {
  const map = document.getElementById('map');
  const runwayLabels = runways.length ? runways.map(r => r.ident).join(' · ') : 'Runways loading / not imported yet';
  const terminalLabels = terminals.length ? terminals.map(t => t.name).join(' · ') : 'Terminals not imported yet';
  const gateLabels = gates.length ? gates.slice(0, 12).map(g => g.name).join(' · ') : 'Gates not imported yet';
  map.innerHTML = `
    <div class="runway r1">${runwayLabels}</div>
    <div class="terminal t1">${terminalLabels}</div>
    <div class="terminal t2">GATES: ${gateLabels}</div>`;
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
  state.money -= 15000;
  state.vehicles++;
  msg.textContent = 'New ground-handling vehicle purchased.';
  update();
}

function hireATC() {
  if (state.money < 8000) return msg.textContent = 'Not enough money.';
  state.money -= 8000;
  state.atc++;
  msg.textContent = 'ATC controller hired.';
  update();
}

function addFlight() {
  state.aircraft++;
  state.passengers += 180;
  state.money += 5000;
  msg.textContent = 'Flight scheduled. Turnaround revenue received.';
  update();
}

document.getElementById('expandBtn').onclick = () => {
  const cost = 50000 + state.expansions * 25000;
  if (state.money < cost) return msg.textContent = `Expansion costs $${cost.toLocaleString()}.`;
  state.money -= cost;
  state.expansions++;
  msg.textContent = 'Airport expanded: new capacity and facilities unlocked.';
  update();
};

document.getElementById('search').oninput = e => {
  const q = e.target.value.toLowerCase();
  render(airports.filter(a => `${a.icao} ${a.name} ${a.city || ''} ${a.country || ''}`.toLowerCase().includes(q)));
};

update();
loadAirports();
