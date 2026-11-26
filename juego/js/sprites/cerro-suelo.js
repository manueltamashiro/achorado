/* ACHORADO - js/sprites/cerro-suelo.js  (v0.9, fase H4a)
 * Dueño: sprites (cerro, suelo). Se carga despues de objetos.js y antes de zombies.js. Usa ACH.px (base.js) y extiende ACH.sprites.
 * Nivel 2 «EL CERRO»: suelo seco, sin pasto ni hierba (decision del dueño). Paleta de diseno/investigacion-cerro.md (muestreada en fotos):
 *   arena #D2C2A8 / #CFB795 / #C4A683, sombra #A2947B; tierra terracota #B3825B (bajada un grado por la garua); roca #7B7870;
 *   pirca #81776A / #625C4D con juntas #403F30; escalera gris #A8A09A, pintada #E3B82A; trocha #CDBFA5, huellas #8E795F.
 *
 * TILES (16x16, 1 m = 16 px; luz NO, sombras al SE). Todos con ruido que se apaga en el borde: cualquier par de variantes encaja.
 *   tierra[4]  tierraPiedras[4]  arena[4]  roca[4]  trocha[4]  escaleraTierra[2]
 *   trocha:  0 pisada lisa, 1 huellas N-S (dos surcos verticales), 2 huellas E-O (surcos horizontales), 3 con piedritas.
 *   escaleraCerro[6]  suben hacia el norte (arriba de la pantalla), 2 peldanos por tile (huella 5 px, contrahuella 3 px):
 *      0 gris, 1 gris gastada, 2 amarilla (centro, sin baranda), 3 amarilla con baranda de tubo al oeste, 4 amarilla con baranda al este,
 *      5 amarilla con baranda a los dos lados (escalera de 1 tile). Escalera ancha: 3 + 2.. + 4.
 *   escaleraTierra[2]  peldanos de tierra con tablones y estacas.
 *   losa  cemento de losa deportiva (juntas en el borde N y O).  losaLinea[3]: 0 linea E-O, 1 linea N-S, 2 esquina (O-S).
 *   pircaFace[4]  cara de muro de piedra suelta (solido). Hiladas de 5/5/6 px fijas: apila sin costuras.
 *   muroContencion[3]  cemento con juntas de encofrado: 0 liso, 1 manchado y rajado, 2 pintado de blanco sucio y descascarado.
 *   muroLlantas  llantas llenas de tierra (patron periodico de 8 px).
 *   bordeTerraza (+ bordeTerrazaCemento, bordeTerrazaLlantas)  tile que va en la fila de ARRIBA de la cara del muro: 6 px de tierra de
 *      la terraza, la corona del muro y la ultima hilada de la cara.
 * DECALS (ancla ax,ay = centro inferior, sin colision)
 *   cal[3]   hileras de piedras pintadas de cal: 0 horizontal 64x9, 1 vertical 9x48, 2 esquina 32x28.
 *   charcoCerro[2]  charco sobre tierra (0 normal 28x13, 1 grande 46x20). NO se llama `charco`: esa clave es del nivel 1 (calle.js).
 *   basuraSuelta[3]  bolsas rotas, botellas, latas, carton.   polvo  nube de polvo ocre.   restosTele  carcasa y vidrio de un tele roto.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px, S = ACH.sprites;
var G = px.G, rngf = px.rng, mix = px.mix;
var T = S.tiles = S.tiles || {};
var D = S.decals = S.decals || {};

/* ======================== PALETAS ======================== */
var AR = ['#9a8a70', '#a2947b', '#bba98a', '#cfb795', '#d2c2a8', '#e2d6bf'];            // arena
var TI = ['#4b372b', '#66503f', '#7d5f47', '#96775a', '#a98a6c', '#bda286'];            // tierra terracota apagada
var RO = ['#3a3a3a', '#5d5b5a', '#6e6b66', '#7b7870', '#948f85', '#aaa69b', '#c2beb4'];  // roca gris parda
var PO = ['#8e795f', '#a89479', '#bfae92', '#cdbfa5', '#d6cab3', '#e0d6c2'];            // polvo de trocha
var PI = ['#403f30', '#625c4d', '#81776a', '#9a8f80', '#b3a999'];                       // pirca
var CE = ['#5a5448', '#6f6651', '#8a8479', '#a8a09a', '#bdb6ac', '#cfc9bf'];            // cemento
var YE = ['#7f6420', '#a8872a', '#c4a032', '#d4b03a', '#e2c76a'];                       // amarillo de pintura
var WD = ['#3e2a1e', '#5f4a33', '#8f7350', '#b89a6c', '#c9ae80'];                       // tablones
var SHV = '#2a2440';                                                                     // violeta de sombra

/* ======================== UTILIDADES (mismas tecnicas que calle.js) ======================== */
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function hash2(i, j, s) {
  var h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}
