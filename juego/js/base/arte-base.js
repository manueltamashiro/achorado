/* ACHORADO v0.11 — js/base/arte-base.js (agente D2): el arte del cuarto de Alexander. Pixel art dibujado por código, horneado UNA vez al cargar
 * (se carga después de js/base/catalogo.js; no depende de ACH.px: trae su propio mini-lienzo de píxeles; usa ACH.px.canvas si existe).
 * Escala: 1 m = 16 px, tile = 16 px, vista 3/4 como el resto del juego. Todo lienzo es un <canvas> con propiedades extra (abajo).
 *
 * ACH.sprites.base = { cuarto, muebles, luz, get(id, estado), ids, tile: 16, listo: true }
 *
 * ── MUEBLES: ACH.sprites.base.muebles[id] (un lienzo por id de ACH.base.CATALOGO; 26 ids) ─────────────────────────────────────────────
 *  Tamaño del lienzo = (w*16) x (h*16 + up). La HUELLA (w x h tiles del catálogo) ocupa las filas [up, up + h*16) del lienzo; lo que
 *  sobra ARRIBA (up px) es la altura del mueble (respaldo, estante...). Para dibujar un mueble puesto en el tile (tx, ty):
 *        ctx.drawImage(c, tx*16, ty*16 - c.up)          // y se ordena por el borde de abajo de la huella: (ty + h)*16
 *  Propiedades de cada lienzo: .id  .fw .fh (huella en tiles)  .up  .ax = w*8, .ay = up + h*16 (ancla: centro-abajo de la huella, en px del lienzo)
 *     .luz {x,y}  centro de la luz en px del lienzo (foco, guirnalda, lamparín)   .ganchos [{x,y}] solo armero: 4 clavos (donde cuelgan las armas)
 *     .frames 2   solo guirnalda.  Las sombras de contacto ya van dentro del lienzo (dentro de la huella).
 *  Los de PARED (armero, foco, guirnalda, aficheChicha, banderaBlanquiazul, cuadroGatos/Mar/Faro): up = 0, w*16 x 16. Se cuelgan en la banda de
 *  pared (cuarto.pared, 32 px de alto): sugerido y = tope de la pared + 8 (los cuadros y el afiche), el foco y la guirnalda cuelgan desde el techo (y = tope + 0).
 *  Las ALFOMBRAS (petate 32x32, mantaAndina 32x16 / _r 16x32) llenan su huella y se pintan ANTES (debajo) de todo; se pisan.
 *  Tabla (id: ancho x alto, up):
 *    colchon 32x16 up0 · colchon_r 16x32 up0 · armero 32x16 · baulLata 16x16 · baulMadera 32x16 · baulMadera_r 16x32 · mesa 32x16 · mesa_r 16x32
 *    silla 16x26 up10 · banquito 16x20 up4 · estante 32x40 up24 · estante_r 16x46 up14 · radio 16x20 up4 · cajon 16x20 up4 · palomar 16x36 up20
 *    lamparin 16x22 up6 · baldePlantas 16x22 up6 · macetaLlanta 16x20 up4 · retablo 16x18 up2 · toroPucara 16x16 · cojines 16x16
 *    foco 16x16 · guirnalda 48x16 · aficheChicha 16x16 · banderaBlanquiazul 16x16 · cuadroGatos 32x16 · cuadroMar 32x16 · cuadroFaro 16x16
 *  Variantes (mismo up y huella, salvo los girados). Convención de nombres: id + sufijo:
 *    '_r'        girado 90° (solo los de huella w≠h que se pueden poner en el piso): colchon, baulMadera, mesa, estante, mantaAndina → huella h x w.
 *    '_on'       luz prendida (foco_on, lamparin_on). La clave sin sufijo es la APAGADA.
 *    guirnalda   apagada · guirnalda_on = cuadro A (prendidas las pares) · guirnalda_on2 = cuadro B (las impares): alternar A/B cada ~0.4 s.
 *    '_sonando'  radio_sonando, cajon_sonando (con notas musicales y ondas arriba; hace de cuadro «sonando»).
 *    '_titina'   palomar_titina (Titina sentada en la tablita) · palomar = vacío.
 *  Atajo: B.get(id, {rot, on, frame, sonando, titina}) devuelve el lienzo que toca o null. Ej: B.get('guirnalda',{on:true,frame:2}) → guirnalda_on2.
 *
 * ── LUZ: ACH.sprites.base.luz[id] (halos horneados, para el mapa de luz) ──────────────────────────────────────────────────────────────
 *  luz.foco (112x112, r 56, #ffe7a8) · luz.lamparin (96x96, r 48, #ffb14a) · luz.guirnalda (88x88, r 44, rosado #ff6ad5) · luz.guirnalda2 (88x88, verde agua #6affc8,
 *  para el cuadro B del parpadeo). Cada lienzo es de 2r x 2r con el centro en (r, r) (propiedades .r .ax .ay). Alfa 0..235 en 8 escalones (pixel art), el color
 *  se aclara hacia el centro. Sirve para 'destination-out' sobre una capa de oscuridad (saca la penumbra) y/o 'lighter'/'screen' con globalAlpha ~0.25 (tiñe).
 *  Se centra en: (x del mueble + c.luz.x, y del mueble + c.luz.y), con (x, y) = esquina del lienzo (ver arriba).
 *
 * ── CUARTO: ACH.sprites.base.cuarto (todo en px; los de repetir son tiles de 16) ─────────────────────────────────────────────────────
 *  Muro de fondo (visto de frente). Se arma: tapa (6 px) encima de la pared (32 px):
 *    pared[0..2]      16x32  ladrillo arriba y tarrajeo a medias abajo, con zócalo sucio. Se repiten en fila (el borde del tarrajeo empata entre variantes).
 *    tapa             16x6   el canto de arriba del muro. Va sobre cada tile de pared.
 *    ventana          32x32  ocupa 2 tiles de pared (reemplaza 2 pared[]): marco, reja, cielo panza de burro con siluetas del Callao, cortina. Muestra .fw=2.
 *    ventanaRayo      36x40  luz de la ventana sobre el piso (translúcida; ponerla bajo la ventana, a la altura del piso, desde y = piso.top + 2).
 *    puerta / puertaAbierta 16x32  la puerta de calamina a la azotea, cerrada y abierta (misma casilla de pared).   umbral 16x8  el escalón del piso frente a la puerta.
 *    paredIzq[0..1] / paredDer[0..1]  10x16  muros laterales que corren a lo largo (6 px de tapa + 4 de cara interior). Variante 0 = tarrajeo, 1 = ladrillo.
 *    esquinaIzq / esquinaDer  10x38  remate de arriba del muro lateral con el muro de fondo (6 de tapa + 32 de cara).
 *  Piso:
 *    piso[0..2]       16x16  cemento pulido, calmos (mezclarlos al azar: se ven bien juntos).
 *    pisoGrieta[0..1] 16x16  tiles con la grieta: entra por el borde izquierdo (y=8) y sale por el derecho (y=8), así que se pueden encadenar en fila.
 *    pisoMancha[0..1] 16x16  decales transparentes (0 aceite, 1 gotas de pintura) para dibujar ENCIMA de un tile de piso, con moderación.
 *  Azotea (todo igual de «sucio»; la azotea es más clara que el cuarto):
 *    azoteaPiso[0..2] 16x16  concreto rugoso (1 con brea, 2 con grieta y yerbita)
 *    parapeto[0..1]   16x18  borde bajo del fondo (cara interior + 4 de tapa); [1] tiene bajante de fierro.  parapetoLado[0 izq, 1 der] 8x16  los costados.
 *    parapetoFrente[0..1] 16x14  borde de adelante visto de afuera ([1] con mechinal de desagüe).
 *    tanque           32x54  tanque de agua negro genérico (sin marca) sobre base de ladrillos; huella 2x2, up 22 (igual que un mueble: (tx*16, ty*16 - 22)).
 *    cordel[0..1]     64x32  cordel de ropa tendida entre dos palos, 2 cuadros de viento (alternar ~0.5 s). Huella 4x1; solo los palos estorban: .poles [{x,y}] en px del lienzo.
 *    fierros[0..1]    [0] 16x40 up24 columna de concreto con fierros al aire · [1] 16x28 up12 atado de fierros y ladrillos. Huella 1x1.
 *    escalera         32x32  boca de escalera con escalera marinera bajando a la calle y flecha amarilla pintada; huella 2x2 (el disparador «BAJAR A LA CALLE»).
 *    neblina[0..1]    [0] 128x48, [1] 160x56  tiras de neblina translúcidas que REPITEN en x (.tileX): dibujar 2 copias seguidas y desplazar despacio en x con módulo.
 *    horizonte        192x40  siluetas lejanas del Callao (techos, tanques, pórticos del puerto); repite en x (.tileX). Va detrás del parapeto, sobre el cielo gris.
 *  Las propiedades de los lienzos del cuarto: .fw .fh .up .ax .ay (ax,ay = 0 y el alto en los tiles de pared; sin sombra horneada salvo tanque/cordel/fierros).
 */
(function () {
'use strict';
var ACH = window.ACH = window.ACH || {};
ACH.sprites = ACH.sprites || {};
var B = ACH.sprites.base = ACH.sprites.base || {};
var TILE = 16;

/* ============================ HERRAMIENTAS PROPIAS (no dependen de ACH.px) ============================ */
function mkCanvas(w, h) {
  var c;
  try { if (ACH.px && typeof ACH.px.canvas === 'function') c = ACH.px.canvas(w, h); } catch (e) { c = null; }
  if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; }
  return c;
}
function rngf(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function h2r(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
function r2h(a) { return '#' + a.map(function (v) { return ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2); }).join(''); }
function mixc(a, b, t) { var A = h2r(a), Bb = h2r(b); return r2h(A.map(function (v, i) { return v + (Bb[i] - v) * t; })); }

/* Rejilla de pixeles: undefined = vacio. Colores '#rrggbb' o '#rrggbbaa'. */
function Gx(w, h) { this.w = w; this.h = h; this.d = new Array(w * h); }
Gx.prototype = {
  set: function (x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; },
  get: function (x, y) { return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.d[y * this.w + x] : undefined; },
  rect: function (x, y, w, h, c) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.set(x + i, y + j, c); },
  // pone solo donde esta vacio
  fillEmpty: function (x, y, w, h, c) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) if (!this.get(x + i, y + j)) this.set(x + i, y + j, c); },
  line: function (x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, e = dx + dy;
    for (var n = 0; n < 500; n++) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  },
  ell: function (cx, cy, rx, ry, c, onlyEmpty) {
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      var dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1 && (!onlyEmpty || !this.get(x, y))) this.set(x, y, c);
    }
  },
  disc: function (cx, cy, r, c) { this.ell(cx, cy, r, r, c); },
  outline: function (c) {
    var add = [], x, y;
    for (y = 0; y < this.h; y++) for (x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push([x, y]);
    }
    for (var i = 0; i < add.length; i++) this.set(add[i][0], add[i][1], c || K);
    return this;
  },
  blit: function (s, ox, oy) { for (var y = 0; y < s.h; y++) for (var x = 0; x < s.w; x++) { var c = s.d[y * s.w + x]; if (c) this.set(x + ox, y + oy, c); } return this; },
  flipH: function () { var n = new Gx(this.w, this.h); for (var y = 0; y < this.h; y++) for (var x = 0; x < this.w; x++) n.d[y * this.w + (this.w - 1 - x)] = this.d[y * this.w + x]; return n; },
  rot90: function () { // horario
    var n = new Gx(this.h, this.w);
    for (var y = 0; y < this.h; y++) for (var x = 0; x < this.w; x++) n.d[x * n.w + (this.h - 1 - y)] = this.d[y * this.w + x];
    return n;
  },
  rows: function (x, y, arr, map) { for (var j = 0; j < arr.length; j++) for (var i = 0; i < arr[j].length; i++) { var v = map[arr[j].charAt(i)]; if (v) this.set(x + i, y + j, v); } },
  toCanvas: function () {
    var c = mkCanvas(this.w, this.h), ctx = c.getContext('2d');
    for (var y = 0; y < this.h; y++) {
      var x = 0;
      while (x < this.w) {
        var col = this.d[y * this.w + x];
        if (!col) { x++; continue; }
        var x1 = x + 1;
        while (x1 < this.w && this.d[y * this.w + x1] === col) x1++;
        ctx.fillStyle = col; ctx.fillRect(x, y, x1 - x, 1);
        x = x1;
      }
    }
    return c;
  }
};

/* ============================ PALETAS ============================ */
var K = '#1c1a22', KD = '#141216', VIO = '#2a2440';
var CON = ['#45434f', '#66656b', '#8a8884', '#a9a79b', '#c9c5b5'];       // concreto
var BRI = ['#4a2c33', '#6e3f3a', '#8f5544', '#a86a50', '#c08a68'];       // ladrillo
var WOO = ['#4a3028', '#6b4223', '#a86e38', '#c99458'];                  // madera
var MET = ['#3b4250', '#5c6570', '#7e868a', '#a4abaa', '#cfd3cc'];       // metal
var RUS = ['#4a2a2a', '#6f3b2e', '#8a4b38', '#b06a3e'];                  // oxido
var PLA = ['#6b6870', '#8f8c88', '#aeaa98', '#c4c0aa', '#d6d1b8'];       // tarrajeo gris crema
var MORT = '#7d7468';
var PLAS = ['#8c8a93', '#bdb9ab', '#d8d4c4', '#efebdc'];                // plastico blanco sucio
var NEON = { pink: '#e8388a', yellow: '#f2e63c', green: '#5fe04a', orange: '#ff8a2a', cyan: '#38c8e8' };
var SH = '#2a244073';                                                  // sombra violeta translucida

function sombra(g, cx, cy, rx, ry) { g.ell(cx, cy, rx, ry, SH, true); }   // sombra de contacto solo donde no hay nada

