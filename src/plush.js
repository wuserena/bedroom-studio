import * as THREE from 'three';

// IKEA GOSIG GOLDEN: a lying golden retriever plush, nose toward +z, about 38 × 70 × 28 cm.
// Fur is built from concentric alpha-tested shells so the silhouette is fuzzy instead of a smooth blob.
const SHELLS=12;
let shared=null;

function canvasTexture(size,draw){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t}
function random(seed){return ()=>{seed=(seed*16807)%2147483647;return seed/2147483647}}

// Each dot is one strand; its brightness is how far out along the shells it reaches.
// A cube projected onto a sphere: unlike a UV sphere it has no poles, so strands never pinch into a starburst.
function ball(){const g=new THREE.BoxGeometry(2,2,2,10,10,10),p=g.attributes.position,v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).normalize();p.setXYZ(i,v.x,v.y,v.z)}g.computeVertexNormals();return g}
function strandMap(){return canvasTexture(256,(g,s)=>{const rand=random(71);g.fillStyle='#000';g.fillRect(0,0,s,s);for(let i=0;i<5200;i++){const v=Math.round(70+rand()*185),r=.8+rand()*1.3,x=rand()*s,y=rand()*s;g.fillStyle=`rgb(${v},${v},${v})`;for(const ox of [-s,0,s])for(const oy of [-s,0,s]){g.beginPath();g.arc(x+ox,y+oy,r,0,Math.PI*2);g.fill()}}})}
// Soft clumps of lighter and darker pile, as on a brushed long-pile toy.
function coatMap(){const t=canvasTexture(256,(g,s)=>{const rand=random(29);g.fillStyle='#fff';g.fillRect(0,0,s,s);for(let i=0;i<900;i++){const x=rand()*s,y=rand()*s,r=5+rand()*16,light=rand()>.5;g.fillStyle=light?`rgba(255,250,232,${.05+rand()*.1})`:`rgba(120,84,40,${.05+rand()*.12})`;for(const ox of [-s,0,s])for(const oy of [-s,0,s]){g.beginPath();g.ellipse(x+ox,y+oy,r*.45,r,rand()*.6-.3,0,Math.PI*2);g.fill()}}});t.colorSpace=THREE.SRGBColorSpace;return t}

function tones(hex){const tip=new THREE.Color(hex),strands=strandMap(),coat=coatMap();
 const base=new THREE.MeshStandardMaterial({color:tip.clone().multiplyScalar(.62),map:coat,roughness:1});
 const shells=Array.from({length:SHELLS},(_,i)=>{const t=(i+1)/SHELLS;return new THREE.MeshStandardMaterial({color:tip.clone().multiplyScalar(.62+.38*t),map:coat,alphaMap:strands,alphaTest:.24+.7*t,roughness:1,side:THREE.DoubleSide})});
 return {base,shells}}

function resources(){if(shared)return shared;
 shared={sphere:ball(),gold:tones('#dcb276'),cream:tones('#ecd3a2'),ear:tones('#c2904f'),
  nose:new THREE.MeshStandardMaterial({color:'#1f1b18',roughness:.42}),eye:new THREE.MeshStandardMaterial({color:'#15110f',roughness:.16}),
  mouth:new THREE.MeshStandardMaterial({color:'#3a231c',roughness:.95}),tongue:new THREE.MeshStandardMaterial({color:'#d9606a',roughness:.8})};
 return shared}

// Meshes whose geometry and materials are shared between rebuilds; the scene must not dispose them.
export function isSharedPlushResource(v){if(!shared)return false;return v===shared.sphere||[shared.nose,shared.eye,shared.mouth,shared.tongue].includes(v)||[shared.gold,shared.cream,shared.ear].some(t=>t.base===v||t.shells.includes(v))}

