/* ACHORADO - js/sprites/mobiliario.js  (v0.4, fase B)
 * Dueño: sprites (mobiliario)
 * Postes de concreto y de acero (con tops/lamp), cables, afiches, paradero, semaforo, quiosco, triciclo,
 * barrera, cono, arboles de berma, palmeras, vendedores, basura, rastros del apocalipsis y carteles.
 *
 * Propiedades extra que llevan los lienzos (todas RELATIVAS al ancla ax,ay, igual que top y smoke):
 *   top    {x,y}        punto de posada / centro de la cruceta alta (gallinazos)
 *   tops   [{x,y}...]   puntas de aisladores: de aqui deben salir los cables (3-4 por poste)
 *   lamp   {x,y}        centro de la luminaria (pastilla). lamps:[...] en los de dos brazos
 *   canopy {x,y,w,h}    rectangulo de la copa (esquina superior izquierda relativa al ancla) para el fundido
 *   smoke  {x,y}        origen del humo
 *   tall   true         silueta si tapa a un personaje
 *   shadowIn true       la sombra proyectada SE ya viene dibujada DENTRO del lienzo, bajo la fila ay
 *                       (el motor no debe hornear otra para este prop)
 * Se carga despues de js/sprites.js y antes del motor. Usa ACH.px (base.js) y extiende ACH.sprites.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px;
var S = ACH.sprites;
var G = px.G, RP = px.RAMPS, PAL = px.PAL, rng = px.rng, mix = px.mix;
var props = S.props = S.props || {};
var decals = S.decals = S.decals || {};

/* ============================ HERRAMIENTAS ============================ */
var K = '#1c1a22';                  // contorno general
var CAB = '#17151b', CAB2 = '#2b2833', CAB3 = '#4a4756';     // cables: negro, negro violaceo, telecom claro
var NEON = { pink: '#e8388a', yellow: '#f2e63c', green: '#5fe04a', orange: '#ff8a2a', cyan: '#38c8e8' };
var CONC = { hi: '#cbc7b6', lt: '#aeab9d', bs: '#8a8884', sh: '#66656b', dp: '#4b4957' };
var DARKER = { '#cbc7b6': '#aeab9d', '#aeab9d': '#8a8884', '#8a8884': '#66656b', '#66656b': '#4b4957', '#4b4957': '#3a3846' };
var LIGHTER = { '#aeab9d': '#cbc7b6', '#8a8884': '#aeab9d', '#66656b': '#8a8884', '#4b4957': '#66656b' };

/* Rasteriza un arco cuadratico de (x0,y0) a (x1,y1) con comba `sag` hacia abajo. */
function curve(g, x0, y0, x1, y1, sag, c, onlyEmpty) {
  var n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0) + Math.abs(sag)) * 1.6) + 2;
  var mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag * 2;
  for (var i = 0; i <= n; i++) {
    var t = i / n, u = 1 - t, x = Math.round(u * u * x0 + 2 * u * t * mx + t * t * x1), y = Math.round(u * u * y0 + 2 * u * t * my + t * t * y1);
    if (!onlyEmpty || !g.get(x, y)) g.set(x, y, c);
  }
}
/* Contorno de 1 px. dark en todo el borde; lite (opcional) en el lado de la luz (vacio a la izquierda o arriba del material). */
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
/* Sombra de contacto: elipse violeta translucida, solo donde no hay nada. */
function contact(g, cx, cy, rx, ry, col) {
  col = col || '#2a244080';
  for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry;
    if (dx * dx + dy * dy <= 1 && !g.get(x, y)) g.set(x, y, col);
  }
}
/* Tramado ordenado 2x2 (solo para manchas): pone c en los pixeles ocupados de la caja, 50 % (o 25 % con q=true). */
function dither(g, x0, y0, x1, y1, c, q, only) {
  for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
    var on = q ? (x % 2 === 0 && y % 2 === 0) : ((x + y) % 2 === 0);
    var cur = g.get(x, y);
    if (on && cur && (!only || only.indexOf(cur) >= 0)) g.set(x, y, c);
  }
}
/* Salpicado de pixeles con colores; solo sobre pixeles ya ocupados. */
function speck(g, r, n, x0, y0, x1, y1, cols) {
  for (var i = 0; i < n; i++) {
    var x = x0 + Math.floor(r() * (x1 - x0 + 1)), y = y0 + Math.floor(r() * (y1 - y0 + 1));
    if (g.get(x, y)) g.set(x, y, cols[Math.floor(r() * cols.length)]);
  }
}
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
/* Texto a mano: baseline con 1 px de vaiven por letra (el desgaste no borra pixeles). */
function handText(g, str, x, y, ink, r, wob) {
  for (var i = 0; i < str.length; i++) {
    var dy = wob ? (r() < 0.35 ? 1 : 0) : 0;
    px.text(g, str.charAt(i), x + i * 4, y + dy, { font: 'a5', ink: ink });
  }
}
/* Lienzo final: toCanvas + sombra proyectada SE (shadowSE, bajo la fila ay) + propiedades. */
function mk(g, ax, ay, fw, fh, o) {
  o = o || {};
  var c = g.toCanvas(), res = c;
  if (o.cast) {
    var c1 = px.canvas(c.width, c.height);                       // lienzo de lectura: shadowSE hace getImageData
    c1.getContext('2d', { willReadFrequently: true }).drawImage(c, 0, 0); c = c1;
    var sh = px.shadowSE(c, o.cast.a === undefined ? 0.2 : o.cast.a, { base: ay, len: o.cast.len || 0.45 });
    var W = Math.max(c.width, sh.width), H = Math.max(c.height, ay + 1 + sh.height);
    res = px.canvas(W, H);
    var cx = res.getContext('2d');
    cx.drawImage(sh, 0, ay); cx.drawImage(c1, 0, 0);
    res.shadowIn = true;
  }
  res.ax = ax; res.ay = ay; res.fw = fw; res.fh = fh;
  if (o.p) for (var k in o.p) res[k] = o.p[k];
  return res;
}
function rows(g, x, y, arr, map) {          // pinta filas de texto: caracter -> color (map), '.' = nada
  for (var j = 0; j < arr.length; j++) for (var i = 0; i < arr[j].length; i++) { var v = map[arr[j].charAt(i)]; if (v) g.set(x + i, y + j, v); }
}

/* ============================ AFICHES CHICHA 12x16 ============================ */
/* Texto en ACH5: 3 letras por renglon (11 px). Los nombres largos van apilados: CHI/CHA, BAI/LE, TIG/RES.
   El nombre completo («LOS TIGRES DEL PUERTO») vive en el panel grande del paradero. */
var STAR = ['..#..', '.###.', '#####', '.###.', '#...#'];
var NOTE = ['.###', '.#.#', '.#.#', '##.#', '##..'];
function poster(kind, seed, torn) {
  var g = new G(12, 16), r = rng(seed), i, j, bg, ink, ink2, x;
  if (kind === 'chicha') {                         // rosado: CHI/CHA
    g.rect(0, 0, 12, 16, NEON.pink);
    g.rect(0, 0, 12, 3, NEON.yellow); for (i = 0; i < 12; i += 2) g.set(i, 1, K);
    px.text(g, 'CHI', 0, 4, { font: 'a5', ink: K }); px.text(g, 'CHA', 0, 10, { font: 'a5', ink: K });
    g.rect(0, 15, 12, 1, NEON.cyan);
  } else if (kind === 'baile') {                   // amarillo: BAI/LE + nota
    g.rect(0, 0, 12, 16, NEON.yellow);
    g.rect(0, 0, 12, 3, K); for (i = 1; i < 12; i += 3) g.set(i, 1, NEON.pink);
    px.text(g, 'BAI', 0, 4, { font: 'a5', ink: K }); px.text(g, 'LE', 0, 10, { font: 'a5', ink: '#8f2f62' });
    g.rect(0, 15, 12, 1, NEON.orange); g.rect(8, 11, 3, 1, NEON.pink); g.rect(9, 13, 2, 1, NEON.pink);
  } else if (kind === 'sab') {                     // negro: SAB 14 (con tilde)
    g.rect(0, 0, 12, 16, K);
    g.rect(0, 0, 12, 2, NEON.green);
    px.text(g, 'SÁB', 0, 5, { font: 'a5', ink: NEON.yellow }); px.text(g, '14', 0, 10, { font: 'a5', ink: NEON.green });
    rows(g, 7, 10, STAR, { '#': NEON.pink }); g.rect(0, 15, 12, 1, NEON.pink);
  } else if (kind === 'hoy') {                     // naranja: HOY (el concierto que ya no fue)
    g.rect(0, 0, 12, 16, NEON.orange);
    g.rect(0, 0, 12, 3, K); for (i = 0; i < 12; i += 4) g.rect(i, 1, 2, 1, NEON.cyan);
    px.text(g, 'HOY', 0, 5, { font: 'a5', ink: K });
    rows(g, 3, 11, STAR, { '#': NEON.yellow }); g.rect(0, 11, 2, 4, '#c9601a'); g.rect(10, 11, 2, 4, '#c9601a');
  } else if (kind === 'tigres') {                  // celeste: TIG/RES con nota
    g.rect(0, 0, 12, 16, NEON.cyan);
    g.rect(0, 0, 12, 3, K); for (i = 1; i < 12; i += 3) g.set(i, 1, NEON.pink);
    px.text(g, 'TIG', 0, 4, { font: 'a5', ink: K }); px.text(g, 'RES', 0, 10, { font: 'a5', ink: '#8f2f62' });
    g.rect(0, 15, 12, 1, NEON.yellow);
  } else if (kind === 'vie20') {                   // verde: VIE 20 con estrella
    g.rect(0, 0, 12, 16, NEON.green);
    g.rect(0, 0, 12, 2, NEON.pink);
    px.text(g, 'VIE', 0, 4, { font: 'a5', ink: K }); px.text(g, '20', 0, 10, { font: 'a5', ink: '#6a2fb5' });
    rows(g, 7, 10, STAR, { '#': K }); g.rect(0, 15, 12, 1, NEON.yellow);
  } else if (kind === 'dom21') {                   // negro y naranja: DOM 21
    g.rect(0, 0, 12, 16, K);
    g.rect(0, 0, 12, 3, NEON.orange); for (i = 0; i < 12; i += 4) g.rect(i, 1, 2, 1, K);
    px.text(g, 'DOM', 0, 5, { font: 'a5', ink: NEON.orange }); px.text(g, '21', 0, 11, { font: 'a5', ink: NEON.cyan });
    rows(g, 7, 10, NOTE, { '#': NEON.pink }); g.rect(0, 15, 12, 1, NEON.cyan);
  } else if (kind === 'fiesta') {                  // amarillo y rojo: FIE/STA con banda inferior
    g.rect(0, 0, 12, 16, NEON.yellow);
    g.rect(0, 0, 12, 3, '#c0312e'); for (i = 0; i < 12; i += 2) g.set(i, 1, NEON.yellow);
    px.text(g, 'FIE', 0, 4, { font: 'a5', ink: K }); px.text(g, 'STA', 0, 10, { font: 'a5', ink: '#c0312e' });
    g.rect(0, 15, 12, 1, K);
  } else if (kind === 'noche') {                   // morado y rosado: NOC/HE
    g.rect(0, 0, 12, 16, '#6a2fb5');
    g.rect(0, 0, 12, 3, NEON.pink); for (i = 1; i < 12; i += 3) g.set(i, 1, '#6a2fb5');
    px.text(g, 'NOC', 0, 4, { font: 'a5', ink: NEON.yellow }); px.text(g, 'HE', 0, 10, { font: 'a5', ink: '#f3efe2' });
    rows(g, 7, 10, STAR, { '#': NEON.green }); g.rect(0, 15, 12, 1, NEON.orange);
  } else {                                         // verde: CUM/BIA
    g.rect(0, 0, 12, 16, NEON.green);
    g.rect(0, 0, 12, 3, '#6a2fb5'); for (i = 0; i < 12; i += 2) g.set(i, 2, NEON.yellow);
    px.text(g, 'CUM', 0, 4, { font: 'a5', ink: K }); px.text(g, 'BIA', 0, 10, { font: 'a5', ink: '#6a2fb5' });
    g.rect(0, 15, 12, 1, NEON.pink);
  }
  // papel pegado: borde oscurecido a tramos, dobleces y desgarros
  for (j = 0; j < 16; j++) for (i = 0; i < 12; i++) {
    var c = g.get(i, j);
    if (c && (i === 0 || j === 15) && (i + j) % 2 === 0) g.set(i, j, mix(c, '#2a2440', 0.28));
    if (c && (i === 11 || j === 0) && (i + j) % 3 === 0) g.set(i, j, mix(c, '#ffffff', 0.18));
  }
  var t = torn === undefined ? Math.floor(r() * 4) : torn;
  if (t === 0) { g.set(11, 15, null); g.set(10, 15, null); g.set(11, 14, null); g.set(11, 13, null); g.set(9, 15, null); }
  else if (t === 1) { g.set(0, 15, null); g.set(1, 15, null); g.set(0, 14, null); g.set(2, 15, null); g.set(0, 13, null); }
  else if (t === 2) { g.set(11, 0, null); g.set(10, 0, null); g.set(11, 1, null); g.set(11, 2, null); g.set(0, 15, null); }
  else { g.set(0, 0, null); g.set(1, 0, null); g.set(0, 1, null); g.set(11, 15, null); g.set(10, 15, null); }
  for (var k = 0; k < 4; k++) { var cx = 1 + Math.floor(r() * 10), cy = 3 + Math.floor(r() * 12); if (g.get(cx, cy) && g.get(cx, cy) !== K) g.set(cx, cy, mix(g.get(cx, cy), '#ffffff', 0.35)); }
  return g;
}
function tape(g, x, y, horiz) {
  var c1 = '#e0d6a4', c2 = '#c8bc84';
  if (horiz) { g.rect(x, y, 4, 2, c1); g.rect(x, y + 1, 4, 1, c2); g.set(x, y, c2); }
  else { g.rect(x, y, 2, 4, c1); g.rect(x + 1, y, 1, 4, c2); }
}
/* Pega un afiche G sobre el poste g (x,y esquina sup. izq.) con sombra de contacto, curvatura y cinta. */
function pastePoster(g, p, x0, y0, tapes) {
  var i, j;
  for (j = 0; j < 16; j++) for (i = 0; i < 12; i++) {                         // sombra paralela abajo-derecha sobre lo de abajo
    if (p.get(i, j)) continue;
  }
  for (j = 0; j < 17; j++) for (i = 0; i < 13; i++) {
    var inside = (i < 12 && j < 16) && p.get(i, j);
    if (!inside) {
      var onR = i > 0 && i - 1 < 12 && j < 16 && p.get(i - 1, j), onB = j > 0 && i < 12 && p.get(i, j - 1);
      var u = g.get(x0 + i, y0 + j);
      if ((onR || onB) && u && u !== K) g.set(x0 + i, y0 + j, mix(u, '#2a2440', 0.5));
    }
  }
  for (j = 0; j < 16; j++) for (i = 0; i < 12; i++) {
    var c = p.get(i, j); if (!c) continue;
    if (i >= 10) c = mix(c, '#2a2440', i === 11 ? 0.3 : 0.12);                 // da la vuelta al poste
    else if (i === 0) c = mix(c, '#ffffff', 0.12);
    g.set(x0 + i, y0 + j, c);
  }
  if (tapes) tapes.forEach(function (t) { tape(g, x0 + t[0], y0 + t[1], t[2]); });
}

/* ============================ POSTES DE CONCRETO ============================ */
/* Poste de 12 m comprimido a ~140 px (revision 2.2: 16 px/m hasta 2,2 m y ~12 px/m por encima).
   Lienzo 64 de ancho; eje en x=32; suelo en la fila 150. Y(h) = fila a h px sobre el suelo.
   Los cables cuelgan SOLO de las crucetas (h 119-132), por encima de la banda de letreros de la planta baja (que llega a ~94 px sobre la vereda). */
