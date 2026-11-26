/* ACHORADO - js/barranco/arte-casonas.js  (Barranco, fase B2b)
 * Dueño: B2b (casonas, fachadas de bares/peñas y la peña por dentro).  Contrato: BARRANCO.md §10.2.  Nota: ../diseno/br-B2b.md
 *
 * Publica:
 *   ACH.sprites.br.casona = {
 *     fachada(brand, wTiles) -> { cv, ax, ay, lights, noche }   cv = lienzo de dia (wTiles*16 x 64/96/112), noche = el mismo con ventanas/letreros encendidos
 *                                                              (tambien cv.noche), ax = ancho/2, ay = alto (la base pisa el suelo), lights = [{x,y,w,h,kind,col}] en px del lienzo.
 *                                                              Cache por marca+ancho+modo (real/parodia).
 *     brands, brandName(id), tiles{pisoPena,pistaBaile,pistaBaileOn,tabladillo}, props{...} y todo repetido plano (casona.mesaPena ...), bake(), epoch
 *   }
 *   ACH.sprites.lotArch.br_casona1..6   function (ficha) -> { canvas, over, overX, overY, lights, noche }   (lados N y S; canvas.noche = version de noche)
 * Modo real / parodia: ACH.cfg.marcasReales + ACH.px.onMarcas (el cache lleva el modo en la clave; quien hornea vuelve a pedir la fachada).
 * Reglas: todo se hornea una vez (cuadriculas G -> toCanvas), sin getImageData / shadowBlur / filter / degradados por cuadro. Letras solo ACH5/7/12.
 * Sin dependencias duras: solo ACH.px (base.js). Si falta, no hace nada.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px, S = ACH.sprites;
if (!px || !px.G || !S) return;
S.lotArch = S.lotArch || {};
S.br = S.br || {};
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
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function pick(rnd, a) { return a[Math.floor(rnd() * a.length) % a.length]; }
function speck(g, x, y, w, h, rnd, n, cols) { for (var i = 0; i < n; i++) P(g, x + rnd() * w, y + rnd() * h, cols[(rnd() * cols.length) | 0]); }
function outline(g, c) {
  var add = [], x, y;
  for (y = 0; y < g.h; y++) for (x = 0; x < g.w; x++) {
    if (g.d[y * g.w + x]) continue;
    if (Q(g, x - 1, y) || Q(g, x + 1, y) || Q(g, x, y - 1) || Q(g, x, y + 1)) add.push([x, y]);
  }
  for (var i = 0; i < add.length; i++) g.d[add[i][1] * g.w + add[i][0]] = c || K;
}
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
function mk(g, ax, ay, fw, fh, o) {
  o = o || {};
  if (o.cast !== false) castShadow(g, ay, (o.cast && o.cast.len) || 0.42, (o.cast && o.cast.col) || null);
  var c = g.toCanvas(ax, ay, fw, fh);
  c.shadowIn = o.cast !== false;
  if (o.p) for (var k in o.p) c[k] = o.p[k];
  return c;
}
function seedOf(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) + 1; }

/* ======================== TEXTO ======================== */
function hasMark(s) { return /[ÁÉÍÓÚÜÑ]/.test(s); }
function txt(g, s, cx, y, font, ink, o) {
  o = o || {};
  var W0 = px.measure(s, font), x0 = Math.round(cx - W0 / 2);
  if (o.align === 'l') x0 = Math.round(cx);
  px.text(g, s, x0, Math.round(y), { font: font, ink: ink, shadow: o.shadow || null, outline: o.outline || null, align: 'l', scale: o.scale || 1 });
  return W0;
}
function bold(g, s, cx, y, font, ink, o) { txt(g, s, cx, y, font, ink, o); txt(g, s, cx + 1, y, font, ink, { shadow: null }); }
function tw(s, font) { return px.measure(s, font); }
/* la mayor fuente que quepa en la caja (a12 -> a7 -> a5), o dos renglones en a5. Devuelve la fuente usada. */
function fit(g, s, bx, by, bw, bh, ink, o) {
  o = o || {};
  var order = ['a12', 'a7', 'a5'], mark = hasMark(s), pickF = null, i, ot = o.outline ? 2 : 0, info;
  for (i = o.max ? order.indexOf(o.max) : 0; i < 3; i++) {
    info = px.fontInfo(order[i]);
    if (tw(s, order[i]) + ot + 2 <= bw && info.h + (mark ? 2 : 0) + ot <= bh) { pickF = order[i]; break; }
  }
  if (!pickF && bh >= 11 && s.indexOf(' ') > 0) {
    var words = s.split(' '), best = 1, bd = 1e9, k, l1, l2;
    for (k = 1; k < words.length; k++) { l1 = words.slice(0, k).join(' '); l2 = words.slice(k).join(' '); var d = Math.abs(tw(l1, 'a5') - tw(l2, 'a5')); if (d < bd) { bd = d; best = k; } }
    l1 = words.slice(0, best).join(' '); l2 = words.slice(best).join(' ');
    if (Math.max(tw(l1, 'a5'), tw(l2, 'a5')) + 2 <= bw) {
      var m1 = hasMark(l1), m2 = hasMark(l2), top = by + ((bh - 11 - (m1 ? 2 : 0)) >> 1) + (m1 ? 2 : 0);
      (o.bold ? bold : txt)(g, l1, bx + (bw >> 1), top, 'a5', ink, o); (o.bold ? bold : txt)(g, l2, bx + (bw >> 1), top + 6 + (m2 ? 1 : 0), 'a5', ink, o);
      return 'a5x2';
    }
  }
  if (!pickF) { pickF = 'a5'; while (s.length > 1 && tw(s, 'a5') + 2 > bw) s = s.slice(0, -1); }
  info = px.fontInfo(pickF);
  var need = info.h + (mark ? 2 : 0) + ot, ty = by + ((bh - need) >> 1) + (mark ? 2 : 0) + (ot ? 1 : 0);
  (o.bold ? bold : txt)(g, s, bx + (bw >> 1), ty, pickF, ink, o);
  return pickF;
}
/* rotulo con subtitulo: nombre arriba (a7/a5) y subtitulo en a5 abajo; sin subtitulo, fit() */
function signText(g, B, bx, by, bw, bh, ink, o) {
  o = o || {};
  if (B.sub && bh >= 16) {
    var fm = (tw(B.main, 'a7') + 2 <= bw) ? 'a7' : 'a5', mk2 = hasMark(B.main), sub = B.sub, sm = hasMark(sub), ty = by + (sm ? 1 : 2);   // ajustes 2026-11-21: con tilde arriba Y abajo (OITA NOMÁ / PEÑA…) la virgulilla del subtítulo caía sobre la última fila del nombre; con tilde solo arriba (ZAGUÁN / GUITARRAS) el nombre y el subtítulo se pegaban
    if (tw(sub, 'a5') + 2 > bw || (fm === 'a5' && tw(B.main, 'a5') + 2 > bw)) { fit(g, B.main + ' ' + sub, bx, by, bw, bh, ink, o); return; }   // no cabe en dos niveles: un solo texto en dos renglones
    (o.bold ? bold : txt)(g, B.main, bx + (bw >> 1), ty, fm, ink, o);
    txt(g, sub, bx + (bw >> 1), by + bh - (sm ? 5 : 6), 'a5', o.subInk || ink, { shadow: o.shadow || null });
    return;
  }
  fit(g, B.main, bx, by, bw, bh, ink, o);
}

/* ======================== MARCAS ======================== */
/* [real, parodia, subtitulo real, subtitulo parodia]  — las parodias salen de diseno/investigacion-barranco.md §3 */
var NAMES = {
  cala:         ['CALA', 'CALAVERA'],
  javier:       ['JAVIER', 'JABIEL EL BAJADERO', 'RESTAURANTE', 'FRENTE AL MAR'],
  posadaMirador: ['LA POSADA DEL MIRADOR', 'LA POSADA DEL MIRADOR', '', 'DE MUERTOS'],
  tioMario:     ['EL TÍO MARIO', 'EL TÍO MARIO', 'ANTICUCHOS', 'CARBONIZADO'],
  picas:        ['PICAS', 'PICAS DEL MÁS ALLÁ'],
  cantaRana:    ['CANTA RANA', 'CANTA RANA PODRIDA'],
  ayahuasca:    ['AYAHUASCA', 'CASONA TUÉTANO', 'RESTOBAR', 'RESTOBAR'],
  isolina:      ['ISOLINA', 'ISOQUINA', 'TABERNA PERUANA', 'TABERNA (ZOMBI)'],
  juanito:      ['JUANITO', 'JUANITO', 'DE BARRANCO', 'DE BARRANCA MUERTA'],
  oitaNoma:     ['OITA NOMÁ', 'OITA NO MATA', 'PEÑA RESTAURANTE', 'PEÑA RESTAURANTE'],
  barrancoBeer: ['BARRANCO BEER COMPANY', 'BARRANCO BIRRA MUERTA CO.'],
  piselli:      ['BODEGA PISELLI', 'BODEGA PISOTELI'],
  estacion:     ['LA ESTACIÓN', 'LA ESTACIÓN', 'DE BARRANCO', 'DE BARRANCA-MUERTA'],
  victoria:     ['VICTORIA BAR', 'VICTORIA MUERTA BAR'],
  donPorfirio:  ['PEÑA DON PORFIRIO', 'PEÑA DON PODRIDO'],
  laOficina:    ['LA OFICINA', 'LA OFICINA', 'PEÑA CRIOLLA', 'DEL MÁS ALLÁ'],
  penaCarajo:   ['LA PEÑA DEL CARAJO', 'LA PEÑA DEL CEMENTERIO'],
  sargento:     ['SARGENTO PIMIENTA', 'SARGENTO PIMIENTO ZOMBI', 'ROCK BAR', 'ROCK BAR'],
  laNoche:      ['LA NOCHE', 'LA NOCHE ETERNA'],
  candelaria:   ['LA CANDELARIA', 'LA CANDELABRA'],
  santos:       ['SANTOS', 'SANTOS CADÁVER', 'CAFÉ & ESPIRITUOSOS', 'CAFÉ & ESPIRITUOSOS'],
  floCanela:    ['LA FLOR DE LA CANELA', 'LA FLOR DE LA CANILLA'],
  /* inventadas fijas */
  ultimaJarana: ['PEÑA LA ÚLTIMA JARANA', '', 'VALS - FESTEJO - LANDÓ'],
  barLucho:     ['BAR LUCHO', '', 'TRAGOS Y JARANA'],
  zaguanCeledonio: ['ZAGUÁN', '', 'GUITARRAS']
};
var FIXED = { ultimaJarana: 1, barLucho: 1, zaguanCeledonio: 1 };
function real() { return ACH.cfg.marcasReales !== false; }
function bget(id) {
  var n = NAMES[id]; if (!n) return null;
  var r = real() || FIXED[id];
  return { id: id, real: r, main: r ? n[0] : (n[1] || n[0]), sub: r ? (n[2] || '') : (n[3] !== undefined ? n[3] : (n[2] || '')) };
}
function brandName(id) { var b = bget(id); return b ? (b.sub ? b.main + ' ' + b.sub : b.main) : null; }

/* ======================== PIEZAS DE INTERIOR (se dibujan encendidas; de dia el llamador las oscurece) ======================== */
var BOT = ['#2f7a50', '#c0261c', '#e6c85a', '#3f72b0', '#f3efe2', '#8a4a22', '#7a3fb0'];
var SKIN = ['#d8a47a', '#c48f63', '#a8714c', '#e0b890'];
function lampPend(g, x, y, len, c) { F(g, x, y, 1, len, '#2a2024'); F(g, x - 2, y + len, 5, 2, c || '#ffcf8a'); F(g, x - 1, y + len + 2, 3, 1, '#fff0c0'); }
function person(g, x, y, c, hair, skin) {                           // comensal 5 x 8
  F(g, x, y + 3, 5, 5, c); F(g, x + 1, y, 3, 3, skin || '#d8a47a'); F(g, x + 1, y, 3, 1, hair || '#2a1a18'); F(g, x, y + 3, 5, 1, lt(c, 0.3));
}
function silh(g, x, y, c) { F(g, x, y + 3, 5, 6, c); DISC(g, x + 2, y + 1, 1, c); P(g, x + 1, y + 2, c); P(g, x + 3, y + 2, c); }   // silueta oscura 5 x 9
function guitar(g, x, y, c) {                                       // guitarra criolla 7 x 9 apoyada en diagonal
  ELL(g, x + 2, y + 6, 2, 2, c || '#b07a45'); ELL(g, x + 2, y + 3, 1, 1, c || '#b07a45'); P(g, x + 2, y + 5, '#2a1a14'); LN(g, x + 3, y + 3, x + 6, y, '#5a3a20'); P(g, x + 6, y - 1, '#2a1a14');
}
function table(g, x, y, w, topc) { F(g, x, y, w, 2, topc); F(g, x, y, w, 1, lt(topc, 0.3)); F(g, x + (w >> 1), y + 2, 1, 6, '#3a3844'); F(g, x + (w >> 1) - 2, y + 8, 5, 1, '#3a3844'); }
function chair(g, x, y, c) { F(g, x, y, 1, 5, c); F(g, x + 3, y + 3, 1, 3, c); F(g, x, y + 3, 4, 1, c); }

