/* ACHORADO - js/sprites/zombies.js  (v0.6b, F8s)
 * Zombies variados: generador modular de cuerpos (bajo ~24 px, normal ~28, alto ~34), atuendos y formas de moverse.
 * Publica:
 *   ACH.sprites.zvar[skin]  = { move:[n], hurt:[n], dead, extra? }       skin = loco + '_' + cuerpo + '_' + atuendo
 *   ACH.sprites.zvarList    = [{ skin, loco, height, outfit, body, hpx, tone, n }]
 *   ACH.sprites.props.skateSuelto / biciCaida / sillaRuedas
 *   ACH.sprites.zombie.escolarSling   (misma forma que zombie.escolar)
 * v0.9 (H5b) agrega:
 *   ACH.sprites.zvar['senoraBalde_<cuerpo>_<atuendo>'] y ['senoraOlla_<cuerpo>_<atuendo>']   cuerpo: baja (24 px) | normal (27 px); atuendo: olla | manta | buzo | bata
 *       = { move:[4], windup:[2], attack:[2], hurt:[4], hurtWindup:[2], hurtAttack:[2], dead, extra:{kind,tipo,bucket,height,mouth} }   ax/ay = pies; dead = centro del torso
 *   ACH.sprites.senoraList = { balde:[skins], olla:[skins] }
 *   ACH.sprites.zombie.pasajero = { senor:[2], senora:[2], escolar:[2], hurt:{senor:[2],...}, seat:{x,y} }   sentado de piernas cruzadas, ax/ay = el trasero; seat = donde ponerlo respecto del ancla de props.carretillaSuelta
 *   ACH.sprites.fx.chorro = [3]   cono de agua del baldazo (82x90, ancla 0,45 = boca del balde, mira a la derecha, alcance 75 px, apertura 60 grados)
 * Todos los cuadros miran a la DERECHA (el motor voltea para la izquierda). ax/ay = pies (o centro del contacto con el suelo).
 * Cada cuerpo se dibuja con su propia proporcion (nunca se escalan pixeles). Luz de borde arriba-izquierda: rimHi #d5dbe0 / rimLo #9fb0c4.
 * Camino rapido: buffer Uint32 + ImageData (nada de fillRect por pixel).
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px;
var S = ACH.sprites = ACH.sprites || {};
if (!px) return;
var T0 = (window.performance && performance.now) ? performance.now() : Date.now();

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
  var c = document.createElement('canvas'); c.width = this.w; c.height = this.h;
  var ctx = c.getContext('2d'), img = ctx.createImageData(this.w, this.h);
  new Uint32Array(img.data.buffer).set(this.d);
  ctx.putImageData(img, 0, 0);
  if (ax !== undefined) { c.ax = ax; c.ay = ay; }
  if (fw !== undefined) { c.fw = fw; c.fh = fh; }
  return c;
};
function fromCanvas(cv) {                                    // canvas -> Buf (para reutilizar sprites ya hechos)
  var b = new Buf(cv.width, cv.height), img = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
  b.d.set(new Uint32Array(img.data.buffer));
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
  gorra:  [[0, 1, 6], [1, 0, 7], [2, 0, 7], [2, 8, 10]]
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
    if (ht === 'gorra') { b.rect(X0 + 8, Y0 + 2, 3, 1, P.ou.hatR[0]); }
  }
}

/* ======================== ATUENDOS ======================== */
/* Rampas [sombra profunda, sombra, base, luz]. top = torso, slvR = manga (si no es top), bot = pantalon, shoe = calzado, trim = detalle. */
function N(r) { return [r[1], r[2], r[3]]; }                 // pasos de cerca
function F(r) { return [r[0], r[1], r[2]]; }                 // pasos de lejos (un paso mas oscuro)
function tset(c, x, y, col_) { var t = c.tr; if (t && y >= t.y0 && y <= t.y1 && x >= t.x0[y] && x <= t.x1[y]) c.b.set(x, y, col_); }
function tpick(c, v) { return c.tr.y0 + Math.round((c.tr.y1 - c.tr.y0) * v); }

var OUTFITS = {
  chaleco: {                                                 // chaleco reflectivo verde fosforescente sobre polo gris
    top: ramp(['#3f6b0e', '#6aa514', '#a0e028', '#d2ff62']), slv: 'short', slvR: ramp(['#1f2126', '#383b43', '#565a63', '#767b86']),
    bot: ramp(['#1e2029', '#363a46', '#505564', '#6c7282']), shoe: ramp(['#0e0c0e', '#1e1c1c', '#352f2b', '#4f4640']),
    trim: ramp(['#6a6e72', '#a8aca8', '#d8dcd6', '#f6f8f0']),
    deco: function (c) {
      var t = c.tr, T = c.ou.trim, y, x;
      [tpick(c, 0.28), tpick(c, 0.72)].forEach(function (yy) { for (x = t.x0[yy]; x <= t.x1[yy]; x++) tset(c, x, yy, T[2]); if (yy + 1 <= t.y1) for (x = t.x0[yy + 1]; x <= t.x1[yy + 1]; x++) tset(c, x, yy + 1, c.ou.top[1]); });
      for (y = t.y0 + 1; y <= t.y1; y++) tset(c, t.x1[y] - 1, y, c.ou.top[0]);
      tset(c, t.x1[t.y0] - 1, t.y0, c.skin[1]); tset(c, t.x1[t.y0], t.y0, c.skin[2]);
    }
  },
  enfermera: {                                               // uniforme blanco de enfermera, cofia
    top: ramp(['#5c5f6e', '#8f93a2', '#cdcfd2', '#f4f3ec']), slv: 'short',
    bot: ramp(['#5c5f6e', '#8f93a2', '#cdcfd2', '#f4f3ec']), shoe: ramp(['#2a5a58', '#3a8480', '#5eb0a6', '#9adcca']),
    trim: ramp(['#1f5a5a', '#2f8a8a', '#4cb4b0', '#8adcd0']), hat: 'cofia', hatR: ramp(['#6a6c78', '#a4a6b0', '#dcdcda', '#fbfaf2']),
    deco: function (c) {
      var t = c.tr, T = c.ou.trim, y0 = t.y0;
      tset(c, t.x1[y0] - 1, y0, T[2]); tset(c, t.x1[y0] - 2, y0 + 1, T[2]); tset(c, t.x1[y0], y0, c.skin[2]);
      var py = tpick(c, 0.5); tset(c, t.x1[py] - 3, py, c.ou.top[1]); tset(c, t.x1[py] - 2, py, c.ou.top[1]); tset(c, t.x1[py] - 3, py + 1, c.ou.top[1]);
      tset(c, t.x0[y0 + 2] + 1, y0 + 2, c.ou.top[3]);
    }
  },
  cocinero: {                                                // chaqueta blanca cruzada de cocinero, pantalon de cuadros, gorro alto
    top: ramp(['#5c5f6e', '#8f93a2', '#cdcfd2', '#f4f3ec']), slv: 'long',
    bot: ramp(['#16161c', '#34343c', '#7e7e86', '#c4c4c6']), legPat: 'check', shoe: ramp(['#0e0c0e', '#1e1c1c', '#352f2b', '#4f4640']),
    trim: ramp(['#2a2a30', '#4a4a52', '#6a6a72', '#9a9aa0']), hat: 'toque', hatR: ramp(['#6a6c78', '#a4a6b0', '#dcdcda', '#fbfaf2']),
    deco: function (c) {
      var t = c.tr, y, x, T = c.ou.trim;
      for (y = t.y0 + 1; y <= t.y1 - 1; y += 2) { tset(c, t.x1[y] - 2, y, T[1]); tset(c, t.x1[y] - 4, y, T[1]); }
      for (y = t.y0 + 1; y <= t.y1; y++) tset(c, t.x1[y] - 3, y, c.ou.top[1]);
      tset(c, t.x1[t.y0], t.y0, T[0]);
    }
  },
  buzo: {                                                    // buzo de colegio celeste con franjas blancas
    top: ramp(['#26547e', '#4682b8', '#78b2e2', '#a8d8f6']), slv: 'long',
    bot: ramp(['#0e1432', '#1b2a5c', '#2d449c', '#4a62c0']), shoe: ramp(['#6a6c78', '#a4a6b0', '#dcdcda', '#fbfaf2']),
    trim: ramp(['#6a6c78', '#a4a6b0', '#dcdcda', '#fbfaf2']), stripe: col('#f2f2ea'),
    deco: function (c) {
      var t = c.tr, y, T = c.ou.trim;
      for (y = t.y0; y <= t.y1; y++) { tset(c, t.x1[y] - 1, y, T[2]); }
      for (var x = t.x0[t.y0]; x <= t.x1[t.y0]; x++) tset(c, x, t.y0, T[1]);
      var by = tpick(c, 0.55); for (var x2 = t.x0[by]; x2 <= t.x1[by] - 2; x2++) tset(c, x2, by, T[3]);
    }
  },
  polo: {                                                    // polo amarillo de delivery (sin marca) y mochila cubo
    top: ramp(['#8a6a0c', '#c99a10', '#f2c81c', '#ffea62']), slv: 'short',
    bot: ramp(['#161f38', '#283a62', '#42598e', '#6580b4']), shoe: ramp(['#14121a', '#2c2a34', '#6a6c78', '#a4a6b0']),
    bag: ramp(['#5a1e0e', '#98381a', '#d85a26', '#ff8c4a']), hat: 'gorra', hatR: ramp(['#0e0e12', '#22222a', '#3e3e48', '#5a5a66']),
    behind: function (c) {
      var t = c.tr, T = c.ou.bag, b = c.b, x0 = t.x0[t.y0] - 5, y0 = t.y0 + 1, w = 6, h = 8;
      pRect(b, x0, y0, w, h, N(T));
      b.rect(x0 + 1, y0 + 2, w - 2, 1, T[1]);
      b.rect(x0, y0 + 2, 1, 1, T[1]);
    },
    deco: function (c) {
      var t = c.tr, y0 = t.y0;
      tset(c, t.x1[y0], y0, c.ou.hatR[1]); tset(c, t.x1[y0] - 1, y0, c.ou.hatR[1]); tset(c, t.x1[y0] - 1, y0 + 1, c.ou.hatR[1]);
      tset(c, t.x1[y0 + 2] - 1, y0 + 2, c.ou.top[0]); tset(c, t.x1[y0 + 3] - 1, y0 + 3, c.ou.top[0]);
      if (!c.P.spec.noBag) for (var y = y0; y <= t.y1; y++) tset(c, t.x0[y] + 1, y, c.ou.bag[1]);           // tirante de la mochila (el de la moto lleva caja, no mochila)
      tset(c, t.x1[t.y1 - 1] - 2, t.y1 - 1, c.ou.top[1]);
    }
  },
  casaca: {                                                  // casaca roja
    top: ramp(['#4e1016', '#861f26', '#c43a34', '#ee6c54']), slv: 'long',
    bot: ramp(['#161f38', '#283a62', '#42598e', '#6580b4']), shoe: ramp(['#6a6c78', '#a4a6b0', '#dcdcda', '#fbfaf2']),
    trim: ramp(['#4a4a50', '#8a8a90', '#c4c4c6', '#e8e8e4']),
    deco: function (c) {
      var t = c.tr, y, T = c.ou.trim;
      for (y = t.y0 + 1; y <= t.y1; y++) tset(c, t.x1[y] - 1, y, T[1]);
      tset(c, t.x1[t.y0], t.y0, c.ou.top[0]); tset(c, t.x1[t.y0] - 1, t.y0, c.ou.top[0]); tset(c, t.x1[t.y0], t.y0 + 1, c.ou.top[0]);
      var py = tpick(c, 0.65); tset(c, t.x1[py] - 4, py, c.ou.top[0]); tset(c, t.x1[py] - 3, py, c.ou.top[0]);
      tset(c, t.x0[t.y0 + 2] + 1, t.y0 + 2, c.ou.top[3]);
    }
  },
  floreada: {                                                // camisa floreada, short color arena, sandalias
    top: ramp(['#1a5a62', '#2a8890', '#48b8b4', '#84e2cc']), slv: 'short', slvPat: true,
    bot: ramp(['#5a4a30', '#826f46', '#ab9664', '#cebb8a']), legs: 'short', shoe: ramp(['#2a1a10', '#5a3a20', '#8a5a30', '#b88650']), sandal: true,
    deco: function (c) {
      var t = c.tr, y, x, cols = [col('#ec5a8c'), col('#f4cc3c'), col('#f6f2e6'), col('#e88a3a')];
      for (y = t.y0 + 1; y <= t.y1 - 1; y++) for (x = t.x0[y]; x <= t.x1[y]; x++) {
        var h = hash(x * 31 + y * 17 + c.P.seed);
        if (h < 0.17) tset(c, x, y, cols[Math.floor(hash(x * 7 + y * 3 + 1) * 4)]);
      }
      tset(c, t.x1[t.y0], t.y0, c.skin[2]); tset(c, t.x1[t.y0] - 1, t.y0, c.skin[1]); tset(c, t.x1[t.y0] , t.y0 + 1, c.skin[1]);
    }
  },
  overol: {                                                  // overol azul de estibador del puerto, casco
    top: ramp(['#14284e', '#244a92', '#3a72c4', '#68a4ec']), slv: 'long', slvR: ramp(['#3c3f46', '#585c64', '#7c808a', '#a4a8b0']),
    bot: ramp(['#14284e', '#244a92', '#3a72c4', '#68a4ec']), shoe: ramp(['#1a1008', '#3a2418', '#5e4030', '#826248']),
    trim: ramp(['#8a6a0c', '#d29a10', '#f6c820', '#ffec7a']), hat: 'casco', hatR: ramp(['#8a6a0c', '#d29a10', '#f6c820', '#ffec7a']), stripe: col('#d2d8d4'),
    deco: function (c) {
      var t = c.tr, y;
      var py = tpick(c, 0.35);
      for (var x = t.x1[py] - 4; x <= t.x1[py] - 2; x++) { tset(c, x, py, c.ou.top[3]); tset(c, x, py + 2, c.ou.top[1]); }
      tset(c, t.x1[py] - 4, py + 1, c.ou.top[3]); tset(c, t.x1[py] - 2, py + 1, c.ou.top[1]);
      for (y = t.y0; y <= t.y0 + 2; y++) tset(c, t.x0[y] + 2, y, c.ou.top[0]);                 // tirante
      tset(c, t.x0[t.y0 + 3] + 2, t.y0 + 3, c.ou.trim[2]);
      var ry = tpick(c, 0.85); for (var x3 = t.x0[ry]; x3 <= t.x1[ry]; x3++) tset(c, x3, ry, c.ou.trim[1]);
    }
  },
  terno: {                                                   // terno viejo y corbata
    top: ramp(['#40322a', '#6a5444', '#9a7f5c', '#c8aa7c']), slv: 'long',
    bot: ramp(['#34281f', '#54443a', '#76604a', '#9c8672']), shoe: ramp(['#16141a', '#2c2832', '#4a4452', '#6c6678']),
    trim: ramp(['#7a1a22', '#a02a30', '#c8443e', '#e0705c']), shirt: ramp(['#7a7460', '#aaa386', '#d2cba8', '#ece6c8']),
    deco: function (c) {
      var t = c.tr, y, x, S2 = c.ou.shirt, T = c.ou.trim;
      for (y = t.y0; y <= t.y1; y++) { tset(c, t.x1[y], y, S2[2]); tset(c, t.x1[y] - 1, y, y < t.y0 + 5 ? T[1] : S2[1]); }
      tset(c, t.x1[t.y0], t.y0, S2[3]); tset(c, t.x1[t.y0] - 1, t.y0, T[2]);
      tset(c, t.x1[t.y0 + 1] - 2, t.y0 + 1, c.ou.top[0]); tset(c, t.x1[t.y0 + 3] - 2, t.y0 + 3, c.ou.top[0]);
      tset(c, t.x1[t.y0 + 5] - 2, t.y0 + 5, c.ou.top[0]);
      // luz de borde en el terno oscuro: hombro y espalda (noroeste) claros, y rayas finas de gis para que no se pierda en el asfalto
      for (y = t.y0; y <= t.y1; y++) { tset(c, t.x0[y], y, c.ou.top[3]); if (y > t.y0) tset(c, t.x0[y] + 1, y, c.ou.top[2]); }
      for (x = t.x0[t.y0]; x <= t.x1[t.y0]; x++) tset(c, x, t.y0, c.ou.top[3]);
      for (y = t.y0 + 2; y <= t.y1; y++) for (x = t.x0[y] + 3; x <= t.x1[y] - 3; x += 3) tset(c, x, y, c.ou.top[2]);
    }
  },
  short: {                                                   // bividi (camiseta sin mangas) y short
    top: ramp(['#6c6a64', '#a09d92', '#d0cdbe', '#eeeadb']), slv: 'none',
    bot: ramp(['#7a2a1a', '#b8452a', '#e06a3c', '#ff9a64']), legs: 'short', shoe: ramp(['#1a1a24', '#3a3a52', '#5a5a86', '#8a8ac0']), sandal: true,
    deco: function (c) {
      var t = c.tr, y, x;
      for (y = t.y0 + 1; y <= t.y1; y++) for (x = t.x0[y]; x <= t.x1[y]; x++) if ((x & 1) === 0) tset(c, x, y, c.ou.top[1]);
      tset(c, t.x1[t.y0], t.y0, c.skin[2]); tset(c, t.x1[t.y0] - 1, t.y0, c.skin[2]); tset(c, t.x1[t.y0] - 1, t.y0 + 1, c.skin[1]);
      tset(c, t.x0[t.y0], t.y0, c.skin[2]);
    }
  }
};

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

/* Decoracion de torso horizontal (gusano, cuatro patas): el chaleco lleva las bandas cruzadas al lomo, etc. */
function decoH(c) {
  var t = c.tr, ou = c.ou, id = c.P.spec.outfit, x, y, x0 = 1e9, x1 = -1;
  for (y = t.y0; y <= t.y1; y++) { if (t.x0[y] < x0) x0 = t.x0[y]; if (t.x1[y] > x1) x1 = t.x1[y]; }
  var len = x1 - x0, midY = Math.round((t.y0 + t.y1) / 2);
  function col_(xx, cc) { for (var yy = t.y0; yy <= t.y1; yy++) tset(c, xx, yy, cc); }
  if (id === 'chaleco') { col_(x0 + Math.round(len * 0.3), ou.trim[2]); col_(x0 + Math.round(len * 0.7), ou.trim[2]); }
  else if (id === 'buzo' || id === 'casaca') { for (x = x0 + 1; x <= x1 - 1; x++) tset(c, x, midY, id === 'buzo' ? ou.trim[3] : ou.trim[1]); }
  else if (id === 'polo') { for (y = t.y0; y <= t.y1; y++) { tset(c, x0, y, ou.bag[2]); tset(c, x0 + 1, y, ou.bag[2]); tset(c, x0 + 2, y, ou.bag[1]); } tset(c, x0, t.y0, ou.bag[3]); }
  else if (id === 'floreada') { for (y = t.y0; y <= t.y1; y++) for (x = t.x0[y]; x <= t.x1[y]; x++) if (hash(x * 31 + y * 17 + c.P.seed) < 0.2) tset(c, x, y, [col('#ec5a8c'), col('#f4cc3c'), col('#f6f2e6')][(x + y) % 3]); }
  else if (id === 'short') { for (y = t.y0; y <= t.y1; y += 2) for (x = t.x0[y]; x <= t.x1[y]; x++) tset(c, x, y, ou.top[1]); }
  else if (id === 'terno') { for (x = x1 - 3; x <= x1; x++) tset(c, x, midY, ou.shirt[2]); tset(c, x1 - 1, midY, ou.trim[2]); col_(x0 + 2, ou.top[0]); }
  else if (id === 'overol') { col_(x0 + 2, ou.top[0]); col_(x1 - 3, ou.top[0]); }
  else if (id === 'cocinero' || id === 'enfermera') { for (x = x0 + 2; x <= x1 - 2; x += 2) tset(c, x, t.y0 + 1, ou.top[1]); }
}

