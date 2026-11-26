/* ACHORADO - js/miraflores/arte-personajes.js  (Miraflores, M2c: arte de personajes)
 * Contrato: MIRAFLORES.md seccion 7.3.  Script clasico (window.ACH), sin librerias; funciona desde file://. Cada pieza se hornea una sola vez (al cargar, o al primer uso si es perezosa).
 * Necesita base.js, sprites.js, objetos.js y zombies.js ya cargados (si falta algo, solo se omite lo que depende de ello).
 *
 * Publica:
 *   ACH.sprites.zvar['trab_<marca>']  = { move:[6], hurt:[6], dead }   marca = bembos starbucks lalucha chinawok belisario wong ripley saga tailoy
 *                                       (mismo formato que ACH.sprites.zvar de zombies.js: cuadros mirando a la DERECHA, ancla = pies; hurt = silueta blanca)
 *   ACH.sprites.mira.trabKeys         lista de las claves trab_*
 *   ACH.sprites.mira.picaronera       = { idle[2], grita[2], frie[3], lanza[3], camina[4], hurt, dead }   (de frente; frie de espaldas; el motor voltea)
 *   ACH.sprites.mira.carretillaPicarones = { ok, broken }   (ok.alt = 2 cuadros de llama; ok.broken = broken)
 *   ACH.sprites.mira.abeja[2] · charcoMiel[3] · picaron[2] · burbuja[3]
 *   ACH.sprites.mira.vendedor         = { idle[4], tito:{idle[4]}, pepe:{idle[4]} }   (idle = Don Tito; vivos, no zombies)
 *   ACH.sprites.items[id] (12x12 ancla 6,11) + .big (24x24 ancla 12,23) para martilloInflable espadaInflable pistolaBurbujas
 *                         hamburguesaBembos cafeStarbucks sangucheLucha polloBelisario chaufaWok cintaTailoy picarones   (copia en ACH.sprites.mira.items)
 *   ACH.sprites.alexInflable[toyId][bird|nobird] = { walk:{dir:[4]}, swing:{dir:[3]}, idle:{dir} }   toyId = martilloInflable espadaInflable pistolaBurbujas
 *                         mismos lienzos y anclas que alex.walk (20x28 @10,26 / izq @9,26) y alex.attack (lado 32x30 @13,26 / izq @18,26; frente y espaldas 32x48 @16,38)
 *   ACH.sprites.mira.arteMs           milisegundos que costo el horneado inicial;  ACH.sprites.mira.bakeAll() hornea lo perezoso y devuelve los ms
 *   Perezoso (se hornea al primer acceso): zvar['trab_*'] y alexInflable[toy][bird|nobird]. Todo lo demas se hornea al cargar.
 * El cuerpo de los trabajadores usa el mismo generador modular de zombies.js (copiado aqui porque sus funciones son privadas de esa clausura).
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px;
var S = ACH.sprites = ACH.sprites || {};
if (!px || !px.G) return;
var T0 = (window.performance && performance.now) ? performance.now() : Date.now();
var MIRA = S.mira = S.mira || {};
var G = px.G;
function safe(name, fn) { try { fn(); } catch (e) { if (window.console) console.warn('[arte-personajes] ' + name + ':', e); } }
/* Horneado perezoso: la propiedad se hornea al primer acceso y se vuelve un valor normal. Menos lienzos vivos al cargar (los navegadores se quejan con miles)
   y nada se hornea si el jugador nunca ve ese trabajador o nunca compra ese inflable. MIRA.bakeAll() los fuerza todos. */