var INT = {
  bar: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#5a3220', '#7a4a2c', '#a8693a', '#8a4c30']);
    var rows = h >= 22 ? 2 : 1, i, j;
    for (j = 0; j < rows; j++) { var sy = y + 2 + j * 8; F(g, x + 1, sy + 6, w - 2, 1, '#c99458'); for (i = 2; i < w - 3; i += 2) if (r() < 0.85) { var c = pick(r, BOT); F(g, x + i, sy + 1 + ((r() * 2) | 0), 1, 5 - ((r() * 2) | 0), c); P(g, x + i, sy + 1, lt(c, 0.4)); } }
    if (w >= 14) lampPend(g, x + (w >> 1), y, 2, '#ffcf8a');
    if (w >= 22 && h >= 20) person(g, x + (w >> 1) - 2, y + h - 14, '#f3efe2', '#2a1a18', pick(r, SKIN));
    F(g, x, y + h - 5, w, 5, '#2a1a14'); F(g, x, y + h - 5, w, 1, '#e6b060'); F(g, x, y + h - 4, w, 1, '#8a5a30');
  },
  mesas: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#6a4a32', '#7a5636', '#8a6240']);
    var i; for (i = 7; i < w - 4; i += 12) lampPend(g, x + i, y, 2 + ((r() * 3) | 0), '#ffcf8a');
    F(g, x, y + h - 4, w, 4, '#4a3028');
    for (i = 3; i + 10 < w; i += 15) {
      if (h >= 16) { chair(g, x + i - 2, y + h - 12, '#3a2a22'); person(g, x + i - 1, y + h - 16, pick(r, ['#d98a9e', '#4a6498', '#e6c85a', '#f3efe2', '#3f8f7a']), null, pick(r, SKIN)); }
      table(g, x + i, y + h - 10, Math.min(10, w - i - 1), '#e6dcc0');
      if (h >= 16 && r() < 0.6) person(g, x + i + 7, y + h - 16, pick(r, ['#8f3a32', '#2f7a50', '#c9a66b']), '#1c1a22', pick(r, SKIN));
    }
  },
  pena: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#7a1e24', '#9a2a2c', '#7a1e24']);
    var i; for (i = 2; i < w; i += 4) F(g, x + i, y, 1, h, '#5a1218');
    for (i = 1; i < w - 1; i += 3) P(g, x + i, y + 1, i % 6 ? '#fff0a0' : '#ffb840');
    F(g, x, y + h - 4, w, 4, '#c99458'); F(g, x, y + h - 4, w, 1, '#e8c48a');
    if (w >= 12) { person(g, x + 2, y + h - 12, '#f3efe2', '#1c1a22', pick(r, SKIN)); guitar(g, x + 5, y + h - 12); }
    if (w >= 24) { F(g, x + w - 11, y + h - 10, 7, 6, '#a8693a'); F(g, x + w - 11, y + h - 10, 7, 1, '#c99458'); person(g, x + w - 10, y + h - 15, '#e6c85a', '#1c1a22', pick(r, SKIN)); }
  },
  parrilla: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#2a1a14', '#3a2218', '#4a2a1c']);
    var i, gy = y + h - 9;
    F(g, x + 1, gy, w - 2, 3, '#3a3a40'); F(g, x + 1, gy, w - 2, 1, '#8c8a93');
    for (i = 2; i < w - 3; i += 2) { P(g, x + i, gy + 3, r() < 0.5 ? '#ff6a1a' : '#ffb040'); P(g, x + i + 1, gy + 4, '#c0261c'); }
    for (i = 2; i + 3 < w - 2; i += 5) { F(g, x + i, gy - 3, 4, 2, '#7a3a1c'); F(g, x + i, gy - 4, 4, 1, '#a85a2a'); F(g, x + i - 1, gy - 2, 6, 1, '#8a5a30'); }
    for (i = 3; i < w - 3; i += 4) { P(g, x + i + ((r() * 2) | 0), y + 3 + ((r() * (h - 16)) | 0), '#cfc8c0'); }
    if (w >= 22) { silh(g, x + w - 8, y + h - 18, '#1c1a22'); F(g, x + w - 9, y + h - 19, 7, 1, '#d8c48f'); }
    F(g, x, y + h - 5, w, 5, '#6b4223'); F(g, x, y + h - 5, w, 1, '#c99458');
  },
  cerveza: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#4a3a2a', '#5a4630', '#6a5238']);
    var i; for (i = 2; i + 7 < w - 1; i += 10) { F(g, x + i, y + 4, 7, h - 11, '#a4abaa'); F(g, x + i, y + 4, 2, h - 11, '#e6ebe8'); F(g, x + i + 5, y + 4, 2, h - 11, '#5c6570'); F(g, x + i, y + 4, 7, 1, '#cfd3cc'); F(g, x + i + 3, y + 1, 1, 3, '#8c8a93'); }
    F(g, x, y + h - 7, w, 7, '#4a2a1c'); F(g, x, y + h - 7, w, 2, '#e6b060');
    for (i = 3; i < w - 4; i += 6) { F(g, x + i, y + h - 11, 2, 4, '#e8a830'); P(g, x + i, y + h - 12, '#fff4d8'); }
  },
  bodega: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#5a3a22', '#6a4a2a', '#7a5636']);
    var j, i, rows = Math.max(2, (h - 4) >> 3);
    for (j = 0; j < rows; j++) { var sy = y + 2 + j * 8; F(g, x + 1, sy + 7, w - 2, 1, '#c99458'); for (i = 2; i < w - 3; i += 2) { var c = pick(r, BOT); F(g, x + i, sy + 2 + ((r() * 2) | 0), 1, 5, c); P(g, x + i, sy + 2, lt(c, 0.4)); } }
    lampPend(g, x + (w >> 1), y, 1, '#ffcf8a');
  },
  afiches: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#d8e4de', '#cfdcd4', '#c4d2ca']);
    var i, j, cols = ['#d9202c', '#2f72b0', '#f2c230', '#7a3fb0', '#2f9a6a', '#e8731a', '#f3efe2', '#d98a9e'];
    for (j = 0; j + 9 <= h - 8; j += 10) for (i = 1; i + 6 <= w - 1; i += 8) { var c = pick(r, cols); F(g, x + i, y + 2 + j, 6, 8, c); F(g, x + i + 1, y + 4 + j, 4, 1, '#f3efe2'); P(g, x + i + 2, y + 6 + j, '#1c1a22'); P(g, x + i + 3, y + 7 + j, '#1c1a22'); }
    F(g, x, y, w, 2, '#f4fff8'); F(g, x, y + 2, w, 1, '#bfe8d8');
    F(g, x, y + h - 6, w, 6, '#8a6a42'); F(g, x, y + h - 6, w, 1, '#c99458');
    if (w >= 20) person(g, x + (w >> 1) - 2, y + h - 14, '#f3efe2', '#cfcfcf', pick(r, SKIN));
  },
  pescado: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#b8e0e6', '#9ccfd8', '#7ab4c4']);
    var i; for (i = 0; i < w; i += 4) F(g, x + i, y, 1, 3, '#e8f6fa');
    F(g, x, y + h - 9, w, 9, '#e8f6fa'); F(g, x, y + h - 9, w, 1, '#ffffff'); F(g, x, y + h - 2, w, 2, '#a8c8d0');
    for (i = 3; i + 6 < w; i += 8) { ELL(g, x + i + 3, y + h - 6, 3, 1, '#cfd8dc'); F(g, x + i + 6, y + h - 7, 2, 3, '#b0bcc4'); P(g, x + i + 1, y + h - 7, K); P(g, x + i + 3, y + h - 8, '#f3efe2'); }
    for (i = 6; i + 2 < w; i += 11) { DISC(g, x + i, y + h - 11, 1, '#f2e63c'); }
    if (w >= 22) person(g, x + (w >> 1) - 2, y + h - 18, '#f3efe2', '#1c1a22', pick(r, SKIN));
  },
  rock: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#17141c', '#241c2c', '#17141c']);
    F(g, x + 1, y + 2, w - 2, 1, '#e0457b'); F(g, x + 1, y + 4, w - 2, 1, '#5ce1e6');
    var i; for (i = 2; i + 6 < w; i += 12) { F(g, x + i, y + h - 12, 6, 8, '#2a2630'); DISC(g, x + i + 3, y + h - 8, 2, '#4a4654'); P(g, x + i + 3, y + h - 8, '#17141c'); }
    if (w >= 14) { ELL(g, x + w - 7, y + h - 9, 2, 3, '#c0261c'); LN(g, x + w - 6, y + h - 12, x + w - 3, y + 6, '#d8c48f'); }
    F(g, x, y + h - 3, w, 3, '#3a3446');
  },
  cafe: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#4a3228', '#5a4030', '#6a4c38']);
    var i; for (i = 6; i < w - 3; i += 12) lampPend(g, x + i, y, 3, '#ffcf8a');
    for (i = 2; i < w - 3; i += 3) if (r() < 0.8) { var c = pick(r, BOT); F(g, x + i, y + h - 18, 1, 5, c); P(g, x + i, y + h - 18, lt(c, 0.4)); }
    F(g, x + 1, y + h - 13, w - 2, 1, '#c99458');
    F(g, x + 2, y + h - 10, w - 4, 10, '#3a2a22'); F(g, x + 2, y + h - 10, w - 4, 2, '#c99458');
    for (i = 5; i < w - 6; i += 8) { F(g, x + i, y + h - 13, 2, 3, CREAM); P(g, x + i + 2, y + h - 12, '#8a5a38'); }
  },
  /* ventana de casa comun, encendida: cortina crema y a veces una silueta */
  casa: function (g, x, y, w, h, r) {
    vgrad(g, x, y, w, h, ['#ffe6a8', '#ffd98a', '#f0b868']);
    F(g, x, y, 2, h, '#d98a6a'); F(g, x + w - 2, y, 2, h, '#d98a6a'); F(g, x, y, w, 3, '#d98a6a');
    if (r() < 0.5 && w >= 8) silh(g, x + (w >> 1) - 2, y + h - 10, '#3a2a28');
    else if (w >= 8) { F(g, x + (w >> 1) - 2, y + h - 8, 5, 2, '#e8dcc0'); F(g, x + (w >> 1), y + h - 6, 1, 4, '#8a6a42'); }
  }
};

/* ======================== EMBLEMAS 9x9 (junto al rotulo) ======================== */
var ICON = {
  fish: function (g, x, y, c) { ELL(g, x + 4, y + 4, 3, 2, c); F(g, x + 7, y + 2, 2, 5, c); P(g, x + 2, y + 3, K); },
  frog: function (g, x, y) { DISC(g, x + 4, y + 5, 3, '#4c8c2b'); DISC(g, x + 2, y + 2, 1, '#6fb040'); DISC(g, x + 6, y + 2, 1, '#6fb040'); P(g, x + 2, y + 2, K); P(g, x + 6, y + 2, K); F(g, x + 2, y + 6, 5, 1, '#c0261c'); },
  guitar: function (g, x, y, c) { ELL(g, x + 3, y + 6, 2, 2, c); ELL(g, x + 3, y + 4, 1, 1, c); P(g, x + 3, y + 5, K); LN(g, x + 4, y + 3, x + 8, y, '#d8c48f'); P(g, x + 8, y - 1, K); },
  flame: function (g, x, y) { ELL(g, x + 4, y + 6, 3, 3, '#e8731a'); F(g, x + 3, y + 1, 2, 4, '#e8731a'); P(g, x + 4, y, '#e8731a'); ELL(g, x + 4, y + 6, 1, 2, '#f2e63c'); },
  bottle: function (g, x, y) { F(g, x + 3, y, 2, 3, '#2f7a50'); F(g, x + 2, y + 3, 4, 6, '#2f7a50'); F(g, x + 2, y + 5, 4, 2, '#f3efe2'); P(g, x + 3, y + 3, '#7ac690'); },
  mug: function (g, x, y) { F(g, x + 1, y + 2, 5, 6, '#e8a830'); F(g, x + 1, y + 2, 5, 1, '#fff4d8'); F(g, x + 1, y, 5, 2, '#fff4d8'); FR(g, x + 6, y + 3, 2, 4, '#cfd3cc'); },
  note: function (g, x, y, c) { F(g, x + 3, y, 1, 7, c); ELL(g, x + 2, y + 7, 2, 1, c); F(g, x + 3, y, 4, 2, c); }
};

