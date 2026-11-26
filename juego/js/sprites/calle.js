/* ACHORADO - js/sprites/calle.js  (v0.4, fase B)
 * Dueño: sprites (calle).  Se carga despues de js/sprites.js y antes del motor. Usa ACH.px (base.js).
 * Reemplaza / extiende ACH.sprites.tiles y ACH.sprites.decals (el resto de las claves de v0.3 se conserva).
 *
 * TILES (16x16, el suelo no se comprime: 1 m = 16 px)
 *   asphalt[8]  asphaltCrack[4]  laneDashH  sidewalk[6]  curbN[3]  curbS[3]  curbNYellow[2]  curbSYellow[2]
 *   berma[5]  bermaN[2]  bermaS[2]  (los dos ultimos: borde de la berma con sardinel; ver nota abajo)
 *   alley[3]  zebraH[3]  humpV  stairs (placeholder)
 *   Claves viejas regeneradas desde las nuevas (misma forma): laneDash, curbW, curbE, curbWYellow, curbEYellow, zebra, hump.
 * DECALS (ancla ax/ay = centro inferior, sin colision)
 *   charco[4] parche[3] aceite[2] frenada[2] buzon[2] vidrio[2] sangre[3] legend[6] sombraArbol[2] arena[3]
 *   extras: rodada[2] (huellas pulidas de llanta, horizontales) y lavado[2] (manchas de tono de gran escala: 0 oscura, 1 clara)
 *   legend: 0 DESPACIO, 1 PARE, 2 BUS, 3 flecha ->, 4 flecha <-, 5 CEDA.   arena: 0 denso arriba (sardinel norte),
 *   1 denso abajo (sardinel sur), 2 monton suelto.
 *
 * Tecnica: rampas con giro de matiz (asfalto: oscuros azul-frio -> claros arena calida), mancha de baja frecuencia con
 * ventana que la apaga en el borde del tile (asi cualquier par de variantes vecinas encaja y la grilla de 16 px no se ve),
 * tramado ordenado 4x4 solo en transiciones graduales, 70/30 descanso/detalle.
 * Luz: noroeste. Las caras visibles son las que miran al sur (curbN, bermaS); en curbS/bermaN la cara norte queda oculta.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px;
var S = ACH.sprites;
var G = px.G, RAMPS = px.RAMPS, rngf = px.rng;

/* ======================== PALETAS ======================== */
/* asfalto: 0 profundo (grieta) .. 3 base .. 5 polvo calido .. 6 arena.  Luma de la base ~27 %. */
var AS = ['#26272e', '#303238', '#3b3d42', '#45474a', '#505152', '#5f5e5a', '#7b7360'];
/* concreto: 0 junta .. 3 base .. 5 filo claro */
var SW = ['#4d4b57', '#69686f', '#7d7c7a', '#8e8c86', '#a09d92', '#b5b1a1', '#c9c5b5'];
/* tierra seca de berma */
var DT = ['#4a4141', '#625549', '#78695a', '#8c7b66', '#a39179', '#bcab92'];
/* callejon: tierra apisonada y humeda, mas oscura que la berma */
var AL = ['#2b2a31', '#37353a', '#433f3e', '#524b44', '#635a4d', '#78705c'];
var PW = RAMPS.paintWhite;       // pintura de pista
var YL = RAMPS.curbYellow;       // amarillo de sardinel
var ZP = ['#6b6c70', '#8f8f8a', '#aaa690', '#c4bfa6'];   // pintura vial gastada: sucia, mas baja que la rampa limpia
var JT = '#7a797b';             // junta de losa: apenas mas oscura que el concreto

/* ======================== UTILIDADES ======================== */
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function hash2(i, j, s) {
  var h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}
function vnoise(seed, cell) {              // ruido de valor suave en [0,1], reticula de `cell` px
  return function (x, y) {
    var u = x / cell, v = y / cell, i = Math.floor(u), j = Math.floor(v), fu = smooth(u - i), fv = smooth(v - j);
    var a = hash2(i, j, seed), b = hash2(i + 1, j, seed), c = hash2(i, j + 1, seed), d = hash2(i + 1, j + 1, seed);
    return (a + (b - a) * fu) * (1 - fv) + (c + (d - c) * fu) * fv;
  };
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
function bay(x, y) { return (BAY4[((y & 3) << 2) | (x & 3)] + 0.5) / 16; }     // umbral de tramado ordenado 4x4
function hex8(c, a) { var v = clamp(Math.round(a * 255), 0, 255); return c + (v < 16 ? '0' : '') + v.toString(16); }
function copyRows(dst, src, y0, y1) { for (var y = y0; y <= y1; y++) for (var x = 0; x < 16; x++) dst.set(x, y, src.get(x, y)); }
function toC(g) { return g.toCanvas(); }
function mix(a, b, t) { return px.mix(a, b, t); }

/* Mancha de baja frecuencia + granito disperso. La amplitud se apaga hacia el borde del tile: los vecinos siempre encajan. */
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
function line(g, pts, c, set) {            // polilinea; `set` (opcional) recoge los pixeles pintados
  for (var i = 0; i < pts.length - 1; i++) g.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c);
}
function lipCrack(g, ptsList, core, lip, r) {   // pinta grietas y un filo claro al sureste (la pared que mira a la luz)
  var mask = {};
  ptsList.forEach(function (pts) {
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], dx = Math.abs(b[0] - a[0]), dy = Math.abs(b[1] - a[1]), n = Math.max(dx, dy, 1);
      for (var s = 0; s <= n; s++) { var x = Math.round(a[0] + (b[0] - a[0]) * s / n), y = Math.round(a[1] + (b[1] - a[1]) * s / n); mask[x + ',' + y] = 1; }
    }
  });
  Object.keys(mask).forEach(function (k) {
    var p = k.split(','), x = +p[0], y = +p[1];
    if (x < 0 || y < 0 || x > 15 || y > 15) return;
    g.set(x, y, core);
    if (!mask[(x + 1) + ',' + (y + 1)] && r() < 0.75) g.set(x + 1, y + 1, lip);
    else if (!mask[(x + 1) + ',' + y] && r() < 0.4) g.set(x + 1, y, lip);
  });
}
function jag(r, a, b, n, step) {            // camino quebrado de a a b con n quiebres
  var pts = [a.slice()];
  for (var i = 1; i < n; i++) pts.push([a[0] + (b[0] - a[0]) * i / n + (r() - 0.5) * step, a[1] + (b[1] - a[1]) * i / n + (r() - 0.5) * step]);
  pts.push(b.slice());
  return pts.map(function (p) { return [Math.round(p[0]), Math.round(p[1])]; });
}

