/* ACHORADO - js/sprites/cerro-casas.js  (v0.9, fase H4b)
 * Dueño: sprites (casas del Cerro).
 * Arquetipos de lote para el nivel 2 «EL CERRO». Registra ACH.sprites.lotArch[arch] = function (ficha, px) -> { canvas, over, overX, overY, lights }
 * con los dos lados: side:'N' (cara sur a la cámara + azotea arriba) y side:'S' (solo azotea, borde norte con filo/alero).
 *
 *   estera         casa de esteras: paneles de estera tejida (paja apagada o gris plateado) en marco de palos; techo de estera, plástico/lona o calamina, con piedras. 1 piso.
 *   triplay        módulo de triplay o tablas pintado (ficha.color: azul, verde, turquesa, naranja, amarillo, rosado...; otro = madera natural), calamina a un agua con piedras.
 *   ladrilloCerro  ladrillo caravista sin tarrajear de 1-3 pisos (ficha.floors): columnas y vigas de concreto, fierros arriba, ventanas con plástico o rejas, puerta de fierro pintada.
 *   mixta          ladrillo abajo y módulo de triplay arriba (floors 2 por defecto).
 *   bodegaCerro    bodeguita con reja, letrero pintado a mano (ficha.name o nombre inventado) y un aviso de gaseosa vía ACH.px.marca().
 *   ollaComun      comedor popular: carpas rojas, ollas negras sobre fogones de leña, cartel pintado «OLLA COMÚN» + nombre inventado, plataforma de cemento con baranda azul.
 *   losaDeportiva  losa de cemento con líneas, arcos de fierro, baranda amarilla, tribunita y bidones al borde.
 *   cruzCima       cruz blanca de cemento con base de gradas, velas y flores, y una bandera peruana en un palo largo. Sólida solo en la base (ver medidas abajo).
 *
 * Campos de la ficha que se usan: side, c0..c1, r0..r1 (tamaño), floors, color, name, seed, damage (1-3), roof:[...], front:[...], faceTiles (alto de la cara en tiles).
 *   roof  (nombres de ACH.px.roofKit y estos): tanque, fierros, tendal, bidones, antena, ladrillos, cemento, perro, llantas, macetas, gas, tablas, arena, barril, mesa, silla; 'piedras' (pesos), 'plastico'/'lona'/'estera'/'calamina' (cobertura de la casa de esteras).
 *   front (detalles de la cara sur): macetas, bandera, ropa, bidon, balde, medidor, toldo, jabas, gas, luz (ventana encendida), escoba.
 * Medidas: cara de 1 piso = 3 tiles (48 px), cada piso extra +2 tiles (32 px); la azotea ocupa el resto de la huella. Se hornea una sola vez; sin getImageData, shadowBlur ni degradados.
 * Se carga despues de edificios-casas.js (usa ACH.px.roofKit si existe) y antes del motor.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px, S = ACH.sprites;
if (!px || !S) return;
S.lotArch = S.lotArch || {};
var G = px.G;
var K = '#1c1a22', VI = '#2a2440';

/* ======================== PRIMITIVAS (enteros, con recorte) ======================== */
function F(g, x, y, w, h, c) {
  x |= 0; y |= 0; w |= 0; h |= 0;
  var x1 = x + w, y1 = y + h;
  if (x < 0) x = 0; if (y < 0) y = 0; if (x1 > g.w) x1 = g.w; if (y1 > g.h) y1 = g.h;
  for (var j = y; j < y1; j++) { var o = j * g.w; for (var i = x; i < x1; i++) g.d[o + i] = c; }
}
function P1(g, x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.d[y * g.w + x] = c; }
function Q(g, x, y) { x |= 0; y |= 0; return (x >= 0 && y >= 0 && x < g.w && y < g.h) ? g.d[y * g.w + x] : null; }
function frame(g, x, y, w, h, c) { F(g, x, y, w, 1, c); F(g, x, y + h - 1, w, 1, c); F(g, x, y, 1, h, c); F(g, x + w - 1, y, 1, h, c); }
var mc = {};
function mx(a, b, t) { var k = a + b + t; return mc[k] || (mc[k] = px.mix(a, b, t)); }
function dk(c, t) { return mx(c, VI, t); }
function lt(c, t) { return mx(c, '#f3efe2', t); }
var tcache = {};
function tinter(col, t) {
  var key = col + t, fn = tcache[key];
  if (fn) return fn;
  var m = {};
  fn = function (c) { return m[c] || (m[c] = px.mix(c, col, t)); };
  return (tcache[key] = fn);
}
function T(g, x, y, w, h, fn) {                                     // aplica fn a cada pixel existente del rectangulo
  x |= 0; y |= 0; w |= 0; h |= 0;
  var x1 = x + w, y1 = y + h;
  if (x < 0) x = 0; if (y < 0) y = 0; if (x1 > g.w) x1 = g.w; if (y1 > g.h) y1 = g.h;
  for (var j = y; j < y1; j++) { var o = j * g.w; for (var i = x; i < x1; i++) { var c = g.d[o + i]; if (c) g.d[o + i] = fn(c); } }
}
var AO1 = tinter(VI, 0.16), AO2 = tinter(VI, 0.30), AO3 = tinter(VI, 0.46), AO4 = tinter(VI, 0.62);
function pick(r, a) { return a[(r() * a.length) | 0]; }
function ri(r, a, b) { return a + ((r() * (b - a + 1)) | 0); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function hash(seed, n) { var h = (seed * 2654435761 + n * 40503) >>> 0; return h % 1000 / 1000; }
function blob(cx, cy, rw, rh, r, fn) {                              // mancha irregular: llama fn(x, y) en cada pixel
  for (var j = -rh; j <= rh; j++) for (var i = -rw; i <= rw; i++) {
    var d = (i * i) / (rw * rw + 0.01) + (j * j) / (rh * rh + 0.01);
    if (d <= 0.62 + r() * 0.4) fn(cx + i, cy + j);
  }
}

/* ======================== PALETAS ======================== */
// todas las rampas: [sombra profunda, sombra, base, luz, brillo]
var WD = ['#3a2c22', '#56442e', '#7a6448', '#a49177', '#d5c4a9'];     // madera de triplay / tablas
var CN = ['#5d5249', '#7e7066', '#9e8e82', '#b3a69a', '#c9bfb2'];     // concreto sin pintar (caliente, color de cerro)
var MT = ['#3b4250', '#5c6570', '#7e868a', '#a4abaa', '#cfd3cc'];     // metal / calamina gris
var ST = ['#403f30', '#625c4d', '#81776a', '#a39a8a'];                // pirca
var RU = ['#4a2a2a', '#6f3b2e', '#8f5b47', '#b06a3e'];                // oxido
var BRK = ['#a46c52', '#98664f', '#b0795c', '#8a604c', '#9a8674', '#a68a75', '#7d5a48'];
var MORTAR = '#a39a8a', MORTAR_D = '#8a8074';
var PAJA = ['#65583a', '#8f7f58', '#ad9d6c', '#c9ba88'];             // estera color paja apagado
var PLATA = ['#554e48', '#6d655e', '#80786f', '#938b81'];            // estera gris plateado
var CAL = { gris: ['#5f5e5c', '#7c7b76', '#9a998f'], nueva: ['#7a6d5c', '#9a8a74', '#b9a98f'], oxid: ['#684033', '#85533f', '#9c6652'] };
var PAINTS = { azul: '#2f6fb5', verde: '#3e8a5b', turquesa: '#4ba096', naranja: '#e08a4a', amarillo: '#ca8723', rosado: '#e3a08c', celeste: '#8fb4d8',
  menta: '#a8cdb0', blanco: '#e0ddcc', ocre: '#d3b38b', rojo: '#b0463a', morado: '#7a5a96', guinda: '#8a3a4c' };
var PALIAS = { durazno: 'naranja', salmon: 'rosado', rosa: 'rosado', crema: 'blanco', mostaza: 'amarillo', tierra: 'ocre', ladrillo: 'rojo', cemento: null, gris: null, madera: null, natural: null };
var ACC = ['azul', 'verde', 'turquesa', 'naranja', 'rojo', 'amarillo', 'morado', 'celeste'];
function paintBase(name) { var k = PALIAS[name] !== undefined ? PALIAS[name] : name; return PAINTS[k] || null; }
function paintRamp(name, dmg) {
  var b = paintBase(name);
  if (!b) return WD;
  var f = mx(b, '#a39a8a', 0.14 + 0.07 * (dmg || 1));                  // pintura desteñida por el sol
  return [mx(f, VI, 0.62), mx(f, VI, 0.32), f, lt(f, 0.2), lt(f, 0.38)];
}
function accentRamp(c, avoid) {                                        // color de puerta: pintada, que contraste con el muro
  var names = ACC.filter(function (n) { return n !== avoid; });
  return paintRamp(names[(c.seed + 3) % names.length], 1);
}

/* ======================== PIEZAS CHICAS ======================== */
function stone(g, x, y, rw, rh) {                                     // piedra de peso: (x, y) = centro de la base
  for (var j = -rh * 2; j <= 0; j++) for (var i = -rw; i <= rw; i++) {
    var d = (i * i) / (rw * rw + 0.5) + ((j + rh) * (j + rh)) / (rh * rh + 0.5);
    if (d <= 1) P1(g, x + i, y + j, d > 0.66 ? ST[1] : ((i < 0 && j < -rh) ? ST[3] : ST[2]));
  }
  F(g, x - rw + 1, y + 1, rw * 2, 1, '#3a3446');
}
function scatterStones(g, x0, y0, w, h, n, r) {
  for (var i = 0; i < n; i++) stone(g, x0 + 3 + ((r() * Math.max(1, w - 6)) | 0), y0 + 3 + ((r() * Math.max(1, h - 4)) | 0), ri(r, 2, 3), ri(r, 1, 2));
}
function palo(g, x, y, w, h, r) {                                     // palo de eucalipto vertical
  F(g, x, y, w, h, '#6b5a4a');
  F(g, x, y, 1, h, '#8a7766'); F(g, x + w - 1, y, 1, h, '#4a3e38');
  if (w > 2) F(g, x + w - 2, y, 1, h, '#594d48');
  F(g, x, y, w, 1, '#a08c78');
  for (var i = 0; i < h / 14; i++) P1(g, x + ((r ? r() : 0.5) * w | 0), y + 4 + ((r ? r() : i / 3) * (h - 6) | 0), '#3a2c22');
}
function paloH(g, x, y, w, h, r) {                                    // palo horizontal (travesaño)
  F(g, x, y, w, h, '#6b5a4a'); F(g, x, y, w, 1, '#8a7766'); F(g, x, y + h - 1, w, 1, '#4a3e38');
  for (var i = 0; i < w / 18; i++) P1(g, x + 4 + ((r ? r() : 0.5) * (w - 8) | 0), y + (h >> 1), '#3a2c22');
}
function lash(g, x, y) { P1(g, x, y, '#cdb98a'); P1(g, x + 1, y + 1, '#cdb98a'); P1(g, x + 1, y, '#8a7a56'); P1(g, x, y + 1, '#8a7a56'); }

/* estera tejida: franjas de 2 px, hebras que pasan por encima (claras) y por debajo (oscuras) */
function estera(g, x, y, w, h, o) {
  var A = o.silver ? PLATA : PAJA, r = o.r, ph = o.ph || 0, i, j;
  for (j = 0; j < h; j++) {
    var b = j >> 1, bs = (b * 2 + ph) % 6;
    for (i = 0; i < w; i++) {
      var xs = (i + bs) % 6, ov = xs < 4, col;
      if (ov) col = (j & 1) ? A[2] : A[3]; else col = (j & 1) ? A[0] : A[1];
      if (ov && xs === 3) col = (j & 1) ? A[1] : A[2];
      P1(g, x + i, y + j, col);
    }
  }
  for (j = 0; j < h; j += 2) if (r() < 0.14) T(g, x, y + j, w, 2, AO1);             // franjas más sucias
  for (i = 0; i < w * h / 90; i++) { var sx = x + ((r() * w) | 0), sy = y + ((r() * h) | 0); F(g, sx, sy, 1 + ((r() * 2) | 0), 1, A[0]); }
  if (o.fray) for (i = 0; i < w; i++) if (r() < 0.45) { var fl = 1 + ((r() * 2) | 0); F(g, x + i, y + h - fl, 1, fl, r() < .5 ? A[0] : null); }
  if (o.mud) { T(g, x, y + h - 6, w, 6, tinter('#4b372b', 0.18)); T(g, x, y + h - 3, w, 3, tinter('#4b372b', 0.22)); }
}

/* calamina ondulada (costillas verticales), planchas de 12-14 px con traslapes y óxido */
function calamina(g, x, y, w, h, o) {
  var r = o.r, dmg = o.dmg || 1, kinds = o.kinds || (dmg >= 3 ? ['gris', 'oxid', 'nueva', 'oxid', 'gris', 'oxid'] : (dmg === 2 ? ['gris', 'gris', 'nueva', 'oxid', 'gris', 'nueva'] : ['gris', 'gris', 'nueva', 'gris', 'nueva', 'oxid'])), sx = x, i, yy;
  while (sx < x + w) {
    var cw = Math.min(12 + ((r() * 3) | 0), x + w - sx), k = kinds[(r() * kinds.length) | 0], C = CAL[k], oy = (r() * 14) | 0, shift = sx & 3;
    for (i = 0; i < cw; i++) { var ph = (i + shift) & 3; F(g, sx + i, y, 1, h, ph === 0 ? C[0] : (ph === 2 ? C[2] : C[1])); }
    F(g, sx, y, 1, h, '#37363c');
    for (yy = y + oy + 6; yy < y + h - 2; yy += 26 + ((r() * 8) | 0)) {
      F(g, sx, yy, cw, 1, '#cfd1c8'); F(g, sx, yy + 1, cw, 1, '#2f2e34'); T(g, sx, yy + 2, cw, 2, AO2);
      if (k === 'oxid' || r() < 0.3) for (i = 0; i < cw; i += 3) if (r() < 0.6) F(g, sx + i + 1, yy + 2, 1, ri(r, 3, 8), RU[1]);
    }
    if (k === 'oxid') for (i = 0; i < cw / 3; i++) { var rx = sx + ((r() * cw) | 0), ry = y + ((r() * h) | 0); F(g, rx, ry, 1, ri(r, 2, 5), RU[2]); }
    sx += cw;
  }
  for (i = 0; i < w * h / 700 * (0.6 + dmg * 0.4); i++) {                                 // óxido y manchas
    var bx = x + ((r() * w) | 0), by = y + ((r() * h) | 0);
    blob(bx, by, ri(r, 1, 3), ri(r, 1, 2), r, function (xx, yy2) { if (Q(g, xx, yy2) && xx >= x && xx < x + w && yy2 >= y && yy2 < y + h && ((xx + yy2) & 1) === 0) P1(g, xx, yy2, RU[1]); });
  }
  if (dmg >= 2) {                                                                          // parches de plástico azul y plancha nueva
    var np = dmg - 1;
    for (i = 0; i < np; i++) {
      var pw = ri(r, 7, 12), ph2 = ri(r, 5, 8), px0 = x + 2 + ((r() * Math.max(1, w - pw - 4)) | 0), py0 = y + 4 + ((r() * Math.max(1, h - ph2 - 6)) | 0);
      if (r() < 0.55) { F(g, px0, py0, pw, ph2, '#3f6aa6'); F(g, px0, py0, pw, 1, '#6a95c8'); F(g, px0 + pw - 1, py0, 1, ph2, '#2a4a7c'); for (var q = 1; q < ph2 - 1; q += 2) F(g, px0 + ((q * 3) % pw), py0 + q, 3, 1, '#5a86bc'); F(g, px0 + 1, py0 + ph2 - 1, pw - 2, 1, '#2a4a7c'); }
      else { F(g, px0, py0, pw, ph2, CAL.nueva[1]); F(g, px0, py0, pw, 1, '#d8d4c6'); F(g, px0 + pw - 1, py0, 1, ph2, '#37363c'); }
      stone(g, px0 + 2, py0 + ph2 - 1, 2, 1); stone(g, px0 + pw - 3, py0 + 3, 2, 1);
    }
  }
}

/* plástico / lona: base lisa con arrugas y sogas con piedras */
function lona(g, x, y, w, h, o) {
  var r = o.r, k = o.kind || 'azul', B = { azul: ['#2d4f82', '#3f6aa6', '#5a86bc', '#8aaed4'], negro: ['#2a2a32', '#3a3a46', '#4c4c5a', '#6c6c7c'], blanco: ['#8c9296', '#a8b0b2', '#c4cacb', '#e0e4e0'], ocre: ['#6a5a38', '#8a7648', '#a8925c', '#c4ae78'] }[k] || ['#2d4f82', '#3f6aa6', '#5a86bc', '#8aaed4'], i, j;
  F(g, x, y, w, h, B[1]);
  for (i = 0; i < w * h / 95; i++) {                                                       // arrugas: trazos diagonales claros y oscuros
    var sx = x + ((r() * w) | 0), sy = y + ((r() * h) | 0), ln = ri(r, 3, 8), dir = r() < 0.5 ? 1 : -1, light = r() < 0.5;
    for (j = 0; j < ln; j++) { var xx = sx + dir * (j >> 1), yy = sy + j; if (xx >= x && xx < x + w && yy >= y && yy < y + h) P1(g, xx, yy, light ? B[3] : B[0]); }
  }
  for (i = 0; i < w * h / 130; i++) { var bx = x + ((r() * w) | 0), by = y + ((r() * h) | 0); F(g, bx, by, ri(r, 2, 5), 1, B[2]); }
  F(g, x, y, w, 1, B[3]); F(g, x, y + h - 1, w, 1, B[0]); F(g, x, y, 1, h, B[2]); F(g, x + w - 1, y, 1, h, B[0]);
  var nc = Math.max(2, Math.round(w / 22));                                               // sogas en X y piedras
  for (i = 0; i < nc; i++) {
    var cx0 = x + 4 + Math.round(i * (w - 8) / Math.max(1, nc - 1)), lean = (r() < 0.5 ? 1 : -1) * ri(r, 6, 14);
    for (j = 0; j < h; j++) P1(g, cx0 + Math.round(lean * j / Math.max(1, h)), y + j, '#bba77a');
  }
  if (!o.noStones) { scatterStones(g, x, y + h - 10, w, 10, Math.max(2, (w / 20) | 0), r); }
}

/* techo de estera: franjas horizontales con palos cada ~12 px */
function techoEstera(g, x, y, w, h, o) {
  var by = y, k = 0;
  while (by < y + h) {
    var bh = Math.min(10 + ((o.r() * 4) | 0), y + h - by);
    estera(g, x, by, w, bh, { silver: o.silver, r: o.r, ph: k * 2 });
    paloH(g, x, by + bh - 1, w, 2, o.r);
    by += bh + 1; k++;
  }
  T(g, x, y, w, h, tinter('#3a3a44', o.tone || 0));
}

/* ======================== PUERTAS Y VENTANAS ======================== */
function doorBoards(g, x, y, w, h, A, o) {                            // puerta de tablas con riostra en Z y candado
  o = o || {};
  F(g, x - 1, y - 1, w + 2, h + 1, '#2a2018');
  for (var i = 0; i < w; i += 3) {
    var tone = ((i / 3) | 0) & 1 ? A[2] : A[3];
    F(g, x + i, y, Math.min(2, w - i), h, tone); if (i + 2 < w) F(g, x + i + 2, y, 1, h, A[0]);
  }
  F(g, x, y, w, 1, A[4]);
  var bt = y + 4, bb = y + h - 5;
  F(g, x, bt, w, 2, A[1]); F(g, x, bb, w, 2, A[1]);
  g.line(x + 1, bb, x + w - 2, bt + 1, A[0]); g.line(x + 1, bb - 1, x + w - 2, bt, A[1]);
  F(g, x + w - 4, y + (h >> 1), 2, 3, '#2a2018'); F(g, x + w - 4, y + (h >> 1) + 3, 2, 2, '#d6a94a'); P1(g, x + w - 4, y + (h >> 1) + 3, '#f2e08a');
  F(g, x, y + h - 2, w, 2, dk(A[1], 0.3));
}
function doorIron(g, x, y, w, h, A, o) {                              // puerta de fierro pintada: plancha, reja arriba, candado
  o = o || {}; var i;
  F(g, x - 1, y - 1, w + 2, h + 1, K);
  F(g, x, y, w, h, A[2]); F(g, x, y, w, 1, A[3]); F(g, x, y, 1, h, A[3]); F(g, x + w - 1, y, 1, h, A[1]);
  var gh = o.noReja ? 0 : Math.round(h * 0.38);
  if (gh) {
    F(g, x + 2, y + 3, w - 4, gh, '#15131a');
    for (i = x + 3; i < x + w - 3; i += 3) F(g, i, y + 3, 1, gh, A[3]);
    F(g, x + 2, y + 3, w - 4, 1, A[1]); F(g, x + 2, y + 3 + gh, w - 4, 1, A[1]);
  }
  var py = y + 5 + gh, ph = y + h - 4 - py;
  if (ph > 5) { F(g, x + 3, py, w - 6, ph, A[2]); F(g, x + 3, py, w - 6, 1, A[1]); F(g, x + 3, py, 1, ph, A[1]); F(g, x + 3, py + ph - 1, w - 6, 1, A[3]); F(g, x + w - 4, py, 1, ph, A[3]); }
  F(g, x + w - 5, y + (h >> 1) + 1, 2, 1, '#cfd3cc'); F(g, x + w - 5, y + (h >> 1) + 3, 2, 2, '#e6c85a');
  for (i = 0; i < (o.dmg || 1) + 1; i++) { var rx = x + 2 + ((hash(o.seed || 1, i) * (w - 4)) | 0); F(g, rx, y + h - 1 - i * 2, 1, 2, RU[2]); }
  F(g, x, y + h - 2, w, 2, A[0]);
}
function winPlastic(g, x, y, w, h, o) {                               // marco de palo + plástico sujeto con cinta
  o = o || {};
  F(g, x - 1, y - 1, w + 2, h + 2, '#2a2018');
  F(g, x, y, w, h, o.lit ? '#e8c26a' : '#2f3a44');
  if (!o.lit) { F(g, x + 1, y + 1, w - 2, h - 2, '#aab9bd'); F(g, x + 1, y + 1, w - 2, 1, '#d4dfe0'); F(g, x + 1, y + h - 2, w - 2, 1, '#7d8d94'); for (var i = 0; i < w - 3; i += 3) { P1(g, x + 2 + i, y + 2 + (i % 4), '#d4dfe0'); P1(g, x + 3 + i, y + 3 + (i % 3), '#7d8d94'); } }
  else { F(g, x + 1, y + 1, w - 2, h - 2, '#f2d98a'); F(g, x + 1, y + h - 3, w - 2, 2, '#d8a84a'); }
  F(g, x + (w >> 1), y, 1, h, '#594d48'); F(g, x, y, w, 1, '#cdb98a');
  F(g, x - 1, y + h + 1, w + 2, 1, '#a49177'); F(g, x - 1, y + h + 2, w + 2, 1, '#3a2c22');
}
function winReja(g, x, y, w, h, A, o) {                               // abertura con reja de fierro y cortina
  o = o || {};
  F(g, x - 1, y - 1, w + 2, h + 2, K);
  F(g, x, y, w, h, o.lit ? '#e8c26a' : '#27333f');
  if (!o.lit) { F(g, x + 1, y + 1, w - 2, 2, '#3d5668'); if (o.cur) { F(g, x + 1, y + 1, (w >> 1) - 1, h - 2, o.cur); F(g, x + 1, y + 1, 1, h - 2, lt(o.cur, 0.25)); F(g, x + (w >> 1) - 2, y + 1, 1, h - 2, dk(o.cur, 0.3)); } }
  else { F(g, x + 1, y + h - 3, w - 2, 2, '#d8a84a'); }
  for (var i = x + 2; i < x + w - 1; i += 3) F(g, i, y, 1, h, A[2]);
  F(g, x, y + (h >> 1), w, 1, A[2]); F(g, x, y, w, 1, A[3]);
  F(g, x - 1, y + h + 1, w + 2, 2, CN[3]); F(g, x - 1, y + h + 3, w + 2, 1, CN[1]);
}
function winCurtain(g, x, y, w, h, col, o) {                          // abertura con cortina de tela
  o = o || {};
  F(g, x - 1, y - 1, w + 2, h + 2, '#2a2018'); F(g, x, y, w, h, o.lit ? '#e8c26a' : '#27333f');
  var cw = o.lit ? w - 2 : w - 1;
  if (!o.lit) { F(g, x, y, cw, h - 3, col); for (var i = 1; i < w - 1; i += 3) F(g, x + i, y, 1, h - 3, dk(col, 0.28)); F(g, x, y, cw, 1, lt(col, 0.3)); F(g, x, y + h - 3, cw, 1, dk(col, 0.4)); }
  else F(g, x + 1, y + 1, w - 2, h - 2, '#f2d98a');
  F(g, x - 1, y + h + 1, w + 2, 1, '#a49177'); F(g, x - 1, y + h + 2, w + 2, 1, '#3a2c22');
}
function flagPe(g, x, y, w, h, wave) {                                // bandera peruana (rojo-blanco-rojo vertical)
  var t = Math.max(2, Math.floor(w / 3)), i, j;
  for (i = 0; i < w; i++) {
    var oy = wave ? Math.round(Math.sin(i * 0.9) * 0.9) : 0, col = (i < t || i >= w - t) ? '#c8222c' : '#efe9dc';
    for (j = 0; j < h; j++) P1(g, x + i, y + j + oy, col);
    P1(g, x + i, y + oy, lt(col, 0.2)); P1(g, x + i, y + h - 1 + oy, dk(col, 0.35));
  }
  if (w >= 9) { P1(g, x + (w >> 1), y + (h >> 1), '#8a6a3a'); P1(g, x + (w >> 1), y + (h >> 1) - 1, '#7a8a4a'); }
}
var CLOTH = ['#243a6b', '#c0392b', '#c9a02e', '#d83c7a', '#e6e0cf', '#2e5e3e', '#4a6fa5', '#e0a14a'];
function ropaLine(g, x0, w, wy, sag, r, o) {                          // tendal: alambre con comba y ropa colgada
  o = o || {};
  var i, x1 = x0 + w, cols = o.cols || CLOTH, cx;
  for (i = 0; i < w; i++) { var t = (i - w / 2) / (w / 2); P1(g, x0 + i, wy + Math.round(sag * (1 - t * t)), '#3a3844'); }
  cx = x0 + 3 + ((r() * 3) | 0);
  while (cx < x1 - 7) {
    var col = pick(r, cols), kind = r(), t2 = (cx - x0 - w / 2) / (w / 2), ly = wy + Math.round(sag * (1 - t2 * t2)) + 1, d = dk(col, 0.3), l = lt(col, 0.22), adv;
    if (kind < 0.35) { F(g, cx, ly, 6, 7, col); F(g, cx - 1, ly, 1, 3, col); F(g, cx + 6, ly, 1, 3, col); F(g, cx, ly, 6, 1, l); F(g, cx + 5, ly + 1, 1, 6, d); adv = 9; }
    else if (kind < 0.62) { F(g, cx, ly, 5, 4, col); F(g, cx, ly + 4, 2, 6, col); F(g, cx + 3, ly + 4, 2, 6, col); F(g, cx, ly, 5, 1, l); F(g, cx + 4, ly, 1, 10, d); adv = 8; }
    else if (kind < 0.8) { F(g, cx, ly, 5, 9, col); F(g, cx, ly, 5, 1, l); F(g, cx + 4, ly, 1, 9, d); adv = 8; }
    else { F(g, cx, ly, 10, 9, col); F(g, cx, ly, 10, 1, l); F(g, cx + 9, ly, 1, 9, d); F(g, cx + 3, ly + 2, 1, 6, d); adv = 13; }
    P1(g, cx + 1, wy + Math.round(sag * (1 - t2 * t2)), '#e0d8c0');
    cx += adv;
  }
}
function pot(g, x, y, r, o) {                                         // maceta en lata con geranios (lo único verde y florido)
  var can = pick(r, ['#8f3a32', '#3f72b0', '#7e868a', '#c9a66b', '#a85a3a', '#d8d4c4']), ch = ri(r, 3, 5);
  F(g, x - 2, y - ch, 5, ch, can); F(g, x - 2, y - ch, 5, 1, lt(can, 0.35)); F(g, x + 2, y - ch, 1, ch, dk(can, 0.4)); F(g, x - 2, y - 1, 5, 1, dk(can, 0.5));
  var gc = r() < 0.5 ? ['#6b7a4f', '#4a5a44'] : ['#8aa860', '#5f7a48'], ph = ri(r, 3, 5);
  for (var j = 0; j < ph; j++) { var wd = j < 1 ? 3 : (j < ph - 1 ? 5 : 3); F(g, x - (wd >> 1), y - ch - j - 1, wd, 1, (j + x) % 3 ? gc[0] : gc[1]); }
  var fl = pick(r, ['#d83c7a', '#e0603a', '#f3efe2', '#d8a8c8', '#c8222c']);
  P1(g, x - 1, y - ch - ph, fl); P1(g, x + 1, y - ch - ph + 1, fl); if (r() < 0.6) P1(g, x, y - ch - ph - 1, fl);
}
function bucket(g, x, y, col) {                                       // balde de plástico
  col = col || '#c0392b';
  F(g, x - 2, y - 5, 5, 5, col); F(g, x - 3, y - 5, 7, 1, lt(col, 0.3)); F(g, x + 2, y - 4, 1, 4, dk(col, 0.4)); F(g, x - 2, y - 1, 5, 1, dk(col, 0.5)); P1(g, x - 2, y - 4, lt(col, 0.4));
}
function drum(g, x, y, col) {                                         // cilindro de 200 L con tapa
  var A = col === 'negro' ? ['#101014', '#1e1e26', '#30303a', '#4c4c5a'] : (col === 'turquesa' ? ['#1f4a46', '#2f6e68', '#4ba096', '#78c4b8'] : ['#14264a', '#223f78', '#3562a6', '#5c8bc8']);
  F(g, x - 4, y - 13, 9, 13, A[2]); F(g, x - 4, y - 13, 2, 13, A[3]); F(g, x + 3, y - 13, 2, 13, A[1]); F(g, x - 4, y - 13, 9, 1, A[3]); F(g, x - 4, y - 8, 9, 1, A[1]); F(g, x - 4, y - 4, 9, 1, A[1]); F(g, x - 4, y - 1, 9, 1, A[0]);
  F(g, x - 3, y - 15, 7, 2, '#b8a57f'); F(g, x - 3, y - 15, 7, 1, '#d8c8a0'); P1(g, x + 4, y - 14, K); P1(g, x - 4, y - 14, K);
}

/* ======================== CONTEXTO ======================== */
function mk(f) {
  var W = (f.c1 - f.c0 + 1) * 16, H = (f.r1 - f.r0 + 1) * 16, seed = (f.seed | 0) || 1234;
  var c = { f: f, W: W, H: H, g: new G(W, H), side: f.side === 'S' ? 'S' : 'N', seed: seed, r: px.rng(seed * 7919 + 13), r2: px.rng(seed * 104729 + 5), dmg: clamp((f.damage | 0) || 1, 1, 3),
    color: f.color, front: f.front || [], roofL: (f.roof || []).slice(), lights: [], go: null, oy: 0, name: (f.name || '').toUpperCase() };
  c.has = function (k) { return c.front.indexOf(k) >= 0; };
  c.hasR = function (k) { return c.roofL.indexOf(k) >= 0; };
  return c;
}
function mkOver(c, top, h) { var bot = Math.min(top + h, c.H + 24); top = Math.max(0, top); c.go = new G(c.W, Math.max(1, bot - top)); c.oy = top; }    // la capa alta nunca sale por arriba del lote ni baja más de 24 px de r1
function done(c) {
  var out = { canvas: c.g.toCanvas(), over: null, overX: 0, overY: 0, lights: c.lights };
  if (c.go) {
    var any = false; for (var i = 0; i < c.go.d.length; i++) if (c.go.d[i]) { any = true; break; }
    if (any) { out.over = c.go.toCanvas(); out.overX = 0; out.overY = c.oy; }
  }
  return out;
}
function faceH(c, dflt) { var f = c.f; return Math.min(c.H, f.faceTiles ? f.faceTiles * 16 : dflt); }
function floorsFace(fl) { return 16 * (1 + 2 * clamp(fl, 1, 3)); }

/* ======================== PIEZAS DE AZOTEA ======================== */
var RK_SIZE = { tank: [20, 28], rebar: [22, 26], clothesline: [44, 26], drums: [24, 18], antenna: [14, 32], bricks: [18, 12], cement: [16, 12], dog: [16, 9], chair: [10, 13], plants: [20, 14], tires: [18, 14], sand: [22, 14], barrel: [14, 16], gas: [8, 14], table: [32, 16], planks: [18, 10], hood: [12, 24], stairbox: [26, 30] };
var RK_ALIAS = { tanque: 'tank', fierros: 'rebar', tendal: 'clothesline', bidones: 'drums', antena: 'antenna', ladrillos: 'bricks', cemento: 'cement', perro: 'dog', silla: 'chair', macetas: 'plants', llantas: 'tires', arena: 'sand', cilindro: 'barrel', barril: 'barrel', mesa: 'table', tablas: 'planks', campana: 'hood' };
function kitOf(name) { var k = RK_ALIAS[name] || name; return RK_SIZE[k] ? k : null; }
/* Coloca piezas del roofKit en la azotea [x0,y0,x1,y1) sin que se pisen. Cada una crece hacia arriba desde su base (cx, by). */
function placeRoof(c, g, names, x0, y0, x1, y1, o) {
  var RK = px.roofKit; if (!RK) return;
  o = o || {};
  var r = c.r2, placed = [], i, n;
  for (i = 0; i < names.length; i++) {
    var k = kitOf(names[i]); if (!k || typeof RK[k] !== 'function') continue;
    var sz = RK_SIZE[k], w = sz[0], h = sz[1], ok = false, tries = 40, cx, by;
    if (o.avoid && o.avoid.indexOf(k) >= 0) continue;
    if (k === 'clothesline') { w = Math.min(w, x1 - x0 - 4); if (w < 24) continue; }
    while (tries-- > 0 && !ok) {
      cx = x0 + (w >> 1) + 1 + ((r() * Math.max(1, x1 - x0 - w - 2)) | 0);
      by = y0 + h + ((r() * Math.max(1, y1 - y0 - h)) | 0);
      if (by > y1 || by - h < y0 - 4) continue;
      ok = true;
      for (n = 0; n < placed.length; n++) { var p = placed[n]; if (Math.abs(cx - p[0]) < (w + p[2]) / 2 && by > p[1] - p[3] && by - h < p[1]) { ok = false; break; } }
    }
    if (!ok) continue;
    placed.push([cx, by, w, h]);
    var opt = { rnd: r, w: k === 'clothesline' ? Math.min(40, x1 - x0 - 4) : undefined };
    if (k === 'tank') opt.color = r() < 0.4 ? 'azul' : undefined;
    if (k === 'antenna') opt.dish = false;
    if (k === 'drums') opt.n = r() < 0.5 ? 2 : 3;
    RK[k](g, cx, by, opt);
  }
  return placed;
}
function roofNames(c, dflt, ban) {
  var list = c.roofL.filter(function (n) { return kitOf(n) && (!ban || ban.indexOf(kitOf(n)) < 0); });
  if (!list.length && dflt) list = dflt.slice();
  return list;
}

/* superficie de azotea de concreto (losa vaciada, sin tarrajear) */
function losa(g, x, y, w, h, r, dmg) {
  var i, j;
  F(g, x, y, w, h, CN[2]);
  for (i = 0; i < w * h / 260; i++) { var bx = x + ((r() * w) | 0), by = y + ((r() * h) | 0), tn = r() < 0.55 ? CN[1] : CN[3]; blob(bx, by, ri(r, 4, 9), ri(r, 2, 5), r, function (xx, yy) { if (xx >= x && xx < x + w && yy >= y && yy < y + h && ((xx + yy) & 1) === 0) P1(g, xx, yy, tn); }); }
  for (i = 0; i < w * h / 110; i++) P1(g, x + ((r() * w) | 0), y + ((r() * h) | 0), r() < 0.5 ? CN[1] : CN[3]);
  for (i = 0; i < w * h / 4200 * (dmg || 1); i++) { var cx = x + 4 + ((r() * (w - 8)) | 0), cy = y + ((r() * Math.max(1, h - 12)) | 0), dir = 1, len = ri(r, 6, 14); for (j = 0; j < len; j++) { P1(g, cx, cy, CN[0]); var rr = r(); if (rr < 0.45) cx += dir; else if (rr < 0.6) dir = -dir; else cy++; } }
  for (i = 0; i < w * h / 2400; i++) { var sx = x + ((r() * (w - 6)) | 0), sy = y + ((r() * (h - 3)) | 0); F(g, sx, sy, ri(r, 4, 9), ri(r, 2, 3), tinter('#3f3a30', 0.35)(CN[2])); }   // humedad
}
/* tierra suelta (piso de patio) */
function tierra(g, x, y, w, h, r) {
  var T0 = ['#4b372b', '#7d5f47', '#b3825b', '#a2947b'];
  F(g, x, y, w, h, T0[1]);
  for (var i = 0; i < w * h / 12; i++) P1(g, x + ((r() * w) | 0), y + ((r() * h) | 0), r() < 0.5 ? T0[0] : T0[2]);
}

/* ======================== PIEZAS COMUNES DE CASAS CHICAS ======================== */
function regArch(arch, fn) { S.lotArch[arch] = fn; }

function tablas(g, x, y, w, h, r, A) {                                // tablas verticales de 6-8 px con rendijas y clavos
  var xx = x, k = 0;
  while (xx < x + w) {
    var pw = Math.min(ri(r, 6, 8), x + w - xx), tone = r() < 0.3 ? A[3] : (r() < 0.5 ? A[2] : A[1]);
    F(g, xx, y, pw, h, tone); F(g, xx, y, 1, h, lt(tone, 0.18)); F(g, xx + pw - 1, y, 1, h, A[0]);
    var drop = r() < 0.18 ? ri(r, 2, 6) : 0; if (drop) F(g, xx, y, pw, drop, A[0]);                  // tabla más corta: rendija oscura arriba
    for (var j = y + 6; j < y + h - 4; j += ri(r, 10, 16)) F(g, xx + 1, j, pw - 2, 1, dk(tone, 0.25));    // veta
    P1(g, xx + 2, y + drop + 2, A[0]); P1(g, xx + pw - 3, y + h - 6, A[0]);                          // clavos
    xx += pw; k++;
  }
}
function wearPaint(g, x, y, w, h, r, dmg, wood) {                      // pintura saltada, goteras y barro al pie
  var i, n = (w * h / 260) * (0.5 + dmg * 0.5);
  for (i = 0; i < n; i++) {
    var bx = x + ((r() * w) | 0), by = y + ((r() * h) | 0);
    blob(bx, by, ri(r, 1, 3), ri(r, 1, 3), r, function (xx, yy) { if (xx >= x && xx < x + w && yy >= y && yy < y + h && Q(g, xx, yy) && ((xx + yy) & 1) === 0) P1(g, xx, yy, r() < 0.5 ? wood[2] : wood[3]); });
  }
  for (i = 0; i < w / 9; i++) { var sx = x + ((r() * w) | 0), sy = y + ri(r, 2, 6); F(g, sx, sy, 1, ri(r, 4, 12), AO1(Q(g, sx, sy + 3) || '#000000')); }      // chorreras de lluvia
  T(g, x, y + h - 7, w, 7, tinter('#4b372b', 0.14)); T(g, x, y + h - 4, w, 4, tinter('#4b372b', 0.2));
}
function pirca(g, x, y, w, h, r) {                                    // zócalo de piedra suelta
  F(g, x, y, w, h, ST[1]);
  var xx = x, row = 0;
  for (var yy = y; yy < y + h; yy += 3, row++) {
    xx = x - (row & 1 ? 3 : 0);
    while (xx < x + w) {
      var bw = ri(r, 5, 9), tone = r() < 0.5 ? ST[2] : (r() < 0.5 ? ST[3] : ST[1]);
      F(g, xx + 1, yy, bw - 1, 2, tone); F(g, xx + 1, yy, bw - 1, 1, lt(tone, 0.18)); F(g, xx, yy, 1, 3, ST[0]); F(g, xx, yy + 2, bw, 1, ST[0]);
      xx += bw;
    }
  }
  T(g, x, y, w, h, tinter(VI, 0.08));
}
function escoba(g, x, y) {                                            // escoba de paja apoyada en la pared
  g.line(x, y, x + 3, y - 20, '#6b4223'); g.line(x + 1, y, x + 4, y - 20, '#4a3028');
  F(g, x - 2, y - 7, 5, 8, '#c9a63e'); F(g, x - 2, y - 7, 5, 1, '#e0c864'); F(g, x + 2, y - 6, 1, 7, '#8a6e2a'); F(g, x - 2, y - 7, 5, 1, '#e0c864'); F(g, x - 1, y - 8, 3, 1, '#6b4223');
  for (var i = 0; i < 3; i++) P1(g, x - 2 + i * 2, y + 1, '#8a6e2a');
}
function tubo(g, x, y, h, r) {                                        // tubo de cocina con gorro, tiznado
  F(g, x - 1, y - h, 3, h, MT[2]); F(g, x - 1, y - h, 1, h, MT[3]); F(g, x + 1, y - h, 1, h, MT[1]);
  F(g, x - 2, y - h - 2, 5, 2, MT[1]); F(g, x - 2, y - h - 2, 5, 1, MT[3]); P1(g, x - 2, y - h - 1, MT[0]);
  F(g, x - 2, y - 3, 5, 3, '#2a2a30'); T(g, x - 1, y - h, 3, 4, tinter('#1c1a22', 0.45));
  if (r && r() < 0.5) { P1(g, x, y - h - 4, '#8a8884'); P1(g, x + 1, y - h - 6, '#a9a79b'); }
}
function plantPole(g, x, y, h, flag) {                                // palo largo de eucalipto con bandera peruana
  palo(g, x, y - h, 2, h, null);
  if (flag) flagPe(g, x + 2, y - h + 1, 10, 6, true);
}

/* cobertura de dos aguas para la casa de esteras: estera, plástico/lona o calamina; la vertiente norte (arriba) va más oscura */
function coverOf(c) {
  if (c.hasR('calamina')) return 'calamina';
  if (c.hasR('plastico') || c.hasR('lona')) return 'plastico';
  if (c.hasR('estera')) return 'estera';
  var v = c.seed % 10;
  return v < 4 ? 'estera' : (v < 8 ? 'plastico' : 'calamina');
}
function gable(c, y0, h, cover, silver, frac) {
  var g = c.g, W = c.W, r = c.r, i;
  var ry = Math.max(3, Math.round(h * frac)), tilt = ri(r, -4, 4), ph = r() * 6, kind = pick(r, ['azul', 'azul', 'ocre', 'azul', 'negro', 'azul']);
  function ridgeAt(x) { return clamp(ry + Math.round((x / W - 0.5) * tilt + Math.sin(x / 15 + ph) * 0.8), 2, Math.max(2, h - 3)); }
  if (cover === 'calamina') calamina(g, 0, y0, W, h, { r: r, dmg: c.dmg });
  else if (cover === 'estera') techoEstera(g, 0, y0, W, h, { silver: silver, r: r });
  else lona(g, 0, y0, W, h, { r: r, kind: kind, noStones: true });
  for (i = 0; i < W; i++) {
    var rr = ridgeAt(i);
    T(g, i, y0, 1, rr, tinter(VI, 0.26));
    F(g, i, y0 + rr - 1, 1, 2, '#6b5a4a'); P1(g, i, y0 + rr - 1, '#9a8672'); P1(g, i, y0 + rr + 1, '#3a3040');
  }
  F(g, 0, y0, W, 1, '#2a2a30');
  palo(g, 0, y0, 2, h, r); palo(g, W - 2, y0, 2, h, r);                // testeros
  var n = Math.max(2, (W / 14) | 0), j;
  for (j = 0; j < n; j++) { var sx = 5 + ((r() * (W - 10)) | 0); stone(g, sx, y0 + ridgeAt(sx) + ri(r, 4, 9), ri(r, 2, 3), ri(r, 1, 2)); }
  for (j = 0; j < n; j++) { var sx2 = 5 + ((r() * (W - 10)) | 0); stone(g, sx2, y0 + h - ri(r, 2, 4), ri(r, 2, 3), ri(r, 1, 2)); }
  return ridgeAt;
}
function esteraEave(c, faceY, cover, silver) {                       // borde delantero del techo (alero), 5 px
  var g = c.g, W = c.W, r = c.r, i;
  if (cover === 'calamina') { F(g, 0, faceY, W, 2, '#cfd1c8'); F(g, 0, faceY + 2, W, 2, MT[2]); F(g, 0, faceY + 4, W, 1, '#2f2e34'); }
  else if (cover === 'plastico') { F(g, 0, faceY, W, 3, '#3f6aa6'); F(g, 0, faceY, W, 1, '#8aaed4'); F(g, 0, faceY + 3, W, 1, '#2d4f82'); F(g, 0, faceY + 4, W, 1, '#1d2a48'); for (i = 6; i < W; i += ri(r, 9, 14)) { F(g, i, faceY + 3, 1, 2, '#cdb98a'); } }
  else { estera(g, 0, faceY, W, 4, { silver: silver, r: r, ph: 2 }); for (i = 0; i < W; i++) if (r() < 0.4) F(g, i, faceY + 3, 1, ri(r, 1, 2), (silver ? PLATA : PAJA)[0]); F(g, 0, faceY + 4, W, 1, '#3a2c22'); }
}

/* ======================== ESTERA ======================== */
regArch('estera', function (f) {
  var c = mk(f), g = c.g, W = c.W, H = c.H, r = c.r, dmg = c.dmg, i;
  var silver = (c.seed % 5) < 2, cover = coverOf(c);
  if (c.side === 'S') {
    var ridge = gable(c, 0, H, cover, silver, 0.3);
    F(g, 0, 0, W, 2, '#3a2c22'); F(g, 0, 2, W, 1, '#6b5a4a');                          // alero norte: el filo del techo
    F(g, 0, H - 2, W, 2, '#3a3040');
    var names = roofNames(c, ['antena'], ['tank', 'drums', 'rebar', 'bricks', 'cement', 'table', 'chair']);
    if (c.seed % 3 === 0 && names.indexOf('antenna') < 0 && names.indexOf('antena') < 0) names.push('antena');
    placeRoof(c, g, names, 4, 14, W - 4, H - 3, {});
    if (c.has('bandera') || c.seed % 4 === 1) plantPole(g, W - 8, H - 3, Math.min(34, H - 8), true);
    return done(c);
  }
  var fh = faceH(c, 48), faceY = H - fh, roofH = faceY, ridgeAt;
  if (roofH > 0) {
    ridgeAt = gable(c, 0, roofH, cover, silver, 0.38);
    var rn = roofNames(c, null, ['tank', 'drums', 'rebar', 'bricks', 'cement', 'table', 'chair']);
    if (rn.length) placeRoof(c, g, rn, 4, 10, W - 4, roofH - 4, {});
    if (roofH >= 20 && (c.has('bandera') || c.seed % 4 === 0)) plantPole(g, W - 9, faceY + 2, Math.min(30, roofH + 4), true);
  }
  var wallTop = faceY + 5, wallH = H - wallTop - 3;
  F(g, 0, faceY, W, fh, PAJA[0]);
  // marco de palos y paneles de estera
  var n = Math.max(1, Math.round(W / 22)), xs = [], bays = [];
  for (i = 0; i <= n; i++) xs.push(Math.round(i * (W - 3) / n));
  for (i = 0; i < n; i++) bays.push({ x: xs[i] + 3, w: xs[i + 1] - xs[i] - 3, i: i });
  var patch = (dmg >= 2 && n >= 3) ? ((c.seed >> 2) % n) : -1;
  bays.forEach(function (b) {
    var sv = b.i === patch ? !silver : silver;
    if (b.i === patch && (c.seed & 1)) tablas(g, b.x, wallTop, b.w, wallH, r, [WD[0], '#5e5a52', '#7e7a70', '#9a968a', WD[4]]);
    else estera(g, b.x, wallTop, b.w, wallH, { silver: sv, r: r, ph: b.i * 2, fray: true, mud: true });
  });
  paloH(g, 0, wallTop + 2, W, 2, r); paloH(g, 0, H - 35, W, 2, r);
  for (i = 0; i <= n; i++) { var pxx = xs[i]; palo(g, pxx, wallTop - 1, 3, wallH + 1, r); if (i > 0 && i < n) { lash(g, pxx, wallTop + 2); lash(g, pxx, H - 35); } }
  // puerta y ventana
  var big = bays.filter(function (b) { return b.w >= 14; });
  var dBay = big.length ? big[c.seed % big.length] : bays[0], dw = Math.min(12, dBay.w - 2), dx = dBay.x + ((dBay.w - dw) >> 1);
  var A2 = accentRamp(c, null), dRamp = (c.seed % 5 < 3) ? A2 : WD;
  doorBoards(g, dx, H - 32, dw, 29, dRamp, {});
  var lit = c.has('luz') || c.seed % 3 === 0, wBay = null;
  bays.forEach(function (b) { if (b !== dBay && b.w >= 11 && !wBay) wBay = b; });
  var wx = 0;
  if (wBay) {
    var ww = Math.min(9, wBay.w - 3); wx = wBay.x + ((wBay.w - ww) >> 1);
    if (c.seed % 2) winPlastic(g, wx, wallTop + 8, ww, 9, { lit: lit });
    else winCurtain(g, wx, wallTop + 8, ww, 9, pick(c.r2, ['#c8222c', '#2f6fb5', '#d8a84a', '#d83c7a']), { lit: lit });
    if (lit) c.lights.push({ x: wx + (ww >> 1), y: wallTop + 12, kind: 'local' });
  }
  // pie: tierra, piedras, estera deshilachada
  F(g, 0, H - 3, W, 3, '#7d5f47'); for (i = 0; i < W; i++) if (r() < 0.5) P1(g, i, H - 3 + ((r() * 3) | 0), r() < 0.5 ? '#4b372b' : '#a2947b');
  for (i = 2; i < W - 2; i += ri(r, 5, 8)) stone(g, i, H - 1, ri(r, 2, 3), 1);
  esteraEave(c, faceY, cover, silver);
  T(g, 0, wallTop, W, 3, AO3); T(g, 0, wallTop + 3, W, 2, AO2);
  palo(g, 0, faceY + 1, 3, fh - 1, r); palo(g, W - 3, faceY + 1, 3, fh - 1, r);
  // detalles de frente
  var items = c.front.slice(); if (!items.length) { if (c.seed % 5 < 3) items.push('macetas'); if (c.seed % 3 === 0) items.push('balde'); if (c.seed % 7 === 0) items.push('escoba'); }
  var rx = dx > W / 2 ? dx - 8 : dx + dw + 8;
  items.forEach(function (it, k) {
    var ox = k % 2 ? (dx > W / 2 ? dx + dw + 6 : dx - 8) : rx;
    if (it === 'macetas') { pot(g, clamp(ox, 6, W - 6), H - 1, c.r2); if (W > 56) pot(g, clamp(ox + 6, 6, W - 6), H - 1, c.r2); }
    else if (it === 'balde') bucket(g, clamp(ox, 5, W - 5), H - 1, pick(c.r2, ['#c0392b', '#e8e4dc', '#2f6fb5']));
    else if (it === 'bidon') drum(g, clamp(ox, 6, W - 6), H - 1, c.seed % 2 ? 'azul' : 'negro');
    else if (it === 'escoba') escoba(g, clamp(ox, 6, W - 6), H - 1);
  });
  if (c.has('ropa')) { mkOver(c, H - 56, 80); ropaLine(c.go, 4, W - 8, H - 38 - c.oy, 3, c.r2); }
  return done(c);
});

/* ======================== TRIPLAY ======================== */
regArch('triplay', function (f) {
  var c = mk(f), g = c.g, W = c.W, H = c.H, r = c.r, dmg = c.dmg, i;
  var A = paintRamp(c.color, dmg), plank = c.seed % 3 === 1, natural = A === WD;
  var lowTone = natural ? false : true;
  if (c.side === 'S') {
    calamina(g, 0, 0, W, H, { r: r, dmg: dmg });
    F(g, 0, 0, W, 1, '#2a2a30'); F(g, 0, 1, W, 2, '#cfd1c8'); F(g, 0, 3, W, 2, MT[1]); T(g, 0, 5, W, 2, AO2);      // cumbrera: borde norte
    F(g, 0, H - 2, W, 2, '#3a3040'); F(g, 0, 0, 1, H, '#2a2a30'); F(g, W - 1, 0, 1, H, '#2a2a30');
    scatterStones(g, 2, 8, W - 4, H - 10, Math.max(2, (W * H / 480) | 0), r);
    if (H >= 40 && c.seed % 2) tubo(g, ri(r, 8, W - 8), 22 + ((r() * (H - 26)) | 0), ri(r, 9, 13), r);
    var nm = roofNames(c, c.seed % 3 === 0 ? ['tanque'] : [], ['rebar', 'bricks', 'cement', 'table', 'chair', 'clothesline']);
    if (c.hasR('tendal')) nm.push('tendal');
    placeRoof(c, g, nm, 4, 10, W - 4, H - 3, {});
    return done(c);
  }
  var fh = faceH(c, 48), faceY = H - fh, roofH = faceY;
  if (roofH > 0) {
    calamina(g, 0, 0, W, roofH, { r: r, dmg: dmg });
    F(g, 0, 0, W, 1, '#2a2a30'); F(g, 0, 1, W, 2, '#cfd1c8'); F(g, 0, 3, W, 2, MT[1]); T(g, 0, 5, W, 2, AO2);
    F(g, 0, 0, 1, roofH, '#2a2a30'); F(g, W - 1, 0, 1, roofH, '#2a2a30');
    scatterStones(g, 2, 6, W - 4, roofH - 8, Math.max(2, (W * roofH / 520) | 0), r);
    if (roofH >= 28 && c.seed % 2 === 0) tubo(g, ri(r, 10, W - 10), roofH - ri(r, 5, 9), ri(r, 9, 13), r);
    var nm2 = roofNames(c, c.seed % 3 === 1 ? ['tanque'] : [], ['rebar', 'bricks', 'cement', 'table', 'chair']);
    if (nm2.length) placeRoof(c, g, nm2, 4, 8, W - 4, roofH - 3, {});
    if (roofH >= 20 && (c.has('bandera') || c.seed % 5 === 2)) plantPole(g, 5 + (c.seed % 3) * 6, faceY + 2, Math.min(28, roofH + 6), true);
  }
  // alero de calamina y pared
  var wallTop = faceY + 5, wallH = H - wallTop - 4;
  F(g, 0, faceY, W, fh, A[2]);
  var Wi = W - 6, n = Math.max(1, Math.round(Wi / 20)), xb = [], i2;
  for (i = 0; i <= n; i++) xb.push(3 + Math.round(i * Wi / n));
  for (i = 0; i < n; i++) {
    var sx = xb[i] + (i ? 1 : 0), sw = xb[i + 1] - sx;
    if (plank) tablas(g, sx, wallTop, sw, wallH, r, A);
    else {
      F(g, sx, wallTop, sw, wallH, A[2]); F(g, sx, wallTop, sw, 1, A[3]);
      for (i2 = 0; i2 < sw / 7; i2++) { var gx = sx + ((r() * sw) | 0); F(g, gx, wallTop + 2, 1, wallH - 5, r() < 0.5 ? A[1] : A[3]); }          // veta apenas visible
      for (i2 = 0; i2 < sw; i2 += 4) if (r() < 0.5) F(g, sx + i2, wallTop + ri(r, 3, wallH - 6), ri(r, 2, 3), 1, A[3]);                    // pinceladas
    }
    wearPaint(g, sx, wallTop, sw, wallH, r, dmg, WD);
  }
  // marco de listones: contorno, travesaños y juntas de plancha
  F(g, 0, wallTop, W, 2, WD[2]); F(g, 0, wallTop, W, 1, WD[3]); F(g, 0, H - 7, W, 2, WD[2]); F(g, 0, H - 7, W, 1, WD[3]); F(g, 0, H - 5, W, 1, WD[0]);
  for (i = 1; i < n; i++) { F(g, xb[i] - 1, wallTop, 3, wallH, WD[2]); F(g, xb[i] - 1, wallTop, 1, wallH, WD[3]); F(g, xb[i] + 1, wallTop, 1, wallH, WD[1]); }
  F(g, 0, wallTop, 3, wallH + 4, WD[2]); F(g, 0, wallTop, 1, wallH + 4, WD[3]); F(g, 2, wallTop, 1, wallH + 4, WD[1]);
  F(g, W - 3, wallTop, 3, wallH + 4, WD[2]); F(g, W - 3, wallTop, 1, wallH + 4, WD[3]); F(g, W - 1, wallTop, 1, wallH + 4, WD[0]);
  // puerta (pintada de otro color), ventanita con plástico, número de lote
  var dBay = (c.seed >> 1) % n, dw = 14, bw = xb[dBay + 1] - xb[dBay], dx = xb[dBay] + ((bw - dw) >> 1), A2 = accentRamp(c, c.color);
  if (n === 1) dx = (W - dw) >> 1;
  if (c.seed % 4 === 3) doorIron(g, dx, H - 31, dw, 27, A2, { dmg: dmg, seed: c.seed }); else doorBoards(g, dx, H - 31, dw, 27, A2, {});
  var wBay = n > 1 ? (dBay + 1) % n : -1, lit = c.has('luz') || c.seed % 3 === 1;
  if (wBay >= 0) {
    var wbw = xb[wBay + 1] - xb[wBay], ww = Math.min(10, wbw - 6), wx = xb[wBay] + ((wbw - ww) >> 1);
    if (c.seed % 2) winPlastic(g, wx, wallTop + 8, ww, 9, { lit: lit }); else winCurtain(g, wx, wallTop + 8, ww, 9, pick(c.r2, ['#c8222c', '#e8e4dc', '#d8a84a', '#2f6fb5']), { lit: lit });
    if (lit) c.lights.push({ x: wx + (ww >> 1), y: wallTop + 12, kind: 'local' });
    var inkLight = (A === WD) ? '#e8e0cc' : '#efe9dc';
    if (W >= 64 && wbw >= 24) px.text(g, 'LT ' + (3 + c.seed % 28), wx + ww + 3 > xb[wBay + 1] - 12 ? wx : xb[wBay] + 4, wallTop + 22, { font: 'a5', ink: inkLight });
  } else if (W >= 56) px.text(g, 'LT ' + (3 + c.seed % 28), dx + dw + 4, wallTop + 7, { font: 'a5', ink: '#efe9dc' });
  // pirca al pie y peldaño
  pirca(g, 0, H - 4, W, 4, r); F(g, 0, H - 1, W, 1, '#3a3040');
  F(g, dx - 2, H - 5, dw + 4, 5, CN[2]); F(g, dx - 2, H - 5, dw + 4, 1, CN[4]); F(g, dx - 2, H - 1, dw + 4, 1, CN[0]); F(g, dx + dw + 1, H - 4, 1, 3, CN[1]);
  // alero de calamina
  F(g, 0, faceY, W, 2, '#cfd1c8'); F(g, 0, faceY + 2, W, 2, MT[2]); F(g, 0, faceY + 4, W, 1, '#2f2e34');
  T(g, 0, wallTop, W, 3, AO3); T(g, 0, wallTop + 3, W, 2, AO2);
  // frente: dignidad
  var items = c.front.slice(); if (!items.length) { items.push('macetas'); if (c.seed % 2) items.push('bidon'); }
  items.forEach(function (it, k) {
    var left = dx > W / 2, ox = k % 2 ? (left ? dx + dw + 6 : dx - 7) : (left ? dx - 7 : dx + dw + 7);
    if (it === 'macetas') { pot(g, clamp(ox, 6, W - 6), H - 1, c.r2); pot(g, clamp(ox + (left ? -6 : 6), 6, W - 6), H - 1, c.r2); }
    else if (it === 'balde') bucket(g, clamp(ox, 5, W - 5), H - 1, pick(c.r2, ['#c0392b', '#e8e4dc', '#2f6fb5']));
    else if (it === 'bidon') drum(g, clamp(ox, 7, W - 7), H - 1, c.seed % 2 ? 'azul' : 'negro');
    else if (it === 'escoba') escoba(g, clamp(ox, 6, W - 6), H - 1);
  });
  if (c.has('ropa')) { mkOver(c, H - 56, 80); ropaLine(c.go, 4, W - 8, H - 40 - c.oy, 3, c.r2); }
  return done(c);
});

/* ======================== LADRILLO CARAVISTA ======================== */
function brickFill(g, x, y, w, h, r) {                                // ladrillo king-kong sin tarrajear: hiladas de 4 px, 7 px de largo, junta clara
  F(g, x, y, w, h, MORTAR);
  var row = 0, j, bx;
  for (j = 0; j < h; j += 4, row++) {
    bx = x - ((row & 1) ? 4 : 0);
    while (bx < x + w) {
      var col = pick(r, BRK), x0 = Math.max(bx, x), x1 = Math.min(bx + 7, x + w);
      if (x1 > x0) {
        var bh = Math.min(3, h - j);
        F(g, x0, y + j, x1 - x0, bh, col);
        if (r() < 0.55) F(g, x0, y + j, x1 - x0, 1, lt(col, 0.13));
        if (r() < 0.3) P1(g, x1 - 1, y + j + bh - 1, dk(col, 0.28));
        if (r() < 0.07) F(g, x0 + 1, y + j + 1, 2, 1, dk(col, 0.3));
      }
      bx += 8;
    }
  }
}
function plaster(g, x, y, w, h, r) {                                  // tarrajeo a medias: parche de mezcla gris con borde roto
  var i, j;
  for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
    var edge = Math.min(i, j, w - 1 - i, h - 1 - j), ok = edge >= 3 || (edge >= 1 && r() < 0.35 + edge * 0.2) || (edge === 0 && r() < 0.08);
    if (!ok) continue;
    var c = (((i * 3 + j * 5) & 7) === 0) ? CN[1] : ((i + j) % 11 === 0 ? CN[4] : CN[3]);
    P1(g, x + i, y + j, c);
  }
}
function viga(g, x, y, w) {                                           // viga / losa vista de concreto, 4 px
  F(g, x, y, w, 4, CN[2]); F(g, x, y, w, 1, CN[4]); F(g, x, y + 1, w, 1, CN[3]); F(g, x, y + 3, w, 1, CN[1]);
  T(g, x, y + 4, w, 1, AO3); T(g, x, y + 5, w, 2, AO1);
}
function columna(g, x, y, h, w, r) {
  F(g, x, y, w, h, CN[2]); F(g, x, y, 1, h, CN[3]); F(g, x + 1, y, 1, h, CN[3]); F(g, x + w - 1, y, 1, h, CN[1]);
  for (var i = 0; i < h / 7; i++) P1(g, x + 1 + ((r() * (w - 2)) | 0), y + ((r() * h) | 0), r() < 0.5 ? CN[1] : CN[4]);
}
function meterBox(g, x, y) {                                          // caja de medidor de luz (sin marca) con cables
  F(g, x - 1, y - 1, 8, 11, K); F(g, x, y, 6, 9, '#a9a79b'); F(g, x, y, 6, 1, '#c9c5b5'); F(g, x + 1, y + 2, 4, 3, '#2d3d4a'); F(g, x + 1, y + 2, 4, 1, '#8fb0b8'); P1(g, x + 2, y + 3, '#d8d4c4'); F(g, x + 5, y, 1, 9, '#66656b');
  g.line(x + 3, y - 2, x + 3, y - 12, '#1c1d1f');
}
function rebarRods(g, x, y, n, r, bottles) {                          // fierros de espera saliendo del concreto (x = izquierda del grupo)
  for (var i = 0; i < n; i++) {
    var rx = x + i * 2 + 1, rh = ri(r, 8, 15);
    for (var j = 0; j < rh; j++) P1(g, rx, y - 1 - j, j % 5 === 4 ? RU[3] : (j < 3 ? RU[2] : RU[1]));
    P1(g, rx, y - rh - 1, RU[3]);
    if (bottles && i === 1 && r() < 0.8) { var bc = pick(r, ['#8fb0b8', '#9bd0c0', '#c9d8d0', '#a9c4e6']); F(g, rx - 1, y - rh - 7, 3, 6, bc); P1(g, rx - 1, y - rh - 7, '#dbe6da'); F(g, rx - 1, y - rh - 7, 1, 5, '#dbe6da'); P1(g, rx, y - rh - 1, RU[3]); }
  }
}
function storeyWindows(c, bays, ys, hS, s, wood) {                    // ventanas de los pisos altos o de la planta baja
  var g = c.g, r = c.r, A = accentRamp(c, c.color), kinds = ['plastico', 'reja', 'cortina', 'reja', 'plastico'], out = [];
  var keep = (c.seed + s) % Math.max(1, bays.length);
  bays.forEach(function (b, bi) {
    if (b.skip) return;
    if (s > 0 && bi !== keep && bays.length > 1 && r() < 0.28) return;                           // un paño de ladrillo ciego
    var ww = clamp(b.w - 12 - (r() < 0.35 ? 4 : 0), 10, 20) & ~1, wx = b.x + ((b.w - ww) >> 1), wy = s === 0 ? c.H - 36 : ys + 9, hh = s === 0 ? 15 : 14;
    var kind = pick(r, kinds), lit = c.has('luz') && (bi + s) % 2 === 0;
    if (kind === 'plastico') winPlastic(g, wx, wy, ww, hh, { lit: lit });
    else if (kind === 'cortina') winCurtain(g, wx, wy, ww, hh, pick(r, ['#c8222c', '#2f6fb5', '#d8a84a', '#d83c7a', '#e8e4dc']), { lit: lit });
    else winReja(g, wx, wy, ww, hh, r() < 0.5 ? A : [K, '#2a2a30', '#3b4250', '#5c6570', '#8a8f98'], { lit: lit, cur: lit ? null : (r() < 0.5 ? pick(r, ['#c8222c', '#d8c8a0', '#2f6fb5']) : null) });
    // salitre bajo el antepecho
    for (var i = 0; i < ww; i += 2) if (r() < 0.6) F(g, wx + i, wy + hh + 4, 1, ri(r, 2, 5), lt(MORTAR, 0.3));
    if (lit) c.lights.push({ x: wx + (ww >> 1), y: wy + (hh >> 1), kind: 'local' });
    out.push({ x: wx, y: wy, w: ww, h: hh });
  });
  return out;
}

