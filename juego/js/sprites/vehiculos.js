/* ACHORADO - js/sprites/vehiculos.js  (v0.4)
 * Dueño: sprites (vehiculos)
 * Vehiculos de la revision 4.1 a escala nueva, de costado (variante W explicita: el texto nunca se voltea) y de punta (N/S).
 * Claves (ACH.sprites.props, mismas formas que v0.3: canvas o arreglo de canvas con ax/ay/fw/fh):
 *   combiE[3] combiW[3] combiN[3] combiS[3] combi (volcada) custerE custerW
 *   car (de punta, legado) carE[3]=carVar[3] carVarW[3]  tico[2] ticoW[2]  mototaxi mototaxiVar[3] mototaxiVarW[3]
 *   trailer[2] trailerW[2] trailerLargo trailerLargoW  contenedor[4]  tracto tractoW
 * Ancla (ax, ay) = centro de la huella, a ras del suelo (linea de contacto de las ruedas cercanas). La sombra violeta va horneada
 * debajo y al sureste. Se carga despues de sprites.js: reemplaza las claves viejas. Script clasico, funciona desde file://.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px, S = ACH.sprites;
if (!px || !S) return;
var G = px.G, RM = px.RAMPS, mix = px.mix, rng = px.rng, TXT = px.text, MEAS = px.measure;

/* ======================== PALETAS ======================== */
var K = '#1c1a22', SHD = '#2a2440', DARK = '#15131c';
/* Blanco de vehiculo (revision de arte v0.4, #4): un paso de rampa mas abajo que la pared blanca de los edificios. Tope #a4abaa. */
var WH = ['#4f4e5e', '#6c6c77', '#838786', '#949b9a', '#a4abaa'];
var MT = [RM.metal[0], RM.metal[1], RM.metal[2], '#939a99', '#a4abaa'], GL = RM.glass, RS = RM.rust, DT = RM.dirt;
var C = {                                           // rampas de pintura [sombra profunda, sombra, base, luz]
  blue:   ['#1d2a48', '#2f4470', '#4a6498', '#7a92c0'],
  orange: ['#6b2e1f', '#a84a22', '#e9822f', '#f2a65a'],
  yellow: ['#7a6430', '#b8921f', '#f0c020', '#f7dc6a'],
  red:    ['#4a1a22', '#8a2a2c', '#c0392b', '#dc6a52'],
  green:  RM.botella,
  taxi:   ['#6e4f1a', '#b0801a', '#e2b210', '#f4d24a', '#fbe98a'],
  taxiD:  ['#6a5430', '#a88a3c', '#d2b24a', '#e6d27a', '#f2e8b0'],        // amarillo destenido
  slate:  ['#2c3447', '#46526a', '#6d7a8c', '#95a3b0', '#c4cdd4'],        // sedan gris azulado
  wine:   ['#3a1a22', '#6a2a30', '#9a4038', '#c0604c', '#e0907a'],        // sedan rojo viejo
  sand:   ['#4a4036', '#7a6a58', '#a8967a', '#cbb998', '#e6dbbe'],        // station wagon beige
  steel:  RM.metal
};
var DUST = '#a89c82';

/* ======================== PRIMITIVAS ======================== */
function R(g, x0, y0, x1, y1, c) { for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) g.set(x, y, c); }
function H(g, x0, x1, y, c) { for (var x = x0; x <= x1; x++) g.set(x, y, c); }
function Vl(g, x, y0, y1, c) { for (var y = y0; y <= y1; y++) g.set(x, y, c); }
function ok(g, x, y) { return !!g.get(x, y); }
function chk(x, y) { return (x + y) & 1; }
/* degradado vertical en bandas con tramado de 1 fila en cada salto. bands: [[t0, indice], ...] */
function VG(g, x0, y0, x1, y1, ramp, bands, clip) {
  var h = y1 - y0 + 1;
  for (var y = y0; y <= y1; y++) {
    var t = (y - y0) / h, k = 0;
    while (k + 1 < bands.length && t >= bands[k + 1][0]) k++;
    var first = k > 0 && y === y0 + Math.ceil(bands[k][0] * h);
    for (var x = x0; x <= x1; x++) {
      if (clip && !clip(x, y)) continue;
      var i = bands[k][1];
      if (first && chk(x, y)) i = bands[k - 1][1];
      g.set(x, y, ramp[i]);
    }
  }
}
function speck(g, r, x0, y0, x1, y1, n, cols, test) {
  for (var i = 0; i < n; i++) {
    var x = x0 + Math.floor(r() * (x1 - x0 + 1)), y = y0 + Math.floor(r() * (y1 - y0 + 1)), c = g.get(x, y);
    if (!c || (test && !test(c))) continue;
    g.set(x, y, cols[Math.floor(r() * cols.length)]);
  }
}
/* oscurece/ensucia lo que ya hay mezclando con un color: k = 0..1 */
function tint(g, x, y, col, k) { var c = g.get(x, y); if (c && c.length === 7) g.set(x, y, mix(c, col, k)); }
function lineMix(g, x0, y0, x1, y1, col, k) {
  var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (var i = 0; i <= n; i++) tint(g, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), col, k);
}
/* ensuciado: sube desde y1 hacia y0 con densidad decreciente (tierra de la pista, salitre) */
function dirtBand(g, r, x0, x1, y0, y1, dens, test) {
  for (var y = y0; y <= y1; y++) {
    var t = (y - y0) / Math.max(1, y1 - y0), p = dens * t * t;
    for (var x = x0; x <= x1; x++) {
      var c = g.get(x, y);
      if (!c || (test && !test(c)) || r() > p) continue;
      g.set(x, y, mix(c, r() < 0.5 ? DT[1] : DT[2], 0.3 + 0.35 * t));
    }
  }
}
function streak(g, r, x, y, len, test) {
  for (var i = 0; i < len; i++) { var c = g.get(x, y + i); if (c && (!test || test(c))) g.set(x, y + i, mix(c, DT[1], 0.22 + 0.1 * (i % 2))); }
}
function rustPatch(g, r, cx, cy, rx, ry, test) {
  for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy, c = g.get(x, y);
    if (d > 1 || !c || (test && !test(c)) || r() > 0.95 - d * 0.7) continue;
    g.set(x, y, d < 0.3 ? RS[2] : (d < 0.62 ? (r() < 0.2 ? RS[3] : RS[1]) : mix(c, RS[1], 0.7)));
  }
}
function shiftX(g, dx) {
  var n = new G(g.w, g.h);
  for (var y = 0; y < g.h; y++) for (var x = 0; x < g.w; x++) { var c = g.d[y * g.w + x]; if (c) n.set(x + dx, y, c); }
  return n;
}
function wallC(P, y, top, bot, x) {
  var t = (y - top) / (bot - top + 1);
  if (y <= top + 1 || t < 0.07) return P[4];
  if (t < 0.55) return P[3];
  if (t < 0.62) return chk(x, y) ? P[3] : P[2];
  if (t < 0.80) return P[2];
  if (t < 0.87) return chk(x, y) ? P[2] : P[1];
  return P[1];
}
/* caja 3/4: pared (costado) + franja superior (techo/capo/parabrisas) extruida hacia arriba */
function boxy(g, s) {
  for (var x = s.x0; x <= s.x1; x++) {
    var tp = s.top(x), z = s.zone(x), d = s.depth;
    for (var i = 0; i < d; i++) {
      var y = tp - d + i, t = i / d, c;
      if (z === 'glass') c = t < 0.4 ? GL[2] : (t < 0.8 ? GL[1] : GL[0]);
      else {
        var Q = z === 'hood' ? s.P : s.P;
        var b = z === 'hood' ? 1 : 0;                         // el capo, un paso mas oscuro
        if (i <= 1) c = Q[4 - b];
        else if (i < d * 0.45) c = Q[4 - b];
        else if (i === Math.floor(d * 0.45)) c = chk(x, y) ? Q[4 - b] : Q[3 - b];
        else if (i < d - 2) c = Q[3 - b];
        else if (i === d - 2) c = Q[2];
        else c = Q[1];
      }
      g.set(x, y, c);
    }
    for (var y2 = tp; y2 <= s.bot; y2++) g.set(x, y2, wallC(s.P, y2, tp, s.bot, x));
  }
}
function crack(g, cx, cy, len, col) {
  var d = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  for (var i = 0; i < d.length; i++) {
    var L = len - (i % 3 === 0 ? 0 : 1);
    for (var k = 0; k <= L; k++) g.set(cx + d[i][0] * k + (k > 2 ? (i % 2 ? 1 : 0) : 0), cy + d[i][1] * k, col || '#dfe6dc');
  }
  g.set(cx, cy, '#ffffff');
}
/* luna: marco de goma, vidrio que refleja el cielo gris, franja diagonal de reflejo. o: {clip, crack:[dx,dy,len], hole:[dx,dy,r], seats:[dx..], curtain:ramp, hi:false} */
function glass(g, x0, y0, x1, y1, o) {
  o = o || {};
  var w = x1 - x0 + 1, h = y1 - y0 + 1, i, x, y;
  for (y = y0 - 1; y <= y1 + 1; y++) for (x = x0 - 1; x <= x1 + 1; x++) if (!o.clip || o.clip(x, y, true)) g.set(x, y, o.frame || '#22212b');
  VG(g, x0, y0, x1, y1, GL, [[0, 2], [0.42, 1], [0.84, 0]], o.clip ? function (a, b) { return o.clip(a, b, false); } : null);
  if (o.hi !== false) for (i = 0; i < h; i++) {
    var hx = x0 + Math.round(w * 0.64 - i * 0.62);
    for (var q = 0; q < 2; q++) { var px_ = hx + q; if (px_ < x0 || px_ > x1 || (o.clip && !o.clip(px_, y0 + i, false))) continue; g.set(px_, y0 + i, q === 0 ? (i < h * 0.55 ? '#b4d0d0' : GL[3]) : GL[3]); }
  }
  if (o.seats) for (i = 0; i < o.seats.length; i++) { var sx = x0 + o.seats[i]; R(g, sx, y1 - 2, sx + 2, y1, '#141a22'); g.set(sx, y1 - 2, '#2a3340'); }
  if (o.curtain) {
    var cr = o.curtain, ch = Math.max(2, Math.floor(h * (o.curtainH || 0.5)));
    for (y = y0; y < y0 + ch; y++) for (x = x0; x <= x1; x++) g.set(x, y, (x - x0) % 3 === 2 ? cr[1] : (y === y0 + ch - 1 ? cr[1] : cr[2]));
  }
  if (o.crack) crack(g, x0 + o.crack[0], y0 + o.crack[1], o.crack[2] || 3);
  if (o.hole) {
    var hx2 = x0 + o.hole[0], hy2 = y0 + o.hole[1], hr = o.hole[2] || 2;
    g.disc(hx2, hy2, hr, '#0e0d12');
    for (i = 0; i < 6; i++) { var an = i * 1.05 + 0.4; g.set(Math.round(hx2 + Math.cos(an) * (hr + 1.3)), Math.round(hy2 + Math.sin(an) * (hr + 1.3)), '#dfe6dc'); }
    crack(g, hx2 - 1, hy2 + 1, 2, '#9fb4b6');
  }
}
/* rueda de costado. r=6 -> 12 px. o: {flat, cap, dark}. cy = centro; la base de la llanta queda en cy+r */
function wheel(g, cx, cy, r, o) {
  o = o || {};
  var rr = r * 0.6, x, y;
  if (o.flat) {
    g.ell(cx, cy + 1.2, r + 0.9, r - 1.4, K);
    g.ell(cx, cy + 1.0, r + 0.2, r - 2.2, '#2c2b35');
    cy += 1;
    for (x = Math.floor(cx - rr); x <= Math.ceil(cx + rr); x++) for (y = Math.floor(cy - rr * 0.7); y <= Math.ceil(cy + rr * 0.7); y++) {
      var fx = (x - cx) / rr, fy = (y - cy) / (rr * 0.7);
      if (fx * fx + fy * fy <= 1) g.set(x, y, fy < -0.2 ? MT[3] : MT[1]);
    }
    g.set(Math.round(cx - 1), Math.round(cy - 1), MT[4]);
    g.disc(cx, cy, 0.9, MT[0]);
    return;
  }
  g.disc(cx, cy, r, K);
  g.disc(cx, cy, r - 0.9, '#2c2b35');
  for (x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) for (y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {         // brillo en la cara de la llanta (arco NO)
    var d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy), ang = (x - cx) + (y - cy);
    if (d2 <= r * r && d2 > (r - 1.4) * (r - 1.4) && ang < -r * 0.9) g.set(x, y, '#3d3c49');
  }
  for (x = Math.floor(cx - rr); x <= Math.ceil(cx + rr); x++) for (y = Math.floor(cy - rr); y <= Math.ceil(cy + rr); y++) {
    var dd = (x - cx) * (x - cx) + (y - cy) * (y - cy);
    if (dd > rr * rr) continue;
    var a2 = (x - cx) + (y - cy);
    g.set(x, y, o.cap ? (a2 < -rr * 0.3 ? MT[4] : MT[3]) : (a2 < -rr * 0.5 ? MT[3] : (a2 > rr * 0.5 ? MT[1] : MT[2])));
  }
  g.set(Math.round(cx - rr * 0.45), Math.round(cy - rr * 0.45), MT[4]);
  g.disc(cx, cy, Math.max(0.9, r * 0.18), MT[0]);
  if (r >= 6) for (var k = 0; k < 4; k++) g.set(Math.round(cx + Math.cos(k * 1.571 + 0.78) * rr * 0.7), Math.round(cy + Math.sin(k * 1.571 + 0.78) * rr * 0.7), MT[0]);
}
/* paso de rueda: anillo de la propia carroceria y pozo oscuro. Solo pinta sobre la carroceria (y <= bot). */
function arch(g, cx, cy, r, bot, P) {
  var x, y, rim = r + 2.3, well = r + 1.2;
  for (y = Math.floor(cy - rim); y <= bot; y++) for (x = Math.floor(cx - rim); x <= Math.ceil(cx + rim); x++) {
    var d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
    if (d <= rim * rim && d > well * well) { if (g.get(x, y) && y <= bot) g.set(x, y, P[1]); }
  }
  for (y = Math.floor(cy - well); y <= bot; y++) for (x = Math.floor(cx - well); x <= Math.ceil(cx + well); x++) {
    var d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
    if (d2 <= well * well) g.set(x, y, y < cy - well * 0.45 ? DARK : '#201c2e');
  }
}
/* contorno selectivo: del lado de la luz (arriba/izquierda del objeto) el contorno toma el tono oscuro del propio material */
function outlineSel(g) {
  var add = [], x, y;
  for (y = 0; y < g.h; y++) for (x = 0; x < g.w; x++) {
    if (g.get(x, y)) continue;
    var dn = g.get(x, y + 1), rt = g.get(x + 1, y), up = g.get(x, y - 1), lf = g.get(x - 1, y);
    if (!(dn || rt || up || lf)) continue;
    var c;
    if (up || lf) c = K; else { var s = dn || rt; c = s.length === 7 ? mix(s, SHD, 0.68) : K; }
    add.push([x, y, c]);
  }
  for (var i = 0; i < add.length; i++) g.set(add[i][0], add[i][1], add[i][2]);
}
/* sombra: bajos oscuros entre ruedas + mancha violeta al 50 % bajo el chasis que asoma al sureste */
function groundShadow(g, x0, x1, bot, gy, rows) {
  var x, y, j;
  for (y = bot + 1; y <= gy; y++) for (x = x0; x <= x1; x++) if (!g.get(x, y)) g.set(x, y, y === gy ? SHD + 'c0' : '#1c1830');
  var al = ['90', '58', '30'];
  rows = rows || 2;
  for (j = 0; j < rows; j++) for (x = x0 + 1 + j; x <= x1 + 2 + j; x++) { if (g.get(x, gy + 1 + j)) continue; g.set(x, gy + 1 + j, SHD + (x >= x1 + 2 + j - 1 && chk(x, j) ? al[j + 1] || '20' : al[j])); }
  for (y = gy - 3; y <= gy; y++) for (x = x1 + 1; x <= x1 + 3 - (gy - y > 1 ? 1 : 0); x++) if (!g.get(x, y)) g.set(x, y, SHD + (x === x1 + 3 ? '30' : '58'));
}
/* ensamblador de vistas laterales: draw(g) dibuja mirando al ESTE; W = espejo + texto redibujado con T(str, x, y, opt) en coordenadas del este */
function buildSide(o, lvl) {
  var g = new G(o.W, o.H);
  o.draw(g);
  if (lvl && o.dmg) dmgPass(g, lvl, o.dmg, o.seed || 1);
  var W = o.dir === 'W';
  if (W) { g = g.flip(); if (o.shift) g = shiftX(g, -o.shift); }
  var T = function (str, x, y, opt) {
    opt = opt || {};
    var w = MEAS(str, opt.font || 'a5', opt.scale), xx = W ? o.W - 1 - (x + w - 1) - (o.shift || 0) : x;
    TXT(g, str, xx, y, opt);
  };
  if (o.text) o.text(g, T);
  outlineSel(g);
  if (o.shadow !== false) groundShadow(g, o.x0, o.x1, o.bot, o.gy, o.rows);
  var c = g.toCanvas(o.ax, o.ay, o.fw, o.fh);
  if (o.tall) c.tall = true;
  return c;
}
/* ensamblador de vistas de punta (sin espejo) */
function buildEnd(o, lvl) {
  var g = new G(o.W, o.H);
  o.draw(g);
  if (lvl && o.dmg) dmgPass(g, lvl, o.dmg, o.seed || 1);
  if (o.text) o.text(g);
  outlineSel(g);
  if (o.shadow !== false) groundShadow(g, o.x0, o.x1, o.bot, o.gy, o.rows);
  var c = g.toCanvas(o.ax, o.ay, o.fw, o.fh);
  if (o.tall) c.tall = true;
  return c;
}

