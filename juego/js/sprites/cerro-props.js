/* ACHORADO - js/sprites/cerro-props.js  (v0.9, fase H4a)
 * Dueño: sprites (cerro, props). Se carga despues de cerro-suelo.js. Usa ACH.px (base.js) y extiende ACH.sprites.props.
 * Escala unica del juego: 1 m = 16 px, persona = 28 px (tabla de diseno/investigacion-cerro.md). Contorno oscuro de 1 px, luz NO, sombra SE
 * (shadowSE) horneada en el lienzo (shadowIn:true) igual que mobiliario.js. Todo es ancla (ax,ay) = centro inferior de la huella; fw x fh = huella.
 *
 *  refri           refrigeradora parada 11x29 (huella 11x6)    .dmg[3] (abollada, torcida, casi muerta) + .broken (puerta abierta colgando)
 *  refriTirada     la misma, tirada con la puerta hacia arriba  .dmg[3] + .broken
 *  tele            tele de tubo con antena de conejo            .broken (pantalla rota, chispas)
 *  sillaRota       silla de madera sin una pata, ladeada        .broken (palos)
 *  mesaVolteada    mesa boca arriba (patas al aire)             .dmg[1] (una pata partida) + .broken (tablero partido)
 *  bolsasCerro[3]  montones de bolsas: 0 negras, 1 de colores, 2 mezcla   cada una con .broken (rota, basura regada)
 *  colchon         colchon de 2 plazas tirado, 22x31
 *  llanta          llanta de auto tirada, 10 de diametro
 *  cilindroAzul    cilindro de 200 L con lona azul y soga       .broken (volcado, abollado, con charquito)
 *  cisterna        camion cisterna de costado (mira al este: cabina amarilla a la derecha), 132x62
 *  posteMadera / posteMaderaL   poste de eucalipto inclinado (hacia el este / hacia el oeste), 140 px, con retenida; top, tops[3]
 *  columnaFierro   columna de concreto con fierros al aire (decoracion de azotea, fw=fh=0)
 *  escobaPared     escoba apoyada en la pared (agarrable)
 *  fogon           fogon de piedras con olla negra y lena; smoke:{x,y}
 *  toldo           carpa roja de olla comun (tall, canopy:{x,y,w,h} para el fundido, huella 0)
 *  cruzChica       cruz blanca de tablas con piedras y flores de plastico
 *  letreroRoca     piedra grande con el nombre del asentamiento pintado a mano («A.H. LUCERO ALTO»)
 *  reservorio      reservorio de agua de la cima (cilindro de concreto pintado de azul con escalera)
 *  torreAntenas    torre de antenas de celosia, 330 px (~21 m), baliza roja arriba; top
 *  radioPilas      (v0.13) radio portatil roja con antena sobre un cajon de fruta, 18x28 (la prende E; ver ACH.cerro.radio)
 * Propiedades extra (relativas al ancla): top {x,y}, tops [{x,y}], smoke {x,y}, canopy {x,y,w,h}, tall, shadowIn.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px, S = ACH.sprites;
var G = px.G, RP = px.RAMPS, rng = px.rng, mix = px.mix;
var props = S.props = S.props || {};

/* ============================ HERRAMIENTAS ============================ */
var K = '#1c1a22';                                       // contorno general
var SHV = '#2a2440';
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
function outline(g, dark, lite) {                         // contorno de 1 px; lite (opcional) en el lado de la luz
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
function contact(g, cx, cy, rx, ry, col) {                // sombra de contacto: elipse violeta translucida solo donde no hay nada
  col = col || '#2a244080';
  for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry;
    if (dx * dx + dy * dy <= 1 && !g.get(x, y)) g.set(x, y, col);
  }
}
function speck(g, r, n, x0, y0, x1, y1, cols) {           // salpicado sobre pixeles ya ocupados
  for (var i = 0; i < n; i++) {
    var x = x0 + Math.floor(r() * (x1 - x0 + 1)), y = y0 + Math.floor(r() * (y1 - y0 + 1));
    if (g.get(x, y)) g.set(x, y, cols[Math.floor(r() * cols.length)]);
  }
}
function dither(g, x0, y0, x1, y1, c, only) {             // tramado 50 % solo sobre pixeles ocupados
  for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
    var cur = g.get(x, y);
    if ((x + y) % 2 === 0 && cur && (!only || only.indexOf(cur) >= 0)) g.set(x, y, c);
  }
}
function curve(g, x0, y0, x1, y1, sag, c, thick) {        // arco cuadratico con comba hacia abajo
  var n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0) + Math.abs(sag)) * 1.6) + 2;
  var mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag * 2;
  for (var i = 0; i <= n; i++) {
    var t = i / n, u = 1 - t, x = Math.round(u * u * x0 + 2 * u * t * mx + t * t * x1), y = Math.round(u * u * y0 + 2 * u * t * my + t * t * y1);
    for (var k = 0; k < (thick || 1); k++) g.set(x, y + k, typeof c === 'function' ? c(k) : c);
  }
}
/* Lienzo final: toCanvas + sombra proyectada SE (shadowSE, bajo la fila ay) + propiedades. */
function mk(g, ax, ay, fw, fh, o) {
  o = o || {};
  var c = g.toCanvas(), res = c;
  if (o.cast !== false) {
    var cs = o.cast || {};
    var c1 = px.canvas(c.width, c.height);
    c1.getContext('2d', { willReadFrequently: true }).drawImage(c, 0, 0); c = c1;
    var sh = px.shadowSE(c, cs.a === undefined ? 0.2 : cs.a, { base: ay, len: cs.len || 0.45 });
    var W = Math.max(c.width, sh.width), H = Math.max(c.height, ay + 1 + sh.height);
    res = px.canvas(W, H);
    var cx = res.getContext('2d');
    cx.drawImage(sh, 0, ay); cx.drawImage(c1, 0, 0);
  }
  res.shadowIn = true;
  res.ax = ax; res.ay = ay; res.fw = fw; res.fh = fh;
  if (o.p) for (var k in o.p) res[k] = o.p[k];
  return res;
}
function rows(g, x, y, arr, map) {
  for (var j = 0; j < arr.length; j++) for (var i = 0; i < arr[j].length; i++) { var v = map[arr[j].charAt(i)]; if (v) g.set(x + i, y + j, v); }
}
/* caja sombreada: cara frontal (x,y,w,h) con luz a la izquierda + cara superior de th filas encima, algo mas clara */
function box(g, x, y, w, h, th, C) {                      // C = [oscuro, sombra, base, luz, brillo]
  var i, j;
  for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
    var c = C[2];
    if (i === 0) c = C[3]; else if (i >= w - 2) c = C[1]; if (i === w - 1) c = C[0];
    if (j === h - 1) c = (i === 0) ? C[1] : C[0];
    g.set(x + i, y + j, c);
  }
  for (j = 1; j <= th; j++) for (i = 0; i < w; i++) g.set(x + i, y - j, j === th ? C[3] : C[4] || C[3]);
  for (j = 1; j <= th; j++) g.set(x + w - 1, y - j, C[2]);
}

/* ============================ REFRI ============================ */
var FR = ['#5f5e5a', '#8a867a', '#b0ac9c', '#ccc8b6', '#e4e0cf'];        // esmalte blanco sucio
var RU = ['#6f3b2e', '#8a4b38', '#a0603f'];                              // oxido
function dent(g, x, y, w, h) {                                           // abolladura: sombra arriba-izquierda, filo claro abajo-derecha
  var i, j;
  for (j = 0; j < h; j++) for (i = 0; i < w; i++) g.set(x + i, y + j, j === 0 || i === 0 ? FR[1] : FR[2]);
  for (i = 1; i < w; i++) g.set(x + i, y + h, FR[4]);
  g.set(x + w, y + 1, FR[4]);
}
function refriDraw(level, o) {
  o = o || {};
  var W = 24, H = 36, cx = 11, ay = 31, g = new G(W, H), r = rng(5100 + level * 7), x0 = cx - 5, w = 11, top = ay - 25, i, j;
  // cara frontal
  for (j = top; j <= ay - 1; j++) for (i = 0; i < w; i++) {
    var c = FR[3];
    if (i === 0) c = FR[4]; else if (i > 7 && i < 10) c = FR[2]; else if (i === 9) c = FR[1]; if (i === 10) c = FR[1];
    g.set(x0 + i, j, c);
  }
  // cara superior (4 filas): mas clara
  for (j = 1; j <= 4; j++) for (i = 0; i < w; i++) g.set(x0 + i, top - j, j === 4 ? FR[3] : (i < 1 ? FR[4] : FR[4]));
  for (j = 1; j <= 4; j++) { g.set(x0 + w - 1, top - j, FR[2]); }
  g.set(x0, top - 4, FR[3]);
  // puertas: congelador (9 filas) y refri; junta con filo claro debajo
  for (i = 0; i < w; i++) { g.set(x0 + i, top + 9, FR[0]); g.set(x0 + i, top + 10, i < 10 ? FR[4] : FR[2]); }
  // zocalo oscuro y patas
  for (i = 0; i < w; i++) { g.set(x0 + i, ay - 2, '#3b4250'); g.set(x0 + i, ay - 1, '#2d3340'); }
  g.set(x0, ay - 2, '#5c6570');
  // manijas verticales (a la derecha, puerta con bisagra a la izquierda)
  g.rect(x0 + 8, top + 2, 2, 6, '#2d3340'); g.rect(x0 + 8, top + 2, 1, 6, '#8c93a0'); g.set(x0 + 8, top + 2, '#cfd3cc');
  g.rect(x0 + 8, top + 13, 2, 8, '#2d3340'); g.rect(x0 + 8, top + 13, 1, 8, '#8c93a0'); g.set(x0 + 8, top + 13, '#cfd3cc');
  // letrerito (mica de marca inventada) y calcomania
  g.rect(x0 + 2, top + 4, 4, 1, '#8f3a32'); g.rect(x0 + 2, top + 16, 3, 2, '#7a9cb8'); g.set(x0 + 2, top + 16, '#cfe0e4');
  // suciedad: oxido abajo, mugre, goteras
  for (j = ay - 7; j <= ay - 3; j++) for (i = 0; i < w; i++) if (r() < (0.55 - (ay - 3 - j) * 0.09)) g.set(x0 + i, j, pick(r, RU));
  speck(g, r, 14, x0, top, x0 + w - 1, ay - 3, [FR[2], FR[1], '#a29272']);
  for (i = 0; i < 3; i++) { var sx = x0 + ri(r, 2, 8), sy = top + ri(r, 10, 14); for (j = 0; j < 5; j++) if (g.get(sx, sy + j) && r() < 0.8) g.set(sx, sy + j, '#a29272'); }
  if (level >= 1) { dent(g, x0 + 2, top + 12, 4, 3); g.line(x0 + 6, top + 1, x0 + 9, top + 5, FR[1]); g.set(x0 + 7, top + 4, '#8f3a32'); }
  if (level >= 2) {
    dent(g, x0 + 1, top + 2, 4, 5); dent(g, x0 + 5, top + 18, 5, 3);
    for (j = 0; j < 3; j++) { g.set(x0 + 9, top + 4 + j, null); g.set(x0 + 8, top + 3 + j, FR[0]); }         // manija doblada
    for (i = 0; i < 4; i++) g.set(x0 + w - 1 - i, top - 4, null);                                              // esquina de arriba aplastada
    for (i = 0; i < 3; i++) g.set(x0 + w - 1, top - 3 + i, FR[0]);
  }
  if (level >= 3) {                                                                                           // puerta de abajo salida de su sitio: rendija oscura a la izquierda
    for (j = top + 11; j <= ay - 3; j++) { g.set(x0, j, '#15131a'); g.set(x0 + 1, j, (j % 3 === 0) ? '#15131a' : FR[1]); }
    g.rect(x0 + 2, ay - 6, 5, 2, RU[1]); g.set(x0 + 4, ay - 7, RU[0]);
    dent(g, x0 + 5, top + 5, 5, 3);
  }
  outline(g, K);
  contact(g, cx, ay, 8, 2.2);
  return g;
}
function refriBroken() {                                                                                  // sin la puerta de abajo: cuelga abierta de una bisagra, adentro oscuro con parrillas
  var W = 36, H = 36, cx = 19, ay = 31, g = refriDraw(2), x0 = cx - 5, w = 11, top = ay - 25, i, j;
  var base = new G(W, H); base.blit(refriDraw(2), 8, 0);                                                   // el cuerpo corrido 8 px a la derecha
  g = base; x0 = 8 + 6;
  var bx = 8 + 11 - 5;                                                                                     // = cx-5 del cuerpo original en el lienzo nuevo
  bx = cx - 5;
  for (j = top + 10; j <= ay - 3; j++) for (i = 0; i < w; i++) {                                           // hueco: interior oscuro
    var c = '#1d1b22';
    if (i === 0 || i === w - 1) c = '#33313c';
    if ((j - top) % 6 === 3 && i > 0 && i < w - 1) c = '#8c93a0';                                          // parrillas
    if ((j - top) % 6 === 4 && i > 0 && i < w - 1) c = '#4a5560';
    g.set(bx + i, j, c);
  }
  g.rect(bx + 1, top + 20, 4, 2, '#cfd3cc'); g.set(bx + 1, top + 20, '#fff'); g.rect(bx + 7, top + 14, 3, 3, '#8f3a32');   // un taper y un frasco que quedaron
  for (i = 0; i < w; i++) g.set(bx + i, top + 10, '#5c6570');
  // la puerta: cuelga de la bisagra de arriba a la izquierda, torcida hacia afuera (mira el interior con anaqueles)
  var hx = bx - 1, hy = top + 11;
  for (j = 0; j < 17; j++) {
    var off = Math.round(j * j / 60 + j * 0.2), wd = 5;
    for (i = 0; i < wd; i++) {
      var cc = i === 0 ? '#e4e0cf' : (i === wd - 1 ? FR[1] : FR[3]);
      if (j === 0 || j === 16) cc = FR[0];
      g.set(hx - off - wd + 1 + i, hy + j, cc);
    }
    if (j % 5 === 2) for (i = 1; i < wd - 1; i++) g.set(hx - off - wd + 1 + i, hy + j, '#8c93a0');          // repisas del interior de la puerta
  }
  g.rect(hx - 2, hy, 3, 2, '#5c6570');                                                                      // bisagra arriba
  g.set(hx - 6, hy + 16, RU[1]); g.set(hx - 5, hy + 15, RU[2]);
  for (i = 0; i < 6; i++) g.set(bx + 1 + i, ay - 1, '#e8483a00');
  // goteo del liquido que se salio
  g.rect(bx + 3, ay, 5, 1, '#6b8c9c80'); g.rect(bx + 1, ay + 1, 8, 1, '#6b8c9c60');
  outline(g, K);
  return mk(g, cx, ay, 11, 6, { cast: { len: 0.42, a: 0.2 }, p: { tall: true } });
}
function refriBuild(level) { return mk(refriDraw(level), 11, 31, 11, 6, { cast: { len: 0.42, a: 0.2 }, p: { tall: true } }); }
props.refri = refriBuild(0);
props.refri.dmg = [1, 2, 3].map(refriBuild);
props.refri.broken = refriBroken();

