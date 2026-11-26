/* ACHORADO - js/sprites/cine.js  ->  ACH.cine
 * Dueño: Arte (cinemática de la cima + mapa de distritos). Contrato: CIMA.md, sección «Arte».
 * Autosuficiente: no depende de ningún otro script. Script clásico, sin módulos.
 *
 * Técnica: cada pieza se dibuja con formas vectoriales (Path2D, curvas Catmull-Rom) en un lienzo aparte y luego se PIXELA:
 *   1) umbral de alfa (0 % o 100 %), 2) cuantizar a una paleta limitada (tabla de 32768 entradas, con tramado Bayer 4x4
 *   opcional para degradados), 3) contorno selout de 1 px (el color vecino oscurecido y vuelto a cuantizar, nunca negro puro).
 * Todo se cachea en ready() (capas y cuadros de animación); cada draw solo hace drawImage y unos pocos fillRect.
 * El lienzo nunca dibuja letras.
 */
(function () {
'use strict';
var ACH = window.ACH = window.ACH || {};
var W = 960, H = 540, TAU = Math.PI * 2;

/* ============================ UTILIDADES ============================ */
function cv(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function hexRgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
function rgbHex(a) { return '#' + a.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
function mix(a, b, t) { var A = hexRgb(a), B = hexRgb(b); return rgbHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]); }
function shade(a, f) { var A = hexRgb(a); return rgbHex([A[0] * f, A[1] * f, A[2] * f]); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

/* Catmull-Rom -> Bézier (cerrada o abierta) */
function crPath(pts, closed) {
  var p = new Path2D(), n = pts.length;
  p.moveTo(pts[0][0], pts[0][1]);
  var last = closed ? n : n - 1;
  for (var i = 0; i < last; i++) {
    var p0, p1 = pts[i], p2 = pts[(i + 1) % n], p3;
    if (closed) { p0 = pts[(i - 1 + n) % n]; p3 = pts[(i + 2) % n]; }
    else { p0 = pts[Math.max(i - 1, 0)]; p3 = pts[Math.min(i + 2, n - 1)]; }
    p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) p.closePath();
  return p;
}
function blob(x, pts, c) { x.fillStyle = c; x.fill(crPath(pts, true)); }
function polyP(pts) { var p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); return p; }
function poly(x, pts, c) { x.fillStyle = c; x.fill(polyP(pts)); }
function curve(x, pts, c, w) { x.strokeStyle = c; x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke(crPath(pts, false)); }
function svg(x, d, c) { x.fillStyle = c; x.fill(new Path2D(d)); }
function svgS(x, d, c, w) { x.strokeStyle = c; x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke(new Path2D(d)); }
function el(x, cx, cy, rx, ry, c, rot) { x.fillStyle = c; x.beginPath(); x.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); x.fill(); }
function rect(x, a, b, w, h, c) { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
/* mechón ahusado: línea central -> contorno */
function taper(pts, w0, w1) {
  var L = [], R = [], n = pts.length;
  for (var i = 0; i < n; i++) {
    var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    var nx = -dy / l, ny = dx / l, w = (w0 + (w1 - w0) * i / (n - 1)) / 2;
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  return L.concat(R.reverse());
}

/* ============================ PIXELADO ============================ */
var BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
var palCache = {};
function Pal(list) {
  var key = list.join(''); if (palCache[key]) return palCache[key];
  return (palCache[key] = { list: list, cols: null, lut: null });
}
function palBuild(P) {
  if (P.lut) return P;
  var cols = P.list.map(hexRgb), lut = new Uint8Array(32768), n = cols.length;
  for (var i = 0; i < 32768; i++) {
    var r = ((i >> 10) & 31) * 8 + 4, g = ((i >> 5) & 31) * 8 + 4, b = (i & 31) * 8 + 4, best = 0, bd = 1e9;
    for (var k = 0; k < n; k++) {
      var c = cols[k], dr = r - c[0], dg = g - c[1], db = b - c[2], rm = (r + c[0]) * 0.5;
      var d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
      if (d < bd) { bd = d; best = k; }
    }
    lut[i] = best;
  }
  P.cols = cols; P.lut = lut; return P;
}
/* o: {dither: amplitud (0..40), mask: densidad 0..1 (tramado de transparencia), alpha: umbral, outline: false|true|factor} */
function pixelate(src, pal, o) {
  o = o || {}; palBuild(pal);
  var w = src.width, h = src.height, sx = src.getContext('2d'), id = sx.getImageData(0, 0, w, h), d = id.data;
  var dit = o.dither || 0, mask = o.mask == null ? 1 : o.mask, at = o.alpha || 110, cols = pal.cols, lut = pal.lut, x, y, i;
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    i = (y * w + x) * 4;
    if (d[i + 3] < at) { d[i + 3] = 0; continue; }
    var bv = BAY[((y & 3) << 2) | (x & 3)];
    if (mask < 1 && (bv + 0.5) / 16 > mask) { d[i + 3] = 0; continue; }
    var off = dit ? (bv / 15 - 0.5) * dit : 0;
    var r = d[i] + off, g = d[i + 1] + off, b = d[i + 2] + off;
    r = r < 0 ? 0 : r > 255 ? 255 : r; g = g < 0 ? 0 : g > 255 ? 255 : g; b = b < 0 ? 0 : b > 255 ? 255 : b;
    var c = cols[lut[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)]];
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  if (o.outline) {
    var f = o.outline === true ? 0.42 : o.outline, out = new Uint8ClampedArray(d), om = o.olmap ? olBuild(o.olmap) : null;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i = (y * w + x) * 4; if (d[i + 3]) continue;
      var j = -1;
      if (y + 1 < h && d[i + w * 4 + 3]) j = i + w * 4;
      else if (x > 0 && d[i - 1]) j = i - 4;
      else if (x + 1 < w && d[i + 7]) j = i + 4;
      else if (y > 0 && d[i - w * 4 + 3]) j = i - w * 4;
      if (j < 0) continue;
      var oc = om && om[(d[j] << 16) | (d[j + 1] << 8) | d[j + 2]];
      if (oc) { out[i] = oc[0]; out[i + 1] = oc[1]; out[i + 2] = oc[2]; out[i + 3] = 255; continue; }
      var rr = d[j] * f, gg = d[j + 1] * f, bb = d[j + 2] * f;
      var cc = cols[lut[((rr >> 3) << 10) | ((gg >> 3) << 5) | (bb >> 3)]];
      out[i] = cc[0]; out[i + 1] = cc[1]; out[i + 2] = cc[2]; out[i + 3] = 255;
    }
    id.data.set(out);
  }
  var dst = cv(w, h); dst.getContext('2d').putImageData(id, 0, 0);
  return dst;
}
/* mapa de contorno {colorRelleno: colorBorde} -> tabla por entero rgb */
function olBuild(m) {
  if (m.__t) return m.__t;
  var t = {}; Object.keys(m).forEach(function (k) { var a = hexRgb(k); t[(a[0] << 16) | (a[1] << 8) | a[2]] = hexRgb(m[k]); });
  Object.defineProperty(m, "__t", { value: t }); return t;
}
/* capa con caja: draw(ctx) recibe coordenadas globales; devuelve {c, x, y} */
function layer(bx, by, bw, bh, draw, pal, o) {
  var c = cv(bw, bh), x = c.getContext('2d', { willReadFrequently: true });
  x.translate(-bx, -by); draw(x); x.setTransform(1, 0, 0, 1, 0, 0);
  return { c: pixelate(c, pal, o), x: bx, y: by };
}
function put(ctx, L, dx, dy) { if (L) ctx.drawImage(L.c, Math.round(L.x + (dx || 0)), Math.round(L.y + (dy || 0))); }

/* ============================ COLORES ============================ */
/* Hoja de personaje v0.10 (V010.md): piel clara igual a la del juego (js/sprites.js), pelo negro castaño, camiseta azul y blanca */
var SK = { o: '#6e4430', dd: '#80523a', d: '#a8714c', m: '#c48f63', l: '#dcae80', hl: '#ecc49a', ck: '#d4937a', lip: '#b8705e', w: '#f2d4a8', wh: '#f8e4c0' };   // o = contorno de piel
var HR = { k: '#170f0c', d: '#211813', m: '#2e221c', l: '#4a382d', hl: '#5e4a3c', rim: '#6e6670', w: '#8a5a3a' };
var BL = { dd: '#121c40', d: '#1e3468', m: '#2b4a8c', l: '#3c60a8', hl: '#5a7ec2' };
var WH = { dd: '#6a7086', d: '#a7aab8', m: '#c9cbd6', l: '#e8e8ec', hl: '#f8f8fa' };
var EY = { iris: '#4a2e1e', irisL: '#73503a', pup: '#22150f', sc: '#f2eee4', scD: '#d2c8b8', lash: '#22160f' };
var MO = { ins: '#5a2a24', dk: '#33171a', tg: '#b5675a', th: '#f4efe2', thD: '#cfc6b0' };
var PG = { k: '#24262c', dd: '#3c3f47', d: '#5b5f69', m: '#7f848e', l: '#a3a8b1', hl: '#c5c9cf', w: '#e2e4e8',
  g1: '#3a7656', g: '#4f9a6e', g2: '#5f8c88', g3: '#776f9c', p: '#8a5a9e', p2: '#64407a', gl: '#7ec69c', pl: '#b48cc6',
  eye: '#ea8a2c', eyeD: '#b0541a', ring: '#cdbab0', beak: '#3e383a', cere: '#eeeae2', foot: '#d9737a', footD: '#a8505a', footL: '#eea4a6', claw: '#4a3a3c' };
var GT = { m: '#a86e38', d: '#6b4223', dd: '#2a1810', l: '#c88c50', head: '#3a2a1e', metal: '#c9c9be', tape: '#cbbf98', strap: '#4a3324', strapL: '#6e5038', strapD: '#2c1e15' };
var SH = { m: '#5d6150', d: '#464a3c', dd: '#2f3128', l: '#767a66' };   // short verde olivo
var SD = { m: '#5e3f27', d: '#3a2616', l: '#7a5636' };                  // sandalias
var SKYC = ['#83868c', '#8e9196', '#999b9f', '#a4a6a8', '#aeafb0', '#b8b9b8', '#c1c2c0', '#cacac8', '#d2d1cd', '#d9d8d2', '#e1dfd8', '#e9e6de'];
var WARM = ['#f6e8b8', '#fff6d8', '#f2d28a', '#e9c27c', '#d9b27a'];
var OUTK = ['#141216', '#1c1820', '#241a16', '#2a2228'];

var PAL_SKY = Pal(SKYC.concat(WARM, ['#f0ece2', '#74777e']));
function vals(o) { return Object.keys(o).map(function (k) { return o[k]; }); }
var CHAR_LIST = [].concat(vals(SK), vals(HR), vals(BL), vals(WH), vals(EY), vals(MO), vals(GT), vals(SH), vals(SD), OUTK);
var PIG_LIST = vals(PG).concat(['#141216', '#ffffff']);
var PAL_CHAR = Pal(CHAR_LIST), PAL_FACE = PAL_CHAR, PAL_PIG = Pal(PIG_LIST), PAL_BOTH = Pal(CHAR_LIST.concat(PIG_LIST));
/* contorno selout por material: el color vecino decide el color del borde (nunca negro puro en la piel) */
var OL_CHAR = {};
[SK.dd, SK.d, SK.m, SK.l, SK.hl, SK.ck, SK.lip, SK.w, SK.wh].forEach(function (c) { OL_CHAR[c] = SK.o; });
vals(HR).forEach(function (c) { OL_CHAR[c] = HR.k; });
vals(BL).forEach(function (c) { OL_CHAR[c] = BL.dd; });
vals(WH).forEach(function (c) { OL_CHAR[c] = WH.dd; });
[GT.m, GT.d, GT.l, GT.head, GT.tape, GT.metal].forEach(function (c) { OL_CHAR[c] = GT.dd; });
[GT.strap, GT.strapL].forEach(function (c) { OL_CHAR[c] = GT.strapD; });
vals(SH).forEach(function (c) { OL_CHAR[c] = SH.dd; });
vals(SD).forEach(function (c) { OL_CHAR[c] = '#24170e'; });
vals(PG).forEach(function (c) { OL_CHAR[c] = PG.k; });
[PG.foot, PG.footD, PG.footL].forEach(function (c) { OL_CHAR[c] = '#6e3038'; });
[PG.g, PG.g1, PG.g2, PG.gl].forEach(function (c) { OL_CHAR[c] = '#22423a'; });
[PG.g3, PG.p, PG.p2, PG.pl].forEach(function (c) { OL_CHAR[c] = '#3a2648'; });
var PAL_MISC = Pal(['#141216', '#151717', '#2a2a2c', '#8e8a86', '#b8b2aa', '#d8d2c6', '#e6e6e0', '#f6f4ea', '#c4c4c0', '#9a9a98', '#6e6e70', '#dfe8ec', '#9fb0c4', '#5d6f80', '#c9d6de', '#ffffff', '#c26b6b',
  '#a8483f', '#d2a545', '#3f4c85', '#8a5aa6', '#e9c27c', '#5e3f27']);

/* ============================ SPRITES COMPARTIDOS ============================ */
var memo = {};
/* gallinazo: sc escala (1 = ~22 px de envergadura), fr 0 planeo, 1 alas arriba, 2 ladeado */
function vulture(sc, fr) {
  var k = 'v' + sc + '_' + fr; if (memo[k]) return memo[k];
  var w = Math.ceil(30 * sc), h = Math.ceil(16 * sc);
  var L = layer(0, 0, w, h, function (x) {
    x.translate(w / 2, h / 2); x.scale(sc, sc);
    var up = fr === 1 ? -4 : 0, tilt = fr === 2 ? 3 : 0;
    poly(x, [[-1, -1], [-6, -2 + up], [-12, -1 + up + tilt], [-14, 1 + up + tilt], [-11, 2 + tilt], [-6, 2], [-1, 2]], '#151717');
    poly(x, [[1, -1], [6, -2 + up], [12, -1 + up - tilt], [14, 1 + up - tilt], [11, 2 - tilt], [6, 2], [1, 2]], '#151717');
    el(x, 0, 0.5, 3.2, 2, '#151717');
    poly(x, [[-1, 2], [1, 2], [0, 5]], '#151717');
    el(x, 0, -2, 1.5, 1.5, '#8e8a86');
    for (var i = 0; i < 3; i++) { rect(x, -13 + i * 1.2, 1 + up + tilt + i * 0.2, 1, 1, '#2a2a2c'); rect(x, 12 - i * 1.2, 1 + up - tilt + i * 0.2, 1, 1, '#2a2a2c'); }
  }, PAL_MISC, { outline: false });
  L.x = -w / 2; L.y = -h / 2;
  return (memo[k] = L);
}
function drawVultures(ctx, t, list, sc, ox) {
  for (var i = 0; i < list.length; i++) {
    var b = list[i], a = t * b.v + b.p;
    var x = b.x + Math.cos(a) * b.rx + (ox || 0), y = b.y + Math.sin(a) * b.ry;
    var fr = ((t * 0.7 + i * 0.37) % 4) < 0.25 ? 1 : (Math.cos(a) * b.v > 0 ? 0 : 2);
    var s = vulture(sc * (b.s || 1), fr);
    ctx.drawImage(s.c, Math.round(x + s.x), Math.round(y + s.y));
  }
}
/* garúa: rayitas de 1 px inclinadas por el viento */
function drizzle(ctx, t, n, col, len, x0, y0, w, h) {
  ctx.fillStyle = col;
  for (var i = 0; i < n; i++) {
    var a = hash(i * 3.1), b = hash(i * 7.7 + 2), v = 140 + 90 * b;
    var yy = (a * h + t * v) % (h + 20) - 10, xx = (b * w + t * v * 0.35 + i * 13) % w;
    ctx.fillRect(x0 + (xx | 0), y0 + (yy | 0), 1, len);
    if (len > 2) ctx.fillRect(x0 + (xx | 0) + 1, y0 + (yy | 0) + len, 1, 1);
  }
}
/* bocanada de humo (para columnas): 4 tamaños x 2 densidades */
function puff(si, dens) {
  var k = 'pf' + si + '_' + dens; if (memo[k]) return memo[k];
  var r = [4, 7, 10, 14][si], s = r * 2 + 4;
  var L = layer(0, 0, s, s, function (x) {
    el(x, s / 2, s / 2, r, r * 0.85, dens ? '#6e6e70' : '#8a8a8a');
    el(x, s / 2 - r * 0.3, s / 2 - r * 0.3, r * 0.6, r * 0.5, dens ? '#8a8a8a' : '#a3a3a3');
  }, Pal(['#5a5a5c', '#6e6e70', '#8a8a8a', '#a3a3a3', '#b9b9b7']), { mask: dens ? 0.85 : 0.45 });
  L.x = -s / 2; L.y = -s / 2;
  return (memo[k] = L);
}
function smokeCol(ctx, t, sx, sy, scale, n, seed) {
  for (var i = 0; i < n; i++) {
    var age = (t * 0.09 + i / n + seed * 0.13) % 1;
    var y = sy - age * 170 * scale, x = sx + age * age * 90 * scale + Math.sin(age * 6 + i + seed) * 5 * scale;
    var si = Math.min(3, Math.floor(age * 4.2 * (scale > 0.8 ? 1 : 0.8))), p = puff(si, age < 0.55 ? 1 : 0);
    ctx.drawImage(p.c, Math.round(x + p.x), Math.round(y + p.y));
  }
}
function fireFr(fr) {
  var k = 'fire' + fr; if (memo[k]) return memo[k];
  var L = layer(0, 0, 16, 16, function (x) {
    var r = rng(fr * 17 + 3);
    poly(x, [[3, 15], [13, 15], [12, 9], [9 + r() * 2, 3 + r() * 2], [8, 7], [6, 2 + r() * 3], [4, 9]], '#c0442a');
    poly(x, [[5, 15], [11, 15], [10, 10], [8, 6 + r() * 2], [6, 10]], '#e08a3a');
    poly(x, [[7, 15], [9, 15], [9, 12], [8, 10], [7, 12]], '#f2c04a');
  }, Pal(['#c0442a', '#e08a3a', '#f2c04a', '#7a2a1a']), {});
  return (memo[k] = L);
}

/* ============================ T2: EL PANORAMA ============================ */
var PANO = null, PW = 2400, HZ = 212, FOG = '#d2d1cc';
var MID_Y0 = 150, NEAR_Y0 = 316, NEAR_W = Math.ceil(W + 1.6 * (PW - W)), FAR_W = Math.ceil(W + 0.35 * (PW - W)), SKY_W = Math.ceil(W + 0.1 * (PW - W));
var CURE = { x: 1881, y: 206 };
var LABELS = [
  { id: 'rimac', x: 140, y: 262 }, { id: 'cercado', x: 410, y: 236 }, { id: 'brena', x: 640, y: 262 }, { id: 'pueblo-libre', x: 800, y: 266 },
  { id: 'jesus-maria', x: 985, y: 256 }, { id: 'lince', x: 1160, y: 232 }, { id: 'san-isidro', x: 1420, y: 184 }, { id: 'miraflores', x: 1790, y: 176 },
  { id: 'barranco', x: 2085, y: 290 }, { id: 'chorrillos', x: 2250, y: 222 }
];
var PAL_CITY = Pal(['#3a3836', '#4a4845', '#5e5c58', '#6d6c69', '#7c7a75', '#8e8c86', '#9a9895', '#a7a59f', '#b4b1aa', '#c0bdb6', '#cac8c3', '#d4d2cd', '#dddcd6',
  '#8f5b47', '#a25b48', '#a68a75', '#b8a070', '#c9b07a', '#c39a90', '#d0b2a6', '#8fa0ac', '#7f93a0', '#a9b9c4', '#5f7380', '#6f8794', '#93a9b5',
  '#5e6e55', '#6f7d5e', '#82906c', '#4c5a46', '#6f8189', '#7c94a6', '#8ea2ae', '#a0b2bc', '#a38c73', '#7a5e48', '#8a7460', '#e6e4df', '#a8483f', '#2c2a2a', '#d8d2c4', '#a8a296',
  '#8a867c', '#9c9890', '#aeb0ad', '#bcbfc0']);
var PAL_NEAR = Pal(['#2a2220', '#3a3330', '#4a4542', '#5e5a54', '#78736c', '#8a847a', '#9a8f7b', '#b39b77', '#c4b08e', '#6d6c69', '#8e8d86', '#a7a9a4', '#c4c6c0',
  '#5a3a30', '#7a4a3a', '#8f5b47', '#a25b48', '#b8735a', '#1c1c1e', '#2c2623', '#a8483f', '#3f4c85', '#d2a545', '#e6e4df', '#5e7a62', '#7b6a8a', '#c98a82', '#6f6a5a']);

function coastY(x) {                 // borde del acantilado / costa de la bahía (capa media)
  var P = [[1400, 560], [1470, 482], [1530, 432], [1590, 397], [1650, 380], [1760, 373], [1880, 371], [2000, 373], [2100, 379], [2170, 389], [2400, 389]];
  if (x < 1400) return 9999;
  for (var i = 1; i < P.length; i++) if (x <= P[i][0]) { var a = P[i - 1], b = P[i]; return lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0])); }
  return 389;
}
function cliffH(x) { return x < 1560 ? 0 : x < 1610 ? (x - 1560) / 50 * 24 : x > 2170 ? 0 : 24; }
function riverX(y) { return 205 - (y - HZ) * 0.26; }
function riverW(y) { return 3 + (y - HZ) * 0.13; }
function viaX(y) { return 1300 - (y - HZ) * 0.3; }
function viaW(y) { return 2 + (y - HZ) * 0.2; }
function depthY(d) { return HZ + 8 + Math.pow(d, 1.3) * 330; }
function districtAt(x) {
  var B = [[260, 'rimac'], [560, 'cercado'], [720, 'brena'], [880, 'pueblo'], [1080, 'jm'], [1265, 'lince'], [1580, 'si'], [2010, 'mira'], [2160, 'barranco'], [9999, 'chorr']];
  for (var i = 0; i < B.length; i++) if (x < B[i][0]) return B[i][1];
}
var STY = {
  rimac: { h: [6, 18], cols: ['#a25b48', '#b8a070', '#c39a90', '#9a9895', '#a68a75'] },
  cercado: { h: [8, 22], cols: ['#c9b07a', '#b8a070', '#d0b2a6', '#c0bdb6', '#a68a75', '#c39a90'] },
  brena: { h: [7, 18], cols: ['#9a9895', '#a7a59f', '#b4b1aa', '#8e8c86', '#a68a75'] },
  pueblo: { h: [6, 15], cols: ['#a7a59f', '#b4b1aa', '#c0bdb6', '#9a9895', '#c39a90'] },
  jm: { h: [8, 24], cols: ['#b4b1aa', '#c0bdb6', '#a7a59f', '#d0b2a6'] },
  lince: { h: [8, 28], cols: ['#a7a59f', '#b4b1aa', '#8fa0ac', '#c0bdb6', '#9a9895'] },
  si: { h: [10, 30], cols: ['#c0bdb6', '#cac8c3', '#8fa0ac', '#b4b1aa'] },
  mira: { h: [10, 30], cols: ['#d8d2c4', '#cac8c3', '#c0bdb6', '#d4d2cd'] },
  barranco: { h: [6, 14], cols: ['#c39a90', '#c9b07a', '#8fa0ac', '#d0b2a6', '#a25b48', '#cac8c3'] },
  chorr: { h: [7, 20], cols: ['#b4b1aa', '#c39a90', '#c9b07a', '#a7a59f'] }
};

