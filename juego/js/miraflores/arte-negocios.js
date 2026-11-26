/* ACHORADO - js/miraflores/arte-negocios.js  (Miraflores, fase M2b)
 * Dueño: M2b (arte de negocios).  Registra ACH.sprites.lotArch.{mf_tienda, mf_generico, mf_torre, mf_iglesia, mf_muni, mf_pizzeria, mf_banos}
 *   function (ficha, px) -> { canvas, over, overX, overY, lights }     (lado N = azotea + cara sur; lado S = azotea con parapeto al norte)
 *
 * CAMPOS DE FICHA QUE LEE
 *   comunes   side ('N'|'S'), c0 c1 r0 r1 (huella), seed, floors, face (tiles de cara visible; si falta, 1+2*floors como px.faceTiles), name, color
 *   mf_tienda    brand ∈ bembos, starbucks, lalucha, chinawok, belisario, wong, ripley, saga, tailoy
 *   mf_generico  giro  ∈ farmacia, polloFrito, ropa, banco, heladeria, churreria, cafe, cine, galeria, hotel, sangucheria  (name opcional)
 *   mf_torre     floors 6-12 (se comprime para que quepa en `face`), color: 'gris' (concreto brutalista) | 'vidrio'
 *   mf_iglesia / mf_muni   face (tiles; sin face usa 9 / 8 o lo que quepa), name (muni)
 *   mf_pizzeria  dir 'E'|'W' = hacia donde queda la calle (si falta: c1<100 -> 'E', si no 'W'); names: [..] nombres de los locales (opcional)
 *   mf_banos     name (opcional)
 *
 * MARCAS: marcas.js no deja registrar desde fuera, asi que hay una tabla propia: ACH.mira.marcas = { get(id), name(id), ids(), epoch, logo(g,id,x,y,w,h,o) }.
 *   Lee ACH.cfg.marcasReales; escucha ACH.px.onMarcas (invalida y, si nadie re-horneo, llama a ACH.render.rebake).  Ademas ACH.px.marca(id) devuelve
 *   estas marcas cuando el id es uno de los 9 (envuelve la funcion original, que sigue mandando para sus ids).
 * Sin dependencias duras: solo ACH.px (base.js). roofKit (edificios-casas.js) se usa si existe, para piezas de azotea.
 * Letras: solo fuentes ACH (a5/a7/a12) y las serif de Ripley; nunca texto volteado.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px, S = ACH.sprites;
if (!px || !px.G || !S) return;
S.lotArch = S.lotArch || {};
ACH.mira = ACH.mira || { systems: [] };
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
var tc = {};
function mx(a, b, t) { var k = a + b + t; return tc[k] || (tc[k] = px.mix(a, b, t)); }
function lt(c, t) { return mx(c, '#fff4d8', t === undefined ? 0.26 : t); }
function dk(c, t) { return mx(c, SH, t === undefined ? 0.34 : t); }
var rc = {};
function ramp(base) { return rc[base] || (rc[base] = [dk(base, 0.62), dk(base, 0.34), base, lt(base, 0.26), lt(base, 0.5)]); }
function AO(g, x, y, w, h, t) {                                    // oscurece (hacia el violeta) lo que ya hay en el rectangulo
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  var x1 = Math.min(g.w, x + w), y1 = Math.min(g.h, y + h);
  for (var j = Math.max(0, y); j < y1; j++) for (var i = Math.max(0, x); i < x1; i++) { var c = g.d[j * g.w + i]; if (c && c.length === 7) g.d[j * g.w + i] = mx(c, SH, t); }
}
function LI(g, x, y, w, h, t) {                                    // aclara
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  var x1 = Math.min(g.w, x + w), y1 = Math.min(g.h, y + h);
  for (var j = Math.max(0, y); j < y1; j++) for (var i = Math.max(0, x); i < x1; i++) { var c = g.d[j * g.w + i]; if (c && c.length === 7) g.d[j * g.w + i] = mx(c, '#fff4d8', t); }
}
function vgrad(g, x, y, w, h, cols) { for (var j = 0; j < h; j++) F(g, x, y + j, w, 1, cols[Math.min(cols.length - 1, (j / h * cols.length) | 0)]); }
function spr(g, x, y, rows, pal) {
  for (var j = 0; j < rows.length; j++) { var r = rows[j]; for (var i = 0; i < r.length; i++) { var ch = r.charAt(i), c = pal[ch]; if (c) P(g, x + i, y + j, c); } }
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function wallFill(g, x, y, w, h, A, rnd, amt) {
  F(g, x, y, w, h, A[2]);
  var n = ((w * h) / (amt || 30)) | 0;
  for (var i = 0; i < n; i++) P(g, x + rnd() * w, y + rnd() * h, rnd() < 0.5 ? A[1] : A[3]);
}
function pick(rnd, a) { return a[Math.floor(rnd() * a.length) % a.length]; }

/* ======================== TEXTO ======================== */
function hasMark(s) { return /[ÁÉÍÓÚÜÑ]/.test(s); }
function txt(g, s, cx, y, font, ink, o) {
  o = o || {};
  return px.text(g, s, Math.round(cx), Math.round(y), { font: font, ink: ink, shadow: o.shadow || null, outline: o.outline || null, align: o.align || 'c', scale: o.scale || 1 });
}
/* Elige la fuente mas grande (a12 > a7 > a5) que quepa en la caja y centra el texto. Devuelve el nombre de la fuente. o.max limita ('a7'). */
function fitTxt(g, s, bx, by, bw, bh, ink, o) {
  o = o || {};
  var order = ['a12', 'a7', 'a5'], mark = hasMark(s), pickF = null, i, ot = o.outline ? 2 : 0;
  var start = o.max ? order.indexOf(o.max) : 0, info;
  for (i = start; i < 3; i++) {
    info = px.fontInfo(order[i]);
    var need = info.h + (mark ? info.top : 0) + ot;
    if (px.measure(s, order[i]) + ot + 2 <= bw && need <= bh) { pickF = order[i]; break; }
  }
  if (!pickF) { pickF = 'a5'; info = px.fontInfo('a5'); while (s.length > 1 && px.measure(s, 'a5') + 2 > bw) s = s.slice(0, -1); }
  info = px.fontInfo(pickF);
  var need2 = info.h + (mark ? info.top : 0) + ot;
  var ty = by + ((bh - need2) >> 1) + (mark ? info.top : 0) + (ot ? 1 : 0);
  txt(g, s, bx + (bw >> 1), ty, pickF, ink, { shadow: o.shadow, outline: o.outline });
  return pickF;
}
function textW(s, font, extra) { return px.measure(s, font) + (s.length - 1) * (extra || 0); }
function spaced(g, s, cx, y, font, ink, extra, o) {                // letra a letra con espacio extra (letrero de luz fina)
  o = o || {};
  var f = px.fonts[font], total = textW(s, font, extra), x = Math.round(cx - total / 2);
  for (var i = 0; i < s.length; i++) {
    var ch = s.charAt(i), w = px.measure(ch, font);
    if (ch !== ' ') px.text(g, ch, x, y, { font: font, ink: ink, shadow: o.shadow || null, align: 'l' });
    x += w + f.gap + (extra || 0);
  }
}

