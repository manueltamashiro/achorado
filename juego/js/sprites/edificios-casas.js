/* ACHORADO - js/sprites/edificios-casas.js  (v0.4, fase B)
 * Dueño: sprites (casas)
 * Arquetipos de lote: bodega, ladrillo, pintada, chifa, polleria, botica, ferreteria, cerro, escalera.
 * Registra ACH.sprites.lotArch[arch] = function (ficha, px) -> { canvas, over, overX, overY, lights }  (lados N y S).
 * Publica ACH.px.roofKit: piezas de azotea compartidas (tanque, fierros con botellas, tendal, bidones, antena,
 *   ruma de ladrillos, bolsas de cemento, perro dormido, silla, campana, caja de escalera, macetas, llantas, arena, cilindro, balon de gas).
 *   Firma de cada pieza:  roofKit.tank(g, x, y, o)   con (x, y) = centro-base (la fila donde toca la azotea) y la pieza crece hacia arriba.
 *   roofKit.size[nombre] = [ancho, alto];  roofKit.place(g, nombre, x, y, o);  roofKit.surface(g, x, y, w, h, kind, rnd, tone) pinta una azotea.
 * Medidas: puerta 16x34, ventana 18x16, persiana 44x34 (caja de 4 px incluida), planta baja 48 px (zocalo, puerta, dintel 2, banda 10, cornisa 2),
 *   piso alto 32 px, parapeto 6 px. Luz del noroeste: luz a la izquierda y arriba, sombras al sureste.
 * Se carga despues de js/sprites.js y antes del motor.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px;
var S = ACH.sprites;
if (!px || !S) return;
S.lotArch = S.lotArch || {};
var G = px.G, RAMPS = px.RAMPS, PAL = px.PAL;
var K = '#1c1a22', SH = '#2a2440';
/* v0.6 letreros: ACH.letreros (letreros.js) carga DESPUES de este archivo, pero los lotes se hornean en init, asi que se resuelve tarde.
   Si no existe, las fachadas salen como en v0.4 (sin avisos de marca). */
function Lx() { return ACH.letreros && ACH.letreros.ad ? ACH.letreros : null; }
function brandOf(c, i) { var L = Lx(); return L ? L.brandAt(c.f.c0, c.seed, i + (c.side === 'S' ? 3 : 0)) : null; }
function beerOf(c) { var L = Lx(); if (!L) return null; for (var i = 0; i < 6; i++) { var b = L.brandAt(c.f.c0, c.seed, i); if (b === 'pilsen' || b === 'cristal') return b; } return 'pilsen'; }
function sodaOf(c) { var L = Lx(); if (!L) return null; for (var i = 0; i < 6; i++) { var b = L.brandAt(c.f.c0, c.seed + 5, i); if (b === 'incakola' || b === 'cocacola') return b; } return 'incakola'; }

/* ======================== PRIMITIVAS RAPIDAS (enteros, con recorte) ======================== */
function F(g, x, y, w, h, c) {
  x |= 0; y |= 0; w |= 0; h |= 0;
  var x1 = x + w, y1 = y + h;
  if (x < 0) x = 0; if (y < 0) y = 0; if (x1 > g.w) x1 = g.w; if (y1 > g.h) y1 = g.h;
  for (var j = y; j < y1; j++) { var o = j * g.w; for (var i = x; i < x1; i++) g.d[o + i] = c; }
}
function P1(g, x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.d[y * g.w + x] = c; }
function Q(g, x, y) { x |= 0; y |= 0; return (x >= 0 && y >= 0 && x < g.w && y < g.h) ? g.d[y * g.w + x] : null; }
function frame(g, x, y, w, h, c) { F(g, x, y, w, 1, c); F(g, x, y + h - 1, w, 1, c); F(g, x, y, 1, h, c); F(g, x + w - 1, y, 1, h, c); }

/* Mezcla cacheada: tinter(color, t) -> fn(c) que devuelve c mezclado hacia color en t. Evita recalcular por pixel. */
var tcache = {};
function tinter(col, t) {
  var key = col + t, fn = tcache[key];
  if (fn) return fn;
  var m = {};
  fn = function (c) { return m[c] || (m[c] = px.mix(c, col, t)); };
  return (tcache[key] = fn);
}
function T(g, x, y, w, h, fn) {                                    // aplica fn a cada pixel existente del rectangulo
  x |= 0; y |= 0; w |= 0; h |= 0;
  var x1 = x + w, y1 = y + h;
  if (x < 0) x = 0; if (y < 0) y = 0; if (x1 > g.w) x1 = g.w; if (y1 > g.h) y1 = g.h;
  for (var j = y; j < y1; j++) { var o = j * g.w; for (var i = x; i < x1; i++) { var c = g.d[o + i]; if (c) g.d[o + i] = fn(c); } }
}
function TD(g, x, y, w, h, fn, ph) {                               // lo mismo, tramado ordenado (damero)
  x |= 0; y |= 0; w |= 0; h |= 0; ph = ph | 0;
  var x1 = x + w, y1 = y + h;
  if (x < 0) x = 0; if (y < 0) y = 0; if (x1 > g.w) x1 = g.w; if (y1 > g.h) y1 = g.h;
  for (var j = y; j < y1; j++) { var o = j * g.w; for (var i = x; i < x1; i++) { if (((i + j) & 1) !== ph) continue; var c = g.d[o + i]; if (c) g.d[o + i] = fn(c); } }
}
var tAO = tinter(SH, 0.40), tAO2 = tinter(SH, 0.22), tAO3 = tinter(SH, 0.55), tAO4 = tinter(SH, 0.12);
var tWarm = tinter('#ffcf8a', 0.18);
function randIn(rnd, a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length) % arr.length]; }

/* Mancha irregular: devuelve lista de [dx,dy] centrada en 0,0 con radio perturbado por 8 sectores. */
function blob(rx, ry, rnd) {
  var rad = [], i;
  for (i = 0; i < 8; i++) rad.push(0.62 + rnd() * 0.5);
  var pts = [], PI2 = Math.PI * 2;
  for (var y = -Math.ceil(ry * 1.2); y <= Math.ceil(ry * 1.2); y++) for (var x = -Math.ceil(rx * 1.2); x <= Math.ceil(rx * 1.2); x++) {
    var a = Math.atan2(y / ry, x / rx); if (a < 0) a += PI2;
    var f = a / PI2 * 8, i0 = Math.floor(f) % 8, i1 = (i0 + 1) % 8, t = f - Math.floor(f);
    var r = rad[i0] * (1 - t) + rad[i1] * t;
    var d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
    if (d <= r * r) pts.push([x, y]);
  }
  return pts;
}
function stamp(g, cx, cy, pts, fn) { for (var i = 0; i < pts.length; i++) fn(g, cx + pts[i][0], cy + pts[i][1], pts[i][0], pts[i][1]); }

/* Rampas extra (Chucuito y autoconstruccion) */
var EX = {
  naranja:  ['#6e3a2c', '#a85a38', '#e08a4a', '#eba96a', '#f6cd96'],
  violeta:  ['#3f2c52', '#634080', '#8b5fa3', '#aa82bc', '#cfb0d8'],
  mostaza:  ['#6b5430', '#a8873a', '#d6a94a', '#ecc765', '#f7e3a0'],
  coral:    ['#6e3a3c', '#a8554c', '#ea8574', '#f2a794', '#f9cdb8'],
  turquesa: ['#1f4a4c', '#2f7470', '#4ba096', '#7cc0b0', '#b8dccb'],
  azulVivo: ['#1d2a48', '#2c4a7c', '#3f72b0', '#6a95c8', '#a8c4e0'],
  rojoChifa:['#3f1a1f', '#6a2a2c', '#8f3a32', '#b04a3a', '#cf6a50'],
  tierra:   ['#4a3f3c', '#6b5a48', '#8a7658', '#a8956e', '#c4b088'],
  plastico: ['#1d3a66', '#2f5a9e', '#3f72b0', '#6a95c8', '#a8c4e0'],
  tablaBlanca: ['#6b6c70', '#8f8f8a', '#b9b49c', '#d6d1b8', '#efebdc']
};
function wallOf(name) { return EX[name] || px.wallRamp(name); }
var ROOF = ['#34333e', '#4a4954', '#5e5d66', '#72716f', '#8a887f'];      // azotea: valor 30-42, poca saturacion
var CON = RAMPS.concrete, BR = RAMPS.brick, MT = RAMPS.metal, GL = RAMPS.glass, WD = RAMPS.wood, RU = RAMPS.rust, VG = RAMPS.veg, SAL = RAMPS.salitre;
var BRICK2 = [['#8f5544', '#a86a50'], ['#86503f', '#9d6149'], ['#9a5c48', '#b07556'], ['#7a4638', '#8f5544'], ['#a0624a', '#b87a5a'], ['#8f5544', '#a86a50']];
var MORTAR = '#7a6a66';
var CLOTH = ['#d6d1b8', '#8fb3be', '#d98a9e', '#c9a66b', '#9db59e', '#e0b79a', '#4a6498', '#8f3a32', '#f3efe2', '#e6c85a'];

/* Ladrillo visto: hiladas de 4 px (3 de ladrillo + 1 de mortero), ladrillos de 8, trabados a 4. */
function brickFill(g, x, y, w, h, rnd, o) {
  o = o || {};
  for (var yy = y, course = 0; yy < y + h; yy += 4, course++) {
    var off = (course & 1) ? 4 : 0;
    var bh = Math.min(3, y + h - yy);
    F(g, x, yy + 3, w, 1, MORTAR);
    for (var xx = x - off; xx < x + w; xx += 8) {
      var t = BRICK2[Math.floor(rnd() * BRICK2.length)];
      var bx = Math.max(xx, x), bw = Math.min(xx + 7, x + w) - bx;
      if (bw > 0) { F(g, bx, yy, bw, bh, t[0]); F(g, bx, yy, bw, 1, t[1]); if (rnd() < 0.18) F(g, bx, yy + 2, bw, 1, BR[1]); }
      if (xx + 7 >= x && xx + 7 < x + w) F(g, xx + 7, yy, 1, 3, MORTAR);
    }
  }
}
function columnC(g, x, y, h, w) {                                  // columna de concreto a la vista: luz a la izquierda
  w = w || 4;
  F(g, x, y, w, h, CON[2]); F(g, x, y, 1, h, CON[3]); F(g, x + w - 1, y, 1, h, CON[1]);
  for (var j = 3; j < h; j += 7 + ((j * 7) % 5)) P1(g, x + 1, y + j, CON[1]);
}
function beamC(g, x, y, w, h) {                                    // viga/losa de concreto: filo claro arriba, linea oscura abajo, sombra bajo la losa
  h = h || 4;
  F(g, x, y, w, h, CON[2]); F(g, x, y, w, 1, CON[4]); F(g, x, y + 1, w, 1, CON[3]); F(g, x, y + h - 1, w, 1, CON[1]);
  T(g, x, y + h, w, 1, tAO); T(g, x, y + h + 1, w, 1, tAO2);
}
function wallFill(g, x, y, w, h, A, rnd) {                         // tarrajeo pintado: textura de rodillo, poca
  F(g, x, y, w, h, A[2]);
  var n = (w * h / 70) | 0, i;
  for (i = 0; i < n; i++) { var c = rnd() < 0.55 ? A[3] : A[1]; var xx = x + ((rnd() * w) | 0), yy = y + ((rnd() * h) | 0); P1(g, xx, yy, c); if (rnd() < 0.3) P1(g, xx + 1, yy, c); }
  var s = (w / 12) | 0;
  for (i = 0; i < s; i++) {                                         // chorreras de pintura: lineas verticales tenues
    var sx = x + ((rnd() * w) | 0), sy = y + ((rnd() * h * 0.6) | 0), len = 5 + ((rnd() * 13) | 0), cc = rnd() < 0.6 ? A[3] : A[1];
    for (var j = 0; j < len; j++) if (rnd() < 0.7) P1(g, sx, sy + j, cc);
  }
}

/* ======================== SOMBRAS Y DESGASTE ======================== */
function shadowRoof(g, x, y, w, len) {                            // sombra proyectada al SE sobre la azotea (x = esquina izq de la base)
  for (var j = 0; j < len; j++) {
    var fn = j < len * 0.4 ? tAO3 : (j < len * 0.75 ? tAO : tAO2);
    T(g, x + (j >> 1), y + 1 + j, w, 1, fn);
  }
}
function salitre(g, x, y, w, h, rnd, dmg) {                      // sube desde el piso: tramado ordenado que se rala
  var tS = tinter(SAL[2], 0.5), tS2 = tinter(SAL[1], 0.4), tS3 = tinter(SAL[2], 0.28);
  var hh = h + dmg * 3;
  for (var j = 0; j < hh; j++) {
    var yy = y + h - 1 - j, k = j / hh;
    for (var i = 0; i < w; i++) {
      var xx = x + i, noise = ((i * 7 + j * 13 + ((i >> 2) * 5)) % 7) / 7;
      var th = 1 - k + (noise - 0.5) * 0.5;
      if (th > 0.62) T(g, xx, yy, 1, 1, tS);
      else if (th > 0.4 && ((xx + yy) & 1) === 0) T(g, xx, yy, 1, 1, tS2);
      else if (th > 0.22 && ((xx + yy * 2) & 3) === 0) T(g, xx, yy, 1, 1, tS3);
    }
  }
}
function drip(g, x, y, len, t) {                                  // chorrera oscura que baja de un alfeizar, perno o parapeto
  var fn = tinter('#3a2a30', t || 0.38), fn2 = tinter('#3a2a30', (t || 0.38) * 0.5);
  for (var j = 0; j < len; j++) T(g, x, y + j, 1, 1, j > len - 3 ? fn2 : fn);
}
function rustStreak(g, x, y, len, rnd) {
  var fn = tinter('#8a4b38', 0.55), fn2 = tinter('#8a4b38', 0.3);
  for (var j = 0; j < len; j++) { T(g, x, y + j, 1, 1, j < len * 0.6 ? fn : fn2); if (j % 5 === 2 && rnd() < 0.6) T(g, x + 1, y + j, 1, 1, fn2); }
}
function peel(g, cx, cy, rx, ry, A, rnd, brick) {                // pintura descascarada: deja ver tarrajeo gris y a veces ladrillo
  var pts = blob(rx, ry, rnd), under = [CON[2], CON[3]];
  stamp(g, cx, cy, pts, function (gg, x, y, dx, dy) { if (Q(gg, x, y)) P1(gg, x, y, ((dx + dy) & 1) ? under[0] : under[1]); });
  if (brick) { var bp = blob(rx * 0.5, ry * 0.5, rnd); stamp(g, cx + 1, cy, bp, function (gg, x, y) { if (Q(gg, x, y)) P1(gg, x, y, ((x + y) & 1) ? BR[2] : BR[1]); }); }
  // borde: 1 px de sombra en el lado SE y filo claro de pintura en el NO
  stamp(g, cx, cy, pts, function (gg, x, y, dx, dy) {
    if (!Q(gg, x + 1, y + 1) || (gg.d[((y + 1) | 0) * gg.w + (x + 1)] === A[2])) { /* borde SE */ P1(gg, x, y, CON[1]); }
  });
}
function crack(g, x, y, len, rnd, dir) {
  var c = tinter('#2a2030', 0.55), xx = x;
  for (var j = 0; j < len; j++) { T(g, xx, y + j, 1, 1, c); var r = rnd(); if (r < 0.3) xx += (dir || 1); else if (r < 0.45) xx -= (dir || 1); }
}
function plasterPatch(g, x, y, w, h, A, rnd) {                    // parche de cemento sin pintar con marcas de llana
  F(g, x, y, w, h, CON[3]);
  for (var i = 0; i < w * h / 8; i++) P1(g, x + ((rnd() * w) | 0), y + ((rnd() * h) | 0), rnd() < 0.5 ? CON[2] : CON[4]);
  F(g, x, y + h - 1, w, 1, CON[2]); F(g, x + w - 1, y, 1, h, CON[2]);
}

/* ======================== PIEZAS DE AZOTEA: ACH.px.roofKit ======================== */
var roofKit = px.roofKit = px.roofKit || {};
roofKit.size = {};
function reg(name, w, h, fn) { roofKit[name] = fn; roofKit.size[name] = [w, h]; }

/* cilindro vertical: (cx, yb) = centro de la elipse de la base, h = alto del cuerpo, w = diametro. A = rampa [profunda..brillo] */
function cyl(g, cx, yb, w, h, A, o) {
  o = o || {};
  var rx = w / 2, ry = Math.max(2, Math.round(w / 6)), x0 = Math.round(cx - rx), top = yb - h, i, j;
  for (i = 0; i < w; i++) {
    var u = (i + 0.5 - rx) / rx, bot = yb + Math.round(ry * Math.sqrt(Math.max(0, 1 - u * u)));
    var t = i / (w - 1), col = t < 0.12 ? A[1] : (t < 0.34 ? A[3] : (t < 0.62 ? A[2] : (t < 0.86 ? A[1] : A[0])));
    for (j = top; j <= bot; j++) P1(g, x0 + i, j, col);
    if (i === 0 || i === w - 1) { for (j = top; j <= bot; j++) P1(g, x0 + i, j, A[0]); }
    P1(g, x0 + i, bot, A[0]);
  }
  if (A[4]) for (j = top + 2; j < yb - 1; j++) P1(g, x0 + Math.max(2, (w * 0.28) | 0), j, A[4]);
  (o.ribs || []).forEach(function (r) { for (i = 1; i < w - 1; i++) P1(g, x0 + i, top + r, ((i < w * 0.3) ? A[3] : A[0])); });
  // tapa elipse
  for (j = -ry; j <= ry; j++) for (i = -Math.ceil(rx); i <= Math.ceil(rx); i++) {
    var d = (i * i) / (rx * rx) + (j * j) / (ry * ry);
    if (d <= 1.0) { var edge = d > 0.72; P1(g, Math.round(cx + i - 0.5), top + j, edge ? (i < 0 ? A[4] || A[3] : A[1]) : A[3]); }
  }
  if (o.lid) { F(g, cx - 2, top - 1, 4, 2, A[1]); F(g, cx - 1, top - 2, 2, 1, A[0]); }
}

reg('tank', 20, 28, function (g, x, y, o) {                       // tanque negro (o azul) sobre cuatro ladrillos, con tubo blanco
  o = o || {};
  var A = o.color === 'azul' ? ['#1b2c4e', '#2a4a86', '#3f6cb0', '#6f98cf', '#a9c4e6'] : ['#121118', '#1f1e28', '#33323e', '#555468', '#7a7990'];
  shadowRoof(g, x - 9, y, 18, 12);
  var bx = x - 8; F(g, bx, y - 4, 5, 4, BR[2]); F(g, bx, y - 4, 5, 1, BR[3]); F(g, bx + 11, y - 4, 5, 4, BR[2]); F(g, bx + 11, y - 4, 5, 1, BR[3]); F(g, bx, y - 1, 5, 1, BR[0]); F(g, bx + 11, y - 1, 5, 1, BR[0]);
  F(g, x - 9, y - 5, 18, 1, WD[1]);                               // tabla de apoyo
  cyl(g, x, y - 6, 18, 14, A, { ribs: [4, 9], lid: true });
  // tubo de PVC blanco que baja y entra por el costado
  F(g, x + 10, y - 14, 2, 14, '#d6d1b8'); F(g, x + 10, y - 14, 1, 14, '#efebdc'); F(g, x + 8, y - 14, 3, 2, '#d6d1b8'); F(g, x + 9, y - 1, 3, 1, '#8f8f8a');
  if (o.rust) { rustStreak(g, x - 4, y - 10, 5, o.rnd || Math.random); }
});

reg('drums', 24, 18, function (g, x, y, o) {                      // bidones azules de 200 L (2 o 3), uno con tapa abierta
  o = o || {};
  var A = ['#14264a', '#223f78', '#3562a6', '#5c8bc8', '#9bbbe4'], n = o.n || 2;
  shadowRoof(g, x - 11, y, 22, 8);
  var xs = n === 3 ? [-8, 8, 0] : [-6, 6], ys = n === 3 ? [0, 0, 3] : [0, 0];
  for (var i = 0; i < n; i++) {
    var cx = x + xs[i], yb = y - 2 + (ys[i] || 0);
    cyl(g, cx, yb - 1, 11, 13, A, { ribs: [3, 8] });
    if (i === 0 && !o.closed) { F(g, cx - 3, yb - 14, 6, 1, A[0]); }
    if (i === 1) { F(g, cx + 3, yb - 14, 2, 2, '#e6c85a'); }       // tapon amarillo
  }
  if (n === 3) { /* el de adelante se pinta al final para que tape */ }
});

reg('rebar', 22, 26, function (g, x, y, o) {                      // columna de espera con fierros y botellas de plastico
  o = o || {};
  var rnd = o.rnd || Math.random, w = o.w || 12, x0 = x - (w >> 1), h = 5;
  shadowRoof(g, x0, y, w, 6);
  F(g, x0, y - h, w, h, CON[2]); F(g, x0, y - h, w, 1, CON[4]); F(g, x0, y - h, 1, h, CON[3]); F(g, x0 + w - 1, y - h, 1, h, CON[1]); F(g, x0, y - 1, w, 1, CON[1]);
  var n = Math.max(2, Math.floor(w / 3)), rods = [];
  for (var i = 0; i < n; i++) {
    var rx = x0 + 1 + Math.round(i * (w - 3) / (n - 1)), rh = 9 + ((rnd() * 7) | 0) + (i % 2 ? 2 : 0);
    rods.push([rx, rh]);
    for (var j = 0; j < rh; j++) P1(g, rx, y - h - 1 - j, j < 3 ? RU[3] : (j % 5 === 4 ? RU[3] : RU[1]));
    P1(g, rx, y - h - rh - 1, RU[3]);
    rustStreak(g, rx, y - h, 4, rnd);
  }
  var bt = ['#8fb0b8', '#9bd0c0', '#a9c4e6', '#c9d8d0'];
  rods.forEach(function (r, i) {
    if (i % 2 === 1 || rnd() < 0.3) {
      var bx = r[0] - 1, by = y - h - r[1] - 6, col = pick(rnd, bt);                 // botella boca abajo en la punta
      F(g, bx, by, 3, 6, col); P1(g, bx, by, '#dbe6da'); F(g, bx, by, 1, 5, '#dbe6da'); F(g, bx + 2, by + 1, 1, 5, tinter('#1c2530', 0.35)(col));
      P1(g, bx + 1, by + 5, o.cap || '#e8388a'); P1(g, bx + 1, by + 6 > 0 ? by + 6 : by, RU[3]);
    }
  });
});

reg('clothesline', 44, 26, function (g, x, y, o) {                // tendal: dos palos, alambre con comba, ropa colgada
  o = o || {};
  var rnd = o.rnd || Math.random, w = o.w || 40, x0 = x - (w >> 1), x1 = x0 + w, ph = 16;
  shadowRoof(g, x0, y, w, 4);
  [x0, x1].forEach(function (px_) { F(g, px_, y - ph, 2, ph, WD[1]); P1(g, px_, y - ph, WD[3]); F(g, px_ - 1, y - 1, 4, 1, CON[1]); });
  hangLine(g, x0, w, y - ph + 1, 2, rnd, function (gg, gx, gy, adv) { T(gg, gx + 1, gy + 10, adv - 2, 2, tAO2); });
});

reg('antenna', 14, 32, function (g, x, y, o) {                    // antena de TV (o parabolica) sobre un ladrillo
  o = o || {};
  shadowRoof(g, x - 3, y, 6, 6);
  F(g, x - 2, y - 3, 5, 3, BR[2]); F(g, x - 2, y - 3, 5, 1, BR[3]);
  F(g, x, y - 26, 1, 24, MT[3]); P1(g, x, y - 26, MT[4]);
  if (o.dish) {
    cyl(g, x + 1, y - 18, 10, 2, ['#5c6570', '#7e868a', '#a4abaa', '#cfd3cc', '#e0e4dc']);
    F(g, x + 1, y - 22, 1, 6, MT[1]);
  } else {
    var ws = [11, 9, 7, 5, 4], k;
    for (k = 0; k < ws.length; k++) { var ey = y - 24 + k * 4; F(g, x - (ws[k] >> 1), ey, ws[k], 1, k === 0 ? MT[4] : MT[3]); P1(g, x - (ws[k] >> 1), ey + 1, MT[1]); }
    F(g, x, y - 20, 1, 1, '#2a2440');
  }
  var wire = tinter('#2a2440', 0.4); T(g, x - 2, y - 12, 1, 1, wire); T(g, x - 3, y - 8, 1, 1, wire); T(g, x - 4, y - 4, 1, 1, wire);
});

reg('bricks', 18, 12, function (g, x, y, o) {                     // ruma de ladrillos: vista frontal y cara superior
  o = o || {};
  var rnd = o.rnd || Math.random, w = 16, x0 = x - 8;
  shadowRoof(g, x0, y, w, 6);
  for (var r = 0; r < 3; r++) {
    var cw = w - r * 2, cx0 = x0 + r, cy = y - 3 - r * 3;
    var off = r & 1 ? 2 : 0;
    for (var xx = 0; xx < cw; xx += 4) {
      var t = BRICK2[Math.floor(rnd() * BRICK2.length)], bw = Math.min(4, cw - xx);
      F(g, cx0 + xx, cy, bw, 3, t[0]); F(g, cx0 + xx, cy, bw, 1, t[1]); P1(g, cx0 + xx + 3, cy + 1, BR[1]);
    }
    F(g, cx0, cy + 2, cw, 1, BR[1]); P1(g, cx0, cy, BR[4]);
  }
  F(g, x0 + 2, y - 11, 12, 2, BR[3]); F(g, x0 + 3, y - 11, 10, 1, BR[4]);   // cara superior
  F(g, x0 + w, y - 3, 3, 3, BR[2]); F(g, x0 + w, y - 3, 3, 1, BR[3]); F(g, x0 - 4, y - 2, 3, 2, BR[1]);   // sueltos
});