/* ======================== COMBI (Hiace/Urvan alta, 4,9 m) ======================== */
var COMBI_V = [
  { A: C.blue,   B: C.orange, ink: '#f3efe2', route: 'RUTA 77', plac: '77',   rack: 'bundles', door: 'open',   flat: 0, windCrack: true,  broken: false },
  { A: C.red,    B: C.yellow, ink: '#f3efe2', route: 'RUTA 52', plac: '52',   rack: 'empty',   door: 'open',   flat: 1, windCrack: false, broken: false },
  { A: C.yellow, B: C.blue,   ink: K,         route: 'RUTA 18', plac: '18',   rack: 'sign',    door: 'closed', flat: 0, windCrack: false, broken: true }
];
var RW = { x: 17.5, y: 37.5 }, FW = { x: 62.5, y: 37.5 };
function combiTop(x) { if (x <= 1) return 16; if (x === 2) return 14; if (x <= 60) return 13; if (x < 70) return 13 + Math.round((x - 60) * 13 / 9); return 26; }
function combiZone(x) { return x <= 60 ? 'roof' : (x < 70 ? 'glass' : 'hood'); }

function drawCombiE(g, v, seed) {
  var r = rng(seed), P = WH, A = v.A, B = v.B, x, y, i;
  var paint = function (c) { return P.indexOf(c) >= 0; };
  boxy(g, { x0: 1, x1: 76, top: combiTop, zone: combiZone, depth: 13, bot: 40, P: P });
  // --- canal de goteo y nervaduras del techo
  for (x = 3; x <= 59; x++) { g.set(x, 4, P[4]); g.set(x, 5, P[3]); g.set(x, 9, P[3]); g.set(x, 10, P[2]); }
  // --- franjas de color (bordes nitidos): luz arriba, sombra abajo
  for (x = 1; x <= 76; x++) {
    var y0 = Math.max(24, combiTop(x)); if (x >= 61 && x < 70) y0 = 24;
    for (y = y0; y <= 30; y++) { if (!g.get(x, y)) continue; g.set(x, y, y === 24 ? A[3] : (y >= 29 ? A[1] : A[2])); }
    if (g.get(x, 31)) g.set(x, 31, B[2]);
    if (g.get(x, 32)) g.set(x, 32, B[1]);
  }
  // --- zocalo y bajos
  for (x = 3; x <= 74; x++) { R(g, x, 38, x, 39, MT[1]); g.set(x, 38, MT[2]); g.set(x, 40, DARK); }
  // --- ensuciado: tierra desde abajo, chorreras, oxido con causa (pasos de rueda y zocalo)
  dirtBand(g, r, 1, 76, 31, 39, 0.6, function (c) { return paint(c) || A.indexOf(c) >= 0 || B.indexOf(c) >= 0; });
  speck(g, r, 3, 2, 59, 11, 16, [mix(WH[3], DT[3], 0.3), WH[2]], paint);                                     // polvo en el techo
  for (i = 0; i < 6; i++) streak(g, r, 5 + Math.floor(r() * 50), 14, 3 + Math.floor(r() * 3), paint);
  rustPatch(g, r, 10, 37, 4, 3, null); rustPatch(g, r, 27, 39, 5, 1.6, null); rustPatch(g, r, 56, 37, 3.5, 2.5, null); rustPatch(g, r, 3, 12, 3, 2, paint);
  rustPatch(g, r, 70, 39, 5, 1.6, null);
  // --- pasos de rueda
  arch(g, RW.x, RW.y, 6, 40, P); arch(g, FW.x, FW.y, 6, 40, P);
  // --- cola: luz trasera y paragolpes
  R(g, 1, 20, 2, 28, '#8a2a2c'); g.set(1, 20, '#dc6a52'); g.set(1, 21, '#c0392b'); R(g, 1, 26, 2, 28, '#5b1d1d'); g.set(1, 22, '#dc6a52');
  R(g, 0, 36, 4, 39, '#3b4250'); H(g, 0, 4, 36, MT[3]); g.set(1, 38, RS[1]); g.set(2, 39, RS[2]);
  // --- ventanas: A (trasera), B (fija), D (puerta del chofer, sigue la caida del parabrisas)
  glass(g, 4, 15, 14, 22, { seats: [3, 7] });
  glass(g, 17, 15, 30, 22, { seats: [2, 8], curtain: v.A === C.red ? RM.rust : null });
  var dClip = function (x, y, frame) { return y > combiTop(x) + (frame ? 0 : 1); };
  glass(g, 51, 15, 64, 22, { clip: dClip, seats: [2] });
  // cartel de ruta en la luna del chofer (ACH5, legible a 1x): se escribe despues, aqui solo el fondo
  R(g, 52, 16, 58, 22, '#8f948f'); H(g, 52, 58, 16, v.A[2]); H(g, 52, 58, 22, '#b9b49c');
  // --- puerta corrediza: abierta (vano oscuro con asientos y la luna del otro lado) o cerrada (luna con agujero)
  if (v.door === 'open') {
    R(g, 32, 14, 49, 38, '#0f0e15');
    R(g, 33, 15, 48, 37, '#171521');
    // la luna del lado opuesto, clara contra el interior oscuro
    VG(g, 35, 16, 46, 21, GL, [[0, 3], [0.5, 2], [0.85, 1]]); H(g, 35, 46, 15, '#22212b'); H(g, 35, 46, 22, '#22212b'); Vl(g, 40, 16, 21, '#22212b'); Vl(g, 41, 16, 21, '#22212b');
    for (i = 0; i < 4; i++) g.set(37 + i * 3, 17 + (i % 2), '#d8e6e2');
    // asientos: respaldo, cabecera, borde de luz
    [[35, 19], [42, 19]].forEach(function (s) {
      R(g, s[0], s[1] + 3, s[0] + 4, 33, '#2e3350'); R(g, s[0] + 1, s[1], s[0] + 3, s[1] + 3, '#2e3350');
      Vl(g, s[0], s[1] + 3, 33, '#4a5278'); H(g, s[0] + 1, s[0] + 3, s[1], '#4a5278'); R(g, s[0] + 4, s[1] + 3, s[0] + 4, 33, '#1d2036');
      R(g, s[0] - 1, 33, s[0] + 5, 35, '#262a40'); H(g, s[0] - 1, s[0] + 5, 33, '#3a4062');
    });
    H(g, 33, 48, 36, '#2a2838'); H(g, 33, 48, 37, MT[2]); H(g, 33, 48, 38, MT[3]);                 // estribo
    Vl(g, 32, 14, 38, P[1]); Vl(g, 49, 14, 38, P[1]); H(g, 32, 49, 14, P[1]);
    Vl(g, 31, 15, 38, P[4]);
    // riel de la puerta y manija del borde
  } else {
    glass(g, 34, 15, 47, 22, { hole: [5, 3, 2], seats: [3] });
    Vl(g, 32, 23, 38, P[1]); Vl(g, 49, 23, 38, P[1]); Vl(g, 33, 23, 38, P[4]); H(g, 33, 48, 38, P[1]);
    R(g, 44, 26, 47, 27, MT[3]); H(g, 44, 47, 27, MT[1]);                                           // manija
    R(g, 32, 15, 32, 22, P[1]); R(g, 49, 15, 49, 22, P[1]);
  }
  // --- puerta del chofer: junta, manija, bisagra
  Vl(g, 50, 23, 38, P[1]); Vl(g, 62, 31, 38, P[1]); H(g, 50, 62, 38, P[1]); R(g, 52, 32, 54, 32, MT[3]); g.set(52, 33, MT[1]);
  // --- espejo (brazo + caja) y faro
  H(g, 60, 62, 27, '#2a2a32'); R(g, 62, 26, 64, 31, '#2a2a32'); Vl(g, 62, 26, 31, '#6b7280'); g.set(63, 27, '#8c93a0');
  if (v.flat === 1) { R(g, 74, 28, 76, 31, '#0e0d12'); g.set(75, 29, '#a4abaa'); g.set(76, 31, '#8c93a0'); }
  else { R(g, 74, 28, 76, 31, '#949b9a'); R(g, 74, 28, 76, 28, '#a4abaa'); g.set(76, 31, '#8a7a50'); g.set(74, 31, '#8a7a50'); g.set(75, 29, '#ffffff'); }
  R(g, 70, 33, 77, 34, MT[1]); H(g, 70, 77, 33, MT[2]);                                           // rejilla / calaveras
  R(g, 69, 36, 77, 39, '#3b4250'); H(g, 69, 77, 36, MT[3]); H(g, 69, 77, 39, MT[0]); g.set(72, 38, RS[2]); g.set(73, 38, RS[3]);
  // --- abolladuras y rayones
  lineMix(g, 22, 33, 29, 31, SHD, 0.45); lineMix(g, 22, 34, 29, 32, '#ffffff', 0.35);
  R(g, 68, 28, 70, 30, WH[1]); g.set(69, 29, WH[0]);
  lineMix(g, 55, 35, 60, 34, SHD, 0.4);
  // --- techo: parrilla, carga y detalles
  if (v.rack !== 'sign') {
    [4, 10].forEach(function (yy, k) { H(g, 7, 57, yy, k ? MT[2] : MT[4]); H(g, 7, 57, yy + 1, MT[1]); });
    for (x = 7; x <= 57; x += 10) { R(g, x, 4, x + 1, 11, MT[2]); Vl(g, x, 4, 11, MT[3]); }
    Vl(g, 7, 5, 10, MT[3]); Vl(g, 57, 5, 10, MT[3]);
  }
  if (v.rack === 'bundles') {
    var bundle = function (cx, cy, rx, ry, c, rope) {
      g.ell(cx, cy, rx, ry, c[1]); g.ell(cx - 0.5, cy - 0.8, rx - 0.7, ry - 0.8, c[2]); g.ell(cx - 1.5, cy - 1.6, Math.max(1, rx - 3), Math.max(1, ry - 2.2), c[3]);
      if (rope) { Vl(g, Math.round(cx - rx * 0.3), Math.round(cy - ry + 1), Math.round(cy + ry - 1), rope); Vl(g, Math.round(cx + rx * 0.4), Math.round(cy - ry + 1), Math.round(cy + ry - 1), rope); }
    };
    bundle(18, 6, 10, 5, C.blue, '#e0c58d');                                                      // lona azul amarrada
    bundle(35, 7, 5.5, 4, ['#4a3028', '#8a7658', '#a8956e', '#c9b88a'], '#4a3028');                  // costal
    bundle(44, 6, 5, 4.5, ['#3b4250', '#7a5a45', '#a5814f', '#c9a66b'], '#4a3028');
    bundle(52, 8, 3.5, 3, C.orange, null);
    H(g, 12, 50, 9, '#4a3028');
  } else if (v.rack === 'empty') {
    g.disc(40.5, 6.5, 4.8, K); g.disc(40.5, 6.5, 3.8, '#2c2b35'); g.disc(40.5, 6.5, 2.3, MT[2]); g.set(39, 5, MT[4]); g.set(40, 6, MT[0]); g.set(41, 7, MT[0]);
    H(g, 10, 30, 7, '#c9a66b'); H(g, 12, 28, 8, '#8a7658'); streak(g, r, 20, 9, 3, null);        // cuerda suelta
  } else {
    R(g, 10, 3, 31, 10, '#8f948f'); H(g, 10, 31, 3, '#ffffff'); H(g, 10, 31, 10, '#9a8f70'); R(g, 10, 4, 10, 9, WH[2]); R(g, 31, 4, 31, 9, WH[1]);
    R(g, 11, 4, 30, 9, '#efe3a8'); R(g, 11, 4, 30, 4, '#f7ecc0'); R(g, 11, 9, 30, 9, '#c9b86a');
    for (x = 20; x <= 56; x += 12) { Vl(g, x, 3, 10, WH[1]); }
    speck(g, r, 11, 4, 30, 9, 8, ['#c9b86a', '#a89a60'], null);
  }
  R(g, 42, 3, 49, 7, WH[2]); R(g, 42, 3, 49, 3, WH[4]); R(g, 43, 4, 48, 5, WH[1]); R(g, 43, 4, 48, 4, WH[0]);   // sombrerete del ventilador
  if (v.rack === 'sign') { R(g, 38, 3, 55, 8, WH[2]); H(g, 38, 55, 3, WH[4]); H(g, 38, 55, 8, WH[1]); R(g, 39, 4, 54, 7, WH[1]); }
  // --- parabrisas: reflejo diagonal y limpiaparabrisas
  for (x = 61; x <= 69; x++) { var t0 = combiTop(x); for (i = 0; i < 13; i++) { if (((x - 61) * 2 + i) % 7 === 3 && i > 2 && i < 10) g.set(x, t0 - 13 + i, '#8fb0b8'); if (((x - 61) * 2 + i) % 7 === 4 && i > 2 && i < 10) g.set(x, t0 - 13 + i, '#b4d0d0'); } }
  g.line(62, 12, 68, 21, '#14121a');
  if (v.windCrack) { crack(g, 66, 17, 3, '#dfe6dc'); lineMix(g, 61, 8, 66, 17, '#ffffff', 0.5); }
  // --- ruedas (v.flat: 0 = ninguna, 1 = trasera baja)
  wheel(g, RW.x, RW.y, 6, { flat: v.flat === 1, cap: v.flat !== 1 });
  wheel(g, FW.x, FW.y, 6, { cap: false });
}
function textCombiE(g, T, v) {
  T(v.route, 4, 25, { font: 'a5', ink: v.ink });
  T(v.plac, 53, 17, { font: 'a5', ink: K });
}
function combiSide(v, dir, lvl) {
  var V = COMBI_V[v];
  return buildSide({ W: 80, H: 46, dir: dir, shift: 2, draw: function (g) { drawCombiE(g, V, 7100 + v * 31); }, seed: 71 + v, dmg: specCombi(V),
    text: function (g, T) { textCombiE(g, T, V); }, x0: 1, x1: 76, bot: 40, gy: 43, ax: 39, ay: 43, fw: 74, fh: 18, tall: true }, lvl);
}

