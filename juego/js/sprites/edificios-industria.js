/* ACHORADO - js/sprites/edificios-industria.js  (v0.4, fase B)
 * Dueño: sprites (industria)
 * Arquetipos de lote: almacen (con mural CALLAO y techo en arco), taller, loteObra, contenedores, oficina, fabrica.
 * Cada uno resuelve side:'N' (cara sur + azotea) y side:'S' (solo azotea con parapeto al norte).
 * Se carga despues de js/sprites.js y antes del motor. Usa ACH.px (base.js) y extiende ACH.sprites.
 * Registra: ACH.sprites.lotArch[arch] = function (ficha, px) -> {canvas, over, overX, overY, lights}.
 * Tambien ACH.sprites.lotTests[arch] = [fichas de prueba] para preview.html.
 * Luz: garua plana desde el noroeste; sombras al sureste (1 px a la derecha por cada 2 hacia abajo). Sin contorno negro en edificios.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px;
var S = ACH.sprites;
if (!px || !S || !S.lotArch) return;
var G = px.G, R = px.RAMPS, PAL = px.PAL, text = px.text, measure = px.measure, fontInfo = px.fontInfo, mixc = px.mix, rngf = px.rng;
var K = PAL.outline, SHADOWC = PAL.shadow;

/* ============================== HERRAMIENTAS ============================== */
var dkCache = {}, ltCache = {}, toCache = {};
function dk(c, t) { var m = dkCache[t] || (dkCache[t] = {}); return m[c] || (m[c] = mixc(c, SHADOWC, t)); }          // hacia el violeta de sombra
function lt(c, t) { var m = ltCache[t] || (ltCache[t] = {}); return m[c] || (m[c] = mixc(c, '#ffe9bf', t)); }        // hacia luz calida
function to(c, c2, t) { var k = c2 + t, m = toCache[k] || (toCache[k] = {}); return m[c] || (m[c] = mixc(c, c2, t)); }
function r5(r) { return r.length >= 5 ? r : [r[0], r[1], r[2], r[3], lt(r[3], 0.4)]; }
var BAY2 = [0, 2, 3, 1];
function bay(x, y) { return BAY2[((y & 1) << 1) | (x & 1)]; }                // 0..3, patron ordenado 2x2

function fill(g, x, y, w, h, c) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  var x0 = Math.max(0, x), x1 = Math.min(g.w, x + w), y0 = Math.max(0, y), y1 = Math.min(g.h, y + h);
  if (x1 <= x0) return;
  for (var j = y0; j < y1; j++) g.d.fill(c, j * g.w + x0, j * g.w + x1);
}
function hl(g, x, y, w, c) { fill(g, x, y, w, 1, c); }
function vl(g, x, y, h, c) { fill(g, x, y, 1, h, c); }
function pt(g, x, y, c) { g.set(x, y, c); }
/* trama ordenada: f = 0..1 de cobertura */
function dith(g, x, y, w, h, c, f) {
  var n = Math.round(f * 4); if (n <= 0) return;
  x = Math.round(x); y = Math.round(y);
  for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) if (n >= 4 || bay(x + i, y + j) < n) g.set(x + i, y + j, c);
}
/* oscurece / aclara lo que ya esta pintado (hacia violeta / hacia luz calida) */
function darken(g, x, y, w, h, t) {
  x = Math.round(x); y = Math.round(y);
  var x0 = Math.max(0, x), x1 = Math.min(g.w, x + w), y0 = Math.max(0, y), y1 = Math.min(g.h, y + h);
  for (var j = y0; j < y1; j++) for (var i = x0; i < x1; i++) { var c = g.d[j * g.w + i]; if (c) g.d[j * g.w + i] = dk(c, t); }
}
function lighten(g, x, y, w, h, t) {
  x = Math.round(x); y = Math.round(y);
  var x0 = Math.max(0, x), x1 = Math.min(g.w, x + w), y0 = Math.max(0, y), y1 = Math.min(g.h, y + h);
  for (var j = y0; j < y1; j++) for (var i = x0; i < x1; i++) { var c = g.d[j * g.w + i]; if (c) g.d[j * g.w + i] = lt(c, t); }
}
/* tinte tramado: lleva lo pintado hacia un color (humedad, oxido, mugre) con densidad f */
function stainTo(g, x, y, w, h, col, t, f) {
  x = Math.round(x); y = Math.round(y);
  var n = Math.round(f * 4);
  for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
    var X = x + i, Y = y + j, c = g.get(X, Y);
    if (c && (n >= 4 || bay(X, Y) < n)) g.set(X, Y, to(c, col, t));
  }
}
/* sombra proyectada al SE sobre lo ya pintado. yb = fila de la base; el objeto mide hgt de alto y w de ancho desde x */
function castShadow(g, x, yb, w, hgt, t) {
  var len = Math.max(1, Math.round(hgt * 0.5)), k;
  for (k = 0; k < len; k++) {
    var sx = x + (k >> 1) + (k > 0 ? 1 : 0), sw = w - (k > len - 3 ? Math.min(2, k - (len - 3)) : 0);
    darken(g, sx + 1, yb + k, sw, 1, t);
  }
}
function lerpPts(p, t) {
  if (t <= p[0][0]) return p[0][1];
  for (var i = 1; i < p.length; i++) if (t <= p[i][0]) { var a = p[i - 1], b = p[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
  return p[p.length - 1][1];
}
function pick(r, arr) { return arr[Math.floor(r() * arr.length) % arr.length]; }
function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }

/* ---- rampas propias (5 pasos, el matiz gira de violeta a calido) ---- */
var C = {
  gris:   r5(R.concrete),
  blanco: r5(R.blanco),
  ocre:   r5(R.ocre),
  verde:  r5(R.botella),
  oxido:  r5(R.rust),
  ladrillo: r5(R.brick),
  tierra: r5(R.dirt),
  metal:  r5(R.metal),
  azul:   ['#1d2a48', '#2f4470', '#4a6498', '#7a92c0', '#a9bbd9'],
  rojo:   ['#3e1a1c', '#6b2a28', '#8f3a32', '#b5584a', '#d88a74'],
  amarillo: ['#6b4f22', '#a88a3c', '#d2b24a', '#e6d27a', '#f3e8b0'],
  naranja: ['#5a2a22', '#9a4a2a', '#c9733a', '#e39a56', '#f3c68a'],
  rosado: r5(R.rosado),
  celeste: r5(R.celeste),
  menta: r5(R.menta),
  durazno: r5(R.durazno),
  sheet:  ['#4c4a58', '#6e6c73', '#908d89', '#b3ae9f', '#d3ccb6'],     // calamina gris-beige de los galpones
  fibra:  ['#4d6676', '#6f93a0', '#9cc0c4', '#c9dfd8', '#eaf2e4'],     // plancha translucida
  vidrio: ['#1c2530', '#2d3d4a', '#4d6676', '#8fb0b8', '#c9dfd8'],
  negro:  ['#16151c', '#24262f', '#363a46', '#505865', '#7e868a'],
  madera: r5(R.wood),
  veg:    r5(R.veg),
  arena:  ['#7a5a45', '#a5814f', '#c9a66b', '#e0c58d', '#f0dcae']
};
var RUST = R.rust;
function wallRampFor(name) {
  var m = { gris: 'gris', cemento: 'gris', concreto: 'gris', blanco: 'blanco', crema: 'blanco', ocre: 'ocre', verde: 'verde', oxido: 'oxido',
    ladrillo: 'ladrillo', rojo: 'rojo', azul: 'azul', tierra: 'tierra', celeste: 'celeste', menta: 'menta', durazno: 'durazno', rosado: 'rosado', salmon: 'durazno' };
  return C[m[name] || 'gris'];
}

/* ---- texto: elige fuente/escala/lineas para que quepa ---- */
function fitName(str, maxW, maxH, prefer) {
  str = (str || '').toUpperCase();
  if (!str) return null;
  var cands = prefer || [['a12', 1], ['a7', 2], ['a7', 1], ['a5', 2], ['a5', 1]];
  var words = str.split(' '), i, k;
  for (i = 0; i < cands.length; i++) {
    var f = cands[i][0], s = cands[i][1], inf = fontInfo(f, s), mark = /[ÁÉÍÓÚÜÑ]/.test(str) ? inf.top : 0;
    var lines = [str], best = [measure(str, f, s)];
    if (words.length > 1) {                       // mejor corte en dos lineas
      var bestW = 1e9, bl = null;
      for (k = 1; k < words.length; k++) {
        var a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
        var ww = Math.max(measure(a, f, s), measure(b, f, s));
        if (ww < bestW) { bestW = ww; bl = [a, b]; }
      }
      if (best[0] > maxW && bl) { lines = bl; best = [bestW]; }
    }
    var gap = Math.max(2, 2 * s), th = lines.length * inf.h + (lines.length - 1) * gap + mark;
    if (best[0] <= maxW && th <= maxH) return { font: f, scale: s, lines: lines, w: best[0], h: th, mark: mark, lh: inf.h + gap, rank: i };
  }
  return null;
}
/* escribe el resultado de fitName. (cx, y) = centro-arriba. aged: desgaste que muerde letras (solo a12) */
function putName(g, nm, cx, y, o) {
  o = o || {};
  for (var i = 0; i < nm.lines.length; i++) {
    var yy = y + nm.mark + i * nm.lh;
    if (o.aged) agedText(g, nm.lines[i], cx, yy, { font: nm.font, scale: nm.scale, ink: o.ink, ink2: o.ink2, fade: o.fade, r: o.r });
    else text(g, nm.lines[i], cx, yy, { font: nm.font, scale: nm.scale, ink: o.ink, shadow: o.shadow, outline: o.outline, align: 'c' });
  }
}
/* texto grande desteñido (a12): se pinta en una rejilla aparte y se copia mordiendo bordes y bajando un paso la tinta */
function agedText(g, str, cx, y, o) {
  var f = o.font || 'a12', s = o.scale || 1, inf0 = fontInfo(f, s), TOP = inf0.top, w = measure(str, f, s) + 4, h = inf0.h + 2 + TOP;
  var t = new G(w, h), r = o.r || Math.random, fade = o.fade === undefined ? 0.25 : o.fade;
  text(t, str, 1, TOP, { font: f, scale: s, ink: '#fff' });
  var x0 = Math.round(cx - (w - 4) / 2) - 1;
  for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
    if (!t.get(i, j)) continue;
    var bite = false;
    if (f === 'a12') {
      var edge = !t.get(i - 1, j) || !t.get(i + 1, j) || !t.get(i, j - 1) || !t.get(i, j + 1);
      bite = edge && r() < fade * 0.7;
      if (!bite && ((i * 5 + j * 3) % 13 === 0) && r() < fade) bite = true;
    }
    if (bite) continue;
    var c = (r() < fade * 0.8 && o.ink2) ? o.ink2 : o.ink;
    if (o.ribs && (x0 + i) % 3 === 2) c = o.ink2 || c;
    g.set(x0 + i, y + j - TOP, c);
  }
}

/* ---- piezas sueltas de uso comun ---- */
function bolt(g, x, y, c1, c2) { g.set(x, y, c1); g.set(x + 1, y, c2); g.set(x, y + 1, c2); g.set(x + 1, y + 1, dk(c2, 0.3)); }
/* chorrera de oxido que baja de un perno: pigmento mezclado con lo que haya debajo */
function rustDrip(g, x, y, len, r, strength) {
  var wob = 0;
  strength = strength || 1;
  for (var k = 0; k < len; k++) {
    var f = (1 - k / len) * strength;
    var c = g.get(x + wob, y + k);
    if (c) {
      var t = k < 2 ? 0.7 : 0.55 * f + 0.18;
      if (k > len * 0.55 && bay(x + wob, y + k) >= Math.round(f * 4)) { if (r() < 0.6) continue; }
      g.set(x + wob, y + k, to(c, k < 2 ? RUST[1] : RUST[2], Math.min(0.8, t)));
    }
    if (r() < 0.14) wob += r() < 0.5 ? -1 : 1;
  }
}
function wetDrip(g, x, y, len, t) {            // chorrera de agua/mugre (oscurece)
  for (var k = 0; k < len; k++) { var c = g.get(x, y + k); if (c && (k < len - 2 || bay(x, y + k) < 2)) g.set(x, y + k, dk(c, t * (1 - k / (len + 2)))); }
}
/* salitre: sube desde el suelo (altura h) con transicion tramada; yb = fila del suelo (exclusiva) */
function salitre(g, x, yb, w, h, r, col, t0) {
  for (var i = 0; i < w; i++) {
    var hh = h - 1 + Math.floor(r() * 3) - (i % 7 === 0 ? 2 : 0);
    for (var k = 0; k < hh; k++) {
      var y = yb - 1 - k, c = g.get(x + i, y);
      if (!c) continue;
      var f = 1 - k / hh, n = Math.round(f * 4);
      if (k < 2 || bay(x + i, y) < n) g.set(x + i, y, to(c, col, t0 * (0.45 + 0.55 * f)));
    }
  }
}
/* oclusion ambiental en la base del muro: 2 franjas */
function aoBase(g, x, yb, w) { darken(g, x, yb - 2, w, 2, 0.4); darken(g, x, yb - 4, w, 2, 0.16); }
function bevelBox(g, x, y, w, h, base, hi, lo) {
  fill(g, x, y, w, h, base); hl(g, x, y, w, hi); vl(g, x, y, h, hi); hl(g, x, y + h - 1, w, lo); vl(g, x + w - 1, y, h, lo);
}
/* tarrajeo caido: se ven los ladrillos */
function plasterLoss(g, x, y, w, h, wr, r) {
  var B = C.ladrillo;
  for (var j = 0; j < h; j++) {
    var ins = Math.floor(Math.sin((j + 1) / (h + 1) * Math.PI) * 3 * r() + (j % 3 === 0 ? 1 : 0));
    var l = x + (j < 2 || j > h - 3 ? ins + 1 : (r() < 0.3 ? 1 : 0)), rr = x + w - (j < 2 || j > h - 3 ? ins + 1 : (r() < 0.3 ? 1 : 0));
    for (var i = l; i < rr; i++) {
      var course = Math.floor((y + j) / 3) % 2, jointX = (i + (course ? 4 : 0)) % 8 === 0, jointY = (y + j) % 3 === 2;
      g.set(i, y + j, jointX || jointY ? B[1] : (r() < 0.2 ? B[3] : B[2]));
    }
    g.set(l - 1, y + j, wr[3]);
  }
  hl(g, x, y + h, w, dk(wr[2], 0.3));
}

/* ============================== AZOTEAS ============================== */
/* Parapeto norte: se ve su cara sur (3 px) y su coronacion (2 px). Parapetos laterales: 2 px. */
function parapetN(g, x0, w, wr, y0) {
  y0 = y0 || 0;
  hl(g, x0, y0, w, wr[4]); hl(g, x0, y0 + 1, w, wr[3]);
  fill(g, x0, y0 + 2, w, 3, wr[2]); hl(g, x0, y0 + 4, w, wr[1]);
  dith(g, x0, y0 + 5, w, 1, wr[0], 0.5);
}
function sideWalls(g, w, y0, y1, wr) {
  fill(g, 0, y0, 2, y1 - y0, wr[3]); vl(g, 0, y0, y1 - y0, wr[4]); vl(g, 1, y0, y1 - y0, wr[2]);
  fill(g, w - 2, y0, 2, y1 - y0, wr[1]); vl(g, w - 1, y0, y1 - y0, wr[0]);
}

/* ---- techo en arco: lamina curva con nervaduras, juntas, claraboyas y hongos ---- */
/* Valor a lo largo de la curva (norte t=0 -> sur t=1): perfil continuo cuantizado a medios pasos de la rampa (mezcla de 2 tonos vecinos), de modo
   que se lee como una sola curva con bandas limpias y sin tramado. La cresta queda un poco al norte (luz del noroeste); la caida hacia la camara es sombra.
   dL: costura de chapa (<0 junta oscura, >0 filo claro). */
var ARCH_PTS = [[0, 1.0], [0.06, 1.6], [0.26, 2.6], [0.40, 3.5], [0.50, 2.9], [0.68, 1.8], [0.88, 0.9], [1, 0.3]];
function archPix(ramp, x, y, t, rib, dL) {
  var L = lerpPts(ARCH_PTS, t) + (dL <= -0.5 ? -1 : (dL >= 0.45 ? 1 : 0));
  L = Math.max(0, Math.min(4, Math.round(L * 2) / 2));
  var lo = Math.floor(L);
  return L === lo ? ramp[lo] : to(ramp[lo], ramp[lo + 1], 0.5);
}
function turbine(g, cx, yb) {              // ventilador eolico (hongo) de acero
  var M = C.metal;
  castShadow(g, cx - 3, yb, 7, 9, 0.35);
  fill(g, cx - 1, yb - 3, 3, 3, M[1]);
  g.ell(cx, yb - 6, 3.6, 3, M[2]);
  for (var i = -3; i <= 3; i += 2) vl(g, cx + i, yb - 8, 4, M[1]);
  hl(g, cx - 2, yb - 9, 4, M[4]); pt(g, cx - 3, yb - 7, M[3]); pt(g, cx + 3, yb - 4, M[0]);
  hl(g, cx - 3, yb - 3, 7, M[0]);
}
function skylightV(g, x, y0, y1, w, ramp, o) {   // claraboya que cruza el arco (se curva con el techo)
  var ya = o.ya, yb = o.yb, bro = o.broken, r = o.r;
  var gl = bro ? C.vidrio : C.fibra;
  for (var xx = x; xx < x + w; xx++) for (var y = y0; y < y1; y++) {
    var t = (y - ya) / (yb - ya - 1), c;
    if (xx === x) c = lt(ramp[3], 0.1); else if (xx === x + w - 1) c = ramp[1];
    else c = archPix(gl, xx, y, t, true, 0.25);
    g.set(xx, y, c);
  }
  hl(g, x, y0, w, ramp[4]); hl(g, x, y1 - 1, w, ramp[0]);
  if (bro) { var cx = x + 2 + Math.floor(r() * (w - 4)), cy = y0 + 4 + Math.floor(r() * (y1 - y0 - 8)); g.line(cx, cy, cx + 3, cy + 4, C.vidrio[0]); g.line(cx + 1, cy + 2, cx - 2, cy + 5, C.vidrio[0]); }
  else { var sy = y0 + 3 + Math.floor(r() * 5); for (var k = 0; k < 5; k++) g.set(x + 1 + k % w, sy + k, C.fibra[4]); }
}
function roofArco(g, x0, y0, w, h, r, o) {
  o = o || {};
  var ramp = o.ramp || C.sheet, dmg = o.dmg || 1, wr = o.wr || C.gris;
  var ya = y0 + 5, yb = y0 + h - 3, x, y, i;
  var sheetW = 24 + ri(r, 0, 8), colD = [];
  var frames = o.frames || [];
  for (x = 0; x < w; x++) {
    var d = 0, sx = (x + 7) % sheetW;
    if (sx === 0) d -= 0.9; else if (sx === 1) d += 0.5;
    for (i = 0; i < frames.length; i++) { var f = frames[i]; if (x >= f && x < f + 3) d += (x === f ? -0.7 : x === f + 2 ? 0.5 : -0.15); }
    colD.push(d);
  }
  for (x = 0; x < w; x++) for (y = ya; y < yb; y++) g.set(x0 + x, y, archPix(ramp, x, y, (y - ya) / (yb - ya - 1), true, colD[x]));
  var nSheets = Math.ceil(w / sheetW);
  for (i = 0; i < nSheets; i++) {
    var rr = r(), sx0 = i * sheetW - 7 + 2, sw = sheetW - 2;
    if (rr < 0.18) { for (y = ya + 1; y < yb - 1; y++) for (x = Math.max(2, sx0); x < Math.min(w - 2, sx0 + sw); x++) { var c = g.get(x0 + x, y); if (c) g.set(x0 + x, y, lt(c, 0.1)); } }
    else if (rr < 0.18 + 0.12 * dmg) {
      var py = ya + ri(r, 18, 40), ph = ri(r, 10, 20), xa = Math.max(2, sx0), xb = Math.min(w - 2, sx0 + sw);
      for (y = py; y < Math.min(yb - 1, py + ph); y++) for (x = xa; x < xb; x++) { var cc = g.get(x0 + x, y); if (cc) g.set(x0 + x, y, to(cc, RUST[2], y === py || y === py + ph - 1 ? 0.22 : 0.4)); }
      rustDrip(g, x0 + xa + 2, py + ph - 1, ri(r, 5, 9), r, 0.8); rustDrip(g, x0 + xb - 4, py + ph - 1, ri(r, 4, 8), r, 0.8);
    }
  }
  for (x = 2; x < w - 2; x++) if (r() < 0.025 * dmg) rustDrip(g, x0 + x, yb - ri(r, 10, 22), ri(r, 6, 14), r, 0.7);
  stainTo(g, x0 + 2, yb - 5, w - 4, 5, RUST[1], 0.35, 0.5);
  var nb = frames.length ? frames.length + 1 : Math.max(1, Math.floor(w / 56));
  var skyAvoid = [], skyN = o.skyN === undefined ? nb : o.skyN, skyY1 = o.skyTo ? ya + Math.round(o.skyTo * (yb - ya)) : yb - 4;
  for (i = 0; i < nb && skyAvoid.length < skyN; i++) {
    var cxs = Math.round(((i + 0.5) / nb) * w), sxx;
    if (frames.length) { var lo = i === 0 ? 0 : frames[i - 1] + 3, hi = i === nb - 1 ? w : frames[i]; sxx = Math.round((lo + hi) / 2) - 4; } else sxx = cxs - 4;
    sxx -= sxx % 3;
    if (sxx < 4 || sxx + 9 > w - 4) continue;
    skylightV(g, x0 + sxx, ya + 7, skyY1, 9, ramp, { ya: ya, yb: yb, broken: dmg >= 3 && r() < 0.5, r: r });
    skyAvoid.push(sxx);
  }
  var crest = ya + Math.round(0.4 * (yb - ya)), nt = ri(r, 1, 2);
  for (i = 0; i < nt; i++) {
    var tx = 10 + Math.floor(r() * (w - 20)), bad = false;
    for (var k = 0; k < skyAvoid.length; k++) if (Math.abs(tx - skyAvoid[k] - 4) < 9) bad = true;
    if (!bad) turbine(g, x0 + tx, crest + 4);
  }
  parapetN(g, x0, w, wr, y0);
  hl(g, x0, ya, w, dk(ramp[0], 0.2));
  hl(g, x0, yb, w, ramp[1]); hl(g, x0, yb + 1, w, ramp[0]); hl(g, x0, yb + 2, w, dk(ramp[0], 0.35));
  if (o.ends !== false) sideWalls(g, w, y0, y0 + h, wr);
  return { ya: ya, yb: yb, crest: crest };
}

