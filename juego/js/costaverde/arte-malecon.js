/* ACHORADO - js/costaverde/arte-malecon.js  (Costa Verde, fase C2a: malecon de Miraflores)
 * Dueño: C2a (unico escritor).  Script clasico: se carga despues de base.js (y sprites.js si esta).
 * Publica TODO bajo ACH.sprites.cv.malecon (contrato COSTAVERDE.md 10.1) + algunas claves extra (ver ../diseno/cv-C2a.md):
 *   tiles[]    pasto pastoFlor caminoLadrillo ciclovia veredaCV adoquinLetonia losa losaLinea mosaicoPiso pedestalBeso
 *              extra: tierraAmor losetaTerracota pastoCorazon[4] bordilloAmarillo
 *   props      ancla (ax, ay) en los pies, huella (fw, fh) en px, tall / tree / canopy / lamp / emit / broken / dark como en arte-parque.js
 *   vista      { draw(ctx, camX, camY, t, W) }  banda de mar horneada por franjas (paralaje 0.85 en x)
 *   quebradaBalta { draw(ctx, camX, camY, t, W) }  la quebrada con el Club Tennis Las Terrazas
 *   parapenteCielo[4]
 * Todo se hornea una vez al cargar. Sin getImageData en el bucle, sin shadowBlur ni filter. Luz NO, sombras al SE.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px;
if (!px || !px.G) { if (window.console) console.warn('[arte-malecon] falta ACH.px (base.js)'); return; }
var S = ACH.sprites = ACH.sprites || {};
var CV = S.cv = S.cv || {};
var M = CV.malecon = CV.malecon || {};
var G = px.G, rng = px.rng, mix = px.mix;
var T0 = (window.performance || Date).now();

/* ============================ PALETAS ============================ */
var K = '#1c1a22';
var LG = ['#1f4a31', '#2e6a3c', '#3f8a45', '#58a553', '#7cbf68'];      // cesped y seto
var PG = ['#1b3f30', '#2b6a3c', '#43893f', '#69a84a', '#9acb6a'];      // palmera
var FG = ['#15332a', '#1f4a31', '#2b6238', '#3a7a40', '#56944f'];      // ficus
var TG = ['#625e56', '#827d72', '#9f9a8c', '#b9b3a3', '#d2cdbb'];      // tronco claro de palmera
var FT = ['#35323a', '#4f4b53', '#6d6869', '#8c8680', '#aaa39a'];      // tronco de ficus
var IR = ['#0f0e14', '#1c1a22', '#2d2b36', '#46444f'];                 // fierro negro
var VG = ['#0f2a22', '#17402f', '#225a40', '#32785a', '#4f9a74'];      // verde oscuro de postes y bancas
var WD = px.RAMPS.wood;
var BR = ['#4e2226', '#7a3330', '#9c4636', '#b85c44', '#cf7a58'];      // ladrillo rojo del parapeto
var CC = ['#55535c', '#74727a', '#928f90', '#aeaa9f', '#cbc7b8'];      // concreto gris
var VS = ['#9e9a8f', '#b3afa2', '#c6c1b2', '#d6d1c0', '#e4dfce'];      // vereda clara
var RC = ['#8a4a48', '#a05452', '#b6645e', '#c8776e', '#d88c80'];      // ciclovia rojiza-rosada
var TE = ['#9a5e4a', '#b3735a', '#c9876c', '#dc9c80', '#ecb496'];      // terracota rosada (El Beso, losetas)
var DT = ['#0d1018', '#161b28', '#222a3e', '#323d5a', '#4a5a80'];      // azulejo oscuro del pedestal
var OX = ['#4a2418', '#6e3624', '#8f4a30', '#b0643c'];                  // oxido (baranda)
var WA = ['#2a5a76', '#3b7f9e', '#5aa4bd', '#8cc8d8', '#cfeaf0'];      // agua
var DK = '#2a2440';                                                    // sombra violeta

/* ============================ UTILIDADES ============================ */
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function hash2(i, j, s) {
  var h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}
function tnoise(seed, cell) {
  var m = 16 / cell;
  function lat(i, j) { return (i <= 0 || j <= 0 || i >= m || j >= m) ? 0.5 : hash2(i, j, seed); }
  return function (x, y) {
    var u = (x + 0.5) / cell, v = (y + 0.5) / cell, i = Math.floor(u), j = Math.floor(v), fu = smooth(u - i), fv = smooth(v - j);
    var a = lat(i, j), b = lat(i + 1, j), c = lat(i, j + 1), d = lat(i + 1, j + 1);
    return (a + (b - a) * fu) * (1 - fv) + (c + (d - c) * fu) * fv;
  };
}
var BAY4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function bay(x, y) { return (BAY4[((y & 3) << 2) | (x & 3)] + 0.5) / 16; }
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
function cnv(w, h) { return px.canvas(w, h); }
function mottle(seed, ramp, o) {
  o = o || {};
  var g = new G(16, 16), r = rng(seed * 977 + 13);
  var n8 = tnoise(seed + 101, 8), n4 = tnoise(seed + 202, 4), n2 = tnoise(seed + 303, 2);
  var amp = o.amp === undefined ? 1 : o.amp, base = o.base === undefined ? 2 : o.base, bias = o.bias || 0;
  var gl = o.light === undefined ? 0.05 : o.light, gd = o.dark === undefined ? 0.045 : o.dark, top = ramp.length - 1;
  for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) {
    var f = 0.5 + bias + ((n8(x, y) - 0.5) * 0.25 + (n4(x, y) - 0.5) * 0.85 + (n2(x, y) - 0.5) * 0.35) * amp;
    var t = f + (bay(x, y) - 0.5) * 0.14;
    var k = t < 0.22 ? -2 : t < 0.37 ? -1 : t < 0.63 ? 0 : t < 0.78 ? 1 : 2;
    var u = r();
    if (u < gl) k++; else if (u < gl + gd) k--;
    g.set(x, y, ramp[clamp(base + k, 0, top)]);
  }
  return g;
}
function outline(g, dark, lite) {
  var add = [];
  for (var y = 0; y < g.h; y++) for (var x = 0; x < g.w; x++) {
    if (g.get(x, y)) continue;
    var l = g.get(x - 1, y), r = g.get(x + 1, y), u = g.get(x, y - 1), d = g.get(x, y + 1);
    if (!(l || r || u || d)) continue;
    add.push([x, y, (lite && (r || d) && !(l || u)) ? lite : dark]);
  }
  for (var i = 0; i < add.length; i++) g.set(add[i][0], add[i][1], add[i][2]);
  return g;
}
function contact(g, cx, cy, rx, ry, col) {
  col = col || '#2a244080';
  for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry;
    if (dx * dx + dy * dy <= 1 && !g.get(x, y)) g.set(x, y, col);
  }
}
/* Lienzo final: toCanvas + sombra proyectada SE + propiedades (como mk() de arte-parque.js). */
function mk(g, ax, ay, fw, fh, o) {
  o = o || {};
  var c = g.toCanvas(), res = c;
  if (o.cast) {
    var c1 = cnv(c.width, c.height);
    c1.getContext('2d', { willReadFrequently: true }).drawImage(c, 0, 0); c = c1;
    var sh = px.shadowSE(c, o.cast.a === undefined ? 0.2 : o.cast.a, { base: ay, len: o.cast.len || 0.45 });
    var W = Math.max(c.width, sh.width), H = Math.max(c.height, ay + 1 + sh.height);
    res = cnv(W, H);
    var cx = res.getContext('2d');
    cx.drawImage(sh, 0, ay); cx.drawImage(c1, 0, 0);
    res.shadowIn = true;
  }
  res.ax = ax; res.ay = ay; res.fw = fw; res.fh = fh;
  if (o.p) for (var k in o.p) res[k] = o.p[k];
  return res;
}
function box(g, x, y, w, h, topH, ramp, o) {
  o = o || {};
  var i, j;
  for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
    var c;
    if (j < topH) c = j === 0 ? ramp[4] : ramp[3];
    else { var fj = j - topH; c = fj === h - topH - 1 ? ramp[0] : (i === 0 ? ramp[3] : (i >= w - 2 ? ramp[1] : ramp[2])); if (fj === 0) c = ramp[3]; }
    g.set(x + i, y + j, c);
  }
  if (o.joint) for (j = topH; j < h - 1; j++) g.set(x + o.joint, y + j, ramp[1]);
}
/* Capsula con radio variable a lo largo de una polilinea, luz arriba-izquierda, rampa de 5 pasos. pts: [[x,y,r],...] */
function limb(g, pts, ramp, o) {
  o = o || {};
  if (pts.length === 1) pts = [pts[0], pts[0]];
  var minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9, i;
  pts.forEach(function (p) { minx = Math.min(minx, p[0] - p[2]); maxx = Math.max(maxx, p[0] + p[2]); miny = Math.min(miny, p[1] - p[2]); maxy = Math.max(maxy, p[1] + p[2]); });
  for (var y = Math.floor(miny) - 1; y <= Math.ceil(maxy) + 1; y++) for (var x = Math.floor(minx) - 1; x <= Math.ceil(maxx) + 1; x++) {
    var best = 1e9, bcx = 0, bcy = 0, br = 1;
    for (i = 0; i < pts.length - 1; i++) {
      var ax = pts[i][0], ay = pts[i][1], bx = pts[i + 1][0], by = pts[i + 1][1], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
      var t = clamp(((x + 0.5 - ax) * dx + (y + 0.5 - ay) * dy) / l2, 0, 1), qx = ax + dx * t, qy = ay + dy * t, rr = pts[i][2] + (pts[i + 1][2] - pts[i][2]) * t;
      var d = Math.hypot(x + 0.5 - qx, y + 0.5 - qy) / rr;
      if (d < best) { best = d; bcx = qx; bcy = qy; br = rr; }
    }
    if (best > 1) continue;
    var nx = (x + 0.5 - bcx) / br, ny = (y + 0.5 - bcy) / br, lit = -(nx * 0.55 + ny * 0.85) * (0.6 + 0.4 * (1 - best * best));
    var k = lit > 0.55 ? 4 : lit > 0.15 ? 3 : lit > -0.25 ? 2 : lit > -0.65 ? 1 : 0;
    if (o.flat) k = o.flat;
    g.set(x, y, ramp[k]);
  }
}
/* Trencadis: fragmentos irregulares de ceramica con junta clara. colorFn(cx, cy, id) -> color base de cada fragmento. */
function trencadis(g, x0, y0, w, h, cs, seed, colorFn, o) {
  o = o || {};
  var nx = Math.ceil(w / cs) + 2, ny = Math.ceil(h / cs) + 2, seeds = [], i, j, r = rng(seed);
  var wrap = !!o.wrap, wx = wrap ? Math.round(w / cs) : 0, wy = wrap ? Math.round(h / cs) : 0;
  if (wrap) { nx = wx; ny = wy; }
  for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
    seeds.push([(i + 0.15 + 0.7 * hash2(i, j, seed)) * cs - (wrap ? 0 : cs), (j + 0.15 + 0.7 * hash2(j, i, seed + 5)) * cs - (wrap ? 0 : cs)]);
  }
  function ownerAt(x, y) {
    var ci = Math.floor((x + (wrap ? 0 : cs)) / cs), cj = Math.floor((y + (wrap ? 0 : cs)) / cs), best = 1e9, bid = -1, di, dj;
    for (dj = -1; dj <= 1; dj++) for (di = -1; di <= 1; di++) {
      var ii = ci + di, jj = cj + dj, sx, sy;
      if (wrap) { ii = ((ii % nx) + nx) % nx; jj = ((jj % ny) + ny) % ny; var ox = (ci + di - ii) / nx * w, oy = (cj + dj - jj) / ny * h; sx = seeds[jj * nx + ii][0] + ox; sy = seeds[jj * nx + ii][1] + oy; }
      else { if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue; sx = seeds[jj * nx + ii][0]; sy = seeds[jj * nx + ii][1]; }
      var ddx = x + 0.5 - sx, ddy = y + 0.5 - sy, d = ddx * ddx * 1.0 + ddy * ddy * 1.15;
      if (d < best) { best = d; bid = jj * nx + ii; }
    }
    return bid;
  }
  var own = new Int32Array(w * h), x, y;
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) own[y * w + x] = ownerAt(x, y);
  var grout = o.grout || '#efe9d8', cache = {};
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    var id = own[y * w + x], oR = x + 1 < w ? own[y * w + x + 1] : (wrap ? own[y * w] : id), oD = y + 1 < h ? own[(y + 1) * w + x] : (wrap ? own[x] : id);
    var oL = x > 0 ? own[y * w + x - 1] : (wrap ? own[y * w + w - 1] : id), oU = y > 0 ? own[(y - 1) * w + x] : (wrap ? own[(h - 1) * w + x] : id);
    var c;
    if (oR !== id || oD !== id) c = grout;
    else {
      if (!cache[id]) cache[id] = colorFn(seeds[id][0] + x0, seeds[id][1] + y0, id);
      c = cache[id];
      if (c && (oL !== id || oU !== id)) c = mix(c, '#ffffff', 0.28);
      else if (c && hash2(x, y, seed + 9) < 0.06) c = mix(c, '#000000', 0.12);
    }
    if (c) g.set(x0 + x, y0 + y, c);
  }
}

/* ============================ TILES ============================ */
function grassG(v) {
  var seed = 410 + v * 13, r = rng(seed * 7 + 5), g = mottle(seed, LG, { amp: 0.5, base: 2, light: 0.04, dark: 0.025 }), i, x, y;
  for (i = 0; i < 5; i++) {
    x = 1 + Math.floor(r() * 13); y = 2 + Math.floor(r() * 12);
    g.set(x, y, LG[3]); g.set(x, y - 1, LG[4]); g.set(x + 1, y, LG[1]);
  }
  return g;
}
function flower(g, kind, x, y) {
  if (kind === 'red') { g.set(x, y + 2, LG[0]); g.set(x - 1, y + 2, LG[1]); g.set(x + 1, y + 2, LG[1]); g.set(x, y + 1, '#a8202a'); g.set(x, y, '#ef4a3a'); g.set(x, y - 1, '#ff8a6a'); }
  else if (kind === 'yel') { g.set(x, y + 2, LG[0]); g.set(x + 1, y + 2, LG[1]); g.set(x, y, '#ffd83a'); g.set(x + 1, y, '#ffeb7a'); g.set(x, y + 1, '#f6a81c'); g.set(x + 1, y + 1, '#e8902a'); }
  else if (kind === 'org') { g.set(x, y + 2, LG[0]); g.set(x, y, '#ff9a2a'); g.set(x + 1, y, '#ffb84a'); g.set(x, y + 1, '#d9701c'); g.set(x + 1, y + 1, '#f08a22'); }
  else if (kind === 'pink') { g.set(x, y + 2, LG[0]); g.set(x, y, '#f08ab4'); g.set(x + 1, y, '#f9b4d0'); g.set(x, y + 1, '#c8508a'); g.set(x + 1, y + 1, '#dc6a9e'); }
  else if (kind === 'vio') { g.set(x, y + 2, LG[0]); g.set(x, y, '#a070e0'); g.set(x + 1, y, '#c4a0f4'); g.set(x, y + 1, '#6a40b0'); g.set(x + 1, y + 1, '#8a58c8'); }
  else { g.set(x, y + 1, LG[1]); g.set(x, y, '#f3efe2'); g.set(x - 1, y, '#dcd8ca'); g.set(x + 1, y, '#f3efe2'); g.set(x, y - 1, '#f3efe2'); g.set(x, y + 1, '#ffd83a'); }
}
var FSETS = [['red', 'pink'], ['yel', 'org'], ['pink', 'dai', 'yel'], ['red', 'yel'], ['vio', 'pink'], ['dai', 'yel']];
function grassFlowerG(v) {
  var g = grassG(v + 6), r = rng(1900 + v * 31), set = FSETS[v % 6], n = v === 5 ? 10 : 6, i;
  for (i = 0; i < n; i++) {
    var cx = v === 5 ? 3 + (i % 3) * 4 : 3 + Math.floor(r() * 9), cy = v === 5 ? 3 + Math.floor(i / 3) * 4 : 3 + Math.floor(r() * 8);
    flower(g, set[i % set.length], clamp(cx + (v === 5 ? Math.floor(r() * 2) : 0), 2, 12), clamp(cy, 2, 11));
  }
  return g;
}
/* Camino de ladrillo rojizo: adoquines 8x4 en aparejo trabado, cada uno con su tono. Periodo 8x8: encaja con todo. */
function ladrilloG(v) {
  var g = new G(16, 16), r = rng(2200 + v * 17), x, y, tone = [];
  var pal = ['#8e3f35', '#a04a3a', '#b35a42', '#c46c4c'];
  var JT = '#6a2c2a';
  for (var by = 0; by < 4; by++) for (var bx = 0; bx < 4; bx++) tone.push(clamp(Math.floor(hash2(bx, by, 330 + v) * 3.4) + (v === 3 ? 0 : 0), 0, 3));
  for (y = 0; y < 16; y++) for (x = 0; x < 16; x++) {
    var row = y >> 2, off = (row & 1) ? 4 : 0, xx = (x + off) & 15, col = xx >> 3, lx = xx & 7, ly = y & 3;
    var t = tone[(row & 3) * 4 + (col + (row >> 1)) % 4];
    var c;
    if (ly === 3 || lx === 7) c = JT;
    else { c = pal[t]; if (ly === 0 && lx < 7) c = pal[Math.min(3, t + 1)]; if (lx === 0 && ly < 3) c = pal[Math.min(3, t + 1)]; if (ly === 2) c = pal[Math.max(0, t - (lx > 3 ? 1 : 0))]; }
    g.set(x, y, c);
  }
  for (var i = 0; i < 6; i++) { x = Math.floor(r() * 16); y = Math.floor(r() * 16); var cc = g.get(x, y); if (cc && cc !== JT) g.set(x, y, r() < 0.5 ? '#c98a60' : '#8a4a40'); }
  if (v === 2) { g.set(5, 5, '#6b8a4a'); g.set(6, 5, '#4a6a38'); g.set(11, 12, '#8a9a58'); }
  return g;
}
function cicloviaG(v) {
  var seed = 880 + v * 9, g = mottle(seed, RC, { amp: 0.55, base: 2, light: 0.06, dark: 0.05 }), x, y, W = '#f0e6d6', W2 = '#cdbfae';
  if (v === 2) {                                                          // pictograma de bici
    var wheel = function (cx, cy) { [[-1, -2], [0, -2], [1, -2], [-2, -1], [2, -1], [-2, 0], [2, 0], [-2, 1], [2, 1], [-1, 2], [0, 2], [1, 2]].forEach(function (d) { g.set(cx + d[0], cy + d[1], W); }); };
    wheel(4, 10); wheel(12, 10);
    g.line(4, 10, 7, 6, W); g.line(7, 6, 12, 10, W); g.line(7, 6, 9, 10, W2); g.line(4, 10, 9, 10, W2); g.line(6, 5, 8, 5, W); g.line(11, 7, 12, 10, W2); g.line(11, 6, 13, 6, W);
  } else if (v === 3) {                                                  // flecha de sentido
    for (x = 2; x < 13; x++) { g.set(x, 7, W); g.set(x, 8, W2); }
    for (y = 0; y < 5; y++) { g.set(13 - y, 7 - y, W); g.set(13 - y, 8 + y, W); }
  }
  return g;
}
function veredaG(v) {
  var seed = 900 + v * 7, r = rng(seed), g = mottle(seed, VS, { amp: 0.4, base: 2, light: 0.04, dark: 0.03 }), x, y;
  var J = '#aeaa9b';
  for (x = 0; x < 16; x++) for (y = 0; y < 16; y++) {
    var jx = (x === 0 || x === 8), jy = (y === 0 || y === 8);
    if (v === 1 && y >= 8) jx = (x === 4 || x === 12);
    if (jx || jy) g.set(x, y, J);
    else if ((x === 1 && !jy) || (y === 1 && !jx)) { if (r() < 0.5) g.set(x, y, VS[3]); }
  }
  if (v === 2) { for (x = 4; x < 11; x++) for (y = 4; y < 10; y++) if (bay(x, y) < 0.55 - Math.abs(x - 7.5) * 0.07) g.set(x, y, VS[1]); }
  if (v === 3) { [[3, 3], [4, 4], [5, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10]].forEach(function (p) { g.set(p[0], p[1], VS[0]); g.set(p[0] + 1, p[1], VS[4]); }); }
  if (v === 4) { g.set(10, 11, '#8a6a52'); g.set(11, 11, '#a88a6a'); g.set(5, 5, '#c9b8a3'); g.set(12, 4, '#b8a888'); g.set(6, 12, '#9aa07a'); g.set(7, 12, '#7a8a52'); }
  if (v === 5) { for (var i = 0; i < 4; i++) { var sx = 2 + Math.floor(r() * 12), sy = 2 + Math.floor(r() * 12); g.set(sx, sy, '#eee8dc'); } g.set(12, 12, '#c89a70'); g.set(11, 12, '#d8b090'); }   // chicle y briznas
  return g;
}
/* Adoquin de canto rodado: cuadritos 4x4 escalonados, con filo claro arriba-izquierda. */
function adoquinG(v, kind) {
  var g = new G(16, 16), r = rng(2400 + v * 29 + kind * 7), x, y;
  var P = { y: ['#a88a28', '#c8a634', '#e0c44a', '#f2dc70'], r: ['#7a2a26', '#963630', '#b0453a', '#c85a48'], d: ['#3e3d46', '#4f4e58', '#625f6c', '#787683'] }[kind === 0 ? 'y' : (kind === 1 ? 'r' : 'd')];
  var JT = kind === 0 ? '#6e5a22' : (kind === 1 ? '#4a1c1a' : '#26252c');
  for (y = 0; y < 16; y++) for (x = 0; x < 16; x++) {
    var row = y >> 2, xx = (x + ((row & 1) ? 2 : 0)) & 15, lx = xx & 3, ly = y & 3, col = xx >> 2;
    var t = clamp(Math.floor(hash2(col, row, 500 + v * 3 + kind) * 3.2), 0, 3), c;
    if (lx === 3 || ly === 3) c = JT;
    else { c = P[t]; if (lx === 0 && ly === 0) c = P[Math.min(3, t + 1)]; else if (lx === 2 && ly === 2) c = P[Math.max(0, t - 1)]; }
    g.set(x, y, c);
  }
  for (var i = 0; i < 5; i++) { x = Math.floor(r() * 16); y = Math.floor(r() * 16); if (g.get(x, y) !== JT) g.set(x, y, P[Math.floor(r() * 4)]); }
  if (kind === 0 && v === 2) { g.set(3, 6, '#6b8a4a'); g.set(4, 6, '#4a6a38'); }
  return g;
}
/* Losa deportiva: cemento pintado verde azulado con juntas de dilatacion en el borde del tile y desgaste. */
var LS = ['#2c5c5c', '#366e6a', '#418078', '#53947f', '#6ba88e'];
function losaG(v) {
  var seed = 1010 + v * 11, r = rng(seed), g = mottle(seed, LS, { amp: 0.4, base: 2, light: 0.03, dark: 0.05 }), x, y;
  for (x = 0; x < 16; x++) { g.set(x, 0, LS[0]); }
  for (y = 0; y < 16; y++) { g.set(0, y, LS[0]); }
  for (x = 1; x < 16; x++) if (r() < 0.45) g.set(x, 1, LS[3]);
  if (v === 2) { for (var i = 0; i < 10; i++) g.set(5 + i, 6 + Math.floor(Math.sin(i * 0.9) * 1.4 + 1), LS[0]); }     // grieta
  if (v === 3) { for (x = 3; x < 11; x++) for (y = 8; y < 13; y++) if (bay(x, y) < 0.5 - Math.abs(x - 6.5) * 0.06) g.set(x, y, "#7a8a7a"); }   // pintura gastada
  return g;
}
function losaLineaG(k) {
  var g = losaG(0), W = '#eef0e8', W2 = '#cdd2c6', x, y;
  var lineH = function (yy) { for (x = 0; x < 16; x++) { g.set(x, yy, W); g.set(x, yy + 1, W2); } };
  var lineV = function (xx) { for (y = 0; y < 16; y++) { g.set(xx, y, W); g.set(xx + 1, y, W2); } };
  if (k === 0) lineH(7);                                                 // linea horizontal (centro)
  else if (k === 1) lineV(7);                                            // vertical
  else if (k === 2) { for (x = 7; x < 16; x++) { g.set(x, 7, W); g.set(x, 8, W2); } for (y = 7; y < 16; y++) { g.set(7, y, W); g.set(8, y, W2); } }       // esquina TL de cancha
  else if (k === 3) { for (x = 0; x < 9; x++) { g.set(x, 7, W); g.set(x, 8, W2); } for (y = 7; y < 16; y++) { g.set(7, y, W); g.set(8, y, W2); } }
  else if (k === 4) { for (x = 7; x < 16; x++) { g.set(x, 7, W); g.set(x, 8, W2); } for (y = 0; y < 9; y++) { g.set(7, y, W); g.set(8, y, W2); } }
  else if (k === 5) { for (x = 0; x < 9; x++) { g.set(x, 7, W); g.set(x, 8, W2); } for (y = 0; y < 9; y++) { g.set(7, y, W); g.set(8, y, W2); } }
  else {                                                                 // 6..9: cuarto de circulo central de r = 16 con centro en el vertice comun del bloque 2x2 (6 TL, 7 TR, 8 BL, 9 BR)
    var q = k - 6, cx = (q & 1) ? 0 : 16, cy = (q & 2) ? 0 : 16;
    for (y = 0; y < 16; y++) for (x = 0; x < 16; x++) {
      var d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d >= 15.2 && d < 16.4) g.set(x, y, W); else if (d >= 16.4 && d < 17.2) g.set(x, y, W2);
    }
  }
  return g;
}
/* Trencadis de piso para el Parque del Amor: encaja a los 4 lados (Voronoi toroidal). */
function mosaicoPisoG(v) {
  var g = new G(16, 16), fams = [
    ['#2f6fcf', '#3f93d8', '#2fb0c0', '#79cfe0', '#e4483c', '#f08a38', '#f3efe2'],
    ['#e4483c', '#f08a38', '#f0c030', '#f3efe2', '#2f6fcf', '#2fb0c0', '#c83036'],
    ['#2fb0c0', '#79cfe0', '#f3efe2', '#f0c030', '#3f93d8', '#4aa870', '#f08a38'],
    ['#f0c030', '#f8d85a', '#e4483c', '#2f6fcf', '#f3efe2', '#f08a38', '#2fb0c0']][v];
  trencadis(g, 0, 0, 16, 16, 5.34, 3300 + v * 17, function (cx, cy, id) { return fams[Math.floor(hash2(id, v, 7) * fams.length)]; }, { wrap: true, grout: "#d6ccb4" });
  return g;
}
/* Azulejo oscuro del pedestal: mayolica 8x8 casi negra con brillo en la esquina. */
function pedestalG(v) {
  var g = new G(16, 16), r = rng(4100 + v * 13), x, y;
  for (y = 0; y < 16; y++) for (x = 0; x < 16; x++) {
    var lx = x & 7, ly = y & 7, t = clamp(Math.floor(hash2(x >> 3, y >> 3, 600 + v) * 2.6), 0, 2), c;
    if (lx === 7 || ly === 7) c = DT[0];
    else { c = DT[1 + t]; if (lx === 0 || ly === 0) c = DT[Math.min(4, 2 + t)]; if (lx <= 2 && ly <= 2 && lx + ly <= 2) c = DT[4]; if (lx >= 5 && ly >= 5) c = DT[Math.max(1, t)]; }
    g.set(x, y, c);
  }
  for (var i = 0; i < 4; i++) { x = Math.floor(r() * 16); y = Math.floor(r() * 16); if (g.get(x, y) !== DT[0]) g.set(x, y, DT[4]); }
  return g;
}
var OC = ['#a7865a', '#bd9a6a', '#cdad7c', '#dcc08e', '#e8d2a2'];
function tierraG(v) {
  var seed = 5100 + v * 7, r = rng(seed), g = mottle(seed, OC, { amp: 0.7, base: 2, light: 0.05, dark: 0.07 }), i;
  for (i = 0; i < 9; i++) { var x = Math.floor(r() * 15), y = Math.floor(r() * 15); g.set(x, y, '#8a6c46'); g.set(x + 1, y, OC[4]); }
  if (v === 1) { for (i = 0; i < 7; i++) g.set(2 + i * 2, 4 + (i % 2), '#8a6c46'); }
  return g;
}
function losetaG(v) {
  var g = new G(16, 16), x, y;
  for (y = 0; y < 16; y++) for (x = 0; x < 16; x++) {
    var lx = x & 7, ly = y & 7, t = clamp(Math.floor(hash2(x >> 3, y >> 3, 700 + v) * 3.2), 0, 3), c;
    if (lx === 7 || ly === 7) c = '#8a5a4c';
    else { c = TE[1 + Math.min(3, t)]; if (lx === 0 || ly === 0) c = TE[Math.min(4, 2 + t)]; if (bay(x, y) < 0.08) c = TE[Math.max(0, t)]; }
    g.set(x, y, c);
  }
  if (v === 2) { g.set(3, 3, '#7a9a5a'); g.set(4, 3, '#5a7a40'); g.set(11, 12, '#c8b090'); }
  return g;
}
/* Bordillo amarillo (Bajada Balta) en tile suelto, filo norte: util para la quebrada. */
function bordilloG() {
  var g = veredaG(0), x, y;
  for (y = 9; y < 16; y++) for (x = 0; x < 16; x++) g.set(x, y, y === 9 ? '#f2dc70' : (y < 12 ? '#e0c44a' : (y < 15 ? '#a88a28' : '#6e5a22')));
  return g;
}
/* Parterre en forma de corazon: 2x2 tiles (TL, TR, BL, BR) sobre pasto, de flores rojas y rosadas. */
function corazonBlock() {
  var G32 = new G(32, 32), t, tx, ty;
  for (ty = 0; ty < 2; ty++) for (tx = 0; tx < 2; tx++) { t = grassG(ty * 2 + tx); G32.blit(t, tx * 16, ty * 16); }
  var r = rng(7001), x, y;
  for (y = 0; y < 32; y++) for (x = 0; x < 32; x++) {
    var u = (x + 0.5 - 16) / 12.5, v = -(y + 0.5 - 17.5) / 12.5;
    var f = Math.pow(u * u + v * v - 1, 3) - u * u * v * v * v;
    if (f > 0) continue;
    var edge = Math.pow(u * u + v * v - 1, 3) - u * u * v * v * v > -0.35;
    var c = edge ? '#a8202a' : (hash2(x, y, 71) < 0.34 ? '#ff9ab8' : (hash2(x, y, 72) < 0.5 ? '#ef4a3a' : '#d8383a'));
    if (!edge && hash2(x, y, 73) < 0.12) c = '#ffd0dc';
    G32.set(x, y, c);
  }
  for (x = 0; x < 20; x++) { var fx = 5 + Math.floor(r() * 22), fy = 4 + Math.floor(r() * 24); var cc = G32.get(fx, fy); if (cc && LG.indexOf(cc) >= 0) flower(G32, r() < 0.5 ? 'yel' : 'dai', fx, fy); }
  var out = [];
  for (ty = 0; ty < 2; ty++) for (tx = 0; tx < 2; tx++) {
    var q = new G(16, 16);
    for (y = 0; y < 16; y++) for (x = 0; x < 16; x++) q.set(x, y, G32.get(tx * 16 + x, ty * 16 + y));
    out.push(q.toCanvas());
  }
  return out;
}