/* ======================== ASFALTO ======================== */
function asphaltG(v) {
  var seed = 40 + v * 7;
  var amps = [0.3, 0.25, 0.32, 0.27, 0.3, 0.3, 0.25, 0.27];     // v0.4 #6: mitad del moteado
  var g = mottle(seed, AS, { amp: amps[v % 8], base: 3, light: 0.02, dark: 0.02 }), r = rngf(seed * 31 + 7), x, y;
  function dither(cx, cy, rx, ry, col, strength) {       // mancha circular tramada que se apaga hacia el borde
    for (y = 0; y < 16; y++) for (x = 0; x < 16; x++) {
      var d = Math.sqrt(((x - cx) / rx) * ((x - cx) / rx) + ((y - cy) / ry) * ((y - cy) / ry));
      if (d < 1 && bay(x, y) < (1 - d) * strength) g.set(x, y, col);
    }
  }
  if (v === 3) { lipCrack(g, [jag(r, [4, 8], [12, 7], 4, 2)], AS[1], AS[4], r); }         // sello de brea
  if (v === 4) { [[4, 5], [10, 11]].forEach(function (p) { g.set(p[0], p[1], AS[6]); g.set(p[0] + 1, p[1], AS[5]); g.set(p[0], p[1] + 1, AS[0]); }); }   // piedritas
  if (v === 6) { g.set(7, 8, AS[0]); g.set(8, 8, AS[0]); g.set(7, 9, AS[0]); g.set(8, 7, AS[1]); g.set(9, 9, AS[4]); g.set(6, 7, AS[4]); g.set(7, 10, AS[4]); g.set(8, 10, AS[4]); }   // huequito
  if (v === 7) { for (var i = 0; i < 12; i++) { var px_ = 6 + Math.floor(r() * 7), py_ = 7 + Math.floor(r() * 7); if (r() < 0.6) g.set(px_, py_, r() < 0.4 ? AS[6] : AS[5]); } }   // arena regada
  return g;
}
function asphaltCrackG(v) {
  /* Mas livianas que antes (amp 0.62 como el asfalto comun, grietas cortas y de 1 px): las 4 primeras con un trazo, las 2 ultimas solo un hilo. */
  var seed = 140 + v * 11, g = mottle(seed, AS, { amp: 0.62, base: 3 }), r = rngf(seed * 13 + 1);
  var core = AS[1], lip = AS[4];
  if (v === 0) {
    lipCrack(g, [jag(r, [3, 4], [12, 11], 4, 2)], core, lip, r);
    g.set(8, 8, AS[5]);
  } else if (v === 1) {                                        // Y corta
    lipCrack(g, [[[4, 3], [6, 6], [8, 9], [9, 13]], [[6, 6], [10, 5]]], core, lip, r);
    g.set(7, 7, AS[5]);
  } else if (v === 2) {                                        // dos celdas, no toda la piel de cocodrilo
    lipCrack(g, [[[3, 5], [7, 4], [11, 5]], [[7, 4], [6, 8], [3, 9]], [[6, 8], [10, 9]]], core, lip, r);
    g.set(5, 6, AS[4]); g.set(9, 7, AS[4]);
  } else if (v === 3) {                                        // grieta longitudinal con un bachecito
    lipCrack(g, [jag(r, [2, 6], [13, 6], 5, 1)], core, lip, r);
    g.ell(9.5, 10, 1.8, 1.1, AS[0]); g.set(8, 9, AS[4]); g.set(9, 9, AS[4]); g.set(11, 11, AS[4]);
  } else if (v === 4) {                                        // hilo diagonal
    lipCrack(g, [jag(r, [3, 12], [12, 3], 3, 1)], AS[2], AS[4], r);
  } else {                                                     // hilo horizontal quebrado
    lipCrack(g, [jag(r, [2, 8], [13, 9], 4, 1)], AS[2], AS[4], r);
    g.set(5, 11, AS[5]);
  }
  return g;
}
function paintDash(g, x0, x1, y0, h, seed) {              // pintura gastada sobre asfalto ya pintado en g
  var r = rngf(seed), n = vnoise(seed + 5, 3);
  for (var y = y0; y < y0 + h; y++) for (var x = x0; x <= x1; x++) {
    var wr = n(x * 1.3, y * 2.2), edge = (x === x0 || x === x1) ? 0.22 : 0;
    var c = ZP[2];
    if (wr > 0.72 - edge) { if (bay(x, y) < 0.5) continue; c = ZP[1]; }          // pintura saltada, se ve el asfalto
    else if (wr < 0.28) c = ZP[3];                                                // pintura mas fresca
    if (r() < 0.04) c = ZP[1];
    g.set(x, y, c);
  }
}
function laneDashHG() {
  var g = asphaltG(0), r = rngf(931);
  paintDash(g, 3, 12, 7, 2, 931);
  g.set(2, 7, ZP[0]); g.set(13, 8, ZP[0]);                                         // polvo en las puntas
  [[5, 6], [9, 9], [11, 6], [4, 9]].forEach(function (p) { if (r() < 0.8) g.set(p[0], p[1], AS[5]); });   // polvo calido pegado a la pintura
  g.set(7, 10, AS[1]); g.set(8, 10, AS[1]);                                        // huella
  return g;
}

/* ======================== CONCRETO: VEREDA ======================== */
function slabG(seed, o) {
  o = o || {};
  var g = mottle(seed, SW, { amp: 0.32, base: 3, bias: o.bias || 0, light: 0.025, dark: 0.025 }), r = rngf(seed * 53 + 3), x, y;
  var jx = o.jx === undefined ? 0 : o.jx;
  for (x = 0; x < 16; x++) { g.set(x, 0, r() < 0.12 ? SW[3] : JT); if (x % 6 === 1) g.set(x, 1, SW[3]); }   // junta norte con filo claro debajo
  for (y = 1; y < 16; y++) { g.set(jx, y, r() < 0.18 ? SW[2] : JT); if (jx + 1 < 16 && y % 8 === 3) g.set(jx + 1, y, SW[3]); }
  if (o.mid) for (y = 1; y < 16; y++) { g.set(o.mid, y, r() < 0.18 ? SW[2] : JT); if (y % 4 === 1) g.set(o.mid + 1, y, SW[3]); }
  return g;
}
function patchRect(g, x0, y0, x1, y1, seed) {            // parche de concreto nuevo: mas claro, borde quebrado
  var r = rngf(seed), n = vnoise(seed + 3, 3);
  for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
    var j = (x === x0 || x === x1 || y === y0 || y === y1) && r() < 0.28;
    if (j) continue;
    var c = n(x, y) > 0.55 ? SW[4] : SW[3];
    if (x === x0 || y === y0) c = SW[2];                    // borde norte y oeste: sombra
    else if (x === x1 || y === y1) c = SW[5];               // borde sur y este: filo
    g.set(x, y, c);
  }
}
function sidewalkG(v) {
  var seed = 100 + v * 9, r = rngf(seed * 7 + 1), g, x, y;
  var bias = [0, 0.05, -0.05, 0.02, -0.03, 0, 0.03, -0.02, 0.01, -0.02, 0.04][v];
  if (v === 0) {                                            // losa limpia, desgaste leve
    g = slabG(seed, { jx: 0, bias: bias });
    g.set(5, 6, SW[2]); g.set(11, 11, SW[5]); g.set(10, 12, SW[5]);
  } else if (v === 1) {                                     // losa larga (junta corrida a la mitad)
    g = slabG(seed, { jx: 8, bias: bias });
    g.set(3, 5, SW[2]); g.set(4, 5, SW[2]); g.set(12, 10, SW[5]);
  } else if (v === 2) {                                     // dos losas angostas
    g = slabG(seed, { jx: 0, mid: 8, bias: bias });
    g.set(12, 12, SW[2]); g.set(4, 9, SW[5]);
  } else if (v === 3) {                                     // parchada (parche chico y discreto)
    g = slabG(seed, { jx: 0, bias: bias });
    patchRect(g, 8, 6, 12, 9, seed + 1);
  } else if (v === 4) {                                     // una grieta fina
    g = slabG(seed, { jx: 8, bias: bias });
    lipCrack(g, [[[2, 4], [5, 6], [8, 8], [11, 11], [13, 12]]], '#6a6871', SW[4], r);
  } else if (v === 8) {                                     // losa limpia, mitad derecha
    g = slabG(seed, { jx: 5, bias: bias });
    g.set(10, 5, SW[2]); g.set(3, 12, SW[5]);
  } else if (v === 9) {                                     // dos losas, limpia
    g = slabG(seed, { jx: 0, mid: 6, bias: bias });
    g.set(11, 8, SW[5]); g.set(9, 3, SW[2]);
  } else if (v === 10) {                                    // losa larga limpia con una mancha
    g = slabG(seed, { jx: 11, bias: bias });
    g.set(4, 9, SW[2]); g.set(5, 9, SW[2]); g.set(8, 12, SW[5]);
  } else if (v === 5) {                                     // mojada y manchada, con chicles
    g = slabG(seed, { jx: 0, bias: bias });
    for (y = 3; y < 14; y++) for (x = 2; x < 14; x++) {
      var d = Math.sqrt((x - 6.5) * (x - 6.5) / 30 + (y - 8.5) * (y - 8.5) / 14);
      if (d < 1 && bay(x, y) < (1 - d) * 1.2) g.set(x, y, SW[2]);
    }
    [[11, 4], [12, 10], [4, 13]].forEach(function (p) { g.set(p[0], p[1], SW[1]); });
    g.set(3, 5, SW[1]); g.set(2, 6, SW[1]);
  } else if (v === 6) {                                     // esquina descascarada + tierra
    g = slabG(seed, { jx: 0, bias: bias });
    [[3, 3], [4, 3], [5, 3], [3, 4], [4, 4], [3, 5], [4, 5], [5, 4]].forEach(function (p, i) { g.set(p[0], p[1], i % 3 === 0 ? SW[1] : SW[2]); });
    g.set(6, 4, SW[5]); g.set(5, 5, SW[5]); g.set(4, 6, SW[5]); g.set(6, 5, SW[4]);
    for (var i = 0; i < 22; i++) { x = 8 + Math.floor(r() * 7); y = 8 + Math.floor(r() * 7); if (bay(x, y) < (x + y - 14) / 14) g.set(x, y, r() < 0.5 ? DT[4] : DT[3]); }
  } else {                                                  // yerbita en la junta
    g = slabG(seed, { jx: 0, bias: bias });
    [[0, 10], [0, 11], [1, 10], [1, 9]].forEach(function (p, k) { g.set(p[0], p[1], k % 2 ? '#4a5a44' : '#6b7a4f'); });
    lipCrack(g, [[[7, 9], [9, 12], [8, 14]]], SW[1], SW[5], r);
    g.set(12, 3, SW[1]); g.set(13, 3, SW[2]); g.set(12, 4, SW[2]);
  }
  return g;
}