reg('cement', 16, 12, function (g, x, y, o) {                     // bolsas de cemento (una rota con polvo)
  var x0 = x - 7;
  shadowRoof(g, x0, y, 14, 4);
  function bag(bx, by) {
    F(g, bx, by - 5, 9, 5, '#b9b49c'); F(g, bx, by - 6, 9, 1, '#d6d1b8'); F(g, bx, by - 5, 1, 5, '#d6d1b8'); F(g, bx + 8, by - 5, 1, 5, '#8f8f8a'); F(g, bx, by - 1, 9, 1, '#8f8f8a');
    F(g, bx + 2, by - 3, 5, 1, '#8c8a93'); P1(g, bx + 1, by - 7, '#d6d1b8'); F(g, bx + 1, by - 7, 7, 1, '#d6d1b8'); P1(g, bx + 4, by - 4, '#6b6c70'); P1(g, bx + 5, by - 4, '#6b6c70');
  }
  bag(x0, y); bag(x0 + 5, y - 5);
  F(g, x0 + 11, y - 2, 6, 2, CON[3]); P1(g, x0 + 14, y - 3, CON[4]); P1(g, x0 + 16, y - 2, CON[2]);
});

reg('dog', 16, 9, function (g, x, y, o) {                         // perro callejero dormido, enroscado
  o = o || {};
  var b = o.color || '#c9a66b', d = tinter('#2a2440', 0.4)(b), l = '#e0c58d';
  T(g, x - 7, y - 1, 14, 2, tAO3); T(g, x - 6, y + 1, 12, 1, tAO);
  F(g, x - 6, y - 6, 12, 5, b); F(g, x - 5, y - 7, 9, 1, b); F(g, x - 5, y - 7, 6, 1, l); F(g, x - 6, y - 2, 12, 1, d); F(g, x - 6, y - 6, 1, 4, d);
  F(g, x - 8, y - 5, 4, 4, b); F(g, x - 8, y - 5, 4, 1, l); F(g, x - 9, y - 3, 2, 2, '#6b4223'); F(g, x - 7, y - 6, 2, 2, '#6b4223');   // cabeza y oreja
  P1(g, x - 7, y - 4, K); F(g, x + 4, y - 7, 4, 2, d); P1(g, x + 7, y - 8, b);                                                                  // cola
  F(g, x - 1, y - 5, 3, 3, tinter('#ffffff', 0.12)(b)); P1(g, x - 9, y - 2, K);
});

reg('chair', 10, 13, function (g, x, y, o) {                      // silla plastica blanca
  o = o || {};
  var c = o.color || '#d6d1b8', dk = tinter('#2a2440', 0.35)(c);
  shadowRoof(g, x - 4, y, 8, 4);
  F(g, x - 4, y - 12, 8, 6, c); F(g, x - 4, y - 12, 8, 1, '#efebdc'); F(g, x - 4, y - 12, 1, 6, '#efebdc'); F(g, x + 3, y - 12, 1, 6, dk); F(g, x - 2, y - 10, 4, 2, dk);
  F(g, x - 4, y - 6, 8, 2, c); F(g, x - 4, y - 6, 8, 1, '#efebdc'); F(g, x - 4, y - 5, 8, 1, dk);
  F(g, x - 4, y - 4, 1, 4, dk); F(g, x + 3, y - 4, 1, 4, dk); F(g, x - 3, y - 4, 1, 3, c);
});

reg('hood', 12, 24, function (g, x, y, o) {                       // campana extractora de cocina: caja con rejilla y chimenea tiznada
  o = o || {};
  shadowRoof(g, x - 6, y, 12, 5);
  F(g, x - 6, y - 8, 12, 8, MT[2]); F(g, x - 6, y - 8, 12, 1, MT[4]); F(g, x - 6, y - 8, 1, 8, MT[3]); F(g, x + 5, y - 8, 1, 8, MT[1]); F(g, x - 6, y - 1, 12, 1, MT[0]);
  for (var j = 3; j < 7; j += 2) F(g, x - 4, y - j - 1, 8, 1, MT[0]);
  F(g, x - 2, y - 22, 5, 14, MT[2]); F(g, x - 2, y - 22, 1, 14, MT[3]); F(g, x + 2, y - 22, 1, 14, MT[1]); F(g, x - 3, y - 24, 7, 2, MT[3]); F(g, x - 3, y - 23, 7, 1, MT[1]);
  T(g, x - 3, y - 26, 7, 3, tinter('#1c1a22', 0.5)); T(g, x - 2, y - 22, 5, 14, tinter('#1c1a22', 0.18));
  for (var i = 0; i < 3; i++) P1(g, x - 1 + i * 2, y - 27 - i, '#8a8884');
});

reg('stairbox', 26, 30, function (g, x, y, o) {                   // caja de escalera: cuarto de cemento con puerta y techo plano
  o = o || {};
  var A = o.ramp || CON, w = o.w || 24, x0 = x - (w >> 1), h = 14, rnd = o.rnd || Math.random;
  shadowRoof(g, x0, y, w, 8);
  F(g, x0, y - h, w, h, A[2]); F(g, x0, y - h, 1, h, A[3]); F(g, x0 + w - 1, y - h, 1, h, A[1]); F(g, x0, y - 3, w, 3, A[1]);
  F(g, x0 - 1, y - h - 4, w + 2, 4, A[3]); F(g, x0 - 1, y - h - 4, w + 2, 1, A[4]); F(g, x0 - 1, y - h - 1, w + 2, 1, A[1]);   // losa de techo, cara superior
  T(g, x0, y - h, w, 2, tAO2);
  var dx = x0 + 4; F(g, dx, y - 11, 8, 11, K); F(g, dx + 1, y - 10, 6, 10, WD[2]); F(g, dx + 1, y - 10, 1, 10, WD[3]); F(g, dx + 5, y - 5, 1, 1, '#e6c85a'); F(g, dx, y - 1, 8, 1, CON[4]);
  F(g, x0 + w - 8, y - 9, 4, 4, GL[1]); frame(g, x0 + w - 9, y - 10, 6, 6, A[0]);
  for (var i = 0; i < 4; i++) if (rnd() < 0.7) P1(g, x0 + 1 + ((rnd() * (w - 2)) | 0), y - 4 - ((rnd() * 8) | 0), A[1]);
});

reg('plants', 20, 14, function (g, x, y, o) {                      // macetas en latas con plantas (algo de dignidad)
  o = o || {};
  var rnd = o.rnd || Math.random, n = o.n || 3;
  for (var i = 0; i < n; i++) {
    var cx = x - (n - 1) * 3 + i * 6, ch = 3 + ((rnd() * 2) | 0), can = pick(rnd, ['#8f3a32', '#3f72b0', '#7e868a', '#c9a66b', '#2f5a52']);
    F(g, cx - 2, y - ch, 5, ch, can); F(g, cx - 2, y - ch, 5, 1, tinter('#ffffff', 0.3)(can)); F(g, cx + 2, y - ch, 1, ch, tinter('#2a2440', 0.4)(can));
    var pc = rnd() < 0.5 ? [VG[3], VG[2]] : ['#8aa860', '#5f7a48'];
    var ph = 4 + ((rnd() * 4) | 0);
    for (var j = 0; j < ph; j++) { var wd = j < 2 ? 3 : (j < ph - 2 ? 5 : 3); F(g, cx - (wd >> 1), y - ch - j - 1, wd, 1, (j + i) % 3 ? pc[0] : pc[1]); }
    if (rnd() < 0.5) P1(g, cx + ((rnd() * 3) | 0) - 1, y - ch - ph, pick(rnd, ['#d98a9e', '#e6c85a', '#f3efe2']));
  }
  T(g, x - 8, y, 16, 1, tAO3);
});

reg('tires', 18, 14, function (g, x, y, o) {                      // pila de llantas
  shadowRoof(g, x - 8, y, 16, 6);
  for (var k = 0; k < 3; k++) {
    var cy = y - 3 - k * 4, w = 14 - k;
    for (var j = -3; j <= 2; j++) for (var i = -(w >> 1); i <= (w >> 1); i++) {
      var d = (i * i) / ((w / 2) * (w / 2)) + (j * j) / 9;
      if (d <= 1) P1(g, x + i, cy + j, d > 0.62 ? '#14131a' : (i < -1 && j < 0 ? '#3a3a44' : '#22212b'));
    }
    F(g, x - 2, cy - 1, 4, 2, '#0b0a10'); P1(g, x - (w >> 1) + 1, cy - 2, '#4a4a58');
  }
});

reg('sand', 22, 14, function (g, x, y, o) {                       // monton de arena con una pala
  shadowRoof(g, x - 9, y, 18, 4);
  for (var j = 0; j < 9; j++) { var w = 5 + j * 2, c = j < 3 ? '#d8c9a0' : (j < 6 ? '#c4b088' : '#a8956e'); F(g, x - (w >> 1) - (j < 4 ? 0 : 0), y - 9 + j, w, 1, c); }
  for (j = 1; j < 9; j++) P1(g, x + ((9 + j * 2) >> 1) - 1, y - 9 + j, '#8a7658');
  F(g, x + 8, y - 8, 1, 8, WD[2]); F(g, x + 7, y - 9, 3, 2, MT[3]);
});

reg('barrel', 14, 16, function (g, x, y, o) {                     // cilindro de aceite (rojizo oxidado)
  o = o || {};
  shadowRoof(g, x - 5, y, 10, 6);
  cyl(g, x, y - 2, 11, 12, o.blue ? ['#14264a', '#223f78', '#3562a6', '#5c8bc8', '#9bbbe4'] : ['#3a1f1f', '#5c2a22', '#8a4b38', '#b06a3e', '#d09060'], { ribs: [3, 8] });
});

reg('gas', 8, 14, function (g, x, y, o) {                         // balon de gas
  o = o || {};
  var A = o.color === 'azul' ? ['#14264a', '#223f78', '#3562a6', '#5c8bc8', '#9bbbe4'] : ['#4a1c18', '#7a2e26', '#b0452f', '#d36a4a', '#f0a080'];
  T(g, x - 4, y, 9, 1, tAO3);
  cyl(g, x, y - 1, 8, 9, A, {});
  F(g, x - 1, y - 14, 3, 3, MT[2]); F(g, x - 2, y - 11, 5, 1, MT[1]); F(g, x - 1, y - 15, 3, 1, MT[3]);
});


reg('table', 32, 16, function (g, x, y, o) {                      // mesa de plastico con dos sillas y una jarra: la azotea tambien se vive
  o = o || {};
  shadowRoof(g, x - 10, y, 20, 6);
  F(g, x - 7, y - 6, 1, 6, '#bdb9ab'); F(g, x + 6, y - 6, 1, 6, '#8c8a93');
  F(g, x - 9, y - 9, 18, 3, '#d6d1b8'); F(g, x - 9, y - 9, 18, 1, '#efebdc'); F(g, x - 9, y - 7, 18, 1, '#8c8a93');
  F(g, x - 3, y - 13, 3, 4, '#3f72b0'); F(g, x - 3, y - 13, 1, 4, '#6a95c8'); F(g, x + 2, y - 11, 4, 2, '#e6c85a');
  roofKit.chair(g, x - 13, y, { color: '#2f7a50' }); roofKit.chair(g, x + 13, y, { color: '#b0402f' });
});

reg('planks', 18, 10, function (g, x, y, o) {                     // tablas y calaminas apiladas
  shadowRoof(g, x - 8, y, 16, 5);
  for (var k = 0; k < 3; k++) { var cy = y - 2 - k * 3, c = [WD[2], WD[1], WD[3]][k]; F(g, x - 8 + k, cy, 16 - k, 3, c); F(g, x - 8 + k, cy, 16 - k, 1, WD[3]); F(g, x - 8 + k, cy + 2, 16 - k, 1, WD[0]); P1(g, x - 6 + k * 3, cy + 1, WD[0]); }
  F(g, x - 9, y - 10, 12, 2, '#7e868a'); F(g, x - 9, y - 10, 12, 1, MT[4]);
});

/* Despachador: nombres de la ficha (en espanol) -> pieza */
var ALIAS = { tanque: 'tank', fierros: 'rebar', tendal: 'clothesline', bidones: 'drums', antena: 'antenna', ladrillos: 'bricks', cemento: 'cement', perro: 'dog', silla: 'chair',
  campana: 'hood', arena: 'sand', llantas: 'tires', cilindro: 'barrel', macetas: 'plants', escalera: 'stairbox', gas: 'gas', antenaParabolica: 'antenna', mesa: 'table', tablas: 'planks' };
roofKit.alias = ALIAS;
roofKit.names = Object.keys(roofKit.size);
roofKit.place = function (g, name, x, y, o) { var fn = roofKit[ALIAS[name] || name]; if (typeof fn === 'function' && fn !== roofKit.place) fn(g, x, y, o || {}); return roofKit.size[ALIAS[name] || name] || [0, 0]; };

/* ======================== AZOTEAS: SUPERFICIES ======================== */
function roofSurface(g, x, y, w, h, kind, rnd, tone) {
  var i, j, n, A = ROOF;
  if (kind === 'calamina') {
    var cs = ['#454d58', '#555e69', '#626b75', '#4c5560'];
    for (i = 0; i < w; i++) F(g, x + i, y, 1, h, cs[i & 3]);
    for (j = 22 + ((rnd() * 8) | 0); j < h; j += 24 + ((rnd() * 6) | 0)) { F(g, x, y + j, w, 1, '#7e868a'); F(g, x, y + j + 1, w, 1, '#2f343c'); }
    n = (w * h / 800) | 0;
    for (i = 0; i < n; i++) { var pts = blob(2 + rnd() * 4, 2 + rnd() * 3, rnd), bx = x + ((rnd() * w) | 0), by = y + ((rnd() * h) | 0); stamp(g, bx, by, pts, function (gg, xx, yy, dx, dy) { if (Q(gg, xx, yy)) P1(gg, xx, yy, ((xx + yy) & 1) ? '#5a3a34' : '#6f3b2e'); }); }
    for (i = 0; i < w * h / 400; i++) { var sx = x + 2 + ((rnd() * (w - 4)) | 0), sy = y + 2 + ((rnd() * (h - 4)) | 0); F(g, sx, sy, 3, 2, '#6e6a62'); P1(g, sx, sy, '#8a8884'); P1(g, sx + 2, sy + 1, '#3a3a40'); }   // piedras de peso
    return;
  }
  if (kind === 'pastelero') {
    var ts = ['#5e4440', '#6a4a44', '#58403e', '#664c44'];
    F(g, x, y, w, h, '#4a4048');
    for (j = 0; j < h; j += 8) for (i = 0; i < w; i += 8) { var tc = ts[((i >> 3) * 3 + (j >> 3) * 5 + ((rnd() * 2) | 0)) & 3]; F(g, x + i + 1, y + j + 1, 7, 7, tc); F(g, x + i + 1, y + j + 1, 7, 1, '#74564e'); }
    return;
  }
  var base = kind === 'deck' ? A[3] : A[2];
  F(g, x, y, w, h, base);
  n = (w * h / 700) | 0;
  for (i = 0; i < n; i++) {                                          // manchas grandes de tono
    var bp = blob(5 + rnd() * 10, 3 + rnd() * 6, rnd), cx = x + ((rnd() * w) | 0), cy = y + ((rnd() * h) | 0), dk = rnd() < 0.55, ph = (rnd() * 2) | 0;
    var col = dk ? (kind === 'deck' ? A[2] : A[1]) : (kind === 'deck' ? A[4] : A[3]);
    stamp(g, cx, cy, bp, function (gg, xx, yy, dx, dy) { if (xx >= x && xx < x + w && yy >= y && yy < y + h) { if (Math.abs(dx) < 3 && Math.abs(dy) < 2 || ((xx + yy) & 1) === ph) P1(gg, xx, yy, col); } });
  }
  n = (w * h / 2600) | 0;
  for (i = 0; i < n; i++) {                                           // brea (parche de impermeabilizante) y humedad
    var bw = 8 + ((rnd() * 14) | 0), bh = 4 + ((rnd() * 6) | 0), bx2 = x + ((rnd() * (w - bw)) | 0), by2 = y + ((rnd() * (h - bh)) | 0);
    if (rnd() < 0.4 && kind !== 'deck') { F(g, bx2, by2, bw, bh, '#3a3944'); F(g, bx2, by2, bw, 1, '#4a4954'); for (j = 0; j < bw; j += 2 + ((rnd() * 3) | 0)) P1(g, bx2 + j, by2 + bh, '#3a3944'); }
    else { var hp = blob(bw / 2, bh / 2, rnd); stamp(g, bx2 + (bw >> 1), by2 + (bh >> 1), hp, function (gg, xx, yy) { if (xx >= x && xx < x + w && yy >= y && yy < y + h && ((xx + yy) & 1)) { var c = Q(gg, xx, yy); if (c) P1(gg, xx, yy, tinter('#3f4a3a', 0.3)(c)); } }); }
  }
  for (i = 0; i < w * h / 70; i++) P1(g, x + ((rnd() * w) | 0), y + ((rnd() * h) | 0), rnd() < 0.5 ? A[1] : A[3]);
  n = (w * h / 6000) | 0;
  for (i = 0; i < n; i++) {                                           // grietas
    var cx2 = x + 4 + ((rnd() * (w - 8)) | 0), cy2 = y + ((rnd() * (h - 12)) | 0), dir = 1, len = 6 + ((rnd() * 10) | 0), yy2 = cy2;
    for (j = 0; j < len; j++) { P1(g, cx2, yy2, A[0]); var rr = rnd(); if (rr < 0.45) cx2 += dir; else if (rr < 0.6) dir = -dir; else yy2++; if (rr < 0.45 && rnd() < 0.5) yy2++; }
  }
  if (kind !== 'deck') for (i = 40; i < w; i += 48) if (rnd() < 0.7) { F(g, x + i, y, 1, h, A[1]); F(g, x + i + 1, y, 1, h, A[3]); }   // juntas de dilatacion
}
roofKit.surface = function (g, x, y, w, h, kind, rnd) { roofSurface(g, x, y, w, h, kind || 'losa', rnd || Math.random); };

/* ======================== PIEZAS DE FACHADA ======================== */
function lightOf(h) { return h; }
function glass(g, gx, gy, gw, gh) {                               // vidrio con reflejo de cielo
  F(g, gx, gy, gw, gh, GL[2]); F(g, gx, gy, gw, 4, GL[1]); F(g, gx, gy + gh - 3, gw, 3, GL[1]);
  g.line(gx + 3, gy + gh - 3, gx + 8, gy + 2, GL[3]); g.line(gx + 6, gy + gh - 2, gx + 10, gy + 5, GL[3]);
}
/* ventana 18x16 (caja exterior). type: vidrio, reja, cortina, rota, tapiada, plastico, luz, maceta, persianilla, sinmarco */
function win(g, x, y, type, o) {
  o = o || {};
  var rnd = o.rnd || Math.random, fr = o.frame || CON[1], gx = x + 1, gy = y + 1, gw = 16, gh = 14, i;
  if (type === 'sinmarco') {
    F(g, x, y, 18, 16, '#1d1b24'); F(g, x + 1, y + 1, 16, 12, '#2a2630'); F(g, x + 1, y + 1, 5, 12, '#242028');
    if (o.glassy) { glass(g, x + 2, y + 3, 14, 10); }
    F(g, x - 1, y - 2, 20, 2, CON[3]); F(g, x - 1, y - 2, 20, 1, CON[4]); T(g, x - 1, y, 20, 1, tAO);   // dintel de concreto
    F(g, x - 1, y + 16, 20, 1, CON[3]); F(g, x - 1, y + 17, 20, 1, CON[1]); T(g, x, y + 18, 18, 1, tAO2);
    if (type === 'sinmarco' && o.inner) o.inner(g, x + 1, y + 1, 16, 14);
    return;
  }
  frame(g, x, y, 18, 16, fr);
  switch (type) {
    case 'reja':
      glass(g, gx, gy, gw, gh); T(g, gx, gy, gw, gh, tinter('#1c2530', 0.35));
      for (i = 0; i < 5; i++) { F(g, gx + 1 + i * 3, gy, 1, gh, K); P1(g, gx + 1 + i * 3, gy + 1, '#5a586a'); }
      F(g, gx, gy + 7, gw, 1, K); F(g, gx, gy + 7, gw, 1, K);
      break;
    case 'cortina': {
      var cc = o.curtain || pick(rnd, ['#d6d1b8', '#e0b79a', '#c0d1b4', '#b4d0d0']), cd = tinter('#2a2440', 0.28)(cc), cl = tinter('#ffffff', 0.3)(cc);
      F(g, gx, gy, gw, gh, GL[0]); F(g, gx, gy, 7, gh, cc); F(g, gx + 9, gy, 7, gh, cc);
      for (i = 1; i < 7; i += 3) { F(g, gx + i, gy + 1, 1, gh - 1, cd); F(g, gx + 9 + i, gy + 1, 1, gh - 1, cd); }
      F(g, gx, gy, gw, 1, cd); F(g, gx, gy + 1, gw, 1, cl); F(g, gx + 6, gy + 3, 1, gh - 3, cd); F(g, gx + 9, gy + 3, 1, gh - 3, cd);
      F(g, gx + 7, gy + 2, 2, gh - 2, '#1d1b24'); F(g, gx, gy + gh - 1, gw, 1, cd);
      break; }
    case 'rota':
      glass(g, gx, gy, gw, gh);
      F(g, gx + 3, gy + 3, 9, 7, '#14121a'); F(g, gx + 2, gy + 5, 3, 3, '#14121a'); F(g, gx + 9, gy + 8, 6, 5, '#14121a'); F(g, gx + 6, gy + 1, 4, 3, '#14121a');
      g.line(gx + 8, gy + 6, gx + 1, gy + 1, GL[3]); g.line(gx + 8, gy + 6, gx + 15, gy + 2, GL[3]); g.line(gx + 8, gy + 7, gx + 13, gy + 13, GL[3]); g.line(gx + 6, gy + 8, gx + 2, gy + 13, GL[3]);
      P1(g, gx + 4, gy + 3, '#dbe6da'); P1(g, gx + 11, gy + 8, '#dbe6da');
      break;
    case 'tapiada':
      brickFill(g, gx, gy, gw, gh, rnd); F(g, gx, gy, gw, 2, CON[3]); F(g, gx, gy + 2, gw, 1, CON[1]);
      for (i = 0; i < 6; i++) P1(g, gx + ((rnd() * gw) | 0), gy + 2 + ((rnd() * 3) | 0), CON[2]);
      F(g, gx, gy + gh - 2, gw, 2, CON[2]);
      break;
    case 'plastico': {
      var pb = '#3f72b0';
      F(g, gx, gy, gw, gh, pb); F(g, gx + 1, gy + 1, gw - 2, 1, '#6a95c8');
      g.line(gx + 2, gy + 9, gx + 7, gy + 3, '#6a95c8'); g.line(gx + 6, gy + 12, gx + 13, gy + 4, '#a8c4e0'); g.line(gx + 3, gy + 4, gx + 5, gy + 12, '#2c4a7c'); g.line(gx + 10, gy + 3, gx + 12, gy + 12, '#2c4a7c');
      F(g, gx + 12, gy + 8, 3, 5, '#2c4a7c'); F(g, gx + gw - 1, gy, 1, gh, '#2c4a7c');
      [[gx, gy], [gx + gw - 3, gy], [gx, gy + gh - 1], [gx + gw - 3, gy + gh - 1]].forEach(function (p) { F(g, p[0], p[1], 3, 1, '#cbbf98'); });
      break; }
    case 'luz': {
      F(g, gx, gy, gw, gh, '#d99a52'); F(g, gx, gy + 4, gw, gh - 4, '#f0b060'); F(g, gx + 2, gy + 7, gw - 4, gh - 7, '#ffcf8a'); F(g, gx + 4, gy + 9, gw - 8, 4, '#ffe2b0');
      F(g, gx, gy, 2, gh, '#8c5f5c'); F(g, gx + gw - 2, gy, 2, gh, '#8c5f5c'); P1(g, gx + 2, gy + 1, '#8c5f5c'); P1(g, gx + gw - 3, gy + 1, '#8c5f5c');
      if (o.silueta) { F(g, gx + 7, gy + 6, 3, 3, '#4a2c33'); F(g, gx + 5, gy + 9, 7, 5, '#4a2c33'); }
      if (o.lights) o.lights.push({ x: x + 9, y: y + 12, kind: 'foco' });
      break; }
    case 'persianilla':
      F(g, gx, gy, gw, gh, GL[0]);
      for (i = 0; i < 9; i++) F(g, gx, gy + i, gw, 1, (i & 1) ? '#a9a79b' : '#c9c5b5');
      F(g, gx, gy + 9, gw, 1, '#66656b'); F(g, gx + 4, gy + 10, 1, 3, '#a9a79b'); F(g, gx + 4, gy + 13, 3, 1, '#c9c5b5');
      break;
    default:                                                          // vidrio con dos hojas corredizas
      glass(g, gx, gy, gw, gh); F(g, gx + 8, gy, 1, gh, fr); P1(g, gx + 7, gy + 6, '#dbe6da');
  }
  if (type !== 'luz') { T(g, gx, gy, gw, 2, tAO); T(g, gx, gy + 2, 1, gh - 2, tAO2); }
  F(g, x - 1, y + 16, 20, 1, CON[4]); F(g, x - 1, y + 17, 20, 1, CON[1]); T(g, x, y + 18, 18, 1, tAO2);       // alfeizar y su sombra
  F(g, x - 1, y - 1, 20, 1, o.lintel || CON[3]);
  if (type === 'maceta') {}
}

