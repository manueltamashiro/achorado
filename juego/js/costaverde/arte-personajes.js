/* ACHORADO - js/costaverde/arte-personajes.js  (Costa Verde, C2c: arte de personajes y objetos)
 * Contrato: COSTAVERDE.md seccion 10.3.  Script clasico (window.ACH), sin librerias; funciona desde file://.
 * Todo se hornea UNA vez (al cargar o al primer acceso si es perezoso): sin getImageData en el bucle, sin shadowBlur, sin filter.
 * (getImageData solo se usa, perezoso y una vez por lienzo, para componer a Alexander con el objeto en la mano: igual que alexInflable de Miraflores.)
 * Necesita base.js, sprites.js y zombies.js ya cargados (si falta algo, solo se omite lo que depende de ello).
 *
 * Publica ACH.sprites.cv.pj  (detalle completo, tamanos y anclas: ../diseno/cv-C2c.md):
 *   chef { idle[2] alza[2] lanza[3] llama[3] salta[3] cae sentado[2] hurt dead  + wok }     palito { vuela clavado }
 *   dumpling { hop[3] muerde[2] dead }   baozi (igual)   sombra[3]
 *   perro[raza] { walk:{dir:[4]} run:{dir:[4]} bite[2] sit }   raza: chusco salchicha golden pug singpelo husky
 *   heladero { ride[4] stop }   npc { fosfo kioscoLarco deportes fuente }  (cada uno { idle[4] })
 *   cv_corredor cv_turista cv_surfista cv_parapentista cv_seguridad cv_trab_<marca>   = { move[6] hurt[6] dead }  (formato ACH.zvar)
 *   pareja { walk:{dir:[4]} hurt:{dir:[4]} }
 *   iconos (12x12 @6,11 + .big 24x24 @12,22): pelota pelotaCuero barraFosfo_<color> packFosfo helado paleta chaufa wantan chicha canilleras
 *   pelotaSuelta[4] barraSuelta[color] heladoVuelo charcoHelado[2]
 *   alexHeld[id][bird|nobird] { walk:{dir:[4]} swing:{dir:[3]} }   alexKick[bird|nobird] { right left down up }
 * Los zvar tambien se registran (perezoso) en ACH.sprites.zvar con la misma clave.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px;
var S = ACH.sprites = ACH.sprites || {};
if (!px || !px.G) return;
var T0 = (window.performance && performance.now) ? performance.now() : Date.now();
var CV = S.cv = S.cv || {};
var PJ = CV.pj = CV.pj || {};
var G = px.G;
function safe(name, fn) { try { fn(); } catch (e) { if (window.console) console.warn('[cv-arte-personajes] ' + name + ':', e); } }
function mkCv(w, h) { var c = (px.canvas ? px.canvas(w, h) : null); if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; } return c; }
/* Horneado perezoso: la propiedad se hornea al primer acceso y se vuelve un valor normal. */
var LAZY = [];
function lazy(obj, key, fn, enumerable) {
  var tries = 0, en = enumerable !== false, def = function (v) { Object.defineProperty(obj, key, { value: v, writable: true, enumerable: en, configurable: true }); return v; };
  Object.defineProperty(obj, key, {
    enumerable: en, configurable: true,
    get: function () {
      var v = null;
      try { v = fn(); } catch (e) { if (window.console) console.warn('[cv-arte-personajes] ' + key + ':', e); }
      if ((v === null || v === undefined) && ++tries < 3) return null;
      return def(v);
    },
    set: function (v) { def(v); }
  });
  LAZY.push(function () { return obj[key]; });
}

/* ======================== COLOR Y BUFFER ======================== */
var colCache = {};
function col(h) {                                            // '#rrggbb' -> uint32 (ABGR, little endian)
  var v = colCache[h];
  if (v === undefined) { var r = px.hex2rgb(h); v = colCache[h] = ((255 << 24) | (r[2] << 16) | (r[1] << 8) | r[0]) >>> 0; }
  return v;
}
function ramp(a) { return a.map(col); }                      // lista de hex -> lista de uint32
var K = col('#141216'), RIM_HI = col('#d5dbe0'), RIM_LO = col('#9fb0c4'), WHITE = 0xFFFFFFFF;

function Buf(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); }
Buf.prototype.set = function (x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; };
Buf.prototype.get = function (x, y) { return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.d[y * this.w + x] : 0; };
Buf.prototype.rect = function (x, y, w, h, c) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.set(x + i, y + j, c); };
Buf.prototype.line = function (x0, y0, x1, y1, c) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, e = dx + dy;
  for (var n = 0; n < 300; n++) {
    this.set(x0, y0, c);
    if (x0 === x1 && y0 === y1) break;
    var e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
};
Buf.prototype.disc = function (cx, cy, r, c) {
  for (var y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (var x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) this.set(x, y, c);
};
Buf.prototype.blit = function (s, ox, oy) {
  for (var y = 0; y < s.h; y++) for (var x = 0; x < s.w; x++) { var c = s.d[y * s.w + x]; if (c) this.set(x + ox, y + oy, c); }
};
/* Contorno de 1 px (4 vecinos) + luz de borde fria arriba/izquierda, igual que outlineRim de sprites.js */
Buf.prototype.outlineRim = function () {
  var w = this.w, h = this.h, d = this.d, i, x, y, add = [];
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    i = y * w + x; if (d[i]) continue;
    if ((x > 0 && d[i - 1]) || (x < w - 1 && d[i + 1]) || (y > 0 && d[i - w]) || (y < h - 1 && d[i + w])) add.push(i);
  }
  for (i = 0; i < add.length; i++) d[add[i]] = K;
  var ed = [];
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    i = y * w + x; if (d[i] !== K) continue;
    var up = y > 0 ? d[i - w] : 0, lf = x > 0 ? d[i - 1] : 0, dn = y < h - 1 ? d[i + w] : 0, rt = x < w - 1 ? d[i + 1] : 0;
    var top = !up && dn && dn !== K, left = !lf && rt && rt !== K;
    if (top || left) ed.push(i, y < h * 0.5 ? RIM_HI : RIM_LO);
  }
  for (i = 0; i < ed.length; i += 2) d[ed[i]] = ed[i + 1];
  return this;
};
Buf.prototype.solid = function () { var n = new Buf(this.w, this.h); for (var i = 0; i < this.d.length; i++) if (this.d[i]) n.d[i] = WHITE; return n; };
Buf.prototype.toCanvas = function (ax, ay, fw, fh) {
  var c = mkCv(this.w, this.h);
  var ctx = c.getContext('2d'), img = ctx.createImageData(this.w, this.h);
  new Uint32Array(img.data.buffer).set(this.d);
  ctx.putImageData(img, 0, 0);
  if (ax !== undefined) { c.ax = ax; c.ay = ay; }
  if (fw !== undefined) { c.fw = fw; c.fh = fh; }
  return c;
};
var RDC = (typeof Map === 'function') ? new Map() : null;
function fromCanvas(cv) {                                    // canvas -> Buf (para componer sobre sprites ya hechos); cada lienzo se lee una sola vez
  var src = RDC && RDC.get(cv);
  if (!src) { src = new Uint32Array(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data.buffer.slice(0)); if (RDC) RDC.set(cv, src); }
  var b = new Buf(cv.width, cv.height);
  b.d.set(src);
  return b;
}

/* ======================== MASCARAS Y PINTURA CON BISEL ======================== */
/* Una mascara de trabajo (compartida). Las primitivas la llenan; paint() la pinta con luz arriba-izquierda:
   borde superior/izquierdo = paso claro de la rampa, inferior/derecho = paso oscuro, interior = base. */
var MK = { a: new Uint8Array(64 * 64), w: 0, h: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1 };
function mkBegin(b) { MK.w = b.w; MK.h = b.h; MK.x0 = MK.y0 = 1e9; MK.x1 = MK.y1 = -1; }
function mkSet(x, y) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= MK.w || y >= MK.h) return;
  MK.a[y * MK.w + x] = 1;
  if (x < MK.x0) MK.x0 = x; if (x > MK.x1) MK.x1 = x; if (y < MK.y0) MK.y0 = y; if (y > MK.y1) MK.y1 = y;
}
function mkLine(x0, y0, x1, y1, t) {                         // trazo de t x t px a lo largo de una recta
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  t = t || 1;
  var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, e = dx + dy, o = (t - 1) >> 1;
  for (var n = 0; n < 300; n++) {
    for (var j = 0; j < t; j++) for (var i = 0; i < t; i++) mkSet(x0 - o + i, y0 - o + j);
    if (x0 === x1 && y0 === y1) break;
    var e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}
function mkRect(x, y, w, h) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) mkSet(x + i, y + j); }
function mkEll(cx, cy, rx, ry) {
  for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy <= 1) mkSet(x, y);
  }
}
function mkRows(rows, x0, y0) { for (var k = 0; k < rows.length; k++) for (var x = rows[k][1]; x <= rows[k][2]; x++) mkSet(x0 + x, y0 + rows[k][0]); }
/* Torso: ejes de (sx,sy) a (hx,hy) con ancho wS arriba y wH abajo; el ancho se mide perpendicular al eje */
function mkTorso(sx, sy, hx, hy, wS, wH) {
  var dx = hx - sx, dy = hy - sy, len = Math.sqrt(dx * dx + dy * dy) || 1, n = Math.ceil(len * 2);
  var ux = dx / len, uy = dy / len, pxx = -uy, pyy = ux;
  if (pxx < 0 || (pxx === 0 && pyy < 0)) { pxx = -pxx; pyy = -pyy; }       // perpendicular apuntando al "frente" (derecha)
  for (var i = 0; i <= n; i++) {
    var t = i / n, cx = sx + dx * t, cy = sy + dy * t, w = wS + (wH - wS) * t;
    var ax = cx - pxx * (w - 1) / 2, ay = cy - pyy * (w - 1) / 2, bx = cx + pxx * (w - 1) / 2, by = cy + pyy * (w - 1) / 2;
    mkLine(ax, ay, bx, by, 1);
  }
}
function mkClear() {
  var a = MK.a, w = MK.w;
  for (var y = MK.y0; y <= MK.y1; y++) for (var x = MK.x0; x <= MK.x1; x++) a[y * w + x] = 0;
  MK.x0 = MK.y0 = 1e9; MK.x1 = MK.y1 = -1;
}
/* Pinta la mascara en b con rampa r = [oscuro, base, claro]. hook(x, y, s) puede devolver otro color. Limpia la mascara. */
function paint(b, r, hook) {
  var a = MK.a, w = MK.w, h = MK.h, d = b.d;
  for (var y = MK.y0; y <= MK.y1; y++) for (var x = MK.x0; x <= MK.x1; x++) {
    var i = y * w + x; if (!a[i]) continue;
    var s = (x > 0 && a[i - 1] ? 0 : 1) + (y > 0 && a[i - w] ? 0 : 1) - (x < w - 1 && a[i + 1] ? 0 : 1) - (y < h - 1 && a[i + w] ? 0 : 1);
    var c = s > 0 ? r[2] : s < 0 ? r[0] : r[1];
    if (hook) { var o = hook(x, y, s); if (o) c = o; }
    d[i] = c;
  }
  mkClear();
}
/* Variantes para dibujar con un solo gesto */
function pLine(b, x0, y0, x1, y1, t, r, hook) { mkBegin(b); mkLine(x0, y0, x1, y1, t); paint(b, r, hook); }
function pRect(b, x, y, w, h, r, hook) { mkBegin(b); mkRect(x, y, w, h); paint(b, r, hook); }
function pEll(b, cx, cy, rx, ry, r, hook) { mkBegin(b); mkEll(cx, cy, rx, ry); paint(b, r, hook); }
function pRows(b, rows, x0, y0, r, hook) { mkBegin(b); mkRows(rows, x0, y0); paint(b, r, hook); }

/* ======================== IK DE DOS SEGMENTOS ======================== */
/* Devuelve la articulacion (codo o rodilla). bend = +1 dobla hacia +x cuando el miembro apunta hacia abajo (rodilla); -1 hacia atras (codo). */
function ik(ax, ay, bx, by, l1, l2, bend) {
  var dx = bx - ax, dy = by - ay, d = Math.sqrt(dx * dx + dy * dy);
  if (d < 0.001) d = 0.001;
  var dd = Math.min(d, l1 + l2 - 0.02); dd = Math.max(dd, Math.abs(l1 - l2) + 0.02);
  var a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  var ux = dx / d, uy = dy / d;
  return [ax + ux * a + uy * h * bend, ay + uy * a - ux * h * bend];
}
function lerp(a, b, t) { return a + (b - a) * t; }
function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }

/* ======================== CUERPOS ======================== */
/* Tres alturas con proporcion propia (cabeza, torso y piernas no se escalan juntos). hip = fila central de la base del torso
   (y negativo = hacia arriba, 0 = suelo); thigh+shin = un poco mas que la distancia cadera-tobillo (la rodilla nunca queda recta). */
var HEIGHTS = {
  bajo:   { hpx: 24, head: 7, torso: 7,  legD: 7,  thigh: 3.8, shin: 3.7, ua: 3.2, fa: 3.2, tw: 7 },
  normal: { hpx: 28, head: 8, torso: 8,  legD: 9,  thigh: 4.8, shin: 4.7, ua: 4,   fa: 4,   tw: 9 },
  alto:   { hpx: 34, head: 8, torso: 10, legD: 13, thigh: 6.8, shin: 6.6, ua: 5.4, fa: 5.2, tw: 9 }
};
var BUILDS = { '': { }, Flaco: { dtw: -2, thin: 1 }, Ancho: { dtw: 3, belly: 1, fat: 1 }, Joroba: { hunch: 2 } };
var bodyCache = {};
function bodyOf(name) {                                      // 'normalFlaco' -> definicion completa
  if (bodyCache[name]) return bodyCache[name];
  var m = /^(bajo|normal|alto)(Flaco|Ancho|Joroba)?$/.exec(name), h = HEIGHTS[m[1]], bl = BUILDS[m[2] || ''];
  var b = { name: name, h: m[1], hpx: h.hpx, head: h.head, torso: h.torso, legD: h.legD, thigh: h.thigh, shin: h.shin, ua: h.ua, fa: h.fa,
    tw: h.tw + (bl.dtw || 0), belly: bl.belly || 0, hunch: bl.hunch || 0, thin: bl.thin || 0, fat: bl.fat || 0 };
  b.hipY = -1 - b.legD;                                      // fila central de la base del torso
  b.shY = b.hipY - (b.torso - 1);                            // fila central de la fila superior del torso
  b.tL = b.fat ? 4 : 3; b.tS = b.thin ? 2 : 2;               // grosor muslo / pantorrilla
  b.aT = b.fat ? 3 : 2;                                       // grosor del brazo
  return bodyCache[name] = b;
}

/* ======================== PIEL, PELO, SANGRE ======================== */
/* Rampas de 4 pasos: [sombra profunda, sombra, base, luz]. Matiz de la muerte: verde, gris, palido, amarillo, morado, marron. */
var TONES = {
  verde:    ramp(['#3f4a44', '#5f6b55', '#7f8c71', '#a3ad8a']),
  gris:     ramp(['#3a3f46', '#575d66', '#7a8189', '#a2a8aa']),
  palido:   ramp(['#4d4543', '#736760', '#9a8d7d', '#c2b7a0']),
  amarillo: ramp(['#47432f', '#6b663c', '#948a52', '#bab172']),
  morado:   ramp(['#38343f', '#524c5e', '#736d7c', '#989299']),
  marron:   ramp(['#38292a', '#573f35', '#7a5a45', '#9f7d62'])
};
var HAIRS = {
  negro:  ramp(['#0e0c0e', '#241e1f', '#3e3434', '#5a4c46']),
  casta:  ramp(['#1c120f', '#3a2519', '#5e402b', '#85603f']),
  gris:   ramp(['#3a3a3a', '#6a6964', '#9a988e', '#c4c1b3']),
  rubio:  ramp(['#4a3c20', '#7a6636', '#a88f4c', '#cdb468']),
  rojizo: ramp(['#3a1812', '#6a2c1c', '#984628', '#c4683a'])
};
var C_EYE = col('#eef0d2'), C_EYE2 = col('#a8ad8c'), C_MOUTH = col('#241214'), C_TONGUE = col('#6a2a2c');
var BLOOD = ramp(['#3a1518', '#5b1d1d', '#7a2a26', '#9a3a30']);

/* ======================== CABEZA (perfil 3/4 mirando a la derecha) ======================== */
/* Siluetas por fila: [fila, xmin, xmax] con la cabeza de 8 de alto (el nariz sale a la columna 8). Las de 7 quitan la fila 2. */
var SKULL8 = [[0, 2, 5], [1, 1, 6], [2, 0, 7], [3, 0, 7], [4, 0, 8], [5, 0, 7], [6, 1, 7], [7, 2, 6]];
var HAIR8 = {
  calvo:  [[3, 0, 0], [4, 0, 0]],
  corto:  [[0, 2, 5], [1, 1, 6], [2, 0, 5], [3, 0, 2], [4, 0, 1]],
  largo:  [[0, 2, 5], [1, 1, 6], [2, -1, 5], [3, -1, 3], [4, -1, 2], [5, -1, 2], [6, -1, 1], [7, -1, 1]],
  grena:  [[-1, 2, 4], [0, 1, 6], [1, 0, 7], [2, -1, 6], [3, -1, 3], [4, -1, 2], [5, -1, 2], [6, 0, 1]],
  cana:   [[0, 2, 5], [1, 1, 5], [2, 0, 3], [3, 0, 1]]
};
var HATS8 = {
  casco:  [[-2, 2, 5], [-1, 1, 6], [0, 0, 7], [1, 0, 7], [2, -1, 9]],
  toque:  [[-4, 2, 5], [-3, 1, 6], [-2, 1, 6], [-1, 1, 6], [0, 1, 6], [1, 0, 7]],
  cofia:  [[-1, 2, 6], [0, 1, 6]],
  gorra:  [[0, 1, 6], [1, 0, 7], [2, 0, 7], [2, 8, 10]],
  visera: [[1, 1, 6], [2, 0, 7], [2, 8, 10]]
};
function squish(rows) {                                      // cabeza de 7: la fila 2 se funde con la 1 y las de abajo suben
  var out = [];
  for (var i = 0; i < rows.length; i++) { var r = rows[i], y = r[0]; out.push([y > 2 ? y - 1 : (y === 2 ? 1 : y), r[1], r[2]]); }
  return out;
}
function rowsFor(rows, sq) { return sq ? squish(rows) : rows; }

function drawHead(b, cx, cy, P, face) {
  var bd = P.bd, sq = bd.head === 7, X0 = Math.round(cx) - 4, Y0 = Math.round(cy - (bd.head - 1) / 2), sk = P.skin, rr = sq ? 1 : 0;
  var Yr = function (r) { return Y0 + (sq ? (r > 2 ? r - 1 : (r === 2 ? 1 : r)) : r); };          // fila de la cara en la cabeza de 8 -> de 7
  face = face || {};
  // cuello (sombra bajo la barbilla)
  pRect(b, X0 + 2, Y0 + bd.head - 2, 4, 3, [sk[0], sk[1], sk[1]]);
  // craneo
  var skull = sq ? squish(SKULL8) : SKULL8;
  pRows(b, skull, X0, Y0, N(sk));
  // mejilla hundida, oreja, pomulo, rasgos de podredumbre
  b.set(X0 + 4, Yr(5), sk[1]);
  b.set(X0 + 2, Yr(4), sk[1]); b.set(X0 + 2, Yr(3), sk[0]);
  b.set(X0 + 7, Yr(3), sk[3]); b.set(X0 + 6, Yr(2), sk[3]);
  if (P.rot) for (var i = 0; i < P.rot.length; i++) { var q = P.rot[i]; b.set(X0 + q[0], Yr(q[1]), q[2] ? sk[3] : sk[0]); }
  // pelo
  var hs = P.hair;
  if (hs && HAIR8[hs] && !P.ou.hat) pRows(b, rowsFor(HAIR8[hs], sq), X0, Y0, N(P.hc));
  else if (hs && HAIR8[hs] && P.ou.hat) pRows(b, rowsFor(HAIR8[hs === 'calvo' ? 'cana' : hs], sq), X0, Y0, N(P.hc));
  // ojos
  var ey = Yr(3), blind = face.blind;
  if (blind) { b.rect(X0 + 3, ey, 5, 1, col('#cfcbbb')); }
  else {
    b.set(X0 + 5, ey, C_EYE); b.set(X0 + 7, ey, C_EYE2);
    b.set(X0 + 5, Yr(2), sk[0]); b.set(X0 + 6, Yr(2), sk[0]);                      // ceja pesada
  }
  // boca
  var m = face.mouth || 'closed', my = Yr(6);
  if (m === 'closed') { b.set(X0 + 6, my, C_MOUTH); b.set(X0 + 5, my, sk[0]); }
  else if (m === 'slack') { b.rect(X0 + 5, my - 1, 2, 2, C_MOUTH); b.set(X0 + 6, my + 0, C_TONGUE); b.set(X0 + 7, my, sk[0]); }
  else if (m === 'wide') { b.rect(X0 + 5, my - 1, 3, 3, C_MOUTH); b.set(X0 + 6, my + 1, C_TONGUE); b.set(X0 + 7, my + 1, C_TONGUE); b.set(X0 + 5, my - 1, C_EYE); b.set(X0 + 7, my - 1, C_EYE); }
  if (P.faceBlood) { b.set(X0 + 6, my + 1, BLOOD[2]); if (P.faceBlood > 1) { b.set(X0 + 5, my + 1, BLOOD[1]); b.set(X0 + 4, Yr(4), BLOOD[1]); } }
  // gorro / casco
  var ht = P.ou.hat;
  if (ht && HATS8[ht]) {
    var hr = rowsFor(HATS8[ht], sq);
    pRows(b, hr, X0, Y0, N(P.ou.hatR || P.ou.top));
    if (ht === 'casco') { b.set(X0 + 4, Y0 - 1, P.ou.hatR[3]); b.rect(X0 + 1, Y0 + 2, 8, 1, P.ou.hatR[0]); }
    if (ht === 'toque') { b.rect(X0 + 1, Y0 + 1, 7, 1, P.ou.hatR[0]); }
    if (ht === 'cofia') { b.set(X0 + 4, Y0 - 1, P.ou.trim ? P.ou.trim[2] : P.ou.hatR[0]); }
    if (ht === "gorra" || ht === "visera") { b.rect(X0 + 8, Y0 + 2, 3, 1, P.ou.hatR[0]); }
  }
}

/* ======================== ATUENDOS ======================== */
/* Rampas [sombra profunda, sombra, base, luz]. top = torso, slvR = manga (si no es top), bot = pantalon, shoe = calzado, trim = detalle. */
function N(r) { return [r[1], r[2], r[3]]; }                 // pasos de cerca
function F(r) { return [r[0], r[1], r[2]]; }                 // pasos de lejos (un paso mas oscuro)
function tset(c, x, y, col_) { var t = c.tr; if (t && y >= t.y0 && y <= t.y1 && x >= t.x0[y] && x <= t.x1[y]) c.b.set(x, y, col_); }
function tpick(c, v) { return c.tr.y0 + Math.round((c.tr.y1 - c.tr.y0) * v); }

