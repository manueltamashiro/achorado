/* ACHORADO - js/barranco/arte-lugares.js  (Barranco, fase B2a: lugares)
 * Dueño: B2a (unico escritor).  Contrato: BARRANCO.md 10.1.  Nota: ../diseno/br-B2a.md  Prueba: preview-br-lugares.html
 * Publica TODO bajo ACH.sprites.br.lugar (L):
 *   tiles    arena canto orilla adoquin escalon tierraQuebrada pasto vereda pista losetaParque tablasPuente pisoErmita  (16x16, arreglos de variantes)
 *   fondos   mar { draw(ctx, camX, camY, t, W) }   morro { draw(ctx, camX, camY, t, W) }   (atardecer -> noche segun la hora, ver L.hora)
 *   props    ancla (ax, ay) en los pies, huella (fw, fh); tall / tree+canopy / lamp / emit / broken / noche como en Costa Verde
 *   lotes    ACH.sprites.lotArch.br_biblioteca / br_iglesia  (formato de render.js: {canvas, over, overX, overY, lights})
 * Todo se hornea una vez al cargar. Sin getImageData en el bucle, sin shadowBlur ni filter. Sombras SE horneadas (shadowIn).
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px;
if (!px || !px.G) { if (window.console) console.warn('[arte-lugares] falta ACH.px (base.js)'); return; }
var S = ACH.sprites = ACH.sprites || {};
var BR = S.br = S.br || {};
var L = BR.lugar = BR.lugar || {};
S.lotArch = S.lotArch || {};
ACH.cfg = ACH.cfg || {};
var G = px.G, rng = px.rng, mix = px.mix;
var T0 = (window.performance || Date).now();
var K = '#1c1a22', SH = '#2a2440';

/* ============================ UTILIDADES ============================ */
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function hash2(i, j, s) {
  var h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}
function cnv(w, h) { return px.canvas(w, h); }
function F(g, x, y, w, h, c) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  var x1 = x + w, y1 = y + h;
  if (x < 0) x = 0; if (y < 0) y = 0; if (x1 > g.w) x1 = g.w; if (y1 > g.h) y1 = g.h;
  for (var j = y; j < y1; j++) { var o = j * g.w; for (var i = x; i < x1; i++) g.d[o + i] = c; }
}
function P(g, x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.d[y * g.w + x] = c; }
function Q(g, x, y) { x = Math.round(x); y = Math.round(y); return (x >= 0 && y >= 0 && x < g.w && y < g.h) ? g.d[y * g.w + x] : null; }
function FR(g, x, y, w, h, c) { F(g, x, y, w, 1, c); F(g, x, y + h - 1, w, 1, c); F(g, x, y, 1, h, c); F(g, x + w - 1, y, 1, h, c); }
function DISC(g, cx, cy, r, c) {
  var rr = (r + 0.4) * (r + 0.4);
  for (var dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) { var q = rr - dy * dy; if (q < 0) continue; var half = Math.floor(Math.sqrt(q)); F(g, cx - half, cy + dy, half * 2 + 1, 1, c); }
}
function ELL(g, cx, cy, rx, ry, c) {
  for (var dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
    var t = 1 - (dy * dy) / ((ry + 0.4) * (ry + 0.4)); if (t < 0) continue;
    var half = Math.floor(rx * Math.sqrt(t) + 0.4); F(g, cx - half, cy + dy, half * 2 + 1, 1, c);
  }
}
function LN(g, x0, y0, x1, y1, c) { g.line(x0, y0, x1, y1, c); }
var tcache = {};
function mx(a, b, t) { var k = a + b + t; return tcache[k] || (tcache[k] = mix(a, b, t)); }
function lt(c, t) { return mx(c, '#fff0cc', t === undefined ? 0.26 : t); }       // aclara hacia el crema calido
function dk(c, t) { return mx(c, SH, t === undefined ? 0.34 : t); }             // oscurece hacia el violeta
var rcache = {};
function ramp(base) { return rcache[base] || (rcache[base] = [dk(base, 0.62), dk(base, 0.34), base, lt(base, 0.26), lt(base, 0.5)]); }
function AO(g, x, y, w, h, t) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  var x1 = Math.min(g.w, x + w), y1 = Math.min(g.h, y + h);
  for (var j = Math.max(0, y); j < y1; j++) for (var i = Math.max(0, x); i < x1; i++) { var c = g.d[j * g.w + i]; if (c && c.length === 7) g.d[j * g.w + i] = mx(c, SH, t); }
}
function LI(g, x, y, w, h, t) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  var x1 = Math.min(g.w, x + w), y1 = Math.min(g.h, y + h);
  for (var j = Math.max(0, y); j < y1; j++) for (var i = Math.max(0, x); i < x1; i++) { var c = g.d[j * g.w + i]; if (c && c.length === 7) g.d[j * g.w + i] = mx(c, '#fff0cc', t); }
}
function speck(g, x, y, w, h, rnd, n, cols) {
  for (var i = 0; i < n; i++) P(g, x + rnd() * w, y + rnd() * h, cols[(rnd() * cols.length) | 0]);
}
function pick(rnd, a) { return a[Math.floor(rnd() * a.length) % a.length]; }
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
function mottle(seed, rampc, o) {
  o = o || {};
  var g = new G(16, 16), r = rng(seed * 977 + 13);
  var n8 = tnoise(seed + 101, 8), n4 = tnoise(seed + 202, 4), n2 = tnoise(seed + 303, 2);
  var amp = o.amp === undefined ? 1 : o.amp, base = o.base === undefined ? 2 : o.base, bias = o.bias || 0;
  var gl = o.light === undefined ? 0.05 : o.light, gd = o.dark === undefined ? 0.045 : o.dark, top = rampc.length - 1;
  for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) {
    var f = 0.5 + bias + ((n8(x, y) - 0.5) * 0.25 + (n4(x, y) - 0.5) * 0.85 + (n2(x, y) - 0.5) * 0.35) * amp;
    var t = f + (bay(x, y) - 0.5) * 0.14;
    var k = t < 0.22 ? -2 : t < 0.37 ? -1 : t < 0.63 ? 0 : t < 0.78 ? 1 : 2;
    var u = r();
    if (u < gl) k++; else if (u < gl + gd) k--;
    g.set(x, y, rampc[clamp(base + k, 0, top)]);
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
  col = col || '#2a244070';
  for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry;
    if (dx * dx + dy * dy <= 1 && !g.get(x, y)) g.set(x, y, col);
  }
}
/* Lienzo final: toCanvas + sombra proyectada SE horneada + propiedades (como mk() de arte-malecon.js). */
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
/* caja 3/4: tapa clara arriba (topH) y frente abajo; luz arriba-izquierda */
function box(g, x, y, w, h, topH, A) {
  for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
    var c;
    if (j < topH) c = j === 0 ? A[4] : A[3];
    else { var fj = j - topH; c = fj === h - topH - 1 ? A[0] : (i === 0 ? A[3] : (i >= w - 2 ? A[1] : A[2])); if (fj === 0) c = A[3]; }
    g.set(x + i, y + j, c);
  }
}
/* capsula/tubo con luz (para troncos, columnas, mastiles) */
function shaft(g, x, y0, y1, w, A) {
  for (var y = y0; y <= y1; y++) for (var i = 0; i < w; i++) g.set(x + i, y, i === 0 ? A[3] : (i < w * 0.4 ? A[2] : (i < w - 1 ? A[1] : A[0])));
}
function noiseFn(seed, cx, cy, per, perY) {                  // ruido de valor periodico (per celdas en x, perY en y)
  perY = perY || per;
  return function (x, y) {
    var u = x / cx, v = y / cy, i = Math.floor(u), j = Math.floor(v), fu = smooth(u - i), fv = smooth(v - j), p = per, q = perY;
    var a = hash2(((i % p) + p) % p, ((j % q) + q) % q, seed), b = hash2((((i + 1) % p) + p) % p, ((j % q) + q) % q, seed);
    var c = hash2(((i % p) + p) % p, (((j + 1) % q) + q) % q, seed), d = hash2((((i + 1) % p) + p) % p, (((j + 1) % q) + q) % q, seed);
    return (a + (b - a) * fu) * (1 - fv) + (c + (d - c) * fu) * fv;
  };
}

/* ============================ PALETAS (calidas y gastadas; investigacion-barranco.md 2.x) ============================ */
var CANTO = ['#3e382f', '#5e564c', '#7d7261', '#988971', '#b9a58a'];         // canto rodado / guijarro
var CANTOS = ['#4a4238', '#6a6052', '#8c7b64', '#a89880', '#c4b49a'];
var ARENA = ['#7e7260', '#978a74', '#b3a58c', '#c9bba2', '#dcd0b8'];                      // arena gruesa gris-beige
var LAD = ['#5e2e22', '#80402e', '#a5583f', '#bd7050', '#d28d68'];                        // ladrillo de la Bajada
var PIE = ['#6e6659', '#8a8272', '#a69d8a', '#c0b7a2', '#d8cfb8'];                        // piedra de los escalones
var TIE = ['#6a523c', '#86694a', '#a2825a', '#bb9a6c', '#d0b484'];                        // tierra seca de la quebrada
var PAS = ['#2f5d3a', '#417a45', '#5e8f4e', '#7aa65a', '#9cbf6e'];                        // cesped
var VER = ['#8e8676', '#a39b8a', '#b9b09d', '#cdc4af', '#dfd7c3'];                        // vereda calida
var ASF = ['#24252e', '#33353d', '#44474d', '#575a5c', '#6f7170'];
var MAD = ['#4f2a1e', '#6e3a28', '#8a4b32', '#a05e3e', '#b9714a'];                       // madera rojiza del puente
var MAD2 = ['#3b2616', '#5e3a20', '#7a4a2b', '#946238', '#b07a48'];                      // madera marron
var OCR = ['#8a6a2a', '#b8902f', '#d4a840', '#e3b94f', '#f0cf7a'];                        // amarillo ocre de la Ermita
var IR = ['#0f0e14', '#1c1a22', '#2b2b30', '#46444f', '#6a6874'];                         // fierro
var BUG = ['#6a1040', '#9a1450', '#c2185b', '#e0457b', '#f27aa5'];                       // buganvilia magenta/fucsia
var BUGM = ['#3e1450', '#5c2070', '#7b2d8e', '#a054b0', '#c88cd2'];                      // buganvilia morada
var FOL = ['#1a3a26', '#24502f', '#2f5d3a', '#417a45', '#5e8f4e'];                       // follaje oscuro
var FOLC = ['#2f5d3a', '#417a45', '#5e8f4e', '#7aa65a', '#a0c470'];
var CAL = ['#b9b09a', '#cfc8b4', '#e2dccb', '#eee8d6', '#fbf6e8'];                       // cal
var PST = { salmon: '#e8b7a0', agua: '#a9d0c4', mostaza: '#f2d480', celeste: '#9db7d6', rosa: '#d98c8c', crema: '#efe4c8', terracota: '#c98a6a' };

/* ============================ TILES ============================ */
function cantoG(v, big) {                                  // canto rodado: piedras redondeadas con luz arriba-izquierda, juntas oscuras. Toroidal.
  var g = new G(16, 16), r = rng(700 + v * 31 + (big ? 5 : 0)), A = CANTOS, x, y, i, n = big ? 9 : 16;
  var stones = [];
  for (i = 0; i < n; i++) {
    var sr = big ? 2.4 + r() * 1.8 : 1.6 + r() * 1.3;
    stones.push({ x: r() * 16, y: r() * 16, rx: sr * (0.9 + r() * 0.5), ry: sr * (0.75 + r() * 0.35), t: Math.floor(r() * 5), warm: r() < 0.35 });
  }
  F(g, 0, 0, 16, 16, mx(A[0], A[1], 0.45));
  for (y = 0; y < 16; y++) for (x = 0; x < 16; x++) if (hash2(x, y, 9 + v) < 0.14) g.set(x, y, CANTO[0]);
  stones.sort(function (a, b) { return a.y - b.y; });
  stones.forEach(function (s) {
    for (var oy = -16; oy <= 16; oy += 16) for (var ox = -16; ox <= 16; ox += 16) {
      var cx = s.x + ox, cy = s.y + oy;
      if (cx < -5 || cx > 21 || cy < -5 || cy > 21) continue;
      for (var yy = Math.floor(cy - s.ry - 1); yy <= Math.ceil(cy + s.ry + 1); yy++) for (var xx = Math.floor(cx - s.rx - 1); xx <= Math.ceil(cx + s.rx + 1); xx++) {
        var dx = (xx + 0.5 - cx) / s.rx, dy = (yy + 0.5 - cy) / s.ry, d = dx * dx + dy * dy;
        if (d > 1) continue;
        var l = -(dx * 0.55 + dy * 0.85), k = l > 0.45 ? 4 : l > 0.0 ? 3 : l > -0.5 ? 2 : 1;
        k = clamp(k + (s.t - 2) * 0, 0, 4);
        var col = A[k];
        if (s.warm) col = mx(col, '#b07a54', 0.28);
        if (d > 0.72 && l < 0) col = A[0];
        if (xx >= 0 && xx < 16 && yy >= 0 && yy < 16) g.set(xx, yy, col);
      }
    }
  });
  if (!big && v % 2) { P(g, 4, 5, '#6f8a50'); P(g, 5, 5, '#4a6a38'); }                      // algita seca
  return g;
}
function arenaG(v) {                                       // arena gruesa / gravilla gris beige
  var seed = 810 + v * 11, g = mottle(seed, ARENA, { amp: 0.5, base: 2, light: 0.1, dark: 0.08 }), r = rng(seed * 3 + 1), i, x, y;
  for (i = 0; i < 18; i++) { x = Math.floor(r() * 16); y = Math.floor(r() * 16); g.set(x, y, r() < 0.5 ? CANTOS[1] : ARENA[4]); }
  for (i = 0; i < 4; i++) { x = Math.floor(r() * 14); y = Math.floor(r() * 15); g.set(x, y, CANTOS[2]); g.set(x + 1, y, CANTOS[3]); g.set(x, y + 1, CANTOS[1]); }
  if (v === 3) { for (x = 2; x < 14; x++) if (bay(x, 8) < 0.7) g.set(x, 8 + (x % 3 === 0 ? 1 : 0), ARENA[1]); }  // huella de marea
  return g;
}
var AGU = ['#1f4a5a', '#2f6a7c', '#3e7f8e', '#5e9aa5', '#9cc8c8'];
function orillaG(f, v) {                                    // mar a la izquierda (oeste): agua | espuma | piedras mojadas. f = cuadro 0..2
  var g = new G(16, 16), x, y, r = rng(2100 + v * 7), adv = [0, 3, 6][f];
  for (y = 0; y < 16; y++) {
    var edge = 5 + adv + Math.round(Math.sin((y + v * 5) * 0.55) * 1.6 + Math.sin((y + v * 3) * 1.3) * 0.7);
    for (x = 0; x < 16; x++) {
      var c, d = x - edge;
      if (d < -3) c = ((x + y * 2 + f) % 7 === 0) ? AGU[3] : AGU[2];
      else if (d < -1) c = AGU[3];
      else if (d < 0) c = '#cfe4e0';
      else if (d < 2) c = '#f2eee2';
      else if (d < 3) c = (hash2(x, y, 31 + f) < 0.55) ? '#e0dccb' : CANTOS[2];
      else { var m = clamp(2 - Math.floor(d / 4), 0, 2); c = [CANTOS[1], CANTOS[2], CANTOS[3]][2 - m]; if (hash2(x, y, 77) < 0.2) c = CANTOS[0]; if (d < 7 && hash2(x, y, 5) < 0.14) c = '#e6e2d4'; }
      g.set(x, y, c);
    }
  }
  for (var i = 0; i < 6; i++) { x = Math.floor(r() * 16); y = Math.floor(r() * 16); if ((g.get(x, y) || '') === CANTOS[2]) g.set(x, y, CANTOS[4]); }
  return g;
}
function adoquinG(v) {                                      // ladrillo de la Bajada: aparejo trabado 8x4, desgaste y musgo
  var g = new G(16, 16), r = rng(1500 + v * 17), x, y, tone = [];
  var JT = '#4a2218', pal = [LAD[1], LAD[2], LAD[3], LAD[4]];
  if (v >= 6) { pal = ['#6a6862', '#7e7c76', '#928f87', '#a8a49a']; JT = '#2e2d30'; }
  for (var by = 0; by < 4; by++) for (var bx = 0; bx < 4; bx++) tone.push(clamp(Math.floor(hash2(bx, by, 330 + v) * 3.6), 0, 3));
  for (y = 0; y < 16; y++) for (x = 0; x < 16; x++) {
    var row = y >> 2, off = (row & 1) ? 4 : 0, xx = (x + off) & 15, col = xx >> 3, lx = xx & 7, ly = y & 3;
    var t = tone[(row & 3) * 4 + (col + (row >> 1)) % 4], c;
    if (ly === 3 || lx === 7) c = JT;
    else { c = pal[t]; if (ly === 0 && lx < 7) c = pal[Math.min(3, t + 1)]; if (lx === 0 && ly < 3) c = pal[Math.min(3, t + 1)]; if (ly === 2) c = pal[Math.max(0, t - (lx > 3 ? 1 : 0))]; }
    g.set(x, y, c);
  }
  for (var i = 0; i < 6; i++) { x = Math.floor(r() * 16); y = Math.floor(r() * 16); var cc = g.get(x, y); if (cc && cc !== JT) g.set(x, y, r() < 0.5 ? pal[3] : pal[0]); }
  if (v === 2 || v === 5) { P(g, 5, 4, '#5e8f4e'); P(g, 6, 4, '#3f6a3a'); P(g, 11, 11, '#7aa65a'); P(g, 12, 11, '#3f6a3a'); P(g, 12, 10, '#9cbf6e'); }  // hierbita en las juntas
  if (v === 3) { for (x = 2; x < 14; x++) if (hash2(x, 3, 8) < 0.5) P(g, x, 7, '#5a4034'); }
  return g;
}
function escalonG(v) {                                      // escalones de piedra: 0-1 suben al N, 2-3 al E, 4-5 al O, 6-7 al S (contrahuella oscura = cara visible)
  var g = new G(16, 16), r = rng(1700 + v * 13), x, y, dir = v >> 1, wear = v & 1;
  var A = PIE, edgeC = A[4], riser = A[0], tread = A[3], tread2 = A[2];
  function put(i, j, c) { if (dir === 0) g.set(i, j, c); else if (dir === 1) g.set(15 - j, i, c); else if (dir === 2) g.set(j, i, c); else g.set(i, 15 - j, c); }
  // se dibuja como si subiera al norte (j = fila, i = columna) y se rota
  // dir 0 (N): peldanos de 8 px: huella (6 px: arriba clara) + contrahuella visible 2 px oscura abajo
  var rows = [0, 8];
  for (var s = 0; s < 2; s++) {
    var y0 = rows[s];
    for (var i = 0; i < 16; i++) {
      put(i, y0, edgeC);                                                    // arista (canto) iluminada
      put(i, y0 + 1, tread); put(i, y0 + 2, tread); put(i, y0 + 3, (i + s) % 5 === 0 ? tread2 : tread); put(i, y0 + 4, tread2);
      put(i, y0 + 5, A[1]); put(i, y0 + 6, riser); put(i, y0 + 7, '#2e2a26');                          // contrahuella (cara visible) y sombra
    }
  }
  if (dir === 0) {                                                          // vista 3/4: cara frontal alta
    for (var k = 0; k < 16; k++) { if (k % 8 === 7 || k === 0) { put(k, 6, A[2]); } }
  }
  // desgaste, grietas, musgo
  for (var n = 0; n < (wear ? 9 : 5); n++) { x = Math.floor(r() * 16); y = Math.floor(r() * 16); var cc = Q(g, x, y); if (cc) g.set(x, y, r() < 0.5 ? A[1] : A[4]); }
  if (wear) { put(3, 3, '#5e8f4e'); put(4, 3, '#3f6a3a'); put(10, 12, '#5e8f4e'); put(9, 12, '#3f6a3a'); }
  return g;
}
function tierraG(v) {
  var seed = 1100 + v * 7, r = rng(seed), g = mottle(seed, TIE, { amp: 0.7, base: 2, light: 0.05, dark: 0.07 }), i;
  for (i = 0; i < 8; i++) { var x = Math.floor(r() * 15), y = Math.floor(r() * 15); g.set(x, y, TIE[0]); g.set(x + 1, y, TIE[4]); }
  for (i = 0; i < 3; i++) { var sx = 1 + Math.floor(r() * 12), sy = 2 + Math.floor(r() * 12); g.set(sx, sy, CANTOS[2]); g.set(sx + 1, sy, CANTOS[3]); g.set(sx, sy + 1, CANTOS[1]); }
  if (v % 2 === 1) { P(g, 9, 9, PAS[2]); P(g, 9, 8, PAS[4]); P(g, 10, 9, PAS[1]); P(g, 8, 9, PAS[1]); }       // matita seca
  return g;
}
function pastoG(v) {
  var seed = 1300 + v * 13, r = rng(seed * 7 + 5), g = mottle(seed, PAS, { amp: 0.5, base: 2, light: 0.04, dark: 0.03 }), i, x, y;
  for (i = 0; i < 5; i++) { x = 1 + Math.floor(r() * 13); y = 2 + Math.floor(r() * 12); g.set(x, y, PAS[3]); g.set(x, y - 1, PAS[4]); g.set(x + 1, y, PAS[1]); }
  if (v === 2) { for (i = 0; i < 3; i++) { x = 2 + Math.floor(r() * 11); y = 3 + Math.floor(r() * 10); g.set(x, y, '#f3efe2'); g.set(x + 1, y, '#f3efe2'); g.set(x, y - 1, '#f3efe2'); g.set(x, y + 1, '#ffd83a'); } }
  if (v === 4) { for (i = 0; i < 4; i++) { x = 2 + Math.floor(r() * 11); y = 3 + Math.floor(r() * 10); g.set(x, y, '#ffd83a'); g.set(x, y + 1, PAS[1]); } }
  if (v === 5) { for (i = 0; i < 22; i++) { x = Math.floor(r() * 16); y = Math.floor(r() * 16); g.set(x, y, '#a29a58'); } }       // pasto seco
  return g;
}
function veredaG(v) {
  var seed = 1500 + v * 7, r = rng(seed), g = mottle(seed, VER, { amp: 0.4, base: 2, light: 0.04, dark: 0.03 }), x, y;
  var J = '#a39b88';
  for (x = 0; x < 16; x++) for (y = 0; y < 16; y++) {
    var jx = (x === 0 || x === 8), jy = (y === 0 || y === 8);
    if (v === 1 && y >= 8) jx = (x === 4 || x === 12);
    if (jx || jy) g.set(x, y, J);
    else if ((x === 1 && !jy) || (y === 1 && !jx)) { if (r() < 0.5) g.set(x, y, VER[3]); }
  }
  if (v === 2) { for (x = 4; x < 11; x++) for (y = 4; y < 10; y++) if (bay(x, y) < 0.55 - Math.abs(x - 7.5) * 0.07) g.set(x, y, VER[1]); }
  if (v === 3) { [[3, 3], [4, 4], [5, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10]].forEach(function (p) { g.set(p[0], p[1], VER[0]); g.set(p[0] + 1, p[1], VER[4]); }); }
  if (v === 4) { g.set(10, 11, '#8a6a52'); g.set(11, 11, '#a88a6a'); g.set(5, 5, '#b4442f'); g.set(6, 5, '#e0457b'); g.set(12, 4, '#c2185b'); g.set(6, 12, '#e0457b'); }   // petalos de buganvilia
  if (v === 5) { P(g, 4, 12, '#6f8a50'); P(g, 5, 12, '#4a6a38'); P(g, 5, 11, '#9cbf6e'); P(g, 11, 4, '#6f8a50'); P(g, 11, 3, '#9cbf6e'); }
  return g;
}
function pistaG(v) {                                        // Circuito de Playas (corre N-S): 0,1 liso; 2 linea central amarilla discontinua vertical; 3 la misma horizontal (cruce); 4 borde blanco izq; 5 borde blanco der
  var seed = 1700 + v * 9, g = mottle(seed, ASF, { amp: 0.45, base: 2, light: 0.05, dark: 0.04 }), r = rng(seed + 3), x, y, i, Y = '#c9a43a', Y2 = '#8a7228', W = '#d6d1c0', W2 = '#8f8c80';
  for (i = 0; i < 4; i++) { x = Math.floor(r() * 16); y = Math.floor(r() * 16); g.set(x, y, ASF[4]); g.set(x + 1, y, ASF[0]); }
  if (v === 1) { for (i = 0; i < 9; i++) g.set(3 + i, 5 + Math.floor(Math.sin(i * 0.8) * 1.6 + 1), ASF[0]); }                       // grieta
  if (v === 2) { for (y = 2; y < 12; y++) { g.set(7, y, Y); g.set(8, y, Y2); } for (y = 3; y < 11; y++) if (r() < 0.2) g.set(7, y, ASF[2]); }
  if (v === 3) { for (x = 2; x < 12; x++) { g.set(x, 7, Y); g.set(x, 8, Y2); } }
  if (v === 4) { for (y = 0; y < 16; y++) { g.set(3, y, y % 5 === 4 ? ASF[3] : W); g.set(4, y, W2); } }
  if (v === 5) { for (y = 0; y < 16; y++) { g.set(11, y, y % 6 === 2 ? ASF[3] : W); g.set(12, y, W2); } }
  return g;
}
var LP = ['#8d7f6c', '#a79884', '#c0b19b', '#d4c6ae', '#e6d9c2'];
function losetaParqueG(v) {                                 // plaza de granito claro: lozas 8x8 con juntas; 0-1 lisas, 2 cruz de color, 3 desgaste, 4-5 diagonal
  var seed = 1900 + v * 11, g = mottle(seed, LP, { amp: 0.35, base: 2, light: 0.05, dark: 0.04 }), r = rng(seed + 9), x, y, J = '#9c8e78';
  for (x = 0; x < 16; x++) for (y = 0; y < 16; y++) if (x === 0 || x === 8 || y === 0 || y === 8) g.set(x, y, J);
  for (x = 1; x < 16; x++) for (y = 1; y < 16; y++) if ((x === 1 || y === 1 || x === 9 || y === 9) && x !== 8 && y !== 8 && r() < 0.5) g.set(x, y, LP[4]);
  if (v === 2) { for (x = 6; x < 11; x++) for (y = 6; y < 11; y++) if (Math.abs(x - 8) + Math.abs(y - 8) <= 2) g.set(x, y, (x + y) % 2 ? '#b8644a' : '#a0503c'); }
  if (v === 3) { for (var i = 0; i < 10; i++) { x = Math.floor(r() * 15) + 1; y = Math.floor(r() * 15) + 1; g.set(x, y, LP[0]); } P(g, 5, 11, '#6f8a50'); }
  if (v === 4) { for (x = 0; x < 16; x++) { g.set(x, x, J); g.set(15 - x, x, J); } }
  if (v === 5) { for (x = 0; x < 16; x++) { g.set(x, x, J); g.set(x, 15 - x, J); } }
  return g;
}
function tablasG(v) {                                       // tablas del puente: 0-3 tablas verticales (puente E-O: se camina a lo largo), 4-5 horizontales
  var g = new G(16, 16), r = rng(2300 + v * 19), x, y, i, horiz = v >= 4;
  F(g, 0, 0, 16, 16, MAD[0]);
  for (i = 0; i < 4; i++) {
    var t = clamp(Math.floor(hash2(i, v, 55) * 4.2), 0, 3), base = [MAD[1], MAD[2], MAD[3], MAD[2]][t];
    for (var k = 0; k < 16; k++) for (var w = 0; w < 3; w++) {
      var cx = horiz ? k : i * 4 + w, cy = horiz ? i * 4 + w : k;
      var c = base;
      if (w === 0) c = lt(base, 0.18); else if (w === 2) c = dk(base, 0.22);
      if (hash2(cx, cy, 91 + v) < 0.07) c = dk(base, 0.3);                        // veta
      g.set(cx, cy, c);
    }
    // clavos en los extremos y junta de tope
    var n1 = horiz ? [1, i * 4 + 1] : [i * 4 + 1, 1], n2 = horiz ? [14, i * 4 + 1] : [i * 4 + 1, 14];
    P(g, n1[0], n1[1], IR[3]); P(g, n2[0], n2[1], IR[3]);
  }
  if (v === 2 || v === 5) { F(g, horiz ? 0 : 6, horiz ? 6 : 0, horiz ? 16 : 1, horiz ? 1 : 16, MAD[0]); }
  if (v === 1) { P(g, 6, 9, '#c9a870'); P(g, 7, 9, '#a88858'); }                  // pintura descascarada
  return g;
}
function pisoErmitaG(v) {                                   // lajas ocres gastadas alrededor de la Ermita
  var g = new G(16, 16), seed = 2500 + v * 7, r = rng(seed), m = mottle(seed, ['#7a6840', '#98834c', '#b39a5c', '#c8b070', '#dcc78c'], { amp: 0.5, base: 2, light: 0.06, dark: 0.07 }), x, y;
  g.blit(m, 0, 0);
  var J = '#6a5a38';
  for (x = 0; x < 16; x++) for (y = 0; y < 16; y++) { var jx = (x === 0 || x === 8), jy = (y === 0 || y === 8); if (v >= 2) { jx = (x === 0 || x === 6 || x === 12); jy = (y === 0 || y === 10); } if (jx || jy) g.set(x, y, J); }
  for (var i = 0; i < 6; i++) { x = 1 + Math.floor(r() * 14); y = 1 + Math.floor(r() * 14); g.set(x, y, r() < 0.5 ? '#5e4a2a' : '#e0cc90'); }
  if (v === 1 || v === 3) { P(g, 4, 3, '#5e8f4e'); P(g, 5, 3, '#3f6a3a'); P(g, 5, 2, '#9cbf6e'); P(g, 12, 13, '#5e8f4e'); P(g, 12, 12, '#9cbf6e'); }
  if (v === 3) { for (x = 3; x < 9; x++) g.set(x, 5 + (x % 2), '#4a3a22'); }
  return g;
}
function pisoTile(seg) {                                       // tablas de 4 px a lo largo del puente: encaja en vertical y horizontal (16x16)
  var g = new G(16, 16), i, k, w;
  for (i = 0; i < 4; i++) {
    var t = clamp(Math.floor(hash2(i + seg * 4, 7, 55) * 4.2), 0, 3), base = mx([MAD[2], MAD[3], MAD[2], MAD[4]][t], '#d89a62', 0.12), y0 = i * 4, jx = Math.floor(hash2(i, seg, 17) * 14) + 1;
    for (k = 0; k < 16; k++) for (w = 0; w < 4; w++) {
      var c = base, yy = y0 + w;
      if (w === 0) c = lt(base, 0.22); else if (w === 3) c = MAD[0]; else if (w === 2) c = dk(base, 0.14);
      if (hash2(k + seg * 16, yy, 91) < 0.06) c = dk(base, 0.25);
      g.set(k, yy, c);
    }
    for (w = 0; w < 4; w++) g.set(jx, y0 + w, MAD[0]);
    P(g, (jx + 1) % 16, y0 + 1, IR[3]); P(g, (jx + 15) % 16, y0 + 1, IR[3]);
  }
  return g;
}
var SEAT = ['#3a5e6c', '#4c7a80', '#6e9a98', '#86b0aa', '#a6c8c0'];
function marTile(v) {                                            // agua para el mapa (la orilla animada la pone L.mar)
  var g = mottle(1800 + v * 7, SEAT, { amp: 0.6, base: 2, light: 0.05, dark: 0.05 }), r = rng(1800 + v), i;
  for (i = 0; i < 4; i++) { var x = Math.floor(r() * 12), y = Math.floor(r() * 14); P(g, x, y, SEAT[4]); P(g, x + 1, y, SEAT[4]); P(g, x + 2, y, SEAT[3]); }
  return g;
}
function muroTile(v) {                                            // muro pastel de la Bajada (tile solido): zocalo, desconchones
  var base = [PST.crema, PST.salmon, PST.agua, PST.mostaza][v % 4], A = ramp(base), g = mottle(2000 + v * 5, A, { amp: 0.4, base: 2, light: 0.05, dark: 0.05 }), r = rng(2000 + v), i;
  F(g, 0, 12, 16, 4, dk(base, 0.2)); F(g, 0, 12, 16, 1, lt(base, 0.14)); F(g, 0, 0, 16, 1, A[3]);
  for (i = 0; i < 2; i++) { var x = Math.floor(r() * 10), y = 2 + Math.floor(r() * 7); F(g, x, y, 4, 3, mx(base, '#a58a6a', 0.5)); P(g, x + 1, y + 1, '#a5583f'); }
  F(g, 0, 15, 16, 1, A[0]);
  return g;
}
function muroPlayaTile(v) {
  var g = mottle(2200 + v * 3, CC, { amp: 0.35, base: 2, light: 0.04, dark: 0.05 }), x;
  F(g, 0, 0, 16, 2, CC[4]); F(g, 0, 2, 16, 1, CC[1]); F(g, 0, 15, 16, 1, CC[0]); for (x = (v % 2) * 8; x < 16; x += 16) F(g, x, 3, 1, 12, CC[1]);
  return g;
}
function tablasPeatonalTile(v) {
  var seed = 2300 + v * 7, g = mottle(seed, CC, { amp: 0.4, base: 2, light: 0.05, dark: 0.04 }), r = rng(seed), x, y;
  for (x = 0; x < 16; x++) { g.set(x, 0, CC[1]); }
  for (y = 0; y < 16; y++) g.set(0, y, CC[1]);
  if (v === 1) { for (x = 3; x < 12; x++) g.set(x, 6 + (x % 3 === 0 ? 1 : 0), CC[0]); }
  if (v === 2) { P(g, 9, 9, '#e0dcd0'); P(g, 10, 9, '#c8c4b8'); P(g, 4, 12, '#e0457b'); }
  if (v === 3) { for (var i = 0; i < 18; i++) { x = Math.floor(r() * 16); y = Math.floor(r() * 16); g.set(x, y, CC[0]); } }
  return g;
}
function bakeTiles() {
  var T = L.tiles = L.tiles || {};
  T.arena = [0, 1, 2, 3].map(function (v) { return arenaG(v).toCanvas(); });
  T.canto = [cantoG(0, false), cantoG(1, false), cantoG(2, false), cantoG(3, true), cantoG(4, true), cantoG(5, false)].map(function (g) { return g.toCanvas(); });
  T.orilla = [0, 1, 2].map(function (f) { return orillaG(f, 0).toCanvas(); }); T.orilla.fps = 3;
  T.orilla2 = [0, 1, 2].map(function (f) { return orillaG(f, 1).toCanvas(); }); T.orilla2.fps = 3;
  T.adoquin = [0, 1, 2, 3, 4, 5, 6, 7].map(function (v) { return adoquinG(v).toCanvas(); });
  T.escalon = [0, 1, 2, 3, 4, 5, 6, 7].map(function (v) { return escalonG(v).toCanvas(); });
  T.tierraQuebrada = [0, 1, 2, 3].map(function (v) { return tierraG(v).toCanvas(); });
  T.pasto = [0, 1, 2, 3, 4, 5].map(function (v) { return pastoG(v).toCanvas(); });
  T.vereda = [0, 1, 2, 3, 4, 5].map(function (v) { return veredaG(v).toCanvas(); });
  T.pista = [0, 1, 2, 3, 4, 5].map(function (v) { return pistaG(v).toCanvas(); });
  T.losetaParque = [0, 1, 2, 3, 4, 5].map(function (v) { return losetaParqueG(v).toCanvas(); });
  T.tablasPuente = [0, 1, 2, 3, 4, 5].map(function (v) { return tablasG(v).toCanvas(); });
  T.pisoErmita = [0, 1, 2, 3].map(function (v) { return pisoErmitaG(v).toCanvas(); });
  T.mar = [0, 1, 2].map(function (v) { return marTile(v).toCanvas(); });
  T.muro = [0, 1, 2, 3].map(function (v) { return muroTile(v).toCanvas(); });
  T.muroPlaya = [0, 1].map(function (v) { return muroPlayaTile(v).toCanvas(); });
  T.tablasPeatonal = [0, 1, 2, 3].map(function (v) { return tablasPeatonalTile(v).toCanvas(); });
  T.pistaCircuito = T.pista;
  for (var k in T) L[k] = T[k];
}

