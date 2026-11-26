/* ACHORADO - js/sprites/base.js  (v0.4, fase A1)
 * Dueño: sprites (base).  Se carga ANTES de js/sprites.js.
 * Define window.ACH.px: la caja de herramientas de pixel art compartida por todos los archivos de sprites.
 *   G            clase de rejilla de pixeles (la misma de sprites.js, movida aqui) + toCanvas rapido con ImageData
 *   RAMPS, PAL   rampas de color (revision 5.2) y acentos
 *   fonts        a5 (3x5), a7 (5x7), a12 (9x12)   -> text(g, str, x, y, opts), measure(str, font, scale)
 *   rot90, flipH, shadowSE, rng, hex2rgb, rgb2hex, shade, mix
 *   placeholderLot(ficha)
 * Y en ACH.sprites: lotArch = {} (los archivos de edificios registran arquetipos) y buildLot(ficha).
 * Script clasico, sin modulos. Funciona desde file://.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px = ACH.px || {};
ACH.sprites = ACH.sprites || {};

/* ======================== COLOR ======================== */
function hex2rgb(h) {
  if (h.length === 4) return [parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16), parseInt(h[3] + h[3], 16)];
  return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
}
function rgb2hex(a) { return '#' + a.map(function (v) { return ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2); }).join(''); }
function shade(h, f) { return rgb2hex(hex2rgb(h).map(function (v) { return v * f; })); }
function mix(a, b, t) { var A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map(function (v, i) { return v + (B[i] - v) * t; })); }

/* RGBA de un color CSS para el camino rapido de ImageData. Solo hex; lo demas devuelve null (cae al fillRect). */
var rgbaCache = {};
function parseHex(c) {
  var r = rgbaCache[c];
  if (r !== undefined) return r;
  r = null;
  if (typeof c === 'string' && c.charAt(0) === '#') {
    var n = c.length;
    if (n === 7 || n === 9) { var v = hex2rgb(c); r = [v[0], v[1], v[2], n === 9 ? parseInt(c.substr(7, 2), 16) : 255]; }
    else if (n === 4) { var w = hex2rgb(c); r = [w[0], w[1], w[2], 255]; }
    if (r && (isNaN(r[0]) || isNaN(r[1]) || isNaN(r[2]) || isNaN(r[3]))) r = null;
  }
  rgbaCache[c] = r;
  return r;
}

/* ======================== G: REJILLA DE PIXELES ======================== */
/* Movida desde sprites.js sin cambiar su API. outline() usa por defecto el negro de contorno '#141216' (P.k). */
function G(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); this.eyes = []; }
G.prototype = {
  constructor: G,
  set: function (x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; },
  get: function (x, y) { return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.d[y * this.w + x] : null; },
  rect: function (x, y, w, h, c) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.set(x + i, y + j, c); },
  line: function (x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    var e = dx + dy;
    for (var n = 0; n < 400; n++) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  },
  disc: function (cx, cy, r, c) {
    for (var y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (var x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) this.set(x, y, c);
  },
  ell: function (cx, cy, rx, ry, c) {
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        var dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
  },
  outline: function (c) {
    c = c || '#141216';
    var add = [];
    for (var y = 0; y < this.h; y++) for (var x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push([x, y]);
    }
    for (var i = 0; i < add.length; i++) this.set(add[i][0], add[i][1], c);
    return this;
  },
  flip: function () {
    var n = new G(this.w, this.h);
    for (var y = 0; y < this.h; y++) for (var x = 0; x < this.w; x++) n.d[y * this.w + (this.w - 1 - x)] = this.d[y * this.w + x];
    return n;
  },
  blit: function (src, ox, oy) {
    for (var y = 0; y < src.h; y++) for (var x = 0; x < src.w; x++) {
      var c = src.d[y * src.w + x];
      if (c) this.set(x + ox, y + oy, c);
    }
    return this;
  },
  solid: function (c) { var n = new G(this.w, this.h); n.d = this.d.map(function (v) { return v ? c : null; }); return n; },
  draw: function (ctx, ox, oy) {
    ox = Math.round(ox); oy = Math.round(oy);
    for (var y = 0; y < this.h; y++) for (var x = 0; x < this.w; x++) {
      var c = this.d[y * this.w + x];
      if (c) { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, 1, 1); }
    }
  },
  /* Nuevo: G -> canvas. Hasta 64x64 pinta con fillRect (identico a draw()); mas grande usa ImageData.
     ax, ay, fw, fh opcionales: se guardan como propiedades del canvas (ancla y huella). */
  toCanvas: function (ax, ay, fw, fh) {
    var c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    var ctx = c.getContext('2d');
    if (this.w * this.h > 4096) {
      var img = ctx.createImageData(this.w, this.h), buf = img.data, rest = null, n = this.w * this.h;
      for (var i = 0; i < n; i++) {
        var col = this.d[i];
        if (!col) continue;
        var q = parseHex(col);
        if (q) { var o = i * 4; buf[o] = q[0]; buf[o + 1] = q[1]; buf[o + 2] = q[2]; buf[o + 3] = q[3]; }
        else (rest = rest || []).push(i);
      }
      ctx.putImageData(img, 0, 0);
      if (rest) for (var k = 0; k < rest.length; k++) { ctx.fillStyle = this.d[rest[k]]; ctx.fillRect(rest[k] % this.w, (rest[k] / this.w) | 0, 1, 1); }
    } else this.draw(ctx, 0, 0);
    if (ax !== undefined) { c.ax = ax; c.ay = ay; }
    if (fw !== undefined) { c.fw = fw; c.fh = fh; }
    return c;
  }
};
/* G.fromRows(['#.#', ...], {'#': '#fff'}) -> G. Caracteres sin entrada en el mapa quedan vacios; si no hay mapa, '#' = color 'c'. */
G.fromRows = function (rows, map, c) {
  var w = 0, i;
  for (i = 0; i < rows.length; i++) w = Math.max(w, rows[i].length);
  var g = new G(w, rows.length);
  for (var y = 0; y < rows.length; y++) for (var x = 0; x < rows[y].length; x++) {
    var ch = rows[y][x], v = map ? map[ch] : (ch === '#' ? (c || '#ffffff') : null);
    if (v) g.d[y * w + x] = v;
  }
  return g;
};