function vnoise(seed, cell) {
  return function (x, y) {
    var u = x / cell, v = y / cell, i = Math.floor(u), j = Math.floor(v), fu = smooth(u - i), fv = smooth(v - j);
    var a = hash2(i, j, seed), b = hash2(i + 1, j, seed), c = hash2(i, j + 1, seed), d = hash2(i + 1, j + 1, seed);
    return (a + (b - a) * fu) * (1 - fv) + (c + (d - c) * fu) * fv;
  };
}
function tnoise(seed, cell) {              // reticula del borde del tile fija en 0,5: dos tiles vecinos cualquiera encajan
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
function hex8(c, a) { var v = clamp(Math.round(a * 255), 0, 255); return c + (v < 16 ? '0' : '') + v.toString(16); }
function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
function pick(r, a) { return a[Math.floor(r() * a.length)]; }

function mottle(seed, ramp, o) {
  o = o || {};
  var g = new G(16, 16), r = rngf(seed * 977 + 13);
  var n8 = tnoise(seed + 101, 8), n4 = tnoise(seed + 202, 4), n2 = tnoise(seed + 303, 2);
  var amp = o.amp === undefined ? 1 : o.amp, base = o.base === undefined ? 3 : o.base, bias = o.bias || 0;
  var gl = o.light === undefined ? 0.05 : o.light, gd = o.dark === undefined ? 0.045 : o.dark;
  var top = ramp.length - 1;
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
function shadePix(g, x, y, a) { var c = g.get(x, y); if (c) g.set(x, y, mix(c, SHV, a === undefined ? 0.3 : a)); }
/* piedra suelta sobre el suelo: luz NO (arriba-izquierda), contorno oscuro abajo-derecha y sombra SE sobre el suelo. */
function stone(g, x, y, w, h, pal, sh) {
  var i, j, c;
  for (i = 0; i < w; i++) shadePix(g, x + i + 1, y + h, 0.38);
  for (j = 1; j <= h; j++) shadePix(g, x + w, y + j, 0.38);
  if (sh !== false && w > 3) shadePix(g, x + w + 1, y + h, 0.2);
  for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
    if ((i === 0 || i === w - 1) && (j === 0 || j === h - 1) && w > 2 && h > 2) continue;
    c = pal[1];
    if (j === 0 || i === 0) c = pal[2];
    if (j === h - 1 || i === w - 1) c = pal[0];
    g.set(x + i, y + j, c);
  }
  if (w > 3 && h > 2) g.set(x + 1, y + 1, pal[2]);
}
var STN = [[RO[1], RO[4], RO[5]], [RO[0], RO[3], RO[5]], [RO[1], RO[3], RO[6]], [TI[1], TI[4], TI[5]], [PI[0], PI[2], PI[4]]];
function scatterStones(g, r, n, wmin, wmax, taken) {
  var tries = 0, placed = 0;
  while (placed < n && tries++ < 60) {
    var w = ri(r, wmin, wmax), h = Math.max(2, Math.round(w * 0.65)), x = ri(r, 1, 14 - w), y = ri(r, 1, 13 - h), ok = true;
    for (var k = 0; k < taken.length; k++) { var t = taken[k]; if (x < t[0] + t[2] + 2 && x + w + 2 > t[0] && y < t[1] + t[3] + 2 && y + h + 2 > t[1]) { ok = false; break; } }
    if (!ok) continue;
    taken.push([x, y, w, h]); stone(g, x, y, w, h, pick(r, STN)); placed++;
  }
}
function crumbs(g, r, n, cols) {
  for (var i = 0; i < n; i++) g.set(ri(r, 1, 14), ri(r, 1, 14), pick(r, cols));
}
function lipCrack(g, pts, core, lip) {                 // grieta quebrada con filo claro al sureste
  var mask = {}, i, s;
  for (i = 0; i < pts.length - 1; i++) {
    var a = pts[i], b = pts[i + 1], n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
    for (s = 0; s <= n; s++) mask[Math.round(a[0] + (b[0] - a[0]) * s / n) + ',' + Math.round(a[1] + (b[1] - a[1]) * s / n)] = 1;
  }
  Object.keys(mask).forEach(function (k) {
    var p = k.split(','), x = +p[0], y = +p[1];
    if (x < 1 || y < 1 || x > 14 || y > 14) return;
    g.set(x, y, core);
    if (!mask[(x + 1) + ',' + (y + 1)]) g.set(x + 1, y + 1, lip);
  });
}
function jag(r, a, b, n, step) {
  var pts = [a.slice()];
  for (var i = 1; i < n; i++) pts.push([a[0] + (b[0] - a[0]) * i / n + (r() - 0.5) * step, a[1] + (b[1] - a[1]) * i / n + (r() - 0.5) * step]);
  pts.push(b.slice());
  return pts.map(function (p) { return [Math.round(p[0]), Math.round(p[1])]; });
}
function toC(g) { return g.toCanvas(); }

/* ======================== TIERRA / ARENA / ROCA ======================== */
function tierraG(v) {
  var seed = 910 + v * 7, g = mottle(seed, TI, { amp: [0.8, 0.75, 0.85, 0.8][v], base: 3, bias: 0.02 }), r = rngf(seed * 31 + 5), taken = [];
  if (v === 1) { scatterStones(g, r, 2, 2, 3, taken); crumbs(g, r, 6, [TI[0], TI[5]]); }
  if (v === 2) { crumbs(g, r, 14, [TI[1], TI[1], TI[5], AR[3]]); stone(g, ri(r, 3, 10), ri(r, 3, 10), 4, 3, [TI[1], TI[3], TI[5]]); }
  if (v === 3) {                                                  // parche pisado y mas claro (rastro de gente)
    for (var y = 3; y < 13; y++) for (var x = 2; x < 14; x++) {
      var d = Math.sqrt(((x - 8) / 6) * ((x - 8) / 6) + ((y - 8) / 4.5) * ((y - 8) / 4.5));
      if (d < 1 && bay(x, y) < (1 - d) * 0.85) g.set(x, y, TI[4]);
    }
    crumbs(g, r, 5, [TI[1], TI[5]]);
  }
  return g;
}
T.tierra = [0, 1, 2, 3].map(function (v) { return toC(tierraG(v)); });

function tierraPiedrasG(v) {
  var seed = 930 + v * 11, g = mottle(seed, TI, { amp: 0.7, base: 3 }), r = rngf(seed * 17 + 3), taken = [];
  scatterStones(g, r, [4, 5, 3, 5][v], 2, v === 2 ? 5 : 4, taken);
  crumbs(g, r, 6, [TI[1], RO[5], TI[5]]);
  return g;
}
T.tierraPiedras = [0, 1, 2, 3].map(function (v) { return toC(tierraPiedrasG(v)); });

function arenaG(v) {
  var seed = 950 + v * 13, g = mottle(seed, AR, { amp: 0.55, base: 3, bias: 0.04, light: 0.03, dark: 0.03 }), r = rngf(seed * 7 + 1), i, k, x, y, taken = [];
  if (v === 1 || v === 2) {                                         // rizado del viento: trazos horizontales con filo claro arriba y sombra abajo
    for (i = 0; i < (v === 1 ? 2 : 3); i++) {
      var len = ri(r, 3, 5); x = ri(r, 2, 13 - len); y = ri(r, 2, 12);
      for (k = 0; k < len; k++) { g.set(x + k, y, AR[5]); if (k > 0 && k < len - 1) g.set(x + k, y + 1, AR[2]); }
    }
  }
  if (v === 3) { scatterStones(g, r, 2, 2, 3, taken); crumbs(g, r, 6, [AR[1], AR[5]]); }
  if (v === 0) crumbs(g, r, 6, [AR[1], AR[5]]);
  return g;
}
T.arena = [0, 1, 2, 3].map(function (v) { return toC(arenaG(v)); });

function rocaG(v) {
  var seed = 970 + v * 17, g = mottle(seed, RO, { amp: v === 0 ? 1.0 : 0.85, base: 3, light: 0.06, dark: 0.06 }), r = rngf(seed * 3 + 9), x, y;
  if (v === 1) { lipCrack(g, [jag(r, [3, 4], [12, 11], 4, 3)], RO[0], RO[5]); lipCrack(g, [jag(r, [7, 8], [4, 13], 2, 2)], RO[1], RO[4]); }
  if (v === 2) {
    lipCrack(g, [jag(r, [10, 3], [5, 6], 3, 2), jag(r, [5, 6], [8, 12], 3, 2)], RO[0], RO[5]);
    for (y = 1; y < 15; y++) for (x = 1; x < 15; x++) if (g.get(x, y) === RO[4] && r() < 0.18) g.set(x, y, RO[5]);   // lascas claras
  }
  if (v === 3) {                                                    // roca con arena soplada en las hendiduras
    for (y = 2; y < 14; y++) for (x = 2; x < 14; x++) {
      var d = Math.sqrt(((x - 9) / 5) * ((x - 9) / 5) + ((y - 9) / 3.5) * ((y - 9) / 3.5));
      if (d < 1 && (1 - d) * 0.9 > bay(x, y) * 0.55) g.set(x, y, d < 0.55 ? AR[2] : '#a79f8c');
    }
    g.set(8, 8, AR[4]); g.set(9, 9, AR[4]); g.set(10, 8, AR[1]);
  }
  return g;
}
T.roca = [0, 1, 2, 3].map(function (v) { return toC(rocaG(v)); });

function trochaG(v) {
  var seed = 990 + v * 19, g = mottle(seed, PO, { amp: 0.5, base: 3, light: 0.03, dark: 0.03 }), r = rngf(seed * 5 + 2), x, y, i;
  function rut(cx, vert) {                                          // surco angosto, interrumpido: oscuro con filo claro al sureste
    for (i = 0; i < 16; i++) {
      var gap = (i * 7 + cx * 3 + v) % 11 === 0 && i > 0 && i < 15;
      var a = vert ? cx : i, b = vert ? i : cx;
      if (!gap) { g.set(a, b, i % 4 === 2 ? PO[2] : PO[1]); g.set(vert ? a + 1 : a, vert ? b : b + 1, PO[2]); g.set(vert ? a + 2 : a, vert ? b : b + 2, PO[5]); }
    }
  }
  if (v === 1) { rut(4, true); rut(10, true); }
  if (v === 2) { rut(4, false); rut(10, false); }
  if (v === 3) { var tk = []; scatterStones(g, r, 3, 2, 3, tk); }
  if (v === 0) crumbs(g, r, 8, [PO[1], PO[5]]);
  return g;
}
T.trocha = [0, 1, 2, 3].map(function (v) { return toC(trochaG(v)); });

/* ======================== ESCALERAS ======================== */
/* Suben hacia el norte: de arriba abajo, huella (5 px) y contrahuella (3 px), dos peldanos por tile. */
function stairG(o) {
  var g = new G(16, 16), r = rngf(o.seed), yel = o.paint === 'amarilla', s, y, x;
  var TR = yel ? [YE[1], YE[3], YE[2], YE[4]] : [CE[2], CE[3], CE[2], CE[4]];            // contacto con la contrahuella de arriba, base, motas oscuras, borde claro
  var RS = yel ? [YE[2], YE[1], YE[0]] : [CE[2], CE[1], CE[0]];                          // contrahuella: de arriba (nariz) a abajo (contacto)
  for (s = 0; s < 2; s++) {
    var y0 = s * 8;
    for (x = 0; x < 16; x++) {
      g.set(x, y0, TR[0]);                                                              // fila de contacto
      for (y = 1; y <= 3; y++) g.set(x, y0 + y, r() < (yel ? 0.2 : 0.12) ? TR[2] : TR[1]);
      g.set(x, y0 + 4, TR[3]);                                                          // nariz iluminada
      g.set(x, y0 + 5, RS[0]); g.set(x, y0 + 6, RS[1]); g.set(x, y0 + 7, RS[2]);        // contrahuella
    }
    for (var k = 0; k < (o.wear || 2); k++) {                                           // desgaste: descascarado (amarilla muestra el cemento gris) o saltaduras
      var wx = ri(r, 2, 13), wy = y0 + ri(r, 1, 4), wl = ri(r, 1, 3);
      for (x = 0; x < wl; x++) g.set(wx + x, wy, yel ? CE[3] : CE[1]);
      g.set(wx + wl, wy + 1, yel ? YE[0] : CE[0]);
    }
    if (o.crack && s === o.crack - 1) { g.set(6, y0 + 2, CE[0]); g.set(7, y0 + 3, CE[0]); g.set(8, y0 + 3, CE[0]); g.set(9, y0 + 4, CE[1]); g.set(5, y0 + 1, CE[1]); }
  }
  if (o.railL) {                                                                       // baranda de tubo (0,9 m) al oeste: luz en la cara oeste
    for (y = 0; y < 16; y++) { g.set(0, y, YE[4]); g.set(1, y, YE[3]); g.set(2, y, YE[1]); }
    for (s = 0; s < 2; s++) {                                                          // postes con su sombra SE sobre los peldanos
      var py = s * 8 + 3;
      g.set(3, py, YE[1]); g.set(3, py + 1, YE[1]); g.set(3, py + 2, YE[0]); g.set(2, py + 1, YE[2]);
      shadePix(g, 4, py + 1, 0.35); shadePix(g, 4, py + 2, 0.35); shadePix(g, 5, py + 2, 0.22);
    }
    for (y = 0; y < 16; y += 2) shadePix(g, 3, y, 0.22);                              // sombra del tubo sobre las huellas
    for (y = 6; y < 11; y++) g.set(1, y, YE[4]);                                       // brillo del tubo
  }
  if (o.railR) {
    for (y = 0; y < 16; y++) { g.set(15, y, YE[1]); g.set(14, y, YE[2]); g.set(13, y, YE[3]); }
    for (s = 0; s < 2; s++) { var qy = s * 8 + 3; g.set(12, qy, YE[1]); g.set(12, qy + 1, YE[1]); g.set(12, qy + 2, YE[0]); g.set(13, qy + 1, YE[3]); }
    for (y = 6; y < 11; y++) g.set(13, y, YE[4]);
  }
  return g;
}
T.escaleraCerro = [
  stairG({ paint: 'gris', seed: 1010, wear: 2 }),
  stairG({ paint: 'gris', seed: 1011, wear: 4, crack: 2 }),
  stairG({ paint: 'amarilla', seed: 1012, wear: 3 }),
  stairG({ paint: 'amarilla', seed: 1013, wear: 3, railL: true }),
  stairG({ paint: 'amarilla', seed: 1014, wear: 3, railR: true }),
  stairG({ paint: 'amarilla', seed: 1015, wear: 3, railL: true, railR: true })
].map(toC);

function stairTierraG(v) {                                                              // peldanos de tierra apisonada con un tablon de contencion cada 8 px
  var g = new G(16, 16), r = rngf(1030 + v * 7), s, x, y;
  for (s = 0; s < 2; s++) {
    var y0 = s * 8;
    for (x = 0; x < 16; x++) {
      g.set(x, y0, PO[1]);
      for (y = 1; y <= 4; y++) g.set(x, y0 + y, r() < 0.14 ? PO[1] : (r() < 0.12 ? PO[4] : PO[2]));
      g.set(x, y0 + 5, v ? WD[2] : WD[3]); g.set(x, y0 + 6, v ? WD[1] : WD[2]); g.set(x, y0 + 7, WD[0]);
      if (r() < 0.2) g.set(x, y0 + 6, WD[0]);                                           // veta
    }
    g.rect(2, y0 + 4, 2, 4, WD[1]); g.set(2, y0 + 4, WD[3]); g.rect(12, y0 + 4, 2, 4, WD[1]); g.set(12, y0 + 4, WD[3]);   // estacas
    g.set(7 + v * 2, y0 + 5, WD[4]); g.set(8 + v * 2, y0 + 5, WD[4]);                   // clavos
    shadePix(g, 4, y0 + 4, 0.3); shadePix(g, 14, y0 + 4, 0.3);
  }
  return g;
}
T.escaleraTierra = [0, 1].map(function (v) { return toC(stairTierraG(v)); });

/* ======================== LOSA DEPORTIVA ======================== */
var LS = ['#8f8a80', '#a7a195', '#b9b3a6', '#c6c0b2', '#d3cdbf'];
function losaG(seed, plain) {
  var g = mottle(seed, LS, { amp: 0.35, base: 2, bias: 0.05, light: 0.02, dark: 0.02 }), r = rngf(seed + 4), x, y;
  for (x = 0; x < 16; x++) { g.set(x, 0, LS[0]); }                                      // junta N
  for (y = 0; y < 16; y++) { g.set(0, y, LS[0]); }                                      // junta O
  for (x = 1; x < 16; x++) g.set(x, 1, LS[4]);                                           // filo claro al sureste de la junta
  for (y = 1; y < 16; y++) g.set(1, y, LS[4]);
  if (plain) { g.set(8, 8, LS[1]); g.set(9, 8, LS[1]); g.set(9, 9, LS[1]); }            // mancha
  return g;
}
T.losa = toC(losaG(1050, true));
function losaLine(kind, seed) {
  var g = losaG(seed, false), r = rngf(seed * 3), x, y, LN = '#e8e2cc', LD = '#bfb79c';
  function mark(x, y) { var c = r() < 0.16 ? LD : LN; if (r() < 0.07) return; g.set(x, y, c); }
  if (kind === 0) { for (x = 0; x < 16; x++) { mark(x, 7); mark(x, 8); } }
  if (kind === 1) { for (y = 0; y < 16; y++) { mark(7, y); mark(8, y); } }
  if (kind === 2) { for (x = 0; x <= 8; x++) { mark(x, 7); mark(x, 8); } for (y = 8; y < 16; y++) { mark(7, y); mark(8, y); } }
  return g;
}
T.losaLinea = [0, 1, 2].map(function (k) { return toC(losaLine(k, 1060 + k * 5)); });

/* ======================== MUROS ======================== */
var COURSES = [[0, 5], [5, 5], [10, 6]];                    // hiladas de la pirca: la junta cae en la ultima fila de cada una
var EDGE_STONE = ['#81776a', '#9a8f80', '#74695c'];         // la piedra que cruza el borde del tile tiene color fijo por hilada: los tiles encajan
function pircaCourse(g, r, ci, y0, h, damp) {
  var b = [], x = ri(r, 2, 4), i, xa, xb, xx, yy;
  while (x <= 13) { b.push(x); x += ri(r, 5, 8); }
  var bk = b[b.length - 1], ys = y0 + h - 1;                // fila de junta
  var segs = [[0, b[0] - 1, 'L']];
  for (i = 1; i < b.length; i++) segs.push([b[i - 1] + 1, b[i] - 1, '']);
  segs.push([bk + 1, 15, 'R']);
  segs.forEach(function (sg) {
    xa = sg[0]; xb = sg[1];
    var straddle = sg[2] !== '';
    var base = straddle ? EDGE_STONE[ci] : pick(r, [PI[2], PI[3], PI[3], '#8a7f70', '#74695c', '#7c776c', '#948672', '#6f6a60']);
    var lit = px.mix(base, '#d4c9b8', 0.24), dk = px.mix(base, '#2a2440', 0.3);
    var rows = h - 1;
    for (yy = 0; yy < rows; yy++) for (xx = xa; xx <= xb; xx++) {
      var c = base;
      if (yy === 0) c = lit;
      else if (yy === rows - 1) c = dk;
      if (xx === xa && sg[2] !== 'L' && !(sg[2] === 'R' && false)) c = (yy === rows - 1) ? dk : lit;
      if (xx === xb && sg[2] !== 'R') c = dk;
      if (c === base && r() < 0.14) c = r() < 0.5 ? dk : lit;
      g.set(xx, y0 + yy, c);
    }
    if (!straddle || sg[2] === 'R') { if (r() < 0.5 && xb - xa > 2) g.set(xa, y0, '#403f30'); }          // esquina redondeada
    if (sg[2] !== 'R' && sg[2] !== 'L' && r() < 0.5 && xb - xa > 2) g.set(xb, y0, '#403f30');
  });
  for (xx = 0; xx < 16; xx++) g.set(xx, ys, xx % 5 === 2 ? PI[1] : '#403f30');      // junta horizontal oscura
  for (i = 0; i < b.length; i++) for (yy = 0; yy < h; yy++) g.set(b[i], y0 + yy, yy === 0 ? PI[1] : '#403f30');
  for (xx = 0; xx < 16; xx++) if (r() < 0.12) g.set(xx, ys, damp || '#2d2c22');       // huecos entre piedras
}
function pircaG(v) {
  var g = new G(16, 16), r = rngf(1100 + v * 23);
  COURSES.forEach(function (cs, ci) { pircaCourse(g, r, ci, cs[0], cs[1]); });
  if (v === 3) { for (var i = 0; i < 5; i++) { var sx = ri(r, 1, 14), sy = ri(r, 0, 14); var q = g.get(sx, sy); if (q && q !== '#403f30') g.set(sx, sy, i % 2 ? AR[2] : AR[1]); } }
  return g;
}
T.pircaFace = [0, 1, 2, 3].map(function (v) { return toC(pircaG(v)); });

function muroG(v) {
  var seed = 1200 + v * 13, g = mottle(seed, CE, { amp: 0.32, base: 3, bias: 0, light: 0.025, dark: 0.025 }), r = rngf(seed + 7), x, y;
  if (v === 2) {                                                                      // pintado de blanco sucio y descascarado
    var n = tnoise(seed + 9, 4);
    for (y = 0; y < 16; y++) for (x = 0; x < 16; x++) {
      var m = n(x, y);
      if (m > 0.36 || y < 2) g.set(x, y, m > 0.7 ? '#d9d3c4' : (r() < 0.2 ? '#bfb8a8' : '#cfc9bb'));
    }
  }
  for (x = 0; x < 16; x++) { g.set(x, 0, '#7a7467'); g.set(x, 8, '#7a7467'); }                  // juntas de encofrado (paneles de 0,5 m de alto)
  for (x = 0; x < 16; x++) { var a = g.get(x, 1), b = g.get(x, 9); if (a) g.set(x, 1, mix(a, '#ffffff', 0.12)); if (b) g.set(x, 9, mix(b, '#ffffff', 0.12)); }
  for (y = 1; y < 8; y++) g.set(0, y, '#7a7467');                                           // junta vertical (paneles de 1 m, a tresbolillo)
  for (y = 9; y < 16; y++) g.set(8, y, '#7a7467');
  if (v === 1) {                                                                      // chorreras de humedad, salitre y una rajadura
    for (var k = 0; k < 3; k++) { var sx = ri(r, 2, 13), sl = ri(r, 4, 9), sy = ri(r, 2, 6); for (y = 0; y < sl; y++) { if (g.get(sx, sy + y)) g.set(sx, sy + y, y % 3 === 2 ? CE[1] : CE[0]); } }
    for (x = 3; x < 12; x++) if (r() < 0.5) g.set(x, 12, CE[5]);
    lipCrack(g, [jag(r, [10, 2], [5, 14], 4, 3)], CE[0], CE[4]);
  }
  if (v === 0) { for (var i = 0; i < 4; i++) g.set(ri(r, 2, 13), ri(r, 2, 14), CE[1]); }
  return g;
}
T.muroContencion = [0, 1, 2].map(function (v) { return toC(muroG(v)); });

/* llantas llenas de tierra, vistas de frente: elipses de 8 px en filas de 8, la segunda corrida medio tire. Periodico en x: encaja solo. */
var RB = ['#15131a', '#26242c', '#464455', '#7a7888'];                                    // caucho: oscuro .. brillo
var GAP = ['#7d5f47', '#66503f'];                                                          // hueco entre llantas: tierra a la sombra
function tire(g, cx, cy, tone) {
  var x, y;
  for (y = cy - 4; y <= cy + 3; y++) for (x = cx - 4; x <= cx + 4; x++) {
    var dx = (x - cx) / 4.4, dy = (y - cy + 0.2) / 3.7;
    if (dx * dx + dy * dy > 1) continue;
    var c = RB[1];
    if (y >= cy + 2) c = RB[0];                                                         // la banda baja del caucho, en sombra
    else if (y <= cy - 3 || (x <= cx - 3 && y < cy + 1)) c = RB[2];                       // filo de luz arriba-izquierda
    g.set(x, y, c);
  }
  for (y = cy - 3; y <= cy + 0; y++) for (x = cx - 3; x <= cx + 3; x++) {                 // la tierra con que se rellena, vista desde arriba
    var ex = (x - cx) / 2.7, ey = (y - cy + 1.3) / 1.5;
    if (ex * ex + ey * ey > 1) continue;
    g.set(x, y, (y <= cy - 2 && x < cx) ? TI[2] : ((x + y) % 3 === 0 ? TI[3] : (tone ? TI[5] : TI[4])));
  }
  g.set(cx - 3, cy - 3, RB[3]); g.set(cx - 4, cy - 2, RB[3]); g.set(cx + 2, cy - 4, RB[2]);
}
function llantasG() {                                                                  // dos filas de muro: arriba cx 4,12 (cy 4); abajo cx 0,8 (cy 12), la de abajo corrida medio tire
  var g = new G(16, 16), x, y;
  for (y = 0; y < 16; y++) for (x = 0; x < 16; x++) g.set(x, y, (x * 3 + y * 5) % 8 === 0 ? GAP[1] : GAP[0]);
  tire(g, 4, 4, false); tire(g, 12, 4, true);
  tire(g, 0, 12, true); tire(g, 16, 12, true); tire(g, 8, 12, false);
  return g;
}
T.muroLlantas = toC(llantasG());

/* ---- bordeTerraza: 6 px de tierra de la terraza + corona del muro (4 px) + ultima hilada de la cara (6 px) ---- */
function terraceTop(seed) {                                                           // las filas 0..5 de tierra: sale del mismo moteado que tierra[]
  var g = mottle(seed, TI, { amp: 0.8, base: 3, bias: 0.02 });
  return g;
}
function bordePirca() {
  var g = terraceTop(1400), r = rngf(1401), x, y;
  for (x = 0; x < 16; x++) { g.set(x, 5, mix(g.get(x, 5), SHV, 0.28)); }              // sombra fina de contacto
  // corona: piedras chatas vistas desde arriba (iluminadas)
  var b = [ri(r, 2, 4)]; while (b[b.length - 1] < 13) b.push(b[b.length - 1] + ri(r, 4, 6));
  for (y = 6; y <= 9; y++) for (x = 0; x < 16; x++) {
    var c = y === 6 ? PI[3] : (y === 9 ? PI[1] : PI[4]);
    if (y === 7 || y === 8) c = (x * 3 + y) % 7 === 0 ? PI[3] : PI[4];
    g.set(x, y, c);
  }
  for (var i = 0; i < b.length; i++) if (b[i] <= 14) { g.set(b[i], 7, PI[1]); g.set(b[i], 8, PI[2]); g.set(b[i] + 1, 8, PI[3]); }
  // ultima hilada de la cara (misma que la 3.a hilada de pircaFace)
  var gg = new G(16, 16); pircaCourse(gg, rngf(1402), 2, 10, 6);
  for (y = 10; y < 16; y++) for (x = 0; x < 16; x++) g.set(x, y, gg.get(x, y));
  return g;
}
T.bordeTerraza = toC(bordePirca());
function bordeCemento() {
  var g = terraceTop(1410), r = rngf(1411), x, y;
  for (x = 0; x < 16; x++) g.set(x, 5, mix(g.get(x, 5), SHV, 0.28));
  for (y = 6; y <= 9; y++) for (x = 0; x < 16; x++) g.set(x, y, y === 6 ? CE[5] : (y === 9 ? CE[2] : CE[4]));    // coronacion de cemento, lisa y clara
  for (x = 0; x < 16; x++) { g.set(x, 10, CE[1]); }
  var base = mottle(1412, CE, { amp: 0.3, base: 3 });
  for (y = 11; y < 16; y++) for (x = 0; x < 16; x++) g.set(x, y, base.get(x, y));
  for (x = 0; x < 16; x++) { g.set(x, 11, mix(g.get(x, 11), '#ffffff', 0.12)); }
  for (y = 11; y < 16; y++) g.set(0, y, CE[1]);
  return g;
}
T.bordeTerrazaCemento = toC(bordeCemento());
function bordeLlantas() {
  var g = terraceTop(1420), x, y;
  for (y = 0; y < 8; y++) for (x = 0; x < 16; x++) g.set(x, y, g.get(x, y));
  for (y = 6; y < 8; y++) for (x = 0; x < 16; x++) g.set(x, y, mix(g.get(x, y), SHV, 0.18));
  for (y = 8; y < 16; y++) for (x = 0; x < 16; x++) g.set(x, y, (x * 3 + y * 5) % 8 === 0 ? GAP[1] : GAP[0]);
  tire(g, 0, 12, false); tire(g, 16, 12, false); tire(g, 8, 12, true);
  return g;
}
T.bordeTerrazaLlantas = toC(bordeLlantas());

/* ======================== CALCOMANIAS ======================== */
function dec(g, ax, ay) { return g.toCanvas(ax, ay); }
/* hilera de piedras pintadas de cal: cada piedra con filo claro NO, lado oscuro SE y sombra sobre el suelo */
var CAL = ['#8d8576', '#c4bdab', '#e8e4dc', '#fbf8f0'];
function calStone(g, x, y, w, h) {
  var i, j;
  for (i = 1; i <= w; i++) g.set(x + i, y + h, SHV + '55');
  for (j = 1; j <= h; j++) g.set(x + w, y + j, SHV + '55');
  for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
    if ((i === 0 || i === w - 1) && (j === 0 || j === h - 1)) continue;
    var c = CAL[2];
    if (j === 0 || i === 0) c = CAL[3];
    if (j === h - 1 || i === w - 1) c = CAL[1];
    if (j === h - 1 && i > 0) c = CAL[0];
    g.set(x + i, y + j, c);
  }
}
function calRow(len, vert, seed) {
  var r = rngf(seed), W = vert ? 9 : len, H = vert ? len : 9, g = new G(W, H), p = 0;
  while (p < len - 5) {
    var w = ri(r, 4, 6), h = ri(r, 3, 4), off = ri(r, 0, 2);
    if (vert) calStone(g, ri(r, 0, 1) + 1, p, h + 1, w - 1); else calStone(g, p, off + 1, w, h);
    p += w + ri(r, 1, 3);
  }
  return dec(g, W >> 1, H - 1);
}
function calCorner(seed) {
  var r = rngf(seed), g = new G(32, 28), p = 0;
  while (p < 29) { var w = ri(r, 4, 6), h = ri(r, 3, 4); calStone(g, p, 18 + ri(r, 0, 2), w, h); p += w + ri(r, 1, 3); }   // brazo horizontal
  p = 0;
  while (p < 18) { var h2 = ri(r, 4, 5); calStone(g, 2 + ri(r, 0, 1), p, 4, h2); p += h2 + ri(r, 1, 2); }                  // brazo vertical
  return dec(g, 16, 27);
}
D.cal = [calRow(64, false, 1500), calRow(48, true, 1510), calCorner(1520)];

