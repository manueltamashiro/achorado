/* ACHORADO - js/barranco/arte-personajes.js  (Barranco, B2c: arte de personajes y objetos)
 * Contrato: BARRANCO.md seccion 10.3.  Nota: ../diseno/br-B2c.md.  Script clasico (window.ACH), sin librerias; funciona desde file://.
 * Todo se hornea UNA vez (perezoso al primer acceso): sin getImageData en el bucle, sin shadowBlur, sin filter.
 * (getImageData solo se usa, perezoso y una vez por lienzo, para componer a Alexander con el cajon: igual que alexHeld de Costa Verde.)
 * Necesita base.js, sprites.js y zombies.js ya cargados (si falta algo, solo se omite lo que depende de ello).
 * Publica ACH.sprites.br.pj (detalle: ../diseno/br-B2c.md).  Los zvar tambien en ACH.sprites.zvar con la misma clave.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px;
var S = ACH.sprites = ACH.sprites || {};
if (!px || !px.G) return;
var T0 = (window.performance && performance.now) ? performance.now() : Date.now();
var BRS = S.br = S.br || {};
var PJ = BRS.pj = BRS.pj || {};
var G = px.G;
function safe(name, fn) { try { fn(); } catch (e) { if (window.console) console.warn('[br-arte-personajes] ' + name + ':', e); } }
function mkCv(w, h) { var c = (px.canvas ? px.canvas(w, h) : null); if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; } return c; }
/* Horneado perezoso: la propiedad se hornea al primer acceso y se vuelve un valor normal. */
var LAZY = [];
function lazy(obj, key, fn, enumerable) {
  var tries = 0, en = enumerable !== false, def = function (v) { Object.defineProperty(obj, key, { value: v, writable: true, enumerable: en, configurable: true }); return v; };
  Object.defineProperty(obj, key, {
    enumerable: en, configurable: true,
    get: function () {
      var v = null;
      try { v = fn(); } catch (e) { if (window.console) console.warn('[br-arte-personajes] ' + key + ':', e); }
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
  if (ht === 'toque' || ht === 'cofia' || ht === 'boina' || ht === 'gorro') { mkBegin(b); mkEll(hx - 0.5, cy, hr, hr - 0.4); paint(b, N(ou.hatR)); }
  else if (ht === 'gorra' || ht === 'visera') { mkBegin(b); mkEll(hx - 0.5, cy, hr - 0.2, hr - 0.2); paint(b, N(ou.hatR)); b.rect(Math.round(hx + hr) - 1, cy - 1, 2, 3, ou.hatR[0]); }
  else if (ht === 'casco') { mkBegin(b); mkEll(hx - 0.3, cy, hr, hr); paint(b, N(ou.hatR)); b.rect(Math.round(hx - 1), cy - 3, 1, 6, ou.hatR[3]); }
  else if (ht === 'bucket' || ht === 'paja' || ht === 'fedora') { mkBegin(b); mkEll(hx - 0.3, cy, hr + 1.2, hr + 1.2); paint(b, N(ou.hatR)); mkBegin(b); mkEll(hx - 0.3, cy, hr - 0.8, hr - 0.8); paint(b, [ou.hatR[1], ou.hatR[2], ou.hatR[3]]); }
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
function fillTorso(c, r, y0, y1) {                          // pinta el torso con bisel suave entre y0 e y1 (frac 0..1)
  var t = c.tr, a = tpick(c, y0), b = tpick(c, y1), x, y;
  for (y = a; y <= b; y++) for (x = t.x0[y]; x <= t.x1[y]; x++) tset(c, x, y, (x === t.x0[y]) ? r[3] : ((x === t.x1[y]) ? r[1] : r[2]));
}
function hband(c, f, r) { var t = c.tr, y = tpick(c, f), x; for (x = t.x0[y]; x <= t.x1[y]; x++) tset(c, x, y, r); }
function vband(c, dx, r) { var t = c.tr, y; for (y = t.y0; y <= t.y1; y++) tset(c, t.x1[y] - dx, y, r); }
function px_(c, dx, f, col_) { var t = c.tr, y = tpick(c, f); tset(c, t.x1[y] - dx, y, col_); }
function headBox(c, S_, hd) {                                // esquina de la cabeza de 8 (misma cuenta que drawHead)
  var bd = c.bd, cx = c.ox + S_[0] + hd[0], cy = c.oy + S_[1] - (bd.head - 1) / 2 - 1 + hd[1] + 0.5;
  return [Math.round(cx) - 4, Math.round(cy - (bd.head - 1) / 2)];
}
var OUT = {};

/* ======================== ZOMBIES DE BARRANCO (formato ACH.zvar) ======================== */
/* br_poeta br_poetaRojo br_pintor br_musico_zampona br_musico_guitarra br_musico_cajon br_novio br_novia br_jaranero
   = { move[6] hurt[6] dead } + extras (declama[2] lanza[2] toca[4] mano[6] despechado{move,hurt,dead}). Lienzo 36x(hpx+8), ancla (16, alto-2). */
HATS8.paja = [[-2, 2, 5], [-1, 1, 6], [0, -2, 10]];
HATS8.fedora = [[-3, 2, 5], [-2, 1, 6], [-1, 1, 6], [0, -1, 9]];
HATS8.boina = [[-2, 2, 7], [-1, 0, 8], [0, 0, 6]];
HATS8.gorro = [[-3, 2, 5], [-2, 1, 6], [-1, 0, 7], [0, 0, 7], [1, 0, 1], [2, 0, 1]];
TONES.rojizo = ramp(['#4a3436', '#6f4a46', '#966a60', '#bd9484']);        // despechado: la cara enrojecida de tanto llorar
var R_STRAW = ramp(['#7a6430', '#a88f4c', '#d8c48f', '#efe0aa']);
var C_TEAR = col('#8fd0f0'), C_TEAR2 = col('#e0f6ff');

/* sombreros: detalle (cinta, abolladura, pompon) sobre lo que ya pinto drawHead */
function hatDeco(c, S_, hd, kind, band) {
  var hb = headBox(c, S_, hd), b = c.b, X0 = hb[0], Y0 = hb[1];
  if (kind === 'paja') { b.rect(X0 + 1, Y0 - 1, 6, 1, band); b.set(X0 + 3, Y0 - 2, R_STRAW[3]); b.set(X0 + 9, Y0, R_STRAW[0]); }
  else if (kind === 'fedora') { b.rect(X0 + 1, Y0 - 1, 6, 1, band); b.set(X0 + 3, Y0 - 3, R_BLK[1]); b.set(X0 + 4, Y0 - 3, R_BLK[1]); b.set(X0 + 8, Y0, R_BLK[1]); }
  else if (kind === 'boina') { b.rect(X0 + 0, Y0, 6, 1, band); b.set(X0 + 4, Y0 - 3, R_BLK[2]); }
  else if (kind === 'gorro') { b.rect(X0 + 0, Y0 - 1, 7, 1, band); b.rect(X0 + 1, Y0 - 3, 5, 1, band); b.set(X0 + 3, Y0 - 4, col('#e8d8a0')); b.set(X0 + 4, Y0 - 4, col('#e8d8a0')); }
}
/* gotas: lagrimas cayendo (despechado) */
function tears(c, S_, hd, fr) {
  var hb = headBox(c, S_, hd), b = c.b, X0 = hb[0], Y0 = hb[1], k = fr % 3;
  b.set(X0 + 6, Y0 + 4 + k, C_TEAR); b.set(X0 + 7, Y0 + 4 + ((k + 1) % 3), C_TEAR); b.set(X0 + 6, Y0 + 3 + k, C_TEAR2);
  b.set(X0 + 5, Y0 + 5 + ((k + 2) % 3), C_TEAR);
}
/* objetos que llevan en la mano */
PROPS.libro = { rows: ['LLLLLL', 'PKPPKP', 'PPKPPK', 'DDDDDD'], c: { L: '#f6f0d8', P: '#e2d8b8', K: '#3a2418', D: '#6a3a24' } };
PROPS.cuaderno = { rows: ['RRRRR', 'RSSSR', 'RSYSR', 'RSSSR', 'DDDDD'], c: { R: '#b8202c', S: '#8a1418', Y: '#f2c81c', D: '#5e0a10' } };
function brush(b, hx, hy, tx, ty, paint) {                        // pincel largo: mango de madera y cerdas con pintura
  b.line(hx, hy, tx, ty, col('#a06a36')); b.line(hx + 1, hy, tx + 1, ty, col('#6b4223'));
  var ux = tx - hx, uy = ty - hy, L = Math.sqrt(ux * ux + uy * uy) || 1; ux /= L; uy /= L;
  b.rect(Math.round(tx - ux * 1.5), Math.round(ty - uy * 1.5), 2, 2, col('#c9c5b5'));
  b.rect(Math.round(tx + ux * 0.5), Math.round(ty + uy * 0.5), 2, 2, paint); b.set(Math.round(tx + ux * 2), Math.round(ty + uy * 2), paint);
}
function pipes(b, x, y, fr) {                                      // zampona de 6 tubos, cortos a la derecha
  var L = [6, 5, 5, 4, 3, 3], i;
  for (i = 0; i < 6; i++) {
    b.rect(x + i, y, 1, L[i], col(i % 2 ? '#d8c070' : '#efdc92')); b.set(x + i, y, col('#3a2a14')); b.set(x + i, y + L[i] - 1, col('#8a6a30'));
  }
  b.rect(x, y + 3, 6, 1, col('#6a4a2a'));                          // la tira que los amarra
}
function guitarra(b, cx, cy, ang, big) {                           // guitarra criolla de caja grande: cuerpo, boca, mastil hacia arriba-adelante
  var ex = cx + Math.cos(ang) * 8, ey = cy + Math.sin(ang) * 8, WD = ramp(['#5a3416', '#7a4a22', '#b07a45', '#d29a5c']);
  b.line(cx, cy, ex, ey, col('#2a1a10')); b.line(cx, cy - 1, ex, ey - 1, col('#4a3220'));
  b.rect(Math.round(ex) - 1, Math.round(ey) - 2, 3, 2, col('#3a2418'));
  mkBegin(b); mkEll(cx, cy, big ? 4.4 : 3.8, big ? 3.6 : 3.2); mkEll(cx - 3.2, cy + 0.5, 2.6, 2.4); paint(b, WD);
  b.set(Math.round(cx), Math.round(cy), col('#1a1010')); b.set(Math.round(cx + 1), Math.round(cy), col('#1a1010'));
  b.set(Math.round(cx + 3), Math.round(cy + 1), col('#2a1a10'));
}
function cajonBox(b, x, y, w, h) {                                  // cajon peruano visto de lado: tapa clara, caja de madera, boca redonda
  var WD = ramp(['#5a3416', '#7a4a22', '#b07a45', '#d29a5c']);
  b.rect(x, y, w, h, WD[2]); b.rect(x, y, w, 1, WD[3]); b.rect(x, y, 1, h, WD[3]); b.rect(x + w - 1, y, 1, h, WD[1]); b.rect(x, y + h - 1, w, 1, WD[0]);
  b.set(x + (w >> 1), y + (h >> 1), WD[0]); b.set(x + (w >> 1) + 1, y + (h >> 1), WD[0]);
}
function hankie(b, x, y, fr, C) {                                   // pañuelo ondeando (arriba de la mano)
  var w = fr % 2;
  b.rect(x - 1, y - 2, 4, 2, C[2]); b.set(x - 1 + w, y - 3, C[3]); b.set(x + 2, y - 3 + w, C[2]); b.set(x + 3, y - 1 - w, C[1]); b.set(x - 2, y - 1 + w, C[1]);
  b.rect(x - 1, y - 1, 4, 1, C[1]);
}

/* ---- atuendos ---- */
var R_NAVY = rp('#232d52'), R_VIO = rp('#35264a'), R_BURG = rp('#5e1c2c'), R_GRN = rp('#26382e'), R_MUST = rp('#c8942a'), R_RUSH = rp('#d8707c'), R_LILA = rp('#b8a0d8');
var R_SMOCK = rp('#cfc09a'), R_BEIGE = rp('#d8cba6');
OUT.poeta = {                                                       // chaqueta oscura de bohemio, camisa clara, bufanda larga
  top: R_VIO, slv: 'long', slvR: R_VIO, bot: R_CHAR, shoe: R_SHOE, hat: null,
  deco: function (c) {
    var t = c.tr, y; for (y = t.y0 + 1; y <= t.y1; y++) { tset(c, t.x1[y] - 1, y, R_CREAM[2]); tset(c, t.x1[y], y, R_CREAM[1]); }
    tset(c, t.x1[t.y0 + 3] - 1, t.y0 + 3, R_BLK[1]); tset(c, t.x1[t.y0 + 6] - 1, t.y0 + 6, R_BLK[1]);
    hband(c, 0.05, R_MUST[2]); tset(c, t.x0[t.y0] + 1, t.y0 + 2, R_MUST[1]); tset(c, t.x0[t.y0] + 1, t.y0 + 3, R_MUST[2]);
  }
};
OUT.poetaRojo = {                                                   // lo mismo en verde botella y con sombrero rojo
  top: R_GRN, slv: 'long', slvR: R_GRN, bot: rp('#3a3226'), shoe: R_SHOE, hat: 'fedora', hatR: rp('#c4202c'),
  deco: function (c) {
    var t = c.tr, y; for (y = t.y0 + 1; y <= t.y1; y++) { tset(c, t.x1[y] - 1, y, R_CREAM[2]); tset(c, t.x1[y], y, R_CREAM[1]); }
    tset(c, t.x1[t.y0 + 3] - 1, t.y0 + 3, R_BLK[1]); hband(c, 0.05, rp('#c4202c')[2]); tset(c, t.x0[t.y0] + 1, t.y0 + 2, rp('#c4202c')[1]);
  }
};
OUT.pintor = {                                                      // blusón de artista salpicado de colores, boina
  top: R_SMOCK, slv: 'long', slvR: R_SMOCK, bot: rp('#3a3a4a'), shoe: ramp(['#2a1c14', '#4a3224', '#6a4a34', '#8a6a4c']), hat: 'boina', hatR: rp('#2a6a78'),
  deco: function (c) {
    var t = c.tr, y, x, cl = [col('#e8382c'), col('#2a62d0'), col('#f2c81c'), col('#2aa860'), col('#e060a8')], n = 0;
    for (y = t.y0 + 1; y <= t.y1 - 1; y++) for (x = t.x0[y] + 1; x <= t.x1[y]; x++) if (hash(x * 31 + y * 17 + 5) < 0.17) tset(c, x, y, cl[(n++) % 5]);
    hband(c, 0.9, R_SMOCK[1]);
  }
};
OUT.musZampona = {                                                  // chompa de lana de rayas, gorro tejido, pantalón oscuro
  top: rp('#8a5a3a'), slv: 'long', slvR: rp('#8a5a3a'), bot: R_CHAR, shoe: R_SHOE, hat: 'gorro', hatR: rp('#b8452c'),
  deco: function (c) { hband(c, 0.3, rp('#e8d8a0')[2]); hband(c, 0.62, rp('#3a6a58')[2]); hband(c, 0.9, rp('#8a5a3a')[1]); }
};
OUT.musGuitarra = {                                                 // guayabera clara con pliegues, chaleco, sombrero de paja
  top: R_CREAM, slv: 'short', slvR: R_CREAM, bot: rp('#4a3a2a'), shoe: R_SHOE, hat: 'paja', hatR: R_STRAW,
  deco: function (c) {
    var t = c.tr, y; vband(c, 2, R_CREAM[1]); vband(c, 4, R_CREAM[1]);
    for (y = t.y0 + 1; y <= t.y1; y++) tset(c, t.x0[y] + 1, y, R_CREAM[1]);
    tset(c, t.x1[t.y0 + 4] - 3, t.y0 + 4, R_CREAM[0]); tset(c, t.x1[t.y0 + 4] - 4, t.y0 + 4, R_CREAM[0]);
    hband(c, 0.92, rp('#4a3a2a')[1]);
  }
};
OUT.musCajon = {                                                    // camisa blanca, pañuelo rojo al cuello, boina
  top: R_WH, slv: 'long', slvR: R_WH, bot: R_BLK, shoe: R_SHOE, hat: 'boina', hatR: rp('#3a3a44'),
  deco: function (c) {
    var t = c.tr; hband(c, 0.02, rp('#c4202c')[2]); tset(c, t.x0[t.y0] + 1, t.y0 + 1, rp('#c4202c')[1]); tset(c, t.x0[t.y0] + 1, t.y0 + 2, rp('#c4202c')[2]);
    tset(c, t.x1[t.y0 + 1], t.y0 + 1, rp('#c4202c')[3]); hband(c, 0.9, R_BLK[1]);
  }
};
OUT.novio = {                                                       // terno guindo, camisa beige, corbata roja caída, rosa en la solapa
  top: R_BURG, slv: 'long', slvR: R_BURG, bot: rp('#2c2630'), shoe: R_SHOE, hat: null,
  deco: function (c) {
    var t = c.tr, y; for (y = t.y0 + 1; y <= t.y1; y++) { tset(c, t.x1[y] - 1, y, R_BEIGE[2]); }
    for (y = t.y0 + 2; y <= t.y0 + 6 && y <= t.y1; y++) tset(c, t.x1[y] - 1, y, y === t.y0 + 2 ? rp('#e8382c')[3] : rp('#d8142a')[2]);
    tset(c, t.x1[t.y0 + 3], t.y0 + 3, col('#ff7aa8')); tset(c, t.x1[t.y0 + 4], t.y0 + 4, col('#ff4a88'));
    hband(c, 0.94, R_BLK[1]);
  }
};
OUT.novia = {                                                       // vestido lila con cinta roja, hombros descubiertos
  top: R_LILA, slv: 'none', bot: R_LILA, legs: 'short', shoe: rp('#b8202c'), hat: null,
  deco: function (c) {
    var t = c.tr, y; hband(c, 0.62, rp('#d8142a')[2]); hband(c, 0.7, rp('#d8142a')[1]);
    for (y = t.y0; y <= t.y1; y++) tset(c, t.x0[y] + 1, y, R_LILA[3]);
    hband(c, 0.02, R_WH[2]);
  }
};
OUT.jaranero = {                                                    // camisa de mangas anchas, chaleco, pañuelo a la cintura, sombrero de paja
  top: R_WH, slv: 'long', slvR: R_WH, bot: rp('#d8ccaa'), shoe: ramp(['#2a1c14', '#4a3224', '#6a4a34', '#8a6a4c']), hat: 'paja', hatR: R_STRAW,
  deco: function (c) {
    var t = c.tr, y, x;
    for (y = t.y0 + 1; y <= t.y1; y++) for (x = t.x0[y] + 2; x <= t.x1[y]; x++) tset(c, x, y, x === t.x0[y] + 2 ? R_BURG[3] : (x === t.x1[y] ? R_BURG[1] : R_BURG[2]));
    hband(c, 0.9, rp('#d8142a')[2]); hband(c, 0.97, rp('#d8142a')[1]);
    tset(c, t.x0[t.y1] - 1, t.y1, rp('#d8142a')[2]); tset(c, t.x0[t.y1] - 1, t.y1 + 1, rp('#d8142a')[1]); tset(c, t.x0[t.y1] - 2, t.y1 + 1, rp('#d8142a')[2]);
  }
};

/* ---- poses ---- */
function sk6(bd, fr, n, P) { return poseTrab(bd, fr, n, P); }
function scarfTail(c, Sx, Sy, fr, C) {                              // bufanda: nudo al cuello y cola que se mece atras
  var b = c.b, x0 = c.ox + Math.round(Sx), y0 = c.oy + Math.round(Sy), k, w = (fr % 3) - 1;
  b.set(x0, y0 - 1, C[2]); b.set(x0 + 1, y0 - 1, C[2]); b.set(x0 + 2, y0, C[1]);
  for (k = 1; k <= 5; k++) b.set(x0 - k, y0 + 1 + (k >> 1) + (k > 2 ? w : 0), k % 2 ? C[2] : C[3]);
  b.set(x0 - 5, y0 + 3 + w, C[1]); b.set(x0 - 6, y0 + 3 + w, C[1]);
}
function posePoeta(bd, fr, n, P) {
  var pz = sk6(bd, fr, n, P), Sx = pz.S[0], Sy = pz.S[1], s = SIN(fr / n * PI * 2), hd = pz.hd, act = P.spec.act, sp = P.spec;
  var book = sp.cuaderno ? 'cuaderno' : 'libro', band = sp.hatBand, scarf = sp.scarf || R_MUST;
  if (act === 'declama') {                                          // brazo en alto con el libro, boca abierta: «¡Oh, luna de Barranco!»
    var up = (fr % 2) ? 1 : 0;
    pz.aN = { h: [Sx + 4.6, Sy - 3.4 - up], b: -1 }; pz.aF = { h: [Sx - 0.5, Sy + 6.4], b: -1 }; pz.mouth = 'wide'; pz.hd = [hd[0] + 0.4, hd[1] - 0.4];
  } else { pz.aN = { h: [Sx + 3.4, Sy + 3.8 + 0.4 * s], b: -1 }; pz.mouth = (fr % 3 === 1) ? 'wide' : 'closed'; }
  var hx = pz.aN.h[0], hy = pz.aN.h[1];
  pz.late = function (c) {
    drawProp(c.b, book, c.ox + hx + 1, c.oy + hy);
    scarfTail(c, Sx, Sy, fr, scarf);
    if (band) hatDeco(c, [Sx, Sy], pz.hd, 'fedora', band);
  };
  return pz;
}
function posePintor(bd, fr, n, P) {
  var pz = sk6(bd, fr, n, P), Sx = pz.S[0], Sy = pz.S[1], s = SIN(fr / n * PI * 2), act = P.spec.act, hd = pz.hd, hx, hy, tx, ty;
  var pcol = col(['#e8382c', '#2a62d0', '#f2c81c', '#2aa860'][P.spec.paintC || 0]);
  if (act === 'lanza') {                                            // 0: brazo atras armando, 1: brazo adelante soltando el brochazo
    if (fr % 2 === 0) { pz.aN = { h: [Sx - 3.2, Sy - 1.8], b: 1 }; hx = Sx - 3.2; hy = Sy - 1.8; tx = hx - 4; ty = hy - 6; pz.sq = 1; }
    else { pz.aN = { h: [Sx + 5.4, Sy + 2.2], b: -1 }; hx = Sx + 5.4; hy = Sy + 2.2; tx = hx + 6; ty = hy - 3; pz.hd = [hd[0] + 0.8, hd[1] + 0.4]; }
    pz.mouth = 'wide';
  } else { pz.aN = { h: [Sx + 3.8, Sy + 3.0 + 0.5 * s], b: -1 }; hx = pz.aN.h[0]; hy = pz.aN.h[1]; tx = hx + 5; ty = hy - 6 - (fr % 2); pz.mouth = fr % 3 === 1 ? 'closed' : 'slack'; }
  pz.late = function (c) {
    var b = c.b;
    brush(b, c.ox + hx + 1, c.oy + hy, c.ox + tx, c.oy + ty, pcol);
    if (act !== 'lanza') {                                          // paleta con manchas al frente del torso
      var px0 = c.ox + Sx + 0.5, py0 = c.oy + Sy + 6.5;
      mkBegin(b); mkEll(px0, py0, 3.2, 2.2); paint(b, ramp(['#6a4223', '#8a5a2c', '#b07a45', '#d29a5c']));
      b.set(px0 - 1, py0 - 1, col('#e8382c')); b.set(px0 + 1, py0 - 1, col('#2a62d0')); b.set(px0, py0 + 1, col('#f2c81c')); b.set(px0 + 2, py0, col('#2aa860'));
    }
    hatDeco(c, [Sx, Sy], pz.hd, 'boina', rp('#1a4a56')[1]);
  };
  return pz;
}
function poseMus(kind) {
  return function (bd, fr, n, P) {
    var pz = sk6(bd, fr, n, P), Sx = pz.S[0], Sy = pz.S[1], s = SIN(fr / n * PI * 2), act = P.spec.act, hd = pz.hd, c4 = fr % 2;
    if (kind === 'zampona') {
      var tx = Sx + hd[0] + 3, ty = Sy - 3.2 + hd[1] + (act ? (c4 ? 0 : 0.5) : 0.4 * Math.abs(s));
      pz.aN = { h: [tx + 1, ty + 5], b: -1 }; pz.mouth = 'closed';
      pz.late = function (c) { pipes(c.b, c.ox + Math.round(tx), c.oy + Math.round(ty), fr); hatDeco(c, [Sx, Sy], pz.hd, 'gorro', rp('#e8d8a0')[2]); };
    } else if (kind === 'guitarra') {
      var gx = Sx + 1.5, gy = Sy + 5.8, strum = act ? (c4 ? 1 : -1) : Math.round(s);
      pz.aN = { h: [gx + 0.6, gy - 0.6 + strum * 0.8], b: -1 }; pz.aF = { h: [Sx + 7.2, Sy + 0.8], b: -1 }; pz.armLate = true; pz.mouth = 'slack';
      pz.front = function (c) { guitarra(c.b, c.ox + gx, c.oy + gy, -0.55, true); };
      pz.late = function (c) { hatDeco(c, [Sx, Sy], pz.hd, 'paja', rp('#a02a1c')[2]); };
    } else {
      var by = Sy + 3.4, tap = act ? (c4 ? -1 : 0) : (fr % 3 === 1 ? -1 : 0);
      pz.aN = { h: [Sx + 5.6, by - 0.6 + tap], b: -1 }; pz.armLate = true; pz.mouth = fr % 3 === 1 ? 'wide' : 'closed';
      pz.front = function (c) { cajonBox(c.b, c.ox + Math.round(Sx) + 2, c.oy + Math.round(by), 6, 7); };
      pz.late = function (c) { hatDeco(c, [Sx, Sy], pz.hd, 'boina', rp('#22222a')[1]); };
    }
    return pz;
  };
}
function poseNovio(bd, fr, n, P) {
  var pz = sk6(bd, fr, n, P), Sx = pz.S[0], Sy = pz.S[1], s = SIN(fr / n * PI * 2), sp = P.spec;
  pz.late = null; pz.mouth = fr % 3 === 1 ? 'closed' : 'slack';
  if (sp.manoAct) {                                                   // de la mano: el brazo de atrás se estira hacia ella, la mano abierta un poco abajo
    pz.aF = { h: [Sx - 7.2 - 0.3 * s, Sy + 5.8], b: -1 };
    pz.aN = { h: [Sx + 1.2 - 1.4 * s, Sy + 6.4], b: -1 };
    pz.late = function (c) { heart(c, Sx, Sy, fr); };
  }
  if (sp.desp) {                                                       // despechado: a la carrera, los dos brazos al frente, llorando
    var bob = (fr % 2) * 0.6;
    pz.aN = { h: [Sx + 5.6, Sy + 2.0 + bob], b: -1 }; pz.aF = { h: [Sx + 4.6, Sy + 3.2 - bob], b: -1 }; pz.armLate = true; pz.mouth = 'wide'; pz.hd = [pz.hd[0] + 0.6, pz.hd[1]];
    pz.late = function (c) { tears(c, [Sx, Sy], pz.hd, fr); };
  }
  return pz;
}
function heart(c, Sx, Sy, fr) {                                       // corazoncito sobre la cabeza, late
  var b = c.b, x = c.ox + Math.round(Sx) + 1, y = c.oy + Math.round(Sy) - 13 - (fr % 2);
  var cc = col('#ff5aa8'); b.set(x, y, cc); b.set(x + 2, y, cc); b.rect(x - 1 + 0, y + 1, 5, 1, cc); b.rect(x, y + 2, 3, 1, cc); b.set(x + 1, y + 3, cc); b.set(x, y, col('#ffb0d0'));
}
function poseNovia(bd, fr, n, P) {
  var pz = poseNovio(bd, fr, n, P), Sx = pz.S[0], Sy = pz.S[1], Hx = pz.H[0], Hy = pz.H[1], sp = P.spec, s = SIN(fr / n * PI * 2);
  if (sp.manoAct) { pz.aN = { h: [Sx + 7.2 + 0.3 * s, Sy + 5.6], b: -1 }; pz.aF = { h: [Sx - 0.4 - 1.2 * s, Sy + 6.2], b: -1 }; pz.late = null; }
  var prevLate = pz.late;
  pz.front = function (c) {                                           // falda: se abre desde la cintura hasta la rodilla y se mece
    var b = c.b, y0 = c.oy + Math.round(Hy) - 1, k, sw = Math.round(SIN(fr / n * PI * 2) * 1), x0 = c.ox + Math.round(Hx);
    for (k = 0; k < 7; k++) {
      var w = 3 + Math.floor(k * 0.7), xa = x0 - w + sw * (k > 3 ? 1 : 0), xb = x0 + w + 1 + sw * (k > 3 ? 1 : 0), y = y0 + k;
      var r = R_LILA; for (var x = xa; x <= xb; x++) b.set(x, y, x === xa ? r[3] : (x >= xb - 1 ? r[1] : (k === 6 ? r[1] : r[2])));
      if (k === 5) for (x = xa + 1; x < xb; x += 2) b.set(x, y, rp('#d8142a')[2]);
    }
  };
  pz.late = function (c) {
    if (prevLate) prevLate(c);
    if (!sp.desp) { var hb = headBox(c, [Sx, Sy], pz.hd); c.b.set(hb[0] + 2, hb[1] - 1, col('#ff5aa8')); c.b.set(hb[0] + 3, hb[1] - 1, col('#ffd75a')); c.b.set(hb[0] + 3, hb[1], col('#ff5aa8')); }
  };
  return pz;
}
function poseJaranero(bd, fr, n, P) {
  var pz = sk6(bd, fr, n, P), Sx = pz.S[0], Sy = pz.S[1], ph = fr / n * PI * 2, s = SIN(ph), cs = COS(ph), Hx = pz.H[0], Hy = pz.H[1], k = bd.legD / 9;
  /* zapateo: una pierna levanta la rodilla y la otra aplasta el piso; el brazo de adelante agita un pañuelo arriba, el otro en la cintura */
  var lN = max(0, s) * 4 * k, lF = max(0, -s) * 4 * k;
  pz.lN = { f: [Hx + 1.8 + 1.6 * max(0, s), -1 - lN], p: lN > 1 ? 1 : 0, bend: 1 };
  pz.lF = { f: [Hx - 1.2 - 1.2 * max(0, -s), -1 - lF], p: lF > 1 ? 1 : 0, bend: 1 };
  pz.H = [Hx, bd.hipY + (abs(s) > 0.7 ? 0.9 : -0.3)]; pz.S = [Sx + 0.2 * cs, Sy + (abs(s) > 0.7 ? 0.9 : -0.3)];
  Sx = pz.S[0]; Sy = pz.S[1];
  var wx = Sx + 3.4 + 1.4 * cs, wy = Sy - 3.2 - (fr % 2);
  pz.aN = { h: [wx, wy], b: -1 }; pz.aF = { h: [Sx - 1.6, Sy + 4.6], b: 1 }; pz.mouth = 'wide'; pz.armLate = true;
  pz.hd = [1.2, 0.4 + (abs(s) > 0.7 ? 0.5 : 0)];
  pz.late = function (c) { hankie(c.b, c.ox + Math.round(wx) + 1, c.oy + Math.round(wy) - 1, fr, rp('#f4f0e4')); hatDeco(c, [Sx, Sy], pz.hd, 'paja', rp('#d8142a')[2]); };
  return pz;
}

/* ---- construccion: move[6] hurt[6] dead (+ extras por accion) ---- */
function frames(spec, act, n) {
  var s2 = {}, k; for (k in spec) s2[k] = spec[k]; s2.act = act;
  var bd = bodyOf(s2.body), ou = s2.outfit, cv = baseCv(bd, 36, 16, 3), out = [];
  var P = { bd: bd, ou: ou, skin: TONES[s2.tone || 'verde'], hair: s2.hair || 'corto', hc: HAIRS[s2.hc || 'negro'], seed: s2.seed || 1,
    wear: s2.wear === undefined ? 1 : s2.wear, blood: s2.blood || 0, faceBlood: s2.faceBlood || 0, rot: s2.rot, ox: cv.ox, oy: cv.oy, spec: s2, blind: false };
  for (var fr = 0; fr < n; fr++) {
    var b = new Buf(cv.W, cv.H);
    drawFigure(b, P, s2.pose(bd, fr, n, P));
    b.outlineRim();
    out.push(b);
  }
  return { bufs: out, ox: cv.ox, oy: cv.oy };
}
function buildZ(spec) {
  var f = frames(spec, null, 6), res = { move: [], hurt: [] };
  f.bufs.forEach(function (b) { res.move.push(b.toCanvas(f.ox, f.oy)); res.hurt.push(b.solid().toCanvas(f.ox, f.oy)); });
  res.dead = buildDeadZ(spec, bodyOf(spec.body), spec.outfit);
  ['declama', 'lanza', 'toca'].forEach(function (act) {
    if (!spec[act]) return;
    var fx = frames(spec, act, spec[act]);
    res[act] = fx.bufs.map(function (b) { return b.toCanvas(fx.ox, fx.oy); });
  });
  if (spec.mano) {                                                    // de la mano
    var s3 = {}, k; for (k in spec) s3[k] = spec[k]; s3.manoAct = true; var fm = frames(s3, null, 6);
    res.mano = fm.bufs.map(function (b) { return b.toCanvas(fm.ox, fm.oy); });
    res.mano.hand = spec.mano;                                        // [dx, dy] de la mano respecto del ancla (para la linea que une a la pareja)
  }
  if (spec.despe) {
    var s4 = {}, k2; for (k2 in spec) s4[k2] = spec[k2]; s4.desp = true; s4.tone = 'rojizo'; s4.blood = 0; s4.faceBlood = 0; s4.pose = spec.despe; s4.wear = 2;
    var fd = frames(s4, null, 6);
    res.despechado = { move: [], hurt: [] };
    fd.bufs.forEach(function (b) { res.despechado.move.push(b.toCanvas(fd.ox, fd.oy)); res.despechado.hurt.push(b.solid().toCanvas(fd.ox, fd.oy)); });
    res.despechado.dead = buildDeadZ(s4, bodyOf(s4.body), s4.outfit);
  }
  return res;
}
var ZS = {
  br_poeta:        { body: 'normalFlaco', outfit: OUT.poeta, tone: 'palido', hair: 'largo', hc: 'negro', seed: 401, pose: posePoeta, declama: 2, blood: 0, scarf: R_MUST },
  br_poetaRojo:    { body: 'normalFlaco', outfit: OUT.poetaRojo, tone: 'verde', hair: 'largo', hc: 'casta', seed: 412, pose: posePoeta, declama: 2, cuaderno: 1, hatBand: rp('#6a0a14')[1], scarf: rp('#c4202c'), blood: 1 },
  br_pintor:       { body: 'normal', outfit: OUT.pintor, tone: 'verde', hair: 'cana', hc: 'gris', seed: 423, pose: posePintor, lanza: 2, wear: 2, paintC: 1 },
  br_musico_zampona: { body: 'normal', outfit: OUT.musZampona, tone: 'gris', hair: 'corto', hc: 'negro', seed: 434, pose: poseMus('zampona'), toca: 4 },
  br_musico_guitarra: { body: 'normalAncho', outfit: OUT.musGuitarra, tone: 'amarillo', hair: 'cana', hc: 'gris', seed: 445, pose: poseMus('guitarra'), toca: 4, blood: 1 },
  br_musico_cajon: { body: 'normal', outfit: OUT.musCajon, tone: 'verde', hair: 'corto', hc: 'negro', seed: 456, pose: poseMus('cajon'), toca: 4 },
  br_novio:        { body: 'normal', outfit: OUT.novio, tone: 'verde', hair: 'corto', hc: 'negro', seed: 467, pose: poseNovio, mano: [-5, -11], despe: poseNovio, blood: 1 },
  br_novia:        { body: 'normalFlaco', outfit: OUT.novia, tone: 'gris', hair: 'grena', hc: 'casta', seed: 478, pose: poseNovia, mano: [10, -11], despe: poseNovia, faceBlood: 1 },
  br_jaranero:     { body: 'normal', outfit: OUT.jaranero, tone: 'verde', hair: 'corto', hc: 'negro', seed: 489, pose: poseJaranero, blood: 0 }
};
BRS.zvarKeys = Object.keys(ZS);
safe('zvar', function () {
  var zv = S.zvar;
  BRS.zvarKeys.forEach(function (key) {
    var spec = ZS[key];
    lazy(PJ, key, function () { return buildZ(spec); });
    if (zv) { try { Object.defineProperty(zv, key, { enumerable: true, configurable: true, get: function () { var v = PJ[key]; if (v) Object.defineProperty(zv, key, { value: v, writable: true, enumerable: true, configurable: true }); return v; }, set: function (v) { Object.defineProperty(zv, key, { value: v, writable: true, enumerable: true, configurable: true }); } }); } catch (e) { /* zvar congelado */ } }
  });
});


/* ======================== DON JARANON, LA VOZ DE ORO DE BARRANCO (jefe) ======================== */
/* Cantante criollo zombie gigante: terno blanco roto, camisa celeste, corbata granate, pañuelo en el bolsillo, bigote fino,
   pelo engominado algo despeinado, piel verde-gris, ojos con brillo y microfono antiguo de pedestal que usa de baston.
   De frente (el motor lo voltea). Lienzo 100x104, ancla (50, 98) = suelo entre los pies. ~66 px de alto (2.3 x una persona de 28). */
var JJ = {
  jk: ['#8c8a93', '#bdb9ab', '#e6e2d4', '#fbf8ec'], sh: ['#566680', '#8ea0b8', '#bcd0e4', '#e4f0fa'], tie: ['#3e0a14', '#6e1220', '#a21e2e', '#d4384a'],
  pt: ['#7e7b72', '#aaa798', '#d2cfc0', '#eeebda'], sk: ['#46564a', '#657866', '#8fa088', '#b8c8aa'], hair: ['#0a080c', '#1c1820', '#2e2a34', '#6a7a96'],
  mic: ['#2a2e36', '#5a6270', '#9aa6b4', '#e0e8f0'], shoe: ['#08080a', '#1c1c22', '#34343c', '#6a6a76'], cloth: ['#a8a69a', '#d4d2c6', '#f4f2ea', '#ffffff'], red: ['#6a0e18', '#a41a26', '#d4283a', '#f2584a']
};
var CW = 100, CHH = 104, CCX = 50, CFY = 98;
function tubeG(g, x0, y0, x1, y1, r, rm) {                   // tubo grueso con luz arriba-izquierda
  var n = Math.max(1, Math.ceil(Math.max(abs(x1 - x0), abs(y1 - y0)))), i, t;
  for (i = 0; i <= n; i++) { t = i / n; g.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, rm[1]); }
  for (i = 0; i <= n; i++) { t = i / n; g.disc(x0 + (x1 - x0) * t - 0.6, y0 + (y1 - y0) * t - 0.6, r - 0.9, rm[2]); }
  for (i = 0; i <= n; i++) { t = i / n; g.disc(x0 + (x1 - x0) * t - 1.3, y0 + (y1 - y0) * t - 1.3, Math.max(0.7, r - 2.6), rm[3]); }
}
function rotG(g, ang, pxv, pyv) {                            // gira el sprite (vecino mas cercano) alrededor de un punto
  var n = new G(g.w, g.h), ca = Math.cos(-ang), sa = Math.sin(-ang), x, y;
  for (y = 0; y < g.h; y++) for (x = 0; x < g.w; x++) { var dx = x - pxv, dy = y - pyv, c = g.get(Math.round(pxv + dx * ca - dy * sa), Math.round(pyv + dx * sa + dy * ca)); if (c) n.set(x, y, c); }
  return n;
}
function micHead(g, x, y, ang) {                             // microfono antiguo de pedestal: capsula ovalada con rejilla horizontal
  var M = JJ.mic, ca = Math.cos(ang), sa = Math.sin(ang), i, j;
  for (j = -7; j <= 7; j++) for (i = -5; i <= 5; i++) {
    var u = i / 5.2, v = j / 7.2; if (u * u + v * v > 1) continue;
    var xx = x + i * ca - j * sa, yy = y + i * sa + j * ca, lit = -(u * 0.7 + v * 0.5);
    var c = (j % 3 === 0) ? M[0] : (lit > 0.35 ? M[3] : (lit > -0.1 ? M[2] : M[1]));
    g.set(xx, yy, c); g.set(xx + 0.5, yy + 0.5, c);
  }
  g.rect(Math.round(x - 8 * sa) - 1, Math.round(y + 8 * ca) - 1, 3, 2, M[0]);
}
function hankG(g, hx, hy, ang, len, wave, wide) {            // pañuelo grande: tela blanca con ribete granate que ondea
  var dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx, t, k;
  for (t = 0; t <= len; t += 0.5) {
    var f = t / len, w = Math.min(wide || 6, 1.6 + t * 0.34) * (f > 0.88 ? 1 - (f - 0.88) * 6 : 1), off = Math.sin(f * 3.4 + wave) * 2.2 * f;
    var cx = hx + dx * t + nx * off, cy = hy + dy * t + ny * off;
    for (k = -Math.round(w); k <= Math.round(w); k++) {
      var c = abs(k) >= Math.round(w) ? JJ.red[2] : (k < -w * 0.4 ? JJ.cloth[3] : (k > w * 0.4 ? JJ.cloth[1] : JJ.cloth[2]));
      g.set(cx + nx * k, cy + ny * k, c);
    }
  }
  var ex = hx + dx * len, ey = hy + dy * len; g.set(ex, ey, JJ.red[1]);
}
function jaranG(P) {
  P = P || {};
  var g = new G(CW, CHH), sq = P.sq || 0, jump = P.jump || 0, bel = P.bel || 0, cx = CCX + (P.lean || 0), s, i, u;
  function Y(v) { return CFY - jump - (v >= 22 ? v - sq : v); }
  var J = JJ, hx = cx + (P.headDx || 0), hy = Y(60) + (P.headDy || 0);
  /* pedestal del microfono (detras del cuerpo): base de disco pesado, tubo y cabeza si no esta pegada a la boca */
  var M = P.mic;
  if (M) {
    var bx = M.bx, by = CFY - (M.bu || 0), tx = M.tx, ty = CFY - M.tu;
    g.ell(bx, by - 1, 8, 3, J.mic[0]); g.ell(bx, by - 2, 7, 2.2, J.mic[1]); g.rect(bx - 4, by - 3, 6, 1, J.mic[3]);
    g.line(bx, by - 3, tx, ty, J.mic[0]); g.line(bx + 1, by - 3, tx + 1, ty, J.mic[2]); g.line(bx - 1, by - 3, tx - 1, ty, J.mic[1]);
    if (!M.late) micHead(g, tx, ty - 7, Math.atan2(tx - bx, by - ty));
  }
  /* piernas: tubos de pantalon con raya y zapatos de charol */
  var legs = P.legs || {};
  [-1, 1].forEach(function (sd) {
    var L = legs[sd < 0 ? 'L' : 'R'] || {}, hxx = cx + sd * 6, hyy = Y(25), fx = cx + sd * 7 + (L.dx || 0), fu = L.u || 0, fy = CFY - fu - 5;
    tubeG(g, hxx, hyy, fx, fy, 4.6, J.pt);
    g.line(fx, fy - 14, fx, fy, J.pt[1]);
    var sy = CFY - fu - 4, sw = 6;
    for (var yy = sy; yy <= sy + 4; yy++) for (var xx = fx - sw + (sd > 0 ? 1 : -2); xx <= fx + sw + (sd > 0 ? 2 : -1); xx++) g.set(xx, yy, yy === sy ? J.shoe[3] : (yy === sy + 4 ? J.shoe[0] : J.shoe[1]));
    g.set(fx - 2, sy + 1, '#ffffff'); g.set(fx - 3, sy + 1, J.shoe[3]);
  });
  /* tronco: saco blanco largo, camisa celeste en V, corbata granate */
  var T = [[24, 13], [28, 12.5], [34, 14], [40, 16.5], [45, 17], [48, 12], [50, 7]];
  function hw(v) { for (var q = 0; q < T.length - 1; q++) if (v <= T[q + 1][0]) { var f = (v - T[q][0]) / (T[q + 1][0] - T[q][0]); return T[q][1] + (T[q + 1][1] - T[q][1]) * f; } return 6; }
  for (u = 24; u <= 50; u++) {
    var w = Math.round(hw(u) + (u < 36 ? bel * 0.4 : 0)), y = Y(u);
    for (i = -w; i <= w; i++) g.set(cx + i, y, i === -w ? J.jk[3] : (i === w ? J.jk[0] : (i >= w - 2 ? J.jk[1] : J.jk[2])));
  }
  for (i = -13; i <= 13; i++) g.set(cx + i, Y(24), J.jk[0]);                                        // dobladillo
  for (u = 31; u <= 49; u++) {                                                                      // camisa en V
    var hv = Math.max(0, Math.round((u - 30) * 0.4)), yy2 = Y(u);
    for (i = -hv; i <= hv; i++) g.set(cx + i, yy2, i === -hv ? J.sh[3] : (i === hv ? J.sh[1] : J.sh[2]));
    g.set(cx - hv - 1, yy2, J.jk[0]); g.set(cx + hv + 1, yy2, J.jk[0]);                           // solapas
    if (u < 44) g.set(cx - hv - 2, yy2, J.jk[3]);
  }
  for (u = 31; u <= 46; u++) {                                                                      // corbata
    var tw = u > 43 ? 1 : (u > 38 ? 1 : (u > 34 ? 2 : 1)), yy3 = Y(u);
    for (i = -tw; i <= tw; i++) g.set(cx + i, yy3, i < 0 ? J.tie[3] : (i > 0 ? J.tie[1] : J.tie[2]));
  }
  g.rect(cx - 2, Y(47), 5, 2, J.tie[2]); g.set(cx - 2, Y(47), J.tie[3]);
  [[-9, 29], [9, 29]].forEach(function (b) { g.set(cx + b[0], Y(b[1]), J.jk[0]); g.set(cx + b[0] + 1, Y(b[1]), J.jk[0]); });   // botones
  /* bolsillo del pecho con pañuelo asomando */
  g.rect(cx + 8, Y(41), 6, 1, J.jk[0]); g.rect(cx + 9, Y(43), 4, 2, J.cloth[3]); g.set(cx + 10, Y(44), J.red[2]); g.set(cx + 12, Y(44), J.red[2]); g.set(cx + 11, Y(45), J.cloth[3]);
  /* rotos del saco: piel podrida y una costilla */
  g.rect(cx - 10, Y(36), 3, 2, J.sk[1]); g.set(cx - 10, Y(36), J.sk[0]); g.set(cx - 8, Y(35), J.sk[2]); g.rect(cx + 6, Y(31), 2, 3, J.sk[1]); g.set(cx + 7, Y(31), '#d8d4c0'); g.set(cx + 7, Y(29), J.sk[0]);
  g.set(cx - 12, Y(25), J.jk[0]); g.set(cx - 10, Y(24), null); g.set(cx + 11, Y(24), null); g.set(cx + 4, Y(24), null);
  /* cuello y cuello de la camisa */
  g.rect(cx - 3, Y(54), 7, 6, J.sk[1]); g.rect(cx - 3, Y(54), 2, 6, J.sk[2]);
  g.rect(cx - 6, Y(50), 13, 2, J.sh[3]); g.set(cx - 6, Y(49), J.sh[2]); g.set(cx + 6, Y(49), J.sh[1]); g.set(cx - 5, Y(51), J.sh[2]);
  /* cabeza: papada, orejas, pelo engominado detras, cara */
  var hair = J.hair, sk = J.sk;
  blobG(g, hx, hy + 6, 8.4, 5, [sk[0], sk[0], sk[1], sk[1]]);
  blobG(g, hx - 10, hy + 1, 2, 3.2, [sk[0], sk[0], sk[1], sk[2]]); blobG(g, hx + 10, hy + 1, 2, 3.2, [sk[0], sk[0], sk[0], sk[1]]);
  blobG(g, hx, hy - 3, 10.6, 10.4, hair);
  blobG(g, hx, hy + 1, 9.3, 10.2, sk);
  for (i = -9; i <= 9; i++) {                                                                       // pelo sobre la frente: raya al costado, borde irregular
    var fy2 = hy - 8 + (abs(i) > 6 ? 3 : (abs(i) > 3 ? 1 : 0)) + ((i * 7 + 3) % 4 === 0 ? 1 : 0), yy4;
    var topY = Math.round(hy - 3 - 10.6 * Math.sqrt(Math.max(0, 1 - (i / 10.8) * (i / 10.8)))) + (abs(i) > 8 ? 1 : 0);
    for (yy4 = topY; yy4 <= fy2; yy4++) g.set(hx + i, yy4, yy4 < topY + 3 ? hair[2] : hair[1]);
  }
  for (i = -7; i <= 4; i++) g.set(hx + i, Math.round(hy - 3 - 10.6 * Math.sqrt(Math.max(0, 1 - (i / 10.8) * (i / 10.8)))) + 1, hair[3]);                      // brillo de gomina
  g.line(hx - 4, hy - 12, hx - 3, hy - 8, hair[0]);                                                  // la raya
  g.line(hx - 9, hy - 9, hx - 12, hy - 11, hair[2]); g.line(hx - 11, hy - 7, hx - 14, hy - 8, hair[1]); g.line(hx + 7, hy - 11, hx + 10, hy - 13, hair[2]);   // mechones sueltos
  g.line(hx + 4, hy - 8, hx + 6, hy - 5, hair[1]); g.set(hx + 6, hy - 4, hair[1]); g.set(hx + 5, hy - 5, hair[2]);                                      // rizo en la frente
  g.rect(hx - 8, hy + 3, 2, 2, sk[0]); g.rect(hx + 6, hy + 3, 2, 2, sk[0]); g.set(hx + 7, hy + 5, sk[0]);                                          // mejillas hundidas
  g.set(hx - 7, hy - 1, sk[3]); g.set(hx - 6, hy - 2, sk[3]);
  /* cejas y ojos con brillo */
  var br = P.brow || 'sad', eyesOp = P.eyes || 'open';
  [-1, 1].forEach(function (sd) {
    var ex = hx + sd * 4.4, ey = hy - 1;
    var inner = br === 'sad' ? -2 : (br === 'angry' ? 2 : 0);
    g.line(ex - sd * 3, ey - 4 + (br === 'sad' ? 1 : 0), ex + sd * 2, ey - 4 + (inner > 0 ? 1 : 0), hair[0]);
    g.line(ex - sd * 3, ey - 5 + (br === 'sad' ? 1 : 0), ex + sd * 2, ey - 5 + (inner > 0 ? 1 : 0), hair[1]);
    if (eyesOp === 'closed') { g.line(ex - 2, ey + 1, ex + 2, ey + 1, hair[0]); g.set(ex, ey + 2, sk[0]); }
    else if (eyesOp === 'x') { g.line(ex - 2, ey - 1, ex + 2, ey + 2, hair[0]); g.line(ex + 2, ey - 1, ex - 2, ey + 2, hair[0]); }
    else if (eyesOp === 'dim') { g.rect(Math.round(ex) - 2, ey, 5, 2, '#8a9a70'); g.rect(Math.round(ex) - 2, ey, 5, 1, sk[0]); g.set(Math.round(ex), ey + 1, '#3a4430'); }
    else {
      g.rect(Math.round(ex) - 3, ey - 1, 7, 5, '#a8c860'); g.rect(Math.round(ex) - 2, ey - 2, 5, 7, '#a8c860');                     // halo verde-amarillo
      g.rect(Math.round(ex) - 2, ey - 1, 5, 4, '#e6f4a0'); g.rect(Math.round(ex) - 1, ey, 3, 2, '#fbffd8'); g.set(Math.round(ex), ey + 1, '#2a3418');
      g.set(Math.round(ex) - 1, ey, '#ffffff');
    }
  });
  g.rect(hx - 1, hy + 1, 3, 3, sk[2]); g.set(hx - 1, hy + 1, sk[3]); g.set(hx + 1, hy + 3, sk[0]); g.set(hx, hy + 3, sk[1]);          // nariz
  /* bigote fino y boca */
  var my = hy + 7, mo = P.mouth || 'closed';
  g.line(hx - 7, my - 1, hx - 1, my - 2, hair[0]); g.line(hx + 1, my - 2, hx + 7, my - 1, hair[0]); g.set(hx - 8, my - 2, hair[1]); g.set(hx + 8, my - 2, hair[1]); g.set(hx, my - 2, hair[0]);
  if (mo === 'closed') { g.line(hx - 3, my + 1, hx + 3, my + 1, '#2a1214'); g.set(hx + 4, my, '#2a1214'); }
  else if (mo === 'sad') { g.line(hx - 3, my + 2, hx + 3, my + 2, '#2a1214'); g.set(hx - 4, my + 3, '#2a1214'); g.set(hx + 4, my + 3, '#2a1214'); }
  else if (mo === 'open') { g.rect(hx - 4, my, 9, 3, '#2a1214'); g.rect(hx - 3, my, 7, 1, '#f2eedc'); g.rect(hx - 2, my + 2, 5, 1, '#8a3a40'); }
  else if (mo === 'sing' || mo === 'shout') { g.rect(hx - 5, my, 11, 5, '#2a1214'); g.rect(hx - 4, my, 9, 1, '#f2eedc'); g.rect(hx - 3, my + 4, 7, 1, '#f2eedc'); g.rect(hx - 2, my + 3, 5, 1, '#a84a54'); }
  else if (mo === 'O') { g.rect(hx - 3, my, 7, 8, '#2a1214'); g.rect(hx - 2, my - 1, 5, 10, '#2a1214'); g.rect(hx - 2, my, 5, 1, '#f2eedc'); g.rect(hx - 1, my + 6, 3, 2, '#a84a54'); }
  else if (mo === 'gasp') { g.rect(hx - 4, my, 9, 6, '#2a1214'); g.rect(hx - 3, my, 7, 1, '#f2eedc'); g.rect(hx - 3, my + 3, 7, 3, '#b0505c'); g.rect(hx - 2, my + 6, 5, 2, '#b0505c'); }
  else if (mo === 'slack') { g.rect(hx - 3, my + 1, 6, 3, '#2a1214'); g.rect(hx - 2, my + 3, 4, 3, '#b0505c'); }
  if (P.sweat) { [[-12, -7], [13, -4], [-11, 3], [12, 5]].forEach(function (q, k) { var sx = hx + q[0], sy = hy + q[1] + ((P.sweat + k) % 2); g.set(sx, sy, '#bfe8ff'); g.set(sx, sy + 1, '#8fd0f0'); g.set(sx, sy - 1, '#ffffff'); }); }
  if (P.stars) { for (i = 0; i < 4; i++) { var an = P.stars + i * 1.5708, sx2 = hx + Math.cos(an) * 12, sy2 = hy - 15 + Math.sin(an) * 3; g.set(sx2, sy2, '#f2e63c'); g.set(sx2 + 1, sy2, '#f2e63c'); g.set(sx2, sy2 - 1, '#fff6a0'); g.set(sx2, sy2 + 1, '#fff6a0'); } }
  /* microfono pegado a la boca (cantando): cabeza por delante de la cara */
  if (M && M.late) {
    var bx2 = M.bx, by2 = CFY - (M.bu || 0), tx2 = M.tx, ty2 = CFY - M.tu;
    g.line(bx2, by2 - 3, tx2, ty2, J.mic[0]); g.line(bx2 + 1, by2 - 3, tx2 + 1, ty2, J.mic[2]);
    micHead(g, tx2 - 1, ty2 - 4, Math.atan2(tx2 - bx2, by2 - ty2));
  }
  /* brazos: hombro -> codo -> mano, manga blanca con puño celeste */
  [-1, 1].forEach(function (sd) {
    var A = P[sd < 0 ? 'aL' : 'aR'] || { h: [CCX + sd * 26, Y(24)] };
    var shx = cx + sd * 16.5, shy = Y(45), hx2 = A.h[0], hy2 = A.h[1];
    var J1 = ik2(shx, shy, hx2, hy2, 14, 13, 1), J2 = ik2(shx, shy, hx2, hy2, 14, 13, -1);
    var jt = (A.bend === undefined ? sd : A.bend), Je = (jt > 0) === (J1[0] > J2[0]) ? J1 : J2;
    blobG(g, shx, shy, 6.5, 6, J.jk);
    tubeG(g, shx, shy, Je[0], Je[1], 4.8, J.jk); tubeG(g, Je[0], Je[1], hx2, hy2, 4.2, J.jk);
    var ux = hx2 - Je[0], uy = hy2 - Je[1], L = Math.sqrt(ux * ux + uy * uy) || 1; ux /= L; uy /= L;
    g.disc(hx2 - ux * 3, hy2 - uy * 3, 3.9, J.sh[2]); g.disc(hx2 - ux * 3.6 - 0.5, hy2 - uy * 3.6 - 0.5, 3.0, J.sh[3]);                              // puño de la camisa
    if (A.hank) hankG(g, hx2, hy2, A.hank.ang, A.hank.len, A.hank.wave || 0, A.hank.w);
    var hxr = Math.round(hx2), hyr = Math.round(hy2);                                                                                                    // mano
    g.rect(hxr - 2, hyr - 2, 5, 5, sk[2]); g.rect(hxr - 2, hyr - 2, 5, 1, sk[3]); g.set(hxr - 2, hyr - 1, sk[3]); g.rect(hxr - 2, hyr + 2, 5, 1, sk[1]); g.rect(hxr + 2, hyr - 1, 1, 3, sk[1]);
    g.set(hxr - 1, hyr, sk[1]); g.set(hxr, hyr, sk[1]);
  });
  return g;
}
function jaranCv(P) { return fin(jaranG(P), CCX, CFY); }
function dustG(g, x, y, big) {                                                       // polvito del pisoton
  for (var k = -1; k <= 1; k += 2) { g.disc(x + k * (big ? 5 : 3), y - 1, 2.2, '#b8ae98'); g.disc(x + k * (big ? 5 : 3) - 0.5, y - 1.5, 1.2, '#dad2bc'); }
}
var MIC_IDLE = { bx: CCX + 28, bu: 0, tx: CCX + 28, tu: 60 };
function jaranPose(name, f) {
  var h = function (dx, u) { return [CCX + dx, CFY - u]; };
  var micR = h(27, 32);
  switch (name + f) {
    case 'idle0': return { mic: MIC_IDLE, aR: { h: micR, bend: 1 }, aL: { h: h(-24, 25), bend: -1, hank: { ang: 1.6, len: 12, wave: 0, w: 5 } } };
    case 'idle1': return { bel: 1, headDy: 1, mic: MIC_IDLE, aR: { h: h(27, 31), bend: 1 }, aL: { h: h(-24, 24), bend: -1, hank: { ang: 1.7, len: 12, wave: 1.2, w: 5 } }, mouth: 'closed' };
    case 'canta0': return { headDy: -1, brow: 'sad', eyes: 'closed', mouth: 'sing', mic: { bx: CCX + 26, bu: 0, tx: CCX + 11, tu: 55, late: 1 }, aR: { h: h(20, 34), bend: 1 }, aL: { h: h(-32, 47), bend: -1, hank: { ang: -0.9, len: 10, wave: 0 } } };
    case 'canta1': return { headDy: 0, brow: 'sad', eyes: 'closed', mouth: 'open', mic: { bx: CCX + 26, bu: 0, tx: CCX + 11, tu: 55, late: 1 }, aR: { h: h(20, 35), bend: 1 }, aL: { h: h(-30, 56), bend: -1, hank: { ang: -1.2, len: 10, wave: 1.5 } } };
    case 'canta2': return { headDy: 1, brow: 'sad', eyes: 'closed', mouth: 'sing', mic: { bx: CCX + 26, bu: 0, tx: CCX + 11, tu: 54, late: 1 }, aR: { h: h(20, 33), bend: 1 }, aL: { h: h(-7, 40), bend: -1 } };
    case 'pregon0': return { headDy: -1, brow: 'angry', mouth: 'open', mic: MIC_IDLE, aR: { h: micR, bend: 1 }, aL: { h: h(-22, 66), bend: -1 } };
    case 'pregon1': return { headDy: 0, brow: 'sad', eyes: 'closed', mouth: 'sing', mic: MIC_IDLE, aR: { h: micR, bend: 1 }, aL: { h: h(-33, 44), bend: -1, hank: { ang: 2.4, len: 9, wave: 0.6 } } };
    case 'notas0': return { bel: 2, brow: 'angry', mouth: 'gasp', mic: { bx: CCX + 38, bu: 0, tx: CCX + 38, tu: 58 }, aR: { h: h(32, 30), bend: 1 }, aL: { h: h(-32, 30), bend: -1 } };
    case 'notas1': return { headDy: -1, brow: 'angry', mouth: 'sing', mic: { bx: CCX + 38, bu: 0, tx: CCX + 38, tu: 58 }, aR: { h: h(37, 58), bend: 1 }, aL: { h: h(-36, 58), bend: -1 } };
    case 'panuelo0': return { lean: 1, brow: 'angry', mouth: 'open', mic: { bx: CCX + 38, bu: 0, tx: CCX + 38, tu: 58 }, aR: { h: h(14, 28), bend: 1 }, aL: { h: h(-33, 60), bend: -1, hank: { ang: -2.2, len: 24, wave: 0.2, w: 7 } } };
    case 'panuelo1': return { brow: 'angry', mouth: 'sing', mic: { bx: CCX + 38, bu: 0, tx: CCX + 38, tu: 58 }, aR: { h: h(14, 28), bend: 1 }, aL: { h: h(-8, 40), bend: -1, hank: { ang: -0.1, len: 34, wave: 0.8, w: 8 } } };
    case 'panuelo2': return { lean: -1, brow: 'angry', mouth: 'open', mic: { bx: CCX + 38, bu: 0, tx: CCX + 38, tu: 58 }, aR: { h: h(14, 28), bend: 1 }, aL: { h: h(30, 34), bend: -1, hank: { ang: 0.55, len: 24, wave: 1.6, w: 7 } } };
    case 'zapateo0': return { brow: 'angry', mouth: 'shout', mic: MIC_IDLE, legs: { R: { dx: 5, u: 11 } }, aR: { h: micR, bend: 1 }, aL: { h: h(-30, 44), bend: -1 } };
    case 'zapateo1': return { sq: 4, bel: 1, brow: 'angry', mouth: 'open', mic: MIC_IDLE, legs: { L: { dx: -4 }, R: { dx: 4 } }, aR: { h: h(27, 29), bend: 1 }, aL: { h: h(-34, 34), bend: -1 } };
    case 'zapateo2': return { sq: 1, brow: 'angry', mouth: 'open', mic: MIC_IDLE, legs: { L: { dx: -2 }, R: { dx: 2 } }, aR: { h: micR, bend: 1 }, aL: { h: h(-30, 38), bend: -1 } };
    case 'sostenida0': return { headDy: -3, brow: 'sad', eyes: 'closed', mouth: 'O', mic: { bx: CCX + 27, bu: 0, tx: CCX + 12, tu: 58, late: 1 }, aR: { h: h(19, 36), bend: 1 }, aL: { h: h(-35, 52), bend: -1, hank: { ang: -0.4, len: 10, wave: 0.4 } } };
    case 'sostenida1': return { headDy: -2, bel: 1, brow: 'sad', eyes: 'closed', mouth: 'O', mic: { bx: CCX + 27, bu: 0, tx: CCX + 12, tu: 59, late: 1 }, aR: { h: h(19, 36), bend: 1 }, aL: { h: h(-37, 55), bend: -1, hank: { ang: -0.7, len: 10, wave: 1.4 } } };
    case 'sinAire0': return { sq: 8, headDy: 5, headDx: 2, lean: 2, brow: 'sad', mouth: 'gasp', sweat: 1, mic: { bx: CCX + 38, bu: 0, tx: CCX + 38, tu: 58 }, aR: { h: h(15, 15), bend: 1 }, aL: { h: h(-13, 15), bend: -1 } };
    case 'sinAire1': return { sq: 9, headDy: 6, headDx: 2, lean: 2, bel: 1, brow: 'sad', mouth: 'gasp', sweat: 2, mic: { bx: CCX + 38, bu: 0, tx: CCX + 38, tu: 58 }, aR: { h: h(15, 14), bend: 1 }, aL: { h: h(-13, 14), bend: -1 } };
    case 'aturdido0': return { headDx: -2, headDy: 1, lean: -1, brow: 'sad', eyes: 'x', mouth: 'slack', stars: 0.3, mic: { bx: CCX + 30, bu: 0, tx: CCX + 34, tu: 56 }, aR: { h: h(27, 29), bend: 1 }, aL: { h: h(-24, 24), bend: -1 } };
    case 'aturdido1': return { headDx: 2, headDy: 1, lean: 1, brow: 'sad', eyes: 'x', mouth: 'slack', stars: 1.1, mic: { bx: CCX + 30, bu: 0, tx: CCX + 26, tu: 57 }, aR: { h: h(27, 30), bend: 1 }, aL: { h: h(-24, 25), bend: -1 } };
    case 'sentado0': return { sq: 9, headDy: 4, brow: 'sad', eyes: 'dim', mouth: 'sad', aR: { h: h(14, 16), bend: 1 }, aL: { h: h(-14, 16), bend: -1 } };
    default: return {};
  }
}
function buildJaranon() {
  var C = {};
  function mk(n, i) { return jaranCv(jaranPose(n, i)); }
  C.idle = [mk('idle', 0), mk('idle', 1)];
  C.canta = [mk('canta', 0), mk('canta', 1), mk('canta', 2)];
  C.pregon = [mk('pregon', 0), mk('pregon', 1)];
  C.notas = [mk('notas', 0), mk('notas', 1)];
  C.panuelo = [mk('panuelo', 0), mk('panuelo', 1), mk('panuelo', 2)];
  /* zapateo: el cuadro 1 es el pisoton, con polvo a los lados */
  C.zapateo = [mk('zapateo', 0),
    (function () { var g = jaranG(jaranPose('zapateo', 1)); dustG(g, CCX - 16, CFY - 1, true); dustG(g, CCX + 16, CFY - 1, true); return fin(g, CCX, CFY); })(),
    mk('zapateo', 2)];
  C.sostenida = [mk('sostenida', 0), mk('sostenida', 1)];
  C.sinAire = [mk('sinAire', 0), mk('sinAire', 1)];
  C.aturdido = [mk('aturdido', 0), mk('aturdido', 1)];
  C.hurt = (function () { var g = jaranG(jaranPose('idle', 0)); g.outline(); return flatC(g.solid('#ffffff'), CCX, CFY); })();
  C.sentado = mk('sentado', 0);
  return C;
}
lazy(PJ, 'jaranon', buildJaranon);


/* ======================== ICONOS DE MOCHILA (12x12 @6,11 + .big 24x24 @12,22) ======================== */
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
  function bottleIcon(d, s, Gl, lab, cap, gold) {                 // botella de cerveza: cuello largo, hombros, etiqueta y tapa corona
    d.R(4.0, 3.4, 2.4, 6.0, Gl[2]); d.R(4.0, 3.4, 0.8, 6.0, Gl[3]); d.R(5.6, 3.4, 0.8, 6.0, Gl[1]); d.R(4.0, 9.0, 2.4, 0.6, Gl[0]);
    d.R(4.4, 1.2, 1.6, 2.4, Gl[2]); d.R(4.4, 1.2, 0.6, 2.4, Gl[3]); d.R(5.6, 1.2, 0.4, 2.4, Gl[1]);
    d.R(4.2, 2.8, 2.0, 0.8, Gl[2]); d.R(3.8, 3.4, 2.8, 0.8, Gl[2]);
    d.R(4.2, 0.4, 2.0, 1.0, cap); d.R(4.2, 0.4, 2.0, 0.4, '#ffffff55');
    d.R(4.0, 5.6, 2.4, 2.2, lab); d.R(4.0, 5.6, 2.4, 0.4, '#ffffff'); d.R(4.4, 6.4, 1.6, 0.5, gold ? '#8a5a08' : '#7a1a14');
    if (gold) { d.px(3.6, 2.0, '#ffffff'); d.px(6.8, 4.4, '#fff8c8'); d.px(3.2, 7.4, '#fff8c8'); d.px(6.6, 8.4, '#ffffff'); }
    if (s === 2) { d.px(4.2, 4.0, '#ffffff'); d.px(4.2, 4.6, Gl[3]); d.px(4.4, 8.2, Gl[3]); d.px(5.0, 2.0, Gl[3]); }
  }
  var ITEMS = {
    cajon: function (d, s) {                                      // cajon peruano: caja de madera clara, tapa frontal con 4 tornillos, boca redonda a un costado
      var W = ['#5a3416', '#8a5a2c', '#c08a4a', '#e8b878'];
      d.R(1.0, 3.6, 6.6, 5.6, W[2]); d.R(1.0, 3.6, 6.6, 0.8, W[3]); d.R(1.0, 3.6, 0.8, 5.6, W[3]); d.R(1.0, 8.6, 6.6, 0.6, W[1]);
      d.R(1.9, 1.4, 6.8, 2.2, W[3]); d.R(1.9, 1.4, 6.8, 0.6, '#fff0c8'); d.R(7.6, 3.6, 1.2, 5.0, W[1]); d.R(7.6, 3.6, 1.2, 0.8, W[2]);
      d.R(7.6, 1.8, 1.2, 1.8, W[2]);
      d.px(2.0, 4.6, W[0]); d.px(6.6, 4.6, W[0]); d.px(2.0, 7.8, W[0]); d.px(6.6, 7.8, W[0]);
      d.R(1.8, 3.9, 5.0, 0.7, W[0]);                              // tapa de pino mas oscura
      d.E(4.3, 6.2, 1.1, 1.1, '#2a1608'); d.px(3.8, 5.7, W[1]);
      if (s === 2) { d.px(1.8, 5.8, W[3]); d.px(3.0, 8.1, W[0]); d.px(5.6, 8.0, W[1]); d.px(2.6, 2.4, '#ffffff'); d.R(2.4, 6.6, 0.5, 1.6, W[1]); d.R(6.0, 5.0, 0.5, 3.4, W[1]); }
    },
    botella: function (d, s) { bottleIcon(d, s, ['#0e3a1c', '#1c6a34', '#2e9a4a', '#8ae09a'], '#e8dcb0', '#d83a2c', false); },
    botellaDorada: function (d, s) { bottleIcon(d, s, ['#8a5a08', '#c88c10', '#f2c838', '#fff2a8'], '#fff4d0', '#a02a1c', true); },
    packBotellas: function (d, s) {                               // tres botellas en una caja-asa de carton
      var G1 = ['#0e3a1c', '#1c6a34', '#2e9a4a', '#8ae09a'], Kf = ['#6a4a22', '#a07a40', '#c8a062', '#e8c88a'];
      [[1.6, 1.8], [4.0, 0.6], [6.4, 1.8]].forEach(function (p, i) {
        var x = p[0], y = p[1];
        d.R(x + 0.6, y + 3.0, 1.8, 5.8, G1[2]); d.R(x + 0.6, y + 3.0, 0.6, 5.8, G1[3]); d.R(x + 2.0, y + 3.0, 0.4, 5.8, G1[1]);
        d.R(x + 1.0, y + 0.8, 1.0, 2.4, G1[2]); d.R(x + 1.0, y + 0.8, 0.4, 2.4, G1[3]); d.R(x + 0.9, y + 0.4, 1.2, 0.6, '#f2c838');
        d.R(x + 0.6, y + 5.4, 1.8, 1.8, '#e8dcb0');
      });
      d.R(0.8, 6.0, 8.4, 3.2, Kf[2]); d.R(0.8, 6.0, 8.4, 0.6, Kf[3]); d.R(0.8, 8.6, 8.4, 0.6, Kf[1]); d.R(0.8, 6.0, 0.6, 3.2, Kf[3]); d.R(8.6, 6.0, 0.6, 3.2, Kf[1]);
      d.R(3.6, 4.4, 2.8, 0.6, Kf[1]); d.R(3.6, 4.4, 0.6, 1.8, Kf[1]); d.R(5.8, 4.4, 0.6, 1.8, Kf[1]);
      d.R(1.8, 6.8, 2.0, 1.2, '#d83a2c');
      if (s === 2) { d.px(2.0, 1.6, '#ffffff'); d.px(4.6, 0.4, '#ffffff'); d.px(7.0, 1.6, '#ffffff'); d.px(5.0, 7.6, Kf[0]); }
    },
    anticucho: function (d, s) {                                  // palito con 4 trozos de corazon bien dorados, papa y aji
      d.L(0.8, 9.0, 9.2, 1.2, '#c99458', 0.7); d.L(1.0, 8.8, 9.4, 1.0, '#e0b878', 0.4);
      var M = ['#2a1208', '#5a2a14', '#8a4a24', '#c0763a'], pts = [[2.4, 7.4], [4.2, 5.6], [6.0, 3.8], [7.6, 2.4]];
      pts.forEach(function (p, i) { d.blob(p[0], p[1], 1.9, 1.7, i === 1 ? ['#6a4a1c', '#a8782a', '#d8a850', '#f6dc8c'] : M); });
      d.px(3.0, 6.6, '#1a0a04'); d.px(5.0, 4.8, '#1a0a04'); d.px(6.6, 3.0, '#1a0a04'); d.px(8.0, 2.0, '#fff0d0');
      d.px(2.2, 7.2, '#e8742a'); d.px(6.6, 4.4, '#e8742a');
      if (s === 2) { d.px(3.4, 5.4, '#e0a060'); d.px(4.6, 5.0, '#f6dc8c'); d.px(7.0, 2.6, '#e0a060'); d.px(8.8, 0.6, '#d8d4c8'); d.px(9.4, 0.0, '#d8d4c8'); d.px(1.0, 8.0, '#a07a40'); }
    },
    picarones: function (d, s) {                                  // tres anillos fritos y dorados con miel de chancaca
      d.blob(5, 8.4, 4.8, 1.5, ['#8a887e', '#b8b4a2', '#e8e4d4', '#fbf8ec']);
      var Q = ['#8a4a10', '#c27a1c', '#e8a838', '#ffd87a'];
      [[2.6, 6.8], [6.6, 6.8], [4.6, 4.6]].forEach(function (p) { d.blob(p[0], p[1], 2.3, 1.9, Q); d.E(p[0], p[1] + 0.2, 0.9, 0.7, '#4a2408'); });
      d.R(2.0, 3.8, 5.4, 0.8, '#6a2a0a'); d.px(3.4, 4.6, '#6a2a0a'); d.px(6.0, 4.6, '#6a2a0a'); d.px(4.6, 2.8, '#6a2a0a');   // miel
      d.px(3.0, 6.0, Q[3]); d.px(7.0, 6.0, Q[3]); d.px(5.0, 3.8, Q[3]);
      if (s === 2) { d.px(1.6, 6.6, Q[0]); d.px(8.2, 7.2, Q[0]); d.px(4.0, 7.8, '#6a2a0a'); d.px(6.0, 3.0, '#ffe8a8'); d.px(5.4, 1.8, '#d8d4c8'); d.px(4.6, 1.0, '#d8d4c8'); }
    },
    pescadoFrito: function (d, s) {                                 // pescado entero frito sobre un plato, con limon y cebolla
      d.blob(5, 7.8, 4.9, 1.9, ['#8a887e', '#b8b4a2', '#e8e4d4', '#fbf8ec']); d.E(5, 7.5, 3.8, 1.2, '#d4d0c2');
      var F = ['#7a4210', '#b8741c', '#e0a02c', '#ffd668'];
      d.blob(5, 5.8, 3.9, 1.8, F);
      d.R(8.3, 4.6, 1.2, 0.8, F[1]); d.R(8.8, 4.2, 1.0, 1.0, F[2]); d.R(8.8, 6.2, 1.0, 1.0, F[2]); d.R(9.2, 4.6, 0.6, 2.2, F[1]);       // cola
      d.E(2.6, 5.4, 0.55, 0.55, '#2a1a10'); d.px(2.5, 5.3, '#ffffff'); d.R(3.4, 4.2, 4.0, 0.6, F[3]);
      d.L(3.8, 6.0, 6.8, 5.2, F[0], 0.4); d.px(4.6, 5.6, F[3]); d.px(5.6, 5.4, F[3]);
      d.blob(2.0, 8.0, 1.5, 1.0, ['#8a8a08', '#c8d020', '#f0f060', '#fffcb0']); d.px(1.4, 7.8, '#ffffff');
      d.R(7.4, 7.6, 1.6, 0.6, '#c860a0');
      if (s === 2) { d.px(4.2, 4.4, '#fff0b0'); d.px(6.0, 4.6, '#fff0b0'); d.px(7.0, 5.4, F[0]); d.px(5.0, 7.0, F[0]); d.px(5.2, 2.4, '#d8d4c8'); d.px(6.0, 1.6, '#d8d4c8'); }
    },
    emoliente: function (d, s) {                                    // vaso de emoliente caliente: bebida ambar, linaza, rodaja de limon y vapor
      for (var i = 0; i < 7; i++) d.R(2.2 + i * 0.1, 2.6 + i * 0.95, 5.6 - i * 0.2, 1.1, i < 1 ? '#f0f4f8' : (i < 2 ? '#c9d4dc' : '#b87a28'));
      d.R(2.2, 2.6, 5.6, 0.6, '#f0f4f8'); d.R(2.7, 3.4, 4.6, 5.0, '#c4902c'); d.R(2.7, 3.4, 0.9, 5.0, '#e6b858'); d.R(6.5, 3.4, 0.8, 5.0, '#8a5a14'); d.R(2.7, 7.8, 4.6, 0.7, '#5a3408');
      d.px(4.2, 5.0, '#f2e0a0'); d.px(5.4, 6.2, '#f2e0a0'); d.px(4.6, 7.0, '#e8d080');
      d.E(7.2, 2.6, 1.2, 1.2, '#f2e63c'); d.E(7.2, 2.6, 0.6, 0.6, '#fffbd0');
      d.L(3.6, 2.0, 4.2, 0.4, '#dcdcdc', 0.5); d.L(5.4, 2.2, 5.0, 0.2, '#e8e8e8', 0.5);
      if (s === 2) { d.px(3.2, 3.8, '#ffffff'); d.px(3.2, 4.4, '#ffffff'); d.px(4.0, 1.2, '#f4f4f4'); d.px(4.4, 0.4, '#dcdcdc'); d.px(5.2, 1.2, '#f4f4f4'); d.px(5.0, 8.0, '#3a2008'); }
    },
    cuaderno: function (d, s) {                                     // cuaderno de poemas: tapa granate con lomo espiral, hojas amarillas y cinta
      var R_ = ['#4a0a10', '#7a1420', '#a82030', '#d4404c'];
      d.R(1.8, 1.0, 6.6, 8.4, R_[2]); d.R(1.8, 1.0, 6.6, 0.7, R_[3]); d.R(1.8, 1.0, 0.7, 8.4, R_[3]); d.R(7.7, 1.0, 0.7, 8.4, R_[1]); d.R(1.8, 8.7, 6.6, 0.7, R_[0]);
      d.R(8.4, 1.6, 0.9, 7.4, '#f2e8c0'); d.R(8.4, 1.6, 0.9, 0.5, '#fff8e0'); d.R(8.4, 8.4, 0.9, 0.6, '#c8b888');
      for (var i = 0; i < 4; i++) { d.px(1.2, 2.0 + i * 1.7, '#c9c5b5'); d.px(1.9, 2.0 + i * 1.7, '#8a887e'); }
      d.R(3.2, 2.8, 3.8, 3.0, '#f2d86a'); d.R(3.2, 2.8, 3.8, 0.5, '#fff0a0'); d.R(3.2, 5.3, 3.8, 0.5, '#c8a830');
      d.px(4.0, 3.8, R_[0]); d.px(4.8, 4.2, R_[0]); d.px(5.6, 3.8, R_[0]);
      d.R(5.2, 8.0, 0.8, 2.0, '#2aa860'); d.px(5.2, 10.0, '#1a6a38');
      if (s === 2) { d.px(2.4, 2.0, '#ffffff'); d.px(7.4, 8.2, R_[0]); d.px(3.0, 7.0, R_[3]); d.px(5.0, 4.8, R_[0]); d.px(6.4, 4.6, R_[0]); }
    }
  };
  ITEMS.chichaMorada = function (d, s) {                          // vaso alto de chicha morada con limon y sorbete (solo se usa si Costa Verde no trae el suyo)
    for (var i = 0; i < 8; i++) d.R(2.5 + i * 0.1, 1.8 + i * 0.95, 5.0 - i * 0.2, 1.1, i < 1 ? "#f0f4f8" : (i < 2 ? "#c9d4dc" : "#7a1a8a"));
    d.R(2.5, 1.8, 5.0, 0.6, "#f0f4f8"); d.R(2.9, 2.6, 4.2, 6.2, "#7a1a8a"); d.R(2.9, 2.6, 0.9, 6.2, "#b85ab8"); d.R(6.4, 2.6, 0.7, 6.2, "#4a0a5a"); d.R(2.9, 8.2, 4.2, 0.7, "#2a0a3a");
    d.E(7.4, 1.9, 1.2, 1.2, "#f2e63c"); d.E(7.4, 1.9, 0.6, 0.6, "#fffbd0"); d.L(5.4, 4.6, 6.8, -0.2, "#ff5aa8", 0.7);
    if (s === 2) { d.px(3.4, 3.0, "#ffffff"); d.px(3.4, 3.6, "#ffffff"); d.px(5.4, 4.6, "#e8b0e8"); }
  };
  PJ.items = PJ.items || {};
  S.items = S.items || {};
  Object.keys(ITEMS).forEach(function (id) {
    if (id === "chichaMorada") return;
    lazy(PJ.items, id, function () { var c = mkIcon(ITEMS[id]); if (!S.items[id]) S.items[id] = c; return c; });
    lazy(PJ, id, function () { return PJ.items[id]; });
  });
  /* chicha morada: si Costa Verde ya trae el vaso (clave `chicha`) se reusa el mismo lienzo; si no, el propio */
  lazy(PJ.items, "chichaMorada", function () {
    var c = (S.cv && S.cv.pj && S.cv.pj.chicha) || (S.items && (S.items.chichaMorada || S.items.chicha)) || mkIcon(ITEMS.chichaMorada);
    if (!S.items.chichaMorada) S.items.chichaMorada = c;
    return c;
  });
  lazy(PJ, "chichaMorada", function () { return PJ.items.chichaMorada; });
});


/* ======================== ATAQUES DEL JEFE: notas, onda, cono de la nota sostenida ======================== */
function colA(h, a) { var r = px.hex2rgb(h); return (((a & 255) << 24) | (r[2] << 16) | (r[1] << 8) | r[0]) >>> 0; }
var GOLD = ['#8a5a08', '#c88c10', '#f2c838', '#fff0a0'];
function noteG(v) {                                                   // 3 notitas doradas: corchea, dos corcheas ligadas y negra grande con destellos
  var g = new G(18, 20), i;
  function head(cx, cy, rx, ry) { blobG(g, cx, cy, rx, ry, GOLD); }
  if (v === 0) { head(6, 15, 3.4, 2.5); g.rect(9, 3, 2, 12, GOLD[2]); g.rect(9, 3, 1, 12, GOLD[3]); g.rect(10, 3, 1, 12, GOLD[1]); g.line(11, 3, 15, 7, GOLD[2]); g.line(11, 4, 15, 8, GOLD[1]); g.line(11, 5, 14, 9, GOLD[1]); g.set(15, 8, GOLD[0]); }
  else if (v === 1) { head(4, 16, 3.2, 2.4); head(12, 14, 3.2, 2.4); g.rect(6, 4, 2, 12, GOLD[2]); g.rect(14, 2, 2, 12, GOLD[2]); g.rect(6, 4, 1, 12, GOLD[3]); g.rect(14, 2, 1, 12, GOLD[3]); for (i = 0; i < 3; i++) g.line(6, 4 + i, 15, 2 + i, i === 0 ? GOLD[3] : GOLD[2]); g.line(6, 7, 15, 5, GOLD[1]); }
  else { head(7, 15, 4.2, 3.2); g.rect(11, 2, 2, 13, GOLD[2]); g.rect(11, 2, 1, 13, GOLD[3]); g.rect(12, 2, 1, 13, GOLD[1]); g.set(2, 3, '#ffffff'); g.set(1, 3, GOLD[3]); g.set(2, 2, GOLD[3]); g.set(2, 4, GOLD[3]); g.set(15, 12, '#ffffff'); g.set(16, 12, GOLD[3]); g.set(15, 11, GOLD[3]); g.set(15, 13, GOLD[3]); }
  return fin(g, 9, 10);
}
lazy(PJ, 'nota', function () { return [noteG(0), noteG(1), noteG(2)]; });
safe('notitas', function () {                                         // notitas chicas para los musicos callejeros (2 cuadros para titilar)
  lazy(PJ, 'notitas', function () {
    return [0, 1].map(function (k) {
      var g = new G(10, 12), c = k ? '#a8e8ff' : GOLD[2];
      g.disc(3, 9, 2.2, c); g.rect(5, 2, 1, 8, c); g.line(5, 2, 8, 5 + k, c); g.set(2, 8, '#ffffff');
      return fin(g, 5, 6);
    });
  });
});
function ringBuf(W, H, cx, cy, rx, ry, thick, inner) {                // anillo de pixeles translucido (elipse), sin contorno
  var b = new Buf(W, H), x, y;
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry, r = Math.sqrt(dx * dx + dy * dy) * rx;       // radio en pixeles (sobre el eje x)
    var k = r - (rx - thick);
    if (k >= 0 && k <= thick) b.d[y * W + x] = colA(k < thick * 0.34 ? '#fff6b8' : (k < thick * 0.7 ? '#f2c838' : '#c88c10'), 220 - Math.round(k * 20));
    else if (inner && r < rx - thick && r > rx - thick - 6) b.d[y * W + x] = colA('#f2c838', 36);
    else if (inner && r < rx - thick) b.d[y * W + x] = colA('#f2c838', 14);
  }
  return b;
}
lazy(PJ, 'onda', function () { return ringBuf(96, 96, 47.5, 47.5, 47, 47, 4, true).toCanvas(48, 48); });
function lazyOndaSuelo() { return ringBuf(96, 48, 47.5, 23.5, 47, 23.5, 3, true).toCanvas(48, 24); }
lazy(PJ, 'ondaSuelo', lazyOndaSuelo);
lazy(PJ, 'conoSostenida', function () {                               // cono de sonido de 50 grados, 124x104, el vertice en (0,52) mira a la derecha; arcos de onda cada 16 px
  var W = 124, H = 104, b = new Buf(W, H), x, y, half = 25 * PI / 180;
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
    var dx = x + 0.5, dy = y - 52 + 0.5, r = Math.sqrt(dx * dx + dy * dy), a = Math.atan2(dy, dx);
    if (r > 120 || r < 6 || abs(a) > half) continue;
    var fade = 1 - r / 150, edge = (half - abs(a)) * r < 1.6, band = (r % 16) < 2;
    var al = Math.round((band ? 190 : 52) * fade + (edge ? 100 : 0));
    b.d[y * W + x] = colA(band ? '#fff0a0' : (edge ? '#f2c838' : '#f2c838'), Math.min(230, al));
  }
  return b.toCanvas(0, 52);
});