/* ======================== PIEZAS DE FACHADA ======================== */
var TEJA = ['#5a2a20', '#8a4430', '#b0603a', '#c97a4a', '#dc9a68'];
function tejaRows(g, x, y, w, h, off) {
  F(g, x, y, w, h, TEJA[2]);
  for (var j = 0; j < h; j += 3) { F(g, x, y + j, w, 1, TEJA[1]); F(g, x, y + j + 1, w, 1, TEJA[3]); for (var i = ((j / 3 | 0) % 2) * 3 + (off || 0); i < w; i += 6) P(g, x + i, y + j + 2, TEJA[1]); }
}
function calaminaRows(g, x, y, w, h, r) {
  F(g, x, y, w, h, '#8a98a4');
  for (var i = 0; i < w; i += 3) { F(g, x + i, y, 1, h, '#a6b2bc'); F(g, x + i + 1, y, 1, h, '#6e7c88'); }
  for (i = 0; i < Math.max(2, w >> 4); i++) { var rx = x + ((r() * w) | 0), ry = y + ((r() * h) | 0); F(g, rx, ry, 3, 2, '#a05a30'); P(g, rx + 1, ry, '#c97a4a'); }
}
/* techo visto de frente (franja superior de la fachada) */
function roofEdge(g, W, h, kind, A, r) {
  if (kind === 'parapeto') {
    var i;
    F(g, 0, h - 5, W, 5, A[4]); F(g, 0, h - 5, W, 1, '#ffffff'); F(g, 0, h - 1, W, 1, A[1]);
    for (i = 3; i < W - 4; i += 4) { F(g, i, 2, 2, h - 7, A[3]); P(g, i, 2, A[4]); }
    F(g, 0, 0, W, 2, A[4]); F(g, 0, 0, W, 1, '#ffffff');
    for (i = 0; i < W; i += 28) { F(g, i, 0, 5, h - 5, A[4]); F(g, i + 4, 0, 1, h - 5, A[2]); P(g, i + 2, 0, '#ffffff'); }
    F(g, W - 5, 0, 5, h - 5, A[4]);
  } else if (kind === 'calamina') {
    calaminaRows(g, 0, 1, W, h - 3, r); F(g, 0, 0, W, 1, '#c9d2d8'); F(g, 0, h - 2, W, 2, '#4a5560');
  } else {
    tejaRows(g, 0, 0, W, h - 2, 0); F(g, 0, 0, W, 1, TEJA[4]); F(g, 0, h - 2, W, 2, TEJA[0]);
    for (var k = 4; k < W - 4; k += 11) P(g, k, 1, TEJA[4]);
  }
}
/* mancha de revoque caido: deja ver ladrillo, adobe o cal */
function peel(g, x, y, w, h, r, amount, A) {
  var n = Math.round(amount * w * h / 380), i, j;
  for (i = 0; i < n; i++) {
    var bw = 3 + ((r() * 7) | 0), bh = 2 + ((r() * 5) | 0), bx = x + ((r() * (w - bw)) | 0);
    var by = y + (r() < 0.5 ? (r() * h * 0.3) : (h * 0.55 + r() * h * 0.45)); by = Math.min(by | 0, y + h - bh);
    var under = r() < 0.45 ? '#a5583f' : (r() < 0.6 ? '#b79a6a' : A[4]);
    for (j = 0; j < bh; j++) {
      var sh = (r() * 2) | 0, ww = bw - ((j === 0 || j === bh - 1) ? 2 : 0);
      F(g, bx + sh + ((j === 0 || j === bh - 1) ? 1 : 0), by + j, ww, 1, under);
    }
    F(g, bx, by, bw, 1, lt(A[2], 0.3)); P(g, bx + 1, by + 1, dk(under, 0.4)); P(g, bx + bw - 2, by + bh - 1, dk(under, 0.3));
    if (under === '#a5583f') { F(g, bx + 1, by + 2 - (bh > 3 ? 0 : 1), 2, 1, '#8f4632'); P(g, bx + bw - 3, by + 1, '#c08a68'); }
  }
  for (i = 0; i < Math.round(amount * 4); i++) { var cx = x + ((r() * w) | 0), cy = y + ((r() * h * 0.7) | 0); for (j = 0; j < 5 + ((r() * 6) | 0); j++) { P(g, cx, cy, dk(A[2], 0.4)); cx += ((r() * 3) | 0) - 1; cy += 1; } }   // grietas
}
/* buganvilia que cae: tallos verdes con racimos magenta/fucsia/morado */
function bugambilia(g, x, y, w, len, r, dir) {
  var cols = ['#C2185B', '#E0457B', '#7B2D8E', '#E0457B'], greens = ['#2F5D3A', '#3f7a46', '#5E8F4E'], i, j;
  for (i = 0; i < w; i++) {
    var hh = Math.round(len * (0.35 + 0.65 * r()) * (1 - Math.abs(i - w / 2) / (w * 0.8)));
    for (j = 0; j < hh; j++) {
      var c = r() < 0.34 ? pick(r, cols) : pick(r, greens);
      P(g, x + i, y + j, c);
      if (r() < 0.12) P(g, x + i + (dir || 1), y + j, pick(r, cols));
    }
  }
  for (i = 0; i < w; i += 3) P(g, x + i, y - 1, greens[0]);
}
function farol(g, x, y, ctx) {                                      // farol de fierro 5 x 11 pegado a la pared (x = centro, y = arriba)
  F(g, x - 3, y, 3, 1, '#2b2b30'); F(g, x - 3, y + 1, 1, 3, '#2b2b30');
  F(g, x - 1, y + 1, 3, 1, '#2b2b30'); F(g, x - 2, y + 2, 5, 1, '#2b2b30');
  F(g, x - 2, y + 3, 5, 6, ctx.night ? '#ffe9a0' : '#b8a060'); F(g, x - 2, y + 3, 1, 6, ctx.night ? '#fff8d0' : '#d8c47a'); F(g, x - 2, y + 3, 5, 1, '#2b2b30'); F(g, x - 2, y + 9, 5, 1, '#2b2b30'); P(g, x, y + 10, '#2b2b30');
  ctx.lights.push({ x: x, y: y + 6, w: 0, h: 0, kind: 'foco' });
}
function afiche(g, x, y, w, h, c, ink) { F(g, x, y, w, h, c); P(g, x, y, lt(c, 0.4)); F(g, x + 1, y + 2, w - 2, 1, ink || '#f3efe2'); if (h > 6) F(g, x + 1, y + 4, Math.max(1, w - 4), 1, ink || '#f3efe2'); P(g, x + w - 1, y + h - 1, dk(c, 0.4)); }

function glint(g, x, y, n, gl, t) {                                 // destello diagonal corto: solo aclara lo que ya hay
  for (var i = 0; i < n; i++) { var cc = Q(g, x + i, y - i); if (cc && cc.length === 7) P(g, x + i, y - i, mx(cc, gl, t)); cc = Q(g, x + i + 1, y - i); if (cc && cc.length === 7) P(g, x + i + 1, y - i, mx(cc, gl, t * 0.6)); }
}
function awning(g, x, y, w, cols, kind) {                          // toldo 8 px + volado con festones
  var i, j;
  for (i = 0; i < w; i++) {
    var s = kind === 'solid' ? 0 : (((i / 5) | 0) & 1), col = cols[s], hi = lt(col, 0.18), lo = dk(col, 0.28);
    for (j = 0; j < 8; j++) P(g, x + i, y + j, j < 2 ? hi : (j > 6 ? lo : col));
    var vh = (i % 5 === 2 && kind !== 'solid') ? 4 : 3;
    for (j = 0; j < vh; j++) P(g, x + i, y + 8 + j, j === vh - 1 ? lo : col);
  }
  AO(g, x, y + 12, w, 3, 0.35);
}

/* ---- ventana ----  o: {int, lit, frame, shut, reja, lintel, noMull, seed, col}.  Con `int` (negocio abierto) siempre hay luz; con `lit` solo de noche. */
function ventana(g, x, y, w, h, o, ctx) {
  var night = ctx.night, fr = o.frame || '#efead8', rr = px.rng(o.seed || 5), i, on = !!(o.int || o.lit);
  F(g, x - 1, y - 1, w + 2, h + 2, fr); F(g, x - 1, y - 1, w + 2, 1, lt(fr, 0.3)); F(g, x + w, y, 1, h + 1, dk(fr, 0.3));
  if (o.int) { INT[o.int](g, x, y, w, h, rr); if (!night) AO(g, x, y, w, h, 0.5); }
  else if (o.lit && night) INT.casa(g, x, y, w, h, rr);
  else {
    vgrad(g, x, y, w, h, night ? ['#1c2a3a', '#16202e', '#101824'] : ['#4d6676', '#3d5260', '#2d3d4a']);
    if (!night) { ELL(g, x + (w >> 1), y + 2, Math.max(2, w >> 2), 1, '#6f8a98'); }
  }
  if (!o.noMull) { if (w >= 9) F(g, x + (w >> 1), y, 1, h, fr); if (h >= 16) F(g, x, y + (h >> 1) - 1, w, 1, fr); }
  if (!(night && on)) glint(g, x + 2, y + h - 3, Math.min(5, h - 4), '#ffffff', 0.22);
  if (o.shut) {
    var sc = o.shut;
    for (i = 0; i < 2; i++) { var sx = i ? x + w + 1 : x - 4; F(g, sx, y - 1, 3, h + 2, sc); for (var q = 1; q < h + 1; q += 2) F(g, sx, y - 1 + q, 3, 1, dk(sc, 0.3)); F(g, sx + (i ? 2 : 0), y - 1, 1, h + 2, lt(sc, 0.2)); }
  }
  if (o.reja) { for (i = 1; i < w; i += 3) F(g, x + i, y, 1, h, '#2b2b30'); F(g, x, y + (h >> 1), w, 1, '#2b2b30'); F(g, x, y + h - 2, w, 1, '#2b2b30'); }
  if (o.lintel !== false) { F(g, x - 2, y - 3, w + 4, 2, lt(fr, 0.15)); F(g, x - 2, y - 3, w + 4, 1, '#ffffff'); AO(g, x - 2, y - 1, w + 4, 1, 0.3); }
  F(g, x - 2, y + h + 1, w + 4, 2, lt(fr, 0.1)); AO(g, x - 2, y + h + 3, w + 4, 1, 0.35);
  if (on) ctx.lights.push({ x: x + (w >> 1), y: y + (h >> 1), w: w, h: h, kind: 'local', col: o.col || '#6a4418' });
}

/* ---- balcon de cajon de madera ----  o: {wood, lit, int, seed, trim, col}; bh = alto del cajon (sin el alero ni los canecillos) */
function balconCajon(g, cx, y, bw, bh, o, ctx) {
  var wood = o.wood || '#6b4223', Wd = ramp(wood), x0 = Math.round(cx - bw / 2), night = ctx.night, i, rr = px.rng(o.seed || 9);
  var ph = bh - 6, gy = y + 1, on = !!(o.int || o.lit);
  F(g, x0 - 2, y - 4, bw + 4, 3, TEJA[2]); F(g, x0 - 2, y - 4, bw + 4, 1, TEJA[4]); F(g, x0 - 2, y - 2, bw + 4, 1, TEJA[0]);
  F(g, x0, y - 1, bw, bh + 1, Wd[2]); F(g, x0, y - 1, bw, 1, Wd[3]); F(g, x0, y - 1, 2, bh + 1, Wd[3]); F(g, x0 + bw - 2, y - 1, 2, bh + 1, Wd[1]);
  if (o.int) { INT[o.int](g, x0 + 2, gy, bw - 4, ph, rr); if (!night) AO(g, x0 + 2, gy, bw - 4, ph, 0.5); }
  else if (o.lit && night) INT.casa(g, x0 + 2, gy, bw - 4, ph, rr);
  else { vgrad(g, x0 + 2, gy, bw - 4, ph, night ? ['#1c2a3a', '#16202e', '#101824'] : ['#4d6676', '#3d5260', '#2d3d4a']); if (!night) glint(g, x0 + 4, gy + ph - 3, 5, '#ffffff', 0.22); }
  var np = Math.max(2, Math.floor((bw - 4) / 8));
  for (i = 1; i < np; i++) F(g, x0 + 2 + Math.round((bw - 4) * i / np), gy, 2, ph, Wd[2]);
  F(g, x0 + 2, gy + (ph >> 1), bw - 4, 1, Wd[2]);
  F(g, x0, gy + ph, bw, 5, Wd[2]); F(g, x0, gy + ph, bw, 1, Wd[3]); F(g, x0, gy + ph + 4, bw, 1, Wd[0]);
  for (i = 3; i < bw - 3; i += 4) { F(g, x0 + i, gy + ph + 1, 1, 3, Wd[0]); P(g, x0 + i + 1, gy + ph + 2, Wd[3]); }
  F(g, x0 - 1, gy + ph + 5, bw + 2, 2, Wd[1]); F(g, x0 - 1, gy + ph + 5, bw + 2, 1, Wd[3]);
  F(g, x0 + 2, gy + ph + 7, 2, 3, Wd[1]); F(g, x0 + bw - 4, gy + ph + 7, 2, 3, Wd[1]); P(g, x0 + 3, gy + ph + 10, Wd[0]); P(g, x0 + bw - 3, gy + ph + 10, Wd[0]);
  AO(g, x0, gy + ph + 7, bw, 5, 0.38);
  if (on) ctx.lights.push({ x: cx, y: gy + (ph >> 1), w: bw - 4, h: ph, kind: 'local', col: o.col || '#6a4418' });
}
/* ---- balcon abierto: puerta-ventana con baranda de balaustres torneados ---- */
function balconAbierto(g, cx, y, bw, bh, o, ctx) {
  var trim = o.trim || '#efead8', x0 = Math.round(cx - bw / 2), by = y + bh - 3, i;
  ventana(g, cx - 5, y + 1, 10, bh - 9, { frame: trim, lit: o.lit, shut: o.shut, seed: o.seed, col: o.col, lintel: true }, ctx);
  F(g, x0 - 2, by, bw + 4, 3, trim); F(g, x0 - 2, by, bw + 4, 1, '#ffffff'); F(g, x0 - 2, by + 2, bw + 4, 1, dk(trim, 0.35));
  var ry = by - 9, rail = o.rail || dk(trim, 0.1);
  F(g, x0, ry, bw, 2, rail); F(g, x0, ry, bw, 1, '#ffffff');
  for (i = 1; i < bw - 1; i += 3) { F(g, x0 + i, ry + 2, 1, 7, rail); P(g, x0 + i, ry + 5, lt(rail, 0.3)); }
  F(g, x0, ry + 2, 2, 7, rail); F(g, x0 + bw - 2, ry + 2, 2, 7, rail);
  AO(g, x0 - 2, by + 3, bw + 4, 3, 0.35);
  for (i = x0; i < x0 + bw; i += 6) F(g, i, by + 3, 2, 2, dk(trim, 0.3));
}