/* ladrillo: tabla de colores por hilada y ladrillo (periodo 16 px: se repite al juntar tiles) */
function brickTable(r, rows) {
  var t = [];
  for (var c = 0; c < rows; c++) { t.push([]); for (var b = 0; b < 2; b++) { var q = r(); t[c].push(q < 0.25 ? 1 : q < 0.65 ? 2 : 3); } }
  return t;
}
function brickPx(x, y, t) {
  var c = (y >> 2), ly = y & 3, xx = (x + (c & 1) * 4) & 15, lx = xx & 7, bi = xx >> 3;
  if (ly === 3 || lx === 7) return MORT;
  var i = t[c % t.length][bi];
  if (ly === 0) return BRI[Math.min(4, i + 1)];
  if (ly === 2 || lx === 6) return BRI[i - 1];
  return BRI[i];
}
function finish(g, ax, ay, fw, fh, up, extra) {
  var c = g.toCanvas();
  c.fw = fw; c.fh = fh; c.up = up || 0; c.ax = ax; c.ay = ay;
  if (extra) for (var k in extra) c[k] = extra[k];
  return c;
}
/* mueble de piso/pared: lienzo de (w*16) x (h*16 + up). La huella ocupa las filas [up, up+h*16). */
function mueble(w, h, up, fn, extra) {
  var g = new Gx(w * TILE, h * TILE + up);
  fn(g, 0, up, w * TILE, h * TILE);
  return finish(g, w * TILE / 2, up + h * TILE, w, h, up, extra);
}
/* caja: cara superior (x,y,w,d) + cara frontal (x,y+d,w,hf) con luz a la izquierda arriba. C = [osc, sombra, base, luz, brillo] */
function caja(g, x, y, w, d, hf, C) {
  var i, j;
  for (j = 0; j < d; j++) for (i = 0; i < w; i++) {
    var c = C[3];
    if (j === 0 || i === 0) c = C[4]; else if (i === w - 1) c = C[2];
    g.set(x + i, y + j, c);
  }
  for (j = 0; j < hf; j++) for (i = 0; i < w; i++) {
    var f = C[2];
    if (i === 0) f = C[3]; else if (i >= w - 2) f = C[1];
    if (i === w - 1) f = C[0];
    if (j === 0) f = (i === 0) ? C[4] : C[3];
    if (j === hf - 1) f = (i === 0) ? C[1] : C[0];
    g.set(x + i, y + d + j, f);
  }
}

/* ============================ CUARTO ============================ */
var cuarto = B.cuarto = {};

/* ---- pared del fondo: 16 x 32, ladrillo arriba y tarrajeo a medias abajo ---- */
function paredTile(v) {
  var g = new Gx(16, 32), r = rngf(910 + v * 37), t = brickTable(r, 8);
  var base = 15, amp = [2, -3, 4][v], b = [], x, y;
  for (x = 0; x < 16; x++) b.push(base + Math.round(Math.sin(x / 15 * Math.PI) * amp + (x > 0 && x < 15 ? (r() - 0.5) * 2.4 : 0)));
  var drips = [2 + Math.floor(r() * 3), 8 + Math.floor(r() * 3), 13];
  for (y = 0; y < 32; y++) for (x = 0; x < 16; x++) {
    var d = y - b[x], c;
    if (d < 0) {
      c = brickPx(x, y, t);
      if (y < 2) c = y === 0 ? BRI[0] : BRI[1];
      else if (d === -1) c = BRI[1];                 // sombra del borde del tarrajeo
    } else {
      c = d === 0 ? PLA[1] : d === 1 ? PLA[2] : PLA[3];
      var q = r();
      if (q < 0.05) c = PLA[2]; else if (q < 0.075) c = PLA[4];
      if (y > 23 && ((x + y) & 1) === 0 && q < 0.6) c = PLA[2];                    // mugre cerca del piso
      for (var k = 0; k < drips.length; k++) if (x === drips[k] && d > 1 && d < 9 + k * 2) c = PLA[2];   // chorreados
    }
    if (y >= 28) c = y === 28 ? '#7a7686' : y === 31 ? CON[0] : y === 30 ? '#55535e' : CON[1];            // zocalo sucio
    g.set(x, y, c);
  }
  if (v === 1) { g.line(5, b[5] + 2, 8, b[8] + 7, PLA[1]); g.line(8, b[8] + 7, 7, b[7] + 11, PLA[1]); g.set(9, b[9] + 7, PLA[4]); }   // rajadura
  if (v === 2) {   // parche: un hueco en el tarrajeo donde se ve el ladrillo
    var px0 = 7, py0 = 19;
    for (y = 0; y < 5; y++) for (x = 0; x < 6; x++) if (!((x === 0 || x === 5) && (y === 0 || y === 4))) g.set(px0 + x, py0 + y, brickPx(px0 + x, py0 + y - 19 + 4, t));
    for (x = 0; x < 6; x++) g.set(px0 + x, py0 + 5, PLA[1]);
  }
  return g;
}
cuarto.pared = [paredTile(0), paredTile(1), paredTile(2)].map(function (g) { return finish(g, 0, 32, 1, 1, 0); });

/* ---- tapa del muro (la parte de arriba del muro vista desde arriba): 16 x 6 ---- */
(function () {
  var g = new Gx(16, 6), r = rngf(77), x, y;
  for (y = 0; y < 6; y++) for (x = 0; x < 16; x++) {
    var c = y === 0 ? CON[4] : y < 4 ? CON[3] : y === 4 ? CON[2] : CON[0];
    if (y > 0 && y < 4 && r() < 0.08) c = CON[2];
    g.set(x, y, c);
  }
  cuarto.tapa = finish(g, 0, 6, 1, 1, 0);
})();

/* ---- paredes laterales: 10 x 16 (6 de tapa + 4 de cara interior). izq / der ---- */
function lateral(v) {
  var g = new Gx(10, 16), r = rngf(300 + v), t = brickTable(r, 4), x, y;
  for (y = 0; y < 16; y++) {
    for (x = 0; x < 6; x++) g.set(x, y, x === 0 ? CON[4] : x < 5 ? CON[3] : CON[1]);
    for (x = 6; x < 10; x++) {
      var c = v === 0 ? (x === 6 ? PLA[1] : x === 7 ? PLA[2] : PLA[3]) : brickPx(x + 2, y, t);
      if (v === 0 && r() < 0.07) c = PLA[2];
      if (v === 1) c = x === 6 ? BRI[1] : (c === MORT ? MORT : (x === 9 ? BRI[Math.max(0, 1)] : c));
      g.set(x, y, c);
    }
    if (r() < 0.12) g.set(1 + Math.floor(r() * 3), y, CON[2]);
  }
  return g;
}
cuarto.paredIzq = [lateral(0), lateral(1)].map(function (g) { return finish(g, 0, 16, 1, 1, 0); });
cuarto.paredDer = [lateral(0), lateral(1)].map(function (g) { return finish(g.flipH(), 0, 16, 1, 1, 0); });

/* ---- esquinas: 10 x 38 = tapa de 6 filas + cara del muro de 32 ---- */
function esquina() {
  var g = new Gx(10, 38), r = rngf(55), t = brickTable(r, 8), x, y;
  for (y = 0; y < 6; y++) for (x = 0; x < 10; x++) g.set(x, y, y === 0 ? CON[4] : y < 4 ? CON[3] : y === 4 ? CON[2] : CON[0]);
  for (y = 0; y < 32; y++) for (x = 0; x < 10; x++) {
    var c;
    if (y < 15) { c = brickPx(x, y, t); if (y < 2) c = BRI[y === 0 ? 0 : 1]; } else c = y === 15 ? PLA[1] : PLA[3];
    if (y > 15 && r() < 0.06) c = PLA[2];
    if (y >= 28) c = y === 28 ? '#7a7686' : y === 31 ? CON[0] : y === 30 ? '#55535e' : CON[1];
    if (x >= 6) c = mixc(c, VIO, 0.35);              // la parte que se mete a la sombra
    g.set(x, 6 + y, c);
  }
  return g;
}
cuarto.esquinaIzq = finish(esquina(), 0, 38, 1, 1, 0);
cuarto.esquinaDer = finish(esquina().flipH(), 0, 38, 1, 1, 0);

/* ---- piso de cemento pulido: 3 variantes calmas + 2 con grieta (16 x 16) + 2 manchas sueltas (decales) ---- */
var PISO = ['#94918a', '#9b988f', '#a29f96', '#8a8780'];
function pisoTile(v, grieta) {
  var g = new Gx(16, 16), r = rngf(1200 + v * 11 + (grieta ? 100 : 0)), x, y;
  for (y = 0; y < 16; y++) for (x = 0; x < 16; x++) {
    var q = r(), c = PISO[1];
    var band = ((x * 3 + y * 5 + v * 7) >> 3) & 3;                   // pulido de llana: bandas diagonales suaves
    if (band === 0) c = PISO[0]; else if (band === 2) c = PISO[2];
    if (q < 0.025) c = PISO[3]; else if (q > 0.985) c = PISO[2];
    g.set(x, y, c);
  }
  if (v === 1) { g.line(3, 4, 7, 6, PISO[3]); g.line(10, 12, 13, 11, PISO[3]); }           // raspones
  if (v === 2) { g.set(4, 12, PISO[3]); g.set(5, 12, PISO[3]); g.set(11, 5, PISO[3]); g.set(12, 6, PISO[2]); }
  if (grieta) {
    var yy = 8, pts = [];
    for (x = 0; x < 16; x++) {
      if (x > 0 && x < 15 && r() < 0.45) yy += r() < 0.5 ? -1 : 1;
      if (x === 15) yy = 8;
      yy = Math.max(5, Math.min(11, yy));
      pts.push(yy); g.set(x, yy, '#4f4d57'); if (x % 3 === 1) g.set(x, yy + 1, '#b4b1a6');
    }
    if (v === 0) { g.line(7, pts[7], 5, 3, '#5d5b66'); }
    else { g.line(10, pts[10], 12, 14, '#5d5b66'); }
  }
  return g;
}
cuarto.piso = [0, 1, 2].map(function (v) { return finish(pisoTile(v, false), 0, 16, 1, 1, 0); });
cuarto.pisoGrieta = [0, 1].map(function (v) { return finish(pisoTile(v, true), 0, 16, 1, 1, 0); });
/* manchas sueltas (transparentes; se pintan ENCIMA de un tile de piso, con moderacion): [0] aceite, [1] gotas de pintura y raspones */
(function () {
  var a = new Gx(16, 16), b = new Gx(16, 16);
  a.ell(8, 8, 4.5, 3, '#2a244050'); a.ell(8, 8, 3, 2, '#2a244060'); a.set(5, 6, '#2a244040'); a.set(12, 11, '#2a244040'); a.set(11, 5, '#2a244040');
  b.rect(3, 10, 2, 1, NEON.yellow); b.set(4, 11, NEON.yellow); b.set(11, 4, '#4a6fc8'); b.rect(12, 4, 1, 2, '#4a6fc8'); b.set(8, 13, '#c8322a');
  cuarto.pisoMancha = [finish(a, 0, 16, 1, 1, 0), finish(b, 0, 16, 1, 1, 0)];
})();

/* ---- ventana con vista al cielo panza de burro: 32 x 32 (ocupa 2 tiles de pared) ---- */
(function () {
  var g = new Gx(32, 32), x, y, r = rngf(4242);
  g.blit(paredTile(0), 0, 0); g.blit(paredTile(1), 16, 0);
  // hueco x 5..26, y 5..22
  var X0 = 5, Y0 = 5, W = 22, H = 18;
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    var s = ((y * 5 + Math.round(Math.sin(x * 0.5 + y * 0.3) * 2)) >> 2) % 4;     // bandas de nube ondeadas
    var c = ['#b8b6ae', '#a9a8a2', '#c3c0b6', '#b0aea6'][s < 0 ? 0 : s];
    if (y > 12) c = y > 14 ? '#8e9094' : '#9a9a98';                                  // bruma de abajo
    g.set(X0 + x, Y0 + y, c);
  }
  // siluetas lejanas: techos del Callao, una grua del puerto y un tanque
  var sil = '#6b6e78', sil2 = '#575a62';
  g.rect(X0, Y0 + 14, 6, 4, sil); g.rect(X0 + 6, Y0 + 12, 5, 6, sil); g.rect(X0 + 11, Y0 + 15, 4, 3, sil);
  g.rect(X0 + 15, Y0 + 13, 7, 5, sil2); g.line(X0 + 17, Y0 + 13, X0 + 17, Y0 + 7, sil2); g.line(X0 + 17, Y0 + 7, X0 + 21, Y0 + 7, sil2); g.line(X0 + 21, Y0 + 7, X0 + 21, Y0 + 10, sil2);
  g.set(X0 + 8, Y0 + 11, '#b06a3e'); g.set(X0 + 3, Y0 + 13, '#b06a3e');
  // gaviota
  g.set(X0 + 12, Y0 + 5, '#5c6570'); g.set(X0 + 13, Y0 + 4, '#5c6570'); g.set(X0 + 14, Y0 + 5, '#5c6570'); g.set(X0 + 15, Y0 + 4, '#5c6570'); g.set(X0 + 16, Y0 + 5, '#5c6570');
  // reflejo diagonal
  for (var i = 0; i < 5; i++) { g.set(X0 + 3 + i, Y0 + 9 - i, '#d6d1b8'); g.set(X0 + 4 + i, Y0 + 9 - i, '#cdc9bd'); }
  // reja de fierro
  for (x = 0; x < W; x += 5) g.rect(X0 + x + 1, Y0, 1, H, '#2d3340');
  g.rect(X0, Y0 + 8, W, 1, '#2d3340');
  // marco de concreto y alfeizar
  g.rect(X0 - 2, Y0 - 2, W + 4, 2, CON[1]); g.rect(X0 - 2, Y0 - 2, W + 4, 1, CON[3]);
  g.rect(X0 - 2, Y0, 2, H, CON[2]); g.rect(X0 + W, Y0, 2, H, CON[1]);
  g.rect(X0 - 3, Y0 + H, W + 6, 3, CON[3]); g.rect(X0 - 3, Y0 + H + 2, W + 6, 1, CON[1]); g.rect(X0 - 3, Y0 + H, W + 6, 1, CON[4]);
  // cortina amarillenta a medio correr (el cuarto tiene que parecer vivido)
  var cort = ['#e0c58d', '#c9a66b', '#a5814f'];
  for (y = 0; y < H + 1; y++) for (x = 0; x < 5 + (y < 6 ? 1 : 0); x++) g.set(X0 + x - 1, Y0 + y, cort[(x + (y >> 3)) % 3 === 0 ? 0 : x % 2 ? 1 : 2]);
  g.rect(X0 - 2, Y0 - 1, 8, 1, '#7a5a45');
  g.outline(K);
  cuarto.ventana = finish(g, 0, 32, 2, 1, 0);
})();

/* rayo de luz de la ventana sobre el piso: translucido, 32 x 40 (paralelogramo cayendo hacia abajo-derecha) */
(function () {
  var g = new Gx(36, 40), x, y;
  for (var pane = 0; pane < 4; pane++) {                         // 4 vidrios (la reja deja sombra en cruz)
    var px0 = 2 + (pane % 2) * 15, py0 = 1 + (pane >> 1) * 18;
    for (y = 0; y < 16; y++) for (x = 0; x < 13; x++) g.set(px0 + x + (y >> 1) + (pane >> 1) * 4, py0 + y, (x + y) % 5 === 0 ? '#efe9c82a' : '#efe9c840');
  }
  cuarto.ventanaRayo = finish(g, 0, 40, 2, 3, 0);
})();