/* ======================== EXTREMIDADES ======================== */
function drawShoe(c, ax, ay, near, pitch) {
  var ou = c.ou, b = c.b, r = near ? N(ou.shoe) : F(ou.shoe);
  mkBegin(b);
  if (pitch === 1) { mkRect(ax, ay, 2, 3); mkSet(ax + 2, ay + 2); }
  else if (pitch === -1) { mkRect(ax - 1, ay + 1, 3, 1); mkRect(ax, ay, 3, 1); }
  else { mkRect(ax - 1, ay, 4, 2); }
  paint(b, r);
  if (ou.sandal) {                                           // chancleta: la suela es la sombra y arriba se ve el pie
    var sr = near ? N(c.skin) : F(c.skin);
    if (pitch === 0) { b.rect(ax, ay, 3, 1, sr[2]); b.rect(ax - 1, ay + 1, 4, 1, r[0]); b.set(ax + 1, ay, r[2]); b.set(ax - 1, ay, 0); }
  }
}
function legHook(c, near) {
  var ou = c.ou;
  if (ou.legPat === 'check') { var lo = (near ? ou.bot[0] : ou.bot[0]); return function (x, y) { return ((x + y) & 1) ? lo : 0; }; }
  return null;
}
function drawLeg(c, hip, ank, near, pitch, o) {
  o = o || {};
  var bd = c.bd, ou = c.ou, b = c.b;
  var J = ik(hip[0], hip[1], ank[0], ank[1], bd.thigh, bd.shin, o.bend === undefined ? 1 : o.bend);
  var rp = near ? N(ou.bot) : F(ou.bot), rs = near ? N(c.skin) : F(c.skin);
  if (o.stump) {                                             // pierna amputada: muslo corto con vendaje
    var E = [lerp(hip[0], J[0], o.stump), lerp(hip[1], J[1], o.stump)];
    mkBegin(b); mkLine(hip[0], hip[1], E[0], E[1], bd.tL); paint(b, rp, legHook(c, near));
    var cl = near ? N(ramp(['#6a6c78', '#a4a6b0', '#dcdcda', '#fbfaf2'])) : F(ramp(['#6a6c78', '#a4a6b0', '#dcdcda', '#fbfaf2']));
    mkBegin(b); mkLine(E[0], E[1], E[0] + (J[0] - hip[0]) * 0.18, E[1] + (J[1] - hip[1]) * 0.18, bd.tL); paint(b, cl);
    b.set(E[0] + (J[0] - hip[0]) * 0.2, E[1] + (J[1] - hip[1]) * 0.2 + 1, BLOOD[2]);
    return;
  }
  if (ou.legs === 'short') {
    mkBegin(b); mkLine(hip[0], hip[1], J[0], J[1], bd.tL); mkLine(J[0], J[1], ank[0], ank[1], bd.tS); paint(b, rs);
    var P2 = [lerp(hip[0], J[0], 0.74), lerp(hip[1], J[1], 0.74)];
    mkBegin(b); mkLine(hip[0], hip[1], P2[0], P2[1], bd.tL); paint(b, rp);
  } else {
    mkBegin(b); mkLine(hip[0], hip[1], J[0], J[1], bd.tL); mkLine(J[0], J[1], ank[0], ank[1], bd.tS); paint(b, rp, legHook(c, near));
    if (ou.stripe) stripeLine(b, hip, J, ank, ou.stripe, rp);
  }
  if (o.cast) {                                              // yeso blanco en la pantorrilla
    var cr = near ? N(ramp(['#6a6c78', '#a4a6b0', '#dcdcda', '#fbfaf2'])) : F(ramp(['#6a6c78', '#a4a6b0', '#dcdcda', '#fbfaf2']));
    mkBegin(b); mkLine(lerp(J[0], ank[0], 0.1), lerp(J[1], ank[1], 0.1), lerp(J[0], ank[0], 0.85), lerp(J[1], ank[1], 0.85), bd.tS + 1); paint(b, cr);
  }
  if (!o.noShoe) drawShoe(c, Math.round(ank[0]), Math.round(ank[1]), near, pitch || 0);
}
function stripeLine(b, a, j, e, color, r) {                  // franja lateral: solo sobre pixeles ya pintados con la rampa del pantalon
  var pts = [[a, j], [j, e]];
  for (var k = 0; k < 2; k++) {
    var x0 = Math.round(pts[k][0][0]), y0 = Math.round(pts[k][0][1]), x1 = Math.round(pts[k][1][0]), y1 = Math.round(pts[k][1][1]);
    var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, er = dx + dy;
    for (var n = 0; n < 60; n++) {
      var cur = b.get(x0, y0);
      if (cur === r[0] || cur === r[1] || cur === r[2]) b.set(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * er; if (e2 >= dy) { er += dy; x0 += sx; } if (e2 <= dx) { er += dx; y0 += sy; }
    }
  }
}
function drawArm(c, sh, hand, near, bend, o) {
  o = o || {};
  var bd = c.bd, ou = c.ou, b = c.b;
  var J = ik(sh[0], sh[1], hand[0], hand[1], bd.ua, bd.fa, bend === undefined ? -1 : bend);
  var rs = near ? N(c.skin) : F(c.skin), rl = near ? N(ou.slvR || ou.top) : F(ou.slvR || ou.top), t = bd.aT, slv = o.slv || ou.slv;
  if (slv === 'long') {
    var K1 = [lerp(J[0], hand[0], 0.78), lerp(J[1], hand[1], 0.78)];
    mkBegin(b); mkLine(sh[0], sh[1], J[0], J[1], t); mkLine(J[0], J[1], K1[0], K1[1], 2); paint(b, rl);
    if (ou.stripe) stripeLine(b, sh, J, K1, ou.stripe, rl);
  } else if (slv === 'short') {
    mkBegin(b); mkLine(J[0], J[1], hand[0], hand[1], 2); paint(b, rs);
    mkBegin(b); mkLine(sh[0], sh[1], J[0], J[1], t); paint(b, rl, ou.slvPat ? function (x, y) { return hash(x * 13 + y * 5 + c.P.seed) < 0.18 ? col('#f4cc3c') : 0; } : null);
  } else {
    mkBegin(b); mkLine(sh[0], sh[1], J[0], J[1], t); mkLine(J[0], J[1], hand[0], hand[1], 2); paint(b, rs);
  }
  if (o.nohand) return J;
  mkBegin(b); if (o.big) { mkRect(Math.round(hand[0]) - 1, Math.round(hand[1]) - 1, 3, 3); paint(b, rs); b.set(Math.round(hand[0]) + 1, Math.round(hand[1]) + 1, near ? c.skin[0] : c.skin[0]); b.set(Math.round(hand[0]) - 1, Math.round(hand[1]) - 1, near ? c.skin[3] : c.skin[2]); } else { mkRect(Math.round(hand[0]) - (o.hx === undefined ? 1 : o.hx), Math.round(hand[1]) - (o.hy === undefined ? 1 : o.hy), 2, 2); paint(b, rs); }
  if (c.P.handBlood && near) b.set(hand[0], hand[1] + 1, BLOOD[2]);
  return J;
}

/* ======================== FIGURA ======================== */
/* P: { b, ox, oy, bd, ou, skin(4), hair, hc, seed, ... }   pz: { H:[x,y], S:[x,y], hd:[dx,dy], aN, aF, lN, lF, mouth, back, front }
   (coordenadas de mundo: x a la derecha, y hacia abajo, 0 = suelo; se suman ox, oy al dibujar) */
function drawFigure(b, P, pz) {
  var bd = P.bd, ou = P.ou, ox = P.ox, oy = P.oy;
  var c = { b: b, P: P, bd: bd, ou: ou, skin: P.skin, ox: ox, oy: oy };
  var Hx = ox + pz.H[0], Hy = oy + pz.H[1], Sx = ox + pz.S[0], Sy = oy + pz.S[1];
  function W(p) { return [ox + p[0], oy + p[1]]; }
  if (pz.back) pz.back(c);
  // brazo y pierna de atras (un paso mas oscuros)
  if (pz.aF) drawArm(c, [Sx - 1, Sy + 1], W(pz.aF.h), false, pz.aF.b, pz.aF);
  if (pz.lF) drawLeg(c, [Hx - 1, Hy], W(pz.lF.f), false, pz.lF.p, pz.lF);
  // torso
  mkBegin(b);
  var wS = pz.tw || bd.tw, wH = pz.tw || bd.tw - 1, hz = !!pz.horiz;
  c.horiz = hz;
  mkTorso(Sx, Sy, Hx, Hy, wS, wH);
  if (bd.belly && !hz) mkEll(Math.max(Sx, Hx) + 1 + (bd.tw - 7) * 0.3, (Sy + Hy) / 2 + 1, 3.2, 3.6);
  if (bd.hunch && !hz) mkEll(Sx - bd.tw / 2 + 0.5, Sy + 0.5, 2.6, 2.6);
  var tr = { y0: MK.y0, y1: MK.y1, x0: {}, x1: {} }, y, x;
  for (y = MK.y0; y <= MK.y1; y++) for (x = MK.x0; x <= MK.x1; x++) if (MK.a[y * MK.w + x]) { if (tr.x0[y] === undefined) tr.x0[y] = x; tr.x1[y] = x; }
  c.tr = tr; mkClear();
  if (ou.behind && !P.spec.noBag) ou.behind(c);
  mkBegin(b);
  // (la mascara se llenó antes del 'behind'; se vuelve a llenar)
  mkTorso(Sx, Sy, Hx, Hy, wS, wH);
  if (bd.belly && !hz) mkEll(Math.max(Sx, Hx) + 1 + (bd.tw - 7) * 0.3, (Sy + Hy) / 2 + 1, 3.2, 3.6);
  if (bd.hunch && !hz) mkEll(Sx - bd.tw / 2 + 0.5, Sy + 0.5, 2.6, 2.6);
  paint(b, N(ou.top));
  if (hz) decoH(c); else if (ou.deco) ou.deco(c);
  wear(c);
  // cabeza
  var hd = pz.hd || [0, 0];
  drawHead(b, Sx + hd[0], Sy - (bd.head - 1) / 2 - 1 + hd[1] + 0.5, P, { mouth: pz.mouth, blind: P.blind });
  // pierna y brazo de adelante
  if (pz.lN) drawLeg(c, [Hx + 0.5, Hy], W(pz.lN.f), true, pz.lN.p, pz.lN);
  if (pz.aN && !pz.armLate) drawArm(c, [Sx + 0.5, Sy + 1], W(pz.aN.h), true, pz.aN.b, pz.aN);
  if (pz.front) pz.front(c);
  if (pz.aN && pz.armLate) drawArm(c, [Sx + 0.5, Sy + 1], W(pz.aN.h), true, pz.aN.b, pz.aN);
  if (pz.late) pz.late(c);
  return c;
}
/* Desgaste: rotos que dejan ver piel podrida, sangre justa, ruedo deshilachado */
function wear(c) {
  var P = c.P, t = c.tr, h = P.seed * 7 + 3, n = P.wear === undefined ? 1 : P.wear, i, sk = c.skin;
  for (i = 0; i < n; i++) {
    var y = t.y0 + 1 + Math.floor(hash(h + i * 3) * Math.max(1, t.y1 - t.y0 - 2)), w = t.x1[y] - t.x0[y] - 1;
    var x = t.x0[y] + 1 + Math.floor(hash(h + i * 5 + 1) * Math.max(1, w - 2));
    tset(c, x, y, sk[1]); tset(c, x + 1, y, sk[2]); tset(c, x, y + 1, sk[0]);
    if (P.blood && i === 0) { tset(c, x + 1, y + 1, BLOOD[2]); tset(c, x + 2, y + 1, BLOOD[1]); if (P.blood > 1) tset(c, x, y + 2, BLOOD[1]); }
  }
  var yb = t.y1;
  for (var xx = t.x0[yb]; xx <= t.x1[yb]; xx++) if (hash(h + xx * 11) < 0.25) tset(c, xx, yb, c.ou.top[1]);
}

var SIN = Math.sin, COS = Math.cos, PI = Math.PI, abs = Math.abs, max = Math.max, min = Math.min, round = Math.round;
function decoH() {}                                          // (torso horizontal: no se usa aqui)
function baseCv(bd, W, ox, up) { var H = bd.hpx + 5 + (up || 0); return { W: W, H: H, ox: ox, oy: H - 2 }; }
function apronDeco(apr, mark, top0) {
  return function (c) {
    var t = c.tr, y, x, y0 = tpick(c, top0 === undefined ? 0.2 : top0);
    for (y = y0; y <= t.y1; y++) for (x = t.x0[y] + 1; x <= t.x1[y]; x++)
      tset(c, x, y, y === y0 ? apr[3] : (x === t.x0[y] + 1 || x === t.x1[y] ? apr[1] : apr[2]));
    for (y = t.y0; y < y0; y++) tset(c, t.x1[y] - 1, y, apr[1]);              // tirante al cuello
    tset(c, t.x1[t.y0], t.y0, c.skin[2]);
    if (mark) mark(c, y0);
  };
}
function dot(c, dx, y, col_, n) { var t = c.tr; for (var i = 0; i < (n || 1); i++) tset(c, t.x1[y] - dx + i, y, col_); }
/* ======================== UTILES PARA REJILLAS G ======================== */
var CHP = px.chars || null;
function fin(g, ax, ay, fw, fh) {                            // contorno + luz de borde (la misma de sprites.js) y a lienzo
  if (CHP && CHP.outlineRim) CHP.outlineRim(g); else g.outline('#141216');
  return CHP && CHP.mkC ? CHP.mkC(g, ax, ay, fw, fh) : g.toCanvas(ax, ay, fw, fh);
}
function flatC(g, ax, ay, fw, fh) { return CHP && CHP.mkC ? CHP.mkC(g, ax, ay, fw, fh) : g.toCanvas(ax, ay, fw, fh); }
function span(g, y, x0, x1, r) {                             // fila con bisel: luz a la izquierda, sombra a la derecha
  x0 = Math.round(x0); x1 = Math.round(x1);
  for (var x = x0; x <= x1; x++) g.set(x, y, x === x0 ? r[3] : (x === x1 ? r[0] : (x === x1 - 1 && x1 - x0 > 2 ? r[1] : r[2])));
}
function blobG(g, cx, cy, rx, ry, r) {                       // elipse con luz arriba-izquierda (rampa de 4 colores hex)
  for (var y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (var x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy > 1) continue;
    var lit = -(dx * 0.6 + dy * 0.85);
    g.set(x, y, r[lit > 0.55 ? 3 : (lit > 0.0 ? 2 : (lit > -0.55 ? 1 : 0))]);
  }
}
function limbG(g, x0, y0, x1, y1, r, t) {                    // tubo de grosor t (2 o 3): luz arriba/izquierda, sombra abajo/derecha
  var horiz = Math.abs(x1 - x0) > Math.abs(y1 - y0), a = horiz ? [0, -1] : [-1, 0], b = horiz ? [0, 1] : [1, 0];
  g.line(x0, y0, x1, y1, r[2]);
  g.line(x0 + a[0], y0 + a[1], x1 + a[0], y1 + a[1], r[3]);
  if (t >= 2) g.line(x0 + b[0], y0 + b[1], x1 + b[0], y1 + b[1], t >= 3 ? r[1] : r[1]);
  if (t >= 4) { g.line(x0 + 2 * b[0], y0 + 2 * b[1], x1 + 2 * b[0], y1 + 2 * b[1], r[0]); }
}
function ik2(sx, sy, hx, hy, l1, l2, bend) {                 // codo de dos segmentos
  var dx = hx - sx, dy = hy - sy, d = Math.sqrt(dx * dx + dy * dy) || 0.01, dd = Math.min(d, l1 + l2 - 0.02);
  var a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), ux = dx / d, uy = dy / d;
  return [sx + ux * a + uy * h * bend, sy + uy * a - ux * h * bend];
}
function handG(g, x, y, sk, fist) {                           // mano de 3x3 con luz
  x = Math.round(x); y = Math.round(y);
  g.rect(x - 1, y - 1, 3, 3, sk[2]); g.set(x - 1, y - 1, sk[3]); g.set(x, y - 1, sk[3]); g.set(x + 1, y + 1, sk[1]);
  if (fist) g.set(x, y + 0, sk[1]);
}

/* lo que cada uno lleva en la mano (sigue en su chamba) */
var PROPS = {
  cup:      { rows: ['.KK.', 'WWWW', 'GGGG', 'WWWw', '.ww.'], c: { K: '#2a2a2a', W: '#f4f3ec', w: '#b0b0a6', G: '#0a7a52' } },
  burger:   { rows: ['.TTT.', 'GGGGG', 'PPPPP', '.BBB.'], c: { T: '#e0b048', G: '#5aa040', P: '#4a2a1c', B: '#b9853a' } },
  sandwich: { rows: ['BBBBBB', 'FFOFFF', 'BBBBBB'], c: { B: '#dcae4c', F: '#8a4b38', O: '#e08ca4' } },
  wok:      { rows: ['.CCC.', 'RRRRR', 'RkRRR', '.RRR.'], c: { C: '#efe8d0', R: '#d40a18', k: '#26262e' } },      // caja de chaufa para llevar
  chicken:  { rows: ['.OOO', 'OOoO', '.OO.', '..W.'], c: { O: '#d08a2c', o: '#8a5418', W: '#f0ecdc' } },
  scanner:  { rows: ['.KK', 'KKK', 'KRK', '.K.'], c: { K: '#3a3e46', R: '#f02a2a' } },
  bagK:     { rows: ['.WW.', 'KKKK', 'KwKK', 'KKKK', 'KKKK'], c: { K: '#26262e', W: '#e8e4d4', w: '#d92a8c' } },
  bagL:     { rows: ['.WW.', 'LLLL', 'LwLL', 'LLLL', 'LLLL'], c: { L: '#8dc63f', W: '#e8e4d4', w: '#f4f4ec' } },
  pencil:   { rows: ['RR', 'SS', 'YY', 'YY', 'YY', 'YY', 'YY', 'DD'], c: { R: '#e888a8', S: '#a8acb0', Y: '#f2b21a', D: '#2a2a2a' } }
};
function drawProp(b, name, hx, hy) {                         // la mano agarra la parte baja; el objeto asoma hacia arriba y adelante
  var p = PROPS[name]; if (!p) return;
  var w = p.rows[0].length, h = p.rows.length, x0 = Math.round(hx) - 1, y0 = Math.round(hy) - h + 2, x, y, ch;
  var edge = [];
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) { ch = p.rows[y].charAt(x); if (ch !== '.') edge.push([x0 + x, y0 + y, col(p.c[ch])]); }
  edge.forEach(function (q) { b.set(q[0] - 0, q[1], q[2]); });
}

/* ======================== ATUENDOS DE COSTA VERDE ======================== */
function rp(base) { return ramp([px.shade(base, 0.42), px.shade(base, 0.7), base, px.mix(base, '#ffffff', 0.34)]); }
var R_SHOE = ramp(['#0e0c0e', '#1e1c1c', '#352f2b', '#4f4640']);
var R_WH = ramp(['#6a6c78', '#a4a6b0', '#dcdcda', '#fbfaf2']);
var R_BLK = ramp(['#06060a', '#14141a', '#26262e', '#42424c']);
var R_CHAR = ramp(['#0c0c10', '#1c1c22', '#34343c', '#55555e']);
var R_KHAKI = ramp(['#5a4a30', '#826f46', '#ab9664', '#cebb8a']);
var R_JEAN = ramp(['#0c101e', '#1a2036', '#2c385a', '#485a84']);
var R_CREAM = ramp(['#8a7f60', '#b8ad8a', '#e2d8b8', '#f6f0d8']);
var R_YEL = ramp(['#8a5c00', '#c68a00', '#f2b21a', '#ffd75a']);
var R_RED = ramp(['#5e0309', '#a0050f', '#d40a18', '#f2503e']);
var R_SBG = ramp(['#003624', '#005c3e', '#0a8258', '#44bc90']);
var R_SKIN_FOOT = ramp(['#3f4a44', '#5f6b55', '#7f8c71', '#a3ad8a']);       // pies descalzos (surfista): igual que el tono verde
var C_REFL = col('#e8f0d8'), C_GOLD = col('#f0c838'), C_PINK = col('#ff5aa8'), C_LIME = col('#c8f03c');

/* sombreros extra (filas de la cabeza de 8: [fila, xmin, xmax]) */
HATS8.bucket = [[-1, 2, 5], [0, 1, 6], [1, -1, 9]];                 // sombrero de pescador / turista, ala ancha
HATS8.casco2 = [[-2, 2, 5], [-1, 1, 6], [0, 0, 7], [1, 0, 7], [2, 0, 8]];
HATS8.pelo = [];

/* delantal que sale desde el pecho (copia de apronDeco con tirantes) ya viene del bloque anterior (apronDeco, dot) */
function fillTorso(c, r, y0, y1) {                          // pinta el torso con bisel suave entre y0 e y1 (frac 0..1)
  var t = c.tr, a = tpick(c, y0), b = tpick(c, y1), x, y;
  for (y = a; y <= b; y++) for (x = t.x0[y]; x <= t.x1[y]; x++) tset(c, x, y, (x === t.x0[y]) ? r[3] : ((x === t.x1[y]) ? r[1] : r[2]));
}
function hband(c, f, r) { var t = c.tr, y = tpick(c, f), x; for (x = t.x0[y]; x <= t.x1[y]; x++) tset(c, x, y, r); }
function vband(c, dx, r) { var t = c.tr, y; for (y = t.y0; y <= t.y1; y++) tset(c, t.x1[y] - dx, y, r); }
function px_(c, dx, f, col_) { var t = c.tr, y = tpick(c, f); tset(c, t.x1[y] - dx, y, col_); }

var OUT = {};
/* ---- zombies de calle ---- */
OUT.corredor = {                                             // top deportivo neon sin mangas, short negro, zapatillas rosadas, audifonos
  top: rp('#b8e82a'), slv: 'none', bot: R_BLK, legs: 'short', shoe: rp('#ff3d8a'), hat: null,
  deco: function (c) {
    var t = c.tr, y;
    for (y = t.y0 + 1; y <= t.y1; y++) { tset(c, t.x1[y], y, rp('#b8e82a')[1]); }
    hband(c, 0.55, col('#ff3d8a'));
    var by = tpick(c, 0.2);                                  // dorsal con numero
    tset(c, t.x1[by] - 3, by, R_WH[3]); tset(c, t.x1[by] - 2, by, R_WH[3]); tset(c, t.x1[by] - 3, by + 1, R_WH[3]); tset(c, t.x1[by] - 2, by + 1, col('#2a2a2a'));
  }
};
OUT.turista = {                                              // camisa hawaiana turquesa con flores, short caqui, sombrero de pescador, rinonera
  top: rp('#2aa8a0'), slv: 'short', bot: R_KHAKI, legs: 'short', shoe: ramp(['#2a1c14', '#4a3224', '#6a4a34', '#8a6a4c']), hat: 'bucket', hatR: rp('#e8dcb0'),
  deco: function (c) {
    var t = c.tr, y, x, F = [col('#ff5aa8'), col('#ffd740'), col('#ffffff')], n = 0;
    for (y = t.y0 + 1; y <= t.y1 - 2; y += 2) for (x = t.x0[y] + 1 + (y % 4 ? 0 : 1); x <= t.x1[y] - 1; x += 3) tset(c, x, y, F[(n++) % 3]);
    var by = tpick(c, 0.86); for (x = t.x0[by]; x <= t.x1[by]; x++) tset(c, x, by, R_BLK[1]);       // correa de la rinonera
    var gy = t.y1 - 1; tset(c, t.x1[gy], gy, R_BLK[2]); tset(c, t.x1[gy] - 1, gy, R_BLK[2]); tset(c, t.x1[gy], gy - 1, R_BLK[3]);
    tset(c, t.x0[t.y0 + 1] + 1, t.y0 + 1, col('#2a2a2a'));   // correa de la camara al cuello
  }
};
OUT.surfista = {                                             // traje de neopreno negro y azul, roto, descalzo
  top: rp('#1d3138'), slv: 'long', bot: rp('#1d3138'), shoe: R_SKIN_FOOT, hat: null,
  deco: function (c) {
    var t = c.tr, y;
    for (y = t.y0; y <= t.y1; y++) { tset(c, t.x0[y] + 1, y, col('#ff8a2a')); tset(c, t.x0[y] + 2, y, col('#c8601c')); }      // franja naranja en la espalda
    tset(c, t.x1[t.y0 + 1], t.y0 + 1, col('#5a8a90')); hband(c, 0.8, col('#0e1a20'));
    var gy = tpick(c, 0.45); tset(c, t.x1[gy] - 1, gy, c.skin[1]); tset(c, t.x1[gy] - 2, gy, c.skin[2]); tset(c, t.x1[gy] - 1, gy + 1, c.skin[0]);   // rotura con piel
  }
};
OUT.parapentista = {                                         // campera de vuelo gris con hombros amarillos, arnes, casco naranja
  top: rp('#6a7480'), slv: 'long', slvR: rp('#6a7480'), bot: rp('#3a3e4a'), shoe: ramp(['#241a12', '#3e2c1e', '#5c4430', '#7a5e44']), hat: 'casco', hatR: rp('#f08a1c'),
  stripe: col('#f2d21a'),
  behind: function (c) {                                      // la vela doblada en la mochila, detras de la espalda
    var t = c.tr, b = c.b, y, x, k = [col('#ff5aa8'), col('#f2d21a'), col('#ff5aa8'), col('#38c8e8')], x0 = t.x0[t.y0] - 4;
    for (y = t.y0 - 1; y <= t.y1 - 1; y++) for (x = x0; x < t.x0[y] + 1; x++) b.set(x, y, k[(y - t.y0 + 1 + (x & 1)) % 4 < 2 ? ((y - t.y0 + 1) >> 1) % 4 : 2]);
    for (y = t.y0 - 1; y <= t.y1 - 1; y++) { b.set(x0, y, R_BLK[1]); b.set(t.x0[y], y, R_BLK[1]); }
    b.set(x0 + 1, t.y1, col('#c9c5b5')); b.set(x0, t.y1 + 1, col('#c9c5b5')); b.set(x0 - 1, t.y1 + 2, col('#c9c5b5'));          // cuerdas colgando
  },
  deco: function (c) {
    var t = c.tr, y;
    for (y = t.y0; y <= t.y1 - 1; y++) { tset(c, t.x1[y] - 2 - Math.floor((y - t.y0) * 0.6), y, R_BLK[1]); tset(c, t.x0[y] + 2 + Math.floor((y - t.y0) * 0.6), y, R_BLK[1]); }   // tirantes cruzados
    tset(c, t.x1[t.y0 + 3] - 3, t.y0 + 3, R_CREAM[3]);       // hebilla
    hband(c, 0.9, R_BLK[1]);
    tset(c, t.x1[t.y0], t.y0, col('#f2d21a')); tset(c, t.x0[t.y0] + 1, t.y0, col('#f2d21a'));
  }
};
OUT.seguridad = {                                            // camisa azul marino, chaleco reflectante verde fosforescente, gorra con placa
  top: rp('#1c2a4a'), slv: 'short', bot: rp('#14182a'), shoe: R_SHOE, hat: 'gorra', hatR: rp('#1c2a4a'),
  deco: function (c) {
    var t = c.tr, y, x, V = rp('#bcd82a');
    for (y = t.y0 + 1; y <= t.y1 - 1; y++) for (x = t.x0[y] + 1; x <= t.x1[y]; x++) tset(c, x, y, (x === t.x0[y] + 1) ? V[3] : ((x === t.x1[y]) ? V[1] : V[2]));
    hband(c, 0.42, C_REFL); hband(c, 0.78, C_REFL);
    tset(c, t.x1[t.y0 + 1], t.y0 + 1, c.ou.top[2]); tset(c, t.x1[t.y0 + 1] - 1, t.y0 + 1, c.ou.top[2]);
    var ry = tpick(c, 0.3); tset(c, t.x1[ry] - 2, ry, R_BLK[2]); tset(c, t.x1[ry] - 2, ry + 1, R_BLK[1]); tset(c, t.x1[ry] - 2, ry - 1, col('#d4143a'));     // radio al pecho
    var by = t.y1; for (x = t.x0[by]; x <= t.x1[by]; x++) tset(c, x, by, R_BLK[1]);
  }
};

