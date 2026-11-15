// 純邏輯：房間幾何、家具目錄、碰撞、資料遷移。不依賴 Three.js，可在 Node 直接測試。
// 平面座標：x 沿大窗牆（0 = 進門後的左牆，333 = 固定木作牆），z 由大窗（0）走向門口（293 / 313）。
// 旋轉 rot（度）與 Three.js rotation.y 同方向；家具「正面」是本地 +z。

export const VERSION = 1;
const EPS = 0.05;

export const DEFAULT_ROOM = Object.freeze({
  width: 333, depth: 293,
  entryWidth: 76, entryDepth: 20, doorWidth: 76,
  colAlong: 44, colOut: 31.5, colZ: 193,
  ceilLow: 222, ceilHigh: 235, highDepth: 115,
  winW: 223, winH: 108, winSill: 93, winX: 55,
  sWinW: 73, sWinH: 88, sWinSill: 123, sWinZ: 20,
  woodDepth: 32,
});

// 尺寸設定面板欄位
export const ROOM_FIELDS = [
  { group: '房間', key: 'width', label: '大窗牆寬度', min: 220, max: 600 },
  { group: '房間', key: 'depth', label: '房間深度（窗→門）', min: 220, max: 600 },
  { group: '入口', key: 'entryWidth', label: '入口凸出寬度', min: 60, max: 160 },
  { group: '入口', key: 'entryDepth', label: '入口向外凸出', min: 0, max: 80 },
  { group: '入口', key: 'doorWidth', label: '門寬', min: 55, max: 110 },
  { group: '柱子', key: 'colAlong', label: '柱子沿牆長度', min: 10, max: 120 },
  { group: '柱子', key: 'colOut', label: '柱子向房間突出', min: 5, max: 100 },
  { group: '柱子', key: 'colZ', label: '柱子起點（距大窗牆）', min: 0, max: 600 },
  { group: '天花板', key: 'ceilLow', label: '門側低天花板高', min: 190, max: 320 },
  { group: '天花板', key: 'ceilHigh', label: '窗側高天花板高', min: 190, max: 340 },
  { group: '天花板', key: 'highDepth', label: '高天花板深度（由窗向內）', min: 30, max: 500 },
  { group: '大窗', key: 'winW', label: '大窗寬', min: 60, max: 500 },
  { group: '大窗', key: 'winH', label: '大窗高', min: 40, max: 200 },
  { group: '大窗', key: 'winSill', label: '大窗窗台高', min: 20, max: 160 },
  { group: '大窗', key: 'winX', label: '大窗左緣距左牆', min: 0, max: 500 },
  { group: '小窗', key: 'sWinW', label: '小窗寬', min: 30, max: 200 },
  { group: '小窗', key: 'sWinH', label: '小窗高', min: 30, max: 160 },
  { group: '小窗', key: 'sWinSill', label: '小窗窗台高', min: 40, max: 200 },
  { group: '小窗', key: 'sWinZ', label: '小窗起點（距大窗牆）', min: 0, max: 400 },
  { group: '固定木作', key: 'woodDepth', label: '木作占地深度', min: 10, max: 80 },
];

const clamp = (v, a, b) => Math.min(Math.max(v, a), Math.max(a, b));
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

export function normalizeRoom(raw) {
  const r = {};
  const src = raw && typeof raw === 'object' ? raw : {};
  for (const k of Object.keys(DEFAULT_ROOM)) r[k] = num(src[k], DEFAULT_ROOM[k]);
  for (const f of ROOM_FIELDS) r[f.key] = clamp(r[f.key], f.min, f.max);
  r.woodDepth = clamp(r.woodDepth, 10, r.width - 200);
  r.entryWidth = clamp(r.entryWidth, 60, r.width - r.woodDepth - 60);
  r.doorWidth = clamp(r.doorWidth, 55, r.entryWidth);
  r.colOut = clamp(r.colOut, 5, r.width - r.woodDepth - 150);
  // 柱子必須留在門完全打開的扇形之外：柱子後緣 ≤ 門鉸鏈 − 門寬
  const maxEnd = r.depth + r.entryDepth - r.doorWidth;
  r.colAlong = clamp(r.colAlong, 10, maxEnd - 60);
  r.colZ = clamp(r.colZ, 0, maxEnd - r.colAlong);
  r.ceilHigh = Math.max(r.ceilHigh, r.ceilLow);
  r.highDepth = clamp(r.highDepth, 30, r.depth - 30);
  r.winW = clamp(r.winW, 60, r.width - r.woodDepth - 10);
  r.winX = clamp(r.winX, 0, r.width - r.winW);
  r.winSill = clamp(r.winSill, 20, r.ceilHigh - 60);
  r.winH = clamp(r.winH, 40, r.ceilHigh - r.winSill - 8);
  r.sWinW = clamp(r.sWinW, 30, r.depth - 20);
  r.sWinZ = clamp(r.sWinZ, 0, r.depth - r.sWinW);
  r.sWinSill = clamp(r.sWinSill, 40, r.ceilLow - 50);
  r.sWinH = clamp(r.sWinH, 30, r.ceilLow - r.sWinSill - 6);
  return r;
}