var POLE_H = 140, ARM1 = 131, ARM2 = 120;
function concretePole(o) {
  var W = 64, cx = 32, B = 150, g = new G(W, B + 4), r = rng(o.seed), i, j, h;
  function Y(hh) { return B - hh; }
  // --- fuste: 6 px abajo -> 4 arriba, tres valores (luz izquierda) ---
  for (h = 6; h <= POLE_H - 2; h++) {
    var w = h >= 100 ? 4 : (h >= 44 ? 5 : 6), x0 = cx - Math.floor(w / 2);
    var cols = w === 4 ? [CONC.hi, CONC.lt, CONC.bs, CONC.sh] : (w === 5 ? [CONC.hi, CONC.lt, CONC.bs, CONC.sh, CONC.dp] : [CONC.hi, CONC.lt, CONC.bs, CONC.bs, CONC.sh, CONC.dp]);
    for (i = 0; i < w; i++) g.set(x0 + i, Y(h), cols[i]);
  }
  for (h = POLE_H - 2; h <= POLE_H; h++) { g.set(cx - 1, Y(h), CONC.lt); g.set(cx, Y(h), CONC.bs); }
  // anillos de encofrado cada 14 px, grietas, salpicado y humedad con tramado
  for (h = 20; h <= 132; h += 14) for (i = cx - 3; i <= cx + 2; i++) { var cc = g.get(i, Y(h)); if (cc && DARKER[cc]) g.set(i, Y(h), DARKER[cc]); }
  for (i = 0; i < 90; i++) { var sx = cx - 2 + Math.floor(r() * 5), sy = Y(8 + Math.floor(r() * 122)), s = g.get(sx, sy); if (s && r() < 0.5 && LIGHTER[s] && DARKER[s]) g.set(sx, sy, r() < 0.5 ? LIGHTER[s] : DARKER[s]); }
  var ck = Y(22 + Math.floor(r() * 40)); [[0, 0], [1, 1], [1, 2], [0, 3], [0, 4]].forEach(function (d) { var cc = g.get(cx - 1 + d[0], ck + d[1]); if (cc) g.set(cx - 1 + d[0], ck + d[1], CONC.dp); });
  for (h = 6; h <= 22; h++) for (i = cx - 3; i <= cx + 2; i++) {                                          // humedad que sube del suelo
    var cur = g.get(i, Y(h)); if (cur && r() < 0.75 * (1 - (h - 6) / 17)) g.set(i, Y(h), h < 12 ? '#555c55' : '#6c7169');
  }
  // --- dado de concreto 10x6 con mancha y tierra ---
  var dcols = [CONC.lt, CONC.lt, CONC.bs, CONC.bs, CONC.bs, CONC.bs, CONC.sh, CONC.sh, CONC.sh, CONC.dp];
  for (j = 0; j < 6; j++) for (i = 0; i < 10; i++) g.set(cx - 5 + i, Y(j), j === 5 ? (i < 2 ? CONC.hi : CONC.lt) : dcols[i]);
  for (j = 0; j < 4; j++) for (i = 0; i < 10; i++) if (r() < 0.5 - j * 0.1) g.set(cx - 5 + i, Y(j), j === 0 ? '#5a4d44' : '#555c55');
  g.set(cx - 4, Y(4), CONC.sh); g.set(cx - 3, Y(5), CONC.sh); g.set(cx + 3, Y(3), '#8c9086');
  // --- placa con el numero del poste (ACH5 negro sobre amarillo) ---
  if (o.plate) {
    var py = Y(o.plate);
    g.rect(cx - 4, py - 3, 9, 7, '#e6c85a'); g.rect(cx - 4, py + 3, 9, 1, '#a88a3c'); g.rect(cx + 4, py - 3, 1, 7, '#a88a3c');
    g.set(cx - 4, py - 3, '#f4e08a'); g.set(cx - 3, py - 3, '#f4e08a');
    px.text(g, o.num || '14', cx - 3, py - 2, { font: 'a5', ink: K });
  }
  // --- caja de medidor ---
  if (o.meter) {
    var my = Y(o.meter);
    g.rect(cx - 5, my - 5, 10, 11, '#7e868a'); g.rect(cx - 5, my - 5, 10, 1, '#a4abaa'); g.rect(cx - 5, my - 5, 1, 11, '#a4abaa');
    g.rect(cx + 4, my - 4, 1, 10, '#5c6570'); g.rect(cx - 4, my + 5, 9, 1, '#5c6570');
    g.rect(cx - 3, my - 3, 6, 4, '#1c2530'); g.rect(cx - 3, my - 3, 6, 1, '#2d3d4a'); g.set(cx - 3, my - 3, '#8fb0b8'); g.set(cx - 2, my - 2, '#4d6676');
    g.rect(cx - 3, my + 2, 2, 1, '#c9601a'); g.set(cx + 2, my + 3, '#e6d27a');
  }
  // --- transformador 12x16 con aletas, a la derecha ---
  if (o.trafo) {
    var tx = cx + 3, ty = Y(o.trafo);   // ty = fila de la tapa
    var tc = ['#a4abaa', '#8a939a', '#7e868a', '#7e868a', '#5c6570', '#5c6570', '#3b4250', '#3b4250'];
    g.rect(tx, ty - 1, 12, 2, '#a4abaa'); g.rect(tx, ty - 1, 12, 1, '#cfd3cc'); g.set(tx + 11, ty, '#5c6570');
    for (j = 1; j <= 15; j++) for (i = 0; i < 12; i++) {
      var ci = i < 1 ? 0 : (i < 3 ? 1 : (i < 7 ? 2 : (i < 9 ? 4 : (i < 11 ? 5 : 6)))), cc2 = tc[ci];
      if (j % 3 === 0) cc2 = DARKER_METAL(cc2);
      g.set(tx + i, ty + j + 1, cc2);
    }
    g.rect(tx + 2, ty + 5, 5, 3, '#cfd3cc'); g.rect(tx + 2, ty + 5, 5, 1, '#e6ebe6');           // placa de datos
    g.set(tx + 3, ty + 6, '#3b4250'); g.set(tx + 5, ty + 6, '#3b4250');
    g.rect(tx - 1, ty + 3, 1, 3, '#3b4250'); g.rect(tx - 1, ty + 11, 1, 3, '#3b4250');             // soportes al poste
    g.rect(tx + 4, ty + 15, 4, 2, '#4a5560'); g.set(tx + 10, ty + 8, '#8a4b38'); g.set(tx + 10, ty + 9, '#6f3b2e'); g.set(tx + 9, ty + 12, '#8a4b38');
    [tx + 2, tx + 6, tx + 10].forEach(function (bx) { g.rect(bx, ty - 4, 2, 3, '#cfd3cc'); g.set(bx, ty - 4, '#e6ebe6'); g.set(bx + 1, ty - 3, '#a4abaa'); });
    o._trafo = { x: tx, y: ty };
  }
  // --- afiches ---
  if (o.posters) o.posters.forEach(function (p) { pastePoster(g, poster(p.k, p.s, p.t), cx - 6 + (p.dx || 0), Y(p.h), p.tapes); });
  if (o.torn) {                                                                                  // restos de papel arrancado
    o.torn.forEach(function (t) { g.rect(cx - 3 + t[0], Y(t[1]), t[2], t[3], '#d8d4c4'); g.rect(cx - 3 + t[0], Y(t[1]), t[2], 1, '#efebdc'); dither(g, cx - 3 + t[0], Y(t[1]), cx - 3 + t[0] + t[2], Y(t[1]) + t[3], '#b4b0a0'); });
  }
  // --- travesanos de acero ---
  function arm(hTop, x0, x1, thick) {
    for (var yy = 0; yy < thick; yy++) for (var xx = x0; xx <= x1; xx++) g.set(cx + xx, Y(hTop) + yy, yy === 0 ? '#a4abaa' : (yy === thick - 1 ? '#3b4250' : '#5c6570'));
    g.set(cx + x0, Y(hTop), '#cfd3cc');
  }
  arm(ARM1, -14, 13, 3); arm(ARM2, -7, 6, 2);
  [[-2, ARM1 - 8, -9, ARM1 - 2], [2, ARM1 - 8, 8, ARM1 - 2]].forEach(function (b) { g.line(cx + b[0], Y(b[1]), cx + b[2], Y(b[3]) + 2, '#3b4250'); });
  g.rect(cx - 1, Y(ARM1), 2, 1, '#cfd3cc'); g.set(cx - 1, Y(ARM1 - 1), '#cfd3cc'); g.set(cx, Y(ARM1 - 1), '#8a8884');   // perno central
  var tops = [];
  function insul(x, hArm, big) {
    var y = Y(hArm) - 1;
    if (big) { g.set(x, y - 2, '#e2dfd2'); g.set(x - 1, y - 1, '#e2dfd2'); g.set(x, y - 1, '#cfd3cc'); g.set(x + 1, y - 1, '#a4abaa'); g.set(x - 1, y, '#cfd3cc'); g.set(x, y, '#a4abaa'); g.set(x + 1, y, '#7e868a'); }
    else { g.set(x - 1, y - 1, '#e2dfd2'); g.set(x, y - 1, '#cfd3cc'); g.set(x + 1, y - 1, '#a4abaa'); g.set(x, y, '#a4abaa'); g.set(x - 1, y, '#cfd3cc'); g.set(x + 1, y, '#7e868a'); }
  }
  [-12, -7, 6, 11].forEach(function (d) { insul(cx + d, ARM1, true); });
  [-5, 4].forEach(function (d) { insul(cx + d, ARM2, false); });
  tops = [{ x: -12, y: Y(ARM1 + 3) - B }, { x: 11, y: Y(ARM1 + 3) - B }, { x: -5, y: Y(ARM2 + 1) - B }, { x: 4, y: Y(ARM2 + 1) - B }];
  // --- luminaria: brazo curvo de 14 px y pastilla ---
  var lamp = null;
  if (o.lamp) {
    var dir = o.lamp, lh = o.lampH || 106, lx = cx + dir * 15, ly = Y(lh);
    for (i = 2; i <= 14; i++) { var yy2 = Y(lh) - (i > 9 ? 2 : (i > 4 ? 1 : 0)); g.set(cx + dir * i, yy2 - 1, '#a4abaa'); g.set(cx + dir * i, yy2, '#5c6570'); g.set(cx + dir * i, yy2 + 1, '#3b4250'); }
    g.line(cx + dir * 3, Y(lh - 6), cx + dir * 9, Y(lh - 1), '#3b4250');
    // cabeza tipo cobra: 11x4
    var hx = lx - 5 + (dir > 0 ? 1 : 0), hy = Y(lh - 4);
    g.rect(hx, hy - 3, 11, 2, '#7e868a'); g.rect(hx, hy - 3, 11, 1, '#cfd3cc'); g.rect(hx + (dir > 0 ? 0 : 8), hy - 2, 3, 1, '#5c6570');
    g.rect(hx + 1, hy - 1, 9, 2, '#3b4250'); g.rect(hx + 2, hy, 7, 1, '#d8c88a'); g.rect(hx + 3, hy, 4, 1, '#f6e6b0'); g.set(hx + 4, hy, '#ffffff');
    g.set(hx, hy - 2, '#5c6570'); g.set(hx + 10, hy - 2, '#3b4250');
    lamp = { x: hx + 5 - cx, y: hy + 1 - B };
    o._lamp = lamp;
  }
  outline(g, K);
  // --- cables: pocos y claros. Un bucle de sobra por lado, un ovillo chico y las bajadas indispensables ---
  function loopC(xa, xb, ya, d, col) { curve(g, cx + xa, Y(ya), cx + xb, Y(ya) + 1, d, col); }
  loopC(-12, -5, ARM1 + 1, 8, CAB);
  loopC(11, 5, ARM1 + 1, 9, CAB2);
  if ((o.dense || 0) >= 7) loopC(-5, -9, ARM2 - 1, 7, CAB3);
  // ovillo de cable de sobra colgando (3 vueltas, bien separado del fuste)
  var sx = cx + (o.spiralX === undefined ? -12 : o.spiralX), sy = Y(o.spiralH || 100);
  for (var a2 = 0; a2 < 540; a2 += 20) { var rr = 1.5 + a2 / 540 * 1.8; g.set(Math.round(sx + Math.cos(a2 * 0.01745) * rr), Math.round(sy + Math.sin(a2 * 0.01745) * rr * 1.4), a2 % 120 < 20 ? CAB3 : CAB); }
  g.line(sx, sy - 5, sx + (o.spiralX < 0 ? 3 : -3), Y(ARM2 - 2), CAB);
  // bajadas a la caja de medidor y al trafo (una linea cada una)
  if (o.meter) { g.line(cx - 4, Y(ARM2 - 3), cx - 7, Y(o.meter) - 5, CAB); g.line(cx - 7, Y(o.meter) - 5, cx - 4, Y(o.meter) - 5, CAB); }
  if (o._trafo) { var tr = o._trafo; [tr.x + 2, tr.x + 10].forEach(function (bx) { g.line(bx, tr.y - 5, cx + 4 + (bx > tr.x + 5 ? 4 : 0), Y(ARM2 - 1), CAB); }); }
  // acometidas: una a cada lado, en diagonal hacia las casas; terminan por encima de la banda de letreros
  curve(g, cx + 8, Y(ARM1 - 5), cx + 28, Y(ARM1 - 22), 2, CAB); curve(g, cx - 8, Y(ARM1 - 6), cx - 28, Y(ARM1 - 20), 2, CAB3);
  contact(g, cx, B, 8, 2.5);
  var p = { top: { x: 0, y: Y(ARM1 + 2) - B }, tops: tops, tall: true, poleKind: o.kind };
  if (lamp) { p.lamp = lamp; }
  return mk(g, cx, B, 6, 4, { cast: { len: 0.3, a: 0.2 }, p: p });
}
function DARKER_METAL(c) { return { '#a4abaa': '#7e868a', '#8a939a': '#6d757c', '#7e868a': '#5c6570', '#5c6570': '#3b4250', '#3b4250': '#2d3340' }[c] || c; }

function propPosteCables() { return concretePole({ seed: 7801, kind: 'cables', trafo: 104, meter: 52, plate: 30, num: '47', lamp: -1, lampH: 108, dense: 5, spiralX: 12, spiralH: 98 }); }
/* Cuatro variantes de poste con afiches: cada una con sus propios carteles (bandas, fechas y colores distintos). La 0 es `posteAfiche`. */
var AFI_SETS = [
  { seed: 7907, num: '23', lamp: 1, spiralX: -13, spiralH: 100, posters: [
      { k: 'sab', s: 11, h: 22, dx: 0, t: 2, tapes: [[0, 0, true], [8, 0, true]] },
      { k: 'chicha', s: 12, h: 37, dx: -1, t: 0, tapes: [[8, 0, true], [-1, 12, false]] },
      { k: 'cumbia', s: 13, h: 52, dx: 1, t: 3, tapes: [[0, 0, true]] } ], torn: [[1, 67, 4, 2], [-3, 8, 3, 3]] },
  { seed: 7911, num: '31', lamp: -1, spiralX: 13, spiralH: 98, posters: [
      { k: 'hoy', s: 21, h: 21, dx: 1, t: 1, tapes: [[0, 0, true], [8, 0, true]] },
      { k: 'tigres', s: 22, h: 37, dx: -1, t: 2, tapes: [[4, 0, true]] },
      { k: 'vie20', s: 23, h: 53, dx: 0, t: 0, tapes: [[0, 0, true], [-1, 12, false]] } ], torn: [[-2, 70, 5, 2], [2, 10, 3, 3]] },
  { seed: 7919, num: '08', lamp: 1, spiralX: -12, spiralH: 102, posters: [
      { k: 'baile', s: 31, h: 24, dx: 0, t: 3, tapes: [[0, 0, true]] },
      { k: 'dom21', s: 32, h: 40, dx: -1, t: 1, tapes: [[8, 0, true], [-1, 4, false]] } ], torn: [[1, 58, 4, 2], [-3, 9, 3, 2], [2, 18, 3, 3]] },
  { seed: 7927, num: '56', lamp: -1, spiralX: 12, spiralH: 96, posters: [
      { k: 'fiesta', s: 41, h: 22, dx: 1, t: 2, tapes: [[0, 0, true], [8, 0, true]] },
      { k: 'cumbia', s: 42, h: 38, dx: -1, t: 1, tapes: [[0, 0, true]] },
      { k: 'noche', s: 43, h: 54, dx: 0, t: 3, tapes: [[8, 0, true], [-1, 10, false]] } ], torn: [[-2, 71, 4, 2], [1, 12, 4, 3]] },
  /* B6: dos juegos mas, con los mismos afiches en otro orden y alturas distintas, para que 6 postes no repitan ninguno */
  { seed: 7933, num: '14', lamp: 1, spiralX: -12, spiralH: 99, posters: [
      { k: 'vie20', s: 51, h: 21, dx: -1, t: 2, tapes: [[0, 0, true]] },
      { k: 'noche', s: 52, h: 38, dx: 1, t: 1, tapes: [[8, 0, true], [-1, 4, false]] },
      { k: 'tigres', s: 53, h: 54, dx: 0, t: 0, tapes: [[0, 0, true], [8, 0, true]] } ], torn: [[2, 66, 4, 2], [-3, 14, 3, 3]] },
  { seed: 7939, num: '62', lamp: -1, spiralX: 13, spiralH: 103, posters: [
      { k: 'dom21', s: 61, h: 24, dx: 1, t: 3, tapes: [[0, 0, true], [8, 0, true]] },
      { k: 'sab', s: 62, h: 41, dx: -1, t: 0, tapes: [[4, 0, true]] },
      { k: 'fiesta', s: 63, h: 55, dx: 0, t: 2, tapes: [[8, 0, true], [-1, 9, false]] } ], torn: [[-1, 70, 5, 2], [3, 9, 3, 2]] }
];
function propPosteAfiche(v) {
  var s = AFI_SETS[v || 0];
  return concretePole({ seed: s.seed, kind: 'afiche', plate: 72, num: s.num, lamp: s.lamp, lampH: 108, dense: 4, spiralX: s.spiralX, spiralH: s.spiralH, posters: s.posters, torn: s.torn });
}
function propPoste() { return concretePole({ seed: 7703, kind: 'plain', meter: 54, plate: 26, num: '08', lamp: -1, lampH: 108, dense: 3, spiralX: 12, spiralH: 100 }); }

props.posteCables = propPosteCables();
props.posteAfiches = [0, 1, 2, 3, 4, 5].map(propPosteAfiche);
props.posteAfiche = props.posteAfiches[0];
props.poste = propPoste();


/* ============================ POSTE DE ALUMBRADO DE ACERO, DOS BRAZOS ============================ */
var ST = { hi: '#cfd3cc', lt: '#a4abaa', bs: '#7e868a', sh: '#5c6570', dp: '#3b4250', dd: '#2d3340' };
function luminaire(g, x, y, tilt) {            // cabeza cobra 11x4, centro en x; y = fila de la pastilla. Devuelve el punto lamp.
  var hx = x - 5;
  g.rect(hx, y - 3, 11, 2, ST.bs); g.rect(hx, y - 3, 11, 1, ST.hi); g.rect(hx + 8, y - 2, 3, 1, ST.sh); g.rect(hx, y - 2, 2, 1, ST.lt);
  g.rect(hx + 1, y - 1, 9, 2, ST.dp); g.rect(hx + 2, y, 7, 1, '#d8c88a'); g.rect(hx + 3, y, 4, 1, '#f6e6b0'); g.set(hx + 4, y, '#ffffff');
  g.set(hx, y - 2, ST.sh); g.set(hx + 10, y - 2, ST.dp);
  return { x: x, y: y };
}
function steelPost(o) {
  var W = 64, cx = 32, B = 150, g = new G(W, B + 4), r = rng(o.seed), H = o.h, i, j, h;
  function Y(hh) { return B - hh; }
  var base = o.paint === 'green' ? [RP.botella[3], RP.botella[2], RP.botella[1], RP.botella[0]] : [ST.lt, ST.sh, ST.dp, ST.dd];
  var sh2 = o.paint === 'green' ? RP.botella[0] : ST.dd;
  for (h = 14; h <= H - 7; h++) {                                      // fuste
    var w = h > H * 0.6 ? 4 : 5, x0 = cx - Math.floor(w / 2);
    var cols = w === 4 ? [base[0], base[1], base[2], base[3]] : [base[0], base[1], base[1], base[2], base[3]];
    for (i = 0; i < w; i++) g.set(x0 + i, Y(h), cols[i]);
  }
  for (h = 30; h < H - 7; h += 22) for (i = cx - 2; i <= cx + 1; i++) { var c0 = g.get(i, Y(h)); if (c0) g.set(i, Y(h), sh2); }       // junta de tramo
  // collar de base (hexagono visto de frente) con puertezuela y pernos
  for (h = 3; h <= 14; h++) for (i = -3; i <= 3; i++) g.set(cx + i, Y(h), i === -3 ? base[0] : (i < 0 ? base[1] : (i < 2 ? base[2] : base[3])));
  g.rect(cx - 1, Y(11), 3, 7, sh2); g.rect(cx - 1, Y(11), 3, 1, base[3]); g.set(cx + 1, Y(8), ST.hi); g.set(cx - 1, Y(10), base[1]);
  g.rect(cx - 4, Y(2), 9, 3, base[1]); g.rect(cx - 4, Y(2), 9, 1, base[0]); g.rect(cx - 4, Y(0), 9, 1, base[3]);    // placa
  [cx - 4, cx + 4].forEach(function (bx) { g.set(bx, Y(2), ST.hi); });
  g.rect(cx - 5, Y(0), 11, 1, base[3]); g.set(cx - 5, Y(0), base[2]);
  // mancha de oxido en la base
  var ox = o.rust || 0;
  for (j = 0; j < 22; j++) for (i = cx - 3; i <= cx + 2; i++) { var q = g.get(i, Y(j)); if (q && r() < ox * (1 - j / 22)) g.set(i, Y(j), pick(r, ['#8a4b38', '#6f3b2e', '#a0603f'])); }
  // afiche arrancado (opcional)
  if (o.flyer) { g.rect(cx - 3, Y(46), 7, 10, '#d8d4c4'); g.rect(cx - 3, Y(46), 7, 1, '#efebdc'); g.rect(cx - 2, Y(44), 4, 1, NEON.pink); g.rect(cx - 2, Y(41), 5, 1, '#8c8a93'); g.rect(cx + 3, Y(41), 1, 5, '#b4b0a0'); g.set(cx - 3, Y(37), null); g.set(cx - 3, Y(38), null); }
  // cabeza del fuste: horquilla con dos brazos curvos
  g.rect(cx - 2, Y(H - 6), 4, 3, base[1]); g.rect(cx - 2, Y(H - 6), 4, 1, base[0]); g.set(cx + 1, Y(H - 5), base[3]);
  var lamps = [];
  [-1, 1].forEach(function (d, k) {
    var ex = cx + d * 17, ey = Y(H - 7);
    var droop = (o.broken === d) ? 3 : 0;
    var pts = [];
    for (var t = 0; t <= 1.0001; t += 0.03) {                         // arco: sube del fuste, se abre, termina horizontal
      var x = cx + d * (2 + 15 * t), y = Y(H - 5) - Math.round(Math.sin(t * Math.PI * 0.55) * 7) + Math.round(Math.pow(t, 3) * (6 + droop));
      pts.push([x, y]);
    }
    pts.forEach(function (p) { g.set(p[0], p[1] - 1, d < 0 ? base[0] : base[0]); g.set(p[0], p[1], base[1]); g.set(p[0], p[1] + 1, base[3]); });
    var last = pts[pts.length - 1];
    lamps.push(luminaire(g, cx + d * 17, last[1] + 4));
  });
  if (o.broken) { var bk = o.broken, bx = cx + bk * 17, by = Y(H - 7) + 12; g.line(bx, by - 6, bx + bk * 2, by + 3, CAB); g.line(bx + 1, by - 6, bx + bk * 2 + 1, by + 4, CAB3); }
  outline(g, K);
  contact(g, cx, B, 6, 2);
  return mk(g, cx, B, 6, 4, { cast: { len: 0.3, a: 0.2 }, p: { tall: true, top: { x: 0, y: Y(H - 4) - B }, lamp: { x: lamps[0].x - cx, y: lamps[0].y - B }, lamps: lamps.map(function (l) { return { x: l.x - cx, y: l.y - B }; }), tops: lamps.map(function (l) { return { x: l.x - cx, y: l.y - B - 5 }; }), poleKind: 'luz' } });
}
props.posteLuz = [
  steelPost({ seed: 8101, h: 138, paint: 'steel', rust: 0.35 }),
  steelPost({ seed: 8102, h: 142, paint: 'green', rust: 0.55, flyer: true, broken: 1 })
];