/* ---- tirada: de espaldas (la puerta mira al cielo), 27 de largo x 11 de ancho ---- */
function refriLying(level, brk) {
  var W = 40, H = 26, ax = 19, ay = 21, g = new G(W, H), r = rng(5200 + level * 5), i, j, x0 = ax - 13, w = 27, y0 = ay - 15;       // cara superior: y0..y0+10
  for (j = 0; j < 11; j++) for (i = 0; i < w; i++) {
    var c = FR[3];
    if (j === 0) c = FR[4]; else if (j > 8) c = FR[2];
    if (i === 0) c = FR[4];
    g.set(x0 + i, y0 + j, c);
  }
  for (j = 0; j < 11; j++) { g.set(x0 + 9, y0 + j, FR[0]); g.set(x0 + 10, y0 + j, FR[4]); }                  // junta entre puertas
  for (j = 11; j <= 14; j++) for (i = 0; i < w; i++) g.set(x0 + i, y0 + j, j === 11 ? FR[2] : (j === 14 ? FR[0] : FR[1]));   // canto sur
  g.rect(x0 + w, y0 + 2, 2, 9, '#3b4250'); g.rect(x0 + w, y0 + 2, 2, 1, '#5c6570');                          // pie del lado de abajo
  g.rect(x0 + 3, y0 + 2, 2, 6, '#2d3340'); g.rect(x0 + 3, y0 + 2, 1, 6, '#8c93a0');
  g.rect(x0 + 14, y0 + 2, 2, 8, '#2d3340'); g.rect(x0 + 14, y0 + 2, 1, 8, '#8c93a0');
  g.rect(x0 + 18, y0 + 6, 5, 3, '#7a9cb8'); g.set(x0 + 18, y0 + 6, '#cfe0e4');
  for (j = 0; j < 14; j++) for (i = 0; i < 6; i++) if (r() < 0.45 - i * 0.06) g.set(x0 + w - 1 - i, y0 + j, pick(r, RU));
  speck(g, r, 16, x0, y0, x0 + w - 1, y0 + 14, [FR[2], FR[1], '#a29272']);
  if (level >= 1) { dent(g, x0 + 18, y0 + 2, 5, 3); g.line(x0 + 5, y0 + 8, x0 + 8, y0 + 4, FR[1]); }
  if (level >= 2) { dent(g, x0 + 2, y0 + 4, 4, 4); dent(g, x0 + 11, y0 + 6, 4, 3); for (j = 0; j < 6; j++) g.set(x0 + 25, y0 + j, null); g.set(x0 + 24, y0 + 2, FR[0]); }
  if (level >= 3) { for (i = 12; i < 26; i++) { g.set(x0 + i, y0 + 10, '#15131a'); g.set(x0 + i, y0 + 9, i % 2 ? '#15131a' : FR[1]); } g.rect(x0 + 16, y0 + 12, 6, 2, RU[1]); }
  if (brk) {                                                                                                 // la puerta grande saltó: queda abierta hacia el norte, colgando de una bisagra
    for (j = 0; j < 11; j++) for (i = 10; i < w; i++) {
      var cc = '#1d1b22';
      if (j === 0 || i === 10 || i === w - 1) cc = '#33313c';
      if (i > 11 && (i - 11) % 6 === 2 && j > 0) cc = '#8c93a0';
      g.set(x0 + i, y0 + j, cc);
    }
    g.rect(x0 + 13, y0 + 3, 3, 3, '#8f3a32'); g.rect(x0 + 21, y0 + 5, 4, 2, '#cfd3cc');
    for (j = 0; j < 8; j++) for (i = 0; i < 15; i++) {                                                       // la puerta, abierta, mostrando su cara interior
      var yy = y0 - 4 - j + Math.round(i * 0.35), xx = x0 + 10 + i;
      g.set(xx, yy, j === 0 ? FR[2] : (j === 7 ? FR[1] : (i === 14 ? FR[1] : FR[4])));
    }
    for (i = 2; i < 14; i += 4) g.set(x0 + 10 + i, y0 - 5 + Math.round(i * 0.35), '#8c93a0');
    g.rect(x0 + 8, y0 + 1, 3, 2, '#5c6570');
    g.set(x0 + 4, ay + 2, '#6b8c9c80');
  }
  outline(g, K);
  contact(g, ax, ay - 1, 15, 2.6);
  return mk(g, ax, ay - 1, 27, 12, { cast: { len: 0.22, a: 0.18 } });
}
props.refriTirada = refriLying(0, false);
props.refriTirada.dmg = [1, 2, 3].map(function (l) { return refriLying(l, false); });
props.refriTirada.broken = refriLying(2, true);

/* ============================ TELE DE TUBO ============================ */
var PL = ['#2a2832', '#4e4b5a', '#706c80', '#a29eb2'];                      // plastico oscuro del gabinete
function teleDraw(brk) {
  var W = 24, H = 26, cx = 11, ay = 21, g = new G(W, H), r = rng(5300 + (brk ? 9 : 0)), x0 = cx - 6, i, j;
  // gabinete: frente 12x9, tapa en 3 filas
  for (j = ay - 9; j <= ay - 1; j++) for (i = 0; i < 12; i++) g.set(x0 + i, j, i === 0 ? PL[3] : (i > 9 ? PL[0] : PL[2]));
  for (j = 1; j <= 3; j++) for (i = 1; i < 11; i++) g.set(x0 + i, ay - 9 - j, j === 3 ? PL[3] : (i > 8 ? PL[1] : PL[2]));
  for (i = 0; i < 12; i++) g.set(x0 + i, ay - 1, PL[0]);
  g.rect(x0 + 1, ay, 2, 1, PL[0]); g.rect(x0 + 9, ay, 2, 1, PL[0]);                                  // patitas
  // pantalla (vidrio) 8x6 y panel de mandos
  var sx = x0 + 1, sy = ay - 8;
  for (j = 0; j < 6; j++) for (i = 0; i < 8; i++) g.set(sx + i, sy + j, (i === 0 || j === 0) ? '#0f161b' : '#243038');
  if (!brk) { g.set(sx + 1, sy + 1, '#7a98a4'); g.set(sx + 2, sy + 1, '#5d7a86'); g.set(sx + 1, sy + 2, '#5d7a86'); g.set(sx + 3, sy + 1, '#3d5560'); g.set(sx + 2, sy + 2, '#3d5560'); g.set(sx + 6, sy + 4, '#3d5560'); }
  g.set(x0 + 10, ay - 7, '#9a9aa0'); g.set(x0 + 10, ay - 5, '#9a9aa0'); g.set(x0 + 11, ay - 7, PL[0]);
  for (j = 0; j < 3; j++) g.set(x0 + 10, ay - 3 + (j % 2), j % 2 ? PL[1] : PL[3]);
  // antena de conejo
  var bx = x0 + 6, by = ay - 12;
  g.rect(bx - 1, by, 3, 1, '#3b4250');
  if (!brk) { g.line(bx, by - 1, bx - 5, by - 9, '#a4abaa'); g.line(bx + 1, by - 1, bx + 6, by - 8, '#a4abaa'); g.set(bx - 5, by - 10, '#cfd3cc'); g.set(bx + 6, by - 9, '#cfd3cc'); }
  else { g.line(bx, by - 1, bx - 3, by - 6, '#a4abaa'); g.line(bx - 3, by - 6, bx - 7, by - 5, '#a4abaa'); g.line(bx + 1, by - 1, bx + 4, by - 3, '#a4abaa'); g.set(bx + 5, by - 3, '#cfd3cc'); }
  if (brk) {                                                                                        // pantalla estallada: vidrio en estrella, agujero negro, chispa
    g.rect(sx + 1, sy + 1, 5, 4, '#050709');
    g.line(sx + 3, sy + 2, sx + 0, sy + 0, '#a9bcc4'); g.line(sx + 3, sy + 2, sx + 7, sy + 1, '#8fa4ac'); g.line(sx + 3, sy + 3, sx + 6, sy + 5, '#a9bcc4'); g.line(sx + 3, sy + 3, sx + 1, sy + 5, '#8fa4ac');
    g.set(sx + 2, sy + 2, '#d4e4ea'); g.set(sx + 4, sy + 3, '#d4e4ea'); g.set(sx + 7, sy + 3, '#243038');
    g.set(sx + 8, sy - 1, '#f2e63c'); g.set(sx + 9, sy - 3, '#ffd24a'); g.set(sx + 7, sy - 3, '#ffffff'); g.set(sx + 10, sy - 2, '#ff8a2a');
    g.set(sx + 3, sy - 5, '#6a667280'); g.set(sx + 4, sy - 6, '#6a667260'); g.set(sx + 3, sy - 7, '#6a667240');
    for (i = 0; i < 4; i++) g.set(x0 + 1 + i * 2, ay + 1, '#cfe0e4');                              // vidrio en el suelo
  }
  speck(g, r, 6, x0, ay - 9, x0 + 11, ay - 1, [PL[1], PL[3]]);
  outline(g, K);
  contact(g, cx, ay, 8, 2);
  return g;
}
props.tele = mk(teleDraw(false), 11, 21, 12, 6, { cast: { len: 0.45, a: 0.2 } });
props.tele.broken = mk(teleDraw(true), 11, 21, 12, 6, { cast: { len: 0.45, a: 0.2 } });

