/* ACHORADO - js/costaverde/arte-larcomar.js  (Costa Verde, fase C2b)
 * Dueño: C2b (pixel art de Larcomar y del lado tierra).  Contrato: COSTAVERDE.md §10.2.  Nota: ../diseno/cv-C2b.md
 *
 * Publica:
 *   ACH.sprites.cv.larco = {
 *     fachada(brand, wTiles) -> { cv, ax, ay, lights }      cv = lienzo (wTiles*16 x 64; granDragon x 96), ax = w/2, ay = alto (base en el piso),
 *                                                          lights = [{x,y,w,h,kind}] en px del lienzo. Con cache por marca+ancho+modo (real/parodia).
 *     brands  (ids), brandName(id)  (nombre segun el modo), tiles{...}, props{...}  y todo repetido plano (larco.pisoLarco, larco.barandaVidrio...)
 *   }
 *   ACH.sprites.lotArch.cv_torre / cv_casona / cv_hotel    function (ficha) -> { canvas, over, overX, overY, lights }   (lados N y S)
 * Modo real / parodia: ACH.cfg.marcasReales + ACH.px.onMarcas (invalida el cache; quien hornea vuelve a pedir la fachada).
 * Reglas: todo se hornea una vez (cuadriculas G -> toCanvas), sin getImageData / shadowBlur / filter / degradados por cuadro. Las letras solo ACH5/7/12.
 * Sin dependencias duras: solo ACH.px (base.js). Si falta, no hace nada.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px, S = ACH.sprites;
if (!px || !px.G || !S) return;
S.lotArch = S.lotArch || {};
S.cv = S.cv || {};
ACH.cfg = ACH.cfg || {};
var G = px.G, RAMPS = px.RAMPS;
var K = '#1c1a22', SH = '#2a2440', CREAM = '#f3efe2';

/* ======================== PRIMITIVAS ======================== */
function F(g, x, y, w, h, c) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  var x1 = x + w, y1 = y + h;
  if (x < 0) x = 0; if (y < 0) y = 0; if (x1 > g.w) x1 = g.w; if (y1 > g.h) y1 = g.h;
  for (var j = y; j < y1; j++) { var o = j * g.w; for (var i = x; i < x1; i++) g.d[o + i] = c; }
}
function P(g, x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.d[y * g.w + x] = c; }
function Q(g, x, y) { x = Math.round(x); y = Math.round(y); return (x >= 0 && y >= 0 && x < g.w && y < g.h) ? g.d[y * g.w + x] : null; }
function FR(g, x, y, w, h, c) { F(g, x, y, w, 1, c); F(g, x, y + h - 1, w, 1, c); F(g, x, y, 1, h, c); F(g, x + w - 1, y, 1, h, c); }
function DISC(g, cx, cy, r, c) {
  var rr = (r + 0.4) * (r + 0.4);
  for (var dy = -r; dy <= r; dy++) { var half = Math.floor(Math.sqrt(rr - dy * dy)); F(g, cx - half, cy + dy, half * 2 + 1, 1, c); }
}
function ELL(g, cx, cy, rx, ry, c) {
  for (var dy = -ry; dy <= ry; dy++) {
    var t = 1 - (dy * dy) / ((ry + 0.4) * (ry + 0.4)); if (t < 0) continue;
    var half = Math.floor(rx * Math.sqrt(t) + 0.4); F(g, cx - half, cy + dy, half * 2 + 1, 1, c);
  }
}
function LN(g, x0, y0, x1, y1, c) { g.line(x0, y0, x1, y1, c); }
var tc = {};
function mx(a, b, t) { var k = a + b + t; return tc[k] || (tc[k] = px.mix(a, b, t)); }
function lt(c, t) { return mx(c, '#fff4d8', t === undefined ? 0.26 : t); }
function dk(c, t) { return mx(c, SH, t === undefined ? 0.34 : t); }
var rc = {};
function ramp(base) { return rc[base] || (rc[base] = [dk(base, 0.62), dk(base, 0.34), base, lt(base, 0.26), lt(base, 0.5)]); }
function AO(g, x, y, w, h, t) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  var x1 = Math.min(g.w, x + w), y1 = Math.min(g.h, y + h);
  for (var j = Math.max(0, y); j < y1; j++) for (var i = Math.max(0, x); i < x1; i++) { var c = g.d[j * g.w + i]; if (c && c.length === 7) g.d[j * g.w + i] = mx(c, SH, t); }
}
function LI(g, x, y, w, h, t) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  var x1 = Math.min(g.w, x + w), y1 = Math.min(g.h, y + h);
  for (var j = Math.max(0, y); j < y1; j++) for (var i = Math.max(0, x); i < x1; i++) { var c = g.d[j * g.w + i]; if (c && c.length === 7) g.d[j * g.w + i] = mx(c, '#fff4d8', t); }
}
function vgrad(g, x, y, w, h, cols) { for (var j = 0; j < h; j++) F(g, x, y + j, w, 1, cols[Math.min(cols.length - 1, (j / h * cols.length) | 0)]); }
function spr(g, x, y, rows, pal) {
  for (var j = 0; j < rows.length; j++) { var r = rows[j]; for (var i = 0; i < r.length; i++) { var c = pal[r.charAt(i)]; if (c) P(g, x + i, y + j, c); } }
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function pick(rnd, a) { return a[Math.floor(rnd() * a.length) % a.length]; }
function speck(g, x, y, w, h, rnd, n, cols) { for (var i = 0; i < n; i++) P(g, x + rnd() * w, y + rnd() * h, cols[(rnd() * cols.length) | 0]); }
function outline(g, c, only) {                                     // contorno de 1 px alrededor de lo pintado (solo fuera)
  var add = [], x, y;
  for (y = 0; y < g.h; y++) for (x = 0; x < g.w; x++) {
    if (g.d[y * g.w + x]) continue;
    if (Q(g, x - 1, y) || Q(g, x + 1, y) || Q(g, x, y - 1) || Q(g, x, y + 1)) add.push([x, y]);
  }
  for (var i = 0; i < add.length; i++) g.d[add[i][1] * g.w + add[i][0]] = c || K;
}
/* sombra proyectada al sureste, hecha en la propia cuadricula (sin getImageData): len = largo relativo, ay = fila base */
function castShadow(g, ay, len, col) {
  col = col || '#2a244044'; len = len || 0.45;
  var sh = Math.min(g.h - 1 - ay, Math.ceil(ay * len)), Y, x;
  for (Y = 1; Y <= sh; Y++) {
    var sy = Math.round(ay - Y / len), dx = Math.floor(Y / 2);
    if (sy < 0) break;
    for (x = g.w - 1; x >= 0; x--) {
      var c = g.d[sy * g.w + x];
      if (c && c.length === 7) { var tx = x + dx, ty = ay + Y; if (tx < g.w && !g.d[ty * g.w + tx]) g.d[ty * g.w + tx] = col; }
    }
  }
}
/* Sprite final: ax/ay/fw/fh + sombra horneada (shadowIn).  o.cast === false: sin sombra. */
function mk(g, ax, ay, fw, fh, o) {
  o = o || {};
  if (o.cast !== false) castShadow(g, ay, (o.cast && o.cast.len) || 0.42, (o.cast && o.cast.col) || null);
  var c = g.toCanvas(ax, ay, fw, fh);
  c.shadowIn = o.cast !== false;
  if (o.p) for (var k in o.p) c[k] = o.p[k];
  return c;
}

/* ======================== TEXTO ======================== */
function hasMark(s) { return /[ÁÉÍÓÚÜÑ]/.test(s); }
/* texto con soporte de Ä (la fuente no la trae: A + dos puntos) */
var AMP12 = ['..###...', '.##.##..', '.##.##..', '..###...', '.####..#', '##.###.#', '##..###.', '##..##..', '##.###..', '.####.##', '..###.##', '.....#..'];
function txtAmp(g, base, cx, y, ink, o) {                          // a12 no trae '&': se dibuja a mano entre las partes
  var parts = base.split('&'), gap = px.fonts.a12.gap, ws = parts.map(function (p) { return p ? px.measure(p, 'a12') : 0; }), tot = 0, k;
  for (k = 0; k < parts.length; k++) tot += ws[k] + (k < parts.length - 1 ? 8 + gap * 2 : 0);
  var x = (o.align === 'l') ? Math.round(cx) : Math.round(cx - tot / 2);
  for (k = 0; k < parts.length; k++) {
    if (parts[k]) px.text(g, parts[k], x, Math.round(y), { font: 'a12', ink: ink, shadow: o.shadow || null, align: 'l' });
    x += ws[k];
    if (k < parts.length - 1) { x += gap; spr(g, x, Math.round(y), AMP12, { '#': ink }); x += 8 + gap; }
  }
  return tot;
}
function txt(g, s, cx, y, font, ink, o) {
  o = o || {};
  var base = s.replace(/Ä/g, 'A');
  if (font === 'a12' && base.indexOf('&') >= 0) return txtAmp(g, base, cx, y, ink, o);
  var W0 = px.measure(base, font), x0 = Math.round(cx - W0 / 2);
  if (o.align === 'l') x0 = Math.round(cx);
  px.text(g, base, x0, Math.round(y), { font: font, ink: ink, shadow: o.shadow || null, outline: o.outline || null, align: 'l', scale: o.scale || 1 });
  var i = s.indexOf('Ä');
  while (i >= 0) {
    var pre = s.slice(0, i), ax = x0 + (pre.length ? px.measure(pre, font) + px.fonts[font].gap : 0), gw = px.measure('A', font);
    P(g, ax + (gw > 3 ? 1 : 0), y - 2, ink); P(g, ax + gw - 1 - (gw > 3 ? 1 : 0), y - 2, ink);
    i = s.indexOf('Ä', i + 1);
  }
  return W0;
}
function bold(g, s, cx, y, font, ink, o) {                          // doble trazo horizontal
  txt(g, s, cx, y, font, ink, o); txt(g, s, cx + 1, y, font, ink, { shadow: null });
}
function tw(s, font) { s = s.replace(/Ä/g, 'A'); if (font === 'a12') s = s.replace(/&/g, 'W'); return px.measure(s, font); }
/* mayor fuente que quepa en la caja; devuelve la fuente */
function fit(g, s, bx, by, bw, bh, ink, o) {
  o = o || {};
  var order = ['a12', 'a7', 'a5'], mark = hasMark(s) || /Ä/.test(s), pickF = null, i, ot = o.outline ? 2 : 0, info;
  for (i = o.max ? order.indexOf(o.max) : 0; i < 3; i++) {
    info = px.fontInfo(order[i]);
    if (tw(s, order[i]) + ot + 2 <= bw && info.h + (mark ? 2 : 0) + ot <= bh) { pickF = order[i]; break; }
  }
  if (!pickF && !o.noWrap && bh >= 11 && s.indexOf(' ') > 0) {                // dos renglones en a5
    var words = s.split(' '), best = 1, bd = 1e9, k, l1, l2;
    for (k = 1; k < words.length; k++) { l1 = words.slice(0, k).join(' '); l2 = words.slice(k).join(' '); var d = Math.abs(tw(l1, 'a5') - tw(l2, 'a5')); if (d < bd) { bd = d; best = k; } }
    l1 = words.slice(0, best).join(' '); l2 = words.slice(best).join(' ');
    if (Math.max(tw(l1, 'a5'), tw(l2, 'a5')) + 2 <= bw) {
      var m1 = hasMark(l1) || /Ä/.test(l1), m2 = hasMark(l2) || /Ä/.test(l2), top = by + ((bh - 11 - (m1 ? 2 : 0)) >> 1) + (m1 ? 2 : 0);
      (o.bold ? bold : txt)(g, l1, bx + (bw >> 1), top, 'a5', ink, o); (o.bold ? bold : txt)(g, l2, bx + (bw >> 1), top + 6 + (m2 ? 1 : 0), 'a5', ink, o);
      return 'a5x2';
    }
  }
  if (!pickF) { pickF = 'a5'; while (s.length > 1 && tw(s, 'a5') + 2 > bw) s = s.slice(0, -1); }
  info = px.fontInfo(pickF);
  var need = info.h + (mark ? 2 : 0) + ot, ty = by + ((bh - need) >> 1) + (mark ? 2 : 0) + (ot ? 1 : 0);
  (o.bold ? bold : txt)(g, s, bx + (bw >> 1) - (o.bold ? 0 : 0), ty, pickF, ink, o);
  return pickF;
}
function spaced(g, s, cx, y, font, ink, extra) {
  var f = px.fonts[font], total = px.measure(s, font) + (s.length - 1) * extra, x = Math.round(cx - total / 2);
  for (var i = 0; i < s.length; i++) {
    var ch = s.charAt(i), w = px.measure(ch, font);
    if (ch !== ' ') px.text(g, ch, x, y, { font: font, ink: ink, align: 'l' });
    x += w + f.gap + extra;
  }
}

/* ======================== MARCAS ======================== */
var NAMES = {   // [real, parodia, sub real, sub parodia]
  nike: ['NIKE', 'NAIK'], bananarepublic: ['BANANA REPUBLIC', 'BANANA REPÚBLICA'], tanta: ['TANTA', 'TANTITA'],
  mangos: ['MANGOS', 'MANGAZOS'], koasian: ['KO ASIAN', 'K.O. ASIÁTICO'], popular: ['POPULAR', 'POPULACHO'],
  bonbonniere: ['LA BONBONNIERE', 'LA BOMBONERA'], fridays: ["T.G.I. FRIDAY'S", 'T.G.I. JUEVES'],
  pardos: ['PARDOS', 'PARDOS', 'CHICKEN', 'POLLITO'], cinepolis: ['CINÉPOLIS', 'CINEPOLIZ'], hm: ['H&M', 'H&N'],
  miniso: ['MINISO', 'MINIZO'], adidas: ['ADIDAS', 'ADIDA', 'ORIGINALS', 'ORIGINALES'], starbucks: ['STARBUCKS', 'ESTARBAKS'],
  freddo: ['FREDDO', 'FREDO'], cinnabon: ['CINNABON', 'CINNABUN'], salazar: ['SALAZAR', 'SALAZAR', 'FOOD & DRINKS', 'FOOD & DRINKS'],
  haagendazs: ['HÄAGEN-DAZS', 'HÄGEN-DAZE'], masterkong: ['MASTER KONG', 'MASTER KUNG'],
  kiosco: ['KIOSCO LARCOMAR'], deportes: ['DEPORTES MALECÓN'], fuente: ['FUENTE DE SODA'], granDragon: ['CHIFA GRAN DRAGÓN']
};
var FIXED = { salazar: 1, kiosco: 1, deportes: 1, fuente: 1, granDragon: 1 };
function real() { return ACH.cfg.marcasReales !== false; }
function bget(id) {
  var n = NAMES[id]; if (!n) return null;
  var r = real() || FIXED[id];
  return { id: id, real: r, main: r ? n[0] : n[1], sub: n[2] ? (r ? n[2] : (n[3] || n[2])) : '' };
}
function brandName(id) { var b = bget(id); return b ? (b.sub ? b.main + ' ' + b.sub : b.main) : null; }

/* ======================== ICONOS Y LOGOS ======================== */
function plate(g, x, y, w, h, bg, border) {
  F(g, x, y, w, h, bg);
  if (border) FR(g, x, y, w, h, border);
  if (h >= 8 && w >= 8) { P(g, x, y, null); P(g, x + w - 1, y, null); P(g, x, y + h - 1, null); P(g, x + w - 1, y + h - 1, null); }
  F(g, x + 1, y + 1, w - 2, 1, lt(bg, 0.22));
}
function swoosh(g, x, y, c) {                                      // ~24 x 9, procedural: bulbo abajo-izquierda y cola fina arriba-derecha
  var W = 24, i, j;
  for (i = 0; i < W; i++) {
    var u = i / (W - 1), cy, th;
    if (u < 0.3) { var a = u / 0.3; cy = 1.6 + 5.2 * Math.sin(a * Math.PI / 2); th = 2.6 + 1.4 * a; }
    else { var b = (u - 0.3) / 0.7; cy = 6.8 - 6.4 * Math.pow(b, 0.72); th = 4.0 * (1 - b) + 0.6; }
    for (j = 0; j < 9; j++) if (Math.abs(j + 0.5 - cy - 0.5) <= th / 2) P(g, x + i, y + j, c);
  }
  P(g, x, y + 1, null);
}
function siren(g, cx, cy, r) {
  var GR = '#00704A', WH = '#ffffff';
  DISC(g, cx, cy, r, WH); DISC(g, cx, cy, r - 1, GR);
  if (r < 4) { DISC(g, cx, cy, 1, WH); return; }
  F(g, cx - 2, cy - 4, 1, 1, WH); F(g, cx, cy - 5, 1, 2, WH); F(g, cx + 2, cy - 4, 1, 1, WH); F(g, cx - 2, cy - 3, 5, 1, WH);        // corona
  F(g, cx - 1, cy - 2, 3, 3, WH); P(g, cx - 1, cy - 1, GR); P(g, cx + 1, cy - 1, GR);                                               // cara
  F(g, cx - 3, cy - 2, 1, 5, WH); F(g, cx + 3, cy - 2, 1, 5, WH);                                                                  // pelo
  F(g, cx - 1, cy + 1, 3, 1, WH); F(g, cx - 2, cy + 2, 2, 1, WH); F(g, cx + 1, cy + 2, 2, 1, WH); P(g, cx - 3, cy + 3, WH); P(g, cx + 3, cy + 3, WH); // cuerpo y colas
}
function trefoil(g, x, y, c, bg) {                                  // trebol Adidas Originals ~15 x 11
  var P1 = [[4, 6], [7, 3], [10, 6]], i;
  for (i = 0; i < 3; i++) DISC(g, x + P1[i][0], y + P1[i][1] - 0, 3, c);
  DISC(g, x + 7, y + 6, 3, c);
  F(g, x + 2, y + 8, 11, 3, c);
  for (i = 0; i < 3; i++) LN(g, x + 1 + i * 4, y + 11, x + 6 + i * 4, y + 2, bg);
  F(g, x, y + 8, 15, 1, bg);
  F(g, x + 1, y + 9, 13, 2, c);
}
function mango(g, x, y) {                                           // mango 11 x 9
  ELL(g, x + 5, y + 5, 5, 3, '#e8531c'); ELL(g, x + 4, y + 4, 4, 2, '#f7a81b'); P(g, x + 3, y + 3, '#f7d23a'); P(g, x + 4, y + 3, '#f7d23a');
  F(g, x + 6, y + 1, 4, 2, '#4c8c2b'); P(g, x + 9, y, '#4c8c2b'); P(g, x + 5, y + 2, '#5b3a1a');
}
function roll(g, cx, cy, r) {                                       // rollo de canela
  DISC(g, cx, cy, r, '#8a4a22'); DISC(g, cx, cy, r - 1, '#c98a4a'); DISC(g, cx, cy, Math.max(1, r - 3), '#8a4a22'); P(g, cx, cy, '#f3d49a');
  F(g, cx - 2, cy - r, 4, 1, '#f3efe2'); F(g, cx + 1, cy - r + 1, 2, 1, '#f3efe2');
}
function chefHead(g, cx, cy) {                                      // cara de chef con gorro ~ 11 x 12
  DISC(g, cx, cy - 2, 3, '#ffffff'); F(g, cx - 4, cy - 3, 9, 3, '#ffffff'); F(g, cx - 3, cy - 6, 7, 2, '#ffffff'); P(g, cx - 4, cy - 3, null); P(g, cx + 4, cy - 3, null);
  F(g, cx - 3, cy, 7, 1, '#d8d4c4');
  F(g, cx - 3, cy + 1, 7, 4, '#f2c79a'); P(g, cx - 2, cy + 2, K); P(g, cx + 2, cy + 2, K); F(g, cx - 2, cy + 4, 5, 1, '#6b3a22'); F(g, cx - 1, cy + 3, 3, 1, '#c98a62');
}
function cone(g, x, y) {                                            // cucurucho con 2 bolas 7 x 12
  F(g, x + 1, y + 6, 5, 1, '#c98a4a');
  for (var j = 0; j < 5; j++) F(g, x + 1 + (j >> 1), y + 7 + j, 5 - (j >> 1) * 2 + (j > 3 ? 0 : 0), 1, j % 2 ? '#b0702a' : '#d9a05a');
  DISC(g, x + 3, y + 5, 3, '#f7b6cf'); DISC(g, x + 3, y + 1, 2, '#f3efe2'); P(g, x + 2, y, '#ffffff');
}

var LOGO = {
  nike: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#f4f2ec', K);
    var t = tw(B.main, 'a7'), tot = 24 + 3 + t + 1, x0 = x + ((w - tot) >> 1);
    if (tot > w - 4) { swoosh(g, x + ((w - 24) >> 1), y + 2, '#1c1a22'); return; }
    swoosh(g, x0, y + ((h - 9) >> 1) + 1, '#1c1a22');
    bold(g, B.main, x0 + 27 + (t >> 1), y + ((h - 7) >> 1), 'a7', '#1c1a22');
  },
  hm: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#f4f2ec', '#b8000e');
    bold(g, B.main, x + (w >> 1) - 1, y + ((h - 12) >> 1), 'a12', '#e50010');
  },
  starbucks: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#00704A', '#0f2a22');
    var r = Math.min((h - 3) >> 1, 6), d = r * 2 + 1, t = tw(B.main, 'a7'), tot = d + 4 + t, gx = x + ((w - tot) >> 1);
    if (tot > w - 4) { gx = x + ((w - d) >> 1); siren(g, gx + r, y + (h >> 1), r); return; }
    siren(g, gx + r, y + (h >> 1), r);
    txt(g, B.main, gx + d + 4 + (t >> 1), y + ((h - 7) >> 1), 'a7', '#ffffff');
  },
  cinepolis: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#1b3a8a', '#0b1a44');
    F(g, x + 2, y + h - 3, w - 4, 1, '#e0242b');
    var f = tw(B.main, 'a7') + 4 <= w - 8 ? 'a7' : 'a5';
    txt(g, B.main, x + (w >> 1), y + 3 + (f === 'a7' ? 1 : 2), f, '#ffffff', { shadow: '#0b1a44' });
  },
  pardos: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#a31f1a', '#4a0e0c');
    var t = tw(B.main, 'a7'), t2 = tw(B.sub, 'a5'), ww = Math.max(t, t2), ic = 11, tot = ww + 4 + ic, x0 = x + ((w - tot) >> 1);
    if (tot <= w - 4) {
      ELL(g, x0 + 5, y + 8, 4, 3, '#f0c040'); F(g, x0 + 7, y + 4, 3, 3, '#f0c040'); F(g, x0 + 8, y + 3, 2, 1, '#e0242b'); P(g, x0 + 10, y + 5, '#e8731a'); F(g, x0 + 1, y + 6, 2, 3, '#c98a2a'); P(g, x0 + 8, y + 5, K);
      x0 += ic + 4;
    } else x0 = x + ((w - ww) >> 1);
    txt(g, B.main, x0 + (ww >> 1), y + 2, 'a7', '#f3efe2', { shadow: '#4a0e0c' });
    txt(g, B.sub, x0 + (ww >> 1), y + 10 - 1, 'a5', '#f0c040');
  },
  fridays: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#ffffff', '#7a1018');
    for (var i = 1; i < w - 1; i += 6) F(g, x + i, y + 1, 3, h - 2, '#d9202c');
    var t = tw(B.main, 'a5') + 8, bw = Math.min(w - 6, t), bx = x + ((w - bw) >> 1);
    F(g, bx, y + 3, bw, h - 6, '#17171c'); FR(g, bx, y + 3, bw, h - 6, '#ffffff'); P(g, bx, y + 3, '#d9202c'); P(g, bx + bw - 1, y + 3, '#d9202c');
    fit(g, B.main, bx + 1, y + 3, bw - 2, h - 6, '#ffffff', { max: 'a5' });
  },
  haagendazs: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#6b1f2a', '#2a0a10');
    F(g, x + 2, y + 2, w - 4, 1, '#d6b46a'); F(g, x + 2, y + h - 3, w - 4, 1, '#d6b46a');
    var f = tw(B.main, 'a7') + 4 <= w - 6 ? 'a7' : 'a5';
    txt(g, B.main, x + (w >> 1), y + (f === 'a7' ? 5 : 6) + 1, f, '#f3e9d2');
  },
  tanta: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#f3e4c2', '#8a3a1a');
    fit(g, B.main, x + 3, y + 1, w - 6, h - 3, '#d1441c', { bold: true });
    F(g, x + 4, y + h - 3, w - 8, 1, '#e8a33a');
  },
  mangos: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#f7a81b', '#7a4a0a');
    var f = 'a7', t = tw(B.main, 'a7'); if (t + 14 > w - 4) f = 'a5'; t = tw(B.main, f);
    var tot = t + 14, x0 = x + ((w - tot) >> 1);
    mango(g, x0, y + ((h - 9) >> 1));
    txt(g, B.main, x0 + 14 + (t >> 1), y + ((h - (f === 'a7' ? 7 : 5)) >> 1), f, '#2b4a14', { shadow: '#ffd36a' });
  },
  koasian: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#1f1f26', '#0a0a0e');
    var bd = real() ? 'KO' : 'K.O.', t = tw(bd, 'a5');
    DISC(g, x + 8, y + (h >> 1), 5, '#d9202c'); txt(g, bd, x + 8, y + (h >> 1) - 2, 'a5', '#ffffff');
    fit(g, B.main.replace(/^K\.?O\.? ?/, ''), x + 15, y + 1, w - 18, h - 2, '#f3efe2', { max: 'a7' });
  },
  popular: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#1f6f6b', '#0e3a38');
    for (var i = 0; i < w - 2; i += 2) { P(g, x + 1 + i, y + 1, '#f3efe2'); P(g, x + 2 + i, y + h - 2, '#f3efe2'); }
    fit(g, B.main, x + 3, y + 2, w - 6, h - 4, '#f3efe2', { shadow: '#0e3a38' });
  },
  bonbonniere: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#f6c7d4', '#8a2f4a');
    var iw = 9, t = tw(B.main, 'a5'), f = 'a7'; if (tw(B.main, 'a7') + iw + 8 > w) f = 'a5'; t = tw(B.main, f);
    var x0 = x + ((w - (t + iw + 3)) >> 1);
    P(g, x0 + 1, y + 5, '#d9202c'); P(g, x0 + 3, y + 5, '#d9202c'); F(g, x0, y + 6, 5, 1, '#d9202c'); F(g, x0 + 1, y + 7, 3, 1, '#d9202c'); P(g, x0 + 2, y + 8, '#d9202c');
    F(g, x0 + 5, y + 6, 4, 4, '#f3efe2'); F(g, x0 + 5, y + 6, 4, 1, '#c98a4a'); F(g, x0 + 5, y + 8, 4, 1, '#c98a4a');
    txt(g, B.main, x0 + iw + 3 + (t >> 1), y + ((h - (f === 'a7' ? 7 : 5)) >> 1) + (hasMark(B.main) ? 1 : 0), f, '#8a2f4a');
  },
  bananarepublic: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#17171c', '#000000');
    F(g, x + 3, y + 2, w - 6, 1, '#c8b692'); F(g, x + 3, y + h - 3, w - 6, 1, '#c8b692');
    fit(g, B.main, x + 3, y + 3, w - 6, h - 6, '#e6dcc0', { max: 'a7' });
  },
  miniso: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#e60012', '#7a0008');
    var t = tw(B.main, 'a12') + 1, ic = 9, tot = t + ic + 3, x0 = x + ((w - tot) >> 1);
    if (tot > w - 4) { fit(g, B.main, x + 2, y + 1, w - 4, h - 2, '#ffffff'); return; }
    F(g, x0, y + ((h - 9) >> 1), 9, 9, '#ffffff'); P(g, x0, y + ((h - 9) >> 1), null); P(g, x0 + 8, y + ((h - 9) >> 1), null);
    F(g, x0 + 2, y + ((h - 9) >> 1) + 3, 1, 2, '#e60012'); F(g, x0 + 6, y + ((h - 9) >> 1) + 3, 1, 2, '#e60012'); F(g, x0 + 3, y + ((h - 9) >> 1) + 6, 3, 1, '#e60012');
    bold(g, B.main, x0 + ic + 3 + (t >> 1) - 1, y + ((h - 12) >> 1), 'a12', '#ffffff');
  },
  adidas: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#17171c', '#000000');
    var t = Math.max(tw(B.main, 'a7'), tw(B.sub, 'a5')), tot = 15 + 4 + t, x0 = x + ((w - tot) >> 1);
    if (tot > w - 4) { x0 = x + 2; }
    trefoil(g, x0, y + ((h - 11) >> 1), '#ffffff', '#17171c');
    txt(g, B.main, x0 + 19 + (t >> 1), y + 2, 'a7', '#ffffff'); txt(g, B.sub, x0 + 19 + (t >> 1), y + 9, 'a5', '#cfcabd');
  },
  freddo: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#2b6bc8', '#0f2e6a');
    var t = tw(B.main, 'a12') + 1, tot = t + 9, x0 = x + ((w - tot) >> 1);
    if (tot > w - 4) { fit(g, B.main, x + 2, y + 1, w - 4, h - 2, '#ffffff', { bold: true }); return; }
    cone(g, x0, y + 1);
    bold(g, B.main, x0 + 9 + (t >> 1) - 1, y + ((h - 12) >> 1), 'a12', '#ffffff');
  },
  cinnabon: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#d42a2b', '#6a0e10');
    var t = tw(B.main, 'a7'), tot = t + 13, x0 = x + ((w - tot) >> 1);
    roll(g, x0 + 5, y + (h >> 1), 5);
    txt(g, B.main, x0 + 13 + (t >> 1), y + ((h - 7) >> 1), 'a7', '#f3efe2', { shadow: '#6a0e10' });
  },
  masterkong: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#d81e06', '#5a0a02');
    var f = 'a7', t = tw(B.main, 'a7'), tot = t + 14, x0 = x + ((w - tot) >> 1);
    if (tot > w - 4) { f = 'a5'; t = tw(B.main, 'a5'); tot = t + 14; x0 = x + ((w - tot) >> 1); }
    DISC(g, x0 + 5, y + (h >> 1), 6, '#f3efe2'); chefHead(g, x0 + 5, y + (h >> 1) - 1);
    txt(g, B.main, x0 + 14 + (t >> 1), y + ((h - (f === 'a7' ? 7 : 5)) >> 1) - 1, f, '#ffffff', { shadow: '#5a0a02' });
    F(g, x0 + 14, y + h - 4, t, 1, '#f2c200');
  },
  salazar: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#25232b', '#0a090c');
    var t = tw(B.main, 'a7');
    txt(g, B.main, x + (w >> 1), y + 2, 'a7', '#ff8f7a', { shadow: '#7a2a2a' });
    txt(g, B.sub, x + (w >> 1), y + 10, 'a5', '#9fe0e0');
  },
  kiosco: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#1f5a66', '#0a2a32');
    fit(g, B.main, x + 3, y + 2, w - 6, h - 4, '#f3efe2', { shadow: '#0a2a32' });
  },
  deportes: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#2a7d3f', '#0f3a1c');
    var iw = 9; DISC(g, x + 7, y + (h >> 1), 4, '#f3efe2'); P(g, x + 6, y + (h >> 1) - 1, K); P(g, x + 8, y + (h >> 1), K); P(g, x + 7, y + (h >> 1) + 2, K); P(g, x + 5, y + (h >> 1) + 1, K);
    fit(g, B.main, x + 14, y + 2, w - 17, h - 4, '#ffffff', { shadow: '#0f3a1c', max: 'a7' });
  },
  fuente: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#7fd3c0', '#1f6a5a');
    F(g, x + 2, y + 2, w - 4, 1, '#f3efe2'); F(g, x + 2, y + h - 3, w - 4, 1, '#f3efe2');
    fit(g, B.main, x + 3, y + 3, w - 6, h - 6, '#c4366a', { shadow: '#f3efe2', max: 'a7' });
  },
  granDragon: function (g, x, y, w, h, B) {
    F(g, x, y, w, h, '#6a0c0e');
    var i = B.main.indexOf(' '), l1 = i > 0 ? B.main.slice(0, i) : '', l2 = i > 0 ? B.main.slice(i + 1) : B.main;
    if (h >= 15 && l1) {
      spaced(g, l1, x + (w >> 1), y + 1, 'a5', GOLD[3], 2);
      txt(g, l2, x + (w >> 1), y + 9, 'a7', '#f6d255', { shadow: '#2a0204' });
      F(g, x + 3, y + 7, 6, 1, GOLD[1]); F(g, x + w - 9, y + 7, 6, 1, GOLD[1]);
    } else fit(g, B.main, x + 2, y + 1, w - 4, h - 2, '#f6d255', { shadow: '#2a0204', max: 'a7' });
  }
};

