import * as THREE from 'three';
import {dressingLayout} from './decor.js';

// Curtains and blinds for both windows, in room cm. Each wall group maps (along-wall, height, distance from wall).
export function createWindowDressing(room,decor,fabricMap){const root=new THREE.Group();root.name='window-dressing';
 const metal=new THREE.MeshStandardMaterial({color:'#b4b6b2',metalness:.8,roughness:.3}),walls={front:new THREE.Group(),right:new THREE.Group()};walls.right.rotation.y=-Math.PI/2;walls.right.position.x=room.width;root.add(walls.front,walls.right);
 for(const L of dressingLayout(room,decor)){const n=L.offset,cloth=new THREE.MeshStandardMaterial({color:L.color,map:fabricMap,roughness:.96,side:THREE.DoubleSide,transparent:L.sheer,opacity:L.sheer?.5:1,depthWrite:!L.sheer});
  const put=(wall,geo,m,u,y,z)=>{const o=new THREE.Mesh(geo,m);o.position.set(u,y,z);o.castShadow=!L.sheer;o.receiveShadow=true;walls[wall].add(o);return o;};
  if(L.kind==='drape'){const amp=(L.sheer?1.1:1.6)+(L.sheer?2.4:3.9)*L.open,folds=L.sheer?12:9,{a0,a1,y}=L.rod;
   put('front',new THREE.CylinderGeometry(.9,.9,a1-a0,16),metal,(a0+a1)/2,y,n).rotation.z=Math.PI/2;for(const u of [a0,a1]){put('front',new THREE.SphereGeometry(1.6,16,12),metal,u,y,n);put('front',new THREE.BoxGeometry(2,2,n),metal,u+(u===a0?6:-6),y,n/2);}
   for(const p of L.panels){const width=p.a1-p.a0,length=p.top-p.bottom,geo=new THREE.PlaneGeometry(width,length,72,6),pos=geo.attributes.position;for(let i=0;i<pos.count;i++){const hang=1-.35*(pos.getY(i)/length+.5);pos.setZ(i,amp*hang*Math.sin((pos.getX(i)/width+.5)*folds*Math.PI*2));}geo.computeVertexNormals();put('front',geo,cloth,(p.a0+p.a1)/2,(p.top+p.bottom)/2,n);}
   continue;}
  for(const p of L.panels){const width=p.a1-p.a0,length=p.top-p.bottom,u=(p.a0+p.a1)/2;put(p.wall,new THREE.PlaneGeometry(width,length),cloth,u,(p.top+p.bottom)/2,n);
   if(L.kind==='roller'){put(p.wall,new THREE.CylinderGeometry(2.4,2.4,width+4,20),metal,u,p.top-2.4,n-.5).rotation.z=Math.PI/2;put(p.wall,new THREE.BoxGeometry(width,1.6,1.6),metal,u,p.bottom+.8,n);}
   else{put(p.wall,new THREE.BoxGeometry(width,3,3),metal,u,p.top-1.5,n-.5);for(let y=p.bottom+26;y<p.top-6;y+=26)put(p.wall,new THREE.BoxGeometry(width,.5,.7),cloth,u,y,n+.3);const stacked=Math.round(L.open*5);for(let i=0;i<stacked;i++)put(p.wall,new THREE.BoxGeometry(width,2.2,3.4),cloth,u,p.bottom+1.1+i*2.4,n+1.1);}}}
 return root;}
