/* ACHORADO - sprites.js
 * Construye todos los sprites y tiles (pixel art) al cargar y los deja en ACH.sprites.
 * Script clasico, sin modulos. Funciona desde file://.
 * Contrato: ver SPEC.md ("Contrato de sprites").
 */
(function () {
"use strict";
window.ACH = window.ACH || {};

/* ======================== PIXEL ENGINE (portado del cuaderno) ======================== */
const P = {
  k:'#141216', skin:'#a8714c', skinD:'#80523a', hair:'#34261f', eye:'#141414',
  blue:'#1f2f66', white:'#e6e6e0', shorts:'#5d6150', shortsD:'#464a3c',
  sandal:'#5e3f27', wood:'#a86e38', woodD:'#6b4223', head:'#3a2a1e', metal:'#c9c9be', tape:'#cbbf98', strap:'#3b2b21',
  mouth:'#2a1515',
  pg:'#8e939b', pgD:'#5d6168', pgL:'#b6bac0', irG:'#3f9a7c', irP:'#8a5aa6', beak:'#3b3436', cere:'#ece7de', peye:'#e07a2a',
  zs:'#93a083', zsD:'#5f6b55', zeye:'#e9ecd5', blood:'#5b1d1d',
  skinL:'#c48f63', face:'#c48f63', faceL:'#dcae80', zsL:'#b4be9a', rimHi:'#d5dbe0', rimLo:'#9fb0c4'   // piel luz (rampa 5.2) y luz de borde fria (cielo de garua)
};

/* La clase G (rejilla de pixeles) vive ahora en js/sprites/base.js -> ACH.px.G (misma API, mas toCanvas rapido). */
const G = ACH.px.G;

/* G -> canvas, con ancla y huella opcionales */
/* G -> canvas por ImageData (identico a G.toCanvas pero sin un fillRect por pixel: hornear los juegos de daño de Alexander cuesta 4x menos).
   Si algun color no es hex (#rgb/#rrggbb/#rrggbbaa) cae al toCanvas de base.js. */
const RGBA = {};
function rgbaOf(c) {
  let r = RGBA[c];
  if (r === undefined) {
    r = null;
    if (typeof c === 'string' && c.charAt(0) === '#' && (c.length === 7 || c.length === 9)) {
      r = [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16), c.length === 9 ? parseInt(c.substr(7, 2), 16) : 255];
      if (isNaN(r[0] + r[1] + r[2] + r[3])) r = null;
    }
    RGBA[c] = r;
  }
  return r;
}
function mkC(g, ax, ay, fw, fh) {
  const w = g.w, h = g.h, d = g.d, n = w * h;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(w, h), buf = img.data;
  for (let i = 0; i < n; i++) {
    const col = d[i];
    if (!col) continue;
    const q = rgbaOf(col);
    if (!q) return g.toCanvas(ax, ay, fw, fh);
    const o = i * 4; buf[o] = q[0]; buf[o + 1] = q[1]; buf[o + 2] = q[2]; buf[o + 3] = q[3];
  }
  ctx.putImageData(img, 0, 0);
  if (ax !== undefined) { cv.ax = ax; cv.ay = ay; }
  if (fw !== undefined) { cv.fw = fw; cv.fh = fh; }
  return cv;
}
function flipC(g, ax, ay) { return mkC(g.flip(), g.w - 1 - ax, ay); }
/* Contorno + luz de borde (P8): 1 px frio en los bordes arriba/izquierda (el cielo de garua entra por el noroeste). Solo recolorea pixeles
   del contorno que ya existen: el tamano, el ancla y la huella no cambian. Mas claro en cabeza y hombros, mas tenue abajo. */
function outlineRim(g) {
  g.outline();
  const K = P.k, h = g.h;
  const body = (x, y) => { const c = g.get(x, y); return c && c !== K; };
  const edits = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < g.w; x++) {
    if (g.get(x, y) !== K) continue;
    const top = !g.get(x, y - 1) && body(x, y + 1), left = !g.get(x - 1, y) && body(x + 1, y);
    if (top || left) edits.push([x, y, y < h * 0.5 ? P.rimHi : P.rimLo]);
  }
  edits.forEach(e => g.set(e[0], e[1], e[2]));
  return g;
}

/* utilidades */
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hex2rgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
function rgb2hex(a) { return '#' + a.map(v => ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2)).join(''); }
function shade(h, f) { return rgb2hex(hex2rgb(h).map(v => v * f)); }
function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v + (B[i] - v) * t)); }

function stripes(g, x0, y0, w, h) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const x = x0 + i; g.set(x, y0 + j, ((x >> 1) % 2) ? P.white : P.blue); }
}
function titinaMini(g, x, y, right, peck) {
  peck = peck || 0;
  const p = (dx, dy, c) => g.set(right ? x + 5 - dx : x + dx, y + dy, c);
  p(1, peck, P.pg); p(2, peck, P.pg); p(1, 1 + peck, P.pg); p(2, 1 + peck, P.pg);
  p(0, 1 + peck, P.beak); p(1, peck, P.peye);
  p(1, 2, P.irP); p(2, 2, P.irG); p(3, 2, P.pg); p(4, 2, P.pg);
  p(1, 3, P.pg); p(2, 3, P.pg); p(3, 3, P.pgD); p(4, 3, P.pg); p(5, 3, P.pgD);
}
function spark(g, pts) {
  const cols = ['#fff6c8', '#ffe36b'];
  pts.forEach((q, i) => g.set(q[0], q[1], cols[i % 2]));
}

/* ======================== ALEXANDER ======================== */
/* v0.8 (G3): la guitarra se gasta. GD = nivel de daño con que se esta horneando la guitarra (0 sana, 1 rajada, 2 muy rajada, 3 sin guitarra).
   Toda guitarra se dibuja sana sobre una rejilla aparte `t` y gtrBlit() le aplica el daño (en un marco local: a = a lo largo del mastil hacia el clavijero,
   p = a lo ancho) antes de pegarla. Asi las cuatro vistas (frente, espalda, costado, mano, suelo) comparten el mismo codigo de daño. */
let GD = 0;
const GCR = '#2a1810', GCRL = '#e2b078', GSPL = '#f0cc94', TAPE2 = '#a89c72', STR = '#ece8d4', STR2 = '#9a9686';
function gtrDamage(t, geo, lvl) {
  const occ = t.d.map(v => !!v), rb = geo.rb, sd = geo.side || 1;
  let dx = geo.hx - geo.bx, dy = geo.hy - geo.by;
  const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
  const qx = -dy, qy = dx;
  const W = (a, p) => [Math.round(geo.bx + a * dx + p * qx), Math.round(geo.by + a * dy + p * qy)];
  const on = (x, y) => x >= 0 && y >= 0 && x < t.w && y < t.h && occ[y * t.w + x];
  const paint = (a, p, c) => { const q = W(a, p); if (on(q[0], q[1])) t.set(q[0], q[1], c); };
  const dot = (a, p, c) => { const q = W(a, p); t.set(q[0], q[1], c); };                    // sin mascara: piezas que salen de la silueta
  const poly = (pts, c) => {                                                               // linea quebrada, solo sobre pixeles de guitarra
    const m = new G(t.w, t.h);
    for (let i = 0; i + 1 < pts.length; i++) { const A = W(pts[i][0], pts[i][1]), B = W(pts[i + 1][0], pts[i + 1][1]); m.line(A[0], A[1], B[0], B[1], c); }
    for (let i = 0; i < m.d.length; i++) if (m.d[i] && occ[i]) t.d[i] = c;
  };
  const lit = (a, p) => { const A = W(a, p + 1), B = W(a, p - 1); return (A[0] + A[1] < B[0] + B[1]) ? p + 1 : p - 1; };   // lado de la luz NW
  const edgeCut = (a, s) => { for (let p = rb + 2; p > 0; p -= 0.5) { const q = W(a, s * p); if (on(q[0], q[1])) { t.set(q[0], q[1], null); occ[q[1] * t.w + q[0]] = false; return q; } } return null; };
  const edgeAt = (a, s) => { for (let p = rb + 2; p > 0; p -= 0.5) { const q = W(a, s * p); if (on(q[0], q[1])) return p; } return rb; };
  const neckA = rb + 3.4;
  // fisura principal: del borde de la caja, en diagonal sobre la boca, hasta el cuello (con labio claro del lado de la luz)
  const crack = [[-rb * 0.9, sd * rb * 0.85], [-rb * 0.35, sd * rb * 0.3], [rb * 0.15, -sd * 0.3], [rb * 0.75, -sd * rb * 0.55], [rb * 1.2, -sd * rb * 0.7]];
  poly(crack, GCR);
  crack.slice(1, 4).forEach(q => paint(q[0], lit(q[0], q[1]), GCRL));
  if (lvl === 1) {
    paint(-rb * 0.35, sd * (rb * 0.3 + 1), GCR); paint(rb * 0.15, -sd * 1.3, GCR); paint(-rb * 0.9, sd * (rb * 0.85 - 1), GCR); paint(rb * 0.75, -sd * (rb * 0.55 + 1), GCR);   // QA v0.8: fisura de 2 px, se lee a 1x
    crack.forEach(q => paint(q[0], lit(q[0], q[1]) * 1.6, GCRL));
    poly([[-rb * 0.35, sd * rb * 0.3], [-rb * 0.85, -sd * 0.4]], GCR);                    // ramalito
    const e = edgeCut(-rb * 0.1, sd), e2 = edgeCut(-rb * 0.1 - 1, sd);                    // astilla: el borde descascarado
    if (e) { paint(-rb * 0.1 - 1, sd * (edgeAt(-rb * 0.1 - 1, sd) - 1), GCR); paint(-rb * 0.1 + 1, sd * (edgeAt(-rb * 0.1 + 1, sd) - 1), GSPL); }
    paint(neckA, -0.5, GCR); paint(neckA + 1, 0.5, GCRL); paint(neckA + 1, -0.5, GCR); paint(neckA - 1.2, 0.5, GCR); paint(neckA - 1.2, -0.5, GCRL);   // rajita larga en el mastil
    dot(neckA + 0.4, sd * 1.9, GSPL);                                                       // una astilla asomando
    return;
  }
  // nivel 2: muy rajada. Fisura gruesa y ramificada, caja partida con cinta, mastil quebrado (el clavijero cuelga torcido) y cuerdas reventadas.
  paint(-rb * 0.35, sd * (rb * 0.3 + 1), GCR); paint(rb * 0.15, -sd * 1.3, GCR); paint(-rb * 0.9, sd * (rb * 0.85 - 1), GCR);   // espesor
  poly([[-rb * 0.35, sd * rb * 0.3], [-rb * 0.8, -sd * 0.6], [-rb * 1.0, -sd * 1.8]], GCR);   // ramal bajo
  poly([[rb * 0.15, -sd * 0.3], [rb * 0.6, sd * 1.2], [rb * 0.4, sd * 2.2]], GCR);            // ramal alto
  edgeCut(-rb * 0.25, sd); edgeCut(rb * 0.4, -sd); edgeCut(-rb * 0.8, -sd);                   // mordiscos: el borde roto
  const pc = W(-rb * 0.35, sd * rb * 0.3 + 0.0); if (on(pc[0], pc[1])) t.set(pc[0], pc[1], null);   // el tajo se abre: se ve a traves
  // cinta cruzando la grieta (dos filas, una clara y una oscura)
  [[rb * 0.45, P.tape], [rb * 0.45 - 1, TAPE2]].forEach(r => poly([[r[0], -rb], [r[0], rb]], r[1]));
  // mastil quebrado: lo que esta mas alla del quiebre se corre de lado y baja un paso
  const mv = [];
  for (let i = 0; i < t.d.length; i++) if (t.d[i] && occ[i]) {
    const x = i % t.w, y = (i / t.w) | 0, a = (x - geo.bx) * dx + (y - geo.by) * dy;
    if (a > neckA + 0.3) mv.push([x, y, t.d[i]]);
  }
  const sx = Math.round(qx * sd * 1.2) || 0, sy = Math.round(qy * sd * 1.2) || 0, ax_ = -Math.round(dx * 1), ay_ = -Math.round(dy * 1);
  mv.forEach(m => { t.set(m[0], m[1], null); });
  mv.forEach(m => { t.set(m[0] + sx + ax_, m[1] + sy + ay_, m[2]); });
  paint(neckA - 0.2, -0.5, GCR); paint(neckA - 0.2, 0.5, GCR);                                // el quiebre
  paint(neckA - 1.2, -0.5, P.tape); paint(neckA - 1.2, 0.5, TAPE2);
  dot(neckA + 0.2, sd * 1.9, GSPL); dot(neckA - 0.4, -sd * 1.8, P.woodD);                       // astillas del quiebre
  // cuerdas reventadas: una cuelga junto al mastil con rulo en la punta, otra se enrosca en el clavijero, y otra sale del puente
  const hl = L + 0.2;
  for (let k = 0; k < 6; k++) dot(hl - 1 - k * 1.1, sd * 2.2 + (k > 3 ? 0.9 : 0), k % 2 ? STR2 : STR);
  [[hl - 7, sd * 3.2], [hl - 7.8, sd * 3.0]].forEach(c => dot(c[0], c[1], STR2));
  [[hl + 0.2, -sd * 2.4], [hl + 1.0, -sd * 3.2], [hl + 2.0, -sd * 3.2], [hl + 2.5, -sd * 2.4]].forEach((c, i) => dot(c[0], c[1], i % 2 ? STR2 : STR));
  dot(-rb - 0.6, -sd * 0.4, STR); dot(-rb - 1.4, -sd * 1.3, STR2); dot(-rb - 1.4, -sd * 2.3, STR); dot(-rb - 0.5, -sd * 2.7, STR2);
}
function gtrBlit(g, t, geo) { if (GD > 0) gtrDamage(t, geo, GD); g.blit(t, 0, 0); }

function gtrFront(g, u) {                 // de frente: el mastil asoma por detras del hombro, la caja por detras de la cadera
  if (GD >= 3) return;
  const t = new G(g.w, g.h);
  t.rect(15, 3 + u, 2, 10, P.woodD); t.rect(14, 0 + u, 3, 3, P.head); t.set(13, 1 + u, P.metal); t.set(17, 1 + u, P.metal);
  t.disc(16, 17 + u, 2.6, P.wood); t.set(17, 18 + u, P.tape);
  gtrBlit(g, t, { hx: 15.5, hy: 1.5 + u, bx: 16, by: 17 + u, rb: 2.6, side: 1 });
}
function gtrBack(g, u) {                  // de espaldas: la guitarra cuelga en la espalda
  if (GD >= 3) return;
  const t = new G(g.w, g.h);
  t.disc(10, 17 + u, 3.2, P.wood); t.disc(10, 14 + u, 2.3, P.wood); t.set(10, 16 + u, P.woodD); t.set(8, 19 + u, P.tape); t.set(9, 19 + u, P.tape);
  t.line(11, 12 + u, 14, 2 + u, P.woodD); t.line(12, 12 + u, 15, 2 + u, P.woodD); t.rect(14, 0 + u, 3, 2, P.head);
  gtrBlit(g, t, { hx: 15, hy: 1 + u, bx: 10, by: 16 + u, rb: 3.2, side: 1 });
}
function alexFront(g, f) {
  f = f || {};
  const bob = f.bob || 0, lL = f.lL || 0, lR = f.lR || 0, sw = f.sw || 0, face = f.face || 'normal', arms = f.arms || 'walk',
    guitarBack = f.guitarBack !== false, titina = f.titina !== false, back = !!f.back, peck = f.peck || 0;
  const o = 1, u = bob + o;
  if (!back && guitarBack) gtrFront(g, u);
  // cabeza
  g.rect(6, 2 + u, 8, 4, P.hair); [6, 9, 12].forEach(x => g.set(x, 1 + u, P.hair)); g.set(13, 2 + u, P.hair);
  if (!back) {
    g.rect(6, 5 + u, 8, 6, P.face); g.rect(7, 11 + u, 6, 1, P.face); g.rect(5, 4 + u, 1, 3, P.hair); g.rect(14, 4 + u, 1, 3, P.hair);   // cara un paso de rampa mas clara (#1: la cabeza manda)
    g.set(5, 7 + u, P.face); g.set(14, 7 + u, P.face);
    g.set(7, 5 + u, P.hair); g.set(8, 5 + u, P.hair); g.set(11, 5 + u, P.hair); g.set(12, 5 + u, P.hair);
    g.set(6, 10 + u, P.skinD); g.set(13, 10 + u, P.skinD);
    g.set(6, 7 + u, P.faceL); g.set(7, 8 + u, P.faceL); g.set(6, 6 + u, P.faceL); g.set(13, 6 + u, P.faceL);     // luz en frente y pomulo (rampa de piel 5.2)
    if (face === 'sing') { g.set(7, 7 + u, P.eye); g.set(8, 7 + u, P.eye); g.set(11, 7 + u, P.eye); g.set(12, 7 + u, P.eye); g.rect(9, 9 + u, 2, 2, P.mouth); }
    else if (face === 'sick') { g.rect(7, 7 + u, 2, 1, P.eye); g.rect(11, 7 + u, 2, 1, P.eye); g.set(7, 6 + u, P.skinD); g.set(12, 6 + u, P.skinD); g.set(9, 9 + u, P.mouth); g.set(10, 9 + u, P.mouth); g.set(11, 10 + u, P.mouth); g.set(8, 10 + u, P.skinD); }
    else if (face === 'sick2') { g.rect(7, 7 + u, 2, 1, P.eye); g.rect(11, 7 + u, 2, 1, P.eye); g.set(7, 6 + u, P.skinD); g.set(12, 6 + u, P.skinD); g.rect(8, 9 + u, 4, 2, P.mouth); g.set(7, 9 + u, P.skinD); g.set(12, 9 + u, P.skinD); }
    else if (face === 'shy') { g.set(8, 8 + u, P.eye); g.set(11, 8 + u, P.eye); g.set(9, 10 + u, P.skinD); g.set(10, 10 + u, P.skinD); g.set(7, 9 + u, '#b5675a'); g.set(12, 9 + u, '#b5675a'); }
    else { g.set(8, 7 + u, P.eye); g.set(11, 7 + u, P.eye); g.set(9, 9 + u, P.skinD); g.set(10, 9 + u, P.skinD); }
  } else {
    g.rect(6, 5 + u, 8, 6, P.hair); g.rect(7, 11 + u, 6, 1, P.skinD); g.set(5, 7 + u, P.skin); g.set(14, 7 + u, P.skin); g.rect(5, 4 + u, 1, 3, P.hair); g.rect(14, 4 + u, 1, 3, P.hair);
  }
  g.rect(9, 12 + u, 2, 1, P.skinD);
  stripes(g, 5, 13 + u, 10, 6);
  if (!back && GD < 3) g.line(6, 13 + u, 13, 18 + u, P.strap);
  if (back && guitarBack) gtrBack(g, u);
  if (arms === 'walk') {
    g.rect(3, 13 + u, 2, 2, P.blue); g.rect(15, 13 + u, 2, 2, P.blue);
    g.rect(3, 15 + u, 2, 3 + (sw > 0 ? 1 : 0), P.skin); g.rect(15, 15 + u, 2, 3 + (sw < 0 ? 1 : 0), P.skin);
  }
  // shorts
  g.rect(6, 19 + u, 8, 3, P.shorts); g.rect(6, 19 + u, 8, 1, P.shortsD); g.set(9, 21 + u, null); g.set(10, 21 + u, null);
  // piernas
  if (!f.noLegs) {
    g.rect(7, 22 + o, 2, 3 + lL, P.skin); g.rect(6, 25 + o + lL, 3, 1, P.sandal);
    g.rect(11, 22 + o, 2, 3 + lR, P.skin); g.rect(11, 25 + o + lR, 3, 1, P.sandal);
  }
  if (titina) { if (back) titinaMini(g, 13, 10 + u, true, peck); else titinaMini(g, 1, 10 + u, false, peck); }
}
function alexSide(g, f) {
  f = f || {};
  const ox = f.ox || 0, bob = f.bob || 0, a = f.a || 0, sw = f.sw || 0, guitar = f.guitar !== false, arm = f.arm !== false, titina = f.titina !== false;
  const o = 1, u = bob;
  const S = (x, y, c) => g.set(x + ox, y, c), R = (x, y, w, h, c) => g.rect(x + ox, y, w, h, c),
    L = (x0, y0, x1, y1, c) => g.line(x0 + ox, y0, x1 + ox, y1, c), D = (x, y, r, c) => g.disc(x + ox, y, r, c);
  if (guitar && GD < 3) {
    const t = new G(g.w, g.h);
    t.line(5 + ox, 12 + o + u, 3 + ox, 2 + o + u, P.woodD); t.line(6 + ox, 12 + o + u, 4 + ox, 2 + o + u, P.woodD); t.rect(2 + ox, 0 + o + u, 3, 2, P.head);
    t.disc(6 + ox, 17 + o + u, 3, P.wood); t.disc(6 + ox, 14 + o + u, 2.2, P.wood); t.set(6 + ox, 16 + o + u, P.woodD); t.set(5 + ox, 19 + o + u, P.tape); t.set(7 + ox, 19 + o + u, P.tape);
    gtrBlit(g, t, { hx: 3.5 + ox, hy: 1 + o + u, bx: 6 + ox, by: 16.5 + o + u, rb: 3, side: -1 });
  }
  const xa = 10 + a, xb = 10 - a;
  if (!f.noLegs) { R(xb, 22 + o, 2, 3, P.skinD); R(xb, 25 + o, 3, 1, P.sandal); }
  R(8, 2 + o + u, 6, 4, P.hair); S(9, 1 + o + u, P.hair); S(12, 1 + o + u, P.hair); S(14, 3 + o + u, P.hair); R(7, 4 + o + u, 3, 5, P.hair);
  R(10, 5 + o + u, 4, 6, P.face); S(10, 6 + o + u, P.faceL); S(10, 8 + o + u, P.faceL); S(11, 6 + o + u, P.faceL); S(14, 8 + o + u, P.face); S(10, 7 + o + u, P.skinD); S(12, 7 + o + u, P.eye); S(13, 10 + o + u, P.skinD); R(10, 11 + o + u, 3, 1, P.face);
  R(10, 12 + o + u, 2, 1, P.skinD);
  stripes(g, 8 + ox, 13 + o + u, 6, 6);
  if (GD < 3) L(9, 13 + o + u, 13, 18 + o + u, P.strap);
  R(8, 19 + o + u, 6, 3, P.shorts); R(8, 19 + o + u, 6, 1, P.shortsD);
  if (f.nearLeg !== false && !f.noLegs) { R(xa, 22 + o, 2, 3, P.skin); R(xa, 25 + o, 3, 1, P.sandal); }
  if (arm) { R(10, 13 + o + u, 2, 2, P.blue); R(10 + sw, 15 + o + u, 2, 3, P.skin); }
  if (titina) titinaMini(g, 3 + ox, 10 + o + u, true);
}
function drawGuitar(g, hx, hy, bx, by) {
  if (GD >= 3) { hand(g, Math.round(hx) - 1, Math.round(hy) - 1, 3, 3); return; }      // sin guitarra: solo el puño
  const t = new G(g.w, g.h);
  const dx = bx - hx, dy = by - hy, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  const nx = bx - ux * 3.5, ny = by - uy * 3.5;
  t.line(hx, hy, nx, ny, P.woodD); t.line(hx - uy, hy + ux, nx - uy, ny + ux, P.woodD);
  t.disc(bx - ux * 2.4, by - uy * 2.4, 2.1, P.wood); t.disc(bx, by, 2.8, P.wood); t.set(bx - ux, by - uy, P.woodD); t.set(bx + uy * 2, by - ux * 2, P.tape);
  t.rect(Math.round(hx - ux * 1.5) - 1, Math.round(hy - uy * 1.5) - 1, 2, 2, P.head);
  gtrBlit(g, t, { hx: hx - ux * 2, hy: hy - uy * 2, bx: bx, by: by, rb: 2.8, side: 1 });
}

/* Caminar: 20x28, pies en la fila 26. Ancla (10,26); izquierda = espejo => (9,26). */
const FEET_Y = 26;
function alexWalk(dir, bird) {
  const out = [];
  if (dir === 'down' || dir === 'up') {
    const seq = [{ bob: 0, lL: 0, lR: 0, sw: 0 }, { bob: 1, lL: -1, lR: 0, sw: 1 }, { bob: 0, lL: 0, lR: 0, sw: 0 }, { bob: 1, lL: 0, lR: -1, sw: -1 }];
    seq.forEach(s => {
      const g = new G(20, 28);
      alexFront(g, Object.assign({ back: dir === 'up', titina: bird }, s));
      outlineRim(g);
      out.push(mkC(g, 10, FEET_Y));
    });
  } else {
    const seq = [{ a: 1, sw: 1, bob: 0 }, { a: 0, sw: 0, bob: 1 }, { a: -1, sw: -1, bob: 0 }, { a: 0, sw: 0, bob: 1 }];
    seq.forEach(s => {
      const g = new G(20, 28);
      alexSide(g, Object.assign({ titina: bird }, s));
      outlineRim(g);
      out.push(dir === 'left' ? flipC(g, 10, FEET_Y) : mkC(g, 10, FEET_Y));
    });
  }
  return out;
}