/* ======================== FACHADAS DE TIENDA ======================== */
var GLS = RAMPS.glass, MT = RAMPS.metal, WD = RAMPS.wood;
var WARM = ['#2a2024', '#3a2a28', '#54382c', '#7a4e30', '#a8693a'];
var COOL = ['#34444a', '#4c6268', '#6f8a88', '#9db4a8', '#c9d6c4'];
var BRIGHT = ['#cfd8d8', '#dfe5e2', '#ecefe8'];
var FH = 64;

function shoe(g, x, y, c, sole) {                                  // zapatilla 6 x 4 de perfil
  F(g, x, y + 1, 6, 2, c); F(g, x, y, 3, 1, c); P(g, x + 1, y + 1, lt(c, 0.4)); F(g, x, y + 3, 6, 1, sole || '#f3efe2'); P(g, x + 5, y + 1, null);
}
function mannequin(g, x, y, c, dress) {                             // maniqui 7 x 24 (y = cabeza arriba)
  DISC(g, x + 3, y + 2, 2, '#d8c9ae'); F(g, x + 3, y + 4, 1, 2, '#bdb29a');
  F(g, x, y + 6, 7, dress ? 6 : 8, c); F(g, x, y + 6, 7, 1, lt(c, 0.3)); F(g, x + 6, y + 6, 1, dress ? 6 : 8, dk(c, 0.3));
  if (dress) { F(g, x - 1, y + 12, 9, 7, c); F(g, x + 7, y + 12, 1, 7, dk(c, 0.3)); F(g, x - 1, y + 18, 9, 1, dk(c, 0.3)); }
  else { F(g, x + 1, y + 14, 2, 9, dk(c, 0.2)); F(g, x + 4, y + 14, 2, 9, dk(c, 0.45)); }
  F(g, x + 3, y + 19, 1, 5, '#6a6a72'); F(g, x + 1, y + 23, 5, 1, '#6a6a72');
}
function rack(g, x, y, w, cols, r) {                                // percha con ropa colgada
  F(g, x, y, w, 1, '#8c8a93');
  for (var i = 2; i < w - 2; i += 3) { var cc = cols[(r() * cols.length) | 0]; F(g, x + i, y + 1, 2, 7 + ((r() * 3) | 0), cc); P(g, x + i, y + 1, lt(cc, 0.3)); }
}
function shelfBoxes(g, x, y, w, rows, cols, r, bh) {
  for (var j = 0; j < rows; j++) {
    var sy = y + j * (bh + 2); F(g, x, sy + bh, w, 1, '#9a9aa2');
    for (var i = 0; i < w - 4; i += 4) { var hh = bh - ((r() * 2) | 0); F(g, x + 1 + i, sy + bh - hh, 3, hh, cols[(r() * cols.length) | 0]); }
  }
}
function table(g, x, y, w, topc) {                                  // mesa de restaurante vista de frente
  F(g, x, y, w, 2, topc); F(g, x, y, w, 1, lt(topc, 0.3)); F(g, x + (w >> 1), y + 2, 1, 6, '#3a3844'); F(g, x + (w >> 1) - 2, y + 8, 5, 1, '#3a3844');
}
function chair(g, x, y, c) { F(g, x, y, 1, 5, c); F(g, x + 3, y + 3, 1, 3, c); F(g, x, y + 3, 4, 1, c); }
function person(g, x, y, c, hair) {                                 // comensal 5 x 8
  F(g, x, y + 3, 5, 5, c); F(g, x + 1, y, 3, 3, '#d8a47a'); F(g, x + 1, y, 3, 1, hair || '#2a1a18'); F(g, x, y + 3, 5, 1, lt(c, 0.3));
}
function lampPend(g, x, y, len, c) { F(g, x, y, 1, len, '#2a2024'); F(g, x - 2, y + len, 5, 2, c || '#ffcf8a'); F(g, x - 1, y + len + 2, 3, 1, '#fff0c0'); }