/* ---- trabajadores de Larcomar: colores de marca (el logo es una pista: pocas marcas, un detalle por marca) ---- */
function swoosh(c) { var t = c.tr, py = tpick(c, 0.25); tset(c, t.x1[py + 2] - 4, py + 2, R_WH[3]); tset(c, t.x1[py + 2] - 3, py + 2, R_WH[3]); tset(c, t.x1[py + 1] - 2, py + 1, R_WH[3]); tset(c, t.x1[py + 1] - 1, py + 1, R_WH[3]); tset(c, t.x1[py] - 1, py, R_WH[3]); }
var BR = {
  nike:      { top: R_BLK, slv: 'short', bot: rp('#4a4d55'), shoe: R_SHOE, deco: swoosh, prop: 'bagK' },
  bananarepublic: { top: rp('#6b7a45'), slv: 'long', bot: R_KHAKI, shoe: R_SHOE, deco: function (c) { var t = c.tr, y; vband(c, 0, rp('#6b7a45')[1]); px_(c, 3, 0.3, R_BLK[2]); px_(c, 2, 0.3, R_BLK[2]); hband(c, 0.88, rp('#6b7a45')[1]); for (y = t.y0 + 1; y < t.y1; y += 3) tset(c, t.x0[y] + 2, y, rp('#6b7a45')[3]); }, prop: 'bagL' },
  tanta:     { top: rp('#e8541c'), slv: 'short', bot: R_BLK, shoe: R_SHOE, hat: 'visera', hatR: R_WH, apr: rp('#5a2e1c'), mk: function (c, y0) { dot(c, 4, y0 + 2, rp('#e8541c')[2], 2); dot(c, 3, y0 + 3, rp('#e8541c')[3]); }, prop: 'sweet' },
  mangos:    { top: R_WH, slv: 'long', slvR: R_WH, bot: R_BLK, shoe: R_SHOE, apr: R_BLK, apt: 0.02, mk: function (c, y0) { dot(c, 3, y0 + 2, R_WH[3], 3); dot(c, 3, y0 + 3, R_WH[2], 3); }, prop: 'bagK' },
  koasian:   { top: rp('#d01a1a'), slv: 'short', bot: R_BLK, shoe: R_SHOE, hat: 'visera', hatR: R_BLK, apr: R_BLK, mk: function (c, y0) { dot(c, 4, y0 + 2, rp('#d01a1a')[2], 2); dot(c, 3, y0 + 3, C_GOLD, 2); }, prop: 'bowl' },
  popular:   { top: rp('#e0a62a'), slv: 'short', bot: R_JEAN, shoe: R_SHOE, hat: 'gorra', hatR: rp('#5a2e1c'), apr: rp('#5a2e1c'), mk: function (c, y0) { dot(c, 4, y0 + 2, rp('#e0a62a')[3], 3); }, prop: 'chicken' },
  bonbonniere: { top: R_WH, slv: 'long', slvR: R_WH, bot: R_BLK, shoe: R_SHOE, hat: 'cofia', hatR: R_WH, trim: rp('#ff72b8'), deco: function (c) { var t = c.tr, y; for (y = t.y0 + 1; y <= t.y1; y += 2) tset(c, t.x1[y] - 1, y, rp('#ff72b8')[2]); vband(c, 0, rp('#ff72b8')[1]); }, prop: 'roll' },
  fridays:   { top: R_WH, slv: 'short', slvR: R_WH, bot: R_BLK, shoe: R_SHOE, hat: 'visera', hatR: R_RED, deco: function (c) { var t = c.tr, y, x, r = rp('#d4142a'); for (y = t.y0; y <= t.y1; y++) for (x = t.x0[y]; x <= t.x1[y]; x++) if ((x - t.x0[y]) % 3 === 1) tset(c, x, y, r[2]); }, prop: 'bowl' },
  pardos:    { top: rp('#c86a14'), slv: 'short', bot: R_BLK, shoe: R_SHOE, hat: 'gorra', hatR: rp('#c86a14'), apr: rp('#4a2a14'), mk: function (c, y0) { dot(c, 4, y0 + 2, rp('#f2b21a')[2], 2); dot(c, 3, y0 + 3, rp('#f2b21a')[1], 2); }, prop: 'chicken' },
  cinepolis: { top: rp('#14306e'), slv: 'short', bot: R_BLK, shoe: R_SHOE, hat: 'visera', hatR: rp('#14306e'), deco: function (c) { vband(c, 0, rp('#14306e')[1]); hband(c, 0.62, col('#ff8a2a')); hband(c, 0.7, col('#ff8a2a')); px_(c, 3, 0.2, R_WH[3]); px_(c, 2, 0.2, R_WH[3]); }, prop: 'pop' },
  hm:        { top: rp('#e50010'), slv: 'short', bot: R_BLK, shoe: R_SHOE, deco: function (c) { px_(c, 3, 0.25, R_WH[3]); px_(c, 2, 0.25, R_WH[3]); px_(c, 3, 0.25 + 0.12, R_WH[2]); vband(c, 0, rp('#e50010')[1]); }, prop: 'bagK' },
  miniso:    { top: R_WH, slv: 'short', slvR: R_WH, bot: R_JEAN, shoe: R_SHOE, apr: rp('#d4142a'), apt: 0.12, mk: function (c, y0) { dot(c, 4, y0 + 2, R_WH[3], 2); dot(c, 3, y0 + 3, R_WH[3]); }, prop: 'bagL' },
  adidas:    { top: R_BLK, slv: 'long', slvR: R_BLK, bot: R_BLK, shoe: R_WH, stripe: col('#f2f2ea'), deco: function (c) { var t = c.tr, y; for (y = t.y0 + 1; y <= t.y0 + 5; y++) { tset(c, t.x1[y] - 1 - (y - t.y0 - 1) % 1, y, col('#f2f2ea')); } tset(c, t.x1[t.y0 + 2] - 2, t.y0 + 2, col('#f2f2ea')); tset(c, t.x1[t.y0 + 3] - 3, t.y0 + 3, col('#f2f2ea')); tset(c, t.x1[t.y0 + 4] - 4, t.y0 + 4, col('#f2f2ea')); tset(c, t.x1[t.y0 + 5] - 5, t.y0 + 5, col('#f2f2ea')); vband(c, 0, R_BLK[1]); }, prop: 'bagK' },
  starbucks: { top: R_BLK, slv: 'short', bot: R_BLK, shoe: R_SHOE, hat: 'gorra', hatR: R_SBG, apr: R_SBG, mk: function (c, y0) { dot(c, 4, y0 + 2, R_WH[3], 2); dot(c, 4, y0 + 3, R_WH[2], 2); }, prop: 'cup' },
  freddo:    { top: rp('#3fa7d6'), slv: 'short', bot: R_WH, shoe: R_SHOE, hat: 'cofia', hatR: R_WH, apr: R_WH, mk: function (c, y0) { dot(c, 4, y0 + 2, rp('#ff72b8')[2], 2); dot(c, 3, y0 + 3, rp('#3fa7d6')[2], 2); }, prop: 'cone' },
  cinnabon:  { top: rp('#c8202a'), slv: 'short', bot: R_BLK, shoe: R_SHOE, hat: 'gorra', hatR: rp('#c8202a'), apr: R_CREAM, mk: function (c, y0) { dot(c, 4, y0 + 2, rp('#8a4a2a')[2], 2); dot(c, 3, y0 + 3, rp('#8a4a2a')[1], 2); }, prop: 'roll' },
  salazar:   { top: R_WH, slv: 'long', slvR: R_WH, bot: R_BLK, shoe: R_SHOE, apr: R_BLK, apt: 0.18, deco: function (c) { var t = c.tr; tset(c, t.x1[t.y0], t.y0, col('#d4143a')); tset(c, t.x1[t.y0] - 1, t.y0, col('#d4143a')); }, mk: function (c, y0) { dot(c, 3, y0 + 3, C_GOLD); }, prop: 'cup' },
  haagendazs: { top: rp('#5a3a20'), slv: 'short', bot: R_BLK, shoe: R_SHOE, hat: 'visera', hatR: rp('#5a3a20'), apr: R_CREAM, mk: function (c, y0) { dot(c, 4, y0 + 2, rp('#5a3a20')[2], 2); dot(c, 3, y0 + 3, C_GOLD, 2); }, prop: 'cone' },
  masterkong: { top: rp('#e8741a'), slv: 'short', bot: R_JEAN, shoe: R_SHOE, hat: 'visera', hatR: R_YEL, deco: function (c) { hband(c, 0.5, col('#ffd740')); hband(c, 0.58, col('#ffd740')); px_(c, 3, 0.2, R_WH[3]); px_(c, 2, 0.2, R_WH[3]); }, prop: 'bowl' },
  kiosco:    { top: rp('#2a9a90'), slv: 'short', bot: R_KHAKI, shoe: R_SHOE, hat: 'gorra', hatR: R_YEL, apr: R_YEL, mk: function (c, y0) { dot(c, 4, y0 + 2, rp('#2a9a90')[2], 2); dot(c, 3, y0 + 3, rp('#2a9a90')[1], 2); }, prop: 'sweet' },
  deportes:  { top: rp('#2a62d0'), slv: 'short', slvR: rp('#2a62d0'), bot: R_CHAR, shoe: R_WH, stripe: col('#f2f2ea'), deco: function (c) { hband(c, 0.3, R_WH[3]); vband(c, 0, rp('#2a62d0')[1]); }, prop: 'ball' },
  fuente:    { top: R_WH, slv: 'short', slvR: R_WH, bot: R_JEAN, shoe: R_SHOE, hat: 'cofia', hatR: R_WH, trim: rp('#ff72b8'), apr: rp('#ff9ec8'), apt: 0.2, mk: function (c, y0) { dot(c, 4, y0 + 2, R_WH[3], 3); dot(c, 3, y0 + 3, R_WH[3], 2); }, prop: 'cone' },
  granDragon: { top: rp('#c8141c'), slv: 'long', slvR: rp('#c8141c'), bot: R_BLK, shoe: R_BLK, deco: function (c) { var t = c.tr, y; for (y = t.y0 + 1; y <= t.y1; y += 2) tset(c, t.x1[y] - 2, y, C_GOLD); vband(c, 0, rp('#c8141c')[1]); tset(c, t.x1[t.y0], t.y0, C_GOLD); }, prop: 'bowl' }
};
Object.keys(BR).forEach(function (k) {
  var o = BR[k];
  if (o.apr && o.mk) { var mk = o.mk, ap = o.apr, apt = o.apt === undefined ? 0.2 : o.apt; o.deco = apronDeco(ap, mk, apt); }
});

/* lo que cada uno lleva en la mano (se suman a PROPS del bloque anterior) */
PROPS.cone = { rows: ['.PP.', 'PPPP', 'TTTT', '.TT.', '..T.'], c: { P: '#f6a8c8', T: '#d9a63c' } };
PROPS.roll = { rows: ['.BBB.', 'BWBWB', 'WBWBW', '.BBB.'], c: { B: '#9a5a2a', W: '#f6e6c0' } };
PROPS.bowl = { rows: ['.WWW.', 'YYYYY', 'RRRRR', '.RRR.'], c: { W: '#fbfaf2', Y: '#f2c81c', R: '#d4142a' } };
PROPS.ball = { rows: ['.WW.', 'WKKW', 'WKKW', '.WW.'], c: { W: '#f6f4ea', K: '#26262e' } };
PROPS.pop = { rows: ['WYWYW', '.RWRW', '.WRWR', '..RW.'], c: { W: '#fbfaf2', Y: '#f2d84a', R: '#d4142a' } };
PROPS.sweet = { rows: ['.RR.', 'YYYY', 'BBBB'], c: { R: '#e8382c', Y: '#ffd75a', B: '#2a9a90' } };
PROPS.radio = { rows: ['.K', 'KK', 'KR', 'KK'], c: { K: '#2a2a32', R: '#d4143a' } };
PROPS.baton = { rows: ['K', 'K', 'K', 'K', 'K', 'W'], c: { K: '#1e1e24', W: '#cfd3cc' } };

/* ======================== POSES ======================== */
/* poseTrab: paso pesado (copia de la de Miraflores): cae en cada apoyo, el torso se mece, un brazo carga lo suyo y el otro cuelga. */
function poseTrab(bd, fr, n, P) {
  var ph = fr / n * PI * 2, s = SIN(ph), cs = COS(ph), k = bd.legD / 9, st = 2.6 * k;
  var down = abs(s) > 0.7 ? 1 : 0;
  var Hy = bd.hipY + down * 0.8, Hx = 0;
  var Sx = Hx + 2.3 + bd.hunch * 0.9 + (down ? 0.4 : 0), Sy = Hy - (bd.torso - 1) + bd.hunch * 0.4 + 0.3;
  var lN = max(0, cs) * 1.3 * k, lF = max(0, -cs) * 1.3 * k, ua = bd.ua + bd.fa - 0.6;
  var aN = { h: [Sx + 3.4, Sy + 4.6 + 0.6 * s], b: -1 }, aF = { h: [Sx - 0.4 - 1.3 * s, Sy + ua - 0.8], b: -1 };
  var hx = aN.h[0], hy = aN.h[1], prop = P.spec.prop;
  return {
    H: [Hx, Hy], S: [Sx, Sy], hd: [1.2 + bd.hunch * 0.6, 0.9 + bd.hunch * 0.6 + down * 0.6], mouth: (fr % 3 === 1) ? 'closed' : 'slack',
    aN: aN, aF: aF, armLate: true,
    lN: { f: [Hx + st * s, -1 - lN], p: lN > 0.4 ? 1 : 0 }, lF: { f: [Hx - st * s, -1 - lF], p: lF > 0.4 ? 1 : 0 },
    late: function (c) { drawProp(c.b, prop, c.ox + hx + 1, c.oy + hy); }
  };
}
/* poseRun: carrera: cuerpo inclinado, zancada larga, brazos que bombean, un rato en el aire. */
function poseRun(bd, fr, n, P) {
  var ph = fr / n * PI * 2, s = SIN(ph), cs = COS(ph), k = bd.legD / 9, st = 4.2 * k;
  var Hx = 0, Hy = bd.hipY + (abs(cs) > 0.55 ? 0.8 : -0.4);
  var Sx = Hx + 3.4, Sy = Hy - (bd.torso - 1) + 0.9;
  var lN = max(0, cs) * 3.2 * k, lF = max(0, -cs) * 3.2 * k;
  var aN = { h: [Sx + 1.6 - 3.0 * s + 1.8, Sy + 3.2 - 1.2 * abs(cs) - 0.6 * cs], b: -1 }, aF = { h: [Sx + 1.6 + 3.0 * s + 0.6, Sy + 3.6 - 1.2 * abs(cs) + 0.6 * cs], b: -1 };
  return {
    H: [Hx, Hy], S: [Sx, Sy], hd: [2.0, 1.2 + (abs(cs) > 0.55 ? 0.4 : 0)], mouth: 'wide',
    aN: aN, aF: aF, armLate: true,
    lN: { f: [Hx + st * s, -1 - lN], p: lN > 1 ? 1 : 0 }, lF: { f: [Hx - st * s, -1 - lF], p: lF > 1 ? 1 : 0 },
    late: function (c) { headphones(c, Sx, Sy, 2.0, 1.2 + (abs(cs) > 0.55 ? 0.4 : 0)); }
  };
}
function headBox(c, S_, hd) {                                // esquina de la cabeza de 8 (misma cuenta que drawHead)
  var bd = c.bd, cx = c.ox + S_[0] + hd[0], cy = c.oy + S_[1] - (bd.head - 1) / 2 - 1 + hd[1] + 0.5;
  return [Math.round(cx) - 4, Math.round(cy - (bd.head - 1) / 2)];
}
function headphones(c, Sx, Sy, hdx, hdy) {
  var hb = headBox(c, [Sx, Sy], [hdx, hdy]), b = c.b, X0 = hb[0], Y0 = hb[1], i;
  for (i = 2; i <= 5; i++) b.set(X0 + i, Y0 - 1, R_BLK[2]);
  b.set(X0 + 1, Y0, R_BLK[2]); b.set(X0 + 6, Y0, R_BLK[2]);
  b.rect(X0 + 1, Y0 + 2, 2, 3, R_BLK[2]); b.set(X0 + 1, Y0 + 2, C_PINK); b.set(X0 + 1, Y0 + 3, R_BLK[1]);
}
/* turista: un brazo en alto con el palo de selfie y el celular; el otro cuelga */
function poseTurista(bd, fr, n, P) {
  var pz = poseTrab(bd, fr, n, P), Sx = pz.S[0], Sy = pz.S[1], bob = (fr % 3 === 1) ? 1 : 0;
  var hand = [Sx + 3.6, Sy - 0.4 + (fr % 2) * 0.6];
  pz.aN = { h: hand, b: -1 };
  pz.late = function (c) {
    var b = c.b, hx = c.ox + hand[0], hy = c.oy + hand[1], tx = hx + 5, ty = hy - 11 + bob;
    b.line(hx + 1, hy - 1, tx, ty + 3, R_CHAR[2]); b.line(hx + 1, hy - 2, tx, ty + 4, R_CHAR[3]);
    b.rect(tx - 1, ty - 1, 4, 5, R_BLK[1]); b.rect(tx, ty, 2, 3, col('#7ec8e8')); b.set(tx, ty, col('#d6f4ff')); b.set(tx + 3, ty + 4, R_BLK[3]);
    b.set(tx + 2, ty - 1, col('#fff6a0'));                    // luz del flash
  };
  pz.mouth = 'wide';
  return pz;
}
/* surfista: la tabla bajo el brazo, apoyada contra el cuerpo y asomando arriba */
function poseSurf(bd, fr, n, P) {
  var pz = poseTrab(bd, fr, n, P), Sx = pz.S[0], Sy = pz.S[1], Hx = pz.H[0], Hy = pz.H[1];
  pz.aN = { h: [Sx + 2.6, Sy + 4.8], b: -1 };
  var s = SIN(fr / n * PI * 2);
  pz.front = function (c) {
    var b = c.b, x0 = c.ox + Sx + 3, ytop = c.oy + Sy - 10, ybot = c.oy + Hy + bd.legD + 0.5, y, w, x;
    var T = [col('#0c6a78'), col('#14a0aa'), col('#2ed0d0'), col('#9af0ea')];
    for (y = ytop; y <= ybot; y++) {
      var u = (y - ytop) / (ybot - ytop);
      w = u < 0.12 ? 2 : (u > 0.9 ? 2 : 4);
      var xs = Math.round(x0 - u * 3.5 + (fr % 2 ? 0.4 : 0) * 0 + 1.4 * (1 - u));
      for (x = 0; x < w; x++) b.set(xs + x, y, x === 0 ? T[3] : (x === w - 1 ? T[0] : T[2]));
      if (w === 4 && (y - ytop) % 5 !== 0) b.set(xs + 1, y, T[3]);
      if (u > 0.3 && u < 0.4 && w >= 3) { b.set(xs + 1, y, col('#ffffff')); b.set(xs + 2, y, col('#ff8a2a')); }
    }
    b.set(x0 - 3, ybot, T[0]);
  };
  return pz;
}
function posePara(bd, fr, n, P) {
  var pz = poseTrab(bd, fr, n, P);
  pz.late = null;
  pz.mouth = (fr % 3 === 1) ? 'closed' : 'slack';
  return pz;
}
function poseSeg(bd, fr, n, P) {
  var pz = poseTrab(bd, fr, n, P), Sx = pz.S[0], Sy = pz.S[1];
  pz.aN = { h: [Sx + 3.6, Sy + 4.2], b: -1 };
  var hx = pz.aN.h[0], hy = pz.aN.h[1];
  pz.late = function (c) { drawProp(c.b, 'baton', c.ox + hx + 1, c.oy + hy + 1); };
  return pz;
}

/* ---- cadaver visto desde arriba, horizontal, cabeza a la izquierda (como los de zombies.js) ---- */
function buildDeadZ(spec, bd, ou) {
  var hb = bd.h, hr = hb === 'bajo' ? 3.1 : 3.7, torsoL = hb === 'bajo' ? 7 : hb === 'alto' ? 11 : 9, legL = hb === 'bajo' ? 6 : hb === 'alto' ? 10 : 7, armL = hb === 'bajo' ? 6 : hb === 'alto' ? 9 : 7;
  var th = Math.max(4, bd.tw - 3 + (bd.belly ? 2 : 0) - (bd.thin ? 1 : 0)), tx0 = Math.round(2 * hr) + 1, lx = tx0 + torsoL, cy = 9;
  var W = lx + legL + 7, H = 18, b = new Buf(W, H), sk = TONES[spec.tone || 'verde'], hc = HAIRS[spec.hc || 'negro'], pool = new Buf(W, H);
  var long_ = ou.slv !== 'none', rs = long_ ? N(ou.slvR || ou.top) : N(sk), top = cy - Math.floor(th / 2), bot = top + th - 1;
  [[top - 2, -1, 0], [bot + 2, 1, -1]].forEach(function (a, i) {
    var y0 = a[0], x1 = tx0 + armL - (i ? 1 : 0);
    if (ou.slv === 'long') { pLine(b, tx0 + 1, y0, x1 - 2, y0 + a[1], 2, rs); pLine(b, x1 - 1, y0 + a[1], x1, y0 + a[1], 2, N(sk)); }
    else { pLine(b, tx0 + 3, y0, x1, y0 + a[1], 2, N(sk)); if (ou.slv === 'short') pLine(b, tx0 + 1, y0, tx0 + 4, y0, 2, rs); }
  });
  var rp_ = N(ou.bot);
  if (ou.legs === 'short') { pLine(b, lx + 2, cy - 2, lx + legL - 1, cy - 2, 2, N(sk)); pLine(b, lx + 2, cy + 1, lx + legL - 2, cy + 2, 2, N(sk)); pLine(b, lx - 1, cy - 2, lx + 2, cy - 2, 3, rp_); pLine(b, lx - 1, cy + 1, lx + 2, cy + 1, 3, rp_); }
  else { pLine(b, lx - 1, cy - 2, lx + legL - 1, cy - 2, 3, rp_); pLine(b, lx - 1, cy + 1, lx + legL - 2, cy + 2, 3, rp_); }
  pRect(b, lx + legL, cy - 3, 3, 3, N(ou.shoe)); pRect(b, lx + legL - 1, cy + 1, 3, 3, N(ou.shoe));
  mkBegin(b); mkRect(tx0, top, torsoL, th); paint(b, N(ou.top));
  if (ou.apr) { var A = ou.apr; b.rect(tx0 + 2, top + 1, torsoL - 2, th - 1, A[2]); b.rect(tx0 + 2, top + 1, torsoL - 2, 1, A[3]); b.rect(tx0 + torsoL - 1, top + 1, 1, th - 1, A[1]); }
  if (spec.deadMark) spec.deadMark(b, tx0, top, th, torsoL, cy);
  b.set(tx0 + 3, top + 1, sk[1]); b.set(tx0 + 4, top + 1, sk[2]); b.set(tx0 + 5, bot - 1, BLOOD[2]);
  b.rect(tx0, bot, torsoL, 1, ou.top[0]);
  var hx = 1 + hr;
  mkBegin(b); mkEll(hx, cy, hr, hr); paint(b, N(sk));
  var ht = ou.hat;
  if (ht === 'toque' || ht === 'cofia') { mkBegin(b); mkEll(hx - 0.5, cy, hr, hr - 0.4); paint(b, N(ou.hatR)); }
  else if (ht === 'gorra' || ht === 'visera') { mkBegin(b); mkEll(hx - 0.5, cy, hr - 0.2, hr - 0.2); paint(b, N(ou.hatR)); b.rect(Math.round(hx + hr) - 1, cy - 1, 2, 3, ou.hatR[0]); }
  else if (ht === 'casco') { mkBegin(b); mkEll(hx - 0.3, cy, hr, hr); paint(b, N(ou.hatR)); b.rect(Math.round(hx - 1), cy - 3, 1, 6, ou.hatR[3]); }
  else if (ht === 'bucket') { mkBegin(b); mkEll(hx - 0.3, cy, hr + 1.2, hr + 1.2); paint(b, N(ou.hatR)); mkBegin(b); mkEll(hx - 0.3, cy, hr - 0.8, hr - 0.8); paint(b, [ou.hatR[1], ou.hatR[2], ou.hatR[3]]); }
  else if (spec.hair !== 'calvo') { mkBegin(b); mkEll(hx - 1.2, cy, hr - 0.6, hr - 0.2); paint(b, N(hc)); if (spec.hair === 'largo' || spec.hair === 'grena') { b.rect(0, cy - 2, 1, 5, hc[1]); } }
  if (spec.headgear) spec.headgear(b, hx, cy, hr);
  b.set(Math.round(hx + 1), cy - 1, C_EYE2); b.set(Math.round(hx + 1), cy + 1, C_EYE2); b.set(Math.round(hx + 2), cy, C_MOUTH);
  b.outlineRim();
  pool.blit(b, 0, 0);
  return pool.toCanvas(Math.round(W / 2) - 1, cy);
}
function buildSkin(spec) {
  var bd = bodyOf(spec.body), ou = spec.outfit, n = 6, cv = baseCv(bd, 36, 16, 3), move = [], hurt = [];
  var P = {
    bd: bd, ou: ou, skin: TONES[spec.tone || 'verde'], hair: spec.hair || 'corto', hc: HAIRS[spec.hc || 'negro'], seed: spec.seed || 1,
    wear: spec.wear === undefined ? 1 : spec.wear, blood: spec.blood || 0, faceBlood: spec.faceBlood || 0, rot: spec.rot,
    ox: cv.ox, oy: cv.oy, spec: spec, blind: false
  };
  var pose = spec.pose || poseTrab;
  for (var fr = 0; fr < n; fr++) {
    var b = new Buf(cv.W, cv.H);
    drawFigure(b, P, pose(bd, fr, n, P));
    b.outlineRim();
    hurt.push(b.solid().toCanvas(cv.ox, cv.oy));
    move.push(b.toCanvas(cv.ox, cv.oy));
  }
  return { move: move, hurt: hurt, dead: buildDeadZ(spec, bd, ou) };
}
var ZSPEC = {
  cv_corredor:     { body: 'normalFlaco', outfit: OUT.corredor, tone: 'verde', hair: 'corto', hc: 'casta', seed: 101, pose: poseRun, blood: 1 },
  cv_turista:      { body: 'normalAncho', outfit: OUT.turista, tone: 'amarillo', hair: 'cana', hc: 'gris', seed: 112, pose: poseTurista },
  cv_surfista:     { body: 'alto', outfit: OUT.surfista, tone: 'verde', hair: 'largo', hc: 'rubio', seed: 123, pose: poseSurf, wear: 2 },
  cv_parapentista: { body: 'normal', outfit: OUT.parapentista, tone: 'palido', hair: 'corto', hc: 'negro', seed: 134, pose: posePara, blood: 1,
    deadMark: function (b, tx0, top, th, torsoL, cy) { b.rect(tx0 - 3, top, 3, th, col('#ff5aa8')); b.rect(tx0 - 3, cy, 3, 1, col('#f2d21a')); b.rect(tx0 + 3, top, 1, th, R_BLK[1]); } },
  cv_seguridad:    { body: 'altoAncho', outfit: OUT.seguridad, tone: 'verde', hair: 'corto', hc: 'negro', seed: 145, pose: poseSeg, blood: 1,
    deadMark: function (b, tx0, top, th, torsoL, cy) { var V = rp('#bcd82a'); b.rect(tx0 + 1, top, torsoL - 1, th, V[2]); b.rect(tx0 + 3, top, 1, th, C_REFL); b.rect(tx0 + torsoL - 3, top, 1, th, C_REFL); } }
};
var BRBODY = { nike: 'normal', bananarepublic: 'normalFlaco', tanta: 'normal', mangos: 'altoFlaco', koasian: 'normalAncho', popular: 'normalAncho', bonbonniere: 'bajo', fridays: 'normal', pardos: 'normalAncho',
  cinepolis: 'alto', hm: 'normalFlaco', miniso: 'bajo', adidas: 'alto', starbucks: 'normalFlaco', freddo: 'normal', cinnabon: 'normalAncho', salazar: 'altoFlaco', haagendazs: 'normal', masterkong: 'bajo',
  kiosco: 'normalAncho', deportes: 'alto', fuente: 'normalFlaco', granDragon: 'normal' };
var BRTONE = ['verde', 'gris', 'palido', 'verde', 'amarillo', 'gris', 'verde', 'marron'], BRHAIR = ['corto', 'largo', 'calvo', 'corto', 'cana', 'grena', 'largo', 'corto'], BRHC = ['negro', 'casta', 'negro', 'rubio', 'gris', 'rojizo', 'casta', 'negro'];
var BRDEADMARK = {                                           // las marcas con delantal ya lo pintan; las demas dejan un detalle de color
  nike: function (b, tx0, top, th, torsoL) { b.rect(tx0 + 3, top + 1, 3, 1, R_WH[3]); },
  fridays: function (b, tx0, top, th, torsoL) { var x; for (x = tx0 + 1; x < tx0 + torsoL; x += 3) b.rect(x, top, 1, th, rp('#d4142a')[2]); },
  adidas: function (b, tx0, top, th, torsoL) { b.rect(tx0 + 2, top, 1, th, R_WH[3]); b.rect(tx0 + 4, top, 1, th, R_WH[3]); b.rect(tx0 + 6, top, 1, th, R_WH[3]); },
  hm: function (b, tx0, top, th, torsoL) { b.rect(tx0 + 3, top + 1, 2, 1, R_WH[3]); },
  granDragon: function (b, tx0, top, th, torsoL) { var x; for (x = tx0 + 1; x < tx0 + torsoL; x += 2) b.set(x, top + 1, C_GOLD); },
  deportes: function (b, tx0, top, th, torsoL) { b.rect(tx0 + 2, top, 1, th, R_WH[3]); }
};
Object.keys(BR).forEach(function (k, i) {
  ZSPEC['cv_trab_' + k] = { body: BRBODY[k] || 'normal', outfit: BR[k], tone: BRTONE[i % BRTONE.length], hair: BRHAIR[(i * 3 + 1) % BRHAIR.length], hc: BRHC[(i * 5 + 2) % BRHC.length], seed: 200 + i * 7, prop: BR[k].prop, pose: poseTrab, blood: i % 4 === 0 ? 1 : 0, deadMark: BRDEADMARK[k] };
});
CV.zvarKeys = Object.keys(ZSPEC);
safe('zvar', function () {
  var zv = S.zvar;
  CV.zvarKeys.forEach(function (key) {
    var spec = ZSPEC[key];
    lazy(PJ, key, function () { return buildSkin(spec); });
    if (zv) { try { Object.defineProperty(zv, key, { enumerable: true, configurable: true, get: function () { var v = PJ[key]; if (v) Object.defineProperty(zv, key, { value: v, writable: true, enumerable: true, configurable: true }); return v; }, set: function (v) { Object.defineProperty(zv, key, { value: v, writable: true, enumerable: true, configurable: true }); } }); } catch (e) { /* zvar congelado */ } }
  });
  CV.trabKeys = CV.zvarKeys.filter(function (k) { return k.indexOf('cv_trab_') === 0; });
});

/* ======================== EL MAESTRO WANTAN (jefe 1) ======================== */
/* Cocinero de chifa gigante y gordo: toque alto, chaquetilla blanca con ribete rojo, mandil, bigote, cucharon al cinto, wok a la espalda,
   palitos en las manos. De frente (el motor lo voltea). Lienzo 100x104, ancla (50, 98) = suelo entre los pies. ~66 px de alto (2.4 x una persona de 28). */