export const ceilingAt = (r, z) => (z < r.highDepth ? r.ceilHigh : r.ceilLow);

// 主房間 + 入口凸出區的平面多邊形
export function floorPolygon(r) {
  const zd = r.depth + r.entryDepth;
  return [[0, 0], [r.width, 0], [r.width, r.depth], [r.entryWidth, r.depth], [r.entryWidth, zd], [0, zd]];
}

export function doorGeometry(r) {
  const hinge = { x: 0, z: r.depth + r.entryDepth };
  const n = 24, arc = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI / 2; // 0 = 關門（沿門牆），90° = 全開（貼左牆、朝大窗）
    arc.push([hinge.x + r.doorWidth * Math.cos(a), hinge.z - r.doorWidth * Math.sin(a)]);
  }
  return { hinge, radius: r.doorWidth, sector: [[hinge.x, hinge.z], ...arc] };
}

const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

export function columnRect(r) {
  return { x0: 0, x1: r.colOut, z0: r.colZ, z1: r.colZ + r.colAlong };
}

// 固定障礙物（皆為凸多邊形）
export function roomObstacles(r) {
  const zd = r.depth + r.entryDepth, c = columnRect(r), out = [];
  if (r.entryDepth > 0) out.push({ id: 'entryWall', name: '入口牆面', poly: rect(r.entryWidth, r.depth, r.width, zd + 1) });
  out.push({ id: 'column', name: '柱子', poly: rect(c.x0, c.z0, c.x1, c.z1) });
  out.push({ id: 'wood', name: '固定木作', poly: rect(r.width - r.woodDepth, 0, r.width, r.depth) });
  out.push({ id: 'door', name: '開門範圍', poly: doorGeometry(r).sector });
  return out;
}

// 可掛牆面配件的牆面：大窗牆、左牆（到柱子為止）、投影牆
export function walls(r) {
  const xw = r.width - r.woodDepth;
  return [
    { id: 'window', name: '大窗牆', ox: 0, oz: 0, dx: 1, dz: 0, nx: 0, nz: 1, len: xw, top: () => r.ceilHigh,
      holes: [{ a0: r.winX - 6, a1: r.winX + r.winW + 6, y0: r.winSill - 6, y1: r.winSill + r.winH + 6, name: '大窗' }] },
    { id: 'left', name: '左牆', ox: 0, oz: 0, dx: 0, dz: 1, nx: 1, nz: 0, len: r.colZ,
      top: (a0, a1) => (a1 > r.highDepth ? r.ceilLow : r.ceilHigh), holes: [] },
    { id: 'proj', name: '投影牆', ox: xw, oz: r.depth, dx: -1, dz: 0, nx: 0, nz: -1, len: xw - r.entryWidth, top: () => r.ceilLow, holes: [] },
  ];
}
export const wallById = (r, id) => walls(r).find(w => w.id === id) || walls(r)[1];

// ---------- 家具目錄 ----------
const C = (name, value) => ({ name, value });
const FABRIC = [C('奶油白', '#efe8da'), C('暖橘', '#d9743c'), C('淺灰', '#c3c4c2'), C('燕麥', '#d8c9b0'), C('霧藍', '#7f9bb8'), C('炭灰', '#5d6064')];
const WOODS = [C('橡木', '#d9bd8f'), C('白色', '#f1efe9'), C('胡桃木', '#8a5a3a')];
const METALS = [C('銀色金屬', '#c9cdd0'), C('奶油白', '#ece6d6'), C('暖橘', '#e2702f'), C('霧藍', '#6f93bd'), C('黑色', '#262626')];

export const CATEGORIES = [
  ['bed', '床'], ['desk', '桌子'], ['chair', '椅子'], ['storage', '收納'],
  ['light', '燈具'], ['rug', '地毯'], ['wall', '牆面配件'], ['decor', '娃娃及裝飾品'],
];