/* ============================ SILLA ROTA ============================ */
var WD = RP.wood;                                                                         // ['#4a3028', '#6b4223', '#a86e38', '#c99458']
function sillaDraw() {
  var W = 20, H = 26, cx = 9, ay = 21, g = new G(W, H), r = rng(5400), i, j;
  // patas: delantera derecha, y las dos traseras detras del asiento; la delantera izquierda se rompio (queda el muñon)
  g.rect(cx + 4, ay - 6, 2, 6, WD[1]); g.rect(cx + 4, ay - 6, 1, 6, WD[2]);                     // delantera derecha
  g.rect(cx + 3, ay - 9, 1, 3, WD[0]); g.rect(cx - 4, ay - 9, 1, 3, WD[0]);                     // traseras, detras
  // asiento 10x3 con luz arriba; inclinado: baja 2 px del lado de la pata rota (izquierda)
  for (i = 0; i < 10; i++) {
    var drop = Math.round((9 - i) * 0.22), yy = ay - 9 + drop;
    g.set(cx - 5 + i, yy - 1, WD[3]); g.set(cx - 5 + i, yy, WD[2]); g.set(cx - 5 + i, yy + 1, WD[1]); g.set(cx - 5 + i, yy + 2, i < 4 ? WD[0] : WD[1]);
  }
  g.rect(cx - 5, ay - 6, 2, 3, WD[1]); g.set(cx - 5, ay - 6, WD[0]); g.set(cx - 4, ay - 3, WD[3]);   // muñon de la pata faltante, astillado
  // espaldar: dos montantes y dos travesaños, un poco ladeado
  g.rect(cx - 4, ay - 19, 2, 10, WD[1]); g.rect(cx - 4, ay - 19, 1, 10, WD[2]);
  g.rect(cx + 3, ay - 20, 2, 11, WD[1]); g.rect(cx + 3, ay - 20, 1, 11, WD[2]);
  g.rect(cx - 4, ay - 19, 9, 2, WD[3]); g.rect(cx - 4, ay - 17, 9, 1, WD[1]);
  g.rect(cx - 2, ay - 14, 5, 2, WD[2]); g.rect(cx - 2, ay - 14, 5, 1, WD[3]);
  speck(g, r, 8, cx - 5, ay - 19, cx + 5, ay - 3, ['#b8a57f', WD[0], '#7a9cb8']);              // pintura vieja descascarada
  g.set(cx + 1, ay - 8, '#8a8e8a'); g.set(cx - 2, ay - 12, '#8a8e8a');
  g.line(cx - 8, ay - 1, cx - 6, ay - 1, WD[2]); g.set(cx - 9, ay - 1, WD[0]);                  // la pata caida, en el piso
  outline(g, K);
  contact(g, cx, ay, 7, 1.8);
  return g;
}
function sillaBroken() {                                                                  // palos y tablas con clavos regados por el piso
  var W = 22, H = 14, ay = 10, g = new G(W, H), cx = 10;
  g.line(2, 7, 11, 4, WD[2]); g.line(2, 8, 11, 5, WD[1]);                                   // espaldar largo
  g.line(8, 8, 17, 8, WD[2]); g.line(8, 9, 17, 9, WD[1]);                                   // pata
  g.line(12, 5, 19, 3, WD[3]); g.line(12, 6, 19, 4, WD[1]);
  g.rect(5, 2, 7, 2, WD[2]); g.rect(5, 2, 7, 1, WD[3]); g.rect(5, 4, 7, 1, WD[0]);          // asiento partido
  g.rect(14, 6, 5, 2, WD[2]); g.rect(14, 6, 5, 1, WD[3]);
  g.set(3, 6, '#8a8e8a'); g.set(18, 7, '#8a8e8a'); g.set(11, 4, '#cfd3cc');
  g.rect(1, 10, 3, 1, WD[1]); g.set(4, 10, WD[0]);
  outline(g, K);
  contact(g, cx, ay + 1, 10, 2);
  return g;
}
props.sillaRota = mk(sillaDraw(), 9, 21, 9, 6, { cast: { len: 0.45, a: 0.2 } });
props.sillaRota.broken = mk(sillaBroken(), 10, 10, 14, 4, { cast: { len: 0.3, a: 0.16 } });

/* ============================ MESA VOLTEADA (boca arriba) ============================ */
function mesaDraw(level, brk) {
  var W = 26, H = 28, cx = 12, ay = 22, g = new G(W, H), r = rng(5500 + level + (brk ? 11 : 0)), i, j, x0 = cx - 7;
  if (brk) {                                                                               // el tablero partido en dos, patas sueltas
    for (j = 0; j < 9; j++) for (i = 0; i < 11; i++) g.set(x0 + i - 2, ay - 10 + j + Math.round(i * 0.4), j === 0 ? WD[3] : (j > 6 ? WD[0] : WD[1]));
    for (j = 0; j < 8; j++) for (i = 0; i < 9; i++) g.set(x0 + 9 + i, ay - 6 + j - Math.round(i * 0.3), j === 0 ? WD[3] : (j > 5 ? WD[0] : WD[1]));
    g.line(x0 + 6, ay - 10 + 3, x0 + 9, ay - 7, '#15131a'); g.line(x0 + 7, ay - 10 + 4, x0 + 10, ay - 6, '#15131a');
    g.line(x0 - 2, ay - 2, x0 + 4, ay + 2, WD[2]); g.line(x0 - 2, ay - 1, x0 + 4, ay + 3, WD[1]);     // patas por el suelo
    g.line(x0 + 12, ay + 1, x0 + 19, ay - 3, WD[2]); g.line(x0 + 12, ay + 2, x0 + 19, ay - 2, WD[1]);
    g.set(x0 + 6, ay - 3, '#cfd3cc'); g.set(x0 + 15, ay - 1, '#cfd3cc');
    outline(g, K);
    contact(g, cx + 2, ay + 2, 12, 2.2);
    return g;
  }
  // tablero visto por debajo: placa 14x8 con travesanos; patas 2x9 apuntando al cielo
  for (j = 0; j < 8; j++) for (i = 0; i < 14; i++) g.set(x0 + i, ay - 7 + j, j === 0 ? WD[2] : (j === 7 ? WD[0] : (i === 0 ? WD[2] : WD[1])));
  for (j = 0; j < 2; j++) for (i = 1; i < 13; i++) g.set(x0 + i, ay - 5 + j * 4, j ? WD[2] : WD[0]);                      // travesanos
  for (i = 0; i < 14; i++) g.set(x0 + i, ay + 1, WD[0]);                                    // canto del tablero (grosor)
  for (i = 0; i < 14; i++) g.set(x0 + i, ay + 0, i === 0 ? WD[3] : WD[2]);
  var legs = [[x0 + 1, ay - 6, 9], [x0 + 12, ay - 6, 9], [x0 + 1, ay + 0, 11], [x0 + 12, ay + 0, 11]];         // patas
  legs.forEach(function (L, k) {
    var h = L[2];
    if (level >= 1 && k === 3) h = 5;                                                       // una pata partida
    for (j = 0; j < h; j++) { g.set(L[0], L[1] - j, WD[3]); g.set(L[0] + 1, L[1] - j, WD[1]); g.set(L[0] + 2, L[1] - j, WD[0]); }
    if (level >= 1 && k === 3) { g.set(L[0], L[1] - 5, WD[0]); g.set(L[0] + 1, L[1] - 6, WD[2]); g.set(L[0], L[1] - 7, WD[3]); }
  });
  if (level >= 1) { g.line(x0 + 14, ay + 3, x0 + 18, ay + 2, WD[2]); g.line(x0 + 14, ay + 4, x0 + 18, ay + 3, WD[1]); g.set(x0 + 18, ay + 2, WD[0]); }   // la punta de la pata, en el suelo
  speck(g, r, 8, x0, ay - 7, x0 + 13, ay + 1, [WD[0], '#b8a57f']);
  outline(g, K);
  contact(g, cx + 1, ay + 1, 10, 2.2);
  return g;
}
props.mesaVolteada = mk(mesaDraw(0), 12, 22, 14, 8, { cast: { len: 0.45, a: 0.2 } });
props.mesaVolteada.dmg = [mk(mesaDraw(1), 12, 22, 14, 8, { cast: { len: 0.45, a: 0.2 } })];
props.mesaVolteada.broken = mk(mesaDraw(0, true), 12, 22, 20, 6, { cast: { len: 0.3, a: 0.16 } });