/* ---- puerta ---- o: {kind:'alto'|'porton'|'abierta'|'tapiada', wood, trim, arch, lit, int, postigo, seed} */
function puerta(g, x, y, w, h, o, ctx) {
  var Wd = ramp(o.wood || '#6b4223'), trim = o.trim || '#efead8', night = ctx.night, cx = x + (w >> 1), i, j, kind = o.kind || 'alto', rr = px.rng(o.seed || 11);
  F(g, x - 3, y - 3, w + 6, h + 3, trim); F(g, x - 3, y - 3, w + 6, 1, '#ffffff'); F(g, x - 3, y - 3, 1, h + 3, lt(trim, 0.2)); F(g, x + w + 2, y - 3, 1, h + 3, dk(trim, 0.3));
  if (kind === 'abierta') {
    INT[o.int || 'bar'](g, x, y, w, h, rr); if (!night) AO(g, x, y, w, h, 0.5);
    ctx.lights.push({ x: cx, y: y + (h >> 1), w: w, h: h - 2, kind: 'local', col: o.col || '#7a4e1a' });
  } else if (kind === 'tapiada') {
    F(g, x, y, w, h, '#2a1a14');
    for (j = 0; j < h; j += 6) { F(g, x - 1, y + j + 1, w + 2, 4, j % 12 ? '#8a6a42' : '#9a7a4a'); F(g, x - 1, y + j + 1, w + 2, 1, '#b8946a'); P(g, x + 1, y + j + 2, '#2a1a14'); P(g, x + w - 2, y + j + 2, '#2a1a14'); }
    LN(g, x, y + h - 2, x + w - 1, y + 3, '#7a5a3a'); LN(g, x, y + h - 3, x + w - 1, y + 2, '#6a4a2a');
  } else {
    F(g, x, y, w, h, '#2a1a14');
    var lw = (w - 1) >> 1;
    for (i = 0; i < 2; i++) {
      var lx = x + i * (lw + 1);
      F(g, lx, y, lw, h, Wd[2]); F(g, lx, y, lw, 1, Wd[3]); F(g, lx + (i ? lw - 1 : 0), y, 1, h, i ? Wd[1] : Wd[3]);
      var ph1 = Math.round(h * 0.4), py1 = y + 3;
      F(g, lx + 2, py1, lw - 4, ph1, Wd[1]); F(g, lx + 2, py1, lw - 4, 1, Wd[0]); F(g, lx + 2, py1 + ph1 - 1, lw - 4, 1, Wd[3]); F(g, lx + 3, py1 + 1, lw - 6, ph1 - 3, Wd[2]);
      var py2 = y + 3 + ph1 + 3, ph2 = h - (py2 - y) - 3;
      if (ph2 > 4) { F(g, lx + 2, py2, lw - 4, ph2, Wd[1]); F(g, lx + 2, py2, lw - 4, 1, Wd[0]); F(g, lx + 2, py2 + ph2 - 1, lw - 4, 1, Wd[3]); F(g, lx + 3, py2 + 1, lw - 6, ph2 - 3, Wd[2]); }
      if (kind === 'porton') { F(g, lx, y + Math.round(h * 0.22), lw, 2, '#2b2b30'); F(g, lx, y + Math.round(h * 0.68), lw, 2, '#2b2b30'); for (j = 2; j < lw - 1; j += 5) { P(g, lx + j, y + Math.round(h * 0.22), '#8c8a93'); P(g, lx + j, y + Math.round(h * 0.68), '#8c8a93'); } }
      else for (j = 3; j < lw - 3; j += 4) { P(g, lx + j, py1 + 1, '#e6c85a'); }
      DISC(g, i ? x + lw - 1 + 3 : x + lw - 2, y + Math.round(h * 0.55), 1, '#e6c85a');
    }
    F(g, cx, y, 1, h, '#1c1a22');
    if (o.postigo) {
      var pxx = x + 3, pyy = y + 5, lit = night && o.lit;
      F(g, pxx - 1, pyy - 1, 5, 6, Wd[0]); F(g, pxx, pyy, 3, 4, lit ? '#ffe9a0' : '#1c1a22'); if (lit) ctx.lights.push({ x: pxx + 1, y: pyy + 2, w: 3, h: 4, kind: 'local', col: '#7a4e1a' });
    }
  }
  if (o.arch) {
    var r2 = w >> 1;
    for (j = 0; j < r2; j++) { var half = Math.floor(Math.sqrt(r2 * r2 - (r2 - j - 0.5) * (r2 - j - 0.5)) + 0.5), cut = r2 - half; F(g, x, y + j, cut, 1, trim); F(g, x + w - cut, y + j, cut, 1, trim); }
  }
  F(g, x - 3, y + h, w + 6, 2, '#b8b3a2'); F(g, x - 3, y + h, w + 6, 1, '#d6d1b8');
  AO(g, x, y, w, 2, 0.4);
}
/* ---- zaguan: pasillo en arco hacia el patio, con una lampara al fondo ---- */
function zaguan(g, x, y, w, h, ctx, trim) {
  var night = ctx.night, cx = x + (w >> 1), r2 = w >> 1, j;
  F(g, x - 4, y - 4, w + 8, h + 4, trim); F(g, x - 4, y - 4, w + 8, 1, '#ffffff'); F(g, x + w + 3, y - 4, 1, h + 4, dk(trim, 0.3));
  F(g, x, y, w, h, '#1a1218');
  for (j = 0; j < h; j++) { var t = j / h; F(g, x + 2, y + j, w - 4, 1, night ? (j < h * 0.5 ? '#3a2418' : '#5a3a22') : (j < h * 0.5 ? '#241a1a' : '#33261e')); }
  F(g, cx - 4, y + 6, 8, h - 12, night ? '#ffd98a' : '#6a5a40'); F(g, cx - 3, y + 7, 6, 3, night ? '#fff0c0' : '#8a7a5a');   // el patio, al fondo
  F(g, x, y + h - 5, w, 5, '#4a4048'); for (j = 0; j < w; j += 5) F(g, x + j, y + h - 5, 1, 5, '#2a2430');
  lampPend(g, cx, y, 5, night ? '#ffe9a0' : '#b8a060');
  F(g, x + 2, y + h - 12, 2, 8, '#6b4223'); F(g, x + 2, y + h - 12, 6, 1, '#a8693a'); guitar(g, x + 4, y + h - 14, '#b07a45');
  F(g, x + w - 8, y + h - 8, 6, 2, '#8a5a30'); F(g, x + w - 7, y + h - 6, 1, 3, '#5a3a20'); F(g, x + w - 4, y + h - 6, 1, 3, '#5a3a20');
  if (!night) AO(g, x, y, w, h, 0.25);
  for (j = 0; j < r2; j++) { var half = Math.floor(Math.sqrt(r2 * r2 - (r2 - j - 0.5) * (r2 - j - 0.5)) + 0.5), cut = r2 - half; F(g, x, y + j, cut, 1, trim); F(g, x + w - cut, y + j, cut, 1, trim); }
  F(g, x - 4, y + h, w + 8, 2, '#b8b3a2');
  ctx.lights.push({ x: cx, y: y + (h >> 1), w: w - 4, h: h - 4, kind: 'local', col: '#8a5a1a' }, { x: cx, y: y + 6, w: 0, h: 0, kind: 'foco' });
}

/* ---- rotulo ---- st: {style:'tabla'|'placa'|'neon'|'pintado', bg, ink, edge, shadow, icon, iconCol, glow} */
function signBoard(g, x, y, w, h, B, st, ctx) {
  var style = st.style || 'tabla', night = ctx.night, bg = st.bg || '#4a3028', ink = st.ink || '#f0e0b0', tx = x + 2, tW = w - 4, i;
  if (style === 'neon') {
    F(g, x, y, w, h, '#17141c'); FR(g, x, y, w, h, '#2a2630');
    FR(g, x + 1, y + 1, w - 2, h - 2, night ? ink : mx(ink, '#17141c', 0.6)); P(g, x + 1, y + 1, '#17141c'); P(g, x + w - 2, y + 1, '#17141c');
  } else if (style === 'placa') {
    F(g, x, y, w, h, bg); FR(g, x, y, w, h, st.edge || '#f3efe2'); FR(g, x + 1, y + 1, w - 2, h - 2, dk(bg, 0.25)); P(g, x, y, null); P(g, x + w - 1, y, null); P(g, x, y + h - 1, null); P(g, x + w - 1, y + h - 1, null);
    F(g, x + 2, y + 2, w - 4, 1, lt(bg, 0.2));
  } else if (style === 'pintado') {
    if (st.bg) { F(g, x, y, w, h, st.bg); for (i = 0; i < w; i += 5) { P(g, x + i, y, null); P(g, x + i + 2, y + h - 1, null); } F(g, x, y, w, 1, lt(st.bg, 0.3)); }
  } else {
    F(g, x, y, w, h, bg); F(g, x, y, w, 1, lt(bg, 0.3)); F(g, x, y + h - 1, w, 1, dk(bg, 0.4)); F(g, x, y, 1, h, lt(bg, 0.15)); F(g, x + w - 1, y, 1, h, dk(bg, 0.3));
    FR(g, x + 2, y + 2, w - 4, h - 4, dk(bg, 0.22)); P(g, x + 1, y + 1, '#8c8a93'); P(g, x + w - 2, y + 1, '#8c8a93'); P(g, x + 1, y + h - 2, '#8c8a93'); P(g, x + w - 2, y + h - 2, '#8c8a93');
    for (i = 4; i < w - 4; i += 9) P(g, x + i, y + 1, dk(bg, 0.3));
  }
  if (st.icon && ICON[st.icon]) { ICON[st.icon](g, x + 4, y + ((h - 9) >> 1), st.iconCol || ink); tx += 13; tW -= 13; }
  var o = { shadow: st.shadow || (style === 'tabla' ? dk(bg, 0.5) : null), subInk: st.subInk || null };
  if (style === 'neon') { var dim = mx(ink, '#17141c', night ? 0.62 : 0.8), main = night ? ink : mx(ink, '#17141c', 0.5); o = { outline: dim, shadow: null, subInk: main }; ink = main; }
  signText(g, B, tx, y + 1, tW, h - 2, ink, o);
  if (style === 'neon' || st.glow) ctx.lights.push({ x: x + (w >> 1), y: y + (h >> 1), w: w - 6, h: h - 4, kind: 'local', col: st.glow || mx(st.ink || '#ffc766', '#000000', 0.62) });
  ctx.lights.push({ x: x + (w >> 1), y: y + 2, w: 0, h: 0, kind: 'foco' });
}

/* ======================== FACHADA: CONSTRUCCION GENERAL ======================== */
function layout(H, sp, signed, sub) {
  var L = { roofH: sp.roof === 'parapeto' ? 10 : 8, base: 4, signH: signed ? (sub ? 18 : 16) : 0 }, rem;
  L.gapSign = signed ? 1 : 0;
  if ((sp.floors || 1) >= 2) {
    rem = H - L.roofH - 4 - L.signH - L.gapSign - L.base;
    L.upH = clamp(Math.round(rem * 0.47), 22, 52); L.gH = rem - L.upH;
    L.upY = L.roofH; L.bandY = L.upY + L.upH; L.signY = L.bandY + 4;
  } else { L.upH = 0; L.upY = 0; L.bandY = -1; L.signY = L.roofH; L.gH = H - L.roofH - L.signH - L.gapSign - L.base; }
  L.gY = L.signY + L.signH + L.gapSign;
  return L;
}
/* dibuja una casona completa en su propia rejilla de W x H. B = marca (o null: sin rotulo, para los lotes). Misma semilla = misma estructura de dia y de noche. */
function buildFacadeG(sp, B, W, H, night, seed, o) {
  o = o || {};
  var g = new G(W, H), rW = px.rng(seed * 3 + 1), rP = px.rng(seed * 5 + 2), rB = px.rng(seed * 7 + 3), lights = [], i, j;
  var ctx = { night: night, lights: lights, g: g, W: W, H: H };
  var signed = !!B && !o.noSign, L = layout(H, sp, signed, !!(B && B.sub)), A = ramp(sp.wall), trim = sp.trim || '#efead8';
  ctx.L = L;
  // pared
  F(g, 0, L.roofH, W, H - L.roofH, A[2]); speck(g, 0, L.roofH, W, H - L.roofH, rB, W * H / 30, [A[1], A[3]]);
  F(g, 0, L.roofH, 4, H - L.roofH, A[3]); F(g, 0, L.roofH, 1, H - L.roofH, A[4]); F(g, W - 4, L.roofH, 4, H - L.roofH, A[1]); F(g, W - 1, L.roofH, 1, H - L.roofH, A[0]);
  // zocalo
  var zocH = 9, zy = H - L.base - zocH, zc = sp.zoc || dk(A[2], 0.28);
  F(g, 4, zy, W - 8, zocH, zc); F(g, 4, zy, W - 8, 1, lt(zc, 0.3));
  if (sp.zocBrick) { for (j = zy + 1; j < zy + zocH; j += 3) { F(g, 4, j + 2, W - 8, 1, dk(zc, 0.3)); for (i = ((j / 3 | 0) & 1) ? 4 : 8; i < W - 4; i += 8) F(g, i, j, 1, 3, dk(zc, 0.3)); } }
  AO(g, 4, zy - 12, W - 8, 12, 0.1);
  peel(g, 4, L.roofH + 2, W - 8, H - L.roofH - L.base - 4, rP, sp.worn === undefined ? 0.5 : sp.worn, A);
  if (sp.wornZoc) peel(g, 4, zy, W - 8, zocH, rP, sp.wornZoc, ramp(zc));
  // techo y entrepiso
  roofEdge(g, W, L.roofH, sp.roof || 'teja', A, rB);
  AO(g, 4, L.roofH, W - 8, 3, 0.35);
  if (L.upH) {
    F(g, 0, L.bandY, W, 4, A[4]); F(g, 0, L.bandY, W, 1, '#ffffff'); F(g, 0, L.bandY + 3, W, 1, A[1]);
    for (i = 2; i < W - 2; i += 4) F(g, i, L.bandY + 3, 2, 1, A[2]);
    AO(g, 4, L.bandY + 4, W - 8, 3, 0.3);
  }
  // bahias
  var nb = Math.max(2, Math.round((W - 8) / (sp.bayW || 30))), bwid = (W - 8) / nb, cxs = [];
  for (i = 0; i < nb; i++) cxs.push(Math.round(4 + bwid * (i + 0.5)));
  var di = sp.door === 'l' ? 0 : (sp.door === 'r' ? nb - 1 : (nb >> 1)), litP = sp.litP === undefined ? 0.55 : sp.litP;
  ctx.cxs = cxs; ctx.di = di; ctx.bwid = bwid;
  // piso alto
  if (L.upH) {
    var bi = sp.bal === 'none' ? -1 : (sp.balBay !== undefined ? sp.balBay : di), uh = clamp(L.upH - 11, 12, 30), uy = L.upY + 5 + ((L.upH - 11 - uh) >> 1), ww = clamp(Math.round(bwid - 14), 8, 14);
    for (i = 0; i < nb; i++) {
      var lit = rW() < litP, isBal = sp.bal !== 'none' && (i === bi || (sp.balAll && (i === 0 || i === nb - 1))), seedW = seed * 13 + i * 7;
      if (isBal) {
        var bw2 = Math.min(Math.round(bwid) - 2, sp.balW || 34);
        if (sp.bal === 'abierto') balconAbierto(g, cxs[i], L.upY + 5, bw2, L.upH - 6, { trim: sp.balTrim || trim, lit: lit, shut: sp.shut, seed: seedW, rail: sp.rail }, ctx);
        else balconCajon(g, cxs[i], L.upY + 6, bw2, L.upH - 12, { wood: sp.balCol || '#6b4223', lit: lit || !!sp.upInt, int: sp.upInt, seed: seedW }, ctx);
      } else ventana(g, cxs[i] - (ww >> 1), uy, ww, uh, { frame: trim, lit: lit, shut: sp.shut, reja: sp.upReja, seed: seedW }, ctx);
    }
  }
  // planta baja
  var gY = L.gY, gH = L.gH, floorY = H - L.base, gk = sp.ground || 'std';
  if (gk === 'terraza') {
    var ox = 5, ow = W - 10, oy = gY, oh = gH - 1;
    F(g, ox - 1, oy - 1, ow + 2, oh + 1, '#2a1a14');
    INT[sp.gInt || 'mesas'](g, ox, oy, ow, oh - 1, px.rng(seed + 77)); if (!night) AO(g, ox, oy, ow, oh, 0.42);
    var wd = ramp(sp.postCol || '#6b4223');
    for (i = ox; i < ox + ow; i += 30) { F(g, i - 1, oy, 3, oh, wd[2]); F(g, i - 1, oy, 1, oh, wd[3]); F(g, i + 1, oy, 1, oh, wd[1]); }
    F(g, ox, oy, ow, 3, wd[2]); F(g, ox, oy, ow, 1, wd[3]); AO(g, ox, oy + 3, ow, 3, 0.4);
    F(g, ox, oy + oh - 8, ow, 2, wd[3]); for (i = ox + 1; i < ox + ow - 1; i += 3) F(g, i, oy + oh - 6, 1, 6, wd[1]);
    if (sp.awn) awning(g, ox, oy - 2, ow, sp.awn.cols, sp.awn.kind);
    lights.push({ x: W >> 1, y: oy + (oh >> 1), w: ow, h: oh - 2, kind: 'local', col: '#7a4e1a' });
  } else if (gk === 'barra') {
    var bx = 6, bww = W - 12, by = gY + 2, bhh = gH - 4;
    F(g, bx - 2, by - 2, bww + 4, bhh + 2, sp.winFrame || '#2a1a14');
    INT[sp.gInt || 'parrilla'](g, bx, by, bww, bhh - 1, px.rng(seed + 33)); if (!night) AO(g, bx, by, bww, bhh, 0.42);
    F(g, bx - 2, by + bhh - 4, bww + 4, 3, '#8a5a30'); F(g, bx - 2, by + bhh - 4, bww + 4, 1, '#c99458');
    if (sp.awn) awning(g, bx - 2, by - 3, bww + 4, sp.awn.cols, sp.awn.kind);
    lights.push({ x: W >> 1, y: by + (bhh >> 1), w: bww, h: bhh - 2, kind: 'local', col: sp.gcol || '#8a3a14' });
  } else {
    var ggw = sp.gww || clamp(Math.round(bwid - 12), 8, 16), gwh = clamp(gH - 17, 12, 24), gwy = gY + 4 + ((gH - 8 - 4 - gwh) >> 1);
    var dW = sp.doorW || (sp.doorKind === 'porton' ? 28 : 20), dH = gH - 2;
    for (i = 0; i < nb; i++) {
      if (i === di) {
        var dx = cxs[i] - (dW >> 1), dy = gY + 2;
        if (sp.doorKind === 'zaguan') zaguan(g, dx, dy, dW, dH, ctx, trim);
        else puerta(g, dx, dy, dW, dH, { kind: sp.doorKind || 'alto', wood: sp.doorCol, trim: trim, arch: sp.arch, postigo: sp.postigo !== false, lit: rW() < 0.7, int: sp.doorInt || sp.gInt, seed: seed * 17 + i, col: sp.gcol }, ctx);
      } else if (!sp.noGWin) {
        ventana(g, cxs[i] - (ggw >> 1), gwy, ggw, gwh, { frame: sp.winFrame || trim, int: sp.gInt, lit: rW() < 0.8, reja: sp.reja !== false, shut: sp.gshut, seed: seed * 19 + i, col: sp.gcol }, ctx);
        if (sp.awn) awning(g, cxs[i] - (ggw >> 1) - 3, gwy - 4, ggw + 6, sp.awn.cols, sp.awn.kind);
      }
    }
  }
  // base / vereda
  F(g, 0, floorY, W, L.base, '#8a8478'); F(g, 0, floorY, W, 1, '#b8b3a2'); F(g, 0, floorY + 3, W, 1, '#5a5448');
  // buganvilias (antes del rotulo: el rotulo las tapa un poco)
  (sp.vines || []).forEach(function (v) { bugambilia(g, v.x < 0 ? W + v.x : v.x, v.y === undefined ? L.roofH : v.y, v.w, v.len, px.rng(seed + (v.x | 0) + 5), v.dir || 1); });
  // rotulo
  if (signed) {
    var st = sp.sign || {}, sw = Math.min(W - 12, st.w || Math.max(80, Math.min(W - 16, 132))), sx = (W - sw) >> 1;
    signBoard(g, sx, L.signY, sw, L.signH, B, st, ctx);
  }
  // faroles y extras
  if (sp.farol) { var fx = cxs[di] - ((sp.doorW || (sp.doorKind === 'porton' ? 28 : 20)) >> 1) - 8; farol(g, fx, gY + 6, ctx); if (sp.farol === 2) farol(g, 2 * cxs[di] - fx, gY + 6, ctx); }
  if (sp.extra) sp.extra(g, ctx, L, sp, seed);
  // contorno: costados y borde alto
  for (i = 0; i < W; i++) if (g.d[i]) g.d[i] = K;
  F(g, 0, L.roofH, 1, H - L.roofH, K); F(g, W - 1, L.roofH, 1, H - L.roofH, K);
  outline(g, K);
  return { g: g, lights: lights, L: L };
}

