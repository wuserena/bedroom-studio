// 程序化材質貼圖（木紋、磁磚、牆面、布料、毛絨），不需要任何外部圖片。
import * as THREE from '../vendor/three.module.min.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function canvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return c;
}
function tex(c, { srgb = true, rx = 1, ry = 1 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function woodCanvas() {
  return canvas(512, 512, (g, w, h) => {
    const r = rng(7);
    g.fillStyle = '#c98b46'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) { // 寬色帶
      const y = r() * h, hh = 20 + r() * 70;
      g.fillStyle = `rgba(${r() > .5 ? '226,160,84' : '168,104,44'},${0.10 + r() * 0.12})`;
      g.fillRect(0, y, w, hh); g.fillRect(0, y - h, w, hh);
    }
    for (let i = 0; i < 420; i++) { // 細木紋
      const y = r() * h, amp = 1 + r() * 3, ph = r() * 6.28, f = 1 + Math.floor(r() * 3);
      g.strokeStyle = `rgba(${r() > .35 ? '120,66,22' : '236,180,110'},${0.05 + r() * 0.16})`;
      g.lineWidth = 0.5 + r() * 1.3;
      g.beginPath();
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin((x / w) * 6.2832 * f + ph) * amp);
      g.stroke();
    }
  });
}

function grainCanvas() { // 淺色木紋：與材質顏色相乘後成為各色木皮
  return canvas(512, 512, (g, w, h) => {
    const r = rng(17);
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      const y = r() * h, amp = 1 + r() * 3, ph = r() * 6.28;
      g.strokeStyle = `rgba(${r() > .3 ? '150,104,60' : '255,255,255'},${0.05 + r() * 0.14})`;
      g.lineWidth = 0.6 + r() * 1.6;
      g.beginPath();
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin((x / w) * 6.2832 + ph) * amp);
      g.stroke();
    }
  });
}

function tileCanvas() {
  return canvas(512, 512, (g, w, h) => {
    const r = rng(21);
    g.fillStyle = '#ddd6c8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const x = r() * w, y = r() * h, rad = 12 + r() * 60;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      const tone = r() > .5 ? '236,230,218' : '196,188,174';
      gr.addColorStop(0, `rgba(${tone},${0.05 + r() * 0.08})`); gr.addColorStop(1, `rgba(${tone},0)`);
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    g.strokeStyle = 'rgba(150,142,128,0.9)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.strokeRect(3, 3, w - 6, h - 6);
  });
}

function noiseCanvas(base, tones, n, seed, size = 256) {
  return canvas(size, size, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      g.fillStyle = `rgba(${tones[Math.floor(r() * tones.length)]},${0.04 + r() * 0.07})`;
      const s = 1 + r() * 3; g.fillRect(r() * w, r() * h, s, s);
    }
  });
}

