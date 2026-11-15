import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../js/model.js';

const room = M.normalizeRoom();

test('333 是大窗牆寬度、293 是窗到門的深度', () => {
  assert.equal(room.width, 333);
  assert.equal(room.depth, 293);
  assert.deepEqual(M.floorPolygon(room), [[0, 0], [333, 0], [333, 293], [76, 293], [76, 313], [0, 313]]);
});

test('門鉸鏈在入口凸出區最外側，門朝大窗方向打開，保留完整 76 cm 扇形', () => {
  const d = M.doorGeometry(room);
  assert.deepEqual(d.hinge, { x: 0, z: 313 });
  assert.equal(d.radius, 76);
  const last = d.sector.at(-1); // 全開時門扇末端
  assert.ok(Math.abs(last[0]) < 1e-6 && Math.abs(last[1] - 237) < 1e-6);
  const first = d.sector[1]; // 關門時門扇末端
  assert.ok(Math.abs(first[0] - 76) < 1e-6 && Math.abs(first[1] - 313) < 1e-6);
});

test('柱子在門完全打開之後的前方，不進入門弧', () => {
  const c = M.columnRect(room);
  assert.deepEqual(c, { x0: 0, x1: 31.5, z0: 193, z1: 237 });
  const obs = M.roomObstacles(room);
  const col = obs.find(o => o.id === 'column'), door = obs.find(o => o.id === 'door');
  assert.equal(M.polysOverlap(col.poly, door.poly), false);
  assert.ok(c.z1 <= 313 - 76);
});

test('修改尺寸時柱子不會被放進門弧', () => {
  const r = M.normalizeRoom({ ...room, colZ: 280 });
  assert.ok(r.colZ + r.colAlong <= r.depth + r.entryDepth - r.doorWidth);
});

test('三個提案的所有家具都合法、沒有綠色、含必要家具', () => {
  for (const p of M.PROPOSALS) {
    const s = { room, items: [] };
    const res = M.applyProposal(s, p.id);
    assert.deepEqual(res, { moved: [], removed: [] }, p.name);
    for (const it of s.items) assert.equal(M.checkPlacement(s, it).ok, true, `${p.name} ${M.CATALOG[it.type].name}`);
    const types = s.items.map(i => i.type);
    for (const need of ['nordli', 'beanbag', 'poles', 'isjakt']) assert.ok(types.includes(need), p.name + need);
    assert.ok(types.some(t => t.startsWith('desk1')));
    assert.ok(!types.includes('wardrobe'));
    for (const it of s.items) for (const v of Object.values(it.colors)) assert.notEqual(v, '#64775f');
    // 投影牆（z=293, x 76..301）前 40 cm 內不放高於 100 cm 的家具
    for (const it of s.items) {
      if (M.CATALOG[it.type].kind !== 'floor') continue;
      const tall = M.sizeOf(it).h > 100;
      const nearWall = M.footprint(it).some(([x, z]) => z > 253 && x > 76);
      assert.ok(!(tall && nearWall), p.name + ' 投影牆被遮住');
    }
  }
});

function base() {
  return { room, items: [] };
}

test('家具不能穿牆、柱子、木作、門弧與其他家具', () => {
  const s = base();
  const chair = M.makeItem('deskChair', { x: 150, z: 150 });
  s.items.push(chair);
  const at = (x, z) => M.checkPlacement(s, { ...chair, x, z });
  assert.equal(at(150, 150).ok, true);
  assert.equal(at(10, 150).hit, '牆壁');
  assert.equal(at(40, 215).hit, '柱子');
  assert.equal(at(300, 150).hit, '固定木作');
  assert.equal(at(40, 280).hit, '開門範圍');
  assert.equal(at(200, 285).hit, '入口牆面');
  const bed = M.makeItem('nordli', { x: 150, z: 150 });
  assert.equal(M.checkPlacement(s, bed).hit, '鋼管書桌椅');
});

test('地毯不阻擋家具，也可以鋪在開門範圍', () => {
  const s = base();
  const rug = M.makeItem('rug', { x: 150, z: 150 });
  s.items.push(rug);
  const chair = M.makeItem('deskChair', { x: 150, z: 150 });
  assert.equal(M.checkPlacement(s, chair).ok, true);
  assert.equal(M.checkPlacement(s, { ...rug, x: 70, z: 200 }).hit, '柱子');
  assert.equal(M.checkPlacement(s, { ...rug, x: 92, z: 213 }).ok, true);
});