function bakeTiles() {
  var T = M.tiles = M.tiles || {};
  T.pasto = [0, 1, 2, 3, 4, 5].map(function (v) { return grassG(v).toCanvas(); });
  T.pastoFlor = [0, 1, 2, 3, 4, 5].map(function (v) { return grassFlowerG(v).toCanvas(); });
  T.caminoLadrillo = [0, 1, 2, 3].map(function (v) { return ladrilloG(v).toCanvas(); });
  T.ciclovia = [0, 1, 2, 3].map(function (v) { return cicloviaG(v).toCanvas(); });
  T.veredaCV = [0, 1, 2, 3, 4, 5].map(function (v) { return veredaG(v).toCanvas(); });
  T.adoquinLetonia = [adoquinG(0, 0), adoquinG(1, 0), adoquinG(2, 0), adoquinG(3, 0), adoquinG(0, 1), adoquinG(1, 1), adoquinG(0, 2), adoquinG(1, 2)].map(function (g) { return g.toCanvas(); });
  T.losa = [0, 1, 2, 3].map(function (v) { return losaG(v).toCanvas(); });
  T.losaLinea = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (k) { return losaLineaG(k).toCanvas(); });
  T.mosaicoPiso = [0, 1, 2, 3].map(function (v) { return mosaicoPisoG(v).toCanvas(); });
  T.pedestalBeso = [0, 1, 2, 3].map(function (v) { return pedestalG(v).toCanvas(); });
  T.tierraAmor = [0, 1, 2].map(function (v) { return tierraG(v).toCanvas(); });
  T.losetaTerracota = [0, 1, 2].map(function (v) { return losetaG(v).toCanvas(); });
  T.pastoCorazon = corazonBlock();
  T.bordilloAmarillo = bordilloG().toCanvas();
  for (var k in T) M[k] = T[k];                    // acceso corto: malecon.pasto == malecon.tiles.pasto
}

/* ============================ FUENTES Y FOLLAJE (tecnicas de arte-parque.js) ============================ */
function frond(g, cx, cy, ang, L, droop, cols, leaf, n0) {
  var a = ang * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), N = Math.ceil(L * 1.6), k, j, pts = [];
  for (k = 0; k <= N; k++) { var t = k / N; pts.push([cx + ca * L * t, cy + sa * L * t + droop * L * t * t, t]); }
  var wMax = leaf * 0.62;
  for (k = 0; k <= N; k++) {
    var p = pts[k], q = pts[Math.max(0, k - 1)], n = pts[Math.min(N, k + 1)], tx = n[0] - q[0], ty = n[1] - q[1], tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    var nx = -ty, ny = tx; if (ny > 0) { nx = -nx; ny = -ny; }
    var hw = wMax * Math.pow(Math.sin(Math.PI * (0.08 + 0.78 * p[2])), 0.9) * (1 - p[2] * 0.25);
    if (hw < 0.5) { g.set(p[0], p[1], cols[1]); continue; }
    var up = hw * 0.8, dn = hw * 1.15;
    for (j = -dn; j <= up; j += 0.5) {
      var fx = p[0] + nx * j, fy = p[1] + ny * j;
      var col = j > up * 0.35 ? cols[3] : (j > -dn * 0.3 ? cols[2] : cols[1]);
      if (Math.abs(j) < 0.51) col = cols[4] || cols[3];
      g.set(fx, fy, col);
    }
    if (p[2] > 0.3 && (k + (n0 || 0)) % 4 === 0) { var ex = p[0] - nx * (dn + 0.5), ey = p[1] - ny * (dn + 0.5); g.set(ex, ey, null); g.set(ex - nx, ey - ny, null); }
  }
}
function leafMass(g, masses, ramp, hgt, owner, r, o) {
  var W = g.w, lit = new Array(W * hgt), x2, y2, i;
  for (i = 0; i < owner.length; i++) owner[i] = -1;
  masses.forEach(function (Mm, m) {
    for (y2 = 0; y2 < hgt; y2++) for (x2 = 0; x2 < W; x2++) {
      var dx = (x2 - Mm[0]) / Mm[2], dy = (y2 - Mm[1]) / Mm[3];
      if (dx > 1.3 || dx < -1.3 || dy > 1.3 || dy < -1.3) continue;
      var ang = Math.atan2(dy, dx), edge = 1 + 0.10 * Math.sin(ang * 5 + Mm[4]) + 0.06 * Math.sin(ang * 9 + Mm[4] * 2.3) + 0.04 * Math.sin(ang * 13 + Mm[4]);
      var d = Math.sqrt(dx * dx + dy * dy) / edge;
      if (d >= 1) continue;
      owner[y2 * W + x2] = m; lit[y2 * W + x2] = [-(dx * 0.62 + dy * 0.78), d];
    }
  });
  for (y2 = 0; y2 < hgt; y2++) for (x2 = 0; x2 < W; x2++) {
    var oi = owner[y2 * W + x2]; if (oi < 0) continue;
    var L = lit[y2 * W + x2], lv = L[0], dd = L[1], ci;
    if (lv > 0.34) ci = 0; else if (lv > -0.08) ci = 1; else if (lv > -0.5) ci = 2; else ci = 3;
    if (dd > 0.86 && lv < -0.1) ci = 4; else if (dd > 0.86 && lv > 0.35) ci = 0;
    var nb = owner[(y2 - 1) * W + (x2 - 1)];
    if (x2 > 0 && y2 > 0 && nb > oi && ci < 4) ci = Math.min(4, ci + 1);
    g.set(x2, y2, ramp[4 - ci]);
  }
  masses.forEach(function (Mm, mi) {
    for (var k = 0; k < (o.tufts || 3); k++) {
      var a = (205 + k * 38 + r() * 14) * Math.PI / 180, rr = 0.42 + r() * 0.22, lx = Math.round(Mm[0] + Math.cos(a) * Mm[2] * rr), ly = Math.round(Mm[1] + Math.sin(a) * Mm[3] * rr);
      if (owner[ly * W + lx] === mi && owner[(ly + 1) * W + lx + 2] === mi) { g.rect(lx, ly, 3, 1, ramp[4]); g.rect(lx - 1, ly + 1, 3, 1, ramp[4]); g.rect(lx + 2, ly + 1, 1, 1, ramp[3]); }
    }
  });
}
function stem(g, pts, w0, w1, tw) {
  var n = 0, i, L = [];
  for (i = 0; i < pts.length - 1; i++) { var d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); L.push(d); n += d; }
  for (var s = 0; s <= n * 1.6; s++) {
    var t = s / (n * 1.6), acc = 0, seg = 0, pos = t * n;
    while (seg < L.length - 1 && acc + L[seg] < pos) { acc += L[seg]; seg++; }
    var u = L[seg] ? (pos - acc) / L[seg] : 0, cx = pts[seg][0] + (pts[seg + 1][0] - pts[seg][0]) * u + Math.sin(t * 8 + tw) * 1.2, cy = pts[seg][1] + (pts[seg + 1][1] - pts[seg][1]) * u;
    var rad = (w0 + (w1 - w0) * t) / 2;
    for (var yy = Math.floor(cy - 1); yy <= Math.floor(cy + 1); yy++) for (var xx = Math.floor(cx - rad); xx <= Math.ceil(cx + rad); xx++) {
      var f = (xx + 0.5 - cx) / rad;
      if (f < -1.02 || f > 1.02) continue;
      var c = f < -0.6 ? FT[4] : (f < -0.2 ? FT[3] : (f < 0.3 ? FT[2] : (f < 0.7 ? FT[1] : FT[0])));
      var v = (((yy * 2 + xx * 3 + Math.round(tw * 5)) % 9) + 9) % 9;
      if (v === 0 && f > -0.8 && f < 0.85) c = FT[Math.max(0, FT.indexOf(c) - 1)];
      else if (v === 1 && f < 0.3) c = FT[Math.min(4, FT.indexOf(c) + 1)];
      g.set(xx, yy, c);
    }
  }
}

/* ============================ PARAPETO DE LADRILLO ============================ */
/* Parapeto del acantilado (fila 33): segmento de 16 px de ancho; ancla (8, abajo) = base del tile. Tapa clara de 6 px y cara de ladrillo. */
function ladrilloFace(g, x0, y0, w, h, r, o) {
  var x, y, tone = {};
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    var row = Math.floor(y / 4), off = (row & 1) ? 4 : 0, xx = x + off + (o.shift || 0), col = Math.floor(xx / 8), lx = ((xx % 8) + 8) % 8, ly = y % 4;
    var key = row + ',' + col, t = tone[key];
    if (t === undefined) t = tone[key] = clamp(Math.floor(hash2(col, row, 880 + (o.seed || 0)) * 3.3), 0, 3);
    var c;
    if (ly === 3 || lx === 7) c = BR[0];
    else { c = BR[1 + t]; if (ly === 0) c = BR[Math.min(4, 2 + t)]; if (lx === 0) c = BR[Math.min(4, 2 + t)]; if (lx >= 5 && ly >= 1) c = BR[Math.max(1, t)]; }
    g.set(x0 + x, y0 + y, c);
  }
  for (var i = 0; i < w * h / 40; i++) { x = Math.floor(r() * w); y = Math.floor(r() * h); var cc = g.get(x0 + x, y0 + y); if (cc && cc !== BR[0]) g.set(x0 + x, y0 + y, r() < 0.5 ? '#d89a72' : BR[1]); }
}
function parapeto(seed) {
  var W = 16, H = 24, g = new G(W, H), r = rng(11000 + seed), x, y;
  ladrilloFace(g, 0, 9, W, 14, r, { seed: seed });
  for (x = 0; x < W; x++) { g.set(x, 22, BR[0]); }
  for (y = 3; y < 9; y++) for (x = 0; x < W; x++) g.set(x, y, y === 3 ? CC[4] : (y === 4 ? '#e2decf' : (y === 8 ? CC[1] : CC[3])));   // tapa de concreto, 6 px
  for (x = 0; x < W; x++) { g.set(x, 9, CC[0]); }
  for (x = 0; x < W; x += 8) g.set(x, 5, CC[2]);
  outline(g, K, '#e8e2cc');
  contact(g, 8, 23, 8, 1.6, '#2a244070');
  return mk(g, 8, 22, 16, 16, { cast: { len: 0.4, a: 0.2 }, p: { solid: true } });
}
/* Pilastra: columna de ladrillo de 16 px con capitel de concreto y bola; mas alta que el parapeto. */
function parapetoPilastra() {
  var W = 20, H = 40, g = new G(W, H), r = rng(11100), x, y;
  ladrilloFace(g, 2, 20, 16, 17, r, { seed: 3, shift: 2 });
  for (y = 20; y < 37; y++) g.set(17, y, BR[0]);
  for (y = 15; y < 20; y++) for (x = 1; x < 19; x++) g.set(x, y, y === 15 ? CC[4] : (y === 19 ? CC[0] : (x < 3 ? CC[4] : (x > 15 ? CC[2] : CC[3]))));   // capitel
  for (y = 11; y < 15; y++) for (x = 3; x < 17; x++) g.set(x, y, y === 11 ? CC[4] : (x < 5 ? CC[4] : (x > 13 ? CC[2] : CC[3])));
  g.disc(10, 7, 4.5, CC[3]); g.disc(9, 6, 3, CC[4]); g.set(8, 5, '#ffffff'); g.rect(8, 11, 4, 1, CC[1]);
  for (x = 2; x < 18; x++) g.set(x, 37, BR[0]);
  outline(g, K, '#e8e2cc');
  contact(g, 10, 38, 9, 1.8, '#2a244070');
  return mk(g, 10, 37, 18, 16, { cast: { len: 0.4, a: 0.2 }, p: { tall: true, solid: true } });
}