/* interiores de vitrina: (g, x, y, w, h = vidrio, r = rng, sp) */
var INT = {
  nike: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#eef0ea', '#e0e2da', '#cfd2c8']);
    var i, j; for (j = 0; j < 2; j++) { var sy = y + 5 + j * 10; F(g, x + 2, sy + 7, w - 4, 1, '#9a9aa2'); for (i = 0; i + 8 < w - 18; i += 8) shoe(g, x + 4 + i, sy + 3, pick(r, ['#e0242b', '#1c1a22', '#2f7a50', '#f2c230', '#3f72b0', '#f3efe2']), pick(r, ['#f3efe2', '#1c1a22'])); }
    F(g, x + 2, y + h - 8, w - 4, 7, '#17171c'); swoosh(g, x + (w >> 1) - 12, y + h - 9, '#f3efe2');
    if (w > 40) mannequin(g, x + w - 14, y + h - 30, '#1c1a22', false);
  },
  adidas: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#2a2a32', '#1a1a20', '#101014']);
    var i, j; for (j = 0; j < 2; j++) { var sy = y + 5 + j * 10; F(g, x + 2, sy + 7, w - 4, 1, '#5a5a66'); for (i = 0; i + 8 < w - 18; i += 8) { shoe(g, x + 4 + i, sy + 3, '#f3efe2', '#d8d4c4'); F(g, x + 6 + i, sy + 2, 1, 2, '#17171c'); F(g, x + 8 + i, sy + 2, 1, 2, '#17171c'); } }
    F(g, x + 2, y + h - 3, w - 4, 3, '#33333c'); F(g, x + 3, y + h - 12, 3, 9, '#f3efe2'); F(g, x + 7, y + h - 12, 3, 9, '#f3efe2');
    if (w > 40) mannequin(g, x + w - 14, y + h - 30, '#17171c', false), F(g, x + w - 14, y + h - 24, 7, 1, '#f3efe2');
  },
  ropa: function (g, x, y, w, h, r, sp) {
    vgrad(g, x, y, w, h, sp && sp.dark ? ['#3a3a40', '#2a2a30', '#202026'] : ['#e8e4da', '#d8d4c8', '#c8c4b8']);
    var cols = (sp && sp.cols) || ['#d98a9e', '#4a6498', '#e6c85a', '#8f3a32', '#2f7a50', '#f3efe2'];
    F(g, x + 2, y + h - 3, w - 4, 3, sp && sp.dark ? '#17171c' : '#8a8a90');
    for (var i = 5; i + 7 < w - 3; i += 14) mannequin(g, x + i, y + h - 27, cols[(r() * cols.length) | 0], r() < 0.4);
    rack(g, x + 2, y + 4, Math.min(w - 4, 22), cols, r);
  },
  hm: function (g, x, y, w, h, r) {
    INT.ropa(g, x, y, w, h, r, { cols: ['#e50010', '#17171c', '#f3efe2', '#4a6498', '#d98a9e', '#e6c85a'] });
    F(g, x + 2, y + 2, w - 4, 3, '#e50010');
  },
  banana: function (g, x, y, w, h, r) {
    INT.ropa(g, x, y, w, h, r, { dark: true, cols: ['#c8b692', '#a8956e', '#e6dcc0', '#3a4a3a', '#8a6a4a'] });
    F(g, x + 2, y + 2, w - 4, 2, '#c8b692');
  },
  miniso: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#fafaf6', '#f0f0ea', '#e6e6de']);
    shelfBoxes(g, x + 2, y + 3, w - 4, 3, ['#e60012', '#f7b6cf', '#9fd8c8', '#f6d27a', '#a8c4e0', '#c9a0e0', '#f3efe2'], r, 7);
    for (var i = 6; i < w - 12; i += 12) { DISC(g, x + i, y + h - 6, 3, pick(r, ['#f7b6cf', '#f6d27a', '#c9a0e0'])); P(g, x + i - 1, y + h - 7, K); P(g, x + i + 1, y + h - 7, K); }
    F(g, x + 2, y + h - 3, w - 4, 3, '#e60012');
  },
  starbucks: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#3a2a22', '#4a342a', '#5a4030']);
    var i; for (i = 8; i < w - 6; i += 14) lampPend(g, x + i, y, 4, '#ffcf8a');
    F(g, x + 2, y + h - 10, w - 4, 10, '#2a1a14'); F(g, x + 2, y + h - 10, w - 4, 2, '#c99458'); F(g, x + 2, y + h - 10, w - 4, 1, '#e6c08a');
    for (i = 6; i < w - 10; i += 9) { F(g, x + i, y + h - 14, 3, 4, '#f3efe2'); P(g, x + i + 3, y + h - 13, '#8a5a38'); }
    F(g, x + w - 22, y + 4, 18, 9, '#1e3932'); for (i = 0; i < 3; i++) F(g, x + w - 20, y + 6 + i * 2, 8 + i * 2, 1, '#cfd8c8');
    var bx = x + (w >> 1) - 2; DISC(g, bx + 1, y + h - 20, 2, '#d8a47a'); F(g, bx - 2, y + h - 18, 6, 8, '#00704A');
  },
  cafe: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, WARM);
    var i; for (i = 7; i < w - 6; i += 13) lampPend(g, x + i, y, 5, '#ffcf8a');
    F(g, x + 2, y + h - 9, w - 4, 9, '#3a2a22'); F(g, x + 2, y + h - 9, w - 4, 2, '#c99458');
    for (i = 6; i < w - 8; i += 8) { F(g, x + i, y + h - 12, 2, 3, CREAM); P(g, x + i + 2, y + h - 11, '#8a5a38'); }
  },
  roll: function (g, x, y, w, h, r) {
    INT.cafe(g, x, y, w, h, r);
    for (var i = 8; i < w - 8; i += 11) { roll(g, x + i, y + h - 15, 3); }
    F(g, x + 3, y + 3, w - 6, 5, '#d42a2b'); for (var k = 5; k < w - 10; k += 6) F(g, x + k, y + 5, 3, 1, '#f3efe2');
  },
  helado: function (g, x, y, w, h, r, sp) {
    var c = (sp && sp.tub) || ['#f7b6cf', '#f3efe2', '#9fd8c8', '#f6d27a', '#c9a0e0', '#e08a6a'];
    vgrad(g, x, y, w, h, (sp && sp.bg) || COOL);
    F(g, x + 2, y + h - 13, w - 4, 13, '#dfe3dc'); F(g, x + 2, y + h - 13, w - 4, 2, '#ffffff'); F(g, x + 2, y + h - 4, w - 4, 4, '#8fb0b8');
    for (var i = 4; i + 6 < w - 4; i += 8) { DISC(g, x + i + 3, y + h - 14, 3, c[(r() * c.length) | 0]); F(g, x + i, y + h - 12, 7, 6, c[(r() * c.length) | 0]); }
    F(g, x + 3, y + 3, w - 6, 5, (sp && sp.board) || '#f7b6cf'); for (i = 4; i < w - 8; i += 5) P(g, x + i, y + 5, CREAM);
  },
  haagen: function (g, x, y, w, h, r) {
    INT.helado(g, x, y, w, h, r, { bg: ['#3a1218', '#4a1a22', '#5a2430'], board: '#6b1f2a', tub: ['#f3e9d2', '#8a4a2a', '#d6b46a', '#7a2a3a', '#f3efe2', '#c98a4a'] });
    F(g, x + 3, y + 4, w - 6, 1, '#d6b46a');
  },
  pollo: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#3a2018', '#4a2a1c', '#5a3420']);
    F(g, x + 4, y + 6, w - 8, 15, '#4a4a52'); F(g, x + 4, y + 6, w - 8, 1, '#8c8a93'); F(g, x + 5, y + 8, w - 10, 11, '#2a1810'); F(g, x + 6, y + 15, w - 12, 3, '#ff8a2a'); F(g, x + 7, y + 17, w - 14, 1, '#f2e63c');
    for (var i = 8; i + 6 <= w - 8; i += 8) { ELL(g, x + i + 3, y + 12, 3, 2, '#c9863a'); P(g, x + i + 2, y + 11, '#e6b060'); P(g, x + i + 4, y + 13, '#8a4b24'); }
    F(g, x + 2, y + h - 5, w - 4, 5, '#2b2b2b'); F(g, x + 2, y + h - 5, w - 4, 1, '#b0302a');
  },
  terraza: function (g, x, y, w, h, r, sp) {                         // restaurante abierto: mesas, gente, lamparas
    vgrad(g, x, y, w, h, (sp && sp.bg) || ['#6a4a32', '#7a5636', '#8a6240']);
    var i; for (i = 8; i < w - 6; i += 12) lampPend(g, x + i, y, 3 + ((r() * 3) | 0), '#ffcf8a');
    F(g, x, y + h - 6, w, 6, WD[1]); for (i = 0; i < w; i += 5) F(g, x + i, y + h - 6, 1, 6, WD[0]);
    for (i = 5; i + 12 < w - 2; i += 17) {
      chair(g, x + i - 3, y + h - 15, '#3a2a22'); person(g, x + i - 2, y + h - 19, pick(r, ['#d98a9e', '#4a6498', '#e6c85a', '#f3efe2', '#3f8f7a']));
      chair(g, x + i + 11, y + h - 15, '#3a2a22'); if (r() < 0.6) person(g, x + i + 10, y + h - 19, pick(r, ['#8f3a32', '#2f7a50', '#c9a66b']));
      table(g, x + i, y + h - 13, 11, '#e6dcc0');
    }
  },
  asian: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#3a0e0e', '#4a1412', '#5a1c16']);
    var i; for (i = 7; i < w - 6; i += 12) { F(g, x + i, y, 1, 3, '#e6c85a'); F(g, x + i - 3, y + 3, 7, 6, '#c0261c'); F(g, x + i - 2, y + 4, 2, 4, '#e8604a'); F(g, x + i - 1, y + 9, 3, 2, '#e6c85a'); }
    for (i = 5; i + 12 < w - 3; i += 17) { F(g, x + i, y + h - 9, 12, 3, CREAM); F(g, x + i + 5, y + h - 6, 2, 6, '#6b4223'); F(g, x + i + 1, y + h - 12, 3, 3, '#e6c85a'); F(g, x + i + 7, y + h - 12, 3, 3, '#1F862C'); }
    F(g, x + 2, y + h - 3, w - 4, 3, '#2a0a0a');
  },
  vapor: function (g, x, y, w, h, r) {
    INT.asian(g, x, y, w, h, r);
    for (var i = 6; i + 8 < w - 3; i += 13) { F(g, x + i, y + h - 18, 9, 3, '#d8b070'); F(g, x + i, y + h - 15, 9, 3, '#c99458'); F(g, x + i + 1, y + h - 21, 7, 3, '#e6c08a'); P(g, x + i + 3, y + h - 24, '#f3efe2'); P(g, x + i + 5, y + h - 26, '#f3efe2'); }
  },
  fridays: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#3a0e12', '#4a1418', '#5a1c20']);
    var i; for (i = 3; i < w - 3; i += 8) { F(g, x + i, y + 1, 4, 5, i % 16 < 8 ? '#d9202c' : '#f3efe2'); }
    for (i = 5; i + 12 < w - 2; i += 17) { table(g, x + i, y + h - 13, 11, '#f3efe2'); person(g, x + i - 2, y + h - 19, pick(r, ['#d98a9e', '#4a6498', '#e6c85a'])); chair(g, x + i - 3, y + h - 15, '#17171c'); chair(g, x + i + 11, y + h - 15, '#17171c'); }
    F(g, x, y + h - 6, w, 6, '#17171c'); for (i = 0; i < w; i += 6) F(g, x + i, y + h - 6, 3, 6, '#f3efe2');
  },
  bonbon: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#f3dbe0', '#f6e6e0', '#f2d6dc']);
    var i; F(g, x + 2, y + h - 12, w - 4, 12, '#fff8f0'); F(g, x + 2, y + h - 12, w - 4, 1, '#e6a0b4'); F(g, x + 2, y + h - 3, w - 4, 3, '#e6a0b4');
    for (i = 4; i + 5 < w - 4; i += 7) { var cc = pick(r, ['#f7b6cf', '#c98a4a', '#f3efe2', '#9fd8c8', '#d9202c']); DISC(g, x + i + 2, y + h - 15, 3, cc); F(g, x + i - 1, y + h - 13, 7, 3, cc); P(g, x + i + 2, y + h - 18, '#d9202c'); }
    F(g, x + 3, y + 3, w - 6, 6, '#fff8f0'); for (i = 4; i < w - 8; i += 6) { F(g, x + i, y + 4, 3, 3, pick(r, ['#f7b6cf', '#f6d27a', '#9fd8c8'])); }
  },
  deportes: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#dfe8dc', '#cfdccb', '#bccdb8']);
    var i; for (i = 4; i + 7 < w - 24; i += 10) { DISC(g, x + i + 3, y + h - 6, 3, pick(r, ['#f3efe2', '#e0242b', '#f2c230', '#2f72b0'])); P(g, x + i + 2, y + h - 7, K); P(g, x + i + 3, y + h - 5, K); }
    rack(g, x + 2, y + 4, w - 28, ['#2a7d3f', '#e0242b', '#f2c230', '#3f72b0', '#f3efe2'], r);
    F(g, x + w - 22, y + 6, 18, 12, '#2a7d3f'); F(g, x + w - 22, y + 6, 18, 1, '#6abf7a'); DISC(g, x + w - 13, y + 12, 3, '#f3efe2');
    F(g, x + 2, y + h - 3, w - 4, 3, '#8a8a90');
  },
  fuente: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#fbe4ec', '#f6d4e0', '#f0c6d6']);
    F(g, x + 2, y + h - 10, w - 4, 10, '#f3efe2'); F(g, x + 2, y + h - 10, w - 4, 2, '#7fd3c0'); F(g, x + 2, y + h - 3, w - 4, 3, '#c4366a');
    var i; for (i = 5; i + 4 < w - 6; i += 8) { F(g, x + i, y + h - 20, 1, 10, '#8a8a90'); DISC(g, x + i, y + h - 21, 2, '#c4366a'); P(g, x + i, y + h - 22, '#f3efe2'); }
    F(g, x + 3, y + 3, w - 6, 8, '#fff8f0'); for (i = 4; i < w - 8; i += 7) { F(g, x + i, y + 5, 4, 5, pick(r, ['#c4366a', '#7fd3c0', '#f6d27a'])); P(g, x + i + 1, y + 4, '#f3efe2'); }
  },
  kiosco: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, WARM);
    var i, j; for (j = 0; j < 2; j++) for (i = 3; i + 5 < w - 3; i += 6) { F(g, x + i, y + 3 + j * 9, 5, 7, pick(r, ['#e0242b', '#f2c230', '#3f72b0', '#2f7a50', '#f3efe2', '#d98a9e'])); F(g, x + i, y + 3 + j * 9, 5, 1, '#fff4d8'); }
    F(g, x + 2, y + h - 8, w - 4, 8, '#6b4223'); F(g, x + 2, y + h - 8, w - 4, 2, '#c99458');
    for (i = 5; i + 3 < w - 5; i += 8) { F(g, x + i, y + h - 12, 3, 4, pick(r, ['#f2c230', '#e0242b', '#2f7a50'])); }
  }
};

/* ======================== ESPECIFICACIONES POR MARCA ======================== */
/* wall = color base de la pared; band = color del cintillo del letrero; frame = marco de vidrio; awn = toldo; shop = interior; pw = ancho del letrero
   noDoor = vano corrido (quiosco abierto); open = sin reflejos (terraza); doorW; extra(c) = adornos; dark = vidrio oscuro */
var SPEC = {
  nike:  { wall: '#e8e5da', band: '#e8e5da', frame: '#c9c6bc', shop: 'nike', pw: 68, glass: 'bright' },
  adidas: { wall: '#2a2a32', band: '#2a2a32', frame: '#17171c', shop: 'adidas', pw: 74, dark: true },
  bananarepublic: { wall: '#c4b490', band: '#23232a', frame: '#2a2a30', shop: 'banana', pw: 100, dark: true },
  hm: { wall: '#f1eee6', band: '#f1eee6', frame: '#d7d3c8', shop: 'hm', pw: 54, glass: 'bright' },
  miniso: { wall: '#f3f1ea', band: '#e60012', frame: '#d7d3c8', shop: 'miniso', pw: 72, glass: 'bright' },
  starbucks: { wall: '#2e5a48', band: '#1e3932', frame: '#2a2a2a', shop: 'starbucks', pw: 78, awn: { cols: ['#00704A', '#0f4a36'], kind: 'solid' } },
  freddo: { wall: '#cfe0ea', band: '#2b6bc8', frame: '#f3efe2', shop: 'helado', pw: 72, awn: { cols: ['#2b6bc8', '#f3efe2'], kind: 'stripe' }, glass: 'bright' },
  cinnabon: { wall: '#f1e0c8', band: '#d42a2b', frame: '#f3efe2', shop: 'roll', pw: 82, noDoor: true, awn: { cols: ['#d42a2b', '#f3efe2'], kind: 'stripe' } },
  haagendazs: { wall: '#5a1a24', band: '#4a1018', frame: '#d6b46a', shop: 'haagen', pw: 88, awn: { cols: ['#6b1f2a', '#d6b46a'], kind: 'stripe' } },
  tanta: { wall: '#c9a066', band: '#8a4a22', frame: '#6b4223', shop: 'terraza', pw: 62, open: true, wood: true },
  mangos: { wall: '#d9a24a', band: '#7a4a1a', frame: '#6b4223', shop: 'terraza', pw: 80, open: true, wood: true, bg: ['#5a4a1a', '#6a5a22', '#7a6a2a'], awn: { cols: ['#f7a81b', '#4c8c2b'], kind: 'stripe' } },
  koasian: { wall: '#3a3238', band: '#1f1f26', frame: '#8a1a16', shop: 'asian', pw: 84, dark: true },
  popular: { wall: '#bfd8cf', band: '#1f6f6b', frame: '#f3efe2', shop: 'cafe', pw: 74, awn: { cols: ['#1f6f6b', '#f3efe2'], kind: 'stripe' } },
  bonbonniere: { wall: '#f6dde4', band: '#f6c7d4', frame: '#fff8f0', shop: 'bonbon', pw: 100, awn: { cols: ['#f7b6cf', '#f3efe2'], kind: 'stripe' }, glass: 'bright' },
  fridays: { wall: '#f1eee6', band: '#d9202c', frame: '#17171c', shop: 'fridays', pw: 88, awn: { cols: ['#d9202c', '#f3efe2'], kind: 'stripe' } },
  pardos: { wall: '#d9b88a', band: '#7a2b1c', frame: '#4a2a1c', shop: 'pollo', pw: 70, awn: { cols: ['#a31f1a', '#f0c040'], kind: 'stripe' } },
  masterkong: { wall: '#7a1a12', band: '#a8180a', frame: '#f2c200', shop: 'vapor', pw: 84, dark: true },
  kiosco: { wall: '#9a7a52', band: '#6b4a2a', frame: '#c99458', shop: 'kiosco', pw: 76, noDoor: true, awn: { cols: ['#3f72b0', '#f3efe2'], kind: 'stripe' } },
  deportes: { wall: '#cfd8c4', band: '#2a7d3f', frame: '#f3efe2', shop: 'deportes', pw: 90, glass: 'bright' },
  fuente: { wall: '#f6d4e0', band: '#7fd3c0', frame: '#f3efe2', shop: 'fuente', pw: 72, noDoor: true, awn: { cols: ['#c4366a', '#f3efe2'], kind: 'stripe' } }
};

function awning(g, x, y, w, cols, kind) {                          // toldo 8 px inclinado + volado con festones de 3 px
  var i, j;
  for (i = 0; i < w; i++) {
    var s = kind === 'solid' ? 0 : (((i / 5) | 0) & 1), col = cols[s], hi = lt(col, 0.18), lo = dk(col, 0.28);
    for (j = 0; j < 8; j++) P(g, x + i, y + j, j < 2 ? hi : (j > 6 ? lo : col));
    var vh = (i % 5 === 2 && kind !== 'solid') ? 4 : 3;
    for (j = 0; j < vh; j++) P(g, x + i, y + 8 + j, j === vh - 1 ? lo : col);
  }
  AO(g, x, y + 12, w, 3, 0.35);
}

function seedOf(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) + 1; }

function glint(g, x, y, n, gl, t) {                                  // destello diagonal corto: solo aclara lo que ya hay
  for (var i = 0; i < n; i++) { var cc = Q(g, x + i, y - i); if (cc && cc.length === 7) P(g, x + i, y - i, mx(cc, gl, t)); cc = Q(g, x + i + 1, y - i); if (cc && cc.length === 7) P(g, x + i + 1, y - i, mx(cc, gl, t * 0.6)); }
}
function glassRect(g, gx, gy, gw, gh, sp, kind, r) {
  var glassTone = sp.glass === 'bright';
  F(g, gx, gy, gw, gh, '#241c22');
  var f = INT[kind]; if (f) f(g, gx, gy, gw, gh, r, sp);
  // reflejos del vidrio azulado
  var gl = glassTone ? '#ffffff' : lt(GLS[3], 0.2);
  if (!sp.open) { glint(g, gx + 4, gy + 11, 6, gl, 0.2); glint(g, gx + 9, gy + 11, 4, gl, 0.12); if (gw > 30) glint(g, gx + gw - 11, gy + 13, 6, gl, 0.16); }
  AO(g, gx, gy, gw, 2, 0.4); AO(g, gx, gy, 1, gh, 0.25);
}

function buildShop(brand, wTiles) {
  var sp = SPEC[brand], B = bget(brand), W = wTiles * 16, H = FH, g = new G(W, H), r = px.rng(seedOf(brand) + W * 7), lights = [], i;
  var A = ramp(sp.wall);
  F(g, 0, 0, W, H, A[2]); speck(g, 0, 0, W, H, r, W * H / 34, [A[1], A[3]]);
  F(g, 0, 0, 3, H, A[3]); F(g, 0, 0, 1, H, A[4]); F(g, W - 3, 0, 3, H, A[1]);
  // cintillo del letrero
  var band = sp.band;
  F(g, 0, 0, W, 16, band); F(g, 0, 0, W, 1, lt(band, 0.3)); F(g, 0, 15, W, 1, dk(band, 0.45)); F(g, 3, 0, 1, 16, dk(band, 0.2)); F(g, 1, 0, 2, 16, lt(band, 0.12));
  var pw = Math.min(W - 8, sp.pw || 88), px0 = (W - pw) >> 1, f = LOGO[brand];
  if (W - 8 > pw + 8) {                                              // cinta lateral con detalle
    F(g, 6, 6, px0 - 8, 4, lt(band, 0.18)); F(g, W - 6 - (px0 - 8), 6, px0 - 8, 4, lt(band, 0.18));
    F(g, 6, 7, px0 - 8, 1, dk(band, 0.25)); F(g, W - 6 - (px0 - 8), 7, px0 - 8, 1, dk(band, 0.25));
  }
  F(g, px0 - 1, 0, pw + 2, 16, K); AO(g, px0, 16, pw, 1, 0.5);
  if (f) f(g, px0, 1, pw, 14, B);
  // toldo
  var aw = sp.awn;
  // huecos: ventanas + puerta
  var dW = sp.noDoor ? 0 : (sp.doorW || 20), edge = 5, gap = 3, n = sp.noDoor ? 1 : (W >= 128 ? 3 : (W >= 88 ? 2 : 1));
  var winW = Math.floor((W - 2 * edge - dW - gap * (n - (sp.noDoor ? 1 : 0))) / n), items = [], di = n === 1 ? (r() < 0.5 ? 0 : 1) : Math.floor(n / 2);
  if (sp.noDoor) items.push({ k: 'win', w: W - 2 * edge });
  else for (i = 0; i <= n; i++) { if (i === di) items.push({ k: 'door', w: dW }); if (i < n) items.push({ k: 'win', w: winW }); }
  var tot = 0; items.forEach(function (it) { tot += it.w; });
  var sg = items.length > 1 ? Math.floor((W - 2 * edge - tot) / (items.length - 1)) : 0, x = edge + ((W - 2 * edge - tot - sg * (items.length - 1)) >> 1);
  var ghY = 26, ghH = 31;
  items.forEach(function (it) {
    it.x = x; x += it.w + sg;
    if (it.k === 'win') {
      var gx = it.x + 2, gw = it.w - 4;
      F(g, it.x, ghY - 2, it.w, ghH + 6, sp.frame); F(g, it.x, ghY - 2, it.w, 1, lt(sp.frame, 0.3)); F(g, it.x, ghY - 2, 1, ghH + 6, lt(sp.frame, 0.2)); F(g, it.x + it.w - 1, ghY - 2, 1, ghH + 6, dk(sp.frame, 0.35));
      glassRect(g, gx, ghY, gw, ghH, sp, sp.shop, r);
      if (gw > 44 && !sp.open) F(g, gx + (gw >> 1), ghY, 2, ghH, sp.frame);
      F(g, it.x - 1, ghY + ghH + 2, it.w + 2, 2, lt(sp.frame, 0.2)); AO(g, it.x - 1, ghY + ghH + 4, it.w + 2, 1, 0.35);
      lights.push({ x: it.x + (it.w >> 1), y: ghY + (ghH >> 1), w: it.w, h: ghH, kind: 'local' });
    } else {
      var dx = it.x, dy = ghY - 1;
      F(g, dx, dy, dW, H - dy - 1, sp.frame); F(g, dx, dy, dW, 1, lt(sp.frame, 0.3)); F(g, dx, dy, 1, H - dy, lt(sp.frame, 0.2));
      vgrad(g, dx + 2, dy + 2, dW - 4, 31, sp.dark ? ['#1c2530', '#2d3d4a'] : ['#4d7f9a', '#8fb0b8', '#4d7f9a']);
      F(g, dx + (dW >> 1) - 1, dy + 2, 2, 31, sp.frame); glint(g, dx + 4, dy + 22, 6, '#ffffff', 0.25);
      F(g, dx + (dW >> 1) - 3, dy + 17, 1, 5, '#cfd3cc'); F(g, dx + (dW >> 1) + 2, dy + 17, 1, 5, '#cfd3cc');
      F(g, dx + 2, dy + 33, dW - 4, 2, dk(sp.frame, 0.2));
      F(g, dx - 1, H - 2, dW + 2, 2, '#b8b3a2'); F(g, dx - 1, H - 2, dW + 2, 1, '#d6d1b8');
      lights.push({ x: dx + (dW >> 1), y: dy + 16, w: dW - 4, h: 30, kind: 'local' });
    }
  });
  // zocalo
  F(g, 3, H - 4, W - 6, 4, dk(A[1], 0.15)); F(g, 3, H - 4, W - 6, 1, A[3]);
  items.forEach(function (it) { if (it.k === 'door') { F(g, it.x - 1, H - 2, dW + 2, 2, '#b8b3a2'); F(g, it.x - 1, H - 2, dW + 2, 1, '#d6d1b8'); } });
  // toldo sobre los huecos (cubre la parte alta del vidrio)
  if (aw) items.forEach(function (it) { awning(g, it.x - 2, 16, it.w + 4, aw.cols, aw.kind); });
  if (sp.extra) sp.extra(g, items, r, W, H, lights);
  // sombra bajo el cintillo y luz del letrero
  AO(g, 0, 16, W, 2, 0.28);
  lights.push({ x: W >> 1, y: 18, w: 0, h: 0, kind: 'foco' });
  // contorno
  F(g, 0, 0, W, 1, K); F(g, 0, 0, 1, H, K); F(g, W - 1, 0, 1, H, K);
  return { g: g, lights: lights };
}