export function buildGosigGolden(group){const R=resources();
 // One furry ellipsoid: a solid core plus shells that grow outward and droop slightly with gravity.
 const fur=(tone,[x,y,z],[sx,sy,sz],{length=2.3,rot=[0,0,0]}={})=>{const part=new THREE.Group();part.position.set(x,y,z);part.rotation.set(...rot);
  const core=new THREE.Mesh(R.sphere,tone.base);core.scale.set(sx,sy,sz);core.castShadow=core.receiveShadow=true;part.add(core);
  for(let i=0;i<SHELLS;i++){const t=(i+1)/SHELLS,o=length*t,shell=new THREE.Mesh(R.sphere,tone.shells[i]);shell.scale.set(sx+o,sy+o,sz+o);shell.position.y=-length*.22*t*t;shell.receiveShadow=true;part.add(shell)}
  group.add(part);return part};
 const solid=(material,[x,y,z],[sx,sy,sz],rot=[0,0,0])=>{const m=new THREE.Mesh(R.sphere,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(...rot);m.castShadow=true;group.add(m);return m};

 // Long relaxed body with rounded haunches, resting flat on its belly.
 fur(R.gold,[0,10.2,-6],[12.6,8.6,19.5]);
 fur(R.gold,[0,11.6,-17],[13.2,9.2,10.5]);
 for(const s of [-1,1]){fur(R.gold,[s*9.8,7.6,-17.5],[6.4,6.6,9.6]);fur(R.cream,[s*13.2,3.6,-9.5],[3.2,3,6.6],{length:1.5,rot:[0,s*.32,0]});}
 // Feathered tail curling round the right hip.
 for(const [p,r] of [[[4.5,6,-27.5],[4,3.6,4.6]],[[8.6,5.2,-29.6],[3.6,3.2,4.4]],[[12.2,4.6,-28.4],[3.1,2.8,4.4]],[[14.2,4.1,-24.6],[2.5,2.3,4.4]]])fur(R.gold,p,r,{length:2.9});
 // Chest ruff and a thick neck carrying the head just above the paws.
 fur(R.cream,[0,10.6,8.5],[10.8,8.4,8.2],{length:3});
 fur(R.gold,[0,14.6,11.5],[9.2,8.2,7.6],{length:2.6});
 // Broad retriever skull, gentle stop, and a blocky short-haired muzzle.
 fur(R.gold,[0,17.2,17.6],[9,8,8.6],{length:1.9});
 fur(R.gold,[0,20.4,15.6],[6.4,4.2,6],{length:1.7});
 fur(R.cream,[0,14.2,25.6],[5.3,4.5,6.2],{length:1});
 fur(R.cream,[0,12.2,24.4],[4.4,2.6,5.2],{length:.9});
 solid(R.nose,[0,16.3,31.9],[2.5,1.9,1.7]);
 solid(R.mouth,[0,12.9,30.6],[.34,1.7,.6]);
 for(const s of [-1,1])solid(R.mouth,[s*1.9,11.5,30],[2.1,.36,.7],[0,s*.5,s*.42]);
 solid(R.tongue,[0,10.6,30.4],[1.5,.55,2.3],[.5,0,0]);
 for(const s of [-1,1]){solid(R.eye,[s*4.5,19.3,25.9],[1.4,1.5,1.15]);}
 // Long pendant ears set level with the eyes, darker and shaggier than the coat.
 for(const s of [-1,1]){fur(R.ear,[s*9.3,18.6,15.6],[3.1,3.6,4.6],{length:2,rot:[0,0,s*.5]});fur(R.ear,[s*11.1,13.2,16.4],[2.5,6.9,5],{length:2.7,rot:[.12,0,s*.2]});}
 // Forelegs stretched straight ahead with fat cream paws.
 for(const s of [-1,1]){fur(R.gold,[s*7.9,4.6,18.5],[4.1,4,9.2],{length:1.8});fur(R.cream,[s*7.9,3.9,27.6],[4.3,3.5,4.9],{length:1.3});}
 return group}