/* ============================ BOLSAS ============================ */
var BAGP = {
  k:  ['#0b090f', '#17151d', '#26242e', '#44415a', '#7c7a92'],
  c1: ['#2f4a70', '#3f6a98', '#6fa8d8', '#a8d0ea', '#dcecf6'],
  c2: ['#7d3010', '#a8501e', '#e3702e', '#f0a066', '#f8d2ac'],
  c3: ['#8a8578', '#b9b3a6', '#e8e4dc', '#f5f2ea', '#ffffff'],
  c4: ['#6b2b48', '#9a4a6c', '#d98ba0', '#eab4c2', '#f6dce4'],
  c5: ['#3b5a38', '#5e8a55', '#7fae6e', '#a8cf98', '#d0e6c4']                    // verde: solo un toque pequeño
};
function bagBlob(g, cx, cy, rx, ry, pal, seed) {                                  // bolsa llena y anudada: elipse sombreada, nudo arriba, brillo de plastico
  var r = rng(seed), x, y;
  for (y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy;
    if (d > 1) continue;
    var l = -dx * 0.6 - dy * 0.7 + (r() - 0.5) * 0.25, c = l > 0.45 ? pal[3] : (l > 0.05 ? pal[2] : (l > -0.45 ? pal[1] : pal[0]));
    g.set(x, y, c);
  }
  g.set(Math.round(cx - rx * 0.4), Math.round(cy - ry * 0.45), pal[4]);
  g.set(Math.round(cx - rx * 0.4) + 1, Math.round(cy - ry * 0.45), pal[3]);
  var tx = Math.round(cx), ty = Math.floor(cy - ry);                                // nudo
  g.set(tx, ty - 1, pal[1]); g.set(tx + 1, ty - 1, pal[2]); g.set(tx + 1, ty - 2, pal[1]); g.set(tx - 1, ty, pal[2]);
}
function bolsasDraw(v, brk) {
  var W = 28, H = 22, cx = 13, ay = 18, g = new G(W, H), r = rng(5600 + v * 13 + (brk ? 5 : 0));
  var sets = [['k', 'k', 'k'], ['c1', 'c2', 'c3'], ['k', 'c4', 'k']][v];
  var P = function (k) { return BAGP[k]; };
  if (!brk) {
    bagBlob(g, cx - 6, ay - 4, 5.5, 4.5, P(sets[0]), 11 + v); bagBlob(g, cx + 5, ay - 4, 5.5, 4.2, P(sets[1]), 22 + v);
    bagBlob(g, cx - 1, ay - 8, 4.8, 4, P(sets[2]), 33 + v);
    if (v === 1) { g.set(cx + 8, ay - 7, BAGP.c5[2]); g.set(cx + 9, ay - 7, BAGP.c5[1]); }
    g.set(cx + 10, ay - 1, '#e8e4dc'); g.set(cx - 11, ay - 1, '#8fb0b8'); g.set(cx - 10, ay - 1, '#d2e6e6');
  } else {                                                                              // bolsas abiertas y aplastadas, basura regada
    bagBlob(g, cx - 5, ay - 2, 6, 2.8, P(sets[0]), 41 + v); bagBlob(g, cx + 5, ay - 2, 6, 2.6, P(sets[1]), 52 + v);
    g.line(cx - 9, ay - 3, cx - 3, ay - 1, '#0b090f'); g.line(cx + 2, ay - 3, cx + 8, ay - 1, '#0b090f');
    var junk = [['#e8e4dc', 2, 1], ['#b8a57f', 3, 1], ['#8fb0b8', 1, 2], ['#e08a2a', 2, 1], ['#c9362e', 2, 1], ['#d2e6e6', 3, 1], ['#e8e4dc', 1, 1]];
    junk.forEach(function (q, i) { var jx = ri(r, 1, W - 5), jy = ay + ri(r, -1, 3); g.rect(jx, jy, q[1], q[2], q[0]); });
    g.rect(cx - 2, ay + 1, 4, 2, '#b8a57f'); g.set(cx - 1, ay + 1, '#d8c8a0');
  }
  outline(g, K);
  contact(g, cx, ay + 1, 12, 2.4);
  return g;
}
props.bolsasCerro = [0, 1, 2].map(function (v) {
  var c = mk(bolsasDraw(v, false), 13, 18, 16, 6, { cast: { len: 0.4, a: 0.2 } });
  c.broken = mk(bolsasDraw(v, true), 13, 18, 14, 4, { cast: { len: 0.2, a: 0.14 } });
  return c;
});

/* ============================ COLCHON ============================ */
function colchonDraw() {
  var W = 28, H = 38, ax = 13, ay = 33, g = new G(W, H), r = rng(5700), x0 = 3, y0 = ay - 30, w = 22, h = 28, i, j;
  for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
    var c = ((i >> 2) & 1) ? '#a9b0b8' : '#bfc0bc';                                      // tela a rayas
    if (j < 1 || i < 1) c = '#d2d2cc'; if (i >= w - 1) c = '#8a919c';
    g.set(x0 + i, y0 + j, c);
  }
  for (j = 4; j < h - 2; j += 6) for (i = 4; i < w - 2; i += 6) { g.set(x0 + i, y0 + j, '#6b7480'); g.set(x0 + i + 1, y0 + j + 1, '#9aa2ac'); }     // botones del acolchado
  for (j = 0; j < 3; j++) for (i = 0; i < w; i++) g.set(x0 + i, y0 + h + j, j === 0 ? '#9aa2ac' : (j === 1 ? '#7a8290' : '#5c6470'));                  // canto
  [[6, 8, 5, 4], [13, 17, 7, 5], [4, 22, 4, 3], [12, 3, 6, 3], [2, 14, 3, 5]].forEach(function (b) {                  // manchas de humedad
    for (j = 0; j < b[3]; j++) for (i = 0; i < b[2]; i++) if ((i + j) % 2 === 0 || r() < 0.5) g.set(x0 + b[0] + i, y0 + b[1] + j, r() < 0.5 ? '#a8987a' : '#8c8068');
  });
  for (j = 0; j < 5; j++) for (i = 0; i < 6; i++) if (j + i < 7) g.set(x0 + w - 1 - i, y0 + j, (i + j) % 2 ? '#d8c27a' : '#e8d898');      // esquina rota con espuma amarilla
  g.set(x0 + w - 1, y0, '#b8a05a');
  speck(g, r, 14, x0, y0, x0 + w - 1, y0 + h - 1, ['#a29aa2', '#e4e6e6']);
  outline(g, K);
  contact(g, ax, ay + 1, 13, 2.4);
  return g;
}
props.colchon = mk(colchonDraw(), 13, 33, 22, 8, { cast: { len: 0.2, a: 0.14 } });

/* ============================ LLANTA ============================ */
function llantaDraw() {
  var W = 16, H = 14, cx = 7, ay = 10, g = new G(W, H), i, j;
  for (j = ay - 5; j <= ay; j++) for (i = cx - 5; i <= cx + 5; i++) {                      // aro exterior: elipse 11x6
    var dx = (i - cx) / 5.4, dy = (j - (ay - 2.5)) / 3.2;
    if (dx * dx + dy * dy > 1) continue;
    var c = '#3a3844';
    if (j >= ay - 1) c = '#15131a'; else if (j <= ay - 4 && i < cx + 1) c = '#6e6c80';
    g.set(i, j, c);
  }
  for (j = ay - 4; j <= ay - 1; j++) for (i = cx - 3; i <= cx + 3; i++) {                  // el hueco, con tierra del suelo adentro
    var ex = (i - cx) / 3.2, ey = (j - (ay - 2.6)) / 1.6;
    if (ex * ex + ey * ey > 1) continue;
    g.set(i, j, j <= ay - 3 ? '#4b372b' : '#6b5440');
  }
  g.set(cx - 4, ay - 4, '#6a6878'); g.set(cx + 4, ay - 1, '#0b090f');
  for (i = 0; i < 5; i++) g.set(cx - 4 + i * 2, ay, '#0b090f');                            // taco gastado
  outline(g, K);
  contact(g, cx, ay + 1, 7, 1.8);
  return g;
}
props.llanta = mk(llantaDraw(), 7, 10, 10, 5, { cast: { len: 0.3, a: 0.16 } });

/* ============================ CILINDRO AZUL (200 L, lona y soga) ============================ */
var BL = ['#0e2a62', '#143a81', '#2a5aa6', '#4d8fc0', '#8ec0e0'];                          // cilindro: cobalto
var LN = ['#2a5a94', '#3f7bc4', '#5f96d6', '#8cb6e6'];                                     // lona
function cilindroDraw() {
  var W = 20, H = 28, cx = 9, ay = 23, g = new G(W, H), r = rng(5800), i, j, x0 = cx - 5;
  for (j = ay - 15; j <= ay - 1; j++) for (i = 0; i < 11; i++) {                           // cuerpo 11x15
    var c = BL[2];
    if (i === 0) c = BL[3]; else if (i === 1 || i === 2) c = BL[3]; else if (i > 7 && i < 10) c = BL[1]; if (i === 10) c = BL[0]; if (i === 3 || i === 4) c = BL[2];
    if (i === 1) c = BL[4];
    g.set(x0 + i, j, c);
  }
  for (i = 0; i < 11; i++) {                                                                // aros de refuerzo (dos molduras)
    g.set(x0 + i, ay - 11, i < 3 ? BL[3] : BL[0]); g.set(x0 + i, ay - 10, i < 3 ? BL[2] : BL[1]);
    g.set(x0 + i, ay - 5, i < 3 ? BL[3] : BL[0]); g.set(x0 + i, ay - 4, i < 3 ? BL[2] : BL[1]);
    g.set(x0 + i, ay - 1, BL[0]);
  }
  speck(g, r, 10, x0, ay - 15, x0 + 10, ay - 2, [BL[1], BL[3], '#b8a57f']);                // pintura saltada
  g.rect(x0 + 4, ay - 8, 3, 1, '#d8d4c4'); g.rect(x0 + 4, ay - 7, 2, 1, '#a8a49c');          // restos de etiqueta
  // la lona: tapa la boca y cuelga 3 px por el lado; soga con nudo
  for (j = ay - 20; j <= ay - 14; j++) for (i = -1; i < 12; i++) {
    var e = j - (ay - 20), edge = (i === -1 || i === 11) && e < 3;
    var jj = j;
    if (j > ay - 17 && (i < 0 || i > 10)) continue;
    g.set(x0 + i, jj, e === 0 ? LN[3] : (i < 3 ? LN[2] : (i > 8 ? LN[0] : LN[1])));
  }
  for (i = 0; i < 12; i += 3) { g.set(x0 + i + 1, ay - 14, LN[0]); g.set(x0 + i + 2, ay - 15, LN[2]); }
  for (i = 0; i < 11; i++) g.set(x0 + i, ay - 13, i % 3 === 0 ? LN[0] : LN[1]);               // pliegues que caen
  g.rect(x0, ay - 15, 11, 1, '#b8a57f'); g.set(x0 + 5, ay - 14, '#8a7650'); g.set(x0 + 6, ay - 14, '#8a7650'); g.set(x0 + 7, ay - 13, '#b8a57f'); g.set(x0 + 4, ay - 13, '#b8a57f');   // soga y nudo
  outline(g, K);
  contact(g, cx, ay, 7, 2);
  return g;
}
function cilindroBroken() {                                                               // volcado y abollado, la lona arrugada a un lado, un charquito
  var W = 36, H = 20, ax = 14, ay = 14, g = new G(W, H), r = rng(5801), i, j, x0 = 3;
  for (j = ay - 10; j <= ay; j++) for (i = 0; i < 18; i++) {                                // cuerpo horizontal 18x11
    var c = BL[2];
    if (j === ay - 10) c = BL[4]; else if (j === ay - 9) c = BL[3]; else if (j > ay - 3) c = BL[1]; if (j === ay) c = BL[0];
    g.set(x0 + i, j, c);
  }
  for (j = ay - 10; j <= ay; j++) { g.set(x0 + 5, j, j > ay - 4 ? BL[0] : BL[1]); g.set(x0 + 12, j, j > ay - 4 ? BL[0] : BL[1]); }   // aros
  g.ell(x0 + 18, ay - 5, 2.4, 5.2, BL[1]); g.ell(x0 + 17.5, ay - 5, 1.4, 4, BL[2]);        // fondo
  g.ell(x0, ay - 5, 3, 5.4, '#0c1a38'); g.ell(x0 - 0.4, ay - 5, 2, 4.2, '#050a18');        // boca oscura a la izquierda
  g.rect(x0 + 8, ay - 8, 4, 3, '#2a5aa6'); g.set(x0 + 8, ay - 8, BL[0]); g.set(x0 + 9, ay - 7, BL[0]);               // abolladura
  speck(g, r, 8, x0, ay - 9, x0 + 17, ay - 1, ['#b8a57f', BL[1]]);
  for (j = 0; j < 5; j++) for (i = 0; i < 8; i++) if (r() < 0.8 - j * 0.1) g.set(x0 + 22 + i, ay - 5 + j + (i > 5 ? 1 : 0), j === 0 ? LN[3] : (i % 3 ? LN[1] : LN[0]));   // lona tirada
  g.set(x0 + 24, ay - 5, '#b8a57f'); g.set(x0 + 26, ay - 3, '#b8a57f');
  for (j = 0; j < 3; j++) for (i = 0; i < 14 + j * 2; i++) if (r() < 0.9) g.set(x0 - 8 + i + (j > 0 ? 0 : 3), ay + 1 + j, j === 0 ? '#8fb0c0' : (j === 1 ? '#6b8c9c' : '#5c7a8c'));     // charco
  outline(g, K);
  contact(g, ax + 2, ay + 1, 13, 2.2);
  return g;
}
props.cilindroAzul = mk(cilindroDraw(), 9, 23, 9, 5, { cast: { len: 0.45, a: 0.2 } });
props.cilindroAzul.broken = mk(cilindroBroken(), 14, 14, 18, 5, { cast: { len: 0.25, a: 0.16 } });