/* ---------- Cinepolis: marquesina, afiches iluminados y portal de vidrio ---------- */
function poster(g, x, y, w, h, r) {
  var pal = [['#d9202c', '#3a0a10'], ['#2f72b0', '#0e2440'], ['#f2c230', '#6a3a0a'], ['#7a3fb0', '#240e40'], ['#2f9a6a', '#0a2a1c'], ['#e8731a', '#401a08']][(r() * 6) | 0];
  F(g, x - 1, y - 1, w + 2, h + 2, '#101018'); vgrad(g, x, y, w, h, [pal[0], mx(pal[0], pal[1], 0.5), pal[1]]);
  var cx = x + (w >> 1), t = (r() * 3) | 0;
  if (t === 0) { DISC(g, cx, y + 8, 3, '#f3d4b0'); F(g, cx - 3, y + 11, 7, 8, '#1c1a22'); F(g, cx - 5, y + 13, 3, 3, '#1c1a22'); F(g, cx + 3, y + 13, 3, 3, '#1c1a22'); }
  else if (t === 1) { DISC(g, cx, y + 9, 5, '#fff4d8'); DISC(g, cx + 1, y + 9, 4, pal[0]); F(g, cx - 5, y + 16, 11, 3, '#101018'); }
  else { F(g, cx - 1, y + 3, 3, 16, '#f3efe2'); F(g, cx - 4, y + 7, 9, 2, '#f3efe2'); DISC(g, cx, y + 20, 2, '#f2c230'); }
  F(g, x + 2, y + h - 6, w - 4, 2, '#f3efe2'); F(g, x + 3, y + h - 3, w - 6, 1, lt(pal[0], 0.4));
  LI(g, x, y, w, 2, 0.2);
}
function buildCinepolis(wTiles) {
  var W = wTiles * 16, H = FH, g = new G(W, H), r = px.rng(seedOf('cinepolis') + W), lights = [], i;
  var A = ramp('#33436a');
  F(g, 0, 0, W, H, A[2]); speck(g, 0, 0, W, H, r, W * H / 34, [A[1], A[3]]);
  F(g, 0, 0, 3, H, A[3]); F(g, W - 3, 0, 3, H, A[1]);
  F(g, 0, 0, W, 16, '#1b3a8a'); F(g, 0, 0, W, 1, '#4a6ad0'); F(g, 0, 15, W, 1, '#0b1a44');
  var pw = Math.min(W - 8, 104), px0 = (W - pw) >> 1;
  F(g, px0 - 1, 0, pw + 2, 16, K); LOGO.cinepolis(g, px0, 1, pw, 14, bget('cinepolis'));
  for (i = 5; i < px0 - 3; i += 4) { F(g, i, 6, 2, 3, '#e0242b'); F(g, W - 7 - i + 5, 6, 2, 3, '#e0242b'); }
  // marquesina con focos
  F(g, 3, 17, W - 6, 6, '#101830'); F(g, 3, 17, W - 6, 1, '#3a4a80');
  for (i = 5; i < W - 6; i += 4) { P(g, 3 + i, 20, (i / 4 | 0) & 1 ? '#fff0a0' : '#ffb840'); P(g, 4 + i, 20, (i / 4 | 0) & 1 ? '#fff0a0' : '#ffb840'); }
  fitIn(g, 'SALAS 1-11 · IMAX · JUNIOR'.replace('·', '-').replace('·', '-'), 6, 17, W - 12, 6, '#8fd0ff');
  // portal central + afiches
  var dW = Math.min(44, W - 40), nP = Math.max(1, Math.floor((W - dW - 14) / 20)), pwid = 16, items = [], dx = (W - dW) >> 1, ph = 26, py = 27;
  var leftN = nP >> 1, rightN = nP - leftN; if (nP === 1) { leftN = 1; rightN = 0; }
  for (i = 0; i < leftN; i++) poster(g, dx - 4 - (leftN - i) * 19 + 3, py, pwid, ph, r);
  for (i = 0; i < rightN; i++) poster(g, dx + dW + 4 + i * 19 + 2, py, pwid, ph, r);
  F(g, dx - 2, 25, dW + 4, H - 25, '#8aa0d8'); F(g, dx - 2, 25, dW + 4, 1, '#cfe0ff'); F(g, dx - 2, 25, 1, H - 25, '#b8c8f0');
  vgrad(g, dx, 27, dW, 34, ['#ffd98a', '#e8a860', '#a86a3a']);
  F(g, dx + (dW >> 1) - 1, 27, 2, 34, '#8aa0d8'); F(g, dx + (dW >> 2), 27, 1, 34, '#8aa0d8'); F(g, dx + (dW * 3 >> 2), 27, 1, 34, '#8aa0d8');
  F(g, dx, 27, dW, 4, '#1b3a8a'); fitIn(g, 'ENTRADA', dx, 27, dW, 4, '#ffffff');
  for (i = 0; i < 4; i++) { F(g, dx + 4 + i * 10, 46, 3, 10, '#2a2024'); DISC(g, dx + 5 + i * 10, 44, 2, '#2a2024'); }   // gente en el hall
  LN(g, dx + 3, 58, dx + 10, 30, '#fff4d8');
  F(g, 3, H - 4, W - 6, 4, A[0]); F(g, dx - 1, H - 2, dW + 2, 2, '#d6d1b8');
  lights.push({ x: dx + (dW >> 1), y: 44, w: dW, h: 34, kind: 'local' }, { x: W >> 1, y: 20, w: 0, h: 0, kind: 'foco' }, { x: W >> 1, y: 20, w: W - 8, h: 6, kind: 'local' });
  AO(g, 0, 23, W, 2, 0.25);
  F(g, 0, 0, W, 1, K); F(g, 0, 0, 1, H, K); F(g, W - 1, 0, 1, H, K);
  return { g: g, lights: lights };
}
function fitIn(g, s, x, y, w, h, ink) { fit(g, s, x, y, w, h, ink); }

/* ---------- Salazar Food & Drinks: salon abierto con el bar central a la vista ---------- */
function buildSalazar(wTiles) {
  var W = wTiles * 16, H = FH, g = new G(W, H), r = px.rng(seedOf('salazar') + W), lights = [], i, j;
  var A = ramp('#3a3844');
  F(g, 0, 0, W, H, A[1]); speck(g, 0, 0, W, H, r, W * H / 40, [A[0], A[2]]);
  F(g, 0, 0, W, 16, '#25232b'); F(g, 0, 0, W, 1, '#4a4858'); F(g, 0, 15, W, 1, '#0a090c');
  var pw = Math.min(W - 8, 104), px0 = (W - pw) >> 1;
  F(g, px0 - 1, 0, pw + 2, 16, K); LOGO.salazar(g, px0, 1, pw, 14, bget('salazar'));
  for (i = 4; i < px0 - 4; i += 3) { P(g, i, 8, (i % 6) ? '#ff8f7a' : '#9fe0e0'); P(g, W - 1 - i, 8, (i % 6) ? '#9fe0e0' : '#ff8f7a'); }
  // vano abierto
  var ox = 5, ow = W - 10, oy = 19, oh = H - 21;
  F(g, ox - 2, oy - 2, ow + 4, oh + 4, '#17171c');
  vgrad(g, ox, oy, ow, oh, ['#4a2a22', '#6a3a28', '#8a4c30', '#a8693a']);
  for (i = 0; i < 3; i++) { var sy = oy + 3 + i * 7; F(g, ox + 2, sy + 5, ow - 4, 1, '#c99458'); for (j = 2; j < ow - 4; j += 2) if (r() < 0.8) F(g, ox + j, sy + 1 + ((r() * 2) | 0), 1, 4, pick(r, ['#1F862C', '#c0261c', '#e6c85a', '#3f72b0', '#f3efe2', '#8a4a22'])); }
  for (i = 8; i < ow - 4; i += 11) lampPend(g, ox + i, oy, 2 + ((r() * 4) | 0), '#ffcf8a');
  // bar central
  var bw = Math.min(ow - 16, 46), bx = ox + ((ow - bw) >> 1), by = oy + oh - 18;
  F(g, bx, by, bw, 12, '#2a1a14'); F(g, bx, by, bw, 3, '#e6b060'); F(g, bx, by, bw, 1, '#fff0c0'); F(g, bx, by + 12, bw, 2, '#17120e');
  for (i = 3; i < bw - 4; i += 5) F(g, bx + i, by + 5, 1, 5, '#6b4223');
  F(g, bx + (bw >> 1) - 9, by - 11, 18, 5, '#101014'); fitIn(g, 'ISOLA BAR', bx + (bw >> 1) - 9, by - 11, 18, 5, '#9fe0e0');
  for (i = 2; i < bw - 3; i += 6) { F(g, bx + i, by - 4, 2, 4, pick(r, ['#1F862C', '#c0261c', '#e6c85a', '#f3efe2'])); P(g, bx + i, by - 5, '#e6e0d0'); }
  for (i = bx + 2; i < bx + bw - 2; i += 8) { F(g, i, by + 13, 4, 1, '#17171c'); DISC(g, i + 2, by + 15, 1, '#c0261c'); }
  // mesas a los lados
  for (j = 0; j < 2; j++) { var tx = j ? bx + bw + 6 : ox + 4; if (j && tx + 12 > ox + ow - 3) continue; if (!j && tx + 12 > bx - 3) continue; table(g, tx, oy + oh - 15, 12, '#e6dcc0'); person(g, tx - 1, oy + oh - 23, pick(r, ['#d98a9e', '#4a6498', '#f3efe2'])); person(g, tx + 8, oy + oh - 23, pick(r, ['#2f7a50', '#c9a66b', '#8f3a32'])); }
  F(g, ox, oy + oh - 4, ow, 4, '#6b4223'); for (i = 0; i < ow; i += 6) F(g, ox + i, oy + oh - 4, 1, 4, '#4a3028');
  // postes de acero y cielo oscuro
  for (i = ox; i < ox + ow; i += 28) { F(g, i - 1, oy, 3, oh, '#5c6570'); F(g, i - 1, oy, 1, oh, '#a4abaa'); }
  F(g, ox, oy, ow, 3, '#17171c'); AO(g, ox, oy + 3, ow, 3, 0.4);
  F(g, 3, H - 2, W - 6, 2, '#b8b3a2'); F(g, 3, H - 2, W - 6, 1, '#d6d1b8');
  lights.push({ x: W >> 1, y: oy + (oh >> 1), w: ow, h: oh, kind: 'local' }, { x: W >> 1, y: 18, w: 0, h: 0, kind: 'foco' }, { x: bx + (bw >> 1), y: by - 6, w: 0, h: 0, kind: 'foco' });
  F(g, 0, 0, W, 1, K); F(g, 0, 0, 1, H, K); F(g, W - 1, 0, 1, H, K);
  return { g: g, lights: lights };
}

/* ---------- CHIFA GRAN DRAGON: portal rojo y dorado con tejado, faroles y dragones ---------- */
var GOLD = ['#6a4a08', '#b8860b', '#e0a820', '#f6d255', '#fff2b0'], RED = ['#3a0608', '#6a0c0e', '#9a1410', '#c0261c', '#e8604a'];
var DRAGON_G = null;
function dragonSprite() {                                          // cabeza de dragon de frente, 23 x 15, simetrica
  var g = new G(23, 15), cx = 11, cy = 7, s;
  for (s = -1; s <= 1; s += 2) {
    LN(g, cx + s * 4, cy - 3, cx + s * 6, cy - 6, GOLD[3]); LN(g, cx + s * 5, cy - 3, cx + s * 7, cy - 6, GOLD[2]); P(g, cx + s * 7, cy - 7, GOLD[4]); P(g, cx + s * 8, cy - 7, GOLD[3]);      // cuernos
    LN(g, cx + s * 6, cy + 1, cx + s * 9, cy + 3, GOLD[2]); LN(g, cx + s * 9, cy + 3, cx + s * 10, cy + 6, GOLD[3]); P(g, cx + s * 10, cy + 7, GOLD[4]);                                  // bigotes
    LN(g, cx + s * 7, cy - 1, cx + s * 10, cy - 2, RED[3]); LN(g, cx + s * 7, cy, cx + s * 10, cy, RED[4]);                                                                              // melena
  }
  ELL(g, cx, cy, 7, 5, GOLD[2]); ELL(g, cx, cy - 1, 6, 3, GOLD[3]); P(g, cx - 3, cy - 3, GOLD[4]); P(g, cx - 2, cy - 3, GOLD[4]);
  ELL(g, cx, cy + 3, 4, 2, GOLD[3]); F(g, cx - 3, cy + 4, 7, 1, GOLD[2]);
  for (s = -1; s <= 1; s += 2) {
    F(g, cx + s * 3 - (s > 0 ? 0 : 1), cy - 2, 2, 2, '#ffffff'); P(g, cx + s * 3 - (s > 0 ? 0 : 0), cy - 1, K); LN(g, cx + s * 5, cy - 4, cx + s * 2, cy - 2, GOLD[0]);
    P(g, cx + s * 2, cy + 2, GOLD[0]); P(g, cx + s * 3, cy + 5, '#ffffff'); P(g, cx + s * 1, cy + 5, '#ffffff');
  }
  F(g, cx - 2, cy + 5, 5, 1, RED[1]); F(g, cx - 1, cy + 6, 3, 1, RED[3]);
  P(g, cx, cy - 4, RED[3]); P(g, cx, cy - 3, RED[4]);
  outline(g, '#4a2a08');
  return g;
}
function dragonHead(g, cx, y, flip) { DRAGON_G = DRAGON_G || dragonSprite(); g.blit(DRAGON_G, Math.round(cx - 11), Math.round(y)); }
function lantern(g, x, y) {                                        // farol rojo 8 x 13
  F(g, x + 3, y, 2, 2, GOLD[3]); F(g, x + 1, y + 2, 6, 7, RED[3]); F(g, x, y + 3, 8, 5, RED[3]); F(g, x + 1, y + 3, 2, 4, RED[4]); F(g, x + 7, y + 3, 1, 5, RED[1]);
  F(g, x + 1, y + 2, 6, 1, GOLD[3]); F(g, x + 1, y + 8, 6, 1, GOLD[3]); F(g, x + 3, y + 9, 2, 4, GOLD[3]); P(g, x + 3, y + 12, GOLD[1]);
  F(g, x + 3, y + 4, 2, 2, GOLD[4]);
}
function lattice(g, x, y, w, h) {                                   // ventana de celosia dorada sobre fondo oscuro
  F(g, x - 2, y - 2, w + 4, h + 4, RED[3]); F(g, x - 2, y - 2, w + 4, 1, RED[4]); F(g, x - 2, y + h + 1, w + 4, 1, RED[1]);
  F(g, x, y, w, h, '#2a0a08'); var i;
  for (i = 0; i <= w; i += 4) F(g, x + i, y, 1, h, GOLD[2]);
  for (i = 0; i <= h; i += 4) F(g, x, y + i, w, 1, GOLD[2]);
  for (i = 0; i < w - 2; i += 8) for (var j = 0; j < h - 2; j += 8) { P(g, x + i + 2, y + j + 2, '#ffcf6a'); P(g, x + i + 3, y + j + 3, '#ffcf6a'); }
  F(g, x, y, w, 1, GOLD[3]);
}
function studs(g, x, y, w, h) { for (var j = 0; j < h; j += 5) for (var i = 0; i < w; i += 5) { P(g, x + i, y + j, GOLD[4]); P(g, x + i + 1, y + j, GOLD[2]); P(g, x + i, y + j + 1, GOLD[1]); } }
function buildDragon(wTiles) {
  var W = wTiles * 16, H = 96, g = new G(W, H), r = px.rng(seedOf('granDragon') + W), lights = [], i, j;
  F(g, 0, 0, W, H, RED[2]); speck(g, 0, 0, W, H, r, W * H / 30, [RED[1], RED[3]]);
  // tejado de tejas oscuras con borde dorado y puntas levantadas
  for (j = 0; j < 20; j++) {
    for (i = 0; i < W; i++) {
      var c = ((i + (j >> 1) * 3) % 6 < 5) ? '#4a2a2e' : '#2a1a1e'; if (j % 3 === 0) c = lt(c, 0.1);
      var ex = Math.min(i, W - 1 - i);
      if (ex < 8 && j < (8 - ex) * 0.9) continue;                 // puntas levantadas
      P(g, i, 2 + j, c);
    }
  }
  F(g, 0, 21, W, 2, GOLD[2]); F(g, 0, 21, W, 1, GOLD[4]); F(g, 0, 23, W, 1, GOLD[0]);
  for (i = 6; i < W - 6; i += 7) { P(g, i, 8, '#6a4a4e'); P(g, i + 3, 14, '#6a4a4e'); }
  F(g, 12, 1, W - 24, 2, GOLD[3]); F(g, 12, 1, W - 24, 1, GOLD[4]); for (i = 14; i < W - 14; i += 6) F(g, i, 0, 2, 1, GOLD[3]);
  // ménsulas bajo el alero
  F(g, 0, 24, W, 5, RED[1]); for (i = 2; i < W - 2; i += 6) { F(g, i, 24, 4, 5, '#1F862C'); F(g, i, 24, 4, 1, '#5fd080'); F(g, i + 1, 27, 2, 2, GOLD[3]); }
  AO(g, 0, 29, W, 3, 0.4);
  // letrero colgante (CHIFA arriba, GRAN DRAGON abajo)
  var pw = Math.min(W - 30, 112), px0 = (W - pw) >> 1;
  F(g, px0 - 3, 30, pw + 6, 23, '#2a0204'); FR(g, px0 - 3, 30, pw + 6, 23, GOLD[2]); FR(g, px0 - 2, 31, pw + 4, 21, GOLD[0]);
  LOGO.granDragon(g, px0, 33, pw, 17, bget('granDragon'));
  // dragones dorados a los lados del letrero
  var sideW = px0 - 3;
  if (sideW >= 14) { dragonHead(g, 3 + (sideW >> 1), 36, false); dragonHead(g, W - 3 - (sideW >> 1), 36, true); }
  // dintel dorado
  F(g, 0, 54, W, 4, GOLD[2]); F(g, 0, 54, W, 1, GOLD[4]); F(g, 0, 57, W, 1, GOLD[0]); for (i = 3; i < W - 3; i += 6) { P(g, i, 55, RED[3]); P(g, i + 1, 55, RED[3]); }
  // columnas rojas
  var gate = 44, gx = (W - gate) >> 1, top0 = 58;
  function column(x) { F(g, x, top0, 6, 96 - top0, RED[3]); F(g, x, top0, 2, 96 - top0, RED[4]); F(g, x + 5, top0, 1, 96 - top0, RED[1]); F(g, x - 1, top0, 8, 3, GOLD[2]); F(g, x - 1, 91, 8, 5, '#8a8478'); F(g, x - 1, 91, 8, 1, '#b8b2a2'); for (var q = top0 + 8; q < 88; q += 9) { P(g, x + 2, q, GOLD[3]); P(g, x + 3, q + 1, GOLD[2]); } }
  column(gx - 8); column(gx + gate + 2); column(2); column(W - 8);
  // celosias laterales con farol colgado encima
  var cellW = gx - 8 - 8, cells = [[8, cellW], [gx + gate + 8, cellW]];
  cells.forEach(function (cl) {
    var lw = cl[1] - 4; if (lw < 12) return;
    var lx = cl[0] + 2;
    lattice(g, lx, 76, lw, 14);
    var fx = lx + (lw >> 1) - 4; F(g, fx + 3, 58, 1, 3, '#2a0a08'); lantern(g, fx, 60); lights.push({ x: fx + 4, y: 66, w: 0, h: 0, kind: 'foco' });
  });
  // portal: dos hojas
  var dy = 62;
  F(g, gx - 2, dy - 3, gate + 4, 4, GOLD[2]); F(g, gx - 2, dy - 3, gate + 4, 1, GOLD[4]);
  F(g, gx, dy, gate, 96 - dy, '#4a0a0a');
  var hw = (gate - 2) >> 1;
  for (var h2 = 0; h2 < 2; h2++) {
    var hx = gx + 1 + h2 * (hw + 1);
    F(g, hx, dy + 1, hw, 96 - dy - 4, RED[3]); F(g, hx, dy + 1, hw, 1, RED[4]); F(g, hx + (h2 ? hw - 1 : 0), dy + 1, 1, 96 - dy - 4, h2 ? RED[1] : RED[4]);
    studs(g, hx + 3, dy + 14, hw - 6, 15);
    F(g, hx + (h2 ? 1 : hw - 5), dy + 20, 4, 4, GOLD[2]); P(g, hx + (h2 ? 2 : hw - 4), dy + 21, GOLD[4]);
    dragonHead(g, hx + (hw >> 1) + (h2 ? 0 : 1), dy + 2, !!h2);
    F(g, hx + 2, 96 - 8, hw - 4, 3, RED[1]);
  }
  F(g, gx + (gate >> 1), dy, 1, 96 - dy, GOLD[1]);
  F(g, gx - 3, 93, gate + 6, 3, '#a8a294'); F(g, gx - 3, 93, gate + 6, 1, '#d6d1b8');
  // faroles grandes en los extremos del alero
  [8, W - 16].forEach(function (x) { F(g, x + 3, 29, 1, 3, '#2a0a08'); lantern(g, x, 31); lights.push({ x: x + 4, y: 38, w: 0, h: 0, kind: 'foco' }); });
  lights.push({ x: W >> 1, y: 78, w: gate, h: 34, kind: 'local' }, { x: W >> 1, y: 40, w: 0, h: 0, kind: 'foco' });
  outline(g, K);
  return { g: g, lights: lights, h: H };
}