/* ============================ PLAYA: salvavidas, sombrilla, restaurantes, puente peatonal, autos, parapente ============================ */
var CC = ['#55535c', '#74727a', '#928f90', '#aeaa9f', '#cbc7b8'];              // concreto
var WH = ramp('#e8e2d0');
function corru(g, x, y, w, h, A, off) {                                           // calamina: ondas verticales de 3 px
  F(g, x, y, w, h, A[2]);
  for (var i = 0; i < w; i++) { var k = (i + (off || 0)) % 4; if (k === 0) F(g, x + i, y, 1, h, A[3]); else if (k === 2) F(g, x + i, y, 1, h, A[1]); }
  F(g, x, y, w, 1, A[3]); F(g, x, y + h - 1, w, 1, A[0]);
}
function plankRows(g, x, y, w, h, A, seed) {                                      // tablas horizontales
  var r = rng(seed || 3);
  for (var j = 0; j < h; j += 3) {
    var base = pick(r, [A[1], A[2], A[2], A[3]]);
    F(g, x, y + j, w, 2, base); F(g, x, y + j, w, 1, lt(base, 0.16)); if (j + 2 < h) F(g, x, y + j + 2, w, 1, A[0]);
    for (var k = 0; k < 2; k++) P(g, x + r() * w, y + j, A[0]);
  }
}
function torreSalvavidas() {
  var W = 56, H = 96, ax = 28, ay = 91, g = new G(W, H), RD = ramp('#cc5a3a'), i;
  [[17, 18], [37, 38]].forEach(function (p) { shaft(g, p[0], 52, 86, 3, MAD2.map(function (c) { return dk(c, 0.25); })); });            // pilotes traseros
  LN(g, 18, 54, 38, 84, MAD2[0]); LN(g, 38, 54, 18, 84, MAD2[0]);
  shaft(g, 9, 50, 91, 3, MAD2); shaft(g, 44, 50, 91, 3, MAD2);                                                                          // pilotes delanteros
  F(g, 7, 90, 7, 2, CC[2]); F(g, 42, 90, 7, 2, CC[2]); F(g, 7, 90, 7, 1, CC[4]); F(g, 42, 90, 7, 1, CC[4]);
  LN(g, 12, 56, 44, 86, MAD2[2]); LN(g, 44, 56, 12, 86, MAD2[2]); LN(g, 12, 57, 44, 87, MAD2[1]); LN(g, 44, 57, 12, 87, MAD2[1]);
  F(g, 5, 49, 46, 2, MAD2[4]); F(g, 5, 51, 46, 3, MAD2[2]); F(g, 5, 54, 46, 1, MAD2[0]);                                                // plataforma
  for (i = 8; i < 50; i += 5) P(g, i, 52, MAD2[0]);
  F(g, 47, 54, 2, 38, MAD2[1]); F(g, 53, 54, 2, 38, MAD2[1]); F(g, 47, 54, 1, 38, MAD2[3]);                                              // escalera lateral
  for (i = 58; i < 91; i += 4) F(g, 47, i, 8, 1, MAD2[3]);
  // cabina
  for (var y = 22; y < 49; y++) for (var x = 11; x < 45; x++) g.set(x, y, x < 13 ? WH[4] : (x > 41 ? WH[1] : WH[2]));
  F(g, 11, 48, 34, 1, WH[0]);
  F(g, 11, 34, 34, 4, RD[2]); F(g, 11, 34, 34, 1, RD[3]); F(g, 11, 37, 34, 1, RD[1]);                                                  // franja roja
  F(g, 16, 26, 24, 6, K); F(g, 17, 27, 22, 4, '#2a3a46'); F(g, 17, 27, 22, 1, '#4d6676');                                              // ventana de vigilancia
  F(g, 14, 24, 28, 2, RD[2]); F(g, 14, 24, 28, 1, RD[3]);                                                                              // visera
  F(g, 15, 40, 9, 8, '#f3efe2'); F(g, 18, 41, 3, 6, '#c8202a'); F(g, 16, 43, 7, 2, '#c8202a');                                         // cruz roja
  F(g, 28, 40, 14, 8, WH[3]); F(g, 29, 41, 12, 6, MAD2[1]); F(g, 29, 41, 12, 1, MAD2[3]); F(g, 35, 41, 1, 6, MAD2[0]);                  // puerta
  speck(g, 11, 22, 34, 27, rng(5), 16, [WH[3], '#c9b890', WH[1]]);
  // techo de calamina a cuatro aguas
  for (y = 14; y < 24; y++) { var t = (y - 14) / 10, hw = Math.round(11 + t * 12); corru(g, 28 - hw, y, hw * 2, 1, RD, y); }
  F(g, 8, 23, 40, 1, RD[0]); F(g, 5, 22, 3, 1, RD[1]);
  F(g, 20, 13, 16, 1, RD[4]);
  // mastil con bandera
  F(g, 28, 1, 1, 13, IR[3]); F(g, 29, 2, 10, 6, '#c8202a'); F(g, 29, 2, 10, 1, '#ef5a4a'); F(g, 36, 3, 3, 4, '#a01820'); P(g, 38, 8, '#c8202a');
  // baranda y salvavidas colgado
  F(g, 5, 43, 46, 1, MAD2[3]); for (i = 6; i < 50; i += 11) F(g, i, 43, 1, 7, MAD2[2]);
  DISC(g, 48, 46, 3, '#f0e8d4'); DISC(g, 48, 46, 1, '#9a8a6a'); F(g, 46, 43, 5, 1, '#ef6a3a'); F(g, 46, 48, 5, 1, '#ef6a3a');
  outline(g, K, '#6a5a50');
  contact(g, 27, 91, 20, 2.4, '#2a244070');
  return mk(g, ax, ay, 44, 10, { cast: { len: 0.4, a: 0.2 }, p: { tall: true } });
}
function sombrilla(broken) {
  var W = 52, H = 62, ax = 26, ay = 56, g = new G(W, H), i, x, y, COL = ['#e0705a', '#f3e8cf'], r = rng(2201);
  if (!broken) {
    F(g, 25, 17, 2, 40, '#b4aea0'); F(g, 25, 17, 1, 40, '#e0dac8'); F(g, 26, 17, 1, 40, '#8a8678');
    F(g, 22, 54, 8, 2, CC[2]); F(g, 22, 54, 8, 1, CC[4]);                                                // base
    for (y = 6; y <= 31; y++) {
      var half = y <= 24 ? (y - 6) / 18 * 22 : 22 * Math.sqrt(Math.max(0, 1 - ((y - 24) / 7) * ((y - 24) / 7)));
      for (x = Math.round(26 - half); x <= Math.round(26 + half); x++) {
        var s = Math.floor(((x - 26) / Math.max(half, 1) + 1) * 4.0 + 0.0001), col = COL[(s + (s > 7 ? 1 : 0)) & 1];
        var k = (x - 26) / Math.max(half, 1);                                                            // -1 izq .. 1 der
        if (k > 0.35) col = dk(col, 0.22); else if (k < -0.45) col = lt(col, 0.12);
        if (y > 26) col = dk(col, 0.12);
        g.set(x, y, col);
      }
    }
    for (i = -21; i <= 21; i += 6) { P(g, 26 + i, 29 + Math.round(Math.sqrt(Math.max(0, 1 - (i / 22) * (i / 22))) * 3), '#f3e8cf'); }
    F(g, 26, 3, 1, 4, IR[3]);
    for (i = 0; i < 12; i++) P(g, 8 + r() * 36, 12 + r() * 16, '#b08a70');                              // desteñido
    P(g, 18, 20, K); P(g, 19, 21, K); P(g, 19, 20, K); P(g, 33, 16, K); P(g, 34, 17, K);                // agujeritos
    outline(g, K, null); contact(g, 26, 56, 10, 2.2, '#2a244070');
    return mk(g, ax, ay, 8, 5, { cast: { len: 0.35, a: 0.18 }, p: { tall: true, tree: true, canopy: { x: -22, y: -52, w: 44, h: 26 }, breakable: true } });
  }
  // rota: la tela cae sobre la arena y el mastil queda torcido
  LN(g, 8, 50, 44, 36, '#b4aea0'); LN(g, 8, 51, 44, 37, '#8a8678'); LN(g, 8, 49, 44, 35, '#e0dac8');
  for (y = 30; y <= 52; y++) for (x = 4; x <= 38; x++) {
    var dx = (x - 20) / 18, dy = (y - 42) / 9.5 + Math.sin(x * 0.6) * 0.12;
    if (dx * dx + dy * dy > 1) continue;
    var sl = Math.floor((x + y * 0.5) / 4) & 1, cc = COL[sl];
    if (dx < -0.3) cc = lt(cc, 0.12); if (dx > 0.3 || dy > 0.45) cc = dk(cc, 0.22);
    if (hash2(x, y, 77) < 0.04) cc = dk(cc, 0.4);
    g.set(x, y, cc);
  }
  LN(g, 10, 40, 30, 45, dk(COL[0], 0.5)); LN(g, 14, 36, 28, 40, dk(COL[1], 0.3)); LN(g, 24, 33, 30, 48, dk(COL[0], 0.45));
  outline(g, K, null); contact(g, 24, 54, 22, 3, '#2a244070');
  return mk(g, ax, 54, 36, 14, { cast: { len: 0.3, a: 0.14 } });
}
function winBR(g, x, y, w, h, night, shut, frame) {
  F(g, x - 1, y - 1, w + 2, h + 2, frame || '#e8e0cc');
  F(g, x, y, w, h, night ? '#ffcf7a' : '#2a3a46');
  if (night) { F(g, x, y, w, 1, '#fff0b0'); F(g, x, y + h - 2, w, 2, '#e8a850'); P(g, x + 2, y + 2, '#a8602a'); } else { F(g, x, y, w, 1, '#4d6676'); LN(g, x + 1, y + h - 2, x + w - 2, y + 1, '#3d5666'); }
  F(g, x + (w >> 1), y, 1, h, frame ? dk(frame, 0.4) : '#8a8270');
  if (shut) { F(g, x - 4, y - 1, 3, h + 2, shut); F(g, x - 4, y - 1, 1, h + 2, lt(shut, 0.3)); F(g, x + w + 1, y - 1, 3, h + 2, shut); F(g, x + w + 3, y - 1, 1, h + 2, dk(shut, 0.3)); for (var j = 1; j < h; j += 3) { F(g, x - 3, y + j, 2, 1, dk(shut, 0.35)); F(g, x + w + 1, y + j, 2, 1, dk(shut, 0.35)); } }
  F(g, x - 1, y + h + 1, w + 2, 1, dk(frame || '#e8e0cc', 0.4));
}
function mesaPlastica(g, x, y, col) {                                                // mesa redonda con 2 sillas plasticas
  ELL(g, x, y, 7, 3, dk(col, 0.35)); ELL(g, x, y - 1, 7, 3, col); ELL(g, x - 1, y - 2, 4, 1, lt(col, 0.4)); F(g, x - 1, y + 2, 2, 5, IR[3]);
  F(g, x - 12, y - 1, 5, 6, '#e8e2d0'); F(g, x - 12, y - 6, 5, 5, '#f3efe2'); F(g, x - 12, y - 6, 1, 10, '#fff'); F(g, x - 12, y + 5, 5, 1, '#8a8678');
  F(g, x + 8, y - 1, 5, 6, '#d8d2c0'); F(g, x + 8, y - 6, 5, 5, '#e8e2d0'); F(g, x + 12, y - 6, 1, 10, '#a8a290'); F(g, x + 8, y + 5, 5, 1, '#8a8678');
}
function restoPlaya(v, night) {
  var W = 144, H = 112, ax = 72, ay = 106, g = new G(W, H), r = rng(3300 + v * 17), i, x, y;
  var wall = v === 0 ? '#7fb0c0' : '#e8b86a', WA = ramp(wall), RF = v === 0 ? ramp('#b4503a') : ramp('#7a6a48'), shut = v === 0 ? '#2f6a7c' : '#3f7a4a';
  // pilotes y cubierta de madera
  for (i = 8; i < 136; i += 18) { F(g, i, 98, 3, 8, MAD2[1]); F(g, i, 98, 1, 8, MAD2[3]); }
  F(g, 4, 72, 136, 20, MAD2[2]);                                                    // plataforma (suelo visto desde arriba)
  for (y = 72; y < 92; y += 4) { F(g, 4, y, 136, 1, MAD2[1]); for (i = 4 + ((y >> 2) % 2) * 9; i < 140; i += 18) P(g, i, y + 1, MAD2[0]); }
  F(g, 4, 72, 136, 1, MAD2[4]); F(g, 4, 92, 136, 5, MAD2[1]); F(g, 4, 92, 136, 1, MAD2[3]); F(g, 4, 96, 136, 1, MAD2[0]);
  for (i = 8; i < 140; i += 20) F(g, i, 92, 1, 5, MAD2[0]);
  // escalones al frente
  for (i = 0; i < 3; i++) { F(g, 60 - i * 2, 97 + i * 3, 24 + i * 4, 3, i % 2 ? MAD2[2] : MAD2[3]); F(g, 60 - i * 2, 99 + i * 3, 24 + i * 4, 1, MAD2[0]); }
  // cuerpo
  F(g, 10, 30, 124, 43, wall);
  for (x = 10; x < 134; x += 4) F(g, x, 30, 1, 43, WA[1]);                          // tablas verticales
  F(g, 10, 30, 3, 43, WA[3]); F(g, 131, 30, 3, 43, WA[1]); F(g, 10, 72, 124, 1, WA[0]);
  speck(g, 10, 30, 124, 43, r, 90, [WA[3], WA[1], '#d8d0b8', dk(wall, 0.5)]);       // pintura descascarada
  for (i = 0; i < 6; i++) F(g, 12 + r() * 110, 34 + r() * 34, 3 + r() * 5, 2 + r() * 3, mx(wall, '#b8a888', 0.45));
  // ventanas y puerta
  winBR(g, 22, 48, 14, 14, night, shut, '#efe8d4'); winBR(g, 108, 48, 14, 14, night, shut, '#efe8d4');
  F(g, 62, 42, 20, 30, '#efe8d4'); F(g, 64, 44, 16, 28, night ? '#ffcf7a' : MAD2[1]);
  if (night) { F(g, 64, 44, 16, 1, '#fff0b0'); F(g, 71, 44, 2, 28, MAD2[1]); F(g, 64, 62, 16, 10, '#c88a40'); }
  else { F(g, 71, 44, 2, 28, MAD2[0]); F(g, 64, 44, 16, 1, MAD2[3]); F(g, 66, 50, 4, 8, '#3d5666'); F(g, 74, 50, 4, 8, '#3d5666'); F(g, 69, 58, 1, 2, '#e6c85a'); F(g, 74, 58, 1, 2, '#e6c85a'); }
  // toldo a rayas y letrero
  var ac = v === 0 ? ['#f3efe2', '#3f7a9a'] : ['#f3e8cf', '#c8553a'];
  for (x = 6; x < 138; x++) { for (y = 30; y < 40; y++) { var col = ac[((x >> 2) & 1)]; if (x % 4 === 3) col = dk(col, 0.18); g.set(x, y, y > 37 ? dk(col, 0.25) : col); } if ((x >> 2) % 2 === 0) { g.set(x, 40, ac[0]); } else g.set(x, 40, ac[1]); }
  F(g, 6, 30, 132, 1, lt(ac[0], 0.3));
  F(g, 38, 20, 68, 11, '#1c1a22'); F(g, 39, 21, 66, 9, v === 0 ? '#b4442a' : '#2f5a3a'); F(g, 39, 21, 66, 1, lt(v === 0 ? '#b4442a' : '#2f5a3a', 0.35));
  var nm = v === 0 ? 'CEVICHERÍA' : 'PARRILLAS', mark = /[ÁÉÍÓÚ]/.test(nm);
  px.text(g, nm, 72, 22 + (mark ? 1 : 0), { font: 'a7', ink: night ? '#fff0b0' : '#f3efe2', shadow: dk(v === 0 ? '#b4442a' : '#2f5a3a', 0.5), align: 'c' });
  // techo
  for (y = 6; y < 20; y++) { var tt = (y - 6) / 14, hw = Math.round(54 + tt * 14); if (v === 0) corru(g, 72 - hw, y, hw * 2, 1, RF, y); else { F(g, 72 - hw, y, hw * 2, 1, (y % 3 === 0) ? RF[3] : RF[2]); for (x = 72 - hw + (y % 4); x < 72 + hw; x += 4) P(g, x, y, RF[1]); } }
  F(g, 8, 19, 128, 1, RF[0]); F(g, 18, 5, 108, 1, RF[4]);
  if (v === 1) { for (x = 6; x < 138; x += 3) P(g, x, 20 + ((x >> 1) % 3), RF[2]); }                                       // flecos de palma
  // mesas, sillas y focos
  mesaPlastica(g, 24, 80, v === 0 ? '#f3efe2' : '#d8c8a0'); mesaPlastica(g, 112, 82, v === 0 ? '#f3efe2' : '#d8c8a0');
  F(g, 6, 84, 3, 8, MAD2[1]); F(g, 135, 84, 3, 8, MAD2[1]);                                                          // postes de baranda
  F(g, 6, 84, 132, 1, MAD2[3]);
  for (i = 12; i < 134; i += 12) { P(g, i, 41, night ? '#fff0b0' : '#d8d2b0'); P(g, i, 42, night ? '#ffd860' : '#a8a08a'); }
  outline(g, K, '#6a5a50');
  contact(g, 72, 104, 62, 3, '#2a244070');
  var emit = night ? [{ x: -50, y: -52, kind: 'ventana', r: 9, col: '#ffb45a' }, { x: 50, y: -52, kind: 'ventana', r: 9, col: '#ffb45a' }, { x: 0, y: -48, kind: 'ventana', r: 10, col: '#ffc060' }, { x: -20, y: -62, kind: 'ventana', r: 6, col: '#ffd070' }, { x: 20, y: -62, kind: 'ventana', r: 6, col: '#ffd070' }] : null;
  var c = mk(g, ax, ay, 132, 26, { cast: { len: 0.35, a: 0.2 }, p: { tall: true } });
  if (emit) c.emit = emit;
  return c;
}
function puentePeatonalG() {
  var W = 372, H = 140, ax = 186, ay = 134, gP = new G(W, H), gD = new G(W, H), x, y, i;
  var CR = CC, RA = ramp('#4a7a62');
  function column(g, cx) { for (y = 62; y < 134; y++) for (var xx = cx - 8; xx < cx + 8; xx++) g.set(xx, y, xx < cx - 6 ? CR[4] : (xx > cx + 4 ? CR[1] : CR[3])); F(g, cx - 10, 128, 20, 6, CR[2]); F(g, cx - 10, 128, 20, 1, CR[4]); F(g, cx - 10, 133, 20, 1, CR[0]); F(g, cx - 9, 58, 18, 5, CR[3]); F(g, cx - 9, 58, 18, 1, CR[4]); F(g, cx - 9, 62, 18, 1, CR[0]); for (y = 76; y < 126; y += 12) F(g, cx - 8, y, 16, 1, CR[2]); AO(g, cx + 8, 90, 3, 40, 0.3); speck(g, cx - 8, 64, 16, 66, rng(cx), 30, [CR[2], CR[1], '#9a8a6a']); }
  column(gP, 78); column(gP, 294);
  // vigas de la cubierta
  F(gD, 60, 56, 252, 8, CR[2]); F(gD, 60, 56, 252, 2, CR[4]); F(gD, 60, 62, 252, 2, CR[0]); F(gD, 60, 58, 252, 1, CR[3]);
  for (x = 66; x < 306; x += 40) F(gD, x, 58, 1, 5, CR[1]);
  // piso visto desde arriba (hacia el norte, 3/4)
  F(gD, 60, 36, 252, 20, CR[3]); F(gD, 60, 36, 252, 1, CR[4]); for (x = 60; x < 312; x += 16) F(gD, x, 37, 1, 19, CR[2]); F(gD, 60, 55, 252, 1, CR[1]);
  speck(gD, 60, 37, 252, 18, rng(9), 70, [CR[2], CR[4], '#a89a78']);
  // baranda trasera (norte) y delantera (sur): tubos verde viejo con malla
  function rail(g, x0, x1, yTop, h, front) {
    F(g, x0, yTop, x1 - x0, 2, RA[3]); F(g, x0, yTop, x1 - x0, 1, RA[4]); F(g, x0, yTop + h - 2, x1 - x0, 2, RA[1]);
    for (var px_ = x0; px_ < x1; px_ += 3) F(g, px_, yTop + 2, 1, h - 4, front ? RA[2] : RA[1]);
    for (px_ = x0; px_ <= x1 - 2; px_ += 16) F(g, px_, yTop, 2, h, RA[0]);
    for (i = 0; i < 5; i++) P(g, x0 + 10 + i * 47, yTop + h - 4, '#8a4a2a');                               // oxido
  }
  rail(gD, 60, 312, 22, 16, false);
  rail(gD, 60, 312, 40, 18, true);
  // rampas laterales (con descanso): suben desde el suelo hacia cada extremo
  function ramp_(g, x0, x1, up) {
    for (x = x0; x <= x1; x++) {
      var t = (x - x0) / (x1 - x0), tt = up ? t : 1 - t; var yB = 64 + (1 - tt) * 64, yT = 36 + (1 - tt) * 64;
      var ya = Math.round(yT), yb = Math.round(yB);
      for (y = ya; y < ya + 20; y++) g.set(x, y, y === ya ? CR[4] : CR[3]);
      for (y = ya + 20; y < yb; y++) g.set(x, y, y < ya + 22 ? CR[2] : (x % 6 === 0 ? CR[1] : CR[2]));
      g.set(x, yb, CR[0]);
      if ((x - x0) % 3 === 0) { for (y = ya + 8; y < ya + 22; y++) g.set(x, y, RA[2]); }
      g.set(x, ya + 8, RA[4]); g.set(x, ya + 21, RA[1]);
    }
  }
  ramp_(gD, 4, 60, false); ramp_(gD, 312, 368, true);
  outline(gP, K, null); outline(gD, K, null);
  contact(gP, 78, 133, 14, 2.2, '#2a244070'); contact(gP, 294, 133, 14, 2.2, '#2a244070');
  var gAll = new G(W, H); gAll.blit(gP, 0, 0); gAll.blit(gD, 0, 0);
  var res = mk(gAll, ax, ay, 300, 20, { cast: { len: 0.28, a: 0.22 }, p: { tall: true, air: true } });
  res.pilares = mk(gP, ax, ay, 300, 20, { p: { tall: true } });
  res.deck = mk(gD, ax, ay, 300, 20, { p: { tall: true, air: true } });
  return res;
}
function carBR(kind, broken) {                                                       // auto abandonado visto desde atras (la pista corre N-S): kind 0 sedan, 1 combi
  var van = kind === 1, W = van ? 40 : 36, H = van ? 112 : 96, ax = W >> 1, ay = H - 6, g = new G(W, H), r = rng(4400 + kind * 31 + (broken ? 5 : 0)), i, x, y;
  var base = van ? '#d8cfa8' : '#a84a3a', A = ramp(base), L0 = 4, bw = van ? 32 : 28, bx = (W - bw) >> 1;
  var len = van ? 82 : 66, yTop = 4, yRear = yTop + len;
  // carroceria vista desde arriba
  for (y = yTop; y < yRear; y++) for (x = bx; x < bx + bw; x++) {
    var edge = (x === bx || x === bx + bw - 1), c = A[2];
    if (x < bx + 3) c = A[3]; else if (x > bx + bw - 4) c = A[1];
    if (y < yTop + 2) c = A[4]; if (edge) c = A[0];
    g.set(x, y, c);
  }
  F(g, bx + 2, yTop - 1, bw - 4, 1, A[0]);
  var hood = van ? 12 : 18, ws = van ? 10 : 9, rw = van ? 0 : 9;
  // parabrisas (arriba) y luneta (abajo)
  F(g, bx + 3, yTop + hood, bw - 6, ws, '#6a8290'); F(g, bx + 3, yTop + hood, bw - 6, 1, '#b8d0d8'); F(g, bx + 3, yTop + hood + ws - 1, bw - 6, 1, '#40525e');
  LN(g, bx + 6, yTop + hood + 7, bx + 14, yTop + hood + 1, '#dce8ea'); LN(g, bx + 14, yTop + hood + 1, bx + 18, yTop + hood + 6, '#dce8ea');      // trizadura
  var roofY0 = yTop + hood + ws, roofY1 = van ? yRear - 2 : yRear - 22;
  F(g, bx + 3, roofY0, bw - 6, roofY1 - roofY0, A[3]); F(g, bx + 3, roofY0, bw - 6, 1, A[4]); F(g, bx + bw - 7, roofY0, 4, roofY1 - roofY0, A[2]);
  if (!van) { F(g, bx + 3, roofY1, bw - 6, rw, '#3d5260'); F(g, bx + 3, roofY1, bw - 6, 1, '#7a98a8'); F(g, bx + 3, roofY1 + rw - 1, bw - 6, 1, '#2a3640'); P(g, bx + 8, roofY1 + 3, K); P(g, bx + 9, roofY1 + 4, K); P(g, bx + 10, roofY1 + 5, '#a8c0c8'); }
  else { F(g, bx + 6, roofY0 + 8, bw - 12, 3, A[1]); F(g, bx + 6, roofY0 + 8, bw - 12, 1, A[4]); F(g, bx + 4, roofY0 + 28, bw - 8, 6, '#c8c0a0'); F(g, bx + 5, roofY0 + 30, bw - 10, 2, A[0]); }
  if (van) { for (y = roofY0 + 14; y < roofY1 - 10; y += 14) F(g, bx + 3, y, bw - 6, 1, A[1]); F(g, bx + 3, roofY1 - 14, bw - 6, 14, A[3]); F(g, bx + 5, roofY1 - 12, bw - 10, 8, '#2c3a44'); F(g, bx + 5, roofY1 - 12, bw - 10, 1, '#6a8290'); }
  // retrovisores
  F(g, bx - 3, yTop + hood + 2, 3, 3, A[1]); F(g, bx + bw, yTop + hood + 2, 3, 3, A[1]);
  // cara trasera
  var fy = yRear;
  for (y = fy; y < fy + 12; y++) for (x = bx; x < bx + bw; x++) g.set(x, y, (x === bx || x === bx + bw - 1) ? A[0] : (y === fy ? A[3] : (y > fy + 8 ? A[1] : A[2])));
  F(g, bx + 1, fy + 3, 6, 3, '#c8202a'); F(g, bx + 1, fy + 3, 6, 1, '#ff6a5a'); F(g, bx + bw - 7, fy + 3, 6, 3, broken ? '#4a1018' : '#c8202a'); if (!broken) F(g, bx + bw - 7, fy + 3, 6, 1, '#ff6a5a');
  F(g, (W >> 1) - 5, fy + 5, 10, 4, '#e8e0b0'); F(g, (W >> 1) - 4, fy + 6, 8, 2, '#4a6a9a');
  F(g, bx, fy + 10, bw, 2, '#2a2a30'); F(g, bx, fy + 10, bw, 1, '#5a5a62');
  // ruedas
  F(g, bx - 2, fy + 5, 4, 9, '#14131a'); F(g, bx + bw - 2, fy + 5, 4, 9, '#14131a'); F(g, bx - 2, fy + 5, 4, 1, '#3a3a42'); F(g, bx + bw - 2, fy + 5, 4, 1, '#3a3a42');
  F(g, bx - 1, fy + 8, 2, 2, '#8a8a92'); F(g, bx + bw - 1, fy + 8, 2, 2, '#8a8a92');
  // oxido, polvo, desgaste
  for (i = 0; i < 24; i++) { x = bx + 1 + Math.floor(r() * (bw - 2)); y = yTop + 1 + Math.floor(r() * (len + 8)); var cc = Q(g, x, y); if (cc && (cc === A[2] || cc === A[3] || cc === A[1])) P(g, x, y, r() < 0.6 ? '#8a4a2a' : '#6a3a22'); }
  for (i = 0; i < 40; i++) { x = bx + 1 + Math.floor(r() * (bw - 2)); y = yTop + 1 + Math.floor(r() * (len + 8)); var c2 = Q(g, x, y); if (c2 && c2.length === 7) P(g, x, y, mx(c2, '#c8b48c', 0.35)); }
  F(g, bx + 2, yTop + 2, 6, 5, mx(A[2], '#8a4a2a', 0.5)); F(g, bx + bw - 9, yTop + 7, 5, 4, mx(A[2], '#8a4a2a', 0.45));
  if (broken) { F(g, bx + 2, yTop + 1, bw - 4, hood - 2, A[0]); F(g, bx + 3, yTop + 2, bw - 6, hood - 4, '#14131a'); for (i = 0; i < 6; i++) P(g, bx + 5 + i * 3, yTop + 4 + (i % 2) * 3, '#6a6a72'); LN(g, bx + 4, yTop + hood - 2, bx + bw - 6, yTop + 3, '#8a8a92'); P(g, bx + 10, yTop - 3, '#4a4a52'); P(g, bx + 11, yTop - 5, '#5a5a62'); }   // capo abierto y humo
  outline(g, K, null);
  contact(g, W >> 1, fy + 13, bw / 2 + 2, 2.4, '#2a244070');
  return mk(g, ax, fy + 12, bw, len + 10, { cast: { len: 0.4, a: 0.2 }, p: { tall: false } });
}
function parapenteTiradoG() {
  var W = 128, H = 78, ax = 64, ay = 70, g = new G(W, H), i, x, y, PK = ['#9a2a5a', '#c8508a', '#ee7aaa', '#f8b0cc'], YE = ['#a8801a', '#d0a830', '#f0cc48', '#fbe888'];
  // ala arqueada, tendida sobre el canto rodado: celdas alternas rosa / amarillo
  for (x = 8; x < 122; x++) {
    var u = (x - 8) / 113, topY = 12 + Math.pow(u * 2 - 1, 2) * 16 + Math.sin(u * 9) * 1.2, botY = topY + 22 - Math.pow(u * 2 - 1, 2) * 9 + Math.cos(u * 7) * 1.4;
    var cell = Math.floor(u * 11), pal = (cell & 1) ? YE : PK;
    for (y = Math.round(topY); y < Math.round(botY); y++) {
      var v = (y - topY) / Math.max(1, botY - topY), k = v < 0.15 ? 3 : v < 0.55 ? 2 : v < 0.85 ? 1 : 0;
      if ((x - 8) % 10 === 0 || (x - 8) % 10 === 9) k = Math.max(0, k - 1);
      g.set(x, y, pal[k]);
    }
    if ((x - 8) % 10 === 0) { for (y = Math.round(topY); y < Math.round(botY); y++) g.set(x, y, '#3a1a2a'); }
  }
  // arrugas y dobleces
  LN(g, 30, 20, 44, 34, PK[0]); LN(g, 74, 16, 92, 34, YE[0]); LN(g, 52, 26, 60, 18, YE[3]); LN(g, 100, 24, 108, 32, PK[0]);
  speck(g, 10, 14, 110, 30, rng(88), 60, ['#fff6e0', '#6a2a4a']);
  // lineas hacia el arnes (abajo a la izquierda-centro)
  for (i = 0; i < 9; i++) LN(g, 16 + i * 12, 40 + (i % 3), 50 + (i % 4) * 3, 58, '#2a1a2a');
  // arnes: asiento azul-negro con mochila y casco
  F(g, 44, 56, 20, 7, '#2a3a5a'); F(g, 44, 56, 20, 1, '#4a6a9a'); F(g, 44, 62, 20, 1, '#141a2a'); F(g, 48, 52, 12, 5, '#c8202a'); F(g, 48, 52, 12, 1, '#ff6a5a');
  DISC(g, 70, 59, 4, '#e8e2d0'); DISC(g, 69, 58, 2, '#ffffff'); F(g, 66, 60, 8, 2, '#c8202a');
  LN(g, 64, 60, 70, 62, '#14131a');
  F(g, 52, 62, 4, 4, '#14131a'); F(g, 66, 62, 4, 4, '#14131a');
  outline(g, K, null); contact(g, 64, 66, 56, 3, '#2a244060');
  return mk(g, ax, ay, 112, 30, { cast: { len: 0.2, a: 0.12 } });
}