/* Serif fino de Ripley: 5x7 y 7x11, solo las letras que hacen falta (R I P L E Y A). Trazo de 1 px con remates. */
var SERIF7 = {
  R: ['####.', '.#..#', '.#..#', '.###.', '.#.#.', '.#..#', '##.##'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  P: ['####.', '.#..#', '.#..#', '.###.', '.#...', '.#...', '###..'],
  L: ['###..', '.#...', '.#...', '.#...', '.#...', '.#..#', '#####'],
  E: ['#####', '.#..#', '.#...', '.##..', '.#...', '.#..#', '#####'],
  Y: ['##.##', '.#.#.', '.#.#.', '..#..', '..#..', '..#..', '.###.'],
  A: ['..#..', '.#.#.', '.#.#.', '#####', '#...#', '#...#', '##.##']
};
var SERIF11 = {
  R: ['######.', '.#....#', '.#....#', '.#....#', '.#...#.', '.#####.', '.#..#..', '.#...#.', '.#...#.', '.#....#', '###...##'],
  I: ['.#####.', '...#...', '...#...', '...#...', '...#...', '...#...', '...#...', '...#...', '...#...', '...#...', '.#####.'],
  P: ['######.', '.#....#', '.#....#', '.#....#', '.#...#.', '.#####.', '.#.....', '.#.....', '.#.....', '.#.....', '###....'],
  L: ['###....', '.#.....', '.#.....', '.#.....', '.#.....', '.#.....', '.#.....', '.#.....', '.#....#', '.#....#', '.######'],
  E: ['#######', '.#....#', '.#.....', '.#.#...', '.####..', '.#.#...', '.#.....', '.#.....', '.#....#', '.#....#', '#######'],
  Y: ['###.###', '.#...#.', '..#.#..', '..#.#..', '...#...', '...#...', '...#...', '...#...', '...#...', '...#...', '..###..'],
  A: ['...#...', '..#.#..', '..#.#..', '.#...#.', '.#...#.', '.#####.', '.#...#.', '#.....#', '#.....#', '#.....#', '###.###']
};
function serifW(s, big, gap) { var T = big ? SERIF11 : SERIF7, w = 0, n = 0; for (var i = 0; i < s.length; i++) { var gl = T[s.charAt(i)]; if (gl) { w += gl[0].length; n++; } } return w + (n - 1) * gap; }
function serif(g, s, cx, y, big, ink, gap) {
  var T = big ? SERIF11 : SERIF7, x = Math.round(cx - serifW(s, big, gap) / 2);
  for (var i = 0; i < s.length; i++) {
    var gl = T[s.charAt(i)]; if (!gl) continue;
    for (var r = 0; r < gl.length; r++) for (var c = 0; c < gl[r].length; c++) if (gl[r].charAt(c) === '#') P(g, x + c, y + r, ink);
    x += gl[0].length + gap;
  }
}

/* ======================== MARCAS (tabla propia; marcas.js no deja registrar desde fuera) ======================== */
/* n: [real, parodia] = [pre, principal, sub].  Colores iguales en los dos modos (la parodia solo cambia el nombre). */
var TAB = {
  bembos:    { n: [['', 'BEMBOS', ''], ['', 'BOMBOS', '']],                       col: { bg: '#FFB500', fg: '#1100CF', accent: '#E30613', dk: '#0a0070' } },
  starbucks: { n: [['', 'STARBUCKS', ''], ['', 'ESTARBAKS', '']],                 col: { bg: '#00704A', fg: '#FFFFFF', accent: '#1E3932', dk: '#0f2a22' } },
  lalucha:   { n: [['', 'LA LUCHA', 'SANGUCHERIA CRIOLLA'], ['', 'LA LUCHITA', 'SANGUCHERIA CRIOLLA']], col: { bg: '#2B2B2B', fg: '#FFFFFF', accent: '#D91023', dk: '#0e0d12' } },
  chinawok:  { n: [['', 'CHINA WOK', ''], ['', 'CHINA WAK', '']],                  col: { bg: '#E30613', fg: '#FFFFFF', accent: '#1F862C', dk: '#7a0a12' } },
  belisario: { n: [['DON', 'BELISARIO', ''], ['DON', 'BELICOSO', '']],             col: { bg: '#E5133A', fg: '#FFFFFF', accent: '#FFB500', dk: '#7a0a22' } },
  wong:      { n: [['', 'WONG', ''], ['', 'WANG', '']],                            col: { bg: '#EC1C24', fg: '#FFFFFF', accent: '#FFFFFF', dk: '#8a0f14' } },
  ripley:    { n: [['', 'RIPLEY', ''], ['', 'RIPLAY', '']],                        col: { bg: '#333333', fg: '#FFFFFF', accent: '#FF0094', dk: '#17171c' } },
  saga:      { n: [['SAGA', 'FALABELLA', ''], ['SAGA', 'FALABOLA', '']],           col: { bg: '#8DC63F', fg: '#FFFFFF', accent: '#5f9a22', dk: '#3f6a14' } },
  tailoy:    { n: [['', 'TAI LOY', ''], ['', 'TAI LOI', '']],                      col: { bg: '#00A160', fg: '#FFFFFF', accent: '#F7D117', dk: '#006b42' } }
};
var M = ACH.mira.marcas = ACH.mira.marcas || {};
M.epoch = M.epoch || 0;
var lastBaked = -1;
function brandGet(id) {
  var r = TAB[id]; if (!r) return null;
  var real = ACH.cfg.marcasReales !== false, n = real ? r.n[0] : r.n[1];
  var B = { id: id, real: real, style: 'bloque', pre: n[0], main: n[1], sub: n[2], text: (n[0] ? n[0] + ' ' : '') + n[1], colors: r.col };
  B.texto = B.text; B.text2 = n[2]; B.lines = n[2] ? [B.text, n[2]] : [B.text]; B.colores = r.col;
  B.draw = function (ctx, x, y, w, h) { var g = new G(w, h); logo(g, id, 0, 0, w, h, {}); ctx.drawImage(g.toCanvas(), x, y); return true; };
  return B;
}
M.get = brandGet;
M.name = function (id) { var b = brandGet(id); return b ? b.text : null; };
M.ids = function () { return Object.keys(TAB); };
M.logo = function (g, id, x, y, w, h, o) { return logo(g, id, x, y, w, h, o); };
ACH.mira.logo = M.logo;
if (typeof px.marca === 'function' && !px.marca._mira) {            // los 9 ids tambien salen por ACH.px.marca (la original sigue mandando en los suyos)
  var origMarca = px.marca;
  px.marca = function (id) { var m = origMarca(id); return m || brandGet(id); };
  px.marca._mira = true;
  if (typeof px.marcaIds === 'function') { var origIds = px.marcaIds; px.marcaIds = function () { return origIds().concat(Object.keys(TAB)); }; }
}
if (typeof px.onMarcas === 'function') px.onMarcas(function () {
  M.epoch++;
  setTimeout(function () {                                          // si nadie re-horneo (debug.marcas lo hace), lo hacemos aqui
    if (lastBaked !== M.epoch && ACH.render && typeof ACH.render.rebake === 'function') { try { ACH.render.rebake(); } catch (e) { if (window.console) console.warn('[mira.marcas] rebake', e); } }
  }, 0);
});

/* ======================== ICONOS ======================== */
function wok(g, x, y, w) {                                         // wok negro con mango y vapor verde; (x,y) = esquina sup. izq., w = 9..13
  var hb = Math.max(3, Math.round(w * 0.38)), cx = x + (w >> 1), rx = w / 2, dy;
  for (dy = 0; dy <= hb; dy++) { var half = Math.floor(rx * Math.sqrt(1 - (dy / (hb + 0.6)) * (dy / (hb + 0.6))) + 0.3); F(g, cx - half, y + 3 + dy, half * 2 + 1, 1, dy === 0 ? '#4a4858' : K); }
  F(g, cx - 1, y + 3 + hb + 1, 3, 1, K);
  var hx = x + w; F(g, hx, y + 3, 1, 1, K); F(g, hx + 1, y + 2, 1, 1, K); F(g, hx + 2, y + 1, 1, 1, K);       // mango
  P(g, cx - 2, y + 4, '#6b6978');
  P(g, cx - 1, y + 1, '#1F862C'); P(g, cx - 2, y, '#1F862C'); P(g, cx + 1, y + 1, '#1F862C'); P(g, cx + 2, y, '#1F862C'); P(g, cx, y + 2, '#3FA535');   // vapor
}
function gallo(sc) {                                               // gallo patriarca 16x17 con contorno
  var s = new G(17, 18);
  ELL(s, 4, 7, 2, 4, '#1F5E2C'); ELL(s, 3, 6, 1, 3, '#2f8a3c'); P(s, 2, 3, '#4aa84c');        // cola
  ELL(s, 8, 10, 4, 3, '#E8731A'); ELL(s, 9, 10, 3, 2, CREAM);                                    // cuerpo y pecho
  F(s, 5, 9, 3, 2, '#B04A10');                                                                    // ala
  F(s, 10, 5, 4, 4, CREAM); F(s, 11, 4, 2, 1, CREAM);                                             // cabeza
  F(s, 10, 2, 1, 2, '#E5133A'); F(s, 11, 1, 1, 3, '#E5133A'); F(s, 12, 2, 1, 2, '#E5133A');      // cresta
  F(s, 14, 6, 2, 1, '#FFB500'); P(s, 14, 7, '#E5133A');                                           // pico y barbilla
  P(s, 12, 6, K);
  F(s, 8, 13, 1, 3, '#FFB500'); F(s, 10, 13, 1, 3, '#FFB500'); F(s, 7, 16, 3, 1, '#FFB500'); F(s, 10, 16, 3, 1, '#FFB500');
  s.outline(K);
  return s;
}
var GALLO = null, GALLOM = null;
function drawGallo(g, x, y) { GALLO = GALLO || gallo(); g.blit(GALLO, Math.round(x), Math.round(y)); }
function galloMini() {                                              // version de 13x13 para la cinta del letrero
  var s = new G(13, 13);
  F(s, 2, 3, 2, 4, "#1F5E2C"); F(s, 1, 4, 1, 2, "#2f8a3c");
  ELL(s, 6, 7, 3, 2, "#E8731A"); F(s, 7, 7, 3, 2, CREAM); F(s, 3, 6, 2, 2, "#B04A10");
  F(s, 8, 3, 3, 3, CREAM); F(s, 8, 1, 1, 2, "#E5133A"); F(s, 9, 0, 1, 3, "#E5133A"); F(s, 10, 1, 1, 2, "#E5133A");
  F(s, 11, 4, 2, 1, "#FFB500"); P(s, 10, 4, K); F(s, 5, 9, 1, 2, "#FFB500"); F(s, 8, 9, 1, 2, "#FFB500");
  s.outline(K); return s;
}
function drawGalloMini(g, x, y) { GALLOM = GALLOM || galloMini(); g.blit(GALLOM, Math.round(x), Math.round(y)); }
function flagPE(g, x, y, w, h, wave) {                             // bandera del Peru: rojo-blanco-rojo en vertical
  var a = Math.max(1, Math.round(w / 3));
  for (var i = 0; i < w; i++) {
    var c = (i < a || i >= w - a) ? '#D91023' : '#F4EFE6', dy = wave ? Math.round(Math.sin(i * 0.55) * 1) : 0;
    F(g, x + i, y + dy, 1, h, c);
  }
  if (h >= 6 && w >= 9) { F(g, x + a + ((w - 2 * a) >> 1) - 1, y + (h >> 1) - 1, 2, 2, '#b08a3a'); }
}
function siren(g, cx, cy, r) {                                     // emblema circular: anillo blanco + sirena simplificada
  var GR = '#00704A', WH = '#ffffff';
  DISC(g, cx, cy, r, WH); DISC(g, cx, cy, r - 1, GR);
  if (r < 4) { DISC(g, cx, cy, 1, WH); return; }
  if (r < 7) {                                                     // version chica
    F(g, cx - 1, cy - 3, 1, 1, WH); F(g, cx + 1, cy - 3, 1, 1, WH); F(g, cx - 1, cy - 2, 3, 1, WH);
    F(g, cx - 1, cy - 1, 3, 2, WH); F(g, cx - 2, cy + 1, 1, 2, WH); F(g, cx + 2, cy + 1, 1, 2, WH); F(g, cx - 1, cy + 1, 3, 1, WH);
    return;
  }
  F(g, cx - 2, cy - 5, 1, 1, WH); F(g, cx, cy - 6, 1, 2, WH); F(g, cx + 2, cy - 5, 1, 1, WH); F(g, cx - 2, cy - 4, 5, 1, WH);        // corona de tres picos
  F(g, cx - 1, cy - 3, 3, 3, WH); P(g, cx - 1, cy - 2, GR); P(g, cx + 1, cy - 2, GR);                                              // cara con ojos
  F(g, cx - 3, cy - 3, 1, 6, WH); F(g, cx + 3, cy - 3, 1, 6, WH); P(g, cx - 4, cy + 1, WH); P(g, cx + 4, cy + 1, WH);             // cabello largo
  F(g, cx - 1, cy, 3, 2, WH);                                                                                                       // torso
  F(g, cx - 2, cy + 2, 2, 1, WH); F(g, cx + 1, cy + 2, 2, 1, WH);                                                                  // colas abiertas en V
  F(g, cx - 3, cy + 3, 1, 1, WH); F(g, cx + 3, cy + 3, 1, 1, WH); F(g, cx - 4, cy + 4, 2, 1, WH); F(g, cx + 3, cy + 4, 2, 1, WH);  // aletas
  P(g, cx - 4, cy + 3, WH); P(g, cx + 4, cy + 3, WH);
}
var FGLYPH = ['..####', '.##...', '.##...', '######', '.##...', '.##...', '.##...', '.##...', '.##...', '.##...'];
function drawF(g, x, y, sc, col) {
  for (var r = 0; r < FGLYPH.length; r++) for (var c = 0; c < FGLYPH[r].length; c++) if (FGLYPH[r].charAt(c) === '#') F(g, x + c * sc, y + r * sc, sc, sc, col);
}

/* ======================== LOGOS (placas con el logo de cada marca) ======================== */
function plate(g, x, y, w, h, bg, border) {
  F(g, x, y, w, h, bg);
  if (border) FR(g, x, y, w, h, border);
  if (h >= 8 && w >= 8) { P(g, x, y, null); P(g, x + w - 1, y, null); P(g, x, y + h - 1, null); P(g, x + w - 1, y + h - 1, null); }
  F(g, x + 1, y + 1, w - 2, 1, lt(bg, 0.25));
}
var LOGO = {
  bembos: function (g, x, y, w, h, B, o) {
    var BL = B.colors.fg, YE = B.colors.bg, RE = B.colors.accent, s = B.main, font = 'a5', th = 5;
    plate(g, x, y, w, h, YE, BL);
    if (h >= 17 && px.measure(s, 'a12') + 6 <= w) { font = 'a12'; th = 12; } else if (h >= 11 && px.measure(s, 'a7') + 4 <= w) { font = 'a7'; th = 7; }
    var sw = (h >= th + 2 + 6) ? 3 : 0, tot = th + 2 + sw, ty = y + 2 + ((h - 4 - tot) >> 1) + 1;
    txt(g, s, x + (w >> 1), ty, font, BL, { outline: '#ffffff' });
    if (sw) {                                                      // la "sonrisa" roja y amarilla bajo el nombre
      var L = Math.max(10, Math.min(w - 14, px.measure(s, font) - 4)), x0 = x + ((w - L) >> 1), by = ty + th + 2;
      for (var i = 0; i < L; i++) { var yy = by + Math.round(Math.sin(i / (L - 1) * Math.PI) * -1.2 + 1.2); F(g, x0 + i, yy, 1, 2, i > L * 0.8 ? YE : RE); P(g, x0 + i, yy + 2, i > L * 0.8 ? RE : '#ffcf40'); }
    }
  },
  starbucks: function (g, x, y, w, h, B) {
    var GR = B.colors.bg, DK = B.colors.accent;
    plate(g, x, y, w, h, GR, DK);
    var d = Math.min(h - 3, 19), r = (d - 1) >> 1, font = h >= 12 ? 'a7' : 'a5', th = font === 'a7' ? 7 : 5, tw = px.measure(B.main, font), cy = y + (h >> 1);
    if (w >= d + 6 + tw + 4 && r >= 4) {
      var grp = d + 4 + tw, gx = x + ((w - grp) >> 1);
      siren(g, gx + r, cy, r);
      px.text(g, B.main, gx + d + 4, y + ((h - th) >> 1), { font: font, ink: '#ffffff', align: 'l' });
    } else if (h >= d + 8 && tw <= w - 4 && r >= 4) {
      siren(g, x + (w >> 1), y + 2 + r, r);
      px.text(g, B.main, x + (w >> 1), y + h - 7, { font: 'a5', ink: '#ffffff', align: 'c' });
    } else if (r >= 4) siren(g, x + (w >> 1), cy, r);
    else fitTxt(g, B.main, x + 2, y + 1, w - 4, h - 2, '#ffffff');
  },
  lalucha: function (g, x, y, w, h, B) {
    var BK = B.colors.bg;
    plate(g, x, y, w, h, BK, '#0e0d12');
    var two = h >= 18 && w >= 96 && B.sub, nf = 'a7', th = 7;
    if (px.measure(B.main, 'a7') + 8 > w) { nf = 'a5'; th = 5; }
    var ty = two ? y + 3 : y + ((h - th) >> 1), extra = (w - 28 > textW(B.main, nf, 1) + 8) ? 1 : 0;
    spaced(g, B.main, x + (w >> 1), ty, nf, '#ffffff', extra);
    if (two) px.text(g, B.sub, x + (w >> 1), y + h - 7, { font: 'a5', ink: '#cfcabd', align: 'c' });
    if (w >= 72) {                                                 // banderitas peruanas en los extremos
      var fy = y + ((h - 9) >> 1);
      F(g, x + 5, fy, 1, 9, '#8a8a8e'); flagPE(g, x + 6, fy, 7, 5, false);
      F(g, x + w - 6, fy, 1, 9, '#8a8a8e'); flagPE(g, x + w - 13, fy, 7, 5, false);
    }
  },
  chinawok: function (g, x, y, w, h, B, o) {
    var RE = B.colors.bg, GR = B.colors.accent, inv = o && o.inv, bg = inv ? RE : CREAM, ink = inv ? CREAM : RE;
    plate(g, x, y, w, h, bg, inv ? B.colors.dk : RE);
    var stripe = h >= 12 ? 2 : 0;
    if (stripe) F(g, x + 1, y + h - 3, w - 2, 2, GR);
    var iw = h >= 17 ? 13 : 9, has = w >= iw + 40;
    if (has) { if (inv) DISC(g, x + 3 + (iw >> 1), y + 4 + (iw >> 1) - 1, (iw >> 1) + 2, CREAM); wok(g, x + 3, y + Math.max(1, ((h - stripe - 10) >> 1)), iw); }
    var bx = x + (has ? iw + 6 : 2);
    fitTxt(g, B.main, bx, y + 2, x + w - 2 - bx, h - 4 - stripe, ink, { shadow: inv ? B.colors.dk : null });
  },
  belisario: function (g, x, y, w, h, B, o) {
    var RE = B.colors.bg, inv = o && o.inv, bg = inv ? RE : CREAM, ink = inv ? CREAM : RE;
    plate(g, x, y, w, h, bg, inv ? B.colors.dk : RE);
    var bw = h >= 12 ? 16 : 0, bx = x + 2;
    if (bw && w >= 50) {
      if (h >= 18) { if (!inv) DISC(g, x + 9, y + (h >> 1), 7, RE); drawGallo(g, x + 1, y + ((h - 18) >> 1)); }
      else { if (!inv) DISC(g, x + 8, y + (h >> 1), 5, RE); drawGalloMini(g, x + 2, y + ((h - 13) >> 1)); }
      bx = x + bw + 3;
    }
    var aw = x + w - 2 - bx;
    if (h >= 16 && px.measure(B.main, 'a7') + 2 <= aw) {
      txt(g, B.pre, bx + (aw >> 1), y + 2, 'a5', ink, {});
      txt(g, B.main, bx + (aw >> 1), y + 8, 'a7', ink, { shadow: inv ? B.colors.dk : lt(RE, 0.55) });
    } else fitTxt(g, B.text, bx, y + 1, aw, h - 2, ink, { max: h >= 16 ? 'a12' : 'a7' });
  },
  wong: function (g, x, y, w, h, B) {
    var RE = B.colors.bg;
    plate(g, x, y, w, h, RE, B.colors.dk);
    if (h >= 18 && w >= 30) FR(g, x + 2, y + 2, w - 4, h - 4, '#ffffff');
    var inset = h >= 18 ? 4 : 2;
    fitTxt(g, B.main, x + inset, y + inset, w - inset * 2, h - inset * 2, '#ffffff', { shadow: B.colors.dk });
  },
  ripley: function (g, x, y, w, h, B) {
    plate(g, x, y, w, h, '#f4f2ec', '#333333');
    var big = h >= 17 && serifW(B.main, true, 3) + 8 <= w, gap = big ? 3 : 2;
    if (!big && serifW(B.main, false, gap) + 4 > w) gap = 1;
    serif(g, B.main, x + (w >> 1), y + ((h - (big ? 11 : 7)) >> 1), big, '#2b2b30', gap);
  },
  saga: function (g, x, y, w, h, B) {
    var LI_ = B.colors.bg, TX = B.colors.accent;
    plate(g, x, y, w, h, '#f4f6ee', LI_);
    var sq = Math.min(h - 4, 22), sc = sq >= 20 ? 2 : 1;
    var hasSq = w >= sq + 24;
    if (hasSq) {
      F(g, x + 2, y + 2, sq, sq, LI_); P(g, x + 2, y + 2, null);
      drawF(g, x + 2 + ((sq - 6 * sc) >> 1), y + 2 + ((sq - 10 * sc) >> 1), sc, '#ffffff');
    }
    var bx = x + (hasSq ? sq + 5 : 2), aw = x + w - 2 - bx;
    if (h >= 16 && px.measure(B.main, 'a7') + 2 <= aw) { txt(g, B.pre, bx + (aw >> 1), y + 3, 'a5', TX, {}); txt(g, B.main, bx + (aw >> 1), y + h - 10, 'a7', TX, {}); }
    else fitTxt(g, B.text, bx, y + 1, aw, h - 2, TX, { max: 'a7' });
  },
  tailoy: function (g, x, y, w, h, B) {
    var GR = B.colors.bg, YE = B.colors.accent;
    plate(g, x, y, w, h, GR, B.colors.dk);
    var stripe = h >= 14 ? 2 : 0;
    if (stripe) F(g, x + 2, y + h - 4, w - 4, 2, YE);
    fitTxt(g, B.main, x + 3, y + 2, w - 6, h - 4 - (stripe ? 3 : 0), '#ffffff', { shadow: B.colors.dk });
  }
};
function logo(g, id, x, y, w, h, o) {
  var B = brandGet(id), f = LOGO[id];
  if (!B || !f) return false;
  f(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), B, o || {});
  return true;
}

/* ======================== CONTEXTO DE LOTE ======================== */
function mkCtx(f) {
  var W = (f.c1 - f.c0 + 1) * 16, H = (f.r1 - f.r0 + 1) * 16, seed = (f.seed | 0) || 1234;
  return { f: f, W: W, H: H, rows: f.r1 - f.r0 + 1, g: new G(W, H), side: f.side === 'S' ? 'S' : 'N', seed: seed,
    rnd: px.rng(seed * 7919 + 13), r2: px.rng(seed * 104729 + 5), lights: [], go: null, ox: 0, oy: 0 };
}
function faceOf(c, def) {
  var ft = c.f.face || def || px.faceTiles(c.f);
  ft = Math.max(3, Math.min(ft, c.rows));
  c.faceH = ft * 16; c.faceY = c.H - c.faceH; c.gTop = c.H - 48; c.nUp = Math.max(0, Math.floor((c.faceH - 48) / 32));
}
function mkOver(c, ox, oy, w, h) { c.go = new G(w, h); c.ox = ox; c.oy = oy; return c.go; }
function finish(c) {
  lastBaked = M.epoch;
  var r = { canvas: c.g.toCanvas(), lights: c.lights };
  if (c.go) {
    var any = false, d = c.go.d;
    for (var i = 0; i < d.length; i++) if (d[i]) { any = true; break; }
    if (any) { r.over = c.go.toCanvas(); r.overX = c.ox; r.overY = c.oy; }
  }
  return r;
}
function lite(c, x, y, w, h, kind) { var L = { x: Math.round(x), y: Math.round(y), kind: kind || "local" }; if (w > 0) { L.w = w; L.h = h; } c.lights.push(L); }

/* ======================== AZOTEAS ======================== */
// v0.13 (D5): techos variados por lote (antes una sola losa gris): losa 36 %, calamina 18 %, teja 18 %, gravilla 16 %, terraza con macetas 12 %.
// El tipo sale de la semilla del lote (c.seed): el mismo lote siempre tiene el mismo techo.
function roofKindOf(c) { var h = (Math.imul(c.seed | 0, 2654435761) >>> 0) % 100; return h < 36 ? 'losa' : h < 54 ? 'calamina' : h < 72 ? 'teja' : h < 88 ? 'gravilla' : 'terraza'; }
function roofTeja(g, x, y, w, h, rnd) {
  var tones = ['#a9634c', '#9c5a46', '#b06c54', '#95563f'], j, i;
  F(g, x, y, w, h, '#6e4033');
  for (j = 0; j < h; j += 4) for (i = -((j >> 2) & 1) * 3; i < w; i += 6) {
    var tc = tones[((i >> 1) * 3 + (j >> 2) * 5 + ((rnd() * 2) | 0)) & 3], xx = Math.max(0, i);
    F(g, x + xx, y + j, Math.min(5, w - xx) + (i < 0 ? i : 0), 3, tc);
    F(g, x + xx, y + j, Math.min(5, w - xx) + (i < 0 ? i : 0), 1, '#c98a70');
  }
  for (i = 0; i < w * h / 500; i++) F(g, x + ((rnd() * (w - 3)) | 0), y + ((rnd() * (h - 2)) | 0), 3, 2, rnd() < 0.5 ? '#7a8a5a' : '#5a4a3a');   // musgo y tejas rotas
}
function roofGravilla(g, x, y, w, h, rnd) {
  var i, n;
  F(g, x, y, w, h, '#9a9690');
  n = (w * h / 5) | 0;
  for (i = 0; i < n; i++) P(g, x + rnd() * w, y + rnd() * h, rnd() < 0.4 ? '#b8b4ac' : rnd() < 0.5 ? '#7a766f' : '#cfcac0');
  for (i = 0; i < w * h / 1400; i++) { var bw = 8 + ((rnd() * 12) | 0), bh = 4 + ((rnd() * 6) | 0); F(g, x + ((rnd() * (w - bw)) | 0), y + ((rnd() * (h - bh)) | 0), bw, bh, '#6a665f'); }   // parches de brea
}
function roofSurf(c, x, y, w, h) {
  var rk = px.roofKit, kind = c.roofKind || (c.roofKind = roofKindOf(c));
  if (kind === 'teja') roofTeja(c.g, x, y, w, h, c.r2);
  else if (kind === 'gravilla') roofGravilla(c.g, x, y, w, h, c.r2);
  else if (kind === 'calamina' && rk && rk.surface) rk.surface(c.g, x, y, w, h, 'calamina', c.r2);
  else if (kind === 'terraza' && rk && rk.surface) rk.surface(c.g, x, y, w, h, 'deck', c.r2);
  else if (rk && rk.surface) rk.surface(c.g, x, y, w, h, 'losa', c.r2);
  else { F(c.g, x, y, w, h, '#5e5d66'); for (var i = 0; i < w * h / 60; i++) P(c.g, x + c.r2() * w, y + c.r2() * h, c.r2() < 0.5 ? '#4a4954' : '#72716f'); }
}
function parapetBack(g, W, rows, A) {                              // borde norte visto por dentro (4 px de cara + 2 de filo) y lados
  F(g, 0, 0, W, 2, A[4]); F(g, 0, 2, W, 4, A[2]); F(g, 0, 2, W, 1, A[3]); F(g, 0, 5, W, 1, A[1]);
  AO(g, 0, 6, W, 1, 0.45); AO(g, 0, 7, W, 2, 0.25);
  F(g, 0, 0, 3, rows, A[3]); F(g, 0, 0, 1, rows, A[4]); F(g, W - 3, 0, 3, rows, A[1]); F(g, W - 1, 0, 1, rows, A[0]);
  AO(g, 3, 6, 1, rows - 6, 0.3);
}
function parapetFront(g, W, y0, A) { F(g, 0, y0, W, 1, A[4]); F(g, 0, y0 + 1, W, 1, A[3]); F(g, 0, y0 + 2, W, 3, A[2]); F(g, 0, y0 + 5, W, 1, A[1]); }
var ROOF_POOL = ['tank', 'antenna', 'stairbox', 'hood', 'plants', 'table', 'gas'];
function roofProps(c, top, bot, names, avoid) {
  var rk = px.roofKit, placed = (avoid || []).slice(), W = c.W, rnd = c.r2;
  if (!rk || !rk.size) return placed;
  names.forEach(function (nm) {
    var sz = rk.size[nm]; if (!sz || typeof rk[nm] !== 'function') return;
    var w = sz[0], h = sz[1];
    if (bot - top < h * 0.7 || W < w + 20) return;
    for (var t = 0; t < 30; t++) {
      var x = 10 + (w >> 1) + Math.floor(rnd() * (W - 20 - w)), y = top + h + Math.floor(rnd() * Math.max(1, bot - top - h));
      if (y > bot) y = bot;
      var r = [x - (w >> 1) - 3, y - h - 1, x + (w >> 1) + 3, y + 7], ok = true;
      for (var i = 0; i < placed.length; i++) { var p = placed[i]; if (r[0] < p[2] && r[2] > p[0] && r[1] < p[3] && r[3] > p[1]) { ok = false; break; } }
      if (ok) { placed.push(r); rk[nm](c.g, x, y, { rnd: rnd }); break; }
    }
  });
  return placed;
}
function propNames(c, n, extra) {
  var out = (extra || []).slice(), guard = 30;
  if (c.roofKind === 'terraza') { out.push('plants', 'table'); n = Math.max(n, 4); }   // v0.13 (D5): la terraza lleva macetas y una mesa
  if (c.roofKind === 'teja') out = out.filter(function (k) { return k !== 'tank'; });
  while (out.length < n && guard--) { var k = pick(c.r2, ROOF_POOL); if (out.indexOf(k) < 0) out.push(k); }
  return out;
}
function roofN(c, PA, avoid, sp) {
  var g = c.g, W = c.W, h = c.faceY;
  if (h <= 0) return;
  roofSurf(c, 0, 0, W, h);
  if (h >= 26) parapetBack(g, W, h - 6, PA);
  if (h >= 8) parapetFront(g, W, h - 6, PA);
  if (h >= 40) roofProps(c, 10, h - 12, propNames(c, clamp(Math.floor(W * h / 3600), 1, 5), sp && sp.roofItems), avoid);
}
function rooftopBoard(c, v, sp) {                                  // letrero de azotea que mira a la camara: tablero + 2 patas + sombra al sureste
  var g = c.g;
  AO(g, v.x + 6, v.y + v.h + 2, v.w, 7, 0.32);
  F(g, v.x + 6, v.y + v.h, 2, 6, '#5c6570'); F(g, v.x + v.w - 8, v.y + v.h, 2, 6, '#5c6570');
  F(g, v.x + 6, v.y + v.h, 1, 6, '#a4abaa'); F(g, v.x + v.w - 8, v.y + v.h, 1, 6, '#a4abaa');
  F(g, v.x - 1, v.y - 1, v.w + 2, v.h + 2, K);
  sp.logo(g, v.x, v.y, v.w, v.h, {});
  F(g, v.x, v.y + v.h - 1, v.w, 1, dk(Q(g, v.x + 2, v.y + v.h - 2) || '#444', 0.3));
  lite(c, v.x + (v.w >> 1), v.y + v.h + 4, 0, 0, 'foco');
}

