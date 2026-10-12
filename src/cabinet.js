import * as THREE from 'three';

// One continuous built-in: shelves terminate against the timber-clad beam.
export function createCabinet(room, materials) {
  const group = new THREE.Group();
  group.name = 'integrated-fixed-joinery';
  const front = room.width - room.cabinetDepth;
  const left = y => 92 + 104 * (y - 9) / 211;
  const right = y => 144 + 107 * (y - 9) / 211;
  function panel(name, points, x, depth, material = materials.wood) {
    const shape = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(-z, y)));
    const geometry = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: false});
    geometry.rotateY(Math.PI / 2);
    geometry.translate(x, 0, 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  const strip = (name, z0, z1, y0, y1, x = front, depth = room.cabinetDepth, material) =>
    panel(name, [[z0,y0],[z1,y0],[z1,y1],[z0,y1]], x, depth, material);
  strip('continuous-plinth', 0, 333, 0, 8, front, room.cabinetDepth, materials.woodDark);
  panel('clad-beam', [[left(8),8],[right(8),8],[right(220),220],[left(220),220]], front, room.cabinetDepth, materials.beam || materials.wood);
  panel('left-backing', [[0,8],[left(8),8],[left(104.1),104.1],[0,104.1]], room.width-2, 2);
  strip('left-end', 0, 2.2, 8, 104.1);
  for (const y of [9,40,72,103]) {
    panel(`left-shelf-${y}`, [[0,y-1.1],[left(y-1.1),y-1.1],[left(y+1.1),y+1.1],[0,y+1.1]], front, room.cabinetDepth);
  }
  panel('right-backing', [[right(139),139],[333,139],[333,221.2],[right(221.2),221.2]], room.width-2, 2);
  strip('right-end', 330.8, 333, 139, 221.2);
  for (const y of [140,173,205,220]) {
    panel(`right-shelf-${y}`, [[right(y-1.2),y-1.2],[333,y-1.2],[333,y+1.2],[right(y+1.2),y+1.2]], front, room.cabinetDepth);
  }
  panel('lower-cupboard', [[right(8),8],[333,8],[333,86],[right(86),86]], front, room.cabinetDepth);
  panel('cupboard-counter', [[right(86),86],[333,86],[333,89],[right(89),89]], front, room.cabinetDepth);
  // Fine panel joints stay flush with the connected woodwork.
  for (const y of [72,103,150]) strip(`beam-joint-${y}`, left(y), right(y), y-.15, y+.15, front, .04, materials.woodDark);
  for (const z of [230,280]) strip(`cupboard-joint-${z}`, z, z+.3, 8, 84, front, .04, materials.woodDark);
  group.scale.set(1, room.lowHeight / 222, room.depth / 333);
  return group;
}
