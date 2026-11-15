// 由房間參數建立 3D 房間：地板、牆、窗、門、柱子、天花板、固定木作、冷氣、頂燈。
import * as THREE from '../vendor/three.module.min.js';
import { floorPolygon, doorGeometry, columnRect } from './model.js';
import { boxUVcm } from './textures.js';

const T = 12; // 牆厚
export const DOOR_H = 205;

export function roomMaterials(tx) {
  const S = (o) => new THREE.MeshStandardMaterial(o);
  return {
    wall: S({ color: '#f3ecdd', map: tx.wall, roughness: 0.93 }),
    ceiling: S({ color: '#f6f1e6', roughness: 0.95 }),
    floor: S({ color: '#ffffff', map: tx.tile, roughness: 0.16, metalness: 0.0, envMapIntensity: 1.1 }),
    base: S({ color: '#4c2119', roughness: 0.45 }),
    wood: S({ color: '#ffffff', map: tx.woodCm, roughness: 0.5 }),
    woodDark: S({ color: '#b97a3c', map: tx.woodCm, roughness: 0.55 }),
    frame: S({ color: '#2a2b2d', roughness: 0.45, metalness: 0.35 }),
    glass: S({ color: '#cfe4ee', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false }),
    door: S({ color: '#e7e1d1', roughness: 0.6 }),
    metal: S({ color: '#c9ccce', roughness: 0.3, metalness: 0.9 }),
    white: S({ color: '#eeece6', roughness: 0.55 }),
    grille: S({ color: '#8f9294', roughness: 0.5, metalness: 0.4 }),
    fixture: S({ color: '#fbf8f0', roughness: 0.5, emissive: '#ffe9c4', emissiveIntensity: 0 }),
    ghost: new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
  };
}

