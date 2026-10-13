import test from 'node:test';
import assert from 'node:assert/strict';
import {entranceLayout} from '../src/entrance.js';
import {DEFAULT_ROOM as r,validPlacement,moveSwept,validateState} from '../src/model.js';
const item=(x,z,v={})=>({id:'a',type:'nightstand',x,z,w:20,d:20,h:40,angle:0,...v});
test('door faces the window, with a left-wall pillar ahead of its opening space',()=>{const e=entranceLayout(r);assert.equal(e.door.z,r.depth+r.recess);assert.equal(e.door.hingeX,0);assert.equal(e.column.x-e.column.w/2,0);assert.equal(e.column.w,31.5);assert.equal(e.column.d,44);assert.equal(e.door.z-(e.column.z+e.column.d/2),r.recessLength);assert.equal(r.width,333);assert.equal(r.depth,293);});
test('inward door sweep blocks furniture, while nearby main floor stays usable',()=>{const e=entranceLayout(r);assert.equal(validPlacement(item(30,e.door.z-30),[],r).ok,false);assert.equal(validPlacement(item(100,270),[],r).ok,true);assert.equal(validPlacement(item(15,e.column.z),[],r).ok,false);assert.equal(validPlacement(item(100,303),[],r).ok,false);});
test('fast movement cannot cross the swing or the pillar',()=>{const e=entranceLayout(r);let p=moveSwept(item(130,280),10,280,[],r);assert.ok(p.blocked);assert.match(p.reason,/開門/);p=moveSwept(item(130,e.column.z),10,e.column.z,[],r);assert.ok(p.blocked);assert.match(p.reason,/柱子/);});
test('saved default dimensions follow corrected window and cabinet axes',()=>{const saved=validateState({version:1,room:{...r,width:293,depth:333},items:[]});assert.equal(saved.room.width,333);assert.equal(saved.room.depth,293);});