/* ======================== PROPS: caballete, brochazo, mancha, letras, charco, vidrios, botellas en vuelo, cajon suelto ======================== */
function easelG(broken) {                                             // caballete de madera con un lienzo: un atardecer en el mar, muy mal pintado
  var g = new G(32, 44), W = ['#4a2e18', '#6b4223', '#a06a36', '#c99458'], i;
  if (!broken) {
    g.line(16, 6, 6, 41, W[1]); g.line(17, 6, 7, 41, W[2]); g.line(16, 6, 26, 41, W[1]); g.line(15, 6, 25, 41, W[2]); g.line(16, 12, 16, 40, W[1]);
    g.rect(14, 3, 5, 3, W[3]); g.rect(14, 3, 5, 1, '#e0b878');
    g.rect(5, 26, 22, 2, W[2]); g.rect(5, 26, 22, 1, W[3]); g.rect(5, 28, 22, 1, W[0]);
    g.rect(6, 7, 20, 18, '#f4efe0'); g.rect(6, 7, 20, 1, '#ffffff'); g.rect(25, 7, 1, 18, '#c9c1a8'); g.rect(6, 24, 20, 1, '#c9c1a8');
    g.rect(7, 8, 18, 6, '#e8a850'); g.rect(7, 8, 18, 2, '#f2c870'); g.rect(7, 14, 18, 9, '#2a6a8a'); g.rect(7, 14, 18, 1, '#8ac8d8');
    g.disc(16, 14, 3.6, '#e8382c'); g.rect(7, 14, 18, 1, '#8ac8d8');
    for (i = 0; i < 4; i++) g.line(9 + i * 4, 16 + (i % 2), 11 + i * 4, 16 + (i % 2), '#8ac8d8');
    g.set(8, 12, '#d8d2c0'); g.set(22, 10, '#d8d2c0'); g.set(23, 10, '#d8d2c0');
    g.set(8, 22, '#c8302c'); g.set(24, 21, '#2aa860');                // salpicaduras
    g.rect(13, 25, 2, 1, '#e8382c'); g.rect(19, 25, 2, 1, '#2a62d0');
  } else {                                                           // roto: patas separadas y el lienzo rajado en el piso
    g.line(7, 42, 12, 28, W[1]); g.line(8, 42, 13, 28, W[2]); g.line(28, 43, 20, 30, W[1]); g.line(27, 43, 19, 30, W[2]);
    g.rect(2, 34, 28, 6, '#f4efe0'); g.rect(2, 34, 28, 1, '#ffffff'); g.rect(2, 39, 28, 1, '#c9c1a8');
    g.rect(3, 35, 12, 3, '#e8a850'); g.rect(15, 35, 13, 4, '#2a6a8a'); g.disc(9, 36, 2, '#e8382c');
    g.line(15, 34, 17, 40, '#141216'); g.line(16, 34, 18, 40, '#141216'); g.line(14, 34, 14, 40, '#2a2430');
    g.rect(22, 33, 6, 2, W[3]); g.set(26, 40, '#2a62d0'); g.set(5, 40, '#c8302c'); g.set(4, 41, '#2aa860'); g.set(29, 41, '#e8382c');
  }
  return g;
}
lazy(PJ, 'caballete', function () { var c = fin(easelG(false), 16, 41, 18, 8); c.tall = true; c.broken = fin(easelG(true), 16, 41, 18, 8); return c; });
var PAINT = ['#e8382c', '#2a62d0', '#f2c81c', '#2aa860'];
function blobPaint(k, fr) {                                          // brochazo en vuelo: grumo de pintura con goterones y un rastro de pelos de pincel
  var g = new G(18, 14), P_ = [px.shade(PAINT[k], 0.5), px.shade(PAINT[k], 0.75), PAINT[k], px.mix(PAINT[k], '#ffffff', 0.45)];
  blobG(g, 10, 7, 5.2 - fr * 0.4, 4.2 + fr * 0.4, P_); blobG(g, 4, 7 + (fr ? -1 : 1), 2.6, 1.8, P_);
  g.set(8, 3, P_[2]); g.set(7, 2, P_[3]); g.set(13, 11, P_[1]); g.set(15, 9 + fr, P_[2]); g.set(15, 5 - fr, P_[2]); g.set(1, 6, P_[1]); g.set(0, 8, P_[1]);
  g.set(8, 5, '#ffffff'); g.set(9, 5, P_[3]);
  return fin(g, 9, 7);
}
lazy(PJ, 'brochazo', function () {
  var base = blobPaint(1, 0); base.alt = blobPaint(1, 1);
  base.colores = [0, 1, 2, 3].map(function (k) { var c = blobPaint(k, 0); c.alt = blobPaint(k, 1); return c; });
  return base;
});
function splatBuf(k, v) {                                            // mancha de pintura en el piso: translucida, sin contorno negro, con borde mas oscuro
  var b = new Buf(32, 18), P_ = [px.shade(PAINT[k], 0.55), px.shade(PAINT[k], 0.8), PAINT[k], px.mix(PAINT[k], '#ffffff', 0.4)], x, y;
  var spots = v ? [[16, 9, 11, 5.5], [6, 6, 3, 2.2], [27, 12, 3.4, 2], [22, 3, 2.4, 1.6], [5, 13, 2.2, 1.6]] : [[15, 9, 10.5, 5.8], [27, 6, 3, 2], [4, 7, 3.2, 2.2], [9, 15, 2.2, 1.4], [24, 15, 2.4, 1.6]];
  for (y = 0; y < 18; y++) for (x = 0; x < 32; x++) {
    var best = 9, i;
    for (i = 0; i < spots.length; i++) { var dx = (x - spots[i][0]) / spots[i][2], dy = (y - spots[i][1]) / spots[i][3], d2 = dx * dx + dy * dy; if (d2 < best) best = d2; }
    if (best <= 1) b.d[y * 32 + x] = colA(PAINT[k], best > 0.72 ? 150 : 205);
    if (best <= 1 && best > 0.72) b.d[y * 32 + x] = colA(px.shade(PAINT[k], 0.7), 190);
    if (best <= 0.12 && ((x * 3 + y) % 7 === 0)) b.d[y * 32 + x] = colA(px.mix(PAINT[k], '#ffffff', 0.4), 230);
  }
  return b;
}
lazy(PJ, 'mancha', function () { var c = splatBuf(1, 0).toCanvas(16, 9); c.v = [0, 1, 2, 3].map(function (k) { return splatBuf(k, k % 2).toCanvas(16, 9); }); return c; });
/* letras flotantes del poeta: A M O R (11x13 @5,6), en lila con brillo, tipo caligrafia de molde */
var LET = {
  A: ['..###..', '.#...#.', '#.....#', '#.....#', '#######', '#.....#', '#.....#'],
  M: ['#.....#', '##...##', '#.#.#.#', '#..#..#', '#.....#', '#.....#', '#.....#'],
  O: ['.#####.', '#.....#', '#.....#', '#.....#', '#.....#', '#.....#', '.#####.'],
  R: ['######.', '#.....#', '#.....#', '######.', '#..#...', '#...#..', '#....##']
};
lazy(PJ, 'letra', function () {
  return ['A', 'M', 'O', 'R'].map(function (ch, i) {
    var g = new G(13, 15), rows = LET[ch], x, y, L = ['#3a1a5a', '#7a3ab0', '#b06af0', '#e6c8ff'];
    for (y = 0; y < 7; y++) for (x = 0; x < 7; x++) if (rows[y].charAt(x) === '#') {
      g.set(3 + x, 3 + y * 1, L[2]);
      g.set(3 + x, 4 + y, L[2]); g.set(4 + x, 3 + y, L[2]); g.set(4 + x, 4 + y, L[1]);
    }
    for (y = 0; y < 9; y++) for (x = 0; x < 9; x++) if (g.get(3 + x, 3 + y) === L[2] && !g.get(2 + x, 2 + y)) g.set(3 + x, 3 + y, L[3]);
    g.set(1, 11, '#ffd75a'); g.set(11, 2, '#ffd75a'); g.set(11, 12, '#ffffff');
    return fin(g, 6, 8);
  });
});
/* charco de cerveza: 48x26 @24,13; 2 cuadros (.alt) que brillan; sin contorno, translucido */
function puddleBuf(k) {
  var b = new Buf(48, 26), x, y;
  for (y = 0; y < 26; y++) for (x = 0; x < 48; x++) {
    var dx = (x - 23.5) / 23, dy = (y - 12.5) / 11.6, wob = 1 + 0.04 * Math.sin(x * 0.7 + k * 2) + 0.03 * Math.sin(y * 1.3), r = Math.sqrt(dx * dx + dy * dy) / wob;
    if (r > 1) continue;
    var rim = r > 0.82, c = rim ? '#f0c040' : (r > 0.55 ? '#e0a830' : '#d09424'), al = rim ? 205 : 165;
    b.d[y * 48 + x] = colA(c, al);
  }
  [[16, 9], [30, 14], [24, 6], [12, 15]].forEach(function (s, i) { var xx = s[0] + (k ? (i % 2 ? 1 : -1) : 0), yy = s[1]; b.set(xx, yy, colA('#fff0b8', 230)); b.set(xx + 1, yy, colA('#fff0b8', 180)); b.set(xx, yy - 1, colA('#ffffff', 120)); });
  for (var q = 0; q < 6; q++) { var bx = 12 + ((q * 7 + k * 3) % 24), by = 6 + ((q * 5) % 13); b.set(bx, by, colA('#fffbe8', 235)); b.set(bx + 1, by, colA('#fffbe8', 170)); }   // espuma / burbujas
  return b;
}
lazy(PJ, 'charco', function () { var a = puddleBuf(0).toCanvas(24, 13); a.alt = puddleBuf(1).toCanvas(24, 13); return a; });
/* vidrios rotos: 3 variantes 18x12 @9,6, esquirlas verdes y claras con destellos */
lazy(PJ, 'vidrios', function () {
  var seeds = [[[3, 4, 4], [10, 3, 3], [8, 8, 4], [14, 7, 2], [5, 9, 2]], [[4, 3, 3], [9, 5, 4], [14, 3, 2], [6, 9, 3], [13, 9, 3]], [[3, 6, 3], [8, 3, 3], [12, 6, 4], [7, 9, 2], [15, 10, 2]]];
  return seeds.map(function (sd, v) {
    var b = new Buf(18, 12);
    sd.forEach(function (p, i) {
      var x0 = p[0], y0 = p[1], L = p[2], c = (i + v) % 3 === 0 ? '#bfe8c8' : ((i + v) % 3 === 1 ? '#5ab87a' : '#e8f4f0');
      for (var j = 0; j < L; j++) { b.set(x0 + j, y0 - (j >> 1), colA(c, 225)); b.set(x0 + j, y0 - (j >> 1) + 1, colA(c, 160)); }
      b.set(x0 + L - 1, y0 - ((L - 1) >> 1) - 1, colA('#ffffff', 245));
    });
    return b.toCanvas(9, 6);
  });
});
/* botella en vuelo: 8 giros de 22x22 @11,11; la dorada con destellos */
function bottleFlight(gold) {
  var g = new G(22, 22), Gl = gold ? ['#8a5a08', '#c88c10', '#f2c838', '#fff2a8'] : ['#0e3a1c', '#1c6a34', '#2e9a4a', '#8ae09a'];
  g.rect(9, 8, 4, 9, Gl[2]); g.rect(9, 8, 1, 9, Gl[3]); g.rect(12, 8, 1, 9, Gl[1]); g.rect(9, 16, 4, 1, Gl[0]);
  g.rect(10, 4, 2, 4, Gl[2]); g.rect(10, 4, 1, 4, Gl[3]); g.rect(11, 3, 2, 1, gold ? '#a02a1c' : '#d83a2c'); g.rect(10, 3, 3, 1, gold ? '#a02a1c' : '#d83a2c');
  g.rect(9, 11, 4, 3, gold ? '#fff4d0' : '#e8dcb0'); g.rect(10, 12, 2, 1, gold ? '#8a5a08' : '#7a1a14'); g.set(9, 7, Gl[2]); g.set(12, 7, Gl[2]);
  if (gold) { g.set(8, 9, '#ffffff'); g.set(14, 13, '#fff8c8'); }
  return g;
}
function bottleFrames(gold) {
  var base = bottleFlight(gold), fr = [];
  for (var k = 0; k < 8; k++) { var r = rotG(base, k * PI / 4, 11, 11); fr.push(fin(r, 11, 11)); }
  var o = fr[0]; o.frames = fr; return o;
}
lazy(PJ, 'botellaVuelo', function () { return bottleFrames(false); });
lazy(PJ, 'botellaDoradaVuelo', function () { return bottleFrames(true); });
/* cajon en el piso (para recoger): 26x20 @13,18, 3/4 con la boca de sonido */
lazy(PJ, 'cajonSuelo', function () {
  var g = new G(26, 20), W = ['#5a3416', '#8a5a2c', '#c08a4a', '#e8b878'];
  g.rect(2, 7, 17, 11, W[2]); g.rect(2, 7, 17, 2, W[3]); g.rect(2, 7, 2, 11, W[3]); g.rect(2, 16, 17, 2, W[1]);
  g.rect(19, 7, 5, 11, W[1]); g.rect(19, 7, 5, 2, W[2]);
  g.rect(5, 2, 17, 5, W[3]); g.rect(5, 2, 17, 1, '#fff0c8'); g.rect(20, 3, 3, 4, W[2]);
  g.rect(3, 9, 15, 1, W[0]); g.set(4, 12, W[0]); g.set(16, 12, W[0]); g.set(4, 16, W[0]); g.set(16, 16, W[0]);
  g.disc(10, 13, 3, '#2a1608'); g.disc(9.5, 12.5, 2, '#140a04'); g.set(8, 11, W[1]);
  g.line(8, 4, 19, 4, W[2]); g.set(7, 3, '#ffffff');
  return fin(g, 13, 18, 22, 8);
});