/* ======================== RNG ======================== */
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ======================== RAMPAS (revision 5.2) ======================== */
/* Orden de cada rampa: [sombra profunda, sombra, base, luz, brillo]  (algunas tienen 3 o 4 pasos).
   Regla: se baja o sube un paso de la rampa; nunca shade() sobre superficies grandes. */
var RAMPS = {
  brick:     ['#4a2c33', '#6e3f3a', '#8f5544', '#a86a50', '#c08a68'],
  concrete:  ['#45434f', '#66656b', '#8a8884', '#a9a79b', '#c9c5b5'],
  asphalt:   ['#24252e', '#33353d', '#44474d', '#575a5c', '#6f7170'],
  paintWhite:['#6b6c70', '#8f8f8a', '#b9b49c', '#d6d1b8'],
  curbYellow:['#7a6430', '#a88a3c', '#d2b24a', '#e6d27a'],
  dirt:      ['#4a3f3c', '#6b5a48', '#8a7658', '#a8956e'],
  celeste:   ['#4c6478', '#6b8c9c', '#8fb3be', '#b4d0d0', '#dbe6da'],
  menta:     ['#4f6a66', '#74917f', '#9db59e', '#c0d1b4', '#e0e6cc'],
  durazno:   ['#8c5f5c', '#b88670', '#e0b79a', '#efd3b4', '#f7e8cf'],
  ocre:      ['#7a5a45', '#a5814f', '#c9a66b', '#e0c58d'],
  rosado:    ['#7d4a66', '#b06a85', '#d98a9e', '#ecb1b5', '#f7d6cf'],
  metal:     ['#3b4250', '#5c6570', '#7e868a', '#a4abaa', '#cfd3cc'],
  rust:      ['#4a2a2a', '#6f3b2e', '#8a4b38', '#b06a3e'],
  wood:      ['#4a3028', '#6b4223', '#a86e38', '#c99458'],
  glass:     ['#1c2530', '#2d3d4a', '#4d6676', '#8fb0b8'],
  veg:       ['#2f3d3a', '#4a5a44', '#6b7a4f', '#94975e'],
  skin:      ['#5c3a36', '#80523a', '#a8714c', '#c48f63', '#dcae80'],
  zombie:    ['#3f4a44', '#5f6b55', '#7f8c71', '#a3ad8a'],
  blood:     ['#3a1518', '#5b1d1d', '#7a2a26'],
  salitre:   ['#a8a59c', '#c9c5b5', '#e2dfd2'],
  /* Derivadas por el toolkit (no estan en 5.2; las piden los lotes de la revision 3.4). Misma logica violeta -> calido. */
  blanco:    ['#5f5d6b', '#8c8a93', '#bdb9ab', '#d8d4c4', '#efebdc'],   // pared pintada blanca (botica, frigorifico)
  botella:   ['#1f3a36', '#2f5a52', '#3f7266', '#5a8f80'],             // verde botella
  azulNoche: ['#1d2a48', '#2f4470', '#4a6498', '#7a92c0']              // fondo de mural y banda azul
};
/* Las seis familias de pared pintada */
RAMPS.walls = { celeste: RAMPS.celeste, menta: RAMPS.menta, durazno: RAMPS.durazno, ocre: RAMPS.ocre, rosado: RAMPS.rosado, blanco: RAMPS.blanco };
/* Nombre de color de una ficha -> rampa. Acepta los nombres de la revision (ladrillo, cemento, gris, verde...). */
var WALL_ALIAS = { ladrillo: 'brick', cemento: 'concrete', gris: 'concrete', concreto: 'concrete', verde: 'botella', azul: 'azulNoche',
  rojo: 'brick', calamina: 'metal', crema: 'blanco', salmon: 'durazno', rosa: 'rosado' };
function wallRamp(name) { return RAMPS[WALL_ALIAS[name] || name] || RAMPS.concrete; }
function ramp(name, i) { var r = wallRamp(name); return i === undefined ? r : r[Math.max(0, Math.min(r.length - 1, i))]; }

var PAL = {
  outline: '#1c1a22', outlineG: '#141216',               // contorno general / el de G.outline()
  neonPink: '#e8388a', neonYellow: '#f2e63c', neonGreen: '#5fe04a', neonOrange: '#ff8a2a', neonCyan: '#38c8e8',
  lamp: '#ffcf8a', fluor: '#cfe8e0',
  cream: '#f3efe2', rustRed: '#8f3a32', navy: '#2f4470', bottle: '#2f5a52', sign: '#e6c85a', black: '#1c1a22',
  shadow: '#2a2440'                                        // violeta oscuro de las sombras (nunca negro)
};

