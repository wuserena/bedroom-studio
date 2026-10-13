import * as THREE from 'three';

// IKEA GOSIG GOLDEN: a lying golden retriever plush, nose toward +z, about 38 × 70 × 28 cm.
// Modelled on the product photos: one beige tone, head up, mouth open, splayed forelegs with dark soles.
// The pile is built from concentric alpha-tested shells so the silhouette is fuzzy instead of a smooth blob.
const SHELLS=10;
let shared=null;

function canvasTexture(size,draw){const c=document.createElement('canvas');c.width=c.height=size;draw(c.getContext('2d'),size);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t}
function random(seed){return ()=>{seed=(seed*16807)%2147483647;return seed/2147483647}}

// Each dot is one strand; its brightness is how far out along the shells it reaches.
// A cube projected onto a sphere: unlike a UV sphere it has no poles, so strands never pinch into a starburst.
function ball(){const g=new THREE.BoxGeometry(2,2,2,10,10,10),p=g.attributes.position,v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).normalize();p.setXYZ(i,v.x,v.y,v.z)}g.computeVertexNormals();return g}
// A limb or trunk as one continuous skin swept along a curve, so joints do not read as separate balls.
// path: centre points; radii: [half-width, half-height] at each point; offset grows the skin for a fur shell.
function sweep(path,radii,offset){const curve=new THREE.CatmullRomCurve3(path.map(p=>new THREE.Vector3(...p))),size=new THREE.CatmullRomCurve3(radii.map(r=>new THREE.Vector3(r[0],r[1],0))),N=30,M=20,pos=[],uv=[],idx=[],up=new THREE.Vector3(0,1,0),side=new THREE.Vector3(),top=new THREE.Vector3(),c=new THREE.Vector3(),tan=new THREE.Vector3(),r=new THREE.Vector3(),length=curve.getLength(),girth=Math.max(1,Math.round((radii[0][0]+radii[0][1])*Math.PI/10));
 for(let i=0;i<=N;i++){const t=i/N,edge=Math.min(t,1-t)/.09,cap=edge>=1?1:Math.sqrt(Math.max(.0004,1-(1-edge)**2));curve.getPoint(t,c);curve.getTangent(t,tan);size.getPoint(t,r);side.crossVectors(tan,up).normalize();top.crossVectors(side,tan).normalize();c.addScaledVector(tan,offset*(edge>=1?0:(t<.5?-1:1)*(1-edge)));
  for(let j=0;j<=M;j++){const a=j/M*Math.PI*2,x=(r.x+offset)*cap*Math.cos(a),y=(r.y+offset)*cap*Math.sin(a);pos.push(c.x+side.x*x+top.x*y,c.y+side.y*x+top.y*y,c.z+side.z*x+top.z*y);uv.push(j/M*girth,t*length/10)}}
 for(let i=0;i<N;i++)for(let j=0;j<M;j++){const a=i*(M+1)+j,b=a+M+1;idx.push(a,b,a+1,b,b+1,a+1)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g}
function strandMap(){return canvasTexture(256,(g,s)=>{const rand=random(71);g.fillStyle='#000';g.fillRect(0,0,s,s);for(let i=0;i<6200;i++){const v=Math.round(80+rand()*175),r=.8+rand()*1.15,x=rand()*s,y=rand()*s;g.fillStyle=`rgb(${v},${v},${v})`;for(const ox of [-s,0,s])for(const oy of [-s,0,s]){g.beginPath();g.arc(x+ox,y+oy,r,0,Math.PI*2);g.fill()}}})}
// Soft clumps of lighter and darker pile, as on a tousled short-pile toy.
function coatMap(){const t=canvasTexture(256,(g,s)=>{const rand=random(29);g.fillStyle='#fff';g.fillRect(0,0,s,s);for(let i=0;i<700;i++){const x=rand()*s,y=rand()*s,r=5+rand()*14,light=rand()>.5;g.fillStyle=light?`rgba(255,250,236,${.03+rand()*.06})`:`rgba(132,104,64,${.02+rand()*.05})`;for(const ox of [-s,0,s])for(const oy of [-s,0,s]){g.beginPath();g.ellipse(x+ox,y+oy,r*.5,r,rand()*.8-.4,0,Math.PI*2);g.fill()}}});t.colorSpace=THREE.SRGBColorSpace;return t}

function tones(hex){const tip=new THREE.Color(hex),strands=strandMap(),coat=coatMap();
 const base=new THREE.MeshStandardMaterial({color:tip.clone().multiplyScalar(.6),map:coat,roughness:1});
 const shells=Array.from({length:SHELLS},(_,i)=>{const t=(i+1)/SHELLS;return new THREE.MeshStandardMaterial({color:tip.clone().multiplyScalar(.6+.4*t),map:coat,alphaMap:strands,alphaTest:.26+.66*t,roughness:1,side:THREE.DoubleSide})});
 return {base,shells}}

const plain=(color,roughness)=>new THREE.MeshStandardMaterial({color,roughness});
function resources(){if(shared)return shared;
 shared={sphere:ball(),sweeps:new Map(),coat:tones('#d3b687'),ear:tones('#c7a877'),
  solids:{nose:plain('#26221f',.9),pad:plain('#4a4743',.95),eye:plain('#2a1b14',.35),glint:plain('#f4f1ea',.4),mouth:plain('#2b1a16',.95),tongue:plain('#d9603f',.85)}};
 return shared}

// Meshes whose geometry and materials are shared between rebuilds; the scene must not dispose them.
export function isSharedPlushResource(v){if(!shared)return false;return v===shared.sphere||v?.userData?.sharedPlush===true||Object.values(shared.solids).includes(v)||[shared.coat,shared.ear].some(t=>t.base===v||t.shells.includes(v))}

export function buildGosigGolden(group){const R=resources(),S=R.solids;
 // One plush ellipsoid: a solid core plus short shells that read as tousled pile.
 const fur=([x,y,z],[sx,sy,sz],{length=1.7,rot=[0,0,0],tone=R.coat}={})=>{const part=new THREE.Group();part.position.set(x,y,z);part.rotation.set(...rot);
  const core=new THREE.Mesh(R.sphere,tone.base);core.scale.set(sx,sy,sz);core.castShadow=core.receiveShadow=true;part.add(core);
  for(let i=0;i<SHELLS;i++){const t=(i+1)/SHELLS,o=length*t,shell=new THREE.Mesh(R.sphere,tone.shells[i]);shell.scale.set(sx+o,sy+o,sz+o);shell.position.y=-length*.12*t*t;shell.receiveShadow=true;part.add(shell)}
  group.add(part);return part};
 const solid=(material,[x,y,z],[sx,sy,sz],rot=[0,0,0])=>{const m=new THREE.Mesh(R.sphere,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(...rot);m.castShadow=true;group.add(m);return m};

 // Swept skins are cached per shell so rebuilding the scene does not regenerate them.
 const limb=(key,path,radii,{length=1.7,tone=R.coat}={})=>{const part=new THREE.Group();for(let i=0;i<=SHELLS;i++){const k=`${key}:${i}`,o=length*i/SHELLS;if(!R.sweeps.has(k)){const g=sweep(path,radii,o);g.userData.sharedPlush=true;R.sweeps.set(k,g)}const m=new THREE.Mesh(R.sweeps.get(k),i?tone.shells[i-1]:tone.base);m.receiveShadow=true;m.castShadow=!i;part.add(m)}group.add(part);return part};

 // Long, fairly slim trunk lying on its belly; the same skin rises through the shoulders into the neck.
 limb('trunk',[[0,7,-25],[0,8.4,-17],[0,8.2,-6],[0,10.6,5],[0,15.4,10.5],[0,19.5,14]],[[5.5,5],[10.4,7.6],[9.5,7.4],[9.5,8.6],[7.4,7.2],[6.4,6.4]]);
 // Thick tail lying flat between the hind feet.
 limb('tail',[[0,7.2,-21],[.5,6.2,-27],[1.2,5.2,-31.5],[1.8,4.6,-35]],[[4.3,3.9],[3.7,3.3],[2.9,2.6],[2.1,2]]);
 for(const s of [-1,1]){const n=s<0?'l':'r';
  // Hind legs folded beside the hips and trailing straight back, soles facing the rear.
  limb('hind'+n,[[s*7,7.4,-10],[s*11.4,6.2,-16.5],[s*13.4,4.6,-24.5],[s*14.4,4.3,-32.6]],[[4.6,5.4],[5.6,5.7],[3.8,3.7],[4.1,3.8]]);
  solid(S.pad,[s*14.4,4.3,-32.4],[3,2.8,1.7],[0,s*.1,0]);
  // Front legs reach forward and splay outward; each big paw shows its dark grey sole.
  limb('fore'+n,[[s*6.6,9,6.5],[s*9.2,6,14.5],[s*11.8,4.9,23.5],[s*14,4.9,32]],[[4.6,5.4],[4.4,4.6],[3.9,3.9],[4.9,4.6]]);
  solid(S.pad,[s*14.1,4.9,31.9],[3.3,3.1,1.9],[0,s*.24,0]);}
 // Domed skull with brow bumps, and a long blunt muzzle held slightly raised.
 fur([0,20.6,14.4],[8.8,7.8,8.4]);
 for(const s of [-1,1])fur([s*4.1,24,19.6],[3,2,2.7],{length:1.1});
 limb('muzzle',[[0,19.4,17],[0,19.3,23],[0,20,27.5],[0,20.6,30.6]],[[6.6,5.2],[6,4.6],[5.1,3.9],[4,3.1]],{length:1.1});
 solid(S.nose,[0,21.2,30.2],[2.7,2.2,2.1],[.25,0,0]);
 // Open mouth: dark lining, a dropped lower jaw and a broad felt tongue lolling over it.
 solid(S.mouth,[0,15.9,22.8],[4.5,1.9,6],[.2,0,0]);
 limb('jaw',[[0,15.4,16],[0,13.8,21],[0,12.8,25],[0,12.4,27.6]],[[4.8,2.6],[4.5,2.3],[3.7,2],[2.8,1.6]],{length:.9});
 solid(S.tongue,[0,14.4,25.4],[3,.75,4.6],[.38,0,0]);
 solid(S.tongue,[0,12.6,29.2],[2.6,.7,2.2],[.95,0,0]);
 // Embroidered oval eyes with a white stitch highlight, set wide under the brows.
 for(const s of [-1,1]){solid(S.eye,[s*4.9,21.9,22.6],[1.45,1.85,1],[-.2,s*.45,s*.3]);solid(S.glint,[s*5.45,21.4,23.5],[.42,.42,.28]);}
 // Big flat ear flaps sewn on high at the sides and hanging below the jaw.
 for(const s of [-1,1]){fur([s*8.4,22.6,13],[2.2,2.4,4.4],{tone:R.ear,rot:[0,0,s*.7]});fur([s*10.2,15.4,13.6],[1.7,8.8,6],{tone:R.ear,length:1.5,rot:[.14,s*.1,s*.08]});}
 return group}