/* ======================== PIEZAS DE FACHADA ======================== */
var GL = RAMPS.glass, MT = RAMPS.metal, WD = RAMPS.wood;
var WARM = ['#2a2024', '#3a2a28', '#54382c', '#7a4e30', '#a8693a'];
var COOL = ['#34444a', '#4c6268', '#6f8a88', '#9db4a8', '#c9d6c4'];
function slab(g, y, W, A) { F(g, 0, y, W, 1, A[4]); F(g, 0, y + 1, W, 1, A[3]); F(g, 0, y + 2, W, 1, A[1]); AO(g, 0, y + 3, W, 2, 0.28); }
function glassWin(g, x, y, w, h, o) {
  o = o || {};
  var fr = o.frame || '#d6d1b8', i;
  F(g, x - 1, y - 1, w + 2, h + 2, fr);
  if (o.lit) {
    vgrad(g, x, y, w, h, WARM.concat(['#d8924a']).slice(0, 5));
    F(g, x + (w >> 1), y, 1, h, '#2a1a18'); F(g, x, y + (h >> 1) - 1, w, 1, '#2a1a18');
    if (o.sil) { F(g, x + 3, y + h - 8, 3, 8, '#1d1316'); P(g, x + 4, y + h - 10, '#1d1316'); }
  } else {
    F(g, x, y, w, h, GL[2]); F(g, x, y, w, 3, GL[1]); F(g, x, y + h - 3, w, 3, GL[1]);
    for (i = 0; i < 6; i++) { P(g, x + 2 + i, y + h - 3 - i * 2, GL[3]); P(g, x + 3 + i, y + h - 3 - i * 2, GL[3]); }
    F(g, x, y, w, 1, GL[0]);
    if (o.mull) F(g, x + (w >> 1), y, 1, h, fr);
  }
  if (o.arch) { P(g, x - 1, y - 1, null); P(g, x + w, y - 1, null); }
  if (o.shutter) { F(g, x - 4, y - 1, 3, h + 2, o.shutter); F(g, x + w + 1, y - 1, 3, h + 2, o.shutter); for (i = 1; i < h; i += 3) { F(g, x - 4, y + i, 3, 1, dk(o.shutter, 0.3)); F(g, x + w + 1, y + i, 3, 1, dk(o.shutter, 0.3)); } }
  F(g, x - 2, y + h + 1, w + 4, 2, lt(fr, 0.2)); AO(g, x - 2, y + h + 3, w + 4, 1, 0.4);
}
var WIN = {
  std: function (c, k, yt, sp) {
    var W = c.W, n = Math.max(1, Math.floor((W - 10) / 30)), ww = sp.ww || 18, gap = (W - n * ww) / (n + 1), lc = 0;
    for (var i = 0; i < n; i++) {
      var x = Math.round(gap * (i + 1) + ww * i), lit = c.r2() < (sp.lit === undefined ? 0.2 : sp.lit);
      glassWin(c.g, x, yt + 6, ww, 16, { frame: sp.wf, lit: lit, arch: sp.arch, shutter: sp.shutter, mull: sp.mull, sil: lit && c.r2() < 0.5 });
      if (lit && lc++ < 2) lite(c, x + ww / 2, yt + 14, ww, 16);
    }
  },
  oval: function (c, k, yt, sp) {
    var g = c.g, W = c.W, n = Math.max(1, Math.floor((W - 8) / 30)), gap = (W - n * 22) / (n + 1);
    for (var i = 0; i < n; i++) {
      var cx = Math.round(gap * (i + 1) + 22 * i + 11), cy = yt + 14, lit = c.r2() < 0.25;
      ELL(g, cx, cy, 11, 8, '#f3efe2'); ELL(g, cx, cy, 10, 7, '#FFB500'); ELL(g, cx, cy, 8, 5, lit ? '#a8693a' : GL[2]);
      F(g, cx - 8, cy - 5, 16, 3, lit ? '#7a4e30' : GL[1]); if (!lit) { P(g, cx - 4, cy + 2, GL[3]); P(g, cx - 3, cy + 1, GL[3]); P(g, cx - 2, cy, GL[3]); P(g, cx - 1, cy - 1, GL[3]); }
      F(g, cx - 12, cy + 9, 25, 1, dk('#1100CF', 0.2));
    }
  },
  ribbon: function (c, k, yt, sp) {
    var g = c.g, W = c.W, x0 = 3, w = W - 6, y = yt + 5, h = sp.rh || 20, fr = sp.wf || '#8c8a93', i, x;
    F(g, x0 - 1, y - 1, w + 2, h + 2, fr);
    vgrad(g, x0, y, w, h, [GL[1], GL[2], GL[2], GL[1]]);
    for (x = x0 + 14, i = 0; x < x0 + w - 2; x += 14, i++) { F(g, x, y, 1, h, fr); }
    for (x = x0 + 3, i = 0; x < x0 + w - 8; x += 14, i++) { if ((i * 3 + k * 5) % 7 === 1) { F(g, x, y + 1, 10, h - 2, '#7a4e30'); F(g, x, y + 1, 10, 4, '#54382c'); } else { P(g, x + 2, y + h - 3, GL[3]); P(g, x + 3, y + h - 4, GL[3]); P(g, x + 4, y + h - 5, GL[3]); P(g, x + 5, y + h - 6, GL[3]); P(g, x + 6, y + h - 7, GL[3]); } }
    F(g, x0, y + (h >> 1), w, 1, dk(GL[2], 0.3));
    F(g, x0, y + h + 1, w, 1, lt(fr, 0.3)); AO(g, x0, y + h + 2, w, 2, 0.3);
    if (k === 1) lite(c, W >> 1, y + 8, w >> 1, h, 'local');
  },
  curtain: function (c, k, yt, sp) {
    var g = c.g, W = c.W, x0 = 2, w = W - 4, y = yt + 3, h = 27, mu = sp.mu || '#8DC63F', i, x;
    var SKY = ['#2a6a74', '#3c8088', '#4b8f94', '#6fb0ac'];
    F(g, x0, y, w, h, SKY[2]); vgrad(g, x0, y, w, h, [SKY[1], SKY[2], SKY[2], SKY[3]]);
    for (x = x0 + 4, i = 0; x < x0 + w - 8; x += 16, i++) { for (var j = 0; j < 8; j++) P(g, x + j, y + h - 6 - j, SKY[3]); P(g, x + 1, y + h - 6, SKY[3]); }
    for (x = x0; x <= x0 + w - 2; x += 16) { F(g, x, y, 2, h, mu); F(g, x, y, 1, h, lt(mu, 0.3)); }
    F(g, x0 + w - 2, y, 2, h, mu);
    F(g, x0, y + 16, w, 1, dk(mu, 0.2)); F(g, x0, y + h - 4, w, 4, mu); F(g, x0, y + h - 4, w, 1, lt(mu, 0.3)); AO(g, x0, y + h, w, 2, 0.3);
    if (c.r2() < 0.5) { var lx = x0 + 18 + 16 * Math.floor(c.r2() * Math.max(1, (w - 40) / 16)); F(g, lx, y + 3, 12, 12, '#a8693a'); F(g, lx, y + 3, 12, 3, '#7a4e30'); }
    if (k === 1) lite(c, W >> 1, y + 12, w >> 1, h, 'local');
  }
};

/* ---- interiores de vitrina (gx, gy, gw, gh = vidrio; el piso interior es gy+gh) ---- */
var INT = {
  burger: function (g, x, y, w, h, r) {
    var fl = y + h, i;
    for (i = 0; i + 13 <= w - 3; i += 15) { F(g, x + 3 + i, y + 2, 12, 7, (i / 15 | 0) & 1 ? '#FFB500' : '#1100CF'); F(g, x + 4 + i, y + 3, 10, 1, CREAM); F(g, x + 5 + i, y + 6, 7, 1, CREAM); }
    F(g, x + 2, fl - 10, w - 4, 10, '#5a2a20'); F(g, x + 2, fl - 10, w - 4, 2, '#e6b060'); F(g, x + 2, fl - 8, w - 4, 1, '#7a3a2a');
    for (i = 6; i < w - 8; i += 10) { F(g, x + i, fl - 14, 4, 4, '#c0392b'); P(g, x + i + 1, fl - 15, '#FFB500'); }
  },
  cafe: function (g, x, y, w, h, r) {
    var fl = y + h, i;
    for (i = 7; i < w - 6; i += 14) { F(g, x + i, y, 1, 5, K); F(g, x + i - 2, y + 5, 5, 3, '#ffcf8a'); F(g, x + i - 1, y + 8, 3, 1, '#fff0c0'); }
    F(g, x + 3, y + 13, w - 6, 1, '#6b4223'); for (i = 5; i < w - 8; i += 4) { F(g, x + i, y + 10, 2, 3, i % 8 ? CREAM : '#c9a66b'); }
    F(g, x + 2, fl - 9, w - 4, 9, '#3a2a22'); F(g, x + 2, fl - 9, w - 4, 2, '#c99458');
    for (i = 6; i < w - 8; i += 9) { F(g, x + i, fl - 12, 2, 3, CREAM); P(g, x + i + 2, fl - 11, '#8a5a38'); }
  },
  lucha: function (g, x, y, w, h, r) {
    var fl = y + h, i;
    for (i = 7; i < w - 6; i += 12) { F(g, x + i, y, 1, 4, K); F(g, x + i - 2, y + 4, 5, 3, '#141216'); F(g, x + i - 1, y + 7, 3, 1, '#ffcf8a'); }
    F(g, x + w - 21, y + 9, 18, 10, '#e9e2c8'); for (i = 0; i < 4; i++) F(g, x + w - 19, y + 11 + i * 2, 8 + (i * 3) % 6, 1, '#4a4a4e');
    F(g, x + 2, fl - 9, w - 4, 9, '#2b2b2b'); F(g, x + 2, fl - 9, w - 4, 1, '#6a6a6e'); F(g, x, fl - 2, w, 2, '#d9772e');
    var cx = x + (w >> 1) - 8; ELL(g, cx, fl - 17, 3, 2, CREAM); F(g, cx - 2, fl - 15, 5, 6, CREAM); F(g, cx - 1, fl - 14, 3, 1, '#d8d4c4');
  },
  chifa: function (g, x, y, w, h, r) {
    var fl = y + h, i;
    for (i = 8; i < w - 6; i += 13) { F(g, x + i, y, 1, 3, '#e6c85a'); F(g, x + i - 3, y + 3, 7, 6, '#c0261c'); F(g, x + i - 2, y + 4, 2, 4, '#e8604a'); F(g, x + i - 1, y + 9, 3, 2, '#e6c85a'); }
    for (i = 6; i + 12 < w - 4; i += 17) { F(g, x + i, fl - 8, 12, 3, CREAM); F(g, x + i + 5, fl - 5, 2, 5, '#6b4223'); F(g, x + i + 1, fl - 11, 3, 3, '#e6c85a'); F(g, x + i + 7, fl - 11, 3, 3, '#1F862C'); }
  },
  pollo: function (g, x, y, w, h, r) {
    var fl = y + h, i;
    F(g, x + 4, y + 6, w - 8, 17, '#4a4a52'); F(g, x + 4, y + 6, w - 8, 1, '#8c8a93'); F(g, x + 5, y + 8, w - 10, 13, '#2a1810'); F(g, x + 6, y + 17, w - 12, 3, '#ff8a2a'); F(g, x + 7, y + 19, w - 14, 1, '#f2e63c');
    for (i = 8; i + 6 <= w - 8; i += 8) { ELL(g, x + i + 3, y + 14, 3, 2, '#c9863a'); P(g, x + i + 2, y + 13, '#e6b060'); P(g, x + i + 4, y + 15, '#8a4b24'); }
    F(g, x + 2, fl - 4, w - 4, 4, '#2b2b2b'); F(g, x + 2, fl - 4, w - 4, 1, '#b0302a');
  },
  super: function (g, x, y, w, h, r) {
    var fl = y + h, i, j, cols = ['#d62b2b', '#f2c230', '#2f7a50', '#3f72b0', CREAM, '#e07a2a'];
    for (j = 0; j < 3; j++) { var sy = y + 5 + j * 8; F(g, x + 2, sy + 6, w - 4, 1, '#8c8a93'); for (i = 0; i < w - 8; i += 4) if (r() < 0.8) F(g, x + 3 + i, sy + 1 + ((r() * 2) | 0), 3, 5, cols[(r() * cols.length) | 0]); }
    F(g, x + 2, fl - 5, w - 4, 5, '#2a2a30');
  },
  ropa: function (g, x, y, w, h, r) {
    var fl = y + h, i, cols = ['#d98a9e', '#4a6498', '#e6c85a', CREAM, '#2f7a50', '#8f3a32'];
    F(g, x + 2, fl - 3, w - 4, 3, '#3a3844');
    for (i = 8; i < w - 6; i += 13) {
      var cc = cols[(r() * cols.length) | 0];
      DISC(g, x + i, fl - 24, 2, '#d8c9ae'); F(g, x + i - 3, fl - 21, 7, 10, cc); F(g, x + i - 3, fl - 21, 7, 1, lt(cc, 0.3)); F(g, x + i - 1, fl - 11, 1, 8, '#6a6a72'); F(g, x + i - 3, fl - 4, 7, 1, '#6a6a72');
    }
  },
  utiles: function (g, x, y, w, h, r) {
    var fl = y + h, i, j, cols = ['#d62b2b', '#f2c230', '#3f72b0', '#2f7a50', '#d98a9e', '#e07a2a'];
    for (j = 0; j < 2; j++) { var sy = y + 4 + j * 10; F(g, x + 2, sy + 8, w - 4, 1, '#8a5a38'); for (i = 0; i < w - 8; i += 3) F(g, x + 3 + i, sy + 1 + ((r() * 2) | 0), 2, 7 - ((r() * 2) | 0), cols[(r() * cols.length) | 0]); }
    DISC(g, x + 8, fl - 5, 4, '#d62b2b'); F(g, x + 4, fl - 6, 9, 1, CREAM); F(g, x + 4, fl - 5, 9, 1, '#d62b2b');
    F(g, x + w - 14, fl - 12, 10, 12, '#3f72b0'); F(g, x + w - 14, fl - 12, 10, 2, '#6a95c8'); F(g, x + w - 12, fl - 6, 6, 4, '#2c4a7c');
  },
  farma: function (g, x, y, w, h, r) {
    var i, j;
    for (j = 0; j < 3; j++) { var sy = y + 4 + j * 8; F(g, x + 2, sy + 6, w - 4, 1, '#8c8a93'); for (i = 0; i < w - 8; i += 4) if (r() < 0.85) F(g, x + 3 + i, sy + 1 + ((r() * 2) | 0), 3, 5, pick(r, [CREAM, '#d6d1b8', '#5a8f80', '#a8c4e0', CREAM, '#8fd0a0'])); }
    F(g, x + 2, y + h - 3, w - 4, 3, '#cfd3cc');
  },
  helado: function (g, x, y, w, h, r) {
    var fl = y + h, i, cols = ['#f7b6cf', '#f3efe2', '#9fd8c8', '#f6d27a', '#c9a0e0', '#e08a6a'];
    F(g, x + 2, fl - 13, w - 4, 13, '#dfe3dc'); F(g, x + 2, fl - 13, w - 4, 2, '#ffffff'); F(g, x + 2, fl - 4, w - 4, 4, '#8fb0b8');
    for (i = 4; i + 6 < w - 4; i += 8) { DISC(g, x + i + 3, fl - 14, 3, cols[(r() * cols.length) | 0]); F(g, x + i, fl - 12, 7, 6, cols[(r() * cols.length) | 0]); }
    F(g, x + 3, y + 3, w - 6, 5, '#f7b6cf'); for (i = 4; i < w - 8; i += 5) P(g, x + i, y + 5, CREAM);
  },
  banco: function (g, x, y, w, h, r) {
    var fl = y + h;
    F(g, x + 2, y + 2, w - 4, h - 2, '#1c2a34'); F(g, x + 4, fl - 10, 9, 10, '#2f4a5c'); F(g, x + 5, fl - 9, 7, 4, '#6fd0e0'); F(g, x + 5, fl - 4, 7, 1, '#cfd3cc');
    if (w > 30) { F(g, x + w - 16, fl - 10, 9, 10, '#2f4a5c'); F(g, x + w - 15, fl - 9, 7, 4, '#6fd0e0'); }
    F(g, x + 2, fl - 3, w - 4, 3, '#101820');
  },
  sangu: function (g, x, y, w, h, r) {
    var fl = y + h, i;
    F(g, x + 3, y + 3, w - 6, 9, '#2a1a18'); for (i = 0; i < 4; i++) F(g, x + 5, y + 5 + i * 2, 6 + (i * 5) % 11, 1, '#e6c85a');
    F(g, x + 2, fl - 9, w - 4, 9, '#6b2a22'); F(g, x + 2, fl - 9, w - 4, 2, '#e6b060');
    for (i = 6; i < w - 10; i += 11) { F(g, x + i, fl - 13, 8, 3, '#c98a3a'); F(g, x + i, fl - 11, 8, 1, '#7a9a3a'); F(g, x + i, fl - 10, 8, 1, '#b0302a'); }
  },
  utilesGen: null
};
var COOLSET = { super: 1, ropa: 1, farma: 1, banco: 1, helado: 1 };