export const CATALOG = {
  nordli: { name: 'IKEA NORDLI 單人收納床', cat: 'bed', kind: 'floor', w: 120, d: 202, h: 48, product: true,
    note: '官方尺寸 120 × 202 cm，不可縮放；床底抽屜為主要衣物收納',
    host: 'bed', surface: { w: 114, d: 196, y: 48 },
    colors: { duvet: { label: '棉被', options: FABRIC, def: '#d9743c' }, pillow: { label: '枕頭', options: FABRIC, def: '#efe8da' } },
    flip: true },
  desk120: { name: '書桌 120 × 70（MITTZON 風格）', cat: 'desk', kind: 'floor', w: 120, d: 70, h: 75, product: true,
    note: '橡木桌面、白色桌架，附三層抽屜櫃',
    host: 'desk', surface: { w: 114, d: 64, y: 75 },
    colors: { top: { label: '桌面', options: WOODS, def: '#d9bd8f' }, frame: { label: '桌架', options: [C('白色', '#f1efe9'), C('銀色金屬', '#c9cdd0'), C('黑色', '#262626')], def: '#f1efe9' } } },
  desk110: { name: '書桌 110 × 70', cat: 'desk', kind: 'floor', w: 110, d: 70, h: 75, product: true,
    note: '最小建議桌面，附三層抽屜櫃',
    host: 'desk', surface: { w: 104, d: 64, y: 75 },
    colors: { top: { label: '桌面', options: WOODS, def: '#d9bd8f' }, frame: { label: '桌架', options: [C('白色', '#f1efe9'), C('銀色金屬', '#c9cdd0'), C('黑色', '#262626')], def: '#f1efe9' } } },
  deskChair: { name: '鋼管書桌椅', cat: 'chair', kind: 'floor', w: 46, d: 50, h: 82, product: true,
    note: '鍍鉻鋼管椅架',
    colors: { seat: { label: '座面', options: [C('橡木', '#d9bd8f'), C('奶油白', '#efe8da'), C('暖橘', '#d9743c'), C('霧藍', '#7f9bb8')], def: '#d9bd8f' } } },
  dyvlinge: { name: 'IKEA DYVLINGE 旋轉休閒椅', cat: 'chair', kind: 'floor', w: 63, d: 75, h: 68, product: true,
    note: '官方尺寸 63 × 75 × 68 cm',
    colors: { body: { label: '顏色', options: [C('橘色', '#c8602b'), C('黑色', '#2a2928'), C('米色', '#cbbfa9'), C('綠色', '#64775f')], def: '#c8602b' } } },
  beanbag: { name: '懶骨頭', cat: 'chair', kind: 'floor', w: 92, d: 92, h: 78, product: true,
    note: '坐下後約 92 × 92 × 78 cm；正面朝向觀影方向',
    colors: { body: { label: '布料', options: [C('淺灰', '#c3c4c2'), C('奶油白', '#efe8da'), C('暖橘', '#d9743c'), C('霧藍', '#7f9bb8')], def: '#c3c4c2' } } },
  shelf: { name: '開放收納櫃', cat: 'storage', kind: 'floor', w: 80, d: 30, h: 80, resizable: { w: [40, 160], d: [25, 50], h: [40, 180] },
    note: '放包包、文件與雜物，可調整尺寸',
    colors: { body: { label: '櫃體', options: [...WOODS, C('淺灰', '#c3c4c2')], def: '#d9bd8f' } } },
  trolley: { name: '金屬三層推車', cat: 'storage', kind: 'floor', w: 35, d: 45, h: 78, product: true,
    note: '化妝品與雜物收納，可推到書桌旁',
    colors: { body: { label: '顏色', options: METALS, def: '#c9cdd0' } } },
  sideTable: { name: '金屬圓邊桌', cat: 'storage', kind: 'floor', w: 40, d: 40, h: 50, product: true,
    note: '直徑 40 cm',
    colors: { body: { label: '顏色', options: METALS, def: '#c9cdd0' } } },
  poles: { name: 'Rareraw POLES 立鏡', cat: 'storage', kind: 'floor', w: 56, d: 34, h: 187, product: true,
    note: '整體 56 × 34 × 187 cm，鏡面 46.5 × 136 cm；背面靠牆，鏡後有收納層板',
    colors: { body: { label: '顏色', options: [C('不鏽鋼', '#c2c7c9'), C('奶油米', '#e9e3d2'), C('胡蘿蔔橘', '#ee6a2c'), C('柔藍', '#86abd0'), C('亮面黑', '#1f2020')], def: '#c2c7c9' } } },
  isjakt: { name: 'IKEA ISJAKT 立燈', cat: 'light', kind: 'floor', w: 24, d: 24, h: 180, product: true,
    note: '高 180 cm；碰撞只計算 24 cm 底盤，燈臂可伸到桌面上方',
    toggles: { up: { label: '上方燈', def: true }, read: { label: '閱讀燈', def: true } } },
  globe: { name: '圓球氣氛燈', cat: 'light', kind: 'floor', w: 30, d: 30, h: 30, product: true,
    note: '直徑 30 cm 落地氣氛燈', toggles: { on: { label: '燈光', def: true } } },
  deskLamp: { name: '桌燈', cat: 'light', kind: 'child', on: 'desk', w: 16, d: 16, h: 40, product: true,
    note: '放在書桌表面', toggles: { on: { label: '燈光', def: true } },
    colors: { body: { label: '顏色', options: METALS, def: '#c9cdd0' } } },
  rug: { name: '地毯 120 × 160', cat: 'rug', kind: 'rug', w: 120, d: 160, h: 1.2, product: true,
    note: '地面軟裝，家具可以疊放在上面',
    colors: { body: { label: '底色', options: [C('奶油白', '#ece4d3'), C('暖橘', '#d98a55'), C('淺灰', '#c9c8c4'), C('霧藍', '#9fb3c8')], def: '#ece4d3' } } },
  pegboard: { name: '白色洞洞板 56 × 56', cat: 'wall', kind: 'wall', w: 56, d: 5, h: 56, y: 108, product: true,
    note: '掛在牆上，不占用地面；不可覆蓋窗戶或門' },
  wallMirror: { name: '壁掛長鏡 40 × 110', cat: 'wall', kind: 'wall', w: 40, d: 3, h: 110, y: 55, product: true,
    note: '掛在牆上，不占用地面' },
  gosig: { name: 'IKEA GOSIG GOLDEN 黃金獵犬', cat: 'decor', kind: 'child', on: 'bed', w: 32, d: 70, h: 28, product: true,
    note: '長 70 cm，放在床上並跟著床移動' },
  cushion: { name: '抱枕 45 × 45', cat: 'decor', kind: 'child', on: 'bed', w: 45, d: 45, h: 14, product: true,
    note: '放在床上', colors: { body: { label: '顏色', options: FABRIC, def: '#7f9bb8' } } },
  organizer: { name: '化妝品收納盒', cat: 'decor', kind: 'child', on: 'desk', w: 28, d: 16, h: 18, product: true, note: '放在書桌表面' },
  docTray: { name: '文件收納盤', cat: 'decor', kind: 'child', on: 'desk', w: 26, d: 34, h: 12, product: true, note: '放在書桌表面' },
  vanity: { name: '桌上化妝鏡', cat: 'decor', kind: 'child', on: 'desk', w: 20, d: 12, h: 32, product: true, note: '放在書桌表面' },
};