/* ======================== FUENTES BITMAP ======================== */
/* Cada fuente: { h (alto de letra), step (paso nominal), gap (espacio entre letras), g: {car: filas '#'/'.'}, marks: {acute, tilde, dia} }
   Una marca es una lista de [dx, dy] relativa a la esquina superior izquierda de la letra (dy negativo = por encima).
   Las mayusculas acentuadas usan la letra base + marca; minusculas se tratan como mayusculas. Las marcas necesitan `top` filas libres arriba. */
var ACCENT = {
  'Á': ['A', 'acute'], 'É': ['E', 'acute'], 'Í': ['I', 'acute'], 'Ó': ['O', 'acute'], 'Ú': ['U', 'acute'],
  'Ü': ['U', 'dia'], 'Ñ': ['N', 'tilde']
};

/* ---- a5: 3x5, paso 4. Completa el FONT de v0.3. Acentos = punto alto (2 filas libres arriba). ---- */
var A5 = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'], Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'], W: ['#.#', '#.#', '###', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
  0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'],
  3: ['##.', '..#', '.#.', '..#', '##.'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'],
  6: ['.##', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'], 8: ['###', '#.#', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '##.'], '.': ['...', '...', '...', '...', '.#.'], '-': ['...', '...', '###', '...', '...'],
  '*': ['...', '#.#', '.#.', '#.#', '...'], ' ': ['...', '...', '...', '...', '...'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'], '¡': ['.#.', '...', '.#.', '.#.', '.#.'], '?': ['##.', '..#', '.#.', '...', '.#.'],
  '/': ['..#', '..#', '.#.', '#..', '#..'], '$': ['.##', '##.', '.#.', '.##', '##.'], ',': ['...', '...', '...', '.#.', '#..'],
  ':': ['...', '.#.', '...', '.#.', '...'], "'": ['.#.', '.#.', '...', '...', '...'], '+': ['...', '.#.', '###', '.#.', '...'],
  '(': ['.#.', '#..', '#..', '#..', '.#.'], ')': ['.#.', '..#', '..#', '..#', '.#.'], '%': ['#.#', '..#', '.#.', '#..', '#.#'],
  '&': ['.#.', '#.#', '.##', '#.#', '.##'], '#': ['#.#', '###', '#.#', '###', '#.#'], '=': ['...', '###', '...', '###', '...']
};

/* ---- a7: 5x7, paso 6, trazo de 1 px con remates de brocha (I, J, L, Z, 1...). Acentos arriba: 2 filas libres. ---- */
var A7 = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '..#..', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  ',': ['..', '..', '..', '..', '..', '.#', '#.'],
  '!': ['#', '#', '#', '#', '#', '.', '#'],
  '¡': ['#', '.', '#', '#', '#', '#', '#'],
  '?': ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'],
  '-': ['...', '...', '...', '###', '...', '...', '...'],
  ':': ['.', '.', '#', '.', '.', '#', '.'],
  "'": ['#', '#', '.', '.', '.', '.', '.'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '$': ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '&': ['.##..', '#..#.', '.##..', '.#.#.', '#..##', '#..#.', '.##.#'],
  '(': ['.#', '#.', '#.', '#.', '#.', '#.', '.#'], ')': ['#.', '.#', '.#', '.#', '.#', '.#', '#.']
};

/* ---- a12: 9x12, trazo de 2 px, estilo chicha (redondeado y pesado). Se generan de trazos con pincel de 2x2. ----
   Segmentos en coordenadas 0..7 (x) y 0..10 (y): el pincel cubre (x..x+1, y..y+1) => celda de 9x12.
   H(y,a,b) horizontal, V(x,a,b) vertical, L(x0,y0,x1,y1) diagonal, P(x,y) punto. */
function H(y, a, b) { return [a, y, b, y]; }
function V(x, a, b) { return [x, a, x, b]; }
function L(x0, y0, x1, y1) { return [x0, y0, x1, y1]; }
function P(x, y) { return [x, y, x, y]; }
var A12DEF = {
  A: [9, [V(0, 2, 10), V(7, 2, 10), H(0, 2, 5), P(1, 1), P(6, 1), H(5, 1, 6)]],
  B: [9, [V(0, 0, 10), H(0, 0, 5), H(5, 0, 5), H(10, 0, 5), P(6, 1), V(7, 2, 3), P(6, 4), P(6, 6), V(7, 7, 8), P(6, 9)]],
  C: [9, [H(0, 2, 7), H(10, 2, 7), V(0, 2, 8), P(1, 1), P(1, 9), V(7, 0, 2), V(7, 8, 10)]],
  D: [9, [V(0, 0, 10), H(0, 0, 4), H(10, 0, 4), P(5, 1), P(6, 2), V(7, 3, 7), P(6, 8), P(5, 9)]],
  E: [9, [V(0, 0, 10), H(0, 0, 7), H(5, 0, 5), H(10, 0, 7)]],
  F: [9, [V(0, 0, 10), H(0, 0, 7), H(5, 0, 5)]],
  G: [9, [H(0, 2, 7), V(7, 0, 2), V(0, 2, 8), P(1, 1), P(1, 9), H(10, 2, 5), P(6, 9), V(7, 6, 8), H(5, 4, 7)]],
  H: [9, [V(0, 0, 10), V(7, 0, 10), H(5, 0, 7)]],
  I: [9, [H(0, 0, 7), H(10, 0, 7), V(3, 0, 10)]],
  J: [9, [H(0, 2, 7), V(6, 0, 8), P(5, 9), H(10, 1, 4), V(0, 7, 8)]],
  K: [9, [V(0, 0, 10), L(7, 0, 1, 5), L(1, 5, 7, 10)]],
  L: [9, [V(0, 0, 10), H(10, 0, 7)]],
  M: [9, [V(0, 0, 10), V(7, 0, 10), L(1, 1, 3, 6), L(6, 1, 4, 6)]],
  N: [9, [V(0, 0, 10), V(7, 0, 10), L(1, 1, 6, 9)]],
  O: [9, [H(0, 2, 5), H(10, 2, 5), V(0, 2, 8), V(7, 2, 8), P(1, 1), P(6, 1), P(1, 9), P(6, 9)]],
  P: [9, [V(0, 0, 10), H(0, 0, 5), H(5, 0, 5), P(6, 1), V(7, 2, 3), P(6, 4)]],
  Q: [9, [H(0, 2, 5), H(10, 2, 4), V(0, 2, 8), V(7, 2, 8), P(1, 1), P(6, 1), P(1, 9), L(4, 7, 7, 10)]],
  R: [9, [V(0, 0, 10), H(0, 0, 5), H(5, 0, 5), P(6, 1), V(7, 2, 3), P(6, 4), L(3, 6, 7, 10)]],
  S: [9, [H(0, 2, 7), V(0, 1, 3), P(1, 4), H(5, 1, 6), V(7, 6, 8), H(10, 0, 5), P(6, 9), P(1, 1)]],
  T: [9, [H(0, 0, 7), V(3, 0, 10)]],
  U: [9, [V(0, 0, 8), V(7, 0, 8), H(10, 2, 5), P(1, 9), P(6, 9)]],
  V: [9, [L(0, 0, 3, 10), L(7, 0, 4, 10)]],
  W: [9, [V(0, 0, 9), V(7, 0, 9), P(1, 10), P(6, 10), V(3, 3, 9), H(10, 1, 2), H(10, 5, 6)]],
  X: [9, [L(0, 0, 7, 10), L(7, 0, 0, 10)]],
  Y: [9, [L(0, 0, 3, 5), L(7, 0, 4, 5), V(3, 5, 10)]],
  Z: [9, [H(0, 0, 7), H(10, 0, 7), L(7, 1, 0, 9)]],
  0: [9, [H(0, 2, 5), H(10, 2, 5), V(0, 2, 8), V(7, 2, 8), P(1, 1), P(6, 1), P(1, 9), P(6, 9), L(3, 7, 4, 3)]],
  1: [9, [V(4, 0, 10), P(3, 1), P(2, 2), H(10, 1, 7)]],
  2: [9, [H(0, 2, 5), P(1, 1), P(0, 2), P(6, 1), V(7, 2, 3), P(6, 4), L(5, 5, 0, 9), H(10, 0, 7)]],
  3: [9, [H(0, 0, 6), P(6, 1), V(7, 2, 3), P(6, 4), H(5, 2, 5), P(6, 6), V(7, 7, 8), P(6, 9), H(10, 0, 6)]],
  4: [9, [V(5, 0, 10), L(5, 0, 0, 6), H(7, 0, 7)]],
  5: [9, [H(0, 0, 7), V(0, 0, 5), H(5, 0, 5), P(6, 6), V(7, 7, 8), P(6, 9), H(10, 0, 5)]],
  6: [9, [H(0, 2, 6), P(1, 1), V(0, 2, 8), P(1, 9), H(10, 2, 5), P(6, 9), V(7, 6, 8), P(6, 5), H(5, 1, 5)]],
  7: [9, [H(0, 0, 7), L(7, 1, 3, 10)]],
  8: [9, [H(0, 2, 5), P(1, 1), P(6, 1), V(0, 2, 3), V(7, 2, 3), P(1, 4), P(6, 4), H(5, 2, 5), P(1, 6), P(6, 6), V(0, 7, 8), V(7, 7, 8), P(1, 9), P(6, 9), H(10, 2, 5)]],
  9: [9, [H(0, 2, 5), P(1, 1), P(6, 1), V(0, 2, 3), V(7, 2, 8), P(6, 9), H(10, 2, 5), P(1, 4), H(5, 2, 5), V(0, 7, 9)]],
  ' ': [6, []],
  '.': [2, [P(0, 9)]],
  ',': [3, [P(1, 8), L(1, 10, 0, 11)]],
  '!': [2, [V(0, 0, 6), P(0, 9)]],
  '¡': [2, [P(0, 0), V(0, 3, 9)]],
  '?': [8, [H(1, 0, 5), V(0, 1, 2), V(6, 1, 3), P(5, 4), P(4, 5), V(3, 6, 7), P(3, 10)]],
  '-': [7, [H(5, 0, 5)]],
  ':': [2, [P(0, 2), P(0, 8)]],
  "'": [2, [V(0, 0, 2)]],
  '/': [7, [L(5, 0, 0, 10)]],
  '$': [9, [H(1, 2, 7), V(0, 1, 3), P(1, 4), H(5, 1, 6), V(7, 6, 8), H(9, 0, 5), P(1, 1), V(3, 0, 10)]]
};
function stampBrush(set, x0, y0, x1, y1) {          // pincel de 2x2 a lo largo de una linea de Bresenham
  var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, e = dx + dy;
  for (var n = 0; n < 100; n++) {
    set(x0, y0); set(x0 + 1, y0); set(x0, y0 + 1); set(x0 + 1, y0 + 1);
    if (x0 === x1 && y0 === y1) break;
    var e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}
function genA12() {
  var out = {};
  Object.keys(A12DEF).forEach(function (ch) {
    var w = A12DEF[ch][0], segs = A12DEF[ch][1], rows = [], y;
    for (y = 0; y < 12; y++) rows.push(new Array(w + 1).join('.').split(''));
    segs.forEach(function (s) {
      stampBrush(function (x, y) { if (x >= 0 && x < w && y >= 0 && y < 12) rows[y][x] = '#'; }, s[0], s[1], s[2], s[3]);
    });
    out[ch] = rows.map(function (r) { return r.join(''); });
  });
  return out;
}

var FONTS = {
  a5:  { name: 'a5', h: 5, cellW: 3, step: 4, gap: 1, top: 2, g: A5,
         marks: { acute: [[2, -2]], tilde: [[0, -2], [1, -2]], dia: [[0, -2], [2, -2]] } },
  a7:  { name: 'a7', h: 7, cellW: 5, step: 6, gap: 1, top: 2, g: A7,
         marks: { acute: [[3, -2]], tilde: [[1, -2], [2, -2], [4, -2]], dia: [[1, -2], [3, -2]] } },
  a12: { name: 'a12', h: 12, cellW: 9, step: 11, gap: 2, top: 3, g: null,
         marks: { acute: [[5, -3], [6, -3], [4, -2], [5, -2]], tilde: [[1, -3], [2, -3], [3, -3], [5, -2], [6, -2], [7, -2]], dia: [[1, -3], [2, -3], [5, -3], [6, -3], [1, -2], [2, -2], [5, -2], [6, -2]] } }
};
FONTS.a12.g = genA12();

/* Descompone un caracter -> { rows, w, mark } o null si no existe */
function glyphOf(font, ch) {
  var up = ch.toUpperCase();
  if (up === 'ß') up = 'SS';
  var base = up, mark = null;
  if (ACCENT[up]) { base = ACCENT[up][0]; mark = ACCENT[up][1]; }
  var rows = font.g[base];
  if (!rows) return null;
  return { rows: rows, w: rows[0].length, mark: mark };
}
function fontOf(f) { return typeof f === 'string' ? (FONTS[f] || FONTS.a5) : (f || FONTS.a5); }

/* Ancho en px del texto (sin sombra ni contorno), con escala. Letras desconocidas cuentan como espacio. */
function measure(str, font, scale) {
  font = fontOf(font); scale = scale || 1;
  var w = 0, n = 0;
  for (var k = 0; k < str.length; k++) {
    var gl = glyphOf(font, str[k]);
    w += (gl ? gl.w : font.g[' '][0].length) + font.gap; n++;
  }
  return n ? (w - font.gap) * scale : 0;
}
/* Alto de una letra (sin marcas) y filas libres que piden las marcas, ya multiplicados por la escala. */
function fontInfo(font, scale) { font = fontOf(font); scale = scale || 1; return { h: font.h * scale, top: font.top * scale, step: font.step * scale, name: font.name }; }

/* text(g, str, x, y, {font:'a5'|'a7'|'a12', ink, shadow, outline, scale, align:'l'|'c'|'r'})
   (x, y) = esquina superior izquierda de la caja de la letra (con align 'c'/'r', x es el centro/el borde derecho).
   Las tildes y la virgulilla se pintan en filas por encima de y (font.top filas, con 1 fila de aire).
   shadow: color de 1 px abajo a la derecha. outline: color de 1 px alrededor (la sombra sale del contorno). Devuelve el x final. */
function text(g, str, x, y, o) {
  o = o || {};
  var font = fontOf(o.font), s = Math.max(1, o.scale | 0 || 1), ink = o.ink || '#f3efe2';
  var total = measure(str, font, s);
  if (o.align === 'c') x -= Math.floor(total / 2); else if (o.align === 'r') x -= total;
  x = Math.round(x); y = Math.round(y);
  // 1) mascara de tinta en coordenadas absolutas (Set de claves) -> arreglo de pixeles
  var pts = [], cx = x;
  function put(px_, py_) { for (var j = 0; j < s; j++) for (var i = 0; i < s; i++) pts.push([px_ + i, py_ + j]); }
  for (var k = 0; k < str.length; k++) {
    var gl = glyphOf(font, str[k]);
    if (!gl) { cx += (font.g[' '][0].length + font.gap) * s; continue; }
    for (var r = 0; r < gl.rows.length; r++) for (var c = 0; c < gl.w; c++) if (gl.rows[r][c] === '#') put(cx + c * s, y + r * s);
    if (gl.mark) {
      var mk = font.marks[gl.mark], off = font.name === 'a12' ? Math.floor((gl.w - 9) / 2) : 0;
      for (var m = 0; m < mk.length; m++) put(cx + (mk[m][0] + off) * s, y + mk[m][1] * s);
    }
    cx += (gl.w + font.gap) * s;
  }
  var key = function (px_, py_) { return px_ + ',' + py_; };
  var inkSet = {}, i;
  for (i = 0; i < pts.length; i++) inkSet[key(pts[i][0], pts[i][1])] = 1;
  var body = pts;                                   // lo que lleva contorno -> base de la sombra
  var ring = [];
  if (o.outline) {
    var seen = {};
    for (i = 0; i < pts.length; i++) for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      var qx = pts[i][0] + dx, qy = pts[i][1] + dy, kk = key(qx, qy);
      if (inkSet[kk] || seen[kk]) continue;
      seen[kk] = 1; ring.push([qx, qy]);
    }
    body = pts.concat(ring);
  }
  if (o.shadow) for (i = 0; i < body.length; i++) g.set(body[i][0] + 1, body[i][1] + 1, o.shadow);
  for (i = 0; i < ring.length; i++) g.set(ring[i][0], ring[i][1], o.outline);
  for (i = 0; i < pts.length; i++) g.set(pts[i][0], pts[i][1], ink);
  return cx - font.gap * s;
}

/* ======================== UTILIDADES DE CANVAS ======================== */
function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
/* Gira 90 grados en sentido horario n veces (n negativo = antihorario). Exacto, pixel a pixel. Copia ax/ay no (cambian de significado). */
function rot90(src, n) {
  n = ((((n === undefined ? 1 : n) % 4) + 4) % 4);
  var w = src.width, h = src.height;
  if (n === 0) { var cp = mkCanvas(w, h); cp.getContext('2d').drawImage(src, 0, 0); return cp; }
  var sw = n === 2 ? w : h, sh = n === 2 ? h : w;
  var out = mkCanvas(sw, sh);
  var a = src.getContext('2d').getImageData(0, 0, w, h), b = out.getContext('2d').createImageData(sw, sh);
  var ia = new Uint32Array(a.data.buffer), ib = new Uint32Array(b.data.buffer);
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var nx, ny;
    if (n === 1) { nx = h - 1 - y; ny = x; } else if (n === 2) { nx = w - 1 - x; ny = h - 1 - y; } else { nx = y; ny = w - 1 - x; }
    ib[ny * sw + nx] = ia[y * w + x];
  }
  out.getContext('2d').putImageData(b, 0, 0);
  return out;
}
/* Espejo horizontal. Si el canvas tiene ax, el nuevo ax es w-1-ax. */
function flipH(src) {
  var out = mkCanvas(src.width, src.height), ctx = out.getContext('2d');
  ctx.translate(src.width, 0); ctx.scale(-1, 1); ctx.drawImage(src, 0, 0);
  if (src.ax !== undefined) { out.ax = src.width - 1 - src.ax; out.ay = src.ay; }
  if (src.fw !== undefined) { out.fw = src.fw; out.fh = src.fh; }
  return out;
}
/* Sombra proyectada al sureste: silueta violeta '#2a2440' sesgada 1 px a la derecha por cada 2 hacia abajo.
   La base del objeto es la fila `base` (por defecto la ultima). Cada pixel a h px sobre la base cae a h*len px por debajo
   de ella y h*len/2 a la derecha (len = 0,5 por defecto: la sombra mide la mitad de la altura). Los pixeles de la silueta a
   la altura de la base y por debajo no se proyectan.
   Devuelve un canvas con .ox, .oy: dibujalo en (x + ox, y + oy) respecto de la esquina superior izquierda del sprite. */
function shadowSE(src, alpha, opt) {
  opt = opt || {}; alpha = alpha === undefined ? 0.2 : alpha;
  var w = src.width, h = src.height, base = opt.base === undefined ? h - 1 : opt.base, len = opt.len || 0.5;
  var a = src.getContext('2d').getImageData(0, 0, w, h).data;
  var H = base + 1, sh = Math.max(1, Math.ceil(H * len)), sw = w + Math.ceil(sh / 2) + 1;
  var out = mkCanvas(sw, sh), ctx = out.getContext('2d'), img = ctx.createImageData(sw, sh), buf = img.data;
  var col = hex2rgb(opt.color || PAL.shadow), A = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  for (var Y = 0; Y < sh; Y++) {
    var dx = Math.floor(Y / 2);
    var y0 = Math.floor(base - Y / len), y1 = Math.floor(base - (Y + 1) / len) + 1;     // franja de filas fuente que caen en Y
    if (y1 < 0) y1 = 0;
    for (var X = 0; X < sw; X++) {
      var sx = X - dx; if (sx < 0 || sx >= w) continue;
      var hit = false;
      for (var yy = Math.max(0, y1); yy <= Math.min(base, y0); yy++) if (a[(yy * w + sx) * 4 + 3] > 40) { hit = true; break; }
      if (hit) { var o = (Y * sw + X) * 4; buf[o] = col[0]; buf[o + 1] = col[1]; buf[o + 2] = col[2]; buf[o + 3] = A; }
    }
  }
  if (softShadows()) softenAlpha(buf, sw, sh, col);   // v0.14.1: borde suave (también las sombras horneadas DENTRO de los sprites: shadowIn)
  ctx.putImageData(img, 0, 0);
  out.ox = 0; out.oy = base;
  return out;
}
/* v0.14.1 (capa B): suavizado de la sombra horneada. Caja [1 2 1] separable sobre el alfa (el color se deja): el centro queda igual,
   el borde pasa de escalón a degradé de ~1 px. Una vez por sprite (al hornear). Se apaga con ?vol=0 / localStorage['ach.vol']='0'
   (vale para lo que se hornea después; cambiar ACH.volumen.setOn en vivo no rehace los sprites ya horneados). */
function softShadows() {
  if (softShadows.v !== undefined) return softShadows.v;
  var on = true;
  try { if (/[?&]vol=0\b/.test(location.search || '')) on = false; else if (window.localStorage && localStorage.getItem('ach.vol') === '0') on = false; } catch (e) { /* nada */ }
  return (softShadows.v = on);
}
function softenAlpha(buf, w, h, col) {
  var n = w * h, a = new Float32Array(n), t = new Float32Array(n), x, y, i, A = 0;
  for (i = 0; i < n; i++) { a[i] = buf[i * 4 + 3]; if (a[i] > A) A = a[i]; }
  if (!A) return;
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) { i = y * w + x; t[i] = (2 * a[i] + (x > 0 ? a[i - 1] : 0) + (x < w - 1 ? a[i + 1] : 0)) * 0.25; }
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    i = y * w + x; var v = (2 * t[i] + (y > 0 ? t[i - w] : t[i]) + (y < h - 1 ? t[i + w] : 0)) * 0.25;   // arriba (la base) no se aclara
    var o = i * 4; if (v > 0.5) { buf[o] = col[0]; buf[o + 1] = col[1]; buf[o + 2] = col[2]; }
    buf[o + 3] = Math.round(Math.min(A, v));
  }
}