function vitrina(c, x, w, sp) {
  var g = c.g, H = c.H, y = H - 34, gx = x + 2, gy = y + 2, gw = w - 4, gh = 28, kind = sp.shop;
  F(g, x, y, w, 34, sp.vf || MT[2]); F(g, x, y, w, 1, MT[4]); F(g, x, y, 1, 34, MT[3]); F(g, x + w - 1, y, 1, 34, MT[1]);
  F(g, gx, gy, gw, gh, '#241c22');
  vgrad(g, gx, gy, gw, gh, COOLSET[kind] ? COOL : WARM);
  if (INT[kind]) INT[kind](g, gx, gy, gw, gh, c.rnd, sp);
  g.line(gx + 3, gy + gh - 2, gx + 12, gy + 2, lt(WARM[2], 0.22)); g.line(gx + 8, gy + gh - 2, gx + 13, gy + 8, lt(WARM[2], 0.15));
  AO(g, gx, gy, gw, 2, 0.4); AO(g, gx, gy, 1, gh, 0.25);
  var nm = Math.max(1, Math.round(w / 24));
  for (var i = 1; i < nm; i++) { var mxx = gx + Math.round(i * gw / nm); F(g, mxx, gy, 2, gh, sp.vf || MT[2]); F(g, mxx, gy, 1, gh, MT[3]); }
  F(g, x, y + 30, w, 4, sp.vb || MT[1]); F(g, x, y + 30, w, 1, MT[3]);
  lite(c, x + (w >> 1), y + 16, gw, gh, 'local');
}
function doorStd(c, x, w, sp) {
  var g = c.g, H = c.H, y = H - 34;
  F(g, x, y, w, 34, sp.df || MT[1]); F(g, x, y, w, 1, MT[4]); F(g, x, y, 1, 34, MT[3]);
  vgrad(g, x + 2, y + 2, w - 4, 26, WARM);
  var dw = w >= 22 ? (w - 4) >> 1 : w - 4;
  if (w >= 22) F(g, x + (w >> 1) - 1, y + 2, 2, 26, sp.df || MT[1]);
  F(g, x + 3, y + 20, 1, 6, K); F(g, x + w - 5, y + 20, 1, 6, K);
  g.line(x + 3, y + 26, x + 8, y + 3, lt(WARM[2], 0.2));
  F(g, x + 2, y + 28, w - 4, 6, sp.dk || MT[0]); F(g, x + 2, y + 28, w - 4, 1, MT[3]);
  F(g, x - 1, H - 2, w + 2, 2, '#a9a79b'); F(g, x - 1, H - 2, w + 2, 1, '#c9c5b5');
  lite(c, x + (w >> 1), y + 14, w - 4, 26, 'local');
}
function layoutBays(c, sp) {
  var W = c.W, dW = sp.doorW || 16, colW = sp.col ? 8 : 0, avail = W - colW * 2;
  var vw0 = W >= 170 ? 56 : (W >= 130 ? 48 : (W >= 100 ? 40 : 32));
  var n = Math.max(1, Math.floor((avail - dW - 8) / (vw0 + 6)));
  var vw = clamp(Math.floor((avail - dW - 6 * (n + 1)) / n), 24, 62);
  var di = n === 1 ? (c.seed & 1) : Math.floor(n / 2), items = [], i;
  for (i = 0; i <= n; i++) { if (i === di) items.push({ k: 'door', w: dW }); if (i < n) items.push({ k: 'vit', w: vw }); }
  if (sp.col) { items.unshift({ k: 'col', w: colW }); items.push({ k: 'col', w: colW }); }
  var tot = 0; items.forEach(function (it) { tot += it.w; });
  var gap = clamp(Math.floor((W - tot) / (items.length + 1)), 2, 13), edge = Math.floor((W - tot - gap * (items.length - 1)) / 2), x = edge;
  items.forEach(function (it) { it.x = x; x += it.w + gap; });
  if (sp.col) { items[0].x = 0; items[items.length - 1].x = W - colW; }
  return items;
}

/* ---- toldos y capa alta (lado N) ---- */
function awnN(go, x, y, w, cols, kind) {                           // tela inclinada 8 px + volado con festones de 3-4 px
  var i, j;
  for (i = 0; i < w; i++) {
    var s = kind === 'solid' ? 0 : (((i / 5) | 0) & 1), col = cols[s], hi = lt(col, 0.18), lo = dk(col, 0.28), ph = i % 5;
    for (j = 0; j < 8; j++) { var cc = j < 2 ? hi : (j > 6 ? lo : col); if (kind !== 'solid' && ph === 0) cc = j < 2 ? hi : lt(col, 0.08); if (kind !== 'solid' && ph === 4) cc = lo; P(go, x + i, y + j, cc); }
    var vh = (i % 5 === 2 && kind !== 'solid') ? 4 : 3;
    for (j = 0; j < vh; j++) P(go, x + i, y + 8 + j, j === vh - 1 ? lo : col);
  }
  if (cols[2]) F(go, x, y + 8, w, 1, cols[2]);
  F(go, x + 3, y + 11, w, 3, '#2a244060'); F(go, x + 5, y + 14, w - 2, 2, '#2a244038');
}
function ovN(c) { if (!c.go) mkOver(c, 0, c.gTop + 8, c.W, 64); return c.go; }

/* ---- S: toldos vistos desde arriba y sombrillas, sobre la vereda al norte del lote ---- */
function ovS(c) { if (!c.go) mkOver(c, 0, -26, c.W, 30); return c.go; }
function awnTop(go, x, y, w, h, sp, o) {                           // tela vista de arriba, con el logo impreso; borde norte (arriba) con festones
  var i;
  sp.logo(go, x, y, w, h, o || {});
  var edge = Q(go, x + 2, y + 2) || '#555';
  for (i = 0; i < w; i += 4) { F(go, x + i, y - 2, 3, 2, edge); P(go, x + i + 1, y - 2, lt(edge, 0.2)); }
  F(go, x, y + h - 2, w, 2, dk(edge, 0.3));
  F(go, x - 2, y - 7, w + 4, 5, '#2a244038');
}
function umbrellaTop(go, cx, cy, r, c1, c2) {
  var i, j, rr = r + 0.4;
  for (j = -r; j <= r; j++) for (i = -r; i <= r; i++) if (i * i + j * j <= rr * rr) P(go, cx + i + 3, cy + j + 3, '#2a244050');
  for (j = -r; j <= r; j++) for (i = -r; i <= r; i++) {
    if (i * i + j * j > rr * rr) continue;
    var a = Math.atan2(j, i); if (a < 0) a += Math.PI * 2;
    var sector = Math.floor(a / (Math.PI / 4)) & 7, col = (sector & 1) ? c2 : c1;
    if (i * i + j * j > (r - 1) * (r - 1)) col = dk(col, 0.25); else if (i + j < -r * 0.6) col = lt(col, 0.2);
    P(go, cx + i, cy + j, col);
  }
  P(go, cx, cy, '#e6c85a'); P(go, cx - 1, cy, dk(c1, 0.3));
}
function defaultOverS(c, sp) {
  var go = ovS(c), W = c.W, aw = Math.min(W - 20, sp.awW || 64), ax = ((W - aw) >> 1) + (sp.awOff || 0), ah = 16;
  if (sp.awn !== false) { awnTop(go, ax, 9, aw, ah, sp, sp.awnOpts); lite(c, ax + (aw >> 1), -6, 0, 0, 'foco'); }
  if (sp.umb && W >= 90) {
    var us = sp.umb, y0 = 18, r = 7;
    var xs = [ax - 16, ax + aw + 16]; if (xs[0] < r + 2) xs[0] = r + 3; if (xs[1] > W - r - 3) xs[1] = W - r - 3;
    umbrellaTop(go, xs[0], y0, r, us[0], us[1]); umbrellaTop(go, xs[1], y0, r, us[0], us[1]);
  }
}

/* ======================== CONSTRUCTORES GENERALES: lado N y lado S de tienda ======================== */
function storeN(c, sp) {
  var g = c.g, W = c.W, H = c.H, A = sp.A, rnd = c.rnd, k, i;
  faceOf(c);
  var gT = c.gTop, fy = c.faceY, valla = null;
  if (sp.valla !== false && fy >= 52) { var vw = Math.min(W - 24, sp.vw || 92), vh = sp.vh || 30; valla = { x: (W - vw) >> 1, y: fy - 13 - vh, w: vw, h: vh }; }
  roofN(c, sp.PA || A, valla ? [[valla.x - 2, valla.y - 2, valla.x + valla.w + 2, valla.y + valla.h + 10]] : null, sp);
  if (valla) rooftopBoard(c, valla, sp);
  if (sp.wall) sp.wall(c, fy, H); else wallFill(g, 0, fy, W, H - fy, A, rnd);
  F(g, 0, fy, 2, H - fy, A[3]); F(g, 0, fy, 1, H - fy, A[4]); F(g, W - 3, fy, 3, H - fy, A[1]); F(g, W - 1, fy, 1, H - fy, A[0]);
  F(g, 0, fy, W, 2, A[4]); F(g, 0, fy + 2, W, 1, A[3]); AO(g, 0, fy + 3, W, 2, 0.3);
  for (k = 1; k <= c.nUp; k++) {
    var yt = gT - 32 * k; slab(g, yt, W, A);
    (WIN[sp.win || 'std'])(c, k, yt, sp);
  }
  if (sp.deco) sp.deco(c, gT);
  groundN(c, sp);
  return finish(c);
}
function groundN(c, sp) {
  var g = c.g, W = c.W, H = c.H, A = sp.A, rnd = c.rnd, gT = c.gTop;
  var GA = sp.gA || A;
  if (sp.gA) wallFill(g, 0, gT, W, 48, sp.gA, rnd);
  if (sp.gdeco) sp.gdeco(c, gT);
  F(g, 2, gT, W - 5, 2, GA[3]); F(g, 2, gT, W - 5, 1, GA[4]);
  if (sp.zoc) sp.zoc(c); else { F(g, 2, H - 6, W - 5, 6, GA[1]); F(g, 2, H - 6, W - 5, 1, lt(GA[1], 0.2)); }
  var bays = layoutBays(c, sp);
  bays.forEach(function (b) {
    if (b.k === 'vit') vitrina(c, b.x, b.w, sp); else if (b.k === 'door') doorStd(c, b.x, b.w, sp); else if (b.k === 'col' && sp.col) sp.col(c, b.x, b.w);
  });
  // letrero (fascia): placa con el logo; si sobra ancho, cinta a los lados
  var fh = c.nUp >= 1 ? (sp.fh || 20) : 14, fyy = gT + 14 - fh, pw = Math.min(W - 6, sp.pw || 112), px0 = (W - pw) >> 1;
  if (W - 6 > pw) { F(g, 2, fyy + 3, W - 4, fh - 6, sp.band || A[1]); F(g, 2, fyy + 3, W - 4, 1, lt(sp.band || A[1], 0.2)); }
  F(g, px0 - 1, fyy - 1, pw + 2, fh + 2, K);
  sp.logo(g, px0, fyy, pw, fh, {});
  AO(g, px0 - 1, fyy + fh + 1, pw + 2, 1, 0.45);
  lite(c, W >> 1, fyy + fh + 3, 0, 0, 'foco');
  // capa alta: toldo sobre las vitrinas + extras
  var go = ovN(c);
  if (sp.awn) bays.forEach(function (b) {
    if (b.k === 'vit' || (sp.awnAll && b.k === 'door')) awnN(go, b.x - 2 - c.ox, gT + 14 - c.oy, b.w + 4, sp.awn, sp.awnKind || 'stripe');
  });
  if (sp.extras) sp.extras(c, bays, go);
}
function storeS(c, sp) {
  var g = c.g, W = c.W, H = c.H, A = sp.A, PA = sp.PA || A;
  roofSurf(c, 0, 0, W, H);
  parapetBack(g, W, H, PA);
  F(g, 0, H - 2, W, 2, PA[3]); F(g, 0, H - 2, W, 1, PA[4]);
  var bh = sp.vh ? (H >= sp.vh + 30 ? sp.vh : 0) : (H >= 70 ? 30 : (H >= 52 ? 24 : 0)), bw = Math.min(W - 26, sp.vw || 92), bx = ((W - bw) >> 1) + (sp.vOff || 0), by = 11, avoid = null;
  if (bh) { avoid = [[bx - 2, by - 2, bx + bw + 2, by + bh + 10]]; }
  roofProps(c, bh ? by + bh + 10 : 12, H - 10, propNames(c, clamp(Math.floor(W * H / 3200), 2, 8), sp.roofItems), avoid);
  if (bh) rooftopBoard(c, { x: bx, y: by, w: bw, h: bh }, sp);
  if (sp.deco) sp.deco(c);
  (sp.overS || defaultOverS)(c, sp);
  return finish(c);
}

/* ======================== EXTRAS DE FACHADA ======================== */
function lantern(go, x, y) {                                       // farolito rojo colgado (8x12)
  F(go, x + 3, y, 2, 2, '#e6c85a'); F(go, x + 1, y + 2, 6, 7, '#c0261c'); F(go, x, y + 3, 8, 5, '#c0261c'); F(go, x + 1, y + 3, 2, 4, '#e8604a'); F(go, x + 7, y + 3, 1, 5, '#7a1a16');
  F(go, x + 1, y + 2, 6, 1, '#e6c85a'); F(go, x + 1, y + 8, 6, 1, '#e6c85a'); F(go, x + 3, y + 9, 2, 3, '#e6c85a');
}
function lampBlack(go, x, y) { F(go, x, y, 1, 4, K); F(go, x - 2, y + 4, 5, 3, '#141216'); F(go, x - 2, y + 4, 5, 1, '#3a3846'); F(go, x - 1, y + 7, 3, 1, '#ffcf8a'); }
function bulbRow(go, x, y, w, step, cols) { for (var i = 0; i < w; i += step) { P(go, x + i, y, '#2a2440'); F(go, x + i, y + 1, 2, 2, cols[(i / step | 0) % cols.length]); } }
function lightCurtain(go, x, y, w, len, r, dense) {                // cortina de luces: hilos colgantes con focos tibios
  var i, step = dense ? 3 : 4, cols = ['#ffe2b0', '#fff4d8', '#ffcf8a', '#ffe9c0'];
  for (i = 0; i < w; i += step) {
    var l = 3 + Math.floor(r() * (len - 3));
    F(go, x + i, y, 1, l, '#4a3a30'); F(go, x + i, y + l, 1, 2, cols[(r() * cols.length) | 0]); P(go, x + i, y + l + 2, '#fff4d8');
    if (r() < 0.5) P(go, x + i, y + (l >> 1), '#ffe2b0');
  }
}
function candyCol(g, x, y, h, w) {                                 // columna rojiblanca tipo bastón de caramelo
  w = w || 6;
  for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
    var red = ((i + j) >> 2) & 1, c = red ? '#c4212b' : '#f3efe2';
    if (i === 0) c = red ? '#e0505a' : '#ffffff'; else if (i >= w - 2) c = red ? '#8a1219' : '#bdb9ab';
    P(g, x + i, y + j, c);
  }
  F(g, x - 1, y - 1, w + 2, 2, '#efebdc'); F(g, x - 1, y + h - 1, w + 2, 2, '#bdb9ab'); P(g, x - 1, y - 1, null); P(g, x + w, y - 1, null);
  AO(g, x - 1, y + h + 1, w + 2, 1, 0.35);
}
function blade(go, x, y, w, h, draw) {                             // letrero bandera (visto de frente, colgado de un soporte)
  F(go, x - 1, y - 2, w + 2, 1, '#5c6570'); F(go, x + 1, y - 1, 1, 2, '#5c6570'); F(go, x + w - 2, y - 1, 1, 2, '#5c6570');
  F(go, x - 1, y, w + 2, h + 2, K); draw(go, x, y + 1, w, h);
  F(go, x + 2, y + h + 2, w, 3, '#2a244050');
}