/* ---- puerta a la azotea: 16 x 32 (cerrada / abierta) y umbral 16 x 8 ---- */
(function () {
  var g = new Gx(16, 32), r = rngf(808), x, y;
  var D = ['#2f4a44', '#4f6a66', '#74917f', '#9db59e'];                  // verde calamina descolorido
  for (y = 0; y < 32; y++) for (x = 0; x < 16; x++) g.set(x, y, y < 3 ? CON[1] : x < 2 ? CON[3] : x > 13 ? CON[1] : D[1]);
  g.rect(2, 3, 12, 29, D[1]);
  for (y = 4; y < 31; y++) { g.set(2, y, D[2]); g.set(3, y, D[2]); g.set(13, y, D[0]); }
  g.rect(2, 3, 12, 1, D[0]);
  // costillas de la plancha
  for (x = 5; x < 13; x += 3) for (y = 4; y < 31; y++) { g.set(x, y, D[2]); g.set(x + 1, y, D[0]); }
  // travesano y tragaluz con rejita
  g.rect(2, 16, 12, 2, D[0]); g.rect(2, 16, 12, 1, D[2]);
  g.rect(5, 6, 6, 5, '#1c2530'); g.rect(5, 6, 6, 1, '#4d6676'); for (x = 6; x < 11; x += 2) g.rect(x, 6, 1, 5, '#2d3340');
  // manija y cerrojo
  g.rect(11, 19, 2, 4, MET[3]); g.set(11, 19, MET[4]); g.rect(10, 25, 3, 2, MET[1]); g.set(10, 25, MET[3]);
  // oxido y pintura descascarada
  for (var i = 0; i < 40; i++) { var rx = 2 + Math.floor(r() * 12), ry = 5 + Math.floor(r() * 26); if (r() < 0.6 && ry > 20) g.set(rx, ry, RUS[2]); else if (r() < 0.2) g.set(rx, ry, RUS[1]); }
  for (y = 26; y < 31; y++) for (x = 3; x < 13; x++) if (r() < 0.25) g.set(x, y, RUS[2]);
  g.rect(0, 31, 16, 1, CON[0]);
  cuarto.puerta = finish(g, 0, 32, 1, 1, 0);

  var a = new Gx(16, 32);
  for (y = 0; y < 32; y++) for (x = 0; x < 16; x++) a.set(x, y, y < 3 ? CON[1] : x < 2 ? CON[3] : x > 13 ? CON[1] : '#cfcbbd');
  for (y = 3; y < 32; y++) for (x = 2; x < 14; x++) a.set(x, y, y < 17 ? ((y + x) % 7 === 0 ? '#d8d6cc' : '#c9c8c0') : '#b9b8b0');      // la luz de la azotea, blanca y sucia
  a.rect(2, 3, 12, 1, '#a9a79b');
  a.rect(10, 10, 4, 2, '#8e9094'); a.rect(3, 13, 3, 4, '#6b6e78');                       // algo se ve afuera
  // hoja abierta, vista de canto, pegada a la jamba
  a.rect(2, 3, 3, 29, D[1]); a.rect(2, 3, 1, 29, D[2]); a.rect(4, 3, 1, 29, D[0]); a.rect(3, 19, 1, 4, MET[3]);
  a.rect(0, 31, 16, 1, CON[0]);
  cuarto.puertaAbierta = finish(a, 0, 32, 1, 1, 0);

  var u = new Gx(16, 8);
  for (y = 0; y < 8; y++) for (x = 0; x < 16; x++) u.set(x, y, y === 0 ? CON[4] : y < 5 ? CON[3] : y < 7 ? CON[2] : CON[0]);
  for (x = 3; x < 13; x++) u.set(x, 3, CON[2]);
  u.set(6, 2, CON[2]); u.set(9, 1, CON[2]);
  cuarto.umbral = finish(u, 0, 8, 1, 1, 0);
})();

/* ============================ AZOTEA ============================ */
function azoteaTile(v) {
  var g = new Gx(16, 16), r = rngf(2000 + v * 13), x, y;
  var A = ['#7f7d78', '#8a8884', '#9a978f', '#a9a79b'];
  for (y = 0; y < 16; y++) for (x = 0; x < 16; x++) { var q = r(); g.set(x, y, q < 0.14 ? A[0] : q < 0.5 ? A[1] : q < 0.92 ? A[2] : A[3]); }
  if (v === 1) { g.ell(8, 8, 5, 3.5, '#33353d'); g.ell(8, 7, 3, 2, '#44474d'); g.set(5, 6, '#575a5c'); }                       // brea
  if (v === 2) { g.line(0, 5, 6, 7, '#55535e'); g.line(6, 7, 9, 11, '#55535e'); g.line(9, 11, 15, 12, '#55535e'); g.set(11, 3, '#5a7a48'); g.set(12, 3, '#6b8a50'); g.set(12, 2, '#5a7a48'); g.rect(3, 12, 2, 2, '#575a5c'); }   // grieta con yerbita y un ladrillo
  if (v === 0) { g.rect(10, 4, 2, 1, '#c9c5b5'); g.set(3, 11, '#c9c5b5'); g.set(4, 12, '#6e3f3a'); }                            // un pedacito de ladrillo
  return g;
}
cuarto.azoteaPiso = [0, 1, 2].map(function (v) { return finish(azoteaTile(v), 0, 16, 1, 1, 0); });

(function () {
  // parapeto del borde del fondo: 16 x 18 (4 de tapa + 14 de cara interior)
  function par(v) {
    var g = new Gx(16, 18), r = rngf(600 + v), x, y;
    for (y = 0; y < 18; y++) for (x = 0; x < 16; x++) {
      var c;
      if (y === 0) c = CON[4]; else if (y < 3) c = CON[3]; else if (y === 3) c = CON[1];
      else { c = y > 15 ? CON[0] : CON[2]; var q = r(); if (q < 0.08) c = CON[1]; else if (q < 0.12) c = CON[3]; if (y > 14) c = mixc(c, VIO, 0.4); }
      g.set(x, y, c);
    }
    for (var m = 0; m < 3; m++) { var mx = 1 + Math.floor(r() * 12), my = 5 + Math.floor(r() * 4); g.rect(mx, my, 1, 4 + Math.floor(r() * 5), '#7d7d77'); }    // chorreados de humedad
    if (v === 1) { g.rect(11, 4, 3, 14, MET[1]); g.rect(11, 4, 1, 14, MET[3]); g.rect(13, 4, 1, 14, MET[0]); g.rect(10, 9, 5, 1, MET[0]); }   // bajante de PVC/fierro
    return g;
  }
  cuarto.parapeto = [par(0), par(1)].map(function (g) { return finish(g, 0, 18, 1, 1, 0); });
  // lados: 8 x 16 (6 de tapa y 2 de cara). izq / der
  var l = new Gx(8, 16), r2 = rngf(611), x, y;
  for (y = 0; y < 16; y++) { for (x = 0; x < 6; x++) l.set(x, y, x === 0 ? CON[4] : x < 5 ? CON[3] : CON[1]); l.set(6, y, CON[2]); l.set(7, y, CON[1]); if (r2() < 0.1) l.set(2, y, CON[2]); }
  cuarto.parapetoLado = [finish(l, 0, 16, 1, 1, 0), finish(l.flipH(), 0, 16, 1, 1, 0)];
  // borde del frente (el que da a la calle, visto de afuera): 16 x 14
  var f = new Gx(16, 14), r3 = rngf(622);
  for (y = 0; y < 14; y++) for (x = 0; x < 16; x++) {
    var c = y === 0 ? CON[4] : y < 3 ? CON[3] : y === 3 ? CON[2] : (y > 11 ? CON[0] : CON[2]);
    if (y > 3 && r3() < 0.08) c = CON[1];
    f.set(x, y, c);
  }
  var f2 = new Gx(16, 14); f2.blit(f, 0, 0);
  f2.rect(6, 9, 4, 2, '#2d3340'); f2.rect(6, 11, 4, 1, CON[4]); f2.rect(7, 11, 2, 3, '#7d7d77');          // mechinal de desague y su chorreado
  cuarto.parapetoFrente = [finish(f, 0, 14, 1, 1, 0), finish(f2, 0, 14, 1, 1, 0)];
})();

/* ---- tanque de agua negro (generico, sin marca): huella 2x2, lienzo 32 x 54 (up = 22) ---- */
cuarto.tanque = mueble(2, 2, 22, function (g, X, Y, W, H) {
  var TK = ['#0e0e14', '#1a1a22', '#26262f', '#3a3a46', '#5a5a68'], x, y;
  sombra(g, 17, 50, 14, 4);
  // base de ladrillos
  for (y = 0; y < 7; y++) for (x = 0; x < 24; x++) g.set(4 + x, 41 + y, y === 0 ? BRI[3] : (y % 3 === 2 || x % 6 === 5) ? MORT : (y === 6 ? BRI[1] : BRI[2]));
  g.rect(4, 47, 24, 1, BRI[0]);
  // cuerpo: cilindro sombreado (luz a la izquierda)
  for (y = 14; y < 43; y++) for (x = 6; x < 27; x++) {
    var u = (x - 6) / 20, c = u < 0.1 ? TK[3] : u < 0.22 ? TK[2] : u < 0.62 ? TK[1] : u < 0.85 ? TK[0] : TK[1];
    g.set(x, y, c);
  }
  g.rect(8, 16, 1, 22, TK[4]);                              // brillo largo
  g.rect(9, 17, 1, 10, TK[3]);
  for (var b = 0; b < 3; b++) { var by = 20 + b * 9; for (x = 6; x < 27; x++) { g.set(x, by, TK[0]); g.set(x, by + 1, x < 9 ? TK[3] : TK[2]); } }   // anillos moldeados
  // curva del fondo (elipse)
  for (x = 6; x < 27; x++) { var dy = Math.round(Math.sqrt(Math.max(0, 1 - Math.pow((x - 16.5) / 10.5, 2))) * 3); g.set(x, 42 + dy - 0, TK[0]); }
  // domo y tapa
  g.ell(16.5, 15, 10.5, 5, TK[2]);
  g.ell(15.5, 14, 8.5, 3.6, TK[3]);
  g.ell(14, 13, 4, 1.6, TK[4]);
  g.ell(16.5, 9.5, 4.5, 2.2, '#6f7480'); g.ell(16.5, 9, 3.6, 1.6, '#8a919c'); g.rect(14, 8, 2, 1, '#cfd3cc');     // tapa roscada gris
  g.rect(12, 11, 9, 2, '#6f7480'); g.rect(12, 11, 9, 1, '#8a919c'); g.rect(11, 12, 11, 1, '#4a505c');
  // tuberia de bajada
  g.rect(26, 33, 3, 2, '#d8d4c4'); g.rect(28, 33, 2, 10, '#d8d4c4'); g.rect(28, 33, 1, 10, '#efebdc'); g.rect(29, 33, 1, 10, '#aeaa98');
  g.rect(27, 40, 5, 2, MET[2]); g.rect(27, 40, 5, 1, MET[4]);                                                        // llave de paso
  g.rect(3, 34, 3, 7, MET[1]); g.rect(3, 34, 1, 7, MET[3]);                                                          // escalerilla de fierro
  g.outline(K);
}, { luz: null });

/* ---- cordel de ropa tendida: 64 x 32 (huella 4x1, solo los palos estorban), 2 cuadros de viento ---- */
function cordelFrame(f) {
  var g = new Gx(64, 32), x, y, sk = f ? 1 : -1;
  function palo(px0) { g.rect(px0, 5, 3, 26, WOO[1]); g.rect(px0, 5, 1, 26, WOO[3]); g.rect(px0 + 2, 5, 1, 26, WOO[0]); g.rect(px0 - 1, 4, 5, 1, WOO[1]); g.rect(px0 - 1, 4, 1, 1, WOO[3]); g.rect(px0 - 2, 29, 7, 2, CON[2]); g.rect(px0 - 2, 29, 7, 1, CON[3]); }
  sombra(g, 6, 31, 6, 1.4); sombra(g, 58, 31, 6, 1.4);
  palo(3); palo(58);
  var sag = f ? 4 : 3, ly = function (xx) { return 6 + Math.round(Math.sin((xx - 5) / 54 * Math.PI) * sag); };
  for (x = 5; x <= 60; x++) g.set(x, ly(x), '#d8d4c4');
  // prenda: ancho w, alto h, colores; sk desplaza la parte de abajo
  function prenda(x0, w, h, c1, c2, kind) {
    for (var j = 0; j < h; j++) {
      var off = Math.round(sk * j / h * 1.4), yy = ly(x0 + (w >> 1)) + 1;
      for (var i = 0; i < w; i++) {
        var c = c1;
        if (kind === 'camisa' && j < 3 && (i < 3 || i >= w - 3)) c = c1; else if (kind === 'camisa' && j >= 3 && (i === 0 || i === w - 1) && j < 5) { continue; }
        if (kind === 'pantalon' && j > 4 && i > (w >> 1) - 2 && i < (w >> 1) + 1) { continue; }
        if (kind === 'toalla' && (j === 2 || j === 3 || j === h - 3)) c = c2;
        if (kind === 'vestido' && j > 3) { if (i < (j - 3) / 3 - 0.5 || i >= w - (j - 3) / 3 + 0.5) { /* campana */ } }
        if (i === 0) c = mixc(c, '#ffffff', 0.2); else if (i === w - 1) c = mixc(c, VIO, 0.3);
        g.set(x0 + i + off, yy + j, c);
      }
    }
    g.set(x0 + 1, ly(x0 + 1), '#c8322a'); g.set(x0 + w - 2, ly(x0 + w - 2), '#2f4fa8');           // ganchitos
  }
  prenda(9, 9, 9, '#e8a8b8', '#c8708a', 'camisa');
  prenda(21, 6, 12, '#3b4f7a', '#2f4470', 'pantalon'); prenda(27, 6, 12, '#3b4f7a', '#2f4470', 'pantalon');
  prenda(36, 10, 11, '#efebdc', '#2f4fa8', 'toalla');
  prenda(48, 3, 5, '#f2e63c', '#c9a66b', 'medias'); prenda(52, 3, 5, '#e8388a', '#c9a66b', 'medias');
  g.outline(K);
  return finish(g, 32, 32, 4, 1, 0, { poles: [{ x: 4, y: 31 }, { x: 59, y: 31 }] });
}
cuarto.cordel = [cordelFrame(0), cordelFrame(1)];

