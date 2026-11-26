/* ACHORADO - js/sprites/aves.js  (v0.9, H5b)
 * Aves del Cerro: gallinazo hostil, sombra de ave, plumas y gallinas.
 * Publica (todo mira a la DERECHA; el motor voltea para la izquierda; ax/ay en cada canvas):
 *   ACH.sprites.npc.gallinazoHostil = { glide:[4], dive:[2], peck:[3], hurt:[2], fall:[3], eat:[2], hurtGlide:[4] }
 *       glide/dive/hurt/fall[0..1] = vista desde arriba en 3/4, ancla = centro del cuerpo (el motor lo dibuja en y - z).
 *       peck/eat/fall[2] = en el suelo, ancla = pies (fall[2]: centro del cuerpo tumbado).
 *   ACH.sprites.fx.sombraAve = [chica, mediana, grande]   (elipses violaceas semitransparentes, ancla = centro)
 *   ACH.sprites.fx.plumas = [3 plumitas negras]           (ancla = centro)
 *   ACH.sprites.npc.gallina = { idle:[2], peck:[2], run:{left:[4], right:[4]} }   ~12x11, ancla = pies
 *   ACH.sprites.npc.gallinaVar = [colorada, parda, blanca]   (misma forma; gallina === gallinaVar[0])
 * Autonomo: no usa otras funciones de sprites; solo ACH.sprites y ACH.px.flipH. Hornea una vez al cargar.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var S = ACH.sprites = ACH.sprites || {};
var T0 = (window.performance && performance.now) ? performance.now() : Date.now();

/* ======================== COLOR Y BUFFER ======================== */
var colCache = {};
function col(h) {
  var v = colCache[h];
  if (v === undefined) {
    var r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
    v = colCache[h] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }
  return v;
}
function rgba(r, g, b, a) { return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0; }
function ramp(a) { return a.map(col); }
var WHITE = 0xFFFFFFFF;

function Buf(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); }
Buf.prototype.set = function (x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; };
Buf.prototype.get = function (x, y) { return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.d[y * this.w + x] : 0; };
Buf.prototype.rect = function (x, y, w, h, c) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.set(x + i, y + j, c); };
Buf.prototype.line = function (x0, y0, x1, y1, c) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, e = dx + dy;
  for (var n = 0; n < 200; n++) {
    this.set(x0, y0, c);
    if (x0 === x1 && y0 === y1) break;
    var e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
};
Buf.prototype.ell = function (cx, cy, rx, ry, c) {
  for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy <= 1) this.set(x, y, c);
  }
};
/* Pinta una elipse con relieve: arriba-izquierda claro, abajo-derecha oscuro; r = [oscuro, base, claro] */
Buf.prototype.ellS = function (cx, cy, rx, ry, r) {
  for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry, q = dx * dx + dy * dy; if (q > 1) continue;
    var s = (dx + dy) * 0.5;
    this.set(x, y, s < -0.42 ? r[2] : s > 0.38 ? r[0] : r[1]);
  }
};
Buf.prototype.blit = function (s, ox, oy) {
  for (var y = 0; y < s.h; y++) for (var x = 0; x < s.w; x++) { var c = s.d[y * s.w + x]; if (c) this.set(x + ox, y + oy, c); }
};
Buf.prototype.copy = function () { var n = new Buf(this.w, this.h); n.d.set(this.d); return n; };
/* Contorno de 1 px (4 vecinos) + luz de borde apagada arriba/izquierda (el ave es negra: la luz fria evita que se pierda) */
Buf.prototype.outline = function (K, RIM) {
  var w = this.w, h = this.h, d = this.d, i, x, y, add = [];
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    i = y * w + x; if (d[i]) continue;
    if ((x > 0 && d[i - 1]) || (x < w - 1 && d[i + 1]) || (y > 0 && d[i - w]) || (y < h - 1 && d[i + w])) add.push(i);
  }
  for (i = 0; i < add.length; i++) d[add[i]] = K;
  if (RIM) {
    var ed = [];
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i = y * w + x; if (d[i] !== K) continue;
      var up = y > 0 ? d[i - w] : 0, lf = x > 0 ? d[i - 1] : 0, dn = y < h - 1 ? d[i + w] : 0, rt = x < w - 1 ? d[i + 1] : 0;
      if ((!up && dn && dn !== K) || (!lf && rt && rt !== K)) ed.push(i);
    }
    for (i = 0; i < ed.length; i++) d[ed[i]] = RIM;
  }
  return this;
};
Buf.prototype.solid = function () { var n = new Buf(this.w, this.h); for (var i = 0; i < this.d.length; i++) if (this.d[i]) n.d[i] = WHITE; return n; };
Buf.prototype.toCanvas = function (ax, ay) {
  var c = document.createElement('canvas'); c.width = this.w; c.height = this.h;
  var ctx = c.getContext('2d'), img = ctx.createImageData(this.w, this.h);
  new Uint32Array(img.data.buffer).set(this.d);
  ctx.putImageData(img, 0, 0);
  if (ax !== undefined) { c.ax = ax; c.ay = ay; }
  return c;
};
/* Giro por mapeo inverso (vecino mas cercano), para las caidas. Gira alrededor de (cx, cy). */
Buf.prototype.rotated = function (deg, cx, cy) {
  var a = deg * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a), o = new Buf(this.w, this.h);
  for (var y = 0; y < this.h; y++) for (var x = 0; x < this.w; x++) {
    var dx = x - cx, dy = y - cy, sx = Math.round(cx + dx * cs + dy * sn), sy = Math.round(cy - dx * sn + dy * cs);
    var c = this.get(sx, sy); if (c) o.d[y * o.w + x] = c;
  }
  return o;
};
function flipC(cv) {                                          // espejo horizontal de un canvas (ax -> w-1-ax)
  var o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height;
  var x = o.getContext('2d'); x.translate(cv.width, 0); x.scale(-1, 1); x.drawImage(cv, 0, 0);
  if (cv.ax !== undefined) { o.ax = cv.width - 1 - cv.ax; o.ay = cv.ay; }
  return o;
}