/* ======================== CUSTER (Coaster alta, 7,0 m) ======================== */
var CRW = { x: 34.5, y: 46.5 }, CFW = { x: 97.5, y: 46.5 };
function custerTop(x) { if (x <= 1) return 21; if (x === 2) return 18; if (x <= 95) return 17; if (x < 104) return 17 + Math.round((x - 95) * 13 / 9); return 30; }
function custerZone(x) { return x <= 95 ? 'roof' : (x < 104 ? 'glass' : 'hood'); }
function drawCusterE(g, seed) {
  var r = rng(seed), P = WH, A = C.blue, B = C.red, x, y, i;
  var paint = function (c) { return P.indexOf(c) >= 0 || A.indexOf(c) >= 0 || B.indexOf(c) >= 0; };
  boxy(g, { x0: 1, x1: 108, top: custerTop, zone: custerZone, depth: 17, bot: 50, P: P });
  for (x = 3; x <= 94; x++) { g.set(x, 5, P[4]); g.set(x, 6, P[3]); g.set(x, 11, P[3]); g.set(x, 12, P[2]); g.set(x, 13, P[3]); }
  // franja azul ancha (bordes nitidos) con filete rojo
  for (x = 1; x <= 108; x++) {
    var y0 = Math.max(30, custerTop(x));
    for (y = y0; y <= 38; y++) { if (!g.get(x, y)) continue; g.set(x, y, y === 30 ? A[3] : (y >= 37 ? A[1] : A[2])); }
    if (g.get(x, 39)) g.set(x, 39, B[3]); if (g.get(x, 40)) g.set(x, 40, B[2]); if (g.get(x, 41)) g.set(x, 41, B[1]);
  }
  for (x = 3; x <= 106; x++) { R(g, x, 49, x, 50, MT[1]); g.set(x, 49, MT[2]); g.set(x, 51, DARK); }
  dirtBand(g, r, 1, 108, 41, 50, 0.6, paint);
  speck(g, r, 3, 2, 94, 15, 28, [mix(WH[3], DT[3], 0.3), WH[2]], paint);
  for (i = 0; i < 9; i++) streak(g, r, 6 + Math.floor(r() * 84), 18, 3 + Math.floor(r() * 4), paint);
  rustPatch(g, r, 10, 46, 5, 3, null); rustPatch(g, r, 55, 50, 6, 1.6, null); rustPatch(g, r, 76, 47, 4, 3, null); rustPatch(g, r, 4, 20, 3, 2.5, paint); rustPatch(g, r, 104, 49, 4, 1.6, null);
  // rueda de repuesto colgada bajo el voladizo trasero
  g.disc(9.5, 46.5, 5.2, K); g.disc(9.5, 46.5, 4.2, '#2c2b35'); g.disc(9.5, 46.5, 2.5, MT[2]); g.set(8, 45, MT[4]); g.set(9, 46, MT[0]); g.set(10, 47, MT[0]);
  R(g, 4, 42, 15, 42, MT[1]);
  arch(g, CRW.x, CRW.y, 7, 50, P); arch(g, CFW.x, CFW.y, 7, 50, P);
  // cola: luces y paragolpes
  R(g, 1, 24, 2, 34, '#8a2a2c'); g.set(1, 24, '#dc6a52'); g.set(1, 25, '#c0392b'); R(g, 1, 31, 2, 34, '#5b1d1d'); g.set(1, 27, '#dc6a52');
  R(g, 0, 46, 5, 50, '#3b4250'); H(g, 0, 5, 46, MT[3]); g.set(2, 49, RS[2]);
  // seis ventanas cuadradas con cortinilla: 0 cerrada, 1 abierta (cortina recogida), 2 media
  var CT = [RM.rust, ['#4a2a2a', '#8a3a32', '#b0644a', '#d89a78'], RM.rust, ['#4a2a2a', '#8a3a32', '#b0644a', '#d89a78'], RM.rust, RM.rust];
  var open = { 1: 1, 3: 1, 4: 2 };
  for (i = 0; i < 6; i++) {
    var wx = 4 + i * 12, st = open[i] || 0;
    if (st === 0) glass(g, wx, 19, wx + 8, 28, { curtain: CT[i], curtainH: 1.0, hi: false });
    else if (st === 2) glass(g, wx, 19, wx + 8, 28, { curtain: CT[i], curtainH: 0.45, seats: [2], crack: i === 4 ? [5, 5, 3] : null });
    else { glass(g, wx, 19, wx + 8, 28, { seats: [1, 5], crack: i === 1 ? [4, 4, 3] : null }); R(g, wx, 19, wx + 1, 28, CT[i][2]); Vl(g, wx + 1, 19, 28, CT[i][1]); H(g, wx, wx + 8, 19, CT[i][1]); }
  }
  // puerta plegable delantera ABIERTA: vano oscuro con dos escalones y las hojas recogidas
  R(g, 74, 18, 88, 49, '#0f0e15'); R(g, 75, 19, 87, 48, '#171521');
  VG(g, 77, 20, 86, 25, GL, [[0, 3], [0.5, 2], [0.85, 1]]); H(g, 77, 86, 19, '#22212b'); H(g, 77, 86, 26, '#22212b');
  R(g, 79, 28, 85, 41, '#2e3350'); Vl(g, 79, 28, 41, '#4a5278'); R(g, 82, 32, 85, 38, '#262a40');          // asiento delantero
  for (i = 0; i < 3; i++) { R(g, 75, 43 + i * 2 - 0, 87, 43 + i * 2, i % 2 ? '#2a2838' : MT[2]); }       // peldanos
  R(g, 75, 19, 77, 48, P[2]); for (y = 19; y <= 48; y += 3) H(g, 75, 77, y, P[1]); Vl(g, 77, 19, 48, P[0]);    // hojas plegadas
  Vl(g, 74, 18, 49, P[1]); Vl(g, 88, 18, 49, P[1]); H(g, 74, 88, 18, P[1]); Vl(g, 73, 19, 49, P[4]);
  R(g, 75, 49, 88, 49, MT[3]);
  // ventana del chofer (sigue la caida del parabrisas) y cartel de ruta
  var dClip = function (x, y, frame) { return y > custerTop(x) + (frame ? 0 : 1); };
  glass(g, 91, 19, 103, 28, { clip: dClip, seats: [2] });
  R(g, 92, 20, 98, 26, '#8f948f'); H(g, 92, 98, 20, A[2]); H(g, 92, 98, 26, '#b9b49c');
  // parabrisas: reflejo de cielo + limpiaparabrisas
  for (x = 96; x <= 103; x++) { var t0 = custerTop(x); for (i = 0; i < 17; i++) { var k = ((x - 96) * 2 + i) % 8; if ((k === 3 || k === 4) && i > 2 && i < 14) g.set(x, t0 - 17 + i, k === 3 ? '#8fb0b8' : '#b4d0d0'); } }
  g.line(97, 12, 103, 27, '#14121a');
  crack(g, 100, 15, 4, '#dfe6dc'); lineMix(g, 96, 6, 100, 15, '#ffffff', 0.5);
  // espejo, faro, parrilla, paragolpes
  H(g, 94, 96, 30, '#2a2a32'); R(g, 94, 29, 96, 36, '#2a2a32'); Vl(g, 94, 29, 36, '#6b7280'); g.set(95, 30, '#8c93a0');
  R(g, 106, 33, 108, 37, '#949b9a'); H(g, 106, 108, 33, '#a4abaa'); g.set(107, 34, '#ffffff'); g.set(108, 37, '#8a7a50');
  R(g, 104, 39, 108, 41, MT[1]); R(g, 102, 46, 109, 50, '#3b4250'); H(g, 102, 109, 46, MT[3]); H(g, 102, 109, 50, MT[0]); g.set(105, 48, RS[2]);
  // abolladuras
  lineMix(g, 40, 43, 49, 40, SHD, 0.45); lineMix(g, 40, 44, 49, 41, '#ffffff', 0.3); R(g, 66, 42, 69, 44, WH[1]);
  // techo: escotillas, ventilador y carga atada
  R(g, 22, 4, 36, 11, WH[2]); H(g, 22, 36, 4, WH[4]); R(g, 23, 5, 35, 10, WH[1]); H(g, 23, 35, 5, WH[2]); for (x = 24; x <= 34; x += 2) Vl(g, x, 6, 9, WH[0]);
  R(g, 58, 4, 72, 11, WH[2]); H(g, 58, 72, 4, WH[4]); R(g, 59, 5, 71, 10, WH[1]); H(g, 59, 71, 5, WH[2]); for (x = 60; x <= 70; x += 2) Vl(g, x, 6, 9, WH[0]);
  g.ell(84, 8, 6, 4, '#4a3028'); g.ell(83.5, 7.2, 5.2, 3.2, '#8a7658'); g.ell(82.5, 6.4, 3, 1.8, '#c9b88a'); Vl(g, 83, 4, 11, '#4a3028'); Vl(g, 87, 5, 11, '#4a3028');
  [[16, 3], [48, 3], [48, 14]].forEach(function (q) { R(g, q[0], q[1], q[0] + 5, q[1] + 1, MT[3]); });
  // ruedas
  wheel(g, CRW.x, CRW.y, 7, { cap: true }); wheel(g, CFW.x, CFW.y, 7, {});
}
function custerSide(dir, lvl) {
  return buildSide({ W: 112, H: 56, dir: dir, shift: 2, draw: function (g) { drawCusterE(g, 7400); }, seed: 74, dmg: specCuster(),
    text: function (g, T) { T('CHALACA EXPRESS', 6, 32, { font: 'a5', ink: '#f3efe2' }); T('EXP', 93, 21, { font: 'a5', ink: K }); },
    x0: 1, x1: 108, bot: 50, gy: 53, ax: 55, ay: 53, fw: 106, fh: 21, tall: true }, lvl);
}

/* ======================== AUTOS (sedan / station wagon / Tico) ======================== */
function swingDoor(g, hx, yT, yB, len, dy, P, o) {
  o = o || {};
  for (var k = 0; k <= len; k++) {
    var x = hx - k, s = Math.round(dy * k / len);
    for (var y = yT + s; y <= yB + s; y++) {
      var j = y - (yT + s), c;
      if (j === 0) c = P[4]; else if (j <= (o.win || 5)) c = (j === 1 || k === len) ? '#22212b' : (((x + j) % 5 === 0) ? '#b4d0d0' : (j < 3 ? GL[2] : GL[1]));
      else if (y >= yB + s - 1) c = P[0]; else c = j < 11 ? P[3] : P[2];
      if (k === len) c = P[1];
      g.set(x, y, c);
    }
    if (k > 3 && k < len - 3) { g.set(x, yT + Math.round(dy * k / len) + (o.win || 5) + 4, P[1]); }
  }
  g.set(hx - Math.round(len * 0.4), yT + Math.round(dy * 0.4) + (o.win || 5) + 3, MT[3]);
}
var CAR_V = [
  { kind: 'sedan', P: C.slate, door: true,  hood: false, flat: 0, crack: false, sign: false },
  { kind: 'sedan', P: C.wine,  door: false, hood: true,  flat: 1, crack: true,  sign: false },
  { kind: 'wagon', P: C.sand,  door: false, hood: false, flat: 0, crack: true,  sign: true  }
];
function carTop(kind) {
  if (kind === 'wagon') return function (x) { return x <= 1 ? 17 : (x === 2 ? 15 : (x <= 6 ? 14 : (x <= 38 ? 13 : (x < 47 ? 13 + Math.round((x - 38) * 7 / 8) : (x <= 62 ? 20 : 22))))); };
  if (kind === 'tico') return function (x) { return x <= 1 ? 17 : (x === 2 ? 15 : (x <= 4 ? 13 : (x <= 31 ? 12 : (x < 40 ? 12 + Math.round((x - 31) * 7 / 8) : 19)))); };
  return function (x) { return x <= 1 ? 21 : (x <= 14 ? 19 : (x <= 21 ? 19 - Math.round((x - 14) * 6 / 7) : (x <= 40 ? 13 : (x < 49 ? 13 + Math.round((x - 40) * 7 / 8) : (x <= 62 ? 20 : 22))))); };
}
function carZone(kind) {
  if (kind === 'wagon') return function (x) { return (x >= 39 && x < 47) ? 'glass' : (x > 46 ? 'hood' : 'roof'); };
  if (kind === 'tico') return function (x) { return (x >= 32 && x < 40) ? 'glass' : (x > 39 ? 'hood' : 'roof'); };
  return function (x) { return (x >= 15 && x <= 21) ? 'glass' : ((x >= 41 && x < 49) ? 'glass' : ((x <= 14 || x >= 49) ? 'hood' : 'roof')); };
}
function drawCarE(g, v, seed) {
  var r = rng(seed), P = v.P, top = carTop(v.kind), zone = carZone(v.kind), x, y, i;
  var paint = function (c) { return P.indexOf(c) >= 0; };
  var X1 = v.kind === 'tico' ? 49 : 64;
  boxy(g, { x0: 1, x1: v.kind === 'wagon' ? 62 : (v.kind === 'tico' ? 49 : 63), top: top, zone: zone, depth: v.kind === 'tico' ? 11 : 12, bot: v.kind === 'tico' ? 27 : 28, P: P });
  var tico = v.kind === 'tico', wagon = v.kind === 'wagon';
  var bot = tico ? 27 : 28, belt = tico ? 19 : 20, gx = wagon ? 62 : (tico ? 49 : 63);
  var RWx = tico ? 11.5 : 13.5, FWx = tico ? 40.5 : (wagon ? 52.5 : 53.5), cy = tico ? 24.5 : 26.5, rad = tico ? 4.5 : 5;
  // linea de caracter y zocalo
  for (x = 2; x <= gx - 1; x++) { if (g.get(x, belt + 3)) g.set(x, belt + 3, P[4]); if (g.get(x, belt + 4)) g.set(x, belt + 4, P[3]); R(g, x, bot - 1, x, bot, P[0]); g.set(x, bot + 1, DARK); }
  if (tico) for (x = 2; x <= gx - 1; x++) g.set(x, bot - 2, P[1]);
  dirtBand(g, r, 1, gx, belt + 5, bot, 0.55, paint);
  speck(g, r, 3, 1, 46, 17, 26, [DUST, mix(P[3], DT[3], 0.4)], paint);
  rustPatch(g, r, 12, bot - 1, 4, 2.2, null); rustPatch(g, r, gx - 8, bot - 1, 4, 2, null); rustPatch(g, r, 30, bot, 5, 1.4, null);
  arch(g, RWx, cy, rad, bot, P); arch(g, FWx, cy, rad, bot, P);
  // lunas: sigue la inclinacion de los parantes
  var clip = function (xx, yy, frame) { return yy > top(xx) + (frame ? 0 : 1); };
  var w1 = tico ? [14, 22] : [16, 30], w2 = tico ? [24, 36] : [33, 47];
  if (v.door && v.kind === 'sedan') {
    R(g, 33, 14, 48, 27, '#0f0e15');
  } else {
    glass(g, w2[0], 12, w2[1], belt - 1, { clip: clip, seats: [3], crack: v.crack ? [Math.round((w2[1] - w2[0]) * 0.55), 3, 3] : null });
  }
  glass(g, w1[0], 12, w1[1], belt - 1, { clip: clip, seats: [4] });
  if (!tico) { Vl(g, 31, belt, bot - 2, P[1]); Vl(g, 14, belt + 1, bot - 2, P[1]); Vl(g, 48, belt + 1, bot - 2, P[1]); R(g, 26, belt + 2, 28, belt + 2, MT[3]); R(g, 42, belt + 2, 44, belt + 2, MT[3]); }
  else { Vl(g, 23, belt, bot - 2, P[1]); R(g, 18, belt + 2, 20, belt + 2, MT[3]); R(g, 33, belt + 2, 35, belt + 2, MT[3]); Vl(g, 12 + 12, belt, bot - 2, P[1]); }
  // faros y luces, paragolpes
  if (tico) {
    R(g, 47, 20, 49, 22, v.flat ? '#0e0d12' : '#e8e0b8'); R(g, 1, 20, 2, 23, '#8a2a2c'); g.set(1, 20, '#dc6a52');
    R(g, 46, 25, 50, 27, '#3b4250'); H(g, 46, 50, 25, MT[3]); R(g, 0, 25, 3, 27, '#3b4250'); H(g, 0, 3, 25, MT[3]);
  } else {
    R(g, gx - 2, 22, gx, 24, v.flat ? '#0e0d12' : '#e8e0b8'); H(g, gx - 2, gx, 22, '#a4abaa'); g.set(gx - 1, 23, '#ffffff');
    R(g, 1, 22, 2, 25, '#8a2a2c'); g.set(1, 22, '#dc6a52'); g.set(1, 23, '#c0392b');
    R(g, gx - 4, 26, gx + 1, 28, '#3b4250'); H(g, gx - 4, gx + 1, 26, MT[3]); R(g, 0, 26, 4, 28, '#3b4250'); H(g, 0, 4, 26, MT[3]); g.set(2, 28, RS[2]);
  }
  // espejo
  R(g, tico ? 34 : 47, belt - 2, tico ? 36 : 49, belt + 1, '#2a2a32'); g.set(tico ? 35 : 48, belt - 2, '#8c93a0');
  // abandono segun variante
  if (v.door && v.kind === 'sedan') {                                 // puerta entreabierta: solo el hueco oscuro y un canto de puerta de 3 px (sin interior detallado)
    R(g, 35, 16, 47, 26, '#121019'); H(g, 35, 47, 16, '#24222e'); Vl(g, 47, 17, 26, '#24222e');
    for (i = 0; i <= 3; i++) { Vl(g, 48 + i, 14 + i, 26 + i, i === 3 ? P[1] : (i === 0 ? P[4] : P[3])); } g.set(51, 14 + 3, P[1]);
  }
  if (v.hood) {                                                       // capo entreabierto: una rendija oscura y el filo del capo levantado 2 px
    R(g, 50, 19, 62, 20, '#0c0b10'); H(g, 50, 62, 18, P[4]); H(g, 51, 62, 17, P[3]); H(g, 50, 62, 21, P[0]);
    Vl(g, 50, 17, 20, P[1]);
  }
  if (v.sign) { R(g, 15, 6, 31, 12, WH[3]); H(g, 15, 31, 6, WH[4]); H(g, 15, 31, 12, WH[1]); R(g, 16, 7, 30, 11, '#e6c85a'); H(g, 16, 30, 7, '#f6e08a'); H(g, 16, 30, 11, '#b8921f'); Vl(g, 15, 7, 11, WH[2]); Vl(g, 31, 7, 11, WH[1]); }
  if (tico) { R(g, 8, 6, 28, 7, MT[2]); H(g, 8, 28, 6, MT[4]); R(g, 9, 5, 9, 8, MT[3]); R(g, 27, 5, 27, 8, MT[3]); R(g, 13, 3, 23, 4, '#6a5430'); H(g, 13, 23, 3, '#a88a3c'); }   // parrilla del techo con bulto
  lineMix(g, 20, belt + 6, 27, belt + 4, SHD, 0.4); lineMix(g, 20, belt + 7, 27, belt + 5, '#ffffff', 0.3);
  wheel(g, RWx, cy, rad, { flat: v.flat === 1, cap: true });
  wheel(g, FWx, cy, rad, {});
}
function carSide(v, dir, tico, lvl) {
  var V = tico ? TICO_V[v] : CAR_V[v];
  return buildSide({ W: tico ? 54 : 68, H: tico ? 32 : 37, dir: dir, shift: 2, draw: function (g) { drawCarE(g, V, (tico ? 8100 : 8000) + v * 17); }, seed: (tico ? 81 : 80) + v, dmg: specCar(V),
    text: function (g, T) {
      if (V.sign) T('TAXI', 17, 7, { font: 'a5', ink: K });
      if (V.stick) T('TAXI', 24, 26, { font: 'a5', ink: K });
    },
    x0: 1, x1: tico ? 49 : (V.kind === 'wagon' ? 62 : 64), bot: tico ? 27 : 28, gy: tico ? 29 : 31, ax: tico ? 26 : 33, ay: tico ? 29 : 31, fw: tico ? 48 : 62, fh: tico ? 14 : 17, tall: false }, lvl);
}
var TICO_V = [
  { kind: 'tico', P: C.taxi,  door: false, hood: false, flat: 0, crack: true,  sign: false, stick: false },
  { kind: 'tico', P: C.taxiD, door: false, hood: false, flat: 1, crack: false, sign: false, stick: false }
];

