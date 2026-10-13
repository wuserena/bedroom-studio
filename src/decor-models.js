import * as THREE from 'three';
import {BOUQUETS} from './decor.js';

// Mood lamps and vases are built at true size in cm with the base at y = 0, so they are not rescaled to their footprint.
const std=(color,o={})=>new THREE.MeshStandardMaterial({color,roughness:.6,...o});
const clear=(color,opacity,o={})=>new THREE.MeshPhysicalMaterial({color,roughness:.08,clearcoat:1,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false,...o});
const nickel=()=>std('#b9b7b1',{metalness:.9,roughness:.2});
function add(g,geo,m,x=0,y=0,z=0){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;}
const cyl=(g,r,h,m,y,r2=r)=>add(g,new THREE.CylinderGeometry(r2,r,h,40),m,0,y);
// profile: [radius, height] pairs from the foot upward, smoothed into a turned shape.
function turned(profile,closed=true){const pts=new THREE.SplineCurve(profile.map(([r,y])=>new THREE.Vector2(r,y))).getPoints(56).map(p=>new THREE.Vector2(Math.max(p.x,0),p.y));return new THREE.LatheGeometry(closed?[new THREE.Vector2(0,profile[0][1]),...pts]:pts,48);}
function glowLight(g,on,color,intensity,y,z=0){const light=new THREE.PointLight(color,on?intensity:0,2.6,2);light.position.set(0,y,z);g.add(light);}

export function buildMoodLamp(g,a){const on=a.lightOn!==false,color=a.color;
 if(a.type==='varmblixt'){const ring=add(g,new THREE.TorusGeometry(9.5,5.5,28,72),new THREE.MeshPhysicalMaterial({color:'#f08a2c',roughness:.16,clearcoat:1,transparent:true,opacity:.92,emissive:'#ff7417',emissiveIntensity:on?1.05:.04}),0,15,1);ring.castShadow=false;const plate=add(g,new THREE.CylinderGeometry(5.5,5.5,1,32),std('#f3b27a'),0,15,-4);plate.rotation.x=Math.PI/2;
  // Lying flat, the ring rests on its back plate and glows upward.
  if(a.lying){ring.rotation.x=Math.PI/2;ring.position.set(0,5.5,0);plate.rotation.x=0;plate.position.set(0,.5,0);}glowLight(g,on,'#ff9a4a',1.7,a.lying?13:15,a.lying?0:15);}
 else if(a.type==='nodmast'){const dark=std('#4d5a55',{roughness:.5}),pink=std('#eac4c4',{roughness:.55,side:THREE.DoubleSide});cyl(g,6.5,1.4,dark,.7);cyl(g,.55,18,dark,10.2);add(g,turned([[.1,24.4],[5,23.8],[8.6,21.4],[9,18]],false),pink);cyl(g,8.2,.5,std('#fff3dc',{emissive:'#ffd9a8',emissiveIntensity:on?2.4:0}),18.9);const handle=add(g,new THREE.TorusGeometry(1.4,.26,10,28),nickel(),0,24.4,0);handle.castShadow=false;glowLight(g,on,'#ffd9a8',1.2,16);}
 else if(a.type==='spetsboj'){const body=std(color,{roughness:.42,metalness:.25}),shade=std(color,{roughness:.42,metalness:.25,side:THREE.DoubleSide});cyl(g,4,14,body,7);cyl(g,3.1,3.2,std('#fff3dc',{emissive:'#ffd596',emissiveIntensity:on?2.6:0}),15.6);add(g,turned([[.1,22],[3.6,21.5],[5.8,19.6],[6,17.2]],false),shade);const button=add(g,new THREE.CylinderGeometry(.6,.6,.5,16),std('#2e2e2c'),4,5,0);button.rotation.z=Math.PI/2;glowLight(g,on,'#ffd596',1,16);}
 else if(a.type==='tarnaby'){cyl(g,7.5,2.2,std(color,{roughness:.5}),1.1);cyl(g,1.6,5,nickel(),4.7);const knob=add(g,new THREE.CylinderGeometry(1,1,1.4,20),nickel(),5,2.9,0);knob.castShadow=false;const bulb=add(g,new THREE.SphereGeometry(2.5,24,18),std('#ffcf8a',{emissive:'#ffb866',emissiveIntensity:on?3:0,roughness:.3}),0,11,0);bulb.scale.y=1.5;bulb.castShadow=false;const tube=add(g,new THREE.CylinderGeometry(5,5,22.6,40,1,true),clear('#e9f0ee',.22),0,13.5,0);tube.castShadow=false;glowLight(g,on,'#ffb866',1.2,12);}
 else if(a.type==='dejsa'){add(g,turned([[6,0],[6.2,.8],[5.7,7],[5.2,14]]),std('#ece2cf',{roughness:.5}));cyl(g,5,.9,nickel(),14.4);const dome=add(g,turned([[5.2,14.6],[10.6,14],[12.88,18.2],[12.3,22.8],[9,26.4],[4.6,27.8],[.1,28]],false),std('#f6f1e6',{roughness:.35,emissive:'#ffe2b0',emissiveIntensity:on?1.15:0,side:THREE.DoubleSide}));dome.castShadow=false;glowLight(g,on,'#ffe2b0',1.9,21);}
}