function brickHouse(c, mode) {
  var g = c.g, W = c.W, H = c.H, r = c.r, dmg = c.dmg, f = c.f, i, j, s;
  var fl = clamp(f.floors || (mode === 'mixta' ? 2 : 1), 1, 3);
  if (mode === 'mixta' && fl < 2) fl = 2;
  var fh = faceH(c, floorsFace(fl)), ns = fh >= 48 ? 1 + (((fh - 48) / 32) | 0) : 1, faceY = H - fh;
  var woodTop = mode === 'mixta' && ns >= 2;
  var unf = mode === 'ladrillo' && ns >= 2 && (dmg >= 3 || c.seed % 4 === 0);
  var topY = unf ? faceY + 32 - 14 : faceY;                          // arriba de la parte sólida de la cara; sobre esto es azotea
  var n = Math.max(1, Math.round(W / 44)), colX = [], bays = [];
  for (i = 0; i <= n; i++) colX.push(Math.round(i * (W - 5) / n));
  for (i = 0; i < n; i++) bays.push({ x: colX[i] + 5, w: colX[i + 1] - colX[i] - 5 });
  var A = paintRamp(c.color, dmg), A2 = accentRamp(c, c.color);
  // ---------- azotea ----------
  var roofBottom = Math.max(0, topY);
  if (roofBottom > 0) {
    losa(g, 0, 0, W, roofBottom, r, dmg);
    F(g, 0, 0, W, 1, CN[0]); F(g, 0, 1, W, 2, CN[4]); F(g, 0, 3, W, 1, CN[1]); T(g, 0, 4, W, 3, AO2);       // filo del fondo de la azotea
    F(g, 0, 0, 1, roofBottom, CN[0]); F(g, W - 1, 0, 1, roofBottom, CN[0]);
  }
  // ---------- pared de ladrillo, piso por piso ----------
  var wallTop = unf ? topY : faceY + (woodTop ? 0 : 4);
  var firstBrickY = woodTop ? faceY + 32 : wallTop;
  brickFill(g, 0, firstBrickY, W, H - firstBrickY, r);
  if (c.seed % 3 === 0 || dmg >= 3) { var pw = ri(r, 14, 26), ph = ri(r, 12, 26); plaster(g, c.seed % 2 ? 5 : W - 5 - pw, H - 4 - ph, pw, ph, r); }         // tarrajeo a medias, abajo
  if (unf) {                                                          // último piso a medio levantar: hiladas a distinta altura
    for (i = 0; i < W; i += 8) {
      var cutb = ri(r, 0, 2) * 4, cw8 = Math.min(8, W - i);
      for (j = 0; j < cutb; j++) for (var k = 0; k < cw8; k++) P1(g, i + k, topY + j, ((i + k + j) % 5 === 0) ? CN[1] : ((i + k) % 7 === 0 ? CN[3] : CN[2]));
    }
    T(g, 0, topY + 8, W, 2, AO1);
  }
  // ---------- losas y columnas ----------
  var colTop = unf ? faceY : (woodTop ? faceY + 32 : faceY);
  for (i = 0; i <= n; i++) columna(g, colX[i], colTop, H - colTop - 0, 5, r);
  for (s = 0; s < ns; s++) {
    var ys = s === 0 ? H - 48 : H - 48 - 32 * s;
    if (s === ns - 1 && unf) continue;
    if (s === ns - 1 && woodTop) continue;
    viga(g, 0, ys, W);
  }
  F(g, 0, H - 4, W, 4, CN[2]); F(g, 0, H - 4, W, 1, CN[4]); F(g, 0, H - 1, W, 1, CN[0]); for (i = 0; i < W; i += ri(r, 6, 14)) P1(g, i, H - 3, CN[1]);   // sobrecimiento
  // ---------- aberturas ----------
  var dBay = (c.seed >> 1) % n, dw = bays[dBay].w >= 22 ? 16 : 14, dx = bays[dBay].x + ((bays[dBay].w - dw) >> 1);
  doorIron(g, dx, H - 38, dw, 34, A2, { dmg: dmg, seed: c.seed });
  var gb = bays.map(function (b, k) { return { x: b.x, w: b.w, skip: k === dBay && true }; });
  if (n === 1) gb[0].skip = true;
  var gw = storeyWindows(c, gb, 0, 48, 0, false);
  if (n === 1 && bays[0].w >= 30) {                                     // puerta + ventana en la misma crujía
    var wx2 = dx > W / 2 ? bays[0].x + 2 : dx + dw + 3, wsz = Math.min(12, (dx > W / 2 ? dx - bays[0].x - 4 : bays[0].x + bays[0].w - wx2 - 2));
    if (wsz >= 8) winReja(g, wx2, H - 36, wsz, 15, [K, '#2a2a30', '#3b4250', '#5c6570', '#8a8f98'], {});
  }
  var uw = [];
  for (s = 1; s < ns; s++) {
    var ys2 = H - 48 - 32 * s;
    if (s === ns - 1 && unf) continue;
    if (s === ns - 1 && woodTop) continue;
    uw = uw.concat(storeyWindows(c, bays, ys2, 32, s, false));
  }
  if (c.has('medidor')) meterBox(g, dx + (dx > W / 2 ? -9 : dw + 3), H - 34);
  // ---------- piso de madera de la casa mixta ----------
  if (woodTop) {
    var bx0 = 6, bx1 = W - 6, bw = bx1 - bx0, wy0 = faceY + 5, wh = 32 - 5;
    // costados: la losa sin terminar se ve entre la caja de madera y el borde
    losa(g, 0, faceY, W, 32, r, dmg); F(g, 0, faceY + 28, W, 4, CN[3]); T(g, 0, faceY + 31, W, 1, AO3);
    var plank = c.seed % 2 === 0;
    if (plank) tablas(g, bx0, wy0, bw, wh, r, A); else { F(g, bx0, wy0, bw, wh, A[2]); F(g, bx0, wy0, bw, 1, A[3]); for (i = 0; i < bw / 8; i++) F(g, bx0 + ((r() * bw) | 0), wy0 + 2, 1, wh - 4, r() < 0.5 ? A[1] : A[3]); }
    wearPaint(g, bx0, wy0, bw, wh, r, dmg, WD);
    for (i = bx0 + 20; i < bx1 - 4; i += 20) { F(g, i, wy0, 3, wh, WD[2]); F(g, i, wy0, 1, wh, WD[3]); F(g, i + 2, wy0, 1, wh, WD[1]); }
    F(g, bx0, wy0 + wh - 2, bw, 2, WD[2]); F(g, bx0, wy0 + wh - 2, bw, 1, WD[3]);
    F(g, bx0, wy0, 3, wh, WD[2]); F(g, bx0, wy0, 1, wh, WD[3]); F(g, bx1 - 3, wy0, 3, wh, WD[1]); F(g, bx1 - 1, wy0, 1, wh, WD[0]);
    // ventanas del piso de madera
    var nw = Math.max(1, Math.round(bw / 30)), lit2 = c.has('luz') || c.seed % 3 === 1;
    for (i = 0; i < nw; i++) {
      var wcx = bx0 + Math.round((i + 0.5) * bw / nw), ww2 = 10;
      if (i === nw - 1 && nw > 1 && c.seed % 2) { doorBoards(g, wcx - 6, wy0 + 2, 12, wh - 3, A2, {}); continue; }
      if ((i + c.seed) % 2) winPlastic(g, wcx - 5, wy0 + 6, ww2, 10, { lit: lit2 && i === 0 }); else winCurtain(g, wcx - 5, wy0 + 6, ww2, 10, pick(r, ['#c8222c', '#e8e4dc', '#d8a84a']), { lit: lit2 && i === 0 });
      if (lit2 && i === 0) c.lights.push({ x: wcx, y: wy0 + 10, kind: 'local' });
    }
    // alero de calamina y su sombra sobre la pared
    F(g, bx0 - 1, faceY, bw + 2, 2, '#cfd1c8'); F(g, bx0 - 1, faceY + 2, bw + 2, 2, MT[2]); F(g, bx0 - 1, faceY + 4, bw + 2, 1, '#2f2e34');
    T(g, bx0, wy0, bw, 3, AO3); T(g, bx0, wy0 + 3, bw, 2, AO2);
    // viga bajo el piso de madera
    viga(g, 0, faceY + 32, W);
    // techo de calamina de la caja, sobre la azotea
    var roofH2 = Math.max(0, faceY);
    if (roofH2 >= 8) {
      var rd = Math.min(roofH2 - 2, 44), ry0 = roofH2 - rd;
      calamina(g, bx0 - 1, ry0, bw + 2, rd, { r: r, dmg: dmg }); F(g, bx0 - 1, ry0, bw + 2, 1, '#2a2a30'); F(g, bx0 - 1, ry0 + 1, bw + 2, 2, '#cfd1c8'); T(g, bx0 - 1, ry0 + 3, bw + 2, 2, AO2);
      F(g, bx0 - 1, ry0, 1, rd, '#2a2a30'); F(g, bx1, ry0, 1, rd, '#2a2a30');
      scatterStones(g, bx0, ry0 + 4, bw, rd - 6, Math.max(2, (bw * rd / 520) | 0), r);
      if (rd >= 24 && c.seed % 2 === 0) tubo(g, ri(r, bx0 + 6, bx1 - 6), roofH2 - ri(r, 4, 8), ri(r, 9, 13), r);
    }
  }
  // ---------- fierros de espera sobre las columnas ----------
  var RK = px.roofKit;
  for (i = 0; i <= n; i++) {
    var cx = colX[i] + 1;
    if (woodTop) { if (i === 0 || i === n) rebarRods(g, i === 0 ? 0 : W - 6, faceY + 31, 3, r, true); continue; }
    if (unf || c.seed % 3 !== 1 || i % 2 === 0) rebarRods(g, cx - (i === n ? 1 : 0), faceY + 1, 2 + (r() < 0.5 ? 1 : 0), r, true);
  }
  // ---------- piezas de azotea ----------
  var pool = ['antena', 'tendal', 'bidones', 'llantas', 'perro', 'gas', 'macetas', 'cemento', 'silla'], dn = ['tanque'], area = W * roofBottom;
  for (i = 0; i < (area > 2600 ? 3 : (area > 1400 ? 2 : 1)); i++) dn.push(pool[(c.seed * (i + 3) + i * 5) % pool.length]);
  var names = roofNames(c, dn, ['rebar']);
  if (unf && names.indexOf('ladrillos') < 0 && names.indexOf('bricks') < 0) names.push('ladrillos');
  var rTop = woodTop ? 0 : 6, rBot = roofBottom - (woodTop ? 0 : 3);
  if (woodTop) rBot = 0;
  if (!woodTop && rBot - rTop >= 12) placeRoof(c, g, names, 4, rTop, W - 4, rBot, {});
  if (woodTop && faceY >= 20) { /* la azotea queda detrás de la caja: solo el tanque a un costado, si cabe */ }
  // ---------- dignidad en la fachada ----------
  var items = c.front.slice();
  if (!items.length) items = ['macetas'];
  var px0 = dx > W / 2 ? dx - 8 : dx + dw + 8;
  items.forEach(function (it, k) {
    var ox = clamp(k % 2 ? (dx > W / 2 ? dx + dw + 6 : dx - 7) : px0, 6, W - 6);
    if (it === 'macetas') pot(g, ox, H - 4, c.r2);
    else if (it === 'balde') bucket(g, ox, H - 4, pick(c.r2, ['#c0392b', '#e8e4dc', '#2f6fb5']));
    else if (it === 'bidon') drum(g, ox, H - 4, 'azul');
    else if (it === 'escoba') escoba(g, ox, H - 4);
  });
  // ---------- capa alta: banderas y ropa ----------
  if (c.has('bandera') || c.has('ropa')) {
    var oTop = Math.max(0, H - fh - 8); mkOver(c, oTop, H + 24 - oTop);
    var oy = c.oy, go = c.go, cand = uw.length ? uw : gw;
    if (c.has('bandera') && cand.length) { var w0 = cand[(c.seed >> 2) % cand.length]; F(go, w0.x + 2, w0.y - 1 - oy, w0.w - 4, 1, '#3a2c22'); flagPe(go, w0.x + (w0.w >> 1) - 4, w0.y - oy, 9, 12, true); }
    if (c.has('ropa') && cand.length > 1) { var a = cand[0], b2 = cand[cand.length - 1]; var wa = Math.min(46, W - 12); ropaLine(go, 5, wa, a.y + a.h + 6 - oy, 3, c.r2); }
    else if (c.has('ropa') && cand.length) { var a2 = cand[0]; ropaLine(go, Math.max(2, a2.x - 6), Math.min(40, W - 4), a2.y + a2.h + 6 - oy, 3, c.r2); }
  }
  return done(c);
}
function brickRoofS(c, mode) {                                        // lado S: azotea de losa con parapeto en el borde norte y fierros
  var g = c.g, W = c.W, H = c.H, r = c.r, dmg = c.dmg, i;
  losa(g, 0, 0, W, H, r, dmg);
  // parapeto norte de ladrillo visto: cara superior 2 px + cara de 4 px
  F(g, 0, 0, W, 2, CN[4]); F(g, 0, 2, W, 4, MORTAR); brickFill(g, 0, 2, W, 4, r); F(g, 0, 6, W, 1, CN[1]); T(g, 0, 7, W, 3, AO2); T(g, 0, 10, W, 2, AO1);
  F(g, 0, 0, 2, H, CN[3]); F(g, W - 2, 0, 2, H, CN[1]); F(g, 0, H - 1, W, 1, CN[1]);
  var n = Math.max(1, Math.round(W / 44)), colX = [];
  for (i = 0; i <= n; i++) colX.push(Math.round(i * (W - 5) / n));
  var unf = dmg >= 2 || c.seed % 2;
  for (i = 0; i <= n; i++) { F(g, colX[i], 0, 5, 7, CN[3]); F(g, colX[i], 0, 5, 1, CN[4]); }
  for (i = 0; i <= n; i++) if (unf || i % 2 === 0) { rebarRods(g, colX[i] + 1, 14 + (c.seed % 3), 2, r, true); }
  var names = roofNames(c, ['tanque', 'tendal'], ['rebar']);
  placeRoof(c, g, names, 4, 18, W - 4, H - 3, {});
  if (mode === 'mixta') {                                             // caja de madera detrás: se ve su techo de calamina
    var bx0 = 8, bw = W - 16, by0 = Math.max(16, H >> 1), bh = H - by0 - 4;
    if (bh >= 10) { calamina(g, bx0, by0, bw, bh, { r: r, dmg: dmg }); F(g, bx0, by0, bw, 1, '#2a2a30'); F(g, bx0, by0 + 1, bw, 2, '#cfd1c8'); scatterStones(g, bx0, by0 + 4, bw, bh - 5, Math.max(2, (bw * bh / 300) | 0), r); }
  }
  return done(c);
}
regArch('ladrilloCerro', function (f) { var c = mk(f); return c.side === 'S' ? brickRoofS(c, 'ladrillo') : brickHouse(c, 'ladrillo'); });
regArch('mixta', function (f) { var c = mk(f); return c.side === 'S' ? brickRoofS(c, 'mixta') : brickHouse(c, 'mixta'); });