/* ======================== FORMAS DE MOVERSE ======================== */
/* Cada loco: { n, cv(bd) -> {W,H,ox,oy}, pose(bd, fr, n, ctx) -> pz }.   Mundo: 0 = suelo, y negativo arriba.
   Los cuadros se dibujan con drawFigure; los vehiculos entran por pz.back / pz.front. */
var SIN = Math.sin, COS = Math.cos, PI = Math.PI, abs = Math.abs, max = Math.max, min = Math.min, round = Math.round;

function baseCv(bd, W, ox, up) { var H = bd.hpx + 5 + (up || 0); return { W: W, H: H, ox: ox, oy: H - 2 }; }

/* ---- camina: arrastra los pies. Tres andares: 'reach' (brazos al frente), 'hang' (brazos colgando, cabeza caida), 'lurch' (un brazo al frente, cojeando) ---- */
function poseCamina(bd, fr, n, P) {
  var gait = (P && P.spec && P.spec.gait) || 'reach';
  var ph = fr / n * PI * 2, s = SIN(ph), cs = COS(ph), k = bd.legD / 9, st = (gait === 'hang' ? 2.5 : 3.1) * k;
  var Hy = bd.hipY + (abs(s) > 0.85 ? 0.7 : 0), Hx = 0;
  var lean = (gait === 'hang' ? 3.4 : gait === 'lurch' ? 2.6 : 2) + bd.hunch * 0.9, Sx = Hx + lean, Sy = Hy - (bd.torso - 1) + bd.hunch * 0.4 + (gait === 'hang' ? 0.5 : 0);
  var lN = max(0, cs) * 1.5 * k, lF = max(0, -cs) * (gait === 'lurch' ? 0.5 : 1.5) * k;
  var reach = bd.ua + bd.fa - 1.3, ua = bd.ua + bd.fa - 0.6;
  var aN = { h: [Sx + 0.5 + reach * 0.92, Sy + 4.2 + 0.9 * s], b: -1 }, aF = { h: [Sx + reach * 0.85, Sy + 2.6 - 0.9 * s], b: -1 };
  if (gait === 'hang') { aN = { h: [Sx + 1.5 + 1.2 * s, Sy + ua - 0.6], b: -1 }; aF = { h: [Sx - 0.5 - 1.2 * s, Sy + ua - 1.4], b: -1 }; }
  if (gait === 'lurch') { aF = { h: [Sx - 0.5 - 1.4 * s, Sy + ua - 1.2], b: -1 }; }
  return {
    H: [Hx, Hy], S: [Sx, Sy], hd: [(gait === 'hang' ? 1.5 : 1) + bd.hunch * 0.6, (gait === 'hang' ? 1.5 : 0.5) + bd.hunch * 0.6 + (s > 0.6 ? 0.5 : 0)], mouth: gait === 'hang' ? 'closed' : 'slack',
    aN: aN, aF: aF,
    lN: { f: [Hx + st * s, -1 - lN], p: lN > 0.4 ? 1 : 0 }, lF: { f: [Hx - st * s, -1 - lF], p: lF > 0.4 ? 1 : 0 }
  };
}

var LOCOS = {
  camina: { n: 6, cv: function (bd) { return baseCv(bd, 32, 14, 0); }, pose: poseCamina }
};

/* ======================== BAKE ======================== */
function buildMove(spec, loco, bd) {
  var L = LOCOS[loco], cv = L.cv(bd, spec), n = L.n, ou = OUTFITS[spec.outfit];
  var move = [], hurt = [], P = {
    bd: bd, ou: ou, skin: TONES[spec.tone || 'verde'], hair: spec.hair || 'corto', hc: HAIRS[spec.hc || 'negro'], seed: spec.seed || 1,
    wear: spec.wear === undefined ? 2 : spec.wear, blood: spec.blood || 0, faceBlood: spec.faceBlood || 0, rot: spec.rot, handBlood: spec.handBlood,
    ox: cv.ox, oy: cv.oy, spec: spec, blind: spec.blind
  };
  for (var fr = 0; fr < n; fr++) {
    var b = new Buf(cv.W, cv.H), pz = L.pose(bd, fr, n, P);
    drawFigure(b, P, pz);
    b.outlineRim();
    hurt.push(b.solid().toCanvas(cv.ox, cv.oy));
    if (pz.post) pz.post(b, P);                                  // lo translucido (humo de escape) va despues del contorno y fuera de la silueta del golpe
    move.push(b.toCanvas(cv.ox, cv.oy));
  }
  return { move: move, hurt: hurt, P: P, cv: cv };
}

/* ---- cadaver visto desde arriba, horizontal, cabeza a la izquierda (como el de zombie.caminante) ---- */
function buildDead(spec, bd, ou) {
  var hb = bd.h, hr = hb === 'bajo' ? 3.1 : 3.7, torsoL = hb === 'bajo' ? 7 : hb === 'alto' ? 11 : 9, legL = hb === 'bajo' ? 6 : hb === 'alto' ? 10 : 7, armL = hb === 'bajo' ? 6 : hb === 'alto' ? 9 : 7;
  var th = Math.max(4, bd.tw - 3 + (bd.belly ? 2 : 0) - (bd.thin ? 1 : 0)), tx0 = Math.round(2 * hr) + 1, lx = tx0 + torsoL, cy = 8;
  var W = lx + legL + 5, H = 16, b = new Buf(W, H), sk = TONES[spec.tone || 'verde'], hc = HAIRS[spec.hc || 'negro'], pool = new Buf(W, H);
  var DK = [col('#2e1214'), col('#3f1717'), col('#4a1b1b')];
  pEll(pool, W / 2 - 1, cy + 1, W / 2 - 2, 5.2, DK);
  pEll(pool, W / 2 - 4, cy + 1.5, W / 2 - 8, 3.2, [BLOOD[1], BLOOD[2], BLOOD[2]]);
  var chk = ou.legPat === 'check' ? function (x, y) { return ((x + y) & 1) ? ou.bot[0] : 0; } : null;
  var long_ = ou.slv !== 'none', rs = long_ ? N(ou.slvR || ou.top) : N(sk), top = cy - Math.floor(th / 2), bot = top + th - 1;
  // brazos (mangas y manos)
  [[top - 2, -1, 0], [bot + 2, 1, -1]].forEach(function (a, i) {
    var y0 = a[0], x1 = tx0 + armL - (i ? 1 : 0);
    if (ou.slv === 'long') { pLine(b, tx0 + 1, y0, x1 - 2, y0 + a[1], 2, rs); pLine(b, x1 - 1, y0 + a[1], x1, y0 + a[1], 2, N(sk)); }
    else if (ou.slv === 'short') { pLine(b, tx0 + 3, y0, x1, y0 + a[1], 2, N(sk)); pLine(b, tx0 + 1, y0, tx0 + 4, y0, 2, rs); }
    else pLine(b, tx0 + 1, y0, x1, y0 + a[1], 2, N(sk));
  });
  // piernas y zapatos
  var rp = ou.legs === 'short' ? N(sk) : N(ou.bot);
  pLine(b, lx - 1, cy - 2, lx + legL - 1, cy - 2, 3, rp, chk);
  pLine(b, lx - 1, cy + 1, lx + legL - 2, cy + 2, 3, rp, chk);
  if (ou.legs === 'short') { pLine(b, lx - 1, cy - 2, lx + 2, cy - 2, 3, N(ou.bot)); pLine(b, lx - 1, cy + 1, lx + 2, cy + 1, 3, N(ou.bot)); }
  pRect(b, lx + legL, cy - 3, 3, 3, N(ou.shoe)); pRect(b, lx + legL - 1, cy + 1, 3, 3, N(ou.shoe));
  // torso
  mkBegin(b); mkRect(tx0, top, torsoL, th); paint(b, N(ou.top));
  var id = spec.outfit, x, y;
  if (id === 'chaleco') { b.rect(tx0 + 2, top, 1, th, ou.trim[2]); b.rect(tx0 + 6, top, 1, th, ou.trim[2]); b.rect(tx0, top, 1, th, ou.top[1]); }
  else if (id === 'buzo') { b.rect(tx0 + 1, cy, torsoL - 1, 1, ou.trim[3]); }
  else if (id === 'polo') { b.rect(tx0, top, 3, th, ou.bag[2]); b.rect(tx0, top, 3, 1, ou.bag[3]); b.rect(tx0 + 3, top, 1, th, ou.bag[1]); }
  else if (id === 'terno') { b.rect(tx0 + torsoL - 3, cy - 1, 3, 3, ou.shirt[2]); b.set(tx0 + torsoL - 2, cy, ou.trim[2]); b.rect(tx0 + 2, top, 1, th, ou.top[0]); }
  else if (id === 'overol') { b.rect(tx0 + 1, top, 1, th, ou.top[0]); b.rect(tx0 + 4, cy - 1, 3, 3, ou.top[3]); b.rect(tx0 + torsoL - 2, top, 2, th, ou.slvR[2]); }
  else if (id === 'floreada') { for (var i = 0; i < 7; i++) b.set(tx0 + 1 + Math.floor(hash(i * 9 + 4) * (torsoL - 1)), top + Math.floor(hash(i * 5 + 1) * th), [col('#ec5a8c'), col('#f4cc3c'), col('#f6f2e6')][i % 3]); }
  else if (id === 'short') { for (y = top; y <= bot; y += 2) b.rect(tx0 + 1, y, torsoL - 1, 1, ou.top[1]); }
  else if (id === 'casaca') { b.rect(tx0 + 1, cy, torsoL - 1, 1, ou.trim[1]); }
  else if (id === 'cocinero' || id === 'enfermera') { for (x = tx0 + 2; x < tx0 + torsoL - 1; x += 3) b.set(x, top + 1, ou.top[1]); }
  b.set(tx0 + 3, top + 1, sk[1]); b.set(tx0 + 4, top + 1, sk[2]); b.set(tx0 + 5, bot - 1, BLOOD[2]); b.set(tx0 + 6, bot - 1, BLOOD[1]);
  b.rect(tx0, bot, torsoL, 1, ou.top[0]);
  // cabeza (de arriba): disco de piel, pelo en la parte alta (izquierda)
  var hx = 1 + hr;
  mkBegin(b); mkEll(hx, cy, hr, hr); paint(b, N(sk));
  if (ou.hat === 'casco') { mkBegin(b); mkEll(hx - 0.5, cy, hr, hr - 0.3); paint(b, N(ou.hatR)); b.set(hx - 2, cy, ou.hatR[3]); b.rect(Math.round(hx + hr), cy - 1, 2, 3, ou.hatR[1]); }
  else if (ou.hat === 'toque') { mkBegin(b); mkEll(hx - 0.5, cy, hr, hr - 0.4); paint(b, N(ou.hatR)); }
  else if (ou.hat === 'cofia') { mkBegin(b); mkEll(hx - 1.2, cy, hr - 1, hr - 0.9); paint(b, N(ou.hatR)); }
  else if (ou.hat === 'gorra') { mkBegin(b); mkEll(hx - 0.5, cy, hr - 0.2, hr - 0.2); paint(b, N(ou.hatR)); b.rect(Math.round(hx + hr) - 1, cy - 1, 2, 3, ou.hatR[0]); }
  else if (spec.hair !== 'calvo') { mkBegin(b); mkEll(hx - 1.2, cy, hr - 0.6, hr - 0.2); paint(b, N(hc)); if (spec.hair === 'largo' || spec.hair === 'grena') { b.rect(0, cy - 2, 1, 5, hc[1]); } }
  b.set(Math.round(hx + 1), cy - 1, C_EYE2); b.set(Math.round(hx + 1), cy + 1, C_EYE2); b.set(Math.round(hx + 2), cy, C_MOUTH);
  b.outlineRim();
  pool.blit(b, 0, 0);
  return pool.toCanvas(Math.round(W / 2) - 1, cy);
}

var zvar = {}, zvarList = [];
function bake(spec) {
  var bd = bodyOf(spec.body), ou = OUTFITS[spec.outfit], key = spec.loco + '_' + spec.body + '_' + spec.outfit;
  var r = buildMove(spec, spec.loco, bd);
  var e = { move: r.move, hurt: r.hurt, dead: buildDead(spec, bd, ou) };
  zvar[key] = e;
  zvarList.push({ skin: key, loco: spec.loco, height: bd.h, outfit: spec.outfit, body: spec.body, hpx: bd.hpx, tone: spec.tone || 'verde', n: r.move.length });
  return e;
}

/* ======================== VEHICULOS Y UTILES COMPARTIDOS ======================== */
var METAL = ramp(['#2e343e', '#555e6a', '#8c949a', '#c8ccc6']);
var TIRE = [col('#1c1b22'), col('#2a2a32'), col('#3c3c46')];
var WOOD = ramp(['#3e2a1e', '#6b4223', '#a06a36', '#c99458']);
var VCOLS = {
  rojo:     ramp(['#4a1210', '#862018', '#c8382e', '#ee6c58']),
  celeste:  ramp(['#14484c', '#217a7e', '#38b0ac', '#82dcd2']),
  amarillo: ramp(['#6a4c06', '#b88a0e', '#eec424', '#fff078']),
  verde:    ramp(['#1c4a1c', '#2f7a2c', '#52b048', '#94e07c']),
  naranja:  ramp(['#5a2008', '#a04214', '#e8742c', '#ffac62']),
  azul:     ramp(['#14284e', '#244a92', '#3a72c4', '#68a4ec']),
  negro:    ramp(['#08080c', '#18181f', '#303040', '#565668'])
};
var VINYL = ramp(['#14141c', '#22222e', '#34344a', '#4a4a64']);

/* rueda de perfil: neumatico, aro, rayos que giran con 'ang' (radianes) */
function wheel(b, cx, cy, r, ang, spokes, o) {
  o = o || {};
  var x, y, d, tire = o.tire || TIRE, rim = o.rim || METAL[3], spk = o.spoke || METAL[2], dim = o.dim;
  for (y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) for (x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
    d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
    if (d <= r + 0.45 && d > r - 1.05) b.set(x, y, (x - cx) + (y - cy) < -r * 0.6 ? tire[2] : tire[1]);
    else if (o.rimmed && d <= r - 1.05 && d > r - 1.95) b.set(x, y, dim ? METAL[1] : rim);
  }
  for (var k = 0; k < spokes; k++) {
    var a = ang + k * PI * 2 / spokes;
    b.line(cx, cy, cx + COS(a) * (r - (o.rimmed ? 1.6 : 1.2)), cy + SIN(a) * (r - (o.rimmed ? 1.6 : 1.2)), dim ? METAL[1] : spk);
  }
  b.rect(Math.round(cx) - 0, Math.round(cy) - 0, 2, 2, dim ? METAL[1] : METAL[3]);
  b.set(Math.round(cx), Math.round(cy), METAL[0]);
}

/* ---------- skate ---------- */
function drawBoard(b, cx, gy, vc, spin) {                    // cx = centro, gy = fila del suelo (los ruedas tocan aqui)
  var x;
  // ruedas (cremas) y ejes
  [-6, 6].forEach(function (dx) {
    b.rect(cx + dx - 1, gy - 2, 3, 3, col('#d8d2bc')); b.set(cx + dx - 1, gy - 2, col('#f2eedc')); b.set(cx + dx + 1, gy, col('#9a957f')); b.set(cx + dx, gy - 1, col(spin && ((spin + dx) & 1) ? '#8a8570' : '#b8b39c'));
    b.rect(cx + dx - 1, gy - 3, 3, 1, METAL[2]);
  });
  // tabla: canto de color, grip arriba (negro granulado), puntas levantadas
  for (x = -9; x <= 9; x++) { b.set(cx + x, gy - 5, VINYL[1]); b.set(cx + x, gy - 4, vc[2]); b.set(cx + x, gy - 3, vc[1]); }
  b.set(cx - 10, gy - 6, vc[2]); b.set(cx - 10, gy - 5, VINYL[1]); b.set(cx - 11, gy - 7, vc[3]); b.set(cx + 10, gy - 6, vc[2]); b.set(cx + 10, gy - 5, VINYL[1]); b.set(cx + 11, gy - 7, vc[3]);
  for (x = -9; x <= 9; x += 3) b.set(cx + x, gy - 5, VINYL[3]);
  b.set(cx - 9, gy - 4, vc[3]); b.set(cx - 8, gy - 4, vc[3]);
}

/* ---------- silla de ruedas ---------- */
function chairDims(bd) {
  var R = bd.h === 'bajo' ? 4 : bd.h === 'alto' ? 6 : 5;   // pulido: rueda 1 px mas chica y el asiento a la altura de su tope, para que torso y cabeza queden por encima de la rueda cercana
  return { R: R, hubX: -5, seatY: -(R + 3), footX: Math.round(bd.legD * 0.85), footY: -2 };
}
function drawChairBack(c, d, ang) {                          // rueda lejana + armazon + respaldo + cojin
  var b = c.b, ox = c.ox, oy = c.oy, R = d.R;
  wheel(b, ox + d.hubX + 1, oy - R - 2, R - 0.5, ang + 0.4, 6, { tire: TIRE, rimmed: true, dim: true });
  var sy = oy + d.seatY;
  // respaldo y manijas
  pRect(b, ox - 8, sy - 9, 3, 9, N(VINYL));
  pLine(b, ox - 8, sy - 9, ox - 11, sy - 9, 1, N(METAL)); b.set(ox - 12, sy - 9, METAL[0]); b.set(ox - 12, sy - 10, VINYL[0]);
  // tubo del respaldo hasta el eje y barra trasera
  b.line(ox - 8, sy - 8, ox - 8, sy + 1, METAL[1]);
  b.line(ox - 8, sy + 1, ox + d.hubX, oy - R, METAL[1]);
}
function drawChairFront(c, d, ang) {                         // asiento, soporte de pies, ruedita, rueda cercana
  var b = c.b, ox = c.ox, oy = c.oy, R = d.R, sy = oy + d.seatY;
  // asiento (cojin de vinilo) debajo de la cadera
  pRect(b, ox - 7, sy, 13, 2, N(VINYL));
  b.line(ox + 6, sy + 1, ox + d.footX - 0, oy + d.footY - 1, METAL[2]);                      // tubo hacia el apoyapies
  b.line(ox + 5, sy + 2, ox + d.footX - 1, oy + d.footY, METAL[1]);
  pRect(b, ox + d.footX - 1, oy + d.footY, 5, 1, N(METAL));
  // ruedita delantera
  b.line(ox + 6, sy + 2, ox + d.footX + 1, oy - 3, METAL[1]);
  wheel(b, ox + d.footX + 1, oy - 1.6, 2, ang * 2, 0, { tire: TIRE });
  b.set(ox + d.footX + 1, oy - 2, METAL[3]);
  // rueda grande cercana
  wheel(b, ox + d.hubX, oy - R, R, ang, 6, { tire: TIRE, rimmed: true });
}