/* ======================== GALLINAZO HOSTIL ======================== */
var K = col('#0b0b0f'), RIM = col('#5d616c');
var BK = ramp(['#121216', '#1e1f24', '#2d2f36', '#454852']);                 // plumaje [sombra, base, medio, luz]
var HEAD = ramp(['#3a3b3d', '#5d6064', '#8c8f92', '#b4b6b4']);               // cabeza gris arrugada
var FEET = ramp(['#6e6b62', '#9d998c', '#b9b4a9']);                          // patas gris claro
var BEAK = ramp(['#4a4a46', '#a9a69b', '#d6d2c0']);
var EYE = col('#0a0a0c'), FLESH = ramp(['#5a1c20', '#8e2c30', '#c25a56']);

/* Ave en el aire vista desde arriba en 3/4, mirando hacia la camara y un poco a la derecha: alas horizontales, cola arriba, cabeza abajo.
   Se dibuja por columnas (perfil de ala = [techo, piso] de cada columna) para controlar cada pixel de la silueta.
   o: { span (largo de cada ala), rise (cuanto suben las puntas), rootChord, tipChord, liftL, liftR (cabeceo de cada ala), patch: 'L'|'R'|null,
        headDx, open, feet, fold, belly } */
var PATCH = ramp(['#7a7c84', '#9a9aa0']);
function wingCols(span, o, lift) {
  var cols = [], rc = o.rootChord || 7, tc = o.tipChord || 3, rise = o.rise === undefined ? 3 : o.rise, root = 4;
  for (var i = 0; i < span; i++) {                                           // i = 0 es la punta, span-1 la raiz
    var t = i / Math.max(1, span - 1), chord = tc + (rc - tc) * Math.pow(t, 0.75), top = root - rise * (1 - t) * (1 - t * 0.2) - (rc - chord) * 0.25 + lift * (1 - t);
    var fing = (!o.fold && i < 5) ? ((i & 1) ? 1 : -1) : 0;                  // dedos de las primarias: dientes en el borde de fuga
    cols.push({ top: Math.round(top) + fing, bot: Math.round(top + chord) + (fing > 0 ? 0 : 0) });
  }
  return cols;
}
function batBird(o) {
  var W = 30, H = 25, cx = 14, b = new Buf(W, H), span = o.span || 11, rc = o.rootChord || 7;
  var yOff = o.yOff === undefined ? 2 : o.yOff;
  [-1, 1].forEach(function (sg) {                                            // -1 = izquierda, +1 = derecha
    var cols = wingCols(span, o, sg < 0 ? (o.liftL || 0) : (o.liftR || 0)), L = span;
    for (var i = 0; i < L; i++) {
      var x = sg < 0 ? (cx - (L - i)) : (cx + 1 + (L - i)), c = cols[i];
      // x del lado izquierdo: la raiz esta junto al cuerpo (i = span-1)
      if (sg < 0) x = cx - 1 - (span - 1 - i); else x = cx + 2 + (span - 1 - i);
      for (var y = c.top; y <= c.bot; y++) {
        var py = y + yOff, ch = (y - c.top) / Math.max(1, c.bot - c.top), col_ = BK[1];
        if (ch > 0.72) col_ = BK[2];                                         // borde de ataque, mas claro
        else if (ch < 0.18) col_ = BK[0];                                    // borde de fuga, oscuro
        else if (((i + (sg > 0 ? 1 : 0)) & 1) === 0 && ch > 0.3 && ch < 0.7) col_ = BK[2];   // costillas de plumas
        if (!o.fold && i < 5 && (i & 1) === 0 && y <= c.top + 1) col_ = BK[0];
        if (o.patch && ((o.patch === 'L') === (sg < 0)) && i >= 1 && i <= 3 && y >= c.top + 2 && y <= c.bot - 1) col_ = i === 2 ? PATCH[1] : PATCH[0];
        b.set(x, py, col_);
      }
    }
  });
  var by = 2 + yOff;
  // cola
  b.rect(cx, by, 2, 2, BK[1]); b.rect(cx - 1, by + 2, 4, 2, BK[1]); b.set(cx - 1, by + 3, BK[0]); b.set(cx + 2, by + 3, BK[0]); b.rect(cx, by, 2, 1, BK[0]);
  if (!o.noFeet) { b.set(cx - 1, by - 1, FEET[1]); b.set(cx + 2, by - 1, FEET[2]); b.set(cx - 1, by, FEET[0]); b.set(cx + 2, by, FEET[0]); }
  // cuerpo (ovalo vertical)
  b.ellS(cx + 0.5, by + 7, 3.3, 5.2, [BK[0], BK[1], BK[2]]);
  b.set(cx - 1, by + 4, BK[3]); b.set(cx, by + 4, BK[3]); b.set(cx - 1, by + 5, BK[3]); b.set(cx - 2, by + 6, BK[2]);
  if (o.belly) { b.ellS(cx + 0.5, by + 7, 2.6, 4.4, [BK[2], BK[3], col('#6a6e78')]); }
  // golilla y cuello
  b.rect(cx - 1, by + 11, 4, 2, BK[0]); b.set(cx, by + 11, BK[2]);
  var hx = cx + 1 + (o.headDx || 0), hy = by + 13;
  b.rect(hx, hy - 1, 2, 2, HEAD[1]);
  b.rect(hx - 1, hy + 1, 4, 3, HEAD[2]);
  b.set(hx - 1, hy + 1, HEAD[3]); b.set(hx, hy + 1, HEAD[3]); b.set(hx + 2, hy + 3, HEAD[1]); b.set(hx + 1, hy + 2, HEAD[1]);
  b.set(hx - 1, hy + 3, HEAD[1]);
  b.set(hx + 2, hy + 1, EYE); b.set(hx, hy + 1, HEAD[1]);
  b.set(hx + 1, hy + 4, BEAK[1]); b.set(hx + 2, hy + 4, BEAK[1]); b.set(hx + 2, hy + 5, BEAK[2]);
  if (o.open) { b.set(hx + 1, hy + 5, FLESH[1]); b.set(hx + 3, hy + 4, BEAK[0]); }
  b.outline(K, RIM);
  b.acx = cx + 1; b.acy = by + 7;
  return b;
}
function glideFrame(f, o) {
  var p = { span: [11, 10, 11, 10][f], rise: [3, 3, 4, 2][f], rootChord: 7, tipChord: 3, liftL: [0, -1, 1, 1][f], liftR: [0, 1, 1, -1][f], patch: [null, 'L', null, 'R'][f], headDx: [0, 0, 1, 0][f] };
  for (var k in o) p[k] = o[k];
  return batBird(p);
}
function diveFrame(f) {
  return f === 0 ? batBird({ span: 8, rise: 6, rootChord: 5, tipChord: 2, open: true, fold: true, headDx: 1, noFeet: true })
                 : batBird({ span: 6, rise: 8, rootChord: 4, tipChord: 2, open: true, fold: true, headDx: 1, noFeet: false });
}
function headAt(b, x, y, o) {                                                 // cabeza gris y pico de perfil, mirando a la derecha. (x,y) = centro del craneo
  o = o || {};
  b.rect(x - 1, y - 1, 3, 3, HEAD[2]); b.set(x - 1, y - 1, HEAD[3]); b.set(x + 1, y + 1, HEAD[1]); b.set(x, y, HEAD[1]);
  b.set(x - 2, y, HEAD[1]);                                                   // nuca arrugada
  b.set(x + 1, y - 1, EYE);                                                   // ojo
  b.set(x + 2, y, BEAK[1]); b.set(x + 3, y, BEAK[1]); b.set(x + 3 + (o.long ? 1 : 0), y + 1, BEAK[2]);
  if (o.open) { b.set(x + 2, y + 1, FLESH[1]); b.set(x + 3, y + 1, BEAK[0]); }
}
/* De pie en el suelo, vista 3/4 de lado, mirando a la derecha. alas semiabiertas para el equilibrio. head: 0 arriba, 1 picotazo, 2 volviendo */
function groundBird(o) {
  o = o || {};
  var W = 24, H = 18, b = new Buf(W, H), gx = 11, gy = 17, ty = 7 + (o.crouch || 0);
  // patas
  b.rect(gx - 2, gy - 4 + (o.crouch || 0), 1, 4 - (o.crouch || 0), FEET[1]); b.rect(gx + 1, gy - 4 + (o.crouch || 0), 1, 4 - (o.crouch || 0), FEET[2]);
  b.rect(gx - 3, gy, 3, 1, FEET[1]); b.rect(gx, gy, 3, 1, FEET[2]);
  b.set(gx + 3, gy, FEET[0]); b.set(gx - 4, gy, FEET[0]);
  // ala lejana (alzada, detras)
  if (o.wings !== 'fold') {
    for (var k = 0; k < 8; k++) { var yy = ty - 1 - Math.round(k * 0.7), x0 = gx - 6 - Math.round(k * 0.3); b.rect(x0, yy, 8 - (k > 5 ? 2 : 0), 1, k < 2 ? BK[2] : BK[0]); }
  }
  // cola y cuerpo
  b.rect(gx - 8, ty + 1, 4, 3, BK[1]); b.set(gx - 9, ty + 3, BK[0]); b.set(gx - 8, ty + 4, BK[0]); b.set(gx - 7, ty + 4, BK[0]);
  b.ellS(gx, ty + 2, 6, 3.4, [BK[0], BK[1], BK[2]]);
  b.set(gx - 2, ty, BK[3]); b.set(gx - 1, ty, BK[3]); b.set(gx - 4, ty + 1, BK[3]);
  // ala cercana: cae sobre el costado con las puntas abiertas
  var ww = o.wings === 'fold' ? 0 : 1;
  for (var j = 0; j < 7; j++) {
    var y2 = ty + 2 + j * (ww ? 0.65 : 0.35), x2 = gx - 5 + (ww ? Math.round(j * 0.25) : 0);
    b.rect(Math.round(x2), Math.round(y2), 8 - Math.round(j * 0.5), 1, j < 1 ? BK[2] : j > 4 ? BK[0] : BK[1]);
  }
  b.rect(gx - 5, ty + 2, 8, 1, BK[2]);
  // cuello y cabeza
  var hx = gx + 7, hy = ty - 3, h = o.head || 0;
  if (h === 0) { hx = gx + 7; hy = ty - 2; }
  if (h === 1) { hx = gx + 9; hy = ty + 3; }
  if (h === 2) { hx = gx + 8; hy = ty - 0; }
  if (h === 3) { hx = gx + 8; hy = ty + 4 + (o.dip || 0); }
  var nx0 = gx + 4, ny0 = ty + 1;
  var steps = 6;
  for (var s = 0; s <= steps; s++) { var tt = s / steps, nx = Math.round(nx0 + (hx - nx0) * tt), ny = Math.round(ny0 + (hy - ny0) * tt); b.rect(nx - 1, ny - 1, 3, 2, s < 3 ? BK[0] : HEAD[1]); }
  headAt(b, hx, hy, { open: o.open, long: true });
  b.outline(K, RIM);
  return b;
}
function eatFrame(f) {
  var W = 20, H = 15, b = new Buf(W, H), gx = 8, gy = 14;
  b.rect(gx - 2, gy - 3, 1, 3, FEET[1]); b.rect(gx + 1, gy - 3, 1, 3, FEET[2]); b.rect(gx - 3, gy, 3, 1, FEET[1]); b.rect(gx, gy, 3, 1, FEET[2]);
  // comida: algo rojizo en el suelo
  b.ell(gx + 8, gy - 1, 3, 1.2, FLESH[0]); b.rect(gx + 6, gy - 2, 4, 1, FLESH[1]); b.set(gx + 7, gy - 2, FLESH[2]); b.set(gx + 9, gy - 1, col('#d8cfa4'));
  // cuerpo encorvado, alas caidas en capa
  b.rect(gx - 7, 6, 4, 3, BK[1]); b.set(gx - 8, 8, BK[0]);
  b.ellS(gx, 7, 6, 4, [BK[0], BK[1], BK[2]]);
  b.set(gx - 2, 4, BK[3]); b.set(gx - 1, 4, BK[3]); b.set(gx - 4, 5, BK[3]);
  for (var i = 0; i < 5; i++) { b.rect(gx - 5 + i, 8 + (i > 2 ? 1 : 0), 1, 3 - (i > 2 ? 1 : 0), BK[i % 2 ? 0 : 1]); }
  b.set(gx - 6, 10, BK[0]); b.set(gx - 7, 9, BK[0]);
  var hx = gx + (f ? 8 : 9), hy = f ? 7 : 10;
  for (var s = 0; s <= 5; s++) { var tt = s / 5, nx = Math.round(gx + 4 + (hx - gx - 4) * tt), ny = Math.round(6 + (hy - 6) * tt); b.rect(nx - 1, ny - 1, 3, 2, s < 2 ? BK[0] : HEAD[1]); }
  headAt(b, hx, hy, { open: !f, long: true });
  if (f) { b.line(hx + 4, hy + 1, hx + 6, hy + 3, FLESH[2]); b.set(hx + 6, hy + 4, FLESH[1]); }   // tira de carne colgando del pico
  b.outline(K, RIM);
  return b;
}
Buf.prototype.rot90 = function (n) {                                          // giro exacto de 90 grados en sentido horario, n veces
  n = ((n % 4) + 4) % 4; var s = this;
  for (var k = 0; k < n; k++) { var o = new Buf(s.h, s.w); for (var y = 0; y < s.h; y++) for (var x = 0; x < s.w; x++) o.d[x * o.w + (s.h - 1 - y)] = s.d[y * s.w + x]; o.acx = s.h - 1 - s.acy; o.acy = s.acx; s = o; }
  return s;
};
function fallFrame(f) {
  if (f === 0) return batBird({ span: 11, rise: -3, liftL: 2, liftR: -2, open: true, noFeet: true, headDx: 1, patch: 'R' }).rot90(1);
  if (f === 1) return batBird({ span: 9, rise: 0, rootChord: 6, tipChord: 3, liftL: 1, liftR: 3, open: true, headDx: -1, belly: true }).rot90(3);
  return batBird({ span: 12, rise: -1, rootChord: 6, tipChord: 4, liftL: 2, liftR: -1, open: true, belly: true, headDx: -3, patch: 'L' });   // panza arriba, desparramado
}
var glide = [0, 1, 2, 3].map(function (i) { return glideFrame(i); });
var dive = [diveFrame(0), diveFrame(1)];
var peckB = [groundBird({ head: 0 }), groundBird({ head: 1, open: true, crouch: 1 }), groundBird({ head: 2 })];
var eatB = [eatFrame(0), eatFrame(1)];
var fallB = [fallFrame(0), fallFrame(1), fallFrame(2)];
var hurtB = [glideFrame(0, { span: 11, rise: 6, open: true, liftL: -2, liftR: -2, headDx: 2, patch: null }), glideFrame(0, { span: 13, rise: 0, open: true, liftL: 2, liftR: 2, headDx: -1, patch: null })];