/* ======================== EXTRAS POR LOCAL ======================== */
function festoon(g, ctx, x0, x1, y0, sag, step, seed) {            // guirnalda de focos de colores
  var cols = ['#fff0a0', '#ffb840', '#ff6a8a', '#7ae0ff', '#a8f07a'], night = ctx.night, Wd = x1 - x0, x, k = 0, t, yy;
  for (x = 0; x <= Wd; x++) { t = x / Wd; P(g, x0 + x, y0 + Math.round(sag * 4 * t * (1 - t)), '#3a3040'); }
  for (x = step >> 1; x < Wd; x += step) {
    t = x / Wd; yy = y0 + Math.round(sag * 4 * t * (1 - t)) + 1;
    var c = cols[(k + (seed | 0)) % cols.length]; k++;
    F(g, x0 + x - 1, yy, 3, 3, night ? c : mx(c, '#6a5a40', 0.5)); if (night) P(g, x0 + x, yy, '#ffffff');
    if (k % 3 === 0) ctx.lights.push({ x: x0 + x, y: yy + 1, w: 0, h: 0, kind: 'foco' });
  }
}
function posters(g, ctx, L, sp, seed) {                             // afiches pegados junto a la puerta
  var r = px.rng(seed + 31), dx = ctx.cxs[ctx.di], dw = (sp.doorW || 20) >> 1, cols = ['#d9202c', '#2f72b0', '#f2c230', '#7a3fb0', '#e8731a', '#f3efe2'], i;
  for (i = 0; i < 2; i++) afiche(g, dx - dw - 10 - i * 8, L.gY + 6 + ((r() * 5) | 0), 6, 8 + ((r() * 3) | 0), pick(r, cols), '#17141c');
  for (i = 0; i < 2; i++) afiche(g, dx + dw + 5 + i * 8, L.gY + 8 + ((r() * 4) | 0), 6, 9, pick(r, cols), '#17141c');
}
function hoyJarana(g, ctx, L, sp) {                                 // pizarra de caballete con la funcion de hoy
  var x = ctx.cxs[ctx.di] + (sp.doorW >> 1) + 12, y = L.gY + L.gH - 20;
  F(g, x, y, 14, 16, '#2a2a30'); FR(g, x, y, 14, 16, '#8a5a30'); txt(g, 'HOY', x + 7, y + 3, 'a5', '#f3efe2'); txt(g, 'PEÑA', x + 7, y + 10, 'a5', '#f0cc50');
  F(g, x + 2, y + 16, 2, 3, '#5a3a20'); F(g, x + 10, y + 16, 2, 3, '#5a3a20');
}
function decoFlutes(g, ctx, L, sp) {                                // art deco: estrias verticales entre las bahias del piso alto
  var A = ramp(sp.wall), i;
  for (i = 1; i < ctx.cxs.length; i++) { var x = Math.round(4 + ctx.bwid * i) - 2; F(g, x, L.upY + 2, 4, L.upH, A[4]); F(g, x, L.upY + 2, 1, L.upH, '#ffffff'); F(g, x + 3, L.upY + 2, 1, L.upH, A[1]); F(g, x + 1, L.upY + 2, 1, L.upH, A[3]); }
}
function tablones(g, ctx, L, sp) {                                  // casona abandonada: tablones cruzados sobre una ventana alta
  var x = ctx.cxs[0] - 8, y = L.upY + 6, w = 16, h = Math.max(14, L.upH - 14), c = '#8a6a42';
  LN(g, x, y + 2, x + w, y + h - 4, c); LN(g, x, y + 3, x + w, y + h - 3, '#6a4a2a'); LN(g, x + w, y + 2, x, y + h - 4, c); LN(g, x + w, y + 3, x, y + h - 3, '#6a4a2a');
  F(g, x - 1, y + (h >> 1), w + 2, 3, '#7a5a3a'); F(g, x - 1, y + (h >> 1), w + 2, 1, '#b8946a');
}

/* ======================== ESPECIFICACIONES POR LOCAL ======================== */
/* H = alto (64 una planta, 96 dos plantas, 112 la peña grande).  floors, wall (pared), trim (marcos), zoc (zocalo), worn (descascarado 0..1), roof (teja|calamina|parapeto),
   bal (cajon|abierto|none), ground (std|terraza|barra), gInt (negocio visible por las ventanas), doorKind (alto|porton|abierta|tapiada|zaguan), sign {style,bg,ink,icon,...} */