export function sizeOf(item) {
  const def = CATALOG[item.type];
  if (!def.resizable) return { w: def.w, d: def.d, h: def.h };
  const s = item.size || {}, R = def.resizable;
  return { w: clamp(num(s.w, def.w), ...R.w), d: clamp(num(s.d, def.d), ...R.d), h: clamp(num(s.h, def.h), ...R.h) };
}

let seq = 0;
export const newId = () => 'i' + Date.now().toString(36) + (seq++).toString(36) + Math.floor(Math.random() * 1e4).toString(36);

export function makeItem(type, props = {}) {
  const def = CATALOG[type];
  if (!def) return null;
  const it = { id: newId(), type, colors: {}, on: {} };
  for (const [k, c] of Object.entries(def.colors || {})) it.colors[k] = c.def;
  for (const [k, t] of Object.entries(def.toggles || {})) it.on[k] = t.def;
  if (def.kind === 'floor' || def.kind === 'rug') Object.assign(it, { x: 150, z: 150, rot: 0 });
  if (def.kind === 'wall') Object.assign(it, { wall: 'left', along: 60, y: def.y });
  if (def.kind === 'child') Object.assign(it, { parent: null, lx: 0, lz: 0, lrot: 0 });
  if (def.flip) it.flip = false;
  if (def.resizable) it.size = { w: def.w, d: def.d, h: def.h };
  const { colors, on, size, ...rest } = props;
  Object.assign(it, rest);
  if (colors) Object.assign(it.colors, colors);
  if (on) Object.assign(it.on, on);
  if (size && def.resizable) it.size = sizeOf({ type, size });
  return it;
}

// ---------- 幾何 ----------
const rad = d => d * Math.PI / 180;