/* ============================ SEMAFORO (ambar intermitente) ============================ */
function propSemaforo() {
  var W = 32, cx = 22, B = 82, g = new G(W, B + 4), r = rng(8201), h, i, j;
  function Y(hh) { return B - hh; }
  var BK = ['#4a5560', '#2d3340', '#1c1a22'];
  for (h = 3; h <= 76; h++) { for (i = -1; i <= 1; i++) g.set(cx + i, Y(h), i < 0 ? BK[0] : (i === 0 ? BK[1] : BK[2])); }
  for (h = 8; h <= 34; h++) { var band = Math.floor(h / 4) % 2 === 0; if (band) for (i = -1; i <= 1; i++) g.set(cx + i, Y(h), i < 0 ? '#e6d27a' : (i === 0 ? '#d2b24a' : '#a88a3c')); }   // bandas amarillas
  for (j = 0; j < 4; j++) for (i = -3; i <= 3; i++) g.set(cx + i, Y(j), i < 0 ? BK[0] : (i < 2 ? BK[1] : BK[2]));         // base
  g.rect(cx - 4, Y(0), 9, 1, BK[2]);
  // brazo horizontal y cabeza de 3 luces
  g.rect(cx - 12, Y(74), 13, 2, BK[1]); g.rect(cx - 12, Y(74), 13, 1, BK[0]);
  g.line(cx - 1, Y(62), cx - 8, Y(73), BK[1]);
  var hx = cx - 17, hy = Y(76);                                       // caja 9x24 colgada
  g.rect(hx - 1, hy - 1, 11, 26, '#e6c85a'); g.rect(hx - 1, hy - 1, 11, 1, '#f4e08a'); g.rect(hx + 9, hy, 1, 25, '#a88a3c');   // contraplaca amarilla
  g.rect(hx, hy, 9, 24, '#23212a'); g.rect(hx, hy, 1, 24, '#3a3844'); g.rect(hx + 8, hy, 1, 24, '#15131a');
  var lights = [['#7a2a26', '#e8483a', '#f09080'], ['#d9a63c', '#ffd24a', '#fff2b0'], ['#1f4a35', '#3fa66a', '#a8e8b8']];
  var lampPt = null;
  lights.forEach(function (L, k) {
    var ly = hy + 2 + k * 7, lx = hx + 4;
    g.rect(lx - 2, ly, 5, 1, '#15131a');                                // visera
    g.rect(lx - 2, ly + 1, 5, 4, L[0]); g.rect(lx - 1, ly + 1, 3, 4, L[0]); g.rect(lx - 2, ly + 1, 1, 1, null);
    g.set(lx - 2, ly + 1, '#23212a'); g.set(lx + 2, ly + 1, '#23212a'); g.set(lx - 2, ly + 4, '#23212a'); g.set(lx + 2, ly + 4, '#23212a');
    if (k === 1) { g.rect(lx - 1, ly + 1, 3, 3, L[1]); g.set(lx - 1, ly + 1, L[2]); g.set(lx, ly + 1, L[2]); lampPt = { x: lx, y: ly + 2 }; }
    else g.set(lx - 1, ly + 1, L[1] === '#e8483a' ? '#a8453a' : '#2f7a52');
  });
  g.set(hx + 1, hy + 22, '#8a4b38'); g.set(hx + 2, hy + 23, '#6f3b2e');
  // pegatina arrancada en la caja del paso peatonal
  g.rect(cx + 2, Y(52), 5, 7, '#d8d4c4'); g.rect(cx + 2, Y(52), 5, 1, '#efebdc'); g.rect(cx + 3, Y(50), 3, 1, NEON.pink); g.set(cx + 6, Y(46), null);
  outline(g, K);
  contact(g, cx, B, 6, 2);
  return mk(g, cx, B, 5, 4, { cast: { len: 0.4, a: 0.2 }, p: { tall: true, lamp: { x: lampPt.x - cx, y: lampPt.y - B }, emit: [{ x: lampPt.x - cx, y: lampPt.y - B, kind: 'semaforo' }], top: { x: 0, y: Y(76) - B } } });
}
props.semaforo = propSemaforo();

/* ============================ PARADERO 64x52 ============================ */
function propParadero() {
  var W = 64, H = 56, g = new G(W, H), r = rng(8301), i, j, x, y;
  // ---- losa de concreto (huella 58x8): tapa y canto ----
  for (y = 44; y <= 49; y++) for (x = 2; x <= 61; x++) g.set(x, y, y === 44 ? CONC.hi : (y < 47 ? CONC.lt : CONC.bs));
  for (x = 2; x <= 61; x++) { g.set(x, 50, CONC.sh); g.set(x, 51, CONC.dp); }
  for (y = 44; y <= 49; y++) { g.set(2, y, CONC.hi); g.set(61, y, CONC.bs); }
  speck(g, r, 40, 3, 45, 60, 49, [CONC.hi, CONC.bs, '#8c8f84']);
  // ---- panel trasero: luna oscura con reflejos ----
  for (y = 23; y <= 43; y++) for (x = 6; x <= 57; x++) g.set(x, y, '#2d3d4a');
  for (y = 23; y <= 43; y++) for (x = 6; x <= 57; x++) { if (((x - y) % 9 + 9) % 9 < 1) g.set(x, y, '#3d5666'); }
  g.rect(6, 23, 52, 1, '#1c2530'); g.rect(6, 43, 52, 1, '#1c2530'); g.rect(6, 23, 1, 21, '#4d6676'); g.rect(57, 23, 1, 21, '#1c2530');
  // ---- afiche grande roto: LOS TIGRES DEL PUERTO ----
  var px0 = 10, py0 = 24, pw = 44, ph = 19;
  g.rect(px0, py0, pw, ph, NEON.cyan);
  g.rect(px0, py0, pw, 7, K);
  px.text(g, 'HOY BAILE', px0 + 3, py0 + 1, { font: 'a5', ink: NEON.yellow });
  rows(g, px0 + pw - 7, py0 + 1, STAR, { '#': NEON.pink });
  px.text(g, 'LOS TIGRES', px0 + 3, py0 + 8, { font: 'a5', ink: K });
  px.text(g, 'DEL PUERTO', px0 + 3, py0 + 14, { font: 'a5', ink: '#8f1f56' });
  for (x = px0; x < px0 + pw; x++) if (x % 2) g.set(x, py0 + ph - 1, '#2aa0c0');
  // rasgones: esquina inferior derecha y borde izquierdo
  var tear = [[43, 18], [42, 18], [41, 18], [43, 17], [42, 17], [43, 16], [43, 15], [40, 18], [0, 0], [0, 1], [1, 0], [0, 17], [0, 18], [1, 18], [0, 16], [0, 14]];
  tear.forEach(function (t) { g.set(px0 + t[0], py0 + t[1], '#2d3d4a'); });
  for (x = 0; x < 4; x++) g.set(px0 + 41 + x, py0 + 14 - x, '#2d3d4a');
  g.rect(px0 + pw - 10, py0 + 11, 8, 1, '#c8bc84');          // jiron de cinta
  tape(g, px0 - 1, py0 - 1, true); tape(g, px0 + pw - 4, py0 - 1, true);
  for (x = 0; x < pw; x++) { var cp = g.get(px0 + x, py0 + 1); }
  // ---- banca de listones, de frente ----
  for (x = 14; x <= 44; x++) { g.set(x, 43, '#c99458'); g.set(x, 44, '#a86e38'); g.set(x, 45, '#6b4223'); }
  for (x = 14; x <= 44; x += 7) g.set(x, 44, '#6b4223');
  g.rect(15, 46, 2, 4, '#3b4250'); g.rect(42, 46, 2, 4, '#3b4250'); g.rect(28, 46, 2, 4, '#3b4250');
  g.set(14, 43, '#e0b27a'); g.set(20, 43, '#e0b27a');
  // ---- tacho amarrado al parante derecho ----
  g.rect(51, 38, 8, 11, '#2f5a52'); g.rect(51, 38, 8, 1, '#5a8f80'); g.rect(51, 38, 1, 11, '#3f7266'); g.rect(58, 39, 1, 10, '#1f3a36');
  g.rect(50, 37, 10, 2, '#cfd3cc'); g.rect(50, 37, 10, 1, '#efebdc'); g.rect(52, 44, 5, 1, '#1f3a36');
  g.set(54, 36, '#8c8a93'); g.set(55, 35, '#d8d4c4'); g.set(56, 36, '#e6c85a');
  // ---- parantes de acero ----
  [[3, 3], [58, 3]].forEach(function (p) {
    for (y = 23; y <= 50; y++) { g.set(p[0], y, ST.lt); g.set(p[0] + 1, y, ST.bs); g.set(p[0] + 2, y, ST.sh); }
    g.rect(p[0] - 1, 49, 5, 2, ST.sh); g.rect(p[0] - 1, 49, 5, 1, ST.lt);
  });
  // ---- techo de calamina visto en 3/4: trapecio, fondo mas angosto ----
  for (y = 1; y <= 15; y++) {
    var inset = Math.round(4 * (15 - y) / 14), x0 = inset, x1 = 63 - inset;
    for (x = x0; x <= x1; x++) {
      var ph2 = ((x - 3) % 4 + 4) % 4, col = ['#a4abaa', '#8a939a', '#6d757c', '#7e868a'][ph2];
      if (y < 4) col = (ph2 === 2) ? '#8a939a' : '#cfd3cc';                      // reborde trasero a contraluz
      if (y > 12) col = ['#8a939a', '#7e868a', '#5c6570', '#6d757c'][ph2];
      g.set(x, y, col);
    }
  }
  g.rect(3, 0, 58, 1, ST.hi);
  // ---- friso delantero con la ruta ----
  for (x = 0; x <= 63; x++) { g.set(x, 16, '#4a6498'); for (y = 17; y <= 21; y++) g.set(x, y, '#2f4470'); g.set(x, 22, '#1d2a48'); }
  px.text(g, 'RUTA 77', 22, 17, { font: 'a5', ink: PAL.cream });
  g.rect(5, 18, 11, 4, '#e6c85a'); g.rect(5, 18, 11, 1, '#f4e08a'); g.rect(6, 19, 2, 1, '#2d3d4a'); g.rect(9, 19, 2, 1, '#2d3d4a'); g.rect(12, 19, 2, 1, '#2d3d4a'); g.set(6, 21, K); g.set(13, 21, K);   // icono de combi
  g.rect(50, 18, 9, 3, '#2f4470'); g.line(50, 19, 57, 19, PAL.cream); g.set(56, 18, PAL.cream); g.set(56, 20, PAL.cream); g.set(57, 19, PAL.cream);   // flecha
  // oxido, hojas secas, caca de gallinazo, tornillos
  speck(g, r, 26, 1, 2, 62, 14, ['#8a4b38', '#6f3b2e', '#a0603f']);
  for (i = 0; i < 9; i++) { var lx2 = 8 + Math.floor(r() * 46), ly2 = 5 + Math.floor(r() * 9); g.set(lx2, ly2, pick(r, ['#a5814f', '#7a5a45', '#94975e'])); if (r() < 0.6) g.set(lx2 + 1, ly2, '#7a5a45'); }
  [[18, 6], [41, 9], [29, 3]].forEach(function (d) { g.set(d[0], d[1], '#e2dfd2'); g.set(d[0] + 1, d[1] + 1, '#e2dfd2'); g.set(d[0], d[1] + 1, '#c9c5b5'); });
  for (x = 6; x < 60; x += 8) g.set(x, 14, ST.hi);
  g.rect(0, 14, 1, 2, '#8a4b38');
  outline(g, K);
  // hojas y basura sobre la losa, goteo del techo
  [[20, 46, '#a5814f'], [34, 48, '#7a5a45'], [47, 47, '#94975e'], [11, 48, '#7a5a45'], [24, 49, '#e2dfd2']].forEach(function (d) { g.set(d[0], d[1], d[2]); g.set(d[0] + 1, d[1], d[2]); });
  contact(g, 32, 52, 29, 2);
  return mk(g, 32, 51, 58, 8, { cast: { len: 0.38, a: 0.2 }, p: { tall: true } });
}
props.paradero = propParadero();

/* ============================ ARBOLES DE BERMA 52x68 y PALMERAS 44x88 ============================ */
function hash2(x, y, s) { var h = (Math.imul(x + 101, 73856093) ^ Math.imul(y + 57, 19349663) ^ Math.imul(s + 13, 83492791)) >>> 0; return (h % 10007) / 10007; }
var LEAF = ['#b2b374', '#94975e', '#6b7a4f', '#4a5a44', '#2f3d3a'];       // claro -> oscuro (vegetacion mustia, matiz hacia el verde azulado en sombra)

function treeWhite(o) {
  var W = 52, H = 70, g = new G(W, H), r = rng(o.seed), i, j, x, y, ay = 65, ax = 26;
  // ---- tronco con cal (primero: la copa lo tapa) ----
  var calTop = ay - o.cal, lean = o.lean || 0;
  for (y = ay; y >= 30; y--) {
    var t = (ay - y) / 36, cxT = ax + Math.round(lean * t * t * 5), w = y > ay - 4 ? 7 : (y > ay - 12 ? 6 : 5), x0 = cxT - Math.floor(w / 2);
    var white = y >= calTop + Math.round((hash2(cxT, y, o.seed) - 0.5) * 2);
    for (i = 0; i < w; i++) {
      var pal = white ? ['#f1eddf', '#e2dfd2', '#c9c5b5', '#c9c5b5', '#a8a59c', '#8c8a93', '#8c8a93'] : ['#a8956e', '#8a7658', '#6b5a48', '#6b5a48', '#4a3f3c', '#3a302e', '#3a302e'];
      var k = w === 5 ? [0, 1, 2, 4, 5][i] : (w === 6 ? [0, 1, 2, 3, 4, 5][i] : i);
      g.set(x0 + i, y, pal[k]);
    }
  }
  // grietas, manchas de cal chorreada y de humedad
  for (i = 0; i < 26; i++) { var yy = calTop + 1 + Math.floor(r() * (o.cal - 3)), xx = ax - 2 + Math.floor(r() * 5), cc = g.get(xx, yy); if (cc && cc !== K) g.set(xx, yy, r() < 0.5 ? '#bdb9ab' : '#d8d4c4'); }
  for (y = ay - 3; y <= ay; y++) for (x = ax - 3; x <= ax + 3; x++) if (g.get(x, y) && r() < 0.4) g.set(x, y, '#8a8574');
  for (x = ax - 2; x <= ax + 2; x++) if (g.get(x, calTop) && r() < 0.7) g.set(x, calTop, '#a8956e');        // borde de la cal, brocha
  // ramas: horquilla dentro de la copa
  var br = ['#6b5a48', '#4a3f3c'];
  [[ax, 34, ax - 12, 22], [ax, 34, ax + 12, 20], [ax, 34, ax - 2, 14], [ax - 6, 28, ax - 16, 28]].forEach(function (b) { g.line(b[0], b[1], b[2], b[3], br[1]); g.line(b[0] + 1, b[1], b[2] + 1, b[3], br[0]); });
  // ---- copa: 4-5 masas claras, de atras hacia adelante (painter). Luz arriba a la izquierda, sombra abajo a la derecha. ----
  // Cada masa tiene 4 valores en bandas limpias (sin tramado ni ruido); donde una masa tapa a otra, esta se oscurece 1 paso (sombra SE).
  var masses = o.masses, owner = new Array(W * 50), lit = new Array(W * 50), x2, y2;
  for (i = 0; i < owner.length; i++) owner[i] = -1;
  masses.forEach(function (M, m) {
    for (y2 = 0; y2 < 50; y2++) for (x2 = 0; x2 < W; x2++) {
      var dx = (x2 - M[0]) / M[2], dy = (y2 - M[1]) / M[3];
      var ang = Math.atan2(dy, dx), edge = 1 + 0.10 * Math.sin(ang * 5 + M[4]) + 0.05 * Math.sin(ang * 9 + M[4] * 2.3);
      var d = Math.sqrt(dx * dx + dy * dy) / edge;
      if (d >= 1) continue;
      owner[y2 * W + x2] = m;
      lit[y2 * W + x2] = [-(dx * 0.62 + dy * 0.78), d];
    }
  });
  for (y2 = 0; y2 < 50; y2++) for (x2 = 0; x2 < W; x2++) {
    var oi = owner[y2 * W + x2]; if (oi < 0) continue;
    var L = lit[y2 * W + x2], lv = L[0], dd = L[1], ci;
    if (lv > 0.34) ci = 0; else if (lv > -0.08) ci = 1; else if (lv > -0.5) ci = 2; else ci = 3;
    if (dd > 0.86 && lv < -0.1) ci = 4;                                      // filo inferior derecho
    else if (dd > 0.86 && lv > 0.35) ci = 0;
    var nb = owner[(y2 - 1) * W + (x2 - 1)];                                  // la masa de adelante proyecta sombra hacia el sureste sobre la de atras
    if (x2 > 0 && y2 > 0 && nb > oi && ci < 4) ci = Math.min(4, ci + 1);
    g.set(x2, y2, LEAF[ci]);
  }
  // racimos de hojas: 2-3 plastas claras por masa en la cara iluminada, 2x2 y 3x2 (formas, no puntos sueltos)
  masses.forEach(function (M, mi) {
    for (var k = 0; k < 3; k++) {
      var a = (205 + k * 38 + r() * 14) * Math.PI / 180, rr = 0.42 + r() * 0.22, lx = Math.round(M[0] + Math.cos(a) * M[2] * rr), ly = Math.round(M[1] + Math.sin(a) * M[3] * rr);
      if (owner[ly * W + lx] === mi && owner[(ly + 1) * W + lx + 2] === mi) { g.rect(lx, ly, 3, 1, LEAF[0]); g.rect(lx - 1, ly + 1, 3, 1, LEAF[0]); g.rect(lx + 2, ly + 1, 1, 1, LEAF[1]); }
    }
  });
  // unas pocas hojas secas (3), agrupadas en la masa de abajo a la izquierda
  for (i = 0; i < 4; i++) { var dx3 = 8 + Math.floor(r() * 14), dy3 = 16 + Math.floor(r() * 12); if (g.get(dx3, dy3) && g.get(dx3 + 1, dy3)) { g.set(dx3, dy3, '#a5814f'); g.set(dx3 + 1, dy3, '#c9a66b'); } }
  if (o.cable) {                                                    // cable negro enredado en la copa (como en las fotos)
    curve(g, 6, 14, 24, 10, 5, CAB); curve(g, 24, 10, 46, 18, 6, CAB); curve(g, 18, 12, 9, 22, 4, CAB3);
  }
  // sombra de la copa sobre el suelo: borde inferior mas oscuro, y base con hojas
  outline(g, '#1f2a28', '#3a4a3c');
  // huecos: pocos y deliberados (copa semiabierta). Forma de lente, transparente; labio inferior en sombra
  (o.gaps || []).forEach(function (hp) {
    var hw = hp[2], hh = hp[3], yy, xx;
    for (yy = 0; yy < hh; yy++) { var ins = (yy === 0 || yy === hh - 1) ? 1 : 0; for (xx = ins; xx < hw - ins; xx++) g.set(hp[0] + xx, hp[1] + yy, null); }
    for (xx = 1; xx < hw - 1; xx++) if (g.get(hp[0] + xx, hp[1] + hh)) g.set(hp[0] + xx, hp[1] + hh, '#1f2a28');
  });
  for (i = 0; i < 40; i++) { var lx3 = ax - 11 + Math.floor(r() * 23), ly3 = ay - 1 + Math.floor(r() * 4); if (!g.get(lx3, ly3)) g.set(lx3, ly3, pick(r, ['#a5814f', '#7a5a45', '#6b5a48', '#94975e'])); }
  contact(g, ax, ay + 1, 10, 3, '#2a244070');
  var c = mk(g, ax, ay, 6, 4, { cast: { len: 0.4, a: 0.2 }, p: { tall: true, tree: true, canopy: { x: 2 - ax, y: 1 - ay, w: 48, h: 44 } } });
  return c;
}
props.treeWhite = [
  treeWhite({ seed: 8401, cal: 22, holes: 20, lean: 0, cable: false, masses: [[26, 14, 13, 10, 4.3], [14, 24, 12, 10, 0.4], [38, 23, 12, 10, 2.1], [26, 31, 14, 8, 1.2]], gaps: [[17, 27, 8, 4], [33, 19, 7, 4]] }),
  treeWhite({ seed: 8402, cal: 18, holes: 26, lean: 1, cable: true, masses: [[24, 11, 12, 9, 0.3], [13, 22, 11, 10, 1.4], [37, 21, 13, 11, 3.1], [26, 31, 12, 7, 2.2]], gaps: [[16, 26, 8, 4], [34, 22, 7, 4]] })
];