/* ======================== SARDINEL ======================== */
/* Geometria del tile (16 filas). La cara vertical de 3 px solo se ve del lado sur.
 * curbN  (vereda al norte, pista al sur):  0-5 superficie | 6 junta | 7-8 tapa | 9 filo | 10-12 cara sur | 13 oclusion | 14-15 cuneta
 * curbS  (pista al norte, vereda al sur):  0-7 asfalto con polvo | 8 mugre | 9 filo | 10-11 tapa | 12 junta | 13-15 vereda  (cara norte oculta) */
function curbTop(g, y, r, jointX) {                       // pinta una fila de tapa de sardinel
  for (var x = 0; x < 16; x++) { var u = r(); g.set(x, y, u < 0.14 ? SW[3] : u < 0.4 ? SW[5] : SW[4]); }
  g.set(jointX, y, y === 9 ? SW[2] : SW[2]);
}
function curbNG(v, o) {
  var seed = 500 + v * 11 + (o.dirt ? 300 : 0), r = rngf(seed), g = new G(16, 16), x, y;
  var surf = o.dirt ? bermaG(v) : slabG(seed + 1, { jx: 0 });
  var road = asphaltG(v + 1);
  copyRows(g, surf, 0, 5);
  copyRows(g, road, 13, 15);
  if (o.dirt) {                                            // el suelo se muere contra el sardinel
    for (x = 0; x < 16; x++) { g.set(x, 5, r() < 0.5 ? DT[1] : DT[2]); g.set(x, 6, r() < 0.7 ? DT[0] : DT[1]); }
    for (x = 0; x < 16; x++) if (r() < 0.3) g.set(x, 7, DT[3]);
  } else for (x = 0; x < 16; x++) g.set(x, 6, r() < 0.15 ? SW[2] : SW[1]);
  var jx = 0;
  curbTop(g, 7, r, jx); curbTop(g, 8, r, jx);
  if (o.dirt) for (x = 0; x < 16; x++) if (r() < 0.22) g.set(x, 7 + (r() < 0.4 ? 1 : 0), DT[3]);   // tierra sobre la tapa
  for (x = 0; x < 16; x++) g.set(x, 9, r() < 0.25 ? SW[5] : SW[6]);                                 // filo iluminado
  var face = ['#76747b', '#5f5d67', '#494751'];
  for (y = 10; y <= 12; y++) for (x = 0; x < 16; x++) {
    var c = face[y - 10], u = r();
    if (u < 0.1) c = face[Math.max(0, y - 11)]; else if (u < 0.17 && y < 12) c = face[y - 9];
    g.set(x, y, c);
  }
  for (y = 7; y <= 12; y++) g.set(0, y, y < 9 ? SW[2] : SW[0]);                                    // junta entre piedras
  for (y = 10; y <= 12; y++) g.set(1, y, y === 10 ? SW[3] : SW[2]);
  var nchip = 2 + (v % 2);
  for (var k = 0; k < nchip; k++) {                         // despostillado
    x = 3 + Math.floor(r() * 11); g.set(x, 9, SW[2]); g.set(x, 10, SW[0]);
    if (r() < 0.6) { g.set(x + 1, 9, SW[3]); g.set(x - 1 < 2 ? 3 : x - 1, 10, SW[1]); }
  }
  [[5 + v * 2, 10], [10 - v, 10]].forEach(function (p) { g.set(p[0], p[1], SW[1]); g.set(p[0], p[1] + 1, SW[0]); });   // chorrera
  for (x = 0; x < 16; x++) {                                // oclusion bajo el sardinel (2 px al 35 % y 2 al 15 %)
    g.set(x, 13, r() < 0.2 ? AS[1] : AS[0]);
    g.set(x, 14, bay(x, 14) < 0.55 ? AS[1] : AS[2]);
    if (bay(x, 15) < 0.3) g.set(x, 15, AS[2]);
    if (r() < 0.12) g.set(x, 14 + (r() < 0.5 ? 1 : 0), r() < 0.5 ? AS[5] : AS[6]);                   // polvo en la cuneta
  }
  return g;
}
function curbSG(v, o) {
  var seed = 540 + v * 11 + (o.dirt ? 300 : 0), r = rngf(seed), g = new G(16, 16), x, y;
  var road = asphaltG(v + 3);
  var surf = o.dirt ? bermaG(v + 1) : slabG(seed + 1, { jx: 0 });
  copyRows(g, road, 0, 7);
  copyRows(g, surf, 13, 15);
  for (y = 5; y <= 7; y++) for (x = 0; x < 16; x++) {                                              // polvo en la cuneta, mas denso junto al sardinel
    if (r() < (y - 4) * 0.14) g.set(x, y, r() < 0.4 ? AS[6] : AS[5]);
  }
  for (x = 0; x < 16; x++) g.set(x, 8, r() < 0.25 ? AS[2] : AS[1]);                                // mugre pegada al pie
  for (x = 0; x < 16; x++) g.set(x, 9, r() < 0.25 ? SW[5] : SW[6]);                                 // filo iluminado (cara norte oculta)
  curbTop(g, 10, r, 0); curbTop(g, 11, r, 0);
  for (y = 9; y <= 11; y++) g.set(0, y, SW[2]);
  var nchip = 1 + (v % 2);
  for (var k = 0; k < nchip; k++) { x = 3 + Math.floor(r() * 11); g.set(x, 9, SW[3]); g.set(x, 10, SW[2]); }
  if (o.dirt) { for (x = 0; x < 16; x++) { g.set(x, 12, r() < 0.7 ? DT[1] : DT[0]); if (r() < 0.25) g.set(x, 11, DT[3]); } }
  else for (x = 0; x < 16; x++) g.set(x, 12, r() < 0.15 ? SW[2] : SW[1]);
  return g;
}
function paintYellow(g, seed, face) {                      // pintura amarilla gastada sobre las filas visibles del sardinel
  var n = vnoise(seed + 9, 3), r = rngf(seed + 4), x, y;
  var rows = face ? { 7: 2, 8: 2, 9: 3, 10: 1, 11: 0, 12: 0 } : { 9: 3, 10: 2, 11: 2 };
  Object.keys(rows).forEach(function (ys) {
    y = +ys;
    for (x = 0; x < 16; x++) {
      if (x === 0) continue;                               // junta entre piedras sin pintura
      var pn = n(x * 0.55, y * 1.7);
      if (pn < 0.33 || (pn < 0.42 && bay(x, y) < 0.5)) continue;      // escamas: se ve el concreto
      var c = YL[rows[ys]];
      if (r() < 0.16) c = mix(c, '#7d776a', 0.45);        // mugre
      g.set(x, y, c);
    }
  });
}