/* ======================== LETREROS PINTADOS A MANO ======================== */
var BODEGA_NAMES = ['BODEGA DOÑA ROSA', 'MINIMARKET EL PROGRESO', 'BODEGA LA ESPERANZA', 'BODEGA SAN JUDAS', 'BODEGA NUEVA ALBORADA', 'BODEGA EL VECINO', 'BODEGUITA LA UNIÓN', 'MINIMARKET DON PEDRO'];
var OLLA_NAMES = ['LAS MARGARITAS', 'NUEVO AMANECER', 'UNIÓN Y ESFUERZO', 'SANTA ROSA', 'MANOS UNIDAS', 'LA ESPERANZA', 'VIRGEN DEL CARMEN', 'LOS ANGELITOS'];
function handLetters(g, str, x, y, font, ink, shadow, r, jitter) {    // letras una por una, cada una con un salto de 1 px: se nota la brocha
  var cx = x, i;
  for (i = 0; i < str.length; i++) {
    var ch = str.charAt(i), wch = px.measure(ch, font), jy = jitter && r() < 0.16 ? (r() < 0.5 ? -1 : 1) : 0;
    if (ch !== ' ') px.text(g, ch, cx, y + jy, { font: font, ink: ink, shadow: shadow });
    cx += wch + 1;
  }
  return cx - x - 1;
}
function handWidth(str, font) { return px.measure(str, font) + Math.max(0, str.length - 1) * 0; }
function noMarks(t) { return t.replace(/[ÁÀ]/g, 'A').replace(/[ÉÈ]/g, 'E').replace(/Í/g, 'I').replace(/Ó/g, 'O').replace(/[ÚÜ]/g, 'U').replace(/Ñ/g, 'N'); }
function handSign(g, str, x, y, w, h, o, r) {                         // letrero pintado sobre el muro: fondo con borde de brocha y texto
  F(g, x, y, w, h, o.bg); F(g, x, y, w, 1, o.bd); F(g, x, y + h - 1, w, 1, o.bd); F(g, x, y, 1, h, o.bd); F(g, x + w - 1, y, 1, h, o.bd);
  for (var i = 0; i < w / 6; i++) P1(g, x + 1 + ((r() * (w - 2)) | 0), y + 1 + ((r() * (h - 2)) | 0), lt(o.bg, 0.12));
  var s = str, font = 'a7', lines;
  function fits(t, f) { return px.measure(t, f) <= w - 4; }
  if (fits(s, 'a7') && h >= 11) lines = [[s, 'a7']];
  else {
    var words = s.split(' '), best = null, k;
    for (k = 1; k < words.length; k++) { var a = words.slice(0, k).join(' '), b = words.slice(k).join(' '); if (fits(a, 'a5') && fits(b, 'a5')) { best = [a, b]; break; } }
    if (best && h >= 13) lines = [[noMarks(best[0]), 'a5'], [noMarks(best[1]), 'a5']];       // sin tildes: no caben dos renglones con marcas en 13 px (y así se pinta a mano)
    else lines = [[s, 'a5']];
    while (lines.length === 1 && !fits(lines[0][0], 'a5') && lines[0][0].length > 3) lines[0][0] = lines[0][0].slice(0, -1);
  }
  var tot = 0; lines.forEach(function (l) { tot += (l[1] === 'a7' ? 7 : 5); }); tot += (lines.length - 1) * 1;
  var ty = y + ((h - tot) >> 1) + (lines[0][1] === 'a7' && /[ÁÉÍÓÚÑ]/.test(str) ? 1 : 0);
  lines.forEach(function (l) {
    var tw = px.measure(l[0], l[1]);
    handLetters(g, l[0], x + ((w - tw) >> 1), ty, l[1], o.ink, l[1] === 'a7' ? o.sh : null, r, true);
    ty += (l[1] === 'a7' ? 7 : 5) + 1;
  });
}
var SIGN_COLORS = [
  { bg: '#e8dcb0', bd: '#b0282e', ink: '#b0282e', sh: '#7a1a1a' },
  { bg: '#f0c850', bd: '#2f4470', ink: '#2f4470', sh: '#1d2a48' },
  { bg: '#2f6fb5', bd: '#e8e4dc', ink: '#f3efe2', sh: '#1d2a48' },
  { bg: '#e8e4dc', bd: '#2e5e3e', ink: '#2e5e3e', sh: '#9a9484' },
  { bg: '#d4583a', bd: '#f3efe2', ink: '#f3efe2', sh: '#6b1f1c' }
];
function marcaAd(g, x, y, w, h, id, r) {                              // plancha pintada de gaseosa con los colores de ACH.px.marca(id)
  var m = typeof px.marca === 'function' ? px.marca(id) : null;
  if (!m || !m.colors) return false;
  var bg = m.colors.bg, fg = m.colors.fg, ac = m.colors.accent || fg;
  F(g, x, y, w, h, bg); frame(g, x, y, w, h, dk(bg, 0.45)); F(g, x + 1, y + 1, w - 2, 1, lt(bg, 0.25));
  var words = String(m.text || m.texto || '').toUpperCase().split(/[\s-]+/).filter(Boolean).slice(0, 2), ty = y + 2;
  if (!words.length) return true;
  var lines = words;
  if (lines.length === 1) ty = y + ((h - 5) >> 1);
  lines.forEach(function (wd) {
    var t = wd; while (t.length > 2 && px.measure(t, 'a5') > w - 2) t = t.slice(0, -1);
    px.text(g, t, x + ((w - px.measure(t, 'a5')) >> 1), ty, { font: 'a5', ink: fg });
    ty += 6;
  });
  F(g, x + 1, y + h - 2, w - 2, 1, ac);
  return true;
}
function jabas(g, x, y, r) {                                          // pila de jabas plásticas con botellas (x = izquierda)
  var cols = ['#c42b26', '#2f6fb5', '#d8a84a', '#c42b26'], n = 3, i, j;
  for (i = 0; i < n; i++) {
    var cy = y - (i + 1) * 5, col = cols[(i + (r() * 2 | 0)) % cols.length];
    F(g, x, cy, 13, 5, col); F(g, x, cy, 13, 1, lt(col, 0.3)); F(g, x, cy + 4, 13, 1, dk(col, 0.45)); F(g, x + 12, cy, 1, 5, dk(col, 0.35));
    for (j = 1; j < 12; j += 3) { F(g, x + j, cy + 1, 1, 2, '#2a1a12'); P1(g, x + j, cy, i === n - 1 ? '#3f7266' : '#6b4223'); }
  }
  for (j = 1; j < 12; j += 3) { P1(g, x + j, y - n * 5 - 1, '#3f7266'); P1(g, x + j, y - n * 5 - 2, '#5a8f80'); }
}
function awningLona(go, x, y, w, cols, r) {                           // toldo de lona a rayas con volado
  var h = 5, i;
  for (i = 0; i < w; i++) {
    var col = ((i >> 2) & 1) ? cols[1] : cols[0], d = ((i >> 2) & 1) ? 0 : 0;
    F(go, x + i, y, 1, h, col); P1(go, x + i, y, lt(col, 0.25)); P1(go, x + i, y + h - 1, dk(col, 0.3));
  }
  for (i = 0; i < w; i++) { var col2 = ((i >> 2) & 1) ? cols[1] : cols[0]; if (((i + 2) & 3) < 3) { P1(go, x + i, y + h, col2); if (((i + 2) & 3) === 1) P1(go, x + i, y + h + 1, dk(col2, 0.2)); } }
  F(go, x - 1, y, 1, h + 2, K); F(go, x + w, y, 1, h + 2, K); F(go, x - 1, y - 1, w + 2, 1, K);
  for (i = 3; i < w - 2; i += ri(r, 9, 13)) F(go, x + i, y + 1, 1, 3, dk(cols[0], 0.3));
  T(go, x, y + h + 2, w, 3, tinter(VI, 0.0));
}
function exposeBrick(g, x, y, w, h, r, dmg) {                         // pintura saltada: se asoma el ladrillo
  for (var i = 0; i < (w * h / 220) * (0.4 + dmg * 0.6); i++) {
    var bx = x + ((r() * w) | 0), by = y + ((r() * h) | 0);
    blob(bx, by, ri(r, 2, 4), ri(r, 1, 3), r, function (xx, yy) { if (xx >= x && xx < x + w && yy >= y && yy < y + h && Q(g, xx, yy)) P1(g, xx, yy, ((xx >> 2) + (yy >> 2)) & 1 ? BRK[1] : BRK[2]); });
  }
}