/* ---- techo a dos aguas de calamina ---- */
function roofGable(g, x0, y0, w, h, r, o) {
  o = o || {};
  var ramp = o.ramp || C.sheet, dmg = o.dmg || 1, wr = o.wr || C.gris;
  var ya = y0 + 5, yb = y0 + h - 3, ridge = ya + Math.round(0.4 * (yb - ya)), x, y, i;
  var sheetW = 20 + ri(r, 0, 6);
  for (y = ya; y < yb; y++) {
    var L = y < ridge ? 2.1 + 0.5 * (y - ya) / (ridge - ya) : 1.55 - 0.7 * (y - ridge) / (yb - ridge);
    for (x = 0; x < w; x++) {
      var Lx = L, m = x % 3; Lx += m === 0 ? 0.7 : (m === 2 ? -0.55 : 0);
      var sx = (x + 5) % sheetW; if (sx === 0) Lx -= 0.9; else if (sx === 1) Lx += 0.35;
      var lv = Math.floor(Lx), v = lv + (((Lx - lv) * 4 > bay(x, y)) ? 1 : 0);
      g.set(x0 + x, y, ramp[Math.max(0, Math.min(4, v))]);
    }
  }
  hl(g, x0, ridge, w, ramp[4]); hl(g, x0, ridge + 1, w, ramp[3]); hl(g, x0, ridge + 2, w, dk(ramp[1], 0.3));
  var rows = [ya + Math.round((ridge - ya) * 0.5), ridge + 8, ridge + 22, yb - 4];
  rows.forEach(function (yy) { if (yy > yb - 2) return; for (x = 3; x < w - 3; x += 6) { g.set(x0 + x, yy, ramp[0]); g.set(x0 + x, yy - 1, ramp[4]); if (r() < 0.25 * dmg && yy > ridge) rustDrip(g, x0 + x, yy + 1, ri(r, 4, 9), r, 0.6); } });
  var ns = Math.ceil(w / sheetW);
  for (i = 0; i < ns; i++) if (r() < 0.22 * dmg) {
    var sx0 = i * sheetW - 5 + 2, py = ridge + 3 + ri(r, 0, 12), ph = ri(r, 10, 22);
    for (y = py; y < Math.min(yb - 1, py + ph); y++) for (x = Math.max(2, sx0); x < Math.min(w - 2, sx0 + sheetW - 2); x++) { var cc = g.get(x0 + x, y); if (cc && bay(x, y) < 2) g.set(x0 + x, y, to(cc, RUST[2], 0.4)); }
  }
  var sk = o.skyN === undefined ? Math.max(1, Math.floor(w / 64)) : o.skyN;
  for (i = 0; i < sk; i++) {
    var cx = Math.round((i + 0.5) / sk * w), sxx = cx - cx % 3 - 6;
    if (sxx < 4 || sxx + 12 > w - 4) continue;
    var sy0 = ridge + 5, sy1 = o.skyTo ? ridge + 5 + Math.round(o.skyTo * (yb - ridge - 8)) : yb - 3;
    for (x = sxx; x < sxx + 12; x++) for (y = sy0; y < sy1; y++) {
      var Lg = 2.6 - 0.5 * (y - sy0) / (sy1 - sy0), mm = x % 3; Lg += mm === 0 ? 0.6 : (mm === 2 ? -0.5 : 0);
      var lg = Math.floor(Lg), vg = lg + (((Lg - lg) * 4 > bay(x, y)) ? 1 : 0);
      g.set(x0 + x, y, (dmg >= 3 && i === 1) ? C.vidrio[Math.max(0, Math.min(3, vg - 1))] : C.fibra[Math.max(0, Math.min(4, vg))]);
    }
    hl(g, x0 + sxx, sy0, 12, ramp[4]); hl(g, x0 + sxx, sy1 - 1, 12, ramp[0]); vl(g, x0 + sxx, sy0, sy1 - sy0, ramp[3]); vl(g, x0 + sxx + 11, sy0, sy1 - sy0, ramp[1]);
  }
  parapetN(g, x0, w, wr, y0);
  hl(g, x0, ya, w, dk(ramp[0], 0.2));
  hl(g, x0, yb, w, ramp[1]); hl(g, x0, yb + 1, w, ramp[0]); hl(g, x0, yb + 2, w, dk(ramp[0], 0.35));
  if (o.ends !== false) sideWalls(g, w, y0, y0 + h, wr);
  return { ya: ya, yb: yb, crest: ridge };
}

/* mancha irregular (radio modulado por ruido de baja frecuencia). f(x,y,d) -> color o null; d = distancia normalizada 0..1 */
function blob(g, cx, cy, rx, ry, r, fn) {
  var ph1 = r() * 6.28, ph2 = r() * 6.28, ph3 = r() * 6.28;
  for (var y = Math.floor(cy - ry - 2); y <= Math.ceil(cy + ry + 2); y++) for (var x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry, a = Math.atan2(dy, dx), rad = 1 + 0.18 * Math.sin(3 * a + ph1) + 0.1 * Math.sin(5 * a + ph2) + 0.07 * Math.sin(8 * a + ph3);
    var d = Math.sqrt(dx * dx + dy * dy) / rad;
    if (d <= 1) { var c = fn(x, y, d); if (c) g.set(x, y, c); }
  }
}
/* ---- losa plana de concreto: juntas, brea, charcos de garua, grietas, sumidero ---- */
function roofLosa(g, x0, y0, w, h, r, o) {
  o = o || {};
  var dmg = o.dmg || 1, wr = o.wr || C.gris, base = o.base || to(C.gris[1], wr[1], 0.18), hi = o.hi || to(C.gris[2], wr[2], 0.12), lo = o.lo || C.gris[0];
  var ya = y0 + 5, yb = y0 + h - 3, x, y, i, k;
  fill(g, x0, ya, w, yb - ya + 3, base);
  // campos de concreto de distinta edad (manchas grandes con borde tramado)
  var nf = 2 + Math.floor(w * h / 5000);
  for (i = 0; i < nf; i++) {
    var lighter = r() < 0.5, col = lighter ? to(base, hi, 0.55) : to(base, lo, 0.35);
    blob(g, x0 + 10 + r() * (w - 20), ya + 8 + r() * Math.max(1, yb - ya - 14), 14 + r() * 22, 8 + r() * 12, r, function (X, Y, d) { return (d < 0.78 || bay(X, Y) < Math.round((1 - d) * 18)) ? col : null; });
  }
  // juntas de colado: lineas finas y cortadas
  var jx = 12 + ri(r, 0, 12);
  for (x = jx; x < w - 4; x += 30 + ri(r, 0, 12)) { var yy = ya; while (yy < yb) { var ln = ri(r, 14, 40); if (r() < 0.75) vl(g, x0 + x, yy, Math.min(ln, yb - yy), to(base, lo, 0.45)); yy += ln + ri(r, 2, 6); } }
  var jy = ya + 16 + ri(r, 0, 10);
  for (y = jy; y < yb - 4; y += 28 + ri(r, 0, 10)) { var xx = 2; while (xx < w - 2) { var ln2 = ri(r, 16, 44); if (r() < 0.75) hl(g, x0 + xx, y, Math.min(ln2, w - 2 - xx), to(base, lo, 0.45)); xx += ln2 + ri(r, 2, 6); } }
  // parches de brea (manchas negras con filo claro) y reparaciones de mortero
  var n = ri(r, 2, 3) + dmg;
  for (i = 0; i < n; i++) {
    var cx = 10 + r() * (w - 20), cy = ya + 6 + r() * Math.max(1, yb - ya - 12), tar = r() < 0.6, rx = 5 + r() * 9, ry = 3 + r() * 5;
    blob(g, x0 + cx, cy, rx, ry, r, function (X, Y, d) {
      if (tar) return d > 0.85 ? '#454350' : (Y < cy - ry * 0.4 && d > 0.55 ? '#3a3743' : '#2e2b35');
      return d > 0.85 ? to(base, lo, 0.3) : (Y < cy - ry * 0.3 ? lt(hi, 0.25) : hi);
    });
  }
  // charcos de garua con reflejo de cielo
  var np = ri(r, 1, 2);
  for (i = 0; i < np; i++) {
    var pcx = 14 + r() * (w - 28), pcy = ya + 12 + r() * Math.max(1, yb - ya - 22), prx = 6 + r() * 8, pry = 3 + r() * 3;
    blob(g, x0 + pcx, pcy, prx + 1.5, pry + 1, r, function (X, Y, d) { return dk(base, 0.35); });
    blob(g, x0 + pcx, pcy, prx, pry, r, function (X, Y, d) { return Y > pcy + pry * 0.4 ? '#5d6a78' : (d < 0.5 && Y < pcy ? '#8d99a4' : '#6f7c8a'); });
    hl(g, x0 + pcx - prx * 0.5, Math.round(pcy - pry * 0.5), Math.round(prx * 0.9), '#b4bcc2'); pt(g, x0 + pcx + prx * 0.3, Math.round(pcy), '#c9d0d4');
  }
  // grietas con ramal
  var nc = ri(r, 1, 2) + (dmg > 1 ? 1 : 0);
  for (i = 0; i < nc; i++) {
    var gx = 6 + Math.floor(r() * (w - 12)), gy = ya + 4 + Math.floor(r() * Math.max(1, yb - ya - 18)), len = ri(r, 8, 18);
    for (k = 0; k < len; k++) { g.set(x0 + gx, gy + k, lo); if (k % 3 === 0) gx += r() < 0.5 ? -1 : 1; if (k % 5 === 2) g.set(x0 + gx + 1, gy + k, lt(lo, 0.1)); }
  }
  // sumidero y tubo de ventilacion
  if (w > 40) {
    var dx = 8 + Math.floor(r() * (w - 20)), dy = yb - 8; fill(g, x0 + dx, dy, 5, 3, lo); hl(g, x0 + dx - 1, dy - 1, 7, hi); vl(g, x0 + dx - 1, dy, 4, hi); hl(g, x0 + dx - 1, dy + 3, 7, dk(base, 0.3));
    var tx = 10 + Math.floor(r() * (w - 20)), ty = ya + 12 + Math.floor(r() * Math.max(1, yb - ya - 24));
    castShadow(g, tx - 2, ty, 5, 8, 0.3); fill(g, tx - 2, ty - 8, 5, 8, C.metal[2]); vl(g, tx - 2, ty - 8, 8, C.metal[3]); vl(g, tx + 2, ty - 8, 8, C.metal[0]); hl(g, tx - 3, ty - 9, 7, C.metal[4]); hl(g, tx - 2, ty - 8, 5, C.metal[0]);
  }
  // bordes: oclusion bajo el parapeto y a los lados (agua estancada, mugre)
  parapetN(g, x0, w, wr, y0);
  darken(g, x0 + 2, ya, w - 4, 2, 0.34); darken(g, x0 + 2, ya + 2, w - 4, 2, 0.16);
  darken(g, x0 + 2, ya, 2, yb - ya, 0.18); darken(g, x0 + w - 5, ya, 3, yb - ya, 0.14);
  dith(g, x0 + 2, ya + 4, w - 4, 1, dk(base, 0.2), 0.25);
  hl(g, x0, y0 + h - 3, w, wr[3]); hl(g, x0, y0 + h - 2, w, wr[4]); hl(g, x0, y0 + h - 1, w, wr[2]);
  if (o.ends !== false) sideWalls(g, w, y0, y0 + h, wr);
  return { ya: ya, yb: yb };
}

/* ---- dientes de sierra: bandas de vidrio (cara sur vertical) alternadas con la vertiente de calamina ---- */
function roofDientes(g, x0, y0, w, h, r, o) {
  o = o || {};
  var dmg = o.dmg || 1, wr = o.wr || C.ladrillo, ramp = o.ramp || C.sheet, P = o.period || 24;
  var ya = y0 + 6, yb = y0 + h - 3, x, y, i, ng = 7, teeth = [];
  for (y = ya; y < yb; y += P) teeth.push(y);
  teeth.forEach(function (ty, ti) {
    var yg = Math.min(yb, ty + P - ng), ye = Math.min(yb, ty + P);
    for (y = ty; y < yg; y++) for (x = 0; x < w; x++) {
      var L = 1.5 + 0.9 * (y - ty) / Math.max(1, yg - ty), m = x % 3; L += m === 0 ? 0.6 : (m === 2 ? -0.4 : 0);
      var lv = Math.floor(L), v = lv + (((L - lv) * 4 > bay(x, y)) ? 1 : 0);
      g.set(x0 + x, y, ramp[Math.max(0, Math.min(4, v))]);
    }
    hl(g, x0, yg - 1, w, ramp[4]);
    for (y = yg; y < ye; y++) {
      var gy = y - yg;
      for (x = 0; x < w; x++) {
        var mull = (x % 12 === 0), c = gy === 0 ? ramp[1] : gy === ng - 1 ? ramp[0] : (gy < 3 ? C.fibra[1] : C.vidrio[2]);
        if (!mull && gy > 0 && gy < ng - 1 && ((x + gy * 2) % 12 === 5 || (x + gy * 2) % 12 === 6)) c = C.vidrio[3];
        if (mull && gy > 0) c = ramp[0];
        g.set(x0 + x, y, c);
      }
    }
    var nb = Math.floor(w / 12);
    for (i = 0; i < nb; i++) if (r() < 0.12 * dmg) { var bx = i * 12 + 1; fill(g, x0 + bx, yg + 1, 11, ng - 2, r() < 0.5 ? '#1c2530' : ramp[2]); if (r() < 0.5) hl(g, x0 + bx, yg + 1, 11, ramp[1]); }
    if (ti < teeth.length - 1) darken(g, x0, ye, w, 1, 0.3);
    for (x = 3; x < w - 3; x += 5) if (r() < 0.14 * dmg) rustDrip(g, x0 + x, yg - ri(r, 3, 8), ri(r, 4, 8), r, 0.7);
  });
  var nt = ri(r, 1, 3);
  for (i = 0; i < nt; i++) turbine(g, x0 + 12 + Math.floor(r() * (w - 24)), ya + 14 + (r() < 0.5 ? P : 0));
  parapetN(g, x0, w, wr, y0);
  hl(g, x0, y0 + 5, w, dk(ramp[0], 0.2));
  hl(g, x0, yb, w, ramp[1]); hl(g, x0, yb + 1, w, ramp[0]); hl(g, x0, yb + 2, w, dk(ramp[0], 0.35));
  if (o.ends !== false) sideWalls(g, w, y0, y0 + h, wr);
  return { ya: ya, yb: yb };
}