const VASES={berakna:{profile:[[6.6,0],[7.2,1.2],[7.4,9],[7.5,18]],glass:.3},gradvis:{profile:[[5,0],[7.6,5],[8,10],[6.5,16],[4,19],[4.4,21]],flutes:14},stilren:{profile:[[5.2,0],[6,2],[6,12],[3.1,16.5],[2.4,20],[2.8,22]]},kallarhals:{profile:[[5,0],[8.6,4],[9.5,9],[8.4,14],[4.2,18],[3.8,20.5],[4.6,22]],glass:.62},parlhagg:{profile:[[3.3,0],[3.5,1],[6.4,3.4],[7,6.4],[6.3,9.3],[4.7,10.9],[6.3,12.6],[7,15.2],[6.2,17.8],[4.2,19.3],[3.9,20.2],[3.9,22]]},stockholmVase:{profile:[[4.5,0],[7.6,6],[8.5,13],[7.2,20],[4.2,25],[4.6,27]]}};
function stem(g,from,to,r,m){const dir=to.clone().sub(from),o=add(g,new THREE.CylinderGeometry(r,r,dir.length(),6),m);o.position.copy(from).addScaledVector(dir,.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());o.castShadow=false;return o;}
function bouquet(g,a,mouth){const b=BOUQUETS[a.bouquet];if(!b||!b.rise)return;let seed=7+a.h;const rand=()=>{seed=seed*16807%2147483647;return seed/2147483647};const green=std(b.head==='plume'||b.head==='branch'?'#b9a37f':'#6f8a55',{roughness:.9}),petal=std(b.color,{roughness:.85}),count=b.head==='spray'?9:b.head==='plume'||b.head==='branch'?5:7,from=new THREE.Vector3(0,a.h*.35,0);
 for(let i=0;i<count;i++){const t=i*2.4,lean=(i?.14+.2*rand():0)*b.rise,headSize=b.head==='plume'?6:b.head==='branch'?0:2.6,top=new THREE.Vector3(Math.cos(t)*(mouth*.5+lean),a.h+b.rise*(.72+.28*rand())-headSize,Math.sin(t)*(mouth*.5+lean));stem(g,from,top,b.head==='spray'?.12:.22,green);
  if(b.head==='tulip'){const o=add(g,new THREE.SphereGeometry(1.7,16,12),petal);o.position.copy(top);o.scale.y=1.5;}
  else if(b.head==='daisy'){const o=add(g,new THREE.SphereGeometry(2.3,18,10),petal);o.position.copy(top);o.scale.y=.3;add(g,new THREE.SphereGeometry(.85,12,8),std('#8a5a1e'),top.x,top.y+.5,top.z);}
  else if(b.head==='ball'){add(g,new THREE.IcosahedronGeometry(2.6,1),petal).position.copy(top);}
  else if(b.head==='spray'){for(let k=0;k<6;k++)add(g,new THREE.SphereGeometry(.55,8,6),petal,top.x+(rand()-.5)*5,top.y+(rand()-.5)*4+1,top.z+(rand()-.5)*5).castShadow=false;}
  else if(b.head==='branch'){for(let k=0;k<6;k++){const at=from.clone().lerp(top,.5+k*.1),side=new THREE.Vector3((rand()-.5)*5,2+rand()*3,(rand()-.5)*5);stem(g,at,at.clone().add(side),.1,green);add(g,new THREE.SphereGeometry(.55,8,6),petal).position.copy(at).add(side);}}
  else{const o=add(g,new THREE.ConeGeometry(1.7,12,10),std(b.color,{roughness:1}));o.position.copy(top).add(new THREE.Vector3(0,5,0));o.rotation.set((rand()-.5)*.3,0,(rand()-.5)*.3);}}
}
export function buildVase(g,a){const v=VASES[a.type],geo=turned(v.profile),mouth=v.profile.at(-1)[0];
 if(v.flutes){const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),k=1+.035*Math.cos(Math.atan2(z,x)*v.flutes);p.setX(i,x*k);p.setZ(i,z*k);}geo.computeVertexNormals();}
 const body=add(g,geo,v.glass?clear(a.color,v.glass):std(a.color,{roughness:.38,side:THREE.DoubleSide}));if(v.glass)body.castShadow=false;bouquet(g,a,mouth);}