var CH = {
  wh: ['#8c8a93', '#bdb9ab', '#e6e2d4', '#fbf8ec'], red: ['#5e1010', '#a0201c', '#d4382e', '#f2705a'],
  ap: ['#8a7e60', '#b8ad8a', '#dcd2b4', '#f4ecd4'], sk: ['#8c5a44', '#b88068', '#dba583', '#f0c9a4'],
  blk: ['#0e0c12', '#26242c', '#3e3c44', '#5a5860'], st: ['#232831', '#3c4552', '#5e6a7a', '#a4b0bc'], wd: ['#4a2e18', '#6b4223', '#a06a36', '#c99458'],
  hair: ['#0e0c0e', '#241e1f', '#3e3434', '#5a4c46']
};
var CW = 100, CHH = 104, CCX = 50, CFY = 98;
function tubeG(g, x0, y0, x1, y1, r, rm) {                   // tubo grueso con luz arriba-izquierda
  var n = Math.max(1, Math.ceil(Math.max(abs(x1 - x0), abs(y1 - y0)))), i, t;
  for (i = 0; i <= n; i++) { t = i / n; g.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, rm[1]); }
  for (i = 0; i <= n; i++) { t = i / n; g.disc(x0 + (x1 - x0) * t - 0.6, y0 + (y1 - y0) * t - 0.6, r - 0.9, rm[2]); }
  for (i = 0; i <= n; i++) { t = i / n; g.disc(x0 + (x1 - x0) * t - 1.3, y0 + (y1 - y0) * t - 1.3, Math.max(0.7, r - 2.6), rm[3]); }
}
function ellG(g, cx, cy, rx, ry, c) { g.ell(cx, cy, rx, ry, c); }
function sticksG(g, hx, hy, ang, n, len, spread) {           // manojo de palitos que sale del punio
  for (var i = 0; i < n; i++) {
    var a = ang + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread), ex = hx + Math.cos(a) * len, ey = hy + Math.sin(a) * len;
    g.line(hx, hy, ex, ey, i % 2 ? CH.wd[3] : CH.wd[2]);
    g.set(Math.round(ex), Math.round(ey), CH.red[2]);
    g.set(Math.round(hx + (ex - hx) * 0.9), Math.round(hy + (ey - hy) * 0.9), CH.red[1]);
  }
}
function fistC(g, x, y, big) {                               // punio gordo de cocinero
  x = Math.round(x); y = Math.round(y);
  g.rect(x - 2, y - 2, 5, 5, CH.sk[2]); g.rect(x - 2, y - 2, 5, 1, CH.sk[3]); g.set(x - 2, y - 1, CH.sk[3]);
  g.rect(x - 2, y + 2, 5, 1, CH.sk[1]); g.rect(x + 2, y - 1, 1, 3, CH.sk[1]);
  g.set(x - 1, y, CH.sk[1]); g.set(x, y, CH.sk[1]);        // nudillos
}
function chefG(P) {
  P = P || {};
  var g = new G(CW, CHH), jump = P.jump || 0, sq = P.sq || 0, bel = P.belly || 0, sit = !!P.sit, sx, sy;
  function Y(u) { return CFY - jump - (u >= 14 ? u - sq : u); }
  var hatDx = P.hatDx || 0, hatDy = P.hatDy || 0, lean = P.lean || 0;
  /* wok a la espalda (se ve detras de hombros y cabeza) */
  if (P.wok !== false) {
    blobG(g, CCX + lean, Y(41), 21, 20, CH.st);
    g.ell(CCX + lean, Y(41), 17.5, 16.5, null);
    blobG(g, CCX + lean + 1, Y(40), 17, 16, [CH.st[0], CH.st[1], CH.st[1], CH.st[2]]);
    for (var a = 0; a < 6.28; a += 0.12) g.set(Math.round(CCX + lean + Math.cos(a) * 20.5), Math.round(Y(41) + Math.sin(a) * 19.5), (Math.cos(a) + Math.sin(a)) < -0.6 ? CH.st[3] : CH.st[2]);
    tubeG(g, CCX + 15 + lean, Y(52), CCX + 33 + lean, Y(61), 1.5, CH.wd); g.rect(CCX + 13 + lean, Y(53) - 1, 4, 3, CH.st[3]);
    g.rect(CCX - 24 + lean, Y(41) - 1, 4, 3, CH.st[3]);
  }
  /* piernas */
  var legTop = Y(14), kneeOut = sq ? 3 : 0;
  [-1, 1].forEach(function (s) {
    var cx = CCX + s * 8 + (sit ? s * 5 : 0), y0 = legTop - 1, y1 = Y(5) + (P.tuck ? -6 : 0);
    if (sit) { y0 = Y(14) + 2; y1 = Y(5); }
    for (var y = y0; y <= y1; y++) for (var x = cx - 5 - kneeOut * (y - y0) / 8; x <= cx + 5 + kneeOut * (y - y0) / 8; x++) {
      var xr = Math.round(x), ch = (((xr >> 1) + (y >> 1)) & 1);
      g.set(xr, y, xr <= cx - 5 ? '#e0e0d8' : (xr >= cx + 5 ? '#1a1a22' : (ch ? '#2c2c36' : '#cfcfc6')));
    }
    var sy2 = y1 + 1, sw = 7;                                  // zueco negro, la punta hacia afuera
    for (var yy = sy2; yy <= sy2 + 4; yy++) for (var xx = cx - sw + (s > 0 ? 1 : 0) + (s < 0 ? -2 : 0); xx <= cx + sw - (s < 0 ? 1 : 0) + (s > 0 ? 2 : 0); xx++) g.set(xx, yy, yy === sy2 ? CH.blk[3] : (yy === sy2 + 4 ? CH.blk[0] : CH.blk[1]));
    g.rect(cx - 5, sy2 + 3, 10, 1, '#5a5860'); g.set(cx + s * 7, sy2, null);
  });
  if (sit) { /* sentado: las suelas al frente */ }
  /* tronco: panza enorme y pecho */
  var by = Y(26) + bel * 0.5;
  blobG(g, CCX, by, 23.5, 15.5, CH.wh);
  blobG(g, CCX, Y(37), 19, 8.5, CH.wh);
  /* ribete rojo inferior de la chaquetilla y cuello */
  for (var q = -17; q <= 17; q++) { var yy2 = Math.round(by + 15.5 * Math.sqrt(Math.max(0, 1 - q * q / (23.5 * 23.5)))); g.set(CCX + q, yy2, CH.red[2]); g.set(CCX + q, yy2 - 1, CH.red[1]); }
  /* mandil: cuelga del pecho sobre la panza y los muslos */
  var ay0 = Y(34), ay1 = Y(11);
  for (var y = ay0; y <= ay1; y++) {
    var u = (y - ay0) / (ay1 - ay0), hw = Math.round(11 + u * 6 + (u > 0.5 ? 1 : 0));
    for (var x = -hw; x <= hw; x++) {
      var c = (x === -hw) ? CH.ap[3] : (x === hw ? CH.ap[0] : (x === hw - 1 ? CH.ap[1] : CH.ap[2]));
      if (y === ay0) c = CH.ap[3];
      if (y >= ay1 - 1 && ((x + y) & 3) === 0) continue;       // borde deshilachado
      g.set(CCX + x, y, c);
    }
  }
  g.rect(CCX - 6, Y(24), 12, 7, CH.ap[1]); g.rect(CCX - 6, Y(24), 12, 1, CH.ap[0]); g.rect(CCX - 6, Y(24), 1, 7, CH.ap[3]);   // bolsillo
  [[-3, 28, '#6a3a1c'], [4, 22, '#a02a1c'], [-8, 16, '#6a3a1c'], [8, 29, '#6a3a1c'], [1, 15, '#a02a1c'], [-9, 25, '#a02a1c']].forEach(function (s) { g.set(CCX + s[0], Y(s[1]), s[2]); g.set(CCX + s[0] + 1, Y(s[1]), s[2]); g.set(CCX + s[0], Y(s[1]) + 1, s[2]); });
  g.line(CCX - 12, Y(34), CCX - 12, Y(34), CH.ap[3]);
  /* cordones del mandil y nudo rojo */
  g.line(CCX - 11, ay0, CCX - 8, Y(40), CH.ap[3]); g.line(CCX + 11, ay0, CCX + 8, Y(40), CH.ap[3]);
  g.line(CCX - 17, Y(29), CCX + 17, Y(29), CH.red[1]); g.rect(CCX + 13, Y(29) - 1, 4, 3, CH.red[2]); g.set(CCX + 17, Y(27), CH.red[1]); g.set(CCX + 16, Y(26), CH.red[1]);
  /* pecho: cuello alto con ribete rojo, botones de solapa */
  for (var k = -1; k <= 1; k += 2) {
    g.line(CCX + k * 3, Y(43), CCX + k * 8, Y(35), CH.red[2]); g.line(CCX + k * 3 + 1, Y(43), CCX + k * 8 + 1, Y(35), CH.red[1]);
    g.rect(CCX + k * 8 - 1, Y(40), 2, 2, CH.red[3]); g.rect(CCX + k * 9 - 1, Y(37), 2, 2, CH.red[3]);
  }
  g.rect(CCX - 4, Y(43), 8, 2, CH.wh[3]); g.rect(CCX - 4, Y(41), 8, 1, CH.wh[1]);
  /* cucharon al cinto (a menos que lo tenga en la mano) */
  if (!P.ladleHand) {
    tubeG(g, CCX + 20, Y(30), CCX + 21, Y(15), 1.2, CH.wd); blobG(g, CCX + 21, Y(12), 4, 3, CH.st); g.set(CCX + 20, Y(12), CH.st[1]);
  }
  if (sit) {                                                   // sentado: las piernas salen hacia la camara, con las suelas abajo
    [-1, 1].forEach(function (s) {
      var lx = CCX + s * 12, y, x;
      for (y = CFY - 15; y <= CFY - 4; y++) for (x = lx - 7; x <= lx + 7; x++) {
        var chk = (((x >> 1) + (y >> 1)) & 1), edge = (x === lx - 7 ? '#e0e0d8' : (x === lx + 7 ? '#1a1a22' : (chk ? '#2c2c36' : '#cfcfc6')));
        if (y === CFY - 15 && (x === lx - 7 || x === lx + 7)) continue;
        g.set(x, y, edge);
      }
      for (y = CFY - 3; y <= CFY; y++) for (x = lx - 7; x <= lx + 7; x++) g.set(x, y, y === CFY - 3 ? CH.blk[3] : (y === CFY ? CH.blk[0] : CH.blk[1]));
      g.rect(lx - 5, CFY - 2, 10, 1, CH.blk[2]);
    });
  }
  /* cabeza */
  var hx = CCX + lean, hy = Y(47) + (P.headDy || 0);
  blobG(g, hx, hy + 5, 13, 6.5, [CH.sk[0], CH.sk[0], CH.sk[1], CH.sk[1]]);                  // papada
  ellG(g, hx - 11, hy + 1, 2, 3, CH.sk[1]); ellG(g, hx + 11, hy + 1, 2, 3, CH.sk[0]);       // orejas
  blobG(g, hx, hy, 11, 9.8, CH.sk);
  g.set(hx - 8, hy + 3, '#e88a7a'); g.set(hx - 7, hy + 3, '#e88a7a'); g.set(hx - 7, hy + 4, '#e88a7a'); g.set(hx + 7, hy + 3, '#e88a7a'); g.set(hx + 8, hy + 3, '#e88a7a'); g.set(hx + 7, hy + 4, '#e88a7a');   // cachetes
  var br = P.brow || 'angry', ey = hy - 2;
  [-1, 1].forEach(function (s) {
    var ex = hx + s * 4.6;
    if (P.eyes === 'closed') { g.line(ex - 2, ey + 1, ex + 2, ey + 1, CH.hair[1]); g.set(Math.round(ex), ey + 2, CH.hair[2]); }
    else { g.rect(Math.round(ex) - 1, ey, 3, 3, '#f6f2e8'); g.rect(Math.round(ex) - (s > 0 ? 0 : 0), ey + 1, 2, 2, '#1a1418'); g.set(Math.round(ex) - 1, ey + 2, '#1a1418'); g.set(Math.round(ex) - 1 + (s > 0 ? 1 : 0), ey + 1, '#ffffff'); }
    var bx = Math.round(ex);
    if (br === 'angry') { g.line(bx - 3 * s * -1 - 0, ey - 3 + (s > 0 ? 0 : 0), bx, ey - 3, CH.hair[0]); g.line(bx + 3 * s, ey - 4, bx - 3 * s, ey - 2, CH.hair[0]); g.line(bx + 3 * s, ey - 5, bx - 3 * s, ey - 3, CH.hair[1]); }
    else if (br === 'tired') { g.line(bx - 3 * s, ey - 3, bx + 3 * s, ey - 4, CH.hair[0]); g.line(bx - 3 * s, ey - 4, bx + 3 * s, ey - 5, CH.hair[1]); }
    else { g.line(bx - 3, ey - 4, bx + 3, ey - 4, CH.hair[0]); g.line(bx - 3, ey - 5, bx + 3, ey - 5, CH.hair[1]); }
  });
  blobG(g, hx, hy + 2, 2.6, 2.2, ['#a86450', '#c88068', '#e0a088', '#f2c0a8']);           // nariz redonda
  /* bigote negro con las puntas para arriba */
  var my = hy + 4;
  [-1, 1].forEach(function (s) {
    g.rect(hx + (s > 0 ? 0 : -6), my, 7, 2, CH.hair[1]); g.rect(hx + (s > 0 ? 1 : -6), my - 1, 5, 1, CH.hair[0]);
    g.rect(hx + s * 7 - (s > 0 ? 0 : 1), my + 1, 2, 1, CH.hair[1]); g.set(hx + s * 8 - (s > 0 ? 0 : 0), my, CH.hair[0]); g.set(hx + s * 9, my - 1, CH.hair[1]); g.set(hx + s * 9, my - 2, CH.hair[2]);
  });
  var mo = P.mouth || 'closed', mmy = my + 3;
  if (mo === 'closed') { g.rect(hx - 2, mmy, 5, 1, '#7a2a28'); }
  else if (mo === 'open') { g.rect(hx - 3, mmy, 7, 3, '#3a1214'); g.rect(hx - 3, mmy, 7, 1, '#f6f2e8'); g.rect(hx - 1, mmy + 2, 3, 1, '#c8505a'); }
  else if (mo === 'shout') { g.rect(hx - 4, mmy - 1, 9, 5, '#3a1214'); g.rect(hx - 4, mmy - 1, 9, 1, '#f6f2e8'); g.rect(hx - 3, mmy + 3, 7, 1, '#f6f2e8'); g.rect(hx - 2, mmy + 2, 5, 1, '#c8505a'); }
  else if (mo === 'pant') { g.rect(hx - 3, mmy, 7, 3, '#3a1214'); g.rect(hx - 2, mmy + 2, 5, 2, '#c8505a'); }
  if (P.sweat) { [[-13, -6], [14, -3], [-12, 4]].forEach(function (s, i) { var sxx = hx + s[0], syy = hy + s[1] + ((P.sweat + i) % 2); g.set(sxx, syy, '#bfe8ff'); g.set(sxx, syy + 1, '#8fd0f0'); g.set(sxx, syy - 1, '#ffffff'); }); }
  /* toque alto con pliegues */
  var tx = hx + hatDx, ty = hy - 9 + hatDy;
  var HW = ['#8c8a93', '#bdb9ab', '#e6e2d4', '#fbf8ec'];
  if (!P.noHat) {
    for (var y3 = ty - 4; y3 <= ty + 2; y3++) { var w3 = 11, x3; for (x3 = -w3; x3 <= w3; x3++) g.set(tx + x3, y3, x3 === -w3 ? HW[3] : (x3 === w3 ? HW[0] : (x3 === w3 - 1 ? HW[1] : HW[2]))); }
    g.rect(tx - 11, ty + 1, 23, 2, HW[1]); g.rect(tx - 11, ty + 2, 23, 1, HW[0]);                // banda
    [[-6, 4], [0, 8], [6, 4]].forEach(function (bmp) { blobG(g, tx + bmp[0] + (bmp[0] ? 0 : 0), ty - 8 - (bmp[0] === 0 ? 3 : 0), 8, 6.5, HW); });
    blobG(g, tx, ty - 8, 13, 5, HW);
    for (var px_ = -9; px_ <= 9; px_ += 4) { g.line(tx + px_, ty - 3, tx + px_ + (px_ > 0 ? 1 : (px_ < 0 ? -1 : 0)), ty + 1, HW[1]); }
    g.line(tx - 5, ty - 14, tx - 6, ty - 8, HW[1]); g.line(tx + 4, ty - 15, tx + 5, ty - 9, HW[1]);
  }
  /* brazos (adelante): hombro -> mano; manga gruesa con puno rojo */
  [-1, 1].forEach(function (s) {
    var key = s < 0 ? 'aL' : 'aR', A = P[key] || { h: [CCX + s * 28, Y(21)], hold: 'sticks', ang: -1.45 };
    var shx = CCX + s * 19, shy = Y(38), hx2 = A.h[0], hy2 = A.h[1];
    var J1 = ik2(shx, shy, hx2, hy2, 15, 14, 1), J2 = ik2(shx, shy, hx2, hy2, 15, 14, -1), J = Math.abs(J1[0] - CCX) > Math.abs(J2[0] - CCX) ? J1 : J2;
    if (A.inward) J = Math.abs(J1[0] - CCX) > Math.abs(J2[0] - CCX) ? J2 : J1;
    blobG(g, shx, shy, 7, 6, CH.wh);
    tubeG(g, shx, shy, J[0], J[1], 5, CH.wh); tubeG(g, J[0], J[1], hx2, hy2, 4.4, CH.wh);
    var ux = hx2 - J[0], uy = hy2 - J[1], L = Math.sqrt(ux * ux + uy * uy) || 1; ux /= L; uy /= L;
    for (var t = 0; t < 3; t++) g.disc(hx2 - ux * (3 + t), hy2 - uy * (3 + t), 4 - t * 0.0, t === 1 ? CH.red[3] : CH.red[2]);              // puno rojo
    for (var t2 = 0; t2 < 2; t2++) g.disc(hx2 - ux * (5.5 + t2 * 0.5), hy2 - uy * (5.5 + t2 * 0.5), 4.3, CH.red[1]);
    tubeG(g, hx2 - ux * 1, hy2 - uy * 1, hx2 - ux * 3, hy2 - uy * 3, 3.2, CH.red);
    if (A.hold === 'ladle') {
      var lx = hx2, ly = hy2, la = A.lang === undefined ? -1.2 : A.lang, ex = lx + Math.cos(la) * 20, ey2 = ly + Math.sin(la) * 20;
      tubeG(g, lx, ly, ex, ey2, 1.3, CH.wd); blobG(g, ex + Math.cos(la) * 3, ey2 + Math.sin(la) * 3, 4.6, 3.6, CH.st); g.set(Math.round(ex + Math.cos(la) * 3), Math.round(ey2 + Math.sin(la) * 3), CH.st[0]);
    }
    fistC(g, hx2, hy2);
    if (A.hold === 'cup') { g.rect(hx2 - 3, hy2 - 6, 7, 5, '#f6f2e8'); g.rect(hx2 - 3, hy2 - 6, 7, 1, '#ffffff'); g.rect(hx2 - 3, hy2 - 4, 7, 1, '#2a62d0'); g.rect(hx2 + 4, hy2 - 5, 2, 3, '#bdb9ab'); g.set(hx2 - 1, hy2 - 9, '#d8dce0'); g.set(hx2, hy2 - 10, '#c0c6cc'); g.set(hx2 + 1, hy2 - 8, '#d8dce0'); g.set(hx2 + 2, hy2 - 11, '#c0c6cc'); g.rect(hx2 - 3, hy2 - 2, 7, 1, '#bdb9ab'); fistC(g, hx2, hy2); }
    if (A.hold === 'sticks') sticksG(g, hx2, hy2 - 2, A.ang === undefined ? -1.5 : A.ang, A.n || 5, A.len || 15, A.spread === undefined ? 0.55 : A.spread);
  });
  return g;
}
function chefCv(P) { return fin(chefG(P), CCX, CFY); }
function rotG(g, ang, pxv, pyv) {                          // gira el sprite (vecino mas cercano) alrededor de un punto
  var n = new G(g.w, g.h), ca = Math.cos(-ang), sa = Math.sin(-ang), x, y;
  for (y = 0; y < g.h; y++) for (x = 0; x < g.w; x++) { var dx = x - pxv, dy = y - pyv, c = g.get(Math.round(pxv + dx * ca - dy * sa), Math.round(pyv + dx * sa + dy * ca)); if (c) n.set(x, y, c); }
  return n;
}
function shearG(g, k, fy, cx) {                              // inclina el sprite: las filas de arriba se corren k px por cada px de altura
  var n = new G(g.w, g.h), x, y;
  for (y = 0; y < g.h; y++) { var off = Math.round((fy - y) * k); for (x = 0; x < g.w; x++) { var c = g.d[y * g.w + x]; if (c) n.set(x + off, y, c); } }
  return n;
}
function chefDead() {
  var g = new G(96, 52), cy = 27;
  /* charco y sombra */
  g.ell(46, 31, 42, 18, '#3a2a2a'); g.ell(46, 30, 40, 16, '#2c2024');
  /* piernas (a la derecha) */
  [[-1, -1], [1, 1]].forEach(function (s) {
    var y0 = cy + s[0] * 7 + (s[0] > 0 ? 3 : -3);
    for (var x = 62; x <= 80; x++) for (var y = y0 - 4; y <= y0 + 4; y++) { var xr = x, ch = (((xr >> 1) + (y >> 1)) & 1); g.set(xr, y, y === y0 - 4 ? '#e0e0d8' : (y === y0 + 4 ? '#1a1a22' : (ch ? '#2c2c36' : '#cfcfc6'))); }
    for (var yy = y0 - 4; yy <= y0 + 4; yy++) for (var xx = 80; xx <= 87; xx++) g.set(xx, yy, yy === y0 - 4 ? CH.blk[3] : (yy === y0 + 4 ? CH.blk[0] : CH.blk[1]));
  });
  /* brazos abiertos (arriba y abajo) con mangas blancas y punos rojos */
  [[-1], [1]].forEach(function (s) {
    var yy = cy + s[0] * 19; tubeG(g, 38, cy + s[0] * 11, 24, yy + s[0] * 1, 5, CH.wh); tubeG(g, 24, yy, 14, yy + s[0] * 3, 4.2, CH.wh); g.rect(12, yy + s[0] * 3 - 3, 4, 7, CH.red[2]); g.rect(12, yy + s[0] * 3 - 3, 1, 7, CH.red[3]); fistC(g, 9, yy + s[0] * 3);
  });
  /* panza: monton blanco con mandil manchado */
  blobG(g, 50, cy, 25, 17, CH.wh);
  var x, y;
  for (y = cy - 10; y <= cy + 10; y++) for (x = 44; x <= 64; x++) { var dx = (x - 50) / 25, dy = (y - cy) / 17; if (dx * dx + dy * dy < 0.95) g.set(x, y, (x === 44) ? CH.ap[3] : (x >= 63 ? CH.ap[1] : CH.ap[2])); }
  g.rect(46, cy - 1, 16, 1, CH.red[2]); g.rect(60, cy - 2, 4, 3, CH.red[2]);
  [[50, cy - 6], [55, cy + 4], [58, cy - 3], [48, cy + 7]].forEach(function (s) { g.set(s[0], s[1], '#6a3a1c'); g.set(s[0] + 1, s[1], '#a02a1c'); });
  for (var by2 = -1; by2 <= 1; by2 += 2) { g.rect(38, cy + by2 * 6, 3, 2, CH.red[3]); }
  /* cabeza a la izquierda mirando al cielo (de arriba): cara con ojos cerrados en X y bigote */
  blobG(g, 22, cy, 11.5, 11, CH.sk);
  g.line(18, cy - 5, 21, cy - 3, CH.hair[0]); g.line(18, cy + 5, 21, cy + 3, CH.hair[0]);
  g.line(16, cy - 3, 19, cy - 1, CH.hair[0]); g.line(19, cy - 3, 16, cy - 1, CH.hair[0]); g.line(16, cy + 1, 19, cy + 3, CH.hair[0]); g.line(19, cy + 1, 16, cy + 3, CH.hair[0]);
  g.rect(24, cy - 2, 5, 5, CH.sk[2]);                      // nariz
  g.rect(27, cy - 6, 3, 12, CH.hair[1]); g.set(28, cy - 7, CH.hair[2]); g.set(28, cy + 6, CH.hair[2]);  // bigote caido
  g.rect(31, cy - 1, 2, 3, '#3a1214');
  /* toque caido al lado */
  blobG(g, 9, 6, 8, 5, CH.wh); blobG(g, 17, 5, 6, 4, CH.wh); g.rect(5, 8, 17, 2, CH.wh[1]);
  /* estrellitas de mareo */
  [[4, 20], [8, 38], [2, 32]].forEach(function (s) { g.set(s[0], s[1], '#f2e63c'); g.set(s[0] + 1, s[1], '#f2e63c'); g.set(s[0], s[1] - 1, '#fff6a0'); g.set(s[0], s[1] + 1, '#fff6a0'); });
  return fin(g, 48, 30);
}
function wokG(ang, w) {                                      // wok suelto visto casi de arriba (3/4): interior oscuro con brillo y el mango de madera
  var g = new G(40, 34), cx = 17, cy = 17;
  var hx = cx + Math.cos(ang) * 18, hy = cy + Math.sin(ang) * 13;
  tubeG(g, cx + Math.cos(ang) * 12, cy + Math.sin(ang) * 9, hx, hy, 1.6, CH.wd);
  blobG(g, cx, cy, 15, 12.5, CH.st);
  g.ell(cx, cy, 12.5, 10, CH.st[0]); blobG(g, cx + 1, cy + 1, 11, 8.5, [CH.blk[0], CH.blk[1], CH.blk[1], CH.blk[2]]);
  g.set(cx - 5, cy - 4, CH.st[3]); g.set(cx - 4, cy - 5, CH.st[3]); g.set(cx - 6, cy - 3, CH.st[2]);
  if (w) { g.set(cx + 3, cy, '#d4382e'); g.set(cx + 4, cy + 1, '#f2b21a'); g.set(cx - 1, cy + 2, '#5aa040'); g.set(cx + 5, cy - 2, '#f6e6a0'); }
  return fin(g, cx, cy);
}
function chefPose(name, f) {
  var A = function (h, o) { var r = { h: h, hold: 'sticks', ang: -1.5 }; if (o) for (var k in o) r[k] = o[k]; return r; };
  var Yb = function (u) { return CFY - u; };
  switch (name + f) {
    case 'idle0': return { aL: A([CCX - 29, Yb(21)], { ang: -1.7 }), aR: A([CCX + 29, Yb(21)], { ang: -1.45 }), mouth: 'closed' };
    case 'idle1': return { belly: 1, headDy: 1, aL: A([CCX - 29, Yb(20)], { ang: -1.65 }), aR: A([CCX + 29, Yb(20)], { ang: -1.5 }), mouth: 'closed', hatDy: 1 };
    case 'alza0': return { aL: A([CCX - 30, Yb(46)], { ang: -1.9, n: 5 }), aR: A([CCX + 30, Yb(46)], { ang: -1.25, n: 5 }), mouth: 'open', brow: 'angry' };
    case 'alza1': return { aL: A([CCX - 27, Yb(66)], { ang: -2.1, n: 6, spread: 0.9, len: 16 }), aR: A([CCX + 27, Yb(66)], { ang: -1.05, n: 6, spread: 0.9, len: 16 }), mouth: 'shout', brow: 'angry', headDy: -1 };
    case 'lanza0': return { aL: A([CCX - 34, Yb(58)], { ang: -2.3, n: 4 }), aR: A([CCX + 34, Yb(58)], { ang: -0.85, n: 4 }), mouth: 'open', brow: 'angry', lean: -1, sq: 2 };
    case 'lanza1': return { aL: A([CCX - 17, Yb(24)], { hold: 'none' }), aR: A([CCX + 17, Yb(24)], { hold: 'none' }), mouth: 'shout', brow: 'angry', lean: 1, sq: 1, headDy: 1 };
    case 'lanza2': return { aL: A([CCX - 28, Yb(14)], { hold: 'none' }), aR: A([CCX + 28, Yb(14)], { hold: 'none' }), mouth: 'open', brow: 'angry', sq: 2, belly: 1 };
    case 'llama0': return { ladleHand: true, aL: A([CCX - 22, Yb(30)], { hold: 'none', inward: 1 }), aR: A([CCX + 30, Yb(60)], { hold: 'ladle', lang: -1.0 }), mouth: 'open', brow: 'angry' };
    case 'llama1': return { ladleHand: true, aL: A([CCX - 30, Yb(40)], { hold: 'none' }), aR: A([CCX + 18, Yb(32)], { hold: 'ladle', lang: 0.9 }), mouth: 'shout', brow: 'angry', headDy: 1, belly: 1 };
    case 'llama2': return { ladleHand: true, aL: A([CCX - 36, Yb(52)], { hold: 'none' }), aR: A([CCX + 34, Yb(66)], { hold: 'ladle', lang: -0.7 }), mouth: 'shout', brow: 'angry', headDy: -1, eyes: 'closed' };
    case 'salta0': return { sq: 9, aL: A([CCX - 32, Yb(22)], { hold: 'none' }), aR: A([CCX + 32, Yb(22)], { hold: 'none' }), mouth: 'open', brow: 'angry', headDy: 2 };
    case 'salta1': return { jump: 16, tuck: 1, aL: A([CCX - 26, Yb(62)], { hold: 'none' }), aR: A([CCX + 26, Yb(62)], { hold: 'none' }), mouth: 'shout', brow: 'angry', hatDy: -2 };
    case 'salta2': return { sq: 10, aL: A([CCX - 34, Yb(24)], { hold: 'none' }), aR: A([CCX + 34, Yb(24)], { hold: 'none' }), mouth: 'open', brow: 'angry', belly: 2 };
    case 'cae0': return { noHat: 1, aL: A([CCX - 30, Yb(56)], { hold: 'none' }), aR: A([CCX + 30, Yb(56)], { hold: 'none' }), mouth: 'shout', brow: 'tired', eyes: 'closed' };
    case 'sentado0': return { sit: 1, sq: 11, wok: true, aL: A([CCX - 25, Yb(22)], { hold: 'none' }), aR: A([CCX + 18, Yb(38)], { hold: 'cup', inward: 1 }), mouth: 'pant', brow: 'tired', hatDx: 2, hatDy: 1, sweat: 1, headDy: 1 };
    case 'sentado1': return { sit: 1, sq: 11, belly: 1, aL: A([CCX - 25, Yb(21)], { hold: 'none' }), aR: A([CCX + 20, Yb(30)], { hold: 'cup', inward: 1 }), mouth: 'open', brow: 'tired', hatDx: -1, hatDy: 2, sweat: 2, headDy: 2 };
    default: return {};
  }
}
function buildChef() {
  var C = {};
  function mk(n, i) { return chefCv(chefPose(n, i)); }
  C.idle = [mk('idle', 0), mk('idle', 1)];
  C.alza = [mk('alza', 0), mk('alza', 1)];
  C.lanza = [mk('lanza', 0), mk('lanza', 1), mk('lanza', 2)];
  C.llama = [mk('llama', 0), mk('llama', 1), mk('llama', 2)];
  C.salta = [mk('salta', 0), mk('salta', 1), mk('salta', 2)];
  /* cae: el cuerpo se va hacia atras (rotado), el toque sale volando */
  (function () {
    var p = chefPose('cae', 0); p.jump = 5; p.sq = 2;
    var g = chefG(p), r = rotG(g, -0.62, CCX, CFY - 4), h = new G(CW, CHH);
    h.blit(r, 3, 0);
    blobG(h, 88, 14, 8, 5, CH.wh); blobG(h, 82, 11, 6, 4, CH.wh); h.rect(78, 16, 17, 2, CH.wh[1]);
    C.cae = fin(h, CCX + 3, CFY);
  })();
  C.sentado = [mk('sentado', 0), mk('sentado', 1)];
  C.hurt = (function () { var g = chefG(chefPose('idle', 0)); g.outline(); return flatC(g.solid('#ffffff'), CCX, CFY); })();
  C.dead = chefDead();
  C.wok = wokG(-0.6, true);
  C.wokRoll = [0, 1, 2, 3].map(function (i) { return wokG(-0.6 + i * 1.5708, false); });
  return C;
}
lazy(PJ, 'chef', buildChef);