var LOCO_EXTRA = {};
LOCOS.silla = {
  n: 6,
  cv: function (bd) { var d = chairDims(bd), H = bd.hpx + 5 - 3; return { W: 38, H: H + 3, ox: 17, oy: H + 1 }; },
  pose: function (bd, fr, n, P) {
    var d = chairDims(bd), ph = fr / n, ang = ph * PI / 3;         // 6 rayos: 60 grados = una vuelta de patron
    var Hx = -1.5, Hy = d.seatY - 1, lean = 1.5 + bd.hunch * 0.8 + (ph < 0.6 ? ph * 1.5 : 0.6);
    var Sx = Hx + lean, Sy = Hy - (bd.torso - 1) + bd.hunch * 0.3;
    // la mano agarra el aro y empuja de las 11 a la 1; luego suelta y vuelve
    var push = ph < 0.62 ? ph / 0.62 : 0, back = ph >= 0.62 ? (ph - 0.62) / 0.38 : 0;
    var a = (-125 + 62 * push - 18 * SIN(back * PI) * 0 - 30 * back) * PI / 180;
    var rr = d.R - 1.2 + (ph >= 0.62 ? -0.2 + 1.2 * SIN(back * PI) : 0);
    var hand = [d.hubX + COS(a) * rr, -d.R + SIN(a) * rr + (ph >= 0.62 ? -SIN(back * PI) * 1.8 : 0)];
    var farHand = [d.hubX + COS(a + 0.5) * rr + 1, -d.R + SIN(a + 0.5) * rr - 2];
    return {
      H: [Hx, Hy], S: [Sx, Sy], hd: [1 + bd.hunch * 0.6, 0.5 + bd.hunch * 0.6], mouth: ph < 0.62 ? 'slack' : 'closed',
      aN: { h: hand, b: -1 }, aF: { h: farHand, b: -1 }, armLate: true,
      lN: { f: [Hx + d.footX - 0.5, d.footY - 2.2], p: 0 }, lF: { f: [Hx + d.footX - 2.5, d.footY - 2.2], p: 0 },
      back: function (c) { drawChairBack(c, d, ang); },
      front: function (c) { drawChairFront(c, d, ang); }
    };
  }
};

/* ---------- carretilla de mercado ---------- */
var LOADS = {
  frutas: function (b, x, y) {                              // naranjas, tomates, papayas
    var cols = [[col('#e07a22'), col('#ffb04a'), col('#9a4a10')], [col('#c8382e'), col('#ff7a62'), col('#7a1a14')], [col('#e8c42c'), col('#fff08a'), col('#9a7a10')], [col('#3d8a2f'), col('#82d062'), col('#1c4a18')]];
    var spots = [[0, 0, 0], [4, 1, 1], [8, 0, 2], [12, 1, 0], [2, -3, 1], [6, -3, 3], [10, -3, 0], [4, -6, 2], [8, -6, 1], [1, 0, 3]];
    spots.forEach(function (s, i) { var cc = cols[s[2]]; b.disc(x + s[0] + 1, y + s[1] + 1, 2.1, cc[0]); b.set(x + s[0], y + s[1], cc[1]); b.set(x + s[0] + 2, y + s[1] + 2, cc[2]); b.set(x + s[0] + 1, y + s[1] - 1, cc[1]); });
  },
  verduras: function (b, x, y) {                            // repollos, lechugas, choclos
    var gr = [ramp(['#1c4a18', '#3d8a2f', '#6cc050', '#b0ee8a']), ramp(['#2a5a20', '#52a03a', '#88d062', '#c4f2a0'])];
    [[0, 1, 0, 2.7], [5, 0, 1, 2.9], [10, 1, 0, 2.6], [3, -4, 1, 2.6], [8, -4, 0, 2.8], [6, -7, 1, 2.2], [12, -3, 1, 2]].forEach(function (s) {
      mkBegin(b); mkEll(x + s[0] + 1, y + s[1], s[3], s[3] - 0.3); paint(b, N(gr[s[2]]));
      b.set(x + s[0], y + s[1] - 1, gr[s[2]][3]); b.set(x + s[0] + 1, y + s[1] + 1, gr[s[2]][0]);
    });
    b.rect(x + 1, y - 8, 2, 3, col('#e8c42c')); b.set(x + 1, y - 8, col('#fff08a')); b.rect(x + 11, y - 7, 2, 3, col('#e8c42c'));
  },
  chatarra: function (b, x, y) {                            // cartones, bolsas y botellas
    pRect(b, x, y - 3, 7, 5, N(ramp(['#4a3422', '#7a5a3a', '#a88458', '#c8a878'])));
    b.rect(x + 1, y - 1, 5, 1, col('#5a4026'));
    pRect(b, x + 6, y - 6, 6, 5, N(ramp(['#3e2e20', '#6a4c30', '#946e44', '#b89460'])));
    b.rect(x + 6, y - 4, 6, 1, col('#4a3422'));
    mkBegin(b); mkEll(x + 11, y - 2, 3, 2.4); paint(b, N(ramp(['#8a8a8e', '#b8b8bc', '#e6e6e4', '#fcfcf8'])));
    b.set(x + 10, y - 3, col('#fcfcf8'));
    [[3, -8], [8, -9], [13, -6]].forEach(function (p, i) { b.rect(x + p[0], y + p[1], 2, 4, [col('#3f8a5a'), col('#c8a24a'), col('#4a74b8')][i]); b.set(x + p[0], y + p[1], col('#e8f0e0')); b.rect(x + p[0], y + p[1] - 1, 2, 1, col('#cfcfcf')); });
  },
  jabas: function (b, x, y) {                               // jabas de pescado/verdura apiladas
    for (var i = 0; i < 2; i++) {
      var yy = y - i * 5; pRect(b, x + i, yy - 4, 12 - i * 2, 5, N(ramp(['#3a2a1c', '#7a5a38', '#b08850', '#d8b878'])));
      b.rect(x + i + 1, yy - 2, 10 - i * 2, 1, col('#5a4026'));
    }
    [[1, -9], [5, -9], [9, -8]].forEach(function (p) { b.disc(x + p[0] + 1, y + p[1], 2, col('#c8382e')); b.set(x + p[0], y + p[1] - 1, col('#ff7a62')); });
  }
};
function cartDraw(c, load, ang, bob) {
  var b = c.b, ox = c.ox, oy = c.oy + bob;
  var bx = ox + 1, by = oy - 13, bw = 22, bh = 9;
  // varas hacia las manos del zombie (detras de la caja)
  pLine(b, bx + 1, by + 5, bx - 9, by + 5, 1, [WOOD[0], WOOD[1], WOOD[3]]);
  pLine(b, bx + 1, by + 7, bx - 9, by + 6, 1, [WOOD[0], WOOD[0], WOOD[1]]);
  // carga (detras del frente de la caja)
  var lf = LOADS[load] || LOADS.frutas; lf(b, bx + 3, by);
  // caja: tablones de madera con costillas, borde claro arriba, travesanos metalicos
  pRect(b, bx, by, bw, bh, N(WOOD));
  for (var y = by + 2; y < by + bh; y += 2) b.rect(bx + 1, y, bw - 2, 1, WOOD[0]);
  b.rect(bx, by, bw, 1, WOOD[3]); b.rect(bx + bw - 3, by, 3, bh, WOOD[1]); b.rect(bx + bw - 3, by, 1, bh, WOOD[0]);
  [bx + 2, bx + 10, bx + 17].forEach(function (x) { b.rect(x, by, 2, bh, METAL[1]); b.set(x, by + 1, METAL[3]); b.set(x, by + 5, METAL[3]); });
  // rueda grande
  wheel(b, ox + 13, oy - 5, 5, ang, 5, { tire: TIRE, spoke: METAL[2] });
  b.set(ox + 13, oy - 5, METAL[3]);
  // pata de apoyo
  b.rect(bx + 2, by + bh, 1, 3, WOOD[0]);
}
LOCOS.carretilla = {
  n: 6,
  cv: function (bd) { var H = bd.hpx + 5; return { W: 52, H: H, ox: 27, oy: H - 2 }; },
  pose: function (bd, fr, n, P) {
    var ph = fr / n * PI * 2, s = SIN(ph), cs = COS(ph), k = bd.legD / 9, st = 3 * k, bob = (abs(s) > 0.85) ? 1 : 0;
    var Hx = -11.5, Hy = bd.hipY + (abs(s) > 0.85 ? 0.7 : 0);
    var Sx = Hx + 3 + bd.hunch * 0.8, Sy = Hy - (bd.torso - 1) + bd.hunch * 0.4;
    var lN = max(0, cs) * 1.2 * k, lF = max(0, -cs) * 1.2 * k;
    return {
      H: [Hx, Hy], S: [Sx, Sy], hd: [1 + bd.hunch * 0.6, 0.5 + bd.hunch * 0.5], mouth: 'slack',
      aN: { h: [-8 + 0.5, -8], b: -1 }, aF: { h: [-8, -9.2], b: -1 }, armLate: true,
      lN: { f: [Hx + st * s, -1 - lN], p: lN > 0.4 ? 1 : 0 }, lF: { f: [Hx - st * s, -1 - lF], p: lF > 0.4 ? 1 : 0 },
      front: function (c) { cartDraw(c, P.spec.load || 'frutas', fr * 0.9, bob ? -1 : 0); }
    };
  }
};

/* ---------- bicicleta ---------- */
function bikeGeo(bd) {
  var R = bd.h === 'bajo' ? 5 : bd.h === 'alto' ? 6 : 5.5, hw = bd.h === 'bajo' ? 7.5 : bd.h === 'alto' ? 9 : 8.2, pr = bd.h === 'bajo' ? 2.1 : bd.h === 'alto' ? 2.9 : 2.5;
  var BBy = -R + 0.2, hipX = -3.3, Lmax = 0.97 * (bd.thigh + bd.shin);
  var dx = hipX, hipY = (BBy + pr - 1.2) - Math.sqrt(Lmax * Lmax - dx * dx);
  return { R: R, hw: hw, pr: pr, BB: [0, BBy], hip: [hipX, hipY], bars: [hw - 1.6, hipY - 0.6], sad: [hipX - 0.6, hipY + 1.6] };
}
function pedalAt(g, th, far) { var a = th + (far ? PI : 0); return [g.BB[0] + COS(a) * g.pr, g.BB[1] + SIN(a) * g.pr]; }
function drawBikeBack(c, g, vc, th, wa) {
  var b = c.b, ox = c.ox, oy = c.oy, x = function (v) { return ox + v; }, y = function (v) { return oy + v; };
  var BB = [x(g.BB[0]), y(g.BB[1])], rear = [x(-g.hw), y(-g.R)], front = [x(g.hw), y(-g.R)], sad = [x(g.sad[0]), y(g.sad[1])], bars = [x(g.bars[0]), y(g.bars[1])];
  wheel(b, rear[0], rear[1], g.R, wa, 4, { tire: TIRE, spoke: METAL[1] });
  wheel(b, front[0], front[1], g.R, wa + 0.3, 4, { tire: TIRE, spoke: METAL[1] });
  var fh = [bars[0] + 0.6, bars[1] + 2], ht = [bars[0] - 0.4, bars[1] + 0.5];
  // marco: horquilla, tubo de direccion, tubo superior, diagonal, tubo del asiento, vainas
  b.line(rear[0], rear[1], BB[0], BB[1], vc[1]); b.line(rear[0], rear[1], sad[0], sad[1] + 1, vc[1]);
  b.line(BB[0], BB[1], sad[0], sad[1] + 1, vc[2]);
  b.line(sad[0] + 1, sad[1] + 2, ht[0] - 1, ht[1] + 2, vc[2]);
  b.line(BB[0], BB[1], ht[0], ht[1] + 4, vc[3]);
  b.line(fh[0] - 0.4, fh[1] - 1, front[0], front[1], METAL[2]); b.line(fh[0] - 0.4, fh[1] - 2, fh[0] - 0.4, fh[1] - 1, vc[2]);
  b.line(ht[0] - 0.4, ht[1], ht[0], ht[1] + 4, vc[2]);
  // cadena (rojo oscuro de aceite) y plato
  b.line(rear[0], rear[1] + 1, BB[0], BB[1] + 1, col('#2a2020'));
  // pedal lejano + biela
  var pf = pedalAt(g, th, true); b.line(BB[0], BB[1], x(pf[0]), y(pf[1]), METAL[1]); b.rect(x(pf[0]) - 1, y(pf[1]), 3, 1, METAL[0]);
  // asiento
  b.rect(sad[0] - 2, sad[1], 4, 1, VINYL[1]); b.rect(sad[0] - 2, sad[1] + 1, 3, 1, VINYL[0]); b.set(sad[0] + 2, sad[1], VINYL[2]); b.set(sad[0] - 2, sad[1], VINYL[3]);
}
function drawBikeFront(c, g, vc, th) {
  var b = c.b, ox = c.ox, oy = c.oy, BB = [ox + g.BB[0], oy + g.BB[1]], pn = pedalAt(g, th, false), bars = [ox + g.bars[0], oy + g.bars[1]];
  b.line(BB[0], BB[1], ox + pn[0], oy + pn[1], METAL[2]); b.rect(ox + Math.round(pn[0]) - 1, oy + Math.round(pn[1]), 3, 1, METAL[0]); b.set(ox + Math.round(pn[0]) + 1, oy + Math.round(pn[1]), METAL[3]);
  b.rect(BB[0] - 1, BB[1] - 1, 2, 2, METAL[1]); b.set(BB[0], BB[1], METAL[3]);                     // plato
  b.rect(bars[0] - 1, bars[1], 3, 1, vc[3]); b.rect(bars[0] + 1, bars[1], 2, 1, VINYL[0]);        // manubrio y puno
  b.set(bars[0] + 3, bars[1] - 1, METAL[3]);                                                       // timbre
}
LOCOS.bici = {
  n: 6,
  cv: function (bd) { var g = bikeGeo(bd), top = -(g.hip[1] - bd.torso - bd.head - 3), H = Math.max(bd.hpx + 5, Math.ceil(top) + 6); return { W: 42, H: H, ox: 20, oy: H - 2 }; },
  pose: function (bd, fr, n, P) {
    var g = bikeGeo(bd), vc = VCOLS[P.spec.bike || 'rojo'], th = fr / n * PI * 2 + 0.4, wa = fr * 0.17;
    var tl = bd.torso - 1, lean = 0.68 + bd.hunch * 0.05, sx = g.hip[0] + tl * SIN(lean) + 0.5, sy = g.hip[1] - tl * COS(lean) + bd.hunch * 0.3;
    var pn = pedalAt(g, th, false), pf = pedalAt(g, th, true);
    var bob = (fr % 3 === 0) ? 0.3 : 0;
    return {
      H: [g.hip[0], g.hip[1]], S: [sx, sy], hd: [1.8, 1.2 + bd.hunch * 0.4], mouth: 'slack',
      aN: { h: [g.bars[0] + 1.2, g.bars[1]], b: -1 }, aF: { h: [g.bars[0] + 0.2, g.bars[1] - 0.5], b: -1 }, armLate: true,
      lN: { f: [pn[0], pn[1] - 1.2], p: 0 }, lF: { f: [pf[0], pf[1] - 1.2], p: 0 },
      back: function (c) { drawBikeBack(c, g, vc, th, wa); },
      front: function (c) { drawBikeFront(c, g, vc, th); }
    };
  }
};

/* ---------- moto de reparto (lineal, con caja trasera sin marca) ---------- */
/* Perfil a la derecha. Ruedas de 5 px de radio en x = -10 y +10, ancla en el suelo entre ellas (largo total ~33 px con la caja). Cuerpo y jinete rebotan 1 px en el cuadro 1; las ruedas no. */
function colA(h, a) { return ((a << 24) | (col(h) & 0xFFFFFF)) >>> 0; }
function drawMotoBike(b, ox, oy, vc, bc, by, wa, foot) {
  function X(v) { return ox + v; } function Y(v) { return oy + v + by; }
  var M = N(METAL), V = N(vc), B = N(bc), VN = N(VINYL), cyl = [METAL[1], METAL[2], METAL[3]];
  wheel(b, ox - 10, oy - 5, 5, wa, 5, { tire: TIRE, rimmed: true, dim: true });
  wheel(b, ox + 10, oy - 5, 5, wa + 0.25, 5, { tire: TIRE, rimmed: true, dim: true });
  b.rect(ox - 11, oy - 6, 2, 2, METAL[2]); b.rect(ox + 9, oy - 6, 2, 2, METAL[2]); b.set(ox - 11, oy - 6, METAL[3]); b.set(ox + 9, oy - 6, METAL[3]);   // cubos
  // brazo oscilante, motor con aletas y caja de cambios, escape cromado
  pLine(b, X(-3), Y(-4.6), ox - 10, oy - 5, 1, [METAL[0], METAL[1], METAL[1]]);
  pLine(b, X(-8), Y(-6.4), X(-14), Y(-8.4), 2, [METAL[1], METAL[2], METAL[3]]);
  b.set(X(-15), Y(-9), METAL[0]); b.set(X(-15), Y(-8), METAL[0]);
  pRect(b, X(0), Y(-11), 5, 5, M); b.rect(X(0), Y(-10), 5, 1, METAL[0]); b.rect(X(0), Y(-8), 5, 1, METAL[0]); b.set(X(0), Y(-11), METAL[3]);
  pEll(b, X(-0.5), Y(-5.4), 3.2, 2.8, M); b.set(X(-1), Y(-6), METAL[3]); b.set(X(-1), Y(-5), METAL[0]); b.set(X(0), Y(-5), METAL[1]);
  // horquilla, guardabarros, faro
  pLine(b, X(8), Y(-13), ox + 10, oy - 5, 2, M);
  pLine(b, X(7), Y(-10.6), X(13), Y(-9.4), 2, V);
  pEll(b, X(11.3), Y(-12.8), 1.9, 2, [METAL[1], METAL[2], METAL[3]]); b.set(X(12.4), Y(-13), col('#fff6b8')); b.set(X(12.4), Y(-12), col('#ffd25a'));
  // tanque, asiento, parrilla y caja
  pEll(b, X(2.6), Y(-12.4), 4.7, 2.5, V); b.line(X(0), Y(-13.6), X(3), Y(-14.2), vc[3]); b.set(X(-1), Y(-13), vc[3]); b.set(X(4), Y(-10.6), vc[0]);
  b.set(X(2), Y(-15), METAL[3]);
  pRect(b, X(-10), Y(-12), 10, 2, VN); b.set(X(-10), Y(-12), VINYL[3]); b.rect(X(-9), Y(-12), 7, 1, VINYL[3]);
  pLine(b, X(-19), Y(-11), X(-8), Y(-11), 1, M);
  pRect(b, X(-18), Y(-20), 10, 9, B);
  b.rect(X(-18), Y(-16), 10, 1, bc[0]); b.rect(X(-18), Y(-15), 10, 1, bc[2]);                                  // juntura de la tapa
  b.rect(X(-10), Y(-16), 1, 2, METAL[3]); b.set(X(-10), Y(-15), METAL[1]);                                    // cierre
  b.rect(X(-16), Y(-19), 4, 3, col('#f3efe2')); b.rect(X(-16), Y(-17), 4, 1, col('#b8b4a4')); b.set(X(-16), Y(-19), col('#ffffff'));   // etiqueta en blanco, sin marca
  b.set(X(-18), Y(-13), col('#e0382e')); b.set(X(-18), Y(-12), col('#a01c18'));                                // catadioptrico
  // estribo
  b.rect(foot[0] - 1, oy + foot[1] + by + 1, 4, 1, METAL[1]); b.rect(foot[0] - 1, oy + foot[1] + by + 2, 4, 1, METAL[0]);
}
LOCOS.moto = {
  n: 3,
  cv: function (bd) { var H = bd.hpx + 5; return { W: 42, H: H, ox: 21, oy: H - 2 }; },
  pose: function (bd, fr, n, P) {
    var vc = VCOLS[P.spec.bike || 'rojo'], bc = VCOLS[P.spec.box || 'amarillo'], by = fr === 1 ? -1 : 0, wa = fr * 0.42;
    var alto = bd.h === 'alto', bajo = bd.h === 'bajo';
    var hx = alto ? -5.4 : -4.6, hy = -12.2 + by, lean = 0.6, tl = bd.torso - 1;
    var sx = hx + tl * SIN(lean) + 0.5, sy = hy - tl * COS(lean) + bd.hunch * 0.3;
    var bx = 6.2 + (alto ? 0.6 : bajo ? -0.6 : 0), byy = -15.4 + by;
    var dLeg = (alto ? 0.62 : 0.78) * (bd.thigh + bd.shin), fx = 1.6 + (alto ? 0.6 : 0), fy = hy + dLeg;
    return {
      H: [hx, hy], S: [sx, sy], hd: [1.6, 1 + bd.hunch * 0.4], mouth: fr === 1 ? 'wide' : 'slack',
      aN: { h: [bx + 0.8, byy], b: -1 }, aF: { h: [bx - 0.2, byy - 0.5], b: -1 }, armLate: true,
      lN: { f: [fx, fy], p: 0 }, lF: { f: [fx - 1.4, fy - 0.9], p: 0 },
      back: function (c) { drawMotoBike(c.b, c.ox, c.oy, vc, bc, by, wa, [c.ox + fx, fy - 1]); },
      front: function (c) {
        var b = c.b, ox = c.ox, oy = c.oy;
        b.rect(ox + Math.round(bx) - 1, oy + Math.round(byy), 4, 1, VINYL[0]); b.set(ox + Math.round(bx) + 2, oy + Math.round(byy), VINYL[3]);   // puno
        b.line(ox + Math.round(bx) - 1, oy + Math.round(byy) - 1, ox + Math.round(bx) - 2, oy + Math.round(byy) - 3, METAL[2]); b.rect(ox + Math.round(bx) - 4, oy + Math.round(byy) - 4, 3, 1, METAL[3]);   // espejo
      },
      post: function (b) {                                                                                        // humo del escape: crece y se disipa
        var P_ = [[[-16, -9], [-17, -9], [-17, -10]], [[-17, -9], [-18, -10], [-18, -8], [-19, -9], [-19, -10]], [[-19, -10], [-20, -9], [-19, -8], [-20, -11], [-21, -10]]][fr];
        var A_ = [170, 135, 90][fr], cc = colA(fr === 2 ? '#aeb2bc' : '#c8ccd4', A_);
        P_.forEach(function (q) { if (!b.get(P.ox + q[0], P.oy + q[1])) b.set(P.ox + q[0], P.oy + q[1], cc); });
      }
    };
  }
};