// Small props that stand on a surface: a potted plant, a bedside tray and a woven basket. `weave` is a bump texture.
export function buildTableProp(g,a,weave){
 if(a.type==='fejka'){cyl(g,3.6,8,std('#e9e6df',{roughness:.5}),4,4.5);cyl(g,4.1,.6,std('#5a4a3a',{roughness:1}),7.9);let seed=11;const rand=()=>{seed=seed*16807%2147483647;return seed/2147483647},leaf=std(a.color,{roughness:.9});for(let i=0;i<46;i++){const t=rand()*Math.PI*2,rad=Math.sqrt(rand())*5.2,y=9+rand()*12*(1-rad/8);add(g,new THREE.IcosahedronGeometry(1+rand()*.6,0),leaf,Math.cos(t)*rad,y,Math.sin(t)*rad).castShadow=false;}}
 else if(a.type==='aptitlig'){const bamboo=std(a.color,{roughness:.55});cyl(g,14,1.4,bamboo,.7);const rim=add(g,new THREE.TorusGeometry(13.4,.6,10,56),bamboo,0,2,0);rim.rotation.x=Math.PI/2;
  // A glass and a phone show what the tray is for; they are not products.
  const glass=add(g,new THREE.CylinderGeometry(3.3,2.9,9,28,1,true),clear('#eef4f3',.28),-5,6,-3);glass.castShadow=false;const phone=add(g,new THREE.BoxGeometry(7.2,.8,14.8),std('#3a3c3d',{roughness:.35}),5,1.8,2);phone.rotation.y=.25;}
 else if(a.type==='kvarnvik'||a.type==='smarra'){const {w,d,h}=a,lid=a.type==='smarra'?2.2:4,body=std(a.color,{roughness:a.type==='smarra'?.5:.9});add(g,new THREE.BoxGeometry(w-.8,h-lid,d-.8),body,0,(h-lid)/2,0);add(g,new THREE.BoxGeometry(w,lid,d),body,0,h-lid/2,0);
  // A label holder on the paper box and a finger hole on the bamboo one tell the two apart at a glance.
  if(a.type==='kvarnvik')add(g,new THREE.BoxGeometry(7,3,.3),nickel(),0,h*.42,d/2-.2).castShadow=false;else{const hole=add(g,new THREE.CylinderGeometry(1.6,1.6,.4,20),std('#6f5a3c'),0,h-lid-4,d/2-.25);hole.rotation.x=Math.PI/2;hole.castShadow=false;}}
 else if(a.type==='bekna'){const {w,d,h}=a,basket=std(a.color,{roughness:1,bumpMap:weave,bumpScale:.9});add(g,new THREE.BoxGeometry(w,h,d),basket,0,h/2,0);add(g,new THREE.BoxGeometry(w-2.4,.4,d-2.4),std('#5e4b33',{roughness:1}),0,h-.1,0).castShadow=false;for(const sx of [-1,1])add(g,new THREE.BoxGeometry(.4,2.4,8),std('#5e4b33'),sx*(w/2+.05),h-4,0).castShadow=false;}
 else if(a.type==='fladis'){const basket=add(g,turned([[7.5,0],[10.4,4],[12.5,11.5],[10.8,15],[10.2,23],[10.6,32]]),std(a.color,{roughness:1,bumpMap:weave,bumpScale:.9,side:THREE.DoubleSide}));basket.receiveShadow=true;cyl(g,9.9,.5,std('#eee7d8',{roughness:1}),26);}
}
// One shared picture texture for every RÖDALM frame, so rebuilding items never leaks a new GPU texture.
let frameArt;
function frameArtTexture(){if(frameArt)return frameArt;const c=document.createElement('canvas');c.width=250;c.height=350;const x=c.getContext('2d');x.fillStyle='#f3ede2';x.fillRect(0,0,250,350);x.fillStyle='#d9c4a6';x.beginPath();x.arc(125,215,78,Math.PI,0);x.lineTo(203,330);x.lineTo(47,330);x.fill();x.fillStyle='#ecd2c4';x.beginPath();x.arc(150,120,46,0,Math.PI*2);x.fill();x.fillStyle='#c9b08f';x.beginPath();x.arc(92,150,26,0,Math.PI*2);x.fill();const art=new THREE.CanvasTexture(c);art.colorSpace=THREE.SRGBColorSpace;frameArt=art;return art;}
// Pieces hung on a wall, built facing +z in cm; the scene fits them to the item's width, height and depth.
export function buildWallPiece(g,a,wood){const {w,h}=a;
 if(a.type==='rodalm'){const birch=std(a.color,{map:wood,roughness:.6}),art=frameArtTexture();
  for(const sx of [-1,1])add(g,new THREE.BoxGeometry(2,h,2),birch,sx*(w/2-1),h/2,0);for(const y of [1,h-1])add(g,new THREE.BoxGeometry(w-4,2,2),birch,0,y,0);add(g,new THREE.BoxGeometry(w-4,h-4,.6),std('#ffffff',{map:art,roughness:.9}),0,h/2,-.2).castShadow=false;}
 else if(a.type==='kaffetrad'){const rattan=std(a.color,{roughness:.8}),glass=add(g,new THREE.CylinderGeometry(w/2-3.5,w/2-3.5,.6,64),new THREE.MeshStandardMaterial({color:'#e3e9e8',metalness:.25,roughness:.18}),0,h/2,0);glass.rotation.x=Math.PI/2;glass.castShadow=false;for(const [r,t]of [[w/2-1.2,1.2],[w/2-3.6,.8]])add(g,new THREE.TorusGeometry(r,t,10,72),rattan,0,h/2,.2);for(let i=0;i<36;i++){const t=i*Math.PI/18,bar=add(g,new THREE.BoxGeometry(.5,2.6,.5),rattan,Math.cos(t)*(w/2-2.4),h/2+Math.sin(t)*(w/2-2.4),.2);bar.rotation.z=t-Math.PI/2;}}
}