/* ======================== API: fachada(brand, wTiles) ======================== */
var cache = {};
function fachada(brand, wTiles) {
  wTiles = clamp(Math.round(wTiles || 5), 3, 20);
  if (brand === 'granDragon') wTiles = Math.max(5, wTiles);
  var key = brand + '|' + wTiles + '|' + (real() ? 'R' : 'P');
  if (cache[key]) return cache[key];
  var res;
  try {
    var b = brand === 'cinepolis' ? buildCinepolis(wTiles) : brand === 'salazar' ? buildSalazar(wTiles) : brand === 'granDragon' ? buildDragon(wTiles)
      : buildShop(SPEC[brand] ? brand : 'kiosco', wTiles);
    var cv = b.g.toCanvas();
    res = { cv: cv, ax: cv.width >> 1, ay: cv.height, lights: b.lights };
  } catch (e) {
    if (window.console) console.warn('[cv.larco] fachada', brand, e);
    var g = new G(wTiles * 16, FH); F(g, 0, 0, g.w, g.h, '#8a8478'); FR(g, 0, 0, g.w, g.h, K); px.text(g, String(brand).toUpperCase(), g.w >> 1, 26, { font: 'a5', ink: '#fff', align: 'c' });
    var cv2 = g.toCanvas(); res = { cv: cv2, ax: cv2.width >> 1, ay: cv2.height, lights: [] };
  }
  cache[key] = res;
  return res;
}
var epoch = 0;                                                      // el cache va por marca+ancho+modo: cambiar de modo no lo borra; solo avisa (L.epoch)
if (typeof px.onMarcas === 'function') px.onMarcas(function () { epoch++; if (S.cv.larco) S.cv.larco.epoch = epoch; });


/* ======================== TILES (16 x 16) ======================== */
var CRE = ['#8a7f6a', '#b3a78c', '#d8ccb0', '#e8dec4', '#f4ecd6'];           // piedra crema de Larcomar
function tileG() { return new G(16, 16); }
function pisoLarcoG(v) {
  var g = tileG(), r = px.rng(9100 + v * 17), i, j;
  F(g, 0, 0, 16, 16, CRE[2]);
  var tone = [CRE[2], mx(CRE[2], CRE[3], 0.5), mx(CRE[2], CRE[1], 0.3)];
  for (j = 0; j < 2; j++) for (i = 0; i < 2; i++) F(g, i * 8, j * 8, 8, 8, tone[((i + j + v) % 3 + 3) % 3]);
  speck(g, 0, 0, 16, 16, r, 14, [CRE[1], CRE[3], CRE[4]]);
  F(g, 7, 0, 1, 16, CRE[1]); F(g, 0, 7, 16, 1, CRE[1]); F(g, 15, 0, 1, 16, CRE[1]); F(g, 0, 15, 16, 1, CRE[1]);
  F(g, 8, 0, 1, 7, CRE[4]); F(g, 0, 8, 7, 1, CRE[4]);
  if (v === 1) { P(g, 3, 3, CRE[0]); P(g, 4, 3, CRE[0]); P(g, 11, 12, CRE[0]); }
  if (v === 2) { for (i = 0; i < 6; i++) P(g, 9 + i, 9 + i, mx(CRE[2], CRE[1], 0.5)); }
  if (v === 3) { DISC(g, 11, 4, 1, CRE[1]); P(g, 12, 4, CRE[3]); }
  return g;
}
function deckG(v) {
  var g = tileG(), r = px.rng(9200 + v * 13), j, i, cols = ['#a8693a', '#b57440', '#9a5e32', '#bf7c46'];
  for (j = 0; j < 4; j++) {
    var c = cols[(j + v) % 4], off = ((j * 5 + v * 7) % 12) + 2;
    F(g, 0, j * 4, 16, 4, c); F(g, 0, j * 4, 16, 1, lt(c, 0.22)); F(g, 0, j * 4 + 3, 16, 1, dk(c, 0.42));
    F(g, off, j * 4, 1, 3, dk(c, 0.4)); P(g, off + 1, j * 4 + 1, lt(c, 0.1));
    P(g, (off + 6) % 16, j * 4 + 1, dk(c, 0.3)); P(g, (off + 11) % 16, j * 4 + 2, lt(c, 0.15));
    for (i = 0; i < 4; i++) P(g, r() * 16, j * 4 + 1 + ((r() * 2) | 0), dk(c, 0.18));
  }
  return g;
}
function escaleraG(v) {                                              // v: 0 centro, 1 baranda a la izquierda, 2 baranda a la derecha
  var g = tileG(), j, i;
  for (j = 0; j < 4; j++) {
    var y = j * 4;
    F(g, 0, y, 16, 3, CRE[3]); F(g, 0, y, 16, 1, CRE[4]); F(g, 0, y + 3, 16, 1, CRE[0]);
    F(g, 0, y + 2, 16, 1, CRE[2]);
    P(g, 5 + j * 3, y + 1, CRE[2]); P(g, 11 - j, y + 1, CRE[2]);
  }
  var rail = function (x0, dir) {                                     // baranda de madera con montantes, vista de arriba/frente
    F(g, x0, 0, 3, 16, WD[2]); F(g, x0 + (dir > 0 ? 0 : 2), 0, 1, 16, WD[3]); F(g, x0 + (dir > 0 ? 2 : 0), 0, 1, 16, WD[0]);
    for (var q = 1; q < 16; q += 5) F(g, x0, q, 3, 1, WD[1]);
  };
  if (v === 1) { rail(0, 1); F(g, 3, 0, 1, 16, '#2a244066'); }
  if (v === 2) { rail(13, -1); F(g, 12, 0, 1, 16, '#2a244066'); }
  return g;
}
function paredRocaG(v) {
  var g = tileG(), r = px.rng(9300 + v * 29), i, j, B = ['#4a4048', '#6a5e58', '#8a7c6c', '#a8987f', '#c4b496'];
  F(g, 0, 0, 16, 16, B[2]);
  for (j = 0; j < 16; j += 4) { var yy = (j + (v * 3) % 4) % 16, c = (j / 4 + v) % 2 ? B[1] : B[3]; F(g, 0, yy, 16, 1, c); }
  speck(g, 0, 0, 16, 16, r, 30, [B[1], B[3], B[3], B[4], B[1]]);
  for (i = 0; i < 2; i++) { var cx = (r() * 14) | 0, cy = (r() * 12) | 0; P(g, cx, cy, B[1]); P(g, cx + 1, cy + 1, B[1]); P(g, cx + 1, cy + 2, B[0]); }
  if (v === 2) { P(g, 4, 11, '#5f7a44'); P(g, 5, 11, '#6f8a4c'); P(g, 5, 12, '#4a6a38'); }
  if (v === 3) { F(g, 9, 6, 4, 1, B[4]); F(g, 3, 13, 3, 1, B[4]); }
  return g;
}
function pisoChifaG(v) {
  var g = tileG(), r = px.rng(9400 + v * 11), i, j, R = ['#3a0e0e', '#5a1612', '#7a1e16', '#963022'];
  for (j = 0; j < 2; j++) for (i = 0; i < 2; i++) { var c = R[((i + j + v) & 1) ? 1 : 2]; F(g, i * 8, j * 8, 8, 8, c); F(g, i * 8, j * 8, 8, 1, lt(c, 0.12)); F(g, i * 8, j * 8, 1, 8, lt(c, 0.08)); }
  F(g, 7, 0, 1, 16, R[0]); F(g, 15, 0, 1, 16, R[0]); F(g, 0, 7, 16, 1, R[0]); F(g, 0, 15, 16, 1, R[0]);
  speck(g, 0, 0, 16, 16, r, 12, [R[3], R[0]]);
  if (v === 1) { FR(g, 1, 1, 14, 14, '#b8860b'); }
  if (v === 2) { for (i = 0; i < 16; i += 4) { P(g, i + 1, 3, '#b8860b'); P(g, i + 3, 11, '#b8860b'); } }
  if (v === 3) { LN(g, 8, 3, 13, 8, '#e0a820'); LN(g, 13, 8, 8, 13, '#e0a820'); LN(g, 8, 13, 3, 8, '#e0a820'); LN(g, 3, 8, 8, 3, '#e0a820'); DISC(g, 8, 8, 1, '#f6d255'); }
  return g;
}
function mkTiles(f, n, base) { var a = []; for (var v = 0; v < n; v++) a.push(f(v).toCanvas()); return a; }

