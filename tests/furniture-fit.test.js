import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fitFurniture} from '../src/furniture-fit.js';
test('asymmetric furniture including handles stays inside its declared footprint',()=>{const group=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(90,200,55));body.position.set(0,100,0);group.add(body);const handle=new THREE.Mesh(new THREE.BoxGeometry(2,16,2));handle.position.set(15,96,29);group.add(handle);fitFurniture(group,{x:150,z:305.5,w:90,d:55,h:200,angle:0});const b=new THREE.Box3().setFromObject(group);assert.ok(Math.abs(b.max.z-333)<1e-6);assert.ok(Math.abs(b.min.z-278)<1e-6);assert.ok(Math.abs(b.min.y)<1e-6);});