/* ======================== SPECS DE LAS 9 MARCAS (lado N; el lado S reusa logo, colores y toldos) ======================== */
var BRAND = {};
BRAND.bembos = function (c) {
  var BL = ramp('#1100CF'), YE = ramp('#FFB500');
  return {
    A: BL, PA: BL, gA: YE, win: 'oval', shop: 'burger', vf: '#e8e0cf', vb: '#e8e0cf', lit: 0.3,
    logo: function (g, x, y, w, h, o) { logo(g, 'bembos', x, y, w, h, o); }, band: '#0a0070',
    awn: ['#1100CF', '#FFB500', '#f3efe2'], umb: ['#1100CF', '#FFB500'],
    zoc: function (c) { var g = c.g, W = c.W, H = c.H; for (var x = 2; x < W - 3; x += 4) { var o = (x >> 2) & 1; F(g, x, H - 6, 4, 3, o ? CREAM : '#1100CF'); F(g, x, H - 3, 4, 3, o ? '#1100CF' : CREAM); } },
    deco: function (c, gT) {                                         // ondas amarillas sobre cada losa
      var g = c.g, W = c.W;
      for (var k = 1; k <= c.nUp; k++) { var yt = gT - 32 * k; for (var x = 2; x < W - 3; x++) { var yy = yt + 4 + Math.round(Math.sin(x / 4.5) * 1.6); F(g, x, yy, 1, 2, '#FFB500'); P(g, x, yy + 2, '#f3efe2'); } }
    }
  };
};
BRAND.starbucks = function (c) {
  var DG = ramp('#1E3932'), WO = ramp('#3a2a22');
  return {
    A: DG, PA: DG, gA: WO, win: 'std', wf: '#c9b48a', ww: 20, lit: 0.35, shop: 'cafe', vf: '#2a2018', vb: '#1E3932', df: '#2a2018',
    logo: function (g, x, y, w, h, o) { logo(g, 'starbucks', x, y, w, h, o); }, band: '#14241f',
    awn: ['#1E3932', '#00704A', '#f3efe2'], awnKind: 'solid', umb: ['#00704A', '#f3efe2'], awW: 84,
    gdeco: function (c, gT) { var g = c.g, W = c.W, H = c.H; for (var x = 4; x < W - 3; x += 4) { F(g, x, gT + 2, 1, 42, WO[1]); F(g, x + 1, gT + 2, 1, 42, WO[3]); } },
    extras: function (c, bays, go) {                                 // sirena colgada: letrero bandera redondo
      var x = c.W - 18 - c.ox, y = c.gTop + 20 - c.oy;
      F(go, x - 1, y - 12, 14, 1, '#5c6570'); F(go, x + 5, y - 11, 1, 3, '#5c6570');
      DISC(go, x + 6, y, 8, '#14241f'); siren(go, x + 6, y, 7);
      F(go, x - 2, y + 10, 18, 3, '#2a244050');
    }
  };
};
BRAND.lalucha = function (c) {
  var CH = ramp('#2B2B2B');
  return {
    A: CH, PA: CH, win: 'std', wf: '#e9e2c8', lit: 0.5, shop: 'lucha', vf: '#141216', vb: '#2b2b2b', df: '#141216', doorW: 18, band: '#141216',
    logo: function (g, x, y, w, h, o) { logo(g, 'lalucha', x, y, w, h, o); },
    awn: ['#141216', '#2b2b2b', '#efebdc'], awnKind: 'solid', awnAll: true, umb: ['#2b2b2b', '#efebdc'], awW: 72,
    col: function (c, x, w) {                                         // columna de azulejo blanco tipo metro con base negra
      var g = c.g, H = c.H, gT = c.gTop, y0 = gT + 2, h = 46 - 8;
      F(g, x, y0, w, h, '#efebdc'); for (var j = 0; j < h; j += 4) F(g, x, y0 + j, w, 1, '#c9c5b5'); for (j = 0; j < h; j += 8) F(g, x + (w >> 1), y0 + j, 1, 4, '#c9c5b5');
      F(g, x, y0, 1, h, '#ffffff'); F(g, x + w - 1, y0, 1, h, '#bdb9ab'); F(g, x, H - 8, w, 8, '#1c1a22'); F(g, x, H - 8, w, 1, '#4a4858');
    },
    extras: function (c, bays, go) {                                 // marquesina con focos de cadena y lamparas colgantes
      var W = c.W, gT = c.gTop, y = gT + 14 - c.oy, i;
      for (i = 0; i < bays.length; i++) { var b = bays[i]; if (b.k !== 'vit') continue; lampBlack(go, b.x + (b.w >> 1) - c.ox, y + 11); }
      bulbRow(go, 10, y + 11, W - 20, 6, ['#ffe2b0', '#fff4d8']);
      lite(c, W >> 2, gT + 26, 0, 0, 'foco'); lite(c, (W * 3) >> 2, gT + 26, 0, 0, 'foco');
    }
  };
};
BRAND.chinawok = function (c) {
  var RE = ramp('#E30613');
  return {
    A: RE, PA: RE, win: 'std', wf: '#f3efe2', shutter: '#1F862C', lit: 0.3, shop: 'chifa', vf: '#7a0a12', vb: '#1F862C', df: '#7a0a12', band: '#1F862C',
    logo: function (g, x, y, w, h, o) { logo(g, 'chinawok', x, y, w, h, o); },
    awn: ['#1F862C', '#f3efe2', '#145a1c'], umb: ['#E30613', '#f3efe2'], awnOpts: { inv: true },
    zoc: function (c) { var g = c.g, W = c.W, H = c.H; F(g, 2, H - 6, W - 5, 6, '#1F862C'); F(g, 2, H - 6, W - 5, 1, '#3FA535'); },
    extras: function (c, bays, go) {
      var gT = c.gTop, y = gT + 14 + 11 - c.oy, n = 0;
      bays.forEach(function (b) { if (b.k === 'vit' && n < 3) { lantern(go, b.x + (b.w >> 1) - 4 - c.ox, y); n++; } });
    }
  };
};
BRAND.belisario = function (c) {
  var RE = ramp('#E5133A');
  return {
    A: RE, PA: RE, win: 'std', wf: CREAM, arch: true, lit: 0.3, shop: 'pollo', vf: '#7a0a22', vb: '#2a2a2e', df: '#7a0a22', band: '#7a0a22',
    logo: function (g, x, y, w, h, o) { logo(g, 'belisario', x, y, w, h, o); },
    awn: ['#E5133A', '#f3efe2', '#7a0a22'], umb: ['#E5133A', '#f3efe2'], awnOpts: { inv: true },
    zoc: function (c) { var g = c.g, W = c.W, H = c.H; F(g, 2, H - 6, W - 5, 6, '#2a2a2e'); F(g, 2, H - 6, W - 5, 1, '#4a4a52'); },
    extras: function (c, bays, go) {                                 // letrero bandera con el gallo
      var x = c.W - 26 - c.ox, y = c.gTop + 16 - c.oy;
      blade(go, x, y, 22, 22, function (go2, x0, y0, w, h) { F(go2, x0, y0, w, h, CREAM); FR(go2, x0, y0, w, h, '#E5133A'); DISC(go2, x0 + 11, y0 + 11, 8, '#E5133A'); drawGallo(go2, x0 + 3, y0 + 2); });
    }
  };
};
BRAND.wong = function (c) {
  var RE = ramp('#EC1C24');
  return {
    A: RE, PA: RE, win: 'ribbon', wf: '#f3efe2', lit: 0.3, shop: 'super', vf: '#f3efe2', vb: '#8a0f14', df: '#f3efe2', doorW: 24, band: '#8a0f14', pw: 96,
    logo: function (g, x, y, w, h, o) { logo(g, 'wong', x, y, w, h, o); },
    awn: ['#EC1C24', '#f3efe2', '#8a0f14'], awnKind: 'solid', umb: ['#EC1C24', '#f3efe2'], vw: 84,
    zoc: function (c) { var g = c.g, W = c.W, H = c.H; F(g, 2, H - 6, W - 5, 6, '#8a0f14'); F(g, 2, H - 6, W - 5, 1, '#f3efe2'); }
  };
};
BRAND.ripley = function (c) {
  var DG = ['#17171c', '#25252b', '#333333', '#4a4a52', '#66666e'];
  return {
    A: DG, PA: DG, win: 'ribbon', wf: '#8c8a93', rh: 20, shop: 'ropa', vf: '#6a6a72', vb: '#25252b', df: '#6a6a72', band: '#25252b', doorW: 22,
    logo: function (g, x, y, w, h, o) { logo(g, 'ripley', x, y, w, h, o); },
    awn: ['#25252b', '#4a4a52', '#f3efe2'], awnKind: 'solid', umb: ['#333333', '#f3efe2'], vw: 100,
    deco: function (c, gT) {                                         // aletas verticales claras en el muro
      var g = c.g, W = c.W; for (var x = 0; x < W; x += 24) { F(g, x + 1, c.faceY + 3, 1, gT - c.faceY - 3, '#4a4a52'); }
    },
    zoc: function (c) { var g = c.g, W = c.W, H = c.H; F(g, 2, H - 6, W - 5, 6, '#17171c'); F(g, 2, H - 6, W - 5, 1, '#66666e'); }
  };
};
BRAND.saga = function (c) {
  var LI = ramp('#8DC63F');
  return {
    A: LI, PA: LI, win: 'curtain', mu: '#8DC63F', shop: 'ropa', vf: '#8DC63F', vb: '#5f9a22', df: '#8DC63F', band: '#8DC63F', doorW: 22,
    logo: function (g, x, y, w, h, o) { logo(g, 'saga', x, y, w, h, o); },
    awn: ['#8DC63F', '#f4f6ee', '#5f9a22'], awnKind: 'solid', umb: ['#8DC63F', '#f4f6ee'], vw: 100,
    deco: function (c, gT) {                                         // letrero vertical verde con la "f" blanca (sobre el muro, mirando a la calle)
      if (c.nUp < 2) return;
      var g = c.g, W = c.W, bw = 26, bx = W - bw - 8, by = c.faceY + 6, bh = Math.min(56, gT - c.faceY - 12), B = brandGet('saga'), LIME = '#8DC63F';
      F(g, bx - 1, by - 1, bw + 2, bh + 2, K); F(g, bx, by, bw, bh, LIME); F(g, bx, by, bw, 1, lt(LIME, 0.3)); F(g, bx + bw - 1, by, 1, bh, dk(LIME, 0.3));
      drawF(g, bx + ((bw - 12) >> 1), by + 5, 2, '#ffffff');
      px.text(g, B.main, bx + (bw >> 1), by + bh - 8, { font: 'a5', ink: '#ffffff', align: 'c' });
    }
  };
};
BRAND.tailoy = function (c) {
  var GR = ramp('#00A160'), YE = ramp('#F7D117');
  return {
    A: GR, PA: GR, gA: YE, win: 'std', wf: '#F7D117', lit: 0.15, shop: 'utiles', vf: '#00A160', vb: '#00A160', df: '#00A160', band: '#F7D117',
    logo: function (g, x, y, w, h, o) { logo(g, 'tailoy', x, y, w, h, o); },
    awn: ['#00A160', '#F7D117', '#006b42'], umb: ['#00A160', '#F7D117'],
    zoc: function (c) { var g = c.g, W = c.W, H = c.H; F(g, 2, H - 6, W - 5, 6, '#00A160'); F(g, 2, H - 6, W - 5, 1, '#3cc08a'); },
    deco: function (c, gT) {                                         // banderines amarillos entre pisos
      if (c.nUp < 1) return;
      var g = c.g, W = c.W; for (var k = 1; k <= c.nUp; k++) { var yt = gT - 32 * k + 24; for (var x = 6; x < W - 8; x += 7) { F(g, x, yt, 5, 3, ((x / 7 | 0) & 1) ? '#F7D117' : '#f3efe2'); P(g, x + 2, yt + 3, ((x / 7 | 0) & 1) ? '#F7D117' : '#f3efe2'); } F(g, 4, yt - 1, W - 8, 1, '#4a4858'); }
    }
  };
};

/* ======================== GENERICOS (sin marcas reales) ======================== */
function genLogo(o) {
  return function (g, x, y, w, h) {
    plate(g, x, y, w, h, o.bg, o.border || dk(o.bg, 0.45));
    var ix = x + 3, aw = w - 6, iw = 0;
    if (o.icon && w >= 40 && h >= 10) { iw = o.icon(g, x + 3, y, h); ix += iw + 3; aw -= iw + 3; }
    fitTxt(g, o.text, ix, y + 1, aw, h - 2, o.ink, { shadow: o.sh || null, max: o.max });
  };
}
function icoRows(rows, pal) {
  return function (g, x, y, h) { var oy = y + ((h - rows.length) >> 1); spr(g, x, oy, rows, pal); return rows[0].length; };
}
var ICO = {
  cross: icoRows(['..###..', '..###..', '#######', '#######', '#######', '..###..', '..###..'], { '#': '#ffffff' }),
  drum:  icoRows(['.####....', '######...', '######...', '.####....', '..##.....', '...##....', '....##.b.', '.....bbb.'], { '#': '#f2c26a', b: '#ffffff' }),
  cone:  icoRows(['.#####.', '#######', '#######', '.#####.', '.ooooo.', '..ooo..', '..ooo..', '...o...'], { '#': '#ffffff', o: '#d9a45a' }),
  churro: icoRows(['.....###', '....####', '...###.#', '..###...', '.###....', '###.....'], { '#': '#f2c26a' }),
  cup:   icoRows(['..#.#...', '...#.#..', '.######.', '.#####.#', '.#####.#', '.#####.#', '..###.#.', '.#######'], { '#': '#f3efe2' }),
  star:  icoRows(['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'], { '#': '#e6c85a' }),
  film:  icoRows(['#.#.#.#.#', '#########', '#.......#', '#.......#', '#########', '#.#.#.#.#'], { '#': '#e6c85a' }),
  bag:   icoRows(['..###..', '.#...#.', '#######', '#######', '#######', '#######', '#######'], { '#': '#e6c85a' })
};
var GIRO = {
  farmacia:   { name: 'FARMACIA', bg: '#1f8a4c', ink: '#ffffff', icon: ICO.cross, wall: 'blanco', shop: 'farma', awn: ['#1f8a4c', '#f3efe2'], lights: 'cruz', wf: '#f3efe2' },
  polloFrito: { name: 'POLLO FRITO', bg: '#B5481A', ink: '#fff0d0', icon: ICO.drum, wall: 'ocre', shop: 'pollo', awn: ['#B5481A', '#f3efe2'], umb: ['#B5481A', '#f3efe2'], wf: '#f3efe2' },
  ropa:       { name: 'MODA', bg: '#2a2830', ink: '#e6c85a', icon: ICO.bag, wall: 'durazno', shop: 'ropa', wf: '#f3efe2', max: 'a12' },
  banco:      { name: 'BANCO', bg: '#1d4b52', ink: '#e6c85a', wall: 'cemento', shop: 'banco', doorW: 20, bankCols: true, wf: '#d6d1b8', max: 'a12' },
  heladeria:  { name: 'HELADOS', bg: '#f7b6cf', ink: '#7a2a50', icon: ICO.cone, wall: 'rosado', shop: 'helado', awn: ['#f7b6cf', '#f3efe2'], umb: ['#f7b6cf', '#f3efe2'], wf: '#f3efe2' },
  churreria:  { name: 'CHURROS', bg: '#d6a94a', ink: '#4a2a18', icon: ICO.churro, wall: 'ocre', shop: 'sangu', awn: ['#b0402f', '#efe3c8'], umb: ['#b0402f', '#efe3c8'], wf: '#f3efe2' },
  cafe:       { name: 'CAFÉ', bg: '#4a3028', ink: '#f3efe2', icon: ICO.cup, wall: 'crema', shop: 'cafe', awn: ['#6b4223', '#efe3c8'], umb: ['#6b4223', '#efe3c8'], wf: '#c9b48a' },
  cine:       { name: 'CINE', bg: '#1c1a22', ink: '#e6c85a', icon: ICO.film, wall: 'azul', shop: 'cine', wf: '#c9b48a', marquee: true, max: 'a12', doorW: 22 },
  galeria:    { name: 'GALERÍA', bg: '#5a4a8a', ink: '#f3efe2', wall: 'cemento', shop: 'galeria', doorW: 30, wf: '#d6d1b8' },
  hotel:      { name: 'HOTEL', bg: '#2f4470', ink: '#e6c85a', icon: ICO.star, wall: 'ocre', shop: 'cafe', awn: ['#2f4470', '#e6c85a'], awnKind: 'solid', awnAll: true, umb: ['#2f4470', '#e6c85a'], wf: '#f3efe2', lit: 0.3, hotel: true },
  sangucheria: { name: 'SÁNGUCHES', bg: '#8f3a32', ink: '#f3efe2', wall: 'durazno', shop: 'sangu', awn: ['#8f3a32', '#efe3c8'], umb: ['#8f3a32', '#efe3c8'], wf: '#f3efe2' }
};
INT.cine = function (g, x, y, w, h, r) {
  var i, cols = ['#d62b2b', '#3f72b0', '#e6a82a', '#2f7a50', '#8b5fa3'];
  for (i = 0; i + 11 <= w - 2; i += 13) { var cc = cols[(r() * cols.length) | 0]; F(g, x + 3 + i, y + 3, 10, 18, cc); F(g, x + 3 + i, y + 3, 10, 2, lt(cc, 0.35)); F(g, x + 5 + i, y + 9, 6, 6, dk(cc, 0.4)); F(g, x + 4 + i, y + 18, 8, 1, '#f3efe2'); }
  F(g, x + 2, y + h - 5, w - 4, 5, '#1c1a22'); for (i = 4; i < w - 6; i += 8) F(g, x + i, y + h - 4, 4, 1, '#e6c85a');
};
INT.galeria = function (g, x, y, w, h, r) {
  var i, cols = ['#d62b2b', '#3f72b0', '#e6a82a', '#2f7a50', '#d98a9e'];
  F(g, x + 1, y + 1, w - 2, h - 1, '#1c1a22');
  for (i = 3; i + 9 <= w - 3; i += 12) { var cc = cols[(r() * cols.length) | 0]; F(g, x + i, y + 4, 9, 4, cc); F(g, x + i, y + 4, 9, 1, lt(cc, 0.35)); F(g, x + i, y + 10, 9, 10, '#34303a'); F(g, x + i + 1, y + 12, 7, 5, lt(cc, 0.1)); }
  vgrad(g, x + 1, y + h - 8, w - 2, 8, ['#54382c', '#7a4e30']);
};
function giroSpec(c, f) {
  var G0 = GIRO[f.giro] || GIRO.ropa, name = (f.name ? String(f.name) : G0.name).toUpperCase();
  var A = f.color ? px.wallRamp(f.color) : (px.wallRamp(G0.wall) || RAMPS.concrete), PA = ramp(G0.bg);
  var sp = {
    A: A, PA: PA, win: 'std', wf: G0.wf, lit: G0.lit === undefined ? 0.2 : G0.lit, shop: G0.shop, doorW: G0.doorW, band: dk(G0.bg, 0.2), awn: G0.awn, awnKind: G0.awnKind, awnAll: G0.awnAll, umb: G0.umb,
    logo: genLogo({ bg: G0.bg, ink: G0.ink, text: name, icon: G0.icon, max: G0.max, sh: dk(G0.bg, 0.4) }), roofItems: null, vw: 66, vh: 22,
    vf: dk(A[2], 0.2), vb: dk(A[1], 0.2), df: dk(A[2], 0.2)
  };
  if (G0.bankCols) sp.col = function (c, x, w) {                      // columnas de portico
    var g = c.g, H = c.H, gT = c.gTop, y0 = gT + 2, h = 40;
    F(g, x, y0, w, h, '#d6cdb4'); F(g, x, y0, 2, h, '#efe7d4'); F(g, x + w - 2, y0, 2, h, '#a39a84'); F(g, x - 1, y0, w + 2, 3, '#efe7d4'); F(g, x - 1, H - 8, w + 2, 3, '#a39a84');
    for (var j = 4; j < h - 4; j += 3) P(g, x + 3, y0 + j, '#bdb29a');
  };
  if (G0.hotel) sp.extras = function (c, bays, go) { var x = c.W - 20 - c.ox, y = c.gTop + 8 - c.oy; };
  if (G0.marquee) {                                                  // marquesina de cine: foquitos y vitrinas de afiches
    sp.awn = ['#1c1a22', '#e6c85a'];
    sp.awnKind = 'solid';
    sp.extras = function (c, bays, go) {
      var gT = c.gTop, y = gT + 14 - c.oy + 8;
      bulbRow(go, 3, y, c.W - 6, 4, ['#ffe2b0', '#f2e63c', '#ff8a2a']);
      lite(c, c.W >> 2, gT + 26, 0, 0, 'foco'); lite(c, (c.W * 3) >> 2, gT + 26, 0, 0, 'foco');
    };
  }
  if (G0.lights) { var ex = sp.extras; sp.extras = function (c, bays, go) { lite(c, c.W >> 1, c.gTop + 6, 0, 0, G0.lights); if (ex) ex(c, bays, go); }; }
  return sp;
}