/* ======================== PROPS ======================== */
var STEEL = MT;
function glassPane(g, x, y, w, h, tint) {                            // vidrio azulado traslucido
  F(g, x, y, w, h, (tint || '#9fd8e0') + '44'); F(g, x, y, w, 1, '#d8f4ff88'); F(g, x, y, 1, h, '#d8f4ff55');
  for (var i = 0; i < Math.min(6, h - 4); i++) { P(g, x + 3 + i, y + h - 3 - i, '#ffffff88'); P(g, x + 4 + i, y + h - 3 - i, '#ffffff44'); }
}
function propBaranda() {
  var g = new G(16, 24), i;
  glassPane(g, 1, 5, 14, 14);
  F(g, 0, 3, 16, 3, STEEL[3]); F(g, 0, 3, 16, 1, STEEL[4]); F(g, 0, 5, 16, 1, STEEL[1]);                // pasamanos
  F(g, 0, 19, 16, 2, STEEL[2]); F(g, 0, 19, 16, 1, STEEL[3]); F(g, 0, 20, 16, 1, STEEL[0]);              // zocalo
  F(g, 0, 3, 2, 18, STEEL[3]); F(g, 0, 3, 1, 18, STEEL[4]); F(g, 1, 6, 1, 13, STEEL[1]);                 // poste
  P(g, 1, 21, STEEL[0]); F(g, 0, 21, 2, 1, STEEL[0]);
  for (i = 2; i < 14; i += 4) P(g, i + 3, 11, '#ffffff55');
  F(g, 15, 3, 1, 18, STEEL[1]);
  return mk(g, 8, 21, 16, 3, { cast: { len: 0.25 } });
}
function propLetrero() {
  var W = 184, H = 50, g = new G(W, H), i, j, T = 'LARCOMAR';
  // panel azul marino con olas y el mar abajo
  F(g, 0, 0, W, 38, '#1f3a5c'); F(g, 0, 0, W, 1, '#5a86b0'); F(g, 0, 37, W, 1, '#0e1e34'); F(g, 0, 0, 2, 38, '#3a5e86'); F(g, W - 2, 0, 2, 38, '#142a46');
  for (j = 26; j < 36; j++) for (i = 2; i < W - 2; i++) { var wv = Math.round(Math.sin(i * 0.35 + j * 1.3) * 1.2); P(g, i, j, ((j + wv) % 3 === 0) ? '#2f5a80' : '#264a70'); }
  for (i = 2; i < W - 2; i++) { P(g, i, 26 + Math.round(Math.sin(i * 0.35) * 1.2), '#7ab0d0'); }
  // letras grandes (a12 x2) con contorno y luz
  var tw2 = px.measure(T, 'a12', 2), x0 = (W - tw2) >> 1;
  px.text(g, T, x0 + 1, 7 + 1, { font: 'a12', ink: '#0a1830', scale: 2, align: 'l' });
  px.text(g, T, x0, 7, { font: 'a12', ink: '#f3efe2', scale: 2, shadow: '#5ab8d0', align: 'l' });
  px.text(g, 'MIRAFLORES · LIMA'.replace('·', '-'), W >> 1, 31, { font: 'a5', ink: '#ffe9a0', align: 'c' });
  F(g, 0, 38, W, 3, STEEL[2]); F(g, 0, 38, W, 1, STEEL[4]); F(g, 0, 40, W, 1, STEEL[0]);
  // patas / soportes
  F(g, 20, 41, 3, 8, STEEL[2]); F(g, W - 23, 41, 3, 8, STEEL[2]); F(g, 20, 41, 1, 8, STEEL[4]); F(g, W - 23, 41, 1, 8, STEEL[4]);
  // focos
  for (i = 18; i < W - 10; i += 28) { F(g, i, 0, 2, 1, '#fff4d8'); }
  outline(g, K);
  return mk(g, W >> 1, 49, 170, 3, { cast: { len: 0.2 }, p: { tall: true, lamp: { x: 0, y: -26 } } });
}
function propEscalera() {
  var W = 22, H = 68, g = new G(W, H), i, j;
  F(g, 0, 0, W, H - 4, '#2a2a30');
  for (j = 2; j < H - 8; j += 2) { F(g, 5, j, 12, 1, STEEL[1]); F(g, 5, j + 1, 12, 1, STEEL[2]); }
  F(g, 5, 0, 12, 3, STEEL[3]); F(g, 5, 0, 12, 1, STEEL[4]); for (i = 5; i < 17; i += 2) F(g, i, 1, 1, 2, STEEL[1]);
  F(g, 0, 0, 5, H - 4, '#4d6676'); F(g, 17, 0, 5, H - 4, '#3a4a58');                               // balaustradas de vidrio
  F(g, 0, 0, 5, H - 4, '#4d667699'); F(g, 1, 0, 1, H - 4, '#8fb0b8'); F(g, 18, 0, 1, H - 4, '#6a8a98');
  F(g, 0, 0, 2, H - 4, '#1a1a20'); F(g, 20, 0, 2, H - 4, '#1a1a20');                                    // pasamanos negros
  F(g, 4, 0, 1, H - 4, STEEL[0]); F(g, 17, 0, 1, H - 4, STEEL[0]);
  for (j = 6; j < H - 8; j += 10) { P(g, 2, j, '#ffffff66'); P(g, 3, j + 1, '#ffffff44'); }
  F(g, 0, H - 8, W, 4, STEEL[2]); F(g, 0, H - 8, W, 1, STEEL[4]); F(g, 0, H - 5, W, 1, STEEL[0]);       // placa peine
  // cono de FUERA DE SERVICIO
  F(g, 8, H - 12, 6, 7, '#ff7a1a'); F(g, 9, H - 13, 4, 1, '#ff7a1a'); F(g, 8, H - 10, 6, 1, '#f3efe2'); F(g, 7, H - 5, 8, 1, '#2a2a30'); F(g, 10, H - 14, 2, 1, '#ff7a1a');
  outline(g, K);
  return mk(g, W >> 1, H - 3, 20, 4, { cast: { len: 0.2 } });
}
function propMaceta() {
  var W = 28, H = 42, g = new G(W, H), i, r = px.rng(9501);
  // hojas: abanico de palmera areca + helechos
  var fr = ['#2f6a34', '#3f8a40', '#58a850', '#7cc66a'];
  for (i = 0; i < 9; i++) {
    var a = -Math.PI * 0.95 + i * (Math.PI * 0.9 / 8), len = 14 + (i % 3) * 2, cx = 14, cy = 26;
    for (var t = 0; t <= len; t++) { var dx = Math.cos(a) * t, dy = Math.sin(a) * t + (t * t) / (len * 1.9); P(g, cx + dx, cy + dy, fr[t > len * 0.7 ? 3 : (t > len * 0.35 ? 2 : 1)]); P(g, cx + dx + 1, cy + dy, fr[1]); if (t > 5 && t % 2 === 0) { P(g, cx + dx, cy + dy + 1, fr[2]); } }
  }
  ELL(g, 14, 24, 6, 4, fr[1]); speck(g, 7, 20, 14, 8, r, 18, [fr[0], fr[2], fr[3]]);
  // maceta de concreto crema
  F(g, 4, 28, 20, 4, '#c4b89b'); F(g, 4, 28, 20, 1, '#f4ecd6'); F(g, 4, 28, 2, 4, '#e8dec4'); F(g, 22, 28, 2, 4, '#8a7f6a');
  for (i = 0; i < 9; i++) { var wd = 18 - (i > 5 ? (i - 5) * 2 : 0); F(g, 14 - (wd >> 1), 32 + i, wd, 1, i < 2 ? '#c4b89b' : '#a89c80'); F(g, 14 - (wd >> 1), 32 + i, 2, 1, '#d8ccb0'); F(g, 14 + (wd >> 1) - 2, 32 + i, 2, 1, '#6a6050'); }
  F(g, 9, 40, 10, 1, '#6a6050');
  outline(g, K);
  return mk(g, 14, 40, 18, 8, { p: { tall: true } });
}
function propSombrilla(broken) {
  var W = 40, H = 56, g = new G(W, H), i, j, cols = ['#d9202c', '#f3efe2', '#f2c230', '#2f72b0'];
  if (!broken) {
    F(g, 19, 10, 2, 38, '#8c8a93'); F(g, 19, 10, 1, 38, '#cfd3cc');
    for (j = 0; j < 12; j++) {                                        // casquete: media elipse de 34 x 12 con gajos
      var half = Math.round(17 * Math.sqrt(1 - Math.pow((j - 11) / 12.0, 2)));
      for (i = -half; i <= half; i++) { var sec = Math.floor((i + 17) / 6), c = cols[sec % 4]; if (j < 3) c = lt(c, 0.1); if (i > half - 3) c = dk(c, 0.25); P(g, 20 + i, 3 + j, c); }
    }
    for (i = -17; i <= 17; i++) { var sec2 = Math.floor((i + 17) / 6); P(g, 20 + i, 15, dk(cols[sec2 % 4], 0.3)); if (i % 3 === 0) { P(g, 20 + i, 16, dk(cols[sec2 % 4], 0.4)); } }
    P(g, 20, 2, '#e6c85a'); P(g, 20, 1, '#e6c85a');
    F(g, 14, 47, 12, 2, '#5c6570'); F(g, 14, 47, 12, 1, '#a4abaa'); F(g, 17, 49, 6, 1, '#3b4250');   // base
    outline(g, K);
    return mk(g, 20, 49, 12, 3, { cast: { len: 0.3 }, p: { tall: true, canopy: { x: -18, y: -48, w: 36, h: 14 } } });
  }
  // rota: casquete caido y poste doblado
  F(g, 6, 44, 28, 3, '#8c8a93'); F(g, 6, 44, 28, 1, '#cfd3cc'); LN(g, 6, 44, 3, 38, '#8c8a93');
  for (j = 0; j < 8; j++) { var hf = Math.round(13 * Math.sqrt(1 - Math.pow((j - 7) / 8.0, 2))); for (i = -hf; i <= hf; i++) { var sc = Math.floor((i + 17) / 5); P(g, 22 + i, 36 + j, (sc % 2) ? '#f3efe2' : '#d9202c'); } }
  for (i = -12; i < 12; i += 4) LN(g, 22 + i, 44, 22 + i + 2, 38, '#8a1018');
  F(g, 8, 48, 6, 1, '#5c6570'); F(g, 26, 47, 6, 2, '#5c6570');
  outline(g, K);
  return mk(g, 20, 49, 26, 6, { cast: { len: 0.2 } });
}
function propMesa(broken) {
  var W = 32, H = 30, g = new G(W, H), i;
  if (!broken) {
    F(g, 15, 14, 2, 10, '#3b4250'); F(g, 10, 23, 12, 2, '#3b4250'); F(g, 10, 23, 12, 1, '#5c6570');
    ELL(g, 16, 12, 12, 4, '#a86e38'); ELL(g, 16, 11, 12, 3, '#c99458'); ELL(g, 16, 11, 9, 2, '#d8a870'); F(g, 8, 13, 16, 1, '#6b4223');
    // banquitos
    for (var s = 0; s < 2; s++) { var sx = s ? 25 : 1; F(g, sx, 17, 6, 2, '#c99458'); F(g, sx, 17, 6, 1, '#e0b078'); F(g, sx + 1, 19, 1, 6, '#3b4250'); F(g, sx + 4, 19, 1, 6, '#3b4250'); }
    F(g, 13, 7, 3, 4, '#d9e8ea'); F(g, 14, 8, 1, 2, '#e0242b'); F(g, 20, 8, 2, 3, '#f3efe2');     // vaso y carta
    outline(g, K);
    return mk(g, 16, 25, 24, 8, { cast: { len: 0.3 }, p: { } });
  }
  F(g, 6, 20, 20, 3, '#a86e38'); F(g, 6, 20, 20, 1, '#c99458'); F(g, 22, 12, 2, 10, '#3b4250'); LN(g, 24, 12, 28, 6, '#3b4250');
  F(g, 2, 24, 10, 2, '#c99458'); F(g, 20, 25, 8, 2, '#c99458'); F(g, 14, 17, 1, 3, '#d9e8ea'); P(g, 11, 23, '#d9e8ea'); P(g, 17, 24, '#d9e8ea'); P(g, 21, 23, '#d9e8ea');
  outline(g, K);
  return mk(g, 16, 26, 22, 6, { cast: { len: 0.2 } });
}
function propBar() {
  var W = 112, H = 78, g = new G(W, H), i, j, r = px.rng(9601);
  var bx = 8, bw = 96, by = 38, bh = 26;
  // estructura superior: marquesina con repisa de botellas y letrero
  F(g, bx + 6, 4, bw - 12, 3, '#17171c'); F(g, bx + 6, 4, bw - 12, 1, '#4a4858');
  for (i = bx + 10; i < bx + bw - 10; i += 20) { F(g, i, 7, 2, 28, '#3b4250'); F(g, i, 7, 1, 28, '#5c6570'); }
  F(g, bx + 8, 22, bw - 16, 12, '#2a1a14');                                                              // contrafondo
  for (j = 0; j < 2; j++) { var sy = 24 + j * 6; F(g, bx + 8, sy + 4, bw - 16, 1, '#c99458'); for (i = bx + 10; i < bx + bw - 10; i += 2) if (r() < 0.82) { var c = pick(r, ['#1F862C', '#c0261c', '#e6c85a', '#3f72b0', '#f3efe2', '#8a4a22']); F(g, i, sy, 1, 4, c); P(g, i, sy - 1, lt(c, 0.4)); } }
  for (i = bx + 10; i < bx + bw - 12; i += 12) lampPend(g, i + 2, 7, 3 + ((r() * 3) | 0), '#ffcf8a');
  F(g, bx + (bw >> 1) - 22, 8, 44, 11, '#101014'); FR(g, bx + (bw >> 1) - 22, 8, 44, 11, '#ff8f7a');
  txt(g, 'ISOLA BAR', bx + (bw >> 1), 11, 'a7', '#9fe0e0', { shadow: '#2a5a5e' });
  // barra
  F(g, bx, by, bw, bh, '#4a2a1c'); F(g, bx, by, bw, 4, '#e6b060'); F(g, bx, by, bw, 1, '#fff0c0'); F(g, bx, by + 4, bw, 1, '#a8693a');
  for (i = bx + 2; i < bx + bw - 2; i += 4) { F(g, i, by + 6, 2, bh - 8, '#6b4223'); F(g, i, by + 6, 1, bh - 8, '#8a5a30'); }
  F(g, bx, by + bh - 2, bw, 2, '#17120e'); F(g, bx, by, 2, bh, '#c99458'); F(g, bx + bw - 2, by, 2, bh, '#6a4a2a');
  for (i = bx + 8; i < bx + bw - 12; i += 16) { F(g, i, by + 10, 8, 3, '#ffcf8a'); F(g, i + 1, by + 11, 6, 1, '#fff0c0'); }
  for (i = bx + 6; i < bx + bw - 6; i += 9) { F(g, i, by - 5, 2, 5, pick(r, ['#f3efe2', '#e6c85a', '#c0261c'])); }
  // taburetes
  for (i = bx + 6; i < bx + bw - 6; i += 12) { F(g, i, by + bh + 2, 6, 2, '#c0261c'); F(g, i, by + bh + 2, 6, 1, '#e8604a'); F(g, i + 2, by + bh + 4, 2, 5, '#3b4250'); F(g, i, by + bh + 9, 6, 1, '#3b4250'); }
  outline(g, K);
  return mk(g, W >> 1, by + bh + 9, 100, 16, { cast: { len: 0.25 }, p: { tall: true } });
}
function propFarolRojo() {
  var W = 22, H = 84, g = new G(W, H), i;
  F(g, 9, 24, 3, 56, '#2a1a1e'); F(g, 9, 24, 1, 56, '#4a3a3e'); F(g, 7, 76, 7, 4, '#3a2a2e'); F(g, 7, 76, 7, 1, '#5a4a4e');
  for (i = 40; i < 76; i += 12) { F(g, 8, i, 5, 1, GOLD[2]); }
  F(g, 4, 22, 13, 2, GOLD[2]); F(g, 4, 22, 13, 1, GOLD[4]); F(g, 10, 18, 1, 4, GOLD[1]);
  // farol grande
  F(g, 6, 8, 9, 2, GOLD[3]); F(g, 4, 10, 13, 10, RED[3]); F(g, 3, 12, 15, 6, RED[3]); F(g, 5, 10, 3, 9, RED[4]); F(g, 16, 11, 1, 8, RED[1]); F(g, 4, 10, 13, 1, GOLD[3]); F(g, 4, 19, 13, 1, GOLD[3]);
  F(g, 8, 12, 5, 5, '#ffcf6a'); F(g, 9, 13, 3, 3, '#fff4d8'); P(g, 10, 14, GOLD[0]);
  F(g, 9, 4, 3, 4, GOLD[2]); F(g, 10, 2, 1, 3, GOLD[1]);
  for (i = 7; i < 15; i += 2) F(g, i, 20, 1, 3, GOLD[3]);
  F(g, 10, 20, 1, 4, GOLD[2]);
  outline(g, K);
  return mk(g, 10, 79, 8, 4, { cast: { len: 0.2 }, p: { tall: true, lamp: { x: 0, y: -66 } } });
}
function propMesaRedonda(broken) {
  var W = 52, H = 44, g = new G(W, H), i;
  var cx = 26, cy = 24;
  var chairs = [[6, 20], [40, 20], [16, 10], [30, 10]];
  if (!broken) {
    chairs.slice(2).forEach(function (c) { F(g, c[0], c[1], 6, 8, '#6a0c0e'); F(g, c[0], c[1], 6, 2, '#c0261c'); F(g, c[0] + 1, c[1] + 2, 4, 3, '#9a1410'); });
    ELL(g, cx, cy + 5, 17, 6, '#a8a294'); F(g, cx - 17, cy + 5, 35, 4, '#a8a294');                           // faldon
    ELL(g, cx, cy + 2, 18, 8, '#f3efe2'); ELL(g, cx, cy + 1, 17, 7, '#ffffff'); ELL(g, cx, cy + 1, 16, 6, '#f6efe0');
    for (i = -14; i < 15; i += 2) { P(g, cx + i, cy + 8 - Math.round(Math.abs(i) * 0.02), '#c0261c'); }
    ELL(g, cx, cy + 1, 9, 4, '#9a1410'); ELL(g, cx, cy, 8, 3, '#c0261c'); ELL(g, cx, cy - 1, 4, 1, '#e8604a');                  // giratorio
    for (i = 0; i < 6; i++) { var a = i * 1.047; P(g, cx + Math.round(Math.cos(a) * 6), cy + Math.round(Math.sin(a) * 2), pick(px.rng(i + 3), ['#f0c040', '#f3efe2', '#1F862C', '#e8731a'])); }
    F(g, cx - 2, cy - 5, 4, 3, '#f3efe2'); F(g, cx - 1, cy - 7, 2, 2, '#c99458'); P(g, cx + 2, cy - 4, '#f3efe2');
    chairs.slice(0, 2).forEach(function (c) { F(g, c[0], c[1], 6, 8, '#6a0c0e'); F(g, c[0], c[1], 6, 2, '#c0261c'); F(g, c[0] + 1, c[1] + 2, 4, 3, '#9a1410'); F(g, c[0] + 1, c[1] + 8, 1, 6, '#3a2a2e'); F(g, c[0] + 4, c[1] + 8, 1, 6, '#3a2a2e'); });
    outline(g, K);
    return mk(g, cx, 38, 40, 10, { cast: { len: 0.25 }, p: { } });
  }
  ELL(g, cx, cy + 6, 16, 5, '#f3efe2'); ELL(g, cx, cy + 5, 15, 4, '#e6dfcf'); LN(g, 12, 26, 40, 32, '#c0261c');
  for (i = 0; i < 12; i++) P(g, 10 + i * 3, 24 + (i * 7) % 9, pick(px.rng(i + 9), ['#f0c040', '#f3efe2', '#c0261c', '#1F862C']));
  F(g, 20, 30, 10, 5, '#c0261c'); F(g, 6, 30, 6, 8, '#6a0c0e'); F(g, 40, 32, 6, 6, '#6a0c0e');
  outline(g, K);
  return mk(g, cx, 38, 36, 8, { cast: { len: 0.15 } });
}
function propPecera(broken) {
  var W = 34, H = 44, g = new G(W, H), i, r = px.rng(9701);
  F(g, 3, 28, 28, 14, '#4a2a1c'); F(g, 3, 28, 28, 2, '#8a5a30'); F(g, 3, 28, 1, 14, '#6b4223'); F(g, 5, 31, 11, 9, '#3a2014'); F(g, 18, 31, 11, 9, '#3a2014'); F(g, 5, 31, 11, 1, '#6b4223'); F(g, 18, 31, 11, 1, '#6b4223');
  P(g, 14, 34, GOLD[3]); P(g, 20, 34, GOLD[3]);
  F(g, 3, 40, 28, 2, '#2a1a14');
  if (!broken) {
    F(g, 3, 6, 28, 22, '#8fd0e0'); vgrad(g, 4, 7, 26, 20, ['#a8e4ec', '#6fc0d4', '#3f90a8', '#2a6a82']);
    F(g, 4, 24, 26, 3, '#d6c08a'); speck(g, 4, 24, 26, 3, r, 10, ['#a8956e', '#f3efe2']);
    F(g, 7, 17, 1, 7, '#2f8a3c'); F(g, 8, 19, 1, 5, '#58a850'); F(g, 24, 15, 1, 9, '#2f8a3c'); F(g, 25, 18, 1, 6, '#58a850'); P(g, 23, 17, '#58a850');
    ELL(g, 14, 12, 3, 2, '#ff8a2a'); P(g, 18, 12, '#ff8a2a'); P(g, 12, 11, K); F(g, 19, 11, 2, 1, '#ff8a2a');
    ELL(g, 23, 19, 2, 1, '#f3efe2'); P(g, 21, 19, '#f3efe2'); ELL(g, 11, 20, 2, 1, '#f0c040'); P(g, 13, 20, '#f0c040'); ELL(g, 20, 9, 2, 1, '#e0242b');
    P(g, 6, 11, '#ffffffcc'); P(g, 6, 8, '#ffffffcc'); P(g, 28, 14, '#ffffffcc');
    F(g, 3, 6, 28, 1, '#e8f8ff'); F(g, 3, 6, 1, 22, '#d8f4ff'); LN(g, 8, 25, 14, 9, '#ffffff66');
    F(g, 2, 3, 30, 3, '#2a2a30'); F(g, 2, 3, 30, 1, '#5c6570'); F(g, 8, 2, 18, 1, '#fff4d8');       // tapa con luz
    outline(g, K);
    return mk(g, 17, 41, 28, 8, { cast: { len: 0.3 }, p: { tall: true } });
  }
  F(g, 3, 6, 3, 22, '#8fd0e044'); F(g, 28, 6, 3, 22, '#8fd0e044'); F(g, 3, 6, 28, 1, '#8fd0e077');
  LN(g, 5, 6, 12, 16, '#d8f4ff'); LN(g, 12, 16, 8, 24, '#d8f4ff'); LN(g, 29, 8, 21, 20, '#d8f4ff');
  F(g, 5, 24, 24, 3, '#d6c08a'); F(g, 2, 42, 30, 2, '#3f90a8'); F(g, 6, 44 - 1, 22, 1, '#6fc0d4');
  ELL(g, 14, 40, 2, 1, '#ff8a2a'); F(g, 2, 3, 30, 3, '#2a2a30'); F(g, 2, 3, 8, 1, '#5c6570');
  outline(g, K);
  return mk(g, 17, 41, 28, 8, { cast: { len: 0.2 } });
}
function propReja(open) {
  var W = 72, H = 60, g = new G(W, H), i, j;
  var gx = 4, gw = 64;
  F(g, gx - 3, 6, gw + 6, 4, GOLD[2]); F(g, gx - 3, 6, gw + 6, 1, GOLD[4]); F(g, gx - 3, 9, gw + 6, 1, GOLD[0]);
  for (i = gx; i < gx + gw; i += 6) { P(g, i + 1, 7, RED[3]); P(g, i + 2, 7, RED[3]); }
  F(g, gx - 2, 10, 5, 46, RED[3]); F(g, gx - 2, 10, 2, 46, RED[4]); F(g, gx + 2, 10, 1, 46, RED[1]);
  F(g, gx + gw - 3, 10, 5, 46, RED[3]); F(g, gx + gw - 3, 10, 2, 46, RED[4]); F(g, gx + gw + 1, 10, 1, 46, RED[1]);
  F(g, gx - 3, 54, 7, 4, '#a8a294'); F(g, gx + gw - 4, 54, 7, 4, '#a8a294');
  var hw = (gw - 6) >> 1;
  if (!open) {
    F(g, gx + 3, 10, gw - 6, 46, '#2a0a08');
    for (var h2 = 0; h2 < 2; h2++) {
      var hx = gx + 3 + h2 * hw;
      F(g, hx, 11, hw, 44, RED[3]); F(g, hx, 11, hw, 1, RED[4]); F(g, hx + (h2 ? hw - 1 : 0), 11, 1, 44, h2 ? RED[1] : RED[4]);
      for (j = 0; j < 5; j++) for (i = 0; i < 5; i++) { P(g, hx + 4 + i * 5, 22 + j * 6, GOLD[4]); P(g, hx + 5 + i * 5, 22 + j * 6, GOLD[2]); P(g, hx + 4 + i * 5, 23 + j * 6, GOLD[1]); }
      dragonHead(g, hx + (hw >> 1) + 1, 12, false);
      F(g, hx + (h2 ? 2 : hw - 6), 33, 4, 4, GOLD[2]); P(g, hx + (h2 ? 3 : hw - 5), 34, GOLD[4]);
      F(g, hx, 51, hw, 4, RED[1]);
    }
    F(g, gx + 3 + hw - 1, 10, 2, 46, GOLD[1]);
    F(g, gx + 3 + hw - 4, 33, 8, 2, '#8c8a93'); F(g, gx + 3 + hw - 1, 31, 2, 6, '#cfd3cc');          // candado
  } else {
    F(g, gx + 3, 10, gw - 6, 46, '#1a0606'); vgrad(g, gx + 3, 10, gw - 6, 46, ['#2a0a08', '#4a1410', '#6a2418']);
    for (j = 0; j < 8; j++) F(g, gx + 8, 36 + j * 2, gw - 16, 1, j % 2 ? '#a8a294' : '#d6d1b8');
    for (j = 0; j < 2; j++) { var ow = j ? gx + gw - 3 - 5 : gx + 3; F(g, ow, 11, 5, 44, RED[3]); F(g, ow, 11, 1, 44, RED[4]); F(g, ow + 4, 11, 1, 44, RED[1]); for (i = 0; i < 6; i++) P(g, ow + 2, 18 + i * 6, GOLD[3]); }
    for (i = 8; i < gw - 8; i += 14) lantern(g, gx + i, 12);
  }
  outline(g, K);
  return mk(g, W >> 1, 57, 64, 5, { cast: { len: 0.2 }, p: { tall: true } });
}
function propTandem() {
  var W = 66, H = 60, g = new G(W, H), i, j, hx = 2, hw = 46;
  // mastil con manga de viento
  F(g, 56, 4, 1, 28, '#cfd3cc'); F(g, 55, 32, 3, 1, '#8c8a93');
  for (i = 0; i < 9; i++) { var c = (i & 1) ? '#f3efe2' : '#ff7a1a'; F(g, 57 + i, 5 + (i > 5 ? 1 : 0), 1, 4 - (i >> 2), c); }
  // caseta de madera con techo inclinado de calamina
  F(g, hx + 1, 30, hw - 2, 25, '#c99458'); F(g, hx + 1, 30, hw - 2, 1, '#e0b078'); F(g, hx + 1, 30, 1, 25, '#e0b078'); F(g, hx + hw - 2, 30, 1, 25, '#8a5a30');
  for (i = hx + 4; i < hx + hw - 2; i += 4) F(g, i, 31, 1, 24, '#a8693a');
  for (j = 0; j < 8; j++) F(g, hx - 1 + j, 22 + j, hw + 2 - j, 1, j % 2 ? '#b0302a' : '#d9503a');
  F(g, hx - 1, 22, hw + 2, 1, '#f0a08a'); F(g, hx - 2, 29, hw + 4, 2, '#6a0c0e'); F(g, hx - 2, 29, hw + 4, 1, '#9a1410');
  for (i = hx + 2; i < hx + hw; i += 3) P(g, i, 24 + ((i / 3 | 0) & 1), '#8a1a14');
  // letrero amarillo
  F(g, hx + 3, 32, hw - 6, 9, '#f2c230'); FR(g, hx + 3, 32, hw - 6, 9, '#6a4a0a'); txt(g, 'PARAPENTE', hx + (hw >> 1), 34, 'a5', '#6a0c0e');
  txt(g, 'TANDEM', hx + (hw >> 1), 42, 'a5', '#f3efe2', { shadow: '#2a2440' });
  // ventana de atencion + mostrador
  F(g, hx + 6, 48, hw - 12, 5, '#4d6676'); F(g, hx + 6, 48, hw - 12, 1, '#8fb0b8'); F(g, hx + 2, 53, hw - 4, 3, '#6b4223'); F(g, hx + 2, 53, hw - 4, 1, '#c99458');
  // equipo: ala enrollada y mochila-arnes
  F(g, 50, 46, 12, 4, '#2f72b0'); F(g, 50, 46, 12, 1, '#6aa0d8'); F(g, 50, 50, 12, 3, '#e0242b'); F(g, 60, 46, 2, 7, '#1c1a22');
  F(g, 51, 53, 8, 4, '#f2c230'); F(g, 51, 53, 8, 1, '#fff4d8'); F(g, 53, 51, 1, 2, '#1c1a22'); F(g, 57, 51, 1, 2, '#1c1a22');
  outline(g, K);
  return mk(g, 26, 56, 44, 8, { cast: { len: 0.3 }, p: { tall: true } });
}
function propVaporera() {
  var W = 34, H = 50, g = new G(W, H), i, j;
  // olla base
  F(g, 3, 40, 28, 7, '#5c6570'); F(g, 3, 40, 28, 1, '#cfd3cc'); F(g, 3, 40, 3, 7, '#a4abaa'); F(g, 28, 40, 3, 7, '#3b4250'); F(g, 5, 47, 24, 1, '#3b4250');
  P(g, 1, 42, '#8c8a93'); P(g, 32, 42, '#8c8a93');
  // tres cestas de bambu
  for (j = 0; j < 3; j++) {
    var y = 31 - j * 9;
    F(g, 4, y, 26, 9, '#c99458'); F(g, 4, y, 26, 1, '#e8c48a'); F(g, 4, y, 2, 9, '#e0b078'); F(g, 28, y, 2, 9, '#8a5a30');
    for (i = 6; i < 28; i += 3) F(g, i, y + 1, 1, 8, '#a8693a');
    F(g, 3, y + 3, 28, 1, '#6b4223'); F(g, 3, y + 7, 28, 1, '#6b4223'); F(g, 4, y + 8, 26, 1, '#8a5a30');
  }
  // tapa conica
  F(g, 5, 11, 24, 1, '#8a5a30'); F(g, 7, 10, 20, 1, '#c99458'); F(g, 9, 9, 16, 1, '#d8a870'); F(g, 11, 8, 12, 1, '#e0b078'); F(g, 13, 7, 8, 1, '#e8c48a'); F(g, 15, 6, 4, 1, '#f3d4a0'); F(g, 16, 4, 2, 2, '#6b4223');
  // vapor
  for (i = 0; i < 7; i++) { P(g, 12 + (i % 3) * 3 + (i >> 2), 2 - ((i * 5) % 3) - (i >> 1), '#ffffffcc'); }
  P(g, 14, 1, '#ffffff99'); P(g, 20, 0, '#ffffff77');
  outline(g, K);
  return mk(g, 17, 46, 26, 8, { cast: { len: 0.3 }, p: { tall: true, smoke: { x: 0, y: -44 } } });
}