/* ---- palmeras ---- */
var PALM = ['#27403a', '#3d6247', '#5c8750', '#86a95a', '#b0c476'];
var PDEAD = ['#4a3028', '#7a5a45', '#a5814f', '#c9a66b'];
/* Fronda como pluma ancha de 3 bandas (luz arriba / medio / sombra abajo), con muescas en el borde bajo que insinuan los foliolos.
   Sin lineas finas ni tramado: se lee como masa a 1x. cols = [oscuro, sombra, medio, luz, nervio]. */
function frond(g, cx, cy, ang, L, droop, cols, leaf, n0) {
  var a = ang * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), N = Math.ceil(L * 1.6), k, j, pts = [];
  for (k = 0; k <= N; k++) { var t = k / N; pts.push([cx + ca * L * t, cy + sa * L * t + droop * L * t * t, t]); }
  var wMax = leaf * 0.62;
  for (k = 0; k <= N; k++) {
    var p = pts[k], q = pts[Math.max(0, k - 1)], n = pts[Math.min(N, k + 1)], tx = n[0] - q[0], ty = n[1] - q[1], tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    var nx = -ty, ny = tx; if (ny > 0) { nx = -nx; ny = -ny; }                    // normal hacia arriba (la luz)
    var hw = wMax * Math.pow(Math.sin(Math.PI * (0.08 + 0.78 * p[2])), 0.9) * (1 - p[2] * 0.25);
    if (hw < 0.5) { g.set(p[0], p[1], cols[1]); continue; }
    var up = hw * 0.8, dn = hw * 1.15;
    for (j = -dn; j <= up; j += 0.5) {
      var fx = p[0] + nx * j, fy = p[1] + ny * j, rel = j / (j >= 0 ? up : dn);          // j>0 = lado de la luz
      var col = j > up * 0.35 ? cols[3] : (j > -dn * 0.3 ? cols[2] : cols[1]);
      if (Math.abs(j) < 0.51) col = cols[4] || cols[3];                             // nervio central
      g.set(fx, fy, col);
    }
    if (p[2] > 0.3 && (k + (n0 || 0)) % 4 === 0) { var ex = p[0] - nx * (dn + 0.5), ey = p[1] - ny * (dn + 0.5); g.set(ex, ey, null); g.set(ex - nx, ey - ny, null); }   // muesca de foliolo
  }
}
function palm(o) {
  var W = 44, H = 90, g = new G(W, H), r = rng(o.seed), ay = 84, ax = 22, i, j, y, x;
  var crownX = ax + o.bend, crownY = 24;
  // tronco anillado, con curva suave
  var trunk = [];
  for (y = ay; y >= crownY - 2; y--) {
    var t = (ay - y) / (ay - crownY), cxT = ax + Math.round(o.bend * Math.pow(t, 1.6) + Math.sin(t * 3.2) * o.wave), w = t < 0.12 ? 6 : (t < 0.7 ? 5 : 4), x0 = cxT - Math.floor(w / 2);
    trunk.push([cxT, y]);
    var ring = (y % 3 === 0);
    var cols = w === 4 ? ['#b8a47c', '#8a7658', '#6b5a48', '#4a3f3c'] : (w === 5 ? ['#b8a47c', '#a8956e', '#8a7658', '#6b5a48', '#4a3f3c'] : ['#b8a47c', '#a8956e', '#8a7658', '#8a7658', '#6b5a48', '#4a3f3c']);
    for (i = 0; i < w; i++) g.set(x0 + i, y, ring ? (i === 0 ? '#8a7658' : '#4a3f3c') : cols[i]);
    if (ring && y % 6 === 0) g.set(x0 + 1, y - 1, '#c9b88c');
  }
  for (y = ay - 5; y <= ay; y++) for (x = ax - 4; x <= ax + 3; x++) if (g.get(x, y) && r() < 0.35) g.set(x, y, '#6b5a48');
  // hojas secas colgando (detras del tronco, pegadas)
  var cx0 = crownX, cy0 = crownY;
  o.dead.slice(0, 2).forEach(function (d) { frond(g, cx0, cy0, d[0], d[1] * 0.8, d[2], [PDEAD[0], PDEAD[0], PDEAD[1], PDEAD[2], PDEAD[3]], 3.4, 1); });
  // frondas: primero las del fondo (arriba), al final las del frente
  o.fronds.forEach(function (f, k) {
    var lit = f[0] < -90 && f[0] > -200 ? 1 : 0;           // hacia la luz (arriba-izquierda)
    var cols = lit ? [PALM[0], PALM[1], PALM[2], PALM[3], PALM[4]] : [PALM[0], PALM[0], PALM[1], PALM[2], PALM[3]];
    if (f[3]) cols = [PALM[0], PALM[0], PALM[1], PALM[1], PALM[2]];       // fondo, en sombra
    frond(g, cx0, cy0, f[0], f[1], f[2], cols, o.leaf, k);
  });
  // racimo de datiles bajo la corona
  [[0, 3], [-3, 4], [2, 5], [-1, 6]].forEach(function (d) { g.disc(crownX + d[0], crownY + d[1] + 1, 1.5, '#7a5a45'); g.set(crownX + d[0] - 1, crownY + d[1], '#c9a66b'); });
  g.rect(crownX - 2, crownY, 5, 2, '#5c8750');
  outline(g, '#1b2a26', '#2f4a3e');
  // base: tierra y hojas
  for (i = 0; i < 24; i++) { var lx = ax - 8 + Math.floor(r() * 17), ly = ay + Math.floor(r() * 3); if (!g.get(lx, ly)) g.set(lx, ly, pick(r, ['#a5814f', '#7a5a45', '#6b5a48', '#8a7658'])); }
  contact(g, ax, ay + 1, 7, 2.5, '#2a244070');
  return mk(g, ax, ay, 4, 4, { cast: { len: 0.4, a: 0.2 }, p: { tall: true, tree: true, canopy: { x: -22, y: -64, w: 44, h: 38 } } });
}
props.palm = [
  palm({ seed: 8501, bend: 2, wave: 1.0, leaf: 5.5, dead: [[96, 13, 0.2], [74, 12, 0.2]],
    fronds: [[-98, 17, 0.12, 1], [-80, 16, 0.12, 1], [-128, 22, 0.35], [-52, 22, 0.35], [-165, 22, 0.62], [-15, 22, 0.62], [152, 16, 0.6], [28, 16, 0.6]] }),
  palm({ seed: 8502, bend: -3, wave: -1.5, leaf: 5, dead: [[104, 15, 0.25], [88, 11, 0.2], [70, 14, 0.2]],
    fronds: [[-92, 18, 0.1, 1], [-122, 22, 0.35], [-60, 21, 0.35], [-160, 22, 0.6], [-22, 22, 0.6], [170, 16, 0.6], [10, 17, 0.6], [-108, 15, 0.2, 1]] })
];

/* ============================ CONO, BARRERA, QUIOSCO, TRICICLO ============================ */
var ORG = ['#ff9a3a', '#e8742a', '#b8501f', '#7a2f1c'];
function propCono() {
  var g = new G(14, 16), cx = 7, ay = 12;
  var shape = [[0, 0], [0, 0], [1, 1], [1, 1], [1, 1], [2, 2], [2, 2], [3, 3]];               // semi-ancho por fila (desde y=2)
  var white = { 3: 1, 4: 1 };
  for (var j = 0; j < 8; j++) {
    var hw = [0, 0, 1, 1, 2, 2, 3, 3][j], y = 3 + j;
    for (var i = -hw - 1; i <= hw; i++) {
      var k = i === -hw - 1 ? 0 : (i === hw ? 3 : (i < 0 ? 1 : 2));
      var isW = (j === 2 || j === 3);
      var col = isW ? ['#f3efe2', '#e2dfd2', '#c9c5b5', '#a8a59c'][k] : ORG[k];
      g.set(cx + i, y, col);
    }
  }
  g.rect(cx - 5, ay - 1, 10, 2, '#2d2a33'); g.rect(cx - 5, ay - 1, 10, 1, '#4a4756'); g.set(cx - 5, ay - 1, '#6a687a');
  g.set(cx - 1, 2, ORG[0]); g.set(cx, 2, ORG[1]);
  outline(g, K, '#5a2a1c');
  contact(g, cx + 1, ay + 1, 6, 1.6);
  return mk(g, cx, ay, 0, 0, { cast: { len: 0.55, a: 0.22 } });
}
props.cono = propCono();

function propBarrera() {
  var W = 38, g = new G(W, 26), r = rng(8701), ay = 22, cx = 19, x, y;
  function beam(x0, x1, y0, h, c1, c2) {
    for (y = y0; y < y0 + h; y++) for (x = x0; x <= x1; x++) {
      var st = (((x + y) >> 2) % 2 === 0) ? c1 : c2;
      g.set(x, y, y === y0 ? mix(st, '#ffffff', 0.25) : (y === y0 + h - 1 ? mix(st, '#2a2440', 0.4) : st));
    }
  }
  [[5, 1], [32, -1]].forEach(function (f) {                       // caballetes en A
    var fx = f[0];
    g.line(fx - 3, ay, fx, 5, ST.dp); g.line(fx - 2, ay, fx + 1, 5, ST.bs); g.line(fx + 4, ay, fx, 5, ST.dp); g.line(fx + 3, ay, fx - 1, 5, ST.sh);
    g.rect(fx - 4, ay, 3, 1, ST.dp); g.rect(fx + 2, ay, 3, 1, ST.dp);
  });
  beam(2, 35, 5, 4, '#c8433a', '#e8e2d2');
  beam(4, 33, 11, 3, '#e6c85a', '#2d2a33');
  g.rect(11, 14, 17, 8, '#e8e2d2'); g.rect(11, 14, 17, 1, '#ffffff'); g.rect(12, 15, 15, 6, '#a8332a'); g.rect(11, 21, 17, 1, '#a8a59c');
  px.text(g, 'ALTO', 12, 16, { font: 'a5', ink: '#f3efe2' });
  speck(g, r, 10, 2, 5, 35, 14, ['#8a4b38', '#6f3b2e']);
  for (x = 0; x < 6; x++) g.set(34 + (x > 2 ? 1 : 0), 9 + x, x % 2 ? '#2d2a33' : '#e6c85a');   // cinta colgando
  outline(g, K, '#5a2a2a');
  contact(g, cx, ay + 1, 18, 2);
  return mk(g, cx, ay, 32, 4, { cast: { len: 0.5, a: 0.2 } });
}
props.barrera = propBarrera();

function propQuiosco(brk) {
  var W = 46, H = 54, g = new G(W, H), r = rng(8801), ay = 48, ax = 23, x, y, i;
  var GR = RP.botella;                                            // verde botella, 4 pasos
  // techo (cara superior, 3/4): trapecio con polvo y mancha de agua
  for (y = 2; y <= 9; y++) { var ins = Math.round((9 - y) * 0.4); for (x = 4 + ins; x <= 41 - ins; x++) g.set(x, y, y < 4 ? GR[3] : (y < 8 ? GR[2] : GR[1])); }
  g.rect(4, 2, 38, 1, '#8fb0b8'); speck(g, r, 24, 5, 3, 40, 9, ['#6e8a7e', GR[3], '#a4abaa']);
  g.rect(9, 5, 6, 2, '#3f6a60'); g.set(8, 6, '#3f6a60'); g.rect(30, 4, 3, 1, '#d8d4c4'); g.rect(29, 5, 2, 1, '#e2dfd2');
  // friso con el nombre (blanco hueso) y filete
  g.rect(3, 10, 40, 8, '#e8e2d2'); g.rect(3, 10, 40, 1, '#ffffff'); g.rect(3, 17, 40, 1, '#a8a59c'); g.rect(3, 11, 1, 6, '#f3efe2'); g.rect(42, 11, 1, 6, '#c9c5b5');
  px.text(g, 'DON PACO', 8, 11, { font: 'a5', ink: '#8f3a32' });
  g.rect(8, 16, 31, 1, '#b05a44'); for (x = 9; x < 39; x += 7) g.set(x, 17, '#8f3a32');        // chorrera de pintura
  // costados verdes del marco
  g.rect(3, 18, 3, 25, GR[2]); g.rect(3, 18, 1, 25, GR[3]); g.rect(40, 18, 3, 25, GR[1]); g.rect(42, 18, 1, 25, GR[0]);
  // persiana corrugada cerrada
  for (y = 18; y <= 40; y++) for (x = 6; x <= 39; x++) {
    var rib = (y % 3 === 0) ? '#7e868a' : (y % 3 === 1 ? '#a4abaa' : '#8a939a');
    g.set(x, y, rib);
  }
  g.rect(6, 18, 34, 1, '#5c6570'); g.rect(6, 19, 34, 1, '#3b4250');                                // caja del rollo, sombra
  for (y = 33; y <= 40; y++) for (x = 6; x <= 39; x++) if (g.get(x, y) && r() < 0.28 * (y - 31) / 9) g.set(x, y, pick(r, ['#8a4b38', '#6f3b2e', '#a0603f']));
  g.rect(6, 40, 34, 1, '#5c6570'); g.rect(21, 38, 4, 3, '#cfd3cc'); g.rect(22, 39, 2, 2, K); g.set(21, 38, '#ffffff');   // candado
  g.rect(13, 24, 8, 6, '#e8e2d2'); g.rect(13, 24, 8, 1, '#ffffff'); g.rect(14, 26, 6, 1, '#8c8a93'); g.rect(14, 28, 4, 1, '#8c8a93'); g.rect(14, 25, 3, 1, NEON.pink);      // pegatina de revista
  g.rect(28, 22, 7, 5, NEON.yellow); g.rect(29, 23, 5, 1, K); g.rect(29, 25, 3, 1, K);                                                                                    // aviso
  // mostrador y base
  g.rect(3, 41, 40, 3, '#6b4223'); g.rect(3, 41, 40, 1, '#c99458'); g.rect(3, 43, 40, 1, '#4a3028');
  g.rect(4, 44, 38, 4, GR[1]); g.rect(4, 44, 38, 1, GR[2]); g.rect(4, 47, 38, 1, GR[0]); speck(g, r, 10, 5, 44, 40, 47, ['#8a4b38', '#6f3b2e']);
  g.rect(5, 48, 4, 1, ST.dp); g.rect(37, 48, 4, 1, ST.dp);
  if (brk) brokenQuiosco(g, r);
  outline(g, K, '#16352f');
  // revistas en el piso y un banquito
  [[33, 47, '#e8483a'], [35, 46, '#38c8e8'], [34, 45, '#f2e63c']].forEach(function (m) { g.rect(m[0], m[1], 7, 2, m[2]); g.rect(m[0], m[1], 7, 1, mix(m[2], '#ffffff', 0.4)); });
  g.rect(36, 44, 3, 1, '#e2dfd2');
  contact(g, ax, ay + 2, 20, 2.5);
  return mk(g, ax, ay + 2, 34, 10, { cast: { len: 0.38, a: 0.2 }, p: { tall: true } });
}
props.quiosco = propQuiosco();

function wheel(g, cx, cy, rr) {
  g.disc(cx, cy, rr, '#25232c'); g.disc(cx, cy, rr - 1.3, '#8d8b84'); g.disc(cx, cy, rr - 2.2, '#3a3844');
  for (var a = 0; a < 4; a++) { var an = a * Math.PI / 4; g.line(cx - Math.cos(an) * (rr - 2), cy - Math.sin(an) * (rr - 2), cx + Math.cos(an) * (rr - 2), cy + Math.sin(an) * (rr - 2), '#c9c9be'); }
  g.set(cx, cy, '#e2dfd2');
}
function propTriciclo(brk) {
  var W = 48, H = 38, g = new G(W, H), r = rng(8901), ay = 33, x, y;
  // plataforma de carga con jabas
  g.rect(2, 19, 22, 3, '#a86e38'); g.rect(2, 19, 22, 1, '#c99458'); g.rect(2, 21, 22, 1, '#6b4223');
  g.rect(3, 22, 2, 5, '#4a3028'); g.rect(21, 22, 2, 5, '#4a3028');
  function crate(x0, y0, c) {
    g.rect(x0, y0, 9, 7, c); g.rect(x0, y0, 9, 1, mix(c, '#ffffff', 0.35)); g.rect(x0, y0 + 6, 9, 1, mix(c, '#2a2440', 0.45)); g.rect(x0 + 8, y0, 1, 7, mix(c, '#2a2440', 0.3));
    for (var s = 2; s < 7; s += 2) g.rect(x0 + 1, y0 + s, 7, 1, mix(c, '#2a2440', 0.4));
  }
  crate(3, 12, '#3f5f8a'); crate(13, 12, '#a8453a'); crate(8, 5, '#c9a23c');
  g.rect(9, 5, 3, 3, '#e8742a'); g.rect(11, 6, 3, 3, '#d9a63c'); g.disc(13, 6, 1.5, '#6f9a4f');          // limones, naranjas
  g.line(2, 14, 23, 10, '#d8d4c4'); g.line(2, 15, 23, 11, '#a8a59c');                                     // cuerda
  // chasis, asiento, manubrio, horquilla
  g.line(24, 22, 36, 28, '#8a3a32'); g.line(24, 23, 36, 29, '#5b1d1d'); g.line(24, 22, 30, 15, '#8a3a32'); g.line(30, 15, 36, 28, '#b04a3e');
  g.line(36, 28, 35, 16, '#3b4250'); g.line(33, 14, 38, 13, '#2d2a33'); g.rect(32, 14, 7, 1, '#2d2a33'); g.set(38, 13, '#8c8a93');
  g.rect(27, 12, 6, 2, '#1c1a22'); g.rect(27, 12, 6, 1, '#4a4756'); g.line(30, 14, 30, 16, '#3b4250');
  g.line(24, 22, 27, 27, '#3b4250'); g.disc(27, 28, 2, '#3b4250'); g.disc(27, 28, 1, '#a4abaa');            // plato y pedal
  g.rect(25, 29, 4, 1, '#25232c');
  wheel(g, 12, 28, 5); wheel(g, 37, 28, 5);
  speck(g, r, 8, 2, 19, 23, 21, ['#8a4b38']);
  if (brk) return brokenTriciclo(g);
  outline(g, K, '#3a1c2c');
  contact(g, 24, ay + 1, 20, 2);
  return mk(g, 24, ay, 39, 10, { cast: { len: 0.5, a: 0.2 } });
}
props.triciclo = propTriciclo();

