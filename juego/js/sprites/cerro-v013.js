/* ACHORADO — js/sprites/cerro-v013.js (v0.13 T2, agente CE): arte nuevo del Cerro, horneado una vez (nunca en el bucle).
   ACH.cerroArte = {
     presidenta() → set zvar de «La Presidenta del Comité» (lo registra en ACH.sprites.zvar.presidenta): la señora de la olla 25 % más grande,
                    con permanente, banda roja y blanca de presidenta y prendedor dorado. Mismas claves que las señoras (move, hurt, windup, attack,
                    hurtWindup, hurtAttack, dead, extra.hot / hotWindup).
     nido(solo) → lienzo del nido de gallinazos (solo = ya sin aves: brilla el botín)
     balon()    → balón de gas (naranja, con válvula) que va en la carretilla explosiva
     cartel(s)  → letrero de madera pintado a mano (huaico)
     megafono() → megáfono blanco y rojo (mira a la derecha, ancla en el mango)
   }
   Paleta desaturada «panza de burro»; 1 m = 16 px. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d'); g.imageSmoothingEnabled = false; return c; }
  function R(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(x, y, w, h); }

  var SC = 1.25, cache = {};
  function baseSkin() {
    var S = ACH.sprites && ACH.sprites.zvar; if (!S) return null;
    if (S.senoraOlla_normal_olla) return S.senoraOlla_normal_olla;
    var L = ACH.sprites.senoraList && ACH.sprites.senoraList.olla;
    return L && L.length ? S[typeof L[0] === 'string' ? L[0] : L[0].skin] : null;
  }
  function placeholder() {   // sin las señoras horneadas: una silueta simple
    var c = mk(30, 40); var g = c.getContext('2d');
    R(g, '#2a2030', 10, 2, 10, 6); R(g, '#7a8a6a', 11, 7, 8, 7); R(g, '#8a3a4a', 8, 14, 14, 16); R(g, '#d8263a', 9, 15, 3, 3); R(g, '#f2f2f2', 12, 18, 3, 3);
    R(g, '#d8263a', 15, 21, 3, 3); R(g, '#3a3040', 10, 30, 4, 9); R(g, '#3a3040', 16, 30, 4, 9);
    c.ax = 15; c.ay = 39; return c;
  }
  function scaled(src, overlay) {
    if (!src || !src.width) return placeholder();
    var w = Math.round(src.width * SC), h = Math.round(src.height * SC), c = mk(w, h), g = c.getContext('2d');
    g.drawImage(src, 0, 0, w, h);
    var ax = src.ax === undefined ? src.width >> 1 : src.ax, ay = src.ay === undefined ? src.height - 1 : src.ay;
    c.ax = Math.round(ax * SC); c.ay = Math.round(ay * SC);
    if (overlay) dress(c, g);
    return c;
  }
  // permanente, banda y prendedor sobre lo opaco del cuadro (se ubica la cabeza buscando la primera fila con píxeles)
  function dress(c, g) {
    var d; try { d = g.getImageData(0, 0, c.width, c.height).data; } catch (e) { return; }
    var top = -1, xs = 0, xn = 0, x, y;
    for (y = 0; y < c.height && top < 0; y++) for (x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 200) { top = y; break; }
    if (top < 0) return;
    for (y = top; y < top + 4; y++) for (x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 200) { xs += x; xn++; }
    var cx = Math.round(xs / Math.max(1, xn));
    // permanente (rulos), un poco más arriba y ancha que la cabeza
    var HC = ['#2a2030', '#3a2e44', '#4c405a'];
    [[-5, 1], [-3, -1], [-1, -2], [1, -2], [3, -1], [5, 1], [-6, 3], [6, 3]].forEach(function (q, i) { R(g, HC[i % 2], cx + q[0] - 1, top + q[1], 3, 3); });
    R(g, HC[2], cx - 2, top - 2, 2, 1); R(g, HC[2], cx + 2, top - 1, 1, 1);
    // banda (sobre el cuerpo, solo donde hay pintura)
    g.save(); g.globalCompositeOperation = 'source-atop';
    for (var k = 0; k <= 12; k++) {
      var bx = cx - 6 + k, by = top + 12 + k;
      R(g, '#b81e30', bx, by, 2, 3); R(g, '#f2f2f2', bx, by + 1, 1, 1);
    }
    R(g, '#e0b030', cx - 3, top + 13, 3, 3); R(g, '#fff2b0', cx - 2, top + 13, 1, 1);   // prendedor
    g.restore();
  }
  function scaleHot(arr) { return (arr || []).map(function (h) { return { x: h.x * SC, y: h.y * SC }; }); }
  function presidenta() {
    var S = ACH.sprites = ACH.sprites || {}; S.zvar = S.zvar || {};
    if (cache.pres && S.zvar.presidenta === cache.pres) return cache.pres;
    var B = baseSkin(), e = {};
    ['move', 'windup', 'attack'].forEach(function (k) { var a = B && B[k]; e[k] = (Array.isArray(a) ? a : a ? [a] : [null]).map(function (f) { return scaled(f, true); }); });
    ['hurt', 'hurtWindup', 'hurtAttack'].forEach(function (k) { var a = B && B[k]; e[k] = (Array.isArray(a) ? a : a ? [a] : [null]).map(function (f) { return scaled(f, false); }); });
    var dd = B && B.dead; e.dead = scaled(Array.isArray(dd) ? dd[0] : dd, false);
    var ex = (B && B.extra) || {};
    e.extra = { kind: 'olla', tipo: 'presidenta', height: Math.round((ex.height || 27) * SC), hot: scaleHot(ex.hot), hotWindup: scaleHot(ex.hotWindup) };
    S.zvar.presidenta = e; cache.pres = e;
    return e;
  }
  function nido(solo) {
    var k = solo ? 'nidoS' : 'nido'; if (cache[k]) return cache[k];
    var c = mk(26, 14), g = c.getContext('2d');
    R(g, 'rgba(20,16,22,0.35)', 2, 10, 22, 3);
    R(g, '#4a3a2a', 3, 6, 20, 5); R(g, '#5e4a34', 2, 7, 22, 3); R(g, '#3a2c20', 4, 10, 18, 1);
    [[3, 6], [7, 5], [12, 5], [17, 5], [21, 6], [5, 9], [14, 9], [19, 9]].forEach(function (q, i) { R(g, i % 2 ? '#7a6248' : '#2e241a', q[0], q[1], 3, 1); });
    R(g, '#2a2228', 7, 6, 12, 2);
    if (solo) { R(g, '#d8c070', 9, 4, 3, 3); R(g, '#a8a090', 13, 4, 3, 3); R(g, '#fff2b0', 10, 4, 1, 1); R(g, '#e8e0c8', 16, 3, 4, 3); R(g, '#4aa8ff', 16, 3, 4, 1); }
    else { R(g, '#d8d0bc', 10, 5, 3, 2); R(g, '#c8c0aa', 14, 5, 3, 2); }
    c.ax = 13; c.ay = 12; cache[k] = c; return c;
  }
  function balon() {
    if (cache.balon) return cache.balon;
    var c = mk(9, 13), g = c.getContext('2d');
    R(g, '#131015', 1, 2, 7, 11); R(g, '#c8562a', 2, 3, 5, 9); R(g, '#e07a3a', 2, 3, 2, 8); R(g, '#8a3a1e', 6, 4, 1, 8);
    R(g, '#f2f2f2', 2, 7, 5, 1); R(g, '#5f6a74', 3, 0, 3, 3); R(g, '#9aa4ac', 4, 0, 1, 1);
    c.ax = 4; c.ay = 12; cache.balon = c; return c;
  }
  function cartel(s) {
    var k = 'cartel|' + s; if (cache[k]) return cache[k];
    var lines = String(s).split('\n'), c = mk(64, 12 + lines.length * 8), g = c.getContext('2d');
    R(g, '#3a2c20', 30, 8 + lines.length * 8 - 4, 3, 12 - 8 + 4); R(g, '#3a2c20', 30, c.height - 6, 3, 6);
    R(g, '#131015', 2, 1, 60, lines.length * 8 + 4); R(g, '#8a6a44', 3, 2, 58, lines.length * 8 + 2); R(g, '#a8845a', 3, 2, 58, 2);
    g.font = '8px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
    lines.forEach(function (ln, i) { g.fillStyle = '#131015'; g.fillText(ln, 33, 3 + i * 8); g.fillStyle = i === 0 ? '#ffe500' : '#f2eee2'; g.fillText(ln, 32, 2 + i * 8); });
    c.ax = 32; c.ay = c.height - 1; cache[k] = c; return c;
  }
  function megafono() {
    if (cache.mega) return cache.mega;
    var c = mk(14, 9), g = c.getContext('2d');
    R(g, '#131015', 0, 3, 4, 4); R(g, '#3a3a44', 1, 4, 2, 3);
    R(g, '#131015', 3, 2, 3, 5); R(g, '#131015', 6, 1, 4, 7); R(g, '#131015', 10, 0, 4, 9);
    R(g, '#f2eee2', 4, 3, 2, 3); R(g, '#f2eee2', 6, 2, 4, 5); R(g, '#d8263a', 10, 1, 3, 7); R(g, '#ff5a6a', 11, 2, 1, 4);
    c.ax = 1; c.ay = 5; cache.mega = c; return c;
  }
  ACH.cerroArte = { presidenta: presidenta, nido: nido, balon: balon, cartel: cartel, megafono: megafono };
})();