/* ============================ MOBILIARIO ============================ */
function globe(g, cx, cy, r2) {
  for (var y = cy - r2 - 1; y <= cy + r2 + 1; y++) for (var x = cx - r2 - 1; x <= cx + r2 + 1; x++) {
    var dx = x - cx + 0.5, dy = y - cy + 0.5, d = Math.sqrt(dx * dx + dy * dy);
    if (d > r2 + 0.3) continue;
    var l = -(dx * 0.6 + dy * 0.8) / r2;
    g.set(x, y, l > 0.45 ? '#ffffff' : (l > -0.1 ? '#f6f2e6' : (l > -0.5 ? '#dcd6c8' : '#b4adc0')));
  }
  g.set(cx - 2, cy - 2, '#ffffff'); g.set(cx - 1, cy - 3, '#ffffff');
}
function farolCV(dark) {
  var W = 40, H = 76, ax = 20, ay = 72, g = new G(W, H), gy = 13, y, i;
  for (y = gy + 7; y <= ay - 6; y++) { g.set(ax - 1, y, VG[3]); g.set(ax, y, VG[2]); g.set(ax + 1, y, VG[0]); }
  for (y = ay - 8; y <= ay - 1; y++) { var w = 2 + Math.floor((y - (ay - 8)) / 2.2); for (i = -w; i <= w; i++) g.set(ax + i, y, i < -w + 1 ? VG[4] : (i > w - 1 ? VG[0] : VG[2])); }
  g.rect(ax - 5, ay - 1, 11, 2, VG[1]); g.rect(ax - 5, ay - 1, 11, 1, VG[3]);
  g.rect(ax - 2, ay - 20, 5, 2, VG[2]); g.set(ax - 2, ay - 20, VG[4]);                                              // collar
  g.rect(ax - 3, gy + 5, 7, 3, VG[1]); g.rect(ax - 3, gy + 5, 7, 1, VG[3]);                                          // copa
  if (dark) { g.disc(ax, gy, 5, '#7e8a96'); g.disc(ax + 1, gy + 1, 3.4, '#5c6a78'); g.set(ax - 2, gy - 2, '#a8b4c0'); } else globe(g, ax, gy, 5.2);
  g.rect(ax - 1, gy - 7, 3, 2, VG[1]); g.set(ax, gy - 8, VG[3]);
  [-1, 1].forEach(function (d) {                                                                                       // brazos y canastas colgantes de flores rojas
    var bx = ax + d * 11, by = gy + 20;
    g.line(ax + d * 1, gy + 15, bx, gy + 14, VG[1]); g.line(ax + d, gy + 14, bx, gy + 13, VG[2]); g.set(bx, gy + 14, VG[0]);
    g.line(bx, gy + 15, bx, by - 2, VG[0]);                                                                            // cadenita
    for (var yy = 0; yy < 5; yy++) { var hw = 4 - Math.floor(yy / 1.5); for (var xx = -hw; xx <= hw; xx++) g.set(bx + xx, by + yy, xx < -hw + 1 ? '#6a4a32' : (xx > hw - 1 ? '#2a1c14' : '#4a3222')); }
    for (var k = -5; k <= 5; k++) { var fy = by - 2 - Math.floor(Math.abs(Math.cos(k * 0.5)) * 2), fc = (k + 5) % 3 === 0 ? '#ff7a5a' : ((k + 5) % 3 === 1 ? '#ef3a32' : '#c8202a'); g.set(bx + k, fy, fc); g.set(bx + k, fy + 1, (k % 2) ? '#a8182a' : LG[2]); if (k % 2) g.set(bx + k, fy - 1, '#ff9a7a'); }
    g.set(bx - 5, by + 3, LG[2]); g.set(bx + 5, by + 4, LG[3]); g.set(bx - 4, by + 5, LG[1]); g.set(bx + 4, by + 6, LG[2]); g.set(bx - 5, by + 6, LG[1]);   // follaje que cuelga
  });
  outline(g, K, '#4f7a64');
  contact(g, ax, ay + 1, 7, 2, '#2a244070');
  return mk(g, ax, ay, 6, 4, { cast: { len: 0.3, a: 0.2 }, p: { tall: true, lamp: { x: 0, y: gy - ay }, tops: [], poleKind: 'luz' } });
}
function bancaCV() {
  var g = new G(34, 28), r = rng(9301), i, y, GS = ['#14382a', '#1f5a40', '#2f7a58', '#4a9a74'];
  [3, 29].forEach(function (lx) { g.rect(lx, 13, 3, 12, IR[1]); g.set(lx, 13, IR[3]); g.rect(lx - 1, 24, 5, 1, IR[2]); });
  for (i = 0; i < 3; i++) { y = 3 + i * 3; g.rect(3, y, 28, 2, GS[2]); g.rect(3, y, 28, 1, GS[3]); g.rect(3, y + 1, 28, 1, GS[1]); }
  g.rect(3, 3, 2, 10, IR[1]); g.rect(29, 3, 2, 10, IR[1]); g.rect(3, 3, 1, 10, IR[3]);
  g.rect(2, 12, 30, 4, GS[3]); g.rect(2, 12, 30, 1, '#86c4a0'); for (i = 5; i < 30; i += 6) g.set(i, 13, GS[2]);
  g.rect(2, 16, 30, 3, GS[2]); g.rect(2, 16, 30, 1, GS[3]); g.rect(2, 18, 30, 1, GS[1]);
  g.rect(1, 10, 3, 2, IR[2]); g.rect(30, 10, 3, 2, IR[2]); g.rect(1, 10, 3, 1, IR[3]); g.rect(30, 10, 3, 1, IR[3]);
  for (i = 0; i < 8; i++) g.set(4 + Math.floor(r() * 26), 12 + Math.floor(r() * 7), r() < 0.5 ? GS[1] : GS[3]);
  outline(g, K, '#3a6a54');
  contact(g, 17, 25, 15, 2.2, '#2a244070');
  return mk(g, 17, 25, 30, 7, { cast: { len: 0.35, a: 0.18 } });
}
function basureroCV(broken) {
  var W = 24, H = 28, g = new G(W, H), r = rng(9401), x, y, i, GB = ['#10301f', '#1b4a32', '#2a6a48', '#3f8a62'];
  if (!broken) {
    for (y = 8; y <= 22; y++) for (x = 5; x <= 16; x++) { var f = (x - 5) / 11; g.set(x, y, f < 0.2 ? GB[3] : (f < 0.55 ? GB[2] : (f < 0.85 ? GB[1] : GB[0]))); }
    g.rect(4, 6, 14, 3, GB[1]); g.rect(4, 6, 14, 1, GB[3]); g.rect(4, 8, 14, 1, GB[0]);                    // aro
    g.rect(6, 4, 10, 3, '#0a0a10'); g.rect(6, 4, 10, 1, '#2a2a34'); g.rect(8, 5, 6, 1, '#1c1a22');         // boca oscura
    for (y = 11; y <= 20; y += 3) g.rect(5, y, 12, 1, GB[0]);
    g.rect(7, 13, 8, 4, '#e6e0cc'); g.rect(7, 13, 8, 1, '#ffffff'); g.rect(8, 14, 2, 2, '#2f8a5a'); g.rect(11, 14, 3, 1, GB[1]); g.rect(11, 16, 3, 1, GB[1]);   // pegatina con hoja
    g.rect(5, 23, 12, 1, GB[0]);
    outline(g, K, '#5aa07a');
    contact(g, 11, 24, 8, 1.8, '#2a244070');
    return mk(g, 11, 23, 12, 8, { cast: { len: 0.4, a: 0.2 } });
  }
  for (y = 14; y <= 22; y++) for (x = 3; x <= 19; x++) { var ff = (y - 14) / 8; g.set(x, y, ff < 0.25 ? GB[3] : (ff < 0.6 ? GB[2] : (ff < 0.9 ? GB[1] : GB[0]))); }   // caido de lado
  g.rect(18, 14, 3, 9, GB[1]); g.rect(18, 14, 1, 9, GB[3]); g.rect(19, 15, 1, 7, '#0a0a10');
  for (x = 4; x <= 17; x += 3) g.rect(x, 14, 1, 9, GB[0]);
  for (i = 0; i < 12; i++) { var lx = Math.floor(r() * 14), ly = 17 + Math.floor(r() * 7); g.set(lx, ly, pick(r, ['#f3efe2', '#d8382a', '#f2d24a', '#a89f8a', '#3f9a5a'])); g.set(lx + 1, ly, pick(r, ['#f3efe2', '#cfc8b0'])); }
  outline(g, K, '#5aa07a');
  contact(g, 11, 24, 11, 1.8, '#2a244070');
  return mk(g, 11, 23, 18, 8, { cast: { len: 0.3, a: 0.18 } });
}
function bebedero() {
  var W = 22, H = 36, g = new G(W, H), ay = 32, ax = 11, y, x;
  box(g, 5, 10, 12, 22, 4, CC);                                                      // pilar de concreto
  g.rect(5, 29, 12, 3, CC[1]); g.rect(4, 31, 14, 1, CC[0]);
  g.rect(7, 12, 8, 1, CC[2]);
  g.rect(8, 5, 7, 5, '#c8ced0'); g.rect(8, 5, 7, 1, '#f2f6f6'); g.rect(8, 9, 7, 1, '#7e868a'); g.rect(10, 6, 3, 3, '#5a6870');   // cubeta de acero
  g.rect(13, 3, 4, 2, '#a4abaa'); g.rect(13, 3, 4, 1, '#e8eeee'); g.set(16, 5, '#5aa4bd'); g.set(16, 6, WA[3]);                      // caño y gota
  g.rect(5, 14, 12, 8, '#2f7a58'); g.rect(5, 14, 12, 1, '#4a9a74'); g.rect(5, 21, 12, 1, '#1f5a40');                                  // placa verde con grifo
  g.disc(11, 18, 2.2, '#cfd3cc'); g.set(10, 17, '#ffffff'); g.rect(10, 23, 3, 1, '#5aa4bd');
  outline(g, K, '#e8e2cc');
  contact(g, ax, ay + 1, 8, 2, '#2a244070');
  return mk(g, ax, ay, 12, 6, { cast: { len: 0.4, a: 0.2 } });
}
function cartelMiraflores(broken) {
  var W = 70, H = 52, g = new G(W, H), ay = 48, ax = 35, x, y;
  var PN = ['#10382a', '#1f5a3d', '#2f7a52', '#4a9a70'];
  if (!broken) { g.rect(10, 30, 3, 18, '#6a6870'); g.rect(10, 30, 1, 18, '#a8a8b0'); g.rect(57, 30, 3, 18, '#6a6870'); g.rect(57, 30, 1, 18, '#a8a8b0'); }
  else { g.rect(10, 34, 3, 14, '#6a6870'); g.rect(10, 34, 1, 14, '#a8a8b0'); g.rect(57, 30, 3, 18, '#6a6870'); }
  var y0 = broken ? 14 : 8;
  for (y = 0; y < 26; y++) for (x = 0; x < 62; x++) {
    var c = y === 0 ? PN[3] : (y === 25 ? PN[0] : (x === 0 ? PN[3] : (x === 61 ? PN[0] : PN[1]))); if (y === 1 && x > 0 && x < 61) c = PN[2];
    var px_ = 4 + x, py_ = y0 + y + (broken && px_ > 36 ? Math.floor((px_ - 36) / 5) : 0);
    if (broken && px_ > 33 && px_ < 37 + Math.floor((y + 1) * 0.3) && (y % 5) < 3) continue;       // grieta
    g.set(px_, py_, c);
  }
  // logo hoja de Miraflores: azul, verde y naranja
  var lx = 9, ly = y0 + 5 + (broken ? 0 : 0);
  g.rect(lx, ly + 10, 3, 3, '#f2a02a'); g.rect(lx + 3, ly + 7, 3, 6, '#3f9a5a'); g.rect(lx + 6, ly + 3, 3, 10, '#2f64c8'); g.rect(lx + 9, ly, 3, 13, '#5a92ec');
  g.set(lx + 3, ly + 7, '#8ad8a0'); g.set(lx + 6, ly + 3, '#8ab8ff'); g.set(lx + 9, ly, '#cfe4ff');
  px.text(g, 'MIRAFLORES', 24, y0 + 6, { font: 'a5', ink: '#f6f2e0', shadow: '#0a2418' });
  px.text(g, 'MALECON', 24, y0 + 14, { font: 'a5', ink: '#cfe8d8' });
  g.rect(5, y0 + 21, 60, 1, '#e8c860');
  outline(g, K, '#6ac898');
  contact(g, 11, ay + 1, 5, 1.4, '#2a244066'); contact(g, 58, ay + 1, 5, 1.4, '#2a244066');
  return mk(g, ax, ay, 56, 4, { cast: { len: 0.25, a: 0.18 }, p: { tall: true } });
}
function setoCV() {
  var g = new G(34, 20), r = rng(9101), i, x, y;
  for (y = 0; y < 13; y++) for (x = 0; x < 32; x++) {
    if ((y === 0 || y === 12) && (x < 2 || x >= 30)) continue; if ((x === 0 || x === 31) && (y < 1 || y >= 12)) continue;
    var c;
    if (y < 6) c = (y === 0 ? LG[4] : (r() < 0.25 ? LG[4] : LG[3]));
    else { var f = y - 6; c = f >= 6 ? LG[0] : (r() < 0.22 ? LG[3] : (r() < 0.4 ? LG[1] : LG[2])); if (x === 0 || x < 2 && r() < 0.5) c = LG[3]; if (x >= 30) c = LG[1]; }
    g.set(1 + x, 4 + y, c);
  }
  for (x = 0; x < 32; x += 3) { if (r() < 0.6) g.set(1 + x + (r() < 0.5 ? 1 : 0), 10, LG[1]); }
  for (i = 0; i < 12; i++) g.set(3 + Math.floor(r() * 28), 5 + Math.floor(r() * 5), LG[4]);
  outline(g, '#10261c', '#2e6a3c');
  contact(g, 17, 18, 15, 2.2, '#2a244070');
  return mk(g, 17, 17, 30, 6, { cast: { len: 0.4, a: 0.2 } });
}
function florera(kind) {
  var W = 40, H = 26, g = new G(W, H), r = rng(9200 + kind), cx = 20, cy = 12, i, x, y;
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    var dx = (x - cx + 0.5) / 18, dy = (y - cy + 0.5) / 8.5, d = dx * dx + dy * dy, dy3 = (y - 3 - cy + 0.5) / 8.5, d3 = dx * dx + dy3 * dy3;
    if (d3 < 1) g.set(x, y, d3 > 0.74 ? '#d8cab4' : null);
    if (d < 1 && d3 >= 1) g.set(x, y, y > cy + 3 ? '#a89a84' : '#9a8c76');
  }
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    var ex = (x - cx + 0.5) / 16, ey = (y - (cy - 2) + 0.5) / 6.5, e = ex * ex + ey * ey;
    if (e >= 1) continue;
    g.set(x, y, e > 0.75 ? LG[0] : (ex < -0.2 && ey < 0 ? LG[2] : LG[1]));
  }
  var pals = [['#5a1a3a', '#8a2a52', '#c0487a', '#e06a9a'], ['#c9741a', '#f6a81c', '#ffd83a', '#ffeb7a'], ['#c8a0b8', '#e8c0d4', '#f8e0ec', '#ffffff']], pal = pals[kind];
  for (y = cy - 8; y < cy + 5; y++) for (x = 3; x < W - 3; x++) {
    var fx = (x - cx + 0.5) / 16, fy = (y - (cy - 2) + 0.5) / 6.5;
    if (fx * fx + fy * fy >= 0.96 || !g.get(x, y)) continue;
    if (r() < 0.55) { var lv = fy < -0.2 || fx < -0.4 ? 2 : (fy > 0.5 ? 0 : 1); if (r() < 0.25) lv++; g.set(x, y, pal[clamp(lv, 0, 3)]); }
    else if (r() < 0.18) g.set(x, y, LG[3]);
  }
  outline(g, '#2a1c1c', '#f0e4d0');
  contact(g, cx, cy + 9, 17, 2.4, '#2a244070');
  return mk(g, cx, cy + 9, 34, 8, { cast: { len: 0.3, a: 0.18 } });
}

/* ============================ PALMERAS Y FICUS ============================ */
var TC = ['#4a3f34', '#6b5d4a', '#8a7a62', '#a8987c', '#c4b496'];
/* Palmera canaria (Phoenix canariensis): tronco ancho con rombos de cicatrices y penacho enorme y denso. */
function palmeraCanaria(o) {
  var W = o.W || 100, H = o.H || 128, ay = H - 6, ax = W >> 1, g = new G(W, H), r = rng(o.seed), i, y, x;
  var crownY = o.crownY, crownX = ax + o.bend, tw = o.tw || 8;
  for (y = ay; y >= crownY; y--) {
    var t = (ay - y) / (ay - crownY), cxT = ax + Math.round(o.bend * Math.pow(t, 1.8) + Math.sin(t * 3.1 + o.seed) * o.wave);
    var w = Math.round((t < 0.08 ? tw + 3 : tw) - t * 1.5), x0 = cxT - Math.floor(w / 2);
    for (i = 0; i < w; i++) {
      var f = (i + 0.5) / w, c = f < 0.22 ? TC[4] : (f < 0.5 ? TC[3] : (f < 0.75 ? TC[2] : (f < 0.92 ? TC[1] : TC[0])));
      var dm = (((y + Math.round(i * 1.2)) % 6) + 6) % 6, dm2 = (((y - Math.round(i * 1.2)) % 6) + 6) % 6;
      if (dm === 0 && i > 0 && i < w - 1 && t > 0.04) c = f < 0.5 ? TC[2] : TC[0];         // rombos de cicatrices
      if (dm2 === 3 && i > 0 && i < w - 1 && t > 0.04 && f < 0.45) c = TC[4];
      g.set(x0 + i, y, c);
    }
  }
  for (y = ay - 4; y <= ay; y++) for (x = ax - 7; x <= ax + 7; x++) if (g.get(x, y) && r() < 0.28) g.set(x, y, TC[1]);
  (o.dead || []).forEach(function (d) { frond(g, crownX, crownY + 4, d[0], d[1], d[2], [PG[0], '#5a4a22', '#7a6a34', '#a89050', '#c8b068'], 3.4, 1); });
  o.fronds.forEach(function (f, k) {
    var lit = f[0] < -90 && f[0] > -200 ? 1 : 0;
    var cols = lit ? [PG[0], PG[1], PG[2], PG[3], PG[4]] : [PG[0], PG[0], PG[1], PG[2], PG[3]];
    if (f[3]) cols = [PG[0], PG[0], PG[1], PG[1], PG[2]];
    frond(g, crownX, crownY, f[0], f[1] * 1.5, f[2], cols, o.leaf * 1.25, k);
  });
  g.disc(crownX, crownY + 2, 4, PG[2]); g.disc(crownX - 1, crownY, 2.5, PG[3]);
  [[0, 6], [-3, 7], [3, 7], [-1, 9]].forEach(function (d) { g.disc(crownX + d[0], crownY + d[1] + 1, 1.5, '#d98a2a'); g.set(crownX + d[0] - 1, crownY + d[1], '#f0b050'); });
  outline(g, '#142a22', '#2b4a38');
  for (i = 0; i < 18; i++) { var lx = ax - 8 + Math.floor(r() * 17), ly = ay + Math.floor(r() * 4); if (!g.get(lx, ly)) g.set(lx, ly, pick(r, ['#8a7658', '#6b5a48', '#a8956e'])); }
  contact(g, ax, ay + 1, 8, 2.5, '#2a244070');
  return mk(g, ax, ay, 5, 5, { cast: { len: 0.4, a: 0.2 }, p: { tall: true, tree: true, canopy: { x: -(W >> 1) + 4, y: -(ay - crownY) - 14, w: W - 8, h: 54 } } });
}
/* Washingtonia: tronco delgado y alto, abanicos y falda de hojas secas bajo la copa. */
function palmeraAbanico() {
  var W = 84, H = 132, ay = 126, ax = 42, g = new G(W, H), r = rng(8504), y, i, crownY = 34, crownX = ax + 3;
  for (y = ay; y >= crownY; y--) {
    var t = (ay - y) / (ay - crownY), cxT = ax + Math.round(3 * Math.pow(t, 1.6) + Math.sin(t * 2.4) * 1.0), w = t < 0.06 ? 6 : (t > 0.88 ? 4 : 5), x0 = cxT - Math.floor(w / 2);
    var cols = w === 4 ? [TG[4], TG[3], TG[2], TG[1]] : (w === 5 ? [TG[4], TG[3], TG[2], TG[2], TG[1]] : [TG[4], TG[3], TG[3], TG[2], TG[1], TG[0]]);
    for (i = 0; i < w; i++) g.set(x0 + i, y, (y % 6 === 0 && i > 0) ? TG[1] : cols[i]);
  }
  for (i = 0; i < 34; i++) { var a = (i / 34) * 2 * Math.PI, rr = 8 + (i % 3) * 2; var sx = crownX + Math.cos(a) * 7, sy = crownY + 8 + Math.abs(Math.sin(a)) * 4; for (var k = 0; k < 11 + (i % 4) * 2; k++) g.set(sx + Math.cos(a) * 2 * (k / 11), sy + k * 0.9 + Math.abs(Math.cos(a)) * k * 0.3, k < 6 ? '#8a6a3a' : '#6a4e2a'); }  // falda seca
  for (i = 0; i < 40; i++) g.set(crownX - 7 + Math.floor(r() * 14), crownY + 8 + Math.floor(r() * 18), pick(r, ['#8a6a3a', '#a8824a', '#6a4e2a', '#c4a468']));
  [[-176, 30], [-148, 32], [-118, 30], [-90, 32], [-62, 30], [-32, 32], [-4, 30], [20, 22], [160, 22]].forEach(function (f, k) {                   // abanicos: hojas largas casi rectas con punta caida
    var cols = f[0] < -100 && f[0] > -170 ? [PG[0], PG[1], PG[2], PG[3], PG[4]] : [PG[0], PG[0], PG[1], PG[2], PG[3]];
    frond(g, crownX, crownY, f[0], f[1] * 1.15, 0.5 + (k % 3) * 0.12, cols, 5.2, k);
  });
  g.disc(crownX, crownY + 2, 3.5, PG[2]);
  outline(g, '#142a22', '#2b4a38');
  contact(g, ax, ay + 1, 6, 2.2, '#2a244070');
  return mk(g, ax, ay, 4, 4, { cast: { len: 0.4, a: 0.2 }, p: { tall: true, tree: true, canopy: { x: -40, y: -96, w: 80, h: 56 } } });
}
/* Ficus de copa redonda y tronco retorcido (el del malecon es mas ordenado que el del Kennedy): 104x92 */
function ficusCV(o) {
  var W = 108, H = 94, ay = 88, ax = 54, g = new G(W, H), r = rng(o.seed), i, owner = new Array(W * 56), d = o.lean;
  [[-1, 16, 10], [1, 18, 11], [-1, 8, 6], [1, 9, 6]].forEach(function (rt) { stem(g, [[ax + rt[0] * 3, ay - rt[2]], [ax + rt[0] * rt[1] * 0.55, ay - rt[2] * 0.25], [ax + rt[0] * rt[1], ay]], 6, 2, o.tw + rt[1]); });
  stem(g, [[ax, ay + 1], [ax - 2 + d, ay - 14], [ax + 3 + d, ay - 28], [ax + d * 2, ay - 42]], 16, 11, o.tw);
  stem(g, [[ax + 1 + d, ay - 26], [ax - 7 + d, ay - 38], [ax - 17 + d, ay - 46]], 8, 5, o.tw + 1.7);
  stem(g, [[ax + 3 + d, ay - 30], [ax + 11 + d, ay - 40], [ax + 19 + d, ay - 46]], 7, 4, o.tw + 3.1);
  leafMass(g, o.masses, FG, 56, owner, r, { tufts: 4 });
  outline(g, '#101e1a', '#2b4a38');
  (o.gaps || []).forEach(function (hp) {
    var hw = hp[2], hh = hp[3], yy, xx;
    for (yy = 0; yy < hh; yy++) { var ins = (yy === 0 || yy === hh - 1) ? 1 : 0; for (xx = ins; xx < hw - ins; xx++) g.set(hp[0] + xx, hp[1] + yy, null); }
    for (xx = 1; xx < hw - 1; xx++) if (g.get(hp[0] + xx, hp[1] + hh)) g.set(hp[0] + xx, hp[1] + hh, '#101e1a');
  });
  for (i = 0; i < 40; i++) { var lx3 = ax - 15 + Math.floor(r() * 31), ly3 = ay - 1 + Math.floor(r() * 4); if (!g.get(lx3, ly3)) g.set(lx3, ly3, pick(r, ['#6b5a48', '#8a7658', '#3a6a3c', '#4a7a44'])); }
  contact(g, ax, ay + 1, 16, 3.6, '#2a244070');
  return mk(g, ax, ay, 14, 6, { cast: { len: 0.4, a: 0.2 }, p: { tall: true, tree: true, canopy: { x: -50, y: -82, w: 100, h: 52 } } });
}

function bakeFurniture() {
  M.parapeto = parapeto(0); M.parapeto.variants = [parapeto(0), parapeto(1), parapeto(2)];
  M.parapetoPilastra = parapetoPilastra();
  M.farolCV = farolCV(false); M.farolCV.dark = farolCV(true);
  M.bancaCV = bancaCV();
  M.basureroCV = basureroCV(false); M.basureroCV.broken = basureroCV(true);
  M.bebedero = bebedero();
  M.cartelMiraflores = cartelMiraflores(false); M.cartelMiraflores.broken = cartelMiraflores(true);
  M.setoCV = setoCV();
  M.flores = [0, 1, 2].map(florera);
}
function bakePlants() {
  M.palmeraCV = [
    palmeraCanaria({ seed: 8601, bend: 2, wave: 1.0, leaf: 6, crownY: 30, W: 104, H: 130, tw: 9, dead: [[100, 14, 0.25], [78, 13, 0.25]],
      fronds: [[-98, 22, 0.12, 1], [-80, 21, 0.12, 1], [-130, 28, 0.32], [-50, 28, 0.32], [-168, 29, 0.55], [-12, 29, 0.55], [152, 23, 0.62], [28, 23, 0.62], [-112, 20, 0.18, 1], [-68, 20, 0.18, 1], [-146, 25, 0.4], [-34, 25, 0.4], [178, 24, 0.7], [2, 24, 0.7]] }),
    palmeraCanaria({ seed: 8602, bend: -4, wave: -1.5, leaf: 5.6, crownY: 34, W: 96, H: 108, tw: 8, dead: [[104, 15, 0.28], [84, 12, 0.22]],
      fronds: [[-92, 22, 0.1, 1], [-126, 27, 0.34], [-58, 27, 0.34], [-162, 29, 0.56], [-20, 29, 0.56], [168, 22, 0.6], [12, 22, 0.6], [-108, 19, 0.2, 1], [-76, 19, 0.2, 1], [-144, 25, 0.4], [-36, 25, 0.4]] }),
    palmeraAbanico()
  ];
  M.ficusCV = [
    ficusCV({ seed: 8701, tw: 0.5, lean: 0, masses: [[54, 14, 21, 12, 4.3], [30, 24, 20, 14, 0.4], [80, 23, 21, 14, 2.1], [54, 30, 28, 14, 1.2], [13, 36, 13, 8, 3.1], [94, 35, 13, 8, 5.2], [38, 43, 15, 7, 2.6], [70, 43, 16, 7, 4.4]], gaps: [[44, 22, 7, 4], [66, 17, 6, 4], [24, 31, 6, 3]] }),
    ficusCV({ seed: 8702, tw: 2.4, lean: -2, masses: [[52, 12, 19, 11, 0.3], [28, 22, 19, 13, 1.4], [78, 21, 20, 13, 3.1], [53, 29, 26, 13, 2.2], [11, 34, 12, 8, 4.1], [96, 33, 12, 8, 0.9], [36, 41, 14, 7, 1.7], [72, 41, 14, 7, 3.9]], gaps: [[42, 21, 7, 4], [68, 24, 6, 4], [92, 28, 5, 3]] })
  ];
}