/* ======================== EXPORTAR ACH.px ======================== */
px.G = G; px.RAMPS = RAMPS; px.PAL = PAL; px.ramp = ramp; px.wallRamp = wallRamp;
px.fonts = FONTS; px.text = text; px.measure = measure; px.fontInfo = fontInfo;
px.rot90 = rot90; px.flipH = flipH; px.shadowSE = shadowSE; px.rng = rng;
px.hex2rgb = hex2rgb; px.rgb2hex = rgb2hex; px.shade = shade; px.mix = mix;
px.canvas = mkCanvas;

/* ======================== LOTES ======================== */
/* Los archivos de edificios registran arquetipos: ACH.sprites.lotArch[arch] = function (ficha, px) { return canvas | {canvas, over, overX, overY, lights}; }
   buildLot despacha por arch, completa los campos que falten y devuelve null si el arquetipo no existe (el motor dibuja su bloque provisorio). */
var lotArch = ACH.sprites.lotArch = ACH.sprites.lotArch || {};
function isCanvas(o) { return o && typeof o === 'object' && typeof o.width === 'number' && typeof o.getContext === 'function'; }
function wrapLot(r) {
  if (!r) return null;
  if (isCanvas(r)) r = { canvas: r };
  if (!isCanvas(r.canvas)) return null;
  return { canvas: r.canvas, over: r.over || null, overX: r.overX || 0, overY: r.overY || 0, lights: r.lights || [] };
}
function buildLot(ficha) {
  var fn = ficha && lotArch[ficha.arch];
  if (typeof fn !== 'function') return null;
  return wrapLot(fn(ficha, px));
}
ACH.sprites.buildLot = buildLot;