/* ============================ ESCOBA EN LA PARED ============================ */
function escobaDraw() {
  var W = 12, H = 32, cx = 5, ay = 27, g = new G(W, H), r = rng(5900), j, i;
  for (j = 0; j < 22; j++) { var x = cx + 1 - Math.round(j * 0.1); g.set(x, ay - 5 - j, WD[3]); g.set(x + 1, ay - 5 - j, WD[1]); }                      // palo apenas torcido
  g.set(cx + 1, ay - 27, WD[3]); g.set(cx, ay - 26, '#6a6a60');                                                                                    // argolla de colgar
  g.rect(cx - 1, ay - 8, 5, 2, '#c9362e'); g.rect(cx - 1, ay - 8, 5, 1, '#e8483a'); g.set(cx + 3, ay - 7, '#7a2a26');                                // amarre rojo
  for (j = 0; j < 7; j++) for (i = -3 + (j > 3 ? -1 : 0); i <= 4 + (j > 3 ? 1 : 0); i++) {                                                         // cerdas: paja amarilla
    var c = (i + j) % 3 === 0 ? '#a8884a' : '#d0b068';
    if (i < -1) c = '#e0c680'; if (i > 2) c = '#8a6c36';
    g.set(cx + i, ay - 6 + j, c);
  }
  for (i = -3; i <= 4; i += 2) g.set(cx + i, ay + 1, '#8a6c36');                                                                                  // puntas
  speck(g, r, 6, cx - 4, ay - 6, cx + 5, ay + 1, ['#6a5026', '#e8d89a']);
  outline(g, K);
  contact(g, cx + 1, ay + 1, 5, 1.4);
  return g;
}
props.escobaPared = mk(escobaDraw(), 5, 27, 5, 3, { cast: { len: 0.35, a: 0.16 }, p: { tall: false } });

/* ============================ COLUMNA DE FIERRO (sin terminar) ============================ */
function columnaDraw() {
  var W = 20, H = 40, cx = 9, ay = 35, g = new G(W, H), r = rng(6000), i, j, x0 = cx - 3;
  for (j = ay - 14; j <= ay - 1; j++) for (i = 0; i < 7; i++) g.set(x0 + i, j, i === 0 ? CONC[3] : (i < 3 ? CONC[2] : (i < 6 ? CONC[1] : CONC[0])));       // columna de concreto 7x14
  for (i = 0; i < 7; i++) g.set(x0 + i, ay - 14, CONC[3]);
  for (j = ay - 13; j < ay - 1; j += 5) for (i = 0; i < 7; i++) g.set(x0 + i, j, CONC[0]);                                                              // juntas de vaciado
  speck(g, r, 10, x0, ay - 13, x0 + 6, ay - 1, [CONC[0], CONC[3], '#8a4b38']);
  [[-2, 20, 0], [0, 25, 1], [3, 18, 0], [5, 23, -1], [-3, 16, 1]].forEach(function (b, k) {                                                         // 5 varillas al aire: 12-16 px
    var bx = x0 + 1 + (k % 5), ln = b[1] * 0.7, dx = b[2];
    for (j = 0; j < ln; j++) { var yy = ay - 15 - j, xx = bx + Math.round(dx * j / 9); g.set(xx, yy, j % 7 === 3 ? '#a0603f' : '#7a4a32'); }
    g.set(bx + Math.round(dx * ln / 9), ay - 15 - Math.floor(ln), '#a0603f');
  });
  g.set(x0 + 2, ay - 15 - 8, '#d8d4c4'); g.set(x0 + 2, ay - 15 - 7, '#8fb0b8'); g.rect(x0 + 1, ay - 15 - 6, 3, 1, '#2f5a52');                               // botella de plastico en una punta
  outline(g, K);
  contact(g, cx, ay, 6, 1.6);
  return g;
}
var CONC = { 0: '#4b4957', 1: '#66656b', 2: '#8a8884', 3: '#aeab9d' };
props.columnaFierro = mk(columnaDraw(), 9, 35, 0, 0, { cast: { len: 0.3, a: 0.16 } });

/* ============================ CRUZ CHICA ============================ */
function cruzDraw() {
  var W = 16, H = 30, cx = 7, ay = 26, g = new G(W, H), r = rng(6100), i, j;
  // montoncito de piedras al pie
  [[-4, 1, 4, 3], [0, 1, 5, 3], [4, 0, 3, 3], [-2, -2, 4, 3], [1, -2, 4, 3]].forEach(function (s, k) {
    for (j = 0; j < s[3]; j++) for (i = 0; i < s[2]; i++) { if ((i === 0 || i === s[2] - 1) && (j === 0 || j === s[3] - 1)) continue; g.set(cx + s[0] + i, ay - 2 + s[1] + j, (j === 0 || i === 0) ? '#aaa69b' : (j === s[3] - 1 || i === s[2] - 1 ? '#5d5b5a' : '#7b7870')); }
  });
  // la cruz: poste 2x20, travesano 10x2 a 1/3 de arriba; blanca, algo descascarada
  for (j = 0; j < 20; j++) { g.set(cx, ay - 3 - j, '#f0eee4'); g.set(cx + 1, ay - 3 - j, '#b9b4a9'); }
  for (i = -4; i <= 5; i++) { g.set(cx + i, ay - 18, '#f0eee4'); g.set(cx + i, ay - 17, '#b9b4a9'); }
  g.set(cx, ay - 3 - 19, '#f0eee4'); g.set(cx + 1, ay - 3 - 19, '#f0eee4');
  speck(g, r, 6, cx - 4, ay - 22, cx + 5, ay - 4, ['#a29272', '#8c8a93']);
  // flores de plastico en una lata, a un lado
  g.rect(cx + 5, ay - 4, 3, 3, '#8a8e8a'); g.rect(cx + 5, ay - 4, 3, 1, '#cfd3cc'); g.set(cx + 7, ay - 3, '#5c6570');
  g.set(cx + 5, ay - 6, '#c9362e'); g.set(cx + 6, ay - 7, '#d83c7a'); g.set(cx + 7, ay - 6, '#e8c040'); g.set(cx + 6, ay - 6, '#c9362e'); g.set(cx + 6, ay - 5, '#5c6570');
  outline(g, K);
  contact(g, cx, ay, 7, 1.6);
  return g;
}
props.cruzChica = mk(cruzDraw(), 7, 26, 8, 4, { cast: { len: 0.4, a: 0.18 } });

/* ============================ FOGON CON OLLA ============================ */
function fogonDraw() {
  var W = 30, H = 28, cx = 14, ay = 22, g = new G(W, H), r = rng(6200), i, j;
  // ceniza y carbon en el suelo
  for (i = 0; i < 11; i++) { var gx = cx - 7 + i; g.set(gx, ay + 1, i % 3 ? '#4a4756' : '#2d2b33'); if (i % 2) g.set(gx, ay + 2, '#6a6672'); }
  // tres piedras/ladrillos del fogon
  function stone(x, y, w, h, hot) { for (var q = 0; q < h; q++) for (var p = 0; p < w; p++) { if ((p === 0 || p === w - 1) && (q === 0 || q === h - 1)) continue; g.set(x + p, y + q, q === 0 || p === 0 ? '#aaa69b' : (q === h - 1 || p === w - 1 ? '#4a4756' : '#7b7870')); } }
  stone(cx - 9, ay - 5, 5, 6); stone(cx + 4, ay - 5, 5, 6); stone(cx - 2, ay - 8, 5, 5);
  // lenas cruzadas con brasa
  g.line(cx - 6, ay - 1, cx + 5, ay - 3, '#6b4223'); g.line(cx - 6, ay - 2, cx + 5, ay - 4, '#a86e38'); g.line(cx - 5, ay - 3, cx + 4, ay, '#4a3028');
  g.set(cx - 3, ay - 2, '#ff8a2a'); g.set(cx - 2, ay - 3, '#ffd24a'); g.set(cx + 1, ay - 2, '#ff8a2a'); g.set(cx, ay - 1, '#d2562a'); g.set(cx + 3, ay - 2, '#d2562a');
  // la olla grande (aprox. 10x8 px, de aluminio ennegrecido) sobre las piedras
  var ox = cx - 5, oy = ay - 15;
  for (j = 0; j < 9; j++) for (i = 0; i < 11; i++) {
    var dx = (i - 5) / 5.4, wide = j < 2 ? 0.8 : 1; if (dx * dx > wide) continue;
    g.set(ox + i, oy + j + 1, i < 2 ? '#55526a' : (i > 8 ? '#15131a' : (j > 5 ? '#1c1a22' : '#2d2b33')));
  }
  g.rect(ox + 1, oy, 9, 2, '#c9cbcc'); g.rect(ox + 1, oy, 9, 1, '#e8e8e6'); g.set(ox + 9, oy + 1, '#8a8e8a');          // tapa / borde de aluminio
  g.rect(ox - 1, oy + 2, 2, 2, '#c9cbcc'); g.rect(ox + 10, oy + 2, 2, 2, '#8a8e8a');                                    // asas
  g.rect(ox + 7, oy - 3, 1, 5, '#b88b5e'); g.set(ox + 7, oy - 3, '#d8b080'); g.rect(ox + 6, oy - 4, 3, 1, '#b88b5e');  // cucharon de palo
  g.set(ox + 3, oy + 4, '#6a6672'); g.set(ox + 4, oy + 5, '#55526a');
  speck(g, r, 6, ox, oy + 2, ox + 10, oy + 8, ['#15131a', '#55526a']);
  outline(g, K);
  contact(g, cx, ay, 10, 2);
  return g;
}
(function () {
  var c = mk(fogonDraw(), 14, 22, 18, 8, { cast: { len: 0.4, a: 0.2 }, p: { smoke: { x: 0, y: -18 } } });
  props.fogon = c;
})();

