/* Airport Manager simulation core. */
window.AirportManagerGame=(()=>{
const VEHICLES={pushback:15000,tug:22000,fuel:30000,baggage:18000,catering:24000,stairs:12000};
const STAFF={atc:8000,ramp:4500,dispatcher:6000,security:5000,maintenance:5500};
const AIRCRAFT={B738:{name:'Boeing 737-800',seats:189,turnaround:40,fee:2500},A320:{name:'Airbus A320',seats:186,turnaround:40,fee:2500},A321:{name:'Airbus A321',seats:220,turnaround:45,fee:3000},B77W:{name:'Boeing 777-300ER',seats:396,turnaround:90,fee:7000},A359:{name:'Airbus A350-900',seats:325,turnaround:85,fee:6500},A388:{name:'Airbus A380',seats:525,turnaround:120,fee:10000}};
const SERVICE_STEPS=['fuel','baggage','catering','security'];
function newState(){return{money:250000,level:1,reputation:50,vehicles:{pushback:2,tug:1,fuel:1,baggage:1,catering:1,stairs:1},staff:{atc:4,ramp:6,dispatcher:2,security:4,maintenance:3},flights:[],events:[],stats:{aircraft:0,passengers:0,revenue:0,expenses:0,completed:0,delayed:0},expansions:0,ownedAirports:[],contracts:[],unlimited:false}}
function cost(map,key){return map[key]||5000} function canPay(s,n){return s.unlimited||s.money>=n} function spend(s,n){if(!s.unlimited){s.money-=n;s.stats.expenses+=n}}
function buy(s,type,qty=1){const n=cost(VEHICLES,type)*qty;if(!canPay(s,n))return[false,'Insufficient funds'];spend(s,n);s.vehicles[type]=(s.vehicles[type]||0)+qty;return[true,`Purchased ${qty} ${type} vehicle(s)`]}
function hire(s,role,qty=1){const n=cost(STAFF,role)*qty;if(!canPay(s,n))return[false,'Insufficient funds'];spend(s,n);s.staff[role]=(s.staff[role]||0)+qty;return[true,`Hired ${qty} ${role} staff`]}
function requiredEquipment(s){return['pushback','tug','fuel','baggage','catering'].every(k=>(s.vehicles[k]||0)>0)}
function schedule(s,code,flightNumber,gate='A1'){const a=AIRCRAFT[code]||AIRCRAFT.B738;if(!requiredEquipment(s)||(s.staff.ramp||0)<1||(s.staff.dispatcher||0)<1)return[false,'Need pushback, tug, fuel, baggage, catering equipment plus ramp and dispatcher staff'];const f={id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,code,flightNumber,gate,status:'arriving',progress:0,seats:a.seats,revenue:a.fee,services:{fuel:false,baggage:false,catering:false,security:false},delay:0};s.flights.push(f);s.stats.aircraft++;return[true,f]}
function completeServices(s,f){const next=SERVICE_STEPS.find(k=>!f.services[k]);if(!next)return null;f.services[next]=true;f.status='servicing';f.progress=Math.max(f.progress,40);if(next==='security')f.progress=70;GameEvent(s,'Ground service',`${f.flightNumber}: ${next} completed.`);return `${next} service completed`}
function tick(s){for(const f of s.flights){if(f.status==='departed')continue;if(f.delay>0){f.delay--;continue}
if(f.status==='arriving')f.progress=Math.min(20,f.progress+10);
else if(f.status==='parked')f.progress=Math.min(40,f.progress+10);
else if(f.status==='servicing')f.progress=Math.min(70,f.progress+10);
else if(f.status==='boarding')f.progress=Math.min(90,f.progress+10);
else if(f.status==='ready'){f.progress=Math.min(100,f.progress+10);if(f.progress>=100)f.status='pushback'}
else if(f.status==='pushback'){f.progress=Math.min(100,f.progress+10);if(f.progress>=100){f.status='taxiing';f.progress=0;GameEvent(s,'Pushback complete',`${f.flightNumber} is taxiing to the runway.`)}}
else if(f.status==='taxiing'){f.progress=Math.min(100,f.progress+10);if(f.progress>=100){f.status='departed';if(!s.unlimited)s.money+=f.revenue;s.stats.revenue+=f.revenue;s.stats.passengers+=Math.round(f.seats*.88);s.stats.completed++;s.reputation=Math.min(100,s.reputation+1);GameEvent(s,'Flight departed',`${f.flightNumber} completed successfully.`);continue}}
if(f.progress>=20&&f.status==='arriving')f.status='parked';
if(f.progress>=40&&f.status==='parked')f.status='servicing';
if(f.progress>=70&&f.status==='servicing')f.status='boarding';
if(f.progress>=90&&f.status==='boarding')f.status='ready';
}if(s.stats.completed>0)s.level=Math.max(s.level,1+Math.floor(s.stats.completed/10));return s}
function service(s,id){const f=s.flights.find(x=>x.id===id);if(!f||f.status==='departed')return[false,'Flight is not active'];if(['arriving','parked'].includes(f.status)&&f.progress<20)return[false,'Aircraft has not reached the stand yet'];const result=completeServices(s,f);return result?[true,result]:[false,'All services already completed']}
function dispatch(s,id){const f=s.flights.find(x=>x.id===id);if(!f||f.status==='departed')return[false,'Flight is not active'];if(!Object.values(f.services).every(Boolean))return[false,'Complete all turnaround services first'];if((s.staff.atc||0)<1)return[false,'ATC is required'];f.progress=90;f.status='ready';GameEvent(s,'ATC clearance',`${f.flightNumber} cleared for pushback.`);return[true,'Flight cleared for pushback']}
function expansionCost(level){return 50000+level*25000} function expand(s){const n=expansionCost(s.expansions);if(!canPay(s,n))return[false,n];spend(s,n);s.expansions++;s.level++;GameEvent(s,'Airport expansion','New airport capacity unlocked.');return[true,n]}
function purchaseAirport(s,icao){if(s.ownedAirports.includes(icao))return[false,'Airport already owned'];const n=100000+s.ownedAirports.length*75000;if(!canPay(s,n))return[false,n];spend(s,n);s.ownedAirports.push(icao);GameEvent(s,'Airport acquired',`${icao} is now under your management.`);return[true,n]}
function acceptContract(s,name,payout,flights=5){s.contracts.push({id:`${Date.now()}-${Math.random()}`,name,payout,target:flights,progress:0,completed:false});return true}
function recordContractProgress(s){s.contracts.forEach(c=>{if(!c.completed){c.progress++;if(c.progress>=c.target){c.completed=true;if(!s.unlimited)s.money+=c.payout;s.stats.revenue+=c.payout;GameEvent(s,'Contract completed',`${c.name}: $${c.payout.toLocaleString()} earned.`)}}})}
function GameEvent(s,title,description,severity='info'){s.events.unshift({title,description,severity,time:new Date().toISOString()});s.events=s.events.slice(0,30)}
function activateUnlimited(s){s.unlimited=true;s.money=Number.MAX_SAFE_INTEGER;s.level=999;s.reputation=100;Object.keys(VEHICLES).forEach(k=>s.vehicles[k]=9999);Object.keys(STAFF).forEach(k=>s.staff[k]=9999);GameEvent(s,'Developer mode activated','Unlimited money, equipment, staff and airport expansion funds unlocked.');return true}
return{newState,VEHICLES,STAFF,AIRCRAFT,buy,hire,schedule,tick,service,dispatch,expand,expansionCost,purchaseAirport,acceptContract,recordContractProgress,GameEvent,activateUnlimited};})();