S.npc = S.npc || {};
S.fx = S.fx || {};
S.npc.gallinazoHostil = {
  glide: glide.map(function (b) { return b.toCanvas(b.acx, b.acy); }),
  dive: dive.map(function (b) { return b.toCanvas(b.acx, b.acy); }),
  peck: peckB.map(function (b) { return b.toCanvas(11, 17); }),
  hurt: hurtB.map(function (b) { return b.solid().toCanvas(b.acx, b.acy); }),
  hurtGlide: glide.map(function (b) { return b.solid().toCanvas(b.acx, b.acy); }),
  fall: fallB.map(function (b) { return b.toCanvas(b.acx, b.acy); }),
  eat: eatB.map(function (b) { return b.toCanvas(8, 14); })
};

/* ======================== SOMBRA DE AVE ======================== */
/* Elipses violaceas (#2a2440) semitransparentes, con nucleo mas oscuro y borde punteado. Ancla = centro. El motor puede variar globalAlpha. */
function shadowEll(w, h) {
  var b = new Buf(w, h), cx = (w - 1) / 2, cy = (h - 1) / 2, rx = w / 2, ry = h / 2;
  var A1 = rgba(0x2a, 0x24, 0x40, 92), A2 = rgba(0x2a, 0x24, 0x40, 70), A3 = rgba(0x2a, 0x24, 0x40, 42);
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry, q = dx * dx + dy * dy;
    if (q > 1) continue;
    var c = q < 0.45 ? A1 : q < 0.78 ? A2 : (((x + y) & 1) ? A3 : A2);
    b.d[y * w + x] = c;
  }
  return b.toCanvas(Math.floor(w / 2), Math.floor(h / 2));
}
S.fx.sombraAve = [shadowEll(12, 5), shadowEll(18, 8), shadowEll(26, 11)];