/* ============================== OBJETOS DE AZOTEA ============================== */
function pTanque(g, cx, yb) {
  var N = C.negro;
  castShadow(g, cx - 8, yb, 16, 26, 0.34);
  fill(g, cx - 7, yb - 3, 14, 3, C.gris[2]); hl(g, cx - 7, yb - 3, 14, C.gris[3]); hl(g, cx - 7, yb - 1, 14, C.gris[1]);
  vl(g, cx - 1, yb - 3, 3, C.gris[1]);
  var tones = [3, 3, 2, 2, 2, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];
  for (var i = 0; i < 16; i++) fill(g, cx - 8 + i, yb - 22, 1, 19, N[tones[i]]);
  hl(g, cx - 8, yb - 9, 16, N[0]); hl(g, cx - 8, yb - 16, 16, N[0]); hl(g, cx - 8, yb - 8, 4, N[3]); hl(g, cx - 8, yb - 15, 4, N[3]);
  g.ell(cx - 0.5, yb - 22, 8.2, 3, N[2]); g.ell(cx - 1, yb - 23, 6.5, 1.8, N[3]);
  hl(g, cx - 5, yb - 25, 6, N[4]); fill(g, cx - 1, yb - 25, 3, 2, N[4]); pt(g, cx, yb - 26, N[4]);
  hl(g, cx - 8, yb - 3, 16, N[0]);
}
function pAntena(g, cx, yb) {
  var M = C.metal;
  castShadow(g, cx, yb, 1, 20, 0.3);
  vl(g, cx, yb - 22, 22, M[3]); [[22, 7], [17, 5], [12, 3]].forEach(function (a) { hl(g, cx - (a[1] >> 1), yb - a[0], a[1], M[4]); });
  hl(g, cx - 1, yb - 2, 3, C.gris[2]); fill(g, cx - 2, yb - 1, 5, 1, C.gris[1]);
  pt(g, cx, yb - 23, PAL.neonOrange);
}
function pBidones(g, cx, yb) {
  var A = C.azul;
  [[-5, 0], [4, -1]].forEach(function (d) {
    var bx = cx + d[0], by = yb + d[1];
    castShadow(g, bx - 4, by, 8, 10, 0.3);
    for (var i = 0; i < 8; i++) fill(g, bx - 4 + i, by - 9, 1, 9, A[[3, 2, 2, 2, 1, 1, 1, 0][i]]);
    hl(g, bx - 4, by - 3, 8, A[0]); hl(g, bx - 4, by - 7, 8, A[1]); hl(g, bx - 4, by - 6, 3, A[3]);
    g.ell(bx - 0.5, by - 9, 4, 1.6, A[3]); pt(g, bx + 1, by - 10, A[0]); pt(g, bx - 2, by - 9, A[1]);
  });
}
function pLadrillos(g, cx, yb) {
  var B = C.ladrillo;
  castShadow(g, cx - 7, yb, 14, 8, 0.3);
  fill(g, cx - 7, yb - 8, 14, 8, B[2]); hl(g, cx - 7, yb - 8, 14, B[4]); hl(g, cx - 7, yb - 7, 14, B[3]);
  for (var j = 0; j < 8; j += 2) { hl(g, cx - 7, yb - 6 + j, 14, B[1]); for (var i = (j % 4 ? 2 : 5); i < 14; i += 6) pt(g, cx - 7 + i, yb - 7 + j, B[1]); }
  hl(g, cx - 7, yb - 1, 14, B[0]);
  fill(g, cx + 6, yb - 6, 5, 6, C.gris[3]); hl(g, cx + 6, yb - 6, 5, C.gris[4]); vl(g, cx + 10, yb - 6, 6, C.gris[1]);
}
function pFierros(g, cx, yb) {
  castShadow(g, cx - 6, yb, 12, 17, 0.28);
  fill(g, cx - 6, yb - 5, 12, 5, C.gris[2]); hl(g, cx - 6, yb - 5, 12, C.gris[3]); hl(g, cx - 6, yb - 1, 12, C.gris[0]);
  for (var i = 0; i < 5; i++) {
    var x = cx - 5 + i * 2 + (i === 4 ? 1 : 0), hh = 11 + ((i * 5) % 4);
    vl(g, x, yb - 5 - hh, hh, i % 2 ? RUST[2] : RUST[3]);
    if (i === 1 || i === 3) { fill(g, x - 1, yb - 8 - hh, 3, 4, i === 1 ? '#5a8f80' : '#cfd3cc'); pt(g, x, yb - 9 - hh, i === 1 ? '#3f7266' : '#a4abaa'); }
  }
}
function pLlantas(g, cx, yb, n) {
  var N = C.negro; n = n || 3;
  castShadow(g, cx - 6, yb, 12, 4 * n + 3, 0.32);
  for (var t = 0; t < n; t++) {
    var y0 = yb - 4 * (t + 1);
    fill(g, cx - 6, y0, 12, 4, N[1]); hl(g, cx - 6, y0, 12, N[3]); vl(g, cx - 6, y0, 4, N[2]); hl(g, cx - 6, y0 + 3, 12, N[0]);
    for (var k = 1; k < 12; k += 3) pt(g, cx - 6 + k, y0 + 2, N[0]);
  }
  var ty = yb - 4 * n;
  g.ell(cx - 0.5, ty, 6, 2.6, N[2]); g.ell(cx - 0.5, ty, 2.6, 1, N[0]); hl(g, cx - 5, ty - 2, 6, N[4]); pt(g, cx + 1, ty + 1, N[3]);
}
function pCilindro(g, cx, yb, col) {
  var A = col || C.azul;
  castShadow(g, cx - 4, yb, 9, 12, 0.3);
  for (var i = 0; i < 9; i++) fill(g, cx - 4 + i, yb - 11, 1, 11, A[[3, 3, 2, 2, 2, 1, 1, 0, 0][i]]);
  hl(g, cx - 4, yb - 8, 9, A[1]); hl(g, cx - 4, yb - 4, 9, A[1]); hl(g, cx - 4, yb - 7, 4, A[4]); hl(g, cx - 4, yb - 3, 4, A[4]);
  g.ell(cx, yb - 11, 4.4, 1.8, A[3]); g.ell(cx + 0.5, yb - 11, 2.2, 0.9, A[0]); pt(g, cx - 3, yb - 12, A[4]);
}
function pClaraboya(g, cx, yb) {
  castShadow(g, cx - 7, yb, 14, 7, 0.3);
  var F = C.fibra;
  fill(g, cx - 7, yb - 8, 14, 8, F[2]); hl(g, cx - 7, yb - 8, 14, F[4]); fill(g, cx - 6, yb - 7, 12, 4, F[3]);
  for (var i = 0; i < 12; i += 3) vl(g, cx - 6 + i, yb - 7, 6, F[1]);
  pt(g, cx - 5, yb - 6, F[4]); hl(g, cx - 7, yb - 2, 14, C.metal[1]); hl(g, cx - 7, yb - 1, 14, C.metal[0]); vl(g, cx - 7, yb - 8, 8, C.metal[3]); vl(g, cx + 6, yb - 8, 8, C.metal[0]);
}
var PROPS = {
  tanque: { w: 18, h: 27, fn: pTanque }, antena: { w: 7, h: 24, fn: pAntena }, bidones: { w: 20, h: 12, fn: pBidones },
  ladrillos: { w: 22, h: 10, fn: pLadrillos }, fierros: { w: 14, h: 22, fn: pFierros },
  llantas: { w: 14, h: 18, fn: function (g, cx, yb, r) { pLlantas(g, cx, yb, 3 + (r() < 0.5 ? 1 : 0)); } },
  cilindro: { w: 11, h: 14, fn: function (g, cx, yb, r) { pCilindro(g, cx, yb, r() < 0.5 ? C.azul : C.oxido); } },
  claraboyas: { w: 16, h: 10, fn: pClaraboya }
};
/* coloca objetos de azotea sin que se pisen. rect = zona util; avoid = rectangulos ocupados [x,y,w,h]. */
function placeProps(g, names, rect, r, avoid, extra) {
  var taken = (avoid || []).slice(), out = [];
  names.forEach(function (nm) {
    var P = PROPS[nm]; if (!P) return;
    for (var tries = 0; tries < 16; tries++) {
      var cx = rect.x + P.w / 2 + 3 + Math.floor(r() * Math.max(1, rect.w - P.w - 6)), yb = rect.y + P.h + 2 + Math.floor(r() * Math.max(1, rect.h - P.h - 4));
      var bb = [cx - P.w / 2 - 1, yb - P.h, P.w + 2, P.h + 6], ok = true;
      for (var k = 0; k < taken.length; k++) { var t = taken[k]; if (bb[0] < t[0] + t[2] && bb[0] + bb[2] > t[0] && bb[1] < t[1] + t[3] && bb[1] + bb[3] > t[1]) { ok = false; break; } }
      if (ok) { P.fn(g, Math.round(cx), Math.round(yb), r); taken.push(bb); out.push(bb); break; }
    }
  });
  /* piezas extra del roofKit compartido (edificios-casas.js, fn(g, x, y, o) con x,y = centro-base): la azotea no queda pelada */
  var RK = ACH.px && ACH.px.roofKit;
  if (extra && RK && rect.h >= 36 && rect.w >= 50) {
    var pool = ['dog', 'plants', 'chair', 'bricks', 'cement', 'tires', 'sand', 'gas', 'planks', 'barrel', 'table', 'clothesline'], used = {}, n = extra;
    for (var g2 = 0; g2 < 30 && n > 0; g2++) {
      var key = pick(r, pool); if (used[key] || !RK[key] || !RK.size[key]) continue; used[key] = 1;
      var sz = RK.size[key], w2 = sz[0], h2 = sz[1];
      for (var t2 = 0; t2 < 20; t2++) {
        var x2 = rect.x + (w2 >> 1) + 4 + Math.floor(r() * Math.max(1, rect.w - w2 - 8)), y2 = rect.y + h2 + 2 + Math.floor(r() * Math.max(1, rect.h - h2 - 4));
        var bb2 = [x2 - (w2 >> 1) - 2, y2 - h2 - 1, w2 + 4, h2 + 8], ok2 = true;
        for (var k2 = 0; k2 < taken.length; k2++) { var t3 = taken[k2]; if (bb2[0] < t3[0] + t3[2] && bb2[0] + bb2[2] > t3[0] && bb2[1] < t3[1] + t3[3] && bb2[1] + bb2[3] > t3[1]) { ok2 = false; break; } }
        if (ok2) { RK[key](g, x2, y2, { rnd: r, w: key === 'clothesline' ? Math.min(40, rect.w - 20) : undefined }); taken.push(bb2); out.push(bb2); n--; break; }
      }
    }
  }
  return out;
}
function wallBlock(g, x0, y0, w, h, wr, r, o) {
  o = o || {};
  var pos = o.pos || [], i, x, y;
  fill(g, x0, y0, w, h, wr[2]);
  var edges = [0], ends = [];
  pos.forEach(function (p) { ends.push(p); edges.push(p + 6); });
  ends.push(w);
  for (i = 0; i < edges.length; i++) {
    var rr = r(), tn = rr < 0.5 ? wr[2] : (rr < 0.78 ? to(wr[2], wr[3], 0.42) : to(wr[2], wr[1], 0.3));
    fill(g, x0 + edges[i], y0, ends[i] - edges[i], h, tn);
    // juntas de bloqueta cada 8 px, cortadas a trozos
    for (y = y0 + 6 + (i % 2) * 3; y < y0 + h - 6; y += 8) {
      var xs = edges[i];
      while (xs < ends[i]) { var ln = ri(r, 10, 30); if (r() < 0.7) hl(g, x0 + xs, y, Math.min(ln, ends[i] - xs), to(tn, wr[1], 0.28)); xs += ln + ri(r, 2, 8); }
    }
    // parches repintados con filo
    var np = ri(r, 0, 2) + (o.dmg > 1 ? 1 : 0);
    for (var k = 0; k < np; k++) {
      var pw = ri(r, 12, 26), ph = ri(r, 8, 16), bw = ends[i] - edges[i];
      if (bw < pw + 6) continue;
      var pxx = edges[i] + 3 + Math.floor(r() * (bw - pw - 6)), pyy = y0 + 8 + Math.floor(r() * Math.max(1, h - ph - 20));
      var pc = r() < 0.5 ? to(tn, wr[3], 0.38) : to(tn, wr[1], 0.28);
      fill(g, x0 + pxx, pyy, pw, ph, pc); hl(g, x0 + pxx, pyy, pw, lt(pc, 0.15)); hl(g, x0 + pxx, pyy + ph - 1, pw, dk(pc, 0.18));
    }
    // junta de dilatacion en medio del tramo ancho
    if (ends[i] - edges[i] > 50) { var jx = Math.round((edges[i] + ends[i]) / 2); vl(g, x0 + jx, y0 + 4, h - 10, dk(tn, 0.3)); vl(g, x0 + jx + 1, y0 + 4, h - 10, lt(tn, 0.12)); }
  }
  pos.forEach(function (p) {
    fill(g, x0 + p, y0, 6, h, to(wr[2], wr[3], 0.3)); vl(g, x0 + p, y0, h, wr[3]); vl(g, x0 + p + 1, y0, h, lt(wr[3], 0.1)); vl(g, x0 + p + 5, y0, h, wr[1]);
    darken(g, x0 + p + 6, y0, 2, h, 0.13);                                       // sombra de la cuaderna sobre el muro (SE)
    hl(g, x0 + p - 1, y0, 8, wr[4]);
  });
}
function coping(g, x0, y, w, wr) {              // cornisa de remate de muro: filo claro arriba, cara y sombra
  hl(g, x0, y, w, wr[4]); hl(g, x0, y + 1, w, wr[3]); hl(g, x0, y + 2, w, wr[2]); hl(g, x0, y + 3, w, wr[1]);
  darken(g, x0, y + 4, w, 1, 0.22); dith(g, x0, y + 5, w, 1, dk(wr[2], 0.3), 0.5);
}
function razor(g, x0, w, yb, r) {               // alambre de puas en espiral sobre el muro
  var M = C.metal;
  for (var x = x0 + 1; x < x0 + w - 4; x += 3) {
    pt(g, x + 1, yb - 5, M[4]); pt(g, x + 2, yb - 5, M[3]);
    pt(g, x, yb - 4, M[3]); pt(g, x + 3, yb - 4, M[2]);
    pt(g, x, yb - 3, M[2]); pt(g, x + 3, yb - 3, M[1]);
    pt(g, x + 1, yb - 2, M[1]); pt(g, x + 2, yb - 2, M[0]);
    if (r() < 0.2) pt(g, x + 1, yb - 4, M[4]);
  }
  hl(g, x0, yb - 1, w, dk(M[1], 0.3)); dith(g, x0, yb, w, 1, M[0], 0.5);
  for (x = x0 + 10; x < x0 + w - 6; x += 24) { vl(g, x, yb - 6, 6, M[1]); pt(g, x, yb - 7, M[3]); }       // postes en Y
}
function floodlight(g, x, y, lights, r) {
  var M = C.metal;
  hl(g, x, y, 5, M[1]); hl(g, x, y - 1, 5, M[3]); vl(g, x, y - 1, 4, M[2]);                // brazo
  fill(g, x + 3, y + 1, 7, 4, M[3]); hl(g, x + 3, y + 1, 7, M[4]); hl(g, x + 3, y + 4, 7, M[0]); hl(g, x + 4, y + 5, 5, '#fff2c0'); pt(g, x + 3, y + 5, PAL.lamp); pt(g, x + 9, y + 5, PAL.lamp);
  // brillo calido sobre el muro, tramado
  for (var k = 0; k < 16; k++) { var wdt = 8 + k; var f = 0.2 * (1 - k / 17); var tn = Math.round(f * 20); if (tn <= 0) continue;
    for (var i = 0; i < wdt; i++) { var X = x + 6 - (wdt >> 1) + i, Y = y + 6 + k, c = g.get(X, Y); if (c && bay(X, Y) < Math.min(3, Math.ceil(f * 8))) g.set(X, Y, lt(c, 0.2)); } }
  rustDrip(g, x + 1, y + 4, ri(r, 7, 12), r, 1);
  lights.push({ x: x + 6, y: y + 5, kind: 'foco' });
}
/* porton corredizo 80x56 sobre riel */
function slidingGate(g, x, yb, w, h, col, r, dmg, openPx) {
  var M = C.metal, y0 = yb - h, i, j;
  var pw = w - 8, px0 = x + 4, py0 = y0 + 4, ph = h - 8;
  fill(g, x, y0, w, h, M[0]);
  // postes del marco (acero), con luz a la izquierda
  fill(g, x, y0, 4, h, M[2]); vl(g, x, y0, h, M[3]); vl(g, x + 3, y0, h, M[1]);
  fill(g, x + w - 4, y0, 4, h, M[2]); vl(g, x + w - 4, y0, h, M[3]); vl(g, x + w - 1, y0, h, M[1]);
  // hoja ondulada (nervaduras cada 3 px)
  var tn = [col[3], col[2], col[1]];
  for (i = 0; i < pw; i++) fill(g, px0 + i, py0, 1, ph, tn[i % 3]);
  // rieles horizontales
  [Math.round(ph * 0.34), Math.round(ph * 0.68)].forEach(function (ry) {
    fill(g, px0, py0 + ry, pw, 3, col[2]); hl(g, px0, py0 + ry, pw, col[4]); hl(g, px0, py0 + ry + 2, pw, col[0]);
    for (var bx = px0 + 4; bx < px0 + pw - 3; bx += 8) { bolt(g, bx, py0 + ry, col[4], col[1]); if (r() < 0.3 * dmg + 0.2) rustDrip(g, bx, py0 + ry + 2, ri(r, 5, 10), r, 0.9); }
  });
  // viga superior (riel) y ruedas
  fill(g, x, y0, w, 4, M[2]); hl(g, x, y0, w, M[4]); hl(g, x, y0 + 1, w, M[3]); hl(g, x, y0 + 3, w, M[0]);
  for (i = 0; i < 2; i++) { var wx = x + 8 + i * (w - 24); fill(g, wx, y0 + 4, 5, 3, M[0]); pt(g, wx + 1, y0 + 4, M[3]); }
  // zocalo del porton y riel de piso
  fill(g, px0, yb - 4, pw, 4, M[1]); hl(g, px0, yb - 4, pw, M[3]); hl(g, px0, yb - 1, pw, M[0]);
  darken(g, x + 4, yb - 8, pw, 4, 0.18);
  // hoja entreabierta: se ve el interior oscuro (patio) con pallets en silueta
  if (openPx > 0) {
    var ox = px0 + pw - openPx;
    fill(g, ox, py0, openPx, ph, '#1c1a22');
    for (j = 0; j < ph; j++) { var tj = j / ph; if (tj > 0.55) for (i = 0; i < openPx; i++) if (bay(ox + i, py0 + j) < Math.round((tj - 0.55) * 8)) g.set(ox + i, py0 + j, '#2d2a36'); }
    fill(g, ox + 2, yb - 17, 7, 9, '#33353d'); hl(g, ox + 2, yb - 17, 7, '#44474d'); fill(g, ox + 10, yb - 13, 5, 5, '#2b2d36');
    vl(g, ox - 1, py0, ph, col[0]); vl(g, ox, py0, ph, col[3]);                      // canto de la hoja
  }
  // cadena y candado
  var cx = x + Math.round(w * 0.5);
  vl(g, cx, py0 + Math.round(ph * 0.45), 8, M[3]); fill(g, cx - 2, py0 + Math.round(ph * 0.45) + 6, 5, 5, '#c9a66b'); hl(g, cx - 2, py0 + Math.round(ph * 0.45) + 6, 5, '#e0c58d'); hl(g, cx - 2, py0 + Math.round(ph * 0.45) + 10, 5, '#7a5a45');
  // golpes y desgaste
  for (i = 0; i < 2 + dmg * 2; i++) { var sx = px0 + 3 + Math.floor(r() * (pw - 8)), sy = py0 + 6 + Math.floor(r() * (ph - 14)); hl(g, sx, sy, ri(r, 2, 5), col[4]); hl(g, sx + 1, sy + 1, ri(r, 2, 4), col[0]); }
  stainTo(g, px0, yb - 12, pw, 8, RUST[2], 0.45, 0.5);
  darken(g, x + w, y0 + 2, 2, h - 2, 0.22);
}
/* garita de vigilante 16x34 */
function guardBooth(g, x, yb, tint, r, lights) {
  var W_ = C.gris, T = tint, y0 = yb - 34;
  castShadow(g, x, yb - 1, 16, 14, 0.2);
  // techo plano con alero: cara superior (clara) + canto
  fill(g, x - 1, y0, 18, 3, W_[3]); hl(g, x - 1, y0, 18, W_[4]); hl(g, x - 1, y0 + 2, 18, W_[1]); darken(g, x, y0 + 3, 16, 2, 0.35);
  // paredes
  fill(g, x, y0 + 3, 16, 27, T[2]); vl(g, x, y0 + 3, 27, T[3]); vl(g, x + 15, y0 + 3, 27, T[1]);
  // ventanal
  fill(g, x + 2, y0 + 8, 12, 11, T[0]); fill(g, x + 3, y0 + 9, 10, 9, C.vidrio[2]); fill(g, x + 3, y0 + 9, 10, 3, C.vidrio[3]);
  for (var k = 0; k < 5; k++) pt(g, x + 4 + k * 2, y0 + 10 + k % 2, C.vidrio[4]);
  fill(g, x + 5, y0 + 14, 5, 4, '#2d3d4a'); fill(g, x + 6, y0 + 12, 3, 2, '#2d3d4a');   // silueta de un vigilante dormido: el sombrero y los hombros
  hl(g, x + 2, y0 + 19, 12, T[4]); hl(g, x + 2, y0 + 20, 12, T[1]);                      // alfeizar
  // puerta baja con manija
  fill(g, x + 3, y0 + 22, 10, 8, T[1]); hl(g, x + 3, y0 + 22, 10, T[0]); pt(g, x + 11, y0 + 26, PAL.sign);
  fill(g, x, yb - 4, 16, 4, W_[1]); hl(g, x, yb - 4, 16, W_[2]); hl(g, x, yb - 1, 16, W_[0]);
  // foco encima de la puerta
  pt(g, x + 8, y0 + 5, PAL.lamp); pt(g, x + 7, y0 + 5, '#fff2c0');
  lights.push({ x: x + 8, y: y0 + 14, w: 10, h: 9, kind: 'local' });
}
function cono(g, x, yb) {                       // cono de transito
  fill(g, x - 3, yb - 2, 7, 2, '#1c1a22'); fill(g, x - 2, yb - 3, 5, 1, '#c9733a');
  fill(g, x - 2, yb - 5, 5, 2, '#e39a56'); fill(g, x - 1, yb - 7, 3, 2, '#c9733a'); hl(g, x - 2, yb - 5, 5, '#f3efe2'); pt(g, x, yb - 8, '#c9733a');
  pt(g, x - 1, yb - 6, '#f3c68a');
}
function placaTexto(g, x, y, w, str, bg, ink, edge) {   // chapa esmaltada con texto a5
  fill(g, x, y, w, 9, bg); hl(g, x, y, w, lt(bg, 0.25)); hl(g, x, y + 8, w, edge); vl(g, x + w - 1, y, 9, edge);
  text(g, str, x + Math.floor(w / 2), y + 2, { font: 'a5', ink: ink, align: 'c' });
  pt(g, x + 1, y + 1, edge); pt(g, x + w - 3, y + 1, edge);
}

/* ============================== MURAL CALLAO ============================== */
function graffText(g, str, cx, y, o) {
  var f = 'a12', sc = 2, w0 = measure(str, f, sc), h0 = 24, pad = 5;
  var tmp = new G(w0 + pad * 2, h0 + pad * 2);
  text(tmp, str, pad, pad, { font: f, scale: sc, ink: '#fff' });
  var m = function (i, j) { return !!tmp.get(i, j); };
  var x0 = Math.round(cx - w0 / 2) - pad, i, j, dx, dy;
  var OUT = '#2a1f26', SH = '#150f18', P = R.rosado;
  for (j = 0; j < tmp.h; j++) for (i = 0; i < tmp.w; i++) {                      // sombra proyectada 2 px y contorno de 2 px
    var near = false, ink = m(i, j);
    if (!ink) for (dy = -2; dy <= 2 && !near; dy++) for (dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 3 && m(i + dx, j + dy)) { near = true; break; }
    if (near) g.set(x0 + i, y + j - pad, OUT);
  }
  for (j = 0; j < tmp.h; j++) for (i = 0; i < tmp.w; i++) {
    if (m(i, j)) continue;
    var sh = false;
    for (dy = -2; dy <= 2 && !sh; dy++) for (dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 3 && m(i - 2 + dx, j - 2 + dy)) { sh = true; break; }
    if (sh && !g.get(x0 + i, y + j - pad) || (sh && g.get(x0 + i, y + j - pad) && g.get(x0 + i, y + j - pad) !== OUT && g.get(x0 + i, y + j - pad) !== P[2])) g.set(x0 + i, y + j - pad, SH);
  }
  for (j = 0; j < tmp.h; j++) for (i = 0; i < tmp.w; i++) {
    if (!m(i, j)) continue;
    var c = P[2];
    if (!m(i, j - 1) || !m(i - 1, j)) c = P[4];
    else if (!m(i, j - 2) && !m(i - 1, j - 1) || !m(i - 2, j) && m(i - 1, j - 1) === false) c = P[3];
    else if (!m(i, j + 1) || !m(i + 1, j)) c = P[1];
    else if (!m(i, j + 2) || !m(i + 2, j)) c = to(P[2], P[1], 0.5);
    g.set(x0 + i, y + j - pad, c);
  }
  // chorreras de pintura bajo las letras: cortas (3-4 px) y solo desde la mitad IZQUIERDA de cada letra, para no romper el cierre de la O y la A
  var drips = o.drips || 4, cells = [];
  for (var li = 0; li < str.length; li++) cells.push([measure(str.slice(0, li), f, sc), measure(str.slice(0, li + 1), f, sc)]);
  for (var k = 0; k < drips; k++) {
    var tries = 0, ix, iy, okc;
    do {
      ix = Math.floor(o.r() * tmp.w); iy = pad + h0 - 5 + Math.floor(o.r() * 4); tries++;
      okc = false; var rx = ix - pad;
      for (li = 0; li < cells.length; li++) if (rx >= cells[li][0] && rx < cells[li][0] + (cells[li][1] - cells[li][0]) * 0.45) okc = true;
    } while (tries < 60 && !(okc && m(ix, iy) && !m(ix, iy + 1)));
    if (tries >= 60) continue;
    var ln = ri(o.r, 3, 4);
    for (var q = 1; q <= ln; q++) { g.set(x0 + ix, y + iy - pad + q, q === ln ? P[1] : P[2]); }
  }
  return { x0: x0 + pad, w: w0 };
}
function gull(g, x, y, big) {
  var rows = big ? ['.###.....###.', '#...##.##...#', '.....###.....'] : ['.##...##.', '#..###..#', '....#....'];
  for (var j = 0; j < rows.length; j++) for (var i = 0; i < rows[j].length; i++) if (rows[j][i] === '#') g.set(x + i, y + j, j === 0 ? '#e2dfd2' : (j === 1 ? '#c9c5b5' : '#a8a59c'));
}
function muralCallao(g, x, y, w, h, r) {
  var A = C.azul, i, j;
  // cielo nocturno pintado: degradado vertical tramado
  for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
    var L = 0.25 + 2.35 * (j / (h - 1)), lv = Math.floor(L), v = lv + (((L - lv) * 4 > bay(i, j)) ? 1 : 0);
    g.set(x + i, y + j, A[Math.min(3, v)]);
  }
  // estrellas y luna
  for (i = 0; i < 16; i++) { var sx = 4 + Math.floor(r() * (w - 8)), sy = 2 + Math.floor(r() * 14); g.set(x + sx, y + sy, i % 5 === 0 ? '#dbe6da' : A[3]); }
  var mx = x + w - 20, my = y + 6;
  g.disc(mx, my + 3, 4.2, '#e8e0c4'); g.disc(mx + 2, my + 2, 3.6, A[0]); g.set(mx - 2, my + 2, '#f3efe2');
  // olas: tres capas con espuma
  var layers = [[h - 16, A[2], 6.5, 0.0], [h - 11, A[3], 5.5, 1.7], [h - 6, A[1], 7.5, 3.1]];
  layers.forEach(function (l, li) {
    for (i = 0; i < w; i++) {
      var yw = l[0] + Math.round(2.2 * Math.sin(i / l[2] + l[3])), topy = y + yw;
      for (j = yw; j < h; j++) g.set(x + i, y + j, l[1]);
      g.set(x + i, topy, li === 1 ? '#dbe6da' : A[4]);
      if (Math.sin(i / l[2] + l[3]) > 0.8) { g.set(x + i, topy - 1, '#dbe6da'); g.set(x + i + 1, topy, '#dbe6da'); }
    }
  });
  gull(g, x + 8, y + 4, true); gull(g, x + 24, y + 11, false); gull(g, x + w - 38, y + 5, false);
  // letras
  var gt = graffText(g, 'CALLAO', x + w / 2, y + 11, { r: r, drips: 5 });
  // borde pintado a mano, descascarado en las esquinas
  hl(g, x, y, w, A[0]); hl(g, x, y + h - 1, w, A[0]); vl(g, x, y, h, A[0]); vl(g, x + w - 1, y, h, A[0]);
  hl(g, x + 1, y + 1, w - 2, A[2]); vl(g, x + 1, y + 1, h - 2, A[2]);
  for (i = 0; i < 12; i++) { var ex = Math.floor(r() * w), ey = r() < 0.5 ? 0 : h - 1; g.set(x + ex, y + ey, null); }
  return gt;
}