export function buildRoom(r, mats, quality) {
  const root = new THREE.Group();
  const H = r.ceilHigh, W = r.width, D = r.depth, zd = D + r.entryDepth, xw = W - r.woodDepth;
  const groups = {};
  for (const k of ['window', 'left', 'right', 'back', 'ceiling', 'fixed']) { groups[k] = new THREE.Group(); groups[k].name = k; root.add(groups[k]); }

  // 以範圍建立方塊
  const bx = (g, x0, x1, y0, y1, z0, z1, mat, opt = {}) => {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    if (w <= 0.001 || h <= 0.001 || d <= 0.001) return null;
    const geo = new THREE.BoxGeometry(w, h, d);
    if (mat.map && mat.map.repeat.x < 0.5) boxUVcm(geo, w, h, d);
    const m = new THREE.Mesh(geo, mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.castShadow = opt.cast !== false; m.receiveShadow = true;
    g.add(m);
    return m;
  };

  // 地板
  {
    const shape = new THREE.Shape(floorPolygon(r).map(([x, z]) => new THREE.Vector2(x, z)));
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(geo, mats.floor);
    m.material.side = THREE.DoubleSide;
    m.receiveShadow = true; m.name = 'floor';
    groups.fixed.add(m);
    bx(groups.fixed, -T, W + T, -6, -0.3, -T, zd + T, mats.base, { cast: false });
  }

  // 大窗牆（z = 0）
  {
    const g = groups.window, a = r.winX, b = r.winX + r.winW, s = r.winSill, t = r.winSill + r.winH;
    bx(g, -T, a, 0, H, -T, 0, mats.wall); bx(g, b, W + T, 0, H, -T, 0, mats.wall);
    bx(g, a, b, 0, s, -T, 0, mats.wall); bx(g, a, b, t, H, -T, 0, mats.wall);
    bx(g, 0, xw, 0, 8, 0, 1.2, mats.base, { cast: false });
    const win = windowUnit(r.winW, r.winH, mats);
    win.position.set((a + b) / 2, s + r.winH / 2, -T / 2);
    g.add(win);
    bx(g, a - 4, b + 4, s - 3, s, -1, 9, mats.wood); // 木窗台
  }
  // 左牆（x = 0）
  {
    const g = groups.left, c = columnRect(r);
    bx(g, -T, 0, 0, H, -T, zd + T, mats.wall);
    bx(g, 0, 1.2, 0, 8, 0, c.z0, mats.base, { cast: false });
    bx(g, 0, 1.2, 0, 8, c.z1, zd, mats.base, { cast: false });
  }
  // 右牆（x = W，小窗）
  {
    const g = groups.right, a = r.sWinZ, b = r.sWinZ + r.sWinW, s = r.sWinSill, t = s + r.sWinH;
    bx(g, W, W + T, 0, H, 0, a, mats.wall); bx(g, W, W + T, 0, H, b, D + T, mats.wall);
    bx(g, W, W + T, 0, s, a, b, mats.wall); bx(g, W, W + T, t, H, a, b, mats.wall);
    const win = windowUnit(r.sWinW, r.sWinH, mats);
    win.rotation.y = -Math.PI / 2;
    win.position.set(W + T / 2, s + r.sWinH / 2, (a + b) / 2);
    g.add(win);
    // 小窗周圍木作
    const f = groups.fixed, x0 = W - 2.2;
    bx(f, x0, W, s - 7, s, a - 7, b + 7, mats.wood); bx(f, x0, W, t, t + 7, a - 7, b + 7, mats.wood);
    bx(f, x0, W, s, t, a - 7, a, mats.wood); bx(f, x0, W, s, t, b, b + 7, mats.wood);
    bx(f, W - 9, W, s - 2.5, s, a - 2, b + 2, mats.wood);
  }
  // 門口牆（z = D）、入口凸出區側牆與門牆
  {
    const g = groups.back, ew = r.entryWidth, dw = r.doorWidth;
    bx(g, ew, W + T, 0, H, D, D + T, mats.wall);
    bx(g, ew, ew + T, 0, H, D + T, zd + T, mats.wall);
    bx(g, -T, 0, 0, H, zd, zd + T, mats.wall);
    bx(g, dw, ew + T, 0, H, zd, zd + T, mats.wall);
    bx(g, 0, dw, DOOR_H, H, zd, zd + T, mats.wall);
    bx(g, ew, xw, 0, 8, D - 1.2, D, mats.base, { cast: false });
    if (r.entryDepth > 1.5) bx(g, ew - 1.2, ew, 0, 8, D, zd, mats.base, { cast: false });
    // 門框
    bx(g, 0, 4, 0, DOOR_H + 4, zd - 1, zd + T + 1, mats.door, { cast: false });
    bx(g, dw - 4, dw, 0, DOOR_H + 4, zd - 1, zd + T + 1, mats.door, { cast: false });
    bx(g, 0, dw, DOOR_H, DOOR_H + 4, zd - 1, zd + T + 1, mats.door, { cast: false });
  }
  // 柱子（永遠顯示）
  {
    const c = columnRect(r), top = c.z0 < r.highDepth ? H : r.ceilLow;
    const m = bx(groups.fixed, c.x0, c.x1, 0, top, c.z0, c.z1, mats.wall);
    m.name = 'column';
    bx(groups.fixed, c.x1, c.x1 + 1.2, 0, 8, c.z0 - 1.2, c.z1 + 1.2, mats.base, { cast: false });
    bx(groups.fixed, c.x0, c.x1, 0, 8, c.z0 - 1.2, c.z0, mats.base, { cast: false });
    bx(groups.fixed, c.x0, c.x1, 0, 8, c.z1, c.z1 + 1.2, mats.base, { cast: false });
  }
  // 天花板：靠窗高、靠門低
  {
    const g = groups.ceiling;
    bx(g, -T, W + T, H, H + 8, -T, r.highDepth, mats.ceiling);
    bx(g, -T, W + T, r.ceilLow, H + 8, r.highDepth, D + T, mats.ceiling);
    bx(g, -T, r.entryWidth + T, r.ceilLow, H + 8, D + T, zd + T, mats.ceiling);
  }

  // 門扇：鉸鏈在 (0, zd)，朝大窗方向往房內開
  const doorPivot = new THREE.Group();
  {
    const dw = r.doorWidth;
    doorPivot.position.set(0, 0, zd);
    const leaf = new THREE.Group();
    bx(leaf, 0.6, dw - 0.6, 0.8, DOOR_H - 0.6, -4.2, -0.4, mats.door);
    const mould = (y0, y1) => { // 簡單線板
      const x0 = 9, x1 = dw - 9, z0 = -4.9, z1 = -4.2, t = 1.6;
      for (const [zz0, zz1] of [[z0, z1], [-0.4, 0.3]]) {
        bx(leaf, x0, x1, y0, y0 + t, zz0, zz1, mats.door, { cast: false }); bx(leaf, x0, x1, y1 - t, y1, zz0, zz1, mats.door, { cast: false });
        bx(leaf, x0, x0 + t, y0, y1, zz0, zz1, mats.door, { cast: false }); bx(leaf, x1 - t, x1, y0, y1, zz0, zz1, mats.door, { cast: false });
      }
    };
    mould(14, 84); mould(98, 190);
    for (const z of [-7, 2.5]) {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 11, 12), mats.metal);
      h.rotation.z = Math.PI / 2; h.position.set(dw - 10.5, 100, z); leaf.add(h);
    }
    bx(leaf, dw - 7, dw - 5, 99, 101, -7.5, 3, mats.metal, { cast: false });
    doorPivot.add(leaf);
    root.add(doorPivot);
  }

  // 開門扇形（地面標示）
  const swing = new THREE.Group();
  {
    const dg = doorGeometry(r);
    const shape = new THREE.Shape(dg.sector.map(([x, z]) => new THREE.Vector2(x, z)));
    const geo = new THREE.ShapeGeometry(shape); geo.rotateX(Math.PI / 2);
    const fill = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#e8742c', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
    fill.position.y = 1.7; fill.renderOrder = 2;
    const pts = [...dg.sector, dg.sector[0]].map(([x, z]) => new THREE.Vector3(x, 1.8, z));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#d2591a' }));
    line.renderOrder = 3;
    swing.add(fill, line);
    root.add(swing);
  }

  // 頂燈：三盞都在靠窗的高天花板
  const ceilingLights = [];
  {
    const z = r.highDepth / 2;
    for (const [i, fx] of [0.2, 0.5, 0.8].entries()) {
      const x = W * fx;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(15, 16, 5, 32), mats.fixture);
      disc.position.set(x, H - 2.5, z);
      groups.ceiling.add(disc);
      const light = new THREE.PointLight('#ffe2b8', 0, 0, 2);
      light.position.set(x, H - 16, z);
      light.castShadow = quality.pointShadows > i;
      light.shadow.mapSize.set(quality.pointMap, quality.pointMap);
      light.shadow.camera.near = 8; light.shadow.camera.far = 520;
      light.shadow.bias = -0.004; light.shadow.normalBias = 1.2; light.shadow.radius = 4;
      root.add(light);
      ceilingLights.push({ light, x, z });
    }
  }

  // 窗型冷氣：右牆，小窗與斜梁之間
  const s = D / 293, k = r.ceilLow / 222;
  {
    const z0 = 97 * s, z1 = 144 * s, y0 = 163 * k, y1 = 205 * k, f = groups.fixed;
    bx(f, W - 19, W, y0, y1, z0, z1, mats.white);
    for (let y = y0 + 16; y < y1 - 3; y += 2.2) bx(f, W - 19.6, W - 19, y, y + 0.9, z0 + 3, z1 - 14, mats.grille, { cast: false });
    bx(f, W - 19.6, W - 19, y0 + 16, y1 - 3, z1 - 11, z1 - 3, mats.grille, { cast: false });
    bx(f, W - 19.6, W - 19, y0 + 3, y0 + 12, z0 + 3, z1 - 3, mats.frame, { cast: false });
  }

  // 固定木作：一體連續的結構
  {
    const f = new THREE.Group(); f.name = 'woodwork'; groups.fixed.add(f);
    const top = r.ceilLow;
    const bl = (y) => (81 + 91.5 * (y / top)) * s;   // 斜梁靠窗側邊線
    const br = (y) => (127 + 94 * (y / top)) * s;    // 斜梁靠門側邊線
    const prism = (pts, x0, x1, mat = mats.wood) => { // 在 (z, y) 平面畫輪廓，沿 x 擠出
      const shape = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
      const geo = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false });
      geo.rotateY(-Math.PI / 2); geo.translate(x1, 0, 0);
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = m.receiveShadow = true; f.add(m);
      return m;
    };
    const slab = (z0, z1, y0, y1, x0 = xw, x1 = W, mat) => prism([[z0, y0], [z1, y0], [z1, y1], [z0, y1]], x0, x1, mat);
    // 斜板條：兩端沿斜梁邊線收齊
    const board = (y, th, fromBeam) => fromBeam
      ? prism([[br(y), y], [D, y], [D, y + th], [br(y + th), y + th]], xw, W)
      : prism([[0, y], [bl(y), y], [bl(y + th), y + th], [0, y + th]], xw, W);
    slab(0, D, 0, 8 * k, xw + 2, W, mats.woodDark); // 連續踢腳座
    // 木板包覆的斜向建築梁
    prism([[bl(8 * k), 8 * k], [br(8 * k), 8 * k], [br(top), top], [bl(top), top]], xw - 0.4, W);
    // 靠窗側：冷氣下方的連續矮櫃（開放層架，一整組）
    const lowTop = 104 * k;
    for (const y of [8, 40, 72]) board(y * k, 2.2, false);
    prism([[0, lowTop - 3], [bl(lowTop - 3), lowTop - 3], [bl(lowTop), lowTop], [0, lowTop]], xw - 1, W);
    slab(0, 2.2, 8 * k, lowTop - 3);
    const nDiv = Math.max(1, Math.round(bl(8 * k) / 45) - 1);
    for (let i = 1; i <= nDiv; i++) { const z = (bl(8 * k) - 2) * i / (nDiv + 1); slab(z, z + 2, 10 * k, lowTop - 3, xw + 1.5); }
    slab(0, bl(8 * k), 8 * k, lowTop - 3, W - 1.5, W - 0.2); // 背板
    // 靠門側：連續下櫃 + 檯面 + 上方開放層架
    const cupTop = 86 * k;
    prism([[br(8 * k), 8 * k], [D, 8 * k], [D, cupTop], [br(cupTop), cupTop]], xw + 0.8, W);
    prism([[br(cupTop), cupTop], [D, cupTop], [D, cupTop + 3], [br(cupTop + 3), cupTop + 3]], xw - 1, W);
    const nDoor = Math.max(2, Math.round((D - br(8 * k)) / 46));
    for (let i = 1; i < nDoor; i++) { // 門片分縫與把手
      const z = br(cupTop) + (D - br(cupTop)) * i / nDoor;
      slab(z - 0.2, z + 0.2, 11 * k, cupTop - 1, xw + 0.5, xw + 0.9, mats.woodDark);
      bx(f, xw - 0.6, xw + 0.8, cupTop - 16, cupTop - 6, z - 4, z - 3, mats.metal, { cast: false });
    }
    const upper0 = 139 * k;
    for (const y of [139, 172, 205]) board(y * k, 2.4, true);
    slab(D - 2.2, D, upper0, top);
    prism([[br(upper0), upper0], [D, upper0], [D, top], [br(top), top]], W - 1.5, W - 0.2); // 背板
    const zm = (br(190 * k) + D) / 2;
    slab(zm, zm + 2, upper0 + 2.4, 205 * k, xw + 1.5);
  }

  const ghostable = ['window', 'left', 'right', 'back', 'ceiling'];
  for (const name of ghostable) groups[name].traverse(o => { if (o.isMesh) o.userData.mat = o.material; });
  const setGhost = (name, on) => {
    const g = groups[name];
    if (g.userData.ghost === on) return false;
    g.userData.ghost = on;
    g.traverse(o => { if (o.isMesh) o.material = on ? mats.ghost : o.userData.mat; });
    return true;
  };

  return { root, groups, doorPivot, swing, ceilingLights, setGhost };
}

function windowUnit(w, h, mats) {
  const g = new THREE.Group();
  const bar = (x, y, bw, bh, bd = 7, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mats.frame);
    m.position.set(x, y, z); m.castShadow = true; g.add(m);
  };
  bar(0, h / 2 - 2, w, 4); bar(0, -h / 2 + 2, w, 4); bar(-w / 2 + 2, 0, 4, h); bar(w / 2 - 2, 0, 4, h);
  // 兩片橫拉窗扇
  const sw = w / 2 + 1, sh = h - 8;
  for (const [sx, sz] of [[-w / 4 + 0.5, -1.5], [w / 4 - 0.5, 1.5]]) {
    bar(sx, sh / 2 - 1.5, sw, 3, 2.6, sz); bar(sx, -sh / 2 + 1.5, sw, 3, 2.6, sz);
    bar(sx - sw / 2 + 1.5, 0, 3, sh, 2.6, sz); bar(sx + sw / 2 - 1.5, 0, 3, sh, 2.6, sz);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(sw - 6, sh - 6), mats.glass);
    glass.position.set(sx, 0, sz); glass.material.side = THREE.DoubleSide; g.add(glass);
  }
  return g;
}