var WOOD = '#5B3A29', GOLD = '#f0cc50', TABLA = '#2a1a14';
var SPEC = {
  cala:         { H: 64, floors: 1, wall: '#9DB7D6', zoc: '#5E7FA3', worn: 0.35, roof: 'calamina', ground: 'terraza', gInt: 'mesas', postCol: '#e8e4d8', awn: { cols: ['#2b6bc8', '#f3efe2'], kind: 'stripe' }, sign: { style: 'tabla', bg: '#2f5a80', ink: '#f3efe2', icon: 'fish' } },
  javier:       { H: 64, floors: 1, wall: '#D9A441', zoc: '#8a5a30', worn: 0.5, roof: 'teja', ground: 'terraza', gInt: 'mesas', sign: { style: 'pintado', bg: '#f3e8c8', ink: '#7a2a1c' }, vines: [{ x: -22, w: 18, len: 22 }] },
  posadaMirador: { H: 96, floors: 2, wall: '#F0E4C8', worn: 0.55, roof: 'teja', bal: 'abierto', balW: 36, shut: '#2F5D3A', gInt: 'mesas', doorKind: 'alto', doorCol: WOOD, arch: true, farol: 2, sign: { style: 'tabla', bg: '#3a2a24', ink: '#f0e0b0' }, vines: [{ x: 4, w: 14, len: 38 }, { x: -20, w: 14, len: 30 }] },
  tioMario:     { H: 64, floors: 1, wall: '#F2D480', zoc: '#a31f1a', worn: 0.45, roof: 'calamina', ground: 'barra', gInt: 'parrilla', awn: { cols: ['#a31f1a', '#f3efe2'], kind: 'stripe' }, sign: { style: 'placa', bg: '#a31f1a', ink: '#f2e63c', edge: '#f2e63c', icon: 'flame' } },
  picas:        { H: 64, floors: 1, wall: '#B5523B', zoc: '#6a2a1c', worn: 0.5, roof: 'teja', gInt: 'mesas', door: 'l', farol: true, sign: { style: 'tabla', bg: '#f3e4c2', ink: '#8a2a1a', shadow: null } },
  cantaRana:    { H: 64, floors: 1, wall: '#A9D0C4', zoc: '#2f6a50', worn: 0.55, roof: 'calamina', gInt: 'pescado', sign: { style: 'placa', bg: '#2f6a50', ink: '#f3efe2', icon: 'frog' } },
  ayahuasca:    { H: 96, floors: 2, wall: '#3a2c34', trim: '#d8c8a8', zoc: '#241a22', worn: 0.3, roof: 'parapeto', bal: 'cajon', balCol: '#241a1a', balW: 36, upInt: 'bar', gInt: 'bar', doorKind: 'porton', doorCol: '#241a1a', arch: true, farol: 2, litP: 0.7, sign: { style: 'pintado', ink: '#f3efe2' } },
  isolina:      { H: 64, floors: 1, wall: '#A5583F', zoc: '#6a2a1c', zocBrick: true, worn: 0.45, roof: 'teja', gInt: 'mesas', farol: true, sign: { style: 'tabla', bg: '#6b4223', ink: '#f3efe2' } },
  juanito:      { H: 64, floors: 1, wall: '#EFEAD8', zoc: '#2F5D3A', worn: 0.4, roof: 'calamina', gInt: 'afiches', doorKind: 'abierta', doorInt: 'afiches', gcol: '#5a8a80', sign: { style: 'placa', bg: '#2F5D3A', ink: '#f3efe2' } },
  oitaNoma:     { H: 96, floors: 2, wall: '#D98C8C', worn: 0.5, roof: 'teja', bal: 'cajon', balCol: WOOD, gInt: 'pena', doorKind: 'porton', doorCol: WOOD, arch: true, farol: 2, sign: { style: 'tabla', bg: TABLA, ink: GOLD, icon: 'guitar', iconCol: '#d8a050' } },
  barrancoBeer: { H: 64, floors: 1, wall: '#5E7FA3', zoc: '#34475a', worn: 0.25, roof: 'parapeto', gInt: 'cerveza', sign: { style: 'placa', bg: '#c88a1c', ink: '#2a1a14', icon: 'mug' } },
  piselli:      { H: 64, floors: 1, wall: '#E8D2A8', zoc: '#8a6a42', worn: 0.85, wornZoc: 0.4, roof: 'teja', gInt: 'bodega', doorKind: 'alto', doorCol: '#4a3028', arch: true, sign: { style: 'pintado', bg: '#efe6c8', ink: '#2F5D3A', icon: 'bottle' } },
  estacion:     { H: 64, floors: 1, wall: '#2F5D3A', zoc: '#1f3f28', worn: 0.35, roof: 'calamina', gInt: 'bar', farol: true, sign: { style: 'placa', bg: '#2a4a78', ink: '#f3efe2' } },
  victoria:     { H: 64, floors: 1, wall: '#4a5a7a', zoc: '#2a3550', worn: 0.3, roof: 'parapeto', gInt: 'bar', sign: { style: 'neon', ink: '#e0457b' } },
  donPorfirio:  { H: 96, floors: 2, wall: '#E8B7A0', worn: 0.55, roof: 'teja', bal: 'cajon', balCol: WOOD, gInt: 'pena', doorKind: 'porton', doorCol: WOOD, arch: true, farol: 2, sign: { style: 'tabla', bg: TABLA, ink: '#f1e6c0', icon: 'guitar' } },
  laOficina:    { H: 96, floors: 2, wall: '#F2D480', worn: 0.5, roof: 'parapeto', bal: 'abierto', shut: '#2F5D3A', gInt: 'pena', doorKind: 'alto', doorCol: WOOD, farol: true, sign: { style: 'placa', bg: '#3a2a24', ink: GOLD, edge: GOLD } },
  penaCarajo:   { H: 64, floors: 1, wall: '#B5523B', zoc: '#6a2a1c', worn: 0.5, roof: 'teja', gInt: 'pena', doorKind: 'porton', doorCol: WOOD, farol: 2, sign: { style: 'tabla', bg: TABLA, ink: GOLD, icon: 'guitar', iconCol: '#d8a050' } },
  sargento:     { H: 64, floors: 1, wall: '#2a2630', trim: '#5a5666', zoc: '#17141c', worn: 0.3, roof: 'parapeto', gInt: 'rock', extra: posters, sign: { style: 'neon', ink: '#5ce1e6', icon: 'guitar', iconCol: '#c0261c' } },
  laNoche:      { H: 96, floors: 2, wall: '#34456a', trim: '#cfd6e4', zoc: '#1f2a44', worn: 0.3, roof: 'parapeto', bal: 'cajon', balCol: '#17141c', gInt: 'rock', doorKind: 'alto', doorCol: '#17141c', sign: { style: 'neon', ink: '#5ce1e6' } },
  candelaria:   { H: 96, floors: 2, wall: '#E8DCC0', trim: '#2F5D3A', zoc: '#2F5D3A', worn: 0.3, roof: 'parapeto', bal: 'none', gInt: 'bar', doorKind: 'alto', doorCol: '#2F5D3A', litP: 0.6, extra: decoFlutes, sign: { style: 'placa', bg: '#2F5D3A', ink: GOLD, edge: GOLD } },
  santos:       { H: 64, floors: 1, wall: '#9DB7D6', zoc: '#5E7FA3', worn: 0.4, roof: 'calamina', gInt: 'cafe', sign: { style: 'tabla', bg: '#5a4030', ink: '#f3efe2', icon: 'mug' } },
  floCanela:    { H: 64, floors: 1, wall: '#D98C8C', zoc: '#8a3a4a', worn: 0.45, roof: 'teja', gInt: 'mesas', vines: [{ x: 4, w: 14, len: 20 }], sign: { style: 'tabla', bg: '#efead8', ink: '#8a2a3a', shadow: null } },
  /* inventadas fijas */
  ultimaJarana: { H: 112, floors: 2, wall: '#E08A5A', trim: '#f3e8c8', zoc: '#6a2a1c', worn: 0.45, roof: 'teja', bal: 'cajon', balCol: WOOD, balAll: true, balW: 42, bayW: 56, gww: 24, gInt: 'pena', doorKind: 'porton', doorW: 44, doorCol: '#2a3a2a', arch: true, farol: 2, litP: 1,
    sign: { style: 'tabla', bg: TABLA, ink: GOLD, icon: 'guitar', iconCol: '#d8a050', w: 150 },
    extra: function (g, ctx, L, sp, seed) { festoon(g, ctx, 3, ctx.W - 3, L.bandY - 4, 4, 6, seed);   /* ajustes 2026-11-21: antes (bandY-3, comba 6) los focos tapaban la tilde de ÚLTIMA */ festoon(g, ctx, 3, ctx.W - 3, L.gY - 1, 4, 5, seed + 2); posters(g, ctx, L, sp, seed); } },
  barLucho:     { H: 96, floors: 2, wall: '#A9D0C4', trim: '#efead8', zoc: '#5a8a7a', worn: 0.6, roof: 'calamina', bal: 'abierto', balW: 34, shut: '#c88a1c', gInt: 'bar', doorKind: 'abierta', doorInt: 'bar', farol: 2, litP: 0.8, sign: { style: 'neon', ink: '#ffc766' } },
  zaguanCeledonio: { H: 96, floors: 2, wall: '#D9A441', trim: '#efead8', zoc: '#8a5a30', worn: 0.8, wornZoc: 0.3, roof: 'teja', bal: 'cajon', balCol: '#4a3028', door: 'c', doorKind: 'zaguan', doorW: 28, noGWin: false, litP: 0.35, vines: [{ x: -24, w: 20, len: 30 }], sign: { style: 'pintado', bg: '#efe6c8', ink: '#6a2a1c', w: 76 } }
};
var GENERIC = { H: 64, floors: 1, wall: '#E8D2A8', worn: 0.5, roof: 'teja', gInt: 'mesas', sign: { style: 'tabla', bg: '#4a3028', ink: '#f0e0b0' } };

/* ======================== API: fachada(brand, wTiles) ======================== */
var cache = {};
var DEFW = { cala: 7, javier: 7, posadaMirador: 7, tioMario: 5, picas: 5, cantaRana: 5, ayahuasca: 8, isolina: 6, juanito: 5, oitaNoma: 8, barrancoBeer: 6, piselli: 6, estacion: 6, victoria: 5, donPorfirio: 8, laOficina: 7, penaCarajo: 6, sargento: 6, laNoche: 6, candelaria: 7, santos: 8, floCanela: 6, ultimaJarana: 11, barLucho: 7, zaguanCeledonio: 6 };
function fachada(brand, wTiles) {
  wTiles = clamp(Math.round(wTiles || DEFW[brand] || 6), 4, 16);
  if (brand === 'ultimaJarana') wTiles = Math.max(9, wTiles);
  var key = brand + '|' + wTiles + '|' + (real() ? 'R' : 'P');
  if (cache[key]) return cache[key];
  var sp = SPEC[brand] || GENERIC, W = wTiles * 16, H = sp.H, B = bget(brand) || { main: String(brand).toUpperCase(), sub: '' }, res;
  try {
    var seed = seedOf(brand) + W * 7, d = buildFacadeG(sp, B, W, H, false, seed), n = buildFacadeG(sp, B, W, H, true, seed);
    var cv = d.g.toCanvas(W >> 1, H, W, 6), cn = n.g.toCanvas(W >> 1, H, W, 6);
    cv.noche = cn;
    res = { cv: cv, ax: W >> 1, ay: H, lights: d.lights, noche: cn };
  } catch (e) {
    if (window.console) console.warn('[br.casona] fachada', brand, e);
    var g = new G(W, H); F(g, 0, 0, W, H, '#a8987f'); FR(g, 0, 0, W, H, K); px.text(g, String(brand).toUpperCase(), W >> 1, 20, { font: 'a5', ink: '#fff', align: 'c' });
    var cv2 = g.toCanvas(W >> 1, H, W, 6); cv2.noche = cv2; res = { cv: cv2, ax: W >> 1, ay: H, lights: [], noche: cv2 };
  }
  cache[key] = res;
  return res;
}
var epoch = 0;
if (typeof px.onMarcas === 'function') px.onMarcas(function () { epoch++; if (S.br.casona) S.br.casona.epoch = epoch; });

/* ======================== LOTES: br_casona1..6 ======================== */
var PASTEL = { crema: '#F0E4C8', salmon: '#E8B7A0', celeste: '#9DB7D6', blanco: '#EFEAD8', ocre: '#D9A441', verde: '#A9D0C4', mostaza: '#F2D480', rosa: '#D98C8C', azul: '#9DB7D6' };
var LOTSPEC = [
  { wall: '#E8B7A0', zoc: '#8a5a40', worn: 0.55, roof: 'teja', bal: 'cajon', balCol: WOOD, doorKind: 'alto', doorCol: '#2F5D3A', arch: true, farol: true, shut: '#2F5D3A', vines: [{ x: -24, w: 18, len: 30 }], litP: 0.6 },
  { wall: '#A9D0C4', zoc: '#5a8a7a', worn: 0.6, roof: 'calamina', bal: 'abierto', balW: 34, doorKind: 'alto', doorCol: '#5E7FA3', shut: '#5E7FA3', litP: 0.5 },
  { wall: '#F2D480', zoc: '#a88a3c', worn: 0.5, roof: 'parapeto', bal: 'cajon', balCol: '#6b4223', balAll: true, balW: 28, doorKind: 'porton', doorCol: '#6b4223', arch: true, litP: 0.55 },
  { wall: '#9DB7D6', zoc: '#5E7FA3', worn: 0.5, roof: 'teja', bal: 'none', upReja: true, shut: '#2F5D3A', gshut: '#2F5D3A', doorKind: 'alto', doorCol: WOOD, vines: [{ x: 4, w: 30, len: 46 }, { x: -26, w: 22, len: 38 }], litP: 0.6 },
  { wall: '#D98C8C', trim: '#f0e4c8', zoc: '#8a3a4a', worn: 0.4, roof: 'parapeto', bal: 'none', doorKind: 'alto', doorCol: '#2a1a1a', extra: decoFlutes, farol: true, litP: 0.5 },
  { wall: '#F0E4C8', zoc: '#8a6a42', worn: 1.0, wornZoc: 0.5, roof: 'calamina', bal: 'cajon', balCol: '#4a3028', doorKind: 'tapiada', extra: tablones, litP: 0.08 }
];
function roofTop(g, W, h, kind, r, A) {                             // techo visto desde arriba (el lote lo pone sobre la cara sur)
  var i, j;
  if (kind === 'teja') {
    tejaRows(g, 0, 0, W, h, 0); F(g, 0, 0, W, 2, TEJA[4]); F(g, 0, 0, 3, h, TEJA[3]); F(g, W - 3, 0, 3, h, TEJA[1]);
    var rg = (h * 0.45) | 0; F(g, 2, rg, W - 4, 2, TEJA[4]); F(g, 2, rg + 2, W - 4, 1, TEJA[0]); for (i = 6; i < W - 6; i += 9) P(g, i, rg + 1, TEJA[3]);
    for (i = 0; i < 6; i++) { var mx0 = (r() * (W - 6)) | 0, my0 = (r() * (h - 4)) | 0; F(g, mx0, my0, 3, 2, '#5f7a44'); P(g, mx0 + 1, my0, '#8aa860'); }
    if (W >= 64 && h >= 28) { var chx = 12 + ((r() * (W - 36)) | 0); F(g, chx, rg - 12, 10, 14, '#a8693a'); F(g, chx - 1, rg - 13, 12, 2, '#c97a4a'); F(g, chx + 2, rg - 11, 6, 2, '#2a1a14'); AO(g, chx + 10, rg, 4, 4, 0.3); }
  } else if (kind === 'calamina') {
    F(g, 0, 0, W, h, '#8a98a4');
    for (j = 0; j < h; j += 14) { F(g, 0, j, W, 1, '#6e7c88'); for (i = ((j / 14 | 0) & 1) * 12; i < W; i += 24) F(g, i, j, 1, 14, '#6e7c88'); }
    for (i = 0; i < W; i += 3) for (j = 0; j < h; j += 14) F(g, i, j + 1, 1, 13, (i / 3 | 0) & 1 ? '#a6b2bc' : '#7e8c98');
    for (i = 0; i < 7; i++) { var rx = (r() * (W - 6)) | 0, ry = (r() * (h - 4)) | 0; F(g, rx, ry, 5, 3, '#a05a30'); P(g, rx + 1, ry, '#c97a4a'); }
    for (i = 0; i < 3; i++) DISC(g, 8 + ((r() * (W - 16)) | 0), 6 + ((r() * (h - 12)) | 0), 3, '#3a3a42');          // llantas y piedras sobre la calamina
    F(g, 0, 0, W, 2, '#c9d2d8'); F(g, 0, 0, 3, h, '#a6b2bc'); F(g, W - 3, 0, 3, h, '#6e7c88');
  } else {                                                              // azotea con parapeto, tanque y ropa tendida
    var Bk = ramp('#8a8a8e'); F(g, 0, 0, W, h, Bk[2]); speck(g, 0, 0, W, h, r, W * h / 26, [Bk[1], Bk[3]]);
    for (i = 12; i < W; i += 24) F(g, i, 0, 1, h, Bk[1]);
    F(g, 0, 0, W, 5, A[3]); F(g, 0, 0, W, 2, A[4]); F(g, 0, 5, W, 1, A[1]); F(g, 0, 0, 3, h, A[3]); F(g, W - 3, 0, 3, h, A[1]);
    if (h >= 30) {
      var tx = 14 + ((r() * Math.max(1, W - 40)) | 0), ty = 14 + ((r() * Math.max(1, h - 30)) | 0);
      F(g, tx - 6, ty, 12, 14, '#c8c4b4'); F(g, tx - 6, ty, 2, 14, '#e6e2d4'); F(g, tx + 4, ty, 2, 14, '#8c8a93'); ELL(g, tx, ty, 6, 2, '#e6e2d4'); AO(g, tx + 6, ty + 14, 8, 3, 0.35);
      var ly = Math.min(h - 6, ty + 20); F(g, 10, ly, W - 20, 1, '#8c8a93');
      for (i = 14; i < W - 14; i += 7) { var cc = pick(r, ['#d98a9e', '#4a6498', '#e6c85a', '#f3efe2', '#2f7a50']); F(g, i, ly + 1, 5, 6, cc); F(g, i, ly + 1, 5, 1, lt(cc, 0.3)); }
    }
  }
  AO(g, 0, h - 6, W, 6, 0.3);
}
function lotCasona(f, idx, side) {
  var V = LOTSPEC[idx], rows = f.r1 - f.r0 + 1, W = (f.c1 - f.c0 + 1) * 16, H = rows * 16, seed = ((f.seed | 0) || 1234) + idx * 101, sp = {}, k;
  for (k in V) sp[k] = V[k];
  if (f.color && PASTEL[f.color]) { sp.wall = PASTEL[f.color]; sp.zoc = null; }
  var A = ramp(sp.wall), rr = px.rng(seed * 11 + 7), lights = [];
  var gd = new G(W, H), gn = new G(W, H), ft, faceH, faceY;
  if (side === 'S') {
    roofTop(gd, W, H, sp.roof, rr, A); F(gd, 0, H - 2, W, 2, A[3]); F(gd, 0, H - 2, W, 1, A[4]);
    var cS = gd.toCanvas(); cS.noche = cS;
    return { canvas: cS, over: null, overX: 0, overY: 0, lights: [], noche: cS };
  }
  ft = clamp(Math.min(rows, f.face || 6), Math.min(4, rows), 7); faceH = ft * 16; faceY = H - faceH;
  sp.floors = faceH >= 80 ? 2 : 1;
  if (faceY > 0) { roofTop(gd, W, faceY, sp.roof, rr, A); gn.blit(gd, 0, 0); }
  var d = buildFacadeG(sp, null, W, faceH, false, seed, { noSign: true }), n = buildFacadeG(sp, null, W, faceH, true, seed, { noSign: true });
  gd.blit(d.g, 0, faceY); gn.blit(n.g, 0, faceY);
  d.lights.forEach(function (L) { var o = {}; for (var q in L) o[q] = L[q]; o.y += faceY; lights.push(o); });
  var cd = gd.toCanvas(), cn = gn.toCanvas(); cd.noche = cn;
  return { canvas: cd, over: null, overX: 0, overY: 0, lights: lights, noche: cn };
}
function regLot(n) { S.lotArch['br_casona' + n] = function (f) { return lotCasona(f, n - 1, f.side === 'S' ? 'S' : 'N'); }; }
for (var li = 1; li <= 6; li++) regLot(li);