export function footprint(item) {
  const { w, d } = sizeOf(item), t = rad(item.rot || 0), c = Math.cos(t), s = Math.sin(t);
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]
    .map(([lx, lz]) => [item.x + lx * c + lz * s, item.z - lx * s + lz * c]);
}

// 分離軸定理：兩個凸多邊形是否有實質重疊（貼齊不算）
export function polysOverlap(a, b, eps = EPS) {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, z1] = poly[i], [x2, z2] = poly[(i + 1) % poly.length];
      let ax = z2 - z1, az = x1 - x2;
      const len = Math.hypot(ax, az);
      if (len < 1e-9) continue;
      ax /= len; az /= len;
      let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
      for (const [x, z] of a) { const p = x * ax + z * az; if (p < amin) amin = p; if (p > amax) amax = p; }
      for (const [x, z] of b) { const p = x * ax + z * az; if (p < bmin) bmin = p; if (p > bmax) bmax = p; }
      if (amax - bmin <= eps || bmax - amin <= eps) return false;
    }
  }
  return true;
}

const kindOf = item => CATALOG[item.type].kind;
const itemName = item => CATALOG[item.type].name;

export function childWorld(state, item) {
  const p = state.items.find(i => i.id === item.parent);
  if (!p) return null;
  const t = rad(p.rot || 0), c = Math.cos(t), s = Math.sin(t);
  return { x: p.x + item.lx * c + item.lz * s, z: p.z - item.lx * s + item.lz * c, rot: (p.rot || 0) + (item.lrot || 0), y: CATALOG[p.type].surface.y };
}

export function clampChild(parent, item) {
  const surf = CATALOG[parent.type].surface, { w, d } = sizeOf(item), t = rad(item.lrot || 0);
  const hx = (Math.abs(w * Math.cos(t)) + Math.abs(d * Math.sin(t))) / 2;
  const hz = (Math.abs(w * Math.sin(t)) + Math.abs(d * Math.cos(t))) / 2;
  const mx = Math.max(0, surf.w / 2 - hx), mz = Math.max(0, surf.d / 2 - hz);
  return { lx: clamp(item.lx, -mx, mx), lz: clamp(item.lz, -mz, mz) };
}

export function wallRect(item) {
  const { w, h } = sizeOf(item);
  return { a0: item.along - w / 2, a1: item.along + w / 2, y0: item.y, y1: item.y + h };
}

// 檢查單一物件目前位置是否合法。回傳 { ok, hit }
export function checkPlacement(state, item) {
  const r = state.room, kind = kindOf(item);
  if (kind === 'floor' || kind === 'rug') {
    const fp = footprint(item), zd = r.depth + r.entryDepth;
    for (const [x, z] of fp) {
      if (x < -EPS || x > r.width + EPS || z < -EPS || z > zd + EPS) return { ok: false, hit: '牆壁' };
    }
    for (const o of roomObstacles(r)) {
      if (kind === 'rug' && o.id === 'door') continue; // 地毯可鋪在開門範圍內
      if (polysOverlap(fp, o.poly)) return { ok: false, hit: o.name };
    }
    if (kind === 'floor') {
      for (const other of state.items) {
        if (other.id === item.id || kindOf(other) !== 'floor') continue;
        if (polysOverlap(fp, footprint(other))) return { ok: false, hit: itemName(other) };
      }
    }
    return { ok: true };
  }
  if (kind === 'wall') {
    const wall = walls(r).find(w => w.id === item.wall);
    if (!wall) return { ok: false, hit: '無效牆面' };
    const q = wallRect(item);
    if (q.a0 < -EPS || q.a1 > wall.len + EPS) return { ok: false, hit: '牆面邊界' };
    if (q.y0 < 10 - EPS || q.y1 > wall.top(q.a0, q.a1) + EPS) return { ok: false, hit: '天花板或地面' };
    const hits = (b) => q.a0 < b.a1 - EPS && q.a1 > b.a0 + EPS && q.y0 < b.y1 - EPS && q.y1 > b.y0 + EPS;
    for (const h of wall.holes) if (hits(h)) return { ok: false, hit: h.name };
    for (const other of state.items) {
      if (other.id === item.id || kindOf(other) !== 'wall' || other.wall !== item.wall) continue;
      if (hits(wallRect(other))) return { ok: false, hit: itemName(other) };
    }
    return { ok: true };
  }
  // child：必須有正確種類的承載家具，且完整落在表面內
  const p = state.items.find(i => i.id === item.parent);
  if (!p || CATALOG[p.type].host !== CATALOG[item.type].on) return { ok: false, hit: '需要先放置' + (CATALOG[item.type].on === 'bed' ? '床' : '書桌') };
  const c = clampChild(p, item);
  if (Math.abs(c.lx - item.lx) > EPS || Math.abs(c.lz - item.lz) > EPS) return { ok: false, hit: '表面邊緣' };
  return { ok: true };
}

