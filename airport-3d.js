/* Procedural 3D airport scene. Original geometry, no third-party game assets. */
window.Airport3D = (() => {
  let renderer, scene, camera, root, canvas, animationId;
  const flights = new Map();
  const THREE_URL='https://unpkg.com/three@0.160.0/build/three.min.js';
  const loadThree = () => new Promise((resolve,reject)=>{
    if(window.THREE) return resolve(window.THREE);
    const s=document.createElement('script'); s.src=THREE_URL; s.onload=()=>resolve(window.THREE); s.onerror=reject; document.head.appendChild(s);
  });
  function mat(color,rough=.8){return new THREE.MeshStandardMaterial({color,roughness:rough});}
  function box(w,h,d,m){return new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);}
  function plane(w,d,m){return new THREE.Mesh(new THREE.PlaneGeometry(w,d),m);}
  function runway(points){
    if(!points||points.length<2)return;
    const a=points[0],b=points[points.length-1], dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
    const r=plane(Math.max(35,len),Math.max(35,Math.min(90,len*.08)),mat(0x25282b)); r.rotation.x=-Math.PI/2; r.position.set((a[0]+b[0])/2,.03,(a[1]+b[1])/2); r.rotation.z=-Math.atan2(dz,dx); root.add(r);
    const stripe=plane(Math.max(20,len*.78),3,mat(0xf4f4f4)); stripe.rotation.x=-Math.PI/2; stripe.position.copy(r.position); stripe.position.y=.04; stripe.rotation.z=r.rotation.z; root.add(stripe);
  }
  function taxi(points){
    if(!points||points.length<2)return; const a=points[0],b=points[points.length-1],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
    const t=plane(Math.max(12,len),18,mat(0x3b3d40)); t.rotation.x=-Math.PI/2;t.rotation.z=-Math.atan2(dz,dx);t.position.set((a[0]+b[0])/2,.025,(a[1]+b[1])/2);root.add(t);
  }
  function terminal(x,z,w=70,d=25){const b=box(w,12,d,mat(0x7d858d));b.position.set(x,6,z);root.add(b);for(let i=-w/2+8;i<w/2;i+=10){const g=box(5,3,1,mat(0x79b9d8));g.position.set(x+i,7,z-d/2-.55);root.add(g);}}
  function stand(x,z,number){const c=new THREE.Mesh(new THREE.CylinderGeometry(13,13,.25,32),mat(0x34383c));c.position.set(x,.13,z);root.add(c);const line=box(18,.08,1,mat(0xf2f2f2));line.position.set(x,.3,z);root.add(line);const pole=box(.5,5,.5,mat(0xffc400));pole.position.set(x+13,2.5,z);root.add(pole);}
  function aircraft(code= 'B738'){
    const group=new THREE.Group(); const body=mat(0xe7e9ec), dark=mat(0x263238), wing=mat(0xc9cdd1);
    const fus=new THREE.Mesh(new THREE.CylinderGeometry(2.1,2.1,22,16),body);fus.rotation.z=Math.PI/2;group.add(fus);
    const w=box(12,.45,3,wing);w.position.y=-.2;group.add(w); const tail=box(3,3,1.5,dark);tail.position.x=-9;tail.position.y=2.1;group.add(tail);
    [-4.5,4.5].forEach(x=>{const e=new THREE.Mesh(new THREE.CylinderGeometry(.75,.75,3,12),dark);e.rotation.z=Math.PI/2;e.position.set(x,-.8,0);group.add(e);});
    if(code==='A388'){group.scale.set(1.8,1.35,1.35)} else if(code==='B77W'||code==='A359') group.scale.set(1.35,1.1,1.1); else if(code==='A321') group.scale.set(1.08,1,1);
    return group;
  }
  function clear(){if(root){while(root.children.length)root.remove(root.children[0]);}flights.clear();}
  function setup(container){
    canvas=container; scene=new THREE.Scene(); scene.background=new THREE.Color(0x8fb6d8); scene.add(new THREE.HemisphereLight(0xffffff,0x53616b,2));
    const sun=new THREE.DirectionalLight(0xffffff,2.2);sun.position.set(100,180,80);scene.add(sun);
    root=new THREE.Group();scene.add(root);
    const ground=plane(1800,1800,mat(0x53684f));ground.rotation.x=-Math.PI/2;ground.position.y=-.02;root.add(ground);
    camera=new THREE.PerspectiveCamera(48,container.clientWidth/container.clientHeight,.1,5000);camera.position.set(0,260,320);camera.lookAt(0,0,0);
    renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(container.clientWidth,container.clientHeight);container.innerHTML='';container.appendChild(renderer.domElement);
    let dragging=false,lastX=0,lastY=0,dist=410,az=0,el=.55;
    function updateCam(){const x=Math.sin(az)*dist*Math.cos(el),y=Math.sin(el)*dist,z=Math.cos(az)*dist*Math.cos(el);camera.position.set(x,y,z);camera.lookAt(0,0,0)}
    container.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;container.setPointerCapture(e.pointerId)});
    container.addEventListener('pointermove',e=>{if(!dragging)return;az-=(e.clientX-lastX)*.008;el=Math.max(.15,Math.min(1.35,el+(e.clientY-lastY)*.006));lastX=e.clientX;lastY=e.clientY;updateCam()});
    container.addEventListener('pointerup',()=>dragging=false);container.addEventListener('pointercancel',()=>dragging=false);
    container.addEventListener('wheel',e=>{e.preventDefault();dist=Math.max(80,Math.min(900,dist+e.deltaY*.35));updateCam()},{passive:false});
    const resize=()=>{if(!renderer)return;camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();renderer.setSize(container.clientWidth,container.clientHeight)};window.addEventListener('resize',resize);updateCam();
    const loop=()=>{animationId=requestAnimationFrame(loop);flights.forEach(o=>{if(o.target){o.mesh.position.lerp(o.target,.045)}});renderer.render(scene,camera)};loop();
  }
  async function init(container){try{await loadThree();setup(container);return true}catch(e){container.innerHTML='<div class="mapOverlay">3D scene unavailable. Map fallback active.</div>';return false}}
  function renderAirport(airport,geometry=[]){if(!root)return;clear();const lat=airport.latitude||0,lon=airport.longitude||0;const scale=90000;const xy=p=>[(p[1]-lon)*scale, -(p[0]-lat)*scale];
    let made=0;geometry.forEach(g=>{if(g.type==='runway')runway(g.points.map(xy)),made++;if(g.type==='taxiway')taxi(g.points.map(xy)),made++;if(g.type==='terminal'){const p=xy(g.point);terminal(p[0],p[1]);made++;}if(g.type==='gate'){const p=xy(g.point);stand(p[0],p[1],g.name),made++;}});
    if(!made){runway([[-170,0],[170,0]]);terminal(0,45,100,25);for(let i=-50;i<=50;i+=25)stand(i,15,String(i));}
  }
  function addFlight(f){if(!root||flights.has(f.id))return;const mesh=aircraft(f.code);mesh.position.set(0,4,-90);root.add(mesh);flights.set(f.id,{mesh,target:new THREE.Vector3(0,4,-90)});setFlightStatus(f)}
  function setFlightStatus(f){const o=flights.get(f.id);if(!o)return;const status=f.status;const targets={arriving:[0,4,-180],parked:[0,4,15],servicing:[0,4,15],boarding:[0,4,15],ready:[0,4,15],pushback:[0,4,55],taxiing:[110,4,55],departed:[230,35,55]};const p=targets[status]||targets.parked;o.target.set(p[0],p[1],p[2])}
  function sync(list){list.forEach(f=>{if(!flights.has(f.id))addFlight(f);setFlightStatus(f)})}
  return{init,renderAirport,sync,addFlight,setFlightStatus};
})();
