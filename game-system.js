/* Airport Manager simulation core. */
window.AirportManagerGame = (() => {
  const VEHICLES = { pushback:15000, tug:22000, fuel:30000, baggage:18000, catering:24000, stairs:12000 };
  const STAFF = { atc:8000, ramp:4500, dispatcher:6000, security:5000, maintenance:5500 };
  const AIRCRAFT = { B738:{seats:189,turnaround:40,fee:2500}, A320:{seats:186,turnaround:40,fee:2500}, A321:{seats:220,turnaround:45,fee:3000}, B77W:{seats:396,turnaround:90,fee:7000}, A359:{seats:325,turnaround:85,fee:6500}, A388:{seats:525,turnaround:120,fee:10000} };
  const STATUS=['arriving','parked','boarding','pushback','taxiing','departed'];
  function newState(){return {money:250000,level:1,reputation:50,vehicles:{pushback:2,tug:1,fuel:1,baggage:1,catering:1,stairs:1},staff:{atc:4,ramp:6,dispatcher:2,security:4,maintenance:3},flights:[],events:[],stats:{aircraft:0,passengers:0,revenue:0,expenses:0,completed:0},expansions:0,unlimited:false};}
  function vehicleCost(type){return VEHICLES[type]||15000}
  function hireCost(role){return STAFF[role]||5000}
  function buy(s,type,qty=1){const cost=vehicleCost(type)*qty;if(!s.unlimited&&s.money<cost)return [false,'Insufficient funds'];if(!s.unlimited)s.money-=cost;s.vehicles[type]=(s.vehicles[type]||0)+qty;if(!s.unlimited)s.stats.expenses+=cost;return [true,`Purchased ${qty} ${type} vehicle(s)`]}
  function hire(s,role,qty=1){const cost=hireCost(role)*qty;if(!s.unlimited&&s.money<cost)return [false,'Insufficient funds'];if(!s.unlimited)s.money-=cost;s.staff[role]=(s.staff[role]||0)+qty;if(!s.unlimited)s.stats.expenses+=cost;return [true,`Hired ${qty} ${role} staff`]}
  function schedule(s,code,flightNumber,gate='A1'){const a=AIRCRAFT[code]||AIRCRAFT.B738;if((s.vehicles.pushback||0)<1||(s.staff.ramp||0)<1)return [false,'Need ramp equipment and ramp staff'];const f={id:crypto.randomUUID?.()||String(Date.now()),code,flightNumber,gate,status:'arriving',progress:0,seats:a.seats,revenue:a.fee};s.flights.push(f);s.stats.aircraft++;return [true,f]}
  function tick(s){for(const f of s.flights){if(f.status==='departed')continue;f.progress=Math.min(100,f.progress+10);if(f.progress>=100){f.status='departed';if(s.unlimited)s.money=Number.MAX_SAFE_INTEGER;s.money+=f.revenue;s.stats.revenue+=f.revenue;s.stats.passengers+=f.seats;s.stats.completed++;s.reputation=Math.min(100,s.reputation+1)}else f.status=STATUS[Math.min(STATUS.length-1,Math.floor(f.progress/20))];}if(s.stats.completed&&s.stats.completed%10===0)s.level=Math.max(s.level,1+Math.floor(s.stats.completed/10));return s}
  function expansionCost(level){return 50000+level*25000}
  function expand(s){const cost=expansionCost(s.expansions);if(!s.unlimited&&s.money<cost)return [false,cost];if(!s.unlimited)s.money-=cost;s.stats.expenses+=s.unlimited?0:cost;s.expansions++;s.level++;return [true,cost]}
  function activateUnlimited(s){s.unlimited=true;s.money=Number.MAX_SAFE_INTEGER;s.level=999;s.reputation=100;Object.keys(VEHICLES).forEach(k=>s.vehicles[k]=9999);Object.keys(STAFF).forEach(k=>s.staff[k]=9999);event(s,'Developer code activated','Unlimited money, vehicles, staff and expansion funds unlocked.');return true}
  function event(s,title,description,severity='info'){s.events.unshift({title,description,severity,time:new Date().toISOString()});s.events=s.events.slice(0,30)}
  return {newState,VEHICLES,STAFF,AIRCRAFT,buy,hire,schedule,tick,expand,expansionCost,activateUnlimited,event};
})();