/* ======================== TILES DE LA PEÑA (16 x 16) ======================== */
var WP = ['#3e2618', '#5a3822', '#6e4528', '#84552f'];
function tileG() { return new G(16, 16); }
function pisoPenaG(v) {                                              // tablas de madera oscura, muy pisadas
  var g = tileG(), r = px.rng(7100 + v * 17), j, i;
  for (j = 0; j < 4; j++) {
    var c = (j + v) & 1 ? WP[1] : WP[2];
    F(g, 0, j * 4, 16, 4, c); F(g, 0, j * 4, 16, 1, lt(c, 0.14)); F(g, 0, j * 4 + 3, 16, 1, WP[0]);
    var jx = (j * 7 + v * 5) % 13 + 1; F(g, jx, j * 4 + 1, 1, 2, WP[0]);
    for (i = 0; i < 3; i++) { var gx = (r() * 13) | 0; F(g, gx, j * 4 + 1 + ((r() * 2) | 0), 2 + ((r() * 2) | 0), 1, dk(c, 0.22)); }
  }
  speck(g, 0, 0, 16, 16, r, 6, [WP[3], WP[0]]);
  if (v === 1) { ELL(g, 9, 6, 2, 1, dk(WP[1], 0.4)); P(g, 9, 6, WP[2]); }
  if (v === 2) { ELL(g, 6, 9, 4, 2, dk(WP[1], 0.25)); }
  if (v === 3) { P(g, 3, 4, '#d9202c'); P(g, 11, 10, '#f2c230'); P(g, 7, 13, '#2f72b0'); P(g, 13, 3, '#f3efe2'); LN(g, 2, 12, 6, 11, WP[3]); }
  return g;
}
function pistaG(v, on) {                                             // pista de baile: parquet pulido; encendida = loseta "quemando"
  var g = tileG(), r = px.rng(7200 + v * 13), i, j;
  var c1 = on ? '#ffd54a' : '#c99458', c2 = on ? '#ff9a2a' : '#a8693a';
  for (j = 0; j < 2; j++) for (i = 0; i < 2; i++) { var c = ((i + j + v) & 1) ? c2 : c1; F(g, i * 8, j * 8, 8, 8, c); F(g, i * 8, j * 8, 8, 1, lt(c, 0.25)); F(g, i * 8, j * 8, 1, 8, lt(c, 0.12)); }
  if (!on) {
    F(g, 7, 0, 1, 16, '#6b4223'); F(g, 0, 7, 16, 1, '#6b4223'); F(g, 15, 0, 1, 16, '#6b4223'); F(g, 0, 15, 16, 1, '#6b4223');
    for (i = 0; i < 5; i++) P(g, 2 + i, 12 - i, '#f1d4a0');                                   // brillo de cera
    if (v === 1) { LN(g, 2, 3, 6, 5, '#8a5a30'); P(g, 11, 11, '#8a5a30'); }
    if (v === 2) { for (i = 0; i < 4; i++) P(g, 9 + i, 3 + (i & 1), '#8a5a30'); }
    if (v === 3) { DISC(g, 11, 4, 1, '#8a5a30'); }
  } else {
    FR(g, 0, 0, 16, 16, '#c0261c'); FR(g, 1, 1, 14, 14, '#ff6a1a'); F(g, 4, 4, 8, 8, '#fff0a0'); F(g, 6, 6, 4, 4, '#ffffff'); F(g, 7, 1, 2, 3, '#ffe9a0'); F(g, 7, 12, 2, 3, '#ffe9a0'); F(g, 1, 7, 3, 2, '#ffe9a0'); F(g, 12, 7, 3, 2, '#ffe9a0');
    for (i = 0; i < 4; i++) P(g, 2 + ((r() * 12) | 0), 2 + ((r() * 12) | 0), '#ffffff');
  }
  return g;
}
function tabladilloG(v) {                                            // escenario elevado: 0 superficie, 1 borde frontal, 2 borde izquierdo, 3 borde derecho
  var g = tileG(), r = px.rng(7300 + v * 19), j, i, SW = ['#a8693a', '#b87a42', '#c99458'];
  for (j = 0; j < 4; j++) { var c = SW[(j + v) % 3]; F(g, 0, j * 4, 16, 4, c); F(g, 0, j * 4, 16, 1, lt(c, 0.2)); F(g, 0, j * 4 + 3, 16, 1, dk(c, 0.35)); F(g, (j * 5 + v * 3) % 13 + 1, j * 4 + 1, 1, 2, dk(c, 0.4)); }
  for (i = 0; i < 6; i++) P(g, (r() * 16) | 0, (r() * 16) | 0, '#8a5a30');
  if (v === 0) { LN(g, 3, 3, 6, 6, '#f3efe2'); LN(g, 6, 3, 3, 6, '#f3efe2'); }                 // marca de cinta del escenario
  if (v === 1) { F(g, 0, 10, 16, 6, '#5a3822'); F(g, 0, 10, 16, 1, '#e0b078'); for (i = 5; i < 16; i += 5) F(g, i, 11, 1, 5, '#3e2618'); F(g, 0, 15, 16, 1, '#2a1810'); F(g, 0, 11, 16, 1, '#7a4a2a'); AO(g, 0, 12, 16, 4, 0.18); }
  if (v === 2) { F(g, 0, 0, 4, 16, '#5a3822'); F(g, 0, 0, 1, 16, '#e0b078'); F(g, 3, 0, 1, 16, '#3e2618'); AO(g, 4, 0, 2, 16, 0.2); }
  if (v === 3) { F(g, 12, 0, 4, 16, '#5a3822'); F(g, 12, 0, 1, 16, '#e0b078'); F(g, 15, 0, 1, 16, '#2a1810'); AO(g, 10, 0, 2, 16, 0.2); }
  return g;
}
function mkTiles(f, n, a) { var o = []; for (var v = 0; v < n; v++) o.push(f(v, a).toCanvas()); return o; }