/* puerta exacta de 16x34. type: fierro, madera, reja, vidrio, entreabierta */
function door(g, x, y, type, o) {
  o = o || {};
  var a = o.accent || EX.turquesa, rnd = o.rnd || Math.random, fr = o.frame || CON[1], i, j;
  F(g, x - 1, y - 2, 18, 2, CON[3]); F(g, x - 1, y - 2, 18, 1, CON[4]); T(g, x, y, 16, 1, tAO);      // dintel
  F(g, x, y, 16, 34, fr);
  var WD = o.accent ? [a[0], a[2], a[3], a[4]] : RAMPS.wood;     // v0.4 #8: el acento del lote (puerta o reja) va en el paso de LUZ de su rampa; la madera se pinta con el
  if (type === 'madera') {
    F(g, x + 1, y + 1, 14, 32, WD[2]);
    for (i = 0; i < 4; i++) F(g, x + 1 + i * 4 - (i ? 0 : 0) + 3, y + 1, 1, 32, WD[1]);
    F(g, x + 1, y + 1, 14, 1, WD[3]); F(g, x + 1, y + 1, 1, 32, WD[3]);
    frame(g, x + 3, y + 4, 10, 11, WD[1]); frame(g, x + 3, y + 19, 10, 11, WD[1]); F(g, x + 4, y + 5, 8, 1, WD[3]); F(g, x + 4, y + 20, 8, 1, WD[3]);
    F(g, x + 11, y + 17, 2, 2, '#e6c85a'); P1(g, x + 12, y + 18, '#a88a3c');
    F(g, x + 1, y + 29, 14, 4, tinter('#2a2440', 0.2)(WD[1]));
  } else if (type === 'reja') {
    F(g, x + 1, y + 1, 14, 32, '#241e26'); F(g, x + 1, y + 20, 14, 13, '#3a2a2a'); F(g, x + 2, y + 25, 12, 8, '#6e4a30');
    for (i = 0; i < 5; i++) { F(g, x + 2 + i * 3, y + 1, 1, 32, o.accent ? a[3] : K); P1(g, x + 2 + i * 3, y + 2, o.accent ? a[4] : '#5a586a'); }
    F(g, x + 1, y + 11, 14, 1, K); F(g, x + 1, y + 24, 14, 1, K); F(g, x + 7, y + 1, 2, 32, '#0d0c12'); F(g, x + 6, y + 16, 4, 3, MT[1]); P1(g, x + 7, y + 17, MT[4]);
  } else if (type === 'vidrio') {
    F(g, x + 1, y + 1, 14, 32, MT[2]); F(g, x + 1, y + 1, 14, 1, MT[4]); F(g, x + 1, y + 1, 1, 32, MT[3]); F(g, x + 14, y + 1, 1, 32, MT[1]);
    F(g, x + 3, y + 3, 10, 27, GL[1]); F(g, x + 3, y + 3, 10, 3, GL[0]); g.line(x + 5, y + 20, x + 10, y + 8, GL[3]); g.line(x + 8, y + 24, x + 11, y + 17, GL[2]);
    F(g, x + 3, y + 21, 10, 9, '#3a2a2a'); F(g, x + 3, y + 26, 10, 4, '#6e4a30');
    F(g, x + 3, y + 16, 8, 1, MT[4]); F(g, x + 3, y + 17, 8, 1, MT[0]); F(g, x + 3, y + 30, 10, 3, MT[1]);
  } else {                                                           // fierro pintado, con visor
    a = [a[1], a[2], a[3], a[4], a[4]];                              // un paso arriba: base = paso de luz
    F(g, x + 1, y + 1, 14, 32, a[2]); F(g, x + 1, y + 1, 14, 1, a[3]); F(g, x + 1, y + 1, 1, 32, a[3]); F(g, x + 14, y + 1, 1, 32, a[1]);
    var pb = function (px_, py_, pw, ph) { F(g, px_, py_, pw, ph, a[2]); F(g, px_, py_, pw, 1, a[1]); F(g, px_, py_, 1, ph, a[1]); F(g, px_ + pw - 1, py_, 1, ph, a[3]); F(g, px_, py_ + ph - 1, pw, 1, a[3]); };
    pb(x + 3, y + 12, 10, 8); pb(x + 3, y + 22, 10, 9);
    F(g, x + 4, y + 3, 8, 6, K); F(g, x + 5, y + 4, 6, 4, GL[1]); F(g, x + 5, y + 4, 6, 1, GL[2]); for (i = 0; i < 3; i++) F(g, x + 6 + i * 2, y + 4, 1, 4, K);
    F(g, x + 11, y + 15, 2, 3, '#e6c85a'); P1(g, x + 12, y + 17, '#a88a3c');
    F(g, x + 1, y + 29, 14, 4, a[1]); F(g, x + 1, y + 29, 14, 1, a[0]);
    if (o.dmg >= 2) { for (i = 0; i < 5; i++) { var rp = blob(2 + rnd() * 2, 2, rnd); stamp(g, x + 3 + ((rnd() * 10) | 0), y + 26 + ((rnd() * 6) | 0), rp, function (gg, xx, yy) { if (xx > x && xx < x + 15 && yy > y && yy < y + 33) P1(gg, xx, yy, RU[(xx + yy) & 1 ? 2 : 1]); }); } }
  }
  F(g, x, y + 32, 16, 1, CON[4]); F(g, x, y + 33, 16, 1, CON[2]);                                      // umbral
  T(g, x + 1, y + 1, 14, 2, tAO2); T(g, x + 1, y + 1, 1, 30, tAO4);
  if (o.yape && Lx() && type !== 'reja') Lx().yapeSmall(g, x + 3, y + (type === 'vidrio' ? 13 : 16), { rnd: rnd });
}

/* persiana metalica (santamaria): w de 40 a 48, alto 34 con la caja de 4 px. state: cerrada, media, reventada */
function persiana(g, x, y, w, state, o) {
  o = o || {};
  var rnd = o.rnd || Math.random, i, j, dmg = o.dmg || 1, top = state === 'cerrada' ? 28 : (state === 'media' ? 14 + ((rnd() * 4) | 0) : 12);
  F(g, x, y, w, 34, '#22232a');
  var inner = 34 - 4, glow = ['#2a2024', '#3a2a28', '#54382c', '#7a4e30', '#a8693a', '#c98a4a'];
  for (j = top; j < inner - 1; j++) { var k = Math.min(5, Math.floor((j - top) / Math.max(1, (inner - 1 - top)) * 6)); F(g, x + 1, y + 4 + j, w - 2, 1, glow[k]); }
  if (state !== 'cerrada') {
    var cy = y + 4 + inner - 9;                                       // mostrador y estantes con mercaderia
    F(g, x + 2, cy, w - 4, 4, '#8a5a38'); F(g, x + 2, cy, w - 4, 1, '#c99458'); F(g, x + 2, cy + 3, w - 4, 1, '#4a3028');
    for (i = 0; i < w - 6; i += 3) if (rnd() < 0.7) { var pc = pick(rnd, ['#b0402f', '#2f5a9e', '#e6c85a', '#5a8f80', '#d98a9e', '#f3efe2']); F(g, x + 3 + i, cy - 3 - ((rnd() * 2) | 0), 2, 3, pc); }
    F(g, x + 1, y + 4 + top + 3, w - 2, 1, '#3a2a28');
    for (i = 0; i < w - 6; i += 4) if (rnd() < 0.6) F(g, x + 3 + i, y + 4 + top + 5, 3, 2, pick(rnd, ['#8fb3be', '#c9a66b', '#d98a9e', '#9db59e']));
  }
  for (j = 0; j < top; j++) {                                         // laminas acanaladas
    var c1 = (j & 1) ? '#6b7480' : '#7e868a';
    F(g, x + 1, y + 4 + j, w - 2, 1, c1);
    if (j % 4 === 1) for (i = 0; i < w - 2; i += 6) P1(g, x + 1 + i + ((j >> 2) & 3), y + 4 + j, '#a4abaa');
  }
  F(g, x + 1, y + 4 + top - 2, w - 2, 2, MT[4]); F(g, x + 1, y + 4 + top - 1, w - 2, 1, MT[1]);       // barra inferior
  F(g, x + (w >> 1) - 2, y + 4 + top - 2, 4, 2, K); P1(g, x + (w >> 1) - 1, y + 4 + top - 2, '#c9a66b');
  T(g, x + 1, y + 4 + top, w - 2, 2, tAO); T(g, x + 1, y + 4 + top + 2, w - 2, 1, tAO2);
  F(g, x, y + 4, 1, 30, MT[0]); F(g, x + w - 1, y + 4, 1, 30, MT[0]);                                // guias
  F(g, x, y, w, 4, MT[1]); F(g, x, y, w, 1, MT[3]); F(g, x, y + 3, w, 1, MT[0]);                      // caja del rollo
  for (i = 3; i < w - 2; i += 7) P1(g, x + i, y + 1, MT[4]);
  for (i = 0; i < 2 + dmg; i++) { var bp = blob(2 + rnd() * 3, 2 + rnd() * 2, rnd); stamp(g, x + 4 + ((rnd() * (w - 8)) | 0), y + 5 + ((rnd() * (top - 3)) | 0), bp, function (gg, xx, yy) { if (xx > x && xx < x + w - 1 && yy > y + 4 && yy < y + 4 + top - 2) P1(gg, xx, yy, ((xx + yy) & 1) ? RU[2] : RU[1]); }); }
  if (o.ad && Lx() && top >= 13 && state !== 'reventada') { var arh = top - 5; if (arh >= 9) Lx().ad(g, o.ad, x + 3, y + 5, w - 6, arh, { rnd: rnd, wear: 0.6 }); }
  if (o.tag) { var tg = o.tag; g.line(x + 6, y + 9, x + 12, y + 7, tg); g.line(x + 12, y + 7, x + 16, y + 12, tg); g.line(x + 9, y + 12, x + 14, y + 10, tg); P1(g, x + 7, y + 9, tg); }
  if (state === 'reventada') { F(g, x + w - 14, y + 4 + top - 3, 12, 4, '#0d0c12'); g.line(x + w - 14, y + 4 + top - 3, x + w - 6, y + 4 + top - 1, '#a4abaa'); }
  F(g, x, y + 33, w, 1, CON[3]);
}

/* mampara de vidrio con marco de aluminio e interior. kind: chifa, polleria, botica, tienda */
function vitrina(g, x, y, w, kind, o) {
  o = o || {};
  var rnd = o.rnd || Math.random, i, j, lit = o.lit !== false;
  F(g, x, y, w, 34, MT[2]); F(g, x, y, w, 1, MT[4]); F(g, x, y, 1, 34, MT[3]); F(g, x + w - 1, y, 1, 34, MT[1]);
  var gx = x + 2, gy = y + 2, gw = w - 4, gh = 28;
  F(g, gx, gy, gw, gh, '#241c22');
  var glow = lit ? ['#2a2024', '#3a2a28', '#54382c', '#7a4e30', '#a8693a'] : ['#1d1b24', '#241f28', '#2a2630', '#2e2a34', '#34303a'];
  for (j = 0; j < gh; j++) F(g, gx, gy + j, gw, 1, glow[Math.min(4, (j / gh * 5) | 0)]);
  var sx = gx + 2, fl = gy + gh;                                      // fl = piso interior
  if (kind === 'chifa') {
    for (i = 0; i + 14 <= gw - 2; i += 17) {
      var tx = sx + i + 5; F(g, tx - 5, fl - 11, 11, 3, '#8f3a32'); F(g, tx - 5, fl - 11, 11, 1, '#b04a3a'); F(g, tx - 1, fl - 8, 2, 8, '#2a1a18'); F(g, tx - 4, fl - 1, 8, 1, '#2a1a18');
      F(g, tx - 7, fl - 13, 3, 13, '#1d1316'); F(g, tx + 5, fl - 13, 3, 13, '#1d1316');
      P1(g, tx, fl - 12, '#f3efe2'); P1(g, tx + 2, fl - 12, '#e6c85a');
    }
    F(g, gx + gw - 7, gy + 2, 1, 4, '#e6c85a'); F(g, gx + gw - 8, gy + 6, 3, 5, '#8a4b38'); F(g, gx + gw - 8, gy + 6, 3, 1, '#c98a5a');    // pato laqueado
  } else if (kind === 'polleria') {
    F(g, sx, fl - 12, gw - 4, 9, '#5c6570'); F(g, sx, fl - 12, gw - 4, 1, MT[4]); F(g, sx + 1, fl - 11, gw - 6, 7, '#2a2024');
    for (i = 0; i + 5 <= gw - 8; i += 6) { F(g, sx + 2 + i, fl - 10, 5, 4, '#c9863a'); F(g, sx + 2 + i, fl - 10, 5, 1, '#e6b060'); F(g, sx + 4 + i, fl - 8, 3, 2, '#8a4b24'); }
    F(g, sx + 1, fl - 5, gw - 6, 2, '#ff8a2a'); F(g, sx + 3, fl - 5, gw - 10, 1, '#f2e63c');
  } else if (kind === 'botica') {
    for (j = 0; j < 3; j++) { var sy = gy + 5 + j * 8; F(g, gx + 1, sy + 6, gw - 2, 1, '#8c8a93'); for (i = 0; i < gw - 5; i += 4) if (rnd() < 0.72) F(g, gx + 2 + i, sy + 2 + ((rnd() * 2) | 0), 3, 4, pick(rnd, ['#f3efe2', '#d6d1b8', '#5a8f80', '#a8c4e0', '#f3efe2'])); }
  } else {
    F(g, sx, fl - 9, gw - 4, 4, '#8a5a38'); F(g, sx, fl - 9, gw - 4, 1, '#c99458'); for (i = 0; i < gw - 8; i += 3) F(g, sx + 1 + i, fl - 12, 2, 3, pick(rnd, ['#b0402f', '#2f5a9e', '#e6c85a', '#5a8f80']));
  }
  g.line(gx + 3, gy + gh - 2, gx + 12, gy + 2, tinter('#ffffff', 0.22)('#54382c')); g.line(gx + 8, gy + gh - 2, gx + 13, gy + 8, tinter('#ffffff', 0.16)('#54382c'));
  for (i = 0; i < gh; i++) { var c = Q(g, gx + 3 + ((gh - 2 - i) * 9 / 26 | 0), gy + gh - 2 - i); }
  T(g, gx, gy, gw, 2, tAO); T(g, gx, gy, 1, gh, tAO2);
  var nm = Math.max(1, Math.round(w / 22)); for (i = 1; i < nm; i++) { var mx = gx + Math.round(i * gw / nm); F(g, mx, gy, 2, gh, MT[2]); F(g, mx, gy, 1, gh, MT[3]); }
  F(g, x, y + 30, w, 4, MT[1]); F(g, x, y + 30, w, 1, MT[3]); F(g, x, y + 33, w, 1, CON[3]);
}

/* ======================== TEXTO DE LETRERO ======================== */
function letters(g, str, cx, top, font, ink, sh, rnd, wear) {      // letra a letra: algunas bajan un paso (desgaste que no borra pixeles)
  var info = px.fonts[font], total = px.measure(str, font), x = cx - Math.floor(total / 2), faded = tinter('#8c8a93', 0.25)(ink);
  for (var i = 0; i < str.length; i++) {
    var ch = str[i], w = px.measure(ch, font);
    var c = (wear && rnd() < wear) ? faded : ink;
    if (ch !== ' ') px.text(g, ch, x, top, { font: font, ink: c, shadow: font === 'a7' ? sh : null });
    x += w + info.gap;
  }
}
var BANDS = {
  rojo:  { bg: '#8f3a32', hi: '#b5503f', sh: '#4e1f1a', ink: '#f3efe2' },
  azul:  { bg: '#2f4470', hi: '#4a6498', sh: '#1d2a48', ink: '#e6c85a' },
  verde: { bg: '#2f5a52', hi: '#3f7266', sh: '#1f3a36', ink: '#f3efe2' },
  amar:  { bg: '#e6c85a', hi: '#f2e3a0', sh: '#a88a3c', ink: '#1c1a22' },
  blanco:{ bg: '#f3efe2', hi: '#ffffff', sh: '#b9b49c', ink: '#1c1a22' },
  negro: { bg: '#1c1a22', hi: '#3a3846', sh: '#0d0c12', ink: '#e6c85a' },
  rojoAm:{ bg: '#8f3a32', hi: '#b5503f', sh: '#4e1f1a', ink: '#e6c85a' }
};
function hasMarks(s) { return /[ÁÉÍÓÚÜÑ]/i.test(s); }
/* banda de letrero (10 px) pintada a mano. (x,y) = esquina superior izquierda; textBox = ancho disponible para el texto */
function signBand(g, x, y, w, str, pal, rnd, o) {
  o = o || {};
  F(g, x, y, w, 10, pal.bg);
  F(g, x, y, w, 1, pal.hi); F(g, x, y + 9, w, 1, pal.sh); F(g, x, y, 1, 10, pal.sh); F(g, x + w - 1, y, 1, 10, pal.sh);
  var i, tl = tinter('#ffffff', 0.12), td = tinter('#2a2440', 0.14);
  for (i = 0; i < 3 + (w / 40 | 0); i++) { var bp = blob(5 + rnd() * 9, 2 + rnd() * 1.5, rnd), cx = x + 4 + ((rnd() * (w - 8)) | 0), lite = rnd() < 0.5; stamp(g, cx, y + 3 + ((rnd() * 4) | 0), bp, function (gg, xx, yy) { if (xx > x && xx < x + w - 1 && yy > y && yy < y + 9) T(gg, xx, yy, 1, 1, lite ? tl : td); }); }
  for (i = x + 2; i < x + w - 2; i++) if (rnd() < 0.12) { P1(g, i, y + 9, pal.bg); if (rnd() < 0.5) P1(g, i, y + 10, pal.sh); }        // borde inferior de brocha
  if (o.drips) for (i = 0; i < 2; i++) { var dx = x + 3 + ((rnd() * (w - 6)) | 0); F(g, dx, y + 10, 1, 2 + ((rnd() * 4) | 0), tinter(pal.sh, 0.5)('#8f8f8a')); }
  var tw = o.textW || w, tcx = (o.textX !== undefined ? o.textX : x + (w >> 1)), font = 'a7', s = str;
  if (px.measure(s, 'a7') > tw - 4) font = 'a5';
  while (s.length > 1 && px.measure(s, font) > tw - 4) s = s.slice(0, -1);
  letters(g, s, tcx, y + (font === 'a7' ? 2 : 3), font, pal.ink, pal.sh, rnd, 0.12);
  return font;
}
/* separa un nombre en [grande, chico]: si cabe entero va entero */
function splitName(name, avail) {
  var s = (name || '').toUpperCase();
  if (!s) return ['', ''];
  if (px.measure(s, 'a7') <= avail - 4) return [s, ''];
  var parts = s.split(' ');
  if (parts.length > 1) { var big = parts.slice(1).join(' '), small = parts[0]; if (px.measure(big, 'a7') <= avail - 4) return [big, small]; return [s, '']; }
  return [s, ''];
}
function wallText(g, str, x, y, ink, shadow) { px.text(g, str, x, y, { font: 'a5', ink: ink, shadow: shadow || null }); }
function chalkBoard(g, x, y, l1, l2) {                              // pizarra "HAY MENU" 20x16
  F(g, x, y, 20, 16, WD[1]); F(g, x + 1, y + 1, 18, 14, '#1f3a36'); F(g, x + 1, y + 1, 18, 1, '#2f5a52');
  px.text(g, l1, x + 10, y + 2, { font: 'a5', ink: '#efebdc', align: 'c' }); px.text(g, l2, x + 10, y + 9, { font: 'a5', ink: '#efebdc', align: 'c' });
  F(g, x + 3, y + 15, 14, 1, WD[0]); F(g, x + 2, y + 16, 2, 2, WD[1]); F(g, x + 16, y + 16, 2, 2, WD[1]);
}
function paintedPanel(g, x, y, w, h, lines, bg, ink, rnd, icons) {  // cartel pintado en la pared, con letras a5
  F(g, x, y, w, h, bg); frame(g, x, y, w, h, tinter('#2a2440', 0.35)(bg)); F(g, x + 1, y + 1, w - 2, 1, tinter('#ffffff', 0.3)(bg));
  var ty = y + 3;
  lines.forEach(function (ln) { px.text(g, ln, x + (w >> 1), ty, { font: 'a5', ink: ink, align: 'c' }); ty += 7; });
  if (icons) {
    var ix = x + 4, iy = y + h - 3;
    icons.forEach(function (ic) {
      if (ic === 'botella') { F(g, ix, iy - 7, 3, 7, '#2f5a52'); F(g, ix + 1, iy - 9, 1, 2, '#2f5a52'); P1(g, ix, iy - 6, '#5a8f80'); ix += 6; }
      else if (ic === 'pan') { F(g, ix, iy - 4, 7, 4, '#c9863a'); F(g, ix, iy - 4, 7, 1, '#e6b060'); P1(g, ix + 2, iy - 3, '#8a4b24'); P1(g, ix + 4, iy - 2, '#8a4b24'); ix += 9; }
      else if (ic === 'gas') { F(g, ix, iy - 7, 5, 7, '#b0452f'); F(g, ix, iy - 7, 1, 7, '#d36a4a'); F(g, ix + 1, iy - 9, 3, 2, '#7e868a'); ix += 8; }
      else if (ic === 'hielo') { F(g, ix, iy - 5, 6, 5, '#b4d0d0'); F(g, ix, iy - 5, 6, 1, '#efebdc'); P1(g, ix + 2, iy - 3, '#6b8c9c'); ix += 8; }
    });
  }
}
function lantern(g, x, y, rnd) {                                    // farolito chino rojo colgado: 8x12
  F(g, x + 3, y, 2, 2, '#e6c85a'); F(g, x + 1, y + 2, 6, 7, '#b0402f'); F(g, x, y + 3, 8, 5, '#b0402f'); F(g, x + 1, y + 3, 2, 4, '#d36a4a'); F(g, x + 7, y + 3, 1, 5, '#7a2a26');
  F(g, x + 1, y + 2, 6, 1, '#e6c85a'); F(g, x + 1, y + 8, 6, 1, '#e6c85a'); F(g, x + 3, y + 9, 2, 3, '#e6c85a'); P1(g, x + 3, y + 12, '#e6c85a');
}
function bulb(g, x, y) { F(g, x, y, 1, 3, '#2a2440'); F(g, x - 1, y + 3, 3, 3, '#ffe2b0'); P1(g, x, y + 3, '#ffffff'); P1(g, x, y + 6, '#ffcf8a'); }

