/* ACHORADO - js/sprites/retratos.js  ->  ACH.retratos
 * Dueño: RETRATOS. Contrato: V010.md, «El sistema de diálogo con retrato» y «Arte: rediseño de Alexander y Titina».
 * Retratos de diálogo a la manera de Stardew Valley (96×96, fondo transparente; el marco lo pone dialogo.js).
 * Autosuficiente: no depende de ningún otro script. Script clásico, sin módulos.
 *
 * Técnica (la misma de cine.js, copiada aquí):
 *   1) cada capa grande (cuerpo, orejas, cara, pelo) se dibuja con formas vectoriales en un lienzo aparte;
 *   2) se PIXELA: umbral de alfa + cuantizar a la paleta de esa capa + contorno selout de 1 px de color (nunca negro en la piel);
 *   3) los rasgos chicos (ojos, cejas, nariz, boca, gotas) se pintan PIXEL A PIXEL encima, para que queden nítidos.
 * Cada combinación (quien, cara, boca, ojos) se guarda en un lienzo; draw() solo hace drawImage y unos pocos fillRect.
 */
(function () {
'use strict';
var ACH = window.ACH = window.ACH || {};
var S = 96, TAU = Math.PI * 2;

/* ============================ UTILIDADES ============================ */
function cv(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function hexRgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }

/* Catmull-Rom -> Bézier (cerrada o abierta) */
function crPath(pts, closed) {
  var p = new Path2D(), n = pts.length;
  p.moveTo(pts[0][0], pts[0][1]);
  var last = closed ? n : n - 1;
  for (var i = 0; i < last; i++) {
    var p0, p1 = pts[i], p2 = pts[(i + 1) % n], p3;
    if (closed) { p0 = pts[(i - 1 + n) % n]; p3 = pts[(i + 2) % n]; }
    else { p0 = pts[Math.max(i - 1, 0)]; p3 = pts[Math.min(i + 2, n - 1)]; }
    p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) p.closePath();
  return p;
}
function blob(x, pts, c) { x.fillStyle = c; x.fill(crPath(pts, true)); }
function poly(x, pts, c) { var p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath(); x.fillStyle = c; x.fill(p); }
function curve(x, pts, c, w) { x.strokeStyle = c; x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke(crPath(pts, false)); }
function el(x, cx, cy, rx, ry, c, rot) { x.fillStyle = c; x.beginPath(); x.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); x.fill(); }
/* mechón ahusado: línea central -> contorno cerrado */
function taper(pts, w0, w1) {
  var L = [], R = [], n = pts.length;
  for (var i = 0; i < n; i++) {
    var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    var nx = -dy / l, ny = dx / l, w = (w0 + (w1 - w0) * i / (n - 1)) / 2;
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  return L.concat(R.reverse());
}

/* ============================ PIXELADO ============================ */
/* Paleta de capa: lista de [relleno, contorno]. El contorno selout de cada pixel exterior toma el color
   de contorno del vecino opaco (abajo, izquierda, derecha, arriba). */
function Pal(list) {
  var cols = [], outs = [], lut = new Uint8Array(32768), n = list.length, i, k;
  for (i = 0; i < n; i++) { cols.push(hexRgb(list[i][0])); outs.push(list[i][1] ? hexRgb(list[i][1]) : null); }
  for (i = 0; i < 32768; i++) {
    var r = ((i >> 10) & 31) * 8 + 4, g = ((i >> 5) & 31) * 8 + 4, b = (i & 31) * 8 + 4, best = 0, bd = 1e9;
    for (k = 0; k < n; k++) {
      var c = cols[k], dr = r - c[0], dg = g - c[1], db = b - c[2], rm = (r + c[0]) * 0.5;
      var d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
      if (d < bd) { bd = d; best = k; }
    }
    lut[i] = best;
  }
  return { cols: cols, outs: outs, lut: lut };
}
/* dibuja con draw(x) en 96×96, pixela y devuelve ImageData */
function layer(draw, pal, outline) {
  var c = cv(S, S), x = c.getContext('2d', { willReadFrequently: true });
  draw(x);
  var id = x.getImageData(0, 0, S, S), d = id.data, idx = new Int16Array(S * S), i, p, y, xx;
  for (p = 0; p < S * S; p++) {
    i = p * 4;
    if (d[i + 3] < 110) { d[i + 3] = 0; idx[p] = -1; continue; }
    var k = pal.lut[((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3)], cc = pal.cols[k];
    d[i] = cc[0]; d[i + 1] = cc[1]; d[i + 2] = cc[2]; d[i + 3] = 255; idx[p] = k;
  }
  if (outline !== false) {
    var out = new Uint8ClampedArray(d);
    for (y = 0; y < S; y++) for (xx = 0; xx < S; xx++) {
      p = y * S + xx; if (idx[p] >= 0) continue;
      var j = -1;
      if (y + 1 < S && idx[p + S] >= 0) j = p + S;
      else if (xx > 0 && idx[p - 1] >= 0) j = p - 1;
      else if (xx + 1 < S && idx[p + 1] >= 0) j = p + 1;
      else if (y > 0 && idx[p - S] >= 0) j = p - S;
      if (j < 0) continue;
      var o = pal.outs[idx[j]]; if (!o) continue;
      i = p * 4; out[i] = o[0]; out[i + 1] = o[1]; out[i + 2] = o[2]; out[i + 3] = 255;
    }
    d.set(out);
  }
  id.fill = idx;   // indice de paleta por pixel (-1 = vacio o contorno)
  return id;
}
/* compone ImageData b sobre a (alfa todo o nada) */
function over(a, b) {
  var A = a.data, B = b.data;
  for (var i = 0; i < A.length; i += 4) if (B[i + 3]) { A[i] = B[i]; A[i + 1] = B[i + 1]; A[i + 2] = B[i + 2]; A[i + 3] = 255; }
}
function cloneID(id) { var n = new ImageData(S, S); n.data.set(id.data); return n; }

/* pintor de pixeles sobre un ImageData. Los colores son claves de C (o hex). */
var RGB = {};
function rgbOf(c) { var r = RGB[c]; if (!r) { r = RGB[c] = hexRgb(C[c] || c); } return r; }
function Painter(id) {
  var d = id.data;
  return {
    p: function (x, y, c) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= S || y >= S || !c) return;
      var r = rgbOf(c), i = (y * S + x) * 4; d[i] = r[0]; d[i + 1] = r[1]; d[i + 2] = r[2]; d[i + 3] = 255;
    },
    get: function (x, y) { var i = (y * S + x) * 4; return d[i + 3] ? [d[i], d[i + 1], d[i + 2]] : null; }
  };
}

/* ============================ COLORES ============================ */
var C = {
  // piel (rampa de la hoja de personaje)
  sD: '#80523a', s: '#a8714c', b: '#c48f63', l: '#dcae80', h: '#ecc49a', mej: '#d4937a', sO: '#6e4430',
  // pelo y cejas
  pB: '#2e221c', pL: '#4a382d', pH: '#5e4a3c', pO: '#1a120e',
  // ojos
  ir: '#4a2e1e', irL: '#7a5034', pu: '#22150e', bri: '#ffffff', esc: '#f4efe8', escS: '#cbbdb0', pest: '#2e221c',
  // boca
  lab: '#5e2a20', boc: '#4e1e1e', bocD: '#361414', die: '#f6f1e9', dieS: '#d6cabb', len: '#cf6464', lenL: '#e88a80', lenO: '#8e3a3e',
  // camiseta, correa, guitarra
  wl: '#e8e8ec', ws: '#b9bdcc', wd: '#8e93a8', bl: '#3d62ad', bb: '#2b4a8c', bd: '#1f3566', bdd: '#172748', camO: '#131b34',
  co: '#6b4223', coL: '#8a5a32', coD: '#4a2c18', coO: '#2a180c', cos: '#b08458',
  gm: '#3a2a1e', gmL: '#5a4030', gc: '#6b4223', gcL: '#8f5d33', met: '#c9c9be', gO: '#1e140c',
  // gota de sudor
  go: '#bfe6ff', goL: '#ffffff', goO: '#4f82b4',
  // Titina
  t0: '#4a4e55', t1: '#5d6168', t2: '#787d86', t3: '#8e939b', t4: '#a7abb2', t5: '#c3c6cb', tO: '#33363c',
  ve: '#4f9a6e', ve2: '#4f8c82', mo2: '#6c6f98', mo: '#8a5a9e', veL: '#76b88c', moL: '#a679b6',
  ojo: '#e07a2a', ojoD: '#b8561a', ojoL: '#f3a050', ani: '#d8cbc4', aniD: '#a8988f', pico: '#3b3436', picoL: '#5a5254', cera: '#ece7de', ceraS: '#c9c2b8',
  barra: '#2b2a2e', picoI: '#8e4a4e'
};

/* ============================ PALETAS DE CAPA ============================ */
var PAL = null;
function palettes() {
  if (PAL) return PAL;
  var piel = [[C.sD, C.sO], [C.s, C.sO], [C.b, C.sO], [C.l, C.sO], [C.h, C.sO], [C.mej, C.sO]];
  PAL = {
    body: Pal(piel.concat([[C.wl, C.camO], [C.ws, C.camO], [C.wd, C.camO], ['#6e7388', C.camO], [C.bl, C.camO], [C.bb, C.camO], [C.bd, C.camO], [C.bdd, C.camO],
      [C.co, C.coO], [C.coL, C.coO], [C.coD, C.coO], [C.gm, C.gO], [C.gmL, C.gO], [C.gc, C.gO], [C.gcL, C.gO], [C.met, C.gO]])),
    piel: Pal(piel),
    pelo: Pal([[C.pB, C.pO], [C.pL, C.pO], [C.pH, C.pO]]),
    tit: Pal([[C.t0, C.tO], [C.t1, C.tO], [C.t2, C.tO], [C.t3, C.tO], [C.t4, C.tO], [C.t5, C.tO],
      [C.ve, C.tO], [C.ve2, C.tO], [C.mo2, C.tO], [C.mo, C.tO], [C.veL, C.tO], [C.moL, C.tO], [C.barra, C.tO]])
  };
  return PAL;
}

/* ===================================================================================== */
/* ================================== ALEXANDER ======================================== */
/* ===================================================================================== */
/* Pose de la cabeza: giro en grados (positivo = hacia la derecha del espectador), alrededor del cuello. */
var PIV = [47, 60];
function headXf(x, pose) { x.translate(PIV[0] + pose.dx, PIV[1] + pose.dy); x.rotate(pose.a * Math.PI / 180); x.translate(-PIV[0], -PIV[1]); }
function headPt(pose, px, py) {
  var a = pose.a * Math.PI / 180, dx = px - PIV[0], dy = py - PIV[1], c = Math.cos(a), s = Math.sin(a);
  return [PIV[0] + pose.dx + dx * c - dy * s, PIV[1] + pose.dy + dx * s + dy * c];
}

/* --- cuerpo: mástil de la guitarra, camiseta de rayas, cuello en V, correa --- */
function bodyVec(x, sh) {
  sh = sh || 0;   // hombros encogidos (miedo): px hacia arriba
  // mástil asomando detrás del hombro derecho (del espectador)
  poly(x, [[71, 84], [78, 85], [88, 33], [82, 32]], C.gc);
  poly(x, [[73, 84], [77, 85], [87, 33], [84, 33]], C.gm);
  // clavijero
  blob(x, [[81, 34], [89, 35], [92, 26], [91, 17], [85, 15], [82, 22]], C.gc);
  blob(x, [[83, 32], [86, 32], [87, 22], [85, 18], [83, 24]], C.gcL);
  // camiseta
  var top = 67 - sh;
  var shirt = crPath([[0, 96], [1, 86], [6, 78], [16, 73 - sh], [28, 69 - sh], [38, top], [47, top + 1], [56, top], [66, 69 - sh], [78, 73 - sh], [88, 78], [94, 86], [96, 96]], true);
  x.save(); x.clip(shirt);
  x.fillStyle = C.wl; x.fillRect(0, 50, 96, 46);
  // rayas verticales que se abren con el pecho
  for (var k = -6; k <= 6; k++) {
    var xc = 47 + k * 8 + 2, L = [], R = [];
    for (var y = 60; y <= 97; y += 4) {
      var spread = k * (y - 60) * 0.035;
      L.push([xc + spread - 2, y]); R.push([xc + spread + 2, y]);
    }
    poly(x, L.concat(R.reverse()), C.bb);
  }
  // sombra a la derecha y abajo (luz arriba a la izquierda); luz en el hombro izquierdo
  x.globalAlpha = 0.3;
  blob(x, [[64, 70], [84, 74], [96, 84], [96, 96], [70, 96], [66, 84]], '#000');
  x.globalAlpha = 0.22; blob(x, [[0, 93], [30, 91.5], [66, 92], [66, 97], [0, 97]], '#000');
  x.globalAlpha = 0.24;
  blob(x, [[42, 70], [52, 70], [50, 80], [44, 80]], '#000');   // sombra del mentón en el pecho
  x.globalAlpha = 0.28;
  blob(x, [[4, 80], [14, 73], [28, 70], [22, 76], [10, 82]], '#fff');
  x.globalAlpha = 1;
  x.restore();
  // cuello y pecho dentro de la V
  poly(x, [[40.5, 50], [54.5, 50], [55, top + 1], [47.5, 79 - sh], [40, top + 1]], C.b);
  poly(x, [[50, 50], [54.5, 50], [55, top + 1], [51, 72 - sh]], C.s);
  poly(x, [[40.5, 50], [54.5, 50], [54.5, 58], [47, 61], [40.5, 58]], C.s);   // sombra bajo el mentón
  poly(x, [[41, 51], [54, 51], [54, 55], [47, 57], [41, 55]], C.sD);
  // cuello en V azul
  x.strokeStyle = C.bd; x.lineWidth = 2.2; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(38.5, top); x.lineTo(47.5, 80 - sh); x.lineTo(56.5, top); x.stroke();
  x.strokeStyle = C.bl; x.lineWidth = 1;
  x.beginPath(); x.moveTo(38, top - 0.5); x.lineTo(46.5, 79.5 - sh); x.stroke();
  // correa café cruzando el pecho
  poly(x, [[69, 68 - sh], [77, 70 - sh], [25, 97], [15, 97]], C.co);
  poly(x, [[69, 68 - sh], [71.5, 68.6 - sh], [18, 97], [15, 97]], C.coL);
  poly(x, [[75.5, 69.6 - sh], [77, 70 - sh], [25, 97], [23, 97]], C.coD);
}
function bodyDetail(P, sh) {
  sh = sh || 0;
  // trastes y cuerdas del mástil
  for (var y = 38; y < 70 - sh; y += 6) {
    var t = (y - 33) / 52, xc = lerp(85, 75, t);
    P.p(xc - 1, y, 'met'); P.p(xc, y, 'met'); P.p(xc + 1, y, 'met');
  }
  // clavijas
  [[80, 31], [80, 26], [81, 21], [93, 30], [93, 24], [92, 19]].forEach(function (q, i) { var o = i < 3 ? -1 : 1; P.p(q[0], q[1], 'met'); P.p(q[0] + o, q[1], 'met'); P.p(q[0] + o, q[1] + 1, 'gO'); P.p(q[0] + 2 * o, q[1], 'gO'); });
  // costura de la correa
  for (var i = 0; i < 16; i++) {
    var u = i / 16, px = lerp(72, 21, u), py = lerp(70 - sh, 97, u);
    if (i % 2 === 0) P.p(px, py, 'cos');
  }
}

/* --- orejas --- */
function earsVec(x, pose) {
  x.save(); headXf(x, pose);
  el(x, 67.5, 42, 3.6, 5.6, C.b);
  el(x, 68.2, 42.5, 1.6, 3.6, C.s);
  el(x, 68.6, 44, 0.9, 1.8, C.sD);
  el(x, 28.6, 42.5, 2.2, 4.4, C.s);
  x.restore();
}

/* --- cara: forma, luces y sombras por bandas --- */
var FACE = [[47, 19.5], [58, 20], [65.5, 26], [67.5, 36], [66.8, 46], [61.8, 53.2], [55, 58.6], [46.5, 60.8], [40, 58.8], [34.2, 53.8], [29.6, 47], [28.6, 37], [30.6, 27], [37, 21]];
function headVec(x, pose) {
  x.save(); headXf(x, pose);
  var face = crPath(FACE, true);
  x.fillStyle = C.b; x.fill(face);
  x.save(); x.clip(face);
  el(x, 41, 37, 16, 19, C.l);                 // luz grande arriba a la izquierda
  el(x, 36, 29, 4.5, 2.6, C.h, -0.3);             // brillo de la frente
  el(x, 34.5, 45, 2.2, 1.6, C.h);                 // brillo del pómulo
  el(x, 74.5, 40, 9, 25, C.b);                    // borde derecho: vuelve a base
  el(x, 77, 41, 9.6, 24, C.s);                    // sombra del lado derecho
  el(x, 47, 67.5, 19, 7.2, C.s);                  // sombra bajo la mandíbula
  // sombra que echa el flequillo en la frente
  hairFringe(x, C.s, 1, 2.2);
  x.restore();
  x.restore();
}

/* --- pelo: casquete desordenado de mechones redondos + flequillo que cae a la derecha --- */
function hairFringe(x, col, ox, oy) {
  ox = ox || 0; oy = oy || 0;
  x.save(); x.translate(ox, oy);
  blob(x, taper([[33, 16], [36, 21], [38.5, 25]], 9, 1.5), col);
  blob(x, taper([[39, 14], [44, 20.5], [48.5, 27]], 11, 1.5), col);
  blob(x, taper([[47, 13], [53, 20], [57.5, 26.5]], 11, 1.5), col);
  blob(x, taper([[56, 14], [61, 20], [64, 25.5]], 9, 1.5), col);
  x.restore();
}
function hairVec(x, pose) {
  x.save(); headXf(x, pose);
  var cap = [[27.5, 44], [26, 34], [25.5, 24], [29, 14.5], [37, 8.5], [48, 6], [59, 7.5], [67.5, 13], [71.5, 22], [71.2, 33], [69.5, 39],
    [66.5, 44], [65, 34], [63, 26], [52, 22], [42, 23], [33, 26], [31, 33], [30.6, 44]];
  blob(x, cap, C.pB);
  // mechones redondos en la silueta (desordenado, no púas)
  el(x, 28.5, 16, 5, 5.5, C.pB); el(x, 37, 9, 6.5, 5, C.pB); el(x, 51, 6.5, 7, 4.5, C.pB); el(x, 63, 9.5, 6.5, 5, C.pB); el(x, 70, 19, 4.5, 6, C.pB);
  blob(x, taper([[49, 8], [52, 4], [57, 2.5]], 4.5, 1), C.pB);          // remolino que se para
  blob(x, taper([[25.8, 24], [24, 30], [25, 36]], 4, 1.4), C.pB);
  hairFringe(x, C.pB);
  // patillas cortas
  blob(x, [[28.6, 34], [31.2, 34], [31.2, 44], [29.4, 45.5], [28.4, 42]], C.pB);
  blob(x, [[64.5, 33], [67.4, 33], [67.6, 42], [66.4, 44.6], [64.8, 42]], C.pB);
  // luces (pL) en bandas: arriba a la izquierda de cada mechón
  el(x, 36, 11, 5, 2.6, C.pL, -0.3); el(x, 48, 8, 6, 2.2, C.pL, -0.1); el(x, 29, 18, 2.4, 3.6, C.pL); el(x, 60, 10, 4, 1.8, C.pL, 0.3);
  blob(x, taper([[39.5, 16], [43.5, 21], [46.5, 25.5]], 3.4, 0.8), C.pL);
  blob(x, taper([[48, 15], [52.5, 20], [55.5, 24.5]], 3.4, 0.8), C.pL);
  blob(x, taper([[33.5, 18], [35.5, 21.5]], 2.6, 0.8), C.pL);
  blob(x, taper([[57, 16], [60, 20]], 2.4, 0.8), C.pL);
  // brillo (pH) en arco
  blob(x, taper([[31, 14], [35, 10.5], [41, 9]], 1.6, 1.2), C.pH);
  blob(x, taper([[45, 8.2], [50, 7.2]], 1.4, 1.2), C.pH);
  x.restore();
}

/* ---------- rasgos pixel a pixel ---------- */
/* Ojo. e = {w,h,iris,gx,lid,bot,slant,slantIn,arc,small}. outerLeft: la esquina de afuera está a la izquierda. */
function eye(P, x0, y0, e, outerLeft, state) {
  var w = e.w || 6, h = e.h || 6, ir = e.iris || 3, i, c, r;
  function outer(c) { return outerLeft ? (w - 1 - c) / (w - 1) : c / (w - 1); }
  function line(yb, bend) {                       // párpado cerrado: arco (bend>0 hacia abajo)
    for (c = 0; c < w; c++) {
      var u = (c - (w - 1) / 2) / ((w - 1) / 2), y = yb + Math.round(bend * (1 - u * u));
      P.p(x0 + c, y0 + y, 'pest');
    }
    var oc = outerLeft ? -1 : w;
    P.p(x0 + oc, y0 + yb + (bend > 0 ? -1 : 1) * 0 , 'pest');
  }
  if (e.arc) { line(Math.round(h * 0.55) + 1, -1.6); var oc0 = outerLeft ? 0 : w - 1; P.p(x0 + oc0 + (outerLeft ? -1 : 1), y0 + Math.round(h * 0.55) + 2, 'pest'); return; }
  if (state === 'cerrados') { line(Math.round(h * 0.6), 1.2); return; }
  var lid = e.lid || 0;
  if (state === 'medio') lid = Math.max(lid + 1, Math.ceil(h / 2));
  var bot = e.bot || 0;
  var ix0 = Math.round((w - ir) / 2 + (e.gx || 0));
  for (c = 0; c < w; c++) {
    var inset = (w >= 5) ? 1 : 0;
    var lc = lid + Math.round((e.slant || 0) * outer(c) + (e.slantIn || 0) * (1 - outer(c)));
    var u = (c - (w - 1) / 2) / ((w - 1) / 2);
    var bc = bot ? bot + (Math.abs(u) < 0.6 ? 1 : 0) : 0;
    var first = -1, last = -1;
    for (r = 0; r < h; r++) {
      var ins = (r === 0 || r === h - 1) ? inset : 0;
      if (c < ins || c > w - 1 - ins) continue;
      if (r < lc || r >= h - bc) continue;
      if (first < 0) first = r; last = r;
    }
    if (first < 0) { continue; }
    for (r = first; r <= last; r++) {
      var col = 'esc';
      var inI = c >= ix0 && c < ix0 + ir;
      if (inI) {
        col = (r === last && last - first >= 2) ? 'irL' : 'ir';
        if (!e.small && ir >= 3 && c === ix0 + 1 && r > first && r < last) col = 'pu';
        if (e.small && c === ix0 + (ir > 1 ? 1 : 0) && r === first + 1) col = 'pu';
      } else if (r === first) col = 'escS';
      P.p(x0 + c, y0 + r, col);
    }
    // brillo de 1-2 px arriba a la izquierda del iris
    if (c === ix0) P.p(x0 + c, y0 + first + (last - first >= 3 ? 1 : 0), 'bri');
    if (c === ix0 + 1 && (e.big)) P.p(x0 + c, y0 + first + 1, 'bri');
    // pestaña superior
    P.p(x0 + c, y0 + first - 1, 'pest');
    if (bot && Math.abs(u) < 0.8) P.p(x0 + c, y0 + last + 1, 's');
  }
  // pestaña de la esquina de afuera (gruesa) y un pelo que sale
  var ocx = outerLeft ? 0 : w - 1, ofs = outerLeft ? -1 : 1;
  var lco = lid + Math.round((e.slant || 0));
  P.p(x0 + ocx + ofs, y0 + Math.max(0, lco) + (lid ? 0 : 0), 'pest');
}
/* Ceja gruesa: inner = punta de adentro. b = {yin, yout, arch}; len px. */
function brow(P, x0, y0, len, b, outerLeft) {
  for (var c = 0; c < len; c++) {
    var t = outerLeft ? (len - 1 - c) / (len - 1) : c / (len - 1);      // 0 adentro, 1 afuera
    var y = y0 + lerp(b.yin || 0, b.yout || 0, t) - (b.arch == null ? 1 : b.arch) * 4 * t * (1 - t);
    var yr = Math.round(y), th = t > 0.82 ? 1 : 2;
    P.p(x0 + c, yr, 'pB');
    if (th > 1) P.p(x0 + c, yr + 1, 'pB');
    if (t < 0.6 && th > 1 && c % 2 === 0) P.p(x0 + c, yr, 'pL');
  }
}
/* Boca. m = {w, open, smile, asym, teeth, tongue, crook, wave, clench, o, out, frown} centrada en (cx, cy) = línea superior. */
function mouth(P, cx, cy, m) {
  var w = m.w || 7, hw = (w - 1) / 2, c, r, x0 = Math.round(cx - hw);
  var tops = [], bots = [];
  for (c = 0; c < w; c++) {
    var u = (c - hw) / (hw || 1), uu = u * u;
    var t = -(m.smile || 0) * uu - (m.asym || 0) * Math.max(0, u) * Math.max(0, u) + (m.asymL || 0) * Math.max(0, -u);
    if (m.wave) t += Math.round(Math.sin(c * Math.PI / 2) * m.wave);
    var op = m.open || 0, b;
    if (m.o) { var k = Math.sqrt(Math.max(0, 1 - uu)); t = -op / 2 * k; b = op / 2 * k; }
    else b = t + op * Math.pow(Math.max(0, 1 - uu), m.flat ? 0.25 : 0.6);
    tops.push(Math.round(cy + t)); bots.push(Math.round(cy + b));
  }
  for (c = 0; c < w; c++) {
    var X = x0 + c, T = tops[c], B = bots[c], u2 = (c - hw) / (hw || 1);
    if (B - T < 2) {            // línea cerrada
      P.p(X, T, 'lab'); if (B > T) P.p(X, B, 'lab');
      continue;
    }
    P.p(X, T, 'lab'); P.p(X, B, 'lab');
    for (r = T + 1; r < B; r++) {
      var col = (r === B - 1 || r === T + 1 && !m.teeth) ? 'bocD' : 'boc';
      if (m.clench) col = (r === Math.round((T + B) / 2)) ? 'bocD' : ((c % 3 === 0) ? 'dieS' : 'die');
      else {
        if (m.teeth && r <= T + m.teeth && Math.abs(u2) < 0.85) col = (r === T + m.teeth && m.teeth > 1) ? 'dieS' : 'die';
        if (m.lowTeeth && r === B - 1 && Math.abs(u2) < 0.7) col = 'dieS';
        if (m.tongue && r >= B - (B - T >= 5 ? 2 : 1) && Math.abs(u2) < 0.55) col = (r === B - 1 && Math.abs(u2) < 0.25) ? 'lenL' : 'len';
      }
      P.p(X, r, col);
    }
  }
  // diente chueco: uno que baja un pixel más (o asoma sobre el labio si la boca está cerrada)
  if (m.crook) {
    var cc = Math.round(hw) + (m.crookX || 1), Tt = tops[cc], Bb = bots[cc];
    if (Bb - Tt >= 3) { P.p(x0 + cc, Tt + (m.teeth || 1) + 1, 'die'); }
    else { P.p(x0 + cc, Tt + 1, 'die'); P.p(x0 + cc, Tt + 2, 'dieS'); }
  }
  // labio de abajo: una sombrita bajo el centro
  if (!m.noLip) {
    var mid = Math.round(hw), yb = bots[mid] + 2;
    if (!m.out) for (c = mid - 1; c <= mid + 1; c++) P.p(x0 + c, yb, 's');
  }
  // lengua afuera
  if (m.out) {
    var mc = Math.round(hw), bb = bots[mc];
    for (c = mc - 2; c <= mc + 2; c++) {
      var dep = (Math.abs(c - mc) === 2) ? m.out - 1 : m.out;
      for (r = 1; r <= dep; r++) P.p(x0 + c, bb + r, (r === dep || Math.abs(c - mc) === 2) ? 'lenO' : (c === mc - 1 && r < dep ? 'lenL' : 'len'));
    }
    P.p(x0 + mc, bb + 1, 'lenO');   // surco de la lengua
  }
}
function nose(P, x, y, scrunch) {
  P.p(x - 1, y, 'h');
  P.p(x + 1, y, 's'); P.p(x + 1, y + 1, 's'); P.p(x, y + 2, 's'); P.p(x - 1, y + 2, 's');
  if (scrunch) { P.p(x - 1, y - 3, 's'); P.p(x, y - 3, 's'); P.p(x + 1, y - 3, 's'); P.p(x, y - 5, 's'); P.p(x + 1, y - 5, 's'); P.p(x + 2, y - 5, 's'); }
}
function cheeks(P, pose, k) {
  var a = headPt(pose, 36, 49), b = headPt(pose, 57, 49);
  for (var i = -1; i <= 1; i++) { P.p(a[0] + i, a[1], 'mej'); P.p(b[0] + i, b[1], 'mej'); }
  if (k > 1) { P.p(a[0], a[1] - 1, 'mej'); P.p(b[0], b[1] - 1, 'mej'); P.p(a[0] + 2, a[1], 'mej'); P.p(b[0] - 2, b[1], 'mej'); }
}

/* ---------- las caras ---------- */
/* Cada cara: pose (a, dx, dy, sh), ojos L/R, cejas L/R, bocas [0,1,2], extras. */
var N = { w: 6, h: 6, iris: 3, gx: -0.5 };
function E(o) { var r = {}, k; for (k in N) r[k] = N[k]; for (k in o) r[k] = o[k]; return r; }
var CARAS_A = {
  habla: {
    pose: { a: 0, dx: 0, dy: 0 }, eL: E({}), eR: E({}), bL: { yin: 0, yout: 0, arch: 1 }, bR: { yin: 0, yout: 0, arch: 1 },
    m: [{ w: 8, smile: 0.8 }, { w: 8, open: 3, teeth: 1, smile: 0.6 }, { w: 8, open: 5, teeth: 1, tongue: 1, smile: 0.5 }], ch: 1
  },
  feliz: {
    pose: { a: 2, dx: 0, dy: 0 }, eL: E({ bot: 1 }), eR: E({ bot: 1 }), bL: { yin: -1, yout: 0, arch: 1.5 }, bR: { yin: -1, yout: 0, arch: 1.5 },
    m: [{ w: 11, smile: 2.6, crook: 1 }, { w: 11, open: 4, smile: 2.4, teeth: 1, crook: 1, flat: 1 }, { w: 11, open: 6, smile: 2.2, teeth: 1, tongue: 1, crook: 1, flat: 1 }], ch: 2
  },
  risa: {
    pose: { a: -7, dx: -1, dy: -1 }, eL: E({ arc: 1 }), eR: E({ arc: 1 }), bL: { yin: -2, yout: -1, arch: 2 }, bR: { yin: -2, yout: -1, arch: 2 },
    m: [{ w: 10, open: 5, smile: 2, teeth: 1, tongue: 1, crook: 1, flat: 1 }, { w: 10, open: 6, smile: 2, teeth: 1, tongue: 1, crook: 1, flat: 1 }, { w: 11, open: 8, smile: 2, teeth: 1, tongue: 1, crook: 1, flat: 1 }], ch: 2
  },
  mueca: {
    pose: { a: 3, dx: 0, dy: 0 }, eL: E({ lid: 0 }), eR: E({ lid: 2, bot: 1 }), bL: { yin: -1, yout: -3, arch: 1.5 }, bR: { yin: 1, yout: 1, arch: 0 },
    m: [{ w: 11, open: 4, clench: 1, flat: 1, smile: -0.6, asym: 2 }, { w: 11, open: 5, clench: 1, flat: 1, smile: -0.6, asym: 2 }, { w: 12, open: 6, clench: 1, flat: 1, smile: -0.6, asym: 2.2 }]
  },
  sorpresa: {
    pose: { a: 0, dx: 0, dy: -1 }, eL: E({ w: 7, h: 8, iris: 3, gx: 0, big: 1 }), eR: E({ w: 7, h: 8, iris: 3, gx: 0, big: 1 }), bL: { yin: -4, yout: -2.5, arch: 2.5 }, bR: { yin: -4, yout: -2.5, arch: 2.5 },
    eyeDy: -1,
    m: [{ w: 5, o: 1, open: 4 }, { w: 6, o: 1, open: 6 }, { w: 7, o: 1, open: 8, tongue: 1 }]
  },
  serio: {
    pose: { a: 0, dx: 0, dy: 0 }, eL: E({ lid: 1, slantIn: 0 }), eR: E({ lid: 1 }), bL: { yin: 2, yout: -0.5, arch: 0 }, bR: { yin: 2, yout: -0.5, arch: 0 },
    m: [{ w: 8, smile: -0.6 }, { w: 8, open: 3, teeth: 1, flat: 1, smile: -0.4 }, { w: 8, open: 4, teeth: 2, flat: 1, smile: -0.4 }]
  },
  picaro: {
    pose: { a: 4, dx: 0, dy: 0 }, eL: E({ lid: 1, gx: -1 }), eR: E({ lid: 2, gx: -1 }), bL: { yin: -3, yout: -4.5, arch: 2.5 }, bR: { yin: 1.5, yout: 0.5, arch: 0 },
    m: [{ w: 9, smile: 0.5, asym: 3, crook: 1, crookX: 1 }, { w: 9, open: 3, asym: 3, smile: 0.4, teeth: 1, crook: 1 }, { w: 9, open: 5, asym: 3, teeth: 1, tongue: 1, crook: 1 }], ch: 1
  },
  triste: {
    pose: { a: -3, dx: 0, dy: 1 }, eL: E({ lid: 1, slant: 1, gx: 0 }), eR: E({ lid: 1, slant: 1, gx: 0 }), bL: { yin: -2, yout: 1.5, arch: 0.3 }, bR: { yin: -2, yout: 1.5, arch: 0.3 },
    m: [{ w: 8, smile: -2 }, { w: 8, open: 3, smile: -1.8 }, { w: 8, open: 5, smile: -1.6, tongue: 1 }]
  },
  cansado: {
    pose: { a: -2, dx: 0, dy: 2 }, eL: E({ lid: 3, slant: 0.6 }), eR: E({ lid: 3, slant: 0.6 }), bL: { yin: -1, yout: 1, arch: 0.5 }, bR: { yin: -1, yout: 1, arch: 0.5 },
    m: [{ w: 6, open: 3, tongue: 1, smile: -0.3 }, { w: 7, open: 4, tongue: 1, smile: -0.3 }, { w: 7, open: 6, tongue: 1, smile: -0.3 }], sudor: 1
  },
  miedo: {
    pose: { a: 0, dx: 0, dy: 1, sh: 2 }, eL: E({ w: 6, h: 7, iris: 2, gx: 0.5, small: 1 }), eR: E({ w: 6, h: 7, iris: 2, gx: 0.5, small: 1 }), bL: { yin: -3, yout: 0, arch: 0.2 }, bR: { yin: -3, yout: 0, arch: 0.2 },
    eyeDy: -1,
    m: [{ w: 9, wave: 1, smile: -0.5 }, { w: 9, open: 3, wave: 1, teeth: 1, smile: -0.5 }, { w: 9, open: 4, wave: 1, teeth: 1, smile: -0.5 }], sudor: 1
  },
  asco: {
    pose: { a: 5, dx: 1, dy: 0 }, eL: E({ lid: 2, bot: 1 }), eR: E({ lid: 3, bot: 1 }), bL: { yin: 2, yout: 0, arch: 0 }, bR: { yin: 2, yout: 1, arch: 0 },
    scrunch: 1,
    m: [{ w: 8, open: 2, smile: -0.8, asymL: 0, out: 3 }, { w: 8, open: 3, smile: -0.8, out: 4 }, { w: 8, open: 4, smile: -0.8, out: 5 }]
  }
};
var CARAS = ['habla', 'feliz', 'risa', 'mueca', 'sorpresa', 'serio', 'picaro', 'triste', 'cansado', 'miedo', 'asco'];

/* bases (cuerpo + orejas + cara + pelo) por pose */
var baseCache = {};
function poseKey(p) { return p.a + '_' + p.dx + '_' + p.dy + '_' + (p.sh || 0); }
function baseA(pose) {
  var k = poseKey(pose); if (baseCache[k]) return baseCache[k];
  var pal = palettes(), sh = pose.sh || 0;
  var id = layer(function (x) { bodyVec(x, sh); }, pal.body);
  bodyDetail(Painter(id), sh);
  over(id, layer(function (x) { earsVec(x, pose); }, pal.piel));
  over(id, layer(function (x) { headVec(x, pose); }, pal.piel));
  over(id, layer(function (x) { hairVec(x, pose); }, pal.pelo));
  return (baseCache[k] = id);
}
function buildA(cara, boca, ojos) {
  var f = CARAS_A[cara], pose = f.pose, id = cloneID(baseA(pose)), P = Painter(id);
  var edy = f.eyeDy || 0;
  function at(px, py) { var q = headPt(pose, px, py); return [Math.round(q[0]), Math.round(q[1])]; }
  // mejillas
  if (f.ch) cheeks(P, pose, f.ch);
  // ojos (caja superior izquierda), centrados en (38, 39) y (55, 39)
  var eL = f.eL, eR = f.eR;
  var cL = at(37.5, 39), cR = at(55.5, 39);
  eye(P, cL[0] - Math.floor((eL.w) / 2) + 1, cL[1] - Math.floor(eL.h / 2) + edy, eL, true, ojos);
  eye(P, cR[0] - Math.floor((eR.w) / 2) + 1, cR[1] - Math.floor(eR.h / 2) + edy, eR, false, ojos);
  // cejas (8 px), sobre los ojos
  var bLp = at(34, 31), bRp = at(52, 31);
  brow(P, bLp[0], bLp[1], 8, f.bL, true);
  brow(P, bRp[0], bRp[1], 8, f.bR, false);
  // nariz
  var n = at(46, 45 - (f.scrunch ? 1 : 0)); nose(P, n[0], n[1], f.scrunch);
  // boca
  var mo = at(46, 51.5); mouth(P, mo[0], mo[1], f.m[boca]);
  var c = cv(S, S); c.getContext('2d').putImageData(id, 0, 0);
  return c;
}

/* gota de sudor (se dibuja en vivo, resbala por la sien) */
var DROP = ['.o..', 'ogo.', 'oLgo', 'oLgo', 'oggo', '.oo.'];
function sweat(ctx, x, y) {
  for (var r = 0; r < DROP.length; r++) for (var c = 0; c < 4; c++) {
    var ch = DROP[r][c]; if (ch === '.') continue;
    ctx.fillStyle = ch === 'o' ? C.goO : ch === 'L' ? C.goL : C.go; ctx.fillRect(x + c, y + r, 1, 1);
  }
}

/* ===================================================================================== */
/* =================================== TITINA ========================================== */
/* ===================================================================================== */
var CARAS_T = ['habla', 'feliz', 'sorpresa', 'molesta'];
var TPOSE = { habla: { a: 0, dy: 0 }, feliz: { a: -4, dy: 0 }, sorpresa: { a: 0, dy: -2 }, molesta: { a: 5, dy: 1 } };
function titVec(x, cara, parte) {
  var po = TPOSE[cara];
  if (parte === "cabeza") { titCabeza(x, cara, po); return; }
  // pecho redondo y hombro del ala
  var body = [[6, 97], [8, 84], [15, 72], [26, 64], [36, 61], [50, 60], [64, 63], [77, 69], [87, 79], [92, 97]];
  blob(x, body, C.t3);
  x.save(); x.clip(crPath(body, true));
  el(x, 33, 80, 17, 12, C.t4);          // luz en el pecho
  el(x, 26, 74, 8, 5, C.t5);
  el(x, 50, 99, 30, 8, C.t2);           // sombra abajo
  // ala plegada a la derecha: cobertoras claras, dos barras oscuras, primarias oscuras abajo
  var wing = [[58, 68], [72, 68], [86, 76], [95, 90], [96, 97], [62, 97], [57, 84]];
  blob(x, wing, C.t4);
  x.save(); x.clip(crPath(wing, true));
  el(x, 92, 96, 14, 9, C.t2);
  curve(x, [[62, 79], [72, 79.5], [83, 83], [90, 88]], C.barra, 2.4);
  curve(x, [[62, 87.5], [74, 88], [86, 92], [94, 97]], C.barra, 2.4);
  curve(x, [[58.5, 68], [57, 78], [58.5, 90], [61, 97]], C.t2, 1.6);
  x.restore();
  x.restore();
  // cuello tornasolado + cabeza (giran juntos)
  x.save(); x.translate(44, 62 + po.dy); x.rotate(po.a * Math.PI / 180); x.translate(-44, -62);
  var neck = [[22, 72], [26, 56], [30, 44], [40, 39], [52, 39], [62, 45], [66, 57], [67, 70], [46, 75]];
  blob(x, neck, C.t3);
  x.save(); x.clip(crPath(neck, true));
  el(x, 70, 58, 9, 16, C.t2);           // la nuca en sombra
  el(x, 43, 57, 23, 14, C.ve);          // marcador del tornasol: se repinta con el degradado en baseT
  x.restore();
  x.restore();
}
function titCabeza(x, cara, po) {
  x.save(); x.translate(44, 62 + po.dy); x.rotate(po.a * Math.PI / 180); x.translate(-44, -62);
  // cabeza chica y redonda, la frente baja hacia el pico
  var head = [[30.5, 40], [28.5, 32], [31, 23], [38, 16.5], [47, 14.5], [55.5, 17], [61, 24], [62.5, 33], [60, 41], [52, 47], [40, 47.5]];
  blob(x, head, C.t3);
  if (cara === 'sorpresa') { blob(x, taper([[42, 17], [44, 12], [47, 9.5]], 5, 1), C.t3); blob(x, taper([[49, 16], [52, 11.5], [55, 10]], 5, 1), C.t3); }   // plumas paradas
  x.save(); x.clip(crPath(head, true));
  el(x, 41, 24, 11, 8.5, C.t4); el(x, 38, 20, 4.5, 2.4, C.t5, -0.4);
  el(x, 66, 38, 9, 16, C.t2);
  el(x, 46, 52, 16, 5, C.t2);            // sombra de la cabeza sobre el cuello
  x.restore();
  x.restore();
}
function titPico(x, cara, boca) {
  var po = TPOSE[cara];
  x.save(); x.translate(44, 62 + po.dy); x.rotate(po.a * Math.PI / 180); x.translate(-44, -62);
  var ab = [0, 2.5, 5][boca] || 0;   // grados de apertura (en px de la punta)
  if (ab) poly(x, [[31.5, 35], [31.5, 37.5 + ab * 0.25], [22, 36.2 + ab * 0.85], [20.5, 35.5]], C.picoI);
  // mandíbula de abajo
  x.save(); x.translate(31, 35); x.rotate(-ab * 0.09); x.translate(-31, -35);
  poly(x, [[32, 35], [32, 38.5], [21, 37.5], [19.5, 36.4]], C.pico);
  x.restore();
  // mandíbula de arriba
  blob(x, [[33, 30.5], [33.5, 35.5], [26, 35.8], [19, 35.6], [18.6, 34.5], [25, 32.2]], C.pico);
  blob(x, [[32.5, 31], [32.8, 33], [27, 33.2], [27.5, 31.8]], C.picoL);
  // cera
  blob(x, [[33.5, 29], [34.5, 32], [29.5, 33], [27, 32], [28.5, 29.8]], C.cera);
  el(x, 31, 32.3, 2, 0.8, C.ceraS);
  x.restore();
}
var TIT_PAL2 = null;
function titPal2() {
  if (TIT_PAL2) return TIT_PAL2;
  return (TIT_PAL2 = Pal([[C.pico, '#1e1a1c'], [C.picoL, '#1e1a1c'], [C.cera, '#6e6862'], [C.ceraS, '#6e6862'], [C.picoI, '#1e1a1c']]));
}
var BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
var titBase = {};
function baseT(cara) {
  if (titBase[cara]) return titBase[cara];
  var id = layer(function (x) { titVec(x, cara, "cuerpo"); }, palettes().tit), d = id.data, po = TPOSE[cara];
  var P = Painter(id), ve = hexRgb(C.ve), x, y;
  // tornasol: el marcador verde se repinta en degradado verde -> morado (4 pasos, tramado Bayer en las juntas)
  var ST = ['ve', 've2', 'mo2', 'mo'];
  for (y = 0; y < S; y++) for (x = 0; x < S; x++) {
    var i = (y * S + x) * 4;
    if (!(d[i + 3] && d[i] === ve[0] && d[i + 1] === ve[1] && d[i + 2] === ve[2])) continue;
    var ex = (x - 43) / 23, ey = (y - 57 - po.dy) / 14, ee = ex * ex + ey * ey;
    if (ee + (BAY[((y & 3) << 2) | (x & 3)] / 15 - 0.5) * 0.35 > 0.8) { P.p(x, y, x > 60 ? "t2" : "t3"); continue; }
    var v = (y - 46 - po.dy) / 22 + Math.sin(x * 0.33) * 0.03;
    var lv = v * 5.2 - 0.6 + (BAY[((y & 3) << 2) | (x & 3)] / 15 - 0.5) * 0.5;
    var k = Math.floor(lv), col;
    if (k < 0) col = 't3'; else if (k > 3) col = 't3'; else col = ST[k];
    if (x > 60 && (k < 0 || k > 3)) col = "t2";
    P.p(x, y, col);
  }
  // plumas en escamas: filas en el ala; unas pocas, suaves, en el pecho
  var r, q;
  for (r = 0; r < 7; r++) for (q = 0; q < 8; q++) {
    var sx = 60 + q * 5 + (r % 2) * 2.5, sy = 70 + r * 3.6;
    if (sy > 78 && sy < 92 && sx < 90) continue;
    scale(P, sx, sy, true);
  }
  for (r = 0; r < 3; r++) for (q = 0; q < 6; q++) scale(P, 14 + q * 8 + (r % 2) * 4, 80 + r * 6, false);
  // la cabeza encima; su contorno solo donde no hay cuello (sin raya oscura en la nuca)
  var hd = layer(function (x) { titVec(x, cara, "cabeza"); }, palettes().tit), H = hd.data, F = hd.fill;
  for (var p = 0; p < S * S; p++) {
    var j = p * 4;
    if (!H[j + 3]) continue;
    if (F[p] < 0 && d[j + 3]) continue;
    d[j] = H[j]; d[j + 1] = H[j + 1]; d[j + 2] = H[j + 2]; d[j + 3] = 255;
  }
  return (titBase[cara] = id);
}
function scale(P, x, y, wing) {
  x = Math.round(x); y = Math.round(y);
  var here = P.get(x, y); if (!here) return;
  var hex = '#' + here.map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join('');
  if (hex === C.barra) return;
  var dark = hex === C.t4 ? 't3' : hex === C.t3 ? 't2' : hex === C.t5 ? 't4' : hex === C.t2 ? 't1' : null;
  if (!dark) return;
  // ∪ de pluma: 5 de ancho
  if (P.get(x - 2, y)) P.p(x - 2, y, dark);
  P.p(x - 1, y + 1, dark); P.p(x, y + 1, dark); P.p(x + 1, y + 1, dark);
  if (P.get(x + 2, y)) P.p(x + 2, y, dark);
  if (wing) P.p(x, y, hex === C.t4 ? 't5' : 't4');
}
function titEye(P, cx, cy, cara, ojos) {
  // anillo pálido + iris naranja + pupila; 7×7
  var R = ['..aaa..', '.aoooa.', 'aooppoa', 'aoLppDa', 'aoopoDa', '.aoDDa.', '..aaa..'];
  if (cara === 'sorpresa') R = ['..aaa..', '.aoooa.', 'aoLooDa', 'aooppDa', 'aooooDa', '.aoDDa.', '..aaa..'];
  var map = { a: 'ani', o: 'ojo', p: 'pu', L: 'bri', D: 'ojoD' };
  var x0 = cx - 3, y0 = cy - 3, r, c;
  if (cara === "feliz") {   // ojito feliz: arco cerrado, con el anillo debajo
    var A = [[0, 4], [1, 3], [2, 2], [3, 2], [4, 2], [5, 3], [6, 4]];
    A.forEach(function (q) { P.p(x0 + q[0], y0 + q[1] + 1, "ani"); P.p(x0 + q[0], y0 + q[1], "tO"); });
    P.p(x0 + 3, y0 + 1, "t4");
    return;
  }
  for (r = 0; r < 7; r++) for (c = 0; c < 7; c++) {
    var ch = R[r][c]; if (ch !== '.') P.p(x0 + c, y0 + r, map[ch]);
  }
  P.p(x0 + 2, y0 + 2, 'bri');
  var lid = 0;
  if (ojos === 'medio') lid = 3; else if (ojos === 'cerrados') lid = 6;
  if (cara === 'molesta') lid = Math.max(lid, 2);
  if (lid) {
    for (r = 0; r < lid; r++) for (c = 0; c < 7; c++) { var ch2 = R[r][c]; if (ch2 !== '.') P.p(x0 + c, y0 + r, r === lid - 1 ? 'tO' : 't3'); }
    if (lid >= 6) for (c = 1; c < 6; c++) P.p(x0 + c, y0 + 4, 'tO');
  }
  if (cara === 'molesta') {   // ceño: párpado inclinado hacia el pico
    P.p(x0 + 0, y0 + 2, 'tO'); P.p(x0 + 1, y0 + 2, 'tO'); P.p(x0 + 2, y0 + 1, 'tO'); P.p(x0 + 3, y0 + 1, 'tO'); P.p(x0 + 4, y0 + 0, 'tO'); P.p(x0 + 5, y0 + 0, 'tO');
    P.p(x0 + 0, y0 + 1, 't2'); P.p(x0 + 1, y0 + 1, 't2'); P.p(x0 + 2, y0 + 0, 't2');
  }
}
function buildT(cara, boca, ojos) {
  var id = cloneID(baseT(cara));
  over(id, layer(function (x) { titPico(x, cara, boca); }, titPal2()));
  var P = Painter(id), po = TPOSE[cara];
  var a = po.a * Math.PI / 180, ex = 41 - 44, ey = 28 - 62;
  var cx = Math.round(44 + ex * Math.cos(a) - ey * Math.sin(a)), cy = Math.round(62 + po.dy + ex * Math.sin(a) + ey * Math.cos(a));
  titEye(P, cx, cy, cara, ojos);
  var c = cv(S, S); c.getContext('2d').putImageData(id, 0, 0);
  return c;
}

/* ============================ CACHÉ Y API ============================ */
var cache = {}, OJOS = ['abiertos', 'medio', 'cerrados'];
function norm(quien, cara, boca, ojos) {
  var q = quien === 'titina' ? 'titina' : 'alexander';
  var lista = q === 'titina' ? CARAS_T : CARAS;
  var c = lista.indexOf(cara) >= 0 ? cara : 'habla';
  var b = boca === 1 || boca === 2 ? boca : 0;
  var o = OJOS.indexOf(ojos) >= 0 ? ojos : 'abiertos';
  return [q, c, b, o];
}
function get(q, c, b, o) {
  var k = q + '|' + c + '|' + b + '|' + o, v = cache[k];
  if (!v) v = cache[k] = (q === 'titina' ? buildT(c, b, o) : buildA(c, b, o));
  return v;
}
var isReady = false;
function ready() {
  if (isReady) return;
  try {
    var i, b, o;
    for (i = 0; i < CARAS.length; i++) for (b = 0; b < 3; b++) for (o = 0; o < 3; o++) get('alexander', CARAS[i], b, OJOS[o]);
    for (i = 0; i < CARAS_T.length; i++) for (b = 0; b < 3; b++) for (o = 0; o < 3; o++) get('titina', CARAS_T[i], b, OJOS[o]);
    isReady = true;
  } catch (e) { if (window.console) console.warn('retratos.ready', e); }
}
function draw(ctx, quien, cara, boca, ojos, t) {
  try {
    if (!ctx) return;
    var n = norm(quien, cara, boca, ojos), img = get(n[0], n[1], n[2], n[3]);
    t = +t || 0;
    var dy = 0;
    if (n[0] === 'alexander') {
      if (n[1] === 'risa') dy = Math.floor(t * 6) % 2;                         // rebote de la risa (cabeza y hombros)
      if (n[1] === 'sorpresa' && t >= 0 && t < 0.36) dy = -Math.round(Math.sin(t / 0.36 * Math.PI) * 3);   // saltito al empezar
    } else if (n[1] === 'sorpresa' && t >= 0 && t < 0.3) dy = -Math.round(Math.sin(t / 0.3 * Math.PI) * 2);
    ctx.drawImage(img, 0, dy);
    if (dy < 0) ctx.drawImage(img, 0, S - 1, S, 1, 0, S + dy, S, -dy);      // rellena abajo con la última fila
    if (n[0] === 'alexander' && CARAS_A[n[1]].sudor) {
      var pose = CARAS_A[n[1]].pose, per = 1.4, u = (t % per) / per, q = headPt(pose, 61, 30);
      var sy = Math.round(q[1] + u * 9);
      if (u < 0.85) sweat(ctx, Math.round(q[0]) + (u > 0.5 ? 1 : 0), sy + dy);
    }
  } catch (e) { /* nunca romper el diálogo */ }
}

ACH.retratos = {
  SIZE: S,
  CARAS: CARAS.slice(),
  CARAS_TITINA: CARAS_T.slice(),
  draw: draw,
  ready: ready
};
})();