/* ======================== BERMA ======================== */
function tuft(g, x, y, r) {
  var c1 = '#a69a7a', c2 = '#857a5c', c3 = '#b9ad8c';
  g.set(x + 1, y + 1, DT[1]);
  g.set(x, y, c2); g.set(x, y - 1, c1); g.set(x, y - 2, c3);
  g.set(x - 1, y - 1, c2); g.set(x + 1, y - 2, c1);
  if (r() < 0.5) g.set(x - 1, y - 2, c1);
}
function bermaG(v) {
  var seed = 300 + v * 17, g = mottle(seed, DT, { amp: 0.8, base: 3, light: 0.07, dark: 0.06 }), r = rngf(seed * 3 + 1), x, y, i;
  if (v === 0) { tuft(g, 11, 11, r); g.set(9, 4, DT[1]); g.set(10, 4, DT[1]); }
  else if (v === 1) {                                       // basura: bolsa, tapita, piedras
    g.set(9, 6, '#cfcbbd'); g.set(10, 6, '#cfcbbd'); g.set(10, 7, '#a9a699'); g.set(11, 7, '#cfcbbd'); g.set(9, 7, '#a9a699'); g.set(11, 8, '#8a877c');
    g.set(4, 11, '#9a3b30'); g.set(5, 11, '#b8574a'); g.set(5, 12, DT[0]);
    g.set(12, 12, '#9a968c'); g.set(13, 12, '#7e7b72'); g.set(12, 13, DT[0]);
    }
  else if (v === 2) {                                     // montículo de tierra con luz noroeste
    for (y = 6; y <= 11; y++) for (x = 3; x <= 12; x++) {
      var d = ((x - 7.5) * (x - 7.5)) / 22 + ((y - 8.5) * (y - 8.5)) / 7;
      if (d < 1) g.set(x, y, (x - 7.5) + (y - 8.5) * 1.3 < -2 ? DT[4] : ((x - 7.5) + (y - 8.5) * 1.3 > 2.5 ? DT[0] : DT[3]));
    }
    for (x = 5; x <= 11; x++) g.set(x, 12, DT[1]);          // sombra al sureste
    tuft(g, 12, 4, r);
  } else if (v === 3) {                                     // tierra reseca, cuarteada
    lipCrack(g, [[[2, 4], [6, 5], [8, 8], [12, 8], [14, 6]], [[8, 8], [7, 12], [4, 14]], [[6, 5], [5, 2]]], DT[1], DT[4], r);
    g.set(11, 12, DT[5]); g.set(12, 12, DT[4]);
  } else {                                                  // pastos secos ralos y piedras
    tuft(g, 4, 5, r); tuft(g, 12, 12, r);
    for (i = 0; i < 3; i++) { x = 3 + Math.floor(r() * 10); y = 9 + Math.floor(r() * 5); g.set(x, y, '#9a968c'); g.set(x, y + 1, DT[0]); }
  }
  return g;
}

/* ======================== CALLEJON ======================== */
function alleyG(v) {
  var seed = 900 + v * 13, g = mottle(seed, AL, { amp: 0.75, base: 2, light: 0.06, dark: 0.05 }), r = rngf(seed * 5 + 3), x, y, i;
  for (i = 0; i < 5; i++) { x = 1 + Math.floor(r() * 14); y = 1 + Math.floor(r() * 14); g.set(x, y, AL[5]); }   // piedritas
  if (v === 0) {                                            // charco seco, mancha humeda tramada
    for (y = 6; y < 14; y++) for (x = 2; x < 12; x++) {
      var d = Math.sqrt((x - 6.5) * (x - 6.5) / 20 + (y - 9.5) * (y - 9.5) / 8);
      if (d < 1 && bay(x, y) < (1 - d) * 1.5) g.set(x, y, AL[0]);
    }
    g.set(4, 9, AL[1]); g.set(9, 11, AL[4]);
  } else if (v === 1) {                                     // basura: papel y lata
    g.set(9, 4, '#b9b49c'); g.set(10, 4, '#d6d1b8'); g.set(10, 5, '#9a968c'); g.set(11, 5, '#b9b49c');
    g.set(4, 11, '#7a7d80'); g.set(5, 11, '#a4abaa'); g.set(5, 12, AL[0]); g.set(4, 12, AL[0]);
    lipCrack(g, [[[2, 3], [5, 5], [7, 6]]], AL[0], AL[4], r);
  } else {                                                  // restos de losa vieja con yerbita
    for (y = 3; y < 10; y++) for (x = 6; x < 14; x++) {
      var e = (x === 6 || y === 3) ? SW[1] : (x === 13 || y === 9) ? SW[4] : SW[2];
      if (r() < 0.12) continue;
      g.set(x, y, mix(e, AL[3], 0.35));
    }
    g.set(4, 12, '#4a5a44'); g.set(4, 11, '#6b7a4f'); g.set(5, 12, '#4a5a44');
  }
  return g;
}