// 拖曳地面家具：回傳最接近目標的合法位置。永遠不會回到「最初加入時的位置」。
export function moveFloorItem(state, item, tx, tz) {
  const ok = (x, z) => checkPlacement(state, { ...item, x, z }).ok;
  if (ok(tx, tz)) return { x: tx, z: tz, blocked: false };
  if (!ok(item.x, item.z)) return { x: item.x, z: item.z, blocked: true, hit: checkPlacement(state, { ...item, x: tx, z: tz }).hit };
  const hit = checkPlacement(state, { ...item, x: tx, z: tz }).hit;
  const march = (x0, z0, x1, z1) => {
    const dist = Math.hypot(x1 - x0, z1 - z0);
    if (dist < 0.01) return [x0, z0];
    const n = Math.ceil(dist / 2);
    let lo = 0;
    for (let i = 1; i <= n; i++) { const t = i / n; if (ok(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)) lo = t; else break; }
    let hi = Math.min(1, lo + 1 / n);
    for (let k = 0; k < 8 && hi > lo; k++) { const m = (lo + hi) / 2; if (ok(x0 + (x1 - x0) * m, z0 + (z1 - z0) * m)) lo = m; else hi = m; }
    return [x0 + (x1 - x0) * lo, z0 + (z1 - z0) * lo];
  };
  let [x, z] = march(item.x, item.z, tx, tz);
  for (let pass = 0; pass < 2; pass++) { // 沿牆或障礙物滑動
    [x, z] = march(x, z, tx, z);
    [x, z] = march(x, z, x, tz);
  }
  return { x, z, blocked: true, hit };
}

export function moveWallItem(state, item, wallId, along, y) {
  const next = { ...item, wall: wallId, along, y };
  if (checkPlacement(state, next).ok) return { wall: wallId, along, y, blocked: false };
  const hit = checkPlacement(state, next).hit;
  if (wallId === item.wall) { // 分軸滑動
    if (checkPlacement(state, { ...item, along }).ok) return { wall: item.wall, along, y: item.y, blocked: true, hit };
    if (checkPlacement(state, { ...item, y }).ok) return { wall: item.wall, along: item.along, y, blocked: true, hit };
  }
  return { wall: item.wall, along: item.along, y: item.y, blocked: true, hit };
}

// 在指定位置附近尋找可放置的空位
export function findFreeSpot(state, item, x0 = item.x, z0 = item.z) {
  const ok = (x, z) => checkPlacement(state, { ...item, x, z }).ok;
  if (ok(x0, z0)) return { x: x0, z: z0 };
  for (let rr = 4; rr <= 520; rr += 4) {
    const n = Math.max(8, Math.round(rr / 2));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, x = Math.round(x0 + rr * Math.cos(a)), z = Math.round(z0 + rr * Math.sin(a));
      if (ok(x, z)) return { x, z };
    }
  }
  return null;
}

export function findWallSpot(state, item) {
  const order = [item.wall, ...walls(state.room).map(w => w.id).filter(id => id !== item.wall)];
  for (const id of order) {
    const wall = walls(state.room).find(w => w.id === id);
    if (!wall) continue;
    const { w } = sizeOf(item);
    const cands = [];
    for (let a = w / 2; a <= wall.len - w / 2; a += 4) cands.push(a);
    cands.sort((p, q) => Math.abs(p - item.along) - Math.abs(q - item.along));
    for (const y of [item.y, 108, 130, 60, 30, 150]) for (const a of cands) {
      if (checkPlacement(state, { ...item, wall: id, along: a, y }).ok) return { wall: id, along: a, y };
    }
  }
  return null;
}

// 房間尺寸變更後，把落入牆壁、柱子或木作的家具移到最近的合法位置；放不下才移除。
export function resolveRoom(state) {
  const moved = [], removed = [];
  const keep = [];
  for (const it of state.items) {
    const kind = kindOf(it);
    const probe = { ...state, items: keep };
    if (kind === 'floor' || kind === 'rug') {
      if (!checkPlacement(probe, it).ok) {
        const s = findFreeSpot(probe, it);
        if (!s) { removed.push(itemName(it)); continue; }
        it.x = s.x; it.z = s.z; moved.push(itemName(it));
      }
    } else if (kind === 'wall') {
      if (!checkPlacement(probe, it).ok) {
        const s = findWallSpot(probe, it);
        if (!s) { removed.push(itemName(it)); continue; }
        Object.assign(it, s); moved.push(itemName(it));
      }
    }
    keep.push(it);
  }
  state.items = keep.filter(it => {
    if (kindOf(it) !== 'child') return true;
    const p = keep.find(i => i.id === it.parent);
    if (!p || CATALOG[p.type].host !== CATALOG[it.type].on) { removed.push(itemName(it)); return false; }
    Object.assign(it, clampChild(p, it));
    return true;
  });
  return { moved, removed };
}