/* ---- fierros de columna: huella 1x1. [0] 16 x 40 (up 24), [1] 16 x 28 (up 12) ---- */
cuarto.fierros = [
  mueble(1, 1, 24, function (g, X, Y, W, H) {
    var x, y;
    sombra(g, 9, 37, 7, 2.2);
    for (y = 16; y < 36; y++) for (x = 3; x < 13; x++) g.set(x, y, x === 3 ? CON[4] : x < 5 ? CON[3] : x > 10 ? CON[1] : CON[2]);
    for (y = 18; y < 36; y += 5) { g.rect(3, y, 10, 1, CON[1]); }                       // marcas del encofrado
    for (y = 34; y < 36; y++) for (x = 3; x < 13; x++) g.set(x, y, CON[0]);
    var vars = [[4, 3], [6, 9], [9, 5], [11, 11]];
    vars.forEach(function (v) {
      var fx = v[0], h = v[1];
      g.rect(fx, 16 - h - 4, 1, h + 5, '#5a5a62'); g.set(fx, 16 - h - 4, RUS[3]);
      for (var k = 0; k < h + 5; k += 3) g.set(fx, 16 - h - 4 + k, RUS[2]);
    });
    g.line(4, 12, 6, 7, '#5a5a62');                                                      // un fierro doblado
    g.rect(3, 16, 10, 1, CON[0]);
    g.rect(3, 22, 10, 1, '#6f6c68');                                                     // estribo de alambre
    g.outline(K);
  }),
  mueble(1, 1, 12, function (g, X, Y, W, H) {
    var x, y;
    sombra(g, 9, 26, 7, 2.2);
    for (var i = 0; i < 6; i++) g.line(3 + i, 25, 5 + i * 2, 6 + (i % 2) * 2, i % 2 ? '#7e868a' : RUS[2]);     // atado de fierros apoyados
    g.rect(3, 21, 11, 1, '#d8d4c4');
    for (y = 0; y < 3; y++) for (x = 0; x < 5; x++) g.set(8 + x, 22 + y, y === 0 ? BRI[3] : (x === 2 ? MORT : BRI[2]));   // ladrillos
    g.outline(K);
  })
];

/* ---- escalera de bajada a la calle: 32 x 32 (huella 2x2) ---- */
cuarto.escalera = mueble(2, 2, 0, function (g, X, Y, W, H) {
  var x, y;
  // brocal de concreto (marco grueso) y hueco negro: la caja de la escalera que baja a la calle
  g.rect(0, 0, 32, 32, CON[3]); g.rect(0, 0, 32, 1, CON[4]); g.rect(0, 31, 32, 1, CON[1]); g.rect(0, 0, 1, 32, CON[4]); g.rect(31, 0, 1, 32, CON[1]);
  g.rect(1, 1, 30, 1, CON[4]);
  g.rect(4, 4, 24, 22, '#17151b');
  for (y = 4; y < 10; y++) g.rect(4, y, 24, 1, y < 6 ? '#3a3844' : '#26242e');          // luz que entra por arriba
  g.rect(4, 4, 24, 1, CON[0]); g.rect(4, 4, 1, 22, CON[1]); g.rect(27, 4, 1, 22, CON[0]);
  // escalera marinera de fierro: dos largueros y peldaños que se van hundiendo en la sombra
  var rails = ['#a4abaa', '#7e868a', '#5c6570', '#3b4250'];
  for (y = 3; y < 28; y++) { var k = y < 12 ? 0 : y < 18 ? 1 : y < 23 ? 2 : 3; g.set(11, y, rails[k]); g.set(12, y, rails[Math.min(3, k + 1)]); g.set(20, y, rails[k]); g.set(21, y, rails[Math.min(3, k + 1)]); }
  for (var ry = 6; ry < 26; ry += 4) { var kk = ry < 12 ? 0 : ry < 18 ? 1 : ry < 23 ? 2 : 3; g.rect(13, ry, 7, 1, rails[kk]); g.rect(13, ry + 1, 7, 1, rails[Math.min(3, kk + 2)]); }
  // pasamanos que sale por encima del brocal
  g.rect(11, 1, 1, 3, MET[4]); g.rect(20, 1, 1, 3, MET[4]); g.rect(11, 0, 10, 1, MET[3]); g.rect(11, 1, 10, 1, MET[1]);
  // flecha pintada hacia abajo (amarilla) en el brocal de abajo, medio gastada
  g.rect(14, 27, 4, 1, '#e6c85a'); g.rect(15, 28, 2, 1, '#e6c85a'); g.rect(15, 29, 2, 1, '#e6c85a'); g.set(13, 28, '#e6c85a'); g.set(18, 28, '#e6c85a'); g.set(16, 29, CON[3]);
  g.outline(K);
}, null);
cuarto.escalera.stairs = true;

/* ---- neblina horneada: tiras que se repiten en x (128 x 48 y 160 x 56). Translucidas. ---- */
function neblinaStrip(W, H, seed, n) {
  var c = mkCanvas(W, H), ctx = c.getContext('2d'), r = rngf(seed);
  for (var i = 0; i < n; i++) {
    var cx = Math.floor(r() * W), cy = 6 + Math.floor(r() * (H - 12)), rx = 12 + Math.floor(r() * 22), ry = 3 + Math.floor(r() * 5), a = 0.08 + r() * 0.08;
    var col = r() < 0.5 ? '216,219,216' : '196,201,203';
    ctx.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')';
    for (var j = -ry; j <= ry; j++) {
      var w = Math.round(rx * Math.sqrt(1 - (j * j) / (ry * ry + 0.01)));
      for (var k = -1; k <= 1; k++) ctx.fillRect(cx - w + k * W, cy + j, w * 2, 1);          // repetido a los lados: la tira se junta sin costura
    }
  }
  c.tileX = true;
  return c;
}
cuarto.neblina = [neblinaStrip(128, 48, 31, 26), neblinaStrip(160, 56, 77, 30)];

/* ---- horizonte lejano del Callao (tira que se repite en x): 192 x 40. Siluetas de techos, gruas del puerto, tanques ---- */
(function () {
  var W = 192, H = 40, g = new Gx(W, H), r = rngf(515), x, y;
  var far = '#9a9da2', near = '#7a7d86', mid = '#888b92';
  function wrapRect(x0, y0, w, h, c) { for (var k = -1; k <= 1; k++) g.rect(x0 + k * W, y0, w, h, c); }
  function wrapLine(x0, y0, x1, y1, c) { for (var k = -1; k <= 1; k++) g.line(x0 + k * W, y0, x1 + k * W, y1, c); }
  // capa lejana: bloques bajos
  for (x = 0; x < W; x += 9) { var bh = 5 + Math.floor(r() * 9); wrapRect(x, H - bh - 6, 8, bh + 6, far); }
  // gruas (porticos del puerto) lejanas
  [34, 118].forEach(function (cx) {   // portico: dos patas, viga larga hacia el mar (derecha) y un tirante
    wrapRect(cx, 12, 2, H - 18, mid); wrapRect(cx + 8, 12, 2, H - 18, mid); wrapRect(cx - 2, 10, 14, 3, mid);
    wrapRect(cx + 10, 10, 22, 2, mid); wrapLine(cx + 4, 4, cx + 31, 10, mid); wrapLine(cx + 4, 4, cx + 4, 10, mid); wrapRect(cx + 18, 12, 4, 3, '#6b6e78');
  });
  // capa cercana: techos con tanques
  for (x = 0; x < W; x += 14) {
    var h2 = 8 + Math.floor(r() * 10); wrapRect(x + 1, H - h2, 12, h2, near);
    if (r() < 0.4) { wrapRect(x + 4, H - h2 - 4, 5, 4, '#575a62'); wrapRect(x + 3, H - h2 - 5, 7, 1, '#44474d'); }
    else if (r() < 0.5) { wrapLine(x + 9, H - h2, x + 9, H - h2 - 6, '#575a62'); }
    if (r() < 0.5) wrapRect(x + 3 + Math.floor(r() * 5), H - h2 + 2 + Math.floor(r() * 3), 2, 2, '#c9a66b');   // una ventana prendida
  }
  cuarto.horizonte = finish(g, 0, H, 12, 3, 0, { tileX: true });
})();

/* ============================ MUEBLES ============================ */
var M = B.muebles = {};
function reg(id, c, ex) { if (ex) for (var k in ex) c[k] = ex[k]; c.id = id; M[id] = c; return c; }

/* ---- COLCHON (2x1 y 1x2) ---- */
function colchonDraw(vert) {
  return mueble(vert ? 1 : 2, vert ? 2 : 1, 0, function (g, X, Y, W, H) {
    var x, y, L = vert ? H - 5 : W - 2, D = vert ? W - 2 : H - 5;        // largo y ancho de la cara superior
    var fx0 = 1, fy0 = 1, top = [];
    function P(a, b, c) { if (vert) g.set(fx0 + b, fy0 + a, c); else g.set(fx0 + a, fy0 + b, c); }
    sombra(g, W / 2 + 1, H - 2, W / 2, 2.2);
    for (var a = 0; a < L; a++) for (var b = 0; b < D; b++) {
      var stripe = (b >> 1) % 3 === 0;
      var c = stripe ? '#8fb3be' : '#c9c5a8';
      if ((a + b * 2) % 9 === 0) c = stripe ? '#6b8c9c' : '#b0ad92';
      P(a, b, c);
    }
    // manchas del colchon usado
    for (a = 8; a < 12; a++) for (b = 1; b < 4; b++) P(a, b, '#a8956e');
    P(9, 2, '#8a7658'); P(11, D - 3, '#a8956e'); P(12, D - 3, '#a8956e');
    // almohada
    for (a = 2; a < 7; a++) for (b = 2; b < D - 2; b++) P(a, b, a === 2 || b === 2 ? '#ece6cf' : a === 6 || b === D - 3 ? '#9a957f' : '#d3cdb0');
    P(4, 4, '#b4ae94'); P(5, 5, '#b4ae94');
    // frazada con rayas de color (lo unico alegre que tiene al inicio)
    for (a = 15; a < L; a++) for (b = 0; b < D; b++) {
      var c2 = '#8f3a32';
      if (b === 2 || b === D - 3) c2 = '#e6c85a'; else if (b === 3 || b === D - 4) c2 = '#c9a66b';
      if (a === 15) c2 = '#c05448';
      P(a, b, c2);
    }
    for (b = 0; b < D; b += 2) P(15, b, '#d98a9e');          // doblez
    // canto frontal (el espesor): 3 filas
    for (b = 0; b < 3; b++) for (a = 0; a < L; a++) {
      var cc = a > 14 ? (b === 0 ? '#6f2a28' : '#4a2a2a') : (b === 0 ? '#8f8f8a' : b === 1 ? '#6b6c70' : '#5f5d6b');
      if (vert) { if (b === 0 && a >= L - 0) continue; }
      else g.set(fx0 + a, fy0 + D + b, cc);
    }
    if (vert) for (a = 0; a < D; a++) for (b = 0; b < 3; b++) g.set(fx0 + a, fy0 + L + b, b === 0 ? '#8f8f8a' : b === 1 ? '#6b6c70' : '#5f5d6b');
    g.outline(K);
    sombra(g, W / 2 + 1, H - 1, W / 2, 1.5);
  });
}
reg('colchon', colchonDraw(false)); reg('colchon_r', colchonDraw(true));

/* ---- PERCHA DE ARMAS (pared 2x1): tabla con clavos. ganchos = x de cada clavo ---- */
reg('armero', mueble(2, 1, 0, function (g) {
  var x, i;
  for (x = 1; x < 31; x++) { g.set(x, 2, WOO[3]); g.set(x, 3, WOO[2]); g.set(x, 4, WOO[2]); g.set(x, 5, WOO[1]); g.set(x, 6, WOO[0]); }
  g.set(4, 3, WOO[1]); g.set(5, 3, WOO[1]); g.set(18, 4, WOO[1]); g.set(19, 4, WOO[1]); g.set(24, 3, WOO[1]); g.set(10, 4, WOO[3]);       // vetas
  [5, 12, 19, 26].forEach(function (hx) {
    g.set(hx, 4, MET[4]); g.set(hx, 5, MET[2]);                                            // cabeza del clavo
    g.rect(hx, 7, 1, 3, MET[3]); g.set(hx + 1, 9, MET[3]); g.set(hx + 1, 10, MET[2]);      // gancho doblado hacia afuera
  });
  g.outline(K);
}), { ganchos: [{ x: 5, y: 10 }, { x: 12, y: 10 }, { x: 19, y: 10 }, { x: 26, y: 10 }] });

/* ---- BAUL DE LATA (1x1) ---- */
reg('baulLata', mueble(1, 1, 0, function (g) {
  var x, y, T = ['#2a3a5c', '#3f5680', '#5a74a0', '#7e96bc', '#a9bcd6'];
  sombra(g, 8, 14, 7, 2);
  caja(g, 2, 3, 12, 4, 8, T);
  // tapa abombada: filo
  g.rect(2, 7, 12, 1, T[0]); g.rect(3, 8, 10, 1, T[1]);
  // remaches y bisagras
  for (x = 3; x < 13; x += 3) g.set(x, 9, T[4]);
  g.rect(6, 4, 4, 1, T[4]);
  // candado de juguete amarillo
  g.rect(7, 8, 3, 3, '#e6c85a'); g.set(7, 8, '#fff3c0'); g.rect(8, 7, 1, 1, '#a88a3c'); g.set(8, 9, '#7a6430');
  // oxido
  g.set(3, 10, RUS[2]); g.set(4, 11, RUS[2]); g.set(12, 10, RUS[2]); g.set(11, 6, RUS[1]); g.set(13, 11, RUS[1]);
  g.outline(K);
  sombra(g, 8, 14.5, 7, 1.3);
}));