/* ============================ PARQUE DEL AMOR ============================ */
var BL = ['#1f4f9c', '#2f6fcf', '#3f93d8', '#2fb0c0', '#79cfe0'];
var RD = ['#8a1c26', '#a8242a', '#c83036', '#e4483c'];
var OR = ['#d8602a', '#e0702a', '#f08a38', '#f2a040'];
var YL = ['#e8b020', '#f0c030', '#f8d85a'];
var PHRASES = [
  { l: ['ESTUPENDO AMOR', 'AMAR EL MAR'], by: 'Eielson' },
  { l: ['AMOR GRAN', 'LABERINTO'], by: 'Salazar Bondy' },
  { l: ['CANTA AMOR', 'DESNÚDATE'], by: 'Hinostroza' },
  { l: ['MI RECUERDO ES', 'MÁS FUERTE QUE', 'TU OLVIDO'], by: 'Salaverry' },
  { l: ['A TI COMO LA LUZ', 'DEL MUNDO A', 'LAS VENTANAS'], by: 'Rose' }
];
/* Muro-banca ondulante de trencadis. 88x72, ancla (44, 70) abajo al centro; la cresta ondula, el asiento sale al frente. */
function muroMosaico(o) {
  var W = o.W || 88, H = 72, g = new G(W, H), x, y, i, r = rng(o.seed);
  var famA = o.famA, famB = o.famB, famC = o.famC;
  var crest = [], TOP = 6, seatTop = H - 15, face0 = [];
  for (x = 0; x < W; x++) { crest[x] = Math.round(11 + o.amp * Math.sin(x / W * Math.PI * 2 * o.waves + o.phase)); face0[x] = crest[x] + TOP; }
  var bw = o.lines ? o.lines.length * 7 + 5 : 0, bandY = Math.round(34 - bw / 2) + 3, bandX = 5, bandW = W - 10;
  var region = function (cx, cy, id) {
    var xi = clamp(Math.round(cx), 0, W - 1), ct = crest[xi];
    if (cy < ct + TOP - 0.5) return famC[Math.floor(hash2(id, 3, o.seed) * famC.length)];                        // tapa
    if (cy >= seatTop + 5) return famC[Math.floor(hash2(id, 5, o.seed) * famC.length)] === '#f3efe2' ? BL[3] : BL[Math.floor(hash2(id, 6, o.seed) * 5)];        // frente del asiento: azules
    if (cy >= seatTop) return famC[Math.floor(hash2(id, 7, o.seed) * famC.length)];
    if (o.lines && cy >= bandY - 1 && cy <= bandY + bw + 1) return '#a8242a';
    var wv = cy - (ct + TOP) - 3 * Math.sin(cx * 0.32 + o.phase);                                                 // franjas de olas azules bajo la cresta
    if (wv >= 0 && wv < 9 && !o.lines) return BL[Math.floor(wv / 2) % 4 + (hash2(id, 9, o.seed) < 0.3 ? 1 : 0)];
    if (cy > bandY + bw && cy < seatTop) return famB[Math.floor(hash2(id, 11, o.seed) * famB.length)];
    return famA[Math.floor(hash2(id, 13, o.seed) * famA.length)];
  };
  // masa del muro (cresta + cara) y del asiento
  var mask = new G(W, H);
  for (x = 1; x < W - 1; x++) {
    var edgeSoft = (x < 3 || x > W - 4) ? 2 : 0;
    for (y = crest[x] + edgeSoft; y < seatTop + 14; y++) mask.set(x, y, '#000');
  }
  var mos = new G(W, H);
  trencadis(mos, 0, 0, W, H, o.cs || 4.6, o.seed * 7 + 1, region, { grout: '#eee6d0' });
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (mask.get(x, y)) g.set(x, y, mos.get(x, y) || '#eee6d0');
  // sombra propia: oclusion bajo la tapa y bajo el asiento, luz en el canto izquierdo
  for (x = 1; x < W - 1; x++) {
    var fy = face0[x]; if (fy < seatTop) { var c1 = g.get(x, fy); if (c1) g.set(x, fy, mix(c1, '#1c2a60', 0.45)); var c2 = g.get(x, fy + 1); if (c2) g.set(x, fy + 1, mix(c2, '#1c2a60', 0.2)); }
    var cr = g.get(x, crest[x]); if (cr) g.set(x, crest[x], '#ffffff');
  }
  for (x = 1; x < W - 1; x++) { var s1 = g.get(x, seatTop); if (s1) g.set(x, seatTop, '#ffffff'); var s2 = g.get(x, seatTop + 5); if (s2) g.set(x, seatTop + 5, mix(s2, '#1c2a60', 0.45)); var s3 = g.get(x, seatTop + 14 - 1); if (s3) g.set(x, seatTop + 13, mix(s3, '#10183a', 0.55)); }
  for (y = 0; y < H; y++) { var l = g.get(1, y); if (l) g.set(1, y, mix(l, '#ffffff', 0.35)); var rr = g.get(W - 2, y); if (rr) g.set(W - 2, y, mix(rr, '#10183a', 0.45)); }
  if (o.lines) {                                                           // placa de la frase: rojo oscuro con borde, letras blancas
    var plate = new G(W, H);
    trencadis(plate, bandX, bandY, bandW, bw, 3.6, o.seed + 77, function (cx, cy, id) { return RD[Math.floor(hash2(id, 2, o.seed) * 3)]; }, { grout: '#c86a5a' });
    for (y = bandY; y < bandY + bw; y++) for (x = bandX; x < bandX + bandW; x++) { var pc = plate.get(x, y); if (pc) g.set(x, y, mix(pc, '#3a0a10', 0.35)); }
    for (x = bandX - 1; x <= bandX + bandW; x++) { g.set(x, bandY - 1, '#f6e8c8'); g.set(x, bandY + bw, '#c0a070'); }
    for (y = bandY - 1; y <= bandY + bw; y++) { g.set(bandX - 1, y, '#f6e8c8'); g.set(bandX + bandW, y, '#c0a070'); }
    o.lines.forEach(function (ln, k) { px.text(g, ln, Math.round(W / 2), bandY + 4 + k * 7, { font: 'a5', ink: '#fffbea', outline: '#5a0c14', align: 'c' }); });
  }
  if (o.sun) {                                                             // sol de rayos rojo-anaranjados sobre disco azul
    var scx = W / 2, scy = 36, d0 = 9, d1 = 22, ny = 12;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (y <= crest[clamp(x, 0, W - 1)] + TOP + 1 || y >= seatTop - 1) continue;
      var dx = x + 0.5 - scx, dy = y + 0.5 - scy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) / (Math.PI * 2) + 0.5, rp = (a * ny) % 1, ri = Math.floor(a * ny), sc2 = null, hl = (dx + dy < 0);
      if (d < 3.5) sc2 = YL[hl ? 2 : 1];
      else if (d < d0 - 3) sc2 = hl ? BL[3] : BL[2];
      else if (d < d0) sc2 = hl ? BL[1] : BL[0];
      else if (d < d0 + 2) sc2 = hl ? YL[2] : YL[0];
      else if (d < d1) { var tt = 1 - (d - d0 - 2) / (d1 - d0 - 2); if (Math.abs(rp - 0.5) < 0.1 + tt * 0.4) sc2 = (ri & 1) ? (hl ? RD[3] : RD[1]) : (hl ? OR[3] : OR[1]); if (sc2 && Math.abs(rp - 0.5) > 0.06 + tt * 0.4) sc2 = RD[0]; }
      if (sc2 && hash2(x, y, 9) < 0.1) sc2 = mix(sc2, "#ffffff", 0.25);
      if (sc2) g.set(x, y, sc2);
    }
  }
  outline(g, '#1c2450', '#ffffff');
  contact(g, W / 2, H - 1, W / 2 - 4, 2.2, '#2a244070');
  return mk(g, W >> 1, H - 3, W - 4, 9, { cast: { len: 0.35, a: 0.2 }, p: { solid: true, phrase: o.by ? PHRASES[o.idx].l.join(' ') : undefined, author: o.by } });
}
var FAM = {
  azul: ['#1f4f9c', '#2f6fcf', '#3f93d8', '#2fb0c0', '#79cfe0', '#f3efe2'],
  calido: ['#e4483c', '#f08a38', '#f0c030', '#f3efe2', '#c83036', '#f8d85a'],
  verde: ['#2f8a5a', '#4aa870', '#79cfe0', '#f0c030', '#f3efe2', '#2fb0c0'],
  ocre: ['#c8802a', '#e0a040', '#f0c030', '#f3efe2', '#e4483c', '#a8581c']
};
function bakeMosaicos() {
  var cfg = [
    { famA: FAM.azul, famB: FAM.calido, famC: ['#f3efe2', '#79cfe0', '#f3efe2', '#3f93d8'], phase: 0.0, amp: 3.6, waves: 1.5, seed: 31 },
    { famA: FAM.calido, famB: FAM.azul, famC: ['#f3efe2', '#f08a38', '#f3efe2', '#f0c030'], phase: 1.7, amp: 4.2, waves: 1.2, seed: 32 },
    { famA: FAM.verde, famB: FAM.calido, famC: ['#f3efe2', '#79cfe0', '#f8d85a', '#f3efe2'], phase: 3.1, amp: 3.2, waves: 1.8, seed: 33 },
    { famA: FAM.azul, famB: FAM.ocre, famC: ['#f3efe2', '#e4483c', '#f3efe2', '#79cfe0'], phase: 4.4, amp: 4.0, waves: 1.4, seed: 34 },
    { famA: FAM.ocre, famB: FAM.azul, famC: ['#f3efe2', '#3f93d8', '#f0c030', '#f3efe2'], phase: 5.5, amp: 3.4, waves: 1.6, seed: 35 }
  ];
  M.muroMosaico = cfg.map(function (c, i) { c.lines = PHRASES[i].l; c.by = PHRASES[i].by; c.idx = i; return muroMosaico(c); });
  M.solMosaico = muroMosaico({ famA: ["#f8ecc8", "#f3efe2", "#f0dca0", "#f8e4a8"], famB: ["#f8ecc8", "#f3efe2", "#79cfe0", "#f0dca0"], famC: ["#f3efe2", "#79cfe0", "#f3efe2", "#f0c030"], phase: 0.6, amp: 2.2, waves: 1, seed: 36, sun: true, W: 88 });
  M.frases = PHRASES.map(function (p) { return { lines: p.l.slice(), autor: p.by }; });
}

/* ============================ EL BESO (Victor Delfin) ============================ */
var SC = ['#6a2e22', '#9c4a32', '#c06440', '#dc8258', '#f0a67c'];       // terracota salmon, figura de adelante
var SD = ['#5a281e', '#85402c', '#a85838', '#c4724c', '#dc9068'];       // la de atras, un paso mas oscura
/* 232x158. Ancla (116, 150) = base del cantero (frente). Pedestal de azulejo oscuro, losa en cruz y la pareja tumbada. */
function beso() {
  var W = 232, H = 158, ax = 116, ay = 150, g = new G(W, H), r = rng(6001), x, y, i;
  // --- cantero: seto recortado + flores violeta/rosa + cara frontal de concreto ---
  var bx0 = 6, bx1 = 226, by0 = 114, by1 = 140;
  for (y = by0; y < by1; y++) for (x = bx0; x < bx1; x++) {
    var ex = Math.min(x - bx0, bx1 - 1 - x), ey = Math.min(y - by0, by1 - 1 - y);
    if (ex < 2 && ey < 2) continue; if (ex === 0 && ey < 3) continue;
    var c;
    if (ey < 7 || ex < 5) c = (y < by0 + 3) ? (r() < 0.3 ? LG[4] : LG[3]) : (r() < 0.25 ? LG[3] : (r() < 0.5 ? LG[2] : LG[1]));         // seto
    else { c = r() < 0.55 ? ['#7a2a6a', '#a8408a', '#c85aa8', '#e07ac4'][Math.floor(r() * 4)] : (r() < 0.5 ? LG[2] : LG[1]); if (r() < 0.06) c = '#ffe0f0'; }
    if (ey >= by1 - by0 - 3) c = LG[0];
    g.set(x, y, c);
  }
  for (y = by1; y < by1 + 5; y++) for (x = bx0 + 1; x < bx1 - 1; x++) g.set(x, y, y === by1 ? '#d8d4c4' : (y === by1 + 4 ? CC[0] : (x % 24 === 0 ? CC[1] : CC[2])));      // cara de concreto del cantero
  // --- pedestal: plinto + columna de azulejo oscuro ---
  var colX0 = 96, colX1 = 138, colTop = 76, colBase = 128;
  function tile(x0, y0, x1, y1, shadeSide) {
    for (var yy = y0; yy < y1; yy++) for (var xx = x0; xx < x1; xx++) {
      var lx = (xx - x0) % 7, ly = (yy - y0) % 7, t = Math.floor(hash2(Math.floor((xx - x0) / 7), Math.floor((yy - y0) / 7), 99) * 2.6), cc;
      if (lx === 6 || ly === 6) cc = DT[0];
      else { cc = DT[1 + Math.min(2, t)]; if (lx === 0 || ly === 0) cc = DT[Math.min(4, 2 + t)]; if (lx <= 2 && ly <= 2 && lx + ly <= 2) cc = DT[4]; }
      if (shadeSide && xx >= x1 - 8) cc = DT[Math.max(0, DT.indexOf(cc) - 1)];
      g.set(xx, yy, cc);
    }
  }
  tile(88, 122, 146, 134, false);                                                   // plinto
  g.rect(88, 122, 58, 1, DT[4]); g.rect(88, 133, 58, 1, DT[0]);
  tile(colX0, colTop + 6, colX1, colBase, true);                                    // columna
  g.rect(colX0, colTop + 6, colX1 - colX0, 1, DT[4]);
  // --- losa ancha: la mesa sobre la que se tumban ---
  var sy0 = 66, sy1 = 82;
  for (y = sy0; y < sy1; y++) for (x = 14; x < 218; x++) {
    var xe = Math.min(x - 14, 217 - x); if (y < sy0 + 3 && xe < 3 - (y - sy0)) continue;
    var cc = y < sy0 + 3 ? (y === sy0 ? DT[4] : DT[3]) : null;
    if (!cc) { var lx = (x - 14) % 8, ly = (y - sy0 - 3) % 8, t = Math.floor(hash2(Math.floor((x - 14) / 8), Math.floor((y - sy0 - 3) / 8), 98) * 2.6); cc = (lx === 7 || ly === 7) ? DT[0] : DT[1 + Math.min(2, t)]; if (lx === 0 && ly < 7) cc = DT[Math.min(4, 2 + t)]; if (xe < 6) cc = DT[Math.max(0, DT.indexOf(cc) - 1)]; if (y >= sy1 - 2) cc = DT[0]; }
    g.set(x, y, cc);
  }
  // sombra de la losa sobre la columna
  for (x = colX0; x < colX1; x++) { g.set(x, sy1, DT[0]); g.set(x, sy1 + 1, DT[0]); g.set(x, sy1 + 3, DT[1]); }
  // --- la pareja ---
  var A = new G(W, H), B = new G(W, H), gy = sy0 + 2;
  // figura de atras (tumbada boca arriba, mira al cielo): cabeza a la izquierda, piernas largas a la derecha con los pies hacia arriba
  limb(A, [[22, gy - 5, 4], [28, gy - 5, 5]], SD);                                          // cabello esparcido sobre la losa
  A.disc(37, gy - 9, 8.5, SD[3]); limb(A, [[37, gy - 9, 8.5]], SD);
  limb(A, [[46, gy - 8, 8], [66, gy - 9, 9.5], [92, gy - 9, 10], [114, gy - 8, 9]], SD);      // torso
  limb(A, [[112, gy - 8, 9.5], [140, gy - 7, 8], [168, gy - 6, 6.5], [186, gy - 7, 5]], SD);  // piernas
  limb(A, [[188, gy - 9, 4.6], [197, gy - 20, 4.2]], SD);                                      // pie con la planta hacia arriba
  limb(A, [[70, gy - 12, 4.4], [84, gy - 25, 3.8], [104, gy - 29, 3.2]], SD);                  // brazo que abraza a la otra
  // figura de adelante: se inclina sobre ella, la besa; rodilla levantada
  limb(B, [[118, gy - 20, 9], [96, gy - 28, 10.5], [72, gy - 30, 10], [58, gy - 31, 8.5]], SC); // torso inclinado
  limb(B, [[118, gy - 20, 9], [142, gy - 40, 8], [160, gy - 32, 6.5], [180, gy - 18, 5], [190, gy - 11, 3.6]], SC);   // pierna doblada: muslo arriba, pantorrilla cae
  limb(B, [[116, gy - 17, 8], [146, gy - 10, 7], [174, gy - 6, 5], [186, gy - 5, 3.6]], SC);   // la otra pierna, estirada
  B.disc(50, gy - 33, 8.8, SC[3]); limb(B, [[50, gy - 33, 8.8]], SC);
  limb(B, [[66, gy - 36, 4.6], [48, gy - 24, 4], [40, gy - 18, 3.4]], SC);                    // brazo que sostiene la cabeza de ella
  limb(B, [[106, gy - 33, 4.2], [96, gy - 21, 3.6]], SC);                                      // otro brazo
  limb(B, [[186, gy - 7, 4], [194, gy - 22, 4.6]], SC);                                        // pie, planta hacia arriba
  // cabello oscuro
  limb(B, [[46, gy - 40, 6.2], [57, gy - 38, 6]], ['#2a120e', '#3a1c14', '#4a261a', '#5a3220', '#6a3c28']);
  limb(A, [[30, gy - 15, 5.5], [38, gy - 17, 5.5], [44, gy - 13, 3.5]], ['#2a120e', '#3a1c14', '#4a261a', '#5a3220', '#6a3c28']);
  // rasgos: nariz, labios que se encuentran, ojos cerrados
  B.set(40, gy - 34, SC[4]); B.set(41, gy - 33, SC[4]); B.set(39, gy - 32, SC[1]); B.set(40, gy - 31, SC[0]); B.set(41, gy - 31, SC[0]);
  A.set(40, gy - 12, SD[4]); A.set(41, gy - 11, SD[4]); A.set(42, gy - 10, SD[1]); A.set(41, gy - 8, SD[0]); A.set(42, gy - 8, SD[0]);
  // dedos de los pies
  [0, 1, 2, 3].forEach(function (k) { A.set(195 + k, gy - 28 - (k === 1 || k === 2 ? 1 : 0), SD[4]); B.set(192 + k, gy - 30 - (k === 1 || k === 2 ? 1 : 0), SC[4]); });
  outline(A, '#3a1810', null); outline(B, '#3a1810', null);
  g.blit(A, 0, 0); g.blit(B, 0, 0);
  // baranda de tubos color oxido
  var rbY = 146;
  for (x = 10; x <= 222; x++) { var onTop = x % 24 === 0; g.set(x, rbY - 9, OX[3]); g.set(x, rbY - 8, OX[2]); g.set(x, rbY - 4, OX[3]); g.set(x, rbY - 3, OX[1]); if (onTop) for (y = rbY - 11; y <= rbY; y++) { g.set(x, y, y === rbY - 11 ? OX[3] : OX[2]); g.set(x + 1, y, OX[1]); } }
  for (x = 10; x <= 222; x += 24) { g.set(x - 1, rbY + 1, OX[0]); g.set(x, rbY + 1, OX[0]); g.set(x + 1, rbY + 1, OX[0]); }
  outline(g, K, null);
  contact(g, ax, ay + 1, 108, 2.4, '#2a244070');
  return mk(g, ax, ay, 214, 36, { cast: { len: 0.45, a: 0.22 }, p: { tall: true, name: 'El Beso', pedestal: { x: colX0 - ax, y: colBase - ay, w: colX1 - colX0, h: 16 } } });
}

/* ============================ CUPIDO (Marcelo Wong): escultura roja brillante ============================ */
var CR = ['#4a0a14', '#8a1420', '#c8202e', '#e83a42', '#ff8a82'];
function cupido() {
  var W = 64, H = 84, ax = 28, ay = 78, g = new G(W, H), r = rng(6101), x, y;
  // cantero circular con seto y pasto
  for (y = 56; y < 82; y++) for (x = 2; x < 56; x++) {
    var dx = (x - 28 + 0.5) / 27, dy = (y - 66 + 0.5) / 11, d = dx * dx + dy * dy, dy3 = (y - 3 - 66 + 0.5) / 11, d3 = dx * dx + dy3 * dy3;
    if (d3 < 1) g.set(x, y, d3 > 0.78 ? (r() < 0.3 ? LG[4] : LG[3]) : (d3 > 0.5 ? LG[2] : LG[1]));
    else if (d < 1) g.set(x, y, d > 0.85 ? LG[0] : LG[1]);
  }
  for (x = 0; x < 14; x++) g.set(10 + Math.floor(r() * 36), 62 + Math.floor(r() * 10), r() < 0.5 ? '#ffd83a' : '#f3efe2');
  g.ell(28, 68, 14, 5, '#7e828a'); g.ell(28, 67, 13, 4, '#a9adb4'); g.ell(26, 66, 8, 2, '#d4d8de'); g.ell(28, 70, 13, 2, '#5a5e66');   // disco de metal
  // cabeza regordeta: gran bola roja, nariz y labios grandes
  limb(g, [[28, 36, 17]], CR);
  limb(g, [[28, 36, 17]], CR);
  g.ell(40, 41, 5.5, 4.5, CR[3]); limb(g, [[41, 40, 4.4]], CR);                          // nariz (hacia la derecha)
  limb(g, [[22, 47, 3.5], [30, 48, 3.5], [36, 46, 3]], CR);                               // labios
  g.rect(24, 48, 12, 1, CR[0]);
  g.set(22, 34, CR[0]); g.set(23, 34, CR[0]); g.set(23, 33, CR[0]);                        // ojo cerrado
  g.set(30, 33, CR[0]); g.set(31, 33, CR[0]); g.set(31, 32, CR[0]);
  [[19, 28], [20, 27], [21, 27], [18, 30]].forEach(function (p) { g.set(p[0], p[1], CR[4]); }); g.set(19, 29, '#ffffff'); g.set(20, 28, '#ffffff');   // brillo
  limb(g, [[26, 53, 5], [28, 61, 4.5]], CR);                                              // cuello al disco
  // arco con flecha rematada en corazon
  for (var t = 0; t <= 1; t += 0.02) { var ax2 = 44 + Math.sin(t * Math.PI) * 11, ay2 = 12 + t * 46; limb(g, [[ax2, ay2, 1.7]], CR, { flat: 3 }); }
  g.line(43, 10, 46, 60, '#f0d0c8');                                                      // cuerda
  var hx = 50, hy = 8;
  limb(g, [[hx - 3, hy, 4.2], [hx + 3, hy, 4.2], [hx, hy + 5, 3.5]], CR);                  // corazon
  g.set(hx - 4, hy - 2, CR[4]); g.set(hx - 3, hy - 3, '#ffffff');
  g.line(hx, hy + 9, hx + 2, hy + 20, CR[2]); g.line(hx, hy + 9, hx - 2, hy + 12, CR[1]);   // vara
  outline(g, '#2a0408', null);
  contact(g, 28, 78, 22, 3, '#2a244066');
  return mk(g, ax, ay, 48, 20, { cast: { len: 0.4, a: 0.2 }, p: { tall: true, name: 'Cupido' } });
}

/* ============================ ANFITEATRO: gradas en arco ============================ */
var SB = ['#8c7a62', '#a8947a', '#c4b296', '#d8c9ae', '#ece2cc'];
function gradaAnfi() {
  var W = 136, H = 118, cx = 68, cy = 86, g = new G(W, H), x, y, i, e;
  var rings = [[22, 30, 4], [30, 38, 8], [38, 46, 12], [46, 54, 16], [54, 62, 20]];
  // escenario: media luna de losetas terracota
  for (y = cy - 24; y <= cy + 16; y++) for (x = cx - 24; x <= cx + 24; x++) {
    var d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.15);
    if (d >= 22) continue;
    var lx = (x - cx + 64) % 8, ly = (y - cy + 64) % 8, t = Math.floor(hash2(Math.floor((x - cx + 64) / 8), Math.floor((y - cy + 64) / 8), 55) * 3.3);
    g.set(x, y, (lx === 7 || ly === 7) ? '#8a5a4c' : TE[1 + Math.min(3, t)]);
  }
  for (i = rings.length - 1; i >= 0; i--) {                                    // de afuera (alto) hacia adentro (bajo)
    var r0 = rings[i][0], r1 = rings[i][1], E = rings[i][2];
    for (y = 0; y <= cy + 6; y++) for (x = 0; x < W; x++) {
      var dx = x + 0.5 - cx, dy = (y + 0.5 - cy), dd = Math.hypot(dx, dy * 1.0);
      if (dd < r0 || dd >= r1 || dy > 6 - Math.max(0, 0)) continue;
      var ang = Math.atan2(dy, dx) / (Math.PI * 2) + 0.5, joint = (ang * 44 * (r0 / 30)) % 1 < 0.04 * 12 / r0 * 2;
      for (e = 0; e <= E; e++) {
        var tread = e === E, cc;
        if (tread) { cc = (dd < r0 + 1.2 && dy < 0) ? SB[4] : SB[3]; if (joint) cc = SB[2]; if (dd >= r1 - 1.2) cc = SB[2]; if (dx < -r0 * 0.7 && !joint) cc = SB[4]; }
        else { cc = e < 2 ? SB[0] : (dx < 0 ? SB[2] : SB[1]); if (e === E - 1) cc = SB[2]; if (joint) cc = SB[0]; if (dx > r0 * 0.6) cc = SB[0]; }
        g.set(x, y - e, cc);
      }
    }
  }
  outline(g, '#4a3a2a', '#f4ead4');
  contact(g, cx, cy + 6, 56, 3, '#2a244066');
  return mk(g, cx, cy + 6, 124, 66, { cast: { len: 0.3, a: 0.18 }, p: { stage: { x: 0, y: -6 } } });
}

function bakeAmor() {
  M.beso = beso();
  M.cupido = cupido();
  M.gradaAnfi = gradaAnfi();
}