/* ======================== PALITOS, DUMPLINGS, BAOZI, SOMBRAS DE AVISO ======================== */
safe('palitos', function () {
  /* vuela: un palito chino apuntando a la derecha (el motor lo rota); 20x7, ancla en el centro (10,3) */
  var g = new G(20, 7), i;
  for (i = 2; i <= 17; i++) { g.set(i, 3, i < 4 ? CH.red[2] : CH.wd[2]); g.set(i, 2, i < 4 ? CH.red[3] : CH.wd[3]); g.set(i, 4, i < 4 ? CH.red[1] : CH.wd[1]); }
  g.set(18, 3, CH.wd[1]); g.set(19, 3, CH.wd[0]); g.set(17, 2, CH.wd[2]);
  g.rect(1, 2, 2, 3, CH.red[2]); g.set(1, 2, CH.red[3]); g.set(1, 4, CH.red[1]);
  g.set(6, 3, CH.red[1]); g.set(7, 3, CH.red[1]); g.set(5, 2, CH.red[3]); g.set(6, 2, CH.red[2]);
  var vu = fin(g, 10, 3);
  /* clavado: en el piso, inclinado, con la grieta y el polvo; 12x20, ancla (6,19) = el punto donde se clava */
  var h = new G(12, 20);
  for (i = 0; i < 14; i++) { var x = 6 - Math.round(i * 0.22), y = 17 - i; h.set(x, y, i > 10 ? CH.red[2] : CH.wd[2]); h.set(x + 1, y, i > 10 ? CH.red[1] : CH.wd[1]); h.set(x - 1, y, i > 10 ? CH.red[3] : CH.wd[3]); }
  h.rect(2, 3, 3, 2, CH.red[2]); h.set(2, 3, CH.red[3]);
  [[2, 18], [10, 18], [9, 19], [3, 19], [1, 17], [11, 17]].forEach(function (p) { h.set(p[0], p[1], '#a8956e'); });
  h.set(4, 18, '#4a3f3c'); h.set(8, 18, '#4a3f3c'); h.set(5, 19, '#4a3f3c'); h.set(7, 19, '#4a3f3c');
  PJ.palito = { vuela: vu, clavado: fin(h, 6, 18) };
});

/* masa blanca (rampa de 4) y tinta de la cara */
var DU = { d: ['#b8a888', '#d8caa8', '#f2e9d0', '#fffaf0'], ink: '#3a2418', mouth: '#4a1218', tongue: '#e8707a', tooth: '#fffdf4', blush: '#f4a0a0', fill: ['#8a3a2a', '#b85a44', '#d88a68'] };
function dumplingG(o) {
  var W = o.W, H = o.H, g = new G(W, H), cx = o.cx, base = o.base, rx = o.rx, ry = o.ry, lift = o.lift || 0, s = o.s || 1, i, k;
  var cy = base - lift - ry;                                  // centro del cuerpo
  /* cuerpo: bola de masa un poco mas ancha abajo */
  blobG(g, cx, cy, rx, ry, DU.d);
  g.rect(cx - Math.round(rx * 0.8), Math.round(cy + ry * 0.45), Math.round(rx * 1.6) + 1, Math.max(1, Math.round(ry * 0.5)), DU.d[2]);
  /* corona de pliegues arriba */
  var top = cy - ry;
  if (o.kind === 'bao') {
    g.disc(cx, top + 1, 2.4, DU.d[3]); g.set(cx, top, DU.d[1]);
    for (k = 0; k < 9; k++) { var a = k / 9 * 6.283 - 1.2; var r1 = 2.6, r2 = 5.2; g.line(cx + Math.cos(a) * r1, top + 1 + Math.sin(a) * r1 * 0.55, cx + Math.cos(a + 0.5) * r2, top + 1 + Math.sin(a + 0.5) * r2 * 0.6, DU.d[1]); }
    g.set(cx, top - 1, DU.d[2]); g.set(cx + 1, top - 1, DU.d[1]);
  } else {
    for (k = -3; k <= 3; k++) { var xx = cx + k * Math.round(rx * 0.26), yy = top + Math.round(Math.abs(k) * 0.7) + 1; g.line(cx, top - 1, xx, yy + 1, DU.d[1]); g.set(xx, yy, DU.d[2]); }
    g.rect(cx - 1, top - 2, 3, 2, DU.d[3]); g.set(cx, top - 3, DU.d[2]); g.set(cx + 1, top - 2, DU.d[1]);
  }
  /* ojitos cerrados en media luna (^ ^) */
  var ey = Math.round(cy - ry * 0.34 + (o.eyeDy || 0)), ex = Math.round(rx * 0.46), half = o.kind === 'bao' ? 3 : 2;
  [-1, 1].forEach(function (sg) {
    var X = cx + sg * ex;
    for (i = -(half - 1); i <= half - 1; i++) g.set(X + i, ey, DU.ink);              // ojito feliz cerrado: arco de media luna
    g.set(X - half, ey + 1, DU.ink); g.set(X + half, ey + 1, DU.ink);
    if (half === 3) { g.set(X - half, ey + 2, DU.ink); g.set(X + half, ey + 2, DU.ink); g.set(X - 1, ey - 1, DU.ink); g.set(X, ey - 1, DU.ink); g.set(X + 1, ey - 1, DU.ink); }
    g.set(X + sg * (half + 1), ey + 3, DU.blush); g.set(X + sg * (half + 2), ey + 3, DU.blush); if (half === 3) { g.set(X + sg * (half + 1), ey + 4, DU.blush); g.set(X + sg * (half + 2), ey + 4, DU.blush); }
  });
  /* boca enorme abierta con dientitos */
  var m = o.mouth || 'open', my = Math.round(cy + ry * 0.52), mrx = Math.round(rx * (m === 'wide' ? 0.62 : (m === 'chomp' ? 0.6 : 0.5))), mry = Math.round(ry * (m === 'wide' ? 0.42 : (m === 'open' ? 0.32 : (m === 'chomp' ? 0.18 : 0.26))));
  mrx = Math.max(mrx, 3); mry = Math.max(mry, 1.5);
  if (o.mouthDy) my += o.mouthDy;
  g.ell(cx, my, mrx, mry, DU.mouth);
  if (m === 'chomp') {                                        // dientes arriba y abajo entrelazados
    for (i = -mrx + 1; i <= mrx - 1; i += 2) { g.set(cx + i, Math.round(my - mry + 0.5), DU.tooth); g.set(cx + i + 1, Math.round(my + mry - 0.5), DU.tooth); }
  } else {
    for (i = -mrx + 1; i <= mrx - 1; i += 2) { g.set(cx + i, Math.round(my - mry + 0.6), DU.tooth); if (s > 1) g.set(cx + i, Math.round(my - mry + 1.6), DU.tooth); }
    if (m === 'wide') { g.set(cx - 2, Math.round(my + mry - 0.5), DU.tooth); g.set(cx + 2, Math.round(my + mry - 0.5), DU.tooth); }
    g.ell(cx, my + Math.max(1, mry - 1.1), Math.max(1.5, mrx * 0.5), 1, DU.tongue);
  }
  if (o.steam) { g.set(cx - 3, top - 4, '#ffffffa0'); g.set(cx - 2, top - 5, '#ffffff70'); g.set(cx + 3, top - 5, '#ffffffa0'); g.set(cx + 4, top - 6, '#ffffff60'); }
  if (o.lines) { [[-1, -1], [1, -1]].forEach(function (d) { for (i = 2; i < 5; i++) g.set(cx + d[0] * (rx + i), Math.round(cy + d[1] * i * 0.6), '#fff6a0'); }); }
  return g;
}
function buildDumpling(kind) {
  var big = kind === 'bao', W = big ? 36 : 26, H = big ? 40 : 28, cx = (W >> 1) - 1, base = H - 3, rx0 = big ? 12 : 8.5, ry0 = big ? 10.5 : 7.5;
  function mk(extra) { var o = { W: W, H: H, cx: cx, base: base, rx: rx0, ry: ry0, kind: kind, s: big ? 2 : 1 }; for (var k in extra) o[k] = extra[k]; var g = dumplingG(o); return fin(g, cx, base); }
  var C = {};
  C.hop = [mk({ rx: rx0 + 1, ry: ry0 - 1.6, mouth: 'open' }), mk({ rx: rx0 - 1, ry: ry0 + 1.4, lift: big ? 6 : 5, mouth: 'wide', eyeDy: -1 }), mk({ rx: rx0, ry: ry0, lift: big ? 3 : 2, mouth: 'wide' })];
  C.muerde = [mk({ rx: rx0 + 0.5, ry: ry0 + 0.5, lift: big ? 2 : 1, mouth: 'wide', mouthDy: 1 }), mk({ rx: rx0 + 1.5, ry: ry0 - 1.2, mouth: 'chomp', lines: true })];
  /* muerto: aplastado, con el relleno afuera */
  var g = new G(W + 4, 16), w2 = (W + 4) >> 1, i;
  blobG(g, w2, 9, rx0 + 1.5, 4.6, DU.d);
  blobG(g, w2 + Math.round(rx0 * 0.5), 10, 4.5 * (big ? 1.3 : 1), 2.4, DU.fill.concat([DU.fill[2]]));
  for (i = -3; i <= 3; i += 2) { g.set(w2 + i, 5, DU.d[1]); g.set(w2 + i, 4, DU.d[2]); }
  [-1, 1].forEach(function (sg) { g.line(w2 + sg * 3 - 1, 8, w2 + sg * 3 + 1, 8, DU.ink); });
  g.set(w2 - 1, 10, DU.mouth); g.set(w2, 10, DU.mouth); g.set(w2, 11, DU.tongue);
  g.set(w2 + 3, 2, '#ffffff90'); g.set(w2 + 4, 1, '#ffffff60'); g.set(w2 - 4, 2, '#ffffff80');
  C.dead = fin(g, w2, 11);
  return C;
}
safe('dumplings', function () {
  lazy(PJ, 'dumpling', function () { return buildDumpling('dump'); });
  lazy(PJ, 'baozi', function () { return buildDumpling('bao'); });
});
/* sombras de aviso (translucidas, sin contorno): el motor las dibuja bajo el lugar de caida; [0] chica y palida -> [2] llena con anillo rojo */
function shadowG(rx, ry, a, ring) {
  var w = rx * 2 + 5, h = ry * 2 + 5, g = new G(w, h), cx = rx + 2, cy = ry + 2, x, y;
  var A = ('0' + Math.round(a * 255).toString(16)).slice(-2);
  g.ell(cx, cy, rx, ry, '#2a2440' + A);
  g.ell(cx, cy, Math.max(1, rx * 0.6), Math.max(1, ry * 0.6), '#1c1830' + ('0' + Math.round(Math.min(1, a * 1.2) * 255).toString(16)).slice(-2));
  if (ring) {
    for (var t = 0; t < 6.283; t += 0.05) { var X = Math.round(cx + Math.cos(t) * (rx + 1)), Y2 = Math.round(cy + Math.sin(t) * (ry + 1)); if (((X + Y2) & 3) < 3) g.set(X, Y2, '#e8382c'); }
  }
  return flatC(g, cx, cy);
}
safe('sombras', function () {
  PJ.sombra = [shadowG(7, 4, 0.28, false), shadowG(11, 6, 0.42, false), shadowG(15, 8, 0.58, true)];
  PJ.sombraGrande = [shadowG(26, 13, 0.25, false), shadowG(38, 19, 0.38, false), shadowG(50, 25, 0.52, true)];
});

/* ======================== PERRITOS (6 razas, 4 direcciones) ======================== */
/* walk/run: {down,up,left,right}[4]; bite[2] (mirando a la derecha: el motor voltea); sit (de frente).
   Lienzos 38x26, ancla (19,22) = patas en el suelo, centro del cuerpo. Todos perezosos por raza. */
function rampHex(base, k) { return [px.shade(base, 0.5), px.shade(base, 0.76), base, px.mix(base, '#ffffff', k || 0.3)]; }
var DOGS = {
  chusco:    { c: rampHex('#b98a58'), L: 14, H: 7, leg: 4, hr: 4.3, sn: 2.4, ear: 'floppy', earC: '#7a5836', tail: 'up', socks: '#efe4cc', patch: '#efe4cc', nose: '#2a1a18', fw: 8, snout: '#d8b886' },
  salchicha: { c: rampHex('#9a5a30'), L: 20, H: 6, leg: 2, hr: 3.7, sn: 3.4, ear: 'floppy', earC: '#5a2e18', tail: 'thin', nose: '#201210', fw: 6, snout: '#b87a4a' },
  golden:    { c: rampHex('#e6b050', 0.4), L: 16, H: 8, leg: 5, hr: 4.7, sn: 2.8, ear: 'floppy', earC: '#b88030', tail: 'fluffy', tongue: true, nose: '#201210', fw: 9, snout: '#f2cf86', feather: '#f2cf86' },
  pug:       { c: rampHex('#dcb888', 0.35), L: 10, H: 7, leg: 3, hr: 4.8, sn: 1.4, ear: 'fold', earC: '#3a2c28', mask: '#3a2c28', tail: 'curl', nose: '#141010', fw: 8, snout: '#3a2c28', wrinkle: true },
  singpelo:  { c: rampHex('#6a6670', 0.25), L: 12, H: 6, leg: 6, hr: 3.8, sn: 2.8, ear: 'big', earC: '#8a7680', tail: 'thin', tuft: '#2a2428', spots: '#d8a0a8', nose: '#201a1e', fw: 6, snout: '#8a7680' },
  husky:     { c: rampHex('#8a96a4', 0.3), L: 16, H: 8, leg: 5, hr: 4.7, sn: 2.8, ear: 'pointy', earC: '#5a6270', tail: 'curl', mask: '#f2f4f6', belly: '#f2f4f6', tongue: true, blueEye: true, nose: '#141418', fw: 9, snout: '#f2f4f6' }
};
var DW = 38, DH = 26, DGY = 22, DAX = 19;
function legD(g, x, y0, len, dx, lift, c, paw, th) {
  th = th || 2;
  var y1 = DGY - lift, i, t;
  var n = Math.max(1, Math.abs(y1 - y0));
  for (i = 0; i <= n; i++) { t = i / n; var xx = Math.round(x + dx * t), yy = Math.round(y0 + (y1 - y0) * t); g.set(xx, yy, c[2]); if (th > 1) g.set(xx + 1, yy, c[1]); g.set(xx - 0, yy, c[2]); }
  g.set(Math.round(x + dx), y1, paw || c[3]); if (th > 1) g.set(Math.round(x + dx) + 1, y1, paw || c[2]); g.set(Math.round(x + dx) + 2, y1, paw || c[3]);
}
function earD(g, sp, hx, hy, o, flap) {
  var e = sp.ear;
  if (e === 'floppy') { blobG(g, hx - 2 - flap, hy + 1 + (o.run ? -1 : 1), 2.1, 3.2, rampHex(sp.earC)); }
  else if (e === 'fold') { blobG(g, hx - 2, hy - 1, 2.2, 2.2, rampHex(sp.earC, 0.15)); g.set(hx - 1, hy - 3, sp.earC); }
  else if (e === 'pointy') { g.line(hx - 3, hy - 3, hx - 3 - flap, hy - 7, sp.earC); g.line(hx - 2, hy - 3, hx - 2 - flap, hy - 7, sp.c[2]); g.line(hx - 1, hy - 3, hx - 1 - flap, hy - 6, sp.c[2]); g.line(hx + 1, hy - 3, hx + 1 - flap, hy - 7, sp.earC); g.line(hx + 2, hy - 3, hx + 2 - flap, hy - 6, sp.c[2]); g.set(hx - 2 - flap, hy - 5, '#e8a8a8'); }
  else if (e === 'big') { g.line(hx - 2, hy - 3, hx - 4 - flap, hy - 8, sp.earC); g.line(hx - 1, hy - 3, hx - 3 - flap, hy - 8, sp.earC); g.line(hx, hy - 3, hx - 2 - flap, hy - 7, sp.earC); g.set(hx - 3 - flap, hy - 6, '#e8b0b8'); g.set(hx - 2 - flap, hy - 5, '#e8b0b8'); g.set(hx - 4 - flap, hy - 8, sp.c[3]); }
}
function tailD(g, sp, tx, ty, o, w) {                         // w = fase de meneo
  var c = sp.c, t = sp.tail, i;
  if (t === 'up') { g.line(tx, ty, tx - 2, ty - 4 + w, c[1]); g.line(tx + 1, ty, tx - 1, ty - 4 + w, c[2]); g.set(tx - 2, ty - 5 + w, c[3]); }
  else if (t === 'thin') { g.line(tx, ty, tx - 4, ty - 2 + w, c[1]); g.line(tx, ty - 1, tx - 4, ty - 3 + w, c[2]); }
  else if (t === 'fluffy') { blobG(g, tx - 3, ty - 2 + w, 3.4, 2.2, c); g.set(tx - 6, ty - 3 + w, c[3]); g.set(tx - 6, ty - 2 + w, c[2]); }
  else if (t === 'curl') { g.disc(tx - 1, ty - 3, 2, c[2]); g.set(tx - 1, ty - 3, null); g.set(tx - 2, ty - 5 + w * 0.5, c[3]); g.set(tx, ty - 1, c[1]); g.set(tx - 1, ty - 5, c[1]); g.set(tx - 3, ty - 3, c[1]); g.set(tx + 1, ty - 3, c[1]); if (sp.mask) { g.set(tx - 1, ty - 3, sp.c[1]); } }
}
function dogSide(sp, o) {
  o = o || {};
  var g = new G(DW, DH), c = sp.c, L = sp.L + (o.stretch || 0), Hh = sp.H, leg = sp.leg, bob = o.bob || 0, bx = 17 + (o.dx || 0);
  var by = DGY - leg - Hh / 2 + bob, lg = o.legs || [0, 0, 0, 0], lf = o.lift || [0, 0, 0, 0];
  var fx = bx + L * 0.32, hx_ = bx - L * 0.32, top = Math.round(by);
  var dk = [c[0], c[0], c[1], c[1]];
  /* patas lejanas (oscuras) */
  legD(g, fx - 2, top, leg, lg[3], lf[3], dk, sp.socks ? sp.socks : null);
  legD(g, hx_ - 1, top, leg, lg[2], lf[2], dk, sp.socks ? sp.socks : null);
  /* cola */
  tailD(g, sp, bx - L / 2 + 0.5, by - Hh * 0.2, o, o.wag || 0);
  /* cuerpo */
  blobG(g, bx, by, L / 2 + 0.5, Hh / 2 + 0.5, c);
  if (sp.belly) { g.rect(Math.round(bx - L / 2 + 3), Math.round(by + Hh / 2 - 1), Math.round(L - 4), 2, sp.belly); }
  if (sp.patch) { blobG(g, bx + L * 0.3, by + 1.4, 2.6, 2.6, rampHex(sp.patch, 0.3)); }
  if (sp.spots) { g.set(Math.round(bx - 1), Math.round(by - 1), sp.spots); g.set(Math.round(bx), Math.round(by - 1), sp.spots); g.set(Math.round(bx + 2), Math.round(by + 1), sp.spots); g.set(Math.round(bx - 3), Math.round(by + 1), sp.spots); }
  if (sp.feather) { for (var f = 0; f < 4; f++) g.set(Math.round(bx - 3 + f * 2), Math.round(by + Hh / 2 - 0.5), sp.feather); }
  if (sp.tuft) { /* sin pelo: se nota la piel */ g.set(Math.round(bx), Math.round(by - Hh / 2), c[3]); g.set(Math.round(bx + 1), Math.round(by - Hh / 2), c[3]); }
  /* patas cercanas */
  legD(g, fx - 1, top, leg, lg[1], lf[1], c, sp.socks ? sp.socks : null);
  legD(g, hx_ - 0, top, leg, lg[0], lf[0], c, sp.socks ? sp.socks : null);
  /* cabeza (grande, con carita) */
  var hx = bx + L / 2 + 0.5 + (o.headDx || 0), hy = by - Hh / 2 - 0.8 + (o.headDy || 0), hr = sp.hr;
  blobG(g, hx - 2, hy + 3, 3, 3.4, c);                         // cuello
  earD(g, sp, hx, hy, o, o.flap || 0);
  blobG(g, hx, hy, hr, hr * 0.92, c);
  if (sp.mask) { blobG(g, hx + 1.5, hy + 1, hr * 0.62, hr * 0.62, rampHex(sp.mask, 0.1)); if (sp.ear === 'pointy') { g.rect(Math.round(hx - 1), Math.round(hy - hr), 3, 2, sp.mask); } }
  /* hocico */
  var sx = hx + hr * 0.75, sy = hy + 1.4;
  blobG(g, sx, sy, sp.sn, 1.9, rampHex(sp.snout || c[2], 0.2));
  if (sp.mask === '#3a2c28') { blobG(g, sx, sy, sp.sn + 0.5, 2.1, rampHex('#3a2c28', 0.15)); }
  g.rect(Math.round(sx + sp.sn - 1), Math.round(sy - 1), 2, 2, sp.nose);                 // nariz
  g.set(Math.round(sx + sp.sn - 1), Math.round(sy - 1), '#5a4a50');
  var m = o.mouth || 'closed', my = Math.round(sy + 1.6);
  if (m === 'open' || m === 'chomp') {
    var mw = m === 'open' ? 5 : 3, mh = m === 'open' ? 3 : 1;
    g.rect(Math.round(sx - 1), my, mw, mh, '#3a1214');
    for (var tt = 0; tt < mw; tt += 2) { g.set(Math.round(sx - 1) + tt, my, '#fffdf4'); if (m === 'open') g.set(Math.round(sx - 1) + tt + 1, my + mh - 1, '#fffdf4'); }
    if (m === 'open') g.rect(Math.round(sx + 1), my + 1, 2, 1, '#e8707a');
  } else if (sp.tongue || o.tongue) { g.set(Math.round(sx + 1), my, '#e8707a'); g.set(Math.round(sx + 1), my + 1, '#e8707a'); g.set(Math.round(sx + 2), my + 1, '#c85a68'); }
  else { g.set(Math.round(sx), my, '#3a1a1a'); g.set(Math.round(sx - 1), my, '#3a1a1a'); }
  if (sp.wrinkle) { g.set(Math.round(hx + 1), Math.round(hy - 2), '#1c1414'); g.set(Math.round(hx + 2), Math.round(hy - 2), '#1c1414'); g.set(Math.round(hx + 2), Math.round(hy - 3), '#6a5a48'); }
  /* ojo */
  var ex = Math.round(hx + 1.6), ey = Math.round(hy - 1);
  g.rect(ex, ey, 2, 2, sp.blueEye ? '#7ac8ff' : '#141010'); g.set(ex, ey, sp.blueEye ? '#d6f0ff' : '#ffffff');
  if (sp.blueEye) g.set(ex + 1, ey + 1, '#141418');
  if (sp.tuft) { for (var q = 0; q < 4; q++) g.set(Math.round(hx - 1 + q), Math.round(hy - hr - 0.5 + (q % 2 ? 0 : 0)), sp.tuft); g.set(Math.round(hx), Math.round(hy - hr - 1.5), sp.tuft); g.set(Math.round(hx + 1), Math.round(hy - hr - 1.5), sp.tuft); }
  return g;
}
function dogFront(sp, o, back) {
  o = o || {};
  var g = new G(DW, DH), c = sp.c, cx = 18, hr = sp.hr, Hh = sp.H, leg = sp.leg, bob = o.bob || 0, fw = sp.fw + (o.sit ? 2 : 0);
  var by = DGY - leg - Hh * 0.55 + bob;
  if (o.sit) by = DGY - Hh * 0.8 - 1 + bob;
  var lL = (o.lf || [0, 0])[0], lR = (o.lf || [0, 0])[1];
  /* cola (de espaldas sobre el cuerpo; de frente, asoma al costado) */
  if (back) {
    var wag = o.wag || 0;
    if (sp.tail === 'thin' || sp.tail === 'up') { g.line(cx, Math.round(by - Hh * 0.3), cx + wag, Math.round(by - Hh * 0.3) - 5, c[2]); g.line(cx + 1, Math.round(by - Hh * 0.3), cx + 1 + wag, Math.round(by - Hh * 0.3) - 5, c[1]); }
    else if (sp.tail === 'fluffy') { blobG(g, cx + wag, by - Hh * 0.5 - 2, 2.8, 3.2, c); }
    else { g.disc(cx + wag * 0.6, by - Hh * 0.4 - 1, 2, c[2]); g.set(cx + wag * 0.6, by - Hh * 0.4 - 1, c[0]); g.set(cx + wag * 0.6 - 1, by - Hh * 0.4 - 3, c[3]); }
  }
  /* patas */
  var legTop = Math.round(by + Hh * 0.2);
  if (!o.sit) {
    legD(g, cx - fw * 0.42, legTop, leg, 0, lL, c, sp.socks || null);
    legD(g, cx + fw * 0.42 - 2, legTop, leg, 0, lR, c, sp.socks || null);
  } else {
    blobG(g, cx - fw * 0.5, DGY - 3, 3.2, 3.2, c); blobG(g, cx + fw * 0.5, DGY - 3, 3.2, 3.2, c);
    legD(g, cx - 2.5, Math.round(by + 2), 6, 0, 0, c, sp.socks || null); legD(g, cx + 1, Math.round(by + 2), 6, 0, 0, c, sp.socks || null);
    g.rect(cx - 5, DGY, 3, 1, c[3]); g.rect(cx + 3, DGY, 3, 1, c[3]);
  }
  /* cuerpo */
  if (!o.sit) blobG(g, cx, by, fw / 2 + 0.5, Hh / 2 + 1, c); else blobG(g, cx, by, fw / 2 + 0.5, Hh / 2 + 3, c);
  if (!back) {
    if (sp.patch) blobG(g, cx, by + 1, 2.6, 3, rampHex(sp.patch, 0.3));
    if (sp.belly && !o.sit) blobG(g, cx, by + 1, 2.8, 2.6, rampHex(sp.belly, 0.1));
  }
  if (sp.feather && !back) { g.set(cx - 2, Math.round(by + Hh / 2), sp.feather); g.set(cx + 2, Math.round(by + Hh / 2), sp.feather); }
  /* cabeza */
  var hy = by - Hh / 2 - hr * 0.55 + (o.headDy || 0) + (o.sit ? -2 : 0);
  if (sp.ear === 'floppy') { blobG(g, cx - hr + 0.2, hy + 2.4, 2.2, 3.4, rampHex(sp.earC)); blobG(g, cx + hr - 0.2, hy + 2.4, 2.2, 3.4, rampHex(sp.earC)); }
  if (sp.ear === 'pointy') { [-1, 1].forEach(function (s) { g.line(cx + s * 3, Math.round(hy - hr + 1), cx + s * 4, Math.round(hy - hr - 3), sp.earC); g.line(cx + s * 2, Math.round(hy - hr + 1), cx + s * 3, Math.round(hy - hr - 3), sp.c[2]); g.line(cx + s * 1, Math.round(hy - hr + 1), cx + s * 2, Math.round(hy - hr - 2), sp.c[2]); }); }
  if (sp.ear === 'big') { [-1, 1].forEach(function (s) { g.line(cx + s * 3, Math.round(hy - hr + 2), cx + s * 5, Math.round(hy - hr - 4), sp.earC); g.line(cx + s * 2, Math.round(hy - hr + 2), cx + s * 4, Math.round(hy - hr - 4), sp.earC); g.line(cx + s * 3, Math.round(hy - hr + 2), cx + s * 4, Math.round(hy - hr - 3), sp.earC); if (!back) { g.set(cx + s * 4, Math.round(hy - hr - 2), '#e8b0b8'); g.set(cx + s * 3, Math.round(hy - hr), '#e8b0b8'); } }); }
  if (sp.ear === 'fold') { blobG(g, cx - hr + 0.5, hy - 1, 2.2, 2.6, rampHex(sp.earC, 0.15)); blobG(g, cx + hr - 0.5, hy - 1, 2.2, 2.6, rampHex(sp.earC, 0.15)); }
  blobG(g, cx, hy, hr + 0.4, hr, c);
  if (back) {
    if (sp.tuft) { for (var q = -2; q <= 2; q++) g.set(cx + q, Math.round(hy - hr - 0.5), sp.tuft); g.set(cx, Math.round(hy - hr - 1.5), sp.tuft); g.set(cx + 1, Math.round(hy - hr - 1.5), sp.tuft); }
    return g;
  }
  if (sp.mask) { blobG(g, cx, hy + 1, hr * 0.78, hr * 0.78, rampHex(sp.mask, 0.1)); if (sp.ear === 'pointy') { g.rect(cx - 1, Math.round(hy - hr), 3, 3, sp.mask); } }
  var sy = hy + 1.8, sw = Math.max(2.4, sp.sn * 0.9);
  blobG(g, cx, sy, sw, 2.2, rampHex(sp.snout || c[2], 0.2));
  if (sp.mask === '#3a2c28') blobG(g, cx, sy, sw + 0.6, 2.3, rampHex('#3a2c28', 0.15));
  g.rect(cx - 1, Math.round(sy - 1), 3, 2, sp.nose); g.set(cx - 1, Math.round(sy - 1), '#5a4a50');
  var my = Math.round(sy + 1.4);
  if (o.mouth === 'open') { g.rect(cx - 2, my, 5, 2, '#3a1214'); g.rect(cx - 1, my + 1, 3, 1, '#e8707a'); g.set(cx - 2, my, '#fffdf4'); g.set(cx + 2, my, '#fffdf4'); }
  else if (sp.tongue || o.tongue) { g.set(cx, my, '#e8707a'); g.set(cx, my + 1, '#e8707a'); g.set(cx + 1, my + 1, '#c85a68'); }
  else { g.set(cx - 1, my, '#3a1a1a'); g.set(cx + 1, my, '#3a1a1a'); }
  [-1, 1].forEach(function (s) {
    var exx = cx + s * Math.round(hr * 0.5) - (s < 0 ? 1 : 0), eyy = Math.round(hy - 0.5);
    g.rect(exx, eyy, 2, 2, sp.blueEye ? '#7ac8ff' : '#141010'); g.set(exx, eyy, sp.blueEye ? '#d6f0ff' : '#ffffff'); if (sp.blueEye) g.set(exx + 1, eyy + 1, '#141418');
    if (sp.wrinkle) { g.set(exx, eyy - 2, '#1c1414'); g.set(exx + 1, eyy - 2, '#1c1414'); }
  });
  if (sp.tuft) { for (var q2 = -2; q2 <= 2; q2++) g.set(cx + q2, Math.round(hy - hr - 0.5), sp.tuft); g.set(cx, Math.round(hy - hr - 1.5), sp.tuft); g.set(cx + 1, Math.round(hy - hr - 1.5), sp.tuft); }
  if (sp.spots) { g.set(cx + 4, Math.round(hy + 2), sp.spots); g.set(cx - 5, Math.round(by), sp.spots); }
  if (sp.tail && o.sit) { g.line(cx + fw * 0.6 + 1, DGY, cx + fw * 0.6 + 4, DGY - 1, c[2]); g.set(cx + fw * 0.6 + 4, DGY - 2, c[3]); }
  return g;
}
function dogCv(g) { return fin(g, DAX, DGY); }
function dogFlip(g) { return fin(g.flip(), DW - 1 - DAX, DGY); }
function buildDog(name) {
  var sp = DOGS[name], D = {}, i;
  var wl = [[2, -2, -2, 2], [0, 0, 0, 0], [-2, 2, 2, -2], [0, 0, 0, 0]];     // [trasera cerca, delantera cerca, trasera lejos, delantera lejos]
  var wlf = [[0, 0, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0], [1, 0, 0, 0]];
  var wbob = [0, 1, 0, 1], wag = [0, 1, 0, -1];
  D.walk = { right: [], left: [], down: [], up: [] }; D.run = { right: [], left: [], down: [], up: [] };
  for (i = 0; i < 4; i++) {
    var gw = dogSide(sp, { legs: wl[i], lift: [wl[i][0] > 0 ? 1 : 0, wl[i][1] < 0 ? 1 : 0, wl[i][2] > 0 ? 1 : 0, wl[i][3] < 0 ? 1 : 0].map(function (v, k) { return wlf[i][k] || v; }), bob: wbob[i], wag: wag[i], flap: i % 2, tongue: sp.tongue });
    D.walk.right.push(dogCv(gw)); D.walk.left.push(dogFlip(gw));
    var lfv = [[0, 0], [1, 0], [0, 0], [0, 1]][i];
    D.walk.down.push(dogCv(dogFront(sp, { lf: lfv, bob: wbob[i] }))); D.walk.up.push(dogCv(dogFront(sp, { lf: lfv, bob: wbob[i], wag: [-1, 0, 1, 0][i] }, true)));
  }
  var rl = [[-3, 3, -3, 3], [1, -1, 1, -1], [3, -3, 3, -3], [0, 0, 0, 0]], rlift = [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [2, 2, 2, 2]], rbob = [-1, -2, -1, -2];
  for (i = 0; i < 4; i++) {
    var gr = dogSide(sp, { legs: rl[i], lift: rlift[i], bob: rbob[i], stretch: i === 0 || i === 2 ? 2 : -1, dx: i === 0 ? -1 : 0, wag: i % 2 ? -1 : 1, flap: 2, run: 1, tongue: true, headDy: 1 });
    D.run.right.push(dogCv(gr)); D.run.left.push(dogFlip(gr));
    D.run.down.push(dogCv(dogFront(sp, { lf: [i % 2, (i + 1) % 2], bob: -1 - (i % 2), tongue: true, mouth: i % 2 ? 'open' : 'closed' })));
    D.run.up.push(dogCv(dogFront(sp, { lf: [i % 2, (i + 1) % 2], bob: -1 - (i % 2), wag: i % 2 ? -2 : 2 }, true)));
  }
  D.bite = [dogCv(dogSide(sp, { mouth: 'open', headDx: 2, headDy: 1, legs: [-1, 2, -2, 1], bob: 1, stretch: 1, flap: 1, dx: 0 })), dogCv(dogSide(sp, { mouth: 'chomp', headDx: 3, headDy: 2, legs: [-2, 1, -2, 1], bob: 1, stretch: 1, flap: 2, dx: 1 }))];
  D.sit = dogCv(dogFront(sp, { sit: 1, mouth: 'closed' }));
  return D;
}
safe('perros', function () {
  PJ.perro = {};
  Object.keys(DOGS).forEach(function (n) { lazy(PJ.perro, n, function () { return buildDog(n); }); });
  CV.dogBreeds = Object.keys(DOGS);
});

