// Looking from the large window toward +z, the viewer's right is -x.
export function entranceLayout(r) {
  const start=r.columnWidth, end=start+r.recessLength;
  return {
    start,end,
    door:{x:(start+end)/2,z:r.depth+r.recess,w:r.doorWidth},
    column:{id:'column',name:'柱子',x:r.columnWidth/2,z:r.depth-r.columnDepth/2,w:r.columnWidth,d:r.columnDepth,angle:0},
    floor:[[0,0],[r.width,0],[r.width,r.depth],[end,r.depth],[end,r.depth+r.recess],[start,r.depth+r.recess],[start,r.depth],[0,r.depth]]
  };
}