/* ============================ FARO LA MARINA ============================ */
var NV = ['#080b16', '#101626', '#1a2440', '#2a3a64', '#42588c'];      // azul marino casi negro
function faro() {
  var W = 64, H = 176, ax = 32, ay = 168, g = new G(W, H), x, y, i;
  // plinto de concreto y jardinera redonda
  for (y = ay - 9; y <= ay; y++) for (x = 6; x <= 58; x++) { var f = (x - 6) / 52, cc = y === ay - 9 ? CC[4] : (f < 0.15 ? CC[4] : (f < 0.55 ? CC[3] : (f < 0.85 ? CC[2] : CC[1]))); if (y >= ay - 1) cc = CC[0]; g.set(x, y, cc); }
  for (x = 8; x < 56; x += 8) g.set(x, ay - 4, CC[1]);
  for (y = ay - 14; y < ay - 9; y++) for (x = 13; x <= 51; x++) { var f2 = (x - 13) / 38; g.set(x, y, y === ay - 14 ? CC[4] : (f2 < 0.2 ? CC[4] : (f2 < 0.6 ? CC[3] : CC[2]))); }
  // fuste: cilindro azul marino que se afina, con dos franjas blancas
  var y0 = ay - 15, y1 = 56;
  for (y = y0; y >= y1; y--) {
    var t = (y0 - y) / (y0 - y1), half = Math.round(13 - t * 5.2), band = (y > 56 + 56 && y < 56 + 74) || (y > 56 + 18 && y < 56 + 38);       // franjas: dos
    band = (y <= y0 - 24 && y > y0 - 44) || (y <= y0 - 66 && y > y0 - 86);
    for (x = ax - half; x < ax + half; x++) {
      var fx = (x - (ax - half) + 0.5) / (half * 2), cc2;
      if (band) cc2 = fx < 0.12 ? '#ffffff' : (fx < 0.34 ? '#eceae0' : (fx < 0.62 ? '#cfcdc2' : (fx < 0.84 ? '#a8a6a0' : '#7e7c84')));
      else cc2 = fx < 0.12 ? NV[4] : (fx < 0.34 ? NV[3] : (fx < 0.62 ? NV[2] : (fx < 0.84 ? NV[1] : NV[0])));
      if (!band && (y % 9 === 0) && fx > 0.1) cc2 = NV[Math.max(0, NV.indexOf(cc2) - 1)];      // juntas de las planchas
      if (band && (y % 9 === 0) && fx > 0.1) cc2 = '#9a98a0';
      g.set(x, y, cc2);
    }
  }
  // puerta y rendijas
  g.rect(ax - 3, ay - 26, 7, 11, '#05070e'); g.rect(ax - 2, ay - 27, 5, 1, '#05070e'); g.rect(ax - 3, ay - 26, 1, 11, NV[3]); g.set(ax + 2, ay - 20, '#d8b04a');
  [ay - 60, ay - 80, ay - 100].forEach(function (yy) { g.rect(ax - 1, yy, 2, 4, '#e8d8a0'); g.rect(ax - 1, yy, 2, 1, '#ffffff'); });
  // galeria (balcon) con baranda
  var gy0 = y1 - 3;
  g.rect(ax - 15, gy0, 30, 4, NV[2]); g.rect(ax - 15, gy0, 30, 1, NV[4]); g.rect(ax - 15, gy0 + 3, 30, 1, NV[0]);
  for (x = ax - 15; x <= ax + 14; x += 3) { g.rect(x, gy0 - 8, 1, 8, NV[1]); } g.rect(ax - 15, gy0 - 8, 30, 1, NV[3]); g.rect(ax - 15, gy0 - 4, 30, 1, NV[2]);
  for (x = ax - 10; x <= ax + 9; x += 5) g.rect(x, gy0 + 4, 2, 4, NV[1]);                 // consolas
  // linterna: cuarto de vidrio con parantes
  var ly0 = gy0 - 24, ly1 = gy0 - 8;
  for (y = ly0; y < ly1; y++) for (x = ax - 8; x < ax + 8; x++) { var fq = (x - (ax - 8)) / 16, gc = fq < 0.3 ? '#cfe4ec' : (fq < 0.7 ? '#9cc0d0' : '#5a7e92'); if (y < ly0 + 3) gc = mix(gc, '#ffffff', 0.4); g.set(x, y, gc); }
  for (x = ax - 8; x <= ax + 8; x += 4) g.rect(x, ly0, 1, ly1 - ly0, NV[2]); g.rect(ax - 8, ly0, 17, 1, NV[3]); g.rect(ax - 8, ly1 - 1, 17, 2, NV[1]);
  g.ell(ax, ly0 + 7, 3, 3, '#fff6c8'); g.set(ax - 1, ly0 + 6, '#ffffff');                // la lampara
  // cupula y remate
  for (y = 0; y < 11; y++) { var hw = Math.round(9 * Math.sqrt(1 - Math.pow((10 - y) / 11, 2)) + 0.5); for (x = ax - hw; x < ax + hw; x++) { var fd = (x - (ax - hw)) / (hw * 2); g.set(x, ly0 - 10 + y, fd < 0.25 ? NV[4] : (fd < 0.55 ? NV[3] : (fd < 0.8 ? NV[2] : NV[1]))); } }
  g.rect(ax - 1, ly0 - 17, 2, 7, NV[2]); g.set(ax, ly0 - 17, NV[4]); g.rect(ax - 2, ly0 - 11, 4, 2, NV[3]); g.line(ax, ly0 - 17, ax, ly0 - 20, '#a8a8b0');
  outline(g, K, '#6a7aa0');
  contact(g, ax, ay + 1, 27, 3, '#2a244070');
  return mk(g, ax, ay, 50, 16, { cast: { len: 0.35, a: 0.2 }, p: { tall: true, name: 'Faro La Marina', emit: [{ x: 0, y: ly0 + 7 - ay, kind: 'ventana', r: 8, col: '#fff0b0' }] } });
}

/* ============================ PARAPUERTO ============================ */
function casetaParapente() {
  var W = 100, H = 80, ax = 44, ay = 74, g = new G(W, H), x, y;
  var GT = ['#0f2a1c', '#17402a', '#225a38', '#2f7a4a'];
  // carpa verde de atras (a la derecha): toldo piramidal con patas
  for (y = 24; y < 44; y++) { var w2 = 5 + Math.round((y - 24) * 1.15); for (x = 78 - w2; x < 78 + w2; x++) { var fc = (x - (78 - w2)) / (w2 * 2); g.set(x, y, fc < 0.2 ? GT[3] : (fc < 0.6 ? GT[2] : (fc < 0.85 ? GT[1] : GT[0]))); } }
  for (x = 52; x < 104 - 2; x++) g.set(x, 44, ((x - 52) % 8 < 1 || (x - 52) % 8 > 6) ? GT[1] : GT[2]);
  g.rect(56, 45, 2, 27, '#6a6870'); g.rect(98, 45, 2, 27, '#6a6870'); g.rect(56, 45, 1, 27, '#a8a8b0');
  g.line(78, 24, 78, 20, '#a8a8b0'); g.set(78, 19, '#f2d24a');
  // caseta de tablas claras
  box(g, 6, 32, 50, 40, 5, ['#8f8068', '#b5a58a', '#d2c4a8', '#e8dcc4', '#f6eed8']);
  for (y = 38; y < 70; y += 4) g.rect(7, y, 48, 1, '#a89878');
  g.rect(12, 44, 30, 13, '#3a2a22'); g.rect(12, 44, 30, 1, '#6a4a38'); g.rect(12, 56, 30, 1, '#c9a870'); g.rect(14, 46, 26, 10, '#241a18');
  for (x = 16; x < 40; x += 6) { g.rect(x, 48, 3, 5, '#e8c060'); g.rect(x, 48, 3, 1, '#ffeaa0'); }                // folletos en el mostrador
  g.rect(45, 46, 8, 26, '#5a3a24'); g.rect(45, 46, 1, 26, '#8a5a30'); g.set(51, 60, '#e0b050');
  // toldo a rayas verde y blanco sobre la ventanilla
  for (x = 3; x < 59; x++) { var st = Math.floor((x - 3) / 5) % 2; for (y = 37; y < 44 - (((x - 3) % 5 === 0 || (x - 3) % 5 === 4) ? 2 : 0); y++) g.set(x, y, st ? '#f3efe2' : GT[2]); g.set(x, 37, st ? '#ffffff' : GT[3]); }
  // letrero grande + cartela
  g.rect(3, 12, 56, 13, '#c8202a'); g.rect(3, 12, 56, 1, '#ff6a58'); g.rect(3, 24, 56, 1, '#7a0e18'); g.rect(3, 12, 1, 13, '#ff6a58'); g.rect(58, 12, 1, 13, '#7a0e18');
  px.text(g, 'PARAPENTE', 31, 15, { font: 'a7', ink: '#fff8e0', shadow: '#5a0a12', align: 'c' });
  g.rect(3, 25, 56, 7, "#f3efe2"); g.rect(3, 25, 56, 1, "#ffffff"); g.rect(3, 31, 56, 1, "#b8b4a4");
  px.text(g, "VUELOS TANDEM", 31, 26, { font: "a5", ink: "#c8202a", align: "c" });
  g.rect(8, 32, 1, 5, '#6a6870'); g.rect(53, 32, 1, 5, '#6a6870');
  // banca
  g.rect(60, 62, 24, 3, '#a86e38'); g.rect(60, 62, 24, 1, '#d9a468'); g.rect(61, 65, 2, 7, '#1c1a22'); g.rect(81, 65, 2, 7, '#1c1a22');
  outline(g, K, '#f0e4c8');
  contact(g, 50, ay + 1, 46, 2.4, '#2a244070');
  return mk(g, ax, ay, 84, 12, { cast: { len: 0.35, a: 0.2 }, p: { tall: true, name: 'Caseta de parapente' } });
}
function mangaViento(f) {
  var W = 44, H = 76, ax = 8, ay = 72, g = new G(W, H), y, i;
  for (y = 6; y < ay; y++) { g.set(ax - 1, y, '#e8e4d8'); g.set(ax, y, '#b8b4a8'); g.set(ax + 1, y, '#6a6870'); }
  g.rect(ax - 4, ay - 3, 9, 4, CC[2]); g.rect(ax - 4, ay - 3, 9, 1, CC[4]);
  g.disc(ax, 5, 2, '#e8c860');
  var ang = [-0.12, 0.0, 0.14][f], segs = 5, px0 = ax + 2, py0 = 8, len = 6;
  for (i = 0; i < segs; i++) {
    var a = ang + (i * 0.05) * (f === 1 ? -1 : 1), wI = 9 - i * 1.2, x0 = px0 + i * len, y0 = py0 + Math.sin(a * 3 + i * 0.5) * 1.5 + i * (f === 2 ? 0.8 : (f === 0 ? 0.2 : 0.5));
    for (var xx = 0; xx < len; xx++) for (var yy = 0; yy < wI; yy++) {
      var cc = (i % 2 === 0) ? (yy < 2 ? '#ff7a58' : (yy < wI - 3 ? '#e8383a' : '#a8202a')) : (yy < 2 ? '#ffffff' : (yy < wI - 3 ? '#f3efe2' : '#bcb8ac'));
      g.set(x0 + xx, y0 + yy + xx * 0.0, cc);
    }
    g.rect(x0, Math.floor(y0), 1, Math.ceil(wI), '#7a1820'.length ? (i % 2 ? '#c8c4b8' : '#8a1820') : '#000');
  }
  g.line(px0, py0 - 1, px0, py0 + 10, '#6a6870');
  outline(g, K, '#ffe8d8');
  contact(g, ax, ay + 1, 5, 1.6, '#2a244066');
  return mk(g, ax, ay, 6, 4, { cast: { len: 0.3, a: 0.16 }, p: { tall: true } });
}
/* Parapente tirado en el suelo (lo que deja el zombie parapentista). broken = vela rasgada y enredada. 64x44. */
function parapenteCaidoG(broken) {
  var W = 76, H = 48, ax = 38, ay = 42, g = new G(W, H), r = rng(broken ? 2202 : 2201), x, y, i;
  var cols = broken ? ['#e8f0f4', '#6aa8c8', '#e8f0f4', '#f08a38', '#e8f0f4', '#8fd0d8'] : ['#f08a38', '#f3efe2', '#8fd0d8', '#f3efe2', '#f08a38', '#f3efe2'];
  var cx = 38, cy = 22, rx = 33, ry = 14, N = cols.length * 2;
  for (y = 4; y < 42; y++) for (x = 2; x < 74; x++) {
    var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, ang = Math.atan2(dy, dx), wob = 1 + 0.1 * Math.sin(ang * 7 + 1) + 0.07 * Math.sin(ang * 13);
    var d = Math.hypot(dx, dy);
    if (d > wob) continue;
    var sector = Math.floor((ang / (Math.PI * 2) + 0.5) * N + d * 0.9) % cols.length, base = cols[(sector + cols.length) % cols.length];
    var l = -(dx * 0.35 + dy * 0.9), k = l > 0.45 ? 1.2 : (l > 0 ? 1.0 : (l > -0.5 ? 0.84 : 0.7));
    var c = k >= 1 ? mix(base, '#ffffff', (k - 1) * 1.1) : mix(base, '#2a2440', 1 - k);
    var rib = Math.sin(ang * N * 0.5 * 2 + d * 3);
    if (rib > 0.92) c = mix(c, '#2a2440', 0.25);                                  // costuras y arrugas radiales
    if (d > 0.88) c = mix(c, '#2a2440', 0.18);                                    // borde que se hunde
    if (dy < -0.62 && d > 0.55) c = mix(base, '#2a2440', 0.4);                    // borde de ataque (la boca): oscuro
    if (broken) { if (hash2(x >> 1, y >> 1, 78) < 0.07) continue; if (ang > 0.1 && ang < 0.7 && d > 0.45 + (ang - 0.1) * 0.2) continue; }       // rasgones
    g.set(x, y, c);
  }
  var pl = [[9, 26], [17, 34], [28, 38], [48, 38], [60, 34], [68, 26]];
  pl.forEach(function (p) { g.line(p[0], p[1], 38, 40, '#3a3846'); });
  limb(g, [[33, 40, 3.2], [43, 40, 3.2]], ['#2a2e40', '#3a4468', '#4a5a88', '#6a7aa8', '#8a9ac8']);                                // arnes
  g.disc(49, 39, 2.6, '#c8202a'); g.set(48, 38, '#ff7a6a');                                                                        // casco
  if (broken) { g.line(60, 32, 72, 38, '#e8f0f4'); g.line(61, 33, 73, 40, '#e8f0f4'); g.line(62, 34, 70, 42, '#6aa8c8'); }              // jiron colgando
  outline(g, K, '#fff0e0');
  contact(g, 38, 43, 32, 3, '#2a244066');
  return mk(g, ax, ay, 60, 24, { cast: { len: 0.25, a: 0.16 }, p: { name: 'Parapente caido' } });
}
/* ============================ COMPLEJO DEPORTIVO ============================ */
var GM = ['#0f3a24', '#1c5a38', '#2a7a4a', '#3f9a62', '#6ac088'], GY = ['#a87810', '#d8a820', '#f2c838', '#ffe27a'];
function tube(g, x0, y0, x1, y1, ramp) { g.line(x0, y0, x1, y1, ramp[2]); g.line(x0 - 1, y0, x1 - 1, y1, ramp[3]); g.line(x0 + 1, y0, x1 + 1, y1, ramp[1]); }
function maquinaGym(v) {
  var W = 44, H = 52, ax = 22, ay = 47, g = new G(W, H), x, y;
  g.rect(4, ay - 3, 36, 3, '#46444f'); g.rect(4, ay - 3, 36, 1, '#6a687a');                    // zapata
  if (v === 0) {                                                                                  // eliptica: dos pedales y manubrios
    tube(g, 12, ay - 3, 12, 10, GM); tube(g, 32, ay - 3, 32, 10, GM); g.rect(10, 8, 24, 3, GM[2]); g.rect(10, 8, 24, 1, GM[4]);
    tube(g, 12, 14, 6, 24, [GY[0], GY[1], GY[2], GY[3]]); tube(g, 32, 14, 38, 24, GY);
    g.rect(5, 24, 4, 3, GY[2]); g.rect(36, 24, 4, 3, GY[2]);
    g.line(14, ay - 5, 22, 26, '#8a8f96'); g.line(30, ay - 5, 22, 26, '#8a8f96'); g.disc(22, 26, 3, GM[3]);
    g.rect(8, ay - 10, 11, 4, '#2d2b36'); g.rect(25, ay - 10, 11, 4, '#2d2b36'); g.rect(8, ay - 10, 11, 1, '#4a4756'); g.rect(25, ay - 10, 11, 1, '#4a4756');
  } else if (v === 1) {                                                                           // press de pecho: asiento + dos palancas
    g.rect(16, 24, 12, 18, '#2d2b36'); g.rect(16, 24, 12, 1, '#4a4756'); g.rect(14, 34, 16, 4, '#46444f'); g.rect(14, 34, 16, 1, '#7a788a');
    tube(g, 22, ay - 3, 22, 22, GM); g.rect(8, 10, 28, 3, GM[2]); g.rect(8, 10, 28, 1, GM[4]); tube(g, 10, 12, 10, 30, GM); tube(g, 34, 12, 34, 30, GM);
    g.rect(5, 28, 7, 3, GY[2]); g.rect(32, 28, 7, 3, GY[2]); g.rect(5, 28, 7, 1, GY[3]); g.rect(32, 28, 7, 1, GY[3]);
  } else if (v === 2) {                                                                           // jalon: marco alto con barra
    tube(g, 8, ay - 3, 8, 6, GM); tube(g, 36, ay - 3, 36, 6, GM); g.rect(6, 4, 32, 3, GM[2]); g.rect(6, 4, 32, 1, GM[4]);
    g.line(16, 8, 14, 18, '#8a8f96'); g.line(28, 8, 30, 18, '#8a8f96'); g.rect(12, 18, 20, 3, GY[2]); g.rect(12, 18, 20, 1, GY[3]); g.rect(12, 20, 20, 1, GY[0]);
    g.rect(16, 30, 12, 4, '#2d2b36'); g.rect(16, 30, 12, 1, '#4a4756'); g.rect(18, 34, 8, 8, '#46444f'); g.rect(10, ay - 9, 24, 2, GM[1]);
  } else {                                                                                        // remo / banco con jalon bajo
    g.rect(8, ay - 8, 28, 3, GM[2]); g.rect(8, ay - 8, 28, 1, GM[4]); tube(g, 10, ay - 3, 10, ay - 8, GM); tube(g, 34, ay - 3, 34, ay - 8, GM);
    tube(g, 36, ay - 8, 36, 18, GM); g.rect(33, 16, 8, 4, GY[2]); g.rect(33, 16, 8, 1, GY[3]);
    g.rect(14, ay - 16, 10, 4, '#2d2b36'); g.rect(14, ay - 16, 10, 1, '#4a4756'); g.line(36, 20, 20, ay - 14, '#8a8f96');
    g.rect(5, ay - 14, 6, 6, GM[1]); g.rect(5, ay - 14, 6, 1, GM[3]);
  }
  g.rect(18, 2 + (v === 2 ? 0 : 3), 8, 6, GM[1]); g.rect(18, 2 + (v === 2 ? 0 : 3), 8, 1, GM[3]); g.rect(20, 4 + (v === 2 ? 0 : 3), 4, 2, '#e8f0e0');   // placa con pictograma
  outline(g, K, '#9ad8b0');
  contact(g, ax, ay + 1, 18, 2.2, '#2a244066');
  return mk(g, ax, ay, 36, 8, { cast: { len: 0.35, a: 0.18 }, p: { tall: true, name: ['Eliptica', 'Press de pecho', 'Jalon', 'Remo'][v] } });
}
/* Arco de fulbito (3 m x 2 m = 48 x 32 px), de frente (la boca mira hacia el sur / la camara). Palos blancos, red cuadriculada, fondo. */
function arcoFrente(back) {
  var W = 64, H = 56, ax = 32, ay = 50, g = new G(W, H), x, y, i;
  var nx0 = 8, nx1 = 56, topY = 14, baseY = ay - 2;
  if (!back) {
    for (y = topY - 6; y < baseY - 4; y += 4) for (x = nx0 + 4; x < nx1 + 4; x += 4) g.set(x, y, "#d4d6da");                       // red del fondo
    g.line(nx0, topY, nx0 + 4, topY - 6, '#e8e8ea'); g.line(nx1, topY, nx1 + 4, topY - 6, '#e8e8ea'); g.line(nx0 + 4, topY - 6, nx1 + 4, topY - 6, '#e8e8ea');
    g.line(nx0, baseY, nx0 + 4, baseY - 5, '#cfd0d4'); g.line(nx1, baseY, nx1 + 4, baseY - 5, '#cfd0d4');
    for (y = topY - 5; y < baseY - 5; y += 4) for (x = nx0 + 5; x < nx1 + 3; x++) if (x % 2 === 0) g.set(x, y, "#b4b8c0");
  } else {
    for (y = topY; y < baseY; y += 2) for (x = nx0; x < nx1; x += 2) g.set(x + (y % 4 === 0 ? 0 : 1), y, '#aeb2ba');
    for (x = nx0; x < nx1; x += 4) g.line(x, topY, x, baseY, '#c8ccd2'); for (y = topY; y < baseY; y += 4) g.line(nx0, y, nx1, y, '#c8ccd2');
    g.line(nx0, topY, nx0 + 4, topY - 6, '#e8e8ea'); g.line(nx1, topY, nx1 + 4, topY - 6, '#e8e8ea'); g.line(nx0 + 4, topY - 6, nx1 + 4, topY - 6, '#e8e8ea');
  }
  [nx0, nx1].forEach(function (px_) { for (y = topY; y <= baseY; y++) { g.set(px_ - 1, y, '#ffffff'); g.set(px_, y, '#e8e8e8'); g.set(px_ + 1, y, '#a8a8b0'); } });          // palos
  for (x = nx0 - 1; x <= nx1 + 1; x++) { g.set(x, topY - 1, '#ffffff'); g.set(x, topY, '#e8e8e8'); g.set(x, topY + 1, '#a8a8b0'); }                                          // travesano
  for (x = nx0; x < nx1; x++) if (x % 8 < 4) { g.set(x, topY, '#c8202a'); }                                                                                                    // franjas rojas
  outline(g, K, null);
  contact(g, ax, ay + 1, 24, 2.2, '#2a244066');
  return mk(g, ax, ay, 48, 8, { cast: { len: 0.3, a: 0.14 }, p: { tall: true } });
}
/* Arco visto de lado (boca hacia el este): una jaula alta y angosta: red de arriba + red lateral. 24x100. */
function arcoLado() {
  var W = 30, H = 100, ax = 22, ay = 94, g = new G(W, H), x, y;
  var a = 22, b = 3;                                                          // palos delanteros en x=a, traseros en x=b
  var topFar = 14, topNear = 62, baseFar = 46, baseNear = ay - 2;
  for (y = topFar; y <= topNear; y++) for (x = b; x <= a; x++) g.set(x, y, ((x + y) % 2 === 0) ? '#b4b8c0' : null);                                // red de arriba
  for (y = topNear; y <= baseNear; y++) for (x = b; x <= a; x++) g.set(x, y, ((x + y) % 2 === 0) ? '#c9ccd2' : (x % 4 === 0 ? '#a8acb4' : null));  // red lateral (la de este lado)
  for (y = topFar; y <= baseNear; y += 4) for (x = b; x <= a; x++) if (y >= topFar && (y <= topNear || true)) { /* nada */ }
  [[a, topFar, baseFar], [a, topNear, baseNear], [b, topFar, baseFar], [b, topNear, baseNear]].forEach(function (p) { for (y = p[1]; y <= p[2]; y++) { g.set(p[0] - 1, y, '#ffffff'); g.set(p[0], y, '#e4e4e8'); g.set(p[0] + 1, y, '#a8a8b0'); } });
  for (y = topFar; y <= topNear; y++) { g.set(a - 1, y, '#ffffff'); g.set(a, y, y % 8 < 4 ? '#c8202a' : '#e8e8e8'); }                                           // travesano (visto de canto)
  for (x = b; x <= a; x++) { g.set(x, topNear, '#e8e8e8'); g.set(x, topFar, '#e8e8e8'); g.set(x, baseNear, '#cfd0d4'); }
  outline(g, K, null);
  contact(g, 12, ay + 1, 12, 2.2, '#2a244066');
  return mk(g, ax - 10, ay, 28, 80, { cast: { len: 0.25, a: 0.12 }, p: { tall: true } });
}
function rejaCancha() {
  var W = 16, H = 44, g = new G(W, H), x, y;
  var MG = ['#0f2a1c', '#17402a', '#2a6a42'];
  for (y = 8; y < 40; y++) for (x = 1; x < 15; x++) { var d = ((x + y) % 4 === 0) || ((x - y + 64) % 4 === 0); if (d) g.set(x, y, y < 24 ? '#9aa8b0cc' : '#7a8892cc'); }
  g.rect(0, 6, 16, 2, MG[2]); g.rect(0, 6, 16, 1, '#4a9a62'); g.rect(0, 38, 16, 2, MG[1]);
  g.rect(0, 5, 2, 36, MG[2]); g.rect(0, 5, 1, 36, '#4a9a62'); g.rect(1, 5, 1, 36, MG[1]);
  outline(g, K, null);
  contact(g, 8, 41, 8, 1.4, '#2a244066');
  return mk(g, 8, 40, 16, 3, { cast: { len: 0.3, a: 0.12 }, p: { tall: true } });
}
function rejaCanchaV() {
  var W = 10, H = 64, g = new G(W, H), y;
  for (y = 6; y < 58; y++) { g.set(4, y, y % 3 === 0 ? '#9aa8b0' : '#6a7882'); g.set(5, y, '#17402a'); }
  g.rect(3, 4, 4, 54, null);
  for (y = 6; y < 58; y++) { g.set(3, y, '#2a6a42'); g.set(4, y, '#17402a'); g.set(5, y, y % 3 === 0 ? '#9aa8b0aa' : '#5a6872aa'); }
  g.rect(2, 4, 5, 3, '#2a6a42'); g.rect(2, 4, 5, 1, '#4a9a62'); g.rect(2, 56, 5, 2, '#17402a');
  outline(g, K, null);
  contact(g, 4, 59, 4, 1.4, '#2a244066');
  return mk(g, 4, 58, 6, 16, { cast: { len: 0.3, a: 0.12 }, p: { tall: true } });
}
function gradaDeporte() {
  var W = 112, H = 60, ax = 56, ay = 56, g = new G(W, H), x, y, i;
  var BLU2 = ['#142a5a', '#1f4590', '#2f64c8', '#5a92ec'];
  for (i = 0; i < 4; i++) {                                                  // 4 escalones subiendo hacia atras (norte)
    var yTop = 36 - i * 8, yBot = yTop + 8;
    g.rect(6, yTop, 100, 3, i % 2 ? '#d8d4c4' : '#e8e4d4'); g.rect(6, yTop, 100, 1, '#ffffff');      // tabla del asiento (tapa)
    g.rect(6, yTop + 3, 100, 5, BLU2[1]); g.rect(6, yTop + 3, 100, 1, BLU2[3]); g.rect(6, yTop + 7, 100, 1, BLU2[0]);   // cara del escalon pintada de azul
    for (x = 6; x < 106; x += 12) g.rect(x, yTop + 3, 1, 5, BLU2[0]);
  }
  for (i = 0; i < 6; i++) { var sx = 8 + i * 19; g.rect(sx, 44, 2, 12, '#6a6a76'); g.rect(sx, 44, 1, 12, '#a8a8b4'); }     // patas de fierro
  g.rect(4, 4, 3, 52, '#6a6a76'); g.rect(4, 4, 1, 52, '#a8a8b4'); g.rect(105, 4, 3, 52, '#6a6a76');                       // barandas laterales
  g.rect(4, 4, 104, 2, '#a8a8b4'); g.rect(4, 4, 104, 1, '#d8d8e0');
  px.text(g, 'CLUB', 56, 46, { font: 'a5', ink: '#f3efe2', shadow: '#142a5a', align: 'c' });
  outline(g, K, '#e8e4d4');
  contact(g, 56, ay + 1, 52, 2.4, '#2a244070');
  return mk(g, ax, ay, 104, 14, { cast: { len: 0.3, a: 0.16 }, p: { tall: true } });
}