function weaveCanvas() {
  return canvas(128, 128, (g, w, h) => {
    const r = rng(3);
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) {
      const v = 110 + Math.floor(r() * 70) + (((x + y) / 4) % 2 ? 22 : -22);
      g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 4, 4);
    }
  });
}
function furCanvas() {
  return canvas(256, 256, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = '#707070'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5200; i++) {
      const x = r() * w, y = r() * h, len = 5 + r() * 12, a = 1.2 + (r() - .5) * 1.4, v = 60 + Math.floor(r() * 190);
      g.strokeStyle = `rgba(${v},${v},${v},0.55)`; g.lineWidth = 1 + r();
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
    }
  });
}
function pegCanvas() {
  return canvas(256, 256, (g, w, h) => {
    g.fillStyle = '#f3f1ea'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#8f8c84';
    const n = 14, st = w / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      g.beginPath(); g.ellipse(st * (i + .5), st * (j + .5), 2.2, 4.5, 0, 0, 6.3); g.fill();
    }
  });
}
export function rugTexture(base) {
  const c = canvas(384, 512, (g, w, h) => {
    const r = rng(5);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() > .5 ? '255,255,255' : '90,70,50'},${0.03 + r() * 0.05})`; g.fillRect(r() * w, r() * h, 2, 2); }
    const lines = [['#d9743c', 26, 5], ['#6f93bd', 40, 2.5], ['#8d8f92', 50, 1.5]];
    for (const [col, inset, lw] of lines) { g.strokeStyle = col; g.lineWidth = lw; g.strokeRect(inset, inset, w - inset * 2, h - inset * 2); }
    g.strokeStyle = 'rgba(217,116,60,0.55)'; g.lineWidth = 2;
    for (let y = 96; y < h - 80; y += 64) { g.beginPath(); g.moveTo(64, y); g.lineTo(w - 64, y); g.stroke(); }
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function skyCanvas() { // 窗外：天空漸層與模糊的遠方樓房
  return canvas(1024, 512, (g, w, h) => {
    const r = rng(41), gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#a9c9ea'); gr.addColorStop(0.55, '#dbe8f3'); gr.addColorStop(0.75, '#eef1ee');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) { const x = r() * w, y = 40 + r() * 150, rw = 90 + r() * 160; const c = g.createRadialGradient(x, y, 0, x, y, rw); c.addColorStop(0, 'rgba(255,255,255,0.75)'); c.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = c; g.fillRect(x - rw, y - rw * 0.5, rw * 2, rw); }
    for (let layer = 0; layer < 2; layer++) {
      let x = -20;
      while (x < w) {
        const bw = 40 + r() * 90, bh = 70 + r() * (layer ? 120 : 190), v = layer ? 196 + r() * 22 : 214 + r() * 18;
        g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.fillRect(x, h - bh - (layer ? 0 : 30), bw, bh + 40);
        g.fillStyle = `rgba(120,130,140,${layer ? 0.28 : 0.14})`;
        for (let yy = h - bh + 12 - (layer ? 0 : 30); yy < h - 8; yy += 16) for (let xx = x + 7; xx < x + bw - 8; xx += 13) g.fillRect(xx, yy, 6, 8);
        x += bw + 4 + r() * 26;
      }
    }
  });
}

export function makeTextures() {
  const wood = woodCanvas(), weave = weaveCanvas();
  return {
    wood: tex(wood),                       // 以 0..1 UV 貼一片
    woodCm: tex(wood, { rx: 0.011, ry: 0.011 }), // UV 單位為公分的幾何
    tile: tex(tileCanvas(), { rx: 1 / 60, ry: 1 / 60 }),
    grain: tex(grainCanvas()),
    wall: tex(noiseCanvas('#efe7d6', ['255,250,238', '206,196,176'], 5000, 9), { rx: 0.012, ry: 0.012 }),
    weave: tex(weave, { srgb: false, rx: 10, ry: 10 }),
    weaveFine: tex(weave, { srgb: false, rx: 24, ry: 24 }),
    fur: tex(furCanvas(), { srgb: false, rx: 3, ry: 3 }),
    peg: tex(pegCanvas()),
    mirror: tex(canvas(64, 256, (g, w, h) => { // 鏡面：模擬映出天花板、牆面與地板的柔和漸層
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, '#fdf8ee'); gr.addColorStop(0.3, '#e9e1d2'); gr.addColorStop(0.62, '#cfc5b4'); gr.addColorStop(0.66, '#8a7a68'); gr.addColorStop(0.7, '#d8d2c6'); gr.addColorStop(1, '#f1ede4');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    })),
    sky: tex(skyCanvas()),
  };
}

// 讓 BoxGeometry 的 UV 以公分為單位（搭配 woodCm / wall 等世界尺度貼圖）
export function boxUVcm(geo, w, h, d) {
  const uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i;
    uv.setXY(k, uv.getX(k) * dims[f][0], uv.getY(k) * dims[f][1]);
  }
  return geo;
}