function bakePlaya() {
  L.torreSalvavidas = torreSalvavidas();
  L.sombrillaPlaya = sombrilla(false); L.sombrillaPlaya.broken = sombrilla(true);
  L.restoPlaya = [0, 1].map(function (v) { var c = restoPlaya(v, false), n = restoPlaya(v, true); c.emit = n.emit; c.noche = n; return c; });
  L.puentePeatonal = puentePeatonalG();
  L.autoAbandonado = [0, 1].map(function (k) { var c = carBR(k, false); c.broken = carBR(k, true); return c; });
  L.parapenteTirado = parapenteTiradoG();
}

/* ============================ MOBILIARIO: farol, banca, basurero, cajas, muneco, carrito ============================ */
function farolBR(dark) {
  var W = 40, H = 92, ax = 20, ay = 86, g = new G(W, H), gy = 15, y, i;
  var GL = dark ? ['#5a6470', '#7e8a96', '#a8b4c0'] : ['#e8a838', '#ffd96a', '#fff3b8'];
  shaft(g, ax - 1, gy + 12, ay - 10, 3, IR.map(function (c, k) { return k === 0 ? c : lt(c, 0.1); }));
  for (y = ay - 10; y <= ay - 1; y++) { var w = 2 + Math.floor((y - (ay - 10)) / 2.0); for (i = -w; i <= w; i++) g.set(ax + i, y, i < -w + 1 ? IR[4] : (i > w - 2 ? IR[0] : IR[2])); }   // pie acampanado
  F(g, ax - 6, ay - 1, 13, 2, IR[1]); F(g, ax - 6, ay - 1, 13, 1, IR[3]);
  [ay - 22, ay - 40, gy + 22].forEach(function (cy) { F(g, ax - 3, cy, 7, 2, IR[3]); F(g, ax - 3, cy, 7, 1, IR[4]); F(g, ax - 3, cy + 1, 7, 1, IR[0]); });   // anillos
  // volutas del brazo
  [-1, 1].forEach(function (d) {
    var cx = ax + d * 9, cy = gy + 34;
    for (i = 0; i < 14; i++) { var a = i / 13 * 3.4 + (d < 0 ? 0.2 : 0.2); P(g, cx + d * Math.round(Math.cos(a) * 4 + 3), cy + Math.round(Math.sin(a) * 4), IR[3]); }
    LN(g, ax + d, gy + 34, cx + d * 5, gy + 30, IR[2]); LN(g, ax + d, gy + 35, cx + d * 5, gy + 31, IR[1]);
  });
  F(g, ax - 4, gy + 14, 9, 3, IR[2]); F(g, ax - 4, gy + 14, 9, 1, IR[4]);                                   // copa de la linterna
  for (y = gy - 8; y <= gy + 12; y++) {                                                                       // vidrio troncoconico
    var hw = 4 + Math.floor((y - (gy - 8)) / 9);
    for (i = -hw; i <= hw; i++) g.set(ax + i, y, Math.abs(i) >= hw ? IR[1] : (i < -hw + 2 ? GL[2] : (i > hw - 3 ? GL[0] : GL[1])));
    if (y === gy + 2) F(g, ax - hw, y, hw * 2 + 1, 1, IR[2]);
  }
  F(g, ax, gy - 8, 1, 21, IR[1]);
  if (!dark) { F(g, ax - 1, gy, 3, 6, '#fffbe0'); }
  for (y = gy - 15; y < gy - 8; y++) { var h2 = Math.round((y - (gy - 15)) / 7 * 6); F(g, ax - h2, y, h2 * 2 + 1, 1, y < gy - 12 ? IR[3] : IR[2]); P(g, ax - h2, y, IR[4]); }   // techito
  F(g, ax, gy - 19, 1, 4, IR[3]); P(g, ax, gy - 20, IR[4]); P(g, ax - 1, gy - 18, IR[2]); P(g, ax + 1, gy - 18, IR[2]);
  outline(g, K, '#6a6a76');
  contact(g, ax, ay + 1, 8, 2, '#2a244070');
  return mk(g, ax, ay, 8, 5, { cast: { len: 0.3, a: 0.2 }, p: { tall: true, lamp: { x: 0, y: gy + 2 - ay }, poleKind: 'luz' } });
}
function bancaBR() {
  var W = 44, H = 34, g = new G(W, H), i, y;
  [4, 37].forEach(function (lx) { F(g, lx, 14, 3, 14, IR[2]); F(g, lx, 14, 1, 14, IR[4]); F(g, lx - 2, 27, 7, 2, IR[1]); F(g, lx - 2, 27, 7, 1, IR[3]); P(g, lx - 1, 13, IR[3]); P(g, lx + 3, 13, IR[3]); F(g, lx - 1, 8, 5, 2, IR[3]); F(g, lx, 8, 3, 1, IR[4]); });
  for (i = 0; i < 3; i++) { y = 4 + i * 3; F(g, 3, y, 38, 2, MAD2[2]); F(g, 3, y, 38, 1, MAD2[4]); F(g, 3, y + 1, 38, 1, MAD2[1]); }
  F(g, 3, 4, 2, 10, IR[2]); F(g, 39, 4, 2, 10, IR[2]); F(g, 3, 4, 1, 10, IR[4]);
  for (i = 0; i < 2; i++) { y = 14 + i * 4; F(g, 2, y, 40, 3, MAD2[3]); F(g, 2, y, 40, 1, '#c99458'); F(g, 2, y + 2, 40, 1, MAD2[1]); }
  F(g, 2, 21, 40, 1, MAD2[0]);
  for (i = 0; i < 12; i++) P(g, 4 + (i * 37) % 36, 5 + (i * 7) % 18, MAD2[0]);
  P(g, 12, 15, '#c8553a'); P(g, 13, 15, '#c8553a'); P(g, 30, 4, '#c8553a');                                           // pintura vieja
  outline(g, K, '#6a5a50'); contact(g, 22, 29, 19, 2.2, '#2a244070');
  return mk(g, 22, 28, 38, 8, { cast: { len: 0.35, a: 0.18 } });
}
function basureroBR(broken) {
  var W = 34, H = 36, g = new G(W, H), x, y, i, B = ramp('#3f6a8a');
  if (!broken) {
    for (y = 10; y <= 29; y++) for (x = 8; x <= 24; x++) { var f = (x - 8) / 16; g.set(x, y, f < 0.2 ? B[3] : (f < 0.55 ? B[2] : (f < 0.85 ? B[1] : B[0]))); }
    for (y = 14; y <= 26; y += 4) F(g, 8, y, 17, 1, B[0]);
    F(g, 7, 8, 19, 3, B[3]); F(g, 7, 8, 19, 1, B[4]); F(g, 7, 10, 19, 1, B[0]);
    F(g, 10, 5, 13, 4, B[2]); F(g, 10, 5, 13, 1, B[3]); F(g, 12, 3, 9, 3, '#0a0a10'); F(g, 12, 3, 9, 1, '#2a2a34');
    F(g, 11, 16, 11, 6, '#e8e2d0'); F(g, 13, 18, 3, 2, '#3f7a4a'); F(g, 17, 18, 3, 1, B[0]); F(g, 17, 20, 3, 1, B[0]);
    F(g, 8, 29, 17, 1, B[0]); speck(g, 8, 11, 17, 18, rng(15), 14, ['#8a4a2a', '#6a3a22', B[4]]);
    P(g, 9, 5, '#a8a290'); P(g, 28, 14, '#c8b48c'); P(g, 6, 28, '#c8b48c');
    outline(g, K, '#6a8aa8'); contact(g, 16, 30, 11, 2, '#2a244070');
    return mk(g, 16, 29, 18, 8, { cast: { len: 0.4, a: 0.2 } });
  }
  for (y = 16; y <= 29; y++) for (x = 3; x <= 24; x++) { var ff = (y - 16) / 13; g.set(x, y, ff < 0.25 ? B[3] : (ff < 0.6 ? B[2] : (ff < 0.9 ? B[1] : B[0]))); }
  F(g, 24, 15, 4, 16, B[3]); F(g, 24, 15, 1, 16, B[4]); F(g, 26, 17, 1, 12, '#0a0a10');
  for (x = 5; x <= 22; x += 4) F(g, x, 16, 1, 14, B[0]);
  speck(g, 0, 22, 34, 12, rng(25), 26, ['#e8e2d0', '#8a6a40', '#3f7a4a', '#c8402a', '#a8a290']);
  F(g, 28, 27, 4, 3, '#e8e2d0'); F(g, 1, 30, 3, 2, '#c8b48c');
  outline(g, K, '#6a8aa8'); contact(g, 17, 31, 17, 2.4, '#2a244070');
  return mk(g, 16, 30, 30, 8, { cast: { len: 0.25, a: 0.16 } });
}
function bottleTop(g, x, y, col, cap) { F(g, x, y, 3, 3, col); P(g, x, y, lt(col, 0.4)); F(g, x, y + 3, 3, 1, dk(col, 0.45)); P(g, x + 1, y + 1, cap || '#e6c85a'); P(g, x + 1, y, cap ? lt(cap, 0.3) : '#fff0a0'); }
function cajaCervezas(broken) {
  var W = 40, H = 40, g = new G(W, H), i, x, y, CR = ramp('#c8402a'), BO = '#6a3a1a', BG = '#2f7a4a';
  function crate(cx, cy, w, tilt) {
    F(g, cx, cy, w, 4, CR[3]); F(g, cx, cy, w, 1, CR[4]);                                                          // tapa superior
    for (var i2 = 0; i2 < w; i2 += 4) bottleTop(g, cx + 1 + i2, cy - 1, (i2 / 4) % 2 ? BG : BO, '#e6c85a');
    F(g, cx, cy + 4, w, 11, CR[2]); F(g, cx, cy + 4, 2, 11, CR[3]); F(g, cx + w - 2, cy + 4, 2, 11, CR[1]); F(g, cx, cy + 14, w, 1, CR[0]);
    for (var j = 0; j < w; j += 4) F(g, cx + j, cy + 6, 2, 6, CR[1]);                                              // ranuras
    F(g, cx + (w >> 1) - 4, cy + 5, 8, 3, CR[0]);
  }
  if (!broken) {
    crate(3, 22, 30, 0); crate(6, 9, 26, 0);
    F(g, 10, 17, 18, 3, '#f3efe2'); F(g, 11, 18, 16, 1, '#c8402a');
    outline(g, K, '#e0705a'); contact(g, 18, 37, 17, 2.2, '#2a244070');
    return mk(g, 18, 37, 32, 10, { cast: { len: 0.35, a: 0.2 }, p: { breakable: true, drops: 'botella' } });
  }
  // rota: una caja de lado, vidrios regados
  F(g, 4, 24, 28, 11, CR[2]); F(g, 4, 24, 28, 1, CR[3]); F(g, 4, 34, 28, 1, CR[0]); for (x = 6; x < 30; x += 4) F(g, x, 27, 2, 6, CR[1]); F(g, 28, 22, 6, 6, CR[1]); LN(g, 30, 22, 34, 28, CR[3]);
  for (i = 0; i < 34; i++) { x = 2 + Math.floor(hash2(i, 1, 5) * 34); y = 30 + Math.floor(hash2(i, 2, 5) * 8); P(g, x, y, i % 3 === 0 ? '#bfe8cc' : (i % 3 === 1 ? '#7ac49a' : '#9a6a3a')); }
  F(g, 10, 36, 4, 2, '#6a3a1a'); F(g, 22, 37, 5, 2, '#2f7a4a'); P(g, 26, 36, '#bfe8cc');
  outline(g, K, null); contact(g, 18, 36, 16, 2.4, '#2a244070');
  return mk(g, 18, 36, 28, 8, { cast: { len: 0.2, a: 0.14 } });
}
function leanG(g, dx) {
  var n = new G(g.w, g.h), base = g.h - 4;
  for (var y = 0; y < g.h; y++) { var sh = Math.round(dx * Math.max(0, base - y) / base); for (var x = 0; x < g.w; x++) { var c = g.d[y * g.w + x]; if (c) n.set(x + sh, y, c); } }
  return n;
}
function munecoBase() {
  var W = 44, H = 74, g = new G(W, H), x, y, BU = ['#5a4630', '#7a6444', '#a28a5c', '#c4ac78', '#dcc896'];
  F(g, 8, 70, 28, 3, MAD2[1]); F(g, 8, 70, 28, 1, MAD2[3]); F(g, 18, 66, 8, 4, MAD2[2]); F(g, 18, 66, 8, 1, MAD2[4]);                  // base en cruz
  F(g, 20, 20, 4, 48, MAD2[2]); F(g, 20, 20, 1, 48, MAD2[4]); F(g, 23, 20, 1, 48, MAD2[0]);                                                // poste
  F(g, 6, 28, 32, 4, MAD2[2]); F(g, 6, 28, 32, 1, MAD2[4]); F(g, 6, 31, 32, 1, MAD2[0]);                                                  // brazos
  for (x = 6; x < 36; x += 3) { F(g, x, 27, 2, 6, BU[2]); P(g, x, 27, BU[4]); P(g, x + 1, 32, BU[0]); }                                  // yute en los brazos
  for (y = 32; y < 56; y++) { var hw = 9 - Math.abs(y - 42) * 0.18; for (x = Math.round(22 - hw); x <= Math.round(22 + hw); x++) { var k = (x - (22 - hw)) / (hw * 2); g.set(x, y, k < 0.22 ? BU[4] : (k < 0.6 ? BU[3] : (k < 0.86 ? BU[2] : BU[1]))); } }   // torso de paja envuelto
  for (y = 34; y < 56; y += 4) F(g, 13, y, 18, 1, BU[0]);
  for (x = 14; x < 30; x += 3) for (y = 33; y < 55; y += 5) P(g, x, y + (x % 2), BU[1]);
  DISC(g, 22, 44, 6, '#f3efe2'); DISC(g, 22, 44, 4, '#c8202a'); DISC(g, 22, 44, 2, '#f3efe2'); DISC(g, 22, 44, 1, '#c8202a');                 // diana
  DISC(g, 22, 15, 6, BU[3]); DISC(g, 21, 14, 3, BU[4]); F(g, 16, 19, 12, 1, BU[1]);                                                         // cabeza de costal
  F(g, 18, 14, 2, 2, K); F(g, 24, 14, 2, 2, K); F(g, 19, 19, 6, 1, K); P(g, 19, 18, K); P(g, 24, 18, K); F(g, 21, 15, 2, 3, BU[1]);       // cara cosida
  F(g, 14, 9, 16, 3, '#7a1a1a'); F(g, 16, 5, 12, 5, '#a02a2a'); F(g, 16, 5, 12, 1, '#c8503a'); F(g, 14, 11, 16, 1, '#4a0a0a');             // sombrerito rojo
  for (x = 8; x < 36; x += 5) { P(g, x, 33, BU[0]); P(g, x + 2, 45, BU[0]); }
  outline(g, K, '#8a7a5a');
  contact(g, 22, 72, 15, 2.2, '#2a244070');
  return g;
}
function munecoPractica() {
  var base = munecoBase(), fr = [base, leanG(base, -4), leanG(base, 4)].map(function (g, i) { return mk(g, 22, 72, 30, 8, { cast: { len: 0.3, a: 0.18 }, p: { tall: true } }); });
  var c = fr[0]; c.frames = fr; c.fps = 6; c.hitFrames = [1, 2];
  var k = munecoBase();
  var kg = new G(76, 44), x, y; for (y = 0; y < 74; y++) for (x = 0; x < 44; x++) { var cc = k.get(x, y); if (cc) kg.set(y + 1, x, cc); }
  contact(kg, 38, 42, 34, 2, '#2a244070');
  c.broken = mk(kg, 38, 42, 66, 12, { cast: { len: 0.15, a: 0.12 } });
  return c;
}
function carritoAnticuchos(mode) {                       // mode: 0 normal, 1 noche, 2 roto
  var W = 96, H = 96, ax = 48, ay = 88, g = new G(W, H), i, x, y, night = mode === 1, r = rng(6600);
  var WD = MAD2, ML = ramp('#8a5a3a');
  if (mode === 2) {                                        // volcado
    F(g, 8, 66, 62, 18, WD[2]); F(g, 8, 66, 62, 2, WD[4]); F(g, 8, 82, 62, 2, WD[0]); for (x = 12; x < 68; x += 8) F(g, x, 68, 1, 14, WD[1]);
    F(g, 66, 62, 14, 22, WD[1]); F(g, 66, 62, 2, 22, WD[3]);
    DISC(g, 20, 86, 6, WD[0]); DISC(g, 20, 86, 5, WD[1]); DISC(g, 20, 86, 1, IR[3]); for (i = 0; i < 4; i++) { var a = i * Math.PI / 4; LN(g, 20 - Math.cos(a) * 5, 86 - Math.sin(a) * 5, 20 + Math.cos(a) * 5, 86 + Math.sin(a) * 5, WD[3]); }
    ELL(g, 54, 84, 16, 4, IR[2]); ELL(g, 54, 83, 14, 3, '#5a5a62'); F(g, 40, 80, 28, 2, '#3a3a42');
    for (i = 0; i < 26; i++) { x = 30 + Math.floor(r() * 56); y = 78 + Math.floor(r() * 12); P(g, x, y, i % 4 === 0 ? '#e8602a' : (i % 4 === 1 ? '#2a2a30' : '#8a8a92')); }
    for (i = 0; i < 5; i++) { x = 4 + Math.floor(r() * 24); LN(g, x + 40, 72, x + 52, 86, '#8a5a3a'); F(g, x + 46, 78, 4, 3, '#6a3a22'); }
    F(g, 10, 54, 3, 22, WD[3]);
    outline(g, K, '#6a5a50'); contact(g, 48, 90, 40, 3, '#2a244070');
    return mk(g, ax, ay, 70, 24, { cast: { len: 0.15, a: 0.14 } });
  }
  // patas y ruedas
  F(g, 12, 72, 3, 16, WD[1]); F(g, 80, 72, 3, 16, WD[1]);
  [18, 76].forEach(function (cx) { DISC(g, cx, 82, 7, K); DISC(g, cx, 82, 6, WD[1]); DISC(g, cx, 82, 5, WD[2]); DISC(g, cx, 82, 1, IR[3]); for (var k = 0; k < 8; k++) { var a = k * Math.PI / 4; LN(g, cx, 82, cx + Math.cos(a) * 5, 82 + Math.sin(a) * 5, WD[0]); } });
  // mostrador
  F(g, 6, 52, 84, 26, WD[2]); F(g, 6, 52, 84, 2, WD[4]); F(g, 6, 77, 84, 2, WD[0]); F(g, 6, 52, 3, 26, WD[3]); F(g, 87, 52, 3, 26, WD[1]);
  for (y = 56; y < 76; y += 5) F(g, 9, y, 78, 1, WD[1]);
  F(g, 38, 58, 20, 14, '#e8e0cc'); F(g, 38, 58, 20, 1, '#fff'); F(g, 38, 71, 20, 1, '#a8a290'); px.text(g, 'S/', 48, 61, { font: 'a7', ink: '#7a1a1a', align: 'c' });
  F(g, 12, 60, 18, 10, '#2f5a3a'); F(g, 12, 60, 18, 1, '#4f8a5a'); F(g, 66, 60, 18, 10, '#a8381f'); F(g, 66, 60, 18, 1, '#d0603a');      // cajitas pintadas
  // parrilla con brasas y anticuchos
  F(g, 10, 46, 76, 7, IR[1]); F(g, 10, 46, 76, 1, IR[4]); F(g, 12, 47, 72, 4, night ? '#ff6a1a' : '#b8401a');
  for (x = 14; x < 84; x += 4) { P(g, x, 48, night ? '#ffe070' : '#ff8a3a'); P(g, x + 1, 49, night ? '#ff8a2a' : '#e8602a'); }
  for (x = 12; x < 82; x += 7) { F(g, x, 41, 5, 3, '#5a2a14'); F(g, x + 1, 41, 3, 1, '#8a4a22'); F(g, x - 1, 44, 7, 1, '#c8a878'); P(g, x + 2, 40, '#7a3a1c'); }
  for (i = 0; i < 5; i++) { P(g, 18 + i * 14 + (i % 2), 36 - (i % 3) * 3, '#a8a8b0'); P(g, 19 + i * 14, 33 - (i % 2) * 3, '#c8c8d0'); P(g, 18 + i * 14, 30 - (i % 3), '#d8d8e0'); }          // humo
  // sombrilla / toldo con el letrero a mano
  F(g, 8, 2, 80, 3, '#2a1a14'); for (x = 8; x < 88; x++) { var col = ((x >> 3) & 1) ? '#c8553a' : '#f3e8cf'; for (y = 5; y < 15; y++) g.set(x, y, y > 12 ? dk(col, 0.25) : col); if (((x >> 3) & 1) === 0) P(g, x, 15, '#c8553a'); else P(g, x, 15, '#f3e8cf'); }
  F(g, 8, 5, 80, 1, '#fff0d8');
  F(g, 12, 15, 2, 28, WD[1]); F(g, 82, 15, 2, 28, WD[1]);
  F(g, 20, 17, 56, 10, '#2a1a14'); F(g, 21, 18, 54, 8, '#7a1a1a'); F(g, 21, 18, 54, 1, '#a83a2a');
  px.text(g, 'ANTICUCHOS', 48, 19, { font: 'a5', ink: night ? '#fff0b0' : '#f3efe2', shadow: '#2a0a0a', align: 'c' });
  if (night) { for (x = 18; x < 80; x += 9) { P(g, x, 29, '#fff0b0'); P(g, x, 30, '#ffd860'); } }
  outline(g, K, '#6a5a50'); contact(g, 48, 88, 40, 3, '#2a244070');
  var c = mk(g, ax, ay, 84, 16, { cast: { len: 0.3, a: 0.18 }, p: { tall: true, breakable: true } });
  c.emit = [{ x: 0, y: -42, kind: 'brasa', r: 7, col: '#ff7a1e' }, { x: -24, y: -42, kind: 'brasa', r: 5, col: '#ff7a1e' }, { x: 24, y: -42, kind: 'brasa', r: 5, col: '#ff7a1e' }];
  return c;
}
function bakeMobiliario() {
  L.farolBR = farolBR(false); L.farolBR.dark = farolBR(true);
  L.bancaBR = bancaBR();
  L.basureroBR = basureroBR(false); L.basureroBR.broken = basureroBR(true);
  L.cajaCervezas = cajaCervezas(false); L.cajaCervezas.broken = cajaCervezas(true);
  L.munecoPractica = munecoPractica();
  L.carritoAnticuchos = carritoAnticuchos(0); L.carritoAnticuchos.noche = carritoAnticuchos(1); L.carritoAnticuchos.broken = carritoAnticuchos(2);
  L.carritoAnticuchos.noche.emit = L.carritoAnticuchos.emit;
}

