import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCabinet} from '../src/cabinet.js';
import {DEFAULT_ROOM} from '../src/model.js';
const material=new THREE.MeshStandardMaterial();
function create(room=DEFAULT_ROOM){return createCabinet(room,{wood:material,woodDark:material,beam:material});}
test('counter under the AC meets the beam cladding with no gap',()=>{const g=create();g.updateMatrixWorld(true);const counter=g.getObjectByName('left-shelf-103');const b=new THREE.Box3().setFromObject(counter);const ray=new THREE.Raycaster(new THREE.Vector3(277,103,b.max.z-1),new THREE.Vector3(0,0,1));const hits=ray.intersectObject(g.getObjectByName('clad-beam'));assert.ok(hits.length);assert.ok(hits[0].distance<2,'counter must join beam rather than stop before it');});
test('upper shelves start at the diagonal cladding instead of running across it',()=>{const g=create();g.updateMatrixWorld(true);const lower=new THREE.Box3().setFromObject(g.getObjectByName('right-shelf-140'));const upper=new THREE.Box3().setFromObject(g.getObjectByName('right-shelf-205'));assert.ok(upper.min.z>lower.min.z+20);assert.equal(upper.max.z,333);});
test('beam cladding is a solid connected volume and cabinet fits its fixed collision footprint',()=>{const g=create();g.updateMatrixWorld(true);const beam=new THREE.Box3().setFromObject(g.getObjectByName('clad-beam'));assert.equal(beam.max.x-beam.min.x,32);const b=new THREE.Box3().setFromObject(g);assert.ok(b.min.x>=261);assert.ok(b.max.x<=293);assert.ok(b.min.z>=0);assert.ok(b.max.z<=333);});