/* ============================== ALMACEN ============================== */
function dimsOf(f) { return { W: (f.c1 - f.c0 + 1) * 16, H: (f.r1 - f.r0 + 1) * 16 }; }
function outOf(g, lights, over, ox, oy) { return { canvas: g.toCanvas(), over: over || null, overX: ox || 0, overY: oy || 0, lights: lights || [] }; }
function lumOf(c) { var v = px.hex2rgb(c); return 0.3 * v[0] + 0.59 * v[1] + 0.11 * v[2]; }
function roofNames(f, pool, r, n) {
  var out = (f.roof || []).filter(function (k) { return PROPS[k]; });
  if (!out.length) { for (var i = 0; i < n; i++) out.push(pick(r, pool)); }
  return out;
}
function pilasterPos(W, r, step) {
  var pos = [], off = ri(r, 6, 14);
  for (var p = off; p < W - 16; p += step) pos.push(p);
  return pos;
}
function buildAlmacen(f) {
  var D = dimsOf(f), W = D.W, H = D.H, side = f.side === 'S' ? 'S' : 'N', seed = f.seed || 1;
  var r = rngf(seed * 7919 + 13), dmg = f.damage || 1, lights = [];
  var g = new G(W, H);
  var mural = !!f.mural && side === 'N';
  var wr = mural ? C.blanco : wallRampFor(f.color);
  var roofType = f.roofType || (mural ? 'arco' : ['arco', 'arco', 'dosAguas', 'losa'][seed % 4]);
  var ramp = r() < 0.25 ? C.metal : C.sheet;
  var step = W >= 160 ? 64 : 56, pos = mural ? [] : pilasterPos(W, r, step);
  var frames = mural ? [Math.round(W * 0.33), Math.round(W * 0.66)] : pos.map(function (p) { return p; });
  var faceT = (f.face >= 5 ? f.face : ((W >= 144 || (f.name && !mural)) ? 5 : 4)), faceH = Math.min(H, faceT * 16), faceY = H - faceH;
  var roofH = side === 'N' ? faceY : H;
  var ro = { ramp: ramp, dmg: dmg, wr: wr, frames: frames, skyTo: side === 'S' && f.name ? 0.45 : undefined };
  var rr = rngf(seed * 31 + 5), info;
  if (roofType === 'arco') info = roofArco(g, 0, 0, W, roofH, rr, ro);
  else if (roofType === 'dosAguas') info = roofGable(g, 0, 0, W, roofH, rr, ro);
  else {
    info = roofLosa(g, 0, 0, W, roofH, rr, { dmg: dmg, wr: wr });
    placeProps(g, roofNames(f, ['claraboyas', 'tanque', 'cilindro', 'antena'], r, 3), { x: 4, y: 6, w: W - 8, h: roofH - 14 }, rr);
  }
  if (side === 'S') {
    if (f.name) {                      // nombre grande pintado sobre la vertiente sur del techo
      var y1 = info.yb - 4, y0n = (info.crest || info.ya) + 8, nm = fitName(f.name, W - 18, y1 - y0n, [['a12', 1], ['a7', 2], ['a7', 1]]);
      if (nm) putName(g, nm, W / 2, y0n + Math.floor((y1 - y0n - nm.h) / 2), { aged: true, ink: '#e8e3cf', ink2: '#b9b49c', fade: 0.3, r: r, ribs: true });
    }
    if (W >= 150 && H >= 100 && roofType === 'losa') roofValla(g, coKey(f), (seed & 1) ? W - 70 : 14, 10, 56, 24, 42);      // valla de empresa arriba, sobre el nombre pintado
    return outOf(g, lights);
  }
  /* ---------- cara sur ---------- */
  wallBlock(g, 0, faceY, W, faceH, wr, r, { pos: pos, dmg: dmg });
  coping(g, 0, faceY, W, wr);
  // zocalo
  fill(g, 0, H - 6, W, 6, to(wr[1], wr[2], 0.2)); hl(g, 0, H - 6, W, wr[2]); hl(g, 0, H - 5, W, dk(wr[2], 0.25));
  // banda de color a media altura (con filetes)
  var bandCols = [C.azul, C.rojo, C.verde], bc = bandCols[seed % 3];
  if (wr === C.azul) bc = C.amarillo; if (wr === C.verde) bc = C.blanco; if (wr === C.rojo || wr === C.ladrillo) bc = C.amarillo;
  var by = faceY + Math.round(faceH * 0.52);
  if (!mural) {
    hl(g, 0, by - 1, W, bc[4]); fill(g, 0, by, W, 7, bc[2]); hl(g, 0, by, W, bc[3]); hl(g, 0, by + 6, W, bc[1]); hl(g, 0, by + 7, W, bc[0]); darken(g, 0, by + 8, W, 1, 0.22);
    pos.forEach(function (p) { fill(g, p, by, 6, 7, bc[3]); vl(g, p, by - 1, 9, bc[4]); vl(g, p + 5, by, 8, bc[1]); });
    for (var bx = 6 + ri(r, 0, 10); bx < W - 6; bx += 12 + ri(r, 0, 12)) if (r() < 0.4 + 0.2 * dmg) { hl(g, bx, by + 1, 2, bc[3]); hl(g, bx + 3, by + 3, 3, to(bc[2], wr[2], 0.35)); }
  }
  /* ---------- composicion: porton + garita ---------- */
  var gw = Math.min(80, W - 44), hasGate = !mural && gw >= 48, gx = 0, bx0 = -100, groupL = 0, groupR = 0;
  var gateLeft = r() < 0.5, boothW = 16;
  if (hasGate) {
    var group = gw + 4 + boothW, gm = 8 + ri(r, 0, 10);
    var gs = gateLeft ? gm : W - gm - group;
    if (boothW + gw + 4 > W - 12) { group = gw; }
    var boothFirst = r() < 0.5;
    if (boothFirst) { bx0 = gs; gx = gs + boothW + 4; } else { gx = gs; bx0 = gs + gw + 4; }
    groupL = Math.min(gx, bx0); groupR = Math.max(gx + gw, bx0 + boothW);
  }
  // nombre grande desteñido
  var ink = lumOf(wr[2]) > 110 ? to(C.azul[1], C.azul[0], 0.2) : '#e8e3cf', ink2 = to(ink, wr[2], 0.4);
  if (lumOf(wr[2]) > 110 && (seed % 2)) { ink = to(C.rojo[1], C.rojo[0], 0.15); ink2 = to(ink, wr[2], 0.4); }
  var nameBox = null;
  if (f.name && !mural) {
    var gateTop = hasGate ? H - 56 : H - 6, cands = [];
    var stripH = gateTop - faceY - 8;
    if (stripH >= 12) cands.push({ x: 6, w: W - 12, y: faceY + 7, h: stripH });
    if (hasGate) {
      if (groupL > 60) cands.push({ x: 4, w: groupL - 8, y: faceY + 8, h: Math.min(faceH - 20, 40) });
      if (W - groupR > 60) cands.push({ x: groupR + 4, w: W - groupR - 8, y: faceY + 8, h: Math.min(faceH - 20, 40) });
    } else cands.push({ x: 6, w: W - 12, y: faceY + 8, h: faceH - 24 });
    var best = null;
    cands.forEach(function (c) {
      var nm = fitName(f.name, c.w, c.h);
      if (nm && (!best || nm.rank < best.nm.rank || (nm.rank === best.nm.rank && c.w * c.h > best.c.w * best.c.h))) best = { nm: nm, c: c };
    });
    if (best) {
      var ny = best.c.y + Math.floor((best.c.h - best.nm.h) / 2), ncx = best.c.x + best.c.w / 2;
      putName(g, best.nm, ncx, ny, { aged: true, ink: ink, ink2: ink2, fade: 0.32, r: r });
      nameBox = { x0: ncx - best.nm.w / 2, x1: ncx + best.nm.w / 2, y0: ny, y1: ny + best.nm.h };
      // chorreras bajo las letras
      for (var k = 0; k < 3; k++) wetDrip(g, Math.round(nameBox.x0 + r() * best.nm.w), nameBox.y1 + 1, ri(r, 5, 11), 0.28);
    }
  }
  var plateY = by + 12;
  if (hasGate) {
    var gcol = [C.metal, C.azul, C.verde, C.rojo][(seed >> 2) % 4];
    slidingGate(g, gx, H - 1, gw, 56, gcol, r, dmg, dmg >= 2 ? 14 + ri(r, 0, 8) : 0);
    guardBooth(g, bx0, H - 1, [C.celeste, C.menta, C.durazno, C.blanco][(seed >> 3) % 4], r, lights);
    var cx0 = gateLeft ? gx + gw + 10 : gx - 10; if (bx0 < gx) cx0 = gx - 6; else cx0 = gx + gw + 6;
    if (cx0 > 6 && cx0 < W - 8 && (bx0 + boothW < cx0 - 4 || bx0 > cx0 + 4)) cono(g, cx0, H - 1);
    // chapa "NO ESTACIONAR" en el tramo de muro libre mas ancho
    var sp = groupL > W - groupR ? { x: 4, w: groupL - 4 } : { x: groupR + 4, w: W - groupR - 4 };
    if (sp.w >= 62) placaTexto(g, sp.x + Math.round((sp.w - 54) / 2), plateY, 54, 'NO ESTACIONAR', PAL.sign, '#1c1a22', C.amarillo[1]);
  } else if (!mural && W >= 80) {
    placaTexto(g, Math.round(W / 2 - 27), plateY, 54, 'NO ESTACIONAR', PAL.sign, '#1c1a22', C.amarillo[1]);
    var pdx = ri(r, 10, W - 30);   // puerta de servicio
    fill(g, pdx, H - 34, 16, 34, C.metal[0]); fill(g, pdx + 1, H - 33, 14, 32, C.metal[2]); hl(g, pdx + 1, H - 33, 14, C.metal[4]); vl(g, pdx + 1, H - 33, 32, C.metal[3]); pt(g, pdx + 12, H - 16, PAL.sign);
  }
  /* ---------- mural CALLAO ---------- */
  if (mural) {
    var mw = Math.min(144, W - 16), mh = 48, mx = Math.floor((W - mw) / 2), my = faceY + 8;
    muralCallao(g, mx, my, mw, mh, r);
    // puerta de servicio abajo a la derecha, bajo el mural
    var pdx2 = W - 8 - 16 - ri(r, 0, 6), dy2 = H - 30;
    fill(g, pdx2 - 1, dy2 - 1, 18, 31, C.metal[0]); fill(g, pdx2, dy2, 16, 30, C.verde[2]); hl(g, pdx2, dy2, 16, C.verde[4]); vl(g, pdx2, dy2, 30, C.verde[3]); vl(g, pdx2 + 15, dy2, 30, C.verde[1]);
    fill(g, pdx2 + 3, dy2 + 3, 10, 9, C.verde[1]); pt(g, pdx2 + 13, dy2 + 16, PAL.sign);
    placaTexto(g, 10, H - 20, 44, 'NO PEGAR', PAL.sign, '#1c1a22', C.amarillo[1]);
  }
  /* ---------- reflectores ---------- */
  var nf = W >= 128 ? 2 : 1, fxs = [];
  for (var q = 0; q < nf; q++) {
    var fx = Math.round(W * (nf === 1 ? 0.5 : (q ? 0.82 : 0.16))) + ri(r, -6, 6);
    if (nameBox && fx + 12 > nameBox.x0 - 4 && fx < nameBox.x1 + 4) fx = fx < (nameBox.x0 + nameBox.x1) / 2 ? Math.max(4, Math.round(nameBox.x0 - 16)) : Math.min(W - 14, Math.round(nameBox.x1 + 6));
    if (fx < 3 || fx > W - 12) continue;
    var tooClose = fxs.some(function (o) { return Math.abs(o - fx) < 18; });
    if (tooClose) continue;
    fxs.push(fx);
    floodlight(g, fx, faceY + 5, lights, r);
  }
  /* ---------- desgaste ---------- */
  salitre(g, 0, H - 6, W, 9, r, '#e2dfd2', 0.5);
  var nbolt = W / 14;
  for (var i = 0; i < nbolt; i++) if (r() < 0.3 + 0.2 * dmg) { var rx = 4 + Math.floor(r() * (W - 8)); bolt(g, rx, faceY + 6, wr[4], wr[1]); rustDrip(g, rx, faceY + 8, ri(r, 8, 20), r, 0.9); }
  for (i = 0; i < 2 + dmg; i++) wetDrip(g, 3 + Math.floor(r() * (W - 6)), faceY + 5, ri(r, 12, 26), 0.22);
  if (dmg >= 2) for (i = 0; i < dmg - 1; i++) {
    var lw = ri(r, 12, 22), lh = ri(r, 9, 15), lx = 8 + Math.floor(r() * (W - lw - 16)), ly = H - 6 - lh - ri(r, 2, 8);
    var ok = true; if (hasGate && lx + lw > groupL - 2 && lx < groupR + 2) ok = false; if (mural && ly < faceY + 60) ok = false;
    if (ok) plasterLoss(g, lx, ly, lw, lh, wr, r);
  }
  aoBase(g, 0, H, W);
  darken(g, 0, H - 1, W, 1, 0.3);
  // alambre de puas sobre el muro
  razor(g, 0, W, faceY, r);
  // cantos
  vl(g, 0, faceY, faceH, wr[4]); vl(g, W - 1, faceY, faceH, wr[0]); vl(g, W - 2, faceY, faceH, wr[1]);
  return outOf(g, lights);
}
S.lotArch.almacen = function (f) { return buildAlmacen(f); };

/* ============================== LETREROS Y TALLER ============================== */
/* cartel pintado sobre postes, de cara al sur (azoteas y lotes del lado S). Devuelve la caja usada. */
function signBoard(g, cx, yb, w, str, col, ink, shadowInk, r) {
  var h = 15, x = Math.round(cx - w / 2), top = yb - 6 - h;
  castShadow(g, x, yb, w, h + 6, 0.3);
  fill(g, x + 3, yb - 6, 3, 6, C.madera[1]); fill(g, x + w - 6, yb - 6, 3, 6, C.madera[1]); vl(g, x + 3, yb - 6, 6, C.madera[2]);
  fill(g, x, top, w, h, col[2]); hl(g, x, top, w, col[4]); vl(g, x, top, h, col[3]); hl(g, x, top + h - 1, w, col[0]); vl(g, x + w - 1, top, h, col[1]);
  hl(g, x + 1, top + 1, w - 2, col[3]);
  text(g, str, x + Math.floor(w / 2), top + 4, { font: 'a7', ink: ink, shadow: shadowInk, align: 'c' });
  for (var i = 0; i < 3; i++) { var bx = x + 3 + Math.floor(r() * (w - 6)); pt(g, bx, top + 2, col[1]); wetDrip(g, bx, top + h - 6, 6, 0.3); }
  rustDrip(g, x + 2, top + 2, 8, r, 0.6);
  hl(g, x, yb - 6, w, dk(col[0], 0.2));
  return { x: x, y: top, w: w, h: h + 6 };
}
function wrenchIcon(g, x, y, c, edge) {          // llave fija 7x9
  var rows = ['##...##', '##...##', '##.#.##', '#######', '.#####.', '..###..', '..###..', '.#####.', '.##.##.'];
  for (var j = 0; j < 9; j++) for (var i = 0; i < 7; i++) if (rows[j][i] === '#') g.set(x + i, y + j, c);
}
function carOnJacks(r, bodyCol) {                // sedan de costado sobre gatas, sin ruedas. 68x34. Silueta de sedan: capot y maletera 6 filas mas bajos que la cabina
  var t = new G(68, 34), B = bodyCol, V = C.vidrio, M = C.metal, i, j, x, y;
  function tp(x) { return x <= 1 ? 21 : (x <= 14 ? 19 : (x <= 21 ? 19 - Math.round((x - 14) * 6 / 7) : (x <= 40 ? 13 : (x < 49 ? 13 + Math.round((x - 40) * 7 / 8) : (x <= 62 ? 20 : 22))))); }
  function zone(x) { return (x >= 15 && x <= 21) || (x >= 41 && x <= 48) ? 'glass' : ((x <= 14 || x >= 49) ? 'deck' : 'roof'); }
  var D = 11, bot = 27;
  for (x = 1; x <= 66; x++) {
    var T = tp(x), z = zone(x);
    for (i = 0; i < D; i++) {                                           // cara superior: techo claro, capot y maletera un paso mas oscuros, lunas inclinadas
      var yy = T - D + i, c;
      if (z === 'glass') c = i < 4 ? V[3] : (i < 8 ? V[2] : V[1]);
      else if (z === 'roof') c = i < 8 ? B[4] : B[3];
      else c = i < 2 ? B[4] : (i < 7 ? B[3] : B[2]);
      t.set(x, yy, c);
    }
    for (y = T; y <= bot; y++) { var u = (y - T) / (bot - T + 1); t.set(x, y, y === T ? B[4] : (u < 0.22 ? B[3] : (u < 0.7 ? B[2] : (u < 0.9 ? B[1] : B[0])))); }
  }
  for (x = 4; x <= 11; x++) t.set(x, 10, B[4]);                          // brillo del maletero
  for (x = 52; x <= 62; x++) t.set(x, 11, B[4]);                         // brillo del capot
  // ventanas laterales (siguen la inclinacion de los parantes)
  for (x = 16; x <= 48; x++) { var wt = Math.max(tp(x) + 1, 14); for (y = wt; y <= 19; y++) t.set(x, y, y < wt + 2 ? V[3] : (y < 17 ? V[2] : V[1])); }
  vl(t, 32, 14, 6, B[1]); vl(t, 15, 15, 6, B[1]); vl(t, 49, 17, 4, B[1]); vl(t, 33, 14, 6, B[3]);
  for (i = 0; i < 5; i++) pt(t, 20 + i * 2, 18 - (i % 2), V[3]);        // reflejo diagonal
  hl(t, 24, 22, 4, B[4]); hl(t, 38, 22, 4, B[4]);                          // manijas
  hl(t, 1, 26, 66, B[1]); hl(t, 1, 27, 66, B[0]);                           // umbral
  fill(t, 0, 22, 3, 6, M[3]); fill(t, 65, 22, 3, 6, M[3]); hl(t, 0, 22, 3, M[4]); hl(t, 65, 22, 3, M[4]);   // parachoques
  pt(t, 66, 20, '#f2e63c'); pt(t, 66, 21, '#f2e63c'); pt(t, 1, 20, '#b5584a'); pt(t, 1, 21, '#b5584a');       // faros
  // pasos de rueda vacios, con el tambor de freno a la vista (sin ruedas: el auto esta en las gatas)
  [[12, 26], [54, 26]].forEach(function (a) {
    g_ell(t, a[0], a[1], 7, 6, '#1c1a22'); g_ell(t, a[0], a[1] + 1, 3.5, 3, M[2]); g_ell(t, a[0], a[1] + 1, 1.4, 1.2, M[0]);
    pt(t, a[0] - 2, a[1] - 1, M[4]);
  });
  // gatas (caballetes) y calzas
  [[26], [42]].forEach(function (a) {
    fill(t, a[0] - 1, 28, 3, 5, M[2]); hl(t, a[0] - 3, 33, 7, M[1]); hl(t, a[0] - 2, 28, 5, M[4]); vl(t, a[0] - 1, 28, 5, M[3]);
  });
  stainTo(t, 3, 24, 62, 3, RUST[2], 0.4, 0.5);
  t.outline('#1c1a22');
  return t;
}
function g_ell(t, cx, cy, rx, ry, c) { t.ell(cx, cy, rx, ry, c); }