/* ======================== MOTOTAXI ======================== */
var MOTO_V = [
  { body: C.blue,  roof: ['#8a7e5a', '#b8aa7a', '#e8d9a8', '#f4ecc8'], name: 'FLACA', ink: '#f3efe2', flecos: C.red },
  { body: C.red,   roof: ['#8a7e5a', '#b8aa7a', '#e8d9a8', '#f4ecc8'], name: 'ZULY',  ink: '#f3efe2', flecos: C.blue },
  { body: ['#7d4a66', '#b04a78', '#d6567a', '#ee86a2'], roof: ['#4a2a2a', '#6f3b2e', '#8a4b38', '#b06a3e'], name: 'CHOLO', ink: '#f3efe2', flecos: C.yellow }
];
function drawMoto(g, v, seed) {
  var r = rng(seed), B = v.body, RF = v.roof, x, y, i, FL = v.flecos;
  // chasis y guardabarros trasero
  R(g, 4, 27, 36, 28, '#2a2a33'); H(g, 4, 36, 27, MT[1]);
  // faldon lateral (panel de fibra) con nombre: base de la cabina, con filo claro y zocalo oscuro
  for (y = 18; y <= 26; y++) for (x = 2; x <= 29; x++) { var t = (y - 18) / 9; g.set(x, y, t < 0.12 ? B[3] : (t < 0.72 ? B[2] : B[1])); }
  H(g, 2, 29, 18, B[3]); H(g, 2, 29, 26, B[0]); Vl(g, 2, 19, 25, B[3]); Vl(g, 29, 19, 25, B[1]);
  // cabina abierta: interior oscuro, banca trasera con respaldo, piso
  R(g, 3, 9, 29, 17, '#1b1823'); R(g, 3, 16, 29, 17, '#26222e');
  R(g, 4, 10, 6, 17, '#7a2a30'); H(g, 4, 6, 10, '#b04a4e'); Vl(g, 4, 11, 17, '#a03a40');             // respaldo
  R(g, 4, 14, 16, 17, '#8a3236'); H(g, 4, 16, 14, '#b04a4e'); H(g, 4, 16, 17, '#4a1a22');          // asiento
  // parantes de fierro y parabrisas: cristal inclinado con un solo reflejo diagonal
  for (y = 6; y <= 17; y++) { g.set(2, y, MT[3]); g.set(3, y, MT[2]); g.set(15, y, MT[2]); g.set(16, y, MT[1]); }
  for (y = 6; y <= 17; y++) { var gx0 = 26 + Math.round((y - 6) * 0.4); for (x = gx0; x <= gx0 + 3; x++) g.set(x, y, y < 10 ? GL[3] : (y < 14 ? GL[2] : GL[1])); g.set(gx0, y, MT[3]); g.set(gx0 + 3, y, MT[1]); }
  g.set(28, 7, '#dfeeee'); g.set(29, 8, '#dfeeee'); g.set(29, 9, '#b4d0d0');
  // techo de lona: abombado (filo claro arriba, la caida hacia la camara en sombra), dos costuras y flecos festoneados
  for (y = 1; y <= 4; y++) for (x = 2; x <= 32; x++) {
    var cut = (y === 1 && (x < 4 || x > 30)) || (y === 2 && (x < 3 || x > 31));
    if (cut) continue;
    g.set(x, y, y <= 3 ? RF[3] : RF[2]);
  }
  H(g, 5, 29, 1, mix(RF[3], '#ffffff', 0.45)); H(g, 4, 30, 2, mix(RF[3], '#ffffff', 0.2));            // filo de luz del lomo
  for (x = 12; x <= 22; x += 10) { Vl(g, x, 2, 4, RF[1]); Vl(g, x + 1, 3, 4, RF[3]); }             // costuras entre paños
  H(g, 3, 31, 5, RF[2]); H(g, 3, 31, 6, RF[1]);                                                      // caida de la lona hacia la camara (en sombra)
  H(g, 3, 31, 7, RF[0]); for (x = 5; x <= 29; x += 3) g.set(x, 7, RF[2]);                            // dobladillo cosido
  for (x = 3; x <= 31; x++) { var ph = x % 4; if (ph < 3) g.set(x, 8, FL[2]); if (ph === 1) g.set(x, 9, FL[1]); if (ph === 0) g.set(x, 8, FL[1]); }   // flecos en 'v'
  H(g, 3, 25, 10, '#12101a'); H(g, 3, 25, 11, '#1b1823');                                            // sombra del techo sobre el interior
  // visera delantera: la lona sigue 3 px sobre el parabrisas
  R(g, 31, 3, 34, 6, RF[2]); H(g, 31, 34, 3, RF[3]); H(g, 31, 34, 6, RF[1]); g.set(34, 3, null);
  // un remiendo de otro color, nada mas
  R(g, 22, 2, 25, 4, mix(RF[2], '#4a6498', 0.55)); H(g, 22, 25, 2, mix(RF[3], '#7a92c0', 0.5)); H(g, 22, 25, 4, mix(RF[1], '#2f4470', 0.6));
  // rueda de moto delantera y horquilla, manubrio y faro
  H(g, 30, 36, 19, MT[2]); R(g, 34, 14, 35, 19, MT[2]); Vl(g, 34, 14, 19, MT[4]);
  R(g, 33, 12, 37, 13, '#2a2a32'); R(g, 36, 12, 38, 14, '#949b9a'); g.set(37, 12, '#ffffff');
  R(g, 33, 16, 37, 22, B[2]); H(g, 33, 37, 16, B[3]); Vl(g, 37, 17, 22, B[1]);                    // carenaje
  for (i = 0; i < 6; i++) g.set(31 + i, 14 + Math.floor(i / 3), MT[3]);
  // oxido, tierra, abolladura (poco: solo abajo)
  rustPatch(g, r, 8, 26, 4, 2, null); rustPatch(g, r, 24, 26, 3, 1.6, null);
  dirtBand(g, r, 2, 29, 21, 26, 0.6, function (c) { return B.indexOf(c) >= 0; });
  // ruedas: trasera (cerca) y delantera
  arch(g, 10.5, 27.5, 5, 28, B);
  wheel(g, 10.5, 27.5, 5, { cap: true }); wheel(g, 38.5, 27.5, 5, {});
  R(g, 33, 23, 41, 24, B[1]); H(g, 33, 41, 23, B[3]);                                              // guardabarro delantero
  wheel(g, 38.5, 27.5, 5, {});
}
function motoSide(v, dir, lvl) {
  var V = MOTO_V[v % 3];
  return buildSide({ W: 44, H: 36, dir: dir, shift: 2, draw: function (g) { drawMoto(g, V, 9000 + v * 5); }, seed: 90 + v, dmg: specMoto(),
    text: function (g, T) { T(V.name, 6, 19, { font: 'a5', ink: V.ink }); },
    x0: 4, x1: 42, bot: 28, gy: 32, rows: 3, ax: 22, ay: 32, fw: 38, fh: 13, tall: false }, lvl);
}

