/* ACHORADO - js/miraflores/arte-parque.js  (nivel 3: Parque Kennedy, Miraflores; M2a)
 * Duenio: arte del parque.  Script clasico: se carga despues de base.js / sprites.js / calle.js / mobiliario.js.
 * Registra (sin tocar nada ajeno; solo claves nuevas):
 *   ACH.sprites.tiles.*     16x16.  pasto[6] pastoFlor[6] adoquinEspiga[4] adoquinGris[4] veredaMira[6] ciclovia[4] pisoRotonda[4]
 *                           bordilloAmarilloN bordilloAmarilloS bordilloMiraN bordilloMiraS
 *                           esquinas de la Diagonal (rampa de 45 grados en UNA columna): pastoDiag veredaDiag curbDiagA curbDiagB curbDiagB2
 *   ACH.sprites.props.*     ancla (ax, ay) en los pies, huella (fw, fh), tall / tree / canopy / lamp como en mobiliario.js.
 *   ACH.sprites.mira.decals plazaCircular, rotonda, virgenMilagrosaSendero  (se copian tambien a ACH.sprites.decals para render.js).
 * Todo se hornea al cargar (< 150 ms). Contrato: MIRAFLORES.md 3.5, 3.2 y 7.1.  Luz: noroeste, sombras al sureste.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px;
if (!px || !px.G) { if (window.console) console.warn('[arte-parque] falta ACH.px (base.js)'); return; }
var S = ACH.sprites = ACH.sprites || {};
var TL = S.tiles = S.tiles || {};
var props = S.props = S.props || {};
var mira = S.mira = S.mira || {};
var mdec = mira.decals = mira.decals || {};
var decals = S.decals = S.decals || {};
var G = px.G, rng = px.rng, mix = px.mix;
var T0 = (window.performance || Date).now();

/* ============================ PALETAS ============================ */
var K = '#1c1a22';                                                     // contorno general
var LG = ['#1f4a31', '#2e6a3c', '#3f8a45', '#58a553', '#7cbf68'];     // cesped y seto: oscuro -> claro
var FG = ['#15332a', '#1f4a31', '#2b6238', '#3a7a40', '#56944f'];     // ficus
var PG = ['#1b3f30', '#2b6a3c', '#43893f', '#69a84a', '#9acb6a'];     // palmera
var TG = ['#625e56', '#827d72', '#9f9a8c', '#b9b3a3', '#d2cdbb'];     // tronco liso gris claro
var FT = ['#35323a', '#4f4b53', '#6d6869', '#8c8680', '#aaa39a'];     // tronco de ficus
var JP = ['#5a3a86', '#7a52a8', '#9970c4', '#b896dc', '#d8c0f0'];     // jacaranda
var BG = ['#8c7a62', '#a8947a', '#c4b296', '#d8c9ae', '#e8dcc6'];     // piedra beige (rotonda, muro-banca)
var SC = ['#a8615a', '#c4796c', '#d9917e', '#e8ab97', '#f4c9b6'];     // concreto salmon (perg ola)
var IR = ['#0f0e14', '#1c1a22', '#2d2b36', '#46444f'];                // fierro negro
var WA = ['#2a5a76', '#3b7f9e', '#5aa4bd', '#8cc8d8', '#cfeaf0'];     // agua
var GN = ['#4d4c52', '#6a696f', '#8a898d', '#a8a7ab', '#c6c5c8'];     // granito
var WD = px.RAMPS.wood;                                                // madera
var TERRA = ['#8c5a44', '#9d6650', '#a8735a', '#b5826a', '#c1907a'];  // adoquin terracota (#A8735A)
var GRAY = ['#767676', '#808080', '#8a8a8a', '#979797', '#a3a3a3'];   // adoquin gris (#8A8A8A)
var BORD = '#c9b8a3';                                                  // bordillo claro
var VS = ['#9e9a8f', '#b3afa2', '#c6c1b2', '#d6d1c0', '#e4dfce'];     // losetas claras de vereda
var RC = ['#6e2a2e', '#8a3434', '#a24038', '#b84c3f', '#cc6450'];     // ciclovia roja
var AS = ['#26272e', '#303238', '#3b3d42', '#45474a', '#505152', '#5f5e5a', '#7b7360'];   // asfalto (igual que calle.js)
var SW = ['#4d4b57', '#69686f', '#7d7c7a', '#8e8c86', '#a09d92', '#b5b1a1', '#c9c5b5'];

/* ============================ UTILIDADES ============================ */
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function hash2(i, j, s) {
  var h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}