function buildTaller(f) {
  var D = dimsOf(f), W = D.W, H = D.H, side = f.side === 'S' ? 'S' : 'N', seed = f.seed || 1;
  var r = rngf(seed * 6151 + 29), rr = rngf(seed * 17 + 3), dmg = f.damage || 1, lights = [];
  var g = new G(W, H), wr = wallRampFor(f.color), nm = f.name || 'TALLER';
  var pool = ['llantas', 'cilindro', 'tanque', 'antena', 'bidones', 'llantas'];
  if (side === 'S') {
    var inf = roofLosa(g, 0, 0, W, H, rr, { dmg: dmg, wr: wr });
    var sbw = Math.min(W - 24, Math.max(36, measure(nm, 'a7') + 12));
    var boardOk = (f.front || []).indexOf('panel') >= 0 || r() < 0.5;
    var taken = [];
    if (boardOk && W >= 56) {
      var bx = 12 + Math.floor(r() * (W - sbw - 24)) + sbw / 2, bcol = [C.rojo, C.azul, C.amarillo][seed % 3], yel = seed % 3 === 2;
      var bb = signBoard(g, bx, H - 9, sbw, nm, bcol, yel ? '#1c1a22' : '#f3efe2', yel ? bcol[3] : bcol[0], r);
      taken.push([bb.x - 2, bb.y - 2, bb.w + 4, bb.h + 4]);
    }
    placeProps(g, roofNames(f, pool, r, 3), { x: 4, y: 6, w: W - 8, h: H - 14 }, rr, taken, 2);
    return outOf(g, lights);
  }
  var faceT = Math.max(3, f.face || 3), faceH = Math.min(H, faceT * 16), faceY = H - faceH, apron = 4;
  var roofH = faceY;
  if (roofH > 8) {
    roofLosa(g, 0, 0, W, roofH, rr, { dmg: dmg, wr: wr });
    var Lt = ACH.letreros;                                       // v0.6: valla de marca sobre la azotea del taller, de cara a la calle
    var tvw = Math.min(72, W - 24), tvx = 12 + ((seed * 5) % Math.max(1, W - tvw - 24)), tOK = !!(Lt && Lt.valla && roofH >= 70 && W >= 100);
    var tavoid = [], tsx = tvx + tvw / 2 < W / 2 ? W - 50 : 8;
    if (tOK) { tavoid.push([tvx - 3, faceY - 46, tvw + 10, 42]); if (Lt.hand && Lt.hand.perro && W >= 120) tavoid.push([tsx - 2, faceY - 52, 48, 46]); }
    placeProps(g, roofNames(f, pool, r, 3), { x: 4, y: 6, w: W - 8, h: roofH - 14 }, rr, tavoid.length ? tavoid : null, 2);
    if (tOK) {
      var tbrand = Lt.brandAt(f.c0 || 0, seed, 2); if (Lt.isBeer && !Lt.isBeer(tbrand)) tbrand = 'pilsen';       // el taller anuncia cerveza (el vecino ya lleva la gaseosa)
      Lt.valla(g, tbrand, tvx, faceY - 42, tvw, 30, faceY - 8);
      if (Lt.hand && Lt.hand.perro && W >= 120) roofStake(g, tsx, faceY - 8, 40, 25, function (g2, x2, y2) { Lt.hand.perro(g2, x2, y2, { rnd: r }); });   // CUIDADO PERRO BRAVO (el perro de la azotea)
    }
  }
  // ---- muro manchado de grasa ----
  var pil = [];
  if (W >= 100) pil = [Math.round(W * 0.3) - 3];
  wallBlock(g, 0, faceY, W, faceH, wr, r, { pos: pil, dmg: dmg });
  coping(g, 0, faceY, W, wr);
  // banda de letrero pintada a mano (9 px), con llave
  var bcols = [[C.rojo, '#f3efe2', C.rojo[0]], [C.azul, PAL.sign, C.azul[0]], [C.amarillo, '#1c1a22', C.amarillo[1]]], bc = bcols[seed % 3];
  var by = faceY + 4, bh = 10;
  fill(g, 4, by, W - 8, bh, bc[0][2]); hl(g, 4, by, W - 8, bc[0][4]); hl(g, 4, by + bh - 1, W - 8, bc[0][0]);
  for (var i = 4; i < W - 4; i++) if (r() < 0.12) pt(g, i, by + bh, bc[0][0]);        // borde inferior irregular
  wrenchIcon(g, 7, by + 0, bc[1], bc[2]);
  var nameW = W - 8 - 14 - 6, label = nm.toUpperCase(), font = 'a7';
  if (measure(label, 'a7') > nameW) font = 'a5';
  var hasMark = /[ÁÉÍÓÚÑ]/.test(label);
  text(g, label, 14 + 4 + Math.floor(nameW / 2), by + (font === 'a7' ? 2 + (hasMark ? 0 : 0) : 3), { font: font, ink: bc[1], shadow: font === 'a7' ? bc[2] : null, align: 'c' });
  // ---- vanos: portón de dos hojas entreabierto, auto sobre gatas, llantas, tambor ----
  var floorY = H - apron, doorH = 30, dw = Math.min(48, W - 20); dw -= dw % 2;
  var items = [{ k: 'door', w: dw }], budget = W - 12 - dw, carW = 70;
  if (budget >= carW + 8) { items.push({ k: 'car', w: carW }); budget -= carW + 8; }
  if (budget >= 14) { items.push({ k: 'tyres', w: 13 }); budget -= 17; }
  if (budget >= 12 && W >= 100) { items.push({ k: 'drum', w: 9 }); budget -= 13; }
  if (r() < 0.5) items.reverse();
  var total = items.reduce(function (s, it) { return s + it.w; }, 0), gap = (W - 12 - total) / Math.max(1, items.length - 1), cx = 6;
  if (items.length === 1) cx = Math.round((W - dw) / 2);
  var doorX = 0;
  // zocalo y piso (losa frente al taller, con la mancha de aceite)
  fill(g, 0, floorY - 4, W, 4, to(wr[1], wr[2], 0.25)); hl(g, 0, floorY - 4, W, wr[2]);
  fill(g, 0, floorY, W, apron, C.gris[3]); hl(g, 0, floorY, W, C.gris[4]); hl(g, 0, floorY + 1, W, to(C.gris[3], C.gris[2], 0.4));
  for (var q = 0; q < items.length; q++) { var it = items[q]; it.x = Math.round(cx); cx += it.w + gap; if (it.k === 'door') doorX = it.x; }
  items.forEach(function (it) {
    if (it.k === 'door') {
      var x = it.x, y0 = floorY - doorH, hw = dw / 2;
      fill(g, x - 2, y0 - 3, dw + 4, doorH + 3, C.gris[0]);                            // marco y dintel
      hl(g, x - 2, y0 - 3, dw + 4, C.gris[3]);
      // interior oscuro, con luz calida de un foco
      fill(g, x, y0, dw, doorH, '#1c1a22'); fill(g, x + 4, y0 + 2, dw - 8, 3, '#2d2a36');
      fill(g, x + 6, y0 + 10, 16, 11, '#2b2d36'); hl(g, x + 6, y0 + 10, 16, '#44474d'); fill(g, x + 8, y0 + 21, 3, 9, '#2b2d36'); fill(g, x + 19, y0 + 21, 3, 9, '#2b2d36');   // banco de trabajo
      pt(g, x + hw, y0 + 6, PAL.lamp); pt(g, x + hw + 1, y0 + 6, '#fff2c0'); vl(g, x + hw, y0, 6, C.metal[1]);
      dith(g, x + hw - 6, y0 + 7, 13, 6, '#5a4a38', 0.5);
      // hoja izquierda abierta (escorzo), hoja derecha cerrada
      var cols = [C.azul, C.verde, C.oxido, C.rojo][(seed >> 1) % 4];
      fill(g, x, y0, 4, doorH, cols[2]); vl(g, x, y0, doorH, cols[4]); vl(g, x + 3, y0, doorH, cols[0]);
      var rx = x + hw + 1, rw = hw - 1;
      for (var k = 0; k < rw; k++) fill(g, rx + k, y0, 1, doorH, [cols[3], cols[2], cols[1]][k % 3]);
      fill(g, rx, y0 + 12, rw, 3, cols[2]); hl(g, rx, y0 + 12, rw, cols[4]); hl(g, rx, y0 + 14, rw, cols[0]);
      vl(g, rx - 1, y0, doorH, cols[0]); vl(g, rx + rw, y0, doorH, cols[0]);
      stainTo(g, rx, y0 + doorH - 9, rw, 9, RUST[2], 0.5, 0.75); rustDrip(g, rx + 3, y0 + 15, 10, r, 0.9); rustDrip(g, rx + rw - 5, y0 + 15, 8, r, 0.9);
      // cadena con candado
      vl(g, rx + 1, y0 + 8, 8, C.metal[3]); fill(g, rx - 1, y0 + 14, 4, 4, '#c9a66b'); pt(g, rx, y0 + 14, '#e0c58d');
      hl(g, x - 2, y0 + doorH, dw + 4, C.gris[1]);
      lights.push({ x: x + 5, y: y0 + 3, w: dw - 8, h: 16, kind: 'local' });
    } else if (it.k === 'car') {
      var car = carOnJacks(r, [C.celeste, C.menta, C.ocre, C.durazno][(seed >> 2) % 4]);
      g.blit(car, it.x, floorY + apron - 34 - 1);
    } else if (it.k === 'tyres') {
      pLlantas(g, it.x + 6, floorY + apron - 1, 4); pLlantas(g, it.x + 13, floorY + apron - 1, 3);
    } else if (it.k === 'drum') {
      pCilindro(g, it.x + 4, floorY + apron - 1, r() < 0.5 ? C.oxido : C.azul);
    }
  });
  // pizarra de servicio
  var hasCar = items.some(function (it) { return it.k === 'car'; });
  if (W >= 90 && !hasCar) placaTexto(g, (doorX > W / 2 ? 6 : W - 36), faceY + 17, 30, 'ABIERTO', C.verde[2], '#f3efe2', C.verde[0]);
  // mancha de aceite: sale del portón y llega al borde inferior, hacia la vereda
  var ox0 = doorX + 6, ow = Math.floor(dw * 0.6);
  for (var yy = floorY; yy < H; yy++) for (var xx = ox0 - 6; xx < ox0 + ow + 6; xx++) {
    var tt = (yy - floorY) / Math.max(1, H - floorY), cxo = ox0 + ow / 2 + 4 * Math.sin(yy * 0.9), dd = Math.abs(xx - cxo) / (ow / 2 + 3 + tt * 6);
    if (dd < 1 && bay(xx, yy) < Math.round((1 - dd) * 5)) g.set(xx, yy, dd < 0.5 ? '#2a2630' : '#3a3541');
  }
  pt(g, ox0 + 3, floorY + 1, '#6d6a8a'); pt(g, ox0 + 4, floorY + 2, '#8a7a98'); pt(g, ox0 + ow - 4, floorY + 2, '#5b8a86');
  // desgaste
  for (i = 0; i < 6 + dmg * 3; i++) { var gx = 4 + Math.floor(r() * (W - 8)), gy = faceY + 18 + Math.floor(r() * (faceH - 28)); stainTo(g, gx, gy, ri(r, 4, 9), ri(r, 3, 6), '#2a2630', 0.4, 0.5); }
  salitre(g, 0, floorY - 4, W, 7, r, '#e2dfd2', 0.4);
  for (i = 0; i < 4; i++) wetDrip(g, 3 + Math.floor(r() * (W - 6)), faceY + 4, ri(r, 8, 18), 0.25);
  if (dmg >= 3 && W > 70) { var plx = 6 + Math.floor(r() * (W - 28)); if (plx + 14 < doorX - 3 || plx > doorX + dw + 3) plasterLoss(g, plx, faceY + 17, 14, 9, wr, r); }
  aoBase(g, 0, floorY - 4 + 4 > H ? H : floorY, W);
  vl(g, 0, faceY, faceH, wr[4]); vl(g, W - 1, faceY, faceH, wr[0]);
  return outOf(g, lights);
}
S.lotArch.taller = function (f) { return buildTaller(f); };

/* ============================== LOTE A MEDIO CONSTRUIR ============================== */
function dirtGround(g, x0, y0, w, h, r, o) {
  o = o || {};
  var T = C.tierra;
  fill(g, x0, y0, w, h, T[1]);
  var i, n = Math.max(3, Math.floor(w * h / 700));
  for (i = 0; i < n; i++) {
    var col = r() < 0.5 ? to(T[1], T[2], 0.7) : to(T[1], T[0], 0.55);
    blob(g, x0 + r() * w, y0 + r() * h, 6 + r() * 14, 3 + r() * 7, r, function (X, Y, d) { return (d < 0.7 || bay(X, Y) < Math.round((1 - d) * 14)) ? col : null; });
  }
  for (i = 0; i < w * h / 90; i++) { var gx = x0 + Math.floor(r() * w), gy = y0 + Math.floor(r() * h); g.set(gx, gy, r() < 0.5 ? T[3] : T[0]); if (r() < 0.3) g.set(gx + 1, gy, T[2]); }
  // huellas de llanta (dos surcos paralelos que cruzan el lote)
  if (h > 16) {
    var ty = y0 + Math.floor(h * (0.45 + r() * 0.3));
    for (var x = x0; x < x0 + w; x++) { var yy = ty + Math.round(2 * Math.sin((x - x0) / 14)); g.set(x, yy, T[0]); g.set(x, yy + 4, T[0]); if (x % 3 === 0) { g.set(x, yy + 1, T[3]); g.set(x, yy + 5, T[3]); } }
  }
  // charco de garua
  if (w > 40 && r() < 0.8) {
    var cx = x0 + 14 + r() * (w - 28), cy = y0 + h * (0.5 + r() * 0.3);
    blob(g, cx, cy, 9, 3.5, r, function (X, Y, d) { return d > 0.8 ? T[0] : (Y < cy ? '#8d99a4' : '#6f7c8a'); });
    hl(g, Math.round(cx - 4), Math.round(cy - 1), 6, '#b4bcc2');
  }
  // matas secas
  for (i = 0; i < Math.floor(w / 24); i++) { var vx = x0 + 3 + Math.floor(r() * (w - 6)), vy = y0 + 3 + Math.floor(r() * (h - 6)); vl(g, vx, vy - 2, 3, C.veg[2]); vl(g, vx + 1, vy - 3, 4, C.veg[1]); vl(g, vx - 1, vy - 1, 2, C.veg[3]); }
}
function pArena(g, cx, yb, w) {
  w = w || 26; var A = C.arena, h = Math.round(w * 0.45), i, j;
  castShadow(g, cx - w / 2, yb, w, h, 0.25);
  for (j = 0; j < h; j++) {
    var hw = Math.round((j + 1) / h * w / 2 * (1 - 0.05 * Math.sin(j)));
    for (i = -hw; i <= hw; i++) {
      var t = (i + hw) / Math.max(1, 2 * hw), L = 3.2 - 2.4 * t + (j / h) * -0.5; L += (bay(cx + i, yb - h + j) - 1.5) * 0.18;
      g.set(cx + i, yb - h + j, A[Math.max(0, Math.min(4, Math.round(L)))]);
    }
  }
  pt(g, cx - 3, yb - h + 2, A[4]); pt(g, cx - 2, yb - h + 1, A[4]);
  hl(g, cx - w / 2 + 1, yb - 1, w - 2, A[0]);
  vl(g, cx + w / 2 + 2, yb - 9, 9, C.madera[2]); fill(g, cx + w / 2 + 1, yb - 10, 3, 2, C.metal[3]);       // pala clavada
}
function pGrava(g, cx, yb, w) {
  w = w || 20; var A = C.gris, h = Math.round(w * 0.4), i, j;
  castShadow(g, cx - w / 2, yb, w, h, 0.25);
  for (j = 0; j < h; j++) {
    var hw = Math.round((j + 1) / h * w / 2);
    for (i = -hw; i <= hw; i++) { var t = (i + hw) / Math.max(1, 2 * hw); g.set(cx + i, yb - h + j, A[Math.max(0, Math.min(4, Math.round(3.1 - 2.2 * t + ((cx + i + j * 3) % 5 === 0 ? 0.9 : (cx + i + j) % 4 === 0 ? -0.8 : 0))))]); }
  }
  hl(g, cx - w / 2 + 1, yb - 1, w - 2, A[0]);
}
function pMezcladora(g, cx, yb) {
  var O = C.naranja, M = C.metal, N = C.negro;
  castShadow(g, cx - 10, yb, 20, 20, 0.3);
  // armazon y ruedas
  vl(g, cx - 6, yb - 7, 7, M[1]); vl(g, cx + 5, yb - 7, 7, M[1]); hl(g, cx - 7, yb - 7, 14, M[2]);
  g.ell(cx - 7, yb - 2, 3, 3, N[1]); g.ell(cx - 7, yb - 2, 1.2, 1.2, M[3]); g.ell(cx + 6, yb - 2, 3, 3, N[1]); g.ell(cx + 6, yb - 2, 1.2, 1.2, M[3]);
  // tambor inclinado
  for (var j = 0; j < 14; j++) for (var i = 0; i < 14; i++) {
    var dx = (i - 6.5) / 7, dy = (j - 6.5) / 7;
    if (dx * dx + dy * dy <= 1) { var L = 3.4 - 2.6 * ((dx + dy * 0.6 + 1) / 2.4); g.set(cx - 7 + i, yb - 21 + j, O[Math.max(0, Math.min(4, Math.round(L)))]); }
  }
  g.ell(cx + 2, yb - 17, 4, 3, '#1c1a22'); g.ell(cx + 2, yb - 16.5, 3, 2, '#3a3743');                      // boca del tambor
  hl(g, cx - 5, yb - 12, 12, O[1]); pt(g, cx - 4, yb - 19, O[4]); pt(g, cx - 5, yb - 18, O[4]);
  vl(g, cx + 8, yb - 14, 8, M[3]); hl(g, cx + 7, yb - 15, 3, M[4]);                                         // volante
  stainTo(g, cx - 7, yb - 12, 14, 12, '#9aa0a0', 0.4, 0.5);                                                // cemento seco
}
function pCarretilla(g, cx, yb) {
  var A = C.azul, M = C.metal;
  castShadow(g, cx - 8, yb, 16, 10, 0.25);
  for (var i = 0; i < 11; i++) { var h = 5 - (i < 2 || i > 8 ? 1 : 0); fill(g, cx - 6 + i, yb - 4 - h, 1, h, A[i < 3 ? 3 : (i > 7 ? 1 : 2)]); }
  hl(g, cx - 6, yb - 9, 11, A[4]); g.ell(cx + 7, yb - 2, 3, 3, C.negro[1]); g.ell(cx + 7, yb - 2, 1, 1, M[3]);
  hl(g, cx - 10, yb - 5, 5, C.madera[2]); hl(g, cx - 9, yb - 2, 4, C.madera[1]); vl(g, cx - 5, yb - 5, 4, M[1]);
}
function pColumnas(g, cx, yb) {
  var G_ = C.gris;
  castShadow(g, cx - 9, yb, 18, 18, 0.28);
  [-7, 7].forEach(function (d) {
    fill(g, cx + d - 2, yb - 13, 5, 13, G_[2]); vl(g, cx + d - 2, yb - 13, 13, G_[4]); vl(g, cx + d + 2, yb - 13, 13, G_[0]); hl(g, cx + d - 2, yb - 13, 5, G_[4]);
    for (var k = 0; k < 4; k++) vl(g, cx + d - 1 + (k % 2) * 2, yb - 19 + (k % 3), 7, k % 2 ? RUST[2] : RUST[3]);
    hl(g, cx + d - 2, yb - 7, 5, G_[3]);
  });
  var B = C.ladrillo;                                                      // sobrecimiento a medio levantar entre las columnas
  fill(g, cx - 5, yb - 6, 10, 6, B[2]); hl(g, cx - 5, yb - 6, 10, B[4]); hl(g, cx - 5, yb - 3, 10, B[1]); for (var i = 0; i < 10; i += 5) vl(g, cx - 4 + i, yb - 5, 2, B[1]);
}
function pBolsas(g, cx, yb) {
  castShadow(g, cx - 8, yb, 16, 9, 0.25);
  for (var row = 0; row < 3; row++) for (var k = 0; k < 3 - row; k++) {
    var bx = cx - 8 + k * 6 + row * 3, by = yb - 3 * (row + 1);
    fill(g, bx, by, 6, 3, C.gris[3]); hl(g, bx, by, 6, C.gris[4]); hl(g, bx, by + 2, 6, C.gris[1]); pt(g, bx + 2, by + 1, '#8f3a32');
  }
}
function pZapata(g, cx, yb) {                  // cimiento rectangular con varillas
  var G_ = C.gris, w = 34, h = 14;
  fill(g, cx - w / 2, yb - h, w, 3, G_[3]); hl(g, cx - w / 2, yb - h, w, G_[4]);
  fill(g, cx - w / 2, yb - 3, w, 3, G_[2]); hl(g, cx - w / 2, yb - 3, w, G_[3]); hl(g, cx - w / 2, yb - 1, w, G_[1]);
  vl(g, cx - w / 2, yb - h, h, G_[3]); fill(g, cx + w / 2 - 3, yb - h, 3, h, G_[2]);
  fill(g, cx - w / 2 + 3, yb - h + 3, w - 6, h - 6, to(C.tierra[1], C.tierra[0], 0.4));            // zanja
  for (var k = 0; k < 3; k++) { var x = cx - w / 2 + 6 + k * 11; vl(g, x, yb - h - 6, 7, k % 2 ? RUST[2] : RUST[3]); pt(g, x, yb - h - 7, RUST[3]); }
}
PROPS.arena = { w: 28, h: 14, fn: function (g, cx, yb, r) { pArena(g, cx, yb, 24 + ri(r, 0, 8)); } };
PROPS.grava = { w: 22, h: 10, fn: function (g, cx, yb, r) { pGrava(g, cx, yb, 18 + ri(r, 0, 6)); } };
PROPS.mezcladora = { w: 22, h: 22, fn: pMezcladora };
PROPS.carretilla = { w: 20, h: 12, fn: pCarretilla };
PROPS.columnas = { w: 22, h: 20, fn: pColumnas };
PROPS.bolsas = { w: 18, h: 10, fn: pBolsas };
PROPS.zapata = { w: 36, h: 22, fn: pZapata };