/* ======================== CONTENEDORES, TRACTO Y TRAILERS ======================== */
var CONT = {
  oxido: ['#3a1a1c', '#5e2a26', '#8a3a32', '#a8564a', '#c78068'],
  azul:  ['#14234a', '#22407a', '#2e4f8f', '#4a6fae', '#7a96c8'],
  verde: ['#1c2e2c', '#2a4c44', '#3a6a5a', '#5a8a76', '#86ad98'],
  gris:  ['#4f4e5e', '#6c6c77', '#838786', '#949b9a', '#a4abaa']
};
var YC = ['#6b5420', '#a88a1c', '#e3b82a', '#f2d25a', '#fbe9a0'];
var CY0 = 19, CY1 = 54;                    // filas de la pared del contenedor (36 filas = 2,6 m); techo en 0..18
function cl(i) { return i < 0 ? 0 : (i > 4 ? 4 : i); }
function drawContainer(g, x0, x1, P, r, o) {
  o = o || {};
  var x, y, i, h = CY1 - CY0 + 1;
  var okc = function (c) { return P.indexOf(c) >= 0; };
  // techo corrugado (se ve desde arriba): costillas cada 4 px en dos valores
  for (x = x0; x <= x1; x++) for (i = 0; i < CY0; i++) {
    var m = (x - x0) & 3, c;
    if (i <= 1) c = P[3]; else if (i >= CY0 - 1) c = P[1]; else if (i >= CY0 - 3) c = P[2]; else c = (m === 1 || m === 2) ? P[4] : P[3];
    if (i === 0 && (x === x0 || x === x1)) c = null;
    g.set(x, i, c);
  }
  // pared lateral
  for (x = x0; x <= x1; x++) for (y = CY0; y <= CY1; y++) {
    var t = (y - CY0) / h, c2;
    if (y <= CY0 + 2) c2 = [P[4], P[3], P[2]][y - CY0];
    else if (y >= CY1 - 2) c2 = [P[2], P[1], P[0]][y - (CY1 - 2)];
    else { var mm = (x - x0) & 3, b = mm === 0 ? 3 : (mm === 3 ? 1 : 2); c2 = P[cl(b + (t < 0.14 ? 1 : (t > 0.72 ? -1 : 0)))]; }
    g.set(x, y, c2);
  }
  // postes de esquina y piezas de esquina (dados oscuros)
  for (y = CY0; y <= CY1; y++) { R(g, x0, y, x0 + 2, y, y <= CY0 + 2 ? P[3] : P[2]); R(g, x1 - 2, y, x1, y, P[1]); g.set(x0, y, P[3]); g.set(x0 + 2, y, P[1]); g.set(x1 - 2, y, P[2]); }
  [[x0, CY0], [x0, CY1 - 3], [x1 - 4, CY0], [x1 - 4, CY1 - 3]].forEach(function (q) { R(g, q[0], q[1], q[0] + 4, q[1] + 3, '#2a2a33'); H(g, q[0], q[0] + 4, q[1], '#4a4a58'); g.set(q[0] + 2, q[1] + 1, '#14121c'); });
  // bolsillos de montacargas
  [[x0 + 18, 4], [x1 - 34, 4]].forEach(function (q) { R(g, q[0], CY1 - 2, q[0] + 7, CY1 - 1, '#14121c'); });
  // desgaste: tierra, oxido con causa, abolladuras, chorreras
  dirtBand(g, r, x0, x1, CY0 + 18, CY1, 0.7, okc);
  speck(g, r, x0, 0, x1, CY0 - 3, Math.floor((x1 - x0) * 0.35), [mix(P[3], DT[3], 0.3), mix(P[4], DT[3], 0.25)], okc);
  var nR = o.rust === undefined ? 5 : o.rust;
  for (i = 0; i < nR; i++) rustPatch(g, r, x0 + 4 + r() * (x1 - x0 - 8), CY1 - 1 - r() * 2, 3 + r() * 4, 1.8 + r() * 1.5, null);
  rustPatch(g, r, x0 + 3, CY0 + 2, 3, 2, null); rustPatch(g, r, x1 - 4, CY0 + 2, 3, 2, null);
  for (i = 0; i < 4; i++) streak(g, r, x0 + 8 + Math.floor(r() * (x1 - x0 - 16)), CY0 + 3, 4 + Math.floor(r() * 6), okc);
  if (P === CONT.gris) {                                                          // contenedor claro: mugre de patio, chorreras largas y oxido de esquina para bajarlo de valor
    dirtBand(g, r, x0, x1, CY0 + 4, CY1, 0.75, okc);
    dirtBand(g, r, x0, x1, 2, CY0 - 2, 0.55, okc);
    for (i = 0; i < 9; i++) streak(g, r, x0 + 4 + Math.floor(r() * (x1 - x0 - 8)), CY0 + 3, 8 + Math.floor(r() * 10), okc);
    for (i = 0; i < 4; i++) rustPatch(g, r, x0 + 6 + r() * (x1 - x0 - 12), CY0 + 5 + r() * 10, 3 + r() * 3, 2 + r() * 2, null);
  }
  var dx = x0 + 28 + Math.floor(r() * (x1 - x0 - 70));
  for (y = CY0 + 12; y <= CY0 + 22; y++) for (x = dx; x < dx + 9; x++) { var kk = (x - dx) + (y - CY0 - 12) * 0.3; if (r() < 0.8 && kk > 1 && kk < 9) tint(g, x, y, SHD, 0.2); }
  lineMix(g, dx, CY0 + 12, dx + 8, CY0 + 22, '#ffffff', 0.25);
  if (o.tag) {                                                                    // pinta a brocha: rosado de barrio (solo las lineas, sin letras)
    var tx0 = x0 + o.tag; for (i = 0; i < 14; i++) { g.set(tx0 + i, CY0 + 24 + Math.round(Math.sin(i * 0.7) * 3), '#d6567a'); g.set(tx0 + i, CY0 + 25 + Math.round(Math.sin(i * 0.7) * 3), '#a8386a'); }
  }
}
/* patas de apoyo, chasis, ruedas y guardabarros del semirremolque. wheels: [cx...] */
function drawTrailerGear(g, x0, x1, wheels, r) {
  var x, y, cy = 65.5;
  R(g, x0, 55, x1, 58, '#2a2a33'); H(g, x0, x1, 55, '#4a4a58'); H(g, x0, x1, 58, '#14121c');
  for (x = x0 + 6; x < x1 - 4; x += 12) { R(g, x, 56, x, 57, '#14121c'); }
  // paragolpes antiempotramiento trasero y luces
  R(g, x0 - 3, 59, x0 + 1, 62, '#2a2a33'); H(g, x0 - 3, x0 + 1, 59, '#4a4a58'); for (y = 59; y <= 62; y++) g.set(x0 - 3, y, y % 2 ? '#c0392b' : '#f3efe2');
  R(g, x0 - 1, 48, x0, 52, '#8a2a2c'); g.set(x0 - 1, 48, '#dc6a52');
  wheels.forEach(function (cx) {
    for (x = cx - 11; x <= cx + 11; x++) for (y = 54; y <= 62; y++) { var d = (x - cx) * (x - cx) + (y - cy) * (y - cy); if (d <= 11 * 11 && d > 9.2 * 9.2 && y < cy - 4) g.set(x, y, y === 54 || d > 10.2 * 10.2 ? '#14121c' : '#2a2a33'); }
    arch(g, cx, cy, 8, 58, ['#2a2a33', '#2a2a33', '#2a2a33', '#2a2a33', '#2a2a33']);
    wheel(g, cx, cy, 8, { cap: false });
    R(g, cx + 9, 62, cx + 10, 71, '#14121c'); R(g, cx + 9, 62, cx + 9, 71, '#26232f');
  });
}
function drawTractor(g, ox, cp, r, o) {
  o = o || {};
  var T = function (x) { return ox + x; }, x, y, i, paint = function (c) { return cp.indexOf(c) >= 0; };
  // chasis, quinta rueda, mangueras
  R(g, T(2), 54, T(90), 58, '#2a2a33'); H(g, T(2), T(90), 54, '#4a4a58'); H(g, T(2), T(90), 58, '#14121c');
  R(g, T(8), 51, T(36), 53, '#3b3b46'); H(g, T(8), T(36), 51, '#6b6b78'); R(g, T(30), 48, T(32), 51, '#8a8a92');
  for (i = 0; i < 6; i++) { g.set(T(38 + i), 50 + (i % 2), '#c0392b'); g.set(T(38 + i), 52 - (i % 2), '#e3b82a'); }
  // tanque de combustible (cilindro metalico) y tubos de escape verticales
  for (y = 56; y <= 67; y++) for (x = T(45); x <= T(57); x++) { var u = (y - 56) / 12; g.set(x, y, u < 0.2 ? MT[4] : (u < 0.45 ? MT[3] : (u < 0.75 ? MT[2] : (u < 0.9 ? MT[1] : MT[0])))); }
  Vl(g, T(46), 57, 66, MT[4]); Vl(g, T(51), 56, 67, MT[0]); Vl(g, T(52), 56, 67, MT[1]); Vl(g, T(56), 56, 67, MT[0]);
  R(g, T(45), 56, T(57), 56, MT[4]);
  rustPatch(g, r, T(54), 66, 3, 1.5, null);
  [[T(50), 1], [T(54), 0]].forEach(function (q) {
    for (y = 12; y <= 56; y++) { g.set(q[0], y, MT[4]); g.set(q[0] + 1, y, q[1] ? MT[2] : MT[1]); }
    R(g, q[0] - 1, 11, q[0] + 2, 12, MT[3]); g.set(q[0], 10, MT[4]); H(g, q[0] - 1, q[0] + 2, 36, MT[0]); H(g, q[0] - 1, q[0] + 2, 48, MT[0]); H(g, q[0] - 1, q[0] + 2, 54, MT[0]);
  });
  tint(g, T(50), 8, DT[1], 0.5);
  [[T(51), 4], [T(52), 2], [T(53), 1]].forEach(function (q) { if (r() < 0.6) g.set(q[0], q[1] + 2, '#8c8a93'); });
  // cabina plana: pared + techo extruido, sin silueta de capo
  var topC = function (xx) { return (xx <= T(58) || xx >= T(94)) ? 31 : 28; };
  boxy(g, { x0: T(58), x1: T(94), top: topC, zone: function () { return 'roof'; }, depth: 19, bot: 58, P: cp });
  for (x = T(59); x <= T(93); x++) { g.set(x, 11, cp[4]); g.set(x, 13, cp[2]); }
  for (x = T(60); x <= T(92); x += 6) Vl(g, x, 12, 26, cp[2]);
  R(g, T(62), 11, T(76), 15, cp[2]); H(g, T(62), T(76), 11, cp[4]);                            // deflector / foco del techo
  if (cp === WH) {                                                                                 // cabina blanca: techo cargado y sucio (parrilla, lona, barra de luces) para que no sea la mancha mas clara
    [17, 25].forEach(function (yy) { H(g, T(60), T(92), yy, MT[2]); H(g, T(60), T(92), yy + 1, MT[1]); });
    for (x = T(60); x <= T(92); x += 8) { R(g, x, 17, x + 1, 26, MT[2]); Vl(g, x, 17, 26, MT[3]); }
    g.ell(T(80), 21, 10, 4.5, '#22407a'); g.ell(T(79.5), 20.2, 9.2, 3.7, '#2e4f8f'); g.ell(T(78), 19.2, 6.5, 2, '#4a6fae');   // lona azul amarrada
    Vl(g, T(74), 17, 25, '#e0c58d'); Vl(g, T(86), 17, 25, '#e0c58d');
    R(g, T(62), 18, T(70), 24, '#4a3028'); H(g, T(62), T(70), 18, '#a5814f'); Vl(g, T(66), 18, 24, '#2a1c1a');              // caja de herramientas / llanta de auxilio
    dirtBand(g, r, T(58), T(94), 12, 30, 0.55, paint);
    for (i = 0; i < 7; i++) streak(g, r, T(60) + Math.floor(r() * 32), 27, 4 + Math.floor(r() * 6), paint);
  }
  dirtBand(g, r, T(58), T(94), 44, 58, 0.7, paint);
  speck(g, r, T(58), 9, T(94), 26, 10, [mix(cp[3], DT[3], 0.3)], paint);
  rustPatch(g, r, T(60), 57, 3, 1.6, null); rustPatch(g, r, T(92), 56, 2, 2, null);
  // puerta, luna, manija, rejilla
  R(g, T(62), 30, T(63), 57, cp[1]); Vl(g, T(84), 30, 57, cp[1]); H(g, T(62), T(84), 57, cp[1]); Vl(g, T(85), 30, 57, cp[4]);
  glass(g, T(66), 34, T(82), 46, { seats: [3], crack: o.crack ? [11, 4, 3] : null });
  R(g, T(70), 49, T(73), 50, MT[3]); g.set(T(70), 50, MT[1]);
  R(g, T(86), 38, T(91), 52, '#1d1a26'); for (y = 39; y <= 51; y += 2) H(g, T(86), T(91), y, MT[1]);
  // espejo grande, faro, parachoques, escalones
  R(g, T(95), 32, T(96), 46, '#2a2a32'); Vl(g, T(95), 32, 46, '#6b7280'); H(g, T(92), T(95), 33, '#2a2a32');
  R(g, T(92), 50, T(94), 55, o.noLamp ? '#0e0d12' : '#e8e0b8'); H(g, T(92), T(94), 50, '#a4abaa');
  R(g, T(88), 60, T(96), 66, '#2a2a33'); H(g, T(88), T(96), 60, '#4a4a58'); H(g, T(88), T(96), 66, '#14121c'); g.set(T(91), 63, RS[2]);
  for (i = 0; i < 2; i++) { R(g, T(66), 60 + i * 4, T(80), 61 + i * 4, '#3b3b46'); H(g, T(66), T(80), 60 + i * 4, '#6b6b78'); }
  // pasos de rueda y ruedas (1 delantera + 2 de traccion)
  arch(g, T(84) + 0.5, 65.5, 8, 58, cp);
  [T(24) + 0.5, T(42) + 0.5].forEach(function (cx) {
    for (x = cx - 11; x <= cx + 11; x++) for (y = 54; y <= 62; y++) { var d = (x - cx) * (x - cx) + (y - 65.5) * (y - 65.5); if (d <= 121 && d > 85 && y < 61) g.set(Math.round(x), y, d > 104 ? '#14121c' : '#2a2a33'); }
    wheel(g, cx, 65.5, 8, { cap: true });
    R(g, cx - 14, 62, cx - 13, 71, '#14121c');
  });
  wheel(g, T(84) + 0.5, 65.5, 8, {});
}
/* Palabra grande de naviera centrada en la pared (x0..x1). Si no cabe en a12 baja a a7. Solo UNA por juego de variantes. */
function bigWord(T, str, x0, x1, y, ink, outline) {
  var f = 'a12', w = MEAS(str, f);
  if (w > x1 - x0 - 14) { f = 'a7'; w = MEAS(str, f); y += 3; }
  T(str, Math.round(x0 + (x1 - x0 + 1 - w) / 2), y, { font: f, ink: ink, outline: f === 'a12' ? outline : null, shadow: f === 'a7' ? outline : null });
}
var TRAILER_V = [
  { cab: WH,  cont: CONT.azul, code: 'ALNU 301774 7', id: 'ANDESLINE', ink: '#f3efe2', len: 20, open: false, tag: 0 },
  { cab: YC,  cont: CONT.gris, code: 'CSVU 458120 3', id: null, ink: K,         len: 20, open: false, tag: 40 }
];
function rigDraw(g, W, V, ox, cx0, cx1, wheels, seed, large) {
  var r = rng(seed);
  drawTractor(g, ox, V.cab, r, { crack: !large, noLamp: V === TRAILER_V[1] });
  drawContainer(g, cx0, cx1, V.cont, r, { tag: V.tag, rust: 6 });
  drawTrailerGear(g, cx0, cx1 - 12, wheels, r);
  // patas de apoyo recogidas, con manivela
  R(g, cx1 - 17, 55, cx1 - 15, 64, '#3b3b46'); Vl(g, cx1 - 17, 55, 64, '#6b6b78'); R(g, cx1 - 18, 64, cx1 - 14, 64, '#14121c'); R(g, cx1 - 14, 59, cx1 - 11, 59, MT[2]);
  if (large) {
    // puerta trasera abierta (hoja corrugada girada) y carga caida detras
    var P = V.cont;
    for (var k = 0; k <= 9; k++) { var xx = cx0 - k, sh = Math.round(8 * k / 9); for (var yy = CY0 + sh; yy <= CY1 + sh; yy++) g.set(xx, yy, yy <= CY0 + sh + 1 ? P[4] : (yy >= CY1 + sh - 1 ? P[0] : P[(k + 1) % 3 === 0 ? 1 : 2])); if (k === 9) for (yy = CY0 + sh; yy <= CY1 + sh; yy++) g.set(xx, yy, P[1]); }
    g.ell(8, 66, 6, 3, '#4a3028'); g.ell(7.5, 64.8, 5, 2.4, '#8a7658'); g.ell(6.5, 64, 3, 1.4, '#c9b88a'); Vl(g, 8, 62, 68, '#4a3028');
    R(g, 14, 62, 20, 68, '#7a5a45'); H(g, 14, 20, 62, '#a5814f'); Vl(g, 17, 62, 68, '#4a3028'); H(g, 14, 20, 65, '#4a3028');
  }
}
function trailerSide(v, dir) {
  var V = TRAILER_V[v];
  return buildSide({ W: 168, H: 76, dir: dir, shift: 2,
    draw: function (g) { rigDraw(g, 168, V, 69, 8, 105, [30, 51], 9100 + v * 7, false); },
    text: function (g, T) { T(V.code, 18, CY0 + 5, { font: 'a5', ink: V.ink }); if (V.id) bigWord(T, V.id, 8, 105, CY0 + 14, V.ink, V.cont[0]); },
    x0: 1, x1: 164, bot: 73, gy: 73, rows: 2, ax: 82, ay: 73, fw: 162, fh: 25, tall: true });
}
var LARGO = { cab: WH, cont: CONT.azul, code: 'MPCU 774201 5', id: 'COSTAVELA', ink: '#f3efe2' };
function trailerLargoSide(dir) {
  return buildSide({ W: 256, H: 76, dir: dir, shift: 2,
    draw: function (g) { rigDraw(g, 256, LARGO, 157, 14, 201, [36, 57], 9300, true); },
    text: function (g, T) { T(LARGO.code, 28, CY0 + 5, { font: 'a5', ink: LARGO.ink }); bigWord(T, LARGO.id, 14, 201, CY0 + 14, LARGO.ink, LARGO.cont[0]); },
    x0: 1, x1: 252, bot: 73, gy: 73, rows: 2, ax: 126, ay: 73, fw: 250, fh: 25, tall: true });
}
var CONT_V = [
  { P: CONT.oxido, code: 'MPCU 302145 9', ink: '#f3efe2', id: 'MARPAC', tag: 0, seed: 1 },       // la unica palabra grande del juego de variantes
  { P: CONT.azul,  code: 'BMRU 301774 7', ink: '#f3efe2', id: null, tag: 52, seed: 2 },
  { P: CONT.verde, code: 'ALNU 355018 2', ink: '#f3efe2', id: null, tag: 0, seed: 3 },
  { P: CONT.gris,  code: 'CSVU 410962 6', ink: K,         id: null, tag: 0, seed: 4 }
];
function contenedorSide(v) {
  var V = CONT_V[v];
  return buildSide({ W: 98, H: 56, dir: 'E', shift: 0,
    draw: function (g) { var r = rng(9500 + v * 13); drawContainer(g, 1, 94, V.P, r, { tag: V.tag, rust: 6 }); R(g, 6, 55, 12, 55, DARK); R(g, 83, 55, 89, 55, DARK); },
    text: function (g, T) { T(V.code, 10, CY0 + 5, { font: 'a5', ink: V.ink }); if (V.id) bigWord(T, V.id, 1, 94, CY0 + 14, V.ink, V.P[0]); },
    x0: 1, x1: 94, bot: 54, gy: 54, rows: 1, ax: 47, ay: 54, fw: 92, fh: 24, tall: true });
}
function tractoSide(dir, v) {
  var c = buildSide({ W: 100, H: 76, dir: dir, shift: 2,
    draw: function (g) { var r = rng(9700); drawTractor(g, 1, v ? YC : WH, r, { crack: true }); },
    text: null, x0: 1, x1: 96, bot: 73, gy: 73, rows: 2, ax: 49, ay: 73, fw: 90, fh: 25, tall: true });
  var o = px.canvas(100, 68), ctx = o.getContext('2d');
  ctx.drawImage(c, 0, 8, 100, 68, 0, 0, 100, 68);
  o.ax = 49; o.ay = 65; o.fw = 90; o.fh = 25; o.tall = true;
  return o;
}