/* ======================== BODEGA DEL CERRO ======================== */
regArch('bodegaCerro', function (f) {
  var c = mk(f), g = c.g, W = c.W, H = c.H, r = c.r, dmg = c.dmg, i, j;
  var A = paintRamp(c.color || 'amarillo', dmg), A2 = accentRamp(c, c.color), name = c.name || BODEGA_NAMES[c.seed % BODEGA_NAMES.length];
  if (A === WD) A = paintRamp('amarillo', dmg);
  var sc = SIGN_COLORS[c.seed % SIGN_COLORS.length];
  var flat = c.seed % 3 === 0;
  if (c.side === 'S') {
    if (flat) { losa(g, 0, 0, W, H, r, dmg); F(g, 0, 0, W, 2, CN[4]); brickFill(g, 0, 2, W, 4, r); F(g, 0, 6, W, 1, CN[1]); T(g, 0, 7, W, 3, AO2); }
    else { calamina(g, 0, 0, W, H, { r: r, dmg: dmg }); F(g, 0, 0, W, 1, '#2a2a30'); F(g, 0, 1, W, 2, '#cfd1c8'); F(g, 0, 3, W, 2, MT[1]); T(g, 0, 5, W, 2, AO2); scatterStones(g, 2, 8, W - 4, H - 10, Math.max(2, (W * H / 480) | 0), r); }
    F(g, 0, H - 2, W, 2, '#3a3040'); F(g, 0, 0, 1, H, '#2a2a30'); F(g, W - 1, 0, 1, H, '#2a2a30');
    var nm = roofNames(c, ['tanque'], ['rebar', 'bricks', 'table', 'chair', 'clothesline']);
    var sbw = Math.min(W - 12, 76), sbh = 15, sbx = (W - sbw) >> 1, sby = Math.max(12, H - sbh - 10);
    placeRoof(c, g, nm, 4, 8, W - 4, Math.max(14, sby - 2), {});
    palo(g, sbx + 4, sby + sbh - 1, 2, 7, r); palo(g, sbx + sbw - 6, sby + sbh - 1, 2, 7, r);       // letrero sobre la azotea, mira al sur
    F(g, sbx - 1, sby - 1, sbw + 2, sbh + 2, K); handSign(g, name, sbx, sby, sbw, sbh, sc, r);
    T(g, sbx + 2, sby + sbh + 6, sbw, 2, AO2);
    return done(c);
  }
  var fh = faceH(c, 48), faceY = H - fh, roofH = faceY, wallTop;
  if (roofH > 0) {
    if (flat) {
      losa(g, 0, 0, W, roofH, r, dmg); F(g, 0, 0, W, 1, CN[0]); F(g, 0, 1, W, 2, CN[4]); F(g, 0, 3, W, 1, CN[1]); T(g, 0, 4, W, 3, AO2);
      var nm1 = roofNames(c, ['tanque'], ['rebar']); placeRoof(c, g, nm1, 4, 6, W - 4, roofH - 3, {});
    } else {
      calamina(g, 0, 0, W, roofH, { r: r, dmg: dmg }); F(g, 0, 0, W, 1, '#2a2a30'); F(g, 0, 1, W, 2, '#cfd1c8'); F(g, 0, 3, W, 2, MT[1]); T(g, 0, 5, W, 2, AO2);
      scatterStones(g, 2, 6, W - 4, roofH - 8, Math.max(2, (W * roofH / 520) | 0), r);
      var nm2 = roofNames(c, [], ['rebar', 'bricks', 'table', 'chair']); if (nm2.length) placeRoof(c, g, nm2, 4, 8, W - 4, roofH - 3, {});
    }
  }
  wallTop = faceY + 5;
  F(g, 0, faceY, W, fh, A[2]);
  for (i = 0; i < W * fh / 40; i++) P1(g, (r() * W) | 0, faceY + 5 + ((r() * (fh - 5)) | 0), r() < 0.5 ? A[1] : A[3]);
  F(g, 0, faceY + 5, 1, fh - 5, A[3]); F(g, W - 1, faceY + 5, 1, fh - 5, A[1]);
  exposeBrick(g, 0, wallTop, W, fh - 5, r, dmg);
  wearPaint(g, 0, wallTop, W, fh - 5, r, dmg, WD);
  // zócalo pintado (franja más oscura) y base
  F(g, 0, H - 9, W, 9, A2[2]); F(g, 0, H - 9, W, 1, A2[3]); F(g, 0, H - 1, W, 1, A2[0]); T(g, 0, H - 5, W, 4, AO1);
  for (i = 0; i < W / 6; i++) P1(g, (r() * W) | 0, H - 8 + ((r() * 7) | 0), A2[1]);
  // letrero pintado a mano en la parte alta
  var sbw2 = W - 10, sbx2 = 5; handSign(g, name, sbx2, wallTop, sbw2, 13, sc, r);
  // ventanilla de atención con reja (izquierda) y puerta de fierro (derecha)
  var cw = clamp(Math.round(W * 0.4), 26, 42), cx0 = 5, cy0 = H - 28, ch0 = 16, ok = true;
  F(g, cx0 - 1, cy0 - 1, cw + 2, ch0 + 1, K);
  F(g, cx0, cy0, cw, ch0, '#1d1a1f');
  F(g, cx0, cy0, cw, 2, '#33303a');
  for (j = 0; j < 2; j++) {                                           // anaqueles con productos
    var sy = cy0 + 3 + j * 6;
    F(g, cx0, sy + 3, cw, 1, WD[2]);
    for (i = 1; i < cw - 3; i += ri(r, 3, 5)) { var pc = pick(r, ['#c42b26', '#e0b13a', '#2f6fb5', '#f3efe2', '#d83c7a', '#3f7266', '#d4583a']); F(g, cx0 + i, sy + 3 - ri(r, 2, 3), 2 + (r() < 0.4 ? 1 : 0), 3, pc); P1(g, cx0 + i, sy + 3 - 3, lt(pc, 0.4)); }
  }
  for (i = 2; i < cw - 4; i += 5) { var sc2 = pick(r, ['#c42b26', '#e0b13a', '#2f6fb5', '#d83c7a']), sl = ri(r, 3, 5); for (j = 0; j < sl; j++) F(g, cx0 + i, cy0 + 2 + j, 2, 1, j % 2 ? sc2 : lt(sc2, 0.3)); P1(g, cx0 + i, cy0 + 1, '#cfd3cc'); }   // sachets colgados
  var rejaC = [K, '#2a2a30', A2[1], A2[2], A2[3]];
  for (i = cx0 + 2; i < cx0 + cw - 1; i += 3) F(g, i, cy0, 1, ch0, rejaC[2]);
  F(g, cx0, cy0 + (ch0 >> 1), cw, 1, rejaC[2]); F(g, cx0, cy0, cw, 1, rejaC[3]);
  F(g, cx0 - 2, cy0 + ch0, cw + 4, 3, CN[3]); F(g, cx0 - 2, cy0 + ch0, cw + 4, 1, CN[4]); F(g, cx0 - 2, cy0 + ch0 + 2, cw + 4, 1, CN[1]);   // mostrador
  for (i = 2; i < cw - 4; i += ri(r, 8, 12)) { var bt = pick(r, ['#3f7266', '#6b4223', '#c8222c']); F(g, cx0 + i, cy0 + ch0 - 5, 2, 5, bt); P1(g, cx0 + i, cy0 + ch0 - 5, lt(bt, 0.4)); }
  if (c.seed % 2 === 0 || c.has('luz')) { F(g, cx0 + 1, cy0 + 2, cw - 2, ch0 - 3, '#e8c26a'); for (i = cx0 + 2; i < cx0 + cw - 1; i += 3) F(g, i, cy0, 1, ch0, rejaC[2]); F(g, cx0, cy0 + (ch0 >> 1), cw, 1, rejaC[2]); c.lights.push({ x: cx0 + (cw >> 1), y: cy0 + 8, kind: 'local' }); }
  var dw = 14, dx = W - dw - 6;
  if (dx < cx0 + cw + 6) { dx = cx0 + cw + 4; }
  doorIron(g, dx, H - 30, dw, 29, A2, { dmg: dmg, seed: c.seed });
  // aviso de gaseosa entre la ventanilla y la puerta
  var gap = dx - (cx0 + cw + 2);
  if (gap >= 14) {
    var aw = Math.min(24, gap - 2), ax = cx0 + cw + 2 + ((gap - aw) >> 1), brand = ['incakola', 'bigcola', 'kolareal'][c.seed % 3];
    marcaAd(g, ax, H - 27, aw, 11, brand, r);
  }
  // pie: peldaño, jabas, balones
  F(g, dx - 2, H - 5, dw + 4, 5, CN[2]); F(g, dx - 2, H - 5, dw + 4, 1, CN[4]); F(g, dx - 2, H - 1, dw + 4, 1, CN[0]);
  var items = c.front.slice(); if (!items.length) items = ['jabas'];
  items.forEach(function (it, k) {
    if (it === 'jabas') jabas(g, k % 2 ? cx0 + cw + 3 : Math.min(W - 16, cx0 + cw + 2), H - 1, r);
    else if (it === 'gas' && px.roofKit && px.roofKit.gas) { px.roofKit.gas(g, dx - 5, H - 1, {}); px.roofKit.gas(g, dx - 11, H - 1, { color: 'azul' }); }
    else if (it === 'macetas') { pot(g, dx + dw + 4 > W - 4 ? dx - 4 : dx + dw + 4, H - 1, c.r2); }
    else if (it === 'balde') bucket(g, dx - 4, H - 1, '#e8e4dc');
  });
  if (c.has('bandera') && roofH >= 18) plantPole(g, W - 8, faceY + 4, Math.min(30, roofH + 4), true);
  // alero
  if (flat) { F(g, 0, faceY, W, 4, CN[3]); F(g, 0, faceY, W, 1, CN[4]); F(g, 0, faceY + 3, W, 1, CN[1]); F(g, 0, faceY + 4, W, 1, CN[0]); }
  else { F(g, 0, faceY, W, 2, '#cfd1c8'); F(g, 0, faceY + 2, W, 2, MT[2]); F(g, 0, faceY + 4, W, 1, '#2f2e34'); }
  T(g, 0, wallTop, W, 2, AO3);
  // capa alta: toldo de lona sobre la ventanilla y banderas
  if (c.has('toldo') || c.has('bandera')) {
    mkOver(c, H - 40, 64);
    var go = c.go;
    if (c.has('toldo')) {
      var tcols = pick(c.r2, [['#c42b26', '#efe9dc'], ['#2f6fb5', '#efe9dc'], ['#d8a84a', '#efe9dc'], ['#3f7266', '#efe9dc']]);
      awningLona(go, cx0 - 2, H - 30 - c.oy, cw + 4, tcols, c.r2);
      c.lights.push({ x: cx0 + (cw >> 1), y: H - 22, kind: 'foco' });
    }
  }
  return done(c);
});