// ---------- 佈置提案 ----------
// 座標以預設房間為準；套用後會再經過 resolveRoom 以配合修改過的房間尺寸。
function layoutA(pal) {
  const bed = makeItem('nordli', { x: 240.5, z: 101.5, rot: 0, colors: { duvet: pal.duvet, pillow: pal.pillow } });
  const desk = makeItem('desk120', { x: 35.5, z: 61.5, rot: 90, colors: { top: pal.wood, frame: pal.frame } });
  return [
    makeItem('rug', { x: 125, z: 185, rot: 0, colors: { body: pal.rug } }),
    bed, desk,
    makeItem('deskChair', { x: 98, z: 62, rot: 270, colors: { seat: pal.chair } }),
    makeItem('isjakt', { x: 84, z: 13, rot: 270 }),
    makeItem('poles', { x: 17.5, z: 158, rot: 90, colors: { body: pal.mirror } }),
    makeItem('beanbag', { x: 133, z: 190, rot: 0, colors: { body: pal.beanbag } }),
    makeItem('shelf', { x: 221, z: 218.5, rot: 0, colors: { body: pal.wood } }),
    makeItem(pal.side || 'trolley', { x: 281, z: 227, rot: 0, colors: { body: pal.metal } }),
    makeItem('pegboard', { wall: 'left', along: 62, y: 108 }),
    makeItem('gosig', { parent: bed.id, lx: -18, lz: 30, lrot: 25 }),
    makeItem('cushion', { parent: bed.id, lx: 30, lz: -40, lrot: 12, colors: { body: pal.cushion } }),
    makeItem('deskLamp', { parent: desk.id, lx: -45, lz: -20, lrot: 30, colors: { body: pal.metal } }),
    makeItem('organizer', { parent: desk.id, lx: 40, lz: -22, lrot: 0 }),
    makeItem('vanity', { parent: desk.id, lx: 12, lz: -24, lrot: 0 }),
  ];
}
function layoutB(pal) {
  const bed = makeItem('nordli', { x: 101.5, z: 60.5, rot: 90, colors: { duvet: pal.duvet, pillow: pal.pillow } });
  const desk = makeItem('desk120', { x: 265.5, z: 185, rot: 270, colors: { top: pal.wood, frame: pal.frame } });
  return [
    makeItem('rug', { x: 110, z: 188, rot: 0, colors: { body: pal.rug } }),
    bed, desk,
    makeItem('deskChair', { x: 203, z: 185, rot: 90, colors: { seat: pal.chair } }),
    makeItem('isjakt', { x: 288.5, z: 111, rot: 0 }),
    makeItem('poles', { x: 17.5, z: 157, rot: 90, colors: { body: pal.mirror } }),
    makeItem('beanbag', { x: 110, z: 180, rot: 0, colors: { body: pal.beanbag } }),
    makeItem('shelf', { x: 244, z: 15.5, rot: 0, colors: { body: pal.wood } }),
    makeItem('gosig', { parent: bed.id, lx: 20, lz: 35, lrot: -20 }),
    makeItem('deskLamp', { parent: desk.id, lx: 45, lz: -20, lrot: -30, colors: { body: pal.metal } }),
    makeItem('organizer', { parent: desk.id, lx: -38, lz: -22, lrot: 0 }),
    makeItem('docTray', { parent: desk.id, lx: -8, lz: -12, lrot: 0 }),
  ];
}