/* ======================== VISTAS DE PUNTA ======================== */
function plate(g, x, y, code, bg) {                                    // placa con codigo inventado en ACH5 (3 letras: 11 px)
  R(g, x, y, x + 12, y + 6, bg || '#e8e0b8'); H(g, x, x + 12, y, '#fff8d8'); H(g, x, x + 12, y + 6, '#9a8f60'); g.set(x, y, null); g.set(x + 12, y + 6, null);
  TXT(g, code, x + 1, y + 1, { font: 'a5', ink: '#1c1a22' });
}
function lamp(g, x, y, w, h, on, broken) {
  R(g, x, y, x + w - 1, y + h - 1, broken ? '#0e0d12' : (on || '#e8e0b8')); if (!broken) { H(g, x, x + w - 1, y, '#fff8e0'); g.set(x + 1, y + 1, '#ffffff'); H(g, x, x + w - 1, y + h - 1, '#8a7a50'); } else { g.set(x + 1, y + 1, '#a4abaa'); g.set(x + w - 1, y + h - 1, '#8c93a0'); }
}
function roofEnd(g, v, seed, x0, x1, y0, y1, front) {
  // techo visto de punta: sombra a la derecha (luz NO), costillas longitudinales, parrilla y carga. y0..y1 = tramo del techo
  var r = rng(seed), x, y, h = y1 - y0 + 1;
  for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) {
    var tx = (x - x0) / (x1 - x0), c = tx < 0.15 ? WH[4] : (tx < 0.8 ? WH[3] : (tx < 0.92 ? WH[2] : WH[1]));
    if (y <= y0 + 1) c = tx < 0.8 ? WH[3] : WH[2];
    g.set(x, y, c);
  }
  for (y = y0 + 2; y <= y1; y++) { g.set(x0 + 5, y, WH[4]); g.set(x0 + 6, y, WH[2]); g.set(x0 + 11, y, WH[4]); g.set(x0 + 12, y, WH[2]); g.set(x0 + 16, y, WH[4]); }
  g.set(x0, y0, null); g.set(x1, y0, null); g.set(x0, y1, null); g.set(x1, y1, null);
  speck(g, r, x0, y0, x1, y1, 14, [mix(WH[3], DT[3], 0.3), WH[2]], null);
  for (var i = 0; i < 4; i++) streak(g, r, x0 + 2 + Math.floor(r() * 18), y0 + 2, 3 + Math.floor(r() * 4), null);
  rustPatch(g, r, x0 + 2, y0 + 3, 2, 2.5, null); rustPatch(g, r, x1 - 2, y1 - 6, 2, 3, null);
  var map = function (xe) { return front ? Math.round(y0 + (xe - 3) * (h - 1) / 57) : Math.round(y1 - (xe - 3) * (h - 1) / 57); };   // x del costado -> y del techo
  if (v.rack !== 'sign') {
    Vl(g, x0 + 1, y0 + 3, y1 - 3, MT[3]); Vl(g, x1 - 1, y0 + 3, y1 - 3, MT[2]); Vl(g, x0 + 2, y0 + 3, y1 - 3, MT[1]); Vl(g, x1 - 2, y0 + 3, y1 - 3, MT[1]);
    [8, 22, 36, 50].forEach(function (xe) { var yy = map(xe); H(g, x0 + 1, x1 - 1, yy, MT[3]); H(g, x0 + 1, x1 - 1, yy + 1, MT[1]); });
  }
  if (v.rack === 'bundles') {
    var b = function (cx, cy, rx, ry, c, rope) { g.ell(cx, cy, rx, ry, c[1]); g.ell(cx - 0.5, cy - 0.7, rx - 0.8, ry - 0.7, c[2]); g.ell(cx - 1.5, cy - 1.8, Math.max(1, rx - 3.5), Math.max(1, ry - 3), c[3]); if (rope) { Hl(g, Math.round(cx - rx + 1), Math.round(cx + rx - 1), Math.round(cy - ry * 0.3), rope); Hl(g, Math.round(cx - rx + 1), Math.round(cx + rx - 1), Math.round(cy + ry * 0.4), rope); } };
    b(13, (map(8) + map(28)) / 2, 8, Math.abs(map(8) - map(28)) / 2 + 0.5, C.blue, '#e0c58d');
    b(12, (map(30) + map(40)) / 2, 5.5, 4.8, ['#4a3028', '#8a7658', '#a8956e', '#c9b88a'], '#4a3028');
    b(14, (map(41) + map(49)) / 2, 5.5, 4.5, ['#3b4250', '#7a5a45', '#a5814f', '#c9a66b'], '#4a3028');
    b(13, map(53), 4, 3, C.orange, null);
  } else if (v.rack === 'empty') {
    var yy2 = map(40); g.disc(13.5, yy2, 5.2, K); g.disc(13.5, yy2, 4.2, '#2c2b35'); g.disc(13.5, yy2, 2.5, MT[2]); g.set(12, yy2 - 1, MT[4]); g.set(13, yy2, MT[0]);
    Vl(g, 8, map(8), map(26), '#c9a66b'); Vl(g, 9, map(10), map(24), '#8a7658');
  } else {
    var ys = map(38), ye = map(55); R(g, x0 + 4, ys, x1 - 4, ye, '#efe3a8'); H(g, x0 + 4, x1 - 4, ys, '#ffffff'); H(g, x0 + 4, x1 - 4, ye, '#9a8f70'); Vl(g, x1 - 4, ys, ye, '#c9b86a'); speck(g, r, x0 + 4, ys, x1 - 4, ye, 6, ['#c9b86a', '#a89a60'], null);
  }
  R(g, x0 + 9, map(20), x0 + 14, map(20) + 3, WH[2]); H(g, x0 + 9, x0 + 14, map(20), WH[4]); H(g, x0 + 10, x0 + 13, map(20) + 2, WH[0]);   // sombrerete del ventilador
}
function Hl(g, x0, x1, y, c) { H(g, x0, x1, y, c); }
function wheelEnd(g, x, y0, y1, left) {                                  // rueda vista de frente/atras: solo asoma el costado de la llanta
  R(g, x, y0, x + 2, y1, K); Vl(g, left ? x + 1 : x + 1, y0 + 1, y1 - 1, '#2c2b35'); g.set(left ? x : x + 2, y0 + 1, '#3d3c49'); Vl(g, left ? x + 2 : x, y0 + 2, y1 - 2, MT[1]);
}
function drawCombiS(g, v, seed) {
  var r = rng(seed), A = v.A, B = v.B, x, y, i, paint = function (c) { return WH.indexOf(c) >= 0 || A.indexOf(c) >= 0; };
  roofEnd(g, v, seed, 3, 24, 2, 46, true);
  // parabrisas
  R(g, 2, 47, 25, 60, WH[3]); Vl(g, 2, 47, 76, WH[4]); Vl(g, 3, 47, 60, WH[4]); Vl(g, 24, 47, 60, WH[2]); Vl(g, 25, 47, 60, WH[1]);
  H(g, 2, 25, 47, WH[4]);
  VG(g, 4, 48, 23, 59, GL, [[0, 3], [0.18, 2], [0.5, 1], [0.85, 0]]);
  for (i = 0; i < 12; i++) { var hx = 18 - Math.round(i * 0.9); g.set(hx, 48 + i, i < 6 ? '#b4d0d0' : GL[3]); g.set(hx + 1, 48 + i, GL[3]); }
  R(g, 5, 53, 14, 58, '#8f948f'); H(g, 5, 14, 53, A[2]); H(g, 5, 14, 58, '#b9b49c'); g.set(5, 58, null); g.set(14, 58, null);      // cartelito con el numero de ruta (esquina del tablero; el parabrisas queda libre)
  g.line(6, 59, 13, 57, '#14121a'); g.line(14, 59, 21, 56, '#14121a');
  if (v.windCrack) { crack(g, 19, 53, 3, '#dfe6dc'); lineMix(g, 22, 48, 19, 53, '#ffffff', 0.4); }
  if (v.broken) { g.disc(8.5, 55.5, 2, '#0e0d12'); crack(g, 8, 56, 2, '#9fb4b6'); }
  // capo, faros, parrilla
  for (y = 61; y <= 64; y++) for (x = 3; x <= 24; x++) g.set(x, y, y === 61 ? WH[4] : (y === 64 ? WH[2] : WH[3]));
  Vl(g, 13, 62, 64, WH[2]); Vl(g, 14, 62, 64, WH[4]);
  for (y = 65; y <= 74; y++) for (x = 2; x <= 25; x++) g.set(x, y, y < 68 ? WH[4] : (y < 72 ? WH[3] : WH[2]));
  lamp(g, 3, 65, 6, 5, null, v.flat === 1); lamp(g, 19, 65, 6, 5, null, false);
  R(g, 10, 65, 17, 69, '#2a2e3a'); for (y = 66; y <= 68; y += 2) H(g, 10, 17, y, MT[2]); H(g, 10, 17, 65, MT[1]);
  for (x = 2; x <= 25; x++) { g.set(x, 70, A[3]); g.set(x, 71, A[2]); g.set(x, 72, B[2]); }
  dirtBand(g, r, 2, 25, 61, 74, 0.7, paint); rustPatch(g, r, 5, 72, 3, 2, null); rustPatch(g, r, 22, 61, 2, 2, paint);
  speck(g, r, 3, 62, 24, 66, 6, [mix(WH[3], DT[3], 0.3)], paint);
  // parachoques + placa
  R(g, 1, 73, 26, 77, '#3b4250'); H(g, 1, 26, 73, MT[3]); H(g, 1, 26, 77, MT[0]); g.set(4, 76, RS[2]); g.set(5, 75, RS[3]); g.set(22, 76, RS[2]);
  plate(g, 8, 71, '   ');
  // espejos y ruedas
  R(g, 0, 54, 2, 60, '#2a2a32'); Vl(g, 0, 54, 60, '#6b7280'); R(g, 25, 54, 27, 60, '#2a2a32'); Vl(g, 25, 54, 60, '#6b7280');
  wheelEnd(g, 0, 68, 77, true); wheelEnd(g, 25, 68, 77, false);
}
function textCombiS(g, v) { TXT(g, v.pf, 6, 54, { font: 'a5', ink: K }); TXT(g, v.pl, 9, 72, { font: 'a5', ink: '#1c1a22' }); }
function drawCombiN(g, v, seed) {
  var r = rng(seed), A = v.A, B = v.B, x, y, i, paint = function (c) { return WH.indexOf(c) >= 0 || A.indexOf(c) >= 0; };
  roofEnd(g, v, seed + 3, 3, 24, 9, 58, false);
  // extremo delantero (lejos): capo asomando, borde del parabrisas y espejos
  for (y = 0; y <= 3; y++) for (x = 3; x <= 24; x++) g.set(x, y, y === 0 ? MT[1] : (y === 1 ? WH[1] : WH[2]));
  R(g, 3, 0, 24, 0, MT[1]); for (y = 4; y <= 8; y++) for (x = 3; x <= 24; x++) g.set(x, y, y < 6 ? GL[1] : GL[0]);
  Vl(g, 2, 3, 12, WH[3]); Vl(g, 25, 3, 12, WH[1]); R(g, 0, 6, 1, 9, '#2a2a32'); R(g, 26, 6, 27, 9, '#2a2a32');
  // cara trasera
  for (y = 59; y <= 77; y++) for (x = 2; x <= 25; x++) g.set(x, y, y < 61 ? WH[3] : (y < 68 ? WH[3] : (y < 73 ? WH[3] : WH[2])));
  H(g, 2, 25, 59, WH[4]); H(g, 3, 24, 60, WH[1]); Vl(g, 2, 59, 77, WH[4]); Vl(g, 25, 59, 77, WH[1]);
  glass(g, 5, 61, 22, 65, { frame: '#22212b', hi: true, crack: v.windCrack ? [14, 2, 3] : null });
  g.line(7, 65, 14, 62, '#14121a');
  if (v.broken) { g.disc(8.5, 63, 1.6, '#0e0d12'); crack(g, 8, 64, 2, '#9fb4b6'); }
  for (x = 2; x <= 25; x++) { g.set(x, 66, A[3]); g.set(x, 67, A[2]); }
  H(g, 3, 24, 68, WH[1]);
  Vl(g, 13, 68, 74, WH[1]); Vl(g, 14, 68, 74, WH[4]);                                                    // junta de las puertas traseras
  // luces traseras
  R(g, 2, 67, 4, 72, '#8a2a2c'); H(g, 2, 4, 67, '#dc6a52'); g.set(3, 68, '#e8604a'); R(g, 2, 71, 4, 72, '#5b1d1d');
  R(g, 23, 67, 25, 72, '#8a2a2c'); H(g, 23, 25, 67, '#dc6a52'); g.set(24, 68, '#e8604a'); R(g, 23, 71, 25, 72, '#5b1d1d');
  // escalerilla trasera y calcomanias
  Vl(g, 19, 62, 74, MT[3]); Vl(g, 22, 62, 74, MT[1]); for (y = 63; y <= 74; y += 3) H(g, 19, 22, y, MT[2]);
  R(g, 6, 69, 7, 70, B[2]); R(g, 8, 69, 9, 71, '#2f4470'); g.set(6, 72, '#c0392b'); R(g, 10, 70, 11, 70, '#f2e63c');
  dirtBand(g, r, 2, 25, 61, 77, 0.65, paint); rustPatch(g, r, 5, 74, 3, 2, null); rustPatch(g, r, 24, 62, 2, 2, paint); rustPatch(g, r, 14, 77, 6, 1.5, null);
  // parachoques, placa, ruedas
  R(g, 1, 75, 26, 77, '#3b4250'); H(g, 1, 26, 75, MT[3]); H(g, 1, 26, 77, MT[0]); g.set(6, 76, RS[2]); g.set(20, 76, RS[2]);
  plate(g, 6, 68, '   ');
  wheelEnd(g, 0, 69, 77, true); wheelEnd(g, 25, 69, 77, false);
}
function textCombiN(g, v) { TXT(g, v.pl, 7, 69, { font: 'a5', ink: '#1c1a22' }); TXT(g, v.plac, 15, 63, { font: 'a5', ink: '#8f948f', shadow: null }); }
var PLATES = ['V7K', 'B2R', 'M5X'];
function combiEnd(v, front, lvl) {
  var V = Object.assign({}, COMBI_V[v], { pf: ['77', '52', '18'][v], pl: PLATES[v] });
  return buildEnd({ W: 28, H: 80, draw: function (g) { (front ? drawCombiS : drawCombiN)(g, V, 7500 + v * 19 + (front ? 0 : 5)); }, seed: 75 + v + (front ? 0 : 9), dmg: specCombiEnd(front),
    text: function (g) { if (front) textCombiS(g, V); else TXT(g, V.pl, 7, 69, { font: 'a5', ink: '#1c1a22' }); },
    x0: 2, x1: 25, bot: 77, gy: 77, rows: 2, ax: 14, ay: 77, fw: 26, fh: 58, tall: true }, lvl);
}

/* auto de punta (cola hacia el norte): el sprite legado `car`, 28x66 */
function drawCarEnd(g, seed) {
  var r = rng(seed), P = C.slate, x, y, i, paint = function (c) { return P.indexOf(c) >= 0; };
  // capo asomando, parabrisas, techo, luneta, tapa del maletero
  for (y = 0; y <= 12; y++) for (x = 4; x <= 23; x++) g.set(x, y, y <= 1 ? P[1] : (y < 6 ? P[3] : (y < 11 ? P[2] : P[1])));
  Vl(g, 4, 2, 12, P[4]); Vl(g, 23, 2, 12, P[1]); Vl(g, 13, 3, 11, P[2]); Vl(g, 14, 3, 11, P[4]); R(g, 6, 0, 21, 1, '#2a2e3a'); H(g, 6, 21, 0, MT[1]);
  for (y = 13; y <= 20; y++) for (x = 5; x <= 22; x++) g.set(x, y, y < 16 ? GL[1] : GL[0]);
  H(g, 4, 23, 13, P[4]); Vl(g, 4, 13, 20, P[3]); Vl(g, 23, 13, 20, P[1]);
  for (y = 21; y <= 33; y++) for (x = 5; x <= 22; x++) g.set(x, y, (x - 5) < 3 ? P[4] : ((x - 5) < 14 ? P[3] : P[2]));
  H(g, 5, 22, 21, P[4]); for (y = 21; y <= 33; y++) { g.set(11, y, P[4]); g.set(12, y, P[2]); }
  g.set(5, 21, null); g.set(22, 21, null);
  glass(g, 6, 35, 21, 40, { crack: [11, 2, 3], hi: true });
  for (y = 41; y <= 49; y++) for (x = 4; x <= 23; x++) g.set(x, y, y === 41 ? P[4] : (y < 46 ? P[3] : (y < 49 ? P[2] : P[1])));
  Vl(g, 4, 41, 49, P[4]); Vl(g, 23, 41, 49, P[1]); Vl(g, 13, 42, 48, P[2]); Vl(g, 14, 42, 48, P[4]);
  // cara trasera
  for (y = 50; y <= 62; y++) for (x = 2; x <= 25; x++) g.set(x, y, y < 53 ? P[3] : (y < 58 ? P[2] : P[1]));
  Vl(g, 2, 50, 62, P[4]); H(g, 2, 25, 50, P[4]); H(g, 2, 25, 52, P[1]);
  R(g, 2, 51, 5, 55, '#8a2a2c'); H(g, 2, 5, 51, '#dc6a52'); g.set(3, 52, '#e8604a'); R(g, 2, 54, 5, 55, '#5b1d1d');
  R(g, 22, 51, 25, 55, '#8a2a2c'); H(g, 22, 25, 51, '#dc6a52'); g.set(23, 52, '#e8604a'); R(g, 22, 54, 25, 55, '#5b1d1d');
  dirtBand(g, r, 2, 25, 52, 62, 0.7, paint); rustPatch(g, r, 20, 58, 3, 2, null); rustPatch(g, r, 6, 49, 3, 2, paint);
  speck(g, r, 4, 1, 23, 49, 14, [mix(P[3], DT[3], 0.35)], paint);
  R(g, 1, 58, 26, 62, '#3b4250'); H(g, 1, 26, 58, MT[3]); H(g, 1, 26, 62, MT[0]); g.set(5, 61, RS[2]);
  plate(g, 8, 53, '   ');
  wheelEnd(g, 0, 56, 62, true); wheelEnd(g, 25, 56, 62, false);
  lineMix(g, 6, 44, 12, 43, SHD, 0.4);
}
function carEnd(lvl) {
  return buildEnd({ W: 28, H: 66, draw: function (g) { drawCarEnd(g, 8300); }, seed: 83, dmg: specCarEnd(),
    text: function (g) { TXT(g, 'P4L', 9, 54, { font: 'a5', ink: '#1c1a22' }); },
    x0: 2, x1: 25, bot: 62, gy: 62, rows: 2, ax: 14, ay: 62, fw: 26, fh: 48, tall: false }, lvl);
}