function tnoise(seed, cell) {              // ruido de valor con la reticula del borde del tile fija en 0,5: dos tiles vecinos cualquiera encajan
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

/* Mancha de baja frecuencia + granito disperso (misma tecnica de calle.js: los tiles vecinos encajan). */
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
function gFromCanvas(c) {                  // canvas -> G (hex), para copiar el asfalto real de calle.js
  var g = new G(c.width, c.height), d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
  for (var i = 0; i < c.width * c.height; i++) if (d[i * 4 + 3] > 0) g.d[i] = px.rgb2hex([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
  return g;
}
function outline(g, dark, lite) {          // contorno de 1 px; lite (opcional) en el lado de la luz
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
function contact(g, cx, cy, rx, ry, col) { // sombra de contacto violeta translucida, solo donde no hay nada
  col = col || '#2a244080';
  for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry;
    if (dx * dx + dy * dy <= 1 && !g.get(x, y)) g.set(x, y, col);
  }
}
/* Lienzo final: toCanvas + sombra proyectada SE (shadowSE, bajo la fila ay) + propiedades (igual que mobiliario.js). */
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
function box(g, x, y, w, h, topH, ramp, o) {   // bloque con tapa clara y cara frontal (luz NO): ramp = 5 pasos
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
function jitter(g, r, x0, y0, x1, y1, ramp, idx, n) {  // salpica pixeles +-1 paso sobre lo ya pintado
  for (var k = 0; k < n; k++) {
    var x = x0 + Math.floor(r() * (x1 - x0 + 1)), y = y0 + Math.floor(r() * (y1 - y0 + 1)), c = g.get(x, y);
    if (!c) continue;
    var i = ramp.indexOf(c); if (i < 0) continue;
    g.set(x, y, ramp[clamp(i + (r() < 0.5 ? -1 : 1), 0, ramp.length - 1)]);
  }
}

/* ============================ TILES: PASTO Y FLORES ============================ */
function grassG(v) {
  var seed = 310 + v * 13, r = rng(seed * 7 + 5), g = mottle(seed, LG, { amp: 0.52, base: 2, light: 0.04, dark: 0.025 }), i, x, y;
  for (i = 0; i < 5; i++) {                                           // matitas: pixel claro con sombra al sureste
    x = 1 + Math.floor(r() * 13); y = 2 + Math.floor(r() * 12);
    g.set(x, y, LG[3]); g.set(x, y - 1, LG[4]); g.set(x + 1, y, LG[1]);
  }
  return g;
}
function flower(g, kind, x, y, r) {
  var c;
  if (kind === 'red') {              // salvia roja: espiga de 2 px y hojas oscuras abajo
    g.set(x, y + 2, LG[0]); g.set(x - 1, y + 2, LG[1]); g.set(x + 1, y + 2, LG[1]);
    g.set(x, y + 1, '#a8202a'); g.set(x, y, '#ef4a3a'); g.set(x, y - 1, '#ff8a6a');
  } else if (kind === 'yel') {       // cempasuchil: boton redondo de 2x2 con centro naranja
    g.set(x, y + 2, LG[0]); g.set(x + 1, y + 2, LG[1]);
    g.set(x, y, '#ffd83a'); g.set(x + 1, y, '#ffeb7a'); g.set(x, y + 1, '#f6a81c'); g.set(x + 1, y + 1, '#e8902a');
  } else if (kind === 'org') {
    g.set(x, y + 2, LG[0]);
    g.set(x, y, '#ff9a2a'); g.set(x + 1, y, '#ffb84a'); g.set(x, y + 1, '#d9701c'); g.set(x + 1, y + 1, '#f08a22');
  } else {                           // margarita
    g.set(x, y + 1, LG[1]);
    g.set(x, y, '#f3efe2'); g.set(x - 1, y, '#dcd8ca'); g.set(x + 1, y, '#f3efe2'); g.set(x, y - 1, '#f3efe2'); g.set(x, y + 1, '#ffd83a');
  }
}
var FLOWER_SETS = [['red'], ['yel'], ['red', 'yel'], ['org', 'yel'], ['dai', 'yel'], ['red']];
function grassFlowerG(v) {
  var g = grassG(v + 6), r = rng(900 + v * 31), set = FLOWER_SETS[v % 6], n = v === 5 ? 9 : 5, i, x, y;
  for (i = 0; i < n; i++) {
    var cx = v === 5 ? 3 + (i % 3) * 4 : 3 + Math.floor(r() * 9), cy = v === 5 ? 3 + Math.floor(i / 3) * 4 : 3 + Math.floor(r() * 8);
    flower(g, set[i % set.length], clamp(cx + (v === 5 ? Math.floor(r() * 2) : 0), 2, 12), clamp(cy, 2, 11), r);
  }
  return g;
}

/* ============================ TILES: ADOQUIN EN ESPIGA ============================ */
/* Espiga a 45 grados con periodo de 8 px en x y 16 en y (encaja en cualquier par de tiles): bandas diagonales de 3 px que
   se espejan cada 4 columnas (chevron), con juntas cruzadas escalonadas cada 8 de recorrido. */
function chevColor(x, y, seed, o) {
  var xs = x & 7, half = xs < 4 ? 0 : 1, zig = half ? 7 - xs : xs;
  var u = zig + y, stripe = u >> 2, inS = u & 3, vv = (zig - y) + 4 * stripe, blk = Math.floor(vv / 8);
  var vm = ((vv % 8) + 8) % 8;
  var joint = inS === 3 || vm === 0;
  var key = hash2((stripe & 3) * 5 + (blk & 3), half * 2 + ((x >> 3) & 1), seed);
  var gray = key < (o.gray || 0) || (o.band && (stripe & 3) === 3);
  var ramp = gray ? GRAY : TERRA, ti = clamp(Math.floor(hash2(blk & 3, stripe & 3, seed + 7) * 4.99), 0, 4);
  if (joint) return gray ? '#6a6a6a' : '#7a5a49';
  var lit = (inS === 0) ? 1 : 0;                                       // filo claro de la cara iluminada
  return ramp[clamp(ti + lit - (inS === 2 ? 1 : 0) - (hash2(x, y, seed) < 0.06 ? 1 : 0), 0, 4)];
}
function chevG(seed, o) {
  var g = new G(16, 16);
  for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) g.set(x, y, chevColor(x, y, seed, o));
  return g;
}

/* ============================ TILES: VEREDA, CICLOVIA ============================ */
function veredaG(v) {
  var seed = 700 + v * 7, r = rng(seed), g = mottle(seed, VS, { amp: 0.45, base: 2, light: 0.04, dark: 0.03 }), x, y;
  var J = '#aeaa9b', JL = '#d8d4c4';
  for (x = 0; x < 16; x++) for (y = 0; y < 16; y++) {
    var jx = (v === 2 ? x === 0 : (x === 0 || x === 8)), jy = (y === 0 || (v !== 2 && y === 8));
    if (v === 1 && y >= 8) jx = (x === 4 || x === 12);                   // aparejo trabado
    if (jx || jy) g.set(x, y, J);
    else if ((x === 1 && !jy) || (y === 1 && !jx)) { if (r() < 0.5) g.set(x, y, VS[3]); }   // filo claro junto a la junta
  }
  if (v === 3) { for (x = 4; x < 11; x++) for (y = 4; y < 10; y++) if (bay(x, y) < 0.55 - Math.abs(x - 7.5) * 0.07) g.set(x, y, VS[1]); }   // mancha de humedad
  if (v === 4) { [[3, 3], [4, 4], [5, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10]].forEach(function (p) { g.set(p[0], p[1], VS[0]); g.set(p[0] + 1, p[1], VS[4]); }); }   // grieta fina
  if (v === 5) { g.set(10, 11, '#8a6a52'); g.set(11, 11, '#a88a6a'); g.set(5, 5, '#c9b8a3'); g.set(12, 4, '#b8a888'); g.set(6, 12, '#9aa07a'); g.set(7, 12, '#7a8a52'); }   // hojitas
  return g;
}
function cicloviaG(v) {
  var seed = 800 + v * 9, g = mottle(seed, RC, { amp: 0.7, base: 2, light: 0.05, dark: 0.04 }), x, y;
  if (v === 3) {                                                          // pictograma de bici, blanco gastado
    var W = '#e8dcc8', W2 = '#c8b8a4';
    function wheel(cx, cy) { [[-1, -2], [0, -2], [1, -2], [-2, -1], [2, -1], [-2, 0], [2, 0], [-2, 1], [2, 1], [-1, 2], [0, 2], [1, 2]].forEach(function (d) { g.set(cx + d[0], cy + d[1], W); }); }
    wheel(4, 10); wheel(12, 10);
    g.line(4, 10, 7, 6, W); g.line(7, 6, 12, 10, W); g.line(7, 6, 9, 10, W2); g.line(4, 10, 9, 10, W2); g.line(6, 5, 8, 5, W); g.line(11, 7, 12, 10, W2); g.line(11, 6, 13, 6, W);
  }
  return g;
}

/* ============================ ASFALTO Y SARDINELES ============================ */
var _road = {};
function roadG(v) {
  if (_road[v]) return _road[v];
  var a = TL.asphalt, c = Array.isArray(a) ? a[v % a.length] : a, g;
  if (c && c.getContext) g = gFromCanvas(c); else g = mottle(40 + v * 7, AS, { amp: 0.3, base: 3, light: 0.02, dark: 0.02 });
  return (_road[v] = g);
}
var YEL = { top: ['#e3b93a', '#ecc84e'], lip: '#f6e59a', face: ['#cf9f2c', '#a98228', '#836420'] };
var CON = { top: ['#aeab9d', '#bcb8a8'], lip: '#d8d4c4', face: ['#76747b', '#5f5d67', '#494751'] };
/* Sardinel norte (vereda arriba, pista abajo) descrito por la coordenada s = y - desplazamiento: <6 vereda, 6 junta, 7-8 tapa, 9 filo,
   10-12 cara sur, 13 oclusion, 14-15 cuneta, >=16 pista.  sOf(x, y) deja inclinar el sardinel (rampas de la Diagonal). */
function curbNG(sOf, vG, rG, pal, seed) {
  var g = new G(16, 16), r = rng(seed), x, y;
  for (y = 0; y < 16; y++) for (x = 0; x < 16; x++) {
    var s = sOf(x, y), c;
    if (s < 6) c = vG.get(x, y);
    else if (s === 6) c = r() < 0.15 ? SW[2] : SW[1];
    else if (s <= 8) c = pal.top[(x + s + (r() < 0.2 ? 1 : 0)) & 1];
    else if (s === 9) c = r() < 0.2 ? pal.top[1] : pal.lip;
    else if (s <= 12) { c = pal.face[s - 10]; if (r() < 0.07 && s < 12) c = pal.face[s - 9]; }
    else if (s === 13) c = r() < 0.2 ? AS[1] : AS[0];
    else if (s === 14) c = bay(x, y) < 0.55 ? AS[1] : AS[2];
    else c = rG.get(x, y);
    if (x === 0 && s >= 7 && s <= 12) c = pal === YEL ? '#bf9528' : SW[2];             // junta entre piedras
    g.set(x, y, c);
  }
  return g;
}
/* Sardinel sur (pista arriba, vereda abajo): <8 pista, 8 mugre, 9 filo, 10-11 tapa, 12 junta, >=13 vereda (o ciclovia). */
function curbSG(sOf, rG, vG, pal, seed) {
  var g = new G(16, 16), r = rng(seed), x, y;
  for (y = 0; y < 16; y++) for (x = 0; x < 16; x++) {
    var s = sOf(x, y), c;
    if (s < 8) { c = rG.get(x, y); if (s >= 5 && r() < (s - 4) * 0.12) c = r() < 0.4 ? AS[6] : AS[5]; }
    else if (s === 8) c = r() < 0.25 ? AS[2] : AS[1];
    else if (s === 9) c = r() < 0.2 ? pal.top[1] : pal.lip;
    else if (s <= 11) c = pal.top[(x + s + (r() < 0.2 ? 1 : 0)) & 1];
    else if (s === 12) c = r() < 0.15 ? SW[2] : SW[1];
    else c = vG.get(x, y);
    if (x === 0 && s >= 9 && s <= 11) c = pal === YEL ? '#bf9528' : SW[2];
    g.set(x, y, c);
  }
  return g;
}
function flat(off) { return function (x, y) { return y + off; }; }
function ramp45(off) { return function (x, y) { return y + off - Math.round(x * 16 / 15); }; }

/* pasto | vereda inclinado: pasto donde s < 0; filo de bordillo de 2 px sobre la vereda */
function pastoDiagG() {
  var gG = grassG(1), vG = veredaG(0), g = new G(16, 16);
  for (var y = 0; y < 16; y++) for (var x = 0; x < 16; x++) {
    var s = y - Math.round(x * 16 / 15), c;
    if (s < 0) c = gG.get(x, y); else if (s === 0) c = '#dccfb9'; else if (s === 1) c = '#aaa18c'; else c = vG.get(x, y);
    g.set(x, y, c);
  }
  return g;
}

function bakeTiles() {
  var i;
  TL.pasto = [0, 1, 2, 3, 4, 5].map(function (v) { return grassG(v).toCanvas(); });
  TL.pastoFlor = [0, 1, 2, 3, 4, 5].map(function (v) { return grassFlowerG(v).toCanvas(); });
  TL.adoquinEspiga = [0, 1, 2, 3].map(function (v) { return chevG(11 + v * 17, { gray: [0.08, 0.14, 0.2, 0.1][v], band: v === 3 }).toCanvas(); });
  TL.adoquinGris = [0, 1, 2, 3].map(function (v) { return chevG(51 + v * 13, { gray: [0.85, 0.78, 0.9, 0.7][v] }).toCanvas(); });
  TL.pisoRotonda = [0, 1, 2, 3].map(function (v) { return chevG(81 + v * 19, { gray: 0.04, band: true }).toCanvas(); });
  TL.veredaMira = [0, 1, 2, 3, 4, 5].map(function (v) { return veredaG(v).toCanvas(); });
  TL.ciclovia = [0, 1, 2, 3].map(function (v) { return cicloviaG(v).toCanvas(); });
  var v0 = veredaG(0), r0 = roadG(1), r1 = roadG(3), ci = cicloviaG(0);
  TL.bordilloAmarilloN = curbNG(flat(0), v0, r0, YEL, 611).toCanvas();
  TL.bordilloAmarilloS = curbSG(flat(0), r1, ci, YEL, 641).toCanvas();
  TL.bordilloMiraN = curbNG(flat(0), v0, r0, CON, 671).toCanvas();
  TL.bordilloMiraS = curbSG(flat(0), r1, v0, CON, 681).toCanvas();
  /* Rampa de la Diagonal en la columna c (primera de la escalera nueva), D = D(c):
       norte (parque):  fila D-1 pastoDiag · fila D veredaDiag · fila D+1 curbDiagA
       sur (restaurantes): fila D+6 curbDiagB · fila D+7 curbDiagB2        (la fila D+8 es vereda normal) */
  TL.pastoDiag = pastoDiagG().toCanvas();
  TL.veredaDiag = curbNG(ramp45(0), v0, r0, YEL, 701).toCanvas();
  TL.curbDiagA = curbNG(ramp45(16), v0, r0, YEL, 702).toCanvas();
  TL.curbDiagB = curbSG(ramp45(0), r1, v0, CON, 703).toCanvas();
  TL.curbDiagB2 = curbSG(ramp45(16), r1, v0, CON, 704).toCanvas();
  mira.diagRamp = { north: [{ dr: -1, tile: 'pastoDiag' }, { dr: 0, tile: 'veredaDiag' }, { dr: 1, tile: 'curbDiagA' }],
                    south: [{ dr: 6, tile: 'curbDiagB' }, { dr: 7, tile: 'curbDiagB2' }], note: 'dr = fila relativa a D(c), c = primera columna del escalon nuevo' };
}

/* ============================ CALCOMANIAS GRANDES ============================ */
/* Ancla de plazaCircular y rotonda = el CENTRO del circulo (se colocan en el centro de la plaza). */
function bakeDecals() {
  /* ---- plaza circular del Mercado de Pulgas: r 5 tiles = 80 px, 8 senderos en asterisco hasta 148 px ---- */
  var C = 152, R = 80, W = C * 2, g = new G(W, W), x, y, k, a8 = [];
  for (k = 0; k < 8; k++) a8.push([Math.cos(k * Math.PI / 4 + Math.PI / 8), Math.sin(k * Math.PI / 4 + Math.PI / 8)]);
  for (y = 0; y < W; y++) for (x = 0; x < W; x++) {
    var dx = x + 0.5 - C, dy = y + 0.5 - C, d = Math.sqrt(dx * dx + dy * dy), c = null;
    if (d < R - 4) {
      if (d < 7) c = d < 3 ? GN[3] : GN[2];                                                // medallon de granito
      else if (d < 9) c = GN[1];
      else if ((d >= 36 && d < 39) || (d >= 58 && d < 61)) c = chevColor(x, y, 41, { gray: 1 });
      else c = chevColor(x, y, 23, { gray: 0.07 });
    } else if (d < R) c = d < R - 1 ? '#d8cab4' : '#9d8e78';                                // bordillo de la plaza
    else if (d < 150) {
      for (k = 0; k < 8; k++) {
        var al = dx * a8[k][0] + dy * a8[k][1], pe = Math.abs(-dx * a8[k][1] + dy * a8[k][0]);
        if (al > 0 && pe < 17) {
          if (pe >= 15 || d >= 147) c = pe >= 16 || d >= 148 ? '#9d8e78' : '#d8cab4';
          else c = (pe < 2.5 || pe >= 12) ? chevColor(x, y, 61, { gray: 1 }) : chevColor(x, y, 33, { gray: 0.1 });
          break;
        }
      }
    }
    if (c) g.set(x, y, c);
  }
  mdec.plazaCircular = g.toCanvas(C, C);

  /* ---- rotonda / anfiteatro Chabuca Granda: hoyo circular de 3 gradas beige, piso de adoquin ---- */
  var RC2 = 70, WR = 140, gr = new G(WR, WR), rb = [24, 37, 50, 64], NJ = [12, 18, 24];
  for (y = 0; y < WR; y++) for (x = 0; x < WR; x++) {
    var ex = x + 0.5 - RC2, ey = y + 0.5 - RC2, e = Math.sqrt(ex * ex + ey * ey), col = null, i;
    if (e >= 69) continue;
    if (e < rb[0]) {
      col = e < 5 ? GRAY[3] : (e < 7 ? GRAY[1] : chevColor(x, y, 91, { gray: 0.03, band: true }));
    } else if (e < rb[3]) {
      i = e < rb[1] ? 0 : (e < rb[2] ? 1 : 2);
      col = BG[1 + i];
      var ang = Math.atan2(ey, ex) / (Math.PI * 2) + 0.5, fr = (ang * NJ[i]) % 1, arc = e * Math.PI * 2 / NJ[i];
      if (fr * arc < 1) col = BG[Math.max(0, 1 + i - 1)];                                  // junta radial entre losas
      if (e >= rb[i + 1] - 1.2 && ey > 0) col = BG[4];                                     // labio claro de la grada (lado sur)
      else if (e < rb[i] + 1.2 && ey > 0 && i > 0) col = BG[Math.min(4, 2 + i)];
    } else col = e < 67 ? BG[4] : '#a8947a';                                               // coronacion
    // contrahuella visible de las gradas del lado norte (3 px bajo el labio)
    if (e < rb[3] - 0.5 && ey < 0) {
      for (i = 0; i < 3; i++) {
        var rr = rb[i], e3 = Math.sqrt(ex * ex + (ey - 3) * (ey - 3));
        if (e < rr && e3 >= rr) {
          var e1 = Math.sqrt(ex * ex + (ey - 1) * (ey - 1)), e2 = Math.sqrt(ex * ex + (ey - 2) * (ey - 2));
          col = e1 >= rr ? BG[4] : (e2 >= rr ? BG[2] : BG[0]);
        }
      }
    }
    if (col) gr.set(x, y, col);
  }
  mdec.rotonda = gr.toCanvas(RC2, RC2);

  /* ---- sendero Virgen Milagrosa: de (86,23) a (76,D) -> 160 px a la izquierda y 352 hacia abajo, 56 px de ancho ---- */
  var SX = 200, SY = 16, EX = SX - 160, EY = SY + 352, WP = 240, HP = 384, gp = new G(WP, HP), PW = 56;
  var vx = EX - SX, vy = EY - SY, vl = vx * vx + vy * vy;
  for (y = 0; y < HP; y++) for (x = 0; x < WP; x++) {
    var t = ((x + 0.5 - SX) * vx + (y + 0.5 - SY) * vy) / vl;
    if (t < 0 || t > 1) continue;
    var px_ = SX + vx * t, py_ = SY + vy * t, dd = Math.sqrt((x + 0.5 - px_) * (x + 0.5 - px_) + (y + 0.5 - py_) * (y + 0.5 - py_));
    if (dd >= PW / 2) continue;
    var cc;
    if (dd >= PW / 2 - 2) cc = dd >= PW / 2 - 1 ? '#a89a84' : '#d8cab4';                  // bordillo
    else if ((dd >= 8 && dd < 10) || (dd >= 18 && dd < 20)) cc = chevColor(x, y, 71, { gray: 1 });
    else cc = chevColor(x, y, 17, { gray: 0.08 });
    gp.set(x, y, cc);
  }
  mdec.virgenMilagrosaSendero = gp.toCanvas(SX, SY);
  mdec.virgenMilagrosaSendero.endDx = EX - SX; mdec.virgenMilagrosaSendero.endDy = EY - SY; mdec.virgenMilagrosaSendero.width_px = PW;
  ['plazaCircular', 'rotonda', 'virgenMilagrosaSendero'].forEach(function (k2) { decals[k2] = mdec[k2]; });
}

/* ============================ PALMERAS ============================ */
var PDEAD = ['#3a2a22', '#6a4a34', '#9a7448', '#c4a06a'];
/* Fronda en pluma: 3 bandas (luz arriba / medio / sombra abajo), muescas en el borde bajo que sugieren los foliolos. (tecnica de mobiliario.js) */
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
/* Palmera datilera/canaria: tronco liso gris claro con cicatrices finas, penacho denso, datiles naranja. 52x116, ancla (26,110). */
function palmera(o) {
  var W = 84, H = 116, ay = 110, ax = 42, g = new G(W, H), r = rng(o.seed), i, y, x;
  var crownX = ax + o.bend, crownY = 27;
  for (y = ay; y >= crownY - 1; y--) {
    var t = (ay - y) / (ay - crownY), cxT = ax + Math.round(o.bend * Math.pow(t, 1.7) + Math.sin(t * 3.4 + o.seed) * o.wave);
    var w = t < 0.06 ? 7 : (t < 0.16 ? 6 : (t < 0.8 ? 5 : 4)), x0 = cxT - Math.floor(w / 2);
    var cols = w === 4 ? [TG[4], TG[3], TG[2], TG[1]] : (w === 5 ? [TG[4], TG[3], TG[2], TG[2], TG[1]] : (w === 6 ? [TG[4], TG[3], TG[3], TG[2], TG[1], TG[0]] : [TG[4], TG[3], TG[3], TG[2], TG[2], TG[1], TG[0]]));
    var scar = (y % 5 === 0);
    for (i = 0; i < w; i++) g.set(x0 + i, y, scar && i > 0 && i < w - 1 ? (i === 1 ? TG[2] : TG[1]) : cols[i]);
    if (y % 10 === 2 && t > 0.1) g.set(x0 + 1, y - 1, TG[4]);
  }
  for (y = ay - 5; y <= ay; y++) for (x = ax - 4; x <= ax + 4; x++) if (g.get(x, y) && r() < 0.3) g.set(x, y, TG[1]);
  (o.dead || []).forEach(function (d) { frond(g, crownX, crownY, d[0], d[1], d[2], [PDEAD[0], PDEAD[0], PDEAD[1], PDEAD[2], PDEAD[3]], 3.2, 1); });
  o.fronds.forEach(function (f, k) {
    var lit = f[0] < -90 && f[0] > -200 ? 1 : 0;
    var cols = lit ? [PG[0], PG[1], PG[2], PG[3], PG[4]] : [PG[0], PG[0], PG[1], PG[2], PG[3]];
    if (f[3]) cols = [PG[0], PG[0], PG[1], PG[1], PG[2]];
    frond(g, crownX, crownY, f[0], f[1] * 1.38, f[2], cols, o.leaf * 1.2, k);
  });
  [[0, 4], [-3, 5], [2, 5], [-1, 7], [3, 7]].forEach(function (d) { g.disc(crownX + d[0], crownY + d[1] + 1, 1.5, '#d98a2a'); g.set(crownX + d[0] - 1, crownY + d[1], '#f0b050'); });   // datiles
  g.rect(crownX - 2, crownY - 1, 5, 3, PG[2]);
  outline(g, '#142a22', '#2b4a38');
  for (i = 0; i < 18; i++) { var lx = ax - 7 + Math.floor(r() * 15), ly = ay + Math.floor(r() * 3); if (!g.get(lx, ly)) g.set(lx, ly, pick(r, ['#8a7658', '#6b5a48', '#a8956e'])); }
  contact(g, ax, ay + 1, 7, 2.5, '#2a244070');
  return mk(g, ax, ay, 4, 4, { cast: { len: 0.4, a: 0.2 }, p: { tall: true, tree: true, canopy: { x: -42, y: -86, w: 84, h: 46 } } });
}
/* Palmera "decapitada": el tronco corta a media altura, con fibras secas y dos hojas muertas colgando. */
function palmeraSeca() {
  var W = 44, H = 92, ay = 86, ax = 22, g = new G(W, H), r = rng(8630), y, i, topY = 30;
  for (y = ay; y >= topY; y--) {
    var t = (ay - y) / (ay - topY), cxT = ax + Math.round(Math.sin(t * 2.6) * 1.2), w = t < 0.07 ? 7 : (t < 0.16 ? 6 : 5), x0 = cxT - Math.floor(w / 2);
    var cols = w === 5 ? ['#c4b9a2', '#a89d86', '#8a7f6a', '#8a7f6a', '#6a604e'] : (w === 6 ? ['#c4b9a2', '#a89d86', '#a89d86', '#8a7f6a', '#6a604e', '#4a4236'] : ['#c4b9a2', '#a89d86', '#a89d86', '#8a7f6a', '#8a7f6a', '#6a604e', '#4a4236']);
    for (i = 0; i < w; i++) g.set(x0 + i, y, (y % 5 === 0 && i > 0 && i < w - 1) ? '#6a604e' : cols[i]);
  }
  // corte irregular, con fibras
  for (i = -3; i <= 3; i++) { var h2 = topY - (i === -3 ? 0 : (i % 2 ? 2 : 4)) + Math.floor(r() * 2); for (y = topY; y >= h2; y--) g.set(22 + i, y, y === h2 ? PDEAD[3] : (i < 0 ? PDEAD[2] : PDEAD[1])); }
  for (i = 0; i < 9; i++) { var fx = 19 + Math.floor(r() * 7), fy = topY - 5 + Math.floor(r() * 4); if (!g.get(fx, fy)) g.set(fx, fy, r() < 0.5 ? PDEAD[2] : PDEAD[1]); }
  frond(g, 20, topY + 3, 150, 14, 0.75, [PDEAD[0], PDEAD[0], PDEAD[1], PDEAD[2], PDEAD[3]], 3.4, 1);
  frond(g, 25, topY + 5, 40, 13, 0.8, [PDEAD[0], PDEAD[0], PDEAD[1], PDEAD[2], PDEAD[3]], 3.4, 2);
  frond(g, 22, topY + 6, 98, 11, 0.5, [PDEAD[0], PDEAD[0], PDEAD[1], PDEAD[1], PDEAD[2]], 3, 3);
  outline(g, '#2a211c', '#5a4a3a');
  for (i = 0; i < 14; i++) { var lx = ax - 7 + Math.floor(r() * 15), ly = ay + Math.floor(r() * 3); if (!g.get(lx, ly)) g.set(lx, ly, pick(r, ['#8a7658', '#6b5a48', '#a8956e'])); }
  contact(g, ax, ay + 1, 7, 2.5, '#2a244070');
  return mk(g, ax, ay, 4, 4, { cast: { len: 0.4, a: 0.2 }, p: { tall: true, tree: true, canopy: { x: -22, y: -60, w: 44, h: 36 } } });
}

/* ============================ FICUS Y JACARANDA ============================ */
/* Copa en masas (elipses con borde ondulado), 4 valores en bandas limpias; luz NO. ramp = oscuro -> claro. */
function leafMass(g, masses, ramp, hgt, owner, r, o) {
  var W = g.w, lit = new Array(W * hgt), x2, y2, i;
  for (i = 0; i < owner.length; i++) owner[i] = -1;
  masses.forEach(function (M, m) {
    for (y2 = 0; y2 < hgt; y2++) for (x2 = 0; x2 < W; x2++) {
      var dx = (x2 - M[0]) / M[2], dy = (y2 - M[1]) / M[3];
      if (dx > 1.3 || dx < -1.3 || dy > 1.3 || dy < -1.3) continue;
      var ang = Math.atan2(dy, dx), edge = 1 + 0.10 * Math.sin(ang * 5 + M[4]) + 0.06 * Math.sin(ang * 9 + M[4] * 2.3) + 0.04 * Math.sin(ang * 13 + M[4]);
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
  masses.forEach(function (M, mi) {                       // plastas claras de hojas en la cara iluminada
    for (var k = 0; k < (o.tufts || 3); k++) {
      var a = (205 + k * 38 + r() * 14) * Math.PI / 180, rr = 0.42 + r() * 0.22, lx = Math.round(M[0] + Math.cos(a) * M[2] * rr), ly = Math.round(M[1] + Math.sin(a) * M[3] * rr);
      if (owner[ly * W + lx] === mi && owner[(ly + 1) * W + lx + 2] === mi) { g.rect(lx, ly, 3, 1, ramp[4]); g.rect(lx - 1, ly + 1, 3, 1, ramp[4]); g.rect(lx + 2, ly + 1, 1, 1, ramp[3]); }
    }
  });
}
/* Tronco grueso por tramos: capsula de radio variable a lo largo de una polilinea suave, con vetas retorcidas (luz a la izquierda). */
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
      var v = (((yy * 2 + xx * 3 + Math.round(tw * 5)) % 9) + 9) % 9;                         // vetas retorcidas en diagonal
      if (v === 0 && f > -0.8 && f < 0.85) c = FT[Math.max(0, FT.indexOf(c) - 1)];
      else if (v === 1 && f < 0.3) c = FT[Math.min(4, FT.indexOf(c) + 1)];
      g.set(xx, yy, c);
    }
  }
}
/* Ficus enorme: tronco gris grueso y retorcido (varios fustes que se abren), raices tablares, copa ancha de verde oscuro. 140x108, ancla (70,102). */
function ficus(o) {
  var W = 140, H = 108, ay = 102, ax = 70, g = new G(W, H), r = rng(o.seed), i, y, x, owner = new Array(W * 62), d = o.lean;
  [[-1, 22, 14], [-1, 15, 9], [1, 24, 15], [1, 16, 10], [-1, 9, 6], [1, 10, 6]].forEach(function (rt) {              // raices tablares abiertas en la base
    stem(g, [[ax + rt[0] * 4, ay - rt[2]], [ax + rt[0] * rt[1] * 0.55, ay - rt[2] * 0.25], [ax + rt[0] * rt[1], ay]], 7, 2, o.tw + rt[1]);
  });
  stem(g, [[ax, ay + 1], [ax - 2 + d, ay - 16], [ax + 3 + d, ay - 32], [ax + d * 2, ay - 50]], 22, 14, o.tw);                // fuste principal
  stem(g, [[ax + 1 + d, ay - 30], [ax - 8 + d, ay - 44], [ax - 20 + d, ay - 56]], 10, 6, o.tw + 1.7);                     // fuste izquierdo
  stem(g, [[ax + 3 + d, ay - 34], [ax + 12 + d, ay - 46], [ax + 22 + d, ay - 56]], 9, 5, o.tw + 3.1);                     // fuste derecho
  (o.aerial || []).forEach(function (a) { for (y = a[1]; y < a[1] + a[2]; y++) g.set(ax + a[0] + (y % 7 === 0 ? 1 : 0), y, y % 3 ? FT[2] : FT[3]); });
  leafMass(g, o.masses, FG, 62, owner, r, { tufts: 4 });
  outline(g, '#101e1a', '#2b4a38');
  (o.gaps || []).forEach(function (hp) {
    var hw = hp[2], hh = hp[3], yy, xx;
    for (yy = 0; yy < hh; yy++) { var ins = (yy === 0 || yy === hh - 1) ? 1 : 0; for (xx = ins; xx < hw - ins; xx++) g.set(hp[0] + xx, hp[1] + yy, null); }
    for (xx = 1; xx < hw - 1; xx++) if (g.get(hp[0] + xx, hp[1] + hh)) g.set(hp[0] + xx, hp[1] + hh, '#101e1a');
  });
  for (i = 0; i < 50; i++) { var lx3 = ax - 18 + Math.floor(r() * 37), ly3 = ay - 1 + Math.floor(r() * 4); if (!g.get(lx3, ly3)) g.set(lx3, ly3, pick(r, ['#6b5a48', '#8a7658', '#3a6a3c', '#4a7a44'])); }
  contact(g, ax, ay + 1, 20, 4, '#2a244070');
  return mk(g, ax, ay, 18, 7, { cast: { len: 0.4, a: 0.2 }, p: { tall: true, tree: true, canopy: { x: -64, y: -98, w: 128, h: 62 } } });
}
/* Jacaranda: tronco fino y curvo, copa de flor morada con hojas verdes entre medio; petalos caidos en el suelo. 64x88, ancla (32,82). */
function jacaranda() {
  var W = 64, H = 88, ay = 82, ax = 32, g = new G(W, H), r = rng(8777), i, y, x, owner = new Array(W * 52);
  for (y = ay; y >= 30; y--) {
    var t = (ay - y) / 52, cxT = ax + Math.round(Math.sin(t * 2.8) * 2.2), w = t < 0.1 ? 5 : 4, x0 = cxT - Math.floor(w / 2);
    for (i = 0; i < w; i++) g.set(x0 + i, y, w === 5 ? ['#a8a090', '#8a8272', '#6e6658', '#6e6658', '#4e483e'][i] : ['#a8a090', '#7e7666', '#6e6658', '#4e483e'][i]);
  }
  [[ax, 40, ax - 14, 26], [ax, 38, ax + 15, 24], [ax, 36, ax + 1, 14]].forEach(function (b) { g.line(b[0], b[1], b[2], b[3], '#4e483e'); g.line(b[0] + 1, b[1], b[2] + 1, b[3], '#6e6658'); });
  leafMass(g, [[32, 14, 15, 11, 4.3], [15, 25, 13, 11, 0.4], [49, 24, 14, 11, 2.1], [32, 31, 17, 9, 1.2], [22, 38, 10, 6, 3.3], [43, 38, 10, 6, 5.1]], JP, 52, owner, r, { tufts: 4 });
  for (i = 0; i < 60; i++) {                                                                // hojas verdes entre la flor
    var gx = 6 + Math.floor(r() * 52), gy = 4 + Math.floor(r() * 42);
    if (g.get(gx, gy) && owner[gy * W + gx] >= 0) { g.set(gx, gy, r() < 0.6 ? '#3a7a40' : '#56944f'); if (r() < 0.5) g.set(gx + 1, gy, '#2b6238'); }
  }
  for (i = 0; i < 24; i++) { var fx = 6 + Math.floor(r() * 52), fy = 3 + Math.floor(r() * 44); if (g.get(fx, fy) && owner[fy * W + fx] >= 0 && !(g.get(fx, fy) === '#3a7a40')) g.set(fx, fy, r() < 0.5 ? JP[4] : '#e8d8f8'); }
  outline(g, '#2a1c44', '#6a4a96');
  for (i = 0; i < 70; i++) { var px2 = ax - 20 + Math.floor(r() * 41), py2 = ay - 2 + Math.floor(r() * 7); if (!g.get(px2, py2) && Math.abs(px2 - ax) / 20 + Math.abs(py2 - ay) / 5 < 1.5) g.set(px2, py2, pick(r, [JP[2], JP[3], JP[4], JP[1]])); }
  contact(g, ax, ay + 1, 9, 3, '#2a244070');
  return mk(g, ax, ay, 6, 4, { cast: { len: 0.4, a: 0.2 }, p: { tall: true, tree: true, canopy: { x: -32, y: -80, w: 64, h: 50 } } });
}

function bakeTrees() {
  props.palmera = [
    palmera({ seed: 8501, bend: 2, wave: 1.0, leaf: 6, dead: [[100, 14, 0.25], [76, 13, 0.25]],
      fronds: [[-98, 20, 0.12, 1], [-80, 19, 0.12, 1], [-128, 26, 0.32], [-52, 26, 0.32], [-165, 27, 0.55], [-15, 27, 0.55], [150, 21, 0.62], [30, 21, 0.62], [-112, 18, 0.18, 1], [-68, 18, 0.18, 1]] }),
    palmera({ seed: 8502, bend: -3, wave: -1.5, leaf: 5.6, dead: [[106, 15, 0.28], [86, 12, 0.22], [72, 13, 0.2]],
      fronds: [[-92, 21, 0.1, 1], [-124, 25, 0.34], [-60, 25, 0.34], [-160, 27, 0.56], [-22, 27, 0.56], [168, 20, 0.6], [12, 21, 0.6], [-108, 17, 0.2, 1], [-76, 17, 0.2, 1]] }),
    palmera({ seed: 8503, bend: 4, wave: 1.8, leaf: 6.2, dead: [[92, 13, 0.2]],
      fronds: [[-96, 20, 0.1, 1], [-130, 27, 0.3], [-48, 27, 0.3], [-168, 28, 0.58], [-12, 28, 0.58], [148, 22, 0.64], [32, 22, 0.64], [-114, 19, 0.2, 1], [-74, 18, 0.2, 1], [180, 14, 0.5]] })
  ];
  props.palmeraSeca = palmeraSeca();
  props.ficus = [
    ficus({ seed: 8801, tw: 0.5, lean: 0, masses: [[70, 16, 24, 13, 4.3], [36, 27, 22, 15, 0.4], [104, 26, 23, 15, 2.1], [70, 33, 31, 16, 1.2], [16, 40, 14, 9, 3.1], [124, 39, 14, 9, 5.2], [46, 48, 16, 8, 2.6], [94, 48, 17, 8, 4.4]],
      gaps: [[54, 26, 8, 4], [82, 19, 7, 4], [28, 34, 6, 3]], aerial: [[-26, 50, 8], [26, 51, 10], [-10, 53, 7]] }),
    ficus({ seed: 8802, tw: 2.4, lean: -2, masses: [[68, 14, 22, 12, 0.3], [34, 25, 21, 14, 1.4], [102, 24, 23, 15, 3.1], [69, 32, 29, 15, 2.2], [12, 38, 13, 9, 4.1], [128, 37, 13, 9, 0.9], [44, 47, 16, 8, 1.7], [96, 47, 16, 8, 3.9]],
      gaps: [[50, 23, 8, 4], [84, 27, 7, 4], [118, 31, 5, 3]], aerial: [[-28, 49, 9], [22, 52, 8], [32, 50, 7]] })
  ];
  props.jacaranda = jacaranda();
}

/* ============================ PLANTAS ============================ */
function leafBlock(g, x0, y0, w, h, topH, r) {      // seto recortado: tapa clara + cara verde oscura, esquinas romas
  var x, y;
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    if ((y === 0 || y === h - 1) && (x < 2 || x >= w - 2)) continue;
    if ((x === 0 || x === w - 1) && (y < 1 || y >= h - 1)) continue;
    var c;
    if (y < topH) c = (y === 0 ? LG[4] : (r() < 0.25 ? LG[4] : LG[3]));
    else { var f = y - topH; c = f >= h - topH - 1 ? LG[0] : (r() < 0.22 ? LG[3] : (r() < 0.4 ? LG[1] : LG[2])); if (x === 0 || x < 2 && r() < 0.5) c = LG[3]; if (x >= w - 2) c = LG[1]; }
    g.set(x0 + x, y0 + y, c);
  }
  for (x = 0; x < w; x += 3) { if (r() < 0.6) g.set(x0 + x + (r() < 0.5 ? 1 : 0), y0 + topH, LG[1]); }      // sombra de las ondas de la tapa
}
function seto() {
  var g = new G(34, 20), r = rng(9101), i;
  leafBlock(g, 1, 4, 32, 13, 6, r);
  for (i = 0; i < 14; i++) g.set(3 + Math.floor(r() * 28), 5 + Math.floor(r() * 5), LG[4]);
  outline(g, '#10261c', '#2e6a3c');
  contact(g, 17, 18, 15, 2.2, '#2a244070');
  return mk(g, 17, 17, 30, 6, { cast: { len: 0.4, a: 0.2 } });
}
function parterre(kind) {
  var W = 40, H = 26, g = new G(W, H), r = rng(kind === 'red' ? 9201 : 9202), cx = 20, cy = 12, i, x, y;
  // ceja de piedra (bordillo) con cara frontal de 3 px
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    var dx = (x - cx + 0.5) / 18, dy = (y - cy + 0.5) / 8.5, d = dx * dx + dy * dy, dy3 = (y - 3 - cy + 0.5) / 8.5, d3 = dx * dx + dy3 * dy3;
    if (d3 < 1) g.set(x, y, d3 > 0.74 ? '#d8cab4' : null);
    if (d < 1 && d3 >= 1) g.set(x, y, y > cy + 3 ? '#a89a84' : '#9a8c76');              // cara visible
  }
  // tierra y mata de flores (domo)
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    var ex = (x - cx + 0.5) / 16, ey = (y - (cy - 2) + 0.5) / 6.5, e = ex * ex + ey * ey;
    if (e >= 1) continue;
    var c = e > 0.75 ? LG[0] : (ex < -0.2 && ey < 0 ? LG[2] : LG[1]);
    g.set(x, y, c);
  }
  var cols = kind === 'red' ? [['#8f1f26', '#c8282b', '#ef4a3a', '#ff8a6a']] : [['#c9741a', '#f6a81c', '#ffd83a', '#ffeb7a']], pal = cols[0];
  for (y = cy - 8; y < cy + 5; y++) for (x = 3; x < W - 3; x++) {
    var fx = (x - cx + 0.5) / 16, fy = (y - (cy - 2) + 0.5) / 6.5;
    if (fx * fx + fy * fy >= 0.96 || !g.get(x, y)) continue;
    if (r() < 0.5) { var lv = fy < -0.2 || fx < -0.4 ? 2 : (fy > 0.5 ? 0 : 1); if (r() < 0.25) lv++; g.set(x, y, pal[clamp(lv + 1, 0, 3)]); if (kind === 'red' && r() < 0.4) g.set(x, y + 1, pal[1]); }
    else if (r() < 0.18) g.set(x, y, LG[3]);
  }
  outline(g, '#2a1c1c', '#f0e4d0');
  contact(g, cx, cy + 9, 17, 2.4, '#2a244070');
  return mk(g, cx, cy + 9, 34, 8, { cast: { len: 0.3, a: 0.18 } });
}
function rejita() {                                                    // reja negra baja con puntas de lanza, 16 px por tramo
  var g = new G(18, 14), i;
  g.rect(0, 5, 18, 1, IR[3]); g.rect(0, 10, 18, 1, IR[2]);
  for (i = 1; i <= 16; i += 3) { g.rect(i, 3, 1, 9, IR[2]); g.set(i, 2, IR[3]); g.set(i, 1, IR[3]); g.set(i - 1, 3, IR[1]); g.set(i + 1, 3, IR[1]); }
  g.rect(0, 5, 18, 1, IR[3]); g.rect(0, 11, 18, 1, IR[1]);
  g.rect(0, 2, 1, 10, IR[3]); g.rect(17, 2, 1, 10, IR[3]);
  g.rect(0, 12, 2, 1, IR[2]); g.rect(16, 12, 2, 1, IR[2]);
  contact(g, 9, 12, 8, 1.5, '#2a244066');
  return mk(g, 9, 12, 16, 3, { cast: { len: 0.4, a: 0.16 } });
}