/* ============================ CAMION CISTERNA (de costado, mira al este) ============================ */
function cisternaDraw() {
  var W = 136, H = 64, ay = 56, g = new G(W, H), r = rng(6800), i, j, x, y;
  var TB = ['#2c4a78', '#3b5e92', '#4670ab', '#5283c5', '#6c9bd7', '#8fb3e0'];       // tanque: pintura azul descascarada
  var YC = ['#7f6420', '#a8872a', '#c4a032', '#d9b030', '#ecd062'];                  // cabina amarilla
  var X0 = 14, X1 = 94, TT = ay - 45, TBt = ay - 21;                                // tanque: x 14..94, filas TT..TBt (24 de alto)
  // ruedas (se dibujan primero; el chasis las tapa en parte)
  function wheel(cx, cy, rd) {
    g.disc(cx, cy, rd, '#1f1d24'); g.disc(cx - 1, cy - 1, rd - 1.5, '#2e2c33'); g.disc(cx, cy, rd - 4, '#8c93a0'); g.disc(cx, cy, rd - 5.4, '#5c6570'); g.disc(cx, cy, 1.4, '#cfd3cc');
    for (var a = 0; a < 6; a++) { var an = a * Math.PI / 3 + 0.3; g.set(Math.round(cx + Math.cos(an) * (rd - 2.5)), Math.round(cy + Math.sin(an) * (rd - 2.5)), '#15131a'); }
    for (var a2 = 0; a2 < 12; a2++) { var an2 = a2 * Math.PI / 6; g.set(Math.round(cx + Math.cos(an2) * (rd - 0.4)), Math.round(cy + Math.sin(an2) * (rd - 0.4)), '#0b090f'); }
  }
  // chasis
  g.rect(X0 - 2, ay - 22, X1 - X0 + 34, 3, '#3b4250'); g.rect(X0 - 2, ay - 22, X1 - X0 + 34, 1, '#7e868a'); g.rect(X0 - 2, ay - 19, X1 - X0 + 34, 1, '#1c1a22');
  // guardabarros traseros y ruedas gemelas
  [28, 45].forEach(function (cx) { g.rect(cx - 9, ay - 21, 19, 3, '#3b4250'); wheel(cx, ay - 8, 8); g.rect(cx - 9, ay - 21, 19, 1, '#5c6570'); });
  wheel(108, ay - 8, 8); g.rect(99, ay - 21, 19, 3, '#3b4250'); g.rect(99, ay - 21, 19, 1, '#5c6570');
  // tanque cilindrico (luz arriba): bandas
  for (y = TT; y <= TBt; y++) {
    var t = (y - TT) / (TBt - TT), c = t < 0.07 ? TB[5] : (t < 0.2 ? TB[4] : (t < 0.45 ? TB[3] : (t < 0.62 ? TB[2] : (t < 0.82 ? TB[1] : TB[0]))));
    for (x = X0; x <= X1; x++) g.set(x, y, c);
  }
  for (j = 0; j < 4; j++) { for (i = 0; i < 4 - j; i++) { g.set(X0 + i, TT + j, null); g.set(X1 - i, TT + j, null); g.set(X0 + i, TBt - j, null); g.set(X1 - i, TBt - j, null); } }   // extremos redondeados
  // costuras de soldadura (anillos)
  [34, 54, 74].forEach(function (wx) { for (y = TT + 1; y <= TBt - 1; y++) { g.set(wx, y, TB[0]); g.set(wx + 1, y, TB[4]); } });
  // franja reflectiva roja y blanca de la parte baja
  for (x = X0 + 2; x <= X1 - 2; x++) { var red = Math.floor((x - X0) / 5) % 2 === 0; g.set(x, TBt - 4, red ? '#c9362e' : '#e8e4dc'); g.set(x, TBt - 3, red ? '#a82a24' : '#bfb9a8'); }
  // escotilla y barandilla
  g.rect(40, TT - 5, 14, 5, '#7e868a'); g.rect(40, TT - 5, 14, 1, '#cfd3cc'); g.rect(40, TT - 1, 14, 1, '#3b4250'); g.rect(44, TT - 7, 6, 2, '#a4abaa'); g.set(44, TT - 7, '#cfd3cc'); g.rect(45, TT - 3, 4, 1, '#3b4250');
  for (x = 20; x <= 86; x += 11) { g.line(x, TT - 4, x, TT, '#5c6570'); }
  g.line(20, TT - 4, 86, TT - 4, '#7e868a'); g.line(20, TT - 3, 86, TT - 3, '#3b4250');
  // escalera trasera
  for (y = TT + 2; y <= TBt + 1; y++) { g.set(X0 + 3, y, '#5c6570'); g.set(X0 + 8, y, '#5c6570'); if ((y & 1) === 0) g.rect(X0 + 3, y, 6, 1, '#a4abaa'); }
  // pintura saltada, oxido, manchas verdes de humedad
  speck(g, r, 34, X0, TT + 2, X1, TBt - 1, [TB[5], TB[4], '#b8a57f', '#8f5b47']);
  for (i = 0; i < 6; i++) { var sx = ri(r, X0 + 6, X1 - 4), sy = ri(r, TT + 3, TT + 12); for (j = 0; j < ri(r, 5, 10); j++) g.set(sx + (j % 3 === 2 ? 1 : 0), sy + j, j % 2 ? '#5f8a70' : '#4f7a68'); }
  for (i = 0; i < 4; i++) { var rx = ri(r, X0 + 4, X1 - 10); for (j = 0; j < 3; j++) for (x = 0; x < ri(r, 3, 6); x++) g.set(rx + x, TBt - 5 + j, j ? '#8f5b47' : '#b06a3e'); }
  // letras al costado del tanque: AGUA + matricula inventada
  px.text(g, 'AGUA', 22, TT + 4, { font: 'a7', ink: '#e8e4dc', shadow: TB[0] });
  px.text(g, 'OBR-123', 22, TT + 14, { font: 'a5', ink: '#f0f0e6' });
  // caja de valvulas y mangueras gruesas colgando de atras
  g.rect(X0 - 8, ay - 26, 8, 7, '#3b4250'); g.rect(X0 - 8, ay - 26, 8, 1, '#7e868a'); g.rect(X0 - 8, ay - 20, 8, 1, '#1c1a22'); g.rect(X0 - 6, ay - 24, 4, 2, '#c8742a'); g.set(X0 - 5, ay - 24, '#e8a050');
  var HO = function (k) { return ['#9a9a82', '#7a7a68', '#4a4a3c'][k]; };
  curve(g, X0 - 7, ay - 22, 3, ay - 2, 10, HO, 3); curve(g, X0 - 6, ay - 22, 7, ay - 1, 6, HO, 3);
  g.line(X0 - 8, ay - 21, X0 - 11, ay - 12, '#c8742a'); g.line(X0 - 7, ay - 21, X0 - 10, ay - 12, '#8a4a1a');
  g.rect(X0 - 12, ay - 15, 3, 4, '#8c93a0'); g.set(X0 - 12, ay - 15, '#cfd3cc');                                              // punta de la manguera naranja, alzada
  // cabina amarilla (cabina adelantada): x 96..126
  var CX0 = 97, CX1 = 127, CT = ay - 44;
  for (y = CT; y <= ay - 20; y++) for (x = CX0; x <= CX1; x++) {
    var tc = (y - CT) / (ay - 20 - CT), c2 = tc < 0.07 ? YC[4] : (tc < 0.55 ? YC[3] : (tc < 0.85 ? YC[2] : YC[1]));
    if (x === CX1) c2 = YC[1]; if (x === CX0) c2 = YC[3];
    g.set(x, y, c2);
  }
  for (j = 0; j < 3; j++) for (i = 0; i < 3 - j; i++) { g.set(CX1 - i, CT + j, null); }                                     // frente redondeado
  for (x = CX0; x <= CX1; x++) { g.set(x, CT + 1, YC[4]); }
  g.rect(CX0 + 5, CT + 4, 22, 1, '#c9362e'); g.rect(CX0 + 5, CT + 5, 22, 1, '#8f2a24');                                      // visera roja
  // ventana: parabrisas + lateral
  for (y = CT + 7; y <= CT + 18; y++) for (x = CX0 + 6; x <= CX1 - 3; x++) g.set(x, y, (x - CX0 < 9 || y - CT < 9) ? '#2d3d4a' : '#243038');
  for (y = CT + 7; y <= CT + 18; y++) { g.set(CX0 + 6, y, '#5c6570'); g.set(CX1 - 3, y, '#5c6570'); } for (x = CX0 + 6; x <= CX1 - 3; x++) { g.set(x, CT + 7, '#5c6570'); g.set(x, CT + 18, '#5c6570'); }
  g.line(CX0 + 8, CT + 17, CX0 + 14, CT + 9, '#8fb0b8'); g.line(CX0 + 16, CT + 17, CX0 + 19, CT + 12, '#4d6676');
  g.line(CX0 + 15, CT + 7, CX0 + 15, CT + 18, '#5c6570');                                                                 // marco de la puerta
  g.line(CX0 + 15, CT + 19, CX0 + 15, ay - 21, YC[1]); g.rect(CX0 + 12, CT + 22, 3, 1, '#3b4250'); g.rect(CX0 + 12, CT + 23, 3, 1, '#cfd3cc');   // manija
  // espejo, faro, paragolpes con parrilla
  g.rect(CX1 + 1, CT + 10, 3, 8, '#1c1a22'); g.rect(CX1 + 1, CT + 10, 1, 8, '#4a4756'); g.rect(CX1 - 1, CT + 14, 3, 1, '#3b4250');
  g.rect(CX1 - 3, ay - 27, 5, 3, '#f6e6b0'); g.set(CX1 - 3, ay - 27, '#ffffff'); g.rect(CX1 - 3, ay - 24, 5, 1, '#8a6c36');
  g.rect(CX1 - 5, ay - 22, 9, 3, '#3b4250'); g.rect(CX1 - 5, ay - 22, 9, 1, '#a4abaa');
  for (x = CX1 - 4; x <= CX1 - 1; x++) g.set(x, ay - 21, '#8c93a0');
  g.rect(CX0 + 1, ay - 29, 18, 2, '#c9362e'); for (x = CX0 + 3; x < CX0 + 19; x += 6) g.rect(x, ay - 29, 3, 2, '#e8e4dc');   // reflectiva de la cabina
  speck(g, r, 12, CX0, CT + 20, CX1, ay - 21, ['#8f5b47', YC[1], '#b8a57f']);                                              // descascarado
  g.rect(CX0 - 3, CT + 14, 3, 7, '#3b4250'); g.rect(CX0 - 3, CT + 14, 3, 1, '#7e868a');                                    // escape trasero
  outline(g, K);
  // sombra de contacto larga
  contact(g, 68, ay, 56, 3.4, '#2a244070');
  return g;
}
props.cisterna = mk(cisternaDraw(), 70, 56, 108, 20, { cast: { len: 0.3, a: 0.2 }, p: { tall: true } });

