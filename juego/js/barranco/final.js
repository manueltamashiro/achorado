/* ACHORADO — js/barranco/final.js → ACH.br.final   (fase B5, ver BARRANCO.md §8 y ../diseno/br-b5.md)
   Cinemática «La última jarana»: la peña de noche, Don Jaranón (el cantante criollo zombi) sentado en el borde del tabladillo, en paz;
   Alexander se sienta a su lado y toca; Titina se posa en el cajón; el público zombi se mece; por la ventana, la cruz del Morro Solar.
     ACH.br.final.play({onEnd, t, freeze, dialogo, skippable, ownMusic, keepFrozen})   montaje de 21,6 s (4 planos) + diálogo con retrato → pista cura-9 → onEnd()
     ACH.br.final.stop()   corta todo y limpia · isOn() · debug{render(t), state(), resetSeen(), T, lines, art(), cost(), bake()}
   Lienzo propio de 960×540 sobre #stage (o la ventana si no hay #stage). El arte se dibuja en una grilla de 480×270 y sube ×2 sin suavizado
   (pixel art crisp); lo grande (sala, ventana, luces) se hornea UNA vez; los cuerpos se hornean a pedido y se guardan. Nada de getImageData,
   shadowBlur ni filter por cuadro. render(t) solo depende de t (por eso ?t=&freeze=1 sirven para capturas).
   Música: ACH.audio.br.play('final') si existe (B3); si no, un vals lento propio (Web Audio): guitarra + cajón suave + «mmm» de Jaranón.
   Don Jaranón no tiene retrato en retratos.js: este archivo lo agrega encadenando ACH.retratos.draw (quien 'jaranon') y ACH.retratos.NOMBRES.
   Primera vez: sin saltar. Después ESC / ENTER saltan el montaje (el diálogo sigue). Guarda 'achorado.cine.barranco.v1'. Al terminar:
   ACH.objetivo.diario('cura-9', …) y onEnd(). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  ACH.br = ACH.br || {};

  var W = 960, H = 540, GW = 480, GH = 270, TAU = Math.PI * 2, WW = 720, WH = 310;
  var KEY = 'achorado.cine.barranco.v1';
  /* línea de tiempo (s). Vals a 75 bpm (pulso 0,8 s, compás 2,4 s): los cortes caen en compás.
     s1 plano general (Jaranón solo, entra Alexander) · s2 dos figuras de cerca (afina, Titina, empiezan a tocar) · s3 el público se mece y la ventana ·
     s4 Jaranón señala la ventana (aquí queda el cuadro para el diálogo). w0: primer compás del vals. */
  var T = { s1: 0, s2: 4.8, s3: 9.6, s4: 16.8, end: 21.6, flash: .22, bar: 2.4, w0: 7.2, bpm: 75 };

  /* ---------------------------------------------------------------- utilidades */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ramp(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function eio(u) { return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
  function eout(u) { return 1 - (1 - u) * (1 - u); }
  function warn(m, e) { try { console.warn('[br.final] ' + m, e || ''); } catch (x) { /* nada */ } }
  function h2(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
  function vn(x, y, s) {
    var xi = Math.floor(x / s), yi = Math.floor(y / s), xf = x / s - xi, yf = y / s - yi;
    var a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
    xf = xf * xf * (3 - 2 * xf); yf = yf * yf * (3 - 2 * yf);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  }
  function RNG(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var BAY = []; (function () { var m = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]; for (var i = 0; i < 16; i++) BAY.push((m[i] + .5) / 16); })();
  function hx2(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function rgb(r, g, b) { function q(v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); } return '#' + q(r) + q(g) + q(b); }
  function shade(hex, f) { var c = hx2(hex); return rgb(c[0] * f, c[1] * f, c[2] * f); }
  function mix(a, b, f) { var p = hx2(a), q = hx2(b); return rgb(lerp(p[0], q[0], f), lerp(p[1], q[1], f), lerp(p[2], q[2], f)); }

  function mk(w, h) {
    var c = (ACH.px && typeof ACH.px.canvas === 'function') ? ACH.px.canvas(w, h) : document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c;
  }
  function ctx2(c) { var g = c.getContext('2d'); g.imageSmoothingEnabled = false; return g; }
  function layer(w, h, fn) { var c = mk(w, h), g = ctx2(c); fn(g, c.width, c.height); return c; }

  /* ---------------------------------------------------------------- rasterizador sin antialias (polígonos por barrido) */
  function poly(g, pts, col) {
    var n = pts.length, i, minY = 1e9, maxY = -1e9, cw = g.canvas.width, ch = g.canvas.height;
    for (i = 0; i < n; i++) { var yy = pts[i][1]; if (yy < minY) minY = yy; if (yy > maxY) maxY = yy; }
    var y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(ch - 1, Math.ceil(maxY)), fn = typeof col === 'function';
    if (!fn) g.fillStyle = col;
    for (var y = y0; y <= y1; y++) {
      var sy = y + .5, xs = [];
      for (i = 0; i < n; i++) {
        var a = pts[i], b = pts[(i + 1) % n];
        if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) xs.push(a[0] + (sy - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      if (xs.length < 2) continue;
      xs.sort(function (p, q) { return p - q; });
      for (var k = 0; k + 1 < xs.length; k += 2) {
        var xa = Math.max(0, Math.round(xs[k])), xb = Math.min(cw, Math.round(xs[k + 1]));
        if (xb <= xa) continue;
        if (!fn) { g.fillRect(xa, y, xb - xa, 1); continue; }
        var last = null, st = xa, cc;
        for (var x = xa; x < xb; x++) {
          cc = col(x, y);
          if (cc !== last) { if (last) { g.fillStyle = last; g.fillRect(st, y, x - st, 1); } last = cc; st = x; }
        }
        if (last) { g.fillStyle = last; g.fillRect(st, y, xb - st, 1); }
      }
    }
  }
  function ellPts(cx, cy, rx, ry, rot, n) {
    n = n || Math.max(10, Math.round((rx + ry) * 1.1)); var p = [], c = Math.cos(rot || 0), s = Math.sin(rot || 0);
    for (var i = 0; i < n; i++) { var a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; p.push([cx + x * c - y * s, cy + x * s + y * c]); }
    return p;
  }
  function ell(g, cx, cy, rx, ry, col, rot) { poly(g, ellPts(cx, cy, rx, ry, rot), col); }
  function cap(g, x0, y0, x1, y1, w0, w1, col) {
    var dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    poly(g, [[x0 + nx * w0 / 2, y0 + ny * w0 / 2], [x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2], [x0 - nx * w0 / 2, y0 - ny * w0 / 2]], col);
    ell(g, x0, y0, w0 / 2, w0 / 2, col); ell(g, x1, y1, w1 / 2, w1 / 2, col);
  }
  function px1(g, x, y, c, w, h) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w || 1, h || 1); }
  function line(g, x0, y0, x1, y1, c, w) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx - dy, ww = w || 1;
    g.fillStyle = c;
    for (var k = 0; k < 4000; k++) {
      g.fillRect(x0, y0, ww, ww);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * e; if (e2 > -dy) { e -= dy; x0 += sx; } if (e2 < dx) { e += dx; y0 += sy; }
    }
  }
  function vgrad(g, x, y, w, h, cols) {
    var n = cols.length - 1;
    for (var j = 0; j < h; j++) {
      var f = h > 1 ? j / (h - 1) * n : 0, i = Math.min(n - 1, Math.floor(f)), fr = f - i, last = null, st = 0, c;
      for (var k = 0; k < w; k++) {
        c = fr > BAY[(j & 3) * 4 + (k & 3)] ? cols[i + 1] : cols[i];
        if (c !== last) { if (last) { g.fillStyle = last; g.fillRect(x + st, y + j, k - st, 1); } last = c; st = k; }
      }
      g.fillStyle = last; g.fillRect(x + st, y + j, w - st, 1);
    }
  }
  function outlined(src, col, pad) {
    pad = pad == null ? 1 : pad;
    var w = src.width + pad * 2, h = src.height + pad * 2, c = mk(w, h), g = ctx2(c);
    var sil = mk(src.width, src.height), sg = ctx2(sil);
    sg.drawImage(src, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = col; sg.fillRect(0, 0, src.width, src.height);
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) if (dx || dy) g.drawImage(sil, pad + dx, pad + dy);
    g.drawImage(src, pad, pad);
    return c;
  }
  // kit de dibujo en «unidades de diseño» con origen (OX, OY) y escala s
  function kit(g, OX, OY, s) {
    var K = {
      s: s,
      X: function (v) { return (OX + v) * s; }, Y: function (v) { return (OY + v) * s; },
      C: function (x0, y0, x1, y1, w0, w1, col) { cap(g, (OX + x0) * s, (OY + y0) * s, (OX + x1) * s, (OY + y1) * s, w0 * s, w1 * s, col); },
      E: function (cx, cy, rx, ry, col, rot) { ell(g, (OX + cx) * s, (OY + cy) * s, rx * s, ry * s, col, rot); },
      P: function (pts, col) { poly(g, pts.map(function (p) { return [(OX + p[0]) * s, (OY + p[1]) * s]; }), col); },
      L: function (x0, y0, x1, y1, col, w) { line(g, (OX + x0) * s, (OY + y0) * s, (OX + x1) * s, (OY + y1) * s, col, Math.max(1, Math.round((w || 1) * s))); },
      D: function (x, y, col, w, h) { g.fillStyle = col; g.fillRect(Math.round((OX + x) * s), Math.round((OY + y) * s), Math.max(1, Math.round((w || 1) * s)), Math.max(1, Math.round((h || 1) * s))); }
    };
    return K;
  }

  /* ---------------------------------------------------------------- paletas */
  var SKC = { o: '#6e4430', d: '#a8714c', m: '#c48f63', l: '#dcae80', hl: '#ecc49a', ck: '#d4937a' };
  var HRC = { k: '#170f0c', d: '#211813', m: '#2e221c', l: '#4a382d', hl: '#6e5a48' };
  var BLC = { dd: '#121c40', d: '#1e3468', m: '#2b4a8c', l: '#3c60a8', hl: '#6b8ed0' };
  var WHC = { dd: '#6a7086', d: '#a7aab8', m: '#c9cbd6', l: '#e8e8ec', hl: '#fafafc' };
  var SHC = { m: '#5d6150', d: '#464a3c', dd: '#2f3128', l: '#767a66' };
  var SDC = { m: '#5e3f27', d: '#3a2616', l: '#7a5636' };
  var GTC = { m: '#a86e38', d: '#6b4223', dd: '#2a1810', l: '#c88c50', head: '#3a2a1e', metal: '#c9c9be', strap: '#4a3324', strapL: '#6e5038' };
  var PGC = { k: '#24262c', dd: '#3c3f47', d: '#5b5f69', m: '#7f848e', l: '#a3a8b1', hl: '#c5c9cf', w: '#e2e4e8', g1: '#3a7656', g: '#4f9a6e', g2: '#5f8c88', p: '#8a5a9e', p2: '#64407a', pl: '#b48cc6', gl: '#7ec69c', eye: '#ea8a2c', beak: '#3e383a', cere: '#eeeae2', foot: '#d9737a' };
  var OUTL = '#1c1218', INK = '#14101a';
  // Don Jaranón: piel verdosa #8FA088 (investigación), guayabera blanca, pantalón oscuro, cabello engominado
  var JSK = { dd: '#4b5c4d', d: '#697c66', m: '#8fa088', l: '#a9baa0', hl: '#c5d4b8', lip: '#5a6c57', ck: '#9aa88a', bruise: '#66798a' };
  var JSH = { dd: '#8e866f', d: '#b4ac95', m: '#d6cfba', l: '#ebe6d3', hl: '#f8f4e6' };
  var JPA = { d: '#16141e', m: '#262330', l: '#38354a' };
  var JHR = { k: '#0f0e14', m: '#1c1b24', l: '#363441', hl: '#6c6a78', g: '#7a7983' };
  var GLOWC = '#d9f38e';
  var WOOD = { dd: '#2d1c11', d: '#4a3020', m: '#6b4a2f', l: '#8a6038', hl: '#b07a45' };

  /* ================================================================ ARTE: cabeza y cuerpo de Don Jaranón ================================================================ */
  /* Cabeza en unidades propias (rx 14, ry 17), origen en el centro del cráneo. S = px por unidad.
     o: tilt, fx (giro hacia la derecha 0..1), eyes 'open'|'half'|'closed', glow 0..1, look [x,y], mouth 0|1|2, smile -1..1, sad 0..1, bow (cabeza gacha: se ve más la frente) */
  function jarHead(g, hx, hy, S, o) {
    o = o || {};
    var tl = o.tilt || 0, ct = Math.cos(tl), st = Math.sin(tl), fx = o.fx || 0, bow = o.bow || 0;
    function T(lx, ly) { return [hx + (lx * ct - ly * st) * S, hy + (lx * st + ly * ct) * S]; }
    function inv(x, y) { var dx = (x - hx) / S, dy = (y - hy) / S; return [dx * ct + dy * st, -dx * st + dy * ct]; }
    var sx = fx * 3.2, fxx = fx * 5.2;   // el cráneo se corre poco; los rasgos, más
    // orejas (detrás de la cara)
    [-1, 1].forEach(function (sg) {
      var p = T(sg * 14.6 + sx * .6, 2 + bow * 2);
      ell(g, p[0], p[1], 3.2 * S, 5.2 * S, JSK.d); ell(g, p[0] + sg * .4 * S, p[1] + .4 * S, 1.5 * S, 3 * S, JSK.dd);
    });
    // cara: cráneo alargado con mentón
    var pts = [];
    for (var i = 0; i < 52; i++) {
      var a = i / 52 * TAU, sn = Math.sin(a), cs = Math.cos(a), lw = sn > 0 ? 1 - .36 * Math.pow(sn, 1.5) : 1, ry = sn > 0 ? 19.5 : 16;
      pts.push(T(cs * 14.2 * lw + sx, sn * ry + bow * 1.5));
    }
    poly(g, pts, function (x, y) {
      var p = inv(x, y), lx = p[0] - sx, ly = p[1];
      var c = JSK.m;
      if (lx < -6 && ly < 2) c = JSK.l;                    // luz del foco, arriba a la izquierda
      if (ly < -9 && lx < 6) c = JSK.hl;
      if (lx > 8.5) c = JSK.d;                             // lado en sombra
      if (ly > 15) c = lx > 0 ? JSK.d : JSK.m;
      var hh = Math.hypot((lx + 9.5) / 3.4, (ly - 7) / 5.2); if (hh < 1) c = JSK.d;      // mejilla hundida (izq.)
      var h2c = Math.hypot((lx - 9) / 3.4, (ly - 7) / 5.2); if (h2c < 1) c = JSK.dd;      // mejilla hundida (der.)
      if (Math.abs(lx - fxx * .2) < 1 && ly > -4 && ly < 6) c = JSK.l;                  // lomo de la nariz
      if (ly > 14.5 && ly < 17 && Math.abs(lx) < 5 && ((x + y) % 3 === 0)) c = JSK.d;      // barba de varios días
      return c;
    });
    // mancha de podredumbre en la mejilla derecha y venas
    var rp = T(9 + fxx * .4, 6.5); ell(g, rp[0], rp[1], 3 * S, 2.4 * S, JSK.bruise); ell(g, rp[0] + S * .3, rp[1] + S * .2, 1.6 * S, 1.3 * S, JSK.dd);
    var v0 = T(11 + sx * .4, -6), v1 = T(8, -2), v2 = T(10, 1.5); line(g, v0[0], v0[1], v1[0], v1[1], '#5d7770', 1); line(g, v1[0], v1[1], v2[0], v2[1], '#5d7770', 1);
    // ojos hundidos con brillo
    var eyes = o.eyes || 'open', glow = o.glow == null ? .7 : o.glow, look = o.look || [0, 0];
    [-1, 1].forEach(function (sg) {
      var ex = sg * 6.4 + fxx * (sg > 0 ? .85 : 1.05), ey = -2.2 + bow * 1.5, p = T(ex, ey);
      ell(g, p[0], p[1], 5.3 * S, 3.9 * S, JSK.dd);                                   // cuenca
      if (eyes === 'closed') {
        var a0 = T(ex - 3.4, ey + .4), a1 = T(ex + 3.4, ey + .4); line(g, a0[0], a0[1], a1[0], a1[1], '#2c372e', Math.max(1, Math.round(S * .9)));
        var l0 = T(ex - 3, ey + 1.6), l1 = T(ex + 3, ey + 1.6); line(g, l0[0], l0[1], l1[0], l1[1], JSK.d, 1);
      } else {
        ell(g, p[0], p[1], 3.7 * S, eyes === 'half' ? 1.9 * S : 2.7 * S, '#d8dcc3');       // ojo turbio
        var ip = T(ex + look[0] * 1.2, ey + look[1] * .7 + (eyes === 'half' ? .5 : 0));
        var gc = mix('#7f9a42', GLOWC, glow);
        ell(g, ip[0], ip[1], 2.1 * S, eyes === 'half' ? 1.5 * S : 2.1 * S, gc);
        px1(g, ip[0] - S * .4, ip[1] - S * .4, '#102010', Math.max(1, Math.round(S * 1.1)), Math.max(1, Math.round(S * 1.1)));
        px1(g, ip[0] - S * 1.2, ip[1] - S * 1.2, '#fbffe0', Math.max(1, Math.round(S * .8)), Math.max(1, Math.round(S * .8)));
        if (eyes === 'half') { poly(g, [T(ex - 4.2, ey - 3), T(ex + 4.2, ey - 3), T(ex + 4, ey - .4), T(ex - 4, ey - .4)], JSK.d); }   // párpado cansado
      }
      var bg = T(ex, ey + 4.3); ell(g, bg[0], bg[1], 4.2 * S, 1.3 * S, JSK.d);        // ojeras
      var b0 = T(ex - 4.6, ey - 5.4 - (o.sad ? sg * -1.4 * o.sad : 0)), b1 = T(ex + 4.6, ey - 5.2 + (o.sad ? sg * -1.4 * o.sad : 0));
      if (sg > 0) { var tmp = b0; b0 = b1; b1 = tmp; }
      line(g, b0[0], b0[1], b1[0], b1[1], JHR.m, Math.max(1, Math.round(S * 1.1)));
    });
    // nariz larga
    var n0 = T(fxx * .5, -1), n1 = T(fxx * .8 + 2.6, 7.2), n2 = T(fxx * .6 - 2.2, 7.4);
    poly(g, [n0, T(fxx * .5 + 1.6, -1), n1, T(fxx * .8 + 1, 8.6), T(fxx * .6 - 1.4, 8.6), n2], function (x, y) { return x > n0[0] + S * .8 ? JSK.d : JSK.l; });
    px1(g, T(fxx * .6 - 1.8, 8.2)[0], T(0, 8.2)[1], JSK.dd, Math.max(1, Math.round(S * 1.3)), Math.max(1, Math.round(S * 1)));
    px1(g, T(fxx * .6 + 1.2, 8.2)[0], T(0, 8.2)[1], JSK.dd, Math.max(1, Math.round(S * 1.3)), Math.max(1, Math.round(S * 1)));
    // boca (labios apagados) y bigote fino
    var my = 12.4 + bow * .6, mc = fxx * .7, sm = (o.smile || 0) * 1.2, mo = o.mouth || 0;
    if (mo > 0) {
      poly(g, ellPts(T(mc, my + .6)[0], T(mc, my + .6)[1], 3.6 * S, (mo === 2 ? 2.3 : 1.2) * S, tl, 14), '#2c1c20');
      var tt = T(mc - 2.4, my - .2); g.fillStyle = '#d0d4b8'; g.fillRect(Math.round(tt[0]), Math.round(tt[1]), Math.max(1, Math.round(4.8 * S)), Math.max(1, Math.round(S * .9)));
    } else {
      var m0 = T(mc - 4.6, my - sm * .4), m1 = T(mc, my + .5), m2 = T(mc + 4.6, my - sm * .4);
      line(g, m0[0], m0[1], m1[0], m1[1], '#3d4c3d', Math.max(1, Math.round(S))); line(g, m1[0], m1[1], m2[0], m2[1], '#3d4c3d', Math.max(1, Math.round(S)));
      if (sm > .3) { px1(g, m0[0] - S * .6, m0[1] - S * .6, '#3d4c3d', 1, 1); px1(g, m2[0] + S * .2, m2[1] - S * .6, '#3d4c3d', 1, 1); }
    }
    var l1 = T(mc - 4, my + 1.6), l2 = T(mc + 4, my + 1.6); line(g, l1[0], l1[1], l2[0], l2[1], JSK.lip, Math.max(1, Math.round(S * 1.1)));   // labio inferior
    // bigote fino: dos pinceladas curvas con puntitas
    [[-1, 0], [1, 1]].forEach(function (q) {
      var sg = q[0], a0 = T(mc + sg * .4, my - 2.2), a1 = T(mc + sg * 3.2, my - 2.6), a2 = T(mc + sg * 6.4, my - 1.2), a3 = T(mc + sg * 7.2, my - .4);
      line(g, a0[0], a0[1], a1[0], a1[1], JHR.k, Math.max(1, Math.round(S * 1.15))); line(g, a1[0], a1[1], a2[0], a2[1], JHR.k, Math.max(1, Math.round(S * 1.05))); line(g, a2[0], a2[1], a3[0], a3[1], JHR.k, 1);
    });
    // pelo engominado: peinado hacia atrás con un poco de copete, raya al lado, brillo y patillas
    var hr = [];
    for (i = 0; i <= 26; i++) { var aa = Math.PI + i / 26 * Math.PI; hr.push(T(Math.cos(aa) * 16.8 + sx, Math.sin(aa) * 20.6 + bow * 1.5 - 1.2 + (Math.cos(aa) < -.4 ? -1.4 * (1 + Math.cos(aa)) : 0))); }
    hr.push(T(15.4 + sx, -2)); hr.push(T(13.4 + sx, 2.4)); hr.push(T(12.4 + sx, -3)); hr.push(T(9 + sx, -7)); hr.push(T(4 + fxx * .4, -9)); hr.push(T(-2.4 + fxx * .4, -6.2)); hr.push(T(-6.4, -9)); hr.push(T(-12.4 + sx, -3.6)); hr.push(T(-13.6 + sx, 2.6)); hr.push(T(-15.6 + sx, -2));
    poly(g, hr, function (x, y) {
      var p = inv(x, y), lx = p[0] - sx, ly = p[1];
      var c = JHR.m;
      if (ly < -10 && lx < 6 && lx > -12) c = JHR.l;
      if (ly < -14 && lx < 2 && lx > -9) c = JHR.hl;                         // brillo de la gomina
      if (Math.abs(lx + 2.6 + (ly + 14) * .12) < .8 && ly < -7) c = JHR.k;     // la raya
      if (((lx * 3 + ly * 2) | 0) % 6 === 0 && ly < -8) c = JHR.k;            // peinadas
      if ((lx < -12 || lx > 12) && ly > -9) c = JHR.g;                        // sienes canosas
      return c;
    });
    [[-7, -8.4, -8.4, -2.4], [-2.6, -8.8, -3.2, -3.6], [4, -8.6, 6.2, -4.6]].forEach(function (m) {   // mechones sueltos sobre la frente
      var a0 = T(m[0] + fxx * .3, m[1]), a1 = T(m[2] + fxx * .3, m[3]); cap(g, a0[0], a0[1], a1[0], a1[1], 2.1 * S, 1.2 * S, JHR.m);
    });
    // brillo en las ojeras: ya dibujado. Cicatriz de costura en la sien
    var sc0 = T(-12 + sx * .5, -3), sc1 = T(-11, 3); line(g, sc0[0], sc0[1], sc1[0], sc1[1], JSK.dd, 1);
  }

  /* Cuerpo de Don Jaranón sentado, de frente, con las piernas colgando del tabladillo (origen: la cadera).
     o: pose 'bow'|'look'|'hum'|'point', lean -1..1 (mecerse), mouth, eyes, line (la pose por línea del diálogo) */
  function bakeJar(o, s) {
    o = o || {};
    var K = 1.25, S = s * K, CW = 330, CH = 300, OX = 165, OY = 212, pose = o.pose || 'bow', lean = o.lean || 0;
    var pnt = pose === 'point', bow = pose === 'bow', hum = pose === 'hum';
    var c = layer(Math.ceil(CW * S), Math.ceil(CH * S), function (g) {
      var k = kit(g, OX, OY, S), X = k.X, Y = k.Y;
      var shx = lean * 3.2, shy = bow ? -53 : -60;
      function sleeve(sx0, sy0, ex, ey, w0, w1) {   // manga corta de guayabera hasta mitad del brazo
        var mx = lerp(sx0, ex, .55), my = lerp(sy0, ey, .55);
        k.C(sx0, sy0, mx, my, w0, w1, JSH.d); k.C(sx0 - .8, sy0 - .6, mx - .8, my - .6, w0 * .82, w1 * .82, JSH.m);
        return [mx, my];
      }
      function skinLimb(x0, y0, x1, y1, w0, w1) { k.C(x0, y0, x1, y1, w0, w1, JSK.d); k.C(x0 - .8, y0 - .6, x1 - .8, y1 - .6, w0 * .74, w1 * .74, JSK.m); k.C(x0 - 2.4, y0 - 1.4, x1 - 2.4, y1 - 1.4, w0 * .3, w1 * .3, JSK.l); }
      // --- piernas colgando (pantalón oscuro) y zapatos lustrados ---
      [-1, 1].forEach(function (sg) {
        k.C(sg * 12, -2, sg * 19, 14, 24, 22, JPA.m); k.C(sg * 12 - 2, -3, sg * 19 - 2, 13, 19, 17, JPA.l);
        k.C(sg * 19, 14, sg * 20, 54, 20, 17, JPA.m); k.C(sg * 19 - 2.6, 14, sg * 20 - 2.6, 54, 6, 5, '#4a4860');
        k.E(sg * 22, 59, 12, 6, '#0c0b12'); k.E(sg * 22 - 2.5, 57.4, 5.4, 2, '#4a485c');
        k.L(sg * 19.5, 16, sg * 20.2, 50, JPA.d, 1);    // la raya del pantalón
      });
      // --- torso: guayabera blanca ---
      var sw = 27, hw = 21;
      var tor = [[shx - sw, shy + 4], [shx - sw + 6, shy - 2], [shx + sw - 6, shy - 2], [shx + sw, shy + 4], [shx + sw + 1, shy + 24], [hw, -6], [hw + .5, 4], [-hw - .5, 4], [-hw, -6], [shx - sw - 1, shy + 24]];
      k.P(tor, function (x, y) {
        var ly = y / S - OY;
        var rel = (x / S - OX - shx) / sw, c = JSH.m;
        if (rel < -.45) c = JSH.l; else if (rel > .5) c = JSH.d; if (rel > .85) c = JSH.dd;
        if (ly < shy + 12 && rel < .2) c = JSH.l;
        var pl = Math.abs(x / S - OX - shx * (1 - (ly - shy) / 70)); if ((Math.abs(pl - 6.4) < .45 || Math.abs(pl - 8.2) < .35) && ly > shy + 8) c = JSH.dd;   // pliegues verticales
        if (ly > -6 && (Math.floor(x / S) % 7 === 0)) c = JSH.d;
        return c;
      });
      // cuello de la guayabera y botones
      k.P([[shx - 9, shy - 1], [shx - 2, shy + 5], [shx - 5, shy + 11], [shx - 12, shy + 3]], JSH.l);
      k.P([[shx + 9, shy - 1], [shx + 2, shy + 5], [shx + 5, shy + 11], [shx + 12, shy + 3]], JSH.d);
      for (var b = 0; b < 4; b++) k.D(shx * (1 - (b * 10) / 70) - .5, shy + 12 + b * 10, JSH.dd, 1.4, 1.4);
      // bolsillos con tapa (dos arriba, dos abajo) y pañuelo asomando del bolsillo izquierdo
      [[-10, shy + 14, 9, 8], [10, shy + 14, 9, 8], [-12, shy + 34, 10, 9], [12, shy + 34, 10, 9]].forEach(function (p) {
        var cx = p[0] + shx * (1 - (p[1] - shy) / 70);
        k.P([[cx - p[2] / 2, p[1]], [cx + p[2] / 2, p[1]], [cx + p[2] / 2, p[1] + p[3]], [cx, p[1] + p[3] + 1.4], [cx - p[2] / 2, p[1] + p[3]]], JSH.l);
        k.L(cx - p[2] / 2, p[1], cx + p[2] / 2, p[1], JSH.dd, 1); k.L(cx - p[2] / 2, p[1], cx - p[2] / 2, p[1] + p[3], JSH.d, 1); k.L(cx + p[2] / 2, p[1], cx + p[2] / 2, p[1] + p[3], JSH.dd, 1);
      });
      var pcx = -10 + shx * .8; k.P([[pcx - 3, shy + 14], [pcx - 1, shy + 7], [pcx + 1, shy + 11], [pcx + 3, shy + 6], [pcx + 4, shy + 14]], '#fbf8ee'); k.L(pcx - 1, shy + 8, pcx - 1, shy + 13, JSH.d, 1);
      // jirones por la plaga: dobladillo roto y un desgarro con la piel verde
      k.P([[-hw, -2], [-hw + 4, 6], [-hw + 7, 1], [-hw + 11, 7], [-hw + 14, 2], [-hw + 18, 6], [-hw + 21, 0]], JSH.d);
      k.P([[shx + 12, shy + 28], [shx + 19, shy + 30], [shx + 17, shy + 40], [shx + 11, shy + 36]], JSK.d);
      k.L(shx + 12, shy + 31, shx + 17, shy + 33, JSK.dd, 1);
      // --- brazos ---
      var lh;   // mano izquierda de pantalla: pañuelo blanco sobre la rodilla
      var lsh = [shx - sw + 3, shy + 6], lel = [shx - 33, shy + 32 + (bow ? 2 : 0)];
      lh = [-18, -4];
      skinLimb(lel[0], lel[1], lh[0], lh[1], 11, 9);
      k.E(lh[0], lh[1], 6.4, 5.4, JSK.m); k.E(lh[0] - 1.6, lh[1] - 1.2, 3, 2.2, JSK.l);
      k.P([[lh[0] - 8, lh[1] + 3], [lh[0] - 2, lh[1] - 5], [lh[0] + 9, lh[1] - 2], [lh[0] + 12, lh[1] + 8], [lh[0] + 4, lh[1] + 12], [lh[0] - 4, lh[1] + 10]], '#f6f2e6');   // pañuelo
      k.P([[lh[0] + 4, lh[1] + 12], [lh[0] + 12, lh[1] + 8], [lh[0] + 9, lh[1] + 17], [lh[0] + 4, lh[1] + 15]], '#dcd6c4');
      k.L(lh[0] - 2, lh[1] - 3, lh[0] + 6, lh[1] + 8, '#cfc9b4', 1);
      var m1 = sleeve(lsh[0], lsh[1], lel[0], lel[1], 22, 18);
      k.C(lsh[0] + 2, lsh[1] - 4, lsh[0] - 3, lsh[1] + 4, 15, 12, JSH.m);
      // brazo derecho de pantalla (el que señala)
      var rsh = [shx + sw - 3, shy + 6], rel2, rh;
      if (pnt) { rel2 = [shx + 44, shy - 2]; rh = [shx + 66, shy - 16]; }
      else { rel2 = [shx + 33, shy + 32 + (bow ? 2 : 0)]; rh = [17, -4]; }
      skinLimb(rel2[0], rel2[1], rh[0], rh[1], 11, 9);
      // hueso asomando por el codo (la plaga) en la manga rota
      k.C(rel2[0] + 1, rel2[1] - 1, rel2[0] + 2.4, rel2[1] + 5, 3, 3, '#e8e3d0'); k.E(rel2[0] + 1, rel2[1] - 1.6, 2.2, 2, '#f2eedc'); k.E(rel2[0] + 2.6, rel2[1] + 5.4, 2, 1.8, '#f2eedc');
      if (pnt) {   // mano abierta con el índice largo
        k.E(rh[0], rh[1], 6, 5, JSK.m);
        k.C(rh[0] + 3, rh[1] - 2, rh[0] + 14, rh[1] - 7, 3.6, 2.6, JSK.m); k.C(rh[0] + 3, rh[1] - 2.6, rh[0] + 14, rh[1] - 7.6, 1.4, 1.2, JSK.l);
        k.E(rh[0] + 14.6, rh[1] - 7.2, 1.9, 1.6, '#cfc7a8');
        k.C(rh[0] - 2, rh[1] + 3, rh[0] + 3, rh[1] + 4, 3.4, 3, JSK.d);
      } else { k.E(rh[0], rh[1], 6.4, 5.4, JSK.m); k.E(rh[0] - 1.6, rh[1] - 1.2, 3, 2.2, JSK.l); for (var f = 0; f < 3; f++) k.D(rh[0] - 4 + f * 3, rh[1] + 2, JSK.d, 1.2, 3); }
      sleeve(rsh[0], rsh[1], rel2[0], rel2[1], 22, 18);
      k.C(rsh[0] - 2, rsh[1] - 4, rsh[0] + 3, rsh[1] + 4, 15, 12, JSH.d);
      // --- cuello y cabeza ---
      var hy = bow ? -74 : -86, hxx = shx * 1.5 + (pnt ? 3 : 0), tilt = bow ? .1 : hum ? lean * .09 : pnt ? -.04 : -.05;
      k.C(shx + .5, shy - 1, hxx * .8, hy + 12, 17, 15, function (x, y) { return x / S - OX > shx + 3 ? JSK.d : JSK.m; });
      k.C(shx + 3, shy, hxx * .8 + 3, hy + 14, 5, 4, JSK.dd);
      var hs = S * 1.5;
      var eyes = o.eyes || (bow ? 'half' : hum ? 'closed' : 'open');
      jarHead(g, X(hxx), Y(hy), hs, { tilt: tilt, fx: pnt ? .8 : pose === 'look' ? -.35 : 0, eyes: eyes, glow: bow ? .45 : hum ? .6 : .9,
        look: pnt ? [2.2, -.6] : pose === 'look' ? [-2, .3] : [0, bow ? 1.2 : 0], mouth: o.mouth || 0, smile: hum ? .9 : pose === 'look' ? .8 : bow ? .35 : .2, sad: bow ? .55 : pose === 'look' ? .3 : 0, bow: bow ? 1 : 0 });
    });
    var oc = outlined(c, OUTL);
    return { c: oc, ox: OX * S + 1, oy: OY * S + 1 };
  }

  /* ================================================================ ARTE: Alexander (el Alexander claro, estilo Stardew) ================================================================ */
  // cabeza: unidades de la cabeza de la cinemática de la cima (rx 20, ry 23). o: tilt, fx, expr, look, hp (fase del pelo), blink
  function alexHead(g, hx, hy, S, o) {
    o = o || {};
    var tl = o.tilt || 0, ct = Math.cos(tl), st2 = Math.sin(tl), fx = o.fx || 0, expr = o.expr || 'smile', hp = o.hp || 0, i, k;
    function T(lx, ly) { return [hx + (lx * ct - ly * st2) * S, hy + (lx * st2 + ly * ct) * S]; }
    var hpts = [];
    for (i = 0; i < 40; i++) { var a = i / 40 * TAU, sn = Math.sin(a); var lx = Math.cos(a) * 20 + fx * 5 * Math.max(0, sn) + fx * 2.5, ly = sn * 23 + (sn > 0 ? 1.5 * sn : 0); hpts.push(T(lx, ly)); }
    poly(g, hpts, function (x, y) {
      var rx = (x - hx) / S, ry = (y - hy) / S;
      var lt = rx < -8 ? SKC.l : rx > 12 ? SKC.d : SKC.m;
      if (ry > 17) lt = rx > 0 ? SKC.d : SKC.m;
      if (rx < -12 && ry < 6) lt = SKC.hl;
      return lt;
    });
    var ep = T(-8.5, 3); ell(g, ep[0], ep[1], 4.4 * S, 6 * S, SKC.d); ell(g, ep[0] + .5 * S, ep[1], 2.4 * S, 3.8 * S, SKC.ck);
    var cxl = fx * 6, nearx = cxl - 8.2, farx = cxl + 9.6 * (1 - .42 * fx);
    var ck1 = T(cxl - 12, 9), ck2 = T(cxl + 11, 9); ell(g, ck1[0], ck1[1], 3.4 * S, 2.2 * S, SKC.ck); ell(g, ck2[0], ck2[1], 2.6 * S, 2 * S, SKC.ck);
    var look = o.look || [1.2, .2], closed = expr === 'down' || o.blink;
    function eye(ex, ey, ew, eh) {
      var p = T(ex, ey);
      if (closed) { line(g, p[0] - ew / 2 * S, p[1], p[0] + ew / 2 * S, p[1] + .5 * S, HRC.k, Math.max(1, Math.round(1.5 * S))); return; }
      poly(g, ellPts(p[0], p[1], ew / 2 * S, eh / 2 * S, tl, 14), '#f4f0e6');
      px1(g, p[0] - ew / 2 * S, p[1] - eh / 2 * S, '#d2c8b8', Math.max(1, Math.round(ew * S)), Math.max(1, Math.round(S)));
      var ix = p[0] + look[0] * S, iy = p[1] + look[1] * S;
      ell(g, ix, iy, 2.3 * S, 2.5 * S, '#4a2e1e'); ell(g, ix + .4 * S, iy, 1.2 * S, 1.4 * S, '#1c100a');
      px1(g, ix - 1.4 * S, iy - 1.6 * S, '#fff', Math.max(1, Math.round(S)), Math.max(1, Math.round(S)));
    }
    eye(nearx, -4, 8.4, 6.6); eye(farx, -4, 8.4 * (1 - .32 * fx), 6.4);
    function brow(x0, y0, x1, y1) { var a1 = T(x0, y0), a2 = T(x1, y1); cap(g, a1[0], a1[1], a2[0], a2[1], 3 * S, 2.4 * S, HRC.k); }
    if (expr === 'sad') { brow(nearx - 5, -9.6, nearx + 5, -12.6); brow(farx - 4, -12.6, farx + 4.6, -9.6); }
    else if (expr === 'hero') { brow(nearx - 5, -12.5, nearx + 5.5, -8.4); brow(farx - 5, -8.6, farx + 4.5, -11.4); }
    else { brow(nearx - 5, -11.6, nearx + 4.5, -12.6); brow(farx - 4, -12.6, farx + 4, -11.4); }
    var n0 = T(cxl + 1.5, -1), n1 = T(cxl + 6 + 6 * fx, 7), n2 = T(cxl + 1, 9.4);
    poly(g, [n0, T(cxl + 4 + 3 * fx, -2), n1, T(cxl + 5 + 5 * fx, 10), n2], function (x, y) { return y > n1[1] - 1 * S ? SKC.d : SKC.l; });
    px1(g, T(cxl + 3 + 4 * fx, 8.2)[0], T(0, 8.2)[1], '#4a2418', Math.max(1, Math.round(2 * S)), Math.max(1, Math.round(1.4 * S)));
    px1(g, T(cxl - .4, 9)[0], T(0, 9)[1], '#4a2418', Math.max(1, Math.round(1.6 * S)), Math.max(1, Math.round(1.2 * S)));
    var m0 = T(cxl - 6, 15), m1 = T(cxl + 11, 12.6);
    if (expr === 'hero') {
      poly(g, [T(cxl - 4, 14.6), T(cxl + 4, 15.8), T(cxl + 11, 12.6), T(cxl + 12.6, 10.6), T(cxl + 10, 17.8), T(cxl + 2, 19.4), T(cxl - 3, 17.4)], '#4a2420');
      poly(g, [T(cxl - 2, 15.4), T(cxl + 4, 16.2), T(cxl + 10, 13.6), T(cxl + 10, 15.2), T(cxl + 4, 17.6), T(cxl - 2, 16.8)], '#f4efe2');
      px1(g, T(cxl + 5, 17)[0], T(0, 17.4)[1], '#f4efe2', Math.max(1, Math.round(2.4 * S)), Math.max(1, Math.round(1.6 * S)));
      line(g, m0[0], m0[1], m1[0], m1[1], '#3a1c18', Math.max(1, Math.round(S * .8)));
    } else if (expr === 'joy') {
      poly(g, ellPts(T(cxl + 3, 14.5)[0], T(cxl + 3, 14.5)[1], 7 * S, 5.2 * S, tl, 16), '#4a2420');
      poly(g, [T(cxl - 3, 11), T(cxl + 9, 11), T(cxl + 8, 13.4), T(cxl - 2, 13.4)], '#f4efe2');
      ell(g, T(cxl + 3, 17)[0], T(cxl + 3, 17)[1], 3.8 * S, 1.8 * S, '#b5675a');
    } else if (expr === 'smile') {   // sonrisa chiquita y tranquila (toca con gusto)
      var s0 = T(cxl - 4.5, 14.4), s1 = T(cxl + 3, 16.8), s2 = T(cxl + 10.5, 13.2);
      line(g, s0[0], s0[1], s1[0], s1[1], '#3a1c18', Math.max(1, Math.round(S * 1.1))); line(g, s1[0], s1[1], s2[0], s2[1], '#3a1c18', Math.max(1, Math.round(S * 1.1)));
      px1(g, s2[0] + S * .4, s2[1] - S, '#3a1c18', 1, Math.max(1, Math.round(S)));
    } else if (expr === 'sad') {
      var q0 = T(cxl - 3.5, 16), q1 = T(cxl + 3.5, 14.6), q2 = T(cxl + 9, 16.2);
      line(g, q0[0], q0[1], q1[0], q1[1], '#3a1c18', Math.max(1, Math.round(S * 1.1))); line(g, q1[0], q1[1], q2[0], q2[1], '#3a1c18', Math.max(1, Math.round(S * 1.1)));
    } else { line(g, m0[0], m0[1], T(cxl + 8, 15)[0], T(cxl + 8, 15)[1], '#3a1c18', Math.max(1, Math.round(1.4 * S))); }
    px1(g, T(cxl + 2.5, 22)[0], T(0, 22)[1], SKC.d, Math.max(1, Math.round(2 * S)), Math.max(1, Math.round(S)));
    // pelo: casquete + flequillo + mechones
    var hr = [];
    for (i = 0; i <= 20; i++) { var aa = Math.PI + i / 20 * Math.PI, rxh = 25, ryh = 31; hr.push(T(Math.cos(aa) * rxh + fx * 2.5 + 1, Math.sin(aa) * ryh - 1.5)); }
    hr.push(T(21 + fx * 3, -8)); hr.push(T(15 + fx * 3, -14)); hr.push(T(8, -12)); hr.push(T(2, -17)); hr.push(T(-6, -12)); hr.push(T(-13, -16)); hr.push(T(-20, -6)); hr.push(T(-23, 4));
    poly(g, hr, function (x, y) { var rx = (x - hx) / S, ry = (y - hy) / S; return ry < -20 && rx < 6 ? HRC.hl : ry < -14 && rx < 0 ? HRC.l : rx > 12 ? HRC.d : HRC.m; });
    var ANCH = [[-14, -24], [-6, -28], [-19, -16], [-22, -6], [0, -30], [-11, -27], [-21, -11]];
    for (i = 0; i < 6; i++) {
      var an = ANCH[i], Ls = (26 + (i * 7) % 16) * (o.hairLen || 1), pts = [], ph2 = hp + i * 1.9;
      for (k = 0; k <= 8; k++) { var u = k / 8; pts.push(T(an[0] - u * Ls, an[1] - u * (6 + (i % 3) * 4) + Math.sin(u * 6 + ph2) * (5 + i % 3 * 2) * u - Math.pow(u, 3) * 8 + u * u * (o.droop || 34))); }
      var ow = (10 + (i % 3) * 2) * S, up = [], dn = [];
      for (k = 0; k < pts.length; k++) { var w = ow * Math.pow(1 - k / (pts.length - .2), .8) * .5; up.push([pts[k][0], pts[k][1] - w]); dn.push([pts[k][0], pts[k][1] + w]); }
      poly(g, up.concat(dn.reverse()), HRC.m);
      for (k = 0; k + 1 < pts.length - 2; k++) line(g, pts[k][0], pts[k][1] - ow * .18 * (1 - k / 8), pts[k + 1][0], pts[k + 1][1] - ow * .18 * (1 - k / 8), HRC.l, 1);
    }
  }

  function skinLimb(k, x0, y0, x1, y1, w0, w1) {
    k.C(x0, y0, x1, y1, w0, w1, SKC.d);
    k.C(x0 - .06 * w0, y0 - .04 * w0, x1 - .06 * w1, y1 - .04 * w1, w0 * .78, w1 * .78, SKC.m);
    k.C(x0 - .22 * w0, y0 - .14 * w0, x1 - .22 * w1, y1 - .14 * w1, w0 * .34, w1 * .34, SKC.l);
  }
  var NAMEDEX = 0;
  /* Alexander sentado de frente con la guitarra en la falda (origen: la cadera). o: strum 0|1, lean -1..1, head 'guitar'|'jar'|'window'|'front', expr */
  function bakeAlexSeat(o, s) {
    o = o || {};
    var CW = 280, CH = 270, OX = 130, OY = 170, lean = o.lean || 0, strum = o.strum || 0, hd = o.head || 'guitar';
    var c = layer(Math.ceil(CW * s), Math.ceil(CH * s), function (g) {
      var k = kit(g, OX, OY, s);
      var shx = lean * 2.6, shy = -60;
      // piernas: muslos en escorzo y canillas colgando; sandalias
      [-1, 1].forEach(function (sg) {
        skinLimb(k, sg * 13, 4, sg * 17, 22, 17, 14);
        skinLimb(k, sg * 17, 22, sg * 17.6, 64, 13, 10);
        k.P([[sg * 17 - 6, 63], [sg * 17 + 6, 63], [sg * 17 + 7, 72], [sg * 17 - 7, 72]], SDC.m); k.D(sg * 17 - 6, 70, SDC.d, 12, 2.4); k.D(sg * 17 - 4, 64, SKC.m, 8, 4);
        // short caqui (sobre el muslo)
        k.C(sg * 12, -4, sg * 18, 14, 26, 23, SHC.d); k.C(sg * 11, -5, sg * 17, 13, 21, 19, SHC.m); k.C(sg * 8, -6, sg * 14, 6, 7, 6, SHC.l);
      });
      k.P([[-23, -12], [23, -12], [25, 6], [-25, 6]], function (x, y) { var rx = x / s - OX; return rx < -8 ? SHC.l : rx > 10 ? SHC.d : SHC.m; });
      // torso de rayas azules y blancas
      var sw = 31 * (1 - .1 * (hd === 'window' ? .6 : .3));
      var tor = [[shx - sw, shy + 3], [shx - sw + 5, shy - 3], [shx + sw - 5, shy - 3], [shx + sw, shy + 3], [shx + sw + 1, shy + 26], [22, -8], [-22, -8], [shx - sw - 1, shy + 26]];
      var BLU = [BLC.d, BLC.m, BLC.l], WHI = [WHC.d, WHC.l, WHC.hl];
      k.P(tor, function (x, y) {
        var rx = x / s - OX - shx, ry = y / s - OY;
        var dx = Math.sin((ry - shy) * .13 + lean) * 1.6 * clamp((ry - shy) / 46, 0, 1);
        var st = Math.floor((rx + dx) / 5.6 + 40) & 1, rel = rx / sw, tn = rel < -.35 ? 2 : rel > .35 ? 0 : 1;
        if ((ry - shy) > 36) tn = Math.max(0, tn - 1);
        var vy = ry - shy;
        if (vy < 13 && Math.abs(rx - 2) < (13 - vy) * .62) return vy < 9 ? SKC.d : SKC.m;
        if (vy < 16 && Math.abs(rx - 2) < (16 - vy) * .62 + 1.6) return BLC.dd;
        return st ? BLU[tn] : WHI[tn];
      });
      // guitarra sobre la falda: cuerpo abajo a la izquierda, mástil subiendo a la derecha
      var ang = -.4, ca = Math.cos(ang), sa = Math.sin(ang), gcx = -8 + shx * .3, gcy = -14;
      function G(ax, ay) { return [gcx + ax * ca - ay * sa, gcy + ax * sa + ay * ca]; }
      function GE(ax, ay, rx, ry, col) { var p = G(ax, ay); k.E(p[0], p[1], rx, ry, col, ang); }
      GE(0, 0, 25, 21, GTC.dd); GE(21, -1, 17, 15.4, GTC.dd);
      GE(0, 0, 23.6, 19.6, GTC.m); GE(21, -1, 15.6, 13.6, GTC.m);
      GE(-3, -4, 14, 9, GTC.l); GE(18, -4, 9, 6, GTC.l);
      GE(8, 2, 6.4, 6.4, '#1a0e08'); GE(8, 2, 7.6, 7.6, GTC.d);
      GE(8, 2, 5.4, 5.4, '#120a06');
      var br = G(-14, 2); k.P([[br[0] - 7, br[1] - 2.4], [br[0] + 7, br[1] - 2.4], [br[0] + 7, br[1] + 2.4], [br[0] - 7, br[1] + 2.4]], '#3a2318');
      var n0 = G(32, -1), n1 = G(86, -1), nw = 7;
      k.P([[n0[0] - sa * nw / 2, n0[1] + ca * nw / 2], [n1[0] - sa * (nw - 1) / 2, n1[1] + ca * (nw - 1) / 2], [n1[0] + sa * (nw - 1) / 2, n1[1] - ca * (nw - 1) / 2], [n0[0] + sa * nw / 2, n0[1] - ca * nw / 2]], GTC.head);
      for (var f = 1; f < 7; f++) { var fp = G(32 + f * 7.6, -1); k.L(fp[0] - sa * 3, fp[1] + ca * 3, fp[0] + sa * 3, fp[1] - ca * 3, '#6b6b60', 1); }
      var h0 = G(86, -1);
      k.P([[h0[0] - sa * 5.6, h0[1] + ca * 5.6], [h0[0] + sa * 5.6, h0[1] - ca * 5.6], [h0[0] + sa * 5.6 + 13 * ca, h0[1] - ca * 5.6 + 13 * sa], [h0[0] - sa * 5.6 + 13 * ca, h0[1] + ca * 5.6 + 13 * sa]], GTC.head);
      for (var tp = 0; tp < 3; tp++) k.D(h0[0] + (tp * 3.8 - 3.8) * -sa + 7 * ca, h0[1] + (tp * 3.8 - 3.8) * ca + 7 * sa, GTC.metal, 2, 2);
      for (var q = 0; q < 3; q++) { var s0 = G(-6, -1.4 + q * 1.4), s1 = G(84, -2 + q * 1.6); k.L(s0[0], s0[1], s1[0], s1[1], '#e8e2c8', 1); }
      // brazo que rasguea (el de la izquierda de pantalla): hombro → codo → mano sobre la boca de la guitarra
      var hand = G(9, -2 + (strum ? 5.5 : -5.5)), lsh = [shx - sw + 4, shy + 8], lel = [shx - 31, -26];
      skinLimb(k, lel[0], lel[1], hand[0], hand[1], 11, 9.4);
      k.E(hand[0], hand[1], 5.6, 5, SKC.m); k.E(hand[0] - 1.6, hand[1] - 1.4, 2.8, 2.2, SKC.l);
      var mx = lerp(lsh[0], lel[0], .55), my = lerp(lsh[1], lel[1], .55);
      k.C(lsh[0], lsh[1], mx, my, 21, 17, function (x, y) { var rx = x / s - OX - lsh[0], ry = y / s - OY; return (Math.floor((rx + Math.sin(ry * .2 + 1) * 1.4) / 5.6 + 40) & 1) ? BLC.l : WHC.hl; });
      // brazo que pisa el mástil
      var fh = G(60, 1), rsh = [shx + sw - 4, shy + 8], rel = [shx + 44, -14];
      skinLimb(k, rel[0], rel[1], fh[0], fh[1], 11, 9.4);
      k.E(fh[0], fh[1], 5.4, 5.6, SKC.m); for (var fi = 0; fi < 3; fi++) k.D(fh[0] - 3 + fi * 2.6, fh[1] - 5.6, SKC.d, 1.2, 3);
      var mx2 = lerp(rsh[0], rel[0], .55), my2 = lerp(rsh[1], rel[1], .55);
      k.C(rsh[0], rsh[1], mx2, my2, 21, 17, function (x, y) { var rx = x / s - OX - rsh[0], ry = y / s - OY; return (Math.floor((rx + Math.sin(ry * .2) * 1.4) / 5.6 + 40) & 1) ? BLC.m : WHC.l; });
      // cuello y cabeza
      var hdx = shx * 1.5 + (hd === 'window' ? 3 : 0), hdy = -90 + (hd === 'guitar' ? 3 : 0);
      var P = { guitar: { tilt: .16, fx: .22, look: [.8, 2.6] }, jar: { tilt: .03, fx: .5, look: [1.6, .2] }, window: { tilt: -.06, fx: .75, look: [1.9, -1.2] }, front: { tilt: 0, fx: .12, look: [.4, .2] } }[hd] || { tilt: 0, fx: .3, look: [1, 0] };
      k.C(shx + 1, shy - 2, hdx * .8, hdy + 18, 17, 15, function (x, y) { return x / s - OX > shx + 3 ? SKC.d : SKC.m; });
      alexHead(g, k.X(hdx), k.Y(hdy), s * 1.12, { tilt: P.tilt, fx: P.fx, look: P.look, expr: o.expr || (hd === 'guitar' ? 'smile' : 'smile'), hp: lean * 1.2 + (strum ? .4 : 0), blink: !!o.blink, hairLen: .75, droop: 70 });
    });
    var oc = outlined(c, OUTL);
    return { c: oc, ox: OX * s + 1, oy: OY * s + 1 };
  }

  /* Alexander caminando de perfil hacia la derecha (con la guitarra a la espalda). Origen: el suelo entre los pies. frame 0..3 */
  var WALK = [[.5, .05, -.5, .18, -.45, .5], [.15, .1, .1, .75, -.1, .2], [-.5, .18, .5, .05, .45, -.5], [.1, .75, .15, .1, .1, -.2]];
  function bakeAlexWalk(frame, s) {
    var CW = 220, CH = 250, OX = 100, OY = 232, F = WALK[frame];
    var c = layer(Math.ceil(CW * s), Math.ceil(CH * s), function (g) {
      var k = kit(g, OX, OY, s), hipy = -92, sh = [4, -148], head = [11, -176], bob = (frame & 1) ? 2 : 0;
      hipy += bob; sh[1] += bob; head[1] += bob;
      // guitarra a la espalda
      k.E(-14, hipy - 26, 22, 31, GTC.dd, -.3); k.E(-14, hipy - 26, 20.4, 29.4, GTC.m, -.3); k.E(-17, hipy - 33, 10, 14, GTC.l, -.3);
      k.C(-20, hipy - 54, -44, hipy - 112, 8, 7, GTC.d); k.C(-21, hipy - 54, -45, hipy - 112, 3, 2.6, GTC.l);
      k.P([[-47, hipy - 108], [-39, hipy - 114], [-34, hipy - 128], [-42, hipy - 130]], GTC.head);
      function leg(th, ph, fr) {
        var hp = [0, hipy], kn = [hp[0] + Math.sin(th) * 46, hp[1] + Math.cos(th) * 46], an = [kn[0] + Math.sin(th - ph) * 46, kn[1] + Math.cos(th - ph) * 46];
        if (an[1] > -3) an[1] = -3;
        skinLimb(k, kn[0], kn[1], an[0], an[1], 15, 11);
        skinLimb(k, hp[0], hp[1], kn[0], kn[1], 21, 16);
        var mx = lerp(hp[0], kn[0], .74), my = lerp(hp[1], kn[1], .74);
        k.C(hp[0], hp[1], mx, my, 26, 21, SHC.d); k.C(hp[0] - 1.5, hp[1] - 1, mx - 1.5, my - 1, 21.5, 17, SHC.m);
        k.P([[an[0] - 8, an[1] + 2], [an[0] + 17, an[1] + 3], [an[0] + 19, an[1] + 8], [an[0] - 8, an[1] + 8]], SDC.m);
        k.P([[an[0] - 4, an[1] - 3], [an[0] + 14, an[1] + 3], [an[0] - 4, an[1] + 3]], SKC.m);
      }
      leg(F[2], F[3], 1);                                         // pierna de atrás (sombra)
      leg(F[0], F[1], 0);
      // brazo de atrás
      var armA = F[4] * .7, armB = F[5] * .7;
      var shp = [sh[0] - 4, sh[1] + 8];
      skinLimb(k, shp[0] + Math.sin(armB) * 22, shp[1] + Math.cos(armB) * 22, shp[0] + Math.sin(armB * 1.3) * 46, shp[1] + Math.cos(armB * 1.3) * 46 - 6, 12, 10);
      // torso de rayas
      var ws = 31, hw2 = 21;
      var tor = [[sh[0] - ws, sh[1] + 3], [sh[0] - ws + 5, sh[1] - 3], [sh[0] + ws - 5, sh[1] - 3], [sh[0] + ws - 4, sh[1] + 3], [sh[0] + ws - 5, sh[1] + 28], [hw2, hipy - 4], [-hw2, hipy - 4], [sh[0] - ws, sh[1] + 28]];
      var BLU = [BLC.d, BLC.m, BLC.l], WHI = [WHC.d, WHC.l, WHC.hl];
      k.P(tor, function (x, y) {
        var rx = x / s - OX - sh[0], ry = y / s - OY, st = Math.floor((rx + Math.sin((ry - sh[1]) * .13 + frame) * 1.6) / 5.6 + 40) & 1, rel = rx / ws, tn = rel < -.35 ? 2 : rel > .35 ? 0 : 1;
        if ((ry - sh[1]) > 40) tn = Math.max(0, tn - 1);
        var vy = ry - sh[1];
        if (vy < 12 && rx > 0 && rx - 6 < (12 - vy) * .8 && rx > 0) return vy < 8 ? SKC.d : SKC.m;
        return st ? BLU[tn] : WHI[tn];
      });
      cap(g, k.X(sh[0] - ws + 8), k.Y(sh[1] + 2), k.X(hw2 - 6), k.Y(hipy - 8), 6 * s, 6 * s, GTC.strap);   // correa
      k.P([[-hw2 - 1, hipy - 10], [hw2 + 1, hipy - 10], [hw2 + 3, hipy + 16], [-hw2 - 3, hipy + 16]], function (x, y) { var rx = x / s - OX; return rx < -7 ? SHC.l : rx > 10 ? SHC.d : SHC.m; });
      // brazo de adelante
      var e1 = [shp[0] + Math.sin(armA) * 24 + 2, shp[1] + Math.cos(armA) * 24], h1 = [shp[0] + Math.sin(armA * 1.4) * 44 + 3, shp[1] + Math.cos(armA * 1.4) * 44 - 8];
      skinLimb(k, e1[0], e1[1], h1[0], h1[1], 12, 10); k.E(h1[0], h1[1], 5.6, 5.4, SKC.m);
      k.C(shp[0], shp[1], lerp(shp[0], e1[0], .55), lerp(shp[1], e1[1], .55), 21, 17, function (x, y) { var rx = x / s - OX, ry = y / s - OY; return (Math.floor((rx + Math.sin(ry * .2) * 1.4) / 5.6 + 40) & 1) ? BLC.l : WHC.hl; });
      // cuello y cabeza (perfil: mira a la derecha)
      k.C(sh[0] + 1, sh[1] - 2, head[0] - 2, head[1] + 16, 17, 15, SKC.m);
      alexHead(g, k.X(head[0]), k.Y(head[1]), s * 1.12, { tilt: .02, fx: .88, look: [2.2, .2], expr: 'smile', hp: frame * 1.3 });
    });
    return { c: outlined(c, OUTL), ox: OX * s + 1, oy: OY * s + 1 };
  }

  /* Titina, la paloma (copia del dibujo de la cinemática de Chorrillos). pose: 'perch' | 'puff' | 'fly0..2' */
  function bakePigeon(pose, s) {
    var fl = pose.indexOf('fly') === 0, w = Math.ceil(54 * s), h = Math.ceil(46 * s), cyf = h * (fl ? .56 : .7);
    var c = layer(w, h, function (g) {
      var cx = w * .5, cy = cyf, puff = pose === 'puff';
      function X(v) { return cx + v * s; } function Y(v) { return cy + v * s; }
      function px(v, ww) { return Math.max(1, Math.round((ww || 1) * s)); }
      function head(hx, hy) {
        ell(g, X(hx), Y(hy), 5 * s, 5 * s, function (x, y) { return y < Y(hy - 2) ? PGC.l : PGC.m; });
        poly(g, [[X(hx + 3.5), Y(hy - 1.4)], [X(hx + 9), Y(hy + .2)], [X(hx + 3.5), Y(hy + 1.6)]], PGC.beak);
        g.fillStyle = PGC.cere; g.fillRect(Math.round(X(hx + 3)), Math.round(Y(hy - 2.4)), px(2), px(1.4));
        g.fillStyle = PGC.eye; g.fillRect(Math.round(X(hx + 1)), Math.round(Y(hy - 2)), px(2), px(2)); g.fillStyle = PGC.k; g.fillRect(Math.round(X(hx + 1.6)), Math.round(Y(hy - 1.6)), px(1), px(1));
      }
      if (fl) {
        var f = +pose.charAt(3), ang = [-1.2, -.4, .9][f], L = 24;
        var wing = function (rootx, rooty, a, L2, cn) {
          var ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
          poly(g, [[X(rootx), Y(rooty)], [X(rootx + ca * L2 * .5 + nx * -7), Y(rooty + sa * L2 * .5 + ny * -7)], [X(rootx + ca * L2), Y(rooty + sa * L2)], [X(rootx + ca * L2 * .55 + nx * 8), Y(rooty + sa * L2 * .55 + ny * 8)], [X(rootx - 10), Y(rooty + 2)]], function (x, y) { return cn ? (((x + y * 2) >> 1) & 3 ? PGC.l : PGC.m) : PGC.d; });
          for (var q = 0; q < 4; q++) line(g, X(rootx + ca * L2 * (.7 + q * .08) + nx * (2 + q)), Y(rooty + sa * L2 * (.7 + q * .08) + ny * (2 + q)), X(rootx + ca * L2 * (.96) + nx * (q - 1)), Y(rooty + sa * L2 * .96 + ny * (q - 1)), PGC.k);
        };
        wing(-2, -3, ang - .25 > -1.5 ? ang - .25 : ang, L, false);
        poly(g, [[X(-12), Y(0)], [X(-27), Y(3)], [X(-29), Y(8)], [X(-11), Y(5)]], PGC.dd);
        ell(g, X(0), Y(1), 12.5 * s, 7 * s, function (x, y) { return y < Y(-3) ? PGC.l : y < Y(3) ? PGC.m : PGC.d; });
        ell(g, X(8), Y(-2), 4.2 * s, 4 * s, function (x, y) { return ((x * 3 + y) & 3) ? PGC.g : PGC.p; });
        head(12, -5);
        wing(3, -3, ang, L + 2, true);
      } else {
        var ch = puff ? 3 : 0;
        poly(g, [[X(-9), Y(-4)], [X(-24), Y(-1)], [X(-27), Y(4)], [X(-9), Y(4)]], PGC.dd);
        poly(g, [[X(-24), Y(-1)], [X(-27), Y(4)], [X(-21), Y(3)]], PGC.k);
        ell(g, X(0), Y(-6), (12 + ch) * s, (8.4 + ch * .5) * s, function (x, y) { return y < Y(-10) ? PGC.l : y < Y(-3) ? PGC.m : PGC.d; });
        poly(g, [[X(-10), Y(-10)], [X(3), Y(-12)], [X(7), Y(-3)], [X(-3), Y(1)], [X(-14), Y(-3)]], function (x, y) { return y < Y(-9) ? PGC.hl : PGC.l; });
        g.fillStyle = PGC.k; g.fillRect(Math.round(X(-9)), Math.round(Y(-8)), Math.round(12 * s), px(1.4)); g.fillRect(Math.round(X(-10)), Math.round(Y(-4.5)), Math.round(13 * s), px(1.4));
        ell(g, X(7 + ch * .5), Y(-11), 5.2 * s, 5.8 * s, function (x, y) { return ((x * 2 + y * 3) & 3) ? ((x + y) & 1 ? PGC.g : PGC.gl) : PGC.p; });
        head(10 + ch * .5, -16);
        g.fillStyle = PGC.foot; g.fillRect(Math.round(X(-3)), Math.round(Y(1)), px(1.2), Math.round(4 * s)); g.fillRect(Math.round(X(3)), Math.round(Y(1)), px(1.2), Math.round(4 * s));
      }
    });
    return { c: c, ox: Math.round(w * .5), oy: Math.round(cyf + 5 * s) };
  }

  /* ================================================================ ARTE: el público zombi (siluetas que se mecen) ================================================================ */
  var ZSKIN = [{ d: '#566b55', m: '#6f846a', l: '#869b7e' }, { d: '#5d6b58', m: '#788b74', l: '#92a58a' }, { d: '#4f6258', m: '#677c70', l: '#7f9588' }];
  var ZV = [
    { shirt: '#7a4646', pants: '#2a2836', hair: '#17161c', hat: 'cap', hatc: '#3d4a63', sk: 0 },
    { shirt: '#456479', pants: '#3b2f2a', hair: '#3a2e24', hat: 'none', sk: 1 },
    { shirt: '#86733f', pants: '#2a2836', hair: '#1a1a1a', hat: 'straw', hatc: '#cdb47a', sk: 2 },
    { shirt: '#64466f', pants: '#1f1e29', hair: '#2a1f1a', hat: 'bun', sk: 1 },
    { shirt: '#8f846e', pants: '#3a3240', hair: '#20201f', hat: 'beanie', hatc: '#7a3340', sk: 0 },
    { shirt: '#427560', pants: '#2d2a38', hair: '#2b2018', hat: 'long', sk: 2 }
  ];
  var LEANS = [-1, -.5, 0, .5, 1];
  // de perfil mirando a la izquierda (hacia el tabladillo). Origen: el suelo entre los pies. lean desplaza la parte alta
  function bakeZP(vi, li, s) {
    var V = ZV[vi % ZV.length], SK = ZSKIN[V.sk], lean = LEANS[li], CW = 130, CH = 200, OX = 70, OY = 190, eye = [0, 0];
    var c = layer(Math.ceil(CW * s), Math.ceil(CH * s), function (g) {
      var k = kit(g, OX, OY, s);
      function sw(y) { return lean * (-y / 160) * 13; }
      // piernas y zapatos
      k.C(sw(-80) + 3, -80, 7, -5, 17, 13, shade(V.pants, .78)); k.C(sw(-80) - 4, -80, -6, -5, 17, 13, V.pants);
      k.P([[-18, 0], [-15, -7], [1, -8], [3, 0]], '#15131b'); k.P([[0, 0], [2, -8], [14, -8], [16, 0]], '#101018');
      // torso
      k.P([[sw(-132) - 18, -132], [sw(-132) + 16, -132], [sw(-80) + 15, -76], [sw(-80) - 17, -76]], function (x, y) { var rx = x / s - OX - sw(-100); return rx > 4 ? shade(V.shirt, .72) : rx < -9 ? shade(V.shirt, 1.12) : V.shirt; });
      k.L(sw(-128), -128, sw(-80) - 1, -80, shade(V.shirt, .6), 1);
      // brazo lejano (detrás) y cercano, colgando hacia adelante
      k.C(sw(-126) + 8, -126, sw(-100) + 2, -96, 11, 9, SK.d); k.E(sw(-98) + 2, -90, 5, 5.6, SK.d);
      k.C(sw(-126) - 1, -126, sw(-100) - 9, -96, 13, 10, shade(V.shirt, 1.05));
      k.C(sw(-100) - 9, -96, sw(-78) - 12, -70, 10, 8, SK.m); k.E(sw(-78) - 12, -66, 5.2, 6, SK.m);
      // cuello y cabeza de perfil
      var hx = sw(-163) - 2, hy = -161;
      k.C(sw(-134), -134, hx + 3, hy + 14, 12, 11, SK.d);
      k.E(hx, hy, 14.5, 16.5, function (x, y) { var rx = x / s - OX - hx; return rx > 6 ? SK.d : rx < -8 ? SK.l : SK.m; });
      k.P([[hx - 12, hy - 3], [hx - 22, hy + 6], [hx - 12, hy + 7]], SK.m);              // nariz
      k.E(hx - 8, hy + 13, 6.4, 5.4, SK.m);                                                  // mentón
      k.E(hx - 7.6, hy - 3, 3.6, 2.8, '#1b2620');                                            // cuenca
      k.D(hx - 9.4, hy - 3.4, '#cfe88a', 2, 2);                                              // ojo con brillo
      k.L(hx - 16, hy + 9, hx - 7, hy + 9.4, '#2c3a2c', 1);                                  // boca
      k.E(hx + 5, hy + 1, 3, 4.6, SK.d);                                                     // oreja
      eye = [k.X(hx - 9.4), k.Y(hy - 3.4)];
      // sombreros y pelo
      if (V.hat === 'cap') { k.E(hx + 1, hy - 8, 15, 10.5, V.hatc); k.P([[hx - 12, hy - 9], [hx - 27, hy - 5], [hx - 11, hy - 3]], shade(V.hatc, .8)); }
      else if (V.hat === 'straw') { k.E(hx - 1, hy - 10, 25, 5, V.hatc); k.E(hx, hy - 15, 11, 8, shade(V.hatc, .92)); k.D(hx - 10, hy - 12, '#2a2118', 20, 3); }
      else if (V.hat === 'beanie') { k.E(hx, hy - 8.5, 15, 10, V.hatc); k.D(hx - 14, hy - 4, shade(V.hatc, .75), 28, 4); k.E(hx + 1, hy - 18, 3, 3, shade(V.hatc, 1.2)); }
      else if (V.hat === 'bun') { k.E(hx + 4, hy - 7, 12, 10, V.hair); k.E(hx + 11, hy - 16, 6, 6, V.hair); }
      else if (V.hat === 'long') { k.E(hx + 4, hy - 6, 13, 11, V.hair); k.P([[hx + 2, hy - 4], [hx + 18, hy], [hx + 16, hy + 26], [hx + 4, hy + 24]], V.hair); }
      else { k.E(hx + 6, hy - 7, 9, 10, V.hair); k.D(hx - 4, hy - 14, V.hair, 6, 2); }
    });
    return { c: outlined(c, '#0d0a12'), ox: OX * s + 1, oy: OY * s + 1, eye: [eye[0] + 1, eye[1] + 1] };
  }
  // sentado de espaldas (solo cabeza y hombros). Origen: centro de la línea de hombros
  function bakeZB(vi, li, s) {
    var V = ZV[(vi + 2) % ZV.length], SK = ZSKIN[V.sk], lean = LEANS[li], CW = 120, CH = 130, OX = 60, OY = 96;
    var c = layer(Math.ceil(CW * s), Math.ceil(CH * s), function (g) {
      var k = kit(g, OX, OY, s), sx = lean * 3, hxx = lean * 9;
      k.P([[sx - 30, 34], [sx - 31, 4], [sx - 22, -9], [sx - 8, -12], [sx + 8, -12], [sx + 22, -9], [sx + 31, 4], [sx + 30, 34]], function (x, y) { var rx = x / s - OX - sx; return rx > 12 ? shade(V.shirt, .7) : rx < -14 ? shade(V.shirt, 1.1) : V.shirt; });
      k.L(sx, -10, sx, 30, shade(V.shirt, .6), 1);
      k.C(sx * .8, -12, hxx * .8, -26, 14, 13, SK.d);
      k.E(hxx - 16, -42, 3.4, 5.2, SK.m); k.E(hxx + 16, -42, 3.4, 5.2, SK.d);
      k.E(hxx, -44, 15.5, 18.5, V.hair);
      k.E(hxx - 4, -52, 7, 6, shade(V.hair, 2.4 > 3 ? 1 : 1.9));
      if (V.hat === 'straw') { k.E(hxx, -56, 26, 5.4, V.hatc); k.E(hxx, -62, 11, 8, shade(V.hatc, .92)); }
      else if (V.hat === 'cap') { k.E(hxx, -50, 16, 12, V.hatc); k.D(hxx - 15, -41, shade(V.hatc, .75), 30, 3); }
      else if (V.hat === 'beanie') { k.E(hxx, -50, 16, 12, V.hatc); k.D(hxx - 15, -41, shade(V.hatc, .75), 30, 4); }
      else if (V.hat === 'bun') { k.E(hxx + 1, -62, 6.5, 6.5, V.hair); }
      else if (V.hat === 'long') { k.P([[hxx - 14, -40], [hxx + 14, -40], [hxx + 16, -12], [hxx - 16, -12]], V.hair); }
    });
    return { c: outlined(c, '#0d0a12'), ox: OX * s + 1, oy: OY * s + 1 };
  }

  /* ================================================================ ARTE: utilería (micrófono antiguo de pedestal, cajón, sombrero) ================================================================ */
  var CHROME = { d: '#6d7078', m: '#a3a6ae', l: '#d5d8de', hl: '#f5f7fa' }, GOLD = { d: '#8a6420', m: '#c9993a', l: '#f0cf70', hl: '#fff0a8' };
  function bakeMic(s) {   // origen: centro de la base
    var CW = 70, CH = 200, OX = 35, OY = 192;
    var c = layer(Math.ceil(CW * s), Math.ceil(CH * s), function (g) {
      var k = kit(g, OX, OY, s), lean = -7;
      k.E(0, -3, 19, 6, CHROME.d); k.E(0, -5, 17, 4.6, CHROME.m); k.E(-4, -6, 8, 1.8, CHROME.hl);
      k.C(0, -6, lean, -150, 4.6, 3.8, CHROME.d); k.C(-.9, -6, lean - .9, -150, 1.8, 1.4, CHROME.l);
      k.C(lean * .55, -86, lean * .55, -92, 7, 7, CHROME.m);           // el anillo del pedestal
      k.C(lean, -150, lean, -156, 7, 7, CHROME.m);
      // el micrófono: cuerpo ovalado con rejilla y aros dorados
      var mx = lean + 1, my = -176;
      k.P([[mx - 14, my + 5], [mx - 12, my + 14], [mx + 12, my + 14], [mx + 14, my + 5]], CHROME.d);                // la horquilla
      k.E(mx, my, 11.4, 19, GOLD.d, .1); k.E(mx - .6, my, 10.2, 17.8, function (x, y) { return (Math.floor(y / s) % 3 === 0) ? GOLD.d : (x / s - OX - mx < -2 ? GOLD.l : GOLD.m); }, .1);
      k.E(mx, my - 17, 10, 2.6, GOLD.hl); k.E(mx, my + 17, 10, 2.6, GOLD.d);
      k.C(mx - 11, my, mx + 11, my + .6, 2.2, 2.2, CHROME.l);
      k.D(mx - 6, my - 12, GOLD.hl, 2, 6);
    });
    return { c: outlined(c, OUTL), ox: OX * s + 1, oy: OY * s + 1 };
  }
  function bakeCajon(s) {   // origen: centro de la base, de frente (3/4)
    var CW = 70, CH = 80, OX = 31, OY = 72;
    var c = layer(Math.ceil(CW * s), Math.ceil(CH * s), function (g) {
      var k = kit(g, OX, OY, s);
      k.P([[-19, -56], [19, -56], [19, 0], [-19, 0]], function (x, y) { var rx = x / s - OX; return (Math.abs(rx + 6) < .5 || Math.abs(rx - 8) < .5) ? WOOD.d : (rx < -4 ? WOOD.hl : WOOD.l); });
      k.P([[19, -56], [25, -63], [25, -7], [19, 0]], WOOD.d);
      k.P([[-19, -56], [-13, -63], [25, -63], [19, -56]], WOOD.hl);
      k.L(-19, -56, 19, -56, WOOD.dd, 1);
      k.L(-19, -14, 19, -14, WOOD.m, 1);
      [[-15, -52], [15, -52], [-15, -4], [15, -4]].forEach(function (p) { k.D(p[0] - 1, p[1] - 1, '#2a1a10', 3, 3); k.D(p[0] - 1, p[1] - 1, '#c9c9be', 1.4, 1.4); });
      k.D(-8, -40, WOOD.m, 4, 12); k.D(10, -30, WOOD.dd, 3, 8);
    });
    return { c: outlined(c, OUTL), ox: OX * s + 1, oy: OY * s + 1 };
  }
  function bakeHat(s) {
    var CW = 60, CH = 26, OX = 30, OY = 20;
    var c = layer(Math.ceil(CW * s), Math.ceil(CH * s), function (g) {
      var k = kit(g, OX, OY, s);
      k.E(0, -1, 26, 6.2, '#b69c62'); k.E(0, -2.4, 25, 5, '#d8c48f'); k.E(0, -8, 12, 8.5, '#d8c48f'); k.E(-3, -10.6, 5, 3, '#efe0b0'); k.D(-12, -5, '#1c1713', 24, 3);
    });
    return { c: outlined(c, OUTL), ox: OX * s + 1, oy: OY * s + 1 };
  }
  function bakeNote(sz, col) {   // corchea flotante (el «mmm» de Jaranón y la guitarra)
    var c = layer(8 * sz, 12 * sz, function (g) {
      var k = kit(g, 0, 0, sz);
      k.E(2.6, 9.2, 2.6, 2, col, -.4); k.D(4.4, 1, col, 1, 8.5); k.P([[5.2, 1], [8, 3.4], [7.4, 6], [5.2, 4]], col);
    });
    return c;
  }

  /* ================================================================ ARTE: la ventana con la cruz del Morro Solar ================================================================ */
  var WIN = { x: 517, y: 27, vw: 112, vh: 104, fr: 7 };
  function archPts(w, h, r, cx0) {   // arco de medio punto: lados rectos abajo y semicírculo arriba
    var pts = [[0, h], [0, r]];
    for (var i = 1; i < 28; i++) { var a = Math.PI + i / 28 * Math.PI; pts.push([cx0 + Math.cos(a) * r, r + Math.sin(a) * r]); }
    pts.push([w, r]); pts.push([w, h]);
    return pts;
  }
  var CRUZ = { x: 64, y: 43 };   // la cumbre del Morro dentro de la vista
  function bakeWindow() {
    var vw = WIN.vw, vh = WIN.vh, FR = WIN.fr;
    var view = layer(vw, vh, function (g) {
      var R = RNG(77), i;
      vgrad(g, 0, 0, vw, 74, ['#080a1f', '#10143a', '#1c2352', '#2c346a', '#454a86']);
      for (i = 0; i < 38; i++) { var sx = R() * vw, sy = R() * 52, tw = R(); px1(g, sx, sy, tw > .8 ? '#ffffff' : tw > .4 ? '#c8cdf0' : '#8890c8'); if (tw > .93) { px1(g, sx - 1, sy, '#8890c8'); px1(g, sx + 1, sy, '#8890c8'); px1(g, sx, sy - 1, '#8890c8'); px1(g, sx, sy + 1, '#8890c8'); } }
      // luna
      poly(g, ellPts(22, 20, 14, 14, 0, 30), function (x, y) { return Math.hypot(x - 22, y - 20) < 14 && BAY[(y & 3) * 4 + (x & 3)] < .45 ? '#2f3670' : null; });
      ell(g, 22, 20, 7.4, 7.4, '#f6f0d6'); ell(g, 20.4, 19, 5.4, 5.4, '#fffbe8'); ell(g, 24, 22, 1.6, 1.6, '#dcd4b4'); ell(g, 19, 22.6, 1.1, 1.1, '#dcd4b4');
      // halo de la cruz
      poly(g, ellPts(CRUZ.x, CRUZ.y - 12, 22, 24, 0, 40), function (x, y) { var d = Math.hypot((x - CRUZ.x) / 22, (y - CRUZ.y + 12) / 24); return d < 1 && BAY[(y & 3) * 4 + (x & 3)] < (1 - d) * .8 ? '#6670b8' : null; });
      // el Morro Solar (silueta)
      var mor = [[0, 76], [0, 66], [8, 62], [18, 58], [30, 54], [42, 50], [52, 47], [60, 44.6], [66, 44.2], [72, 46], [82, 51], [94, 58], [104, 65], [112, 70], [112, 76]];
      poly(g, mor, function (x, y) { return y < 46 + (x - 60) * (x > 60 ? .55 : -.3) + 1.4 ? '#34346a' : (y > 66 ? '#0e0e22' : '#14142c'); });
      poly(g, [[6, 76], [20, 68], [38, 64], [52, 64], [66, 62], [86, 66], [100, 70], [112, 72], [112, 76]], '#0f0f26');
      // luces de Chorrillos al pie del cerro y de la bahía
      for (i = 0; i < 26; i++) { var lx = 4 + R() * 104, ly = 66 + R() * 7; if (ly > 66 + (lx > 80 ? (lx - 80) * .1 : 0)) px1(g, lx, ly, R() > .6 ? '#ffd27a' : '#c9893a'); }
      // mar nocturno con el reflejo de la luna
      vgrad(g, 0, 74, vw, 30, ['#14264c', '#0f1f40', '#0a1430']);
      for (i = 0; i < 26; i++) { var ry = 76 + i, jx = Math.sin(i * 1.7) * 2; px1(g, 22 + jx - (i % 3 === 0 ? 3 : 0), ry, '#a9bfe8', i % 3 === 0 ? 7 : 4 - (i % 2)); }
      for (i = 0; i < 18; i++) px1(g, CRUZ.x - 4 + (i % 5) * 2, 78 + i * 1.3, '#7e8fcb', 2);
      for (i = 0; i < 40; i++) px1(g, R() * vw, 76 + R() * 28, '#223a6c', 2 + (R() * 4 | 0));
      // el Cristo del Pacífico (brazos abiertos, como una cruz) con su pedestal
      var cx = CRUZ.x, cy = CRUZ.y;
      g.fillStyle = '#d9d4c2'; g.fillRect(cx - 5, cy - 4, 10, 5); g.fillStyle = '#fff8e2'; g.fillRect(cx - 5, cy - 4, 10, 1);
      poly(g, [[cx - 3.4, cy - 4], [cx + 3.4, cy - 4], [cx + 2.2, cy - 22], [cx - 2.2, cy - 22]], function (x) { return x > cx + 1 ? '#ddd7c3' : '#fff8e2'; });
      poly(g, [[cx - 12, cy - 22], [cx + 12, cy - 22], [cx + 12, cy - 18.6], [cx + 6, cy - 18], [cx - 6, cy - 18], [cx - 12, cy - 18.6]], function (x, y) { return y > cy - 20 ? '#ddd7c3' : '#fff8e2'; });
      ell(g, cx, cy - 26, 2.7, 3.2, '#fff8e2'); g.fillStyle = '#ddd7c3'; g.fillRect(cx + 1, cy - 25, 1, 3);
    });
    // máscara de arco
    var w2 = layer(vw + FR * 2, vh + FR * 2, function (g) {
      var aw = vw + FR * 2, ah = vh + FR * 2;
      poly(g, archPts(aw, ah, aw / 2, aw / 2), WOOD.dd);
      var msk = layer(vw, vh, function (gm) { poly(gm, archPts(vw, vh, vw / 2, vw / 2), '#000'); });
      var inn = layer(vw, vh, function (gg) { gg.drawImage(view, 0, 0); gg.globalCompositeOperation = 'destination-in'; gg.drawImage(msk, 0, 0); });
      g.drawImage(inn, FR, FR);
      // marco: moldura de revoque y madera
      var ring = archPts(aw, ah, aw / 2, aw / 2);
      for (var i = 0; i < ring.length - 1; i++) { var p = ring[i], q = ring[i + 1]; if (p[1] <= aw / 2 + 2 || q[1] <= aw / 2 + 2 || true) line(g, p[0], p[1], q[0], q[1], '#8a6a52', 1); }
      // rejas de fierro: barrotes verticales, travesaño y adorno circular
      var gx;
      for (gx = FR + 12; gx < FR + vw - 6; gx += 16) { g.fillStyle = '#0d0b13'; g.fillRect(gx, FR, 2, vh); g.fillStyle = '#2d2a3a'; g.fillRect(gx, FR, 1, vh); }
      g.fillStyle = '#0d0b13'; g.fillRect(FR, FR + 60, vw, 2); g.fillRect(FR, FR + vh - 20, vw, 2);
      for (var a = 0; a < 40; a++) { var an = Math.PI + a / 39 * Math.PI, rx = FR + vw / 2 + Math.cos(an) * (vw / 2 - 12), ry = FR + vw / 2 + Math.sin(an) * (vw / 2 - 12); g.fillStyle = '#0d0b13'; g.fillRect(Math.round(rx), Math.round(ry), 2, 2); }
      for (gx = FR + 20; gx < FR + vw - 10; gx += 16) ell(g, gx + 8, FR + 60, 3.4, 3.4, '#0d0b13');
      // alféizar
      g.fillStyle = '#7a5a46'; g.fillRect(FR - 4, ah - FR + 1, aw - FR * 2 + 8, 5); g.fillStyle = '#a07c62'; g.fillRect(FR - 4, ah - FR + 1, aw - FR * 2 + 8, 1);
    });
    var dim = layer(vw + FR * 2, vh + FR * 2, function (g) { poly(g, archPts(vw + FR * 2, vh + FR * 2, (vw + FR * 2) / 2, (vw + FR * 2) / 2).map(function (p) { return [Math.max(FR, Math.min(vw + FR, p[0])), Math.max(FR, p[1])]; }), '#06050c'); });
    return { c: w2, dim: dim, cross: [WIN.x + FR + CRUZ.x, WIN.y + FR + CRUZ.y - 14] };
  }

  /* ================================================================ ARTE: la peña (sala completa 720×310) ================================================================ */
  function pixText(txt, px, col, font) {   // texto en píxeles duros (sin antialias): se hornea una vez
    var tmp = mk(Math.ceil(txt.length * px * .95) + 8, px + 8), g = tmp.getContext('2d');
    g.font = px + 'px ' + (font || '"Bungee","Arial Black",Impact,sans-serif'); g.textBaseline = 'top'; g.fillStyle = '#fff'; g.fillText(txt, 3, 3);
    var out = mk(tmp.width, tmp.height), og = ctx2(out);
    try {
      var d = g.getImageData(0, 0, tmp.width, tmp.height).data; og.fillStyle = col;
      for (var y = 0; y < tmp.height; y++) for (var x = 0; x < tmp.width; x++) if (d[(y * tmp.width + x) * 4 + 3] > 110) og.fillRect(x, y, 1, 1);
    } catch (e) { og.drawImage(tmp, 0, 0); }
    return out;
  }
  function frameArt(g, x, y, w, h, kind) {
    g.fillStyle = '#2a1c12'; g.fillRect(x - 3, y - 3, w + 6, h + 6); g.fillStyle = '#5a3d27'; g.fillRect(x - 2, y - 2, w + 4, h + 4); g.fillStyle = '#8a6240'; g.fillRect(x - 2, y - 2, w + 4, 1);
    g.fillStyle = '#9d8a64'; g.fillRect(x, y, w, h); g.fillStyle = '#b9a578'; g.fillRect(x, y, w, 2);
    var k = kit(g, x + w / 2, y + h / 2, 1);
    if (kind === 'guitar') { k.E(0, 6, 9, 8, '#1c1410'); k.E(0, -4, 6, 6, '#1c1410'); k.C(0, -8, 0, -24, 3, 3, '#1c1410'); k.E(0, 6, 3, 3, '#9d8a64'); }
    else if (kind === 'cajon') { k.P([[-9, -8], [9, -8], [9, 14], [-9, 14]], '#1c1410'); k.P([[-9, -8], [-5, -13], [13, -13], [9, -8]], '#2e2118'); k.E(0, 4, 3, 3, '#9d8a64'); }
    else { k.E(-6, -12, 3, 3, '#1c1410'); k.C(-6, -9, -7, 10, 7, 6, '#1c1410'); k.E(8, -10, 3, 3, '#1c1410'); k.C(8, -7, 9, 10, 6, 5, '#1c1410'); k.C(-4, -4, 7, -12, 2, 2, '#fff6e0'); }
  }
  function tableTipped(g, x, y, d) {   // mesa redonda de peña volteada
    var k = kit(g, x, y, 1);
    k.E(0, -16, 6.4, 17, WOOD.dd); k.E(-.6, -16, 5.4, 15.8, WOOD.m); k.E(-1.4, -18, 2.6, 11, WOOD.l);
    k.C(5, -16, 5 + d * 26, -22, 3, 3, WOOD.d); k.C(5, -10, 5 + d * 24, -4, 3, 3, WOOD.d); k.C(5, -20, 5 + d * 22, -32, 3, 3, WOOD.d); k.E(0, -34, 3, 1.2, WOOD.hl);
    k.E(2, 1, 12, 2.4, 'rgba(0,0,0,.4)');
  }
  function chairTipped(g, x, y, d) {   // silla de madera caída de costado
    var k = kit(g, x, y, 1);
    k.E(0, 1, 15, 2.4, 'rgba(0,0,0,.4)');
    k.P([[-2, -1], [d * 16, -1], [d * 16, -5], [-2, -5]], WOOD.m); k.D(d > 0 ? -2 : -18, -5, WOOD.l, 18, 1);
    k.C(-1, -3, -1, -20, 3.4, 3.4, WOOD.d); k.C(1, -17, d * 14, -17, 2.6, 2.6, WOOD.d); k.C(d * 14, -3, d * 15, -22, 2.6, 2.6, WOOD.d);
  }
  function bottle(g, x, y, col, ang) { var k = kit(g, x, y, 1); k.C(0, 0, Math.cos(ang) * 11, -Math.sin(ang) * 11, 4.4, 4.4, col); k.C(Math.cos(ang) * 11, -Math.sin(ang) * 11, Math.cos(ang) * 16, -Math.sin(ang) * 16, 2, 2, col); k.D(-1, -2, 'rgba(255,255,255,.4)', 4, 1); }

  function bakeWorld(win) {
    return layer(WW, WH, function (g, w, h) {
      var R = RNG(31), i, j, x, y;
      // pared del fondo
      vgrad(g, 0, 0, w, 154, ['#15101d', '#221829', '#31232d', '#3a2a30']);
      for (i = 0; i < 1100; i++) { x = R() * w; y = R() * 150; g.fillStyle = R() < .55 ? 'rgba(0,0,0,.2)' : 'rgba(255,224,190,.05)'; g.fillRect(x | 0, y | 0, 1 + ((R() * 3) | 0), 1); }
      for (i = 0; i < 26; i++) { x = R() * w; y = 20 + R() * 100; ell(g, x, y, 8 + R() * 18, 2 + R() * 4, 'rgba(0,0,0,.12)'); }
      // zócalo de madera
      g.fillStyle = '#2a190f'; g.fillRect(0, 118, w, 36); g.fillStyle = '#3d2718'; g.fillRect(0, 118, w, 3); g.fillStyle = '#4e3322'; g.fillRect(0, 118, w, 1);
      for (x = 0; x < w; x += 18) { g.fillStyle = '#20120a'; g.fillRect(x, 124, 1, 28); g.fillStyle = '#4a301f'; g.fillRect(x + 1, 124, 1, 28); }
      // techo y vigas
      g.fillStyle = '#0d0910'; g.fillRect(0, 0, w, 15); for (x = 40; x < w; x += 120) { g.fillStyle = '#18111b'; g.fillRect(x, 0, 11, 24); g.fillStyle = '#251b27'; g.fillRect(x, 0, 2, 24); }
      // piso: tablas y losetas de la pista, en perspectiva
      vgrad(g, 0, 154, w, h - 154, ['#171320', '#1f1a2e', '#161220']);
      var yy = 154, r = 0;
      while (yy < h) {
        var th = 7 + (yy - 154) * .13, tw = th * 2.6, x0 = 360 - Math.ceil(360 / tw) * tw;
        for (i = 0; x0 + i * tw < w; i++) { g.fillStyle = ((i + r) & 1) ? '#2a2540' : '#201c33'; g.fillRect(Math.round(x0 + i * tw), Math.round(yy), Math.ceil(tw), Math.ceil(th)); g.fillStyle = '#120f1b'; g.fillRect(Math.round(x0 + i * tw), Math.round(yy), 1, Math.ceil(th)); }
        g.fillStyle = '#120f1b'; g.fillRect(0, Math.round(yy), w, 1); yy += th; r++;
      }
      // --- cuadros de músicos en la pared (sin caras) ---
      frameArt(g, 420, 54, 30, 38, 'guitar'); frameArt(g, 458, 66, 26, 30, 'pair'); frameArt(g, 672, 62, 26, 32, 'cajon'); frameArt(g, 6, 58, 18, 30, 'guitar');
      // --- repisa de botellas del bar (derecha) ---
      g.fillStyle = '#3d2718'; g.fillRect(650, 76, 70, 4); g.fillStyle = '#5a3d27'; g.fillRect(650, 76, 70, 1); g.fillStyle = '#3d2718'; g.fillRect(650, 102, 70, 4);
      var bc = ['#2a4a32', '#6a3a1c', '#8a6a24', '#1f2f4a', '#5a2a2a', '#2a4a32'];
      [[78, 18], [102, 16]].forEach(function (rw) { for (i = 0; i < 12; i++) { var bx = 654 + i * 5.6, bh = rw[1] - (i % 3) * 3, by = rw[0]; g.fillStyle = bc[i % 6]; g.fillRect(Math.round(bx), by - bh + 2, 4, bh - 2); g.fillRect(Math.round(bx) + 1, by - bh - 3, 2, 5); g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(Math.round(bx), by - bh + 4, 1, bh - 8); } });
      // barra de madera
      g.fillStyle = '#1c110a'; g.fillRect(640, 128, 80, 40); g.fillStyle = '#6b4a2f'; g.fillRect(636, 124, 84, 6); g.fillStyle = '#8a6038'; g.fillRect(636, 124, 84, 1);
      for (x = 644; x < 720; x += 12) { g.fillStyle = '#2d1c11'; g.fillRect(x, 132, 1, 34); g.fillStyle = '#4a3020'; g.fillRect(x + 1, 132, 1, 34); }
      // --- ventana con la cruz ---
      g.drawImage(win.c, WIN.x, WIN.y);
      // --- el tabladillo: cortina, boca de escena, tablas, frente ---
      var CX0 = 36, CX1 = 394;
      poly(g, [[CX0, 14], [CX1, 14], [CX1, 138], [CX0, 138]], function (x, y) {
        var f = .5 + .5 * Math.sin(x * .36 + Math.sin(x * .045) * 2.2), dk = (y - 14) / 124;
        var v = f * .75 + (1 - dk) * .1 - Math.abs(x - 215) / 700;
        return v > .66 ? '#7a2a3c' : v > .42 ? '#5a1d2e' : v > .22 ? '#43142a' : '#2f0e1e';
      });
      for (x = CX0 + 6; x < CX1; x += 17) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, 30, 1, 108); }
      // cenefa festoneada arriba, con flecos dorados
      for (x = CX0; x < CX1; x += 22) { poly(g, ellPts(x + 11, 24, 11, 12, 0, 18), '#5f1f30'); ell(g, x + 11, 26, 9, 10, '#7a2a3c'); }
      g.fillStyle = '#4a1626'; g.fillRect(CX0, 14, CX1 - CX0, 12);
      for (x = CX0; x < CX1; x += 22) { ell(g, x + 11, 28, 11, 11, '#4a1626'); }
      g.fillStyle = '#c9993a'; g.fillRect(CX0, 14, CX1 - CX0, 2); g.fillStyle = '#f0cf70'; g.fillRect(CX0, 14, CX1 - CX0, 1);
      for (x = CX0 + 2; x < CX1; x += 4) { g.fillStyle = (x & 4) ? '#c9993a' : '#8a6420'; g.fillRect(x, 38, 1, 4 + (x % 3)); }
      // columnas de madera a los lados
      [[CX0 - 12, 12], [CX1 + 2, 12]].forEach(function (p) { g.fillStyle = '#2a190f'; g.fillRect(p[0], p[1], 12, 196); g.fillStyle = '#4a301f'; g.fillRect(p[0] + 2, p[1], 3, 196); g.fillStyle = '#6b4a2f'; g.fillRect(p[0] + 2, p[1], 1, 196); g.fillStyle = '#1b0f08'; g.fillRect(p[0] + 10, p[1], 2, 196); g.fillStyle = '#8a6240'; g.fillRect(p[0] - 2, p[1], 16, 4); g.fillRect(p[0] - 2, p[1] + 188, 16, 4); });
      // cartel «LA ÚLTIMA JARANA»
      var sg = pixText('LA ÚLTIMA JARANA', 13, '#e9c75a');
      g.fillStyle = '#1d120a'; g.fillRect(130, 44, 170, 22); g.fillStyle = '#5a3d27'; g.fillRect(131, 45, 168, 1); g.fillRect(131, 64, 168, 1); g.fillStyle = '#3a2619'; g.fillRect(131, 46, 168, 18);
      g.drawImage(sg, 215 - Math.round(sg.width / 2) + 1, 44 + Math.round((22 - sg.height) / 2) + 1);
      g.fillStyle = '#8a6420'; g.fillRect(150, 38, 1, 6); g.fillRect(280, 38, 1, 6);
      // suelo del escenario (visto desde arriba), borde, frente de tablas
      for (y = 138; y < 152; y++) { g.fillStyle = y < 142 ? '#4a2f1b' : (y < 147 ? '#5e3d24' : '#6e4a2c'); g.fillRect(CX0 - 4, y, CX1 - CX0 + 8, 1); }
      for (x = CX0 - 4; x < CX1 + 4; x += 22) { g.fillStyle = '#2b1a0e'; g.fillRect(x, 138, 1, 14); }
      g.fillStyle = '#a07040'; g.fillRect(CX0 - 6, 152, CX1 - CX0 + 12, 3); g.fillStyle = '#c99660'; g.fillRect(CX0 - 6, 152, CX1 - CX0 + 12, 1);
      for (y = 155; y < 207; y++) { g.fillStyle = y < 162 ? '#4a301f' : y < 190 ? '#3a2616' : '#2a190f'; g.fillRect(CX0 - 6, y, CX1 - CX0 + 12, 1); }
      for (x = CX0 - 6; x < CX1 + 6; x += 16) { g.fillStyle = '#1b0f08'; g.fillRect(x, 155, 1, 52); g.fillStyle = '#4e3322'; g.fillRect(x + 1, 156, 1, 50); }
      for (x = CX0 + 2; x < CX1; x += 48) { g.fillStyle = '#c9c9be'; g.fillRect(x, 162, 2, 2); g.fillRect(x, 198, 2, 2); }
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(CX0 - 6, 200, CX1 - CX0 + 12, 6); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(CX0 - 6, 206, CX1 - CX0 + 12, 4);
      // escalón de la izquierda
      g.fillStyle = '#4a301f'; g.fillRect(CX0 - 6, 176, -1, 0);
      // --- guirnaldas de focos (apagadas, salvo unos pocos) ---
      var swags = [[8, 22, 218, 30, 34], [218, 30, 430, 22, 34], [430, 20, 580, 22, 22], [580, 22, 720, 18, 24]];
      swags.forEach(function (sw) {
        var px0 = sw[0], py0 = sw[1], px1x = sw[2], py1x = sw[3], sag = sw[4], n = Math.round((px1x - px0) / 12), pv = null;
        for (i = 0; i <= n; i++) {
          var u = i / n, bx = px0 + (px1x - px0) * u, by = py0 + (py1x - py0) * u + Math.sin(u * Math.PI) * (sag - 10);
          if (pv) line(g, pv[0], pv[1], bx, by, '#0d0a10', 1);
          pv = [bx, by];
          if (i > 0 && i < n) { g.fillStyle = '#0d0a10'; g.fillRect(Math.round(bx), Math.round(by), 1, 2); var lit = (i * 7 + px0) % 11 === 0; g.fillStyle = lit ? '#e9c16a' : ((i + px0) % 3 ? '#4a3c28' : '#38301f'); g.fillRect(Math.round(bx) - 1, Math.round(by) + 2, 3, 4); g.fillStyle = lit ? '#fff0b0' : '#6b5a3a'; g.fillRect(Math.round(bx), Math.round(by) + 3, 1, 1); }
        }
      });
      // --- mesas volteadas, sillas caídas, botellas y vasos regados ---
      tableTipped(g, 118, 244, 1); tableTipped(g, 418, 226, -1); tableTipped(g, 566, 268, 1); tableTipped(g, 700, 236, -1);
      chairTipped(g, 168, 262, -1); chairTipped(g, 468, 246, 1); chairTipped(g, 344, 232, -1); chairTipped(g, 628, 244, 1); chairTipped(g, 58, 270, 1); chairTipped(g, 262, 222, 1);
      bottle(g, 214, 246, '#2a4a32', .1); bottle(g, 300, 258, '#6a3a1c', -.2); bottle(g, 508, 236, '#8a6a24', .3); bottle(g, 396, 262, '#2a4a32', -.1); bottle(g, 654, 284, '#6a3a1c', .2);
      for (i = 0; i < 18; i++) { g.fillStyle = 'rgba(210,190,150,.35)'; g.fillRect((R() * w) | 0, (200 + R() * 100) | 0, 3, 1); }   // papelitos y confeti viejo
      // oscurecer las esquinas más lejanas del piso
    });
  }

  /* fondo del plano cerrado (dos figuras): cortina, tablas, bokeh de focos */
  function bakeClose() {
    return layer(GW, GH, function (g, w, h) {
      var R = RNG(88), i, x, y;
      poly(g, [[0, 0], [w, 0], [w, 168], [0, 168]], function (X, Y) {
        var f = .5 + .5 * Math.sin(X * .3 + Math.sin(X * .04) * 2), v = f * .78 + (1 - Y / 168) * .06 - Math.abs(X - 240) / 900;
        return v > .62 ? '#68233a' : v > .4 ? '#4a1a2e' : v > .2 ? '#35112a' : '#240b1a';
      });
      for (x = 8; x < w; x += 16) { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x, 0, 1, 168); }
      // tablas del escenario (de arriba), borde y frente
      for (y = 168; y < 204; y++) { g.fillStyle = y < 180 ? '#4a2f1b' : y < 194 ? '#5e3d24' : '#744d2c'; g.fillRect(0, y, w, 1); }
      for (x = 0; x < w; x += 30) { g.fillStyle = '#2b1a0e'; g.fillRect(x, 168, 1, 36); }
      g.fillStyle = '#b07a45'; g.fillRect(0, 204, w, 3); g.fillStyle = '#d8a468'; g.fillRect(0, 204, w, 1);
      for (y = 207; y < h; y++) { g.fillStyle = y < 214 ? '#4a301f' : y < 246 ? '#3a2616' : '#2a190f'; g.fillRect(0, y, w, 1); }
      for (x = 0; x < w; x += 26) { g.fillStyle = '#1b0f08'; g.fillRect(x, 207, 1, h - 207); g.fillStyle = '#4e3322'; g.fillRect(x + 1, 208, 1, h - 208); }
      for (x = 12; x < w; x += 78) { g.fillStyle = '#c9c9be'; g.fillRect(x, 214, 2, 2); g.fillRect(x, 244, 2, 2); }
      // bokeh de focos apagados / casi apagados
      for (i = 0; i < 22; i++) { var bx = R() * w, by = 8 + R() * 70, r = 5 + R() * 11; g.fillStyle = 'rgba(255,205,120,' + (.05 + R() * .1) + ')'; g.beginPath(); g.arc(bx, by, r, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,225,160,.12)'; g.stroke(); }
      // festón y flecos dorados arriba
      for (x = 0; x < w; x += 36) { ell(g, x + 18, 6, 18, 16, '#4a1626'); }
      g.fillStyle = '#c9993a'; g.fillRect(0, 0, w, 3);
      for (x = 2; x < w; x += 5) { g.fillStyle = (x & 4) ? '#c9993a' : '#8a6420'; g.fillRect(x, 3, 1, 6 + (x % 4)); }
    });
  }

  /* ================================================================ ARTE: luz (oscuridad con huecos, conos, brillo cálido, fríos de ventana) ================================================================ */
  function holeG(g, cx, cy, r, a, sy) {
    var gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(.55, 'rgba(0,0,0,' + a * .6 + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); g.translate(cx, cy); g.scale(1, sy || 1); g.translate(-cx, -cy); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); g.restore();
  }
  function coneG(g, topx, topy, topw, botx, boty, botw, a0, a1, rgbS) {
    var gr = g.createLinearGradient(0, topy, 0, boty);
    gr.addColorStop(0, rgbS.replace('A', a0)); gr.addColorStop(1, rgbS.replace('A', a1));
    g.fillStyle = gr; g.beginPath(); g.moveTo(topx - topw, topy); g.lineTo(topx + topw, topy); g.lineTo(botx + botw, boty); g.lineTo(botx - botw, boty); g.closePath(); g.fill();
  }
  function bakeLights(win) {
    var OV = layer(WW, WH, function (g, w, h) {
      g.fillStyle = 'rgba(4,3,10,.84)'; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-out';
      coneG(g, 238, 0, 14, 238, 196, 96, .35, .95, 'rgba(0,0,0,A)');                     // el único foco
      holeG(g, 238, 170, 120, .95, .34); holeG(g, 238, 112, 100, .8, 1);
      holeG(g, 104, 120, 90, .12, .8); holeG(g, 330, 150, 70, .2, .6);                    // la banda y el cajón, apenas
      holeG(g, WIN.x + 63, WIN.y + 70, 128, .5, 1);                                       // halo frío de la ventana
      holeG(g, 600, 215, 110, .22, .5); holeG(g, 330, 240, 220, .14, .35);
      g.fillStyle = '#000';
      poly(g, archPts(WIN.vw, WIN.vh, WIN.vw / 2, WIN.vw / 2).map(function (p) { return [p[0] + WIN.x + WIN.fr, p[1] + WIN.y + WIN.fr]; }), '#000');   // la vista de la ventana, siempre encendida
    });
    var WARM = layer(WW, WH, function (g) {
      coneG(g, 238, 0, 10, 238, 196, 92, .05, .2, 'rgba(255,196,110,A)');
      holeG(g, 0, 0, 0, 0);
      var gr = g.createRadialGradient(238, 176, 4, 238, 176, 100); gr.addColorStop(0, 'rgba(255,208,130,.22)'); gr.addColorStop(1, 'rgba(255,208,130,0)');
      g.save(); g.translate(238, 176); g.scale(1, .3); g.translate(-238, -176); g.fillStyle = gr; g.beginPath(); g.arc(238, 176, 100, 0, TAU); g.fill(); g.restore();
    });
    var COOL = layer(WW, WH, function (g) {   // luz de luna que entra por la ventana: haz hacia el piso y brillo en la pared
      var gx = WIN.x + 63, gy = WIN.y + 70;
      var gr = g.createRadialGradient(gx, gy, 6, gx, gy, 130); gr.addColorStop(0, 'rgba(140,170,255,.30)'); gr.addColorStop(1, 'rgba(140,170,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(gx, gy, 130, 0, TAU); g.fill();
      var gr2 = g.createLinearGradient(0, 130, 0, 290); gr2.addColorStop(0, 'rgba(150,180,255,.20)'); gr2.addColorStop(1, 'rgba(150,180,255,0)');
      g.fillStyle = gr2; g.beginPath(); g.moveTo(WIN.x + 6, 138); g.lineTo(WIN.x + 124, 138); g.lineTo(WIN.x + 40, 300); g.lineTo(WIN.x - 110, 300); g.closePath(); g.fill();
    });
    return { OV: OV, WARM: WARM, COOL: COOL };
  }
  function bakeCloseLights() {
    var OV = layer(GW, GH, function (g, w, h) {
      g.fillStyle = 'rgba(4,3,10,.88)'; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-out';
      coneG(g, 270, 0, 50, 280, 230, 240, .35, .95, 'rgba(0,0,0,A)');
      holeG(g, 270, 150, 250, .92, 1); holeG(g, 270, 210, 230, .8, .4);
    });
    var WARM = layer(GW, GH, function (g) {
      coneG(g, 270, 0, 26, 280, 230, 190, .04, .2, 'rgba(255,196,110,A)');
      var gr = g.createRadialGradient(270, 200, 4, 270, 200, 210); gr.addColorStop(0, 'rgba(255,208,130,.22)'); gr.addColorStop(1, 'rgba(255,208,130,0)');
      g.save(); g.translate(270, 200); g.scale(1, .32); g.translate(-270, -200); g.fillStyle = gr; g.beginPath(); g.arc(270, 200, 210, 0, TAU); g.fill(); g.restore();
    });
    return { OV: OV, WARM: WARM };
  }
  function bakeVignette() {
    return layer(GW, GH, function (g) {
      poly(g, [[0, 0], [GW, 0], [GW, GH], [0, GH]], function (x, y) {
        var dx = (x - GW / 2) / (GW / 2), dy = (y - GH / 2) / (GH / 2), d = Math.pow(Math.max(0, Math.hypot(dx * .9, dy) - .55), 1.5) * 1.25;
        return BAY[(y & 3) * 4 + (x & 3)] < d ? '#07050c' : null;
      });
    });
  }

  /* ================================================================ ARTE: retrato de Don Jaranón (96×96) para el diálogo ================================================================ */
  var PORT = {};
  function bakeJarPortrait(cara, boca, ojos) {
    var key = cara + '|' + boca + '|' + ojos;
    if (PORT[key]) return PORT[key];
    var c = layer(96, 96, function (g) {
      var k = kit(g, 48, 96, 1);
      // hombros de la guayabera
      k.P([[-44, 4], [-40, -14], [-26, -22], [-8, -26], [8, -26], [26, -22], [40, -14], [44, 4]], function (x, y) { var rx = x - 48; return rx < -16 ? JSH.l : rx > 16 ? JSH.d : JSH.m; });
      k.P([[-14, -27], [-3, -18], [-8, -6], [-22, -16]], JSH.l); k.P([[14, -27], [3, -18], [8, -6], [22, -16]], JSH.d);
      k.L(-3, -18, -3, 4, JSH.dd, 1); k.L(3, -18, 3, 4, JSH.dd, 1);
      k.P([[-30, -8], [-18, -8], [-18, 4], [-30, 4]], JSH.l); k.L(-30, -8, -18, -8, JSH.dd, 1);
      k.P([[-26, -9], [-24, -14], [-22, -11], [-20, -15], [-19, -8]], '#fbf8ee');   // el pañuelo del bolsillo
      k.C(0, -26, 0, -40, 15, 13, function (x) { return x > 52 ? JSK.d : JSK.m; });
      var talk = cara === 'triste' ? 0 : boca;
      jarHead(g, 48, 40, 2.0, { tilt: cara === 'triste' ? .06 : -.03, fx: 0, eyes: ojos === 'cerrados' ? 'closed' : ojos === 'medio' ? 'half' : (cara === 'triste' ? 'half' : 'open'), glow: .85, look: [0, cara === 'triste' ? 1 : 0], mouth: talk, smile: cara === 'feliz' ? 1 : 0, sad: cara === 'triste' ? 1 : 0 });
    });
    PORT[key] = c;
    return PORT[key];
  }
  function installPortrait() {   // Don Jaranón no tiene retrato en retratos.js: lo agregamos encadenando draw (sin editar archivos ajenos)
    var R = ACH.retratos;
    if (!R || typeof R.draw !== 'function') return false;
    if (R.__jaranon) return true;
    var prev = R.draw;
    R.draw = function (ctx, quien, cara, boca, ojos, t) {
      if (quien === 'jaranon') {
        try { ctx.drawImage(bakeJarPortrait(cara === 'triste' || cara === 'feliz' ? cara : 'habla', boca === 1 || boca === 2 ? boca : 0, ojos === 'medio' || ojos === 'cerrados' ? ojos : 'abiertos'), 0, 0); } catch (e) { warn('retrato', e); }
        return;
      }
      return prev.apply(this, arguments);
    };
    R.NOMBRES = R.NOMBRES || {}; if (!R.NOMBRES.jaranon) R.NOMBRES.jaranon = 'DON JARANÓN';
    R.__jaranon = true;
    return true;
  }
  try { installPortrait(); } catch (e0) { /* se reintenta en play() */ }

  /* banda zombi del tabladillo (sentada, de frente, en la penumbra): guitarrista y cajonero. Origen: la cadera */
  function bakeZF(kind, li, s) {
    var V = ZV[kind === 'gtr' ? 2 : 4], SK = ZSKIN[V.sk], lean = LEANS[li], CW = 110, CH = 170, OX = 55, OY = 100;
    var c = layer(Math.ceil(CW * s), Math.ceil(CH * s), function (g) {
      var k = kit(g, OX, OY, s), sx = lean * 2.4, hd = lean * 5 + 3;
      [-1, 1].forEach(function (sg) { k.C(sg * 10, 0, sg * 14, 16, 18, 15, V.pants); k.C(sg * 14, 16, sg * 15, 50, 13, 11, V.pants); k.E(sg * 16, 54, 9, 4.6, '#0d0c12'); });
      k.P([[sx - 22, -50], [sx + 22, -50], [18, 2], [-18, 2]], function (x) { return x / s - OX > 8 ? shade(V.shirt, .7) : V.shirt; });
      if (kind === 'gtr') { k.E(-4, -10, 20, 16, '#6a4220', -.3); k.E(-4, -10, 18, 14, '#8a5a2c', -.3); k.C(10, -20, 46, -42, 5, 5, '#3a2a1e'); }
      else { k.P([[-18, -2], [18, -2], [18, 26], [-18, 26]], '#9a6a38'); k.P([[-18, -2], [-12, -8], [24, -8], [18, -2]], '#b8844a'); }
      k.C(sx - 22, -44, sx - 26, -16, 11, 9, SK.d); k.C(sx + 22, -44, sx + 26, -16, 11, 9, SK.d);
      k.C(sx, -52, hd * .8, -64, 14, 13, SK.d);
      k.E(hd, -78, 14.5, 17, SK.m); k.E(hd - 5, -80, 3.2, 2.4, '#16201a'); k.E(hd + 5, -80, 3.2, 2.4, '#16201a'); k.D(hd - 6, -80.6, '#cfe88a', 2, 2); k.D(hd + 4, -80.6, '#cfe88a', 2, 2);
      k.L(hd - 4, -68, hd + 4, -68, '#2c3a2c', 1);
      if (V.hat === 'straw') { k.E(hd, -90, 24, 5, V.hatc); k.E(hd, -95, 11, 8, V.hatc); } else if (V.hat === 'beanie') { k.E(hd, -90, 15, 10, V.hatc); } else k.E(hd, -90, 14, 8, V.hair);
    });
    return { c: outlined(c, '#0d0a12'), ox: OX * s + 1, oy: OY * s + 1 };
  }

  /* ================================================================ horneado general y cachés ================================================================ */
  var SW = .55, SC = 1.1;   // escala de los cuerpos en el plano general (mundo) y en el plano cerrado
  var ART = null;
  function bakeHalo() { return layer(90, 90, function (g) { var gr = g.createRadialGradient(45, 45, 2, 45, 45, 44); gr.addColorStop(0, 'rgba(255,248,224,.9)'); gr.addColorStop(.3, 'rgba(190,205,255,.34)'); gr.addColorStop(1, 'rgba(140,160,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 90, 90); }); }
  function bakeAll() {
    var A = {}, t0 = (window.performance || Date).now();
    A.win = bakeWindow(); A.world = bakeWorld(A.win); A.close = bakeClose();
    var lt = bakeLights(A.win); A.lt = lt; A.ltc = bakeCloseLights(); A.vig = bakeVignette(); A.halo = bakeHalo();
    A.note = [bakeNote(1, '#f3e4a0'), bakeNote(2, '#fff0b8')];
    A.cache = {};
    A.ms = Math.round((window.performance || Date).now() - t0);
    return A;
  }
  function memo(key, fn) { var C = ART.cache; return C[key] || (C[key] = fn()); }
  function sJar(pose, lean, mouth, eyes, sc) { return memo('J|' + pose + '|' + lean + '|' + mouth + '|' + eyes + '|' + sc, function () { return bakeJar({ pose: pose, lean: lean, mouth: mouth, eyes: eyes }, sc); }); }
  function sAlex(strum, lean, head, expr, blink, sc) { return memo('A|' + strum + '|' + lean + '|' + head + '|' + expr + '|' + blink + '|' + sc, function () { return bakeAlexSeat({ strum: strum, lean: lean, head: head, expr: expr, blink: blink }, sc); }); }
  function sWalk(f, sc) { return memo('W|' + f + '|' + sc, function () { return bakeAlexWalk(f, sc); }); }
  function sPig(p, sc) { return memo('P|' + p + '|' + sc, function () { return bakePigeon(p, sc); }); }
  function sZP(v, li, sc) { return memo('ZP|' + v + '|' + li + '|' + sc, function () { return bakeZP(v, li, sc); }); }
  function sZB(v, li, sc) { return memo('ZB|' + v + '|' + li + '|' + sc, function () { return bakeZB(v, li, sc); }); }
  function sZF(k, li, sc) { return memo('ZF|' + k + '|' + li + '|' + sc, function () { return bakeZF(k, li, sc); }); }
  function sProp(n, sc) { return memo('PR|' + n + '|' + sc, function () { return n === 'mic' ? bakeMic(sc) : n === 'cajon' ? bakeCajon(sc) : bakeHat(sc); }); }

  /* ================================================================ LA ESCENA ================================================================ */
  var G = null;
  function dr(img, x, y) { G.drawImage(img, Math.round(x), Math.round(y)); }
  function rc(c, x, y, w, h) { G.fillStyle = c; G.fillRect(Math.round(x), Math.round(y), w, h); }
  function put(sp, x, y, flip) {
    var X = Math.round(x), Y = Math.round(y), ox = Math.round(sp.ox), oy = Math.round(sp.oy);
    if (!flip) G.drawImage(sp.c, X - ox, Y - oy);
    else { G.save(); G.translate(X, Y); G.scale(-1, 1); G.drawImage(sp.c, -ox, -oy); G.restore(); }
  }
  // meceos: 0 → restos de gruñido (jitter irregular), 1 → mecerse al compás del vals
  function calm(t) { return ramp(t, 9.2, 13.8); }
  function swayAt(t, ph) {
    var cm = calm(t), jit = (vn(t * 1.9 + ph * 40, ph * 13, 1) * 2 - 1) * .7;
    return (1 - cm) * jit + cm * Math.sin(TAU * (t - T.w0) / T.bar + ph * 1.4) * .95;
  }
  function lean3(l) { return l > .38 ? 1 : l < -.38 ? -1 : 0; }
  function lean5(l) { return clamp(Math.round((l + 1) * 2), 0, 4); }

  var MID = [[438, 238, .5, 0, 0, .1], [486, 256, .56, 2, 0, .35], [532, 244, .52, 1, 0, .6], [598, 264, .6, 3, 0, .85], [650, 242, .52, 4, 0, .2], [698, 260, .6, 5, 0, .5], [22, 244, .55, 1, 1, .7], [74, 268, .62, 4, 1, .3]];
  var FGB = [[56, 306, .8, 0, .15], [158, 314, .86, 1, .6], [338, 308, .84, 3, .9], [424, 316, .88, 4, .3], [520, 306, .82, 2, .75], [640, 314, .88, 5, .45], [252, 322, .9, 2, .05]];

  function camAt(t) {
    if (t < T.s2) return { m: 'w', x: 78 + 30 * eio(clamp(t / T.s2, 0, 1)), y: 22 };
    if (t < T.s3) return { m: 'c', x: 0, y: 0 };
    if (t < T.s4) return { m: 'w', x: 108 + 112 * eio(ramp(t, T.s3, T.s4 - .6)), y: 20 };
    var u = t - T.s4;
    return { m: 'w', x: lerp(172, 152, eio(clamp(u / 2.6, 0, 1))) + Math.sin(t * .35) * 1.2, y: lerp(22, 30, eio(clamp(u / 1.6, 0, 1))) };
  }
  // pose de Don Jaranón y de Alexander según el tiempo (y la línea del diálogo, si está hablando)
  function jarState(t, ln) {
    var s = lean3(swayAt(t, 0)), o;
    if (ln >= 0) { o = ln <= 1 ? { pose: 'point', lean: 0 } : ln >= 5 ? { pose: 'hum', lean: s } : { pose: 'look', lean: 0 }; }
    else if (t < 6.6) o = { pose: 'bow', lean: 0 };
    else if (t < 8.5) o = { pose: 'look', lean: 0 };
    else if (t < 17.5) o = { pose: 'hum', lean: calm(t) > .1 ? s : 0 };
    else o = { pose: 'point', lean: 0 };
    return o;
  }
  function alexState(t, ln) {
    var head = 'guitar', expr = 'smile', strum = 0;
    if (t >= T.w0) strum = (Math.floor((t - T.w0) / .4) & 1);
    if (t >= 8.6 && t < 15.4) head = 'jar'; else if (t >= 15.4 && t < 17.3) head = 'guitar'; else if (t >= 17.3) head = 'window';
    if (ln >= 0) { head = (ln === 2 || ln === 3) ? 'jar' : 'window'; expr = ln === 2 ? 'sad' : ln === 5 ? 'joy' : 'smile'; }
    var lean = t >= 9.6 ? lean3(swayAt(t, .05)) : 0;
    return { head: head, expr: expr, strum: strum, lean: lean, blink: head !== 'guitar' && ((t * 1000) % 3700) < 110 };
  }
  var ALEX_WALK = { t0: 1.9, x0: 36, x1: 198, sp: 54 };

  function drawScene(t, ln, mouthJ) {
    var c = camAt(t), WM = c.m === 'w', sc = WM ? SW : SC, kk = WM ? 1 : 2;
    function fx(x) { return WM ? x - c.x : (x - 262) * 2 + 270; }
    function fy(y) { return WM ? y - c.y : (y - 150) * 2 + 205; }
    var rev = ramp(t, 11.2, 14.6), beat = ((t - T.w0) / .8);
    if (WM) dr(ART.world, -c.x, -c.y); else dr(ART.close, 0, 0);
    // la ventana, apenas visible al principio; se enciende cuando el público empieza a mecerse
    if (WM) { G.globalAlpha = .62 * (1 - rev); dr(ART.win.dim, WIN.x - c.x, WIN.y - c.y); G.globalAlpha = 1; }
    // banda zombi (penumbra del fondo)
    if (WM) {
      [['gtr', 92, 148, .1], ['caj', 152, 148, .4]].forEach(function (b) { put(sZF(b[0], lean5(swayAt(t, b[3])), sc), fx(b[1]), fy(b[2])); });
      put(sProp('hat', sc), fx(122), fy(153));
    }
    // utilería
    put(sProp('mic', sc), fx(302), fy(147));
    put(sProp('cajon', sc), fx(336), fy(148));
    // Alexander: llega caminando (plano general) y luego, sentado, afina y toca
    var aw = ALEX_WALK, ax = clamp(aw.x0 + (t - aw.t0) * aw.sp, aw.x0, aw.x1);
    if (t < T.s2) {
      if (t > aw.t0 && WM) { var f = Math.floor((t - aw.t0) * 5.5) & 3; put(sWalk(f, sc), fx(ax), fy(152)); }
    } else {
      var as = alexState(t, ln);
      put(sAlex(as.strum, as.lean, as.head, as.expr, as.blink ? 1 : 0, sc), fx(192), fy(150));
    }
    // Don Jaranón
    var js = jarState(t, ln), br = (js.pose === 'bow' ? Math.sin(t * 1.3) * .6 : 0);
    put(sJar(js.pose, js.lean, mouthJ || 0, js.pose === 'point' || js.pose === 'look' ? 'open' : '', sc), fx(262), fy(150) + br * kk);
    // Titina: llega volando y se posa en el cajón (se ve el vuelo en el plano cerrado)
    var pcx = fx(336), pcy = fy(113), ptx = pcx, pty = pcy, pf = 1, pp = 'perch';
    if (t < T.s2) { if (WM && t > 2.5) { var u1 = ramp(t, 2.5, 4.2); ptx = lerp(fx(-10), fx(ax + 30), eout(u1)) + Math.sin(t * 4) * 3; pty = lerp(fy(34), fy(76), u1) + Math.sin(t * 6.4) * 4; pp = 'fly' + (Math.floor(t * 13) % 3); pf = 0; } else pf = -1; }
    else if (t < T.s2 + 1.9) {
      var u2 = ramp(t, T.s2 + .15, T.s2 + 1.8), ee = eio(u2);
      if (WM) { ptx = pcx; pty = pcy; } else { ptx = lerp(-30, pcx, ee); pty = lerp(40, pcy + 2, ee) - Math.sin(u2 * Math.PI) * 46; }
      if (u2 < 1) { pp = 'fly' + (Math.floor(t * 13) % 3); pf = 0; }
      if (t < T.s2 + .15) pf = -1;
    } else { pty = pcy + 2 + (Math.sin(t * 1.9) > .93 ? -kk : 0); if (((t * 10) | 0) % 31 === 0) pp = 'puff'; }
    // público: de perfil en el fondo, de espaldas en primer plano
    if (WM) {
      MID.forEach(function (m) { var x = fx(m[0]); if (x < -60 || x > GW + 60) return; var sp = sZP(m[3], lean5(swayAt(t, m[5])), m[2]); put(sp, x, fy(m[1]), m[4]); });
      FGB.forEach(function (m) { var x = fx(m[0]); if (x < -70 || x > GW + 70) return; put(sZB(m[3], lean5(swayAt(t, m[4])), m[2]), x, fy(m[1])); });
    }
    // oscuridad con huecos de luz, brillo cálido del foco y luz de luna
    if (WM) {
      dr(ART.lt.OV, -c.x, -c.y);
      G.globalCompositeOperation = 'lighter'; G.globalAlpha = .9; dr(ART.lt.WARM, -c.x, -c.y);
      G.globalAlpha = .25 + .75 * rev; dr(ART.lt.COOL, -c.x, -c.y); G.globalAlpha = 1; G.globalCompositeOperation = 'source-over';
    } else {
      dr(ART.ltc.OV, 0, 0);
      G.globalCompositeOperation = 'lighter'; G.globalAlpha = .9; dr(ART.ltc.WARM, 0, 0); G.globalAlpha = 1; G.globalCompositeOperation = 'source-over';
    }
    if (pf >= 0) { G.globalAlpha = .93; put(sPig(pp, sc * 1.1), ptx, pty, pf === 1 ? 1 : 0); G.globalAlpha = 1; }
    // ---- lo que brilla: ojos del público, luces del Cristo, focos, polvo, notas ----
    if (WM) {
      MID.forEach(function (m) {
        var x = fx(m[0]); if (x < -60 || x > GW + 60) return;
        var sp = sZP(m[3], lean5(swayAt(t, m[5])), m[2]), dxe = sp.eye[0] - sp.ox, dye = sp.eye[1] - sp.oy;
        var gx = x + (m[4] ? -dxe - 1 : dxe), gy = fy(m[1]) + dye, a = .55 + .35 * Math.sin(t * 2.2 + m[5] * 9);
        G.globalAlpha = a * (1 - .3 * calm(t)); rc('#d6ef7a', gx, gy, 2, 2); G.globalAlpha = a * .25; rc('#d6ef7a', gx - 1, gy - 1, 4, 4); G.globalAlpha = 1;
      });
      var cr = [WIN.x + WIN.fr + CRUZ.x - c.x, WIN.y + WIN.fr + CRUZ.y - c.y];
      if (cr[0] > -40 && cr[0] < GW + 40) {
        var pulse = .7 + .3 * Math.sin(t * 1.6) + (t > 17.4 && t < 19.4 ? .35 * Math.sin((t - 17.4) / 2 * Math.PI) : 0);
        G.globalCompositeOperation = 'lighter'; G.globalAlpha = clamp((.35 + .65 * rev) * pulse, 0, 1); G.drawImage(ART.halo, Math.round(cr[0] - 45), Math.round(cr[1] - 24 - 45)); G.globalAlpha = 1; G.globalCompositeOperation = 'source-over';
        var cols = ['#ff4f93', '#5ce1e6', '#ffc766', '#ffffff', '#7dff9a'], i;
        for (i = 0; i < 26; i++) {
          var ax2 = i < 14 ? (-13 + i * 2) : (-5 + (i - 14) * 1), ay2 = i < 14 ? -23 : -3 + (i - 14) * 0;
          if (i >= 14) { ax2 = (i % 2 ? 5 : -5); ay2 = -2 - ((i - 14) >> 1) * 1.2 + 4; }
          var tw = .5 + .5 * Math.sin(t * 3.1 + i * 1.7); G.globalAlpha = (.3 + .7 * tw) * (.4 + .6 * rev); rc(cols[i % 5], cr[0] + ax2, cr[1] + ay2 + 2, 1, 1);
        }
        G.globalAlpha = 1;
      }
      // focos encendidos (los pocos que quedan)
      [[104, 56], [236, 63], [350, 56]].forEach(function (b, i) { var x = fx(b[0]), a = .55 + .35 * Math.sin(t * 2.7 + i * 2.1) * (i === 1 ? .4 : 1); G.globalAlpha = a; rc('#ffe9a8', x - 1, fy(b[1]), 2, 2); G.globalAlpha = a * .22; rc('#ffd27a', x - 4, fy(b[1]) - 3, 8, 8); G.globalAlpha = 1; });
    }
    // polvo en el haz del foco
    var i2;
    for (i2 = 0; i2 < 46; i2++) {
      var dx = 200 + h2(i2, 3) * 80 + Math.sin(t * .35 + i2) * 7, dy = 18 + ((h2(i2, 9) * 176 + t * (2 + h2(i2, 5) * 3)) % 176);
      var px = fx(dx), py = fy(dy); if (px < 0 || px > GW || py < 0 || py > GH) continue;
      G.globalAlpha = .25 + .55 * h2(i2, 7) * (.6 + .4 * Math.sin(t * 1.3 + i2)); rc('#ffe7b0', px, py, 1, 1);
    }
    G.globalAlpha = 1;
    // notas del «mmm» de Jaranón (y de la guitarra)
    if (t > 8.7) {
      var nn = Math.floor((t - 8.8) / .8), q;
      for (q = Math.max(0, nn - 3); q <= nn; q++) {
        var age = t - (8.8 + q * .8); if (age < 0 || age > 3.0) continue;
        var mx = 264 + Math.sin(age * 2.3 + q) * 7 + age * 7, my = 94 - age * 17, a3 = Math.min(1, age * 3) * (1 - ramp(age, 2.1, 3.0));
        G.globalAlpha = a3; var nsp = ART.note[q & 1 ? 0 : 1]; G.drawImage(nsp, Math.round(fx(mx) - nsp.width / 2 * (kk - .4)), Math.round(fy(my)));
      }
      G.globalAlpha = 1;
    }
    if (t > T.w0) {
      var gq = Math.floor((t - T.w0 - .8) / 1.6), q2;
      for (q2 = Math.max(0, gq - 2); q2 <= gq; q2++) {
        var ag = t - (T.w0 + .8 + q2 * 1.6); if (ag < 0 || ag > 2.4) continue;
        G.globalAlpha = Math.min(1, ag * 3) * (1 - ramp(ag, 1.5, 2.4)); var n2 = ART.note[0];
        G.drawImage(n2, Math.round(fx(198 + Math.sin(ag * 2 + q2 * 2) * 6 - ag * 3)), Math.round(fy(92 - ag * 15)));
      }
      G.globalAlpha = 1;
    }
    return c;
  }

  function renderAll(t) {
    var g = L.g; G = g;
    g.setTransform(2, 0, 0, 2, 0, 0); g.imageSmoothingEnabled = false;
    var ln = -1, mo = 0;
    if (L.mode === 'dialogo' && ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active()) {
      try { var st = ACH.dialogo.state(); if (st) { ln = st.i; if (st.quien === 'jaranon' || (!st.quien && /^DON JARAN/.test(st.texto))) mo = st.mouth || 0; } } catch (e) { /* nada */ }
    } else if (L.mode === 'dialogo' && L.ending) ln = 5;
    if (L.frozen && L.fln != null) { ln = L.fln; }
    drawScene(t, ln, mo);
    g.globalAlpha = .55; dr(ART.vig, 0, 0); g.globalAlpha = 1;
    // corte con un parpadeo oscuro
    var cuts = [T.s2, T.s3, T.s4], f = 0, i;
    for (i = 0; i < 3; i++) { var d = t - cuts[i]; if (d >= 0 && d < T.flash) f = Math.max(f, 1 - d / T.flash); }
    if (f > 0) { g.globalAlpha = f * .92; rc('#07050c', 0, 0, GW, GH); g.globalAlpha = 1; }
    // bandas de cine: entran al principio y salen cuando empieza el diálogo
    var bar = 14 * eout(ramp(t, 0, .9)) * (1 - eio(ramp(t, T.end, T.end + .7)));
    if (bar > .4) { rc('#000', 0, 0, GW, Math.round(bar)); rc('#000', 0, GH - Math.round(bar), GW, Math.round(bar)); }
    if (t < 1.1) { g.globalAlpha = 1 - t / 1.1; rc('#000', 0, 0, GW, GH); g.globalAlpha = 1; }
    if (L.fade > 0) { g.globalAlpha = L.fade; rc('#000', 0, 0, GW, GH); g.globalAlpha = 1; }
    L.lab.classList.toggle('on', t > 1.2 && t < 4.4);
  }

  /* ================================================================ AUDIO: vals lento propio (Web Audio) ================================================================
     Si existe ACH.audio.br.play (B3, criolla.js) se pide 'final' y no se usa nada de esto (salvo opts.ownMusic). Si no, este tema:
     75 bpm en 3/4 (compás = 2,4 s), la menor. 0–5 s: ronroneo de la sala, gruñidos lejanos de los zombis y un bordón; 5–7,2 afinación de una guitarra de nylon;
     7,2 empieza el vals (bajo en el 1, acordes en el 2 y el 3, melodía punteada); 8,8 entra el «mmm» de Jaranón (voz tarareada, sin letra); 9,6 el cajón
     muy suave y el coro de zombis (acorde sostenido) a medida que se mecen. Después del montaje el vals sigue en bucle (más bajito) mientras dura el diálogo. */
  var AU = null, AU_OWN = null;
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function auCtx() {
    var A = ACH.audio;
    if (A && A.ctx) return A.ctx;
    if (!AU_OWN) { var C = window.AudioContext || window.webkitAudioContext; if (C) { try { AU_OWN = new C(); } catch (e) { AU_OWN = null; } } }
    return AU_OWN;
  }
  function auNoise(c) {
    var n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0), r = RNG(99);
    for (var i = 0; i < n; i++) d[i] = r() * 2 - 1;
    return b;
  }
  function auIR(c) {
    var len = Math.floor(c.sampleRate * 2.2), b = c.createBuffer(2, len, c.sampleRate), r = RNG(7);
    for (var ch = 0; ch < 2; ch++) { var d = b.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, 2.4); }
    return b;
  }
  function V(type, f, at, dur, peak, o) {
    var c = AU.c; o = o || {};
    var osc = c.createOscillator(), flt = c.createBiquadFilter(), g = c.createGain();
    osc.type = type; osc.frequency.setValueAtTime(f, at); if (o.det) osc.detune.value = o.det;
    if (o.glide) osc.frequency.exponentialRampToValueAtTime(o.glide, at + dur * (o.gl || .8));
    flt.type = o.ft || 'lowpass'; flt.Q.value = o.q || .7; flt.frequency.setValueAtTime(o.lp || 3000, at);
    if (o.lp2) flt.frequency.exponentialRampToValueAtTime(o.lp2, at + dur * .9);
    var a = o.a == null ? .004 : o.a, rel = o.rel == null ? Math.min(.08, dur * .3) : o.rel;
    g.gain.setValueAtTime(.0001, at); g.gain.linearRampToValueAtTime(peak, at + a);
    if (o.sus != null) g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak * o.sus), at + Math.max(a + .01, dur - rel)); else g.gain.exponentialRampToValueAtTime(.0002, at + dur);
    g.gain.linearRampToValueAtTime(0, at + dur + rel);
    if (o.vib) {   // vibrato lento (la voz)
      var lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = o.vib; lg.gain.setValueAtTime(0, at); lg.gain.linearRampToValueAtTime(o.vd || 14, at + Math.min(.5, dur * .6));
      lfo.connect(lg); lg.connect(osc.detune); lfo.start(at); lfo.stop(at + dur + rel + .05);
    }
    osc.connect(flt); flt.connect(g); g.connect(AU.dry);
    if (o.wet) { var w = c.createGain(); w.gain.value = o.wet; g.connect(w); w.connect(AU.verb); }
    osc.start(at); osc.stop(at + dur + rel + .05);
  }
  function N(at, dur, peak, o) {
    var c = AU.c; o = o || {};
    var src = c.createBufferSource(), flt = c.createBiquadFilter(), g = c.createGain();
    src.buffer = AU.nb; src.loop = true; flt.type = o.ft || 'bandpass'; flt.Q.value = o.q || 1; flt.frequency.setValueAtTime(o.f || 2000, at);
    if (o.f2) flt.frequency.exponentialRampToValueAtTime(o.f2, at + dur);
    var a = o.a == null ? .003 : o.a;
    g.gain.setValueAtTime(.0001, at); g.gain.linearRampToValueAtTime(peak, at + a);
    if (o.swell) g.gain.linearRampToValueAtTime(peak, at + dur * .9); else g.gain.exponentialRampToValueAtTime(.0002, at + dur);
    g.gain.linearRampToValueAtTime(0, at + dur + .06);
    src.connect(flt); flt.connect(g); g.connect(AU.dry);
    if (o.wet) { var w = c.createGain(); w.gain.value = o.wet; g.connect(w); w.connect(AU.verb); }
    src.start(at, Math.random() * 1.5); src.stop(at + dur + .08);
  }
  function pluck(m, at, dur, pk, o) {   // guitarra criolla de nylon: cuerpo suave, ataque corto
    o = o || {}; var f = mtof(m);
    V('sawtooth', f, at, dur, pk * .42, { lp: o.lp || 2100, lp2: 420, wet: .3, a: .003, rel: .05, det: 3 });
    V('triangle', f * 2, at, dur * .55, pk * .2, { lp: 2800, lp2: 700, a: .002, rel: .03 });
    V('sine', f, at, dur * 1.15, pk * .4, { lp: 1400, a: .004 });
  }
  function strum(ms, at, pk, dur) { for (var i = 0; i < ms.length; i++) pluck(ms[i], at + i * .026, dur, pk * (1 - i * .06), { lp: 1700 }); }
  function hum(m, at, dur, pk) {   // el «mmm»: voz grave tarareada, de nariz, con vibrato
    var f = mtof(m);
    V('sawtooth', f, at, dur, pk, { lp: 560, lp2: 420, q: 5.5, a: .12, sus: .85, rel: .28, wet: .45, vib: 5.1, vd: 15, det: -7 });
    V('sawtooth', f, at, dur, pk * .8, { lp: 560, lp2: 420, q: 5.5, a: .12, sus: .85, rel: .28, vib: 5.3, vd: 12, det: 8 });
    V('sine', f * 2, at, dur, pk * .18, { lp: 1300, a: .15, sus: .7, rel: .25, vib: 5.1, vd: 12 });
    N(at, dur, pk * .09, { f: 900, q: 2.2, a: .1, swell: true, wet: .3 });
  }
  function cajonBass(at, pk) { V('sine', 118, at, .26, pk, { glide: 52, gl: .55, a: .002, lp: 500, rel: .03 }); N(at, .04, pk * .25, { f: 260, q: .6 }); }
  function cajonSlap(at, pk) { N(at, .07, pk, { f: 2000, q: 1.1, a: .001 }); V('triangle', 220, at, .05, pk * .3, { glide: 170, a: .001, lp: 900 }); }
  function groan(at, pk, f0) { V('sawtooth', f0, at, 1.1, pk, { glide: f0 * .72, gl: .9, lp: 340, lp2: 200, q: 3, a: .25, sus: .6, rel: .4, wet: .5, vib: 4, vd: 25 }); N(at + .05, 1.0, pk * .4, { f: 420, f2: 260, q: 3, a: .25, wet: .4 }); }
  var CH = { Am: { b: [45, 52], c: [57, 60, 64], pad: [45, 52, 57] }, E7: { b: [40, 47], c: [56, 59, 62], pad: [40, 47, 56] }, Dm: { b: [50, 45], c: [57, 62, 65], pad: [38, 45, 50] } };
  var PROG = ['Am', 'E7', 'Am', 'Dm', 'E7', 'Am', 'Dm', 'E7'];
  var MEL = [[[76, 0, 2], [72, 2, 1]], [[71, 0, 2], [68, 2, 1]], [[69, 0, 1], [72, 1, 1], [76, 2, 1]], [[77, 0, 2], [74, 2, 1]],
    [[76, 0, 1.5], [74, 1.5, .5], [71, 2, 1]], [[72, 0, 2], [69, 2, 1]], [[74, 0, 1], [77, 1, 1], [76, 2, 1]], [[68, 0, 1.5], [71, 1.5, .5], [69, 2, 1]]];
  function schedBar(b) {
    var beat = 60 / T.bpm, tb = AU.A0 + T.w0 + b * T.bar, p = b % 8, ch = CH[PROG[p]], vol = b >= 8 ? .72 : 1, i;
    pluck(ch.b[0], tb, 1.1, .5 * vol, { lp: 900 });
    strum(ch.c, tb + beat, .3 * vol, .8); strum(ch.c, tb + beat * 2, .26 * vol, .8);
    MEL[p].forEach(function (n, k) { pluck(n[0], tb + n[1] * beat, n[2] * beat * .95 + .3, (k === 0 ? .46 : .4) * vol, { lp: 2600 }); });
    if (b >= 1) {
      MEL[p].forEach(function (n) { hum(n[0] - 12, tb + n[1] * beat + .02, Math.max(.5, n[2] * beat * .95), .14 * vol); });
      cajonBass(tb, .2 * vol); cajonSlap(tb + beat * 2, .1 * vol); if (b % 2) cajonSlap(tb + beat * 1.5, .05 * vol);
      for (i = 0; i < 3; i++) V('triangle', mtof(ch.pad[i]), tb - .1, T.bar + .4, .03 * vol, { lp: 700, a: .6, sus: .8, rel: .6, wet: .5, det: i * 5 - 5 });
    } else {
      hum(64, tb + beat * 2, 1.0, .1);   // el «mmm» de pie de compás, antes de la melodía
    }
  }
  var Aud = {
    start: function (off) {
      off = off || 0;
      var o = L && L.opts || {};
      if (!o.ownMusic && ACH.audio && ACH.audio.br && typeof ACH.audio.br.play === 'function') {
        try { var r = ACH.audio.br.play('final'); if (r !== false) { AU = { ext: true }; return; } } catch (e) { warn("audio.br.play('final')", e); }
      }
      var c = auCtx(); if (!c) return;
      try { if (c.state === 'suspended') c.resume(); } catch (e) { /* nada */ }
      var A = ACH.audio, dest = (A && A.ctx === c && A.bus && A.bus.music) ? A.bus.music : c.destination;
      var master = c.createGain(), comp = c.createDynamicsCompressor(), verb = c.createConvolver(), vg = c.createGain(), dry = c.createGain(), vin = c.createGain();
      master.gain.value = .0001; master.gain.linearRampToValueAtTime(.85, c.currentTime + .6);
      comp.threshold.value = -18; comp.ratio.value = 3.5; comp.attack.value = .006; comp.release.value = .25;
      master.connect(comp); comp.connect(dest);
      verb.buffer = auIR(c); vg.gain.value = .8; verb.connect(vg); vg.connect(master);
      dry.gain.value = 1; dry.connect(master); vin.connect(verb);
      AU = { c: c, master: master, dry: dry, verb: vin, A0: c.currentTime + .08 - off, nb: null, ext: false, next: 0, timer: 0 };
      AU.nb = auNoise(c);
      var a0 = AU.A0;
      if (off < T.w0) {
        V('sine', 55, a0, T.w0 + .5, .05, { a: 1.6, sus: .8, rel: .6, lp: 300 }); V('triangle', 110, a0, T.w0 + .5, .02, { a: 2, sus: .8, rel: .6, lp: 400, det: 6 });
        N(a0, 6.5, .018, { ft: 'lowpass', f: 160, q: .5, a: 1.2, swell: true });
        [[.9, 82], [2.6, 70], [4.1, 76]].forEach(function (g2) { if (g2[0] >= off) groan(a0 + g2[0], .045, g2[1]); });
        [[5.0, 52], [5.55, 59], [6.1, 55], [6.65, 50]].forEach(function (n) { if (n[0] >= off) pluck(n[1], a0 + n[0], 1.1, .16, { lp: 1300 }); });
      }
      AU.next = Math.max(0, Math.ceil((off - T.w0 - .3) / T.bar));
      Aud.pump();
      AU.timer = setInterval(Aud.pump, 250);
    },
    pump: function () {
      var a = AU; if (!a || a.ext || !a.c) return;
      var now = a.c.currentTime;
      while (a.A0 + T.w0 + a.next * T.bar < now + 1.2) { try { schedBar(a.next); } catch (e) { warn('schedBar', e); } a.next++; if (a.next > 400) break; }
    },
    stop: function (fade) {
      var a = AU; AU = null;
      if (!a) return;
      if (a.ext) { try { ACH.audio.br.stop(); } catch (e) { /* nada */ } return; }
      if (a.timer) clearInterval(a.timer);
      try { var c = a.c, f = fade == null ? .3 : fade; a.master.gain.cancelScheduledValues(c.currentTime); a.master.gain.setValueAtTime(Math.max(.0001, a.master.gain.value), c.currentTime); a.master.gain.exponentialRampToValueAtTime(.0001, c.currentTime + Math.max(.03, f)); setTimeout(function () { try { a.master.disconnect(); } catch (e) { /* nada */ } }, f * 1000 + 160); } catch (e) { /* nada */ }
    },
    fadeOut: function (f) { Aud.stop(f); },
    unlock: function () { var c = auCtx(); try { if (c && c.state === 'suspended') c.resume(); } catch (e) { /* nada */ } }
  };

  /* ================================================================ CORREDOR ================================================================ */
  var L = null;
  var seenMem = false;
  function seen() { if (seenMem) return true; try { return window.localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function markSeen() { seenMem = true; try { window.localStorage.setItem(KEY, '1'); } catch (e) { /* en memoria */ } }

  var CURA = ['cura-9', 'Bata blanca rumbo al Morro Solar', 'Don Jaranón, la Voz de Oro: «Hace días pasaron por aquí unos de bata blanca, con neveras, cantando bajito pa\' que no los oyéramos. Iban para el Morro Solar, allá arriba, en Chorrillos.»'];
  // con retrato propio (quien:'jaranon') si pudimos agregarlo a ACH.retratos; si no, solo su nombre en el texto (como los demás sin cara)
  function lines(withPortrait) {
    function J(t) { return withPortrait ? { quien: 'jaranon', cara: 'habla', texto: t, nombre: 'Don Jaranón' } : { quien: null, cara: 'habla', texto: 'DON JARANÓN: ' + t }; }
    return [
      J('Hace días pasaron por aquí unos de bata blanca, con neveras. Cantaban bajito pa\' que no los oyéramos.'),
      J('Iban para el Morro Solar, muchacho. Allá arriba, en Chorrillos.'),
      { quien: 'alexander', cara: 'triste', texto: 'Mi abuela lo quería un montón, maestro. Gracias por la última jarana.' },
      J('Anda, y cántales a todos. Que esta ciudad no se muera callada.'),
      { quien: 'alexander', cara: 'serio', texto: 'Chorrillos…' },
      { quien: 'alexander', cara: 'risa', texto: '¡Allá voy!' }
    ];
  }

  var CSS = '.brf-root{position:absolute;inset:0;z-index:5;background:#000;overflow:hidden;touch-action:none;--cu:2px}' +
    '.brf-root.full{position:fixed;z-index:5}' +
    '.brf-cv{position:absolute;left:0;top:0;width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges}' +
    '.brf-root.full .brf-cv{left:50%;top:50%;transform:translate(-50%,-50%)}' +
    '.brf-lab{position:absolute;left:calc(var(--cu)*16);top:calc(var(--cu)*196);opacity:0;transform:rotate(-3deg) scale(.3);transform-origin:0 100%;transition:transform .35s cubic-bezier(.2,1.9,.4,1),opacity .18s linear;pointer-events:none}' +
    '.brf-lab.on{opacity:1;transform:rotate(-3deg) scale(1)}' +
    '.brf-lab b{display:block;font-family:"Bungee","Arial Black",Impact,sans-serif;font-weight:400;font-size:calc(var(--cu)*11);line-height:1;color:#ffe500;background:#131015;padding:calc(var(--cu)*3) calc(var(--cu)*6) calc(var(--cu)*2);border:calc(var(--cu)*1.2) solid #ff2e88;box-shadow:calc(var(--cu)*2) calc(var(--cu)*2) 0 #1fe07a;white-space:nowrap}' +
    '.brf-lab i{display:block;margin-top:calc(var(--cu)*3);font-family:"Patrick Hand","Comic Sans MS",cursive;font-style:normal;font-size:calc(var(--cu)*9);color:#fff;text-shadow:calc(var(--cu)*1) calc(var(--cu)*1) 0 #131015,0 0 calc(var(--cu)*3) rgba(0,0,0,.6)}' +
    '.brf-skip{position:absolute;right:calc(var(--cu)*8);bottom:calc(var(--cu)*3);font-family:"Silkscreen","Courier New",monospace;font-size:calc(var(--cu)*5);color:#131015;background:#1fe07a;padding:calc(var(--cu)*1.5) calc(var(--cu)*3.5);opacity:0;transition:opacity .3s;pointer-events:none}' +
    '.brf-skip.on{opacity:.9}' +
    '.brf-pausa{position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;background:rgba(8,7,10,.62);pointer-events:none}' +
    '.brf-pausa.on{display:flex}' +
    '.brf-pausa b{font-family:"Bungee","Arial Black",Impact,sans-serif;font-weight:400;font-size:calc(var(--cu)*26);line-height:1;color:#ffe500;text-shadow:calc(var(--cu)*2) calc(var(--cu)*2) 0 #ff2e88,calc(var(--cu)*4) calc(var(--cu)*4) 0 #131015;transform:rotate(-2deg)}' +
    '.brf-pausa i{display:block;margin-top:calc(var(--cu)*8);font-family:"Silkscreen","Courier New",monospace;font-style:normal;font-size:calc(var(--cu)*6);color:#f2f2ee;background:#131015;padding:calc(var(--cu)*2) calc(var(--cu)*5);border:calc(var(--cu)*1) solid #1fe07a}';

  function el(tag, cls, parent, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; }
  function listen(target, type, fn, opt) { target.addEventListener(type, fn, opt); L.ls.push([target, type, fn, opt]); }

  function layout() {
    if (!L) return;
    var r = L.root.getBoundingClientRect(), w = r.width || window.innerWidth, h = r.height || window.innerHeight;
    if (L.full) {
      var s = Math.min(w / W, h / H); L.cv.style.width = Math.round(W * s) + 'px'; L.cv.style.height = Math.round(H * s) + 'px';
      L.root.style.setProperty('--cu', (s * 2) + 'px');
    } else L.root.style.setProperty('--cu', (h / GH) + 'px');
  }

  // congelar el mundo del nivel mientras corre: ACH.br.freeze (nivel.js) o sus alias; no se descongela lo que ya estaba congelado al llegar
  function freezeFn() {
    var cands = [ACH.br, ACH.cv, ACH.mira], i;
    for (i = 0; i < cands.length; i++) if (cands[i] && typeof cands[i].freeze === 'function') return cands[i];
    return null;
  }
  var FZ_OWN = false;
  function wasFrozen() {
    try { var m = freezeFn(); if (m && typeof m.frozen === 'function') return !!m.frozen(); } catch (e) { /* nada */ }
    var G = ACH.G; return !!(G && G.state === 'cine');
  }
  function freezeGame(on) {
    try {
      var m = freezeFn();
      if (m) { m.freeze(!!on); return; }
      var G = ACH.G; if (!G) return;   // sin ACH.br.freeze: el mismo mecanismo de los demás niveles (G.state = 'cine')
      if (on) { if (G.state === 'playing') { G.state = 'cine'; FZ_OWN = true; try { ACH.hud.setState('cine'); } catch (e1) { /* nada */ } } }
      else if (FZ_OWN) { FZ_OWN = false; if (G.state === 'cine') { G.state = 'playing'; try { ACH.hud.setState('playing'); } catch (e2) { /* nada */ } } try { ACH.input.reset(); } catch (e3) { /* nada */ } }
    } catch (e) { warn('freeze', e); }
  }

  function curT() {
    if (L.frozen) return L.ft;
    return ((L.paused ? L.pAt : performance.now()) - L.t0) / 1000 + L.toff;
  }
  function setPause(on) {
    if (!L || L.mode !== 'montage' || L.frozen || L.ending || !!L.paused === !!on) return;
    L.paused = !!on;
    if (on) L.pAt = performance.now(); else L.t0 += performance.now() - L.pAt;
    if (L.pz) L.pz.classList.toggle('on', !!on);
    try { var c = ACH.audio && ACH.audio.ctx || AU_OWN; if (c) { if (on && typeof c.suspend === 'function') c.suspend(); else if (!on && typeof c.resume === 'function') c.resume(); } } catch (e) { /* nada */ }
  }
  function onVis() { if (L && document.hidden) setPause(true); }

  function frame() {
    if (!L) return;
    L.raf = requestAnimationFrame(frame);
    var t = curT();
    if (L.mode === 'montage' && t >= T.end) { startDialog(); }
    try { renderAll(t); } catch (e) { if (!L.bad) { L.bad = 1; warn('render', e); } }
    L.skip.classList.toggle('on', L.skippable && L.mode === 'montage' && t > 1.2 && t < T.end - .6 && !L.paused);
    if (L.ending) { L.fade = Math.min(1, (performance.now() - L.endT0) / 700); if (L.fade >= 1) finish(); }
  }

  function startDialog() {
    if (!L || L.mode !== 'montage') return;
    L.mode = 'dialogo'; markSeen();
    L.skip.classList.remove('on');
    if (L.opts.dialogo === false) return;
    var D = ACH.dialogo, withP = false;
    try { withP = installPortrait(); } catch (e) { withP = false; }
    if (D && typeof D.play === 'function') {
      try { D.play(lines(withP), { id: 'barranco.final', onDone: function () { beginEnd(); } }); return; } catch (e) { warn('dialogo.play', e); }
    }
    setTimeout(beginEnd, 1500);   // sin motor de diálogo: pausa corta y sigue
  }
  function beginEnd() { if (!L || L.ending) return; L.ending = true; L.endT0 = performance.now(); try { Aud.fadeOut(1.0); } catch (e) { /* nada */ } }

  function skipMontage() {
    if (!L || L.mode !== 'montage' || !L.skippable || L.paused) return;
    L.t0 = performance.now(); L.toff = T.end;   // salta al último plano (ya con diálogo)
    try { Aud.stop(0.15); Aud.start(T.s4 + 1.5); } catch (e) { /* nada */ }
  }

  function onKey(e) {
    if (!L) return;
    var c = e.code || e.key;
    if (L.mode === 'montage') {
      if (c === 'Escape' || c === 'KeyP') {
        e.preventDefault(); e.stopImmediatePropagation();
        if (!e.repeat) setPause(!L.paused);
      } else if (c === 'Enter' || c === 'NumpadEnter') {
        e.preventDefault(); e.stopImmediatePropagation();
        if (!e.repeat) { if (L.paused) setPause(false); else skipMontage(); }
      } else if (c === 'Space' || c === 'Tab') { e.preventDefault(); e.stopImmediatePropagation(); }
    }
  }

  function diario() {
    try { var O = ACH.objetivo; if (O && typeof O.diario === 'function') O.diario(CURA[0], CURA[1], CURA[2]); } catch (e) { warn('objetivo.diario', e); }
  }
  function finish() {
    var cb = L && L.opts && L.opts.onEnd; var go = L && !L.stopped;
    teardown(false);
    if (go) { diario(); markSeen(); if (typeof cb === 'function') { try { cb(); } catch (e) { warn('onEnd', e); } } }
  }

  function teardown(hard) {
    if (!L) return;
    var I = L; L = null;
    if (I.paused) { try { var c0 = ACH.audio && ACH.audio.ctx || AU_OWN; if (c0 && typeof c0.resume === 'function') c0.resume(); } catch (e) { /* nada */ } }
    if (I.raf) cancelAnimationFrame(I.raf);
    I.ls.forEach(function (x) { x[0].removeEventListener(x[1], x[2], x[3]); });
    try { Aud.stop(hard ? .05 : .5); } catch (e) { /* nada */ }
    try { if (ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active() && hard) ACH.dialogo.close(); } catch (e) { /* nada */ }
    if (I.root && I.root.parentNode) I.root.parentNode.removeChild(I.root);
    if (!I.opts.keepFrozen && !I.preFrozen) freezeGame(false);
    G = null;
    if (!I.opts.keepArt) ART = null;   // libera los lienzos horneados (se rehornean en ~0,3 s si se vuelve a ver)
  }

  function injectCss() {
    if (document.getElementById('brf-css')) return;
    var s = document.createElement('style'); s.id = 'brf-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s);
  }

  function play(opts) {
    opts = opts || {};
    if (L) { teardown(true); }
    injectCss();
    try { installPortrait(); } catch (e0) { /* nada */ }
    if (!ART) { try { ART = bakeAll(); } catch (e) { ART = null; warn('no pude hornear el arte', e); return false; } }
    var stage = document.getElementById('stage'), parent = stage || document.body;
    var root = el('div', 'brf-root' + (stage ? '' : ' full'), null);
    root.setAttribute('data-ui', '');
    root.innerHTML = '<canvas class="brf-cv" width="960" height="540"></canvas><div class="brf-lab"><b>BARRANCO, DE NOCHE</b><i>Peña La Última Jarana</i></div><div class="brf-skip">ENTER: SALTAR · ESC / P: PAUSA</div><div class="brf-pausa"><b>PAUSA</b><i>ESC / P PARA SEGUIR</i></div>';
    parent.appendChild(root);
    var cv = root.querySelector('canvas');
    L = { opts: opts, root: root, cv: cv, g: ctx2(cv), lab: root.querySelector('.brf-lab'), skip: root.querySelector('.brf-skip'), pz: root.querySelector('.brf-pausa'), paused: false, pAt: 0, ls: [], mode: 'montage', full: !stage,
      t0: performance.now(), toff: +opts.t || 0, frozen: !!opts.freeze, ft: +opts.t || 0, fade: 0, ending: false, raf: 0, stopped: false, preFrozen: wasFrozen(), fln: opts.line != null ? +opts.line : null };
    L.skippable = opts.skippable != null ? !!opts.skippable : seen();
    listen(window, 'keydown', onKey, true);
    listen(window, 'resize', layout);
    listen(root, 'pointerdown', function (e) { if (L.mode !== 'montage') return; if (L.paused) { e.preventDefault(); setPause(false); } else if (L.skippable) { e.preventDefault(); skipMontage(); } });
    listen(document, 'visibilitychange', onVis);
    listen(root, 'contextmenu', function (e) { e.preventDefault(); });
    layout();
    freezeGame(true);
    if (!L.frozen) { try { Aud.start(L.toff); } catch (e2) { warn('audio', e2); } }
    if (L.frozen && L.ft >= T.end) { L.mode = 'montage'; }
    L.raf = requestAnimationFrame(frame);
    return true;
  }
  function stop() { if (L) { L.stopped = true; teardown(true); } }

  ACH.br.final = {
    play: play, stop: stop, isOn: function () { return !!L; },
    debug: {
      T: T, lines: lines, cura: CURA,
      render: function (t, ln) { if (L) { L.frozen = true; L.ft = t; if (ln != null) L.fln = ln; } },
      pause: function (on) { setPause(on === undefined ? !(L && L.paused) : !!on); return !!(L && L.paused); },
      state: function () { return L ? { mode: L.mode, paused: L.paused, t: curT(), skippable: L.skippable, ms: ART && ART.ms, music: AU ? (AU.ext ? 'ACH.audio.br' : 'propia') : 'ninguna' } : null; },
      resetSeen: function () { seenMem = false; try { window.localStorage.removeItem(KEY); } catch (e) { /* nada */ } },
      art: function () { return ART; },
      cost: function (t, n) { if (!L) return -1; var a = performance.now(); for (var i = 0; i < (n || 20); i++) renderAll(t + i * .016); return (performance.now() - a) / (n || 20); },
      bake: function () { if (!ART) ART = bakeAll(); return ART.ms; },
      portrait: function (cara, boca, ojos) { return bakeJarPortrait(cara || 'habla', boca || 0, ojos || 'abiertos'); },
      walk: function (f, sc) { return sWalk(f || 0, sc || SW); },
      pig: function (p, sc) { return sPig(p || 'perch', sc || SW); },
      zp: function (v, l, sc) { return sZP(v || 0, l == null ? 2 : l, sc || .6); },
      zb: function (v, l, sc) { return sZB(v || 0, l == null ? 2 : l, sc || .85); },
      jar: function (pose, lean, sc) { return sJar(pose || 'bow', lean || 0, 0, '', sc || SW); },
      alex: function (strum, lean, head, expr, sc) { return sAlex(strum || 0, lean || 0, head || 'jar', expr || 'smile', 0, sc || SW); }
    }
  };
})();