/* ============================ ASIENTOS ============================ */
function banca() {                                                    // banca de madera con espaldar y apoyabrazos, 34x26
  var g = new G(34, 28), r = rng(9301), i, y;
  [3, 29].forEach(function (lx) { g.rect(lx, 13, 3, 12, IR[1]); g.set(lx, 13, IR[3]); g.rect(lx - 1, 24, 5, 1, IR[2]); });   // patas de fierro
  for (i = 0; i < 3; i++) { y = 3 + i * 3; g.rect(3, y, 28, 2, WD[2]); g.rect(3, y, 28, 1, WD[3]); g.rect(3, y + 1, 28, 1, WD[1]); }       // espaldar
  g.rect(3, 3, 2, 10, IR[1]); g.rect(29, 3, 2, 10, IR[1]); g.rect(3, 3, 1, 10, IR[3]);
  g.rect(2, 12, 30, 4, WD[3]); g.rect(2, 12, 30, 1, '#e0b070'); for (i = 5; i < 30; i += 6) g.set(i, 13, WD[2]);                            // asiento (tapa)
  g.rect(2, 16, 30, 3, WD[2]); g.rect(2, 16, 30, 1, WD[3]); g.rect(2, 18, 30, 1, WD[1]);                                                   // canto frontal
  g.rect(1, 10, 3, 2, IR[2]); g.rect(30, 10, 3, 2, IR[2]); g.rect(1, 10, 3, 1, IR[3]); g.rect(30, 10, 3, 1, IR[3]);                         // apoyabrazos
  for (i = 0; i < 12; i++) g.set(4 + Math.floor(r() * 26), 12 + Math.floor(r() * 7), r() < 0.5 ? WD[1] : WD[3]);
  outline(g, K, '#5a3a24');
  contact(g, 17, 25, 15, 2.2, '#2a244070');
  return mk(g, 17, 25, 30, 7, { cast: { len: 0.35, a: 0.18 } });
}
function muroBanca() {                                               // muro-banca de piedra beige, 36x20
  var g = new G(36, 20), r = rng(9302), x, y;
  box(g, 2, 3, 32, 14, 6, BG, { joint: 16 });
  g.set(2, 3, null); g.set(33, 3, null); g.set(2, 16, BG[0]); g.set(33, 16, BG[0]);
  for (x = 0; x < 20; x++) g.set(3 + Math.floor(r() * 30), 4 + Math.floor(r() * 4), r() < 0.5 ? BG[2] : BG[4]);          // granito de la tapa
  for (x = 0; x < 8; x++) { y = 10 + Math.floor(r() * 5); g.set(3 + Math.floor(r() * 30), y, BG[1]); }
  for (y = 9; y <= 12; y++) g.set(18, y, BG[1]);
  outline(g, '#5a4a38', '#f0e4cc');
  contact(g, 18, 18, 16, 2.2, '#2a244070');
  return mk(g, 18, 17, 32, 8, { cast: { len: 0.4, a: 0.18 } });
}
function cilindroGranito() {                                         // taburete / mesa de ajedrez de granito, 12x14
  var g = new G(12, 14), x, y;
  for (y = 5; y <= 10; y++) for (x = 2; x <= 9; x++) g.set(x, y, x < 4 ? GN[3] : (x < 6 ? GN[2] : (x < 8 ? GN[1] : GN[0])));
  g.rect(2, 11, 8, 1, GN[0]);
  g.ell(6, 5, 4.2, 2.4, GN[4]); g.ell(5.6, 5, 3, 1.5, GN[3]); g.set(4, 4, '#ffffff'); g.set(8, 6, GN[2]);
  g.set(3, 8, GN[4]); g.set(7, 9, GN[1]);
  outline(g, K, '#d8d8dc');
  contact(g, 6, 12, 5.5, 1.5, '#2a244070');
  return mk(g, 6, 11, 8, 5, { cast: { len: 0.5, a: 0.2 } });
}

