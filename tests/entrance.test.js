import test from 'node:test';
import assert from 'node:assert/strict';
import {entranceLayout} from '../src/entrance.js';
import {DEFAULT_ROOM as r,validPlacement,moveSwept} from '../src/model.js';
const item=(x,z)=>({id:'a',type:'nightstand',x,z,w:20,d:20,h:40,angle:0});
test('door is behind the opposite wall and column is on the viewer right',()=>{const e=entranceLayout(r);assert.ok(e.door.z>r.depth);assert.ok(e.column.x+e.column.w/2<=e.door.x-e.door.w/2);});
test('swept movement stops at the pillar and at the back of the entrance',()=>{let a=item(22,270);let p=moveSwept(a,22,330,[],r);assert.ok(p.blocked);assert.ok(p.z<=r.depth-r.columnDepth-10);a=item(82,310);p=moveSwept(a,82,390,[],r);assert.ok(p.blocked);assert.equal(p.z,r.depth+r.recess-10);});
test('neither rear corner beside the extended entrance is usable',()=>{for(const x of [20,150])assert.equal(validPlacement(item(x,343),[],r).ok,false);assert.equal(validPlacement(item(82,343),[],r).ok,true);});