/* ======================== LADO TIERRA: lotes cv_torre / cv_casona / cv_hotel ======================== */
/* Misma forma que los lotes de Miraflores: function (ficha) -> { canvas, over, overX, overY, lights }
   Ficha: side 'N' (azotea arriba + cara sur abajo) | 'S' (solo azotea), c0 c1 r0 r1, seed, floors, face (tiles de cara), name, color. */
var TEAL = ['#10343a', '#1c5558', '#2c8588', '#4cadaa', '#8ee0d0'], GD = ['#6a4a08', '#a07810', '#d4a626', '#f0cc50', '#fff0a8'];
function mkLot(f) {
  var W = (f.c1 - f.c0 + 1) * 16, H = (f.r1 - f.r0 + 1) * 16, seed = (f.seed | 0) || 1234;
  return { f: f, W: W, H: H, rows: f.r1 - f.r0 + 1, g: new G(W, H), side: f.side === 'S' ? 'S' : 'N', seed: seed, rnd: px.rng(seed * 7919 + 13), r2: px.rng(seed * 104729 + 5), lights: [] };
}
function lot(c, x, y, w, h, kind) { var L = { x: Math.round(x), y: Math.round(y), kind: kind || 'local' }; if (w > 0) { L.w = w; L.h = h; } c.lights.push(L); }
function lotFace(c, def) {
  var ft = c.f.face || def || px.faceTiles(c.f);
  ft = Math.max(3, Math.min(ft, c.rows));
  c.faceH = ft * 16; c.faceY = c.H - c.faceH; c.gTop = c.H - 48;
}
function lotDone(c) { return { canvas: c.g.toCanvas(), over: null, overX: 0, overY: 0, lights: c.lights }; }

/* ---- azotea ---- */
function roofFill(g, x, y, w, h, rnd, base) {
  var A = ramp(base || '#7d7c80');
  F(g, x, y, w, h, A[2]); speck(g, x, y, w, h, rnd, w * h / 28, [A[1], A[3]]);
  for (var i = 12; i < w; i += 24) F(g, x + i, y, 1, h, A[1]);
  for (var j = 14; j < h; j += 22) F(g, x, y + j, w, 1, A[1]);
}
function parapetTop(g, W, rows, A) {                               // borde norte visto por dentro y laterales (azotea que se ve desde el sur)
  F(g, 0, 0, W, 2, A[4]); F(g, 0, 2, W, 4, A[2]); F(g, 0, 2, W, 1, A[3]); F(g, 0, 5, W, 1, A[1]); AO(g, 0, 6, W, 1, 0.45); AO(g, 0, 7, W, 2, 0.25);
  F(g, 0, 0, 3, rows, A[3]); F(g, 0, 0, 1, rows, A[4]); F(g, W - 3, 0, 3, rows, A[1]); F(g, W - 1, 0, 1, rows, A[0]);
}
function parapetFrontAt(g, W, y0, A) { F(g, 0, y0, W, 1, A[4]); F(g, 0, y0 + 1, W, 1, A[3]); F(g, 0, y0 + 2, W, 3, A[2]); F(g, 0, y0 + 5, W, 1, A[1]); }
function tank(g, x, y) {                                           // tanque de agua cilindrico 12 x 16 (y = base)
  F(g, x - 6, y - 16, 12, 16, '#c8c4b4'); F(g, x - 6, y - 16, 2, 16, '#e6e2d4'); F(g, x + 4, y - 16, 2, 16, '#8c8a93'); F(g, x - 6, y - 16, 12, 2, '#e6e2d4');
  ELL(g, x, y - 17, 6, 2, '#a8a79b'); F(g, x - 6, y - 8, 12, 1, '#9a978a'); F(g, x - 6, y - 1, 12, 1, '#6a6a72'); AO(g, x + 6, y, 8, 3, 0.35);
}
function acUnit(g, x, y) { F(g, x, y - 8, 14, 8, '#b8b8b0'); F(g, x, y - 8, 14, 1, '#dedcd0'); F(g, x, y - 1, 14, 1, '#6a6a72'); DISC(g, x + 7, y - 4, 3, '#4a4a52'); DISC(g, x + 7, y - 4, 1, '#8a8a90'); F(g, x + 13, y - 8, 1, 8, '#8c8a93'); AO(g, x + 14, y, 4, 2, 0.3); }
function stairBox(g, x, y, A) { F(g, x, y - 18, 22, 18, A[3]); F(g, x, y - 18, 22, 3, A[4]); F(g, x, y - 18, 2, 18, A[4]); F(g, x + 20, y - 18, 2, 18, A[1]); F(g, x + 5, y - 11, 7, 11, '#2a2024'); F(g, x + 5, y - 11, 7, 1, '#6b4223'); F(g, x, y - 1, 22, 1, A[0]); AO(g, x + 22, y, 6, 3, 0.35); }
function antenna(g, x, y) { F(g, x, y - 30, 1, 30, '#8c8a93'); F(g, x - 4, y - 24, 9, 1, '#8c8a93'); F(g, x - 3, y - 18, 7, 1, '#8c8a93'); F(g, x - 2, y - 12, 5, 1, '#8c8a93'); P(g, x, y - 31, '#ff4040'); P(g, x, y - 32, '#ffa0a0'); }
function solar(g, x, y) { F(g, x, y - 9, 12, 7, '#2f5a80'); F(g, x, y - 9, 12, 1, '#8fb0d0'); for (var i = 3; i < 12; i += 3) F(g, x + i, y - 8, 1, 6, '#1f3a5c'); F(g, x + 1, y - 2, 2, 3, '#8c8a93'); F(g, x + 9, y - 2, 2, 3, '#8c8a93'); F(g, x + 3, y - 12, 6, 3, '#e6e2d4'); }
function roofBits(c, top, bot, A, extra) {
  var g = c.g, W = c.W, rnd = c.r2, placed = [], fns = [
    { h: 20, w: 8, f: function (x, y) { tank(g, x, y); } },
    { h: 10, w: 9, f: function (x, y) { acUnit(g, x - 7, y); } },
    { h: 20, w: 15, f: function (x, y) { stairBox(g, x - 11, y, A); } },
    { h: 34, w: 5, f: function (x, y) { antenna(g, x, y); } },
    { h: 14, w: 8, f: function (x, y) { solar(g, x - 6, y); } }
  ], room = bot - top, n = clamp(Math.floor(W * Math.max(0, room) / 2400), 1, 6), t;
  if (room < 12 || W < 40) return placed;
  for (var k = 0; k < n; k++) {
    var pool = fns.filter(function (q) { return q.h + 4 <= room; }); if (!pool.length) break;
    var fn = (extra && k < extra.length && fns[extra[k]].h + 4 <= room) ? fns[extra[k]] : pool[(rnd() * pool.length) | 0];
    for (t = 0; t < 24; t++) {
      var x = 14 + ((rnd() * (W - 28)) | 0), y = top + fn.h + ((rnd() * Math.max(1, room - fn.h)) | 0), ok = true;
      var r = [x - fn.w - 3, y - fn.h - 1, x + fn.w + 6, y + 4];
      for (var i = 0; i < placed.length; i++) { var p = placed[i]; if (r[0] < p[2] && r[2] > p[0] && r[1] < p[3] && r[3] > p[1]) { ok = false; break; } }
      if (ok) { placed.push(r); fn.f(x, y); break; }
    }
  }
  return placed;
}

/* ---- fachada de vidrio teal con franjas doradas ---- */
function tealWall(c, x0, y0, w, h, floors, o) {
  o = o || {};
  var g = c.g, rnd = c.r2, n = clamp(floors, 3, 40), pitch = clamp(Math.floor(h / n), 6, 14), cnt = Math.floor(h / pitch), rem = h - cnt * pitch, i, j, x;
  F(g, x0, y0, w, h, TEAL[2]);
  var curve = !!o.curve, mull = o.mull || 8;
  for (i = 0; i < cnt; i++) {
    var y = y0 + rem + i * pitch, gy = y, gh = pitch - 2;
    vgrad(g, x0, gy, w, gh, [TEAL[3], TEAL[2], TEAL[2], TEAL[1]]);
    F(g, x0, y + pitch - 2, w, 2, GD[1]); F(g, x0, y + pitch - 2, w, 1, GD[3]);                 // antepecho dorado
  }
  // montantes (en curva: se juntan hacia los bordes)
  for (x = 0; x < w; x++) {
    var u = x / Math.max(1, w - 1), pos = curve ? Math.round(Math.sin((u - 0.5) * 2.4) * (w * 0.5) / Math.sin(1.2) + w * 0.5) : x;
    if (curve) { if (x > 0 && Math.round(Math.sin(((x - 1) / (w - 1) - 0.5) * 2.4) * (w * 0.5) / Math.sin(1.2) + w * 0.5) === pos) continue; }
    if ((curve ? Math.floor(pos / mull) !== Math.floor((pos - 1) / mull) : (x % mull === 0))) F(g, x0 + x, y0, 1, h, TEAL[1]);
  }
  // franjas doradas verticales
  var gs = o.gold || 28, off = o.goff === undefined ? 14 : o.goff;
  for (x = off; x < w - 2; x += gs) { F(g, x0 + x, y0, 2, h, GD[2]); F(g, x0 + x, y0, 1, h, GD[4]); }
  // nubes reflejadas y destellos
  for (j = 0; j < Math.max(2, w / 40); j++) { var cx = x0 + (rnd() * w) | 0, cy = y0 + (rnd() * h * 0.6) | 0; ELL(g, cx, cy, 7 + ((rnd() * 6) | 0), 2, mx(TEAL[3], TEAL[4], 0.5)); }
  for (j = 0; j < w / 14; j++) { var dx = x0 + ((rnd() * w) | 0), dy = y0 + 8 + ((rnd() * (h - 12)) | 0); for (i = 0; i < 6; i++) P(g, dx + i, dy - i, TEAL[4]); }
  // algunas ventanas con luz
  for (j = 0; j < Math.max(2, (w * h) / 700); j++) {
    var fi = (rnd() * cnt) | 0, lx = 1 + (((rnd() * (w - 8)) / mull) | 0) * mull + 1, ly = y0 + rem + fi * pitch + 1;
    F(g, x0 + lx, ly, mull - 1, pitch - 4, '#ffd98a'); F(g, x0 + lx, ly, mull - 1, 1, '#fff0c0');
    if (j < 3) lot(c, x0 + lx + 3, ly + 2, 0, 0, 'foco');
  }
  F(g, x0, y0, 2, h, TEAL[4]); F(g, x0 + 2, y0, 1, h, TEAL[3]);
  F(g, x0 + w - 3, y0, 3, h, TEAL[0]); F(g, x0 + w - 5, y0, 2, h, TEAL[1]);
  if (curve) {                                                        // sombreado cilindrico
    for (x = 0; x < w; x++) { var uu = x / (w - 1), t = uu < 0.3 ? 0 : (uu - 0.3) * 0.7; if (t > 0) AO(g, x0 + x, y0, 1, h, t * 0.55); }
    LI(g, x0 + 3, y0, Math.floor(w * 0.18), h, 0.12);
  }
}
function lobby(c, y0, name, o) {                                    // planta baja (48 px): zocalo de granito, vidrio oscuro, marquesina dorada, puertas y macetas
  o = o || {};
  var g = c.g, W = c.W, H = c.H, i, cx = W >> 1;
  F(g, 0, y0, W, 48, '#2a3a3e'); F(g, 0, y0, W, 2, GD[2]); F(g, 0, y0, W, 1, GD[4]); F(g, 0, y0 + 2, W, 1, GD[0]);
  var dW = Math.min(o.doorW || 36, W - 20);
  // vidrio oscuro con columnas doradas
  for (i = 0; i < W; i += 22) { F(g, i, y0 + 3, 3, 45, GD[2]); F(g, i, y0 + 3, 1, 45, GD[4]); F(g, i + 2, y0 + 3, 1, 45, GD[0]); }
  F(g, W - 3, y0 + 3, 3, 45, GD[2]);
  for (i = 3; i < W - 3; i += 22) { var gw = Math.min(19, W - 3 - i); if (gw > 2) { vgrad(g, i, y0 + 6, gw, 36, ['#1c3a44', '#2a5260', '#345e6a', '#1c3a44']); LN(g, i + 3, y0 + 36, i + 11, y0 + 10, '#6aa8b0'); } }
  // entrada
  var dx = cx - (dW >> 1);
  F(g, dx - 3, y0 + 5, dW + 6, 43, GD[1]); vgrad(g, dx, y0 + 9, dW, 36, ['#ffe6a8', '#f0c070', '#c88a40']);
  for (i = 0; i < 3; i++) F(g, dx + 3 + i * Math.floor((dW - 6) / 3), y0 + 9, 1, 36, GD[1]);
  F(g, dx, y0 + 9, dW, 2, GD[3]);
  for (i = 0; i < 3; i++) { F(g, dx + 6 + i * 9, y0 + 28, 2, 12, '#2a2024'); DISC(g, dx + 7 + i * 9, y0 + 26, 2, '#2a2024'); }
  LN(g, dx + 4, y0 + 44, dx + 12, y0 + 12, '#fff4d8');
  lot(c, cx, y0 + 28, dW, 36, 'local');
  // marquesina
  var mw = Math.min(W - 6, dW + 40), mxx = cx - (mw >> 1);
  F(g, mxx, y0 + 1, mw, 5, GD[2]); F(g, mxx, y0 + 1, mw, 1, GD[4]); F(g, mxx, y0 + 5, mw, 1, GD[0]); AO(g, mxx + 2, y0 + 6, mw, 4, 0.4);
  for (i = mxx + 3; i < mxx + mw - 3; i += 5) P(g, i, y0 + 3, '#fff8d0');
  if (name) { var f = tw(name, 'a5') + 6 <= mw ? 'a5' : null; if (f) { F(g, cx - (tw(name, 'a5') >> 1) - 3, y0 + 11, tw(name, 'a5') + 6, 8, '#101418'); FR(g, cx - (tw(name, 'a5') >> 1) - 3, y0 + 11, tw(name, 'a5') + 6, 8, GD[2]); txt(g, name, cx, y0 + 13, 'a5', GD[4]); } }
  // macetas con arbusto
  [dx - 16, dx + dW + 4].forEach(function (x) { if (x > 2 && x < W - 14) { F(g, x, y0 + 36, 12, 12, '#a89c80'); F(g, x, y0 + 36, 12, 2, '#d8ccb0'); ELL(g, x + 6, y0 + 33, 6, 5, '#3f8a40'); ELL(g, x + 5, y0 + 31, 4, 3, '#58a850'); } });
  F(g, 0, H - 4, W, 4, '#6a6a70'); F(g, 0, H - 4, W, 1, '#a8a79b'); F(g, dx - 4, H - 3, dW + 8, 3, '#b8b3a2');
  lot(c, cx, y0 + 10, 0, 0, 'foco');
}
function pintedWall(c, x0, y0, w, h, floors, base, o) {              // torre pintada con balcones corridos
  var g = c.g, rnd = c.r2, A = ramp(base), n = clamp(floors, 3, 40), pitch = clamp(Math.floor(h / n), 8, 16), cnt = Math.floor(h / pitch), rem = h - cnt * pitch, i, x;
  F(g, x0, y0, w, h, A[2]); speck(g, x0, y0, w, h, rnd, w * h / 26, [A[1], A[3]]);
  for (i = 0; i < cnt; i++) {
    var y = y0 + rem + i * pitch;
    F(g, x0, y + pitch - 3, w, 3, A[4]); F(g, x0, y + pitch - 3, w, 1, '#ffffff'); AO(g, x0, y + pitch, w, 1, 0.3);
    for (x = 5; x + 9 < w - 3; x += 16) {
      var lit = rnd() < 0.1, ww = 9;
      F(g, x - 1, y + 2, ww + 2, pitch - 6, A[0]); vgrad(g, x, y + 3, ww, pitch - 8, lit ? ['#ffd98a', '#d89a4a'] : [GLS[3], GLS[2]]);
      F(g, x + (ww >> 1), y + 3, 1, pitch - 8, A[0]);
      if (lit) lot(c, x + 4, y + 5, 0, 0, 'foco');
      if (rnd() < 0.35) { F(g, x - 2, y + pitch - 7, ww + 4, 4, '#f3efe2'); F(g, x - 2, y + pitch - 7, ww + 4, 1, '#ffffff'); for (var q = x - 1; q < x + ww + 1; q += 2) F(g, q, y + pitch - 6, 1, 3, A[1]); }
    }
  }
  if (o && o.boxes) { for (i = 0; i < 2; i++) { var bx = 8 + ((rnd() * (w - 34)) | 0), by = y0 + ((rnd() * (h - 30)) | 0); F(g, bx, by, 22, 20, A[3]); F(g, bx, by, 22, 2, A[4]); F(g, bx + 22, by, 2, 20, A[1]); F(g, bx + 4, by + 5, 14, 10, GLS[2]); FR(g, bx + 3, by + 4, 16, 12, A[0]); } }
  F(g, x0, y0, 2, h, A[4]); F(g, x0, y0, 1, h, '#ffffff'); F(g, x0 + w - 3, y0, 3, h, A[1]); F(g, x0 + w - 1, y0, 1, h, A[0]);
}