var LAZY = [];
function lazy(obj, key, fn) {
  var tries = 0, def = function (v) { Object.defineProperty(obj, key, { value: v, writable: true, enumerable: true, configurable: true }); return v; };
  Object.defineProperty(obj, key, {
    enumerable: true, configurable: true,
    get: function () {
      var v = null;
      try { v = fn(); } catch (e) { if (window.console) console.warn('[arte-personajes] ' + key + ':', e); }
      if (v === null && ++tries < 3) return null;                // fallo: reintenta en el proximo acceso (3 veces como mucho)
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
  var c = document.createElement('canvas'); c.width = this.w; c.height = this.h;
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


/* ======================== TRABAJADORES ZOMBIES (uniformes de la investigacion 5.2) ======================== */
var SIN = Math.sin, COS = Math.cos, PI = Math.PI, abs = Math.abs, max = Math.max, min = Math.min, round = Math.round;
function decoH() {}                                          // (torso horizontal: no se usa aqui)
function baseCv(bd, W, ox, up) { var H = bd.hpx + 5 + (up || 0); return { W: W, H: H, ox: ox, oy: H - 2 }; }

var R_SHOE = ramp(['#0e0c0e', '#1e1c1c', '#352f2b', '#4f4640']);
var R_WH = ramp(['#6a6c78', '#a4a6b0', '#dcdcda', '#fbfaf2']);
var R_BLUE = ramp(['#0c0870', '#1a12ac', '#2a1cd0', '#5a50ff']);          // Bembos #1100CF, un poco opaco
var R_YEL = ramp(['#8a5c00', '#c68a00', '#f2b21a', '#ffd75a']);           // Bembos #FFB500
var R_SBG = ramp(['#003624', '#005c3e', '#0a8258', '#44bc90']);           // Starbucks #00704A
var R_CHAR = ramp(['#0c0c10', '#1c1c22', '#34343c', '#55555e']);          // carbon
var R_BLK = ramp(['#06060a', '#14141a', '#26262e', '#42424c']);
var R_RCW = ramp(['#5e0309', '#a0050f', '#d40a18', '#f2503e']);           // China Wok #E30613
var R_RDB = ramp(['#5e0820', '#a00f2c', '#d4143a', '#f2547a']);           // Don Belisario #E5133A
var R_RWG = ramp(['#660a0c', '#a81218', '#dc1a22', '#ff5c52']);           // Wong #EC1C24
var R_SUIT = ramp(['#1c1c22', '#34343c', '#50505c', '#7e7e8e']);          // Ripley #333
var R_LIME = ramp(['#46681a', '#6c9a2a', '#8dc63f', '#c4ea7a']);          // Saga #8DC63F
var R_TLG = ramp(['#003a26', '#006a44', '#00a160', '#4ccf98']);           // Tai Loy #00A160
var R_JEAN = ramp(['#0c101e', '#1a2036', '#2c385a', '#485a84']);
var R_KHAKI = ramp(['#5a4a30', '#826f46', '#ab9664', '#cebb8a']);
var R_SLACK = ramp(['#14141a', '#24242c', '#383842', '#585866']);
var R_PINK = ramp(['#7a0046', '#b80068', '#ff0094', '#ff72c0']);
var R_CREAM = ramp(['#8a7f60', '#b8ad8a', '#e2d8b8', '#f6f0d8']);

/* delantal: del pecho para abajo, sobre el frente del torso (a la derecha); mark(c, y0) pone el detalle del logo */
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
var OUTFITS = {
  tBembos: {                                                 // polo azul, delantal amarillo, visera azul
    top: R_BLUE, slv: 'short', bot: R_JEAN, shoe: R_SHOE, hat: 'visera', hatR: R_BLUE, apr: R_YEL,
    deco: apronDeco(R_YEL, function (c, y0) { dot(c, 4, y0 + 2, R_BLUE[2], 2); dot(c, 4, y0 + 3, R_BLUE[1], 2); dot(c, 2, y0 + 3, R_RCW[2]); })
  },
  tStarbucks: {                                              // polo blanco, delantal verde, gorra verde
    top: R_WH, slv: 'short', bot: R_BLK, shoe: R_SHOE, hat: 'gorra', hatR: R_SBG, apr: R_SBG,
    deco: apronDeco(R_SBG, function (c, y0) { dot(c, 4, y0 + 2, R_WH[3], 2); dot(c, 4, y0 + 3, R_WH[2], 2); tset(c, c.tr.x1[y0 + 4] - 1, y0 + 4, R_WH[3]); })
  },
  tLucha: {                                                  // chaqueta blanca, delantal carbon, toca blanca, banderita
    top: R_WH, slv: 'long', slvR: R_WH, bot: R_BLK, shoe: R_SHOE, hat: 'toque', hatR: R_WH, apr: R_CHAR,
    deco: apronDeco(R_CHAR, function (c, y0) { dot(c, 4, y0 + 2, R_RDB[2]); dot(c, 3, y0 + 2, R_WH[3]); dot(c, 2, y0 + 2, R_RDB[2]); dot(c, 4, y0 + 4, R_CREAM[2], 3); }, 0.28)
  },
  tWok: {                                                    // polo rojo, delantal negro, gorra negra
    top: R_RCW, slv: 'short', bot: R_BLK, shoe: R_SHOE, hat: 'gorra', hatR: R_BLK, apr: R_BLK,
    deco: apronDeco(R_BLK, function (c, y0) { dot(c, 4, y0 + 2, R_RCW[2], 2); dot(c, 3, y0 + 3, R_RCW[1], 2); })
  },
  tBelisario: {                                              // camisa roja, delantal blanco, visera blanca; gallito rojo
    top: R_RDB, slv: 'short', bot: R_BLK, shoe: R_SHOE, hat: 'visera', hatR: R_WH, apr: R_WH,
    deco: apronDeco(R_WH, function (c, y0) { dot(c, 4, y0 + 2, R_RDB[2]); dot(c, 3, y0 + 1, R_RDB[2]); dot(c, 3, y0 + 2, R_RDB[2], 2); dot(c, 2, y0 + 3, R_RDB[1]); })
  },
  tWong: {                                                   // polo rojo con chapita blanca, pantalon caqui, sin gorra
    top: R_RWG, slv: 'short', bot: R_KHAKI, shoe: R_SHOE,
    deco: function (c) {
      var t = c.tr, py = tpick(c, 0.38), y;
      tset(c, t.x1[t.y0], t.y0, R_WH[2]); tset(c, t.x1[t.y0] - 1, t.y0, R_WH[1]);
      for (y = py; y <= py + 1; y++) { dot(c, 4, y, R_WH[3], 3); }
      dot(c, 3, py, R_RWG[2]);
      for (y = t.y0 + 1; y <= t.y1; y++) tset(c, t.x1[y], y, R_RWG[1]);
      tset(c, t.x0[t.y0 + 2] + 1, t.y0 + 2, R_RWG[3]);
    }
  },
  tRipley: {                                                 // terno gris oscuro, camisa blanca y corbata rosada
    top: R_SUIT, slv: 'long', bot: R_SLACK, shoe: R_SHOE, trim: R_PINK, shirt: R_WH,
    deco: function (c) {
      var t = c.tr, y, x, S2 = c.ou.shirt, T = c.ou.trim;
      for (y = t.y0; y <= t.y1; y++) { tset(c, t.x1[y], y, S2[2]); tset(c, t.x1[y] - 1, y, y < t.y0 + 5 ? T[2] : S2[1]); }
      tset(c, t.x1[t.y0], t.y0, S2[3]); tset(c, t.x1[t.y0] - 1, t.y0, T[3]);
      tset(c, t.x1[t.y0 + 1] - 2, t.y0 + 1, c.ou.top[0]); tset(c, t.x1[t.y0 + 3] - 2, t.y0 + 3, c.ou.top[0]); tset(c, t.x1[t.y0 + 5] - 2, t.y0 + 5, c.ou.top[0]);
      for (y = t.y0; y <= t.y1; y++) { tset(c, t.x0[y], y, c.ou.top[3]); if (y > t.y0) tset(c, t.x0[y] + 1, y, c.ou.top[2]); }
      for (x = t.x0[t.y0]; x <= t.x1[t.y0]; x++) tset(c, x, t.y0, c.ou.top[3]);
      for (y = t.y0 + 2; y <= t.y1; y++) for (x = t.x0[y] + 3; x <= t.x1[y] - 3; x += 3) tset(c, x, y, c.ou.top[2]);
    }
  },
  tSaga: {                                                   // chaleco lima de vendedor sobre polo carbon
    top: R_LIME, slv: 'short', slvR: R_CHAR, bot: R_BLK, shoe: R_SHOE, trim: R_WH,
    deco: function (c) {
      var t = c.tr, y, x, T = c.ou.trim, py = tpick(c, 0.34);
      for (y = t.y0 + 1; y <= t.y1; y++) tset(c, t.x1[y] - 1, y, c.ou.top[1]);
      tset(c, t.x1[t.y0] - 1, t.y0, c.skin[1]); tset(c, t.x1[t.y0], t.y0, c.skin[2]); tset(c, t.x1[t.y0 + 1], t.y0 + 1, R_CHAR[1]);
      tset(c, t.x1[py] - 3, py, T[3]); tset(c, t.x1[py] - 2, py, T[3]); tset(c, t.x1[py] - 3, py + 1, T[2]); tset(c, t.x1[py] - 2, py + 1, T[2]);
      var by = tpick(c, 0.8); for (x = t.x0[by]; x <= t.x1[by]; x++) tset(c, x, by, c.ou.top[1]);
      tset(c, t.x0[t.y0 + 2] + 1, t.y0 + 2, c.ou.top[3]);
    }
  },
  tTailoy: {                                                 // polo verde con franja amarilla, visera amarilla
    top: R_TLG, slv: 'short', bot: R_KHAKI, shoe: R_SHOE, hat: 'visera', hatR: R_YEL, trim: R_YEL,
    deco: function (c) {
      var t = c.tr, y, x, py = tpick(c, 0.5);
      for (x = t.x0[py]; x <= t.x1[py]; x++) tset(c, x, py, R_YEL[2]);
      for (x = t.x0[py + 1]; x <= t.x1[py + 1]; x++) tset(c, x, py + 1, R_YEL[1]);
      tset(c, t.x1[t.y0], t.y0, R_YEL[2]); tset(c, t.x1[t.y0] - 1, t.y0, R_TLG[3]);
      for (y = t.y0 + 1; y <= t.y1; y++) tset(c, t.x1[y], y, R_TLG[1]);
      dot(c, 4, t.y0 + 2, R_WH[3], 2);
    }
  }
};
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
var TRABS = {
  bembos:    { body: 'normal',      outfit: 'tBembos',    tone: 'verde', hair: 'corto', hc: 'negro', seed: 5,  prop: 'burger',   blood: 1 },
  starbucks: { body: 'normalFlaco', outfit: 'tStarbucks', tone: 'gris',  hair: 'largo', hc: 'casta', seed: 12, prop: 'cup' },
  lalucha:   { body: 'normalAncho', outfit: 'tLucha',     tone: 'verde', hair: 'calvo', hc: 'negro', seed: 21, prop: 'sandwich' },
  chinawok:  { body: 'normal',      outfit: 'tWok',       tone: 'gris',  hair: 'corto', hc: 'negro', seed: 33, prop: 'wok' },
  belisario: { body: 'normalAncho', outfit: 'tBelisario', tone: 'verde', hair: 'cana',  hc: 'gris',  seed: 41, prop: 'chicken', blood: 1 },
  wong:      { body: 'alto',        outfit: 'tWong',      tone: 'verde', hair: 'corto', hc: 'casta', seed: 52, prop: 'scanner' },
  ripley:    { body: 'altoFlaco',   outfit: 'tRipley',    tone: 'gris',  hair: 'cana',  hc: 'gris',  seed: 63, prop: 'bagK',    faceBlood: 0 },
  saga:      { body: 'normalFlaco', outfit: 'tSaga',      tone: 'verde', hair: 'grena', hc: 'rubio', seed: 74, prop: 'bagL' },
  tailoy:    { body: 'bajo',        outfit: 'tTailoy',    tone: 'palido', hair: 'corto', hc: 'negro', seed: 85, prop: 'pencil' }
};

/* Paso pesado: cae en cada apoyo, el torso se mece, la cabeza cabecea, un brazo carga lo suyo y el otro cuelga. */
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
function buildDeadT(spec, bd, ou) {
  var hb = bd.h, hr = hb === 'bajo' ? 3.1 : 3.7, torsoL = hb === 'bajo' ? 7 : hb === 'alto' ? 11 : 9, legL = hb === 'bajo' ? 6 : hb === 'alto' ? 10 : 7, armL = hb === 'bajo' ? 6 : hb === 'alto' ? 9 : 7;
  var th = Math.max(4, bd.tw - 3 + (bd.belly ? 2 : 0) - (bd.thin ? 1 : 0)), tx0 = Math.round(2 * hr) + 1, lx = tx0 + torsoL, cy = 8;
  var W = lx + legL + 5, H = 16, b = new Buf(W, H), sk = TONES[spec.tone || 'verde'], hc = HAIRS[spec.hc || 'negro'], pool = new Buf(W, H);
  var long_ = ou.slv !== 'none', rs = long_ ? N(ou.slvR || ou.top) : N(sk), top = cy - Math.floor(th / 2), bot = top + th - 1;
  [[top - 2, -1, 0], [bot + 2, 1, -1]].forEach(function (a, i) {
    var y0 = a[0], x1 = tx0 + armL - (i ? 1 : 0);
    if (ou.slv === 'long') { pLine(b, tx0 + 1, y0, x1 - 2, y0 + a[1], 2, rs); pLine(b, x1 - 1, y0 + a[1], x1, y0 + a[1], 2, N(sk)); }
    else { pLine(b, tx0 + 3, y0, x1, y0 + a[1], 2, N(sk)); pLine(b, tx0 + 1, y0, tx0 + 4, y0, 2, rs); }
  });
  var rp = N(ou.bot);
  pLine(b, lx - 1, cy - 2, lx + legL - 1, cy - 2, 3, rp);
  pLine(b, lx - 1, cy + 1, lx + legL - 2, cy + 2, 3, rp);
  pRect(b, lx + legL, cy - 3, 3, 3, N(ou.shoe)); pRect(b, lx + legL - 1, cy + 1, 3, 3, N(ou.shoe));
  mkBegin(b); mkRect(tx0, top, torsoL, th); paint(b, N(ou.top));
  if (ou.apr) { var A = ou.apr; b.rect(tx0 + 2, top + 1, torsoL - 2, th - 1, A[2]); b.rect(tx0 + 2, top + 1, torsoL - 2, 1, A[3]); b.rect(tx0 + torsoL - 1, top + 1, 1, th - 1, A[1]); }
  else if (spec.outfit === 'tRipley') { b.rect(tx0 + torsoL - 3, cy - 1, 3, 3, ou.shirt[2]); b.set(tx0 + torsoL - 2, cy, ou.trim[2]); b.rect(tx0 + 2, top, 1, th, ou.top[0]); }
  else if (spec.outfit === 'tSaga') { b.rect(tx0 + torsoL - 2, top, 2, th, ou.top[1]); b.rect(tx0 + 3, top + 1, 2, 2, R_WH[3]); }
  else if (spec.outfit === 'tWong') { b.rect(tx0 + 3, top + 1, 3, 2, R_WH[3]); b.set(tx0 + 4, top + 1, R_RWG[2]); }
  else if (spec.outfit === 'tTailoy') { b.rect(tx0 + 1, cy, torsoL - 1, 1, R_YEL[2]); }
  b.set(tx0 + 3, top + 1, sk[1]); b.set(tx0 + 4, top + 1, sk[2]); b.set(tx0 + 5, bot - 1, BLOOD[2]);
  b.rect(tx0, bot, torsoL, 1, ou.top[0]);
  var hx = 1 + hr;
  mkBegin(b); mkEll(hx, cy, hr, hr); paint(b, N(sk));
  if (ou.hat === 'toque') { mkBegin(b); mkEll(hx - 0.5, cy, hr, hr - 0.4); paint(b, N(ou.hatR)); }
  else if (ou.hat === 'gorra' || ou.hat === 'visera') { mkBegin(b); mkEll(hx - 0.5, cy, hr - 0.2, hr - 0.2); paint(b, N(ou.hatR)); b.rect(Math.round(hx + hr) - 1, cy - 1, 2, 3, ou.hatR[0]); if (ou.hat === 'visera') { b.set(Math.round(hx - 1), cy, sk[2]); b.set(Math.round(hx - 2), cy - 1, sk[2]); } }
  else if (spec.hair !== 'calvo') { mkBegin(b); mkEll(hx - 1.2, cy, hr - 0.6, hr - 0.2); paint(b, N(hc)); if (spec.hair === 'largo' || spec.hair === 'grena') { b.rect(0, cy - 2, 1, 5, hc[1]); } }
  b.set(Math.round(hx + 1), cy - 1, C_EYE2); b.set(Math.round(hx + 1), cy + 1, C_EYE2); b.set(Math.round(hx + 2), cy, C_MOUTH);
  b.outlineRim();
  pool.blit(b, 0, 0);
  return pool.toCanvas(Math.round(W / 2) - 1, cy);
}

function buildTrab(spec) {
  var bd = bodyOf(spec.body), ou = OUTFITS[spec.outfit], n = 6, cv = baseCv(bd, 32, 14, 0), move = [], hurt = [];
  var P = {
    bd: bd, ou: ou, skin: TONES[spec.tone || 'verde'], hair: spec.hair || 'corto', hc: HAIRS[spec.hc || 'negro'], seed: spec.seed || 1,
    wear: spec.wear === undefined ? 1 : spec.wear, blood: spec.blood || 0, faceBlood: spec.faceBlood || 0, rot: spec.rot,
    ox: cv.ox, oy: cv.oy, spec: spec, blind: false
  };
  for (var fr = 0; fr < n; fr++) {
    var b = new Buf(cv.W, cv.H);
    drawFigure(b, P, poseTrab(bd, fr, n, P));
    b.outlineRim();
    hurt.push(b.solid().toCanvas(cv.ox, cv.oy));
    move.push(b.toCanvas(cv.ox, cv.oy));
  }
  return { move: move, hurt: hurt, dead: buildDeadT(spec, bd, ou) };
}
safe('trabajadores', function () {
  if (!S.zvar) Object.defineProperty(S, 'zvar', { value: {}, enumerable: false, writable: true, configurable: true });
  MIRA.trabKeys = [];
  Object.keys(TRABS).forEach(function (m) { lazy(S.zvar, 'trab_' + m, function () { return buildTrab(TRABS[m]); }); MIRA.trabKeys.push('trab_' + m); });
});

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

/* ======================== LA PICARONERA (Dona Chancaca) ======================== */
var PC = {
  sk: ['#3f4a44', '#5f6b55', '#7f8c71', '#a3ad8a'], hair: ['#4a4a46', '#74726a', '#9a988e', '#c4c1b3'],
  kerch: ['#5a1414', '#8e2220', '#c8382e', '#ee6c58'], blouse: ['#5a3a10', '#8a5a1c', '#b8832c', '#e0aa50'],
  skirt: ['#10182e', '#1c2a4c', '#2e4478', '#4c68a4'], apron: ['#8a7e60', '#b8ad8a', '#dcd2b4', '#f4ecd4'],
  honey: ['#7a4a0c', '#b8741a', '#e8a020', '#ffd05a'], wood: ['#4a2e18', '#6b4223', '#a06a36', '#c99458'],
  metal: ['#3b4250', '#5c6570', '#8c949a', '#cfd3cc'], shoe: ['#1a0e0a', '#2a1a14', '#4a3020', '#6a4a34'],
  eye: '#eef0d2', pupil: '#1a1814', mouth: '#2a1214', tongue: '#8a2e32', tooth: '#eae6cc', gold: '#f0c838', blood: '#8a2a26', white: '#f3efe2'
};
var PW = 36, PH = 42, PFY = 38, PCX = 17.5;
function picaronG(g, cx, cy, big) {                          // picaron: rosquilla frita con miel (5x5 o 7x7)
  var r = big ? 3.2 : 2.4, hole = big ? 1.1 : 0.6, y, x;
  for (y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) for (x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
    var dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy);
    if (d > r || d < hole) continue;
    var lit = -(dx * 0.6 + dy * 0.8) / (r || 1);
    g.set(x, y, lit > 0.45 ? '#ffd05a' : (lit > -0.1 ? '#e8a020' : (lit > -0.55 ? '#c47a1c' : '#8a4e10')));
  }
  g.set(Math.round(cx - r * 0.5), Math.round(cy - r * 0.6), '#fff2b0');
}
function ladleG(g, hx, hy, tx, ty, drip) {                   // cucharon: mango de madera, cuchara de metal con miel
  g.line(hx, hy, tx, ty, PC.wood[2]); g.line(hx + 1, hy, tx + 1, ty, PC.wood[1]);
  var ux = tx - hx, uy = ty - hy, L = Math.sqrt(ux * ux + uy * uy) || 1; ux /= L; uy /= L;
  var bx = tx + ux * 1.6, by = ty + uy * 1.6;
  blobG(g, bx, by, 2.6, 2.0, PC.metal);
  g.set(Math.round(bx), Math.round(by), PC.honey[2]); g.set(Math.round(bx) + 1, Math.round(by), PC.honey[1]); g.set(Math.round(bx) - 1, Math.round(by) - 1, PC.honey[3]);
  if (drip) { g.set(Math.round(bx) + 2, Math.round(by) + 2, PC.honey[2]); g.set(Math.round(bx) + 2, Math.round(by) + 3, PC.honey[3]); if (drip > 1) g.set(Math.round(bx) + 2, Math.round(by) + 5, PC.honey[2]); }
}
function picaFace(g, hy, o) {                                // cara de frente: ojos desparejos, ojeras, un diente de oro
  var P_ = PC, eyes = o.eyes || 'normal', m = o.mouth || 'grin', cx = 17;
  g.set(12, hy, P_.sk[0]); g.set(23, hy, P_.sk[0]);
  // cejas
  if (eyes === 'x') { /* ojos en X, sin cejas */ }
  else if (o.angry === false) { g.set(14, hy - 3, P_.hair[1]); g.set(15, hy - 3, P_.hair[1]); g.set(20, hy - 3, P_.hair[1]); g.set(21, hy - 3, P_.hair[1]); }
  else { g.set(14, hy - 3, P_.hair[1]); g.set(15, hy - 2, P_.hair[1]); g.set(16, hy - 2, P_.hair[1]); g.set(19, hy - 2, P_.hair[1]); g.set(20, hy - 2, P_.hair[1]); g.set(21, hy - 3, P_.hair[1]); }
  if (eyes === 'x') {
    [[14, 0], [16, 0], [15, 1]].forEach(function (q) { g.set(q[0], hy - 1 + q[1], P_.pupil); }); g.set(14, hy, P_.pupil); g.set(16, hy - 1 + 2, P_.pupil); g.set(14, hy + 1, P_.pupil); g.set(16, hy + 1, P_.pupil); g.set(14, hy - 1, P_.pupil); g.set(16, hy - 1, P_.pupil); g.set(15, hy, P_.pupil);
    g.set(19, hy - 1, P_.pupil); g.set(21, hy - 1, P_.pupil); g.set(20, hy, P_.pupil); g.set(19, hy + 1, P_.pupil); g.set(21, hy + 1, P_.pupil);
  } else if (eyes === 'shut') {
    g.rect(14, hy, 3, 1, P_.pupil); g.rect(19, hy, 3, 1, P_.pupil);
  } else {
    var big = eyes === 'wide';
    g.rect(14, hy - 1, 3, big ? 3 : 2, P_.eye); g.rect(19, hy - 1, 2 + (big ? 1 : 0), big ? 3 : 2, P_.eye);      // el izquierdo, mas grande
    g.set(15, hy, P_.pupil); g.set(15, hy + (big ? 1 : 0), P_.pupil); g.set(20, hy - (big ? 0 : 0), P_.pupil);
    if (!big) { g.set(21, hy - 1, P_.sk[1]); }
    g.set(14, hy + 2, P_.sk[0]); g.set(15, hy + 2, P_.sk[0]); g.set(19, hy + 1 + (big ? 1 : 0), P_.sk[0]); g.set(20, hy + 1 + (big ? 1 : 0), P_.sk[0]);   // ojeras
  }
  g.set(17, hy + 1, P_.sk[1]); g.set(18, hy + 2, P_.sk[0]);   // nariz
  var my = hy + 3;
  if (m === 'yell') { g.rect(14, my - 1, 8, 4, P_.mouth); g.rect(15, my - 1, 6, 1, P_.tooth); g.set(17, my - 1, P_.mouth); g.set(18, my - 1, P_.gold); g.rect(16, my + 1, 4, 2, P_.tongue); }
  else if (m === 'oh') { g.rect(16, my - 1, 4, 3, P_.mouth); g.set(16, my - 1, P_.tooth); g.set(19, my - 1, P_.tooth); g.set(17, my + 1, P_.tongue); }
  else if (m === 'ouch') { g.rect(14, my - 1, 8, 3, P_.mouth); g.set(15, my - 1, P_.tooth); g.set(17, my - 1, P_.tooth); g.set(20, my - 1, P_.tooth); g.rect(16, my + 1, 4, 1, P_.tongue); g.set(13, my + 2, P_.blood); }
  else if (m === 'closed') { g.rect(15, my, 6, 1, P_.mouth); g.set(14, my - 1, P_.mouth); g.set(21, my - 1, P_.mouth); }
  else { g.rect(14, my, 8, 1, P_.mouth); g.set(14, my - 1, P_.mouth); g.set(21, my - 1, P_.mouth); g.set(15, my + 1, P_.tooth); g.set(17, my + 1, P_.gold); g.set(18, my + 1, P_.gold); g.set(20, my + 1, P_.tooth); }
  g.set(21, hy + 2, P_.blood); g.set(22, hy + 2, P_.blood); g.set(21, hy + 3, P_.sk[0]);   // mordisco en la mejilla
}
function picaKerchief(g, hy, back, dxk) {
  var K_ = PC.kerch, y, x;
  var cy = hy - 1.6;
  for (y = Math.floor(cy - 5); y <= hy - 3; y++) for (x = 11; x <= 24; x++) {
    var dx = (x - PCX) / 6.8, dy = (y - cy) / 4.4; if (dx * dx + dy * dy > 1) continue;
    var lit = -(dx * 0.5 + dy * 0.9);
    var c = lit > 0.5 ? K_[3] : (lit > 0 ? K_[2] : (lit > -0.55 ? K_[1] : K_[0]));
    g.set(x, y, c);
    if (y % 2 === 0 && ((x + (y % 4 === 0 ? 0 : 2)) % 4) === 1 && c !== K_[0]) g.set(x, y, PC.white);                    // lunares
  }
  // cuñas laterales: el pañuelo baja por los lados de la cara
  g.set(11, hy - 2, K_[1]); g.set(12, hy - 2, K_[2]); g.set(23, hy - 2, K_[0]); g.set(24, hy - 2, K_[1]);
  if (back) { for (y = hy - 1; y <= hy + 3; y++) for (x = 12; x <= 23; x++) { var q = (x - PCX) / 6.2, w = (y - hy - 1) / 3.2; if (q * q + w * w < 1) g.set(x, y, ((x + y) % 5 === 0) ? PC.white : K_[y > hy + 1 ? 1 : 2]); } }
  // nudo
  var kx = back ? 17 : 21 + (dxk || 0), ky = Math.round(cy - 4.6);
  [[0, 0], [1, -1], [2, -1], [1, 0], [2, 0], [-1, -1], [-2, -1], [-1, 0], [-2, 0], [0, 1]].forEach(function (p, i) { g.set(kx + p[0] + (back ? 0 : 0), ky + p[1], i < 3 || i > 6 ? K_[2] : K_[1]); });
  g.set(kx, ky - 1, K_[3]); g.set(kx + 1, ky - 2, K_[2]); g.set(kx - 1, ky - 2, K_[2]);
}
/* o: { dy (sube/baja el torso), back, mouth, eyes, lean, headDx, legL, legR (alzar pie), armL:{h:[x,y]}, armR:{h:[x,y]}, ladle:{h:[x,y], t:[x,y], drip}, pic:[x,y] (picaron en la mano), skirtSwing } */
function drawPica(o) {
  var g = new G(PW, PH), P_ = PC, dy = o.dy || 0, lean = o.lean || 0, back = !!o.back, FY = PFY;
  var hemY = FY - 3, waistY = FY - 10, shY = FY - 17 + dy, headCY = FY - 23 + dy, y, x;
  var sw = o.skirtSwing || 0;
  // piernas y sandalias
  [[13, o.legL || 0], [20, o.legR || 0]].forEach(function (L) {
    var lx = L[0], lift = L[1];
    for (y = hemY + 1; y <= FY - 1 - lift; y++) span(g, y, lx, lx + 2, P_.sk);
    g.rect(lx - 1, FY - lift, 5, 1, P_.shoe[2]); g.rect(lx - 1, FY - lift, 5, 1, P_.shoe[2]); g.set(lx - 1, FY - lift, P_.shoe[3]); g.set(lx + 3, FY - lift, P_.shoe[0]);
    g.set(lx, FY - 1 - lift, P_.shoe[1]); g.set(lx + 2, FY - 1 - lift, P_.shoe[1]);                  // tiras
  });
  // falda
  for (y = waistY; y <= hemY; y++) {
    var t = (y - waistY) / (hemY - waistY), hw = 6 + t * 4.4;
    span(g, y, PCX - hw + sw * t, PCX + hw + sw * t, P_.skirt);
    if (y > waistY + 2) for (x = Math.round(PCX - hw + 3 + sw * t); x < PCX + hw + sw * t - 1; x += 4) g.set(x, y, P_.skirt[1]);       // pliegues
  }
  span(g, hemY, PCX - 10.4 + sw, PCX + 10.4 + sw, [P_.skirt[1], P_.skirt[2], P_.skirt[3], P_.skirt[3]]);
  // blusa (torso)
  for (y = shY - 1; y <= waistY + 1; y++) {
    var u = (y - shY) / (waistY - shY + 1), hw2 = 6.6 - u * 1.4;
    span(g, y, PCX - hw2 + lean * (1 - u), PCX + hw2 + lean * (1 - u), P_.blouse);
  }
  var tx0 = function (y) { return PCX + lean * (1 - (y - shY) / (waistY - shY + 1)); };
  if (!back) {
    // mandil: peto + falda de mandil, crema, con manchas de miel y un poco de sangre (humor negro)
    for (y = shY + 1; y <= hemY - 1; y++) {
      var v = (y - shY - 1) / (hemY - shY - 2), hwa = v < 0.3 ? 3.2 + v * 4 : 4.4 + (v - 0.3) * 3.4;
      span(g, y, tx0(y) - hwa, tx0(y) + hwa, P_.apron);
    }
    // cinta del cuello
    g.line(Math.round(tx0(shY) - 3), shY + 1, Math.round(PCX - 5), shY - 1, P_.apron[1]); g.line(Math.round(tx0(shY) + 3), shY + 1, Math.round(PCX + 5), shY - 1, P_.apron[1]);
    // manchas
    [[15, 4, 2, 1], [19, 7, 2, 2], [16, 10, 3, 1], [20, 12, 2, 1]].forEach(function (m, i) { g.rect(m[0], shY + m[1], m[2], m[3], i % 2 ? P_.honey[1] : P_.honey[2]); });
    g.set(18, shY + 3, P_.blood); g.set(19, shY + 3, P_.blood); g.set(15, shY + 9, P_.blood); g.set(14, shY + 10, '#6a1e1a');
    g.rect(17, waistY - 1, 4, 3, P_.apron[1]); g.rect(17, waistY - 1, 4, 1, P_.apron[0]); g.set(19, waistY, P_.honey[2]);      // bolsillo
    g.set(14, hemY - 2, P_.honey[2]); g.set(15, hemY - 1, P_.honey[1]); g.set(21, hemY - 3, P_.honey[1]);
  } else {
    // espalda: lazo del mandil y cintas
    g.rect(PCX - 5.5, waistY - 1, 11, 2, P_.apron[1]);
    g.rect(PCX - 4, waistY - 1, 3, 3, P_.apron[3]); g.rect(PCX + 1, waistY - 1, 3, 3, P_.apron[3]); g.rect(PCX - 1, waistY, 2, 2, P_.apron[1]);
    g.set(PCX - 1, waistY + 3, P_.apron[2]); g.set(PCX, waistY + 4, P_.apron[1]); g.set(PCX + 1, waistY + 3, P_.apron[2]); g.set(PCX + 2, waistY + 5, P_.apron[1]);
    for (y = shY + 2; y <= waistY - 2; y++) g.set(Math.round(PCX + (y % 2 ? -1 : 1)), y, P_.blouse[0]);
    g.rect(14, shY + 4, 2, 1, P_.honey[2]); g.rect(19, shY + 6, 3, 1, P_.honey[1]);
  }
  // cuello
  g.rect(16, headCY + 4, 3, 2, P_.sk[1]);
  // brazos
  var shL = [PCX - 6 + lean * 0.8, shY + 1], shR = [PCX + 6 + lean * 0.8, shY + 1], hL = o.armL ? o.armL.h : [PCX - 8, shY + 11], hR = o.armR ? o.armR.h : [PCX + 8, shY + 11];
  [[shL, hL, -1], [shR, hR, 1]].forEach(function (A) {
    var s_ = A[0], h = A[1], e = ik2(s_[0], s_[1], h[0], h[1], 5.2, 5, A[2] > 0 ? -1 : 1);
    if (o.elbows || (A[2] > 0 ? o.armRdraw === false : o.armLdraw === false)) return;
    limbG(g, s_[0], s_[1], e[0], e[1], P_.blouse, 3);                                              // manga arremangada
    limbG(g, e[0], e[1], h[0], h[1], P_.sk, 2);
    g.set(Math.round(e[0]), Math.round(e[1]), P_.blouse[1]);
  });
  if (o.elbows) {                                            // de espaldas: se ven los codos y la punta del mango que sobresale
    [[shL, o.elbows[0]], [shR, o.elbows[1]]].forEach(function (A) { limbG(g, A[0][0], A[0][1], A[1][0], A[1][1], P_.blouse, 3); g.rect(Math.round(A[1][0]) - 1, Math.round(A[1][1]), 3, 2, P_.blouse[1]); });
    if (o.knob) { g.line(o.elbows[1][0], o.elbows[1][1] + 1, o.knob[0], o.knob[1], P_.wood[2]); g.set(o.knob[0], o.knob[1], P_.wood[3]); g.set(o.knob[0] + 1, o.knob[1], P_.wood[1]); }
  }
  // cucharon (antes de la mano, para que la mano lo agarre)
  if (o.ladle) { ladleG(g, o.ladle.h[0], o.ladle.h[1], o.ladle.t[0], o.ladle.t[1], o.ladle.drip); }
  if (o.armLdraw !== false && !o.elbows) handG(g, hL[0], hL[1], P_.sk, !!o.ladle && o.ladle.hand === 'L');
  if (o.armRdraw !== false && !o.elbows) handG(g, hR[0], hR[1], P_.sk, !!o.ladle && o.ladle.hand === 'R');
  if (o.pic) picaronG(g, o.pic[0], o.pic[1], true);
  // cabeza
  var hdx = o.headDx || 0, hy = headCY;
  blobG(g, PCX + hdx, hy, 5.2, 4.9, P_.sk);
  g.set(12 + hdx, hy + 1, P_.sk[1]); g.set(23 + hdx, hy + 1, P_.sk[0]);                              // orejas
  var hg = new G(PW, PH);
  if (!back) {
    // pelo cano a los lados
    for (y = hy - 1; y <= hy + 3; y++) { g.set(11 + hdx, y, P_.hair[y === hy + 3 ? 0 : 1]); g.set(24 + hdx, y, P_.hair[0]); }
    g.set(12 + hdx, hy + 2, P_.hair[2]); g.set(23 + hdx, hy + 2, P_.hair[1]);
    picaFace(g, hy, o);
    picaKerchief(g, hy, false, hdx);
  } else {
    blobG(g, PCX + hdx, hy + 1, 5.2, 5.0, P_.hair);
    picaKerchief(g, hy + 1, true, hdx);
    g.rect(PCX - 2 + hdx, hy + 4, 4, 2, P_.hair[1]);
  }
  return g;
}
function picaCanvas(o) { return fin(drawPica(o), PW / 2, PFY); }

function picaDead() {                                        // tendida de lado vista desde arriba: cabeza a la izquierda; cucharon y picarones por el suelo
  var g = new G(44, 20), P_ = PC, y, x, cy = 9;
  // charco de miel bajo el cuerpo
  for (y = 0; y < 20; y++) for (x = 0; x < 44; x++) { var dx = (x - 22) / 21, dy = (y - 11) / 8; if (dx * dx + dy * dy < 1 && ((x * 3 + y * 5) % 7 > 1)) g.set(x, y, dx * dx + dy * dy < 0.5 ? P_.honey[1] : P_.honey[0]); }
  // piernas y sandalias
  limbG(g, 33, 7, 40, 6, P_.sk, 3); limbG(g, 33, 12, 40, 13, P_.sk, 3); g.rect(40, 5, 3, 3, P_.shoe[2]); g.rect(40, 12, 3, 3, P_.shoe[2]);
  // falda
  for (y = 3; y <= 15; y++) { var t = Math.abs(y - 9) / 6.5; span(g, y, 22, 36 - t * 3, P_.skirt); }
  // torso con blusa y mandil
  for (y = 4; y <= 14; y++) span(g, y, 12, 24, P_.blouse);
  for (y = 5; y <= 13; y++) span(g, y, 14, 27, P_.apron);
  g.rect(17, 8, 3, 2, P_.honey[2]); g.rect(22, 6, 2, 2, P_.blood); g.rect(20, 11, 3, 1, P_.honey[1]); g.set(15, 7, P_.honey[1]);
  // brazos
  limbG(g, 14, 4, 9, 1, P_.blouse, 2); handG(g, 7, 1, P_.sk); limbG(g, 15, 14, 20, 17, P_.blouse, 2); handG(g, 22, 18, P_.sk);
  // cabeza con panuelo y ojos en X
  blobG(g, 7, cy, 5, 5.2, P_.sk);
  for (y = 3; y <= 12; y++) for (x = 2; x <= 9; x++) { var qx = (x - 6) / 4.4, qy = (y - 7.6) / 4.2; if (qx * qx + qy * qy < 1) g.set(x, y, ((x * 7 + y * 13) % 5 === 0) ? P_.white : (qx + qy > 0.4 ? P_.kerch[1] : P_.kerch[2])); }
  g.set(10, 6, P_.pupil); g.set(11, 7, P_.pupil); g.set(10, 8, P_.pupil); g.set(11, 6, P_.pupil); g.set(10, 7, P_.pupil); g.set(11, 8, P_.pupil);
  g.set(9, 12, P_.pupil); g.set(10, 13, P_.pupil); g.set(9, 13, P_.mouth); g.set(8, 12, P_.mouth);
  g.set(11, 10, P_.tooth); g.set(10, 10, P_.blood);
  // cucharon caido y picarones
  g.line(1, 17, 13, 18, P_.wood[2]); g.line(2, 18, 13, 19, P_.wood[1]); blobG(g, 15, 18, 2.8, 1.6, P_.metal); g.set(15, 18, P_.honey[2]);
  picaronG(g, 4, 14, false); picaronG(g, 38, 17, false); picaronG(g, 29, 2, false);
  return fin(g, 22, 10);
}
var PICA = null;
function buildPica() {
  var mk = picaCanvas;
  var idle = [
    mk({ dy: 0, mouth: 'grin', eyes: 'normal', armL: { h: [8, 22] }, armR: { h: [26, 27] }, ladle: { h: [8, 22], t: [5, 10], hand: 'L', drip: 1 } }),
    mk({ dy: 1, mouth: 'closed', eyes: 'normal', armL: { h: [8, 23] }, armR: { h: [26, 28] }, ladle: { h: [8, 23], t: [5, 11], hand: 'L', drip: 2 } })
  ];
  var grita = [
    mk({ dy: -1, mouth: 'yell', eyes: 'wide', armL: { h: [7, 13] }, armR: { h: [25, 13] }, ladle: { h: [7, 13], t: [3, 2], hand: 'L', drip: 1 }, headDx: 0 }),
    mk({ dy: 0, mouth: 'oh', eyes: 'wide', armL: { h: [9, 14] }, armR: { h: [26, 14] }, ladle: { h: [9, 14], t: [6, 2], hand: 'L', drip: 2 }, headDx: 1 })
  ];
  var frie = [[[7, 22], [28, 20], [29, 24]], [[8, 21], [28, 22], [30, 20]], [[7, 20], [27, 20], [30, 16]]].map(function (e, i) {
    return mk({ back: true, dy: i === 1 ? 1 : 0, elbows: [e[0], e[1]], knob: e[2], headDx: i - 1 });
  });
  var lanza = [
    mk({ dy: -1, lean: -1, mouth: 'yell', eyes: 'wide', armL: { h: [8, 25] }, armR: { h: [28, 9] }, pic: [29, 6], headDx: -1 }),
    mk({ dy: 0, lean: 1, mouth: 'oh', eyes: 'normal', armL: { h: [8, 25] }, armR: { h: [30, 21] }, pic: [32, 19], headDx: 1 }),
    mk({ dy: 1, lean: 1, mouth: 'grin', eyes: 'normal', armL: { h: [8, 25] }, armR: { h: [27, 27] }, headDx: 0 })
  ];
  var camina = [
    mk({ dy: 0, legL: 0, legR: 0, mouth: 'grin', armL: { h: [8, 26] }, armR: { h: [27, 22] }, ladle: { h: [27, 22], t: [31, 11], hand: 'R', drip: 1 } }),
    mk({ dy: -1, legL: 2, legR: 0, skirtSwing: 1, mouth: 'grin', armL: { h: [8, 25] }, armR: { h: [27, 21] }, ladle: { h: [27, 21], t: [31, 10], hand: 'R' } }),
    mk({ dy: 0, legL: 0, legR: 0, mouth: 'closed', armL: { h: [7, 26] }, armR: { h: [27, 22] }, ladle: { h: [27, 22], t: [31, 11], hand: 'R', drip: 2 } }),
    mk({ dy: -1, legL: 0, legR: 2, skirtSwing: -1, mouth: 'grin', armL: { h: [8, 25] }, armR: { h: [27, 21] }, ladle: { h: [27, 21], t: [31, 10], hand: 'R' } })
  ];
  var hurt = mk({ dy: -1, lean: 1, mouth: 'ouch', eyes: 'shut', armL: { h: [5, 17] }, armR: { h: [30, 18] }, headDx: -1 });
  return { idle: idle, grita: grita, frie: frie, lanza: lanza, camina: camina, hurt: hurt, dead: picaDead() };
}
safe('picaronera', function () { MIRA.picaronera = buildPica(); });

/* ======================== CARRETILLA DE PICARONES ======================== */
var CR = {
  red: ['#5e1410', '#9a2420', '#d4382e', '#f26a58'], wht: ['#8a887e', '#b8b4a2', '#e8e4d4', '#fbf8ec'],
  iron: ['#14141a', '#26262e', '#3e3e48', '#5c5c68'], clay: ['#4a2418', '#7a3a22', '#b05a34', '#d88454'],
  wood: ['#4a2e18', '#6b4223', '#a06a36', '#c99458'], steel: ['#3b4250', '#5c6570', '#8c949a', '#cfd3cc'],
  cream: ['#8a7e60', '#b8ad8a', '#e2d8b8', '#f6f0d8'], teal: ['#14484c', '#217a7e', '#38b0ac', '#82dcd2']
};
function umbrella(g, cx, apexY, hw, hgt, tilt) {            // sombrilla rayada rojo y blanco vista de frente, cono con borde ondulado
  var x, y, nst = 10;
  for (x = cx - hw; x <= cx + hw; x++) {
    var t = (x - cx) / hw, yt = apexY + hgt * Math.abs(t), yb = apexY + hgt + 2.8 * Math.sqrt(Math.max(0, 1 - t * t));
    for (y = Math.floor(yt); y <= Math.ceil(yb); y++) {
      if (y < yt - 0.01 || y > yb) continue;
      var u = (x - cx) / Math.max(1, (y - apexY + 0.5) * hw / hgt), idx = Math.floor((Math.max(-0.999, Math.min(0.999, u)) + 1) * nst / 2), red = idx % 2 === 0;
      var r = red ? CR.red : CR.wht, lit = -t * 0.9 - (y - apexY) / (hgt + 3) * 0.5 + 0.35;
      var c = lit > 0.55 ? r[3] : (lit > 0.1 ? r[2] : (lit > -0.45 ? r[1] : r[0]));
      if (y >= yb - 1.3) c = r[1 + (red ? 0 : 0)] === c ? r[0] : r[1];
      g.set(x, y, c);
    }
    if ((x - cx) % 5 === 0 && Math.abs(t) < 0.98) g.set(x, Math.ceil(yb) + 1, (idx2(x, cx, hw, nst) % 2 === 0) ? CR.red[1] : CR.wht[1]);          // flecos
  }
  g.set(cx, apexY - 1, CR.steel[3]); g.set(cx, apexY, CR.steel[2]); g.set(cx - 1, apexY, CR.steel[3]);
}
function idx2(x, cx, hw, n) { var u = (x - cx) / hw; return Math.floor((Math.max(-0.999, Math.min(0.999, u)) + 1) * n / 2); }
function cartG(f) {                                          // f = 0/1: parpadeo de la llama y burbujas
  var g = new G(56, 64), x, y, i;
  // sombrilla y mastil
  umbrella(g, 28, 2, 24, 19);
  g.rect(27, 24, 2, 14, CR.steel[2]); g.rect(27, 24, 1, 14, CR.steel[3]);
  // cubierta (techo del cajon)
  for (y = 42; y <= 47; y++) span(g, y, 8 + (47 - y) * 0.6, 48 - (47 - y) * 0.6, [CR.wood[0], CR.wood[1], CR.wood[2], CR.wood[3]]);
  // hornilla (cilindro de barro) con la boca del fuego
  for (y = 37; y <= 46; y++) span(g, y, 17, 39, CR.clay);
  g.rect(24, 40, 9, 6, CR.iron[0]);
  var fl = f ? [[26, 45, 2, '#e8421c'], [28, 44, 3, '#ff7a1c'], [27, 43, 2, '#ffb02a'], [30, 45, 2, '#e8421c'], [29, 42, 2, '#ffd44a'], [31, 44, 1, '#ff7a1c']] : [[25, 45, 2, '#e8421c'], [28, 45, 3, '#ff7a1c'], [27, 43, 2, '#ffb02a'], [30, 44, 2, '#e8421c'], [28, 41, 2, '#ffd44a'], [30, 43, 2, '#ffb02a']];
  fl.forEach(function (q) { for (i = 0; i < q[2]; i++) { g.set(q[0] + i, q[1], q[3]); g.set(q[0] + (i ? 0 : 1), q[1] - 1, q[3]); } });
  g.set(27, 42 - f, '#fff2b0'); g.set(28, 43, '#fff2b0');
  for (x = 17; x <= 39; x += 4) g.set(x, 38, CR.clay[0]);
  // paila: aro de hierro, aceite dorado con picarones flotando
  blobG(g, 28, 35.5, 13.4, 5.2, CR.iron);
  for (y = 31; y <= 40; y++) for (x = 16; x <= 40; x++) {
    var dx = (x - 28) / 11.6, dy = (y - 35.4) / 3.9; if (dx * dx + dy * dy > 1) continue;
    var lit = -(dx * 0.5 + dy * 0.9);
    g.set(x, y, lit > 0.35 ? '#f0b84a' : (lit > -0.2 ? '#d9922a' : '#a8641a'));
  }
  [[21, 34, 0], [26, 36, 1], [32, 34, 1], [36, 36, 0], [29, 33, 0], [24, 38, 1], [33, 38, 0]].forEach(function (q) {
    var o = (q[2] + f) % 2;
    g.rect(q[0] - 2, q[1], 5, 2, o ? '#e8a020' : '#c47a1c'); g.rect(q[0] - 1, q[1] - 1, 3, 1, o ? '#ffd05a' : '#e8a020'); g.set(q[0], q[1], '#8a4e10'); g.set(q[0] - 2, q[1] + 1, '#8a4e10'); g.set(q[0] + 2, q[1], '#8a4e10');
    g.set(q[0] - 1, q[1] - 1, '#fff2b0');
  });
  [[19, 36], [34, 33], [24, 34], [38, 37]].forEach(function (q, k) { if ((k + f) % 2) g.set(q[0], q[1], '#fff2b0'); });
  g.rect(14, 34, 3, 2, CR.iron[2]); g.rect(40, 34, 3, 2, CR.iron[1]);                              // asas
  // vapor (dos cuadros)
  [[22, 29 - f, 1], [30, 28 + f, 1], [37, 29, 1]].forEach(function (q) { g.set(q[0], q[1], '#e8ecec'); g.set(q[0] + (f ? 1 : -1), q[1] - 1, '#cfd6d6'); });
  // cajon: frente blanca, franja roja, cartel
  for (y = 48; y <= 58; y++) span(g, y, 8, 48, y > 55 ? CR.red : CR.wht);
  g.rect(8, 47, 41, 1, CR.wood[3]);
  g.rect(9, 49, 39, 7, CR.red[1]); g.rect(9, 49, 39, 1, CR.red[3]); g.rect(9, 55, 39, 1, CR.red[0]);
  g.rect(10, 50, 37, 5, CR.red[2]);
  if (px.text) px.text(g, 'PICARONES', 11, 51, { font: 'a5', ink: CR.cream[3], shadow: CR.red[0] });
  g.rect(8, 57, 41, 1, CR.red[1]);
  // frasco de miel y platito de picarones sobre la cubierta
  g.rect(10, 40, 5, 6, '#8a5a18'); g.rect(11, 41, 3, 4, '#e8a020'); g.set(11, 41, '#ffd05a'); g.rect(10, 39, 5, 1, CR.steel[2]);
  g.rect(42, 44, 6, 2, CR.cream[2]); picaronG(g, 44, 43, false); picaronG(g, 46, 44, false);
  // ruedas de bicicleta (casi de canto) y patas
  [6, 50].forEach(function (cx, k) {
    for (y = 51; y <= 63; y++) for (x = cx - 3; x <= cx + 3; x++) { var dx = (x - cx) / 3.0, dy = (y - 57) / 6.6; var d = dx * dx + dy * dy; if (d > 1) continue; g.set(x, y, d > 0.55 ? CR.iron[1 + (x > cx ? 0 : 1)] : (d > 0.3 ? CR.steel[1] : CR.steel[3])); }
    g.set(cx, 57, CR.iron[0]); g.line(cx, 53, cx, 61, CR.steel[2]);
  });
  g.rect(12, 58, 2, 5, CR.steel[1]); g.rect(43, 58, 2, 5, CR.steel[1]); g.rect(11, 62, 4, 1, CR.iron[2]); g.rect(42, 62, 4, 1, CR.iron[2]);
  return g;
}
function cartBrokenG() {                                     // volteada: costado al aire, rueda girando, paila boca abajo, sombrilla aplastada, cartel partido
  var g = new G(64, 51), x, y, i;
  for (y = 28; y < 48; y++) for (x = 0; x < 64; x++) {                                  // charco de miel y aceite
    var dx = (x - 32) / 31, dy = (y - 38) / 8.5, d = dx * dx + dy * dy;
    if (d < 1 && ((x * 5 + y * 3) % 9 > 1)) g.set(x, y, d < 0.45 ? '#c47a1c' : '#8a4e10');
  }
  for (x = 1; x <= 24; x++) {                                                              // sombrilla aplastada
    var t = x / 24, yy = 27 + Math.round(4 * Math.sin(t * 3.1));
    for (y = yy; y <= yy + 4 + (x % 3 === 0 ? 1 : 0); y++) g.set(x, y, (Math.floor(x / 2.4) % 2) ? CR.wht[y > yy + 2 ? 1 : 2] : CR.red[y > yy + 2 ? 1 : 2]);
  }
  g.line(0, 24, 25, 33, CR.steel[2]); g.line(0, 25, 25, 34, CR.steel[1]); g.line(21, 32, 17, 26, CR.steel[2]);
  for (y = 12; y <= 35; y++) span(g, y, 24 + (y - 12) * 0.2, 50 + (y - 12) * 0.2, y > 32 ? CR.wood : CR.wht);   // cajon tumbado
  g.rect(26, 14, 24, 17, CR.cream[1]); g.rect(26, 14, 24, 1, CR.cream[3]); g.rect(26, 30, 24, 1, CR.cream[0]);
  for (i = 0; i < 4; i++) g.rect(28, 17 + i * 3, 20, 1, CR.cream[0]);
  g.rect(33, 21, 7, 6, CR.red[1]); g.rect(34, 22, 5, 4, CR.red[2]); g.rect(35, 23, 3, 2, CR.cream[2]);
  blobG(g, 57, 21, 5, 5.6, [CR.iron[0], CR.iron[1], CR.iron[2], CR.steel[1]]); blobG(g, 57, 21, 3, 3.2, [CR.steel[1], CR.steel[2], CR.steel[2], CR.steel[3]]); g.set(57, 21, CR.iron[0]);
  g.line(57, 21, 57, 16, CR.steel[3]); g.line(57, 21, 61, 21, CR.steel[2]); g.line(57, 21, 54, 25, CR.steel[2]);
  blobG(g, 43, 38, 9.5, 4.6, CR.iron); g.set(38, 36, CR.iron[3]); g.set(39, 35, CR.iron[3]); g.rect(51, 37, 3, 2, CR.iron[1]);   // paila volcada
  [[8, 40], [30, 43], [20, 44], [55, 41], [58, 36], [4, 34]].forEach(function (q) { picaronG(g, q[0], q[1], false); });
  // cartel partido en dos tablas
  g.rect(3, 38, 22, 6, CR.red[1]); g.rect(3, 38, 22, 1, CR.red[3]); g.rect(4, 39, 20, 4, CR.red[2]); g.rect(3, 44, 22, 1, CR.red[0]);
  g.rect(27, 43, 18, 7, CR.red[1]); g.rect(27, 43, 18, 1, CR.red[3]); g.rect(28, 44, 16, 5, CR.red[2]); g.rect(27, 49, 18, 1, CR.red[0]);
  if (px.text) { px.text(g, 'PICAR', 4, 39, { font: 'a5', ink: CR.cream[3] }); px.text(g, 'ONES', 29, 44, { font: 'a5', ink: CR.cream[3] }); }
  return g;
}
safe('carretilla', function () {
  var a = fin(cartG(0), 28, 62, 36, 10), b = fin(cartG(1), 28, 62, 36, 10), br = fin(cartBrokenG(), 32, 42, 40, 12);
  a.tall = true; a.alt = [a, b]; a.broken = br; br.shadowIn = false;
  MIRA.carretillaPicarones = { ok: a, broken: br, okAlt: [a, b] };
});

/* ======================== ABEJAS, MIEL, PICARON, BURBUJAS ======================== */
safe('abejas-miel-burbujas', function () {
  // abeja: 3x3, cuerpo amarillo y negro, alas blancas arriba / abajo. Sin contorno (a 3 px no cabe). Ancla = centro.
  function bee(f) {
    var g = new G(3, 3), Y = '#ffd02a', B = '#1a1612', Wg = '#eef4ffd0';
    if (f === 0) { g.set(0, 0, Wg); g.set(2, 0, Wg); g.set(0, 1, Y); g.set(1, 1, B); g.set(2, 1, Y); g.set(1, 2, B); }
    else { g.set(0, 1, Y); g.set(1, 1, B); g.set(2, 1, Y); g.set(0, 2, Wg); g.set(2, 2, Wg); g.set(1, 0, B); }
    return flatC(g, 1, 1);
  }
  MIRA.abeja = [bee(0), bee(1)];

  // charco de miel (calcomania): ancla en el centro; 3 cuadros con brillos que corren y una burbuja que se infla
  function honey(f) {
    var g = new G(34, 18), x, y, cx = 16.5, cy = 9;
    for (y = 0; y < 18; y++) for (x = 0; x < 34; x++) {
      var ang = Math.atan2(y - cy, x - cx), wob = 1 + 0.12 * Math.sin(ang * 3 + 1) + 0.08 * Math.sin(ang * 5 + 2);
      var dx = (x - cx) / (15.5 * wob), dy = (y - cy) / (7.6 * wob), d = dx * dx + dy * dy;
      if (d > 1) continue;
      var c = d > 0.78 ? '#9a5e12' : (d > 0.45 ? '#c47a1c' : '#e8a020');
      if (d > 0.9) c = '#7a4a0cd8';
      g.set(x, y, c);
    }
    var hl = [[9, 6], [11, 7], [20, 5]], k;                                                    // brillos (corren)
    for (k = 0; k < hl.length; k++) { var q = hl[k], sx = (f + k) % 3; g.set(q[0] + sx, q[1], '#ffe27a'); if (k === 0) g.set(q[0] + sx + 1, q[1], '#fff2b0'); }
    g.rect(12 + f * 2, 9, 3, 1, '#ffd05a');
    var bx = 22, by = 10;                                                                          // burbuja
    if (f === 0) { g.set(bx, by, '#ffe27a'); } else if (f === 1) { g.rect(bx, by, 2, 2, '#ffd05a'); g.set(bx, by, '#fff2b0'); } else { g.set(bx - 1, by, '#fff2b0'); g.set(bx + 2, by, '#fff2b0'); g.set(bx, by - 1, '#ffe27a'); g.set(bx + 1, by + 2, '#ffe27a'); }
    g.set(25, 8, '#7a4a0c'); g.set(24, 12, '#7a4a0c'); g.set(7, 11, '#7a4a0c');                    // una abeja ahogada (humor negro)
    return flatC(g, 17, 9);
  }
  MIRA.charcoMiel = [honey(0), honey(1), honey(2)];

  // picaron proyectil: 2 cuadros, de cara y de canto (gira)
  function pic(f) {
    var g = new G(9, 9);
    if (f === 0) picaronG(g, 4, 4, true);
    else {
      var x, y;
      for (y = 2; y <= 6; y++) for (x = 0; x <= 8; x++) {
        var dx = (x - 4) / 4.2, dy = (y - 4) / 2.4, d = dx * dx + dy * dy; if (d > 1 || (d < 0.12 && y === 4)) continue;
        g.set(x, y, dy < -0.3 ? '#ffd05a' : (dy > 0.45 ? '#8a4e10' : '#e8a020'));
      }
      g.set(2, 3, '#fff2b0'); g.set(5, 5, '#c47a1c');
    }
    g.set(f ? 7 : 6, 7, '#e8a020');                                                               // gota de miel
    return fin(g, 4, 4);
  }
  MIRA.picaron = [pic(0), pic(1)];

  // burbuja: chica, grande (con brillo de arcoiris) y reventada. Sin contorno oscuro: la pared de la burbuja es clara y translucida.
  function bub(f) {
    var g = new G(11, 11), x, y;
    if (f < 2) {
      var r = f === 0 ? 2.4 : 4.4, cx = 5, cy = 5;
      for (y = 0; y < 11; y++) for (x = 0; x < 11; x++) {
        var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)); if (d > r + 0.3) continue;
        if (d > r - 0.9) g.set(x, y, (x + y) % 3 === 0 ? '#e8d8ffd8' : '#d6f4ffd8');
        else g.set(x, y, '#bfe8ff3a');
      }
      g.set(cx - Math.round(r * 0.5), cy - Math.round(r * 0.5), '#ffffff'); if (f) { g.set(cx - 2, cy - 1, '#ffffffc8'); g.set(cx + 2, cy + 2, '#ffc8e8c0'); g.set(cx + 1, cy + 3, '#c8ffe8b0'); }
    } else {
      [[5, 1], [8, 2], [9, 5], [8, 8], [5, 9], [2, 8], [1, 5], [2, 2]].forEach(function (q, i) { g.set(q[0], q[1], i % 2 ? '#e8f8ff' : '#bfe8ffc8'); });
      [[5, 3], [7, 5], [5, 7], [3, 5]].forEach(function (q) { g.set(q[0], q[1], '#bfe8ff70'); });
      g.set(4, 4, '#ffffff');
    }
    return flatC(g, 5, 5);
  }
  MIRA.burbuja = [bub(0), bub(1), bub(2)];
});

/* ======================== VENDEDORES DE INFLABLES (vivos, con el palo de juguetes) ======================== */
safe('vendedores', function () {
  var SKN = ['#5c3a36', '#80523a', '#a8714c', '#c48f63'], HAIRG = ['#26262a', '#3e3e44', '#6a6a70', '#9a9aa0'];
  var VARS = {
    tito: { shirt: ['#7a3a10', '#b85a1c', '#e8742a', '#ffa05a'], cap: ['#14284e', '#244a92', '#3a72c4', '#68a4ec'], pants: ['#3a2a1c', '#5a4430', '#7a6048', '#9a8068'], bal: ['#d4382e', '#f2c81c', '#3a72c4', '#52b048', '#e8388a'], hammer: ['#d4382e', '#f2c81c'], sword: ['#e8e4d4', '#3a72c4'] },
    pepe: { shirt: ['#1c4a1c', '#2f7a2c', '#52b048', '#94e07c'], cap: ['#5e1410', '#9a2420', '#d4382e', '#f26a58'], pants: ['#0c101e', '#1a2036', '#2c385a', '#485a84'], bal: ['#f2c81c', '#e8388a', '#52b048', '#d4382e', '#38c8e8'], hammer: ['#3a72c4', '#f2c81c'], sword: ['#e8e4d4', '#d4382e'] }
  };
  function sh(c) { return [px.shade(c, 0.55), px.shade(c, 0.8), c, px.mix(c, '#ffffff', 0.35)]; }
  function balloon(g, cx, cy, c, hi) {
    var r = sh(c); blobG(g, cx, cy, 3.1, 3.5, r); g.set(cx, cy + 4, r[0]); g.set(cx - 1, cy - 1, '#ffffffd0');
  }
  function hammerG(g, x, y, ang, H) {                         // martillo inflable: cabeza cilindrica con aros y mango
    var hx = Math.round(x), hy = Math.round(y);
    if (ang === 0) {                                          // colgando de lado: cabeza horizontal arriba, mango abajo
      g.rect(hx - 4, hy, 9, 5, H[0]); g.rect(hx - 4, hy, 9, 1, sh(H[0])[3]); g.rect(hx - 4, hy + 4, 9, 1, sh(H[0])[0]); g.rect(hx - 4, hy, 1, 5, sh(H[0])[3]); g.rect(hx + 4, hy, 1, 5, sh(H[0])[0]);
      g.rect(hx - 2, hy, 1, 5, H[1]); g.rect(hx + 2, hy, 1, 5, H[1]);
      g.rect(hx, hy + 5, 2, 8, H[1]); g.rect(hx, hy + 5, 1, 8, sh(H[1])[3]); g.rect(hx + 1, hy + 5, 1, 8, sh(H[1])[1]);
    } else {                                                  // inclinado
      g.line(hx - 3, hy + 8, hx + 3, hy - 3, H[1]); g.line(hx - 2, hy + 8, hx + 4, hy - 3, sh(H[1])[1]);
      for (var k = 0; k < 5; k++) g.rect(hx + 1 + (k > 3 ? 0 : 0) - 4 + k * 0, hy - 5 + k, 1, 1, H[0]);
      blobG(g, hx + 4, hy - 5, 4.2, 2.8, sh(H[0])); g.set(hx + 2, hy - 5, H[1]); g.set(hx + 6, hy - 5, H[1]);
    }
  }
  function swordG(g, x0, y0, x1, y1, Sw) {                    // espada de globo: hoja blanca larga, guarda y empunadura de color
    g.line(x0, y0, x1, y1, Sw[0]); g.line(x0 + 1, y0, x1 + 1, y1, '#b8b4a2'); g.line(x0 - 1, y0, x1 - 1, y1, '#fbf8ec');
    var ux = x1 - x0, uy = y1 - y0, L = Math.sqrt(ux * ux + uy * uy); ux /= L; uy /= L;
    var gx = x0 + ux * 4, gy = y0 + uy * 4;
    g.line(Math.round(gx - uy * 3), Math.round(gy + ux * 3), Math.round(gx + uy * 3), Math.round(gy - ux * 3), Sw[1]);
    g.line(x0, y0, Math.round(x0 - ux * 3), Math.round(y0 - uy * 3), '#8a5a2a');
  }
  function vend(v, f) {
    var g = new G(46, 62), V = VARS[v], bob = (f === 1 || f === 3) ? 1 : 0, sw = f === 1 ? -1 : (f === 3 ? 1 : 0), up = (f === 1 || f === 2) ? 1 : 0, x, y;
    var FY = 60, cx = 16;
    // palo (de la mano al tope) y juguetes: se dibujan primero, detras del hombre solo la parte baja
    var px0 = 28;
    for (y = 8 - up; y <= 57; y++) { g.set(px0, y, '#c99458'); g.set(px0 + 1, y, '#8a5a2a'); }
    // piernas y zapatos
    [[11, 0], [18, 0]].forEach(function (L) {
      for (y = 53; y <= 58; y++) span(g, y, L[0], L[0] + 3, V.pants);
      g.rect(L[0] - 1, 59, 5, 2, '#3a2418'); g.rect(L[0] - 1, 59, 5, 1, '#6a4a34');
    });
    g.rect(11, 53, 11, 1, '#1c1a22'); g.set(16, 53, '#c8a850');
    // torso y mangas
    for (y = 44 + bob; y <= 52; y++) span(g, y, 10, 22, V.shirt);
    g.rect(15, 44 + bob, 3, 1, V.shirt[1]); g.rect(15, 45 + bob, 1, 3, V.shirt[1]); g.rect(17, 45 + bob, 1, 3, V.shirt[1]);
    g.rect(14, 49 + bob, 4, 2, V.shirt[1]); g.set(14, 49 + bob, V.shirt[3]);                    // bolsillo canguro / panza
    // brazo libre (con saludo en un cuadro)
    var wave = f === 2;
    g.rect(7, 44 + bob, 3, 3, V.shirt[2]); g.rect(7, 44 + bob, 3, 1, V.shirt[3]);
    if (wave) { limbG(g, 8, 47 + bob, 5, 41, SKN, 2); g.rect(4, 38, 3, 3, SKN[2]); g.set(4, 38, SKN[3]); }
    else { g.rect(7, 47 + bob, 2, 5, SKN[2]); g.rect(7, 47 + bob, 1, 5, SKN[3]); g.rect(8, 47 + bob, 1, 5, SKN[1]); g.rect(7, 52 + bob, 3, 2, SKN[2]); g.set(9, 53 + bob, SKN[0]); }
    // brazo del palo
    g.rect(22, 44 + bob, 3, 3, V.shirt[2]); g.rect(22, 44 + bob, 3, 1, V.shirt[3]);
    g.rect(23, 47 + bob, 3, 2, SKN[2]); g.rect(25, 48 + bob, 4, 3, SKN[2]); g.rect(25, 48 + bob, 4, 1, SKN[3]); g.rect(25, 50 + bob, 4, 1, SKN[1]); g.set(27, 49 + bob, SKN[0]); g.set(26, 49 + bob, SKN[0]);
    // cabeza: cuello, cara, orejas, bigote
    var hy = 34 + bob;
    g.rect(15, 43 + bob, 3, 1, SKN[1]);
    for (y = hy + 3; y <= hy + 9; y++) span(g, y, 12, 20, SKN);
    g.set(11, hy + 6, SKN[2]); g.set(21, hy + 6, SKN[1]);
    g.set(14, hy + 5, '#141414'); g.set(18, hy + 5, '#141414'); g.set(14, hy + 4, HAIRG[1]); g.set(18, hy + 4, HAIRG[1]); g.set(13, hy + 4, HAIRG[1]); g.set(19, hy + 4, HAIRG[1]);
    g.set(16, hy + 6, SKN[1]);
    g.rect(14, hy + 7, 5, 1, HAIRG[0]); g.set(13, hy + 8, HAIRG[0]); g.set(19, hy + 8, HAIRG[0]);            // bigote
    g.rect(15, hy + 9, 3, 1, '#7a3a30');
    // gorra con visera
    for (y = hy - 1; y <= hy + 2; y++) span(g, y, 12 - (y === hy - 1 ? -1 : 0), 20 + (y === hy - 1 ? -1 : 0), V.cap);
    g.rect(11, hy + 2, 12, 1, V.cap[0]); g.rect(12, hy + 3, 10, 1, V.cap[1]); g.set(11, hy + 2, V.cap[1]);
    g.rect(15, hy - 2, 3, 1, V.cap[2]); g.set(16, hy, V.cap[3]);
    // juguetes en el palo (se mecen un pixel)
    var o = sw, B = V.bal;
    g.line(px0, 18 - up, 25 + o, 14 - up, '#b8b4a2'); g.line(px0, 18 - up, 31 + o, 12 - up, '#b8b4a2'); g.line(px0, 18 - up, 35 - o, 13 - up, '#b8b4a2'); g.line(px0, 18 - up, 28 + o, 9 - up, '#b8b4a2'); g.line(px0, 18 - up, 33 + o, 7 - up, '#b8b4a2');
    balloon(g, 25 + o, 11 - up, B[0]); balloon(g, 31 + o, 9 - up, B[1]); balloon(g, 36 - o, 10 - up, B[2]); balloon(g, 28 + o, 5 - up, B[3]); balloon(g, 33 + o, 4 - up, B[4]);
    hammerG(g, 37, 24 - up + (f === 3 ? 1 : 0), 0, V.hammer);                                                 // martillo colgando a la derecha
    g.line(px0 + 1, 23, 35, 24, '#b8b4a2');
    swordG(g, 26 + o, 32, 20 - o, 17 - up, V.sword);                                                           // espada de globo atada al palo, arriba y a la izquierda
    g.line(26 + o, 32, px0, 30, '#b8b4a2');
    hammerG(g, 38, 40 + (f === 1 ? 1 : 0), 1, [V.hammer[1], V.hammer[0]]);                                    // martillo inclinado abajo
    return fin(g, cx, FY);
  }
  MIRA.vendedor = { idle: null, tito: { idle: [0, 1, 2, 3].map(function (f) { return vend('tito', f); }) }, pepe: { idle: [0, 1, 2, 3].map(function (f) { return vend('pepe', f); }) } };
  MIRA.vendedor.idle = MIRA.vendedor.tito.idle;
  MIRA.vendedor.variantes = [MIRA.vendedor.tito, MIRA.vendedor.pepe];
});

/* ======================== ICONOS: inflables (4.3) y comidas (4.2) ======================== */
/* 12x12 (ancla 6,11) y .big 24x24 (ancla 12,23), con contorno. Se dibujan en una rejilla de 10x10 celdas con un margen de una celda
   (mismo sistema que js/sprites/objetos.js): a escala 2 la forma se recalcula y se agregan detalles bajo `if (s === 2)`. */
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
  var RED = ['#7a1a14', '#b82a22', '#e8382c', '#ff7a62'], YEL = ['#a87a08', '#d8a410', '#f2c81c', '#ffe870'], WH = ['#8a887e', '#b8b4a2', '#e8e4d4', '#fbf8ec'];
  var TEAL = ['#14484c', '#217a7e', '#38b0ac', '#82dcd2'], BUN = ['#8c5a1f', '#b9853a', '#d9a63c', '#f0c860'], BRN = ['#3a1c10', '#5a2a1c', '#8a4b38', '#b06a3e'];
  var ITEMS = {
    martilloInflable: function (d, s) {
      d.L(1.4, 9.2, 5.6, 4.8, YEL[2], 1.6); d.L(2.2, 9.2, 6.2, 4.9, YEL[1], 0.7);
      d.rrect(6.9, 3.3, 5.8, 3.8, 0.72, function (u, v) { if (Math.abs(u) > 1.9 && Math.abs(u) < 2.7) return YEL[2]; return v < -0.9 ? RED[3] : (v > 0.9 ? RED[1] : RED[2]); });
      if (s === 2) { d.px(5.6, 2.2, '#ffffff'); d.px(6.0, 2.0, '#ffffff'); d.px(8.8, 4.8, RED[0]); d.px(2.4, 8.2, YEL[3]); d.px(3.0, 7.4, YEL[3]); }
    },
    espadaInflable: function (d, s) {
      d.L(2.6, 8.2, 8.4, 1.9, '#b8b4a2', 2.2); d.L(2.4, 8.2, 8.2, 1.9, WH[3], 1.1); d.E(8.5, 1.7, 0.9, 0.9, WH[3]);
      d.rrect(3.9, 6.9, 3.8, 1.2, 0.72, function (u, v) { return v < 0 ? '#6aa0e8' : '#2a52a0'; });
      d.L(2.0, 9.0, 3.2, 7.8, '#3a72c4', 1.2); d.E(1.8, 9.2, 0.9, 0.9, YEL[2]);
      if (s === 2) { d.px(6.6, 3.6, '#ffffff'); d.px(7.2, 2.9, '#ffffff'); d.px(5.0, 5.6, WH[1]); }
    },
    pistolaBurbujas: function (d, s) {
      d.R(1.0, 4.4, 6.4, 3.0, TEAL[2]); d.R(1.0, 4.4, 6.4, 0.7, TEAL[3]); d.R(1.0, 6.7, 6.4, 0.7, TEAL[1]);
      d.R(2.4, 7.2, 2.0, 2.6, YEL[2]); d.R(2.4, 7.2, 0.7, 2.6, YEL[3]); d.px(4.8, 7.4, RED[2]);
      d.R(7.2, 4.8, 1.2, 1.6, TEAL[1]);
      d.E(8.9, 4.2, 1.5, 1.5, '#e8388a');
      var X = 1 + 8.9 * s, Y = 1 + 4.2 * s; d.g.ell(X, Y, 0.8 * s, 0.8 * s, null);
      d.E(9.2, 1.6, 0.9, 0.9, '#cfeeff'); d.px(8.8, 1.2, '#ffffff');
      if (s === 2) { d.px(2.0, 5.0, TEAL[3]); d.px(3.2, 5.0, TEAL[3]); d.px(5.6, 5.8, TEAL[1]); d.px(9.8, 2.4, '#ffc8e8'); }
    },
    hamburguesaBembos: function (d, s) {
      d.R(0.9, 7.0, 8.2, 2.6, '#2a1cd0'); d.R(0.9, 8.2, 8.2, 0.8, '#ffb500'); d.R(0.9, 7.0, 8.2, 0.6, '#5a50ff');
      d.R(1.1, 5.6, 7.8, 1.6, '#4a2a1c'); d.R(1.1, 5.6, 7.8, 0.4, '#6a3a28');
      d.R(0.9, 4.8, 8.2, 0.9, '#ffb500'); d.px(2.2, 5.9, '#ffb500'); d.px(6.4, 6.0, '#ffb500');
      d.R(0.8, 4.0, 8.4, 0.9, '#5aa040'); d.px(2.0, 4.8, '#5aa040'); d.px(5.0, 4.8, '#5aa040'); d.px(7.4, 4.8, '#5aa040');
      d.blob(5.0, 2.6, 4.2, 2.2, BUN);
      if (s === 2) { [[3.0, 1.6], [5.2, 1.2], [6.8, 2.0], [4.2, 2.6], [2.8, 2.8]].forEach(function (q) { d.px(q[0], q[1], '#f6e6a0'); }); d.px(6.5, 3.0, BUN[0]); d.px(3.6, 8.7, '#ffb500'); d.px(6.2, 8.7, '#ffb500'); }
    },
    cafeStarbucks: function (d, s) {
      for (var i = 0; i < 7; i++) d.R(2.0 + i * 0.14, 2.7 + i, 6.0 - i * 0.28, 1.1, i < 6 ? WH[2 + (i < 1 ? 1 : 0)] : WH[1]);
      d.R(2.4, 4.7, 5.2, 2.6, '#0a8258'); d.R(2.4, 4.7, 5.2, 0.6, '#44bc90'); d.R(2.6, 7.0, 4.8, 0.5, '#003624');
      d.E(5.0, 6.0, 0.9, 0.9, WH[3]); d.px(5.0, 6.0, '#0a8258');
      d.R(1.5, 2.0, 7.0, 0.9, '#3a2a22'); d.R(2.2, 1.2, 5.6, 0.9, '#5a4636');
      d.R(7.0, 3.0, 0.8, 4.6, WH[1]);
      d.px(4.4, 0.3, '#e8ecec'); d.px(5.6, -0.1 < 0 ? 0.0 : 0, '#cfd6d6');
      if (s === 2) { d.px(3.4, 3.8, '#ffffff'); d.px(3.0, 5.4, '#ffffff'); d.px(3.6, 3.2, '#ffffff'); d.px(4.2, 0.0, '#cfd6d6'); d.px(6.0, 0.4, '#e8ecec'); d.px(2.2, 8.2, WH[3]); }
    },
    sangucheLucha: function (d, s) {
      d.blob(5.0, 6.7, 4.6, 1.6, BUN); d.R(0.8, 5.4, 8.4, 1.5, BRN[2]); d.R(0.8, 5.4, 8.4, 0.4, BRN[3]);
      d.px(2.0, 5.2, '#e08ca4'); d.px(3.6, 5.2, '#e08ca4'); d.px(5.6, 5.1, '#e08ca4'); d.px(7.0, 5.3, '#e08ca4');
      d.E(8.0, 5.9, 0.9, 0.9, '#e8742a'); d.E(1.9, 6.0, 0.8, 0.8, '#f0a050');
      d.blob(5.0, 3.8, 4.6, 2.0, BUN);
      d.L(8.3, 0.2, 8.3, 4.0, '#c8a850', 0.5); d.R(8.3, 0.2, 1.7, 0.6, '#d91023'); d.R(8.3, 0.8, 1.7, 0.5, WH[3]); d.R(8.3, 1.3, 1.7, 0.5, '#d91023');
      if (s === 2) { d.px(3.0, 3.0, '#f6e6a0'); d.px(4.6, 2.6, '#f6e6a0'); d.px(6.6, 3.2, '#f6e6a0'); d.px(2.0, 8.0, BUN[0]); d.px(7.6, 8.0, BUN[0]); }
    },
    polloBelisario: function (d, s) {
      d.R(0.8, 7.4, 8.4, 2.2, '#e5133a'); d.R(0.8, 7.4, 8.4, 0.6, '#f2547a'); d.R(0.8, 8.8, 8.4, 0.8, '#a00f2c'); d.R(2.0, 8.2, 5.8, 0.5, WH[3]);
      d.L(1.2, 7.4, 1.8, 4.8, YEL[2], 0.7); d.L(2.2, 7.4, 2.6, 5.4, YEL[3], 0.6); d.L(3.0, 7.4, 3.2, 5.0, YEL[1], 0.6);
      d.blob(5.4, 5.2, 3.6, 2.9, ['#5a2e10', '#8a4a18', '#c27a28', '#e8a84a']);
      d.L(7.4, 3.0, 9.0, 0.9, '#f0ecdc', 1.0); d.E(9.2, 0.9, 0.9, 0.9, '#f0ecdc');
      if (s === 2) { d.px(4.0, 3.6, '#f6c870'); d.px(5.0, 3.2, '#f6c870'); d.px(6.6, 4.2, '#5a2e10'); d.px(5.0, 6.4, '#5a2e10'); d.px(3.4, 5.4, '#a05a20'); }
    },
    chaufaWok: function (d, s) {
      for (var i = 0; i < 6; i++) d.R(1.5 + i * 0.28, 3.6 + i, 7.0 - i * 0.56, 1.1, i === 0 ? '#e8382c' : (i < 5 ? '#d4382e' : '#a02018'));
      d.R(1.3, 3.1, 7.4, 0.8, '#f4f4ec');
      d.blob(5.0, 2.6, 3.7, 1.7, ['#b8b09a', '#d8d0b4', '#efe8d0', '#fff8e4']);
      d.px(3.2, 2.2, '#f2c81c'); d.px(5.6, 1.8, '#52b048'); d.px(6.8, 2.8, '#e8742a'); d.px(4.2, 3.0, '#52b048'); d.px(2.6, 2.8, '#f2c81c');
      d.E(5.0, 6.7, 1.3, 0.9, '#1c1a22'); d.L(6.4, 6.7, 8.0, 6.4, '#1c1a22', 0.6);
      d.L(1.2, 3.4, 5.0, 0.4, '#c9c9be', 0.4); d.L(8.8, 3.4, 5.0, 0.4, '#c9c9be', 0.4);
      d.L(5.8, 0.0, 8.6, 2.0, '#6b4223', 0.5); d.L(6.4, -0.2, 9.2, 1.7, '#a06a36', 0.5);
      if (s === 2) { d.px(2.8, 2.6, '#fff8e4'); d.px(4.4, 1.6, '#fff8e4'); d.px(7.4, 2.2, '#fff8e4'); }
    },
    cintaTailoy: function (d, s) {
      d.E(5.0, 5.2, 4.4, 3.9, '#cbbf98'); d.E(5.0, 5.2, 3.1, 2.7, '#a89c72'); d.E(5.0, 5.2, 2.5, 2.1, '#cbbf98');
      d.E(5.0, 5.2, 1.5, 1.2, null);
      d.E(5.0, 5.2, 4.4, 3.9, null); d.E(5.0, 5.2, 4.4, 3.9, '#cbbf98');
      d.E(5.0, 5.2, 3.0, 2.6, '#a89c72'); d.E(5.0, 5.2, 2.4, 2.0, '#00a160'); d.E(5.0, 5.2, 1.4, 1.1, null);
      d.L(8.2, 7.6, 9.6, 9.4, '#e2d8b8', 1.2); d.px(9.4, 9.4, '#cbbf98');
      d.px(3.0, 2.4, '#efe6c4'); d.px(2.2, 3.6, '#efe6c4'); d.px(4.0, 1.8, '#efe6c4');
      if (s === 2) { d.px(5.0, 8.4, '#8a7e56'); d.px(7.4, 7.0, '#8a7e56'); d.px(6.2, 8.8, '#8a7e56'); d.px(5.0, 3.4, '#4ccf98'); d.px(6.4, 3.8, '#4ccf98'); }
    },
    picarones: function (d, s) {
      d.blob(5.0, 7.4, 4.8, 2.0, ['#8a887e', '#b8b4a2', '#e8e4d4', '#fbf8ec']); d.E(5.0, 7.1, 3.4, 1.2, '#cfcabd');
      var ring = ['#8a4e10', '#c47a1c', '#e8a020', '#ffd05a'];
      d.blob(3.2, 5.9, 1.9, 1.5, ring); d.blob(6.9, 5.7, 1.9, 1.5, ring); d.blob(5.0, 3.8, 1.9, 1.5, ring);
      d.E(3.2, 6.0, 0.5, 0.4, '#8a4e10'); d.E(6.9, 5.8, 0.5, 0.4, '#8a4e10'); d.E(5.0, 3.9, 0.5, 0.4, '#8a4e10');
      d.px(2.6, 5.1, '#fff2b0'); d.px(6.3, 4.9, '#fff2b0'); d.px(4.5, 3.0, '#fff2b0'); d.px(8.4, 7.6, '#e8a020'); d.px(1.6, 8.0, '#e8a020');
      if (s === 2) { d.px(4.2, 5.4, '#e8a020'); d.px(5.4, 5.0, '#c47a1c'); d.px(8.0, 6.4, '#ffd05a'); d.px(1.2, 6.6, '#ffd05a'); d.px(5.6, 4.4, '#ffd05a'); }
    }
  };
  MIRA.items = {};
  S.items = S.items || {};
  Object.keys(ITEMS).forEach(function (id) { var c = mkIcon(ITEMS[id]); MIRA.items[id] = c; if (!S.items[id]) S.items[id] = c; });
});

