// Flat tops that small decor can stand on: the fixed joinery and table-height furniture.
// A surface is a rectangle {x,z,w,d,angle} at height y with `clear` cm of headroom above it.
const TABLE_TYPES=new Set(['desk','mittzon','storageDesk','flutedDesk','rarerawDesk','tambourShelf','nightstand','flitTable']);
export function cabinetSurfaces(r){const sy=r.lowHeight/222,sz=r.depth/333,x0=r.width-r.cabinetDepth,x1=r.width-2,left=y=>92+104*(y-9)/211,right=y=>144+107*(y-9)/211;
 // The clad beam leans toward the door as it rises, so each right-hand surface starts where the beam is at its ceiling.
 const S=(id,name,z0,z1,top,ceiling)=>({id:'cab:'+id,name,x:(x0+x1)/2,z:(z0+z1)*sz/2,w:x1-x0,d:(z1-z0)*sz,angle:0,y:top*sy,clear:(ceiling-top)*sy});
 return [S('counter','木櫃檯面',right(138.8),333,89,138.8),S('shelf140','高層板・下層',right(171.8),330.8,141.2,171.8),S('shelf173','高層板・上層',right(203.8),330.8,174.2,203.8),S('leftTop','窗邊矮櫃頂',2.2,left(104.1),104.1,160),S('left72','窗邊矮櫃・上層',2.2,left(73.1),73.1,101.9),S('left40','窗邊矮櫃・中層',2.2,left(41.1),41.1,70.9),S('left9','窗邊矮櫃・底層',2.2,left(10.1),10.1,38.9)];}
export function surfaces(items,r){return [...cabinetSurfaces(r),...items.filter(b=>TABLE_TYPES.has(b.type)).map(b=>({id:b.id,name:'桌面',x:b.x,z:b.z,w:b.w,d:b.d,angle:b.angle,y:b.h,clear:r.lowHeight-b.h}))];}
export function inside(s,points){const t=s.angle*Math.PI/180,c=Math.cos(t),n=Math.sin(t);return points.every(p=>{const dx=p.x-s.x,dz=p.z-s.z;return Math.abs(dx*c-dz*n)<=s.w/2+1e-6&&Math.abs(dx*n+dz*c)<=s.d/2+1e-6});}
// World position of the point at fractions (fu,fv) of the surface, keeping a footprint ew × ed inside it.
export function pointOn(s,fu,fv,ew,ed){const t=s.angle*Math.PI/180,c=Math.cos(t),n=Math.sin(t),u=(fu-.5)*Math.max(0,s.w-ew),v=(fv-.5)*Math.max(0,s.d-ed);return {x:s.x+u*c+v*n,z:s.z-u*n+v*c};}
