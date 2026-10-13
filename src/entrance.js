// User's reference plan: window at z=0, door on the opposite wall.
// Entering through the door faces -z. The pillar is on the left side wall,
// ahead of the full door-opening pocket, not beside the rear door jamb.
export function entranceLayout(r) {
  const hinge={x:0,z:r.depth+r.recess};
  const polygon=[hinge,...Array.from({length:65},(_,i)=>{const a=i*Math.PI/128;return {x:r.doorWidth*Math.cos(a),z:hinge.z-r.doorWidth*Math.sin(a)}})];
  return {
    door:{x:r.doorWidth/2,z:hinge.z,hingeX:0,hingeZ:hinge.z,w:r.doorWidth},
    swing:{id:'door-swing',name:'開門預留區',polygon},
    column:{id:'column',name:'柱子',x:r.columnDepth/2,z:hinge.z-r.recessLength-r.columnWidth/2,w:r.columnDepth,d:r.columnWidth,angle:0},
    floor:[[0,0],[r.width,0],[r.width,r.depth],[r.doorWidth,r.depth],[r.doorWidth,hinge.z],[0,hinge.z]]
  };
}