/* Ataque lateral (derecha): 32x30, cuerpo desplazado +3 => ancla (13,26). Izquierda = espejo => (18,26). */
function alexAttackSide(bird) {
  const P3 = [{ H: [12, 8], B: [6, 4] }, { H: [20, 14], B: [27, 12] }, { H: [18, 18], B: [24, 24] }];
  const right = [], left = [];
  P3.forEach((p, fr) => {
    const g = new G(32, 30);
    if (fr === 0) drawGuitar(g, p.H[0], p.H[1], p.B[0], p.B[1]);
    alexSide(g, { ox: 3, guitar: false, arm: false, titina: bird && fr === 0, bob: fr === 1 ? 1 : 0, a: fr === 1 ? 1 : 0 });
    g.line(14, 15, p.H[0], p.H[1], P.skin); g.line(15, 15, p.H[0] + 1, p.H[1], P.skin); g.rect(13, 14, 2, 2, P.blue);
    if (fr > 0) drawGuitar(g, p.H[0], p.H[1], p.B[0], p.B[1]);
    if (bird && fr === 1) { titinaMini(g, 4, 0, true); g.set(3, 0, P.pgL); g.set(9, 0, P.pgL); }
    if (bird && fr === 2) { titinaMini(g, 4, 4, true); }
    outlineRim(g);
    if (fr === 1) spark(g, [[29, 10], [30, 11], [29, 14], [31, 9], [31, 15], [30, 8], [31, 12], [30, 16], [28, 7]]);
    right.push(mkC(g, 13, FEET_Y));
    left.push(flipC(g, 13, FEET_Y));
  });
  return { right: right, left: left };
}

/* brazo en piel con manga azul. (sx,sy) = esquina de la manga. */
function armTo(g, sx, sy, hx, hy) {
  g.line(sx, sy + 1, hx, hy, P.skin); g.line(sx + 1, sy + 1, hx + 1, hy, P.skin);
  g.rect(sx, sy, 2, 2, P.blue);
}
function armDown(g, sx, sy, len) { g.rect(sx, sy + 2, 2, len, P.skin); g.rect(sx, sy, 2, 2, P.blue); }

/* Ataque hacia abajo (de frente): lienzo 32x48, cuerpo en (6,12) => ancla (16,38).
   1: guitarra en alto sobre el hombro. 2: guitarrazo al piso frente a los pies (golpe). 3: seguimiento. */
function alexAttackDown(bird) {
  const BX = 6, BY = 12, out = [];
  for (let fr = 0; fr < 3; fr++) {
    const g = new G(32, 48);
    const body = new G(20, 28);
    alexFront(body, { face: fr === 1 ? 'sing' : 'normal', arms: 'none', guitarBack: false, titina: false, bob: fr === 1 ? 1 : 0 });
    g.blit(body, BX, BY);
    const u = (fr === 1 ? 2 : 1) + BY;           // fila base del torso
    const sy = 13 + u - 1 + 0;                    // fila de los hombros
    if (fr === 0) {
      armDown(g, 9, sy, 4);
      armTo(g, 21, sy, 24, 18);
      drawGuitar(g, 24, 18, 27, 5);
      if (bird) titinaMini(g, 7, 10 + u, false);
    } else if (fr === 1) {
      armTo(g, 9, sy, 15, 33); armTo(g, 21, sy, 17, 33);
      g.rect(15, 32, 3, 2, P.skin);
      drawGuitar(g, 16, 33, 16, 43);
      if (bird) { titinaMini(g, 10, 7, false); g.set(9, 7, P.pgL); g.set(16, 7, P.pgL); g.set(10, 6, P.pgL); g.set(15, 6, P.pgL); }
    } else {
      armTo(g, 9, sy, 18, 32); armTo(g, 21, sy, 20, 32);
      drawGuitar(g, 19, 32, 27, 38);
      if (bird) titinaMini(g, 7, 19, false);
    }
    outlineRim(g);
    if (fr === 1) spark(g, [[10, 44], [9, 41], [12, 46], [22, 44], [23, 41], [20, 46], [16, 47], [8, 45], [24, 45], [13, 40], [19, 40]]);
    out.push(mkC(g, 16, BY + FEET_Y));
  }
  return out;
}

/* Ataque hacia arriba (de espaldas): lienzo 32x48, cuerpo en (6,12) => ancla (16,38).
   1: guitarra atras de la cabeza. 2: barrida hacia el frente (arriba) pasando sobre la cabeza (golpe). 3: seguimiento. */
function alexAttackUp(bird) {
  const BX = 6, BY = 12, out = [];
  for (let fr = 0; fr < 3; fr++) {
    const g = new G(32, 48);
    const body = new G(20, 28);
    alexFront(body, { back: true, arms: 'none', guitarBack: false, titina: false, bob: 0 });
    const u = 1 + BY, sy = 13 + u - 1;
    if (fr === 0) {
      drawGuitar(g, 24, 22, 27, 10);               // detras del cuerpo
      g.blit(body, BX, BY);
      armDown(g, 9, sy, 4);
      armTo(g, 21, sy, 23, 22);
      if (bird) titinaMini(g, 19, 10 + u, true);
    } else if (fr === 1) {
      armTo(g, 9, sy, 14, 13); armTo(g, 21, sy, 18, 13);   // brazos detras de la cabeza
      drawGuitar(g, 16, 13, 16, 2);
      g.blit(body, BX, BY);
      g.rect(14, 12, 2, 3, P.skin); g.rect(18, 12, 2, 3, P.skin);
      if (bird) { titinaMini(g, 3, 14, true); g.set(2, 14, P.pgL); g.set(9, 14, P.pgL); g.set(3, 13, P.pgL); g.set(8, 13, P.pgL); }
    } else {
      armTo(g, 9, sy, 12, 16); armTo(g, 21, sy, 16, 16);
      drawGuitar(g, 14, 14, 9, 3);
      g.blit(body, BX, BY);
      g.rect(12, 13, 2, 3, P.skin); g.rect(16, 13, 2, 3, P.skin);
      if (bird) titinaMini(g, 19, 20, true);
    }
    outlineRim(g);
    if (fr === 1) spark(g, [[13, 1], [19, 1], [16, 0], [12, 3], [20, 3], [11, 0], [21, 0]]);
    out.push(mkC(g, 16, BY + FEET_Y));
  }
  return out;
}


/* ---- Resortera (v0.6, F3): [estirar, soltar] por direccion. Mismo lienzo y ancla que `attack` (lados 32x30 ancla 13,26 / 18,26; frente y espalda 32x48 ancla 16,38).
   La guitarra se queda en la espalda; el brazo delantero sostiene una honda en Y y el otro tensa la liga con una piedra. Conserva la luz de borde de v0.4. ---- */
const BAND = '#e04a3a', BANDL = '#f59a80', BANDD = '#8a2a24', STONEC = '#9a9a92', STONEL = '#c9c9be', WOODL = '#d8a066', WHITE_ = '#f6f2e4';
/* Honda en Y grande (v0.6 pulido): mango + horquilla de 2 px de grosor, rama izquierda clara, derecha oscura, y las puntas envueltas en liga roja.
   (sx, sy) = base del mango, `lean` inclina la horquilla. Devuelve las puntas. */
function slingY2(g, sx, sy, o) {
  o = o || {};
  const stem = o.stem || 4, spread = o.spread || 3, rise = o.rise || 6, h = o.h || 0;
  for (let i = 0; i < stem; i++) { g.set(sx, sy - i, P.wood); g.set(sx + 1, sy - i, P.woodD); }
  g.set(sx, sy - stem + 1, WOODL);
  const fy = sy - stem;                                  // nudo de la horquilla
  g.line(sx - 1, fy, sx - spread - 1, fy - rise + 1, P.wood); g.line(sx + 2, fy, sx + 2 + spread + (o.skew || 0), fy - rise + 1, P.woodD);
  g.line(sx, fy, sx - spread, fy - rise, WOODL); g.line(sx + 1, fy, sx + 1 + spread + (o.skew || 0), fy - rise, P.wood);
  const a = [sx - spread, fy - rise], b = [sx + 1 + spread + (o.skew || 0), fy - rise];
  [a, b].forEach(t => { g.rect(t[0], t[1] - 1, 2, 2, BAND); g.set(t[0], t[1] - 1, BANDL); g.set(t[0] + 1, t[1], BANDD); });
  return [a, b];
}
function bandTo(g, tips, q) {                            // dos ligas tensas de las puntas a la bolsa, con brillo
  tips.forEach((t, k) => g.line(t[0] + 1, t[1] + 1, q[0], q[1], k ? BANDD : BAND));
  tips.forEach(t => g.set(Math.round((t[0] * 2 + q[0]) / 3), Math.round((t[1] * 2 + q[1]) / 3), BANDL));
}
function bandSnap(g, tips, fork) {                       // la liga vuelve de golpe: dos curvas flojas cruzadas sobre la horquilla
  const [a, b] = tips, mx = (a[0] + b[0]) / 2;
  g.line(a[0], a[1] + 1, mx + 2, fork[1] - 1, BAND); g.line(b[0], b[1] + 1, mx - 2, fork[1] - 1, BAND);
  g.set(Math.round(mx), fork[1] - 3, BANDL); g.set(Math.round(mx) - 1, fork[1] - 2, BAND); g.set(Math.round(mx) + 1, fork[1] - 2, BAND);
  g.set(a[0] - 1, a[1] + 2, BANDD); g.set(b[0] + 1, b[1] + 2, BANDD);
}
function stoneAt(g, x, y) { g.rect(x, y, 2, 2, STONEC); g.set(x, y, STONEL); g.set(x + 1, y + 1, '#6a6a66'); }
function hand(g, x, y, w, h) { g.rect(x, y, w || 3, h || 3, P.skin); g.set(x, y, P.skinL); g.set(x + (w || 3) - 1, y + (h || 3) - 1, P.skinD); }
function snapFlash(g, pts) { pts.forEach((p, i) => g.set(p[0], p[1], i % 2 ? '#f2e63c' : WHITE_)); }

function alexSlingSide(bird) {
  const right = [], left = [];
  [0, 1].forEach(fr => {
    const g = new G(32, 30);
    alexSide(g, { ox: 3, guitar: true, arm: false, titina: bird, a: 1, bob: 0 });
    // brazo trasero (detras del cuerpo): codo atras, antebrazo cruza el pecho hasta la mejilla
    g.line(13, 15, 10, 18, P.skinD); g.line(14, 15, 11, 18, P.skinD);
    g.rect(13, 14, 2, 2, P.blue);                                          // manga
    // brazo delantero extendido, recto, con luz arriba y sombra abajo
    g.rect(15, 15, 9, 1, P.skin); g.rect(15, 16, 9, 1, P.skinD); g.set(15, 15, P.skinL);
    const tips = slingY2(g, 25, 14, { stem: 4, spread: 3, rise: 6, skew: 0 });   // mango (25..26, 11..14), puntas (22,5) y (29,5)
    hand(g, 23, 14, 4, 3);                                                 // puño sobre el mango
    if (fr === 0) {                                                        // estirar: bolsa con piedra en la mejilla, liga tensa a las dos puntas
      g.line(12, 18, 17, 12, P.skin); g.line(13, 18, 18, 12, P.skinD); g.rect(10, 17, 3, 2, P.skinD);
      bandTo(g, tips, [18, 11]);
      hand(g, 17, 11, 3, 3); stoneAt(g, 19, 9); g.rect(18, 11, 1, 1, '#6b4223');
    } else {                                                               // soltar: la liga salta hacia adelante, piedra afuera, mano abierta atras
      g.line(11, 17, 7, 14, P.skin); g.line(11, 18, 7, 15, P.skinD); g.rect(10, 17, 3, 2, P.skinD);
      g.rect(5, 12, 3, 3, P.skin); g.set(5, 12, P.skinL); g.set(4, 12, P.skin); g.set(4, 14, P.skin);   // dedos abiertos
      bandSnap(g, tips, [27, 11]);
      snapFlash(g, [[22, 2], [29, 2], [25, 1], [26, 0], [20, 4], [31, 4], [24, 3]]);
      stoneAt(g, 30, 9); g.rect(25, 9, 4, 1, WHITE_); g.rect(26, 10, 3, 1, '#cbbf98'); g.set(24, 10, WHITE_);   // estela de la piedra
    }
    outlineRim(g);
    right.push(mkC(g, 13, FEET_Y)); left.push(flipC(g, 13, FEET_Y));
  });
  return { right: right, left: left };
}
function alexSlingFront(dir, bird) {
  const BX = 6, BY = 12, out = [], up = dir === 'up';
  [0, 1].forEach(fr => {
    const g = new G(32, 48), body = new G(20, 28);
    alexFront(body, { back: up, arms: 'none', guitarBack: true, titina: bird, bob: 0, face: (!up && fr === 1) ? 'sing' : 'normal' });
    const sy = 13 + 1 + BY - 1;                                            // fila de los hombros (25)
    if (!up) {
      // brazo que sostiene (izquierda de la pantalla): sale al costado y la mano empuña la honda
      g.blit(body, BX, BY);
      g.line(9, 26, 4, 24, P.skin); g.line(10, 26, 5, 25, P.skinD); g.rect(9, sy, 2, 2, P.blue);
      const tips = slingY2(g, 4, 23, { stem: 4, spread: 3, rise: 6, skew: 0 });   // mango (4..5, 20..23), puntas (1,13) y (8,13)
      hand(g, 3, 22, 4, 3);
      if (fr === 0) {                                                      // estirar: el codo derecho sale afuera, la mano trae la liga al pecho
        g.line(21, 26, 25, 28, P.skin); g.line(22, 26, 25, 29, P.skinD); g.rect(21, sy, 2, 2, P.blue);
        g.line(25, 28, 16, 28, P.skin); g.line(25, 29, 16, 29, P.skinD);
        bandTo(g, tips, [13, 26]);
        hand(g, 13, 26, 4, 3); stoneAt(g, 11, 25); g.rect(12, 27, 1, 1, '#6b4223');
      } else {                                                             // soltar: liga de vuelta, mano derecha lanzada hacia afuera y abierta
        g.line(21, 26, 25, 27, P.skin); g.line(22, 26, 26, 24, P.skinD); g.rect(21, sy, 2, 2, P.blue);
        g.rect(26, 22, 3, 3, P.skin); g.set(26, 22, P.skinL); g.set(28, 21, P.skin); g.set(29, 23, P.skin);
        bandSnap(g, tips, [4, 19]);
        snapFlash(g, [[0, 10], [7, 10], [3, 9], [4, 8], [-1, 12], [9, 12], [2, 11]]);
        g.set(4, 15, STONEL); g.set(5, 15, STONEC); g.set(4, 16, STONEC); g.rect(1, 17, 1, 3, WHITE_); g.rect(8, 17, 1, 3, WHITE_); g.set(6, 20, '#cbbf98');   // piedra hacia la camara y sus rayas
      }
    } else {
      // de espaldas: las ligas y la bolsa quedan DETRAS de la cabeza (van hacia adelante = arriba); se pintan antes del cuerpo
      const tips = slingY2(g, 3, 21, { stem: 4, spread: 3, rise: 6, skew: 0 });     // mango (3..4, 18..21), puntas (0,11) y (7,11)
      if (fr === 0) bandTo(g, tips, [16, 18]); else bandSnap(g, tips, [4, 17]);
      g.blit(body, BX, BY);
      // brazo izquierdo extendido al costado hacia adelante; la mano empuña la honda
      g.line(9, 26, 4, 23, P.skin); g.line(10, 26, 5, 24, P.skinD); g.rect(9, sy, 2, 2, P.blue);
      hand(g, 2, 20, 4, 3);
      if (fr === 0) {                                                      // el codo derecho sobresale a un lado: la mano llega a la nuca/mejilla
        g.line(21, 26, 26, 22, P.skin); g.line(22, 26, 27, 23, P.skinD); g.rect(21, sy, 2, 2, P.blue);
        g.line(26, 22, 20, 18, P.skin); g.line(27, 23, 21, 19, P.skinD); hand(g, 19, 17, 3, 3);
        g.rect(25, 21, 3, 3, P.skin); g.set(25, 21, P.skinL);              // codo
      } else {
        g.line(21, 26, 25, 25, P.skin); g.line(22, 26, 26, 27, P.skinD); g.rect(21, sy, 2, 2, P.blue);
        g.rect(26, 26, 3, 3, P.skin); g.set(26, 26, P.skinL);
        snapFlash(g, [[0, 8], [7, 8], [3, 7], [4, 6], [-1, 10], [9, 10], [2, 9]]);
        stoneAt(g, 4, 4); g.rect(4, 7, 1, 3, WHITE_); g.rect(1, 12, 1, 3, WHITE_); g.rect(8, 12, 1, 3, WHITE_);
      }
    }
    outlineRim(g);
    out.push(mkC(g, 16, BY + FEET_Y));
  });
  return out;
}

/* ======================== v0.8 (G3): puñete, skate, patada, empacho ======================== */
const BDR = ['#4a1210', '#862018', '#c8382e', '#ee6c58'], GRIP = '#22222e', GRIPL = '#4a4a64', WHL = '#d8d2bc', WHLH = '#f2eedc', WHLD = '#9a957f', TRK = '#7e868a', TRKL = '#a4abaa';
const FLASH = ['#fff6c8', '#ffe36b'];
/* Puño cerrado w x h: luz arriba-izquierda, sombra abajo-derecha, una raya de dedos. */
function fist(g, x, y, w, h) {
  w = w || 4; h = h || 4;
  g.rect(x, y, w, h, P.skin);
  for (let i = 0; i < w - 1; i++) g.set(x + i, y, P.skinL);
  for (let j = 1; j < h - 1; j++) g.set(x, y + j, P.skinL);
  for (let i = 1; i < w; i++) g.set(x + i, y + h - 1, P.skinD);
  for (let j = 1; j < h; j++) g.set(x + w - 1, y + j, P.skinD);
  if (h >= 4) for (let i = 1; i < w - 2; i++) g.set(x + i, y + 2, P.skinD);
}
/* Brazo recto de grosor 2 (luz arriba, sombra abajo) entre dos puntos. */
function limb(g, x0, y0, x1, y1) { g.line(x0, y0, x1, y1, P.skin); g.line(x0, y0 + 1, x1, y1 + 1, P.skinD); }
/* Desplaza filas (inclinar el cuerpo): fn(y) -> dx */
function shearRows(src, fn) {
  const n = new G(src.w, src.h);
  for (let y = 0; y < src.h; y++) { const dx = fn(y); for (let x = 0; x < src.w; x++) { const c = src.get(x, y); if (c) n.set(x + dx, y, c); } }
  return n;
}
function burst(g, pts) { pts.forEach((q, i) => g.set(q[0], q[1], FLASH[i % 2])); }
function streak(g, x, y, w) { g.rect(x, y, w, 1, WHITE_); g.set(x + w, y, '#cbbf98'); }

/* ---- Puñete: [armar, golpear, recuperar]. Mismo lienzo y ancla que `attack`. Sin guitarra (solo se pelea a puñetes cuando se rompe). ---- */
function alexPunchSide(bird) {
  const right = [], left = [];
  const A = [1, 2, 0], LEAN = [y => (y <= 12 ? -1 : 0), y => (y <= 11 ? 2 : (y <= 18 ? 1 : 0)), y => (y <= 11 ? 1 : 0)];
  for (let fr = 0; fr < 3; fr++) {
    const g = new G(32, 30), b = new G(32, 30);
    alexSide(b, { ox: 3, guitar: false, arm: false, titina: false, bob: fr === 2 ? 1 : 0, a: A[fr] });
    g.blit(shearRows(b, LEAN[fr]), 0, 0);
    if (fr === 0) {                                       // armar: el brazo atras, el puño cargado detras del hombro
      limb(g, 13, 15, 8, 17); g.rect(13, 14, 2, 2, P.blue); fist(g, 4, 15, 4, 4);
      if (bird) titinaMini(g, 6, 11, true);
    } else if (fr === 1) {                                // golpear: el brazo recto, el puño grande al final, rayas de velocidad y estrellita
      limb(g, 15, 15, 25, 15); g.rect(14, 14, 2, 2, P.blue); fist(g, 24, 13, 5, 5);
      streak(g, 17, 12, 4); streak(g, 18, 19, 5);
      if (bird) { titinaMini(g, 5, 1, true); g.set(4, 1, P.pgL); g.set(10, 1, P.pgL); }
    } else {                                              // recuperar: el antebrazo vuelve a la guardia
      limb(g, 14, 15, 17, 19); limb(g, 17, 18, 21, 14); g.rect(13, 14, 2, 2, P.blue); fist(g, 20, 12, 4, 4);
      if (bird) titinaMini(g, 5, 5, true);
    }
    outlineRim(g);
    if (fr === 1) burst(g, [[30, 11], [31, 13], [30, 14], [31, 16], [30, 18], [29, 10], [29, 20], [31, 10], [31, 19]]);
    right.push(mkC(g, 13, FEET_Y)); left.push(flipC(g, 13, FEET_Y));
  }
  return { right: right, left: left };
}
function alexPunchFront(dir, bird) {
  const BX = 6, BY = 12, out = [], up = dir === 'up';
  for (let fr = 0; fr < 3; fr++) {
    const g = new G(32, 48), body = new G(20, 28), bob = fr === 1 ? 1 : 0;
    alexFront(body, { back: up, face: (!up && fr === 1) ? 'sing' : 'normal', arms: 'none', guitarBack: false, titina: false, bob: bob });
    g.blit(body, BX, BY);
    const u = bob + 1 + BY, sy = 13 + u - 1;
    if (!up) {
      if (fr === 0) { armTo(g, 21, sy, 26, 21); fist(g, 25, 19, 4, 4); armTo(g, 9, sy, 11, 29); fist(g, 9, 28, 4, 4); if (bird) titinaMini(g, 7, 10 + u, false); }
      else if (fr === 1) { armDown(g, 9, sy, 4); armTo(g, 21, sy, 18, 33); fist(g, 15, 32, 5, 5); if (bird) { titinaMini(g, 10, 7, false); g.set(9, 7, P.pgL); g.set(16, 7, P.pgL); } }
      else { armTo(g, 21, sy, 19, 30); fist(g, 18, 29, 4, 4); armTo(g, 9, sy, 11, 29); fist(g, 10, 28, 4, 4); if (bird) titinaMini(g, 7, 10 + u, false); }
    } else {
      if (fr === 0) { armTo(g, 21, sy, 26, 30); fist(g, 25, 29, 4, 4); armDown(g, 9, sy, 4); if (bird) titinaMini(g, 19, 10 + u, true); }
      else if (fr === 1) { armDown(g, 9, sy, 4); armTo(g, 21, sy, 23, 15); fist(g, 22, 10, 5, 5); if (bird) { titinaMini(g, 3, 14, true); g.set(2, 14, P.pgL); g.set(9, 14, P.pgL); } }
      else { armDown(g, 9, sy, 4); armTo(g, 21, sy, 22, 21); fist(g, 21, 17, 4, 4); if (bird) titinaMini(g, 12, 6, true); }
    }
    outlineRim(g);
    if (fr === 1 && !up) burst(g, [[12, 38], [11, 40], [14, 42], [21, 38], [23, 40], [20, 43], [17, 43], [10, 36], [24, 37], [16, 39], [19, 40]]);
    if (fr === 1 && up) burst(g, [[20, 7], [22, 5], [25, 6], [28, 8], [29, 11], [18, 9], [24, 3], [27, 4], [21, 4], [29, 6]]);
    out.push(mkC(g, 16, BY + FEET_Y));
  }
  return out;
}
function buildPunch(bird) {
  const s = alexPunchSide(bird);
  return { right: s.right, left: s.left, down: alexPunchFront('down', bird), up: alexPunchFront('up', bird) };
}