S.lotArch.mf_tienda = function (f) {
  var c = mkCtx(f), mk = BRAND[f.brand], sp;
  if (mk) sp = mk(c);
  else sp = giroSpec(c, { giro: 'ropa', name: f.name || 'TIENDA', color: f.color });
  return c.side === 'S' ? storeS(c, sp) : storeN(c, sp);
};
S.lotArch.mf_generico = function (f) {
  var c = mkCtx(f), sp = giroSpec(c, f);
  return c.side === 'S' ? storeS(c, sp) : storeN(c, sp);
};

/* ======================== MF_TORRE: edificio moderno de 6-12 pisos, comprimido ======================== */
function torreSpec(c) {
  var f = c.f, glass = f.color === 'vidrio' || (f.color !== 'gris' && (c.seed & 1) === 1);
  var A = glass ? ['#14202a', '#1f3340', '#2f4a5c', '#4a6a80', '#7fa0b0'] : RAMPS.concrete;
  var name = (f.name ? String(f.name) : 'EDIFICIO').toUpperCase();
  return { A: A, PA: A, glass: glass, name: name, shop: 'banco', win: 'std', wf: '#d6d1b8', doorW: 22, band: dk(A[2], 0.3), doorDk: true,
    vf: dk(A[2], 0.2), vb: dk(A[1], 0.2), df: dk(A[2], 0.2),
    logo: genLogo({ bg: glass ? '#0f1a22' : '#2a2830', ink: '#e6c85a', text: name, sh: '#000000', max: 'a7' }), valla: false };
}
function torreN(c) {
  var g = c.g, W = c.W, H = c.H, sp = torreSpec(c), A = sp.A, n = clamp(c.f.floors || 8, 3, 12), i, x;
  faceOf(c, Math.min(c.rows, 10));
  c.nUp = Math.max(1, c.nUp);
  var gT = c.gTop, fy = c.faceY, shaft = gT - fy;
  roofN(c, A, null, { roofItems: ['stairbox', 'tank', 'antenna'] });
  if (shaft > 0) {
    var pitch = clamp(Math.floor(shaft / n), 8, 22), cnt = Math.floor(shaft / pitch), rem = shaft - cnt * pitch, rnd = c.rnd;
    wallFill(g, 0, fy, W, shaft, A, rnd, 26);
    F(g, 0, fy, 2, shaft + 48, A[3]); F(g, 0, fy, 1, shaft + 48, A[4]); F(g, W - 3, fy, 3, shaft + 48, A[1]); F(g, W - 1, fy, 1, shaft + 48, A[0]);
    // coronamiento
    F(g, 0, fy, W, 3, A[4]); F(g, 0, fy + 3, W, 2, A[3]); AO(g, 0, fy + 5, W, 2, 0.35);
    for (i = 0; i < cnt; i++) {
      var y0 = fy + rem + i * pitch;
      if (sp.glass) {
        var gy = y0 + 3, gh = pitch - 3, SKY = ['#2a5a68', '#3c7480', '#4b8f94', '#7cc0b8'];
        vgrad(g, 2, gy, W - 5, gh, [SKY[(i < 2) ? 3 : 2], SKY[2], SKY[1]]);
        for (x = 4; x < W - 6; x += 12) F(g, x, y0, 1, pitch, A[3]);
        for (x = 6; x < W - 12; x += 24) { if (((x / 24 | 0) + i) % 3 === 0) { P(g, x, gy + gh - 2, SKY[3]); P(g, x + 1, gy + gh - 3, SKY[3]); P(g, x + 2, gy + gh - 4, SKY[3]); } }
        F(g, 2, y0, W - 5, 3, A[2]); F(g, 2, y0, W - 5, 1, A[4]);
        if (c.r2() < 0.18) F(g, 8 + ((c.r2() * (W - 30)) | 0), gy + 1, 10, gh - 2, '#a8693a');
      } else {
        F(g, 0, y0, W, 3, A[4]); F(g, 0, y0 + 3, W, 1, A[3]); F(g, 0, y0 + 4, W, 1, A[1]);
        var wy = y0 + 5, wh = Math.max(3, pitch - 8);
        for (x = 6; x < W - 8; x += 20) {
          var pw = Math.min(14, W - 8 - x);
          F(g, x - 1, wy - 1, pw + 2, wh + 2, A[0]); vgrad(g, x, wy, pw, wh, [GL[1], GL[2]]);
          if (c.r2() < 0.1) { F(g, x, wy, pw, wh, "#7a4e30"); F(g, x, wy, pw, 1, '#54382c'); }
          F(g, x + pw + 1, y0 + 4, 5, pitch - 4, A[3]); F(g, x + pw + 5, y0 + 4, 1, pitch - 4, A[1]);
        }
      }
      AO(g, 0, y0 + pitch - 2, W, 2, 0.22);
    }
    if (sp.glass) lite(c, W >> 1, fy + (shaft >> 1), W >> 1, 24, 'local');
  }
  c.nUp = 1;
  groundN(c, sp);
  return finish(c);
}
function torreS(c) {
  var g = c.g, W = c.W, H = c.H, sp = torreSpec(c), A = sp.A, i;
  roofSurf(c, 0, 0, W, H);
  parapetBack(g, W, H, A);
  F(g, 0, H - 2, W, 2, A[3]); F(g, 0, H - 2, W, 1, A[4]);
  var bw = Math.min(W - 30, 44), bh = Math.min(H - 40, 26), bx = 14 + (c.seed % Math.max(1, W - bw - 28));
  if (bh >= 14) {                                                   // cuarto de maquinas con puerta
    AO(g, bx + 5, 14 + bh, bw, 6, 0.3);
    F(g, bx, 14, bw, bh, A[2]); F(g, bx, 14, bw, 3, A[4]); F(g, bx, 17, bw, 1, A[3]); F(g, bx, 14, 1, bh, A[3]); F(g, bx + bw - 1, 14, 1, bh, A[1]); F(g, bx, 14 + bh - 1, bw, 1, A[0]);
    F(g, bx + 6, 14 + bh - 12, 8, 11, '#3a2a22'); F(g, bx + 6, 14 + bh - 12, 8, 1, '#6b4223');
    F(g, bx + bw - 16, 22, 10, 6, GL[1]); FR(g, bx + bw - 16, 22, 10, 6, A[0]);
  }
  roofProps(c, 14 + (bh >= 14 ? bh : 0) + 6, H - 10, ['tank', 'antenna', 'hood', 'stairbox', 'plants'], bh >= 14 ? [[bx - 2, 12, bx + bw + 4, 14 + bh + 10]] : null);
  [[8, 8], [W - 10, 8], [8, H - 8], [W - 10, H - 8]].forEach(function (p) { F(g, p[0], p[1], 2, 2, '#ff4040'); P(g, p[0] - 1, p[1] + 1, '#a02020'); lite(c, p[0], p[1], 0, 0, 'foco'); });
  return finish(c);
}
S.lotArch.mf_torre = function (f) { var c = mkCtx(f); return c.side === 'S' ? torreS(c) : torreN(c); };

