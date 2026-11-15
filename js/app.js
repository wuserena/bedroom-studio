import * as THREE from '../vendor/three.module.min.js';
import * as M from './model.js';
import { makeTextures } from './textures.js';
import { roomMaterials, buildRoom } from './room3d.js';
import { createFurnitureFactory, modelSignature } from './furniture3d.js';

const KEY = 'bedroom-studio.fable.v1';
const $ = (s) => document.querySelector(s);
const rad = (d) => d * Math.PI / 180;
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  for (const k of kids) n.append(k);
  return n;
};
const fmt = (v) => (Math.round(v * 10) / 10).toString();

function fatal(msg) {
  const f = $('#fatal'); f.hidden = false; f.textContent = msg;
}

try { main(); } catch (err) { console.error(err); fatal('無法啟動 3D 畫面：' + (err && err.message ? err.message : err) + '\n請確認瀏覽器支援 WebGL 並重新整理。'); }

function main() {
  const canvas = $('#view');
  const coarse = matchMedia('(pointer: coarse)').matches;
  const quality = { sun: coarse ? 1024 : 2048, pointShadows: coarse ? 1 : 3, pointMap: coarse ? 512 : 1024 };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const tx = makeTextures();
  const mats = roomMaterials(tx);
  const factory = createFurnitureFactory(tx);

  // 環境反射：簡化的室內環境（給磁磚反光、金屬與鏡面使用）
  {
    const s = new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.BoxGeometry(10, 6, 10), new THREE.MeshBasicMaterial({ color: '#b3a792', side: THREE.BackSide })));
    const pane = (w, h, c, x, y, z, ry = 0, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); s.add(m); };
    pane(6.5, 2.6, new THREE.Color(7, 7.6, 8.4), 0, 0.6, -4.95);
    pane(2, 2, new THREE.Color(3.5, 3.8, 4.2), 4.95, 0.8, -2, Math.PI / 2);
    pane(9, 9, new THREE.Color(1.5, 1.4, 1.25), 0, 2.95, 0, 0, Math.PI / 2);
    pane(9, 9, new THREE.Color(0.75, 0.7, 0.62), 0, -2.95, 0, 0, Math.PI / 2);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(s, 0.03).texture;
    pm.dispose();
  }

  const hemi = new THREE.HemisphereLight('#e6eef7', '#b9a78f', 0.5);
  const sun = new THREE.DirectionalLight('#fff0d9', 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.sun, quality.sun);
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.9; sun.shadow.radius = 3.5;
  const skyFill = new THREE.PointLight('#e9f1ff', 0, 0, 2);
  const sideFill = new THREE.PointLight('#e9f1ff', 0, 0, 2);
  scene.add(hemi, sun, sun.target, skyFill, sideFill);

  const itemsRoot = new THREE.Group();
  scene.add(itemsRoot);

  // ---------- 狀態 ----------
  let state;
  try { state = M.migrate(JSON.parse(localStorage.getItem(KEY))); } catch { state = M.defaultState(); }
  let selectedId = null, blockedHit = null;
  const history = [], future = [];
  const snap = () => JSON.stringify({ room: state.room, items: state.items });
  const checkpoint = () => { history.push(snap()); if (history.length > 80) history.shift(); future.length = 0; updateUndoButtons(); };
  const restore = (json) => { const d = JSON.parse(json); state.room = M.normalizeRoom(d.room); state.items = d.items; if (!state.items.some(i => i.id === selectedId)) selectedId = null; rebuildRoom(); syncItems(); renderPanel(); fillSizeFields(); save(); };
  const undo = () => { if (!history.length) return; future.push(snap()); restore(history.pop()); updateUndoButtons(); };
  const redo = () => { if (!future.length) return; history.push(snap()); restore(future.pop()); updateUndoButtons(); };
  let saveTimer = 0;
  const saveNow = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 私密模式等情況：略過 */ } };
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 120); };
  addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

  const getItem = (id) => state.items.find(i => i.id === id);
  const defOf = (it) => M.CATALOG[it.type];

  // ---------- 房間 ----------
  let room3d = null;
  let needsRender = true;
  const invalidate = () => { needsRender = true; };

  function disposeTree(root) {
    root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.isLight && o.shadow && o.shadow.map) o.shadow.map.dispose(); });
  }
  function rebuildRoom() {
    if (room3d) { scene.remove(room3d.root); disposeTree(room3d.root); }
    room3d = buildRoom(state.room, mats, quality);
    scene.add(room3d.root);
    const r = state.room, zd = r.depth + r.entryDepth;
    sun.target.position.set(r.width * 0.45, 0, r.depth * 0.42);
    sun.position.set(r.width * 0.45 + 250, 400, r.depth * 0.42 - 470);
    const c = sun.shadow.camera, ext = Math.max(r.width, zd) * 0.85 + 60;
    c.left = -ext; c.right = ext; c.top = ext; c.bottom = -ext; c.near = 40; c.far = 1500; c.updateProjectionMatrix();
    skyFill.position.set(r.winX + r.winW / 2, r.winSill + r.winH * 0.55, 55);
    sideFill.position.set(r.width - r.woodDepth - 30, r.sWinSill + r.sWinH / 2, r.sWinZ + r.sWinW / 2);
    applyLighting(); applyDoor(); buildLabels(); invalidate();
  }
  function applyLighting() {
    const night = state.ui.night, on = state.ui.ceilingOn;
    scene.background = new THREE.Color(night ? '#0e131b' : '#cdd9e4');
    scene.environmentIntensity = night ? (on ? 0.16 : 0.05) : 0.5;
    hemi.intensity = night ? 0.05 : 0.62;
    hemi.color.set(night ? '#5a6a8c' : '#e6eef7');
    sun.intensity = night ? 0 : 3.4;
    sun.castShadow = !night;
    skyFill.intensity = night ? 0 : 2.6e4;
    sideFill.intensity = night ? 0 : 0.7e4;
    renderer.toneMappingExposure = night ? 1.05 : 0.95;
    for (const cl of room3d.ceilingLights) { cl.light.intensity = on ? (night ? 6.2e4 : 2.2e4) : 0; cl.light.visible = on; }
    mats.fixture.emissiveIntensity = on ? 2.4 : 0;
    mats.glass.color.set(night ? '#1c2634' : '#cfe4ee');
    mats.glass.opacity = night ? 0.55 : 0.16;
    $('#btnNight').textContent = night ? '🌙 晚上' : '☀️ 白天';
    $('#btnCeil').classList.toggle('off', !on);
    $('#btnCeil').textContent = on ? '💡 頂燈開' : '💡 頂燈關';
    invalidate();
  }
  function applyDoor() {
    room3d.doorPivot.rotation.y = rad(state.ui.doorAngle);
    room3d.swing.visible = state.ui.showSwing;
    invalidate();
  }

  // ---------- 家具同步 ----------
  const views = new Map();
  function removeView(id) {
    const v = views.get(id);
    if (!v) return;
    for (const ch of [...v.group.children]) if (ch.userData.itemId && ch.userData.itemId !== id && views.has(ch.userData.itemId)) itemsRoot.add(ch);
    v.group.removeFromParent();
    v.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map && o.material.map.isCanvasTexture && o.material.map.image.width === 384) o.material.map.dispose(); });
    views.delete(id);
  }
  function placeItem(it) {
    const v = views.get(it.id), def = defOf(it), g = v.group;
    let parent = itemsRoot;
    if (def.kind === 'floor' || def.kind === 'rug') {
      g.position.set(it.x, def.kind === 'rug' ? 0.06 : 0, it.z); g.rotation.y = rad(it.rot);
    } else if (def.kind === 'wall') {
      const w = M.wallById(state.room, it.wall);
      g.position.set(w.ox + w.dx * it.along + w.nx * 0.05, it.y, w.oz + w.dz * it.along + w.nz * 0.05);
      g.rotation.y = Math.atan2(w.nx, w.nz);
    } else {
      const pv = views.get(it.parent), p = getItem(it.parent);
      if (pv && p) { parent = pv.group; g.position.set(it.lx, defOf(p).surface.y, it.lz); g.rotation.y = rad(it.lrot); }
    }
    if (g.parent !== parent) parent.add(g);
  }
  function syncItems() {
    const ids = new Set(state.items.map(i => i.id));
    for (const id of [...views.keys()]) if (!ids.has(id)) removeView(id);
    for (const it of state.items) {
      const sig = modelSignature(it);
      let v = views.get(it.id);
      if (!v || v.sig !== sig) { removeView(it.id); v = { group: factory.build(it), sig }; views.set(it.id, v); }
      factory.applyLamps(v.group, it);
    }
    const order = [...state.items].sort((a, b) => (defOf(a).kind === 'child') - (defOf(b).kind === 'child'));
    for (const it of order) placeItem(it);
    updateSelection(); invalidate();
  }

  // ---------- 選取外框（占地範圍） ----------
  const selLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([0, 1, 2, 3].map(() => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: '#2f6fd0', depthTest: false }));
  const selFill = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: '#2f6fd0', transparent: true, opacity: 0.16, depthTest: false, side: THREE.DoubleSide }));
  selFill.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
  selFill.geometry.setIndex([0, 1, 2, 0, 2, 3]);
  selLine.renderOrder = 10; selFill.renderOrder = 9; selLine.frustumCulled = selFill.frustumCulled = false;
  scene.add(selLine, selFill);
  const selCenter = new THREE.Vector3();
  function selectionCorners(it) {
    const def = defOf(it), sz = M.sizeOf(it);
    if (def.kind === 'wall') {
      const w = M.wallById(state.room, it.wall), q = M.wallRect(it), o = 1.2;
      const P = (a, y) => new THREE.Vector3(w.ox + w.dx * a + w.nx * o, y, w.oz + w.dz * a + w.nz * o);
      return [P(q.a0, q.y0), P(q.a1, q.y0), P(q.a1, q.y1), P(q.a0, q.y1)];
    }
    let base = it, y = def.kind === 'rug' ? 1.6 : 2.2;
    if (def.kind === 'child') { const cw = M.childWorld(state, it); if (!cw) return null; base = { type: it.type, size: it.size, x: cw.x, z: cw.z, rot: cw.rot }; y = cw.y + 0.6; }
    void sz;
    return M.footprint(base).map(([x, z]) => new THREE.Vector3(x, y, z));
  }
  function updateSelection() {
    const it = selectedId && getItem(selectedId), pts = it && selectionCorners(it);
    selLine.visible = selFill.visible = !!pts;
    const lab = $('#selLabel');
    if (!pts) { lab.hidden = true; return; }
    const pos = selLine.geometry.attributes.position, fp = selFill.geometry.attributes.position;
    pts.forEach((p, i) => { pos.setXYZ(i, p.x, p.y, p.z); fp.setXYZ(i, p.x, p.y, p.z); });
    pos.needsUpdate = fp.needsUpdate = true;
    const col = blockedHit ? '#d0392b' : '#2f6fd0';
    selLine.material.color.set(col); selFill.material.color.set(col);
    selCenter.copy(pts[0]).add(pts[2]).multiplyScalar(0.5);
    const sz = M.sizeOf(it);
    lab.textContent = blockedHit ? `碰到${blockedHit}` : (defOf(it).kind === 'wall' ? `${fmt(sz.w)} × ${fmt(sz.h)} cm` : `${fmt(sz.w)} × ${fmt(sz.d)} cm`);
    lab.classList.toggle('bad', !!blockedHit);
    lab.hidden = false;
    invalidate();
  }
  function select(id) {
    if (selectedId === id) return;
    selectedId = id; blockedHit = null;
    updateSelection(); renderPanel();
  }

  // ---------- 攝影機與視角 ----------
  const persp = new THREE.PerspectiveCamera(42, 1, 4, 6000);
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 4000);
  const cam = { mode: 'orbit', theta: -0.62, phi: 0.92, radius: 800, target: new THREE.Vector3(), top: { cx: 0, cz: 0, zoom: 1 }, fp: { pos: new THREE.Vector3(), yaw: 0, pitch: 0, fov: 68 } };
  const activeCam = () => (cam.mode === 'top' ? ortho : persp);
  const interior = () => cam.mode === 'inside' || cam.mode === 'door' || cam.mode === 'bed';
  const HINTS = {
    orbit: '拖曳空白處旋轉・雙指或滾輪縮放・拖曳家具移動',
    top: '俯視配置：拖曳家具移動・拖曳空白處平移・雙指或滾輪縮放',
    inside: '室內視角：拖曳環顧・點地板走過去・雙指或滾輪調整視野',
    door: '門口視角：拖曳環顧', bed: '床上視角：拖曳環顧',
  };
  function setView(mode) {
    const r = state.room, zd = r.depth + r.entryDepth, aspect = innerWidth / innerHeight;
    if (mode === 'bed') {
      const bed = state.items.find(i => defOf(i).host === 'bed');
      if (!bed) { toast('目前沒有床，請先從「＋家具」加入'); return; }
      const t = rad(bed.rot), dir = bed.flip ? -1 : 1, lz = -62 * dir;
      cam.fp.pos.set(bed.x + lz * Math.sin(t), 102, bed.z + lz * Math.cos(t));
      cam.fp.yaw = Math.atan2(dir * Math.sin(t), dir * Math.cos(t)); cam.fp.pitch = -0.2; cam.fp.fov = 72;
    } else if (mode === 'inside') {
      cam.fp.pos.set((r.width - r.woodDepth) * 0.5, 150, r.depth * 0.68); cam.fp.yaw = Math.PI; cam.fp.pitch = -0.12; cam.fp.fov = 74;
    } else if (mode === 'door') {
      cam.fp.pos.set(r.doorWidth * 0.55, 152, zd - 14); cam.fp.yaw = Math.PI - 0.32; cam.fp.pitch = -0.14; cam.fp.fov = 78;
    } else if (mode === 'orbit') {
      cam.target.set(r.width / 2, 70, zd / 2);
      cam.radius = clamp(760 / Math.min(1, aspect * 1.15), 420, 1700);
    } else if (mode === 'top') {
      cam.top.cx = r.width / 2; cam.top.cz = zd / 2; cam.top.zoom = 1;
    }
    cam.mode = mode;
    for (const b of document.querySelectorAll('#views button')) b.classList.toggle('on', b.dataset.view === mode);
    $('#hint').textContent = HINTS[mode];
    $('#labels').hidden = mode !== 'top';
    resize();
  }
  function updateCamera() {
    const r = state.room, zd = r.depth + r.entryDepth, aspect = innerWidth / innerHeight;
    if (cam.mode === 'top') {
      const pad = innerWidth < 720 ? 1.34 : 1.22;
      let h = (zd + 60) * pad, w = h * aspect;
      if (w < (r.width + 90) * pad) { w = (r.width + 90) * pad; h = w / aspect; }
      h /= cam.top.zoom; w /= cam.top.zoom;
      ortho.left = -w / 2; ortho.right = w / 2; ortho.top = h / 2; ortho.bottom = -h / 2;
      ortho.position.set(cam.top.cx, 1500, cam.top.cz); ortho.up.set(0, 0, -1); ortho.lookAt(cam.top.cx, 0, cam.top.cz);
      ortho.updateProjectionMatrix();
    } else if (cam.mode === 'orbit') {
      persp.fov = 42; persp.aspect = aspect;
      const s = Math.sin(cam.phi);
      persp.position.set(cam.target.x + cam.radius * s * Math.sin(cam.theta), cam.target.y + cam.radius * Math.cos(cam.phi), cam.target.z + cam.radius * s * Math.cos(cam.theta));
      persp.up.set(0, 1, 0); persp.lookAt(cam.target); persp.updateProjectionMatrix();
    } else {
      persp.fov = cam.fp.fov; persp.aspect = aspect;
      persp.position.copy(cam.fp.pos); persp.up.set(0, 1, 0);
      const cp = Math.cos(cam.fp.pitch);
      persp.lookAt(cam.fp.pos.x + Math.sin(cam.fp.yaw) * cp, cam.fp.pos.y + Math.sin(cam.fp.pitch), cam.fp.pos.z + Math.cos(cam.fp.yaw) * cp);
      persp.updateProjectionMatrix();
    }
    // 剖面：從外側看時隱藏擋住視線的牆（仍保留陰影）
    const p = persp.position, orbit = cam.mode === 'orbit', top = cam.mode === 'top';
    room3d.setGhost('window', orbit && p.z < 0);
    room3d.setGhost('left', orbit && p.x < 0);
    room3d.setGhost('right', orbit && p.x > r.width);
    room3d.setGhost('back', orbit && p.z > r.depth);
    room3d.setGhost('ceiling', orbit || top);
  }
  function resize() {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(innerWidth, innerHeight, false);
    invalidate();
  }
  addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 250));

  // ---------- 俯視圖標示 ----------
  let labels = [];
  function buildLabels() {
    const r = state.room, zd = r.depth + r.entryDepth, c = M.columnRect(r), box = $('#labels');
    box.textContent = '';
    const L = (text, x, z, cls = '') => labels.push({ el: box.appendChild(el('span', { className: cls, innerHTML: text })), v: new THREE.Vector3(x, 0, z) });
    labels = [];
    L(`大窗牆 ${fmt(r.width)} cm<br>大窗 ${fmt(r.winW)}`, r.width / 2, -34, 'dim');
    L(`深 ${fmt(r.depth)} cm`, -38, r.depth / 2, 'dim');
    L(`柱子<br>${fmt(r.colAlong)} × ${fmt(r.colOut)}`, c.x1 + 30, (c.z0 + c.z1) / 2);
    L(`開門淨空<br>${fmt(r.doorWidth)} cm`, r.doorWidth * 0.5, zd - r.doorWidth * 0.42);
    L(`入口凸出 ${fmt(r.entryWidth)} × ${fmt(r.entryDepth)}・門`, r.entryWidth / 2 + 14, zd + 26);
    L('投影牆', (r.entryWidth + r.width - r.woodDepth) / 2, r.depth + 20);
    L('固定<br>木作', r.width + 28, r.depth * 0.62);
    L('小窗', r.width + 28, r.sWinZ + r.sWinW / 2);
    for (const cl of room3d.ceilingLights) L('頂燈', cl.x, cl.z - 30, 'lamp');
  }
  const tmpV = new THREE.Vector3();
  function projectTo(node, v) {
    tmpV.copy(v).project(activeCam());
    node.style.left = ((tmpV.x + 1) / 2 * innerWidth) + 'px';
    node.style.top = ((1 - tmpV.y) / 2 * innerHeight) + 'px';
  }

  // ---------- 繪製 ----------
  function frame() {
    requestAnimationFrame(frame);
    if (!needsRender) return;
    needsRender = false;
    updateCamera();
    renderer.render(scene, activeCam());
    if (cam.mode === 'top') for (const l of labels) projectTo(l.el, l.v);
    if (!$('#selLabel').hidden) projectTo($('#selLabel'), selCenter);
  }

  // ---------- 指標互動 ----------
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const setRay = (e) => { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); raycaster.setFromCamera(ndc, activeCam()); return raycaster.ray; };
  function pick(e) {
    setRay(e);
    const hits = raycaster.intersectObjects(itemsRoot.children, true);
    for (const h of hits) if (h.object.userData.itemId && getItem(h.object.userData.itemId)) return { id: h.object.userData.itemId, point: h.point.clone() };
    return null;
  }
  const planeHit = (ray, y) => { if (Math.abs(ray.direction.y) < 1e-5) return null; const t = (y - ray.origin.y) / ray.direction.y; return t > 0 ? ray.origin.clone().addScaledVector(ray.direction, t) : null; };
  function wallHit(ray, preferId) { // 射線落在哪一面可掛牆面
    const ws = M.walls(state.room);
    if (Math.abs(ray.direction.y) > 0.999) { // 俯視：取最近的牆
      const p = planeHit(ray, 0); if (!p) return null;
      let best = null;
      for (const w of ws) { const a = clamp((p.x - w.ox) * w.dx + (p.z - w.oz) * w.dz, 0, w.len), dist = Math.hypot(p.x - (w.ox + w.dx * a), p.z - (w.oz + w.dz * a)) - (w.id === preferId ? 12 : 0); if (!best || dist < best.dist) best = { wall: w.id, along: a, y: null, dist }; }
      return best;
    }
    let best = null;
    for (const w of ws) {
      const dn = ray.direction.x * w.nx + ray.direction.z * w.nz;
      if (dn >= -1e-4) continue;
      const t = ((w.ox - ray.origin.x) * w.nx + (w.oz - ray.origin.z) * w.nz) / dn;
      if (t <= 0) continue;
      const hx = ray.origin.x + ray.direction.x * t, hz = ray.origin.z + ray.direction.z * t, hy = ray.origin.y + ray.direction.y * t;
      const a = (hx - w.ox) * w.dx + (hz - w.oz) * w.dz;
      if (a < -30 || a > w.len + 30 || hy < -40 || hy > 300) continue;
      if (!best || t < best.t) best = { wall: w.id, along: a, y: hy, t };
    }
    return best;
  }

  const pointers = new Map();
  let gesture = null;
  function startDrag(g, e) {
    const it = getItem(g.id), def = defOf(it), ray = setRay(e);
    g.started = true;
    checkpoint();
    if (def.kind === 'floor' || def.kind === 'rug') {
      g.planeY = clamp(g.point.y, 0, 200);
      g.ox = it.x - g.point.x; g.oz = it.z - g.point.z;
    } else if (def.kind === 'wall') {
      const h = wallHit(setRay(g.down), it.wall);
      g.oa = h && h.wall === it.wall ? it.along - h.along : 0;
      g.oy = h && h.wall === it.wall && h.y != null ? it.y - h.y : 0;
    } else {
      const cw = M.childWorld(state, it);
      g.planeY = cw ? cw.y + M.sizeOf(it).h * 0.4 : 50;
      const p = planeHit(setRay(g.down), g.planeY), l = p && toLocal(getItem(it.parent), p.x, p.z);
      g.ox = l ? it.lx - l.lx : 0; g.oz = l ? it.lz - l.lz : 0;
    }
    void ray;
  }
  const toLocal = (parent, x, z) => { const t = rad(parent.rot || 0), dx = x - parent.x, dz = z - parent.z; return { lx: dx * Math.cos(t) - dz * Math.sin(t), lz: dx * Math.sin(t) + dz * Math.cos(t) }; };
  function dragTo(g, e) {
    const it = getItem(g.id); if (!it) return;
    const def = defOf(it), ray = setRay(e);
    if (def.kind === 'floor' || def.kind === 'rug') {
      const p = planeHit(ray, g.planeY); if (!p) return;
      const res = M.moveFloorItem(state, it, Math.round((p.x + g.ox) * 2) / 2, Math.round((p.z + g.oz) * 2) / 2);
      it.x = res.x; it.z = res.z; blockedHit = res.blocked ? res.hit : null;
    } else if (def.kind === 'wall') {
      const h = wallHit(ray, it.wall); if (!h) return;
      const same = h.wall === it.wall;
      const res = M.moveWallItem(state, it, h.wall, Math.round(h.along + (same ? g.oa : 0)), h.y == null ? it.y : Math.round(h.y + (same ? g.oy : -M.sizeOf(it).h / 2)));
      it.wall = res.wall; it.along = res.along; it.y = res.y; blockedHit = res.blocked ? res.hit : null;
    } else {
      const parent = getItem(it.parent), p = planeHit(ray, g.planeY); if (!parent || !p) return;
      const l = toLocal(parent, p.x, p.z), want = { lx: l.lx + g.ox, lz: l.lz + g.oz }, c = M.clampChild(parent, { ...it, ...want });
      blockedHit = Math.abs(c.lx - want.lx) > 0.5 || Math.abs(c.lz - want.lz) > 0.5 ? '表面邊緣' : null;
      it.lx = c.lx; it.lz = c.lz;
    }
    placeItem(it); updateSelection(); updatePanelDims(); invalidate();
  }
  function endDrag() {
    blockedHit = null; updateSelection(); save();
  }
  const pinchInfo = () => { const [a, b] = [...pointers.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; };
  function zoomBy(f) {
    if (cam.mode === 'orbit') cam.radius = clamp(cam.radius * f, 220, 1900);
    else if (cam.mode === 'top') cam.top.zoom = clamp(cam.top.zoom / f, 0.6, 5);
    else cam.fp.fov = clamp(cam.fp.fov * f, 32, 98);
    invalidate();
  }
  function panBy(dx, dy) {
    const r = state.room;
    if (cam.mode === 'top') {
      const k = (ortho.right - ortho.left) / innerWidth;
      cam.top.cx = clamp(cam.top.cx - dx * k, -100, r.width + 100); cam.top.cz = clamp(cam.top.cz - dy * k, -100, r.depth + 150);
    } else if (cam.mode === 'orbit') {
      const k = cam.radius * 0.0011, c = Math.cos(cam.theta), s = Math.sin(cam.theta);
      cam.target.x = clamp(cam.target.x - (dx * c + dy * s * 0.8) * k, -50, r.width + 50);
      cam.target.z = clamp(cam.target.z - (-dx * s + dy * c * 0.8) * k, -50, r.depth + 80);
    }
    invalidate();
  }
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      const hit = pick(e);
      if (hit && !interior() && e.button === 0) { select(hit.id); gesture = { type: 'item', id: hit.id, point: hit.point, down: { clientX: e.clientX, clientY: e.clientY }, sx: e.clientX, sy: e.clientY, started: false }; }
      else gesture = { type: 'cam', hit, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, moved: false, pan: e.button === 2 || e.button === 1 || e.shiftKey };
    } else if (pointers.size === 2) {
      if (gesture && gesture.type === 'item' && gesture.started) endDrag();
      gesture = { type: 'pinch', ...pinchInfo() };
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId); if (!p || !gesture) return;
    p.x = e.clientX; p.y = e.clientY;
    if (gesture.type === 'item') {
      if (!gesture.started) { if (Math.hypot(e.clientX - gesture.sx, e.clientY - gesture.sy) < 5) return; startDrag(gesture, e); }
      dragTo(gesture, e);
    } else if (gesture.type === 'cam') {
      const dx = e.clientX - gesture.lx, dy = e.clientY - gesture.ly;
      if (!gesture.moved && Math.hypot(e.clientX - gesture.sx, e.clientY - gesture.sy) < 4) return;
      gesture.moved = true; gesture.lx = e.clientX; gesture.ly = e.clientY;
      if (cam.mode === 'top' || gesture.pan) panBy(dx, dy);
      else if (cam.mode === 'orbit') { cam.theta -= dx * 0.0052; cam.phi = clamp(cam.phi - dy * 0.0045, 0.12, 1.5); }
      else { const k = cam.fp.fov / 68 * 0.0042; cam.fp.yaw += dx * k; cam.fp.pitch = clamp(cam.fp.pitch + dy * k, -1.25, 1.25); }
      invalidate();
    } else if (gesture.type === 'pinch' && pointers.size >= 2) {
      const n = pinchInfo();
      if (gesture.d > 0 && n.d > 0) zoomBy(gesture.d / n.d);
      panBy(n.mx - gesture.mx, n.my - gesture.my);
      Object.assign(gesture, n);
    }
  });
  const pointerEnd = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    const g = gesture;
    if (!g) return;
    if (g.type === 'item') { if (g.started) endDrag(); gesture = null; }
    else if (g.type === 'cam') {
      if (!g.moved && e.type === 'pointerup') {
        if (g.hit) select(g.hit.id);
        else if (interior()) { const p = planeHit(setRay(e), 0); if (p && walkable(p.x, p.z)) { cam.fp.pos.x = p.x; cam.fp.pos.z = p.z; if (cam.mode !== 'inside') cam.fp.pos.y = 150; invalidate(); } }
        else select(null);
      }
      gesture = null;
    } else if (g.type === 'pinch') {
      if (pointers.size === 1) { const [p] = [...pointers.values()]; gesture = { type: 'cam', sx: p.x, sy: p.y, lx: p.x, ly: p.y, moved: true }; }
      else if (pointers.size === 0) gesture = null;
    }
  };
  canvas.addEventListener('pointerup', pointerEnd);
  canvas.addEventListener('pointercancel', pointerEnd);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(Math.exp(clamp(e.deltaY, -120, 120) * 0.0016)); }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, (e) => e.preventDefault());
  function walkable(x, z) {
    const r = state.room, m = 12;
    if (x < m || z < m || x > r.width - r.woodDepth - m || z > r.depth + r.entryDepth - m) return false;
    if (z > r.depth - m && x > r.entryWidth - m) return false;
    const c = M.columnRect(r);
    return !(x < c.x1 + m && z > c.z0 - m && z < c.z1 + m);
  }

  // ---------- 編輯動作 ----------
  let toastTimer = 0;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600); }
  function commit() { syncItems(); renderPanel(); save(); }

  function addItem(type, colors) {
    const def = M.CATALOG[type], it = M.makeItem(type, { colors });
    const r = state.room;
    if (def.kind === 'floor' || def.kind === 'rug') {
      const cx = Math.round((r.width - r.woodDepth) * 0.5), cz = Math.round(r.depth * 0.55);
      let spot = M.findFreeSpot(state, it, cx, cz);
      if (!spot) { it.rot = 90; spot = M.findFreeSpot(state, it, cx, cz); } // 直放不下就試橫放
      if (!spot) return toast(`放不下「${def.name}」：房間裡沒有足夠的空位，請先移動或刪除其他家具`);
      Object.assign(it, spot);
    } else if (def.kind === 'wall') {
      const spot = M.findWallSpot(state, it);
      if (!spot) return toast('牆面上沒有足夠的空位');
      Object.assign(it, spot);
    } else {
      const sel = selectedId && getItem(selectedId);
      const host = [sel, sel && getItem(sel.parent), ...state.items].find(c => c && defOf(c).host === def.on);
      if (!host) return toast(def.on === 'bed' ? '請先加入床，娃娃與枕頭要放在床面上' : '請先加入書桌，桌面配件要放在桌面上');
      it.parent = host.id; Object.assign(it, M.clampChild(host, it));
    }
    checkpoint();
    state.items.push(it);
    selectedId = it.id; blockedHit = null;
    commit(); closeSheets();
    toast(`已加入「${def.name}」`);
  }
  function removeSelected() {
    const it = getItem(selectedId); if (!it) return;
    checkpoint();
    state.items = state.items.filter(i => i.id !== it.id && i.parent !== it.id);
    selectedId = null; commit();
  }
  function duplicateSelected() {
    const it = getItem(selectedId); if (!it) return;
    const before = snap();
    const added = M.duplicateInto(state, it);
    if (!added) return toast('沒有足夠的空位可以複製');
    history.push(before); future.length = 0; updateUndoButtons();
    selectedId = added[0].id; commit();
  }
  function rotateSelected(deg) {
    const it = getItem(selectedId); if (!it) return;
    const def = defOf(it);
    if (def.kind === 'wall') return;
    if (def.kind === 'child') {
      checkpoint(); it.lrot = (((it.lrot + deg) % 360) + 360) % 360;
      Object.assign(it, M.clampChild(getItem(it.parent), it)); return commit();
    }
    const next = { ...it, rot: (((it.rot + deg) % 360) + 360) % 360 };
    let spot = M.checkPlacement(state, next).ok ? { x: it.x, z: it.z } : null;
    if (!spot) { // 旋轉後撞到東西：只在附近 45 cm 內找位置，找不到就不旋轉
      const s = M.findFreeSpot(state, next);
      if (s && Math.hypot(s.x - it.x, s.z - it.z) <= 45) spot = s;
    }
    if (!spot) return toast(`這裡空間不夠旋轉（會碰到${M.checkPlacement(state, next).hit}）`);
    checkpoint(); Object.assign(it, { rot: next.rot, ...spot }); commit();
  }
  function nudge(dx, dz) {
    const it = getItem(selectedId); if (!it) return;
    const def = defOf(it);
    checkpoint();
    if (def.kind === 'floor' || def.kind === 'rug') { const res = M.moveFloorItem(state, it, it.x + dx, it.z + dz); it.x = res.x; it.z = res.z; }
    else if (def.kind === 'wall') { const res = M.moveWallItem(state, it, it.wall, it.along + dx, it.y - dz); Object.assign(it, { along: res.along, y: res.y }); }
    else { it.lx += dx; it.lz += dz; Object.assign(it, M.clampChild(getItem(it.parent), it)); }
    commit();
  }

  // ---------- 選取面板 ----------
  function dimsText(it) {
    const def = defOf(it), s = M.sizeOf(it);
    if (def.kind === 'wall') return `寬 <b>${fmt(s.w)}</b> × 高 <b>${fmt(s.h)}</b> cm・離地 <b>${fmt(it.y)}</b> cm・${M.wallById(state.room, it.wall).name}`;
    const size = `寬 <b>${fmt(s.w)}</b> × 深 <b>${fmt(s.d)}</b> × 高 <b>${fmt(s.h)}</b> cm`;
    if (def.kind === 'child') return size;
    return `${size}<br>位置 x <b>${fmt(it.x)}</b>・z <b>${fmt(it.z)}</b>・方向 <b>${fmt(it.rot)}°</b>`;
  }
  function updatePanelDims() {
    const it = getItem(selectedId), d = document.querySelector('#panel .dims'), w = document.querySelector('#panel .warn');
    if (it && d) d.innerHTML = dimsText(it);
    if (w) w.textContent = blockedHit ? `⚠ 碰到「${blockedHit}」，已停在最後可放的位置` : '';
  }
  function renderPanel() {
    const panel = $('#panel'), it = selectedId && getItem(selectedId);
    panel.textContent = '';
    panel.hidden = !it;
    if (!it) return;
    const def = defOf(it);
    const btn = (text, fn, cls = '') => el('button', { textContent: text, className: cls, onclick: fn });
    panel.append(
      el('button', { className: 'x', textContent: '✕', onclick: () => select(null) }),
      el('h2', { textContent: def.name }),
      el('div', { className: 'note', textContent: def.note + (def.product ? '・固定尺寸' : '') }),
      el('div', { className: 'dims', innerHTML: dimsText(it) }),
      el('div', { className: 'warn' }),
    );
    const row = el('div', { className: 'btnrow' });
    if (def.kind !== 'wall') row.append(btn('↺ 15°', () => rotateSelected(15)), btn('↻ 15°', () => rotateSelected(-15)), btn('轉 90°', () => rotateSelected(90)));
    row.append(btn('複製', duplicateSelected), btn('刪除', removeSelected, 'danger'));
    panel.append(row);
    if (def.flip) panel.append(el('div', { className: 'btnrow' }, btn('⇅ 枕頭與棉被換邊', () => { checkpoint(); it.flip = !it.flip; commit(); })));
    for (const [key, t] of Object.entries(def.toggles || {})) {
      panel.append(el('div', { className: 'toggle' }, t.label, btn(it.on[key] ? '已開啟' : '已關閉', () => { checkpoint(); it.on[key] = !it.on[key]; commit(); }, it.on[key] ? 'on' : '')));
    }
    for (const [key, slot] of Object.entries(def.colors || {})) {
      const sw = el('div', { className: 'swatches' });
      for (const o of slot.options) sw.append(el('button', { className: 'sw' + (it.colors[key] === o.value ? ' on' : ''), title: o.name, ariaLabel: o.name, style: `background:${o.value}`, onclick: () => { if (it.colors[key] === o.value) return; checkpoint(); it.colors[key] = o.value; commit(); } }));
      const cur = slot.options.find(o => o.value === it.colors[key]);
      panel.append(el('div', { className: 'slot', textContent: `${slot.label}：${cur ? cur.name : ''}` }), sw);
    }
    if (def.resizable) {
      for (const [k, label] of [['w', '寬'], ['d', '深'], ['h', '高']]) {
        const [mn, mx] = def.resizable[k];
        const inp = el('input', { type: 'number', min: mn, max: mx, step: 1, value: M.sizeOf(it)[k], inputMode: 'decimal' });
        inp.onchange = () => {
          const v = clamp(Number(inp.value) || mn, mn, mx), next = { ...it, size: { ...M.sizeOf(it), [k]: v } };
          if (!M.checkPlacement(state, next).ok) { inp.value = M.sizeOf(it)[k]; return toast(`放大後會碰到${M.checkPlacement(state, next).hit}`); }
          checkpoint(); it.size = next.size; commit();
        };
        panel.append(el('label', { className: 'row' }, `${label}（${mn}–${mx} cm）`, inp));
      }
    }
    if (def.kind === 'wall') {
      const inp = el('input', { type: 'number', min: 10, max: 220, step: 1, value: it.y, inputMode: 'decimal' });
      inp.onchange = () => { const y = Number(inp.value) || it.y, c = M.checkPlacement(state, { ...it, y }); if (!c.ok) { inp.value = it.y; return toast(`這個高度會碰到${c.hit}`); } checkpoint(); it.y = y; commit(); };
      panel.append(el('label', { className: 'row' }, '離地高度（cm）', inp));
    }
    if (def.host) panel.append(el('div', { className: 'note', textContent: def.host === 'bed' ? '床上配件（娃娃、抱枕）會跟著床一起移動與旋轉。' : '桌面配件會跟著書桌一起移動與旋轉。' }));
    updatePanelDims();
  }

  // ---------- 家具選單 ----------
  const thumbs = new Map();
  let thumbKit = null;
  function thumbnail(type, colors) {
    const key = type + JSON.stringify(colors || {});
    if (thumbs.has(key)) return thumbs.get(key);
    try {
      if (!thumbKit) {
        const r2 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        r2.setSize(240, 180, false); r2.toneMapping = THREE.ACESFilmicToneMapping; r2.outputColorSpace = THREE.SRGBColorSpace;
        const s2 = new THREE.Scene();
        s2.add(new THREE.HemisphereLight('#ffffff', '#b9a78f', 1.5));
        const d = new THREE.DirectionalLight('#fff4e2', 2.6); d.position.set(-1, 2, 1.5); s2.add(d);
        const pm = new THREE.PMREMGenerator(r2), es = new THREE.Scene();
        es.add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: '#cfc6b6', side: THREE.BackSide })));
        s2.environment = pm.fromScene(es, 0.04).texture; pm.dispose();
        thumbKit = { r: r2, s: s2, c: new THREE.PerspectiveCamera(30, 4 / 3, 1, 5000), holder: new THREE.Group() };
        s2.add(thumbKit.holder);
      }
      const { r: r2, s: s2, c, holder } = thumbKit;
      const it = M.makeItem(type, { colors, on: Object.fromEntries(Object.keys(M.CATALOG[type].toggles || {}).map(k => [k, false])) });
      const g = factory.build(it);
      g.traverse(o => { if (o.isLight) o.visible = false; });
      holder.add(g);
      const box = new THREE.Box3().setFromObject(g), ctr = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
      const flat = size.y < 4, dist = Math.max(size.x, size.y, size.z) * (flat ? 2.1 : 2.35) + 20;
      c.position.set(ctr.x + dist * 0.55, ctr.y + dist * (flat ? 0.75 : 0.42), ctr.z + dist * 0.72); c.lookAt(ctr);
      r2.render(s2, c);
      const url = r2.domElement.toDataURL('image/png');
      holder.remove(g); g.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      thumbs.set(key, url);
      return url;
    } catch { return ''; }
  }
  let catTab = 'bed';
  const pendingColors = {};
  function renderCatalog() {
    const tabs = $('#catTabs'), grid = $('#catGrid');
    tabs.textContent = ''; grid.textContent = '';
    for (const [id, name] of M.CATEGORIES) tabs.append(el('button', { textContent: name, className: id === catTab ? 'on' : '', onclick: () => { catTab = id; renderCatalog(); } }));
    for (const [type, def] of Object.entries(M.CATALOG)) {
      if (def.cat !== catTab) continue;
      const colors = pendingColors[type] || (pendingColors[type] = {});
      const img = el('img', { alt: def.name, loading: 'lazy' });
      const refresh = () => { img.src = thumbnail(type, colors); };
      const s = def;
      const card = el('div', { className: 'card' }, img,
        el('div', { className: 'nm', textContent: def.name }),
        el('div', { className: 'sz', textContent: def.kind === 'wall' ? `${s.w} × ${s.h} cm（牆面）` : `${s.w} × ${s.d} × ${s.h} cm${def.resizable ? '・可調整' : ''}` }));
      const slots = Object.entries(def.colors || {});
      if (slots.length) {
        const [key, slot] = slots[0], sw = el('div', { className: 'swatches' });
        for (const o of slot.options) sw.append(el('button', { className: 'sw' + ((colors[key] || slot.def) === o.value ? ' on' : ''), title: o.name, ariaLabel: o.name, style: `background:${o.value}`, onclick: () => { colors[key] = o.value; for (const b of sw.children) b.classList.toggle('on', b.title === o.name); refresh(); } }));
        card.append(sw);
      }
      card.append(el('button', { className: 'add primary', textContent: '加入房間', onclick: () => addItem(type, { ...colors }) }));
      grid.append(card);
      setTimeout(refresh, 0);
    }
  }

  // ---------- 尺寸設定 ----------
  function fillSizeFields() {
    const box = $('#sizeFields');
    box.textContent = '';
    let group = '';
    for (const f of M.ROOM_FIELDS) {
      if (f.group !== group) { group = f.group; box.append(el('div', { className: 'group-title', textContent: group })); }
      const inp = el('input', { type: 'number', min: f.min, max: f.max, step: 0.5, value: state.room[f.key], inputMode: 'decimal' });
      inp.onchange = () => {
        const v = Number(inp.value);
        if (!Number.isFinite(v)) { inp.value = state.room[f.key]; return; }
        const next = M.normalizeRoom({ ...state.room, [f.key]: v });
        if (JSON.stringify(next) === JSON.stringify(state.room)) { inp.value = state.room[f.key]; return toast('這個數值超出可用範圍，已維持原設定'); }
        checkpoint();
        state.room = next;
        const res = M.resolveRoom(state);
        rebuildRoom(); syncItems(); renderPanel(); save(); fillSizeFields();
        const notes = [];
        if (next[f.key] !== v) notes.push(`「${f.label}」已調整為 ${fmt(next[f.key])}（配合其他尺寸）`);
        if (res.moved.length) notes.push(`已移動：${[...new Set(res.moved)].join('、')}`);
        if (res.removed.length) notes.push(`放不下已移除：${[...new Set(res.removed)].join('、')}`);
        if (notes.length) toast(notes.join('；'));
      };
      box.append(el('label', { className: 'row' }, f.label, inp));
    }
  }

  // ---------- 介面事件 ----------
  const sheets = ['#sheetCatalog', '#sheetSize', '#sheetMenu'];
  function closeSheets() { for (const s of sheets) $(s).hidden = true; }
  function openSheet(id) { const was = !$(id).hidden; closeSheets(); $(id).hidden = was; }
  function updateUndoButtons() { $('#btnUndo').disabled = !history.length; $('#btnRedo').disabled = !future.length; }
  for (const b of document.querySelectorAll('[data-close]')) b.onclick = closeSheets;
  for (const b of document.querySelectorAll('#views button')) b.onclick = () => setView(b.dataset.view);
  $('#btnAdd').onclick = () => { openSheet('#sheetCatalog'); if (!$('#sheetCatalog').hidden) renderCatalog(); };
  $('#btnSize').onclick = () => { openSheet('#sheetSize'); fillSizeFields(); };
  $('#btnMenu').onclick = () => openSheet('#sheetMenu');
  $('#btnUndo').onclick = undo; $('#btnRedo').onclick = redo;
  $('#btnNight').onclick = () => { state.ui.night = !state.ui.night; applyLighting(); save(); };
  $('#btnCeil').onclick = () => { state.ui.ceilingOn = !state.ui.ceilingOn; applyLighting(); save(); };
  const doorAngle = $('#doorAngle'), showSwing = $('#showSwing');
  const syncMenu = () => { doorAngle.value = state.ui.doorAngle; $('#doorAngleOut').textContent = state.ui.doorAngle + '°'; showSwing.checked = state.ui.showSwing; };
  doorAngle.oninput = () => { state.ui.doorAngle = Number(doorAngle.value); syncMenu(); applyDoor(); save(); };
  showSwing.onchange = () => { state.ui.showSwing = showSwing.checked; applyDoor(); save(); };
  for (const p of M.PROPOSALS) {
    $('#proposals').append(el('button', { className: 'prop', innerHTML: `<b>${p.name}</b><span>${p.desc}</span>`, onclick: () => {
      checkpoint(); selectedId = null;
      const res = M.applyProposal(state, p.id);
      commit(); closeSheets();
      toast(`已套用「${p.name}」` + (res.removed.length ? `（放不下：${res.removed.join('、')}）` : '') + '，可按復原還原');
    } }));
  }
  $('#btnExport').onclick = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    const a = el('a', { href: url, download: 'bedroom-layout.json' });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  $('#btnImport').onclick = () => $('#fileInput').click();
  $('#fileInput').onchange = async (e) => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) throw new Error('格式不符');
      loadState(raw);
      toast('已匯入配置');
    } catch (err) { toast('匯入失敗：這不是有效的配置檔（' + err.message + '）'); }
  };
  $('#btnReset').onclick = () => { if (confirm('要把房間尺寸與家具都重設為預設配置嗎？（可按復原還原）')) { loadState(null); toast('已重設房間'); } };
  function loadState(raw) {
    checkpoint();
    const next = raw ? M.migrate(raw) : M.defaultState();
    state.room = next.room; state.items = next.items; state.ui = next.ui; selectedId = null;
    rebuildRoom(); syncItems(); renderPanel(); fillSizeFields(); syncMenu(); save(); closeSheets();
  }
  addEventListener('keydown', (e) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (mod && k === 'z') { e.preventDefault(); return e.shiftKey ? redo() : undo(); }
    if (mod && k === 'y') { e.preventDefault(); return redo(); }
    if (mod && k === 'd') { e.preventDefault(); return duplicateSelected(); }
    if (k === 'escape') { closeSheets(); return select(null); }
    if (!selectedId) return;
    const step = e.shiftKey ? 5 : 1;
    if (k === 'arrowleft') { e.preventDefault(); nudge(-step, 0); }
    else if (k === 'arrowright') { e.preventDefault(); nudge(step, 0); }
    else if (k === 'arrowup') { e.preventDefault(); nudge(0, -step); }
    else if (k === 'arrowdown') { e.preventDefault(); nudge(0, step); }
    else if (k === 'r') rotateSelected(e.shiftKey ? -15 : 15);
    else if (k === 'delete' || k === 'backspace') { e.preventDefault(); removeSelected(); }
  });

  // ---------- 啟動 ----------
  rebuildRoom(); syncItems(); syncMenu(); updateUndoButtons(); setView('orbit');
  renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); });
  renderer.domElement.addEventListener('webglcontextrestored', () => { rebuildRoom(); syncItems(); });
  frame();
  // 提供自動化測試與除錯使用
  window.__studio = { get state() { return state; }, M, setView, select, addItem, invalidate, cam, views, undo, redo, loadState,
    screenOf(x, y, z) { updateCamera(); const v = new THREE.Vector3(x, y, z).project(activeCam()); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; } };
}