/* ======================== HELADERO (triciclo amarillo con sombrilla, de perfil mirando a la derecha) ======================== */
/* Lienzo 70x66, ancla (30, 62) = suelo, entre las ruedas. El logo se lee de ACH.cfg.marcasReales: real D'ONOFRIO / parodia D'ONOFRÍO (se vuelve a hornear con px.onMarcas, en el mismo lienzo). */
var HY = ['#8a6a06', '#d4a812', '#f5c518', '#ffe770'], HR = ['#6a1410', '#a82820', '#d83a2c', '#f2705a'], HM = ['#3b4250', '#5c6570', '#8c949a', '#cfd3cc'];
var HSKIN = ['#6a3e2c', '#8c5a40', '#b0785a', '#d09a76'];
var HW_ = 70, HH_ = 66, HGY = 62, HAX = 30;
function wheelH(g, cx, cy, r, ang, dark) {
  var i, a;
  for (a = 0; a < 6.283; a += 0.05) { g.set(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), dark ? '#141216' : '#1c1a22'); g.set(Math.round(cx + Math.cos(a) * (r - 1)), Math.round(cy + Math.sin(a) * (r - 1)), dark ? '#2a2830' : '#3a3840'); }
  for (i = 0; i < 4; i++) { var b = ang + i * 0.785; g.line(cx - Math.cos(b) * (r - 2), cy - Math.sin(b) * (r - 2), cx + Math.cos(b) * (r - 2), cy + Math.sin(b) * (r - 2), dark ? HM[1] : HM[3]); }
  g.rect(Math.round(cx) - 1, Math.round(cy) - 1, 3, 3, dark ? HM[1] : HM[2]); g.set(Math.round(cx), Math.round(cy), HM[0]);
}
function umbrellaH(g, cx, apY, edY, hw, sway) {
  var y, x, n = hw * 2;
  for (y = apY; y <= edY; y++) {
    var u = (y - apY) / (edY - apY), w = Math.round(hw * (0.12 + u * 0.88)), off = Math.round(sway * (1 - u));
    for (x = -w; x <= w; x++) {
      var gore = Math.floor((x + hw) / (hw * 0.34)) % 2, base = gore ? HR : HY;
      g.set(cx + x + off, y, x < -w * 0.45 ? base[3] : (x > w * 0.5 ? base[1] : base[2]));
    }
  }
  var w2 = hw;
  for (x = -w2; x <= w2; x++) { var up = (Math.round(x * 0.5) & 1) === 0 ? 1 : 0; g.set(cx + x, edY + 1 - up, (Math.floor((x + hw) / (hw * 0.34)) % 2) ? HR[1] : HY[1]); }
  g.set(cx + Math.round(sway), apY - 2, HM[3]); g.set(cx + Math.round(sway), apY - 1, HM[2]); g.set(cx + Math.round(sway), apY - 3, HM[3]);
}
function heladeroG(f, stop, real) {
  var g = new G(HW_, HH_), GY = HGY, bob = (!stop && (f & 1)) ? 1 : 0, ang = f * 0.7;
  var crx = 18, cry = GY - 9;
  /* sombrilla: va detras de todo lo demas */
  var ux = 42, upoleTop = GY - 52;
  g.line(ux, GY - 26, ux, upoleTop + 4, HM[2]); g.line(ux + 1, GY - 26, ux + 1, upoleTop + 4, HM[1]);
  umbrellaH(g, ux, upoleTop, GY - 38, 23, stop ? 0 : (f === 1 ? 1 : (f === 3 ? -1 : 0)));
  /* rueda trasera (grande) y ruedas delanteras bajo la caja */
  wheelH(g, 16, GY - 8, 8, ang, false);
  wheelH(g, 49, GY - 7, 7, -ang, true); wheelH(g, 45, GY - 7, 7, ang, false);
  /* cuadro y plataforma */
  g.line(16, GY - 8, 18, cry, HM[1]); g.line(18, cry, 14, GY - 20, HM[2]); g.line(16, GY - 8, 14, GY - 20, HM[2]);
  g.rect(28, GY - 10, 27, 2, HM[1]); g.rect(28, GY - 10, 27, 1, HM[2]); g.line(18, cry, 30, GY - 9, HM[1]);
  /* caja amarilla con franja roja y tapa */
  var x, y;
  for (y = GY - 23; y <= GY - 11; y++) for (x = 30; x <= 54; x++) g.set(x, y, x === 30 ? HY[3] : (x === 54 ? HY[1] : (y === GY - 23 ? HY[3] : (y === GY - 11 ? HY[1] : HY[2]))));
  
  g.rect(29, GY - 26, 27, 3, '#e8e4d4'); g.rect(29, GY - 26, 27, 1, '#fbf8ec'); g.rect(29, GY - 24, 27, 1, '#b8b4a2'); g.rect(40, GY - 28, 5, 2, HM[2]);
  var nm = real ? ["D'ONO", 'FRIO'] : ["D'ONO", 'FRÍO'];
  px.text(g, nm[0], 32, GY - 23, { font: 'a5', ink: '#b3201c' }); px.text(g, nm[1], 32, GY - 15, { font: 'a5', ink: '#b3201c' });
  /* heladito pintado en el costado */
  g.rect(51, GY - 21, 3, 2, '#f6a8c8'); g.rect(51, GY - 19, 3, 1, '#fbf8ec'); g.line(51, GY - 18, 53, GY - 18, '#d9a63c'); g.set(52, GY - 17, '#d9a63c');
  /* piernas pedaleando */
  var hipX = 13, hipY = GY - 19 + bob;
  [1, 0].forEach(function (near) {
    var a = ang * 1.4 + (near ? 0 : Math.PI), fx = crx + Math.cos(a) * 4.5, fy = cry + Math.sin(a) * 4.5;
    if (stop) { fx = near ? 14 : 22; fy = near ? GY - 1 : cry + 2; }
    var kn = ik2(hipX, hipY, fx, fy, 9, 9, 1), pant = near ? '#2a3a5c' : '#1a2440', sk = near ? HSKIN[2] : HSKIN[1];
    tubeG(g, hipX, hipY, kn[0], kn[1], 2.2, near ? ['#0e1424', '#1a2440', '#2a3a5c', '#4a5e8a'] : ['#0a0e1a', '#121a30', '#1a2440', '#2a3a5c']);
    g.line(kn[0], kn[1], fx, fy, sk); g.line(kn[0] + 1, kn[1], fx + 1, fy, near ? HSKIN[1] : HSKIN[0]);
    g.rect(Math.round(fx) - 1, Math.round(fy), 4, 2, near ? '#2a2830' : '#1a1820'); g.set(Math.round(fx) - 1, Math.round(fy), '#6a6870');
  });
  /* asiento, torso con polo amarillo, brazo, cabeza con gorra */
  g.rect(9, GY - 21 + bob, 7, 2, '#1c1a22'); g.rect(9, GY - 21 + bob, 7, 1, '#3a3840');
  var shx = 17 + (stop ? 0 : 1), shy = GY - 33 + bob + (stop ? 1 : 0);
  tubeG(g, 13, GY - 21 + bob, shx, shy, 3.4, ['#8a6a06', '#d4a812', '#f5c518', '#ffe770']);
  g.rect(12, GY - 24 + bob, 3, 1, HR[2]);                                        // franja roja de la camiseta
  if (stop) { var hand = [24, GY - 44]; var el = ik2(shx, shy, hand[0], hand[1], 8, 8, -1); tubeG(g, shx, shy, el[0], el[1], 1.8, HSKIN); g.line(el[0], el[1], hand[0], hand[1], HSKIN[2]); g.rect(hand[0] - 1, hand[1] - 1, 3, 3, HSKIN[3]); }
  else { var hd = [27, GY - 27 + bob], el2 = ik2(shx, shy, hd[0], hd[1], 7, 7, -1); tubeG(g, shx, shy, el2[0], el2[1], 1.8, ['#8a6a06', '#d4a812', '#f5c518', '#ffe770']); g.line(el2[0], el2[1], hd[0], hd[1], HSKIN[2]); g.rect(hd[0] - 1, hd[1] - 1, 3, 3, HSKIN[3]); }
  /* manillar y corneta */
  g.line(26, GY - 28 + bob, 28, GY - 25, HM[3]); g.line(27, GY - 25, 31, GY - 11, HM[1]);
  g.rect(29, GY - 31 + bob, 3, 2, '#1c1a22'); g.rect(31, GY - 32 + bob, 3, 4, HM[3]); g.rect(33, GY - 33 + bob, 2, 6, HM[2]); g.set(33, GY - 33 + bob, HM[3]);
  var hx = shx + 2, hy = shy - 5;
  blobG(g, hx, hy, 4.3, 4.2, HSKIN);                                             // cabeza
  g.rect(hx + 1, hy - 1, 2, 2, '#141010'); g.set(hx + 1, hy - 1, '#ffffff');      // ojo
  g.rect(hx + 3, hy + 0, 2, 2, HSKIN[2]); g.set(hx + 2, hy + 2, stop ? '#5a1a1a' : HSKIN[0]); g.set(hx + 3, hy + 2, stop ? '#5a1a1a' : HSKIN[0]); if (stop) g.set(hx + 2, hy + 3, '#5a1a1a');
  g.rect(hx - 4, hy - 3, 9, 2, HR[2]); g.rect(hx - 4, hy - 4, 8, 1, HR[3]); g.rect(hx + 3, hy - 2, 4, 1, HR[1]); g.rect(hx - 4, hy - 2, 9, 1, HR[1]);   // gorra roja con visera
  g.set(hx, hy - 3, '#fbf8ec');
  return g;
}
var HEL_CANV = null;
function buildHeladero() {
  var real = !(ACH.cfg && ACH.cfg.marcasReales === false);
  var ride = [0, 1, 2, 3].map(function (i) { return fin(heladeroG(i, false, real), HAX, HGY); });
  var stop = fin(heladeroG(0, true, real), HAX, HGY);
  return { ride: ride, stop: stop };
}
safe('heladero', function () {
  lazy(PJ, 'heladero', function () { HEL_CANV = buildHeladero(); return HEL_CANV; });
  if (typeof px.onMarcas === 'function') px.onMarcas(function () {
    if (!HEL_CANV) return;                                  // todavia no se horneo: nacera con el modo nuevo
    var n = buildHeladero(), all = HEL_CANV.ride.concat([HEL_CANV.stop]), src = n.ride.concat([n.stop]);
    all.forEach(function (c, i) { var x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.drawImage(src[i], 0, 0); });
  });
});