/* ======================== PASO DE CEBRA Y RESALTO ======================== */
/* zebraH: barras paralelas al transito (E-W), de 8 px de ancho y 16 de periodo vertical; columnas 0 y 15 sin desgaste para que enlacen. */
function zebraHG(v) {
  var seed = 700 + v * 5, g = asphaltG(v === 0 ? 2 : v + 3), r = rngf(seed), n = vnoise(seed + 7, 3.2), n2 = vnoise(seed + 13, 1.6), x;
  for (var y = 4; y <= 11; y++) for (x = 0; x < 16; x++) {
    var edge = y === 4 || y === 11, wear = n(x * 0.6, y * 2.4) * 0.75 + n2(x, y) * 0.25;
    var edgeCol = x === 0 || x === 15;
    var c = ZP[2];
    if (!edgeCol) {
      if (wear > 0.64 || (edge && r() < 0.3)) { if (bay(x, y) < 0.6) continue; c = ZP[1]; }
      else if (wear > 0.54) c = ZP[1];
      else if (wear < 0.24) c = ZP[3];
      if (r() < 0.07) c = ZP[1];
    }
    g.set(x, y, c);
  }
  for (x = 1; x < 15; x += 2) if (r() < 0.4) g.set(x, 3, AS[5]);                                  // polvo contra la barra
  for (x = 0; x < 16; x++) if (r() < 0.25) g.set(x, 12, AS[2]);
  return g;
}
/* humpV: franja vertical de 14 px, rampa oeste iluminada y este en sombra, bandas diagonales amarillo/negro gastadas. */
function humpVG() {
  var g = asphaltG(4), r = rngf(5301), n = vnoise(5311, 3), x, y;
  var YEL = ['#6a5a2c', '#8c7736', '#a28a3c', '#b49c52'], BLK = ['#1f2026', '#26282f', '#2d2f36', '#383a41'];
  for (y = 0; y < 16; y++) for (x = 1; x <= 14; x++) {
    var band = (((x + y) >> 2) & 1) === 0;                  // periodo 8: encaja en 16
    var lv = x <= 2 ? 3 : x <= 10 ? 2 : x <= 12 ? 1 : 0;    // rampa oeste iluminada, cresta, rampa este en sombra
    var c = band ? YEL[lv] : BLK[lv];
    if (n(x * 1.2, y * 0.8) > 0.58 && bay(x, y) < 0.6) c = band ? mix(YEL[lv], AS[3], 0.55) : mix(BLK[lv], AS[3], 0.4);   // desteñido
    if (r() < 0.05) c = AS[4];                                                                        // pintura saltada
    g.set(x, y, c);
  }
  for (y = 0; y < 16; y++) {
    g.set(15, y, r() < 0.7 ? AS[0] : AS[1]);                // sombra proyectada al este
    g.set(0, y, r() < 0.5 ? AS[4] : AS[3]);                 // asfalto empujado contra la rampa
    g.set(1, y, band1(y) ? '#c2aa62' : '#4a4d54');          // filo iluminado de la rampa oeste
  }
  return g;
  function band1(yy) { return (((1 + yy) >> 2) & 1) === 0; }
}
function stairsG() {                                         // placeholder: lo dibuja el lote `escalera`
  var g = new G(16, 16), r = rngf(1717);
  for (var i = 0; i < 4; i++) {
    var y0 = i * 4;
    for (var x = 0; x < 16; x++) {
      g.set(x, y0, SW[5]); g.set(x, y0 + 1, r() < 0.2 ? SW[3] : SW[4]); g.set(x, y0 + 2, SW[3]); g.set(x, y0 + 3, r() < 0.3 ? SW[0] : SW[1]);
    }
  }
  return g;
}

/* ======================== ENSAMBLAJE DE TILES ======================== */
var T = S.tiles = S.tiles || {};
var asphaltArr = [], v;
for (v = 0; v < 8; v++) asphaltArr.push(toC(asphaltG(v)));
T.asphalt = asphaltArr;
T.asphaltCrack = [0, 1, 2, 3, 4, 5].map(function (i) { return toC(asphaltCrackG(i)); });
T.laneDashH = toC(laneDashHG());
var swC = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (i) { return toC(sidewalkG(i)); });
/* El motor elige por hash % length: mas losas limpias (9 de 14) y solo 1 parche y 1 grieta, para que los defectos sean raros. */
T.sidewalk = [swC[0], swC[8], swC[1], swC[9], swC[2], swC[10], swC[0], swC[1], swC[2], swC[3], swC[4], swC[5], swC[6], swC[7]];
T.curbN = [0, 1, 2].map(function (i) { return toC(curbNG(i, {})); });
T.curbS = [0, 1, 2].map(function (i) { return toC(curbSG(i, {})); });
T.curbNYellow = [0, 1].map(function (i) { var g = curbNG(i, {}); paintYellow(g, 610 + i * 3, true); return toC(g); });
T.curbSYellow = [0, 1].map(function (i) { var g = curbSG(i, {}); paintYellow(g, 640 + i * 3, false); return toC(g); });
T.berma = [0, 1, 2, 3, 4].map(function (i) { return toC(bermaG(i)); });
T.bermaN = [0, 1].map(function (i) { return toC(curbSG(i, { dirt: true })); });     // borde norte de la berma (cara oculta)
T.bermaS = [0, 1].map(function (i) { return toC(curbNG(i, { dirt: true })); });     // borde sur de la berma (cara visible)
T.alley = [0, 1, 2].map(function (i) { return toC(alleyG(i)); });
T.zebraH = [0, 1, 2].map(function (i) { return toC(zebraHG(i)); });
T.humpV = toC(humpVG());
T.stairs = toC(stairsG());
/* claves viejas (mismo nombre y forma), regeneradas a partir de las nuevas para que el estilo no choque */
T.laneDash = px.rot90(T.laneDashH, 1);
T.curbW = px.rot90(T.curbN[0], -1);
T.curbE = px.rot90(T.curbS[0], -1);
T.curbWYellow = px.rot90(T.curbNYellow[0], -1);
T.curbEYellow = px.rot90(T.curbSYellow[0], -1);
T.zebra = px.rot90(T.zebraH[0], 1);
T.hump = px.rot90(T.humpV, 1);

/* ======================== CALCOMANIAS ======================== */
var D = S.decals = S.decals || {};
function mk(w, h, fn) { var g = new G(w, h); fn(g); return g.toCanvas(w >> 1, h - 1); }
/* campo de distancia de una mancha irregular: <1 dentro, 1 en el borde */
function blobField(w, h, seed, o) {
  o = o || {};
  var wob = o.wob === undefined ? 0.15 : o.wob, nz = o.noise === undefined ? 0.1 : o.noise, pad = o.pad === undefined ? 0.5 : o.pad;
  var p1 = hash2(1, 1, seed) * 6.28, p2 = hash2(2, 2, seed) * 6.28, p3 = hash2(3, 3, seed) * 6.28, n = vnoise(seed + 5, o.cell || 4);
  var K = 1 + wob * 1.35 + nz;
  var cx = (w - 1) / 2, cy = (h - 1) / 2, rx = ((w - 1) / 2 - pad) / K, ry = ((h - 1) / 2 - pad) / K;
  var d = new Float32Array(w * h);
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry, rho = Math.sqrt(dx * dx + dy * dy), th = Math.atan2(dy, dx);
    var wb = 1 + wob * (Math.sin(2 * th + p1) * 0.6 + Math.sin(3 * th + p2) * 0.45 + Math.sin(5 * th + p3) * 0.3);
    d[y * w + x] = rho / wb + (n(x, y) - 0.5) * nz * 2;
  }
  return d;
}

/* ---- charcos: reflejan el cielo gris, con borde mas claro ---- */
function charco(w, h, seed) {
  return mk(w, h, function (g) {
    var d = blobField(w, h, seed, { wob: 0.17, noise: 0.07, pad: 2 }), x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var v = d[y * w + x];
      if (v >= 1) { if (v < 1.13) g.set(x, y, hex8('#1e2027', 0.5)); continue; }      // asfalto mojado alrededor
      var t = y / (h - 1), c;
      if (v > 0.84) c = '#75818d';                                                         // borde claro
      else c = bay(x, y) < 0.12 + t * 0.55 ? '#424d58' : '#4b5662';                         // cielo, mas oscuro hacia el sur
      g.set(x, y, c);
    }
    for (var k = 0; k < 3; k++) {                                                          // reflejos de poste y cable
      var yy = Math.round(h * (0.3 + 0.16 * k)), x0 = Math.round(w * (0.2 + 0.1 * k)), len = Math.round(w * (0.34 - 0.09 * k));
      for (var i = 0; i < len; i++) if (d[yy * w + x0 + i] < 0.7) g.set(x0 + i, yy, k === 0 ? '#8d99a3' : '#718090');
    }
    for (y = 2; y < h * 0.45; y++) for (x = 3; x < w * 0.5; x++) if (d[y * w + x] < 0.62 && bay(x, y) < 0.22) g.set(x, y, '#56626f');
  });
}
D.charco = [charco(30, 15, 11), charco(40, 17, 23), charco(22, 12, 37), charco(34, 14, 51)];