/* ============================ VENDEDORES: EMOLIENTE y ANTICUCHOS ============================ */
function propEmoliente(brk) {
  var W = 38, H = 48, g = new G(W, H), r = rng(9001), ay = 43, cx = 19, i, j, x, y;
  // sombrilla vista en 3/4: 8 cuñas crema y verde azulado, aro oscuro abajo
  var ucx = 18, ucy = 9, urx = 17, ury = 6;
  for (y = 1; y <= (brk ? 0 : 14); y++) for (x = 0; x < W; x++) {
    var dx = (x - ucx) / urx, dy = (y - ucy) / ury;
    var d = dx * dx + dy * dy; if (d > 1) continue;
    var ang = Math.atan2(dy, dx), w = Math.floor(((ang + Math.PI) / (2 * Math.PI)) * 8) % 2;
    var lit = -(dx * 0.5 + dy * 0.8);
    var base = w ? ['#f0e8cc', '#dcd2b0', '#b8ae8c'] : ['#6fa3a0', '#4d8a8a', '#336666'];
    g.set(x, y, lit > 0.25 ? base[0] : (lit > -0.35 ? base[1] : base[2]));
  }
  for (x = 1; x < (brk ? 1 : W - 1); x++) { var dx2 = (x - ucx) / urx, yb = Math.round(ucy + Math.sqrt(Math.max(0, 1 - dx2 * dx2)) * ury); if (yb > ucy) { g.set(x, yb + 1, '#2d4a4a'); if (x % 4 < 2) g.set(x, yb + 2, '#2d4a4a'); } }
  g.set(ucx, 0, '#a86e38'); g.set(ucx, 1, '#6b4223');
  g.rect(ucx, 12, 1, 14, '#6b4223'); g.set(ucx - 1, 12, '#a86e38');
  // anaquel de botellas de vidrio (rampa rojo/ambar/verde) y termo
  g.rect(6, 22, 26, 1, '#4a3028');
  [['#a8453a', '#e06a52'], ['#b9853a', '#e0b45a'], ['#6f9a4f', '#a8d078'], ['#a8453a', '#e06a52'], ['#b9853a', '#e0b45a'], ['#6f9a4f', '#a8d078']].forEach(function (b, k) {
    var bx = 8 + k * 3; g.rect(bx, 15, 2, 7, b[0]); g.rect(bx, 15, 1, 7, b[1]); g.rect(bx, 14, 2, 1, '#c9c5b5'); g.set(bx, 16, '#ffffff');
  });
  g.rect(27, 12, 6, 11, '#9ea3a6'); g.rect(27, 12, 2, 11, '#d8dcd6'); g.rect(32, 12, 1, 11, '#6d7275'); g.rect(27, 11, 6, 1, '#a8453a'); g.rect(33, 16, 2, 1, '#6d7275'); g.set(34, 17, '#3b4250');
  // carreta: cajon de madera con tablas, un rotulo pintado a mano y ruedas de bicicleta
  g.rect(3, 23, 31, 14, '#7a5a3a'); g.rect(3, 23, 31, 2, '#a86e38'); g.rect(3, 23, 31, 1, '#c99458'); g.rect(3, 36, 31, 1, '#4a3028');
  [10, 17, 24, 31].forEach(function (xx) { g.rect(xx, 25, 1, 11, '#5a3a22'); });
  g.rect(5, 27, 4, 7, '#4a3028'); g.rect(5, 27, 4, 1, '#8c6a46');
  g.rect(18, 27, 6, 5, '#a8453a'); g.rect(18, 27, 6, 1, '#d86a52'); g.rect(19, 29, 4, 1, '#f3efe2'); g.rect(20, 28, 2, 3, '#f3efe2');               // letrero con una taza
  g.rect(19, 28, 1, 1, '#a8453a'); g.rect(22, 28, 1, 1, '#a8453a');
  g.line(3, 27, 0, 36, '#a86e38'); g.line(4, 27, 1, 36, '#6b4223');                                                    // manubrio
  g.rect(6, 37, 1, 4, '#3d3d3d'); g.rect(29, 37, 1, 4, '#3d3d3d');
  wheel(g, 12, 39, 4); wheel(g, 27, 39, 4);
  speck(g, r, 12, 4, 24, 33, 35, ['#5a3a22', '#8c6a46']);
  if (brk) return brokenEmoliente();
  outline(g, K, '#2c1e1a');
  // vasos tirados
  g.rect(31, 42, 2, 2, '#d8d4c4'); g.set(31, 42, '#ffffff'); g.rect(34, 43, 3, 1, '#d8d4c4'); g.rect(2, 43, 2, 1, '#e2dfd2');
  contact(g, cx, ay + 1, 16, 2.5);
  return mk(g, cx, ay, 31, 8, { cast: { len: 0.45, a: 0.2 }, p: { smoke: { x: 30 - cx, y: 11 - ay } } });
}
props.emoliente = propEmoliente();

function propAnticuchos(brk) {
  var W = 40, H = 44, g = new G(W, H), r = rng(9101), ay = 39, cx = 20, i, j, x, y;
  // parrilla: tambor cortado con brasas
  g.rect(8, 22, 22, 10, '#4d4a45'); g.rect(8, 22, 22, 1, '#7e868a'); g.rect(8, 23, 1, 9, '#6a6a64'); g.rect(29, 23, 1, 9, '#2d2a33'); g.rect(8, 31, 22, 1, '#2d2a33');
  g.rect(9, 20, 20, 3, '#1c1a22');
  for (x = 10; x < 29; x++) g.set(x, 21, (x * 7 + 3) % 5 < 3 ? '#ff8a2a' : '#d2562a');
  [12, 16, 21, 25].forEach(function (xx) { g.set(xx, 21, '#ffd24a'); });
  for (x = 7; x <= 30; x += 2) g.set(x, 20, '#2d2a33');                                                              // barrotes
  // brochetas: palitos con carne, papa y choclo
  for (x = 9; x < 29; x += 3) { g.rect(x, 17, 2, 3, '#6b3f2a'); g.set(x, 17, '#8a5a3a'); g.set(x + 1, 19, '#3a2014'); g.set(x, 20, '#4a2a1c'); g.set(x + 1, 16, '#c9b890'); }
  g.set(12, 17, '#d9a63c'); g.set(24, 17, '#d9a63c');
  g.line(8, 15, 30, 15, '#c9b890');
  // mesita de madera y patas, rueda de bicicleta, manubrio
  g.rect(8, 32, 22, 2, '#6b4223'); g.rect(8, 32, 22, 1, '#a86e38');
  g.rect(10, 34, 2, 5, '#3d3d3d'); g.rect(26, 34, 2, 5, '#3d3d3d');
  g.line(8, 27, 2, 36, '#a86e38'); g.line(8, 28, 3, 37, '#6b4223');
  wheel(g, 31, 35, 4);
  // olla con salsa, cucharon; botella de aji; banquito volcado
  g.rect(1, 26, 7, 6, '#7a7e82'); g.rect(1, 26, 7, 1, '#cfd3cc'); g.rect(1, 27, 1, 5, '#a4abaa'); g.rect(2, 27, 5, 1, '#a8453a'); g.rect(0, 28, 1, 2, '#3b4250'); g.rect(8, 28, 1, 2, '#3b4250');
  g.rect(33, 25, 4, 8, '#a8453a'); g.rect(33, 25, 1, 8, '#d86a52'); g.rect(34, 23, 2, 2, '#f3efe2'); g.rect(34, 28, 2, 2, '#f3efe2');
  g.rect(34, 36, 6, 1, '#8a6a40'); g.rect(35, 37, 1, 3, '#6b4223'); g.rect(39, 37, 1, 3, '#6b4223');
  speck(g, r, 10, 8, 23, 29, 31, ['#2d2a33', '#6a6a64']);
  if (brk) return brokenAnticuchos();
  outline(g, K, '#3a1c2c');
  contact(g, cx, ay + 1, 18, 2.5);
  return mk(g, cx, ay, 33, 8, { cast: { len: 0.45, a: 0.2 }, p: { smoke: { x: 14 - cx, y: 14 - ay } } });
}
props.anticuchos = propAnticuchos();

/* ============================ BASURA y RASTROS ============================ */
var BAG = ['#14121a', '#24222c', '#3a3844', '#55526a', '#7c7a92'];
function bagBlob(g, cx, cy, rx, ry, seed, tint) {
  var rr = rng(seed), x, y;
  for (y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry, a = Math.atan2(dy, dx), e = 1 + 0.12 * Math.sin(a * 4 + seed), d = Math.sqrt(dx * dx + dy * dy) / e;
    if (d > 1) continue;
    var lit = -(dx * 0.55 + dy * 0.85), t = 0.5 - lit * 0.5;
    var pal = tint || BAG;
    g.set(x, y, t < 0.18 ? pal[3] : t < 0.45 ? pal[2] : t < 0.8 ? pal[1] : pal[0]);
  }
  var hx = Math.round(cx - rx * 0.35), hy = Math.round(cy - ry * 0.5);                 // brillo de plastico
  g.set(hx, hy, (tint || BAG)[4]); g.set(hx + 1, hy, (tint || BAG)[4]); g.set(hx, hy + 1, (tint || BAG)[3]);
  g.set(Math.round(cx + 1), Math.round(cy - ry), (tint || BAG)[1]); g.set(Math.round(cx), Math.round(cy - ry - 1), (tint || BAG)[1]);   // nudo
}
function propTrash() {
  var g = new G(28, 30), r = rng(9201), ay = 25, cx = 13, i, j, x, y;
  var GR = RP.botella;
  // tacho de plastico verde con nervaduras
  for (y = 12; y <= ay; y++) { var hw = 5 + Math.floor((y - 12) / 7); for (x = cx - hw; x <= cx + hw; x++) { var k = x - (cx - hw), w = hw * 2; g.set(x, y, k === 0 ? GR[3] : k < 3 ? GR[2] : k > w - 2 ? GR[0] : GR[1]); if (y % 4 === 0) g.set(x, y, mix(g.get(x, y), '#000000', 0.2)); } }
  g.rect(cx - 7, 11, 15, 2, '#5a8f80'); g.rect(cx - 7, 11, 15, 1, '#8dbcae'); g.rect(cx + 7, 12, 1, 1, GR[0]);
  g.rect(cx - 2, 18, 5, 3, '#e2dfd2'); g.rect(cx - 2, 18, 5, 1, '#ffffff'); g.set(cx, 19, '#8f3a32');
  // tapa levantada
  g.rect(cx - 11, 7, 6, 2, GR[2]); g.rect(cx - 11, 7, 6, 1, GR[3]); g.line(cx - 8, 9, cx - 6, 11, GR[0]);
  // bolsas desbordando
  bagBlob(g, cx - 3, 8, 5, 4.5, 11); bagBlob(g, cx + 4, 6, 4.5, 4, 22);
  bagBlob(g, cx + 12, ay - 2, 3.5, 3, 33, ['#14121a', '#24222c', '#3a3844', '#55526a', '#7c7a92']);
  // basura regada
  g.rect(cx - 14, ay - 1, 2, 3, '#8fb0b8'); g.set(cx - 14, ay - 1, '#ffffff'); g.rect(cx - 12, ay + 1, 3, 1, '#d8d4c4'); g.rect(cx + 8, ay + 1, 3, 2, '#e8483a'); g.set(cx + 8, ay + 1, '#f09080');
  g.rect(cx + 6, ay + 2, 2, 1, '#cfd3cc'); g.rect(cx - 9, ay + 2, 2, 2, '#e2dfd2'); g.set(cx - 9, ay + 2, '#ffffff'); g.rect(cx + 11, ay + 1, 2, 1, '#d9a63c');
  outline(g, K, '#1f3a36');
  contact(g, cx + 1, ay + 2, 12, 2.5);
  return mk(g, cx, ay, 22, 6, { cast: { len: 0.5, a: 0.2 } });
}
props.trash = propTrash();

function propBags() {
  var g = new G(30, 22), r = rng(9301), ay = 18, cx = 15;
  bagBlob(g, 9, 13, 7, 4.8, 41); bagBlob(g, 19, 12, 6.5, 5, 52); bagBlob(g, 14, 8, 5.5, 4.2, 63);
  bagBlob(g, 24, 15, 4, 3, 74, ['#2f4a70', '#3f5f8a', '#5a7ea0', '#8aa8c8', '#c0d4e2']);
  g.rect(3, 15, 2, 2, '#d9a63c'); g.set(3, 15, '#e0c47a'); g.rect(26, 16, 2, 1, '#e8483a'); g.rect(1, 17, 3, 1, '#e2dfd2'); g.rect(6, 17, 2, 1, '#8fb0b8');
  g.rect(12, 16, 2, 1, '#d9a63c');
  outline(g, K, '#16141c');
  contact(g, cx, ay + 1, 14, 2.4);
  return mk(g, cx, ay, 22, 8, { cast: { len: 0.5, a: 0.2 } });
}
props.bags = propBags();

function propBolsas(v, brk) {
  var g = new G(34, 22), r = rng(9400 + v), ay = 18, cx = 17;
  if (v === 0) {                                                  // maleta rodante caida + mochila escolar
    g.rect(2, 8, 18, 9, '#8a3a32'); g.rect(2, 8, 18, 2, '#b04a3e'); g.rect(2, 8, 18, 1, '#d86a52'); g.rect(2, 16, 18, 1, '#5b1d1d'); g.rect(19, 9, 1, 8, '#5b1d1d');
    g.rect(4, 11, 14, 1, '#6a2a26'); g.rect(4, 14, 14, 1, '#6a2a26'); g.rect(8, 9, 2, 8, '#6a2a26');
    g.rect(15, 11, 3, 3, '#d9c27a'); g.set(15, 11, '#f0e0a0'); g.set(4, 9, '#e8483a');                   // etiquetas
    g.rect(20, 11, 7, 1, '#25232c'); g.rect(26, 7, 1, 5, '#25232c'); g.rect(1, 17, 3, 2, '#25232c'); g.rect(17, 17, 3, 2, '#25232c');   // asa y ruedas
    g.rect(21, 12, 11, 8, '#2f4470'); g.rect(21, 12, 11, 2, '#4a6498'); g.rect(21, 12, 11, 1, '#7a92c0'); g.rect(21, 19, 11, 1, '#1d2a48'); g.rect(31, 13, 1, 6, '#1d2a48');
    g.rect(23, 15, 6, 3, '#1d2a48'); g.rect(23, 15, 6, 1, '#e6c85a'); g.rect(24, 10, 4, 2, '#25232c'); g.rect(25, 9, 2, 1, '#25232c');
  } else {                                                        // bolso deportivo, costal de yute y bolsa plastica
    g.rect(1, 9, 17, 8, '#2f5a52'); g.rect(1, 9, 17, 2, '#3f7266'); g.rect(1, 9, 17, 1, '#5a8f80'); g.rect(1, 16, 17, 1, '#1f3a36'); g.rect(17, 10, 1, 7, '#1f3a36');
    g.rect(3, 12, 13, 1, '#e8e2d2'); g.rect(4, 13, 5, 1, '#e8e2d2'); g.rect(5, 7, 8, 2, '#1f3a36'); g.rect(6, 7, 6, 1, '#3f7266');
    g.line(8, 7, 14, 7, '#14121a');
    for (var y = 6; y <= 17; y++) { var hw = 4 + Math.round(Math.sin((y - 6) / 11 * 3.1) * 2); for (var x = 24 - hw; x <= 24 + hw; x++) g.set(x, y, ((x + y) % 3 === 0) ? '#8a7658' : (x < 24 - hw + 2 ? '#c9b890' : '#a8956e')); }
    g.rect(21, 6, 7, 1, '#6b5a48'); g.line(22, 5, 26, 5, '#8a7658'); g.rect(20, 11, 9, 1, '#6b5a48'); g.set(22, 17, '#6b5a48'); g.set(26, 16, '#6b5a48');
    g.rect(28, 12, 5, 6, '#e2dfd2'); g.rect(28, 12, 5, 1, '#ffffff'); g.rect(29, 14, 3, 1, '#a8332a'); g.rect(29, 16, 2, 1, '#2f4470'); g.set(32, 17, '#c9c5b5');
  }
  if (brk) spillBolsa(g, v, r);
  speck(g, r, 8, 2, 8, 30, 18, ['#8a8574', '#6b5a48']);
  outline(g, K, '#2a1c28');
  contact(g, cx, ay + 2, 16, 2.4);
  return mk(g, cx, ay, 26, 6, { cast: { len: 0.55, a: 0.2 } });
}
props.bolsas = [propBolsas(0), propBolsas(1)];

function propZapatilla() {
  var g = new G(14, 10), ay = 6, cx = 7;
  g.rect(1, 4, 11, 2, '#e8e2d2'); g.rect(1, 4, 11, 1, '#ffffff'); g.rect(1, 5, 11, 1, '#a8a59c'); g.set(0, 5, '#e8e2d2'); g.set(12, 4, '#e8e2d2');
  g.rect(2, 1, 6, 3, '#4a6498'); g.rect(2, 1, 6, 1, '#7a92c0'); g.rect(7, 2, 4, 2, '#3a5084'); g.rect(2, 3, 9, 1, '#2f4470');
  g.rect(8, 0, 3, 2, '#2f4470'); g.set(8, 0, '#4a6498');                           // talon
  g.set(4, 2, '#f3efe2'); g.set(5, 1, '#f3efe2'); g.set(6, 2, '#f3efe2');       // cordones
  g.rect(1, 2, 2, 2, '#e8e2d2'); g.set(1, 2, '#ffffff'); g.set(11, 3, '#2a1c28'); g.set(3, 3, '#a8332a');
  outline(g, K, '#243050');
  contact(g, cx, ay + 2, 7, 1.6);
  return mk(g, cx, ay, 0, 0, { cast: { len: 0.4, a: 0.2 } });
}
props.zapatilla = propZapatilla();

function propCocheBebe() {
  var g = new G(34, 34), ay = 30, cx = 17, i, x, y;
  // capota en media luna, gris azulado, con costillas
  for (y = 5; y <= 17; y++) for (x = 2; x <= 22; x++) {
    var dx = (x - 12) / 11, dy = (y - 17) / 12; if (dx * dx + dy * dy > 1 || y > 16) continue;
    var rib = (x % 4 === 1), lit = -(dx * 0.6 + dy * 0.7);
    g.set(x, y, rib ? '#2a3a4a' : (lit > 0.2 ? '#7a9aaa' : lit > -0.3 ? '#5f8294' : '#46647a'));
  }
  g.rect(2, 16, 21, 1, '#2d3d4a');
  // cuerpo: cesta con acabado crema sucio, borde cromado
  g.rect(3, 17, 26, 8, '#d8c8a8'); g.rect(3, 17, 26, 1, '#efe4cc'); g.rect(3, 24, 26, 1, '#a8956e'); g.rect(28, 18, 1, 6, '#a8956e');
  g.rect(3, 19, 26, 1, '#b8a888'); g.rect(3, 22, 26, 1, '#b8a888'); speck(g, rng(9501), 14, 4, 18, 28, 24, ['#a8956e', '#c9b890', '#8a7658']);
  g.rect(2, 15, 28, 2, '#cfd3cc'); g.rect(2, 15, 28, 1, '#ffffff'); g.rect(29, 16, 1, 2, '#7e868a');
  // manta amarilla colgando por el costado
  g.rect(18, 17, 9, 3, '#d9c27a'); g.rect(18, 17, 9, 1, '#f0e0a0'); g.rect(19, 19, 3, 4, '#d9c27a'); g.rect(19, 21, 3, 2, '#b8a45a'); g.rect(23, 18, 1, 2, '#e8483a'); g.rect(25, 18, 1, 2, '#e8483a');
  // manillar cromado hacia atras, inclinado
  g.line(28, 14, 33, 8, '#cfd3cc'); g.line(29, 14, 33, 9, '#7e868a'); g.rect(32, 6, 2, 3, '#25232c');
  // ruedas con rayos; la de atras mas chica
  g.line(7, 25, 7, 28, '#7e868a'); g.line(24, 25, 24, 28, '#7e868a');
  wheel(g, 7, 28, 3.6); wheel(g, 24, 28, 3.6);
  outline(g, K, '#2a3a4a');
  contact(g, cx, ay + 1, 15, 2.4);
  return mk(g, cx, ay, 26, 8, { cast: { len: 0.5, a: 0.2 } });
}
props.cocheBebe = propCocheBebe();