function bakeLugares1() {
  M.faro = faro();
  M.casetaParapente = casetaParapente();
  M.mangaViento = mangaViento(1); M.mangaViento.frames = [0, 1, 2].map(mangaViento); M.mangaViento.fps = 3;
  M.parapenteCaido = parapenteCaidoG(false); M.parapenteCaido.broken = parapenteCaidoG(true);
  M.maquinaGym = [0, 1, 2, 3].map(maquinaGym);
  M.arcoFulbito = arcoFrente(false); M.arcoFulbitoS = arcoFrente(true);
  M.arcoFulbitoE = arcoLado(); M.arcoFulbitoO = px.flipH(M.arcoFulbitoE); ['tall'].forEach(function (k) { M.arcoFulbitoO[k] = true; }); M.arcoFulbitoO.fw = M.arcoFulbitoE.fw; M.arcoFulbitoO.fh = M.arcoFulbitoE.fh;
  M.rejaCancha = rejaCancha(); M.rejaCanchaV = rejaCanchaV();
  M.gradaDeporte = gradaDeporte();
}

/* ============================ INTIHUATANA (Szyszlo) ============================ */
var CN = ['#4e4c56', '#6e6c72', '#8f8d8a', '#aeaca3', '#cbc8bb'];     // concreto con textura de encofrado
function slab(g, x0, y0, w, h, topH, r) {                              // bloque de concreto visto en 3/4: tapa clara + cara con tablas de encofrado
  var x, y;
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    var c;
    if (y < topH) c = y === 0 ? CN[4] : (x < 2 ? CN[4] : CN[3]);
    else {
      var fy = y - topH;
      c = x < 2 ? CN[3] : (x >= w - 4 ? CN[1] : (x >= w - 8 ? CN[2] : CN[2]));
      if (fy % 5 === 0) c = x < w - 4 ? CN[1] : CN[0];                         // junta de tablas
      else if (fy % 5 === 1 && x < w - 4) c = CN[3];
      if (hash2(x, y, 4401) < 0.05) c = CN[Math.max(0, CN.indexOf(c) - 1)];
      if (hash2(x, y, 4402) < 0.04) c = CN[Math.min(4, CN.indexOf(c) + 1)];
    }
    if (y === h - 1) c = CN[0];
    g.set(x0 + x, y0 + y, c);
  }
  for (y = 0; y < h; y++) g.set(x0 + w - 1, y0 + y, CN[0]);
}
function hole(g, cx, cy, hw, hh, round) {                                // hueco con profundidad: sombra arriba-izquierda, luz abajo-derecha
  var x, y;
  for (y = -hh; y <= hh; y++) for (x = -hw; x <= hw; x++) {
    if (round && (x * x) / (hw * hw) + (y * y) / (hh * hh) > 1) continue;
    var c = '#262532';
    if (y > hh - 2 || (round && y > hh * 0.5 && x > hw * 0.3)) c = CN[3];
    else if (x > hw - 2) c = CN[2];
    else if (y < -hh + 3) c = '#14131c';
    g.set(cx + x, cy + y, c);
  }
}
function intihuatana() {
  var W = 112, H = 132, ax = 52, ay = 124, g = new G(W, H), r = rng(4400), x, y, i;
  // cantero curvo con coleos y agaves
  for (y = ay - 16; y < ay + 1; y++) for (x = 0; x < 108; x++) {
    var dx = (x - 54) / 54, dy = (y - (ay - 8)) / 8.5;
    if (dx * dx + dy * dy > 1) continue;
    g.set(x, y, dy > 0.3 ? CN[1] : (dy > -0.1 ? CN[3] : CN[4]));
  }
  for (y = ay - 16; y < ay - 6; y++) for (x = 4; x < 104; x++) { var d2 = Math.pow((x - 54) / 50, 2) + Math.pow((y - (ay - 11)) / 5, 2); if (d2 < 1) g.set(x, y, r() < 0.5 ? '#7a1f3a' : (r() < 0.5 ? '#a8305a' : '#4a1230')); }       // coleo rojo vino
  for (i = 0; i < 18; i++) g.set(6 + Math.floor(r() * 96), ay - 15 + Math.floor(r() * 8), r() < 0.5 ? '#d84a7a' : '#5a1a2a');
  // masa principal de concreto
  slab(g, 8, 62, 80, 52, 6, r);                                         // cuerpo bajo ancho
  slab(g, 20, 36, 34, 32, 5, r);                                        // torre izquierda
  slab(g, 60, 46, 26, 26, 5, r);                                        // bloque derecho mas bajo
  slab(g, 12, 18, 46, 22, 5, r);                                        // cornisa en T
  slab(g, 30, 4, 18, 18, 4, r);                                         // remate
  hole(g, 30, 92, 8, 8, true);                                          // hueco circular
  hole(g, 40, 54, 5, 6, false);                                         // hueco cuadrado
  hole(g, 70, 56, 4, 5, false);                                         // hueco chico
  hole(g, 39, 24, 4, 3, false);                                         // ventana de la cornisa
  for (y = 94; y < 114; y++) for (x = 62; x < 78; x++) g.set(x, y, y < 97 ? '#14131c' : '#262532');   // abertura en U abajo
  for (x = 62; x < 78; x++) g.set(x, 113, CN[3]);
  g.rect(62, 94, 1, 20, CN[3]); g.rect(77, 94, 1, 20, CN[1]);
  // agave a cada lado
  [[6, ay - 8], [100, ay - 10]].forEach(function (p) { for (i = 0; i < 9; i++) { var a2 = -Math.PI / 2 + (i - 4) * 0.34; for (var k = 0; k < 11; k++) g.set(p[0] + Math.cos(a2) * k * 0.9, p[1] + Math.sin(a2) * k * 0.9 - k * 0.2, k < 7 ? '#6a8a7a' : '#8aaa94'); } g.set(p[0], p[1] - 10, '#cfe0d0'); });
  // placa azul con QR sobre poste
  g.rect(94, ay - 22, 2, 18, '#6a6870'); g.rect(88, ay - 28, 14, 10, '#2f64c8'); g.rect(88, ay - 28, 14, 1, '#5a92ec'); g.rect(91, ay - 25, 6, 5, '#f3efe2'); g.set(92, ay - 24, '#1c1a22'); g.set(94, ay - 24, '#1c1a22'); g.set(93, ay - 22, '#1c1a22'); g.set(95, ay - 22, '#1c1a22');
  outline(g, K, '#e8e4d4');
  contact(g, 54, ay + 1, 52, 3, '#2a244070');
  return mk(g, ax + 2, ay, 100, 16, { cast: { len: 0.5, a: 0.22 }, p: { tall: true, name: 'Intihuatana' } });
}
/* Totem de espejo (Aldo Chaparro): cubos facetados de acero pulido que reflejan cielo gris arriba y el adoquin amarillo y rojo abajo. 26x104. */
function totemEspejo() {
  var W = 34, H = 108, ax = 17, ay = 100, g = new G(W, H), x, y, i;
  // pedestal negro con QR
  g.rect(5, ay - 12, 24, 12, '#14131a'); g.rect(5, ay - 12, 24, 2, '#3a3846'); g.rect(5, ay - 12, 2, 12, '#2d2b36'); g.rect(27, ay - 12, 2, 12, '#0a0a10'); g.rect(5, ay - 1, 24, 1, '#06060a');
  g.rect(14, ay - 9, 6, 6, '#e8e4d8'); [[15, ay - 8], [17, ay - 8], [16, ay - 6], [18, ay - 6], [15, ay - 4], [19, ay - 5]].forEach(function (p) { g.set(p[0], p[1], '#14131a'); });
  // columna de cubos facetados (cada uno un poco girado: anchos alternados)
  var segs = [[24, 16, 16], [14, 14, 22], [16, 12, 22], [14, 12, 22]];
  var y0 = ay - 12;
  for (i = 0; i < 4; i++) {
    var sh = 21, hw = (i % 2 ? 9 : 10), topY = y0 - sh * (i + 1);
    var warm = 1 - i / 3;                                                    // 0 arriba (cielo) -> 1 abajo (suelo calido)
    var sky = ["#f4f8fc", "#c4d4e6", "#94acc8", "#6e88aa"], gold = ['#f8e8a8', '#e8c060', '#d07a3a', '#a8402c'];
    for (y = 0; y < sh; y++) for (x = -hw; x < hw; x++) {
      var f = (x + hw) / (hw * 2), facet = f < 0.34 ? 0 : (f < 0.68 ? 1 : 2);
      var t = y / sh, kk = t < 0.35 ? 0 : (t < 0.7 ? 1 : 2);
      var upper = sky[Math.min(3, facet + kk * 0.5 | 0)], lower = gold[Math.min(3, facet + (kk > 0 ? 1 : 0))];
      var c = mix(upper, lower, clamp(-0.35 + warm * 0.85 + t * 0.25, 0, 1));
      if (facet === 0) c = mix(c, "#ffffff", 0.45); else if (facet === 2) c = mix(c, "#2a3a60", 0.38); if (((x + hw + y) % 7) === 0) c = mix(c, "#ffffff", 0.3);
      if (y < 2) c = mix(c, '#ffffff', 0.5); if (y > sh - 3) c = mix(c, '#1c2440', 0.4);
      g.set(ax + x + (i % 2 ? 1 : 0), topY + y + 1, c);
    }
    for (y = 0; y < sh; y++) { g.set(ax + (-hw + Math.round(hw * 0.68)) + (i % 2 ? 1 : 0), topY + y + 1, '#4a5a80'); }          // arista entre facetas
  }
  var topS = y0 - 21 * 4;
  for (i = 0; i < 6; i++) for (x = -(9 - i * 1.4); x < (9 - i * 1.4); x++) g.set(ax + Math.round(x), topS - i, i < 2 ? '#c4d4e4' : '#f0f4f8');   // punta facetada
  outline(g, K, '#ffffff');
  contact(g, ax, ay + 1, 14, 2.4, '#2a244070');
  return mk(g, ax, ay, 22, 10, { cast: { len: 0.45, a: 0.2 }, p: { tall: true, name: 'Totem de espejo' } });
}

/* ============================ PERGOLAS ONDULADAS (Salazar) ============================ */
var PW = ['#2a1a14', '#4a2c20', '#6e4430', '#8e5c3e', '#b07a52'];     // madera marron oscura
function pergolaOndulada(v) {
  var W = v ? 160 : 124, H = 116, ax = W >> 1, ay = 108, g = new G(W, H), x, y, i, r = rng(5500 + v);
  var x0 = 8, x1 = W - 8, bd = 38, base1 = ay, base0 = ay - bd, roofLift = 56, amp = v ? 4.5 : 3.5, ph = v ? 1.2 : 0;
  var posts = v ? [10, 54, 106, W - 10] : [10, W - 10];
  function waveAt(xx) { return Math.round(amp * Math.sin(xx / (v ? 15 : 12) + ph)); }
  // sombra bajo el techo: bandas oscuras en el piso
  for (y = base0 + 2; y < base1 + 1; y++) for (x = x0; x < x1; x++) if (((x - x0) >> 1) % 3 !== 0 || y > base1 - 6) g.set(x, y, "#2a24402c");
  // postes traseros (solo asoman bajo el techo) y delanteros
  posts.forEach(function (px_) {
    for (y = base0 - roofLift + 6; y <= base0; y++) { g.set(px_, y, '#3a3844'); g.set(px_ + 1, y, '#1c1a22'); }
  });
  posts.forEach(function (px_) {
    for (y = base1 - roofLift + 6; y <= base1; y++) { g.set(px_ - 1, y, '#8a8f98'); g.set(px_, y, '#5a5e68'); g.set(px_ + 1, y, '#2d2f38'); g.set(px_ + 2, y, '#1c1a22'); }
    g.rect(px_ - 3, base1 - 1, 7, 2, '#46444f'); g.rect(px_ - 3, base1 - 1, 7, 1, '#7a788a');
  });
  if (v) {                                                                                                         // banca de madera bajo la pergola
    g.rect(24, base1 - 14, 54, 3, PW[3]); g.rect(24, base1 - 14, 54, 1, PW[4]); g.rect(24, base1 - 11, 54, 3, PW[2]); g.rect(26, base1 - 8, 2, 8, '#1c1a22'); g.rect(74, base1 - 8, 2, 8, '#1c1a22');
  }
  // techo: lamas de madera ondulantes, vistas desde arriba (listones corren de norte a sur) + canto delantero
  var rt0 = base0 - roofLift, rt1 = base1 - roofLift;
  for (x = x0; x < x1; x++) {
    var wv = waveAt(x), wv2 = waveAt(x + 6), lama = ((x - x0) >> 1) % 3;
    for (y = rt0 + wv; y < rt1 + wv2; y++) {
      var t = (y - (rt0 + wv)) / Math.max(1, (rt1 + wv2) - (rt0 + wv)), c = lama === 0 ? PW[4] : (lama === 1 ? PW[3] : PW[2]);
      if ((x - x0) % 2 === 1) c = mix(c, PW[0], 0.35);
      if (t < 0.08) c = PW[4]; if (t > 0.85) c = mix(c, PW[1], 0.3);
      if (hash2(x, y, 5511) < 0.03) c = PW[1];
      g.set(x, y, c);
    }
    for (y = rt1 + wv2; y < rt1 + wv2 + 5; y++) g.set(x, y, y === rt1 + wv2 ? PW[3] : (y < rt1 + wv2 + 3 ? PW[2] : PW[0]));        // canto de las lamas con su sombra
  }
  // viga delantera (tubo de acero) bajo el canto
  for (x = x0; x < x1; x++) { var yb = rt1 + waveAt(x + 6) + 5; g.set(x, yb, '#6a6e78'); g.set(x, yb + 1, '#3a3844'); }
  outline(g, K, '#d4a070');
  contact(g, ax, ay + 1, (x1 - x0) / 2, 3, '#2a244066');
  return mk(g, ax, ay, x1 - x0, bd, { cast: { len: 0.2, a: 0.14 }, p: { tall: true, tree: true, canopy: { x: -(W >> 1) + x0, y: rt0 - ay - 2, w: x1 - x0, h: roofLift - 4 + 8 }, shadowIn: true } });
}

/* ============================ CHIMENEAS DE VIDRIO AZUL (Larcomar, asoman en el Parque Salazar) ============================ */
function chimeneaVidrio() {
  var W = 64, H = 148, ax = 28, ay = 140, g = new G(W, H), x, y, i;
  var GL = ['#0e2a5a', '#1a4a96', '#2f78d0', '#5aa4ec', '#a8d4ff'];
  // zocalo de concreto en el pasto
  for (y = ay - 8; y <= ay; y++) for (x = 3; x < 54; x++) g.set(x, y, y === ay - 8 ? CC[4] : (x < 8 ? CC[3] : (x > 46 ? CC[1] : CC[2])));
  g.rect(3, ay, 51, 1, CC[0]);
  // vela de vidrio: borde izquierdo vertical, borde derecho curvo, cima inclinada
  var top = 12;
  for (y = top; y < ay - 8; y++) {
    var t = (y - top) / (ay - 8 - top), xl = 6, xr = Math.round(14 + 32 * Math.pow(Math.sin(Math.min(1, t * 1.05) * Math.PI / 2), 0.7) + (t < 0.12 ? -(0.12 - t) * 100 : 0));
    xr = clamp(xr, xl + 2, 50);
    for (x = xl; x <= xr; x++) {
      var f = (x - xl) / Math.max(1, xr - xl), cc = f < 0.18 ? GL[3] : (f < 0.55 ? GL[2] : (f < 0.85 ? GL[1] : GL[0]));
      var sky = clamp(1 - t * 1.3, 0, 1); cc = mix(cc, '#cfe8ff', sky * 0.55);                                  // reflejo del cielo arriba
      if (((x - xl) % 9 === 0) || (y - top) % 12 === 0) cc = mix(cc, '#e8eef8', 0.55);                         // parantes blancos
      if ((x - xl + (y - top) * 0.5) % 18 < 0.6) cc = mix(cc, '#ffffff', 0.35);                                  // brillo diagonal
      if (x >= xr - 1) cc = GL[0];
      g.set(x, y, cc);
    }
    if (y > top + 4) { g.set(xr + 1, y, '#e8eef8'); g.set(xr + 2, y, '#7aa0c8'); }                              // canto del vidrio
  }
  for (x = 6; x < 20; x++) g.set(x, top - 1 + Math.floor((x - 6) * 0.2), '#e8eef8');
  outline(g, K, '#c8e8ff');
  contact(g, 28, ay + 1, 24, 3, '#2a244066');
  return mk(g, ax, ay, 48, 10, { cast: { len: 0.35, a: 0.16 }, p: { tall: true, name: 'Chimenea de vidrio', emit: [{ x: 0, y: -60, kind: 'ventana', r: 18, col: '#8ab8ff' }] } });
}

/* ============================ PILETA CON LA CABEZA DEL CONDOR (monumento al Alferez Salazar) ============================ */
function cabezaCondorG(f) {
  var W = 128, H = 156, ax = 64, ay = 148, g = new G(W, H), x, y, i, r = rng(6600), ph = f * 2.1;
  var px0 = 6, px1 = 122, py0 = 100, py1 = 138;
  // coronacion de concreto con cara frontal
  for (y = py0; y < py1 + 7; y++) for (x = px0; x < px1; x++) {
    var inner = x > px0 + 5 && x < px1 - 6 && y > py0 + 4 && y < py1 - 2;
    if (inner) {                                                              // agua
      var s1 = Math.sin(x * 0.5 + y * 0.23 + ph), s2 = Math.sin(y * 0.66 - x * 0.19 - ph * 1.3), tt = s1 + s2;
      var c = tt > 1.7 ? WA[4] : (tt > 1.1 ? WA[3] : (tt < -1.4 ? WA[1] : WA[2]));
      if (y < py0 + 9) c = WA[0]; else if (y > py1 - 5) c = WA[3];
      g.set(x, y, c);
    } else if (y >= py1 + 1) g.set(x, y, y < py1 + 3 ? CC[2] : (y < py1 + 6 ? CC[1] : CC[0]));
    else if (y < py1 + 1) g.set(x, y, (y === py0 || x === px0) ? CC[4] : (x > px1 - 7 || y > py1 - 2 ? CC[2] : CC[3]));
  }
  for (x = px0; x < px1; x += 16) { g.set(x, py1 + 3, CC[0]); g.set(x, py1 + 4, CC[0]); }
  // monolito de bloques de piedra rugosa que se afina, con la cabeza de condor
  var BL2 = ['#3e3c44', '#5a5860', '#7a7880', '#9a9aa0', '#bcbcc0'];
  var blocks = [[22, 18, 74], [18, 15, 57], [20, 12, 44], [14, 12, 34], [12, 10, 26]];     // [ancho, alto, y base]
  blocks.forEach(function (b, k) {
    var bw = b[0], bh = b[1], by = b[2], bx = ax - (bw >> 1) + ((k % 2) ? -1 : 1);
    var yb = by + 28;                                                         // bajado hasta la pileta
    for (y = 0; y < bh; y++) for (x = 0; x < bw; x++) {
      var fx = x / bw, c = fx < 0.2 ? BL2[4] : (fx < 0.55 ? BL2[3] : (fx < 0.82 ? BL2[2] : BL2[1]));
      if (y < 3) c = BL2[4]; if (y > bh - 3) c = BL2[1];
      if (hash2(x, y + k * 9, 6611) < 0.12) c = BL2[Math.max(0, BL2.indexOf(c) - 1)]; if (hash2(x, y + k * 9, 6612) < 0.07) c = BL2[Math.min(4, BL2.indexOf(c) + 1)];
      g.set(bx + x, yb - bh + y + 6, c);
    }
  });
  var hx = ax + 2, hy = 22 + 6;
  limb(g, [[hx, hy + 14, 7], [hx, hy + 6, 6.5]], BL2);                        // cuello
  g.ell(hx, hy, 8.5, 8, BL2[2]); limb(g, [[hx, hy, 8]], BL2);                  // cabeza
  limb(g, [[hx + 6, hy - 1, 3.6], [hx + 14, hy + 3, 2.8], [hx + 17, hy + 9, 1.8]], ['#3a3830', '#5a5648', '#7a7460', '#9a9478', '#c0b894']);   // pico ganchudo
  g.disc(hx + 1, hy - 2, 2, '#e8dcc0'); g.set(hx + 1, hy - 2, '#14131a'); g.set(hx + 2, hy - 2, '#14131a');                       // ojo
  limb(g, [[hx - 7, hy - 6, 3.2], [hx - 3, hy - 9, 3]], BL2);                  // cresta / carunculas
  limb(g, [[hx - 2, hy + 9, 8.5]], ['#d8d8dc', '#e4e4e8', '#f0f0f2', '#f8f8fa', '#ffffff']);                                      // collar blanco de plumas
  [[hx - 8, hy + 12], [hx - 4, hy + 14], [hx + 1, hy + 14], [hx + 6, hy + 12]].forEach(function (p) { g.set(p[0], p[1], '#c8c8cc'); });
  // chorrito y brillo en el agua alrededor del monolito
  for (i = 0; i < 9; i++) { var rr = 6 + ((f * 4 + i * 3) % 14); var a2 = i * 0.7; var gx = Math.round(ax + Math.cos(a2) * rr * 1.5), gy = Math.round(py0 + 22 + Math.sin(a2) * rr * 0.4); if (gx > px0 + 6 && gx < px1 - 7) g.set(gx, gy, ((i + f) % 2) ? WA[4] : WA[3]); }
  outline(g, K, '#ece8dc');
  contact(g, ax, ay + 1, 58, 3, '#2a244066');
  return mk(g, ax, ay, 112, 40, { cast: { len: 0.3, a: 0.16 }, p: { tall: true, name: 'Cabeza de condor', animFrames: 3, water: { x: 0, y: -22, r: 40 } } });
}

/* ============================ PUENTE: BARANDA DE POLICARBONATO ============================ */
function barandaPuente() {
  var W = 16, H = 40, g = new G(W, H), x, y;
  g.rect(0, H - 9, W, 8, CC[3]); g.rect(0, H - 9, W, 1, CC[4]); g.rect(0, H - 4, W, 3, CC[2]); g.rect(0, H - 2, W, 1, CC[0]);           // zocalo de concreto
  for (y = 5; y < H - 9; y++) for (x = 0; x < W; x++) {
    var c = y < 9 ? '#d8eef4aa' : '#bfe0ecb0';
    if (((x * 2 + y) % 13) < 2) c = '#ffffffc0';                                                                                           // reflejos
    if (y > H - 12) c = '#9ac4d4b0';
    g.set(x, y, c);
  }
  for (y = 4; y < H - 9; y++) { g.set(0, y, '#8a9098'); g.set(1, y, '#c8ced4'); }                                                         // montante
  g.rect(0, 3, W, 2, '#a8aeb6'); g.rect(0, 3, W, 1, '#e8eef4');
  outline(g, K, null);
  return mk(g, 8, H - 2, 16, 6, { cast: { len: 0.3, a: 0.1 }, p: { tall: true, solid: true } });
}
function cartelPeatones() {
  var W = 62, H = 56, ax = 31, ay = 52, g = new G(W, H), x, y;
  g.rect(29, 28, 3, 24, '#6a6870'); g.rect(29, 28, 1, 24, '#a8a8b0');
  g.rect(3, 4, 56, 28, '#1f58b8'); g.rect(3, 4, 56, 1, '#4a86e0'); g.rect(3, 31, 56, 1, '#103a80'); g.rect(3, 4, 1, 28, '#4a86e0'); g.rect(58, 4, 1, 28, '#103a80');
  g.rect(5, 6, 52, 24, '#2a6ac8'); g.rect(5, 6, 52, 1, '#fff'); g.rect(5, 29, 52, 1, '#fff'); g.rect(5, 6, 1, 24, '#fff'); g.rect(56, 6, 1, 24, '#fff');
  px.text(g, 'PEATONES', 31, 9, { font: 'a5', ink: '#ffffff', align: 'c' });
  px.text(g, "RUTA ACCESO", 31, 16, { font: 'a5', ink: '#ffffff', align: 'c' });
  px.text(g, "28 DE JULIO", 31, 23, { font: 'a5', ink: '#ffe27a', align: 'c' });
  outline(g, K, '#8ab4f0');
  contact(g, 30, ay + 1, 4, 1.4, '#2a244066');
  return mk(g, ax, ay, 6, 4, { cast: { len: 0.25, a: 0.14 }, p: { tall: true } });
}