/* ======================== PIEZAS "OVER" (capa alta sobre la vereda) ======================== */
var SHADOW_A = '#2a244060', SHADOW_B = '#2a244038';
function awning(go, x, y, w, cols, rnd) {                           // toldo a rayas: tela inclinada 8 px, volado de 4 px con festones
  var i, j;
  for (i = 0; i < w; i++) {
    var s = ((i / 5) | 0) & 1, c = cols[s], hi = tinter('#ffffff', 0.18)(c), lo = tinter('#2a2440', 0.28)(c), ph = i % 5;
    for (j = 0; j < 8; j++) {
      var cc = j < 2 ? hi : (j > 6 ? lo : c);
      if (ph === 0) cc = j < 2 ? hi : tinter('#ffffff', 0.08)(c);
      if (ph === 4) cc = lo;
      P1(go, x + i, y + j, cc);
    }
    var vc = tinter('#2a2440', s ? 0.2 : 0.12)(c);
    for (j = 8; j < 12; j++) { var edge = (j === 11 && (ph === 0 || ph === 4)); if (!edge) P1(go, x + i, y + j, j === 8 ? lo : vc); }
  }
  F(go, x - 1, y - 1, w + 2, 1, MT[1]); F(go, x - 1, y - 1, 1, 10, MT[1]); F(go, x + w, y - 1, 1, 10, MT[1]);
  F(go, x + 1, y + 12, w, 2, SHADOW_A); F(go, x + 2, y + 14, w - 2, 1, SHADOW_B);          // sombra sobre la pared, bajo el volado
}
function flagSign(go, x, y, kind, text, pal, lights) {              // letrero bandera 28x14 con soporte; frontal a la camara
  F(go, x + 3, y + 3, 28, 14, SHADOW_A);                              // sombra proyectada sobre la pared
  F(go, x - 2, y - 2, 5, 2, '#2a2430'); F(go, x + 12, y - 4, 2, 3, '#2a2430'); F(go, x + 26, y - 3, 2, 3, '#2a2430'); F(go, x, y - 1, 28, 1, '#2a2430');
  F(go, x, y, 28, 14, pal.bg); F(go, x, y, 28, 1, pal.hi); F(go, x, y + 13, 28, 1, pal.sh); F(go, x, y, 1, 14, pal.sh); F(go, x + 27, y, 1, 14, pal.sh);
  frame(go, x, y, 28, 14, '#1c1a22'); F(go, x + 1, y + 1, 26, 1, pal.hi);
  var cx = x + 14, cy = y + 7;
  if (kind === 'cruz') { F(go, cx - 1, cy - 4, 3, 9, '#5fc060'); F(go, cx - 4, cy - 1, 9, 3, '#5fc060'); F(go, cx - 1, cy - 3, 3, 1, '#c0f0b8'); F(go, cx - 4, cy - 1, 9, 1, '#c0f0b8'); F(go, cx - 1, cy + 4, 3, 1, '#2f7a40'); if (lights) lights.push({ x: x + 14, y: y + 7, kind: 'cruz' }); }
  else if (kind === 'pollo') {
    F(go, cx - 6, cy - 2, 11, 7, '#e6b060'); F(go, cx - 5, cy - 3, 9, 1, '#e6b060'); F(go, cx - 7, cy + 1, 3, 3, '#e6b060'); F(go, cx + 4, cy - 5, 4, 5, '#e6b060'); F(go, cx + 8, cy - 4, 2, 1, '#e6c85a');
    F(go, cx + 5, cy - 6, 2, 1, '#d02a2a'); P1(go, cx + 6, cy - 4, K); F(go, cx - 6, cy + 4, 11, 1, '#a8602a'); F(go, cx - 3, cy + 5, 1, 2, '#c9863a'); F(go, cx + 1, cy + 5, 1, 2, '#c9863a'); F(go, cx - 4, cy - 1, 5, 2, '#c9863a');
  } else if (kind === 'tazon') {
    F(go, cx - 7, cy, 14, 1, '#f3efe2'); F(go, cx - 6, cy + 1, 12, 2, '#f3efe2'); F(go, cx - 4, cy + 3, 8, 1, '#d6d1b8'); F(go, cx - 5, cy - 1, 10, 1, '#e6c85a'); F(go, cx - 3, cy - 3, 1, 2, '#efebdc'); F(go, cx + 1, cy - 4, 1, 3, '#efebdc'); P1(go, cx - 2, cy + 1, '#b0402f'); P1(go, cx + 2, cy + 1, '#b0402f');
    g_line(go, cx + 3, cy - 4, cx + 7, cy - 1, '#c9a66b'); g_line(go, cx + 5, cy - 4, cx + 8, cy - 1, '#c9a66b');
  } else if (kind === 'llave') {
    F(go, cx - 8, cy - 1, 12, 2, '#d6d1b8'); F(go, cx + 3, cy - 4, 5, 8, '#d6d1b8'); F(go, cx + 5, cy - 2, 3, 4, pal.bg); F(go, cx - 8, cy - 3, 2, 6, '#d6d1b8'); P1(go, cx - 7, cy - 4, '#d6d1b8');
  } else {
    var ts = text || '', tw2 = px.measure(ts, 'a5');
    px.text(go, ts, cx + ((tw2 & 1) ? 0 : 0), y + 4, { font: 'a5', ink: pal.ink, align: 'c' });
  }
  F(go, x + 12, y + 14, 2, 1, '#2a2430');
}
function g_line(g, a, b, c, d, col) { g.line(a, b, c, d, col); }
function balcony(g, x, y, w, o) {                                   // balcon: losa que vuela 4 px, baranda de fierro, sombra
  o = o || {}; var i, rnd = o.rnd || Math.random;
  F(g, x, y, w, 3, CON[3]); F(g, x, y, w, 1, CON[4]); F(g, x - 1, y + 3, w + 2, 3, CON[2]); F(g, x - 1, y + 3, w + 2, 1, CON[3]); F(g, x - 1, y + 5, w + 2, 1, CON[1]);
  T(g, x, y + 6, w + 1, 1, tAO3); T(g, x + 1, y + 7, w + 1, 2, tAO); T(g, x + 2, y + 9, w, 1, tAO2);
  var rc = o.rail || K, bh = 11;
  for (i = 1; i < w; i += 3) { if (o.dmg >= 3 && rnd() < 0.18) continue; F(g, x + i, y - bh + 3, 1, bh, rc); P1(g, x + i, y - bh + 4, '#5a586a'); }
  F(g, x, y - bh + 2, w, 2, rc); F(g, x, y - bh + 2, w, 1, '#4a4858'); F(g, x, y + 1, w, 1, rc); F(g, x, y - 4, w, 1, rc);
  T(g, x + 1, y - bh + 4, w, 1, tAO4);
}
function flagPeru(g, x, y) { F(g, x, y, 10, 7, '#efebdc'); F(g, x, y, 3, 7, '#b0402f'); F(g, x + 7, y, 3, 7, '#b0402f'); F(g, x + 4, y + 2, 2, 3, '#b0402f'); F(g, x, y + 6, 10, 1, '#c9c5b5'); F(g, x, y, 10, 1, '#f7e8cf'); }

/* tendal compartido: ropa colgada de una cuerda (azotea o escalera) */
function hangLine(g, x0, w, wy, sag, rnd, shadowFn, opt) {
  opt = opt || {};
  var i, x1 = x0 + w;
  for (i = 0; i < w; i++) { var t = (i - w / 2) / (w / 2); P1(g, x0 + i, wy + Math.round(sag * (1 - t * t)), '#3a3844'); }
  var cx = x0 + 3 + ((rnd() * 3) | 0);
  while (cx < x1 - 7) {
    var col = pick(rnd, opt.cols || CLOTH), kind = rnd(), t2 = (cx - x0 - w / 2) / (w / 2), ly = wy + Math.round(sag * (1 - t2 * t2)) + 1;
    var dark = tinter('#2a2440', 0.28)(col), lite = tinter('#ffffff', 0.25)(col), adv;
    if (kind < 0.35) { F(g, cx, ly, 6, 7, col); F(g, cx - 1, ly, 1, 3, col); F(g, cx + 6, ly, 1, 3, col); F(g, cx, ly, 6, 1, lite); F(g, cx + 5, ly + 1, 1, 6, dark); F(g, cx - 1, ly + 2, 1, 1, dark); P1(g, cx + 2, ly, dark); P1(g, cx + 3, ly, dark); adv = 9; }
    else if (kind < 0.62) { F(g, cx, ly, 5, 4, col); F(g, cx, ly + 4, 2, 6, col); F(g, cx + 3, ly + 4, 2, 6, col); F(g, cx, ly, 5, 1, lite); F(g, cx + 4, ly, 1, 10, dark); F(g, cx + 1, ly + 4, 1, 6, dark); adv = 8; }
    else if (kind < 0.8) { F(g, cx, ly, 5, 11, col); F(g, cx, ly, 5, 1, lite); F(g, cx + 4, ly, 1, 11, dark); F(g, cx, ly + 9, 5, 1, lite); F(g, cx + 1, ly + 10, 3, 1, dark); adv = 8; }
    else { F(g, cx, ly, 11, 12, col); F(g, cx, ly, 11, 1, lite); F(g, cx + 10, ly, 1, 12, dark); F(g, cx + 3, ly + 2, 1, 9, dark); F(g, cx + 7, ly + 3, 1, 8, lite); adv = 14; }
    P1(g, cx + 1, wy + Math.round(sag * (1 - t2 * t2)), '#e0d8c0');
    if (shadowFn) shadowFn(g, cx, ly, adv);
    cx += adv;
  }
}

/* ======================== CONTEXTO DE LOTE Y DISPOSICION ======================== */
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
var ACC = {
  celeste: [EX.coral, EX.mostaza, EX.naranja], menta: [RAMPS.rosado, EX.violeta, EX.coral], durazno: [EX.turquesa, EX.azulVivo, EX.violeta],
  ocre: [EX.azulVivo, EX.violeta, EX.turquesa], rosado: [EX.turquesa, EX.azulVivo, RAMPS.botella], blanco: [RAMPS.botella, EX.azulVivo, EX.rojoChifa],
  ladrillo: [EX.azulVivo, EX.turquesa, EX.mostaza], cemento: [EX.naranja, EX.azulVivo, EX.turquesa], rojo: [EX.mostaza, EX.turquesa], azul: [EX.mostaza, EX.coral],
  gris: [EX.naranja, EX.azulVivo], verde: [EX.mostaza, EX.coral]
};
function mkCtx(f) {
  var W = (f.c1 - f.c0 + 1) * 16, H = (f.r1 - f.r0 + 1) * 16, seed = (f.seed | 0) || 1234;
  var c = { f: f, W: W, H: H, g: new G(W, H), side: f.side === 'S' ? 'S' : 'N', seed: seed, rnd: px.rng(seed * 7919 + 13), r2: px.rng(seed * 104729 + 5), dmg: clamp(f.damage | 0 || 1, 1, 3),
    wall: wallOf(f.color), color: f.color || 'cemento', roofList: (f.roof || []).slice(), front: (f.front || []), lights: [], go: null, oy: 0, name: (f.name || '').toUpperCase() };
  var ac = ACC[c.color] || ACC.cemento;
  c.acc = ac[seed % ac.length]; c.acc2 = ac[(seed + 1) % ac.length];
  c.has = function (k) { return c.front.indexOf(k) >= 0; };
  return c;
}
function mkOver(c, top, h) { c.go = new G(c.W, h); c.oy = top; }
function finishOver(c) {
  if (!c.go) return {};
  var any = false; for (var i = 0; i < c.go.d.length; i++) if (c.go.d[i]) { any = true; break; }
  if (!any) return {};
  return { over: c.go.toCanvas(), overX: 0, overY: c.oy };
}
/* Reparto horizontal de piezas: items [{k, w, keep}] de izquierda a derecha. Quita piezas del final hasta que quepan con 4 px de aire. */
function bays(W, items, minGap) {
  minGap = minGap || 4;
  var list = items.slice(), tot, i;
  for (;;) {
    tot = 0; for (i = 0; i < list.length; i++) tot += list[i].w;
    if (W - tot >= (list.length + 1) * minGap || list.length <= 1) break;
    var idx = -1; for (i = list.length - 1; i >= 0; i--) if (!list[i].keep) { idx = i; break; }
    if (idx < 0) idx = list.length - 1;
    list.splice(idx, 1);
  }
  var free = W - tot, gap = Math.min(Math.floor(free / (list.length + 1)), 13), edge = Math.floor((free - gap * (list.length - 1)) / 2);
  var x = edge;
  list.forEach(function (it) { it.x = x; x += it.w + gap; });
  return list;
}

/* ======================== ROPA DE LA FACHADA: base, losas, parapeto, desgaste ======================== */
function slabLine(c, y, kind) {                                    // cornisa/losa de piso: filo claro y sombra bajo la losa
  var g = c.g, W = c.W, A = c.wall;
  if (kind === 'conc') { beamC(g, 0, y, W, 4); return; }
  F(g, 0, y, W, 1, A[4] || A[3]); F(g, 0, y + 1, W, 1, A[3]); F(g, 0, y + 2, W, 1, A[1]); T(g, 0, y + 3, W, 1, tAO); T(g, 0, y + 4, W, 1, tAO2);
}
function zocalo(c, col) {                                          // zocalo de 6 px mas oscuro con salitre
  var g = c.g, W = c.W, H = c.H, A = c.wall, z = col || A[1];
  F(g, 0, H - 6, W, 6, z); F(g, 0, H - 6, W, 1, tinter('#ffffff', 0.18)(z)); F(g, 0, H - 1, W, 1, tinter('#2a2440', 0.35)(z));
}
function parapetS(c, y0, wallRamp, style) {                        // parapeto sur (visto de frente): cara superior 2 px + cara 4 px, en las filas y0..y0+5
  var g = c.g, W = c.W, A = wallRamp, rnd = c.rnd;
  if (style === 'ladrillo') {
    brickFill(g, 0, y0 + 2, W, 4, rnd); F(g, 0, y0, W, 2, CON[3]); F(g, 0, y0, W, 1, CON[4]); F(g, 0, y0 + 5, W, 1, BR[0]);
  } else {
    F(g, 0, y0, W, 1, A[4] || A[3]); F(g, 0, y0 + 1, W, 1, A[3]); F(g, 0, y0 + 2, W, 3, A[2]); F(g, 0, y0 + 5, W, 1, A[1]);
    for (var i = 0; i < W / 14; i++) P1(g, (rnd() * W) | 0, y0 + 2 + ((rnd() * 3) | 0), rnd() < 0.5 ? A[1] : A[3]);
  }
  T(g, 0, y0 + 2, W, 1, tAO4);
  if (style === 'botellas') {                                      // vidrios de botella rotos en el filo
    var cols = ['#3f7266', '#5a8f80', '#8a5a2a', '#9bd0c0', '#3f7266'];
    for (var x = 2; x < W - 2; x += 3 + ((rnd() * 3) | 0)) { var h = 2 + ((rnd() * 3) | 0), cc = pick(rnd, cols); for (var j = 0; j < h; j++) F(g, x, y0 - 1 - j, h - j > 1 ? 2 : 1, 1, cc); P1(g, x, y0 - h, '#dbe6da'); }
  } else if (style === 'alambre') {
    for (var px_ = 6; px_ < W - 4; px_ += 28) F(g, px_, y0 - 4, 1, 4, '#3a3844');
    for (var xx = 6; xx < W - 4; xx++) { P1(g, xx, y0 - 4 + (((xx >> 1) & 1)), '#4a4858'); P1(g, xx, y0 - 2, '#3a3844'); }
  }
}
function parapetN(c, wallRamp, style) {                            // parapeto del borde norte, visto por dentro: cara 4 px y filo 2 px; y sus lados
  var g = c.g, W = c.W, H = c.H, A = wallRamp, rows = c.roofEnd;
  F(g, 0, 0, W, 2, A[4] || A[3]); F(g, 0, 2, W, 4, A[2]); F(g, 0, 2, W, 1, A[3]); F(g, 0, 5, W, 1, A[1]);
  T(g, 0, 6, W, 1, tAO); T(g, 0, 7, W, 2, tAO2);
  F(g, 0, 0, 3, rows, A[3]); F(g, 0, 0, 1, rows, A[4] || A[3]); F(g, W - 3, 0, 3, rows, A[1]); F(g, W - 1, 0, 1, rows, A[0]);
  T(g, 3, 6, 1, rows - 6, tAO2); T(g, 4, 6, 1, rows - 6, tAO4);
  if (style === 'ladrillo') brickFill(g, 0, 2, W, 4, c.r2);
}
function medianeras(c, wallTopY) {                                  // cantos de los muros laterales y sombras del vecino alto
  var g = c.g, H = c.H, W = c.W, f = c.f, myH = c.floors, y0 = wallTopY;
  function hOf(fl) { return fl <= 0 ? 0 : 48 + 32 * (fl - 1); }
  var nbW = f.nbW === undefined ? myH : f.nbW, nbE = f.nbE === undefined ? myH : f.nbE;
  var A = c.wall;
  if (nbW < myH) { var top = nbW < 0 ? y0 : Math.min(H, H - hOf(nbW)); if (top > y0) { /* vecino bajo: canto claro (da al oeste, recibe luz) */ var th = H - hOf(nbW); F(g, 0, y0, 2, Math.max(0, th - y0), A[3]); F(g, 0, y0, 1, Math.max(0, th - y0), A[4] || A[3]); } else F(g, 0, y0, 2, H - y0, A[3]); }
  if (nbE < myH) { var te = nbE < 0 ? H : H - hOf(nbE); F(g, W - 3, y0, 3, Math.max(0, te - y0), A[1]); F(g, W - 1, y0, 1, Math.max(0, te - y0), A[0]); }
  if (nbW > myH) { var sh = Math.min(22, (nbW - myH) * 14 + 4); for (var i = 0; i < sh; i++) TD(g, i, 0, 1, H, i < sh * 0.5 ? tAO2 : tAO4, i & 1); }
}
function wear(c, y0, y1, A, brickish) {                              // desgaste con causa: salitre, descascarado, grietas, parches
  var g = c.g, W = c.W, H = c.H, r = c.r2, d = c.dmg, i;
  if (!brickish) {
    salitre(g, 0, H - 22, W, 18, r, d);
    var np = d - 1 + ((r() * 2) | 0);
    for (i = 0; i < np; i++) { var cx = 6 + ((r() * (W - 12)) | 0), cy = y0 + 4 + ((r() * Math.max(2, (y1 - y0 - 14))) | 0); if (cy < H - 22) peel(g, cx, cy, 3 + r() * 4, 2 + r() * 3, A, r, d >= 2); }
    if (d >= 2) { var px0 = 4 + ((r() * (W - 30)) | 0), py0 = y0 + 6 + ((r() * Math.max(2, y1 - y0 - 30)) | 0); if (py0 < H - 30) plasterPatch(g, px0, py0, 8 + ((r() * 6) | 0), 6 + ((r() * 4) | 0), A, r); }
    for (i = 0; i < d; i++) crack(g, 4 + ((r() * (W - 8)) | 0), y0 + 8 + ((r() * Math.max(2, y1 - y0 - 22)) | 0), 6 + ((r() * 8) | 0), r, r() < 0.5 ? 1 : -1);
  } else {
    for (i = 0; i < 4 + d * 2; i++) { var sx = 4 + ((r() * (W - 8)) | 0); drip(g, sx, y0 + 6 + ((r() * Math.max(2, (y1 - y0) - 24)) | 0), 5 + ((r() * 10) | 0), 0.3); }
    var hp = blob(5, 3, r); for (i = 0; i < d; i++) stamp(g, 8 + ((r() * (W - 16)) | 0), H - 8 - ((r() * 10) | 0), hp, function (gg, x, y) { if (((x + y) & 1) === 0) T(gg, x, y, 1, 1, tinter('#c9c5b5', 0.5)); });
  }
}

/* ======================== AZOTEA: superficie, props, columnas ======================== */
function rebarColumn(g, x, y, h, rnd) {                            // columna de espera (cemento con 2 fierros) que sube desde la losa: forma simple, legible a 1x
  F(g, x, y - h, 4, h, CON[2]); F(g, x, y - h, 1, h, CON[3]); F(g, x + 3, y - h, 1, h, CON[1]); F(g, x, y - h, 4, 1, CON[4]);
  shadowRoof(g, x, y, 4, 5);
  var rh = 9 + ((rnd() * 3) | 0);
  F(g, x + 1, y - h - rh, 1, rh, RU[3]); F(g, x + 2, y - h - rh + 1, 1, rh - 1, RU[1]);           // dos fierros limpios, uno apenas mas corto
  if (rnd() < 0.4) { var bc = pick(rnd, ['#8fb0b8', '#9bd0c0', '#a9c4e6']); F(g, x, y - h - rh - 5, 3, 5, bc); F(g, x, y - h - rh - 5, 1, 4, '#dbe6da'); }   // a veces una botella en la punta
}
function vent(g, x, y) { F(g, x, y - 9, 2, 9, '#d6d1b8'); F(g, x, y - 9, 1, 9, '#efebdc'); F(g, x - 1, y - 11, 4, 2, '#d6d1b8'); F(g, x - 1, y - 10, 4, 1, '#8f8f8a'); shadowRoof(g, x - 1, y, 4, 4); }
function hatch(g, x, y, w) { shadowRoof(g, x, y, w, 4); F(g, x, y - 5, w, 5, CON[2]); F(g, x, y - 5, w, 1, CON[4]); F(g, x, y - 5, 1, 5, CON[3]); F(g, x + w - 1, y - 5, 1, 5, CON[1]); F(g, x, y - 1, w, 1, CON[1]); F(g, x + 2, y - 4, w - 4, 3, CON[3]); F(g, x + w - 4, y - 3, 2, 1, MT[1]); }
var DEF_PROPS = ['dog', 'plants', 'chair', 'bricks', 'cement', 'drums', 'antenna', 'tank', 'table', 'clothesline', 'gas', 'planks'];
var VARIETY = ['dog', 'plants', 'chair', 'bricks', 'cement', 'drums', 'antenna', 'tank', 'table', 'clothesline', 'gas', 'planks', 'sand', 'barrel', 'tires', 'hood'];
/* Suma n piezas del roofKit que la azotea todavia no tiene (variedad): las azoteas de 1 piso y las del lado S quedaban casi vacias. Solo agrega; placeProps descarta las que no caben. */
function moreProps(c, names, n) {
  var have = {}, i, guard = 40;
  names.forEach(function (nm) { have[roofKit.alias[nm] || nm] = 1; });
  while (n > 0 && guard--) { var k = pick(c.r2, VARIETY); if (have[k]) continue; have[k] = 1; names.push(k); n--; }
  return names;
}
function placeProps(c, yTop, yBot, names, opts) {                    // reparto sin solaparse; (y = fila de base). Orden de dibujo: de atras hacia adelante
  var g = c.g, W = c.W, rnd = c.r2, placed = [], list = [];
  opts = opts || {};
  names.forEach(function (nm) { var k = roofKit.alias[nm] || nm; if (roofKit.size[k]) list.push(k); });
  list.sort(function (a, b) { return roofKit.size[b][0] * roofKit.size[b][1] - roofKit.size[a][0] * roofKit.size[a][1]; });
  var pend = [];
  list.forEach(function (k) {
    var sz = roofKit.size[k], w = sz[0], h = sz[1], tries = 40;
    if (yBot - yTop < h * 0.7 || W < w + 10) return;
    while (tries--) {
      var x = 6 + (w >> 1) + ((rnd() * (W - 12 - w)) | 0), y = yTop + h + ((rnd() * Math.max(1, yBot - yTop - h)) | 0);
      if (y > yBot) y = yBot;
      var bx0 = x - (w >> 1) - 3, bx1 = x + (w >> 1) + 3, by0 = y - h - 1, by1 = y + 7, ok = true;
      for (var i = 0; i < placed.length; i++) { var p = placed[i]; if (bx0 < p[2] && bx1 > p[0] && by0 < p[3] && by1 > p[1]) { ok = false; break; } }
      if (opts.avoid) for (i = 0; i < opts.avoid.length; i++) { var q = opts.avoid[i]; if (bx0 < q[2] && bx1 > q[0] && by0 < q[3] && by1 > q[1]) { ok = false; break; } }
      if (ok) { placed.push([bx0, by0, bx1, by1]); pend.push([k, x, y]); break; }
    }
  });
  pend.sort(function (a, b) { return a[2] - b[2]; });
  pend.forEach(function (p) {
    var o = { rnd: c.r2, color: (p[0] === 'tank' && c.r2() < 0.3) ? 'azul' : undefined, dish: (p[0] === 'antenna' && c.r2() < 0.35), n: (p[0] === 'drums' ? 2 + ((c.r2() * 1.9) | 0) : undefined), w: p[0] === 'clothesline' ? Math.min(44, W - 20) : undefined, ramp: opts.ramp };
    roofKit[p[0]](g, p[1], p[2], o);
  });
  return placed;
}
function roofProps(c, yTop, yBot, extra) {                          // elige 2-3 objetos: los de la ficha + algunos por semilla
  var names = c.roofList.slice(), r = c.r2;
  var span = yBot - yTop, target = clamp(2 + Math.floor(span * c.W / 3000), 2, 7);
  if (names.length < target) { var pool = extra || DEF_PROPS; var guard = 30; while (names.length < target && guard--) { var n = pick(r, pool); if (names.indexOf(n) < 0) names.push(n); } }
  if (span > 50 && (c.floors >= 2 || r() < 0.3) && names.indexOf('escalera') < 0 && !c.noStairbox && r() < 0.6) names.push('escalera');
  if (span > 40) moreProps(c, names, (c.floors <= 1 ? 2 : 1) + (c.seed & 1));
  var avoid = [];
  if (span > 40) { var hx = 10 + ((r() * Math.max(1, c.W - 40)) | 0), hy = yBot - 4 - ((r() * 8) | 0); hatch(c.g, hx, hy, 12); avoid.push([hx - 2, hy - 7, hx + 14, hy + 5]); if (r() < 0.6) { var vx = hx + 20 + ((r() * 40) | 0); if (vx < c.W - 12) { vent(c.g, vx, hy - ((r() * 12) | 0)); } } }
  return placeProps(c, yTop, yBot, names, { avoid: avoid, ramp: c.wall });
}