/* ============================ BARRICADAS (solo visuales) ============================ */
function tire(g, cx, cy, rx, ry) {                              // llanta vista en 3/4: elipse con hueco y brillo
  g.ell(cx, cy, rx, ry, '#25232c');
  g.ell(cx, cy, rx - 1, ry - 0.8, '#33313c');
  g.ell(cx, cy - 0.5, rx * 0.5, ry * 0.45, '#101014');
  g.set(Math.round(cx - rx * 0.6), Math.round(cy - ry * 0.5), '#5a5868'); g.set(Math.round(cx - rx * 0.4), Math.round(cy - ry * 0.7), '#5a5868');
  g.set(Math.round(cx + rx * 0.5), Math.round(cy + ry * 0.5), '#1a181f');
}
function calamina(g, x0, y0, w, h, lean, seed) {              // chapa de calamina inclinada, con ondas verticales
  var r = rng(seed), x, y;
  for (y = 0; y < h; y++) {
    var off = Math.round(lean * (1 - y / h));
    for (x = 0; x < w; x++) {
      var ph = x % 4, col = ['#cfd3cc', '#a4abaa', '#7e868a', '#8a939a'][ph];
      if (y < 2) col = '#e2e6df';
      g.set(x0 + x + off, y0 + y, col);
    }
  }
  for (var i = 0; i < w * h * 0.03; i++) { var rx = Math.floor(r() * w), ry = Math.floor(r() * h); var off2 = Math.round(lean * (1 - ry / h)); if (g.get(x0 + rx + off2, y0 + ry)) g.set(x0 + rx + off2, y0 + ry, pick(r, ['#8a4b38', '#6f3b2e', '#a0603f'])); }
}
function propBarricada(v) {
  var W = v === 0 ? 72 : 56, H = v === 0 ? 48 : 40, g = new G(W, H), r = rng(9600 + v), ay = H - 4, x, y, i;
  if (v === 0) {
    // lectura a 1x: ropero volcado al centro, una calamina a cada lado, un cartel encima y una sola fila de llantas delante
    calamina(g, 2, ay - 32, 13, 28, 2, 2);
    calamina(g, 57, ay - 34, 12, 30, -2, 3);
    g.rect(15, ay - 22, 36, 17, '#6b4223'); g.rect(15, ay - 22, 36, 2, '#a86e38'); g.rect(15, ay - 22, 36, 1, '#c99458'); g.rect(15, ay - 6, 36, 1, '#4a3028');
    g.rect(15, ay - 20, 1, 14, '#8c5a2f'); g.rect(50, ay - 20, 1, 14, '#3a2218');
    g.rect(18, ay - 19, 14, 12, '#5a3820'); g.rect(34, ay - 19, 14, 12, '#5a3820'); g.rect(18, ay - 19, 14, 1, '#7a4c2a'); g.rect(34, ay - 19, 14, 1, '#7a4c2a');
    g.rect(31, ay - 15, 1, 4, '#d9c27a'); g.rect(34, ay - 15, 1, 4, '#d9c27a');
    g.rect(15, ay - 34, 37, 11, '#d8d4c4'); g.rect(15, ay - 34, 37, 1, '#efebdc'); g.rect(15, ay - 24, 37, 1, '#a8a59c');
    px.text(g, 'NO PASAR', 18, ay - 31, { font: 'a5', ink: '#a8332a' });
    g.line(10, ay - 24, 20, ay - 8, '#3b4250');                                                  // alambre
    [8, 22, 36, 50, 62].forEach(function (cx, k) { tire(g, cx, ay - 2 - (k % 2), 6, 4); });
  } else {
    // sofa volcado, mesa con patas al aire, jabas y llantas
    g.rect(4, ay - 18, 30, 14, '#6a3a3a'); g.rect(4, ay - 18, 30, 3, '#8f5050'); g.rect(4, ay - 18, 30, 1, '#b07070'); g.rect(4, ay - 5, 30, 1, '#3a1c1c');
    g.rect(4, ay - 16, 5, 12, '#5a2f2f'); g.rect(29, ay - 16, 5, 12, '#5a2f2f'); g.rect(10, ay - 12, 18, 1, '#7a4040'); g.rect(10, ay - 9, 18, 1, '#7a4040');
    g.rect(6, ay - 4, 3, 3, '#3a2218'); g.rect(30, ay - 4, 3, 3, '#3a2218');
    g.rect(30, ay - 30, 22, 3, '#a86e38'); g.rect(30, ay - 30, 22, 1, '#c99458');                    // tablero de mesa
    [32, 49].forEach(function (xx) { g.rect(xx, ay - 27, 2, 16, '#6b4223'); g.set(xx, ay - 27, '#a86e38'); });
    g.line(34, ay - 27, 48, ay - 12, '#4a3028');
    g.rect(34, ay - 14, 10, 8, '#3f5f8a'); g.rect(34, ay - 14, 10, 1, '#7a92c0'); g.rect(34, ay - 6, 10, 1, '#1d2a48'); for (y = ay - 12; y < ay - 6; y += 2) g.rect(35, y, 8, 1, '#2f4470');
    g.rect(42, ay - 20, 9, 7, '#a8453a'); g.rect(42, ay - 20, 9, 1, '#d86a52'); for (y = ay - 18; y < ay - 13; y += 2) g.rect(43, y, 7, 1, '#6f2a22');
    tire(g, 14, ay - 22, 6, 4); tire(g, 14, ay - 26, 6, 4); tire(g, 48, ay - 4, 6, 4); tire(g, 8, ay - 3, 6, 4);
    calamina(g, 18, ay - 34, 10, 14, -2, 4);
    g.rect(2, ay - 7, 1, 1, '#d9c27a');
  }
  if (v) speck(g, r, 12, 0, 0, W - 1, H - 1, ['#2a2440', '#3a302e']);
  outline(g, K, '#2a1c28');
  contact(g, W / 2, ay + 2, W / 2 - 2, 3);
  return mk(g, W >> 1, ay, v === 0 ? 60 : 50, 14, { cast: { len: 0.4, a: 0.2 }, p: { tall: true } });   // huella real (M3): el arte ya no se puede atravesar
}
props.barricada = [propBarricada(0), propBarricada(1)];

/* ============================ CARTELES PINTADOS A MANO (4) ============================ */
/* Se registran como decals.cartel y tambien como props.cartel (los mismos lienzos): sobre cercos y muros van de decal; amarrados a un poste, de prop. */
function cartel(kind) {
  var W, H, g, r = rng(9700 + kind.length), x, y, i;
  if (kind === 'SE VENDE') {                                                    // tabla blanca, letras rojas, telefono tachado
    W = 27; H = 19; g = new G(W, H);
    g.rect(1, 2, 25, 16, '#e2dfd2'); g.rect(1, 2, 25, 1, '#ffffff'); g.rect(1, 17, 25, 1, '#a8a59c'); g.rect(25, 3, 1, 14, '#c9c5b5');
    handText(g, 'SE', 9, 4, '#a8332a', r, true); handText(g, 'VENDE', 4, 11, '#a8332a', r, true);
    [6, 14, 22].forEach(function (xx) { g.set(xx, 16, '#a8332a'); g.set(xx, 17, '#b84a3e'); });
    g.set(0, 3, null); g.set(26, 17, null); g.set(0, 2, null);
  } else if (kind === 'NO HAY AGUA') {                                            // carton oscuro con gota
    W = 31; H = 20; g = new G(W, H);
    g.rect(1, 2, 29, 17, '#b8975e'); g.rect(1, 2, 29, 1, '#d8b878'); g.rect(1, 18, 29, 1, '#7a5a45'); g.rect(29, 3, 1, 15, '#a5814f');
    handText(g, 'NO HAY', 3, 4, K, r, true); handText(g, 'AGUA', 3, 11, K, r, true);
    rows(g, 22, 8, ['..#..', '..#..', '.###.', '#####', '#####', '.###.'], { '#': '#2f6a9a' }); g.set(23, 12, '#8fc0e0'); g.set(22, 11, '#5a9aca');
    speck(g, r, 14, 2, 3, 29, 17, ['#a5814f', '#8c6a46']);
    g.set(30, 2, null); g.set(30, 3, null); g.set(1, 18, null); g.set(2, 18, null);
  } else if (kind === 'AYUDA') {                                                // sabana blanca con letras rojas chorreadas
    W = 29; H = 17; g = new G(W, H);
    for (y = 2; y < 15; y++) for (x = 1; x < 28; x++) g.set(x, y, ((x + y) % 7 === 0) ? '#d8d4c4' : (y < 4 ? '#f3efe2' : '#e8e4d4'));
    for (x = 1; x < 28; x++) g.set(x, 14 + (x % 5 === 0 ? 1 : 0), '#bdb9ab');
    handText(g, 'AYUDA', 5, 5, '#a8332a', r, true);
    [6, 10, 14, 18].forEach(function (xx) { var l = 1 + Math.floor(r() * 3); for (i = 0; i < l; i++) g.set(xx, 11 + i, '#c04a3e'); });
    rows(g, 24, 11, ['..#', '###', '..#'], { '#': '#a8332a' });
  } else {                                                                       // calamina con NO ENTRAR
    W = 31; H = 20; g = new G(W, H);
    for (y = 2; y < 19; y++) for (x = 1; x < 30; x++) g.set(x, y, ['#d8dcd4', '#b4bab6', '#8a939a', '#a4abaa'][x % 4]);
    g.rect(1, 2, 29, 1, '#eef0ea'); g.rect(1, 18, 29, 1, '#6d757c');
    g.rect(3, 4, 25, 12, '#d8d4c4'); g.rect(3, 4, 25, 1, '#efebdc'); g.rect(3, 15, 25, 1, '#a8a59c');
    handText(g, 'NO', 11, 6, '#a8332a', r, false); handText(g, 'ENTRAR', 4, 11, '#a8332a', r, false);
    for (i = 0; i < 6; i++) { g.set(3 + i * 5, 3, '#8a4b38'); }
    g.set(1, 2, '#8a4b38'); g.set(29, 18, '#6f3b2e'); g.set(2, 3, '#6f3b2e');
    speck(g, r, 14, 1, 2, 29, 18, ['#8a4b38', '#6f3b2e']);
  }
  // alambres a los dos extremos superiores y sombra paralela
  g.line(1, 2, 1, 0, '#3b4250'); g.line(W - 2, 2, W - 2, 0, '#3b4250'); g.set(0, 0, '#3b4250'); g.set(W - 1, 0, '#3b4250'); g.set(1, 1, '#cfd3cc'); g.set(W - 2, 1, '#cfd3cc');
  outline(g, K, null);
  return g.toCanvas(W >> 1, H - 1, 0, 0);
}
var CARTELES = ['SE VENDE', 'NO HAY AGUA', 'AYUDA', 'NO ENTRAR'].map(cartel);
decals.cartel = CARTELES;
props.cartel = CARTELES;

/* ============================ CALCOMANIAS: BANDERA y AFICHES CHICHA ============================ */
function decalFlag() {
  var W = 24, H = 18, g = new G(W, H), x, y, RD = ['#d8584a', '#b24a3f', '#8f3a32'], WH = ['#f3efe2', '#e2dfd4', '#bdb9ab'];
  g.line(2, 1, 20, 3, '#6b4223'); g.line(2, 2, 20, 4, '#a86e38'); g.rect(1, 1, 2, 2, '#c99458');                      // palo atravesado
  for (x = 0; x < 18; x++) {                                                                                          // tela ondulada: 3 franjas verticales roja-blanca-roja
    var wave = Math.round(Math.sin(x * 0.55) * 1.0), top = 4, bot = 13 + wave + (x > 11 ? 1 : 0);
    var strip = x < 5 ? 0 : (x < 12 ? 1 : 2);
    for (y = top; y <= bot; y++) {
      var shd = (Math.cos(x * 0.55) < -0.5) ? 2 : (Math.cos(x * 0.55) < 0.2 ? 1 : 0);
      var pal = strip === 1 ? WH : RD;
      g.set(2 + x, y, y >= bot - 1 ? pal[Math.min(2, shd + 1)] : pal[shd]);
    }
    if (x % 5 === 3) g.set(2 + x, bot + 1, (strip === 1 ? WH : RD)[2]);                                              // borde roto
  }
  for (y = 8; y < 11; y++) g.set(9, y + 0, '#c9c5b5');                                                                 // mancha de sol: sin escudo
  g.set(10, 8, '#b4b0a0'); g.set(9, 9, '#a8a59c'); g.set(10, 9, '#cfcbbd');
  g.line(2, 3, 2, 9, '#6b4223');
  outline(g, K, '#5a1f20');
  return g.toCanvas(W >> 1, H - 1, 0, 0);
}
decals.flag = decalFlag();

function chichaDecal(kind, seed) {
  var p = poster(kind, seed, seed % 4), W = 14, H = 18, g = new G(W, H);
  for (var y = 0; y < 16; y++) for (var x = 0; x < 12; x++) {
    if (!p.get(x, y)) continue;
    g.set(x + 1, y + 1, p.get(x, y));
  }
  for (y = 0; y < 18; y++) for (x = 0; x < 14; x++) {                         // sombra de contacto a la derecha y abajo, 35 %
    if (g.get(x, y)) continue;
    if ((g.get(x - 1, y) || g.get(x, y - 1)) && x >= 2 && y >= 2) g.set(x, y, '#2a244059');
  }
  return g.toCanvas(7, 16, 0, 0);
}
decals.chicha = [chichaDecal('chicha', 21), chichaDecal('baile', 22), chichaDecal('sab', 23)];


/* ============================ ESTADOS ROTOS (v0.6, F3) ============================ */
/* `.broken` en trash, bags, bolsas[], emoliente, anticuchos, quiosco, triciclo (mismo ancla; la huella se achica) y `.dark` en los postes con luminaria
   (la pastilla apagada y rota, con el cable colgando). El motor cambia al estado roto cuando la interaccion lo pide. */