/* ======================== OLLA COMÚN ======================== */
var RED = ['#6a1f1c', '#8f2a25', '#b83a2c', '#d4584a', '#e88a78'];
function ollaPot(g, cx, by, w, r, lid) {                              // olla negra grande (cx, by = centro de la base)
  var x0 = cx - (w >> 1), h = Math.round(w * 0.72), i, j;
  for (j = 0; j < h; j++) {
    var u = j / (h - 1), ww = w - (j < 2 ? 2 : 0) - (j > h - 3 ? 2 : 0);
    var xx = cx - (ww >> 1);
    F(g, xx, by - h + j, ww, 1, '#1b1b21');
    F(g, xx + 1, by - h + j, 2, 1, '#3a3a46'); if (ww > 8) P1(g, xx + 3, by - h + j, '#2a2a33');
    P1(g, xx + ww - 1, by - h + j, '#0e0e12');
  }
  F(g, x0 - 1, by - h, w + 2, 2, '#4a4a58'); F(g, x0, by - h, w, 1, '#7a7a8a');                  // borde
  F(g, x0 - 3, by - h + 2, 3, 2, '#14141a'); F(g, x0 + w, by - h + 2, 3, 2, '#14141a');             // asas
  if (lid) { F(g, cx - 3, by - h - 2, 7, 2, '#5c5c68'); P1(g, cx, by - h - 3, '#8a8a98'); }
  else { F(g, x0 + 1, by - h - 1, w - 2, 2, '#c4a672'); F(g, x0 + 2, by - h - 1, w - 5, 1, '#e8c890'); }   // guiso asomando
}
regArch('ollaComun', function (f) {
  var c = mk(f), g = c.g, W = c.W, H = c.H, r = c.r, dmg = c.dmg, i, j;
  var name = c.name || OLLA_NAMES[c.seed % OLLA_NAMES.length];
  function canvasRoof(y0, h) {                                        // carpas vistas desde arriba: lona roja con costuras cosidas, arrugas, un parche y sogas
    var k, seam = 26 + (c.seed % 3) * 2;
    F(g, 0, y0, W, h, RED[2]);
    for (k = 6; k < W - 4; k += seam) { F(g, k, y0, 1, h, RED[1]); F(g, k + 1, y0, 1, h, RED[3]); for (j = y0 + 2; j < y0 + h; j += 4) P1(g, k + 1, j, '#e8d8c0'); }
    for (k = 0; k < W * h / 140; k++) {                               // arrugas largas y suaves
      var wx = (r() * W) | 0, wy = y0 + ((r() * h) | 0), ln = ri(r, 4, 9), dir = r() < 0.5 ? 1 : -1, lite = r() < 0.5;
      for (j = 0; j < ln; j++) { var xx = wx + dir * (j >> 1), yy = wy + j; if (yy < y0 + h) P1(g, xx, yy, lite ? RED[3] : RED[1]); }
    }
    for (k = 0; k < W * h / 400; k++) { var sx = (r() * W) | 0, sy = y0 + ((r() * h) | 0); F(g, sx, sy, ri(r, 3, 6), 1, RED[3]); }
    if (dmg >= 2) { var pw = ri(r, 10, 16), pxx = ri(r, 10, Math.max(11, W - pw - 10)), pyy = y0 + ri(r, 4, Math.max(5, h - 12)); F(g, pxx, pyy, pw, 7, '#3f6aa6'); F(g, pxx, pyy, pw, 1, '#8aaed4'); F(g, pxx + pw - 1, pyy, 1, 7, '#2d4f82'); for (k = 2; k < 7; k += 3) F(g, pxx + 2, pyy + k, pw - 4, 1, '#5a86bc'); }
    F(g, 0, y0, W, 2, RED[0]); F(g, 0, y0 + 2, W, 1, RED[3]);        // cumbrera
    T(g, 0, y0 + 3, W, 3, AO1);
    for (k = 3; k < W - 3; k += ri(r, 20, 30)) { stone(g, k, y0 + h - ri(r, 2, 4), 2, 1); }
  }
  var fh = faceH(c, 48), faceY = H - fh;
  if (c.side === 'S') {
    canvasRoof(0, H);
    F(g, 0, H - 2, W, 2, RED[0]); F(g, 0, 0, 1, H, RED[0]); F(g, W - 1, 0, 1, H, RED[0]);
    var bw = Math.min(W - 16, 84), bh = 18, bx = (W - bw) >> 1, by = Math.max(10, (H >> 1) - 6);
    palo(g, bx + 6, by + bh - 1, 2, 6, r); palo(g, bx + bw - 8, by + bh - 1, 2, 6, r);
    F(g, bx - 1, by - 1, bw + 2, bh + 2, K); F(g, bx, by, bw, bh, '#e8872a'); frame(g, bx, by, bw, bh, '#c06a1a');
    handLetters(g, 'OLLA COMÚN', bx + ((bw - px.measure('OLLA COMÚN', 'a7')) >> 1), by + 4, 'a7', '#2f5fb4', null, r, true);
    var nmx = name; while (nmx.length > 3 && px.measure(nmx, 'a5') > bw - 4) nmx = nmx.slice(0, -1);
    px.text(g, nmx, bx + ((bw - px.measure(nmx, 'a5')) >> 1), by + 12, { font: 'a5', ink: '#2f5fb4' });
    tubo(g, W - 14, H - 10, 11, r);
    placeRoof(c, g, ['bidones', 'llantas'].filter(function (n, k) { return (c.seed + k) % 3 === 0; }), 4, 6, W - 4, 22, {});
    c.lights.push({ x: W >> 1, y: H - 6, kind: 'foco' });
    return done(c);
  }
  // ---- lado N: el frente abierto de la carpa es la «cara» ----
  if (faceY > 0) canvasRoof(0, faceY);
  F(g, 0, faceY, W, fh, '#cfc6b0');
  var inTop = faceY + 8;
  for (j = inTop; j < H; j += 5) { F(g, 0, j, W, 1, '#b3a994'); for (i = ((j - inTop) / 5 | 0) % 2 ? 0 : 8; i < W; i += 16) F(g, i, j, 1, 5, '#b3a994'); }
  T(g, 0, inTop, W, 7, AO2); T(g, 0, inTop + 7, W, 7, AO1); T(g, 0, H - 22, W, 22, AO1);
  // mesa larga con mantel y tapers (al fondo)
  var ty = H - 22;
  F(g, 2, ty, W - 4, 3, '#efe9dc'); F(g, 2, ty, W - 4, 1, '#ffffff'); F(g, 2, ty + 3, W - 4, 5, '#d8d4c4'); F(g, 2, ty + 7, W - 4, 1, '#a8a396'); T(g, 2, ty + 8, W - 4, 2, AO3);
  for (i = 8; i < W - 12; i += ri(r, 14, 22)) { var kc = pick(r, ['#3f6aa6', '#d8a84a', '#c42b26', '#e8e4dc', '#3f7266']); F(g, i, ty - 4, 6, 4, kc); F(g, i, ty - 4, 6, 1, lt(kc, 0.35)); F(g, i + 5, ty - 4, 1, 4, dk(kc, 0.3)); if (r() < 0.5) F(g, i + 1, ty - 7, 4, 3, lt(kc, 0.15)); }
  // cucharones y cacerolas colgando bajo el volado
  for (i = 14; i < W - 10; i += ri(r, 22, 34)) { F(g, i, inTop + 2, 1, 6, '#8a7766'); F(g, i - 1, inTop + 8, 3, 2, '#b88b5e'); }
  // fogones con ollas
  var nf = clamp(Math.floor(W / 40), 2, 4), fx = [], fireLights = [];
  for (i = 0; i < nf; i++) fx.push(Math.round(26 + i * (W - 52) / (nf - 1)));
  fx.forEach(function (cx, k) {
    var by = H - 8;
    F(g, cx - 10, by - 6, 4, 6, '#8a4b38'); F(g, cx + 6, by - 6, 4, 6, '#8a4b38'); F(g, cx - 10, by - 6, 20, 1, '#a86a50'); F(g, cx - 10, by - 6, 4, 1, '#c08a68');
    F(g, cx - 7, by - 5, 14, 5, '#1c1418'); F(g, cx - 5, by - 3, 10, 3, '#ff9a3a'); F(g, cx - 3, by - 2, 6, 2, '#ffd060'); P1(g, cx, by - 4, '#ff6a20'); P1(g, cx - 4, by - 4, '#ff6a20');
    for (var q = 0; q < 3; q++) F(g, cx - 9 + q * 3, by - 1, 3, 1, '#6b4223');
    ollaPot(g, cx, by - 6, 15 + (k % 2) * 2, r, k % 2 === 0);
    c.lights.push({ x: cx, y: by - 2, kind: 'foco' });
    fireLights.push([cx, by - 2]);
  });
  var lx = Math.round((fx[0] + fx[1]) / 2) - 5;
  for (j = 0; j < 4; j++) { F(g, lx, H - 13 + j * 3, 10, 2, j % 2 ? '#7a4a28' : '#8a5a38'); F(g, lx + 8, H - 13 + j * 3, 2, 2, '#c4a672'); }
  // postes de la carpa
  var pxs = [1, W - 4]; for (i = 44; i < W - 30; i += 52) pxs.push(i);
  pxs.forEach(function (pxx) { F(g, pxx, faceY + 8, 3, fh - 14, '#8a8c94'); F(g, pxx, faceY + 8, 1, fh - 14, '#cfd3cc'); F(g, pxx + 2, faceY + 8, 1, fh - 14, '#4a4d58'); F(g, pxx - 1, H - 8, 5, 2, '#6a6d78'); });
  // volado frontal de la carpa
  F(g, 0, faceY, W, 8, RED[2]); F(g, 0, faceY, W, 1, RED[3]); F(g, 0, faceY + 6, W, 2, RED[1]);
  for (i = 0; i < W; i += 6) { F(g, i, faceY + 8, 3, 1, RED[1]); F(g, i + 3, faceY + 8, 3, 1, '#efe9dc'); P1(g, i + 1, faceY + 9, RED[0]); P1(g, i + 4, faceY + 9, '#a8a396'); }
  for (i = 0; i < W; i += 6) F(g, i, faceY + 3, 1, 4, RED[3]);
  T(g, 0, faceY + 10, W, 2, AO3);
  // cartel pintado: cuelga del volado, naranja con letras azules
  var bw2 = Math.min(W - 16, 92), bh2 = 18, bx2 = (W - bw2) >> 1, by2 = faceY + 1;
  F(g, bx2 + 6, by2 - 1, 1, 3, '#3a2c22'); F(g, bx2 + bw2 - 7, by2 - 1, 1, 3, '#3a2c22');
  F(g, bx2 - 1, by2 - 1, bw2 + 2, bh2 + 2, K); F(g, bx2, by2, bw2, bh2, '#e8872a'); F(g, bx2, by2, bw2, 1, '#f0a050'); F(g, bx2, by2 + bh2 - 1, bw2, 1, '#c06a1a'); F(g, bx2 + bw2 - 1, by2, 1, bh2, '#c06a1a');
  T(g, bx2, by2 + bh2 + 1, bw2, 3, AO3);
  var t1 = 'OLLA COMÚN', f1 = px.measure(t1, 'a7') <= bw2 - 4 ? 'a7' : 'a5', w1 = px.measure(t1, f1);
  handLetters(g, t1, bx2 + ((bw2 - w1) >> 1), by2 + 3 + (f1 === 'a7' ? 1 : 0), f1, '#2f5fb4', null, r, true);
  var nm3 = name; while (nm3.length > 3 && px.measure(nm3, 'a5') > bw2 - 4) nm3 = nm3.slice(0, -1);
  px.text(g, nm3, bx2 + ((bw2 - px.measure(nm3, 'a5')) >> 1), by2 + bh2 - 7, { font: 'a5', ink: '#2f5fb4' });
  // plataforma de cemento y baranda azul en los extremos
  F(g, 0, H - 6, W, 6, CN[3]); F(g, 0, H - 6, W, 1, CN[4]); F(g, 0, H - 2, W, 2, CN[1]); F(g, 0, H - 1, W, 1, CN[0]);
  for (i = 0; i < W / 4; i++) P1(g, (r() * W) | 0, H - 5 + ((r() * 3) | 0), r() < 0.5 ? CN[2] : CN[4]);
  [[3, 9], [W - 12, 9]].forEach(function (sg) {
    var x0 = sg[0], w0 = sg[1];
    F(g, x0, H - 15, w0, 2, '#2f5fb4'); F(g, x0, H - 15, w0, 1, '#4a7fd0'); F(g, x0, H - 10, w0, 1, '#2f5fb4');
    F(g, x0, H - 15, 2, 9, '#2f5fb4'); F(g, x0, H - 15, 1, 9, '#4a7fd0'); F(g, x0 + w0 - 2, H - 15, 2, 9, '#2f5fb4');
  });
  if (c.has('macetas')) pot(g, W - 20, H - 6, c.r2);
  // capa alta: humo de las ollas
  mkOver(c, 0, H);
  var go = c.go, sm = ['#f0ece6c0', '#e0dcd4b0', '#d0ccc4a0', '#c0bcb490', '#b0aca480'];
  fireLights.forEach(function (fl, k) {
    var sx = fl[0] + (k % 2 ? 2 : -1), sy = fl[1] - 18;
    for (j = 0; j < 7; j++) {
      var rr = 1 + ((j + 1) >> 1), px0 = sx + Math.round(Math.sin(j * 1.3 + k) * 2.5), py0 = sy - j * 4;
      var col = sm[Math.min(sm.length - 1, (j / 1.4) | 0)];
      for (var yy = -rr; yy <= rr; yy++) for (var xx = -rr; xx <= rr; xx++) if (xx * xx + yy * yy <= rr * rr + 0.5 && ((xx + yy + j) & 1) === 0) P1(go, px0 + xx, py0 + yy, col);
    }
  });
  return done(c);
});