/* charco sobre tierra: borde de barro mojado tramado, agua gris azulada con un brillo del cielo de garua */
function blob(w, h, seed) {                                                           // campo de distancia normalizada con borde quebrado
  var r = rngf(seed), n = vnoise(seed + 3, 3), d = [], x, y, ph = [r() * 6.28, r() * 6.28, r() * 6.28];
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    var ex = (x - (w - 1) / 2) / (w / 2), ey = (y - (h - 1) / 2) / (h / 2), a = Math.atan2(ey, ex);
    var rad = 0.9 + Math.sin(a * 2 + ph[0]) * 0.06 + Math.sin(a * 3 + ph[1]) * 0.05 + (n(x, y) - 0.5) * 0.12;
    d.push(Math.sqrt(ex * ex + ey * ey) / rad);
  }
  return d;
}
function charcoG(w, h, seed, big) {
  var g = new G(w, h), d = blob(w, h, seed), r = rngf(seed + 5), x, y, n = vnoise(seed + 9, 2.2);
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    var v = d[y * w + x];
    if (v >= 1.0) continue;
    var c;
    if (v > 0.9) c = hex8('#4b372b', 0.55);                                           // franja de barro oscuro
    else if (v > 0.78) c = bay(x, y) < 0.6 ? '#6f6a63' : '#5d5b5a';                      // agua turbia de orilla
    else c = (n(x, y) > 0.62 && y < h * 0.55) ? '#9fb0b6' : ((x + y) % 5 === 0 ? '#7c8c94' : '#6f8088');
    g.set(x, y, c);
  }
  for (var i = 0; i < (big ? 5 : 3); i++) { x = ri(r, 4, w - 8); y = ri(r, 2, h - 4); if (d[y * w + x] < 0.6) { g.set(x, y, '#d4dde0'); g.set(x + 1, y, '#bccbd0'); } }   // destellos
  return dec(g, w >> 1, h - 1);
}
D.charcoCerro = [charcoG(28, 13, 1600, false), charcoG(46, 20, 1610, true)];