function rotG(g, ccw) {
  var n = new G(g.h, g.w), x, y;
  for (y = 0; y < g.h; y++) for (x = 0; x < g.w; x++) { var c = g.get(x, y); if (!c) continue; if (ccw) n.set(y, g.w - 1 - x, c); else n.set(g.h - 1 - y, x, c); }
  return n;
}
function flipVG(g) { var n = new G(g.w, g.h), x, y; for (y = 0; y < g.h; y++) for (x = 0; x < g.w; x++) { var c = g.get(x, y); if (c) n.set(x, g.h - 1 - y, c); } return n; }
function bboxG(g) { var b = { x0: 999, y0: 999, x1: -1, y1: -1 }; for (var y = 0; y < g.h; y++) for (var x = 0; x < g.w; x++) if (g.get(x, y)) { if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y; } return b; }
function cloth(g, x, y, w, h, c) {                                  // prenda tirada: tela con luz arriba, sombra abajo y un doblez
  g.rect(x, y, w, h, c); g.rect(x, y, w, 1, mix(c, '#ffffff', 0.35)); g.rect(x, y + h - 1, w, 1, mix(c, '#2a2440', 0.4));
  g.set(x + (w >> 1), y + (h >> 1), mix(c, '#2a2440', 0.25)); g.set(x, y, null);
}
function junk(g, kind, x, y) {                                      // basura suelta chiquita
  if (kind === 'bottle') { g.rect(x, y, 4, 2, '#8fb0b8'); g.set(x, y, '#ffffff'); g.set(x + 4, y, '#c9c5b5'); g.set(x + 3, y + 1, '#5a7a82'); }
  else if (kind === 'can') { g.rect(x, y, 3, 2, '#cfd3cc'); g.set(x, y, '#ffffff'); g.set(x + 1, y + 1, '#e8483a'); g.set(x + 2, y + 1, '#8c93a0'); }
  else if (kind === 'paper') { g.rect(x, y, 3, 2, '#e2dfd2'); g.set(x, y, '#ffffff'); g.set(x + 1, y + 1, '#a8a59c'); g.set(x + 3, y + 1, '#d8d4c4'); }
  else if (kind === 'peel') { g.rect(x, y, 3, 1, '#d9a63c'); g.set(x + 3, y + 1, '#b9853a'); g.set(x, y + 1, '#e0c47a'); }
  else if (kind === 'orange') { g.rect(x, y, 2, 2, '#e8742a'); g.set(x, y, '#f0a050'); }
  else if (kind === 'glass') { g.set(x, y, '#cfe3e6'); g.set(x + 1, y + 1, '#8fb0b8'); g.set(x + 3, y, '#ffffff'); }
  else if (kind === 'coal') { g.set(x, y, '#2d2a33'); g.set(x + 1, y, '#4a4756'); g.set(x, y + 1, '#1c1a22'); }
  else if (kind === 'ember') { g.set(x, y, '#ff8a2a'); g.set(x + 1, y, '#d2562a'); g.set(x, y + 1, '#ffd24a'); }
  else if (kind === 'skewer') { g.line(x, y, x + 5, y + 1, '#c9b890'); g.rect(x + 1, y, 2, 2, '#6b3f2a'); g.set(x + 1, y, '#8a5a3a'); }
}
function puddleAfter(g, cx, cy, rx, ry, col, col2) {                // charco translucido: se pinta despues del contorno, solo donde no hay nada
  for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy;
    if (d <= 1 && !g.get(x, y)) g.set(x, y, d < 0.45 ? col : (((x + y) & 1) ? col : col2));
  }
}
/* vuelca el objeto: rota 90 grados (o lo pone patas arriba) y apoya su fila mas baja en el suelo; spill(g2, bbox, r) agrega lo derramado */
function tipOver(g, o) {
  var rg = o.flip ? flipVG(g) : rotG(g, o.ccw !== false), g2 = new G(o.W, o.H), r = rng(o.seed || 1), bb = bboxG(rg);
  var ox = o.ox - bb.x0, oy = o.ay - bb.y1;
  g2.blit(rg, ox, oy);
  var b2 = { x0: bb.x0 + ox, x1: bb.x1 + ox, y0: bb.y0 + oy, y1: bb.y1 + oy };
  if (o.spill) o.spill(g2, b2, r);
  outline(g2, K, o.lite);
  contact(g2, o.cx, o.ay + 1, o.crx, 2.4);
  if (o.after) o.after(g2, b2, r);
  return mk(g2, o.cx, o.ay, o.fw, o.fh, { cast: { len: 0.35, a: 0.2 } });
}
/* ---- bolsas / bolso abierto: prendas que se salen ---- */
function spillBolsa(g, v, r) {
  if (v === 0) {                                                    // maleta abierta por la tapa: camiseta, jean, medias
    g.line(4, 9, 17, 12, '#0d0b11'); g.line(4, 10, 17, 13, '#14121a');
    cloth(g, 5, 13, 7, 3, '#c9a23c'); cloth(g, 9, 17, 6, 2, '#3f5f8a'); cloth(g, 1, 15, 4, 2, '#e8483a');
    g.rect(14, 15, 3, 2, '#e8e2d2'); g.set(15, 16, '#a8a59c');
    junk(g, 'paper', 28, 19);
  } else {                                                          // bolso con el cierre abierto y costal reventado
    g.line(2, 10, 15, 10, '#0d0b11'); g.line(2, 11, 14, 11, '#14121a');
    cloth(g, 3, 12, 8, 3, '#d98a9e'); cloth(g, 11, 17, 5, 2, '#f3efe2');
    g.line(18, 8, 25, 14, '#0d0b11'); g.line(19, 8, 26, 14, '#14121a');
    for (var i = 0; i < 9; i++) g.set(21 + Math.floor(r() * 8), 17 + Math.floor(r() * 2), r() < 0.5 ? '#c9b890' : '#a8956e');         // grano regado
    junk(g, 'peel', 29, 18);
  }
}
/* ---- tacho volcado ---- */
function propTrashBroken() {
  var g = new G(34, 30), ay = 25, GR = RP.botella, x, y, r = rng(9211);
  var X0 = 8, X1 = 24, Y0 = 14, Y1 = 25;
  for (y = Y0; y <= Y1; y++) for (x = X0; x <= X1; x++) {                                     // cilindro tumbado: luz arriba, nervaduras verticales
    var t = (y - Y0) / (Y1 - Y0), c = t < 0.2 ? GR[3] : t < 0.5 ? GR[2] : t < 0.82 ? GR[1] : GR[0];
    if ((x - X0) % 5 === 3) c = mix(c, '#000000', 0.2);
    g.set(x, y, c);
  }
  g.set(X1, Y0, null); g.set(X1, Y1, null); g.set(X0, Y0, null);
  g.ell(X1 - 0.5, 19.5, 2.2, 5.8, GR[1]); g.ell(X1 - 1, 19.5, 1.2, 4, GR[2]);                  // el fondo, a la derecha
  g.ell(X0, 19.5, 3.2, 6, '#5a8f80'); g.ell(X0 - 0.6, 19.5, 2.2, 5, '#0f1c1a');               // la boca, a la izquierda, oscura por dentro
  g.rect(X0 - 4, 14, 2, 1, '#8dbcae');
  bagBlob(g, 5, 22, 4.6, 3.4, 11); bagBlob(g, 1.5, 19, 2.8, 2.5, 22, ['#2f4a70', '#3f5f8a', '#5a7ea0', '#8aa8c8', '#c0d4e2']);      // bolsas que se salieron
  g.ell(29, 23.5, 4.6, 2.1, GR[2]); g.ell(29, 23, 4, 1.5, GR[3]); g.line(25, 24, 32, 24, GR[0]);   // la tapa, tirada plana
  junk(g, 'bottle', 11, 27); junk(g, 'can', 2, 26); junk(g, 'paper', 6, 27); junk(g, 'peel', 17, 27); junk(g, 'orange', 22, 27); junk(g, 'glass', 14, 28);
  g.rect(13, 19, 5, 3, '#e2dfd2'); g.rect(13, 19, 5, 1, '#ffffff'); g.set(15, 20, '#8f3a32');   // la etiqueta, ahora de costado
  outline(g, K, '#1f3a36');
  contact(g, 14, ay + 2, 15, 2.5);
  return mk(g, 13, ay, 20, 5, { cast: { len: 0.4, a: 0.2 } });
}
function propBagsBroken() {
  var g = new G(30, 22), ay = 18, cx = 15, r = rng(9302);
  bagBlob(g, 8, 14, 6.5, 3.4, 41); bagBlob(g, 19, 13.5, 6, 3.6, 52);
  g.line(5, 12, 11, 15, '#0b090f'); g.line(6, 12, 12, 15, '#14121a'); g.line(16, 12, 22, 14, '#0b090f');      // tajos
  g.set(8, 15, '#7c7a92'); g.set(17, 12, '#7c7a92');
  junk(g, 'paper', 2, 15); junk(g, 'can', 13, 17); junk(g, 'bottle', 24, 16); junk(g, 'peel', 9, 17); junk(g, 'orange', 21, 17); junk(g, 'paper', 26, 13);
  g.rect(1, 17, 2, 1, '#e8483a'); g.rect(15, 16, 2, 1, '#d9a63c'); g.rect(10, 13, 3, 1, '#e2dfd2');
  outline(g, K, '#16141c');
  contact(g, cx, ay + 1, 14, 2.4);
  return mk(g, cx, ay, 16, 5, { cast: { len: 0.4, a: 0.2 } });
}
/* ---- carretillas volcadas ---- */
/* Rueda tumbada (disco visto de 3/4 desde arriba): neumatico oscuro con brillo, aro claro, rayos en cruz y cubo. */
function wheelFlat(g, cx, cy, rx, ry) {
  g.ell(cx, cy, rx, ry, '#25232c'); g.ell(cx, cy, rx - 1, ry - 0.9, '#b4b8b0'); g.ell(cx, cy, rx - 1.9, ry - 1.5, '#2a2832');
  g.line(cx - rx + 2.5, cy - ry + 1.6, cx + rx - 2.5, cy + ry - 1.6, '#8d8b84'); g.line(cx - rx + 2.5, cy + ry - 1.6, cx + rx - 2.5, cy - ry + 1.6, '#8d8b84');
  g.rect(Math.round(cx) - 1, Math.round(cy) - 1, 2, 1, '#e2dfd2'); g.set(Math.round(cx), Math.round(cy), '#8d8b84');
}
function coalAt(g, x, y, ember) {                                    // carbon de 2x2 (luz arriba-izquierda); con brasa viva si ember
  g.rect(x, y, 2, 2, '#1c1a22'); g.set(x, y, '#4a4756'); g.set(x + 1, y + 1, '#0f0e14');
  if (ember) { g.set(x + 1, y, '#ff8a2a'); g.set(x, y + 1, '#d2562a'); if (ember > 1) g.set(x + 1, y, '#ffd24a'); }
}
/* ---- emoliente volcado: carreta de lado, ruedas tumbadas, botellas y termo regados, sombrilla en el piso y el charco caramelo ---- */
function brokenEmoliente() {
  var W = 58, H = 46, g = new G(W, H), r = rng(9020), x, y, i;
  var WD = ['#3e2a1e', '#5a3a22', '#7a5a3a', '#a86e38', '#c99458'];
  // sombrilla caida, a lo largo del piso: gajos crema y verde azulado, varillas rotas y el palo
  for (y = 40; y <= 45; y++) for (x = 28; x <= 47; x++) {
    var dx = (x - 38) / 10, dy = (y - 42.6) / 2.9, d = dx * dx + dy * dy; if (d > 1) continue;
    var w = Math.floor(((x - 28) / 20) * 5) % 2, lit = (y - 42) < -0.6 ? 0 : ((y - 42) > 1.4 ? 2 : 1);
    var base = w ? ['#f0e8cc', '#dcd2b0', '#b8ae8c'] : ['#6fa3a0', '#4d8a8a', '#336666'];
    g.set(x, y, base[lit]);
  }
  g.line(47, 43, 57, 42, WD[3]); g.line(47, 44, 57, 43, WD[1]); g.set(57, 41, WD[4]);
  g.line(29, 45, 25, 45, '#2d4a4a'); g.line(44, 40, 48, 38, '#2d4a4a'); g.set(48, 37, '#a4abaa');            // varillas torcidas
  g.set(33, 41, null); g.set(40, 44, null);                                              // rotos de la tela
  // el cajon de la carreta, de costado: cara frontal de tablas, cara de arriba (el piso de la caja) con el eje y las ruedas
  g.rect(16, 27, 30, 12, WD[2]); g.rect(16, 27, 30, 1, WD[4]); g.rect(16, 28, 30, 1, WD[3]);
  g.rect(16, 31, 30, 1, WD[0]); g.rect(16, 35, 30, 1, WD[0]); g.rect(16, 37, 30, 2, WD[1]);
  [23, 31, 39].forEach(function (xx) { g.rect(xx, 27, 1, 12, WD[1]); g.set(xx - 1, 28, WD[4]); });
  g.rect(31, 29, 8, 6, '#a8453a'); g.rect(31, 29, 8, 1, '#d86a52'); g.rect(33, 31, 4, 1, '#f3efe2'); g.rect(34, 30, 2, 3, '#f3efe2'); g.set(33, 30, '#a8453a'); g.set(36, 30, '#a8453a');   // letrero: la taza
  g.rect(46, 28, 3, 11, WD[1]); g.rect(46, 28, 3, 1, WD[2]); g.rect(48, 28, 1, 11, WD[0]);                    // costado derecho
  for (y = 21; y <= 26; y++) g.rect(18 + Math.round((26 - y) * 0.4), y, 30, 1, y < 23 ? WD[1] : WD[0]);       // tapa de abajo, en fuga
  g.rect(20, 22, 27, 2, WD[3]); g.rect(20, 22, 27, 1, WD[4]);                                                  // viga del eje
  wheelFlat(g, 24, 23, 5.4, 3.1); wheelFlat(g, 41, 23, 5.4, 3.1);
  // la boca abierta, a la izquierda, oscura por dentro, y la sombrilla-palo / manubrio
  g.ell(16, 33, 3.4, 5.9, '#1c1a22'); g.ell(16.6, 33, 2.2, 4.6, '#2d2a33'); g.ell(15.6, 30, 1.2, 1.4, '#4a3028');
  g.line(14, 28, 3, 36, WD[3]); g.line(15, 28, 4, 37, WD[1]); g.set(2, 36, WD[4]);
  // botellas de vidrio regadas (rojo, ambar, verde) y el termo caido
  function bottle(bx, by, body, hi, len) { g.rect(bx + 3, by, len, 3, body); g.rect(bx + 3, by, len, 1, hi); g.rect(bx, by + 1, 3, 1, '#c9c5b5'); g.set(bx, by + 1, '#ffffff'); g.set(bx + 3 + len - 1, by + 2, mix(body, '#000000', 0.35)); g.set(bx + 4, by, '#ffffff'); }
  bottle(1, 38, '#a8453a', '#e06a52', 6); bottle(6, 41, '#b9853a', '#e0b45a', 6); bottle(0, 43, '#6f9a4f', '#a8d078', 5);
  g.rect(49, 32, 8, 5, '#9ea3a6'); g.rect(49, 32, 8, 1, '#d8dcd6'); g.rect(49, 36, 8, 1, '#6d7275'); g.rect(57, 33, 1, 3, '#a8453a'); g.set(50, 33, '#ffffff');
  // vasos blancos tumbados y limones
  g.rect(50, 39, 3, 2, '#d8d4c4'); g.set(50, 39, '#ffffff'); g.set(53, 40, '#a8a59c'); g.rect(53, 42, 3, 2, '#e2dfd2'); g.set(53, 42, '#ffffff');
  g.rect(15, 41, 2, 2, '#d8e060'); g.set(15, 41, '#f2f2a0'); g.rect(13, 44, 2, 1, '#a8b840'); g.rect(10, 38, 2, 2, '#e8742a'); g.set(10, 38, '#f0a050');
  speck(g, r, 8, 16, 28, 45, 38, [WD[1], WD[3]]);
  outline(g, K, '#2c1e1a');
  // el charco de emoliente: caramelo con espuma crema, y goteo desde la boca de la carreta
  puddleAfter(g, 16, 41.5, 15, 3.9, '#b9853ac8', '#b9853a80');
  for (i = 0; i < 6; i++) { var px_ = 3 + Math.floor(r() * 26), py_ = 39 + Math.floor(r() * 5); if (!g.get(px_, py_) || g.get(px_, py_).length === 9) g.set(px_, py_, i % 2 ? '#f0e8cc' : '#e0c58d'); }
  g.set(14, 39, '#b9853a'); g.set(14, 38, '#8a6228'); g.set(13, 38, '#d9a63c');
  contact(g, 28, 42, 22, 2.6);
  
  return mk(g, 28, 41, 34, 8, { cast: { len: 0.35, a: 0.2 } });
}
/* ---- anticuchos volcado: el tambor de la parrilla tumbado vomitando carbon y brasas, mesita patas arriba, olla con salsa derramada, brochetas por el piso ---- */
function brokenAnticuchos() {
  var W = 52, H = 44, g = new G(W, H), r = rng(9120), x, y, i;
  var DR = ['#2d2a33', '#3a3835', '#4d4a45', '#6a6a64', '#7e868a'];
  // mesita: tablero apoyado de canto, con una pata al aire y otra tumbada
  g.rect(27, 33, 22, 3, '#6b4223'); g.rect(27, 33, 22, 1, '#a86e38'); g.rect(27, 35, 22, 1, '#4a3028'); g.rect(48, 33, 1, 3, '#a86e38');
  g.line(46, 33, 50, 22, '#3d3d3d'); g.line(47, 33, 51, 22, '#6a6a64'); g.line(31, 33, 34, 25, '#3d3d3d'); g.line(32, 33, 35, 25, '#6a6a64'); g.rect(33, 24, 3, 1, '#6a6a64');
  g.line(28, 36, 20, 40, '#3d3d3d'); g.line(28, 37, 21, 41, '#25232c');
  // el tambor, tumbado: cuerpo con luz arriba, aros, fondo a la derecha y boca encendida a la izquierda
  for (y = 23; y <= 35; y++) for (x = 12; x <= 34; x++) {
    var t = (y - 23) / 12, c = t < 0.1 ? DR[4] : t < 0.3 ? DR[3] : t < 0.62 ? DR[2] : t < 0.85 ? DR[1] : DR[0];
    g.set(x, y, c);
  }
  [17, 30].forEach(function (xx) { g.rect(xx, 23, 1, 13, DR[0]); g.rect(xx + 1, 23, 1, 2, DR[4]); });
  g.ell(34, 29.2, 2.3, 6.2, DR[1]); g.ell(33.6, 29.2, 1.3, 4.6, DR[2]); g.set(33, 25, DR[4]);
  g.ell(12, 29.2, 3.8, 6.4, DR[4]); g.ell(12.6, 29.2, 2.8, 5.4, '#2a1008'); g.ell(12.2, 29.6, 2.2, 4.4, '#8a2e12'); g.ell(12, 30, 1.5, 3, '#d2562a'); g.ell(11.6, 30.2, 0.9, 1.9, '#ff8a2a'); g.set(11, 30, '#ffd24a'); g.set(12, 31, '#ffd24a');
  g.set(14, 24, DR[4]); g.set(15, 24, DR[4]); g.rect(14, 33, 3, 2, DR[0]); g.rect(31, 24, 3, 11, DR[1]); g.rect(31, 24, 3, 1, DR[3]);
  // carbon y brasas que se derramaron de la boca hacia afuera
  for (i = 0; i < 16; i++) coalAt(g, 1 + Math.floor(r() * 12), 31 + Math.floor(r() * 9), r() < 0.35 ? (r() < 0.4 ? 2 : 1) : 0);
  for (i = 0; i < 9; i++) coalAt(g, 14 + Math.floor(r() * 30), 37 + Math.floor(r() * 5), r() < 0.25 ? 1 : 0);
  // rueda de bicicleta que salio volando, olla volcada, botella de aji
  wheelFlat(g, 6, 23, 5.4, 3.1);
  g.rect(37, 38, 10, 5, '#7a7e82'); g.rect(37, 38, 10, 1, '#cfd3cc'); g.rect(37, 42, 10, 1, '#4a4e52'); g.ell(37, 40.4, 1.8, 2.8, '#1c1a22'); g.ell(37.4, 40.6, 1, 1.8, '#a8453a');
  g.rect(35, 39, 1, 2, '#3b4250'); g.rect(47, 39, 1, 2, '#3b4250');
  g.rect(48, 36, 4, 3, '#a8453a'); g.rect(48, 36, 4, 1, '#d86a52'); g.rect(47, 37, 1, 1, '#f3efe2'); g.set(49, 37, '#ffffff');
  // brochetas: palito con carne, papa y choclo; varias regadas
  [[17, 41, 1], [28, 42, -1], [41, 36, 0], [4, 40, 1], [21, 38, -1]].forEach(function (s, k) {
    var sx = s[0], sy = s[1];
    g.line(sx, sy, sx + 7, sy + s[2], '#c9b890'); g.rect(sx + 1, sy - (s[2] < 0 ? 1 : 0), 2, 2, '#6b3f2a'); g.set(sx + 1, sy - (s[2] < 0 ? 1 : 0), '#8a5a3a'); g.rect(sx + 4, sy + (s[2] > 0 ? 0 : -1), 2, 2, k % 2 ? '#d9a63c' : '#4a2a1c');
  });
  outline(g, K, '#3a1c2c');
  // hollin, y la salsa roja derramada de la olla
  puddleAfter(g, 20, 38, 17, 4, '#1c1a2290', '#1c1a2255');
  puddleAfter(g, 36, 42.5, 6.5, 1.5, '#a8453a90', '#a8453a50');
  for (i = 0; i < 8; i++) { var ex = 2 + Math.floor(r() * 16), ey = 34 + Math.floor(r() * 7); if (!g.get(ex, ey) || g.get(ex, ey).length === 9) g.set(ex, ey, i % 2 ? '#ff8a2a' : '#ffd24a'); }   // chispas sobre el hollin
  contact(g, 26, 40, 20, 2.6);
  return mk(g, 26, 39, 30, 8, { cast: { len: 0.35, a: 0.2 } });
}
function brokenTriciclo(g) {
  return tipOver(g, { flip: true, W: 54, H: 44, ox: 3, ay: 38, cx: 24, crx: 21, fw: 38, fh: 10, seed: 8990, lite: '#3a1c2c',
    spill: function (g2, b, r) {
      var cols = ['#e8742a', '#d9a63c', '#6f9a4f', '#e8742a', '#c9a23c'];
      for (var i = 0; i < 9; i++) { var x = 4 + Math.floor(r() * 46), y = 34 + Math.floor(r() * 7); g2.rect(x, y, 2, 2, cols[i % 5]); g2.set(x, y, mix(cols[i % 5], '#ffffff', 0.4)); }
      g2.rect(40, 36, 9, 7, '#a8453a'); g2.rect(40, 36, 9, 1, '#d86a52'); g2.rect(40, 42, 9, 1, '#5b1d1d');               // una jaba suelta, abierta
      for (var s = 38; s < 43; s += 2) g2.rect(41, s, 7, 1, '#5b1d1d');
      g2.rect(2, 41, 7, 1, '#d8d4c4');
    }, after: null });
}
/* ---- quiosco forzado: persiana arrancada y revistas por el piso ---- */
function brokenQuiosco(g, r) {
  var x, y, i;
  for (y = 18; y <= 40; y++) for (x = 20; x <= 39; x++) g.set(x, y, y < 20 ? '#3b4250' : (y > 38 ? '#4a3028' : ((x + y) % 7 === 0 ? '#2a2535' : '#15131a')));     // vano oscuro
  for (y = 21; y <= 24; y++) for (x = 24; x <= 38; x++) if ((x + y) % 3 === 0) g.set(x, y, '#3a3844');
  g.rect(26, 31, 10, 1, '#6b4223'); g.rect(26, 30, 3, 1, '#e8483a'); g.rect(30, 30, 3, 1, '#38c8e8'); g.rect(34, 30, 2, 1, '#f2e63c');   // estante: revistas que quedaron
  for (i = 0; i < 6; i++) {                                                                                                                  // laminas de la persiana, dobladas hacia abajo
    var x0 = 20 + i * 3, len = 8 + (i * 5) % 6, bend = i % 2 ? 2 : -1;
    for (y = 19; y < 19 + len; y++) { var bx = x0 + Math.round(((y - 19) / len) * ((y - 19) / len) * bend * 3); for (var w = 0; w < 3; w++) g.set(bx + w, y, w === 0 ? '#a4abaa' : (w === 1 ? '#7e868a' : '#5c6570')); }
  }
  for (y = 19; y <= 30; y++) { g.set(19, y, '#5c6570'); }                                                                                    // canto arrancado
  g.rect(21, 38, 4, 1, '#cfd3cc'); g.set(22, 39, '#8c93a0'); g.set(25, 40, '#3b4250');                                                       // candado forzado, colgando
  g.rect(4, 22, 3, 6, '#e8e2d2'); g.set(4, 22, '#ffffff');                                                                                    // afiche de revista arrancado
}
function propQuioscoBroken() { return propQuiosco(true); }
/* ---- poste con luminaria apagada: pastilla muerta y rota, cable colgando ---- */
function darkVariant(c) {
  var n = px.canvas(c.width, c.height), cx = n.getContext('2d', { willReadFrequently: true });
  cx.drawImage(c, 0, 0);
  var lamps = c.lamps || (c.lamp ? [c.lamp] : []);
  if (!lamps.length) return n;
  var img = cx.getImageData(0, 0, c.width, c.height), d = img.data, W = c.width;
  lamps.forEach(function (l, k) {
    var lx = c.ax + l.x, ly = c.ay + l.y, x, y;
    for (y = ly - 3; y <= ly + 2; y++) for (x = lx - 6; x <= lx + 6; x++) {
      if (x < 0 || y < 0 || x >= W || y >= c.height) continue;
      var o = (y * W + x) * 4, R_ = d[o], G_ = d[o + 1], B_ = d[o + 2];
      if (d[o + 3] > 0 && R_ > 170 && G_ > 150 && B_ > 90 && R_ > B_ + 25 - (R_ > 240 ? 40 : 0)) {          // pastilla calida: se apaga
        var dk = y <= ly - 1 ? [0x5c, 0x65, 0x70] : [0x3b, 0x42, 0x50];
        d[o] = dk[0]; d[o + 1] = dk[1]; d[o + 2] = dk[2];
      }
    }
    var gx = lx + (k % 2 ? 1 : -1);                                                                         // un pixel de luna rota, el unico brillo
    if (gx >= 0 && ly + 1 < c.height) { var q = ((ly + 1) * W + gx) * 4; if (d[q + 3] > 0) { d[q] = 0x8f; d[q + 1] = 0xb0; d[q + 2] = 0xb8; } }
  });
  cx.putImageData(img, 0, 0);
  lamps.forEach(function (l, k) {
    var lx = c.ax + l.x, ly = c.ay + l.y, s = k % 2 ? 1 : -1;
    cx.fillStyle = CAB; cx.fillRect(lx + s * 2, ly + 2, 1, 3); cx.fillRect(lx + s * 2 + s, ly + 5, 1, 2); cx.fillRect(lx - s, ly + 2, 1, 2);       // cables sueltos
    cx.fillStyle = '#8fb0b8'; cx.fillRect(lx + s * 3, ly + 7, 1, 1);
  });
  ['ax', 'ay', 'fw', 'fh', 'top', 'tops', 'tall', 'shadowIn', 'poleKind'].forEach(function (p) { if (c[p] !== undefined) n[p] = c[p]; });
  return n;
}
['posteCables', 'posteAfiche', 'poste'].forEach(function (k) { props[k].dark = darkVariant(props[k]); });
props.posteAfiches.forEach(function (c) { c.dark = darkVariant(c); });
props.posteLuz.forEach(function (c) { c.dark = darkVariant(c); });

/* ---- COMO AGREGAR PROPS PARA EL NIVEL 2 («El Cerro»: refrigeradora, televisor, silla rota, mesa volteada, escoba) ----
   1) Dibuja en un lienzo G (g = new G(w, h)) con las herramientas de arriba: rect/ell/line, ball8() para volumenes, cardSign() para carton escrito,
      outline(g, K, lite) para el contorno, contact(g, cx, cy, rx, ry) para la sombra de contacto, puddleAfter() para charcos.
   2) Cierra con `return mk(g, ax, ay, fw, fh, { cast: {len, a} })` (ancla en los pies, huella en px: 1 m = 16 px).
   3) Registra `props.<id> = propX(); props.<id>.broken = propX(true);` y el estado roto va en una segunda llamada (patron de propPapaHuevo(brk)).
      Escala: refrigeradora ~16x36 px (1,0 x 1,7 m), televisor de tubo ~14x12 sobre mueble, silla ~9x16, mesa ~24x14, escoba ~3x18 (decoracion, fw=fh=0).
   4) Aqui solo se pinta; colocacion, golpes y .broken los conecta el motor (world.js / interaccion.js). Los objetos de mano/botin van en objetos.js (tabla ITEMS). */
/* ============================ v0.8 (G4): CARRETILLAS DE COMIDA: PAPA CON HUEVO y CHOCLO CON QUESO ============================ */
/* Mismo lienzo, huella y ancla que props.anticuchos (40x44, ancla 20,39, huella 33x8); .broken como anticuchos.broken (52x44, ancla 26,39).
   Un cajon de madera sobre ruedas: su frente es el letrero de carton escrito a mano. Encima, la olla y los frascos / el queso. */