/* ---- Patada frontal (a la carretilla): [alzar la rodilla, patear]. Mismo lienzo y ancla que `attack`. La guitarra sigue a la espalda. ---- */
function alexKickSide(bird) {
  const right = [], left = [];
  for (let fr = 0; fr < 2; fr++) {
    const g = new G(32, 30), b = new G(32, 30);
    alexSide(b, { ox: 3, guitar: true, arm: false, titina: false, bob: 0, a: 0, nearLeg: false });
    g.blit(shearRows(b, fr === 1 ? (y => (y <= 12 ? -2 : (y <= 19 ? -1 : 0))) : (y => (y <= 12 ? -1 : 0))), 0, 0);
    g.rect(13, 14, 2, 2, P.blue); limb(g, 13, 16, 9, 19);                    // el brazo se va atras para el equilibrio
    if (fr === 0) {                                                          // rodilla arriba: muslo adelante, pierna colgando
      g.rect(14, 21, 6, 2, P.skin); g.rect(14, 23, 6, 1, P.skinD); g.set(14, 21, P.skinL); g.set(19, 21, P.skinL); g.set(19, 22, P.skinL);
      g.rect(18, 23, 2, 3, P.skin); g.set(18, 23, P.skinL); g.rect(18, 25, 2, 1, P.skinD);
      g.rect(17, 26, 4, 1, P.sandal); g.set(20, 26, P.k); g.set(17, 26, '#7a5638');
    } else {                                                                 // pierna recta al frente, la suela por delante
      g.rect(14, 20, 11, 2, P.skin); g.rect(14, 22, 11, 1, P.skinD); g.set(14, 20, P.skinL); g.set(24, 20, P.skinL);
      g.rect(25, 17, 3, 6, P.sandal); g.rect(25, 17, 1, 6, '#7a5638'); g.set(27, 19, P.strap); g.set(27, 20, P.strap); g.set(26, 17, '#8a6038'); g.set(25, 17, P.skinL); g.set(25, 18, P.skin); g.set(25, 22, P.skinD);
      g.set(25, 23, P.skinD);
    }
    if (bird) titinaMini(g, fr === 1 ? 4 : 5, fr === 1 ? 1 : 9, true);
    outlineRim(g);
    if (fr === 1) { streak(g, 22, 15, 5); streak(g, 21, 25, 4); burst(g, [[30, 17], [31, 19], [30, 21], [29, 15], [31, 15], [30, 23]]); }
    right.push(mkC(g, 13, FEET_Y)); left.push(flipC(g, 13, FEET_Y));
  }
  return { right: right, left: left };
}
function alexKickFront(dir, bird) {
  const BX = 6, BY = 12, out = [], up = dir === 'up';
  for (let fr = 0; fr < 2; fr++) {
    const g = new G(32, 48), body = new G(20, 28);
    alexFront(body, { back: up, arms: 'none', guitarBack: true, titina: false, bob: 0, lR: -3 });   // pierna derecha (pantalla) recogida: se pinta la patada aparte
    g.blit(body, BX, BY);
    const u = 1 + BY, sy = 13 + u - 1;
    // limpiamos la pierna derecha (x 17..19, filas 34..) y se vuelve a dibujar
    for (let y = 35; y < 41; y++) for (let x = 16; x <= 20; x++) g.set(x, y, null);
    armTo(g, 9, sy, 4, 30); armTo(g, 21, sy, 27, 29);                          // brazos abiertos, equilibrio
    if (!up) {
      if (fr === 0) {                                                        // rodilla arriba, el pie colgando
        g.rect(17, 34, 3, 3, P.skin); g.set(17, 34, P.skinL); g.rect(17, 37, 3, 2, P.skinD); g.rect(16, 39, 5, 2, P.sandal); g.set(16, 39, '#7a5638');
      } else {                                                               // la patada va hacia la camara: pierna corta, pie grande abajo
        g.rect(17, 35, 3, 4, P.skin); g.rect(17, 35, 1, 4, P.skinL); g.rect(19, 36, 1, 3, P.skinD);       // pierna corta, en escorzo
        g.rect(15, 39, 7, 6, '#5e3f27'); [[15, 39], [21, 39], [15, 44], [21, 44]].forEach(q => g.set(q[0], q[1], null));   // suela grande, de frente
        g.rect(16, 39, 5, 1, P.skinL); g.set(16, 39, P.skin); g.set(20, 39, P.skin);                    // los dedos asoman arriba
        g.rect(15, 40, 1, 4, '#8a6038'); g.rect(16, 40, 5, 1, '#8a6038'); g.rect(16, 42, 5, 1, '#7a5638'); g.line(16, 41, 20, 43, '#c9a066');    // borde de la suela y tira
        g.rect(21, 41, 1, 3, '#3d2818'); g.rect(16, 44, 5, 1, '#3d2818');
      }
    } else {
      if (fr === 0) { g.rect(19, 31, 3, 3, P.skin); g.rect(21, 28, 3, 4, P.skin); g.rect(22, 25, 3, 3, P.sandal); }
      else { g.rect(19, 32, 3, 3, P.skin); g.rect(22, 27, 3, 6, P.skin); g.rect(23, 20, 4, 7, P.sandal); g.rect(23, 20, 1, 7, '#7a5638'); g.set(26, 23, P.strap); g.set(26, 24, P.strap); }
    }
    if (bird) titinaMini(g, up ? 19 : 7, 10 + u + (fr ? 2 : 0), up);
    outlineRim(g);
    if (fr === 1 && !up) burst(g, [[14, 45], [13, 43], [22, 45], [24, 43], [18, 47], [11, 46], [26, 46]]);
    if (fr === 1 && up) burst(g, [[28, 21], [29, 24], [27, 18], [25, 18], [29, 19]]);
    out.push(mkC(g, 16, BY + FEET_Y));
  }
  return out;
}
function buildKick(bird) {
  const s = alexKickSide(bird);
  return { right: s.right, left: s.left, down: alexKickFront('down', bird), up: alexKickFront('up', bird) };
}

/* ---- Skate: tabla roja con agarre negro, ruedas crema y ejes metalicos. ---- */
/* Tabla vista de canto (lado): 2 px (agarre + color), ruedas hacia el lado n. */
function boardEdge(g, x0, y0, x1, y1, ns) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy * (ns || 1), ny = ux * (ns || 1);
  for (let t = 0; t <= L; t += 0.5) {
    const cx = x0 + ux * t, cy = y0 + uy * t, end = t < 1 || t > L - 1;
    g.set(Math.round(cx - nx * 0.5), Math.round(cy - ny * 0.5), end ? BDR[2] : GRIP);
    g.set(Math.round(cx + nx * 0.5), Math.round(cy + ny * 0.5), t > L - 1.2 ? BDR[3] : (end ? BDR[2] : BDR[2]));
  }
  for (let t = 1; t < L; t += 2) g.set(Math.round(x0 + ux * t + nx * 0.5), Math.round(y0 + uy * t + ny * 0.5), BDR[3]);
  [2.6, L - 2.6].forEach(t => {
    const cx = x0 + ux * t + nx * 2.4, cy = y0 + uy * t + ny * 2.4;
    g.set(Math.round(x0 + ux * t + nx * 1.4), Math.round(y0 + uy * t + ny * 1.4), TRK);
    const wx = Math.round(cx - 0.5), wy = Math.round(cy - 0.5);
    g.rect(wx, wy, 2, 2, WHL); g.set(wx, wy, WHLH); g.set(wx + 1, wy + 1, WHLD);
  });
}
/* Tabla vista por abajo (de frente o de espaldas): 3 px de color, dos ejes y cuatro ruedas. */
function boardFace(g, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  for (let t = 0; t <= L; t += 0.5) {
    const cx = x0 + ux * t, cy = y0 + uy * t, end = t < 1 || t > L - 1;
    for (let w = -1; w <= 1; w++) {
      if (end && w !== 0) continue;
      const lightSide = (nx + ny < 0) ? -1 : 1;
      g.set(Math.round(cx + nx * w), Math.round(cy + ny * w), w === 0 ? BDR[2] : (w === lightSide ? BDR[3] : BDR[1]));
    }
  }
  [2.6, L - 2.6].forEach(t => {
    const cx = x0 + ux * t, cy = y0 + uy * t;
    g.set(Math.round(cx), Math.round(cy), TRK);
    [-2, 2].forEach(w => { const wx = Math.round(cx + nx * w), wy = Math.round(cy + ny * w); g.rect(wx - (ux * ux < 0.5 ? 0 : 0), wy - 1, 1, 3, WHL); g.set(wx, wy - 1, WHLH); g.set(wx, wy + 1, WHLD); });
  });
}
/* ======== Poses con un objeto en la mano (patron para el nivel 2) ========
   Cada objeto es un "kit" registrado en HELD_KITS. Un kit trae solo el dibujo del objeto y los brazos; el cuerpo, la luz de borde, el
   hornear en 20x28 / 32x30 / 32x48 y las anclas las pone el armador generico (heldWalk / heldSwingSet), igual que para `walk` y `attack`.
   Para agregar otro objeto: copiar el bloque `skate` de abajo, cambiar `hold`/`swing`, y redibujar el objeto en las funciones del kit. Nada mas: buildAlexSet() lo recorre solo.
   Variantes ya usadas (v0.9, H5a): `escoba` (swing sin direccion: kit.spin(bird) devuelve el arreglo de 8 cuadros) y `carry` (kit.build(bird) devuelve { carry, carryThrow }
   con lienzos propios de 32x48, porque la tele sobresale por arriba de la cabeza). Todos se hornean tambien dentro de g1/g2/g3. */
const HELD_KITS = {};
/* Caminar con el objeto: 4 cuadros 20x28, ancla (10,26), igual que `walk`.
   kit.walkFront(g, s, u, up): arte de frente / espaldas (s = cuadro {bob,lL,lR,sw}, u = bob + 1 = desplazamiento vertical del torso).
   kit.walkSide(g, s, u): arte de perfil derecho (la izquierda es el espejo). kit.sideOpts: opciones extra de alexSide (p. ej. { arm: false }). */
function heldWalk(kit, dir, bird) {
  const out = [];
  if (dir === 'down' || dir === 'up') {
    const up = dir === 'up';
    [{ bob: 0, lL: 0, lR: 0, sw: 0 }, { bob: 1, lL: -1, lR: 0, sw: 1 }, { bob: 0, lL: 0, lR: 0, sw: 0 }, { bob: 1, lL: 0, lR: -1, sw: -1 }].forEach(s => {
      const g = new G(20, 28), u = s.bob + 1;
      alexFront(g, Object.assign({ back: up, titina: bird, arms: 'none' }, s));
      kit.walkFront(g, s, u, up);
      outlineRim(g);
      out.push(mkC(g, 10, FEET_Y));
    });
  } else {
    [{ a: 1, sw: 1, bob: 0 }, { a: 0, sw: 0, bob: 1 }, { a: -1, sw: -1, bob: 0 }, { a: 0, sw: 0, bob: 1 }].forEach(s => {
      const g = new G(20, 28);
      alexSide(g, Object.assign({ titina: bird, arm: false }, s));
      kit.walkSide(g, s, s.bob);
      outlineRim(g);
      out.push(dir === 'left' ? flipC(g, 10, FEET_Y) : mkC(g, 10, FEET_Y));
    });
  }
  return out;
}
/* Armado de un kit: { <hold>: {down,up,left,right:[4]}, <swing>: {down,up,left,right:[3]} } (swing solo si el kit lo trae). */
function heldSet(kit, bird) {
  const r = {};
  if (kit.build) Object.assign(r, kit.build(bird));                                       // kit con lienzos propios (p. ej. carry: 32x48): devuelve { clave: {down,up,left,right} }
  if (kit.hold) r[kit.hold] = { down: heldWalk(kit, 'down', bird), up: heldWalk(kit, 'up', bird), left: heldWalk(kit, 'left', bird), right: heldWalk(kit, 'right', bird) };
  if (kit.spin) r[kit.swing] = kit.spin(bird);                                            // giro sin direccion: un solo arreglo de cuadros
  else if (kit.swing) {
    const s = kit.swingSide(bird);
    r[kit.swing] = { right: s.right, left: s.left, down: kit.swingFront('down', bird), up: kit.swingFront('up', bird) };
  }
  return r;
}

/* ---- Kit `skate`: tabla al hombro como garrote (caminar) y tablazo ancho (golpe). ---- */
HELD_KITS.skate = {
  hold: 'skateHold', swing: 'skateSwing',
  walkFront: function (g, s, u, up) {
    g.rect(3, 13 + u, 2, 2, P.blue); g.rect(3, 15 + u, 2, 3 + (s.sw > 0 ? 1 : 0), P.skin);          // brazo libre, de caminar
    g.rect(15, 13 + u, 2, 2, P.blue); g.rect(15, 15 + u, 2, 2, P.skin);                              // brazo que agarra
    boardFace(g, 17.5, 16 + u, 17.5 + (up ? -0.5 : 0.5), 4 + u);                                     // la tabla al hombro, como un garrote
    fist(g, 16, 16 + u, 3, 3);
  },
  walkSide: function (g, s, u) {
    g.rect(10, 14 + u, 2, 2, P.blue); limb(g, 11, 16 + u, 15, 15 + u);
    boardEdge(g, 15, 16 + u, 18.5, 4 + u, 1);
    fist(g, 14, 14 + u, 3, 3);
  },
  swingSide: function (bird) { return alexSkateSwingSide(bird); },
  swingFront: function (dir, bird) { return alexSkateSwingFront(dir, bird); }
};
/* (escoba y carry, del nivel 2, estan registrados mas abajo, en la seccion v0.9 / H5a.) */
/* Tablazo ancho: [armar, golpear, seguir]. Mismo lienzo y ancla que `attack`. */
function alexSkateSwingSide(bird) {
  const right = [], left = [];
  const H = [[14, 10, 5, 2], [17, 13, 29, 10], [18, 18, 25, 25]];
  for (let fr = 0; fr < 3; fr++) {
    const g = new G(32, 30), h = H[fr];
    alexSide(g, { ox: 3, guitar: true, arm: false, titina: bird && fr === 0, bob: fr === 1 ? 1 : 0, a: fr === 1 ? 1 : 0 });
    g.rect(13, 14, 2, 2, P.blue); g.line(14, 15, h[0], h[1], P.skin); g.line(15, 15, h[0] + 1, h[1], P.skinD);
    boardEdge(g, h[0], h[1], h[2], h[3], fr === 2 ? -1 : 1);
    fist(g, h[0] - 1, h[1] - 1, 3, 3);
    if (bird && fr === 1) { titinaMini(g, 4, 0, true); g.set(3, 0, P.pgL); g.set(9, 0, P.pgL); }
    if (bird && fr === 2) titinaMini(g, 4, 4, true);
    outlineRim(g);
    if (fr === 1) { streak(g, 20, 5, 6); streak(g, 22, 3, 5); spark(g, [[30, 8], [31, 10], [30, 13], [31, 15], [29, 7]]); }
    if (fr === 2) streak(g, 19, 14, 3);
    right.push(mkC(g, 13, FEET_Y)); left.push(flipC(g, 13, FEET_Y));
  }
  return { right: right, left: left };
}
function alexSkateSwingFront(dir, bird) {
  const BX = 6, BY = 12, out = [], up = dir === 'up';
  for (let fr = 0; fr < 3; fr++) {
    const g = new G(32, 48), body = new G(20, 28), bob = (!up && fr === 1) ? 1 : 0;
    alexFront(body, { back: up, arms: 'none', guitarBack: true, titina: bird, bob: bob, face: (!up && fr === 1) ? 'sing' : 'normal' });
    const u = bob + 1 + BY, sy = 13 + u - 1;
    const hd = [[24, 18], [20, 30], [11, 34]][fr], tip = [[27, 4], [7, 33], [2, 41]][fr];
    if (up) { boardFace(g, hd[0], fr === 1 ? 13 : hd[1], tip[0], fr === 1 ? 11 : tip[1]); g.blit(body, BX, BY); }
    else g.blit(body, BX, BY);
    armDown(g, 9, sy, 4);
    armTo(g, 21, sy, hd[0], up && fr === 1 ? 14 : hd[1]);
    if (!up) boardFace(g, hd[0], hd[1], tip[0], tip[1]);
    fist(g, hd[0] - 1, up && fr === 1 ? 13 : hd[1] - 1, 3, 3);
    outlineRim(g);
    out.push(mkC(g, 16, BY + FEET_Y));
  }
  return out;
}
/* ---- Empacho: de frente, encorvado, la mano en la panza y la cara verdosa. 20x28, ancla (10,26) como `walk`. ---- */
const SICK = { face: '#b49d5e', faceL: '#cdb87c', skinD: '#7e7040' };
function alexSick(bird) {
  const out = [];
  for (let fr = 0; fr < 2; fr++) {
    const g = new G(20, 28), body = new G(20, 28), u = 3 + fr;                       // cuerpo mas abajo: rodillas flexionadas
    gtrFront(g, u);
    alexFront(body, { arms: 'none', guitarBack: false, titina: false, bob: 2 + fr, face: fr ? 'sick2' : 'sick' });
    // cabeza (filas 0..13) un poco mas abajo y adelante: encorvado
    const drop = 2;
    for (let y = 0; y < body.h; y++) for (let x = 0; x < body.w; x++) {
      const c = body.get(x, y); if (!c) continue;
      if (y >= 13 + u) g.set(x, y, c);
    }
    for (let y = 0; y <= 12 + u; y++) for (let x = 0; x < body.w; x++) {
      let c = body.get(x, y); if (!c) continue;
      if (c === P.face) c = SICK.face; else if (c === P.faceL) c = SICK.faceL; else if (y >= 5 + u && c === P.skinD) c = SICK.skinD;
      g.set(x, y + drop, c);
    }
    // piernas flexionadas: dos filas menos de rodilla (se recorta una fila de piel entre short y sandalia)
    // brazos: el izquierdo (pantalla) sobre la panza, el derecho colgando o a la boca
    g.rect(3, 13 + u, 2, 2, P.blue); limb(g, 4, 15 + u, 8, 18 + u);
    fist(g, 8, 17 + u, 4, 3);
    g.rect(15, 13 + u, 2, 2, P.blue);
    if (fr === 0) { g.rect(15, 15 + u, 2, 4, P.skin); g.rect(15, 19 + u, 3, 2, P.skinL); }
    else { limb(g, 16, 15 + u, 14, 12 + u + drop); fist(g, 12, 9 + u + drop, 3, 3); }
    if (bird) titinaMini(g, fr ? 0 : 1, 10 + u + drop - (fr ? 3 : 0), false);
    outlineRim(g);
    // sudor y mareo
    g.set(16, 5 + u + drop, '#9bd4ee'); g.set(16, 6 + u + drop, '#cfeaf5');
    [[3, 3], [4, 2], [5, 2], [6, 3]].forEach(q => g.set(q[0] + (fr ? 10 : 0), q[1] + fr, '#7fb04a'));
    out.push(mkC(g, 10, FEET_Y));
  }
  return out;
}

/* ======================== v0.9 (H5a): nivel 2 - salto, mojado, escoba, tele, molotov ======================== */
/* ---- Salto: [agacharse, aire, caer]. Mismo lienzo y ancla que `walk` (20x28, ancla (10,26); izquierda = espejo => (9,26)).
   El motor levanta el cuadro `p.z` px; el cuadro `aire` ya trae las piernas recogidas y los brazos arriba. ---- */
const WET = ['#cfeaf5', '#9bd4ee', '#5fa6d2', '#2f6ea6'];
function alexJumpFront(dir, bird) {
  const up = dir === 'up', out = [];
  for (let fr = 0; fr < 3; fr++) {
    const g = new G(20, 28), bob = [2, 0, 1][fr], u = bob + 1;
    alexFront(g, { back: up, titina: false, arms: 'none', noLegs: true, bob: bob, face: (!up && fr === 1) ? 'sing' : 'normal' });
    if (fr === 0) {                                                                   // agacharse: rodillas abiertas, brazos atras
      g.rect(5, 25, 3, 1, P.skin); g.rect(4, 26, 4, 1, P.sandal); g.rect(12, 25, 3, 1, P.skin); g.rect(12, 26, 4, 1, P.sandal);
      g.rect(3, 13 + u, 2, 2, P.blue); g.rect(2, 15 + u, 2, 3, P.skin); g.rect(15, 13 + u, 2, 2, P.blue); g.rect(16, 15 + u, 2, 3, P.skin);
    } else if (fr === 1) {                                                            // aire: piernas recogidas, un brazo arriba, otro al costado
      g.rect(7, 23, 2, 1, P.skin); g.rect(6, 24, 3, 1, P.sandal); g.rect(11, 23, 2, 2, P.skin); g.rect(11, 25, 3, 1, P.sandal);
      g.rect(3, 13 + u, 2, 2, P.blue); limb(g, 3, 15 + u, 1, 12 + u); fist(g, 0, 10 + u, 3, 3);
      g.rect(15, 13 + u, 2, 2, P.blue); limb(g, 16, 13 + u, 18, 6 + u); fist(g, 17, 4 + u, 3, 3);
    } else {                                                                          // caer: piernas abiertas, brazos abiertos para el equilibrio
      g.rect(5, 24, 3, 2, P.skin); g.rect(4, 26, 4, 1, P.sandal); g.rect(12, 24, 3, 2, P.skin); g.rect(12, 26, 4, 1, P.sandal);
      g.rect(3, 13 + u, 2, 2, P.blue); limb(g, 3, 15 + u, 0, 17 + u); g.rect(15, 13 + u, 2, 2, P.blue); limb(g, 16, 15 + u, 19, 17 + u);
    }
    if (bird) {
      const tx = up ? 13 : 1, right = up;
      if (fr === 1) { titinaMini(g, tx, 6 + u, right); g.set(tx - 1, 6 + u, P.pgL); g.set(tx + 6, 6 + u, P.pgL); g.set(tx, 5 + u, P.pgL); g.set(tx + 5, 5 + u, P.pgL); }
      else titinaMini(g, tx, 10 + u + (fr === 2 ? 0 : 0), right);
    }
    outlineRim(g);
    out.push(mkC(g, 10, FEET_Y));
  }
  return out;
}
function alexJumpSide(bird) {
  const right = [], left = [];
  for (let fr = 0; fr < 3; fr++) {
    const g = new G(20, 28), bob = [2, 0, 1][fr], u = bob;
    alexSide(g, { arm: false, noLegs: true, titina: false, bob: bob });
    if (fr === 0) {
      g.rect(8, 25, 2, 1, P.skinD); g.rect(7, 26, 3, 1, P.sandal); g.rect(11, 24, 3, 2, P.skin); g.rect(11, 26, 4, 1, P.sandal);
      g.rect(10, 14 + u, 2, 2, P.blue); limb(g, 10, 16 + u, 6, 19 + u);
    } else if (fr === 1) {
      g.rect(7, 23, 3, 1, P.skinD); g.rect(5, 24, 3, 1, P.sandal);
      g.rect(10, 23, 3, 1, P.skin); g.rect(12, 24, 2, 1, P.skin); g.rect(12, 25, 3, 1, P.sandal);
      g.rect(10, 14 + u, 2, 2, P.blue); limb(g, 11, 15 + u, 15, 9 + u); fist(g, 14, 7 + u, 3, 3);
    } else {
      g.rect(8, 24, 2, 2, P.skinD); g.rect(7, 26, 3, 1, P.sandal); g.rect(11, 24, 3, 2, P.skin); g.rect(11, 26, 4, 1, P.sandal);
      g.rect(10, 14 + u, 2, 2, P.blue); limb(g, 11, 16 + u, 14, 19 + u);
    }
    if (bird) {
      if (fr === 1) { titinaMini(g, 3, 6 + u, true); g.set(2, 6 + u, P.pgL); g.set(9, 6 + u, P.pgL); g.set(3, 5 + u, P.pgL); g.set(8, 5 + u, P.pgL); }
      else titinaMini(g, 3, 10 + 1 + u, true);
    }
    outlineRim(g);
    right.push(mkC(g, 10, FEET_Y)); left.push(flipC(g, 10, FEET_Y));
  }
  return { right: right, left: left };
}
function buildJump(bird) {
  const s = alexJumpSide(bird);
  return { down: alexJumpFront('down', bird), up: alexJumpFront('up', bird), right: s.right, left: s.left };
}

/* ---- Escoba: cerdas de paja atadas al mango. De (x0,y0) a (x1,y1) va el mango (2 px); desde (x1,y1) hacia (x2,y2) las cerdas, que se abren de w0 a w1 (medio ancho). ---- */
const BRM = { s: '#d8b24c', sL: '#f0d27a', sD: '#a8832e', sDD: '#7a5a22', tie: '#5e3f27', tieL: '#8a6038', h: '#a86e38', hL: '#c99458', hD: '#6b4223' };
function broom(g, x0, y0, x1, y1, x2, y2, w0, w1) {
  let dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const shallow = Math.abs(ux) > Math.abs(uy);
  for (let t = 0; t <= L + 0.4; t += 0.4) {                                   // mango: 2 px de grueso, luz en el lado NW
    const cx = x0 + ux * t, cy = y0 + uy * t;
    g.set(cx, cy, BRM.hD); g.set(shallow ? cx : cx - 1, shallow ? cy - 1 : cy, BRM.h);
  }
  for (let t = 1; t < L; t += 3) g.set(x0 + ux * t + (shallow ? 0 : -1), y0 + uy * t + (shallow ? -1 : 0), BRM.hL);
  dx = x2 - x1; dy = y2 - y1; L = Math.hypot(dx, dy) || 1; ux = dx / L; uy = dy / L;
  let nx = -uy, ny = ux; if (nx + ny > 0) { nx = -nx; ny = -ny; }                // n apunta hacia la luz (NW)
  const bx = Math.min(x1, x2) - w1 - 2, by = Math.min(y1, y2) - w1 - 2, ex = Math.max(x1, x2) + w1 + 2, ey = Math.max(y1, y2) + w1 + 2;
  for (let y = Math.floor(by); y <= Math.ceil(ey); y++) for (let x = Math.floor(bx); x <= Math.ceil(ex); x++) {
    const px_ = x - x1, py_ = y - y1, u = px_ * ux + py_ * uy, v = px_ * nx + py_ * ny;
    if (u < -0.5 || u > L + 0.5) continue;
    const f = Math.max(0, Math.min(1, u / L)), hw = w0 + (w1 - w0) * f;
    if (Math.abs(v) > hw) continue;
    let c;
    if (u < 1.2) c = (v > 0) ? BRM.tieL : BRM.tie;                                // atadura
    else if (u > L - 0.9 && ((x + y) & 1)) c = BRM.sD;                            // puntas deshilachadas
    else {
      const k = v / hw;
      c = k > 0.45 ? BRM.sL : (k < -0.5 ? BRM.sDD : ((Math.floor((v + hw) * 1.4 + u * 0.15) & 1) ? BRM.s : BRM.sD));
    }
    g.set(x, y, c);
  }
}
HELD_KITS.escoba = {
  hold: 'escobaHold', swing: 'escobaSpin',
  walkFront: function (g, s, u, up) {
    g.rect(3, 13 + u, 2, 2, P.blue); g.rect(3, 15 + u, 2, 3 + (s.sw > 0 ? 1 : 0), P.skin);          // brazo libre
    g.rect(15, 13 + u, 2, 2, P.blue); g.rect(15, 15 + u, 2, 2, P.skin);                              // brazo que agarra
    broom(g, 16.5, 20 + u, 16.8, 9 + u, 17, 1 + u, 1.1, 2.0);                                        // la escoba al hombro, cerdas arriba
    fist(g, 15, 16 + u, 3, 3);
  },
  walkSide: function (g, s, u) {
    g.rect(10, 14 + u, 2, 2, P.blue); limb(g, 11, 16 + u, 14, 16 + u);
    broom(g, 13.5, 20 + u, 15.2, 9 + u, 16.4, 2 + u, 1.1, 2.0);
    fist(g, 13, 15 + u, 3, 3);
  },
  spin: function (bird) { return alexEscobaSpin(bird); }
};
/* ---- escobaSpin: 8 cuadros del giro de 360 grados, sin direccion. Lienzo CUADRADO 58x58, ancla (29,32) = los pies de Alexander (centro del giro de 26 px:
   29 px a cada lado y hacia arriba 32, hacia abajo 26). Cuadro k = angulo k*45 grados de la escoba, empezando hacia el este (derecha) y girando hacia el sur
   (hacia la camara), oeste, norte. La escoba barre una elipse (rx 24, ry 17) a la altura de las manos (y = 23); detras del cuerpo cuando va al norte. El cuerpo gira con ella. ---- */