/* ============================ POSTE DE MADERA (eucalipto inclinado) ============================ */
var EU = ['#2d2018', '#4a3a2c', '#6b5a47', '#8a7660', '#a8957b'];                 // eucalipto gris con fisuras
function posteMaderaDraw(seed) {
  var W = 72, H = 150, B = 144, cx = 22, g = new G(W, H), r = rng(seed), lean = 0.105, h, i;
  var topH = 134;                                                                  // 8,4 m a 16 px/m ~ 134 (se comprime por encima de 2,2 m)
  function px_(hh) { return cx + Math.round(hh * lean); }
  function Y(hh) { return B - hh; }
  for (h = 0; h <= topH; h++) {                                                    // fuste: 4 px abajo, 3 arriba
    var w = h < 40 ? 4 : 3, x = px_(h) - (w >> 1), cols = w === 4 ? [EU[3], EU[2], EU[1], EU[0]] : [EU[3], EU[2], EU[1]];
    if (r() < 0.04) cols = [EU[4], EU[2], EU[1], EU[0]];
    for (i = 0; i < w; i++) g.set(x + i, Y(h), cols[i]);
  }
  for (h = 4; h < topH; h += 6 + ((h * 7) % 5)) { var fx = px_(h) - 1 + (h % 3); g.set(fx, Y(h), EU[0]); g.set(fx, Y(h + 1), EU[1]); }     // fisuras / nudos
  for (h = 0; h < 6; h++) for (i = -3; i <= 3; i++) if (!g.get(px_(h) + i, Y(h))) g.set(px_(h) + i, Y(h), h < 3 ? '#5a4636' : EU[1]);          // base apisonada con piedras
  g.rect(px_(0) - 4, Y(0), 8, 1, '#5d5b5a'); g.set(px_(0) - 4, Y(0), '#aaa69b'); g.set(px_(0) + 3, Y(0), '#7b7870'); g.set(px_(1) + 3, Y(1), '#7b7870'); g.set(px_(0) - 3, Y(1), '#7b7870');
  // cruceta de madera con 3 aisladores
  var hx = px_(topH - 10), hy = Y(topH - 10);
  g.rect(hx - 10, hy, 21, 2, EU[2]); g.rect(hx - 10, hy, 21, 1, EU[4]); g.rect(hx - 10, hy + 1, 21, 1, EU[1]);
  var tops = [];
  [-9, 0, 9].forEach(function (dx) { var ix = hx + dx, iy = hy - 3; g.rect(ix, iy, 2, 3, '#c9c5b5'); g.set(ix, iy, '#efebdc'); g.set(ix + 1, iy + 2, '#8a8884'); tops.push({ x: ix, y: iy - 1 }); });
  // retenida: tirante de cable desde 2/3 de altura hacia el suelo, del lado contrario a la inclinacion
  var rh = Math.round(topH * 0.72), rx = px_(rh), ry = Y(rh);
  g.line(rx, ry, 9, B - 1, '#1c1d1f');
  g.rect(7, B - 2, 5, 2, '#5d5b5a'); g.set(7, B - 2, '#aaa69b'); g.rect(8, B - 4, 1, 2, '#7a4a32');                                              // anclaje con piedra y vara
  g.rect(rx - 1, ry - 1, 3, 3, '#7e868a'); g.set(rx - 1, ry - 1, '#cfd3cc');                                                                    // abrazadera
  // maranha: cables sueltos y empalmes en la cruceta
  g.line(hx - 9, hy - 1, hx - 12, hy + 6, '#1c1d1f'); g.line(hx + 9, hy - 1, hx + 11, hy + 8, '#1c1d1f');
  // caja gris pegada al fuste (medidor) y un afiche chicha arrancado
  g.rect(px_(48) + 2, Y(52), 5, 6, '#8a8884'); g.rect(px_(48) + 2, Y(52), 5, 1, '#c9c5b5'); g.set(px_(48) + 4, Y(49), '#e8483a');
  g.rect(px_(30) - 4, Y(66), 4, 5, '#f2e63c'); g.set(px_(30) - 4, Y(66), '#fff7a0'); g.set(px_(30) - 3, Y(64), '#e8388a');
  outline(g, K);
  contact(g, px_(0), B, 6, 1.8);
  return { g: g, B: B, topX: px_(topH) - cx, topY: Y(topH) - B, tops: tops, cx: cx };
}
(function () {
  var o = posteMaderaDraw(6300);
  var c = mk(o.g, o.cx, o.B, 4, 3, { cast: { len: 0.3, a: 0.2 }, p: { tall: true, poleKind: 'madera', top: { x: o.topX, y: o.topY }, tops: o.tops.map(function (t) { return { x: t.x - o.cx, y: t.y - o.B }; }) } });
  props.posteMadera = c;
  var o2 = posteMaderaDraw(6301);
  var g2 = new G(o2.g.w, o2.g.h); g2.blit(o2.g.flip(), 0, 0);
  var W2 = o2.g.w, cx2 = W2 - 1 - o2.cx;
  var c2 = mk(g2, cx2, o2.B, 4, 3, { cast: { len: 0.3, a: 0.2 }, p: { tall: true, poleKind: 'madera', top: { x: -o2.topX, y: o2.topY }, tops: o2.tops.map(function (t) { return { x: -(t.x - o2.cx), y: t.y - o2.B }; }) } });
  props.posteMaderaL = c2;
})();

/* ============================ TOLDO (carpa roja de olla comun) ============================ */
function toldoDraw() {
  var W = 64, H = 92, cx = 32, ay = 88, g = new G(W, H), r = rng(6400), i, j;
  var RD = ['#5b1d1d', '#7a2a26', '#a83a34', '#c24a42', '#d86a5a'];                // lona roja apagada
  var roofFront = ay - 34, roofBack = ay - 76;                                        // fila del borde delantero (mas cerca) y del trasero
  var x0 = cx - 25, x1 = cx + 24;                                                     // 50 px de ancho: 3 m + el vuelo
  // piramide aplastada vista de arriba: apice al centro; 4 faldones
  var ax = cx, apexY = Math.round((roofFront + roofBack) / 2) - 6;
  for (j = roofBack; j <= roofFront; j++) for (i = x0; i <= x1; i++) {
    var fx = (i - ax) / 25, fy = (j - ((roofBack + roofFront) / 2)) / 21;           // -1..1
    var c;
    var ax_ = Math.abs(fx), ay_ = Math.abs(fy);
    if (ax_ > ay_ * 1.15) c = fx < 0 ? RD[4] : RD[1];                                // faldon izquierdo (luz) o derecho (sombra)
    else c = fy < 0 ? RD[3] : RD[2];                                                  // faldon trasero (luz) o delantero
    g.set(i, j, c);
  }
  // costuras de los paneles y cumbrera
  g.line(x0, roofBack, ax, apexY, RD[1]); g.line(x1, roofBack, ax, apexY, RD[1]); g.line(x0, roofFront, ax, apexY, RD[0]); g.line(x1, roofFront, ax, apexY, RD[0]);
  g.rect(ax - 2, apexY - 1, 4, 3, '#7e868a'); g.set(ax - 2, apexY - 1, '#cfd3cc');
  for (j = roofBack + 2; j < roofFront; j += 6) for (i = x0 + 2; i < x1 - 1; i += 3) if (g.get(i, j) && r() < 0.35) g.set(i, j, RD[2]);                  // arrugas
  // remiendo de otra lona (azul) y mancha de agua
  for (j = 0; j < 5; j++) for (i = 0; i < 7; i++) g.set(x0 + 6 + i, roofBack + 14 + j, j === 0 ? '#8cb6e6' : '#3f7bc4'); g.set(x0 + 6, roofBack + 14, '#b9d8ee');
  for (i = 0; i < 6; i++) g.set(x1 - 12 + i, roofFront - 8 + (i % 2), RD[0]);
  // volante (faldon) delantero con festones
  for (i = x0; i <= x1; i++) {
    var sc = ((i - x0) % 6 < 3) ? 0 : 1, f0 = roofFront + 1;
    g.set(i, f0, RD[3]); g.set(i, f0 + 1, RD[2]); g.set(i, f0 + 2, RD[1]); if (!sc) g.set(i, f0 + 3, RD[0]);
    if (((i - x0) % 6) === 0 || ((i - x0) % 6) === 3) g.set(i, f0 + 3, RD[0]);
  }
  // parantes delanteros (tubos metalicos) y sombra bajo la carpa
  for (j = roofFront + 4; j <= ay; j++) { g.set(x0 + 2, j, '#a4abaa'); g.set(x0 + 3, j, '#5c6570'); g.set(x1 - 3, j, '#a4abaa'); g.set(x1 - 2, j, '#5c6570'); }
  g.rect(x0, ay - 1, 6, 2, '#5d5b5a'); g.rect(x1 - 5, ay - 1, 6, 2, '#5d5b5a');
  // soga y estaca de los costados
  outline(g, K);
  // sombra bajo la carpa: rectangulo tramado donde cae al suelo
  for (j = ay - 38; j <= ay - 4; j++) for (i = x0 + 4; i <= x1 - 4; i++) if (!g.get(i, j) && (i + j) % 2 === 0 && j > ay - 34 && j < ay - 6) g.set(i, j, '#2a244030');
  return g;
}
props.toldo = mk(toldoDraw(), 32, 88, 0, 0, { cast: false, p: { tall: true, canopy: { x: -25, y: -76 - 4, w: 50, h: 48 } } });

/* ============================ LETRERO EN LA ROCA ============================ */
function letreroDraw() {
  var W = 72, H = 50, cx = 34, ay = 44, g = new G(W, H), r = rng(6500), i, j, x, y;
  var RK = ['#3a3a3a', '#5d5b5a', '#6e6b66', '#7b7870', '#948f85', '#aaa69b', '#c2beb4'];
  // piedra grande: union de elipses
  var lobes = [[cx, ay - 17, 29, 16], [cx - 17, ay - 11, 13, 10], [cx + 19, ay - 12, 12, 9], [cx + 3, ay - 26, 18, 9]];
  for (y = 0; y <= ay; y++) for (x = 0; x < W; x++) {
    var inside = false, depth = 1;
    lobes.forEach(function (L) { var dx = (x - L[0]) / L[2], dy = (y - L[1]) / L[3], d = dx * dx + dy * dy; if (d <= 1) { inside = true; depth = Math.min(depth, d); } });
    if (!inside) continue;
    var n = ((x * 13 + y * 7) % 5) / 5;
    var lit = (x - cx) * -0.02 + (y - (ay - 20)) * -0.03 + (r() - 0.5) * 0.18;
    var c = lit > 0.5 ? RK[5] : lit > 0.25 ? RK[4] : lit > -0.05 ? RK[3] : lit > -0.35 ? RK[2] : RK[1];
    if (y > ay - 3) c = RK[1]; if (y === ay) c = RK[0];
    g.set(x, y, c);
  }
  // grietas y facetas
  g.line(cx - 22, ay - 20, cx - 15, ay - 8, RK[1]); g.line(cx + 12, ay - 30, cx + 18, ay - 16, RK[1]); g.line(cx + 25, ay - 20, cx + 22, ay - 6, RK[1]);
  for (i = 0; i < 30; i++) { var qx = ri(r, 2, W - 3), qy = ri(r, ay - 32, ay - 2); if (g.get(qx, qy)) g.set(qx, qy, r() < 0.5 ? RK[5] : RK[1]); }
  // cuadro blanqueado con cal donde se pinta (irregular)
  var px0 = cx - 24, py0 = ay - 30, pw = 49, ph = 24;
  for (y = 0; y < ph; y++) for (x = 0; x < pw; x++) {
    var edge = (x < 1 || y < 1 || x > pw - 2 || y > ph - 2);
    if (edge && r() < 0.35) continue;
    var cc = '#e6e2d6'; if (r() < 0.1) cc = '#d4cfc0'; if (y > ph - 3) cc = '#bfb9a8';
    g.set(px0 + x, py0 + y, cc);
  }
  // letras pintadas a mano
  px.text(g, 'A.H.', px0 + 4, py0 + 2, { font: 'a5', ink: '#8f3a32' });
  px.text(g, 'LUCERO', px0 + 8, py0 + 7, { font: 'a7', ink: '#26303f' });
  px.text(g, 'ALTO', px0 + 24, py0 + 16, { font: 'a5', ink: '#8f3a32' });
  g.rect(px0 + 5, py0 + 19, 14, 1, '#8f3a32'); g.set(px0 + 6, py0 + 20, '#8f3a32'); g.set(px0 + 17, py0 + 20, '#8f3a32');        // subrayado a mano
  g.set(px0 + 31, py0 + 14, '#26303f'); g.set(px0 + 31, py0 + 15, '#26303f');                                                  // chorrera de pintura
  outline(g, K);
  contact(g, cx, ay + 2, 30, 3);
  return g;
}
props.letreroRoca = mk(letreroDraw(), 34, 44, 52, 12, { cast: { len: 0.4, a: 0.2 }, p: { tall: true } });