/* ======================== VENDEDORES (vivos, de frente) ======================== */
/* npc.<id> = { idle[4] }, lienzo 44x50, ancla (22, 46) = suelo entre los pies; ~32 px de alto (como Don Tito). */
var PW_ = 44, PH_ = 50, PGY = 46, PCX_ = 22;
function skinR(base) { return rampHex(base, 0.28); }
function personG(o, f) {
  var g = new G(PW_, PH_), cx = PCX_, GY = PGY, bob = (f === 1 || f === 3) ? 1 : 0, y, SK = o.skin, SH = o.shirt, PA = o.pants;
  if (o.back) o.back(g, f, bob, cx, GY);
  /* piernas y zapatos */
  for (y = GY - 7; y <= GY - 2; y++) { span(g, y, cx - 5, cx - 1, PA); span(g, y, cx + 1, cx + 5, PA); }
  g.rect(cx - 6, GY - 1, 6, 2, o.shoe); g.rect(cx + 1, GY - 1, 6, 2, o.shoe); g.rect(cx - 6, GY - 1, 6, 1, px.mix(o.shoe, '#ffffff', 0.3)); g.rect(cx + 1, GY - 1, 6, 1, px.mix(o.shoe, '#ffffff', 0.3));
  if (o.sole) { g.rect(cx - 6, GY, 6, 1, o.sole); g.rect(cx + 1, GY, 6, 1, o.sole); }
  /* torso */
  var ty0 = GY - 17 + bob;
  for (y = ty0; y <= GY - 8; y++) span(g, y, cx - 7, cx + 7, SH);
  g.rect(cx - 7, GY - 8, 15, 1, PA[0]); g.set(cx, GY - 8, '#c8a850');                          // cinturon
  if (o.shirtFn) o.shirtFn(g, ty0, cx, GY, bob, f);
  /* delantal */
  if (o.apron) { for (y = GY - 14 + bob; y <= GY - 4; y++) span(g, y, cx - 5, cx + 5, o.apron); g.rect(cx - 5, GY - 14 + bob, 11, 1, o.apron[3]); if (o.apronFn) o.apronFn(g, cx, GY, bob); }
  /* brazos */
  var armW = 3, ay = ty0 + 1, SL = o.longSleeve ? 7 : 3;
  function sleeve(x0, y0, len) { g.rect(x0, y0, armW, len, SH[2]); g.rect(x0, y0, armW, 1, SH[3]); g.rect(x0, y0, 1, len, SH[3]); g.rect(x0 + armW - 1, y0, 1, len, SH[1]); }
  function hand(x, y) { g.rect(x, y, 3, 3, SK[2]); g.rect(x, y, 3, 1, SK[3]); g.set(x + 2, y + 2, SK[1]); }
  var armL = o.armL || 'down', armR = (f === 2 && o.waveR !== false) ? 'wave' : (o.armR || 'down');
  if (armL === 'down') { sleeve(cx - 10, ay, SL); g.rect(cx - 10, ay + SL, armW, 6 - SL + 1, SK[2]); g.rect(cx - 10, ay + SL, 1, 6 - SL + 1, SK[3]); hand(cx - 10, ay + 6); }
  else { sleeve(cx - 10, ay, 3); var hp = o.armLHand; limbG(g, cx - 9, ay + 2, hp[0] + 1, hp[1] + 1, SK, 3); hand(hp[0], hp[1]); }
  if (armR === 'down') { sleeve(cx + 8, ay, SL); g.rect(cx + 8, ay + SL, armW, 6 - SL + 1, SK[2]); g.rect(cx + 10, ay + SL, 1, 6 - SL + 1, SK[1]); hand(cx + 8, ay + 6); }
  else if (armR === 'wave') { sleeve(cx + 8, ay, 3); limbG(g, cx + 10, ay + 2, cx + 13, ay - 7, SK, 3); hand(cx + 12, ay - 9); }
  else { sleeve(cx + 8, ay, 3); var hq = o.armRHand; limbG(g, cx + 9, ay + 2, hq[0] + 1, hq[1] + 1, SK, 3); hand(hq[0], hq[1]); }
  /* cabeza */
  var cy = GY - 23 + bob;
  g.rect(cx - 2, cy + 4, 4, 3, SK[1]);                                                           // cuello
  if (o.hairBack) o.hairBack(g, cx, cy);
  blobG(g, cx, cy, 4.9, 5.3, SK);
  g.set(cx - 5, cy + 1, SK[2]); g.set(cx + 5, cy + 1, SK[1]);                                    // orejas
  var blink = f === 1;
  if (blink) { g.line(cx - 3, cy, cx - 2, cy, '#141010'); g.line(cx + 2, cy, cx + 3, cy, '#141010'); }
  else { g.rect(cx - 3, cy - 1, 2, 2, '#141010'); g.rect(cx + 2, cy - 1, 2, 2, '#141010'); g.set(cx - 3, cy - 1, '#ffffff'); g.set(cx + 2, cy - 1, '#ffffff'); }
  g.set(cx - 4, cy + 2, '#e08a7a'); g.set(cx + 4, cy + 2, '#e08a7a');
  if (o.glasses) { [cx - 4, cx + 1].forEach(function (x0) { g.rect(x0, cy - 2, 4, 1, '#1c1a22'); g.rect(x0, cy + 1, 4, 1, '#1c1a22'); g.set(x0, cy - 1, '#1c1a22'); g.set(x0, cy, '#1c1a22'); g.set(x0 + 3, cy - 1, '#1c1a22'); g.set(x0 + 3, cy, '#1c1a22'); }); }
  if (o.mustache) { g.rect(cx - 3, cy + 2, 7, 1, o.hairC[1]); g.set(cx - 4, cy + 3, o.hairC[1]); g.set(cx + 4, cy + 3, o.hairC[1]); }
  var talk = (f === 2 || f === 3);
  if (talk) { g.rect(cx - 1, cy + 3, 3, 2, '#5a1a1a'); g.set(cx, cy + 4, '#e8707a'); } else { g.rect(cx - 1, cy + 3, 3, 1, '#7a2a28'); g.set(cx - 2, cy + 2, '#7a2a28'); g.set(cx + 2, cy + 2, '#7a2a28'); }
  if (o.hair) o.hair(g, cx, cy, f);
  if (o.draw) o.draw(g, f, bob, cx, GY, ty0);
  return g;
}
function hairCap(g, cx, cy, C, brim) {                         // gorra con visera: casquete + visera al frente (brim = true: gorra al reves)
  g.rect(cx - 5, cy - 5, 11, 3, C[2]); g.rect(cx - 4, cy - 6, 9, 1, C[2]); g.rect(cx - 5, cy - 5, 11, 1, C[3]); g.rect(cx - 5, cy - 3, 11, 1, C[1]);
  if (!brim) { g.rect(cx - 6, cy - 2, 13, 1, C[0]); g.rect(cx + 4, cy - 3, 3, 1, C[0]); } else { g.rect(cx - 7, cy - 4, 2, 2, C[0]); }
  g.set(cx, cy - 6, C[3]);
}
function hairShort(g, cx, cy, H) { g.rect(cx - 5, cy - 5, 11, 3, H[2]); g.rect(cx - 4, cy - 6, 9, 1, H[2]); g.rect(cx - 5, cy - 5, 11, 1, H[3]); g.rect(cx - 5, cy - 3, 1, 3, H[1]); g.rect(cx + 5, cy - 3, 1, 3, H[1]); }
function glowStick(g, x0, y0, x1, y1, C) {                   // barra fosforescente (centro claro, borde del color)
  g.line(x0, y0, x1, y1, C[1]);
  g.line(x0 + 1, y0, x1 + 1, y1, C[3]); g.line(x0 - 1, y0, x1 - 1, y1, C[2]);
  g.set(x0, y0, '#ffffff'); g.set(x1, y1, '#ffffff');
}
var NEON = { verde: ['#1a6a2a', '#3adc50', '#8cff96', '#d8ffe0'], rosado: ['#8a1a5a', '#ff3aa0', '#ff86c4', '#ffe0f0'], amarillo: ['#8a7a08', '#f2e63c', '#fff27a', '#fffce0'], celeste: ['#126a8a', '#38c8e8', '#8aecff', '#e0fbff'] };
var NEONK = ['verde', 'rosado', 'amarillo', 'celeste'];
var VEND = {
  fosfo: {                                                    // Don Fosfo: ambulante de luces de fiesta (gorra negra, bigote, ramo de barras, collares)
    skin: skinR('#b0785a'), shirt: rampHex('#26242e', 0.25), pants: rampHex('#2c3a5a'), shoe: '#2a2024', mustache: true, hairC: ['#14100e', '#2a2420'], longSleeve: true,
    waveR: false, armR: 'hold', armRHand: [PCX_ + 11, PGY - 18],
    back: function (g, f, bob, cx, GY) { g.line(cx + 12, GY - 40, cx + 12, GY - 2, '#a06a36'); g.line(cx + 13, GY - 40, cx + 13, GY - 2, '#6b4223'); },
    hair: function (g, cx, cy) { hairCap(g, cx, cy, rampHex('#1c1a22'), false); },
    draw: function (g, f, bob, cx, GY, ty0) {
      var sw = (f === 1 ? 1 : (f === 3 ? -1 : 0)), i, base = [cx + 12, GY - 17 + bob];
      NEONK.forEach(function (k, i) { var a = -2.3 + i * 0.5 + sw * 0.04, L = 17 - (i % 2) * 3; glowStick(g, base[0], base[1], base[0] + Math.cos(a) * L, base[1] + Math.sin(a) * L, NEON[k]); });
      g.rect(base[0] - 2, base[1] - 1, 4, 3, '#e8e4d4'); g.rect(base[0] - 2, base[1] - 1, 4, 1, '#fbf8ec'); g.rect(base[0] - 2, base[1] + 1, 4, 1, '#b8b4a2');
      g.rect(base[0] - 1, base[1] + 1, 3, 2, VEND.fosfo.skin[2]);
      for (i = 0; i < 10; i++) { var an = 0.6 + i * 0.22; g.set(Math.round(cx - 6 + Math.sin(an) * 6 - 2), Math.round(ty0 + 1 + (1 - Math.cos(an)) * 4), NEON[NEONK[(i >> 1) % 4]][2]); }
      for (i = 0; i < 10; i++) { var an2 = 0.6 + i * 0.22; g.set(Math.round(cx + 6 - Math.sin(an2) * 6 + 1), Math.round(ty0 + 2 + (1 - Math.cos(an2)) * 5), NEON[NEONK[((i >> 1) + 1) % 4]][3]); }
      g.rect(cx - 7, ty0 + 5, 3, 1, NEON.rosado[2]); g.rect(cx + 4, ty0 + 7, 3, 1, NEON.celeste[2]);
      g.line(cx + 12, GY - 30, cx + 17, GY - 27 + sw, NEON.verde[1]); g.line(cx + 12, GY - 24, cx + 8, GY - 21, NEON.amarillo[1]);
    }
  },
  kioscoLarco: {                                              // Kiosco Larcomar: polo turquesa, delantal amarillo, gorra, bolsa de snack
    skin: skinR('#c48f63'), shirt: rampHex('#2a9a90'), pants: rampHex('#7a6642'), shoe: '#2a2024', hairC: ['#2a1a14', '#4a2e22'], apron: rampHex('#f5c518'), waveR: true,
    armL: 'hold', armLHand: [PCX_ - 14, PGY - 12],
    apronFn: function (g, cx, GY, bob) { g.rect(cx - 3, GY - 11 + bob, 7, 3, '#d4a812'); g.rect(cx - 3, GY - 11 + bob, 7, 1, '#fff27a'); g.set(cx, GY - 10 + bob, '#d83a2c'); },
    hair: function (g, cx, cy) { hairCap(g, cx, cy, rampHex('#d4a812'), false); g.rect(cx + 6, cy - 2, 2, 5, '#4a2e22'); g.rect(cx + 6, cy + 3, 1, 2, '#2a1a14'); },
    draw: function (g, f, bob, cx, GY, ty0) {
      var x = cx - 17, y = GY - 20 + bob;
      g.rect(x, y, 7, 8, '#d83a2c'); g.rect(x, y, 7, 1, '#f2705a'); g.rect(x, y + 7, 7, 1, '#6a1410'); g.rect(x + 2, y + 3, 3, 3, '#f5c518'); g.rect(x, y, 1, 8, '#f2705a');
      g.set(x + 1, y - 1, '#f2705a'); g.set(x + 3, y - 1, '#f2705a'); g.set(x + 5, y - 1, '#f2705a');
      g.rect(x + 2, y + 6, 3, 3, VEND.kioscoLarco.skin[2]); g.set(x + 2, y + 6, VEND.kioscoLarco.skin[3]);
    }
  },
  deportes: {                                                 // Deportes Malecon: campera azul con franjas, silbato, pelota bajo el brazo, gorra al reves
    skin: skinR('#8c5a40'), shirt: rampHex('#2a62d0'), pants: rampHex('#2a2c34'), shoe: '#e8e4d4', sole: '#2a2c34', hairC: ['#0e0c0e', '#241e1f'], longSleeve: true, waveR: true,
    shirtFn: function (g, ty0, cx, GY, bob) { var y; for (y = ty0; y <= GY - 9; y++) { g.set(cx - 7, y, '#f2f2ea'); g.set(cx + 7, y, '#f2f2ea'); } g.rect(cx - 6, ty0, 13, 1, '#f2f2ea'); g.rect(cx, ty0 + 1, 1, GY - 9 - ty0, '#14388a'); },
    hair: function (g, cx, cy) { hairShort(g, cx, cy, rampHex('#241e1f')); hairCap(g, cx, cy, rampHex('#14388a'), true); },
    draw: function (g, f, bob, cx, GY, ty0) {
      var bx = cx - 12, by = GY - 10 + bob;
      blobG(g, bx, by, 4.4, 4.4, ['#8a887e', '#c9c5b5', '#f2f0e6', '#ffffff']);
      [[bx, by - 1], [bx - 3, by + 1], [bx + 2, by + 1], [bx - 1, by + 3], [bx + 1, by - 3]].forEach(function (p) { g.rect(p[0], p[1], 2, 2, '#26242e'); });
      g.rect(cx - 12, by - 5, 3, 3, VEND.deportes.shirt[2]);
      g.line(cx - 3, ty0 + 1, cx, ty0 + 5, '#f2f2ea'); g.line(cx + 3, ty0 + 1, cx, ty0 + 5, '#f2f2ea'); g.rect(cx - 1, ty0 + 5, 3, 2, '#cfd3cc'); g.set(cx, ty0 + 5, '#ffffff');
    }
  },
  fuente: {                                                   // Fuente de soda: gorrito de papel, camisa de rayas rosadas, delantal blanco, batido y heladito
    skin: skinR('#dcae80'), shirt: rampHex('#ff9ec8'), pants: rampHex('#2c3a5a'), shoe: '#e8e4d4', hairC: ['#6a3a1c', '#8a5a2c'], apron: ['#8c8a93', '#bdb9ab', '#e6e2d4', '#fbf8ec'], waveR: false,
    armL: 'hold', armLHand: [PCX_ - 14, PGY - 14], armR: 'hold', armRHand: [PCX_ + 11, PGY - 18],
    shirtFn: function (g, ty0, cx, GY) { var y; for (y = ty0; y <= GY - 9; y += 3) g.rect(cx - 7, y, 15, 1, '#fbf8ec'); },
    apronFn: function (g, cx, GY, bob) { g.rect(cx - 3, GY - 10 + bob, 7, 3, '#bdb9ab'); g.rect(cx - 3, GY - 10 + bob, 7, 1, '#fbf8ec'); g.set(cx - 2, GY - 5 + bob, '#d83a2c'); g.set(cx + 3, GY - 8 + bob, '#d83a2c'); },
    hair: function (g, cx, cy) { var H = rampHex('#8a5a2c'); hairShort(g, cx, cy, H); g.rect(cx + 5, cy - 2, 2, 7, H[2]); g.rect(cx - 7, cy - 2, 2, 7, H[1]); g.rect(cx - 4, cy - 9, 9, 3, '#e6e2d4'); g.rect(cx - 4, cy - 9, 9, 1, '#fbf8ec'); g.rect(cx - 5, cy - 6, 11, 2, '#fbf8ec'); g.rect(cx - 5, cy - 5, 11, 1, '#bdb9ab'); g.set(cx - 2, cy - 8, '#d83a2c'); g.set(cx + 2, cy - 7, '#d83a2c'); },
    draw: function (g, f, bob, cx, GY, ty0) {
      var bx = cx - 16, by = GY - 21 + bob;
      g.rect(bx, by + 2, 6, 8, '#f6e6f0'); g.rect(bx, by + 2, 1, 8, '#ffffff'); g.rect(bx + 5, by + 2, 1, 8, '#c8b0c0'); g.rect(bx, by + 5, 6, 4, '#ff86c4'); g.rect(bx - 1, by + 1, 8, 1, '#e8e4d4'); g.rect(bx + 3, by - 4, 1, 5, '#d83a2c'); g.rect(bx + 2, by - 5, 3, 1, '#d83a2c');
      g.rect(bx + 1, by + 7, 4, 3, VEND.fuente.skin[2]); g.set(bx + 1, by + 7, VEND.fuente.skin[3]);
      var cx2 = cx + 12, cy2 = GY - 22 + bob;
      g.line(cx2, cy2 + 3, cx2 + 1, cy2 + 8, '#d9a63c'); g.line(cx2 + 2, cy2 + 3, cx2 + 1, cy2 + 8, '#b8863a'); g.rect(cx2 - 1, cy2 + 3, 5, 1, '#e8c070');
      blobG(g, cx2 + 1, cy2, 3.3, 3, ['#c8508a', '#ff86c4', '#ffb0d8', '#ffe0f0']); blobG(g, cx2 + 1, cy2 - 3, 2.4, 2.2, ['#a8742a', '#d9a63c', '#ffe27a', '#fff6c0']); g.set(cx2 + 1, cy2 - 5, '#d83a2c');
      g.rect(cx2, cy2 + 6, 3, 3, VEND.fuente.skin[2]);
    }
  }
};
function buildVend(id) {
  var o = VEND[id], idle = [];
  for (var f = 0; f < 4; f++) idle.push(fin(personG(o, f), PCX_, PGY));
  return { idle: idle };
}
safe('vendedores', function () {
  PJ.npc = {};
  Object.keys(VEND).forEach(function (id) { lazy(PJ.npc, id, function () { return buildVend(id); }); });
});

/* ======================== PAREJA ZOMBIE (dos abrazados, sprite doble) ======================== */
/* pareja = { walk:{right,left,down,up}[4], hurt:{right,left,down,up}[4] }.  Lienzo 46x38.  right/left: ancla (20,36) (entre los dos, pies); down/up: ancla (19,35).
   Es UN solo enemigo (vida 4): al bajar a la mitad el motor lo reemplaza por dos zombies normales. */
var PAW = 46, PAH = 38;
function flipCv(cv, ax, ay) {
  var c = mkCv(cv.width, cv.height), x = c.getContext('2d');
  x.translate(cv.width, 0); x.scale(-1, 1); x.drawImage(cv, 0, 0);
  c.ax = cv.width - 1 - ax; c.ay = ay; return c;
}
function heartPx(b, x, y, c) { b.set(x, y, c); b.set(x + 2, y, c); b.set(x - 1, y, 0); b.rect(x - 1, y + 1, 5, 1, c); b.rect(x, y + 2, 3, 1, c); b.set(x + 1, y + 3, c); }
function buildPareja() {
  var ouA = { top: rp('#2b3f6e'), slv: 'long', slvR: rp('#2b3f6e'), bot: R_JEAN, shoe: R_SHOE, hat: null,
    deco: function (c) { var t = c.tr; tset(c, t.x1[t.y0 + 1] - 1, t.y0 + 1, col('#d4143a')); tset(c, t.x1[t.y0 + 2] - 1, t.y0 + 2, col('#8a0c24')); hband(c, 0.9, R_BLK[1]); } };
  var ouB = { top: rp('#e0709a'), slv: 'short', bot: rp('#e0709a'), legs: 'short', shoe: rp('#a8142c'), hat: null,
    deco: function (c) { var t = c.tr; hband(c, 0.55, rp('#e0709a')[1]); tset(c, t.x1[t.y0 + 1] - 2, t.y0 + 1, R_WH[3]); tset(c, t.x1[t.y0 + 1] - 3, t.y0 + 1, R_WH[2]); } };
  var bdA = bodyOf('normal'), bdB = bodyOf('normalFlaco');
  var PA = { bd: bdA, ou: ouA, skin: TONES.verde, hair: 'corto', hc: HAIRS.negro, seed: 301, wear: 1, blood: 1, faceBlood: 0, spec: {}, blind: false },
      PB = { bd: bdB, ou: ouB, skin: TONES.gris, hair: 'largo', hc: HAIRS.casta, seed: 312, wear: 1, blood: 0, faceBlood: 1, spec: {}, blind: false };
  var AX = 18, BX = 27, OY = 35;
  var right = [], hurtR = [], down = [], up = [], hDown = [], hUp = [];
  for (var fr = 0; fr < 4; fr++) {
    var b = new Buf(PAW, PAH), pa = poseTrab(bdA, fr, 4, PA), pb = poseTrab(bdB, fr, 4, PB);
    /* ella (al fondo, a la derecha) apoyada en el; el la abraza por encima de los hombros */
    PB.ox = BX; PB.oy = OY; pb.hd[0] += -0.6; pb.hd[1] += 0.4; pb.mouth = 'slack';
    pb.aN = { h: [pb.S[0] - 5.5, pb.S[1] + 6.2], b: -1 }; pb.late = null;
    drawFigure(b, PB, pb);
    PA.ox = AX; PA.oy = OY; pa.hd[0] += 0.9; pa.mouth = fr % 2 ? 'closed' : 'slack';
    pa.aN = { h: [pa.S[0] + 9.6, pa.S[1] + 1.2], b: 1 }; pa.armLate = true;
    pa.late = function (c) { heartPx(c.b, c.ox + 6, c.oy - 28 - (fr % 2), col('#ff5aa8')); };
    drawFigure(b, PA, pa);
    b.outlineRim();
    right.push(b.toCanvas(20, OY)); hurtR.push(b.solid().toCanvas(20, OY));
  }
  var left = right.map(function (c) { return flipCv(c, 20, OY); }), hurtL = hurtR.map(function (c) { return flipCv(c, 20, OY); });
  /* de frente / de espaldas: dos zombies de frente codo con codo, abrazados por los hombros */
  var Z = px.chars && px.chars.zFront;
  if (Z) {
    for (var f2 = 0; f2 < 4; f2++) {
      [false, true].forEach(function (back) {
        var g = new G(38, 34);
        var oa = { raw: true, shirt: '#2b3f6e', pants: '#3a4a6a', hair: '#1a1614', arms: 'hold', noTilt: true, dx: 0, shoe: '#1e1c1c' };
        var ob = { raw: true, shirt: '#e0709a', pants: '#e0709a', hair: '#6a3a28', arms: 'hold', noTilt: true, dx: 0, bun: true, shoe: '#a8142c', small: false };
        var ga = Z(oa, f2), gb = Z(ob, (f2 + 1) % 4);
        g.blit(gb, 15, 1); g.blit(ga, 3, 0);
        var zs = (px.chars.P && px.chars.P.zs) || '#93a083', zsD = (px.chars.P && px.chars.P.zsD) || '#5f6b55';
        g.rect(14, 15, 9, 2, zs); g.rect(14, 17, 9, 1, zsD);                    // los brazos se cruzan por la espalda
        g.rect(11, 14, 3, 3, '#2b3f6e'); g.rect(21, 15, 3, 3, '#e0709a');
        if (back) {                                                              // de espaldas: pelo tapando las caras
          g.rect(8, 6, 8, 6, '#1a1614'); g.rect(9, 12, 6, 1, '#1a1614'); g.rect(20, 7, 8, 6, '#6a3a28'); g.rect(21, 13, 6, 1, '#6a3a28');
        }
        outlineRim_(g);
        (back ? up : down).push(mkcv_(g, 19, 33));
        var h = g.solid('#ffffff'); (back ? hUp : hDown).push(mkcv_(h, 19, 33));
      });
    }
  }
  return { walk: { right: right, left: left, down: down, up: up }, hurt: { right: hurtR, left: hurtL, down: hDown, up: hUp } };
}
function outlineRim_(g) { if (px.chars && px.chars.outlineRim) px.chars.outlineRim(g); else g.outline(); }
function mkcv_(g, ax, ay) { return flatC(g, ax, ay); }
lazy(PJ, 'pareja', buildPareja);

/* ======================== ICONOS DE MOCHILA (12x12 @6,11 + .big 24x24 @12,23) Y OBJETOS DEL MUNDO ======================== */
/* Se dibujan en una rejilla de 10x10 celdas con un margen de una celda (mismo sistema que js/miraflores/arte-personajes.js y objetos.js);
   a escala 2 la forma se recalcula y se agregan detalles bajo `if (s === 2)`. */
var WHR = ['#8a887e', '#c9c5b5', '#f2f0e6', '#ffffff'], DK = '#26242e';
safe('iconos', function () {
  var OUT = '#16141a';
  function D(g, s) {
    var o = s, d = {
      g: g, s: s,
      R: function (x, y, w, h, c) { g.rect(Math.round(o + x * s), Math.round(o + y * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)), c); },
      px: function (x, y, c) { g.set(o + Math.round(x * s), o + Math.round(y * s), c); },
      L: function (x0, y0, x1, y1, c, t) { t = Math.max(1, Math.round((t || 1) * s)); for (var k = 0; k < t; k++) g.line(o + x0 * s, o + y0 * s + k - (t >> 1), o + x1 * s, o + y1 * s + k - (t >> 1), c); },
      E: function (cx, cy, rx, ry, c) { g.ell(o + cx * s, o + cy * s, rx * s, ry * s, c); },
      blob: function (cx, cy, rx, ry, ramp) {
        var X = o + cx * s, Y = o + cy * s, RX = rx * s, RY = ry * s, n = ramp.length - 1;
        for (var y = Math.floor(Y - RY - 1); y <= Math.ceil(Y + RY + 1); y++) for (var x = Math.floor(X - RX - 1); x <= Math.ceil(X + RX + 1); x++) {
          var dx = (x - X) / RX, dy = (y - Y) / RY; if (dx * dx + dy * dy > 1) continue;
          var lit = -(dx * 0.6 + dy * 0.85), i = lit > 0.62 ? n : (lit > 0.12 ? n - 1 : (lit > -0.45 ? n - 2 : (n >= 4 ? 1 : 0)));
          g.set(x, y, ramp[Math.max(0, i)]);
        }
      },
      rrect: function (cx, cy, len, wid, ang, fn) {
        var X = o + cx * s, Y = o + cy * s, ca = Math.cos(ang), sa = Math.sin(ang), L = len * s / 2, Wd = wid * s / 2;
        for (var y = Math.floor(Y - L - Wd - 1); y <= Math.ceil(Y + L + Wd + 1); y++) for (var x = Math.floor(X - L - Wd - 1); x <= Math.ceil(X + L + Wd + 1); x++) {
          var u = (x - X) * ca + (y - Y) * sa, v = -(x - X) * sa + (y - Y) * ca;
          if (Math.abs(u) <= L && Math.abs(v) <= Wd) { var c = fn(u / s, v / s); if (c) g.set(x, y, c); }
        }
      }
    };
    return d;
  }
  function mkIcon(fn) {
    var cs = [1, 2].map(function (s) { var g = new G(12 * s, 12 * s); fn(D(g, s), s); g.outline(OUT); return flatC(g, 6 * s, 11 * s); });
    cs[0].big = cs[1];
    return cs[0];
  }
  var ITEMS = {
    pelota: function (d, s) {                                     // vista 3/4: parche central grande y cinco a medio ver en el borde
      var seam = '#a8a69a';
      d.blob(5, 5.2, 4.5, 4.5, WHR);
      d.L(4.0, 4.6, 7.4, 2.4, seam, 0.5); d.L(4.0, 4.6, 8.4, 6.4, seam, 0.5); d.L(4.0, 4.6, 5.0, 8.6, seam, 0.5); d.L(4.0, 4.6, 1.2, 6.8, seam, 0.5); d.L(4.0, 4.6, 1.8, 1.8, seam, 0.5);
      d.E(4.0, 4.6, 1.5, 1.4, DK); d.E(7.8, 2.2, 1.0, 0.9, DK); d.E(8.8, 6.4, 0.9, 1.1, DK); d.E(5.2, 9.0, 1.2, 0.7, DK); d.E(0.9, 6.8, 0.7, 1.1, DK); d.E(1.7, 1.8, 0.8, 0.8, DK);
      d.px(3.2, 3.8, '#6a6872');
      if (s === 2) { d.px(5.6, 1.4, '#ffffff'); d.px(6.2, 1.0, '#ffffff'); d.px(6.4, 7.2, '#9a988e'); d.px(7.4, 6.0, '#9a988e'); d.px(3.0, 8.0, '#9a988e'); }
    },
    pelotaCuero: function (d, s) {
      var B = ['#3a1c0c', '#6a3818', '#a8682c', '#d8a05a'], T = '#2a1408', St = '#f2e0b0';
      d.blob(5, 5.2, 4.5, 4.5, B);
      d.L(4.0, 4.6, 7.4, 2.4, St, 0.4); d.L(4.0, 4.6, 8.4, 6.4, St, 0.4); d.L(4.0, 4.6, 5.0, 8.6, St, 0.4); d.L(4.0, 4.6, 1.2, 6.8, St, 0.4); d.L(4.0, 4.6, 1.8, 1.8, St, 0.4);
      d.E(4.0, 4.6, 1.5, 1.4, T); d.E(7.8, 2.2, 1.0, 0.9, T); d.E(8.8, 6.4, 0.9, 1.1, T); d.E(5.2, 9.0, 1.2, 0.7, T); d.E(0.9, 6.8, 0.7, 1.1, T);
      d.px(3.4, 4.0, B[2]);
      if (s === 2) { d.px(5.6, 1.4, B[3]); d.px(6.2, 1.0, B[3]); d.px(6.0, 3.6, St); d.px(6.6, 5.0, St); d.px(4.6, 6.8, St); }
    },
    packFosfo: function (d, s) {
      NEONK.forEach(function (k, i) { if (i === 3) return; });
      var cols = ['verde', 'rosado', 'celeste'];
      cols.forEach(function (k, i) { var N = NEON[k], x0 = 2.4 + i * 1.5, x1 = 1.6 + i * 3.0; d.L(x0, 8.8, x1 + 0.6, 1.6 + (i === 1 ? -0.6 : 0.4), N[1], 1.5); d.L(x0 + 0.5, 8.8, x1 + 1.1, 1.6 + (i === 1 ? -0.6 : 0.4), N[3], 0.6); d.px(x1 + 0.8, 1.2 + (i === 1 ? -0.6 : 0.4), '#ffffff'); });
      d.R(2.4, 6.2, 5.4, 1.4, '#e8e4d4'); d.R(2.4, 6.2, 5.4, 0.5, '#ffffff'); d.R(2.4, 7.1, 5.4, 0.5, '#b8b4a2');
      if (s === 2) { d.px(1.0, 4.0, NEON.verde[2]); d.px(9.0, 3.4, NEON.celeste[2]); d.px(5.4, 0.6, NEON.rosado[2]); }
    },
    helado: function (d, s) {
      d.L(2.8, 4.8, 5.0, 9.8, '#d9a63c', 2.0); d.L(7.2, 4.8, 5.0, 9.8, '#b8863a', 1.2);
      d.R(2.6, 4.4, 4.8, 0.8, '#e8c070');
      d.L(3.6, 5.8, 5.6, 8.2, '#a8782a', 0.4); d.L(6.2, 5.8, 4.4, 8.2, '#a8782a', 0.4);
      d.blob(5, 3.7, 2.9, 2.1, ['#a8742a', '#d9a63c', '#ffe27a', '#fff6c0']);
      d.blob(5, 1.8, 2.3, 1.7, ['#c8508a', '#ff86c4', '#ffb0d8', '#ffe0f0']);
      d.E(5.2, 0.2, 0.7, 0.7, '#d83a2c'); d.px(5.0, -0.4, '#6a3a1c');
      if (s === 2) { d.px(3.6, 1.2, '#ffffff'); d.px(3.0, 3.0, '#fff6c0'); d.px(6.6, 4.0, '#a8742a'); d.px(4.0, 6.6, '#fff6c0'); }
    },
    paleta: function (d, s) {                                     // paleta de agua: barra de dos colores con palito
      d.R(4.4, 6.4, 1.2, 3.4, '#c99458'); d.R(4.4, 6.4, 0.5, 3.4, '#e0b878');
      d.blob(5, 3.6, 2.7, 3.2, ['#c8501c', '#ff8a2a', '#ffb050', '#ffe0a0']);
      d.R(2.4, 4.0, 5.2, 3.0, '#7ad24a'); d.R(2.4, 4.0, 5.2, 0.5, '#b8f088'); d.R(2.4, 6.4, 5.2, 0.6, '#4a9a2a'); d.R(2.4, 4.0, 0.6, 3.0, '#b8f088'); d.R(7.0, 4.0, 0.6, 3.0, '#4a9a2a');
      d.px(3.4, 1.8, '#ffffff'); d.px(3.0, 2.4, '#ffe8c0');
      if (s === 2) { d.px(4.0, 1.2, '#ffffff'); d.px(6.4, 2.4, '#ff8a2a'); d.px(3.4, 5.0, '#d6ffb0'); d.px(5.0, 8.0, '#a87838'); }
    },
    chaufa: function (d, s) {                                     // arroz chaufa: plato con monton de arroz, cebolla china, huevo y zanahoria
      d.blob(5, 7.2, 4.8, 2.0, ['#8a887e', '#b8b4a2', '#e8e4d4', '#fbf8ec']); d.E(5, 6.9, 3.6, 1.3, '#cfcabd');
      d.blob(5, 5.0, 3.6, 2.9, ['#a8782a', '#d9a63c', '#f6dc8c', '#fff2c0']);
      d.px(3.2, 4.4, '#5aa040'); d.px(5.8, 3.6, '#5aa040'); d.px(4.4, 5.6, '#f2c81c'); d.px(6.8, 5.0, '#e8742a'); d.px(3.0, 5.8, '#e8742a'); d.px(5.0, 4.4, '#8a4b38'); d.px(6.0, 6.0, '#5aa040'); d.px(2.6, 4.8, '#f2c81c');
      d.L(6.4, 0.6, 9.2, 4.0, '#c99458', 0.5); d.L(7.2, 0.4, 9.8, 3.4, '#e0b878', 0.5);
      if (s === 2) { d.px(4.0, 3.4, '#fff2c0'); d.px(5.6, 2.8, '#ffffff90'); d.px(4.6, 1.8, '#ffffff90'); d.px(7.2, 5.6, '#8a4b38'); }
    },
    wantan: function (d, s) {                                     // wantan frito: triangulitos dorados y crocantes con salsa
      d.blob(5, 8.2, 4.8, 1.6, ['#8a887e', '#b8b4a2', '#e8e4d4', '#fbf8ec']);
      var G_ = ['#8a4a10', '#c07a1c', '#e8a838', '#ffd87a'];
      d.blob(3.2, 6.0, 2.4, 2.2, G_); d.blob(6.8, 6.0, 2.4, 2.2, G_); d.blob(5.0, 3.6, 2.5, 2.3, G_);
      d.px(3.0, 5.2, G_[3]); d.px(6.6, 5.2, G_[3]); d.px(4.6, 2.8, G_[3]); d.px(5.4, 3.8, G_[0]); d.px(3.8, 6.4, G_[0]); d.px(7.4, 6.4, G_[0]);
      d.E(8.6, 7.8, 0.9, 0.6, '#a02a1c');
      if (s === 2) { d.px(2.4, 6.8, G_[1]); d.px(7.8, 6.6, G_[1]); d.px(4.2, 4.4, G_[3]); d.px(5.6, 2.2, G_[3]); }
    },
    chicha: function (d, s) {                                     // chicha morada: vaso alto morado con rodaja de limon y sorbete
      for (var i = 0; i < 8; i++) d.R(2.5 + i * 0.1, 1.8 + i * 0.95, 5.0 - i * 0.2, 1.1, i < 1 ? '#f0f4f8' : (i < 2 ? '#c9d4dc' : '#7a1a8a'));
      d.R(2.5, 1.8, 5.0, 0.6, '#f0f4f8'); d.R(2.9, 2.6, 4.2, 6.2, '#7a1a8a'); d.R(2.9, 2.6, 0.9, 6.2, '#b85ab8'); d.R(6.4, 2.6, 0.7, 6.2, '#4a0a5a'); d.R(2.9, 8.2, 4.2, 0.7, '#2a0a3a');
      d.E(7.4, 1.9, 1.2, 1.2, '#f2e63c'); d.E(7.4, 1.9, 0.6, 0.6, '#fffbd0');
      d.L(5.4, 4.6, 6.8, -0.2, '#ff5aa8', 0.7);
      d.px(4.2, 4.0, '#d890d8'); d.px(5.2, 5.6, '#e8b0e8');
      if (s === 2) { d.px(3.4, 3.0, '#ffffff'); d.px(3.4, 3.6, '#ffffff'); d.px(5.4, 4.6, '#e8b0e8'); d.px(5.0, 7.0, '#4a0a5a'); }
    },
    canilleras: function (d, s) {                                   // canilleras: dos placas blancas con tiras elasticas negras
      [[1.4, 0], [5.0, 0.6]].forEach(function (p, i) {
        var x = p[0], y = 1.4 + p[1];
        d.R(x, y, 3.4, 7.6, i ? '#dfe6f2' : '#f2f2ea'); d.R(x, y, 0.8, 7.6, '#ffffff'); d.R(x + 2.6, y, 0.8, 7.6, '#8a98b8'); d.R(x, y + 7.0, 3.4, 0.6, '#6a789a');
        d.R(x - 0.4, y + 2.0, 4.2, 0.8, '#1c1a22'); d.R(x - 0.4, y + 5.2, 4.2, 0.8, '#1c1a22');
        d.px(x + 1.4, y + 3.6, '#2a62d0'); d.px(x + 1.4, y + 4.2, '#2a62d0');
      });
      if (s === 2) { d.px(2.0, 2.0, '#ffffff'); d.px(5.6, 2.6, '#ffffff'); }
    }
  };
  NEONK.forEach(function (k) {
    ITEMS['barraFosfo_' + k] = function (d, s) {
      var N = NEON[k];
      d.L(1.8, 8.6, 8.0, 1.8, N[0], 2.6); d.L(1.8, 8.4, 8.0, 1.6, N[1], 1.9); d.L(1.9, 8.1, 7.9, 1.5, N[2], 1.0); d.L(2.0, 7.9, 7.8, 1.4, N[3], 0.5);
      d.R(0.9, 8.6, 1.3, 1.3, '#e8e4d4'); d.R(7.7, 0.8, 1.3, 1.3, '#e8e4d4');
      d.px(8.8, 0.6, '#ffffff'); d.px(0.6, 9.6, '#ffffff');
      if (s === 2) { d.px(9.4, 2.4, N[2]); d.px(1.0, 6.8, N[2]); d.px(9.8, 0.8, N[2]); d.px(0.0, 8.0, N[2]); d.px(4.6, 5.4, '#ffffff'); }
    };
  });
  ITEMS.barraFosfo = ITEMS.barraFosfo_verde;
  PJ.items = {};
  S.items = S.items || {};
  Object.keys(ITEMS).forEach(function (id) {
    lazy(PJ.items, id, function () { var c = mkIcon(ITEMS[id]); if (!S.items[id]) S.items[id] = c; return c; });
    lazy(PJ, id, function () { return PJ.items[id]; });
  });
});