const SPIN_W = 58, SPIN_AX = 29, SPIN_AY = 32;
function alexEscobaSpin(bird) {
  const out = [], CX = SPIN_AX, CY = 23, RX = 24, RY = 17, rg = rng(4242);
  const pos = (r, th) => [CX + Math.cos(th) * RX * r, CY + Math.sin(th) * RY * r];
  for (let k = 0; k < 8; k++) {
    const th = k * Math.PI / 4, sn = Math.sin(th), cs = Math.cos(th), g = new G(SPIN_W, SPIN_W);
    // cuerpo: de lado (este/oeste), de frente (sureste..suroeste), de espaldas (noroeste..noreste)
    const body = new G(20, 28);
    let flip = false, ox = SPIN_AX - 10, bob = k % 2;
    if (k === 0) alexSide(body, { arm: false, titina: bird, bob: bob });
    else if (k === 4) { alexSide(body, { arm: false, titina: bird, bob: bob }); flip = true; }
    else alexFront(body, { back: k > 4, arms: 'none', titina: bird, bob: bob, lL: k === 2 ? -1 : 0, lR: k === 6 ? -1 : 0 });
    const bg = flip ? body.flip() : body; if (flip) ox = SPIN_AX - 9;
    const A = pos(0.06, th), B = pos(1.0, th), M = [A[0] + (B[0] - A[0]) * 0.56, A[1] + (B[1] - A[1]) * 0.56];
    const h1 = pos(0.16, th), h2 = pos(0.34, th), shL = [CX - 5, CY - 2], shR = [CX + 5, CY - 2];
    const behind = sn < -0.2;
    const arms = (gg) => {
      const near = cs >= 0 ? shR : shL, far = cs >= 0 ? shL : shR;
      limb(gg, far[0], far[1] + 1, h1[0], h1[1]); limb(gg, near[0], near[1] + 1, h2[0], h2[1]);
      gg.rect(far[0] - 1, far[1] - 1, 2, 2, P.blue); gg.rect(near[0] - 1, near[1] - 1, 2, 2, P.blue);
      fist(gg, Math.round(h1[0]) - 1, Math.round(h1[1]) - 1, 3, 3); fist(gg, Math.round(h2[0]) - 1, Math.round(h2[1]) - 1, 3, 3);
    };
    const draw = (gg) => broom(gg, A[0], A[1], M[0], M[1], B[0], B[1], 1.7, 3.3);
    if (behind) { draw(g); g.blit(bg, ox, SPIN_AY - FEET_Y); arms(g); }
    else { g.blit(bg, ox, SPIN_AY - FEET_Y); arms(g); draw(g); }
    outlineRim(g);
    // estela de polvo detras de las cerdas (sin contorno): tres arcos, mas ralos cuanto mas atras
    const dust = ['#f2efe2c0', '#d9d5c4a0', '#b8b3a070'];
    for (let a = 1; a <= 14; a++) {
      const ang = th - a * 0.075;
      [0.94, 0.8, 0.66].forEach((r, i) => {
        if (rg() < 0.78 - a * 0.045 - i * 0.12) { const q = pos(r + (rg() - 0.5) * 0.06, ang); if (!g.get(Math.round(q[0]), Math.round(q[1]))) g.set(q[0], q[1], dust[Math.min(2, Math.floor(a / 5))]); }
      });
    }
    out.push(mkC(g, SPIN_AX, SPIN_AY));
  }
  return out;
}

/* ---- Llamas y botella para las poses del molotov (a escala de personaje) ---- */
const FIRE = ['#e8381a', '#ff7a14', '#ffc324', '#fff3b0'];
/* Llama que sale de (x,y) en la direccion (dx,dy), de largo len y ancho w: borde rojo, naranja, amarillo y nucleo claro; ondula con `seed`. */
function flameAlong(g, x, y, dx, dy, len, w, seed) {
  const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  for (let t = 0; t <= len; t += 0.5) {
    const f = t / len, hw = w * Math.pow(1 - f, 0.8) * (0.55 + 0.45 * Math.min(1, t / 1.6)), wob = Math.sin(t * 1.5 + seed) * 0.7 * f;
    for (let p = -hw; p <= hw + 0.01; p += 0.5) {
      const q = p - wob, a = Math.abs(q) / (hw || 1);
      const c = (a < 0.28 && f < 0.42) ? FIRE[3] : (a < 0.55 && f < 0.7) ? FIRE[2] : (a < 0.86) ? FIRE[1] : FIRE[0];
      g.set(x + ux * t + nx * p, y + uy * t + ny * p, c);
    }
  }
}
const BOT = { g: '#2f5a3a', gL: '#6fae6a', gH: '#c4ecb8', liq: '#d9c36a', liqD: '#a68a3a', rag: '#e0dccb', ragD: '#a8a392' };
/* Botella de molotov: base en (bx,by), eje hacia el cuello (ux,uy) unitario, largo 8 (cuello incluido; algo mas grande que al natural para que se lea); el trapo asoma del cuello. Devuelve la boca (donde prende la mecha). */
function bottleAlong(g, bx, by, ux, uy) {
  const nx = -uy, ny = ux;
  for (let t = 0; t <= 8; t += 0.5) {
    const hw = t < 0.7 ? 1.0 : t < 4.2 ? 1.7 : t < 5.3 ? 1.7 - (t - 4.2) * 0.8 : 0.8;          // base redondeada, cuerpo, hombro, cuello
    for (let p = -hw; p <= hw + 0.01; p += 0.5) {
      const lit = (-nx - ny) > 0 ? p : -p, k = lit / hw;
      let c = k > 0.55 ? BOT.gL : (k < -0.5 ? BOT.g : '#43784a');
      if (t > 0.9 && t < 4 && p > -hw + 0.5 && p < hw - 0.5) c = k > 0.3 ? BOT.liq : BOT.liqD;    // gasolina adentro
      if (t > 4.2 && t < 5.6 && k > 0.2) c = BOT.gH;                                              // brillo del hombro
      g.set(bx + ux * t + nx * p, by + uy * t + ny * p, c);
    }
  }
  g.line(bx + ux * 6.4, by + uy * 6.4, bx + ux * 9, by + uy * 9, BOT.rag);                          // trapo
  g.set(bx + ux * 8 + nx, by + uy * 8 + ny, BOT.ragD); g.set(bx + ux * 6.2 - nx, by + uy * 6.2 - ny, BOT.ragD);
  return [bx + ux * 9, by + uy * 9];
}
/* brazo con grosor 2 en cualquier direccion (luz arriba o a la izquierda, sombra al otro lado) */
function limb2(g, x0, y0, x1, y1, far) {
  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0), A = far ? P.skinD : P.skin, B = far ? P.skinD : P.skinD;
  g.line(x0, y0, x1, y1, A);
  if (steep) g.line(x0 + 1, y0, x1 + 1, y1, B); else g.line(x0, y0 + 1, x1, y1 + 1, B);
}

/* ---- Televisor de tubo (14 de ancho x 11 de alto, de frente; de perfil 12x10). (x,y) = esquina superior izquierda. ---- */
const TV = { b: '#9b9a8c', l: '#c0bfb0', d: '#6a6a60', dd: '#4a4a44', scr: '#2c3a3a', g1: '#5c7a76', g2: '#9cbcb4', k: '#33333a', kl: '#7a7a82', sp: '#55554e', back: '#6e6e66', backD: '#54544e' };
function tvDraw(g, x, y, view) {
  if (view === 'front') {
    g.rect(x, y, 14, 11, TV.b); g.rect(x, y, 14, 1, TV.l); g.rect(x, y, 1, 11, TV.l); g.rect(x, y + 10, 14, 1, TV.d); g.rect(x + 13, y, 1, 11, TV.d);
    g.rect(x + 2, y + 2, 9, 7, TV.scr); [[2, 2], [10, 2], [2, 8], [10, 8]].forEach(q => g.set(x + q[0], y + q[1], TV.b));
    g.set(x + 3, y + 3, TV.g2); g.set(x + 4, y + 3, TV.g1); g.set(x + 3, y + 4, TV.g1); g.set(x + 9, y + 7, TV.g1);                     // reflejo del vidrio
    g.rect(x + 11, y + 3, 2, 2, TV.k); g.set(x + 11, y + 3, TV.kl); g.rect(x + 11, y + 6, 2, 1, TV.sp); g.rect(x + 11, y + 8, 2, 1, TV.sp);
  } else if (view === 'back') {
    g.rect(x, y, 14, 11, TV.back); g.rect(x, y, 14, 1, '#8a8a80'); g.rect(x, y + 10, 14, 1, TV.backD); g.rect(x + 13, y, 1, 11, TV.backD);
    g.rect(x + 3, y + 2, 8, 7, TV.backD); g.rect(x + 4, y + 3, 6, 5, '#5e5e58'); [4, 6].forEach(r => g.rect(x + 5, y + r, 4, 1, TV.dd));       // el culo del tubo y las rejillas
    g.set(x + 11, y + 9, TV.k); g.set(x + 2, y + 9, TV.k);
  } else {                                                                                                                           // perfil derecho: vidrio al frente (derecha), el tubo afina hacia atras
    g.rect(x + 7, y, 5, 10, TV.b); g.rect(x + 7, y, 5, 1, TV.l); g.rect(x + 11, y, 1, 10, TV.scr); g.rect(x + 7, y + 9, 5, 1, TV.d);
    g.rect(x + 3, y + 1, 4, 8, TV.back); g.rect(x + 1, y + 3, 2, 4, TV.backD); g.rect(x + 3, y + 1, 4, 1, '#8a8a80'); g.rect(x + 3, y + 8, 4, 1, TV.backD);
    g.set(x + 11, y + 2, TV.g2); g.set(x + 11, y + 3, TV.g1); g.set(x + 9, y + 4, TV.k); g.set(x + 9, y + 6, TV.sp);
  }
}

/* ---- Cargar la tele sobre la cabeza: `carry` (caminar, 4) y `carryThrow` (2: tomar impulso, lanzar). Lienzo 32x48 (la tele sobresale por arriba) en las cuatro direcciones:
   frente y espalda: cuerpo en (6,12), ancla (16,38). Derecha: cuerpo en (4,12), ancla (14,38). Izquierda = espejo => (17,38). ---- */
const CARRY_BY = 12;
function carryFrame(dir, bird, o) {
  const up = dir === 'up', side = dir === 'right', BX = side ? 4 : 6, BY = CARRY_BY, g = new G(32, 48), body = new G(20, 28);
  const throwing = o.throwF !== undefined, tf = o.throwF;
  const bob = o.bob || 0, u = side ? bob : bob + 1;
  if (side) alexSide(body, { arm: false, titina: false, bob: bob, a: o.a || 0 });
  else alexFront(body, { back: up, arms: 'none', titina: false, bob: bob, lL: o.lL || 0, lR: o.lR || 0, face: (throwing && tf === 1 && !up) ? 'sing' : 'normal' });
  g.blit(body, BX, BY);
  const view = side ? 'side' : (up ? 'back' : 'front');
  let tx, ty;                                                                                  // esquina de la tele (en el lienzo)
  if (!throwing) { tx = BX + (side ? 5 : 3); ty = BY + u + (side ? 4 : 3) - 10; }               // sobre la cabeza
  else if (tf === 0) { tx = BX + (side ? 9 : 3); ty = BY + u + (side ? 12 : 11); }              // impulso: a la cintura
  else { tx = BX + (side ? 14 : 3); ty = BY + u + (side ? -6 : -9) + (up ? -2 : 0); }          // lanzar: arriba y adelante
  if (throwing && tf === 1 && !side) ty = BY + u - 8 - (up ? 3 : 0);
  const sy = BY + u + 12;                                                                       // fila de los hombros
  if (!side) {
    if (!throwing) {                                                                           // brazos doblados: codos afuera, manos bajo las esquinas
      tvDraw(g, tx, ty, view);
      limb2(g, BX + 3, sy + 3, BX + 1, sy - 2, false); limb2(g, BX + 1, sy - 2, BX + 1, ty + 9, false); g.rect(BX + 3, sy, 2, 2, P.blue); fist(g, tx - 2, ty + 7, 3, 3);
      limb2(g, BX + 16, sy + 3, BX + 18, sy - 2, false); limb2(g, BX + 18, sy - 2, BX + 18, ty + 9, false); g.rect(BX + 15, sy, 2, 2, P.blue); fist(g, tx + 13, ty + 7, 3, 3);
    } else if (tf === 0) {
      tvDraw(g, tx, ty, view);                                                                 // la tele a la altura de la cintura, brazos estirados hacia abajo
      limb2(g, BX + 3, sy + 2, BX + 1, ty + 4, false); g.rect(BX + 3, sy, 2, 2, P.blue); fist(g, tx - 2, ty + 3, 3, 3);
      limb2(g, BX + 16, sy + 2, BX + 18, ty + 4, false); g.rect(BX + 15, sy, 2, 2, P.blue); fist(g, tx + 13, ty + 3, 3, 3);
    } else {
      limb2(g, BX + 3, sy + 1, BX + 2, ty + 12, false); g.rect(BX + 3, sy, 2, 2, P.blue); hand(g, tx - 2, ty + 10, 3, 3);      // brazos estirados hacia arriba, manos abiertas
      limb2(g, BX + 16, sy + 1, BX + 17, ty + 12, false); g.rect(BX + 15, sy, 2, 2, P.blue); hand(g, tx + 13, ty + 10, 3, 3);
      tvDraw(g, tx, ty, view);
    }
  } else {
    if (!throwing) {
      tvDraw(g, tx, ty, view);
      limb2(g, BX + 8, BY + u + 15, BX + 8, ty + 8, false); g.rect(BX + 9, BY + u + 13, 2, 2, P.blue); fist(g, BX + 7, ty + 7, 3, 3);
    } else if (tf === 0) {
      tvDraw(g, tx, ty, view);
      limb2(g, BX + 10, BY + u + 15, BX + 12, ty + 3, false); g.rect(BX + 9, BY + u + 13, 2, 2, P.blue); fist(g, tx - 1, ty + 2, 3, 3);
    } else {
      limb2(g, BX + 11, BY + u + 14, tx - 1, ty + 9, false); g.rect(BX + 9, BY + u + 13, 2, 2, P.blue); hand(g, tx - 3, ty + 8, 3, 3);
      tvDraw(g, tx, ty, view);
    }
  }
  if (bird) { if (throwing && tf === 1) titinaMini(g, BX + (side ? 3 : 1), ty + 12, side || up); else titinaMini(g, tx + (side ? 4 : 1), ty - 3, side || up); }      // Titina se sube a la tele (o se baja al hombro al lanzar)
  outlineRim(g);
  if (throwing && tf === 1) {                                                                  // rayas de velocidad: detras de la tele (a la izquierda de lado, debajo de frente) y chispas del tubo
    if (side) [1, 4, 7].forEach((k, i) => g.rect(tx - 6 + i, ty + k, 4 - i, 1, WHITE_));
    else [2, 7, 12].forEach((k, i) => { g.rect(tx + k, ty + 12 + (i & 1), 1, 3, WHITE_); });
    spark(g, [[tx + 7, ty - 2], [tx + 3, ty - 3], [tx + 11, ty - 3]]);
  }
  return mkC(g, side ? 14 : 16, BY + FEET_Y);
}
function buildCarry(bird) {
  const seqF = [{ bob: 0, lL: 0, lR: 0 }, { bob: 1, lL: -1, lR: 0 }, { bob: 0, lL: 0, lR: 0 }, { bob: 1, lL: 0, lR: -1 }], seqS = [{ a: 1, bob: 0 }, { a: 0, bob: 1 }, { a: -1, bob: 0 }, { a: 0, bob: 1 }];
  const carry = {}, thr = {};
  ['down', 'up'].forEach(d => {
    carry[d] = seqF.map(s => carryFrame(d, bird, s)); thr[d] = [0, 1].map(f => carryFrame(d, bird, { throwF: f, bob: f === 0 ? 2 : 0 }));
  });
  carry.right = seqS.map(s => carryFrame('right', bird, s)); thr.right = [0, 1].map(f => carryFrame('right', bird, { throwF: f, bob: f === 0 ? 2 : 0, a: f }));
  carry.left = carry.right.map(c => flipC(cvToG(c), c.ax, c.ay)); thr.left = thr.right.map(c => flipC(cvToG(c), c.ax, c.ay));
  return { carry: carry, carryThrow: thr };
}
/* canvas -> G (para espejar un cuadro ya horneado) */
function cvToG(c) {
  const g = new G(c.width, c.height), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  for (let i = 0; i < c.width * c.height; i++) if (d[i * 4 + 3]) g.d[i] = rgb2hex([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]) + (d[i * 4 + 3] < 255 ? ('0' + d[i * 4 + 3].toString(16)).slice(-2) : '');
  return g;
}
HELD_KITS.carry = { build: buildCarry };

/* ---- Molotov: [prender la mecha, estirar, soltar]. Mismo lienzo y ancla que `sling` (lados 32x30 ancla (13,26) / (18,26); frente y espalda 32x48 ancla (16,38)). ---- */
function alexMolotovSide(bird) {
  const right = [], left = [];
  [0, 1, 2].forEach(fr => {
    const g = new G(32, 30);
    alexSide(g, { ox: 3, guitar: true, arm: false, titina: bird, a: fr === 1 ? 0 : 1, bob: fr === 2 ? 1 : 0 });
    g.rect(13, 14, 2, 2, P.blue);
    if (fr === 0) {                                                                   // prender: botella al frente del pecho, la otra mano acerca la llama al trapo
      limb2(g, 12, 15, 21, 11, true);
      limb2(g, 14, 15, 20, 18, false); const m = bottleAlong(g, 21, 21, 0, -1); hand(g, 19, 17, 3, 3);
      g.rect(21, 8, 2, 3, '#7a7a82'); g.set(21, 8, '#c8c8d0');                          // encendedor
      flameAlong(g, m[0], m[1] + 1, 0, -1, 7, 2.2, 1.3); spark(g, [[m[0] + 3, m[1] - 2], [m[0] - 3, m[1] - 4], [m[0] + 2, m[1] - 6]]);
    } else if (fr === 1) {                                                            // estirar: brazo atras con la botella encendida, el otro apunta
      limb2(g, 14, 16, 25, 12, true); hand(g, 24, 10, 3, 3);
      limb2(g, 13, 15, 8, 13, false); hand(g, 6, 12, 3, 3); const m = bottleAlong(g, 7, 12, -0.45, -0.89);
      flameAlong(g, m[0], m[1], -0.35, -0.94, 5, 2.2, 2.6);
    } else {                                                                          // soltar: brazo lanzado hacia adelante, la botella sale con la llama de estela
      limb2(g, 14, 15, 19, 11, false); g.rect(18, 9, 3, 3, P.skin); g.set(18, 9, P.skinL); g.set(20, 8, P.skin); g.set(21, 10, P.skin);
      limb2(g, 12, 16, 7, 20, true);
      const m = bottleAlong(g, 22, 10, 0.88, -0.47);
      flameAlong(g, m[0], m[1], -0.35, -0.94, 6, 1.9, 3.9);
      g.rect(14, 12, 3, 1, WHITE_); g.rect(15, 14, 2, 1, '#cbbf98'); g.set(13, 13, WHITE_);
    }
    outlineRim(g);
    right.push(mkC(g, 13, FEET_Y)); left.push(flipC(g, 13, FEET_Y));
  });
  return { right: right, left: left };
}
function alexMolotovFront(dir, bird) {
  const BX = 6, BY = 12, up = dir === 'up', out = [];
  [0, 1, 2].forEach(fr => {
    const g = new G(32, 48), body = new G(20, 28), sy = 13 + 1 + BY - 1;
    alexFront(body, { back: up, arms: 'none', guitarBack: true, titina: bird, bob: fr === 2 ? 1 : 0, face: (!up && fr > 0) ? 'sing' : 'normal' });
    if (fr === 0) {
      g.blit(body, BX, BY);
      g.rect(9, sy, 2, 2, P.blue); limb2(g, 9, sy + 2, 7, sy + 8, false); g.rect(21, sy, 2, 2, P.blue);
      if (!up) {
        limb2(g, 21, sy + 2, 25, 30, false); const m = bottleAlong(g, 26, 31, 0, -1); hand(g, 24, 28, 3, 3);
        limb2(g, 9, sy + 2, 21, 22, true); g.rect(20, 21, 2, 2, '#7a7a82');
        flameAlong(g, m[0], m[1] + 1, 0, -1, 7, 2.2, 0.8); spark(g, [[m[0] + 3, m[1] - 3], [m[0] - 3, m[1] - 5]]);
      } else {
        limb2(g, 21, sy + 2, 25, 29, false); const m = bottleAlong(g, 26, 31, 0, -1); hand(g, 24, 28, 3, 3);
        flameAlong(g, m[0], m[1] + 1, 0, -1, 7, 2.2, 0.8); spark(g, [[m[0] + 3, m[1] - 3], [m[0] - 3, m[1] - 5]]);
      }
    } else if (fr === 1) {
      g.blit(body, BX, BY);
      g.rect(9, sy, 2, 2, P.blue); g.rect(21, sy, 2, 2, P.blue);
      if (!up) {
        limb2(g, 9, sy + 2, 4, 32, true); hand(g, 2, 31, 3, 3);                         // apunta hacia la camara
        limb2(g, 22, sy, 27, 18, false); hand(g, 26, 16, 3, 3); const m = bottleAlong(g, 27, 16, 0.12, -1);
        flameAlong(g, m[0], m[1], 0.1, -1, 8, 2.4, 2.1);
      } else {
        limb2(g, 9, sy, 6, 14, true); hand(g, 4, 12, 3, 3);
        limb2(g, 22, sy + 1, 26, 34, false); hand(g, 25, 33, 3, 3); const m = bottleAlong(g, 27, 36, 0.1, -1);
        flameAlong(g, m[0], m[1], 0.1, -1, 8, 2.4, 2.1);
      }
    } else {
      g.blit(body, BX, BY);
      g.rect(9, sy, 2, 2, P.blue); g.rect(21, sy, 2, 2, P.blue);
      if (!up) {
        limb2(g, 9, sy + 2, 3, 28, true);
        limb2(g, 22, sy + 2, 24, 35, false); g.rect(23, 34, 3, 3, P.skin); g.set(23, 34, P.skinL); g.set(25, 37, P.skin); g.set(22, 36, P.skin);
        const m = bottleAlong(g, 28, 43, 0.4, 0.92);                                       // la botella sale hacia la camara; la llama queda atras (arriba)
        flameAlong(g, 28, 42, -0.2, -1, 7, 2.2, 3.3);
        g.rect(26, 29, 1, 3, WHITE_); g.rect(30, 31, 1, 3, WHITE_);
      } else {
        limb2(g, 9, sy + 2, 4, 28, true);
        limb2(g, 22, sy, 24, 15, false); g.rect(23, 13, 3, 3, P.skin); g.set(23, 13, P.skinL); g.set(25, 12, P.skin); g.set(22, 15, P.skin);
        const m = bottleAlong(g, 28, 7, 0.15, -1);
        flameAlong(g, m[0], m[1], 0.1, -1, 5, 1.9, 3.3);
        flameAlong(g, 28, 8, 0.1, 1, 5, 1.5, 1.2);
        g.rect(26, 20, 1, 3, WHITE_); g.rect(30, 19, 1, 3, WHITE_);
      }
    }
    outlineRim(g);
    out.push(mkC(g, 16, BY + FEET_Y));
  });
  return out;
}
function buildThrowMolotov(bird) {
  const s = alexMolotovSide(bird);
  return { right: s.right, left: s.left, down: alexMolotovFront('down', bird), up: alexMolotovFront('up', bird) };
}

/* ---- Mojado (baldazo de agua): overlay de 2 gotitas-cuadros para dibujar ENCIMA de cualquier pose de Alexander, con el mismo ancla que `walk` (20x28, ancla (10,26)).
   Gotas en pelo, hombros y brazos, y chorritos que caen de los codos y del short; el cuadro 2 las baja un poco. Sin contorno oscuro (es agua). ---- */
function buildWet() {
  const out = [];
  const drops = [[7, 3], [12, 4], [5, 9], [15, 10], [3, 15], [17, 15], [8, 19], [12, 21], [6, 24], [14, 25]];
  for (let fr = 0; fr < 2; fr++) {
    const g = new G(20, 28);
    drops.forEach((q, i) => {
      const x = q[0], y = q[1] + (((i + fr) & 1) ? 1 : 0);
      g.set(x, y, WET[0]); g.set(x, y + 1, WET[1]);
      if ((i + fr) % 3 === 0) g.set(x, y + 2, WET[2]);
    });
    [[4, 17], [16, 17], [9, 22], [11, 22]].forEach((q, i) => {                                     // chorritos que gotean (cuadro 1: corto; cuadro 2: largo y gota suelta)
      const l = fr ? 3 : 1; g.rect(q[0], q[1], 1, l, WET[1]); g.set(q[0], q[1], WET[0]); g.set(q[0], q[1] + l, WET[2]);
      if (fr) g.set(q[0] + (i & 1 ? 1 : -1), q[1] + l + 2, WET[0]);
    });
    g.set(6, 2, WET[0]); g.set(13, 3, WET[0]); g.set(9, 1, WET[1]);                                  // brillo de pelo mojado
    out.push(mkC(g, 10, FEET_Y));
  }
  return out;
}
const WET_FRAMES = buildWet();

