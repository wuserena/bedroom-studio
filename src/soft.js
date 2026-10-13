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

// A Yogibo Pod as it looks in use: the bead filling has slumped into a wide base, the front is pressed
// into a seat and the displaced filling rises behind it as a backrest. The seat faces +z.
export function podGeometry(w=100,h=80,d=100){
  const profile=[[1.5,0],[33,1.2],[45,6],[50,16],[49.5,28],[46,40],[40,50],[31,58],[20,63.5],[9,66.5],[.15,67.5]].map(([r,y])=>new THREE.Vector2(r,y)),rings=profile.length,segments=96,g=new THREE.LatheGeometry(profile,segments),p=g.attributes.position;
  const smooth=(a,b,v)=>{const t=Math.min(1,Math.max(0,(v-a)/(b-a)));return t*t*(3-2*t)};
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),angle=Math.atan2(z,x),t=y/67.5,upper=smooth(.25,1,t),
      seat=Math.exp(-((x/27)**2+((z-13)/23)**2)),back=smooth(-2,-30,z)*Math.exp(-((x/40)**2)),
      lobes=1+.022*Math.sin(angle*3+t*4)+.012*Math.sin(angle*7-t*6),squeeze=1+.07*seat*(1-upper),
      crease=.9*Math.sin(angle*9+t*11)*Math.sin(Math.PI*t)*(1-seat);
    p.setXYZ(i,x*lobes*squeeze,y-24*upper*seat+15*upper*back+crease*upper,z*lobes*squeeze-4*upper*back);
  }
  g.computeBoundingBox();const b=g.boundingBox,size=new THREE.Vector3();b.getSize(size);g.scale(w/size.x,h/size.y,d/size.z);g.computeBoundingBox();const c=g.boundingBox;g.translate(-(c.min.x+c.max.x)/2,-c.min.y,-(c.min.z+c.max.z)/2);g.computeVertexNormals();
  // The lathe duplicates its first column; share normals there so no seam shows on the cover.
  const n=g.attributes.normal,v=new THREE.Vector3(),u=new THREE.Vector3();for(let j=0;j<rings;j++){v.fromBufferAttribute(n,j).add(u.fromBufferAttribute(n,segments*rings+j)).normalize();n.setXYZ(j,v.x,v.y,v.z);n.setXYZ(segments*rings+j,v.x,v.y,v.z)}
  return g;
}