/* ======================== SOBREVIVIENTES (vivos, de frente): npc.<id> = { idle[4], habla[2] }, lienzo 44x50 @22,46 ======================== */
function rampHex(base, k) { return [px.shade(base, 0.5), px.shade(base, 0.76), base, px.mix(base, '#ffffff', k || 0.3)]; }
var PW_ = 44, PH_ = 50, PGY = 46, PCX_ = 22;
function skinR(base) { return rampHex(base, 0.28); }
function personG(o, f, hab) {
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
  var armL = o.armL || 'down', armR = hab !== undefined ? (hab === 0 ? (o.gestR || 'gest') : (o.armR || 'down')) : ((f === 2 && o.waveR !== false) ? 'wave' : (o.armR || 'down'));
  if (armL === 'down') { sleeve(cx - 10, ay, SL); g.rect(cx - 10, ay + SL, armW, 6 - SL + 1, SK[2]); g.rect(cx - 10, ay + SL, 1, 6 - SL + 1, SK[3]); hand(cx - 10, ay + 6); }
  else { sleeve(cx - 10, ay, 3); var hp = typeof o.armLHand === 'function' ? o.armLHand(f, hab) : o.armLHand; limbG(g, cx - 9, ay + 2, hp[0] + 1, hp[1] + 1, SK, 3); hand(hp[0], hp[1]); }
  if (armR === 'down') { sleeve(cx + 8, ay, SL); g.rect(cx + 8, ay + SL, armW, 6 - SL + 1, SK[2]); g.rect(cx + 10, ay + SL, 1, 6 - SL + 1, SK[1]); hand(cx + 8, ay + 6); }
  else if (armR === 'gest') { sleeve(cx + 8, ay, 3); limbG(g, cx + 10, ay + 2, cx + 14, ay + 1, SK, 3); hand(cx + 13, ay - 1); }
  else if (armR === 'wave') { sleeve(cx + 8, ay, 3); limbG(g, cx + 10, ay + 2, cx + 13, ay - 7, SK, 3); hand(cx + 12, ay - 9); }
  else { sleeve(cx + 8, ay, 3); var hq = typeof o.armRHand === 'function' ? o.armRHand(f, hab) : o.armRHand; limbG(g, cx + 9, ay + 2, hq[0] + 1, hq[1] + 1, SK, 3); hand(hq[0], hq[1]); }
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
  var talk = hab !== undefined ? hab === 0 : (f === 2 || f === 3);
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

function hairBun(g, cx, cy, H) { g.rect(cx - 5, cy - 5, 11, 3, H[2]); g.rect(cx - 4, cy - 6, 9, 1, H[2]); g.rect(cx - 5, cy - 5, 11, 1, H[3]); g.rect(cx - 5, cy - 3, 1, 3, H[1]); g.rect(cx + 5, cy - 3, 1, 3, H[1]); }
function guitarFront(g, cx, gy, neckDx, neckUp, WD, tilt) {          // guitarra criolla de frente sobre el regazo: dos curvas, boca y mastil que sube hacia un lado
  var ex = cx + neckDx, ey = gy - neckUp;
  g.line(cx - 2, gy - 6, ex, ey, '#2a1a10'); g.line(cx - 1, gy - 6, ex + 1, ey, '#4a3220'); g.line(cx - 3, gy - 6, ex - 1, ey, '#4a3220');
  g.rect(ex - 2, ey - 3, 4, 4, '#3a2418'); g.set(ex - 2, ey - 3, '#d8c8a0'); g.set(ex + 1, ey - 2, '#d8c8a0');
  blobG(g, cx, gy - 2, 7.2, 5.2, WD); blobG(g, cx - 1 + tilt, gy - 8, 5.0, 3.8, WD);
  g.disc(cx, gy - 3, 1.8, '#1a1010'); g.rect(cx - 3, gy + 1, 7, 1, '#2a1a10'); g.line(cx - 6, gy - 3, cx + 6, gy - 2, '#e8dcb8');
}
var SURV = {
  tomas: {                                                    // Don Tomas, viejo pescador: gorro de pescador, chompa azul marino, barba blanca, botas de jebe, cana de pescar y balde con pescado
    skin: skinR('#9a6a48'), shirt: rampHex('#2a4a6a'), pants: rampHex('#6a6034'), shoe: '#1a1a1e', hairC: ['#c8c8c0', '#f0f0ea'], longSleeve: true, waveR: true,
    armL: 'hold', armLHand: [PCX_ - 14, PGY - 12],
    back: function (g, f, bob, cx, GY) { g.line(cx + 12, GY - 1, cx + 17, GY - 47, '#6b4223'); g.line(cx + 13, GY - 1, cx + 18, GY - 47, '#a06a36'); g.line(cx + 17, GY - 47, cx + 22, GY - 44 + (f % 2), '#d8d2c0'); g.line(cx + 22, GY - 44 + (f % 2), cx + 21, GY - 34 + (f % 2), '#d8d2c0'); g.set(cx + 21, GY - 33 + (f % 2), '#c0c8d0'); g.set(cx + 20, GY - 32 + (f % 2), '#c0c8d0'); },
    shirtFn: function (g, ty0, cx, GY) { var y; for (y = ty0 + 2; y <= GY - 9; y += 3) g.rect(cx - 7, y, 15, 1, '#5a7a9a'); g.rect(cx - 7, ty0, 15, 1, '#4a6a8a'); },
    hair: function (g, cx, cy) {
      var H = rampHex('#d8c88a'); g.rect(cx - 5, cy - 8, 11, 4, H[2]); g.rect(cx - 4, cy - 9, 9, 1, H[3]); g.rect(cx - 5, cy - 8, 11, 1, H[3]); g.rect(cx - 5, cy - 5, 11, 1, '#4a3a20');
      g.rect(cx - 8, cy - 4, 17, 2, H[1]); g.rect(cx - 8, cy - 4, 17, 1, H[2]); g.rect(cx - 8, cy - 2, 17, 1, H[0]); g.rect(cx + 4, cy - 3, 4, 1, H[0]);
      g.rect(cx - 6, cy - 1, 1, 4, '#e8e8e0'); g.rect(cx + 6, cy - 1, 1, 4, '#d0d0c8');                  // canas bajo el gorro
    },
    draw: function (g, f, bob, cx, GY) {
      var y, B = '#f2f0e8';
      for (y = GY - 4; y <= GY - 2; y++) { g.rect(cx - 5, y, 5, 1, '#1a1a1e'); g.rect(cx + 1, y, 5, 1, '#1a1a1e'); } g.rect(cx - 5, GY - 5, 5, 1, '#4a4a52'); g.rect(cx + 1, GY - 5, 5, 1, '#4a4a52');
      g.rect(cx - 4, GY - 23 + bob + 3, 9, 1, B); g.rect(cx - 4, GY - 19 + bob, 9, 3, B); g.rect(cx - 3, GY - 16 + bob, 7, 1, B); g.rect(cx - 2, GY - 15 + bob, 5, 1, '#d0d0c8'); g.rect(cx - 1, GY - 14 + bob, 3, 1, '#b8b8b0');   // barba
      g.rect(cx - 3, GY - 20 + bob, 7, 1, B); g.rect(cx - 1, GY - 20 + bob, 3, 1, '#7a2a28');
      var bx = cx - 18, by = GY - 14 + bob;                                                          // balde azul con pescados
      g.rect(bx, by, 8, 6, '#2a62d0'); g.rect(bx, by, 8, 1, '#6a9ae8'); g.rect(bx, by + 5, 8, 1, '#14388a'); g.rect(bx + 7, by, 1, 6, '#14388a'); g.rect(bx - 1, by - 1, 10, 1, '#8ab0f0');
      g.rect(bx + 1, by - 3, 3, 2, '#a8b8c8'); g.set(bx + 4, by - 2, '#8898a8'); g.rect(bx + 5, by - 4, 2, 3, '#c0ccd8'); g.set(bx + 1, by - 4, '#d8dce0');
      g.rect(bx + 1, by + 2, 2, 3, VEND_SK.tomas); g.set(bx + 1, by + 2, VEND_SKL.tomas);
    }
  },
  rosa: {                                                     // Dona Rosa, anticuchera: panoleta roja con lunares, blusa blanca, delantal manchado, abanico de carton y brochetas
    skin: skinR('#b07852'), shirt: rampHex('#f0ece0'), pants: rampHex('#3a3a4a'), shoe: '#2a2024', hairC: ['#1c1414', '#3a2a24'], apron: rampHex('#b8282c'), waveR: false,
    armL: 'hold', armLHand: [PCX_ - 14, PGY - 15], armR: 'hold', armRHand: function (f, hab) { return [PCX_ + 12, PGY - 18 - (f === 2 ? 5 : 0) - (f === 3 ? 1 : 0)]; }, gestR: 'gest',
    apronFn: function (g, cx, GY, bob) { g.rect(cx - 3, GY - 10 + bob, 7, 3, '#8a1c20'); g.rect(cx - 3, GY - 10 + bob, 7, 1, '#d8484c'); g.set(cx + 1, GY - 6 + bob, '#3a2418'); g.set(cx - 3, GY - 8 + bob, '#3a2418'); g.set(cx + 2, GY - 12 + bob, '#3a2418'); },
    hair: function (g, cx, cy) {
      var K = rampHex('#c42a30'); g.rect(cx - 5, cy - 6, 11, 4, K[2]); g.rect(cx - 4, cy - 7, 9, 1, K[2]); g.rect(cx - 5, cy - 6, 11, 1, K[3]); g.rect(cx - 5, cy - 3, 11, 1, K[0]);
      [[-3, -5], [0, -6], [3, -4], [-1, -4], [4, -6]].forEach(function (p) { g.set(cx + p[0], cy + p[1], '#fbf8ec'); });
      g.rect(cx + 5, cy - 3, 2, 4, K[1]); g.set(cx + 6, cy + 1, K[0]); g.rect(cx - 6, cy - 3, 1, 4, '#1c1414');
      g.rect(cx - 6, cy, 2, 5, '#1c1414'); g.rect(cx - 6, cy + 5, 2, 1, '#2a2420');                              // trenza
    },
    draw: function (g, f, bob, cx, GY) {
      var hy = GY - 18 - (f === 2 ? 5 : 0) - (f === 3 ? 1 : 0), fx = cx + 12, fy = hy - 6 + (f === 2 ? -2 : 0);
      g.rect(fx - 3, fy, 9, 6, '#c8a062'); g.rect(fx - 3, fy, 9, 1, '#e8c88a'); g.rect(fx - 3, fy + 5, 9, 1, '#8a6a30'); g.rect(fx + 5, fy, 1, 6, '#8a6a30'); g.set(fx, fy + 2, '#8a6a30'); g.set(fx + 2, fy + 3, '#8a6a30');   // abanico de carton
      g.rect(fx - 1, fy + 5, 3, 3, VEND_SK.rosa);
      var bx = cx - 17, by = GY - 25 + bob;                                                                       // brochetas
      g.line(bx, by + 12, bx + 5, by, '#c99458'); g.line(bx + 2, by + 12, bx + 7, by, '#c99458'); g.line(bx + 4, by + 12, bx + 9, by + 1, '#c99458');
      [[bx + 5, by + 1], [bx + 7, by + 1], [bx + 8, by + 3]].forEach(function (p) { g.rect(p[0] - 1, p[1] + 1, 3, 3, '#8a4a24'); g.set(p[0], p[1] + 1, '#c0763a'); });
      g.rect(bx - 1, by + 11, 4, 3, VEND_SK.rosa);
      for (var k = 0; k < 3; k++) { g.set(cx + 8 + ((f + k) % 3), GY - 38 - k * 3, '#d8d4cc'); g.set(cx + 9 + ((f + k + 1) % 2), GY - 39 - k * 3, '#e8e4dc'); }   // humo
    }
  },
  lucia: {                                                    // Lucia, la poeta: boina verde, cabello largo, lentes redondos, chaleco lila, bufanda mostaza, lapiz en la mano
    skin: skinR('#c48f63'), shirt: rampHex('#8a6aa8'), pants: rampHex('#2c2c3a'), shoe: '#3a2a2a', hairC: ['#14100e', '#2a1e1a'], glasses: true, longSleeve: true, waveR: true,
    armL: 'hold', armLHand: function (f, hab) { return [PCX_ - 8, PGY - 22 + (hab === 1 ? 1 : 0)]; },
    hairBack: function (g, cx, cy) { var H = rampHex('#14100e'); g.rect(cx - 8, cy - 4, 3, 16, H[2]); g.rect(cx - 8, cy - 4, 1, 16, H[3]); g.rect(cx + 6, cy - 4, 3, 16, H[1]); g.rect(cx + 8, cy - 2, 1, 14, H[0]); g.rect(cx - 8, cy + 12, 3, 2, H[1]); g.rect(cx + 6, cy + 12, 3, 2, H[0]); },
    shirtFn: function (g, ty0, cx, GY) { g.rect(cx - 2, ty0, 5, 9, '#f0ece0'); g.rect(cx - 1, ty0 + 1, 1, 8, '#c8c4b4'); g.rect(cx - 7, ty0, 2, 9, '#6a4a88'); g.rect(cx + 6, ty0, 2, 9, '#6a4a88'); },
    hair: function (g, cx, cy) {
      var H = rampHex('#14100e'), K = rampHex('#2a6a50'); g.rect(cx - 5, cy - 4, 11, 2, H[2]); g.rect(cx - 5, cy - 4, 11, 1, H[3]);
      g.rect(cx - 5, cy - 8, 12, 3, K[2]); g.rect(cx - 4, cy - 9, 9, 1, K[2]); g.rect(cx - 4, cy - 8, 8, 1, K[3]); g.rect(cx - 5, cy - 6, 12, 1, K[0]); g.rect(cx + 2, cy - 5, 5, 1, K[0]); g.set(cx + 3, cy - 10, K[1]); g.set(cx + 4, cy - 10, K[2]);
    },
    draw: function (g, f, bob, cx, GY, ty0) {
      var M = rampHex('#c8942a'); g.rect(cx - 5, ty0 - 1, 11, 2, M[2]); g.rect(cx - 5, ty0 - 1, 11, 1, M[3]); g.rect(cx + 3, ty0 + 1, 3, 8, M[2]); g.rect(cx + 3, ty0 + 1, 1, 8, M[3]); g.rect(cx + 3, ty0 + 8, 3, 1, M[0]);
      var hx = PCX_ - 8, hy = GY - 22 + bob;
      g.rect(hx - 1, hy - 4, 2, 7, '#f2c81c'); g.rect(hx - 1, hy - 4, 1, 7, '#ffe870'); g.rect(hx - 1, hy - 5, 2, 1, '#e888a8'); g.rect(hx - 1, hy + 3, 2, 1, '#2a2a2a');     // lapiz
      g.rect(hx - 2, hy - 1, 4, 3, VEND_SK.lucia); g.set(hx - 2, hy - 1, VEND_SKL.lucia);
    }
  },
  lucho: {                                                    // Lucho, el barman: camisa blanca, chaleco negro, corbata de lazo roja, delantal largo, paño al hombro, coctelera y botella
    skin: skinR('#d6a67a'), shirt: rampHex('#f0ede4'), pants: rampHex('#1c1c22'), shoe: '#141418', hairC: ['#14100e', '#2a2420'], mustache: true, longSleeve: true, apron: rampHex('#2a2830'), waveR: false,
    armL: 'hold', armLHand: [PCX_ - 14, PGY - 15], armR: 'hold', armRHand: function (f, hab) { return [PCX_ + 12, PGY - 19 - (f === 2 ? 4 : 0) + (f === 3 ? 1 : 0)]; }, gestR: 'gest',
    shirtFn: function (g, ty0, cx, GY) { var y; for (y = ty0; y <= GY - 9; y++) { g.rect(cx - 7, y, 5, 1, '#1c1c22'); g.rect(cx + 3, y, 5, 1, '#1c1c22'); } g.rect(cx - 7, ty0, 1, GY - 8 - ty0, '#3a3a44'); g.rect(cx + 3, ty0, 1, GY - 8 - ty0, '#3a3a44'); g.set(cx - 5, GY - 12, '#c8a850'); g.set(cx + 5, GY - 14, '#c8a850'); },
    apronFn: function (g, cx, GY, bob) { g.rect(cx - 5, GY - 14 + bob, 11, 1, '#4a4852'); g.rect(cx - 5, GY - 5 + bob, 11, 1, '#4a4852'); g.rect(cx - 2, GY - 9 + bob, 5, 3, '#3a3844'); },
    hair: function (g, cx, cy) { var H = rampHex('#14100e'); hairBun(g, cx, cy, H); g.rect(cx - 4, cy - 6, 9, 1, '#6a7a96'); g.set(cx - 5, cy - 4, H[3]); g.set(cx + 3, cy - 5, H[3]); },
    draw: function (g, f, bob, cx, GY, ty0) {
      g.rect(cx - 2, ty0 - 1, 2, 2, '#d8142a'); g.rect(cx + 1, ty0 - 1, 2, 2, '#d8142a'); g.rect(cx - 1, ty0 - 1, 2, 2, '#f2584a');                 // corbata de lazo
      g.rect(cx - 12, ty0 - 2, 6, 6, '#f6f2ea'); g.rect(cx - 12, ty0 - 2, 6, 1, '#ffffff'); g.rect(cx - 12, ty0 + 3, 6, 1, '#bdb9ab'); g.rect(cx - 11, ty0 + 1, 4, 1, '#d83a3a');   // pano
      var hy = GY - 19 - (f === 2 ? 4 : 0) + (f === 3 ? 1 : 0), sx = cx + 12 + ((f % 2) ? 1 : 0);
      g.rect(sx - 2, hy - 11, 5, 9, '#b8c4d0'); g.rect(sx - 2, hy - 11, 1, 9, '#f2f6fa'); g.rect(sx + 2, hy - 11, 1, 9, '#6a7480'); g.rect(sx - 1, hy - 13, 3, 2, '#8a96a2'); g.rect(sx, hy - 14, 1, 1, '#e8eef4'); g.rect(sx - 2, hy - 6, 5, 1, '#8a96a2');   // coctelera
      g.rect(sx - 2, hy - 3, 5, 3, VEND_SK.lucho);
      var bx = cx - 17, by = GY - 25 + bob;                                                                                              // botella verde en la otra mano
      g.rect(bx, by + 4, 4, 8, '#1c6a34'); g.rect(bx, by + 4, 1, 8, '#8ae09a'); g.rect(bx + 1, by, 2, 5, '#1c6a34'); g.rect(bx + 1, by - 1, 2, 1, '#d83a2c'); g.rect(bx, by + 7, 4, 2, '#e8dcb0');
      g.rect(bx - 1, by + 12, 6, 3, VEND_SK.lucho);
    }
  },
  celedonio: {                                                // Don Celedonio, viejo guitarrista: sombrero de paja, camisa guayabera crema, bigote canoso, guitarra criolla sobre el pecho
    skin: skinR('#a8704c'), shirt: rampHex('#e8dcb8'), pants: rampHex('#3a2e24'), shoe: '#2a1c14', hairC: ['#c8c8c0', '#e8e8e2'], mustache: true, waveR: false,
    armL: 'hold', armLHand: [PCX_ - 12, PGY - 29], armR: 'hold', armRHand: function (f, hab) { return [PCX_ + 4, PGY - 12 + (f % 2 ? 2 : 0) + (hab === 0 ? -1 : 0)]; }, gestR: 'hold',
    shirtFn: function (g, ty0, cx, GY, bob, f) {
      var WD = ['#5a3416', '#7a4a22', '#b07a45', '#d29a5c'], y;
      for (y = ty0 + 1; y <= GY - 9; y++) { g.set(cx - 4, y, '#c8bc98'); g.set(cx + 4, y, '#c8bc98'); }
      g.rect(cx - 6, ty0 + 3, 3, 3, '#c8bc98'); g.rect(cx + 4, ty0 + 3, 3, 3, '#c8bc98');
      guitarFront(g, cx + 1, GY - 7 + bob, -12, 18, WD, 0);
    },
    hair: function (g, cx, cy) {
      var H = rampHex('#d8c48f'); g.rect(cx - 5, cy - 8, 11, 4, H[2]); g.rect(cx - 4, cy - 9, 9, 1, H[3]); g.rect(cx - 5, cy - 8, 11, 1, H[3]); g.rect(cx - 5, cy - 5, 11, 1, '#a02a1c');
      g.rect(cx - 9, cy - 4, 19, 2, H[1]); g.rect(cx - 9, cy - 4, 19, 1, H[2]); g.rect(cx - 9, cy - 2, 19, 1, H[0]); g.rect(cx - 6, cy - 1, 1, 4, '#e8e8e2'); g.rect(cx + 6, cy - 1, 1, 4, '#c8c8c0');
    },
    draw: function (g, f, bob, cx, GY) {
      var SKN = VEND_SK.celedonio, hx = cx - 12, hy = GY - 29 + bob;                                                                // las manos sobre la guitarra
      g.rect(hx - 2, hy - 2, 4, 4, SKN); g.rect(hx - 2, hy - 2, 4, 1, VEND_SKL.celedonio);
      var rx = cx + 4, ry = GY - 12 + (f % 2 ? 2 : 0) + bob; g.rect(rx - 2, ry - 2, 5, 4, SKN); g.rect(rx - 2, ry - 2, 5, 1, VEND_SKL.celedonio);
    }
  }
};
var VEND_SK = {}, VEND_SKL = {};
Object.keys(SURV).forEach(function (k) { VEND_SK[k] = SURV[k].skin[2]; VEND_SKL[k] = SURV[k].skin[3]; });
function buildSurv(id) {
  var o = SURV[id], idle = [], habla = [], f;
  for (f = 0; f < 4; f++) idle.push(fin(personG(o, f), PCX_, PGY));
  habla.push(fin(personG(o, 2, 0), PCX_, PGY)); habla.push(fin(personG(o, 3, 1), PCX_, PGY));
  return { idle: idle, habla: habla };
}
safe('sobrevivientes', function () {
  PJ.npc = PJ.npc || {};
  Object.keys(SURV).forEach(function (id) { lazy(PJ.npc, id, function () { return buildSurv(id); }); });
});

/* ======================== LA BANDA ZOMBIE DEL TABLADILLO (de frente, sentados) ======================== */
/* guitarristaZ = { toca[4] }   cajoneroZ = { toca[4], cae }   Lienzo 56x52, ancla (28,48) = suelo bajo la silla/cajon. */
var ZW_ = 56, ZH_ = 52, ZCX = 28, ZGY = 48;
var ZSK = ['#46564a', '#657866', '#8fa088', '#b8c8aa'];
function zombHead(g, cx, cy, o, f) {                                  // cabeza zombie de frente: ojos nublados, boca floja, mejillas hundidas
  var SK = ZSK;
  blobG(g, cx, cy + 1, 5.4, 5.6, [SK[0], SK[1], SK[2], SK[3]]);
  g.set(cx - 5, cy + 1, SK[2]); g.set(cx + 5, cy + 1, SK[1]);
  g.rect(cx - 3, cy - 1, 2, 2, '#e8f0c0'); g.rect(cx + 2, cy - 1, 2, 2, '#e8f0c0'); g.set(cx - 3, cy, '#3a4430'); g.set(cx + 3, cy, '#3a4430');
  g.line(cx - 4, cy - 2, cx - 2, cy - 3, '#2a3228'); g.line(cx + 2, cy - 3, cx + 4, cy - 2, '#2a3228');
  g.set(cx - 3, cy + 3, SK[0]); g.set(cx + 3, cy + 3, SK[0]);
  if (f % 2) { g.rect(cx - 1, cy + 3, 3, 2, '#2a1214'); g.set(cx, cy + 4, '#b0505c'); } else { g.rect(cx - 1, cy + 3, 3, 1, '#2a1214'); }
  if (o.mustache) g.rect(cx - 3, cy + 2, 7, 1, '#2a2420');
  g.set(cx + 2, cy - 4, SK[0]); g.set(cx + 3, cy - 4, SK[1]);
}
function seatBand(o, f) {
  var g = new G(ZW_, ZH_), cx = ZCX, GY = ZGY, bob = (f === 1 || f === 3) ? 1 : 0, y, SH = o.shirt, PA = o.pants, WD = ['#5a3416', '#7a4a22', '#b07a45', '#d29a5c'];
  o.seat(g, cx, GY, f, WD);
  for (y = GY - 12; y <= GY - 3; y++) { span(g, y, cx - 9, cx - 4, PA); span(g, y, cx + 4, cx + 9, PA); }          // espinillas
  g.rect(cx - 10, GY - 2, 7, 2, '#1c1c22'); g.rect(cx + 3, GY - 2, 7, 2, '#1c1c22'); g.rect(cx - 10, GY - 2, 7, 1, '#4a4a54'); g.rect(cx + 3, GY - 2, 7, 1, '#4a4a54');
  for (y = GY - 15; y <= GY - 11; y++) span(g, y, cx - 10, cx + 10, PA);                                           // muslos
  var ty0 = GY - 29 + bob;
  for (y = ty0; y <= GY - 14; y++) span(g, y, cx - 8, cx + 8, SH);
  g.rect(cx - 8, GY - 14, 17, 1, PA[0]);
  if (o.torso) o.torso(g, ty0, cx, GY, bob);
  g.set(cx - 5, ty0 + 5, ZSK[1]); g.set(cx - 4, ty0 + 5, ZSK[2]); g.set(cx - 4, ty0 + 6, ZSK[0]); g.set(cx + 5, ty0 + 8, '#7a2a26');                              // roto y sangre
  zombHead(g, cx, GY - 35 + bob, o, f);
  o.hat(g, cx, GY - 35 + bob);
  g.rect(cx - 2, GY - 30 + bob, 4, 2, ZSK[1]);
  if (o.front) o.front(g, cx, GY, bob, f, ty0);
  return g;
}
var BAND = {
  guitarrista: {
    shirt: rampHex('#e2d8b8'), pants: rampHex('#4a3a2a'), mustache: true,
    seat: function (g, cx, GY, f, WD) {                               // silla de madera: respaldo con dos postes, asiento y patas
      g.rect(cx - 11, GY - 32, 2, 21, WD[1]); g.rect(cx + 10, GY - 32, 2, 21, WD[1]); g.rect(cx - 11, GY - 32, 1, 21, WD[2]); g.rect(cx - 11, GY - 24, 23, 2, WD[2]); g.rect(cx - 11, GY - 24, 23, 1, WD[3]);
      g.rect(cx - 11, GY - 13, 23, 2, WD[2]); g.rect(cx - 11, GY - 13, 23, 1, WD[3]); g.rect(cx - 11, GY - 11, 2, 11, WD[1]); g.rect(cx + 10, GY - 11, 2, 11, WD[1]); g.rect(cx - 11, GY - 11, 1, 11, WD[2]);
    },
    torso: function (g, ty0, cx) { var y; for (y = ty0 + 1; y <= ty0 + 14; y++) { g.set(cx - 3, y, '#c8bc98'); g.set(cx + 3, y, '#c8bc98'); } g.rect(cx - 6, ty0 + 2, 3, 3, '#c8bc98'); g.rect(cx + 3, ty0 + 3, 3, 3, '#c8bc98'); },
    hat: function (g, cx, cy) { var H = rampHex('#d8c48f'); g.rect(cx - 5, cy - 8, 11, 4, H[2]); g.rect(cx - 4, cy - 9, 9, 1, H[3]); g.rect(cx - 5, cy - 8, 11, 1, H[3]); g.rect(cx - 5, cy - 5, 11, 1, '#a02a1c'); g.rect(cx - 9, cy - 4, 19, 2, H[1]); g.rect(cx - 9, cy - 4, 19, 1, H[2]); g.rect(cx - 9, cy - 2, 19, 1, H[0]); },
    front: function (g, cx, GY, bob, f, ty0) {                        // guitarra criolla de frente y las manos: la derecha rasguea, la izquierda va al mastil
      var WD = ['#5a3416', '#7a4a22', '#b07a45', '#d29a5c'], st = [0, -2, 0, 2][f];
      guitarFront(g, cx + 2, GY - 12 + bob, -14, 19, WD, 0);
      g.rect(cx - 15, ty0 + 2 + (f % 2), 4, 4, ZSK[2]); g.rect(cx - 15, ty0 + 2 + (f % 2), 4, 1, ZSK[3]);
      g.rect(cx + 2, GY - 15 + st, 5, 4, ZSK[2]); g.rect(cx + 2, GY - 15 + st, 5, 1, ZSK[3]); g.rect(cx + 6, GY - 14 + st, 1, 3, ZSK[1]);
    }
  },
  cajonero: {
    shirt: rampHex('#f0ece0'), pants: rampHex('#26242e'),
    seat: function (g, cx, GY, f, WD) {                               // el cajon: caja de madera clara sobre la que se sienta, con la tapa frontal y la boca atras
      g.rect(cx - 11, GY - 12, 23, 12, WD[2]); g.rect(cx - 11, GY - 12, 23, 2, WD[3]); g.rect(cx - 11, GY - 12, 2, 12, WD[3]); g.rect(cx + 10, GY - 12, 2, 12, WD[1]); g.rect(cx - 11, GY - 2, 23, 2, WD[1]);
      g.set(cx - 8, GY - 8, WD[0]); g.set(cx + 8, GY - 8, WD[0]); g.set(cx - 8, GY - 4, WD[0]); g.set(cx + 8, GY - 4, WD[0]); g.rect(cx - 9, GY - 10, 19, 1, WD[0]);
    },
    torso: function (g, ty0, cx) { g.rect(cx - 8, ty0, 17, 2, '#c4202c'); g.rect(cx - 8, ty0, 17, 1, '#f2584a'); g.rect(cx + 2, ty0 + 2, 3, 5, '#c4202c'); },
    hat: function (g, cx, cy) { var H = rampHex('#3a3a44'); g.rect(cx - 5, cy - 6, 11, 3, H[2]); g.rect(cx - 4, cy - 7, 9, 1, H[2]); g.rect(cx - 6, cy - 5, 12, 2, H[1]); g.rect(cx - 5, cy - 6, 11, 1, H[3]); g.set(cx + 2, cy - 8, H[1]); },
    front: function (g, cx, GY, bob, f, ty0) {                        // las dos manos golpean los costados del cajon, una arriba y otra abajo
      var ha = (f % 2) ? 4 : 0, hb = (f % 2) ? 0 : 4, SK = ZSK;
      [[-1, ha], [1, hb]].forEach(function (p) {
        var s = p[0], x = cx + s * 13, ya = GY - 19 + p[1];
        g.rect(x - 2, ya - 3, 5, 9, '#f0ece0'); g.rect(x - 2, ya - 3, 1, 9, '#fbf8ec'); g.rect(x + 2, ya - 3, 1, 9, '#bdb9ab');
        g.rect(x - 2, ya + 6, 5, 4, SK[2]); g.rect(x - 2, ya + 6, 5, 1, SK[3]); g.rect(x + 2, ya + 7, 1, 3, SK[1]);
      });
      if (f % 2) { g.set(cx - 15, GY - 7, '#fff0a0'); g.set(cx - 16, GY - 8, '#fff0a0'); g.set(cx - 14, GY - 6, '#fff0a0'); } else { g.set(cx + 15, GY - 7, '#fff0a0'); g.set(cx + 16, GY - 8, '#fff0a0'); g.set(cx + 14, GY - 6, '#fff0a0'); }
    }
  }
};
function caeBand() {                                                   // el cajonero se cae de espaldas: patas arriba, el cajon volcado y estrellitas
  var g = new G(56, 34), WD = ['#5a3416', '#7a4a22', '#b07a45', '#d29a5c'], y;
  g.rect(34, 6, 14, 20, WD[2]); g.rect(34, 6, 3, 20, WD[3]); g.rect(46, 6, 2, 20, WD[1]); g.rect(34, 24, 14, 2, WD[1]); g.disc(41, 15, 3.2, '#1a1008'); g.rect(36, 8, 10, 1, WD[0]);
  g.rect(8, 22, 26, 9, '#f0ece0'); g.rect(8, 22, 26, 1, '#fbf8ec'); g.rect(8, 30, 26, 1, '#bdb9ab'); g.rect(14, 22, 4, 9, '#c4202c');
  g.line(30, 22, 36, 6, '#26242e'); g.line(31, 22, 37, 6, '#3a3844'); g.line(33, 24, 39, 10, '#26242e'); g.line(34, 24, 40, 10, '#3a3844');
  g.rect(35, 3, 5, 3, '#1c1c22'); g.rect(38, 8, 5, 3, '#1c1c22');
  blobG(g, 6, 26, 5.2, 5.2, ZSK); g.rect(2, 23, 5, 3, '#3a3a44'); g.line(5, 25, 7, 26, '#e8f0c0'); g.line(7, 25, 5, 26, '#e8f0c0'); g.rect(5, 28, 3, 1, '#2a1214');
  g.rect(8, 18, 3, 5, ZSK[2]); g.rect(26, 19, 4, 4, ZSK[2]);
  [[3, 14], [10, 10], [16, 14]].forEach(function (s) { g.set(s[0], s[1], '#f2e63c'); g.set(s[0] + 1, s[1], '#f2e63c'); g.set(s[0], s[1] - 1, '#fff6a0'); g.set(s[0], s[1] + 1, '#fff6a0'); });
  return fin(g, 18, 31);
}
lazy(PJ, 'guitarristaZ', function () { return { toca: [0, 1, 2, 3].map(function (f) { return fin(seatBand(BAND.guitarrista, f), ZCX, ZGY); }) }; });
lazy(PJ, 'cajoneroZ', function () { return { toca: [0, 1, 2, 3].map(function (f) { return fin(seatBand(BAND.cajonero, f), ZCX, ZGY); }), cae: caeBand() }; });


/* ======================== ALEXANDER CON EL CAJON: carga (4 direcciones) y golpe (se sienta y lo toca) ======================== */
/* pj.alex.cajon = { carga:{right,left,down,up}[4], golpe:{right,left,down,up}[3], bird:{carga,golpe}, nobird:{carga,golpe} }  (el de arriba = bird, con Titina)
   carga: 20x28 @10,26 (izq @9,26) como alex.walk.  golpe: lado 32x34 @13,30 (izq @18,30) (4 px mas alto que el golpe normal: sentado queda mas arriba); frente/espaldas 32x48 @16,38.
   Se compone sobre los cuadros SIN guitarra (alex.<k>.g3). Perezoso por k. */
safe('alexCajon', function () {
  var A = S.alex;
  if (!A || !A.nobird || !A.bird) return;
  var CP = (px.chars && px.chars.P) || { skin: '#a8714c', skinD: '#80523a', skinL: '#c48f63', blue: '#1f2f66', white: '#e6e6e0' };
  var cSkin = col(CP.skin), cSkinL = col(CP.skinL), cSkinD = col(CP.skinD), cBlue = col(CP.blue), cWhite = col(CP.white);
  var cShort = col(CP.shorts || '#5d6150'), cShortD = col(CP.shortsD || '#464a3c'), cShoe = col(CP.sandal || '#5e3f27');
  var WD = ramp(['#4a2a12', '#7a4a22', '#b07a45', '#dcaa6a']), cHole = col('#1a0e06');
  var BOB = [0, 1, 0, 1];
  function stripOutline(b) { for (var i = 0; i < b.d.length; i++) { var c = b.d[i]; if (c === K || c === RIM_HI || c === RIM_LO) b.d[i] = 0; } }
  function stripeCol(xs) { return ((xs >> 1) % 2) ? cWhite : cBlue; }
  function eraseSideArm(b, ox, u) {
    var x, y, c;
    for (y = 14 + u; y <= 18 + u; y++) for (x = 9; x <= 12; x++) {
      c = b.get(x + ox, y);
      if ((c === cBlue && x >= 10 && x <= 11 && y <= 15 + u) || (c === cSkin && y >= 16 + u)) b.set(x + ox, y, stripeCol(x));
    }
  }
  function eraseFrontArm(b, ox, oy, u, side) {
    var x0 = side === 'L' ? 3 : 15, x, y, c;
    for (y = 13 + u; y <= 19 + u; y++) for (x = x0; x <= x0 + 1; x++) { c = b.get(x + ox, y + oy); if (c === cBlue || c === cSkin) b.set(x + ox, y + oy, 0); }
  }
  function mirrorBuf(b) { var n = new Buf(b.w, b.h); for (var y = 0; y < b.h; y++) for (var x = 0; x < b.w; x++) n.d[y * b.w + (b.w - 1 - x)] = b.d[y * b.w + x]; return n; }
  function bufFrom(cv, W, H, ox, oy) { var b = new Buf(W, H), s = fromCanvas(cv); b.blit(s, ox, oy); return b; }
  function finish(b, ax, ay, mirror) { b.outlineRim(); if (mirror) { var m = mirrorBuf(b); return m.toCanvas(b.w - 1 - ax, ay); } return b.toCanvas(ax, ay); }
  function opaque(cv) { var b = fromCanvas(cv), n = 0; for (var i = 0; i < b.d.length; i++) if (b.d[i]) n++; return n; }
  function box(b, x, y, w, h, hole) {                                   // cajon de frente/lado: tapa clara, caja, boca
    b.rect(x, y, w, h, WD[2]); b.rect(x, y, w, 1, WD[3]); b.rect(x, y, 1, h, WD[3]); b.rect(x + w - 1, y, 1, h, WD[1]); b.rect(x, y + h - 1, w, 1, WD[0]);
    if (hole) { var hx = x + (w >> 1), hy = y + (h >> 1); b.set(hx, hy, cHole); b.set(hx - 1, hy, cHole); b.set(hx, hy - 1, cHole); b.set(hx - 1, hy - 1, cHole); }
  }
  function fist(b, x, y) { b.rect(x - 1, y - 1, 3, 3, cSkin); b.set(x - 1, y - 1, cSkinL); b.set(x, y - 1, cSkinL); b.set(x + 1, y + 1, cSkinD); }
  function line(b, x0, y0, x1, y1, c, t) { b.line(x0, y0, x1, y1, c); if (t) b.line(x0, y0 + 1, x1, y1 + 1, c); }

  /* ---------- carga ---------- */
  function buildCarga(which) {
    var set = A[which].g3 || A[which], W = set.walk, walk = { right: [], left: [], down: [], up: [] }, i, b;
    if (opaque(W.right[0]) < 60) throw new Error('los cuadros de Alexander estan vacios');
    for (i = 0; i < 4; i++) {
      var u = BOB[i];
      [false, true].forEach(function (mir) {                                // perfil: el cajon abrazado contra el pecho, la mano arriba de la tapa
        var b2 = bufFrom(W.right[i], 20, 28, 0, 0); stripOutline(b2); eraseSideArm(b2, 0, u);
        box(b2, 11, 15 + u, 8, 7, true);
        b2.rect(11, 15 + u, 8, 1, WD[3]); b2.rect(12, 14 + u, 6, 1, WD[3]);
        b2.rect(10, 14 + u, 2, 2, cBlue); line(b2, 11, 16 + u, 14, 19 + u, cSkin, 1); fist(b2, 15, 20 + u);
        (mir ? walk.left : walk.right).push(finish(b2, 10, 26, mir));
      });
      b = bufFrom(W.down[i], 20, 28, 0, 0); stripOutline(b);                // de frente: el cajon sobre la panza, las manos a los lados
      box(b, 5, 16 + u, 10, 7, true); b.rect(5, 15 + u, 10, 1, WD[3]); b.rect(4, 17 + u, 1, 3, cSkin); b.rect(15, 17 + u, 1, 3, cSkin); b.set(4, 17 + u, cSkinL);
      b.outlineRim(); walk.down.push(b.toCanvas(10, 26));
      b = bufFrom(W.up[i], 20, 28, 0, 0); stripOutline(b);                  // de espaldas: el cajon a la espalda, con las correas
      box(b, 4, 15 + u, 12, 8, false); b.rect(4, 14 + u, 12, 1, WD[3]); b.line(6, 14 + u, 8, 21 + u, WD[0]); b.line(13, 14 + u, 11, 21 + u, WD[0]); b.line(7, 14 + u, 9, 21 + u, cWhite); b.line(12, 14 + u, 10, 21 + u, cWhite);
      b.outlineRim(); walk.up.push(b.toCanvas(10, 26));
    }
    return walk;
  }
  /* ---------- golpe: se sienta en el cajon (cuadro 0 se agacha, 1 manos arriba, 2 golpe con marquitas) ---------- */
  function impact(b, x, y) { var c = col('#fff0a0'); b.set(x, y, c); b.set(x - 2, y - 1, c); b.set(x + 2, y - 1, c); b.set(x, y - 3, c); b.set(x - 1, y - 2, col('#ffffff')); b.set(x + 1, y - 2, col('#ffffff')); }
  function seatSide(srcCv, k, mirror) {                                   // lienzo 32x34 @13,30 (izq @18,30)
    var b = new Buf(32, 34), s = bufFrom(srcCv, 20, 28, 0, 0), dy = [1, -1, 0][k], lean = [0, 0, 1][k], base = 4 + dy, x, y, c;
    stripOutline(s); eraseSideArm(s, 0, 0);
    box(b, 10, 24, 9, 7, true); b.rect(10, 23, 9, 1, WD[3]);
    for (y = 0; y <= 19; y++) for (x = 0; x < 20; x++) { c = s.get(x, y); if (c) b.set(x + 3 + lean, y + base, c); }
    var hy = 20 + base;                                                       // muslo (short) hacia adelante, rodilla y espinilla hacia abajo
    b.rect(11 + lean, hy, 9, 3, cShort); b.rect(11 + lean, hy, 9, 1, cShort); b.rect(11 + lean, hy + 2, 9, 1, cShortD); b.rect(18 + lean, hy, 2, 3, cShortD);
    b.rect(19, hy + 3, 2, 30 - hy - 4, cSkin); b.rect(19, hy + 3, 1, 30 - hy - 4, cSkinL); b.rect(18, 27, 4, 3, cShoe); b.rect(21, 28, 2, 2, cShoe);
    var sx = 14 + lean, sy = 15 + base;                                       // hombro; el antebrazo baja hacia la tapa
    b.rect(sx - 2, sy - 1, 2, 2, cBlue);
    if (k === 0) { line(b, sx, sy + 1, sx + 5, sy + 7, cSkin, 1); fist(b, sx + 6, sy + 8); }
    else if (k === 1) { line(b, sx, sy, sx + 5, sy - 4, cSkin, 1); fist(b, sx + 6, sy - 5); line(b, sx - 1, sy + 1, sx + 3, sy - 2, cSkinD, 0); }
    else { line(b, sx, sy + 1, sx + 5, sy + 8, cSkin, 1); fist(b, sx + 6, sy + 9); impact(b, sx + 10, sy + 6); }
    return finish(b, 13, 30, mirror);
  }
  function seatFront(srcCv, k, back) {                                      // lienzo 32x48 @16,38 (cuerpo en 6,12)
    var b = new Buf(32, 48), s = bufFrom(srcCv, 20, 28, 0, 0), dy = [1, -1, 0][k], base = 12 + dy, x, y, c;
    stripOutline(s); eraseFrontArm(s, 0, 0, 0, 'L'); eraseFrontArm(s, 0, 0, 0, 'R');
    box(b, 9, 32, 14, 7, !back); b.rect(9, 31, 14, 1, WD[3]);
    for (y = 0; y <= 19; y++) for (x = 0; x < 20; x++) { c = s.get(x, y); if (c) b.set(x + 6, y + base, c); }
    var hy = 20 + base;                                                       // muslos: bloque ancho de short, rodillas a los lados, espinillas y sandalias
    b.rect(11, hy, 11, 3, cShort); b.rect(11, hy + 2, 11, 1, cShortD);
    b.rect(10, hy + 3, 4, 2, cSkin); b.rect(18, hy + 3, 4, 2, cSkin); b.rect(10, hy + 3, 4, 1, cSkinL); b.rect(18, hy + 3, 4, 1, cSkinL);
    b.rect(10, hy + 5, 3, 37 - hy - 5, cSkin); b.rect(19, hy + 5, 3, 37 - hy - 5, cSkin); b.rect(10, 36, 3, 2, cShoe); b.rect(19, 36, 3, 2, cShoe); b.rect(9, 37, 4, 1, cShoe); b.rect(19, 37, 4, 1, cShoe);
    var sy = 13 + base;
    [[-1], [1]].forEach(function (p) {                                        // brazos: abajo sobre el cajon / arriba a los lados / golpe con marquitas
      var sd = p[0], sxx = 16 + sd * 8, hxx = 16 + sd * (k === 1 ? 9 : 7), hyy = k === 0 ? hy + 1 : (k === 1 ? sy - 6 : hy + 2);
      b.rect(sxx - 1, sy, 2, 2, cBlue);
      if (!back || true) { line(b, sxx, sy + 1, hxx, hyy, cSkin, 0); line(b, sxx + sd, sy + 1, hxx + sd, hyy, cSkinD, 0); }
      if (k === 1) { b.rect(sxx - 1, sy - 2, 2, 3, cBlue); }
      fist(b, hxx, hyy);
      if (k === 2) impact(b, hxx + sd * 3, hyy - 2);
    });
    return finish(b, 16, 38);
  }
  function buildGolpe(which) {
    var set = A[which].g3 || A[which], W = set.walk, out = { right: [], left: [], down: [], up: [] }, k;
    for (k = 0; k < 3; k++) {
      out.right.push(seatSide(W.right[0], k, false)); out.left.push(seatSide(W.right[0], k, true));
      out.down.push(seatFront(W.down[0], k, false)); out.up.push(seatFront(W.up[0], k, true));
    }
    var arr = out.down.slice(); arr.right = out.right; arr.left = out.left; arr.down = out.down; arr.up = out.up;      // golpe[3] (= los de frente) con .right/.left/.down/.up
    return arr;
  }
  var AC = {};
  ['bird', 'nobird'].forEach(function (k) {
    var o = AC[k] = {};
    lazy(o, 'carga', function () { return buildCarga(k); });
    lazy(o, 'golpe', function () { return buildGolpe(k); });
  });
  Object.defineProperty(AC, 'carga', { enumerable: true, configurable: true, get: function () { return AC.bird.carga; } });
  Object.defineProperty(AC, 'golpe', { enumerable: true, configurable: true, get: function () { return AC.bird.golpe; } });
  PJ.alex = PJ.alex || {};
  PJ.alex.cajon = AC;
});

var T1 = (window.performance && performance.now) ? performance.now() : Date.now();
BRS.arteMs = T1 - T0;                                         // lo que cuesta hornear al cargar (sin lo perezoso)
BRS.bakeAll = function () { var t = (window.performance && performance.now) ? performance.now() : Date.now(); LAZY.forEach(function (f) { f(); }); return ((window.performance && performance.now) ? performance.now() : Date.now()) - t; };


})();