/* ---------- skate ---------- */
LOCOS.skate = {
  n: 6,
  cv: function (bd) { var H = bd.hpx + 5 + 5; return { W: 42, H: H, ox: 20, oy: H - 2 }; },
  pose: function (bd, fr, n, P) {
    var vc = VCOLS[P.spec.board || 'rojo'], k = bd.legD / 9;
    // fr: 0 empuje, 1 empuje fuerte, 2 despega, 3 balancea, 4 sobre la tabla, 5 sobre la tabla (rebote)
    var T = [
      { back: [-8, -1, 1], front: 5, hipDx: -0.5, crouch: 2.8, lean: 3.4, aN: [7, 1.5], aF: [-5, 3.5] },
      { back: [-10, -1, 1], front: 5, hipDx: -1.5, crouch: 3.4, lean: 3.8, aN: [8, 2.5], aF: [-6, 4.5] },
      { back: [-9, -5, 1], front: 5, hipDx: -1, crouch: 2.4, lean: 3, aN: [8, 0.5], aF: [-6, 2] },
      { back: [-4, -8, 0], front: 5, hipDx: 0, crouch: 2, lean: 2.4, aN: [8, -1.5], aF: [-7, -0.5] },
      { back: [-4, -7, 0], front: 5, hipDx: 0.5, crouch: 3.2, lean: 2.8, aN: [9, -1], aF: [-8, 0.5] },
      { back: [-4, -7, 0], front: 5, hipDx: 0.5, crouch: 2.2, lean: 2.2, aN: [9, -0.5], aF: [-8, 1.5] }
    ][fr];
    var board = -6, Hx = T.hipDx;
    var Hy = (board - 1) - (bd.legD - T.crouch) - 0.5;
    var Sx = Hx + T.lean, Sy = Hy - (bd.torso - 1) + bd.hunch * 0.3;
    var bk = T.back;
    return {
      H: [Hx, Hy], S: [Sx, Sy], hd: [1 + bd.hunch * 0.4, 0.5], mouth: fr < 2 ? 'closed' : 'slack',
      aN: { h: [Sx + T.aN[0], Sy + T.aN[1] + 2], b: -1 }, aF: { h: [Sx + T.aF[0], Sy + T.aF[1] + 2], b: -1 },
      lN: { f: [T.front, board - 1], p: 0 }, lF: { f: [bk[0], bk[1] - 1], p: bk[2] },
      back: function (c) { drawBoard(c.b, c.ox, c.oy, vc, fr); }
    };
  }
};

/* ---------- cojo: salta en un pie ---------- */
LOCOS.cojo = {
  n: 6,
  cv: function (bd) { return baseCv(bd, 32, 14, 6); },
  pose: function (bd, fr, n, P) {
    var k = bd.legD / 9;
    // up = altura de los pies, crouch = rodilla doblada, lean = inclinacion
    var T = [
      { up: 0, cr: 3.4, lean: 3.4, aN: [-3.5, 6], aF: [-2, 5], leg: [-3, 5], m: 'closed' },
      { up: 0.6, cr: 0.8, lean: 2.2, aN: [6.5, -1], aF: [5, -3], leg: [-4, 4], m: 'slack' },
      { up: 3.6, cr: 0, lean: 1, aN: [6, -3.5], aF: [-4, -2.5], leg: [-5, 3], m: 'wide' },
      { up: 5.6, cr: 0, lean: 0.4, aN: [7.5, 0], aF: [-6, -1.5], leg: [-4, 2], m: 'wide' },
      { up: 3.2, cr: 0, lean: 1.4, aN: [6, 3], aF: [-4.5, 2.5], leg: [-2, 4], m: 'slack' },
      { up: 0, cr: 2.2, lean: 2.8, aN: [3.5, 6], aF: [-2.5, 5.5], leg: [-2, 5], m: 'closed' }
    ][fr];
    var Hy = bd.hipY - T.up * k + T.cr * k, Hx = 0, Sx = Hx + T.lean, Sy = Hy - (bd.torso - 1) + bd.hunch * 0.4;
    return {
      H: [Hx, Hy], S: [Sx, Sy], hd: [1 + bd.hunch * 0.6, 0.5 + T.cr * 0.15 + bd.hunch * 0.5], mouth: T.m,
      aN: { h: [Sx + T.aN[0], Sy + T.aN[1]], b: fr === 2 || fr === 3 ? 1 : -1 }, aF: { h: [Sx + T.aF[0], Sy + T.aF[1]], b: -1 },
      lF: { f: [Hx + 0.5, -1 - T.up * k], p: fr === 1 ? 1 : (fr === 4 ? -1 : 0) },
      lN: { f: [Hx + T.leg[0] * 0.5, Hy + T.leg[1] * k], p: 0, stump: 0.66 }
    };
  }
};

/* ---------- muletas ---------- */
function crutch(b, ax, ay, tx, ty, hx, hy, far) {
  // aluminio (cerca: base clara con un brillo; lejos: un paso mas oscuro). 3 px de ancho, almohadilla oscura de cuero, empunadura de goma y tope de goma.
  var m = far ? [col('#46505c'), col('#7e8a98'), col('#a8b4c0')] : [col('#566270'), col('#b0bcc8'), col('#eef4f8')];
  var pad = far ? [col('#2a2018'), col('#4a382c'), col('#6a5444')] : [col('#34261e'), col('#5a4638'), col('#9a8068')];
  var grip = far ? [col('#1e1612'), col('#3a2a22')] : [col('#241a14'), col('#4e3a2e')];
  var rub = far ? [col('#141216'), col('#34303a')] : [col('#141216'), col('#56525e')];
  ax = Math.round(ax); ay = Math.round(ay); hx = Math.round(hx); hy = Math.round(hy);
  b.line(ax, ay, tx, ty, m[1]);
  b.line(ax - 1, ay, tx - 1, ty, m[2]);
  b.line(ax + 1, ay + 1, tx + 1, ty, m[0]);
  b.rect(ax - 2, ay - 2, 6, 3, pad[1]); b.rect(ax - 2, ay - 2, 6, 1, pad[2]); b.rect(ax - 2, ay, 6, 1, pad[0]);      // almohadilla de la axila
  b.rect(hx - 2, hy - 1, 5, 2, grip[1]); b.rect(hx - 2, hy, 5, 1, grip[0]); b.set(hx - 2, hy - 1, m[2]);             // empunadura
  b.rect(tx - 2, ty + 1, 5, 2, rub[1]); b.rect(tx - 2, ty + 2, 5, 1, rub[0]);                                        // goma del extremo
}
LOCOS.muletas = {
  n: 6,
  cv: function (bd) { return baseCv(bd, 38, 14, 0); },
  pose: function (bd, fr, n, P) {
    var k = bd.legD / 9;
    // paso "swing-through": las muletas se plantan adelante, el cuerpo se balancea entre ellas y llega con las piernas colgando
    var up = [0, 1.4, 2.4, 1.2, 0, 0][fr], lean = [3.2, 2.6, 1.6, 1, 2, 3][fr] + bd.hunch * 0.8;
    var tx = [9, 8.5, 7.5, 6, 6.5, 9][fr], tl = [0, 0, 0, 0, 3.4, 3.6][fr];
    var fx = [-3.2, -1, 1.6, 4.4, 3, 0.6][fr], fl = [1.2, 3.2, 3.6, 0, 0, 1][fr];
    var Hy = bd.hipY - up * k * 0.7, Hx = [0, 0.5, 1.5, 2.2, 1.5, 0.5][fr], Sx = Hx + lean, Sy = Hy - (bd.torso - 1) + bd.hunch * 0.4;
    var axN = [Sx + 1, Sy + 2.2], axF = [Sx - 0.5, Sy + 1.8];
    var tipN = [Hx + tx + 1.5, -tl], tipF = [Hx + tx - 2, -tl + (tl ? 0.3 : 0)];
    function handAt(a, t) { var u = 0.42; return [lerp(a[0], t[0], u), lerp(a[1], t[1], u)]; }
    var hN = handAt(axN, tipN), hF = handAt(axF, tipF);
    return {
      H: [Hx, Hy], S: [Sx, Sy], hd: [1 + bd.hunch * 0.6, 0.6 + bd.hunch * 0.5], mouth: fr === 0 || fr === 5 ? 'slack' : 'closed',
      aN: { h: [hN[0], hN[1]], b: -1, big: 1 }, aF: { h: [hF[0], hF[1]], b: -1, big: 1 },
      lN: { f: [Hx + fx, -1 - fl], p: fl > 1 ? 1 : 0 }, lF: { f: [Hx + fx - 2.2, -2 - fl - 1.2], p: 1, cast: true },
      back: function (c) { crutch(c.b, c.ox + axF[0], c.oy + axF[1], Math.round(c.ox + tipF[0]), Math.round(c.oy + tipF[1]), c.ox + hF[0], c.oy + hF[1], true); },
      front: function (c) { crutch(c.b, c.ox + axN[0], c.oy + axN[1], Math.round(c.ox + tipN[0]), Math.round(c.oy + tipN[1]), c.ox + hN[0], c.oy + hN[1], false); },
      armLate: true
    };
  }
};

/* ---------- gusano: se arrastra sobre la barriga ---------- */
LOCOS.gusano = {
  n: 6,
  cv: function (bd) {
    var tl = bd.torso + 2, left = Math.ceil(tl / 2 + bd.thigh + bd.shin + 3), right = Math.ceil(tl / 2 + bd.ua + bd.fa + 7);
    return { W: left + right + 3, H: 17, ox: left + 1, oy: 15 };
  },
  pose: function (bd, fr, n, P) {
    var tl = bd.torso + 2, hx = -tl / 2 - 1, sx = tl / 2 - 1, cy = -2.5;
    var tabN = [[9.5, 0], [7, 0], [4, 0], [3, -2.6], [6, -3.2], [9, -1.4]], tabF = [[4, 0], [3, -2.6], [6, -3.2], [9, -1.4], [9.5, 0], [7, 0]];
    var reach = (bd.ua + bd.fa) / 8, a = tabN[fr], f = tabF[fr], pull = fr === 2 ? 1 : (fr === 3 ? 0.6 : 0), c = (fr % 3);
    var kk = [0, 1, 2, 1, 0, 1][fr];
    return {
      H: [hx + 1 - pull, cy], S: [sx + pull * 0.5, cy], tw: 5, horiz: true, hd: [3.2, -0.5 - [0, 0.5, 1, 1, 0.5, 0][fr]], mouth: 'slack',
      aN: { h: [sx + a[0] * reach + 1, a[1] - 1.2], b: 1 }, aF: { h: [sx + f[0] * reach - 1, f[1] - 2.6], b: 1 },
      lN: { f: [hx - bd.legD * 0.95 + 2 + kk, -1.8 - (fr === 4 ? 1 : 0)], p: 1, bend: -1 }, lF: { f: [hx - bd.legD * 0.85 - 1 + (2 - kk), -3.6], p: 1, bend: -1 }
    };
  }
};

/* ---------- cuatro: en cuatro patas, a saltos, codos y rodillas hacia arriba como una arana ---------- */
LOCOS.cuatro = {
  n: 6,
  cv: function (bd) { return { W: 46, H: bd.hpx + 4, ox: 23, oy: bd.hpx + 2 }; },
  pose: function (bd, fr, n, P) {
    var tl = (bd.torso + 1) * 0.9, sc = bd.legD / 9;
    var T = [
      { hy: -9,   sy: -7,   hand: [6.5, -1.2], foot: [-2.5, -1.2], air: 0 },
      { hy: -10,  sy: -7.5, hand: [8, -1.2], foot: [-6.5, -1.2], air: 0 },
      { hy: -13,  sy: -11,  hand: [11.5, -8],   foot: [-9, -7.5],   air: 1 },
      { hy: -14.5, sy: -12.5, hand: [12, -11], foot: [-10, -9],  air: 1 },
      { hy: -11,  sy: -9,   hand: [9.5, -1.2],   foot: [-6, -5.5],   air: 1 },
      { hy: -9.5, sy: -7.5, hand: [7, -1.2],   foot: [-3, -1.2],   air: 0 }
    ][fr];
    var Hx = -tl / 2 - 0.5, Sx = Hx + tl, ha = (bd.ua + bd.fa) / 8, la = bd.legD / 9;
    return {
      H: [Hx, T.hy], S: [Sx, T.sy], tw: 5, horiz: true, hd: [3.4, -0.3 - (T.air ? 1.2 : 0)], mouth: 'wide',
      aN: { h: [Sx + T.hand[0] * ha, T.hand[1]], b: 1 }, aF: { h: [Sx + T.hand[0] * ha - 3.5, T.hand[1] - (T.air ? 2 : 0.6)], b: 1 },
      lN: { f: [Hx + T.foot[0] * la, T.foot[1]], p: T.air ? 1 : 0, bend: 1 }, lF: { f: [Hx + T.foot[0] * la + 3, T.foot[1] - (T.air ? 1.5 : 0.8)], p: T.air ? 1 : 0, bend: 1 }
    };
  }
};

/* ---------- cantor: camina cantando, un brazo en alto ---------- */
function musicNote(b, x, y, c1, c2) {                         // corchea: cabeza abajo a la izquierda, plica, bandera
  [[3, 0], [4, 0], [3, 1], [5, 1], [3, 2], [3, 3], [1, 4], [2, 4], [3, 4], [1, 5], [2, 5]].forEach(function (p) { b.set(x + p[0], y + p[1], p[1] >= 4 ? c2 : c1); });
}
LOCOS.cantor = {
  n: 6,
  cv: function (bd) { return baseCv(bd, 34, 13, 5); },
  pose: function (bd, fr, n, P) {
    var ph = fr / n * PI * 2, s = SIN(ph), cs = COS(ph), k = bd.legD / 9, st = 3.4 * k;
    var Hy = bd.hipY + (abs(s) > 0.85 ? 0.8 : 0), Hx = 0, lean = 0.4 + bd.hunch * 0.9, Sx = Hx + lean, Sy = Hy - (bd.torso - 1) + bd.hunch * 0.4;
    var lN = max(0, cs) * 2.1 * k, lF = max(0, -cs) * 2.1 * k, up = bd.ua + bd.fa;
    return {
      H: [Hx, Hy], S: [Sx, Sy], hd: [-0.5 + bd.hunch * 0.4, -0.8 + (s > 0.5 ? 0.6 : 0)], mouth: 'wide',
      aN: { h: [Sx + 8.6 + 0.8 * s, Sy - 6.2 + 0.6 * cs], b: -1 }, aF: { h: [Sx + 3.4, Sy + 4 + 0.4 * s], b: -1 },
      lN: { f: [Hx + st * s, -1 - lN], p: lN > 0.5 ? 1 : 0 }, lF: { f: [Hx - st * s, -1 - lF], p: lF > 0.5 ? 1 : 0 },
      front: function (c) {
        var nx = c.ox + Sx + 12, ny = c.oy + Sy - 9 - (fr % 3) * 2;
        musicNote(c.b, Math.round(nx + (fr % 2) * 2), Math.round(ny), col('#f6e8a0'), col('#e6c860'));
        if (fr % 3 === 1) musicNote(c.b, Math.round(nx - 3), Math.round(ny - 4), col('#f6e8a0'), col('#e6c860'));
      }
    };
  }
};