/* ======================== ALEXANDER CON INFLABLE ======================== */
/* Se compone sobre los cuadros de Alexander SIN guitarra (alex.<bird|nobird>.g3.walk): se le quita el contorno, se borra el brazo que sostiene el juguete
   (y se repinta la camiseta de rayas debajo), se dibuja el brazo nuevo y el inflable, y se vuelve a dar contorno y luz de borde con el mismo algoritmo.
   Mismos lienzos y anclas que walk (20x28 @10,26; izq @9,26) y attack (lado 32x30 @13,26; izq @18,26; frente y espaldas 32x48 @16,38). */
safe('alexInflable', function () {
  var A = S.alex;
  if (!A || !A.nobird || !A.bird) return;
  var CP = (px.chars && px.chars.P) || { skin: '#a8714c', skinD: '#80523a', skinL: '#c48f63', blue: '#1f2f66', white: '#e6e6e0' };
  var C_SKIN = col(CP.skin), C_BLUE = col(CP.blue), C_WHITE = col(CP.white);
  var TOYS = ['martilloInflable', 'espadaInflable', 'pistolaBurbujas'], KIND = { martilloInflable: 'hammer', espadaInflable: 'sword', pistolaBurbujas: 'gun' };
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
  function toyG(g, kind, hx, hy, tx, ty, shot) {
    var dx = tx - hx, dy = ty - hy, L = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, t, i;
    function offs(g_, x0, y0, x1, y1, c1, c2) { g_.line(x0, y0, x1, y1, c1); if (Math.abs(x1 - x0) > Math.abs(y1 - y0)) g_.line(x0, y0 + 1, x1, y1 + 1, c2); else g_.line(x0 + 1, y0, x1 + 1, y1, c2); }
    if (kind === 'hammer') {
      var hl = L - 3.2;
      offs(g, hx, hy, hx + ux * hl, hy + uy * hl, YEL_[3], YEL_[1]);
      orient(g, tx - ux * 2.8, ty - uy * 2.8, nx, ny, 6.2, 4.6, function (a, b, x, y) {
        if (Math.abs(a) > 1.7 && Math.abs(a) < 2.6) return YEL_[2];
        var lit = -((x - (tx - ux * 2.8)) * 0.6 + (y - (ty - uy * 2.8)) * 0.85);
        return lit > 1.2 ? RED_[3] : (lit > -0.4 ? RED_[2] : RED_[1]);
      });
      g.set(Math.round(tx - ux * 2.8 - 1), Math.round(ty - uy * 2.8 - 1), '#ffffff');
    } else if (kind === 'sword') {
      var gl = L * 0.24;
      offs(g, hx + ux * gl, hy + uy * gl, tx, ty, '#fbf8ec', '#b8b4a2');
      g.set(Math.round(tx), Math.round(ty), '#fbf8ec');
      orient(g, hx + ux * gl, hy + uy * gl, nx, ny, 5.4, 1.5, function (a, b) { return b < 0 ? '#6aa0e8' : '#2a52a0'; });
      offs(g, hx, hy, hx + ux * gl, hy + uy * gl, '#3a72c4', '#1f3f80');
    } else {                                                   // pistola de burbujas: cuerpo turquesa, empuñadura amarilla, anillo rosado al frente
      var dxn = -uy, dyn = ux; if (dyn < 0) { dxn = -dxn; dyn = -dyn; }
      var cx = hx + ux * 3.0, cy = hy + uy * 3.0;
      orient(g, hx + dxn * 1.7 + ux * 0.6, hy + dyn * 1.7 + uy * 0.6, dxn, dyn, 3.6, 2.0, function (a, b) { return b < 0 ? YEL_[3] : YEL_[2]; });
      orient(g, cx, cy, ux, uy, 7.2, 3.0, function (a, b, x, y) { return b < -0.6 ? TEAL_[3] : (b > 0.7 ? TEAL_[1] : TEAL_[2]); });
      var rx = tx + ux * 0.2, ry = ty + uy * 0.2;
      for (i = 0; i < 12; i++) { var an = i / 12 * Math.PI * 2; g.set(Math.round(rx + Math.cos(an) * 1.9), Math.round(ry + Math.sin(an) * 1.9), '#e8388a'); }
      if (!shot) bubbleG(g, tx + ux * 4.0, ty + uy * 4.0, 1.4);
      else if (shot === 1) { bubbleG(g, tx + ux * 3.2 + nx * -2.6, ty + uy * 3.2 + ny * -2.6, 1.5); bubbleG(g, tx + ux * 4.6, ty + uy * 4.6, 2.0); bubbleG(g, tx + ux * 3.2 + nx * 2.6, ty + uy * 3.2 + ny * 2.6, 1.5); }
      else { bubbleG(g, tx + ux * 6.0 + nx * -3.4, ty + uy * 6.0 + ny * -3.4, 2.2); bubbleG(g, tx + ux * 8.0, ty + uy * 8.0, 1.6); bubbleG(g, tx + ux * 5.6 + nx * 3.4, ty + uy * 5.6 + ny * 3.4, 1.8); }
    }
  }

  // ---- especificaciones (coordenadas del lienzo de salida) ----
  var WALK_SIDE = { hammer: { H: [15, 17], T: [16, 2.5] }, sword: { H: [15, 17], T: [16.5, 1] }, gun: { H: [13, 16], T: [17.5, 14.5] } };
  var WALK_FR = { hammer: { H: [16, 17], T: [17, 2.5] }, sword: { H: [16, 17], T: [17.5, 1] }, gun: { H: [16, 17], T: [18.5, 11] } };
  function mirX(p, W) { return [W - 1 - p[0], p[1]]; }
  var SW_SIDE = {
    hammer: [{ H: [16, 10], T: [13.5, 0.5] }, { H: [23, 15], T: [28, 25] }, { H: [21, 22], T: [25, 28.5] }],
    sword:  [{ H: [16, 10], T: [8, 0] }, { H: [23, 14], T: [31, 6] }, { H: [21, 21], T: [28, 27] }],
    gun:    [{ H: [21, 14], T: [27, 12] }, { H: [22, 14], T: [28, 12], shot: 1 }, { H: [20, 17], T: [26, 17], shot: 2 }]
  };
  var SW_DOWN = {
    hammer: [{ H: [25, 19], T: [27, 5] }, { H: [21, 30], T: [10, 38] }, { H: [12, 34], T: [4, 43] }],
    sword:  [{ H: [25, 19], T: [29, 3] }, { H: [21, 30], T: [8, 38] }, { H: [12, 34], T: [2, 44] }],
    gun:    [{ H: [24, 21], T: [29, 16] }, { H: [22, 28], T: [28, 32], shot: 1 }, { H: [20, 31], T: [26, 35], shot: 2 }]
  };
  var SW_UP = {
    hammer: [{ H: [6, 19], T: [4, 5] }, { H: [10, 17], T: [12, 3], behind: 1 }, { H: [8, 25], T: [4, 14] }],
    sword:  [{ H: [6, 19], T: [2, 3] }, { H: [10, 17], T: [13, 1], behind: 1 }, { H: [8, 25], T: [3, 12] }],
    gun:    [{ H: [7, 21], T: [2, 16] }, { H: [9, 19], T: [8, 12], behind: 1, shot: 1 }, { H: [8, 24], T: [4, 18], shot: 2 }]
  };
  var BOB = [0, 1, 0, 1];                                      // bob de los 4 cuadros de walk

  function finish(b, ax, ay, mirror) { b.outlineRim(); if (mirror) { var m = mirrorBuf(b); return m.toCanvas(b.w - 1 - ax, ay); } return b.toCanvas(ax, ay); }

  function opaque(cv) { var b = fromCanvas(cv), n = 0; for (var i = 0; i < b.d.length; i++) if (b.d[i]) n++; return n; }
  function build(toy, which) {
    var set = A[which].g3 || A[which], W = set.walk, kind = KIND[toy], sp = WALK_SIDE[kind], fr = WALK_FR[kind];
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
        toyG(g2, kind, sp.H[0], sp.H[1] + u, sp.T[0], sp.T[1] + u, 0); fistG(g2, sp.H[0], sp.H[1] + u);
        blitG(b2, g2);
        (mir ? walk.left : walk.right).push(finish(b2, 10, 26, mir));
      });
      // de frente: el brazo derecho del cuadro agarra el juguete; de espaldas: el izquierdo
      var uf = BOB[i] + 1, swr = (i === 3) ? -1 : 0, swl = (i === 1) ? 1 : 0;
      b = bufFrom(W.down[i], 20, 28, 0, 0); g = new G(20, 28);
      toyG(g, kind, fr.H[0], fr.H[1] + uf + (swr < 0 ? 1 : 0), fr.T[0], fr.T[1] + uf, 0); fistG(g, fr.H[0], fr.H[1] + uf + (swr < 0 ? 1 : 0));
      blitG(b, g); b.outlineRim(); walk.down.push(b.toCanvas(10, 26));
      b = bufFrom(W.up[i], 20, 28, 0, 0); g = new G(20, 28);
      var hm = mirX(fr.H, 20), tm = mirX(fr.T, 20);
      toyG(g, kind, hm[0], hm[1] + uf + (swl > 0 ? 1 : 0), tm[0], tm[1] + uf, 0); fistG(g, hm[0], hm[1] + uf + (swl > 0 ? 1 : 0));
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
        toyG(g3, kind, sd.H[0], sd.H[1], sd.T[0], sd.T[1], sd.shot); fistG(g3, sd.H[0], sd.H[1]);
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
        toyG(tmp, kind, s2.H[0], s2.H[1], s2.T[0], s2.T[1], s2.shot); fistG(tmp, s2.H[0], s2.H[1]);
        if (s2.behind) { var bg = new Buf(32, 48); blitG(bg, tmp); blitG(bg, gg); bg.blit(bb, 0, 0); bb = bg; }      // el juguete pasa por detras del cuerpo
        else { blitG(bb, gg); blitG(bb, tmp); }
        bb.outlineRim();
        swing[dir].push(bb.toCanvas(16, 38));
      });
    }
    var idle = { right: walk.right[0], left: walk.left[0], down: walk.down[0], up: walk.up[0] };
    return { walk: walk, swing: swing, idle: idle };
  }
  S.alexInflable = {};
  TOYS.forEach(function (toy) {
    var o = S.alexInflable[toy] = {};
    ['bird', 'nobird'].forEach(function (k) { lazy(o, k, function () { return build(toy, k); }); });
  });
});

var T1 = (window.performance && performance.now) ? performance.now() : Date.now();
MIRA.arteMs = T1 - T0;                                       // lo que cuesta hornear al cargar (sin lo perezoso)
MIRA.bakeAll = function () { var t = (window.performance && performance.now) ? performance.now() : Date.now(); LAZY.forEach(function (f) { f(); }); return ((window.performance && performance.now) ? performance.now() : Date.now()) - t; };
})();