/* ======================== LOSA DEPORTIVA ======================== */
var SLAB = ['#8f877a', '#a79e8f', '#b9b1a3', '#cdc6b8'];
var YEL = ['#8a6e1c', '#b8921f', '#e3b82a', '#f2d062'];
var LINE = '#e8e4dc';
function dashLine(g, x0, y0, x1, y1, r, gaps) {                       // línea de cancha pintada, con tramos gastados
  var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) + 1, i;
  for (i = 0; i <= n; i++) {
    var x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
    if (gaps && ((i / 7) | 0) % 5 === 2 && r() < 0.5) continue;
    P1(g, x, y, r() < 0.12 ? SLAB[3] : LINE);
  }
}
function goalFrame(g, gx, y1, y2, dir, h) {                           // arco de fierro visto de costado: marco delantero, marco trasero más bajo, travesaños y red
  var pad = 10, sw = pad * 2 + 1, sh = (y2 - y1) + h + 8, ox = pad, oy = h + 3, t = new G(sw, sh), i, j, d = 6, bh = h - 4;
  function vline(x, ya, yb, c) { F(t, x, ya, 1, yb - ya + 1, c); }
  // marco trasero (más lejos de la cancha, más bajo por la perspectiva)
  var bx = ox + dir * d;
  [0, y2 - y1].forEach(function (dy) { vline(bx, oy + dy - bh, oy + dy, '#a8a396'); });
  vline(bx, oy - bh, oy + (y2 - y1) - bh, '#a8a396');
  // largueros que unen delante y atrás (arriba y abajo)
  [0, y2 - y1].forEach(function (dy) { for (i = 0; i <= d; i++) { P1(t, ox + dir * i, oy + dy - h + Math.round((h - bh) * i / d), '#cfcac0'); P1(t, ox + dir * i, oy + dy, '#8a867e'); } });
  // marco delantero: postes y travesaño
  [0, y2 - y1].forEach(function (dy) { F(t, ox, oy + dy - h, 2, h + 1, '#f0eee8'); F(t, ox + (dir > 0 ? 1 : 0), oy + dy - h, 1, h + 1, '#9a968c'); for (i = 4; i < h; i += 6) P1(t, ox, oy + dy - h + i, RU[2]); });
  vline(ox, oy - h, oy + (y2 - y1) - h, '#f0eee8'); vline(ox + (dir > 0 ? 1 : -1), oy - h, oy + (y2 - y1) - h, '#7a766c');
  t.outline('#2a2a30');
  // red: puntos claros entre los dos marcos
  for (j = oy - h + 1; j < oy + (y2 - y1) - bh; j += 2) for (i = 1; i < d; i++) if (((i + j) & 3) === 0) P1(t, ox + dir * i, j + Math.round((h - bh) * i / d), '#e0dcd4');
  g.blit(t, gx - ox, y1 - oy);
}
function barandaH(g, x, y, w, up, gapX, gapW) {                       // baranda amarilla horizontal: postes de 2 px cada 16 y dos pasamanos (y = base)
  var i;
  for (i = 0; i < w; i++) {
    var xx = x + i; if (gapW && xx >= gapX && xx < gapX + gapW) continue;
    F(g, xx, y - up, 1, 2, YEL[2]); P1(g, xx, y - up, YEL[3]); F(g, xx, y - (up >> 1), 1, 1, YEL[1]);
  }
  for (i = 0; i < w; i += 16) { var px_ = x + i; if (gapW && px_ + 2 >= gapX && px_ < gapX + gapW) continue; F(g, px_, y - up, 2, up + 1, YEL[2]); F(g, px_, y - up, 1, up + 1, YEL[3]); F(g, px_ + 1, y - up, 1, up + 1, YEL[1]); }
}
regArch('losaDeportiva', function (f) {
  var c = mk(f), g = c.g, W = c.W, H = c.H, r = c.r, dmg = c.dmg, i, j, north = c.side === 'S';
  var backH = north ? 10 : 20, frontH = north ? 14 : 14;               // N: tribuna arriba y bordillo con baranda abajo; S: baranda al norte (arriba), gradas al sur
  // ---- piso de cemento ----
  F(g, 0, 0, W, H, SLAB[2]);
  for (i = 0; i < W * H / 320; i++) { var bx = (r() * W) | 0, by = (r() * H) | 0, tn = r() < 0.5 ? SLAB[1] : SLAB[3]; blob(bx, by, ri(r, 5, 12), ri(r, 3, 7), r, function (xx, yy) { if (xx >= 0 && xx < W && yy >= 0 && yy < H && ((xx + yy) & 1) === 0) P1(g, xx, yy, tn); }); }
  for (i = 0; i < W * H / 100; i++) P1(g, (r() * W) | 0, (r() * H) | 0, r() < 0.5 ? SLAB[1] : SLAB[3]);
  for (i = 0; i < (W * H / 2600) * (0.6 + dmg * 0.5); i++) { var cx0 = 6 + ((r() * (W - 12)) | 0), cy0 = 20 + ((r() * Math.max(1, H - 40)) | 0), dir = 1, len = ri(r, 8, 22); for (j = 0; j < len; j++) { P1(g, cx0, cy0, SLAB[0]); var rr = r(); if (rr < 0.5) cx0 += dir; else if (rr < 0.62) dir = -dir; else cy0++; } }
  for (i = 0; i < W * H / 3000; i++) { var sx = ((r() * (W - 10)) | 0), sy = ((r() * (H - 6)) | 0); F(g, sx, sy, ri(r, 5, 10), ri(r, 2, 3), tinter('#3f3a30', 0.3)(SLAB[2])); }
  // ---- cancha: líneas blancas ----
  var fy0 = north ? frontH + 2 : backH + 2, fy1 = north ? H - 12 : H - frontH - 16;
  var x0 = 16, x1 = W - 16, y0 = fy0 + 4, y1 = fy1 - 2, cy = (y0 + y1) >> 1, ch = y1 - y0;
  if (ch >= 20 && x1 - x0 >= 50) {
    dashLine(g, x0, y0, x1, y0, r, true); dashLine(g, x0, y1, x1, y1, r, true); dashLine(g, x0, y0, x0, y1, r, true); dashLine(g, x1, y0, x1, y1, r, true);
    dashLine(g, W >> 1, y0, W >> 1, y1, r, true);
    var cr = Math.min(11, (ch * 0.22) | 0), a;
    for (a = 0; a < 64; a++) { var an = a / 64 * Math.PI * 2; if (((a / 6) | 0) % 6 === 3 && r() < 0.4) continue; P1(g, (W >> 1) + Math.round(Math.cos(an) * cr), cy + Math.round(Math.sin(an) * cr), LINE); }
    P1(g, W >> 1, cy, LINE); P1(g, (W >> 1) + 1, cy, LINE);
    var bw = Math.round((x1 - x0) * 0.15), bh = Math.round(ch * 0.55), by0 = cy - (bh >> 1);
    dashLine(g, x0, by0, x0 + bw, by0, r, true); dashLine(g, x0, by0 + bh, x0 + bw, by0 + bh, r, true); dashLine(g, x0 + bw, by0, x0 + bw, by0 + bh, r, true);
    dashLine(g, x1, by0, x1 - bw, by0, r, true); dashLine(g, x1, by0 + bh, x1 - bw, by0 + bh, r, true); dashLine(g, x1 - bw, by0, x1 - bw, by0 + bh, r, true);
    F(g, x0 + (bw >> 1), cy, 1, 1, LINE); F(g, x1 - (bw >> 1), cy, 1, 1, LINE);
    var gh = Math.min(13, (ch * 0.22) | 0);
    goalFrame(g, x0 - 2, cy - gh, cy + gh, -1, 20); goalFrame(g, x1 + 2, cy - gh, cy + gh, 1, 20);
    // un balón olvidado
    var bxx = ri(r, x0 + 12, x1 - 14), byy = ri(r, y0 + 6, y1 - 6); F(g, bxx, byy, 4, 4, '#e8e4dc'); F(g, bxx + 1, byy + 1, 2, 2, '#2a2a30'); P1(g, bxx, byy, '#fff'); F(g, bxx + 1, byy + 4, 4, 1, '#3a3446');
  }
  // ---- bandas de borde ----
  if (!north) {
    // tribunita de cemento (izquierda) y muro de contención pintado (derecha)
    var tw = Math.round(W * (0.5 + (c.seed % 3) * 0.06)), tx = (c.seed % 2) ? 0 : W - tw;
    for (j = 0; j < 3; j++) {
      var sy2 = j * 6;
      F(g, tx, sy2, tw, 2, '#d8d1c3'); F(g, tx, sy2 + 2, tw, 4, SLAB[1]); F(g, tx, sy2 + 5, tw, 1, SLAB[0]); F(g, tx, sy2, tw, 1, '#ece7da');
      for (i = 0; i < tw / 18; i++) P1(g, tx + ((r() * tw) | 0), sy2 + 3, SLAB[0]);
    }
    F(g, tx, 18, tw, 2, SLAB[0]); T(g, tx, 20, tw, 2, AO1);
    F(g, tx > 0 ? tx - 3 : tx + tw, 0, 3, 18, SLAB[1]);
    var wx = tx > 0 ? 0 : tw, ww = W - tw;
    F(g, wx, 0, ww, backH, CN[2]); F(g, wx, 0, ww, 2, CN[4]); F(g, wx, 2, ww, 1, CN[3]);
    for (i = 0; i < ww * backH / 18; i++) P1(g, wx + ((r() * ww) | 0), 3 + ((r() * (backH - 4)) | 0), r() < 0.5 ? CN[1] : CN[3]);
    F(g, wx, 8, ww, 3, '#2f5fb4'); F(g, wx, 8, ww, 1, '#4a7fd0'); F(g, wx, 14, ww, 2, YEL[2]);
    T(g, wx, backH, ww, 2, AO1);
    // bordillo frontal y baranda amarilla con una entrada de dos peldaños
    var gapX = Math.round(W * (0.58 + (c.seed % 3) * 0.08)), gapW = 24;
    F(g, 0, H - frontH, W, frontH, CN[2]); F(g, 0, H - frontH, W, 3, YEL[2]); F(g, 0, H - frontH, W, 1, YEL[3]); F(g, 0, H - frontH + 3, W, 1, YEL[0]);
    for (i = 0; i < W * frontH / 20; i++) P1(g, (r() * W) | 0, H - frontH + 4 + ((r() * (frontH - 5)) | 0), r() < 0.5 ? CN[1] : CN[3]);
    F(g, 0, H - 1, W, 1, CN[0]); T(g, 0, H - 4, W, 3, AO1);
    F(g, gapX, H - frontH, gapW, frontH, SLAB[3]); F(g, gapX, H - frontH, gapW, 1, '#ece7da'); F(g, gapX, H - 8, gapW, 1, SLAB[1]); F(g, gapX, H - 7, gapW, 5, SLAB[2]); F(g, gapX, H - 2, gapW, 1, SLAB[0]);
    barandaH(g, 0, H - frontH, W, 13, gapX, gapW);
    F(g, 0, fy0, 2, H - frontH - fy0, YEL[2]); F(g, 0, fy0, 1, H - frontH - fy0, YEL[3]); F(g, W - 2, fy0, 2, H - frontH - fy0, YEL[2]); F(g, W - 1, fy0, 1, H - frontH - fy0, YEL[1]);
    for (j = fy0; j < H - frontH; j += 20) { F(g, 0, j, 4, 3, YEL[2]); F(g, W - 4, j, 4, 3, YEL[1]); }
    // bidones de agua alineados al borde
    var nd = 3 + (c.seed % 2), dxs = c.seed % 2 ? 12 : W - 12 - nd * 10;
    for (i = 0; i < nd; i++) drum(g, dxs + i * 10 + 4, H - frontH - 1, i === 1 && c.seed % 3 === 0 ? 'turquesa' : 'azul');
    c.lights.push({ x: tx + (tw >> 1), y: 6, kind: 'foco' }); c.lights.push({ x: W - 14, y: H - 22, kind: 'foco' });
  } else {
    // lado S: baranda al norte, gradas al sur
    F(g, 0, 0, W, 11, SLAB[3]); F(g, 0, 0, W, 2, CN[4]); F(g, 0, 11, W, 3, YEL[2]); F(g, 0, 11, W, 1, YEL[3]); F(g, 0, 14, W, 1, YEL[0]); T(g, 0, 15, W, 3, AO2);
    barandaH(g, 0, 11, W, 11, 0, 0);
    for (j = 0; j < 2; j++) { var gy = H - 12 + j * 6; F(g, 0, gy, W, 2, '#d8d1c3'); F(g, 0, gy + 2, W, 4, SLAB[1]); F(g, 0, gy + 5, W, 1, SLAB[0]); }
    F(g, 0, 15, 2, H - 27, YEL[2]); F(g, W - 2, 15, 2, H - 27, YEL[1]);
    var nd2 = 3, dxs2 = W - 12 - nd2 * 10;
    for (i = 0; i < nd2; i++) drum(g, dxs2 + i * 10 + 4, H - 14, 'azul');
    c.lights.push({ x: W >> 1, y: 20, kind: 'foco' });
  }
  return done(c);
});