/* ======================== PROPS SUELTOS ======================== */
function propCanvas(w, h, ax, ay, fw, fh, fn) {
  var b = new Buf(w, h), shadow = new Buf(w, h);
  fn(b);
  b.outlineRim();
  var c = b.toCanvas(ax, ay, fw, fh);
  return c;
}
function buildSkateProp(color) {                              // tabla rodando sola (de costado)
  return propCanvas(28, 14, 14, 12, 18, 6, function (b) { drawBoard(b, 14, 12, VCOLS[color], 1); });
}
function buildBikeFallen(color) {                             // bici caida de lado, vista 3/4 desde arriba: dos ruedas tumbadas, triangulo del cuadro, manubrio, sillin, pedal y sombra
  var vc = VCOLS[color], W = 38, H = 20;
  var b = new Buf(W, H), SH = ((0x66 << 24) | (0x40 << 16) | (0x24 << 8) | 0x2a) >>> 0;   // violeta #2a2440 al 40 %
  function wheelE(cx, cy, rx, ry, a0) {                       // disco tumbado: neumatico de 2 px con brillo arriba-izquierda, aro metalico, 6 rayos y cubo
    var x, y;
    for (y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      var dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy;
      var ex = (x - cx) / (rx - 1.8), ey = (y - cy) / (ry - 1.5), di = ex * ex + ey * ey;
      var mx = (x - cx) / (rx - 1.0), my = (y - cy) / (ry - 0.8), dm = mx * mx + my * my;
      if (d <= 1.05 && dm > 1) b.set(x, y, dx + dy < -0.55 ? TIRE[2] : TIRE[1]);       // goma
      else if (dm <= 1 && di > 1) b.set(x, y, dx + dy < -0.3 ? METAL[3] : METAL[2]);    // aro
    }
    for (var k = 0; k < 6; k++) { var a = a0 + k * PI / 3; b.line(cx, cy, cx + COS(a) * (rx - 2.2), cy + SIN(a) * (ry - 1.9), METAL[1]); }
    b.rect(Math.round(cx) - 1, Math.round(cy) - 1, 2, 2, METAL[3]); b.set(Math.round(cx), Math.round(cy), METAL[0]);
  }
  var R = [9, 12], F = [29, 13], BB = [18, 14], S = [12, 6], Hh = [26, 6];
  wheelE(R[0], R[1], 7.4, 4.6, 0.3); wheelE(F[0], F[1], 7.4, 4.6, 0.9);
  function tube(p, q, hi) {                                    // tubo del cuadro: 2 px, brillo arriba, sombra abajo
    b.line(p[0], p[1], q[0], q[1], vc[2]); b.line(p[0], p[1] + 1, q[0], q[1] + 1, vc[1]); if (hi) b.line(p[0], p[1] - 1, q[0], q[1] - 1, vc[3]);
  }
  tube(R, BB, false); tube(BB, S, true); tube(S, R, false); tube(S, Hh, true); tube(BB, Hh, false);   // triangulo principal y tirantes
  b.line(Hh[0], Hh[1], F[0], F[1], METAL[2]); b.line(Hh[0] + 1, Hh[1], F[0] + 1, F[1], METAL[1]);    // horquilla
  // sillin con tija
  b.line(S[0], S[1], S[0] - 1, S[1] - 3, METAL[2]);
  b.rect(S[0] - 5, S[1] - 5, 7, 2, VINYL[2]); b.rect(S[0] - 5, S[1] - 5, 7, 1, VINYL[3]); b.rect(S[0] - 5, S[1] - 4, 7, 1, VINYL[0]);
  // manubrio: potencia y barra atravesada, con punos de goma y timbre
  b.line(Hh[0], Hh[1], Hh[0] + 1, Hh[1] - 3, METAL[3]);
  b.line(Hh[0] - 3, Hh[1] - 5, Hh[0] + 5, Hh[1] - 3, METAL[3]); b.line(Hh[0] - 3, Hh[1] - 4, Hh[0] + 5, Hh[1] - 2, METAL[1]);
  b.rect(Hh[0] - 5, Hh[1] - 5, 2, 2, VINYL[1]); b.rect(Hh[0] + 5, Hh[1] - 3, 3, 2, VINYL[1]); b.set(Hh[0] + 5, Hh[1] - 3, VINYL[3]);
  b.set(Hh[0] + 1, Hh[1] - 5, vc[3]); b.set(Hh[0], Hh[1] - 5, vc[2]);
  // plato, biela y pedal
  b.disc(BB[0], BB[1], 2, METAL[2]); b.set(BB[0] - 1, BB[1] - 1, METAL[3]); b.set(BB[0], BB[1], METAL[0]);
  b.line(BB[0], BB[1], BB[0] + 3, BB[1] + 3, METAL[1]); b.rect(BB[0] + 2, BB[1] + 3, 4, 2, VINYL[1]); b.rect(BB[0] + 2, BB[1] + 3, 4, 1, VINYL[3]);
  b.outlineRim();
  // sombra de contacto debajo (despues del contorno: no se contornea)
  var out = new Buf(W, H), x, y;
  [[9, 16, 8.4, 3], [29, 17, 8.4, 3], [19, 16, 8, 2.4]].forEach(function (e) {
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) { var dx = (x - e[0]) / e[2], dy = (y - e[1]) / e[3]; if (dx * dx + dy * dy <= 1) out.set(x, y, SH); }
  });
  out.blit(b, 0, 0);
  var c = out.toCanvas(19, 17, 28, 10);
  c.shadowIn = true;
  return c;
}
function buildChairEmpty() {
  var W = 34, H = 28, d = chairDims(bodyOf('normal'));
  var b = new Buf(W, H), c = { b: b, ox: 15, oy: 26 };
  drawChairBack(c, d, 0.35); drawChairFront(c, d, 0.35);
  b.outlineRim();
  return b.toCanvas(15, 26, 22, 10);
}

/* ---------- moto caida (props.motoCaida) ---------- */
/* De lado, vista 3/4 desde arriba: dos ruedas tumbadas (discos), el tanque, el asiento, el motor y el escape sobre el eje, el manubrio y el espejo hacia arriba, y la caja con la tapa abierta y lo que llevaba. 46x26, ancla (23,21), huella 34x11. */
function wheelDisc(b, cx, cy, rx, ry, a0) {                       // disco tumbado: neumatico con brillo arriba-izquierda, aro, 5 rayos y cubo
  var x, y;
  for (y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry, d = dx * dx + dy * dy;
    var mx = (x - cx) / (rx - 1.3), my = (y - cy) / (ry - 1.0), dm = mx * mx + my * my;
    var ex = (x - cx) / (rx - 2.2), ey = (y - cy) / (ry - 1.6), di = ex * ex + ey * ey;
    if (d <= 1.05 && dm > 1) b.set(x, y, dx + dy < -0.55 ? TIRE[2] : TIRE[1]);
    else if (dm <= 1 && di > 1) b.set(x, y, dx + dy < -0.3 ? METAL[3] : METAL[2]);
  }
  for (var k = 0; k < 5; k++) { var a = a0 + k * PI * 2 / 5; b.line(cx, cy, cx + COS(a) * (rx - 2.4), cy + SIN(a) * (ry - 1.8), METAL[1]); }
  b.rect(Math.round(cx) - 1, Math.round(cy) - 1, 2, 2, METAL[3]); b.set(Math.round(cx), Math.round(cy), METAL[0]);
}
function buildMotoFallen(color, boxColor) {
  var vc = VCOLS[color], bc = VCOLS[boxColor], W = 48, H = 26, b = new Buf(W, H), V = N(vc), B = N(bc), M = N(METAL), VN = N(VINYL), FOAM = N(ramp(['#8a8a92', '#c0c0c6', '#e6e6e8', '#fcfcfa']));
  var SH = ((0x66 << 24) | (0x40 << 16) | (0x24 << 8) | 0x2a) >>> 0, x, y;
  function sl(x_) { return Math.round((x_ - 24) * 0.13); }                                                              // la moto esta girada: la rueda delantera mas cerca de la camara
  // la caja, arrancada de la parrilla: tirada de espaldas, con la tapa abierta y la comida regada
  pRect(b, 1, 15, 14, 9, B); b.rect(2, 16, 12, 7, col('#2a1c14')); b.rect(2, 16, 12, 1, col('#1a110c')); b.rect(3, 17, 4, 3, col('#f3efe2')); b.rect(3, 19, 4, 1, col('#b8b4a4')); b.rect(8, 18, 4, 3, col('#e0c070')); b.set(9, 18, col('#fff4c0')); b.set(11, 20, col('#c8382e'));
  pRect(b, 0, 11, 14, 4, B); b.rect(0, 13, 14, 1, bc[0]); b.rect(6, 11, 3, 1, bc[3]);                                    // tapa abierta hacia atras
  pRect(b, 15, 20, 5, 3, FOAM); b.set(17, 21, col('#d8a04c')); pRect(b, 20, 23, 4, 2, FOAM);
  // ruedas tumbadas: una con la direccion girada
  wheelDisc(b, 22, 12 + sl(22), 6.8, 4.2, 0.3);
  wheelDisc(b, 40, 15 + sl(40), 6.4, 4.6, 0.9);
  // escape y motor, lado de abajo
  pLine(b, 31, 15, 23, 18, 1, [METAL[0], METAL[1], METAL[2]]); pLine(b, 25, 18.5, 20, 21, 2, [METAL[1], METAL[2], METAL[3]]); b.set(19, 21, METAL[0]);
  pEll(b, 30, 13, 3.6, 2.7, M); b.set(28, 12, METAL[3]); b.set(30, 15, METAL[0]);
  // asiento y tanque aplastados contra el piso (todo medio alto, visto desde arriba)
  pRect(b, 24, 6, 8, 3, VN); b.rect(25, 6, 5, 1, VINYL[3]);
  pEll(b, 34, 8, 4.8, 2.6, V); b.line(31, 6, 36, 6, vc[3]); b.set(30, 7, vc[3]); b.set(37, 9, vc[0]);
  // manubrio torcido, con espejo y faro
  pLine(b, 38, 9, 38, 5, 1, M); b.rect(35, 4, 7, 2, VINYL[1]); b.rect(35, 4, 2, 2, VINYL[3]); b.rect(40, 4, 2, 2, VINYL[0]); b.line(36, 4, 34, 1, METAL[2]); b.rect(32, 0, 3, 1, METAL[3]);
  pEll(b, 45, 15, 1.8, 2.2, [METAL[1], METAL[2], METAL[3]]); b.set(45, 14, col('#fff6b8')); b.set(45, 16, col('#ffd25a'));
  pLine(b, 38, 11, 41, 15, 2, M);                                                                                    // horquilla
  b.rect(16, 3, 8, 1, METAL[1]); b.rect(16, 3, 1, 4, METAL[1]); b.rect(18, 4, 1, 3, METAL[1]); b.rect(22, 4, 1, 3, METAL[1]);       // la parrilla, ya sin caja
  b.outlineRim();
  for (var qi = 0; qi < b.d.length; qi++) if (b.d[qi] === K) b.d[qi] = col('#6a7280');   // QA v0.8: el contorno de abajo/derecha tambien claro: la moto negra no se pierde en el asfalto
  var out = new Buf(W, H);
  [[22, 15 + sl(22), 9, 2.4], [40, 18 + sl(40), 9, 2.6], [30, 20, 18, 2.2], [8, 25, 9, 1.6]].forEach(function (e) {
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) { var dx = (x - e[0]) / e[2], dy = (y - e[1]) / e[3]; if (dx * dx + dy * dy <= 1) out.set(x, y, SH); }
  });
  for (y = 19; y < 24; y++) for (x = 22; x < 33; x++) if (!b.get(x, y) && ((x - 26) * (x - 26)) / 36 + ((y - 21) * (y - 21)) / 5 <= 1) out.set(x, y, ((0x88 << 24) | (0x2a << 16) | (0x1c << 8) | 0x16) >>> 0);   // aceite derramado
  out.blit(b, 0, 0);
  var c = out.toCanvas(24, 20, 38, 11);
  c.shadowIn = true;
  return c;
}

/* ---------- carretilla suelta (props.carretillaSuelta): la de los zombies, sin zombie ---------- */
/* Misma caja, correas y rueda que cartDraw(); las varas bajan al piso y una pata la sostiene. 38x27, ancla (20,24), huella 32x8. */
function cartLoose(c, load, empty) {
  var b = c.b, ox = c.ox, oy = c.oy, bx = ox + 1, by = oy - 13, bw = 22, bh = 9;
  pLine(b, bx + 1, by + 5, bx - 10, oy - 1, 1, [WOOD[0], WOOD[1], WOOD[3]]);
  pLine(b, bx + 1, by + 7, bx - 9, oy, 1, [WOOD[0], WOOD[0], WOOD[1]]);
  if (!empty) (LOADS[load] || LOADS.frutas)(b, bx + 3, by);
  pRect(b, bx, by, bw, bh, N(WOOD));
  for (var y = by + 2; y < by + bh; y += 2) b.rect(bx + 1, y, bw - 2, 1, WOOD[0]);
  b.rect(bx, by, bw, 1, WOOD[3]); b.rect(bx + bw - 3, by, 3, bh, WOOD[1]); b.rect(bx + bw - 3, by, 1, bh, WOOD[0]);
  [bx + 2, bx + 10, bx + 17].forEach(function (x) { b.rect(x, by, 2, bh, METAL[1]); b.set(x, by + 1, METAL[3]); b.set(x, by + 5, METAL[3]); });
  if (empty) { b.rect(bx + 1, by - 1, bw - 2, 1, WOOD[0]); b.rect(bx, by - 1, 1, 1, WOOD[1]); b.rect(bx + bw - 1, by - 1, 1, 1, WOOD[1]); }                 // se ve el borde de adentro
  wheel(b, ox + 13, oy - 5, 5, 0.7, 5, { tire: TIRE, spoke: METAL[2] });
  b.set(ox + 13, oy - 5, METAL[3]);
  b.rect(bx + 2, by + bh, 1, 4, WOOD[0]); b.rect(bx + 1, oy - 1, 3, 1, WOOD[1]);                                                                           // pata de apoyo
}
function buildCartLoose(load, empty) {
  var W = 38, H = 27, b = new Buf(W, H), SH = ((0x66 << 24) | (0x40 << 16) | (0x24 << 8) | 0x2a) >>> 0, x, y;
  cartLoose({ b: b, ox: 12, oy: 24 }, load, empty);
  b.outlineRim();
  var out = new Buf(W, H);
  [[19, 25, 17, 2.2]].forEach(function (e) { for (y = 0; y < H; y++) for (x = 0; x < W; x++) { var dx = (x - e[0]) / e[2], dy = (y - e[1]) / e[3]; if (dx * dx + dy * dy <= 1) out.set(x, y, SH); } });
  out.blit(b, 0, 0);
  var cv = out.toCanvas(20, 24, 32, 8);
  cv.shadowIn = true;
  return cv;
}
function buildCartBroken() {                                       // patas arriba: la caja boca abajo, la rueda al aire, y la fruta por el piso
  var W = 38, H = 27, t = new Buf(W, H), b = new Buf(W, H), SH = ((0x66 << 24) | (0x40 << 16) | (0x24 << 8) | 0x2a) >>> 0, x, y;
  cartLoose({ b: t, ox: 12, oy: 24 }, 'frutas', true);
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) { var cc = t.get(x, y); if (cc) b.set(x, 26 - y + 0, cc); }
  // el volteo deja la parte baja de la caja arriba del todo: se desplaza para apoyarla en el piso (fila 22)
  var s2 = new Buf(W, H); for (y = 0; y < H; y++) for (x = 0; x < W; x++) { var q = b.get(x, y); if (q) s2.set(x, y + 6, q); }
  // fruta y cosas por el piso
  var fr = [[col('#e07a22'), col('#ffb04a'), col('#9a4a10')], [col('#c8382e'), col('#ff7a62'), col('#7a1a14')], [col('#e8c42c'), col('#fff08a'), col('#9a7a10')], [col('#3d8a2f'), col('#82d062'), col('#1c4a18')]];
  [[3, 20, 0], [7, 24, 1], [30, 23, 2], [34, 20, 3], [24, 25, 0], [16, 25, 3], [11, 22, 2], [33, 25, 1]].forEach(function (p) { var q = fr[p[2]]; s2.disc(p[0], p[1], 2.1, q[0]); s2.set(p[0] - 1, p[1] - 1, q[1]); s2.set(p[0] + 1, p[1] + 1, q[2]); });
  s2.outlineRim();
  var out = new Buf(W, H);
  [[19, 25, 17, 2.2]].forEach(function (e) { for (y = 0; y < H; y++) for (x = 0; x < W; x++) { var dx = (x - e[0]) / e[2], dy = (y - e[1]) / e[3]; if (dx * dx + dy * dy <= 1) out.set(x, y, SH); } });
  out.blit(s2, 0, 0);
  var cv = out.toCanvas(20, 24, 32, 8);
  cv.shadowIn = true;
  return cv;
}

/* ======================== TABLA DE COMBINACIONES HORNEADAS ======================== */
/* [loco, cuerpo, atuendo, piel, pelo, color de pelo, opciones]   (la clave del skin es loco_cuerpo_atuendo) */
var SKINS = [
  // camina (40 %)
  ['camina', 'normal', 'chaleco', 'verde', 'corto', 'negro', { blood: 1, gait: 'reach' }],
  ['camina', 'alto', 'enfermera', 'gris', 'largo', 'rubio', { blood: 2, faceBlood: 1, gait: 'hang' }],
  ['camina', 'bajo', 'buzo', 'palido', 'corto', 'casta', { gait: 'lurch' }],
  ['camina', 'normal', 'casaca', 'marron', 'calvo', 'negro', { blood: 1, gait: 'reach' }],
  ['camina', 'normalAncho', 'cocinero', 'amarillo', 'calvo', 'negro', { blood: 2, handBlood: 1, gait: 'hang' }],
  ['camina', 'altoFlaco', 'terno', 'morado', 'cana', 'gris', { faceBlood: 1, gait: 'lurch' }],
  ['camina', 'bajoAncho', 'overol', 'verde', 'grena', 'rojizo', { gait: 'reach' }],
  ['camina', 'normalJoroba', 'floreada', 'gris', 'largo', 'negro', { blood: 1, gait: 'lurch' }],
  ['camina', 'alto', 'polo', 'palido', 'corto', 'negro', { faceBlood: 1, gait: 'hang' }],
  ['camina', 'normalFlaco', 'short', 'marron', 'grena', 'negro', { blood: 1, gait: 'lurch' }],
  ['camina', 'bajo', 'chaleco', 'marron', 'corto', 'casta', { gait: 'reach' }],
  ['camina', 'normal', 'buzo', 'verde', 'largo', 'casta', { faceBlood: 1, gait: 'hang' }],
  // cojo
  ['cojo', 'normal', 'floreada', 'verde', 'corto', 'negro', { blood: 1 }],
  ['cojo', 'alto', 'chaleco', 'gris', 'grena', 'casta', {}],
  ['cojo', 'bajo', 'polo', 'amarillo', 'corto', 'negro', { faceBlood: 1 }],
  ['cojo', 'normalFlaco', 'overol', 'palido', 'calvo', 'negro', {}],
  // muletas
  ['muletas', 'normal', 'terno', 'verde', 'cana', 'gris', {}],
  ['muletas', 'altoFlaco', 'casaca', 'palido', 'corto', 'negro', { blood: 1 }],
  ['muletas', 'bajoAncho', 'short', 'marron', 'calvo', 'negro', {}],
  ['muletas', 'normalJoroba', 'buzo', 'gris', 'largo', 'negro', { faceBlood: 1 }],
  // silla (y el gusano en que se convierte)
  ['silla', 'alto', 'terno', 'verde', 'cana', 'gris', { blood: 1 }],
  ['silla', 'normalAncho', 'cocinero', 'palido', 'calvo', 'negro', { blood: 2 }],
  ['silla', 'bajo', 'enfermera', 'gris', 'largo', 'rubio', {}],
  // gusano
  ['gusano', 'alto', 'terno', 'verde', 'cana', 'gris', { blood: 1 }],
  ['gusano', 'normalAncho', 'cocinero', 'palido', 'calvo', 'negro', { blood: 2 }],
  ['gusano', 'bajo', 'enfermera', 'gris', 'largo', 'rubio', {}],
  ['gusano', 'normal', 'short', 'marron', 'corto', 'negro', { blood: 1 }],
  ['gusano', 'normalFlaco', 'floreada', 'amarillo', 'grena', 'rojizo', {}],
  // cuatro
  ['cuatro', 'normal', 'casaca', 'verde', 'corto', 'negro', { blood: 1 }],
  ['cuatro', 'bajo', 'short', 'gris', 'calvo', 'negro', { faceBlood: 1 }],
  ['cuatro', 'altoFlaco', 'buzo', 'morado', 'largo', 'negro', {}],
  // skate
  ['skate', 'normalFlaco', 'short', 'marron', 'grena', 'negro', { board: 'rojo' }],
  ['skate', 'bajo', 'chaleco', 'marron', 'corto', 'casta', { board: 'celeste' }],
  ['skate', 'normal', 'buzo', 'verde', 'largo', 'casta', { board: 'amarillo' }],
  // bici
  ['bici', 'alto', 'polo', 'palido', 'corto', 'negro', { bike: 'rojo' }],
  ['bici', 'bajo', 'buzo', 'palido', 'corto', 'casta', { bike: 'celeste' }],
  ['bici', 'normal', 'casaca', 'marron', 'calvo', 'negro', { bike: 'amarillo' }],
  // moto de reparto (v0.8): moto roja con caja amarilla, negra con caja roja, y de uniforme: negra con caja y polo amarillos
  ['moto', 'bajo', 'chaleco', 'marron', 'corto', 'casta', { bike: 'rojo', box: 'amarillo', noBag: 1, blood: 1 }],
  ['moto', 'normal', 'buzo', 'verde', 'largo', 'casta', { bike: 'negro', box: 'rojo', noBag: 1, faceBlood: 1 }],
  ['moto', 'alto', 'polo', 'palido', 'corto', 'negro', { bike: 'negro', box: 'amarillo', noBag: 1 }],
  // carretilla (con carga de mercado)
  ['carretilla', 'normalAncho', 'overol', 'verde', 'calvo', 'negro', { load: 'frutas' }],
  ['carretilla', 'alto', 'floreada', 'gris', 'cana', 'gris', { load: 'verduras' }],
  ['carretilla', 'bajoAncho', 'casaca', 'marron', 'corto', 'negro', { load: 'chatarra' }],
  ['carretilla', 'normal', 'cocinero', 'palido', 'corto', 'casta', { load: 'jabas' }],
  // cantor
  ['cantor', 'alto', 'floreada', 'verde', 'largo', 'casta', { blood: 1 }],
  ['cantor', 'normal', 'terno', 'palido', 'cana', 'gris', { faceBlood: 1 }],
  ['cantor', 'bajo', 'casaca', 'gris', 'grena', 'negro', {}],
  ['cantor', 'normalAncho', 'enfermera', 'amarillo', 'largo', 'rubio', { blood: 2 }]
];
var PROP_CACHE = {};
function propFor(kind, color, box) {
  var k = kind + color + (box || '');
  if (!PROP_CACHE[k]) PROP_CACHE[k] = kind === 'bici' ? buildBikeFallen(color) : kind === 'moto' ? buildMotoFallen(color, box) : buildSkateProp(color);
  return PROP_CACHE[k];
}
SKINS.forEach(function (r, i) {
  var spec = { loco: r[0], body: r[1], outfit: r[2], tone: r[3], hair: r[4], hc: r[5], seed: 11 + i * 7 };
  var o = r[6] || {}; for (var k in o) spec[k] = o[k];
  var e = bake(spec), x = e.extra = {};
  if (spec.loco === 'bici') { x.after = 'camina_' + spec.body + '_' + spec.outfit; x.prop = propFor('bici', spec.bike); x.bike = spec.bike; }
  else if (spec.loco === 'skate') { x.after = 'camina_' + spec.body + '_' + spec.outfit; x.prop = propFor('skate', spec.board); x.board = spec.board; }
  else if (spec.loco === 'moto') { x.after = 'camina_' + spec.body + '_' + spec.outfit; x.prop = propFor('moto', spec.bike, spec.box); x.bike = spec.bike; x.box = spec.box; }
  else if (spec.loco === 'silla') { x.after = 'gusano_' + spec.body + '_' + spec.outfit; x.prop = S.props && S.props.sillaRuedas; }
  else if (spec.loco === 'carretilla') { x.load = spec.load; x.shield = { x0: 1, x1: 23, y0: -21, y1: -4 }; }   // frente de la carretilla, relativo a ax/ay (mira a la derecha)
  else if (spec.loco === 'muletas') { x.reach = 7; }
  else if (spec.loco === 'cantor') { x.noise = 90; }
  if (!Object.keys(x).length) delete e.extra;
});