/* ======================== MF_IGLESIA: Virgen Milagrosa (neocolonial, crema y blanca, torre campanario) ======================== */
var CR = ramp('#D8C9AE'), WHT = '#efe7d4', WHS = '#bdb29a';
var RT = ['#5a4338', '#7e6354', '#A28270', '#b99a86', '#cfb4a0'];
function tileRows(g, x, y, w, h, A, off) {                         // teja: hileras de 3 px con juntas desfasadas
  F(g, x, y, w, h, A[2]);
  for (var j = 0; j < h; j += 3) {
    F(g, x, y + j, w, 1, A[1]); F(g, x, y + j + 1, w, 1, A[3]);
    for (var i = ((j / 3 | 0) % 2) * 3 + (off || 0); i < w; i += 6) P(g, x + i, y + j + 2, A[1]);
  }
}
function archWin(g, x, y, w, h, o) {                               // ventana con arco de medio punto y vitral
  var r = w >> 1, cx = x + r, i, j, cols = ['#3f5aa8', '#b0302a', '#e6b030', '#2f7a50', '#8b5fa3'];
  DISC(g, cx, y + r, r + 1, o.frame || WHT); F(g, x - 1, y + r, w + 2, h - r, o.frame || WHT);
  DISC(g, cx, y + r, r - 1, K); F(g, x + 1, y + r, w - 2, h - r - 1, K);
  var rnd = o.rnd;
  for (j = 0; j < h - 2; j += 3) for (i = 0; i < w - 2; i += 3) {
    var dx = (x + 1 + i + 1) - cx, dy = (y + 1 + j) - (y + r);
    if (dy < 0 && dx * dx + dy * dy > (r - 1) * (r - 1)) continue;
    F(g, x + 1 + i, y + 1 + j, 2, 2, cols[(rnd() * cols.length) | 0]);
  }
  F(g, cx, y + 1, 1, h - 3, K); F(g, x + 1, y + (h >> 1), w - 2, 1, K);
  F(g, x - 2, y + h, w + 4, 2, WHT); AO(g, x - 2, y + h + 2, w + 4, 1, 0.35);
}
function iglesiaN(c) {
  var g = c.g, W = c.W, H = c.H, rnd = c.rnd, cx = W >> 1, i, j, x, y;
  faceOf(c, 9);
  var tw = clamp(Math.round(W * 0.24), 30, 48), x0 = cx - (tw >> 1), x1 = x0 + tw;
  var wingTop = clamp(Math.max(c.faceY + 16, H - 112), H - 124, H - 56);
  var s = clamp(H / 192, 0.62, 1.15);
  var yCross = 1, ySpire = Math.round(9 * s) + 1, yBel = Math.round(30 * s) + 1, yBelEnd = yBel + Math.round(34 * s), yClock = yBelEnd + 6;
  // ---- techo del templo (detras) ----
  var nW = clamp(Math.round(W * 0.26), 32, 52);
  tileRows(g, 0, 0, W, wingTop + 10, RT, 0);
  LI(g, cx - nW, 0, nW, wingTop + 10, 0.12); AO(g, cx, 0, nW, wingTop + 10, 0.2); AO(g, cx + nW, 0, W - cx - nW, wingTop + 10, 0.1);
  AO(g, 0, 0, cx - nW, wingTop + 10, 0.04);
  F(g, cx - 1, 0, 2, wingTop + 10, RT[4]); F(g, cx + 1, 0, 1, wingTop + 10, RT[1]);
  [cx - nW, cx + nW].forEach(function (xx, k) {                      // muros del cuerpo central con ventanitas
    F(g, xx - 3, 6, 6, wingTop + 4, CR[2]); F(g, xx - 3, 6, 1, wingTop + 4, CR[3]); F(g, xx + 2, 6, 1, wingTop + 4, CR[1]);
    for (var yy = 14; yy < wingTop - 6; yy += 16) { F(g, xx - 1, yy, 3, 7, '#2a2024'); P(g, xx - 1, yy, '#6b5a4c'); }
    AO(g, xx + (k ? 3 : -6), 6, 3, wingTop + 4, 0.2);
  });
  tileRows(g, 0, 8, cx - nW - 3, wingTop + 2, RT, 2); AO(g, 0, 8, cx - nW - 3, wingTop + 2, 0.06);
  tileRows(g, cx + nW + 3, 8, W - cx - nW - 3, wingTop + 2, RT, 1); AO(g, cx + nW + 3, 8, W - cx - nW - 3, wingTop + 2, 0.16);
  F(g, 0, 8, cx - nW - 3, 1, RT[4]); F(g, cx + nW + 3, 8, W - cx - nW - 3, 1, RT[4]);
  // ---- alas laterales ----
  var winW = 12, winH = Math.min(30, H - wingTop - 36);
  [[0, x0], [x1, W]].forEach(function (seg, k) {
    var wx = seg[0], ww = seg[1] - seg[0];
    wallFill(g, wx, wingTop, ww, H - wingTop, CR, rnd, 28);
    // balaustrada y cornisa
    F(g, wx, wingTop - 6, ww, 6, CR[3]); for (x = wx + 1; x < wx + ww - 1; x += 4) { F(g, x, wingTop - 5, 2, 5, WHT); P(g, x + 1, wingTop - 5, WHS); }
    F(g, wx, wingTop - 7, ww, 2, WHT); F(g, wx, wingTop, ww, 3, WHT); F(g, wx, wingTop + 3, ww, 1, WHS); AO(g, wx, wingTop + 4, ww, 3, 0.3);
    // ventanas con vitral
    var nwin = Math.max(1, Math.floor((ww - 10) / 26)), gap = (ww - nwin * winW) / (nwin + 1);
    for (i = 0; i < nwin; i++) { var wxx = Math.round(wx + gap * (i + 1) + winW * i); archWin(g, wxx, wingTop + 14, winW, winH, { rnd: rnd }); if (i < 2) lite(c, wxx + winW / 2, wingTop + 14 + (winH >> 1), winW, winH, 'local'); }
    // pilastra del extremo y junto a la torre
    var px_ = k ? wx + 1 : wx + ww - 5;
    F(g, px_, wingTop + 3, 4, H - wingTop - 11, WHT); F(g, px_, wingTop + 3, 1, H - wingTop - 11, '#ffffff'); F(g, px_ + 3, wingTop + 3, 1, H - wingTop - 11, WHS);
    F(g, wx, H - 8, ww, 8, CR[1]); F(g, wx, H - 8, ww, 1, CR[3]); AO(g, wx, H - 8, ww, 8, 0.08);
  });
  F(g, 0, wingTop, 2, H - wingTop, CR[3]); F(g, W - 2, wingTop, 2, H - wingTop, CR[1]);
  // ---- torre central ----
  var tb = Math.max(yClock + 14, yBel);                              // cuerpo de la torre
  wallFill(g, x0, yBel, tw, H - yBel, CR, rnd, 26);
  F(g, x0, yBel, 3, H - yBel, WHT); F(g, x1 - 3, yBel, 3, H - yBel, WHS); F(g, x0, yBel, 1, H - yBel, '#ffffff');
  AO(g, x1, yBel + 2, 3, H - yBel, 0.25);
  // campanario: dos arcos con campana
  var bh = yBelEnd - yBel;
  F(g, x0 - 2, yBel - 3, tw + 4, 4, WHT); F(g, x0 - 2, yBel - 3, tw + 4, 1, '#ffffff'); F(g, x0 - 2, yBel + 1, tw + 4, 1, WHS); AO(g, x0 - 2, yBel + 2, tw + 4, 2, 0.3);
  var narch = tw >= 40 ? 2 : 1, aw = 11, ah = Math.min(bh - 10, 24);
  for (i = 0; i < narch; i++) {
    var ax = narch === 2 ? x0 + 9 + i * (tw - 18 - aw) : cx - (aw >> 1), ay = yBel + 6;
    DISC(g, ax + (aw >> 1), ay + (aw >> 1), (aw >> 1) + 1, WHT); F(g, ax - 1, ay + (aw >> 1), aw + 2, ah - (aw >> 1), WHT);
    DISC(g, ax + (aw >> 1), ay + (aw >> 1), (aw >> 1), '#241a1c'); F(g, ax, ay + (aw >> 1), aw, ah - (aw >> 1) - 1, '#241a1c');
    for (j = ay + 3; j < ay + ah - 2; j += 3) F(g, ax + 1, j, aw - 2, 1, '#3a2e30');
    ELL(g, ax + (aw >> 1), ay + (aw >> 1) + 5, 3, 3, '#e6c85a'); F(g, ax + (aw >> 1) - 3, ay + (aw >> 1) + 7, 7, 2, '#e6c85a'); P(g, ax + (aw >> 1) - 1, ay + (aw >> 1) + 4, '#fff0a0');
  }
  F(g, x0 - 2, yBelEnd, tw + 4, 4, WHT); F(g, x0 - 2, yBelEnd, tw + 4, 1, '#ffffff'); AO(g, x0 - 2, yBelEnd + 4, tw + 4, 3, 0.3);
  // reloj
  var cyk = yClock + 6;
  DISC(g, cx, cyk, 7, K); DISC(g, cx, cyk, 6, WHT); DISC(g, cx, cyk, 5, '#fbf6e6');
  P(g, cx, cyk - 4, K); P(g, cx, cyk + 4, K); P(g, cx - 4, cyk, K); P(g, cx + 4, cyk, K); F(g, cx, cyk - 3, 1, 3, K); F(g, cx, cyk, 3, 1, K); P(g, cx, cyk, '#b0302a');
  F(g, cx - 8, cyk + 8, 17, 2, WHT); AO(g, cx - 8, cyk + 10, 17, 2, 0.3);
  // nicho con la Virgen Milagrosa
  var nichoY = cyk + 14, portalTop = H - 54;
  if (portalTop - nichoY >= 30) {
    var ny = nichoY + ((portalTop - nichoY - 28) >> 1);
    DISC(g, cx, ny + 6, 6, WHT); F(g, cx - 6, ny + 6, 13, 22, WHT);
    DISC(g, cx, ny + 6, 5, '#2a2040'); F(g, cx - 5, ny + 6, 11, 21, '#2a2040');
    for (j = 0; j < 5; j++) { F(g, cx - 5 + j * 3, ny + 8, 1, 6, '#e6c85a'); }                       // rayos
    ELL(g, cx, ny + 19, 3, 6, '#f3efe2'); F(g, cx - 3, ny + 17, 7, 3, '#3f72b0'); DISC(g, cx, ny + 10, 1, '#f3efe2');
    F(g, cx - 3, ny + 15, 1, 3, '#f3efe2'); F(g, cx + 3, ny + 15, 1, 3, '#f3efe2');
    F(g, cx - 7, ny + 28, 15, 2, WHT); AO(g, cx - 7, ny + 30, 15, 2, 0.3);
    lite(c, cx, ny + 14, 8, 24, 'foco');
  } else {                                                           // sin sitio para el nicho: ventana alta con reja
    var wy2 = nichoY + 2; if (portalTop - wy2 >= 18) archWin(g, cx - 5, wy2, 10, portalTop - wy2 - 6, { rnd: rnd });
  }
  // portal: columnas, entablamento, arco y portón de madera
  var pw = 22, pX = cx - (pw >> 1), pTop = H - 42;
  F(g, pX - 8, portalTop + 4, pw + 16, 3, WHT); F(g, pX - 8, portalTop + 4, pw + 16, 1, '#ffffff'); AO(g, pX - 8, portalTop + 7, pw + 16, 3, 0.3);
  F(g, pX - 8, portalTop + 7, 4, H - portalTop - 13, WHT); F(g, pX + pw + 4, portalTop + 7, 4, H - portalTop - 13, WHS); F(g, pX - 8, portalTop + 7, 1, H - portalTop - 13, '#ffffff');
  DISC(g, cx, pTop + 11, 12, WHT); F(g, cx - 12, pTop + 11, 25, H - pTop - 17, WHT);
  DISC(g, cx, pTop + 11, 11, '#3a2a22'); F(g, cx - 11, pTop + 11, 23, H - pTop - 17, '#3a2a22');
  var WOOD = ['#3b2616', '#5e3a20', '#7A4A2B', '#946238', '#b07a48'];
  DISC(g, cx, pTop + 11, 10, WOOD[2]); F(g, cx - 10, pTop + 11, 21, H - pTop - 18, WOOD[2]);
  for (x = cx - 10; x <= cx + 10; x += 3) F(g, x, pTop + 4, 1, H - pTop - 10, WOOD[1]);
  F(g, cx, pTop + 1, 1, H - pTop - 7, WOOD[0]); F(g, cx - 10, pTop + 14, 21, 1, WOOD[0]); F(g, cx - 10, pTop + 26, 21, 1, WOOD[0]);
  for (y = pTop + 8; y < H - 10; y += 6) { P(g, cx - 6, y, '#e6c85a'); P(g, cx + 5, y, '#e6c85a'); }
  F(g, cx - 3, pTop + 20, 2, 2, '#e6c85a'); F(g, cx + 2, pTop + 20, 2, 2, '#e6c85a');
  F(g, cx - 10, pTop + 3, 21, 2, WOOD[3]);
  AO(g, cx - 10, pTop + 1, 21, 3, 0.4);
  F(g, cx - 14, H - 6, 29, 2, '#cfc5ae'); F(g, cx - 16, H - 4, 33, 2, '#bdb29a'); F(g, cx - 18, H - 2, 37, 2, '#a39a84');
  lite(c, cx, H - 24, pw, 34, 'local');
  // aguja con cruz
  var sBase = yBel - 3, sTop = ySpire, spW = tw - 6, CU = ['#3c5a4e', '#4c7060', '#6f9484', '#8fb4a2', '#b4d4c0'];
  for (y = sTop; y < sBase; y++) {
    var t = (y - sTop) / Math.max(1, sBase - sTop), half = Math.round(1 + t * (spW / 2 - 1));
    F(g, cx - half, y, half * 2 + 1, 1, CU[2]); F(g, cx - half, y, Math.max(1, half >> 1), 1, CU[3]); F(g, cx + half - (half >> 1), y, Math.max(1, half >> 1) + 1, 1, CU[1]);
    P(g, cx - half, y, CU[4]); P(g, cx + half, y, CU[0]);
    if ((y - sTop) % 5 === 4) F(g, cx - half, y, half * 2 + 1, 1, CU[1]);
  }
  F(g, cx - (spW >> 1) - 1, sBase, spW + 3, 2, CU[3]); AO(g, cx - (spW >> 1) - 1, sBase + 2, spW + 3, 1, 0.3);
  DISC(g, cx, sTop - 1, 1, '#e6c85a'); F(g, cx, yCross, 1, 6, '#e6c85a'); F(g, cx - 2, yCross + 2, 5, 1, '#e6c85a'); P(g, cx - 1, yCross + 2, '#fff0a0');
  lite(c, cx, sTop + 10, 6, 6, 'foco');
  return finish(c);
}
function iglesiaS(c) {                                             // vista de techo: nave en cruz, cupula y la torre de lado (pirámide)
  var g = c.g, W = c.W, H = c.H, cx = W >> 1, y, x, nW = clamp(Math.round(W * 0.26), 32, 52);
  roofSurf(c, 0, 0, W, H); parapetBack(g, W, H, CR); F(g, 0, H - 2, W, 2, CR[3]);
  tileRows(g, cx - nW, 10, nW * 2, H - 14, RT, 0); LI(g, cx - nW, 10, nW, H - 14, 0.12); AO(g, cx, 10, nW, H - 14, 0.2);
  F(g, cx - 1, 10, 2, H - 14, RT[4]);
  var ty = H >= 110 ? (H >> 1) - 12 : 24;
  tileRows(g, 10, ty, W - 20, 26, RT, 2); LI(g, 10, ty, W - 20, 13, 0.1); AO(g, 10, ty + 13, W - 20, 13, 0.2); F(g, 10, ty + 12, W - 20, 2, RT[4]);
  DISC(g, cx, ty + 13, 9, CR[3]); DISC(g, cx, ty + 13, 7, '#6f9484'); DISC(g, cx - 2, ty + 11, 3, '#8fb4a2'); F(g, cx, ty + 3, 1, 4, '#e6c85a'); F(g, cx - 1, ty + 4, 3, 1, '#e6c85a');
  AO(g, cx + 8, ty + 22, 12, 6, 0.3);
  return finish(c);
}
S.lotArch.mf_iglesia = function (f) { var c = mkCtx(f); return c.side === 'S' ? iglesiaS(c) : iglesiaN(c); };

/* ======================== MF_MUNI: Municipalidad (neocolonial, balcones de madera, banderas) ======================== */
function balcon(g, x, y, w, rnd) {                                 // balcon cajon de madera: tejadillo, vidrios arriba y celosia abajo
  var WDK = ['#3b2616', '#5e3a20', '#8a5a30', '#a8703a', '#c99458'], i;
  F(g, x - 2, y - 1, w + 4, 4, '#a8573a'); F(g, x - 2, y - 1, w + 4, 1, '#c98a5a'); F(g, x - 2, y + 2, w + 4, 1, '#6f3b2e');
  F(g, x, y + 3, w, 22, WDK[2]); F(g, x, y + 3, w, 1, WDK[4]); F(g, x, y + 3, 2, 22, WDK[3]); F(g, x + w - 2, y + 3, 2, 22, WDK[1]);
  F(g, x + 2, y + 5, w - 4, 9, GL[2]); F(g, x + 2, y + 5, w - 4, 3, GL[1]);
  for (i = x + 2 + 6; i < x + w - 3; i += 6) F(g, i, y + 5, 1, 9, WDK[1]);
  P(g, x + 4, y + 12, GL[3]); P(g, x + 5, y + 11, GL[3]); P(g, x + 6, y + 10, GL[3]);
  F(g, x + 2, y + 14, w - 4, 1, WDK[4]);
  for (i = x + 3; i < x + w - 3; i += 2) F(g, i, y + 15, 1, 8, (i & 2) ? WDK[1] : WDK[3]);
  F(g, x, y + 24, w, 2, WDK[1]); F(g, x - 1, y + 26, w + 2, 2, WDK[0]); AO(g, x - 1, y + 28, w + 2, 2, 0.35);
}
function muniN(c) {
  var g = c.g, W = c.W, H = c.H, rnd = c.rnd, cx = W >> 1, i, j, x, y;
  faceOf(c, c.rows - 2);
  var gT = c.gTop, fy = c.faceY, nUp = Math.max(1, c.nUp), WH = ramp('#E8DCB8'), RTM = ['#4a2a2a', '#7a3b2e', '#a8573a', '#c98a5a', '#e0b080'];
  // techo de cuatro aguas
  if (fy > 4) {
    tileRows(g, 0, 0, W, fy, RTM, 0);
    var hip = Math.min(24, fy + 6);
    for (y = 0; y < fy; y++) { var hx = Math.round((fy - 1 - y) * hip / Math.max(1, fy - 1)); if (hx > 0) { LI(g, 0, y, hx, 1, 0.12); AO(g, W - hx, y, hx, 1, 0.2); } }
    g.line(0, fy - 1, hip, 1, RTM[4]); g.line(W - 1, fy - 1, W - 1 - hip, 1, RTM[1]); F(g, hip, 0, W - hip * 2, 2, RTM[4]);
    AO(g, 0, fy - 4, W, 4, 0.2);
  }
  wallFill(g, 0, fy, W, H - fy, WH, rnd, 32);
  F(g, 0, fy, 2, H - fy, WH[4]); F(g, W - 2, fy, 2, H - fy, WH[1]);
  // balaustrada superior
  F(g, 0, fy, W, 2, '#ffffff'); F(g, 0, fy + 2, W, 5, WH[3]);
  for (x = 1; x < W - 1; x += 4) { F(g, x, fy + 2, 2, 5, '#f6f0e0'); P(g, x + 1, fy + 3, WH[1]); }
  F(g, 0, fy + 7, W, 2, '#f6f0e0'); AO(g, 0, fy + 9, W, 3, 0.3);
  // frontón central con reloj y bandera
  var pwid = Math.min(48, W - 40), pH = 14, pb = fy + 1;
  for (j = 0; j < pH; j++) { var half = Math.round((pwid / 2) * (1 - j / pH)); F(g, cx - half, pb - j, half * 2 + 1, 1, WH[3]); P(g, cx - half, pb - j, '#ffffff'); P(g, cx + half, pb - j, WH[1]); }
  F(g, cx - (pwid >> 1) - 1, pb, pwid + 3, 2, '#ffffff'); DISC(g, cx, pb - 5, 5, K); DISC(g, cx, pb - 5, 4, '#fbf6e6'); F(g, cx, pb - 8, 1, 3, K); F(g, cx, pb - 5, 3, 1, K);
  F(g, cx, pb - pH - 9, 1, 10, '#8c8a93'); P(g, cx, pb - pH - 10, '#e6c85a'); flagPE(g, cx + 1, pb - pH - 9, 10, 6, true);
  // pisos altos: balcones de madera + ventanas
  var yt, nb = Math.max(2, Math.round(W / 56)), bw = 26;
  for (var k = 1; k <= nUp; k++) {
    yt = gT - 32 * k; slab(g, yt, W, WH);
    for (i = 0; i < nb; i++) {
      var bcx = Math.round((i + 0.5) * W / nb), big = (nb % 2 === 1 && i === (nb >> 1)), ww = big ? 34 : bw;
      balcon(g, bcx - (ww >> 1), yt + 4, ww, rnd);
    }
    for (i = 0; i <= nb; i++) {
      var wcx = i === 0 ? 12 : (i === nb ? W - 12 : Math.round(i * W / nb));
      glassWin(g, wcx - 7, yt + 6, 14, 18, { frame: '#ffffff', shutter: '#5e3a20', lit: rnd() < 0.2 });
    }
  }
  slab(g, gT, W, WH);
  // placa del nombre en la cornisa del arco
  var nm = (c.f.name ? String(c.f.name) : 'MUNICIPALIDAD DE MIRAFLORES').toUpperCase();
  var plw = Math.min(W - 40, 190), plx = cx - (plw >> 1);
  F(g, plx - 1, gT + 2, plw + 2, 12, K); F(g, plx, gT + 3, plw, 10, '#1f4d3a'); F(g, plx, gT + 3, plw, 1, '#2f6a50');
  fitTxt(g, nm, plx + 2, gT + 3, plw - 4, 10, '#e6c85a', { shadow: '#0f2a1f', max: 'a7' });
  // arcada de planta baja
  var nbays = Math.max(3, Math.floor((W - 8) / 36)); if (nbays % 2 === 0) nbays--;
  var bwid = (W - 8) / nbays, colw = 7;
  F(g, 2, gT + 14, W - 4, 34, '#2a2024');
  for (i = 0; i < nbays; i++) {
    var bx = Math.round(4 + i * bwid), ow = Math.round(bwid) - colw, ox2 = bx + (colw >> 1), arc = ow >> 1, ytop = gT + 14, isC = (i === (nbays >> 1));
    DISC(g, ox2 + arc, ytop + arc, arc + 1, '#f6f0e0'); F(g, ox2 - 1, ytop + arc, ow + 2, 34 - arc, '#f6f0e0');
    DISC(g, ox2 + arc, ytop + arc, arc, '#241a1c'); F(g, ox2, ytop + arc, ow, 34 - arc, '#241a1c');
    if (isC) {                                                      // entrada: puerta de madera y vidrio con luz
      vgrad(g, ox2 + 2, ytop + arc + 2, ow - 4, 34 - arc - 6, WARM);
      F(g, ox2 + (ow >> 1), ytop + arc + 2, 1, 34 - arc - 6, '#3a2a22'); F(g, ox2 + 2, ytop + arc + 14, ow - 4, 1, '#3a2a22');
      F(g, ox2 - 3, H - 6, ow + 6, 2, '#cfc5ae'); F(g, ox2 - 5, H - 4, ow + 10, 2, '#bdb29a'); F(g, ox2 - 7, H - 2, ow + 14, 2, '#a39a84');
      lite(c, ox2 + arc, ytop + 22, ow, 30, 'local');
    } else {
      vgrad(g, ox2 + 1, ytop + arc + 1, ow - 2, 34 - arc - 8, i % 2 ? WARM : ['#1c1a22', '#241c22', '#2a2024', '#3a2a28']);
      for (x = ox2 + 2; x < ox2 + ow - 1; x += 4) F(g, x, ytop + arc + 1, 1, 34 - arc - 8, '#141216');
      F(g, ox2, H - 8, ow, 2, '#3a3846');
      if (i % 2) lite(c, ox2 + arc, ytop + 24, ow, 26, 'local');
    }
    if (i < nbays) { var cxx = Math.round(4 + (i + 1) * bwid) - (colw >> 1) - (i === nbays - 1 ? 3 : 0); if (i < nbays - 1) { F(g, cxx, ytop - 1, colw, 35, '#efe7d4'); F(g, cxx, ytop - 1, 1, 35, '#ffffff'); F(g, cxx + colw - 1, ytop - 1, 1, 35, WHS); F(g, cxx - 1, ytop - 1, colw + 2, 2, '#ffffff'); F(g, cxx - 1, H - 8, colw + 2, 2, WHS); } }
  }
  F(g, 2, H - 6, W - 4, 6, WH[1]); F(g, 2, H - 6, W - 4, 1, WH[3]);
  F(g, 0, gT, 2, 48, WH[4]); F(g, W - 2, gT, 2, 48, WH[1]);
  // capa alta: mástiles con banderas delante de la fachada
  var oy0 = Math.max(0, fy - 12), go = mkOver(c, 0, oy0, W, H + 10 - oy0);
  [[cx - 58, 'pe'], [cx + 58, 'muni']].forEach(function (p) {
    var px0 = p[0], y1 = H + 6 - c.oy, top = 2;
    F(go, px0, top, 1, y1 - top, '#8c8a93'); F(go, px0, top, 1, y1 - top, '#a4abaa'); P(go, px0, top - 1, '#e6c85a'); F(go, px0 + 1, y1 - 2, 3, 2, '#5c6570'); F(go, px0 - 2, y1, 5, 2, '#a39a84');
    if (p[1] === 'pe') flagPE(go, px0 + 1, top + 1, 22, 13, true);
    else { for (var ii = 0; ii < 22; ii++) { var dy = Math.round(Math.sin(ii * 0.5)); F(go, px0 + 1 + ii, top + 1 + dy, 1, 13, '#f6f0e0'); } F(go, px0 + 8, top + 5, 7, 6, '#3f72b0'); F(go, px0 + 9, top + 6, 5, 4, '#e6c85a'); F(go, px0 + 1, top + 1, 22, 1, '#3f72b0'); F(go, px0 + 1, top + 13, 22, 1, '#3f72b0'); }
  });
  return finish(c);
}
function muniS(c) {
  var g = c.g, W = c.W, H = c.H, WH = ramp('#E8DCB8'), RTM = ['#4a2a2a', '#7a3b2e', '#a8573a', '#c98a5a', '#e0b080'], i, ring = 18;
  tileRows(g, 0, 0, W, H, RTM, 0); AO(g, 0, 0, W, H, 0.04);
  LI(g, 0, 0, W, ring, 0.1); AO(g, 0, H - ring, W, ring, 0.14); LI(g, 0, 0, ring, H, 0.08); AO(g, W - ring, 0, ring, H, 0.18);
  parapetBack(g, W, H, WH); F(g, 0, H - 2, W, 2, WH[3]);
  var px0 = ring + 4, py0 = ring + 2, pw = W - ring * 2 - 8, ph = H - ring * 2 - 4;
  if (pw > 20 && ph > 20) {                                          // patio interior con fuente y arcos
    F(g, px0 - 2, py0 - 2, pw + 4, ph + 4, WH[3]); F(g, px0, py0, pw, ph, '#c9b8a3');
    for (i = 0; i < pw; i += 4) for (var j = (i / 4 & 1) * 4; j < ph; j += 8) F(g, px0 + i, py0 + j, 4, 4, '#bfae98');
    for (i = px0 + 4; i < px0 + pw - 4; i += 14) { DISC(g, i, py0 + 4, 2, WH[2]); DISC(g, i, py0 + ph - 5, 2, WH[2]); }
    var fx = px0 + (pw >> 1), fy2 = py0 + (ph >> 1);
    DISC(g, fx, fy2, 8, '#a39a84'); DISC(g, fx, fy2, 7, '#6fb0c8'); DISC(g, fx, fy2, 3, '#a39a84'); DISC(g, fx, fy2, 1, '#d6f0f8');
  }
  [[6, 6], [W - 8, 6]].forEach(function (p) { F(g, p[0], p[1], 2, 2, '#ff4040'); });
  return finish(c);
}
S.lotArch.mf_muni = function (f) { var c = mkCtx(f); return c.side === 'S' ? muniS(c) : muniN(c); };

