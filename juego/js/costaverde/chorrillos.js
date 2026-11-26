/* ACHORADO — js/costaverde/chorrillos.js → ACH.cv.chorrillos = ACH.cv.aterrizaje   (fase C5, ver COSTAVERDE.md §7 y ../diseno/cv-C5.md; BARRANCO.md §7.1 / ../diseno/br-b4.md)
   Cinemática del aterrizaje heroico de Alexander en la Playa Barranco, de canto rodado (fin del nivel «Costa Verde»; antes aterrizaba en Chorrillos).
   Lugar: el acantilado de Barranco con casonas, la quebrada de la Bajada de Baños, el Puente de los Suspiros y La Ermita, el Circuito de Playas con su puente peatonal, restaurantes de playa y el Morro Solar con su cruz al fondo, al atardecer.
     ACH.cv.chorrillos.play({onEnd, t, freeze, dialogo, skippable})   montaje de ~18,6 s (4 planos) + diálogo con retrato → onEnd()
     ACH.cv.chorrillos.stop()   corta todo y limpia · isOn() · debug{render(t), state(), resetSeen(), T}
   Lienzo propio de 960×540 sobre #stage (o la ventana si no hay #stage). El arte se dibuja en una grilla de 480×270 y sube ×2 sin suavizado
   (pixel art crisp); todo se hornea UNA vez al primer play() (sin getImageData, shadowBlur, filter ni degradados por cuadro). render(t) solo
   depende de t (por eso ?t=&freeze=1 sirven para capturas). Música: ACH.audio.cv.play('cv.heroe') si existe; si no, un tema propio (Web Audio).
   Primera vez: sin saltar. Después ENTER salta el montaje (el diálogo sigue). Guarda 'achorado.cine.aterrizaje.v2' en localStorage. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  ACH.cv = ACH.cv || {};

  var W = 960, H = 540, GW = 480, GH = 270, TAU = Math.PI * 2;
  var KEY = 'achorado.cine.aterrizaje.v2';   // BARRANCO.md §7.1: el aterrizaje nuevo (en Barranco) no se salta la primera vez
  /* línea de tiempo (s): 4 planos + sostén del último mientras habla el diálogo */
  var T = { s1: 0, s2: 4.0, s3: 8.75, s4: 14.0, end: 18.6, flash: 0.14, touch: 1.25 };   // 120 bpm: el aterrizaje cae en el compás 6 (10,0 s) y el plano heroico en el 8 (14,0 s)

  /* ---------------------------------------------------------------- utilidades */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ramp(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  function eio(u) { return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
  function eout(u) { return 1 - (1 - u) * (1 - u); }
  function warn(m, e) { try { console.warn('[chorrillos] ' + m, e || ''); } catch (x) { /* nada */ } }
  function h2(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
  function vn(x, y, s) {
    var xi = Math.floor(x / s), yi = Math.floor(y / s), xf = x / s - xi, yf = y / s - yi;
    var a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
    xf = xf * xf * (3 - 2 * xf); yf = yf * yf * (3 - 2 * yf);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  }
  function RNG(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var BAY = []; (function () { var m = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]; for (var i = 0; i < 16; i++) BAY.push((m[i] + .5) / 16); })();

  function mk(w, h) {
    var c = (ACH.px && typeof ACH.px.canvas === 'function') ? ACH.px.canvas(w, h) : document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c;
  }
  function ctx2(c) { var g = c.getContext('2d'); g.imageSmoothingEnabled = false; return g; }
  function layer(w, h, fn) { var c = mk(w, h), g = ctx2(c); fn(g, w, h); return c; }

  /* ---------------------------------------------------------------- rasterizador sin antialias (polígonos por barrido) */
  // col: string o function(x, y) → string. pts en coordenadas de grilla (decimales ok).
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
  // cápsula ahusada entre dos puntos
  function cap(g, x0, y0, x1, y1, w0, w1, col) {
    var dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    poly(g, [[x0 + nx * w0 / 2, y0 + ny * w0 / 2], [x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2], [x0 - nx * w0 / 2, y0 - ny * w0 / 2]], col);
    ell(g, x0, y0, w0 / 2, w0 / 2, col); ell(g, x1, y1, w1 / 2, w1 / 2, col);
  }
  function px1(g, x, y, c, w, h) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w || 1, h || 1); }
  function line(g, x0, y0, x1, y1, c, w) {   // Bresenham de 1 px (o w px)
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx - dy, ww = w || 1;
    g.fillStyle = c;
    for (var k = 0; k < 4000; k++) {
      g.fillRect(x0, y0, ww, ww);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * e; if (e2 > -dy) { e -= dy; x0 += sx; } if (e2 < dx) { e += dx; y0 += sy; }
    }
  }
  // degradado vertical tramado (Bayer 4×4) entre una lista de colores
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
  // contorno de 1 px (4 vecinos) de un lienzo con alfa: devuelve un lienzo 2 px más grande
  function outlined(src, col, pad) {
    pad = pad == null ? 1 : pad;
    var w = src.width + pad * 2, h = src.height + pad * 2, c = mk(w, h), g = ctx2(c);
    var sil = mk(src.width, src.height), sg = ctx2(sil);
    sg.drawImage(src, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = col; sg.fillRect(0, 0, src.width, src.height);
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) if (dx || dy) g.drawImage(sil, pad + dx, pad + dy);
    g.drawImage(src, pad, pad);
    return c;
  }
  function shade(hex, f) {
    var r = parseInt(hex.substr(1, 2), 16), gg = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
    function q(v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }
    return '#' + q(r * f) + q(gg * f) + q(b * f);
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
  var PINK = { d: '#b01760', m: '#ff2e88', l: '#ff6fae', hl: '#ffa6cf' }, YEL = { d: '#c9a800', m: '#ffe500', l: '#fff06a', hl: '#fffab0' };
  var INK = '#1a1418', OUTL = '#2a1a16';
  var SKY = ['#5b5478', '#6a5d80', '#7a6585', '#9a7488', '#c0838a', '#e29a84', '#f2b07c', '#f8c486', '#fbd79a', '#fde6b8'];   // atardecer de Barranco: panza de burro violeta que se enciende hacia el mar
  var SEA = ['#b79a8e', '#8a8f92', '#5f8794', '#4a7788', '#3E6A7E', '#33596e'];   // mar gris verdoso (#3E6A7E cerca) con el reflejo rosado del cielo
  var SAND = { l: '#cdbba0', m: '#b9a58a', d: '#8C7B64', dd: '#5E564C', w: '#a38f76' };   // (nombre heredado) = canto rodado y polvo de piedra
  var FOAM = '#E9E4D8';

  /* ================================================================ ARTE: cielo, Morro Solar, bahía ================================================================ */
  var ART = null;   // todo lo horneado vive aquí (se libera en stop())
  var BREAK = { x: 196, y: 50 };   // el hueco de la panza de burro por donde baja el único rayo

  function bakeSky() {
    return layer(640, 170, function (g, w, h) {
      vgrad(g, 0, 0, w, h, [SKY[0], SKY[1], SKY[2], SKY[4], SKY[6], SKY[8], SKY[9]]);
      var R = RNG(21), i;
      // nubes altas y claras (media altura)
      for (i = 0; i < 26; i++) ell(g, R() * w, 70 + R() * 50, 34 + R() * 60, 5 + R() * 9, i % 3 ? SKY[5] : SKY[6]);
      // la panza de burro: una sola masa gris, de abajo plana y con bultos
      var base = 62, mass = [[-10, -10], [w + 10, -10], [w + 10, base]];
      for (i = w; i >= -10; i -= 7) mass.push([i, base + 6 * Math.sin(i * .045) + 5 * Math.sin(i * .13 + 1) + R() * 4]);
      poly(g, mass, SKY[1]);
      for (i = 0; i < 70; i++) { var yy = 6 + R() * 48; ell(g, R() * w, yy, 20 + R() * 48, 6 + R() * 12, yy < 30 ? SKY[2] : SKY[1]); }
      // vientre oscuro y vetas
      for (i = -10; i < w + 10; i += 5) { var by = base + 6 * Math.sin(i * .045) + 5 * Math.sin(i * .13 + 1); poly(g, [[i, by - 12], [i + 6, by - 12], [i + 6, by + 3], [i, by + 3]], i % 10 ? SKY[0] : '#4e4868'); }
      for (i = 0; i < 40; i++) { var ly = 16 + R() * 40; poly(g, [[R() * w, ly], [R() * w, ly + 1], [R() * w + 20, ly + 2], [R() * w, ly + 2]], '#5a5272'); }
      // el hueco: borde de luz dorada, núcleo casi blanco
      poly(g, ellPts(BREAK.x, BREAK.y + 4, 80, 38, 0, 70), function (x, y) { var d = Math.hypot((x - BREAK.x) / 80, (y - BREAK.y - 4) / 38) * (1 + (vn(x, y, 9) - .5) * .5); return d < .9 + (BAY[(y & 3) * 4 + (x & 3)] - .5) * .16 ? '#b98a84' : null; });
      poly(g, ellPts(BREAK.x, BREAK.y + 2, 68, 30, 0, 70), function (x, y) {
        var d = Math.hypot((x - BREAK.x) / 68, (y - BREAK.y - 2) / 30) * (1 + (vn(x, y, 8) - .5) * .5) + (BAY[(y & 3) * 4 + (x & 3)] - .5) * .2;
        return d < .35 ? '#fff6dc' : d < .6 ? '#fde2a8' : d < .82 ? '#f4c48c' : '#d9a07e';
      });
      // jirones de nube cruzando el hueco
      ell(g, BREAK.x - 22, BREAK.y + 12, 26, 3, '#d9a890'); ell(g, BREAK.x + 30, BREAK.y + 18, 20, 2, '#cf9a88');
      // bruma baja sobre el horizonte
      vgrad(g, 0, h - 26, w, 26, [SKY[7], SKY[8], SKY[9]]);
    });
  }

  function bakeRay() {   // el único rayo del juego: un haz tramado (alfa fija) que baja hacia la derecha
    return layer(GW + 60, GH, function (g) {
      var x0 = BREAK.x - 46, x1 = BREAK.x + 38, ya = BREAK.y + 18, yb = 252, dx = 118;
      poly(g, [[x0, ya], [x1, ya], [x1 + dx, yb], [x0 + dx, yb]], function (x, y) {
        var f = (y - ya) / (yb - ya), cx = lerp(x0, x1, .5) + dx * f, half = lerp(42, 62, f) * .5, d = Math.abs(x - cx) / half;
        var dens = (1 - d * d) * (1 - f * .3) * 1.25;
        return BAY[(y & 3) * 4 + (x & 3)] < dens ? (d < .45 ? '#ffe9b0' : '#f7b267') : null;
      });
    });
  }

  function bakeMorro(sc) {
    var Wm = 520, Hm = 200, P = [[0, 200], [0, 164], [16, 152], [38, 134], [60, 114], [80, 94], [98, 74], [114, 58], [130, 46], [148, 39], [166, 34], [184, 37], [198, 45], [210, 52], [224, 53], [240, 59], [256, 67], [272, 74], [300, 82], [330, 94], [362, 114], [392, 138], [430, 164], [470, 184], [520, 200]];
    var c = layer(Math.ceil(Wm * sc), Math.ceil(Hm * sc), function (g) {
      var ramp5 = ['#5a566e', '#6c6882', '#7F7F96', '#9a8fa0', '#b49a9e'], gr = ['#6f7590', '#7d8398'];   // silueta lejana #7F7F96 con la ladera iluminada más clara
      var pts = P.map(function (p) { return [p[0] * sc, p[1] * sc]; });
      poly(g, pts, function (X, Y) {
        var x = X / sc, y = Y / sc, n = vn(x, y, 6) * .6 + vn(x, y, 2) * .4;
        var lit = .72 - x / Wm * .22 + (vn(x * .4, y * .3, 9) - .5) * .3;   // luz desde la izquierda
        var cliff = x < 110 && y > 96;
        var v = lit * .72 + n * .46 - (y - 40) / 360 * .1;
        if (cliff) {
          v -= .12 + .12 * (vn(x * 4, y * .25, 3) > .62 ? 1 : 0);   // surcos verticales de erosión
          if (((y + Math.floor(vn(x, y, 22) * 5)) % 9) === 0) v -= .14;   // estratos
          if (x < 40) v += .08 * (1 - x / 40);
        }
        var idx = clamp(Math.floor(v * 5 + (BAY[(Y & 3) * 4 + (X & 3)] - .5) * .9), 0, 4);
        if (y > 96 && !cliff && vn(x, y, 7) > .64 && BAY[(Y & 3) * 4 + (X & 3)] < .7) return gr[(x + y) & 1];
        if (y > 130 && x > 120 && vn(x + 90, y, 9) > .58 && BAY[(Y & 3) * 4 + (X & 3)] < .5) return gr[1];
        return ramp5[idx];
      });
      function S(v) { return v * sc; }
      // sendero en zigzag
      for (var i = 0; i < 5; i++) line(g, S(150 + i * 4), S(92 + i * 14), S(190 - i * 3), S(98 + i * 14), '#cdb7a8');
      // antenas con luz roja
      [[128, 47], [134, 45], [214, 52]].forEach(function (a, k) { line(g, S(a[0]), S(a[1]), S(a[0]), S(a[1] - 15 - k * 2), '#2e2a26'); px1(g, S(a[0]), S(a[1] - 16 - k * 2), '#ff3b2e', Math.max(1, sc), Math.max(1, sc)); });
      // la Cruz del Morro, en la cumbre, con sus lucecitas
      var cx = S(166), cy = S(34), L = Math.max(10, S(20));
      g.fillStyle = '#f2f0e8'; g.fillRect(Math.round(cx - 1), Math.round(cy - L), Math.max(2, Math.round(sc * 2)), L); g.fillRect(Math.round(cx - L * .34), Math.round(cy - L * .78), Math.round(L * .72), Math.max(2, Math.round(sc * 2)));
      px1(g, cx, cy - L, '#ff2e88'); px1(g, cx - L * .34, cy - L * .74, '#ffe500'); px1(g, cx + L * .34, cy - L * .74, '#1fe07a');
      // el Cristo del Pacífico, blanco, en la loma vecina (brazos abiertos)
      var kx = S(226), ky = S(53), q = Math.max(.7, sc * 1.25);
      g.fillStyle = '#c9c5b8'; g.fillRect(Math.round(kx - 3 * q), Math.round(ky - 6 * q), Math.round(6 * q), Math.round(6 * q));   // base
      poly(g, [[kx - 3 * q, ky - 6 * q], [kx + 3 * q, ky - 6 * q], [kx + 2 * q, ky - 17 * q], [kx - 2 * q, ky - 17 * q]], '#f4f2ea');   // túnica
      poly(g, [[kx - 11 * q, ky - 17 * q], [kx + 11 * q, ky - 17 * q], [kx + 11 * q, ky - 15 * q], [kx - 11 * q, ky - 15 * q]], '#f4f2ea');   // brazos
      ell(g, kx, ky - 20 * q, 2 * q, 2.4 * q, '#f4f2ea');
      g.fillStyle = '#b9b4a6'; g.fillRect(Math.round(kx + 1 * q), Math.round(ky - 16 * q), Math.max(1, Math.round(q)), Math.round(10 * q));   // sombra de la túnica
    });
    return c;
  }

  /* ================================================================ ARTE: Barranco (acantilado, casonas, Bajada de Baños, Puente de los Suspiros, La Ermita, playa de canto rodado) ================================================================
     Colores de ../diseno/investigacion-barranco.md (inferidos, §1.2, §2.1–2.7): casonas pastel, madera rojiza del Puente, Ermita amarilla, guijarro #B9A58A/#8C7B64/#5E564C, concreto #A8A196. */
  var EARTH = ['#6b4a3a', '#86593e', '#a36d47', '#be8553', '#d29c66'];   // la cara del acantilado mira al oeste: la luz del atardecer la dora
  var CAS = ['#F0E4C8', '#D9A441', '#6f9a78', '#5E7FA3', '#C46448', '#D98C8C', '#EFEAD8', '#E8B7A0', '#A9D0C4', '#F2D480', '#9DB7D6', '#c9786a'];
  var BUGA = ['#C2185B', '#E0457B', '#7B2D8E', '#f06aa0'];
  var LEAF = ['#24492f', '#2F5D3A', '#46793f', '#5E8F4E'];
  var WOOD = { d: '#3a2418', m: '#5B3A29', l: '#8a5b3a' };
  var BRG = { d: '#4F2A1E', m: '#8A4B32', l: '#B9714A' };   // Puente de los Suspiros: madera rojiza
  var WARM = '#FFC766', WARML = '#ffe3a6';
  var STN = ['#5E564C', '#756a5a', '#8C7B64', '#A08e74', '#B9A58A', '#cdbba0'];   // canto rodado
  var RESTOS = [
    { wall: '#EFE4C8', roof: '#8A4B32', aw: ['#C8553D', '#F2E6D0'], sign: '#26405f', um: '#E0457B' },
    { wall: '#A9D0C4', roof: '#3a4a5a', aw: ['#2f5f86', '#F2E6D0'], sign: '#5b2a3a', um: '#F2D480' },
    { wall: '#F2D480', roof: '#8A4B32', aw: ['#2F5D3A', '#F2E6D0'], sign: '#2a2a30', um: '#C8553D' },
    { wall: '#D98C8C', roof: '#5E3A4A', aw: ['#F2E6D0', '#5E7FA3'], sign: '#2a3a4a', um: '#6f9a78' }
  ];

  function fr(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }

  // casona republicana: cuerpo pastel, zócalo, cornisa, techo (teja, calamina o parapeto), balcón de cajón, ventanas (algunas ya encendidas) y portón
  function casona(g, x, by, w, h, cc, R, S, litP) {
    x = Math.round(x); by = Math.round(by); w = Math.round(w); h = Math.round(h);
    var top = by - h, d = shade(cc, .78), dd = shade(cc, .6), lt = shade(cc, 1.14), sw = Math.max(1, Math.round(1.5 * S)), i, j;
    fr(g, cc, x, top, w, h); fr(g, d, x + w - sw, top, sw, h);
    fr(g, dd, x, by - Math.max(2, Math.round(2.2 * S)), w, Math.max(2, Math.round(2.2 * S)));   // zócalo
    fr(g, lt, x - 1, top - 1, w + 2, Math.max(1, Math.round(S)));                              // cornisa
    var rf = R();
    if (rf < .45) { poly(g, [[x - 1, top - 1], [x + w / 2, top - 1 - Math.max(2, Math.round(3.5 * S))], [x + w + 1, top - 1]], '#B5523B'); fr(g, '#8e3c2c', x + w / 2, top - 1 - Math.max(2, Math.round(3 * S)), Math.max(1, Math.round(S)), Math.max(2, Math.round(3 * S))); }
    else if (rf < .75) fr(g, '#8d8f98', x - 1, top - Math.max(2, Math.round(2 * S)), w + 2, Math.max(1, Math.round(S)));
    else { fr(g, dd, x, top - Math.max(2, Math.round(2.4 * S)), w, Math.max(2, Math.round(2 * S))); fr(g, lt, x, top - Math.max(2, Math.round(2.4 * S)), w, 1); }
    var ww = Math.max(2, Math.round(2.2 * S)), wh = Math.max(3, Math.round(3.4 * S)), gap = Math.max(2, Math.round(2.8 * S));
    var n = Math.max(1, Math.floor((w - gap) / (ww + gap))), x0 = x + Math.round((w - (n * (ww + gap) - gap)) / 2), rows = h > 17 * S ? 2 : 1;
    for (j = 0; j < rows; j++) {
      var wy = top + Math.round((j === 0 ? 2.2 : h * .5 + .8) * S);
      for (i = 0; i < n; i++) {
        var wx = x0 + i * (ww + gap), lit = R() < litP;
        if (rows === 2 && j === 1 && n % 2 === 1 && i === (n - 1) / 2) continue;   // aquí va el portón
        fr(g, lit ? WARM : '#33242c', wx, wy, ww, wh);
        fr(g, lit ? WARML : shade(cc, 1.05), wx, wy, ww, 1);
      }
    }
    if (rows === 2 && R() < .75) {   // balcón de cajón de madera
      var bw = Math.max(5, Math.round(w * .55)), bx = x + Math.round((w - bw) / 2), by2 = top + Math.round(h * .5 - 1.4 * S);
      fr(g, WOOD.m, bx, by2, bw, Math.max(2, Math.round(2.6 * S))); fr(g, WOOD.l, bx, by2, bw, 1); fr(g, WOOD.d, bx, by2 + Math.max(2, Math.round(2.6 * S)) - 1, bw, 1);
      for (i = bx + 1; i < bx + bw - 1; i += 2) fr(g, WOOD.d, i, by2 - Math.max(1, Math.round(1.4 * S)), 1, Math.max(1, Math.round(1.4 * S)));
    }
    fr(g, '#4a2f22', x + Math.round(w / 2 - 1.4 * S), by - Math.max(4, Math.round(5 * S)), Math.max(3, Math.round(2.8 * S)), Math.max(4, Math.round(5 * S)));
  }
  function tree(g, x, by, r, R) {   // ficus
    fr(g, WOOD.m, x, by - r * .5, Math.max(1, r * .25), r * .5);
    ell(g, x, by - r * 1.15, r, r * .85, LEAF[1]); ell(g, x - r * .3, by - r * 1.4, r * .6, r * .5, LEAF[3]); ell(g, x + r * .35, by - r * .75, r * .55, r * .4, LEAF[0]);
    for (var i = 0; i < r; i++) px1(g, x - r + R() * r * 2, by - r * 2 + R() * r * 1.4, LEAF[2 + (i & 1)]);
  }
  function buga(g, x, y, w, drop, R) {   // buganvilia cayendo por el muro
    var i, n = Math.round(w * drop * .5);
    ell(g, x, y, w / 2, Math.max(2, drop * .35), LEAF[1]);
    for (i = 0; i < n; i++) { var bx = x - w / 2 + R() * w, by = y - drop * .25 + R() * drop; px1(g, bx, by, BUGA[(R() * 4) | 0], 1 + (R() < .35 ? 1 : 0), 1 + (R() < .3 ? 1 : 0)); }
    for (i = 0; i < w / 3; i++) { var dx = x - w / 2 + R() * w; line(g, dx, y + 1, dx, y + drop * (.5 + R() * .7), R() < .5 ? BUGA[0] : LEAF[2]); }
  }
  function farol(g, x, by, h) {   // farol de fierro: poste, brazo y luz cálida con halo
    x = Math.round(x); by = Math.round(by); h = Math.round(h);
    g.globalAlpha = .32; fr(g, '#ffd98a', x - 2, by - h - 3, 5, 5); g.globalAlpha = 1;
    fr(g, '#2B2B30', x, by - h, 1, h); fr(g, '#2B2B30', x - 1, by - h - 2, 3, 1); fr(g, WARM, x, by - h - 1, 1, 1);
  }
  // La Ermita: fachada amarilla, dos torres con agujas, cúpula dañada, andamio de la obra (jun-2026)
  function ermita(g, x, by, S) {
    var w = Math.round(30 * S), h = Math.round(15 * S), Y = '#E8C75A', Yl = '#F4DE8C', Yd = '#C9A23C', Yk = '#9c7a2a', tw = Math.round(7 * S), th = Math.round(25 * S), i;
    x = Math.round(x); by = Math.round(by);
    poly(g, ellPts(x + w / 2, by - h, 6.5 * S, 7 * S, 0, 18), '#7f8fa0'); px1(g, x + w / 2 - 1, by - h - 7 * S - 3 * S, '#f2eee2', 1, Math.round(4 * S)); px1(g, x + w / 2 - S, by - h - 7 * S - 2 * S, '#f2eee2', Math.round(3 * S), 1);   // cúpula y cruz
    fr(g, '#4e5a68', x + w / 2 + 1, by - h - 5 * S, Math.max(2, Math.round(2 * S)), Math.max(2, Math.round(3 * S)));   // hueco en la cúpula
    fr(g, Y, x, by - h, w, h); fr(g, Yd, x + w - Math.round(2 * S), by - h, Math.round(2 * S), h); fr(g, Yk, x, by - 2, w, 2);
    [x - 1, x + w - tw + 1].forEach(function (tx, k) {
      fr(g, Y, tx, by - th, tw, th); fr(g, Yl, tx, by - th, 1, th); fr(g, Yd, tx + tw - 2, by - th, 2, th); fr(g, Yk, tx, by - th - 1, tw, 1);
      poly(g, [[tx - 1, by - th - 1], [tx + tw / 2, by - th - Math.round(8 * S)], [tx + tw + 1, by - th - 1]], '#6e7c8a');
      fr(g, '#3a2e2a', tx + Math.round(tw / 2 - 1), by - th + Math.round(3 * S), Math.max(2, Math.round(2 * S)), Math.max(3, Math.round(4 * S)));
      fr(g, '#3a2e2a', tx + Math.round(tw / 2 - 1), by - th + Math.round(10 * S), Math.max(2, Math.round(2 * S)), Math.max(3, Math.round(3 * S)));
    });
    fr(g, '#2e2018', x + Math.round(w / 2 - 2 * S), by - Math.round(7 * S), Math.max(3, Math.round(4 * S)), Math.round(7 * S)); fr(g, '#4a3a30', x + Math.round(w / 2 - 2 * S), by - Math.round(7 * S) - 1, Math.max(3, Math.round(4 * S)), 1);   // portón enrejado
    for (i = 0; i < 2; i++) fr(g, '#3a2e2a', x + Math.round((i ? 22 : 6) * S), by - Math.round(10 * S), Math.max(2, Math.round(2 * S)), Math.max(3, Math.round(4 * S)));
    // andamio: tubos grises y tablones de la obra
    var sx = x + w - Math.round(3 * S), sh = Math.round(18 * S);
    for (i = 0; i < 3; i++) { line(g, sx + i * Math.round(4 * S), by, sx + i * Math.round(4 * S), by - sh, '#8d8f98'); }
    for (i = 1; i < 4; i++) line(g, sx, by - i * Math.round(4.5 * S), sx + Math.round(8 * S), by - i * Math.round(4.5 * S), '#6e5a3a');
  }
  // Puente de los Suspiros, de costado: tablero rojizo, cercha bajo el piso, pasamanos con barrotes y faroles
  function puente(g, x0, x1, y, S, R) {
    x0 = Math.round(x0); x1 = Math.round(x1); y = Math.round(y);
    var th = Math.max(2, Math.round(2 * S)), i, st = Math.max(3, Math.round(5 * S)), rh = Math.max(3, Math.round(4 * S));
    for (i = x0; i < x1 - st; i += st) { line(g, i, y + th, i + st / 2, y + th + Math.round(3.4 * S), BRG.d); line(g, i + st / 2, y + th + Math.round(3.4 * S), i + st, y + th, BRG.d); }
    fr(g, BRG.m, x0, y, x1 - x0, th); fr(g, BRG.l, x0, y, x1 - x0, 1); fr(g, BRG.d, x0, y + th - 1, x1 - x0, 1);
    for (i = x0; i <= x1 - 1; i += Math.max(2, Math.round(2.4 * S))) fr(g, BRG.m, i, y - rh, 1, rh);
    fr(g, BRG.l, x0, y - rh, x1 - x0, 1);
    var lx = [x0 + 1, Math.round((x0 + x1) / 2), x1 - 2];
    lx.forEach(function (q) { farol(g, q, y - rh, Math.max(3, Math.round(4 * S))); });
  }

  // El acantilado completo de Barranco: cara de tierra dorada, matorral, quebrada verde de la Bajada con su escalera de ladrillo, Ermita + Puente, casonas, buganvilias, ranchos-restaurante en la ladera y faroles.
  // W×H, S = escala del detalle (1 = lejano, 1.7 = cercano), gxf = dónde cae la quebrada (fracción del ancho), taper = el acantilado se acaba hacia el sur (derecha), road = carretera al pie.
  function drawCliff(g, W, H, S, seed, gxf, taper, road) {
    var x;
    var R = RNG(seed), i, k, topY = H * (S > 1.2 ? .34 : .27), baseY = road ? H - Math.round(13 * S) : H - 1;
    function edge(x) {
      var e = topY + 3 * S * Math.sin(x * .031 / S + 1) + 2 * S * Math.sin(x * .09 / S) + (vn(x, 3, 12 * S) - .5) * 4 * S;
      if (taper) { var tf = clamp((x / W - .8) / .2, 0, 1); e += tf * tf * (H * .6 - topY); }
      return e;
    }
    var gxc = W * gxf, gsl = .55;
    function gc(y) { return gxc - (y - topY) * gsl; }
    function gw(y) { return (24 - 9 * clamp((y - topY) / (baseY - topY), 0, 1)) * S * .5; }
    var pts = [[0, edge(0)]]; for (i = 0; i <= W; i += 4) pts.push([i, edge(i)]); pts.push([W, H], [0, H]);
    poly(g, pts, function (x, y) {
      var ey = edge(x), dd = y - ey, n = vn(x, y, 5 * S) * .55 + vn(x, y, 2 * S) * .45, t = BAY[(y & 3) * 4 + (x & 3)];
      var v = .66 + (n - .5) * .75 - dd / H * .3 - (vn(x * 3.2, y * .18, 3 * S) > .62 ? .17 : 0) - (((y + Math.floor(vn(x, y, 20 * S) * 5)) % Math.round(10 * S)) === 0 ? .1 : 0);
      if (dd < 10 * S && vn(x + 40, y, 6 * S) > .5 && t < .8) return LEAF[((x + y) & 1) ? 1 : 2];
      if (dd > 16 * S && vn(x + 90, y * 2, 8 * S) > .67 && t < .55) return LEAF[1];
      return EARTH[clamp(Math.floor(v * 5 + (t - .5) * .9), 0, 4)];
    });
    // la quebrada verde de la Bajada de Baños (baja en diagonal hacia el mar, a la izquierda) con su escalera de ladrillo
    var gl = [], gr = [];
    for (var y = Math.round(topY - 2 * S); y <= baseY; y += 2) { gl.push([gc(y) - gw(y), y]); gr.push([gc(y) + gw(y), y]); }
    poly(g, gl.concat(gr.reverse()), function (x, y) {
      var n = vn(x, y, 3 * S), t = BAY[(y & 3) * 4 + (x & 3)], side = (x - gc(y)) / gw(y);
      var v = n * .7 + t * .35 - Math.max(0, side) * .12 + (y - topY) / H * .1;
      return v > .72 ? LEAF[3] : v > .5 ? LEAF[2] : v > .3 ? LEAF[1] : LEAF[0];
    });
    for (y = Math.round(topY + 3 * S); y < baseY; y++) {
      var cx = gc(y) + Math.sin(y * .16 / S) * 2 * S, sw = Math.max(3, Math.round(4.5 * S));
      fr(g, (y >> 1) & 1 ? '#A5583F' : '#c47a58', cx - sw / 2, y, sw, 1);
      if ((y & 3) === 0) fr(g, '#6e3a2a', cx - sw / 2, y, sw, 1);
    }
    for (i = 0; i < gw(topY) * 2; i++) { var bgx = gc(topY) - gw(topY) + R() * gw(topY) * 2, bgy = topY + 3 * S + R() * (baseY - topY - 6 * S); if (Math.abs(bgx - gc(bgy)) < gw(bgy) - 1) px1(g, bgx, bgy, BUGA[(R() * 4) | 0], 1, 1); }
    // la Ermita (al oeste del Puente = a la izquierda) y el Puente de los Suspiros sobre la quebrada
    var gtop = gc(topY), gwt = gw(topY), ex1 = gtop - gwt - 6 * S, ex0 = ex1 - 30 * S, bx1 = gtop + gwt + 7 * S;
    ermita(g, ex0, edge(ex0 + 15 * S) + 3 * S, S);
    puente(g, ex1 - 2 * S, bx1, topY + 3.5 * S, S, R);
    fr(g, '#8a8f8a', bx1 - 1, topY + 3.5 * S, Math.max(2, 3 * S), edge(bx1 + 2) - topY - 3.5 * S + 2 * S);   // estribo de piedra
    // casonas a lo largo del borde
    var cx0 = 0, skipA = ex0 - 3 * S, skipB = bx1 + 2 * S;
    while (cx0 < W) {
      var w = Math.round((16 + R() * 18) * S), h = Math.round((12 + R() * 13) * S * (S > 1.2 ? .78 : 1));
      if (cx0 + w > skipA && cx0 < skipB) { cx0 = Math.ceil(skipB) + 1; continue; }
      var e = edge(cx0 + w / 2); if (e > H * .5) { cx0 += w; continue; }
      casona(g, cx0, e + 3 * S, w, h, CAS[(R() * CAS.length) | 0], R, S, .24);
      cx0 += w + Math.round((R() * 3 - 1) * S);
    }
    // ficus, buganvilias y faroles en el borde
    for (i = 0; i < W / (26 * S); i++) { var tx = R() * W; if ((tx > skipA - 6 * S && tx < skipB + 6 * S) || edge(tx) > H * .5) continue; tree(g, tx, edge(tx) + 4 * S, (3.2 + R() * 2.4) * S, R); }
    for (i = 0; i < W / (20 * S); i++) { var bgx2 = R() * W; if (bgx2 > skipA - 4 * S && bgx2 < skipB + 4 * S || edge(bgx2) > H * .5) continue; buga(g, bgx2, edge(bgx2) + 6 * S, (8 + R() * 8) * S, (8 + R() * 10) * S, R); }
    for (x = 20 * S; x < W - 10 * S; x += 46 * S + R() * 12 * S) { if (x > skipA - 4 * S && x < skipB + 4 * S || edge(x) > H * .5) continue; farol(g, x, edge(x) + 3 * S, 7 * S); }
    // ranchos convertidos en restaurantes, colgados de la ladera, con sus focos
    var rp = [.1, .3, .6, .75, .9];
    for (i = 0; i < rp.length; i++) {
      var rx = W * rp[i], ry = edge(rx) + (24 + R() * 10) * S;
      if (ry > baseY - 12 * S || Math.abs(rx - gc(ry)) < 26 * S || (taper && rp[i] > .8)) continue;
      var rw = 22 * S, cfg = RESTOS[i % RESTOS.length];
      for (k = 0; k < 3; k++) fr(g, WOOD.d, rx + 2 * S + k * 8 * S, ry + 2 * S, Math.max(1, S), 7 * S);
      fr(g, WOOD.m, rx, ry, rw, 2 * S); fr(g, WOOD.l, rx, ry, rw, 1);
      fr(g, cfg.wall, rx + 3 * S, ry - 8 * S, 16 * S, 8 * S); fr(g, shade(cfg.wall, .78), rx + 17 * S, ry - 8 * S, 2 * S, 8 * S);
      fr(g, cfg.roof, rx + 2 * S, ry - 10 * S, 18 * S, 2 * S);
      fr(g, WARM, rx + 5 * S, ry - 6 * S, 3 * S, 3 * S); fr(g, WARM, rx + 11 * S, ry - 6 * S, 3 * S, 3 * S);
      for (k = 0; k < 6; k++) px1(g, rx + k * 4 * S, ry - 1 * S, k % 2 ? WARML : '#ff9aa8');
    }
    // al pie: el Circuito de Playas visto desde más cerca (solo el cercano)
    if (road) {
      var y0 = baseY + Math.round(1 * S), y1 = H;
      poly(g, [[0, y0], [W, y0], [W, y1], [0, y1]], function (x, y) { return ((x * 7 + y * 3) & 7) === 0 ? '#43434b' : '#4c4c55'; });
      fr(g, '#A8A196', 0, y0 - 1, W, Math.max(1, Math.round(S))); fr(g, '#E0C050', 0, y0 + Math.round(5 * S), W, 1);
      for (x = 0; x < W; x += Math.round(24 * S)) fr(g, '#4c4c55', x, y0 + Math.round(5 * S), Math.round(12 * S), 1);
      [[.18, '#7b8a6a'], [.52, '#b04a3a'], [.93, '#d8d2c0']].forEach(function (c) { var cx = W * c[0], cy = y0 + Math.round(2 * S); fr(g, c[1], cx, cy, 14 * S, 3.4 * S); fr(g, shade(c[1], 1.2), cx + 3 * S, cy - 2.2 * S, 7 * S, 2.4 * S); fr(g, '#1a1418', cx + 2 * S, cy + 3 * S, 2 * S, 1.4 * S); fr(g, '#1a1418', cx + 10 * S, cy + 3 * S, 2 * S, 1.4 * S); });
    }
  }
  function bakeCliff() { return layer(640, 84, function (g, w, h) { drawCliff(g, w, h, 1, 17, .46, true, false); }); }
  function bakeCliffN() { return layer(480, 132, function (g, w, h) { drawCliff(g, w, h, 1.7, 41, .2, false, true); }); }

  /* ---- restaurante de playa (de frente): deck, toldo a rayas, cartel, ventanal encendido, sombrillas y palmera. Origen: base al centro. ---- */
  function bakeResto(cfg, s) {
    var w = Math.ceil(84 * s), h = Math.ceil(54 * s), ox = Math.round(w / 2), oy = h - 1;
    var c = layer(w, h, function (g) {
      function X(v) { return Math.round(v * s); }
      function Rr(col, x, y, ww, hh) { g.fillStyle = col; g.fillRect(X(x), X(y), Math.max(1, X(ww)), Math.max(1, X(hh))); }
      var i;
      Rr(WOOD.d, 4, 46, 66, 3); Rr('#8a6c4c', 2, 43, 70, 3); Rr('#a88a62', 2, 43, 70, 1);   // deck y vigas
      for (i = 0; i < 8; i++) Rr(WOOD.d, 6 + i * 9, 48, 2, 6);
      Rr(cfg.wall, 8, 20, 54, 23); Rr(shade(cfg.wall, .78), 56, 20, 6, 23); Rr(shade(cfg.wall, 1.12), 8, 20, 54, 1);
      Rr(cfg.roof, 6, 16, 58, 4); Rr(shade(cfg.roof, 1.3), 6, 16, 58, 1);
      for (i = 0; i < 9; i++) Rr('#3A3A40', 8 + i * 6, 12, 1, 4); Rr('#3A3A40', 8, 12, 54, 1);   // baranda de la azotea
      Rr('#2a2a30', 18, 3, 34, 9); Rr(cfg.sign, 19, 4, 32, 7);                                 // cartel (marca genérica)
      for (i = 0; i < 7; i++) { Rr('#f2e6d0', 22 + i * 4, 6, 3, 1); Rr('#f2e6d0', 22 + i * 4, 8, 2, 1); }
      Rr('#2b3a4a', 12, 29, 46, 11); for (i = 0; i < 6; i++) Rr(i % 2 ? WARM : WARML, 13 + i * 7.6, 30, 6, 9);
      for (i = 0; i < 12; i++) { Rr(i % 2 ? cfg.aw[0] : cfg.aw[1], 8 + i * 4.6, 22, 4.6, 6); Rr(i % 2 ? cfg.aw[0] : cfg.aw[1], 8 + i * 4.6, 28, 4.6, 1.6); }
      Rr('#3a2418', 31, 31, 8, 12);
      [[10, cfg.um], [58, '#f4f0e4']].forEach(function (um) {
        poly(g, [[X(um[0] - 7), X(37)], [X(um[0]), X(30)], [X(um[0] + 7), X(37)]], um[1]); Rr(shade(um[1], .7), um[0] + 1, 33, 6, 4); Rr('#4a3a2a', um[0], 37, 1.4, 8);
      });
      Rr('#6e4a30', 74, 20, 2.4, 23);   // palmera
      for (i = 0; i < 5; i++) { var a = -2.6 + i * .55; line(g, X(75), X(20), X(75 + Math.cos(a) * 9), X(20 + Math.sin(a) * 6 + 2), LEAF[2 + (i & 1)], Math.max(1, X(1.2))); }
    });
    return { c: c, ox: ox, oy: oy };
  }
  /* ---- puente peatonal sobre el Circuito de Playas (de costado): tablero de concreto, baranda de fierro, columnas y dos torres de escalera ---- */
  function bakePeatonal(s) {
    var w = Math.ceil(134 * s), h = Math.ceil(66 * s), ox = Math.round(w / 2), oy = h - 1;
    var c = layer(w, h, function (g) {
      function X(v) { return Math.round(v * s); }
      function Rr(col, x, y, ww, hh) { g.fillStyle = col; g.fillRect(X(x), X(y), Math.max(1, X(ww)), Math.max(1, X(hh))); }
      var i;
      Rr('#9a948a', 26, 22, 7, 43); Rr('#74706a', 30, 22, 3, 43); Rr('#9a948a', 101, 22, 7, 43); Rr('#74706a', 105, 22, 3, 43);   // columnas
      Rr('#A8A196', 12, 15, 110, 7); Rr('#cfc8ba', 12, 15, 110, 1.4); Rr('#6e695f', 12, 21, 110, 1.6);
      for (i = 0; i < 28; i++) Rr('#3A3A40', 14 + i * 3.9, 7, 1.1, 8); Rr('#3A3A40', 12, 6, 110, 1.6); Rr('#5a5a62', 12, 9, 110, 1);
      for (i = 0; i < 4; i++) { Rr(WARML, 24 + i * 28, 4, 2.4, 2.4); }
      [[0, 1], [120, 1]].forEach(function (tw) {   // torres de escalera
        Rr('#a39d91', tw[0], 13, 14, 52); Rr('#7f7a70', tw[0] + 10, 13, 4, 52); Rr('#3A3A40', tw[0], 11, 14, 2.4);
        for (var k = 0; k < 9; k++) line(g, X(tw[0] + 1), X(60 - k * 5), X(tw[0] + 12), X(58 - k * 5 - 3), '#6e695f');
        Rr('#2b3a4a', tw[0] + 4, 18, 6, 6);
      });
      Rr('#E0C050', 14, 16.5, 106, 1);
    });
    return { c: c, ox: ox, oy: oy };
  }
  function bakeTower(s) {   // torre de salvavidas
    var w = Math.ceil(26 * s), h = Math.ceil(52 * s), ox = Math.round(w / 2), oy = h - 1;
    var c = layer(w, h, function (g) {
      function X(v) { return Math.round(v * s); }
      function Rr(col, x, y, ww, hh) { g.fillStyle = col; g.fillRect(X(x), X(y), Math.max(1, X(ww)), Math.max(1, X(hh))); }
      Rr(WOOD.d, 5, 32, 2, 19); Rr(WOOD.d, 19, 32, 2, 19); Rr(WOOD.m, 8, 34, 1.4, 17); line(g, X(6), X(36), X(19), X(48), WOOD.d, 1);
      Rr(WOOD.m, 2, 29, 22, 3); Rr('#f2eee2', 4, 11, 18, 18); Rr('#cfc9b8', 18, 11, 4, 18); Rr('#C8553D', 4, 18, 18, 3.4);
      Rr('#2b3a4a', 7, 13, 8, 4); Rr('#C8553D', 2, 8, 22, 3); Rr('#8e3c2c', 2, 10, 22, 1.2);
      Rr('#4a3a2a', 13, 0, 1.2, 9); Rr('#ffe500', 14, 1, 6, 3); Rr('#d8283a', 14, 3, 6, 2);
    });
    return { c: c, ox: ox, oy: oy };
  }

  /* ---- la playa de canto rodado + el Circuito de Playas + restaurantes + torre + puente peatonal.  sc = escala (1 = lejos, 2.4 = el plano 2) ---- */
  // devuelve el lienzo con .roadY (y de la vereda alta del asfalto) y .waterY (y de la orilla) para ubicarlo.
  function bakeStrip(W, sc, seed, px, restoS, perS, towS) {
    var OFF = 16, H = Math.ceil((OFF + 62) * sc);
    function Y(v) { return Math.round((v + OFF) * sc); }
    var c = layer(W, H, function (g, w, h) {
      var R = RNG(seed), i, y0 = Y(18), y1 = Y(27), railY = y1 + Math.round(3.4 * sc), stTop = Y(32);
      function ey(x) { return Y(46 + 1.6 * Math.sin(x * .035 / sc) + 1.1 * Math.sin(x * .09 / sc + 2)); }
      // el asfalto
      poly(g, [[0, y0], [w, y0], [w, y1], [0, y1]], function (x, y) { return ((x * 7 + y * 3) & 7) === 0 ? '#43434b' : '#4c4c55'; });
      fr(g, '#A8A196', 0, y0 - Math.max(1, Math.round(sc)), w, Math.max(1, Math.round(sc)));
      for (i = 0; i < w; i += Math.round(16 * sc)) fr(g, '#E0C050', i, Math.round((y0 + y1) / 2), Math.round(8 * sc), Math.max(1, Math.round(.9 * sc)));
      fr(g, '#8c887c', 0, y1, w, Math.max(1, Math.round(1.2 * sc))); fr(g, '#A8A196', 0, y1 + Math.max(1, Math.round(1.2 * sc)), w, Math.max(2, Math.round(2 * sc)));
      // autos abandonados
      var cars = ['#7b8a6a', '#b04a3a', '#d8d2c0', '#5E7FA3'];
      for (i = 0; i < Math.round(w / (150 * sc)); i++) { var cx = (30 + i * 150 + R() * 70) * sc, cy = y0 + Math.round(2 * sc), cc = cars[i % cars.length]; fr(g, cc, cx, cy, 14 * sc, 3.4 * sc); fr(g, shade(cc, 1.2), cx + 3 * sc, cy - 2.2 * sc, 7 * sc, 2.4 * sc); fr(g, '#1a1418', cx + 2 * sc, cy + 3 * sc, 2 * sc, 1.4 * sc); fr(g, '#1a1418', cx + 10 * sc, cy + 3 * sc, 2 * sc, 1.4 * sc); }
      // las piedras
      var pts = [[0, stTop]]; for (i = 0; i <= w; i += 6) pts.push([i, stTop]); for (i = w; i >= 0; i -= 6) pts.push([i, ey(i)]);
      poly(g, pts, function (x, y) {
        var e = ey(x), n = vn(x, y, 2.6 * sc) * .6 + vn(x, y, 1.1 * sc) * .4, t = BAY[(y & 3) * 4 + (x & 3)], dw = e - y;
        var idx = clamp(Math.floor(n * 6 + (t - .5) * 1.5), 0, 5);
        if (dw < 5 * sc) idx = clamp(idx - 2, 0, 3); else if (dw < 9 * sc) idx = clamp(idx - 1, 0, 4);
        return STN[idx];
      });
      var nr = Math.round(w * (62 / 56) * sc * sc * .25);
      for (i = 0; i < nr; i++) { var rx = R() * w, ry = stTop + R() * (ey(rx) - stTop - 2), rs = (1 + R() * 1.8) * sc; ell(g, rx, ry, rs, rs * .65, STN[(R() * 4) | 0]); px1(g, rx - rs * .4, ry - rs * .4, STN[5], Math.max(1, rs * .5), 1); }
      for (i = 0; i < 4; i++) { var bx = R() * w, by = stTop + R() * (ey(bx) - stTop - 6 * sc) + 2 * sc; ell(g, bx, by, 3.2 * sc, 2 * sc, STN[2]); ell(g, bx - sc, by - .6 * sc, 2 * sc, 1.1 * sc, STN[4]); fr(g, STN[0], bx - 3 * sc, by + 1.4 * sc, 6 * sc, Math.max(1, .8 * sc)); }
      // espuma en la orilla
      for (i = 0; i < w; i += 2) { var ee = ey(i); fr(g, '#E9E4D8', i, ee - Math.max(1, Math.round(.6 * sc)), 2, Math.max(1, Math.round(sc))); if ((i >> 1) % 3) fr(g, '#bfd0cf', i, ee, 2, Math.max(1, Math.round(.7 * sc))); }
      // baranda de fierro y faroles a lo largo del malecón
      fr(g, '#3A3A40', 0, railY, w, Math.max(1, Math.round(.9 * sc)));
      for (i = 0; i < w; i += Math.round(7 * sc)) fr(g, '#3A3A40', i, railY, 1, Math.round(3 * sc));
      for (i = 40 * sc; i < w - 10; i += 96 * sc) farol(g, i, y1 + Math.round(2 * sc), 12 * sc);
      // restaurantes frente al mar, la torre y las sombrillas, sobre las piedras
      var spots = [.06, .22, .62, .74, .9], t = 0;
      for (i = 0; i < spots.length; i++) {
        var sx = Math.round(spots[i] * w), sp = bakeResto(RESTOS[i % RESTOS.length], restoS); if (Math.abs(sx - px) < 70 * perS) continue;
        g.drawImage(sp.c, sx - sp.ox, Y(44) - sp.oy);
      }
      var tw = bakeTower(towS); g.drawImage(tw.c, Math.round(px + 95 * perS) - tw.ox, Y(43) - tw.oy);
      var umb = ['#ff2e88', '#ffe500', '#2f7fd1', '#1fe07a', '#ff8a2e', '#f4f0e4'];
      for (i = 0; i < Math.round(w / (36 * sc)); i++) {
        var ux = R() * w, uy = stTop + (5 + R() * 6) * sc, uc = umb[(R() * umb.length) | 0]; if (Math.abs(ux - px) < 60 * perS) continue;
        fr(g, '#4a4036', ux + 2 * sc, uy, Math.max(1, sc * .8), 4 * sc); poly(g, [[ux - 3 * sc, uy], [ux + 2.5 * sc, uy - 2.6 * sc], [ux + 8 * sc, uy]], uc); fr(g, shade(uc, .7), ux + 3 * sc, uy - 2 * sc, 5 * sc, 2 * sc);
      }
      // el puente peatonal al pie de la Bajada (sobre el asfalto)
      var pe = bakePeatonal(perS); g.drawImage(pe.c, Math.round(px) - pe.ox, y1 + Math.round(3 * sc) - pe.oy);
    });
    c.roadY = Y(18); c.waterY = Y(46);
    return c;
  }
  // el cabo de Barranco que se ve al fondo desde la playa (plano 3): acantilado lejano con casonas diminutas, y a la derecha las playas del sur con sombrillas
  function bakeHeadland() {
    return layer(480, 62, function (g, w, h) {
      var R = RNG(23), i;
      var top = function (x) { return 4 + x * .108 + (vn(x, 5, 14) - .5) * 3; }, bot = function (x) { return 57 - x * .082; };
      var pts = []; for (i = 0; i <= 206; i += 4) pts.push([i, top(i)]); for (i = 206; i >= 0; i -= 4) pts.push([i, bot(i)]);
      poly(g, pts, function (x, y) { var n = vn(x, y, 4), t = BAY[(y & 3) * 4 + (x & 3)], v = .55 + (n - .5) * .7 + (y - top(x)) / 80 * .1; if (y - top(x) < 5 && n > .45 && t < .8) return LEAF[1]; return hazyCol(EARTH[clamp(Math.floor(v * 5 + (t - .5) * .8), 0, 4)], '#b88a96', .22); });
      var cx = 2; while (cx < 190) { var w2 = 9 + R() * 8, h2 = 6 + R() * 7; casona(g, cx, top(cx + w2 / 2) + 2, w2, h2, hazyCol(CAS[(R() * CAS.length) | 0], '#c9a0a0', .12), R, .5, .3); cx += w2 + R() * 2; }
      for (i = 0; i < 6; i++) { var tx = 6 + R() * 170; tree(g, tx, top(tx) + 3, 2 + R() * 1.6, R); }
      for (i = 0; i < 5; i++) { var fx = 12 + i * 36; farol(g, fx, top(fx) + 2, 4); }
      var cols = ['#ff2e88', '#ffe500', '#2f7fd1', '#1fe07a', '#ff8a2e', '#f4f0e4'];
      for (i = 0; i < 14; i++) { var ux = 262 + i * 14 + R() * 6, uy = 50 + R() * 3, uc = cols[(R() * 6) | 0]; fr(g, '#4a4036', ux + 1, uy, 1, 2); fr(g, uc, ux - 1, uy - 1, 4, 1); }
      for (i = 0; i < 3; i++) { var hx = 286 + i * 58 + R() * 20; fr(g, ['#EFE4C8', '#A9D0C4', '#F2D480'][i], hx, 46, 9, 6); fr(g, '#8A4B32', hx - 1, 44, 11, 2); fr(g, WARM, hx + 2, 48, 2, 2); }
    });
  }
  function hazyCol(hex, tint, a) {
    function p(h, o) { return parseInt(h.substr(o, 2), 16); }
    function q(v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }
    return '#' + q(p(hex, 1) * (1 - a) + p(tint, 1) * a) + q(p(hex, 3) * (1 - a) + p(tint, 3) * a) + q(p(hex, 5) * (1 - a) + p(tint, 5) * a);
  }
  // canto rodado de primer plano (planos 3 y 4): orilla mojada y oscura arriba, piedras que crecen hacia el que mira
  function bakeStones() {
    return layer(480, 72, function (g, w, h) {
      poly(g, [[0, 0], [w, 0], [w, h], [0, h]], function (x, y) {
        var f = y / h, n = vn(x / (1 + f * 1.3), y / (1 + f * .6), 3), t = BAY[(y & 3) * 4 + (x & 3)];
        if (y < 3) return '#E9E4D8';
        if (y < 6) return (x + y) & 2 ? '#bfd0cf' : '#6c6458';
        if (y < 13) return n + (t - .5) * .5 > .5 ? STN[1] : STN[0];
        var v = n + (t - .5) * .55 + (vn(x * .3, y * .8, 12) - .5) * .5;
        return v > .72 ? STN[4] : v < .32 ? STN[1] : STN[2];
      });
      var R = RNG(8), i;
      for (i = 0; i < 260; i++) {
        var ry = 6 + R() * 64, f2 = ry / 72, rs = (1.1 + f2 * 4.2) * (.6 + R() * .8), rx = R() * w, ci = (R() * 5) | 0;
        ell(g, rx, ry, rs, rs * .62, STN[ci]); fr(g, STN[Math.min(5, ci + 2)], rx - rs * .5, ry - rs * .35, Math.max(1, rs * .6), Math.max(1, rs * .22)); fr(g, STN[0], rx - rs * .8, ry + rs * .5, Math.max(2, rs * 1.4), 1);
      }
      for (i = 0; i < 9; i++) { var gy = 40 + i * 3.2, gx = 30 + i * 11; fr(g, STN[0], gx, gy, 3, 2); }
    });
  }
  function bakeSeaB() {   // franja de mar al horizonte (520×38) con la Isla San Lorenzo en la bruma y surfistas chiquitos
    return layer(520, 38, function (g, w, h) {
      vgrad(g, 0, 0, w, h, ['#d9a58a', '#a8909a', '#6f8e9e', '#4f7a8c', '#3E6A7E']);
      poly(g, [[380, 7], [392, 3], [420, 2], [452, 4], [486, 7], [520, 8], [520, 9], [380, 9]], '#8f7f92');   // isla en la bruma
      var R = RNG(14), i;
      for (i = 0; i < 70; i++) { var yy = 9 + R() * 28, f = yy / h; g.fillStyle = R() < .5 ? '#f0b88e' : '#2f5568'; g.fillRect(Math.round(R() * w), Math.round(yy), Math.round(3 + f * 9 * R()), 1); }
      for (i = 0; i < 5; i++) { var sx = 40 + i * 92 + R() * 30, sy = 14 + R() * 14; fr(g, '#f4f0e4', sx - 2, sy + 2, 5, 1); fr(g, '#2a2a30', sx, sy - 1, 1, 3); fr(g, '#b8825a', sx, sy - 2, 1, 1); }
    });
  }


  function bakeSea(wh) {   // agua de la bahía (640×wh) con rizos que crecen hacia el borde de abajo
    return layer(640, wh, function (g, w, h) {
      vgrad(g, 0, 0, w, h, SEA);
      var R = RNG(31), y = 4, c;
      while (y < h - 2) {
        var f = y / h, n = Math.round(24 - f * 12);
        for (var i = 0; i < n; i++) {
          var x = R() * w, l = 3 + f * 14 * (.4 + R()); c = R() < .5 ? '#9cbcc4' : '#2a4a5e';
          g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y + R() * 3), Math.round(l), 1);
        }
        y += 3 + f * 5;
      }
    });
  }


  /* ================================================================ ARTE: gaviotas, parapente chicha, capa, paloma ================================================================ */
  function bakeGull(frame, s) {   // visto de atrás/costado: 0 alas arriba, 1 a media altura, 2 abajo
    var w = Math.ceil(34 * s), h = Math.ceil(22 * s), c = layer(w, h, function (g) {
      var cx = w / 2, cy = h * .55, up = [-1, 0, 1][frame] * 5 * s;
      function wing(sg) {
        var tip = [cx + sg * 16 * s, cy + up * 1.4 - (frame === 0 ? 5 * s : 0) + (frame === 2 ? 3 * s : 0)];
        poly(g, [[cx + sg * 2 * s, cy - 1.5 * s], [cx + sg * 9 * s, cy + up * .55 - 2.5 * s], [tip[0], tip[1]], [tip[0] - sg * 3 * s, tip[1] + 2.2 * s], [cx + sg * 8 * s, cy + 2.5 * s + up * .3], [cx + sg * 2 * s, cy + 2 * s]], function (x, y) { return Math.abs(x - cx) > 12 * s ? '#2a2c32' : (y > cy + up * .4 + 1 * s ? '#c3c6cc' : '#e4e6ea'); });
      }
      wing(-1); wing(1);
      ell(g, cx, cy + .5 * s, 3.2 * s, 3.8 * s, '#f6f6f4');   // cuerpo
      ell(g, cx + 1.2 * s, cy - 3.6 * s, 2 * s, 2 * s, '#fafaf8');   // cabeza
      g.fillStyle = '#f2b83a'; g.fillRect(Math.round(cx + 2.8 * s), Math.round(cy - 3.6 * s), Math.max(1, Math.round(2 * s)), Math.max(1, Math.round(s)));
      g.fillStyle = '#222'; g.fillRect(Math.round(cx + 1.6 * s), Math.round(cy - 4.4 * s), 1, 1);
    });
    return c;
  }

  // Canopy (ala) del parapente visto desde abajo y de frente: arco en cejilla, celdas rosadas y amarillas, borde de ataque claro, labio oscuro.
  function bakeCanopy(hw, k, roll, lit) {
    var N = Math.max(9, Math.round(hw / 5)), pad = 8, th0 = .17 * hw * (1 - .75 * k);
    var maxY = hw * (.26 * (1 + 1.4 * k)) + th0 + hw * Math.abs(roll) * .5 + 16 * k + 12;
    var w = Math.ceil(hw * 2 + pad * 2), h = Math.ceil(maxY + pad * 2);
    var cx = w / 2, top0 = pad + Math.abs(roll) * hw * .5;
    function yt(u) { return top0 + hw * .26 * u * u * (1 + 1.4 * k) + roll * hw * u * .5 + k * 6 * Math.sin(u * 5.2 + 1) * Math.abs(u); }
    function thk(u) { return th0 * Math.sqrt(Math.max(0, 1 - u * u * .86)) + 3 - k * 1.5; }
    var cp = [PINK, YEL], c = layer(w, h, function (g) {
      var top = [], bot = [], i, M = Math.round(hw * 1.2);
      for (i = 0; i <= M; i++) { var u = -1 + 2 * i / M; top.push([cx + u * hw, yt(u)]); }
      for (i = M; i >= 0; i--) { var u2 = -1 + 2 * i / M; bot.push([cx + u2 * hw, yt(u2) + thk(u2)]); }
      poly(g, top.concat(bot), function (x, y) {
        var u = (x - cx) / hw, cell = Math.floor((u + 1) / 2 * N), P = cp[cell & 1], yy = yt(u), v = (y - yy) / thk(u);
        var rib = ((u + 1) / 2 * N - cell) < 1 / (hw / N * 1.0) * .9;
        var col = v < .12 ? P.hl : v < .36 ? P.l : v < .72 ? P.m : P.d;
        if (u < -.55 && v > .18) col = v < .72 ? P.l : P.m;          // luz desde la izquierda
        if (u > .6 && v < .8) col = v < .36 ? P.m : P.d;
        if (rib && v > .12) col = P.d;
        if (v < .07 && (((x >> 1) + cell) & 1)) col = '#4a2038';      // boca de entrada de aire
        if (lit) col = v < .5 ? P.hl : P.l;
        return col;
      });
      // costuras del borde de fuga y puntas redondeadas
      for (i = 0; i <= M; i += 2) { var uu = -1 + 2 * i / M; px1(g, cx + uu * hw, yt(uu) + thk(uu), '#7a1448'); }
    });
    return { c: c, cx: cx, w: w, h: h, att: function (u) { return [cx + u * hw, yt(u) + thk(u) - 1]; } };
  }

  // Capa-parapente: la vela cayendo sobre la espalda y flameando (frames de viento). Ancla (hombros) arriba a la derecha.
  function bakeCape(ph, size) {
    size = size || 1;
    var w = Math.ceil(270 * size), h = Math.ceil(210 * size);
    var ax = w - 22 * size, ay = 70 * size, Ls = 238 * size, c = layer(w, h, function (g) {
      function yc(s) { return ay + (Math.sin(s * 5.6 + ph) * 13 * s + s * 6 - s * s * 14) * size; }
      function yt(s) { return yc(s) - (9 + 30 * s + Math.sin(s * 9 + ph * 1.4) * 6 * s) * size; }
      function yb(s) { return yc(s) + (14 + 58 * s + Math.sin(s * 7 + ph) * 9 * s + (s > .86 ? Math.sin((s - .86) * 150 + ph) * 5 : 0)) * size; }
      var top = [], bot = [], i, M = 90;
      for (i = 0; i <= M; i++) { var s = i / M; top.push([ax - s * Ls, yt(s)]); bot.push([ax - s * Ls, yb(s)]); }
      poly(g, top.concat(bot.reverse()), function (x, y) {
        var s = clamp((ax - x) / Ls, 0, 1), t0 = yt(s), t1 = yb(s), lat = (y - t0) / (t1 - t0), cell = Math.floor(s * 9), P = [PINK, YEL][cell & 1];
        var fold = Math.sin(s * 15 + ph + lat * 3.2), col = fold > .5 ? P.l : fold > -.25 ? P.m : P.d;
        if (lat > .82) col = P.d; else if (lat < .07) col = P.hl;
        if (((s * 9) - cell) < .05) col = P.d;
        if (lat < .02 || lat > .985) col = '#7a1448';
        return col;
      });
      for (i = 0; i < 5; i++) { var s2 = .1 + i * .13; line(g, ax - s2 * Ls, yb(s2) - 4 * size, ax - 2 * size, ay + 10 * size, '#3a3340'); }
    });
    return { c: c, ax: ax, ay: ay };
  }

  /* ---- Titina (paloma gris, cuello tornasolado verde y morado) ---- */
  // pose: 'perch' · 'puff' (pecho inflado, ceja fruncida) · 'fly0/1/2' (aleteo). Mira a la derecha. s = escala. Origen = patas (abajo al centro) para perch/puff.
  function bakePigeon(pose, s) {
    var fl = pose.indexOf('fly') === 0, w = Math.ceil(54 * s), h = Math.ceil(46 * s), cyf = h * (fl ? .56 : .7);
    var c = layer(w, h, function (g) {
      var cx = w * .5, cy = cyf, puff = pose === 'puff', i;
      function X(v) { return cx + v * s; } function Y(v) { return cy + v * s; }
      function px(v, ww) { return Math.max(1, Math.round((ww || 1) * s)); }
      function head(hx, hy, chest) {
        ell(g, X(hx), Y(hy), 5 * s, 5 * s, function (x, y) { return y < Y(hy - 2) ? PGC.l : PGC.m; });
        poly(g, [[X(hx + 3.5), Y(hy - 1.4)], [X(hx + 9), Y(hy + .2)], [X(hx + 3.5), Y(hy + 1.6)]], PGC.beak);
        g.fillStyle = PGC.cere; g.fillRect(Math.round(X(hx + 3)), Math.round(Y(hy - 2.4)), px(2), px(1.4));
        g.fillStyle = PGC.eye; g.fillRect(Math.round(X(hx + 1)), Math.round(Y(hy - 2)), px(2), px(2)); g.fillStyle = PGC.k; g.fillRect(Math.round(X(hx + 1.6)), Math.round(Y(hy - 1.6)), px(1), px(1));
      }
      if (fl) {
        var f = +pose.charAt(3), ang = [-1.2, -.4, .9][f], L = 24;
        function wing(rootx, rooty, a, L2, cn) {
          var ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
          poly(g, [[X(rootx), Y(rooty)], [X(rootx + ca * L2 * .5 + nx * -7), Y(rooty + sa * L2 * .5 + ny * -7)], [X(rootx + ca * L2), Y(rooty + sa * L2)], [X(rootx + ca * L2 * .55 + nx * 8), Y(rooty + sa * L2 * .55 + ny * 8)], [X(rootx - 10), Y(rooty + 2)]], function (x, y) { return cn ? (((x + y * 2) >> 1) & 3 ? PGC.l : PGC.m) : PGC.d; });
          for (var q = 0; q < 4; q++) line(g, X(rootx + ca * L2 * (.7 + q * .08) + nx * (2 + q)), Y(rooty + sa * L2 * (.7 + q * .08) + ny * (2 + q)), X(rootx + ca * L2 * (.96) + nx * (q - 1)), Y(rooty + sa * L2 * .96 + ny * (q - 1)), PGC.k);
        }
        wing(-2, -3, ang - .25 > -1.5 ? ang - .25 : ang, L, false);
        poly(g, [[X(-12), Y(0)], [X(-27), Y(3)], [X(-29), Y(8)], [X(-11), Y(5)]], PGC.dd);
        ell(g, X(0), Y(1), 12.5 * s, 7 * s, function (x, y) { return y < Y(-3) ? PGC.l : y < Y(3) ? PGC.m : PGC.d; });
        ell(g, X(8), Y(-2), 4.2 * s, 4 * s, function (x, y) { return ((x * 3 + y) & 3) ? PGC.g : PGC.p; });
        head(12, -5, 0);
        wing(3, -3, ang, L + 2, true);
      } else {
        var ch = puff ? 3 : 0;
        poly(g, [[X(-9), Y(-4)], [X(-24), Y(-1)], [X(-27), Y(4)], [X(-9), Y(4)]], PGC.dd);   // cola
        poly(g, [[X(-24), Y(-1)], [X(-27), Y(4)], [X(-21), Y(3)]], PGC.k);
        ell(g, X(0), Y(-6), (12 + ch) * s, (8.4 + ch * .5) * s, function (x, y) { return y < Y(-10) ? PGC.l : y < Y(-3) ? PGC.m : PGC.d; });
        // ala plegada con dos barras negras
        poly(g, [[X(-10), Y(-10)], [X(3), Y(-12)], [X(7), Y(-3)], [X(-3), Y(1)], [X(-14), Y(-3)]], function (x, y) { return y < Y(-9) ? PGC.hl : PGC.l; });
        g.fillStyle = PGC.k; g.fillRect(Math.round(X(-9)), Math.round(Y(-8)), Math.round(12 * s), px(1.4)); g.fillRect(Math.round(X(-10)), Math.round(Y(-4.5)), Math.round(13 * s), px(1.4));
        ell(g, X(7 + ch * .5), Y(-11), 5.2 * s, 5.8 * s, function (x, y) { return ((x * 2 + y * 3) & 3) ? ((x + y) & 1 ? PGC.g : PGC.gl) : PGC.p; });   // cuello tornasolado
        head(10 + ch * .5, -16, ch);
        if (puff) line(g, X(8), Y(-21), X(15), Y(-19), PGC.k, px(1.4));   // ceja fruncida
        g.fillStyle = PGC.foot; g.fillRect(Math.round(X(-3)), Math.round(Y(1)), px(1.2), Math.round(4 * s)); g.fillRect(Math.round(X(3)), Math.round(Y(1)), px(1.2), Math.round(4 * s));
      }
    });
    return { c: c, ox: Math.round(w * .5), oy: Math.round(cyf + 5 * s) };
  }

  /* ================================================================ ARTE: Alexander (el Alexander claro, estilo Stardew, de la cinemática de la cima) ================================================================ */
  /* Poses: coordenadas «de grilla» con el origen en el suelo entre los pies (y negativo = arriba), mirando a la derecha (se voltea al dibujar). */
  var POSES = {
    hero: { hip: [0, -90], sh: [3, -146], head: [10, -171], tilt: -.14, fx: .62, kL: [-14, -48], aL: [-16, -5], kR: [14, -48], aR: [17, -5],
      eL: [-58, -122], hL: [-27, -97], eR: [60, -124], hR: [30, -99], puff: 1.2, fistL: 1, fistR: 1, expr: 'hero',
      gn: [-18, -142, -52, -204], gb: [-8, -118, 30, 36, -.28] },
    air: { hip: [0, -96], sh: [0, -150], head: [2, -176], tilt: 0, fx: .3, kL: [-9, -52], aL: [-11, -8], kR: [12, -52], aR: [15, -6],
      eL: [-42, -178], hL: [-38, -222], eR: [43, -178], hR: [39, -222], puff: 0, grip: 1, foot: 'down', expr: 'joy',
      gn: [-16, -150, -36, -206], gb: [-2, -128, 28, 33, -.12] },
    touch: { hip: [2, -84], sh: [8, -134], head: [14, -160], tilt: .05, fx: .55, kL: [-20, -46], aL: [-22, -4], kR: [22, -46], aR: [24, -4],
      eL: [-46, -122], hL: [-70, -138], eR: [52, -124], hR: [76, -132], puff: 0, fistL: 1, fistR: 1, expr: 'grit',
      gn: [-14, -130, -44, -188], gb: [-4, -108, 28, 33, -.2] },
    crouch: { hip: [4, -62], sh: [20, -108], head: [32, -132], tilt: .22, fx: .7, kL: [-18, -34], aL: [-26, -4], kR: [34, -52], aR: [32, -4],
      eL: [-6, -92], hL: [-32, -86], eR: [48, -80], hR: [52, -34], puff: 0, fistL: 1, fistR: 1, expr: 'grit',
      gn: [-2, -100, -36, -146], gb: [-10, -84, 28, 33, -.5] },
    kneel: { hip: [0, -58], sh: [18, -110], head: [34, -134], tilt: .42, fx: .72, kL: [-26, -9], aL: [-58, -5], kR: [36, -70], aR: [37, -4],
      eL: [-12, -98], hL: [-40, -82], eR: [45, -84], hR: [51, -24], puff: 0, fistL: 1, fistR: 1, expr: 'down', foot: 'back',
      gn: [-4, -98, -38, -146], gb: [-14, -82, 28, 33, -.6] },
    kneelUp: { hip: [0, -60], sh: [12, -120], head: [24, -150], tilt: -.12, fx: .66, kL: [-26, -9], aL: [-58, -5], kR: [36, -70], aR: [37, -4],
      eL: [-16, -104], hL: [-36, -84], eR: [45, -88], hR: [51, -24], puff: .6, fistL: 1, fistR: 1, expr: 'hero', foot: 'back',
      gn: [-8, -118, -40, -176], gb: [-12, -92, 28, 33, -.45] },
    sit: { hip: [0, -52], sh: [0, -104], head: [1, -132], tilt: 0, fx: .35, kL: [-13, -34], aL: [-17, 8], kR: [13, -34], aR: [17, 8],
      eL: [-42, -124], hL: [-38, -166], eR: [43, -124], hR: [39, -166], puff: 0, grip: 1, foot: 'down', expr: 'joy', seat: 1,
      gn: [-16, -100, -34, -158], gb: [-2, -76, 28, 33, -.1] }
  };

  function bakeAlex(name, s, o) {
    o = o || {};
    var P = POSES[name], CW = 300, CH = 290, OX = 150, OY = 262;
    var hp = o.hp || 0, jf = o.jf || 0, expr = o.expr || P.expr;
    function X(v) { return (OX + v) * s; } function Y(v) { return (OY + v) * s; }
    function Q(p) { return [X(p[0]), Y(p[1])]; }
    var hand = { l: Q(P.hL), r: Q(P.hR) };
    var c = layer(Math.ceil(CW * s), Math.ceil(CH * s), function (g) {
      var hip = Q(P.hip), sh = Q(P.sh), hd = Q(P.head), fx = P.fx, S = s;
      function skin(x0, y0, x1, y1, w0, w1) {   // extremidad con 3 tonos
        cap(g, x0, y0, x1, y1, w0, w1, SKC.d);
        cap(g, x0 - .06 * w0, y0 - .04 * w0, x1 - .06 * w1, y1 - .04 * w1, w0 * .78, w1 * .78, SKC.m);
        cap(g, x0 - .22 * w0, y0 - .14 * w0, x1 - .22 * w1, y1 - .14 * w1, w0 * .34, w1 * .34, SKC.l);
      }
      // --- guitarra a la espalda (detrás del cuerpo) ---
      var gb = P.gb, gn = P.gn;
      var gx = X(gb[0]), gy = Y(gb[1]);
      ell(g, gx, gy, gb[2] * S, gb[3] * S, function (x, y) { var d = Math.hypot((x - gx) / (gb[2] * S), (y - gy) / (gb[3] * S)); return d > .86 ? GTC.dd : (x < gx - gb[2] * S * .2 ? GTC.l : x > gx + gb[2] * S * .35 ? GTC.d : GTC.m); }, gb[4]);
      ell(g, gx - 2 * S, gy - 2 * S, 7 * S, 7 * S, GTC.dd, 0);   // boca (se asoma por los costados solo si no tapa el torso)
      cap(g, X(gn[0]), Y(gn[1]), X(gn[2]), Y(gn[3]), 8 * S, 7 * S, GTC.d); cap(g, X(gn[0]) - S, Y(gn[1]), X(gn[2]) - S, Y(gn[3]), 3.4 * S, 3 * S, GTC.l);
      var hx0 = X(gn[2]), hy0 = Y(gn[3]), ang = Math.atan2(gn[3] - gn[1], gn[2] - gn[0]);
      var ca = Math.cos(ang), sa = Math.sin(ang);
      poly(g, [[hx0 - 5 * S * sa - 1 * S * ca, hy0 + 5 * S * ca - 1 * S * sa], [hx0 + 5 * S * sa - 1 * S * ca, hy0 - 5 * S * ca - 1 * S * sa], [hx0 + 5 * S * sa + 14 * S * ca, hy0 - 5 * S * ca + 14 * S * sa], [hx0 - 5 * S * sa + 14 * S * ca, hy0 + 5 * S * ca + 14 * S * sa]], GTC.head);
      for (var tp = 0; tp < 3; tp++) { px1(g, hx0 + (tp * 4 - 4) * S * sa + 8 * S * ca, hy0 - (tp * 4 - 4) * S * ca + 8 * S * sa, GTC.metal, Math.max(1, Math.round(2 * S)), Math.max(1, Math.round(2 * S))); }
      // --- piernas ---
      function leg(kn, an, side) {
        var h = [hip[0] + side * 11 * S, hip[1] + 8 * S], k = Q(kn), a = Q(an);
        skin(k[0], k[1], a[0], a[1], 15 * S, 11 * S);                       // pantorrilla
        var mx = lerp(h[0], k[0], .72), my = lerp(h[1], k[1], .72);
        skin(h[0], h[1], k[0], k[1], 21 * S, 16 * S);                       // muslo (piel)
        cap(g, h[0], h[1], mx, my, 25 * S, 20 * S, SHC.d); cap(g, h[0] - 1.5 * S, h[1] - S, mx - 1.5 * S, my - S, 21 * S, 16.5 * S, SHC.m); cap(g, h[0] - 5 * S, h[1] - 3 * S, mx - 4 * S, my - 2 * S, 7 * S, 6 * S, SHC.l);   // short
        // sandalia
        var dn = P.foot === 'down', bk = P.foot === 'back', dirx = bk ? -1 : 1;
        if (dn) { poly(g, [[a[0] - 5 * S, a[1] - 2 * S], [a[0] + 6 * S, a[1] - 2 * S], [a[0] + 7 * S, a[1] + 11 * S], [a[0] - 5 * S, a[1] + 11 * S]], SDC.m); g.fillStyle = SDC.d; g.fillRect(Math.round(a[0] - 5 * S), Math.round(a[1] + 9 * S), Math.round(12 * S), Math.max(1, Math.round(2 * S))); g.fillStyle = SKC.m; g.fillRect(Math.round(a[0] - 3 * S), Math.round(a[1] - 1 * S), Math.round(8 * S), Math.round(6 * S)); }
        else {
          var t0 = dirx * 16 * S, hl = -dirx * 8 * S;
          poly(g, [[a[0] + hl, a[1] + 1 * S], [a[0] + t0, a[1] + 1 * S], [a[0] + t0 + dirx * 2 * S, a[1] + 5 * S], [a[0] + hl, a[1] + 6 * S]], SDC.m);
          poly(g, [[a[0] + hl, a[1] + 4.5 * S], [a[0] + t0 + dirx * 2 * S, a[1] + 4.5 * S], [a[0] + t0 + dirx * 2 * S, a[1] + 6 * S], [a[0] + hl, a[1] + 6 * S]], SDC.d);
          poly(g, [[a[0] - dirx * 4 * S, a[1] - 3 * S], [a[0] + dirx * 13 * S, a[1] + 1 * S], [a[0] - dirx * 4 * S, a[1] + 1 * S]], SKC.m);
          line(g, a[0] - dirx * 2 * S, a[1] - 2 * S, a[0] + dirx * 8 * S, a[1] + 1 * S, SDC.l, Math.max(1, Math.round(S)));
        }
      }
      leg(P.kL, P.aL, -1); leg(P.kR, P.aR, 1);
      if (P.seat) { poly(g, [[hip[0] - 22 * S, hip[1] + 8 * S], [hip[0] + 22 * S, hip[1] + 8 * S], [hip[0] + 24 * S, hip[1] + 16 * S], [hip[0] - 24 * S, hip[1] + 16 * S]], '#3a3340'); }
      // --- pelvis (short) ---
      var wL = 22 * S, wR = 22 * S;
      poly(g, [[hip[0] - wL - S, hip[1] - 10 * S], [hip[0] + wR + S, hip[1] - 10 * S], [hip[0] + wR + 3 * S, hip[1] + 16 * S], [hip[0] - wL - 3 * S, hip[1] + 16 * S]], function (x, y) { return x < hip[0] - 8 * S ? SHC.l : x > hip[0] + 10 * S ? SHC.d : SHC.m; });
      line(g, hip[0], hip[1] + 4 * S, hip[0], hip[1] + 16 * S, SHC.dd, Math.max(1, Math.round(S)));
      // --- torso con camiseta de rayas azules y blancas ---
      var ws = 34 * S * (1 - .12 * fx), pf = P.puff * 7 * S;
      var tor = [[sh[0] - ws, sh[1] + 3 * S], [sh[0] - ws + 5 * S, sh[1] - 3 * S], [sh[0] + ws - 5 * S, sh[1] - 3 * S], [sh[0] + ws, sh[1] + 3 * S], [sh[0] + ws + pf, sh[1] + 20 * S],
        [sh[0] + ws - 1 * S + pf * .6, sh[1] + 38 * S], [hip[0] + wR, hip[1] - 4 * S], [hip[0] - wL, hip[1] - 4 * S], [sh[0] - ws + 1 * S, sh[1] + 36 * S], [sh[0] - ws - 1 * S, sh[1] + 16 * S]];
      var BLU = [BLC.d, BLC.m, BLC.l], WHI = [WHC.d, WHC.l, WHC.hl];
      poly(g, tor, function (x, y) {
        var dx = Math.sin((y - sh[1]) / S * .13 + jf) * 2.4 * S * clamp((y - sh[1]) / (46 * S), 0, 1) * (1 + .5 * P.puff);
        var st = Math.floor((x - sh[0] + dx) / (5.6 * S) + 40) & 1, rel = (x - sh[0]) / ws, tn = rel < -.35 ? 2 : rel > .35 ? 0 : 1;
        if ((y - sh[1]) > 40 * S) tn = Math.max(0, tn - 1);
        var vy = y - sh[1];   // cuello en V
        if (vy < 14 * S && Math.abs(x - sh[0] - 2 * S) < (14 * S - vy) * .62) return vy < 10 * S ? SKC.d : SKC.m;
        if (vy < 17 * S && Math.abs(x - sh[0] - 2 * S) < (17 * S - vy) * .62 + 1.6 * S) return BLC.dd;
        return st ? BLU[tn] : WHI[tn];
      });
      // correa de la guitarra (de un hombro a la cadera opuesta)
      cap(g, sh[0] - ws + 8 * S, sh[1] + 2 * S, hip[0] + wR - 6 * S, hip[1] - 8 * S, 6 * S, 6 * S, GTC.strap);
      cap(g, sh[0] - ws + 7 * S, sh[1] + 1 * S, hip[0] + wR - 7 * S, hip[1] - 9 * S, 2.2 * S, 2.2 * S, GTC.strapL);
      // --- brazos ---
      function arm(sd, el, ha, fist, grip) {
        var shp = [sh[0] + sd * (ws - 3 * S), sh[1] + 7 * S], e = Q(el), hh = Q(ha);
        skin(e[0], e[1], hh[0], hh[1], 12 * S, 10 * S);
        if (fist || grip) { ell(g, hh[0], hh[1], 6.6 * S, 6.2 * S, function (x, y) { return y > hh[1] + 2 * S ? SKC.d : x < hh[0] - 2 * S ? SKC.l : SKC.m; }); for (var f = 0; f < 3; f++) px1(g, hh[0] - 3 * S + f * 3 * S, hh[1] - 1 * S, SKC.d, Math.max(1, Math.round(S)), Math.max(1, Math.round(2 * S))); }
        else ell(g, hh[0], hh[1], 5 * S, 5 * S, SKC.m);
        skin(shp[0], shp[1], e[0], e[1], 16 * S, 12.5 * S);
        var mx = lerp(shp[0], e[0], .5), my = lerp(shp[1], e[1], .5);
        cap(g, shp[0], shp[1], mx, my, 21 * S, 17 * S, function (x, y) { var dx = Math.sin((y - sh[1]) / S * .2 + jf + sd) * 1.4 * S; return (Math.floor((x - shp[0] + dx) / (5.6 * S) + 40) & 1) ? (sd < 0 ? BLC.l : BLC.m) : (sd < 0 ? WHC.hl : WHC.l); });
      }
      arm(-1, P.eL, P.hL, P.fistL, P.grip); arm(1, P.eR, P.hR, P.fistR, P.grip);
      // --- cuello, cabeza, cara y pelo ---
      S = s * 1.12;
      var tl = P.tilt, ct = Math.cos(tl), st2 = Math.sin(tl);
      function T(lx, ly) { return [hd[0] + (lx * ct - ly * st2) * S, hd[1] + (lx * st2 + ly * ct) * S]; }
      cap(g, sh[0] + 1 * S, sh[1] - 2 * S, T(0, 16)[0], T(0, 16)[1], 17 * S, 15 * S, function (x, y) { return y > sh[1] - 12 * S && x > sh[0] + 3 * S ? SKC.d : SKC.m; });
      var hpts = []; for (var i = 0; i < 40; i++) { var a = i / 40 * TAU, sn = Math.sin(a); var lx = Math.cos(a) * 20 + fx * 5 * Math.max(0, sn) + fx * 2.5, ly = sn * 23 + (sn > 0 ? 1.5 * sn : 0); hpts.push(T(lx, ly)); }
      // oreja
      poly(g, hpts, function (x, y) {
        var rx = (x - hd[0]) / S, ry = (y - hd[1]) / S;
        var lt = rx < -8 ? SKC.l : rx > 12 ? SKC.d : SKC.m;
        if (ry > 17) lt = rx > 0 ? SKC.d : SKC.m;
        if (rx < -12 && ry < 6) lt = SKC.hl;
        return lt;
      });
      var ep = T(-8.5, 3); ell(g, ep[0], ep[1], 4.4 * S, 6 * S, SKC.d); ell(g, ep[0] + .5 * S, ep[1], 2.4 * S, 3.8 * S, SKC.ck); px1(g, ep[0] - 1 * S, ep[1] - 3 * S, SKC.l, Math.max(1, Math.round(S)), Math.max(1, Math.round(2 * S)));
      if (S >= .5) {
        var cxl = fx * 6, nearx = cxl - 8.2, farx = cxl + 9.6 * (1 - .42 * fx);
        // mejillas
        var ck1 = T(cxl - 12, 9), ck2 = T(cxl + 11, 9); ell(g, ck1[0], ck1[1], 3.4 * S, 2.2 * S, SKC.ck); ell(g, ck2[0], ck2[1], 2.6 * S, 2 * S, SKC.ck);
        // ojos
        function eye(ex, ey, ew, eh, look) {
          var p = T(ex, ey), cl = expr === 'down';
          if (cl) { line(g, p[0] - ew / 2 * S, p[1], p[0] + ew / 2 * S, p[1] + .5 * S, HRC.k, Math.max(1, Math.round(1.5 * S))); return; }
          poly(g, ellPts(p[0], p[1], ew / 2 * S, eh / 2 * S, tl, 14), '#f4f0e6');
          px1(g, p[0] - ew / 2 * S, p[1] - eh / 2 * S, '#d2c8b8', Math.max(1, Math.round(ew * S)), Math.max(1, Math.round(S)));
          var ix = p[0] + look[0] * S, iy = p[1] + look[1] * S;
          ell(g, ix, iy, 2.3 * S, 2.5 * S, '#4a2e1e'); ell(g, ix + .4 * S, iy, 1.2 * S, 1.4 * S, '#1c100a');
          px1(g, ix - 1.4 * S, iy - 1.6 * S, '#fff', Math.max(1, Math.round(S)), Math.max(1, Math.round(S)));
        }
        var look = expr === 'hero' ? [1.3, -1.5] : expr === 'joy' ? [.4, -.6] : [1.2, .2];
        eye(nearx, -4, 8.4, 6.6, look); eye(farx, -4, 8.4 * (1 - .32 * fx), 6.4, look);
        // cejas (fruncidas y heroicas)
        function brow(x0, y0, x1, y1) { var a1 = T(x0, y0), a2 = T(x1, y1); cap(g, a1[0], a1[1], a2[0], a2[1], 3 * S, 2.4 * S, HRC.k); }
        if (expr === 'hero' || expr === 'grit' || expr === 'down') { brow(nearx - 5, -12.5, nearx + 5.5, -8.4); brow(farx - 5, -8.6, farx + 4.5, -11.4); }
        else { brow(nearx - 5, -11.6, nearx + 4.5, -12.6); brow(farx - 4, -12.6, farx + 4, -11.4); }
        // nariz: puente, punta y fosas dilatadas
        var n0 = T(cxl + 1.5, -1), n1 = T(cxl + 6 + 6 * fx, 7), n2 = T(cxl + 1, 9.4);
        poly(g, [n0, T(cxl + 4 + 3 * fx, -2), n1, T(cxl + 5 + 5 * fx, 10), n2], function (x, y) { return y > n1[1] - 1 * S ? SKC.d : SKC.l; });
        px1(g, T(cxl + 3 + 4 * fx, 8.2)[0], T(0, 8.2)[1], '#4a2418', Math.max(1, Math.round(2 * S)), Math.max(1, Math.round(1.4 * S)));
        px1(g, T(cxl - .4, 9)[0], T(0, 9)[1], '#4a2418', Math.max(1, Math.round(1.6 * S)), Math.max(1, Math.round(1.2 * S)));
        // boca
        var m0 = T(cxl - 6, 15), m1 = T(cxl + 11, 12.6);
        if (expr === 'hero') {   // media sonrisa de lado con un diente chueco
          poly(g, [T(cxl - 4, 14.6), T(cxl + 4, 15.8), T(cxl + 11, 12.6), T(cxl + 12.6, 10.6), T(cxl + 10, 17.8), T(cxl + 2, 19.4), T(cxl - 3, 17.4)], '#4a2420');
          poly(g, [T(cxl - 2, 15.4), T(cxl + 4, 16.2), T(cxl + 10, 13.6), T(cxl + 10, 15.2), T(cxl + 4, 17.6), T(cxl - 2, 16.8)], '#f4efe2');
          px1(g, T(cxl + 5, 17)[0], T(0, 17.4)[1], '#f4efe2', Math.max(1, Math.round(2.4 * S)), Math.max(1, Math.round(1.6 * S)));   // diente chueco, más bajo
          line(g, T(cxl + 6.6, 15.4)[0], T(0, 15.4)[1], T(cxl + 6.6, 17)[0], T(cxl + 6.6, 17)[1], '#4a2420', 1);
          line(g, m0[0], m0[1], m1[0], m1[1], '#3a1c18', Math.max(1, Math.round(S * .8)));
        } else if (expr === 'joy') {
          poly(g, ellPts(T(cxl + 3, 14.5)[0], T(cxl + 3, 14.5)[1], 7 * S, 5.2 * S, tl, 16), '#4a2420');
          poly(g, [T(cxl - 3, 11), T(cxl + 9, 11), T(cxl + 8, 13.4), T(cxl - 2, 13.4)], '#f4efe2');
          ell(g, T(cxl + 3, 17)[0], T(cxl + 3, 17)[1], 3.8 * S, 1.8 * S, '#b5675a');
        } else if (expr === 'grit') {
          poly(g, [T(cxl - 5, 13), T(cxl + 9, 13), T(cxl + 8, 18), T(cxl - 4, 18)], '#4a2420'); poly(g, [T(cxl - 4, 13.6), T(cxl + 8, 13.6), T(cxl + 8, 16), T(cxl - 4, 16)], '#f4efe2'); line(g, T(cxl - 4, 15.4)[0], T(0, 15.4)[1], T(cxl + 8, 15.4)[0], T(cxl + 8, 15.4)[1], '#9c9488', 1);
        } else { line(g, m0[0], m0[1], T(cxl + 8, 15)[0], T(cxl + 8, 15)[1], '#3a1c18', Math.max(1, Math.round(1.4 * S))); }
        // hoyuelo en el mentón
        px1(g, T(cxl + 2.5, 22)[0], T(0, 22)[1], SKC.d, Math.max(1, Math.round(2 * S)), Math.max(1, Math.round(S)));
      } else {
        px1(g, T(-3, -2)[0], T(0, -2)[1], HRC.k, Math.max(1, Math.round(2 * S)), Math.max(1, Math.round(2 * S))); px1(g, T(8, -2)[0], T(0, -2)[1], HRC.k, Math.max(1, Math.round(2 * S)), Math.max(1, Math.round(2 * S)));
      }
      // pelo: casquete + flequillo + mechones al viento
      var hr = [];
      for (i = 0; i <= 20; i++) { var aa = Math.PI + i / 20 * Math.PI, rxh = 25, ryh = 31; hr.push(T(Math.cos(aa) * rxh + fx * 2.5 + 1, Math.sin(aa) * ryh - 1.5)); }
      hr.push(T(21 + fx * 3, -8)); hr.push(T(15 + fx * 3, -14)); hr.push(T(8, -12)); hr.push(T(2, -17)); hr.push(T(-6, -12)); hr.push(T(-13, -16)); hr.push(T(-20, -6)); hr.push(T(-23, 4));
      poly(g, hr, function (x, y) { var rx = (x - hd[0]) / S, ry = (y - hd[1]) / S; return ry < -20 && rx < 6 ? HRC.hl : ry < -14 && rx < 0 ? HRC.l : rx > 12 ? HRC.d : HRC.m; });
      var nst = S >= .5 ? (P.puff ? 7 : 5) : 2;
      var ANCH = [[-14, -24], [-6, -28], [-19, -16], [-22, -6], [0, -30], [-11, -27], [-21, -11]];
      for (i = 0; i < nst; i++) {
        var an = ANCH[i], Ls = (34 + (i * 7) % 20) * (o.hairLen || 1), pts = [], ph2 = hp + i * 1.9;
        for (var k = 0; k <= 8; k++) { var u = k / 8; pts.push(T(an[0] - u * Ls, an[1] - u * (6 + (i % 3) * 4) + Math.sin(u * 6 + ph2) * (6 + i % 3 * 2) * u * (o.hairWave == null ? 1 : o.hairWave) - Math.pow(u, 3) * 8)); }
        var ow = (10 + (i % 3) * 2) * S, up = [], dn = [];
        for (k = 0; k < pts.length; k++) { var w = ow * Math.pow(1 - k / (pts.length - .2), .8) * .5; up.push([pts[k][0], pts[k][1] - w]); dn.push([pts[k][0], pts[k][1] + w]); }
        poly(g, up.concat(dn.reverse()), HRC.m);
        for (k = 0; k + 1 < pts.length - 2; k++) line(g, pts[k][0], pts[k][1] - ow * .18 * (1 - k / 8), pts[k + 1][0], pts[k + 1][1] - ow * .18 * (1 - k / 8), HRC.l, 1);
      }
      // el niño de las rayas: cinta del arnés (solo sentado)
      if (P.seat) { cap(g, sh[0] - 14 * S, sh[1] - 2 * S, hip[0] - 14 * S, hip[1] + 8 * S, 4 * S, 4 * S, '#2c2530'); cap(g, sh[0] + 14 * S, sh[1] - 2 * S, hip[0] + 14 * S, hip[1] + 8 * S, 4 * S, 4 * S, '#2c2530'); }
    });
    var oc = outlined(c, OUTL);
    return { c: oc, ox: OX * s + 1, oy: OY * s + 1, hand: { l: [hand.l[0] + 1, hand.l[1] + 1], r: [hand.r[0] + 1, hand.r[1] + 1] }, head: [X(P.head[0]) + 1, Y(P.head[1]) + 1] };
  }

  /* ================================================================ ARTE: fondo bajo (arena), polvo, viñeta, y el horneado general ================================================================ */
  function hazy(src, col, a) { var c = mk(src.width, src.height), g = ctx2(c); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = a; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return c; }

  function bakeVignette() {
    return layer(GW, GH, function (g) {
      poly(g, [[0, 0], [GW, 0], [GW, GH], [0, GH]], function (x, y) {
        var dx = (x - GW / 2) / (GW / 2), dy = (y - GH / 2) / (GH / 2), d = Math.pow(Math.max(0, Math.hypot(dx * .9, dy) - .62), 1.6) * 1.1;
        return BAY[(y & 3) * 4 + (x & 3)] < d ? '#0c0a10' : null;
      });
    });
  }
  function bakePuff(r) {
    return layer(r * 2 + 6, r * 2 + 6, function (g, w) {
      var R = RNG(r * 7), c = w / 2, i;
      for (i = 0; i < 9; i++) { var a = R() * TAU, d = R() * r * .55; ell(g, c + Math.cos(a) * d, c + Math.sin(a) * d * .8, r * (.4 + R() * .32), r * (.34 + R() * .28), SAND.d); }
      for (i = 0; i < 9; i++) { var a2 = R() * TAU, d2 = R() * r * .5; ell(g, c + Math.cos(a2) * d2 - 2, c + Math.sin(a2) * d2 * .8 - 2, r * (.3 + R() * .26), r * (.26 + R() * .22), '#d8cbb4'); }
      for (i = 0; i < 4; i++) ell(g, c - r * .25 + R() * 6, c - r * .3 + R() * 4, r * .22, r * .18, '#ece2d0');
    });
  }

  function bakeAll() {
    var A = {}, t0 = (window.performance || Date).now();
    A.sky = bakeSky(); A.ray = bakeRay();
    A.morro1 = hazy(bakeMorro(.85), '#c9a6a0', .16); A.morroB = hazy(bakeMorro(.78), '#c9a6a0', .22);
    A.cliff = bakeCliff(); A.cliffN = bakeCliffN(); A.sea = bakeSea(96);
    A.strip = bakeStrip(640, 1, 5, 262, .3, .5, .32); A.strip2 = bakeStrip(760, 2.4, 6, 330, .8, 1.0, .9);
    A.seaB = bakeSeaB(); A.sandB = bakeStones(); A.far = bakeHeadland(); A.vig = bakeVignette();
    A.gull = [0, 1, 2].map(function (f) { return bakeGull(f, 1); }); A.gullS = [0, 1, 2].map(function (f) { return bakeGull(f, .42); });
    A.cn1 = [-.1, 0, .1].map(function (r) { return bakeCanopy(36, 0, r, false); }); A.cn1lit = bakeCanopy(36, 0, 0, true);
    A.cn2 = [-.08, 0, .08].map(function (r) { return bakeCanopy(72, 0, r, false); });
    A.cn3 = [bakeCanopy(150, 0, 0, false), bakeCanopy(150, .55, 0, false), bakeCanopy(150, .95, .04, false)];
    A.cape = [bakeCape(0), bakeCape(1.7), bakeCape(3.4)];
    A.pil1 = bakeAlex('sit', .17); A.pil2 = [bakeAlex('sit', .4, { hp: 0 }), bakeAlex('sit', .4, { hp: 2 })];
    A.pg = { perch: bakePigeon('perch', 1), puff: bakePigeon('puff', 1.2), fly: [0, 1, 2].map(function (f) { return bakePigeon('fly' + f, 1.1); }), flyS: [0, 1, 2].map(function (f) { return bakePigeon('fly' + f, .5); }), perchL: bakePigeon('perch', 1.15) };
    A.alex = { air: bakeAlex('air', 1, { hp: 1 }), touch: bakeAlex('touch', 1, { hp: 2 }), crouch: bakeAlex('crouch', 1, { hp: 3 }), kneel: bakeAlex('kneel', 1, { hp: 1 }), kneelUp: bakeAlex('kneelUp', 1, { hp: 2 }),
      hero: [0, 2.2, 4.4].map(function (p) { return bakeAlex('hero', 1, { hp: p, jf: p }); }) };
    A.hero = A.alex.hero;
    A.puff = [bakePuff(12), bakePuff(20), bakePuff(30), bakePuff(40)];
    A.ms = Math.round((window.performance || Date).now() - t0);
    return A;
  }

  /* ================================================================ LOS CUATRO PLANOS ================================================================ */
  var G = null;   // contexto de dibujo (la grilla de 480×270 ya escalada ×2)
  function dr(img, x, y) { G.drawImage(img, Math.round(x), Math.round(y)); }
  function rc(c, x, y, w, h) { G.fillStyle = c; G.fillRect(Math.round(x), Math.round(y), w, h); }
  function rcA(c, a, x, y, w, h) { G.globalAlpha = a; rc(c, x, y, w, h); G.globalAlpha = 1; }

  /* parapente completo: ala + cabos + piloto. (cx, top) = centro de la ala y su borde superior; hy = altura de las manos. */
  function drawGlider(cn, cx, top, pil, hy, flip) {
    dr(cn.c, cx - cn.cx, top);
    var px = cx - pil.ox, py = hy - pil.hand.l[1], hl = [px + pil.hand.l[0], py + pil.hand.l[1]], hr = [px + pil.hand.r[0], py + pil.hand.r[1]];
    var us = [-.92, -.7, -.46, -.2, .2, .46, .7, .92];
    for (var i = 0; i < us.length; i++) { var a = cn.att(us[i]), tx = cx - cn.cx + a[0], ty = top + a[1], h = us[i] < 0 ? hl : hr; line(G, tx, ty, h[0], h[1], i % 2 ? '#3a3340' : '#5a4a58'); }
    dr(pil.c, px, py);
  }

  /* ---------- plano 1: el acantilado de Barranco visto desde el mar (casonas, la quebrada de la Bajada, el Puente y La Ermita), el Morro Solar al sur y el parapente chicha bajando en diagonal ---------- */
  var SURF = [[58, 196, 0], [150, 214, 1.3], [306, 203, 2.1], [418, 226, .6], [520, 199, 3.2], [90, 240, 4.1]];   // surfistas de Barranquito (chiquitos)
  function surfers(t, cam, fac) {
    for (var i = 0; i < SURF.length; i++) {
      var s = SURF[i], sx = ((s[0] - cam * fac) % 640 + 640) % 640 - 60, sy = s[1] + Math.sin(t * 1.3 + s[2]) * 1, big = s[1] > 222 ? 1 : 0;
      if (sx < -6 || sx > GW + 6) continue;
      rcA('#2a4a5e', .4, sx - 4, sy + 3 + big, 9 + big * 3, 1);
      rc('#f4f0e4', sx - 3 - big, sy + 2 + big, 7 + big * 2, 1 + big); rc(['#2a2a30', '#2a2a30', '#c8553d', '#2f6fc0'][i % 4], sx, sy - 1, 1 + big, 3 + big); rc('#b8825a', sx, sy - 2 - big, 1 + big, 1 + big);
    }
  }
  function swells(t, cam, y0, y1, seed, fac0, fac1) {   // olas que rompen cerca de la orilla: rayitas de espuma que crecen hacia el que mira
    var R = RNG(seed);
    for (var i = 0; i < 46; i++) {
      var f = R(), y = y0 + f * (y1 - y0), fac = lerp(fac0, fac1, f), len = 6 + f * 40 * (.5 + R()), x0 = R() * 900;
      var x = ((x0 - cam * fac + Math.sin(t * .7 + i) * 3) % 600 + 600) % 600 - 60;
      rcA(FOAM, .25 + f * .45, x, y + Math.sin(t * 1.1 + i * 2) * (.5 + f), len, 1 + (f > .6 ? 1 : 0));
    }
  }
  function seaGlints(t, cx, y0, y1, n, seed) {
    var R = RNG(seed);
    for (var i = 0; i < n; i++) { var x = cx + (R() - .5) * 150 * (.6 + (R() * (y1 - y0)) / (y1 - y0)), y = y0 + R() * (y1 - y0), ph = R() * 6.28; if (Math.sin(t * 4.2 + ph) > .55) rc(i % 3 ? '#ffe0a0' : '#fff4d8', x, y, 2 + (i & 1), 1); }
  }
  function rayCx(y, off) { var f = (y - (BREAK.y + 18)) / (252 - (BREAK.y + 18)); return BREAK.x - 4 + 118 * f + off; }

  function shot1(t) {
    var A = ART, u = t / (T.s2 - T.s1), cam = lerp(0, 44, eio(u)), i;
    dr(A.sky, -cam * .15, 0); rc('#46707f', 0, 150, GW, GH - 150);
    dr(A.morro1, 250 - cam * .5, 16); dr(A.cliff, -cam * .5, 76);
    dr(A.sea, -cam * .9, 178); dr(A.strip, -cam * .6, 152 - A.strip.roadY);
    swells(t, cam, 186, 262, 3, .9, 1.4);
    seaGlints(t, 262 - cam * .3, 184, 262, 26, 3);
    surfers(t, cam, 1.0);
    // gaviotas lejanas
    for (i = 0; i < 7; i++) { var gx = ((i * 83 + t * (14 + i * 3)) % 560) - 40, gy = 70 + (i * 37 % 60) + Math.sin(t * 1.3 + i) * 6; dr(A.gullS[(Math.floor(t * 5 + i) % 4) === 3 ? 1 : Math.floor(t * 5 + i) % 3], gx, gy); }
    // el parapente: baja en diagonal, cruza el rayo y se enciende
    var gx2 = lerp(14, 336, Math.pow(u, .9)), gy2 = lerp(14, 108, u) + Math.sin(t * 1.7) * 2.2, roll = Math.sin(t * .9), fi = roll > .35 ? 2 : roll < -.35 ? 0 : 1;
    var rcx = rayCx(gy2 + 12, -cam * .15), half = lerp(21, 31, clamp((gy2 + 12 - 68) / 184, 0, 1)), lit = Math.abs(gx2 - rcx) < half;
    var cn = lit ? A.cn1lit : A.cn1[fi];
    drawGlider(cn, gx2, gy2, A.pil1, gy2 + cn.h + 12 + Math.sin(t * 1.7 + 1) * .8);
    // el único rayo de sol del juego
    G.globalAlpha = .46 + .06 * Math.sin(t * 2.3); dr(A.ray, -cam * .15, 0); G.globalAlpha = 1;
  }

  /* ---------- plano 2: plano medio sobre la orilla de piedras: los restaurantes de playa y el puente peatonal del Circuito de Playas; las gaviotas se abren ---------- */
  var GULLS = null;
  function gullList() {
    if (GULLS) return GULLS;
    var R = RNG(31), L = [];
    for (var i = 0; i < 13; i++) { var sg = R() < .5 ? -1 : 1; L.push({ x: 150 + R() * 300, y: 168 + R() * 24, vx: sg * (40 + R() * 110), vy: -(60 + R() * 120), ph: R() * 6, d: R() * .35 }); }
    return (GULLS = L);
  }
  function shot2(t) {
    var A = ART, u = t / (T.s3 - T.s2), cam = lerp(10, 130, eio(u)), i;
    dr(A.sky, -cam * .12 - 20, 0); rc('#46707f', 0, 150, GW, GH - 150);
    dr(A.morro1, 250 - cam * .45, 16); dr(A.cliff, -cam * .4 - 10, 76);
    dr(A.sea, -cam * .95, 194); dr(A.strip2, -cam * 1.0, 196 - A.strip2.waterY);
    swells(t, cam, 204, 272, 9, 1.0, 1.7);
    seaGlints(t, 250, 200, 262, 22, 9);
    surfers(t, cam, 1.1);
    // gaviotas: andan sobre las piedras y se abren cuando pasa el parapente
    var gl = gullList(), ts = 1.55;
    for (i = 0; i < gl.length; i++) {
      var gg = gl[i], d = Math.max(0, t - ts - gg.d), x0 = gg.x - cam * 1.0, y0 = gg.y, gxp, gyp, fr2;
      if (d <= 0) { gxp = x0 + Math.sin(t * .9 + gg.ph) * 8; gyp = y0 + Math.cos(t * 1.3 + gg.ph) * 3; fr2 = Math.floor(t * 4 + gg.ph) % 3; }
      else { gxp = x0 + gg.vx * d * (1 - .25 * d / 3); gyp = y0 + gg.vy * d + 18 * d * d; fr2 = Math.floor(t * 12 + gg.ph) % 3; }
      dr(A.gull[fr2], gxp - 17, gyp - 11);
      if (d > 0 && d < 1.2 && i % 3 === 0) { rc('#f6f6f4', gxp - 4 + Math.sin(d * 9 + i) * 3, gyp + 9 + d * 26, 2, 1); rc('#e2e4e8', gxp + 3 + Math.sin(d * 7 + i) * 2, gyp + 15 + d * 20, 1, 2); }
    }
    // parapente, de frente, planeando; Titina lo acompaña
    var gx = lerp(40, 296, eio(u)), gy = lerp(6, 36, u) + Math.sin(t * 1.5) * 2, roll = Math.sin(t * .8 + .6), fi = roll > .35 ? 2 : roll < -.35 ? 0 : 1;
    var pil = A.pil2[Math.floor(t * 2.2) % 2], cn = A.cn2[fi];
    drawGlider(cn, gx, gy, pil, gy + cn.h + 58 + Math.sin(t * 1.5 + 1) * 1.2);
    if (t > .35) { var te = clamp((t - .35) / 1.1, 0, 1), px = lerp(GW + 40, gx + 104, eout(te)) + Math.sin(t * 2) * 3, py = gy + 78 + Math.sin(t * 2.6) * 6 - (1 - te) * 30, pg = A.pg.fly[Math.floor(t * 9) % 3]; dr(pg.c, px - pg.ox, py - pg.oy); }
    // chispas de viento
    for (i = 0; i < 9; i++) { var wx = ((i * 71 - t * 520) % 620 + 620) % 620 - 70, wy = 28 + (i * 53 % 190); rcA('#ffffff', .22, wx, wy, 26 + (i % 3) * 12, 1); }
  }

  /* ---------- fondos bajos (planos 3 y 4) ---------- */
  // plano 3 (mirando al mar): cielo de atardecer, el Morro Solar con su cruz, el mar y el cabo de Barranco a la izquierda
  function backLow(t, camY) {
    var A = ART;
    camY = camY || 0;
    dr(A.sky, -50, -2 + camY * .4); rc('#fde6b8', 0, 168 + Math.round(camY * .4), GW, 8);
    dr(A.morroB, -30, 20 + camY * .7);
    dr(A.seaB, 0, 170 + camY * .8);
    // brillo del rayo sobre el mar
    var R = RNG(5); for (var i = 0; i < 26; i++) { var x = 210 + R() * 200, y = 176 + R() * 28, ph = R() * 6.28; if (Math.sin(t * 3.6 + ph) > .5) rc('#ffe0a0', x, y + camY * .8, 2 + (i & 1), 1); }
    dr(A.far, 0, 150 + camY);
    dr(A.sandB, 0, 204 + camY);
    // olitas que lamen la orilla de piedras
    for (i = 0; i < 14; i++) { var wx = (i * 37 + Math.sin(t * .8 + i) * 6) % 480, wy = 204 + camY + Math.round(1.5 + Math.sin(t * 1.2 + i * .7) * 1.4); rc(FOAM, wx, wy, 8 + (i % 3) * 3, 1); }
  }
  // plano 4 (de espaldas al mar, mirando a Barranco): el Morro Solar al fondo, el acantilado con casonas, la Bajada, el Puente y La Ermita, el Circuito de Playas y las piedras
  function backHigh(t) {
    var A = ART;
    dr(A.sky, -50, -2); rc('#fde6b8', 0, 168, GW, 8);
    dr(A.morroB, -2, 16);
    dr(A.cliffN, 0, 78);
    G.drawImage(A.sandB, 0, 13, 480, 59, 0, 207, 480, 59);   // las piedras, sin la franja mojada de la orilla
  }


  var SANDP = null;
  function sandParts() {
    if (SANDP) return SANDP;
    var R = RNG(123), L = [];
    for (var i = 0; i < 110; i++) { var a = -Math.PI * (.05 + R() * .9), sp = 30 + R() * 190, hz = Math.cos(a) * sp * (.9 + R() * .5); L.push({ vx: hz, vy: Math.sin(a) * sp * 1.1, sz: 1 + ((R() * 3) | 0) + (i % 5 === 0 ? 1 : 0), c: i % 3 === 0 ? SAND.l : (R() < .5 ? SAND.m : (R() < .5 ? SAND.d : SAND.dd)), life: .9 + R() * .9 }); }   // polvo de piedra y piedritas (canto rodado)
    return (SANDP = L);
  }
  function sandBurst(d, fx, fy, front) {
    var A = ART, i;
    if (d < 0) return;
    if (!front) {   // nube de arena detrás de los pies
      for (i = 0; i < 11; i++) {
        var dd = d - i * .018; if (dd < 0 || dd > 1.9) continue;
        var dir = i % 2 ? 1 : -1, ox = dir * (10 + (i >> 1) * 13) * eout(clamp(dd / 1.0, 0, 1)), oy = -6 - (i % 4) * 7 * eout(clamp(dd / 1.2, 0, 1)) - dd * 9;
        var si = Math.min(3, Math.floor(dd * 2.1 + (i & 1)));
        G.globalAlpha = clamp(1.25 - dd / 1.7, 0, 1) * .9; dr(A.puff[si], fx + ox - A.puff[si].width / 2, fy + oy - A.puff[si].height / 2); G.globalAlpha = 1;
      }
      return;
    }
    for (i = 0; i < 7; i++) {   // polvo que sale rodando por delante, a ras del suelo
      var d2 = d - i * .03; if (d2 < 0 || d2 > 1.7) continue;
      var dir2 = i % 2 ? 1 : -1, ox2 = dir2 * (24 + (i >> 1) * 22) * eout(clamp(d2 / .9, 0, 1)), si2 = Math.min(3, Math.floor(d2 * 2.3));
      G.globalAlpha = clamp(1.1 - d2 / 1.5, 0, 1) * .75; dr(A.puff[si2], fx + ox2 - A.puff[si2].width / 2, fy - A.puff[si2].height / 2 + 3 - d2 * 5); G.globalAlpha = 1;
    }
    var P = sandParts();
    for (i = 0; i < P.length; i++) {
      var p = P[i], tt = d; if (tt > p.life) continue;
      var x = fx + p.vx * tt * (1 - .35 * tt), y = fy - 4 + p.vy * tt + 170 * tt * tt * .5; if (y > fy + 3) y = fy + 3 - (y - fy - 3) * .45;   // las piedritas rebotan
      var sz = p.sz * (1 - tt / p.life * .5); G.fillStyle = p.c; G.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(sz)), Math.max(1, Math.round(sz)));
    }
  }

  /* ---------- plano 3: contrapicado del aterrizaje heroico ---------- */
  var GX = 258, GY = 246;
  function shot3(t) {
    var A = ART, i, tt = T.touch;
    var shk = (t > tt && t < tt + .5) ? (1 - (t - tt) / .5) : 0, sx = Math.round(Math.sin(t * 90) * 3 * shk), sy = Math.round(Math.cos(t * 77) * 3 * shk);
    G.save(); G.translate(sx, sy);
    backLow(t, 0);
    var air = t < tt, sway = Math.sin(t * 3.1) * (air ? 5 : 0), fy = air ? lerp(-60, GY, Math.pow(t / tt, 1.3)) : GY, fxp = GX + sway;
    var name = air ? 'air' : t < tt + .22 ? 'touch' : t < tt + .5 ? 'crouch' : t < 3.0 ? 'kneel' : 'kneelUp', al = A.alex[name];
    var capeA = clamp((t - 2.45) / .7, 0, 1);
    // --- la vela: arriba mientras baja; luego se desinfla y cae detrás, como una capa ---
    var shx = fxp + 8, shy = GY - 104;
    if (air) {
      var cnA = A.cn3[0], hy = fy - 226 * 1, cy = hy - 64 - cnA.h, ccx = fxp - 14;
      drawCanopyOnly(cnA, ccx, cy, [al.hand.l[0] - al.ox + fxp, al.hand.l[1] - al.oy + fy], [al.hand.r[0] - al.ox + fxp, al.hand.r[1] - al.oy + fy]);
    } else if (t < 2.0) {
      var q = ramp(t, tt, 2.0), cnB = q < .45 ? A.cn3[1] : A.cn3[2], cy2 = lerp(-150, 18, eout(q)), cx2 = lerp(fxp - 14, fxp - 76, eout(q));
      drawCanopyOnly(cnB, cx2, cy2, [shx - 18, shy + 6], [shx + 12, shy + 6]);
    } else if (t < 3.3) {
      var q2 = ramp(t, 2.0, 2.9);
      G.globalAlpha = 1 - capeA; var cnC = A.cn3[2], cy3 = lerp(18, 84, eout(q2)), cx3 = lerp(fxp - 76, fxp - 96, eout(q2));
      drawCanopyOnly(cnC, cx3, cy3, [shx - 18, shy + 6], [shx + 12, shy + 6]); G.globalAlpha = 1;
    }
    if (t >= 2.45) { var cp = A.cape[Math.floor(t * 4.5) % 3], fall = (1 - capeA) * 46; G.globalAlpha = capeA; dr(cp.c, shx - cp.ax + 4, shy - cp.ay + 8 - fall); G.globalAlpha = 1; }
    // --- polvo trasero ---
    sandBurst(t - tt, fxp, GY, false);
    // --- Alexander ---
    dr(al.c, fxp - al.ox, fy - al.oy);
    // --- Titina baja en picada y aterriza en su hombro ---
    var tx = GX + 50, ty = GY - 118;
    if (t > 2.55 && t < 3.5) {
      var s = ramp(t, 2.55, 3.5), px = lerp(GW + 50, tx, eout(s)), py = lerp(-34, ty, s * s * (3 - 2 * s)) - Math.sin(s * Math.PI) * 26, pf = s > .86 ? A.pg.fly[2] : A.pg.fly[Math.floor(t * 13) % 3];
      dr(pf.c, px - pf.ox, py - pf.oy);
    } else if (t >= 3.5) {
      var pr = A.pg.perch, bob = Math.round(Math.sin((t - 3.5) * 5) * .6 * Math.exp(-(t - 3.5) * 1.5));
      dr(pr.c, tx - pr.ox, ty - pr.oy + 4 + bob);
      for (i = 0; i < 4; i++) { var fd = t - 3.5 - i * .12; if (fd > 0 && fd < 1.4) rc(i % 2 ? '#c5c9cf' : '#e2e4e8', tx - 16 + i * 8 + Math.sin(fd * 6 + i) * 5, ty + 6 + fd * 34, 2, 1); }
    }
    sandBurst(t - tt, fxp + 6, GY, true);
    // polvito lateral que sigue flotando
    G.restore();
    G.globalAlpha = .36 + .04 * Math.sin(t * 2); dr(A.ray, -50, 0); G.globalAlpha = 1;
  }
  function drawCanopyOnly(cn, cx, top, hl, hr) {
    dr(cn.c, cx - cn.cx, top);
    var us = [-.92, -.7, -.46, -.2, .2, .46, .7, .92];
    for (var i = 0; i < us.length; i++) { var a = cn.att(us[i]), tx = cx - cn.cx + a[0], ty = top + a[1], h = us[i] < 0 ? hl : hr; line(G, tx, ty, h[0], h[1], i % 2 ? '#3a3340' : '#5a4a58'); }
  }

  /* ---------- plano 4: de pie, pose heroica cómica, pelo al viento ---------- */
  var WINDP = null;
  function windParts() {
    if (WINDP) return WINDP;
    var R = RNG(55), L = []; for (var i = 0; i < 44; i++) L.push({ x: R() * 560, y: 150 + R() * 118, sp: 160 + R() * 280, l: 2 + ((R() * 9) | 0), c: R() < .5 ? SAND.l : SAND.m, a: .35 + R() * .5 });
    return (WINDP = L);
  }
  var HX = 336, HY = 258;
  function shot4(t) {
    var A = ART, i, u = t, rise = Math.round(Math.min(u, 6) * 1.1);
    backHigh(t);
    var shx = HX + 3, shy = HY - 152 + rise * 0, fr = [0, 1, 2, 1][Math.floor(u * 7) % 4], al = A.hero[fr];
    // la vela hecha capa: sale de sus hombros y flamea hacia atrás (a la izquierda)
    var cp = A.cape[Math.floor(u * 5) % 3];
    dr(cp.c, shx - cp.ax - 6, shy - cp.ay + 12 + Math.round(Math.sin(u * 3) * 2));
    // sombra sobre las piedras
    rcA('#3a342c', .4, HX - 40, HY - 2, 78, 4); rcA('#3a342c', .3, HX - 28, HY - 4, 54, 2);
    var by = Math.round(Math.sin(u * 2.2) * 1);   // respira (pecho inflado)
    dr(al.c, HX - al.ox, HY - al.oy + by);
    // Titina, inflada y con ceja fruncida, copiando la pose
    var pr = ((Math.sin(u * 3.4) > -.1) ? A.pg.puff : A.pg.perchL), tx = HX + 47, ty = HY - 143 + by;
    dr(pr.c, tx - pr.ox, ty - pr.oy + (pr === A.pg.puff ? 0 : 1));
    // destello en el diente
    var sp = u - 1.5;
    if (sp > 0 && sp < .55) { var k = Math.sin(sp / .55 * Math.PI), sxp = A.hero ? HX + 14 : 0, syp = HY - 160 + by; rc('#ffffff', sxp, syp - 5 * k, 1, Math.round(10 * k)); rc('#ffffff', sxp - 5 * k, syp, Math.round(10 * k), 1); rc('#fffbe0', sxp - 1, syp - 1, 3, 3); }
    // viento: granos de arena y el rayo
    var W = windParts();
    for (i = 0; i < W.length; i++) { var p = W[i], x = ((p.x - u * p.sp) % 560 + 560) % 560 - 40; rcA(p.c, p.a, x, p.y + Math.sin(u * 3 + i) * 2, p.l, 1); }
    for (i = 0; i < 5; i++) { var gx = ((i * 97 + u * (16 + i * 4)) % 560) - 40, gy = 40 + i * 22 + Math.sin(u * 1.2 + i) * 6; dr(A.gullS[Math.floor(u * 5 + i) % 3], gx, gy); }
    G.globalAlpha = .34 + .05 * Math.sin(u * 2); dr(A.ray, -50, 0); G.globalAlpha = 1;
  }

  /* ================================================================ AUDIO: tema heroico propio (Web Audio) =====================================================
     Si existe ACH.audio.cv.play (C3, surf.js) se pide 'cv.heroe' y no se usa nada de esto (salvo opts.ownMusic). Si no, este tema:
     120 bpm (compás = 2 s), re mayor, surf rock épico con rasgueo criollo. Línea de tiempo (s): 0–4 viento y arpegio de nylon sobre Si menor; 4–8,75 entra la batería surf
     y la guitarra con trémolo canta la melodía; 8,75–10 subida (rulo de caja + barrido de ruido); 10 golpe del aterrizaje (timbal, platillo, bajo profundo);
     10–14 rasgueos amplios y metales heroicos en medio tiempo; 14 acorde tutti de Re mayor (plano heroico); 18 baja a un vals suave en bucle para el diálogo. */
  var AU = null, AU_OWN = null;
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function auCtx() {
    var A = ACH.audio;
    if (A && A.ctx) return A.ctx;
    if (!AU_OWN) { var C = window.AudioContext || window.webkitAudioContext; if (C) { try { AU_OWN = new C(); } catch (e) { AU_OWN = null; } } }
    return AU_OWN;
  }
  function auNoise(c) {
    if (AU && AU.nb) return AU.nb;
    var n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0), r = RNG(99);
    for (var i = 0; i < n; i++) d[i] = r() * 2 - 1;
    return b;
  }
  function auIR(c) {
    var len = Math.floor(c.sampleRate * 1.9), b = c.createBuffer(2, len, c.sampleRate), r = RNG(7);
    for (var ch = 0; ch < 2; ch++) { var d = b.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    return b;
  }
  function V(type, f, at, dur, peak, o) {   // una voz: oscilador → filtro → envolvente → (seco + reverb)
    var c = AU.c; o = o || {};
    var osc = c.createOscillator(), flt = c.createBiquadFilter(), g = c.createGain();
    osc.type = type; osc.frequency.setValueAtTime(f, at); if (o.det) osc.detune.value = o.det;
    if (o.glide) osc.frequency.exponentialRampToValueAtTime(o.glide, at + dur * (o.gl || .8));
    flt.type = o.ft || 'lowpass'; flt.Q.value = o.q || .7; flt.frequency.setValueAtTime(o.lp || 3000, at);
    if (o.lp2) flt.frequency.exponentialRampToValueAtTime(o.lp2, at + dur * .9);
    var a = o.a == null ? .004 : o.a, rel = o.rel == null ? Math.min(.08, dur * .3) : o.rel;
    g.gain.setValueAtTime(.0001, at); g.gain.linearRampToValueAtTime(peak, at + a);
    if (o.sus != null) { g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak * o.sus), at + Math.max(a + .01, dur - rel)); } else { g.gain.exponentialRampToValueAtTime(.0002, at + dur); }
    g.gain.linearRampToValueAtTime(0, at + dur + rel);
    var last = g;
    if (o.trem) {
      var lfo = c.createOscillator(), lg = c.createGain(), tg = c.createGain(); lfo.frequency.value = o.trem; lg.gain.value = (o.td == null ? .45 : o.td) * .5; tg.gain.value = 1 - (o.td == null ? .45 : o.td) * .5;
      lfo.connect(lg); lg.connect(tg.gain); g.connect(tg); last = tg; lfo.start(at); lfo.stop(at + dur + rel + .05);
    }
    osc.connect(flt); flt.connect(g); last.connect(AU.dry);
    if (o.wet) { var w = c.createGain(); w.gain.value = o.wet; last.connect(w); w.connect(AU.verb); }
    if (o.dly) { var dg = c.createGain(); dg.gain.value = o.dly; last.connect(dg); dg.connect(AU.delay); }
    osc.start(at); osc.stop(at + dur + rel + .05);
  }
  function N(at, dur, peak, o) {   // ráfaga de ruido filtrada
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
  function pluck(m, at, dur, pk, o) { o = o || {}; var f = mtof(m); V('sawtooth', f, at, dur, pk * .5, { lp: o.lp || 2600, lp2: 420, wet: .28, a: .003, rel: .05, det: 4 }); V('triangle', f * 2, at, dur * .6, pk * .22, { lp: 3400, lp2: 800, a: .002, rel: .03 }); V('sine', f, at, dur, pk * .35, { lp: 1800, a: .004 }); }
  function strum(ms, at, pk, dur, up) { var n = ms.length; for (var i = 0; i < n; i++) pluck(ms[up ? n - 1 - i : i], at + i * .018, dur, pk * (1 - i * .04)); }
  function chop(ms, at, pk) { for (var i = 0; i < ms.length; i++) V('sawtooth', mtof(ms[i]), at + i * .008, .1, pk * .4, { lp: 1400, lp2: 500, a: .002, rel: .02 }); N(at, .08, pk * .25, { f: 3200, q: 1.2 }); }
  function lead(m, at, dur, pk) { var f = mtof(m); V('sawtooth', f, at, dur, pk, { lp: 3600, lp2: 2200, a: .02, sus: .8, rel: .12, trem: 13, td: .55, wet: .35, dly: .3, det: 6, glide: f, gl: .01 }); V('square', f * .5, at, dur, pk * .25, { lp: 1500, a: .02, sus: .8, rel: .1, trem: 13, td: .5 }); }
  function brass(ms, at, dur, pk) { for (var i = 0; i < ms.length; i++) { var f = mtof(ms[i]); V('sawtooth', f, at, dur, pk, { lp: 900, lp2: 2600, a: .07, sus: .85, rel: .25, wet: .3, det: -5 }); V('sawtooth', f, at, dur, pk * .8, { lp: 900, lp2: 2600, a: .07, sus: .85, rel: .25, det: 6 }); } }
  function bass(m, at, dur, pk) { var f = mtof(m); V('triangle', f, at, dur, pk, { lp: 700, a: .005, rel: .03 }); V('sine', f, at, dur, pk * .6, { a: .005 }); }
  function kick(at, pk) { V('sine', 140, at, .24, pk, { glide: 42, gl: .45, a: .001, lp: 600, rel: .02 }); N(at, .03, pk * .3, { f: 1800, q: .5 }); }
  function snare(at, pk) { N(at, .17, pk, { f: 2300, q: .7, a: .001 }); V('triangle', 200, at, .1, pk * .35, { glide: 150, a: .001, lp: 900, rel: .02 }); }
  function hat(at, pk, open) { N(at, open ? .18 : .045, pk, { ft: 'highpass', f: 7200, q: .5, a: .001 }); }
  function crash(at, pk) { N(at, 1.9, pk, { ft: 'highpass', f: 3800, q: .5, wet: .35 }); N(at, .5, pk * .4, { f: 6200, q: .6 }); }
  function timp(at, pk, m) { var f = mtof(m || 38); V('sine', f * 1.5, at, 1.3, pk, { glide: f, gl: .12, a: .003, lp: 500, rel: .1, wet: .25 }); N(at, .06, pk * .3, { f: 400, q: .8 }); }
  function riser(at, dur, pk) { N(at, dur, pk, { f: 350, f2: 6800, q: 2.2, a: dur * .5, swell: true, wet: .15 }); }
  function whoosh(at, pk) { N(at, .32, pk, { f: 500, f2: 3800, q: 1.4, a: .1, wet: .1 }); }
  function gull(at, pk) { V('sine', 1500, at, .26, pk, { glide: 2300, gl: .3, a: .02, lp: 4000, wet: .2 }); V('sine', 2300, at + .12, .2, pk * .7, { glide: 1500, gl: .8, a: .01, lp: 4000 }); }

  var CH = { Bm: [47, 54, 59, 62, 66], D: [50, 57, 62, 66, 69], G: [43, 50, 55, 59, 62], A: [45, 52, 57, 61, 64], Em: [52, 55, 59, 64] };
  var ROOT = { Bm: 35, D: 38, G: 43, A: 45 };
  function auSchedule(off) {
    var A0 = AU.A0, E = function (te, fn) { if (te >= off - .001) fn(A0 + te); }, bar = 2, b = .5, i, k;
    // viento de mar de fondo (0 → 12 s) y arpegio de nylon inicial sobre Si menor
    if (off < 1) { N(A0, 13, .16, { f: 520, q: .6, swell: true, a: 2, wet: .3 }); V('sawtooth', mtof(38), A0, 4.6, .05, { lp: 380, a: 1.6, sus: .9, rel: 1, wet: .5, det: 7 }); V('sawtooth', mtof(45), A0 + .3, 4.3, .04, { lp: 420, a: 1.6, sus: .9, rel: 1, wet: .5, det: -6 }); }
    [[.6, 59], [1.1, 66], [1.6, 62], [2.1, 71], [2.6, 66], [3.1, 69], [3.5, 74]].forEach(function (n) { E(n[0], function (t) { pluck(n[1] + 0, t, 1.4, .24); }); });
    E(3.5, function (t) { strum(CH.D, t + .5, .3, 1.8); });
    // ---------- batería y rasgueo surf: compases 3–5 (4–10 s) ----------
    var prog = [['D', 4], ['A', 6], ['Bm', 8]];
    prog.forEach(function (p) {
      var t0 = p[1], ch = p[0];
      for (k = 0; k < 8; k++) E(t0 + k * .25, function (t) { var kk = Math.round((t - A0 - t0) / .25); bass(ROOT[ch] + (kk % 4 === 2 ? 12 : 0), t, .22, .34); hat(t, kk % 2 ? .05 : .09); });
      E(t0, function (t) { kick(t, .8); }); E(t0 + 1, function (t) { kick(t, .7); }); E(t0 + 1.75, function (t) { kick(t, .45); });
      E(t0 + .5, function (t) { snare(t, .5); }); E(t0 + 1.5, function (t) { snare(t, .5); });
      E(t0, function (t) { strum(CH[ch], t, .3, 1.0); }); E(t0 + 1, function (t) { strum(CH[ch], t, .26, .9, true); });
      E(t0 + .75, function (t) { chop(CH[ch].slice(1), t, .3); }); E(t0 + 1.75, function (t) { chop(CH[ch].slice(1), t, .3); });
    });
    // melodía de la guitarra surf (trémolo): [midi, compás(s), pulso, duración(pulsos)]
    var mel = [[74, 4, 0, 1.5], [78, 4, 1.5, .5], [81, 4, 2, 2], [79, 6, 0, 1.5], [78, 6, 1.5, .5], [76, 6, 2, 1], [73, 6, 3, 1], [71, 8, 0, 1.5], [74, 8, 1.5, .5], [78, 8, 2, 1], [76, 8, 3, .5], [74, 8, 3.5, .5]];
    mel.forEach(function (n) { E(n[1] + n[2] * b, function (t) { lead(n[0], t, n[3] * b * .96, .2); }); });
    // ---------- subida (8,75 → 10) ----------
    E(8.75, function (t) { riser(t, 1.25, .5); });
    for (i = 0; i < 12; i++) E(9 + i * (1 / 12) * 1 + (i * i) * 0, function (t) { snare(t, .2 + (t - A0 - 9) * .38); });
    E(9.9, function (t) { kick(t, .6); });
    // ---------- compás 6: el golpe del aterrizaje (10 s) ----------
    E(10, function (t) { kick(t, 1); timp(t, .9, 38); crash(t, .55); V('sine', 48, t, 1.2, .8, { glide: 32, gl: .9, a: .002, lp: 200, wet: .2 }); N(t, .55, .5, { f: 900, f2: 200, q: .6, wet: .2 }); strum(CH.G, t, .38, 2.2); });
    E(10.7, function (t) { N(t, .45, .22, { f: 700, f2: 300, q: .5 }); }); E(11.5, function (t) { N(t, .5, .2, { f: 600, f2: 260, q: .5 }); });
    E(11.0, function (t) { strum(CH.G, t, .28, 2.0, true); }); E(11.5, function (t) { pluck(74, t, 1.5, .2); });
    E(10, function (t) { brass([55, 59, 62], t, 1.9, .075); }); E(10, function (t) { lead(79, t + .02, 1.9, .16); });
    E(12, function (t) { lead(78, t, .96, .15); }); E(12.98, function (t) { lead(74, t, .96, .15); });
    E(11.9, function (t) { timp(t, .5, 43); });
    // ---------- compás 7: sube hacia el plano heroico ----------
    E(12, function (t) { strum(CH.A, t, .32, 1.8); brass([57, 61, 64], t, 1.9, .07); timp(t, .6, 45); });
    E(12, function (t) { lead(76, t, .45, .16); }); E(12.5, function (t) { lead(81, t, .45, .16); }); E(13, function (t) { lead(85, t, .9, .18); }); E(13.5, function (t) { lead(83, t, .45, .16); });
    E(12.6, function (t) { riser(t, 1.4, .6); });
    for (i = 0; i < 16; i++) E(13 + i * .0625 * 1, function (t) { snare(t, .16 + (t - A0 - 13) * .55); });
    E(13.5, function (t) { timp(t, .8, 45); }); E(13.75, function (t) { timp(t, .9, 45); });
    // ---------- compás 8: tutti (14 s) ----------
    E(14, function (t) { kick(t, 1); crash(t, .8); timp(t, 1, 38); snare(t, .7); brass([50, 57, 62, 66, 69], t, 2.6, .1); strum(CH.D, t, .42, 2.4); bass(26, t, 1.9, .5); lead(86, t + .02, 2.4, .2); V('sine', 62, t, 1.4, .7, { glide: 38, gl: .8, a: .002, lp: 200 }); });
    E(15.5, function (t) { V('sine', 3100, t, .35, .12, { a: .002, wet: .3, lp: 6000 }); V('sine', 4650, t, .25, .06, { a: .002, wet: .3, lp: 8000 }); });   // el «tin» del diente
    E(16, function (t) { lead(83, t, 1.9, .16); });
    [['G', 16], ['A', 17]].forEach(function (p) { var t0 = p[1], ch = p[0]; E(t0, function (t) { strum(CH[ch], t, .3, 1.0); }); E(t0 + .5, function (t) { chop(CH[ch].slice(1), t, .26); }); });
    for (k = 0; k < 16; k++) E(16 + k * .25, function (t) { var kk = Math.round((t - A0 - 16) / .25); bass(kk < 8 ? 43 + (kk % 4 === 2 ? 12 : 0) : 45 + (kk % 4 === 2 ? 12 : 0), t, .22, .3); hat(t, kk % 2 ? .05 : .08); });
    [16, 17, 18].forEach(function (x) { E(x, function (t) { kick(t, .7); }); }); [16.5, 17.5].forEach(function (x) { E(x, function (t) { snare(t, .45); }); });
    E(16.35, function (t) { V('sine', 430, t, .2, .12, { glide: 330, a: .02, lp: 1200, wet: .2 }); V('sine', 430, t + .24, .2, .1, { glide: 330, a: .02, lp: 1200, wet: .2 }); });   // «gurú-gurú»
    // ---------- compás 10 en adelante: vals suave en bucle para el diálogo ----------
    var vam = ['D', 'A', 'Bm', 'G'];
    for (var bi = 0; bi < 22; bi++) {
      var tb = 18 + bi * 2, cc = vam[bi % 4];
      (function (tb, cc) {
        E(tb, function (t) { var ms = CH[cc]; for (var j = 0; j < 8; j++) pluck(ms[j % ms.length] + (j > 4 ? 12 : 0), t + j * .25, .8, .12); bass(ROOT[cc], t, 1.9, .16); V('sawtooth', mtof(ROOT[cc] + 24), t, 2, .018, { lp: 700, a: .6, sus: .8, rel: .6, wet: .5 }); });
      })(tb, cc);
    }
    // ---------- efectos sueltos ----------
    E(4.0, function (t) { whoosh(t, .12); }); E(8.75, function (t) { whoosh(t, .14); }); E(14.0, function (t) { whoosh(t, .12); });
    [5.55, 5.8, 6.1, 6.35, 6.6].forEach(function (x) { E(x, function (t) { gull(t, .07); }); });
    for (i = 0; i < 9; i++) E(11.35 + i * .075, function (t) { N(t, .05, .11, { f: 900, q: .8 }); });
  }

  var Aud = {
    start: function (off) {
      off = off || 0;
      var o = L && L.opts || {};
      if (!o.ownMusic && ACH.audio && ACH.audio.cv && typeof ACH.audio.cv.play === 'function') {
        try { var r = ACH.audio.cv.play('cv.heroe'); if (r !== false) { AU = { ext: true }; return; } } catch (e) { warn('cv.heroe', e); }
      }
      var c = auCtx(); if (!c) return;
      try { if (c.state === 'suspended') c.resume(); } catch (e) { /* nada */ }
      var A = ACH.audio, dest = (A && A.ctx === c && A.bus && A.bus.music) ? A.bus.music : c.destination;
      var master = c.createGain(), comp = c.createDynamicsCompressor(), verb = c.createConvolver(), vg = c.createGain(), dl = c.createDelay(.6), dfb = c.createGain(), dg = c.createGain();
      master.gain.value = .0001; master.gain.linearRampToValueAtTime(.8, c.currentTime + .08);
      comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = .005; comp.release.value = .2;
      master.connect(comp); comp.connect(dest);
      verb.buffer = auIR(c); vg.gain.value = .7; verb.connect(vg); vg.connect(master);
      dl.delayTime.value = .375; dfb.gain.value = .32; dg.gain.value = .5; dl.connect(dfb); dfb.connect(dl); dl.connect(dg); dg.connect(master); dl.connect(verb);
      var dry = c.createGain(); dry.gain.value = 1; dry.connect(master);
      var vin = c.createGain(); vin.connect(verb);
      AU = { c: c, master: master, dry: dry, verb: vin, delay: dl, A0: c.currentTime + .06 - off, nb: null, ext: false, dest: dest };
      AU.nb = auNoise(c);
      auSchedule(off);
    },
    stop: function (fade) {
      var a = AU; AU = null;
      if (!a) return;
      if (a.ext) { try { ACH.audio.cv.stop(); } catch (e) { /* nada */ } return; }
      try { var c = a.c, f = fade == null ? .3 : fade; a.master.gain.cancelScheduledValues(c.currentTime); a.master.gain.setValueAtTime(Math.max(.0001, a.master.gain.value), c.currentTime); a.master.gain.exponentialRampToValueAtTime(.0001, c.currentTime + Math.max(.03, f)); setTimeout(function () { try { a.master.disconnect(); } catch (e) { /* nada */ } }, f * 1000 + 120); } catch (e) { /* nada */ }
    },
    fadeOut: function (f) { Aud.stop(f); },
    unlock: function () { var c = auCtx(); try { if (c && c.state === 'suspended') c.resume(); } catch (e) { /* nada */ } }
  };

  /* ================================================================ CORREDOR ================================================================ */
  var L = null;           // instancia viva
  var seenMem = false;
  function seen() { if (seenMem) return true; try { return window.localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function markSeen() { seenMem = true; try { window.localStorage.setItem(KEY, '1'); } catch (e) { /* en memoria */ } }

  var LINES = [
    { quien: 'alexander', cara: 'feliz', texto: '¡Barranco, causa! ¡Aterricé como un campeón!' },
    { quien: 'alexander', cara: 'sorpresa', texto: '¡Ay, mis rodillas! Esto no es arena, ¡es puro canto rodado!' },
    { quien: 'alexander', cara: 'sorpresa', texto: '¿Y esto? ¡En la tabla del Tablazo venía amarrado un ampli! Pa\'l concierto, causa.' },
    { quien: 'alexander', cara: 'serio', texto: 'Ya estoy cada vez más cerca de la ubicación de la cura de esta enfermedad.' },
    { quien: 'alexander', cara: 'risa', texto: '¡Aguanta, Lima, que ya llego!' },
    { quien: 'titina', cara: 'feliz', texto: '¡Gurú-gurú!' }
  ];

  var CSS = '.chz-root{position:absolute;inset:0;z-index:5;background:#000;overflow:hidden;touch-action:none;--cu:2px}' +
    '.chz-root.full{position:fixed;z-index:5}' +
    '.chz-cv{position:absolute;left:0;top:0;width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges}' +
    '.chz-root.full .chz-cv{left:50%;top:50%;transform:translate(-50%,-50%)}' +
    '.chz-lab{position:absolute;left:calc(var(--cu)*16);top:calc(var(--cu)*24);opacity:0;transform:rotate(-3deg) scale(.3);transform-origin:0 100%;transition:transform .35s cubic-bezier(.2,1.9,.4,1),opacity .18s linear;pointer-events:none}' +
    '.chz-lab.on{opacity:1;transform:rotate(-3deg) scale(1)}' +
    '.chz-lab b{display:block;font-family:"Bungee","Arial Black",Impact,sans-serif;font-weight:400;font-size:calc(var(--cu)*11);line-height:1;color:#ffe500;background:#131015;padding:calc(var(--cu)*3) calc(var(--cu)*6) calc(var(--cu)*2);border:calc(var(--cu)*1.2) solid #ff2e88;box-shadow:calc(var(--cu)*2) calc(var(--cu)*2) 0 #1fe07a;white-space:nowrap}' +
    '.chz-lab i{display:block;margin-top:calc(var(--cu)*3);font-family:"Patrick Hand","Comic Sans MS",cursive;font-style:normal;font-size:calc(var(--cu)*9);color:#fff;text-shadow:calc(var(--cu)*1) calc(var(--cu)*1) 0 #131015,0 0 calc(var(--cu)*3) rgba(0,0,0,.6)}' +
    '.chz-skip{position:absolute;right:calc(var(--cu)*8);bottom:calc(var(--cu)*3);font-family:"Silkscreen","Courier New",monospace;font-size:calc(var(--cu)*5);color:#131015;background:#1fe07a;padding:calc(var(--cu)*1.5) calc(var(--cu)*3.5);opacity:0;transition:opacity .3s;pointer-events:none}' +
    '.chz-skip.on{opacity:.9}' +
    '.chz-pausa{position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;background:rgba(8,7,10,.62);pointer-events:none}' +
    '.chz-pausa.on{display:flex}' +
    '.chz-pausa b{font-family:"Bungee","Arial Black",Impact,sans-serif;font-weight:400;font-size:calc(var(--cu)*26);line-height:1;color:#ffe500;text-shadow:calc(var(--cu)*2) calc(var(--cu)*2) 0 #ff2e88,calc(var(--cu)*4) calc(var(--cu)*4) 0 #131015;transform:rotate(-2deg)}' +
    '.chz-pausa i{display:block;margin-top:calc(var(--cu)*8);font-family:"Silkscreen","Courier New",monospace;font-style:normal;font-size:calc(var(--cu)*6);color:#f2f2ee;background:#131015;padding:calc(var(--cu)*2) calc(var(--cu)*5);border:calc(var(--cu)*1) solid #1fe07a}';

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

  function freezeGame(on) {
    try {
      var F = ACH.cv && ACH.cv.freeze;
      if (typeof F === 'function') F(!!on);
      else if (F && typeof F === 'object') { if (on && typeof F.on === 'function') F.on(); else if (!on && typeof F.off === 'function') F.off(); else if (typeof F.set === 'function') F.set(!!on); }
    } catch (e) { warn('ACH.cv.freeze', e); }
  }

  function renderAll(t) {
    var g = L.g; G = g;
    g.setTransform(2, 0, 0, 2, 0, 0); g.imageSmoothingEnabled = false;
    if (t < T.s2) shot1(t); else if (t < T.s3) shot2(t - T.s2); else if (t < T.s4) shot3(t - T.s3); else shot4(t - T.s4);
    // luz de atardecer sobre toda la escena (un solo relleno «multiplicar», sin tocar píxeles)
    g.globalCompositeOperation = 'multiply'; g.globalAlpha = .36; rc('#ffd2a8', 0, 0, GW, GH); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // viñeta
    g.globalAlpha = .5; dr(ART.vig, 0, 0); g.globalAlpha = 1;
    // «dip» a blanco en cada corte
    var cuts = [T.s2, T.s3, T.s4], f = 0, i;
    for (i = 0; i < 3; i++) { var d = t - cuts[i]; if (d >= 0 && d < T.flash) f = Math.max(f, 1 - d / T.flash); }
    if (f > 0) { g.globalAlpha = f * .95; rc('#fff8e8', 0, 0, GW, GH); g.globalAlpha = 1; }
    // bandas de cine: entran al principio y salen cuando empieza el diálogo
    var bar = 14 * eout(ramp(t, 0, .9)) * (1 - eio(ramp(t, T.end, T.end + .7)));
    if (bar > .4) { rc('#000', 0, 0, GW, Math.round(bar)); rc('#000', 0, GH - Math.round(bar), GW, Math.round(bar)); }
    // fundido desde negro
    if (t < .7) { g.globalAlpha = 1 - t / .7; rc('#000', 0, 0, GW, GH); g.globalAlpha = 1; }
    if (L.fade > 0) { g.globalAlpha = L.fade; rc('#000', 0, 0, GW, GH); g.globalAlpha = 1; }
    // pantalla (960×540): copia de la grilla escalada ×2 está implícita en la transformación
    L.lab.classList.toggle('on', t > .8 && t < 3.7);
  }

  function curT() {
    if (L.frozen) return L.ft;
    return ((L.paused ? L.pAt : performance.now()) - L.t0) / 1000 + L.toff;
  }
  // v0.13 (F7): ESC / P pausan el montaje (tiempo, música y cortes); el diálogo con retrato ya va a ritmo del jugador, ahí no se pausa
  function setPause(on) {
    if (!L || L.mode !== 'montage' || L.frozen || L.ending || !!L.paused === !!on) return;
    L.paused = !!on;
    if (on) L.pAt = performance.now(); else L.t0 += performance.now() - L.pAt;
    if (L.pz) L.pz.classList.toggle('on', !!on);
    try { var c = ACH.audio && ACH.audio.ctx; if (c) { if (on && typeof c.suspend === 'function') c.suspend(); else if (!on && typeof c.resume === 'function') c.resume(); } } catch (e) { /* nada */ }
  }
  function onVis() { if (L && document.hidden) setPause(true); }

  function frame() {
    if (!L) return;
    L.raf = requestAnimationFrame(frame);
    var t = curT();
    if (L.mode === 'montage' && t >= T.end) { startDialog(); }
    try { renderAll(t); } catch (e) { if (!L.bad) { L.bad = 1; warn('render', e); } }
    L.skip.classList.toggle('on', L.skippable && L.mode === 'montage' && t > 1 && t < T.end - .6 && !L.paused);
    if (L.fade > 0 || L.ending) {
      if (L.ending) { L.fade = Math.min(1, (performance.now() - L.endT0) / 380); if (L.fade >= 1) finish(); }
    }
  }

  function startDialog() {
    if (!L || L.mode !== 'montage') return;
    L.mode = 'dialogo'; markSeen();
    L.skip.classList.remove('on');
    if (L.opts.dialogo === false) { return; }
    var D = ACH.dialogo;
    if (D && typeof D.play === 'function') {
      try { D.play(LINES, { onDone: function () { beginEnd(); } }); return; } catch (e) { warn('dialogo.play', e); }
    }
    setTimeout(beginEnd, 1500);   // sin motor de diálogo: pausa corta y sigue
  }
  function beginEnd() { if (!L || L.ending) return; L.ending = true; L.endT0 = performance.now(); try { Aud.fadeOut(.5); } catch (e) { /* nada */ } }

  function skipMontage() {
    if (!L || L.mode !== 'montage' || !L.skippable || L.paused) return;
    L.t0 = performance.now(); L.toff = T.end;   // salta al último plano (ya con diálogo)
    try { Aud.stop(0.15); Aud.start(T.s4); } catch (e) { /* nada */ }
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

  function finish() {
    var cb = L && L.opts && L.opts.onEnd; var go = L && !L.stopped;
    teardown(false);
    if (go && typeof cb === 'function') { try { cb(); } catch (e) { warn('onEnd', e); } }
  }

  function teardown(hard) {
    if (!L) return;
    var I = L; L = null;
    if (I.paused) { try { var c0 = ACH.audio && ACH.audio.ctx; if (c0 && typeof c0.resume === 'function') c0.resume(); } catch (e) { /* nada */ } }
    if (I.raf) cancelAnimationFrame(I.raf);
    I.ls.forEach(function (x) { x[0].removeEventListener(x[1], x[2], x[3]); });
    try { Aud.stop(hard ? .05 : .4); } catch (e) { /* nada */ }
    try { if (ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active() && hard) ACH.dialogo.close(); } catch (e) { /* nada */ }
    if (I.root && I.root.parentNode) I.root.parentNode.removeChild(I.root);
    if (!I.opts.keepFrozen) freezeGame(false);
    G = null;
    if (!I.opts.keepArt) ART = null;   // libera los lienzos horneados (se rehornean en ~80 ms si se vuelve a ver)
  }

  function injectCss() {
    if (document.getElementById('chz-css')) return;
    var s = document.createElement('style'); s.id = 'chz-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s);
  }

  function play(opts) {
    opts = opts || {};
    if (L) { var o = L.opts; teardown(true); }
    injectCss();
    if (!ART) { try { ART = bakeAll(); } catch (e) { ART = null; warn('no pude hornear el arte', e); return false; } }
    var stage = document.getElementById('stage'), parent = stage || document.body;
    var root = el('div', 'chz-root' + (stage ? '' : ' full'), null);
    root.setAttribute('data-ui', '');
    root.innerHTML = '<canvas class="chz-cv" width="960" height="540"></canvas><div class="chz-lab"><b>PLAYA BARRANCO</b><i>Bajada de Baños · el Puente · La Ermita · el Morro Solar</i></div><div class="chz-skip">ENTER: SALTAR · ESC / P: PAUSA</div><div class="chz-pausa"><b>PAUSA</b><i>ESC / P PARA SEGUIR</i></div>';
    parent.appendChild(root);
    var cv = root.querySelector('canvas');
    L = { opts: opts, root: root, cv: cv, g: ctx2(cv), lab: root.querySelector('.chz-lab'), skip: root.querySelector('.chz-skip'), pz: root.querySelector('.chz-pausa'), paused: false, pAt: 0, ls: [], mode: 'montage', full: !stage,
      t0: performance.now(), toff: +opts.t || 0, frozen: !!opts.freeze, ft: +opts.t || 0, fade: 0, ending: false, raf: 0, stopped: false };
    L.skippable = opts.skippable != null ? !!opts.skippable : seen();
    listen(window, 'keydown', onKey, true);
    listen(window, 'resize', layout);
    listen(root, 'pointerdown', function (e) { if (L.mode !== 'montage') return; if (L.paused) { e.preventDefault(); setPause(false); } else if (L.skippable) { e.preventDefault(); skipMontage(); } });
    listen(document, 'visibilitychange', onVis);
    listen(root, 'contextmenu', function (e) { e.preventDefault(); });
    layout();
    freezeGame(true);
    if (!L.frozen) { try { Aud.start(L.toff); } catch (e) { warn('audio', e); } }
    if (L.frozen && L.ft >= T.end) { L.mode = 'dialogo'; }
    L.raf = requestAnimationFrame(frame);
    return true;
  }
  function stop() { if (L) { L.stopped = true; teardown(true); } }

  ACH.cv.chorrillos = ACH.cv.aterrizaje = {   // BARRANCO.md §7.1: mismo objeto con los dos nombres
    play: play, stop: stop, isOn: function () { return !!L; },
    debug: {
      T: T, lines: LINES,
      render: function (t) { if (L) { L.frozen = true; L.ft = t; } },
      pause: function (on) { setPause(on === undefined ? !(L && L.paused) : !!on); return !!(L && L.paused); },
      state: function () { return L ? { mode: L.mode, paused: L.paused, t: curT(), skippable: L.skippable, ms: ART && ART.ms } : null; },
      resetSeen: function () { seenMem = false; try { window.localStorage.removeItem(KEY); } catch (e) { /* nada */ } },
      art: function () { return ART; },
      cost: function (t, n) { if (!L) return -1; var a = performance.now(); for (var i = 0; i < (n || 20); i++) renderAll(t + i * .016); return (performance.now() - a) / (n || 20); },
      bake: function () { if (!ART) ART = bakeAll(); return ART.ms; }
    }
  };
})();