/* Registro publico. zvar no es enumerable en ACH.sprites: asi la hoja generica de preview.html no vuelca cientos de lienzos;
   el motor lo usa por nombre (ACH.sprites.zvar[skin]) y la hoja tiene su propia seccion. */
S.props = S.props || {};
S.props.skateSuelto = propFor('skate', 'rojo'); S.props.skateSuelto.alt = ['rojo', 'celeste', 'amarillo'].map(function (c) { return propFor('skate', c); });
S.props.biciCaida = propFor('bici', 'rojo'); S.props.biciCaida.alt = ['rojo', 'celeste', 'amarillo'].map(function (c) { return propFor('bici', c); });
S.props.sillaRuedas = buildChairEmpty();
S.props.motoCaida = propFor('moto', 'rojo', 'amarillo'); S.props.motoCaida.alt = [['rojo', 'amarillo'], ['negro', 'rojo'], ['negro', 'amarillo']].map(function (c) { return propFor('moto', c[0], c[1]); });
S.props.carretillaSuelta = buildCartLoose('frutas', false);
S.props.carretillaSuelta.alt = ['frutas', 'verduras', 'chatarra', 'jabas'].map(function (l) { return buildCartLoose(l, false); });
S.props.carretillaSuelta.empty = buildCartLoose('frutas', true);
S.props.carretillaSuelta.broken = buildCartBroken();
Object.keys(zvar).forEach(function (k) { if (zvar[k].extra && zvar[k].extra.prop === undefined && /^silla/.test(k)) zvar[k].extra.prop = S.props.sillaRuedas; });
Object.defineProperty(S, 'zvar', { value: zvar, enumerable: false, writable: true, configurable: true });
var LW = { camina: 0.42, cojo: 0.07, muletas: 0.06, silla: 0.05, gusano: 0.06, cuatro: 0.05, skate: 0.06, bici: 0.06, carretilla: 0.1, cantor: 0.07, moto: 0.02 }, cnt = {};
zvarList.forEach(function (r) { cnt[r.loco] = (cnt[r.loco] || 0) + 1; });
zvarList.forEach(function (r) { r.w = LW[r.loco] / cnt[r.loco]; });           // peso de sorteo: ~40 % camina, el resto mezclado (SPEC v0.6b)
S.zvarList = zvarList; S.zvarLocoWeight = LW;

/* ======================== SENORAS ZOMBIE (v0.9, H5b) ======================== */
/* Skins `senoraBalde_<cuerpo>_<atuendo>` y `senoraOlla_<cuerpo>_<atuendo>` (cuerpo: baja ~24 px | normal ~27 px; atuendo: olla | manta | buzo | bata).
   Cada una: { move:[4], windup:[2], attack:[2], hurt:[4], hurtWindup:[2], hurtAttack:[2], dead, extra }. Mira a la derecha, ax/ay = pies.
   Reutilizan drawFigure (cabeza, brazos, piernas, contorno, luz de borde) con cuerpos mas anchos, falda/mandil y utiles propios. */
var SBODY = {};
(function () {
  function mk(name, hpx, head, torso, legD, thigh, shin, ua, fa, tw) {
    var b = { name: 's' + name, h: name, hpx: hpx, head: head, torso: torso, legD: legD, thigh: thigh, shin: shin, ua: ua, fa: fa, tw: tw, belly: 1, hunch: 0, thin: 0, fat: 1 };
    b.hipY = -1 - b.legD; b.shY = b.hipY - (b.torso - 1); b.tL = 4; b.tS = 2; b.aT = 3;
    return b;
  }
  SBODY.baja = mk('baja', 24, 7, 7, 6, 3.2, 3.0, 3.2, 3.2, 9);
  SBODY.normal = mk('normal', 27, 8, 8, 8, 4.2, 4.0, 4, 4, 10);
})();

var BUCKETS = {
  rojo:     ramp(['#4a1008', '#8a2418', '#c4382c', '#ec7058']),
  azul:     ramp(['#102a56', '#1c5496', '#3482cc', '#78b4ea']),
  blanco:   ramp(['#78766e', '#b4b0a6', '#efede8', '#fffffa']),
  negro:    ramp(['#08080a', '#16161a', '#2a2a30', '#4c4c56']),
  amarillo: ramp(['#6a4a06', '#b4840e', '#e8be22', '#fff07a'])
};
var WATER = ramp(['#3a78a6', '#6cb2d8', '#a6dcf0', '#eafafe']);
var POT = ramp(['#08080a', '#18181c', '#2c2c32', '#5a5a64']);
var ALU = ramp(['#62666a', '#92969a', '#c9cbcc', '#f6f8f8']);
var WOOD2 = ramp(['#4a301c', '#7a5230', '#b88b5e', '#dcb582']);

/* ---- atuendos de senora: mismos campos que OUTFITS + skirt/apron/hair ---- */
var SOUT = {
  olla: {                                                     // chaleco verde lima, cofia, mandil verde petroleo, chancletas (investigacion §10)
    top: ramp(['#2f5a0a', '#4a8a10', '#69b818', '#b2e84e']), slv: 'short', slvR: ramp(['#3a5a78', '#5a86aa', '#8fb4d8', '#c8e0f2']),
    bot: ramp(['#0c0c10', '#1a1a20', '#2a2a2e', '#44444c']), shoe: ramp(['#16305a', '#2a5a9a', '#3a78c8', '#78b0ee']), sandal: true,
    trim: ramp(['#8a9a30', '#c8e04a', '#e6f69a', '#fbffe0']), apron: ramp(['#10201f', '#2a4645', '#456261', '#6c8e8a']),
    hat: 'cofia', hatR: ramp(['#7a7870', '#b4b2aa', '#f0eeea', '#fffffa']),
    skirt: { r: 'apron', hem: -5, flare: 2, w0: 9 },
    deco: function (c) {
      var t = c.tr, T = c.ou.trim, A = c.ou.apron, y, x, ay0 = tpick(c, 0.42), r1 = tpick(c, 0.16);
      for (y = ay0; y <= t.y1; y++) for (x = t.x0[y] + 1; x <= t.x1[y]; x++) tset(c, x, y, y === ay0 ? A[3] : (x >= t.x1[y] - 0 ? A[1] : A[2]));
      for (x = t.x0[r1]; x <= t.x1[r1]; x++) tset(c, x, r1, T[2]);                 // banda reflectiva
      for (x = t.x0[r1 + 2] + 1; x <= t.x1[r1 + 2] - 1 && r1 + 2 < ay0; x++) tset(c, x, r1 + 2, c.ou.top[3]);
      tset(c, t.x1[t.y0] - 1, t.y0, A[2]); tset(c, t.x1[t.y0 + 1] - 1, t.y0 + 1, A[2]);   // tirante del mandil
      for (y = t.y0 + 1; y < ay0; y++) tset(c, t.x1[y], y, c.ou.top[0]);
    }
  },
  manta: {                                                    // chompa oscura, falda guinda, manta de colores anudada a la espalda, trenzas, sandalias
    top: ramp(['#1c2234', '#2f3c58', '#46587c', '#6a80a6']), slv: 'long',
    bot: ramp(['#3a1822', '#5a2634', '#6d3746', '#94526c']), legs: 'short', shoe: ramp(['#3a2210', '#6a4220', '#9a6836', '#c8955a']), sandal: true,
    trim: ramp(['#7a1a14', '#b0463a', '#e0b13a', '#3e8a5b']),
    skirt: { r: 'bot', hem: -5, flare: 3, w0: 9, hemC: '#e0b13a' },
    deco: function (c) {
      var t = c.tr, y, T = c.ou.trim;
      for (y = t.y0 + 1; y <= t.y1; y++) { tset(c, t.x1[y] - 1, y, c.ou.top[1]); if ((y & 1) === 0) tset(c, t.x0[y] + 2, y, c.ou.top[3]); }
      tset(c, t.x1[t.y0 + 1] - 1, t.y0 + 1, T[1]); tset(c, t.x1[t.y0 + 1] - 2, t.y0 + 1, T[2]); tset(c, t.x1[t.y0 + 2] - 1, t.y0 + 2, T[3]); tset(c, t.x1[t.y0 + 2] - 2, t.y0 + 2, T[1]);   // nudo de la manta
      for (var x = t.x0[t.y0]; x <= t.x1[t.y0]; x++) tset(c, x, t.y0, c.ou.top[3]);            // cuello
    }
  },
  buzo: {                                                     // buzo rosado, pantalon de buzo con franja, mandil a cuadros celestes, mono
    top: ramp(['#6a2a46', '#a03e6a', '#d2608c', '#f0a0bc']), slv: 'long',
    bot: ramp(['#10142a', '#1e2644', '#2f3a62', '#4c5a88']), stripe: col('#f2f2ea'), shoe: ramp(['#6c6a72', '#a8a6ae', '#dcdad6', '#fcfaf6']),
    trim: ramp(['#6a889c', '#8fb4d8', '#d8e6f0', '#fbfdff']), apron: ramp(['#5a7a94', '#8fb4d8', '#bcd6ea', '#eef6fa']),
    skirt: { r: 'apron', hem: -6, flare: 0.6, w0: 9, gingham: true },
    deco: function (c) {
      var t = c.tr, A = c.ou.apron, y, x, ay0 = tpick(c, 0.52);
      for (y = ay0; y <= t.y1; y++) for (x = t.x0[y] + 1; x <= t.x1[y]; x++) tset(c, x, y, (((x >> 1) + (y >> 1)) & 1) ? A[3] : A[1]);
      for (x = t.x0[ay0] + 1; x <= t.x1[ay0]; x++) tset(c, x, ay0, A[3]);
      for (y = t.y0 + 1; y < ay0; y++) tset(c, t.x1[y] - 1, y, c.ou.top[3]);                   // cierre
      tset(c, t.x1[t.y0] - 1, t.y0, A[3]); tset(c, t.x1[t.y0 + 1] - 1, t.y0 + 1, A[1]);          // tirante
    }
  },
  bata: {                                                     // bata floreada (menta con flores), pantuflas rosadas, rulos
    top: ramp(['#4e7a68', '#7eb09a', '#a8d4c0', '#d6f0e2']), slv: 'short',
    bot: ramp(['#4e7a68', '#7eb09a', '#a8d4c0', '#d6f0e2']), legs: 'short', shoe: ramp(['#7a3a4e', '#b8607c', '#e08aa4', '#f6bcca']),
    trim: ramp(['#7a1a3a', '#c8386c', '#f06a98', '#fff0f4']),
    skirt: { r: 'bot', hem: -5, flare: 3, w0: 9, flowers: true },
    deco: function (c) {
      var t = c.tr, y, x, fc = [col('#ec5a8c'), col('#f6f2e6'), col('#f4cc3c')];
      for (y = t.y0 + 1; y <= t.y1; y++) for (x = t.x0[y]; x <= t.x1[y]; x++) if (hash(x * 31 + y * 17 + c.P.seed) < 0.2) tset(c, x, y, fc[Math.floor(hash(x * 7 + y * 3 + 5) * 3)]);
      for (y = t.y0 + 1; y <= t.y1; y += 2) tset(c, t.x1[y] - 1, y, c.ou.top[3]);                // botones
      for (x = t.x0[t.y0]; x <= t.x1[t.y0]; x++) tset(c, x, t.y0, c.ou.top[3]);                  // cuello
    }
  }
};
/* hay un 'wear' (rotos) en drawFigure; las senoras llevan 1 como maximo */

/* Falda / mandil largo: trapecio desde la cintura hasta el ruedo, con patron opcional */
function drawSkirt(c, hx, topY, o, sway) {
  var b = c.b, ox = c.ox, oy = c.oy, ou = c.ou, r = ou[o.r] || ou.bot, hemY = oy + o.hem, y, x, tY = oy + topY;
  mkBegin(b);
  for (y = tY; y <= hemY; y++) {
    var t = (y - tY) / Math.max(1, hemY - tY), hw = o.w0 / 2 + o.flare * t, sx = ox + hx + 0.5 + sway * t;
    for (x = Math.round(sx - hw); x <= Math.round(sx + hw - 0.5); x++) mkSet(x, y);
  }
  var hook = null;
  if (o.gingham) hook = function (x, y) { return (((x >> 1) + (y >> 1)) & 1) ? r[3] : r[1]; };
  else if (o.flowers) { var fc = [col('#ec5a8c'), col('#f6f2e6'), col('#f4cc3c')]; hook = function (x, y) { return hash(x * 31 + y * 17 + c.P.seed) < 0.17 ? fc[Math.floor(hash(x * 7 + y * 3 + 5) * 3)] : 0; }; }
  else hook = function (x, y, s) { return (x + y * 3 + c.P.seed) % 5 === 0 && s === 0 ? r[1] : 0; };      // pliegues
  paint(b, N(r), hook);
  var hc = o.hemC ? col(o.hemC) : r[1];
  for (x = ox + hx - 12; x <= ox + hx + 12; x++) if (b.get(x, hemY)) b.set(x, hemY, hc);                    // ruedo
}

/* Balde de plastico. (mx,my) = centro de la boca (mundo, ya con ox/oy); (ux,uy) = eje unitario de la boca al fondo. o.water: 'full' | 'jet' */
function drawBucket(b, mx, my, ux, uy, rp, o) {
  o = o || {};
  var len = o.len || 4.5, rimW = 3.1, baseW = 2.2, vx = -uy, vy = ux, t, j, side;
  var rimC = rp[3], hndl = col('#3a3a44'), hndl2 = col('#9a9aa6');
  var water = o.water === 'full';
  for (t = 0; t <= len; t += 0.5) {
    var w = rimW + (baseW - rimW) * (t / len);
    for (j = -w; j <= w + 0.01; j += 0.5) {
      var X = mx + ux * t + vx * j, Y = my + uy * t + vy * j, edge = Math.abs(j) > w - 0.7;
      side = (vx + vy) * j;
      var cc = t < 0.9 ? rimC : edge ? (side < 0 ? rp[2] : rp[0]) : (t > len - 1.1 ? rp[1] : (side < -0.8 ? rp[3] : rp[2]));
      if (Math.abs(t - 2.5) < 0.3 && !edge) cc = rp[1];                                                  // costilla del plastico
      if (water && t < 1.1 && Math.abs(j) < w - 0.5) cc = t < 0.6 ? WATER[3] : WATER[2];
      b.set(X, Y, cc);
    }
  }
  // asa de alambre: arco que sale de los bordes de la boca, del lado contrario al fondo
  var ax1 = mx + vx * (rimW + 0.2), ay1 = my + vy * (rimW + 0.2), ax2 = mx - vx * (rimW + 0.2), ay2 = my - vy * (rimW + 0.2), apx = mx - ux * 3, apy = my - uy * 3;
  b.line(ax1, ay1, apx + vx * 1.6, apy + vy * 1.6, hndl); b.line(apx + vx * 1.6, apy + vy * 1.6, apx - vx * 1.6, apy - vy * 1.6, hndl2); b.line(apx - vx * 1.6, apy - vy * 1.6, ax2, ay2, hndl);
}
/* Chorro que sale de la boca del balde (en el sprite de ataque): corto, el cono grande es fx.chorro */
function drawJet(b, mx, my, dx, dy, n, grav) {
  for (var k = 0; k < n; k++) {
    var x = mx + dx * k * 1.15, y = my + dy * k * 1.15 + (grav || 0.06) * k * k;
    b.set(x, y, k < 2 ? WATER[3] : k < n - 2 ? WATER[2] : WATER[1]);
    if (k > 1 && k < n - 1) { b.set(x, y + 1, WATER[1]); if (k & 1) b.set(x + 1, y - 1, WATER[3]); }
  }
  b.set(mx + dx * n * 1.2 + 1, my + dy * n * 1.2 + (grav || 0.06) * n * n + 1, WATER[3]);
  b.set(mx + dx * n * 1.15 - 1, my + dy * n * 1.15 + (grav || 0.06) * n * n + 3, WATER[2]);
}
/* Olla negra con tapa de aluminio y cucharon; glint 0 | 1 | 2 (brillo) */
function drawPot(b, cx, cy, o) {
  o = o || {};
  cx = Math.round(cx); cy = Math.round(cy);
  if (o.ladle) {                                                                                         // cucharon de palo clavado en la olla
    pLine(b, cx - 3, cy - 3, cx - 6, cy - 9, 1, [WOOD2[0], WOOD2[2], WOOD2[3]]);
    pRect(b, cx - 8, cy - 11, 3, 3, [WOOD2[0], WOOD2[1], WOOD2[2]]);
  }
  pRect(b, cx - 6, cy - 1, 2, 2, N(POT)); pRect(b, cx + 5, cy - 1, 2, 2, N(POT));                       // asas
  pEll(b, cx, cy, 5, 3.6, N(POT));
  b.rect(cx - 4, cy - 3, 9, 1, POT[3]); b.set(cx - 5, cy - 2, POT[3]);
  pEll(b, cx, cy - 4, 3.6, 1.6, N(POT));
  b.rect(cx - 3, cy - 3, 7, 1, ALU[1]); b.set(cx - 3, cy - 3, ALU[2]); b.set(cx, cy - 6, ALU[1]); b.set(cx - 1, cy - 5, ALU[2]);   // tapa negra con aro y pomo de aluminio
  b.set(cx - 3, cy - 1, POT[3]); b.set(cx - 2, cy - 1, POT[3]); b.set(cx - 3, cy, POT[2]);
  if (o.glint) {
    b.set(cx - 2, cy - 5, WHITE); b.set(cx - 3, cy - 4, ALU[3]);
    if (o.glint > 1) { b.set(cx - 5, cy - 7, WHITE); b.set(cx - 5, cy - 8, ALU[3]); b.set(cx - 5, cy - 6, ALU[3]); b.set(cx - 6, cy - 7, ALU[3]); b.set(cx - 4, cy - 7, ALU[3]); b.set(cx + 4, cy - 5, WHITE); }
  }
}