function buildAlexSet(bird, lvl, punch) {
  GD = lvl;
  try {
    const idle = {}, walk = {}, attack = {};
    ['down', 'up', 'left', 'right'].forEach(d => { walk[d] = alexWalk(d, bird); idle[d] = walk[d][0]; });
    const side = alexAttackSide(bird);
    attack.right = side.right; attack.left = side.left;
    attack.down = alexAttackDown(bird); attack.up = alexAttackUp(bird);
    if (lvl === 3) ['down', 'up', 'left', 'right'].forEach(d => { attack[d] = punch[d]; });      // sin guitarra, "atacar" es dar puñetes
    const sling = {}, ss = alexSlingSide(bird);
    sling.right = ss.right; sling.left = ss.left; sling.down = alexSlingFront('down', bird); sling.up = alexSlingFront('up', bird);
    const set = { idle: idle, walk: walk, attack: attack, sling: sling, dead: alexDead(bird), punch: punch, kick: buildKick(bird), sick: alexSick(bird), jump: buildJump(bird), throwMolotov: buildThrowMolotov(bird), wet: WET_FRAMES };
    Object.keys(HELD_KITS).forEach(k => Object.assign(set, heldSet(HELD_KITS[k], bird)));          // skateHold/skateSwing y los kits que se sumen
    return set;
  } finally { GD = 0; }
}
function buildAlex(bird) {
  /* g1/g2/g3 se hornean aqui, una sola vez al cargar (~45 ms entre las dos versiones). Misma forma que la sana. */
  const punch = buildPunch(bird), A = buildAlexSet(bird, 0, punch);
  [1, 2, 3].forEach(lvl => { A['g' + lvl] = buildAlexSet(bird, lvl, punch); });
  return A;
}

/* Caido de espaldas, cabeza a la izquierda, guitarra tirada a su lado (abajo). 30x16, ancla (15,7) = centro del torso. */
function alexDead(bird) {
  const g = new G(30, 16);
  // guitarra: mastil hacia la cabeza, caja hacia los pies
  if (GD < 3) {
    const t = new G(30, 16);
    t.rect(3, 13, 14, 1, P.woodD); t.rect(3, 14, 14, 1, P.woodD); t.rect(1, 13, 3, 2, P.head); t.set(1, 13, P.metal);
    t.disc(21, 13, 2.8, P.wood); t.disc(17.5, 13, 2.2, P.wood); t.set(20, 12, P.woodD); t.set(21, 13, P.woodD); t.set(22, 14, P.tape); t.set(23, 12, P.tape);
    t.rect(18, 15, 2, 1, P.wood);
    gtrBlit(g, t, { hx: 1.5, hy: 13.5, bx: 21, by: 13.2, rb: 2.8, side: 1 });
  }
  // piernas, sandalias (los pies caen abiertos)
  g.rect(24, 2, 5, 3, P.skin); g.rect(24, 7, 5, 3, P.skinD); g.rect(29, 1, 1, 3, P.sandal); g.rect(29, 8, 1, 3, P.sandal);
  // short
  g.rect(19, 2, 6, 8, P.shorts); g.rect(19, 2, 6, 1, P.shortsD); g.rect(19, 9, 6, 1, P.shortsD); g.set(24, 5, null); g.set(24, 6, null);
  // brazo de arriba doblado junto a la cabeza (mano abierta), brazo de abajo sobre el piso
  g.rect(8, 0, 6, 2, P.skin); g.rect(13, 0, 2, 2, P.blue); g.rect(6, 0, 2, 2, P.skin);
  g.rect(12, 10, 5, 2, P.skin); g.rect(10, 10, 2, 2, P.blue);
  // torso: rayas a lo largo del cuerpo, tirante en diagonal
  for (let y = 2; y <= 9; y++) for (let x = 9; x <= 18; x++) g.set(x, y, ((y >> 1) % 2) ? P.white : P.blue);
  g.line(10, 3, 17, 8, P.strap);
  // cabeza: pelo a la izquierda, cara hacia arriba con ojos cerrados y boca chica
  g.disc(5, 6, 4.4, P.face); g.rect(0, 3, 3, 7, P.hair); g.rect(1, 2, 3, 1, P.hair); g.rect(1, 10, 3, 1, P.hair);
  g.set(4, 3, P.faceL); g.set(5, 3, P.faceL); g.set(6, 4, P.faceL); g.set(4, 4, P.faceL);
  g.rect(6, 4, 2, 1, P.eye); g.rect(6, 8, 2, 1, P.eye);                                       // ojos cerrados (rayitas)
  g.rect(8, 6, 1, 2, P.skinD);                                                               // boca
  g.set(7, 10, P.skinD); g.set(8, 9, P.skinD);
  if (bird) titinaMini(g, 12, 3, true);                                                      // Titina sobre el pecho, atenta
  outlineRim(g);
  return mkC(g, 15, 7);
}

/* ======================== TITINA ======================== */
function titinaTiny() {
  return [0, 1].map(fr => {
    const g = new G(9, 7);
    g.rect(2, 3, 4, 2, P.pg); g.rect(1, 2, 2, 2, P.pg); g.set(0, 3, P.beak); g.set(1, 2, P.peye); g.set(6, 4, P.pgD); g.set(2, 4, P.irG);
    if (fr === 0) { g.rect(3, 1, 2, 2, P.pgL); g.set(4, 0, P.pgL); } else { g.rect(3, 5, 2, 1, P.pgL); g.set(4, 6, P.pgL); }
    g.outline();
    return mkC(g, 4, 3);
  });
}

/* ======================== ZOMBIES ======================== */
function zFront(opt, fr) {
  opt = opt || {};
  const H = opt.h || 32; const g = new G(opt.w || 20, H);
  const S = opt.skin || P.zs, SD = opt.human ? P.skinD : P.zsD, hair = opt.hair || '#3a322c', shoe = opt.shoe || '#2b2622', pants = opt.pants || '#3d4149';
  const y0 = 1 + (opt.small ? 3 : 0) + (opt.yoff ? opt.yoff[fr % opt.yoff.length] : 0);
  const tilt = opt.noTilt ? 0 : ((fr % 2) ? 1 : 0); const hx = 5 + tilt + (opt.dx || 0), bx = (opt.dx || 0);
  g.rect(hx, 2 + y0, 8, 4, hair);
  if (opt.bald) { g.set(hx + 3, 2 + y0, S); g.set(hx + 4, 2 + y0, S); g.set(hx + 5, 3 + y0, S); g.set(hx + 4, 3 + y0, S); }
  if (opt.bun) { g.rect(hx + 2, y0, 4, 2, hair); }
  if (opt.cap) { g.rect(hx - 1, 2 + y0, 10, 2, opt.cap); g.rect(hx + 1, 1 + y0, 6, 1, opt.cap); }
  g.rect(hx, 5 + y0, 8, 6, S); g.rect(hx + 1, 11 + y0, 6, 1, S); g.set(hx, 5 + y0, hair); g.set(hx + 7, 5 + y0, hair);
  if (opt.fringe) { g.rect(hx + 1, 5 + y0, 6, 1, hair); }
  if (!opt.human) { g.set(hx + 1, 6 + y0, SD); g.set(hx + 6, 9 + y0, SD); g.set(hx + 1, 8 + y0, P.zsL); g.set(hx + 3, 6 + y0, P.zsL); }
  const eyes = [[hx + 2, 7 + y0], [hx + 5, 7 + y0]];
  if (opt.blind) { g.rect(hx - 1, 7 + y0, 10, 1, '#d6d1bf'); g.set(hx + 8, 8 + y0, '#d6d1bf'); g.set(hx - 1, 6 + y0, S); g.set(hx + 8, 6 + y0, S); }
  else eyes.forEach(e => g.set(e[0], e[1], opt.human ? P.eye : P.zeye));
  const sh = opt.shout ? 1 : 0;
  if (opt.human) { g.rect(hx + 3, 9 + y0, 2, 1, SD); } else { g.rect(hx + 3, 9 + y0, 2, 1 + sh, P.mouth); g.set(hx + 4, 10 + y0 + sh, P.blood); }
  g.rect(9 + bx, 12 + y0, 2, 1, SD);
  g.rect(5 + bx, 13 + y0, 10, 6, opt.shirt || '#6b5a47');
  if (opt.straps) { g.rect(6 + bx, 13 + y0, 1, 5, opt.straps); g.rect(13 + bx, 13 + y0, 1, 5, opt.straps); }
  if (opt.collar) { g.set(8 + bx, 13 + y0, opt.collar); g.set(11 + bx, 13 + y0, opt.collar); }
  if (!opt.human) {
    g.set(8 + bx, 15 + y0, P.blood); g.set(9 + bx, 16 + y0, P.blood); g.set(12 + bx, 17 + y0, P.blood);
    g.set(5 + bx, 18 + y0, null); g.set(14 + bx, 17 + y0, null);
  }
  const am = opt.arms || 'reach', up = fr % 2;
  if (am === 'reach') { g.rect(3 + bx, (up ? 10 : 11) + y0, 2, up ? 5 : 4, S); g.rect(15 + bx, 13 + y0, 2, up ? 5 : 6, S); g.rect(3 + bx, 13 + y0, 2, 1, opt.shirt || '#6b5a47'); }
  else if (am === 'wide') { g.rect(1 + bx, 14 + y0 - (fr % 2), 4, 2, S); g.rect(15 + bx, 14 + y0 - ((fr + 1) % 2), 4, 2, S); }
  else if (am === 'hold') { g.rect(3 + bx, 14 + y0, 2, 4, S); g.rect(15 + bx, 14 + y0, 2, 4, S); }
  else if (am === 'call') {   // cobrador: un brazo arriba con la mano abierta (monedas), el otro al costado
    const sl = opt.shirt || '#6b5a47';
    g.rect(3 + bx, 14 + y0, 2, 5, S); g.rect(3 + bx, 13 + y0, 2, 2, sl);
    g.rect(15 + bx, (up ? 5 : 6) + y0, 2, up ? 8 : 7, S); g.rect(15 + bx, 12 + y0, 2, 2, sl);
    g.rect(14 + bx, (up ? 3 : 4) + y0, 4, 2, S);                       // mano abierta
    if (opt.coins) { g.set(14 + bx, (up ? 2 : 3) + y0, '#e0c24a'); g.set(16 + bx, (up ? 1 : 2) + y0, '#f2dc7a'); g.set(17 + bx, (up ? 3 : 4) + y0, '#b99a32'); }
  }
  g.rect(6 + bx, 19 + y0, 8, 3, pants); g.set(9 + bx, 21 + y0, null); g.set(10 + bx, 21 + y0, null);
  if (opt.belt) {                                                        // canguro (rinonera) al frente
    g.rect(5 + bx, 19 + y0, 10, 1, opt.belt); g.rect(8 + bx, 19 + y0, 5, 3, shade(opt.belt, 1.3)); g.set(8 + bx, 19 + y0, opt.belt); g.set(12 + bx, 19 + y0, opt.belt);
    g.set(10 + bx, 20 + y0, '#c9c5b5');
  }
  const L = opt.small ? 1 : 3;
  const l1 = [0, -1, 0, 0][fr % 4], l2 = [0, 0, 0, -1][fr % 4];
  g.rect(7 + bx, 22 + y0, 2, L + l1, SD); g.rect(6 + bx, 22 + y0 + L + l1, 3, 1, shoe);
  g.rect(11 + bx, 22 + y0, 2, L + l2, SD); g.rect(11 + bx, 22 + y0 + L + l2, 3, 1, shoe);
  if (!opt.raw) outlineRim(g);   // raw: el que lo llama (musicos, bailarines) agrega brazos/instrumentos y contornea una sola vez (si no, la luz de borde sale doble)
  return g;
}

/* Cadaver visto desde arriba, horizontal, cabeza a la izquierda. Lienzo 26x12. */
function zDead(t) {
  const pool = new G(26, 12), b = new G(26, 12);
  pool.ell(13, 7, 11.5, 4.2, '#3f1717');
  pool.ell(11, 7, 8.5, 3, P.blood);
  pool.set(2, 10, P.blood); pool.set(24, 9, '#3f1717');
  const leg = t.small ? 4 : 6;
  // brazos
  b.rect(10, 1, 7, 2, t.skin); b.rect(10, 9, 6, 2, t.skin);
  // piernas y zapatos
  b.rect(17, 3, leg, 2, t.pants); b.rect(17, 6, leg - 1, 2, t.pants);
  b.rect(17 + leg, 3, 2, 2, t.shoe); b.rect(16 + leg, 6, 2, 2, t.shoe);
  // torso
  b.rect(8, 3, 9, 5, t.shirt); b.set(11, 5, P.blood); b.set(12, 6, P.blood); b.set(14, 4, P.blood);
  // cabeza
  b.disc(5, 5.5, 3.4, t.hair);
  if (t.bald) { b.disc(5, 5.5, 3.4, t.skin); b.rect(3, 4, 1, 4, '#d6d1bf'); b.rect(4, 4, 1, 4, '#d6d1bf'); }
  else { b.rect(2, 4, 2, 3, t.skin); }
  b.set(3, 5, P.mouth);
  b.outline();
  pool.blit(b, 0, 0);
  return mkC(pool, 13, 9);
}

const ZT = {
  caminante: { opt: {}, shoeRow: 26, dead: { shirt: '#6b5a47', pants: '#3d4149', skin: P.zs, hair: '#3a322c', shoe: '#2b2622' } },
  escolar: { opt: { small: true, shirt: '#dcdcd4', pants: '#7a7c80', hair: '#2c2826', fringe: true, straps: '#3b4f8a', collar: '#9a9a94' }, shoeRow: 27,
    dead: { shirt: '#dcdcd4', pants: '#7a7c80', skin: P.zs, hair: '#2c2826', shoe: '#2b2622', small: true } },
  ciego: { opt: { blind: true, arms: 'wide', shirt: '#5d4f6a', bald: true }, shoeRow: 26, dead: { shirt: '#5d4f6a', pants: '#3d4149', skin: P.zs, hair: '#3a322c', shoe: '#2b2622', bald: true } },
  cobrador: { opt: { cap: '#8f3d35', shout: true, belt: '#5a3a22', coins: true, arms: 'call', shirt: '#a0683a', pants: '#464b57', hair: '#332c28', shoe: '#33291f' }, shoeRow: 26,
    dead: { shirt: '#a0683a', pants: '#464b57', skin: P.zs, hair: '#332c28', shoe: '#33291f' } }
};
function buildZombie(name) {
  const t = ZT[name], walk = [], hurt = [];
  for (let fr = 0; fr < 4; fr++) {
    const g = zFront(t.opt, fr);
    walk.push(mkC(g, 10, t.shoeRow));
    hurt.push(mkC(g.solid('#ffffff'), 10, t.shoeRow));
  }
  return { walk: walk, hurt: hurt, dead: zDead(t.dead) };
}

/* ======================== TILES (16x16) ======================== */
function tile(fn) { const g = new G(16, 16); fn(g); return mkC(g); }
function speckle(g, r, cols, n) { for (let i = 0; i < n; i++) g.set(Math.floor(r() * 16), Math.floor(r() * 16), cols[Math.floor(r() * cols.length)]); }

const ASPH = '#585a5c', ASPH_N = ['#535557', '#616365', '#4e5052', '#5d5f61'];
function asphaltBase(g, seed) {
  const r = rng(seed);
  g.rect(0, 0, 16, 16, ASPH); speckle(g, r, ASPH_N, 26);
  for (let i = 0; i < 2; i++) { const x = Math.floor(r() * 14), y = Math.floor(r() * 16); g.set(x, y, '#6a6c6e'); g.set(x + 1, y, '#5f6163'); }
  return r;
}
function asphalt(seed) { return tile(g => asphaltBase(g, seed)); }
function asphaltCrack() {
  return tile(g => {
    asphaltBase(g, 77);
    const pts = [[3, 2], [5, 4], [5, 6], [7, 8], [6, 10], [9, 12], [11, 13]];
    for (let i = 0; i < pts.length - 1; i++) g.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], '#35373a');
    g.line(7, 8, 11, 7, '#3f4143'); g.line(6, 10, 3, 12, '#3f4143');
    [[4, 2], [6, 4], [8, 8], [7, 10], [10, 12]].forEach(p => g.set(p[0], p[1], '#6c6e70'));
  });
}
function laneDash() {
  return tile(g => {
    asphaltBase(g, 31);
    g.rect(7, 1, 2, 8, '#9e9a78');
    g.rect(7, 1, 1, 8, '#a8a482');
    [[8, 3], [7, 6], [8, 8], [7, 1]].forEach(p => g.set(p[0], p[1], '#8b8769'));   // pintura gastada
    g.set(8, 5, ASPH);
  });
}

const SW_BASE = '#9a9b95', SW_JOINT = '#878882', SW_HI = '#a9aaa4', SW_N = ['#92938d', '#a1a29c', '#8f908a'];
function sidewalkBase(g, seed) {
  const r = rng(seed);
  g.rect(0, 0, 16, 16, SW_BASE); speckle(g, r, SW_N, 16);
  g.rect(0, 0, 16, 1, SW_HI); g.rect(0, 15, 16, 1, SW_JOINT); g.rect(15, 0, 1, 16, SW_JOINT);
  g.set(15, 0, SW_JOINT);
  return r;
}
function sidewalk(v) {
  return tile(g => {
    sidewalkBase(g, 100 + v);
    if (v === 1) { g.rect(7, 1, 1, 14, SW_JOINT); g.set(7, 1, SW_BASE); g.rect(2, 5, 3, 2, '#8a8b85'); }
    if (v === 2) {
      g.line(3, 3, 6, 6, '#7d7e79'); g.line(6, 6, 6, 9, '#7d7e79'); g.line(6, 9, 9, 11, '#7d7e79');
      g.rect(11, 9, 2, 1, '#6e6f6a'); g.set(12, 10, '#8a8b85');
    }
  });
}
function curbW() {
  const g = new G(16, 16);
  const r = rng(555);
  g.rect(0, 0, 10, 16, SW_BASE);
  for (let i = 0; i < 8; i++) g.set(Math.floor(r() * 10), Math.floor(r() * 16), SW_N[i % 3]);
  g.rect(0, 0, 10, 1, SW_HI); g.rect(0, 15, 10, 1, SW_JOINT);
  g.rect(10, 0, 1, 16, '#b3b4ae');                 // filo claro del sardinel
  g.rect(11, 0, 2, 16, '#85867f');                 // cara del sardinel
  g.rect(11, 0, 1, 16, '#8c8d86');
  g.rect(13, 0, 1, 16, '#4b4d4f');                 // sombra del cantilo
  g.rect(14, 0, 2, 16, ASPH);
  for (let i = 0; i < 6; i++) g.set(14 + Math.floor(r() * 2), Math.floor(r() * 16), ASPH_N[i % 4]);
  g.set(12, 4, '#6f706a'); g.set(11, 11, '#6f706a'); g.set(12, 12, '#6f706a');   // desgaste
  return g;
}

const BERMA_N = ['#7d725c', '#968b73', '#847a63'];
function berma(v) {
  return tile(g => {
    const r = rng(300 + v * 17);
    g.rect(0, 0, 16, 16, '#8a7f68'); speckle(g, r, BERMA_N, 30);
    const n = 3 + v;
    for (let i = 0; i < n; i++) {                   // pastito seco
      const x = 1 + Math.floor(r() * 13), y = 1 + Math.floor(r() * 13);
      g.set(x, y, '#a89c5e'); g.set(x, y - 1, '#a89c5e'); g.set(x + 1, y - 1, '#7a7240'); if (i % 2) g.set(x - 1, y - 1, '#7a7240');
    }
    if (v === 1) { g.set(4, 12, '#6a604d'); g.set(5, 12, '#6a604d'); g.set(5, 13, '#6a604d'); }
    if (v === 2) { g.set(11, 4, '#9c9a94'); g.set(12, 4, '#8a8882'); g.set(11, 5, '#7e7c76'); }
  });
}

const ALLEY_N = ['#514d46', '#6a655c', '#58534b'];
function alley(v) {
  return tile(g => {
    const r = rng(900 + v * 13);
    g.rect(0, 0, 16, 16, '#5f5a52'); speckle(g, r, ALLEY_N, 34);
    for (let i = 0; i < 4; i++) g.set(Math.floor(r() * 16), Math.floor(r() * 16), '#7b766c');   // piedritas
    if (v === 0) { g.ell(5, 10, 3.5, 2, '#4a4742'); g.set(4, 9, '#55524c'); }
    if (v === 1) { g.rect(9, 3, 4, 1, '#47443f'); g.rect(10, 4, 3, 1, '#47443f'); g.set(11, 8, '#9a9488'); g.set(12, 8, '#7e7a6f'); }
    if (v === 2) { g.line(2, 4, 7, 5, '#48453f'); g.ell(11, 11, 2.5, 1.5, '#4a4742'); g.set(3, 13, '#7a6a4a'); }
  });
}

const ROOF_N = ['#82837e', '#96978f', '#7c7d78'];
function roof(v) {
  return tile(g => {
    const r = rng(1200 + v * 7);
    g.rect(0, 0, 16, 16, '#8c8d88'); speckle(g, r, ROOF_N, 30);
    if (v === 0) {                                  // fierros de construccion
      [[3, 4], [9, 3], [11, 10], [4, 11]].forEach(p => {
        g.rect(p[0], p[1], 1, 3, '#3e3a36'); g.set(p[0], p[1] - 1, '#8a4a32'); g.set(p[0] + 1, p[1] + 2, '#6f706b'); g.set(p[0] + 1, p[1] + 3, '#6f706b');
      });
    } else if (v === 1) {                           // mancha de tanque de agua
      g.ell(8, 8, 6, 5, '#7b7c77'); g.ell(8, 8, 4, 3, '#74756f');
      g.set(3, 8, '#66675f'); g.set(13, 8, '#66675f'); g.set(8, 3, '#66675f'); g.set(8, 13, '#66675f');
      g.line(6, 12, 6, 14, '#6a6b66'); g.line(10, 11, 11, 14, '#6a6b66');
    } else {                                        // parche de brea y grieta
      g.rect(2, 3, 6, 4, '#5e5f5c'); g.rect(3, 7, 4, 1, '#5e5f5c'); g.set(2, 3, null); g.set(2, 3, '#8c8d88');
      g.set(3, 4, '#6a6b67'); g.set(6, 5, '#6a6b67');
      g.line(9, 8, 12, 11, '#6a6b67'); g.line(12, 11, 11, 14, '#6a6b67');
      g.set(12, 3, '#6f706b'); g.set(13, 3, '#6f706b'); g.set(13, 4, '#6f706b');
    }
  });
}

function wallBrick() {
  return tile(g => {
    const r = rng(2024), cols = ['#86574a', '#7f5044', '#8c5e4f', '#7a4d42'];
    g.rect(0, 0, 16, 16, '#6e463b');                 // mortero
    for (let row = 0; row < 4; row++) {
      const off = (row % 2) ? 4 : 0;
      for (let k = -1; k < 3; k++) {
        const x = off + k * 8;
        const c = cols[Math.floor(r() * cols.length)];
        for (let j = 0; j < 3; j++) for (let i = 0; i < 7; i++) {
          const px = x + i; if (px < 0 || px > 15) continue;
          g.set(px, row * 4 + j, c);
        }
        g.set(Math.max(0, Math.min(15, x + 1 + Math.floor(r() * 5))), row * 4, shade(c, 1.12));
        if (r() < .3) g.set(Math.max(0, Math.min(15, x + 2 + Math.floor(r() * 4))), row * 4 + 2, shade(c, .82));
      }
    }
  });
}
function wallPaint(base) {
  return tile(g => {
    const r = rng(base.charCodeAt(1) * 31 + base.charCodeAt(3));
    g.rect(0, 0, 16, 16, base); speckle(g, r, [shade(base, .96), shade(base, 1.05)], 26);
    g.rect(0, 0, 16, 1, shade(base, 1.1));
    g.rect(0, 13, 16, 3, shade(base, .72));          // zocalo
    g.rect(0, 13, 16, 1, shade(base, .62));
    for (let i = 0; i < 3; i++) { const x = 1 + Math.floor(r() * 13); g.line(x, 2, x + (i % 2), 3 + Math.floor(r() * 5), shade(base, .88)); }   // chorreras
    for (let i = 0; i < 3; i++) g.rect(2 + Math.floor(r() * 10), 6 + Math.floor(r() * 5), 2, 1, shade(base, 1.15));    // pintura saltada
  });
}
function door() {
  return tile(g => {
    const r = rng(4242);
    g.rect(0, 0, 16, 16, '#8a8984'); speckle(g, r, ['#82817c', '#92918c'], 14);
    g.rect(2, 0, 12, 16, '#2c3033');                // marco
    g.rect(3, 1, 10, 15, '#55595d');                // hoja
    for (let y = 3; y < 16; y += 3) g.rect(3, y, 10, 1, '#45494d');   // nervaduras
    g.rect(3, 1, 10, 1, '#666b6f');
    g.rect(3, 1, 1, 15, '#62666a'); g.rect(12, 1, 1, 15, '#494d51');
    g.rect(9, 8, 2, 2, '#c9b86a'); g.set(9, 8, '#e6d98a');                     // manija
    g.rect(9, 11, 2, 1, '#2a2a2a');                                              // chapa
    g.line(5, 10, 5, 15, '#7a5a44'); g.line(6, 12, 6, 15, '#6a4c38'); g.set(11, 4, '#7a5a44');   // oxido
    g.rect(2, 15, 12, 1, '#6f706b');                                             // umbral
  });
}
function windowTile() {
  return tile(g => {
    const r = rng(5151);
    g.rect(0, 0, 16, 16, '#8a8984'); speckle(g, r, ['#82817c', '#92918c'], 14);
    g.rect(1, 2, 14, 11, '#6a6b66');                // marco
    g.rect(2, 3, 12, 9, '#252a2d');                 // vidrio oscuro
    [[3, 10], [4, 9], [5, 8], [9, 6], [10, 5], [11, 4]].forEach(p => g.set(p[0], p[1], '#363d41'));
    for (let x = 4; x <= 11; x += 3) g.rect(x, 3, 1, 9, '#7c7e7f');                   // rejas
    g.rect(2, 7, 12, 1, '#6d6f70');
    g.rect(0, 13, 16, 1, '#a3a49e'); g.rect(0, 14, 16, 1, '#6f706b');                 // alfeizar
    g.set(6, 1, '#6f706b'); g.set(7, 1, '#6f706b'); g.set(8, 1, '#6f706b');
  });
}
function stairs() {
  return tile(g => {
    const r = rng(8080);
    for (let y = 0; y < 16; y++) {
      const k = y % 4;
      const c = k === 0 ? '#adaea8' : (k === 3 ? '#6a6b66' : '#a0a19b');
      g.rect(0, y, 16, 1, k === 2 ? '#989993' : c);
    }
    for (let i = 0; i < 18; i++) {
      const y = Math.floor(r() * 16); if (y % 4 === 3) continue;
      g.set(Math.floor(r() * 16), y, r() < .5 ? '#929389' : '#aaaba5');
    }
    g.rect(2, 3, 5, 1, '#5d5e59'); g.rect(10, 7, 4, 1, '#5d5e59'); g.rect(5, 11, 6, 1, '#5d5e59');   // sombra del peldano
    g.set(12, 1, '#7a7b76'); g.set(13, 2, '#7a7b76');   // desgaste
  });
}