/* afiches chicha (28x30), texto a5 / a7 legible; nombres de grupos inventados */
var AFICHES = [
  { bg: '#e8388a', ink: '#f3efe2', sh: '#7d2250', L: [['GRAN', 5], ['MAR', 7], ['BRAVO', 5], ['SAB 21', 5]] },
  { bg: '#f2e63c', ink: '#1c1a22', sh: '#a88a3c', L: [['TRIO', 5], ['FARO', 7], ['ROJO', 5], ['VIE 13', 5]] },
  { bg: '#38c8e8', ink: '#1c1a22', sh: '#2f6f8a', L: [['LOS', 5], ['ANCHO', 5], ['VETAS', 5], ['HOY!', 7]] },
  { bg: '#ff8a2a', ink: '#1c1a22', sh: '#8a4a1a', L: [['COMBO', 5], ['OLA', 7], ['BAILE', 5], ['DOM 22', 5]] },
  { bg: '#5fe04a', ink: '#1c1a22', sh: '#2f6f2a', L: [['ORQ.', 5], ['SON', 7], ['CHALA', 5], ['SAB 28', 5]] }
];
function afiche(g, x, y, A, r, wear) {
  var w = 28, h = 30, bg = to(A.bg, '#8a8884', 0.1), i;
  fill(g, x, y, w, h, bg); hl(g, x, y, w, lt(bg, 0.25)); vl(g, x, y, h, lt(bg, 0.12)); hl(g, x, y + h - 1, w, to(bg, '#2a2440', 0.35)); vl(g, x + w - 1, y, h, to(bg, '#2a2440', 0.28));
  fill(g, x + 2, y + 2, w - 4, 2, A.ink); hl(g, x + 2, y + 5, w - 4, A.sh);                      // franja de cabecera
  var ty = y + 7;
  A.L.forEach(function (ln, k) {
    var fnt = ln[1] === 7 ? 'a7' : 'a5';
    text(g, ln[0], x + Math.floor(w / 2), ty, { font: fnt, ink: A.ink, shadow: fnt === 'a7' ? A.sh : null, align: 'c' });
    ty += (fnt === 'a7' ? 7 : 5) + 2 + (k === 2 ? 1 : 0);
  });
  hl(g, x + 2, y + h - 3, w - 4, A.sh);
  if (wear) {
    if (r() < 0.55) { var tw = ri(r, 5, 9); for (i = 0; i < tw; i++) fill(g, x + w - tw + i, y, 1, Math.max(0, Math.floor((tw - i) * 0.7)), null); }     // esquina rota
    if (r() < 0.4) { var ph = ri(r, 6, 11); for (i = 0; i < w; i++) if (r() < 0.85) fill(g, x + i, y + h - ph + (i % 5 === 0 ? 1 : 0), 1, ph, null); }         // mitad despegada
    for (i = 0; i < 3; i++) wetDrip(g, x + 1 + Math.floor(r() * (w - 2)), y + 3, ri(r, 10, 24), 0.35);
  }
}
function buildLoteObra(f) {
  var D = dimsOf(f), W = D.W, H = D.H, side = f.side === 'S' ? 'S' : 'N', seed = f.seed || 1;
  var r = rngf(seed * 4243 + 7), rr = rngf(seed * 13 + 1), dmg = f.damage || 1, lights = [];
  var g = new G(W, H), i, x;
  var label = (f.name && f.name.length <= 12 ? f.name : 'SE VENDE').toUpperCase();
  var pool = ['arena', 'grava', 'mezcladora', 'carretilla', 'columnas', 'bolsas', 'ladrillos', 'zapata'];
  var names = (f.roof || []).filter(function (k) { return PROPS[k]; });
  ['arena', 'mezcladora', 'columnas', 'carretilla'].forEach(function (k) { if (names.indexOf(k) < 0 && names.length < 4) names.push(k); });
  if (W >= 128) names.push(pick(r, ['zapata', 'grava', 'bolsas']));
  if (side === 'S') {
    dirtGround(g, 0, 0, W, H, rr, {});
    // cerco de calamina visto por detras (borde norte): lamina, travesanos y puntales
    var fh = 11, M = C.metal;
    for (x = 0; x < W; x++) fill(g, x, 0, 1, fh, [M[3], M[2], M[1]][x % 3]);
    hl(g, 0, 0, W, M[4]); hl(g, 0, 1, W, M[3]); hl(g, 0, fh - 1, W, M[0]); hl(g, 0, fh - 6, W, M[1]);
    for (x = 0; x < W; x += 13) { vl(g, x, 1, fh - 2, M[0]); vl(g, x + 1, 1, fh - 2, M[3]); }
    for (x = 20; x < W - 4; x += 40) { fill(g, x, 0, 4, fh + 1, C.madera[2]); vl(g, x, 0, fh + 1, C.madera[3]); vl(g, x + 3, 0, fh + 1, C.madera[0]); g.line(x + 4, fh, x + 12, fh + 8, C.madera[1]); }
    for (x = 8; x < W - 6; x += 16) if (r() < 0.5) rustDrip(g, x, 2, ri(r, 4, 8), r, 0.7);
    darken(g, 0, fh + 1, W, 2, 0.35); darken(g, 0, fh + 3, W, 2, 0.15);
    for (x = 12; x < W - 6; x += 26) if (r() < 0.6) { fill(g, x, fh + 3, 6, 2, '#2a2440'); }
    // lados: cerco bajo y medianera
    fill(g, 0, 0, 2, H, C.gris[3]); vl(g, 0, 0, H, C.gris[4]); fill(g, W - 2, 0, 2, H, C.gris[1]); vl(g, W - 1, 0, H, C.gris[0]);
    var taken = [];
    if (W >= 64) { var bw = Math.min(W - 20, measure(label, 'a7') + 14), bb = signBoard(g, W / 2 + ri(r, -8, 8), H - 6, bw, label, C.blanco, '#8f3a32', '#f3efe2', r); taken.push([bb.x - 2, bb.y - 2, bb.w + 4, bb.h + 4]); }
    var LtS = ACH.letreros;
    if (LtS && LtS.hand && LtS.hand.perro && W >= 88) taken.push(roofStake(g, (seed & 1) ? W - 48 : 8, fh + 50, 40, 25, function (g2, x2, y2) { LtS.hand.perro(g2, x2, y2, { rnd: r }); }));   // CUIDADO PERRO BRAVO en el terreno
    placeProps(g, names, { x: 4, y: fh + 6, w: W - 8, h: H - fh - 10 }, rr, taken);
    return outOf(g, lights);
  }
  /* ---- lado N: terreno visto sobre el cerco; el cerco de calamina con afiches al frente ---- */
  var fenceH = Math.min(H, 48), fy = H - fenceH;
  if (fy > 0) {
    dirtGround(g, 0, 0, W, fy + 6, rr, {});
    // medianera del fondo (muro del vecino) con su coronacion
    var wr0 = C.gris, bh = Math.min(9, fy - 2);
    if (bh > 3) { fill(g, 0, 0, W, bh, wr0[2]); hl(g, 0, 0, W, wr0[4]); hl(g, 0, 1, W, wr0[3]); hl(g, 0, bh - 1, W, wr0[1]); darken(g, 0, bh, W, 2, 0.35); for (x = 6; x < W; x += 9 + ri(r, 0, 12)) wetDrip(g, x, 2, ri(r, 3, 6), 0.25); }
    var zone = { x: 4, y: Math.min(10, fy - 4), w: W - 8, h: fy + 8 - Math.min(10, fy - 4) };
    placeProps(g, names, zone, rr);
    fill(g, 0, 0, 1, fy + 6, C.gris[3]); fill(g, W - 1, 0, 1, fy + 6, C.gris[1]);
  }
  // ---- cerco: planchas de calamina de distinto color/edad ----
  var M = C.metal, sw = 13, scols = [M, M, M, C.oxido, C.azul, M, C.verde], si = 0;
  for (x = 0; x < W; x += sw) {
    var sc = scols[Math.floor(r() * scols.length)], tn = [sc[3], sc[2], sc[1]], ww = Math.min(sw, W - x);
    for (i = 0; i < ww; i++) fill(g, x + i, fy, 1, fenceH, tn[(x + i) % 3]);
    vl(g, x, fy, fenceH, sc[0]); vl(g, x + 1, fy, fenceH, sc[4]);
  }
  // poste de madera cada ~48 px
  var posts = [];
  for (x = 2 + ri(r, 0, 10); x < W - 5; x += 44 + ri(r, 0, 10)) posts.push(x);
  // franja de malla raschel arriba (se ve el terreno a traves)
  for (x = 0; x < W; x++) for (var yy = fy; yy < fy + 5; yy++) { var cc = ((x + yy) % 3 === 0) ? C.veg[1] : (((x - yy) % 4 === 0) ? C.veg[0] : null); g.set(x, yy, cc ? cc : (bay(x, yy) < 2 ? to(g.get(x, yy) || C.veg[0], C.veg[0], 0.55) : C.veg[0])); }
  hl(g, 0, fy + 5, W, C.madera[1]); hl(g, 0, fy + 6, W, C.madera[3]); hl(g, 0, fy + 7, W, C.madera[0]);                       // travesano
  // postes de madera (los afiches los tapan)
  posts.forEach(function (px_) { fill(g, px_, fy - 3, 4, fenceH + 3, C.madera[2]); vl(g, px_, fy - 3, fenceH + 3, C.madera[3]); vl(g, px_ + 3, fy - 3, fenceH + 3, C.madera[0]); hl(g, px_, fy - 3, 4, C.madera[3]); darken(g, px_ + 4, fy, 2, fenceH, 0.2); });
  // banda pintada de blanco con "SE VENDE"
  var pbY = fy + 9, pbH = 11;
  fill(g, 2, pbY, W - 4, pbH, C.blanco[3]); hl(g, 2, pbY, W - 4, C.blanco[4]); hl(g, 2, pbY + pbH - 1, W - 4, C.blanco[1]);
  for (x = 3; x < W - 3; x += 7) if (r() < 0.5) pt(g, x, pbY + pbH, C.blanco[1]);
  var lfont = measure(label, 'a7') <= W - 14 ? 'a7' : 'a5';
  text(g, label, Math.floor(W / 2), pbY + (lfont === 'a7' ? 2 : 3), { font: lfont, ink: '#8f3a32', shadow: lfont === 'a7' ? '#d8a89c' : null, align: 'c' });
  for (i = 0; i < 4; i++) wetDrip(g, 4 + Math.floor(r() * (W - 8)), pbY + pbH, ri(r, 4, 10), 0.28);
  // muro de afiches chicha: repetidos, pegados en capas
  var py = pbY + pbH + 2, ph = 30, pw = 28, nP = Math.max(1, Math.floor((W - 6) / 25)), designs = [], d0 = Math.floor(r() * 5);
  for (i = 0; i < 3; i++) designs.push(AFICHES[(d0 + i * 2) % 5]);
  var span = W - 6 - pw;
  var LtW = ACH.letreros, wallAd = !!(LtW && LtW.ad && W <= 60 && W >= 44);
  if (wallAd) {                                                          // aviso de cerveza pintado a mano sobre la calamina (el lote chico no lleva afiches)
    LtW.ad(g, 'cusquena', Math.floor((W - 42) / 2), py, 42, 28, { rnd: r, wear: 1.2 });
    nP = 0;
  }
  for (i = 0; i < nP; i++) {
    var ax = nP === 1 ? Math.floor((W - pw) / 2) : 3 + Math.round(i * span / (nP - 1)) + ri(r, -1, 1);
    afiche(g, ax, py + ri(r, -1, 1), designs[i % designs.length], r, true);
  }
  for (i = 0; i < nP + 1 && !wallAd; i++) if (r() < 0.6) { var sx = 4 + Math.floor(r() * (W - 14)); fill(g, sx, py + ri(r, 0, 18), 5, 7, to(designs[(i + 1) % 3].bg, '#8a8884', 0.35)); }   // restos de afiches viejos
  // pernos y chorreras
  for (x = 6; x < W - 4; x += 13) { if (r() < 0.8) { bolt(g, x, py - 1, C.metal[4], C.metal[1]); if (r() < 0.5) rustDrip(g, x, py + 1, ri(r, 5, 12), r, 0.8); } }
  // base: tierra salpicada y oclusion
  fill(g, 0, H - 3, W, 3, to(C.tierra[1], C.tierra[0], 0.3)); dith(g, 0, H - 4, W, 1, C.tierra[0], 0.5);
  aoBase(g, 0, H, W);
  for (x = 4; x < W - 4; x += 6) if (r() < 0.45) pt(g, x, H - 4 - ri(r, 0, 2), C.tierra[2]);
  return outOf(g, lights);
}
S.lotArch.loteObra = function (f) { return buildLoteObra(f); };