/* ---- parches de asfalto (mas oscuros, con costura de brea) ---- */
function parche(w, h, seed, kind) {
  var PA = ['#2a2b31', '#323339', '#393b40', '#424346'];
  var OLD = ['#303136', '#37383d', '#3e3f44', '#47484b'];       // parche viejo: ya lavado por el sol y las llantas
  function sd(ex, ey, n) { return Math.pow(Math.pow(Math.abs(ex), n) + Math.pow(Math.abs(ey), n), 1 / n); }
  return mk(w, h, function (g) {
    var r = rngf(seed), n = vnoise(seed + 1, 3), x, y;
    var d1 = kind === 1 ? blobField(w, h, seed, { wob: 0.22, noise: 0.14, pad: 1, cell: 5 }) : null;
    function paintAt(x, y, dist, pal) {
      if (dist >= 1) return false;
      var c = pal[1], t = n(x, y);
      if (t > 0.62) c = pal[2]; else if (t < 0.3) c = pal[0];
      var u = r(); if (u < 0.07) c = pal[3]; else if (u < 0.12) c = pal[0];
      if (dist > 0.88) c = pal[0];                                            // costura de brea
      if (dist > 0.93 && r() < 0.5) { g.set(x, y, hex8(pal[0], 0.55)); return true; }   // borde roto
      g.set(x, y, c); return true;
    }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var ex = (x - (w - 1) / 2) / ((w - 1) / 2), ey = (y - (h - 1) / 2) / ((h - 1) / 2);
      if (kind === 0) paintAt(x, y, sd(ex * 1.03, ey * 1.06, 8) + (n(x * 1.6, y * 1.6) - 0.5) * 0.07, PA);
      else if (kind === 1) paintAt(x, y, d1[y * w + x], PA);
      else {                                                                     // dos parches encimados, el viejo debajo
        var ax = (x - w * 0.34) / (w * 0.34), ay = (y - h * 0.46) / (h * 0.46);
        paintAt(x, y, sd(ax, ay, 6) + (n(x * 1.4, y * 1.4) - 0.5) * 0.1, OLD);
      }
    }
    if (kind === 2) {
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        var bx = (x - w * 0.67) / (w * 0.27), by = (y - h * 0.58) / (h * 0.36);
        paintAt(x, y, sd(bx, by, 7) + (n(x * 1.4 + 9, y * 1.4) - 0.5) * 0.1, PA);
      }
    }
    for (x = 2; x < w - 2; x++) for (y = h - 1; y > h - 5; y--) {                  // arena pegada al borde sur
      if (g.get(x, y) && !g.get(x, y + 1) && y + 1 < h && r() < 0.3) { g.set(x, y + 1, r() < 0.5 ? AS[5] : AS[6]); break; }
    }
    if (kind === 1) lipCrackBig(g, [[[8, 5], [14, 9], [20, 8], [26, 12]]], PA[0], PA[3], r);
    if (kind === 0) for (x = 6; x < w - 6; x += 9) { g.set(x, Math.floor(h / 2), PA[0]); g.set(x + 1, Math.floor(h / 2), PA[0]); }
  });
}
function lipCrackBig(g, list, core, lip, r) {
  list.forEach(function (pts) {
    for (var i = 0; i < pts.length - 1; i++) g.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], core);
  });
}
D.parche = [parche(60, 18, 61, 0), parche(46, 26, 62, 1), parche(58, 28, 63, 2)];

/* ---- aceite: mancha oscura con borde tramado y destello iridiscente ---- */
function aceite(w, h, seed) {
  return mk(w, h, function (g) {
    var d = blobField(w, h, seed, { wob: 0.25, noise: 0.16, pad: 1, cell: 4 }), x, y, r = rngf(seed);
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var v = d[y * w + x];
      if (v < 0.42) g.set(x, y, hex8('#17181d', 0.8));
      else if (v < 0.8) { if (bay(x, y) < (0.8 - v) / 0.38 + 0.1) g.set(x, y, hex8('#1b1c22', 0.7)); else if (r() < 0.25) g.set(x, y, hex8('#1d1e24', 0.35)); }
      else if (v < 1.1) { if (r() < 0.16) g.set(x, y, hex8('#1e1f26', 0.4)); }
    }
    var irid = ['#3d4a5e', '#4a4560', '#5a4a58', '#3f5a58'];
    for (var i = 0; i < 7; i++) {                                                          // reflejo irisado hacia el noroeste
      x = Math.round(w * (0.22 + r() * 0.4)); y = Math.round(h * (0.2 + r() * 0.35));
      if (d[y * w + x] < 0.75) g.set(x, y, hex8(irid[i % 4], 0.75));
    }
    g.set(1 + Math.floor(r() * 3), h - 2, hex8('#18191e', 0.7));                          // goteo suelto
  });
}
D.aceite = [aceite(36, 22, 71), aceite(24, 15, 73)];

/* ---- huellas de frenada: dos trazos paralelos, horizontales, que se apagan con tramado ---- */
function frenada(w, h, seed, curve) {
  return mk(w, h, function (g) {
    var r = rngf(seed), n = vnoise(seed + 2, 5);
    for (var tr = 0; tr < 2; tr++) {
      var oy = 2 + tr * 6;
      for (var x = 0; x < w; x++) {
        var t = x / (w - 1), toEnd = w - 1 - x;
        var thick = x < 5 ? 1 : x < 12 ? 2 : toEnd < 5 ? 1 : toEnd < 14 ? 2 : 3;      // entra y sale adelgazando
        var cy = oy + curve * t * t * (tr ? 0.9 : 1) + Math.sin(x / 9 + tr) * 0.5;
        if ((x < 4 || toEnd < 4) && n(x * 1.7, tr * 5) > 0.55) continue;               // cortes en las puntas
        for (var k = 0; k < thick; k++) {
          var y = Math.round(cy) + k - (thick > 2 ? 1 : 0);
          if (y < 0 || y >= h) continue;
          var dark = (thick > 2 && k === 1) || thick < 3;
          g.set(x, y, dark ? hex8('#14151a', 0.74) : hex8('#181a1f', 0.55));
        }
        if (thick === 3 && n(x * 0.9, tr * 9) > 0.64) g.set(x, Math.round(cy), hex8('#2d2f36', 0.6));      // hule pulido
      }
    }
    for (var i = 0; i < 3; i++) g.set(w - 6 + Math.floor(r() * 5), 1 + Math.floor(r() * (h - 2)), hex8('#16171c', 0.55));   // migas de hule
  });
}
D.frenada = [frenada(66, 14, 81, 4), frenada(50, 13, 83, -3)];