/* ============================ PLANTAS: palmeras, ficus, buganvilias, pergola ============================ */
function blob(g, cx, cy, r, A, tone) {                           // racimo de follaje con luz arriba-izquierda (tone 0..2 = mas claro)
  tone = tone || 0;
  var c1 = A[Math.min(4, 1 + (tone > 1 ? 1 : 0))], c2 = A[Math.min(4, 2 + (tone > 0 ? 1 : 0))], c3 = A[Math.min(4, 3 + (tone > 1 ? 1 : 0))];
  DISC(g, cx, cy, r, c1);
  DISC(g, cx - 1, cy - 1.5, Math.max(1, r - 1.6), c2);
  if (r > 3) DISC(g, cx - 2, cy - 2.6, Math.max(1, r - 3.4), c3);
  if (r > 5 && A[4]) { P(g, cx - 3, cy - 4, A[4]); P(g, cx - 2, cy - 5, A[4]); P(g, cx - 4, cy - 3, A[4]); P(g, cx - 3, cy - 3, A[4]); P(g, cx - 1, cy - 5, A[4]); }
  if (r > 4) { P(g, cx + r - 2, cy + 1, A[0]); P(g, cx + r - 3, cy + 3, A[0]); P(g, cx + 1, cy + r - 2, A[0]); P(g, cx + 2, cy + r - 2, A[0]); }
}
function canopy(g, cx, cy, rx, ry, A, seed, n, rmin, rmax) {
  var r = rng(seed), pts = [], i;
  for (i = 0; i < n; i++) {
    var a = r() * 6.2832, d = Math.sqrt(r()), yy = cy + Math.sin(a) * ry * d;
    pts.push({ x: cx + Math.cos(a) * rx * d, y: yy, r: rmin + r() * (rmax - rmin), t: yy < cy - ry * 0.25 ? 2 : (yy < cy + ry * 0.2 ? 1 : 0) });
  }
  pts.sort(function (p, q) { return p.y - q.y; });
  for (i = 0; i < pts.length; i++) DISC(g, Math.round(pts[i].x), Math.round(pts[i].y), Math.round(pts[i].r) + 1, A[0]);        // silueta oscura detras
  for (i = 0; i < pts.length; i++) blob(g, Math.round(pts[i].x), Math.round(pts[i].y), Math.round(pts[i].r), A, pts[i].t);
}
function palmaG(kind) {
  var W = 128, H = 160, ax = 64, ay = 152, g = new G(W, H), r = rng(7700 + kind * 13), i, x, y;
  var cx = 64 + (kind ? 2 : -3), cy = kind ? 34 : 46, tw0 = kind ? 6 : 10, tw1 = kind ? 4 : 7;
  var TR = kind ? ['#4a4036', '#6a5e4a', '#8a7a5e', '#a8967a', '#c4b296'] : ['#5a4a38', '#7a6648', '#9a8460', '#b89e72', '#d0b886'];
  for (y = cy; y <= ay; y++) {
    var t = (y - cy) / (ay - cy), w = Math.round(tw1 + (tw0 - tw1) * t), xc = Math.round(cx + (64 - cx) * t + Math.sin(t * 3) * (kind ? 1.4 : 0.8));
    for (x = xc - (w >> 1); x < xc - (w >> 1) + w; x++) {
      var k = (x - (xc - (w >> 1))) / w, c = k < 0.2 ? TR[3] : (k < 0.5 ? TR[2] : (k < 0.8 ? TR[1] : TR[0]));
      if (kind === 0) { if ((y + (x - xc) + 400) % 7 === 0 || (y - (x - xc) + 400) % 7 === 0) c = k < 0.5 ? TR[1] : TR[0]; }
      else { if (y % 6 === 0) c = TR[0]; else if (y % 6 === 1) c = TR[3]; }
      g.set(x, y, c);
    }
  }
  F(g, 64 - tw0 / 2 - 2, ay - 2, tw0 + 4, 3, TR[1]); F(g, 64 - tw0 / 2 - 2, ay - 2, tw0 + 4, 1, TR[3]);
  var PG = ['#173826', '#245a34', '#34803f', '#52a24c', '#82c262'];
  if (kind === 1) { for (i = 0; i < 9; i++) { var ya = cy + 6 + i * 3; LN(g, cx - 3, ya, cx - 8 - (i % 2), ya + 8, '#7a6a3a'); LN(g, cx + 3, ya, cx + 8 + (i % 2), ya + 8, '#6a5a2e'); } }       // falda de hojas secas
  var N = kind ? 11 : 13, fronds = [];
  for (i = 0; i < N; i++) {
    var a = -Math.PI * (0.02 + 0.96 * i / (N - 1)) + (r() - 0.5) * 0.15; var len = (kind ? 52 : 56) * (0.85 + r() * 0.3), up = -Math.sin(a);
    fronds.push({ a: a, len: len, droop: 10 + r() * 10 + (1 - up) * 34, shade: r() });
  }
  fronds.push({ a: 0.35, len: 34, droop: 18, shade: 0.3 }, { a: Math.PI - 0.35, len: 34, droop: 18, shade: 0.4 }, { a: 0.9, len: 26, droop: 14, shade: 0.2 }, { a: Math.PI - 0.9, len: 26, droop: 14, shade: 0.5 });
  fronds.sort(function (p, q) { return Math.sin(p.a) - Math.sin(q.a); });
  fronds.forEach(function (f) {
    var steps = 40, px_ = cx, py_ = cy, up = -Math.sin(f.a);
    for (var s = 1; s <= steps; s++) {
      var t = s / steps, X = cx + Math.cos(f.a) * f.len * t, Y = cy + Math.sin(f.a) * f.len * t * 0.8 + f.droop * t * t;
      var dx = X - px_, dy = Y - py_, ll = Math.hypot(dx, dy) || 1, nx = -dy / ll, ny = dx / ll, tx = dx / ll, ty = dy / ll;
      var lw = Math.round(6.5 * Math.sin(Math.min(1, t * 1.1) * Math.PI) + 1.5 - t * 1.5);
      var col = f.shade < 0.33 ? PG[2] : (f.shade < 0.66 ? PG[3] : PG[1]);
      if (up > 0.3 && f.shade > 0.4) col = PG[3];
      for (var sd = -1; sd <= 1; sd += 2) {
        var lx = X + nx * lw * sd + tx * lw * 0.5, ly = Y + ny * lw * sd + ty * lw * 0.5 + lw * 0.45;
        var cc = (sd * nx < 0 || (s % 2 === 0)) ? col : dk(col, 0.22);
        LN(g, X, Y, lx, ly, cc); LN(g, X + 1, Y, lx + 1, ly, cc);
        if (s % 4 === 0) P(g, lx, ly, PG[4]);
      }
      P(g, X, Y, PG[0]); P(g, X + 1, Y, PG[0]);
      px_ = X; py_ = Y;
    }
  });
  DISC(g, cx, cy + 1, 5, PG[0]); DISC(g, cx - 1, cy, 4, PG[1]);
  if (kind === 0) { DISC(g, cx, cy + 2, 4, '#6a5a2a'); DISC(g, cx - 1, cy + 1, 3, '#a89048'); for (i = 0; i < 5; i++) { LN(g, cx - 4 + i * 2, cy + 3, cx - 5 + i * 2.6, cy + 9, '#d4a838'); } }    // racimo de datiles
  outline(g, K, null);
  contact(g, 64, ay + 1, 9, 2.4, '#2a244070');
  return mk(g, ax, ay, 8, 6, { cast: { len: 0.35, a: 0.18 }, p: { tall: true, tree: true, canopy: { x: -50, y: -118, w: 100, h: 60 } } });
}
function ficusG(v) {
  var W = 136, H = 128, ax = 68, ay = 120, g = new G(W, H), r = rng(7900 + v * 17), i, x, y;
  var A = v ? ['#1d4228', '#2b5f34', '#3b7d40', '#58a04c', '#8cc462'] : FOL;
  var BK = ['#2a2420', '#4a3e34', '#6a5a4c', '#8a7a68'];
  // tronco con contrafuertes
  for (y = 66; y < 118; y++) { var t = (y - 66) / 52, w = Math.round(9 + t * 9 + (y > 104 ? (y - 104) * 1.2 : 0)); for (x = 68 - Math.floor(w / 2); x < 68 + Math.ceil(w / 2); x++) { var k = (x - (68 - w / 2)) / w; g.set(x, y, k < 0.25 ? BK[3] : (k < 0.6 ? BK[2] : (k < 0.85 ? BK[1] : BK[0]))); } }
  for (i = 0; i < 6; i++) { var yy = 72 + i * 7; LN(g, 62 + (i % 2) * 3, yy, 64 + (i % 3) * 2, yy + 6, BK[0]); }
  LN(g, 60, 110, 46, 118, BK[1]); LN(g, 76, 110, 92, 118, BK[0]); LN(g, 62, 112, 54, 119, BK[2]); LN(g, 74, 112, 80, 119, BK[1]); F(g, 46, 118, 48, 2, BK[1]);
  var cw = v ? 40 : 48, ch = v ? 30 : 32;
  canopy(g, 68, 54, cw, ch, A, 313 + v, v ? 46 : 58, v ? 8 : 9, v ? 14 : 16);
  for (i = 0; i < 30; i++) { var a = r() * 6.28, d = Math.sqrt(r()); P(g, 68 - 6 + Math.cos(a) * cw * d * 0.9, 44 + Math.sin(a) * ch * d * 0.7, A[4]); }
  outline(g, K, null);
  contact(g, 68, 120, 22, 3, '#2a244070');
  return mk(g, ax, ay, 22, 10, { cast: { len: 0.35, a: 0.2 }, p: { tall: true, tree: true, canopy: { x: -cw, y: -ay + 8, w: cw * 2, h: 70 } } });
}
function bugG(v) {                                               // buganvilia que cuelga sobre un muro: v 0 magenta, 1 fucsia, 2 morada
  var W = 72, H = 62, ax = 36, ay = 56, g = new G(W, H), r = rng(8100 + v * 11), i, x, y;
  var FL = [BUG, [BUG[1], BUG[2], BUG[3], BUG[4], '#ffc0d4'], BUGM][v] || BUG;
  var cols = v === 2 ? [BUGM[2], BUGM[3], BUGM[4]] : [FL[2], FL[3], FL[4]];
  canopy(g, 36, 14, 32, 9, FOL, 4000 + v, 22, 5, 9);
  for (i = 0; i < 7; i++) {                                         // cortinas colgantes
    var sx = 8 + i * 9 + Math.floor(r() * 4), len = 18 + Math.floor(r() * 30);
    for (y = 14; y < 14 + len; y++) {
      var wob = Math.round(Math.sin(y * 0.3 + i) * 1.4), w = 4 - Math.floor((y - 14) / (len / 3.2));
      for (x = sx + wob - 1; x <= sx + wob + Math.max(1, w); x++) g.set(x, y, hash2(x, y, 9 + v) < 0.35 ? FOL[3] : (x === sx + wob - 1 ? FOL[1] : FOL[2]));
    }
  }
  for (i = 0; i < 300; i++) {                                       // flores (bracteas)
    var a = r() * 6.28, d = Math.sqrt(r()), fx = 36 + Math.cos(a) * 33 * d, fy = 12 + Math.sin(a) * 11 * d;
    if (r() < 0.45) { fx = 8 + Math.floor(r() * 7) * 9 + Math.floor(r() * 5); fy = 16 + r() * 30; }
    var c = cols[(r() * 3) | 0]; var s2 = r() < 0.4;
    P(g, fx, fy, c); P(g, fx + 1, fy, c); if (s2) { P(g, fx, fy + 1, dk(c, 0.2)); P(g, fx + 1, fy - 1, lt(c, 0.25)); }
  }
  outline(g, K, null);
  return mk(g, ax, ay, 40, 6, { p: { tall: true } });
}
function pergolaG() {
  var W = 112, H = 96, ax = 56, ay = 90, g = new G(W, H), i, x, y, r = rng(8500);
  [10, 100].forEach(function (px_) { shaft(g, px_ - 2, 30, 88, 5, MAD2); F(g, px_ - 3, 88, 7, 2, CC[2]); F(g, px_ - 3, 88, 7, 1, CC[4]); });                    // postes delanteros
  [[22, 32], [90, 32]].forEach(function (p) { shaft(g, p[0], 22, 72, 3, MAD2.map(function (c) { return dk(c, 0.3); })); });                                       // postes traseros
  F(g, 4, 24, 104, 5, MAD2[3]); F(g, 4, 24, 104, 1, MAD2[4]); F(g, 4, 28, 104, 1, MAD2[0]);                                                                      // viga delantera
  for (i = 0; i < 12; i++) { x = 8 + i * 8.6; F(g, x, 12, 3, 13, MAD2[2]); F(g, x, 12, 1, 13, MAD2[4]); F(g, x + 2, 12, 1, 13, MAD2[0]); }                       // vigas transversales
  F(g, 6, 12, 100, 3, MAD2[2]); F(g, 6, 12, 100, 1, MAD2[4]);
  for (i = 0; i < 40; i++) { x = 8 + r() * 96; y = 8 + r() * 20; blob(g, Math.round(x), Math.round(y), 3 + Math.floor(r() * 3), FOL); }                     // hojas
  var cols = [BUG[2], BUG[3], BUG[4]];
  for (i = 0; i < 160; i++) { x = 6 + r() * 100; y = 6 + r() * 24; P(g, x, y, cols[(r() * 3) | 0]); P(g, x + 1, y, cols[(r() * 3) | 0]); }
  for (i = 0; i < 6; i++) { var sx = 12 + i * 17 + Math.floor(r() * 5), len = 12 + Math.floor(r() * 22); for (y = 24; y < 24 + len; y++) { P(g, sx, y, hash2(sx, y, 3) < 0.35 ? FOL[3] : FOL[2]); if (y % 3 === 0) P(g, sx + 1, y, cols[(y / 3 | 0) % 3]); if (y % 4 === 0) P(g, sx - 1, y, FOL[1]); } }
  outline(g, K, null); contact(g, 56, 90, 48, 3, '#2a244050');
  return mk(g, ax, ay, 92, 12, { cast: { len: 0.25, a: 0.14 }, p: { tall: true, tree: true, canopy: { x: -50, y: -82, w: 102, h: 34 } } });
}
function bakePlantas() {
  L.palmeraBR = [0, 1].map(palmaG);
  L.ficusBR = [0, 1].map(ficusG);
  L.buganvilia = [0, 1, 2].map(bugG);
  L.pergola = pergolaG();
}

/* ============================ BAJADA: muros pastel, casitas ============================ */
function muroG(v) {                                          // segmento de muro de 32 px (se repite sin costura), cara 40 px + cornisa
  var W = 32, H = 54, g = new G(W, H), r = rng(9100 + v * 7), i, x, y;
  var base = [PST.crema, PST.salmon, PST.agua, PST.mostaza, PST.celeste, PST.rosa, PST.crema, '#a5583f'][v], A = ramp(base);
  var cap = v === 7 ? ramp('#c8b898') : ramp('#e8e0cc');
  for (y = 3; y < 53; y++) for (x = 0; x < W; x++) g.set(x, y, A[2]);
  F(g, 0, 3, W, 2, A[3]);                                                                // debajo de la cornisa: sombra suave
  AO(g, 0, 11, W, 2, 0.28); AO(g, 0, 13, W, 2, 0.12);
  for (x = 0; x < W; x++) { F(g, x, 4, 1, 2, cap[2]); }
  F(g, 0, 0, W, 3, cap[4]); F(g, 0, 3, W, 5, cap[3]); F(g, 0, 7, W, 1, cap[1]); F(g, 0, 3, W, 1, cap[2]);                                // cornisa
  for (i = 0; i < W; i += 8) { F(g, i + 1, 3, 4, 2, cap[4]); }
  // zocalo
  F(g, 0, 40, W, 12, dk(base, 0.2)); F(g, 0, 40, W, 1, lt(base, 0.12)); F(g, 0, 41, W, 1, A[1]);
  if (v === 7) { for (y = 10; y < 40; y += 4) { F(g, 0, y, W, 3, mx(base, '#d89a6a', 0.0)); F(g, 0, y + 3, W, 1, '#4a2218'); for (x = ((y / 4) % 2) * 4; x < W; x += 8) F(g, x, y, 1, 3, '#4a2218'); } for (i = 0; i < 20; i++) P(g, r() * W, 10 + r() * 30, i % 2 ? '#bd7050' : '#80402e'); }
  // desconchados que dejan ver el adobe, manchas de humedad en vertical
  for (i = 0; i < (v === 7 ? 0 : 5); i++) {
    x = Math.floor(r() * 26); y = 14 + Math.floor(r() * 24); var w = 3 + Math.floor(r() * 7), h = 2 + Math.floor(r() * 5);
    F(g, x, y, w, h, mx(base, '#a58a6a', 0.55)); F(g, x, y, w, 1, mx(base, '#c8b090', 0.5)); F(g, x + 1, y + 1, w - 2, h - 2, mx(base, '#8a6a4a', 0.5)); if (r() < 0.6) { F(g, x + 1, y + 1, 2, 1, '#a5583f'); P(g, x + 3, y + 2, '#80402e'); }
  }
  for (i = 0; i < 4; i++) { x = Math.floor(r() * W); F(g, x, 10, 1, 14 + Math.floor(r() * 24), dk(base, 0.14)); }
  for (i = 0; i < 40; i++) P(g, r() * W, 8 + r() * 32, r() < 0.5 ? lt(base, 0.14) : dk(base, 0.14));
  if (v === 6) {                                                                          // portón de madera con arco
    F(g, 7, 16, 18, 36, '#efe8d4'); DISC(g, 16, 22, 9, '#efe8d4');
    F(g, 9, 19, 14, 33, MAD2[1]); DISC(g, 16, 22, 7, MAD2[1]);
    for (x = 9; x < 23; x += 3) F(g, x, 14, 1, 38, MAD2[2]); F(g, 16, 14, 1, 38, MAD2[0]); F(g, 9, 34, 14, 1, MAD2[0]);
    F(g, 12, 36, 2, 2, '#e6c85a'); F(g, 18, 36, 2, 2, '#e6c85a'); F(g, 7, 51, 18, 1, A[0]);
  }
  if (v === 2) {                                                                          // ventanita con reja
    F(g, 11, 20, 11, 12, '#efe8d4'); F(g, 12, 21, 9, 10, '#2a3a46'); for (x = 13; x < 21; x += 2) F(g, x, 21, 1, 10, IR[1]); F(g, 11, 32, 11, 2, '#c8b898');
  }
  F(g, 0, 52, W, 2, A[0]);
  for (x = 0; x < W; x++) { P(g, x, 53, mx(base, SH, 0.7)); }
  for (x = 0; x < W; x++) { var c0 = g.get(x, 0); if (c0) { /* contorno superior */ } }
  for (x = 0; x < W; x++) P(g, x, -1, K);
  // contorno solo arriba (los lados quedan abiertos para repetir sin costura)
  for (x = 0; x < W; x++) { if (g.get(x, 0)) g.set(x, 0, K); }
  F(g, 0, 0, W, 1, K);
  return mk(g, 16, 52, 32, 8, { p: { tileable: true, solid: true, tall: false } });
}
function casitaG(v, night) {
  var W = 100, H = 112, ax = 50, ay = 106, g = new G(W, H), r = rng(9300 + v * 19), i, x, y;
  var wall = [PST.salmon, PST.agua, PST.mostaza][v], WA = ramp(wall), RT = v === 0 ? ramp('#b4603e') : ramp(v === 1 ? '#8a5a48' : '#7a7a7e');
  var floors = v === 1 ? 1 : 2, wx0 = 10, wx1 = 90, wy1 = 104, fh = 32, wy0 = wy1 - floors * fh - (v === 2 ? -8 : 0);
  if (v === 2) { wy0 = wy1 - 56; }
  // pared
  F(g, wx0, wy0, wx1 - wx0, wy1 - wy0, wall);
  F(g, wx0, wy0, 3, wy1 - wy0, WA[3]); F(g, wx1 - 3, wy0, 3, wy1 - wy0, WA[1]); F(g, wx0, wy1 - 1, wx1 - wx0, 1, WA[0]);
  F(g, wx0, wy1 - 9, wx1 - wx0, 9, dk(wall, 0.2)); F(g, wx0, wy1 - 9, wx1 - wx0, 1, lt(wall, 0.1));
  speck(g, wx0, wy0, wx1 - wx0, wy1 - wy0, r, 70, [WA[3], WA[1], mx(wall, '#d8d0b8', 0.5)]);
  for (i = 0; i < 6; i++) { x = wx0 + 4 + r() * 64; y = wy0 + 6 + r() * 40; var w = 4 + Math.floor(r() * 8), h = 3 + Math.floor(r() * 5); F(g, x, y, w, h, mx(wall, '#a58a6a', 0.5)); F(g, x + 1, y + 1, w - 2, h - 2, mx(wall, '#8a6a4a', 0.55)); P(g, x + 2, y + 2, '#a5583f'); }
  if (floors === 2) { F(g, wx0, wy0 + fh, wx1 - wx0, 2, WA[3]); F(g, wx0, wy0 + fh + 2, wx1 - wx0, 1, WA[0]); }
  // techo
  var ry0 = wy0 - 24;
  if (v === 0) { for (y = ry0; y < wy0; y++) { var t = (y - ry0) / 24, hw = Math.round(34 + t * 16); F(g, 50 - hw, y, hw * 2, 1, ((y - ry0) % 4 === 0) ? RT[3] : RT[2]); for (x = 50 - hw + ((y - ry0) % 8 === 0 ? 0 : 3); x < 50 + hw; x += 6) P(g, x, y, RT[1]); } F(g, 4, wy0, 92, 2, RT[0]); F(g, 4, wy0 - 1, 92, 1, RT[4]); }
  else { for (y = ry0; y < wy0; y++) { var t2 = (y - ry0) / 24, hw2 = Math.round(34 + t2 * 16); corru(g, 50 - hw2, y, hw2 * 2, 1, RT, y); } F(g, 4, wy0, 92, 2, RT[0]); F(g, 4, wy0 - 1, 92, 1, RT[4]); }
  F(g, 50 - 28, ry0 - 1, 56, 1, RT[4]);
  if (v === 2) { F(g, 66, ry0 - 12, 8, 14, '#a5583f'); F(g, 66, ry0 - 12, 8, 2, '#d28d68'); F(g, 66, ry0 - 12, 1, 14, '#bd7050'); }
  // ventanas y puerta
  var shut = v === 0 ? '#3f7a4a' : (v === 1 ? '#b4503a' : '#3f5f8a');
  if (floors === 2) { winBR(g, 20, wy0 + 8, 11, 14, night, shut, '#f3ead2'); winBR(g, 70, wy0 + 8, 11, 14, night, shut, '#f3ead2'); }
  var gy = wy1 - 26;
  winBR(g, 20, gy, 11, 13, night, shut, '#f3ead2'); winBR(g, 70, gy, 11, 13, night, shut, '#f3ead2');
  for (x = 21; x < 30; x += 2) F(g, x, gy + 1, 1, 12, IR[1]); for (x = 71; x < 80; x += 2) F(g, x, gy + 1, 1, 12, IR[1]);
  F(g, 41, wy1 - 32, 20, 32, '#f3ead2'); DISC(g, 51, wy1 - 25, 9, '#f3ead2');
  F(g, 43, wy1 - 30, 16, 29, night ? '#ffcf7a' : MAD2[1]); DISC(g, 51, wy1 - 25, 7, night ? '#ffcf7a' : MAD2[1]);
  if (!night) { for (x = 43; x < 59; x += 3) F(g, x, wy1 - 33, 1, 33, MAD2[2]); F(g, 51, wy1 - 33, 1, 33, MAD2[0]); F(g, 47, wy1 - 14, 2, 2, '#e6c85a'); F(g, 54, wy1 - 14, 2, 2, '#e6c85a'); }
  else { F(g, 43, wy1 - 30, 16, 1, '#fff0b0'); F(g, 50, wy1 - 30, 2, 29, MAD2[1]); }
  F(g, 38, wy1 - 2, 26, 2, '#cfc5ae');
  // balcon de cajon (v0, v2): madera proyectada
  if (v === 0 || v === 2) {
    var bx = 34, bw = 32, by = wy0 + 6;
    F(g, bx - 2, by - 3, bw + 4, 3, '#a8573a'); F(g, bx - 2, by - 3, bw + 4, 1, '#c98a5a');
    F(g, bx, by, bw, 24, MAD2[2]); F(g, bx, by, bw, 1, MAD2[4]); F(g, bx, by, 2, 24, MAD2[3]); F(g, bx + bw - 2, by, 2, 24, MAD2[1]);
    for (x = bx + 3; x < bx + bw - 3; x += 9) { F(g, x, by + 3, 7, 11, night ? '#ffcf7a' : '#2a3a46'); if (!night) F(g, x, by + 3, 7, 1, '#4d6676'); F(g, x + 3, by + 3, 1, 11, MAD2[0]); }
    for (x = bx + 2; x < bx + bw - 2; x += 3) F(g, x, by + 16, 1, 7, MAD2[0]); F(g, bx, by + 15, bw, 1, MAD2[0]); F(g, bx, by + 24, bw, 2, MAD2[1]); AO(g, bx, by + 26, bw, 3, 0.35);
  }
  if (v === 1) {                                                                          // terraza con barandilla de madera y farolitos
    F(g, 4, wy1 - 12, 92, 2, MAD2[3]); F(g, 4, wy1 - 12, 92, 1, MAD2[4]); for (x = 6; x < 96; x += 6) F(g, x, wy1 - 10, 2, 10, MAD2[2]);
    F(g, 22, wy0 - 12, 56, 12, '#2a1a14'); F(g, 23, wy0 - 11, 54, 10, '#c8402a'); px.text(g, 'BAJADA', 50, wy0 - 9, { font: 'a7', ink: night ? '#fff0b0' : '#f3efe2', align: 'c' });
    for (x = 8; x < 94; x += 10) { P(g, x, wy0 + 3, night ? '#fff0b0' : '#d8d2b0'); P(g, x, wy0 + 4, night ? '#ffd860' : '#a8a08a'); }
  }
  // maceteros y buganvilia de la esquina
  F(g, 4, wy1 - 10, 8, 10, '#a5583f'); F(g, 4, wy1 - 10, 8, 2, '#d28d68'); blob(g, 8, wy1 - 16, 6, FOL); [[6, wy1 - 18], [9, wy1 - 16], [7, wy1 - 14]].forEach(function (p) { P(g, p[0], p[1], BUG[3]); P(g, p[0] + 1, p[1], BUG[4]); });
  canopy(g, 88, wy0 + 6, 10, 14, FOL, 12 + v, 9, 4, 7);
  for (i = 0; i < 26; i++) P(g, 80 + r() * 18, wy0 - 6 + r() * 24, [BUG[2], BUG[3], BUG[4]][(r() * 3) | 0]);
  outline(g, K, '#6a5a50'); contact(g, 50, ay + 1, 44, 3, '#2a244070');
  var emit = night ? [{ x: -30, y: -(wy1 - gy - 6), kind: 'ventana', r: 8, col: '#ffb45a' }, { x: 30, y: -(wy1 - gy - 6), kind: 'ventana', r: 8, col: '#ffb45a' }, { x: 0, y: -22, kind: 'ventana', r: 9, col: '#ffc060' }].concat(floors === 2 ? [{ x: 0, y: -(wy1 - wy0 - 14), kind: 'ventana', r: 9, col: '#ffb45a' }] : []) : null;
  var c = mk(g, ax, ay, 84, 16, { cast: { len: 0.3, a: 0.2 }, p: { tall: true } });
  if (emit) c.emit = emit;
  return c;
}
function bakeBajada() {
  L.muroBajada = [0, 1, 2, 3, 4, 5, 6, 7].map(muroG);
  L.casitaBajada = [0, 1, 2].map(function (v) { var c = casitaG(v, false), n = casitaG(v, true); c.noche = n; c.emit = n.emit; return c; });
}