/* ======================== COMBI VOLCADA (hito del inicio) ======================== */
function drawVolcada(g) {
  var r = rng(7777), x, y, i, P = WH, A = C.blue, B = C.orange;
  var paint = function (c) { return P.indexOf(c) >= 0 || A.indexOf(c) >= 0 || B.indexOf(c) >= 0; };
  // ruedas lejanas (asoman por detras de la panza)
  [17, 62].forEach(function (cx) { g.disc(cx + 0.5, 6.5, 6, K); g.disc(cx + 0.5, 6.5, 5, '#2c2b35'); });
  // panza: franja superior (el piso del vehiculo), de oeste a este
  for (y = 8; y <= 21; y++) for (x = 4; x <= 80; x++) {
    var t = (y - 8) / 14;
    g.set(x, y, t < 0.1 ? '#4a4452' : (t < 0.55 ? '#3a3542' : (t < 0.85 ? '#2e2a36' : '#242030')));
  }
  for (y = 8; y <= 21; y++) { g.set(4, y, null); g.set(80, y, null); } g.set(5, 8, null); g.set(79, 8, null); g.set(5, 21, null); g.set(79, 21, null);
  // largueros del chasis con luz arriba, travesaños
  [[10, 12], [17, 19]].forEach(function (q) { H(g, 6, 78, q[0], '#6a6a78'); R(g, 6, q[0] + 1, 78, q[1], '#3b3b46'); H(g, 6, 78, q[1], '#14121c'); });
  for (x = 14; x <= 76; x += 11) { R(g, x, 10, x + 1, 19, '#4a4a58'); Vl(g, x, 10, 19, '#7a7a88'); }
  // cardan con juntas, tubo de escape con silenciador, tanque con correas, diferencial, eje delantero y motor
  R(g, 26, 14, 58, 15, MT[2]); H(g, 26, 58, 14, MT[4]); H(g, 26, 58, 15, MT[1]); R(g, 25, 13, 27, 16, MT[0]); R(g, 41, 13, 43, 16, MT[0]); R(g, 57, 13, 59, 16, MT[0]); g.set(26, 14, MT[3]);
  R(g, 5, 16, 24, 17, '#5a4a40'); H(g, 5, 24, 16, '#8a7658'); R(g, 7, 14, 21, 18, '#4a4048'); H(g, 7, 21, 14, '#8a8a92'); H(g, 7, 21, 18, '#14121c'); Vl(g, 7, 14, 18, '#8a8a92'); R(g, 12, 15, 13, 17, RS[2]);
  R(g, 32, 9, 52, 13, '#3a4252'); H(g, 32, 52, 9, '#6a7482'); H(g, 32, 52, 13, '#14121c'); Vl(g, 38, 9, 13, '#1c1a22'); Vl(g, 46, 9, 13, '#1c1a22'); rustPatch(g, r, 44, 12, 6, 2, null);
  R(g, 14, 12, 22, 17, '#4a4a58'); g.ell(18, 14.5, 4.5, 3, '#6a6a78'); g.ell(17.5, 14, 2.5, 1.5, '#8a8a92'); R(g, 4, 14, 14, 15, MT[1]);
  R(g, 60, 13, 76, 19, '#3b3b46'); H(g, 60, 76, 13, '#6a6a78'); R(g, 64, 10, 74, 13, '#4a4a58'); H(g, 64, 74, 10, '#8a8a92'); R(g, 62, 15, 70, 17, '#2a2a33'); for (x = 62; x <= 70; x += 3) Vl(g, x, 14, 18, '#14121c');
  R(g, 74, 8, 82, 20, '#2e2a36'); H(g, 74, 82, 8, '#4a4452'); for (y = 9; y <= 19; y += 2) H(g, 77, 81, y, '#4a4452'); // morro aplastado
  // goteo de aceite y suciedad de la panza
  for (i = 0; i < 10; i++) { x = 8 + Math.floor(r() * 68); y = 20 + Math.floor(r() * 2); tint(g, x, y, '#000000', 0.3); }
  rustPatch(g, r, 30, 18, 6, 2, null); rustPatch(g, r, 68, 12, 4, 2, null); rustPatch(g, r, 10, 20, 4, 1.5, null);
  // pared lateral (la de la puerta), ahora de cabeza: el techo hundido toca el suelo
  var wBot = 36, wTop = 22;
  for (y = wTop; y <= wBot; y++) for (x = 4; x <= 80; x++) {
    var tt = (y - wTop) / 15, c;
    c = tt < 0.08 ? P[2] : (tt < 0.5 ? P[3] : (tt < 0.62 ? (chk(x, y) ? P[3] : P[2]) : (tt < 0.84 ? P[2] : P[1])));
    g.set(x, y, c);
  }
  g.set(4, wTop, null); g.set(80, wTop, null); g.set(4, wBot, null); g.set(80, wBot, null);
  for (x = 4; x <= 80; x++) { g.set(x, 24, A[1]); g.set(x, 25, A[2]); g.set(x, 26, A[2]); g.set(x, 27, A[3]); g.set(x, 28, B[2]); }                // franjas, de cabeza
  for (x = 4; x <= 80; x++) { R(g, x, 34, x, 36, '#2e2a36'); g.set(x, 34, P[0]); if ((x * 7) % 5 < 2) g.set(x, 34, '#6a6a78'); }                                // techo hundido y raspado
  // ventanas rotas en la parte baja (cerca del suelo), el vano de la puerta y el parabrisas
  var wins = [[7, 17], [20, 31], [53, 64]];
  wins.forEach(function (w, k) {
    R(g, w[0] - 1, 29, w[1] + 1, 34, '#22212b'); R(g, w[0], 30, w[1], 33, '#0e0d12');
    for (i = w[0]; i <= w[1]; i += 3) { H(g, i, i + 1, 30, '#9fb4b6'); g.set(i, 31, GL[3]); }                                                       // dientes de vidrio
    if (k === 1) VG(g, w[0], 30, w[1], 33, GL, [[0, 1], [0.6, 0]]);
    R(g, w[0] + 2, 33, w[0] + 4, 33, '#dfe6dc');
  });
  R(g, 33, 28, 50, 36, '#0f0e15'); R(g, 34, 29, 49, 35, '#171521'); R(g, 36, 31, 40, 35, '#2e3350'); R(g, 43, 31, 47, 35, '#2e3350'); Vl(g, 32, 28, 36, P[1]); Vl(g, 51, 28, 36, P[1]);
  glass(g, 70, 28, 78, 33, { clip: function (xx, yy) { return xx - 70 < 9 - (yy - 28) * 0.4; }, hi: true }); crack(g, 74, 31, 3, '#dfe6dc');
  // ruedas hacia arriba, cerca de la panza: la cara de la llanta mira a la camara
  g.disc(17.5, 15.5, 7.2, '#14121c'); g.disc(62.5, 15.5, 7.2, '#14121c');
  wheel(g, 17.5, 15.5, 6, { cap: false }); wheel(g, 62.5, 15.5, 6, { flat: false });
  dirtBand(g, r, 4, 80, 28, 36, 0.8, paint); rustPatch(g, r, 24, 34, 6, 1.8, null); rustPatch(g, r, 58, 25, 5, 2, paint);
  speck(g, r, 4, 22, 80, 33, 22, [mix(P[3], DT[3], 0.35), mix(P[2], DT[2], 0.3)], paint);
  lineMix(g, 52, 24, 66, 27, SHD, 0.5); lineMix(g, 8, 25, 18, 24, '#ffffff', 0.35);
}
function volcada() {
  var g = new G(88, 40);
  // suelo: mancha de aceite y huellas de frenada, antes que el cuerpo
  drawVolcada(g);
  outlineSel(g);
  var x, y, r = rng(7790);
  for (x = 28; x <= 80; x++) for (y = 36; y <= 39; y++) { var dx = (x - 58) / 24, dy = (y - 37) / 3.2; if (dx * dx + dy * dy <= 1 && !g.get(x, y)) g.set(x, y, SHD + (dx * dx + dy * dy < 0.5 ? 'b0' : (chk(x, y) ? '70' : '48'))); }
  for (x = 0; x <= 26; x++) for (y = 35; y <= 37; y++) if (!g.get(x, y) && ((y === 36) || (y === 35 && x % 4 !== 0)) && x > 2 - y % 2) g.set(x, y, SHD + (y === 36 ? '78' : '50'));
  for (y = 37; y <= 39; y++) for (x = 2; x <= 84; x++) if (!g.get(x, y) && ((y === 37 && x < 84) || (y === 38 && x > 3 && x < 85) || (y === 39 && x > 5 && x < 87))) g.set(x, y, SHD + (y === 37 ? '90' : (y === 38 ? '58' : '30')));
  for (i = 0; i < 16; i++) { x = 22 + Math.floor(r() * 56); y = 37 + Math.floor(r() * 3); g.set(x, y, r() < 0.5 ? '#cfe3e6' : '#8fb0b8'); }          // vidrios en el piso
  var i;
  var c = g.toCanvas(44, 36, 82, 22); c.tall = true; return c;
}

/* ======================== ESTADOS DE DAÑO (v0.6, F3) ======================== */
/* Cada vehiculo rompible publica `.dmg = [c1, c2, c3]` (mismo tamano, ancla y huella). Se dibujan con el mismo codigo del vehiculo y encima un pase de
   dano en coordenadas del ESTE (antes del espejo y del texto), segun una ficha geometrica del vehiculo (`spec`):
     wins   [{x0,y0,x1,y1,test?}]  lunas rompibles          wind  la luna principal (parabrisas) para la grieta de c1
     lamp   [x0,y0,x1,y1] / [[..],[..]]   faros o calaveras    bump  [x0,y0,x1,y1] paragolpes     wheels [{x,y,r,bot}] o {end:[x,y0,y1,left]}
     roof   {x0,x1,y0,y1,flat?}  techo (c3: hundido)       dents [[cx,cy,rx,ry]]   scr [[x0,y0,x1,y1]]   body [x0,y0,x1,y1]   hot [x,y,r] (zona de motor: hollin)
   c1: abolladuras, parabrisas rajado.  c2: lunas rotas con esquirlas, faro colgando, paragolpes torcido, rayones.
   c3: carcasa: techo hundido, sin vidrio, llantas bajas, oxido y hollin. */