/* ============================ FAROLES DE GLOBO ============================ */
function globe(g, cx, cy, r2) {                                      // globo blanco esferico con cuarto de luz arriba a la izquierda
  var x, y;
  for (y = cy - r2 - 1; y <= cy + r2 + 1; y++) for (x = cx - r2 - 1; x <= cx + r2 + 1; x++) {
    var dx = x - cx + 0.5, dy = y - cy + 0.5, d = Math.sqrt(dx * dx + dy * dy);
    if (d > r2 + 0.3) continue;
    var l = -(dx * 0.6 + dy * 0.8) / r2;
    g.set(x, y, l > 0.45 ? '#ffffff' : (l > -0.1 ? '#f6f2e6' : (l > -0.5 ? '#dcd6c8' : '#b4adc0')));
  }
  g.set(cx - 2, cy - 2, '#ffffff'); g.set(cx - 1, cy - 3, '#ffffff');
}
function farolPole(g, cx, top, base) {                               // fuste negro con base acanalada y collares
  var y;
  for (y = top; y <= base - 7; y++) { g.set(cx - 1, y, IR[3]); g.set(cx, y, IR[1]); g.set(cx + 1, y, IR[0]); }
  [top + 8, Math.round((top + base) / 2)].forEach(function (yy) { g.rect(cx - 2, yy, 5, 2, IR[2]); g.set(cx - 2, yy, IR[3]); });
  for (y = base - 7; y <= base - 1; y++) { var w = 2 + Math.floor((y - (base - 7)) / 2.2); for (var i = -w; i <= w; i++) g.set(cx + i, y, i < -w + 1 ? IR[3] : (i > w - 1 ? IR[0] : IR[2])); }
  g.rect(cx - 5, base - 1, 11, 2, IR[1]); g.rect(cx - 5, base - 1, 11, 1, IR[3]);
}
function farolGlobo(dark) {
  var W = 24, H = 72, ax = 12, ay = 68, g = new G(W, H), gy = 13;
  farolPole(g, ax, gy + 7, ay);
  g.rect(ax - 3, gy + 5, 7, 3, IR[1]); g.rect(ax - 3, gy + 5, 7, 1, IR[3]); g.set(ax - 2, gy + 8, IR[2]);        // copa de la luminaria
  if (dark) { g.disc(ax, gy, 5, '#7e8a96'); g.disc(ax + 1, gy + 1, 3.4, '#5c6a78'); g.set(ax - 2, gy - 2, '#a8b4c0'); } else globe(g, ax, gy, 5.2);
  g.rect(ax - 1, gy - 7, 3, 2, IR[1]); g.set(ax, gy - 8, IR[3]);                                                // remate
  outline(g, K, '#6a6870');
  contact(g, ax, ay + 1, 7, 2, '#2a244070');
  return mk(g, ax, ay, 6, 4, { cast: { len: 0.3, a: 0.2 }, p: { tall: true, lamp: { x: 0, y: gy - ay }, tops: [], poleKind: 'luz' } });
}
function farolGloboDoble(dark) {
  var W = 44, H = 74, ax = 22, ay = 70, g = new G(W, H), gy = 17, i;
  farolPole(g, ax, gy + 8, ay);
  for (i = 0; i < 2; i++) {                                           // dos brazos curvos que suben a cada globo
    var d = i ? 1 : -1, gx = ax + d * 13;
    g.line(ax, gy + 12, ax + d * 4, gy + 9, IR[2]); g.line(ax + d * 4, gy + 9, gx, gy + 7, IR[2]); g.line(ax + d * 4, gy + 10, gx, gy + 8, IR[1]);
    g.rect(gx - 3, gy + 5, 7, 3, IR[1]); g.rect(gx - 3, gy + 5, 7, 1, IR[3]);
    if (dark) { g.disc(gx, gy, 5, '#7e8a96'); g.disc(gx + 1, gy + 1, 3.4, '#5c6a78'); } else globe(g, gx, gy, 5.2);
    g.rect(gx - 1, gy - 7, 3, 2, IR[1]);
  }
  g.rect(ax - 3, gy + 9, 7, 3, IR[1]); g.set(ax, gy + 8, IR[3]);
  outline(g, K, '#6a6870');
  contact(g, ax, ay + 1, 7, 2, '#2a244070');
  return mk(g, ax, ay, 6, 4, { cast: { len: 0.3, a: 0.2 }, p: { tall: true, lamp: { x: -13, y: gy - ay }, lamps: [{ x: -13, y: gy - ay }, { x: 13, y: gy - ay }], tops: [], poleKind: 'luz' } });
}