/* ============================ PUENTE DE LOS SUSPIROS ============================
 * Pasarela de madera rojiza E-O, modular de 16 px (1 m): piso (capa air), baranda sur, baranda norte, farol, pilar, sombra. armar(n) junta n tramos.
 * Altura real 8,5 m sobre la bajada: el pilar mide ~104 px (comprimido). Madera #8A4B32 / claros #B9714A / sombras #4F2A1E (investigacion 2.4). */
var PUENTE = { seg: 16, deckH: 40, fascia: 12, pilarH: 104 };
var BRG = ramp('#cfa070');                       // pasamanos mas claros
function puentePiso(seed, seg) {                  // seg 0..3: variantes de tabla; devuelve G de 16 x (40+12)
  var g = new G(16, 52), r = rng(seed), x, y, i;
  for (i = 0; i < 8; i++) {                       // tablas de 5 px (hileras a lo largo del puente) con juntas de tope escalonadas y clavos
    var t = clamp(Math.floor(hash2(i + seg * 8, 7, 55) * 4.2), 0, 3), base = [MAD[2], MAD[3], MAD[2], MAD[4]][t], y0 = i * 5, jx = Math.floor(hash2(i, seg, 17) * 14) + 1;
    base = mx(base, '#d89a62', 0.12);
    for (var k = 0; k < 16; k++) for (var w = 0; w < 5; w++) {
      var c = base, yy = y0 + w;
      if (w === 0) c = lt(base, 0.22); else if (w === 4) c = MAD[0]; else if (w === 3) c = dk(base, 0.14);
      if (hash2(k + seg * 16, yy, 91) < 0.06) c = dk(base, 0.25);
      g.set(k, yy, c);
    }
    for (w = 0; w < 5; w++) g.set(jx, y0 + w, MAD[0]);
    P(g, jx + 1, y0 + 1, IR[3]); P(g, jx - 1 < 0 ? 15 : jx - 1, y0 + 1, IR[3]); P(g, jx + 1, y0 + 3, IR[1]); P(g, jx - 1 < 0 ? 15 : jx - 1, y0 + 3, IR[1]);
  }
  for (y = 0; y < 3; y++) F(g, 0, y, 16, 1, y === 0 ? MAD[0] : dk(MAD[1], 0.15 * y));                                                           // sombra bajo la baranda norte
  if (seg === 2) { F(g, 5, 18, 2, 2, '#c9a870'); P(g, 6, 19, '#a88858'); }                                                                     // parche de pintura vieja
  // fascia frontal: viga y cruces (cercha)
  var fy = PUENTE.deckH;
  F(g, 0, fy, 16, 2, MAD[4]); F(g, 0, fy + 2, 16, PUENTE.fascia - 2, MAD[1]); F(g, 0, fy + PUENTE.fascia - 1, 16, 1, MAD[0]); F(g, 0, fy + 1, 16, 1, MAD[3]);
  LN(g, 0, fy + 2, 15, fy + PUENTE.fascia - 2, MAD[2]); LN(g, 15, fy + 2, 0, fy + PUENTE.fascia - 2, MAD[2]); LN(g, 0, fy + 3, 15, fy + PUENTE.fascia - 1, MAD[0]); LN(g, 15, fy + 3, 0, fy + PUENTE.fascia - 1, MAD[0]);
  F(g, 0, fy + 2, 1, PUENTE.fascia - 2, MAD[3]);
  return g;
}
function puenteBaranda(north) {                   // 16 px: poste a la izquierda, 2 pasamanos, balaustres; north = vista por dentro, mas baja y oscura
  var h = north ? 16 : 22, g = new G(16, h), x, y, c0 = north ? 0.18 : 0;
  var A = BRG.map(function (c) { return c0 ? dk(c, c0) : c; }), M = MAD.map(function (c) { return c0 ? dk(c, c0) : c; });
  F(g, 0, 2, 16, 2, A[3]); F(g, 0, 2, 16, 1, A[4]); F(g, 0, 4, 16, 1, M[0]);                                                  // pasamanos
  F(g, 0, h - 8, 16, 2, M[2]); F(g, 0, h - 8, 16, 1, M[3]);                                                                  // travesano bajo
  for (x = 2; x < 16; x += 3) { F(g, x, 5, 1, h - 13, M[3]); F(g, x + 1, 5, 1, h - 13, M[0]); }                               // balaustres
  F(g, 0, 0, 3, h - 3, M[2]); F(g, 0, 0, 1, h - 3, M[4]); F(g, 2, 0, 1, h - 3, M[0]);                                         // poste
  F(g, 0, 0, 3, 1, A[4]);
  F(g, 0, h - 3, 16, 3, M[1]); F(g, 0, h - 3, 16, 1, M[3]); F(g, 0, h - 1, 16, 1, M[0]);                                    // zocalo
  return g;
}
function farolPuente(night) {
  var W = 28, H = 54, ax = 14, ay = 50, g = new G(W, H), gy = 12, y, i;
  var GL = ['#e8a838', '#ffd96a', '#fff3b8'];
  shaft(g, ax - 1, gy + 14, ay - 6, 3, IR.map(function (c, k) { return k === 0 ? c : lt(c, 0.1); }));
  F(g, ax - 3, ay - 6, 7, 5, IR[2]); F(g, ax - 3, ay - 6, 7, 1, IR[4]); F(g, ax - 4, ay - 1, 9, 2, IR[1]);
  F(g, ax - 3, gy + 14, 7, 2, IR[3]); F(g, ax - 3, gy + 14, 7, 1, IR[4]);
  for (y = gy - 6; y <= gy + 12; y++) {
    var hw = 3 + Math.floor((y - (gy - 6)) / 8);
    for (i = -hw; i <= hw; i++) g.set(ax + i, y, Math.abs(i) >= hw ? IR[1] : (i < -hw + 2 ? GL[2] : (i > hw - 3 ? GL[0] : GL[1])));
  }
  F(g, ax, gy - 6, 1, 19, IR[1]); F(g, ax - 1, gy + 1, 3, 5, '#fffbe0');
  for (y = gy - 12; y < gy - 6; y++) { var h2 = Math.round((y - (gy - 12)) / 6 * 5); F(g, ax - h2, y, h2 * 2 + 1, 1, y < gy - 9 ? IR[3] : IR[2]); }
  P(g, ax, gy - 14, IR[4]); F(g, ax, gy - 13, 1, 2, IR[3]);
  if (!night) { /* LED calido: siempre encendido en el puente (se prende solo a las 6 pm) */ }
  outline(g, K, '#6a6a76');
  return mk(g, ax, ay, 6, 4, { cast: { len: 0.25, a: 0.18 }, p: { tall: true, lamp: { x: 0, y: gy + 2 - ay }, poleKind: 'luz' } });
}
function puentePilar() {
  var W = 56, H = 120, ax = 28, ay = 114, g = new G(W, H), y, x, i;
  var back = MAD.map(function (c) { return dk(c, 0.3); });
  shaft(g, 14, 0, 106, 5, back); shaft(g, 37, 0, 106, 5, back);                                  // postes traseros (mas oscuros)
  LN(g, 16, 6, 39, 102, back[1]); LN(g, 39, 6, 16, 102, back[1]);
  shaft(g, 8, 0, 112, 6, MAD); shaft(g, 42, 0, 112, 6, MAD);                                     // postes delanteros
  F(g, 6, 111, 10, 4, CC[2]); F(g, 6, 111, 10, 1, CC[4]); F(g, 40, 111, 10, 4, CC[2]); F(g, 40, 111, 10, 1, CC[4]); F(g, 6, 114, 10, 1, CC[0]); F(g, 40, 114, 10, 1, CC[0]);
  [30, 62, 92].forEach(function (yy) { F(g, 8, yy, 40, 4, MAD[2]); F(g, 8, yy, 40, 1, MAD[4]); F(g, 8, yy + 3, 40, 1, MAD[0]); });   // travesanos
  LN(g, 14, 33, 42, 62, MAD[3]); LN(g, 42, 33, 14, 62, MAD[3]); LN(g, 14, 34, 42, 63, MAD[0]); LN(g, 42, 34, 14, 63, MAD[0]);
  LN(g, 14, 65, 42, 92, MAD[3]); LN(g, 42, 65, 14, 92, MAD[3]); LN(g, 14, 66, 42, 93, MAD[0]); LN(g, 42, 66, 14, 93, MAD[0]);
  for (i = 0; i < 9; i++) { P(g, 9 + (i % 2) * 3, 8 + i * 12, IR[3]); P(g, 43 + (i % 2) * 3, 12 + i * 12, IR[3]); }
  speck(g, 8, 0, 40, 112, rng(77), 40, [MAD[4], MAD[0], '#6a8a50']);
  outline(g, K, null); contact(g, 28, 114, 24, 2.6, '#2a244070');
  return mk(g, ax, ay, 40, 10, { cast: { len: 0.3, a: 0.2 }, p: { tall: true } });
}
function puenteSombra() {                                                                         // franja de sombra de 16 px (periodica) para el suelo bajo el puente
  var W = 16, H = 64, g = new G(W, H), y, x;
  for (y = 6; y < 58; y++) for (x = 0; x < W; x++) {
    var a = y < 10 || y > 53 ? '28' : '3a';
    var gap = (y > 20 && y < 24 && (x % 4 < 2)) || (y > 34 && y < 37 && (x % 3 === 0));
    g.set(x, y, gap ? '#2a244020' : '#2a2440' + a);
  }
  var c = g.toCanvas(); c.ax = 0; c.ay = 0; c.fw = 16; c.fh = 64; return c;
}
var PU = {};
function bakePuente() {
  var piso = [0, 1, 2, 3].map(function (s) { var c = puentePiso(5500 + s, s).toCanvas(); c.ax = 0; c.ay = 52; c.fw = 16; c.fh = PUENTE.deckH; c.air = true; return c; });
  var pisoT = [0, 1, 2, 3].map(function (s) { var c = pisoTile(s).toCanvas(); c.ax = 0; c.ay = 16; c.fw = 16; c.fh = 16; return c; });
  var bs = puenteBaranda(false).toCanvas(), bn = puenteBaranda(true).toCanvas();
  bs.ax = 0; bs.ay = bs.height; bs.fw = 16; bs.fh = 4; bs.tall = true; bs.solid = true; bs.air = true;
  bn.ax = 0; bn.ay = bn.height; bn.fw = 16; bn.fh = 4; bn.solid = true; bn.air = true;
  var P_ = { seg: 16, deckH: PUENTE.deckH, fascia: PUENTE.fascia, alto: PUENTE.pilarH, piso: pisoT[0], pisos: pisoT, pisoAlto: piso[0], pisosAlto: piso, baranda: bs, barandaN: bn, farol: farolPuente(false), pilar: puentePilar(), sombra: puenteSombra() };
  P_.farol.noche = P_.farol;
  /* armar(n): puente de n tramos (n*16 px de largo) ya juntado en lienzos: {piso, baranda, barandaN, sombra, w, h, faroles:[{x,y}], pilares:[x], deckY, barY...}
     Todo en coordenadas del lienzo; piso: y=0 borde norte de la cubierta, y=52 borde sur de la fascia (ay). baranda sur: pegada en y = 40 - 24 + 4 */
  P_.armar = function (n, o) {
    o = o || {}; n = Math.max(2, n | 0);
    var key = n + (o.faroles === undefined ? 'f' : o.faroles); if (PU[key]) return PU[key];
    var W = n * 16, i, pc = cnv(W, 52), pg = pc.getContext('2d'), bcv = cnv(W, bs.height), bg = bcv.getContext('2d'), ncv = cnv(W, bn.height), ng = ncv.getContext('2d'), sc = cnv(W, 64), sg = sc.getContext('2d');
    for (i = 0; i < n; i++) { pg.drawImage(piso[(i * 7 + (i >> 2)) % 4], i * 16, 0); bg.drawImage(bs, i * 16, 0); ng.drawImage(bn, i * 16, 0); sg.drawImage(P_.sombra, i * 16, 0); }
    // postes de remate en las cabeceras
    var step = o.faroles === undefined ? 6 : o.faroles, faroles = [];
    for (i = step >> 1; i < n; i += step) faroles.push({ x: i * 16 + 1, y: 36 });
    var pilares = []; for (i = 5; i < n - 2; i += 10) pilares.push(i * 16 + 8);
    var res = { w: W, piso: pc, baranda: bcv, barandaN: ncv, sombra: sc, faroles: faroles, pilares: pilares, deckH: PUENTE.deckH, fascia: PUENTE.fascia, pilarH: PUENTE.pilarH, farolSpr: P_.farol, pilarSpr: P_.pilar };
    pc.ax = 0; pc.ay = 52; pc.fw = W; pc.fh = PUENTE.deckH; pc.air = true; bcv.ax = 0; bcv.ay = bs.height; bcv.fw = W; bcv.fh = 4; bcv.tall = true; bcv.air = true; bcv.solid = true;
    ncv.ax = 0; ncv.ay = bn.height; ncv.fw = W; ncv.fh = 4; ncv.air = true; sc.ax = 0; sc.ay = 0; sc.fw = W; sc.fh = 64;
    PU[key] = res; return res;
  };
  L.puente = P_;
}

