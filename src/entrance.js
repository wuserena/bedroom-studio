// User's plan: side entrance at the rear-left corner, hinged at the room-side end of the doorway.
export function entranceLayout(r) {
  const hinge={x:-r.recess,z:r.depth-r.doorWidth};
  const polygon=[hinge,...Array.from({length:65},(_,i)=>{const a=i*Math.PI/128;return {x:hinge.x+r.doorWidth*Math.sin(a),z:hinge.z+r.doorWidth*Math.cos(a)}})];
  return {
    door:{x:hinge.x,z:r.depth-r.doorWidth/2,hingeZ:hinge.z,w:r.doorWidth},
    swing:{id:'door-swing',name:'開門預留區',polygon},
    column:{id:'column',name:'柱子',x:r.columnDepth/2,z:r.depth-r.recessLength-r.columnWidth/2,w:r.columnDepth,d:r.columnWidth,angle:0},
    floor:[[0,0],[r.width,0],[r.width,r.depth],[-r.recess,r.depth],[-r.recess,r.depth-r.recessLength],[0,r.depth-r.recessLength]]
  };
}