/* ============================== PATIO DE CONTENEDORES ============================== */
var CPAL = {
  azul: ['#16203a', '#27396a', '#2f4f8f', '#4569b0', '#7a93c9'],
  rojo: ['#3a1a1c', '#5b2623', '#8f3e37', '#b3584a', '#d08670'],
  blanco: ['#5f6270', '#8c909c', '#b9bcc2', '#d5d8da', '#eceee9'],
  verde: ['#1f3a36', '#2f5a52', '#3f7266', '#5a8f80', '#8fb7a6'],
  ocre: ['#5a3f22', '#8a6a3a', '#b08a4e', '#cba76a', '#e3c894']
};
var CKEYS = ['azul', 'rojo', 'blanco', 'verde', 'ocre', 'rojo', 'azul'];
var LVH = 31, ROOFH = 15;
function cornerCast(g, x, y, c) { fill(g, x, y, 4, 4, c[0]); pt(g, x + 1, y + 1, c[3]); pt(g, x + 2, y + 2, '#1c1a22'); }
function conSide(g, x, yb, levels, pals, codes, r, o) {                  // contenedor de 20' de costado: 98 de ancho
  o = o || {};
  var w = 98, total = ROOFH + levels * LVH, top = yb - total, l, i;
  // sombra al SE sobre el piso y sobre lo que haya detras
  castShadow(g, x, yb, w, Math.min(total, 40), 0.3);
  for (l = 0; l < levels; l++) {
    var pal = pals[l % pals.length], y1 = yb - l * LVH, y0 = y1 - LVH, topLv = l === levels - 1;
    if (topLv) {                                                           // techo corrugado visto desde arriba
      var ry = y0 - ROOFH;
      fill(g, x, ry, w, ROOFH, pal[3]);
      for (i = 0; i < w; i += 3) vl(g, x + i, ry + 2, ROOFH - 3, pal[4]);
      hl(g, x, ry, w, pal[4]); hl(g, x, ry + 1, w, lt(pal[3], 0.1)); vl(g, x, ry, ROOFH, pal[4]); hl(g, x, y0 - 2, w, pal[1]); vl(g, x + w - 1, ry, ROOFH, pal[2]); vl(g, x + w - 2, ry + 1, ROOFH - 1, pal[2]);
      for (i = 0; i < 2; i++) { var sx = x + 6 + Math.floor(r() * (w - 14)), sy = ry + 3 + Math.floor(r() * (ROOFH - 7)); fill(g, sx, sy, ri(r, 6, 14), 2, to(pal[3], '#e0c58d', 0.35)); }     // polvo y oxido sobre el techo
      if (r() < 0.5 * (o.dmg || 1) * 0.6) stainTo(g, x + 3 + ri(r, 0, 60), ry + 3, ri(r, 10, 25), ROOFH - 6, RUST[2], 0.4, 0.5);
    }
    // costado ondulado
    for (i = 0; i < w; i++) fill(g, x + i, y0, 1, LVH, [pal[3], pal[2], pal[1]][i % 3]);
    // postes de esquina y rieles
    fill(g, x, y0, 5, LVH, pal[2]); vl(g, x, y0, LVH, pal[4]); vl(g, x + 4, y0, LVH, pal[1]);
    fill(g, x + w - 5, y0, 5, LVH, pal[2]); vl(g, x + w - 5, y0, LVH, pal[3]); vl(g, x + w - 1, y0, LVH, pal[0]);
    hl(g, x, y0, w, pal[4]); hl(g, x, y0 + 1, w, pal[2]); hl(g, x, y1 - 3, w, pal[1]); hl(g, x, y1 - 2, w, pal[0]); hl(g, x, y1 - 1, w, dk(pal[0], 0.3));
    cornerCast(g, x, y0, pal); cornerCast(g, x + w - 4, y0, pal); cornerCast(g, x, y1 - 5, pal); cornerCast(g, x + w - 4, y1 - 5, pal);
    // codigo en a5 y marca grande en a12 (nombre inventado)
    var cod = codes[l % codes.length], inkC = lumOf(pal[2]) > 120 ? '#1c1a22' : '#f3efe2';
    if (l === 0 || r() < 0.6) {
      text(g, cod, x + w - 8, y0 + 5, { font: 'a5', ink: inkC, align: 'r' });
      text(g, '22G1', x + w - 8, y0 + 11, { font: 'a5', ink: inkC, align: 'r' });
    }
    if (o.big && l === levels - 1 - (o.bigLevel || 0)) {
      var bigInk = lumOf(pal[2]) > 120 ? C.azul[1] : '#e8e3cf';
      var bigF = measure(o.big, 'a12', 1) <= w - 14 ? 'a12' : 'a7', bigW = measure(o.big, bigF, 1);   // nombres largos bajan a a7 para caber en la pared
      agedText(g, o.big, x + (w >> 1), y0 + (bigF === 'a12' ? 7 : 10), { font: bigF, scale: 1, ink: bigInk, ink2: to(bigInk, pal[2], 0.4), fade: 0.22, r: r });
    }
    // desgaste: golpes, rasguños, oxido en el riel inferior, mugre
    for (i = 0; i < 2 + (o.dmg || 1); i++) { var gx = x + 8 + Math.floor(r() * (w - 20)), gy = y0 + 4 + Math.floor(r() * (LVH - 12)); hl(g, gx, gy, ri(r, 3, 8), pal[4]); hl(g, gx + 1, gy + 1, ri(r, 2, 6), pal[0]); }
    if (r() < 0.5) { var dx = x + 10 + Math.floor(r() * (w - 30)), dy = y0 + 8 + Math.floor(r() * 8); fill(g, dx, dy, ri(r, 5, 9), ri(r, 4, 7), dk(pal[2], 0.28)); hl(g, dx, dy, 4, pal[3]); }
    stainTo(g, x + 5, y1 - 9, w - 10, 6, RUST[2], 0.4, 0.5);
    for (i = 0; i < 3; i++) rustDrip(g, x + 8 + Math.floor(r() * (w - 18)), y1 - 9, ri(r, 4, 7), r, 0.8);
    darken(g, x, y1 - 12, w, 12, 0.08);
    if (l > 0) { hl(g, x, y1 - 1, w, '#1c1a22'); darken(g, x, y1 - 1 - 4, w, 4, 0.12); }                         // el de arriba proyecta sombra al de abajo
  }
  darken(g, x, yb - 2, w, 2, 0.4);
  return { x: x, y: top, w: w, h: total };
}
function conEnd(g, x, yb, levels, pals, codes, r, o) {                    // contenedor con las puertas hacia el sur: 39 de ancho
  o = o || {};
  var w = 39, rh = 22, total = rh + levels * LVH, top = yb - total, l, i;
  castShadow(g, x, yb, w, Math.min(total, 40), 0.3);
  for (l = 0; l < levels; l++) {
    var pal = pals[l % pals.length], y1 = yb - l * LVH, y0 = y1 - LVH, topLv = l === levels - 1;
    if (topLv) {
      var ry = y0 - rh;
      fill(g, x, ry, w, rh, pal[3]); for (i = 2; i < rh - 1; i += 3) hl(g, x + 2, ry + i, w - 4, pal[4]);
      hl(g, x, ry, w, pal[4]); vl(g, x, ry, rh, pal[4]); vl(g, x + w - 1, ry, rh, pal[2]); hl(g, x, y0 - 1, w, pal[1]);
      fill(g, x + 8 + ri(r, 0, 14), ry + 6 + ri(r, 0, 8), ri(r, 6, 12), 2, to(pal[3], '#e0c58d', 0.3));
    }
    fill(g, x, y0, w, LVH, pal[2]);
    fill(g, x, y0, 4, LVH, pal[1]); vl(g, x, y0, LVH, pal[3]); fill(g, x + w - 4, y0, 4, LVH, pal[1]); vl(g, x + w - 1, y0, LVH, pal[0]);
    hl(g, x, y0, w, pal[4]); hl(g, x, y0 + 1, w, pal[3]); hl(g, x, y1 - 3, w, pal[1]); hl(g, x, y1 - 2, w, pal[0]);
    var opened = o.open && l === 0;
    var lw = 15;
    // dos hojas con varillas de cierre
    [x + 4, x + 4 + lw + 1].forEach(function (lx, k) {
      if (opened && k === 0) {                                              // hoja abierta: se ve el interior oscuro con cajas
        fill(g, lx, y0 + 3, lw, LVH - 6, '#1c1a22'); dith(g, lx, y0 + 3, lw, 8, '#2d2a36', 0.5);
        fill(g, lx + 2, y1 - 17, 7, 11, '#a5814f'); hl(g, lx + 2, y1 - 17, 7, '#c9a66b'); vl(g, lx + 8, y1 - 17, 11, '#7a5a45'); hl(g, lx + 2, y1 - 11, 7, '#7a5a45');
        fill(g, lx + 8, y1 - 12, 6, 6, '#c9a66b'); hl(g, lx + 8, y1 - 12, 6, '#e0c58d'); hl(g, lx + 8, y1 - 8, 6, '#a5814f');
        fill(g, x + 1, y0 + 3, 3, LVH - 6, pal[0]);                         // la hoja abierta, de canto
        return;
      }
      fill(g, lx, y0 + 3, lw, LVH - 6, pal[2]); vl(g, lx, y0 + 3, LVH - 6, pal[3]); vl(g, lx + lw - 1, y0 + 3, LVH - 6, pal[1]);
      for (var rd = 0; rd < 2; rd++) { var rx = lx + 4 + rd * 6; vl(g, rx, y0 + 4, LVH - 8, pal[4]); vl(g, rx + 1, y0 + 4, LVH - 8, pal[0]); pt(g, rx, y0 + 13, '#1c1a22'); pt(g, rx, y1 - 9, '#1c1a22'); }
      for (var hy = 0; hy < 3; hy++) hl(g, lx + 1, y0 + 4 + hy * 9, 2, pal[0]);                    // bisagras
    });
    vl(g, x + 4 + lw, y0 + 3, LVH - 6, '#1c1a22');
    cornerCast(g, x, y0, pal); cornerCast(g, x + w - 4, y0, pal); cornerCast(g, x, y1 - 5, pal); cornerCast(g, x + w - 4, y1 - 5, pal);
    var cod = codes[l % codes.length], inkC = lumOf(pal[2]) > 120 ? '#1c1a22' : '#f3efe2', c4 = cod.replace(/ /g, '');
    if (!(opened)) text(g, c4.slice(0, 4), x + 6, y0 + 6, { font: 'a5', ink: inkC });
    for (i = 0; i < 2; i++) { var gx = x + 5 + Math.floor(r() * (w - 12)), gy = y0 + 6 + Math.floor(r() * (LVH - 14)); hl(g, gx, gy, ri(r, 2, 5), pal[4]); }
    stainTo(g, x + 4, y1 - 9, w - 8, 6, RUST[2], 0.4, 0.5);
    darken(g, x, y1 - 10, w, 10, 0.08);
    if (l > 0) { hl(g, x, y1 - 1, w, '#1c1a22'); darken(g, x, y1 - 5, w, 4, 0.12); }
  }
  darken(g, x, yb - 2, w, 2, 0.4);
  if (o.open) {                                                              // cajas caidas delante
    for (i = 0; i < 3; i++) { var bx = x + 3 + i * 9 + ri(r, -1, 2), by = yb + 1; castShadow(g, bx, by + 1, 7, 6, 0.3); fill(g, bx, by - 5, 7, 6, '#b08a4e'); hl(g, bx, by - 5, 7, '#e3c894'); vl(g, bx + 6, by - 5, 6, '#8a6a3a'); hl(g, bx, by - 2, 7, '#8a6a3a'); }
  }
  return { x: x, y: top, w: w, h: total };
}
function meshFence(g, x, y, w, h, r, tone) {         // cerco de malla: postes de acero y rombos (visto de frente, translucido)
  var M = C.metal, i, j;
  for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
    var d1 = (i + j) % 4 === 0, d2 = (i - j + 400) % 4 === 0;
    if (d1 || d2) { var c = g.get(x + i, y + j); g.set(x + i, y + j, c ? to(c, M[3], 0.55) : M[2]); }
    else if (bay(x + i, y + j) === 0) { var c2 = g.get(x + i, y + j); if (c2) g.set(x + i, y + j, dk(c2, 0.14)); }
  }
  hl(g, x, y, w, M[3]); hl(g, x, y + 1, w, M[1]);
  for (i = 6 + ri(r, 0, 10); i < w - 4; i += 38) { fill(g, x + i, y - 3, 3, h + 3, M[2]); vl(g, x + i, y - 3, h + 3, M[4]); vl(g, x + i + 2, y - 3, h + 3, M[0]); }
  for (i = 1; i < w - 3; i += 3) { pt(g, x + i, y - 2 + (i % 6 === 1 ? 0 : 1), M[3]); }                  // alambre de puas sobre el cerco
  hl(g, x, y + h - 1, w, M[0]);
}
function buildContenedores(f) {
  var D = dimsOf(f), W = D.W, H = D.H, side = f.side === 'S' ? 'S' : 'N', seed = f.seed || 1;
  var r = rngf(seed * 2999 + 11), rr = rngf(seed * 41 + 9), dmg = f.damage || 1, lights = [];
  var g = new G(W, H), i, x;
  dirtGround(g, 0, 0, W, H, rr, {});
  // bandas viales amarillas gastadas en el piso del patio
  for (x = 6; x < W - 10; x += 24) if (r() < 0.5) hl(g, x, H - 8, 14, to(C.tierra[1], C.amarillo[2], 0.5));
  var prefixes = ['BMRU', 'MPCU', 'CSVU', 'ALNU', 'TRBU', 'GALU'];   // v0.4 #7: sin ACHU; prefijos inventados
  function code() { return pick(r, prefixes) + ' ' + ri(r, 100, 999) + ' ' + ri(r, 0, 9); }
  var yb1 = side === 'S' ? H - 3 : H - 6, topLimit = side === 'S' ? 10 : 4;
  var maxL = Math.max(1, Math.floor((yb1 - topLimit - ROOFH) / LVH));
  var boxes = [], cx = 3 + ri(r, 0, 6), bigDone = false, openDone = false, firstCode = f.name && /^[A-Z]{4} \d{3} \d$/.test(f.name) ? f.name.replace(/^ACHU/, 'BMRU') : null;
  var cols = [];
  while (cx < W - 36) {
    var remain = W - 3 - cx, kind = (remain >= 98 && r() < 0.72) ? 'side' : (remain >= 39 ? 'end' : null);
    if (!kind) break;
    var cw = kind === 'side' ? 98 : 39;
    cols.push({ kind: kind, x: cx, w: cw }); cx += cw + ri(r, 4, 10);
  }
  // reparto de sobrante a los pasillos
  if (cols.length > 1) { var used = cols[cols.length - 1].x + cols[cols.length - 1].w, extra = Math.max(0, W - 3 - used), per = Math.floor(extra / (cols.length - 1)); cols.forEach(function (c, k) { c.x += per * k; }); }
  var items = [];
  cols.forEach(function (c, k) {
    var L1 = ri(r, 1, maxL), pals = [CPAL[pick(r, CKEYS)], CPAL[pick(r, CKEYS)], CPAL[pick(r, CKEYS)]];
    if (f.color === 'oxido' && r() < 0.5) pals[0] = CPAL.rojo;
    var cds = [firstCode || code(), code(), code()]; firstCode = null;
    var back = null;
    if (L1 <= 2 && r() < 0.8) {
      var L2 = r() < 0.5 ? 2 : 1, top2 = topLimit + ri(r, 0, 8), base2 = top2 + ROOFH + L2 * LVH, frontTop = yb1 - (ROOFH + L1 * LVH);
      if (base2 <= yb1 - 8 && top2 + 14 < frontTop) back = { L: L2, yb: base2, dx: ri(r, -6, 10) };
    }
    items.push({ kind: c.kind, x: c.x, yb: yb1, L: L1, pals: pals, codes: cds, back: back, front: true });
    if (back) items.push({ kind: c.kind, x: Math.max(2, Math.min(W - c.w - 2, c.x + back.dx)), yb: back.yb, L: back.L, pals: [CPAL[pick(r, CKEYS)], CPAL[pick(r, CKEYS)]], codes: [code(), code()], front: false });
  });
  items.sort(function (a, b) { return a.yb - b.yb || a.x - b.x; });
  var bigIdx = items.findIndex(function (it) { return it.kind === 'side' && it.front; });
  items.forEach(function (it, k) {
    var o = { dmg: dmg };
    if (k === bigIdx) { o.big = ['BRUMAMAR', 'MARPAC', 'COSTAVELA', 'ANDESLINE'][seed % 4]; }   // una sola palabra grande por lote
    if (it.kind === 'end' && !openDone && it.front && it.L === 1) { o.open = true; openDone = true; }
    if (it.kind === 'side') conSide(g, it.x, it.yb, it.L, it.pals, it.codes, r, o); else conEnd(g, it.x, it.yb, it.L, it.pals, it.codes, r, o);
  });
  if (!items.length) { }
  // mastil con reflector
  var mx = ri(r, 4, W - 8);
  if (side === 'S') {
    // cerco de malla por detras (borde norte)
    meshFence(g, 0, 0, W, 9, r);
    darken(g, 0, 9, W, 1, 0.3);
    fill(g, 0, 0, 2, H, C.gris[3]); vl(g, 0, 0, H, C.gris[4]); fill(g, W - 2, 0, 2, H, C.gris[1]); vl(g, W - 1, 0, H, C.gris[0]);
    lights.push({ x: Math.round(W * 0.15), y: 8, kind: 'foco' });
    vl(g, Math.round(W * 0.15), 0, 10, C.metal[1]); fill(g, Math.round(W * 0.15) - 1, 1, 5, 3, C.metal[3]); pt(g, Math.round(W * 0.15) + 1, 4, PAL.lamp);
    return outOf(g, lights);
  }
  // lado N: cerco de malla al frente, con chapa de aviso y portoncito
  var fh = 20, fy = H - fh;
  meshFence(g, 0, fy, W, fh, r);
  fill(g, 0, H - 4, W, 4, to(C.tierra[1], C.tierra[0], 0.25)); dith(g, 0, H - 5, W, 1, C.tierra[0], 0.5);
  var sx = ri(r, 8, Math.max(9, W - 70));
  fill(g, sx - 1, fy + 3, 56, 11, C.metal[1]); placaTexto(g, sx, fy + 4, 54, 'SOLO PERSONAL', PAL.sign, '#1c1a22', C.amarillo[1]);
  aoBase(g, 0, H, W);
  fill(g, 0, 0, 1, H, C.gris[3]); fill(g, W - 1, 0, 1, H, C.gris[1]);
  lights.push({ x: Math.round(W * 0.82), y: fy - 8, kind: 'foco' });
  return outOf(g, lights);
}
S.lotArch.contenedores = function (f) { return buildContenedores(f); };