/* ============================ LA ERMITA (iglesia amarilla de dos torres y cupula; cerrada, gastada, en obra) ============================ */
function ermitaG() {
  var W = 264, H = 224, ax = 132, ay = 212, g = new G(W, H), r = rng(11011), i, x, y;
  var YW = OCR, CL = ['#8a8068', '#aaa088', '#cfc5ae', '#e6dcc4', '#f4ecd6'];                 // cal / revoque gris
  function wall(x0, y0, x1, y1) {                                                           // pared ocre con luz a la izquierda y desconchones
    for (y = y0; y < y1; y++) for (x = x0; x < x1; x++) { var k = (x - x0) / (x1 - x0), c = k < 0.12 ? YW[4] : (k < 0.88 ? YW[3] : YW[2]); g.set(x, y, c); }
    for (i = 0; i < (x1 - x0) * (y1 - y0) / 55; i++) P(g, x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), r() < 0.5 ? YW[4] : YW[2]);
  }
  function patches(x0, y0, x1, y1, n) {
    for (i = 0; i < n; i++) {
      var px_ = x0 + r() * (x1 - x0 - 12), py = y0 + r() * (y1 - y0 - 8), w = 5 + Math.floor(r() * 13), h = 3 + Math.floor(r() * 9);
      for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) { var ex = (xx / w - 0.5) * 2, ey = (yy / h - 0.5) * 2, d = ex * ex + ey * ey + (hash2(xx, yy, i) - 0.5) * 0.5; if (d < 1) g.set(px_ + xx, py + yy, d > 0.62 ? CL[3] : (hash2(xx, yy, 9 + i) < 0.3 ? '#8a5a3a' : (d < 0.25 ? CL[1] : CL[2]))); }
      if (r() < 0.4) { F(g, px_ + 2, py + 2, 3, 2, '#a5583f'); P(g, px_ + 5, py + 3, '#80402e'); }
    }
  }
  function streaks(x0, y0, x1, y1, n) { for (i = 0; i < n; i++) { var sx = x0 + r() * (x1 - x0), len = 14 + r() * 40; for (y = y0 + 6; y < y0 + 6 + len && y < y1; y++) { var c = g.get(Math.round(sx), y); if (c && c.length === 7) g.set(Math.round(sx), y, mx(c, '#3a3328', 0.28)); } } }
  // ---- cupula detras (desfondada) ----
  var dcx = 132, dcy = 62;
  F(g, 100, 60, 64, 36, YW[2]); F(g, 100, 60, 64, 1, YW[4]); for (x = 104; x < 164; x += 12) { F(g, x, 62, 6, 20, '#2a2024'); F(g, x, 62, 6, 1, '#6b5a4c'); F(g, x + 2, 62, 2, 20, '#3a2e34'); }
  for (y = 18; y <= 60; y++) { var t = (60 - y) / 42, hw = Math.round(Math.sqrt(Math.max(0, 1 - t * t)) * 32 * 1.0); for (x = dcx - hw; x <= dcx + hw; x++) { var k = (x - (dcx - hw)) / Math.max(1, hw * 2), c = k < 0.2 ? YW[4] : (k < 0.55 ? YW[3] : (k < 0.85 ? YW[2] : YW[1])); g.set(x, y, c); } }
  for (i = -3; i <= 3; i++) for (y = 20; y <= 60; y++) { var tt = (60 - y) / 42, hh = Math.sqrt(Math.max(0, 1 - tt * tt)) * 32; var xx = Math.round(dcx + i * hh / 3.4); if (hh > 4) P(g, xx, y, YW[1]); }
  for (y = 20; y < 44; y++) for (x = dcx + 6; x < dcx + 28; x++) { var d = ((x - (dcx + 14)) * (x - (dcx + 14))) / 100 + ((y - 30) * (y - 30)) / 90; if (d < 1 + hash2(x, y, 4) * 0.3) g.set(x, y, d < 0.5 ? '#14101a' : MAD2[1]); }       // hueco por el que se ven las vigas
  for (i = 0; i < 6; i++) LN(g, dcx + 8 + i * 4, 22 + (i % 2) * 2, dcx + 10 + i * 4, 40, MAD2[3]);
  F(g, dcx - 1, 6, 3, 14, YW[0]); F(g, dcx - 6, 10, 13, 3, YW[0]); P(g, dcx, 6, YW[4]);                                         // cruz de la cupula
  F(g, dcx - 1, 10, 3, 3, '#4a3a2a');
  // ---- cuerpo central ----
  wall(70, 100, 194, ay);
  F(g, 70, 98, 124, 4, YW[4]); F(g, 70, 96, 124, 2, CL[4]); F(g, 70, 101, 124, 1, YW[1]);                                       // cornisa
  for (y = 70; y < 98; y++) { var t3 = (y - 70) / 28, hw3 = Math.round(8 + t3 * 54); for (x = 132 - hw3; x <= 132 + hw3; x++) { var k3 = (x - (132 - hw3)) / Math.max(1, hw3 * 2); g.set(x, y, k3 < 0.15 ? YW[4] : (k3 < 0.85 ? YW[3] : YW[2])); } P(g, 132 - hw3, y, CL[4]); P(g, 132 + hw3, y, YW[1]); }        // frontón
  LN(g, 70, 98, 132, 70, CL[4]); LN(g, 194, 98, 132, 70, YW[1]);
  F(g, 131, 56, 3, 14, '#4a3a2a'); F(g, 126, 60, 13, 3, '#4a3a2a'); F(g, 131, 56, 1, 14, '#6a5a4a');                             // cruz del frontón
  DISC(g, 132, 84, 7, CL[4]); DISC(g, 132, 84, 5, '#14101a'); for (i = 0; i < 4; i++) LN(g, 128 + i * 2, 80, 129 + i * 2, 88, MAD2[2]); F(g, 126, 84, 13, 2, MAD2[1]);   // rosetón tapiado
  [[78, 108], [172, 108]].forEach(function (p) { F(g, p[0] - 1, p[1] - 1, 18, 30, CL[4]); F(g, p[0], p[1], 16, 28, '#14101a'); DISC(g, p[0] + 8, p[1] + 1, 8, '#14101a'); F(g, p[0], p[1] + 4, 16, 24, '#14101a'); for (var q = 0; q < 5; q++) F(g, p[0] + 1, p[1] + 4 + q * 5, 14, 3, MAD2[1 + (q % 2)]); F(g, p[0] - 2, p[1] + 28, 20, 2, CL[3]); });   // ventanas tapiadas con tablones
  F(g, 70, 100, 4, ay - 100, CL[4]); F(g, 190, 100, 4, ay - 100, YW[1]); F(g, 70, 100, 1, ay - 100, '#fff');
  patches(70, 106, 194, ay - 8, 9); streaks(70, 100, 194, ay, 14);
  // portal con reja y cadena
  var px0 = 114, pw = 36;
  F(g, px0 - 4, 148, pw + 8, 64, CL[4]); DISC(g, 132, 156, 22, CL[4]);
  F(g, px0, 150, pw, 62, '#14101a'); DISC(g, 132, 156, 18, '#14101a');
  F(g, px0 + 2, 156, pw - 4, 56, MAD2[1]); DISC(g, 132, 158, 16, MAD2[1]);
  for (x = px0 + 2; x < px0 + pw - 2; x += 4) F(g, x, 140, 1, 72, MAD2[2]); F(g, 132, 140, 1, 72, MAD2[0]); F(g, px0 + 2, 178, pw - 4, 1, MAD2[0]); F(g, px0 + 2, 196, pw - 4, 1, MAD2[0]);
  for (x = px0 + 3; x < px0 + pw - 2; x += 5) { F(g, x, 150, 2, 62, IR[1]); P(g, x, 150, IR[4]); }                                  // reja de fierro por delante
  F(g, px0 + 2, 170, pw - 4, 2, IR[2]); F(g, px0 + 2, 194, pw - 4, 2, IR[2]);
  for (i = 0; i < 6; i++) { DISC(g, 124 + i * 3, 183 + (i % 2), 1, IR[4]); }                                                        // cadena y candado
  F(g, 130, 186, 5, 6, '#c8a030'); F(g, 131, 186, 3, 2, '#fff0a0'); F(g, 130, 191, 5, 1, '#6a5018');
  for (i = 0; i < 5; i++) { F(g, px0 - 6 - i * 3, 205 + i * 2, pw + 12 + i * 6, 2, i % 2 ? CC[2] : CC[3]); }                         // gradas
  // ---- torres ----
  [[24, 72], [192, 240]].forEach(function (tw, side) {
    var x0 = tw[0], x1 = tw[1], c0 = (x0 + x1) >> 1;
    wall(x0, 70, x1, ay);
    F(g, x0, 70, 5, ay - 70, CL[4]); F(g, x1 - 4, 70, 4, ay - 70, YW[1]); F(g, x0, 70, 1, ay - 70, '#fff');
    F(g, x0 - 3, 96, x1 - x0 + 6, 4, YW[4]); F(g, x0 - 3, 99, x1 - x0 + 6, 1, YW[1]); F(g, x0 - 3, 96, x1 - x0 + 6, 1, CL[4]);        // cornisa intermedia
    F(g, x0 - 3, 142, x1 - x0 + 6, 3, YW[4]); F(g, x0 - 3, 144, x1 - x0 + 6, 1, YW[1]);
    patches(x0, 100, x1, ay - 10, 6); streaks(x0, 70, x1, ay, 8);
    // ventanita alargada tapiada
    F(g, c0 - 5, 112, 11, 22, CL[4]); F(g, c0 - 4, 113, 9, 20, '#14101a'); DISC(g, c0, 114, 4, '#14101a'); for (var q2 = 0; q2 < 4; q2++) F(g, c0 - 4, 118 + q2 * 5, 9, 2, MAD2[1 + (q2 % 2)]);
    // campanario: arcos con campana y sombra
    F(g, x0 - 4, 66, x1 - x0 + 8, 5, YW[4]); F(g, x0 - 4, 70, x1 - x0 + 8, 1, YW[1]); F(g, x0 - 4, 66, x1 - x0 + 8, 1, CL[4]);
    wall(x0, 36, x1, 66); F(g, x0, 36, 4, 30, CL[4]); F(g, x1 - 4, 36, 4, 30, YW[1]);
    for (var a = 0; a < 2; a++) { var ax_ = x0 + 8 + a * ((x1 - x0 - 16) - 11 + 0) / 1; ax_ = Math.round(x0 + 8 + a * 19); DISC(g, ax_ + 5, 44, 6, CL[4]); F(g, ax_ - 1, 44, 12, 22, CL[4]); DISC(g, ax_ + 5, 44, 5, '#14101a'); F(g, ax_, 44, 11, 21, '#14101a'); DISC(g, ax_ + 5, 52, 3, YW[3]); F(g, ax_ + 2, 53, 7, 3, YW[3]); P(g, ax_ + 4, 51, YW[4]); }
    F(g, x0 - 4, 33, x1 - x0 + 8, 4, YW[4]); F(g, x0 - 4, 36, x1 - x0 + 8, 1, YW[1]); F(g, x0 - 4, 33, x1 - x0 + 8, 1, CL[4]); AO(g, x0 - 4, 37, x1 - x0 + 8, 3, 0.35);
    // remate: cupulita con cruz (la derecha esta mas dañada)
    for (y = 12; y < 33; y++) { var t4 = (33 - y) / 21, hw4 = Math.round(Math.sqrt(Math.max(0, 1 - t4 * t4)) * 22); for (x = c0 - hw4; x <= c0 + hw4; x++) { var k4 = (x - (c0 - hw4)) / Math.max(1, hw4 * 2); g.set(x, y, k4 < 0.2 ? YW[4] : (k4 < 0.6 ? YW[3] : (k4 < 0.85 ? YW[2] : YW[1]))); } }
    for (i = -2; i <= 2; i++) for (y = 14; y < 33; y++) { var t5 = (33 - y) / 21, h5 = Math.sqrt(Math.max(0, 1 - t5 * t5)) * 22; if (h5 > 3) P(g, Math.round(c0 + i * h5 / 2.6), y, YW[1]); }
    F(g, c0 - 1, 0, 3, 14, '#4a3a2a'); F(g, c0 - 5, 4, 11, 3, '#4a3a2a'); P(g, c0, 0, '#6a5a4a');
    if (side === 1) { for (y = 12; y < 24; y++) for (x = c0 + 6; x < c0 + 20; x++) if (((x - c0 - 6) + (y - 12) * 0.7) % 7 < 3.5 && g.get(x, y) && hash2(x, y, 3) < 0.9 && (x - c0 - 6) > (y - 12) * 0.3) g.set(x, y, hash2(x, y, 5) < 0.4 ? MAD2[1] : null); }   // cascaron roto
  });
  // andamio de tubos y tablones en la torre izquierda (obra de restauracion, jun-2026) con malla verde en parte
  [[16, 80], [16, 126], [16, 168]].forEach(function (p, ii) {
    F(g, p[0], p[1], 66, 2, '#9aa4a8'); F(g, p[0], p[1], 66, 1, '#cfd6d8'); F(g, p[0], p[1] + 2, 66, 3, MAD2[3]); F(g, p[0], p[1] + 2, 66, 1, MAD2[4]);
  });
  for (x = 16; x < 82; x += 21) { F(g, x, 80, 2, 132, '#8a949a'); F(g, x, 80, 1, 132, '#cfd6d8'); }
  for (i = 0; i < 3; i++) { LN(g, 17, 82 + i * 44, 38, 126 + i * 44 - 2, '#7a848a'); LN(g, 38, 82 + i * 44, 17, 126 + i * 44 - 2, '#7a848a'); }
  for (y = 128; y < 168; y++) for (x = 18; x < 80; x++) if ((x + y) % 3 !== 0 && x % 21 > 2) g.set(x, y, ((x + y) % 7 < 3) ? '#3a7a4a' : '#2a5a38');          // malla verde
  // zocalo, hierbas y gallinazos
  F(g, 24, ay - 8, 216, 8, CL[1]); F(g, 24, ay - 8, 216, 1, CL[3]); AO(g, 24, ay - 8, 216, 8, 0.12); speck(g, 24, ay - 8, 216, 8, r, 50, [CL[0], CL[2], '#5a4a38']);
  for (i = 0; i < 16; i++) { x = 26 + r() * 210; if (x > 112 && x < 154) continue; F(g, x, ay - 11, 1, 3 + r() * 3, '#5e8f4e'); P(g, x - 1, ay - 9, '#3f6a3a'); P(g, x + 1, ay - 10, '#9cbf6e'); }
  function gallinazo(gx, gy) { F(g, gx, gy, 6, 4, '#1c1a22'); F(g, gx + 1, gy - 1, 4, 1, '#2a2a32'); F(g, gx - 1, gy + 1, 2, 2, '#14101a'); F(g, gx + 5, gy - 2, 2, 3, '#14101a'); P(g, gx + 6, gy - 2, '#c86a3a'); P(g, gx + 7, gy - 1, '#e8d8c0'); F(g, gx + 1, gy + 4, 1, 2, '#3a2a2a'); F(g, gx + 4, gy + 4, 1, 2, '#3a2a2a'); }
  gallinazo(214, 30); gallinazo(188, 31); gallinazo(146, 94);
  outline(g, K, '#6a5a40');
  contact(g, 132, ay + 1, 108, 3, '#2a244070');
  var c = mk(g, ax, ay, 216, 22, { cast: { len: 0.28, a: 0.2 }, p: { tall: true } });
  c.lamps = [{ x: -22, y: -64 }, { x: 22, y: -64 }];
  c.emit = [{ x: -26, y: -58, kind: 'brasa', r: 5, col: '#ffcf7a' }, { x: 26, y: -58, kind: 'brasa', r: 5, col: '#ffcf7a' }];
  return c;
}
function barandaMiradorG(post) {
  var W = 16, H = 40, g = new G(W, H), x, y, WA = CAL;
  F(g, 0, 22, W, 14, WA[2]); F(g, 0, 22, W, 2, WA[4]); F(g, 0, 24, W, 1, WA[1]); F(g, 0, 35, W, 1, WA[0]); AO(g, 0, 30, W, 6, 0.1);                       // murete bajo
  speck(g, 0, 24, W, 11, rng(post ? 7 : 3), 8, [WA[1], WA[3], '#c8b890']);
  if (!post) {
    F(g, 0, 8, W, 2, IR[2]); F(g, 0, 8, W, 1, IR[4]);                                                                                              // pasamanos de fierro
    for (x = 1; x < W; x += 3) { F(g, x, 10, 1, 12, IR[1]); P(g, x, 9, IR[4]); }
    F(g, 0, 18, W, 1, IR[2]);
  } else {
    F(g, 3, 4, 10, 30, WA[3]); F(g, 3, 4, 2, 30, WA[4]); F(g, 11, 4, 2, 30, WA[1]); F(g, 2, 2, 12, 3, WA[4]); F(g, 2, 4, 12, 1, WA[1]); F(g, 4, 0, 8, 2, WA[3]); F(g, 6, -1 > 0 ? -1 : 0, 4, 1, WA[4]);
    F(g, 0, 8, 3, 2, IR[2]); F(g, 13, 8, 3, 2, IR[2]);
  }
  outline(g, K, '#9a8a70');
  var c = mk(g, 8, 36, 16, 6, { p: { solid: true } });
  return c;
}
function fuenteFrame(f) {
  var W = 180, H = 150, ax = 90, ay = 132, g = new G(W, H), x, y, i, MR = ['#8f8a80', '#b4afa3', '#d4d0c4', '#ece8dc', '#faf6ea'];
  var cx = 90, cy = 96, rx = 76, ry = 38, WT = ['#2f6a7c', '#3e7f8e', '#5e9aa5', '#8cc4c8', '#cfeaea'];
  // anillo exterior: pared frontal y borde superior
  ELL(g, cx, cy + 10, rx, ry, MR[0]); ELL(g, cx, cy + 6, rx, ry, MR[1]);
  ELL(g, cx, cy, rx, ry, MR[3]); ELL(g, cx - 2, cy - 1, rx - 3, ry - 2, MR[4]);
  ELL(g, cx, cy + 1, rx - 8, ry - 5, MR[2]);                                                  // pared interior
  ELL(g, cx, cy + 3, rx - 9, ry - 7, WT[0]);                                                  // agua oscura a lo lejos
  ELL(g, cx, cy + 4, rx - 10, ry - 9, WT[1]);
  for (y = cy - 20; y < cy + 26; y++) for (x = cx - rx + 8; x < cx + rx - 8; x++) {            // ondas
    var dx = (x - cx) / (rx - 10), dy = (y - (cy + 4)) / (ry - 9); if (dx * dx + dy * dy > 1) continue;
    var wv = Math.sin((x * 0.5 + f * 2.1) + Math.sin(y * 0.7) * 1.5) + Math.sin(y * 0.9 - f * 1.7 + x * 0.1);
    if (wv > 1.55) g.set(x, y, WT[3]); else if (wv > 1.2) g.set(x, y, WT[2]); else if (wv < -1.7) g.set(x, y, WT[0]);
  }
  for (x = cx - rx + 10; x < cx + rx - 10; x += 3) { var yy = cy - Math.round(Math.sqrt(Math.max(0, 1 - ((x - cx) / (rx - 9)) * ((x - cx) / (rx - 9)))) * (ry - 6)); if (yy > 0) P(g, x, yy + 1, WT[0]); }
  // isla central y columna
  ELL(g, cx, cy + 6, 22, 11, MR[1]); ELL(g, cx, cy + 3, 22, 11, MR[3]); ELL(g, cx - 1, cy + 2, 19, 9, MR[4]); ELL(g, cx, cy + 4, 14, 7, WT[1]);
  F(g, cx - 5, cy - 18, 10, 24, MR[3]); F(g, cx - 5, cy - 18, 3, 24, MR[4]); F(g, cx + 3, cy - 18, 2, 24, MR[1]); F(g, cx - 7, cy - 20, 14, 3, MR[4]); F(g, cx - 7, cy - 18, 14, 1, MR[1]);
  F(g, cx - 7, cy + 4, 14, 3, MR[4]); F(g, cx - 7, cy + 6, 14, 1, MR[1]);
  // la Danaide: arrodillada con el jarron al hombro, vertiendo el agua
  var fy = cy - 22;
  F(g, cx - 4, fy - 6, 9, 8, MR[4]); F(g, cx - 4, fy - 6, 2, 8, '#fff'); F(g, cx + 3, fy - 6, 2, 8, MR[2]);                                        // torso
  F(g, cx - 6, fy + 1, 13, 4, MR[3]); F(g, cx - 6, fy + 1, 13, 1, MR[4]); F(g, cx + 4, fy + 1, 3, 4, MR[2]);                                      // cadera / paño
  DISC(g, cx, fy - 9, 3, MR[4]); P(g, cx - 1, fy - 9, MR[2]); F(g, cx - 3, fy - 12, 7, 2, MR[2]);                                                 // cabeza y pelo
  LN(g, cx + 3, fy - 5, cx + 8, fy - 12, MR[4]); LN(g, cx + 4, fy - 5, cx + 9, fy - 11, MR[2]);                                                    // brazo hacia el jarron
  F(g, cx + 6, fy - 17, 8, 7, MR[3]); F(g, cx + 6, fy - 17, 2, 7, MR[4]); F(g, cx + 12, fy - 17, 2, 7, MR[1]); F(g, cx + 7, fy - 18, 6, 1, MR[4]);   // jarron
  var jx = cx + 14, jy = fy - 14;
  for (i = 0; i < 12; i++) { var t = i / 11; P(g, jx + Math.round(t * 10) + ((i + f) % 2), jy + Math.round(t * t * 34), (i + f) % 3 ? WT[4] : WT[3]); P(g, jx + Math.round(t * 10) + 1, jy + Math.round(t * t * 34), WT[3]); }
  var ring = 3 + f * 2; for (x = -ring; x <= ring; x++) { var yy2 = Math.round(Math.sqrt(Math.max(0, 1 - (x / ring) * (x / ring))) * (ring * 0.45)); P(g, jx + 11 + x, cy + 7 + yy2, WT[4]); P(g, jx + 11 + x, cy + 7 - yy2, WT[3]); }
  // pedestales con putti (adelante, a los lados) en mármol de Carrara
  [[-60, 18], [60, 18]].forEach(function (p) {
    var bx = cx + p[0], by = cy + p[1];
    F(g, bx - 6, by + 2, 12, 9, MR[3]); F(g, bx - 6, by + 2, 3, 9, MR[4]); F(g, bx + 3, by + 2, 3, 9, MR[1]); F(g, bx - 7, by, 14, 3, MR[4]); F(g, bx - 7, by + 2, 14, 1, MR[1]); F(g, bx - 7, by + 10, 14, 2, MR[2]);
    DISC(g, bx, by - 4, 3, MR[4]); P(g, bx - 1, by - 5, MR[2]); F(g, bx - 3, by - 1, 7, 3, MR[3]); F(g, bx - 6, by - 3, 3, 2, MR[4]); F(g, bx + 4, by - 3, 3, 2, MR[2]);
  });
  outline(g, K, '#9a9484');
  return g;
}
function fuenteParque() {
  var fr = [0, 1, 2].map(function (f) { var g = fuenteFrame(f); contact(g, 90, 134, 78, 4, '#2a244060'); return mk(g, 90, 132, 150, 58, { cast: { len: 0.2, a: 0.14 }, p: { solid: true } }); });
  var c = fr[0]; c.frames = fr; c.fps = 3;
  c.pedestal = { x: -76, y: -58, w: 152, h: 66 };
  return c;
}
function estatuaG() {
  var W = 52, H = 104, ax = 26, ay = 98, g = new G(W, H), x, y, i, ST = ['#5e584c', '#7e786a', '#a09a8a', '#c0baa8', '#dcd6c4'];
  F(g, 4, 78, 44, 20, ST[2]); F(g, 4, 78, 44, 2, ST[4]); F(g, 4, 80, 5, 18, ST[3]); F(g, 43, 80, 5, 18, ST[1]); F(g, 4, 97, 44, 1, ST[0]);                    // zocalo de piedra tallada en bloques
  for (y = 82; y < 97; y += 5) F(g, 4, y, 44, 1, ST[1]); for (x = 14; x < 44; x += 12) F(g, x, 82, 1, 5, ST[1]);
  F(g, 12, 70, 28, 9, ST[3]); F(g, 12, 70, 28, 2, ST[4]); F(g, 12, 72, 3, 7, ST[4]); F(g, 36, 72, 4, 7, ST[1]);
  F(g, 16, 74, 20, 4, ST[1]); F(g, 18, 75, 16, 2, ST[2]);                                                                                                  // placa sin texto
  for (y = 26; y < 70; y++) { var t = (y - 26) / 44, hw = Math.round(6 + t * t * 12 + Math.sin(y * 0.5) * 1.2); for (x = 26 - hw; x <= 26 + hw + (y > 50 ? 2 : 0); x++) { var k = (x - (26 - hw)) / Math.max(1, hw * 2); g.set(x, y, k < 0.25 ? ST[4] : (k < 0.6 ? ST[3] : (k < 0.85 ? ST[2] : ST[1]))); } }           // vestido largo y acampanado
  for (i = 0; i < 7; i++) LN(g, 26 + (i - 3) * 2, 44 + i % 2, 26 + (i - 3) * 4, 69, ST[1]);
  F(g, 18, 30, 16, 14, ST[3]); F(g, 18, 30, 4, 14, ST[4]);                                                                                              // torso
  F(g, 14, 31, 8, 3, ST[2]); F(g, 30, 31, 9, 18, ST[2]); F(g, 30, 31, 2, 18, ST[3]);                                                                    // chal sobre los hombros
  LN(g, 18, 34, 12, 44, ST[3]); LN(g, 19, 34, 13, 44, ST[2]); F(g, 11, 44, 3, 3, ST[3]);                                                                // brazo izquierdo
  LN(g, 34, 33, 40, 24, ST[3]); LN(g, 35, 33, 41, 24, ST[2]); F(g, 40, 21, 3, 4, ST[3]);                                                                // brazo derecho alzado (llamando)
  DISC(g, 26, 22, 5, ST[4]); F(g, 20, 17, 12, 3, ST[2]); F(g, 22, 25, 8, 2, ST[3]);                                                                    // cabeza y cabello recogido
  F(g, 20, 13, 3, 6, ST[3]); F(g, 30, 14, 3, 5, ST[1]);
  speck(g, 4, 20, 44, 78, rng(81), 40, [ST[0], '#6a7a50', ST[4]]);
  for (x = 6; x < 20; x += 4) P(g, x, 96, '#5e8f4e');
  for (var i2 = 0; i2 < 5; i2++) { P(g, 8 + i2 * 8, 77, [BUG[3], '#f3efe2', '#ffd83a'][i2 % 3]); }                                                    // flores dejadas en el zocalo
  outline(g, K, '#9a9484'); contact(g, 26, 99, 24, 3, '#2a244070');
  return mk(g, ax, ay, 44, 12, { cast: { len: 0.4, a: 0.2 }, p: { tall: true, solid: true } });
}
function kioscoG(night) {
  var W = 76, H = 92, ax = 38, ay = 86, g = new G(W, H), x, y, i, GR = ramp('#4a8a6a');
  F(g, 8, 36, 60, 46, '#efe4c8'); F(g, 8, 36, 4, 46, '#fbf3dc'); F(g, 64, 36, 4, 46, '#b8ac90'); F(g, 8, 80, 60, 2, '#8a8068');
  for (x = 14; x < 64; x += 10) F(g, x, 36, 1, 46, '#d8cdb0');
  F(g, 12, 46, 52, 22, night ? '#ffd078' : '#2a3a46'); if (night) { F(g, 12, 46, 52, 2, '#fff0b0'); F(g, 12, 66, 52, 2, '#e8a850'); } else { F(g, 12, 46, 52, 1, '#4d6676'); LN(g, 16, 66, 30, 48, '#3d5666'); LN(g, 40, 66, 54, 48, '#3d5666'); }
  F(g, 8, 62, 60, 5, MAD2[3]); F(g, 8, 62, 60, 1, MAD2[4]); F(g, 8, 66, 60, 1, MAD2[0]);                                                                 // mostrador
  [[16, 56, '#c8402a'], [26, 57, '#f2d480'], [48, 56, '#3f7a9a'], [56, 57, '#e8b7a0']].forEach(function (p) { F(g, p[0], p[1], 5, 5, p[2]); F(g, p[0], p[1], 5, 1, lt(p[2], 0.3)); });   // golosinas
  for (y = 18; y < 38; y++) { var t = (y - 18) / 20, hw = Math.round(14 + t * 24); for (x = 38 - hw; x <= 38 + hw; x++) { var s = Math.floor((x - (38 - hw)) / 5.5) & 1; var c = s ? '#f3e8cf' : GR[2]; if (x > 38 + hw - 5) c = dk(c, 0.25); else if (x < 38 - hw + 4) c = lt(c, 0.1); g.set(x, y, y > 34 ? dk(c, 0.2) : c); } }
  for (x = 0; x < 76; x++) { var s2 = Math.floor((x - 0) / 5.5) & 1; if (x >= 0 && x < 76 && g.get(x, 37)) P(g, x, 38, s2 ? '#f3e8cf' : GR[2]); }
  F(g, 36, 10, 4, 8, GR[0]); F(g, 34, 8, 8, 3, GR[3]); P(g, 38, 6, '#e6c85a'); F(g, 37, 4, 2, 3, '#e6c85a');
  F(g, 12, 38, 52, 5, '#2a1a14'); px.text(g, 'REFRESCOS', 38, 38, { font: 'a5', ink: night ? '#fff0b0' : '#f3efe2', align: 'c' });
  F(g, 6, 82, 64, 3, CC[2]); F(g, 6, 82, 64, 1, CC[4]);
  outline(g, K, '#6a5a50'); contact(g, 38, 86, 34, 3, '#2a244070');
  var c = mk(g, ax, ay, 62, 10, { cast: { len: 0.3, a: 0.18 }, p: { tall: true } });
  if (night) c.emit = [{ x: 0, y: -28, kind: 'ventana', r: 10, col: '#ffc060' }];
  return c;
}
function bakeErmita() {
  L.ermita = ermitaG();
  L.barandaMirador = barandaMiradorG(false); L.barandaMirador.pilastra = barandaMiradorG(true); L.barandaMirador.variants = [L.barandaMirador.pilastra];
}
function bakeParque() {
  L.fuenteParque = fuenteParque();
  L.estatuaCantora = estatuaG();
  L.kioscoParque = kioscoG(false); var kn = kioscoG(true); L.kioscoParque.noche = kn; L.kioscoParque.emit = kn.emit;
}

/* ============================ LOTES: Biblioteca Municipal y Iglesia de la Santisima Cruz (Parque Municipal) ============================
 * formato render.js: function (ficha) -> { canvas, over, overX, overY, lights }.  Lado N = azotea + cara sur; lado S = azotea vista desde arriba.
 * Campos de ficha: side c0 c1 r0 r1 seed face (tiles de cara) name. Sin ficha.name la biblioteca lleva su rotulo. */
function lotCtx(f) {
  var W = (f.c1 - f.c0 + 1) * 16, H = (f.r1 - f.r0 + 1) * 16;
  return { f: f, W: W, H: H, rows: f.r1 - f.r0 + 1, g: new G(W, H), side: f.side === 'S' ? 'S' : 'N', rnd: rng(((f.seed | 0) || 1234) * 7919 + 13), lights: [] };
}
function lotLite(c, x, y, w, h, kind) { c.lights.push({ x: Math.round(x), y: Math.round(y), w: w, h: h, kind: kind || 'local' }); }
function lotDone(c) { return { canvas: c.g.toCanvas(), over: null, overX: 0, overY: 0, lights: c.lights }; }
function lotFaceH(c, def) { var ft = c.f.face || def; ft = clamp(ft, 5, c.rows); return ft * 16; }
function teja(g, x, y, w, h, A, off) {                           // teja curva: hileras de 3 px con juntas desfasadas
  F(g, x, y, w, h, A[2]);
  for (var j = 0; j < h; j += 3) {
    F(g, x, y + j, w, 1, A[1]); F(g, x, y + j + 1, w, 1, A[3]);
    for (var i = ((j / 3 | 0) % 2) * 3 + (off || 0); i < w; i += 6) P(g, x + i, y + j + 2, A[1]);
  }
}
function archWinL(g, x, y, w, h, frame, night, rnd) {            // ventana con arco de medio punto, reja y vidrio (o vitral)
  var r = w >> 1, cx = x + r;
  DISC(g, cx, y + r, r + 1, frame); F(g, x - 1, y + r, w + 2, h - r, frame);
  DISC(g, cx, y + r, r - 1, K); F(g, x + 1, y + r, w - 2, h - r - 1, K);
  if (night) { DISC(g, cx, y + r, r - 1, '#ffcf7a'); F(g, x + 1, y + r, w - 2, h - r - 1, '#ffcf7a'); F(g, x + 1, y + h - 4, w - 2, 3, '#e8a850'); F(g, cx, y + 1, 1, h - 3, '#a8702a'); }
  else { DISC(g, cx, y + r, r - 1, '#2a3a46'); F(g, x + 1, y + r, w - 2, h - r - 1, '#2a3a46'); F(g, x + 1, y + 2, w - 2, 1, '#4d6676'); for (var q = x + 2; q < x + w - 1; q += 3) F(g, q, y + 3, 1, h - 5, IR[1]); }
  F(g, x - 2, y + h, w + 4, 2, '#f3ecd8'); AO(g, x - 2, y + h + 2, w + 4, 1, 0.35);
}
function bibliotecaN(c) {
  var g = c.g, W = c.W, H = c.H, rnd = c.rnd, i, x, y;
  var CR = ramp('#e2d2ae'), TR = ramp('#b4603e'), WHT = '#f3ecd8', WHS = '#c4b898', ST = ramp('#9a9484');
  var fh = lotFaceH(c, 8), fy = H - fh, tw = clamp(Math.round(W * 0.17), 30, 44), tx0 = W - tw - 8, tx1 = tx0 + tw, mw = tx0 - 3, cx = mw >> 1;
  // azotea: techo de teja a dos aguas atras de la cornisa
  if (fy > 6) {
    teja(g, 0, 2, tx0 - 2, fy - 2, TR, 0); LI(g, 0, 2, tx0 - 2, (fy - 2) >> 1, 0.1); AO(g, 0, 2 + ((fy - 2) >> 1), tx0 - 2, (fy - 2) >> 1, 0.2);
    F(g, 0, 2 + ((fy - 2) >> 1) - 1, tx0 - 2, 2, TR[4]);
    F(g, 0, 0, tx0 - 2, 2, CR[4]); F(g, 0, 0, 2, fy, CR[3]);
  }
  // fachada: pared, cornisa, friso con el rotulo
  for (y = fy; y < H; y++) for (x = 0; x < mw; x++) g.set(x, y, x < 3 ? CR[4] : (x > mw - 4 ? CR[1] : CR[2]));
  speck(g, 0, fy, mw, fh, rnd, mw * fh / 40, [CR[3], CR[1], '#cdbd9a']);
  F(g, 0, fy - 5, mw, 5, WHT); F(g, 0, fy - 5, mw, 1, '#fff'); F(g, 0, fy - 1, mw, 1, WHS); AO(g, 0, fy, mw, 3, 0.3);
  F(g, 0, fy + 3, mw, 14, CR[3]); F(g, 0, fy + 3, mw, 1, WHT); F(g, 0, fy + 16, mw, 1, CR[0]);
  var name = (c.f.name || 'BIBLIOTECA MUNICIPAL').toUpperCase(), font = px.measure(name, 'a7') <= 120 && mw >= 150 ? 'a7' : 'a5';
  var tw_ = px.measure(name, font), bandW = Math.min(mw - 12, tw_ + 12);
  // zocalo de piedra
  F(g, 0, H - 10, mw, 10, ST[2]); F(g, 0, H - 10, mw, 1, ST[4]); F(g, 0, H - 9, mw, 1, ST[3]); for (x = 0; x < mw; x += 12) F(g, x, H - 9, 1, 9, ST[1]); AO(g, 0, H - 10, mw, 10, 0.06);
  // ventanas altas con arco a los lados y portico central
  var winH = clamp(fh - 40, 28, 62), pw = clamp(Math.round(mw * 0.4), 60, 92), px0 = cx - (pw >> 1), px1 = px0 + pw;
  var step = 28;
  for (x = 14; x < mw - 16; x += step) {
    var wx = x; if (wx + 12 > px0 - 6 && wx < px1 + 6) continue;
    archWinL(g, wx, fy + 24, 12, winH, WHT, false, rnd); lotLite(c, wx + 6, fy + 24 + (winH >> 1), 12, winH, 'local');
    F(g, wx - 5, fy + 20, 2, H - fy - 32, CR[3]);
  }
  // portico: 4 columnas, friso y frontoncito, puerta con arco
  var colW = 6, cols = [px0 + 2, px0 + (pw - 10) / 3 + 2, px0 + 2 * (pw - 10) / 3 + 2, px1 - 10 + 2].map(Math.round);
  F(g, px0 - 3, fy + 17, pw + 6, 5, WHT); F(g, px0 - 3, fy + 17, pw + 6, 1, '#fff'); F(g, px0 - 3, fy + 21, pw + 6, 1, WHS); AO(g, px0 - 3, fy + 22, pw + 6, 3, 0.35);
  for (y = fy - 16; y < fy + 3; y++) { var t = (y - (fy - 16)) / 19, hw = Math.round(6 + t * (pw / 2 + 1)); for (x = cx - hw; x <= cx + hw; x++) g.set(x, y, x < cx - hw + 2 ? WHT : (x > cx + hw - 3 ? WHS : CR[3])); P(g, cx - hw, y, '#fff'); P(g, cx + hw, y, WHS); }
  DISC(g, cx, fy - 6, 4, '#2a3a2a'); DISC(g, cx, fy - 6, 3, '#c8a030'); P(g, cx - 1, fy - 7, '#fff0a0');
  F(g, cx - (bandW >> 1), fy + 4, bandW, 11, '#2a3a2a'); FR(g, cx - (bandW >> 1), fy + 4, bandW, 11, '#c8a030');
  px.text(g, name, cx, fy + 4 + (font === 'a7' ? 2 : 3), { font: font, ink: '#f3e8c0', align: 'c' });
  cols.forEach(function (cxx) { F(g, cxx, fy + 22, colW, H - fy - 32, WHT); F(g, cxx, fy + 22, 1, H - fy - 32, '#fff'); F(g, cxx + colW - 2, fy + 22, 2, H - fy - 32, WHS); F(g, cxx - 1, fy + 21, colW + 2, 3, WHT); F(g, cxx - 1, H - 13, colW + 2, 3, WHT); });
  var dw = clamp(pw - 40, 18, 28), dx0 = cx - (dw >> 1), dTop = fy + 30;
  DISC(g, cx, dTop + (dw >> 1), (dw >> 1) + 2, WHT); F(g, dx0 - 2, dTop + (dw >> 1), dw + 4, H - dTop - (dw >> 1) - 10, WHT);
  DISC(g, cx, dTop + (dw >> 1), dw >> 1, MAD2[1]); F(g, dx0, dTop + (dw >> 1), dw, H - dTop - (dw >> 1) - 10, MAD2[1]);
  for (x = dx0; x < dx0 + dw; x += 3) F(g, x, dTop + 2, 1, H - dTop - 12, MAD2[2]); F(g, cx, dTop, 1, H - dTop - 10, MAD2[0]); F(g, dx0, dTop + (dw >> 1) + 8, dw, 1, MAD2[0]);
  F(g, cx - 3, dTop + (dw >> 1) + 12, 2, 2, '#e6c85a'); F(g, cx + 2, dTop + (dw >> 1) + 12, 2, 2, '#e6c85a');
  lotLite(c, cx, H - 24, dw, 26, 'local');
  for (i = 0; i < 3; i++) F(g, px0 - 6 - i * 2, H - 6 + i * 2 - (i === 2 ? 2 : 0), pw + 12 + i * 4, 2, i % 2 ? '#bdb29a' : '#cfc5ae');
  // torre de 1911: cuerpo, reloj, campanario y piramide
  for (y = 24; y < H; y++) for (x = tx0; x < tx1; x++) g.set(x, y, x < tx0 + 3 ? CR[4] : (x > tx1 - 4 ? CR[1] : CR[2]));
  speck(g, tx0, 24, tw, H - 24, rnd, 60, [CR[3], CR[1], '#cdbd9a']);
  F(g, tx0 - 2, 56, tw + 4, 4, WHT); F(g, tx0 - 2, 56, tw + 4, 1, '#fff'); F(g, tx0 - 2, 59, tw + 4, 1, WHS); AO(g, tx0 - 2, 60, tw + 4, 3, 0.3);
  var kx = tx0 + (tw >> 1);
  DISC(g, kx, 40, 8, K); DISC(g, kx, 40, 7, WHT); DISC(g, kx, 40, 6, '#fbf6e6');
  P(g, kx, 35, K); P(g, kx, 45, K); P(g, kx - 5, 40, K); P(g, kx + 5, 40, K); F(g, kx, 36, 1, 4, K); F(g, kx, 40, 3, 1, K); P(g, kx, 40, '#b0302a');
  F(g, tx0 - 2, 26, tw + 4, 3, WHT); AO(g, tx0 - 2, 29, tw + 4, 2, 0.3);
  var ww = Math.max(10, tw - 16); archWinL(g, tx0 + 8, 66, ww, Math.min(H - 80, 40), WHT, false, rnd); lotLite(c, kx, 66 + 14, ww, 30, 'local');
  F(g, tx0 - 2, H - 12, tw + 4, 12, ST[2]); F(g, tx0 - 2, H - 12, tw + 4, 1, ST[4]);
  for (y = 2; y < 26; y++) { var tt = (y - 2) / 24, hw2 = Math.round(1 + tt * (tw / 2 + 2)); for (x = kx - hw2; x <= kx + hw2; x++) g.set(x, y, x < kx - hw2 + 2 ? TR[3] : (x > kx + hw2 - 3 ? TR[1] : TR[2])); if ((y - 2) % 4 === 3) F(g, kx - hw2, y, hw2 * 2 + 1, 1, TR[1]); P(g, kx - hw2, y, TR[4]); P(g, kx + hw2, y, TR[0]); }       // remate piramidal de teja
  F(g, kx, 0, 1, 4, '#4a3a2a'); P(g, kx - 1, 1, '#4a3a2a'); P(g, kx + 1, 1, '#4a3a2a');
  return lotDone(c);
}
function bibliotecaS(c) {
  var g = c.g, W = c.W, H = c.H, i;
  var TR = ramp('#b4603e'), CR = ramp('#e2d2ae'), tw = clamp(Math.round(W * 0.17), 30, 44), tx0 = W - tw - 8, cxm = (tx0 - 2) >> 1;
  teja(g, 0, 0, W, H, TR, 0); LI(g, 0, 0, W, H >> 1, 0.08);
  F(g, 0, 0, W, 6, CR[3]); F(g, 0, 0, W, 2, '#f3ecd8'); F(g, 0, 5, W, 1, CR[1]); AO(g, 0, 6, W, 2, 0.4); F(g, 0, H - 2, W, 2, CR[3]);
  F(g, 0, 0, 3, H, CR[3]); F(g, W - 3, 0, 3, H, CR[1]);
  F(g, 8, (H >> 1) - 1, tx0 - 12, 3, TR[4]); AO(g, 8, (H >> 1) + 2, tx0 - 12, (H >> 1) - 4, 0.18);                              // caballete y vertiente a la sombra
  var ty = H >> 2;                                                                                                          // piramide de la torre vista desde arriba
  for (i = 0; i < tw / 2; i++) { F(g, tx0 + i, ty + i, tw - i * 2, tw - i * 2, i % 2 ? TR[2] : TR[3]); }
  LN(g, tx0, ty, tx0 + tw / 2, ty + tw / 2, TR[0]); LN(g, tx0 + tw, ty, tx0 + tw / 2, ty + tw / 2, TR[0]); LN(g, tx0, ty + tw, tx0 + tw / 2, ty + tw / 2, TR[1]); LN(g, tx0 + tw, ty + tw, tx0 + tw / 2, ty + tw / 2, TR[1]);
  AO(g, tx0 + tw, ty + 6, 8, tw, 0.3);
  return lotDone(c);
}
S.lotArch.br_biblioteca = function (f) { var c = lotCtx(f); return c.side === 'S' ? bibliotecaS(c) : bibliotecaN(c); };