/* ======================== CRUZ DE LA CIMA ======================== */
var WH = ['#8a867e', '#b9b4a9', '#e8e4dc', '#f0eeea', '#ffffff'];
function cruzGeom(f) {
  var W = (f.c1 - f.c0 + 1) * 16, H = (f.r1 - f.r0 + 1) * 16;
  var tw = W / 16, bw = Math.min(48, W), bx0 = 16 * Math.max(0, Math.floor((tw - 3) / 2)), rest = W - (bx0 + bw);
  var polX = rest >= 16 ? bx0 + bw + (rest >> 1) : Math.max(4, bx0 - 8);
  return { W: W, H: H, bx0: bx0, bw: bw, cx: bx0 + (bw >> 1), polX: polX, solidY0: H - 36 };
};
S.lotInfo = S.lotInfo || {};
S.lotInfo.cruzCima = function (f) { var g = cruzGeom(f); return { x0: g.bx0, x1: g.bx0 + g.bw, y0: g.solidY0, polX: g.polX, cx: g.cx }; };
regArch('cruzCima', function (f) {
  var c = mk(f), g = c.g, W = c.W, H = c.H, r = c.r, dmg = c.dmg, i, j, geo = cruzGeom(f), bx0 = geo.bx0, bw = geo.bw, cx = geo.cx;
  // ---- base de dos gradas y pedestal ----
  function block(x, y, w, topH, faceH_) {
    F(g, x, y, w, topH, WH[3]); F(g, x, y, w, 1, WH[4]); F(g, x, y + topH, w, faceH_, WH[2]); F(g, x, y + topH, w, 1, WH[3]);
    F(g, x, y, 1, topH + faceH_, WH[3]); F(g, x + w - 1, y, 1, topH + faceH_, WH[1]);
    F(g, x, y + topH + faceH_ - 1, w, 1, WH[0]); T(g, x, y + topH + faceH_ - 3, w, 2, AO1);
    for (var k = 0; k < w * faceH_ / 30; k++) P1(g, x + 1 + ((r() * (w - 2)) | 0), y + topH + 1 + ((r() * (faceH_ - 2)) | 0), r() < 0.6 ? WH[1] : WH[3]);
    for (k = 0; k < w / 6; k++) F(g, x + ((r() * w) | 0), y + topH + 1, 1, ri(r, 2, faceH_ - 2), '#cfc9bb');       // chorreras de lluvia
  }
  var yb = H;
  block(bx0, yb - 16, bw, 5, 11);
  block(bx0 + 8, yb - 26, bw - 16, 4, 6);
  block(cx - 9, yb - 36, 18, 3, 7);
  // placa
  F(g, cx - 6, yb - 31, 12, 6, '#3a3446'); frame(g, cx - 6, yb - 31, 12, 6, '#8a867e'); px.text(g, 'FE', cx - 3, yb - 30, { font: 'a5', ink: '#e8e4dc' });
  // ---- la cruz ----
  var shaftH = clamp(H - 36 - 6, 36, 66), top = yb - 36 - shaftH, armY = top + 9, armW = 37, armT = 7;
  function cross(x, y, w, h, f1) {
    F(g, x, y, w, h, WH[3]); F(g, x, y, 1, h, WH[4]); F(g, x + w - 1, y, 1, h, WH[1]); F(g, x + w - 2, y, 1, h, WH[2]);
  }
  F(g, cx - 3, top, 7, shaftH, WH[3]); F(g, cx - 3, top, 1, shaftH, WH[4]); F(g, cx + 3, top, 1, shaftH, WH[1]); F(g, cx + 2, top, 1, shaftH, WH[2]);
  F(g, cx - (armW >> 1), armY, armW, armT, WH[3]); F(g, cx - (armW >> 1), armY, armW, 1, WH[4]); F(g, cx - (armW >> 1), armY + armT - 1, armW, 1, WH[1]); F(g, cx - (armW >> 1), armY, 1, armT, WH[4]); F(g, cx + (armW >> 1), armY, 1, armT, WH[1]);
  F(g, cx - 3, top, 7, 1, WH[4]);
  F(g, cx - 3, armY + armT, 7, 1, WH[1]); F(g, cx - 3, armY + armT + 1, 1, 1, WH[2]);
  for (i = 0; i < 10; i++) F(g, cx - 2 + ((r() * 4) | 0), top + 2 + ((r() * (shaftH - 6)) | 0), 1, ri(r, 2, 6), '#d8d3c6');
  F(g, cx + 3, armY + armT, 1, 3, WH[0]);
  // ---- velas, flores y piedras al pie ----
  var vx = [bx0 + 5, bx0 + 9, bx0 + bw - 14];
  vx.forEach(function (x, k) {
    F(g, x, yb - 16 - 4, 2, 4, '#f3efe2'); P1(g, x, yb - 21, '#ffd060'); P1(g, x + (k % 2), yb - 22, '#ff9a3a'); P1(g, x, yb - 16 - 4, '#ffffff');
    c.lights.push({ x: x, y: yb - 21, kind: 'local' });
  });
  var fx = bx0 + bw - 8; F(g, fx - 2, yb - 21, 5, 4, '#8f3a32'); F(g, fx - 2, yb - 21, 5, 1, '#c8635a');
  [['#d83c7a', -2, -3], ['#e0b13a', 0, -5], ['#c8222c', 2, -3], ['#f3efe2', -1, -4], ['#d83c7a', 1, -6]].forEach(function (p) { P1(g, fx + p[1], yb - 21 + p[2], p[0]); P1(g, fx + p[1], yb - 21 + p[2] + 1, '#4a5a44'); });
  for (i = 0; i < 6; i++) stone(g, bx0 - 3 + ((r() * (bw + 6)) | 0), yb - 1, ri(r, 2, 3), ri(r, 1, 2));
  // ---- mástil con la bandera ----
  var ph = Math.min(H - 8, 100), px0 = geo.polX;
  for (i = 0; i < 5; i++) stone(g, px0 - 5 + i * 3, yb - 1 - (i % 2), ri(r, 2, 3), ri(r, 1, 2));
  palo(g, px0 - 1, yb - ph, 2, ph - 2, r); F(g, px0 - 1, yb - ph - 1, 2, 1, '#cdb98a'); P1(g, px0, yb - ph - 2, '#e6c85a');
  flagPe(g, px0 + 1, yb - ph + 1, 17, 11, true); F(g, px0 + 1, yb - ph, 1, 13, '#3a2c22');
  stone(g, px0 + 5, yb - 1, 2, 1); stone(g, px0 - 6, yb, 2, 1);
  // contorno oscuro de 1 px (es un objeto suelto, sobre la roca)
  g.outline(K);
  return done(c);
});

/* ======================== FIN ======================== */
})();