/* ======================== PROPS ======================== */
const SHADOW = 'rgba(20,18,22,0.30)';

/* Combi volcada de costado, vista desde arriba: la cara de las ventanas queda arriba,
   el techo mira al sur (franja), el chasis y las llantas asoman al norte. 80x32. */
function propCombi() {
  const g = new G(80, 32);
  const CREAM = '#cfccbf', CREAM_D = '#bdbab0';
  // llantas asomando por el norte
  [16, 62].forEach(cx => { g.disc(cx, 4, 4.5, '#232323'); g.disc(cx, 4, 2, '#3a3a3a'); g.set(cx, 4, '#8a8a8a'); g.set(cx - 1, 3, '#6a6a6a'); });
  g.rect(3, 6, 74, 3, '#4a4d50');                   // chasis
  g.rect(8, 6, 60, 1, '#5d6064'); g.rect(30, 7, 12, 1, '#6b6e70');
  // costado (cara de ventanas) hacia arriba
  g.rect(1, 9, 78, 14, CREAM);
  g.set(1, 9, null); g.set(78, 9, null); g.set(1, 22, null); g.set(78, 22, null);
  g.rect(1, 17, 78, 6, CREAM_D);
  g.rect(1, 19, 78, 2, '#9b4a3e');                  // franja roja
  for (let i = 0; i < 5; i++) {                     // ventanas
    const x = 5 + i * 14;
    if (i === 3) continue;                          // puerta corrediza
    g.rect(x, 11, 11, 5, '#3a4246');
    g.rect(x + 1, 12, 3, 1, '#566067');
  }
  g.rect(47, 10, 11, 12, '#a9a69b'); g.rect(47, 10, 1, 12, '#8c897f'); g.rect(57, 10, 1, 12, '#8c897f');   // puerta corrediza
  g.rect(49, 12, 7, 3, '#2a2e30'); g.set(50, 13, '#e6e6e0'); g.set(54, 12, '#e6e6e0');   // vidrio roto
  g.set(8, 13, '#e6e6e0'); g.set(31, 14, '#e6e6e0');
  g.rect(1, 12, 1, 4, '#3a4246'); g.rect(78, 12, 1, 4, '#3a4246');           // parabrisas de los extremos
  g.rect(20, 18, 5, 1, '#8c897f'); g.rect(66, 17, 6, 2, '#7a5a44'); g.set(70, 18, '#7a5a44');   // abolladuras y oxido
  // techo hacia el sur
  g.rect(2, 23, 76, 5, '#a9a69b');
  for (let x = 4; x < 78; x += 6) g.rect(x, 23, 1, 5, '#8c897f');
  g.rect(2, 27, 76, 1, '#7d7a70');
  g.rect(60, 24, 10, 3, '#7a5a44');                 // oxido en el techo
  g.outline();
  g.ell(40, 29.5, 36, 1.6, SHADOW);
  return mkC(g, 40, 28, 72, 18);
}

/* Auto abandonado visto 3/4 desde arriba, apuntando al norte. 32x48. */
function propCar() {
  const g = new G(32, 48);
  const B = '#6d7a7d', BL = '#7d8a8c', BD = '#59666a';
  g.rect(3, 1, 26, 38, B);
  [[3, 1], [28, 1], [3, 38], [28, 38]].forEach(p => g.set(p[0], p[1], null));
  g.rect(5, 2, 22, 11, BL);                         // capo
  g.rect(15, 2, 2, 10, BD);
  g.rect(5, 14, 22, 6, '#2c3236');                  // parabrisas
  g.line(8, 15, 14, 19, '#4c555a'); g.line(14, 19, 12, 15, '#4c555a'); g.set(20, 16, '#4c555a'); g.set(21, 17, '#4c555a');   // grietas
  g.rect(4, 20, 24, 12, BL);                        // techo
  g.rect(5, 21, 22, 1, '#8d999b');
  g.rect(4, 20, 1, 12, BD); g.rect(27, 20, 1, 12, BD);
  g.rect(5, 33, 22, 4, '#2c3236');                  // luneta
  g.set(10, 34, '#4c555a'); g.set(11, 35, '#4c555a');
  g.rect(3, 30, 2, 2, BD); g.rect(27, 30, 2, 2, BD);
  g.rect(2, 16, 1, 2, BD); g.rect(29, 16, 1, 2, BD);                 // espejos
  g.rect(8, 5, 6, 3, '#7a5a44'); g.rect(20, 24, 5, 4, '#7a5a44'); g.set(9, 8, '#7a5a44'); g.set(22, 28, '#7a5a44');   // oxido
  g.rect(6, 11, 2, 1, '#8a8a82');                   // faros
  g.rect(24, 11, 2, 1, '#8a8a82');
  // parte de atras (cara sur)
  g.rect(3, 39, 26, 5, '#55616a');
  g.rect(3, 39, 26, 1, '#4a555d');
  g.rect(5, 40, 4, 2, '#8a3a34'); g.rect(23, 40, 4, 2, '#8a3a34');   // luces traseras
  g.rect(13, 41, 6, 2, '#c9c2a0'); g.set(15, 42, '#8a8670');          // placa
  g.rect(2, 44, 28, 2, '#3a3d40');                  // parachoques
  g.rect(3, 44, 4, 3, '#1e1e1e'); g.rect(25, 44, 4, 3, '#1e1e1e');   // llantas
  g.outline();
  g.rect(5, 47, 22, 1, SHADOW);
  return mkC(g, 16, 46, 26, 32);
}

/* Mototaxi de tres ruedas con toldo. 32x32. */
function propMototaxi() {
  const g = new G(32, 32);
  g.rect(14, 0, 4, 4, '#232323'); g.set(15, 1, '#6a6a6a');          // rueda delantera
  g.rect(15, 3, 2, 4, '#3d3d3d');                                    // horquilla
  g.rect(11, 4, 10, 1, '#3d3d3d');                                   // manubrio
  g.rect(9, 6, 14, 3, '#3a5062'); g.rect(10, 7, 4, 1, '#566b7c');    // parabrisas
  g.rect(5, 8, 22, 13, '#6d3a35');                                   // toldo
  g.rect(5, 8, 22, 2, '#7b4540');
  for (let x = 8; x < 27; x += 5) g.rect(x, 10, 1, 11, '#5a2f2b');
  g.rect(5, 19, 22, 2, '#4f2a27');
  g.set(5, 8, null); g.set(26, 8, null);
  g.rect(8, 14, 5, 3, '#7a5a44'); g.set(20, 12, '#8a6a54');          // remiendos
  // atras: asiento y ruedas
  g.rect(7, 21, 18, 6, '#2a2a2a');
  g.rect(8, 22, 16, 3, '#4a5a63'); g.rect(8, 22, 16, 1, '#5d6e78');
  g.rect(12, 25, 8, 1, '#3d3d3d');                                   // parachoque
  g.disc(4.5, 24, 3.2, '#232323'); g.disc(27.5, 24, 3.2, '#232323');
  g.set(4, 24, '#8a8a8a'); g.set(27, 24, '#8a8a8a');
  g.rect(14, 26, 4, 1, '#e7e2b0');                                   // placa
  g.outline();
  g.rect(5, 29, 22, 1, SHADOW);
  return mkC(g, 16, 28, 22, 18);
}

function bag(g, cx, cy, r, col, tie) {
  g.disc(cx, cy, r, col);
  g.set(cx - Math.round(r * .4), cy - Math.round(r * .4), shade(col, 1.9));       // brillo
  g.set(cx - Math.round(r * .4) + 1, cy - Math.round(r * .4), shade(col, 1.5));
  g.set(cx, cy - Math.ceil(r), col); g.set(cx + 1, cy - Math.ceil(r) - 1, col);   // nudo
  g.set(cx + Math.round(r * .5), cy + Math.round(r * .5), shade(col, .7));
  if (tie) g.set(cx, cy - Math.ceil(r) + 1, tie);
}
function propTrash() {
  const g = new G(28, 18);
  g.rect(4, 10, 8, 4, '#7a6a4a'); g.rect(4, 10, 8, 1, '#8a7a58'); g.line(5, 12, 10, 12, '#675a3e');   // carton
  bag(g, 9, 11, 4.5, '#2e2e30');
  bag(g, 17, 11, 4.8, '#3c3a36', '#8a8a80');
  bag(g, 22, 12, 3.5, '#2a2b2e');
  bag(g, 13, 6.5, 4, '#9a9a90', '#4a4a44');          // bolsa clara
  bag(g, 18, 5.5, 3.2, '#2e2e30');
  g.set(6, 14, '#5f8a6a'); g.set(7, 14, '#5f8a6a'); g.set(24, 9, '#b0a070'); g.set(3, 13, '#6f6f68');     // botella, papeles
  g.outline();
  g.rect(3, 17, 22, 1, SHADOW);
  return mkC(g, 14, 16, 22, 9);
}
function propBags() {
  const g = new G(18, 14);
  bag(g, 5, 9, 3.6, '#2e2e30');
  bag(g, 11, 9, 3.3, '#3c3a36', '#8a8a80');
  bag(g, 8, 5.5, 2.8, '#2a2b2e');
  g.set(14, 11, '#b0a070'); g.set(15, 11, '#9a9a90');
  g.outline();
  g.rect(3, 13, 12, 1, SHADOW);
  return mkC(g, 9, 12, 14, 6);
}

/* Poste de concreto, alto y delgado, con cruceta y cables colgando. 20x64. */
function propPoste() {
  const g = new G(20, 64);
  g.rect(8, 8, 4, 54, '#7d7e78');
  g.rect(8, 8, 1, 54, '#8e8f88'); g.rect(11, 8, 1, 54, '#64655f');
  for (let y = 16; y < 58; y += 11) g.rect(8, y, 4, 1, '#6a6b66');                 // juntas del concreto
  g.rect(7, 56, 6, 6, '#6d6e68'); g.rect(7, 56, 1, 6, '#7d7e78'); g.rect(12, 56, 1, 6, '#55564f');   // base
  g.rect(8, 8, 4, 2, '#8e8f88');
  g.rect(1, 9, 18, 2, '#4a4a46');                  // cruceta
  g.rect(1, 9, 18, 1, '#5a5a56');
  [2, 9, 16].forEach(x => { g.rect(x, 6, 2, 3, '#c9c9be'); g.set(x, 6, '#e6e6e0'); });   // aisladores
  g.rect(8, 28, 4, 6, '#55595d'); g.rect(9, 29, 2, 2, '#2c3033'); g.set(10, 33, '#8a8a82');   // caja del medidor
  g.rect(9, 22, 2, 1, '#5d5e58'); g.set(10, 40, '#3a3a38');
  g.line(3, 8, 1, 14, '#262626'); g.line(10, 8, 12, 15, '#262626'); g.line(17, 8, 18, 13, '#262626');   // cables colgando
  g.line(9, 50, 9, 52, '#8a6a54');                 // fierro oxidado
  g.outline();
  g.rect(5, 62, 12, 2, SHADOW);
  return mkC(g, 10, 61, 4, 4);
}

/* Paradero (techo de calamina, panel con afiches, banca). 48x44. */
function propParadero() {
  const g = new G(48, 44);
  g.rect(2, 10, 3, 30, '#55595d'); g.rect(43, 10, 3, 30, '#55595d');            // postes
  g.rect(2, 10, 1, 30, '#666b6f'); g.rect(43, 10, 1, 30, '#666b6f');
  g.rect(5, 12, 38, 18, '#6f7378');                                                // panel trasero
  g.rect(5, 29, 38, 1, '#55595d');
  g.rect(8, 14, 13, 13, '#a89a7a'); g.rect(9, 16, 11, 2, '#8a7f66'); g.rect(9, 20, 7, 1, '#8a7f66'); g.rect(9, 23, 9, 1, '#8a7f66');   // afiche viejo
  g.rect(25, 14, 11, 13, '#7a8a96'); g.rect(26, 15, 9, 4, '#8f9ea8'); g.rect(26, 22, 6, 1, '#667682');
  g.rect(37, 20, 4, 7, '#7a6a5a'); g.rect(38, 22, 2, 1, '#9a8a7a');
  g.rect(0, 2, 48, 9, '#8d9296');                                                  // techo de calamina
  g.rect(0, 2, 48, 5, '#9ea3a6');
  for (let x = 2; x < 48; x += 4) g.rect(x, 2, 1, 5, '#868b8f');
  g.rect(0, 7, 48, 3, '#6d7276'); g.rect(0, 10, 48, 1, '#4f5356');
  g.rect(6, 3, 5, 2, '#8a5a44'); g.rect(30, 4, 6, 2, '#8a5a44'); g.set(12, 8, '#8a5a44'); g.set(33, 8, '#8a5a44');
  g.rect(10, 31, 28, 3, '#7a5a3a'); g.rect(10, 31, 28, 1, '#8c6a46');             // banca
  g.rect(11, 34, 2, 6, '#3d3d3d'); g.rect(35, 34, 2, 6, '#3d3d3d');
  g.line(20, 31, 20, 33, '#5a3f26'); g.line(28, 31, 28, 33, '#5a3f26');
  g.outline();
  g.rect(3, 41, 42, 2, SHADOW);
  return mkC(g, 24, 41, 40, 8);
}

/* ARTE-CALLAO-BEGIN */
/* ======================== ARTE CALLAO v0.3 ======================== */
/* Fuente 3x5 para letreritos (inventados, a mano) */
const FONT = ACH.px.fonts.a5.g;   // 3x5: ahora compartida con base.js (a5 completa el alfabeto: Ñ, acentos, signos)
function txt(g, x, y, s, c, pitch, r, miss) {
  pitch = pitch || 4;
  for (let k = 0; k < s.length; k++) {
    const gl = FONT[s[k]]; if (!gl) continue;
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++)
      if (gl[j][i] === '#' && !(r && miss && r() < miss)) g.set(x + k * pitch + i, y + j, c);
  }
  return x + s.length * pitch - (pitch - 3);
}
function rust(g, r, n, x0, y0, x1, y1, cols) {
  cols = cols || ['#8a4b38', '#7a4a36', '#a0603f'];
  for (let i = 0; i < n; i++) {
    const x = x0 + Math.floor(r() * (x1 - x0 + 1)), y = y0 + Math.floor(r() * (y1 - y0 + 1));
    if (g.get(x, y)) g.set(x, y, cols[Math.floor(r() * cols.length)]);
  }
}
function shadowE(g, cx, cy, rx, ry) {          // sombra solo donde no hay pixeles
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1 && !g.get(x, y)) g.set(x, y, SHADOW);
    }
}
function wheel(g, cx, cy, r) {
  g.disc(cx, cy, r, '#232323'); g.disc(cx, cy, r * 0.55, '#3a3a3a'); g.set(cx, cy, '#8a8a8a'); g.set(cx - 1, cy - 1, '#6a6a6a');
}
function tri(g, x1, y1, x2, y2, x3, y3, fn) {
  const minx = Math.floor(Math.min(x1, x2, x3)), maxx = Math.ceil(Math.max(x1, x2, x3)), miny = Math.floor(Math.min(y1, y2, y3)), maxy = Math.ceil(Math.max(y1, y2, y3));
  const d = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
  for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
    const a = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / d, b = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / d, c = 1 - a - b;
    if (a >= -0.001 && b >= -0.001 && c >= -0.001) { const col = fn(x, y); if (col) g.set(x, y, col); }
  }
}

/* ---------- Tiles: almacenes de la Gambetta ---------- */
const SALITRE = '#C9C5B5';
function whWall(v) {
  return tile(g => {
    const r = rng(6100 + v * 9), W = '#8d8b84';
    g.rect(0, 0, 16, 16, W); speckle(g, r, ['#85837c', '#95938c', '#7f7d77'], 24);
    g.rect(0, 0, 16, 1, '#a2a099'); g.rect(0, 1, 16, 1, '#76746e');                  // remate del muro
    g.rect(0, 2, 1, 14, '#7a7872'); g.rect(8, 2, 1, 14, '#7b7973'); g.rect(9, 2, 1, 14, '#96948d');   // juntas de paneles de concreto
    [[4, 5], [12, 5]].forEach(p => g.set(p[0], p[1], '#77756f'));    // huecos de encofrado
    for (let i = 0; i < 2; i++) { const x = 2 + Math.floor(r() * 12); g.line(x, 2, x, 5 + Math.floor(r() * 4), '#85837d'); }   // chorreras de mugre
    for (let x = 0; x < 16; x++) {                                                      // franja de salitre abajo
      const top = 11 + Math.floor(r() * 2) - ((x % 5 === 0) ? 1 : 0);
      for (let y = top; y < 16; y++) g.set(x, y, r() < .8 ? SALITRE : (r() < .5 ? '#bdb9a9' : '#d4d0c2'));
      if (r() < .5) g.set(x, top - 1, '#a9a69a');
    }
    g.rect(0, 15, 16, 1, '#8a867a'); g.set(3, 13, '#a9a69a'); g.set(10, 12, '#a9a69a');
    if (v === 1) {                                                                       // letras desteñidas (inventadas)
      txt(g, 0, 3, 'D-12', '#b6b4ab', 4, r, .22);
      g.rect(1, 9, 14, 1, '#7f8a92'); g.set(5, 9, W); g.set(11, 9, W);                  // franja pintada gastada
    } else {
      g.rect(1, 6, 3, 1, '#7a7872'); g.set(13, 7, '#6f6d67');                           // mancha de aceite
    }
  });
}
function whGate() {
  return tile(g => {
    const r = rng(6200);
    g.rect(0, 0, 16, 3, '#4a4d50'); g.rect(0, 0, 16, 1, '#6a6e72');                    // riel superior
    [[3, 2], [11, 2]].forEach(p => g.set(p[0], p[1], SALITRE));                          // rodillos
    for (let x = 0; x < 16; x++) {                                                        // chapa ondulada
      const m = x % 4, c = m === 0 ? '#b4bfc2' : (m === 1 ? '#9ba7ab' : (m === 2 ? '#859195' : '#74807f'));
      g.rect(x, 3, 1, 12, c);
    }
    g.rect(0, 8, 16, 1, '#66727a'); g.rect(0, 9, 16, 1, '#b4bfc2');                      // refuerzo horizontal
    g.rect(0, 14, 16, 2, '#3d4043'); g.rect(0, 14, 16, 1, '#52565a');                    // riel inferior
    g.rect(0, 3, 1, 11, '#4a4f52');                                                       // junta de hojas
    g.rect(10, 10, 4, 1, '#3a3d40'); g.rect(11, 11, 2, 2, '#c9b86a'); g.set(11, 11, '#e6d98a'); g.set(12, 10, '#c9c9be');   // aldaba y candado
    g.line(4, 4, 4, 7, '#9a6a4c'); g.line(9, 10, 9, 13, '#9a6a4c');
    rust(g, r, 6, 0, 4, 15, 13, ['#9a6a4c', '#8a5a40']);
    g.rect(2, 11, 3, 1, '#66727a');                                                       // abolladura
  });
}
function roofWarehouse(v) {
  return tile(g => {
    const r = rng(6300 + v * 11);
    if (v === 0) {                                                                       // lamina galvanizada
      for (let x = 0; x < 16; x++) { const m = x % 4; g.rect(x, 0, 1, 16, m === 0 ? '#b3b7b9' : (m === 1 ? '#a1a6a9' : (m === 2 ? '#8b9093' : '#797e81'))); }
      for (let i = 0; i < 3; i++) { const x = Math.floor(r() * 14), y = Math.floor(r() * 12); g.rect(x, y, 2, 3 + Math.floor(r() * 3), '#8a5a44'); g.set(x, y, '#a0603f'); }
      [[1, 3], [5, 3], [9, 3], [13, 3], [1, 11], [5, 11], [9, 11], [13, 11]].forEach(p => g.set(p[0], p[1], '#5d6064'));   // tornillos
      g.rect(0, 7, 16, 1, '#6d7275'); g.rect(0, 8, 16, 1, '#b3b7b9');
    } else {                                                                             // techo plano con tragaluz
      g.rect(0, 0, 16, 16, '#8c8d88'); speckle(g, r, ['#82837e', '#96978f', '#7c7d78'], 30);
      g.rect(2, 3, 10, 7, '#5d6064'); g.rect(3, 4, 8, 5, '#93a3a8'); g.rect(3, 4, 8, 1, '#a9b8bc'); g.rect(7, 4, 1, 5, '#5d6064'); g.set(5, 6, '#b9c6c9'); g.set(9, 7, '#7d8e93');
      g.disc(12.5, 13, 1.8, '#4a4d50'); g.set(12, 12, '#7a7d80');                       // ventilador
      g.rect(2, 12, 6, 2, '#5e5f5c'); g.set(3, 12, '#6a6b67');                          // parche de brea
    }
  });
}
function bodegaShutter() {
  return tile(g => {
    const r = rng(6400);
    g.rect(0, 0, 16, 16, '#b3a793'); speckle(g, r, ['#a99d8a', '#bdb19d'], 22);
    g.rect(1, 0, 14, 4, '#5c6165'); g.rect(1, 0, 14, 1, '#757a7e'); g.rect(1, 3, 14, 1, '#44484b');   // caja del rollo
    [3, 8, 12].forEach(x => g.set(x, 2, '#8a8e91'));
    for (let y = 4; y < 16; y++) g.rect(2, y, 12, 1, (y % 2) ? '#7e868a' : '#6a7276');   // laminas
    g.rect(1, 4, 1, 12, '#44484b'); g.rect(14, 4, 1, 12, '#44484b');                   // guias
    g.rect(2, 14, 12, 2, '#4a4f52'); g.rect(2, 14, 12, 1, '#62676b');                   // barra de abajo
    g.set(6, 10, '#c9c9be'); g.set(6, 11, '#c9c9be'); g.set(7, 10, '#c9c9be'); g.set(8, 10, '#c9c9be'); g.set(8, 11, '#c9c9be');   // grillete
    g.rect(6, 12, 3, 3, '#c9b86a'); g.set(6, 12, '#e6d98a'); g.set(7, 13, '#2a2a2a');   // candado
    g.set(4, 6, '#D98A9E'); g.set(5, 7, '#D98A9E'); g.set(6, 6, '#D98A9E'); g.set(11, 8, '#d9d6c8'); g.set(12, 9, '#d9d6c8');   // pintas
    rust(g, r, 8, 2, 5, 13, 15);
    g.rect(0, 15, 16, 1, '#8f8576');
  });
}
function bodegaSign(v) {
  const W = ['#8FB3BE', '#9DB59E', '#E0B79A'], BAND = ['#a8453a', '#34466e', '#3f6f68'], INK = ['#efe6d0', '#e6c85a', '#f3efe2'], TX = ['ROSA', 'DON*', 'LUZ'];
  return tile(g => {
    const r = rng(6500 + v * 7), w = W[v];
    g.rect(0, 0, 16, 16, w); speckle(g, r, [shade(w, .95), shade(w, 1.06)], 28);
    g.rect(0, 0, 16, 1, shade(w, 1.12));
    g.rect(0, 2, 16, 8, BAND[v]); g.rect(0, 2, 16, 1, shade(BAND[v], 1.2)); g.rect(0, 9, 16, 1, shade(BAND[v], .78));   // franja pintada a mano
    let x0 = v === 2 ? 2 : 0;
    for (let k = 0; k < TX[v].length; k++) {
      const gl = FONT[TX[v][k]];
      for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (gl[j][i] === '#' && r() > .06) g.set(x0 + k * 4 + i, 3 + j, INK[v]);
    }
    g.rect(0, 11, 16, 1, shade(BAND[v], 1.0)); for (let x = 0; x < 16; x += 2) g.set(x, 12, BAND[v]);               // adorno de brocha
    for (let x = 0; x < 16; x++) { const top = 13 + (r() < .3 ? -1 : 0); for (let y = top; y < 16; y++) g.set(x, y, r() < .8 ? SALITRE : shade(SALITRE, .92)); }   // salitre
    g.rect(0, 15, 16, 1, shade(w, .66));
    for (let i = 0; i < 2; i++) { const x = 1 + Math.floor(r() * 14); g.line(x, 10, x, 11 + Math.floor(r() * 2), shade(w, .85)); }   // chorreras
  });
}