test('拖曳被擋住時停在最後合法位置，不跳回起點', () => {
  const s = base();
  const chair = M.makeItem('deskChair', { x: 150, z: 150 });
  s.items.push(chair);
  const r1 = M.moveFloorItem(s, chair, -50, 150);
  assert.equal(r1.blocked, true);
  assert.ok(Math.abs(r1.x - 23) < 0.5, 'x=' + r1.x);
  assert.equal(r1.z, 150);
  Object.assign(chair, { x: r1.x, z: r1.z });
  const r2 = M.moveFloorItem(s, chair, -50, 100); // 沿牆滑動
  assert.ok(Math.abs(r2.x - 23) < 0.5 && Math.abs(r2.z - 100) < 0.5);
  assert.equal(M.checkPlacement(s, { ...chair, x: r2.x, z: r2.z }).ok, true);
});

test('牆面配件不能蓋住窗戶，下方可放家具', () => {
  const s = base();
  const peg = M.makeItem('pegboard', { wall: 'window', along: 150, y: 100 });
  assert.equal(M.checkPlacement(s, peg).hit, '大窗');
  assert.equal(M.checkPlacement(s, { ...peg, along: 150, y: 20 }).ok, true);
  const left = { ...peg, wall: 'left', along: 60, y: 108 };
  assert.equal(M.checkPlacement(s, left).ok, true);
  assert.equal(M.checkPlacement(s, { ...left, along: 180 }).hit, '牆面邊界'); // 柱子之後不可掛
  s.items.push(left);
  const desk = M.makeItem('desk120', { x: 35.5, z: 61.5, rot: 90 });
  assert.equal(M.checkPlacement(s, desk).ok, true);
});

test('床上與桌面配件跟著承載家具，並限制在表面內', () => {
  const s = base();
  const bed = M.makeItem('nordli', { x: 150, z: 120, rot: 90 });
  const dog = M.makeItem('gosig', { parent: bed.id, lx: 10, lz: 20 });
  s.items.push(bed, dog);
  const w1 = M.childWorld(s, dog);
  assert.ok(Math.abs(w1.x - 170) < 1e-6 && Math.abs(w1.z - 110) < 1e-6 && w1.y === 48);
  bed.x += 30;
  assert.ok(Math.abs(M.childWorld(s, dog).x - 200) < 1e-6);
  const c = M.clampChild(bed, { ...dog, lx: 500, lz: -500 });
  assert.ok(c.lx <= 57 - 16 + 1e-6 && c.lz >= -98 + 35 - 1e-6);
  const lamp = M.makeItem('deskLamp', { parent: bed.id });
  assert.equal(M.checkPlacement(s, lamp).ok, false); // 桌燈不能放床上
});

test('修改房間尺寸後家具不會留在牆或柱子內', () => {
  const s = M.defaultState();
  s.room = M.normalizeRoom({ ...s.room, width: 280, colOut: 60 });
  M.resolveRoom(s);
  for (const it of s.items) assert.equal(M.checkPlacement(s, it).ok, true, M.CATALOG[it.type].name);
});

test('舊版或殘缺的配置仍可載入', () => {
  const s = M.migrate({ room: { width: 340 }, items: [
    { type: 'nordli', x: 240, z: 101 }, { type: 'unknown' }, null,
    { type: 'gosig', parent: 'nope' }, { type: 'beanbag', x: 'bad', colors: { body: 'red' } },
  ] });
  assert.equal(s.room.width, 340);
  assert.equal(s.room.depth, 293);
  assert.deepEqual(s.items.map(i => i.type), ['nordli', 'beanbag']);
  assert.equal(s.items[1].colors.body, '#c3c4c2');
  assert.equal(s.ui.ceilingOn, true);
  for (const it of s.items) assert.equal(M.checkPlacement(s, it).ok, true);
  assert.equal(M.migrate(null).items.length > 5, true);
  const round = M.migrate(JSON.parse(JSON.stringify(M.defaultState())));
  assert.equal(round.items.length, M.defaultState().items.length);
});

test('複製床會一併複製床上配件', () => {
  const s = base();
  const bed = M.makeItem('nordli', { x: 70, z: 110 });
  s.items.push(bed, M.makeItem('gosig', { parent: bed.id }));
  const added = M.duplicateInto(s, bed);
  assert.equal(added.length, 2);
  assert.equal(added[1].parent, added[0].id);
  assert.equal(M.checkPlacement(s, added[0]).ok, true);
});