/* ---- buzones y sumideros ---- */
function buzonRedondo() {
  return mk(18, 18, function (g) {
    var cx = 8.5, cy = 8.5, x, y, r = rngf(91);
    for (y = 0; y < 18; y++) for (x = 0; x < 18; x++) {
      var dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy);
      if (d > 7.4 && d < 8.6 && bay(x, y) < 0.5) { g.set(x, y, hex8('#17181d', 0.45)); continue; }     // oclusion
      if (d > 6.4 && d <= 7.4) { g.set(x, y, dx + dy < -1 ? '#6b6c70' : (dx + dy > 3 ? '#34363c' : '#55575c')); continue; }  // marco
      if (d <= 6.4) {
        var c = '#2b2d33';
        if (d > 5.5) c = '#202228';                                                         // junta
        else if (((x + y) % 3 === 0 && Math.abs(dx) + Math.abs(dy) > 2.5) || (x === 8 || x === 9) && Math.abs(dy) < 5 || (y === 8 || y === 9) && Math.abs(dx) < 5) c = '#3a3c44';
        if (d < 2.2) c = dx + dy < 0 ? '#4a4c52' : '#34363c';
        if (r() < 0.07) c = '#6b4a38';                                                      // oxido
        g.set(x, y, c);
      }
    }
    for (var i = 0; i < 9; i++) { x = 11 + Math.floor(r() * 6); y = 12 + Math.floor(r() * 5); if (!g.get(x, y) || r() < 0.4) g.set(x, y, r() < 0.5 ? AS[5] : AS[6]); }   // arenilla al sureste
  });
}
function sumidero() {
  return mk(26, 10, function (g) {
    var x, y, r = rngf(93);
    for (y = 0; y < 10; y++) for (x = 0; x < 26; x++) {
      if (y === 9 && bay(x, y) < 0.5) { g.set(x, y, hex8('#17181d', 0.45)); continue; }
      if (y === 8) { g.set(x, y, '#2a2c32'); continue; }
      var edge = x === 0 || x === 25 || y === 0 || y === 7;
      if (edge) { g.set(x, y, y === 0 || x === 0 ? '#6b6c70' : '#4a4c52'); continue; }
      if ((x - 2) % 4 === 0) g.set(x, y, '#5a5c62');                                         // barrotes
      else g.set(x, y, '#101116');
    }
    for (x = 3; x < 24; x++) if (r() < 0.2) g.set(x, 1 + Math.floor(r() * 5), '#6f3b2e');      // oxido
    g.set(9, 4, '#6b5a30'); g.set(10, 4, '#58492a'); g.set(10, 5, '#6b5a30'); g.set(17, 3, '#b9b49c'); g.set(18, 3, '#9a968c');   // hojas y papel
    for (x = 20; x < 25; x++) if (r() < 0.6) g.set(x, 9, r() < 0.5 ? AS[5] : AS[6]);
  });
}
D.buzon = [buzonRedondo(), sumidero()];

/* ---- vidrio roto: destellos en abanico ---- */
function vidrio(w, h, seed, n) {
  return mk(w, h, function (g) {
    var r = rngf(seed), cols = ['#c8d6d2', '#8fb2b6', '#6f8f98', '#a3bfc0'], i;
    for (i = 0; i < n; i++) {
      var t = Math.pow(r(), 1.4), x = Math.round(2 + t * (w - 5)), y = Math.round(h * 0.5 + (r() - 0.5) * (h - 3) * (0.4 + t * 0.6));
      var c = cols[Math.floor(r() * 4)], big = r() < 0.4;
      g.set(x + 1, y + 1, hex8('#1d2026', 0.5));
      g.set(x, y, c);
      if (big) { g.set(x + 1, y, cols[2]); if (r() < 0.5) g.set(x + 1, y - 1, cols[1]); }
    }
    var sx = Math.round(w * 0.55), sy = Math.round(h * 0.45);                              // un destello en cruz
    g.set(sx, sy, '#dbe6e0'); g.set(sx - 1, sy, hex8('#b9d3d4', 0.7)); g.set(sx + 1, sy, hex8('#b9d3d4', 0.7)); g.set(sx, sy - 1, hex8('#b9d3d4', 0.7)); g.set(sx, sy + 1, hex8('#b9d3d4', 0.7));
  });
}
D.vidrio = [vidrio(24, 10, 101, 15), vidrio(16, 8, 103, 9)];

/* ---- sangre seca: oscura, discreta, sin charcos brillantes ---- */
var BL = ['#2e1214', '#3a1518', '#5b1d1d', '#7a2a26'];
function sangre(kind, seed) {
  var w = [38, 20, 28][kind], h = [10, 12, 14][kind];
  return mk(w, h, function (g) {
    var r = rngf(seed), n = vnoise(seed + 3, 3), x, y, i;
    if (kind === 0) {                                                                      // arrastre
      for (x = 1; x < w - 1; x++) {
        var t = x / (w - 1), cy = 5 + Math.sin(x / 6.5) * 2 - t * 0.5, th = 1 + 3.2 * (1 - t) * (0.7 + n(x, 1) * 0.5);
        for (y = Math.round(cy - th / 2); y <= Math.round(cy + th / 2); y++) {
          if (y < 0 || y >= h) continue;
          var edge = Math.abs(y - cy) > th / 2 - 0.8;
          if (edge && bay(x, y) < 0.55) continue;
          if (t > 0.6 && bay(x, y) < (t - 0.6) * 1.6) continue;                            // se corta con tramado al final
          g.set(x, y, edge ? hex8(BL[1], 0.75) : (n(x, y) > 0.65 ? hex8(BL[3], 0.8) : hex8(BL[2], 0.85)));
        }
      }
      [[2, 1], [4, 9], [8, 8], [0, 6]].forEach(function (p) { g.set(p[0], p[1], hex8(BL[2], 0.8)); });
    } else if (kind === 1) {                                                               // mancha seca cuarteada
      var d = blobField(w, h, seed, { wob: 0.22, noise: 0.12, pad: 1, cell: 3 });
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        var v = d[y * w + x];
        if (v >= 1) continue;
        if (v > 0.8 && bay(x, y) < (v - 0.8) * 4) continue;
        g.set(x, y, v > 0.7 ? hex8(BL[1], 0.8) : (n(x * 1.3, y * 1.3) > 0.62 ? hex8(BL[3], 0.82) : hex8(BL[2], 0.88)));
      }
      var cr = [[[6, 3], [9, 5], [8, 8]], [[9, 5], [13, 5], [15, 7]], [[8, 8], [11, 9]]];
      cr.forEach(function (pts) { for (i = 0; i < pts.length - 1; i++) g.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], hex8(BL[0], 0.9)); });
    } else {                                                                               // salpicadura, gotas alargadas hacia el este
      for (i = 0; i < 11; i++) {
        var t2 = r(), gx = Math.round(3 + t2 * (w - 8)), gy = Math.round(h / 2 + (r() - 0.5) * 7 * (0.4 + t2));
        var sz = t2 < 0.45 ? 2 : 1;
        for (var k = 0; k < sz + 1; k++) g.set(gx + k, gy, hex8(k === 0 ? BL[2] : BL[1], 0.85));
        if (sz === 2) { g.set(gx, gy + 1, hex8(BL[2], 0.8)); g.set(gx + 1, gy + 1, hex8(BL[1], 0.7)); }
      }
      g.set(5, 6, hex8(BL[3], 0.8)); g.set(6, 6, hex8(BL[2], 0.85));
    }
  });
}
D.sangre = [sangre(0, 111), sangre(1, 113), sangre(2, 117)];