/* ---------- Tiles: calle ---------- */
function zebraTile() {
  return tile(g => {
    const r = asphaltBase(g, 41);
    for (let k = 0; k < 2; k++) {
      const x0 = 1 + k * 8;
      for (let y = 0; y < 16; y++) for (let i = 0; i < 5; i++) {
        const edge = y < 2 || y > 13;
        const c = r() < .3 ? '#bdbbb0' : '#d1cfc3';
        if (r() < (edge ? .45 : .06)) continue;                                            // pintura erosionada
        g.set(x0 + i, y, c);
      }
    }
    g.rect(2, 6, 2, 2, ASPH); g.rect(11, 9, 2, 2, ASPH); g.set(3, 8, ASPH); g.set(12, 6, ASPH);   // parches borrados
    for (let y = 0; y < 16; y++) { if (r() < .4) g.set(6, y, '#4e5052'); if (r() < .3) g.set(14, y, '#4e5052'); }   // huella de llantas
  });
}
function humpTile() {
  return tile(g => {
    const r = asphaltBase(g, 53);
    g.rect(0, 2, 16, 1, '#6a6c6e'); g.rect(0, 13, 16, 1, '#454749'); g.rect(0, 14, 16, 1, '#4a4c4e');
    for (let y = 3; y <= 12; y++) for (let x = 0; x < 16; x++) {
      const yel = (((x + y) >> 2) & 1) === 0;
      let c = yel ? '#cfae43' : '#2e3033';
      if (y === 3) c = yel ? '#e0c45a' : '#4a4d50';
      if (y >= 11) c = yel ? '#a98d36' : '#24262a';
      if (r() < .26) c = yel ? '#a8944f' : '#505254';                                    // desteñido
      if (r() < .1) c = '#585a5c';                                                       // pintura saltada
      g.set(x, y, c);
    }
  });
}
function curbWY() {
  const g = curbW(), r = rng(777);
  for (let y = 0; y < 16; y++) {
    if (r() < .28) continue;                                                              // tramo pelado, se ve el cemento
    g.set(10, y, '#e2c968'); g.set(11, y, '#d2b24a'); g.set(12, y, '#bf9f3e');
    if (r() < .3) g.set(11, y, '#b8993c');
  }
  g.set(12, 4, '#6f706a'); g.set(11, 11, '#6f706a');
  return g;
}

/* ---------- Decals ---------- */
const MURAL = {
  C: ['.#####.', '##...##', '##.....', '##.....', '##...##', '.#####.'],
  A: ['..###..', '.##.##.', '##...##', '#######', '##...##', '##...##'],
  L: ['##.....', '##.....', '##.....', '##.....', '##.....', '#######'],
  O: ['.#####.', '##...##', '##...##', '##...##', '##...##', '.#####.']
};
function muralCallao() {
  const g = new G(64, 16), PINK = '#D98A9E', PD = '#b87488', K = '#2a1f26';
  const word = 'CALLAO', jit = [0, 0, 0, 1, 0, 0];
  let x = 3;
  word.split('').forEach((ch, i) => {
    const b = MURAL[ch], y0 = 3 + jit[i];
    for (let j = 0; j < 6; j++) for (let k = 0; k < 7; k++) if (b[j][k] === '#') g.set(x + k, y0 + j, j === 5 ? PD : PINK);
    x += 10;
  });
  [[13, 3], [37, 2], [47, 3], [58, 2]].forEach(d => {                                      // chorreras: de las barras de abajo
    for (let k = 1; k <= d[1]; k++) g.set(d[0], 9 + k + (d[0] === 37 ? 1 : 0), k === d[1] ? PD : PINK);
  });
  g.outline(K);
  return mkC(g, 32, 15);
}
function chichaG(v) {
  const g = new G(8, 10), k = '#2a1e2a';
  if (v === 0) {
    g.rect(0, 0, 8, 10, '#e0359a'); g.disc(4, 3, 2, '#f4e04a'); g.rect(0, 6, 8, 2, '#2bd4e0'); g.rect(1, 9, 6, 1, '#fff3c4'); g.set(2, 5, '#e0359a'); g.set(6, 5, '#e0359a');
    [[0, 0], [7, 9], [7, 8]].forEach(p => g.set(p[0], p[1], null));
  } else if (v === 1) {
    g.rect(0, 0, 8, 10, '#9be03a'); g.rect(0, 0, 8, 2, '#6a2fb5');
    for (let i = 0; i < 8; i++) g.set(i, 3 + (i % 2) * 2, '#6a2fb5');
    g.rect(1, 7, 6, 1, '#ff7a1a'); g.rect(2, 9, 4, 1, '#6a2fb5'); g.rect(1, 8, 2, 1, '#ff7a1a');
    [[7, 0], [0, 9], [1, 9]].forEach(p => g.set(p[0], p[1], null));
  } else {
    g.rect(0, 0, 8, 10, '#ff7a1a'); g.rect(1, 1, 6, 4, '#28d7e6'); g.rect(2, 2, 4, 2, '#ff4fa8'); g.set(3, 2, '#fff3c4'); g.set(5, 3, '#fff3c4');
    for (let i = 0; i < 6; i++) if (i % 3 !== 2) g.set(1 + i, 6, '#2a1e2a');
    for (let i = 0; i < 5; i++) if (i !== 3) g.set(1 + i, 8, '#fff3c4');
    [[0, 9], [7, 0], [7, 1]].forEach(p => g.set(p[0], p[1], null));
  }
  for (let y = 0; y < 10; y++) for (let x = 0; x < 8; x++) {                               // borde oscurecido (papel pegado)
    const c = g.get(x, y); if (c && (x === 0 || y === 0 || x === 7 || y === 9) && (x + y) % 2 === 0) g.set(x, y, shade(c, .72));
  }
  return g;
}
function flagDecal() {
  const g = new G(11, 9), R = '#b24a3f', Wt = '#e2dfd4';
  g.rect(0, 0, 11, 1, '#4a3a2c');
  for (let y = 1; y <= 6; y++) for (let x = 1; x <= 9; x++) {
    const m = x < 4 ? R : (x < 7 ? Wt : R);
    if (y === 6 && (x === 2 || x === 5 || x === 8)) continue;                              // borde ondulado
    g.set(x, y, y >= 5 ? shade(m, .85) : m);
  }
  g.set(5, 3, '#c9c5b5'); g.set(5, 4, '#b4b0a0');                                          // sin escudo: solo una mancha de sol
  g.outline();
  return mkC(g, 5, 8);
}
function pinkStripesDecal() {
  /* Pintura de sardinel: dos valores solidos, sin tramado ni huecos al azar. Tres franjas de 3 px (2 de rosa + 1 de rosa oscuro al pie). */
  const g = new G(16, 16), PK = '#D98A9E', PD = '#b56f83';
  [4, 8, 12].forEach(y0 => { g.rect(0, y0, 16, 2, PK); g.rect(0, y0 + 2, 16, 1, PD); });
  g.rect(3, 7, 2, 1, PD); g.rect(11, 15, 2, 1, PD);                                          // una sola gota fija por tramo
  return mkC(g, 8, 15);
}
function graffitiDecal(v) {
  const g = new G(16, 16);
  if (v === 0) {                                                                            // corazon con chorrera y un par de rayas
    const R = '#8f3c4c', RL = '#b85c6c';
    g.disc(5.5, 5.5, 3, R); g.disc(10.5, 5.5, 3, R); tri(g, 2, 7, 14, 7, 8, 14, () => R);
    g.set(4, 4, RL); g.set(5, 3, RL); g.line(8, 14, 8, 15, R); g.line(5, 11, 5, 13, R);
    g.line(1, 1, 3, 2, '#2c2e33'); g.line(13, 1, 15, 2, '#2c2e33'); g.line(2, 15, 6, 15, '#2c2e33');
    g.set(8, 7, '#2c2e33'); g.set(7, 8, '#2c2e33');
  } else {                                                                                  // estrella rellena con sombra
    const T = '#4f9a8c', K = '#2a2a2e', cx = 8, cy = 8, pts = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 3 : 7; pts.push([cx + Math.cos(a) * rr, cy + 0.5 + Math.sin(a) * rr]); }
    for (let i = 0; i < 10; i++) { const a = pts[i], b = pts[(i + 1) % 10]; tri(g, a[0] + 1, a[1] + 1, b[0] + 1, b[1] + 1, cx + 1, cy + 1.5, () => K); }
    for (let i = 0; i < 10; i++) { const a = pts[i], b = pts[(i + 1) % 10]; tri(g, a[0], a[1], b[0], b[1], cx, cy + .5, (x, y) => (x + y) % 5 === 0 ? '#7cc0b2' : T); }
    g.line(8, 14, 8, 15, T);
  }
  return mkC(g, 8, 15);
}

/* ---------- Props: transporte ---------- */
const COMBI_VAR = [
  { a: '#B24A3F', b: '#D2B24A' },     // rojo + amarillo
  { a: '#4D6C8F', b: '#5E8F5A' },     // azul + verde
  { a: '#B24A3F', b: '#4D6C8F' }      // rojo + azul
];
const CR = '#d8d4c4', CRL = '#e6e3d6', CRD = '#bdb9a9', CRDD = '#a29e8e', GL = '#2f3a40', GLH = '#4d5a61', DKI = '#1c1c20';

/* Combi de costado, mirando al este. 64x38, ancla (32,35), huella 56x14. */
function propCombiE(v) {
  const g = new G(64, 38), C = COMBI_VAR[v], r = rng(7000 + v * 13);
  const top = x => x <= 3 ? 7 : (x <= 5 ? 4 : (x <= 50 ? 2 : Math.min(18, 2 + Math.round((x - 50) * 2.3))));
  for (let x = 2; x <= 61; x++) for (let y = top(x); y <= 30; y++) g.set(x, y, y < 6 ? CRL : CR);
  g.rect(6, 2, 44, 1, '#f1eee3'); g.rect(5, 5, 46, 1, CRDD);                               // techo: luz arriba, canal abajo
  g.rect(18, 3, 9, 2, '#a8a595'); g.rect(19, 3, 7, 1, '#c9c5b5');                          // ventilador del techo
  g.rect(2, 26, 60, 5, CRD); g.rect(2, 28, 60, 3, CRDD);                                   // faldon
  // ventana trasera
  g.rect(5, 7, 10, 7, GL); g.rect(6, 8, 3, 1, GLH); g.set(6, 9, GLH);
  g.rect(15, 6, 1, 24, CRDD);                                                              // pilar
  // puerta corrediza corrida hacia atras
  g.rect(16, 6, 12, 24, CRD); g.rect(16, 6, 12, 1, CRDD); g.rect(16, 29, 12, 1, CRDD); g.rect(27, 6, 1, 24, CRDD); g.rect(16, 6, 1, 24, CRDD);
  g.rect(18, 7, 8, 7, GL); g.rect(19, 8, 3, 1, GLH); g.rect(24, 18, 2, 1, '#8c897f'); g.set(25, 17, '#e6e3d6');
  // franjas de color (antes del vano)
  g.rect(2, 21, 60, 2, C.a); g.rect(2, 24, 60, 2, C.b); g.rect(2, 21, 60, 1, shade(C.a, 1.15)); g.rect(2, 24, 60, 1, shade(C.b, 1.12));
  // vano oscuro de la puerta abierta
  g.rect(28, 6, 12, 24, DKI); g.rect(30, 7, 8, 7, '#59656b'); g.rect(30, 7, 8, 1, '#6f7d83'); g.rect(31, 11, 3, 10, '#2f3238'); g.rect(32, 10, 1, 2, '#3b3f46'); g.rect(36, 13, 2, 9, '#2f3238');
  g.rect(39, 6, 1, 24, CRDD);
  // cabina
  g.rect(40, 6, 1, 24, CRDD); g.rect(52, 18, 6, 1, CRDD);
  for (let y = 7; y <= 15; y++) { const xm = Math.floor(50 + (y - 2) / 2.3) - 1; g.rect(42, y, xm - 42 + 1, 1, GL); }
  g.rect(43, 8, 3, 1, GLH);
  g.rect(42, 9, 11, 7, '#e8e4d0'); g.rect(42, 9, 5, 1, C.a); g.rect(47, 9, 6, 1, C.b);     // cartel de ruta en el parabrisas
  txt(g, 43, 10, '77', '#3b3b3b', 4); g.rect(51, 11, 1, 1, C.a); g.rect(51, 13, 1, 1, C.b); g.set(50, 12, '#3b3b3b');
  g.rect(58, 12, 2, 3, '#2c2c2c'); g.set(58, 12, '#5d6064');                               // espejo
  g.rect(60, 20, 2, 2, '#e6d98a'); g.rect(61, 23, 1, 3, '#2c2c2c');                         // faro, rejilla
  g.rect(57, 28, 6, 3, '#3b3b3b'); g.rect(57, 28, 6, 1, '#55595d');
  // atras
  g.rect(2, 16, 2, 4, '#8a3a34'); g.set(2, 16, '#c25a4e'); g.rect(2, 28, 2, 3, '#3b3b3b');
  txt(g, 6, 15, '77', C.a, 4);                                                              // numero de ruta inventado
  // abolladuras, rayones y oxido
  g.rect(8, 19, 4, 1, '#c9c5b5'); g.rect(9, 20, 3, 1, CRDD);
  g.line(44, 19, 51, 17, CRDD); g.set(47, 18, '#e6e3d6');
  g.rect(46, 27, 3, 2, '#a8a595'); g.set(46, 27, '#c9c5b5');
  rust(g, r, 9, 2, 27, 61, 30); rust(g, r, 3, 6, 3, 48, 5);
  g.rect(3, 27, 3, 3, '#8a4b38'); g.set(5, 26, '#a0603f'); g.set(4, 29, '#6a3a2c');
  g.rect(33, 26, 3, 1, '#8a4b38'); g.set(35, 27, '#8a4b38');
  // ruedas con pasos de rueda
  [14, 49].forEach(cx => { g.disc(cx, 30, 5.4, DKI); wheel(g, cx, 30, 4.4); });
  g.outline();
  shadowE(g, 32, 35, 30, 1.5);
  return mkC(g, 32, 35, 56, 14);
}

/* Combi apuntando al norte (se ve capo, parabrisas, techo y atras). 32x56, ancla (16,54), huella 26x40. */
function propCombiN(v) {
  const g = new G(32, 56), C = COMBI_VAR[v], r = rng(7100 + v * 17);
  g.rect(3, 2, 26, 8, CR); g.set(3, 2, null); g.set(28, 2, null);                          // capo corto
  g.rect(3, 2, 26, 1, '#3b3b3b'); g.rect(5, 4, 4, 2, '#e6d98a'); g.rect(23, 4, 4, 2, '#e6d98a'); g.rect(13, 5, 6, 2, '#2c2c2c'); g.rect(13, 4, 6, 1, '#55595d');
  g.rect(3, 8, 26, 2, CRD);
  g.rect(4, 10, 24, 9, GL); g.set(4, 10, null); g.set(27, 10, null);                       // parabrisas
  g.rect(6, 11, 5, 1, GLH); g.set(6, 12, GLH);
  g.rect(9, 14, 14, 4, '#e8e4d0'); g.rect(9, 14, 5, 1, C.a); g.rect(15, 14, 8, 1, C.b);   // cartel de ruta
  [[10, 16], [12, 16], [13, 16], [15, 16], [17, 16], [19, 16], [21, 16], [10, 17], [11, 17], [14, 17], [16, 17], [18, 17], [20, 17], [22, 17]].forEach(p => g.set(p[0], p[1], '#3b3b3b'));
  g.line(13, 10, 20, 19, '#4d5a61');                                                       // limpiaparabrisas
  g.rect(3, 19, 26, 26, CRL); g.rect(3, 19, 26, 1, CRD);                                   // techo
  for (let y = 24; y < 44; y += 6) g.rect(5, y, 22, 1, CRD);
  g.rect(11, 26, 10, 5, '#a8a595'); g.rect(12, 27, 8, 3, '#c9c5b5');                       // ventilador del techo
  // costados: dos franjas de color y vano de la puerta abierta (este)
  g.rect(3, 19, 1, 26, C.a); g.rect(4, 19, 1, 26, C.b); g.rect(28, 19, 1, 26, C.a); g.rect(27, 19, 1, 26, C.b);
  g.rect(27, 27, 2, 12, DKI); g.rect(26, 28, 1, 10, CRDD);
  // atras
  g.rect(3, 45, 26, 8, CR); g.rect(3, 45, 26, 1, CRDD);
  g.rect(5, 46, 22, 4, GL); g.rect(6, 47, 4, 1, GLH); g.rect(16, 46, 1, 4, CRDD);
  g.rect(3, 46, 2, 4, '#8a3a34'); g.rect(27, 46, 2, 4, '#8a3a34');
  g.rect(3, 50, 26, 1, C.a); g.rect(3, 52, 26, 1, C.b);
  g.rect(13, 51, 6, 2, '#c9c2a0'); g.rect(3, 53, 26, 1, '#3a3d40');
  g.rect(2, 49, 3, 6, '#1e1e1e'); g.rect(27, 49, 3, 6, '#1e1e1e');
  txt(g, 7, 40, '77', '#bdb9a9', 4);
  rust(g, r, 6, 3, 40, 28, 52); g.rect(20, 33, 5, 3, '#8a4b38'); g.set(21, 36, '#a0603f');
  g.rect(8, 22, 4, 1, '#e6e3d6'); g.rect(9, 23, 3, 1, CRDD);
  g.outline();
  shadowE(g, 16, 55, 14, 1.2);
  return mkC(g, 16, 54, 26, 40);
}

/* Custer de costado, mirando al este. 96x40, ancla (48,37), huella 88x16. */
function propCusterE() {
  const g = new G(96, 40), r = rng(7200), BL = '#4D6C8F';
  const top = x => x <= 4 ? 9 : (x <= 6 ? 5 : (x <= 84 ? 3 : Math.min(21, 3 + Math.round((x - 84) * 2.6))));
  for (let x = 2; x <= 94; x++) for (let y = top(x); y <= 33; y++) g.set(x, y, y < 7 ? CRL : CR);
  g.rect(8, 3, 76, 1, '#f1eee3'); g.rect(7, 7, 78, 1, CRDD);
  g.rect(30, 4, 12, 2, '#a8a595'); g.rect(60, 4, 10, 2, '#a8a595');                       // ventilas
  g.rect(2, 28, 93, 6, CRD); g.rect(2, 31, 93, 3, CRDD);
  const curt = ['#c9a58a', '#9db59e', '#c9c5b5', '#c9a58a', '#9db59e', '#c9c5b5'];
  for (let k = 0; k < 6; k++) {                                                            // ventanas cuadradas con cortinillas
    const x = 7 + k * 12;
    g.rect(x, 10, 9, 9, GL); g.rect(x, 10, 9, 5, curt[k]); g.rect(x, 14, 9, 1, shade(curt[k], .8));
    for (let i = 1; i < 9; i += 2) g.set(x + i, 12, shade(curt[k], .88));
    g.rect(x + 1, 16, 3, 1, GLH); g.rect(x - 2, 8, 1, 20, CRDD);
  }
  // puerta de pasajeros delante
  g.rect(80, 9, 1, 20, CRDD);
  g.rect(70, 8, 10, 21, '#9a968a'); g.rect(70, 8, 10, 1, CRDD); g.rect(71, 10, 8, 14, GL); g.rect(75, 10, 1, 14, '#9a968a'); g.rect(72, 11, 2, 1, GLH);
  // franja azul con letrero inventado
  g.rect(2, 22, 93, 7, BL); g.rect(2, 22, 93, 1, shade(BL, 1.2)); g.rect(2, 28, 93, 1, shade(BL, .75)); g.rect(2, 30, 93, 1, BL);
  g.rect(70, 8, 10, 21, '#9a968a'); g.rect(71, 10, 8, 12, GL); g.rect(75, 10, 1, 12, '#9a968a'); g.rect(72, 11, 2, 1, GLH); g.rect(71, 22, 8, 7, BL);
  txt(g, 8, 23, 'LINEA CHALACA', '#e6e3d6', 4, r, .06);
  // cabina
  for (let y = 9; y <= 20; y++) { const xm = Math.floor(84 + (y - 3) / 2.6) - 1; if (xm >= 82) g.rect(82, y, xm - 82 + 1, 1, GL); }
  g.rect(83, 10, 3, 1, GLH);
  g.rect(82, 15, 9, 3, '#e8e4d0'); g.rect(82, 15, 3, 1, '#B24A3F');
  [[84, 17], [86, 17], [87, 17], [89, 17]].forEach(p => g.set(p[0], p[1], '#3b3b3b'));
  g.rect(91, 15, 2, 3, '#2c2c2c'); g.rect(93, 23, 2, 2, '#e6d98a'); g.rect(94, 26, 1, 3, '#2c2c2c');
  g.rect(88, 32, 7, 3, '#3b3b3b'); g.rect(88, 32, 7, 1, '#55595d');
  g.rect(2, 20, 2, 4, '#8a3a34'); g.rect(2, 31, 2, 4, '#3b3b3b');
  rust(g, r, 14, 2, 24, 94, 33); rust(g, r, 3, 8, 4, 82, 7);
  g.rect(48, 25, 4, 1, '#6f89a6'); g.rect(52, 26, 3, 3, '#3a5575'); g.set(52, 26, '#6f89a6');   // abolladura en la franja
  [18, 66].forEach(cx => { g.disc(cx, 33, 6, DKI); g.rect(cx - 7, 28, 15, 5, CRD); g.rect(cx - 6, 28, 13, 1, DKI); g.rect(cx - 7, 28, 15, 3, null); });
  [18, 66].forEach(cx => { g.disc(cx, 33, 6, DKI); wheel(g, cx, 33, 5); });
  g.outline();
  shadowE(g, 48, 38, 45, 1.6);
  return mkC(g, 48, 37, 88, 16);
}

/* Trailer con contenedor de costado, mirando al este. 128x48, ancla (64,45), huella 120x18. */
function propTrailer(v) {
  const g = new G(128, 48), r = rng(7300 + v * 5);
  const base = v ? '#93503c' : '#4f6e90', hi = shade(base, 1.2), lo = shade(base, .78), lo2 = shade(base, .6);
  g.rect(3, 4, 92, 2, shade(base, 1.28));                                                  // techo del contenedor
  g.rect(3, 6, 92, 28, base);
  for (let x = 8; x < 94; x += 4) { g.rect(x, 7, 1, 26, lo); g.rect(x + 1, 7, 1, 26, hi); }
  g.rect(3, 6, 92, 1, lo2); g.rect(3, 33, 92, 1, lo2);
  [[3, 6], [92, 6], [3, 31], [92, 31]].forEach(p => g.rect(p[0], p[1], 3, 3, '#33363a'));  // esquineros
  g.rect(3, 6, 5, 28, lo); [4, 6].forEach(x => g.rect(x, 8, 1, 24, '#6f7378'));            // puertas con barras
  g.rect(14, 10, 40, 1, hi);
  txt(g, 14, 12, v ? 'KQT 7740 2' : 'MZR 3318 5', '#cfcdc2', 4, r, .2);                 // codigo inventado, desteñido
  g.rect(14, 19, 24, 4, shade(base, v ? 1.35 : 1.4)); txt(g, 15, 19, v ? 'PUERTO' : 'NORTE', shade(base, .72), 4, r, .1);
  g.rect(14, 22, 8, 1, shade(base, 1.2));
  for (let i = 0; i < 7; i++) { const x = 8 + Math.floor(r() * 84); g.line(x, 7, x, 12 + Math.floor(r() * 12), '#8a4b38'); }
  rust(g, r, 60, 3, 6, 94, 33, ['#8a4b38', '#a0603f', '#6a3a2c']);
  g.rect(60, 25, 6, 5, lo2); g.rect(61, 26, 4, 1, lo);                                     // abolladura
  // chasis y patas
  g.rect(3, 34, 92, 4, '#33363a'); g.rect(3, 34, 92, 1, '#4a4d50'); g.rect(62, 38, 3, 6, '#55595d'); g.rect(60, 43, 7, 1, '#33363a');
  g.rect(6, 38, 28, 2, '#2c2e31');
  // cabina
  const cab = v ? '#6f8a73' : '#c9c5b5', cabD = shade(cab, .78);
  g.rect(96, 34, 30, 4, '#2c2e31');
  g.rect(98, 14, 25, 20, cab); g.rect(98, 14, 25, 1, shade(cab, 1.12)); g.rect(98, 29, 25, 5, cabD);
  g.rect(98, 14, 1, 20, cabD);
  for (let y = 15; y <= 25; y++) { const xm = 121 - Math.floor(Math.max(0, y - 15) * 0.2); g.rect(106, y, xm - 106, 1, GL); }
  g.rect(107, 16, 5, 1, GLH); g.set(107, 17, GLH);
  g.rect(106, 15, 1, 11, cabD); g.rect(106, 26, 16, 1, cabD);
  g.rect(122, 16, 4, 14, shade(cab, .9)); g.rect(124, 20, 2, 2, '#e6d98a'); g.rect(124, 32, 4, 4, '#3b3b3b');
  g.rect(110, 28, 4, 1, '#8c897f');
  g.rect(101, 3, 2, 12, '#9ea3a6'); g.rect(101, 3, 1, 12, '#c9c9be'); g.rect(100, 2, 4, 1, '#55595d');   // escape vertical
  g.rect(104, 35, 14, 5, '#a9adb0'); g.rect(104, 35, 14, 1, '#c9c9be'); g.rect(104, 39, 14, 1, '#6d7275');   // tanque
  rust(g, r, 18, 98, 16, 122, 34);
  g.rect(124, 14, 2, 2, '#2c2c2c');
  // ruedas
  [14, 28, 42].forEach(cx => { g.disc(cx, 41, 5, DKI); wheel(g, cx, 41, 4.5); });
  [104, 116].forEach(cx => { g.disc(cx, 41, 5, DKI); wheel(g, cx, 41, 4.5); });
  g.outline();
  shadowE(g, 64, 46, 62, 1.5);
  return mkC(g, 64, 45, 120, 18);
}

