import test from 'node:test';
import assert from 'node:assert/strict';
import {entranceLayout} from '../src/entrance.js';
import {DEFAULT_ROOM as r,validPlacement,moveSwept} from '../src/model.js';
const item=(x,z,v={})=>({id:'a',type:'nightstand',x,z,w:20,d:20,h:40,angle:0,...v});
test('plan has a side-wall door and a 44 by 31.5 pillar behind the inward opening space',()=>{const e=entranceLayout(r);assert.equal(e.door.x,-r.recess);assert.equal(e.door.hingeZ,r.depth-r.doorWidth);assert.equal(e.column.x-e.column.w/2,-r.recess+r.doorWidth);assert.equal(e.column.w,44);assert.equal(e.column.d,31.5);});
test('inward door sweep is reserved while space outside the arc remains usable',()=>{assert.equal(validPlacement(item(10,300),[],r).ok,false);assert.equal(validPlacement(item(45,325,{w:10,d:10}),[],r).ok,true);assert.equal(validPlacement(item(78,315),[],r).ok,false);});
test('fast furniture movement stops before crossing the door swing',()=>{const p=moveSwept(item(10,220),10,315,[],r);assert.ok(p.blocked);assert.match(p.reason,/開門/);assert.ok(p.z<270);});