/* ============================ PILETAS (agua en 3 cuadros) ============================ */
/* Circulo en el suelo: jardinera de salvias (anillo de wf px), coronacion de piedra con cara sur de 3 px, agua, pedestal y surtidor.
   Ancla: abajo del cuadrado de huella (1,7 R de lado, centrado en la pileta). water {x,y,r} es relativo al ancla. */
function pileta(R, wf, jetH, seed, frame, big) {
  var cxy = R + wf + 3, W = cxy * 2 + 1, g = new G(W, W), r = rng(seed), x, y, i;
  var phase = frame * 2.1, Wr = R - 4;
  for (y = 0; y < W; y++) for (x = 0; x < W; x++) {
    var dx = x + 0.5 - cxy, dy = y + 0.5 - cxy, d = Math.sqrt(dx * dx + dy * dy), c = null;
    if (d < Wr) {                                                     // agua
      var s1 = Math.sin(x * 0.46 + y * 0.21 + phase), s2 = Math.sin(y * 0.62 - x * 0.17 - phase * 1.3), tt = s1 + s2 + (dy < 0 ? 0.25 : -0.15) * 0;
      c = tt > 1.75 ? WA[4] : (tt > 1.15 ? WA[3] : (tt < -1.5 || (dy < -Wr * 0.35 && tt < -0.3) ? WA[1] : WA[2]));
      if (dy < 0 && d > Wr - 4) c = WA[0];                            // sombra de la coronacion sobre el agua (lado norte)
      else if (dy > 0 && d > Wr - 2) c = WA[3];                       // brillo contra el borde sur
      var rr = 7 + ((frame * 4 + (big ? 3 : 1)) % 12) * (big ? 2.4 : 1.1), rr2 = rr + (big ? 14 : 7);
      if (Math.abs(d - rr) < 0.55 && rr < Wr - 5) c = WA[4];          // onda que se abre desde el surtidor
      if (Math.abs(d - rr2) < 0.55 && rr2 < Wr - 5) c = WA[3];
    } else if (d < R) {                                               // coronacion (tapa)
      var ang = Math.atan2(dy, dx) / (Math.PI * 2) + 0.5, fr = (ang * (big ? 44 : 20)) % 1;
      c = (fr * d * Math.PI * 2 / (big ? 44 : 20) < 1) ? BG[2] : (d > R - 1.2 ? BG[4] : BG[3]);
      if (dy > 0 && d > R - 1.2) c = BG[4];
    } else if (dy > 0 && d < R + 3 && Math.sqrt(dx * dx + (dy - 3) * (dy - 3)) < R) {   // cara sur de la coronacion
      c = d > R + 2 ? BG[0] : (d > R + 1 ? BG[1] : BG[2]);
    } else if (wf > 0 && d < R + wf + 1 && !(dy > 0 && d < R + 3)) {  // jardinera de flores
      var fl = r(); c = fl < 0.45 ? LG[1] : (fl < 0.55 ? LG[2] : (fl < 0.8 ? '#c8282b' : (fl < 0.92 ? '#ef4a3a' : '#a8202a')));
      if (d > R + wf - 0.5) c = LG[0];
    }
    if (dy < 0 && d < Wr && Math.sqrt(dx * dx + (dy - 3) * (dy - 3)) >= Wr) c = d > Wr - 2 ? BG[0] : BG[1];     // pared interior (lado norte)
    if (c) g.set(x, y, c);
  }
  // pedestal central
  var pr = big ? 8 : 4;
  g.disc(cxy, cxy + 1, pr + 1, BG[1]); g.disc(cxy, cxy, pr, BG[3]); g.disc(cxy - 1, cxy - 1, pr - 2, BG[4]);
  if (big) { g.disc(cxy, cxy, 4, BG[2]); g.disc(cxy - 1, cxy - 1, 3, BG[4]); }
  // surtidor
  var jt = jetH + (frame === 1 ? 3 : (frame === 2 ? -2 : 0)), jy0 = cxy - (big ? 2 : 0);
  for (i = 0; i < jt; i++) { var jw = i < jt * 0.5 ? (big ? 2 : 1) : (big ? 1 : 0); g.set(cxy, jy0 - i, i > jt - 4 ? WA[3] : WA[4]); for (var q = 1; q <= jw; q++) { g.set(cxy - q, jy0 - i, q === jw ? WA[3] : WA[4]); g.set(cxy + q, jy0 - i, q === jw ? WA[2] : WA[3]); } }
  g.disc(cxy, jy0 + 1, big ? 5 : 2.5, WA[4]); g.disc(cxy, jy0 + 1, big ? 3.5 : 1.5, '#ffffff');
  var nd = big ? 16 : 8;
  for (i = 0; i < nd; i++) {                                         // gotas en arco alrededor
    var a = i * Math.PI * 2 / nd + (i % 2) * 0.2, ph = ((frame * 0.33) + i * 0.173) % 1, rho = (big ? 7 : 3.5) + ph * (big ? 22 : 10), hh = Math.sin(ph * Math.PI) * (big ? 12 : 6);
    var gx = Math.round(cxy + Math.cos(a) * rho), gy = Math.round(jy0 - 2 + Math.sin(a) * rho * 0.5 - hh * 0.9 + rho * 0.1);
    g.set(gx, gy, WA[4]); if (ph > 0.55) g.set(gx + 1, gy + 1, WA[3]);
  }
  var ay = cxy + Math.round(0.85 * R), side = Math.round(1.7 * R);
  var c0 = mk(g, cxy, ay, side, side, { p: { shadowIn: true, flat: true, water: { x: 0, y: cxy - ay, r: Wr - 3 }, animFrames: 3 } });
  return c0;
}
function bakePiletas() {
  props.piletaOvalo = [0, 1, 2].map(function (f) { return pileta(48, 9, 26, 9401, f, true); });
  props.piletaChica = [0, 1, 2].map(function (f) { return pileta(21, 4, 12, 9402, f, false); });
  props.piletaOvalo.fps = 3; props.piletaChica.fps = 3;
}

/* ============================ GRADAS DE LA ROTONDA ============================ */
/* 4 arcos de 70 grados centrados en N, E, S, O: la grada de arriba (r 50..64), extruida 3 px, para sentarse.
   Cada pieza lleva .dx/.dy = posicion de su ancla respecto del CENTRO de la rotonda. Huella = rectangulo del arco. */
function gradaPieza(dirDeg) {
  var C = 76, W = 152, H = 3, R0 = 50, R1 = 64, half = 35, i, x, y;
  var mask = new Uint8Array(W * W);
  var cr = dirDeg * Math.PI / 180;
  for (y = 0; y < W; y++) for (x = 0; x < W; x++) {
    var dx = x + 0.5 - C, dy = y + 0.5 - C, d = Math.sqrt(dx * dx + dy * dy);
    if (d < R0 || d >= R1) continue;
    var da = Math.abs(((Math.atan2(dy, dx) - cr) * 180 / Math.PI + 540) % 360 - 180);
    if (da <= half) mask[y * W + x] = 1;
  }
  var g = new G(W, W), minx = 1e9, maxx = -1, miny = 1e9, maxy = -1;
  for (y = 0; y < W; y++) for (x = 0; x < W; x++) {
    var m = mask[y * W + x], up = (y + H < W) ? mask[(y + H) * W + x] : 0, c = null;
    if (m) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
    if (up) {                                                         // tapa (el arco subido H px)
      var edgeN = (y > 0 ? !(y - 1 + H < W && mask[(y - 1 + H) * W + x]) : true);
      var dx2 = x + 0.5 - C, dy2 = y + H + 0.5 - C, an = Math.atan2(dy2, dx2) / (Math.PI * 2) + 0.5, fr = (an * 26) % 1, d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      c = edgeN ? BG[4] : BG[3];
      if (fr * d2 * Math.PI * 2 / 26 < 1) c = BG[2];                  // junta entre losas
    } else if (m) {                                                   // cara frontal (la parte que la tapa no cubre)
      var u2 = (y - 1 >= 0 && mask[(y - 1 + H) * W + x]) ? 0 : 1;
      c = (y + 1 < W && !mask[(y + 1) * W + x]) ? BG[0] : (u2 || (y > 0 && !up) ? BG[2] : BG[1]);
      if (!(y - 1 >= 0 && !(mask[(y - 1) * W + x]))) c = c;
    }
    if (c) g.set(x, y, c);
  }
  // recorte al rectangulo util
  var pad = 2, cw = maxx - minx + 1 + pad * 2, chh = maxy - miny + 1 + pad * 2 + 4, cg = new G(cw, chh);
  for (y = 0; y < chh; y++) for (x = 0; x < cw; x++) { var sc = g.get(x + minx - pad, y + miny - pad - 4); if (sc) cg.set(x, y, sc); }
  outline(cg, '#5a4a38', '#f0e4cc');
  var fx0 = pad, fx1 = pad + (maxx - minx), fy1 = pad + 4 + (maxy - miny);
  var ax = Math.round((fx0 + fx1) / 2), ay = fy1 + 1;
  var cc = mk(cg, ax, ay, maxx - minx + 1, maxy - miny + 1, { p: { shadowIn: true, tall: false } });
  cc.dx = ax - (C - minx + pad); cc.dy = ay - 1 - (C - miny + pad + 4) + 1;
  return cc;
}
function bakeGradas() {
  props.gradaRotonda = [-90, 0, 90, 180].map(gradaPieza);          // 0 = N, 1 = E, 2 = S, 3 = O
}