/* ======================== CONSTRUCTOR DE LOTE (lado N) ======================== */
function faceOf(c) {
  var f = c.f, rows = f.r1 - f.r0 + 1, ft = f.face || px.faceTiles(f);
  return Math.max(3, Math.min(ft, rows)) * 16;
}
function buildN(c, S) {
  var g = c.g, W = c.W, H = c.H, f = c.f, A = c.wall;
  var faceH = faceOf(c), faceY = H - faceH, gTop = H - 48, nUp = Math.max(0, Math.floor((faceH - 48) / 32));
  var unfinished = !!S.unfinished && nUp >= 1;
  c.floors = nUp + 1; c.faceH = faceH; c.faceY = faceY; c.gTop = gTop; c.nUp = nUp;
  var wallTop = faceY + (unfinished ? 16 : 0);
  c.roofEnd = wallTop;
  var pal = S.parapetRamp || A;
  // 1) azotea
  if (wallTop > 0) {
    roofSurface(g, 0, 0, W, wallTop, unfinished ? 'deck' : (S.roofKind || 'losa'), c.r2);
    if (wallTop >= 26) parapetN(c, pal, S.parapetStyleN);
    var yTop = wallTop >= 26 ? 10 : 2, yBot = wallTop - (unfinished ? 12 : 10);
    if (unfinished) {                                                    // columnas de espera sobre las columnas de la fachada
      var cols = S.colXs || [];
      cols.forEach(function (x) { rebarColumn(g, x, wallTop - 1, 18 + ((c.r2() * 5) | 0), c.r2); });
    }
    if (S.roofFn) S.roofFn(c, yTop, yBot); else roofProps(c, yTop, yBot);
    if (S.valla && Lx() && wallTop >= 100) {                              // v0.6: valla de marca sobre la azotea, de cara a la calle
      var vw = Math.min(72, c.W - 24), vx = 10 + (((c.seed * 7) >> 2) % Math.max(1, c.W - vw - 20));
      Lx().valla(g, S.valla, vx, wallTop - 42, vw, 30, wallTop - 8);
    }
    if (!unfinished) parapetS(c, wallTop - 6, pal, S.parapetStyle);
  }
  // 2) muro base
  if (S.wallFn) S.wallFn(c, wallTop, H);
  // 3) piso sin terminar
  if (unfinished) {
    beamC(g, 0, wallTop, W, 3); F(g, 0, wallTop - 1, W, 1, CON[4]);
    T(g, 0, wallTop - 2, W, 1, tAO4);
  }
  // 4) planta baja y pisos altos (los dibuja el arquetipo)
  S.ground(c, gTop);
  for (var k = 1; k <= nUp; k++) {
    var yt = gTop - 32 * k;
    if (unfinished && k === nUp) continue;
    S.upper(c, k, yt);
  }
  if (S.after) S.after(c);
  medianeras(c, wallTop);
  return finish(c);
}
function finish(c) {
  var r = finishOver(c);
  return { canvas: c.g.toCanvas(), over: r.over || null, overX: r.overX || 0, overY: r.overY || 0, lights: c.lights };
}

/* ======================== LADO S: SOLO AZOTEA, CON PARAPETO AL NORTE ======================== */
var PANEL_TXT = [['SE VENDE', 'HIELO'], ['SE ALQUILA'], ['GAS'], ['NO', 'ESTACIONAR'], ['FIADO NO'], ['ABIERTO']];
function roofPanel(c, w, x, y, o) {                                 // panel pintado que mira al sur, en la azotea: tablero con patas y sombra
  var g = c.g, rnd = c.rnd, h = o.h || 24, bg = o.bg, ink = o.ink, sh = o.sh || '#1c1a22';
  var tx = Math.round(x), ty = Math.round(y);
  shadowRoof(g, tx + 2, ty + h + 2, w, 9);
  F(g, tx + 4, ty + h, 2, 6, MT[1]); F(g, tx + w - 6, ty + h, 2, 6, MT[1]);
  F(g, tx, ty, w, h, bg); F(g, tx, ty, w, 1, tinter('#ffffff', 0.3)(bg)); F(g, tx, ty + h - 1, w, 1, sh); F(g, tx + w - 1, ty, 1, h, tinter('#2a2440', 0.3)(bg)); F(g, tx, ty, 1, h, tinter('#ffffff', 0.15)(bg));
  frame(g, tx + 1, ty + 1, w - 2, h - 2, o.border || ink); F(g, tx, ty + h - 3, w, 3, tinter('#2a2440', 0.18)(bg)); F(g, tx, ty + h - 1, w, 1, sh);
  var i; for (i = 0; i < 4; i++) { var dx = tx + 3 + ((rnd() * (w - 6)) | 0); F(g, dx, ty + h - 1, 1, 2 + ((rnd() * 4) | 0), tinter('#2a2440', 0.3)(bg)); }
  return [tx, ty, w, h];
}
function buildS(c, S) {
  var g = c.g, W = c.W, H = c.H, A = c.wall, f = c.f;
  var pal = S.parapetRamp || A;
  c.roofEnd = H; c.floors = Math.max(1, c.floors);
  roofSurface(g, 0, 0, W, H, S.roofKind || 'losa', c.r2);
  parapetN(c, pal, S.parapetStyleN || S.parapetStyle);
  F(g, 0, H - 2, W, 2, pal[3]); F(g, 0, H - 2, W, 1, pal[4] || pal[3]);
  var avoid = [], top = 12;
  if (S.panel && c.has('panel') && W >= 80) {
    var pw = Math.min(W - 24, S.panel.w || 84), px0 = 10 + ((c.rnd() * (W - 20 - pw)) | 0);
    var rr = roofPanel(c, pw, px0, 9, S.panel);
    S.panel.draw(c, rr[0], rr[1], rr[2], rr[3]);
    avoid.push([rr[0] - 2, rr[1] - 1, rr[0] + rr[2] + 14, rr[1] + rr[3] + 18]);
    top = rr[1] + rr[3] + 8;
  }
  if (S.unfinishedS) { var n = 2 + ((c.r2() * 2) | 0); for (var i = 0; i < n; i++) { var rx = 10 + ((c.r2() * (W - 24)) | 0); rebarColumn(g, rx, top + 8 + ((c.r2() * (H - top - 24)) | 0), 12 + ((c.r2() * 6) | 0), c.r2); } }
  var names = c.roofList.slice(); c.noStairbox = false;
  if (S.roofFnS) S.roofFnS(c, top, H - 8, avoid);
  else { if (names.length < 2) { var pool = S.pool || DEF_PROPS; var tgt = clamp(3 + Math.floor(H * W / 3600), 3, 6); var gd = 60; while (names.length < tgt && gd--) { var nn = pick(c.r2, gd > 20 ? pool : DEF_PROPS); if (names.indexOf(nn) < 0) names.push(nn); } } if (c.floors >= 2 && c.r2() < 0.5 && names.indexOf('escalera') < 0) names.push('escalera'); if (H - top > 40) moreProps(c, names, 2 + (c.seed & 1)); placeProps(c, top, H - 8, names, { avoid: avoid, ramp: A }); }
  if (c.has('panel') && S.panel) { /* ya dibujado */ }
  // sombra del vecino alto del oeste
  var f2 = c.f, nbW = f2.nbW === undefined ? 0 : f2.nbW;
  if (nbW > (f2.floors || 1)) for (var j = 0; j < 12; j++) TD(g, j, 8, 1, H - 8, j < 6 ? tAO2 : tAO4, j & 1);
  return finish(c);
}

/* ======================== OBJETOS DE FACHADA ======================== */
function crates(g, x, y, rnd) {                                    // jabas de plastico apiladas
  var cols = ['#b0402f', '#2f5a9e', '#d6a94a', '#2f7a50'], n = 2 + ((rnd() * 2) | 0);
  for (var i = 0; i < n; i++) {
    var cy = y - 6 * (i + 1), c = cols[(i + ((rnd() * 4) | 0)) % 4], lt = tinter('#ffffff', 0.3)(c), dk = tinter('#2a2440', 0.4)(c);
    F(g, x, cy, 13, 6, c); F(g, x, cy, 13, 1, lt); F(g, x, cy + 5, 13, 1, dk);
    for (var k = 1; k < 13; k += 3) F(g, x + k, cy + 2, 1, 3, dk);
    F(g, x + 12, cy, 1, 6, dk); P1(g, x, cy + 1, lt);
  }
  T(g, x, y, 14, 1, tAO3);
}
function freezer(g, x, y) {                                        // congeladora horizontal con HIELO
  F(g, x, y - 14, 25, 4, '#d6d1b8'); F(g, x, y - 14, 25, 1, '#efebdc'); F(g, x, y - 11, 25, 1, '#8f8f8a');
  F(g, x, y - 10, 25, 10, '#bdb9ab'); F(g, x, y - 10, 1, 10, '#d8d4c4'); F(g, x + 24, y - 10, 1, 10, '#8c8a93'); F(g, x, y - 1, 25, 1, '#8c8a93');
  F(g, x + 3, y - 9, 19, 7, '#3f72b0'); F(g, x + 3, y - 9, 19, 1, '#6a95c8');
  px.text(g, 'HIELO', x + 12, y - 8, { font: 'a5', ink: '#f3efe2', align: 'c' });
  F(g, x + 2, y - 15, 21, 1, '#8c8a93'); F(g, x + 22, y - 12, 2, 3, MT[1]);
  T(g, x, y, 26, 1, tAO3); T(g, x + 1, y + 1, 26, 1, tAO2);
}
function medidor(g, x, y, rnd) {                                   // medidor de luz con cables
  F(g, x, y, 7, 9, '#8c8a93'); frame(g, x, y, 7, 9, '#5f5d6b'); F(g, x + 1, y + 1, 5, 5, GL[2]); P1(g, x + 2, y + 2, '#dbe6da'); F(g, x + 3, y + 7, 2, 1, '#5f5d6b');
  var xx = x + 3; for (var j = 1; j < 12; j++) { P1(g, xx, y - j, '#1c1a22'); if (rnd() < 0.35) xx += rnd() < 0.5 ? 1 : -1; }
  var xx2 = x + 5; for (j = 1; j < 9; j++) { P1(g, xx2, y - j, '#2a2830'); if (rnd() < 0.4) xx2 += 1; }
  T(g, x + 7, y + 1, 1, 9, tAO2);
}
function extStair(c, x, top, dir) {                                // escalera exterior de cemento (sube de la vereda al primer piso)
  var g = c.g, H = c.H, rnd = c.rnd, steps = Math.floor((H - top) / 4);
  for (var i = 0; i < steps; i++) {
    var sx = dir > 0 ? x + i * 5 : x - i * 5 - 5, sy = H - 4 * (i + 1);
    F(g, sx, sy, 5, H - sy, CON[2]); F(g, sx, sy, 5, 1, CON[4]); F(g, sx, sy + 1, 1, H - sy - 1, CON[3]); F(g, sx + 4, sy + 1, 1, H - sy - 1, CON[1]);
  }
  var tx = dir > 0 ? x + steps * 5 : x - steps * 5 - 12;
  F(g, tx, top, 12, 4, CON[3]); F(g, tx, top, 12, 1, CON[4]); F(g, tx, top + 3, 12, 1, CON[1]);
  var x1 = dir > 0 ? x : x - 1, x2 = dir > 0 ? x + steps * 5 : x - steps * 5;
  g.line(x1, H - 14, dir > 0 ? x2 : x2, top - 10, K); g.line(x1, H - 15, x2, top - 11, '#4a4858');
  for (i = 0; i <= steps; i += 3) { var px_ = dir > 0 ? x + i * 5 : x - i * 5; F(g, px_, H - 4 * i - 14, 1, 10, K); }
  T(g, dir > 0 ? x + 2 : x - 6, top + 4, 12, 1, tAO);
}
function numPlate(g, x, y, num) { F(g, x, y, 13, 8, '#efebdc'); frame(g, x, y, 13, 8, '#3f72b0'); px.text(g, num, x + 6, y + 2, { font: 'a5', ink: '#1c1a22', align: 'c' }); }

/* ======================== VENTANAS: TIPOS Y LUCES ======================== */
function winKinds(c, n, base) {
  var r = c.rnd, d = c.dmg, kinds = [], i;
  var pool = d === 1 ? ['vidrio', 'cortina', 'reja', 'persianilla', 'maceta'] : (d === 2 ? ['vidrio', 'cortina', 'reja', 'plastico', 'maceta', 'persianilla'] : ['reja', 'cortina', 'plastico', 'rota', 'tapiada', 'vidrio']);
  var b = base || pick(r, pool);
  for (i = 0; i < n; i++) kinds.push(r() < 0.6 ? b : pick(r, pool));
  if (n >= 2 && kinds.every(function (k) { return k === b; })) kinds[(r() * n) | 0] = pick(r, pool.filter(function (x) { return x !== b; }));
  if (c.lit && n >= 1 && !c.litDone) { kinds[(r() * n) | 0] = 'luz'; c.litDone = true; }
  return kinds;
}
function drawWin(c, x, y, kind, frameCol, extra) {
  var o = { rnd: c.rnd, frame: frameCol, curtain: undefined, lights: null, silueta: c.rnd() < 0.3, lintel: extra && extra.lintel };
  if (kind === 'luz') o.lights = { push: function (L) { c.lights.push({ x: x + 9, y: y + 8, w: 16, h: 14, kind: 'local' }); } };
  win(c.g, x, y, kind, o);
  if (kind === 'maceta') roofKit.plants(c.g, x + 9, y + 16, { rnd: c.rnd, n: 2 });
}

/* ======================== BANDA DE LETRERO Y PLANTA BAJA DE TIENDA ======================== */
var BANDBAN = { celeste: 'azul', menta: 'verde', rosado: 'rojo', blanco: 'blanco', ocre: 'amar', durazno: 'rojo' };
function pickBand(c, list) {
  var ban = BANDBAN[c.color], l = list.filter(function (k) { return k !== ban; });
  return BANDS[l[c.seed % l.length]];
}
function icon(go, kind, cx, cy) {
  if (kind === 'cruz') { F(go, cx - 1, cy - 3, 3, 7, '#5fc060'); F(go, cx - 3, cy - 1, 7, 3, '#5fc060'); F(go, cx - 1, cy - 3, 3, 1, '#c0f0b8'); }
  else if (kind === 'pollo') { F(go, cx - 4, cy - 1, 7, 4, '#e6b060'); F(go, cx - 3, cy - 2, 5, 1, '#e6b060'); F(go, cx + 2, cy - 3, 3, 3, '#e6b060'); P1(go, cx + 3, cy - 4, '#d02a2a'); P1(go, cx + 5, cy - 2, '#e6c85a'); F(go, cx - 3, cy + 3, 6, 1, '#a8602a'); }
  else if (kind === 'tazon') { F(go, cx - 4, cy, 9, 1, '#f3efe2'); F(go, cx - 3, cy + 1, 7, 2, '#f3efe2'); F(go, cx - 2, cy + 3, 5, 1, '#d6d1b8'); F(go, cx - 1, cy - 2, 1, 2, '#efebdc'); F(go, cx + 1, cy - 3, 1, 3, '#efebdc'); }
  else if (kind === 'llave') { F(go, cx - 5, cy - 1, 8, 2, '#d6d1b8'); F(go, cx + 2, cy - 3, 3, 6, '#d6d1b8'); F(go, cx + 3, cy - 1, 2, 2, '#1c1a22'); }
}
function bayWidth(it) { return it.w; }
/* o: { pal, label, items:[{k,w,...}], mayolica, flag:{kind,text}, hasFlagSpace, zocalo } */
function shopGround(c, o) {
  var g = c.g, W = c.W, H = c.H, gT = c.gTop, rnd = c.rnd, A = c.wall;
  slabLine(c, gT, o.slab);
  if (o.mayolica) o.mayolica(c); else zocalo(c, o.zocalo);
  var pal = o.pal, flagOn = !!o.flag && W >= 112 && !o.noFlag;
  var items = bays(W, o.items(c, W), 4);
  var flagLeft = !!o.flagLeft;
  if (flagOn) {                                                      // el letrero bandera va en el extremo donde no tapa el vano de la tienda
    var first = items[0], last = items[items.length - 1], bad = { pers: 1, vit: 1 };
    if (bad[first.k] && !bad[last.k]) flagLeft = false; else if (bad[last.k] && !bad[first.k]) flagLeft = true;
  }
  var flagX = flagLeft ? 3 : W - 31;
  var bx = 3, bw = W - 6, tx = W >> 1, tw = bw, label = c.name, sub = '';
  if (flagOn) { tw = W - 6 - 32; tx = flagLeft ? 3 + 32 + (tw >> 1) : 3 + (tw >> 1); }
  var capsDone = [];
  var Lc = Lx(), nameStr = (label || o.label || '').toUpperCase();
  if (Lc && o.caps && o.caps.length && nameStr) {                    // remates de marca en los extremos de la banda (v0.6)
    var x0 = 3 + (flagOn && flagLeft ? 32 : 0), x1 = W - 3 - (flagOn && !flagLeft ? 32 : 0), caps = o.caps.filter(function (b) { return !!b; });
    var plans = [['a7', 2], ['a7', 1], ['a5', 2], ['a5', 1]], pick_ = null;
    for (var pi = 0; pi < plans.length && !pick_; pi++) {
      var nwid = px.measure(nameStr, plans[pi][0]), use = caps.slice(0, plans[pi][1]), cw = 0;
      if (use.length < plans[pi][1]) continue;
      use.forEach(function (b) { cw += Lc.capW(b) + 3; });
      if (nwid + 8 + cw <= x1 - x0) pick_ = use;
    }
    if (pick_) {
      var lw = Lc.capW(pick_[0]), rw = pick_[1] ? Lc.capW(pick_[1]) : 0, tl = x0 + 1 + lw + 3, tr = x1 - 1 - (rw ? rw + 3 : 0);
      if (!rw) { /* una sola marca: va a la izquierda del nombre */ }
      tw = tr - tl + 4; tx = (tl + tr) >> 1;
      capsDone = [{ id: pick_[0], x: x0 + 1, w: lw }];
      if (rw) capsDone.push({ id: pick_[1], x: x1 - 1 - rw, w: rw });
    }
  }
  if (label) signBand(g, 3, gT + 2, W - 6, label.toUpperCase(), pal, rnd, { textW: tw, textX: tx, drips: c.dmg >= 2 });
  else signBand(g, 3, gT + 2, W - 6, o.label || '', pal, rnd, { textW: tw, textX: tx, drips: c.dmg >= 2 });
  capsDone.forEach(function (cp) { Lc.cap(g, cp.id, cp.x, gT + 3, cp.w, 8); });
  c.capBrands = capsDone.map(function (cp) { return cp.id; });
  if (!flagOn && !capsDone.length && o.icon && px.measure((label || o.label || '').toUpperCase(), 'a7') + 30 <= bw - 4) { var ic = o.icon; icon(g, ic, 9, gT + 7); icon(g, ic, W - 10, gT + 7); }
  // piezas
  items.forEach(function (it) {
    var x = it.x, y34 = H - 34;
    switch (it.k) {
      case 'door': door(g, x, y34, it.type, { accent: o.accent || c.acc, rnd: rnd, dmg: c.dmg, frame: A[0], yape: it.yape }); break;
      case 'pers': persiana(g, x, y34, it.w, it.state, { rnd: rnd, dmg: c.dmg, tag: it.tag, ad: it.ad }); if (it.state !== 'cerrada') c.lights.push({ x: x + (it.w >> 1), y: H - 15, w: it.w - 4, h: 16, kind: 'local' }); break;
      case 'vit': vitrina(g, x, y34, it.w, it.kind, { rnd: rnd, lit: it.lit }); if (it.lit !== false) c.lights.push({ x: x + (it.w >> 1), y: H - 18, w: it.w - 4, h: 26, kind: 'local' }); break;
      case 'win': drawWin(c, x, H - 30, it.type, it.frame || '#1c1a22'); break;
      case 'panel': paintedPanel(g, x, H - 36, it.w, 28, it.lines, it.bg, it.ink, rnd, it.icons); break;
      case 'price': paintedPanel(g, x, H - 32, it.w, 17, it.lines, it.bg, it.ink, rnd); break;
      case 'small': paintedPanel(g, x, H - 32, it.w, 11, [it.text], it.bg, it.ink, rnd); break;
      case 'chalk': chalkBoard(g, x, H - 32, it.l1, it.l2); break;
      case 'freezer': freezer(g, x, H - 1); break;
      case 'crates': if (Lx()) Lx().jabas(g, x, H - 1, 3 + ((c.seed >> 1) & 1), { rnd: rnd }); else crates(g, x, H - 1, rnd); break;
      case 'jabasK': Lx().jabas(g, x, H - 1, 3, { rnd: rnd, col: '#d6a94a', logo: '#2b3990' }); break;
      case 'ad': Lx().ad(g, it.brand, x, H - 35, it.w, 26, { rnd: rnd }); break;
      case 'chest': Lx().chest(g, it.brand, x, H - 1, { lit: it.lit }); if (it.lit) c.lights.push({ x: x + 15, y: H - 12, w: 26, h: 5, kind: 'local', col: '#1a3a66' }); break;
      case 'tall': Lx().tall(g, it.brand, x, H - 1, {}); break;
      case 'cardH': Lx().hand[it.card](g, x, H - 33, { rnd: rnd }); break;
      case 'gas': for (var q = 0; q < (it.n || 2); q++) roofKit.gas(g, x + 4 + q * 9, H - 1, { color: q ? 'azul' : undefined }); break;
      case 'medidor': medidor(g, x, H - 40, rnd); break;
      case 'plants': roofKit.plants(g, x + (it.w >> 1), H - 1, { rnd: rnd, n: 3 }); break;
    }
  });
  c.items = items;
  c.flagX = flagX; c.flagOn = flagOn;
  return items;
}
function doorTypeFor(c) { return pick(c.rnd, c.dmg >= 3 ? ['fierro', 'reja', 'madera'] : ['fierro', 'madera', 'reja', 'fierro']); }
function ordered(c, door, rest) {                                  // la puerta a la izquierda, a la derecha o en medio, segun la semilla
  var m = c.seed % 3, r = rest.slice();
  if (m === 0) return [door].concat(r);
  if (m === 1) return r.concat([door]);
  var half = Math.ceil(r.length / 2); return r.slice(0, half).concat([door]).concat(r.slice(half));
}
function persState(c) { var s = ['media', 'media', 'cerrada', 'reventada']; return s[(c.seed >> 2) % 4]; }
function tagCol(c) { return pick(c.rnd, ['#e8388a', '#38c8e8', '#f2e63c']); }

/* upper floors: pintadas */
function upperPaint(c, k, yt, o) {
  o = o || {};
  var g = c.g, W = c.W, A = c.wall, rnd = c.rnd, n = clamp(Math.floor((W - 8) / 30), 1, 6), i;
  slabLine(c, yt, o.slab);
  var items = []; for (i = 0; i < n; i++) items.push({ k: 'win', w: 18, keep: true });
  var useBalc = c.has('balcon') && k === 1 && W >= 96, bi = -1;
  if (useBalc) { bi = n >> 1; items[bi] = { k: 'balc', w: 40, keep: true }; }
  if (o.ad && Lx() && k === 1 && n >= 2 && !useBalc) items[(c.seed >> 2) % n] = { k: 'adw', w: 30, keep: true };     // v0.6: aviso de marca pintado en el hueco de una ventana
  items = bays(W, items, 4);
  var kinds = winKinds(c, n);
  var fc = (c.seed & 1) ? c.acc[3] : '#e7e0cc';
  items.forEach(function (it, idx) {
    if (it.k === 'balc') {
      var wx = it.x + 11; win(g, wx, yt + 6, 'vidrio', { rnd: rnd, frame: fc });
      balcony(g, it.x, yt + 23, 40, { rnd: rnd, dmg: c.dmg, rail: K });
      flagPeru(g, it.x + 6, yt + 15); F(g, it.x + 6, yt + 14, 10, 1, K);
      if (c.has('macetas')) roofKit.plants(g, it.x + 30, yt + 23, { rnd: rnd, n: 2 });
    } else if (it.k === 'adw') { Lx().ad(g, o.ad, it.x, yt + 5, it.w, 23, { rnd: rnd }); }
    else drawWin(c, it.x, yt + 6, kinds[idx % kinds.length], fc);
  });
  if (k === c.nUp && c.dmg >= 2) for (i = 0; i < 3; i++) drip(g, 6 + ((rnd() * (W - 12)) | 0), yt + 4, 6 + ((rnd() * 8) | 0), 0.28);
}

/* ======================== EXTRAS DE TIENDA ======================== */
function lattice(g, x, y, w, h, col, step) {                       // celosia / reja de rombos sobre un vano
  step = step || 4;
  for (var i = -h; i < w; i += step) { g.line(x + i, y, x + i + h, y + h, col); g.line(x + i + h, y, x + i, y + h, col); }
}
function latticeClip(g, x, y, w, h, col, step) {
  var tmp = new G(w, h); lattice(tmp, 0, 0, w, h, col, step);
  for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) { var c = tmp.d[j * w + i]; if (c) P1(g, x + i, y + j, c); }
}
function pipes(g, x, y, rnd) {                                     // tubos de PVC apoyados en la pared
  var cols = ['#d6d1b8', '#b9b49c', '#c9863a', '#8fb0b8', '#d6d1b8'], hs = [26, 30, 22, 28, 24];
  for (var i = 0; i < 5; i++) { var h = hs[i] - ((rnd() * 4) | 0); F(g, x + i * 3, y - h, 3, h, cols[i]); F(g, x + i * 3, y - h, 1, h, tinter('#ffffff', 0.3)(cols[i])); F(g, x + i * 3 + 2, y - h, 1, h, tinter('#2a2440', 0.35)(cols[i])); F(g, x + i * 3, y - h, 3, 1, '#4a4858'); }
  T(g, x, y, 15, 1, tAO3);
}
function buckets(g, x, y, rnd) {                                   // baldes y latas de pintura apilados
  var cols = ['#b0452f', '#d6a94a', '#3f72b0', '#efebdc', '#2f7a50'];
  for (var i = 0; i < 3; i++) { var bx = x + i * 8 - (i === 2 ? 4 : 0), by = y - (i === 2 ? 9 : 0), c = cols[(i + ((rnd() * 5) | 0)) % 5], lt = tinter('#ffffff', 0.3)(c), dk = tinter('#2a2440', 0.4)(c); F(g, bx, by - 9, 8, 9, c); F(g, bx, by - 9, 8, 2, lt); F(g, bx, by - 9, 1, 9, lt); F(g, bx + 7, by - 9, 1, 9, dk); F(g, bx, by - 1, 8, 1, dk); F(g, bx + 1, by - 11, 6, 1, MT[2]); }
  T(g, x, y, 17, 1, tAO3);
}
function mayolicaChifa(c) {
  var g = c.g, W = c.W, H = c.H, j, i;
  for (j = 0; j < 14; j += 4) for (i = 0; i < W; i += 4) F(g, i, H - 14 + j, 4, 4, ((i >> 2) + (j >> 2)) & 1 ? '#c9a66b' : '#efd3b4');
  F(g, 0, H - 14, W, 1, '#6a2a2c'); F(g, 0, H - 13, W, 1, '#8f3a32'); F(g, 0, H - 1, W, 1, '#a5814f');
  for (i = 0; i < W; i += 4) F(g, i + 3, H - 12, 1, 11, '#a5814f');
  salitre(g, 0, H - 14, W, 6, c.r2, 1);
}
function mayolicaBotica(c) {
  var g = c.g, W = c.W, H = c.H, i, j;
  F(g, 0, H - 14, W, 14, '#d8d4c4');
  for (j = 3; j < 14; j += 4) F(g, 0, H - 14 + j, W, 1, '#bdb9ab');
  for (j = 0; j < 14; j += 4) for (i = ((j >> 2) & 1) * 2; i < W; i += 4) F(g, i, H - 14 + j, 1, 3, '#bdb9ab');
  F(g, 0, H - 14, W, 3, '#2f5a52'); F(g, 0, H - 14, W, 1, '#3f7266'); F(g, 0, H - 1, W, 1, '#8c8a93');
}
function iconPlate() {}