/* ---- poses ---- */
function senoraPose(spec, bd, anim, fr) {
  var olla = spec.kind === 'olla', ph = fr / 4 * PI * 2, s = SIN(ph), cs = COS(ph), reach = bd.ua + bd.fa - 1.3, ua = bd.ua + bd.fa;
  var Hx = 0, Hy = bd.hipY, lean = 1.2, hd = [1, 0.5], mouth = 'slack', lN = 0, lF = 0, feetN, feetF, sway = 0;
  var aN, aF, pot = null, bucket = null, jet = null, glint = 0, ladle = false;
  var Sx, Sy;
  function setS(l) { Sx = Hx + l; Sy = Hy - (bd.torso - 1); }
  if (anim === 'move') {
    Hy += (Math.abs(s) > 0.85 ? 0.7 : 0);
    lN = Math.max(0, cs) * 1.2; lF = Math.max(0, -cs) * 1.2; sway = -s * 0.9;
    feetN = [Hx + 2.2 * s, -1 - lN]; feetF = [Hx - 2.2 * s, -1 - lF];
    lean = 1.3; setS(lean); hd = [1 + 0.3, 0.5 + (s > 0.6 ? 0.5 : 0)]; mouth = s > 0 ? 'slack' : 'closed';
    if (olla) {
      var pc = [Sx + 4.4, Sy + bd.torso * 0.78 + 0.4 * s];
      pot = { c: pc, ladle: true }; ladle = true;
      aN = { h: [pc[0] + 2.4, pc[1] + 2.4], b: -1 }; aF = { h: [pc[0] - 3, pc[1] + 1.8], b: -1 };
    } else {
      var hnd = [Sx + 2.6 + 0.8 * s, Sy + ua - 1.4 + 0.6 * cs];
      bucket = { m: [hnd[0] + 0.2, hnd[1] - 0.8], u: [0.18 * s, 1], water: 'full' };
      aN = { h: hnd, b: -1 }; aF = { h: [Sx + reach * 0.82, Sy + 3.4 - 0.8 * s], b: -1 };
    }
  } else if (anim === 'windup') {
    feetN = [Hx + 2.6, -1]; feetF = [Hx - 2.4, -1]; mouth = 'wide';
    if (olla) {
      lean = fr ? -0.8 : 0.4; setS(lean); hd = fr ? [-0.2, -0.8] : [0.6, -0.2];
      var pc2 = fr ? [Sx + 3.6, Sy - ua - 5.2] : [Sx + reach + 2.2, Sy - 3.4 + 0.6];
      pot = { c: pc2, glint: fr ? 2 : 1 };
      aN = { h: [pc2[0] + 2.6, pc2[1] + 3.1], b: -1 }; aF = { h: [pc2[0] - 2.8, pc2[1] + 3.2], b: -1 };
    } else {
      lean = fr ? -1.6 : -0.4; setS(lean); hd = fr ? [-0.5, -0.8] : [0.2, -0.3];
      var hnd2 = fr ? [Sx - 3.6, Sy - 3.2] : [Sx - 2.4, Sy + 0.8];
      bucket = { m: [hnd2[0] + 1.0, hnd2[1] - 0.8], u: fr ? [-0.8, 0.6] : [-0.5, 0.85], water: 'full' };
      aN = { h: hnd2, b: 1 }; aF = { h: [Sx + 3.6, Sy + 2.8], b: -1 };
    }
  } else {                                                   // attack
    feetN = [Hx + 3.4, -1]; feetF = [Hx - 2.2, -1]; mouth = 'wide';
    if (olla) {
      lean = fr ? 3.2 : 2.2; setS(lean); hd = fr ? [2.4, 1.8] : [1.6, 0.6];
      var pc3 = fr ? [Sx + reach + 3.2, Sy + bd.torso * 0.95] : [Sx + reach + 2.4, Sy - 1.4];
      pot = { c: pc3, glint: fr ? 0 : 1, hit: !!fr };
      aN = { h: [pc3[0] - 2.8, pc3[1] + (fr ? -1.2 : 2.6)], b: -1 }; aF = { h: [pc3[0] - 3.6, pc3[1] + (fr ? -2 : 2.2)], b: -1 };
    } else {
      lean = fr ? 3.2 : 2.2; setS(lean); hd = fr ? [2.4, 2] : [1.6, 1.2];
      var hnd3 = fr ? [Sx + reach - 1.2, Sy + 3.4] : [Sx + reach - 2.2, Sy + 0.4];
      bucket = { m: [hnd3[0] + (fr ? 1.8 : 2.4), hnd3[1] + (fr ? 1.6 : 0.8)], u: fr ? [-0.7, -0.7] : [-0.92, -0.38], water: 'jet' };
      jet = { d: fr ? [0.72, 0.7] : [0.95, 0.28], n: fr ? 4 : 8 };
      aN = { h: hnd3, b: -1 }; aF = { h: [Sx - 2.4, Sy + 3.6], b: 1 };
    }
  }
  var pz = {
    H: [Hx, Hy], S: [Sx, Sy], hd: hd, mouth: mouth, aN: aN, aF: aF, armLate: true,
    lN: { f: feetN, p: lN > 0.4 ? 1 : 0 }, lF: { f: feetF, p: lF > 0.4 ? 1 : 0 },
    front: function (c) {
      var sk = c.ou.skirt;
      if (sk) drawSkirt(c, Hx, Hy - 2, sk, sway);
      if (pot) { var q = wx(c, pot.c); drawPot(c.b, q[0], q[1], { glint: pot.glint, ladle: pot.ladle }); }
    },
    late: function (c) {
      var b = c.b, q;
      senoraHeadExtras(c, pz, spec, bd);
      if (bucket) {
        q = wx(c, bucket.m); var l = Math.sqrt(bucket.u[0] * bucket.u[0] + bucket.u[1] * bucket.u[1]);
        drawBucket(b, q[0], q[1], bucket.u[0] / l, bucket.u[1] / l, BUCKETS[spec.bucket || 'rojo'], { water: bucket.water });
        if (jet) { drawJet(b, q[0] + (bucket.u[0] / l) * -0.5, q[1] + (bucket.u[1] / l) * -0.5, jet.d[0], jet.d[1], jet.n, jet.d[1] > 0.5 ? 0.04 : 0.07); }
      }
      if (pot && pot.hit) { var h = wx(c, pot.c); b.set(h[0] + 5, h[1] + 3, WHITE); b.set(h[0] + 6, h[1] + 4, ALU[3]); b.set(h[0] + 4, h[1] + 4, ALU[3]); b.set(h[0] + 6, h[1] + 2, WHITE); b.set(h[0] + 7, h[1] + 3, ALU[3]); b.set(h[0] + 5, h[1] + 5, WHITE); }
    }
  };
  if (spec.outfit === 'manta') pz.back = function (c) { drawManta(c, pz, anim, fr); };
  pz.hot = bucket ? { x: bucket.m[0], y: bucket.m[1] } : pot ? { x: pot.c[0], y: pot.c[1] } : null;     // boca del balde / centro de la olla (relativo a los pies)
  return pz;
}
Buf.prototype.ell = function (cx, cy, rx, ry, c) {
  for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { var dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy <= 1) this.set(x, y, c); }
};
function wx(c, p) { return [c.ox + p[0], c.oy + p[1]]; }
function headBox(c, pz) {
  var bd = c.bd, cx = c.ox + pz.S[0] + pz.hd[0], cy = c.oy + pz.S[1] - (bd.head - 1) / 2 - 1 + pz.hd[1] + 0.5;
  return { X0: Math.round(cx) - 4, Y0: Math.round(cy - (bd.head - 1) / 2) };
}
/* Peinados que no cubre drawHead: trenzas con liga, mono con ligadura, rulos rosados */
function senoraHeadExtras(c, pz, spec, bd) {
  var b = c.b, hb = headBox(c, pz), X0 = hb.X0, Y0 = hb.Y0, hc = c.P.hc, id = spec.outfit, k, y, x;
  if (id === 'manta') {
    for (k = 0; k < 2; k++) {
      var off = k ? 0 : 1;
      for (y = Y0 + 5; y <= Y0 + 5 + (bd.head === 7 ? 7 : 8); y++) {
        x = (c.tr.x0[y] !== undefined) ? c.tr.x0[y] - 1 + (k ? -1 : 0) : X0 + off;
        b.set(x, y, ((y + k) & 1) ? hc[1] : hc[2]);
      }
      var ye = Y0 + 6 + (bd.head === 7 ? 7 : 8); x = (c.tr.x0[ye - 1] !== undefined) ? c.tr.x0[ye - 1] - 1 + (k ? -1 : 0) : X0;
      b.set(x, ye, col(k ? '#e0b13a' : '#b0463a'));
    }
  } else if (id === 'buzo') {
    b.rect(X0 - 1, Y0 - 1, 3, 3, hc[2]); b.set(X0, Y0 - 2, hc[2]); b.set(X0 - 1, Y0 - 1, hc[3]); b.set(X0 + 1, Y0 + 1, hc[1]);
    b.set(X0 + 1, Y0, col('#e36c95')); b.set(X0 + 1, Y0 + 1, col('#e36c95'));                     // ligadura fucsia
  } else if (id === 'bata') {
    var pk = ramp(['#8a3a5a', '#c86a8c', '#f09ab6', '#ffd8e4']);
    b.rect(X0 + 1, Y0 - 1, 3, 2, pk[2]); b.set(X0 + 1, Y0 - 1, pk[3]); b.set(X0 + 3, Y0, pk[1]);
    b.rect(X0 + 4, Y0 - 1, 3, 2, pk[2]); b.set(X0 + 4, Y0 - 1, pk[3]); b.set(X0 + 6, Y0, pk[1]);
    b.rect(X0 - 1, Y0 + 1, 2, 3, pk[2]); b.set(X0 - 1, Y0 + 1, pk[3]);
  }
}
/* Manta de colores (aguayo) anudada a la espalda: bulto detras del torso con franjas */
function drawManta(c, pz, anim, fr) {
  var b = c.b, bd = c.bd, x0 = c.ox + pz.S[0] - 8, y0 = c.oy + pz.S[1] + 1, T = c.ou.trim, wb = 6, hb = bd.torso + 1, i, y;
  var cols = [T[1], T[2], T[3], col('#1a1a1e'), T[1], T[2], T[3]];
  mkBegin(b); mkRect(x0, y0, wb, hb - 1); mkRect(x0 + 1, y0 + hb - 1, wb - 2, 1); paint(b, [col('#2a1a18'), col('#5a3a30'), col('#8a6a58')]);
  for (y = y0; y < y0 + hb; y++) for (i = 0; i < wb; i++) { if (b.get(x0 + i, y) === 0) continue; var cc = cols[((y - y0) >> 1) % cols.length]; var px_ = i === 0 ? cc : (i >= wb - 1 ? cc : cc); b.set(x0 + i, y, i === wb - 1 ? shadeCol(cc, -1) : (i === 0 ? shadeCol(cc, 1) : cc)); }
  b.rect(x0 + 1, y0 - 1, 3, 1, T[2]); b.set(x0 + 2, y0 - 2, T[1]); b.set(x0 + 4, y0 - 1, T[3]);          // nudo arriba
  b.set(x0 + 2, y0 + 1, col('#f2ede0')); b.set(x0 + 3, y0 + 3, col('#f2ede0')); b.set(x0 + 2, y0 + 5, col('#f2ede0'));         // tejido claro
}
function shadeCol(c, d) {
  var r = c & 255, g = (c >> 8) & 255, bl = (c >> 16) & 255, f = d > 0 ? 1.22 : 0.74;
  r = Math.min(255, Math.round(r * f)); g = Math.min(255, Math.round(g * f)); bl = Math.min(255, Math.round(bl * f));
  return ((255 << 24) | (bl << 16) | (g << 8) | r) >>> 0;
}

/* ---- cadaver (vista de arriba, horizontal, cabeza a la izquierda): la senora caida con su balde o su olla al lado ---- */
function buildDeadSenora(spec, bd, ou) {
  var baja = bd.h === 'baja', hr = baja ? 3.1 : 3.7, torsoL = baja ? 7 : 8, th = bd.tw - 1, tx0 = Math.round(2 * hr) + 1, cy = 9;
  var skL = baja ? 8 : 9, lxx = tx0 + torsoL + skL - 1, W = lxx + 24, H = 20, b = new Buf(W, H), sk = TONES[spec.tone || 'verde'], hc = HAIRS[spec.hc || 'negro'];
  var top = cy - Math.floor(th / 2), bot = top + th - 1, id = spec.outfit, x, y, sx0 = tx0 + torsoL;
  // charco o guiso derramado, debajo de todo
  var sp = new Buf(W, H), ox2 = lxx + 15, oy2 = cy - 2;
  if (spec.kind === 'balde') { sp.ell(ox2, oy2 + 1, 8, 4.4, WATER[0]); sp.ell(ox2 - 1, oy2 + 1, 6.4, 3.2, WATER[1]); sp.set(ox2 - 4, oy2, WATER[3]); sp.set(ox2 - 3, oy2 - 1, WATER[2]); sp.set(ox2 + 2, oy2 + 2, WATER[3]); }
  else { sp.ell(ox2, oy2 + 1, 8, 4.6, col('#6a3a18')); sp.ell(ox2 - 1, oy2 + 1, 6.4, 3.3, col('#a8642a')); sp.set(ox2 - 4, oy2, col('#e8b04a')); sp.set(ox2 - 2, oy2 + 2, col('#c83a28')); sp.set(ox2 + 2, oy2, col('#e8d89a')); sp.set(ox2 + 3, oy2 + 2, col('#5a8a3a')); }
  // brazos
  var long_ = ou.slv === 'long', rs = long_ ? N(ou.slvR || ou.top) : N(sk);
  [[top - 2, -1], [bot + 2, 1]].forEach(function (a, i) {
    var y0 = a[0], x1 = tx0 + 8 - (i ? 1 : 0);
    if (ou.slv === 'short') { pLine(b, tx0 + 3, y0, x1, y0 + a[1], 2, N(sk)); pLine(b, tx0 + 1, y0, tx0 + 4, y0, 2, N(ou.slvR || ou.top)); }
    else { pLine(b, tx0 + 1, y0, x1 - 2, y0 + a[1], 2, rs); pLine(b, x1 - 1, y0 + a[1], x1, y0 + a[1], 2, N(sk)); }
  });
  // piernas y zapatos asomando bajo la falda
  var legsSk = ou.legs === 'short', rp = legsSk ? N(sk) : N(ou.bot), lx = sx0 + skL - 1;
  pLine(b, lx, cy - 2, lx + 4, cy - 2, 3, rp); pLine(b, lx, cy + 2, lx + 3, cy + 2, 3, rp);
  pRect(b, lx + 4, cy - 3, 3, 3, N(ou.shoe)); pRect(b, lx + 3, cy + 1, 3, 3, N(ou.shoe));
  // falda / mandil (se ensancha)
  var r = ou[ou.skirt ? ou.skirt.r : 'bot'] || ou.bot;
  mkBegin(b);
  for (x = 0; x < skL; x++) { var t = x / (skL - 1), hw = (th - 1) / 2 + 1 + t * 2.4; for (y = Math.round(cy - hw); y <= Math.round(cy + hw); y++) mkSet(sx0 + x, y); }
  var hk = ou.skirt && ou.skirt.gingham ? function (xx, yy) { return (((xx >> 1) + (yy >> 1)) & 1) ? r[3] : r[1]; }
    : ou.skirt && ou.skirt.flowers ? function (xx, yy) { return hash(xx * 31 + yy * 17 + spec.seed) < 0.17 ? [col('#ec5a8c'), col('#f6f2e6'), col('#f4cc3c')][Math.floor(hash(xx * 7 + yy * 3 + 5) * 3)] : 0; } : null;
  paint(b, N(r), hk);
  if (ou.skirt && ou.skirt.hemC) b.rect(sx0 + skL - 1, cy - 5, 1, 11, col(ou.skirt.hemC));
  // torso
  mkBegin(b); mkRect(tx0, top, torsoL, th); paint(b, N(ou.top));
  if (id === 'olla') { var A = ou.apron; b.rect(tx0 + 3, top, torsoL - 3, th, A[2]); b.rect(tx0 + 3, top, 1, th, A[3]); b.rect(tx0 + 1, top, 1, th, ou.trim[2]); b.rect(tx0, top, 1, th, ou.top[1]); }
  else if (id === 'manta') { b.rect(tx0 + torsoL - 3, top + 1, 2, 2, ou.trim[1]); b.set(tx0 + torsoL - 2, top + 1, ou.trim[2]); b.rect(tx0 + 1, cy, torsoL - 2, 1, ou.top[3]); }
  else if (id === 'buzo') { b.rect(tx0 + 3, top, torsoL - 3, th, ou.apron[1]); for (x = tx0 + 3; x < tx0 + torsoL; x++) for (y = top; y <= bot; y++) if ((((x >> 1) + (y >> 1)) & 1)) b.set(x, y, ou.apron[3]); }
  else if (id === 'bata') { for (i = 0; i < 9; i++) b.set(tx0 + Math.floor(hash(i * 9 + 4) * torsoL), top + Math.floor(hash(i * 5 + 1) * th), [col('#ec5a8c'), col('#f6f2e6'), col('#f4cc3c')][i % 3]); }
  b.set(tx0 + 3, top + 1, sk[1]); b.set(tx0 + 4, top + 1, sk[2]); b.rect(tx0, bot, torsoL, 1, ou.top[0]);
  // trenzas
  if (id === 'manta') { b.rect(1, bot + 1, 1, 1, hc[2]); pLine(b, tx0 - 1, top + 1, tx0 + 5, top + 1, 1, [hc[0], hc[1], hc[2]]); pLine(b, tx0 - 1, bot - 1, tx0 + 6, bot - 1, 1, [hc[0], hc[1], hc[2]]); b.set(tx0 + 7, top + 1, col('#b0463a')); b.set(tx0 + 7, bot - 1, col('#e0b13a')); }
  // cabeza (de arriba)
  var hx = 1 + hr, i;
  mkBegin(b); mkEll(hx, cy, hr, hr); paint(b, N(sk));
  if (ou.hat === 'cofia') { mkBegin(b); mkEll(hx - 1.1, cy, hr - 0.9, hr - 0.8); paint(b, N(ou.hatR)); b.set(Math.round(hx - 1), cy, ou.hatR[3]); }
  else { mkBegin(b); mkEll(hx - 1.2, cy, hr - 0.6, hr - 0.2); paint(b, N(hc)); }
  if (id === 'buzo') { mkBegin(b); mkEll(hx - 2.2, cy, 2.1, 2.1); paint(b, N(hc)); b.set(Math.round(hx - 1), cy, col('#e36c95')); }
  if (id === 'bata') { b.rect(Math.round(hx - 2), cy - 3, 2, 2, col('#f09ab6')); b.rect(Math.round(hx - 2), cy + 1, 2, 2, col('#f09ab6')); b.rect(Math.round(hx), cy - 1, 2, 3, col('#c86a8c')); }
  b.set(Math.round(hx + 1), cy - 1, C_EYE2); b.set(Math.round(hx + 1), cy + 1, C_EYE2); b.set(Math.round(hx + 2), cy, C_MOUTH);
  b.set(Math.round(hx + 1), cy - 2, sk[0]); b.set(Math.round(hx + 1), cy + 2, sk[0]);                         // ojeras
  b.outlineRim();
  // el balde o la olla, caidos junto a ella
  var u = new Buf(W, H);
  if (spec.kind === 'balde') drawBucket(u, ox2 - 7, oy2 - 2, 1, 0.12, BUCKETS[spec.bucket || 'rojo'], { len: 6 });
  else { drawPot(u, ox2 + 1, oy2, {}); }
  u.outlineRim();
  var out = new Buf(W, H); out.blit(sp, 0, 0); out.blit(b, 0, 0); out.blit(u, 0, 0);
  return out.toCanvas(tx0 + (torsoL >> 1), cy);
}