var GLASS_DK = '#0e0d12', SH1 = '#dfe6dc', SH2 = '#9fb4b6', CHASSIS = '#1c1830', SOOT = '#14121a', WIRE = '#262626';
function inW(w, x, y) { return x >= w.x0 && x <= w.x1 && y >= w.y0 && y <= w.y1 && (!w.test || w.test(x, y)); }
function eachW(w, fn) { for (var y = w.y0; y <= w.y1; y++) for (var x = w.x0; x <= w.x1; x++) if (inW(w, x, y)) fn(x, y); }
function crackIn(g, w, cx, cy, len) {                       // grieta blanca en estrella que no se sale de la luna
  var d = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  for (var i = 0; i < d.length; i++) {
    var L = len - (i % 3 === 0 ? 0 : 1);
    for (var k = 0; k <= L; k++) { var x = cx + d[i][0] * k + (k > 2 ? (i % 2 ? 1 : 0) : 0), y = cy + d[i][1] * k; if (inW(w, x, y) && g.get(x, y) && g.get(x, y) !== GLASS_DK) g.set(x, y, SH1); }
  }
  if (inW(w, cx, cy) && g.get(cx, cy) !== GLASS_DK) g.set(cx, cy, '#ffffff');
}
function breakGlass(g, w, mode, r) {
  var cx = (w.x0 + w.x1) / 2 + (r() - 0.5) * 3, cy = (w.y0 + w.y1) / 2 + (r() - 0.5) * 2, rx = (w.x1 - w.x0 + 1) / 2, ry = (w.y1 - w.y0 + 1) / 2, ph = r() * 6, hole = {};
  eachW(w, function (x, y) {
    if (!g.get(x, y)) return;
    if (mode === 'gone') { hole[x + ',' + y] = 1; return; }
    var dx = (x - cx) / rx, dy = (y - cy) / ry, d = Math.sqrt(dx * dx + dy * dy), an = Math.atan2(dy, dx);
    var lim = (mode === 'half' ? 0.46 : 0.78) * (0.7 + 0.55 * Math.abs(Math.sin(an * 2.5 + ph)));       // agujero en estrella: puntas hacia el marco
    if (d < lim) hole[x + ',' + y] = 1;
  });
  eachW(w, function (x, y) {
    var c = g.get(x, y); if (!c) return;
    if (hole[x + ',' + y]) { g.set(x, y, (mode === 'gone' && y >= w.y1 - 1 && w.y1 - w.y0 > 3) ? '#171521' : GLASS_DK); return; }
    if (hole[(x + 1) + ',' + y] || hole[(x - 1) + ',' + y] || hole[x + ',' + (y + 1)] || hole[x + ',' + (y - 1)]) g.set(x, y, ((x + y) & 1) ? SH1 : SH2);   // esquirlas en el borde del agujero
  });
  if (mode === 'gone') {                                                                                          // marco sin luna: dientes arriba y esquirlas en el alfeizar
    eachW(w, function (x, y) {
      if (!inW(w, x, y - 1) && ((x * 5) % 3 === 0)) g.set(x, y, SH2);
      if (!inW(w, x, y + 1) && (x % 2 === 0)) g.set(x, y, ((x >> 1) & 1) ? SH1 : SH2);
    });
  } else {
    crackIn(g, w, Math.round(cx + (cx < (w.x0 + w.x1) / 2 ? rx * 0.55 : -rx * 0.55)), Math.round(cy - 1), 2);
    var sx = Math.round(cx), sy = w.y1;                                                                           // esquirlas caidas al alfeizar
    for (var k = -2; k <= 2; k += 2) if (inW(w, sx + k, sy) && g.get(sx + k, sy) === GLASS_DK) g.set(sx + k, sy, SH1);
  }
}
function dent(g, cx, cy, rx, ry, k) {                                                                              // concava: borde NO en sombra, borde SE claro
  k = k || 1;
  for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy; if (d > 1) continue;
    var lit = dx * 0.7 + dy * 0.7;
    if (lit < 0) tint(g, x, y, SHD, 0.66 * k * (1 - d * 0.35)); else tint(g, x, y, '#ffffff', 0.46 * k * (1 - d * 0.35));
  }
}
function scratch(g, x0, y0, x1, y1) { lineMix(g, x0, y0, x1, y1, '#ffffff', 0.42); lineMix(g, x0 + 1, y0 + 1, x1 + 1, y1 + 1, SHD, 0.4); }
function hangLamp(g, L, gone, dirx) {
  var w = L[2] - L[0] + 1, h = L[3] - L[1] + 1, cx = Math.round((L[0] + L[2]) / 2), cy = Math.round((L[1] + L[3]) / 2);
  R(g, L[0], L[1], L[2], L[3], '#0c0b10'); g.set(L[0], L[1], '#2a2a32');
  var ly = L[3] + 2, lx = L[0] + (dirx || 0);
  if (gone) { g.line(cx, cy, cx + 1, cy + 3, WIRE); g.set(cx + 1, cy + 4, SH2); g.set(cx - 1, cy + 3, SH1); return; }
  g.line(cx, cy, lx + (w >> 1), ly, WIRE);
  R(g, lx, ly, lx + w - 1, ly + Math.max(2, h - 2), '#c9c2a0'); H(g, lx, lx + w - 1, ly, '#fff8e0'); H(g, lx, lx + w - 1, ly + Math.max(2, h - 2), '#7a6f48'); g.set(lx + w - 1, ly + 1, '#7a6f48');
  g.set(lx, ly + 1, '#ffffff');
}
function crookBumper(g, b, amt) {
  var w = b[2] - b[0] + 1, buf = [], x, y;
  for (y = b[1]; y <= b[3]; y++) for (x = b[0]; x <= b[2]; x++) buf.push([x, y, g.get(x, y)]);
  buf.forEach(function (p) { if (p[2]) g.set(p[0], p[1], CHASSIS); });
  buf.forEach(function (p) { if (p[2]) g.set(p[0], p[1] + Math.floor((p[0] - b[0]) * (amt + 1) / w), p[2]); });
  g.set(b[2] - 1, b[1] + amt + 1, '#8c93a0'); g.set(b[2] - 2, b[1] + amt, '#a4abaa');                              // brillo del canto doblado
}
function flatWheels(g, ws) {
  ws.forEach(function (w) {
    if (w.end) {                                                                                                    // rueda de punta: queda 3 px mas baja
      var e = w.end, x, y;
      for (y = e[1]; y <= e[2]; y++) for (x = e[0]; x <= e[0] + 2; x++) g.set(x, y, null);
      wheelEnd(g, e[0], e[1] + 3, e[2], e[3]); return;
    }
    for (var y2 = Math.floor(w.y - w.r - 1); y2 <= Math.ceil(w.y + w.r + 2); y2++) for (var x2 = Math.floor(w.x - w.r - 1.5); x2 <= Math.ceil(w.x + w.r + 1.5); x2++) {
      var d2 = (x2 - w.x) * (x2 - w.x) + (y2 - w.y) * (y2 - w.y); if (d2 > (w.r + 1) * (w.r + 1)) continue;
      g.set(x2, y2, y2 > w.bot ? null : '#201c2e');
    }
    wheel(g, w.x, w.y, w.r, { flat: true });
  });
}
function crushRoof(g, Rr, sag, r) {
  var x, y, i;
  if (!Rr.flat) for (x = Rr.x0 + 1; x < Rr.x1; x++) {
    var s = Math.round(Math.sin(Math.PI * (x - Rr.x0) / (Rr.x1 - Rr.x0)) * sag); if (s <= 0) continue;
    for (y = Rr.y1; y >= Rr.y0; y--) g.set(x, y + s, g.get(x, y));
    for (y = Rr.y0; y < Rr.y0 + s; y++) g.set(x, y, null);
  }
  for (y = Rr.y0; y <= Rr.y1 + 2; y++) for (x = Rr.x0; x <= Rr.x1; x++) tint(g, x, y, SHD, 0.22);
  for (i = 0; i < 4; i++) {                                                                                         // pliegues: sombra + filo claro
    var ax = Rr.x0 + 2 + Math.floor(r() * (Rr.x1 - Rr.x0 - 6)), ay = Rr.y0 + Math.floor(r() * (Rr.y1 - Rr.y0 + 1)), bx = ax + 5 + Math.floor(r() * 6) * (r() < 0.5 ? 1 : -1), by = ay + 2 + Math.floor(r() * 5);
    bx = Math.max(Rr.x0, Math.min(Rr.x1, bx)); by = Math.min(Rr.y1 + 2, by);
    lineMix(g, ax, ay, bx, by, SOOT, 0.62); lineMix(g, ax + 1, ay, bx + 1, by, '#ffffff', 0.36);
  }
  rustPatch(g, r, (Rr.x0 + Rr.x1) / 2 + 3, Rr.y0 + 4, 7, 3, null); rustPatch(g, r, Rr.x0 + 5, Rr.y1 - 2, 4, 2.5, null);
}
function wreckTint(g, S, r) {                                                                                       // carcasa: pintura muerta, oxido y hollin
  var b = S.body, x, y, i;
  for (y = b[1]; y <= b[3]; y++) for (x = b[0]; x <= b[2]; x++) {
    var c = g.get(x, y); if (!c || c.length !== 7) continue;
    var k = 0.2;
    if (S.hot) { var d = Math.sqrt((x - S.hot[0]) * (x - S.hot[0]) + (y - S.hot[1]) * (y - S.hot[1])) / S.hot[2]; if (d < 1) k += (1 - d) * 0.55; }
    g.set(x, y, mix(c, k > 0.32 ? SOOT : '#5a5460', Math.min(0.78, k)));
  }
  for (i = 0; i < 6; i++) rustPatch(g, r, b[0] + 4 + r() * (b[2] - b[0] - 8), b[1] + (b[3] - b[1]) * (0.35 + r() * 0.6), 3 + r() * 3, 1.6 + r() * 1.5, null);
}
function dmgPass(g, lvl, S, seed) {
  var r = rng(seed * 7919 + lvl * 131), i, k;
  var dk = lvl === 1 ? 1 : (lvl === 2 ? 1.15 : 1.3);
  (S.dents || []).forEach(function (d, j) { if (lvl > 1 || j < 2) dent(g, d[0], d[1], d[2], d[3], dk); });
  if (lvl === 1) {
    if (S.wind) { crackIn(g, S.wind, Math.round((S.wind.x0 + S.wind.x1) / 2) + 1, Math.round((S.wind.y0 + S.wind.y1) / 2) - 1, 5); }
    if (S.wind2) crackIn(g, S.wind2, Math.round((S.wind2.x0 + S.wind2.x1) / 2), Math.round((S.wind2.y0 + S.wind2.y1) / 2), 2);
    (S.scr || []).slice(0, 1).forEach(function (s) { scratch(g, s[0], s[1], s[2], s[3]); });
    return;
  }
  (S.scr || []).forEach(function (s) { scratch(g, s[0], s[1], s[2], s[3]); });
  var wins = S.wins || [];
  if (lvl === 2) {
    wins.forEach(function (w, j) { breakGlass(g, w, (w === S.wind || j % 2 === 0) ? 'hole' : 'half', r); });
    if (S.wind) crackIn(g, S.wind, S.wind.x0 + 1, S.wind.y1 - 1, 3);
    var lamps = S.lamp && typeof S.lamp[0] === 'number' ? [S.lamp] : (S.lamp || []);
    lamps.forEach(function (L, j) { if (j === 0) hangLamp(g, L, false, S.lampDx || 0); else { R(g, L[0], L[1], L[2], L[3], '#0e0d12'); g.set(L[0] + 1, L[1] + 1, SH2); } });
    if (S.bump) crookBumper(g, S.bump, 2);
    if (S.hot) { lineMix(g, S.hot[0] - 4, S.hot[1] - 2, S.hot[0] + 2, S.hot[1] + 1, SOOT, 0.5); }
    rustPatch(g, r, S.body[0] + (S.body[2] - S.body[0]) * 0.3, S.body[3] - 2, 5, 1.8, null);
    return;
  }
  // c3: carcasa
  wins.forEach(function (w) { breakGlass(g, w, 'gone', r); });
  var lamps3 = S.lamp && typeof S.lamp[0] === 'number' ? [S.lamp] : (S.lamp || []);
  lamps3.forEach(function (L) { hangLamp(g, L, true); });
  if (S.bump) crookBumper(g, S.bump, 3);
  if (S.wheels) flatWheels(g, S.wheels);
  if (S.roof) crushRoof(g, S.roof, S.roof.sag === undefined ? 3 : S.roof.sag, r);
  wreckTint(g, S, r);
  for (i = 0; i < 3; i++) { k = (S.scr || [])[i]; if (k) scratch(g, k[0] + 2, k[1] + 3, k[2] + 2, k[3] + 3); }
}
function polyTop(topFn, depth, x0, x1) { return { x0: x0, x1: x1, y0: 0, y1: 60, test: function (x, y) { var t = topFn(x); return y >= t - depth && y <= t - 1; } }; }
function specCombi(v) {
  var dClip = function (x, y) { return y > combiTop(x) + 1; };
  var wind = polyTop(combiTop, 13, 61, 69); wind.y1 = 26;
  var win = [{ x0: 4, y0: 15, x1: 14, y1: 22 }, { x0: 17, y0: 15, x1: 30, y1: 22 }, v.door === 'open' ? { x0: 35, y0: 16, x1: 46, y1: 21 } : { x0: 34, y0: 15, x1: 47, y1: 22 },
    { x0: 59, y0: 15, x1: 64, y1: 22, test: dClip }, wind];
  return { wins: win, wind: wind, wind2: win[1], lamp: [74, 28, 76, 31], bump: [69, 36, 77, 39], lampDx: 1, body: [1, 14, 77, 40], hot: [73, 31, 13],
    wheels: [{ x: 17.5, y: 37.5, r: 6, bot: 40 }, { x: 62.5, y: 37.5, r: 6, bot: 40 }], roof: { x0: 3, x1: 59, y0: 0, y1: 12, sag: 3 },
    dents: [[12, 35, 5, 2], [55, 34, 5, 3], [71, 31, 3, 3]], scr: [[3, 34, 9, 32], [52, 30, 59, 28], [66, 33, 72, 31]] };
}
function specCuster() {
  var dClip = function (x, y) { return y > custerTop(x) + 1; };
  var wind = polyTop(custerTop, 17, 96, 103); wind.y1 = 30;
  var win = []; for (var i = 0; i < 6; i++) if (i !== 3) win.push({ x0: 4 + i * 12, y0: 19, x1: 12 + i * 12, y1: 28 });
  win.push({ x0: 99, y0: 19, x1: 103, y1: 28, test: dClip }); win.push(wind);
  return { wins: win, wind: wind, wind2: win[0], lamp: [106, 33, 108, 37], bump: [102, 46, 109, 50], lampDx: 1, body: [1, 18, 109, 50], hot: [104, 38, 16],
    wheels: [{ x: 34.5, y: 46.5, r: 7, bot: 50 }, { x: 97.5, y: 46.5, r: 7, bot: 50 }], roof: { x0: 3, x1: 94, y0: 0, y1: 16, sag: 3 },
    dents: [[20, 44, 6, 3], [60, 40, 6, 3], [100, 41, 3, 3]], scr: [[10, 44, 19, 42], [60, 45, 70, 43], [30, 43, 36, 42]] };
}
function specCar(V) {
  var tico = V.kind === 'tico', wagon = V.kind === 'wagon', top = carTop(V.kind), belt = tico ? 19 : 20, bot = tico ? 27 : 28, gx = wagon ? 62 : (tico ? 49 : 63);
  var RWx = tico ? 11.5 : 13.5, FWx = tico ? 40.5 : (wagon ? 52.5 : 53.5), cy = tico ? 24.5 : 26.5, rad = tico ? 4.5 : 5, depth = tico ? 11 : 12;
  var clip = function (x, y) { return y > top(x) + 1; };
  var w1 = tico ? [14, 22] : [16, 30], w2 = tico ? [24, 36] : [33, 47];
  var wsX = wagon ? [39, 46] : (tico ? [32, 39] : [41, 48]);
  var wind = polyTop(top, depth, wsX[0], wsX[1]); wind.y1 = 24;
  var win = [{ x0: w1[0], y0: 12, x1: w1[1], y1: belt - 1, test: clip }];
  if (!(V.door && V.kind === 'sedan')) win.push({ x0: w2[0], y0: 12, x1: w2[1], y1: belt - 1, test: clip });
  win.push(wind);
  if (V.kind === 'sedan') { var rear = polyTop(top, 12, 15, 21); rear.y1 = 20; win.push(rear); }
  var rx = tico ? [5, 31] : (wagon ? [7, 38] : [22, 40]);
  return { wins: win, wind: wind, wind2: win[0], lamp: tico ? [47, 20, 49, 22] : [gx - 2, 22, gx, 24], bump: tico ? [46, 25, 50, 27] : [gx - 4, 26, gx + 1, 28], lampDx: 1, body: [1, 12, gx + 1, bot],
    hot: [gx - 4, 22, 11], wheels: [{ x: RWx, y: cy, r: rad, bot: bot }, { x: FWx, y: cy, r: rad, bot: bot }], roof: { x0: rx[0], x1: rx[1], y0: top(rx[0] + 3) - depth, y1: top(rx[0] + 3) - 1, sag: tico ? 2 : 3 },
    dents: [[Math.round(gx * 0.36), 23, 5, 3], [Math.round(gx * 0.66), 24, 4, 2], [Math.round(gx * 0.12), 23, 4, 3]], scr: [[Math.round(gx * 0.18), belt + 5, Math.round(gx * 0.18) + 7, belt + 3], [Math.round(gx * 0.45), belt + 6, Math.round(gx * 0.45) + 6, belt + 5], [Math.round(gx * 0.7), belt + 4, Math.round(gx * 0.7) + 7, belt + 3]] };
}
function specMoto() {
  var wind = { x0: 26, y0: 6, x1: 32, y1: 17, test: function (x, y) { var a = 26 + Math.round((y - 6) * 0.4); return x >= a && x <= a + 3; } };
  return { wins: [wind], wind: wind, lamp: [36, 12, 38, 14], bump: [33, 23, 41, 24], lampDx: 1, body: [2, 1, 41, 28], hot: [35, 18, 10],
    wheels: [{ x: 10.5, y: 27.5, r: 5, bot: 28 }, { x: 38.5, y: 27.5, r: 5, bot: 28 }], roof: { x0: 3, x1: 31, y0: 1, y1: 7, sag: 2 },
    dents: [[9, 22, 4, 2], [22, 23, 4, 2], [35, 19, 3, 2]], scr: [[4, 25, 10, 24], [16, 25, 24, 24]] };
}
function specCombiEnd(front) {
  if (front) return { wins: [{ x0: 4, y0: 48, x1: 23, y1: 59 }], wind: { x0: 4, y0: 48, x1: 23, y1: 59 }, lamp: [[3, 65, 8, 69], [19, 65, 24, 69]], lampDx: 0, bump: [1, 73, 26, 77], body: [1, 2, 26, 77], hot: [13, 66, 10],
    wheels: [{ end: [0, 68, 77, true] }, { end: [25, 68, 77, false] }], roof: { x0: 3, x1: 24, y0: 2, y1: 46, flat: true }, dents: [[8, 63, 5, 2], [19, 70, 3, 3], [12, 40, 4, 4]], scr: [[5, 62, 12, 64], [15, 68, 22, 66]] };
  return { wins: [{ x0: 5, y0: 61, x1: 22, y1: 65 }], wind: { x0: 5, y0: 61, x1: 22, y1: 65 }, lamp: [[2, 67, 4, 72], [23, 67, 25, 72]], lampDx: 0, bump: [1, 75, 26, 77], body: [1, 9, 26, 77], hot: [13, 70, 10],
    wheels: [{ end: [0, 69, 77, true] }, { end: [25, 69, 77, false] }], roof: { x0: 3, x1: 24, y0: 9, y1: 58, flat: true }, dents: [[8, 70, 4, 3], [20, 72, 3, 3], [12, 40, 4, 4]], scr: [[6, 68, 12, 70], [16, 70, 22, 69]] };
}
function specCarEnd() {
  var rear = { x0: 6, y0: 35, x1: 21, y1: 40 }, fw = { x0: 5, y0: 13, x1: 22, y1: 20 };
  return { wins: [rear, fw], wind: rear, wind2: fw, lamp: [[2, 51, 5, 55], [22, 51, 25, 55]], lampDx: 0, bump: [1, 58, 26, 62], body: [1, 0, 26, 62], hot: [13, 56, 10],
    wheels: [{ end: [0, 56, 62, true] }, { end: [25, 56, 62, false] }], roof: { x0: 5, x1: 22, y0: 21, y1: 33, flat: true }, dents: [[9, 46, 4, 3], [19, 56, 3, 3], [12, 26, 4, 4]], scr: [[6, 53, 12, 55], [15, 44, 21, 43]] };
}

/* ======================== REGISTRO ======================== */
var P = S.props = S.props || {};
P.combiE = [0, 1, 2].map(function (v) { return combiSide(v, 'E'); });
P.combiW = [0, 1, 2].map(function (v) { return combiSide(v, 'W'); });
P.custerE = custerSide('E'); P.custerW = custerSide('W');
P.carVar = [0, 1, 2].map(function (v) { return carSide(v, 'E', false); }); P.carVarW = [0, 1, 2].map(function (v) { return carSide(v, 'W', false); });
P.tico = [0, 1].map(function (v) { return carSide(v, 'E', true); }); P.ticoW = [0, 1].map(function (v) { return carSide(v, 'W', true); });
P.mototaxiVar = [0, 1, 2].map(function (v) { return motoSide(v, 'E'); }); P.mototaxiVarW = [0, 1, 2].map(function (v) { return motoSide(v, 'W'); });
P.mototaxi = motoSide(1, 'E');
P.trailer = [0, 1].map(function (v) { return trailerSide(v, 'E'); }); P.trailerW = [0, 1].map(function (v) { return trailerSide(v, 'W'); });
P.trailerLargo = trailerLargoSide('E'); P.trailerLargoW = trailerLargoSide('W');
P.contenedor = [0, 1, 2, 3].map(contenedorSide);
P.tracto = tractoSide('E', 0); P.tractoW = tractoSide('W', 0);
P.combiN = [0, 1, 2].map(function (v) { return combiEnd(v, false); }); P.combiS = [0, 1, 2].map(function (v) { return combiEnd(v, true); });
P.car = carEnd();
P.combi = volcada();
/* Estados de dano: .dmg = [c1, c2, c3] en cada vehiculo rompible (mismo tamano y ancla). */
function addDmg(arr, fn) { (Array.isArray(arr) ? arr : [arr]).forEach(function (c, i) { c.dmg = [1, 2, 3].map(function (l) { return fn(i, l); }); }); }
addDmg(P.combiE, function (i, l) { return combiSide(i, 'E', l); }); addDmg(P.combiW, function (i, l) { return combiSide(i, 'W', l); });
addDmg(P.custerE, function (i, l) { return custerSide('E', l); }); addDmg(P.custerW, function (i, l) { return custerSide('W', l); });
addDmg(P.carVar, function (i, l) { return carSide(i, 'E', false, l); }); addDmg(P.carVarW, function (i, l) { return carSide(i, 'W', false, l); });
addDmg(P.tico, function (i, l) { return carSide(i, 'E', true, l); }); addDmg(P.ticoW, function (i, l) { return carSide(i, 'W', true, l); });
addDmg(P.mototaxiVar, function (i, l) { return motoSide(i, 'E', l); }); addDmg(P.mototaxiVarW, function (i, l) { return motoSide(i, 'W', l); });
addDmg(P.mototaxi, function (i, l) { return motoSide(1, 'E', l); });
addDmg(P.combiN, function (i, l) { return combiEnd(i, false, l); }); addDmg(P.combiS, function (i, l) { return combiEnd(i, true, l); });
addDmg(P.car, function (i, l) { return carEnd(l); });
/* Red de seguridad de valor (revision de arte v0.4, #4): ningun pixel de vehiculo pasa de ~74/100 de luminosidad. Compresion suave por encima de 68,
   asi los brillos siguen siendo los brillos pero ningun vehiculo gana el contraste en grises frente a Alexander. Respeta ancla, huella y alfa. */
function softCap(c) {
  if (!c || !c.getContext) return;
  var t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
  var ctx = t.getContext('2d', { willReadFrequently: true }); ctx.drawImage(c, 0, 0);          // lienzo de lectura: evita el aviso de lecturas repetidas
  var im = ctx.getImageData(0, 0, c.width, c.height), d = im.data;
  for (var i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    var L = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 2.55;
    if (L <= 68) continue;
    var f = (68 + (L - 68) * 0.18) / L;
    d[i] = Math.round(d[i] * f); d[i + 1] = Math.round(d[i + 1] * f); d[i + 2] = Math.round(d[i + 2] * f);
  }
  ctx.putImageData(im, 0, 0);
  var cc = c.getContext('2d'); cc.clearRect(0, 0, c.width, c.height); cc.drawImage(t, 0, 0);
}
['combiE', 'combiW', 'combiN', 'combiS', 'combi', 'custerE', 'custerW', 'carVar', 'carVarW', 'tico', 'ticoW', 'mototaxiVar', 'mototaxiVarW', 'mototaxi',
 'trailer', 'trailerW', 'trailerLargo', 'trailerLargoW', 'contenedor', 'tracto', 'tractoW', 'car'].forEach(function (k) {
  var v = P[k]; (Array.isArray(v) ? v : [v]).forEach(function (c) { softCap(c); if (c.dmg) c.dmg.forEach(softCap); });
});
})();