/* ======================== MF_PIZZERIA: Calle de las Pizzas ======================== */
/* Lado S: lote a un costado de la calle peatonal (la calle queda hacia `dir`).  Se ve el techo, el canto verde de la fachada con sus columnas rojiblancas,
   los toldos marrones y las cortinas de luces que cuelgan sobre la calle (capa alta). */
var PIZ_NAMES = ['NAPOLI', 'TRATTORIA', 'MAMMA MIA', 'PIZZA FRESCA', 'DOLCE VITA', 'LA BELLA', 'VINO & PIZZA', 'IL FORNO'];
function pizzeriaS(c) {
  var f = c.f, g = c.g, W = c.W, H = c.H, rnd = c.rnd, r2 = c.r2, E = (f.dir || (f.c1 < 100 ? 'E' : 'W')) === 'E';
  var GRN = ramp('#2f7a43'), BR1 = '#6b4223', BR2 = '#8a5a2f', i, j;
  function X(x, w) { return E ? x : W - x - (w || 1); }              // espejo horizontal de un rectangulo
  function R(x, y, w, h, col) { F(g, X(x, w), y, w, h, col); }
  roofSurf(c, 0, 0, W, H);
  R(0, 0, 3, H, GRN[3]); F(g, 0, 0, W, 2, GRN[3]); F(g, 0, H - 2, W, 2, GRN[3]); AO(g, 0, 2, W, 2, 0.3);   // borde exterior
  var cw = 9, n = Math.max(1, Math.round(H / 82)), uh = H / n, names = f.names || PIZ_NAMES, go;
  // canto verde de la fachada (lado de la calle)
  R(W - cw, 0, cw, H, GRN[2]);
  for (i = 0; i < H * cw / 14; i++) { var lx = W - cw + (r2() * cw | 0), ly = (r2() * H) | 0; F(g, X(lx, 1), ly, 1, 1, r2() < 0.5 ? GRN[1] : GRN[3]); }
  R(W - cw, 0, 1, H, GRN[3]); R(W - 2, 0, 2, H, GRN[0]);
  for (i = 0; i < n; i++) {
    var y0 = Math.round(i * uh), y1 = Math.round((i + 1) * uh), mid = (y0 + y1) >> 1, ur = px.rng(c.seed * 31 + i * 17 + 3);
    // puerta y ventanas del canto, con luz tibia
    R(W - 7, mid - 7, 5, 14, '#3a2a22'); R(W - 6, mid - 6, 3, 12, '#c98a4a'); R(W - 6, mid - 6, 3, 3, '#e8b46a');
    R(W - 6, y0 + 7, 4, 9, '#2a2024'); R(W - 5, y0 + 8, 2, 7, '#a8693a'); R(W - 6, y1 - 16, 4, 9, '#2a2024'); R(W - 5, y1 - 15, 2, 7, '#a8693a');
    // plantas colgantes (manchas verdes oscuras y claras)
    for (j = 0; j < 4; j++) { var py = y0 + 12 + ((ur() * (y1 - y0 - 24)) | 0); R(W - cw + 1 + ((ur() * 4) | 0), py, 3, 4 + ((ur() * 4) | 0), j & 1 ? '#1f5a2a' : '#4aa84c'); }
    // columnas rojiblancas en los limites de cada local
    var yb = i === 0 ? y0 + 16 : y0 + 4;
    candyColS(g, X(W - 8, 6), yb - 18, 20, 6);
    if (i === n - 1) candyColS(g, X(W - 8, 6), y1 - 3, 20, 6);
    // techo del local: letrero que mira a la camara + plantas en maceta
    var nm = names[(c.seed + i * 3) % names.length], bwid = Math.min(W - cw - 16, 56), bx = Math.max(6, W - cw - bwid - 6 - ((ur() * 8) | 0)), by = y0 + 10 + ((ur() * 6) | 0);
    if (W - cw >= 36) {
      var sx = E ? bx : W - bx - bwid;
      AO(g, sx + 5, by + 14, bwid, 5, 0.3);
      F(g, sx + 6, by + 12, 2, 5, '#5c6570'); F(g, sx + bwid - 8, by + 12, 2, 5, '#5c6570');
      F(g, sx - 1, by - 1, bwid + 2, 14, K); F(g, sx, by, bwid, 12, '#4a2a18'); F(g, sx, by, bwid, 1, '#7a5232'); FR(g, sx + 1, by + 1, bwid - 2, 10, '#c9a66b');
      fitTxt(g, nm, sx + 2, by + 1, bwid - 4, 10, '#f3efe2', { shadow: '#2a1810', max: 'a7' });
      lite(c, sx + (bwid >> 1), by + 16, 0, 0, 'foco');
    }
    for (j = 0; j < 3; j++) {                                        // macetas verdes sobre la azotea
      var mxx = 8 + ((ur() * Math.max(1, W - cw - 24)) | 0), myy = by + 22 + ((ur() * Math.max(1, y1 - y0 - 40)) | 0);
      if (myy > y1 - 8) continue;
      var gx = E ? mxx : W - mxx - 9; F(g, gx + 2, myy + 3, 5, 3, '#8a4b38'); DISC(g, gx + 4, myy + 1, 3, '#2f7a43'); P(g, gx + 3, myy, '#4aa84c'); P(g, gx + 5, myy + 2, '#1f5a2a');
    }
  }
  // capa alta: toldos marrones + cortinas de luces sobre la calle
  var ow = 52, oxl = E ? W - 14 : -(ow - 14);
  go = mkOver(c, oxl, 0, ow, H);
  function O(x, y, w, h, col) { var xx = E ? x : ow - x - w; F(go, xx, y, w, h, col); }          // x relativo al canto (0 = borde del lote), hacia la calle
  for (i = 0; i < n; i++) {
    var u0 = Math.round(i * uh), u1 = Math.round((i + 1) * uh), ay0 = u0 + 5, ay1 = u1 - 5, ah = ay1 - ay0, awd = 15;
    for (var yy2 = ay0; yy2 < ay1; yy2++) {                          // tela a franjas (perpendiculares a la calle), mas clara junto a la pared
      var pj = (((yy2 - ay0) / 5) | 0) & 1, base = pj ? BR2 : BR1;
      O(14, yy2, awd, 1, base); O(14, yy2, 3, 1, lt(base, 0.18)); O(14 + awd - 3, yy2, 3, 1, dk(base, 0.22));
      if (((yy2 - ay0) % 5) === 0) O(14, yy2, awd, 1, lt(base, 0.12));
    }
    for (j = ay0; j < ay1; j += 5) { O(14 + awd, j, 2, 4, BR1); O(14 + awd + 2, j + 1, 1, 3, dk(BR1, 0.3)); }
    O(14, ay0, awd, 1, lt(BR2, 0.3)); O(14, ay1 - 1, awd, 1, dk(BR1, 0.3));
    O(14 + awd + 3, ay0 + 2, 3, ah - 2, "#2a244040");
    // cortina de luces
    var lcx = 14 + awd + 1;
    for (j = ay0 + 1; j < ay1 - 1; j += 3) {
      for (var d = 0; d < 20; d += 3) {
        var len = 5 + ((r2() * 9) | 0), xp = lcx + d + (j % 2 ? 1 : 0);
        if (xp > ow - 2) continue;
        var cx0 = E ? xp : ow - xp - 1;
        for (var q = 0; q < len; q++) P(go, cx0, j + q, (q % 3 === 2) ? "#ffe2b0" : "#8a7a60");
        F(go, cx0, j + len, 1, 2, ["#fff4d8", "#ffcf8a", "#ffe9c0"][(r2() * 3) | 0]);
      }
    }
    lite(c, E ? W + 18 : -18, (u0 + u1) >> 1, 0, 0, 'foco');
  }
  return finish(c);
}
function candyColS(g, x, y, h, w) { candyCol(g, x, y, h, w); }
function pizzeriaN(c) {                                            // lado N: fachada completa (verde, columnas rojiblancas, toldo marron, cortina de luces)
  var f = c.f, GRN = ramp('#2f7a43'), name = (f.name ? String(f.name) : 'PIZZERÍA').toUpperCase();
  var sp = {
    A: GRN, PA: GRN, win: 'std', wf: '#f3efe2', shutter: '#6b4223', lit: 0.35, shop: 'cafe', vf: '#3a2a22', vb: '#4a2a18', df: '#3a2a22', band: '#4a2a18', doorW: 16, awnW: 0,
    logo: genLogo({ bg: '#4a2a18', ink: '#f3efe2', text: name, border: '#c9a66b', sh: '#2a1810', max: 'a7' }),
    awn: ['#6b4223', '#8a5a2f', '#4a2a18'], awnKind: 'stripe', awnAll: true, umb: ['#6b4223', '#f3efe2'],
    col: function (c, x, w) { candyCol(c.g, x + 1, c.gTop + 4, 38, w - 2); },
    extras: function (c, bays, go) {
      var W = c.W, y = c.gTop + 14 - c.oy + 11, r = c.r2;
      lightCurtain(go, 8, y, W - 16, 20, r, false);
      lite(c, W >> 2, c.gTop + 30, 0, 0, 'foco'); lite(c, (W * 3) >> 2, c.gTop + 30, 0, 0, 'foco');
    }
  };
  sp.col = sp.col;                                                  // columnas en los extremos (layoutBays las pide por sp.col)
  return storeN(c, sp);
}
S.lotArch.mf_pizzeria = function (f) { var c = mkCtx(f); return c.side === 'S' ? pizzeriaS(c) : pizzeriaN(c); };

/* ======================== MF_BANOS: baños publicos ======================== */
function figura(g, cx, y, dama, col) {                             // pictograma de DAMAS / CABALLEROS (blanco sobre placa de color)
  DISC(g, cx, y + 2, 2, '#ffffff');
  if (dama) { for (var j = 0; j < 7; j++) F(g, cx - 1 - (j >> 1), y + 5 + j, 3 + (j >> 1) * 2, 1, '#ffffff'); F(g, cx - 1, y + 12, 1, 2, '#ffffff'); F(g, cx + 1, y + 12, 1, 2, '#ffffff'); }
  else { F(g, cx - 2, y + 5, 5, 6, '#ffffff'); F(g, cx - 3, y + 5, 1, 5, '#ffffff'); F(g, cx + 3, y + 5, 1, 5, '#ffffff'); F(g, cx - 2, y + 11, 2, 4, '#ffffff'); F(g, cx + 1, y + 11, 2, 4, '#ffffff'); }
}
function banosN(c) {
  var g = c.g, W = c.W, H = c.H, rnd = c.rnd, ST = ramp('#cfc5ae'), GR = ramp('#1f6a4a'), x, i;
  faceOf(c, 3);
  var fy = c.faceY, gT = c.gTop;
  roofN(c, ST, null, { roofItems: ['stairbox'] });
  if (fy >= 14) {                                                    // ventilas y claraboya
    for (i = 0; i < 2; i++) { var vx = 14 + i * Math.max(18, (W - 40)), vy = Math.min(fy - 12, 18 + ((rnd() * 8) | 0)); F(g, vx, vy - 9, 3, 9, '#d6d1b8'); F(g, vx, vy - 9, 1, 9, '#efebdc'); F(g, vx - 1, vy - 11, 5, 2, '#d6d1b8'); AO(g, vx + 3, vy, 6, 3, 0.3); }
  }
  wallFill(g, 0, fy, W, H - fy, ST, rnd, 30);
  F(g, 0, fy, 2, H - fy, ST[3]); F(g, W - 3, fy, 3, H - fy, ST[1]); F(g, 0, fy, W, 2, ST[4]); AO(g, 0, fy + 2, W, 2, 0.3);
  // franja verde municipal con el nombre
  var bh = 14, by = H - 48 + 4;
  F(g, 0, by, W, bh, GR[2]); F(g, 0, by, W, 1, GR[4]); F(g, 0, by + bh - 1, W, 1, GR[0]);
  var nm = (c.f.name ? String(c.f.name) : 'BAÑOS PÚBLICOS').toUpperCase();
  fitTxt(g, nm, 3, by + 1, W - 6, bh - 2, '#ffffff', { shadow: GR[0], max: 'a7' });
  lite(c, W >> 1, by + bh + 2, 0, 0, 'foco');
  // dos puertas metalicas con pictograma
  var dw = 16, dh = 28, dy = H - dh, gx = Math.max(4, (W - dw * 2) / 3);
  [[0, true, '#d98a9e'], [1, false, '#3f72b0']].forEach(function (d) {
    var dx = Math.round(gx + d[0] * (dw + gx));
    F(g, dx - 1, dy - 1, dw + 2, dh + 1, K); F(g, dx, dy, dw, dh, '#5c7a80'); F(g, dx, dy, dw, 1, '#8fb0b8'); F(g, dx, dy, 1, dh, '#7a98a0');
    for (i = 2; i < 9; i += 2) F(g, dx + 2, dy + i, dw - 4, 1, '#3f5a60');                  // celosia
    F(g, dx + dw - 4, dy + 15, 1, 3, '#d6d1b8');
    F(g, dx + 2, dy + 11, dw - 4, 12, d[2]); figura(g, dx + (dw >> 1), dy + 12, d[1], d[2]);
    F(g, dx - 1, H - 2, dw + 2, 2, '#a9a79b'); lite(c, dx + (dw >> 1), dy + 14, dw, dh, 'local');
  });
  F(g, 0, H - 6, 3, 6, ST[1]); F(g, W - 3, H - 6, 3, 6, ST[1]); AO(g, 0, H - 4, W, 4, 0.18);
  return finish(c);
}
function banosS(c) {
  var g = c.g, W = c.W, H = c.H, ST = ramp('#cfc5ae'), GR = ramp('#1f6a4a');
  roofSurf(c, 0, 0, W, H); parapetBack(g, W, H, ST); F(g, 0, H - 2, W, 2, ST[3]);
  var ty = Math.max(8, H - 22);
  for (var i = 0; i < 2; i++) { var vx = 10 + i * Math.max(16, W - 32), vy = clamp(14 + i * 8, 14, H - 8); F(g, vx, vy - 9, 3, 9, '#d6d1b8'); F(g, vx, vy - 9, 1, 9, '#efebdc'); F(g, vx - 1, vy - 11, 5, 2, '#d6d1b8'); AO(g, vx + 3, vy, 6, 3, 0.3); }
  if (W >= 40 && H >= 36) { var sx = (W >> 1) - 10, sy = H - 22; F(g, sx, sy, 20, 12, '#5c6570'); F(g, sx + 1, sy + 1, 18, 10, '#8fb0b8'); g.line(sx + 3, sy + 9, sx + 9, sy + 2, '#cfe8e0'); FR(g, sx, sy, 20, 12, '#a4abaa'); AO(g, sx + 4, sy + 12, 20, 3, 0.3); }
  if (H >= 44 && W >= 50) {
    var bw = Math.min(W - 24, 50), bx = (W - bw) >> 1, by = 10;
    AO(g, bx + 5, by + 14, bw, 5, 0.3); F(g, bx + 6, by + 12, 2, 5, '#5c6570'); F(g, bx + bw - 8, by + 12, 2, 5, '#5c6570');
    F(g, bx - 1, by - 1, bw + 2, 14, K); F(g, bx, by, bw, 12, GR[2]); F(g, bx, by, bw, 1, GR[4]);
    fitTxt(g, 'BAÑOS', bx + 2, by + 1, bw - 4, 10, '#ffffff', { shadow: GR[0], max: 'a7' });
  }
  return finish(c);
}
S.lotArch.mf_banos = function (f) { var c = mkCtx(f); return c.side === 'S' ? banosS(c) : banosN(c); };
})();