/* basura suelta: piezas de 2-6 px; bolsas negras y de color, botella, lata, carton, papel */
function trashPiece(g, kind, x, y, r) {
  var i, j;
  if (kind === 'bag') {                                                              // jiron de bolsa: negro o de color, brillo seco
    var cols = [['#14121a', '#24222c', '#55526a'], ['#14121a', '#24222c', '#55526a'], ['#3f6a98', '#6fa8d8', '#b9d8ee'], ['#a8501e', '#e3702e', '#f2b080'], ['#b8b3a5', '#e8e4dc', '#fbf8f0']];
    var c = pick(r, cols), w = ri(r, 4, 6), h = ri(r, 2, 3);
    for (j = 0; j < h; j++) for (i = 0; i < w; i++) { if ((i === 0 || i === w - 1) && (j === 0 || j === h - 1) && w > 3) continue; g.set(x + i, y + j, j === h - 1 ? c[0] : (j === 0 && i < w - 1 ? c[2] : c[1])); }
    g.set(x + w, y + h - 1, SHV + '66'); g.set(x + w - 1, y + h, SHV + '66');
  } else if (kind === 'bottle') {                                                    // botella plastica de lado
    g.rect(x, y, 5, 2, '#8fb0b8'); g.rect(x, y, 5, 1, '#d2e6e6'); g.rect(x + 5, y, 1, 2, '#e8e4dc'); g.set(x + 2, y + 1, '#2f5a52'); g.set(x + 1, y + 2, SHV + '66'); g.set(x + 3, y + 2, SHV + '66'); g.set(x + 5, y + 2, SHV + '66');
  } else if (kind === 'can') {
    g.rect(x, y, 3, 2, '#b8a57f'); g.set(x, y, '#e0d0a8'); g.set(x + 2, y + 1, '#7a6a4a'); g.set(x + 1, y + 2, SHV + '66'); g.set(x + 2, y + 2, SHV + '66');
  } else if (kind === 'carton') {                                                    // trozo de carton
    for (j = 0; j < 3; j++) for (i = 0; i < 6; i++) g.set(x + i, y + j, j === 0 ? '#cdb892' : (j === 2 ? '#8a7650' : '#b8a57f'));
    g.set(x + 1, y + 1, '#8a7650'); g.set(x + 4, y + 1, '#8a7650'); g.set(x + 6, y + 2, SHV + '66'); g.set(x + 5, y + 3, SHV + '66');
  } else if (kind === 'paper') {
    g.rect(x, y, 3, 2, '#e8e4dc'); g.set(x + 1, y, '#fbf8f0'); g.set(x + 2, y + 1, '#b9b3a6'); g.set(x + 3, y + 2, SHV + '55');
  } else if (kind === 'peel') {
    g.set(x, y, '#e08a2a'); g.set(x + 1, y, '#c4701c'); g.set(x + 1, y + 1, '#e08a2a');
  }
}
function basuraG(seed, kinds, w, h) {
  var g = new G(w, h), r = rngf(seed), pos = [];
  kinds.forEach(function (k) {
    for (var t = 0; t < 20; t++) {
      var x = ri(r, 1, w - 9), y = ri(r, 1, h - 6), ok = true;
      for (var q = 0; q < pos.length; q++) if (Math.abs(pos[q][0] - x) < 7 && Math.abs(pos[q][1] - y) < 4) { ok = false; break; }
      if (ok) { pos.push([x, y]); trashPiece(g, k, x, y, r); break; }
    }
  });
  return dec(g, w >> 1, h - 1);
}
D.basuraSuelta = [
  basuraG(1700, ['bag', 'bag', 'bottle', 'paper', 'can'], 30, 13),
  basuraG(1710, ['bag', 'carton', 'peel', 'bag', 'paper', 'bottle'], 34, 14),
  basuraG(1720, ['carton', 'bag', 'can', 'can', 'bottle', 'bag', 'peel'], 28, 12)
];