function ball8(g, cx, cy, rx, ry, R) {                          // esfera con luz arriba-izquierda: R = [sombra, base, luz, brillo]
  for (var y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (var x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
    var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy > 1) continue;
    var lit = -(dx * 0.6 + dy * 0.85);
    g.set(x, y, lit > 0.62 ? R[3] : lit > 0.1 ? R[2] : lit > -0.45 ? R[1] : R[0]);
  }
}
var POTA = ['#8a6a24', '#b8923c', '#dcb852', '#f6dc80'], EGGW = ['#a8a590', '#d4d2bc', '#f0eeda', '#fffef4'];
var ALU = ['#3b4250', '#5c6570', '#8c949a', '#b4bab6', '#dfe3dc'], BLE = ['#1f3f66', '#2f64a0', '#4a8ac8', '#8cc0ec'];
function egg8(g, cx, cy, cut) {                                  // huevo duro 3x4: blanco con luz; si cut, mitad con yema
  ball8(g, cx, cy, 1.7, 2.2, EGGW);
  if (cut) { g.set(Math.round(cx), Math.round(cy), '#f2b81c'); g.set(Math.round(cx) - 1, Math.round(cy), '#ffd84a'); g.set(Math.round(cx), Math.round(cy) + 1, '#d89a10'); }
}
/* Letrero de carton escrito a mano con plumon: renglones centrados, 1 px de vaiven por letra, vetas de carton corrugado, clavos en las esquinas y una esquina comida. */
function cardSign(g, x, y, w, h, lines, seed, inkLast) {
  var r = rng(seed), CB = ['#6a4c28', '#9a7842', '#c4a064', '#dcc088'], i, j, INK = '#2a1c14', RED = '#a8261e';
  g.rect(x, y, w, h, CB[2]); g.rect(x, y, w, 1, CB[3]); g.rect(x, y, 1, h, CB[3]); g.rect(x + w - 1, y, 1, h, CB[1]); g.rect(x, y + h - 1, w, 1, CB[1]);
  for (j = y + 2; j < y + h - 2; j += 3) for (i = x + 1; i < x + w - 1; i++) if (r() < 0.16) g.set(i, j, CB[1]);                  // vetas del carton corrugado
  g.set(x + w - 1, y + h - 1, CB[0]); g.set(x + w - 2, y + h - 1, CB[0]);
  g.set(x + 1, y + 1, '#4a4756'); g.set(x + w - 2, y + 1, '#4a4756');                                                                 // clavos de arriba
  lines.forEach(function (ln, k) {
    var tw = ln.length * 4 - 1, tx = x + Math.floor((w - tw) / 2) + (k === 0 && ln.length * 4 - 1 < w - 8 ? 1 : 0), cut = ln.lastIndexOf(' ') + 1;
    for (i = 0; i < ln.length; i++) px.text(g, ln.charAt(i), tx + i * 4, y + 1 + k * 6 + (r() < 0.2 ? 1 : 0), { font: 'a5', ink: (inkLast && k === lines.length - 1 && i >= cut) ? RED : INK });     // el precio, en rojo
  });
}
function gasTank(g, x, y) {                                      // garrafita de gas bajo el cajon
  g.rect(x, y + 1, 6, 8, '#d8782a'); g.rect(x, y + 1, 2, 8, '#f0a050'); g.rect(x + 5, y + 1, 1, 8, '#8a4a18'); g.rect(x + 1, y, 4, 1, '#7e868a'); g.rect(x + 2, y - 1, 2, 1, '#3b4250');
  g.rect(x, y + 4, 6, 1, '#f3efe2'); g.rect(x, y + 5, 6, 1, '#b87a42');
}
function foodCart(g, sign, brkLess) {                            // cajon: costado de tablones, tablero superior, frente = letrero. Devuelve nada; pinta en g.
  var WDK = ['#3e2a1e', '#5a3a22', '#7a5a3a', '#a86e38', '#c99458'], x;
  wheel(g, 31, 35, 4);                                                                                            // la rueda asoma bajo el cajon
  gasTank(g, 10, 30);                                                                                             // garrafita de gas bajo el cajon
  g.rect(4, 33, 2, 6, '#3d3d3d'); g.rect(4, 33, 1, 6, '#6a6a64'); g.rect(24, 33, 2, 6, '#3d3d3d'); g.rect(24, 33, 1, 6, '#6a6a64');   // patas
  g.rect(1, 18, 37, 2, WDK[3]); g.rect(1, 18, 37, 1, WDK[4]); g.rect(1, 20, 37, 1, WDK[0]);                         // tablero de arriba
  g.rect(1, 20, 1, 15, WDK[1]); g.rect(37, 20, 1, 15, WDK[1]);                                                    // cantos
  sign();
}
function propPapaHuevo(brk) {
  var W = 40, H = 44, g = new G(W, H), r = rng(9301), ay = 39, cx = 20, i, x, y;
  if (brk) return brokenPapaHuevo();
  foodCart(g, function () { cardSign(g, 1, 20, 37, 14, ['PAPA C/', 'HUEVO S/1'], 9311, true); });
  // olla de aluminio con papas y huevos
  g.rect(9, 11, 16, 8, ALU[2]); g.rect(9, 11, 3, 8, ALU[3]); g.rect(9, 11, 1, 8, ALU[4]); g.rect(22, 11, 3, 8, ALU[1]); g.rect(24, 11, 1, 8, ALU[0]); g.rect(9, 18, 16, 1, ALU[0]);
  g.rect(8, 14, 1, 3, '#2d3340'); g.rect(25, 14, 1, 3, '#2d3340');                                                                  // asas
  g.ell(17, 11, 8, 2.2, ALU[4]); g.ell(17, 11.4, 6.7, 1.5, '#2a2f38');                                                              // boca
  ball8(g, 11.6, 10.4, 2.4, 2.1, POTA); ball8(g, 15.6, 9.4, 2.7, 2.3, POTA); ball8(g, 20, 9.8, 2.7, 2.3, POTA); ball8(g, 22.6, 11, 1.9, 1.7, POTA);
  egg8(g, 13.8, 7.4, false); egg8(g, 18.6, 7.0, false); egg8(g, 21.6, 8, true);
  g.line(11, 12, 21, 13, ALU[4]); g.line(11, 13, 21, 14, ALU[3]);                                                                    // borde delantero
  g.set(16, 9, '#8a6a24'); g.set(12, 9, '#fff2b0'); g.set(19, 8, '#fff2b0');
  g.rect(23, 5, 1, 7, ALU[3]); g.rect(22, 4, 3, 1, ALU[3]); g.rect(22, 5, 1, 1, '#3b4250');                                          // cucharon
  // frascos de aji sobre el tablero: amarillo y verde
  function jar(x0, c1, c2, c3) { g.rect(x0, 12, 4, 6, '#cfe3e6'); g.rect(x0 + 1, 13, 3, 5, c1); g.rect(x0 + 1, 13, 3, 1, c2); g.rect(x0 + 3, 14, 1, 4, c3); g.rect(x0, 11, 4, 1, '#a84a3a'); g.set(x0, 12, '#ffffff'); g.set(x0 + 1, 15, c2); }
  jar(28, '#f0a41c', '#ffd05a', '#c87a10'); jar(33, '#6a9a3c', '#a8d068', '#3a5a24');
  // pila de platitos blancos, y las bolsitas
  g.rect(3, 15, 5, 3, '#f3efe2'); g.rect(3, 15, 5, 1, '#ffffff'); g.rect(3, 17, 5, 1, '#b4c0c4'); g.rect(4, 14, 3, 1, '#e4ece8');
  speck(g, r, 8, 2, 21, 36, 33, ['#7a5a3a', '#b8925a']);
  outline(g, K, '#3a1c2c');
  [[16, 2], [17, 1], [15, 3], [18, 3], [16, 0]].forEach(function (q, i) { g.set(q[0], q[1], i < 3 ? '#ffffff80' : '#ffffff55'); });                     // vapor de la olla (el motor puede animar `smoke`)
  contact(g, cx, ay + 1, 18, 2.5);
  return mk(g, cx, ay, 33, 8, { cast: { len: 0.45, a: 0.2 }, p: { smoke: { x: 17 - cx, y: 4 - ay } } });
}
function propChoclo(brk) {
  var W = 40, H = 44, g = new G(W, H), r = rng(9401), ay = 39, cx = 20, i, x, y;
  if (brk) return brokenChoclo();
  var HUSK = ['#2f4a1c', '#4a7a2a', '#7aaa44', '#b0d878'];
  foodCart(g, function () { cardSign(g, 1, 20, 37, 14, ['CHOCLO C/', 'QUESO'], 9411, false); });
  // mantel de cuadros rojos y blancos sobre el tablero, con su ruedo colgando
  for (x = 1; x < 38; x++) { g.set(x, 18, ((x >> 1) % 2) ? '#c8382e' : '#f3efe2'); g.set(x, 19, ((x >> 1) % 2) ? '#f3efe2' : '#c8382e'); }
  for (x = 1; x < 38; x++) g.set(x, 20, ((x >> 1) % 2) ? '#8a2a24' : '#d8d2c0');
  // olla de enlozado azul con choclos asomando
  g.rect(3, 10, 15, 8, BLE[2]); g.rect(3, 10, 3, 8, BLE[3]); g.rect(15, 10, 3, 8, BLE[1]); g.rect(17, 10, 1, 8, BLE[0]); g.rect(3, 17, 15, 1, BLE[0]);
  [[5, 13], [8, 15], [12, 12], [14, 16]].forEach(function (p) { g.set(p[0], p[1], '#ffffff'); g.set(p[0] + 1, p[1], '#dfeaf6'); });   // chispas del esmalte
  g.rect(2, 13, 1, 3, '#14284e'); g.rect(18, 13, 1, 3, '#14284e');
  g.ell(10.5, 10, 8, 2.2, BLE[3]); g.ell(10.5, 10.4, 6.7, 1.5, '#0f2438');
  function cob(x0, y0, x1, y1) {                                                                                                         // choclo: granos grandes, hojas verdes en la base
    var dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy)), k;
    for (k = 0; k <= n; k++) {
      var px_ = Math.round(x0 + dx * k / n), py_ = Math.round(y0 + dy * k / n);
      if (k < 3) { g.rect(px_, py_, 3, 2, HUSK[k % 2 ? 1 : 2]); g.set(px_ + 2, py_ + 1, HUSK[0]); }
      else { g.rect(px_, py_, 3, 2, k % 2 ? '#f2e8a8' : '#e2d078'); g.set(px_ + 2, py_ + 1, '#bca856'); g.set(px_, py_, '#fffbd0'); if (k > n - 2) g.set(px_ + 1, py_ - 1, '#e2d078'); }
    }
  }
  cob(8, 11, 6, 5); cob(11, 11, 11, 4); cob(14, 11, 17, 6);
  g.line(4, 11, 15, 12, BLE[3]); g.line(4, 12, 15, 13, BLE[2]);
  // queso fresco: bloque grande con ojitos, y una tajada con su cuchillo
  g.rect(21, 13, 11, 3, '#fffaea'); g.rect(21, 13, 11, 1, '#ffffff'); g.rect(21, 16, 11, 3, '#eee4be'); g.rect(31, 14, 1, 5, '#bfb48a'); g.rect(21, 18, 11, 1, '#bfb48a');
  g.set(23, 17, '#b8ac82'); g.set(27, 16, '#b8ac82'); g.set(29, 17, '#b8ac82'); g.set(25, 14, '#d8cca0'); g.set(28, 14, '#d8cca0');
  g.rect(24, 11, 5, 2, '#fffaea'); g.rect(24, 12, 5, 1, '#d8cca0'); g.rect(24, 11, 5, 1, '#ffffff');
  g.line(33, 13, 36, 9, '#8c949a'); g.line(34, 13, 37, 9, '#c9c9be'); g.rect(32, 14, 2, 1, '#3f2616');
  speck(g, r, 8, 2, 21, 36, 33, ['#7a5a3a', '#b8925a']);
  outline(g, K, '#3a1c2c');
  [[8, 2], [9, 1], [7, 3], [12, 2], [11, 0], [14, 3]].forEach(function (q, i) { g.set(q[0], q[1], i < 3 ? '#ffffff80' : '#ffffff55'); });                  // vapor de las mazorcas
  contact(g, cx, ay + 1, 18, 2.5);
  return mk(g, cx, ay, 33, 8, { cast: { len: 0.45, a: 0.2 }, p: { smoke: { x: 10 - cx, y: 3 - ay } } });
}

/* ---- volcados: el cajon boca abajo con las patas al aire, la rueda tumbada, la olla de lado vomitando lo suyo, el letrero arrancado y el aji regado ---- */
function brokenFoodBase(g, WDK) {                               // cajon patas arriba, a la derecha; rueda tumbada
  var x, y;
  g.rect(18, 15, 31, 14, WDK[2]); g.rect(18, 15, 31, 1, WDK[3]); g.rect(18, 28, 31, 1, WDK[0]);                   // fondo del cajon (tablones)
  for (x = 24; x < 48; x += 8) g.rect(x, 15, 1, 14, WDK[0]);
  g.rect(18, 19, 31, 1, WDK[1]); g.rect(18, 24, 31, 1, WDK[1]);
  g.rect(18, 29, 31, 2, WDK[1]); g.rect(18, 29, 31, 1, WDK[3]);
  g.rect(20, 7, 2, 8, '#3d3d3d'); g.rect(20, 7, 1, 8, '#6a6a64'); g.rect(45, 9, 2, 6, '#3d3d3d'); g.rect(45, 9, 1, 6, '#6a6a64'); g.line(46, 9, 48, 7, '#3d3d3d');   // patas al aire (una doblada)
  wheelFlat(g, 41, 36, 5.4, 3.1);
}
function brokenPapaHuevo() {
  var W = 52, H = 44, g = new G(W, H), x, y, i, WD = ['#3e2a1e', '#5a3a22', '#7a5a3a', '#a86e38', '#c99458'];
  brokenFoodBase(g, WD);
  gasTank(g, 41, 22);
  // la olla de lado, boca a la izquierda
  for (y = 21; y <= 32; y++) for (x = 4; x <= 20; x++) { var t = (y - 21) / 11; g.set(x, y, t < 0.12 ? ALU[4] : t < 0.35 ? ALU[3] : t < 0.62 ? ALU[2] : t < 0.85 ? ALU[1] : ALU[0]); }
  g.ell(20, 26.5, 2.3, 5.8, ALU[1]); g.ell(19.6, 26.5, 1.3, 4.2, ALU[2]); g.set(19, 23, ALU[4]);
  g.ell(4, 26.5, 3.6, 6.2, ALU[4]); g.ell(4.6, 26.5, 2.8, 5.2, '#1f242c'); g.ell(4, 28, 2, 3, '#3a3228');
  g.rect(8, 21, 1, 12, ALU[1]); g.rect(16, 21, 1, 12, ALU[1]); g.rect(9, 21, 1, 2, ALU[4]); g.rect(17, 21, 1, 2, ALU[4]);
  // lo que se salio, hacia el frente
  ball8(g, 3.5, 35.5, 2.7, 2.3, POTA); ball8(g, 9.5, 37, 2.8, 2.4, POTA); ball8(g, 16, 38.5, 2.6, 2.2, POTA); ball8(g, 1.8, 40.5, 2.3, 2, POTA); ball8(g, 24, 40, 2.5, 2.1, POTA);
  egg8(g, 14, 33.5, false); egg8(g, 6.5, 41, true); egg8(g, 31, 41, false);
  g.set(10, 35, '#fff2b0'); g.set(3, 34, '#fff2b0'); g.set(16, 37, '#fff2b0'); g.set(23, 39, '#fff2b0');
  // el letrero de carton, arrancado, en el piso a la derecha (la tinta sigue legible)
  cardSign(g, 13, 29, 37, 14, ['PAPA C/', 'HUEVO S/1'], 9311, true);
  g.rect(14, 41, 3, 2, '#2a2440'); g.rect(41, 42, 5, 1, '#6a4c28');                                                                        // roto / pisado
  // frascos rotos
  g.set(10, 42, '#cfe3e6'); g.set(12, 43, '#ffffff'); g.set(45, 38, '#8fb0b8'); g.set(26, 43, '#cfe3e6'); g.set(28, 42, '#ffffff');
  outline(g, K, '#3a1c2c');
  puddleAfter(g, 38, 42.5, 11, 1.6, '#f0a41cc0', '#f0a41c70');                                                                            // aji amarillo
  puddleAfter(g, 20, 43, 6, 1.1, '#6a9a3cc0', '#6a9a3c70');                                                                               // y aji verde
  contact(g, 26, 40, 22, 2.6);
  return mk(g, 26, 39, 30, 8, { cast: { len: 0.35, a: 0.2 } });
}
function cobH(g, x, y, len, ang) {                                                                                                      // choclo tumbado: hojas a la izquierda, granos grandes
  var HU = ['#2f4a1c', '#4a7a2a', '#7aaa44', '#b0d878'], k, j;
  for (k = 0; k < len; k++) {
    var yy = y + Math.round(k * ang);
    for (j = 0; j < 3; j++) {
      var c = k < 3 ? (j === 2 ? HU[0] : (k % 2 ? HU[1] : HU[2])) : (j === 0 ? ((k + j) % 2 ? '#fffbd0' : '#f2e8a8') : j === 1 ? ((k + j) % 2 ? '#f2e8a8' : '#e2d078') : ((k + j) % 2 ? '#bca856' : '#a89448'));
      if (k === len - 1 && j !== 1) continue;
      g.set(x + k, yy + j, c);
    }
  }
}
function brokenChoclo() {
  var W = 52, H = 44, g = new G(W, H), x, y, i, WD = ['#3e2a1e', '#5a3a22', '#7a5a3a', '#a86e38', '#c99458'];
  brokenFoodBase(g, WD);
  for (x = 19; x < 48; x++) for (y = 13; y < 15; y++) g.set(x, y, ((x >> 1) + y) % 2 ? '#c8382e' : '#f3efe2');                                // mantel arrugado sobre el fondo del cajon
  // olla azul de lado
  for (y = 21; y <= 32; y++) for (x = 4; x <= 20; x++) { var t = (y - 21) / 11; g.set(x, y, t < 0.12 ? BLE[3] : t < 0.4 ? BLE[2] : t < 0.75 ? BLE[1] : BLE[0]); }
  g.ell(20, 26.5, 2.3, 5.8, BLE[1]); g.ell(19.6, 26.5, 1.3, 4.2, BLE[2]); g.set(19, 23, BLE[3]);
  g.ell(4, 26.5, 3.6, 6.2, BLE[3]); g.ell(4.6, 26.5, 2.8, 5.2, '#0f2438');
  [[10, 24], [14, 29], [17, 25], [12, 31]].forEach(function (p) { g.set(p[0], p[1], '#ffffff'); });
  // choclos y queso por el piso
  cobH(g, 0, 35, 9, 0.1); cobH(g, 5, 40, 9, -0.15); cobH(g, 14, 38, 9, 0.05); cobH(g, 0, 29, 3, 0);
  cardSign(g, 15, 29, 37, 14, ['CHOCLO C/', 'QUESO'], 9411, false);
  g.rect(33, 27, 7, 4, '#fffaea'); g.rect(33, 27, 7, 1, '#ffffff'); g.rect(33, 30, 7, 1, '#bfb48a'); g.rect(39, 27, 1, 4, '#bfb48a'); g.set(35, 29, '#b8ac82'); g.set(37, 28, '#b8ac82');   // queso caido
  g.rect(42, 28, 4, 2, '#fffaea'); g.set(42, 28, '#ffffff'); g.set(45, 29, '#bfb48a');                                                         // la tajada
  outline(g, K, '#3a1c2c');
  puddleAfter(g, 10, 42.5, 8, 1.2, '#cfe6f2a0', '#cfe6f260');                                                                                  // agua de la olla
  contact(g, 26, 40, 22, 2.6);
  return mk(g, 26, 39, 30, 8, { cast: { len: 0.35, a: 0.2 } });
}
props.papaHuevo = propPapaHuevo(); props.papaHuevo.broken = propPapaHuevo(true);
props.choclo = propChoclo(); props.choclo.broken = propChoclo(true);

/* ---- registro de los .broken ---- */
props.trash.broken = propTrashBroken();
props.bags.broken = propBagsBroken();
props.bolsas.forEach(function (c, i) { c.broken = propBolsas(i, true); });
props.emoliente.broken = propEmoliente(true);
props.anticuchos.broken = propAnticuchos(true);
props.quiosco.broken = propQuiosco(true);
props.triciclo.broken = propTriciclo(true);

})();