/* ---- pintura vial: palabras y flechas, a12 x2 (trazo de 4 px), gastadas ---- */
function wearPaint(g, seed, amt) {
  var n = vnoise(seed, 6), n2 = vnoise(seed + 4, 2.2), r = rngf(seed + 1);
  for (var y = 0; y < g.h; y++) for (var x = 0; x < g.w; x++) {
    if (!g.get(x, y)) continue;
    var m = n(x * 0.8, y * 1.2) * 0.7 + n2(x, y) * 0.3;
    var c = ZP[2];
    if (m > 0.66 - amt) { if (m > 0.72 - amt) { g.set(x, y, null); continue; } c = ZP[1]; }
    else if (m > 0.58 - amt) c = ZP[1];
    else if (m < 0.28) c = ZP[3];
    if (r() < 0.05) c = ZP[1];
    g.set(x, y, c);
  }
  for (var i = 0; i < 14; i++) {                                                           // polvo calido encima
    var px_ = Math.floor(r() * g.w), py_ = Math.floor(r() * g.h);
    if (g.get(px_, py_)) g.set(px_, py_, mix(ZP[1], AS[6], 0.5));
  }
}
function legendText(str, seed, amt) {
  var wd = px.measure(str, 'a12', 2), W = wd + 6, H = 24 + 6;
  var g = new G(W, H);
  px.text(g, str, 3, 3, { font: 'a12', ink: ZP[2], scale: 2 });
  wearPaint(g, seed, amt);
  return g.toCanvas(W >> 1, H - 1);
}
function legendArrow(seed, flip) {
  var W = 66, H = 28, g = new G(W, H), x, y;
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    var inShaft = x >= 3 && x <= 44 && y >= 10 && y <= 17;
    var tip = 63, k = (tip - x) * (12.5 / 20), inHead = x >= 42 && x <= tip && Math.abs(y - 13.5) <= k;
    if (inShaft || inHead) g.set(x, y, ZP[2]);
  }
  wearPaint(g, seed, 0.04);
  return (flip ? g.flip() : g).toCanvas(W >> 1, H - 1);
}
/* ---- desgaste de gran escala: rodadas pulidas por las llantas y lavados de tono (rompen la grilla de 16 px) ---- */
function rodada(w, h, seed, tracks) {
  return mk(w, h, function (g) {
    var n = vnoise(seed, 7), n2 = vnoise(seed + 3, 2), r = rngf(seed + 1);
    tracks.forEach(function (ty, ti) {
      for (var x = 0; x < w; x++) {
        var ends = Math.min(smooth(x / 14), smooth((w - 1 - x) / 14)), len = ends * (0.55 + n(x * 0.9, ti * 11) * 0.7);
        for (var k = -3; k <= 3; k++) {
          var y = ty + k, edge = Math.abs(k) / 3.2, a = len * (1 - edge * edge) * (0.65 + n2(x, y) * 0.6);
          if (y < 0 || y >= h || a < 0.12) continue;
          if (a > r() * 0.75 + 0.1) g.set(x, y, hex8(a > 0.62 ? '#585957' : '#4d4f50', 0.5 + a * 0.2));
        }
      }
    });
  });
}
D.rodada = [rodada(96, 40, 161, [5, 33]), rodada(64, 40, 163, [8, 35])];
function lavado(w, h, seed, light) {
  return mk(w, h, function (g) {
    var d = blobField(w, h, seed, { wob: 0.25, noise: 0.25, pad: 1, cell: 6 }), n = vnoise(seed + 5, 3), r = rngf(seed), x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var v = d[y * w + x];
      if (v >= 1) continue;
      var dens = (1 - v) * (0.55 + n(x, y) * 0.9);
      if (dens > r() * 0.85 + 0.05) g.set(x, y, light ? hex8(r() < 0.3 ? '#6b665a' : '#575650', 0.55) : hex8(r() < 0.3 ? '#1f2025' : '#26272c', 0.6));
    }
  });
}
D.lavado = [lavado(72, 38, 171, false), lavado(60, 32, 173, true)];

D.legend = [legendText('DESPACIO', 121, 0.03), legendText('PARE', 123, 0.03), legendText('BUS', 125, 0.04), legendArrow(127, false), legendArrow(129, true), legendText('CEDA', 131, 0.03)];

/* ---- sombra de copa: manchas blandas tramadas ---- */
function sombraArbol(w, h, seed, ncirc) {
  return mk(w, h, function (g) {
    var r = rngf(seed), n = vnoise(seed + 6, 3.5), circ = [], i, x, y;
    var cx = (w - 1) / 2, cy = (h - 1) / 2;
    for (i = 0; i < ncirc; i++) {
      var a = r() * 6.28, rr = Math.sqrt(r()) * 0.46;
      circ.push([cx + Math.cos(a) * w * rr * 0.85, cy + Math.sin(a) * h * rr * 0.85, (h * 0.2) + r() * (h * 0.15)]);
    }
    circ.push([cx, cy, h * 0.3]);
    var col = hex8('#2a2440', 0.3);
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var c = 0;
      for (i = 0; i < circ.length; i++) { var dd = Math.sqrt((x - circ[i][0]) * (x - circ[i][0]) + (y - circ[i][1]) * (y - circ[i][1])); c = Math.max(c, 1 - dd / circ[i][2]); }
      c += (n(x, y) - 0.5) * 0.12;
      var on = c > 0.34 ? true : c > 0.16 ? bay(x, y) < 0.55 : c > 0.02 ? bay(x, y) < 0.2 : false;
      if (on && c > 0.5 && n(x * 1.4 + 9, y * 1.4) > 0.8) on = false;                    // claro entre las hojas
      if (on) g.set(x, y, col);
    }
  });
}
D.sombraArbol = [sombraArbol(70, 40, 141, 6), sombraArbol(52, 30, 143, 5)];

/* ---- arena y polvo en los bordes de la pista ---- */
function arena(w, h, seed, mode) {
  return mk(w, h, function (g) {
    var n = vnoise(seed + 2, 4), n2 = vnoise(seed + 8, 1.8), r = rngf(seed), x, y;
    var SA = ['#5f5648', '#857a62', '#a0937a'];
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var dn;
      if (mode === 0) dn = Math.pow(1 - y / (h - 1), 1.2);
      else if (mode === 1) dn = Math.pow(y / (h - 1), 1.2);
      else { var ex = (x - (w - 1) / 2) / (w / 2), ey = (y - (h - 1) / 2) / (h / 2); dn = clamp(1 - Math.sqrt(ex * ex + ey * ey), 0, 1); }
      var ends = mode === 2 ? 1 : smooth(Math.min(x, w - 1 - x) / 10);
      var dens = dn * ends * (0.35 + n(x, y) * 1.05);
      if (dens > 0.08 && dens * 0.95 > bay(x, y) * 0.35 + r() * 0.65) {
        var c = dens > 0.55 ? SA[1] : (n2(x, y) > 0.55 ? SA[2] : SA[1]);
        if (r() < 0.12) c = SA[0];
        if (r() < 0.06) c = SA[2];
        g.set(x, y, c);
      }
    }
    var pc = mode === 2 ? 4 : 3;
    for (var i = 0; i < pc; i++) { x = 3 + Math.floor(r() * (w - 6)); y = Math.floor(r() * h * 0.7) + (mode === 1 ? Math.floor(h * 0.2) : 0); if (y < h - 1) { g.set(x, y, '#9a968c'); g.set(x, y + 1, hex8('#1d2026', 0.55)); } }   // piedritas
  });
}
D.arena = [arena(58, 10, 151, 0), arena(58, 10, 153, 1), arena(30, 12, 155, 2)];

})();