/* ---- FOCO PELADO (pared 1x1): apagado / prendido. luz = centro del halo ---- */
function focoDraw(on) {
  return mueble(1, 1, 0, function (g) {
    g.rect(8, 0, 1, 4, '#17151b'); g.set(9, 1, '#17151b'); g.set(9, 0, '#17151b');                            // cable
    g.rect(7, 4, 3, 2, MET[1]); g.set(7, 4, MET[3]); g.set(9, 5, MET[0]);                                     // portalamparas
    if (on) {
      g.ell(8, 9, 2.6, 3, '#ffe7a8'); g.ell(8, 9.5, 1.6, 2, '#fff8e0'); g.set(8, 9, '#ffffff'); g.rect(8, 8, 1, 2, '#ffffff');
      g.set(5, 9, '#ffe7a850'); g.set(11, 9, '#ffe7a850'); g.set(8, 13, '#ffe7a850'); g.set(8, 14, '#ffe7a828');
    } else {
      g.ell(8, 9, 2.6, 3, '#8a8f8e'); g.ell(8, 9.5, 1.6, 2, '#6f7476'); g.set(7, 8, '#cfd3cc'); g.set(7, 9, '#b4b9b8');
    }
    g.outline(on ? '#8a6a2a' : K);
  }, { luz: { x: 8, y: 9 } });
}
reg('foco', focoDraw(false)); reg('foco_on', focoDraw(true));

/* ---- BAUL DE MADERA (2x1 y 1x2) ---- */
function baulMaderaDraw(vert) {
  return mueble(vert ? 1 : 2, vert ? 2 : 1, 0, function (g, X, Y, W, H) {
    var x, y, hf = 8;
    var Wd = vert ? W - 2 : W - 2, d = vert ? H - hf - 3 : 5;
    sombra(g, W / 2 + 1, H - 2, W / 2, 2.2);
    var top = vert ? 1 : 2;
    var by = top;
    caja(g, 1, by, Wd, d, hf, ['#3a2420', '#5c3a22', '#8f5a2e', '#b57a3e', '#d9a864']);
    // tapa abombada: sombreado de barril
    var LID = ['#d9a864', '#b57a3e', '#a86e38', '#8f5a2e', '#6b4223'];
    for (y = 0; y < d; y++) for (x = 0; x < Wd; x++) { if (vert) { var tt = x / (Wd - 1); g.set(1 + x, by + y, LID[tt < 0.15 ? 0 : tt < 0.4 ? 1 : tt < 0.65 ? 2 : tt < 0.88 ? 3 : 4]); } else { if (x === 0) continue; g.set(1 + x, by + y, LID[Math.min(4, y)]); } }
    g.set(1, by, '#d9a864');
    if (vert) {   // de costado el baul se confunde con una puerta: bisagras atras, canto oscuro de la tapa y remaches
      g.rect(1, by, Wd, 1, '#5c3a22'); g.rect(3, by, 2, 2, '#3b4250'); g.rect(Wd - 3, by, 2, 2, '#3b4250'); g.rect(3, by, 2, 1, '#7e868a'); g.rect(Wd - 3, by, 2, 1, '#7e868a');
      g.rect(1, by + d - 1, Wd, 1, '#8f5a2e');
      for (y = by + 3; y < by + d - 2; y += 4) { g.set(2, y, '#d9a864'); g.set(Wd - 1, y, '#6b4223'); }
    }
    // vetas en la tapa
    for (x = 0; x < (vert ? 3 : 5); x++) {
      if (vert) g.rect(3 + x * 4, by + 2, 1, d - 5, '#7f4e26');
      else g.rect(5 + x * 6, by + 1 + (x % 2), 4, 1, '#7f4e26');
    }
    // zunchos de fierro
    var fy = by + d;
    if (vert) {
      g.rect(1, by + 5, Wd, 2, '#3b4250'); g.rect(1, by + 5, Wd, 1, '#5c6570'); g.rect(1, by + d - 6, Wd, 2, '#3b4250'); g.rect(1, by + d - 6, Wd, 1, '#5c6570');
    } else {
      g.rect(5, by, 2, d + hf, '#3b4250'); g.rect(5, by, 1, d + hf, '#5c6570'); g.rect(Wd - 5, by, 2, d + hf, '#3b4250'); g.rect(Wd - 5, by, 1, d + hf, '#5c6570');
    }
    // frente: cerradura de bronce y tallado de la feria
    var cx = vert ? 1 + (Wd >> 1) : 1 + (Wd >> 1);
    g.rect(cx - 1, fy + 2, 3, 4, '#e0c040'); g.set(cx - 1, fy + 2, '#fff3c0'); g.rect(cx, fy + 4, 1, 1, '#4a3a10');
    var tallado = '#c98a48';
    if (!vert) { for (x = 9; x < Wd - 7; x += 3) { if (Math.abs(x - cx) > 3) { g.set(x, fy + 3, tallado); g.set(x + 1, fy + 4, tallado); g.set(x, fy + 5, tallado); g.set(x - 1, fy + 4, tallado); } } }
    else { g.set(3, fy + 3, tallado); g.set(4, fy + 4, tallado); g.set(3, fy + 5, tallado); g.set(2, fy + 4, tallado); g.set(Wd - 3, fy + 3, tallado); g.set(Wd - 2, fy + 4, tallado); g.set(Wd - 3, fy + 5, tallado); g.set(Wd - 4, fy + 4, tallado); }
    g.outline(K);
    sombra(g, W / 2 + 1, H - 1, W / 2, 1.3);
  });
}
reg('baulMadera', baulMaderaDraw(false)); reg('baulMadera_r', baulMaderaDraw(true));

/* ---- MESA (2x1 y 1x2) ---- */
function mesaDraw(vert) {
  return mueble(vert ? 1 : 2, vert ? 2 : 1, 0, function (g, X, Y, W, H) {
    var x, y, Wt = W - 2, d = vert ? H - 9 : 8;
    sombra(g, W / 2 + 1, H - 2, W / 2, 2.2);
    // patas (se dibujan primero, bajo el tablero)
    var ly = 1 + d + 2, lh = vert ? 5 : 5;
    function pata(px0, hh) { g.rect(px0, ly, 2, hh, WOO[1]); g.rect(px0, ly, 1, hh, WOO[2]); g.rect(px0 + 1, ly + hh - 1, 1, 1, WOO[0]); }
    pata(3, lh); pata(Wt - 3, lh - 0);
    // el cartoncito doblado que le pusieron a la pata corta
    g.rect(Wt - 5, ly + lh, 5, 1, '#c9a66b'); g.rect(Wt - 4, ly + lh - 1, 3, 1, '#a5814f');
    // tablero: tablas
    for (y = 0; y < d; y++) for (x = 0; x < Wt; x++) {
      var pl = vert ? (x >> 2) : (y >> 2), c = pl % 2 ? WOO[3] : WOO[2];
      if (vert ? (x % 4 === 3) : (y % 4 === 3)) c = WOO[1];
      if (y === 0 || x === 0) c = '#e0b070';
      g.set(1 + x, 1 + y, c);
    }
    for (x = 0; x < Wt; x++) { g.set(1 + x, 1 + d, x === 0 ? WOO[3] : WOO[2]); g.set(1 + x, 2 + d, x === Wt - 1 ? WOO[0] : WOO[1]); }    // canto del tablero
    // mantel de plastico a cuadros (rojo y blanco), con el vuelo colgando adelante
    var mx0 = vert ? 3 : 5, mx1 = vert ? Wt - 2 : Wt - 4, my0 = vert ? 4 : 3;
    for (y = my0; y < d + 1; y++) for (x = mx0; x < mx1; x++) g.set(1 + x, 1 + y, (((x >> 1) + (y >> 1)) & 1) ? '#efebdc' : '#c8322a');
    for (x = mx0 + 1; x < mx1 - 1; x++) for (y = 0; y < 3; y++) g.set(1 + x, 2 + d + y, (((x >> 1) + y) & 1) ? '#bdb9ab' : '#8a2a22');
    for (x = mx0; x < mx1; x++) g.set(1 + x, 1 + my0, (x & 1) ? '#ffffff' : '#e8806e');
    g.outline(K);
    sombra(g, W / 2 + 1, H - 1, W / 2, 1.3);
  });
}
reg('mesa', mesaDraw(false)); reg('mesa_r', mesaDraw(true));

/* ---- SILLA DE PLASTICO (1x1, alta: 16 x 26, up 10) ---- */
reg('silla', mueble(1, 1, 10, function (g) {
  var P = ['#4a1614', '#8a2a22', '#b8382e', '#d8584a'], x, y;
  sombra(g, 8, 24, 6.5, 2);
  // patas traseras (apenas se ven) y delanteras
  g.rect(5, 20, 1, 3, P[0]); g.rect(10, 20, 1, 3, P[0]);
  g.rect(3, 19, 2, 5, P[1]); g.rect(3, 19, 1, 5, P[2]); g.rect(11, 19, 2, 5, P[0]); g.rect(11, 19, 1, 5, P[1]);
  g.set(3, 23, '#3a3a46'); g.set(4, 23, '#3a3a46'); g.set(11, 23, '#3a3a46'); g.set(12, 23, '#3a3a46');
  // respaldo (de frente; es la silla de siempre)
  for (y = 1; y < 12; y++) for (x = 4; x < 12; x++) { if (y === 1 && (x === 4 || x === 11)) continue; g.set(x, y, x === 4 ? P[3] : x > 9 ? P[0] : P[2]); }
  g.rect(5, 1, 6, 1, P[3]);
  for (y = 3; y < 10; y++) { g.set(6, y, '#3a1210'); g.set(9, y, '#3a1210'); }          // ranuras
  g.rect(6, 3, 1, 1, P[3]);
  // asiento: cara superior + borde
  for (y = 12; y < 17; y++) for (x = 3; x < 13; x++) g.set(x, y, y === 12 ? P[2] : x === 3 ? P[3] : x === 12 ? P[1] : P[2]);
  for (x = 3; x < 13; x++) { g.set(x, 17, P[1]); g.set(x, 18, x > 10 ? '#3a1210' : P[0]); }
  g.set(7, 14, P[1]); g.set(8, 14, P[1]);
  g.set(5, 15, '#a8956e'); g.set(10, 13, '#a8956e');                                    // mugrecita
  g.outline(K);
}));

/* ---- BANQUITO (1x1) ---- */
reg('banquito', mueble(1, 1, 4, function (g) {
  var x, y;
  sombra(g, 8, 18, 6.5, 2);
  g.rect(4, 13, 2, 6, WOO[1]); g.rect(4, 13, 1, 6, WOO[2]); g.rect(11, 13, 2, 6, WOO[0]); g.rect(11, 13, 1, 6, WOO[1]);
  g.rect(5, 16, 7, 1, WOO[1]);                                                        // travesaño
  for (y = 6; y < 11; y++) for (x = 2; x < 14; x++) g.set(x, y, y === 6 ? '#e0b070' : y === 8 ? WOO[1] : WOO[2]);
  for (x = 2; x < 14; x++) { g.set(x, 11, WOO[3]); g.set(x, 12, WOO[1]); }
  g.rect(8, 6, 1, 5, WOO[0]);
  g.set(4, 8, MET[3]); g.set(11, 9, MET[3]);                                          // clavos
  g.rect(12, 7, 2, 1, WOO[1]);
  g.outline(K);
  sombra(g, 8, 19, 6.5, 1.2);
}));

/* ---- ESTANTE DE CAJONES (2x1 y 1x2; alto) ---- */
function estanteDraw(vert) {
  var up = vert ? 14 : 24, w = vert ? 1 : 2, h = vert ? 2 : 1;
  return mueble(w, h, up, function (g, X, Y, W, H) {
    var x, y, total = H + up, fh = 27, ftop = total - 4 - fh, cols = vert ? 1 : 2, cw = (W - 2) / cols | 0, dTop = vert ? ftop - 1 : 7;
    sombra(g, W / 2 + 1, total - 2, W / 2 - 1, 2);
    // cara superior del cajon de arriba
    for (y = 0; y < dTop; y++) for (x = 0; x < W - 2; x++) g.set(1 + x, ftop - dTop + y, y === 0 || x === 0 ? '#d9a864' : (x === W - 3 ? WOO[2] : WOO[3]));
    for (x = 3; x < W - 3; x += 5) g.rect(1 + x, ftop - dTop + 2, 3, 1, WOO[2]);
    if (vert) {                                                                // visto de costado: tablas del cajon de arriba y unas cosas encima
      for (y = 3; y < dTop; y += 3) g.rect(2, ftop - dTop + y, W - 4, 1, WOO[2]);
      g.rect(3, ftop - dTop + 4, 5, 5, '#2f4fa8'); g.rect(3, ftop - dTop + 4, 5, 1, '#4a6fc8'); g.rect(4, ftop - dTop + 5, 3, 1, '#efebdc');   // lata de pintura
      g.rect(9, ftop - dTop + 7, 4, 2, '#e6c85a'); g.rect(9, ftop - dTop + 7, 4, 1, '#fff3c0'); g.rect(9, ftop - dTop + 9, 4, 2, '#c8322a');    // libros
    }
    // tres pisos de cajones de fruta
    var contents = [
      [function (cx0, cy0) { g.rect(cx0 + 2, cy0 + 2, 3, 5, '#c8322a'); g.rect(cx0 + 5, cy0 + 3, 3, 4, '#2f4fa8'); g.rect(cx0 + 8, cy0 + 2, 3, 5, '#e6c85a'); g.rect(cx0 + 2, cy0 + 2, 1, 5, '#e8806e'); }, function (cx0, cy0) { g.rect(cx0 + 2, cy0 + 4, 9, 3, '#e8a8b8'); g.rect(cx0 + 2, cy0 + 4, 9, 1, '#f7d6cf'); g.rect(cx0 + 5, cy0 + 2, 6, 2, '#8fb3be'); }],
      [function (cx0, cy0) { g.rect(cx0 + 2, cy0 + 3, 4, 4, '#5f8a4a'); g.rect(cx0 + 2, cy0 + 3, 4, 1, '#94b06a'); g.rect(cx0 + 7, cy0 + 4, 4, 3, '#c8322a'); g.rect(cx0 + 7, cy0 + 4, 4, 1, '#e8806e'); }, function (cx0, cy0) { g.ell(cx0 + 6, cy0 + 5, 4, 2, '#5c6570'); g.rect(cx0 + 3, cy0 + 3, 7, 1, MET[3]); g.rect(cx0 + 2, cy0 + 4, 1, 2, MET[1]); }],
      [function (cx0, cy0) { g.rect(cx0 + 2, cy0 + 3, 8, 4, '#a8956e'); g.rect(cx0 + 2, cy0 + 3, 8, 1, '#c9b78a'); g.set(cx0 + 6, cy0 + 5, '#6b5a48'); }, function (cx0, cy0) { g.rect(cx0 + 2, cy0 + 5, 4, 2, '#2f4470'); g.rect(cx0 + 7, cy0 + 5, 4, 2, '#2f4470'); g.rect(cx0 + 2, cy0 + 5, 4, 1, '#4a6498'); g.rect(cx0 + 7, cy0 + 5, 4, 1, '#4a6498'); }]
    ];
    for (var row = 0; row < 3; row++) for (var col = 0; col < cols; col++) {
      var cx0 = 1 + col * cw, cy0 = ftop + row * 9, ww = (col === cols - 1) ? W - 2 - col * cw : cw;
      for (y = 0; y < 9; y++) for (x = 0; x < ww; x++) {
        var edge = (y === 0 || y === 8 || x === 0 || x === ww - 1);
        var c = edge ? (y === 0 || x === 0 ? WOO[3] : WOO[0]) : '#2d2428';
        if (!edge && y > 6) c = WOO[1];                                       // tabla de abajo (parte de adelante)
        g.set(cx0 + x, cy0 + y, c);
      }
      g.rect(cx0 + 1, cy0 + 7, ww - 2, 1, WOO[2]);
      contents[row][col % 2](cx0, cy0);
      for (y = 1; y < 8; y++) g.set(cx0 + ww - 1, cy0 + y, WOO[1]);
    }
    // un tarro con una plantita encima
    if (!vert) { g.rect(24, ftop - 6, 4, 5, '#c8322a'); g.rect(24, ftop - 6, 4, 1, '#e8806e'); g.set(25, ftop - 8, '#5fa84a'); g.set(26, ftop - 9, '#5fa84a'); g.set(27, ftop - 8, '#6b8a50'); g.rect(26, ftop - 7, 1, 2, '#4a5a44'); }
    g.outline(K);
    sombra(g, W / 2 + 1, total - 1, W / 2 - 1, 1.2);
  });
}
reg('estante', estanteDraw(false)); reg('estante_r', estanteDraw(true));