/* ---- objetos del mundo ---- */
safe('mundo', function () {
  /* pelota que rueda: 4 cuadros de 12x12, ancla (6,10) (el punto de apoyo); los parches giran */
  var balls = [0, 1, 2, 3].map(function (k) {
    var g = new G(12, 12), cx = 5.5, cy = 5.5, a0 = -0.5 + k * 0.314, i, R = 5.2, seam = '#9a988e';
    blobG(g, cx, cy, R, R, WHR);
    for (i = 0; i < 5; i++) {                                       // costuras del centro a cada parche del borde
      var a = a0 + i * 1.2566;
      g.line(cx + Math.cos(a) * 1.9, cy + Math.sin(a) * 1.9, cx + Math.cos(a) * 3.3, cy + Math.sin(a) * 3.3, seam);
      var X = cx + Math.cos(a) * 4.6, Y = cy + Math.sin(a) * 4.6;
      for (var yy = -1; yy <= 1; yy++) for (var xx = -1; xx <= 1; xx++) { var px2 = Math.round(X) + xx, py2 = Math.round(Y) + yy; if ((px2 - cx) * (px2 - cx) + (py2 - cy) * (py2 - cy) <= (R - 0.4) * (R - 0.4) && Math.abs(xx) + Math.abs(yy) < 2 && (xx === 0 || yy === 0 || (k + i) % 2)) g.set(px2, py2, DK); }
    }
    g.rect(Math.round(cx) - 1, Math.round(cy) - 1, 3, 3, DK); g.set(Math.round(cx) - 1, Math.round(cy) - 1, null); g.set(Math.round(cx) + 1, Math.round(cy) + 1, null); g.set(Math.round(cx), Math.round(cy) + 2, DK); g.set(Math.round(cx), Math.round(cy) - 2, DK);
    g.set(3, 2, '#ffffff'); g.set(4, 2, '#ffffff'); g.set(2, 3, '#ffffff');
    g.outline();
    return flatC(g, 6, 10);
  });
  PJ.pelotaSuelta = balls;
  /* barra tirada en el piso, brillando: 26x14 con halo horneado; .alt = cuadro mas brillante (parpadeo) */
  PJ.barraSuelta = {};
  NEONK.forEach(function (k) {
    lazy(PJ.barraSuelta, k, function () {
      var N = NEON[k], mk = function (strong) {
        var g = new G(28, 16), cx = 14, cy = 8, x, y;
        for (y = 0; y < 16; y++) for (x = 0; x < 28; x++) {
          var dx = (x - cx) / 13, dy = (y - cy) / 7, r = dx * dx + dy * dy;
          if (r < 1) { var al = Math.round((1 - r) * (strong ? 120 : 84)); g.set(x, y, N[1] + ('0' + al.toString(16)).slice(-2)); }
        }
        var L = function (x0, y0, x1, y1, c) { g.line(x0, y0, x1, y1, c); };
        L(6, 10, 21, 6, N[0]); L(6, 9, 21, 5, N[1]); L(6, 8, 21, 4, N[2]); L(7, 8, 20, 4, N[3]); L(6, 11, 21, 7, N[0]);
        g.rect(4, 10, 2, 2, '#e8e4d4'); g.rect(21, 5, 2, 2, '#e8e4d4'); g.set(22, 5, '#ffffff'); g.set(4, 10, '#ffffff');
        if (strong) { g.set(13, 6, '#ffffff'); g.set(14, 6, '#ffffff'); g.set(10, 7, '#ffffff'); }
        return g;
      };
      var a = mk(false), b = mk(true);
      var ca = flatC(a, 14, 9), cb = flatC(b, 14, 9); ca.alt = cb; return ca;
    });
  });
  /* halo grande de color (para la noche): una vez por color, con degradado horneado */
  PJ.barraHalo = {};
  NEONK.forEach(function (k) {
    lazy(PJ.barraHalo, k, function () {
      var c = mkCv(96, 96), x = c.getContext('2d'), gr = x.createRadialGradient(48, 48, 2, 48, 48, 46), N = NEON[k];
      gr.addColorStop(0, N[2] + 'b0'); gr.addColorStop(0.35, N[1] + '70'); gr.addColorStop(0.7, N[1] + '28'); gr.addColorStop(1, N[1] + '00');
      x.fillStyle = gr; x.fillRect(0, 0, 96, 96); c.ax = 48; c.ay = 48; return c;
    });
  });
  /* helado en vuelo (4 giros) */
  lazy(PJ, 'heladoVuelo', function () {
    var g = new G(14, 18);
    g.line(3, 9, 6, 16, '#d9a63c'); g.line(4, 9, 6, 16, '#d9a63c'); g.line(9, 9, 6, 16, '#b8863a'); g.line(8, 9, 6, 16, '#b8863a'); g.line(5, 9, 6, 15, '#e8c070'); g.rect(4, 9, 6, 1, '#e8c070');
    g.line(5, 11, 7, 13, '#a8782a'); g.line(8, 11, 6, 13, '#a8782a');
    blobG(g, 6.5, 7, 3.6, 2.6, ['#a8742a', '#d9a63c', '#ffe27a', '#fff6c0']); blobG(g, 6.5, 4, 3, 2.3, ['#c8508a', '#ff86c4', '#ffb0d8', '#ffe0f0']); g.set(7, 1, '#d83a2c'); g.set(7, 0, '#d83a2c');
    g.set(5, 3, '#ffffff'); g.set(4, 6, '#fff6c0');
    g.outline();
    var base = flatC(g, 7, 9), fr = [base];
    [1, 2, 3].forEach(function (q) {
      var c = mkCv(18, 18), x = c.getContext('2d'); x.translate(9, 9); x.rotate(q * Math.PI / 2); x.drawImage(base, -7, -9); c.ax = 9; c.ay = 9; fr.push(c);
    });
    var c0 = mkCv(18, 18), x0 = c0.getContext('2d'); x0.drawImage(base, 2, 0); c0.ax = 9; c0.ay = 9; fr[0] = c0;
    var out = fr[0]; out.frames = fr; return out;
  });
  /* charquito de helado derretido: 2 cuadros, 24x12, ancla (12,6) */
  lazy(PJ, 'charcoHelado', function () {
    return [0, 1].map(function (k) {
      var g = new G(24, 12), P_ = ['#c8508a', '#ff86c4', '#ffb0d8', '#ffe0f0'], C_ = ['#b8a070', '#e8d8a0', '#fff2c8', '#fffbe8'];
      blobG(g, 12, 6.4, 10.4, 4.2, P_);
      blobG(g, 8 + k, 6, 4.8, 2.6, C_); blobG(g, 15 - k, 7, 3.2, 1.8, C_);
      g.set(9, 4, '#ffffff'); g.set(10, 4, '#ffffff'); g.set(16 - k, 5, '#ffffff');
      g.set(2, 8, P_[1]); g.set(21, 4, P_[1]); g.set(4, 10, P_[1]); g.set(19, 10, P_[1]);
      if (k) { g.set(20, 6, P_[3]); g.set(3, 6, P_[3]); } else { g.set(12, 8, P_[3]); }
      /* borde un poco mas oscuro en lugar de contorno negro: es una mancha en el piso */
      var add = [], x, y;
      for (y = 0; y < 12; y++) for (x = 0; x < 24; x++) if (!g.get(x, y) && (g.get(x - 1, y) || g.get(x + 1, y) || g.get(x, y - 1) || g.get(x, y + 1))) add.push([x, y]);
      add.forEach(function (a) { g.set(a[0], a[1], '#8a2a5a'); });
      return flatC(g, 12, 6);
    });
  });
});
safe('alexHeld', function () {
  var A = S.alex;
  if (!A || !A.nobird || !A.bird) return;
  var CP = (px.chars && px.chars.P) || { skin: '#a8714c', skinD: '#80523a', skinL: '#c48f63', blue: '#1f2f66', white: '#e6e6e0' };
  var C_SKIN = col(CP.skin), C_BLUE = col(CP.blue), C_WHITE = col(CP.white);
  var TOYS = ['barraFosfo_verde', 'barraFosfo_rosado', 'barraFosfo_amarillo', 'barraFosfo_celeste', 'helado'];
  function kindOf(id) { return id === 'helado' ? 'ice' : 'stick'; }
  function colorOf(id) { return NEON[id.split('_')[1]] || NEON.verde; }
  var RED_ = ['#7a1a14', '#b82a22', '#e8382c', '#ff7a62'], YEL_ = ['#a87a08', '#d8a410', '#f2c81c', '#ffe870'], TEAL_ = ['#14484c', '#217a7e', '#38b0ac', '#82dcd2'];

  function stripOutline(b) { for (var i = 0; i < b.d.length; i++) { var c = b.d[i]; if (c === K || c === RIM_HI || c === RIM_LO) b.d[i] = 0; } }
  function stripeCol(xs) { return ((xs >> 1) % 2) ? C_WHITE : C_BLUE; }
  function eraseSideArm(b, ox, u) {                            // brazo de perfil (sobre la camiseta): se quita y se repinta la raya debajo
    var x, y, c;
    for (y = 14 + u; y <= 18 + u; y++) for (x = 9; x <= 12; x++) {
      c = b.get(x + ox, y);
      if ((c === C_BLUE && x >= 10 && x <= 11 && y <= 15 + u) || (c === C_SKIN && y >= 16 + u)) b.set(x + ox, y, stripeCol(x));
    }
  }
  function eraseFrontArm(b, ox, oy, u, side) {                // brazo de frente/espaldas (fuera del torso): se borra por color
    var x0 = side === 'L' ? 3 : 15, x, y, c;
    for (y = 13 + u; y <= 19 + u; y++) for (x = x0; x <= x0 + 1; x++) { c = b.get(x + ox, y + oy); if (c === C_BLUE || c === C_SKIN) b.set(x + ox, y + oy, 0); }
  }
  function blitG(b, g) { for (var y = 0; y < g.h; y++) for (var x = 0; x < g.w; x++) { var c = g.d[y * g.w + x]; if (c) b.set(x, y, col(c)); } }
  function mirrorBuf(b) { var n = new Buf(b.w, b.h); for (var y = 0; y < b.h; y++) for (var x = 0; x < b.w; x++) n.d[y * b.w + (b.w - 1 - x)] = b.d[y * b.w + x]; return n; }
  function bufFrom(cv, W, H, ox, oy) { var b = new Buf(W, H), s = fromCanvas(cv); b.blit(s, ox, oy); return b; }

  function orient(g, cx, cy, ux, uy, len, wid, fn) {          // rectangulo orientado: a = a lo largo (u), b = a lo ancho
    var R = Math.ceil(Math.max(len, wid) / 2 + 1);
    for (var y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) for (var x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      var a = (x - cx) * ux + (y - cy) * uy, b = -(x - cx) * uy + (y - cy) * ux;
      if (Math.abs(a) <= len / 2 && Math.abs(b) <= wid / 2) { var c = fn(a, b, x, y); if (c) g.set(x, y, c); }
    }
  }
  function bubbleG(g, cx, cy, r) {
    for (var y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) for (var x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)); if (d > r) continue;
      g.set(x, y, d > r - 1 ? '#8fd0f0' : '#d6f4ff');
    }
    g.set(Math.round(cx - r * 0.4), Math.round(cy - r * 0.4), '#ffffff');
  }
  function fistG(g, x, y) {                                    // puño 3x3 con luz arriba-izquierda
    x = Math.round(x); y = Math.round(y);
    g.rect(x - 1, y - 1, 3, 3, CP.skin); g.set(x - 1, y - 1, CP.skinL); g.set(x, y - 1, CP.skinL); g.set(x + 1, y + 1, CP.skinD); g.set(x, y + 1, CP.skinD);
  }
  function armG(g, sx, sy, hx, hy, sleeveX, sleeveY) {         // manga azul + antebrazo de piel con sombra abajo
    g.rect(sleeveX, sleeveY, 2, 2, CP.blue);
    g.line(sx, sy, hx, hy, CP.skin); g.line(sx, sy + 1, hx, hy + 1, CP.skinD);
  }
  function toyG(g, kind, hx, hy, tx, ty, shot, NC) {
    var dx = tx - hx, dy = ty - hy, L = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, t, i;
    function offs(g_, x0, y0, x1, y1, c1, c2) { g_.line(x0, y0, x1, y1, c1); if (Math.abs(x1 - x0) > Math.abs(y1 - y0)) g_.line(x0, y0 + 1, x1, y1 + 1, c2); else g_.line(x0 + 1, y0, x1 + 1, y1, c2); }
    if (kind === 'stick') {                                    // barra fosforescente: tubo del color con nucleo claro y tapas blancas
      var N2 = NC || NEON.verde, px_ = Math.round(nx), py_ = Math.round(ny), lx = Math.abs(ux) >= Math.abs(uy);
      for (i = -1; i <= 1; i++) { var cc = i < 0 ? N2[2] : (i > 0 ? N2[0] : N2[1]); g.line(hx + (lx ? 0 : i), hy + (lx ? i : 0), tx + (lx ? 0 : i), ty + (lx ? i : 0), cc); }
      g.line(hx + ux * 2, hy + uy * 2, tx - ux * 1.5, ty - uy * 1.5, N2[3]);
      g.rect(Math.round(hx - ux * 1.2) - 1, Math.round(hy - uy * 1.2) - 1, 2, 2, '#e8e4d4'); g.set(Math.round(tx), Math.round(ty), '#ffffff'); g.set(Math.round(tx + ux), Math.round(ty + uy), N2[2]);
      if (shot !== 'noglow') { g.set(Math.round(tx + nx * 2), Math.round(ty + ny * 2), N2[2]); g.set(Math.round(tx - nx * 2), Math.round(ty - ny * 2), N2[2]); g.set(Math.round(tx + ux * 2), Math.round(ty + uy * 2), N2[3]); }
    } else {                                                   // helado en barquillo: cono que se ensancha desde la mano, bola rosada y cereza arriba
      if (shot === 'gone') return;
      var cl = Math.max(4, L - 3), t, k;
      for (t = 0; t <= cl; t += 0.5) { var w = 0.7 + (t / cl) * 2.1, X = hx + ux * t, Y = hy + uy * t; for (k = -Math.round(w); k <= Math.round(w); k++) g.set(Math.round(X + nx * k), Math.round(Y + ny * k), k < 0 ? '#e8c070' : (k > 0 ? '#b8863a' : '#d9a63c')); }
      g.set(Math.round(hx + ux * 3 + nx), Math.round(hy + uy * 3 + ny), '#a8782a'); g.set(Math.round(hx + ux * 5 - nx), Math.round(hy + uy * 5 - ny), '#a8782a');
      var bx = tx - ux * 0.6, by = ty - uy * 0.6;
      g.disc(bx, by, 3.0, '#ff86c4'); g.disc(bx - 0.8, by - 0.8, 1.7, '#ffb0d8'); g.set(Math.round(bx - 1), Math.round(by - 1), '#ffe0f0'); g.rect(Math.round(bx - 2), Math.round(by + 2), 5, 1, '#c8508a');
      g.disc(bx + ux * 2.4, by + uy * 2.4, 1.0, '#d83a2c'); g.set(Math.round(bx + ux * 3.4), Math.round(by + uy * 3.4), '#6a3a1c');
    }
  }

  // ---- especificaciones (coordenadas del lienzo de salida) ----
  var WALK_SIDE = { stick: { H: [15, 17], T: [18.5, 7] }, ice: { H: [15, 17], T: [17, 8] } };
  var WALK_FR = { stick: { H: [16, 17], T: [18.5, 6.5] }, ice: { H: [16, 17], T: [17.5, 7.5] } };
  function mirX(p, W) { return [W - 1 - p[0], p[1]]; }
  var SW_SIDE = {
    stick: [{ H: [16, 10], T: [8, 0] }, { H: [23, 14], T: [31, 6] }, { H: [21, 21], T: [28, 27] }],
    ice:   [{ H: [15, 10], T: [12, 2] }, { H: [23, 13], T: [29, 9] }, { H: [22, 19], T: [26, 21], shot: 'gone' }]
  };
  var SW_DOWN = {
    stick: [{ H: [25, 19], T: [29, 3] }, { H: [21, 30], T: [8, 38] }, { H: [12, 34], T: [4, 43] }],
    ice:   [{ H: [25, 19], T: [27, 10] }, { H: [22, 28], T: [25, 21] }, { H: [20, 32], T: [20, 40], shot: 'gone' }]
  };
  var SW_UP = {
    stick: [{ H: [6, 19], T: [2, 3] }, { H: [10, 17], T: [13, 1], behind: 1 }, { H: [8, 25], T: [3, 12] }],
    ice:   [{ H: [7, 19], T: [5, 10] }, { H: [10, 17], T: [12, 9], behind: 1 }, { H: [8, 22], T: [8, 9], shot: 'gone' }]
  };
  var BOB = [0, 1, 0, 1];                                      // bob de los 4 cuadros de walk

  function finish(b, ax, ay, mirror) { b.outlineRim(); if (mirror) { var m = mirrorBuf(b); return m.toCanvas(b.w - 1 - ax, ay); } return b.toCanvas(ax, ay); }

  function opaque(cv) { var b = fromCanvas(cv), n = 0; for (var i = 0; i < b.d.length; i++) if (b.d[i]) n++; return n; }
  function build(toy, which) {
    var set = A[which].g3 || A[which], W = set.walk, kind = kindOf(toy), NC = colorOf(toy), sp = WALK_SIDE[kind], fr = WALK_FR[kind];
    if (opaque(W.right[0]) < 60) throw new Error('los cuadros de Alexander estan vacios (el navegador solto los lienzos): no se compone el inflable');
    var walk = { right: [], left: [], down: [], up: [] }, swing = { right: [], left: [], down: [], up: [] };
    var i, g, b;
    for (i = 0; i < 4; i++) {
      var u = BOB[i];
      // perfil derecho / izquierdo
      [false, true].forEach(function (mir) {
        var b2 = bufFrom(W.right[i], 20, 28, 0, 0); stripOutline(b2); eraseSideArm(b2, 0, u);
        var g2 = new G(20, 28);
        armG(g2, 11, 15 + u, sp.H[0] - 1, sp.H[1] - 1 + u, 10, 14 + u);
        toyG(g2, kind, sp.H[0], sp.H[1] + u, sp.T[0], sp.T[1] + u, 0, NC); fistG(g2, sp.H[0], sp.H[1] + u);
        blitG(b2, g2);
        (mir ? walk.left : walk.right).push(finish(b2, 10, 26, mir));
      });
      // de frente: el brazo derecho del cuadro agarra el juguete; de espaldas: el izquierdo
      var uf = BOB[i] + 1, swr = (i === 3) ? -1 : 0, swl = (i === 1) ? 1 : 0;
      b = bufFrom(W.down[i], 20, 28, 0, 0); g = new G(20, 28);
      toyG(g, kind, fr.H[0], fr.H[1] + uf + (swr < 0 ? 1 : 0), fr.T[0], fr.T[1] + uf, 0, NC); fistG(g, fr.H[0], fr.H[1] + uf + (swr < 0 ? 1 : 0));
      blitG(b, g); b.outlineRim(); walk.down.push(b.toCanvas(10, 26));
      b = bufFrom(W.up[i], 20, 28, 0, 0); g = new G(20, 28);
      var hm = mirX(fr.H, 20), tm = mirX(fr.T, 20);
      toyG(g, kind, hm[0], hm[1] + uf + (swl > 0 ? 1 : 0), tm[0], tm[1] + uf, 0, NC); fistG(g, hm[0], hm[1] + uf + (swl > 0 ? 1 : 0));
      blitG(b, g); b.outlineRim(); walk.up.push(b.toCanvas(10, 26));
    }
    // golpe: lado 32x30 @13,26 (izq @18,26)
    var IDX = [1, 0, 3];
    for (i = 0; i < 3; i++) {
      var sd = SW_SIDE[kind][i], ub = BOB[IDX[i]];
      [false, true].forEach(function (mir) {
        var b3 = bufFrom(W.right[IDX[i]], 32, 30, 3, 0); stripOutline(b3); eraseSideArm(b3, 3, ub);
        var g3 = new G(32, 30);
        armG(g3, 14, 15 + ub, sd.H[0] - 1, sd.H[1], 13, 14 + ub);
        toyG(g3, kind, sd.H[0], sd.H[1], sd.T[0], sd.T[1], sd.shot, NC); fistG(g3, sd.H[0], sd.H[1]);
        blitG(b3, g3);
        (mir ? swing.left : swing.right).push(finish(b3, 13, 26, mir));
      });
      // frente y espaldas 32x48 @16,38 (cuerpo en 6,12)
      ['down', 'up'].forEach(function (dir) {
        var s2 = (dir === 'down' ? SW_DOWN : SW_UP)[kind][i], bb = bufFrom(W[dir][i], 32, 48, 6, 12), uu = BOB[i] + 1;
        stripOutline(bb); eraseFrontArm(bb, 6, 12, uu, 'L'); eraseFrontArm(bb, 6, 12, uu, 'R');
        var gg = new G(32, 48), upv = dir === 'up', sy = 12 + 13 + uu;
        var shx = upv ? 10 : 22;                               // hombro del brazo que golpea (el otro cuelga)
        var hang = upv ? 22 : 9;
        gg.rect(hang, sy, 2, 2, CP.blue); gg.rect(hang, sy + 2, 2, 4, CP.skin); gg.rect(hang + 1, sy + 2, 1, 4, CP.skinD);
        var tmp = new G(32, 48);
        armG(tmp, shx, sy + 1, s2.H[0], s2.H[1], shx - 1, sy);
        toyG(tmp, kind, s2.H[0], s2.H[1], s2.T[0], s2.T[1], s2.shot, NC); fistG(tmp, s2.H[0], s2.H[1]);
        if (s2.behind) { var bg = new Buf(32, 48); blitG(bg, tmp); blitG(bg, gg); bg.blit(bb, 0, 0); bb = bg; }      // el juguete pasa por detras del cuerpo
        else { blitG(bb, gg); blitG(bb, tmp); }
        bb.outlineRim();
        swing[dir].push(bb.toCanvas(16, 38));
      });
    }
    var idle = { right: walk.right[0], left: walk.left[0], down: walk.down[0], up: walk.up[0] };
    return { walk: walk, swing: swing, idle: idle };
  }
  PJ.alexHeld = {};
  TOYS.forEach(function (toy) {
    var o = PJ.alexHeld[toy] = {};
    ['bird', 'nobird'].forEach(function (k) { lazy(o, k, function () { return build(toy, k); }); });
  });
});

/* ======================== ALEXANDER: LA PATADITA (a la pelota y a los perros) ======================== */
/* alexKick[bird|nobird] = { right, left, down, up }  (cada una [2]: rodilla arriba, patada)  -- los mismos lienzos y anclas que alex.<bird>.kick de sprites.js
   (lado 32x30 @13,26 / izq @18,26; frente y espaldas 32x48 @16,38). Con .g1/.g2/.g3 = la misma patada con la guitarra danada / sin guitarra. */
safe('alexKick', function () {
  var A = S.alex;
  if (!A || !A.nobird || !A.bird) return;
  PJ.alexKick = {};
  ['bird', 'nobird'].forEach(function (k) {
    var set = A[k], o = {}, src = set.kick;
    if (!src) return;
    o.right = src.right; o.left = src.left; o.down = src.down; o.up = src.up;
    [1, 2, 3].forEach(function (lvl) { var gset = set['g' + lvl]; if (gset && gset.kick) o['g' + lvl] = { right: gset.kick.right, left: gset.kick.left, down: gset.kick.down, up: gset.kick.up }; });
    PJ.alexKick[k] = o;
  });
});

var T1 = (window.performance && performance.now) ? performance.now() : Date.now();
CV.arteMs = T1 - T0;                                         // lo que cuesta hornear al cargar (sin lo perezoso)
CV.bakeAll = function () { var t = (window.performance && performance.now) ? performance.now() : Date.now(); LAZY.forEach(function (f) { f(); }); return ((window.performance && performance.now) ? performance.now() : Date.now()) - t; };
})();