/* ============================ PARAPENTES DEL CIELO (vistos desde abajo / atras, para la vista) ============================ */
function parapenteCieloG(v) {
  var W = 56, H = 44, g = new G(W, H), x, y, i;
  var pals = [['#f08a38', '#f3efe2', '#8fd0d8'], ['#6fc8a8', '#f3efe2', '#4aa88a'], ['#f08a38', '#f3efe2', '#e8383a'], ['#e8388a', '#f2e63c', '#e8388a']][v];
  var cx = 28, cy = 12, rx = 25 - (v % 2) * 3;
  for (x = -rx; x <= rx; x++) {
    var t = x / rx, arch = Math.round(8 * (1 - t * t)), thick = Math.round(8 - Math.abs(t) * 4.5);
    for (y = 0; y < thick; y++) {
      var yy = cy + Math.round(Math.abs(t) * Math.abs(t) * 9) - arch * 0 + y - 2, cell = Math.floor((x + rx) / 4), base = pals[cell % pals.length];
      var l = y / Math.max(1, thick - 1), c = l < 0.25 ? mix(base, '#ffffff', 0.32) : (l > 0.75 ? mix(base, '#2a2440', 0.32) : base);
      if ((x + rx) % 4 === 0) c = mix(c, '#2a2440', 0.28);
      g.set(cx + x, yy, c);
    }
  }
  var tipL = cy + Math.round(9) - 2, pilotY = 31;
  for (i = -2; i <= 2; i++) { g.line(cx + i * 10, cy + Math.round(Math.pow(i * 10 / rx, 2) * 9) + 3, cx, pilotY - 3, '#3a3846'); }
  g.rect(cx - 2, pilotY - 3, 5, 5, '#2f4470'); g.rect(cx - 2, pilotY - 3, 5, 1, '#5a7ab0');                    // cuerpo con arnes
  g.disc(cx, pilotY - 5, 2.2, v % 2 ? '#e8c060' : '#e8383a'); g.set(cx - 1, pilotY - 6, '#ffffff');           // casco
  g.rect(cx - 2, pilotY + 2, 2, 4, '#1c2540'); g.rect(cx + 1, pilotY + 2, 2, 4, '#1c2540');                   // piernas colgando
  outline(g, '#1c2230', null);
  return mk(g, cx, pilotY + 6, 0, 0, { p: { tall: true, name: 'Parapente' } });
}

function bakeLugares2() {
  M.intihuatana = intihuatana();
  M.totemEspejo = totemEspejo();
  M.pergolaOndulada = [pergolaOndulada(0), pergolaOndulada(1)];
  M.chimeneaVidrio = chimeneaVidrio();
  M.cabezaCondor = [0, 1, 2].map(cabezaCondorG); M.cabezaCondor.fps = 3;
  M.barandaPuente = barandaPuente();
  M.cartelPeatones = cartelPeatones();
  M.parapenteCielo = [0, 1, 2, 3].map(parapenteCieloG);
}

/* ============================ VISTA AL MAR ============================ */
/* Banda de acantilado + Circuito de Playas + playa + mar, bajo el parapeto (fila 33). Todo horneado en franjas de 512 px que se repiten en x.
   draw(ctx, camX, camY, t, W): ctx SIN traslacion de camara (coordenadas de pantalla); la vista empieza en el mundo y = VY0 = 544 (fila 34).
   Solo x tiene paralaje (0.85). Tiene cuadros de olas (3), surfistas, gaviotas, pelicanos y parapentes. Ver ../diseno/cv-C2a.md. */
var VP = 512, VY0 = 544, VH = 736, PARX = 0.85, SCREEN_H = 270;
var V_CLIFF = 0, V_CLIFF_H = 184, V_ROAD = 184, V_ROAD_H = 64, V_SEA = 296, V_SEA_H = VH - 296, V_BEACH = 248, V_BEACH_H = 56, V_SWASH = 284, V_SWASH_H = 36;
function pnoise(seed, cx, cy) {                       // ruido de valor, periodico en x (periodo VP; cx divide a VP)
  var nx = VP / cx;
  return function (x, y) {
    var u = x / cx, v = y / cy, i = Math.floor(u), j = Math.floor(v), fu = smooth(u - i), fv = smooth(v - j);
    var a = hash2(((i % nx) + nx) % nx, j, seed), b = hash2((((i + 1) % nx) + nx) % nx, j, seed), c = hash2(((i % nx) + nx) % nx, j + 1, seed), d = hash2((((i + 1) % nx) + nx) % nx, j + 1, seed);
    return (a + (b - a) * fu) * (1 - fv) + (c + (d - c) * fu) * fv;
  };
}
var EARTH = ['#5a4a38', '#7a6648', '#9a8460', '#b89e72', '#d0b886'];
var IVY = ['#1f4426', '#2f6a30', '#46883a', '#64a648', '#8cc45c'];
function cliffStrip() {
  var W = VP, H = V_CLIFF_H, g = new G(W, H), x, y, r = rng(1234);
  var nA = pnoise(21, 64, 40), nB = pnoise(22, 16, 56), nC = pnoise(23, 32, 24), nV = pnoise(25, 64, 36), nF = pnoise(26, 8, 8), nG = pnoise(27, 128, 60);
  var meshes = [[98, 76, 62, 44], [350, 98, 66, 46], [488, 62, 34, 26]];
  for (y = 0; y < H - 8; y++) for (x = 0; x < W; x++) {
    var t = y / H, fringe = 12 + nA(x, 0) * 10, c;
    if (y < fringe) {                                                   // sombra bajo el parapeto + enredadera que cuelga
      var hang = nF(x, y) > 0.3 + (y / fringe) * 0.45;
      c = hang ? (y < 5 ? IVY[0] : (nF(x + 3, y) > 0.72 ? IVY[3] : IVY[1])) : (y < 7 ? '#2a2236' : '#3a2e3c');
      g.set(x, y, c); continue;
    }
    var ey = y - fringe;
    // roca: estratos horizontales claros/oscuros con barrancos verticales
    var layer = Math.floor(ey / 11 + nG(x, ey) * 2.4), li = ((layer % 4) + 4) % 4;
    var tone = clamp(2 + (li === 0 ? 1 : (li === 2 ? -1 : 0)) + (ey < 16 ? -1 : 0) + (nB(x, ey) > 0.7 ? -1 : 0) + (nB(x, ey) < 0.22 ? 1 : 0), 0, 4);
    c = EARTH[tone];
    if (ey % 11 === 0 && nC(x, ey) > 0.3) c = EARTH[Math.max(0, tone - 1)];
    // vegetacion: manchas grandes y coherentes que bajan por el talud
    var cov = nV(x, ey) + t * 0.85 - 0.8 + (t > 0.7 ? 0.38 : 0) + (nB(x, 0) > 0.68 ? 0.18 * Math.min(1, ey / 40) : 0);
    if (cov > 0.3) {
      var gi = cov > 0.78 ? 3 : (cov > 0.52 ? 2 : 1);
      if (nF(x, y) > 0.62) gi = Math.min(4, gi + 1); else if (nF(x + 5, y + 3) < 0.25) gi = Math.max(0, gi - 1);
      c = IVY[gi];
      if (cov < 0.38) c = (bay(x, y) > 0.5) ? IVY[1] : c;               // borde tramado
      if (hash2(x, y, 31) < 0.008) c = '#f08a38';
    }
    g.set(x, y, c);
  }
  meshes.forEach(function (m, k) {
    for (y = m[1] - m[3] - 6; y < m[1] + m[3] + 6; y++) for (x = m[0] - m[2] - 6; x < m[0] + m[2] + 6; x++) {
      var xx = ((x % W) + W) % W, dx = (x - m[0]) / m[2], dy = (y - m[1]) / m[3], d = Math.sqrt(dx * dx + dy * dy) + (nF(xx * 1.5 + k * 9, y) - 0.5) * 0.45;
      if (d > 1 || y < 0 || y >= H - 8) continue;
      var u = (xx + y) % 8, v = (xx - y + 800) % 8, line = (u === 0 || v === 0), knot = (u === 0 && v === 0);
      g.set(xx, y, knot ? "#b4d0a4" : (line ? "#4a8a50" : (d > 0.86 ? "#1f4a2a" : "#2a5a32")));
    }
  });
  for (var i = 0; i < 8; i++) {                                         // palmeritas y arbustos en el talud bajo
    var px_ = Math.floor(r() * W), py_ = H - 24 + Math.floor(r() * 6), hh = 9 + Math.floor(r() * 6);
    for (var yy = 0; yy < hh; yy++) g.set(px_, py_ - yy + 8, '#6a5a44');
    for (var k2 = -5; k2 <= 5; k2++) { var dy2 = Math.floor(Math.abs(k2) * 0.6); g.set(px_ + k2, py_ - hh + 8 + dy2, k2 === 0 ? IVY[4] : IVY[3]); g.set(px_ + k2, py_ - hh + 9 + dy2, IVY[1]); }
    g.set(px_ - 1, py_ - hh + 7, IVY[4]); g.set(px_ + 1, py_ - hh + 7, IVY[4]);
  }
  for (y = H - 8; y < H; y++) for (x = 0; x < W; x++) g.set(x, y, y === H - 8 ? CC[4] : (y < H - 5 ? CC[3] : (y === H - 1 ? CC[0] : CC[2])));
  for (x = 0; x < W; x += 32) { g.rect(x, H - 6, 3, 3, '#2a2a34'); g.set(x, H - 3, CC[0]); }
  return g.toCanvas();
}

function carG(color, len, kind) {                                       // auto parado visto de lado, 3/4; len px
  var H = 18, g = new G(len, H), x, y, base = color;
  var dark = mix(base, '#14121a', 0.45), lite = mix(base, '#ffffff', 0.35);
  var bodyY0 = 7, bodyY1 = 13;
  for (y = bodyY0; y < bodyY1; y++) for (x = 1; x < len - 1; x++) g.set(x, y, y === bodyY0 ? lite : (y > bodyY1 - 3 ? dark : base));
  var cabL = kind === 'bus' ? 3 : 7, cabR = kind === 'bus' ? len - 3 : len - 8;
  for (y = 1; y < bodyY0; y++) for (x = cabL + Math.floor((bodyY0 - y) * (kind === 'bus' ? 0 : 0.7)); x < cabR - Math.floor((bodyY0 - y) * (kind === 'bus' ? 0 : 0.9)); x++) g.set(x, y, y === 1 ? lite : (y < 4 ? mix(base, '#ffffff', 0.15) : base));
  var wx0 = cabL + 2, wx1 = cabR - 2;
  for (y = 2; y < bodyY0; y++) for (x = wx0 + Math.floor((bodyY0 - y) * (kind === 'bus' ? 0 : 0.7)); x < wx1 - Math.floor((bodyY0 - y) * (kind === 'bus' ? 0 : 0.9)); x++) if (((x - wx0) % (kind === 'bus' ? 6 : 99)) !== 5) g.set(x, y, y < 4 ? '#b8d4dc' : '#7a98a8');
  g.rect(len - 3, 8, 2, 2, '#ffe9a8'); g.rect(1, 8, 2, 2, '#c8202a');
  [6, len - 9].forEach(function (wx) { g.disc(wx + 1.5, 13.5, 2.6, '#14121a'); g.disc(wx + 1.5, 13.5, 1.2, '#7a7a84'); });
  if (kind === 'taxi') { g.rect(Math.floor(len / 2) - 2, 0, 4, 2, '#fff2a0'); }
  outline(g, K, null);
  contact(g, len / 2, H - 1, len / 2 - 1, 1.4, '#2a244070');
  return g;
}
function roadStrip() {
  var W = VP, H = V_ROAD_H, g = new G(W, H), x, y, r = rng(88);
  // muro bajo + berma + asfalto de dos carriles
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    var c;
    if (y < 6) c = y === 0 ? CC[4] : (y < 4 ? CC[3] : CC[1]);
    else if (y < 10) c = (x % 16 < 1) ? CC[1] : CC[3];
    else if (y < 58) { c = (hash2(x >> 1, y >> 1, 91) < 0.5) ? '#44474d' : '#3b3d42'; if (y > 50) c = '#33353d'; if (hash2(x, y, 92) < 0.03) c = '#575a5c'; }
    else c = y < 60 ? CC[4] : (y < 62 ? CC[3] : CC[1]);
    g.set(x, y, c);
  }
  for (x = 0; x < W; x++) { g.set(x, 11, '#d8d4c4'); g.set(x, 56, '#d8d4c4'); if ((x % 24) < 14) { g.set(x, 33, '#e6c84a'); g.set(x, 34, '#e6c84a'); } }
  // autos quietos: embotellamiento
  var cars = [[10, '#d8d8dc', 36, 'car', 0], [52, '#c8202a', 34, 'car', 0], [92, '#f2c838', 36, 'taxi', 0], [136, '#2a4a8a', 36, 'car', 0], [190, '#e8e8ec', 52, 'bus', 0], [250, '#1c1a22', 34, 'car', 0],
    [300, '#8a8e96', 36, 'car', 1], [346, '#2f8a5a', 34, 'car', 1], [392, '#d8d8dc', 36, 'car', 1], [440, '#e8872a', 36, 'taxi', 1], [486, '#4a4a54', 34, 'car', 1]];
  cars.forEach(function (c) {
    var cg = carG(c[1], c[2], c[3]), yy = c[4] ? 36 : 13;
    for (var wrap = -1; wrap <= 1; wrap++) g.blit(c[4] ? cg.flip() : cg, c[0] + wrap * VP, yy);
  });
  return g.toCanvas();
}

function beachStrip() {
  var W = VP, H = V_BEACH_H, g = new G(W, H), r = rng(515), x, y, i;
  var DRY = ['#6e6a60', '#8a8578', '#a8a28f', '#c4bda6', '#d8d1b8'], WET = ['#34363c', '#484a50', '#5c5d62', '#76756f', '#948f84'];
  var edge = pnoise(55, 16, 8);
  // base de piedras: cada una es una elipse con 4 tonos
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) g.set(x, y, y < 38 ? DRY[1] : WET[1]);
  var N = 1700;
  for (i = 0; i < N; i++) {
    var sx = Math.floor(r() * W), sy = Math.floor(r() * H), rx = 1.4 + r() * 2.2, ry = rx * (0.6 + r() * 0.3), pal = sy < 30 ? DRY : WET;
    if (sy < 38 && sy > 24 && r() < 0.4) pal = WET;
    var tone = Math.floor(r() * 3.3);
    for (var wrap = -1; wrap <= 1; wrap++) for (var yy = Math.floor(sy - ry); yy <= Math.ceil(sy + ry); yy++) for (var xx = Math.floor(sx - rx); xx <= Math.ceil(sx + rx); xx++) {
      var dx = (xx - sx) / rx, dy = (yy - sy) / ry; if (dx * dx + dy * dy > 1) continue;
      var l = -(dx * 0.6 + dy * 0.8), k = l > 0.45 ? 3 : (l > -0.1 ? 2 : (l > -0.6 ? 1 : 0));
      if (dx * dx + dy * dy > 0.72) k = 0;
      g.set(xx + wrap * VP, yy, pal[clamp(k + tone - 1, 0, 4)]);
    }
  }
  // lineas de algas y palos arrastrados
  for (i = 0; i < 26; i++) { var ax_ = Math.floor(r() * W), ay_ = 22 + Math.floor(r() * 30), L = 4 + Math.floor(r() * 9); for (var k2 = 0; k2 < L; k2++) g.set((ax_ + k2) % W, ay_ + (k2 % 3 === 0 ? 1 : 0), r() < 0.5 ? '#3a3a24' : '#58582c'); }
  for (i = 0; i < 6; i++) { var dx2 = Math.floor(r() * W), dy2 = 10 + Math.floor(r() * 24); g.line(dx2, dy2, (dx2 + 10) % W + (dx2 + 10 >= W ? 0 : 0), dy2 + 2, '#b8a888'); g.line(dx2, dy2 + 1, dx2 + 10, dy2 + 3, '#7a6a50'); }
  // espigon de rocas grandes (se mete al mar), una al este y otra al oeste de la tira
  [[228, 38, 26], [440, 40, 18]].forEach(function (b) {
    for (i = 0; i < 12; i++) {
      var bx = b[0] + (r() * b[2] - b[2] / 2), by = b[1] + i * 2.4 + r() * 3, br = 5 + r() * 3;
      for (var y2 = Math.floor(by - br); y2 <= by + br; y2++) for (var x2 = Math.floor(bx - br * 1.2); x2 <= bx + br * 1.2; x2++) {
        var ddx = (x2 - bx) / (br * 1.2), ddy = (y2 - by) / br; if (ddx * ddx + ddy * ddy > 1 || y2 >= H) continue;
        var ll = -(ddx * 0.6 + ddy * 0.8); g.set(x2, y2, ll > 0.4 ? '#bcbcc2' : (ll > -0.1 ? '#9a9aa2' : (ll > -0.55 ? '#74747c' : '#4e4e58')));
      }
    }
  });
  // borde de agua irregular (transparencia hacia el mar): las ultimas filas se hacen translucidas
  for (x = 0; x < W; x++) { var shore = Math.round(H - 8 + (edge(x, 0) - 0.5) * 10); for (y = shore; y < H; y++) g.set(x, y, null); }
  return g.toCanvas();
}

/* Mar: 3 cuadros. Cada ola avanza un espacio entero cada 3 cuadros, asi el ciclo cierra. */
function seaFrame(f) {
  var W = VP, H = V_SEA_H, g = new G(W, H), x, y, SP = 26;
  var n1 = pnoise(61, 32, 20), n2 = pnoise(62, 8, 6), nb = pnoise(63, 16, 40);
  for (y = 0; y < H; y++) {
    var t = clamp(y / H, 0, 1), hz = clamp((y - 250) / 190, 0, 1);
    var base = mix(mix('#5fa29a', '#4a8a94', clamp(t * 2.2, 0, 1)), '#8aa4aa', hz * hz * 0.85);
    for (x = 0; x < W; x++) {
      var c = base, wob = (n1(x, y) - 0.5) * 7 + Math.sin(x * 2 * Math.PI * 3 / VP + y * 0.05) * 3;
      var pos = ((y - 10 + wob - f * (SP / 3)) % SP + SP) % SP, k = Math.floor((y - 10 + wob - f * (SP / 3)) / SP);
      var foamOn = hash2(Math.floor(x / 10), k, 67) < (y < 130 ? 0.78 : 0.5);
      if (pos < 2 && foamOn) c = y < 120 ? '#eef6f2' : mix('#d4ece6', '#aac0c4', hz);
      else if (pos < 4 && foamOn) c = mix(base, '#cfe8e0', y < 120 ? 0.55 : 0.4 * (1 - hz));
      else if (pos > SP - 6 && pos < SP - 2) c = mix(base, '#2e5e6e', 0.45 * (1 - hz));
      else if (pos > 5 && pos < 8) c = mix(base, '#b8dcd4', 0.14 * (1 - hz));
      if (c === base && n2(x, y) > 0.8 && (y + x) % 3 === 0) c = mix(base, '#ffffff', 0.16 * (1 - hz));
      g.set(x, y, c);
    }
  }
  return g.toCanvas();
}
function swashFrame(f) {                                                 // espuma que sube y baja sobre las piedras mojadas
  var W = VP, H = V_SWASH_H, g = new G(W, H), x, y, n1 = pnoise(71, 16, 8), n2 = pnoise(72, 6, 4);
  var adv = [0, 3, 6][f] ;
  for (x = 0; x < W; x++) {
    var edge = 14 + Math.round((n1(x, f) - 0.5) * 9) + adv - 3;
    for (y = edge; y < H; y++) { var d = y - edge; g.set(x, y, d < 2 ? '#f4faf6' : (d < 4 ? '#d4ece6aa' : (d < 8 ? '#9ccfca66' : '#8abcb844'))); }
    for (y = Math.max(0, edge - 4); y < edge; y++) if (n2(x, y) > 0.55) g.set(x, y, '#ffffff55');
    if (n2(x, 5 + f) > 0.78) g.set(x, edge - 1, '#ffffffaa');
  }
  return g.toCanvas();
}
function roseNautica() {                                                 // muelle blanco con techos conicos lavanda, de lejos y sin nombre
  var W = 150, H = 80, g = new G(W, H), x, y, i;
  for (x = 10; x < 112; x++) { g.set(x, 20, '#b09468'); g.set(x, 21, '#c8ac7c'); g.set(x, 22, '#6a5a44'); }                         // tablero
  for (x = 14; x < 112; x += 10) { for (y = 22; y < 34; y++) g.set(x, y, '#4a3c2c'); g.set(x + 1, 22, '#6a5a44'); }                  // pilotes
  g.rect(52, 6, 54, 14, '#f0eee8'); g.rect(52, 6, 54, 1, '#ffffff'); g.rect(52, 19, 54, 1, '#bcb8ae'); g.rect(52, 6, 1, 14, '#ffffff');
  for (x = 56; x < 104; x += 8) { g.rect(x, 10, 5, 6, '#7aa0b8'); g.rect(x, 10, 5, 1, '#b8d8e8'); }
  [[60, 10], [78, 14], [96, 10]].forEach(function (c) { for (i = 0; i < c[1]; i++) { var hw = Math.round((c[1] - i) * 0.7); for (x = -hw; x <= hw; x++) g.set(c[0] + x, 6 - i, x < -hw + 1 ? '#d8c8f0' : (x > hw - 1 ? '#7a68a8' : '#b0a0d8')); } g.set(c[0], 6 - c[1] - 1, '#ffffff'); });
  for (i = 0; i < 6; i++) g.rect(2 + i * 3, 24 + (i % 2), 8, 4, '#8e8e98');                                                                // rocas del espigon
  for (i = 0; i < 4; i++) g.rect(0 + i * 4, 28, 9, 5, i % 2 ? '#74747c' : '#9a9aa2');
  outline(g, '#3a3c48', null);
  return g.toCanvas();
}

function gullG(f) {                                                      // gaviota: 2 cuadros de aleteo
  var g = new G(13, 7);
  if (f === 0) { g.line(0, 2, 4, 4, '#f4f4f0'); g.line(4, 4, 6, 3, '#f4f4f0'); g.line(12, 2, 8, 4, '#f4f4f0'); g.line(8, 4, 6, 3, '#f4f4f0'); g.set(6, 4, '#c8c8c4'); g.set(5, 4, '#e8e8e4'); g.set(7, 4, '#e8e8e4'); g.set(6, 5, '#f0a030'); g.set(0, 2, '#3a3a44'); g.set(12, 2, '#3a3a44'); }
  else { g.line(0, 5, 4, 3, '#f4f4f0'); g.line(4, 3, 6, 3, '#f4f4f0'); g.line(12, 5, 8, 3, '#f4f4f0'); g.line(8, 3, 6, 3, '#f4f4f0'); g.set(6, 4, '#c8c8c4'); g.set(6, 5, '#f0a030'); g.set(0, 5, '#3a3a44'); g.set(12, 5, '#3a3a44'); }
  return g.toCanvas();
}
function pelicanG(f) {
  var g = new G(24, 12);
  var w = f ? 2 : 0;
  g.line(2, 5 - w, 10, 4, '#6a5a4c'); g.line(22, 5 - w, 14, 4, '#6a5a4c'); g.line(2, 6 - w, 10, 6, '#4a3e34'); g.line(22, 6 - w, 14, 6, '#4a3e34');
  g.rect(9, 3, 7, 4, '#8a7a68'); g.rect(9, 3, 7, 1, '#cfc4b0'); g.disc(7, 4, 2, '#e8e0cc'); g.line(5, 5, 1, 8, '#d8a840'); g.line(5, 6, 1, 9, '#b88a30'); g.set(7, 3, '#14131a');
  outline(g, '#2a2420', null);
  return g.toCanvas();
}
function surferG(v) {
  var g = new G(14, 10), bc = ['#f3efe2', '#f08a38', '#8fd0d8', '#e8383a'][v % 4];
  g.ell(7, 7, 6, 1.7, bc); g.set(1, 7, '#ffffff'); g.rect(4, 7, 5, 1, mix(bc, '#2a2440', 0.35));
  g.rect(6, 3, 3, 3, '#14131a'); g.rect(5, 4, 1, 1, '#14131a'); g.rect(9, 4, 2, 1, '#14131a'); g.set(7, 2, '#e0a878'); g.set(8, 2, '#e0a878'); g.set(7, 1, '#2a2020');
  g.rect(6, 6, 1, 2, '#14131a'); g.rect(8, 6, 1, 2, '#14131a');
  return g.toCanvas();
}