/* Cara sur: tiles de fachada por piso (revision 2.2): 1 piso = 3, 2 = 5, 3 = 7, almacen = 4 (ficha.faceTiles lo cambia). */
function faceTilesOf(ficha) {
  if (ficha.faceTiles) return ficha.faceTiles;
  if (ficha.arch === 'almacen' || ficha.arch === 'fabrica') return 4;
  var f = Math.max(1, Math.min(3, ficha.floors || 1));
  return 1 + 2 * f;
}
function sign7(g, str, bx, by, bw, bandInk, bandShadow) {            // texto de letrero centrado en una banda de 10 px
  var s = str.toUpperCase(), font = 'a7';
  if (measure(s, 'a7') > bw - 4) font = 'a5';
  var info = fontInfo(font), hasMark = /[ÁÉÍÓÚÜÑáéíóúüñ]/.test(s);
  while (s.length > 1 && measure(s, font) > bw - 4) s = s.slice(0, -1);
  var ty = by + Math.floor((10 - info.h) / 2) + (hasMark && font === 'a7' ? 1 : 0);
  text(g, s, bx + Math.floor(bw / 2), ty, { font: font, ink: bandInk, shadow: font === 'a7' && !hasMark ? bandShadow : null, align: 'c' });
}
function placeholderLot(ficha) {
  var W = (ficha.c1 - ficha.c0 + 1) * 16, Hh = (ficha.r1 - ficha.r0 + 1) * 16;
  var g = new G(W, Hh), r = rng(ficha.seed || 1), side = ficha.side || 'N';
  var rf = RAMPS.concrete, roofRamp = [RAMPS.concrete[0], RAMPS.concrete[1], RAMPS.concrete[2], RAMPS.concrete[3]];
  var K = PAL.outline, i, x, y;
  function roofFill(y0, y1) {
    g.rect(0, y0, W, y1 - y0, rf[2]);
    for (i = 0; i < W * (y1 - y0) / 26; i++) { x = Math.floor(r() * W); y = y0 + Math.floor(r() * (y1 - y0)); g.rect(x, y, 1 + (r() < .4 ? 1 : 0), 1, r() < .6 ? rf[1] : rf[3]); }
  }
  if (side === 'S') {
    roofFill(0, Hh);
    // parapeto en el borde norte: cara superior clara 2 px + cara visible 4 px
    g.rect(0, 0, W, 2, rf[4]); g.rect(0, 2, W, 4, rf[3]); g.rect(0, 5, W, 1, rf[1]);
    g.rect(0, 0, 2, Hh, rf[3]); g.rect(W - 2, 0, 2, Hh, rf[1]);
    g.rect(2, 6, W - 4, 1, rf[0]);                                          // sombra bajo el parapeto
    if (ficha.name) text(g, ficha.name.toUpperCase(), 6, Hh - 8, { font: 'a5', ink: rf[1] });
    return { canvas: g.toCanvas(), over: null, overX: 0, overY: 0, lights: [] };
  }
  // ---- lado N: azotea arriba, cara sur abajo ----
  var ft = Math.min(faceTilesOf(ficha), ficha.r1 - ficha.r0 + 1), faceH = ft * 16, faceY = Hh - faceH, roofH = faceY;
  var wall = wallRamp(ficha.color), brick = ficha.color === 'ladrillo';
  if (roofH > 0) {
    roofFill(0, roofH);
    var pb = Math.min(roofH, 6);                                             // parapeto (6 px tomados de la azotea)
    g.rect(0, roofH - pb, W, 2, wall[3]); g.rect(0, roofH - pb + 2, W, pb - 2, wall[2]);
    g.rect(0, roofH - 1, W, 1, wall[1]);
  }
  // muro
  g.rect(0, faceY, W, faceH, wall[2]);
  for (i = 0; i < W * faceH / 9; i++) { x = Math.floor(r() * W); y = faceY + Math.floor(r() * faceH); g.set(x, y, r() < .5 ? wall[1] : wall[3]); }
  if (brick) for (y = faceY + 3; y < Hh; y += 4) { g.rect(0, y, W, 1, wall[1]); for (x = ((y - faceY) >> 2) % 2 ? 0 : 4; x < W; x += 8) g.rect(x, y - 3, 1, 3, wall[1]); }
  g.rect(0, faceY, W, 1, wall[3]);
  g.rect(0, Hh - 6, W, 6, wall[1]); g.rect(0, Hh - 6, W, 1, wall[2]);            // zocalo de 6 px
  g.rect(0, Hh - 1, W, 1, wall[0]);
  var groundH = ficha.arch === 'almacen' || ficha.arch === 'fabrica' ? faceH : Math.min(48, faceH), gTop = Hh - groundH;
  var GL = RAMPS.glass, WD = RAMPS.wood, lights = [];
  function hole(hx, hy, hw, hh, c, frame) {
    g.rect(hx - 1, hy - 1, hw + 2, hh + 2, frame); g.rect(hx, hy, hw, hh, c);
    g.rect(hx, hy, hw, 1, shade(c, .7));
  }
  // banda de letrero (10 px) en la parte alta de la planta baja
  var bandY = gTop + 2, bandH = 10, bw = W - 8, bx = 4;
  var sc = ficha.color === 'celeste' || ficha.color === 'menta' || ficha.color === 'blanco' ? 0 : 1;
  var bandCols = [[PAL.rustRed, PAL.cream, '#4e1f1a'], [PAL.navy, PAL.sign, '#1d2a48'], [PAL.bottle, PAL.cream, '#1f3a36']];
  var bc = bandCols[(ficha.seed || 0) % 3];
  g.rect(bx, bandY, bw, bandH, bc[0]); g.rect(bx, bandY, bw, 1, shade(bc[0], 1.3)); g.rect(bx, bandY + bandH - 1, bw, 1, bc[2]);
  if (ficha.name) sign7(g, ficha.name, bx, bandY, bw, bc[1], bc[2]);
  lights.push({ x: Math.floor(W / 2), y: bandY + bandH + 2, kind: 'local' });
  // puerta 16x34 y vano de tienda 18x16 (a escala real)
  var doorX = Math.max(6, Math.floor(W * .22)), doorY = Hh - 34;
  hole(doorX, doorY, 16, 34, WD[1], wall[0]); g.rect(doorX + 2, doorY + 3, 12, 12, GL[1]); g.rect(doorX + 12, doorY + 20, 2, 2, PAL.sign);
  if (ficha.arch === 'almacen' || ficha.arch === 'fabrica') {
    var gw = Math.min(80, W - doorX - 40), gx = doorX + 28;
    if (gw >= 40) { g.rect(gx, Hh - 46, gw, 46, RAMPS.metal[2]); for (y = Hh - 46; y < Hh; y += 3) g.rect(gx, y, gw, 1, RAMPS.metal[1]); g.rect(gx, Hh - 46, gw, 1, RAMPS.metal[3]); }
  } else {
    for (x = doorX + 30; x + 18 <= W - 6; x += 34) hole(x, Hh - 28, 18, 16, GL[2], wall[0]);
  }
  // pisos altos: ventanas de 18x16 con antepecho de 10 px
  var upper = Math.floor((faceH - groundH) / 32);
  for (var f = 0; f < upper; f++) {
    var wy = gTop - 32 * (f + 1) + 10;
    for (x = 8; x + 18 <= W - 4; x += 34) hole(x, wy, 18, 16, GL[2], wall[0]);
    g.rect(0, wy + 22, W, 1, wall[3]); g.rect(0, wy + 23, W, 1, wall[0]);       // losa
  }
  return { canvas: g.toCanvas(), over: null, overX: 0, overY: 0, lights: lights };
}
px.placeholderLot = placeholderLot;
px.faceTiles = faceTilesOf;
})();
