/* ACHORADO - js/sprites/letreros.js  (v0.6, fase F6)
 * Dueño: letreros.  Avisos pintados, bandas de marca, neveras, jabas, carteles a mano, placas de Yape, senales de calle.
 * Escala 1 m = 16 px, todo legible a 1x en 480x270.  Texto SIEMPRE de frente (nunca girado).  Los nombres de marca vienen de
 * ACH.px.marca(id) (marcas.js): nadie escribe una marca directo.  El interruptor (ACH.cfg.marcasReales) se lee AL PINTAR.
 *
 * API sobre rejillas G (la usan edificios-casas.js y edificios-industria.js al hornear cada lote):
 *   L.ad(g, id, x, y, w, h, o)            aviso de marca pintado en la pared (XL 96x38 con a12 · M 44x26 con a7 · S con a5; elige solo la letra mayor que quepa)
 *   L.cap(g, id, x, y, w, h)              remate de marca de 9-10 px para las bandas de letrero;  L.capW(id) = ancho que pide
 *   L.chest(g, id, x, yb, o) / L.tall(g, id, x, yb, o)   nevera horizontal (30x17) / vertical (14x34) con marca;  yb = fila base
 *   L.jabas(g, x, yb, n, o)               pila de jabas rojas (13 px de ancho, 6 por jaba)
 *   L.hand.chela / hielo / recargas / menu / yape / loteria / agente / fiado (g, x, y, o)   carteles a mano; devuelven {w,h}
 *   L.brandAt(c0, seed, i)                id de marca para una pared, repartido 30/25/20/10/10/5 (pilsen/inca/cristal/coca/kola+big/cusqueña)
 *   L.awningCols(id)                      [c1, c2] de toldo de la marca
 *   L.flagBrand(go, x, y, id)             letrero bandera 28x14 de marca (capa alta)
 * Props (lienzos con ax, ay, fw, fh, tall), en ACH.sprites.props:
 *   senal[n]  0 AV. GAMBETTA · 1 +JR. COLON · 2 +JR. GRAU · 3 PARE · 4 NO ESTACIONAR · 5 PARADERO · 6 PROHIBIDO ARROJAR BASURA (muni, cambia con el interruptor)
 *             7 RESALTO · 8 VELOCIDAD 40 · 9 ZONA RIGIDA · 10 CEDA EL PASO · 11 PSJE. (pasaje)
 *   jabas[n]  pilas de jabas (3, 5 y doble) · neveraProp[n] nevera de bodega (Cristal, Inca, Coca, Pilsen) · letrero[n] caballetes y carteles de poste
 * Datos:  L.senales = [{n, x, y, note}]  posiciones sugeridas (px de mundo) para world.js;  L.sheet() = hoja de prueba (canvas).
 * Cambio en caliente: ACH.px.onMarcas(rebuild) -> los lienzos se redibujan EN SITIO (mismo objeto y tamano) y ACH.debug.marcas() re-hornea los lotes.
 * Carga despues de luz.js y antes del motor.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px, S = ACH.sprites;
if (!px || !px.G || !px.marca || !S) return;
var G = px.G, mix = px.mix;
var L = ACH.letreros = ACH.letreros || {};
var K = '#1c1a22', SH = '#2a2440';

/* ======================== PRIMITIVAS ======================== */
function F(g, x, y, w, h, c) {
  x |= 0; y |= 0; w |= 0; h |= 0;
  var x1 = x + w, y1 = y + h;
  if (x < 0) x = 0; if (y < 0) y = 0; if (x1 > g.w) x1 = g.w; if (y1 > g.h) y1 = g.h;
  for (var j = y; j < y1; j++) { var o = j * g.w; for (var i = x; i < x1; i++) g.d[o + i] = c; }
}
function P1(g, x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.d[y * g.w + x] = c; }
function Q(g, x, y) { x |= 0; y |= 0; return (x >= 0 && y >= 0 && x < g.w && y < g.h) ? g.d[y * g.w + x] : null; }
function ring(g, x, y, w, h, c) { F(g, x, y, w, 1, c); F(g, x, y + h - 1, w, 1, c); F(g, x, y, 1, h, c); F(g, x + w - 1, y, 1, h, c); }
var tcache = {};
function tint(c, to, t) { var k = c + to + t, v = tcache[k]; return v || (tcache[k] = mix(c, to, t)); }
function lite(c, t) { return tint(c, '#ffffff', t); }
function dark(c, t) { return tint(c, SH, t); }
function hs(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
/* pinta con el tono de pared pintada al sol y la garua: la saturacion baja un 8 % */
function tone(c) { return tint(c, '#7f7d86', 0.08); }
var FH = { a5: 5, a7: 7, a12: 12 }, GAP = { a5: 2, a7: 3, a12: 3 }, TOP = { a5: 2, a7: 2, a12: 3 };
function hasAcc(s) { return /[ÁÉÍÓÚÜÑ]/i.test(s); }
function stripAcc(s) { return s.replace(/Á/g, 'A').replace(/É/g, 'E').replace(/Í/g, 'I').replace(/Ó/g, 'O').replace(/Ú/g, 'U').replace(/Ü/g, 'U').replace(/Ñ/g, 'N'); }
function mw(s, font) { return px.measure(s, font); }

/* texto inclinado (cursiva de brocha): se pinta recto en una rejilla de trabajo y se cizalla por filas.  k = px de corrimiento por fila (0,22 ~ 12 deg) */
function slant(g, s, cx, top, font, ink, o) {
  o = o || {};
  var tw = mw(s, font), th = FH[font], pad = 4, W = tw + pad * 2 + 6, H = th + 8;
  var t = new G(W, H);
  px.text(t, s, pad, 4, { font: font, ink: ink, shadow: o.sh || null, outline: o.out || null });
  var k = o.k === undefined ? 0.22 : o.k, x0 = cx - (tw >> 1) - pad;
  for (var j = 0; j < H; j++) {
    var sh = Math.round((4 + th / 2 - j) * k);
    for (var i = 0; i < W; i++) { var c = t.d[j * W + i]; if (c) P1(g, x0 + i + sh, top - 4 + j, c); }
  }
}
function txt(g, s, cx, top, font, ink, o) {
  o = o || {};
  if (o.slant && font !== 'a5') slant(g, s, cx, top, font, ink, { sh: o.sh, out: o.out, k: o.slant });
  else px.text(g, s, cx, top, { font: font, ink: ink, shadow: o.sh || null, outline: o.out || null, align: 'c' });
}
/* letra a letra con vaiven de brocha (la tinta no se borra, solo baja 1 px) */
function hand(g, s, cx, top, ink, rnd, font, sh) {
  font = font || 'a5';
  var info = px.fonts[font], total = mw(s, font), x = cx - (total >> 1);
  for (var i = 0; i < s.length; i++) {
    var ch = s.charAt(i), w = mw(ch, font), dy = rnd && rnd() < 0.28 ? 1 : 0;
    if (ch !== ' ') px.text(g, ch, x, top + dy, { font: font, ink: ink, shadow: sh || null });
    x += w + info.gap;
  }
}

/* ======================== LETRA CURSIVA PINTADA (script de brocha) ========================
   Alfabeto reducido a mano para las palabras de marca en cursiva (Pilsen, Coca-Cola y sus parodias Pilsón, Coco-Cola).
   Cada letra es una o varias plumadas (puntos de control en unidades: linea base 0, altura de x = 6, ascendentes ~11, y hacia arriba) que se
   suavizan con Catmull-Rom, se cizallan (inclinacion de brocha) y se pintan con pluma de dos anchos: las bajadas empinadas llevan el trazo
   grueso (3 px en el tamano grande, 2 en el chico), las subidas y los enlaces son un filete de 1 px.  Todas las letras entran y salen por la
   linea base, asi que se enlazan solas.  Se hornea una sola vez por (texto, escala) y se guarda en cache.
   L.script.size(str, s) -> {w, h, top}    L.script.draw(g, str, cx, base, s, {ink, ink2, sh, out})     L.script.case(str) -> 'Pilsón' */
var SG = {};
function sdef(ch, w, paths, dots) { SG[ch] = { w: w, paths: paths, dots: dots || [] }; }
function SH_(p) { return { p: p, h: 1 }; }          // filete (trazo fino siempre)
function ST_(p) { return { p: p, t: 1 }; }          // trazo grueso siempre (guion, tilde)
sdef(' ', 3, []);
sdef('n', 6.6, [SH_([[0, 0], [0.5, 2.5], [1.1, 6]]), [[1.1, 6], [1.1, 3], [1.1, 0.5]],
  [[1.1, 3.5], [2, 5.6], [3.5, 6], [4.8, 5], [5.1, 3], [5.1, 0.8], [5.8, 0.2], [6.6, 0]]]);
sdef('i', 3.8, [SH_([[0, 0], [0.5, 2.5], [1.1, 6]]), [[1.1, 6], [1.1, 3], [1.2, 0.7], [2.2, 0.1], [3.8, 0]]], [[1.5, 8.8]]);
sdef('l', 5.2, [SH_([[0, 0], [1.5, 3.8], [3.0, 8.8], [3.5, 10.8], [2.7, 11.6], [1.7, 10.8]]), [[1.7, 10.8], [1.9, 6], [2.2, 0.8], [3.2, 0.1], [5.2, 0]]]);
sdef('s', 5.6, [SH_([[0, 0], [0.7, 1.8], [1.4, 3.6], [1.9, 5.0]]), [[4.2, 5.3], [3.2, 6.1], [2.0, 5.6], [1.8, 4.4], [2.9, 3.4], [4.0, 2.4], [4.0, 1.0], [2.9, 0.2], [1.5, 0.6]],
  SH_([[2.9, 0.2], [4.2, 0.3], [5.6, 0]])]);
sdef('e', 5.6, [SH_([[0, 0], [1.2, 1.6], [2.6, 3.0]]),
  [[2.6, 3.0], [4.2, 3.6], [3.6, 5.6], [2.0, 6.0], [0.9, 4.4], [0.9, 2.2], [1.9, 0.6], [3.4, 0.2], [4.4, 0.6], [5.6, 0]]]);
sdef('o', 5.6, [SH_([[0, 0], [0.6, 2.2], [1.8, 4.8], [3.2, 6.0]]),
  [[3.2, 6.0], [1.6, 5.6], [0.8, 3.6], [1.0, 1.6], [2.4, 0.3], [3.8, 0.6], [4.8, 2.4], [4.7, 4.6], [3.6, 5.9], [3.0, 6.0]], SH_([[4.0, 0.5], [4.9, 0.3], [5.6, 0]])]);
sdef('ó', 5.6, SG.o.paths.concat([ST_([[3.4, 8.0], [4.0, 8.9], [4.8, 9.8]])]));
sdef('c', 5.4, [SH_([[0, 0], [0.6, 2.2], [1.6, 4.6], [3.0, 6.0]]), [[3.0, 6.0], [1.4, 5.4], [0.8, 3.2], [1.4, 1.0], [2.8, 0.2], [4.0, 0.4], [5.4, 0]],
  SH_([[3.0, 6.0], [4.0, 6.2], [4.8, 5.4]])]);
sdef('a', 6.6, [SH_([[0, 0], [0.6, 2.2], [1.6, 4.4], [2.6, 5.8]]), [[4.8, 5.9], [3.6, 6.2], [2.0, 5.8], [0.9, 3.8], [1.0, 1.6], [2.4, 0.3], [3.8, 0.9], [4.7, 2.6]],
  [[4.8, 7.0], [4.9, 3.0], [4.8, 0.9], [5.6, 0.2], [6.6, 0]]]);
sdef('-', 4.5, [ST_([[0.5, 3.4], [2.2, 3.6], [4, 3.4]]), ST_([[0.5, 2.6], [2.2, 2.8], [4, 2.6]])]);
sdef('P', 8.0, [SH_([[0, 0.2], [0.4, 5], [1.0, 10.8]]), [[1.0, 10.8], [1.3, 6], [1.2, 0.8], [2.2, 0.1], [3.4, 0]],
  [[1.0, 10.4], [3.4, 10.9], [5.6, 10.5], [6.4, 8.6], [5.4, 6.8], [3.4, 6.2], [1.6, 6.6]]]);
sdef('C', 8.0, [[[6.4, 9.0], [5.2, 10.5], [3.2, 10.9], [1.6, 9.5], [0.9, 6.4], [1.5, 2.8], [3.2, 0.7], [5.0, 0.3], [8.0, 0]]]);
function catmull(pts, n) {
  var out = [], P = [pts[0]].concat(pts, [pts[pts.length - 1]]), i, t;
  for (i = 1; i < P.length - 2; i++) {
    var p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    for (t = 0; t < n; t++) {
      var u = t / n, u2 = u * u, u3 = u2 * u;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function bres(x0, y0, x1, y1, f) {
  var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, e = dx + dy;
  for (var n = 0; n < 400; n++) {
    f(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    var e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}
var SCACHE = {};
/* -> { pix: [[x, y, v]], x0, x1, y0, y1 } con la linea base en y = 0 (y negativa = arriba); v 1 = tinta, 2 = borde grueso (lado derecho del trazo) */
function scriptPix(str, s, k, tw) {
  var key = str + '|' + s + '|' + k + '|' + tw, hit = SCACHE[key];
  if (hit) return hit;
  var thin = {}, thick = {}, dots = {}, x = 0, c, i;
  function mapPt(x0, p) { return [x0 + (p[0] + k * p[1]) * s, -p[1] * s]; }
  for (c = 0; c < str.length; c++) {
    var gl = SG[str.charAt(c)];
    if (!gl) { x += 3 * s; continue; }
    (function (x0) {
      gl.paths.forEach(function (path0) {
        var path = path0.p || path0, hair = !!path0.h, alw = !!path0.t;
        var dense = catmull(path, 24).map(function (p) { return mapPt(x0, p); }), n = dense.length, cls = [], j;
        for (j = 0; j < n; j++) {
          var a = dense[Math.max(0, j - 3)], b = dense[Math.min(n - 1, j + 3)], dx = b[0] - a[0], dy = b[1] - a[1];
          cls.push(alw || (!hair && dy > 0 && dy > Math.abs(dx) * 0.7));
        }
        var prev = null;
        for (j = 0; j < n; j++) {
          var q = [Math.round(dense[j][0]), Math.round(dense[j][1])];
          if (prev && prev[0] === q[0] && prev[1] === q[1]) { if (cls[j]) thick[q[0] + ',' + q[1]] = 1; continue; }
          var from = prev || q;
          (function (cj) { bres(from[0], from[1], q[0], q[1], function (px_, py_) { thin[px_ + ',' + py_] = 1; if (cj) thick[px_ + ',' + py_] = 1; }); })(cls[j]);
          prev = q;
        }
      });
      gl.dots.forEach(function (d) {
        var p = mapPt(x0, d), r = Math.max(1, Math.round(s * 1.1)), qx = Math.round(p[0]), qy = Math.round(p[1]);
        for (var j2 = 0; j2 < r; j2++) for (var i2 = 0; i2 < r; i2++) dots[(qx + i2) + ',' + (qy + j2)] = 1;
      });
    })(x);
    x += gl.w * s;
  }
  var pm = {}, k2;
  for (k2 in thin) pm[k2] = 1;
  for (k2 in thick) { var p2 = k2.split(','), X = +p2[0], Y = +p2[1]; for (var t = 1; t < tw; t++) { var kk = (X + t) + ',' + Y; if (!pm[kk]) pm[kk] = 2; } }
  for (k2 in dots) pm[k2] = 2;
  var pix = [], x0_ = 1e9, x1_ = -1e9, y0_ = 1e9, y1_ = -1e9;
  for (k2 in pm) { var p3 = k2.split(','), px3 = +p3[0], py3 = +p3[1]; pix.push([px3, py3, pm[k2]]); if (px3 < x0_) x0_ = px3; if (px3 > x1_) x1_ = px3; if (py3 < y0_) y0_ = py3; if (py3 > y1_) y1_ = py3; }
  return (SCACHE[key] = { pix: pix, x0: x0_, x1: x1_, y0: y0_, y1: y1_ });
}
var SCK = 0.28;
function scriptTW(s) { return s >= 1.25 ? 3 : 2; }
/* 'PILSEN' -> 'Pilsen', 'COCA-COLA' -> 'Coca-Cola', 'PILSÓN' -> 'Pilsón' */
function scriptCase(str) {
  var o = '', up = true;
  for (var i = 0; i < str.length; i++) {
    var ch = str.charAt(i);
    o += up ? ch.toUpperCase() : ch.toLowerCase();
    up = ch === ' ' || ch === '-';
  }
  return o;
}
function scriptOK(str) { for (var i = 0; i < str.length; i++) if (!SG[str.charAt(i)]) return false; return true; }
/* medida del texto a la escala s: ancho, alto sobre la linea base (con la i y las tildes) */
function scriptSize(str, s) {
  var p = scriptPix(str, s, SCK, scriptTW(s));
  return { w: p.x1 - p.x0 + 1, h: -p.y0 + 1, x0: p.x0, y0: p.y0 };
}
/* o = { ink, ink2 (borde grueso), sh (sombra 1 px SE), out (contorno 1 px), dot (color del punto de la i) } */
function scriptDraw(g, str, cx, base, s, o) {
  o = o || {};
  var p = scriptPix(str, s, SCK, scriptTW(s)), ox = Math.round(cx - (p.x0 + p.x1) / 2), oy = Math.round(base), i, q, taken = {};
  var ink = o.ink, ink2 = o.ink2 || ink;
  for (i = 0; i < p.pix.length; i++) { q = p.pix[i]; taken[(q[0] + ox) + ',' + (q[1] + oy)] = 1; }
  if (o.out) for (i = 0; i < p.pix.length; i++) { q = p.pix[i]; for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var kk = (q[0] + ox + dx) + ',' + (q[1] + oy + dy); if (!taken[kk]) P1(g, q[0] + ox + dx, q[1] + oy + dy, o.out); } }
  if (o.sh) for (i = 0; i < p.pix.length; i++) { q = p.pix[i]; if (!taken[(q[0] + ox + 1) + ',' + (q[1] + oy + 1)]) P1(g, q[0] + ox + 1, q[1] + oy + 1, o.sh); }
  for (i = 0; i < p.pix.length; i++) { q = p.pix[i]; P1(g, q[0] + ox, q[1] + oy, q[2] === 2 ? ink2 : ink); }
}
function fitScript(str, w, h) {
  for (var s = 1.7; s >= 0.78; s -= 0.05) {
    s = Math.round(s * 100) / 100;
    var sz = scriptSize(str, s);
    if (sz.w + 4 <= w && sz.h + 2 <= h) return { s: s, sz: sz };
  }
  return null;
}
L.script = { defs: SG, flush: function () { for (var k in SCACHE) delete SCACHE[k]; }, fit: fitScript, size: scriptSize, draw: scriptDraw, 'case': scriptCase, ok: scriptOK };

/* ======================== BOTELLA ======================== */
var GL_GREEN = ['#1f3a36', '#2e5e3e', '#5a8f80'], GL_GOLD = ['#8a6a1a', '#c9a23a', '#f0d060'], GL_BLUE = ['#1d2a48', '#2f4470', '#7a92c0'];
function bottle(g, bx, yb, bh, gl, label, cap) {            // 7 px de ancho; yb = fila de la base
  var top = yb - bh, nb = Math.max(5, bh >> 2), by = top + nb + 1;
  F(g, bx + 2, top, 3, 1, cap || K);
  F(g, bx + 2, top + 1, 3, nb, gl[1]); F(g, bx + 2, top + 1, 1, nb, gl[2]); F(g, bx + 4, top + 1, 1, nb, gl[0]);
  F(g, bx + 1, top + nb + 1, 5, 1, gl[1]);
  F(g, bx, by, 7, yb - by, gl[1]); F(g, bx, by, 1, yb - by, gl[2]); F(g, bx + 6, by, 1, yb - by, gl[0]);
  F(g, bx, yb - 1, 7, 1, gl[0]);
  var ly = by + ((yb - by) >> 2), lh = Math.max(3, (yb - by) >> 1);
  F(g, bx, ly, 7, lh, label); P1(g, bx, ly, null); P1(g, bx + 6, ly, null); P1(g, bx, ly + lh - 1, null); P1(g, bx + 6, ly + lh - 1, null);
  F(g, bx + 1, ly + 1, 5, 1, lite(label, 0.25));
}
function fish(g, x, y, c, c2) {                             // pez de 8x4 (emblema de la parodia de Pilsen)
  F(g, x + 1, y + 1, 5, 2, c); P1(g, x + 2, y, c); P1(g, x + 3, y, c); P1(g, x + 2, y + 3, c); P1(g, x + 3, y + 3, c);
  F(g, x + 6, y, 1, 4, c); P1(g, x + 7, y, c); P1(g, x + 7, y + 3, c); P1(g, x + 5, y + 1, c2 || '#f3efe2'); P1(g, x + 1, y + 1, K);
}
function sunDisc(g, cx, cy, c, c2) {                        // sol de 7x7 con rayos (emblema de INTI KOLA)
  F(g, cx - 1, cy - 1, 3, 3, c); F(g, cx - 2, cy, 5, 1, c); F(g, cx, cy - 2, 1, 5, c);
  P1(g, cx - 3, cy, c2); P1(g, cx + 3, cy, c2); P1(g, cx, cy - 3, c2); P1(g, cx, cy + 3, c2);
  P1(g, cx - 2, cy - 2, c2); P1(g, cx + 2, cy - 2, c2); P1(g, cx - 2, cy + 2, c2); P1(g, cx + 2, cy + 2, c2);
}

/* ======================== AVISO DE MARCA ======================== */
/* Estilo por marca: colores por clave de m.colors (o hex literal).  ink = tinta, sh = sombra 1 px, out = contorno de letra, slant = cursiva,
   frame = marco, filete = linea fina interior, ribbon = [fondo, tinta] de la cinta del segundo renglon, fx = fondo, bottle = botella. */
var ST = {
  pilsen:   { ink: 'fg', sh: 'dk', ssh: 'accent', script: true, slant: 0.24, frame: 'fg', ribbon: ['fg', 'bg'], line: 'accent', fx: 'swoosh', bottle: [GL_GREEN, 'bg', 'fg'] },
  cristal:  { ink: 'fg', sh: 'dk', frame: 'fg', filete: 'accent', ribbon: ['fg', 'bg'], fx: 'stars', bottle: [GL_GREEN, 'bg', 'fg'] },
  incakola: { ink: 'fg', out: 'accent', sh: 'dk', frame: 'fg', fx: 'sun', bottle: [GL_GOLD, 'fg', 'fg'] },
  cocacola: { ink: 'fg', sh: 'dk', script: true, slant: 0.26, frame: 'fg', fx: 'wave' },
  kolareal: { ink: 'fg', sh: 'dk', frame: 'accent', fx: 'bandB' },
  bigcola:  { ink: 'fg', sh: 'dk', out: 'accent', slant: 0.26, frame: 'fg', fx: 'band' },
  guarana:  { ink: 'fg', sh: 'dk', frame: 'accent', fx: 'band2' },
  cusquena: { ink: 'fg', sh: 'dk', frame: 'fg', filete: 'accent', ribbon: ['accent', 'fg'], fx: 'stars' },
  yape:     { ink: 'fg', sh: 'dk', frame: 'accent' },
  plin:     { ink: 'fg', sh: 'dk', frame: 'accent' },
  inkafarma:{ ink: 'fg', sh: null, frame: 'fg' },
  fasa:     { ink: 'fg', sh: 'dk', frame: 'accent', ribbon: ['accent', 'fg'] },
  loteria:  { ink: 'fg', sh: 'dk', frame: 'accent', fx: 'balls' },
  agente:   { ink: 'fg', sh: 'dk', frame: 'accent' },
  _def:     { ink: 'fg', sh: 'dk', frame: 'accent' }
};

/* Busca la letra mas grande que quepa.  lines = renglones del nombre; sub = texto de la cinta (opcional).  Devuelve null si nada cabe. */
function fit(lines, sub, w, h, padX, padY) {
  var cands = [lines];
  if (lines.length === 1 && lines[0].indexOf(' ') > 0 && lines[0].indexOf('-') < 0) cands.push(lines[0].split(' '));
  else if (lines.length === 1 && lines[0].indexOf('-') > 0) { var hp = lines[0].split('-'); cands.push([hp[0] + '-', hp[1]]); }
  var fonts = ['a12', 'a7', 'a5'], f, c, k;
  for (f = 0; f < fonts.length; f++) for (c = 0; c < cands.length; c++) {
    var ln = cands[c], font = fonts[f], maxw = 0, joined = ln.join(' ');
    for (k = 0; k < ln.length; k++) maxw = Math.max(maxw, mw(ln[k], font));
    var bh = ln.length * FH[font] + (ln.length - 1) * (GAP[font] - (font === 'a12' ? 1 : 0)), acc = hasAcc(joined) ? TOP[font] : 0, rb = sub ? 8 : 0;
    if (maxw + 2 * padX <= w && bh + acc + rb + 2 * padY <= h) return { font: font, lines: ln, bh: bh, acc: acc, rb: rb, maxw: maxw };
  }
  return null;
}

function ad(g, id, x, y, w, h, o) {
  o = o || {};
  var m = px.marca(id);
  if (!m) return null;
  x |= 0; y |= 0; w |= 0; h |= 0;
  var st = ST[id] || ST._def, C = m.colors, rnd = o.rnd || px.rng(hs(id) * 3 + x * 31 + y * 17 + w);
  function col(k) { return k == null ? null : (C[k] !== undefined ? C[k] : k); }
  var bg = tone(C.bg), ink = col(st.ink), sh = col(st.sh), out = col(st.out);
  var big = w >= 30 && h >= 16;
  // instantanea del borde (los bordes pintados a mano quedan rotos: se devuelve un poco de la pared)
  var snap = [], i, j;
  if (o.rough !== false) { for (i = 0; i < w; i++) { snap.push([x + i, y, Q(g, x + i, y)], [x + i, y + h - 1, Q(g, x + i, y + h - 1)]); } for (j = 1; j < h - 1; j++) snap.push([x, y + j, Q(g, x, y + j)], [x + w - 1, y + j, Q(g, x + w - 1, y + j)]); }
  F(g, x, y, w, h, bg);
  // fondos
  var fx = st.fx;
  if (fx === 'sun' && w >= 36) {
    var cx0 = x + (w >> 1), cy0 = y + h + (h >> 2), lt = tint(bg, '#ffffff', 0.38);
    for (j = 1; j < h - 1; j++) for (i = 1; i < w - 1; i++) {
      var dx = i - (w >> 1), dy = j - h - (h >> 2); if (dx * dx + dy * dy < 36) continue;
      var a = Math.atan2(-dy, dx); if (Math.floor(a * 7 / Math.PI) & 1) P1(g, x + i, y + j, lt);
    }
  } else if (fx === 'band' && h >= 18) { F(g, x + 1, y + h - 6, w - 2, 5, tone(C.fg)); }
  else if (fx === 'band2' && h >= 18) { F(g, x + 1, y + 1, w - 2, 3, tone(C.accent)); }
  else if (fx === 'bandB' && h >= 18) { F(g, x + 1, y + h - 5, w - 2, 4, tone(C.accent)); }
  // bordes con relieve
  F(g, x, y, w, 1, lite(bg, 0.22)); F(g, x, y + h - 1, w, 1, dark(bg, 0.4)); F(g, x, y, 1, h, lite(bg, 0.1)); F(g, x + w - 1, y, 1, h, dark(bg, 0.28));
  var ix = x + 1, iy = y + 1, iw = w - 2, ih = h - 2;
  if (big && st.frame && w >= 36) { ring(g, x + 1, y + 1, w - 2, h - 2, tone(col(st.frame))); ix += 2; iy += 2; iw -= 4; ih -= 4; }
  else { ix += 1; iy += 1; iw -= 2; ih -= 2; }
  if (big && st.filete && w >= 56) { ring(g, ix, iy, iw, ih, tint(bg, col(st.filete), 0.6)); ix += 2; iy += 2; iw -= 4; ih -= 4; }
  // cinta del segundo renglon
  var sub = m.text2 && st.ribbon && big ? m.text2 : '';
  // botella a la izquierda (solo en los avisos grandes y solo si deja la letra mas grande)
  var useBottle = !!(st.bottle && w >= 80 && h >= 32 && o.bottle !== false), bw = 0;
  var lines = m.lines.slice(0, st.ribbon && m.text2 ? 1 : (m.text2 ? 2 : 1));
  var scr = null, sTxt = '', layout, l1, txtLines = lines, sub0 = sub, bott0 = useBottle;
  if (st.script) {                                              // palabra de marca en cursiva pintada: la letra mas grande que quepa (si no cabe >= 0,78, cae a letra de bloque)
    sTxt = scriptCase(m.text);
    if (scriptOK(sTxt)) {
      var sx_ = (fx === 'swoosh' || fx === 'wave') ? 3 : 0;
      scr = fitScript(sTxt, iw - (useBottle ? 16 : 0), ih - (sub ? 8 : 0) - sx_);
      if (!scr && sub) { sub = ''; scr = fitScript(sTxt, iw - (useBottle ? 16 : 0), ih - sx_); }
      if (!scr && useBottle) { useBottle = false; scr = fitScript(sTxt, iw, ih - (sub ? 8 : 0) - sx_); }
      if (!scr && sx_) { sx_ = 0; scr = fitScript(sTxt, iw - (useBottle ? 16 : 0), ih - (sub ? 8 : 0)); }       // sin espacio para la rubrica: solo la palabra
      if (!scr && sx_ === 0 && sub) { sub = ''; scr = fitScript(sTxt, iw - (useBottle ? 16 : 0), ih); }
      if (scr) { layout = { font: 'script', lines: [sTxt], bh: scr.sz.h + sx_, acc: 0, rb: sub ? 8 : 0, maxw: scr.sz.w, scr: scr }; bw = useBottle ? 16 : 0; }
      else { sub = sub0; useBottle = bott0; }
    }
  }
  if (!scr) {
  layout = fit(lines, sub, iw, ih, 2, 2); l1 = useBottle ? fit(lines, sub, iw - 16, ih, 2, 2) : null;
  if (!layout && sub) { sub = ''; layout = fit(lines, '', iw, ih, 2, 2); l1 = useBottle ? fit(lines, '', iw - 16, ih, 2, 2) : null; }
  if (useBottle && l1 && layout && l1.font === layout.font) { layout = l1; bw = 16; } else useBottle = false;
  if (!layout) { txtLines = lines.map(stripAcc); layout = fit(txtLines, '', iw, ih, 1, 1) || { font: 'a5', lines: [txtLines[0].slice(0, Math.max(1, ((iw - 2) / 4) | 0))], bh: 5, acc: 0, rb: 0, maxw: 0 }; sub = ''; }
  }
  if (useBottle && st.bottle) bottle(g, ix + 3, iy + ih - 1 - (sub ? 8 : 0), Math.min(ih - 3 - (sub ? 8 : 0), 26), st.bottle[0], tone(col(st.bottle[1])), col(st.bottle[2]));
  var ribbonH = sub ? 8 : 0, tx0 = ix + bw, tcw = iw - bw, cx = tx0 + (tcw >> 1);
  var regionH = ih - ribbonH, blockH = layout.bh + layout.acc, ty = iy + ((regionH - blockH) >> 1) + layout.acc;
  var sl = st.slant && layout.font !== 'a5' ? st.slant : 0;
  var inkc = tone(ink);
  if (scr) {
    var sbase = ty + (-scr.sz.y0), sInk = tone(ink), sInk2 = tint(sInk, tone(C.dk), st.ink2 === undefined ? 0.28 : st.ink2);
    scriptDraw(g, sTxt, cx, sbase, scr.s, { ink: sInk, ink2: sInk2, sh: st.ssh ? tone(col(st.ssh)) : (sh ? tone(sh) : null) });
  } else for (i = 0; i < layout.lines.length; i++) {
    var ly = ty + i * (FH[layout.font] + GAP[layout.font] - (layout.font === 'a12' ? 1 : 0)), lw = mw(layout.lines[i], layout.font);
    var lcx = cx + (layout.lines.length > 1 ? (i === 0 ? -((layout.maxw - lw) >> 1) : ((layout.maxw - lw) >> 1)) : 0);   // dos renglones escalonados
    txt(g, layout.lines[i], lcx, ly, layout.font, inkc, { sh: sh && layout.font !== 'a5' ? sh : (layout.font === 'a5' ? null : null), out: out && layout.font === 'a12' ? out : null, slant: sl });
  }
  var tyEnd = scr ? ty + scr.sz.h : ty + blockH - layout.acc;
  // adornos
  if (fx === 'swoosh' && layout.lines.length === 1 && w >= 44) {
    var gold = tone(C.accent), sx0 = cx - (layout.maxw >> 1), sy = tyEnd + 1;
    if (sy + 2 < iy + regionH) { F(g, sx0, sy, layout.maxw + 1, 1, gold); F(g, sx0 + 3, sy + 1, layout.maxw - 4, 1, gold); P1(g, sx0 + layout.maxw + 1, sy - 1, gold); P1(g, sx0 + layout.maxw + 2, sy - 2, gold); }
  } else if (fx === 'wave' && w >= 44) {
    var wy = tyEnd + 2; if (wy + 2 < iy + ih) for (i = 0; i < layout.maxw + 8; i++) P1(g, cx - ((layout.maxw + 8) >> 1) + i, wy + Math.round(Math.sin(i / 4.2) * 1.2), C.accent);
  } else if (fx === 'stars' && w >= 60) {
    var sy2 = ty + (blockH >> 1), s1 = cx - (layout.maxw >> 1) - 5, s2 = cx + (layout.maxw >> 1) + 5, sc = tone(C.fg);
    [s1, s2].forEach(function (sx) { if (sx - 2 > ix && sx + 2 < ix + iw) { P1(g, sx, sy2 - 2, sc); F(g, sx - 1, sy2 - 1, 3, 1, sc); F(g, sx - 2, sy2, 5, 1, sc); F(g, sx - 1, sy2 + 1, 3, 1, sc); P1(g, sx, sy2 + 2, sc); } });
  } else if (fx === 'balls' && w >= 24) {
    var bc = ['#D32F2F', '#FFD600', '#F3EFE2']; for (i = 0; i < 3; i++) { P1(g, ix + 2 + i * 3, iy + ih - 2, bc[i]); P1(g, ix + 3 + i * 3, iy + ih - 2, bc[i]); }
  }
  // emblema de la parodia (la version real no lleva escudos ni siluetas de marca)
  if (!m.real && w >= 56 && h >= 22) {
    if (id === 'pilsen') fish(g, x + w - 14, y + 3, C.fg, C.bg);
    else if (id === 'incakola' || id === 'gaseosa_amarilla') sunDisc(g, x + w - 8, y + 7, C.fg, C.fg);
  }
  // cinta
  if (sub) {
    var rbg = tone(col(st.ribbon[0])), rin = tone(col(st.ribbon[1]));
    F(g, ix, iy + ih - 8, iw, 8, rbg); F(g, ix, iy + ih - 8, iw, 1, lite(rbg, 0.25));
    px.text(g, sub, ix + (iw >> 1), iy + ih - 6, { font: 'a5', ink: rin, align: 'c' });
  }
  if (o.wear !== 0) wearOff(g, x, y, w, h, rnd, o.wear === undefined ? 1 : o.wear, inkc);
  // bordes rotos
  if (o.rough !== false) for (i = 0; i < snap.length; i++) if (rnd() < 0.06) { var sp = snap[i]; if (sp[2]) P1(g, sp[0], sp[1], sp[2]); }
  return { x: x, y: y, w: w, h: h, font: layout.font };
}
/* desgaste de pintura: motas de salitre, suciedad abajo, chorreras de tinta */
function wearOff(g, x, y, w, h, rnd, amt, inkc) {
  var n = Math.round(w * h / 160 * amt), i;
  for (i = 0; i < n; i++) {
    var xx = x + 1 + ((rnd() * (w - 2)) | 0), yy = y + 1 + ((rnd() * (h - 2)) | 0), c = Q(g, xx, yy);
    if (c) { var nc = tint(c, '#b9b49c', 0.12 + rnd() * 0.1); P1(g, xx, yy, nc); if (rnd() < 0.25) { var c2 = Q(g, xx + 1, yy); if (c2) P1(g, xx + 1, yy, tint(c2, '#b9b49c', 0.2)); } }
  }
  for (i = 0; i < w; i++) for (var j = Math.max(2, h - 4); j < h - 1; j++) { var c3 = Q(g, x + i, y + j); if (c3 && rnd() < 0.35) P1(g, x + i, y + j, dark(c3, 0.06 + (j - (h - 4)) * 0.03)); }
  var nd = h >= 20 ? 1 + (w / 45 | 0) : 0;
  for (i = 0; i < nd; i++) {
    var dx = x + 4 + ((rnd() * (w - 8)) | 0), len = 2 + ((rnd() * 4) | 0), dc = dark(inkc, 0.12);
    for (var k = 0; k < len; k++) if (!Q(g, dx, y + h + k - 0)) P1(g, dx, y + h + k, k === len - 1 ? dark(inkc, 0.35) : dc);
  }
}
L.ad = ad;

/* remate de marca para la banda (9 px de alto, 1 px de aire arriba y abajo dentro de la banda de 10) */
L.capW = function (id) { var m = px.marca(id); if (!m) return 0; return Math.min(46, mw(stripAcc(m.text), 'a5') + 8); };
L.cap = function (g, id, x, y, w, h) {
  h = h || 8;
  var m = px.marca(id), st = ST[id] || ST._def;
  if (!m) return;
  var C = m.colors, bg = tone(C.bg);
  F(g, x, y, w, h, bg); F(g, x, y, w, 1, lite(bg, 0.25)); F(g, x, y + h - 1, w, 1, dark(bg, 0.4)); F(g, x + w - 1, y, 1, h, dark(bg, 0.25));
  var fr = tone(C[st.frame] || C.accent);
  F(g, x + 1, y + 1, 1, h - 2, fr); F(g, x + w - 2, y + 1, 1, h - 2, fr);
  var s = stripAcc(m.text), ink = tone(C[st.ink] || C.fg);
  while (s.length > 1 && mw(s, 'a5') > w - 6) s = s.slice(0, -1);
  px.text(g, s, x + (w >> 1), y + ((h - 5) >> 1), { font: 'a5', ink: ink, shadow: C.dk && (st.sh) ? C.dk : null, align: 'c' });
};

/* repartido de marcas por pared: 30 % Pilsen, 25 % Inca Kola, 20 % Cristal, 10 % Coca-Cola, 10 % Kola Real/Big Cola, 5 % Cusqueña (informe 3.8) */
var WALLS = ['pilsen', 'incakola', 'cristal', 'pilsen', 'cocacola', 'incakola', 'pilsen', 'cristal', 'kolareal', 'incakola',
  'pilsen', 'cusquena', 'cristal', 'pilsen', 'incakola', 'bigcola', 'pilsen', 'cocacola', 'incakola', 'cristal'];
L.brandAt = function (c0, seed, i) { return WALLS[(((c0 | 0) * 7 + (seed | 0) % 13 + (i | 0) * 7) % 20 + 20) % 20]; };
var AWN = { pilsen: ['#2e6b3a', '#f3efe2'], cristal: ['#2f4470', '#f3efe2'], incakola: ['#e6c85a', '#2b3990'], cocacola: ['#c42b26', '#f3efe2'],
  cusquena: ['#1f4d2e', '#d9a441'], kolareal: ['#c42b26', '#2f7a50'], bigcola: ['#e6c85a', '#c42b26'] };
L.awningCols = function (id) { return AWN[id] || AWN.pilsen; };
/* marcas de cerveza: una bodega nunca las lleva todas juntas */
L.isBeer = function (id) { return id === 'pilsen' || id === 'cristal' || id === 'cusquena'; };

/* ======================== NEVERAS ======================== */
/* nevera horizontal con tapa y frente de marca.  30x17 (base en yb).  o.lit pinta la luz de la tapa */
L.chest = function (g, id, x, yb, o) {
  o = o || {};
  var m = px.marca(id), st = ST[id] || ST._def, C = m ? m.colors : { bg: '#3f72b0', fg: '#f3efe2', accent: '#e6c85a', dk: '#1d2a48' };
  var y = yb - 17, w = 30, bg = tone(C.bg);
  F(g, x, y, w, 4, '#d8d4c4'); F(g, x, y, w, 1, '#efebdc'); F(g, x + 1, y + 1, w - 2, 1, '#bdb9ab'); F(g, x, y + 3, w, 1, '#8c8a93');
  F(g, x + 2, y + 1, w - 4, 2, o.lit ? '#cfe8e0' : '#a9a79b');
  F(g, x, y + 4, w, 11, bg); F(g, x, y + 4, w, 1, lite(bg, 0.25)); F(g, x, y + 4, 1, 11, lite(bg, 0.12)); F(g, x + w - 1, y + 4, 1, 11, dark(bg, 0.3)); F(g, x, y + 14, w, 1, dark(bg, 0.4));
  ring(g, x + 1, y + 5, w - 2, 9, tone(C[st.frame] || C.accent));
  if (m) {
    var s = stripAcc(m.text); if (mw(s, 'a5') > w - 6) s = s.split(/[ -]/)[0];
    px.text(g, s, x + (w >> 1), y + 7, { font: 'a5', ink: tone(C[st.ink] || C.fg), shadow: null, align: 'c' });
    if (m.text2 && mw(stripAcc(m.text2), 'a5') <= w - 6 && st.ribbon) { /* sin segundo renglon: no cabe */ }
  }
  F(g, x + 2, yb - 2, 3, 2, '#5f5d6b'); F(g, x + w - 5, yb - 2, 3, 2, '#5f5d6b');
  F(g, x + 1, yb - 1, w - 2, 1, tint('#2a2440', '#2a2440', 0));
  for (var i = 0; i < 3; i++) P1(g, x + 4 + i * 9, y + 13, dark(bg, 0.5));
  return { w: w, h: 17 };
};
/* nevera vertical de vitrina (14x34): caja de luz de marca arriba (sin texto: botella y colores), puerta de vidrio con botellas, rejilla */
L.tall = function (g, id, x, yb, o) {
  o = o || {};
  var m = px.marca(id), st = ST[id] || ST._def, C = m ? m.colors : { bg: '#3f72b0', fg: '#f3efe2', accent: '#e6c85a', dk: '#1d2a48' };
  var y = yb - 34, w = 14, bg = tone(C.bg);
  F(g, x, y, w, 34, '#d8d4c4'); F(g, x, y, 1, 34, '#efebdc'); F(g, x + w - 1, y, 1, 34, '#8c8a93'); F(g, x, y, w, 1, '#efebdc');
  F(g, x, y, w, 8, bg); F(g, x, y, w, 1, lite(bg, 0.3)); F(g, x, y + 7, w, 1, dark(bg, 0.45)); F(g, x + w - 1, y, 1, 8, dark(bg, 0.3));
  ring(g, x + 1, y + 1, w - 2, 6, tone(C[st.frame] || C.accent));
  var bc = tone(C[st.ink] || C.fg); F(g, x + 3, y + 3, 8, 2, bc); P1(g, x + 4, y + 2, bc); P1(g, x + 9, y + 2, bc);            // marca: tira de color
  if (m && mw(stripAcc(m.text), 'a5') <= w - 4) px.text(g, stripAcc(m.text), x + (w >> 1), y + 2, { font: 'a5', ink: bc, align: 'c' });
  F(g, x + 2, y + 9, w - 4, 20, '#23222c'); ring(g, x + 2, y + 9, w - 4, 20, '#8c8a93');
  var gl = [GL_GREEN, GL_GOLD, GL_BLUE], r = px.rng(hs(id || 'x') + x);
  for (var sy = 0; sy < 3; sy++) {
    var gy = y + 11 + sy * 6, cc = gl[(sy + (id === 'incakola' ? 1 : 0)) % 3];
    F(g, x + 3, gy + 5, w - 6, 1, '#5c6570');
    for (var bx = x + 3; bx < x + w - 4; bx += 2) { var hgt = 4; F(g, bx, gy + 5 - hgt, 1, hgt, cc[1]); P1(g, bx, gy + 5 - hgt, cc[2]); P1(g, bx + 1, gy + 1, r() < 0.5 ? C.fg : cc[1]); }
  }
  F(g, x + 3, y + 10, 1, 17, '#cfe8e0'); P1(g, x + 4, y + 12, '#cfe8e0'); P1(g, x + 4, y + 14, '#cfe8e0');
  F(g, x + w - 4, y + 18, 1, 5, '#a4abaa');
  F(g, x + 2, y + 30, w - 4, 3, '#8c8a93'); for (var k = 0; k < 5; k++) F(g, x + 3 + k * 2, y + 31, 1, 2, '#3b4250');
  F(g, x + 1, yb - 1, w - 2, 1, '#5f5d6b');
  return { w: w, h: 34 };
};

/* ======================== JABAS ======================== */
/* pila de n jabas rojas de 13x6 (cada una con su logo amarillo-naranja de 5x2: sin texto) y botellas verdes asomando */
L.jabas = function (g, x, yb, n, o) {
  o = o || {};
  var r = o.rnd || px.rng(hs('jabas') + x + yb), i, k;
  var body = o.col || '#c42b26', lt = lite(body, 0.3), dk = dark(body, 0.42), logo = o.logo || '#f2a630';
  for (i = 0; i < n; i++) {
    var cy = yb - 6 * (i + 1), jx = x + (i % 2 && r() < 0.5 ? 1 : 0);
    F(g, jx, cy, 13, 6, body); F(g, jx, cy, 13, 1, lt); F(g, jx, cy + 5, 13, 1, dk);
    for (k = 1; k < 13; k += 3) F(g, jx + k, cy + 2, 1, 3, dk);
    F(g, jx + 12, cy, 1, 6, dk); P1(g, jx, cy + 1, lt);
    F(g, jx + 4, cy + 2, 5, 2, logo); P1(g, jx + 4, cy + 2, lite(logo, 0.4)); F(g, jx + 5, cy + 3, 3, 1, dark(logo, 0.3));
  }
  if (o.bottles !== false) {
    var ty = yb - 6 * n;
    for (k = 0; k < 4; k++) { F(g, x + 1 + k * 3, ty - 3, 2, 3, GL_GREEN[1]); P1(g, x + 1 + k * 3, ty - 3, GL_GREEN[2]); P1(g, x + 1 + k * 3, ty - 4, k % 2 ? '#c42b26' : '#e6c85a'); }
  }
  for (k = 0; k < 14; k++) P1(g, x + k, yb, dark('#8a8884', 0.5));
  return { w: 14, h: 6 * n + 4 };
};

/* ======================== CARTELES A MANO ======================== */
var CARD = '#d8c69a';
function tape(g, x, y) { F(g, x, y, 3, 2, '#e9e2c8'); P1(g, x, y, '#fff6dc'); }
function shadowed(g, x, y, w, h) { F(g, x + 1, y + h, w, 1, SH); }
var H = L.hand = {};
H.chela = function (g, x, y, o) {                         // SE VENDE / CHELA / HELADA  (36x21)
  var r = (o && o.rnd) || px.rng(hs('chela') + x + y), w = 36, h = 24, m = px.marca('chela_helada');
  F(g, x, y, w, h, CARD); F(g, x, y, w, 1, lite(CARD, 0.4)); F(g, x, y + h - 1, w, 1, dark(CARD, 0.3)); F(g, x + w - 1, y, 1, h, dark(CARD, 0.22)); F(g, x, y, 1, h, lite(CARD, 0.2));
  P1(g, x, y, null); P1(g, x + w - 1, y + h - 1, null); P1(g, x + w - 2, y + h - 1, dark(CARD, 0.5));
  ring(g, x + 1, y + 1, w - 2, h - 2, '#2f4470');
  hand(g, m.text, x + (w >> 1), y + 3, '#2f4470', r);
  var big = m.text2.split(' ');
  hand(g, big[0], x + (w >> 1), y + 9, '#c42b26', r);
  hand(g, big[1], x + (w >> 1), y + 15, '#c42b26', r);
  F(g, x + 8, y + 14, w - 16, 1, '#2f4470');
  tape(g, x + 2, y - 1); tape(g, x + w - 5, y - 1);
  shadowed(g, x, y, w, h);
  return { w: w, h: h };
};
H.hielo = function (g, x, y, o) {                         // HAY HIELO (24x14) con cubito
  var r = (o && o.rnd) || px.rng(hs('hielo') + x + y), w = 24, h = 14;
  F(g, x, y, w, h, '#f3efe2'); ring(g, x, y, w, h, '#6fa8dc'); F(g, x + 1, y + 1, w - 2, 1, '#ffffff');
  hand(g, 'HAY', x + 10, y + 3, '#2f4470', r); hand(g, 'HIELO', x + 12, y + 8, '#2f4470', r);
  F(g, x + w - 6, y + 2, 4, 4, '#b4d0d0'); F(g, x + w - 6, y + 2, 4, 1, '#efebdc'); P1(g, x + w - 4, y + 4, '#6b8c9c');
  tape(g, x + 1, y - 1);
  return { w: w, h: h };
};
H.recargas = function (g, x, y, o) {                      // RECARGAS con tres puntos de operadora (38x12)
  var r = (o && o.rnd) || px.rng(hs('recargas') + x + y), w = 38, h = 12, m = px.marca('recargas');
  F(g, x, y, w, h, '#f3efe2'); ring(g, x, y, w, h, '#c42b26'); F(g, x + 1, y + 1, w - 2, 1, '#ffffff');
  px.text(g, m.text, x + (w >> 1), y + 2, { font: 'a5', ink: '#c42b26', align: 'c' });
  var cols = ['#da291c', '#3fa535', '#ffd600'];
  for (var i = 0; i < 3; i++) { F(g, x + (w >> 1) - 6 + i * 5, y + 8, 3, 2, cols[i]); P1(g, x + (w >> 1) - 6 + i * 5, y + 8, lite(cols[i], 0.4)); }
  shadowed(g, x, y, w, h);
  return { w: w, h: h };
};
H.menu = function (g, x, y, o) {                          // pizarra MENU S/ 10 con platos de tiza (30x26)
  var r = (o && o.rnd) || px.rng(hs('menu') + x + y), w = 30, h = 26, m = px.marca('menu_s10');
  F(g, x, y, w, h, '#6b4223'); F(g, x, y, w, 1, '#a86e38'); F(g, x + 1, y + 1, w - 2, h - 3, '#1f3a36'); F(g, x + 1, y + 1, w - 2, 1, '#2f5a52');
  px.text(g, m.text, x + (w >> 1), y + 4, { font: 'a5', ink: '#f3efe2', align: 'c' });
  px.text(g, m.text2.replace(' ', ''), x + (w >> 1), y + 10, { font: 'a5', ink: '#e6c85a', align: 'c' });
  for (var i = 0; i < 3; i++) { var lw = 8 + ((r() * 9) | 0); F(g, x + 4, y + 17 + i * 2, lw, 1, i === 1 ? '#e6c85a' : '#c9c5b5'); }
  F(g, x + 3, y + h - 2, w - 6, 1, '#4a3028');
  shadowed(g, x, y, w, h);
  return { w: w, h: h };
};
H.yape = function (g, x, y, o) {                          // placa de QR de mostrador (16x16): cabecera con el nombre y QR limpio (esquinas macizas + datos)
  var m = px.marca('yape'), C = m.colors, w = 16, h = 16, i, j, rows = ['1100000011', '1100100011', '0010110100', '0101001010', '1100110101'];
  F(g, x, y, w, h, tone(C.bg)); F(g, x, y, w, 1, lite(C.bg, 0.3)); F(g, x, y + h - 1, w, 1, dark(C.bg, 0.4)); F(g, x + w - 1, y, 1, h, dark(C.bg, 0.3));
  px.text(g, m.text, x + (w >> 1), y + 2, { font: 'a5', ink: '#ffffff', align: 'c' });
  F(g, x + 1, y + 8, 14, 7, '#f3efe2');
  for (j = 0; j < 5; j++) for (i = 0; i < 10; i++) if (rows[j].charAt(i) === '1') P1(g, x + 3 + i, y + 9 + j, K);
  F(g, x + 1, y + 14, 14, 1, '#cfc9b4');
  return { w: w, h: h };
};
H.loteria = function (g, x, y, o) {                       // sticker generico de loteria (30x9)
  var m = px.marca('loteria'); ad(g, 'loteria', x, y, 38, 11, { rough: false, wear: 0 });
  return { w: 38, h: 11 };
};
H.agente = function (g, x, y, o) {                        // sticker generico de agente de pagos (27x9)
  ad(g, 'agente', x, y, 30, 9, { rough: false, wear: 0 });
  return { w: 30, h: 9 };
};
H.fiado = function (g, x, y, o) {                         // FIADO NO (24x9)
  var r = (o && o.rnd) || px.rng(hs('fiado') + x + y), m = px.marca('fiado_no');
  F(g, x, y, 36, 9, '#e6c85a'); ring(g, x, y, 36, 9, '#1c1a22'); hand(g, m.text, x + 18, y + 2, '#1c1a22', r);
  return { w: 36, h: 9 };
};


/* sticker de QR en puerta o vidrio (10x12): placa morada, QR de 6x6 modulos (tres esquinas macizas + datos) y la inicial Y en blanco con el punto turquesa.
   Deterministico (nada al azar: se lee igual en todas las puertas).  En la parodia (YAPA) el punto turquesa se vuelve una barra. */
var YQR = ['110011', '110011', '010110', '001011', '110101', '111010'];
L.yapeSmall = function (g, x, y, o) {
  var m = px.marca('yape'), C = m.colors, bg = tone(C.bg), i, j, WH = '#f3efe2';
  F(g, x, y, 10, 12, bg); F(g, x, y, 10, 1, lite(C.bg, 0.3)); F(g, x, y, 1, 12, lite(C.bg, 0.12)); F(g, x + 9, y, 1, 12, dark(C.bg, 0.4));
  F(g, x + 1, y + 1, 8, 8, WH); F(g, x + 1, y + 8, 8, 1, '#cfc9b4');
  for (j = 0; j < 6; j++) for (i = 0; i < 6; i++) if (YQR[j].charAt(i) === '1') P1(g, x + 2 + i, y + 2 + j, K);
  P1(g, x + 2, y + 9, '#ffffff'); P1(g, x + 4, y + 9, '#ffffff'); P1(g, x + 3, y + 10, '#ffffff'); P1(g, x + 3, y + 11, '#ffffff');      // Y
  if (m.real) F(g, x + 6, y + 10, 2, 2, C.accent); else F(g, x + 6, y + 9, 2, 3, C.accent);
  return { w: 10, h: 12 };
};
/* pintas de pared a brocha, sin fondo (la tinta va directo sobre el muro).  kinds: orine, basura, gente, sb, vota.  Devuelven {w,h} */
L.pinta = function (g, kind, x, y, o) {
  var r = (o && o.rnd) || px.rng(hs('pinta' + kind) + x + y), RED = '#b0322c', i;
  function brush(lines, ink, font, gapY, cx) {
    var yy = y, wmax = 0;
    lines.forEach(function (ln) { hand(g, ln, cx, yy, ink, r, font, null); wmax = Math.max(wmax, mw(ln, font)); yy += FH[font] + gapY; });
    return { w: wmax, h: yy - y - gapY };
  }
  if (kind === 'orine') { var d = brush(['NO ORINE', 'SE MULTA'], RED, 'a5', 2, x + 16); return { w: 34, h: d.h }; }
  if (kind === 'basura') { var d2 = brush(['NO BOTAR', 'BASURA'], RED, 'a5', 2, x + 16); return { w: 34, h: d2.h }; }
  if (kind === 'gente') { var d3 = brush(['AQUÍ HAY', 'GENTE'], RED, 'a5', 2, x + 16); return { w: 34, h: d3.h + 2 }; }
  if (kind === 'sb') {                                      // stencil SB rosado con negro
    px.text(g, 'SB', x + 7, y, { font: 'a7', ink: '#f090b0', shadow: K, align: 'c', scale: 1 });
    return { w: 14, h: 8 };
  }
  if (kind === 'vota') {                                    // aviso electoral inventado: VOTA 7 / DON LUCHO (panel blanco a brocha)
    var w = 40, h = 26;
    F(g, x, y, w, h, '#e9e4d2'); ring(g, x, y, w, h, '#2f4470'); F(g, x + 1, y + h - 5, w - 2, 4, '#c42b26');
    px.text(g, 'VOTA', x + 14, y + 4, { font: 'a7', ink: '#c42b26', shadow: '#7a1a1a', align: 'c' });
    px.text(g, '7', x + 32, y + 3, { font: 'a12', ink: '#2f4470', shadow: '#1d2a48', align: 'c' });
    px.text(g, 'DON LUCHO', x + 20, y + 14, { font: 'a5', ink: '#2f4470', align: 'c' });
    px.text(g, 'ALCALDE', x + 20, y + 20, { font: 'a5', ink: '#f3efe2', align: 'c' });
    return { w: w, h: h };
  }
  return { w: 0, h: 0 };
};


/* ======================== EMPRESAS INVENTADAS, PLACAS Y CARTELES DE LOTE ======================== */
/* Ninguna es una empresa real: MARPAC, ANDESLINE, BRUMAMAR y COSTAVELA son los nombres de naviera que ya llevan los contenedores del patio.
   COS[id] = { bg, ink, accent, name, sub, icon }.  paintCo pinta el tablero (pared o valla) con el nombre en la letra mayor que quepa. */
var COS = L.COS = {
  andesline: { bg: '#2f4470', ink: '#f3efe2', accent: '#e6c85a', name: 'ANDESLINE', sub: 'AGENTES NAVIEROS', sub2: 'NAVIEROS', icon: 'anchor' },
  marpac:    { bg: '#8f3a32', ink: '#f3efe2', accent: '#e6c85a', name: 'MARPAC', sub: 'IMPORT-EXPORT', sub2: 'IMPORT', icon: 'box' },
  brumamar:  { bg: '#2f5a52', ink: '#efebdc', accent: '#e0c58d', name: 'BRUMAMAR', sub: 'OPERADOR PORTUARIO', sub2: 'PUERTOS', icon: 'wave' },
  costavela: { bg: '#e0c58d', ink: '#1d2a48', accent: '#c42b26', name: 'COSTAVELA', sub: 'TRANSPORTE DE CARGA', sub2: 'CARGA', icon: 'sail' },
  personal:  { bg: '#efebdc', ink: '#c42b26', accent: '#2f4470', name: 'SE NECESITA', sub: 'PERSONAL', icon: null, big2: true }
};
var ICON = {
  anchor: ['..##...', '..##...', '...#...', '.#####.', '...#...', '#..#..#', '.#####.'],
  sail:   ['...#...', '..##...', '.###...', '####...', '#####.#', '#####.#', '#######', '.#####.'],
  box:    ['#######', '#.#.#.#', '#.#.#.#', '#######', '#.#.#.#', '#######'],
  wave:   ['.......', '.##..##', '#..##..', '.......', '.##..##', '#..##..']
};
function icon(g, x, y, k, c) { var rows = ICON[k]; if (!rows) return 0; for (var j = 0; j < rows.length; j++) for (var i = 0; i < rows[j].length; i++) if (rows[j].charAt(i) === '#') P1(g, x + i, y + j, c); return rows[0].length; }
function bestFont(str, maxW) { return mw(str, 'a12') <= maxW ? 'a12' : (mw(str, 'a7') <= maxW ? 'a7' : 'a5'); }
function paintCo(g, S, x, y, w, h) {
  var bg = tone(S.bg), ink = tone(S.ink), acc = tone(S.accent);
  F(g, x, y, w, h, bg); F(g, x, y, w, 1, lite(bg, 0.22)); F(g, x, y + h - 1, w, 1, dark(bg, 0.4)); F(g, x + w - 1, y, 1, h, dark(bg, 0.28));
  ring(g, x + 2, y + 2, w - 4, h - 4, acc);
  if (S.big2) {                                                                      // cartel de papel: SE NECESITA chico y PERSONAL grande
    px.text(g, S.name, x + (w >> 1), y + 5, { font: 'a5', ink: acc, align: 'c' });
    var fP = mw(S.sub, 'a12') <= w - 8 ? 'a12' : (mw(S.sub, 'a7') <= w - 8 ? 'a7' : 'a5');
    px.text(g, S.sub, x + (w >> 1), y + 12, { font: fP, ink: ink, shadow: tint(bg, ink, 0.45), align: 'c' });
    return;
  }
  var ic = S.icon ? 9 : 0, iw = w - 8 - ic;
  if (ic && mw(S.name, 'a7') > iw) { ic = 0; iw = w - 8; }                             // sin el emblema si el nombre no cabe en letra de 7
  var fN = bestFont(S.name, iw), hN = FH[fN], sub = '';
  if (S.sub && h >= 22) { sub = mw(S.sub, 'a5') <= iw ? S.sub : (S.sub2 && mw(S.sub2, 'a5') <= iw ? S.sub2 : ''); }
  var gap = sub ? 3 : 0, blk = hN + gap + (sub ? 5 : 0), top = y + ((h - blk) >> 1), cx = x + 4 + ic + (iw >> 1);
  if (ic) icon(g, x + 5, y + ((h - ICON[S.icon].length) >> 1), S.icon, acc);
  px.text(g, S.name, cx, top, { font: fN, ink: ink, shadow: fN === 'a5' ? null : dark(bg, 0.5), align: 'c' });
  if (sub) {
    F(g, cx - (iw >> 1), top + hN + 1, iw, 1, acc);
    px.text(g, sub, cx, top + hN + gap, { font: 'a5', ink: acc, align: 'c' });
  }
}
/* placa de bronce / chapa esmaltada de oficina (empresa inventada), lineas a5.  o = { bg, ink, trim } -> {w, h} */
L.plaque = function (g, x, y, lines, o) {
  o = o || {};
  var w = 0, i, bg = o.bg || '#b08a3a', ink = o.ink || '#2a2018', trim = o.trim || '#e0c58d';
  for (i = 0; i < lines.length; i++) w = Math.max(w, mw(stripAcc(lines[i]), 'a5'));
  w += 6; var h = lines.length * 6 + 2;
  F(g, x, y, w, h, bg); F(g, x, y, w, 1, lite(bg, 0.35)); F(g, x, y + h - 1, w, 1, dark(bg, 0.45)); F(g, x + w - 1, y, 1, h, dark(bg, 0.3)); F(g, x, y, 1, h, lite(bg, 0.15));
  P1(g, x + 1, y + 1, trim); P1(g, x + w - 2, y + 1, trim); P1(g, x + 1, y + h - 2, dark(bg, 0.4)); P1(g, x + w - 2, y + h - 2, dark(bg, 0.4));
  for (i = 0; i < lines.length; i++) px.text(g, stripAcc(lines[i]), x + (w >> 1), y + 2 + i * 6, { font: 'a5', ink: ink, align: 'c' });
  return { w: w, h: h };
};

/* carteles de lote (a mano o esmaltados): SE NECESITA PERSONAL, PROHIBIDO ESTACIONAR - COCHERA, CUIDADO PERRO BRAVO.  Devuelven {w, h}. */
H.personal = function (g, x, y, o) {                       // hoja pegada con cinta: SE / NECESITA / PERSONAL (37x25)
  var r = (o && o.rnd) || px.rng(hs('personal') + x + y), w = 37, h = 25, P = '#efe9d4';
  F(g, x, y, w, h, P); F(g, x, y, w, 1, '#ffffff'); F(g, x, y + h - 1, w, 1, dark(P, 0.3)); F(g, x + w - 1, y, 1, h, dark(P, 0.22));
  P1(g, x, y, null); P1(g, x + w - 1, y + h - 1, null);
  ring(g, x + 1, y + 1, w - 2, h - 2, '#c42b26');
  hand(g, 'SE', x + (w >> 1), y + 4, '#2f4470', r); hand(g, 'NECESITA', x + (w >> 1), y + 10, '#c42b26', r); hand(g, 'PERSONAL', x + (w >> 1), y + 16, '#c42b26', r);
  tape(g, x + 2, y - 1); tape(g, x + w - 5, y - 1);
  shadowed(g, x, y, w, h);
  return { w: w, h: h };
};
H.cochera = function (g, x, y, o) {                        // chapa esmaltada PROHIBIDO / ESTACIONAR / COCHERA (47x24)
  var w = 47, h = 24, R = '#c42b26';
  F(g, x, y, w, h, '#1c1a22'); F(g, x + 1, y + 1, w - 2, h - 2, '#efebdc'); F(g, x + 1, y + 1, w - 2, 1, '#ffffff'); ring(g, x + 1, y + 1, w - 2, h - 2, R);
  px.text(g, 'PROHIBIDO', x + (w >> 1), y + 3, { font: 'a5', ink: R, align: 'c' }); px.text(g, 'ESTACIONAR', x + (w >> 1), y + 9, { font: 'a5', ink: R, align: 'c' });
  F(g, x + 3, y + 15, w - 6, 6, '#1c1a22'); px.text(g, 'COCHERA', x + (w >> 1), y + 16, { font: 'a5', ink: '#e6c85a', align: 'c' });
  P1(g, x + 2, y + 2, '#cfd3cc'); P1(g, x + w - 3, y + 2, '#cfd3cc'); P1(g, x + 2, y + h - 3, '#cfd3cc'); P1(g, x + w - 3, y + h - 3, '#cfd3cc');
  shadowed(g, x, y, w, h);
  return { w: w, h: h };
};
var DOG = ['#.........#', '##.......##', '###.....###', '###########', '##..###..##', '###########', '.#########.', '..#.#.#.#..', '...#####...', '....###....'];
H.perro = function (g, x, y, o) {                          // carton CUIDADO / PERRO BRAVO con silueta de perro (40x25)
  var r = (o && o.rnd) || px.rng(hs('perro') + x + y), w = 40, h = 25, P = '#e6c85a';
  F(g, x, y, w, h, P); F(g, x, y, w, 1, lite(P, 0.4)); F(g, x, y + h - 1, w, 1, dark(P, 0.35)); F(g, x + w - 1, y, 1, h, dark(P, 0.25));
  ring(g, x + 1, y + 1, w - 2, h - 2, '#1c1a22');
  hand(g, 'CUIDADO', x + (w >> 1), y + 3, '#c42b26', r);
  for (var j = 0; j < DOG.length; j++) for (var i = 0; i < DOG[j].length; i++) if (DOG[j].charAt(i) === '#') P1(g, x + 3 + i, y + 11 + j, '#1c1a22');
  hand(g, 'PERRO', x + 28, y + 11, '#1c1a22', r); hand(g, 'BRAVO', x + 28, y + 17, '#c42b26', r);
  tape(g, x + 2, y - 1); tape(g, x + w - 5, y - 1);
  shadowed(g, x, y, w, h);
  return { w: w, h: h };
};

/* valla de azotea: tablero de marca sobre dos parantes de acero, de cara a la calle (x,y = esquina sup. izq. del tablero; yb = fila donde se apoyan los parantes).
   Sombra proyectada al SE sobre lo que ya haya pintado debajo (la azotea). */
L.valla = function (g, id, x, y, w, h, yb) {
  x |= 0; y |= 0; w |= 0; h |= 0;
  var i, j, tsh = tint('#2a2440', '#2a2440', 0), sx = x + 3, sy = y + 4;
  for (j = 0; j < h + (yb - y - h) + 1; j++) for (i = 0; i < w; i++) {                      // sombra: el tablero y los parantes desplazados al SE
    var px_ = x + i + 3 + (j >> 1), py_ = y + j + 4, c = Q(g, px_, py_);
    if (j < h || (i > 3 && i < 7) || (i > w - 8 && i < w - 4)) { if (c) P1(g, px_, py_, dark(c, 0.38)); }
  }
  [x + 5, x + w - 8].forEach(function (px0) {
    F(g, px0, y + h - 2, 3, yb - (y + h) + 2, STEEL[1]); F(g, px0, y + h - 2, 1, yb - (y + h) + 2, STEEL[3]); F(g, px0 + 2, y + h - 2, 1, yb - (y + h) + 2, STEEL[0]);
    F(g, px0 - 1, yb - 1, 5, 2, STEEL[0]);
  });
  F(g, x - 1, y - 1, w + 2, h + 2, '#2a2430');
  if (typeof id === 'string' && L.COS[id]) paintCo(g, L.COS[id], x, y, w, h);                 // valla de empresa inventada (MARPAC, ANDESLINE...)
  else ad(g, id, x, y, w, h, { rough: false, wear: 0.5 });
  F(g, x - 1, y + h + 1, w + 2, 1, STEEL[1]);                                                  // marco de fierro angulo abajo
};

/* letrero bandera de marca 28x14 (capa alta), con soporte */
L.flagBrand = function (go, x, y, id) {
  var m = px.marca(id), st = ST[id] || ST._def, C = m.colors, bg = tone(C.bg);
  F(go, x + 3, y + 3, 28, 14, '#2a244060');
  F(go, x - 2, y - 2, 5, 2, '#2a2430'); F(go, x + 12, y - 4, 2, 3, '#2a2430'); F(go, x + 26, y - 3, 2, 3, '#2a2430'); F(go, x, y - 1, 28, 1, '#2a2430');
  F(go, x, y, 28, 14, bg); F(go, x, y, 28, 1, lite(bg, 0.3)); F(go, x, y + 13, 28, 1, dark(bg, 0.45)); F(go, x, y, 1, 14, dark(bg, 0.3)); F(go, x + 27, y, 1, 14, dark(bg, 0.45));
  ring(go, x, y, 28, 14, '#1c1a22'); ring(go, x + 2, y + 2, 24, 10, tone(C[st.frame] || C.accent));
  var ink = tone(C[st.ink] || C.fg), s = stripAcc(m.text);
  if (mw(s, 'a5') <= 22) px.text(go, s, x + 14, y + 4, { font: 'a5', ink: ink, align: 'c' });
  else { var p = s.split(' '); if (p.length === 2 && mw(p[0], 'a5') <= 22 && mw(p[1], 'a5') <= 22) { px.text(go, p[0], x + 14, y + 3, { font: 'a5', ink: ink, align: 'c' }); px.text(go, p[1], x + 14, y + 8, { font: 'a5', ink: ink, align: 'c' }); } else px.text(go, s.slice(0, 5), x + 14, y + 4, { font: 'a5', ink: ink, align: 'c' }); }
  F(go, x + 12, y + 14, 2, 1, '#2a2430');
};

/* ======================== SENALES DE CALLE (props) ======================== */
var STEEL = ['#3b4250', '#5c6570', '#7e868a', '#a4abaa'];
function mkProp(g, ax, ay, fw, fh, tall) {
  var c = g.toCanvas(), c1 = px.canvas(c.width, c.height);
  c1.getContext('2d', { willReadFrequently: true }).drawImage(c, 0, 0);
  var sh = px.shadowSE(c1, 0.2, { base: ay, len: 0.42 });
  var W = Math.max(c1.width, sh.width), Hh = Math.max(c1.height, ay + 1 + sh.height), res = px.canvas(W, Hh), cx = res.getContext('2d');
  cx.drawImage(sh, 0, ay); cx.drawImage(c1, 0, 0);
  res.ax = ax; res.ay = ay; res.fw = fw; res.fh = fh; res.shadowIn = true; if (tall) res.tall = true;
  return res;
}
function pole(g, ax, y0, y1) {
  for (var y = y0; y <= y1; y++) { P1(g, ax - 1, y, STEEL[3]); P1(g, ax, y, STEEL[1]); }
  F(g, ax - 2, y1 - 1, 4, 2, STEEL[0]); F(g, ax - 2, y1 - 1, 4, 1, STEEL[2]);
  P1(g, ax - 1, y0 - 1, STEEL[3]); P1(g, ax, y0 - 1, STEEL[1]);
}
function bolts(g, xs, y) { xs.forEach(function (x) { P1(g, x, y, '#cfd3cc'); }); }
/* placa rectangular de calle: fondo azul, marco blanco fino, texto a5.  Se exagera x3 (informe 45) */
function streetPlate(g, x, y, w, h, s, o) {
  o = o || {};
  var bg = o.bg || '#1f4e9a', ink = o.ink || '#f3efe2';
  F(g, x, y, w, h, K); F(g, x + 1, y + 1, w - 2, h - 2, bg); F(g, x + 1, y + 1, w - 2, 1, lite(bg, 0.25));
  ring(g, x + 2, y + 2, w - 4, h - 4, tint(bg, '#ffffff', 0.55));
  px.text(g, s, x + (w >> 1), y + ((h - 5) >> 1), { font: 'a5', ink: ink, align: 'c', shadow: dark(bg, 0.5) });
  P1(g, x + 1, y + 1, '#cfd3cc'); P1(g, x + w - 2, y + 1, '#cfd3cc');
}
function octagon(g, cx, cy, r, c) { for (var j = -r; j <= r; j++) for (var i = -r; i <= r; i++) { if (Math.abs(i) + Math.abs(j) <= Math.round(r * 1.55)) P1(g, cx + i, cy + j, c); } }
function disc(g, cx, cy, r, c) { for (var j = -r; j <= r; j++) for (var i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * 0.4) P1(g, cx + i, cy + j, c); }
function diamond(g, cx, cy, r, c) { for (var j = -r; j <= r; j++) for (var i = -r; i <= r; i++) if (Math.abs(i) + Math.abs(j) <= r) P1(g, cx + i, cy + j, c); }

var SIGNS = [];                                           // {arr, i, fn} para redibujar en sitio
function defSign(n, W, Hh, fw, fh, draw) {
  function build() {
    var g = new G(W, Hh); draw(g, W >> 1, Hh - 1);
    return mkProp(g, W >> 1, Hh - 1, fw, fh, true);
  }
  var arr = S.props.senal = S.props.senal || [];
  arr[n] = build();
  SIGNS.push({ arr: arr, i: n, fn: build });
}
function defProp(key, n, fn) {
  var arr = S.props[key] = S.props[key] || [];
  arr[n] = fn();
  SIGNS.push({ arr: arr, i: n, fn: fn });
}

// 0: AV. GAMBETTA ; 1 y 2: la misma con la placa del jiron abajo
function twoPlates(sub) {
  return function (g, ax, ay) {
    var py = 2;
    pole(g, ax, py + 12 + (sub ? 12 : 0), ay);
    streetPlate(g, ax - 28, py, 56, 12, 'AV. GAMBETTA');
    if (sub) streetPlate(g, ax - 22, py + 13, 44, 11, sub, { bg: '#2c5e9e' });
    bolts(g, [ax - 1, ax], py + 12);
  };
}
defSign(0, 60, 52, 6, 3, twoPlates(null));
defSign(1, 60, 64, 6, 3, twoPlates('JR. COLÓN'));
defSign(2, 60, 64, 6, 3, twoPlates('JR. GRAU'));
// 3: PARE
defSign(3, 28, 46, 5, 3, function (g, ax, ay) {
  pole(g, ax, 22, ay);
  var cy = 12;
  octagon(g, ax, cy, 10, K); octagon(g, ax, cy, 9, '#f3efe2'); octagon(g, ax, cy, 8, '#c8102e'); F(g, ax - 6, cy - 7, 12, 1, '#e23a50');
  px.text(g, 'PARE', ax, cy - 2, { font: 'a5', ink: '#f3efe2', align: 'c' });
  bolts(g, [ax - 1, ax], 22);
});
// 4: NO ESTACIONAR (E tachada + cartel)
defSign(4, 48, 56, 5, 3, function (g, ax, ay) {
  pole(g, ax, 34, ay);
  var cy = 9; disc(g, ax, cy, 9, K); disc(g, ax, cy, 8, '#c8102e'); disc(g, ax, cy, 6, '#1f4e9a');
  px.text(g, 'E', ax, cy - 2, { font: 'a5', ink: '#f3efe2', align: 'c' });
  for (var i = -5; i <= 5; i++) { P1(g, ax + i, cy + i, '#c8102e'); P1(g, ax + i + 1, cy + i, '#c8102e'); }
  F(g, ax - 22, 22, 44, 12, K); F(g, ax - 21, 23, 42, 10, '#f3efe2'); ring(g, ax - 21, 23, 42, 10, '#c8102e');
  px.text(g, 'NO ESTAC.', ax, 26, { font: 'a5', ink: '#c8102e', align: 'c' });
});
// 5: PARADERO con pictograma de combi y RUTA 77
defSign(5, 44, 62, 5, 3, function (g, ax, ay) {
  pole(g, ax, 38, ay);
  var x = ax - 20, y = 2;
  F(g, x, y, 40, 36, K); F(g, x + 1, y + 1, 38, 34, '#2c5e9e'); F(g, x + 1, y + 1, 38, 1, '#4a86c4'); ring(g, x + 2, y + 2, 36, 32, '#cfe0f0');
  px.text(g, 'PARADERO', ax, y + 5, { font: 'a5', ink: '#f3efe2', align: 'c' });
  // combi
  var bx = ax - 9, by = y + 13;
  F(g, bx, by + 2, 18, 8, '#e6c85a'); F(g, bx + 1, by, 12, 3, '#e6c85a'); F(g, bx + 2, by + 1, 4, 2, '#8fb0b8'); F(g, bx + 7, by + 1, 4, 2, '#8fb0b8'); F(g, bx + 12, by + 2, 5, 3, '#8fb0b8');
  F(g, bx, by + 7, 18, 1, '#2f4470'); F(g, bx + 3, by + 9, 4, 3, K); F(g, bx + 12, by + 9, 4, 3, K); P1(g, bx + 4, by + 10, '#a4abaa'); P1(g, bx + 13, by + 10, '#a4abaa');
  F(g, x + 4, y + 28, 32, 6, '#f3efe2'); px.text(g, 'RUTA 77', ax, y + 29, { font: 'a5', ink: '#c42b26', align: 'c' });
  bolts(g, [ax - 1, ax], 38);
});
// 6: PROHIBIDO ARROJAR BASURA (la muni cambia con el interruptor: CALLAO / PUERTO)
defSign(6, 48, 60, 5, 3, function (g, ax, ay) {
  pole(g, ax, 38, ay);
  var m = px.marca('muni'), x = ax - 22, y = 2, mm = m.real ? 'CALLAO' : 'PUERTO';
  F(g, x, y, 44, 36, K); F(g, x + 1, y + 1, 42, 34, '#f3efe2'); ring(g, x + 1, y + 1, 42, 34, '#c8102e'); ring(g, x + 2, y + 2, 40, 32, '#c8102e');
  px.text(g, 'PROHIBIDO', ax, y + 5, { font: 'a5', ink: '#c8102e', align: 'c' });
  px.text(g, 'ARROJAR', ax - 9, y + 12, { font: 'a5', ink: K, align: 'c' }); px.text(g, 'BASURA', ax - 9, y + 18, { font: 'a5', ink: K, align: 'c' });
  F(g, x + 34, y + 11, 6, 10, '#7e868a'); F(g, x + 33, y + 10, 8, 2, '#a4abaa'); F(g, x + 34, y + 12, 1, 9, '#a4abaa'); F(g, x + 37, y + 13, 1, 6, '#5c6570');
  for (var i = 0; i < 9; i++) P1(g, x + 33 + i - 1, y + 21 - i, '#c8102e');
  F(g, x + 4, y + 25, 36, 8, '#c8102e'); px.text(g, mm, ax, y + 27, { font: 'a5', ink: '#f3efe2', align: 'c' });
  bolts(g, [ax - 1, ax], 38);
});
// 7: RESALTO (rombo amarillo con joroba) + cartel
defSign(7, 40, 58, 5, 3, function (g, ax, ay) {
  pole(g, ax, 34, ay);
  var cy = 12; diamond(g, ax, cy, 13, K); diamond(g, ax, cy, 12, '#f2c100'); diamond(g, ax, cy, 10, '#1c1a22'); diamond(g, ax, cy, 9, '#f2c100');
  for (var i = -5; i <= 5; i++) { var h = Math.round(4 * Math.cos(i / 5 * Math.PI / 2)); F(g, ax + i, cy + 4 - h, 1, h + 1, K); }
  F(g, ax - 6, cy + 5, 12, 1, K);
  F(g, ax - 18, 26, 36, 8, K); F(g, ax - 17, 27, 34, 6, '#f2c100'); px.text(g, 'RESALTO', ax, 27, { font: 'a5', ink: K, align: 'c' });
});
// 8: VELOCIDAD MAXIMA 40
defSign(8, 28, 52, 5, 3, function (g, ax, ay) {
  pole(g, ax, 30, ay);
  var cy = 12; disc(g, ax, cy, 12, K); disc(g, ax, cy, 11, '#c8102e'); disc(g, ax, cy, 8, '#f3efe2');
  px.text(g, '40', ax, cy - 3, { font: 'a7', ink: K, align: 'c' });
  F(g, ax - 8, 26, 16, 4, K); F(g, ax - 7, 27, 14, 2, '#f3efe2');
  bolts(g, [ax - 1, ax], 26);
});
// 9: ZONA RIGIDA
defSign(9, 40, 62, 5, 3, function (g, ax, ay) {
  pole(g, ax, 36, ay);
  var x = ax - 18, y = 2;
  F(g, x, y, 36, 34, K); F(g, x + 1, y + 1, 34, 32, '#f3efe2'); ring(g, x + 1, y + 1, 34, 32, '#c8102e');
  px.text(g, 'ZONA', ax, y + 5, { font: 'a5', ink: '#c8102e', align: 'c' }); px.text(g, 'RÍGIDA', ax, y + 13, { font: 'a5', ink: '#c8102e', align: 'c' });
  F(g, x + 3, y + 22, 30, 8, '#c8102e'); px.text(g, 'NO PARAR', ax, y + 24, { font: 'a5', ink: '#f3efe2', align: 'c' });
  bolts(g, [ax - 1, ax], 36);
});
// 10: CEDA EL PASO (triangulo invertido)
defSign(10, 32, 52, 5, 3, function (g, ax, ay) {
  pole(g, ax, 28, ay);
  for (var j = 0; j < 22; j++) { var half = 14 - Math.floor(j * 0.62); F(g, ax - half, 2 + j, half * 2 + 1, 1, j < 1 ? K : '#c8102e'); }
  for (j = 2; j < 18; j++) { var h2 = 10 - Math.floor((j - 2) * 0.62); F(g, ax - h2, 4 + j - 1, h2 * 2 + 1, 1, '#f3efe2'); }
  for (j = 0; j < 22; j++) { var h3 = 14 - Math.floor(j * 0.62); P1(g, ax - h3, 2 + j, K); P1(g, ax + h3, 2 + j, K); }
  px.text(g, 'CEDA', ax, 7, { font: 'a5', ink: '#c8102e', align: 'c' });
});
// 11: pasaje (placa pequena en esquina de pasaje)
defSign(11, 44, 46, 5, 3, function (g, ax, ay) {
  pole(g, ax, 14, ay);
  streetPlate(g, ax - 20, 2, 40, 11, 'PSJE. 2');
  bolts(g, [ax - 1, ax], 13);
});

/* ---- jabas como prop (con huella) ---- */
function jabasProp(n, extra) {
  return function () {
    var W = extra ? 30 : 18, Hh = 6 * n + 8, g = new G(W, Hh), yb = Hh - 2;
    L.jabas(g, 2, yb, n, { rnd: px.rng(300 + n) });
    if (extra) L.jabas(g, 16, yb, extra, { rnd: px.rng(320 + extra), col: '#b9302a' });
    return mkProp(g, W >> 1, yb, extra ? 28 : 14, 6, n >= 4);
  };
}
defProp('jabas', 0, jabasProp(3)); defProp('jabas', 1, jabasProp(5)); defProp('jabas', 2, jabasProp(4, 2));
/* ---- neveras de bodega como prop ---- */
['cristal', 'incakola', 'cocacola', 'pilsen'].forEach(function (id, i) {
  defProp('neveraProp', i, function () {
    var g = new G(20, 40); L.tall(g, id, 3, 38, {}); return mkProp(g, 10, 38, 14, 5, true);
  });
});
/* ---- carteles libres: caballete con pizarra, carton en palo, banner de recargas ---- */
defProp('letrero', 0, function () {                       // caballete con MENU S/ 10
  var g = new G(36, 40), r = px.rng(41), x = 3;
  F(g, x + 3, 22, 2, 16, '#6b4223'); F(g, x + 25, 22, 2, 16, '#6b4223'); F(g, x + 3, 22, 1, 16, '#a86e38');
  H.menu(g, x, 4, { rnd: r });
  F(g, x + 4, 30, 22, 1, '#4a3028');
  return mkProp(g, 18, 38, 24, 4, false);
});
defProp('letrero', 1, function () {                       // carton SE VENDE CHELA HELADA en un palo
  var g = new G(44, 44), x = 4; F(g, x + 17, 24, 2, 18, '#6b4223'); F(g, x + 17, 24, 1, 18, '#a86e38');
  H.chela(g, x, 4, { rnd: px.rng(42) });
  return mkProp(g, 22, 42, 6, 3, false);
});
defProp('letrero', 2, function () {                       // RECARGAS en palo
  var g = new G(46, 40), x = 4; F(g, x + 18, 14, 2, 24, '#6b4223'); F(g, x + 18, 14, 1, 24, '#a86e38');
  H.recargas(g, x, 2, { rnd: px.rng(43) });
  return mkProp(g, 23, 38, 6, 3, false);
});
defProp('letrero', 3, function () {                       // caballete HAY HIELO
  var g = new G(32, 36), x = 3; F(g, x + 12, 16, 2, 18, '#6b4223'); H.hielo(g, x, 2, { rnd: px.rng(44) });
  return mkProp(g, 16, 34, 6, 3, false);
});

/* ======================== POSICIONES SUGERIDAS (px de mundo) ======================== */
/* Sardinel norte = fila 14 (y 224..240), vereda norte = filas 11-13 (y 176..224); sardinel sur = fila 35 (y 560..576), vereda sur = 36-38 (y 576..624).
   Jirones: cols 40-43 (x 640..704) y 84-87 (x 1344..1408).  Pasajes: cols 24-26, 66-68, 96-98.  Paradero en (80, 600).
   x,y = ancla (pie del poste).  No se sacan de la huella de los lotes ni de las filas de postes (fila 13 y 36). */
L.senales = [
  { n: 5,  x: 128,  y: 598, note: 'paradero: al este de la marquesina, vereda sur' },
  { n: 0,  x: 22,   y: 586, note: 'AV. GAMBETTA al inicio, vereda sur' },
  { n: 1,  x: 628,  y: 216, note: 'esquina NO del 1er jiron: AV. GAMBETTA + JR. COLON' },
  { n: 2,  x: 1334, y: 216, note: 'esquina NO del 2o jiron: AV. GAMBETTA + JR. GRAU' },
  { n: 1,  x: 716,  y: 586, note: 'esquina SE del 1er jiron (vereda sur)' },
  { n: 2,  x: 1414, y: 586, note: 'esquina SE del 2o jiron (vereda sur)' },
  { n: 3,  x: 612,  y: 584, note: 'PARE antes del 1er jiron, carril hacia el este (junto a la leyenda PARE del suelo)' },
  { n: 3,  x: 732,  y: 218, note: 'PARE antes del 1er jiron, carril hacia el oeste' },
  { n: 3,  x: 1318, y: 584, note: 'PARE antes del 2o jiron, este' },
  { n: 3,  x: 1434, y: 218, note: 'PARE antes del 2o jiron, oeste' },
  { n: 7,  x: 906,  y: 584, note: 'RESALTO (reductor) antes del resalto de la col 60, hacia el este' },
  { n: 7,  x: 1018, y: 218, note: 'RESALTO, hacia el oeste' },
  { n: 8,  x: 316,  y: 584, note: 'velocidad 40, vereda sur' },
  { n: 8,  x: 1126, y: 218, note: 'velocidad 40, vereda norte' },
  { n: 8,  x: 1692, y: 584, note: 'velocidad 40, antes del cerro' },
  { n: 4,  x: 1186, y: 218, note: 'NO ESTACIONAR frente al taller N8 (cols 69-77)' },
  { n: 4,  x: 842,  y: 218, note: 'NO ESTACIONAR junto al almacen N6' },
  { n: 9,  x: 760,  y: 584, note: 'ZONA RIGIDA frente a la fabrica S5' },
  { n: 6,  x: 380,  y: 190, note: 'PROHIBIDO ARROJAR BASURA en la boca del 1er pasaje (cols 24-26)' },
  { n: 6,  x: 1052, y: 190, note: 'PROHIBIDO ARROJAR BASURA en la boca del 2o pasaje (cols 66-68)' },
  { n: 11, x: 1534, y: 192, note: 'PSJE. en la boca del 3er pasaje (cols 96-98)' },
  { n: 10, x: 1604, y: 584, note: 'CEDA EL PASO antes del cerro, carril este (junto a CEDA del suelo)' }
];

/* ======================== HOJA DE PRUEBA ======================== */
L.sheet = function () {
  var W = 420, Hh = 330, g = new G(W, Hh), y = 4, ids = ['pilsen', 'cristal', 'incakola', 'cocacola', 'bigcola', 'kolareal', 'cusquena'];
  F(g, 0, 0, W, Hh, '#8a9aa6');
  ids.forEach(function (id, i) { ad(g, id, 4 + (i % 3) * 100, 4 + ((i / 3) | 0) * 42, 96, 38); });
  ids.forEach(function (id, i) { ad(g, id, 4 + (i % 4) * 50, 130 + ((i / 4) | 0) * 30, 44, 26); });
  ids.forEach(function (id, i) { L.cap(g, id, 210 + (i % 2) * 52, 130 + ((i / 2) | 0) * 11, L.capW(id), 9); });
  var x = 4; ['cristal', 'incakola', 'pilsen', 'cocacola'].forEach(function (id) { L.chest(g, id, x, 214, {}); x += 33; });
  x = 140; ['cristal', 'incakola', 'cocacola', 'pilsen'].forEach(function (id) { L.tall(g, id, x, 214, {}); x += 17; });
  L.jabas(g, 212, 214, 5, {}); L.jabas(g, 230, 214, 3, {}); H.yape(g, 250, 196, {}); H.loteria(g, 270, 200, {}); H.agente(g, 270, 212, {});
  H.chela(g, 4, 224, {}); H.hielo(g, 44, 224, {}); H.recargas(g, 70, 224, {}); H.menu(g, 112, 224, {}); H.fiado(g, 146, 224, {});
  return g.toCanvas();
};

/* ======================== REDIBUJO EN SITIO (interruptor de marcas) ======================== */
function rebuild() {
  SIGNS.forEach(function (e) {
    var ex = e.arr[e.i], nc = e.fn();
    if (ex && ex.width === nc.width && ex.height === nc.height) {
      var cx = ex.getContext('2d'); cx.clearRect(0, 0, ex.width, ex.height); cx.drawImage(nc, 0, 0);
    } else e.arr[e.i] = nc;
  });
}
L.rebuild = rebuild;
px.onMarcas(rebuild);
})();