/* Mototaxi con toldo de lona de color y calcomanias. 32x32, ancla (16,28), huella 22x18. */
function propMototaxiVar(v) {
  const T = ['#C9733A', '#a8453a', '#4D6C8F'][v], TD = shade(T, .72), TL = shade(T, 1.14), PH = ['ZULY', 'FLACA', 'NENE'][v], r = rng(7400 + v * 3);
  const g = new G(32, 32);
  g.rect(14, 0, 4, 4, '#232323'); g.set(15, 1, '#6a6a6a'); g.rect(15, 3, 2, 4, '#3d3d3d'); g.rect(11, 4, 10, 1, '#3d3d3d');
  g.rect(9, 6, 14, 3, '#3a5062'); g.rect(10, 7, 4, 1, '#566b7c');
  g.rect(5, 8, 22, 13, T); g.rect(5, 8, 22, 2, TL);
  for (let x = 8; x < 27; x += 5) g.rect(x, 10, 1, 11, TD);
  g.rect(5, 19, 22, 2, TD);
  for (let x = 5; x < 27; x += 2) g.set(x, 21, TD);                                          // flecos
  g.set(5, 8, null); g.set(26, 8, null);
  const pitch = 4, w = PH.length * pitch - 1, x0 = 16 - Math.floor(w / 2);
  txt(g, x0, 11, PH, '#efe6a0', 4, r, .08);                                                  // frase corta inventada
  g.rect(7, 16, 3, 2, '#e0c24a'); g.rect(8, 16, 1, 1, '#2a2a2a'); g.rect(22, 16, 3, 2, '#D98A9E'); g.set(23, 16, '#fff3c4');   // calcomanias
  g.set(20, 13, '#7a5a44'); g.rect(12, 18, 3, 1, TD);
  g.rect(7, 21, 18, 6, '#2a2a2a'); g.rect(8, 22, 16, 3, '#4a5a63'); g.rect(8, 22, 16, 1, '#5d6e78'); g.rect(12, 25, 8, 1, '#3d3d3d');
  g.disc(4.5, 24, 3.2, '#232323'); g.disc(27.5, 24, 3.2, '#232323'); g.set(4, 24, '#8a8a8a'); g.set(27, 24, '#8a8a8a');
  g.rect(14, 26, 4, 1, '#e7e2b0');
  rust(g, r, 4, 6, 9, 25, 19, [TD]);
  g.outline();
  g.rect(5, 29, 22, 1, SHADOW);
  return mkC(g, 16, 28, 22, 18);
}

/* ---------- Props: calle ---------- */
function propTreeWhite() {
  const g = new G(28, 44), r = rng(7500);
  const bark = '#6b5a47';
  g.rect(12, 14, 4, 27, bark); g.rect(11, 38, 6, 3, bark); g.rect(12, 14, 1, 27, '#7e6c56');
  g.rect(12, 28, 4, 13, '#d8d6cc'); g.rect(11, 37, 6, 4, '#d8d6cc'); g.rect(15, 28, 1, 13, '#b9b7ab'); g.rect(12, 28, 1, 12, '#ecebe2');   // tronco pintado de cal
  g.set(13, 30, '#bdb299'); g.set(14, 34, '#8a7f68'); g.set(12, 39, '#a89c86'); g.rect(11, 40, 6, 1, '#8a7f68');
  const br = [[14, 18, 5, 9], [14, 16, 22, 7], [13, 22, 6, 18], [14, 20, 24, 15], [14, 14, 14, 3]];
  br.forEach(b => g.line(b[0], b[1], b[2], b[3], bark));
  const cl = [[5, 9], [22, 7], [6, 18], [24, 15], [14, 3], [10, 12], [19, 11]];
  cl.forEach((c, i) => {                                                                    // copa mustia: matas ralas
    for (let k = 0; k < 9; k++) {
      const x = c[0] + Math.floor((r() - .5) * 8), y = c[1] + Math.floor((r() - .5) * 6);
      const col = r() < .25 ? '#8a7a4f' : (r() < .5 ? '#6a7050' : '#7a8057');
      g.set(x, y, col); if (r() < .5) g.set(x, y + 1, col);
    }
    g.disc(c[0], c[1], 1.5, '#6a7050');
  });
  [[8, 14], [20, 12], [11, 18], [17, 18]].forEach(p => { g.set(p[0], p[1], '#8a7a4f'); g.set(p[0], p[1] + 1, '#8a7a4f'); });   // hojas secas colgando
  g.outline();
  g.ell(14, 42, 6, 1.2, SHADOW);
  return mkC(g, 14, 41, 6, 4);
}
function propPalm() {
  const g = new G(32, 48), cx = 16, cy = 11;
  for (let y = 12; y <= 44; y++) {                                                          // tronco con anillos
    const sw = Math.round(Math.sin(y * .12) * .7), w = y > 38 ? 4 : 3;
    g.rect(cx - 1 + sw, y, w, 1, (y % 3 === 0) ? '#6b5a45' : '#8f7a5e');
    g.set(cx - 1 + sw, y, '#a58f70');
  }
  const fr = [-178, -158, -140, -122, -104, -86, -68, -50, -32, -14, 2];
  fr.forEach((a, i) => {
    const rad = a * Math.PI / 180, L = 11 + (i % 2) * 2;
    let px = cx, py = cy;
    for (let s = 1; s <= 14; s++) {
      const t = s / 14, x = cx + Math.cos(rad) * L * t, y = cy + Math.sin(rad) * L * t * .55 + t * t * 8;
      g.line(px, py + 1, x, y + 1, '#4a6340'); g.line(px, py, x, y, (s % 2) ? '#6d8a52' : '#59753f'); px = x; py = y;
      if (s % 2 === 0 && s > 2) { g.set(x, y + 1, '#4a6340'); g.set(x + (Math.cos(rad) > 0 ? -1 : 1), y - 1, '#7f9e60'); }
    }
  });
  g.disc(cx, cy + 1, 1.5, '#5b4331'); g.set(cx - 2, cy + 2, '#5b4331'); g.set(cx + 2, cy + 2, '#5b4331');
  g.outline();
  g.ell(16, 46, 5, 1.2, SHADOW);
  return mkC(g, 16, 45, 4, 4);
}
function propTank() {
  const g = new G(18, 24), K = '#2b2d2f';
  g.rect(2, 6, 14, 15, K); g.ell(9, 20, 7, 2.5, K); g.ell(9, 6, 7, 3, '#3a3d40'); g.ell(9, 6, 4.5, 1.8, K);
  g.rect(8, 2, 3, 3, '#4a4d50'); g.rect(8, 2, 3, 1, '#6a6d70');
  g.rect(2, 11, 14, 1, '#1b1c1e'); g.rect(2, 16, 14, 1, '#1b1c1e'); g.rect(4, 7, 2, 13, '#44484b'); g.rect(4, 7, 1, 13, '#5a5e61');
  g.rect(14, 8, 1, 12, '#1b1c1e');
  g.rect(0, 21, 18, 2, '#8d8b84'); g.rect(0, 21, 18, 1, '#a2a099');
  g.rect(15, 17, 3, 2, '#4D6C8F'); g.set(17, 17, '#6f89a6');
  g.outline();
  return mkC(g, 9, 23, 0, 0);
}
function propRebar() {
  const g = new G(20, 26), r = rng(7600);
  g.rect(2, 18, 5, 7, '#8d8b84'); g.rect(13, 17, 5, 8, '#8d8b84'); g.rect(2, 18, 5, 1, '#a2a099'); g.rect(13, 17, 5, 1, '#a2a099');
  g.set(3, 22, '#76746e'); g.set(15, 20, '#76746e'); g.set(14, 23, '#76746e'); g.set(6, 24, '#a9a69a');
  [[3, 18, 12], [5, 18, 8], [14, 17, 9], [16, 17, 15]].forEach(b => {
    g.rect(b[0], b[1] - b[2], 1, b[2], '#7a4a36'); g.set(b[0], b[1] - b[2], '#a8613f');
    for (let k = 3; k < b[2]; k += 4) g.set(b[0], b[1] - k, '#a0603f');
  });
  g.line(5, 10, 8, 8, '#7a4a36'); g.line(8, 8, 9, 5, '#7a4a36');                         // fierro doblado
  g.line(3, 14, 5, 14, '#2c2c2c'); g.line(14, 12, 16, 12, '#2c2c2c');                    // alambre
  g.outline();
  return mkC(g, 10, 25, 0, 0);
}
function propEmoliente() {
  const g = new G(32, 34);
  for (let j = 0; j < 7; j++) {                                                            // sombrilla
    const hw = 3 + j * 1.9;
    for (let x = Math.round(16 - hw); x <= Math.round(16 + hw); x++) g.set(x, 2 + j, ((x >> 1) % 2) ? '#d8d4c4' : '#6f8c93');
  }
  g.set(16, 1, '#6b4223'); g.rect(16, 9, 1, 9, '#6b4223');
  for (let x = 3; x <= 29; x += 2) g.set(x, 9, '#4d6a70');
  const bt = ['#a8453a', '#6f9a4f', '#b9853a', '#a8453a', '#6f9a4f'];
  bt.forEach((c, i) => { const x = 7 + i * 3; g.rect(x, 13, 2, 5, c); g.rect(x, 12, 2, 1, '#c9c5b5'); g.set(x, 14, shade(c, 1.4)); });   // botellas de vidrio
  g.rect(22, 9, 4, 9, '#9ea3a6'); g.rect(22, 9, 1, 9, '#c9c9be'); g.rect(22, 8, 4, 1, '#a8453a'); g.rect(26, 11, 2, 1, '#6d7275');   // termo
  g.rect(5, 18, 22, 2, '#b08a5a'); g.rect(5, 18, 22, 1, '#c4a070');
  g.rect(6, 20, 20, 8, '#7a5a3a'); g.rect(6, 20, 20, 1, '#8c6a46'); [11, 17, 22].forEach(x => g.rect(x, 21, 1, 7, '#6b4223'));
  g.rect(8, 22, 5, 4, '#8a6a46'); g.set(9, 23, '#3a2a1e');
  g.line(6, 22, 1, 27, '#a86e38'); g.line(6, 23, 1, 28, '#6b4223');                        // manubrio
  g.rect(7, 28, 1, 4, '#3d3d3d'); g.rect(11, 28, 1, 4, '#3d3d3d');
  g.disc(21, 28, 3.5, '#2a2a2a'); g.disc(21, 28, 2.2, '#8d8b84'); g.set(21, 28, '#2a2a2a'); g.line(19, 28, 23, 28, '#4a4a4a'); g.line(21, 26, 21, 30, '#4a4a4a');
  g.rect(24, 28, 3, 3, '#8a6a46');
  g.outline();
  g.rect(3, 32, 24, 1, SHADOW);
  return mkC(g, 16, 31, 20, 8);
}
function propAnticuchos() {
  const g = new G(32, 32), r = rng(7700);
  g.rect(6, 14, 17, 2, '#2b2b2b'); g.rect(6, 16, 17, 7, '#4d4a45'); g.rect(6, 16, 17, 1, '#5d5a54');
  g.rect(8, 15, 13, 1, '#d2562a'); [9, 12, 15, 18].forEach(x => g.set(x, 15, '#f0a040'));
  g.line(5, 13, 23, 13, '#c9b890');
  for (let x = 7; x < 22; x += 3) { g.rect(x, 11, 2, 2, '#6b3f2a'); g.set(x, 11, '#8a5a3a'); g.set(x + 1, 12, '#4a2a1c'); }   // brochetas
  g.rect(6, 23, 17, 2, '#6b4223'); g.rect(8, 17, 4, 4, '#3a3a38'); g.rect(9, 18, 2, 1, '#5d5a54');
  rust(g, r, 8, 6, 17, 22, 23);
  g.rect(7, 25, 2, 5, '#3d3d3d'); g.rect(20, 25, 2, 5, '#3d3d3d');
  g.line(6, 19, 1, 26, '#a86e38'); g.line(6, 20, 1, 27, '#6b4223');
  g.disc(24, 27, 3, '#2a2a2a'); g.disc(24, 27, 1.6, '#8d8b84'); g.set(24, 27, '#2a2a2a');
  g.rect(26, 22, 5, 1, '#8a6a40'); g.rect(26, 23, 1, 6, '#6b4223'); g.rect(30, 23, 1, 6, '#6b4223');   // banquito
  g.rect(2, 16, 3, 3, '#7a7e82'); g.rect(2, 15, 3, 1, '#9ea3a6');                          // olla
  g.outline();
  g.rect(3, 31, 24, 1, SHADOW);
  const c = mkC(g, 16, 30, 22, 8);
  c.smoke = { x: 14 - 16, y: 10 - 30 };                                                     // sobre las brochetas
  return c;
}

function posteBase(opt) {
  const g = new G(24, 68), r = rng(opt.seed), PX = 10, wires = [], W = function () { wires.push(arguments); };
  g.rect(PX, 10, 4, 55, '#7d7e78'); g.rect(PX, 10, 1, 55, '#8e8f88'); g.rect(PX + 3, 10, 1, 55, '#64655f');
  for (let y = 18; y < 62; y += 11) g.rect(PX, y, 4, 1, '#6a6b66');
  g.rect(PX - 1, 59, 6, 6, '#6d6e68'); g.rect(PX - 1, 59, 1, 6, '#7d7e78'); g.rect(PX + 4, 59, 1, 6, '#55564f');
  g.rect(1, 9, 22, 2, '#4a4a46'); g.rect(1, 9, 22, 1, '#5a5a56'); g.rect(PX, 7, 4, 3, '#8e8f88');
  [2, 6, 17, 21].forEach(x => { g.rect(x, 6, 2, 3, '#c9c9be'); g.set(x, 6, '#e6e6e0'); });
  if (opt.trafo) {
    g.rect(16, 15, 6, 11, '#6b7378'); g.rect(16, 15, 6, 1, '#8a9298'); g.rect(17, 16, 1, 9, '#8a9298'); g.rect(21, 16, 1, 9, '#4f565a');
    g.rect(16, 19, 6, 1, '#4f565a'); g.rect(16, 23, 6, 1, '#4f565a'); [17, 19, 21].forEach(x => g.rect(x, 12, 1, 3, '#c9c9be'));
    W(PX + 4, 14, 16, 14, '#262626'); W(PX + 4, 22, 16, 22, '#262626');
    g.rect(PX - 1, 34, 6, 7, '#55595d'); g.rect(PX, 35, 4, 3, '#2c3033'); g.set(PX + 2, 40, '#8a8a82');
    g.rect(PX - 1, 34, 6, 1, '#6f7378');
    for (let i = 0; i < 5; i++) { const x = 1 + Math.floor(r() * 8), y = 11 + Math.floor(r() * 12); W(x, y, x + Math.floor(r() * 5) - 1, y + 2 + Math.floor(r() * 3), '#262626'); }
    W(3, 11, 1, 20, '#262626'); W(6, 11, 5, 18, '#262626'); W(21, 11, 22, 17, '#262626'); W(18, 11, 19, 15, '#262626'); W(PX + 2, 11, PX - 3, 24, '#262626');
  } else {
    for (let i = 0; i < 3; i++) { const x = 1 + Math.floor(r() * 7), y = 11 + Math.floor(r() * 6); W(x, y, x + Math.floor(r() * 4) - 1, y + 2 + Math.floor(r() * 3), '#262626'); }
    W(3, 11, 1, 18, '#262626'); W(21, 11, 22, 16, '#262626'); W(PX + 2, 11, PX + 6, 19, '#262626');
    for (let k = 0; k < 3; k++) {                                                          // afiches chicha pegados
      const p = chichaG(k), px = PX - 2 + (k === 1 ? 1 : 0), py = 28 + k * 11 - (k === 2 ? 2 : 0);
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const c = p.get(x, y); if (c) g.set(px + x, py + y, c); }
    }
  }
  rust(g, r, 3, PX, 50, PX + 3, 58);
  g.outline();
  wires.forEach(w => g.line.apply(g, w));
  g.rect(6, 65, 12, 2, SHADOW);
  const c = mkC(g, 12, 65, 4, 4);
  c.top = { x: 0, y: 9 - 65 };                                                              // el travesano: de aqui salen los cables
  return c;
}

/* ---------- NPC ---------- */
function gallinazoPerch(fr) {
  const g = new G(16, 14), K = '#1f2023', K2 = '#2e3034', HD = '#8c8f92', HDD = '#6d7073', BK = '#a9a69b';
  g.ell(9, 8, 5.5, 3.6, K); g.ell(8, 6, 4, 3, K); g.rect(13, 9, 3, 2, K); g.rect(14, 11, 2, 1, K);          // cuerpo encorvado, cola
  g.ell(9, 8, 4.2, 2.4, K2); g.line(6, 7, 14, 10, '#3c3e44'); g.line(7, 9, 13, 11, '#3c3e44');          // alas plegadas
  g.set(5, 6, '#3c3e44'); g.set(6, 5, '#3c3e44');
  g.rect(7, 11, 1, 2, '#a39f93'); g.rect(10, 11, 1, 2, '#a39f93'); g.rect(6, 13, 3, 1, '#a39f93'); g.rect(9, 13, 3, 1, '#a39f93');   // patas
  if (fr === 0) {                                                                                      // cabeza baja, mirando a la izquierda
    g.rect(3, 6, 3, 3, HD); g.set(3, 6, HDD); g.set(5, 8, HDD); g.set(4, 7, '#141414');
    g.rect(1, 7, 2, 1, BK); g.set(0, 8, '#4a4a46'); g.set(1, 8, BK);
  } else {                                                                                             // gira la cabeza: de frente
    g.rect(3, 4, 4, 4, HD); g.set(3, 4, HDD); g.set(6, 6, HDD); g.set(4, 5, '#141414'); g.set(6, 5, '#141414'); g.set(5, 4, HDD);
    g.rect(4, 7, 2, 2, BK); g.set(4, 9, '#4a4a46'); g.rect(5, 6, 1, 1, HDD); g.rect(5, 8, 1, 1, '#4a4a46');
  }
  g.outline();
  return mkC(g, 8, 13);
}
function gallinazoFly(fr) {
  const g = new G(22, 14), K = '#1f2023', K2 = '#2e3034', TIP = '#8c8f92';
  const up = fr === 0, ty = up ? 0 : 13;
  const wing = (rx, tx, dir) => {
    const L = Math.hypot(tx - rx, ty - 7);
    tri(g, rx, 4, rx, 10, tx, ty, (x, y) => {
      const d = Math.hypot(x - rx, y - 7);
      return d > L * .7 ? ((x + y) % 2 ? TIP : '#5d6064') : (d > L * .4 ? K2 : K);
    });
    tri(g, rx, 10, tx + dir * 4, ty + (up ? 5 : -5), tx, ty, (x, y) => ((x + y) % 2 && Math.hypot(x - rx, y - 7) > L * .6) ? null : (Math.hypot(x - rx, y - 7) > L * .7 ? TIP : K2));
  };
  wing(10, 0, 1); wing(12, 21, -1);
  g.ell(11, 7.5, 2.4, 1.9, K); g.rect(12, 8, 3, 2, K); g.rect(13, 10, 2, 1, K);            // cuerpo y cola
  g.rect(8, 6, 3, 3, '#8c8f92'); g.set(8, 7, '#141414'); g.set(7, 7, '#a9a69b'); g.set(8, 6, '#6d7073');
  g.outline();
  return mkC(g, 11, 7);
}
const DOG = '#c9a77a', DOGD = '#a8865c', DOGL = '#dccaa5';
function dogG(o) {
  o = o || {};
  const g = new G(18, 15), l = o.legs || [0, 0, 0, 0], Y = 2;
  const R = (x, y, w, h, c) => g.rect(x, y + Y, w, h, c), S = (x, y, c) => g.set(x, y + Y, c);
  // patas: [trasera atras, trasera adelante, delantera atras, delantera adelante]
  R(4 + l[0], 8, 1, 4 - (l[0] ? 1 : 0), DOGD); R(6 + l[1], 8, 1, 4, DOG); R(11 + l[2], 8, 1, 4 - (l[2] ? 1 : 0), DOGD); R(13 + l[3], 8, 1, 4, DOG);
  [[4 + l[0], 12 - (l[0] ? 1 : 0)], [6 + l[1], 12], [11 + l[2], 12 - (l[2] ? 1 : 0)], [13 + l[3], 12]].forEach(p => S(p[0], p[1] - 1, '#6b5a47'));
  R(4, 4, 9, 4, DOG); R(11, 3, 3, 5, DOG); R(4, 7, 9, 1, DOGL); R(5, 4, 7, 1, DOGD);       // cuerpo flaco, pecho
  [6, 8, 10].forEach(x => S(x, 6, DOGD));                                                    // costillas
  if (o.tail) { R(2, 2, 2, 1, DOGD); S(1, 1, DOGD); S(1, 0, DOGD); } else { R(2, 3, 2, 1, DOGD); S(1, 2, DOGD); S(1, 3, DOGD); }   // cola fina
  if (!o.head) {
    R(13, 2, 2, 2, DOG); R(14, 1, 3, 3, DOG); R(16, 3, 2, 1, DOG); S(17, 3, '#2a2a2a');
    S(14, 0, DOGD); S(15, 0, DOGD); S(15, 2, '#141414');
  } else {                                                                                    // ladrido: cuello estirado, cabeza arriba, boca abierta
    R(12, 0, 2, 4, DOG); R(13, -1, 3, 3, DOG); R(15, -1, 3, 1, DOG); R(15, 1, 3, 1, DOGL);
    R(16, 0, 2, 1, '#2a1515'); S(17, -1, '#2a2a2a'); S(14, -1, '#141414'); S(13, -2, DOGD); S(14, -2, DOGD);
    if (o.head === 2) { R(16, 1, 2, 1, '#2a1515'); R(15, 2, 3, 1, DOGL); S(18, 0, null); }
  }
  g.outline();
  return g;
}
function buildPerro() {
  const A = [9, 13];
  const idle = [mkC(dogG({}), A[0], A[1]), mkC(dogG({ tail: 1 }), A[0], A[1])];
  const w = [[-1, 1, 1, -1], [0, 0, 0, 0], [1, -1, -1, 1], [0, 0, 0, 0]];
  const right = w.map((l, i) => mkC(dogG({ legs: l, tail: i % 2 }), A[0], A[1]));
  const left = w.map((l, i) => flipC(dogG({ legs: l, tail: i % 2 }), A[0], A[1]));
  const bark = [mkC(dogG({ head: 1 }), A[0], A[1]), mkC(dogG({ head: 2, tail: 1 }), A[0], A[1])];
  return { idle: idle, walk: { left: left, right: right }, bark: bark };
}

function buildArteCallao() {
  const T = {
    warehouseWall: [whWall(0), whWall(1)], warehouseGate: whGate(), roofWarehouse: [roofWarehouse(0), roofWarehouse(1)],
    bodegaShutter: bodegaShutter(), bodegaSign: [bodegaSign(0), bodegaSign(1), bodegaSign(2)],
    zebra: zebraTile(), hump: humpTile(),
    curbWYellow: mkC(curbWY()), curbEYellow: mkC(curbWY().flip())
  };
  const D = {
    muralCallao: muralCallao(), chicha: [0, 1, 2].map(v => mkC(chichaG(v), 4, 9)), flag: flagDecal(),
    pinkStripes: pinkStripesDecal(), graffiti: [graffitiDecal(0), graffitiDecal(1)]
  };
  const Pr = {
    combiE: [0, 1, 2].map(propCombiE), combiN: [0, 1, 2].map(propCombiN), custerE: propCusterE(), trailer: [propTrailer(0), propTrailer(1)],
    treeWhite: propTreeWhite(), palm: propPalm(), tank: propTank(), rebar: propRebar(),
    emoliente: propEmoliente(), anticuchos: propAnticuchos(),
    posteCables: posteBase({ seed: 7800, trafo: true }), posteAfiche: posteBase({ seed: 7900, trafo: false }),
    mototaxiVar: [0, 1, 2].map(propMototaxiVar)
  };
  const N = { gallinazo: { perch: [gallinazoPerch(0), gallinazoPerch(1)], fly: [gallinazoFly(0), gallinazoFly(1)] }, perro: buildPerro() };
  return { tiles: T, decals: D, props: Pr, npc: N };
}
/* ARTE-CALLAO-END */

/* ======================== ENSAMBLAJE ======================== */
ACH.sprites = Object.assign(ACH.sprites || {}, {      // base.js ya dejo lotArch y buildLot aqui: se conservan
  alex: { bird: buildAlex(true), nobird: buildAlex(false) },
  zombie: {
    caminante: buildZombie('caminante'),
    escolar: buildZombie('escolar'),
    ciego: buildZombie('ciego')
  },
  titina: { fly: titinaTiny() },
  tiles: {
    asphalt: [asphalt(11), asphalt(12), asphalt(13), asphalt(14)],
    asphaltCrack: asphaltCrack(),
    laneDash: laneDash(),
    sidewalk: [sidewalk(0), sidewalk(1), sidewalk(2)],
    curbW: (function () { const g = curbW(); return mkC(g); })(),
    curbE: (function () { const g = curbW().flip(); return mkC(g); })(),
    berma: [berma(0), berma(1), berma(2)],
    alley: [alley(0), alley(1), alley(2)],
    roof: [roof(0), roof(1), roof(2)],
    wallBrick: wallBrick(),
    wallPaint: [wallPaint('#a39a8a'), wallPaint('#8ea0a6'), wallPaint('#909a88')],
    door: door(),
    window: windowTile(),
    stairs: stairs()
  },
  props: {
    combi: propCombi(),
    car: propCar(),
    mototaxi: propMototaxi(),
    trash: propTrash(),
    poste: propPoste(),
    paradero: propParadero(),
    bags: propBags()
  }
});

/* Arte Callao v0.3: claves nuevas (solo agrega) */
const AC = buildArteCallao();
Object.assign(ACH.sprites.tiles, AC.tiles);
Object.assign(ACH.sprites.props, AC.props);
ACH.sprites.decals = AC.decals;
ACH.sprites.zombie.cobrador = buildZombie("cobrador");
ACH.sprites.npc = AC.npc;
/* Ayudantes para js/sprites/objetos.js (musicos, bailarines): los mismos cuerpos de zombie y la misma luz de borde. */
ACH.px.chars = { P: P, zFront: zFront, outlineRim: outlineRim, mkC: mkC, flipC: flipC, shade: shade, mix: mix, rng: rng, ZT: ZT };
})();