/* ======================== PROPS DE LA PEÑA ======================== */
function propMesaPena(broken) {
  var W = 36, H = 34, g = new G(W, H), cx = 18, i;
  if (!broken) {
    ELL(g, cx, 26, 15, 4, '#d8d4c4'); F(g, 3, 14, 30, 12, '#f3efe2'); F(g, 3, 14, 2, 12, '#e0dccb'); F(g, 31, 14, 2, 12, '#c4bfae');
    for (i = 9; i < 30; i += 6) F(g, i, 19, 1, 7, '#e0dccb');
    for (i = 3; i < 33; i += 4) P(g, i, 28, '#d8d4c4');
    F(g, cx - 1, 19, 3, 8, '#c0261c'); F(g, cx - 1, 22, 3, 1, '#f3efe2'); P(g, cx, 23, '#f3efe2');
    ELL(g, cx, 14, 15, 6, '#ffffff'); ELL(g, cx, 14, 14, 5, '#f6efe0'); F(g, cx - 9, 13, 18, 2, '#c0261c'); F(g, cx - 9, 13, 18, 1, '#e8604a');
    F(g, cx - 2, 8, 2, 5, '#f3efe2'); P(g, cx - 1, 6, '#ffcf3a'); P(g, cx - 1, 7, '#ff8a2a');
    F(g, cx - 11, 9, 3, 4, '#e8f6fa'); P(g, cx - 10, 8, '#e8f6fa'); F(g, cx + 8, 10, 3, 3, '#e8f6fa'); F(g, cx + 5, 4, 3, 9, '#2f7a50'); F(g, cx + 5, 7, 3, 3, '#f3efe2'); P(g, cx + 6, 3, '#2f7a50');
    outline(g, K);
    return mk(g, cx, 29, 30, 10, { cast: { len: 0.3 } });
  }
  ELL(g, 16, 27, 14, 5, '#e0dccb'); ELL(g, 15, 26, 11, 3, '#f3efe2'); for (i = 6; i < 26; i += 5) P(g, i, 25 + (i & 1), '#c4bfae');
  F(g, 12, 25, 6, 3, '#c0261c');
  ELL(g, 29, 15, 3, 9, '#a8693a'); ELL(g, 29, 15, 2, 8, '#c99458'); LN(g, 29, 22, 33, 31, '#6b4223'); LN(g, 27, 22, 25, 30, '#6b4223');
  F(g, 3, 31, 3, 1, '#e8f6fa'); P(g, 8, 32, '#e8f6fa'); P(g, 22, 31, '#e8f6fa'); F(g, 17, 30, 4, 2, '#2f7a50'); P(g, 6, 22, '#e8f6fa'); P(g, 9, 19, '#ffffff');
  outline(g, K);
  return mk(g, 18, 32, 26, 8, { cast: { len: 0.2 } });
}
function propSillaPena(broken) {
  var W = 16, H = 24, g = new G(W, H), i;
  if (!broken) {
    F(g, 2, 0, 2, 13, '#6b4223'); F(g, 10, 0, 2, 13, '#6b4223'); F(g, 2, 0, 1, 13, '#a8693a');
    for (i = 0; i < 3; i++) { F(g, 4, 2 + i * 3, 6, 2, '#8a5a30'); F(g, 4, 2 + i * 3, 6, 1, '#c99458'); }
    F(g, 1, 13, 12, 3, '#c99458'); F(g, 1, 13, 12, 1, '#e0b078'); F(g, 1, 15, 12, 1, '#8a5a30'); for (i = 2; i < 12; i += 2) P(g, i, 14, '#a8693a');
    F(g, 2, 16, 2, 7, '#6b4223'); F(g, 10, 16, 2, 7, '#6b4223'); F(g, 2, 16, 1, 7, '#8a5a30'); F(g, 5, 16, 1, 5, '#4a3028'); F(g, 9, 16, 1, 5, '#4a3028');
    outline(g, K);
    return mk(g, 7, 23, 10, 6, { cast: { len: 0.35 } });
  }
  F(g, 1, 12, 14, 3, '#c99458'); F(g, 1, 12, 14, 1, '#e0b078'); F(g, 0, 15, 14, 2, '#8a5a30'); F(g, 11, 6, 2, 7, '#6b4223'); F(g, 3, 17, 7, 2, '#6b4223'); LN(g, 12, 6, 15, 2, '#6b4223'); F(g, 4, 9, 5, 2, '#8a5a30');
  outline(g, K);
  return mk(g, 8, 18, 12, 4, { cast: { len: 0.2 } });
}
function propBarraPena() {
  var W = 128, H = 76, g = new G(W, H), i, j, r = px.rng(7401);
  // repisa y espejo
  F(g, 4, 4, W - 8, 30, '#4a2a1c'); F(g, 4, 4, W - 8, 2, '#8a5a30'); F(g, 4, 4, 2, 30, '#6b4223'); F(g, W - 6, 4, 2, 30, '#2a1a14');
  F(g, 40, 8, 48, 22, '#8fb0b8'); F(g, 40, 8, 48, 1, '#d8f4ff'); F(g, 40, 8, 1, 22, '#d8f4ff'); LN(g, 46, 28, 56, 10, '#d8f4ffaa'.slice(0, 7)); LN(g, 52, 28, 60, 14, '#bfe0ea'); FR(g, 39, 7, 50, 24, '#c99458');
  for (j = 0; j < 2; j++) {
    var sy = 12 + j * 11;
    [[8, 30], [92, 28]].forEach(function (rg) { F(g, rg[0], sy + 8, rg[1], 2, '#c99458'); for (var x = rg[0] + 1; x < rg[0] + rg[1] - 1; x += 3) if (r() < 0.9) { var c = pick(r, BOT); F(g, x, sy + 1 + ((r() * 2) | 0), 2, 7 - ((r() * 2) | 0), c); P(g, x, sy + 1, lt(c, 0.4)); } });
  }
  for (i = 14; i < W - 14; i += 22) lampPend(g, i, 0, 4, '#ffcf8a');
  // barriles en las puntas
  [4, W - 22].forEach(function (bx) { F(g, bx, 34, 18, 14, '#8a5a30'); F(g, bx, 34, 18, 1, '#c99458'); F(g, bx, 36, 18, 1, '#2b2b30'); F(g, bx, 44, 18, 1, '#2b2b30'); F(g, bx + 2, 34, 1, 14, '#c99458'); F(g, bx + 15, 34, 1, 14, '#5a3a20'); DISC(g, bx + 9, 40, 1, '#2b2b30'); });
  // mostrador
  var cx0 = 24, cw = W - 48, cy = 38;
  F(g, cx0, cy, cw, 28, '#4a2a1c'); F(g, cx0, cy, cw, 4, '#e6b060'); F(g, cx0, cy, cw, 1, '#fff0c0'); F(g, cx0, cy + 4, cw, 1, '#a8693a');
  for (i = cx0 + 2; i < cx0 + cw - 2; i += 8) for (j = cy + 6; j < cy + 24; j += 6) { var az = ((i >> 3) + (j / 6 | 0)) & 1; F(g, i, j, 7, 5, az ? '#2f5a9a' : '#e8e4d8'); F(g, i, j, 7, 1, az ? '#5a86c8' : '#ffffff'); P(g, i + 3, j + 2, az ? '#e8e4d8' : '#2f5a9a'); }
  F(g, cx0, cy + 24, cw, 4, '#17120e'); F(g, cx0, cy + 20, cw, 1, '#2b2b30');
  for (i = cx0 + 6; i < cx0 + cw - 8; i += 18) { F(g, i, cy - 6, 3, 6, '#e8f6fa'); P(g, i + 1, cy - 7, '#e8f6fa'); F(g, i + 6, cy - 5, 2, 5, pick(r, BOT)); }
  // taburetes
  for (i = cx0 + 6; i < cx0 + cw - 6; i += 18) { F(g, i, cy + 30, 8, 3, '#c0261c'); F(g, i, cy + 30, 8, 1, '#e8604a'); F(g, i + 3, cy + 33, 2, 7, '#3b4250'); F(g, i + 1, cy + 40, 6, 1, '#3b4250'); }
  outline(g, K);
  return mk(g, W >> 1, 76, 116, 14, { cast: { len: 0.2 }, p: { tall: true } });
}
function propColumna() {
  var W = 20, H = 60, g = new G(W, H), i, r = px.rng(7501);
  F(g, 0, 0, 20, 5, '#6b4223'); F(g, 0, 0, 20, 1, '#a8693a'); F(g, 0, 4, 20, 1, '#3a2418'); F(g, 2, 5, 16, 3, '#5a3a20');
  F(g, 3, 8, 14, 44, '#e8dcc0'); F(g, 3, 8, 3, 44, '#f4ecd6'); F(g, 14, 8, 3, 44, '#b8a888'); speck(g, 3, 8, 14, 44, r, 40, ['#d8ccb0', '#f4ecd6', '#c4b496']);
  F(g, 7, 30, 6, 5, '#b79a6a'); F(g, 8, 31, 4, 3, '#a5583f'); F(g, 6, 40, 4, 3, '#b79a6a');                                  // revoque caido
  F(g, 1, 52, 18, 4, '#8a7f6a'); F(g, 1, 52, 18, 1, '#b8ae98'); F(g, 1, 55, 18, 1, '#4a4440');
  AO(g, 3, 8, 14, 3, 0.35);
  outline(g, K);
  return mk(g, 10, 56, 14, 6, { cast: { len: 0.3 }, p: { tall: true } });
}
function propFocoPena() {
  var W = 18, H = 56, g = new G(W, H);
  F(g, 8, 14, 2, 36, '#2b2b30'); F(g, 8, 14, 1, 36, '#4a4a52'); F(g, 5, 50, 8, 3, '#3a3a42'); F(g, 5, 50, 8, 1, '#5a5a66'); F(g, 3, 53, 12, 1, '#2b2b30');
  for (var i = 22; i < 48; i += 10) F(g, 7, i, 4, 1, '#e6c85a');
  F(g, 4, 12, 10, 2, '#2b2b30'); F(g, 3, 4, 12, 8, '#ffe9a0'); F(g, 3, 4, 2, 8, '#fff8d0'); F(g, 6, 6, 6, 4, '#ffffff'); F(g, 3, 4, 12, 1, '#2b2b30'); F(g, 3, 11, 12, 1, '#2b2b30'); F(g, 8, 0, 2, 4, '#2b2b30');
  for (i = 3; i < 15; i += 3) F(g, i, 4, 1, 8, '#2b2b30');
  outline(g, K);
  return mk(g, 9, 53, 10, 4, { cast: { len: 0.25 }, p: { tall: true, lamp: { x: 0, y: -44 } } });
}
function propCortina() {
  var W = 128, H = 66, g = new G(W, H), i, j, RV = ['#4a0e14', '#7a1e24', '#9a2a2c', '#b8383a'];
  F(g, 20, 8, W - 40, H - 8, '#1f2a5a'); for (j = 8; j < H; j += 4) F(g, 20, j, W - 40, 1, '#26336a');
  // emblema dorado: guitarra y notas
  var ex = 64; ELL(g, ex, 40, 9, 8, '#d8a030'); ELL(g, ex, 29, 6, 5, '#d8a030'); DISC(g, ex, 36, 3, '#1f2a5a'); F(g, ex - 1, 12, 3, 18, '#b8860b'); F(g, ex - 2, 8, 5, 5, '#d8a030'); F(g, ex - 9, 40, 18, 1, '#b8860b'); ELL(g, ex, 40, 8, 7, '#e0b040'); DISC(g, ex, 36, 3, '#1f2a5a');
  for (i = 0; i < 6; i++) { P(g, 28 + i * 14 + (i & 1) * 4, 16 + (i % 3) * 8, '#f0cc50'); P(g, 29 + i * 14 + (i & 1) * 4, 16 + (i % 3) * 8, '#fff0a0'); }
  F(g, 30, 22, 1, 7, '#f0cc50'); ELL(g, 29, 29, 2, 1, '#f0cc50'); F(g, 96, 18, 1, 7, '#f0cc50'); ELL(g, 95, 25, 2, 1, '#f0cc50');
  // cortinas laterales con pliegues
  [[0, 28], [W - 28, 28]].forEach(function (cr, k) {
    for (i = 0; i < cr[1]; i++) { var tone = RV[1 + ((i >> 2) & 1) + (((i * 7) >> 3) & 1)]; var dy = Math.round(Math.abs(i - (k ? 0 : cr[1])) * 0.5); F(g, cr[0] + i, 7, 1, H - 7 - (k ? Math.round((cr[1] - i) * 0.0) : 0), tone); }
    for (i = 0; i < cr[1]; i += 4) F(g, cr[0] + i, 7, 1, H - 7, RV[0]);
    F(g, cr[0] + (k ? 0 : cr[1] - 2), 7, 2, H - 7, RV[0]);
  });
  F(g, 20, 10, 2, H - 10, RV[3]); F(g, W - 22, 10, 2, H - 10, RV[3]);
  // alzapaños de la cortina (recogida con cordon dorado)
  F(g, 24, 38, 6, 3, '#d8a030'); F(g, W - 30, 38, 6, 3, '#d8a030'); F(g, 26, 41, 2, 5, '#d8a030'); F(g, W - 28, 41, 2, 5, '#d8a030');
  // cenefa superior con festones y flecos
  F(g, 0, 0, W, 8, RV[2]); F(g, 0, 0, W, 1, RV[3]); F(g, 0, 7, W, 1, RV[0]);
  for (i = 0; i < W; i += 16) { ELL(g, i + 8, 9, 8, 3, RV[2]); ELL(g, i + 8, 8, 8, 2, RV[3]); F(g, i + 7, 11, 2, 1, RV[0]); }
  for (i = 1; i < W; i += 3) { F(g, i, 12, 1, 3, '#d8a030'); P(g, i, 15, '#fff0a0'); }
  F(g, 0, H - 3, W, 3, '#5a3822'); F(g, 0, H - 3, W, 1, '#a8693a');
  outline(g, K);
  return mk(g, W >> 1, H - 1, W, 4, { cast: false, p: { tall: true } });
}
function propGuirnalda() {
  var W = 48, H = 18, g = new G(W, H), i, cols = ['#fff0a0', '#ffb840', '#ff6a8a', '#7ae0ff', '#a8f07a'], flags = ['#d9202c', '#f2c230', '#2f72b0', '#2f9a6a', '#e8731a'], lights = [];
  for (i = 0; i < W; i++) { var t = i / (W - 1); P(g, i, 2 + Math.round(3 * 4 * t * (1 - t)), '#2a2430'); }
  for (i = 4; i < W; i += 8) { var t2 = i / (W - 1), yy = 3 + Math.round(3 * 4 * t2 * (1 - t2)), c = cols[((i / 8) | 0) % cols.length]; F(g, i - 1, yy, 3, 3, c); P(g, i, yy, '#ffffff'); P(g, i - 1, yy + 3, mx(c, '#2a2430', 0.5)); lights.push({ x: i - 24, y: yy + 1 - 8 }); }
  for (i = 0; i < W; i += 8) { var t3 = (i + 0.5) / (W - 1), y3 = 3 + Math.round(3 * 4 * t3 * (1 - t3)), fc = flags[((i / 8) | 0) % flags.length]; for (var q = 0; q < 4; q++) F(g, i + 1 + (q >> 1), y3 + 4 + q, 4 - q, 1, fc); }
  return mk(g, 24, 8, W, 4, { cast: false, p: { lights: lights, lamp: { x: 0, y: -2 }, air: true } });
}
function cuadroG(v) {
  var g = new G(22, 30), bgs = ['#c9a66b', '#a8c4b0', '#e8b7a0'], bg = bgs[v];
  F(g, 0, 0, 22, 30, '#8a5a30'); F(g, 0, 0, 22, 1, '#c99458'); F(g, 0, 0, 1, 30, '#b07a45'); F(g, 21, 0, 1, 30, '#5a3a20'); F(g, 0, 29, 22, 1, '#4a3028'); FR(g, 1, 1, 20, 28, '#d8a050');
  F(g, 3, 3, 16, 24, bg); F(g, 3, 3, 16, 1, dk(bg, 0.2)); AO(g, 3, 3, 16, 24, 0.0);
  if (v === 0) { DISC(g, 10, 11, 3, '#3a2418'); F(g, 6, 14, 9, 12, '#3a2418'); ELL(g, 15, 21, 4, 3, '#8a5a30'); ELL(g, 15, 21, 2, 1, '#2a1810'); LN(g, 16, 18, 19, 9, '#5a3a20'); F(g, 4, 25, 14, 2, '#6b4223'); }
  if (v === 1) { F(g, 5, 20, 12, 7, '#8a5a30'); F(g, 5, 20, 12, 1, '#c99458'); DISC(g, 11, 9, 3, '#3a2418'); F(g, 7, 13, 8, 8, '#f3efe2'); F(g, 5, 15, 3, 6, '#3a2418'); F(g, 14, 15, 3, 6, '#3a2418'); F(g, 7, 12, 8, 1, '#d8d4c4'); }
  if (v === 2) { DISC(g, 11, 8, 3, '#3a2418'); F(g, 9, 11, 5, 7, '#f3efe2'); for (var j = 0; j < 9; j++) F(g, 11 - 2 - j, 18 + j, 4 + j * 2, 1, j % 2 ? '#c0261c' : '#d9202c'); F(g, 14, 12, 5, 3, '#ffffff'); LN(g, 14, 13, 19, 8, '#ffffff'); F(g, 17, 5, 3, 3, '#ffffff'); }
  P(g, 10, 1, '#2a1a14'); P(g, 11, 1, '#2a1a14');
  outline(g, K);
  return mk(g, 11, 29, 20, 3, { cast: false, p: { wall: true } });
}
/* extras de calle: una mesita de bistro y una pizarra de caballete */
function propMesaCalle() {
  var W = 30, H = 28, g = new G(W, H);
  F(g, 14, 12, 2, 12, '#3b4250'); F(g, 9, 24, 12, 1, '#3b4250'); F(g, 10, 23, 10, 1, '#5c6570');
  ELL(g, 15, 10, 12, 4, '#2a7d3f'); ELL(g, 15, 9, 12, 3, '#3f9a55'); ELL(g, 15, 9, 9, 2, '#e6dcc0'); P(g, 12, 8, '#d9202c');
  F(g, 7, 5, 3, 5, '#e8f6fa'); P(g, 8, 4, '#e8f6fa'); F(g, 19, 6, 2, 4, '#e8a830');
  F(g, 1, 14, 5, 2, '#c0261c'); F(g, 2, 16, 1, 8, '#3b4250'); F(g, 4, 16, 1, 8, '#3b4250'); F(g, 24, 14, 5, 2, '#c0261c'); F(g, 25, 16, 1, 8, '#3b4250'); F(g, 27, 16, 1, 8, '#3b4250');
  outline(g, K);
  return mk(g, 15, 25, 22, 8, { cast: { len: 0.3 } });
}
function propPizarra() {
  var W = 24, H = 26, g = new G(W, H);
  LN(g, 4, 24, 11, 2, '#6b4223'); LN(g, 19, 24, 12, 2, '#6b4223'); F(g, 3, 6, 18, 14, '#2a2a30'); FR(g, 3, 6, 18, 14, '#8a5a30');
  txt(g, 'HOY', 12, 8, 'a5', '#f3efe2'); txt(g, 'PEÑA', 12, 14, 'a5', '#f0cc50'); P(g, 6, 4, '#e6c85a');
  outline(g, K);
  return mk(g, 12, 24, 14, 4, { cast: { len: 0.3 } });
}

/* ======================== PUBLICACION ======================== */
var C = S.br.casona = S.br.casona || {};
C.fachada = fachada;
C.brands = Object.keys(NAMES);
C.brandName = brandName;
C.defaultTiles = DEFW;
C.bake = function () {
  var t0 = (window.performance || Date).now();
  var tiles = { pisoPena: mkTiles(pisoPenaG, 4), pistaBaile: mkTiles(pistaG, 4, false), pistaBaileOn: mkTiles(pistaG, 4, true), tabladillo: mkTiles(tabladilloG, 4) };
  var props = {
    mesaPena: propMesaPena(false), sillaPena: propSillaPena(false), barraPena: propBarraPena(), columnaPena: propColumna(), focoPena: propFocoPena(),
    cortinaEscenario: propCortina(), guirnalda: propGuirnalda(), cuadroCriollo: [cuadroG(0), cuadroG(1), cuadroG(2)],
    mesaCalle: propMesaCalle(), cartelPizarra: propPizarra()
  };
  props.mesaPena.broken = propMesaPena(true); props.sillaPena.broken = propSillaPena(true);
  C.tiles = tiles; C.props = props;
  var k;
  for (k in tiles) C[k] = tiles[k];
  for (k in props) C[k] = props[k];
  C.bakeMs = Math.round((window.performance || Date).now() - t0);
  return C;
};
C.bake();
})();