/* ---- notas musicales ---- */
function nota(g, x, y, c) { g.rect(x, y + 3, 2, 2, c); g.rect(x + 2, y, 1, 4, c); g.set(x + 3, y, c); g.set(x + 3, y + 1, c); }

/* ---- RADIO VIEJA (1x1, 16 x 20 up 4): normal / sonando ---- */
function radioDraw(on) {
  return mueble(1, 1, 4, function (g) {
    var x, y;
    sombra(g, 8, 18, 7, 2);
    // antena telescopica
    g.line(12, 8, 14, 1, MET[4]); g.set(14, 0, '#c8322a');
    // asa
    g.rect(4, 5, 8, 1, MET[1]); g.rect(3, 6, 1, 2, MET[1]); g.rect(12, 6, 1, 2, MET[1]); g.rect(4, 5, 8, 1, MET[2]);
    caja(g, 2, 7, 12, 3, 9, ['#3a2420', '#5c3a22', '#8f5a2e', '#b57a3e', '#d9a864']);
    // rejilla del parlante
    g.rect(3, 11, 6, 6, '#1c1a22'); for (x = 3; x < 9; x += 2) g.rect(x, 11, 1, 6, on ? '#e0b070' : '#4a4756'); g.rect(3, 13, 6, 1, on ? '#e0b070' : '#4a4756');
    // dial
    g.rect(10, 11, 3, 3, on ? '#ffe7a8' : '#a5814f'); g.set(11, 11, '#c8322a'); g.rect(10, 11, 3, 1, on ? '#fff8e0' : '#c9a66b');
    g.set(10, 15, '#efebdc'); g.set(12, 15, '#efebdc'); g.set(10, 16, '#bdb9ab'); g.set(12, 16, '#bdb9ab');
    g.outline(K);
    if (on) {
      nota(g, 0, 0, NEON.pink); nota(g, 5, 0, NEON.yellow);
      g.set(0, 11, '#efebdc'); g.set(0, 13, '#efebdc'); g.set(15, 11, '#efebdc'); g.set(15, 13, '#efebdc'); g.set(15, 12, '#efebdc');
    }
    sombra(g, 8, 19, 7, 1.2);
  });
}
reg('radio', radioDraw(false)); reg('radio_sonando', radioDraw(true));

/* ---- CAJON PERUANO (1x1, 16 x 20 up 4): normal / sonando ---- */
function cajonDraw(on) {
  return mueble(1, 1, 4, function (g) {
    var x, y;
    sombra(g, 8, 18, 7, 2);
    caja(g, 2, 6, 12, 4, 10, ['#6b4a2a', '#9a6e3a', '#c99458', '#e0b070', '#f0cc90']);
    // vetas del triplay
    g.rect(4, 12, 1, 6, '#b8884a'); g.rect(11, 11, 1, 6, '#b8884a'); g.rect(6, 17, 3, 1, '#b8884a');
    // boca (el hueco)
    g.ell(8, 14, 3.2, 3.2, '#241a14'); g.ell(8, 14, 2.2, 2.2, on ? '#4a2c1c' : '#17110d'); g.set(6, 12, '#8f5a2e');
    // tornillos
    g.set(3, 11, MET[3]); g.set(12, 11, MET[3]); g.set(3, 17, MET[2]); g.set(12, 17, MET[2]);
    g.outline(K);
    if (on) {
      nota(g, 1, 0, NEON.yellow); nota(g, 10, 0, NEON.cyan);
      g.set(0, 13, '#efebdc'); g.set(0, 15, '#efebdc'); g.set(15, 13, '#efebdc'); g.set(15, 15, '#efebdc'); g.set(15, 14, '#efebdc');
    }
    sombra(g, 8, 19, 7, 1.2);
  });
}
reg('cajon', cajonDraw(false)); reg('cajon_sonando', cajonDraw(true));

/* ---- PALOMAR (1x1, 16 x 36 up 20): sin Titina / con Titina ---- */
function palomarDraw(tit) {
  return mueble(1, 1, 20, function (g, X, Y, W, H) {
    var x, y;
    sombra(g, 8, 34, 6.5, 2);
    // poste y pie
    g.rect(7, 19, 3, 14, WOO[1]); g.rect(7, 19, 1, 14, WOO[2]); g.rect(9, 19, 1, 14, WOO[0]);
    g.rect(4, 31, 9, 3, WOO[1]); g.rect(4, 31, 9, 1, WOO[3]); g.rect(4, 33, 9, 1, WOO[0]);
    g.line(5, 31, 8, 26, WOO[1]); g.line(12, 31, 9, 26, WOO[0]);
    // casita
    for (y = 9; y < 19; y++) for (x = 2; x < 14; x++) g.set(x, y, x === 2 ? '#b4d0d0' : x > 11 ? '#6b8c9c' : '#8fb3be');
    g.rect(2, 18, 12, 1, '#4c6478');
    // puerta con arco
    g.rect(3, 12, 3, 6, '#1c2530'); g.rect(4, 11, 1, 1, '#1c2530'); g.set(3, 12, '#2d3d4a'); g.rect(3, 13, 1, 5, '#2d3d4a');
    // ventanita redonda (arriba a la derecha)
    g.ell(11, 11, 1.2, 1.2, '#1c2530'); g.set(10, 10, '#4d6676');
    // tablita de aterrizaje
    g.rect(2, 19, 12, 2, WOO[2]); g.rect(2, 19, 12, 1, WOO[3]); g.rect(2, 20, 12, 1, WOO[0]);
    // techo a dos aguas de calamina
    for (y = 0; y < 8; y++) { var half = 1 + y * 1.0; for (x = 8 - Math.min(7, half) - 0; x < 8 + Math.min(7, half) + 1; x++) g.set(Math.round(x), 1 + y, x < 7 ? RUS[3] : RUS[2]); }
    for (x = 1; x < 15; x++) { g.set(x, 9, RUS[1]); g.set(x, 8, x < 8 ? RUS[2] : RUS[1]); }
    for (x = 3; x < 14; x += 3) for (y = 3; y < 8; y++) if (g.get(x, y)) g.set(x, y, RUS[1]);
    g.set(8, 0, MET[3]);
    g.outline(K);
    if (tit) {   // Titina: paloma gris con cuello tornasolado, sentada en la tablita
      var Pg = '#7e868a', Pl = '#a4abaa', Pd = '#5c6570', Pk = ['#7e868a', '#a4abaa', '#5c6570', '#4a8a6a', '#8a5a9a', '#ffffff', '#d98a9e', '#e0b79a'];
      g.ell(11, 17, 3.2, 2.2, Pg); g.ell(12, 17, 2, 1.4, Pd); g.ell(10, 16, 2, 1.3, Pl);
      g.rect(13, 17, 3, 2, Pd);                                   // cola
      g.disc(8.5, 14, 1.6, Pl);
      g.set(9, 15, '#4a8a6a'); g.set(9, 16, '#8a5a9a'); g.set(10, 15, '#4a8a6a');
      g.set(8, 13, '#ffffff'); g.set(7, 14, '#e0b79a'); g.set(7, 13, '#e0b79a');
      g.set(10, 19, '#d98a9e'); g.set(12, 19, '#d98a9e');
      for (y = 11; y < 21; y++) for (x = 5; x < 16; x++) if (!g.get(x, y)) { var n = [g.get(x - 1, y), g.get(x + 1, y), g.get(x, y - 1), g.get(x, y + 1)]; for (var q = 0; q < 4; q++) if (n[q] && Pk.indexOf(n[q]) >= 0) { g.set(x, y, K); break; } }
      g.set(8, 14, '#1c1a22');
    }
    sombra(g, 8, 35, 6.5, 1.2);
  });
}
reg('palomar', palomarDraw(false)); reg('palomar_titina', palomarDraw(true));

/* ---- GUIRNALDA (pared 3x1: 48 x 16): apagada, cuadro A, cuadro B ---- */
function guirnaldaDraw(mode) {   // 0 apagada, 1 pares prendidas, 2 impares
  return mueble(3, 1, 0, function (g) {
    var cols = [NEON.pink, NEON.yellow, NEON.green, NEON.cyan, NEON.orange], i, x;
    for (x = 0; x < 48; x++) g.set(x, 1 + Math.round(Math.sin(x / 47 * Math.PI) * 4), '#26382c');
    g.set(0, 0, MET[4]); g.set(47, 0, MET[4]); g.set(1, 1, MET[3]);
    for (i = 0; i < 8; i++) {
      var bx = 3 + i * 6, by = 1 + Math.round(Math.sin(bx / 47 * Math.PI) * 4) + 1, lit = mode && ((i % 2) === (mode === 1 ? 0 : 1)), base = cols[i % cols.length];
      g.set(bx, by, '#26382c');
      var c = lit ? base : mixc(base, '#5c6570', 0.62);
      g.rect(bx - 1, by + 1, 3, 3, c); g.set(bx, by + 4, lit ? mixc(base, '#ffffff', 0.2) : mixc(base, '#33353d', 0.5));
      if (lit) { g.set(bx - 1, by + 1, '#ffffff'); g.set(bx - 2, by + 2, mixc(base, '#ffffff', 0.4) + 'a0'); g.set(bx + 2, by + 2, mixc(base, '#ffffff', 0.4) + 'a0'); g.set(bx, by + 5, mixc(base, '#ffffff', 0.3) + '90'); }
    }
  }, { luz: { x: 24, y: 8 }, frames: 2 });
}
reg('guirnalda', guirnaldaDraw(0)); reg('guirnalda_on', guirnaldaDraw(1)); reg('guirnalda_on2', guirnaldaDraw(2));

/* ---- LAMPARIN (1x1, 16 x 22 up 6): apagado / prendido ---- */
function lamparinDraw(on) {
  return mueble(1, 1, 6, function (g) {
    var x, y;
    sombra(g, 8, 20, 5.5, 2);
    // asa
    g.line(11, 15, 13, 16, MET[2]); g.line(13, 16, 12, 19, MET[2]);
    // deposito de kerosene
    g.ell(8, 17, 4.5, 3, MET[3]); g.ell(8, 17.5, 4.5, 2.4, MET[2]); g.rect(4, 17, 9, 2, MET[2]); g.rect(5, 19, 7, 1, MET[1]);
    g.rect(5, 15, 2, 1, MET[4]); g.rect(4, 16, 1, 2, MET[4]);
    // cuello de bronce y perilla
    g.rect(6, 13, 5, 2, '#c9a040'); g.rect(6, 13, 5, 1, '#f0d070'); g.rect(11, 14, 2, 1, '#a88a3c'); g.set(13, 14, '#7a6430');
    // chimenea de vidrio
    for (y = 4; y < 13; y++) { var wv = (y > 6 && y < 11) ? 5 : 4, x0 = 8 - (wv >> 1) - (wv === 5 ? 0 : 0); for (x = 0; x < wv; x++) g.set(x0 + x, y, on ? (x === 0 ? '#fff3cf' : '#ffd9a0') : (x === 0 ? '#8fb0b8' : '#4d6676')); }
    g.rect(6, 3, 5, 1, '#5c6570'); g.rect(7, 2, 3, 1, '#7e868a');
    if (on) { g.rect(8, 6, 1, 6, '#ff8a2a'); g.rect(8, 5, 1, 1, '#ffcf8a'); g.rect(7, 9, 3, 3, '#ffcf8a'); g.rect(8, 8, 1, 4, '#fff3cf'); g.set(8, 12, '#2a2440'); }
    else { g.set(8, 12, '#2a2440'); g.set(8, 11, '#3a3a46'); }
    g.outline(on ? '#7a4a1a' : K);
    sombra(g, 8, 21, 5.5, 1.1);
  }, { luz: { x: 8, y: 9 } });
}
reg('lamparin', lamparinDraw(false)); reg('lamparin_on', lamparinDraw(true));

/* ---- ADORNOS DE PARED ---- */
reg('aficheChicha', mueble(1, 1, 0, function (g) {
  var x, y;
  for (y = 1; y < 15; y++) for (x = 3; x < 13; x++) g.set(x, y, NEON.pink);
  g.rect(3, 2, 10, 3, NEON.yellow); for (x = 4; x < 12; x += 3) g.rect(x, 3, 2, 1, '#2a2630');                    // «HOY»
  g.ell(8, 8, 2.6, 2.6, NEON.green); g.ell(8, 8, 1.4, 1.4, NEON.cyan); g.set(7, 7, '#ffffff');                       // la bola de disco / sol chicha
  g.rect(3, 11, 10, 1, '#2a2630'); g.rect(4, 12, 4, 1, NEON.yellow); g.rect(9, 12, 3, 1, '#ffffff'); g.rect(4, 13, 7, 1, '#ffffff');   // «GRAN CONCIERTO»
  g.set(12, 14, '#c01868'); g.set(11, 14, '#c01868'); g.set(12, 13, '#c01868');                                          // esquina doblada
  g.rect(3, 1, 10, 1, '#ff7ac0');
  g.set(2, 1, '#efebdc'); g.set(13, 1, '#efebdc'); g.set(2, 14, '#efebdc');                                             // cinta
  g.outline(K);
}));