function iglesiaBR_N(c) {
  var g = c.g, W = c.W, H = c.H, rnd = c.rnd, i, x, y;
  var CR = ramp('#eadfc4'), TR = ramp('#a85a3e'), ST = ramp('#9a9484'), WHT = '#f6f0de', WHS = '#c4b898';
  var fh = lotFaceH(c, 10), fy = H - fh, tw = clamp(Math.round(W * 0.2), 34, 46), tx0 = 6, tx1 = tx0 + tw, nx0 = tx1 + 2, nx1 = W - 4, ncx = (nx0 + nx1) >> 1, nw = nx1 - nx0;
  // techo de la nave (a dos aguas, visto por detras del frontis)
  if (fy > 8) { teja(g, nx0, 4, nw, fy, TR, 1); LI(g, nx0, 4, nw >> 1, fy, 0.1); AO(g, ncx, 4, nw >> 1, fy, 0.2); F(g, ncx - 1, 4, 2, fy, TR[4]); }
  // frontis con gablete triangular
  var gTop = Math.max(6, fy - 26);
  for (y = gTop; y < H; y++) {
    var hw = y < fy ? Math.round((y - gTop) / Math.max(1, fy - gTop) * (nw / 2)) : nw >> 1;
    for (x = ncx - hw; x <= ncx + hw; x++) g.set(x, y, x < ncx - hw + 3 ? WHT : (x > ncx + hw - 4 ? CR[1] : CR[2]));
    if (y < fy) { P(g, ncx - hw, y, '#fff'); P(g, ncx + hw, y, WHS); P(g, ncx - hw - 1, y, TR[3]); P(g, ncx + hw + 1, y, TR[1]); }
  }
  speck(g, nx0, fy, nw, fh, rnd, nw * fh / 40, [CR[3], CR[1], '#d4c8a8']);
  F(g, nx0, fy - 1, nw, 4, WHT); F(g, nx0, fy - 1, nw, 1, '#fff'); F(g, nx0, fy + 2, nw, 1, WHS); AO(g, nx0, fy + 3, nw, 3, 0.3);                // cornisa
  // cruz de piedra sobre el gablete
  F(g, ncx - 1, gTop - 10, 3, 12, ST[3]); F(g, ncx - 4, gTop - 7, 9, 3, ST[3]); F(g, ncx - 1, gTop - 10, 1, 12, ST[4]); F(g, ncx + 1, gTop - 10, 1, 12, ST[1]);
  // rosetón circular con vitral
  var ry = fy + 20, rr = clamp(Math.round(nw * 0.12), 9, 14), cols = ['#3f5aa8', '#b0302a', '#e6b030', '#2f7a50', '#8b5fa3'];
  DISC(g, ncx, ry, rr + 2, WHT); DISC(g, ncx, ry, rr, K);
  for (y = -rr + 1; y < rr; y++) for (x = -rr + 1; x < rr; x++) { if (x * x + y * y > (rr - 1) * (rr - 1)) continue; var a = Math.atan2(y, x), s = Math.floor((a + 3.1416) / 6.2832 * 10) % 10; g.set(ncx + x, ry + y, (Math.abs(x) < 1 || Math.abs(y) < 1 || x * x + y * y < 4) ? K : cols[s % 5]); }
  DISC(g, ncx, ry, 2, '#e6c85a'); F(g, ncx - rr - 3, ry + rr + 2, rr * 2 + 6, 2, WHT); AO(g, ncx - rr - 3, ry + rr + 4, rr * 2 + 6, 2, 0.3);
  lotLite(c, ncx, ry, rr * 2, rr * 2, 'foco');
  // portal con arco apuntado y puerta doble de madera
  var pw = clamp(Math.round(nw * 0.34), 28, 44), pTop = ry + rr + 12;
  F(g, ncx - (pw >> 1) - 4, pTop - 4, pw + 8, H - pTop + 4, WHT); DISC(g, ncx, pTop + (pw >> 1) - 2, (pw >> 1) + 4, WHT);
  F(g, ncx - (pw >> 1), pTop + (pw >> 1) - 2, pw, H - pTop - (pw >> 1) - 4, '#3a2a22'); DISC(g, ncx, pTop + (pw >> 1) - 2, pw >> 1, '#3a2a22');
  F(g, ncx - (pw >> 1) + 2, pTop + (pw >> 1), pw - 4, H - pTop - (pw >> 1) - 8, MAD2[2]); DISC(g, ncx, pTop + (pw >> 1) - 2, (pw >> 1) - 2, MAD2[2]);
  for (x = ncx - (pw >> 1) + 2; x < ncx + (pw >> 1) - 1; x += 3) F(g, x, pTop + 2, 1, H - pTop - 10, MAD2[1]); F(g, ncx, pTop - 2, 1, H - pTop - 6, MAD2[0]);
  for (y = pTop + 12; y < H - 12; y += 7) { P(g, ncx - 6, y, '#e6c85a'); P(g, ncx + 5, y, '#e6c85a'); }
  F(g, ncx - 3, pTop + (pw >> 1) + 8, 2, 3, '#e6c85a'); F(g, ncx + 2, pTop + (pw >> 1) + 8, 2, 3, '#e6c85a');
  lotLite(c, ncx, H - 22, pw, 26, 'local');
  for (i = 0; i < 3; i++) F(g, ncx - (pw >> 1) - 8 - i * 3, H - 6 + i * 2 - (i === 2 ? 2 : 0), pw + 16 + i * 6, 2, i % 2 ? '#bdb29a' : '#cfc5ae');
  // ventanas altas y estrechas a los lados del frontis
  [nx0 + 10, nx1 - 14].forEach(function (wx) { F(g, wx - 1, fy + 14, 6, 34, WHT); F(g, wx, fy + 15, 4, 32, '#3f5aa8'); F(g, wx + 1, fy + 15, 1, 32, '#7a9ae0'); F(g, wx, fy + 28, 4, 1, K); F(g, wx - 2, fy + 47, 8, 2, WHT); lotLite(c, wx + 2, fy + 30, 6, 34, 'local'); });
  F(g, nx0, H - 10, nw, 10, ST[2]); F(g, nx0, H - 10, nw, 1, ST[4]); for (x = nx0; x < nx1; x += 12) F(g, x, H - 9, 1, 9, ST[1]);
  // campanario esbelto a la izquierda: fuste, arcos con campana, remate de teja con cruz dorada
  for (y = 40; y < H; y++) for (x = tx0; x < tx1; x++) g.set(x, y, x < tx0 + 3 ? WHT : (x > tx1 - 4 ? CR[1] : CR[2]));
  speck(g, tx0, 40, tw, H - 40, rnd, 50, [CR[3], CR[1], '#d4c8a8']);
  F(g, tx0 - 2, 58, tw + 4, 4, WHT); F(g, tx0 - 2, 58, tw + 4, 1, '#fff'); AO(g, tx0 - 2, 62, tw + 4, 3, 0.3);
  var kx = (tx0 + tx1) >> 1, bw = 11;
  for (i = 0; i < (tw > 38 ? 2 : 1); i++) { var bx = tw > 38 ? tx0 + 7 + i * (tw - 14 - bw + 1) : kx - (bw >> 1); DISC(g, bx + 5, 70, 6, WHT); F(g, bx - 1, 70, 12, 24, WHT); DISC(g, bx + 5, 70, 5, '#241a1c'); F(g, bx, 70, 11, 23, '#241a1c'); ELL(g, bx + 5, 80, 3, 3, '#e6c85a'); F(g, bx + 2, 82, 7, 2, '#e6c85a'); }
  F(g, tx0 - 2, 94, tw + 4, 4, WHT); AO(g, tx0 - 2, 98, tw + 4, 3, 0.3);
  F(g, tx0 - 2, 36, tw + 4, 4, WHT);
  for (y = 6; y < 36; y++) { var t = (y - 6) / 30, hw3 = Math.round(2 + t * (tw / 2 + 1)); for (x = kx - hw3; x <= kx + hw3; x++) g.set(x, y, x < kx - hw3 + 2 ? TR[3] : (x > kx + hw3 - 3 ? TR[1] : TR[2])); if ((y - 6) % 4 === 3) F(g, kx - hw3, y, hw3 * 2 + 1, 1, TR[1]); }
  F(g, kx, 0, 1, 8, '#e6c85a'); F(g, kx - 2, 2, 5, 1, '#e6c85a'); P(g, kx, 0, '#fff0a0');
  F(g, tx0 - 2, H - 12, tw + 4, 12, ST[2]); F(g, tx0 - 2, H - 12, tw + 4, 1, ST[4]);
  F(g, tx0 + 8, 108, 8, 26, WHT); F(g, tx0 + 9, 109, 6, 24, '#2a3a46'); lotLite(c, tx0 + 12, 120, 8, 24, 'local');
  lotLite(c, kx, 70, bw + 6, 22, 'foco');
  return lotDone(c);
}
function iglesiaBR_S(c) {
  var g = c.g, W = c.W, H = c.H, i, TR = ramp('#a85a3e'), CR = ramp('#eadfc4'), nw = Math.round(W * 0.46), nx0 = (W >> 1) - (nw >> 1) + 12, ty = (H >> 1) - 14;
  teja(g, 0, 0, W, H, ['#4a3a38', '#6a5450', '#7e665e', '#94786c', '#a88a7c'], 0); AO(g, 0, 0, W, H, 0.55);                              // el suelo del patio/azotea baja
  F(g, 0, 0, W, 6, CR[3]); F(g, 0, 0, W, 2, '#f6f0de'); F(g, 0, 5, W, 1, CR[1]); AO(g, 0, 6, W, 2, 0.4); F(g, 0, H - 2, W, 2, CR[3]); F(g, 0, 0, 3, H, CR[3]); F(g, W - 3, 0, 3, H, CR[1]);
  var cx = nx0 + (nw >> 1);
  teja(g, nx0, 10, nw, H - 14, TR, 0); LI(g, nx0, 10, nw >> 1, H - 14, 0.12); AO(g, cx, 10, nw >> 1, H - 14, 0.2); F(g, cx - 1, 10, 2, H - 14, TR[4]);              // nave larga
  teja(g, nx0 - 18, ty, nw + 36, 26, TR, 2); LI(g, nx0 - 18, ty, nw + 36, 13, 0.1); AO(g, nx0 - 18, ty + 13, nw + 36, 13, 0.2); F(g, nx0 - 18, ty + 12, nw + 36, 2, TR[4]);   // crucero
  DISC(g, cx, ty + 13, 8, ST_(0)); DISC(g, cx - 1, ty + 12, 6, ST_(1)); F(g, cx, ty + 4, 1, 5, '#e6c85a'); F(g, cx - 1, ty + 5, 3, 1, '#e6c85a');
  var tw = clamp(Math.round(W * 0.2), 34, 46), kx = 6 + (tw >> 1);
  for (i = 0; i < tw / 2; i++) F(g, 6 + i, 20 + i, tw - i * 2, tw - i * 2, i % 2 ? TR[2] : TR[3]);
  LN(g, 6, 20, 6 + tw / 2, 20 + tw / 2, TR[0]); LN(g, 6 + tw, 20, 6 + tw / 2, 20 + tw / 2, TR[0]); LN(g, 6, 20 + tw, 6 + tw / 2, 20 + tw / 2, TR[1]); LN(g, 6 + tw, 20 + tw, 6 + tw / 2, 20 + tw / 2, TR[1]);
  F(g, kx, 20 + (tw >> 1) - 3, 1, 5, '#e6c85a'); F(g, kx - 1, 20 + (tw >> 1) - 2, 3, 1, '#e6c85a');
  return lotDone(c);
}
function ST_(k) { return ['#6f9484', '#8fb4a2'][k]; }
S.lotArch.br_iglesia = function (f) { var c = lotCtx(f); return c.side === 'S' ? iglesiaBR_S(c) : iglesiaBR_N(c); };
function bakeLotes() { /* los lotes se registran al cargar (S.lotArch.br_*); aqui solo se avisa */ L.lotes = ['br_biblioteca', 'br_iglesia']; }

/* ============================ HORA (atardecer -> noche) ============================
 * L.getHora() -> 0..1: 0 atardecer dorado, 0.5 crepusculo morado, 1 noche cerrada.
 * Fuente: L.setHora(h) (fija; setHora(null) la suelta) > ACH.br.hora (numero o funcion) > ACH.noche.t > 0. */
var horaFija = null;
L.hora = 0;
L.setHora = function (h) { horaFija = (typeof h === 'number' && isFinite(h)) ? clamp(h, 0, 1) : null; L.hora = horaFija === null ? L.hora : horaFija; };
L.getHora = function () {
  if (horaFija !== null) return horaFija;
  try {
    var b = ACH.br, h;
    if (b) { h = b.hora; if (typeof h === 'function') h = h.call(b); if (typeof h === 'number' && isFinite(h)) return (L.hora = clamp(h, 0, 1)); }
    var N = ACH.noche;
    if (N && typeof N.t === 'number') return (L.hora = clamp(N.t, 0, 1));
  } catch (e) { /* nada */ }
  return L.hora || 0;
};
function horaMix(H) { var k; if (H <= 0.5) { k = smooth(H / 0.5); return [0, 1, k]; } k = smooth((H - 0.5) / 0.5); return [1, 2, k]; }
function hexMix3(stops, f) {                                   // color interpolado en una lista de colores (f 0..1)
  var n = stops.length - 1, p = clamp(f, 0, 1) * n, i = Math.min(n - 1, Math.floor(p));
  return mx(stops[i], stops[i + 1], p - i);
}
function ditherStops(stops, f, x, y) {                          // color de una rampa con dither Bayer 4x4 entre dos colores vecinos
  var n = stops.length - 1, p = clamp(f, 0, 0.9999) * n, i = Math.floor(p), fr = clamp((p - i - 0.34) / 0.32, 0, 1);
  return fr > bay(x, y) ? stops[i + 1] : stops[i];
}

/* ============================ MAR (a la izquierda = oeste) ============================ */
var MAR = { rect: { x0: 0, y0: 0, x1: 160, y1: 1600 }, glintY: 1180, lap: 6 };
var SEAP = [
  { far: '#3a5e6c', near: '#6e9a98', rip: ['#ffd9a0', '#f4b878', '#1e4452'], foam: '#f4efe0' },        // atardecer dorado: verde grisaceo con reflejo calido
  { far: '#23385a', near: '#3f5f80', rip: ['#d89a98', '#9a7aa8', '#142238'], foam: '#e0d8dc' },        // crepusculo
  { far: '#070e22', near: '#1a2c4a', rip: ['#6f8fc0', '#4c6a9a', '#050a18'], foam: '#9fb8cc' }          // noche
];
var seaCache = {};
function seaBaseCanvas(v, w) {                                  // gradiente horizontal con dither: lejos (izq) -> cerca (der); w x 64
  var key = v + ':' + w; if (seaCache[key]) return seaCache[key];
  var g = new G(w, 64), P0 = SEAP[v], x, y, st = [P0.far, mx(P0.far, P0.near, 0.4), mx(P0.far, P0.near, 0.75), P0.near], n = noiseFn(13 + v, 24, 14, 8, 4);
  for (x = 0; x < w; x++) for (y = 0; y < 64; y++) {
    var f = Math.pow(x / Math.max(1, w - 1), 0.8) + (n(x % 192, 0) - 0.5) * 0.1;
    g.set(x, y, ditherStops(st, f, x, y));
  }
  return (seaCache[key] = g.toCanvas());
}
function rippleTile(v, layer) {                                 // 128x128 periodico: crestas claras y senos oscuros
  var g = new G(128, 128), P0 = SEAP[v], x, y, n1 = noiseFn(31 + layer * 7, 16, 4, 8, 32), n2 = noiseFn(41 + layer * 5, 8, 2, 16, 64);
  for (y = 0; y < 128; y++) for (x = 0; x < 128; x++) {
    var vv = n1(x, y) * 0.8 + n2(x, y) * 0.35, q = (vv * 5.2) % 1;
    if (q < 0.07 && n2(x + 3, y) > 0.35) g.set(x, y, P0.rip[0] + (layer ? '90' : 'b8'));
    else if (q > 0.07 && q < 0.13 && n1(x + 9, y + 5) > 0.5) g.set(x, y, P0.rip[1] + (layer ? '50' : '78'));
    else if (q > 0.55 && q < 0.6 && n2(x, y + 7) > 0.55) g.set(x, y, P0.rip[2] + '60');
  }
  return g.toCanvas();
}
function glintFrame(f, night) {                                 // reflejo del sol (o la luna) sobre el agua, converge hacia el horizonte (izquierda)
  var W = 240, H = 100, g = new G(W, H), r = rng(900 + f * 13 + (night ? 7 : 0)), i, cols = night ? ['#e8f0ff', '#a8c4f0', '#6f8fc0'] : ['#fff6cc', '#ffd884', '#ffb458'];
  for (i = 0; i < (night ? 70 : 190); i++) {
    var u = Math.pow(r(), 0.7), x = Math.floor(u * (W - 6)), spread = 3 + u * 40, y = Math.floor(H / 2 + (r() + r() + r() - 1.5) * spread * 0.8);
    if (y < 1 || y > H - 2) continue;
    var len = 1 + Math.floor(u * (night ? 3 : 5) * r() + r() * 2), c = cols[(r() * 3) | 0], a = Math.round(clamp(90 + (1 - Math.abs(y - H / 2) / spread) * 130, 40, 230)).toString(16);
    for (var k = 0; k < len; k++) P(g, x + k, y, c + (a.length < 2 ? '0' + a : a));
  }
  return g.toCanvas();
}
function lightsReflect(f) {                                     // reflejos calidos de los faroles de la costa en el agua de noche
  var W = 40, H = 220, g = new G(W, H), r = rng(1300 + f * 17), i;
  for (i = 0; i < 46; i++) { var x = W - 2 - Math.floor(Math.pow(r(), 1.7) * (W - 4)), y = Math.floor(r() * (H - 4)); var c = r() < 0.7 ? '#ffd078' : '#ffa850'; P(g, x, y, c + 'b0'); if (r() < 0.5) P(g, x - 1, y, c + '70'); if (r() < 0.3) P(g, x - 2, y, c + '40'); }
  return g.toCanvas();
}
function foamStrip(night, shift) {                              // 28 x 128 periodico en vertical: espuma en el borde de la orilla (x ~ 18)
  var W = 28, H = 128, g = new G(W, H), y, x, r = rng(1500 + (night ? 3 : 0) + shift), col = night ? SEAP[2].foam : SEAP[0].foam;
  for (y = 0; y < H; y++) {
    var e = 18 + Math.sin((y + shift * 40) * 0.2) * 3 + Math.sin((y + shift * 17) * 0.54) * 1.8;
    for (x = 0; x < W; x++) {
      var d = x - e;
      if (d > -1.2 && d < 1.2) g.set(x, y, col + 'f0');
      else if (d >= 1.2 && d < 2.4) g.set(x, y, col + (hash2(x, y, 3) < 0.5 ? 'a0' : '50'));
      else if (d <= -1.2 && d > -4.2 && hash2(x, y, 7 + shift) < 0.32) g.set(x, y, col + '88');
      else if (d >= 2.4 && d < 9) g.set(x, y, (night ? '#0a1224' : '#3e382f') + (d < 5 ? '58' : '30'));
    }
  }
  return g.toCanvas();
}
function gullG(f) {
  var g = new G(13, 7);
  if (f === 0) { g.line(0, 2, 4, 4, '#f4f4f0'); g.line(4, 4, 6, 3, '#f4f4f0'); g.line(12, 2, 8, 4, '#f4f4f0'); g.line(8, 4, 6, 3, '#f4f4f0'); g.set(6, 4, '#c8c8c4'); g.set(5, 4, '#e8e8e4'); g.set(7, 4, '#e8e8e4'); g.set(6, 5, '#f0a030'); g.set(0, 2, '#3a3a44'); g.set(12, 2, '#3a3a44'); }
  else { g.line(0, 5, 4, 3, '#f4f4f0'); g.line(4, 3, 6, 3, '#f4f4f0'); g.line(12, 5, 8, 3, '#f4f4f0'); g.line(8, 3, 6, 3, '#f4f4f0'); g.set(6, 4, '#c8c8c4'); g.set(6, 5, '#f0a030'); g.set(0, 5, '#3a3a44'); g.set(12, 5, '#3a3a44'); }
  return g.toCanvas();
}
var MARB = null;
function bakeMar() {
  MARB = { ripA: [0, 1, 2].map(function (v) { return rippleTile(v, 0); }), ripB: [0, 1, 2].map(function (v) { return rippleTile(v, 1); }), glint: [0, 1, 2].map(function (f) { return glintFrame(f, false); }), moon: [0, 1, 2].map(function (f) { return glintFrame(f, true); }), lights: [0, 1].map(lightsReflect), foam: [foamStrip(false, 0), foamStrip(false, 1), foamStrip(true, 0), foamStrip(true, 1)], gull: [gullG(0), gullG(1)] };
  MAR.draw = marDraw; MAR.setRect = function (x0, y0, x1, y1) { MAR.rect = { x0: x0, y0: y0, x1: x1, y1: y1 }; };
  L.mar = MAR;
}
function marDraw(ctx, camX, camY, t, W) {
  W = W || 480; t = t || 0;
  var R = MAR.rect, sx0 = Math.round(R.x0 - camX), sx1 = Math.round(R.x1 - camX), sy0 = Math.round(R.y0 - camY), sy1 = Math.round(R.y1 - camY), SH_ = 270, i, x, y;
  if (!MARB || sx1 + 16 <= 0 || sx0 >= W || sy1 <= 0 || sy0 >= SH_) return;
  var H = L.getHora(), hm = horaMix(H), a = hm[0], b = hm[1], k = hm[2], vy0 = Math.max(0, sy0), vy1 = Math.min(SH_, sy1), vx0 = Math.max(0, sx0), vx1 = Math.min(W, sx1 + 8);
  var wBase = Math.max(8, R.x1 - R.x0 + 8);
  ctx.save(); ctx.beginPath(); ctx.rect(vx0, vy0, vx1 - vx0, vy1 - vy0); ctx.clip();
  function base(v, al) {
    var c = seaBaseCanvas(v, wBase); ctx.globalAlpha = al;
    for (y = sy0 + Math.floor((vy0 - sy0) / 64) * 64; y < vy1; y += 64) ctx.drawImage(c, sx0, y);
  }
  base(a, 1); if (k > 0.01) base(b, k);
  // ondas: dos capas que se deslizan en sentidos contrarios (periodicas 128)
  function ripples(set, al, layer) {
    if (al < 0.02) return; ctx.globalAlpha = al;
    var ox = Math.floor(layer ? -t * 2.2 : t * 4.5) % 128, oy = Math.floor(layer ? t * 1.1 : Math.sin(t * 0.4) * 3);
    var tile = set[layer ? 1 : 0] || set[0], y0a = sy0 + oy, x0a = sx0 + (((ox % 128) + 128) % 128) - 128;
    y0a += Math.floor((vy0 - y0a) / 128) * 128; x0a += Math.floor((vx0 - x0a) / 128) * 128;
    for (y = y0a; y < vy1; y += 128) for (x = x0a; x < vx1; x += 128) ctx.drawImage(tile, x, y);
  }
  var warm = 1 - smooth(clamp(H / 0.45, 0, 1)), mid = smooth(clamp(H / 0.5, 0, 1)) * (1 - smooth(clamp((H - 0.5) / 0.5, 0, 1))), cool = smooth(clamp((H - 0.4) / 0.6, 0, 1));
  ripples([MARB.ripA[0], MARB.ripB[0]], 0.9 * warm, 0); ripples([MARB.ripA[0], MARB.ripB[0]], 0.7 * warm, 1);
  ripples([MARB.ripA[1], MARB.ripB[1]], 0.9 * mid, 0); ripples([MARB.ripA[1], MARB.ripB[1]], 0.7 * mid, 1);
  ripples([MARB.ripA[2], MARB.ripB[2]], 0.9 * cool, 0); ripples([MARB.ripA[2], MARB.ripB[2]], 0.7 * cool, 1);
  // reflejo del sol (atardecer) / de la luna y las luces de la costa (noche)
  var fi = Math.floor(t * 3) % 3, gy = Math.round(R.y0 + MAR.glintY - camY - 50), gx = sx1 - 240 + 8;
  var gA = (1 - smooth(clamp(H / 0.7, 0, 1))), gN = smooth(clamp((H - 0.55) / 0.45, 0, 1));
  if (gA > 0.02 && gy < vy1 && gy + 100 > vy0) { ctx.globalAlpha = gA; ctx.drawImage(MARB.glint[fi], gx, gy); }
  if (gN > 0.02) {
    ctx.globalAlpha = gN * 0.75; if (gy < vy1 && gy + 100 > vy0) ctx.drawImage(MARB.moon[(fi + 1) % 3], gx, gy);
    ctx.globalAlpha = gN; for (y = sy0 - 220 + Math.floor((vy0 - sy0) / 220) * 220; y < vy1; y += 220) ctx.drawImage(MARB.lights[Math.floor(t * 1.5) % 2], sx1 - 38, y);
  }
  ctx.globalAlpha = 1;
  // gaviotas al atardecer
  if (H < 0.8) {
    var fr = Math.floor(t * 5) % 2, ga = 1 - smooth(clamp((H - 0.4) / 0.4, 0, 1)); ctx.globalAlpha = ga;
    for (i = 0; i < 4; i++) {
      var gxx = Math.round(R.x0 + 30 + ((i * 53 + t * (9 + i * 2)) % (R.x1 - R.x0 - 40)) - camX), gyy = Math.round(R.y0 + 90 + i * 150 + Math.sin(t * 0.9 + i * 1.7) * 7 - camY);
      if (gxx > -14 && gxx < W + 14 && gyy > -8 && gyy < SH_) ctx.drawImage(MARB.gull[(fr + i) % 2], gxx, gyy);
    }
    ctx.globalAlpha = 1;
  }
  // espuma que sube y baja en la orilla (dos capas en contrafase)
  var nA = smooth(clamp((H - 0.35) / 0.4, 0, 1)), l1 = Math.round(Math.sin(t * 1.25) * 4), l2 = Math.round(Math.sin(t * 0.95 + 2.3) * 4);
  function foam(day, night, ox, oy, al) {
    for (y = sy0 + oy - 128 + Math.floor((vy0 - sy0 - oy) / 128) * 128; y < vy1; y += 128) {
      ctx.globalAlpha = al * (1 - nA); ctx.drawImage(day, sx1 - 18 + ox, y);
      if (nA > 0.02) { ctx.globalAlpha = al * nA; ctx.drawImage(night, sx1 - 18 + ox, y); }
    }
  }
  foam(MARB.foam[0], MARB.foam[2], l1 - 8, 0, 1); foam(MARB.foam[1], MARB.foam[3], l2 - 14, 64, 0.8);
  ctx.globalAlpha = 1; ctx.restore();
}

