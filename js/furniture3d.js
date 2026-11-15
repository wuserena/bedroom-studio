// 家具 3D 模型。每個模型的原點在占地範圍中心的地面（y = 0），正面朝本地 +z。
// 牆面配件的原點在牆面上、物件底邊中心，+z 指向房間。
import * as THREE from '../vendor/three.module.min.js';
import { CATALOG, sizeOf } from './model.js';
import { rugTexture } from './textures.js';

const WOOD_COLORS = new Set(['#d9bd8f', '#8a5a3a']);
const LUX = 1e4; // 場景單位是公分：光強度需乘上 100²

export function createFurnitureFactory(tx) {
  const S = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
  const fabric = (color, o = {}) => S(color, { roughness: 0.96, bumpMap: tx.weave, bumpScale: 1.2, ...o });
  const surf = (color) => WOOD_COLORS.has(color) ? S(color, { map: tx.grain, roughness: 0.5 }) : S(color, { roughness: color === '#c9cdd0' ? 0.3 : 0.5, metalness: color === '#c9cdd0' ? 0.85 : 0 });
  const metal = (color = '#c9cdd0') => color === '#c9cdd0' || color === '#c2c7c9'
    ? S(color, { roughness: 0.22, metalness: 0.95 }) : S(color, { roughness: 0.38, metalness: 0.25 });
  const chrome = () => S('#d5d8da', { roughness: 0.14, metalness: 1 });
  const mirrorMat = () => S('#e6ecee', { roughness: 0.03, metalness: 1, envMapIntensity: 1.5 });
  const glow = (color = '#fff1d6') => S('#fbf6ea', { roughness: 0.6, emissive: color, emissiveIntensity: 0 });

  const add = (g, geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m);
    return m;
  };
  const box = (g, w, h, d, mat, x = 0, y = 0, z = 0) => add(g, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  const cyl = (g, r, h, mat, x = 0, y = 0, z = 0, r2 = r, seg = 24) => add(g, new THREE.CylinderGeometry(r2, r, h, seg), mat, x, y, z);
  const ball = (g, r, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = add(g, new THREE.SphereGeometry(r, 24, 18), mat, x, y, z); m.scale.set(sx, sy, sz); return m; };
  const tube = (g, pts, r, mat, seg = 40) => add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), seg, r, 10), mat);
  // 圓角方塊：底面在 y = 0
  const rboxGeo = (w, h, d, r) => {
    r = Math.min(r, w / 2 - 0.01, d / 2 - 0.01);
    const b = Math.min(r * 0.6, h / 2 - 0.01), s = new THREE.Shape(), x = w / 2 - b, z = d / 2 - b, rr = Math.max(r - b, 0.01);
    s.moveTo(-x + rr, -z); s.lineTo(x - rr, -z); s.quadraticCurveTo(x, -z, x, -z + rr); s.lineTo(x, z - rr); s.quadraticCurveTo(x, z, x - rr, z);
    s.lineTo(-x + rr, z); s.quadraticCurveTo(-x, z, -x, z - rr); s.lineTo(-x, -z + rr); s.quadraticCurveTo(-x, -z, -x + rr, -z);
    const geo = new THREE.ExtrudeGeometry(s, { depth: h - 2 * b, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 3, curveSegments: 6 });
    geo.rotateX(-Math.PI / 2); geo.translate(0, b, 0);
    return geo;
  };
  const rbox = (g, w, h, d, r, mat, x = 0, y = 0, z = 0) => add(g, rboxGeo(w, h, d, r), mat, x, y, z);

  // 蓬鬆枕頭：中央鼓起、四邊收薄
  const pillowGeo = (w, d, h) => {
    const geo = new THREE.BoxGeometry(w, h, d, 20, 6, 16), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), nx = x / (w / 2), nz = z / (d / 2);
      const e = Math.sqrt(Math.max(0, (1 - Math.abs(nx) ** 2.6) * (1 - Math.abs(nz) ** 2.6)));
      const wr = 0.35 * Math.sin(nx * 5.1 + nz * 3.3) * (1 - e);
      p.setXYZ(i, x * (1 - 0.07 * nz * nz), y * (0.14 + 0.86 * e) + wr, z * (1 - 0.07 * nx * nx));
    }
    geo.computeVertexNormals();
    return geo;
  };

  // 蓬鬆棉被：蓋在床墊上並從兩側與床尾垂下
  const duvetGeo = (top, zStart, half = 57, zEnd = 98) => {
    const r = 5, drop = 9, U = half + r * Math.PI / 2 + drop, V = (zEnd - zStart) + r * Math.PI / 2 + drop;
    const nu = 44, nv = 52, geo = new THREE.PlaneGeometry(1, 1, nu, nv), p = geo.attributes.position;
    const fold = (a, flat) => {
      if (a <= flat) return [a, 0];
      const t = a - flat, ph = Math.min(t / r, Math.PI / 2);
      return [flat + r * Math.sin(ph), -r * (1 - Math.cos(ph)) - Math.max(0, t - r * Math.PI / 2)];
    };
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const u = (i / nu * 2 - 1) * U, v = j / nv * V;
      const [px, dyx] = fold(Math.abs(u), half), [pz, dyz] = fold(v, zEnd - zStart);
      const x = Math.sign(u) * px, z = zStart + pz, flat = dyx === 0 && dyz === 0 ? 1 : 0.35;
      const puff = (1.7 * Math.sin(x * 0.15 + 0.6) * Math.sin(z * 0.105) + 0.8 * Math.sin(x * 0.41 + z * 0.29) + 0.5 * Math.sin(z * 0.6 - x * 0.2)) * flat;
      const roll = 3.4 * Math.exp(-((v / 7) ** 2));
      const hem = (dyx + dyz < -11 ? 0.8 * Math.sin(x * 0.5 + z * 0.45) : 0);
      p.setXYZ(j * (nu + 1) + i, x + hem * (dyx < 0 ? Math.sign(u) : 0), top + 3.4 + dyx + dyz + puff + roll, z + hem * (dyz < 0 ? 1 : 0));
    }
    geo.computeVertexNormals();
    return geo;
  };

  const B = {};

  B.nordli = (it) => {
    const g = new THREE.Group(), white = S('#f3f1ec', { roughness: 0.55 }), dark = S('#3b3a38'), groove = S('#a9a69f');
    box(g, 116, 2, 198, dark, 0, 1, 0);
    box(g, 120, 28, 202, white, 0, 16, 0);
    for (const sx of [-1, 1]) for (const z of [-67.2, 0, 67.2]) { // 兩側各三個抽屜
      box(g, 1, 23, 65.4, white, sx * 60.4, 15.5, z);
      box(g, 0.5, 1.3, 30, groove, sx * 60.95, 25.2, z);
    }
    rbox(g, 118, 18, 200, 5, fabric('#f4f1ea', { bumpMap: tx.weaveFine, bumpScale: 0.5 }), 0, 30, 0);
    const bedding = new THREE.Group();
    const pillow = add(bedding, pillowGeo(64, 42, 16), fabric(it.colors.pillow, { bumpMap: tx.weaveFine, bumpScale: 0.5 }), 0, 54.5, -77);
    pillow.rotation.y = 0.04;
    const dv = add(bedding, duvetGeo(48, -46), fabric(it.colors.duvet, { bumpMap: tx.weaveFine, bumpScale: 0.6, side: THREE.DoubleSide }));
    dv.material.shadowSide = THREE.DoubleSide;
    if (it.flip) bedding.rotation.y = Math.PI;
    g.add(bedding);
    return g;
  };

  const desk = (it) => {
    const { w } = sizeOf(it), g = new THREE.Group(), top = surf(it.colors.top), fr = it.colors.frame === '#c9cdd0' ? metal() : S(it.colors.frame, { roughness: 0.45 });
    rbox(g, w, 2.6, 70, 3, top, 0, 72.4, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, 2.6, 72.4, fr, sx * (w / 2 - 6), 36.2, sz * 29);
    for (const sz of [-1, 1]) box(g, w - 14, 5, 2.4, fr, 0, 69.6, sz * 29);
    for (const sx of [-1, 1]) box(g, 2.4, 5, 56, fr, sx * (w / 2 - 6), 69.6, 0);
    // 三層抽屜櫃
    const px = w / 2 - 30;
    box(g, 40, 55, 58, fr, px, 31.5, -1);
    for (const [i, y] of [13, 31.5, 50].entries()) {
      box(g, 38.6, 17.4, 0.9, fr, px, y, 28.4);
      box(g, 14, 1, 1.4, i === 0 && it.colors.frame !== '#262626' ? chrome() : chrome(), px, y + 5.5, 29.4);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, 1.6, 4, S('#55585a'), px + sx * 16, 2, -1 + sz * 25);
    return g;
  };
  B.desk120 = desk; B.desk110 = desk;

  B.deskChair = (it) => {
    const g = new THREE.Group(), ch = chrome(), seat = surf(it.colors.seat);
    for (const sx of [-1, 1]) {
      cyl(g, 1.1, 44, ch, sx * 19, 22, 19);
      tube(g, [[sx * 19, 0, -19], [sx * 19, 44, -20], [sx * 19, 62, -22.5], [sx * 18.5, 81, -24.5]], 1.1, ch, 16);
      tube(g, [[sx * 19, 42.5, 19], [sx * 19, 42.5, -20]], 1.0, ch, 2);
    }
    tube(g, [[-19, 16, -19.4], [19, 16, -19.4]], 0.9, ch, 2);
    tube(g, [[-19, 16, 19], [19, 16, 19]], 0.9, ch, 2);
    rbox(g, 43, 3.2, 42, 7, seat, 0, 43.6, 0);
    const back = rbox(g, 41, 17, 2.6, 1.2, seat, 0, 63, -23.4);
    back.rotation.x = -0.11;
    return g;
  };

  B.dyvlinge = (it) => {
    const g = new THREE.Group(), fab = fabric(it.colors.body, { bumpScale: 0.9 }), ch = S('#2c2c2c', { roughness: 0.35, metalness: 0.6 });
    cyl(g, 27, 2, ch, 0, 1, 2, 26);
    cyl(g, 3.2, 12, ch, 0, 8, 2);
    const shell = new THREE.Group(); shell.position.set(0, 0, 2); g.add(shell);
    cyl(shell, 17, 12, fab, 0, 20, 0, 28.5, 36);              // 椅殼底
    add(shell, rboxGeo(50, 13, 50, 22, 1), fab, 0, 25.5, 3);   // 圓座墊
    const n = 15;
    for (let i = 0; i < n; i++) {                               // 環繞椅背的直條絎縫
      const t = i / (n - 1) * 2 - 1, a = t * 2.15, top = 67 - 19 * t * t, len = top - 26 - 9;
      const m = add(shell, new THREE.CapsuleGeometry(5.1, Math.max(len, 2), 6, 12), fab, -Math.sin(a) * 26.5, 26 + 4.5 + Math.max(len, 2) / 2, -Math.cos(a) * 28.5 - 2);
      m.rotation.x = -0.14 * Math.cos(a); m.rotation.z = -0.12 * Math.sin(a);
    }
    return g;
  };

  B.beanbag = (it) => {
    const g = new THREE.Group();
    const prof = [[0.1, 0], [26, 0], [40, 3.5], [45.5, 13], [45, 26], [40, 40], [32, 53], [22, 65], [11, 74], [0.1, 77.5]];
    const curve = new THREE.SplineCurve(prof.map(p => new THREE.Vector2(...p)));
    const geo = new THREE.LatheGeometry(curve.getPoints(40), 64), p = geo.attributes.position;
    const sm = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const th = Math.atan2(z, x), hy = y / 77.5;
      const wr = 1 + (0.03 * Math.sin(7 * th + y * 0.21) + 0.018 * Math.sin(13 * th - y * 0.33) + 0.012 * Math.sin(23 * th + y * 0.5)) * sm(0, 0.15, hy);
      x *= wr; z *= wr;
      const seat = sm(-12, 34, z) * sm(0.28, 0.75, hy);          // 坐下後前方凹陷
      y -= 26 * seat;
      z -= 15 * hy * hy;                                           // 靠背向後傾
      z += 6 * seat;
      p.setXYZ(i, x, Math.max(y, 0), z + 3);
    }
    geo.computeVertexNormals();
    add(g, geo, fabric(it.colors.body, { bumpScale: 1.6 }));
    return g;
  };

  B.shelf = (it) => {
    const { w, d, h } = sizeOf(it), g = new THREE.Group(), m = surf(it.colors.body), t = 1.8;
    box(g, w - 2, 4, d - 3, m, 0, 2, 0);
    for (const sx of [-1, 1]) box(g, t, h - 4, d, m, sx * (w / 2 - t / 2), 4 + (h - 4) / 2, 0);
    box(g, w, t, d, m, 0, h - t / 2, 0); box(g, w, t, d, m, 0, 4 + t / 2, 0);
    box(g, w - 2 * t, h - 4, 0.6, m, 0, 4 + (h - 4) / 2, -d / 2 + 0.6);
    const rows = Math.max(1, Math.round((h - 4) / 38)), cols = Math.max(1, Math.round(w / 40));
    const ch = (h - 4 - t) / rows, cw = (w - t) / cols;
    for (let i = 1; i < rows; i++) box(g, w - 2 * t, t, d - 1, m, 0, 4 + ch * i + t / 2, 0.5);
    for (let i = 1; i < cols; i++) box(g, t, h - 4 - 2 * t, d - 1, m, -w / 2 + t / 2 + cw * i, 4 + (h - 4) / 2, 0.5);
    const bins = ['#e9e1d0', '#c3c4c2', '#d9743c', '#7f9bb8'], books = ['#e6dfd0', '#d9743c', '#8b8e92', '#6f93bd', '#f1efe9'];
    for (let rI = 0; rI < rows; rI++) for (let c = 0; c < cols; c++) {
      const cx = -w / 2 + t / 2 + cw * (c + 0.5), y0 = 4 + t + ch * rI;
      if (rI === 0) rbox(g, cw - 6, Math.min(ch - 8, 26), d - 5, 2, fabric(bins[c % bins.length]), cx, y0, 1);
      else if ((rI + c) % 2 === 0) for (let b = 0; b < 5; b++) box(g, 2.6 + (b % 2), 20 + (b * 7 % 6), d - 10, S(books[(b + c) % books.length], { roughness: 0.8 }), cx - cw / 2 + 5 + b * 3.6, y0 + 10 + (b * 7 % 6) / 2, 0);
      else { ball(g, 9, fabric('#e9e1d0'), cx, y0 + 9, 0, 1.1, 1, 0.9); tube(g, [[cx - 6, y0 + 15, 0], [cx, y0 + 24, 0], [cx + 6, y0 + 15, 0]], 0.7, S('#b98d5a'), 12); }
    }
    return g;
  };

  B.trolley = (it) => {
    const g = new THREE.Group(), m = metal(it.colors.body), w = 35, d = 45;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      cyl(g, 0.9, 70, m, sx * (w / 2 - 1.5), 41, sz * (d / 2 - 1.5));
      ball(g, 2.4, S('#3a3b3c'), sx * (w / 2 - 1.5), 2.4, sz * (d / 2 - 1.5));
    }
    for (const y of [10, 38, 66]) {
      box(g, w - 3, 0.6, d - 3, m, 0, y, 0);
      for (const sz of [-1, 1]) box(g, w - 3, 7, 0.5, m, 0, y + 3.5, sz * (d / 2 - 1.5));
      for (const sx of [-1, 1]) box(g, 0.5, 7, d - 3, m, sx * (w / 2 - 1.5), y + 3.5, 0);
    }
    tube(g, [[-w / 2 + 1.5, 74, -d / 2 + 1.5], [-w / 2 + 1.5, 78, -d / 2 - 1], [w / 2 - 1.5, 78, -d / 2 - 1], [w / 2 - 1.5, 74, -d / 2 + 1.5]], 0.8, m, 20);
    const bottles = [['#f1e6d6', 3, 14, -8, -10], ['#d9743c', 2.2, 10, -1, -12], ['#9fb3c8', 2.6, 12, 7, -9], ['#f1efe9', 3.4, 8, -6, 4], ['#e6c9b8', 2, 15, 4, 6], ['#c9cdd0', 2.8, 9, 9, 12]];
    for (const [c, r, h, x, z] of bottles) { cyl(g, r, h, S(c, { roughness: 0.35 }), x, 66.3 + h / 2, z); cyl(g, r * 0.6, 2, S('#d5d8da', { metalness: 0.9, roughness: 0.25 }), x, 66.3 + h + 1, z); }
    rbox(g, 24, 12, 30, 3, fabric('#e9e1d0'), 0, 38.3, 0);
    for (let b = 0; b < 4; b++) box(g, 22, 2.2, 30, S(['#f1efe9', '#d9743c', '#8b8e92', '#e6dfd0'][b], { roughness: 0.8 }), 0, 11.4 + b * 2.3, (b % 2) * 2 - 1);
    return g;
  };

  B.sideTable = (it) => {
    const g = new THREE.Group(), m = metal(it.colors.body);
    cyl(g, 20, 1.6, m, 0, 49.2, 0, 20, 40); cyl(g, 20.4, 3, m, 0, 48.6, 0, 20.4, 40).scale.set(1, 0.3, 1);
    cyl(g, 1.7, 47, m, 0, 24.5, 0); cyl(g, 15, 1.4, m, 0, 0.7, 0, 14, 40);
    cyl(g, 4, 9, S('#f1efe9', { roughness: 0.4 }), 6, 54.5, -4); box(g, 14, 2, 19, S('#d9743c', { roughness: 0.8 }), -5, 51, 3);
    return g;
  };

  // Rareraw POLES：兩支落地圓管、頂端彎向牆面並以圓墊靠牆
  B.poles = (it) => {
    const g = new THREE.Group(), body = metal(it.colors.body), zf = 11, zw = -17, pr = 1.4, px = 28 - pr;
    for (const sx of [-1, 1]) {
      tube(g, [[sx * px, 0, zf], [sx * px, 90, zf], [sx * px, 176, zf], [sx * px, 183, zf - 2], [sx * px, 185.6, zf - 8], [sx * px, 185.6, zw + 3], [sx * px, 185.6, zw + 1.5]], pr, body, 80);
      const pad = cyl(g, 4.5, 1.5, S('#2b2b2b', { roughness: 0.8 }), sx * px, 185.6, zw + 0.75);
      pad.rotation.x = Math.PI / 2;
      cyl(g, 1.9, 1.2, S('#2b2b2b'), sx * px, 0.6, zf);
    }
    box(g, 46.5, 136, 1.2, body, 0, 31 + 68, zf - 0.2);                     // 鏡背板
    add(g, new THREE.PlaneGeometry(45.7, 135.2), mirrorMat(), 0, 31 + 68, zf + 0.45); // 鏡面
    box(g, 46.5, 18, 1.2, body, 0, 22, zf - 0.2);                           // 下方品牌面板
    box(g, 9, 2.2, 0.3, S('#f4f2ec', { roughness: 0.5 }), 14.5, 16.5, zf + 0.5);
    for (const y of [31, 13, 167]) tube(g, [[-px, y, zf], [px, y, zf]], 0.7, body, 2);
    // 鏡後收納層板
    for (const [y, depth] of [[13, 26], [72, 16], [122, 16]]) {
      box(g, 46.5, 1, depth, body, 0, y, zf - 0.8 - depth / 2);
      box(g, 46.5, 3.5, 0.8, body, 0, y + 1.7, zf - 0.8 - depth + 0.4);
      for (const sx of [-1, 1]) box(g, 0.8, 3.5, depth, body, sx * 22.85, y + 1.7, zf - 0.8 - depth / 2);
    }
    rbox(g, 20, 14, 18, 3, fabric('#e9e1d0'), -9, 13.5, zf - 13);
    return g;
  };

  // IKEA ISJAKT：上照燈 + 可彎閱讀燈
  B.isjakt = (it) => {
    const g = new THREE.Group(), m = S('#d2d4d2', { roughness: 0.3, metalness: 0.85 });
    cyl(g, 12, 2, m, 0, 1, 0, 11.6, 40);
    cyl(g, 1.25, 172, m, 0, 88, 0, 1.25, 16);
    const bowlGeo = new THREE.LatheGeometry([[1.3, 0], [5, 0.6], [11, 3.4], [14, 7.2], [13.3, 7.4], [10.4, 4], [4.8, 1.5], [1.3, 1.2]].map(p => new THREE.Vector2(...p)), 40);
    const bowl = add(g, bowlGeo, m, 0, 173, 0); bowl.material = m.clone(); bowl.material.side = THREE.DoubleSide;
    const upGlow = glow(); cyl(g, 10.2, 0.6, upGlow, 0, 178.4, 0, 12.6, 32);
    // 閱讀燈臂（朝 +z 伸出）
    cyl(g, 1.9, 6, m, 0, 118, 0);
    tube(g, [[0, 118, 1.5], [0, 127, 9], [0, 138, 22], [0, 141, 35], [0, 136, 44]], 0.75, m, 40);
    const head = cyl(g, 4.2, 9, m, 0, 132.5, 46.5, 2.2, 24); head.rotation.x = 0.5;
    const readGlow = glow(); const lens = cyl(g, 3.6, 0.5, readGlow, 0, 128.6, 48.7, 3.6, 20); lens.rotation.x = 0.5;
    const up = new THREE.SpotLight('#ffe6c2', 0, 600, 1.25, 1, 2); up.position.set(0, 176, 0);
    up.target.position.set(0, 400, 0); g.add(up, up.target);
    const rd = new THREE.SpotLight('#ffe9cc', 0, 400, 0.75, 0.7, 2); rd.position.set(0, 128, 49);
    rd.target.position.set(0, 0, 76); g.add(rd, rd.target);
    g.userData.lamps = [{ key: 'up', light: up, power: 9 * LUX, glow: upGlow }, { key: 'read', light: rd, power: 3.2 * LUX, glow: readGlow }];
    return g;
  };

  B.globe = () => {
    const g = new THREE.Group(), gl = glow('#ffd9a6');
    cyl(g, 6, 2.4, S('#d9bd8f', { map: tx.grain }), 0, 1.2, 0);
    ball(g, 14, gl, 0, 15.6, 0);
    const l = new THREE.PointLight('#ffd3a0', 0, 500, 2); l.position.set(0, 16, 0); g.add(l);
    g.userData.lamps = [{ key: 'on', light: l, power: 1.6 * LUX, glow: gl }];
    return g;
  };

  B.deskLamp = (it) => {
    const g = new THREE.Group(), m = metal(it.colors.body), gl = glow();
    cyl(g, 7.5, 1.4, m, 0, 0.7, 0, 7.2, 32);
    tube(g, [[0, 1, 0], [0, 22, -1], [0, 33, 3], [0, 36, 11]], 0.7, m, 30);
    const shade = add(g, new THREE.CylinderGeometry(3, 7.6, 8, 28, 1, true), m.clone(), 0, 33.5, 13); shade.material.side = THREE.DoubleSide; shade.rotation.x = 0.35;
    const bulb = ball(g, 2.6, gl, 0, 32.4, 13.4);
    const l = new THREE.SpotLight('#ffe6c4', 0, 300, 0.95, 0.8, 2); l.position.set(0, 31, 13.5); l.target.position.set(0, 0, 24); g.add(l, l.target);
    g.userData.lamps = [{ key: 'on', light: l, power: 1.1 * LUX, glow: gl }];
    void bulb;
    return g;
  };

  B.rug = (it) => {
    const { w, d } = sizeOf(it), g = new THREE.Group();
    const m = add(g, rboxGeo(w, 1.2, d, 3), S(it.colors.body, { roughness: 1 }));
    m.castShadow = false;
    const top = add(g, new THREE.PlaneGeometry(w - 2.4, d - 2.4), S('#ffffff', { map: rugTexture(it.colors.body), roughness: 1, bumpMap: tx.weave, bumpScale: 1 }), 0, 1.24, 0);
    top.rotation.x = -Math.PI / 2; top.castShadow = false;
    return g;
  };

  B.pegboard = () => {
    const g = new THREE.Group(), white = S('#f3f1ea', { roughness: 0.6 });
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) cyl(g, 1.2, 2.4, white, sx * 22, 28 + sy * 22, 1.2).rotation.x = Math.PI / 2;
    const board = box(g, 56, 56, 1, S('#ffffff', { map: tx.peg, roughness: 0.6 }), 0, 28, 2.9);
    void board;
    box(g, 22, 1, 8, white, -12, 40, 7.4); box(g, 22, 3, 0.6, white, -12, 41.5, 11.2);
    cyl(g, 3.2, 8, S('#d9743c', { roughness: 0.4 }), -17, 44.5, 7.5); ball(g, 4, S('#e9e1d0', { roughness: 0.9 }), -8, 44.4, 7.4, 1, 0.9, 0.8);
    cyl(g, 4.2, 9, white, 15, 16, 8); for (const [c, x] of [['#6f93bd', 14], ['#d9743c', 16.5], ['#55585a', 15]]) cyl(g, 0.45, 13, S(c), x, 22, 8 + (x - 15) * 0.5).rotation.z = (x - 15) * 0.08;
    for (const x of [8, 18]) tube(g, [[x, 44, 3.4], [x, 44, 7], [x, 46, 7.6]], 0.35, S('#c9cdd0', { metalness: 0.9, roughness: 0.3 }), 8);
    add(g, new THREE.TorusGeometry(3.4, 0.35, 8, 24), S('#c9cdd0', { metalness: 0.9, roughness: 0.3 }), 8, 40.4, 7);
    box(g, 14, 18, 0.5, S('#f6efe2', { roughness: 0.9 }), -14, 14, 3.7);
    return g;
  };

  B.wallMirror = () => {
    const g = new THREE.Group();
    add(g, rboxGeo(40, 2.4, 110, 5), S('#c9cdd0', { metalness: 0.9, roughness: 0.25 })).rotation.x = Math.PI / 2;
    g.children[0].position.set(0, 55, 0);
    add(g, new THREE.PlaneGeometry(37, 107), mirrorMat(), 0, 55, 2.46);
    return g;
  };

  // IKEA GOSIG GOLDEN：趴著的黃金獵犬娃娃
  B.gosig = () => {
    const g = new THREE.Group();
    const fur = S('#d9a45a', { roughness: 1, bumpMap: tx.fur, bumpScale: 2.4 });
    const light = S('#ecc88f', { roughness: 1, bumpMap: tx.fur, bumpScale: 2.2 });
    const ear = S('#c38b42', { roughness: 1, bumpMap: tx.fur, bumpScale: 2.6 });
    const black = S('#1d1a18', { roughness: 0.35 });
    ball(g, 1, fur, 0, 10.5, -5, 12.5, 10.5, 22);            // 身體
    ball(g, 1, light, 0, 12.5, 12, 9.4, 10, 9.5);            // 胸口
    ball(g, 1, fur, 0, 20.5, 21, 9.3, 8.9, 9.8);             // 頭
    ball(g, 1, light, 0, 17.6, 29.6, 5, 4.3, 6.2);           // 口鼻
    ball(g, 1.75, black, 0, 19.4, 35.2, 1.15, 0.9, 0.9);
    for (const sx of [-1, 1]) {
      ball(g, 1.15, black, sx * 3.7, 23.6, 28.6);
      const e = ball(g, 1, ear, sx * 9, 18.6, 19.5, 2.4, 7.6, 5.2); e.rotation.z = sx * 0.3;
      const leg = add(g, new THREE.CapsuleGeometry(3.6, 13, 6, 12), fur, sx * 7.6, 3.7, 22.5); leg.rotation.x = Math.PI / 2;
      ball(g, 1, light, sx * 7.6, 3.5, 31, 4, 3.5, 4.4);
      ball(g, 1, fur, sx * 11, 5.6, -15, 5.6, 5.6, 10);
      ball(g, 1, light, sx * 13, 2.9, -5.5, 3.3, 2.9, 5.2);
    }
    tube(g, [[0, 9, -25], [3, 6.5, -30], [8, 4.2, -33], [13, 3.4, -32.5]], 2.6, fur, 16);
    ball(g, 2.7, fur, 13, 3.4, -32.5);
    return g;
  };

  B.cushion = (it) => { const g = new THREE.Group(); add(g, pillowGeo(45, 45, 15), fabric(it.colors.body, { bumpScale: 0.9 }), 0, 6.5, 0); return g; };

  B.organizer = () => {
    const g = new THREE.Group(), w = S('#f4f2ec', { roughness: 0.35 });
    box(g, 28, 0.8, 16, w, 0, 0.4, 0);
    for (const sz of [-1, 1]) box(g, 28, 6, 0.6, w, 0, 3, sz * 7.7);
    for (const x of [-13.7, -4, 6, 13.7]) box(g, 0.6, 6, 16, w, x, 3, 0);
    const items = [['#f1e6d6', 2.6, 15, -9, -2], ['#e9b9a0', 2, 11, -9, 4.5], ['#d9743c', 1.7, 9, 1, -3.5], ['#9fb3c8', 2.3, 12.5, 1, 3], ['#f1efe9', 2.8, 7, 10, -2.5], ['#c9cdd0', 1.2, 10, 10, 4.5]];
    for (const [c, r, h, x, z] of items) { cyl(g, r, h, S(c, { roughness: 0.3 }), x, 0.8 + h / 2, z, r, 16); cyl(g, r * 0.62, 1.8, S('#d5d8da', { metalness: 0.9, roughness: 0.25 }), x, 0.8 + h + 0.9, z, r * 0.62, 12); }
    return g;
  };
  B.docTray = () => {
    const g = new THREE.Group(), m = S('#c9cdd0', { metalness: 0.85, roughness: 0.3 });
    for (const y of [0.4, 6.4]) {
      box(g, 26, 0.6, 34, m, 0, y, 0); box(g, 26, 3.4, 0.6, m, 0, y + 1.7, -16.7);
      for (const sx of [-1, 1]) box(g, 0.6, 3.4, 34, m, sx * 12.7, y + 1.7, 0);
      box(g, 22, 1.4, 30, S('#f7f4ec', { roughness: 0.9 }), 0, y + 1, 0.5);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(g, 0.5, 6, m, sx * 12.4, 3.4, sz * 15, 0.5, 8);
    box(g, 20, 0.5, 28, S('#d9743c', { roughness: 0.8 }), 0.5, 8.5, 1).rotation.y = 0.06;
    return g;
  };
  B.vanity = () => {
    const g = new THREE.Group(), m = S('#c9cdd0', { metalness: 0.9, roughness: 0.25 });
    cyl(g, 6, 1.2, m, 0, 0.6, 0, 5.6, 28); cyl(g, 0.6, 12, m, 0, 7, 0, 0.6, 10);
    const ring = add(g, new THREE.TorusGeometry(9.3, 0.7, 10, 40), m, 0, 21.5, 0); ring.rotation.x = -0.12;
    const face = add(g, new THREE.CircleGeometry(9.2, 40), mirrorMat(), 0, 21.5, 0.1); face.rotation.x = -0.12;
    const backing = add(g, new THREE.CircleGeometry(9.2, 40), m, 0, 21.5, -0.1); backing.rotation.x = -0.12; backing.rotation.y = Math.PI;
    return g;
  };

  function build(item) {
    const g = (B[item.type] || (() => new THREE.Group()))(item);
    g.userData.itemId = item.id;
    g.traverse(o => { o.userData.itemId = item.id; });
    applyLamps(g, item);
    return g;
  }
  function applyLamps(g, item) {
    for (const l of g.userData.lamps || []) {
      const on = !!(item.on && item.on[l.key]);
      l.light.intensity = on ? l.power : 0;
      l.light.visible = on;
      if (l.glow) l.glow.emissiveIntensity = on ? 2.2 : 0;
    }
  }
  return { build, applyLamps };
}

export const modelSignature = (it) => JSON.stringify([it.type, it.colors, it.flip, it.size]);
export { CATALOG };