/* ---- horneado de una senora ---- */
function buildSenora(spec) {
  var bd = SBODY[spec.body], ou = SOUT[spec.outfit], up = 13, W = 44, ox = 19, H = bd.hpx + 5 + up, oy = H - 2;
  var P = { bd: bd, ou: ou, skin: TONES[spec.tone || 'verde'], hair: spec.hair, hc: HAIRS[spec.hc || 'negro'], seed: spec.seed || 5, wear: 1, blood: spec.blood || 0,
            faceBlood: spec.faceBlood || 0, rot: [[5, 4, 0]], ox: ox, oy: oy, spec: spec };
  var out = { move: [], hurt: [], windup: [], attack: [], hurtWindup: [], hurtAttack: [] };
  function run(anim, n, into, hurtInto) {
    for (var fr = 0; fr < n; fr++) {
      var b = new Buf(W, H), pz = senoraPose(spec, bd, anim, fr);
      if (anim !== 'move') (out['hot' + anim] = out['hot' + anim] || []).push(pz.hot);
      drawFigure(b, P, pz); b.outlineRim();
      hurtInto.push(b.solid().toCanvas(ox, oy)); into.push(b.toCanvas(ox, oy));
    }
  }
  run('move', 4, out.move, out.hurt);
  run('windup', 2, out.windup, out.hurtWindup);
  run('attack', 2, out.attack, out.hurtAttack);
  out.dead = buildDeadSenora(spec, bd, ou);
  // QA v0.9: las senoras se veían blanquecinas (pieles pálidas + mandil/buzo/cofia casi blancos que el brillo de entidades satura).
  // Se comprimen las luces de los cuadros normales (no los `hurt*`, que son siluetas blancas a propósito).
  ['move', 'windup', 'attack'].forEach(function (k) { out[k].forEach(softenLights); });
  if (Array.isArray(out.dead)) out.dead.forEach(softenLights); else if (out.dead) softenLights(out.dead);
  return out;
}
function softenLights(cv) {
  if (!cv || !cv.getContext) return;
  var g = cv.getContext('2d'), im = g.getImageData(0, 0, cv.width, cv.height), d = im.data, i, l, f;
  for (i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
    if (l <= 150) continue;
    f = (150 + (l - 150) * 0.4) / l;   // 255 → ~192
    d[i] = Math.round(d[i] * f); d[i + 1] = Math.round(d[i + 1] * f * 0.98); d[i + 2] = Math.round(d[i + 2] * f * 0.94);
  }
  g.putImageData(im, 0, 0);
}

var SENORA_SKINS = [
  // [tipo, cuerpo, atuendo, piel, pelo, color de pelo, opciones]
  ['balde', 'baja',   'manta', 'verde',   'largo', 'negro', { bucket: 'rojo',  blood: 1 }],
  ['balde', 'normal', 'manta', 'gris',    'largo', 'negro', { bucket: 'azul' }],
  ['balde', 'normal', 'buzo',  'verde',   'corto', 'casta', { bucket: 'blanco', faceBlood: 1 }],
  ['balde', 'baja',   'buzo',  'palido',  'largo', 'negro', { bucket: 'amarillo' }],
  ['balde', 'baja',   'bata',  'gris',    'cana',  'gris',  { bucket: 'negro' }],
  ['balde', 'normal', 'bata',  'amarillo', 'cana', 'gris',  { bucket: 'rojo', blood: 1 }],
  ['olla',  'normal', 'olla',  'verde',   'corto', 'negro', { blood: 1 }],
  ['olla',  'baja',   'olla',  'gris',    'corto', 'casta', {}],
  ['olla',  'normal', 'buzo',  'palido',  'corto', 'negro', { faceBlood: 1 }],
  ['olla',  'baja',   'bata',  'verde',   'cana',  'gris',  {}],
  ['olla',  'normal', 'manta', 'gris',    'largo', 'negro', { blood: 1 }]
];
var SENORA_LIST = { balde: [], olla: [] };
SENORA_SKINS.forEach(function (r, i) {
  var spec = { kind: r[0], body: r[1], outfit: r[2], tone: r[3], hair: r[4], hc: r[5], seed: 31 + i * 13 };
  var o = r[6] || {}; for (var k in o) spec[k] = o[k];
  var key = (r[0] === 'balde' ? 'senoraBalde_' : 'senoraOlla_') + r[1] + '_' + r[2], e = buildSenora(spec);
  e.extra = { kind: r[0], tipo: r[0] === 'balde' ? 'senoraBalde' : 'senoraOlla', bucket: spec.bucket, height: SBODY[r[1]].hpx,
              hot: e.hotattack, hotWindup: e.hotwindup };      // hot = punto (relativo a ax/ay, mirando a la derecha) de la boca del balde (de donde sale el chorro) o del centro de la olla, por cuadro de attack / windup
  delete e.hotattack; delete e.hotwindup;
  zvar[key] = e; SENORA_LIST[r[0]].push(key);
});
S.senoraList = SENORA_LIST;

/* ======================== PASAJERO DE CARRETILLA ======================== */
/* Zombie sentado de piernas cruzadas, 2 cuadros (brazos arriba gritando / agarrado al borde). ax/ay = el trasero sobre la carga.
   Se dibuja encima de props.carretillaSuelta en pos_carretilla + pasajero.seat (relativo al ancla de la carretilla). */
function buildPasajero(kind) {
  var spec, bd, ou, tone, hair, hc, skirtR = null;
  if (kind === 'senor')   { bd = bodyOf('normal'); ou = OUTFITS.terno; spec = { outfit: 'terno', tone: 'verde', hair: 'cana', hc: 'gris', seed: 77 }; }
  if (kind === 'escolar') { bd = bodyOf('bajo'); ou = OUTFITS.buzo; spec = { outfit: 'buzo', tone: 'palido', hair: 'corto', hc: 'casta', seed: 91 }; }
  if (kind === 'senora')  { bd = SBODY.baja; ou = SOUT.manta; spec = { outfit: 'manta', kind: 'pasajera', tone: 'gris', hair: 'largo', hc: 'negro', seed: 55, bucket: 'rojo' }; skirtR = ou.skirt; }
  var W = 30, up = 8, H = bd.hpx + 6 + up, ox = 13, oy = H - 3, P = { bd: bd, ou: ou, skin: TONES[spec.tone], hair: spec.hair, hc: HAIRS[spec.hc], seed: spec.seed, wear: 1, blood: 0, faceBlood: 0, rot: [[5, 4, 0]], ox: ox, oy: oy, spec: spec };
  var move = [], hurt = [];
  for (var fr = 0; fr < 2; fr++) {
    var b = new Buf(W, H), up_ = fr === 0, Hy = -3 - (up_ ? 0 : 0), Sy = Hy - (bd.torso - 1), Sx = 1.2;
    var reachA = bd.ua + bd.fa - 1.2;
    var arm = up_
      ? { n: { h: [Sx + reachA * 0.82 + 1, Sy - reachA * 0.62 - 0.6], b: -1 }, f: { h: [Sx - reachA * 0.5 - 1, Sy - reachA * 0.9], b: 1 } }
      : { n: { h: [Sx + reachA * 0.8 + 1.5, Sy + reachA * 0.62], b: -1 }, f: { h: [Sx + reachA * 0.45 + 0.5, Sy + reachA * 0.8 + 0.4], b: -1 } };
    var pz = {
      H: [0, Hy], S: [Sx, Sy], hd: [0.6, up_ ? -0.3 : 0.4], mouth: up_ ? 'wide' : 'slack', aN: arm.n, aF: arm.f, armLate: true, tw: bd.tw,
      lN: null, lF: null,
      front: function (c) { sitLegs(c, bd, ou, skirtR); },
      late: function (c) { if (kind === 'senora') senoraHeadExtras(c, pz, spec, bd); }
    };
    if (kind === 'senora') pz.back = function (c) { drawManta(c, pz, 'move', 0); };
    drawFigure(b, P, pz); b.outlineRim();
    hurt.push(b.solid().toCanvas(ox, oy)); move.push(b.toCanvas(ox, oy));
  }
  move.hurt = hurt;
  return move;
}
/* Piernas cruzadas: dos muslos que salen hacia adelante, las rodillas arriba y los pies asomando; con falda es un monticulo */
function sitLegs(c, bd, ou, skirt) {
  var b = c.b, ox = c.ox, oy = c.oy, legsSk = ou.legs === 'short';
  if (skirt) {
    var r = ou[skirt.r] || ou.bot;
    pEll(b, ox + 2.5, oy - 2, 8.5, 3.4, N(r), function (x, y, s) { return (y >= oy + 0 && ((x + y) & 1)) ? r[1] : 0; });
    b.rect(ox - 6, oy, 17, 1, skirt.hemC ? col(skirt.hemC) : r[1]);
    pRect(b, ox + 8, oy - 1, 3, 2, N(ou.shoe)); pRect(b, ox + 6, oy - 2, 2, 2, F(ou.shoe));
    return;
  }
  var rp = legsSk ? N(c.skin) : N(ou.bot), rf = legsSk ? F(c.skin) : F(ou.bot), ck = ou.legPat === 'check';
  pLine(b, ox - 1, oy - 3, ox + 5, oy - 3, 3, rf, ck ? function (x, y) { return ((x + y) & 1) ? ou.bot[0] : 0; } : null);
  pLine(b, ox - 2, oy - 1, ox + 6, oy - 1, 3, rp);
  pRect(b, ox + 7, oy - 2, 3, 3, N(ou.shoe)); b.set(ox + 7, oy - 2, ou.shoe[3]);
  pRect(b, ox + 5, oy - 4, 2, 2, F(ou.shoe));
  b.rect(ox - 1, oy - 4, 5, 1, rp[2]);
}
S.zombie = S.zombie || {};
(function () {
  var pas = { senor: buildPasajero('senor'), senora: buildPasajero('senora'), escolar: buildPasajero('escolar') };
  pas.hurt = { senor: pas.senor.hurt, senora: pas.senora.hurt, escolar: pas.escolar.hurt };
  pas.seat = { x: 4, y: -11 };                                  // relativo al ancla de props.carretillaSuelta: el centro de la caja, apoyado en la carga
  S.zombie.pasajero = pas;
})();

/* ======================== FX: CHORRO DEL BALDAZO ======================== */
/* Cono de agua que mira a la DERECHA, ancla = la boca del balde (0, 45). 82x90, 3 cuadros: chorro corto / abriendose / cono completo con gotas.
   Sin contorno oscuro: azules semitransparentes con espuma clara. Alcance 75 px, apertura 60 grados (el motor lo gira hacia donde apunta). */
S.fx = S.fx || {};
(function () {
  var W = 82, H = 90, AY = 45, frames = [];
  var C1 = ((176 << 24) | (190 << 16) | (138 << 8) | 66) >>> 0, C2 = ((190 << 24) | (226 << 16) | (190 << 8) | 118) >>> 0, C3 = ((228 << 24) | (252 << 16) | (244 << 8) | 214) >>> 0, C4 = ((196 << 24) | (156 << 16) | (100 << 8) | 46) >>> 0;
  var RS = [36, 60, 76], HALF = [11, 21, 30];
  for (var f = 0; f < 3; f++) {
    var b = new Buf(W, H), R = RS[f], half = HALF[f] * PI / 180;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var dx = x, dy = y - AY, r = Math.sqrt(dx * dx + dy * dy);
      if (r < 1.5 || r > R) continue;
      var a = Math.atan2(dy, dx), e = Math.abs(a) / half;
      if (e > 1) continue;
      var n = hash(x * 13 + y * 7 + f * 101 + 3), dens = 1.22 - 0.36 * (r / R) - 0.3 * e * e;
      if (n > dens) continue;
      var c = e < 0.22 ? C3 : e < 0.58 ? C2 : C1;
      if (r > R - 3.2 && n < 0.7) c = C3;                                           // frente de ola
      else if (e > 0.82 && n > 0.55) c = C4;
      b.set(x, y, c);
    }
    // anillos de ondulacion y gotas sueltas por delante y a los lados
    [0.34, 0.62].forEach(function (k) { for (var aa = -half; aa <= half; aa += 0.045) { var rr = R * k + Math.sin(aa * 9 + f) * 1.4; if (hash(Math.round(aa * 100) + f * 17) < 0.7) b.set(Math.cos(aa) * rr, AY + Math.sin(aa) * rr, C3); } });
    for (var i = 0; i < 6 + f * 5; i++) { var aa2 = (hash(i * 5 + f * 31) * 2 - 1) * half * 1.22, rr2 = R * (0.55 + hash(i * 9 + f * 7) * 0.6); b.set(Math.cos(aa2) * rr2, AY + Math.sin(aa2) * rr2, i & 1 ? C3 : C2); if (i % 3 === 0) b.set(Math.cos(aa2) * rr2 + 1, AY + Math.sin(aa2) * rr2, C2); }
    frames.push(b.toCanvas(0, AY));
  }
  frames.forEach(function (c) { c.range = 75; c.halfAngle = 30; });
  S.fx.chorro = frames;
})();

/* ======================== ESCOLAR CON RESORTERA ======================== */
/* Parte de los cuadros de zombie.escolar (mismo cuerpo, mismos colores) y le cambia el brazo derecho por uno en alto con una Y de madera. */
(function () {
  var E = S.zombie && S.zombie.escolar;
  if (!E || !E.walk || !E.walk.length) return;
  var wood = ramp(['#3e2a1e', '#6b4223', '#a86e38', '#c99458']), band = ramp(['#3a1518', '#5b1d1d', '#7a2a26', '#9a3a30']), zs = ramp(['#3f4a44', '#5f6b55', '#93a083', '#b4be9a']);
  var W0 = E.walk[0].width, H0 = E.walk[0].height, ax = E.walk[0].ax, ay = E.walk[0].ay;
  var walk = [], hurt = [];
  E.walk.forEach(function (cv, i) {
    var src = fromCanvas(cv), b = new Buf(W0 + 5, H0);
    var up = i % 2;
    // 1) copia sin el brazo derecho (x>=15, filas 14..24) ni su borde
    for (var y = 0; y < H0; y++) for (var x = 0; x < W0; x++) { if (x >= 15 && y >= 12 && y <= 26) continue; b.d[y * b.w + x] = src.d[y * W0 + x]; }
    // 2) brazo en alto sosteniendo la resortera (se mece con el paso)
    var dy = up ? -1 : 0, nw = new Buf(b.w, b.h);
    pLine(nw, 15, 19 + dy, 18, 15 + dy, 2, [zs[1], zs[2], zs[3]]);              // brazo que sube en diagonal
    nw.rect(15, 17 + dy, 2, 2, col('#dcdcd4')); nw.set(15, 17 + dy, col('#f2f2ea'));   // manga de la camisa
    nw.rect(18, 12 + dy, 2, 2, zs[3]); nw.set(19, 13 + dy, zs[2]);                // mano
    // la Y: mango, horquilla de dos puntas y la liga estirada entre ellas
    [[20, 10], [20, 11], [20, 12], [20, 13], [20, 14], [20, 15]].forEach(function (p) { nw.set(p[0], p[1] + dy, wood[2]); });
    [[19, 9], [21, 9]].forEach(function (p) { nw.set(p[0], p[1] + dy, wood[2]); });
    [[18, 8], [18, 7], [18, 6], [22, 8], [22, 7], [22, 6]].forEach(function (p) { nw.set(p[0], p[1] + dy, wood[2]); });
    [[18, 8], [18, 7], [18, 6], [19, 9], [20, 10], [20, 11], [20, 12]].forEach(function (p) { nw.set(p[0], p[1] + dy, wood[3]); });
    [[22, 8], [22, 7], [21, 9], [20, 14], [20, 15]].forEach(function (p) { nw.set(p[0], p[1] + dy, wood[1]); });
    [[19, 6], [20, 6], [21, 6], [20, 7]].forEach(function (p) { nw.set(p[0], p[1] + dy, band[3]); });
    nw.set(20, 7 + dy, band[2]);
    // contorno solo alrededor de lo nuevo (el resto ya lo trae)
    var add = [];
    for (y = 0; y < nw.h; y++) for (x = 0; x < nw.w; x++) {
      if (nw.d[y * nw.w + x]) continue;
      if (b.d[y * b.w + x]) continue;
      if (nw.get(x - 1, y) || nw.get(x + 1, y) || nw.get(x, y - 1) || nw.get(x, y + 1)) add.push(y * nw.w + x);
    }
    b.blit(nw, 0, 0);
    add.forEach(function (j) { if (!b.d[j]) b.d[j] = K; });
    // luz de borde en lo nuevo (arriba/izquierda de la Y)
    for (y = 0; y < b.h; y++) for (x = 0; x < b.w; x++) if (b.d[y * b.w + x] === K && x >= 15 && y < 14 && !b.get(x, y - 1) && b.get(x, y + 1) && b.get(x, y + 1) !== K) b.d[y * b.w + x] = RIM_HI;
    walk.push(b.toCanvas(ax, ay)); hurt.push(b.solid().toCanvas(ax, ay));
  });
  var dsrc = fromCanvas(E.dead), db = new Buf(E.dead.width, E.dead.height);
  db.d.set(dsrc.d);
  var sl = new Buf(db.w, db.h);
  [[21, 1], [24, 1], [22, 2], [23, 2], [22, 3], [22, 4]].forEach(function (p) { sl.set(p[0], p[1], wood[2]); });
  sl.set(21, 1, wood[3]); sl.set(22, 3, wood[3]); sl.set(24, 1, wood[1]);
  var add2 = [];
  for (var yy = 0; yy < sl.h; yy++) for (var xx = 0; xx < sl.w; xx++) if (!sl.d[yy * sl.w + xx] && !db.d[yy * db.w + xx] && (sl.get(xx - 1, yy) || sl.get(xx + 1, yy) || sl.get(xx, yy - 1) || sl.get(xx, yy + 1))) add2.push(yy * sl.w + xx);
  db.blit(sl, 0, 0); add2.forEach(function (j) { db.d[j] = K; });
  S.zombie.escolarSling = { walk: walk, hurt: hurt, dead: db.toCanvas(E.dead.ax, E.dead.ay) };
})();

var T1 = (window.performance && performance.now) ? performance.now() : Date.now();
ACH.sprites.zvarBakeMs = T1 - T0;

})();