/* ============================== OFICINA VIEJA Y FABRICA ============================== */
function pCajaEscAd(g, cx, yb, r) {                      // caja de escalera con un aviso de cerveza pintado a brocha en la pared (44 de ancho)
  var G_ = C.gris, x0 = cx - 22, w = 44, Lt = ACH.letreros;
  castShadow(g, x0, yb, w, 20, 0.3);
  fill(g, x0, yb - 14, w, 14, G_[2]); hl(g, x0, yb - 14, w, G_[4]); vl(g, x0, yb - 14, 14, G_[3]); vl(g, x0 + w - 1, yb - 14, 14, G_[1]);
  fill(g, x0 - 1, yb - 18, w + 2, 5, G_[3]); hl(g, x0 - 1, yb - 18, w + 2, G_[4]); hl(g, x0 - 1, yb - 14, w + 2, G_[1]);
  var dxx = x0 + w - 11;
  fill(g, dxx, yb - 11, 7, 11, C.metal[1]); vl(g, dxx, yb - 11, 11, C.metal[3]); pt(g, dxx + 5, yb - 5, PAL.sign); hl(g, dxx, yb - 12, 7, G_[0]);
  if (Lt && Lt.ad) Lt.ad(g, 'pilsen', x0 + 3, yb - 13, 31, 11, { rnd: r || Math.random, wear: 0.9 });
  hl(g, x0, yb - 1, w, G_[0]); stainTo(g, x0, yb - 9, w, 8, G_[0], 0.3, 0.5);
}
PROPS.cajaEscAd = { w: 46, h: 20, fn: pCajaEscAd };
function pCajaEsc(g, cx, yb) {                          // caja de escalera de la azotea
  var G_ = C.gris;
  castShadow(g, cx - 11, yb, 22, 20, 0.3);
  fill(g, cx - 11, yb - 14, 22, 14, G_[2]); hl(g, cx - 11, yb - 14, 22, G_[4]); vl(g, cx - 11, yb - 14, 14, G_[3]); vl(g, cx + 10, yb - 14, 14, G_[1]);
  fill(g, cx - 12, yb - 18, 24, 5, G_[3]); hl(g, cx - 12, yb - 18, 24, G_[4]); hl(g, cx - 12, yb - 14, 24, G_[1]);
  fill(g, cx - 3, yb - 11, 7, 11, C.metal[1]); vl(g, cx - 3, yb - 11, 11, C.metal[3]); pt(g, cx + 2, yb - 5, PAL.sign); hl(g, cx - 3, yb - 12, 7, G_[0]);
  hl(g, cx - 11, yb - 1, 22, G_[0]); stainTo(g, cx - 11, yb - 9, 22, 8, G_[0], 0.3, 0.5);
}
PROPS.cajaEsc = { w: 26, h: 20, fn: pCajaEsc };
function chimney(g, cx, yb, h, w0) {
  var B = C.ladrillo, w1 = w0 - 4, i, j;
  castShadow(g, cx - w0 / 2, yb, w0, Math.min(h, 60), 0.28);
  for (j = 0; j < h; j++) {
    var t = j / h, ww = Math.round(w0 - (w0 - w1) * t), y = yb - 1 - j;
    for (i = 0; i < ww; i++) {
      var u = i / (ww - 1), L = 3.3 - 2.4 * u + ((j % 14) < 2 ? 0.5 : 0) - ((j + i * 3) % 7 === 0 ? 0.5 : 0);
      var course = Math.floor(j / 3) % 2, jx = (i + (course ? 2 : 0)) % 5 === 0 || j % 3 === 2;
      g.set(cx - (ww >> 1) + i, y, B[Math.max(0, Math.min(4, Math.round(L - (jx ? 0.8 : 0))))]);
    }
  }
  var tw = w1 + 2, ty = yb - h;
  fill(g, cx - (tw >> 1), ty - 3, tw, 3, B[3]); hl(g, cx - (tw >> 1), ty - 3, tw, B[4]); hl(g, cx - (tw >> 1), ty - 1, tw, B[0]);
  fill(g, cx - (w1 >> 1) + 1, ty - 4, w1 - 2, 1, '#1c1a22');
  for (j = 6; j < 18; j++) { fill(g, cx - (w1 >> 1), ty + j, w1, 1, j % 6 < 3 ? '#e8e3cf' : B[1]); }          // anillos pintados, desteñidos
  stainTo(g, cx - (w1 >> 1), ty + 6, w1, 12, '#2a2630', 0.3, 0.5);
  for (i = 0; i < 3; i++) wetDrip(g, cx - (w1 >> 1) + 1 + i * 2, ty, ri(Math.random, 10, 26), 0.3);
  fill(g, cx - (w0 >> 1) - 1, yb - 4, w0 + 2, 4, C.gris[2]); hl(g, cx - (w0 >> 1) - 1, yb - 4, w0 + 2, C.gris[4]);
}
function brickWall(g, x0, y0, w, h, r, o) {
  o = o || {};
  var B = C.ladrillo, i, j;
  fill(g, x0, y0, w, h, B[2]);
  for (j = 0; j < h; j++) {
    if (j % 3 === 2) hl(g, x0, y0 + j, w, B[1]);
    else { var off = (Math.floor(j / 3) % 2) * 4; for (i = off; i < w; i += 8) pt(g, x0 + i, y0 + j, B[1]); }
  }
  for (i = 0; i < w * h / 11; i++) { var bx = x0 + Math.floor(r() * w), by = y0 + Math.floor(r() * h); if (by % 3 !== 2) { var c = r() < 0.5 ? B[3] : B[1]; hl(g, bx, by, ri(r, 2, 5), c); } }
  // pilares y vigas de concreto a la vista cada 3 tiles
  var step = o.step || 48;
  for (var px_ = o.off === undefined ? 0 : o.off; px_ < w; px_ += step) {
    fill(g, x0 + px_, y0, 5, h, C.gris[2]); vl(g, x0 + px_, y0, h, C.gris[4]); vl(g, x0 + px_ + 4, y0, h, C.gris[1]); darken(g, x0 + px_ + 5, y0, 2, h, 0.14);
    for (j = 3; j < h - 4; j += 6) pt(g, x0 + px_ + 2, y0 + j, C.gris[1]);
  }
}
function officeWindow(g, x, y, state, lights, r) {       // 18x16 con marco de aluminio
  var M = C.metal, V = C.vidrio, i;
  fill(g, x - 1, y - 1, 20, 18, M[1]); hl(g, x - 1, y - 1, 20, M[4]); vl(g, x - 1, y - 1, 18, M[3]); vl(g, x + 18, y - 1, 18, M[0]); hl(g, x - 1, y + 16, 20, M[0]);
  fill(g, x, y, 18, 16, V[2]); fill(g, x, y, 18, 6, V[3]);
  for (i = 0; i < 4; i++) { pt(g, x + 3 + i * 3, y + 5 - i, V[4]); pt(g, x + 4 + i * 3, y + 5 - i, V[4]); }
  vl(g, x + 9, y, 16, M[2]); hl(g, x, y + 7, 18, M[2]);
  if (state === 1) { fill(g, x + 1, y + 1, 7, 9, '#d8d0b8'); for (i = 0; i < 4; i++) vl(g, x + 2 + i * 2, y + 1, 9, '#b9b09a'); }          // cortina
  else if (state === 2) { fill(g, x + 1, y + 1, 8, 14, '#10121a'); g.line(x + 3, y + 3, x + 7, y + 11, V[4]); g.line(x + 7, y + 4, x + 2, y + 10, V[4]); fill(g, x + 10, y + 1, 7, 6, '#10121a'); pt(g, x + 9, y + 7, V[4]); }
  else if (state === 3) { for (i = 0; i < 4; i++) { fill(g, x, y + i * 4, 18, 3, C.madera[2]); hl(g, x, y + i * 4, 18, C.madera[3]); hl(g, x, y + i * 4 + 2, 18, C.madera[0]); } }
  else if (state === 4) { fill(g, x + 1, y + 1, 16, 14, '#e6c07a'); fill(g, x + 1, y + 9, 16, 6, '#d6a85a'); vl(g, x + 9, y + 1, 14, M[2]); hl(g, x + 1, y + 7, 16, M[2]); fill(g, x + 3, y + 8, 4, 7, '#7a5a45'); lights.push({ x: x + 1, y: y + 1, w: 16, h: 14, kind: 'local' }); }
  else if (state === 5) {                                                            // aire acondicionado de ventana
    fill(g, x + 2, y + 6, 14, 9, '#b9bcc2'); hl(g, x + 2, y + 6, 14, '#eceee9'); hl(g, x + 2, y + 14, 14, '#5f6270'); for (i = 0; i < 4; i++) hl(g, x + 4, y + 8 + i * 2, 10, '#8c909c');
    wetDrip(g, x + 5, y + 16, 8, 0.4); wetDrip(g, x + 11, y + 16, 6, 0.4);
  }
  fill(g, x - 2, y + 17, 22, 2, C.gris[4]); hl(g, x - 2, y + 19, 22, C.gris[1]); darken(g, x - 1, y + 20, 20, 2, 0.28);      // alfeizar y su sombra
}
/* v0.6 letreros: empresa inventada por lote (nombres de naviera de los contenedores; ninguna es real) y su valla de azotea */
var CO_BY_LOT = { N5: 'andesline', S5: 'brumamar', S6: 'costavela', S7: 'marpac' };
function coKey(f) { return CO_BY_LOT[f.id] || ['andesline', 'marpac', 'brumamar', 'costavela'][(f.seed || 0) % 4]; }
/* cartel de lote sobre dos estacas (CUIDADO PERRO BRAVO, SE NECESITA PERSONAL): draw(g, x, y) pinta la tarjeta de w x h; yb = pie de las estacas. Devuelve la caja que ocupa. */
function roofStake(g, x, yb, w, h, draw) {
  var top = yb - 8 - h;
  castShadow(g, x + 2, yb, w, h + 6, 0.28);
  fill(g, x + 6, yb - 9, 3, 9, C.madera[2]); vl(g, x + 6, yb - 9, 9, C.madera[3]); vl(g, x + 8, yb - 9, 9, C.madera[0]);
  fill(g, x + w - 10, yb - 9, 3, 9, C.madera[2]); vl(g, x + w - 10, yb - 9, 9, C.madera[3]); vl(g, x + w - 8, yb - 9, 9, C.madera[0]);
  draw(g, x, top);
  return [x - 2, top - 3, w + 8, h + 14];
}
/* valla de empresa sobre una azotea: devuelve la caja que ocupa (con sombra) para que las piezas de azotea se aparten, o null */
function roofValla(g, key, x, board_y, w, h, yb) {
  var Lt = ACH.letreros;
  if (!Lt || !Lt.valla || !Lt.COS || !Lt.COS[key]) return null;
  Lt.valla(g, key, x, board_y, w, h, yb);
  return [x - 3, board_y - 3, w + 10, yb - board_y + 8];
}
function buildOficina(f) {
  var D = dimsOf(f), W = D.W, H = D.H, side = f.side === 'S' ? 'S' : 'N', seed = f.seed || 1;
  var r = rngf(seed * 3571 + 17), rr = rngf(seed * 23 + 5), dmg = f.damage || 1, lights = [];
  var g = new G(W, H), wr = wallRampFor(f.color || 'ocre'), i, x;
  var pool = ['antena', 'tanque', 'cajaEsc', 'bidones', 'antena'];
  if (side === 'S') {
    roofLosa(g, 0, 0, W, H, rr, { dmg: dmg, wr: wr });
    var nm = roofNames(f, pool, r, 3); if (nm.indexOf('cajaEsc') < 0 && W >= 80) nm.unshift('cajaEsc');
    if (W >= 120) nm = nm.map(function (k) { return k === 'cajaEsc' ? 'cajaEscAd' : k; });         // la caja de escalera lleva un aviso de cerveza pintado
    var svw = 64, svx = (seed & 1) ? 12 : W - svw - 14, sbox = W >= 100 ? [svx - 3, H - 60, svw + 10, 44] : null;
    placeProps(g, nm, { x: 4, y: 6, w: W - 8, h: H - 14 }, rr, sbox ? [sbox] : null, 2);
    if (sbox) roofValla(g, coKey(f), svx, H - 54, svw, 24, H - 24);
    if (f.name || (f.front || []).indexOf('panel') >= 0) { /* sin cartel */ }
    return outOf(g, lights);
  }
  var floors = Math.max(1, Math.min(3, f.floors || 1)), faceT = Math.max(3, f.face || (1 + 2 * floors)), faceH = Math.min(H, faceT * 16), faceY = H - faceH;
  var rh = faceY;
  if (rh > 8) {
    roofLosa(g, 0, 0, W, rh, rr, { dmg: dmg, wr: wr });
    var nm2 = roofNames(f, pool, r, 3); if (nm2.indexOf('cajaEsc') < 0 && floors > 1 && W >= 80 && rh > 40) nm2.push('cajaEsc');
    var vbw = Math.min(68, W - 20), vbx = (seed & 1) ? 8 : W - vbw - 10, vbox = rh >= 50 ? [vbx - 3, rh - 42, vbw + 10, 40] : null;      // valla de empresa pegada al muro de la fachada
    placeProps(g, nm2, { x: 4, y: 6, w: W - 8, h: rh - 14 }, rr, vbox ? [vbox] : null, 2);
    if (vbox) roofValla(g, coKey(f), vbx, rh - 34, vbw, 24, rh - 6);
  }
  // muro pintado, con losas y pilares de concreto
  var up = Math.floor((faceH - 48) / 32);
  fill(g, 0, faceY, W, faceH, wr[2]);
  for (i = 0; i < W * faceH / 22; i++) { var nx = Math.floor(r() * W), ny = faceY + Math.floor(r() * faceH); if (bay(nx, ny) < 2) hl(g, nx, ny, ri(r, 2, 6), r() < 0.5 ? wr[1] : wr[3]); }
  var n = Math.max(2, Math.round(W / 32)), slot = W / n, cols = [];
  for (i = 0; i <= n; i++) cols.push(Math.round(i * slot));
  coping(g, 0, faceY, W, wr);
  for (var fl = 0; fl < up; fl++) {
    var fy0 = faceY + 6 - 0 + fl * 32 - 0;            // el piso mas alto va arriba: fl 0 = el de arriba
    var y0 = faceY + 4 + fl * 32;                      // inicio de la zona del piso (despues de la cornisa del primero)
    var wy = y0 + 6, win = 0;
    // losa (viga de concreto) al pie de cada piso
    var slabY = y0 + 28;
    fill(g, 0, slabY, W, 4, C.gris[3]); hl(g, 0, slabY, W, C.gris[4]); hl(g, 0, slabY + 3, W, C.gris[1]); darken(g, 0, slabY + 4, W, 2, 0.25);
    for (i = 0; i < n; i++) {
      var wx = Math.round(cols[i] + (slot - 18) / 2), st = 0, rv = r();
      if (rv < 0.12 * dmg) st = 2; else if (rv < 0.12 * dmg + 0.1) st = 3; else if (rv < 0.12 * dmg + 0.28) st = 1; else if (rv < 0.12 * dmg + 0.4) st = 5; else if (rv < 0.12 * dmg + 0.46) st = 4;
      officeWindow(g, wx, wy, st, lights, r);
    }
  }
  // pilares entre ventanas (concreto a la vista)
  cols.forEach(function (cx, k) { var pw = (k === 0 || k === n) ? 3 : 5, pxx = k === 0 ? 0 : (k === n ? W - pw : cx - 2); fill(g, pxx, faceY, pw, faceH - 6, C.gris[2]); vl(g, pxx, faceY, faceH - 6, C.gris[4]); vl(g, pxx + pw - 1, faceY, faceH - 6, C.gris[1]); darken(g, pxx + pw, faceY, 2, faceH - 6, 0.12); });
  // planta baja
  var gy0 = H - 48, floorY = H;
  fill(g, 0, floorY - 6, W, 6, to(wr[1], C.gris[1], 0.5)); hl(g, 0, floorY - 6, W, wr[2]);
  var bcol = [C.azul, C.rojo, C.verde][seed % 3], by = gy0 + 4;
  fill(g, 4, by, W - 8, 10, bcol[2]); hl(g, 4, by, W - 8, bcol[3]); hl(g, 4, by + 9, W - 8, bcol[0]);
  var LtO = ACH.letreros, coO = LtO && LtO.COS ? LtO.COS[coKey(f)] : null;
  var title = (f.name && f.name.length ? f.name : (coO ? coO.name : 'OFICINAS')).toUpperCase(), tf = measure(title, 'a7') <= W - 20 ? 'a7' : 'a5';
  text(g, title, Math.floor(W / 2), by + (tf === 'a7' ? 2 : 3), { font: tf, ink: bcol === C.azul ? PAL.sign : '#f3efe2', shadow: tf === 'a7' ? bcol[0] : null, align: 'c' });
  // puerta de vidrio con reja, vitrinas y el aviso SE ALQUILA
  var dx = cols[1] > 20 ? Math.round(cols[1] - 8) : 12;
  fill(g, dx - 1, H - 35, 18, 35, C.metal[0]); fill(g, dx, H - 34, 16, 34, C.vidrio[2]); fill(g, dx, H - 34, 16, 10, C.vidrio[3]); vl(g, dx + 8, H - 34, 34, C.metal[2]);
  for (i = 0; i < 4; i++) hl(g, dx, H - 31 + i * 8, 16, C.metal[1]); pt(g, dx + 6, H - 17, C.metal[4]); pt(g, dx + 10, H - 17, C.metal[4]);
  var Lh = ACH.letreros && ACH.letreros.hand && ACH.letreros.hand.cochera ? ACH.letreros.hand : null, cardW = 47, cardX = Math.max(dx + 20, 4), hasCard = !!(Lh && W >= 90 && cardX + cardW <= W - 4);
  for (i = 1; i < n; i++) {
    var vx = Math.round(cols[i] + (slot - 18) / 2);
    if (Math.abs(vx - dx) < 22 || vx + 18 > W - 4) continue;
    if (hasCard && vx + 18 > cardX - 3 && vx < cardX + cardW + 3) continue;
    officeWindow(g, vx, H - 30, r() < 0.25 ? 2 : 0, lights, r);
  }
  var sx = Math.max(4, Math.min(W - 44, dx + 22));
  if (hasCard) Lh.cochera(g, cardX, H - 32, {});                                  // chapa esmaltada PROHIBIDO ESTACIONAR - COCHERA, al lado de la puerta
  else if (W >= 80) { fill(g, sx, gy0 + 15, 42, 11, '#d8d0b8'); hl(g, sx, gy0 + 15, 42, '#f3efe2'); hl(g, sx, gy0 + 25, 42, '#9a8f7b'); text(g, 'SE ALQUILA', sx + 21, gy0 + 18, { font: 'a5', ink: '#8f3a32', align: 'c' }); pt(g, sx + 1, gy0 + 15, '#6b6c70'); pt(g, sx + 40, gy0 + 15, '#6b6c70'); }
  // cables, medidor y desgaste
  var mx = hasCard ? Math.max(6, dx - 16) : W - 12;                                // el medidor se corre al otro lado de la puerta si hay chapa
  fill(g, mx, H - 26, 6, 8, C.metal[1]); hl(g, mx, H - 26, 6, C.metal[4]); pt(g, mx + 2, H - 23, PAL.sign);
  for (i = 0; i < 3; i++) vl(g, mx + 1 + i * 2, H - 34, 8, '#1c1a22');
  salitre(g, 0, H - 6, W, 9, r, '#e2dfd2', 0.5);
  for (i = 0; i < 3 + dmg * 2; i++) wetDrip(g, 5 + Math.floor(r() * (W - 10)), faceY + 5, ri(r, 10, 26), 0.22);
  for (i = 0; i < nbolts(W); i++) { var bx2 = 6 + Math.floor(r() * (W - 12)); rustDrip(g, bx2, faceY + 5 + ri(r, 0, 20), ri(r, 6, 14), r, 0.6); }
  aoBase(g, 0, H, W);
  vl(g, 0, faceY, faceH, wr[4]); vl(g, W - 1, faceY, faceH, wr[0]);
  return outOf(g, lights);
}
function nbolts(W) { return Math.floor(W / 40); }
S.lotArch.oficina = function (f) { return buildOficina(f); };

function buildFabrica(f) {
  var D = dimsOf(f), W = D.W, H = D.H, side = f.side === 'S' ? 'S' : 'N', seed = f.seed || 1;
  var r = rngf(seed * 1237 + 3), rr = rngf(seed * 29 + 7), dmg = f.damage || 1, lights = [];
  var g = new G(W, H), wr = C.ladrillo, i, x, M = C.metal;
  var cxm = ri(r, 14, Math.max(15, W - 14));
  if (side === 'S') {
    roofDientes(g, 0, 0, W, H, rr, { dmg: dmg, wr: wr, ramp: r() < 0.4 ? C.metal : C.sheet });
    chimney(g, cxm, H - 10, Math.min(H - 14, 52), 10);
    placeProps(g, roofNames(f, ['cajaEsc'], r, 0), { x: 4, y: 6, w: W - 8, h: H - 14 }, rr);
    if (W >= 120) {                                                          // vallas de azotea: la empresa (lado opuesto a la chimenea) y el aviso de contratacion
      var fvw = 64, fvx = cxm > W / 2 ? 10 : W - fvw - 12;
      roofValla(g, coKey(f), fvx, H - 56, fvw, 26, H - 24);
      var Lh = ACH.letreros, pw2 = 54, px2 = cxm > W / 2 ? 14 : W - pw2 - 14;                       // el aviso va arriba (la chimenea solo llega hasta la mitad)
      if (Lh && Lh.COS) roofValla(g, 'personal', px2, 12, pw2, 24, 44);
    }
    return outOf(g, lights);
  }
  var faceT = Math.max(4, f.face || 4), faceH = Math.min(H, faceT * 16), faceY = H - faceH, rh = faceY;
  if (rh > 12) { roofDientes(g, 0, 0, W, rh, rr, { dmg: dmg, wr: wr, ramp: r() < 0.4 ? C.metal : C.sheet }); chimney(g, cxm, rh - 8, Math.min(rh - 12, 70), 11); }
  brickWall(g, 0, faceY, W, faceH, r, { step: 48, off: 20 });
  coping(g, 0, faceY, W, C.gris.length ? wr : wr);
  // cornisa y viga superior de concreto con ventanales de acero en banda
  var wy = faceY + 8, wh = 18;
  fill(g, 0, wy - 3, W, 3, C.gris[3]); hl(g, 0, wy - 3, W, C.gris[4]); hl(g, 0, wy - 1, W, C.gris[1]);
  fill(g, 3, wy, W - 6, wh, '#10121a');
  for (x = 3; x < W - 3; x += 12) {
    var ww = Math.min(11, W - 3 - x);
    var st = r() < 0.07 * dmg ? 1 : 0;
    for (var py = 0; py < 3; py++) for (var pxx = 0; pxx < ww; pxx += 5) {
      var pw = Math.min(5, ww - pxx), c = st && r() < 0.45 ? '#10121a' : (py === 0 ? C.vidrio[3] : C.vidrio[2]);
      fill(g, x + pxx, wy + py * 6, pw, 5, c); if (c !== '#10121a') pt(g, x + pxx + 1, wy + py * 6 + 1, C.vidrio[4]);
    }
    for (var k = 0; k < 4; k++) hl(g, x, wy + k * 6 - (k ? 1 : 0), ww, M[1]);
    vl(g, x + ww, wy, wh, M[1]);
  }
  fill(g, 0, wy + wh, W, 3, C.gris[2]); hl(g, 0, wy + wh, W, C.gris[4]); hl(g, 0, wy + wh + 2, W, C.gris[0]); darken(g, 0, wy + wh + 3, W, 2, 0.3);
  // muelles de carga: dos persianas enrollables de 32 x 34 con su caja
  var n = Math.max(1, Math.min(3, Math.floor((W - 16) / 44))), gx0 = 12 + ri(r, 0, 8), gap = Math.floor((W - 24 - n * 34) / Math.max(1, n));
  for (i = 0; i < n; i++) {
    var gx = gx0 + i * (34 + gap), gyb = H - 1, gh = 34, open = r() < 0.25 + 0.15 * dmg, openH = open ? ri(r, 8, 18) : 0;
    fill(g, gx - 2, gyb - gh - 5, 36, gh + 6, C.gris[1]); hl(g, gx - 2, gyb - gh - 5, 36, C.gris[3]);
    fill(g, gx, gyb - gh - 3, 32, 4, M[1]); hl(g, gx, gyb - gh - 3, 32, M[3]); hl(g, gx, gyb - gh, 32, M[0]);
    for (var yy = gyb - gh + 1 + openH; yy < gyb - 2; yy += 3) { hl(g, gx, yy, 32, M[2]); hl(g, gx, yy + 1, 32, M[1]); hl(g, gx, yy + 2, 32, M[0]); }
    if (open) { fill(g, gx, gyb - gh + 1, 32, openH, '#1c1a22'); dith(g, gx, gyb - gh + openH - 3, 32, 3, '#2d2a36', 0.5); }
    fill(g, gx + 12, gyb - 5, 8, 3, M[4]); hl(g, gx, gyb - 2, 32, C.gris[0]);
    stainTo(g, gx, gyb - 14, 32, 12, RUST[2], 0.4, 0.5);
    fill(g, gx - 2, gyb - 3, 36, 3, C.gris[2]); hl(g, gx - 2, gyb - 3, 36, C.gris[4]);                     // pretil del anden
    lights.push({ x: gx + 8, y: gyb - gh + 2, w: 16, h: 10, kind: 'local' });
  }
  // nombre pintado y letrero de seguridad
  if (f.name) { var nmf = fitName(f.name, W - 16, 12, [['a12', 1], ['a7', 1]]); if (nmf) putName(g, nmf, W / 2, faceY + 28, { aged: true, ink: '#e8e3cf', ink2: '#b9a99a', fade: 0.3, r: r }); }
  placaTexto(g, W - 68, faceY + 30, 62, 'PROHIBIDO FUMAR', PAL.sign, '#1c1a22', C.amarillo[1]);
  for (i = 0; i < 4 + dmg * 2; i++) wetDrip(g, 5 + Math.floor(r() * (W - 10)), wy + wh + 3, ri(r, 10, 22), 0.24);
  for (i = 0; i < 4; i++) rustDrip(g, 8 + Math.floor(r() * (W - 16)), wy + wh + 3, ri(r, 6, 14), r, 0.7);
  salitre(g, 0, H - 3, W, 7, r, '#e2dfd2', 0.45);
  aoBase(g, 0, H, W);
  vl(g, 0, faceY, faceH, wr[4]); vl(g, W - 1, faceY, faceH, wr[0]);
  return outOf(g, lights);
}
S.lotArch.fabrica = function (f) { return buildFabrica(f); };

/* ============================== FICHAS DE PRUEBA (preview.html) ============================== */
var T = S.lotTests = S.lotTests || {};
function F(o) { var b = { id: 't', side: 'N', c0: 30, c1: 39, r0: 0, r1: 10, floors: 1, color: 'gris', name: '', damage: 1, seed: 100, roof: [], front: [] }; for (var k in o) b[k] = o[k]; return b; }
T.almacen = [
  F({ arch: 'almacen', c0: 50, c1: 59, face: 5, color: 'azul', name: 'CALLAO', mural: true, seed: 1 }),
  F({ arch: 'almacen', c1: 41, name: 'ALMACÉN NORTE 3', roofType: 'arco', seed: 31, damage: 2 }),
  F({ arch: 'almacen', c1: 35, name: 'FRIGORÍFICO LA BAHÍA', color: 'blanco', roofType: 'dosAguas', seed: 12, damage: 1 }),
  F({ arch: 'almacen', c1: 37, name: 'DEPÓSITO 12', color: 'verde', roofType: 'arco', seed: 7, damage: 3 }),
  F({ arch: 'almacen', c1: 39, name: 'ALMACÉN NORTE 3', color: 'ocre', roofType: 'losa', seed: 64, face: 4 }),
  F({ arch: 'almacen', side: 'S', r0: 39, r1: 45, c1: 41, name: 'DEPÓSITO 12', color: 'verde', roofType: 'arco', seed: 7, damage: 2 }),
  F({ arch: 'almacen', side: 'S', r0: 39, r1: 45, c1: 35, name: 'ALMACÉN NORTE 3', roofType: 'dosAguas', seed: 19 }),
  F({ arch: 'almacen', side: 'S', r0: 39, r1: 45, c1: 33, roofType: 'losa', seed: 23, roof: ['claraboyas', 'tanque'] })
];
T.taller = [
  F({ arch: 'taller', c1: 38, name: 'TALLER EL TUERCAS', color: 'cemento', damage: 3, seed: 5 }),
  F({ arch: 'taller', c1: 35, name: 'LLANTERÍA EL PARCHE', color: 'gris', damage: 2, seed: 17, r1: 6 }),
  F({ arch: 'taller', c1: 32, r1: 3, damage: 2, seed: 9 }),
  F({ arch: 'taller', side: 'S', r0: 39, r1: 45, c1: 39, name: 'TALLER EL TUERCAS', seed: 12, front: ['panel'] })
];
T.loteObra = [
  F({ arch: 'loteObra', c1: 32, r1: 3, damage: 3, seed: 4 }),
  F({ arch: 'loteObra', c1: 37, r1: 6, seed: 9 }),
  F({ arch: 'loteObra', c1: 39, r1: 10, seed: 21, damage: 2 }),
  F({ arch: 'loteObra', side: 'S', r0: 39, r1: 45, c1: 35, name: 'SE VENDE', seed: 12, damage: 3 })
];
T.contenedores = [
  F({ arch: 'contenedores', side: 'S', r0: 39, r1: 45, c1: 41, name: 'BMRU 301 7', color: 'oxido', damage: 2, seed: 5 }),
  F({ arch: 'contenedores', side: 'S', r0: 39, r1: 45, c1: 37, color: 'oxido', seed: 22 }),
  F({ arch: 'contenedores', c1: 41, r1: 6, color: 'oxido', seed: 8 })
];
T.oficina = [
  F({ arch: 'oficina', c1: 35, floors: 3, color: 'ocre', damage: 2, seed: 3 }),
  F({ arch: 'oficina', c1: 37, floors: 2, color: 'celeste', name: 'OFICINAS NORTE', damage: 1, seed: 14, r1: 8 }),
  F({ arch: 'oficina', side: 'S', r0: 39, r1: 45, c1: 37, floors: 1, color: 'ocre', seed: 3 })
];
T.fabrica = [
  F({ arch: 'fabrica', c1: 41, color: 'gris', damage: 2, seed: 5, name: 'FÁBRICA' }),
  F({ arch: 'fabrica', side: 'S', r0: 39, r1: 45, c1: 39, damage: 2, seed: 5 })
];
})();