reg('banderaBlanquiazul', mueble(1, 1, 0, function (g) {
  var x, y;
  g.rect(2, 2, 1, 13, WOO[2]); g.rect(2, 2, 1, 1, '#e0c040'); g.set(3, 14, WOO[0]);
  for (x = 0; x < 11; x++) {
    var wob = Math.round(Math.sin(x * 0.7) * 0.8 + 0.2);
    for (y = 0; y < 8; y++) {
      var c = (x >> 1) % 2 === 0 ? '#2f4fa8' : '#efebdc';
      if (y === 0) c = (x >> 1) % 2 === 0 ? '#4a6fc8' : '#ffffff';
      if (y > 6) c = (x >> 1) % 2 === 0 ? '#243d80' : '#bdb9ab';
      g.set(3 + x, 3 + y + wob, c);
    }
  }
  g.outline(K);
}));

function marco(g, x, y, w, h, C) {   // marco de 2 px: C = [osc, medio, claro, brillo]
  var i, j;
  for (j = 0; j < h; j++) for (i = 0; i < w; i++) {
    if (i > 1 && i < w - 2 && j > 1 && j < h - 2) continue;
    var c = C[1];
    if (j === 0 || i === 0) c = C[3]; else if (j === h - 1 || i === w - 1) c = C[0]; else if (j === 1 || i === 1) c = C[2];
    g.set(x + i, y + j, c);
  }
}
var DORADO = ['#7a5a45', '#c9a040', '#e6c85a', '#fff3c0'];
reg('cuadroGatos', mueble(2, 1, 0, function (g) {
  var x, y;
  marco(g, 1, 1, 30, 14, DORADO);
  for (y = 3; y < 13; y++) for (x = 3; x < 29; x++) g.set(x, y, y < 5 ? '#f0a86a' : y < 7 ? '#e8c08a' : y < 10 ? '#6b9a5a' : '#4a7a48');
  g.disc(24, 5, 1.6, '#f2e63c');                                          // sol
  g.rect(5, 10, 22, 1, WOO[1]); g.rect(5, 9, 22, 1, WOO[2]);              // banca
  g.rect(6, 11, 1, 2, WOO[0]); g.rect(25, 11, 1, 2, WOO[0]);
  // gato naranja
  g.rect(8, 6, 4, 3, '#e0802a'); g.set(8, 5, '#e0802a'); g.set(11, 5, '#e0802a'); g.rect(8, 6, 4, 1, '#f0a050'); g.set(9, 7, K); g.set(11, 7, K); g.rect(12, 7, 1, 2, '#e0802a'); g.set(13, 6, '#e0802a'); g.set(13, 5, '#e0802a');
  // gato gris
  g.rect(15, 6, 4, 3, '#7e868a'); g.set(15, 5, '#7e868a'); g.set(18, 5, '#7e868a'); g.rect(15, 6, 4, 1, '#a4abaa'); g.set(16, 7, K); g.set(18, 7, K); g.rect(19, 8, 2, 1, '#7e868a'); g.set(21, 7, '#7e868a');
  // gatito negro
  g.rect(21, 7, 3, 2, '#2d2a36'); g.set(21, 6, '#2d2a36'); g.set(23, 6, '#2d2a36'); g.set(22, 7, '#f2e63c');
  g.set(14, 12, '#d98a9e'); g.set(15, 12, '#d98a9e'); g.set(8, 12, '#f2e63c');                                           // flores
  g.outline(K);
}));
reg('cuadroMar', mueble(2, 1, 0, function (g) {
  var x, y, F = ['#4a3028', '#6b4223', '#a86e38', '#c99458'];
  marco(g, 1, 1, 30, 14, F);
  for (y = 3; y < 13; y++) for (x = 3; x < 29; x++) {
    var c;
    if (y < 8) { var s = (y + Math.round(Math.sin(x * 0.4) * 0.6)); c = s < 4 ? '#aab0b0' : s < 6 ? '#b9bcb6' : '#c9c5b5'; }
    else c = y < 10 ? '#6b8c9c' : y < 12 ? '#5a7a8a' : '#4c6478';
    g.set(x, y, c);
  }
  for (x = 4; x < 28; x += 3) { g.set(x, 9 + ((x / 3) & 1), '#dbe6da'); g.set(x + 1, 9 + ((x / 3) & 1), '#dbe6da'); g.set(x + 1, 11, '#8fb3be'); }
  g.rect(3, 8, 7, 1, '#6b5a48'); g.rect(3, 9, 5, 4, '#6b5a48'); g.rect(3, 9, 5, 1, '#8a7658'); g.set(4, 7, '#6b5a48');    // acantilado
  // parapente de colores (el unico color del cielo gris)
  g.rect(19, 4, 4, 1, '#e8388a'); g.rect(20, 3, 2, 1, '#f2e63c'); g.set(19, 5, '#2f4470'); g.set(22, 5, '#2f4470'); g.set(21, 6, '#1c1a22');
  g.outline(K);
}));
reg('cuadroFaro', mueble(1, 1, 0, function (g) {
  var x, y;
  marco(g, 1, 1, 14, 14, DORADO);
  for (y = 3; y < 13; y++) for (x = 3; x < 13; x++) g.set(x, y, y < 5 ? '#e8806e' : y < 7 ? '#f0a86a' : y < 10 ? '#f7d6a0' : y < 11 ? '#8a6a8a' : '#2f4470');
  g.disc(5, 8, 1.7, '#fff3c0');                                           // sol bajito
  g.rect(8, 10, 4, 1, '#4a4a58');                                         // malecon
  g.rect(8, 7, 3, 3, '#efebdc'); g.rect(8, 8, 3, 1, '#c8322a'); g.rect(8, 7, 1, 3, '#ffffff'); g.rect(10, 7, 1, 3, '#bdb9ab');     // torre
  g.rect(8, 5, 3, 2, '#f2e63c'); g.rect(8, 4, 3, 1, '#7a1e1e'); g.set(9, 3, '#7a1e1e');                                           // linterna
  g.set(12, 5, '#fff3c0'); g.set(7, 5, '#fff3c0');
  g.outline(K);
}));

/* ---- ADORNOS DE PISO ---- */
reg('baldePlantas', mueble(1, 1, 6, function (g) {
  var x, y;
  sombra(g, 8, 20, 6, 2);
  // balde de pintura (blanco con chorros)
  for (y = 13; y < 20; y++) { var hw = 6 - (y > 17 ? 1 : 0); for (x = 8 - hw; x < 8 + hw; x++) g.set(x, y, x < 5 ? '#efebdc' : x > 10 ? '#8c8a93' : '#d8d4c4'); }
  g.rect(3, 12, 10, 2, '#bdb9ab'); g.rect(3, 12, 10, 1, '#efebdc'); g.rect(2, 12, 1, 2, MET[2]); g.rect(13, 12, 1, 2, MET[2]);
  g.rect(5, 14, 1, 4, '#2f4fa8'); g.rect(9, 14, 1, 3, '#2f4fa8'); g.rect(8, 16, 2, 1, '#2f4fa8'); g.set(6, 15, '#4a6fc8');            // chorreados de pintura azul
  g.line(3, 12, 8, 8, MET[2]); g.line(13, 12, 9, 8, MET[2]);                                                                      // asa
  // tierra y plantas
  g.rect(4, 11, 8, 2, '#4a3f3c');
  var greens = ['#4a8a3a', '#5fa84a', '#7fc060', '#3a6a30'];
  var hojas = [[5, 6, 2], [7, 3, 3], [9, 5, 2], [11, 7, 1], [4, 8, 0], [8, 7, 1], [10, 9, 0], [6, 9, 3]];
  hojas.forEach(function (h) { g.rect(h[0], h[1], 2, 4 + (h[0] % 2), greens[h[2]]); g.set(h[0], h[1], greens[1]); });
  g.set(6, 4, '#7fc060'); g.set(12, 7, '#7fc060');
  g.outline(K);
  sombra(g, 8, 21, 6, 1.2);
}));

reg('macetaLlanta', mueble(1, 1, 4, function (g) {
  var x, y, cols = [NEON.pink, '#efebdc', NEON.yellow, '#efebdc', NEON.cyan, '#efebdc', NEON.green, '#efebdc'];
  sombra(g, 8, 18, 7.5, 2.4);
  g.ell(8, 15, 7.5, 3.6, '#17151b'); g.rect(1, 12, 15, 3, '#17151b');                      // el grosor (flanco de la llanta)
  g.ell(8, 13, 7.5, 4.2, '#2d2a36');
  // aro pintado con dientes de colores
  for (y = 6; y < 20; y++) for (x = 0; x < 16; x++) {
    var dx = (x - 7.5) / 7.5, dy = (y - 12) / 4.2;
    if (dx * dx + dy * dy > 1) continue;
    var ang = Math.atan2(dy, dx), seg = Math.floor(((ang + Math.PI) / (2 * Math.PI)) * 8) % 8;
    var inner = (dx * dx + dy * dy) < 0.5;
    g.set(x, y, inner ? '#4a3f3c' : cols[seg]);
  }
  g.ell(8, 12.6, 4, 2, '#4a3f3c');
  // geranio
  var gr = ['#4a8a3a', '#5fa84a', '#7fc060'];
  g.rect(8, 5, 1, 7, gr[0]);
  [[5, 6], [6, 8], [10, 7], [11, 9], [7, 4], [9, 5]].forEach(function (p, i) { g.rect(p[0], p[1], 3, 2, gr[i % 3]); });
  [[6, 2], [9, 1], [11, 4], [4, 4]].forEach(function (p) { g.rect(p[0], p[1], 2, 2, '#d8324a'); g.set(p[0], p[1], '#ff7a8a'); });
  g.set(8, 3, '#d8324a'); g.set(7, 3, '#ff7a8a');
  g.outline(K);
  sombra(g, 8, 19, 7.5, 1.2);
}));

reg('retablo', mueble(1, 1, 2, function (g) {
  var x, y;
  sombra(g, 8, 16, 7, 2);
  // cajon rojo con friso amarillo
  for (y = 5; y < 16; y++) for (x = 3; x < 13; x++) g.set(x, y, x === 3 ? '#e0584a' : x > 10 ? '#8a2a22' : '#c8322a');
  g.rect(3, 15, 10, 1, '#5a1a18');
  // frontispicio con cruz
  g.rect(4, 3, 8, 2, '#f2c030'); g.rect(5, 2, 6, 1, '#f2c030'); g.rect(7, 0, 2, 3, '#efebdc'); g.rect(6, 1, 4, 1, '#efebdc'); g.set(7, 3, '#2f8a8a'); g.set(10, 3, '#2f8a8a');
  // interior: cielo azul, cerro verde, casita, figuritas
  g.rect(5, 6, 6, 8, '#4a6fc8'); g.rect(5, 6, 6, 1, '#7a92c0'); g.rect(5, 11, 6, 3, '#5fa84a'); g.rect(5, 13, 6, 1, '#3a6a30');
  g.rect(6, 9, 3, 3, '#efebdc'); g.rect(6, 8, 3, 1, '#c8322a'); g.set(7, 10, '#2a2630'); g.set(10, 7, '#f2e63c');
  g.set(9, 12, '#e8388a'); g.set(10, 12, '#f2e63c'); g.set(9, 11, '#ffffff'); g.set(10, 11, '#38c8e8');
  // puertitas abiertas, pintadas
  for (y = 5; y < 15; y++) { g.set(2, y, '#f2c030'); g.set(1, y + ((y > 8) ? 0 : 0), y % 3 === 0 ? '#38c8e8' : '#f2e63c'); g.set(13, y, '#f2c030'); g.set(14, y, y % 3 === 1 ? '#e8388a' : '#f2e63c'); }
  g.set(1, 8, '#e8388a'); g.set(14, 10, '#38c8e8'); g.set(1, 11, '#5fe04a'); g.set(14, 7, '#5fe04a');
  g.outline(K);
  sombra(g, 8, 17, 7, 1.2);
}));

reg('toroPucara', mueble(1, 1, 0, function (g) {
  var x, y, R = '#a63a28', Rd = '#6e2420', Rl = '#d86a48';
  sombra(g, 8, 14, 7, 2);
  // patas
  g.rect(4, 11, 2, 3, Rd); g.rect(7, 11, 2, 3, R); g.rect(11, 11, 2, 3, Rd); g.rect(3, 13, 3, 1, '#2a2630'); g.rect(11, 13, 3, 1, '#2a2630');
  // cuerpo
  g.ell(9, 8, 5.2, 3.4, R); g.ell(8.5, 7, 4, 2, Rl); g.rect(5, 10, 8, 1, Rd);
  // cabeza (a la izquierda) con cachos blancos
  g.ell(3.5, 8, 2.4, 2.4, R); g.rect(1, 9, 2, 2, '#e8c08a'); g.set(2, 10, '#2a2630'); g.set(3, 7, '#ffffff');
  g.line(2, 5, 1, 3, '#efebdc'); g.line(5, 5, 6, 3, '#efebdc'); g.set(2, 6, '#efebdc'); g.set(5, 6, '#efebdc');
  // cola
  g.line(14, 7, 15, 10, Rd);
  // jarrita de chicha sobre el lomo (la tradicion)
  g.rect(8, 3, 3, 3, '#e6c85a'); g.rect(8, 3, 1, 3, '#fff3c0'); g.set(9, 2, '#e6c85a'); g.set(10, 3, '#a88a3c');
  // pintura: lunares y fajas
  [[7, 7], [10, 6], [12, 9], [9, 9]].forEach(function (p) { g.set(p[0], p[1], '#f2e63c'); });
  g.rect(7, 5, 1, 4, '#2f6aa8'); g.rect(11, 5, 1, 4, '#2f6aa8'); g.set(5, 8, '#f2e63c');
  g.outline(K);
  sombra(g, 8, 15, 7, 1.1);
}));