/* ============================ ESCULTURAS ============================ */
var BLU = ['#10265a', '#1c3f8c', '#2f64c8', '#5a92ec', '#9cc4ff'];
function toritoPucara() {                                           // toro de ceramica azul con flores, sobre un circulo de pasto con bordillo; 58x54
  var W = 58, H = 56, g = new G(W, H), r = rng(9601), cx = 29, cy = 42, x, y, i;
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {                // cama circular: bordillo con cara sur y pasto con flores
    var dx = (x - cx + 0.5) / 22, dy = (y - cy + 0.5) / 11, d = dx * dx + dy * dy, dy3 = (y - 3 - cy + 0.5) / 11, d3 = dx * dx + dy3 * dy3;
    if (d3 < 1) g.set(x, y, d3 > 0.8 ? '#d8cab4' : LG[2 - (x + y) % 2 * 0 - (r() < 0.2 ? 1 : 0)]);
    else if (d < 1) g.set(x, y, y > cy + 6 ? '#a89a84' : '#9a8c76');
  }
  for (i = 0; i < 16; i++) { var fx = 9 + Math.floor(r() * 40), fy = 34 + Math.floor(r() * 12); if (g.get(fx, fy) === LG[2] || g.get(fx, fy) === LG[1]) flower(g, r() < 0.5 ? 'red' : 'yel', fx, fy, r); }
  // toro (mira al este)
  function body(px_, py_, w, h, ramp) { for (var j = 0; j < h; j++) for (var k = 0; k < w; k++) { var cc = (j < 2 ? ramp[3] : (j > h - 3 ? ramp[1] : ramp[2])); if (k < 2) cc = ramp[3]; if (k > w - 3) cc = ramp[1]; if (j === 0 && k < 2) cc = ramp[4]; g.set(px_ + k, py_ + j, cc); } }
  [[19, 30], [23, 31], [33, 30], [37, 31]].forEach(function (lg, k) { for (var j = 0; j < 7; j++) g.rect(lg[0], lg[1] + j, 3, 1, k % 2 ? BLU[1] : BLU[2]); g.rect(lg[0], 37, 3, 1, '#d8b04a'); g.set(lg[0], 37, '#ffd860'); });   // patas con pezuña dorada
  body(16, 19, 24, 12, BLU);                                         // cuerpo
  g.set(16, 19, null); g.set(39, 19, null); g.set(16, 30, null); g.set(39, 30, null);
  body(36, 17, 9, 8, BLU); body(44, 21, 5, 5, BLU);                  // cabeza y hocico
  g.set(36, 17, null); g.set(48, 25, BLU[0]); g.set(47, 22, BLU[0]); g.set(47, 23, BLU[0]);            // fosa nasal y ojo
  g.set(40, 20, '#f3efe2'); g.set(41, 20, '#101828');
  for (i = 0; i < 5; i++) { g.set(37 + i, 16 - Math.floor(i / 2) - (i > 2 ? 1 : 0), '#e0a82a'); }          // cuerno izquierdo dorado
  g.line(41, 17, 42, 12, '#e0a82a'); g.line(42, 12, 41, 10, '#ffd860'); g.line(37, 17, 36, 12, '#e0a82a'); g.line(36, 12, 37, 10, '#ffd860');
  g.set(38, 17, '#a8741a'); g.set(43, 17, '#a8741a');
  g.rect(18, 17, 12, 2, BLU[3]); g.rect(24, 16, 9, 2, BLU[3]);        // lomo y cruz
  g.line(16, 22, 12, 26, BLU[1]); g.line(15, 23, 12, 27, BLU[0]); g.rect(11, 27, 3, 2, '#e0a82a');   // cola con mechon
  // guirnaldas y adornos pintados
  [[19, 19, 'red'], [23, 18, 'yel'], [27, 18, 'red'], [31, 18, 'yel'], [35, 19, 'red'], [40, 17, 'yel'], [44, 20, 'red']].forEach(function (f) { g.set(f[0], f[1], f[2] === 'red' ? '#e8382a' : '#ffd83a'); g.set(f[0] + 1, f[1], f[2] === 'red' ? '#ff7a5a' : '#ffeb7a'); g.set(f[0], f[1] + 1, f[2] === 'red' ? '#a8202a' : '#e8902a'); });
  for (i = 0; i < 4; i++) { g.set(20 + i * 5, 25, '#f3efe2'); g.set(21 + i * 5, 26, '#e8c040'); g.set(22 + i * 5, 25, '#f3efe2'); }   // adornos blancos y dorados del costado
  g.rect(27, 22, 3, 3, '#e8382a'); g.set(28, 23, '#ffd83a');
  outline(g, '#0a1230', '#7ab0ff');
  contact(g, cx, cy + 1, 20, 3, '#2a244066');
  return mk(g, cx, cy + 8, 36, 12, { cast: { len: 0.35, a: 0.2 } });
}
function bustoPeana(kind) {                                         // pedestal generico con busto; 20x46
  var W = 20, H = 48, g = new G(W, H), ay = 44, ax = 10, i, y;
  var ST = kind === 'bronce' ? BG : GN;
  box(g, 2, 38, 16, 6, 2, ST);                                      // zocalo
  box(g, 4, 18, 12, 21, 2, ST);                                     // fuste
  box(g, 3, 14, 14, 5, 2, ST);                                      // cornisa
  g.rect(6, 25, 8, 6, ST[0]); g.rect(7, 26, 6, 4, kind === 'bronce' ? '#a8814a' : '#c6c5c8'); g.set(7, 26, '#e0c070');   // placa
  for (i = 0; i < 3; i++) g.rect(8, 27 + i, 4, 1, kind === 'bronce' ? '#5a4020' : '#6a696f');
  var B = kind === 'bronce' ? ['#26382e', '#3f5a48', '#5a7d68', '#86a690', '#b4d0bc'] : ['#4d4c52', '#6a696f', '#8a898d', '#a8a7ab', '#c6c5c8'];
  for (y = 0; y < 5; y++) { var w = 10 + y; for (i = 0; i < w; i++) g.set(10 - Math.floor(w / 2) + i, 9 + y, i < 2 ? B[3] : (i > w - 3 ? B[1] : B[2])); }   // hombros y pecho
  g.rect(8, 7, 5, 3, B[2]); g.rect(8, 7, 2, 3, B[3]);                 // cuello
  g.ell(10, 5, 4.2, 4.3, B[2]); g.ell(9, 4, 2.6, 2.8, B[3]); g.set(8, 3, B[4]); g.set(9, 3, B[4]); g.set(12, 5, B[1]); g.set(12, 6, B[0]); g.set(11, 7, B[0]); g.set(9, 5, B[1]); g.set(11, 4, B[1]); g.set(10, 6, B[1]);
  outline(g, K, '#d8d4c4');
  contact(g, ax, ay + 1, 9, 2, '#2a244070');
  var c = mk(g, ax, ay, 14, 6, { cast: { len: 0.4, a: 0.2 }, p: { tall: true } });
  c.name = kind === 'bronce' ? 'Busto de bronce' : 'Busto de granito';
  return c;
}
function vasija() {                                                 // vasija amazonica de arcilla con guardas geometricas; 20x32
  var g = new G(20, 32), ay = 29, ax = 10, y, x;
  for (y = 0; y < 26; y++) {
    var t = y / 25, hw = y < 4 ? 3 + y * 0.4 : (y < 8 ? 4.5 + (y - 4) * 0.2 : 5.2 + Math.sin((y - 8) / 17 * Math.PI) * 3.6 - (y > 18 ? (y - 18) * 0.55 : 0));
    if (y === 0) hw = 4.2;
    for (x = Math.ceil(ax - hw); x <= Math.floor(ax + hw - 1); x++) {
      var f = (x - ax + hw) / (2 * hw), c = f < 0.18 ? '#d98a52' : (f < 0.45 ? '#b8683a' : (f < 0.75 ? '#8f4a2a' : '#5c2e1e'));
      g.set(x, 2 + y, c);
    }
  }
  g.rect(7, 2, 6, 1, '#3a1e14');                                    // boca oscura
  for (x = 6; x <= 14; x++) { g.set(x, 11, '#f3efe2'); g.set(x, 17, '#f3efe2'); if (x % 2) { g.set(x, 12, '#1c1210'); g.set(x, 18, '#1c1210'); } else g.set(x, 13, '#1c1210'); }    // guardas
  for (x = 5; x <= 15; x += 2) { g.set(x, 21, '#1c1210'); g.set(x + 1, 22, '#f3efe2'); }
  outline(g, '#2a1410', '#f0d0a0');
  contact(g, ax, ay + 1, 7, 2, '#2a244070');
  return mk(g, ax, ay, 12, 6, { cast: { len: 0.4, a: 0.2 } });
}
function mastilBandera() {                                          // mastil de 5 m con bandera del Peru; 30x80
  var g = new G(30, 80), ax = 6, ay = 76, y, x;
  for (y = 6; y <= ay - 4; y++) { g.set(ax - 1, y, '#e0dccc'); g.set(ax, y, '#a8a496'); g.set(ax + 1, y, '#6a6870'); }
  g.disc(ax, 5, 2, '#e8c860'); g.set(ax - 1, 4, '#fff0a0');
  box(g, ax - 4, ay - 3, 9, 4, 1, GN);
  for (x = 0; x < 20; x++) {                                         // bandera ondeando (tres franjas verticales rojo-blanco-rojo)
    var wave = Math.round(Math.sin(x * 0.55) * 1.2);
    for (y = 0; y < 13; y++) {
      var band = x < 5 ? 0 : (x < 15 ? 1 : 2), shade = (Math.sin(x * 0.55 + 1) > 0.3 ? 1 : 0);
      var c = band === 1 ? (shade ? '#f3efe2' : '#dcd8ca') : (shade ? '#e8283a' : '#b8101e');
      if (y === 0 || y === 12) c = band === 1 ? '#c8c4b4' : '#8a0a16';
      g.set(ax + 2 + x, 8 + y + wave, c);
    }
  }
  g.rect(ax + 9, 13, 2, 2, '#8a7a3a'); g.set(ax + 10, 14, '#c8a040');
  outline(g, K, '#f0ece0');
  contact(g, ax, ay + 1, 6, 2, '#2a244070');
  return mk(g, ax, ay, 6, 4, { cast: { len: 0.3, a: 0.18 }, p: { tall: true } });
}

/* ============================ JUEGOS INFANTILES (fierro pintado y gastado) ============================ */
var RO = ['#6a2a1c', '#a8452a', '#c9602f', '#e08a4a'];                // rojo anaranjado de la estructura
var RU = ['#4a2a22', '#6f3b2e', '#8a4b38', '#b06a3e'];               // oxido
function rustSpots(g, r, x0, y0, x1, y1, n) { for (var i = 0; i < n; i++) { var x = x0 + Math.floor(r() * (x1 - x0 + 1)), y = y0 + Math.floor(r() * (y1 - y0 + 1)), c = g.get(x, y); if (c && RO.indexOf(c) >= 0) g.set(x, y, RU[1 + Math.floor(r() * 3)]); } }
function tube(g, x0, y0, x1, y1, ramp) {                              // tubo de 2 px con luz a la izquierda
  g.line(x0, y0, x1, y1, ramp[2]); g.line(x0 - 1, y0, x1 - 1, y1, ramp[3]); g.line(x0 + 1, y0, x1 + 1, y1, ramp[1]);
}
function columpio() {
  var W = 60, H = 48, g = new G(W, H), r = rng(9701), ay = 44, i;
  [[7, 3], [53, 3]].forEach(function (p) { tube(g, p[0], 5, p[0] - 5, ay - 2, RO); tube(g, p[0], 5, p[0] + 5, ay - 8, RO); });
  g.rect(5, 4, 50, 2, RO[2]); g.rect(5, 4, 50, 1, RO[3]); g.rect(5, 6, 50, 1, RO[0]);                   // barra superior
  [[20, 34], [40, 31]].forEach(function (s, k) {                                                       // dos columpios: uno quieto y uno en vuelo
    var sy = s[1], dx = k ? 2 : 0;
    g.line(s[0] - 4, 6, s[0] - 4 + dx, sy, '#8a8f96'); g.line(s[0] + 4, 6, s[0] + 4 + dx, sy, '#8a8f96');
    g.rect(s[0] - 6 + dx, sy, 13, 3, '#2d2b36'); g.rect(s[0] - 6 + dx, sy, 13, 1, '#4a4756'); g.rect(s[0] - 6 + dx, sy + 3, 13, 1, '#15131a');
  });
  g.set(8, 4, '#cfd3cc'); g.set(52, 4, '#cfd3cc');
  rustSpots(g, r, 3, 4, 58, 44, 14);
  outline(g, K, '#f0b070');
  contact(g, 30, ay + 1, 26, 2.6, '#2a244066');
  return mk(g, 30, ay, 52, 8, { cast: { len: 0.35, a: 0.18 }, p: { tall: true } });
}
function tobogan() {
  var W = 54, H = 50, g = new G(W, H), r = rng(9702), ay = 46, i;
  tube(g, 8, 14, 5, ay - 2, RO); tube(g, 15, 14, 18, ay - 2, RO);                                     // patas de la escalera
  for (i = 0; i < 6; i++) g.rect(7 + i * 0, 18 + i * 5, 10, 1, '#cfd3cc');                              // peldanos
  g.rect(4, 10, 20, 4, '#3f6ec8'); g.rect(4, 10, 20, 1, '#6a9ae8'); g.rect(4, 13, 20, 1, '#243f80');   // plataforma
  g.rect(4, 3, 1, 8, RO[2]); g.rect(23, 3, 1, 8, RO[2]); g.rect(4, 3, 20, 1, RO[3]); g.rect(4, 6, 20, 1, RO[1]);   // barandas
  // rampa amarilla que baja hacia el este y se curva al final
  for (i = 0; i < 30; i++) {
    var t = i / 29, sx = 22 + i, sy = Math.round(13 + t * t * 26 + t * 4);
    g.rect(sx, sy, 2, 4, '#f0c53a'); g.set(sx, sy, '#ffe36a'); g.set(sx, sy + 3, '#b8901a'); g.set(sx + 1, sy - 1, '#c9a022');
  }
  g.rect(50, 36, 3, 6, '#f0c53a'); g.rect(50, 41, 3, 1, '#b8901a');
  tube(g, 33, 24, 33, ay - 4, RO); tube(g, 44, 34, 44, ay - 4, RO);                                   // apoyos de la rampa
  rustSpots(g, r, 3, 3, 52, 44, 12);
  outline(g, K, '#ffe9a0');
  contact(g, 28, ay + 1, 25, 2.6, '#2a244066');
  return mk(g, 28, ay, 46, 8, { cast: { len: 0.35, a: 0.18 }, p: { tall: true } });
}
function subeBaja() {
  var W = 48, H = 26, g = new G(W, H), ay = 22, i;
  g.rect(20, 14, 8, 8, '#2d2b36'); g.rect(20, 14, 8, 1, '#4a4756'); g.set(21, 15, '#6a687a');          // soporte central
  for (i = 0; i < 34; i++) { var x = 7 + i, y = Math.round(18 - i * 0.2 - 0); g.rect(x, y, 1, 3, i < 17 ? '#3f6ec8' : '#2d58aa'); g.set(x, y, '#6a9ae8'); g.set(x, y + 2, '#243f80'); }   // tabla inclinada
  g.rect(5, 17, 4, 3, '#2d2b36'); g.rect(39, 10, 4, 3, '#2d2b36');                                      // topes de goma
  tube(g, 12, 14, 12, 17, RO); g.rect(10, 13, 5, 1, '#f0c53a'); tube(g, 36, 8, 36, 11, RO); g.rect(34, 7, 5, 1, '#f0c53a');     // asas
  outline(g, K, '#9ac0ff');
  contact(g, 24, ay + 1, 20, 2.2, '#2a244066');
  return mk(g, 24, ay, 40, 6, { cast: { len: 0.4, a: 0.16 } });
}

