import {Box3,Vector3} from 'three';
// Decorative details (handles, bedding) are included in the measured envelope.
export function fitFurniture(group,item){const bounds=new Box3().setFromObject(group),size=bounds.getSize(new Vector3()),center=bounds.getCenter(new Vector3());for(const child of group.children){child.position.x-=center.x;child.position.z-=center.z;}group.scale.set(item.w/size.x,item.h/size.y,item.d/size.z);group.position.set(item.x,-bounds.min.y*group.scale.y,item.z);group.rotation.y=item.angle*Math.PI/180;return group;}