/* ============================ RESERVORIO (cima) ============================ */
function reservorioDraw() {
  var W = 80, H = 80, cx = 38, ay = 70, g = new G(W, H), r = rng(6600), i, j, x, y;
  var BP = ['#1d3d78', '#2c5598', '#3d68b2', '#5b87c8', '#8eb2de'];                  // concreto pintado de azul, desteñido
  var rx = 23, wallTop = ay - 38;
  for (y = wallTop; y <= ay; y++) for (x = cx - rx; x <= cx + rx; x++) {                // cuerpo cilindrico: luz a la izquierda
    var t = (x - (cx - rx)) / (2 * rx), c = t < 0.12 ? BP[4] : (t < 0.3 ? BP[3] : (t < 0.62 ? BP[2] : (t < 0.86 ? BP[1] : BP[0])));
    if (y > ay - 3) c = t < 0.5 ? '#8a8884' : '#66656b';                              // zocalo de concreto
    g.set(x, y, c);
  }
  // techo: elipse con borde y tapa
  g.ell(cx, wallTop, rx, 8, BP[3]); g.ell(cx - 1, wallTop - 1, rx - 3, 6, BP[4]); g.ell(cx + 2, wallTop + 1, rx - 6, 4, BP[3]);
  for (x = cx - rx; x <= cx + rx; x++) { var dy = Math.sqrt(Math.max(0, 1 - Math.pow((x - cx) / rx, 2))) * 8; g.set(x, Math.round(wallTop + dy), BP[0]); g.set(x, Math.round(wallTop + dy) + 1, BP[1]); }
  g.rect(cx - 5, wallTop - 7, 10, 4, '#7e868a'); g.rect(cx - 5, wallTop - 7, 10, 1, '#cfd3cc'); g.rect(cx - 5, wallTop - 4, 10, 1, '#3b4250');   // tapa de inspeccion
  g.rect(cx + 8, wallTop - 4, 2, 6, '#5c6570'); g.rect(cx + 8, wallTop - 6, 4, 2, '#8c93a0'); g.set(cx + 9, wallTop - 6, '#cfd3cc');           // tubo de ventilacion
  // anillos / juntas de moldeado y franja blanca desteñida
  for (x = cx - rx; x <= cx + rx; x++) { g.set(x, wallTop + 12, BP[0]); g.set(x, wallTop + 22, BP[0]); }
  for (x = cx - rx; x <= cx + rx; x++) { var tt = (x - (cx - rx)) / (2 * rx); g.set(x, wallTop + 16, tt < 0.3 ? '#bfc4c8' : (tt < 0.62 ? '#a4abaa' : '#7e868a')); g.set(x, wallTop + 17, tt < 0.62 ? '#a4abaa' : '#7e868a'); }
  // chorreras de humedad y descascarado
  for (i = 0; i < 9; i++) { var sx = cx - rx + 3 + ri(r, 0, 2 * rx - 6), sl = ri(r, 6, 20), sy = wallTop + 6 + ri(r, 0, 12); for (j = 0; j < sl; j++) if (g.get(sx, sy + j) && sy + j < ay - 3) g.set(sx, sy + j, (j % 3) ? BP[1] : BP[0]); }
  speck(g, r, 40, cx - rx, wallTop + 2, cx + rx, ay - 4, ['#8a8884', '#b8a57f', BP[4]]);
  // escalera marinera al costado derecho y tuberia de entrada
  for (j = 0; j < 40; j++) { g.set(cx + rx - 6, wallTop + 4 + j, '#5c6570'); g.set(cx + rx - 3, wallTop + 4 + j, '#5c6570'); if (j % 4 === 0) { g.rect(cx + rx - 6, wallTop + 4 + j, 4, 1, '#a4abaa'); } }
  g.rect(cx - rx - 6, ay - 14, 7, 4, '#5c6570'); g.rect(cx - rx - 6, ay - 14, 7, 1, '#a4abaa'); g.rect(cx - rx - 9, ay - 13, 3, 6, '#3b4250'); g.rect(cx - rx - 9, ay - 13, 3, 1, '#7e868a'); g.rect(cx - rx - 8, ay - 8, 7, 1, '#3b4250');
  g.line(cx - rx - 7, ay - 6, cx - rx - 7, ay, '#5c6570');
  outline(g, K);
  contact(g, cx, ay + 1, rx + 4, 3);
  return g;
}
props.reservorio = mk(reservorioDraw(), 38, 70, 46, 18, { cast: { len: 0.35, a: 0.2 }, p: { tall: true } });

/* ============================ TORRE DE ANTENAS (celosia, ~21 m) ============================ */
function torreDraw() {
  var W = 100, H = 340, cx = 50, B = 334, topY = 24, g = new G(W, H), r = rng(6700), y, i, k;
  var ST = ['#3b4250', '#5c6570', '#7e868a', '#a4abaa', '#cfd3cc'];
  function legX(yy, side) { var t = (yy - topY) / (B - topY); return cx + side * (3 + 19 * t); }
  var seg = 22, levels = [];
  for (y = B; y >= topY; y -= seg) levels.push(y);
  if (levels[levels.length - 1] !== topY) levels.push(topY);
  function legCol(yy, side) { if (yy < topY + 92) { var kk = Math.floor((yy - topY) / 23); return (kk % 2 === 0) ? (side < 0 ? '#e8e4dc' : '#b9b4a9') : (side < 0 ? '#c9362e' : '#8f2a24'); } return side < 0 ? ST[3] : ST[1]; }
  // pata de atras (centro, mas oscura)
  for (y = topY; y <= B; y++) g.set(cx, y, ST[0]);
  // diagonales y travesanos de cada tramo
  for (k = 0; k < levels.length - 1; k++) {
    var y1 = levels[k], y0 = levels[k + 1];
    var lx1 = legX(y1, -1), rx1 = legX(y1, 1), lx0 = legX(y0, -1), rx0 = legX(y0, 1);
    if (k % 2 === 0) { g.line(Math.round(lx1), y1, Math.round(rx0), y0, ST[2]); g.line(Math.round(rx1), y1, Math.round(lx0), y0, ST[1]); }
    else { g.line(Math.round(rx1), y1, Math.round(lx0), y0, ST[2]); g.line(Math.round(lx1), y1, Math.round(rx0), y0, ST[1]); }
    for (i = Math.round(lx0); i <= Math.round(rx0); i++) g.set(i, y0, ST[1]);                                     // travesano
    g.line(Math.round(lx1), y1, cx, y0 + 2, ST[0]);                                                               // arriostre a la pata de atras
  }
  // patas (2 visibles), con pintura aeronautica roja y blanca en la parte alta
  for (y = topY; y <= B; y++) { var xl = Math.round(legX(y, -1)), xr = Math.round(legX(y, 1)); g.set(xl, y, legCol(y, -1)); g.set(xl + 1, y, legCol(y, -1)); g.set(xr - 1, y, legCol(y, 1)); g.set(xr, y, legCol(y, 1)); }
  // plataformas con baranda, paneles y platos
  [[topY + 40, 12], [topY + 150, 17], [topY + 240, 21]].forEach(function (p) {
    var py = p[0], hw = p[1] + 5;
    g.rect(cx - hw, py, hw * 2 + 1, 2, ST[2]); g.rect(cx - hw, py, hw * 2 + 1, 1, ST[4]); g.rect(cx - hw, py + 1, hw * 2 + 1, 1, ST[0]);
    for (i = -hw; i <= hw; i += 4) g.set(cx + i, py - 1, ST[1]); g.rect(cx - hw, py - 4, hw * 2 + 1, 1, ST[3]);
    for (i = -hw; i <= hw; i += hw) g.line(cx + i, py - 4, cx + i, py, ST[1]);
  });
  function panel(x, y, h) { g.rect(x, y, 4, h, '#d8d4c4'); g.rect(x, y, 1, h, '#efebdc'); g.rect(x + 3, y, 1, h, '#a29c88'); g.rect(x, y + h, 4, 1, ST[0]); g.rect(x + 1, y - 1, 2, 1, ST[1]); }
  panel(cx - 16, topY + 14, 24); panel(cx + 12, topY + 14, 24); panel(cx - 4, topY + 20, 18);
  panel(cx - 24, topY + 124, 22); panel(cx + 21, topY + 124, 22); panel(cx - 3, topY + 128, 18);
  function dish(x, y, rd) { g.disc(x, y, rd, '#e8e4dc'); g.disc(x - 1, y - 1, rd - 1.6, '#efebdc'); g.disc(x + 1, y + 1, rd - 2.4, '#bfb9a8'); g.set(x, y, '#3b4250'); g.line(x, y, x + 3, y - 4, ST[1]); g.rect(x - 1, y + rd, 2, 3, ST[1]); }
  dish(cx - 12, topY + 218, 5); dish(cx + 15, topY + 212, 4); dish(cx + 6, topY + 62, 4);
  // mastil y baliza roja
  g.rect(cx - 1, topY - 12, 2, 12, ST[3]); g.rect(cx, topY - 12, 1, 12, ST[1]);
  g.rect(cx - 1, topY - 15, 3, 3, '#e8483a'); g.set(cx - 1, topY - 15, '#ffd0c8'); g.set(cx + 1, topY - 13, '#8a2a24');
  // cable de bajada y escalera de gato
  for (y = topY + 10; y < B; y += 1) { var xe = Math.round(legX(y, 1)) - 4; if (y % 3 !== 2) g.set(xe, y, ST[0]); }
  // zapatas de concreto
  [-1, 1].forEach(function (s) { var fx = Math.round(legX(B, s)); g.rect(fx - 4, B + 1, 9, 4, '#8a8884'); g.rect(fx - 4, B + 1, 9, 1, '#c9c5b5'); g.rect(fx - 4, B + 4, 9, 1, '#4b4957'); });
  g.rect(cx - 3, B + 2, 7, 2, '#66656b');
  outline(g, K);
  for (y = 6; y < B; y += 3) if (r() < 0.9) { /* oxido salpicado */ var xx = Math.round(legX(y, r() < 0.5 ? -1 : 1)); if (g.get(xx, y) && y > topY + 100 && r() < 0.35) g.set(xx, y, '#8a4b38'); }
  return g;
}
(function () {
  var c = mk(torreDraw(), 50, 334, 46, 6, { cast: false, p: { tall: true, top: { x: 0, y: 24 - 334 - 15 } } });
  props.torreAntenas = c;
})();


/* ============================ RADIO A PILAS (v0.13, C4) ============================ */
// Radio portatil roja sobre un cajon de fruta, antena telescopica. 18 x 28, ancla (9, 23). Ver ACH.cerro.radio (cerro.js) para la interaccion.
function radioDraw() {
  var W = 18, H = 28, ax = 9, ay = 23, g = new G(W, H), i, j;
  var CR = [WD[0], WD[1], WD[2], WD[3], WD[3]];
  box(g, 3, 18, 12, 5, 1, CR);                                                                                           // cajon de fruta
  g.rect(4, 20, 10, 1, WD[0]); g.set(8, 19, WD[3]); g.set(9, 19, WD[3]);                                                    // tabla del medio, nudo
  var RR = ['#6e211f', '#a32c26', '#c8392f', '#e8604f'];                                                                    // plastico rojo
  g.rect(4, 10, 10, 8, RR[2]);                                                                                              // cuerpo
  g.rect(4, 10, 10, 1, RR[3]); g.rect(4, 10, 1, 8, RR[3]); g.rect(13, 10, 1, 8, RR[1]); g.rect(4, 17, 10, 1, RR[1]);         // luz a la izquierda
  g.rect(4, 9, 8, 1, '#2a2a32'); g.set(4, 10, '#2a2a32'); g.set(11, 10, '#2a2a32');                                           // asa de arriba
  for (j = 0; j < 5; j++) for (i = 0; i < 4; i++) g.set(5 + i, 11 + j, (j % 2) ? '#555560' : '#23232b');                    // parlante con rejilla
  g.rect(10, 11, 3, 2, '#e8d58a'); g.set(10, 11, '#fff2bd'); g.set(12, 12, '#a8884a');                                      // dial (vidrio amarillo)
  g.set(11, 12, '#c8392f');                                                                                                 // aguja
  g.rect(10, 14, 3, 3, '#d8d4c4'); g.set(11, 15, '#6a6a60'); g.set(10, 14, '#f2eee0');                                       // perilla
  g.line(12, 9, 15, 2, '#cfd3cc'); g.set(15, 1, '#e8483a');                                                                // antena telescopica con puntita roja
  outline(g, K);
  contact(g, ax, ay + 1, 8, 1.8);
  return g;
}
props.radioPilas = mk(radioDraw(), 9, 23, 12, 5, { cast: { len: 0.35, a: 0.16 }, p: { tall: false } });

})();
