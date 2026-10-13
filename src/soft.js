import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Fabric over a rounded mattress edge: follow the arc, then hang with a slight flare.
function wrap(e,r){if(e<=0)return [0,0];const arc=r*Math.PI/2;if(e<=arc){const t=e/r;return [r*Math.sin(t),r*(1-Math.cos(t))]}const hang=e-arc;return [r+hang*.07,r+hang]}

// A quilted cover laid over a mattress top: sides and the foot end fold down, the middle puffs up.
// half: mattress half-width, foot/head: z of the covered span, left/right/footHang: fabric past each edge.
// The cover is a closed shell `thickness` deep so its hems read as a soft quilt, not a paper sheet.
export function drapeGeometry({half,foot,head,left,right,footHang,y,edge=4,puff=3,wrinkle=.7,thickness=3,seed=0,segments=[48,72]}){
  const dir=Math.sign(head-foot)||1,len=Math.abs(head-foot),[S,T]=segments,s0=-half-left,s1=half+right,u0=-footHang,positions=[],uvs=[],index=[],row=S+1,layer=row*(T+1);
  for(const inner of [0,1])for(let j=0;j<=T;j++)for(let i=0;i<=S;i++){
    const s=s0+(s1-s0)*i/S,u=u0+(len-u0)*j/T,r=edge-inner*Math.min(thickness,edge*.8),[ox,dx]=wrap(Math.abs(s)-half,r),[oz,dz]=wrap(-u,r);
    const x=Math.sign(s)*(Math.min(Math.abs(s),half)+ox),z=u>=0?foot+dir*u:foot-dir*oz;
    const ns=Math.min(1,Math.abs(s)/half),nu=Math.min(1,Math.max(0,u/len)),inside=(1-ns**4)*Math.pow(Math.max(0,1-(2*nu-1)**4),.5);
    const fold=Math.sin(s*.09+u*.035+seed)+.55*Math.sin(u*.06-s*.05+seed*2)+.25*Math.sin(s*.17+u*.11+seed*3);
    positions.push(x,y-Math.max(dx,dz)-.3*Math.min(dx,dz)+(inner?-thickness:puff*inside)+wrinkle*fold*(.4+.6*inside),z);uvs.push(i/S*2,j/T*3);
  }
  const quad=(a,b,c,d)=>index.push(a,c,b,b,c,d);
  for(let j=0;j<T;j++)for(let i=0;i<S;i++){const a=j*row+i;quad(a,a+1,a+row,a+row+1);quad(layer+a+1,layer+a,layer+a+row+1,layer+a+row)}
  for(let i=0;i<S;i++){quad(i+1,i,layer+i+1,layer+i);const a=T*row+i;quad(a,a+1,layer+a,layer+a+1)}
  for(let j=0;j<T;j++){const a=j*row,b=j*row+S;quad(a,a+row,layer+a,layer+a+row);quad(b+row,b,layer+b+row,layer+b)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(index);g.computeVertexNormals();return g;
}

// Plump cushion: a rounded box whose thickness swells in the middle and thins to soft seams.
export function pillowGeometry(w,h,d,{round=Math.min(w,h,d)/3,plump=.55,seed=0}={}){
  const g=new RoundedBoxGeometry(w,h,d,6,round),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),nx=Math.min(1,Math.abs(x)/(w/2)),ny=Math.min(1,Math.abs(y)/(h/2)),body=Math.pow(1-nx**4,.6)*Math.pow(1-ny**4,.6);p.setZ(i,z*(1-plump+plump*body)+.4*Math.sin(x*.3+y*.2+seed)*body);p.setY(i,y*(1-.05*nx*nx))}
  g.computeVertexNormals();return g;
}

// An unloaded Yogibo Pod: a gathered teardrop whose loose bead filling settles into a broad base.
// Small three-lobed variations keep the stretch cover from reading as a rigid vase.
export function podGeometry(w=91,h=122,d=91){
  const profile=[[1.5,0],[28,1.5],[41,7],[45.5,18],[45,35],[42,55],[36,76],[27,96],[16,111],[6,120],[1.4,122]].map(([r,y])=>new THREE.Vector2(r,y)),g=new THREE.LatheGeometry(profile,72),p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),angle=Math.atan2(z,x),t=y/122,soft=1+.018*Math.sin(angle*3+t*5)+.009*Math.sin(angle*5-t*7),front=1-.025*Math.max(0,Math.cos(angle))*Math.sin(Math.PI*t)**2;
    p.setXYZ(i,x*soft,y+.55*Math.sin(angle*2+1.1)*Math.sin(Math.PI*t)**2,z*soft*front);
  }
  g.computeBoundingBox();const b=g.boundingBox,size=new THREE.Vector3();b.getSize(size);g.scale(w/size.x,h/size.y,d/size.z);g.computeBoundingBox();g.translate(0,-g.boundingBox.min.y,0);g.computeVertexNormals();return g;
}