/* ============================ FERIA, PINTORES, AJEDREZ, KIOSCO ============================ */
function toldoFeria(v) {                                             // puesto de artesanias con toldo a rayas visto en 3/4; 56x58
  var W = 58, H = 60, g = new G(W, H), r = rng(9800 + v), ay = 54, x, y, i;
  var PALS = [['#c8282b', '#f3efe2', '#8f1a1f'], ['#d9a02a', '#2f64c8', '#8a5a14'], ['#2f7a4a', '#f2d24a', '#1f4a31']][v];
  var tab = ['#8a5a30', '#6b4223', '#4a3028'];
  // mesa
  g.rect(6, 36, 46, 4, tab[0] === '#8a5a30' ? '#a86e38' : tab[0]); g.rect(6, 36, 46, 1, '#c99458'); g.rect(6, 40, 46, 8, '#8a5a30'); g.rect(6, 47, 46, 1, tab[2]);
  g.rect(8, 41, 42, 1, '#a86e38');
  // mercaderia sobre la mesa
  for (i = 0; i < 9; i++) {
    var gx = 8 + i * 5, c;
    if (v === 0) c = ['#e8382a', '#2f64c8', '#f2d24a', '#e8a0c0', '#3f9a5a'][i % 5];                    // tejidos andinos
    else if (v === 1) c = ['#d98a3a', '#5a92ec', '#f3efe2', '#a8452a', '#2f7a4a'][i % 5];               // cuadros y ceramicas
    else c = ['#f2d24a', '#e8e8e8', '#d98a3a', '#8a5aa6', '#e8382a'][i % 5];                             // joyeria y bolsos
    var hh = 3 + (i * 3) % 4;
    g.rect(gx, 36 - hh, 4, hh, c); g.rect(gx, 36 - hh, 4, 1, '#ffffffaa'.length ? mix(c, '#ffffff', 0.35) : c); g.rect(gx + 3, 36 - hh, 1, hh, mix(c, '#2a2440', 0.3));
  }
  // postes y toldo
  g.rect(4, 22, 2, 28, '#6a6870'); g.rect(4, 22, 1, 28, '#a8a8b0'); g.rect(52, 22, 2, 28, '#6a6870'); g.rect(52, 22, 1, 28, '#a8a8b0');
  for (y = 6; y < 22; y++) for (x = 1; x < 57; x++) {                                                    // faldon trasero inclinado = tapa del toldo (se ve desde arriba)
    var sl = Math.floor((x + (y >> 1)) / 6) % 2;
    g.set(x, y, sl ? PALS[1] : PALS[0]);
    if (y < 8) g.set(x, y, sl ? mix(PALS[1], '#ffffff', 0.25) : mix(PALS[0], '#ffffff', 0.2));
  }
  for (x = 1; x < 57; x++) { g.set(x, 21, mix(g.get(x, 21) || PALS[0], '#2a2440', 0.35)); }
  for (x = 0; x < 58; x++) { var sc = Math.floor(x / 6) % 2; for (y = 22; y < 27 - (x % 6 === 0 || x % 6 === 5 ? 2 : (x % 6 === 1 || x % 6 === 4 ? 1 : 0)); y++) g.set(x, y, sc ? PALS[1] : PALS[0]); }   // volado
  for (x = 0; x < 58; x++) g.set(x, 22, mix(g.get(x, 22) || PALS[0], '#ffffff', 0.2));
  // sombra del toldo sobre la mercaderia
  for (y = 27; y < 31; y++) for (x = 6; x < 52; x++) { var cc = g.get(x, y); if (!cc) { if (y < 29) g.set(x, y, '#2a244050'); } }
  outline(g, K, '#f8f4e8');
  contact(g, 29, ay + 1, 24, 2.6, '#2a244066');
  return mk(g, 29, ay, 46, 12, { cast: { len: 0.3, a: 0.18 }, p: { tall: true, canopy: { x: -29, y: -48, w: 58, h: 22 } } });
}
function caballetePintor(v) {                                        // caballete con lienzo al estilo de los pintores del paseo; 24x38
  var W = 26, H = 40, g = new G(W, H), r = rng(9900 + v), ay = 36, ax = 13, x, y;
  tube(g, ax, 8, ax - 7, ay - 1, ['#2a1c14', '#4a3028', '#6b4223', '#a86e38']); tube(g, ax, 8, ax + 7, ay - 1, ['#2a1c14', '#4a3028', '#6b4223', '#a86e38']); g.rect(ax, 14, 1, ay - 16, '#4a3028');
  g.rect(ax - 5, 29, 11, 2, '#6b4223'); g.rect(ax - 5, 29, 11, 1, '#a86e38');                           // repisa
  g.rect(3, 6, 20, 17, '#5a3a24'); g.rect(3, 6, 20, 1, '#8a5a30');                                       // marco
  for (y = 0; y < 14; y++) for (x = 0; x < 17; x++) {
    var c;
    if (v === 0) { c = y < 6 ? (y < 3 ? '#8fc0e8' : '#b8d8f0') : '#3f7a4a'; if (y >= 4 && y < 8 && Math.abs(x - 8) < (y - 2) * 2 + 1 - (y > 5 ? (y - 5) : 0)) c = y < 5 ? '#f3efe2' : '#7a5a45'; if (y >= 9 && x > 3 && x < 14) c = '#d9a066'; }     // paisaje andino: cielo, cerro nevado, chacras
    else if (v === 1) { c = '#e8c070'; if (y > 2 && Math.abs(x - 8) < 4 && y < 11) c = '#c8282b'; if (y >= 2 && y < 5 && Math.abs(x - 8) < 3) c = '#e0b088'; if (y >= 11) c = '#8a4a2a'; if (y > 4 && y < 11 && Math.abs(x - 8) >= 4 && Math.abs(x - 8) < 6) c = '#4a3028'; }   // tapada limena: manto rojo y saya
    else { c = '#f3efe2'; if (x > 5 && x < 12 && y > 6) c = '#2f64c8'; if (x === 8 && y < 7) c = '#2f7a4a'; if (y < 5 && x > 4 && x < 12 && ((x + y) % 3 === 0)) c = ['#e8382a', '#f2d24a', '#e8a0c0'][(x + y) % 3]; if (y > 11) c = '#c9a066'; }   // jarron con flores
    g.set(5 + x, 8 + y, c);
  }
  outline(g, K, '#d8b080');
  contact(g, ax, ay + 1, 9, 2, '#2a244066');
  return mk(g, ax, ay, 14, 4, { cast: { len: 0.4, a: 0.16 } });
}
function mesaAjedrez() {
  var W = 40, H = 30, g = new G(W, H), ay = 26, x, y, i;
  box(g, 14, 17, 12, 8, 0, GN);                                                                          // pie de la mesa
  g.rect(14, 24, 12, 1, GN[0]);
  g.rect(6, 9, 28, 12, GN[3]); g.rect(6, 9, 28, 1, GN[4]); g.rect(6, 20, 28, 2, GN[1]); g.rect(6, 21, 28, 1, GN[0]);    // tablero (tapa + canto)
  for (y = 0; y < 4; y++) for (x = 0; x < 6; x++) g.rect(8 + x * 4, 10 + y * 2.5, 4, 2, (x + y) % 2 ? '#3a3a42' : '#d8d8dc');
  g.rect(8, 10, 24, 1, '#3a3a42');
  [[2, 17], [32, 17]].forEach(function (p) { g.rect(p[0], p[1], 7, 6, GN[2]); g.rect(p[0], p[1], 7, 2, GN[4]); g.rect(p[0] + 4, p[1] + 2, 3, 4, GN[1]); g.rect(p[0], p[1] + 5, 7, 1, GN[0]); });
  g.set(16, 10, '#c8282b'); g.set(24, 12, '#2f64c8');
  outline(g, K, '#e8e8ec');
  contact(g, 20, ay + 1, 17, 2.4, '#2a244066');
  return mk(g, 20, ay, 36, 10, { cast: { len: 0.4, a: 0.18 } });
}
function kioscoGolosinas() {                                         // carrito de golosinas con sombrilla roja y blanca; 52x64
  var W = 52, H = 66, g = new G(W, H), r = rng(10001), ay = 60, cx = 26, x, y, i;
  // cuerpo del carrito
  box(g, 8, 36, 36, 20, 4, ['#6a1018', '#a8202a', '#d8232a', '#ec4a4a', '#ff8a7a']);
  g.rect(10, 41, 32, 11, '#2d3d4a'); g.rect(10, 41, 32, 1, '#8fb0b8');                                  // vitrina de vidrio
  for (i = 0; i < 10; i++) { g.rect(11 + i * 3, 43 + (i % 2) * 3, 2, 2, ['#e8382a', '#f2d24a', '#5aa4e8', '#e8a0c0', '#3f9a5a', '#d98a3a'][i % 6]); g.rect(11 + i * 3, 48, 2, 2, ['#f2d24a', '#e8382a', '#3f9a5a', '#5aa4e8'][i % 4]); }
  g.rect(10, 41, 1, 11, '#cfd3cc'); g.rect(10, 51, 32, 1, '#cfd3cc');
  g.rect(8, 56, 36, 1, '#4a1018');
  [[12, 57], [36, 57]].forEach(function (p) { g.disc(p[0] + 1, p[1], 2.5, '#2d2b36'); g.disc(p[0] + 1, p[1], 1, '#8a8f96'); });   // ruedas
  tube(g, 4, 56, 4, 40, ['#5a1018', '#8a2028', '#b83038', '#d85058']);
  // mastil y sombrilla
  g.rect(cx, 15, 2, 22, '#e0dccc'); g.rect(cx + 1, 15, 1, 22, '#8a8f96');
  for (y = 0; y < 15; y++) for (x = 0; x < 52; x++) {                                                    // canopy elipse con 8 gajos rojo y blanco
    var dx = (x - cx + 0.5) / 24, dy = (y - 9 + 0.5) / 8.5, d = dx * dx + dy * dy;
    if (d >= 1) continue;
    var ang = Math.atan2(dy, dx), gajo = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 10) % 2, lit = -(dx * 0.5 + dy * 0.9);
    var base = gajo ? ['#a8a498', '#d8d4c4', '#f3efe2'] : ['#8a1018', '#c8232a', '#e8483c'];
    g.set(x, y, lit > 0.25 ? base[2] : (lit > -0.35 ? base[1] : base[0]));
    if (dy > 0.55 && d > 0.5 && ((x + y) & 1)) g.set(x, y, mix(g.get(x, y), '#2a2440', 0.18));
  }
  for (x = 4; x < 48; x += 4) { g.set(x, 15, g.get(x, 14) || '#c8232a'); g.set(x + 1, 15, g.get(x + 1, 14) || '#f3efe2'); }
  g.rect(cx - 1, 0, 3, 3, '#e8c860'); g.set(cx, 0, '#fff0a0');
  outline(g, K, '#ffd8d0');
  contact(g, cx, ay + 1, 22, 2.6, '#2a244066');
  return mk(g, cx, ay, 36, 10, { cast: { len: 0.3, a: 0.2 }, p: { tall: true, canopy: { x: -26, y: -60, w: 52, h: 17 } } });
}
function basureroMira(broken) {
  var g, r = rng(10101);
  if (!broken) {
    g = new G(14, 22);
    for (var y = 6; y < 18; y++) for (var x = 3; x < 11; x++) { var c = x < 5 ? '#5a9a6a' : (x < 8 ? '#3f7a52' : '#2a5a3c'); if (x === 3 && y > 7) c = '#7ab88a'; g.set(x, y, c); if (y % 3 === 1 && x > 4 && x < 10) g.set(x, y, '#1c3a28'); }
    g.rect(3, 17, 8, 1, '#1c3a28'); g.rect(2, 5, 10, 2, '#a8a8b0'); g.rect(2, 5, 10, 1, '#d8d8de'); g.rect(4, 3, 6, 2, '#8a8f96'); g.rect(4, 3, 6, 1, '#cfd3cc'); g.rect(5, 6, 4, 1, '#2d2b36');
    outline(g, K, '#cfe8d8'); contact(g, 7, 19, 6, 1.6, '#2a244066');
    return mk(g, 7, 18, 8, 5, { cast: { len: 0.45, a: 0.18 } });
  }
  g = new G(22, 14);                                                                                       // volcado: cuerpo acostado, tapa aparte y basura
  for (var x2 = 3; x2 < 16; x2++) for (var y2 = 4; y2 < 11; y2++) { var c2 = y2 < 6 ? '#5a9a6a' : (y2 < 9 ? '#3f7a52' : '#2a5a3c'); g.set(x2, y2, c2); if (x2 % 3 === 1 && y2 > 5 && y2 < 10) g.set(x2, y2, '#1c3a28'); }
  g.rect(15, 5, 2, 5, '#a8a8b0'); g.rect(17, 11, 4, 2, '#8a8f96'); g.set(18, 11, '#cfd3cc');
  [[1, 8, '#d8d4c4'], [18, 7, '#e8382a'], [19, 9, '#f2d24a'], [0, 10, '#8a6a42'], [20, 6, '#cfe8d8']].forEach(function (p) { g.rect(p[0], p[1], 2, 2, p[2]); });
  outline(g, K, '#cfe8d8'); contact(g, 11, 12, 9, 1.8, '#2a244066');
  return mk(g, 11, 12, 14, 5, { cast: { len: 0.4, a: 0.14 } });
}
function cajaGatos() {                                               // caja de carton abierta con una mantita; 22x18
  var g = new G(22, 18), r = rng(10201), x, y;
  for (y = 5; y < 15; y++) for (x = 2; x < 20; x++) g.set(x, y, y < 8 ? '#d8b078' : (y < 14 ? '#b8885a' : '#8a5e3a'));
  g.rect(2, 5, 18, 1, '#ecd0a0');
  g.rect(3, 6, 16, 2, '#6a4a30'); g.rect(4, 6, 14, 1, '#c8586a'); g.rect(5, 7, 5, 1, '#e8a0b0'); g.rect(11, 7, 6, 1, '#a8404e');      // mantita adentro
  g.rect(2, 4, 4, 2, '#d8b078'); g.rect(15, 4, 5, 2, '#c8a068'); g.set(2, 3, '#d8b078'); g.set(19, 3, '#c8a068');                           // solapas abiertas
  g.rect(9, 10, 5, 1, '#8a5e3a'); g.rect(9, 11, 4, 1, '#a8784a'); g.rect(10, 12, 3, 1, '#e8e2d2');                                       // cinta y etiqueta
  for (x = 0; x < 6; x++) g.set(3 + Math.floor(r() * 15), 9 + Math.floor(r() * 4), '#a07848');
  outline(g, K, '#f0d8a8');
  contact(g, 11, 15, 10, 2, '#2a244066');
  return mk(g, 11, 15, 16, 6, { cast: { len: 0.4, a: 0.14 } });
}

/* ============================ PERGOLA DE ENTRADA, ARCO Y CALLE DE LAS PIZZAS ============================ */
function columnaPergola() {
  var g = new G(14, 50), ay = 46, ax = 7, x, y;
  box(g, 2, 3, 10, 44, 0, SC);
  g.rect(1, 2, 12, 4, SC[3]); g.rect(1, 2, 12, 1, SC[4]); g.rect(1, 5, 12, 1, SC[1]);                   // capitel
  g.rect(1, 43, 12, 4, SC[2]); g.rect(1, 43, 12, 1, SC[3]); g.rect(1, 46, 12, 1, SC[0]);               // zocalo
  for (y = 8; y < 41; y += 11) g.rect(3, y, 8, 1, SC[1]);                                                // juntas del encofrado
  outline(g, '#5a2a26', '#fbe0d0');
  contact(g, ax, ay + 1, 8, 2, '#2a244066');
  return mk(g, ax, ay, 10, 6, { cast: { len: 0.3, a: 0.2 }, p: { tall: true } });
}
/* Pergola curva de concreto salmon: 7 columnas cuadradas sobre un arco suave (el centro mas al sur), viga con costillas encima. 244x96.
   .base = solo columnas, .top = solo la techumbre (capa alta: va sobre Alexander). Sin huella (las columnas solidas son columnaPergola). */