/* polvo: nube baja de polvo ocre, tramada y translucida */
(function () {
  var w = 44, h = 18, g = new G(w, h), n = vnoise(1800, 3.5), n2 = vnoise(1801, 1.6), x, y, d = blob(w, h, 1802);
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    var v = d[y * w + x]; if (v >= 1) continue;
    var dens = (1 - v) * (0.6 + n(x, y) * 0.9);
    if (dens > bay(x, y) * 0.55 + 0.08) g.set(x, y, hex8(n2(x, y) > 0.5 ? '#d2c2a8' : '#bfae92', 0.28 + dens * 0.22));
  }
  D.polvo = dec(g, w >> 1, h - 1);
})();

/* restos de un tele de tubo roto: tapa de plastico, trozos de carcasa, vidrio, cable, el cuello del tubo */
(function () {
  var w = 28, h = 14, g = new G(w, h), r = rngf(1900), i;
  var CS = ['#2d2b33', '#44424d', '#6a6672'];                                          // plastico oscuro
  function shard(x, y, ww, hh, pal) {
    for (var j = 0; j < hh; j++) for (var k = 0; k < ww; k++) { if (j === hh - 1 && k === ww - 1) continue; g.set(x + k, y + j, (j === 0 || k === 0) ? pal[2] : (j === hh - 1 || k === ww - 1 ? pal[0] : pal[1])); }
    g.set(x + ww, y + hh, SHV + '66'); for (var k2 = 1; k2 < ww; k2++) g.set(x + k2, y + hh, SHV + '55');
  }
  shard(3, 2, 8, 5, CS); g.rect(5, 4, 3, 2, '#14121a'); g.set(4, 3, '#8a8e8a');            // marco con un hueco
  shard(15, 5, 6, 4, ['#4a4350', '#7a7686', '#a9a5b0']);
  shard(9, 8, 5, 3, CS);
  shard(22, 2, 3, 3, CS);
  for (i = 0; i < 11; i++) { var gx = ri(r, 2, 25), gy = ri(r, 1, 11); g.set(gx, gy, i % 3 ? '#cfe0e4' : '#8fb0b8'); }   // vidrio
  g.line(13, 4, 16, 3, '#14121a'); g.line(16, 3, 19, 4, '#14121a'); g.line(19, 4, 21, 2, '#14121a'); g.set(21, 2, '#c9a02e');   // cable y punta de cobre
  g.disc(7, 11, 1.2, '#55526a'); g.set(6, 10, '#8a8e8a');                                  // el cuello del tubo
  D.restosTele = dec(g, w >> 1, h - 1);
})();

})();