function torreN(c) {
  var g = c.g, W = c.W, H = c.H, f = c.f, kind = f.color || 'teal', glass = (kind === 'teal' || kind === 'vidrio');
  lotFace(c, Math.max(3, Math.min(c.rows, c.rows >= 8 ? c.rows - 2 : c.rows)));
  var fy = c.faceY, gT = c.gTop, shaft = gT - fy, base = { crema: '#e0d2b0', salmon: '#e0a890', blanco: '#e8e6e0', azul: '#9fb8d0', gris: '#a8a8a8' }[kind] || '#e0d2b0';
  var A = glass ? ramp('#6a7a7a') : ramp(base);
  if (fy > 0) {
    roofFill(g, 0, 0, W, fy, c.r2); if (fy >= 26) parapetTop(g, W, fy - 6, A); if (fy >= 8) parapetFrontAt(g, W, fy - 6, A);
    roofBits(c, 6, fy - 8, A);
    if (fy >= 20) [[7, 8], [W - 9, 8]].forEach(function (p) { F(g, p[0], p[1], 2, 2, '#ff4040'); lot(c, p[0], p[1], 0, 0, 'foco'); });
  }
  if (shaft > 6) {
    if (glass) {
      tealWall(c, 0, fy, W, shaft, f.floors || 12, {});
      F(g, 0, fy, W, 3, GD[2]); F(g, 0, fy, W, 1, GD[4]); F(g, 0, fy + 3, W, 1, GD[0]);
      lot(c, W >> 1, fy + (shaft >> 1), W >> 1, 24, 'local');
    } else pintedWall(c, 0, fy, W, shaft, f.floors || 10, base, { boxes: kind === 'salmon' });
  }
  if (glass) lobby(c, gT, f.name ? String(f.name).toUpperCase() : null);
  else {
    var B = ramp(base); F(g, 0, gT, W, 48, B[2]); F(g, 0, gT, W, 2, B[4]); F(g, 0, H - 6, W, 6, B[1]);
    var dx = (W >> 1) - 14; F(g, dx - 2, gT + 12, 32, 36, B[0]); vgrad(g, dx, gT + 14, 28, 32, ['#ffe6a8', '#d8a050']); F(g, dx + 13, gT + 14, 2, 32, B[0]); F(g, dx - 4, gT + 8, 36, 4, '#2f5a52'); F(g, dx - 4, gT + 8, 36, 1, '#5a8f80');
    lot(c, W >> 1, gT + 30, 28, 32, 'local');
    for (var x = 5; x + 16 < dx - 4; x += 21) { F(g, x, gT + 16, 16, 22, B[0]); vgrad(g, x + 1, gT + 17, 14, 20, [GLS[3], GLS[2]]); F(g, x + 7, gT + 17, 1, 20, B[0]); }
    for (x = dx + 36; x + 16 < W - 4; x += 21) { F(g, x, gT + 16, 16, 22, B[0]); vgrad(g, x + 1, gT + 17, 14, 20, [GLS[3], GLS[2]]); F(g, x + 7, gT + 17, 1, 20, B[0]); }
  }
  F(g, 0, 0, 0, 0, K);
  return lotDone(c);
}
function torreS(c) {
  var g = c.g, W = c.W, H = c.H, A = ramp('#6a7a7a');
  roofFill(g, 0, 0, W, H, c.r2); parapetTop(g, W, H, A); F(g, 0, H - 2, W, 2, A[3]); F(g, 0, H - 2, W, 1, A[4]);
  roofBits(c, 8, H - 8, A, [2, 0, 1, 4]);
  if (c.f.name && W >= 72) { var nm = String(c.f.name).toUpperCase(), bw = Math.min(W - 16, tw(nm, 'a7') + 10), bx = (W - bw) >> 1; F(g, bx - 1, 11, bw + 2, 12, K); F(g, bx, 12, bw, 10, '#10343a'); txt(g, nm, bx + (bw >> 1), 14, tw(nm, 'a7') + 6 <= bw ? 'a7' : 'a5', GD[3]); F(g, bx + 6, 23, 2, 6, K); F(g, bx + bw - 8, 23, 2, 6, K); }
  [[8, 8], [W - 10, 8], [8, H - 8], [W - 10, H - 8]].forEach(function (p) { F(g, p[0], p[1], 2, 2, '#ff4040'); lot(c, p[0], p[1], 0, 0, 'foco'); });
  return lotDone(c);
}
S.lotArch.cv_torre = function (f) { var c = mkLot(f); return c.side === 'S' ? torreS(c) : torreN(c); };

/* ---- hotel (JW Marriott): torre curva de vidrio teal con franjas doradas, podio, porte-cochere y banderas ---- */
function hotelN(c) {
  var g = c.g, W = c.W, H = c.H, f = c.f, i;
  lotFace(c, Math.max(4, Math.min(c.rows, c.rows >= 9 ? c.rows - 1 : c.rows)));
  var fy = c.faceY, gT = c.gTop, shaft = gT - fy, A = ramp('#6a7a7a'), nm = (f.name ? String(f.name) : 'HOTEL').toUpperCase();
  if (fy > 0) {
    roofFill(g, 0, 0, W, fy, c.r2); if (fy >= 20) parapetTop(g, W, fy - 6, A); parapetFrontAt(g, W, Math.max(0, fy - 6), A);
    roofBits(c, 4, fy - 8, A, [2, 3]);
  }
  if (shaft > 8) {
    tealWall(c, 0, fy, W, shaft, f.floors || 16, { curve: true, gold: 32, goff: 14, mull: 8 });
    // coronacion escalonada y rotulo dorado
    F(g, 0, fy, W, 4, GD[2]); F(g, 0, fy, W, 1, GD[4]); F(g, 0, fy + 4, W, 1, GD[0]);
    if (shaft > 30 && W >= 80) {
      var nW = Math.min(W - 24, tw(nm, 'a7') + 14), nx = (W - nW) >> 1, ny = fy + 8;
      F(g, nx - 1, ny - 1, nW + 2, 12, K); F(g, nx, ny, nW, 10, '#0c2a2e'); F(g, nx, ny, nW, 1, '#2a5a5e');
      txt(g, nm, nx + (nW >> 1) + 1, ny + 2, tw(nm, 'a7') + 6 <= nW ? 'a7' : 'a5', GD[3], { shadow: '#000000' });
      lot(c, nx + (nW >> 1), ny + 5, nW, 10, 'local');
    }
    lot(c, W >> 1, fy + (shaft >> 1), W >> 1, 30, 'local');
  }
  // podio con porte-cochere
  var y0 = gT;
  lobby(c, y0, null, { doorW: 44 });
  var cw = Math.min(W - 10, 96), cx0 = (W - cw) >> 1;
  F(g, cx0, y0 + 14, cw, 4, GD[2]); F(g, cx0, y0 + 14, cw, 1, GD[4]); F(g, cx0, y0 + 17, cw, 1, GD[0]); AO(g, cx0 + 2, y0 + 18, cw - 2, 5, 0.45);
  for (i = cx0 + 3; i < cx0 + cw - 3; i += 6) { P(g, i, y0 + 16, '#fff8d0'); lot(c, i, y0 + 20, 0, 0, i % 18 === 3 ? 'foco' : 'foco'); }
  F(g, cx0 + 2, y0 + 18, 3, 26, GD[1]); F(g, cx0 + cw - 5, y0 + 18, 3, 26, GD[1]); F(g, cx0 + 2, y0 + 18, 1, 26, GD[3]); F(g, cx0 + cw - 5, y0 + 18, 1, 26, GD[3]);
  // banderas
  [[10, '#d9202c'], [18, '#f3efe2'], [26, '#2f72b0']].forEach(function (b, k) {
    var fx = Math.max(4, cx0 - 40) + k * 9; if (fx + 9 > W - 4) return;
    F(g, fx, y0 + 6, 1, 42, '#cfd3cc'); F(g, fx + 1, y0 + 6, 7, 5, b[1]); F(g, fx + 1, y0 + 10, 7, 1, dk(b[1], 0.3)); P(g, fx, y0 + 5, GD[3]);
  });
  return lotDone(c);
}
function hotelS(c) {
  var g = c.g, W = c.W, H = c.H, A = ramp('#6a7a7a');
  roofFill(g, 0, 0, W, H, c.r2, '#8a8a8e'); parapetTop(g, W, H, A); F(g, 0, H - 2, W, 2, A[3]); F(g, 0, H - 2, W, 1, A[4]);
  F(g, 6, 12, W - 12, 3, GD[2]); F(g, 6, 12, W - 12, 1, GD[4]);                       // corona dorada
  var hx = W >> 1, hy = H >> 1; DISC(g, hx, hy + 4, Math.min(20, (W >> 1) - 8), '#4a4a52'); DISC(g, hx, hy + 4, Math.min(18, (W >> 1) - 10), '#6a6a72');     // helipuerto
  var tx = hx - 4; F(g, tx, hy - 2, 2, 12, '#f3efe2'); F(g, tx + 6, hy - 2, 2, 12, '#f3efe2'); F(g, tx, hy + 3, 8, 2, '#f3efe2');
  roofBits(c, 8, H - 8, A, [2, 3, 0]);
  [[8, 8], [W - 10, 8], [8, H - 8], [W - 10, H - 8]].forEach(function (p) { F(g, p[0], p[1], 2, 2, '#ff4040'); lot(c, p[0], p[1], 0, 0, 'foco'); });
  return lotDone(c);
}
S.lotArch.cv_hotel = function (f) { var c = mkLot(f); return c.side === 'S' ? hotelS(c) : hotelN(c); };

/* ---- casona neocolonial (Malachowski): muro crema o salmon, balcon cajon de madera, arco, rejas y teja ---- */
function tejaRows(g, x, y, w, h, A, off) {
  F(g, x, y, w, h, A[2]);
  for (var j = 0; j < h; j += 3) { F(g, x, y + j, w, 1, A[1]); F(g, x, y + j + 1, w, 1, A[3]); for (var i = ((j / 3 | 0) % 2) * 3 + (off || 0); i < w; i += 6) P(g, x + i, y + j + 2, A[1]); }
}
function casonaN(c) {
  var g = c.g, W = c.W, H = c.H, f = c.f, rnd = c.rnd, i, j, x;
  lotFace(c, Math.min(c.rows, f.face || 6));
  var kind = f.color || 'crema', base = { crema: '#e4d2a8', salmon: '#e0a890', celeste: '#a8c8d8', blanco: '#ece6d8', ocre: '#d4aa6a' }[kind] || '#e4d2a8';
  var A = ramp(base), RT = ['#5a2a20', '#8a4430', '#b0603a', '#c97a4a', '#dc9a68'], fy = c.faceY, gT = c.gTop;
  // techo de teja (visto desde arriba): cumbrera al centro y faldones
  if (fy > 0) {
    tejaRows(g, 0, 0, W, fy, RT, 0); F(g, 0, 0, W, 2, RT[4]); F(g, 0, 0, 3, fy, RT[3]); F(g, W - 3, 0, 3, fy, RT[1]); F(g, W - 1, 0, 1, fy, RT[0]);
    var rg = (fy * 0.45) | 0; F(g, 2, rg, W - 4, 2, RT[4]); F(g, 2, rg + 2, W - 4, 1, RT[0]); for (i = 6; i < W - 6; i += 9) P(g, i, rg + 1, RT[3]);
    AO(g, 0, fy - 6, W, 6, 0.3);
    if (W >= 64 && fy >= 28) { var chx = 14 + ((c.seed * 7) % Math.max(1, W - 40)); F(g, chx, rg - 12, 10, 14, '#a8693a'); F(g, chx - 1, rg - 13, 12, 2, '#c97a4a'); F(g, chx + 2, rg - 11, 6, 2, '#2a1a14'); AO(g, chx + 10, rg, 4, 4, 0.3); }
    F(g, 0, fy - 1, W, 1, RT[0]);
  }
  // alero con canecillos
  F(g, 0, fy, W, 3, RT[3]); F(g, 0, fy, W, 1, RT[4]); F(g, 0, fy + 3, W, 3, A[4]); F(g, 0, fy + 6, W, 1, A[1]); AO(g, 0, fy + 7, W, 2, 0.3);
  for (i = 3; i < W - 3; i += 6) { F(g, i, fy + 3, 2, 3, A[1]); }
  // muros
  var wy = fy + 7, wh = H - wy;
  F(g, 0, wy, W, wh, A[2]); speck(g, 0, wy, W, wh, rnd, W * wh / 28, [A[1], A[3]]);
  F(g, 0, wy, 3, wh, A[4]); F(g, W - 3, wy, 3, wh, A[1]); F(g, W - 1, wy, 1, wh, A[0]);
  // piso alto
  var upH = gT - wy - 4;
  if (upH >= 20) {
    var ux = [], n = Math.max(2, Math.floor((W - 20) / 34));
    for (i = 0; i < n; i++) ux.push(Math.round(10 + (W - 20) * (i + 0.5) / n));
    var bi = (n >> 1);
    for (i = 0; i < n; i++) {
      var cx = ux[i], ww = 12, hh = Math.min(22, upH - 8), yy = wy + 6;
      if (i === bi) {                                                  // balcon cajon de madera
        var bw = 30, bxx = cx - (bw >> 1);
        F(g, bxx, yy - 2, bw, hh + 8, '#6b4223'); F(g, bxx, yy - 2, bw, 3, '#4a3028'); F(g, bxx - 2, yy - 4, bw + 4, 3, '#8a2a20'); F(g, bxx - 2, yy - 4, bw + 4, 1, '#b0402e');
        for (x = bxx + 2; x < bxx + bw - 3; x += 7) { F(g, x, yy + 2, 5, hh - 4, GLS[2]); F(g, x, yy + 2, 5, 1, GLS[3]); LN(g, x, yy + hh - 5, x + 3, yy + 3, '#8fb0b8'); F(g, x + 5, yy + 1, 2, hh - 2, '#a8693a'); }
        F(g, bxx, yy + hh + 1, bw, 5, '#a8693a'); for (x = bxx + 1; x < bxx + bw - 1; x += 3) F(g, x, yy + hh + 2, 1, 3, '#4a3028');
        F(g, bxx - 1, yy + hh + 6, bw + 2, 2, '#4a3028'); AO(g, bxx, yy + hh + 8, bw, 3, 0.4);
        lot(c, cx, yy + 8, bw, hh, 'local');
      } else {
        F(g, cx - (ww >> 1) - 5, yy, 3, hh, '#2f6a50'); F(g, cx + (ww >> 1) + 3, yy, 3, hh, '#2f6a50');                      // postigos verdes
        for (x = yy + 2; x < yy + hh; x += 3) { F(g, cx - (ww >> 1) - 5, x, 3, 1, '#1f4a38'); F(g, cx + (ww >> 1) + 3, x, 3, 1, '#1f4a38'); }
        F(g, cx - (ww >> 1) - 1, yy - 1, ww + 2, hh + 2, A[4]); vgrad(g, cx - (ww >> 1), yy, ww, hh, [GLS[3], GLS[2]]); F(g, cx, yy, 1, hh, A[4]); F(g, cx - (ww >> 1), yy + (hh >> 1), ww, 1, A[4]);
        P(g, cx - (ww >> 1) - 1, yy - 1, A[2]); F(g, cx - (ww >> 1) - 3, yy + hh + 1, ww + 6, 2, A[4]); AO(g, cx - (ww >> 1) - 3, yy + hh + 3, ww + 6, 1, 0.35);
        if (rnd() < 0.2) lot(c, cx, yy + 6, 0, 0, 'foco');
      }
    }
  }
  F(g, 0, gT - 3, W, 3, A[4]); F(g, 0, gT - 3, W, 1, '#ffffff'); AO(g, 0, gT, W, 2, 0.3);                  // cornisa de entrepiso
  // planta baja: zocalo de piedra, portal en arco, ventanas con rejas
  F(g, 0, H - 8, W, 8, '#a89c88'); F(g, 0, H - 8, W, 1, '#d6ccb4'); for (i = 0; i < W; i += 10) F(g, i, H - 8, 1, 8, '#8a7f6a');
  var pcx = W >> 1, pw = 20, ph = 34;
  F(g, pcx - 13, gT + 2, 26, H - gT - 2, A[4]); DISC(g, pcx, gT + 16, 13, A[4]);
  DISC(g, pcx, gT + 16, 10, '#2a1a14'); F(g, pcx - 10, gT + 16, 20, H - gT - 17, '#2a1a14');
  DISC(g, pcx, gT + 16, 9, '#6b4223'); F(g, pcx - 9, gT + 16, 18, H - gT - 18, '#6b4223'); F(g, pcx, gT + 8, 1, H - gT - 10, '#2a1a14');
  for (j = 0; j < 5; j++) { F(g, pcx - 7, gT + 14 + j * 6, 5, 4, '#8a5a30'); F(g, pcx + 3, gT + 14 + j * 6, 5, 4, '#8a5a30'); P(g, pcx - 3, gT + 16 + j * 6, '#e6c85a'); P(g, pcx + 3, gT + 16 + j * 6, '#e6c85a'); }
  F(g, pcx - 13, H - 10, 26, 2, '#d6ccb4'); F(g, pcx - 7, H - 14, 1, 1, '#e6c85a');
  lot(c, pcx, gT + 24, 18, 30, 'local');
  [[8, pcx - 38], [pcx + 20, W - 36]].forEach(function (rg2) {
    for (x = rg2[0]; x + 18 <= rg2[1] + 18 && x + 18 < W - 5; x += 28) {
      if (x + 18 > pcx - 14 && x < pcx + 14) continue;
      F(g, x - 2, gT + 8, 22, 28, A[4]); vgrad(g, x, gT + 10, 18, 24, ['#2a1a14', '#6a3a22']); F(g, x, gT + 10, 18, 1, '#8a5a30');
      for (i = 0; i < 18; i += 3) F(g, x + i, gT + 10, 1, 24, '#1c1a22'); for (i = 4; i < 24; i += 5) F(g, x, gT + 10 + i, 18, 1, '#1c1a22');
      F(g, x - 3, gT + 36, 24, 2, '#d6ccb4'); lot(c, x + 9, gT + 22, 18, 24, 'local');
    }
  });
  // enredadera y maceta junto a la puerta
  F(g, 0, H - 3, W, 3, '#6a6050'); F(g, pcx - 14, H - 3, 28, 3, '#b8b3a2');
  return lotDone(c);
}
function casonaS(c) {
  var g = c.g, W = c.W, H = c.H, RT = ['#5a2a20', '#8a4430', '#b0603a', '#c97a4a', '#dc9a68'], A = ramp('#e4d2a8');
  tejaRows(g, 0, 0, W, H, RT, 0);
  F(g, 0, 0, W, 6, A[3]); F(g, 0, 0, W, 2, A[4]); F(g, 0, 5, W, 1, A[1]);
  F(g, 0, 0, 3, H, A[3]); F(g, W - 3, 0, 3, H, A[1]);
  var rg = H >> 1; F(g, 3, rg, W - 6, 3, RT[4]); F(g, 3, rg + 3, W - 6, 1, RT[0]);
  if (W >= 56) { var cx = 12 + ((c.seed * 11) % Math.max(1, W - 36)); F(g, cx, rg - 14, 10, 16, '#a8693a'); F(g, cx - 1, rg - 15, 12, 2, '#c97a4a'); F(g, cx + 2, rg - 13, 6, 2, '#2a1a14'); }
  AO(g, 0, 6, W, 3, 0.3); F(g, 0, H - 2, W, 2, A[3]);
  return lotDone(c);
}
S.lotArch.cv_casona = function (f) { var c = mkLot(f); return c.side === 'S' ? casonaS(c) : casonaN(c); };


/* ======================== PUBLICACION ======================== */
var L = S.cv.larco = S.cv.larco || {};
L.fachada = fachada;
L.brands = Object.keys(NAMES);
L.brandName = brandName;
L.bake = function () {
  var t0 = (window.performance || Date).now();                                              // (re)hornea tiles y props; las fachadas se piden y se cachean
  var tiles = {
    pisoLarco: mkTiles(pisoLarcoG, 4), deck: mkTiles(deckG, 4), escalera: mkTiles(escaleraG, 3), paredRoca: mkTiles(paredRocaG, 4), pisoChifa: mkTiles(pisoChifaG, 4)
  };
  var props = {
    barandaVidrio: propBaranda(), letreroLarcomar: propLetrero(), escaleraMecanica: propEscalera(), macetaLarco: propMaceta(),
    sombrillaTerraza: propSombrilla(false), mesaSalazar: propMesa(false), barCentral: propBar(), farolRojo: propFarolRojo(),
    mesaRedonda: propMesaRedonda(false), pecera: propPecera(false), rejaChifa: propReja(false), casetaTandem: propTandem(), vaporeraGrande: propVaporera()
  };
  props.sombrillaTerraza.broken = propSombrilla(true); props.mesaSalazar.broken = propMesa(true);
  props.mesaRedonda.broken = propMesaRedonda(true); props.pecera.broken = propPecera(true); props.rejaChifa.open = propReja(true);
  L.tiles = tiles; L.props = props;
  var k;
  for (k in tiles) L[k] = tiles[k];
  for (k in props) L[k] = props[k];
  L.bakeMs = Math.round((window.performance || Date).now() - t0);
  return L;
};
L.bake();
})();