function bld(x, X, Y, w, h, col, d, r, kind) {
  var f = (1 - d) * 0.72, F = function (c) { return mix(c, FOG, f); };
  X = Math.round(X); Y = Math.round(Y); w = Math.max(2, Math.round(w)); h = Math.max(2, Math.round(h));
  var sd = Math.max(1, Math.round(w * 0.22)), up = Math.max(1, Math.round(sd * 0.5));
  var face = col, side = shade(col, 0.78), roof = mix(col, '#e6e4df', 0.25), win = kind === 'glass' ? '#5f7380' : '#4a4845';
  if (kind === 'glass') { face = '#7f93a0'; side = '#5f7380'; roof = '#93a9b5'; }
  if (kind === 'tower') { face = '#d8d2c4'; side = '#a8a296'; roof = '#e6e4df'; }
  rect(x, X, Y - h, w, h, F(face));
  poly(x, [[X + w, Y - h], [X + w + sd, Y - h - up], [X + w + sd, Y - up], [X + w, Y]], F(side));
  poly(x, [[X, Y - h], [X + sd, Y - h - up], [X + w + sd, Y - h - up], [X + w, Y - h]], F(roof));
  var s = 0.3 + 0.7 * d, fl = Math.max(2, Math.round(3.4 * s + 0.6));
  if (kind === 'glass') {
    rect(x, X + Math.round(w * 0.2), Y - h, Math.max(1, Math.round(w * 0.18)), h, F('#a9b9c4'));
    for (var gy = Y - h + 2; gy < Y - 1; gy += fl) rect(x, X, gy, w, 1, F('#6f8794'));
  } else if (kind === 'tower') {
    for (var ty = Y - h + 2; ty < Y - 1; ty += fl) { rect(x, X, ty, w, 1, F('#a8a296')); if (w > 6) for (var tx = X + 1; tx < X + w - 1; tx += 3) rect(x, tx, ty + 1, 2, 1, F('#6f8794')); }
  } else if (w >= 4 && h >= 4) {
    for (var wy = Y - h + 2; wy < Y - 1; wy += fl) for (var wx = X + 1; wx < X + w - 1; wx += Math.max(2, Math.round(3 * s + 1))) if (r() < 0.8) rect(x, wx, wy, 1, Math.max(1, Math.round(fl * 0.45)), F(win));
  }
  // azotea: tanque, fierros de construcción "para el segundo piso"
  if (kind !== 'glass' && kind !== 'tower' && w > 5) {
    if (r() < 0.5) rect(x, X + Math.round(w * (0.2 + r() * 0.5)), Y - h - up - Math.max(1, Math.round(2 * s)), Math.max(1, Math.round(2.5 * s)), Math.max(1, Math.round(2 * s)), F('#3a3836'));
    if (r() < 0.45) for (var rb = 0; rb < 3; rb++) rect(x, X + 1 + rb * Math.max(2, Math.round(w / 3)), Y - h - up - Math.max(1, Math.round(3 * s)), 1, Math.max(1, Math.round(3 * s)), F('#5e5c58'));
  }
}
function dome(x, X, Y, s, d) {
  var F = function (c) { return mix(c, FOG, (1 - d) * 0.72); };
  rect(x, X - 10 * s, Y - 16 * s, 20 * s, 16 * s, F('#c9b07a'));
  rect(x, X - 7 * s, Y - 22 * s, 14 * s, 6 * s, F('#b8a070'));
  el(x, X, Y - 22 * s, 7 * s, 7 * s, F('#a7a59f')); rect(x, X - 1.5 * s, Y - 33 * s, 3 * s, 6 * s, F('#c9b07a')); rect(x, X - 0.5 * s, Y - 36 * s, 1, 3 * s, F('#5e5c58'));
  el(x, X - 2 * s, Y - 25 * s, 2 * s, 2 * s, F('#cac8c3'));
}
function twinTowers(x, X, Y, s, d) {   // iglesia colonial genérica con dos torres
  var F = function (c) { return mix(c, FOG, (1 - d) * 0.72); };
  rect(x, X - 18 * s, Y - 22 * s, 36 * s, 22 * s, F('#c9b07a'));
  poly(x, [[X - 18 * s, Y - 22 * s], [X, Y - 32 * s], [X + 18 * s, Y - 22 * s]], F('#b8a070'));
  [-1, 1].forEach(function (sg) {
    var tx = X + sg * 16 * s;
    rect(x, tx - 5 * s, Y - 48 * s, 10 * s, 48 * s, F('#d8d2c4')); rect(x, tx - 4 * s, Y - 44 * s, 8 * s, 6 * s, F('#5e5c58'));
    rect(x, tx - 3 * s, Y - 56 * s, 6 * s, 8 * s, F('#c9b07a')); el(x, tx, Y - 57 * s, 3 * s, 3 * s, F('#a7a59f'));
    rect(x, tx - 0.5, Y - 63 * s, 1, 5 * s, F('#5e5c58'));
  });
  rect(x, X - 4 * s, Y - 14 * s, 8 * s, 14 * s, F('#5e5c58'));
}
function midLayer(x) {
  var r = rng(2024);
  x.save();
  // suelo con niebla
  var g = x.createLinearGradient(0, HZ, 0, H);
  g.addColorStop(0, '#cfcdc7'); g.addColorStop(0.4, '#b4b1aa'); g.addColorStop(1, '#9a978f');
  x.fillStyle = g; x.fillRect(0, HZ - 2, PW, H - HZ + 2);
  // mar: bahía y océano detrás del Morro
  var sg = x.createLinearGradient(0, HZ, 0, H); sg.addColorStop(0, '#a0b2bc'); sg.addColorStop(0.5, '#8ea2ae'); sg.addColorStop(1, '#6f8189');
  var sea = [[1400, 560]]; for (var sx = 1400; sx <= 2400; sx += 10) sea.push([sx, coastY(sx) + cliffH(sx) + 7]);
  sea.push([2400, 560]); poly(x, sea, '#7c94a6');
  x.fillStyle = sg; x.fill(polyP(sea));
  poly(x, [[2170, HZ], [2400, HZ], [2400, 392], [2170, 392]], '#a0b2bc');
  for (var wv = 0; wv < 260; wv++) { var wx = 1400 + r() * 1000, wy = coastY(wx) + cliffH(wx) + 10 + r() * 160; if (wy < 540) rect(x, wx, wy, 2 + r() * 6, 1, r() < 0.5 ? '#a0b2bc' : '#6f8189'); }
  // acantilado de la Costa Verde, pista y playa
  for (var cx = 1400; cx < 2400; cx += 2) {
    var cy = coastY(cx), ch = cliffH(cx);
    if (ch > 0) { rect(x, cx, cy, 2, ch, '#a38c73'); rect(x, cx, cy + ch * 0.6, 2, ch * 0.4, '#8a7460'); rect(x, cx, cy + ch * (0.3 + 0.12 * Math.sin(cx * 0.03)), 2, 1, '#7a5e48'); rect(x, cx, cy + ch * (0.62 + 0.1 * Math.sin(cx * 0.05 + 1)), 2, 1, '#7a5e48'); if (r() < 0.25) rect(x, cx, cy + r() * ch, 2, 2, r() < 0.5 ? '#7a5e48' : '#c0bdb6'); }
    rect(x, cx, cy + ch, 2, 3, '#6d6c69'); rect(x, cx, cy + ch + 3, 2, 4, '#9a9895');
    if ((cx >> 2) % 4) rect(x, cx, cy + ch + 7, 2, 1, '#e6e4df');
  }
  // malecón verde arriba del acantilado (Miraflores, Barranco)
  for (var mx = 1590; mx < 2160; mx += 2) rect(x, mx, coastY(mx) - 2, 2, 2, mx < 2010 ? '#6f7d5e' : '#82906c');
  // río Rímac en su cauce de piedras
  for (var ry = HZ; ry < H; ry++) { var rc = riverX(ry), rw = riverW(ry); rect(x, rc - rw / 2 - 2, ry, rw + 4, 1, '#8e8c86'); rect(x, rc - rw * 0.2 + Math.sin(ry * 0.08) * rw * 0.2, ry, Math.max(1, rw * 0.35), 1, '#7c94a6'); }
  // Vía Expresa vacía en su zanja, con autos abandonados
  for (var vy = HZ + 6; vy < H; vy++) { var vc = viaX(vy), vw = viaW(vy); rect(x, vc - vw / 2, vy, vw, 1, '#6d6c69'); rect(x, vc - vw / 2, vy, Math.max(1, vw * 0.06), 1, '#a7a59f'); rect(x, vc + vw * 0.44, vy, Math.max(1, vw * 0.06), 1, '#5e5c58'); if ((vy >> 2) % 2) rect(x, vc, vy, 1, 1, '#cac8c3'); }
  var carC = ['#a8483f', '#8fa0ac', '#e6e4df', '#c9b07a', '#3a3836', '#7f93a0'];
  for (var ci = 0; ci < 26; ci++) {
    var cyy = HZ + 20 + Math.pow(r(), 0.7) * 300, vw2 = viaW(cyy), cs = 0.3 + 0.7 * (cyy - HZ) / 330;
    x.save(); x.translate(viaX(cyy) + (r() - 0.5) * vw2 * 0.7, cyy); x.rotate((r() - 0.5) * (r() < 0.3 ? 2.4 : 0.4));
    rect(x, -2 * cs, -5 * cs, 4 * cs + 1, 8 * cs + 1, carC[ci % 6]); rect(x, -1.5 * cs, -2 * cs, 3 * cs + 1, 2 * cs, '#4a4845'); x.restore();
  }
  // parque de Jesús María (gran mancha verde con árboles)
  el(x, 980, 300, 78, 24, '#6f7d5e'); el(x, 980, 300, 70, 19, '#82906c'); el(x, 980, 298, 18, 6, '#9a9895');
  for (var tr = 0; tr < 70; tr++) { var ta = r() * TAU, rr = Math.sqrt(r()); el(x, 980 + Math.cos(ta) * 68 * rr, 300 + Math.sin(ta) * 18 * rr, 2.5, 2, r() < 0.5 ? '#5e6e55' : '#4c5a46'); }
  el(x, 1500, 268, 40, 9, '#82906c');     // un verde en San Isidro
  // filas de edificios, de lejos a cerca
  var ROWS = 34;
  for (var row = 0; row < ROWS; row++) {
    var d = 0.02 + row / ROWS * 0.86, Y = depthY(d), s = 0.3 + 0.7 * d, X = -10 + r() * 10;
    while (X < PW) {
      var dk = districtAt(X), st = STY[dk], w = (12 + r() * 20) * s, kind = null, h = lerp(st.h[0], st.h[1], r()) * s * 1.45 * (r() < 0.14 ? 1.8 : 1);
      if (dk === 'si' && d > 0.12 && d < 0.62 && r() < 0.2) { kind = 'glass'; h = (50 + r() * 80) * s * 1.3; w = (14 + r() * 10) * s; }
      if (dk === 'mira') { var cyl = coastY(X); if (Y < cyl - 4 && Y > cyl - 26 && r() < 0.65) { kind = 'tower'; h = (60 + r() * 60) * s * 1.2; w = (13 + r() * 9) * s; } else if (d < 0.3 && r() < 0.07) { kind = 'tower'; h = (40 + r() * 40) * s * 1.2; } }
      if (dk === 'lince' && r() < 0.1) h *= 2;
      if (Y > 420) h *= 0.5;   // de cerca se ven sobre todo techos
      var ok = Y < coastY(X + w) - 3 && Y < coastY(X) - 3;
      var rx0 = riverX(Y), rw0 = riverW(Y); if (X + w > rx0 - rw0 / 2 - 3 && X < rx0 + rw0 / 2 + 3) ok = false;
      var vx0 = viaX(Y), vw0 = viaW(Y); if (X + w + 3 > vx0 - vw0 / 2 && X < vx0 + vw0 / 2 + 1) ok = false;
      if (Math.pow((X + w / 2 - 980) / 80, 2) + Math.pow((Y - 300) / 26, 2) < 1) ok = false;
      if (Math.pow((X + w / 2 - 1500) / 42, 2) + Math.pow((Y - 268) / 10, 2) < 1) ok = false;
      if (X > 2170 && Y > 300) ok = false;
      if (ok) bld(x, X, Y, w, h, st.cols[(r() * st.cols.length) | 0], d, r, kind);
      X += w + r() * 3 * s + (r() < 0.06 ? 8 * s : 0);
    }
    // cúpulas y torres del Cercado en sus filas
    if (row === 8) { twinTowers(x, 400, Y, 0.8, d); dome(x, 320, Y, 0.75, d); dome(x, 500, Y + 2, 0.7, d); }
    if (row === 14) { dome(x, 290, Y, 1.0, d); twinTowers(x, 470, Y, 1.05, d); }
    if (row === 12) { rect(x, 1170, Y - 70, 2, 70, mix('#5e5c58', FOG, 0.4)); for (var an = 0; an < 5; an++) rect(x, 1167 + an % 2, Y - 66 + an * 12, 8 - an, 1, mix('#5e5c58', FOG, 0.4)); }
  }
  // la torre de la luz verde (Miraflores, al borde del acantilado) y el faro
  var tyb = coastY(1870) - 3;
  bld(x, 1868, tyb, 26, 150, '#d8d2c4', 0.62, r, 'tower');
  rect(x, 1870, tyb - 154, 24, 4, '#a8a296'); rect(x, 1880, tyb - 166, 2, 12, '#4a4845'); rect(x, 1877, tyb - 158, 8, 2, '#5e5c58');
  var fyb = coastY(1720) - 1;
  poly(x, [[1714, fyb], [1726, fyb], [1723, fyb - 44], [1717, fyb - 44]], '#e6e4df');
  rect(x, 1716, fyb - 30, 9, 4, '#a8483f'); rect(x, 1717, fyb - 16, 8, 4, '#a8483f');
  rect(x, 1715, fyb - 51, 10, 7, '#2c2a2a'); rect(x, 1717, fyb - 49, 6, 3, '#e6e4df'); poly(x, [[1714, fyb - 51], [1720, fyb - 57], [1726, fyb - 51]], '#3a3836');
  // Morro Solar con su cruz, entrando al mar
  var mpts = [[2165, 395], [2190, 330], [2230, 285], [2280, 262], [2320, 258], [2360, 270], [2400, 292], [2410, 400]];
  blob(x, mpts, '#a68a75'); blob(x, [[2300, 262], [2360, 272], [2405, 300], [2405, 398], [2330, 398], [2340, 320]], '#8a7460');
  blob(x, [[2190, 330], [2230, 285], [2280, 262], [2300, 266], [2260, 300], [2220, 350], [2196, 380]], '#a7a59f');
  for (var mr = 0; mr < 260; mr++) { var mx2 = 2180 + r() * 220, my2 = 280 + r() * 110; if (my2 > 270 + Math.abs(mx2 - 2310) * 0.5) rect(x, mx2, my2, 2 + r() * 3, 1, r() < 0.5 ? '#7a5e48' : '#8a7460'); }
  rect(x, 2304, 232, 3, 28, '#e6e4df'); rect(x, 2297, 240, 17, 3, '#e6e4df');
  for (var cc = 2165; cc < 2405; cc += 2) rect(x, cc, 392 + Math.sin(cc * 0.1), 2, 2, '#e6e4df');
  x.restore();
}
function farLayer(x) {
  var r = rng(99), FX2 = function (c, f) { return mix(c, FOG, f); };
  // estribaciones andinas en la bruma (solo tierra adentro: a la izquierda)
  var bands = [[150, '#b9bcbf', 0.2], [172, '#aeb0b2', 0.25], [190, '#a29f98', 0.3]];
  bands.forEach(function (b, bi) {
    var pts = [[0, HZ + 2]];
    for (var px = 0; px <= 1100; px += 20) { var yy = b[0] + Math.sin(px * 0.011 + bi * 2) * 14 + Math.sin(px * 0.031 + bi) * 7 + r() * 4 + px / 1100 * (HZ - b[0]) * 0.95; pts.push([px, Math.min(HZ + 1, yy)]); }
    pts.push([1100, HZ + 2]); poly(x, pts, FX2(b[1], b[2]));
  });
  // cerro San Cristóbal con su cruz y antenas
  var sc = [[10, HZ + 2], [60, 192], [110, 152], [160, 122], [196, 118], [238, 142], [292, 176], [350, HZ + 2]];
  blob(x, sc, FX2('#8a867c', 0.25)); blob(x, [[196, 118], [238, 142], [292, 176], [350, HZ + 2], [230, HZ + 2], [214, 150]], FX2('#7c7a75', 0.25));
  for (var sr = 0; sr < 60; sr++) { var px2 = 60 + r() * 260, py2 = 150 + r() * 60; rect(x, px2, py2, 3, 2, FX2(r() < 0.5 ? '#a25b48' : '#c9b07a', 0.35)); }
  rect(x, 188, 92, 4, 28, '#e6e4df'); rect(x, 179, 100, 22, 4, '#e6e4df');
  rect(x, 230, 116, 1, 26, FX2('#5e5c58', 0.3)); rect(x, 150, 112, 1, 18, FX2('#5e5c58', 0.3));
  // isla San Lorenzo en el horizonte del mar
  blob(x, [[1120, HZ + 1], [1170, 202], [1230, 190], [1300, 186], [1360, 194], [1440, HZ + 1]], FX2('#aeb0ad', 0.25));
  blob(x, [[1300, 186], [1360, 194], [1440, HZ + 1], [1320, HZ + 1]], FX2('#9c9890', 0.25));
  rect(x, 1100, HZ, 364, 2, '#a0b2bc');
}
function skyLayer(x, w, h, hz) {
  var g = x.createLinearGradient(0, 0, 0, hz);
  g.addColorStop(0, '#8e9196'); g.addColorStop(0.55, '#b4b5b4'); g.addColorStop(1, '#dcdad4');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  var r = rng(31);
  for (var row = 0; row < 8; row++) {
    var y = 10 + row * row * 3.2 + row * 10, ry = 6 + row * 1.5;
    for (var i = -1; i < w / 70 + 1; i++) {
      var cx = i * 70 + r() * 60, rx = 30 + r() * 50, jy = y + (r() - 0.5) * ry * 2.2;
      x.globalAlpha = 0.09 + r() * 0.06; el(x, cx, jy + ry * 0.5, rx, ry * (0.5 + r() * 0.4), '#6f7278');
      x.globalAlpha = 0.07 + r() * 0.06; el(x, cx - rx * 0.2, jy - ry * 0.3, rx * 0.8, ry * 0.5, '#f2f0ea');
    }
  }
  x.globalAlpha = 1;
}
/* capa cercana: el borde del cerro, techos de calamina, cables y ropa tendida */
function nearLayer(x) {
  var r = rng(808), Y0 = NEAR_Y0;
  function ridge(nx) {
    var base = nx < 2050 ? 492 : 512;
    return base + Math.sin(nx * 0.004) * 10 + Math.sin(nx * 0.013 + 1) * 6 + Math.sin(nx * 0.05) * 2;
  }
  // casas con calamina (antes del suelo de adelante)
  var houses = [];
  for (var hx = 20; hx < NEAR_W; hx += 90 + r() * 160) {
    if (hx > 2050 && hx < 2950) continue;
    var hw = 60 + r() * 90, hh = 26 + r() * 36, by = ridge(hx) + 8;
    houses.push([hx, hw, hh, by]);
  }
  houses.forEach(function (hs) {
    var hx = hs[0], hw = hs[1], hh = hs[2], by = hs[3], ty = by - hh;
    rect(x, hx, ty, hw, hh + 20, r() < 0.6 ? '#a25b48' : '#8f5b47');
    for (var by2 = ty + 4; by2 < by + 20; by2 += 5) for (var bx2 = hx + ((by2 / 5) % 2) * 4; bx2 < hx + hw; bx2 += 9) rect(x, bx2, by2, 8, 1, '#7a4a3a');
    if (r() < 0.7) { rect(x, hx + hw * 0.3, ty + 8, 12, 10, '#2a2220'); rect(x, hx + hw * 0.3 + 1, ty + 9, 10, 1, '#5e5a54'); }
    // calamina corrugada, un poco inclinada, con piedras encima para que no se la lleve el viento
    var tilt = (r() - 0.5) * 6;
    poly(x, [[hx - 6, ty + tilt], [hx + hw + 6, ty - tilt], [hx + hw + 4, ty - tilt - 8], [hx - 4, ty + tilt - 8]], '#8e8d86');
    for (var cx = hx - 4; cx < hx + hw + 4; cx += 3) rect(x, cx, ty - 7 + tilt * (1 - 2 * (cx - hx) / hw), 1, 7, (cx / 3) % 2 ? '#a7a9a4' : '#6d6c69');
    for (var rs = 0; rs < 4; rs++) if (r() < 0.6) rect(x, hx + r() * hw, ty - 7, 8 + r() * 6, 3, r() < 0.5 ? '#5a3a30' : '#a7a9a4');
    if (r() < 0.5) el(x, hx + hw * 0.7, ty - 14, 10, 8, '#7a4a3a');
    if (r() < 0.6) { rect(x, hx + hw * 0.15, ty - 20, 12, 12, '#2c2623'); rect(x, hx + hw * 0.15 + 2, ty - 22, 8, 2, '#4a4542'); }
    if (r() < 0.5) for (var rb = 0; rb < 4; rb++) rect(x, hx + hw - 4 - rb * 6, ty - 18, 1, 12, '#5e5a54');
  });
  // suelo del borde del cerro
  var pts = [[0, H]]; for (var nx = 0; nx <= NEAR_W; nx += 6) pts.push([nx, ridge(nx)]); pts.push([NEAR_W, H]);
  poly(x, pts, '#78736c');
  for (var k = 0; k < 900; k++) { var px = r() * NEAR_W, py = ridge(px) + 4 + r() * 60; rect(x, px, py, 2 + r() * 5, 1 + r() * 2, ['#9a8f7b', '#5e5a54', '#8a847a', '#b39b77'][(r() * 4) | 0]); }
  for (var st = 0; st < 120; st++) { var sx2 = r() * NEAR_W, sy2 = ridge(sx2) + r() * 20; el(x, sx2, sy2, 3 + r() * 6, 2 + r() * 3, r() < 0.5 ? '#8a847a' : '#5e5a54'); el(x, sx2 - 1, sy2 - 1, 2, 1, '#c4b08e'); }
  // postes, cables y ropa tendida
  var poles = [120, 520, 980, 1450, 1900, 3050];
  poles.forEach(function (px2) { var top = ridge(px2) - 150; rect(x, px2, top, 5, ridge(px2) - top + 4, '#6d6c69'); rect(x, px2 - 14, top + 8, 33, 3, '#5e5a54'); rect(x, px2 + 1, top, 1, ridge(px2) - top, '#8e8d86'); });
  for (var p = 0; p < poles.length - 1; p++) {
    var a = poles[p], b = poles[p + 1], ya = ridge(a) - 142, yb = ridge(b) - 142;
    if (b - a > 700) continue;
    for (var c = 0; c < 3; c++) {
      x.strokeStyle = '#1c1c1e'; x.lineWidth = 1.4; x.beginPath(); x.lineWidth = 1.2; x.moveTo(a - 12 + c * 14, ya + 2 + c * 3); x.quadraticCurveTo((a + b) / 2, Math.max(ya, yb) + 30 + c * 16, b - 12 + c * 14, yb + 2 + c * 3); x.stroke();
    }
  }
  var cloth = ['#a8483f', '#3f4c85', '#d2a545', '#e6e4df', '#5e7a62', '#7b6a8a', '#c98a82'];
  [[260, 420], [1250, 1420], [1620, 1780], [2990, 3150]].forEach(function (ln) {
    var y1 = ridge(ln[0]) - 62, y2 = ridge(ln[1]) - 60;
    rect(x, ln[0], y1, 3, 64, '#6f6a5a'); rect(x, ln[1], y2, 3, 64, '#6f6a5a');
    x.strokeStyle = '#2c2623'; x.lineWidth = 1.3; x.beginPath(); x.moveTo(ln[0], y1 + 2); x.quadraticCurveTo((ln[0] + ln[1]) / 2, y1 + 14, ln[1], y2 + 2); x.stroke();
    for (var cx2 = ln[0] + 10; cx2 < ln[1] - 16; cx2 += 16 + r() * 10) {
      var tt = (cx2 - ln[0]) / (ln[1] - ln[0]), cy2 = lerp(y1, y2, tt) + 2 + Math.sin(tt * Math.PI) * 7, col = cloth[(r() * cloth.length) | 0];
      if (r() < 0.5) { poly(x, [[cx2, cy2], [cx2 + 14, cy2], [cx2 + 16, cy2 + 6], [cx2 + 12, cy2 + 6], [cx2 + 12, cy2 + 18], [cx2 + 2, cy2 + 18], [cx2 + 2, cy2 + 6], [cx2 - 2, cy2 + 6]], col); }
      else { poly(x, [[cx2, cy2], [cx2 + 12, cy2], [cx2 + 13, cy2 + 20], [cx2 + 7, cy2 + 20], [cx2 + 6, cy2 + 8], [cx2 + 5, cy2 + 20], [cx2 - 1, cy2 + 20]], col); }
      rect(x, cx2 + 1, cy2 - 1, 2, 2, '#e6e4df');
    }
  });
  // yerbas secas
  for (var wd = 0; wd < 80; wd++) { var wx = r() * NEAR_W, wy = ridge(wx); for (var bl = 0; bl < 4; bl++) { x.strokeStyle = '#9a8f7b'; x.lineWidth = 1; x.beginPath(); x.moveTo(wx + bl * 2, wy + 2); x.lineTo(wx + bl * 3 - 2 + r() * 4, wy - 5 - r() * 6); x.stroke(); } }
}
function paraglider(col) {
  return layer(0, 0, 24, 24, function (x) {
    x.strokeStyle = col; x.lineWidth = 3; x.beginPath(); x.arc(12, 12, 10, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
    x.strokeStyle = '#5e5c58'; x.lineWidth = 0.8; x.beginPath(); x.moveTo(3, 8); x.lineTo(12, 20); x.lineTo(21, 8); x.stroke();
    rect(x, 11, 19, 2, 3, '#3a3836');
  }, PAL_CITY, {});
}
function glowSprite(r, dens) {
  return layer(0, 0, r * 2 + 2, r * 2 + 2, function (x) { el(x, r + 1, r + 1, r, r, '#5cff9c'); }, Pal(['#5cff9c', '#b8ffd2', '#1fe07a']), { mask: dens });
}
function buildPano() {
  var S = {};
  S.sky = layer(0, 0, SKY_W, 300, function (x) { skyLayer(x, SKY_W, 300, HZ); }, PAL_SKY, { dither: 16 });
  S.far = layer(0, 60, FAR_W, HZ + 4 - 60, farLayer, PAL_CITY, { dither: 6, outline: 0.9 });
  S.mid = layer(0, MID_Y0, PW, H - MID_Y0, midLayer, PAL_CITY, { dither: 8, outline: 0.82 });
  S.near = layer(0, NEAR_Y0, NEAR_W, H - NEAR_Y0, nearLayer, PAL_NEAR, { outline: 0.45 });
  S.pg = [paraglider('#a8483f'), paraglider('#c9b07a')];
  S.glow = [glowSprite(14, 0.25), glowSprite(8, 0.5), glowSprite(3, 1)];
  var r = rng(4), gl = [];
  while (gl.length < 70) { var gx = 1400 + r() * 1000, gy = HZ + 4 + r() * 330; if (gy > coastY(gx) + cliffH(gx) + 10 && !(gx > 2165 && gy < 400)) gl.push([gx, gy, r() * TAU]); }
  S.glint = gl;
  S.smoke = [[430, 300, 1, 1], [705, 332, 1, 1], [1135, 286, 0.8, 0], [600, 258, 0.6, 0]];
  S.birds = [{ x: 200, y: 80, rx: 60, ry: 14, v: 0.4, p: 0 }, { x: 520, y: 60, rx: 45, ry: 12, v: -0.5, p: 1 }, { x: 760, y: 110, rx: 70, ry: 16, v: 0.35, p: 3 }, { x: 300, y: 140, rx: 40, ry: 10, v: 0.6, p: 2, s: 0.8 }, { x: 880, y: 70, rx: 50, ry: 12, v: -0.4, p: 5, s: 0.8 }];
  return S;
}
function drawPanoAt(ctx, camX, t, yOff) {
  var S = PANO; yOff = yOff || 0;
  camX = clamp(camX, 0, PW - W);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#dcdad4'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(S.sky.c, -Math.round(camX * 0.1), 0);
  drawVultures(ctx, t, S.birds, 0.9, -camX * 0.2);
  ctx.drawImage(S.far.c, -Math.round(camX * 0.35), S.far.y);
  var mx = Math.round(camX);
  ctx.drawImage(S.mid.c, mx, 0, W, S.mid.c.height, 0, MID_Y0, W, S.mid.c.height);
  // humo e incendios
  for (var i = 0; i < S.smoke.length; i++) {
    var sm = S.smoke[i], sx = sm[0] - mx;
    if (sx < -200 || sx > W + 60) continue;
    if (sm[3]) { var ff = fireFr(Math.floor(t * 10 + i) % 3); ctx.drawImage(ff.c, Math.round(sx - 8), sm[1] - 14); }
    smokeCol(ctx, t, sx, sm[1] - 10, sm[2], 22, i);
  }
  // brillo del mar
  ctx.fillStyle = '#e6e4df';
  for (var g = 0; g < S.glint.length; g++) { var gp = S.glint[g], gx = gp[0] - mx; if (gx < 0 || gx > W) continue; if (Math.sin(t * 2.6 + gp[2]) > 0.82) ctx.fillRect(Math.round(gx), gp[1], gp[1] > 420 ? 3 : 2, 1); }
  // parapentes
  for (var p = 0; p < 2; p++) { var pgx = 1690 + p * 95 + Math.sin(t * 0.35 + p * 2) * 26 - mx, pgy = 286 + p * 22 + Math.sin(t * 0.6 + p) * 7; if (pgx > -30 && pgx < W) ctx.drawImage(S.pg[p].c, Math.round(pgx), Math.round(pgy)); }
  // la luz verde: baliza que parpadea en la torre
  var lx = CURE.x - mx, ly = CURE.y, on = (t * 1.25) % 1 < 0.5;
  if (lx > -40 && lx < W + 40) {
    var g2 = S.glow[on ? 0 : 1]; ctx.drawImage(g2.c, Math.round(lx - g2.c.width / 2), Math.round(ly - g2.c.height / 2));
    if (on) { var g3 = S.glow[1]; ctx.drawImage(g3.c, Math.round(lx - g3.c.width / 2), Math.round(ly - g3.c.height / 2)); }
    var g4 = S.glow[2]; ctx.drawImage(g4.c, Math.round(lx - g4.c.width / 2), Math.round(ly - g4.c.height / 2));
  }
  ctx.drawImage(S.near.c, -Math.round(camX * 1.6), NEAR_Y0);
  drizzle(ctx, t, 140, '#e2e1dc', 2, 0, 0, W, H);
  ctx.restore();
}
function drawPano(ctx, camX, t) { ready(); drawPanoAt(ctx, camX, t); }

/* ============================ T3: EL HÉROE (contrapicado) ============================ */
var HERO = null, NWF = 6;          // NWF: cuadros de viento (pelo + camiseta)
var FX = 556, FY = 200;            // centro del acercamiento: la cara

function heroSky(x) {
  var g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#888b91'); g.addColorStop(0.45, '#a9abac'); g.addColorStop(1, '#d6d5cf');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // panza de burro vista desde abajo: filas de bultos, la panza oscura y el lomo claro
  var r = rng(77);
  for (var row = 0; row < 9; row++) {
    var y = -10 + row * row * 6 + row * 14, ry = 10 + row * 3;
    for (var i = -1; i < 14; i++) {
      var cx = i * 80 + r() * 60 + (row % 2) * 40, rx = 40 + r() * 60, jy = y + (r() - 0.5) * ry * 1.8;
      x.globalAlpha = 0.1 + r() * 0.08; el(x, cx, jy + ry * 0.55, rx, ry * (0.5 + r() * 0.4), '#6f7278');
      x.globalAlpha = 0.08 + r() * 0.08; el(x, cx - rx * 0.15, jy - ry * 0.25, rx * 0.8, ry * 0.5, '#f2f0ea');
    }
  }
  x.globalAlpha = 1;
}
/* el rayo de luz: grieta en las nubes arriba a la izquierda + haces tramados hacia la cara */
function heroRay(lv) {
  var open = lv / 4;
  var beams = layer(0, 0, W, H, function (x) {
    var ox = 210, oy = -10;
    var targets = [[470, 540, 150], [610, 330, 90], [760, 540, 120], [350, 540, 70]];
    for (var i = 0; i < targets.length; i++) {
      var tg = targets[i], wd = tg[2] * (0.4 + 0.6 * open);
      poly(x, [[ox - 40 * open + i * 22, oy], [ox + 40 * open + i * 26, oy], [tg[0] + wd / 2, tg[1]], [tg[0] - wd / 2, tg[1]]], '#f6e8b8');
    }
  }, PAL_SKY, { mask: 0.12 + 0.16 * open });
  var crack = layer(0, 0, 600, 170, function (x) {
    var s = 0.35 + 0.65 * open, r = rng(9);
    function rag(cx, cy, rx, ry, n, j) { var P = []; for (var a = 0; a < n; a++) { var an = a / n * TAU, k = 1 - j * r(); P.push([cx + Math.cos(an) * rx * k, cy + Math.sin(an) * ry * k]); } return P; }
    x.globalAlpha = 0.5; el(x, 240, 10, 230 * s, 70 * s, '#e9e6de'); x.globalAlpha = 1;
    poly(x, rag(240, 6, 190 * s, 52 * s, 26, 0.45), '#d9b27a');
    poly(x, rag(236, 4, 150 * s, 38 * s, 24, 0.4), '#e9c27c');
    poly(x, rag(232, 2, 112 * s, 26 * s, 20, 0.35), '#f6e8b8');
    poly(x, rag(228, 0, 66 * s, 15 * s, 16, 0.3), '#fff6d8');
    // bordes de nube encendidos
    for (var b = 0; b < 7; b++) { var bx = 120 + b * 36 + r() * 10, by = 34 * s + 8 + r() * 14; curve(x, [[bx - 20 * s, by], [bx, by + 5], [bx + 20 * s, by]], '#f2d28a', 2); }
  }, PAL_SKY, { dither: 10 });
  var c = cv(W, H), x = c.getContext('2d');
  x.drawImage(beams.c, 0, 0); x.drawImage(crack.c, 0, 0);
  return { c: c, x: 0, y: 0 };
}

/* --- ayudas de sombreado por bandas (cel) --- */
/* rellena P con tres tonos: sombra en el borde de abajo a la derecha (corrimiento ds), luz en el de arriba a la izquierda (dl) */
function cel(x, P, cD, cM, cL, ds, dl) {
  ds = ds || [2, 3]; dl = dl || [3, 4];
  x.save(); x.clip(P);
  x.fillStyle = cD; x.fill(P);
  x.translate(-ds[0], -ds[1]); x.fillStyle = cM; x.fill(P); x.clip(P);
  x.translate(ds[0], ds[1]);
  if (cL) { x.fillStyle = cL; x.fill(P); x.translate(dl[0], dl[1]); x.fillStyle = cM; x.fill(P); }
  x.restore();
}
function sp(pts) { return crPath(pts, true); }
function fillP(x, P, c) { x.fillStyle = c; x.fill(P); }
function lineP(x, P, c, w) { x.strokeStyle = c; x.lineWidth = w; x.lineJoin = 'round'; x.stroke(P); }
function clipDo(x, P, f) { x.save(); x.clip(P); f(); x.restore(); }
function elP(cx, cy, rx, ry, rot) { var p = new Path2D(); p.ellipse(cx, cy, rx, ry, rot || 0, 0, TAU); return p; }
/* mechón redondeado: línea central -> contorno suave, con bandas */
function lockP(pts, w0, w1) { return sp(taper(pts, w0, w1)); }

/* --- geometría de la cabeza: 3/4 hacia la izquierda, contrapicado suave, el mentón un poco arriba ---
   Coordenadas globales del cuadro (960x540) antes de girar la cabeza (headXf). */
var FPATH = null, HEAD_ROT = 0.05, HPX = 560, HPY = 330;
function headXf(x) { x.translate(HPX, HPY); x.rotate(HEAD_ROT); x.translate(-HPX, -HPY); }
function headPt(px, py) { var dx = px - HPX, dy = py - HPY, c = Math.cos(HEAD_ROT), s = Math.sin(HEAD_ROT); return [HPX + dx * c - dy * s, HPY + dx * s + dy * c]; }
var FACE = [[480, 128], [512, 108], [560, 98], [612, 110], [640, 140], [648, 180], [646, 220], [638, 248], [620, 270], [592, 288], [558, 301], [530, 304], [507, 297], [488, 280], [472, 252], [464, 222], [466, 199], [463, 183], [468, 156]];
var HAIRM = [[466, 172], [460, 140], [470, 110], [492, 88], [524, 74], [562, 68], [604, 70], [640, 80], [666, 98], [684, 124], [690, 154], [682, 182], [670, 198], [654, 204], [648, 180], [642, 152], [624, 132], [596, 124], [560, 122], [528, 126], [500, 134], [480, 150]];
var NOSE_TIP = [519, 233];

function heroHead(x) {
  var F = sp(FACE); FPATH = F;
  // oreja del lado cercano (derecha), detrás de la mejilla
  var EAR = sp([[634, 186], [648, 176], [664, 182], [671, 200], [667, 222], [656, 240], [640, 244]]);
  lineP(x, EAR, SK.o, 2); cel(x, EAR, SK.d, SK.m, SK.l, [3, 3], [2, 3]);
  curve(x, [[652, 191], [661, 203], [659, 220], [650, 232]], SK.d, 4);
  curve(x, [[655, 197], [657, 210], [653, 222]], SK.dd, 2);
  // cara: base y contorno interior (contra el cuello y la oreja)
  lineP(x, F, SK.o, 2); fillP(x, F, SK.m);
  x.save(); x.clip(F);
  // luz (arriba a la izquierda): frente, borde de la mejilla lejana, pómulo cercano, mentón
  blob(x, [[470, 150], [500, 116], [556, 104], [600, 112], [580, 128], [540, 136], [506, 152], [480, 176]], SK.l);
  blob(x, [[460, 196], [478, 204], [488, 228], [484, 258], [468, 252]], SK.l);
  el(x, 514, 291, 12, 6, SK.l, 0.2);
  // sombra: el plano del costado junto a la oreja y la quijada (menos del 30 % de la piel)
  blob(x, [[628, 128], [652, 150], [656, 200], [648, 244], [628, 274], [596, 294], [556, 306], [574, 292], [600, 274], [618, 246], [626, 208], [622, 166]], SK.d);
  blob(x, [[640, 160], [660, 190], [652, 240], [636, 262], [642, 220]], SK.dd);
  // sombra del fleco sobre la frente
  x.save(); x.translate(3, 7); heroFringe(x, 0, SK.d); x.restore();
  // brillos chiquitos y rubor
  blob(x, [[500, 130], [520, 121], [542, 120], [526, 129], [506, 136]], SK.hl);
  el(x, 572, 216, 5, 2, SK.hl, -0.2);
  el(x, 591, 241, 13, 6, SK.ck, -0.15); el(x, 476, 241, 5, 5, SK.ck);
  x.restore();
  // nariz chica y redonda, marcada con sombra (no con contorno)
  blob(x, [[536, 202], [542, 206], [546, 224], [546, 238], [539, 246], [530, 246], [538, 232], [538, 214]], SK.d);
  blob(x, [[510, 242], [524, 248], [540, 246], [549, 242], [541, 252], [521, 253]], SK.d);
  el(x, 521, 233, 9, 8, SK.m); el(x, 518, 230, 5, 4, SK.l); rect(x, 515, 228, 3, 2, SK.hl);
  curve(x, [[531, 206], [527, 218], [522, 226]], SK.l, 3);
  curve(x, [[527, 240], [534, 238], [541, 242]], SK.d, 2);
  el(x, 532, 244, 3.5, 1.8, SK.dd, 0.2);
}

/* el fleco: mechones redondeados que caen sobre la frente hacia la derecha (también sirve para su sombra) */
var FRINGE = [[[[500, 110], [516, 126], [526, 144], [530, 156]], 38, 10], [[[536, 104], [556, 122], [570, 142], [578, 158]], 44, 10], [[[580, 108], [600, 122], [614, 140], [618, 150]], 34, 9]];
function heroFringe(x, ph, solid) {
  for (var j = 0; j < FRINGE.length; j++) {
    var f = FRINGE[j], n = f[0].length, q = f[0].map(function (p, i) { var u = i / (n - 1), wv = Math.sin(ph + j * 1.3) * 1.6 * u; return [p[0] + wv, p[1] + wv * 0.4]; });
    var P = lockP(q, f[1], f[2]);
    if (solid) { fillP(x, P, solid); continue; }
    cel(x, P, HR.d, HR.m, j === 1 ? HR.l : null, [2, 2], [4, 4]);
  }
}

/* --- pelo: corto y desordenado, mechones redondeados; el viento lo tira hacia atrás y a la derecha --- */
var LOCKS = [   // [línea central raíz -> punta, ancho raíz, ancho punta, vaivén]: pocos mechones grandes y redondos, con cielo entre las puntas
  [[[650, 170], [672, 186], [680, 204]], 34, 18, 2], [[[656, 134], [690, 140], [708, 160]], 50, 24, 4], [[[628, 100], [664, 82], [692, 84]], 54, 26, 4],
  [[[586, 86], [604, 56], [632, 44]], 56, 26, 3], [[[540, 90], [546, 58], [568, 40]], 54, 26, 3], [[[500, 108], [490, 80], [504, 58]], 48, 22, 2]
];
function heroHair(x, ph) {
  blob(x, HAIRM, HR.m);
  for (var j = 0; j < LOCKS.length; j++) {
    var L = LOCKS[j], n = L[0].length, amp = L[3];
    var q = L[0].map(function (p, i) { var u = i / (n - 1), wv = Math.sin(ph + j * 0.9 + u * 2.4) * amp * u; return [p[0] + wv * 0.35, p[1] + wv]; });
    cel(x, lockP(q, L[1], L[2]), HR.d, HR.m, null, [2, 3]);
    // banda de luz corta y curva que sigue el mechón por su lado de arriba a la izquierda
    var band = [], hi = [], gx = q[n - 1][0] - q[0][0], gy = q[n - 1][1] - q[0][1], gl = Math.hypot(gx, gy) || 1, nx = gy / gl, ny = -gx / gl;
    if (nx + ny > 0) { nx = -nx; ny = -ny; }   // la normal que mira arriba a la izquierda, fija para todo el mechón
    for (var u = 0.2; u <= 0.62; u += 0.07) {
      var t = u * (n - 1), i0 = Math.min(n - 2, Math.floor(t)), f = t - i0, a = q[i0], b = q[i0 + 1];
      var px = lerp(a[0], b[0], f), py = lerp(a[1], b[1], f);
      var off = lerp(L[1], L[2], u) * 0.24;
      band.push([px + nx * off, py + ny * off]); if (u > 0.3 && u < 0.5) hi.push([px + nx * off * 1.1, py + ny * off * 1.1]);
    }
    curve(x, band, HR.l, 3.5); if (hi.length > 1) curve(x, hi, HR.hl, 2);
  }
  // patilla corta delante de la oreja
  var SB = lockP([[640, 146], [646, 166], [646, 188]], 14, 8); cel(x, SB, HR.d, HR.m, HR.l, [2, 2], [2, 2]);
  heroFringe(x, ph);
}

/* --- camiseta de rayas al viento, cuello en V azul, correa café, puño en la correa y el mástil al hombro --- */
function heroStripes(x, ph, cw, cb) {
  x.fillStyle = cw; x.fillRect(240, 320, 760, 240);
  for (var i = -11; i < 13; i++) {
    var xc = 560 + i * 32, L = [], R = [];
    for (var y = 326; y <= 560; y += 9) {
      var spread = (xc - 560) * (y - 340) / 420 * 0.45;
      var fold = Math.sin(y * 0.045 + ph + xc * 0.02) * 5 * (0.3 + Math.max(0, (xc - 480) / 360));
      var cx = xc + spread + fold;
      L.push([cx - 8, y]); R.push([cx + 8, y]);
    }
    x.fillStyle = cb; x.fill(polyP(L.concat(R.reverse())));
  }
}
function heroBody(x, ph) {
  var s = Math.sin(ph), c2 = Math.cos(ph), s2 = Math.sin(ph * 2 + 1);
  // mástil de la guitarra asomando por detrás del hombro derecho
  poly(x, [[790, 406], [814, 412], [858, 250], [836, 244]], GT.d);
  poly(x, [[799, 406], [810, 409], [852, 250], [844, 248]], GT.dd);
  for (var f = 0; f < 8; f++) { var fy = 392 - f * 18, fx = 804 + (406 - fy) * 0.287; rect(x, fx - 5, fy, 11, 1, GT.metal); }
  poly(x, [[830, 252], [866, 246], [878, 196], [846, 202]], GT.head); poly(x, [[834, 250], [842, 249], [852, 204], [846, 205]], GT.l);
  for (var p = 0; p < 3; p++) { el(x, 838 - p, 240 - p * 14, 4, 3, GT.metal); el(x, 874 - p, 234 - p * 14, 4, 3, GT.metal); }
  poly(x, [[818, 326], [842, 330], [838, 346], [814, 342]], GT.tape);
  // brazo en jarra a la izquierda (sale del cuadro)
  var AL = sp([[300, 480], [346, 498], [340, 548], [262, 548], [282, 508]]);
  lineP(x, AL, SK.o, 2); cel(x, AL, SK.d, SK.m, SK.l, [6, 4], [5, 4]);
  // la parte de atrás del cuello de la camiseta
  curve(x, [[500, 348], [560, 330], [626, 342]], BL.d, 10);
  // cuello natural (corto) y el pecho en la V
  var NECK = sp([[522, 250], [604, 244], [608, 296], [616, 342], [598, 372], [562, 404], [526, 372], [508, 344], [516, 296]]);
  fillP(x, NECK, SK.m);
  clipDo(x, NECK, function () {
    blob(x, [[588, 244], [614, 250], [620, 346], [598, 372], [592, 320]], SK.d);
    blob(x, [[498, 270], [560, 296], [616, 266], [618, 312], [580, 326], [540, 326], [504, 308]], SK.d);   // sombra de la quijada
    curve(x, [[606, 304], [590, 332], [572, 360]], SK.d, 3);
    el(x, 546, 340, 4, 7, SK.l);
    blob(x, [[512, 344], [562, 394], [614, 344], [604, 374], [562, 410], [522, 376]], SK.d);
  });
  // camiseta
  var shirt = [[510, 340], [470, 350], [420, 362], [372, 378], [336, 402], [312, 434], [298 + s * 3, 474], [306, 494], [334, 490], [340, 548],
    [904, 548], [914 + s2 * 6, 520], [946 + s * 10, 508], [964 + c2 * 8, 484], [926 + s * 6, 468], [930 + s2 * 6, 444], [896, 414], [850, 394], [790, 378], [700, 360], [624, 340], [594, 372], [562, 400], [532, 372]];
  var SP = sp(shirt);
  x.save(); x.clip(SP);
  heroStripes(x, ph, WH.l, BL.m);
  var LT = new Path2D();
  LT.addPath(sp([[300, 470], [312, 430], [340, 400], [376, 380], [424, 364], [500, 346], [480, 374], [430, 392], [380, 414], [344, 444], [322, 480]]));
  for (var w2 = 0; w2 < 3; w2++) { var a2 = 400 + w2 * 120 + c2 * 6, b2 = 446 + w2 * 18; LT.addPath(sp([[a2, b2], [a2 + 60, b2 + 16], [a2 + 104, b2 + 40], [a2 + 50, b2 + 28]])); }
  clipDo(x, LT, function () { heroStripes(x, ph, WH.hl, BL.l); });
  var SH2 = new Path2D();
  SH2.addPath(sp([[770, 392], [900, 420], [970, 480], [970, 548], [830, 548], [810, 470]]));
  SH2.addPath(sp([[516, 346], [562, 398], [612, 344], [640, 352], [600, 414], [560, 424], [520, 412], [494, 356]]));
  SH2.addPath(polyP([[800, 392], [818, 398], [528, 548], [500, 548]]));
  for (var w = 0; w < 4; w++) { var a = 420 + w * 100 + s * 8 * (w % 2 ? 1 : -1), b = 420 + w * 20; SH2.addPath(sp([[a, b], [a + 70, b + 28 + c2 * 6], [a + 140, b + 66], [a + 124, b + 74], [a + 52, b + 42]])); }
  clipDo(x, SH2, function () { heroStripes(x, ph, WH.d, BL.d); });
  x.restore();
  // cuello en V azul
  curve(x, [[504, 338], [534, 370], [562, 398], [592, 370], [624, 336]], BL.m, 10);
  curve(x, [[506, 334], [534, 365], [562, 392], [590, 365], [622, 332]], BL.l, 2.5);
  curve(x, [[514, 348], [538, 376], [562, 404], [586, 376], [612, 348]], BL.dd, 2);
  // correa de la guitarra en diagonal
  poly(x, [[770, 380], [804, 388], [508, 548], [466, 548]], GT.strap);
  poly(x, [[772, 381], [781, 383], [477, 548], [468, 548]], GT.strapL);
  poly(x, [[798, 387], [804, 388], [508, 548], [500, 548]], GT.strapD);
  for (var st = 0; st < 12; st++) { var tt = (st + 0.5) / 12; rect(x, lerp(787, 487, tt), lerp(386, 548, tt) - 1, 2, 2, GT.tape); }
  // antebrazo y puño que agarra la correa: los dedos se cierran por encima de la correa y el pulgar la pisa
  var ARM = sp([[612, 488], [648, 478], [702, 548], [626, 548]]);
  lineP(x, ARM, SK.o, 2); cel(x, ARM, SK.d, SK.m, SK.l, [6, 0], [4, 0]);
  x.save(); x.translate(628, 468); x.rotate(-0.5);   // eje x local = dirección de la correa
  var BH = sp([[-24, -2], [24, -4], [27, 16], [16, 32], [-12, 32], [-25, 16]]);
  lineP(x, BH, SK.o, 3); cel(x, BH, SK.d, SK.m, SK.l, [4, 4], [3, 3]);
  for (var fg = 0; fg < 4; fg++) {   // cuatro dedos doblados sobre la correa
    var FG = sp([[-23 + fg * 12, -14], [-17 + fg * 12, -19], [-11 + fg * 12, -14], [-11 + fg * 12, 2], [-17 + fg * 12, 6], [-23 + fg * 12, 2]]);
    lineP(x, FG, SK.o, 2.5); cel(x, FG, SK.d, SK.m, SK.l, [2, 3], [2, 2]);
    rect(x, -20 + fg * 12, -15, 4, 2, SK.hl);
  }
  var TH = sp([[-34, -2], [-30, -14], [-18, -24], [-4, -26], [2, -20], [-12, -16], [-24, -6]]);   // pulgar
  lineP(x, TH, SK.o, 2.5); cel(x, TH, SK.d, SK.m, SK.l, [2, 3], [2, 2]); rect(x, -4, -24, 3, 2, SK.hl);
  curve(x, [[-18, 14], [-2, 18], [14, 14]], SK.d, 2);   // tendones del dorso
  x.restore();
}
function heroCharFrame(k) {
  var ph = k / NWF * TAU;
  return layer(200, 20, 760, 520, function (x) { heroBody(x, ph); x.save(); headXf(x); heroHead(x); heroHair(x, ph); x.restore(); }, PAL_CHAR, { outline: 0.45, olmap: OL_CHAR });
}

/* --- capas de la cara (sin contorno): ojos con cejas y boca --- */
function heroEye(x, P, ix, iy, ir) {
  x.save(); x.clip(P);
  fillP(x, P, EY.sc);
  el(x, ix, iy, ir, ir, EY.irisL); el(x, ix - 0.8, iy - 0.8, ir - 1.4, ir - 1.4, EY.iris); el(x, ix - 0.8, iy - 0.8, ir * 0.45, ir * 0.45, EY.pup);
  x.restore();
  rect(x, ix - ir * 0.55, iy - ir * 0.6, 2, 2, '#ffffff'); rect(x, ix + ir * 0.3, iy + ir * 0.3, 1, 1, EY.sc);
}
function brow(x, pts, lift) {
  var P = sp(pts.map(function (p) { return [p[0], p[1] - (lift || 0)]; }));
  fillP(x, P, HR.m); clipDo(x, P, function () { x.translate(2, 3); fillP(x, P, HR.d); x.translate(-2, -3); });
  curve(x, [[pts[1][0], pts[1][1] - (lift || 0) + 1], [pts[2][0], pts[2][1] - (lift || 0) + 1]], HR.l, 2);
}
var BROW_N = [[556, 181], [566, 172], [586, 167], [604, 168], [611, 173], [604, 176], [586, 174], [568, 178], [560, 185]];
var BROW_F = [[478, 183], [486, 175], [502, 173], [520, 176], [527, 182], [520, 184], [504, 181], [488, 182], [480, 187]];
function heroEyes(kind) {
  return layer(436, 130, 230, 110, function (x) {
    headXf(x);
    if (kind === 'blink') {
      // apretados >< : mejillas empujadas arriba, cejas abajo y arrugas
      el(x, 584, 214, 18, 7, SK.l, -0.1); el(x, 495, 214, 11, 6, SK.l, 0.1);
      curve(x, [[568, 221], [584, 224], [600, 218]], SK.d, 2); curve(x, [[486, 220], [496, 222], [506, 219]], SK.d, 2);
      svgS(x, 'M600 185 L572 193 L600 201', EY.lash, 3.5); svgS(x, 'M487 187 L509 194 L487 201', EY.lash, 3.5);
      curve(x, [[603, 188], [610, 186]], SK.d, 2); curve(x, [[604, 194], [611, 195]], SK.d, 2); curve(x, [[602, 200], [608, 204]], SK.d, 2);
      curve(x, [[482, 189], [477, 187]], SK.d, 2); curve(x, [[482, 199], [477, 202]], SK.d, 2);
      brow(x, BROW_N.map(function (p, i) { return [p[0] - 3, p[1] + 8 + (i === 0 || i === 8 ? 5 : 0)]; }));
      brow(x, BROW_F.map(function (p, i) { return [p[0] + 3, p[1] + 8 + (i === 3 || i === 4 ? 5 : 0)]; }));
      curve(x, [[536, 182], [539, 192]], SK.d, 2); curve(x, [[544, 184], [545, 191]], SK.d, 2);
      return;
    }
    if (kind === 'wide') {
      heroEye(x, elP(580, 191, 17, 11), 577, 190, 8); heroEye(x, elP(499, 193, 12, 10), 497, 192, 6.5);
      svgS(x, 'M562 188 Q578 176 598 184', EY.lash, 3); svgS(x, 'M486 190 Q497 181 512 187', EY.lash, 3);
      brow(x, BROW_N, 9); brow(x, BROW_F, 8);
      return;
    }
    // heroica: firmes, mirando lejos arriba a la izquierda (al rayo)
    heroEye(x, new Path2D('M561 195 Q572 184 590 184 Q599 186 601 191 Q592 200 576 200 Q566 199 561 195 Z'), 574, 190, 8);
    heroEye(x, new Path2D('M486 197 Q492 188 505 188 Q512 190 514 194 Q506 200 495 200 Q489 200 486 197 Z'), 494, 192, 6.5);
    svgS(x, 'M558 196 Q571 182 591 183 Q600 185 604 189', EY.lash, 3); curve(x, [[601, 188], [607, 184]], EY.lash, 2);
    svgS(x, 'M483 198 Q490 186 506 187 Q513 189 515 193', EY.lash, 3);
    svgS(x, 'M565 201 Q580 203 596 196', SK.d, 1.5); svgS(x, 'M489 201 Q500 203 511 198', SK.d, 1.5);
    svgS(x, 'M566 180 Q584 176 598 180', SK.d, 1.5);
    brow(x, BROW_N); brow(x, BROW_F);
  }, PAL_FACE, {});
}
function heroMouth(kind) {
  return layer(466, 190, 170, 120, function (x) {
    headXf(x);
    if (kind === 'scrunch') {
      curve(x, [[530, 204], [537, 208]], SK.d, 2); curve(x, [[528, 212], [536, 214]], SK.d, 2);
      el(x, 586, 236, 12, 6, SK.l); el(x, 481, 236, 6, 4, SK.l);
      var M = sp([[516, 263], [530, 259], [546, 261], [560, 257], [562, 266], [546, 271], [530, 271], [516, 268]]);
      fillP(x, M, MO.th); svgS(x, 'M518 265 Q530 263 546 266 Q554 267 561 262', MO.thD, 1.5);
      lineP(x, M, MO.dk, 2);
      curve(x, [[526, 278], [538, 280], [550, 277]], SK.d, 2);
      return;
    }
    if (kind === 'smirk') {
      // media sonrisa de lado con el diente chueco
      var S = new Path2D('M515 265 Q536 270 559 254 Q557 264 546 270 Q532 276 515 265 Z');
      fillP(x, S, MO.ins);
      clipDo(x, S, function () {
        fillP(x, new Path2D('M512 264 Q536 270 562 252 L562 259 Q537 275 512 268 Z'), MO.th);
        el(x, 537, 276, 10, 3, MO.tg);
        rect(x, 527, 266, 1, 3, MO.thD); rect(x, 548, 263, 1, 3, MO.thD);
      });
      x.save(); x.translate(538, 269); x.rotate(0.28); rect(x, -3, -3, 6, 6, MO.th); rect(x, -3, 2, 6, 1, MO.thD); rect(x, 2, -3, 1, 5, MO.thD); x.restore();
      svgS(x, 'M512 264 Q536 270 561 251', MO.dk, 2);
      curve(x, [[562, 246], [566, 254], [563, 262]], SK.d, 2);
      curve(x, [[524, 278], [538, 279], [550, 275]], SK.d, 2);
      el(x, 578, 246, 9, 4, SK.l, -0.2);
      return;
    }
    svgS(x, 'M516 266 Q536 263 557 262', MO.ins, 2.5); curve(x, [[556, 262], [561, 264]], SK.d, 1.5);
    curve(x, [[527, 273], [538, 275], [549, 273]], SK.d, 2);
  }, PAL_FACE, {});
}
function heroNostrils() {
  return layer(500, 220, 60, 40, function (x) {
    headXf(x);
    el(x, 532, 244, 4.6, 2.4, SK.dd, 0.2); curve(x, [[525, 238], [534, 235], [543, 241]], SK.d, 2.5);
  }, PAL_FACE, {});
}
/* luz cálida del rayo (de arriba a la izquierda): borde encendido que crece con lv, sin tramado en la cara */
function heroWarm(lv) {
  return layer(436, 20, 300, 320, function (x) {
    headXf(x);
    var F = sp(FACE);
    clipDo(x, F, function () {
      x.clip(polyP([[430, 150], [540, 150], [500, 200], [486, 330], [430, 330]]));
      lineP(x, F, SK.w, 2 + lv);
    });
    curve(x, [[531, 207], [526, 221]], SK.wh, 2);
    if (lv >= 3) { rect(x, 514, 227, 4, 2, SK.wh); el(x, 584, 215, 6, 2, SK.w, -0.2); }
  }, PAL_FACE, {});
}

/* --- Titina: paloma gris de verdad. Coordenadas locales: (0,0) = patas, mira a la izquierda --- */
function pigeon(x, state, fr, lod) {
  var puffed = state === 'puff' || state === 'look', w = fr ? 2 : 0, k = puffed ? 1 : 0, det = lod !== 0;
  var hx = puffed ? -30 : -36, hy = puffed ? -120 : -104;
  // patas rosadas agarradas al hombro
  [-10, 8].forEach(function (lx, i) {
    rect(x, lx - 2, -18, 5, 15, PG.foot); rect(x, lx + 2, -18, 1, 15, PG.footD);
    blob(x, [[lx - 12, -5], [lx + 6, -6], [lx + 9, -1], [lx + 4, 1], [lx - 13, 1]], PG.foot);
    curve(x, [[lx - 10, -4], [lx + 4, -5]], PG.footL, 1.5);
    rect(x, lx - 15, -2, 3, 3, PG.claw); rect(x, lx + 8, -1, 2, 3, PG.claw);
  });
  // cola con su banda oscura
  var TAIL = sp([[24, -54], [70, -48], [108, -38 - w], [121, -30 - w], [117, -19 - w * 0.5], [70, -22], [22, -30]]);
  cel(x, TAIL, PG.d, PG.m, PG.l, [0, 3], [0, 3]);
  clipDo(x, TAIL, function () {
    x.fillStyle = PG.dd; x.fillRect(97, -70, 13, 70); x.fillStyle = PG.k; x.fillRect(100, -70, 8, 70); x.fillStyle = PG.d; x.fillRect(110, -70, 14, 70);
    if (det) { curve(x, [[40, -44], [80, -38], [118, -27 - w]], PG.d, 1.2); curve(x, [[40, -34], [80, -30], [116, -22 - w]], PG.d, 1.2); }
  });
  // cuerpo y pecho redondo
  var BODY = sp([[-38 - 6 * k, -80 - 6 * k], [-6, -88], [30, -80], [62, -64], [80, -46], [70, -28], [40, -18], [6, -13], [-26, -20], [-48 - 6 * k, -38], [-54 - 8 * k, -62]]);
  cel(x, BODY, PG.d, PG.m, PG.l, [4, 6], [5, 5]);
  clipDo(x, BODY, function () {
    el(x, -24 - 4 * k, -48 - 3 * k, 26 + 6 * k, 26 + 4 * k, PG.l); el(x, -30 - 4 * k, -56 - 3 * k, 14 + 3 * k, 12 + 2 * k, PG.hl);
    el(x, -4, -14, 40, 10, PG.d);
    if (det && puffed) { curve(x, [[-46, -40], [-40, -30]], PG.m, 1.5); curve(x, [[-36, -30], [-30, -22]], PG.m, 1.5); }
  });
  // cuello tornasolado: verde arriba, morado abajo, en degradado de cuatro pasos
  var NECK = sp([[hx - 14, hy + 2], [hx - 2, hy + 10], [hx + 14, hy + 2], [hx + 18, hy + 14], [-2, -76], [-12, -58], [-34, -50 - 2 * k], [-52 - 6 * k, -56 - 2 * k], [-56 - 6 * k, -72 - 4 * k], [hx - 16, hy + 16]]);
  fillP(x, NECK, PG.g);
  clipDo(x, NECK, function () {
    var top = hy + 8, bot = -52, band = (bot - top) / 4, cols = [PG.g, PG.g2, PG.g3, PG.p];
    for (var b = 1; b < 4; b++) {
      var y0 = top + band * b, pts = [];
      for (var xx = -70; xx <= 30; xx += 4) pts.push([xx, y0 + Math.sin(xx * 0.32 + b * 1.7) * 3 + (xx + 30) * 0.3]);
      pts.push([30, 20], [-70, 20]); poly(x, pts, cols[b]);
    }
    el(x, hx - 6, hy + 18, 6, 3, PG.gl, -0.5); el(x, -44 - 4 * k, -64 - 2 * k, 7, 3, PG.pl, -0.4);
    curve(x, [[hx + 14, hy + 8], [-6, -78]], PG.g1, 4); curve(x, [[-6, -74], [-12, -58]], PG.p2, 4);
  });
  // ala plegada: cobertoras en escamas, dos barras negras y las primarias oscuras en filas
  var WING = sp([[-10, -76], [14, -84], [44, -78], [74, -62], [100, -45 - w * 0.5], [96, -36], [70, -34], [36, -38], [8, -46], [-12, -58]]);
  lineP(x, WING, PG.dd, 2); cel(x, WING, PG.m, PG.l, PG.hl, [2, 4], [3, 3]);
  clipDo(x, WING, function () {
    x.fillStyle = PG.d; x.fill(polyP([[66, -80], [110, -60], [110, -30], [62, -30]]));
    if (det) {
      x.lineWidth = 1.5; x.strokeStyle = PG.m;
      for (var r = 0; r < 4; r++) for (var c = 0; c < 6; c++) { var sx = -6 + c * 9 + r * 4, sy = -74 + r * 7; if (sx > 34) continue; x.beginPath(); x.arc(sx, sy, 4.5, 0.15, Math.PI - 0.15); x.stroke(); }
      for (var i = 0; i < 5; i++) { curve(x, [[64 + i * 7, -62 + i * 4], [96 + i * 2, -46 + i * 2]], PG.dd, 1.5); curve(x, [[63 + i * 7, -64 + i * 4], [94 + i * 2, -48 + i * 2]], PG.m, 1); }
    }
    poly(x, [[36, -82], [45, -82], [42, -36], [33, -36]], PG.k); poly(x, [[53, -78], [62, -76], [58, -34], [49, -34]], PG.k);
    curve(x, [[46, -78], [44, -40]], PG.hl, 1.2); curve(x, [[63, -72], [60, -38]], PG.hl, 1.2);
  });
  if (fr && det) blob(x, [[16, -84], [26, -92], [30, -84]], PG.l);
  // cabeza chica y redonda
  var HEADP = elP(hx, hy, 15, 14);
  cel(x, HEADP, PG.d, PG.m, PG.l, [2, 3], [3, 3]);
  x.save(); x.translate(hx, hy);
  if (state === 'look') x.scale(-1, 1);   // gira la cabeza hacia Alexander
  if (puffed) x.rotate(0.25);              // copia la pose heroica: el pico arriba
  var ex = -5, ey = -3;
  el(x, -10, 8, 7, 4, PG.l);
  if (state === 'blink') { el(x, ex, ey, 4.5, 4.5, PG.ring); curve(x, [[ex - 4, ey], [ex, ey + 2], [ex + 4, ey]], PG.dd, 2); }
  else {
    el(x, ex, ey, 4.6, 4.6, PG.ring); el(x, ex, ey, 3.2, 3.2, PG.eye); el(x, ex + 1, ey + 1, 1.6, 1.6, PG.eyeD);
    rect(x, ex - 1, ey - 1, 2, 2, PG.k); rect(x, ex - 2, ey - 2, 1, 1, '#ffffff');
  }
  if (puffed && state !== 'look') poly(x, [[ex - 7, ey - 7], [ex + 5, ey - 6], [ex + 5, ey - 4], [ex - 6, ey - 4]], PG.dd);   // ceja fruncida de paloma heroica
  poly(x, [[-12, -2], [-26, 2], [-24, 4.5], [-12, 4]], PG.beak); rect(x, -24, 3, 9, 1, PG.k);
  el(x, -14, -2.5, 4, 2.5, PG.cere);
  x.restore();
}
var TIT_O = [392, 378], TIT_S = 1.05;
function titinaHero(state, fr) {
  return layer(250, 200, 320, 200, function (x) {
    x.translate(TIT_O[0], TIT_O[1]); x.scale(TIT_S, TIT_S);
    pigeon(x, state, fr, 1);
  }, PAL_PIG, { outline: 0.4, olmap: OL_CHAR });
}

function bagFrame(fr) {
  return layer(0, 0, 90, 80, function (x) {
    x.translate(45, 40); x.rotate(fr * 1.3); var sq = [1, 0.8, 1.1, 0.9][fr];
    blob(x, [[-26 * sq, -16], [0, -24 / sq], [28 * sq, -12], [24, 18], [0, 22], [-24, 16]], '#e6e6e0');
    blob(x, [[-14, -6], [8, -14], [20, 2], [4, 14], [-16, 10]], '#c4c4c0');
    curve(x, [[-6, -18], [4, -12], [14, -6]], '#f6f4ea', 2);
    x.strokeStyle = '#e6e6e0'; x.lineWidth = 4; x.beginPath(); x.ellipse(-16 * sq, -24, 7, 9, -0.4, 0, TAU); x.stroke();
    x.beginPath(); x.ellipse(14 * sq, -24, 7, 9, 0.4, 0, TAU); x.stroke();
  }, PAL_MISC, { outline: 0.55 });
}
function dropSprite(splash) {
  return layer(0, 0, 30, 24, function (x) {
    if (splash) {
      [[4, 14], [9, 8], [21, 8], [26, 14], [15, 4]].forEach(function (p) { el(x, p[0], p[1], 2, 2, '#c9d6de'); });
      el(x, 15, 18, 6, 3, '#dfe8ec'); return;
    }
    poly(x, [[15, 2], [19, 12], [15, 17], [11, 12]], '#9fb0c4'); el(x, 15, 13, 4, 4, '#9fb0c4'); rect(x, 13, 11, 2, 3, '#ffffff');
  }, PAL_MISC, { outline: 0.6 });
}

function buildHero() {
  var t0 = performance.now(), S = {};
  S.sky = layer(0, 0, W, H, heroSky, PAL_SKY, { dither: 18 });
  S.ray = [null];
  for (var l = 1; l <= 4; l++) S.ray.push(heroRay(l));
  S.chr = []; for (var k = 0; k < NWF; k++) S.chr.push(heroCharFrame(k));
  S.eyes = { heroic: heroEyes('heroic'), blink: heroEyes('blink'), wide: heroEyes('wide') };
  S.mouth = { serious: heroMouth('serious'), smirk: heroMouth('smirk'), scrunch: heroMouth('scrunch') };
  S.nos = heroNostrils();
  S.warm = [null]; for (var w = 1; w <= 4; w++) S.warm.push(heroWarm(w));
  S.tit = {};
  ['normal', 'puff', 'blink', 'look'].forEach(function (st) { S.tit[st] = [titinaHero(st, 0), titinaHero(st, 1)]; });
  S.bag = [0, 1, 2, 3].map(bagFrame);
  S.drop = dropSprite(false); S.splash = dropSprite(true);
  S.birds = [{ x: 250, y: 100, rx: 90, ry: 26, v: 0.35, p: 0, s: 1.3 }, { x: 380, y: 60, rx: 60, ry: 16, v: -0.45, p: 2, s: 1 }, { x: 800, y: 70, rx: 80, ry: 20, v: 0.3, p: 4, s: 1.15 }, { x: 140, y: 190, rx: 50, ry: 14, v: 0.5, p: 1, s: 0.8 }];
  S.ms = performance.now() - t0;
  return S;
}

function drawHero(ctx, t, s) {
  ready(); s = s || {}; var S = HERO;
  var p = clamp(s.push || 0, 0, 1), k = 1 + 0.08 * p, ks = 1 + 0.03 * p, ray = clamp(s.ray || 0, 0, 1);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.save(); ctx.translate(FX, FY); ctx.scale(ks, ks); ctx.translate(-FX, -FY);
  put(ctx, S.sky);
  var lv = Math.round(ray * 4); if (lv > 0) put(ctx, S.ray[lv]);
  drawVultures(ctx, t, S.birds, 1.6);
  ctx.restore();
  ctx.save(); ctx.translate(FX, FY); ctx.scale(k, k); ctx.translate(-FX, -FY);
  // bolsa de plástico cruzando con el viento (detrás de Alexander)
  var bag = s.bag || 0;
  if (bag > 0 && bag < 1) { var bf = S.bag[Math.floor(t * 9) % 4], bx = lerp(-100, 1060, bag), by = 150 + Math.sin(bag * 9) * 45 - bag * 60; ctx.drawImage(bf.c, Math.round(bx - 45), Math.round(by - 40)); }
  var breath = Math.sin(t * 2.2) > 0.6 ? 1 : 0;
  var fr = Math.floor(t * 9) % NWF;
  put(ctx, S.chr[fr], 0, breath);
  if (lv > 0) put(ctx, S.warm[lv], 0, breath);
  var flare = ((t + 0.3) % 1.7) < 0.32;
  if (flare && s.mouth !== 'scrunch') put(ctx, S.nos, 0, breath);
  put(ctx, S.eyes[s.eyes] || S.eyes.heroic, 0, breath);
  put(ctx, S.mouth[s.mouth] || S.mouth.serious, 0, breath);
  var ts = S.tit[s.titina] || S.tit.normal, tf = ts[Math.floor(t * 6) % 2];
  put(ctx, tf, 0, (Math.sin(t * 3) > 0.7 ? 1 : 0) + breath);
  var drop = s.drop || 0;
  if (drop > 0 && drop < 0.98) { var np = headPt(NOSE_TIP[0], NOSE_TIP[1] - 10), dy = lerp(-30, np[1] - 17, drop * drop); ctx.drawImage(S.drop.c, Math.round(np[0] - 15), Math.round(dy + breath)); }
  else if (drop >= 0.98) { var np2 = headPt(NOSE_TIP[0], NOSE_TIP[1] - 8); ctx.drawImage(S.splash.c, Math.round(np2[0] - 15), Math.round(np2[1] - 18 + breath)); }
  ctx.restore();
  drizzle(ctx, t, 110, '#e4e3de', 3, 0, 0, W, H);
  ctx.restore();
}

/* ============================ T1: LA CIMA (de espaldas) ============================ */
var BACK = null, BX = 380, BY = 236;   // esquina del cuadro de la figura (200x250) cuando está de pie
var T1_HZ = 330;

function backBg() {
  // la ciudad gris, chiquita y lejos, abajo en la garúa (reusa las capas del panorama a escala)
  var c = cv(W, H), x = c.getContext('2d', { willReadFrequently: true });
  skyLayer(x, W, H, T1_HZ);
  x.imageSmoothingEnabled = true;
  x.drawImage(PANO.far.c, 160, 0, PANO.far.c.width - 160, PANO.far.c.height, 0, T1_HZ - (HZ - 60) * 0.6, (PANO.far.c.width - 160) * 0.6, PANO.far.c.height * 0.6);
  var ms = 0.45, mh = PANO.mid.c.height;
  x.drawImage(PANO.mid.c, 140, 0, W / ms, mh, 0, T1_HZ - (HZ - MID_Y0) * ms, W, mh * ms);
  x.globalAlpha = 0.28; x.fillStyle = FOG; x.fillRect(0, T1_HZ - 40, W, 200); x.globalAlpha = 1;
  return pixelate(c, PAL_CITY, { dither: 10 });
}
function summit(x) {
  var r = rng(61);
  var pts = [[0, H], [0, 452], [90, 446], [200, 455], [330, 462], [400, 470], [560, 470], [640, 462], [760, 452], [880, 440], [960, 436], [960, H]];
  blob(x, pts, '#78736c');
  blob(x, [[0, 470], [120, 462], [260, 478], [330, 500], [300, H], [0, H]], '#5e5a54');
  blob(x, [[660, 480], [800, 466], [960, 456], [960, H], [700, H]], '#5e5a54');
  for (var i = 0; i < 500; i++) { var px = r() * W, py = 450 + r() * 90; if (px > 395 && px < 565 && py > 468) continue; rect(x, px, py, 2 + r() * 4, 1 + r() * 2, ['#9a8f7b', '#4a4542', '#8a847a', '#b39b77'][(r() * 4) | 0]); }
  for (var s = 0; s < 40; s++) { var sx = r() * W, sy = 455 + r() * 80; if (sx > 380 && sx < 580) continue; el(x, sx, sy, 4 + r() * 9, 3 + r() * 4, r() < 0.5 ? '#8a847a' : '#4a4542'); el(x, sx - 2, sy - 2, 3, 1.5, '#c4b08e'); }
  // la escalera de concreto que sube al cerro
  poly(x, [[398, 470], [562, 470], [566, 500], [394, 500]], '#a7a9a4');
  poly(x, [[398, 470], [562, 470], [562, 474], [398, 474]], '#c4c6c0');
  poly(x, [[392, 500], [568, 500], [572, 506], [388, 506]], '#c4c6c0');
  poly(x, [[388, 506], [572, 506], [576, 540], [384, 540]], '#a7a9a4');
  for (var k = 0; k < 40; k++) rect(x, 400 + r() * 160, 476 + r() * 60, 2 + r() * 6, 1, '#8e8d86');
  rect(x, 470, 482, 30, 1, '#6d6c69'); rect(x, 430, 520, 40, 1, '#6d6c69');
  // baranda de tubo oxidado
  rect(x, 588, 428, 4, 112, '#7a4a3a'); rect(x, 620, 420, 4, 120, '#7a4a3a');
  x.strokeStyle = '#8f5b47'; x.lineWidth = 4; x.beginPath(); x.moveTo(580, 540); x.lineTo(590, 430); x.lineTo(624, 420); x.stroke();
  rect(x, 589, 440, 2, 60, '#b8735a');
  // yerbas y una botella vieja
  for (var w = 0; w < 30; w++) { var wx = r() * W, wy = 448 + r() * 14; if (wx > 380 && wx < 600) continue; for (var b = 0; b < 4; b++) { x.strokeStyle = '#9a8f7b'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(wx + b * 2, wy + 2); x.lineTo(wx + b * 3 - 3 + r() * 4, wy - 6 - r() * 8); x.stroke(); } }
  x.save(); x.translate(700, 478); x.rotate(1.2); rect(x, -4, -12, 8, 18, '#5e7a62'); rect(x, -2, -16, 4, 5, '#5e7a62'); rect(x, -2, -10, 2, 12, '#a7a9a4'); x.restore();
}
/* figura de espaldas, ~220 px de alto. Cuadro local 200x250, pies en y=232. Hoja de personaje v0.10 */
function backLegs(pose) {
  return layer(0, 0, 200, 250, function (x) {
    function calf(x0, y0, x1, y1, w0) {
      var P = lockP([[x0, y0], [lerp(x0, x1, 0.4) + 1, lerp(y0, y1, 0.4)], [x1, y1]], w0, w0 * 0.62);
      lineP(x, P, SK.o, 2); cel(x, P, SK.d, SK.m, SK.l, [4, 0], [3, 0]);
      curve(x, [[x0 - 3, y0 + 8], [x0 + 3, y0 + 10]], SK.d, 1.5);   // pliegue de la corva
    }
    function heel(cx, y) { rect(x, cx - 8, y, 16, 4, SD.m); rect(x, cx - 8, y, 16, 1, SD.l); rect(x, cx - 7, y + 4, 14, 3, SD.d); rect(x, cx - 7, y - 6, 14, 3, SD.m); rect(x, cx - 6, y - 3, 12, 3, SK.d); }
    function sole(cx, y) { blob(x, [[cx - 9, y], [cx + 9, y], [cx + 8, y + 15], [cx, y + 18], [cx - 8, y + 15]], SD.d); blob(x, [[cx - 6, y + 2], [cx + 6, y + 2], [cx + 5, y + 12], [cx - 5, y + 12]], SD.m); rect(x, cx - 7, y - 4, 14, 4, SK.d); }
    if (pose === 2) { calf(80, 172, 76, 224, 17); heel(76, 224); calf(120, 172, 125, 224, 17); heel(125, 224); }
    else if (pose === 1) { calf(80, 172, 78, 216, 17); sole(78, 214); calf(120, 172, 124, 224, 17); heel(124, 224); }
    else { calf(80, 172, 76, 230, 17); heel(76, 232); calf(122, 172, 126, 194, 16); sole(126, 190); }
    // short verde olivo
    var SHP = sp([[62, 136], [138, 136], [146, 172], [108, 180], [100, 168], [92, 180], [54, 172]]);
    cel(x, SHP, SH.d, SH.m, SH.l, [4, 3], [3, 3]);
    curve(x, [[100, 146], [100, 168]], SH.dd, 2); curve(x, [[70, 160], [86, 170]], SH.d, 2); curve(x, [[118, 168], [136, 162]], SH.d, 2);
    curve(x, [[64, 141], [100, 139], [136, 141]], SH.dd, 3); rect(x, 112, 148, 12, 9, SH.d); rect(x, 112, 148, 12, 1, SH.l);
  }, PAL_CHAR, { outline: 0.45, olmap: OL_CHAR });
}
function backStripes(x, ph, cw, cb) {
  x.fillStyle = cw; x.fillRect(0, 40, 200, 120);
  for (var i = -7; i < 8; i++) {
    var xc = 100 + i * 10, L = [], R = [];
    for (var y = 56; y <= 156; y += 6) { var cx = xc + Math.sin(y * 0.08 + ph + i) * 2 * (xc > 100 ? 1.5 : 0.6) + (xc - 100) * (y - 60) / 300; L.push([cx - 2.5, y]); R.push([cx + 2.5, y]); }
    x.fillStyle = cb; x.fill(polyP(L.concat(R.reverse())));
  }
}
function backUpper(k) {
  var ph = k / NWF * TAU, s = Math.sin(ph), c2 = Math.cos(ph);
  return layer(0, 0, 200, 250, function (x) {
    // brazos relajados, puños listos (luz desde la izquierda)
    var AL = lockP([[60, 92], [56, 124], [54, 152]], 14, 11); lineP(x, AL, SK.o, 2); cel(x, AL, SK.d, SK.m, SK.l, [4, 0], [3, 0]);
    var FL = elP(54, 159, 7, 8); cel(x, FL, SK.d, SK.m, SK.l, [2, 2], [2, 2]); curve(x, [[49, 158], [58, 162]], SK.dd, 1.5);
    var AR = lockP([[140, 92], [145, 124], [148, 152]], 14, 11); lineP(x, AR, SK.o, 2); cel(x, AR, SK.dd, SK.d, SK.m, [4, 0], [3, 0]);
    var FR = elP(148, 159, 7, 8); cel(x, FR, SK.dd, SK.d, SK.m, [2, 2], [2, 2]); curve(x, [[144, 158], [153, 162]], SK.dd, 1.5);
    // cuello corto y orejas
    var NK = sp([[89, 46], [111, 46], [113, 68], [87, 68]]); cel(x, NK, SK.d, SK.m, SK.l, [4, 0], [3, 0]); rect(x, 88, 50, 24, 5, SK.d);
    var E1 = elP(79, 40, 4, 7), E2 = elP(121, 40, 4, 7);
    cel(x, E1, SK.d, SK.m, SK.l, [1, 1], [1, 1]); cel(x, E2, SK.dd, SK.d, SK.m, [1, 1], [1, 1]);
    // camiseta de rayas de espaldas, inflada a la derecha por el viento
    var sh = [[64, 70], [84, 63], [116, 63], [138, 70], [152 + s * 3, 82], [160 + c2 * 4, 100], [144, 104], [140, 126], [150 + s * 5, 142], [138, 147], [100, 149], [64, 146], [60, 128], [58, 104], [44, 100], [50, 82]];
    var P = sp(sh);
    x.save(); x.clip(P);
    backStripes(x, ph, WH.l, BL.m);
    clipDo(x, sp([[50, 80], [64, 70], [90, 64], [84, 84], [66, 100], [52, 100]]), function () { backStripes(x, ph, WH.hl, BL.l); });
    var SD2 = new Path2D(); SD2.addPath(sp([[118, 70], [162, 90], [156, 146], [124, 148], [132, 110]])); SD2.addPath(sp([[60, 120 + s * 2], [100, 126], [140, 134], [100, 141]]));
    clipDo(x, SD2, function () { backStripes(x, ph, WH.d, BL.d); });
    x.restore();
    curve(x, [[84, 64], [100, 67], [116, 64]], BL.m, 4); curve(x, [[86, 63], [100, 65], [114, 63]], BL.l, 1.2);
    // guitarra en la espalda: la caja por detrás (con su costura) y el mástil por el hombro izquierdo
    x.save(); x.translate(94, 114); x.rotate(-0.42);
    rect(x, -4, -98, 8, 72, GT.m); rect(x, -4, -98, 2, 72, GT.l); rect(x, 2, -98, 2, 72, GT.d);
    rect(x, -5, -112, 10, 16, GT.head); rect(x, -8, -108, 3, 3, GT.metal); rect(x, 5, -108, 3, 3, GT.metal); rect(x, -8, -101, 3, 3, GT.metal); rect(x, 5, -101, 3, 3, GT.metal);
    rect(x, -4, -70, 8, 7, GT.tape);
    var GB = new Path2D(); GB.ellipse(0, 18, 27, 24, 0, 0, TAU); GB.ellipse(0, -14, 20, 18, 0, 0, TAU); GB.rect(-15, -8, 30, 22);
    lineP(x, GB, GT.dd, 2); cel(x, GB, GT.d, GT.m, GT.l, [6, 3], [4, 4]);
    curve(x, [[0, -30], [0, 41]], GT.d, 1.5);
    rect(x, -16, 16, 10, 6, GT.tape); rect(x, -16, 16, 10, 1, '#e8e2d6');
    x.restore();
    // correa cruzando la espalda
    curve(x, [[66, 70], [104, 106], [140, 140]], GT.strap, 5); curve(x, [[66, 68], [104, 104], [140, 138]], GT.strapL, 1.2);
    // cabeza de espaldas: mechones redondeados al viento
    var HB = elP(100, 36, 21, 22); cel(x, HB, HR.d, HR.m, HR.l, [3, 3], [4, 4]);
    var BL2 = [[[[80, 22], [88, 13], [100, 10], [112, 12]], 13, 6], [[[86, 22], [100, 15], [114, 19], [124, 28]], 17, 7], [[[82, 32], [98, 27], [114, 31], [126, 41]], 17, 7],
      [[[80, 44], [96, 41], [112, 45], [122, 53]], 15, 6], [[[86, 50], [92, 57]], 9, 5], [[[98, 51], [104, 58]], 9, 5], [[[109, 50], [116, 56]], 9, 5]];
    for (var j = 0; j < BL2.length; j++) {
      var L2 = BL2[j], n = L2[0].length;
      var q = L2[0].map(function (p, i) { var u = i / (n - 1), wv = Math.sin(ph + j + u * 3) * 2.2 * u; return [p[0] + wv * 0.4, p[1] + wv]; });
      cel(x, lockP(q, L2[1], L2[2]), HR.d, HR.m, HR.l, [1, 2], [2, 2]);
      if (j < 3) curve(x, [[q[0][0] + 2, q[0][1] - 3], [q[1][0], q[1][1] - 4]], HR.hl, 1.5);
    }
    // Titina en el hombro derecho de la imagen, mirando la ciudad
    x.save(); x.translate(140, 68); x.scale(0.24, 0.24); pigeon(x, 'normal', k % 2, 0); x.restore();
  }, PAL_BOTH, { outline: 0.45, olmap: OL_CHAR });
}
function buildBack() {
  var S = {};
  S.bg = backBg();
  S.summit = layer(0, 420, W, H - 420, summit, PAL_NEAR, { outline: 0.5 });
  S.legs = [0, 1, 2].map(backLegs);
  S.up = []; for (var k = 0; k < NWF; k++) S.up.push(backUpper(k));
  S.birds = [{ x: 220, y: 120, rx: 70, ry: 16, v: 0.35, p: 0 }, { x: 760, y: 90, rx: 60, ry: 14, v: -0.4, p: 2 }, { x: 640, y: 180, rx: 40, ry: 10, v: 0.5, p: 1, s: 0.7 }];
  S.smoke = [[130, 352], [610, 372]];
  return S;
}
function drawBack(ctx, t, climb) {
  ready(); var S = BACK; climb = clamp(climb == null ? 1 : climb, 0, 1);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(S.bg, 0, 0);
  for (var i = 0; i < S.smoke.length; i++) smokeCol(ctx, t, S.smoke[i][0], S.smoke[i][1], 0.4, 10, i + 3);
  drawVultures(ctx, t, S.birds, 1);
  put(ctx, S.summit);
  var pose = climb < 0.4 ? 0 : climb < 0.75 ? 1 : 2;
  var dy = Math.round(lerp(36, 0, ease(climb / 0.85))), lean = pose === 0 ? 4 : pose === 1 ? 2 : 0;
  var fr = Math.floor(t * 9) % NWF, breath = pose === 2 && Math.sin(t * 2.2) > 0.6 ? 1 : 0;
  ctx.drawImage(S.legs[pose].c, BX, BY + dy);
  ctx.drawImage(S.up[fr].c, BX, BY + dy + lean + breath);
  drizzle(ctx, t, 130, '#e2e1dc', 2, 0, 0, W, H);
  ctx.restore();
}

/* ============================ MAPA CHICHA ============================ */
var CH = { k: '#0a0a0c', pink: '#ff2e88', yel: '#ffe500', yel2: '#ffc400', grn: '#1fe07a', grnD: '#0f8a4a', wh: '#f6f4ea', g1: '#1a1a1f', g2: '#2a2a31', g3: '#3c3c46', g4: '#5a5a66', sea: '#0c1730', sea2: '#16305e', sea3: '#2b5fd9' };
var PAL_MAP = Pal([CH.k, CH.pink, '#c41f68', '#ff86bd', CH.yel, CH.yel2, '#fff4a0', CH.grn, CH.grnD, '#a8ffcc', CH.wh, CH.g1, CH.g2, CH.g3, CH.g4, '#8a8a96', CH.sea, CH.sea2, CH.sea3, '#3a1830', '#5c2448',
  '#c9c9be', '#2a1810', '#a8714c', '#34261f', '#1f2f66', '#e6e6e0', '#5d6150', '#8e939b', '#3f9a7c', '#8a5aa6', '#78736c', '#e07a2a']);
var LAND = [[178, 58], [930, 58], [930, 526], [652, 526], [624, 492], [580, 458], [524, 424], [466, 390], [408, 354], [350, 318], [296, 282], [250, 246], [214, 212],
  [176, 196], [128, 190], [122, 182], [150, 176], [190, 168], [184, 128], [176, 92]];
var SEEDS = {
  'callao': [222, 140], 'rimac': [560, 104], 'cercado': [590, 188], 'brena': [494, 204], 'san-miguel': [300, 238], 'pueblo-libre': [400, 242],
  'jesus-maria': [478, 266], 'magdalena': [362, 296], 'lince': [548, 290], 'la-victoria': [648, 252], 'san-isidro': [468, 330], 'miraflores': [530, 392],
  'surquillo': [618, 360], 'barranco': [588, 446], 'chorrillos': [676, 494],
  '_smp': [470, 100], '_sjl': [880, 92], '_agustino': [890, 200], '_sanborja': [900, 315], '_surco': [910, 440], '_comas': [330, 70]
};
var NAMES = { 'san-miguel': 'San Miguel', 'magdalena': 'Magdalena', 'pueblo-libre': 'Pueblo Libre', 'jesus-maria': 'Jesús María', 'lince': 'Lince', 'san-isidro': 'San Isidro',
  'miraflores': 'Miraflores', 'barranco': 'Barranco', 'chorrillos': 'Chorrillos', 'surquillo': 'Surquillo', 'la-victoria': 'La Victoria', 'brena': 'Breña',
  'cercado': 'Cercado de Lima', 'rimac': 'Rímac', 'callao': 'Callao' };
var START = [236, 160];
var RIVER = [[930, 150], [690, 146], [628, 146], [566, 150], [506, 158], [446, 162], [380, 168], [316, 172], [262, 180], [222, 192], [200, 204]];
function clipHalf(pts, a, b) {   // se queda con el lado de a respecto a la mediatriz de a-b
  var out = [], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, nx = b[0] - a[0], ny = b[1] - a[1];
  function f(p) { return (p[0] - mx) * nx + (p[1] - my) * ny; }
  for (var i = 0; i < pts.length; i++) {
    var p = pts[i], q = pts[(i + 1) % pts.length], fp = f(p), fq = f(q);
    if (fp <= 0) out.push(p);
    if ((fp <= 0) !== (fq <= 0)) { var t = fp / (fp - fq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  }
  return out;
}
function wob(p) {   // desplazamiento que depende solo de la posición: los bordes compartidos coinciden
  var x = p[0], y = p[1];
  if (x >= 929 || y <= 59 || y >= 525) return [Math.round(x), Math.round(y)];
  return [Math.round(x + 3 * Math.sin(x * 0.071 + y * 0.053) + 1.5 * Math.sin(y * 0.19 - x * 0.04)), Math.round(y + 3 * Math.sin(y * 0.067 - x * 0.049 + 1) + 1.5 * Math.sin(x * 0.17 + 2))];
}
function roughen(pts) {
  var out = [];
  for (var i = 0; i < pts.length; i++) {
    var a = pts[i], b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 10));
    for (var k = 0; k < n; k++) out.push(wob([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]));
  }
  return out;
}
function centroid(pts) {
  var A = 0, cx = 0, cy = 0;
  for (var i = 0; i < pts.length; i++) { var p = pts[i], q = pts[(i + 1) % pts.length], c = p[0] * q[1] - q[0] * p[1]; A += c; cx += (p[0] + q[0]) * c; cy += (p[1] + q[1]) * c; }
  A /= 2; return [Math.round(cx / (6 * A)), Math.round(cy / (6 * A))];
}
(function stretch() {   // estira el este-oeste para que los distritos tengan aire
  function T(p) { if (p[0] < 929) p[0] = Math.min(929, Math.round(150 + (p[0] - 150) * 1.32)); }
  LAND.forEach(T); RIVER.forEach(T); START.length && T(START);
  Object.keys(SEEDS).forEach(function (k) { if (k.charAt(0) !== '_') T(SEEDS[k]); });
})();
var MAPD = (function () {
  var all = {}, ids = Object.keys(SEEDS);
  ids.forEach(function (id) {
    var P = LAND.slice();
    ids.forEach(function (o) { if (o !== id) P = clipHalf(P, SEEDS[id], SEEDS[o]); });
    P = P.map(function (p) { return [Math.round(p[0] * 2) / 2, Math.round(p[1] * 2) / 2]; });
    all[id] = roughen(P);
  });
  var districts = {};
  ids.forEach(function (id) { if (id.charAt(0) !== '_') { var c = centroid(all[id]); if (id === 'callao') c = [START[0] - 12, START[1] - 52]; districts[id] = { name: NAMES[id], poly: all[id], label: c }; } });
  return { all: all, districts: districts };
})();
var MAP = null;

function mapBase() {
  var c = cv(W, H), x = c.getContext('2d', { willReadFrequently: true }), r = rng(5150);
  x.fillStyle = CH.k; x.fillRect(0, 0, W, H);
  // mar a la izquierda, con olas chicha
  var land = roughen(LAND);
  x.fillStyle = CH.sea; x.fillRect(20, 40, 920, 496);
  for (var wy = 50; wy < 530; wy += 14) { x.strokeStyle = (wy / 14) % 2 ? CH.sea2 : CH.sea3; x.lineWidth = 2; x.beginPath(); for (var wx = 24; wx < 700; wx += 4) { var yy = wy + Math.sin(wx * 0.09 + wy) * 3; wx === 24 ? x.moveTo(wx, yy) : x.lineTo(wx, yy); } x.stroke(); }
  // isla San Lorenzo y El Frontón
  blob(x, [[60, 236], [92, 222], [118, 230], [126, 252], [96, 262], [66, 256]], CH.g3); blob(x, [[134, 268], [144, 264], [148, 272], [138, 276]], CH.g3);
  rect(x, 76, 226, 3, 10, CH.wh); rect(x, 75, 224, 5, 3, CH.yel);
  // tierra: relleno de base (los distritos van encima)
  poly(x, land, CH.g1);
  // distritos de relleno (no se escogen): oscuros con puntitos
  Object.keys(MAPD.all).forEach(function (id) {
    if (id.charAt(0) !== '_') return;
    var P = MAPD.all[id]; poly(x, P, '#121216');
    x.save(); x.clip(polyP(P)); x.fillStyle = CH.g2; for (var yy = 0; yy < H; yy += 6) for (var xx = (yy / 6) % 2 * 3; xx < W; xx += 6) x.fillRect(xx, yy, 1, 1); x.restore();
    x.strokeStyle = CH.g3; x.lineWidth = 2; x.stroke(polyP(P));
  });
  // costa fluorescente
  x.strokeStyle = '#c41f68'; x.lineWidth = 4; x.beginPath();
  for (var i = 4; i < land.length; i++) { var p = land[i]; if (p[0] >= 929 || p[1] <= 59) continue; x.lineTo(p[0] - 3, p[1] + 3); } x.stroke();
  // textura de afiche impreso: motas y raspones
  for (var k = 0; k < 1800; k++) { var px = r() * W, py = r() * H; x.fillStyle = r() < 0.5 ? '#000000' : '#2a2a31'; x.fillRect(px, py, 1 + (r() < 0.2), 1); }
  // marco de afiche: rosado + amarillo
  x.strokeStyle = CH.pink; x.lineWidth = 6; x.strokeRect(12, 34, 936, 500);
  x.strokeStyle = CH.yel; x.lineWidth = 2; x.strokeRect(22, 44, 916, 480);
  for (var tk = 0; tk < 60; tk++) { rect(x, 30 + tk * 15, 528, 7, 2, tk % 2 ? CH.grn : CH.pink); }
  return pixelate(c, PAL_MAP, {});
}
function riverLayer() {
  return layer(0, 0, W, H, function (x) {
    curve(x, RIVER, CH.sea3, 7); curve(x, RIVER, '#7fb0ff', 2);
    for (var i = 0; i < RIVER.length - 1; i += 2) rect(x, RIVER[i][0], RIVER[i][1] - 1, 3, 1, CH.wh);
  }, Pal([CH.sea3, '#7fb0ff', CH.wh, CH.sea2]), {});
}
function padlock(x, cx, cy) {
  // cinta de peligro detrás del candado
  x.save(); x.translate(cx, cy); x.rotate(-0.35);
  rect(x, -26, -5, 52, 10, CH.yel); for (var s = -26; s < 26; s += 8) poly(x, [[s, -5], [s + 4, -5], [s + 0, 5], [s - 4, 5]], CH.k);
  x.restore();
  x.strokeStyle = '#8a8a96'; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy - 6, 6, Math.PI, 0); x.stroke();
  rect(x, cx - 9, cy - 6, 18, 14, '#c9c9be'); rect(x, cx - 9, cy + 4, 18, 4, '#8a8a96'); rect(x, cx - 1, cy - 2, 3, 6, CH.k);
}
function districtSprite(id, state, pulse) {
  var D = MAPD.districts[id], P = D.poly, xs = P.map(function (p) { return p[0]; }), ys = P.map(function (p) { return p[1]; });
  var bx = Math.min.apply(null, xs) - 8, by = Math.min.apply(null, ys) - 8, bw = Math.max.apply(null, xs) - bx + 16, bh = Math.max.apply(null, ys) - by + 16;
  var lb = D.label;
  var L = layer(bx, by, bw, bh, function (x) {
    var path = polyP(P);
    var fill = state === 'open' ? (pulse ? CH.yel : CH.yel2) : state === 'visited' ? CH.grn : state === 'home' ? '#3a1830' : CH.g2;
    x.fillStyle = fill; x.fill(path);
    x.save(); x.clip(path);
    if (state === 'locked') { x.fillStyle = CH.g3; for (var d = -600; d < 600; d += 7) { x.beginPath(); x.moveTo(bx + d, by); x.lineTo(bx + d + 2, by); x.lineTo(bx + d + 2 + bh, by + bh); x.lineTo(bx + d + bh, by + bh); x.fill(); } }
    if (state === 'visited') { x.fillStyle = CH.grnD; for (var yy = by; yy < by + bh; yy += 5) for (var xx = bx + (yy % 2) * 2; xx < bx + bw; xx += 5) x.fillRect(xx, yy, 2, 2); }
    if (state === 'open') { x.fillStyle = '#fff4a0'; for (var y2 = by; y2 < by + bh; y2 += 6) for (var x2 = bx + (y2 % 4); x2 < bx + bw; x2 += 6) x.fillRect(x2, y2, 1, 1); }
    if (state === 'home') { x.fillStyle = '#5c2448'; for (var y3 = by; y3 < by + bh; y3 += 4) x.fillRect(bx, y3, bw, 1); }
    x.restore();
    var bc = state === 'open' ? CH.pink : state === 'visited' ? '#a8ffcc' : state === 'home' ? CH.pink : CH.g4;
    x.strokeStyle = CH.k; x.lineWidth = 6; x.stroke(path);
    x.strokeStyle = bc; x.lineWidth = state === 'open' ? 4 : 2.5; x.stroke(path);
    if (state === 'locked') padlock(x, lb[0], lb[1] - 22);
    if (state === 'visited') { x.strokeStyle = CH.k; x.lineWidth = 9; x.beginPath(); x.moveTo(lb[0] - 12, lb[1] - 24); x.lineTo(lb[0] - 3, lb[1] - 14); x.lineTo(lb[0] + 14, lb[1] - 34); x.stroke(); x.strokeStyle = CH.wh; x.lineWidth = 5; x.stroke(); }
  }, PAL_MAP, {});
  return L;
}
function hoverSprite(id) {
  var D = MAPD.districts[id], P = D.poly;
  return layer(0, 0, W, H, function (x) { var p = polyP(P); x.strokeStyle = CH.wh; x.lineWidth = 7; x.stroke(p); x.strokeStyle = CH.yel; x.lineWidth = 3; x.stroke(p); }, PAL_MAP, {});
}
function stickerSprite() {   // sticker «¿cura?»: un frasquito verde con un signo, sin letras
  return layer(0, 0, 48, 48, function (x) {
    el(x, 24, 24, 21, 21, CH.wh); el(x, 24, 24, 18, 18, CH.pink);
    rect(x, 19, 9, 10, 5, '#c9c9be'); poly(x, [[18, 14], [30, 14], [34, 34], [30, 38], [18, 38], [14, 34]], CH.wh);
    poly(x, [[16, 26], [32, 26], [34, 34], [30, 38], [18, 38], [14, 34]], CH.grn); rect(x, 18, 28, 2, 6, '#a8ffcc');
    curve(x, [[37, 8], [42, 6], [44, 10], [40, 14], [40, 17]], CH.yel, 2.5); rect(x, 39, 20, 3, 3, CH.yel);
  }, PAL_MAP, { outline: 0.2 });
}
var PAL_ALEX = Pal(['#78736c', '#5e5a54', SK.o, SK.d, SK.m, SK.l, HR.k, HR.m, HR.l, BL.dd, BL.m, BL.l, WH.l, WH.d, SH.m, SH.d, GT.m, GT.d, PG.m, PG.l, PG.g, PG.p, PG.beak, PG.foot, PG.eye, '#0a0a0c']);
function mapAlex() {   // Alexander y Titina chiquitos parados en su cerro (piel y colores de la hoja v0.10)
  return layer(0, 0, 40, 52, function (x) {
    poly(x, [[0, 52], [20, 36], [40, 52]], '#78736c');
    rect(x, 15, 30, 3, 8, SK.m); rect(x, 21, 30, 3, 8, SK.m); rect(x, 17, 30, 1, 8, SK.d); rect(x, 23, 30, 1, 8, SK.d); rect(x, 13, 28, 13, 4, SH.m); rect(x, 13, 31, 13, 1, SH.d);
    for (var i = 0; i < 6; i++) rect(x, 13 + i * 2, 17, 2, 11, i % 2 ? WH.l : BL.m);
    rect(x, 11, 18, 3, 8, SK.m); rect(x, 11, 18, 1, 8, SK.l); rect(x, 25, 18, 3, 8, SK.d);
    rect(x, 15, 8, 9, 9, SK.m); rect(x, 15, 9, 3, 5, SK.l); rect(x, 22, 9, 2, 8, SK.d);
    rect(x, 14, 5, 11, 5, HR.m); rect(x, 24, 6, 4, 3, HR.m); rect(x, 15, 5, 5, 1, HR.l); rect(x, 16, 10, 3, 1, HR.m);
    rect(x, 17, 12, 1, 1, HR.k); rect(x, 21, 12, 1, 1, HR.k);
    rect(x, 26, 12, 6, 6, GT.m); rect(x, 29, 2, 2, 10, GT.d);
    rect(x, 7, 14, 6, 4, PG.m); rect(x, 8, 14, 3, 1, PG.l); rect(x, 6, 13, 3, 3, PG.m); rect(x, 5, 14, 1, 1, PG.beak); rect(x, 7, 13, 1, 1, PG.eye); rect(x, 8, 16, 1, 1, PG.g); rect(x, 9, 16, 1, 1, PG.p); rect(x, 9, 18, 1, 1, PG.foot);
  }, PAL_ALEX, { outline: 0.3 });
}
function buildMap() {
  var S = { base: mapBase(), river: riverLayer(), spr: {}, hov: {}, sticker: stickerSprite(), alex: mapAlex(), glow: [glowSprite(12, 0.3), glowSprite(6, 0.6), glowSprite(3, 1)] };
  return S;
}
function mapSpr(id, st, pulse) {
  var k = id + ':' + st + (st === 'open' ? (pulse ? 1 : 0) : '');
  return MAP.spr[k] || (MAP.spr[k] = districtSprite(id, st, pulse));
}
function routeTarget(states, hoverId) {
  if (hoverId && MAPD.districts[hoverId] && hoverId !== 'callao') return hoverId;
  for (var id in states) if (states[id] === 'open') return id;
  return 'miraflores';
}
function drawMap(ctx, t, states, hoverId) {
  ready(); states = states || {}; var S = MAP;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(S.base, 0, 0);
  var pulse = Math.sin(t * 4) > 0;
  Object.keys(MAPD.districts).forEach(function (id) {
    var st = id === 'callao' ? 'home' : (states[id] || 'locked');
    if (st !== 'open' && st !== 'visited' && st !== 'home') st = 'locked';
    var L = mapSpr(id, st, pulse), shake = 0;
    put(ctx, L, shake, 0);
  });
  put(ctx, S.river);
  if (hoverId && MAPD.districts[hoverId]) { var hv = S.hov[hoverId] || (S.hov[hoverId] = hoverSprite(hoverId)); put(ctx, hv); }
  // ruta punteada desde el cerro del Callao
  var tg = routeTarget(states, hoverId), D = MAPD.districts[tg];
  if (D) {
    var a = START, b = D.label, c = [(a[0] + b[0]) / 2 + 30, Math.min(a[1], b[1]) - 60], n = 46, off = (t * 6) % 2;
    for (var i = 0; i <= n; i++) {
      var u = i / n, x = (1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * c[0] + u * u * b[0], y = (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * c[1] + u * u * b[1];
      if ((i + Math.floor(off)) % 2) continue;
      ctx.fillStyle = CH.k; ctx.fillRect(Math.round(x) - 3, Math.round(y) - 3, 6, 6);
      ctx.fillStyle = i % 4 < 2 ? CH.pink : CH.yel; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
    }
  }
  // Miraflores: luz verde y sticker si está disponible
  if (MAPD.districts.miraflores) {
    var ml = MAPD.districts.miraflores.label, gx = ml[0] + 26, gy = ml[1] - 22, on = (t * 1.25) % 1 < 0.5;
    var st2 = states.miraflores || 'locked';
    if (st2 === 'open') {
      var g = S.glow[on ? 0 : 1]; ctx.drawImage(g.c, gx - (g.c.width >> 1), gy - (g.c.height >> 1)); var g3 = S.glow[2]; ctx.drawImage(g3.c, gx - 4, gy - 4);
      ctx.drawImage(S.sticker.c, ml[0] - 56, ml[1] - 50 + (Math.sin(t * 3) > 0 ? 0 : -1));
    }
  }
  var bob = Math.sin(t * 3) > 0.3 ? 1 : 0;
  ctx.drawImage(S.alex.c, START[0] - 20, START[1] - 48 + bob);
  ctx.restore();
}

/* ============================ API ============================ */
var READY = false;
function ready() {
  if (READY) return;
  READY = true;
  var t0 = performance.now();
  PANO = buildPano();
  BACK = buildBack();
  HERO = buildHero();
  MAP = buildMap();
  ACH.cine.readyMs = Math.round(performance.now() - t0);
}
ACH.cine = {
  W: W, H: H,
  ready: ready,
  pano: { w: PW, labels: LABELS, cure: { x: CURE.x, y: CURE.y } },
  drawBack: drawBack,
  drawPano: drawPano,
  drawHero: drawHero,
  map: { districts: MAPD.districts, start: START },
  drawMap: drawMap,
  titinaPos: { x: 362, y: 236 },   // sobre la cabeza de Titina en T3 (sin empuje de cámara); el «¡Grrú!» va ahí
  titinaPosAt: function (push) { var k = 1 + 0.08 * clamp(push || 0, 0, 1); return { x: Math.round(FX + (362 - FX) * k), y: Math.round(FY + (236 - FY) * k) }; },
  readyMs: 0
};

})();