/* ======================== ARQUETIPOS ======================== */
function regArch(arch, fn) { S.lotArch[arch] = fn; }
function lotFn(specN, specS) {
  return function (f) {
    var c = mkCtx(f); c.lit = ((c.seed * 2654435761) >>> 0) % 100 < 30;
    return c.side === 'S' ? buildS(c, specS(c)) : buildN(c, specN(c));
  };
}
function stockPanel(c, ink, bg, w) {
  return { w: w || 84, h: 24, bg: bg, ink: ink, border: ink, draw: function (c2, x, y, ww, hh) {
    var g = c2.g, nm = c2.name, big = nm, small = '';
    if (Lx() && (!nm || c2.seed % 3 !== 0)) { Lx().ad(g, brandOf(c2, 0), x + 1, y + 1, ww - 2, hh - 2, { rnd: c2.rnd, rough: false }); return; }   // v0.6: aviso de marca en vez del rotulo
    if (!nm || c2.rnd() < 0.2) { var t = pick(c2.rnd, PANEL_TXT); big = t[0]; small = t[1] || ''; }
    var fnt = px.measure(big, 'a7') <= ww - 8 ? 'a7' : 'a5';
    if (fnt === 'a5') { var sp = splitName(big, ww - 8); big = sp[0]; small = sp[1] || small; fnt = px.measure(big, 'a7') <= ww - 8 ? 'a7' : 'a5'; }
    var ty = y + (small ? 5 : 8);
    letters(g, big, x + (ww >> 1), ty + (fnt === 'a5' ? 1 : 0), fnt, ink, tinter(bg, 0.5)(ink), c2.rnd, 0.1);
    if (small) px.text(g, small, x + (ww >> 1), y + 15, { font: 'a5', ink: ink, align: 'c' });
  } };
}

/* ---------- BODEGA ---------- */
regArch('bodega', lotFn(function (c) {
  var pal = pickBand(c, ['rojo', 'azul', 'verde', 'amar']);
  return {
    roofKind: 'losa', parapetStyle: pick(c.r2, ['tarrajeado', 'botellas', 'tarrajeado', 'alambre']),
    wallFn: function (c, y0, H) { wallFill(c.g, 0, y0, c.W, H - y0, c.wall, c.rnd); wear(c, y0, H, c.wall, false); },
    ground: function (c, gT) {
      var dtype = doorTypeFor(c), state = persState(c), W = c.W, big = W >= 128;
      var accent = c.acc;
      var beer = beerOf(c), soda = sodaOf(c);
      shopGround(c, { pal: pal, accent: accent, flag: c.has('bandera') && { kind: 'txt', text: 'BODEGA' }, flagLeft: c.seed & 1, zocalo: accent[1], icon: null,
        caps: Lx() ? (c.seed % 2 ? [beer, soda] : [soda, beer]) : null,
        items: function (c, W) {
          var rest = [{ k: 'pers', w: W >= 128 ? 48 : 44, state: state, tag: c.dmg >= 2 ? tagCol(c) : null, keep: true, ad: c.seed % 3 === 1 ? soda : beer }];
          if (c.has('gas') && W >= 100) rest.push({ k: 'gas', w: 18, n: 2, keep: true });
          if (W >= 120 && Lx()) rest.push({ k: 'cardH', card: 'chela', w: 36, keep: true });
          else if (W >= 120) rest.push({ k: 'win', w: 18, type: pick(c.rnd, ['reja', 'vidrio', 'reja']), frame: '#1c1a22' });
          else if (W >= 100 && Lx()) rest.push({ k: 'cardH', card: 'hielo', w: 24 });
          if (c.lit || W >= 144) rest.push({ k: 'crates', w: 14 });
          if (W >= 100 && c.seed % 2) rest.push(Lx() ? { k: 'chest', brand: soda === 'cocacola' ? 'cocacola' : beer, w: 30, lit: true } : { k: 'freezer', w: 26 });
          return ordered(c, { k: 'door', w: 16, type: dtype, keep: true, yape: true }, rest);
        } });
    },
    upper: function (c, k, yt) { upperPaint(c, k, yt); },
    after: function (c) {
      var W = c.W, H = c.H, gT = c.gTop, oy = H - 56; mkOver(c, oy, 80);
      var go = c.go, pers = (c.items || []).filter(function (i) { return i.k === 'pers'; })[0];
      if (pers && c.has('toldo')) {
        var cols = pick(c.rnd, [['#b0402f', '#efebdc'], ['#2f4470', '#efebdc'], ['#2f5a52', '#efebdc'], ['#d6a94a', '#efebdc']]);
        if (Lx()) cols = Lx().awningCols(c.capBrands && c.capBrands[c.seed % 2 ? 0 : (c.capBrands.length - 1)] || beerOf(c));
        if (c.color === 'celeste' && cols[0] === '#2f4470') cols = ['#2e6b3a', '#f3efe2'];
        var ax = Math.max(1, pers.x - 4), aw = Math.min(W - ax - 1, pers.w + 8), ay = H - 36 - oy;
        awning(go, ax, ay, aw, cols, c.rnd);
        F(go, ax + 3, H - oy, aw, 4, SHADOW_A); F(go, ax + 5, H - oy + 4, aw - 2, 2, SHADOW_B);
        if (c.seed % 2 === 0) { bulb(go, ax + (aw >> 1), ay + 12); c.lights.push({ x: ax + (aw >> 1), y: H - 36 + 15, kind: 'foco' }); }
      }
      if (c.flagOn) {
        var inv = pal === BANDS.amar || pal === BANDS.blanco ? BANDS.rojo : BANDS.amar;
        flagSign(go, c.flagX, gT + 1 - oy, 'txt', 'BODEGA', inv, { push: function (L) { c.lights.push({ x: L.x, y: L.y + oy, kind: L.kind }); } });
      }
    }
  };
}, function (c) {
  var pal = pickBand(c, ['rojo', 'azul', 'verde', 'amar']);
  return { roofKind: 'losa', parapetStyle: pick(c.r2, ['tarrajeado', 'botellas']), panel: stockPanel(c, pal.ink, pal.bg), pool: ['drums', 'tank', 'clothesline', 'dog', 'plants', 'gas', 'table'] };
}));

/* ---------- LADRILLO (A2): ladrillo visto, columnas y vigas grises, ultimo piso a medio levantar ---------- */
regArch('ladrillo', lotFn(function (c) {
  var W = c.W, f = c.f, floors = f.floors || 1, n = Math.max(1, Math.round((W - 4) / 44)), xs = [], i;
  for (i = 0; i <= n; i++) xs.push(Math.round(i * (W - 4) / n));
  var unf = floors >= 3 || (floors === 2 && c.seed % 3 === 0);
  var paintBay = (c.seed % 3 === 1) ? ((c.seed >> 3) % n) : -1, pbRamp = c.seed % 2 ? EX.azulVivo : RAMPS.blanco;
  var stairBay = c.has('escaleraExt') && n >= 2 ? n - 1 : -1;
  return {
    unfinished: unf, colXs: xs, roofKind: c.seed % 2 ? 'pastelero' : 'losa', parapetStyle: 'ladrillo', parapetStyleN: 'ladrillo', parapetRamp: CON,
    wallFn: function (c, y0, H) {
      var g = c.g; brickFill(g, 0, y0, W, H - y0, c.rnd);
      if (paintBay >= 0) { var bx = xs[paintBay] + 4, bw = xs[paintBay + 1] - bx; wallFill(g, bx, c.gTop + 5, bw, H - c.gTop - 5, pbRamp, c.rnd); for (var j = 0; j < 4; j++) { P1(g, bx + ((c.rnd() * bw) | 0), c.gTop + 5 + ((c.rnd() * 3) | 0), BR[2]); } for (j = 0; j < bw; j += 2) P1(g, bx + j, c.gTop + 5 + ((j * 7) % 3), BR[2]); }
      xs.forEach(function (x) { columnC(g, x, y0, H - y0, 4); });
      wear(c, y0, H, c.wall, true);
    },
    ground: function (c, gT) {
      var g = c.g, H = c.H, rnd = c.rnd, kinds = winKinds(c, n, 'sinmarco'), door = c.seed % n;
      if (door === stairBay) door = 0;
      for (var b = 0; b < n; b++) {
        var bx = xs[b] + 4, bw = xs[b + 1] - bx, items = [];
        if (b === stairBay) continue;
        if (b === door) { items.push({ k: 'door', w: 16, keep: true, type: doorTypeFor(c) }); if (bw >= 38) items.push(c.has('medidor') ? { k: 'medidor', w: 7 } : { k: 'win', w: 18 }); }
        else if (bw >= 40 && rnd() < 0.5) items.push({ k: 'pers', w: Math.min(40, bw - 6), state: 'cerrada', keep: true });
        else items.push({ k: 'win', w: 18, keep: true });
        bays(bw, items, 3).forEach(function (it) {
          var x = bx + it.x;
          if (it.k === 'door') door_(c, x);
          else if (it.k === 'pers') persiana(g, x, H - 34, it.w, 'cerrada', { rnd: rnd, dmg: c.dmg, tag: c.dmg >= 2 ? tagCol(c) : null });
          else if (it.k === 'medidor') medidor(g, x, H - 40, rnd);
          else drawWin(c, x, H - 30, kinds[b % kinds.length] === 'luz' ? 'luz' : (rnd() < 0.5 ? 'reja' : pick(rnd, ['sinmarco', 'reja'])), CON[1]);
        });
      }
      F(g, 0, H - 6, W, 6, CON[1]); F(g, 0, H - 6, W, 1, CON[2]); xs.forEach(function (x) { columnC(g, x, H - 6, 6, 4); });
      beamC(g, 0, gT, W, 5);
      if (stairBay >= 0) extStair(c, xs[stairBay] + 8, gT + 5, 1);
      salitre(g, 4, H - 16, W - 8, 8, c.r2, 1);
      F(g, 0, H - 1, W, 1, CON[0]);
    },
    upper: function (c, k, yt) {
      var g = c.g, rnd = c.rnd, kinds = winKinds(c, n, pick(rnd, ['sinmarco', 'sinmarco', 'plastico']));
      for (var b = 0; b < n; b++) {
        var bx = xs[b] + 4, bw = xs[b + 1] - bx, wx = bx + ((bw - 18) >> 1), kd = kinds[b];
        var Lw = Lx(), adBay = Lw && k === 1 && n >= 2 ? (c.seed >> 3) % n : -1, adKind = c.seed % 3;
        if (b === adBay && adKind < 2 && bw >= 30) {              // v0.6: hueco tapiado con aviso pintado (marca o pinta electoral)
          var aw = Math.min(bw - 4, adKind ? 40 : 34), axx = bx + ((bw - aw) >> 1);
          if (adKind === 0) Lw.ad(g, brandOf(c, 0), axx, yt + 5, aw, 24, { rnd: rnd });
          else Lw.pinta(g, 'vota', axx, yt + 4, { rnd: rnd });
        }
        else if (kd === 'sinmarco') win(g, wx, yt + 8, 'sinmarco', { rnd: rnd, glassy: rnd() < 0.5 });
        else if (kd === 'luz') drawWin(c, wx, yt + 8, 'luz', CON[1]);
        else win(g, wx, yt + 8, kd === 'reja' ? 'reja' : (kd === 'vidrio' || kd === 'maceta' || kd === 'persianilla' ? 'vidrio' : kd), { rnd: rnd, frame: CON[1] });
        if (b === 0 && k === 1 && c.has('medidor') === false && rnd() < 0.3) medidor(g, bx + 1, yt + 10, rnd);
      }
      beamC(g, 0, yt, c.W, 4);
      xs.forEach(function (x) { columnC(g, x, yt + 4, 28, 4); });
      F(g, 0, yt + 3, c.W, 1, CON[1]);
    },
    after: function (c) {
      mkOver(c, c.H - 56, 80);
      if (c.has('medidor')) { /* ya dibujado en la planta baja */ }
    }
  };
  function door_(c, x) { door(c.g, x, c.H - 34, doorTypeFor(c), { accent: c.acc, rnd: c.rnd, dmg: c.dmg, frame: CON[0] }); }
}, function (c) {
  return { roofKind: c.seed % 2 ? 'pastelero' : 'losa', parapetStyle: 'ladrillo', parapetStyleN: 'ladrillo', parapetRamp: CON, unfinishedS: (c.f.floors || 1) >= 2 && c.seed % 2 === 0,
    panel: stockPanel(c, '#1c1a22', '#e6c85a', 80), pool: ['tank', 'fierros', 'ladrillos', 'cemento', 'antena', 'clothesline'] };
}));

/* ---------- PINTADA (A3): casa pintada con balcon ---------- */
/* v0.6: la casa pintada puede ser casa, hostal o cevicheria (por semilla; ficha.name con CEVICHER/HOSPED/HOSTAL lo fuerza). Invitaciones inventadas. */
var HOSTALES = ['HOSTAL EL PUERTO', 'HOSPEDAJE EL MARINO', 'HOSTAL LA PERLA'], CEVIS = ['CEVICHERÍA LA BAHÍA', 'CEVICHERÍA EL MUELLE'];
function pintadaKind(c) {
  if (!Lx()) return 'casa';
  if (/CEVICHER/.test(c.name)) return 'cevi';
  if (/HOSPED|HOSTAL|HOTEL/.test(c.name)) return 'hostal';
  if (c.name) return 'casa';
  return ['casa', 'hostal', 'cevi', 'hostal', 'cevi', 'casa'][(c.seed + (c.f.c0 >> 3)) % 6];
}
regArch('pintada', lotFn(function (c) {
  var W = c.W;
  return {
    roofKind: 'losa', parapetStyle: pick(c.r2, ['tarrajeado', 'botellas', 'tarrajeado']),
    wallFn: function (c, y0, H) {
      wallFill(c.g, 0, y0, c.W, H - y0, c.wall, c.rnd);
      if (c.seed % 3 === 0 && H - y0 >= 80) { var A = EX.mostaza; /* franja de color del segundo piso */ F(c.g, 0, c.gTop - 4, c.W, 3, c.acc[2]); }
      wear(c, y0, H, c.wall, false);
    },
    ground: function (c, gT) {
      var g = c.g, H = c.H, rnd = c.rnd, dt = pick(rnd, ['madera', 'madera', 'fierro', 'reja']), kinds = winKinds(c, 2, 'reja'), acc = c.acc;
      slabLine(c, gT);
      zocalo(c, acc[1]); F(g, 0, H - 6, W, 1, acc[3]);
      var pk = pintadaKind(c); c.pk = pk;
      var items = [{ k: 'door', w: 16, keep: true, yape: pk !== 'casa' }, { k: 'win', w: 18, keep: true }, { k: pk === 'cevi' ? 'chalkP' : 'win', w: pk === 'cevi' ? 20 : 18 }];
      if (W >= 140) items.push({ k: 'plants', w: 18 });
      items = bays(W, ordered(c, items[0], items.slice(1)), 4);
      var wi = 0; c.items = items;
      if (pk !== 'casa') {                                                // banda de letrero de negocio (hostal / cevicheria)
        var nm = pk === 'cevi' ? CEVIS[c.seed % CEVIS.length] : HOSTALES[c.seed % HOSTALES.length];
        var bpal = pickBand(c, pk === 'cevi' ? ['azul', 'blanco', 'verde'] : ['azul', 'verde', 'negro']), capId = pk === 'cevi' ? beerOf(c) : null, tw2 = W - 6, tx2 = W >> 1;
        var capW = capId ? Lx().capW(capId) : 0;
        var dI0 = items.filter(function (i) { return i.k === 'door'; })[0], flagOnR = dI0 && dI0.x < W / 2, fl0 = W >= 80 ? 32 : 0;   // el letrero bandera va al lado contrario de la puerta
        var bl = 3 + (flagOnR ? 0 : fl0), br = W - 3 - (flagOnR ? fl0 : 0);
        tw2 = br - bl; tx2 = (bl + br) >> 1;
        if (capId && px.measure(nm, 'a5') + 12 + capW <= tw2) { tw2 -= capW + 4; tx2 = bl + capW + 4 + (tw2 >> 1); } else capId = null;
        signBand(g, 3, gT + 2, W - 6, nm, bpal, rnd, { textW: tw2, textX: tx2, drips: c.dmg >= 2 });
        if (capId) Lx().cap(g, capId, bl + 2, gT + 3, capW, 8);
        c.pBand = bpal;
      } else if (Lx()) {
        letters(g, 'SE ALQUILA CUARTO', W >> 1, gT + 5, 'a5', '#b0322c', null, rnd, 0.15);
      }
      items.forEach(function (it) {
        if (it.k === 'door') door(g, it.x, H - 34, dt, { accent: acc, rnd: rnd, dmg: c.dmg, frame: c.wall[0], yape: it.yape });
        else if (it.k === 'chalkP') chalkBoard(g, it.x, H - 32, 'HAY', 'MENÚ');
        else if (it.k === 'plants') roofKit.plants(g, it.x + 9, H - 6, { rnd: rnd, n: 3 });
        else { drawWin(c, it.x, H - 32, kinds[wi++ % 2], c.seed & 1 ? acc[3] : '#e7e0cc'); }
      });
      var dI = items.filter(function (i) { return i.k === 'door'; })[0];
      if (dI) { var nx = dI.x + (dI.x > W / 2 ? -14 : 18); if (nx > 2 && nx < W - 15) numPlate(g, nx, H - 33, String(100 + ((c.seed * 37) % 900))); }
      F(g, 0, H - 1, W, 1, tinter('#2a2440', 0.5)(c.wall[1]));
    },
    upper: function (c, k, yt) { upperPaint(c, k, yt); },
    after: function (c) {
      var oy = c.H - 56; mkOver(c, oy, 80);
      if (c.pk && c.pk !== 'casa' && c.W >= 80) {
        var dI = (c.items || []).filter(function (i) { return i.k === 'door'; })[0], left = dI && dI.x < c.W / 2;
        var fx = left ? c.W - 31 : 3, inv = c.pk === 'cevi' ? BANDS.amar : BANDS.rojoAm;
        flagSign(c.go, fx, c.gTop + 1 - oy, 'txt', c.pk === 'cevi' ? 'MENÚ' : 'HOSTAL', c.pk === 'cevi' ? { bg: '#2f4470', hi: '#4a6498', sh: '#1d2a48', ink: '#f3efe2' } : { bg: '#2f5a52', hi: '#3f7266', sh: '#1f3a36', ink: '#f3efe2' }, null);
      }
    }
  };
}, function (c) {
  return { roofKind: 'losa', parapetStyle: pick(c.r2, ['tarrajeado', 'botellas']), panel: stockPanel(c, c.acc[0], c.acc[3], 70), pool: ['clothesline', 'tank', 'drums', 'plants', 'dog', 'antenna'] };
}));

/* ---------- CHIFA ---------- */
regArch('chifa', lotFn(function (c) {
  c.wall = EX.rojoChifa; var pal = BANDS.negro, gold = '#e6c85a';
  return {
    roofKind: 'losa', parapetStyle: 'tarrajeado',
    wallFn: function (c, y0, H) { wallFill(c.g, 0, y0, c.W, H - y0, c.wall, c.rnd); wear(c, y0, H, c.wall, false); },
    ground: function (c, gT) {
      var W = c.W;
      shopGround(c, { pal: pal, slab: undefined, mayolica: mayolicaChifa, flag: c.has('bandera') && { kind: 'tazon' }, flagLeft: !(c.f.corner === 'E'), icon: 'tazon', accent: EX.mostaza,
        caps: Lx() ? ['incakola', beerOf(c)] : null,
        items: function (c, W) {
          var rest = [{ k: 'vit', w: W >= 120 ? 52 : 44, kind: 'chifa', keep: true, lit: true }];
          if (c.has('pizarra')) rest.push({ k: 'chalk', w: 20, l1: 'HAY', l2: 'MENÚ' });
          if (W >= 130) rest.push({ k: 'win', w: 18, type: 'cortina' });
          return ordered(c, { k: 'door', w: 16, type: 'vidrio', keep: true, yape: true }, c.f.corner === 'E' ? rest : rest);
        } });
      F(c.g, 0, gT, W, 1, gold); F(c.g, 0, gT + 1, W, 1, '#a88a3c');           // cornisa dorada
    },
    upper: function (c, k, yt) {
      var g = c.g, W = c.W, n = clamp(Math.floor((W - 8) / 30), 1, 5), items = [], i;
      slabLine(c, yt); F(g, 0, yt, W, 1, '#e6c85a'); F(g, 0, yt + 1, W, 1, '#a88a3c');
      for (i = 0; i < n; i++) items.push({ k: 'win', w: 18, keep: true });
      if (Lx() && n >= 3 && k === 1) items[n >> 1] = { k: 'adw', w: 32, keep: true };
      var kinds = winKinds(c, n, 'cortina');
      bays(W, items, 4).forEach(function (it, idx) {
        if (it.k === 'adw') { Lx().ad(g, 'incakola', it.x, yt + 5, it.w, 23, { rnd: c.rnd }); return; }
        drawWin(c, it.x, yt + 6, kinds[idx], '#e6c85a');
        if (kinds[idx] !== 'luz') latticeClip(g, it.x + 1, yt + 7, 16, 14, '#a88a3c', 4);
      });
    },
    after: function (c) {
      var W = c.W, H = c.H, oy = H - 56; mkOver(c, oy, 80); var go = c.go;
      if (c.flagOn) flagSign(go, c.flagX, c.gTop + 1 - oy, 'tazon', '', { bg: '#1c1a22', hi: '#3a3846', sh: '#0d0c12', ink: '#e6c85a' }, null);
      lantern(go, 6, c.gTop + 14 - oy); lantern(go, W - 14, c.gTop + 14 - oy);
      if (W >= 100) lantern(go, (W >> 1) - 4, c.gTop + 14 - oy);
    }
  };
}, function (c) {
  c.wall = EX.rojoChifa;
  return { roofKind: 'losa', parapetStyle: 'tarrajeado', panel: { w: 76, h: 24, bg: '#8f3a32', ink: '#e6c85a', border: '#e6c85a', draw: function (c2, x, y, w, h) { letters(c2.g, c2.name || 'CHIFA', x + (w >> 1), y + 8, 'a7', '#e6c85a', '#4e1f1a', c2.rnd, 0.1); } }, pool: ['hood', 'tank', 'drums', 'plants', 'clothesline'] };
}));