function pergolaSalmon() {
  var W = 244, H = 100, ay = 90, ax = 122, N = 7, x, y, i;
  var colX = [], colY = [];
  for (i = 0; i < N; i++) { colX.push(18 + i * 34); var u = (i - 3) / 3; colY.push(ay - Math.round(12 * u * u)); }
  function gy(xx) { var u = (xx - 18) / 204 * 6 - 3; return ay - Math.round(12 * (u / 3) * (u / 3)); }
  var base = new G(W, H), top = new G(W, H), CH = 44;
  colX.forEach(function (cx, k) {                                      // columnas (de atras hacia adelante: las de y menor primero)
    var by = colY[k];
    box(base, cx - 5, by - CH, 10, CH, 0, SC);
    base.rect(cx - 6, by - CH - 1, 12, 3, SC[3]); base.rect(cx - 6, by - CH - 1, 12, 1, SC[4]);        // capitel
    base.rect(cx - 6, by - 3, 12, 4, SC[2]); base.rect(cx - 6, by - 3, 12, 1, SC[3]); base.rect(cx - 6, by, 12, 1, SC[0]);   // zocalo
    for (y = by - CH + 8; y < by - 4; y += 11) base.rect(cx - 4, y, 8, 1, SC[1]);
  });
  // viga continua que sigue la curva: tapa (8 px de ancho visible), canto frontal de 6 px; costillas transversales
  for (x = 10; x <= 234; x++) {
    var yb = gy(x) - CH + 1;
    for (y = 0; y < 15; y++) {
      var c;
      if (y < 8) c = y === 0 ? SC[4] : SC[3]; else if (y < 13) c = y === 8 ? SC[3] : (y === 12 ? SC[1] : SC[2]); else c = SC[0];
      if (x === 10 || x === 11) c = y < 8 ? SC[4] : SC[3];
      if (x >= 233) c = SC[1];
      top.set(x, yb - 14 + y, c);
    }
    if ((x - 10) % 9 < 3) for (y = -7; y < 0; y++) top.set(x, yb - 14 + y, (x - 10) % 9 === 0 ? SC[4] : ((x - 10) % 9 === 1 ? SC[3] : SC[1]));   // costillas (viguetas)
  }
  var full = new G(W, H); full.blit(base, 0, 0); full.blit(top, 0, 0);
  outline(full, '#5a2a26', '#fbe0d0'); outline(base, '#5a2a26', '#fbe0d0'); outline(top, '#5a2a26', '#fbe0d0');
  var shaded = new G(W, H); shaded.blit(full, 0, 0);
  var cvFull = mk(shaded, ax, ay, 0, 0, { cast: { len: 0.22, a: 0.2 }, p: { tall: true, tree: true, canopy: { x: -ax, y: -ay + 12, w: W, h: 46 } } });
  cvFull.base = mk(base, ax, ay, 0, 0, { p: { tall: true } });
  cvFull.top = mk(top, ax, ay, 0, 0, { p: { tall: true } });
  cvFull.colAt = colX.map(function (cx, k) { return { x: cx - ax, y: colY[k] - ay }; });         // base de cada columna, relativa al ancla (para ubicar columnaPergola)
  return cvFull;
}
/* Letrero sobre la boca de la calle (4 tiles = 64 px): dos columnas de baston rojiblancas y un tablero verde con dos renglones.
   Ancla abajo al centro de la calle; las columnas caen a +-40 px (justo fuera del ancho de la calle). 104x104. */
function arcoPizzas() {
  var W = 104, H = 104, g = new G(W, H), ay = 98, cx = 52, x, y, i, emits = [];
  [8, 96].forEach(function (px_) {                                                                       // columnas rojiblancas
    for (y = 24; y <= ay; y++) for (i = -3; i <= 3; i++) {
      var stripe = Math.floor((y + i * 1.3 + (px_ > 50 ? 2 : 0)) / 4) % 2, f = (i + 3) / 6, c;
      c = stripe ? (f < 0.3 ? '#fbf6e8' : (f < 0.7 ? '#e0dccc' : '#a8a498')) : (f < 0.3 ? '#e8483c' : (f < 0.7 ? '#c0312e' : '#8a1a1f'));
      g.set(px_ + i, y, c);
    }
    g.rect(px_ - 5, ay - 2, 11, 3, '#a8a498'); g.rect(px_ - 5, ay - 2, 11, 1, '#d8d4c4'); g.disc(px_, 21, 3, '#e8c860'); g.set(px_ - 1, 20, '#fff0a0');
  });
  g.rect(6, 26, 92, 32, '#1f5a3d'); g.rect(6, 26, 92, 1, '#2f7a52'); g.rect(6, 57, 92, 1, '#123826');                           // tablero
  g.rect(6, 26, 92, 1, '#e8c860'); g.rect(6, 57, 92, 1, '#e8c860'); g.rect(6, 26, 1, 32, '#e8c860'); g.rect(97, 26, 1, 32, '#e8c860');
  g.rect(8, 28, 88, 1, '#2f7a52'); g.rect(8, 55, 88, 1, '#123826');
  for (x = 10; x < 96; x += 10) { g.set(x, 26, '#fff0a0'); g.set(x, 57, '#fff0a0'); }
  px.text(g, 'CALLE DE LAS', cx, 31, { font: 'a7', ink: '#f6ecd0', shadow: '#0e2a1c', align: 'c' });
  px.text(g, 'PIZZAS', cx, 41, { font: 'a12', ink: '#f2d24a', shadow: '#7a2a14', align: 'c' });
  [[17, 49], [87, 49]].forEach(function (p) { g.disc(p[0], p[1], 4.2, '#e8c070'); g.disc(p[0], p[1], 3.2, '#d8382a'); g.set(p[0] - 1, p[1] - 1, '#f2d24a'); g.set(p[0] + 1, p[1], '#3f9a5a'); g.set(p[0], p[1] + 1, '#f3efe2'); });   // pizzas
  for (x = 6; x <= 97; x++) { var t = (x - cx) / 46, yy = 25 - Math.round(8 * (1 - t * t)); g.set(x, yy, '#e8c860'); g.set(x, yy + 1, '#a8841f'); if ((x % 6) === 0) g.set(x, yy - 1, '#fff0a0'); }   // cornisa curva
  for (x = 10; x <= 94; x++) { var t2 = (x - cx) / 42, yy2 = 61 + Math.round(5 * (1 - t2 * t2)); g.set(x, yy2, '#3a3844'); if ((x - 10) % 7 === 0) { g.set(x, yy2 + 1, '#ffe9a8'); g.set(x, yy2 + 2, '#ffb85a'); emits.push({ x: x - cx, y: yy2 + 1 - ay, kind: 'ventana', r: 3, col: '#ffcf8a' }); } }   // cuerda de luces
  outline(g, K, '#fff4d0');
  contact(g, 8, ay + 1, 7, 2, '#2a244066'); contact(g, 96, ay + 1, 7, 2, '#2a244066');
  return mk(g, cx, ay, 0, 0, { cast: { len: 0.25, a: 0.2 }, p: { tall: true, tree: true, canopy: { x: -cx, y: -ay + 12, w: W, h: 50 }, emit: emits.filter(function (e, i2) { return i2 % 2 === 0; }) } });
}
function cortinaLuces() {                                            // cortina de luces colgante sobre la calle: 72x46, ancla abajo al centro. Rala: 9 hilos cada 8 px, pocas bombillas (no tapa el piso)
  var W = 72, H = 46, g = new G(W, H), x, y, i, emits = [];
  for (x = 0; x < W; x++) { var t = (x - 36) / 36; g.set(x, 2 + Math.round(2 * (1 - t * t)), '#2d2b36'); g.set(x, 3 + Math.round(2 * (1 - t * t)), '#15131a'); }
  for (i = 0; i < 9; i++) {
    var sx = 4 + i * 8, len = 8 + ((i * 7) % 4) * 3, top = 5 + Math.round(2 * (1 - Math.pow((sx - 36) / 36, 2)));
    for (y = top; y < top + len; y++) g.set(sx, y, '#3a3746');
    g.set(sx, top + len, '#ffe9a8'); g.set(sx, top + len + 1, '#ffb85a'); g.set(sx - 1, top + len, '#fff4d0');
    if (i % 4 === 2) emits.push({ x: sx - 36, y: top + len - 44, kind: 'ventana', r: 3, col: '#ffcf8a' });
  }
  return mk(g, 36, 44, 0, 0, { p: { tall: true, emit: emits, shadowIn: true } });
}
function mesaPizzeria(side) {                                        // mesa redonda con mantel a cuadros y UNA silla negra por fuera (side 0: izquierda, 1: derecha); 29x32, ancla en el centro del mantel
  var W = 29, g = new G(W, 32), x, y, ay = 28, cx = side ? 11 : 17, sx = side ? 25 : 3, dir = side ? -1 : 1;
  g.rect(sx - 3, 12, 6, 2, '#2d2b36'); g.rect(sx - 3, 12, 6, 1, '#4a4756'); g.rect(sx - 3, 14, 6, 6, '#15131a'); g.rect(sx - 3, 14, 1, 6, '#2d2b36');   // silla de bistro
  g.rect(sx - 3 + (dir > 0 ? 0 : 5), 4, 1, 9, '#2d2b36'); g.rect(sx - 3, 4, 6, 2, '#2d2b36'); g.rect(sx - 3, 4, 6, 1, '#4a4756');
  g.rect(sx - 2, 20, 1, 7, '#15131a'); g.rect(sx + 2, 20, 1, 7, '#15131a');
  g.rect(cx - 1, 18, 3, 9, '#2d2b36'); g.rect(cx - 5, 26, 11, 2, '#2d2b36'); g.rect(cx - 5, 26, 11, 1, '#4a4756');
  for (y = 6; y < 19; y++) for (x = cx - 11; x < cx + 12; x++) {                                          // mantel rojiblanco
    var dx = (x - cx + 0.5) / 11, dy = (y - 12 + 0.5) / 6.4, d = dx * dx + dy * dy;
    if (d >= 1) continue;
    var ch = (Math.floor((x - cx + 11) / 3) + Math.floor((y - 6) / 3)) % 2;
    g.set(x, y, d > 0.8 ? (ch ? '#a8201f' : '#d8d4c4') : (ch ? '#d8383a' : '#f3efe2'));
  }
  g.rect(cx - 2, 9, 4, 3, '#2d6a4a'); g.rect(cx - 2, 9, 4, 1, '#4a9a6a'); g.set(cx - 1, 7, '#e8382a'); g.set(cx, 6, '#f2d24a');   // frasco de flores
  outline(g, K, '#fff0e0');
  contact(g, cx, ay + 1, 14, 2.4, '#2a244066');
  return mk(g, cx, ay, 15, 7, { cast: { len: 0.4, a: 0.18 } });
}
function atrilMenu() {                                               // atril de maitre con la carta; 16x32
  var g = new G(16, 32), ay = 29, x, y, i;
  tube(g, 4, 12, 2, ay, ['#2a1c14', '#4a3028', '#6b4223', '#a86e38']); tube(g, 11, 12, 13, ay, ['#2a1c14', '#4a3028', '#6b4223', '#a86e38']); g.rect(3, 22, 9, 1, '#4a3028');
  g.rect(2, 3, 12, 11, '#2a1c14'); g.rect(3, 4, 10, 9, '#1f3a2e'); g.rect(3, 4, 10, 1, '#2f5a46');
  g.rect(4, 5, 8, 1, '#f6ecd0'); for (i = 0; i < 4; i++) g.rect(4, 7 + i * 2, 6 - (i % 2) * 2, 1, '#cfc8b0'); g.set(11, 11, '#e8382a');
  g.rect(2, 14, 12, 2, '#6b4223'); g.rect(2, 14, 12, 1, '#a86e38');
  outline(g, K, '#d8b080');
  contact(g, 8, ay + 1, 7, 1.6, '#2a244066');
  return mk(g, 8, ay, 8, 4, { cast: { len: 0.4, a: 0.16 } });
}

function bakeMisc2() {
  props.columpio = columpio(); props.tobogan = tobogan(); props.subeBaja = subeBaja();
  props.toldoFeria = [0, 1, 2].map(toldoFeria);
  props.caballetePintor = [0, 1, 2].map(caballetePintor);
  props.mesaAjedrez = mesaAjedrez(); props.kioscoGolosinas = kioscoGolosinas();
  props.basureroMira = basureroMira(false); props.basureroMira.broken = basureroMira(true);
  props.cajaGatos = cajaGatos();
  props.columnaPergola = columnaPergola(); props.pergolaSalmon = pergolaSalmon();
  props.arcoPizzas = arcoPizzas(); props.cortinaLuces = cortinaLuces();
  props.mesaPizzeria = [mesaPizzeria(0), mesaPizzeria(1)]; props.atrilMenu = atrilMenu();
}
function bakeMisc1() {
  props.seto = seto();
  props.parterreRojo = parterre("red"); props.parterreAmarillo = parterre("yel");
  props.rejita = rejita();
  props.banca = banca(); props.muroBanca = muroBanca(); props.cilindroGranito = cilindroGranito();
  props.farolGlobo = farolGlobo(false); props.farolGlobo.dark = farolGlobo(true);
  props.farolGloboDoble = farolGloboDoble(false); props.farolGloboDoble.dark = farolGloboDoble(true);
  bakePiletas(); bakeGradas();
  props.toritoPucara = toritoPucara();
  props.busto = [bustoPeana("bronce"), bustoPeana("granito")];
  props.vasija = vasija(); props.mastilBandera = mastilBandera();
}
/*@@PARTE6@@*/

/* ============================ HORNEADO ============================ */
var NOW = function () { return (window.performance || Date).now(); }, tm = mira.timing = {};
[['tiles', bakeTiles], ['decals', bakeDecals], ['arboles', bakeTrees], ['mobiliario1', bakeMisc1], ['mobiliario2', bakeMisc2]].forEach(function (st) {
  var a = NOW(); st[1](); tm[st[0]] = Math.round(NOW() - a);
});
mira.bakeMs = Math.round(NOW() - T0);
/* Ayudas para quien coloca: agua animada (3 cuadros: elegir v = floor(t * fps) % 3) y las 4 piezas de grada con su posicion respecto del centro de la rotonda. */
mira.anim = { piletaOvalo: { frames: 3, fps: 3 }, piletaChica: { frames: 3, fps: 3 } };
mira.rotonda = { radio: 68, pieces: props.gradaRotonda.map(function (p, i) { return { v: i, dir: ['N', 'E', 'S', 'O'][i], dx: p.dx, dy: p.dy }; }) };
mira.pergola = { columnaPergola: props.pergolaSalmon.colAt };
mira.provided = {
  tiles: ['pasto', 'pastoFlor', 'adoquinEspiga', 'adoquinGris', 'veredaMira', 'ciclovia', 'pisoRotonda', 'bordilloAmarilloN', 'bordilloAmarilloS', 'bordilloMiraN', 'bordilloMiraS', 'pastoDiag', 'veredaDiag', 'curbDiagA', 'curbDiagB', 'curbDiagB2'],
  props: ['palmera', 'palmeraSeca', 'ficus', 'jacaranda', 'seto', 'parterreRojo', 'parterreAmarillo', 'rejita', 'banca', 'muroBanca', 'cilindroGranito', 'farolGlobo', 'farolGloboDoble',
    'piletaOvalo', 'piletaChica', 'gradaRotonda', 'toritoPucara', 'busto', 'vasija', 'mastilBandera', 'columpio', 'tobogan', 'subeBaja', 'toldoFeria', 'caballetePintor', 'mesaAjedrez',
    'kioscoGolosinas', 'basureroMira', 'cajaGatos', 'columnaPergola', 'pergolaSalmon', 'arcoPizzas', 'cortinaLuces', 'mesaPizzeria', 'atrilMenu']
};
})();