var VISTA = { sea: [], swash: [] };
M.vista = null;
function bakeVista() {
  M.vista = vista;
  VISTA.cliff = cliffStrip(); VISTA.road = roadStrip(); VISTA.beach = beachStrip();
  VISTA.sea = [0, 1, 2].map(seaFrame); VISTA.swash = [0, 1, 2].map(swashFrame);
  VISTA.rosa = roseNautica(); VISTA.gull = [gullG(0), gullG(1)]; VISTA.pel = [pelicanG(0), pelicanG(1)]; VISTA.surf = [0, 1, 2, 3].map(surferG);
}
var GULLS = [[120, 190, 22, 0.9, 0], [700, 240, 26, 1.3, 1.2], [1400, 160, 18, 1.1, 2.4], [2100, 320, 30, 0.8, 3.1], [2800, 270, 24, 1.4, 4.4], [3500, 210, 20, 1.0, 5.2], [4200, 300, 28, 0.7, 0.7]];
var PELS = [[600, 410, -16, 0.5], [3100, 440, 14, 0.4]];
var SURFERS = [[300, 420, 0], [820, 460, 1], [1300, 390, 2], [2100, 480, 3], [2900, 410, 0], [3600, 450, 1], [4300, 400, 2], [1750, 360, 3]];
var PARAS = [[300, 34, 5.5, 0], [1900, 76, 4.2, 1], [3300, 120, 6.2, 2], [2500, 22, 3.6, 3]];
var hideSpans = [];
var vista = {
  y0: VY0, h: VH, parallax: PARX, period: VP, hide: hideSpans,
  /* oculta la vista en el rango de x del mundo [x0, x1) (por ejemplo, donde Larcomar es caminable) */
  clipOut: function (x0, x1) { hideSpans.push([x0, x1]); },
  clearClip: function () { hideSpans.length = 0; },
  draw: function (ctx, camX, camY, t, W) {
    W = W || 480; t = t || 0;
    var top = Math.round(VY0 - camY);
    if (top >= SCREEN_H || top + VH <= 0 || !VISTA.cliff) return;
    var off = -(Math.floor(camX * PARX) % VP), clipped = hideSpans.length > 0, i, x;
    if (clipped) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, SCREEN_H);
      for (i = 0; i < hideSpans.length; i++) ctx.rect(Math.round(hideSpans[i][0] - camX), 0, hideSpans[i][1] - hideSpans[i][0], SCREEN_H);
      ctx.clip('evenodd');
    }
    function strip(c, v, h) {
      var dy = top + v; if (dy >= SCREEN_H || dy + h <= 0) return;
      for (var xx = off; xx < W; xx += VP) ctx.drawImage(c, xx, dy);
    }
    var fi = Math.floor(t * 3) % 3;
    strip(VISTA.cliff, V_CLIFF, V_CLIFF_H);
    strip(VISTA.road, V_ROAD, V_ROAD_H);
    strip(VISTA.sea[fi], V_SEA, V_SEA_H);
    strip(VISTA.beach, V_BEACH, V_BEACH_H);
    strip(VISTA.swash[(fi + 1) % 3], V_SWASH, V_SWASH_H);
    var par = camX * PARX;
    // Rosa Nautica: de lejos, a la derecha de Intihuatana (x del mundo de la vista ~2790)
    var rx = Math.round(2790 - par - 10), ry = top + V_BEACH + 24 - 18;
    if (rx > -160 && rx < W + 10 && ry < SCREEN_H) ctx.drawImage(VISTA.rosa, rx, ry);
    // surfistas: suben y bajan con la ola
    for (i = 0; i < SURFERS.length; i++) {
      var s = SURFERS[i], sx = Math.round(((s[0] - par) % 4600 + 4600) % 4600 - 40), sy = top + s[1] + Math.round(Math.sin(t * 1.3 + i * 2) * 2);
      if (sx > -20 && sx < W + 20 && sy > -12 && sy < SCREEN_H) ctx.drawImage(VISTA.surf[s[2]], sx, sy);
    }
    // gaviotas
    var fr = Math.floor(t * 6 + 0) % 2;
    for (i = 0; i < GULLS.length; i++) {
      var gu = GULLS[i], gx = Math.round(((gu[0] + t * gu[2] * 3 - par) % 4600 + 4600) % 4600 - 40), gy = top + gu[1] - 120 + Math.round(Math.sin(t * gu[3] + gu[4]) * 8);
      if (gx > -16 && gx < W + 16 && gy > -10 && gy < SCREEN_H) ctx.drawImage(VISTA.gull[(fr + i) % 2], gx, gy);
    }
    for (i = 0; i < PELS.length; i++) {
      var pe = PELS[i], pxx = Math.round(((pe[0] + t * Math.abs(pe[2]) * 2 - par) % 4600 + 4600) % 4600 - 40), pyy = top + pe[1] - 250 + Math.round(Math.sin(t * 0.6 + i) * 6);
      if (pxx > -28 && pxx < W + 28 && pyy > -14 && pyy < SCREEN_H) ctx.drawImage(VISTA.pel[Math.floor(t * 1.2 + i) % 2], pxx, pyy);
    }
    // parapentes lejanos
    if (CV.malecon.parapenteCielo) for (i = 0; i < PARAS.length; i++) {
      var pp = PARAS[i], ppx = Math.round(((pp[0] + t * pp[2] - par) % 4800 + 4800) % 4800 - 50), ppy = top + pp[1] + Math.round(Math.sin(t * 0.5 + i * 1.7) * 3), spr = CV.malecon.parapenteCielo[pp[3]];
      if (ppx > -60 && ppx < W + 60 && ppy > -50 && ppy < SCREEN_H) ctx.drawImage(spr, ppx - spr.ax, ppy - spr.ay + 30);
    }
    if (clipped) ctx.restore();
  }
};

/* ============================ QUEBRADA DE BALTA + CLUB TENNIS LAS TERRAZAS ============================ */
/* Calcomania de 352 x 424 px en el mundo (2400, 304) = columnas 150-171, filas 19-45. Se dibuja ANTES que los tiles (como fondo) y despues de la vista;
   en la quebrada no hay tiles caminables salvo los de los puentes. Abajo, la boca de la quebrada empalma con el Circuito de Playas de la vista (y mundo 728). */
var QX0 = 2400, QY0 = 304, QW = 352, QH = 424;
var CL = ['#8a3e24', '#a8512e', '#bf623a', '#d2754a', '#e08b60'];      // arcilla de las canchas
var TQ = ['#14565c', '#1f8a8c', '#36b0aa', '#6cd0c6', '#b4ece0'];      // muros turquesa
function courtG(g, x, y, w, h, seed) {
  var r = rng(seed), i, j;
  for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
    var inner = i >= 3 && i < w - 3 && j >= 3 && j < h - 3, t = hash2(i >> 1, j >> 1, seed);
    g.set(x + i, y + j, inner ? (t < 0.15 ? CL[1] : (t > 0.8 ? CL[4] : (t > 0.45 ? CL[3] : CL[2]))) : (t < 0.5 ? CL[1] : CL[0]));
  }
  var W = '#f2eee4', cx = x + (w >> 1);
  for (i = 3; i < w - 3; i++) { g.set(x + i, y + 3, W); g.set(x + i, y + h - 4, W); g.set(x + i, y + 6, W); g.set(x + i, y + h - 7, W); }            // fondo y pasillos dobles
  for (j = 3; j < h - 3; j++) { g.set(x + 3, y + j, W); g.set(x + w - 4, y + j, W); }
  for (j = 6; j < h - 6; j++) { g.set(x + (w >> 1) - 14, y + j, W); g.set(x + (w >> 1) + 14, y + j, W); }
  for (i = (w >> 1) - 14; i <= (w >> 1) + 14; i++) g.set(x + i, y + (h >> 1), W);
  for (j = 2; j < h - 2; j++) { g.set(cx, y + j, j % 2 ? '#2a2a30' : '#7a7a84'); g.set(cx - 1, y + j, '#cfd0d4'); }                               // red
  g.rect(cx - 1, y + 1, 3, 2, '#ffffff'); g.rect(cx - 1, y + h - 3, 3, 2, '#ffffff');
  for (j = 0; j < h; j += 1) { g.set(x, y + j, '#17402a'); g.set(x + w - 1, y + j, '#17402a'); }                                                  // reja
  for (i = 0; i < w; i += 1) { g.set(x + i, y, '#17402a'); g.set(x + i, y + h - 1, '#17402a'); }
}
function quebrada() {
  var W = QW, H = QH, g = new G(W, H), x, y, i, r = rng(9090);
  var nV = pnoise(81, 64, 40), nF = pnoise(82, 8, 8), nB = pnoise(83, 16, 48);
  var roadX = function (yy) { var s = smooth((yy - 240) / 150); return 268 - 44 * s; };
  var roadW = function (yy) { return 30 + (yy > 330 ? (yy - 330) * 0.34 : 0); };
  var floor0 = function (yy) { return yy > 290 ? 56 + (yy - 290) * 0.75 : 56; }, floor1 = function (yy) { return yy > 290 ? 250 - (yy - 290) * 0.2 : 250; };
  // --- 1) taludes verdes y piso del valle
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    var c;
    if (x >= floor0(y) && x < Math.min(floor1(y), roadX(y) - roadW(y) / 2 - 2) && y > 16) {
      var tt = hash2(x >> 1, y >> 1, 5);
      c = y < 292 ? (tt < 0.2 ? '#6c7a6a' : (tt < 0.6 ? '#78867a' : '#84927f')) : (tt < 0.5 ? '#6a6a50' : '#7a7658');                                // cemento del club / gravilla
    } else {
      var cov = nV(x, y) + 0.45, t = y / H, ge = Math.floor(clamp(1 + (nF(x, y) * 2.6) + (cov > 0.85 ? 1 : 0), 0, 4));
      c = IVY[ge];
      if (nB(x, y) < 0.28 && t > 0.45) c = EARTH[clamp(1 + Math.floor(nF(x + 4, y) * 3), 0, 4)];                                                      // tierra desnuda en los barrancos
      if (hash2(x, y, 33) < 0.01) c = '#f08a38';                                                                                                     // enredadera con flor naranja
      if (hash2(x, y, 34) < 0.006) c = '#e8c84a';
    }
    g.set(x, y, c);
  }
  // --- 2) canchas de arcilla en dos terrazas y su muro turquesa
  [[64, 40], [152, 40], [64, 128], [152, 128], [64, 214], [152, 214]].forEach(function (p, k) {
    courtG(g, p[0], p[1], 80, 40, 100 + k);
  });
  for (x = 56; x < 244; x++) for (y = 0; y < 3; y++) { g.set(x, 84 + y, TQ[3 - y]); g.set(x, 170 + y, TQ[3 - y]); g.set(x, 256 + y, TQ[3 - y]); }          // muros turquesa bajo cada terraza
  for (y = 87; y < 92; y++) for (x = 56; x < 244; x++) { g.set(x, y, y === 87 ? TQ[2] : (y < 90 ? TQ[1] : TQ[0])); }
  for (y = 173; y < 178; y++) for (x = 56; x < 244; x++) { g.set(x, y, y === 173 ? TQ[2] : (y < 176 ? TQ[1] : TQ[0])); }
  for (y = 259; y < 264; y++) for (x = 56; x < 244; x++) { g.set(x, y, y === 259 ? TQ[2] : (y < 262 ? TQ[1] : TQ[0])); }
  // gradas azules en el borde derecho de la terraza alta
  for (i = 0; i < 3; i++) { g.rect(236, 44 + i * 4, 14, 3, '#2f64c8'); g.rect(236, 44 + i * 4, 14, 1, '#5a92ec'); g.rect(236, 46 + i * 4, 14, 1, '#142a5a'); }
  // postes de luz de cancha
  [[58, 36], [150, 36], [238, 36], [58, 210], [238, 210]].forEach(function (p) { for (y = 0; y < 22; y++) g.set(p[0], p[1] - y + 12, '#6a6a76'); g.rect(p[0] - 3, p[1] - 10, 7, 3, '#cfd3cc'); g.rect(p[0] - 3, p[1] - 10, 7, 1, '#ffffff'); g.rect(p[0] - 3, p[1] - 8, 7, 1, '#8a8e96'); });
  // --- 3) casa club y piscina (abajo a la izquierda)
  box(g, 62, 290, 84, 34, 8, ['#5a5a66', '#7a7a86', '#a0a0aa', '#c4c4cc', '#e0e0e6']);
  for (x = 66; x < 142; x += 14) { g.rect(x, 304, 11, 14, '#4a8a94'); g.rect(x, 304, 11, 1, '#9ad0d8'); g.rect(x + 5, 304, 1, 14, '#2a5a64'); }
  g.rect(62, 322, 84, 3, TQ[1]); g.rect(62, 322, 84, 1, TQ[3]);
  px.text(g, 'CLUB TENNIS', 104, 295, { font: 'a5', ink: '#fff6e0', shadow: '#2a2a34', align: 'c' });
  for (y = 290; y < 316; y++) for (x = 156; x < 214; x++) { var wv = Math.sin(x * 0.5 + y * 0.3); g.set(x, y, y < 293 ? '#cfd3cc' : (wv > 0.8 ? WA[4] : (wv > 0.2 ? WA[3] : WA[2]))); }
  for (x = 156; x < 214; x++) { g.set(x, 290, '#e8ecee'); g.set(x, 316, '#9aa0a6'); g.set(x, 317, '#6a7078'); }
  for (y = 290; y < 318; y++) { g.set(156, y, '#e8ecee'); g.set(213, y, '#9aa0a6'); }
  [[164, 300], [174, 304], [190, 298]].forEach(function (p) { g.set(p[0], p[1], '#ffffff'); g.set(p[0] + 1, p[1], '#cfeaf0'); });
  // --- 4) Bajada Balta: adoquin de piedra con bordillo amarillo, farol doble verde oscuro
  for (y = 0; y < H; y++) {
    var rc = Math.round(roadX(y)), rw = Math.round(roadW(y) / 2);
    for (x = rc - rw; x <= rc + rw; x++) {
      var e = Math.min(x - (rc - rw), (rc + rw) - x), cc;
      if (e < 3) cc = e === 0 ? '#6e5a22' : (e === 1 ? '#f2dc70' : '#e0c44a');
      else { var row = y >> 2, xx = (x + ((row & 1) ? 2 : 0)), tn = hash2(xx >> 2, row, 71); cc = ((xx & 3) === 3 || (y & 3) === 3) ? '#5a5448' : (tn < 0.35 ? '#8a8272' : (tn < 0.7 ? '#9a917e' : '#a8a08a')); }
      g.set(x, y, cc);
    }
    if (y % 72 === 40) { var lx = rc - rw - 6; for (var k = 0; k < 20; k++) g.set(lx, y - k, VG[2]); g.disc(lx, y - 22, 2.6, '#f6f2e6'); g.set(lx - 1, y - 23, '#ffffff'); }
  }
  // --- 5) escalera diagonal de concreto en el talud de la derecha, con barandilla
  for (i = 0; i < 230; i++) { var sx2 = 302 + Math.round(i * 0.16), sy2 = 30 + i; for (var k3 = 0; k3 < 9; k3++) g.set(sx2 + k3, sy2, (i % 6 === 0) ? CC[4] : ((i % 6 < 4) ? CC[3] : CC[1])); g.set(sx2 - 1, sy2, '#17202a'); g.set(sx2 + 9, sy2, '#17202a'); }
  for (i = 0; i < 150; i++) { var sx3 = 14 + Math.round(i * 0.1), sy3 = 20 + i; for (var k4 = 0; k4 < 8; k4++) g.set(sx3 + k4, sy3, (i % 6 === 0) ? CC[4] : ((i % 6 < 4) ? CC[3] : CC[1])); }
  // --- 6) palmeras de abanico en el talud (copas chicas vistas desde arriba)
  [[22, 140], [34, 230], [318, 120], [330, 300], [20, 320], [300, 380], [46, 392]].forEach(function (p) { var gy3 = p[1]; for (i = 0; i < 9; i++) { var a = i / 9 * Math.PI * 2; for (var k5 = 0; k5 < 8; k5++) g.set(p[0] + Math.cos(a) * k5, gy3 + Math.sin(a) * k5 * 0.7, k5 < 3 ? PG[4] : (k5 < 6 ? PG[3] : PG[2])); } g.disc(p[0], gy3, 1.6, '#8a6a3a'); });
  // --- 7) muro de contencion y baranda negra en el borde superior y a los lados (donde la quebrada toca el parque)
  for (y = 0; y < 14; y++) for (x = 0; x < W; x++) g.set(x, y, y === 0 ? CC[4] : (y < 4 ? CC[3] : (y === 13 ? CC[0] : CC[2])));
  for (x = 0; x < W; x += 12) { g.rect(x, 0, 2, 9, '#14131a'); g.set(x, 0, '#46444f'); }
  g.rect(0, 2, W, 1, '#14131a'); g.rect(0, 6, W, 1, '#14131a');
  for (y = 14; y < 252; y += 1) { g.set(0, y, '#14131a'); g.set(W - 1, y, '#14131a'); if (y % 12 === 0) { g.rect(0, y, 2, 2, '#46444f'); g.rect(W - 2, y, 2, 2, '#46444f'); } }
  outline(g, null, null);
  var base = g.toCanvas();
  // --- 8) compone sobre un lienzo: el pie de la quebrada con la roca del acantilado y la boca al Circuito de Playas
  var out = cnv(W, H), cx = out.getContext('2d');
  cx.drawImage(base, 0, 0);
  // sombra bajo los puentes (filas 26-29 del mundo: y 112-176): banda oscura desplazada al SE
  cx.fillStyle = '#2a244064'; cx.fillRect(0, 124, W, 22); cx.fillStyle = '#2a244038'; cx.fillRect(0, 146, W, 30);
  cx.fillStyle = '#2a244064'; cx.fillRect(0, 186, W, 6);
  return out;
}
/* Cara sur del puente Villena Rey: viga de concreto con tres arcos y dos pilares; para pegarla al borde sur del tablero (cols 150-171).
   352 x 56. Ancla: abajo al centro. Las barandas translucidas van en barandaPuente (16 px por segmento). */
function puenteFaz() {
  var W = 352, H = 60, ax = 176, ay = 56, g = new G(W, H), x, y, i;
  for (y = 0; y < 12; y++) for (x = 0; x < W; x++) g.set(x, y, y === 0 ? CC[4] : (y < 3 ? CC[3] : (y > 9 ? CC[0] : CC[2])));                      // tablero visto de canto
  for (x = 0; x < W; x += 22) g.rect(x, 3, 1, 7, CC[1]);
  var piers = [0, 88, 176, 264, 344];
  for (i = 0; i < piers.length - 1; i++) {                                                                                                         // arcos
    var x0 = piers[i] + 8, x1 = piers[i + 1] - 4, cxa = (x0 + x1) / 2, rr = (x1 - x0) / 2;
    for (x = x0; x <= x1; x++) { var dx = (x - cxa) / rr, top = 14 + Math.round(34 * (1 - Math.sqrt(Math.max(0, 1 - dx * dx))) * 0.0 + (1 - Math.sqrt(Math.max(0, 1 - dx * dx))) * 20); for (y = 12; y < top; y++) g.set(x, y, y < top - 2 ? CC[1] : CC[0]); for (y = top; y < H - 2; y++) g.set(x, y, '#3a3a46'); }
  }
  piers.forEach(function (p, k) { for (y = 12; y < H - 2; y++) for (x = Math.max(0, p - 4); x < Math.min(W, p + 9); x++) g.set(x, y, x < p ? CC[4] : (x < p + 5 ? CC[3] : CC[1])); });
  for (x = 0; x < W; x++) { g.set(x, H - 2, CC[1]); g.set(x, H - 1, CC[0]); }
  outline(g, K, null);
  return mk(g, ax, ay, 352, 8, { cast: { len: 0.25, a: 0.18 }, p: { tall: true, name: 'Puente Villena Rey (cara sur)' } });
}

var QCAN = null;
var quebradaBalta = {
  x0: QX0, y0: QY0, w: QW, h: QH, cols: [150, 171], rows: [19, 45],
  draw: function (ctx, camX, camY, t, W) {
    W = W || 480; t = t || 0;
    if (!QCAN) return;
    var sx = Math.round(QX0 - camX), sy = Math.round(QY0 - camY);
    if (sx >= W || sx + QW <= 0 || sy >= SCREEN_H || sy + QH <= 0) return;
    ctx.drawImage(QCAN, sx, sy);
    // dos tenistas y la pelota (animacion barata): cancha de arriba a la izquierda
    var ph = (t * 0.9) % 2, dir = ph < 1 ? 1 : -1, u = ph % 1, bx = sx + 66 + 4 + (dir > 0 ? u : 1 - u) * 72, by = sy + 40 + 20 - Math.sin(u * Math.PI) * 9 + 0.0;
    var pxs = [sx + 68, sx + 138], pys = [sy + 52 + Math.round(Math.sin(t * 1.4) * 4), sy + 56 + Math.round(Math.cos(t * 1.1) * 4)];
    for (var i = 0; i < 2; i++) { ctx.fillStyle = '#f3efe2'; ctx.fillRect(pxs[i], pys[i] - 5, 3, 3); ctx.fillStyle = i ? '#2f64c8' : '#e8383a'; ctx.fillRect(pxs[i], pys[i] - 2, 3, 3); ctx.fillStyle = '#1c1a22'; ctx.fillRect(pxs[i], pys[i] + 1, 3, 2); }
    ctx.fillStyle = '#f2e63c'; ctx.fillRect(Math.round(bx), Math.round(by), 2, 2);
  }
};
function bakeQuebrada() {
  QCAN = quebrada();
  M.puenteFaz = puenteFaz();
  M.quebradaBalta = quebradaBalta;
}
/*@@PARTE9@@*/








/* ============================ HORNEADO ============================ */
var NOW = function () { return (window.performance || Date).now(); }, tm = M.timing = {};
[["tiles", bakeTiles], ["mobiliario", bakeFurniture], ["plantas", bakePlants], ["mosaicos", bakeMosaicos], ["amor", bakeAmor], ["lugares1", bakeLugares1], ["lugares2", bakeLugares2], ["vista", bakeVista], ["quebrada", bakeQuebrada]].forEach(function (st) {
  var a = NOW();
  try { st[1](); } catch (e) { if (window.console) console.warn('[arte-malecon] fallo ' + st[0], e); }
  tm[st[0]] = Math.round(NOW() - a);
});
M.bakeMs = Math.round(NOW() - T0);
/* Contrato (COSTAVERDE.md 10.1) + extras. check() devuelve las claves que falten. */
M.provided = {
  tiles: ["pasto", "pastoFlor", "caminoLadrillo", "ciclovia", "veredaCV", "adoquinLetonia", "losa", "losaLinea", "mosaicoPiso", "pedestalBeso"],
  props: ["faro", "parapeto", "parapetoPilastra", "farolCV", "bancaCV", "basureroCV", "bebedero", "cartelMiraflores", "palmeraCV", "ficusCV", "setoCV", "flores", "beso", "muroMosaico", "solMosaico", "cupido", "gradaAnfi",
    "casetaParapente", "mangaViento", "parapenteCaido", "maquinaGym", "arcoFulbito", "rejaCancha", "gradaDeporte", "intihuatana", "totemEspejo", "pergolaOndulada", "chimeneaVidrio", "cabezaCondor", "barandaPuente"],
  vista: ["vista", "quebradaBalta", "parapenteCielo"],
  extras: ["tierraAmor", "losetaTerracota", "pastoCorazon", "bordilloAmarillo", "arcoFulbitoS", "arcoFulbitoE", "arcoFulbitoO", "rejaCanchaV", "puenteFaz", "cartelPeatones", "frases"]
};
M.check = function () { var miss = []; ["tiles", "props", "vista"].forEach(function (g) { M.provided[g].forEach(function (k) { if (!M[k]) miss.push(k); }); }); return miss; };
M.meta = {}; Object.keys(M).forEach(function (k) { var v = M[k], a = Array.isArray(v) ? v[0] : v; if (a && a.width && a.getContext) M.meta[k] = { n: Array.isArray(v) ? v.length : 1, w: a.width, h: a.height, ax: a.ax, ay: a.ay, fw: a.fw, fh: a.fh }; });
})();