/* ---------- POLLERIA ---------- */
regArch('polleria', lotFn(function (c) {
  var pal = BANDS.amar;
  return {
    roofKind: 'losa', parapetStyle: pick(c.r2, ['tarrajeado', 'alambre']),
    wallFn: function (c, y0, H) { wallFill(c.g, 0, y0, c.W, H - y0, c.wall, c.rnd); wear(c, y0, H, c.wall, false); },
    ground: function (c, gT) {
      shopGround(c, { pal: pal, flag: c.has('bandera') && { kind: 'pollo' }, flagLeft: c.seed & 1, icon: 'pollo', accent: EX.rojoChifa, zocalo: '#8f3a32',
        caps: Lx() ? ['incakola'] : null,
        items: function (c, W) {
          var rest = [{ k: 'vit', w: W >= 120 ? 48 : 40, kind: 'polleria', keep: true, lit: true }];
          if (W >= 96) rest.push({ k: 'price', w: 24, lines: ['1/4', 'S/12'], bg: '#e6c85a', ink: '#8f3a32' });
          return ordered(c, { k: 'door', w: 16, type: 'vidrio', keep: true, yape: true }, rest);
        } });
      F(c.g, 0, c.gTop, c.W, 1, '#8f3a32');
    },
    upper: function (c, k, yt) { upperPaint(c, k, yt, { ad: brandOf(c, 1) }); },
    after: function (c) {
      var W = c.W, H = c.H, gT = c.gTop, oy = H - 56; mkOver(c, oy, 80); var go = c.go;
      var vit = (c.items || []).filter(function (i) { return i.k === 'vit'; })[0];
      if (vit && c.has('toldo')) { var ax = Math.max(1, vit.x - 3), aw = Math.min(W - ax - 1, vit.w + 6), ay = H - 36 - oy; awning(go, ax, ay, aw, Lx() ? Lx().awningCols('incakola') : ['#b0402f', '#e6c85a'], c.rnd); F(go, ax + 3, H - oy, aw, 4, SHADOW_A); F(go, ax + 5, H - oy + 4, aw - 2, 2, SHADOW_B); }
      if (c.flagOn) flagSign(go, c.flagX, gT + 1 - oy, 'pollo', '', { bg: '#8f3a32', hi: '#b5503f', sh: '#4e1f1a', ink: '#e6c85a' }, null);
    }
  };
}, function (c) {
  return { roofKind: 'losa', parapetStyle: 'tarrajeado', panel: { w: 84, h: 24, bg: '#e6c85a', ink: '#8f3a32', border: '#8f3a32', draw: function (c2, x, y, w, h) { var nm = c2.name || 'POLLERÍA'; var sp = splitName(nm, w - 8); letters(c2.g, sp[0], x + (w >> 1), y + 6, px.measure(sp[0], 'a7') <= w - 8 ? 'a7' : 'a5', '#8f3a32', '#b5503f', c2.rnd, 0.1); if (sp[1]) px.text(c2.g, sp[1], x + (w >> 1), y + 16, { font: 'a5', ink: '#8f3a32', align: 'c' }); } }, pool: ['tank', 'hood', 'clothesline', 'drums', 'antenna'] };
}));

/* ---------- BOTICA ---------- */
regArch('botica', lotFn(function (c) {
  var pal = BANDS.verde;
  return {
    roofKind: 'losa', parapetStyle: 'tarrajeado', valla: c.W >= 112 ? brandOf(c, 1) : null,
    wallFn: function (c, y0, H) { wallFill(c.g, 0, y0, c.W, H - y0, c.wall, c.rnd); wear(c, y0, H, c.wall, false); },
    ground: function (c, gT) {
      var W = c.W, g = c.g;
      shopGround(c, { pal: pal, mayolica: mayolicaBotica, flag: W >= 112 && { kind: 'cruz' }, flagLeft: c.seed & 1, icon: W < 112 ? 'cruz' : null, accent: RAMPS.botella,
        items: function (c, W) {
          var rest = [{ k: 'vit', w: W >= 120 ? 48 : 40, kind: 'botica', keep: true, lit: true, reja: true }];
          if (W >= 112) rest.push({ k: 'small', w: 36, text: 'ATENCIÓN', bg: '#efebdc', ink: '#2f5a52' });
          return ordered(c, { k: 'door', w: 16, type: 'vidrio', keep: true, yape: true }, rest);
        } });
      (c.items || []).forEach(function (it) {                          // reja plegable: paquete de barras apiladas a la izquierda y barras separadas a la derecha (limpio a 1x)
        if (it.k !== 'vit') return;
        var gy0 = c.H - 32, gx0 = it.x + 3, gw0 = it.w - 6, i, bx;
        for (i = 0; i < 4; i++) { F(g, gx0 + i * 2, gy0, 1, 28, '#2e2c3a'); F(g, gx0 + i * 2 + 1, gy0, 1, 28, '#5a586a'); }           // reja recogida
        for (bx = gx0 + 11; bx < gx0 + gw0 - 1; bx += 5) { F(g, bx, gy0, 1, 28, '#3a3848'); F(g, bx + 1, gy0, 1, 28, '#1c1a22'); }    // barras
        F(g, gx0, gy0, gw0, 1, '#3a3848'); F(g, gx0, gy0 + 13, gw0, 1, '#2e2c3a'); F(g, gx0, gy0 + 27, gw0, 1, '#3a3848');            // rieles
      });
      if (W < 112) c.lights.push({ x: 9, y: gT + 7, kind: 'cruz' });
    },
    upper: function (c, k, yt) { upperPaint(c, k, yt); },
    after: function (c) {
      var W = c.W, H = c.H, gT = c.gTop, oy = H - 56; mkOver(c, oy, 80); var go = c.go;
      if (c.flagOn) flagSign(go, c.flagX, gT + 1 - oy, 'cruz', '', { bg: '#efebdc', hi: '#ffffff', sh: '#b9b49c', ink: '#2f5a52' }, { push: function (L) { c.lights.push({ x: L.x, y: L.y + oy, kind: 'cruz' }); } });
    }
  };
}, function (c) {
  return { roofKind: 'losa', parapetStyle: 'tarrajeado', panel: { w: 80, h: 24, bg: '#efebdc', ink: '#2f5a52', border: '#2f5a52', draw: function (c2, x, y, w, h) { var g = c2.g; F(g, x + 6, y + 6, 3, 11, '#5fc060'); F(g, x + 2, y + 10, 11, 3, '#5fc060'); letters(g, c2.name ? splitName(c2.name, w - 24)[0] : 'BOTICA', x + 16 + ((w - 18) >> 1), y + 8, 'a7', '#2f5a52', '#b9b49c', c2.rnd, 0.1); } }, pool: ['tank', 'antenna', 'drums', 'clothesline'] };
}));

/* ---------- FERRETERIA ---------- */
regArch('ferreteria', lotFn(function (c) {
  var pal = BANDS.azul;
  return {
    roofKind: 'losa', parapetStyle: pick(c.r2, ['tarrajeado', 'alambre']), valla: brandOf(c, 2),
    wallFn: function (c, y0, H) { wallFill(c.g, 0, y0, c.W, H - y0, c.wall, c.rnd); wear(c, y0, H, c.wall, false); },
    ground: function (c, gT) {
      shopGround(c, { pal: pal, flag: c.has('bandera') && { kind: 'llave' }, icon: 'llave', accent: EX.azulVivo, zocalo: c.wall[1],
        items: function (c, W) {
          var rest = [{ k: 'pers', w: W >= 120 ? 48 : 40, state: c.dmg >= 3 ? 'reventada' : 'media', keep: true, tag: c.dmg >= 2 ? tagCol(c) : null }];
          if (W >= 90) rest.push({ k: 'pipes', w: 16 }); if (W >= 110) rest.push({ k: 'buckets', w: 18 });
          if (Lx() && W >= 90 && c.seed % 2 === 0) rest.splice(1, 0, { k: 'jabasK', w: 14 });
          return ordered(c, { k: 'door', w: 16, type: 'fierro', keep: true, yape: true }, rest);
        } });
      (c.items || []).forEach(function (it) { if (it.k === 'pipes') pipes(c.g, it.x, c.H - 1, c.rnd); if (it.k === 'buckets') buckets(c.g, it.x, c.H - 1, c.rnd); });
    },
    upper: function (c, k, yt) { upperPaint(c, k, yt); },
    after: function (c) {
      var W = c.W, H = c.H, oy = H - 56; mkOver(c, oy, 80); var go = c.go;
      var pers = (c.items || []).filter(function (i) { return i.k === 'pers'; })[0];
      if (pers && c.has('toldo')) { var ax = Math.max(1, pers.x - 3), aw = Math.min(W - ax - 1, pers.w + 6), ay = H - 36 - oy; awning(go, ax, ay, aw, ['#2f4470', '#d6d1b8'], c.rnd); F(go, ax + 3, H - oy, aw, 4, SHADOW_A); F(go, ax + 5, H - oy + 4, aw - 2, 2, SHADOW_B); }
    }
  };
}, function (c) {
  return { roofKind: 'losa', parapetStyle: 'alambre', panel: stockPanel(c, '#e6c85a', '#2f4470', 70), pool: ['drums', 'tank', 'bricks', 'cement', 'tires', 'barrel'] };
}));

/* ======================== CERRO (A10): casas del pie del cerro ======================== */
var PLY = ['#8a6a48', '#7a5a3c', '#6b4a30', '#94744e'];
function plywood(g, x, y, w, h, rnd) {                             // triplay: tablas verticales, clavos y manchas de lluvia
  for (var i = 0; i < w; i += 5) { var c = pick(rnd, PLY); F(g, x + i, y, Math.min(5, w - i), h, c); F(g, x + i, y, 1, h, '#4a3028'); F(g, x + i + 1, y, 1, h, tinter('#ffffff', 0.12)(c)); }
  for (i = 0; i < w * h / 60; i++) P1(g, x + ((rnd() * w) | 0), y + ((rnd() * h) | 0), '#4a3028');
  for (i = 0; i < w / 5; i++) { P1(g, x + i * 5 + 2, y + 3, '#c9c5b5'); P1(g, x + i * 5 + 2, y + h - 4, '#c9c5b5'); }
  for (i = 0; i < 3; i++) drip(g, x + 2 + ((rnd() * (w - 4)) | 0), y, 6 + ((rnd() * 10) | 0), 0.3);
}
function calamineWall(g, x, y, w, h, col, rnd) {                   // pared de calamina pintada, con oxido en los pernos
  var A = col;
  for (var i = 0; i < w; i++) F(g, x + i, y, 1, h, [A[1], A[2], A[3], A[2]][i & 3]);
  for (i = 0; i < w; i += 8) { P1(g, x + i + 1, y + 2, '#c9c5b5'); P1(g, x + i + 1, y + h - 3, '#c9c5b5'); rustStreak(g, x + i + 1, y + 3, 5, rnd); }
  F(g, x, y + h - 3, w, 3, tinter(RU[2], 0.35)(A[2]));
}
function casitaHill(g, x, y, col, rnd) {                           // casita vista de frente: techo de calamina arriba y pared pastel
  var wl = [EX.turquesa, EX.coral, EX.mostaza, RAMPS.celeste, RAMPS.rosado, RAMPS.menta, RAMPS.ocre][(rnd() * 7) | 0];
  T(g, x + 2, y + 18, 22, 1, tAO3); for (var j = 0; j < 6; j++) T(g, x + 3 + (j >> 1), y + 18 + j, 20, 1, j < 3 ? tAO : tAO2);
  F(g, x, y + 7, 22, 11, wl[2]); F(g, x, y + 7, 22, 1, wl[3]); F(g, x, y + 7, 1, 11, wl[3]); F(g, x + 21, y + 7, 1, 11, wl[1]); F(g, x, y + 17, 22, 1, wl[1]);
  F(g, x + 3, y + 10, 5, 8, '#2a2430'); F(g, x + 12, y + 10, 6, 5, GL[1]); frame(g, x + 11, y + 9, 8, 7, wl[0]);
  for (var i = 0; i < 24; i++) { var c = ['#4d5560', '#626b75', '#555e69', '#6a737c'][i & 3]; F(g, x - 1 + i, y, 1, 7, c); }
  F(g, x - 1, y, 24, 1, '#8a9298'); F(g, x - 1, y + 6, 24, 1, '#2f343c'); P1(g, x + 4, y + 2, '#6e6a62'); F(g, x + 12, y + 3, 3, 2, '#6e6a62');
}
/* ======================== CERRO K1: ASENTAMIENTO EN LA LADERA (escala real) ========================
   128 x 512. Lo alto del cerro esta arriba (norte) y a la derecha (este): ahi se lava en garua. Cuatro terrazas escalonadas; cada una tiene
   su muro de contencion (piedra seca o llantas rellenas), una plataforma, 1-2 casas con puerta de 16x34 y planta baja de 3 tiles (48 px) y,
   entre terrazas, ladera pelada con el sendero de tierra, tanques, tendales y un poste de madera con cables. */
function hn(i, j, s) { var h = (Math.imul(i + 1013, 73856093) ^ Math.imul(j + 7919, 19349663) ^ Math.imul(s + 17, 83492791)) >>> 0; return (h % 10007) / 10007; }
function vn(x, y, cell, s) {
  var u = x / cell, v = y / cell, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
  fu = fu * fu * (3 - 2 * fu); fv = fv * fv * (3 - 2 * fv);
  var a = hn(i, j, s), b = hn(i + 1, j, s), c = hn(i, j + 1, s), d = hn(i + 1, j + 1, s);
  return (a + (b - a) * fu) * (1 - fv) + (c + (d - c) * fu) * fv;
}
var HILL_PATH = ['#857558', '#958462', '#a39270'];          // tierra pisada
function hillRock(g, cx, cy, w, h, lit, shade) {              // piedra suelta: 3 valores, luz arriba a la izquierda
  F(g, cx, cy, w, h, '#78705f'); F(g, cx, cy, w, 1, lit || '#a09886'); F(g, cx, cy, 1, h, lit || '#a09886'); F(g, cx + w - 1, cy + 1, 1, h - 1, shade || '#4f4a44'); F(g, cx + 1, cy + h - 1, w - 1, 1, shade || '#4f4a44');
  P1(g, cx, cy, null); P1(g, cx + w - 1, cy + h - 1, null);
}
function wallStone(g, x0, x1, y0, h, r) {                      // muro de contencion de piedra seca: hiladas irregulares de 5-6 px
  var rows = Math.ceil(h / 5), j, x;
  for (j = 0; j < rows; j++) {
    var yy = y0 + j * 5, hh = Math.min(5, y0 + h - yy);
    x = x0 - ((r() * 6) | 0);
    while (x < x1) {
      var w = 7 + ((r() * 7) | 0), tone = r(), body = tone < 0.3 ? '#8a8272' : (tone < 0.75 ? '#7a7262' : '#6a6356');
      F(g, x, yy, w - 1, hh - 1, body); F(g, x, yy, w - 1, 1, '#a89f8c'); F(g, x, yy, 1, hh - 1, '#9a9180'); F(g, x + w - 2, yy + 1, 1, hh - 2, '#5a5448');
      F(g, x + w - 1, yy, 1, hh, '#2e2a30'); F(g, x, yy + hh - 1, w, 1, '#2e2a30');
      x += w;
    }
  }
  T(g, x0, y0 + h - 4, x1 - x0, 4, tAO2);
}
function wallTyres(g, x0, x1, y0, h, r) {                      // muro de llantas rellenas de tierra: dos hiladas escalonadas
  var j, x;
  F(g, x0, y0, x1 - x0, h, '#2a2430');
  for (j = 0; j < 2; j++) {
    var cy = y0 + h - 4 - j * 6;
    for (x = x0 + 4 + (j ? 7 : 0); x < x1 + 6; x += 14) {
      g.ell(x, cy, 7, 4, '#1c1a22'); g.ell(x, cy, 6.2, 3.4, '#3a3844'); g.ell(x, cy + 0.4, 3.6, 1.9, '#241f26'); g.ell(x, cy - 0.2, 3, 1.4, '#8a7658');           // llanta, aro y tierra del relleno
      F(g, x - 5, cy - 3, 3, 1, '#6a6878'); P1(g, x + 4, cy + 2, '#14131a');
    }
  }
  F(g, x0, y0, x1 - x0, 1, '#6a6878');
}
function hillStairs(g, px_, yb, steps) {                       // escalones de cemento donde el sendero cruza el muro
  var i;
  for (i = 0; i < steps; i++) {
    var y = yb - 14 + i * (14 / steps), h = Math.ceil(14 / steps);
    F(g, px_ - 6, y, 12, h, CON[3]); F(g, px_ - 6, y, 12, 1, CON[4]); F(g, px_ - 6, y + h - 1, 12, 1, CON[1]); F(g, px_ - 6, y, 1, h, CON[4]); F(g, px_ + 5, y, 1, h, CON[1]);
  }
  F(g, px_ - 7, yb - 15, 1, 15, '#2e2a30'); F(g, px_ + 6, yb - 15, 1, 15, '#2e2a30');
}
function hillPole(g, x, y, r) {                                 // poste de madera (eucalipto) con travesano y cables sueltos
  F(g, x, y - 38, 2, 38, '#6b4a30'); F(g, x, y - 38, 1, 38, '#8a6440'); F(g, x - 5, y - 34, 12, 2, '#6b4a30'); F(g, x - 5, y - 34, 12, 1, '#8a6440');
  P1(g, x - 5, y - 36, '#cfd3cc'); P1(g, x + 6, y - 36, '#cfd3cc'); F(g, x - 1, y - 1, 4, 1, '#2a2430');
  shadowRoof(g, x - 1, y, 3, 8);
}
function hillHouse(c, x, yb, w, o) {
  var g = c.g, r = c.rnd, h0 = yb - 20, fy = h0 - 48, i, j;                  // h0 = base de la fachada; fy = cornisa (planta baja de 48 px)
  var A = o.wall, mats = o.mats, acc = o.accent;
  // plataforma: tierra apisonada y cemento al pie de la casa, con su sombra
  F(g, x - 3, h0, w + 6, 6, '#8a8174'); F(g, x - 3, h0, w + 6, 1, '#a89f8c'); T(g, x - 3, h0 + 4, w + 6, 2, tAO2);
  // sombra de la casa sobre el sendero y las terrazas (SE)
  for (j = 0; j < 10; j++) T(g, x + w + (j >> 1), h0 - 30 + j * 4, 3, 4, j < 6 ? tAO2 : tAO4);
  // paredes: tramos de materiales mezclados
  var cuts = [0], k;
  if (mats.length === 2) cuts.push(Math.round(w * o.split)); cuts.push(w);
  for (k = 0; k < mats.length; k++) {
    var sx = x + cuts[k], sw = cuts[k + 1] - cuts[k], m = mats[k];
    if (m === 'brick') brickFill(g, sx, fy, sw, 48, r);
    else if (m === 'plywood') plywood(g, sx, fy, sw, 48, r);
    else if (m === 'calam') calamineWall(g, sx, fy, sw, 48, o.calam, r);
    else wallFill(g, sx, fy, sw, 48, A, r);
    if (k > 0) { F(g, sx, fy, 2, 48, WD[1]); F(g, sx, fy, 1, 48, WD[3]); }
  }
  F(g, x, fy, 1, 48, 0 ? null : CON[3]); F(g, x + w - 1, fy + 1, 1, 47, CON[1]);        // cantos
  T(g, x, fy, w, 3, tAO); T(g, x + w - 3, fy, 3, 48, tAO2);
  F(g, x - 1, h0 - 4, w + 2, 4, CON[2]); F(g, x - 1, h0 - 4, w + 2, 1, CON[3]); F(g, x - 1, h0 - 1, w + 2, 1, CON[0]);       // sobrecimiento
  // puerta de 16x34 y ventana de 18x16
  var dxL = x + o.doorAt;
  door(g, dxL, h0 - 34, o.doorType, { accent: acc, rnd: r, dmg: o.dmg, frame: A[0] });
  if (o.win) { var wx = x + o.win, wk = o.winKind; win(g, wx, h0 - 33, wk, { rnd: r, frame: '#1c1a22', silueta: false }); if (wk === 'luz') c.lights.push({ x: wx + 9, y: h0 - 25, w: 16, h: 14, kind: 'local' }); }
  if (o.win2) win(g, x + o.win2, h0 - 33, 'cortina', { rnd: r, frame: '#1c1a22' });
  // techo
  var ry = fy - 16;
  if (o.deck) {                                                   // piso sin terminar: losa de concreto con 3 columnas de espera, nada mas
    F(g, x - 2, fy - 4, w + 4, 4, CON[3]); F(g, x - 2, fy - 4, w + 4, 1, CON[4]); F(g, x - 2, fy - 1, w + 4, 1, CON[1]); T(g, x - 2, fy, w + 4, 2, tAO);
    F(g, x - 2, fy - 16, w + 4, 12, ROOF[2]); F(g, x - 2, fy - 16, w + 4, 2, ROOF[3]); F(g, x - 2, fy - 16, w + 4, 1, ROOF[4]);
    var nc = Math.max(2, Math.floor(w / 22));
    for (i = 0; i < nc; i++) rebarColumn(g, x + 6 + Math.round(i * (w - 16) / Math.max(1, nc - 1)), fy - 5, 12, r);
  } else {
    roofSurface(g, x - 2, ry, w + 4, 16, 'calamina', r);
    for (i = 0; i < w + 4; i++) { var ci = (x - 2 + i) & 3; }
    F(g, x - 2, ry, w + 4, 1, '#8a9298'); F(g, x - 2, ry + 1, w + 4, 1, '#626b75');                // caballete claro
    F(g, x - 2, fy - 4, w + 4, 3, MT[3]); F(g, x - 2, fy - 4, w + 4, 1, MT[4]); F(g, x - 2, fy - 1, w + 4, 1, MT[0]);  // alero
    T(g, x - 1, fy, w + 2, 3, tAO3); T(g, x - 1, fy + 3, w + 2, 2, tAO2);
    // piedras y llantas de peso a lo largo del techo
    for (i = 0; i < 3 + (w >> 4); i++) { var sx2 = x + 2 + ((r() * (w - 8)) | 0); if (r() < 0.5) { F(g, sx2, ry + 4 + ((r() * 6) | 0), 4, 3, '#6e6a62'); P1(g, sx2, ry + 4, '#9a968a'); } }
    // 1 pequena mancha de oxido
    var rp = blob(3, 2, r); stamp(g, x + 6 + ((r() * (w - 14)) | 0), ry + 9, rp, function (gg, xx, yy) { if (Q(gg, xx, yy)) P1(gg, xx, yy, ((xx + yy) & 1) ? '#6f3b2e' : '#5a3a34'); });
    if (o.tank) roofKit.tank(g, x + (o.tankAt || (w >> 1)), ry + 12, { rnd: r, color: 'azul' });
    if (o.antenna) roofKit.antenna(g, x + w - 10, ry + 12, { dish: r() < 0.4 });
  }
  if (o.ropa) hangLine(g, x + w + 2, 24, h0 - 36, 3, r, null, { cols: ['#d6d1b8', '#8fb3be', '#d98a9e', '#e6c85a', '#9db59e', '#e0b79a'] });
  if (o.plants) roofKit.plants(g, x + o.plants, h0, { rnd: r, n: 3 });
  // salitre y chorreras al pie
  salitre(g, x, h0 - 18, w, 14, r, o.dmg);
  for (i = 0; i < 3; i++) drip(g, x + 3 + ((r() * (w - 6)) | 0), fy + 4, 6 + ((r() * 10) | 0), 0.3);
}
/* Ladera en terrazas (revision de arte v0.4, #9): 3 valores de la rampa de tierra, TODOS entre 45 y 52 de luminosidad, con cambio de tono para que
   los pasos se vean aunque el valor casi no cambie: sombra (bajo el muro de arriba), talud (mas oscuro, frio) y huella plana (la mas clara, calida).
   per/off = periodo y origen de cada terraza en filas; el muro de contencion ocupa las ultimas 14 filas de cada una. */