/* ============================ MORRO SOLAR AL FONDO (cielo panza de burro + silueta + la cruz/Cristo) ============================
 * Banda horneada de 1280 x 184 (3 horas). Cielo arriba, horizonte con el mar a ~140, acantilado oscuro al pie (12 px) que hace de borde del mapa.
 * Se dibuja pegada al TOPE del mapa (y0 = fila de arriba, ver nota); paralaje 0.42. La cruz se enciende de noche (luces de colores que cambian). */
var MORRO = { y0: 0, h: 184, w: 1280, horizon: 138, mundoW: 2400, cruz: { x: 930, y: 60 } };
var morroStrips = null;
var SKY = [
  ['#4a4274', '#8a4a6e', '#c8553d', '#f08a5a', '#f7c07a'],        // dorado
  ['#1f2250', '#4a3470', '#9a4a6a', '#d0645a', '#e89a6a'],        // crepusculo
  ['#050a1c', '#0b1430', '#16224a', '#243a68', '#3a4e78']         // noche
];
var DECK = [['#6e6a80', '#8a8096', '#b0929a', '#e0a080'], ['#3c3a5c', '#58507a', '#8a6078', '#b86a70'], ['#0c1226', '#141c36', '#1e2a48', '#2c3a5c']];
var MSIL = [['#3a3652', '#5a5072', '#8a6a88'], ['#22223c', '#38345a', '#6a4a6e'], ['#0a1022', '#101830', '#1a2440']];
function morroStrip(v) {
  var W = MORRO.w, H = MORRO.h, hz = MORRO.horizon, g = new G(W, H), x, y, i, r = rng(5150 + v), st = SKY[v], dk_ = DECK[v], ms = MSIL[v];
  var nA = noiseFn(51, 90, 40, 14), nB = noiseFn(52, 23, 11, 56), nC = noiseFn(53, 40, 30, 32), nR = noiseFn(54, 14, 9, 90);
  var sunX = 250, sunY = hz - 8, night = v === 2;
  // cielo en bandas con dither
  for (y = 0; y < hz; y++) for (x = 0; x < W; x++) {
    var f = Math.pow(y / hz, 0.85);
    g.set(x, y, ditherStops(st, f, x, y));
  }
  // halo del sol (atardecer y crepusculo)
  if (!night) {
    var halo = v === 0 ? '#ffd890' : '#e8885a', hr = v === 0 ? 92 : 70;
    for (y = Math.max(0, sunY - hr); y < hz; y++) for (x = Math.round(sunX - hr * 1.7); x < sunX + hr * 1.7; x++) {
      var dx = (x - sunX) / 1.7, dy = y - sunY, d = Math.sqrt(dx * dx + dy * dy) / hr; if (d > 1) continue;
      if ((1 - d) * 0.8 > bay(x, y) * 0.9 + 0.1 && x >= 0 && x < W) { var cc = g.get(x, y); g.set(x, y, mx(cc, halo, 0.55)); }
    }
    DISC(g, sunX, sunY, 17, v === 0 ? '#ffb85a' : '#d8604a'); DISC(g, sunX, sunY, 13, v === 0 ? '#ffe08a' : '#f08a5a'); DISC(g, sunX - 1, sunY - 1, 8, v === 0 ? '#fff6d0' : '#ffb078');
  } else {
    for (i = 0; i < 150; i++) { var sx = Math.floor(r() * W), sy = Math.floor(r() * (hz - 30)); P(g, sx, sy, r() < 0.2 ? '#f4f0ff' : (r() < 0.5 ? '#aab8e0' : '#6a7aa8')); if (r() < 0.08) { P(g, sx + 1, sy, '#8a9ac8'); P(g, sx, sy + 1, '#8a9ac8'); } }
  }
  if (night) { for (y = 24; y < 52; y++) for (x = 1078; x < 1104; x++) { var d1 = Math.hypot(x - 1090, y - 36), d2 = Math.hypot(x - 1094, y - 33); if (d1 < 8 && d2 > 6.6) g.set(x, y, '#eef2ff'); else if (d1 < 8 && d2 <= 6.6) g.set(x, y, ditherStops(st, Math.pow(y / hz, 0.85), x, y)); else if (d1 < 13 && d1 >= 8 && bay(x, y) < 0.18) g.set(x, y, '#1a2a50'); } }
  // capa de nubes "panza de burro": gris violaceo, borde inferior ondulado, rota cerca del sol
  var deckEdge = function (xx) { var gap = Math.max(0, 1 - Math.abs(xx - sunX) / 190); return 40 + nA(xx, 10) * 36 + nB(xx, 20) * 10 - gap * (v === 0 ? 34 : 22); };
  for (x = 0; x < W; x++) {
    var e = Math.round(deckEdge(x));
    for (y = 0; y < e; y++) {
      var n = nC(x, y) * 0.6 + nB(x, y * 2) * 0.4, tone = clamp(Math.floor(n * 3.2 + (y / e) * 0.6), 0, 2);
      var c = dk_[tone];
      if (e - y < 9) c = (e - y < 3) ? dk_[3] : mx(dk_[2], dk_[3], 1 - (e - y) / 9);        // el vientre del nubarron recibe luz del horizonte
      if (night && e - y < 5 && hash2(x, y, 3) < 0.4) c = dk_[2];
      g.set(x, y, c);
    }
    if (e < 60) for (var q = e; q < e + 3; q++) if (bay(x, q) < 0.4) g.set(x, q, dk_[3]);
  }
  // colinas lejanas (Agua Dulce / Chorrillos), el Morro Solar y la ladera que baja al sur
  function ridge(xx) {
    var m = 0; var u = (xx - 560) / (1250 - 560);
    if (u > 0 && u < 1) { var s = u < 0.52 ? Math.pow(u / 0.52, 1.4) : Math.pow((1 - u) / 0.48, 1.2); m = 86 * s; }
    var far = 16 * Math.max(0, 1 - Math.abs(xx - 380) / 230) + 11 * Math.max(0, 1 - Math.abs(xx - 120) / 150) + 9 * Math.max(0, 1 - Math.abs(xx - 1260) / 110);
    return Math.max(m, far) + (nR(xx, 4) - 0.5) * (m > 20 ? 9 : 4) + (nB(xx, 7) - 0.5) * 3;
  }
  for (x = 0; x < W; x++) {
    var h = Math.round(ridge(x)), mass = h > 22, slope = ridge(x + 4) - ridge(x - 4);
    for (y = hz - h; y < hz; y++) {
      var up = (y - (hz - h)) / Math.max(1, h), c2 = mass ? (slope > 0.4 ? ms[2] : ms[1]) : mx(ms[1], st[4], 0.35);
      if (mass) { var shade = nB(x * 0.9, y * 2.4); if (shade > 0.68) c2 = (c2 === ms[2] ? ms[1] : ms[0]); else if (shade < 0.25 && c2 === ms[1]) c2 = ms[2]; }
      if (y === hz - h) c2 = mass ? ms[0] : mx(ms[1], st[4], 0.2);
      var hazeAmt = Math.pow(up, 2.2) * (night ? 0.1 : 0.7);
      if (hazeAmt > 0.04 && bay(x, y) < hazeAmt) c2 = mx(c2, st[4], 0.45);              // bruma: la base se pierde en el horizonte
      g.set(x, y, c2);
    }
  }
  // mar: espejo del cielo, mas oscuro hacia abajo
  for (y = hz; y < H - 12; y++) for (x = 0; x < W; x++) {
    var f2 = (y - hz) / (H - 12 - hz), base = night ? ['#16264a', '#0a1430', '#050a1c'] : (v === 0 ? ['#d89a78', '#7a8a8e', '#3e6a72'] : ['#a0607a', '#4a5a7a', '#26385a']);
    var cc2 = ditherStops(base, f2, x, y);
    if (y < hz + 3 && (x + y) % 3 === 0) cc2 = mx(cc2, st[4], 0.5);
    g.set(x, y, cc2);
  }
  for (i = 0; i < (night ? 260 : 120); i++) { var gx2 = night ? 1080 + Math.floor(r() * 100 - 50) : sunX + Math.floor((r() - 0.5) * 110), gy2 = hz + 1 + Math.floor(r() * (H - 14 - hz)); P(g, gx2, gy2, night ? (r() < 0.5 ? '#aab8e0' : '#6a7aa8') : (r() < 0.5 ? '#ffe49a' : '#ffb458')); }
  if (night) {                                                                                                         // luces de la costa y del serpenteo de la bajada al Morro
    for (i = 0; i < 90; i++) { var lx = 560 + Math.floor(r() * 700), ly = hz - 2 - Math.floor(r() * Math.min(26, ridge(lx) - 4)); if (ridge(lx) > 10) P(g, lx, ly, r() < 0.7 ? '#ffd070' : '#ffa850'); }
    for (var z = 0; z < 22; z++) P(g, 840 + z * 4 + (z % 2) * 3, hz - 14 - z * 2.4, '#ffe090');
    for (i = 0; i < 40; i++) { var lx2 = 20 + Math.floor(r() * 520); if (ridge(lx2) > 6) P(g, lx2, hz - 2 - Math.floor(r() * 8), '#ffc860'); }
  }
  // el Cristo del Pacifico / la cruz de la cumbre
  var cx = MORRO.cruz.x, cy = hz - Math.round(ridge(cx)) - 2;
  MORRO.cruz.y = cy;
  var CW = night ? '#fffbe8' : (v === 0 ? '#f6e8d8' : '#d8c0c8');
  F(g, cx - 1, cy - 17, 3, 17, CW); F(g, cx - 7, cy - 14, 15, 2, CW); F(g, cx - 1, cy - 19, 3, 2, CW); F(g, cx - 3, cy - 1, 7, 2, ms[0]);
  if (night) { for (y = cy - 20; y < cy + 2; y++) for (x = cx - 11; x < cx + 12; x++) { var dd = Math.hypot(x - cx, (y - (cy - 9)) * 0.9); if (dd < 11 && dd > 4 && bay(x, y) < (1 - dd / 11) * 0.6) { var c3 = g.get(x, y); g.set(x, y, mx(c3 || '#0a1022', '#fff0b0', 0.4)); } } }
  
  // borde del mundo: acantilado verde oscuro con enredaderas, al pie de la banda
  for (x = 0; x < W; x++) {
    var ey = H - 12 + Math.round(nR(x, 3) * 5 - 2 + Math.sin(x * 0.07) * 2);
    for (y = ey; y < H; y++) { var depth2 = (y - ey) / Math.max(1, H - ey); g.set(x, y, night ? (depth2 < 0.3 ? '#0a1a14' : '#050e0c') : (v === 0 ? (depth2 < 0.25 ? '#3f5a3a' : '#243a26') : (depth2 < 0.25 ? '#2a3a40' : '#16242a'))); }
    if (hash2(x, 3, 9) < 0.05) P(g, x, ey - 1, night ? '#12261c' : '#4f7a46');
    if (hash2(x, 5, 9) < 0.03) P(g, x, ey + 2, night ? '#5a1a3a' : '#c2185b');
    if (night && hash2(x, 8, 9) < 0.012) P(g, x, ey + 3, '#ffd070');
  }
  return g.toCanvas();
}
var CRUZ_LUCES = ['#ff5a5a', '#ffd84a', '#5aff8a', '#5ab4ff', '#ff7ae0', '#fff0b0'];
function bakeMorro() {
  MORRO.draw = function (ctx, camX, camY, t, W) { if (!morroStrips) { try { morroStrips = [0, 1, 2].map(morroStrip); } catch (e) { morroStrips = null; MORRO.draw = function () {}; if (window.console) console.warn('[arte-lugares] cielo', e); return; } } morroDraw(ctx, camX, camY, t, W); };       // se hornea al primer uso (no es parte del arranque)
  MORRO.setY0 = function (y) { MORRO.y0 = y | 0; };
  MORRO.setMundo = function (w) { MORRO.mundoW = Math.max(520, w | 0); };
  L.cielo = MORRO;
}
function morroDraw(ctx, camX, camY, t, W) {
  W = W || 480; t = t || 0;
  var SH_ = 270, top = Math.round(MORRO.y0 - camY);
  if (!morroStrips || top >= SH_ || top + MORRO.h <= 0) return;
  var par = clamp((MORRO.w - W) / Math.max(1, MORRO.mundoW - W), 0, 1), off = Math.round(camX * par), H = L.getHora(), hm = horaMix(H);
  var sy = Math.max(0, -top), dh = Math.min(MORRO.h - sy, SH_ - Math.max(0, top)), dy = Math.max(0, top);
  if (dh <= 0) return;
  var sx = clamp(off, 0, MORRO.w - W);
  ctx.globalAlpha = 1; ctx.drawImage(morroStrips[hm[0]], sx, sy, W, dh, 0, dy, W, dh);
  if (hm[2] > 0.01) { ctx.globalAlpha = hm[2]; ctx.drawImage(morroStrips[hm[1]], sx, sy, W, dh, 0, dy, W, dh); ctx.globalAlpha = 1; }
  // luces de colores del Cristo (solo de noche): 6 puntitos que cambian
  var nA = smooth(clamp((H - 0.45) / 0.4, 0, 1));
  if (nA > 0.05) {
    var cx = MORRO.cruz.x - sx, cy = top + MORRO.cruz.y;
    if (cx > -14 && cx < W + 14 && cy > -4 && cy < SH_ + 20) {
      ctx.globalAlpha = nA;
      var step = Math.floor(t * 2.2);
      for (var i = 0; i < 6; i++) { ctx.fillStyle = CRUZ_LUCES[(i + step) % 6]; var ox = [-7, 6, 0, -3, 3, 0][i], oy = [-14, -14, -19, -4, -4, -10][i]; ctx.fillRect(cx + ox, cy + oy, 2, 2); }
      ctx.globalAlpha = 1;
    }
  }
}
function bakeFondos() { bakeMar(); bakeMorro(); bakeHead(); }

/* ============================ EL MORRO SOLAR VISTO DESDE ARRIBA (lomas al sur de la bahia) ============================
 * L.morro.draw(ctx, camX, camY, t, W): el cabo del Morro Solar como tierra lejana y brumosa al pie del mapa (mundo x 0..640, y 1488..1600), con el Cristo
 * (la cruz blanca) en la cumbre; el mar se ve por debajo (lo pone L.mar / el mapa). De noche se encienden la cruz (luces de colores) y las luces de Chorrillos.
 * Se pinta SIN recorte propio: el mapa lo recorta a su banda de mar. La banda del cielo con el skyline (L.cielo) queda aparte. */
var HEAD = { x0: 0, y0: 1488, w: 640, h: 112, cruz: { x: 432, y: 86 }, base: 108 };
var headStrips = null;
function headStrip(v) {
  var W = HEAD.w, H = HEAD.h, B = HEAD.base, g = new G(W, H), x, y, i, r = rng(6100 + v), night = v === 2;
  var nA = noiseFn(61, 70, 40, 9, 3), nB = noiseFn(62, 22, 14, 29, 8), nC = noiseFn(63, 10, 8, 64, 14);
  var haze = ['#c8a898', '#9a7e98', '#2a3660'][v];
  var LAND = [['#5a4a50', '#7a6268', '#9a7e80', '#b89a92', '#d4b8a8'], ['#2c2a44', '#443e5c', '#625470', '#80687c', '#9a808c'], ['#0a1022', '#101830', '#16203c', '#1e2a4a', '#2a3a5c']][v];
  var SAND = ['#8a7a6c', '#a89886', '#c0b098'][0];
  function prof(xx) { return 32 * Math.exp(-Math.pow((xx - 440) / 120, 2)) + 12 * Math.exp(-Math.pow((xx - 250) / 90, 2)) + 7 * Math.exp(-Math.pow((xx - 40) / 60, 2)) + (nA(xx, 5) - 0.5) * 5; }
  for (x = 0; x < W; x++) {
    var top = B - Math.round(prof(x)), sl = prof(x + 3) - prof(x - 3);
    if (top < 16) top = 16;
    for (y = top; y < H; y++) {
      var depth = (y - top) / Math.max(1, H - top), c, st = nB(x, y * 1.6), tone = 2;
      if (sl > 0.5) tone = 3; else if (sl < -0.5) tone = 1;                           // luz del oeste: laderas que miran al oeste claras
      if (st > 0.68) tone = Math.max(0, tone - 1); else if (st < 0.28) tone = Math.min(4, tone + 1);
      if (nC(x, y) > 0.78) tone = Math.max(0, tone - 1);
      c = LAND[tone];
      if (y > B - 6 + (nA(x, 9) * 4 | 0)) c = mx(c, v === 2 ? '#16203c' : '#a89880', 0.45);                // faldas arenosas al pie
      if (y === top) c = LAND[Math.min(4, tone + 1)];
      var hz_ = 0.14 + (1 - depth) * 0.1; c = mx(c, haze, hz_);
      if ((y - top) % 7 === 3 && hash2(x >> 3, y, 4) < 0.6 && y < B - 4) c = mx(c, LAND[0], 0.4);                 // curvas de nivel: terrazas del cerro
      g.set(x, y, c);
    }
    // orilla: banda de aguas someras y espuma, al norte de la tierra
    for (i = 1; i < 6; i++) { if (top - i < 0) break; var a = ['b0', '88', '60', '40', '28'][i - 1], wc = night ? '#2a4a7a' : (v === 0 ? '#9ac8c0' : '#7a98b0'); P(g, x, top - i, wc + a); }
    if (hash2(x, 1, 7) < 0.34) P(g, x, top - 1, (night ? '#9fb8cc' : '#f2eee2') + 'c8');
    if (hash2(x, 2, 7) < 0.14) P(g, x, top - 3, (night ? '#6f8fc0' : '#e0dccb') + '90');
  }
  // camino que sube en zigzag a la cumbre y casitas de Chorrillos en la falda
  var pts = [[470, 108], [455, 100], [468, 94], [450, 90], [460, 86], [436, 84]];
  for (i = 0; i + 1 < pts.length; i++) LN(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], night ? '#e8c070' : mx(LAND[4], '#e8d8c0', 0.5));
  for (i = 0; i < 90; i++) {
    var hx = 150 + Math.floor(r() * 460), ht = B - Math.round(prof(hx)), hy = ht + 6 + Math.floor(r() * (H - ht - 8));
    if (hy < H - 2 && hy > 20) { if (night) { P(g, hx, hy, r() < 0.7 ? '#ffd070' : '#ffa850'); } else { P(g, hx, hy, r() < 0.5 ? '#d8c8b8' : '#b89890'); } }
  }
  if (night) for (i = 0; i < 70; i++) { var lx = Math.floor(r() * W), lt_ = B - Math.round(prof(lx)); P(g, lx, lt_ + 3 + Math.floor(r() * 12), '#ffc860'); }
  // el Cristo del Pacifico: cruz blanca en la cumbre (de noche brilla)
  var cx = HEAD.cruz.x, cy = HEAD.cruz.y, CW = night ? '#fffbe8' : (v === 0 ? '#f6e8d8' : '#d8c0c8');
  F(g, cx - 1, cy - 14, 3, 14, CW); F(g, cx - 6, cy - 11, 13, 2, CW); F(g, cx - 1, cy - 16, 3, 2, CW);
  F(g, cx + 1, cy - 2, 5, 3, night ? '#0a1022' : '#3a3652');                                                          // sombra de la cruz sobre la ladera
  if (night) { for (y = cy - 22; y < cy + 3; y++) for (x = cx - 12; x < cx + 13; x++) { var dd = Math.hypot(x - cx, (y - (cy - 8)) * 0.9); if (dd < 12 && dd > 4 && bay(x, y) < (1 - dd / 12) * 0.55) { var c3 = g.get(x, y); g.set(x, y, mx(c3 && c3.length === 7 ? c3 : '#16203c', '#fff0b0', 0.4)); } } }
  return g.toCanvas();
}
function bakeHead() {
  headStrips = [0, 1, 2].map(headStrip);
  var M2 = { x0: HEAD.x0, y0: HEAD.y0, w: HEAD.w, h: HEAD.h, cruz: { x: HEAD.x0 + HEAD.cruz.x, y: HEAD.y0 + HEAD.cruz.y } };
  M2.setPos = function (x0, y0) { M2.x0 = x0 | 0; M2.y0 = y0 | 0; M2.cruz = { x: M2.x0 + HEAD.cruz.x, y: M2.y0 + HEAD.cruz.y }; };
  M2.draw = function (ctx, camX, camY, t, W) {
    W = W || 480; t = t || 0;
    var SH_ = 270, sx = Math.round(M2.x0 - camX), sy = Math.round(M2.y0 - camY);
    if (!headStrips || sx >= W || sx + HEAD.w <= 0 || sy >= SH_ || sy + HEAD.h <= 0) return;
    var H = L.getHora(), hm = horaMix(H);
    ctx.globalAlpha = 1; ctx.drawImage(headStrips[hm[0]], sx, sy);
    if (hm[2] > 0.01) { ctx.globalAlpha = hm[2]; ctx.drawImage(headStrips[hm[1]], sx, sy); ctx.globalAlpha = 1; }
    var nA = smooth(clamp((H - 0.45) / 0.4, 0, 1));
    if (nA > 0.05) {
      var cx = sx + HEAD.cruz.x, cy = sy + HEAD.cruz.y;
      ctx.globalAlpha = nA; var step = Math.floor(t * 2.2);
      for (var i = 0; i < 6; i++) { ctx.fillStyle = CRUZ_LUCES[(i + step) % 6]; var ox = [-7, 6, 0, -3, 3, 0][i], oy = [-14, -14, -19, -4, -4, -10][i]; ctx.fillRect(cx + ox, cy + oy, 2, 2); }
      ctx.globalAlpha = 1;
    }
  };
  L.morro = M2;
}

/* ============================ HORNEADO ============================ */
var NOW = function () { return (window.performance || Date).now(); }, tm = L.timing = {};
var STAGES = [["tiles", bakeTiles]];
if (typeof bakePlaya === 'function') STAGES.push(["playa", bakePlaya]);
if (typeof bakeMobiliario === 'function') STAGES.push(["mobiliario", bakeMobiliario]);
if (typeof bakePlantas === 'function') STAGES.push(["plantas", bakePlantas]);
if (typeof bakeBajada === 'function') STAGES.push(["bajada", bakeBajada]);
if (typeof bakePuente === 'function') STAGES.push(["puente", bakePuente]);
if (typeof bakeErmita === 'function') STAGES.push(["ermita", bakeErmita]);
if (typeof bakeParque === 'function') STAGES.push(["parque", bakeParque]);
if (typeof bakeLotes === 'function') STAGES.push(["lotes", bakeLotes]);
if (typeof bakeFondos === 'function') STAGES.push(["fondos", bakeFondos]);
STAGES.forEach(function (st) {
  var a = NOW();
  try { st[1](); } catch (e) { if (window.console) console.warn('[arte-lugares] fallo ' + st[0], e); L.errores = (L.errores || []).concat([st[0] + ': ' + (e && e.message) + ' @' + (e && e.stack ? String(e.stack).split('\n')[1] : '')]); }
  tm[st[0]] = Math.round(NOW() - a);
});
L.bakeMs = Math.round(NOW() - T0);
/* Contrato (BARRANCO.md 10.1) + extras. check() devuelve las claves que falten. */
L.provided = {
  tiles: ["arena", "canto", "orilla", "adoquin", "escalon", "tierraQuebrada", "pasto", "vereda", "pista", "losetaParque", "tablasPuente", "pisoErmita"],
  fondos: ["mar", "morro"],
  props: ["torreSalvavidas", "sombrillaPlaya", "restoPlaya", "puentePeatonal", "autoAbandonado", "parapenteTirado", "farolBR", "bancaBR", "basureroBR", "buganvilia", "muroBajada", "palmeraBR", "ficusBR", "casitaBajada", "puente", "ermita", "barandaMirador", "fuenteParque", "estatuaCantora", "kioscoParque", "carritoAnticuchos", "pergola", "cajaCervezas", "munecoPractica"],
  lotes: ["br_biblioteca", "br_iglesia"],
  extras: ["orilla2", "mar (tile)", "muro", "muroPlaya", "tablasPeatonal", "pistaCircuito", "cielo", "getHora", "setHora"]
};
L.check = function () {
  var miss = [];
  ["tiles", "fondos", "props"].forEach(function (g) { L.provided[g].forEach(function (k) { if (!L[k] && !(L.tiles && L.tiles[k])) miss.push(k); }); });
  L.provided.lotes.forEach(function (k) { if (typeof S.lotArch[k] !== "function") miss.push(k); });
  return miss;
};
L.meta = {}; Object.keys(L).forEach(function (k) { var v = L[k], a = Array.isArray(v) ? v[0] : v; if (a && a.width && a.getContext) L.meta[k] = { n: Array.isArray(v) ? v.length : 1, w: a.width, h: a.height, ax: a.ax, ay: a.ay, fw: a.fw, fh: a.fh }; });
})();