reg('cojines', mueble(1, 1, 0, function (g) {
  var x, y;
  sombra(g, 8, 14, 7.5, 2);
  function coj(x0, y0, w, h, c1, c2, c3) {
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      if ((x === 0 || x === w - 1) && (y === 0 || y === h - 1)) continue;
      var c = c1;
      if (x === 0 || y === 0) c = c3; else if (x === w - 1 || y === h - 1) c = mixc(c1, VIO, 0.4);
      g.set(x0 + x, y0 + y, c);
    }
    var mx = x0 + (w >> 1), my = y0 + (h >> 1);
    g.set(mx, my - 2, c2); g.rect(mx - 1, my - 1, 3, 1, c2); g.rect(mx - 2, my, 5, 1, c2); g.rect(mx - 1, my + 1, 3, 1, c2); g.set(mx, my + 2, c2);   // rombo andino
    g.set(mx, my, c3);
    g.set(x0 - 1, y0 - 1, '#efebdc'); g.set(x0 + w, y0 - 1, '#efebdc'); g.set(x0 - 1, y0 + h, '#efebdc'); g.set(x0 + w, y0 + h, '#efebdc');           // borlitas
  }
  coj(5, 2, 8, 7, '#d8328a', '#f2c030', '#f08ac0');        // el de atras, rosado fucsia
  coj(1, 7, 7, 6, '#2f8a8a', '#f2e63c', '#7ac8c8');        // turquesa
  coj(8, 8, 7, 5, '#e0802a', '#2f4fa8', '#f0b060');        // naranja
  g.outline(K);
  sombra(g, 8, 15, 7.5, 1.1);
}));

/* ---- ALFOMBRAS (huella completa, sin sombra) ---- */
function petateDraw() {
  var g = new Gx(32, 32), r = rngf(909), x, y, Pj = ['#8a7658', '#a5814f', '#c9a66b', '#e0c58d'];
  for (y = 0; y < 32; y++) for (x = 0; x < 32; x++) {
    var bx = x >> 2, by = y >> 2, horiz = ((bx + by) & 1) === 0, c;
    if (horiz) c = (y & 1) ? Pj[1] : Pj[2]; else c = (x & 1) ? Pj[1] : Pj[2];
    if (((x ^ y) & 3) === 0 && r() < 0.3) c = Pj[3];
    if (r() < 0.04) c = Pj[0];
    g.set(x, y, c);
  }
  for (x = 0; x < 32; x++) { g.set(x, 0, Pj[0]); g.set(x, 1, Pj[1]); g.set(x, 30, Pj[0]); g.set(x, 31, '#6b5a48'); g.set(x, 28, '#8f5544'); g.set(x, 3, '#8f5544'); }
  for (y = 0; y < 32; y++) { g.set(0, y, Pj[0]); g.set(1, y, Pj[1]); g.set(30, y, Pj[0]); g.set(31, y, '#6b5a48'); g.set(3, y, '#8f5544'); g.set(28, y, '#8f5544'); }
  [[0, 0], [31, 0], [0, 31], [31, 31], [1, 0], [30, 31], [0, 30], [31, 1]].forEach(function (p) { g.d[p[1] * 32 + p[0]] = undefined; });
  return g;
}
reg('petate', finish(petateDraw(), 16, 32, 2, 2, 0));

function mantaDraw() {
  var g = new Gx(32, 16), x, y, rows = ['#8f2a3a', '#f2c030', '#f2c030', '#2f8aa0', '#e8388a', '#c82a7a', '#c82a7a', '#c82a7a', '#c82a7a', '#c82a7a', '#c82a7a', '#e8388a', '#2f8aa0', '#f2c030', '#f2c030', '#8f2a3a'];
  for (y = 0; y < 16; y++) for (x = 1; x < 31; x++) g.set(x, y, rows[y]);
  for (x = 1; x < 31; x++) { if (x % 3 === 0) { g.set(x, 3, '#38c8e8'); g.set(x, 12, '#38c8e8'); } if (x % 4 === 1) { g.set(x, 1, '#e0802a'); g.set(x, 14, '#e0802a'); } }
  for (var k = 0; k < 4; k++) {                                  // rombos andinos a lo largo
    var cx = 5 + k * 7, cy = 8;
    g.set(cx, cy - 2, '#ff8a2a'); g.rect(cx - 1, cy - 1, 3, 1, '#ff8a2a'); g.rect(cx - 2, cy, 5, 1, '#ff8a2a'); g.rect(cx - 1, cy + 1, 3, 1, '#ff8a2a'); g.set(cx, cy + 2, '#ff8a2a'); g.set(cx, cy, '#f2e63c'); g.rect(cx - 1, cy, 1, 1, '#ffd24a'); g.rect(cx + 1, cy, 1, 1, '#ffd24a');
  }
  for (y = 0; y < 16; y++) { g.set(0, y, y % 2 ? '#efebdc' : '#e0c58d'); g.set(31, y, y % 2 ? '#e0c58d' : '#efebdc'); }      // flecos
  g.d[0] = undefined; g.d[31] = undefined; g.d[15 * 32] = undefined; g.d[15 * 32 + 31] = undefined;
  for (x = 1; x < 31; x++) g.set(x, 15, mixc(rows[15], VIO, 0.3));
  return g;
}
reg('mantaAndina', finish(mantaDraw(), 16, 16, 2, 1, 0));
reg('mantaAndina_r', finish(mantaDraw().rot90(), 8, 32, 1, 2, 0));

/* ============================ HALOS DE LUZ ============================ */
/* Lienzo de (2r x 2r), centro en (r, r). Alfa 0..235 en 8 escalones (pixel art), color del catalogo que se aclara al centro.
   Sirve tanto para 'destination-out' (sacar oscuridad) como para 'lighter'/'screen' (teñir). */
function halo(r, color) {
  var S = r * 2, c = mkCanvas(S, S), ctx = c.getContext('2d'), img = ctx.createImageData(S, S), d = img.data, rgb = h2r(color), LV = 8, x, y;
  for (y = 0; y < S; y++) for (x = 0; x < S; x++) {
    var dx = x + 0.5 - r, dy = y + 0.5 - r, dist = Math.sqrt(dx * dx + dy * dy) / r;
    if (dist >= 1) continue;
    var t = 1 - dist; t = t * t * (3 - 2 * t);
    var a = Math.ceil(t * LV) / LV, w = Math.pow(t, 3) * 0.55, o = (y * S + x) * 4;
    d[o] = rgb[0] + (255 - rgb[0]) * w; d[o + 1] = rgb[1] + (255 - rgb[1]) * w; d[o + 2] = rgb[2] + (255 - rgb[2]) * w; d[o + 3] = Math.round(a * 235);
  }
  ctx.putImageData(img, 0, 0);
  c.r = r; c.ax = r; c.ay = r;
  return c;
}
var luz = B.luz = {};
var CAT = ACH.base && ACH.base.CATALOGO;
function luzDe(id, r0, c0) {
  var e = CAT && CAT[id] && CAT[id].luz, r = e ? e.r : r0, col = e ? e.c : c0;
  luz[id] = halo(r, col);
}
luzDe('foco', 56, '#ffe7a8'); luzDe('lamparin', 48, '#ffb14a'); luzDe('guirnalda', 44, '#ff6ad5');
luz.guirnalda2 = halo(luz.guirnalda.r, '#6affc8');           // el otro cuadro del parpadeo: verde agua

/* ============================ v0.13 T2 (agente P · G3/G4) ============================
 * MESA DE LUTHIER (piso 2x1, 32x28 up 12): banco con una guitarra a medio arreglar en la prensa, rollo de cuerdas, cinta y herramientas.
 * B.concierto = { tarima, parlante, microfono, setlist, ampli, <id>_tiza }  el escenario del cuarto (base.js lo pone en una esquina, 3x1 tiles).
 *   tarima 48x14: palé con tablas; .top = 9 (px desde abajo hasta donde se paran las piezas). Piezas: ancla centro-abajo (.ax, .ay = alto).
 *   <id>_tiza: la misma silueta en tiza punteada (la pieza que falta). */
var gw = new Gx(32, 28);
(function (g) {
  var x, y;
  sombra(g, 17, 26, 15, 2.2);
  // tablero (cara de arriba) y canto
  for (y = 9; y < 15; y++) for (x = 1; x < 31; x++) g.set(x, y, y === 9 || x === 1 ? WOO[3] : (x + y * 3) % 11 === 0 ? WOO[1] : WOO[2]);
  for (y = 15; y < 18; y++) for (x = 1; x < 31; x++) g.set(x, y, y === 15 ? WOO[2] : WOO[1]);
  g.rect(1, 18, 30, 1, WOO[0]);
  // patas y travesaño
  g.rect(2, 18, 3, 8, WOO[1]); g.rect(27, 18, 3, 8, WOO[1]); g.set(2, 18, WOO[2]); g.set(27, 18, WOO[2]);
  g.rect(5, 22, 22, 2, WOO[0]);
  // guitarra en la prensa (cuerpo de lado, diapasón hacia la derecha)
  g.ell(9, 8, 6, 4, '#c47a32'); g.ell(9, 8, 4, 2.6, '#e09a48'); g.disc(9, 8, 1.4, '#3a2418');
  g.rect(14, 7, 13, 2, '#6b3a1d'); g.rect(26, 6, 3, 4, '#4a2a18');
  for (x = 15; x < 26; x += 3) g.set(x, 7, '#cfd3cc');
  g.line(6, 7, 26, 7, '#e8e2d4'); g.line(6, 9, 26, 8, '#b4b0a4');            // cuerdas
  // prensa de fierro
  g.rect(12, 3, 2, 8, MET[2]); g.rect(11, 3, 4, 1, MET[3]); g.rect(12, 11, 2, 2, MET[1]); g.set(11, 2, MET[4]);
  // rollo de cuerdas, cinta de embalaje, desarmador
  g.disc(22, 12, 2, '#a4abaa'); g.set(22, 12, '#3b4250');
  g.ell(5, 13, 2.2, 1.4, '#c9a66b'); g.set(5, 13, '#8a6a3a');
  g.line(25, 13, 29, 12, MET[3]); g.set(25, 13, NEON.yellow); g.set(26, 13, NEON.yellow);
  // trapito rosado colgando del canto
  g.rect(17, 15, 3, 4, '#c8708a'); g.set(18, 19, '#c8708a');
  g.outline(K);
})(gw);
reg('mesaLuthier', finish(gw, 16, 28, 2, 1, 12));

var CN = B.concierto = {};
function chalk(c0) {   // silueta de tiza punteada de un Gx
  var g = new Gx(c0.w, c0.h), x, y;
  for (y = 0; y < c0.h; y++) for (x = 0; x < c0.w; x++) {
    if (!c0.get(x, y)) continue;
    var edge = !c0.get(x - 1, y) || !c0.get(x + 1, y) || !c0.get(x, y - 1) || !c0.get(x, y + 1);
    if (edge && (x + y) % 2 === 0) g.set(x, y, '#d8d4c4b0');
  }
  return g;
}
function pieza(id, w, h, fn) {
  var g = new Gx(w, h); fn(g); g.outline(K);
  CN[id] = finish(g, Math.floor(w / 2), h, 1, 1, 0);
  CN[id + '_tiza'] = finish(chalk(g), Math.floor(w / 2), h, 1, 1, 0);
}
(function () {
  var g = new Gx(48, 14), x, y;
  sombra(g, 24, 13, 23, 1.6);
  for (y = 2; y < 6; y++) for (x = 1; x < 47; x++) g.set(x, y, y === 2 ? WOO[3] : (x % 8 === 0) ? WOO[1] : WOO[2]);   // tablas de arriba
  for (y = 6; y < 12; y++) for (x = 1; x < 47; x++) g.set(x, y, (y === 6 || y === 9) ? WOO[1] : (x % 12 < 3 ? WOO[1] : '#2a1e1a'));   // palé visto de frente
  for (x = 4; x < 46; x += 7) g.set(x, 3, NEON.pink);                                                // cinta rosada de fiesta en el borde
  g.outline(K);
  CN.tarima = finish(g, 24, 14, 3, 1, 0, { top: 9 });
})();
pieza('parlante', 12, 18, function (g) {
  g.rect(1, 1, 10, 17, '#2a2830'); g.rect(1, 1, 10, 1, '#4a4652');
  g.disc(6, 5, 2.4, '#5a5662'); g.disc(6, 5, 1, '#8c8494');
  g.disc(6, 12, 3.6, '#5a5662'); g.disc(6, 12, 2, '#3e3a44'); g.set(6, 12, '#8c8494');
  g.rect(4, 0, 4, 1, '#5a5662');                                                                     // asa
  g.set(2, 16, NEON.green);                                                                          // foquito
});
pieza('microfono', 8, 22, function (g) {
  g.line(1, 21, 4, 17, MET[2]); g.line(7, 21, 4, 17, MET[2]); g.rect(4, 17, 1, 5, MET[1]);       // trípode
  g.rect(4, 5, 1, 13, MET[3]);                                                                      // parante
  g.rect(3, 1, 3, 4, '#a4abaa'); g.set(3, 1, '#cfd3cc'); g.set(5, 4, MET[1]); g.set(4, 2, MET[1]);   // micro
  g.rect(3, 5, 3, 1, '#2a2830');
});
pieza('setlist', 10, 16, function (g) {
  g.rect(5, 8, 1, 7, MET[1]); g.line(2, 15, 5, 13, MET[1]); g.line(8, 15, 5, 13, MET[1]);           // atril
  g.rect(1, 1, 9, 8, '#e8e2d4'); g.rect(1, 8, 9, 1, MET[2]);                                         // hoja
  for (var y = 2; y < 8; y += 2) g.rect(2, y, 5 + (y % 4 ? 1 : -1), 1, '#9a8e7a');
  g.set(7, 2, '#c0463e'); g.set(8, 3, '#c0463e'); g.set(3, 6, '#8a4a7a');                          // manchas de chicha morada
});
pieza('ampli', 14, 12, function (g) {
  g.rect(1, 1, 12, 11, '#b8742e'); g.rect(1, 1, 12, 1, '#d8944a');
  g.rect(2, 2, 10, 2, '#2a2830'); for (var x = 3; x < 12; x += 2) g.set(x, 3, NEON.yellow);        // perillas
  g.rect(2, 5, 10, 6, '#34303a'); for (var y = 6; y < 11; y += 2) g.rect(3, y, 8, 1, '#5a5662');    // rejilla
  g.set(11, 1, '#e8e2d4');
});

/* ============================ API DE AYUDA ============================ */
/* B.get(id, {rot, on, frame, sonando, titina}) -> el lienzo que toca (o null). */
B.get = function (id, o) {
  o = o || {};
  var k = id;
  if (o.rot && M[id + '_r']) k = id + '_r';
  else if (o.titina && M[id + '_titina']) k = id + '_titina';
  else if (o.sonando && M[id + '_sonando']) k = id + '_sonando';
  else if (o.on) k = (o.frame === 2 && M[id + '_on2']) ? id + '_on2' : (M[id + '_on'] ? id + '_on' : id);
  return M[k] || M[id] || null;
};
B.ids = Object.keys(M);
B.tile = TILE;
B.listo = true;
})();