/* ======================== PLUMAS ======================== */
function feather(kind) {
  var b = new Buf(8, 6);
  if (kind === 0) { b.line(1, 4, 6, 1, BK[1]); b.line(2, 4, 6, 2, BK[0]); b.set(5, 1, BK[3]); b.set(3, 3, BK[2]); b.set(7, 1, BK[0]); }
  else if (kind === 1) { b.line(1, 1, 6, 4, BK[1]); b.line(1, 2, 5, 4, BK[0]); b.set(2, 1, BK[3]); b.set(4, 3, BK[2]); b.set(0, 0, BK[0]); }
  else { b.line(0, 4, 5, 3, BK[1]); b.line(1, 4, 6, 2, BK[2]); b.set(3, 2, BK[1]); b.set(5, 1, BK[0]); b.set(2, 3, BK[3]); }
  return b.outline(K, null).toCanvas(4, 3);
}
S.fx.plumas = [feather(0), feather(1), feather(2)];

/* ======================== GALLINAS ======================== */
var HEN_SETS = {
  colorada: { body: ramp(['#5a2410', '#8e3e1a', '#bc5a26', '#dc8444']), tail: ramp(['#241410', '#3e2418', '#5a3220']), wing: ramp(['#6a2c14', '#8e3e1a', '#a84c20']) },
  parda:    { body: ramp(['#4a2e16', '#7a4e26', '#a37038', '#c8985a']), tail: ramp(['#1e1810', '#352a1c', '#4e3c26']), wing: ramp(['#523418', '#7a4e26', '#946236']) },
  blanca:   { body: ramp(['#8c8a86', '#bcbab0', '#e2dfd2', '#faf8ee']), tail: ramp(['#7a7870', '#aaa89c', '#d0cdbf']), wing: ramp(['#9a9890', '#c8c5b8', '#e8e5d8']) }
};
var COMB = ramp(['#701a1c', '#b8302c', '#e0503c']), HBEAK = ramp(['#9a6a18', '#d8a028', '#f0cc50']), HLEG = ramp(['#8a5a14', '#c8902c', '#e8b84a']);
/* o: { head: 'up'|'peck'|'run', legs:[a,b], bob, tail, wingUp } */
function henFrame(set, o) {
  o = o || {};
  var b = new Buf(13, 12), bob = o.bob || 0, hd = o.head || 'up';
  var gy = 11, by = 6 + bob;                                              // gy = fila de los pies
  // patas
  var l = o.legs || [0, 0];
  [[5 + l[0], 0], [7 + l[1], 1]].forEach(function (p, i) {
    var top = by + 3, h = gy - top; if (h < 1) h = 1;
    b.rect(p[0], top, 1, h, i ? HLEG[2] : HLEG[1]);
    b.set(p[0] - (o.head === 'run' && l[i] < 0 ? 0 : 0), gy, HLEG[1]); b.set(p[0] + 1, gy, HLEG[2]);
  });
  // cola: plumas levantadas
  var tl = o.tail || 0;
  b.set(1, by - 1 - tl, set.tail[1]); b.set(0, by - 2 - tl, set.tail[0]); b.set(1, by - 2 - tl, set.tail[1]); b.set(2, by - 2 - tl + 1, set.tail[2]); b.set(0, by - 1 - tl, set.tail[0]);
  b.rect(1, by - tl, 2, 2, set.tail[1]); b.set(0, by + 1 - tl, set.tail[0]);
  // cuerpo
  b.ellS(5.5, by + 1.2, 4.3, 3.2, [set.body[0], set.body[1], set.body[2]]);
  b.set(4, by - 1, set.body[3]); b.set(5, by - 1, set.body[3]); b.set(3, by, set.body[3]);
  b.set(8, by + 3, set.body[0]);
  // ala
  var wy = by + 1 - (o.wingUp ? 1 : 0);
  b.rect(4, wy + 1, 4, 2, set.wing[1]); b.set(3, wy + 2, set.wing[0]); b.set(4, wy + 3, set.wing[0]); b.rect(5, wy + 3, 3, 1, set.wing[0]); b.rect(4, wy + 1, 3, 1, set.wing[2]);
  if (o.wingUp) { b.set(2, wy, set.wing[0]); b.set(3, wy, set.wing[1]); }
  // cuello y cabeza
  var hx, hy;
  if (hd === 'up') { hx = 9; hy = by - 2; b.rect(8, by - 1, 2, 3, set.body[2]); }
  else if (hd === 'peck') { hx = 10; hy = by + 3; b.rect(8, by, 2, 2, set.body[2]); b.set(9, by + 2, set.body[1]); }
  else { hx = 10; hy = by - 1; b.rect(8, by, 2, 2, set.body[2]); b.set(9, by - 1, set.body[1]); }
  b.rect(hx - 1, hy, 2, 2, set.body[3]);
  b.set(hx - 1, hy, set.body[3]);
  b.set(hx, hy, col('#101010'));                                          // ojo
  b.set(hx - 1, hy - 1, COMB[1]); b.set(hx, hy - 1, COMB[2]);              // cresta
  if (hd === 'peck') { b.set(hx + 1, hy + 1, HBEAK[1]); b.set(hx + 1, hy + 2, HBEAK[2]); b.set(hx, hy + 2, COMB[1]); }
  else { b.set(hx + 1, hy, HBEAK[2]); b.set(hx + 1, hy + 1, HBEAK[1]); b.set(hx, hy + 2, COMB[1]); }
  b.outline(col('#17110e'), null);
  return b;
}
function buildHen(name) {
  var set = HEN_SETS[name], A = [6, 11];
  var idle = [henFrame(set, {}), henFrame(set, { head: 'up', bob: 0, tail: 1 })];
  idle[1] = henFrame(set, { head: 'up', tail: 1 });
  var peck = [henFrame(set, { head: 'peck', tail: 1 }), henFrame(set, { head: 'peck', tail: 0, bob: 1, legs: [0, 0] })];
  var runR = [
    henFrame(set, { head: 'run', legs: [-2, 1], bob: 0, wingUp: 1 }), henFrame(set, { head: 'run', legs: [0, 0], bob: -1, wingUp: 1 }),
    henFrame(set, { head: 'run', legs: [1, -2], bob: 0, wingUp: 1 }), henFrame(set, { head: 'run', legs: [0, 0], bob: -1, wingUp: 1 })
  ];
  var toC = function (b) { return b.toCanvas(A[0], A[1]); };
  var rc = runR.map(toC);
  return { idle: idle.map(toC), peck: peck.map(toC), run: { right: rc, left: rc.map(flipC) } };
}
S.npc.gallinaVar = ['colorada', 'parda', 'blanca'].map(buildHen);
S.npc.gallina = S.npc.gallinaVar[0];

var T1 = (window.performance && performance.now) ? performance.now() : Date.now();
S.avesBakeMs = T1 - T0;
})();