export const PROPOSALS = [
  { id: 'retro', name: '復古暖橘', desc: '暖橘寢具、不鏽鋼立鏡與銀色推車；書桌靠窗採光，懶骨頭正對投影牆。',
    build: () => layoutA({ duvet: '#d9743c', pillow: '#efe8da', wood: '#d9bd8f', frame: '#f1efe9', chair: '#d9bd8f', mirror: '#c2c7c9', beanbag: '#c3c4c2', rug: '#ece4d3', metal: '#c9cdd0', cushion: '#7f9bb8' }) },
  { id: 'muji', name: '無印日系', desc: '床橫放在大窗下，書桌靠木作牆；燕麥色寢具配橡木與奶油米立鏡。',
    build: () => layoutB({ duvet: '#d8c9b0', pillow: '#efe8da', wood: '#d9bd8f', frame: '#f1efe9', chair: '#efe8da', mirror: '#e9e3d2', beanbag: '#c3c4c2', rug: '#ece4d3', metal: '#ece6d6' }) },
  { id: 'nordic', name: '灰白北歐・金屬', desc: '灰白寢具、銀色金屬桌架與邊桌，加一點霧藍；韓系金屬家具感。',
    build: () => layoutA({ duvet: '#c3c4c2', pillow: '#efe8da', wood: '#f1efe9', frame: '#c9cdd0', chair: '#7f9bb8', mirror: '#86abd0', beanbag: '#c3c4c2', rug: '#c9c8c4', metal: '#c9cdd0', cushion: '#d9743c', side: 'sideTable' }) },
];

export function applyProposal(state, id) {
  const p = PROPOSALS.find(q => q.id === id) || PROPOSALS[0];
  state.items = p.build();
  return resolveRoom(state);
}

export function defaultState() {
  const s = { v: VERSION, room: normalizeRoom(), items: [], ui: { night: false, ceilingOn: true, doorAngle: 55, showSwing: true } };
  applyProposal(s, 'retro');
  return s;
}

// ---------- 載入舊資料 ----------
const isColor = v => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

export function migrate(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) return defaultState();
  const s = { v: VERSION, room: normalizeRoom(raw.room), items: [], ui: { night: false, ceilingOn: true, doorAngle: 55, showSwing: true } };
  const ui = raw.ui && typeof raw.ui === 'object' ? raw.ui : {};
  s.ui.night = !!ui.night;
  s.ui.ceilingOn = ui.ceilingOn !== false;
  s.ui.doorAngle = clamp(num(ui.doorAngle, 55), 0, 90);
  s.ui.showSwing = ui.showSwing !== false;
  const seen = new Set();
  for (const src of raw.items) {
    if (!src || typeof src !== 'object' || !CATALOG[src.type]) continue;
    const def = CATALOG[src.type], it = makeItem(src.type);
    if (typeof src.id === 'string' && src.id && !seen.has(src.id)) it.id = src.id;
    seen.add(it.id);
    for (const k of Object.keys(it.colors)) if (src.colors && isColor(src.colors[k])) it.colors[k] = src.colors[k];
    for (const k of Object.keys(it.on)) if (src.on && typeof src.on[k] === 'boolean') it.on[k] = src.on[k];
    if (def.flip) it.flip = !!src.flip;
    if (def.resizable) it.size = sizeOf({ type: src.type, size: src.size });
    if (def.kind === 'floor' || def.kind === 'rug') { it.x = num(src.x, 150); it.z = num(src.z, 150); it.rot = ((num(src.rot, 0) % 360) + 360) % 360; }
    if (def.kind === 'wall') { it.wall = typeof src.wall === 'string' ? src.wall : 'left'; it.along = num(src.along, 60); it.y = num(src.y, def.y); }
    if (def.kind === 'child') { it.parent = typeof src.parent === 'string' ? src.parent : null; it.lx = num(src.lx, 0); it.lz = num(src.lz, 0); it.lrot = num(src.lrot, 0); }
    s.items.push(it);
  }
  resolveRoom(s);
  return s;
}

export function duplicateInto(state, item) {
  const kind = kindOf(item), copy = JSON.parse(JSON.stringify(item));
  copy.id = newId();
  const added = [];
  if (kind === 'floor' || kind === 'rug') {
    const spot = findFreeSpot(state, copy, item.x + 30, item.z + 30);
    if (!spot) return null;
    Object.assign(copy, spot);
    state.items.push(copy); added.push(copy);
    for (const ch of state.items.filter(i => i.parent === item.id)) {
      const c2 = JSON.parse(JSON.stringify(ch)); c2.id = newId(); c2.parent = copy.id;
      state.items.push(c2); added.push(c2);
    }
  } else if (kind === 'wall') {
    const spot = findWallSpot(state, { ...copy, along: item.along + sizeOf(item).w + 4 });
    if (!spot) return null;
    Object.assign(copy, spot); state.items.push(copy); added.push(copy);
  } else {
    copy.lx += 12; copy.lz += 12;
    const p = state.items.find(i => i.id === copy.parent);
    if (!p) return null;
    Object.assign(copy, clampChild(p, copy)); state.items.push(copy); added.push(copy);
  }
  return added;
}