var HILL_V = ['#7f6f5d', '#8c7859', '#968060'];                  // luminosidad ~45, ~48, ~51
function hillGround(g, x0, y0, w, h, r, seed, per, off) {         // ladera pelada: sin tramado; surcos, piedras y matorrales mustios
  var i, x, y, W = g.w;
  per = per || 128; off = off === undefined ? 120 : off;
  var wallT = (per - 14) / per;
  for (y = y0; y < y0 + h; y++) {
    var t = ((((y - off) % per) + per) % per) / per;
    for (x = x0; x < x0 + w; x++) {
      var f = vn(x, y, 26, seed) * 0.55 + vn(x, y, 11, seed + 5) * 0.25 + 0.12 - (x / W) * 0.1;        // 0,12 .. 0,9
      var k;
      if (t < 0.10) k = f > 0.8 ? 1 : 0;                         // sombra proyectada por el muro y la casa de la terraza de arriba (banda ancha, pocos huecos)
      else if (t < 0.5) k = f < 0.8 ? 1 : 2;                     // talud: valor medio, con alguna mancha clara
      else k = f < 0.25 ? 1 : 2;                                 // huella plana: la mas clara
      if (t >= 0.10 && t < 0.125) k = 0;                         // filo de la sombra: 1-2 px duros, sin tramado
      if (t >= 0.49 && t < 0.505) k = 2;                         // labio de la terraza
      if (t >= 0.505 && t < 0.53) k = 0;                         // y su sombra corta
      P1(g, x, y, HILL_V[k]);
    }
  }
  for (i = 0; i < Math.max(2, (w * h / 13000) | 0); i++) {
    var gx = x0 + 8 + ((r() * Math.max(1, w - 14)) | 0), ph = r() * 6, gy0 = y0 + ((r() * Math.max(1, h - 90)) | 0);
    for (y = gy0; y < Math.min(y0 + h, gy0 + 90); y++) { var xx = Math.round(gx + Math.sin(y / 31 + ph) * 4); P1(g, xx, y, HILL_V[0]); P1(g, xx - 1, y, HILL_V[2]); }
  }
  for (i = 0; i < (w * h / 1400) | 0; i++) hillRock(g, x0 + 4 + ((r() * (w - 8)) | 0), y0 + ((r() * h) | 0), 3 + ((r() * 4) | 0), 2 + ((r() * 2) | 0));
  for (i = 0; i < (w * h / 3200) | 0; i++) { var sx = x0 + 4 + ((r() * (w - 8)) | 0), sy = y0 + ((r() * h) | 0); F(g, sx, sy, 4, 2, '#5f6a44'); F(g, sx + 1, sy - 1, 2, 1, '#7a8450'); P1(g, sx, sy + 2, '#2f3d3a'); }
}
function hillside(c) {
  var g = c.g, W = c.W, H = c.H, r = c.rnd, seed = c.seed, i, j, x, y, T0 = EX.tierra;
  // ---- 1) ladera pelada ----
  hillGround(g, 0, 0, W, H, r, seed);
  // ---- 2) sendero de tierra que zigzaguea hasta arriba ----
  var yb = [120, 248, 376, 504], pxs = [59, 88, 47, 90];                // base de cada terraza y x del sendero
  var trace = [], t;
  for (i = 3; i >= 0; i--) {
    var y0 = yb[i], y1 = i > 0 ? yb[i - 1] : -4;
    trace.push([pxs[i], y0 + (i === 3 ? 8 : 0)]);
    trace.push([pxs[i], y0 - 84]);                                       // sube pegado a la casa
    trace.push([i > 0 ? pxs[i - 1] : pxs[0] + 16, y1]);                  // diagonal por la ladera hasta el muro de arriba
  }
  for (i = 0; i < trace.length - 1; i++) {
    var a = trace[i], b = trace[i + 1], n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    for (t = 0; t <= n; t++) {
      var qx = Math.round(a[0] + (b[0] - a[0]) * t / n), qy = Math.round(a[1] + (b[1] - a[1]) * t / n);
      for (x = -4; x <= 4; x++) P1(g, qx + x, qy, Math.abs(x) >= 4 ? HILL_PATH[0] : (Math.abs(x) === 3 ? HILL_PATH[1] : HILL_PATH[2]));
      if (b[0] !== a[0] && b[1] !== a[1]) for (x = -4; x <= 4; x++) P1(g, qx + x, qy + 1, Math.abs(x) >= 4 ? HILL_PATH[0] : HILL_PATH[2]);
    }
  }
  for (i = 0; i < 40; i++) { var q = trace[(r() * (trace.length - 1)) | 0], qx2 = q[0] + ((r() * 8) | 0) - 4, qy2 = q[1] + ((r() * 40) | 0) - 20; if (Q(g, qx2, qy2) === HILL_PATH[2]) P1(g, qx2, qy2, HILL_PATH[0]); }
  // ---- 3) las cuatro terrazas, de arriba (lejos) hacia abajo (cerca) ----
  var WALLS = [wallStone, wallTyres, wallStone, wallTyres];
  var HOUSES = [
    [{ x: 12, w: 36, mats: ['calam'], calam: RAMPS.celeste, accent: EX.coral, doorType: 'fierro', doorAt: 6, win: 0, tank: false, antenna: true },
     { x: 70, w: 50, mats: ['paint', 'plywood'], split: 0.55, wall: RAMPS.durazno, accent: EX.turquesa, doorType: 'madera', doorAt: 5, win: 28, winKind: 'cortina', tank: true, tankAt: 36 }],
    [{ x: 10, w: 64, mats: ['paint', 'brick'], split: 0.5, wall: RAMPS.rosado, accent: EX.azulVivo, doorType: 'fierro', doorAt: 6, win: 36, winKind: 'reja', deck: true },
     { x: 101, w: 24, mats: ['plywood'], accent: EX.mostaza, doorType: 'madera', doorAt: 4, win: 0, tank: false, ropa: false }],
    [{ x: 10, w: 28, mats: ['calam'], calam: EX.turquesa, accent: EX.naranja, doorType: 'madera', doorAt: 6, win: 0, antenna: false },
     { x: 58, w: 64, mats: ['brick', 'paint'], split: 0.45, wall: RAMPS.menta, accent: EX.violeta, doorType: 'fierro', doorAt: 6, win: 30, winKind: 'luz', tank: true, tankAt: 50, plants: 46 }],
    [{ x: 10, w: 68, mats: ['brick', 'calam', 'paint'], split: 0.4, wall: RAMPS.ocre, calam: RAMPS.menta, accent: EX.mostaza, doorType: 'madera', doorAt: 26, win: 4, winKind: 'cortina', tank: true, tankAt: 54 },
     { x: 102, w: 22, mats: ['paint'], wall: RAMPS.celeste, accent: EX.coral, doorType: 'fierro', doorAt: 3, win: 0, antenna: true, plants: 3 }]
  ];
  for (i = 0; i < 4; i++) {
    var Y = yb[i];
    // muro de contencion con escalones donde pasa el sendero
    WALLS[i](g, 6, W, Y - 14, 14, r);
    hillStairs(g, pxs[i], Y, 3);
    F(g, 6, Y - 15, W - 6, 1, '#a89f8c');                              // filo claro de la corona
    T(g, 6, Y, W - 6, 1, tAO3);
    // casas de la terraza (la del lado del sendero se corre para dejar pasar)
    HOUSES[i].forEach(function (hs, k) {
      var hx = hs.x;
      var o = {}; for (var kk in hs) o[kk] = hs[kk];
      o.wall = o.wall || RAMPS.celeste; o.calam = o.calam || RAMPS.celeste; o.dmg = c.dmg + (k ? 1 : 0); o.split = o.split || 0.5;
      hillHouse(c, hx, Y, hs.w, o);
    });
    // elementos de la ladera entre esta terraza y la de arriba: tanque en su base, tendal, pozo
    var sb = Y - 128 + 6;
    if (i === 0) { /* arriba: solo cerro pelado */ }
    if (i === 1) { roofKit.tank(g, 20, Y - 90, { rnd: r, color: 'azul' }); roofKit.tires(g, 112, Y - 92, {}); }
    if (i === 2) { hillPole(g, 14, Y - 98, r); roofKit.clothesline(g, 104, Y - 96, { rnd: r, w: 40 }); }
    if (i === 3) { roofKit.plants(g, 18, Y - 102, { rnd: r, n: 3 }); roofKit.dog(g, 112, Y - 96, {}); hillPole(g, 108, Y - 100, r); }
  }
  // ---- 4) pie del cerro: tierra suelta, piedras y llantas contra la pista (borde oeste) ----
  for (y = 0; y < H; y++) { var wv = 2 + (hn(0, y >> 2, seed) * 3 | 0); for (x = 0; x < wv; x++) P1(g, x, y, x === 0 ? T0[0] : T0[1]); }
  T(g, 0, 0, 5, H, tAO4); T(g, 0, 0, 2, H, tAO2);
  for (i = 0; i < 10; i++) hillRock(g, 1 + ((r() * 8) | 0), 12 + ((r() * (H - 24)) | 0), 5 + ((r() * 4) | 0), 4 + ((r() * 2) | 0));
  // ---- 5) garua: el cerro se lava hacia arriba y hacia el este (6 pasos, sin tramado) ----
  var HAZE = '#807e84', hz = [];      // garua isoluminante (valor ~50): el cerro se desatura hacia arriba sin aclararse
  for (i = 0; i <= 8; i++) hz.push(tinter(HAZE, i * 0.07));
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    var s = Math.max(0, 1 - y / 250) * 0.8 + Math.max(0, (x - 96) / 32) * 0.16;
    var step = Math.round(Math.min(1, s) * 8);
    if (step > 0) { var cc = g.d[y * W + x]; if (cc) g.d[y * W + x] = hz[step](cc); }
  }
  // luces: dos ventanas calidas en las terrazas de abajo (x, y centro; w, h)
  return finish(c);
}

function buildCerroN(c) {
  var g = c.g, W = c.W, H = c.H, r = c.rnd, A = c.wall, f = c.f, i;
  var gT = H - 48, faceY = gT; c.faceY = faceY; c.gTop = gT; c.roofEnd = gT; c.nUp = 0; c.floors = 1;
  // ladera: el techo de calamina de la casa de abajo es solo una franja; detras sube el cerro con otra terraza, otra casa y el cerro pelado que se lava en garua
  var names = c.roofList.filter(function (n) { return n !== 'calamina'; });
  if (gT >= 100) {
    var Yw = gT - 24, uw = Math.min(W - 22, 34 + (c.seed % 3) * 6), ux = (c.seed & 1) ? 9 : W - 9 - uw, ucol = [RAMPS.durazno, RAMPS.celeste, RAMPS.ocre, RAMPS.menta][c.seed % 4];
    hillGround(g, 0, 0, gT, gT, r, c.seed + 3, Yw, 0);
    ((c.seed & 2) ? wallTyres : wallStone)(g, 0, W, Yw - 14, 14, r);
    F(g, 0, Yw - 15, W, 1, '#a89f8c'); T(g, 0, Yw, W, 1, tAO3);
    hillStairs(g, (c.seed & 1) ? ux + uw + 12 : ux - 12, Yw, 3);
    hillHouse(c, ux, Yw, uw, { wall: ucol, calam: RAMPS.celeste, mats: (c.seed % 3 === 0) ? ['paint', 'brick'] : (c.seed % 3 === 1 ? ['calam'] : ['plywood', 'paint']), split: 0.5, accent: pick(r, [EX.turquesa, EX.coral, EX.mostaza, EX.azulVivo, EX.violeta]), doorType: 'madera', doorAt: 6, win: uw >= 44 ? 26 : 0, winKind: 'cortina', dmg: c.dmg, tank: names.indexOf('tank') >= 0 || names.indexOf('tanque') >= 0 || (c.seed & 1) === 0, tankAt: uw >> 1, antenna: (c.seed & 1) === 1 && uw >= 40, ropa: c.has('ropa') });
    roofSurface(g, 0, Yw, W, 24, 'calamina', c.r2);                      // techo de la casa de abajo
    F(g, 0, Yw, W, 1, MT[4]); F(g, 0, Yw + 1, W, 1, MT[2]); T(g, 0, Yw + 2, W, 2, tAO2);
    var hzs = []; for (i = 0; i <= 6; i++) hzs.push(tinter('#807e84', i * 0.08));
    for (var yy = 0; yy < 110; yy++) { var st = Math.round(Math.max(0, 1 - yy / 110) * 0.8 * 6); if (st > 0) for (var xx = 0; xx < W; xx++) { var cc = g.d[yy * W + xx]; if (cc) g.d[yy * W + xx] = hzs[st](cc); } }
    if (c.has('macetas')) roofKit.plants(g, W >> 1, gT - 10, { rnd: r, n: 3 });
  } else {
    roofSurface(g, 0, 0, W, gT, 'calamina', c.r2);
    F(g, 0, 0, W, 2, MT[4]); F(g, 0, 2, W, 2, MT[2]); T(g, 0, 4, W, 2, tAO2);
    var yTop = 10, yBot = gT - 12;
    if (names.length < 2) names = names.concat(['tank', 'bricks', 'plants', 'tires', 'clothesline', 'dog'].filter(function (n) { return names.indexOf(n) < 0; }).slice(0, 2 + (c.seed % 2)));
    placeProps(c, yTop, yBot, names, { ramp: A });
  }
  // alero de calamina (borde sur del techo) con sombra
  for (i = 0; i < W; i++) F(g, i, gT - 5, 1, 4, [MT[2], MT[3], MT[4], MT[2]][i & 3]); F(g, 0, gT - 5, W, 1, MT[4]); F(g, 0, gT - 1, W, 1, MT[0]);
  // pared: segmentos de materiales mezclados
  var cut1 = 22 + ((r() * Math.max(1, W * 0.3)) | 0), cut2 = W >= 80 ? cut1 + 24 + ((r() * Math.max(1, W * 0.25)) | 0) : W;
  cut1 = Math.min(cut1, W - 20); cut2 = Math.min(Math.max(cut2, cut1 + 20), W);
  var mats = ['brick', 'plywood', 'calam']; var m0 = 'paint', m1 = mats[c.seed % 3], m2 = mats[(c.seed + 1) % 3];
  var segs = [[0, cut1, m0], [cut1, cut2 - cut1, m1]]; if (cut2 < W) segs.push([cut2, W - cut2, m2]);
  if (c.seed & 1) segs.reverse().forEach(function (s, i2) { /* orden alterno */ });
  var yw = gT, hw = 48;
  var swap = c.seed % 2 === 1; if (swap) { var pos = 0; segs = segs.map(function (s) { return s.slice(); }); segs.reverse(); segs.forEach(function (s) { s[0] = pos; pos += s[1]; }); }
  segs.forEach(function (s) {
    var x = s[0], w = s[1], kind = s[2];
    if (kind === 'paint') { wallFill(g, x, yw, w, hw, A, r); }
    else if (kind === 'brick') { brickFill(g, x, yw, w, hw, r); }
    else if (kind === 'plywood') plywood(g, x, yw, w, hw, r);
    else calamineWall(g, x, yw, w, hw, pick(r, [RAMPS.celeste, EX.turquesa, RAMPS.menta, MT]), r);
    if (x > 0) { F(g, x, yw, 2, hw, WD[1]); F(g, x, yw, 1, hw, WD[3]); }
  });
  F(g, 0, yw, W, 3, MT[3]); F(g, 0, yw, W, 1, MT[4]); F(g, 0, yw + 3, W, 1, MT[0]); T(g, 0, yw + 4, W, 2, tAO); T(g, 0, yw + 6, W, 1, tAO2);   // alero sobre la pared
  F(g, 0, H - 4, W, 4, CON[2]); F(g, 0, H - 4, W, 1, CON[3]); F(g, 0, H - 1, W, 1, CON[0]);                          // sobrecimiento
  // puerta pintada de color vivo y ventanas pequenas
  var paint = segs.filter(function (s) { return s[2] === 'paint'; })[0], ps = paint[0], pw = paint[1];
  var items = [{ k: 'door', w: 16, keep: true }, { k: 'win', w: 18 }];
  var dx = ps + 3 + ((r() * Math.max(1, pw - 25)) | 0); if (pw < 26) dx = ps + 1; dx = Math.min(dx, W - 17);
  door(g, dx, H - 34, c.seed % 3 === 0 ? 'madera' : 'fierro', { accent: pick(r, [EX.turquesa, EX.coral, EX.mostaza, EX.azulVivo, EX.violeta]), rnd: r, dmg: c.dmg, frame: A[0] });
  var kinds = winKinds(c, 2, 'cortina'), wi = 0;
  segs.forEach(function (s) {
    if (s[2] === 'paint' && s[1] < 46 && W < 100) return;
    var wx = s[0] + ((s[1] - 18) >> 1); if (s[2] === 'paint') { wx = dx > ps + pw / 2 ? ps + 4 : ps + pw - 22; }
    if (wx + 18 > s[0] + s[1] || wx < s[0] || (wx < dx + 18 && wx + 18 > dx - 2)) return;
    if (W < 70 && wi > 0) return;
    drawWin(c, wx, H - 36, kinds[wi++ % 2] === 'luz' ? 'luz' : pick(r, ['cortina', 'reja', 'plastico']), '#1c1a22');
  });
  if (c.has('macetas')) roofKit.plants(g, dx + 22 > W - 12 ? dx - 8 : dx + 24, H - 4, { rnd: r, n: 3 });
  wear(c, gT, H, A, false);
  medianeras(c, gT);
  // ropa y banderines en la capa alta
  mkOver(c, H - 56, 80);
  var go = c.go;
  if (c.has('ropa') || c.seed % 2 === 0) hangLine(go, 4, W - 8, 8, 3, c.r2, null, { cols: ['#d6d1b8', '#8fb3be', '#d98a9e', '#e6c85a', '#9db59e'] });
  c.lights.push({ x: dx + 8, y: H - 17, w: 12, h: 26, kind: 'local' });
  c.lights.splice(c.lights.length - 1, 1);
  return finish(c);
}
regArch('cerro', function (f) {
  var c = mkCtx(f); c.lit = ((c.seed * 2654435761) >>> 0) % 100 < 30; c.wall = wallOf(f.color === 'tierra' ? 'cemento' : f.color);
  if (c.side === 'S') {
    if (f.r1 - f.r0 + 1 > 14) return hillside(c);
    return buildS(c, { roofKind: 'calamina', parapetStyle: 'alambre', pool: ['tank', 'tires', 'plants', 'bricks', 'clothesline', 'dog'] });
  }
  return buildCerroN(c);
});

/* ======================== ESCALERA PINTADA (salida) ======================== */
regArch('escalera', function (f) {
  var c = mkCtx(f), g = c.g, W = c.W, H = c.H, r = c.rnd, i, j, k;
  var PALET = ['#8fb3be', '#d98a9e', '#d6a94a', '#9db59e', '#e0b79a', '#4ba096', '#ea8574', '#8b5fa3'];
  var off = c.seed % PALET.length, x0 = 6, sw = W - 12, steps = Math.floor(H / 8);
  F(g, 0, 0, W, H, CON[1]);
  for (k = 0; k < steps; k++) {
    var yb = H - 8 * k;                                              // fila inferior de la contrahuella k
    var tread = yb - 8, riser = yb - 3, base = PALET[(k + off) % PALET.length], rc = tinter(SH, 0.36)(tinter('#9a9890', 0.08)(base));   // contrahuellas un paso mas oscuras (B10): Alexander no se apaga sobre ellas
    F(g, x0, tread, sw, 5, CON[2]); F(g, x0, tread + 4, sw, 1, CON[3]);            // huella con filo claro en la nariz
    for (i = 0; i < sw / 6; i++) P1(g, x0 + ((r() * sw) | 0), tread + ((r() * 4) | 0), r() < 0.5 ? CON[1] : CON[3]);
    T(g, x0, tread, sw, 1, tAO2);
    F(g, x0, riser, sw, 3, rc); F(g, x0, riser, sw, 1, tinter('#ffffff', 0.18)(rc));
    T(g, x0, riser, sw, 1, tAO3);
    var mode = (k + off) % 5;
    if (mode === 1) { for (i = 0; i < sw; i += 6) F(g, x0 + i, riser + 1, 3, 2, tinter('#efebdc', 0.32)(rc)); }
    else if (mode === 3) { for (i = 3; i < sw; i += 8) { P1(g, x0 + i, riser + 1, '#c9c5b5'); P1(g, x0 + i + 1, riser + 1, '#c9c5b5'); } }
    else if (mode === 4) { for (i = 0; i < sw; i += 4) F(g, x0 + i, riser + 1, 2, 2, tinter(PALET[(k + off + 3) % PALET.length], 0.35)(rc)); }
    for (i = 0; i < c.dmg + 1; i++) { var cx = x0 + ((r() * sw) | 0); P1(g, cx, riser + 1, CON[2]); P1(g, cx + 1, riser + 2, CON[2]); }   // pintura saltada
    if (r() < 0.3) F(g, x0 + ((r() * (sw - 6)) | 0), riser, 6, 3, rc);
  }
  // descanso con mural en el piso (un sol) cerca del tope
  var sunY = 6, sx = x0 + (sw >> 1);
  for (j = -12; j <= 12; j++) for (i = -18; i <= 18; i++) { var d = (i * i) / 324 + (j * j) / 144; if (d <= 1 && sunY + 6 + j >= 0 && (sunY + 6 + j) < 22) { var inner = d < 0.30; if (inner) P1(g, sx + i, sunY + 6 + j, '#c9a63e'); else if (d < 0.38) P1(g, sx + i, sunY + 6 + j, '#b0402f'); else if (d < 0.6 && (((i >> 1) + (j >> 1)) & 1)) P1(g, sx + i, sunY + 6 + j, '#b89a80'); } }
  // muros laterales y barandas de fierro
  F(g, 0, 0, 6, H, CON[2]); F(g, 0, 0, 1, H, CON[4]); F(g, 1, 0, 1, H, CON[3]); F(g, 5, 0, 1, H, CON[1]);
  F(g, W - 6, 0, 6, H, CON[2]); F(g, W - 6, 0, 1, H, CON[3]); F(g, W - 1, 0, 1, H, CON[1]); F(g, W - 2, 0, 1, H, CON[0]);
  for (j = 0; j < H; j += 7) { F(g, 1, j, 4, 3, r() < 0.5 ? tinter(c.acc[2], 0.45)(CON[2]) : CON[2]); F(g, W - 5, j, 4, 3, r() < 0.5 ? tinter(c.acc[2], 0.45)(CON[2]) : CON[2]); }
  // baranda de fierro: pasamanos continuo de 2 px (luz + sombra) y un poste con bola cada 16 px; se lee como tubo a 1x
  F(g, 6, 0, 1, H, '#7a7c8c'); F(g, 7, 0, 1, H, '#22212a'); F(g, W - 8, 0, 1, H, '#7a7c8c'); F(g, W - 7, 0, 1, H, '#22212a');
  for (j = 8; j < H; j += 16) {
    F(g, 5, j, 4, 5, K); F(g, 5, j, 4, 1, '#a4a6b4'); F(g, 6, j + 1, 1, 3, '#4a4858'); F(g, W - 9, j, 4, 5, K); F(g, W - 9, j, 4, 1, '#a4a6b4'); F(g, W - 8, j + 1, 1, 3, '#4a4858');
  }
  T(g, 7, 0, 1, H, tAO2); T(g, 8, 0, 1, H, tAO4);
  for (j = 4; j < H - 8; j += 30 + ((r() * 14) | 0)) { roofKit.plants(g, 3, j + 12, { rnd: r, n: 1 }); roofKit.plants(g, W - 3, j + 26, { rnd: r, n: 1 }); }
  // pie de la escalera: AO bajo el primer escalon
  T(g, 6, H - 3, sw, 2, tAO4);
  // luces y capa alta (ropa tendida de lado a lado)
  c.lights.push({ x: W >> 1, y: 10, kind: 'foco' });
  var GARLANDS = [[26, 3], [122, 3]];                                 // guirnaldas de focos sobre la escalera: cada una aporta dos puntos 'foco' al mapa de luz
  GARLANDS.forEach(function (ln) { [0.3, 0.7].forEach(function (u) { c.lights.push({ x: Math.round(W * u), y: ln[0] + ln[1] + 3, kind: 'foco' }); }); });
  mkOver(c, 0, H);
  var go = c.go, lines = [[26, 3], [74, 4], [122, 3]], bq;
  lines.forEach(function (ln, idx) {
    var wy = ln[0], sag = ln[1];
    F(go, 0, wy - 2, 2, 4, '#2a2430'); F(go, W - 2, wy - 2, 2, 4, '#2a2430');
    if (idx === 0 || idx === 2) {                                   // guirnalda de focos: cable oscuro con foquitos calidos cada 8 px
      var bc = ['#ffe2b0', '#ffb36a', '#fff0c8', '#ffd24a'];
      for (i = 2; i < W - 2; i++) { var t3 = (i - W / 2) / (W / 2); P1(go, i, wy + Math.round(sag * (1 - t3 * t3)), '#2a2430'); }
      for (i = 6, bq = 0; i < W - 4; i += 8, bq++) {
        var t4 = (i - W / 2) / (W / 2), by = wy + Math.round(sag * (1 - t4 * t4)) + 1;
        P1(go, i, by, '#2a2440'); F(go, i - 1, by + 1, 3, 2, bc[bq % 4]); P1(go, i, by + 3, bc[bq % 4]); P1(go, i, by + 1, '#ffffff'); P1(go, i - 1, by + 1, null); P1(go, i + 1, by + 1, null);
      }
    } else if (idx === 1) {                                         // banderines
      for (i = 0; i < W; i++) { var t = (i - W / 2) / (W / 2); P1(go, i, wy + Math.round(sag * (1 - t * t)), '#3a3844'); }
      var pcol = ['#b0402f', '#efebdc', '#e6c85a', '#3f72b0', '#d98a9e'], q = 0;
      for (i = 5; i < W - 5; i += 6) { var t2 = (i - W / 2) / (W / 2), py = wy + Math.round(sag * (1 - t2 * t2)) + 1, pc2 = pcol[q++ % 5]; F(go, i, py, 5, 1, pc2); F(go, i + 1, py + 1, 3, 1, pc2); P1(go, i + 2, py + 2, pc2); P1(go, i + 4, py, tinter('#2a2440', 0.3)(pc2)); }
    } else hangLine(go, 2, W - 4, wy, sag, r, null, { cols: ['#d6d1b8', '#8fb3be', '#d98a9e', '#e6c85a', '#9db59e', '#e0b79a'] });
  });
  return finish(c);
});

/* ======================== FICHAS DE PRUEBA (preview.html) ======================== */
/* Con el resto de arquetipos preview.html usa fichas por defecto (c0..c1 = 30..39, lado S de 6 filas). Estas son las reales del mapa. */
var LT = S.lotTests = S.lotTests || {};
function LF(o) { var b = { id: 't', side: 'N', c0: 30, c1: 39, r0: 0, r1: 10, floors: 1, color: 'celeste', name: '', damage: 1, seed: 100, roof: [], front: [] }; for (var k in o) b[k] = o[k]; return b; }
LT.cerro = [
  LF({ arch: 'cerro', c0: 114, c1: 119, color: 'rosado', damage: 2, seed: 11, roof: ['calamina', 'tendal'], front: ['macetas'] }),
  LF({ arch: 'cerro', c0: 124, c1: 127, color: 'menta', damage: 1, seed: 13, roof: ['calamina'], front: ['macetas'] }),
  LF({ arch: 'cerro', side: 'S', c0: 120, c1: 127, r0: 14, r1: 45, floors: 0, color: 'tierra', seed: 14, roof: ['casitas'] }),
  LF({ arch: 'cerro', side: 'S', c0: 30, c1: 39, r0: 39, r1: 45, color: 'rosado', damage: 2, seed: 15 })
];
LT.escalera = [LF({ arch: 'escalera', c0: 120, c1: 123, floors: 0, color: 'celeste', seed: 12, front: ['baranda', 'macetas', 'ropa'] })];

/* ======================== EXPORTAR ======================== */
roofKit.names = Object.keys(roofKit.size);
roofKit.version = 1;
})();
