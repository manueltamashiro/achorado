/* ACHORADO — js/costaverde/arte-v013.js (v0.13 T2, agente CV): arte nuevo de la Costa Verde, horneado una vez y a pedido.
   ACH.sprites.cv.t2 = {
     dron: [2 cuadros]                          el dron del turista (hélices alternas)
     room(id, w, h) → {bg, items:[{x,y,w,h,solid}]}   fondo de un interior de Larcomar (piso, pared del fondo, paredes, muebles) + muebles
                                                que se dibujan por orden de profundidad (recortes de bg) y sus sólidos. id: cine | cafe | tanta
     para(i, pose) → canvas                     parapentista sobreviviente (i = 0..2 colores; pose 'sentado' | 'parado' | 'saluda')
     icons: {canchita, frappe, causa}            íconos de la mochila (12×12, .big 24×24)
   }
   Pixel art desaturado («cielo panza de burro»), escala 1 m = 16 px. Contorno #131015. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var S = ACH.sprites = ACH.sprites || {}; S.cv = S.cv || {};
  var INK = '#131015';
  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d'); g.imageSmoothingEnabled = false; return c; }
  function R(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  function box(g, c, x, y, w, h) { R(g, INK, x - 1, y - 1, w + 2, h + 2); R(g, c, x, y, w, h); }
  function txt(g, s, x, y, col, size) {
    var px = ACH.px;
    try {
      if (px && px.G && px.text && px.measure) {
        var w = Math.max(4, px.measure(s, 'a5') + 2), tg = new px.G(w, 7);
        px.text(tg, s, Math.floor(w / 2), 1, { font: 'a5', ink: col || '#f3efe2', align: 'c' });
        g.drawImage(tg.toCanvas(), Math.round(x - w / 2), Math.round(y - 3));
        return;
      }
    } catch (e) { /* letra de sistema */ }
    g.font = (size || 6) + 'px monospace'; g.fillStyle = col || '#f3efe2'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y); g.textAlign = 'start'; g.textBaseline = 'alphabetic';
  }
  function hash(a, b) { var h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return (h ^ (h >>> 16)) >>> 0; }

  /* ---------------- dron ---------------- */
  var DRON = null;
  function dron() {
    if (DRON) return DRON;
    DRON = [0, 1].map(function (k) {
      var c = mk(24, 12), g = c.getContext('2d');
      R(g, INK, 6, 4, 12, 5); R(g, '#d8d8d0', 7, 5, 10, 3); R(g, '#8a8a90', 7, 7, 10, 1); R(g, '#2a2a30', 10, 8, 4, 2);   // cuerpo y cámara
      R(g, INK, 2, 3, 5, 2); R(g, INK, 17, 3, 5, 2);                         // brazos
      R(g, '#5a5a60', k ? 0 : 1, 1, k ? 8 : 6, 1); R(g, '#5a5a60', k ? 16 : 17, 1, k ? 8 : 6, 1);   // hélices
      R(g, INK, 4, 2, 1, 2); R(g, INK, 19, 2, 1, 2);
      return c;
    });
    return DRON;
  }

  /* ---------------- interiores ---------------- */
  var ROOMS = {};
  function floorTiles(g, w, h, y0, a, b, seed) {
    for (var y = y0; y < h; y += 16) for (var x = 0; x < w; x += 16) { R(g, (hash(x + seed, y) & 1) ? a : b, x, y, 16, 16); R(g, 'rgba(0,0,0,.12)', x, y + 15, 16, 1); R(g, 'rgba(0,0,0,.08)', x + 15, y, 1, 16); }
  }
  function frame(g, w, h, wallH, wall, trim) {
    // paredes laterales e inferior (gruesas, oscuras) + pared del fondo
    R(g, wall, 0, 0, w, wallH);
    R(g, trim, 0, wallH - 3, w, 3); R(g, 'rgba(0,0,0,.35)', 0, wallH, w, 3);
    R(g, '#2a2630', 0, 0, 16, h); R(g, '#2a2630', w - 16, 0, 16, h); R(g, '#2a2630', 0, h - 16, w, 16);
    R(g, INK, 15, wallH, 1, h - wallH - 16); R(g, INK, w - 16, wallH, 1, h - wallH - 16); R(g, INK, 16, h - 16, w - 32, 1);
    // puerta de salida (abajo al centro), con su cartel
    var dx = (w >> 1) - 14;
    R(g, '#0a0a0e', dx, h - 16, 28, 16); R(g, '#3a3640', dx + 2, h - 15, 24, 15); R(g, '#1fe07a', dx + 6, h - 14, 16, 5);
    txt(g, 'SALIDA', w >> 1, h - 11, INK);
  }
  function cine(w, h) {
    var c = mk(w, h), g = c.getContext('2d'), wallH = 48, items = [];
    floorTiles(g, w, h, wallH, '#3a2030', '#341c2a', 3);
    for (var x = 16; x < w - 16; x += 6) R(g, 'rgba(232,184,48,.08)', x, wallH + 4, 3, h);   // alfombra con rayas
    frame(g, w, h, wallH, '#1c1630', '#ffd200');
    // pantalla con la película (gag)
    var sx = 70, sw = w - 140;
    box(g, '#d8d4c8', sx, 6, sw, 34); R(g, '#8a90a0', sx, 6, sw, 34);
    R(g, '#5a6a7a', sx, 26, sw, 14); for (var k = 0; k < 6; k++) { var zx = sx + 18 + k * (sw / 6); R(g, '#2a3a2a', zx, 18, 6, 12); R(g, '#7a9a6a', zx + 1, 15, 4, 4); }
    txt(g, 'LA NOCHE DE LOS', sx + sw / 2, 11, '#ffe500'); txt(g, 'MUERTOS CHALACOS', sx + sw / 2, 18, '#ff2e88');
    R(g, '#0a2a6a', 20, 8, 40, 16); txt(g, 'SALA 4', 40, 16, '#ffd200');
    R(g, '#0a2a6a', w - 60, 8, 40, 16); txt(g, '2X1 MART', w - 40, 16, '#ffd200');
    // dulcería (izq.) con máquina de canchita
    var dl = { x: 22, y: 64, w: 50, h: 18, solid: true };
    box(g, '#0a2a6a', dl.x, dl.y, dl.w, dl.h); R(g, '#ffd200', dl.x, dl.y, dl.w, 3);
    box(g, '#e8402c', dl.x + 4, dl.y - 14, 14, 14); R(g, '#f3e8b0', dl.x + 6, dl.y - 10, 10, 8); for (k = 0; k < 6; k++) R(g, '#ffffff', dl.x + 6 + (k * 3) % 9, dl.y - 10 + (k * 5) % 7, 2, 2);
    txt(g, 'DULCERIA', dl.x + 33, dl.y + 9, '#ffd200');
    items.push(dl);
    // 3 filas de butacas con pasillo al centro
    [92, 130, 168].forEach(function (yy, row) {
      [[84, (w >> 1) - 14], [(w >> 1) + 14, w - 40]].forEach(function (seg) {
        var it = { x: seg[0], y: yy, w: seg[1] - seg[0], h: 10, solid: true };
        R(g, INK, it.x - 1, it.y - 7, it.w + 2, it.h + 8);
        for (var sx2 = it.x; sx2 < it.x + it.w - 8; sx2 += 11) { R(g, '#8a1a2a', sx2, it.y - 6, 10, 8); R(g, '#b8243a', sx2 + 1, it.y - 6, 8, 3); R(g, '#5a1020', sx2, it.y + 2, 10, 2); }
        items.push(it);
      });
      R(g, 'rgba(255,210,0,.5)', (w >> 1) - 2, yy + 4, 4, 1);   // lucecitas del pasillo
    });
    return { bg: c, items: items, wallH: wallH };
  }
  function cafe(w, h) {
    var c = mk(w, h), g = c.getContext('2d'), wallH = 48, items = [];
    floorTiles(g, w, h, wallH, '#7a5a3a', '#70522f', 5);
    frame(g, w, h, wallH, '#2a3a30', '#00704A');
    // pizarra con los nombres mal escritos (gag)
    box(g, '#1c2420', 26, 6, 86, 34);
    txt(g, 'HOY:', 69, 11, '#e8d0a0'); txt(g, 'ALEKZANDER', 69, 19, '#f3efe2'); txt(g, 'TITINNA', 69, 26, '#f3efe2'); txt(g, 'KAUSA', 69, 33, '#f3efe2');
    box(g, '#00704A', w - 88, 8, 60, 22); txt(g, 'ESTARBAKS', w - 58, 19, '#ffffff');
    // barra con la cafetera
    var bar = { x: 34, y: 66, w: w - 68, h: 16, solid: true };
    box(g, '#3a2a1c', bar.x, bar.y, bar.w, bar.h); R(g, '#c8b090', bar.x, bar.y, bar.w, 3);
    box(g, '#8a8a90', bar.x + 20, bar.y - 14, 22, 14); R(g, '#c8c8d0', bar.x + 22, bar.y - 12, 18, 3); R(g, INK, bar.x + 26, bar.y - 6, 2, 4); R(g, INK, bar.x + 34, bar.y - 6, 2, 4);
    for (var k = 0; k < 5; k++) { box(g, '#f3efe2', bar.x + 60 + k * 9, bar.y - 7, 5, 7); R(g, '#00704A', bar.x + 60 + k * 9, bar.y - 4, 5, 2); }
    box(g, '#2a2a30', bar.x + bar.w - 36, bar.y - 10, 18, 10); R(g, '#1fe07a', bar.x + bar.w - 34, bar.y - 8, 6, 3);   // caja registradora
    items.push(bar);
    // mesitas
    [[64, 124], [w - 64, 124], [100, 160]].forEach(function (q) {
      var it = { x: q[0] - 12, y: q[1] - 4, w: 24, h: 8, solid: true };
      R(g, INK, it.x - 1, it.y - 6, it.w + 2, it.h + 7); R(g, '#c8b090', it.x, it.y - 5, it.w, 6); R(g, '#8a7050', it.x + 10, it.y + 1, 4, it.h - 1);
      box(g, '#f3efe2', it.x + 4, it.y - 9, 4, 4);
      items.push(it);
    });
    return { bg: c, items: items, wallH: wallH };
  }
  function tanta(w, h) {
    var c = mk(w, h), g = c.getContext('2d'), wallH = 48, items = [];
    floorTiles(g, w, h, wallH, '#b8a080', '#ae9676', 9);
    frame(g, w, h, wallH, '#6a1a20', '#f3efe2');
    // ventana de la cocina con el pase
    box(g, '#2a2a30', (w >> 1) - 70, 8, 140, 30); R(g, '#e8b830', (w >> 1) - 66, 12, 132, 4);
    txt(g, 'TANTITA - COCINA', w >> 1, 24, '#f3efe2');
    box(g, '#d8263a', 22, 10, 50, 22); txt(g, 'MENU S/ 89', 47, 21, '#ffffff');
    var pase = { x: (w >> 1) - 60, y: 62, w: 120, h: 12, solid: true };
    box(g, '#8a8a90', pase.x, pase.y, pase.w, pase.h); R(g, '#c8c8d0', pase.x, pase.y, pase.w, 3);
    for (var k = 0; k < 4; k++) { box(g, '#f3efe2', pase.x + 10 + k * 28, pase.y - 6, 14, 5); R(g, k % 2 ? '#e8b830' : '#d8402c', pase.x + 13 + k * 28, pase.y - 5, 8, 3); }
    items.push(pase);
    // barra de tragos (izq.)
    var bar = { x: 22, y: 76, w: 40, h: 14, solid: true };
    box(g, '#5a2a1a', bar.x, bar.y, bar.w, bar.h); R(g, '#c8962a', bar.x, bar.y, bar.w, 2);
    for (k = 0; k < 4; k++) { box(g, ['#6a2a8a', '#e8b830', '#1fe07a', '#d8402c'][k], bar.x + 4 + k * 9, bar.y - 10, 4, 9); }
    items.push(bar);
    // mesas con mantel
    [[90, 112], [w >> 1, 112], [w - 90, 112], [90, 150], [w - 90, 150]].forEach(function (q) {
      var it = { x: q[0] - 16, y: q[1] - 4, w: 32, h: 8, solid: true };
      R(g, INK, it.x - 1, it.y - 8, it.w + 2, it.h + 9); R(g, '#f3efe2', it.x, it.y - 7, it.w, 10); R(g, '#d8263a', it.x, it.y + 2, it.w, 2);
      box(g, '#ffffff', it.x + 6, it.y - 5, 6, 3); box(g, '#ffffff', it.x + 20, it.y - 5, 6, 3);
      items.push(it);
    });
    return { bg: c, items: items, wallH: wallH };
  }
  var BUILD = { cine: cine, cafe: cafe, tanta: tanta };
  function room(id, w, h) {
    var k = id + '|' + w + '|' + h;
    if (!ROOMS[k] && BUILD[id]) ROOMS[k] = BUILD[id](w, h);
    return ROOMS[k] || null;
  }

  /* ---------------- parapentistas sobrevivientes ---------------- */
  var PCOL = [['#e84a8a', '#ffe500', '#3a5a8a'], ['#1fe07a', '#2fb8e8', '#5a3a2a'], ['#ffb020', '#d8402c', '#2a2a30']];
  var PC = {};
  function para(i, pose) {
    var k = i + pose; if (PC[k]) return PC[k];
    var C = PCOL[i % 3], c = mk(34, 30), g = c.getContext('2d'), sit = pose === 'sentado';
    // parapente arrugado al lado
    if (sit) { R(g, INK, 18, 20, 16, 9); R(g, C[0], 19, 21, 14, 3); R(g, C[1], 19, 24, 10, 2); R(g, C[0], 25, 26, 8, 2); R(g, '#f3efe2', 19, 21, 14, 1); }
    var bx = 6, by = sit ? 8 : 2;
    // casco
    R(g, INK, bx + 1, by, 10, 8); R(g, C[1], bx + 2, by + 1, 8, 4); R(g, '#f3efe2', bx + 3, by + 1, 3, 1);
    R(g, '#c89070', bx + 3, by + 5, 6, 3); R(g, INK, bx + 4, by + 6, 1, 1); R(g, INK, bx + 7, by + 6, 1, 1);
    // cuerpo con arnés
    R(g, INK, bx, by + 8, 12, sit ? 10 : 12); R(g, C[0], bx + 1, by + 9, 10, sit ? 8 : 10); R(g, INK, bx + 2, by + 9, 1, 8); R(g, INK, bx + 9, by + 9, 1, 8); R(g, '#e8e830', bx + 1, by + 14, 10, 1);
    if (sit) { R(g, INK, bx - 2, by + 17, 16, 4); R(g, C[2], bx - 1, by + 18, 14, 2); R(g, INK, bx - 3, by + 19, 3, 2); R(g, INK, bx + 12, by + 19, 3, 2); }
    else { R(g, INK, bx + 1, by + 20, 4, 8); R(g, INK, bx + 7, by + 20, 4, 8); R(g, C[2], bx + 2, by + 20, 2, 7); R(g, C[2], bx + 8, by + 20, 2, 7); }
    // brazos
    if (pose === 'saluda') { R(g, INK, bx + 12, by + 1, 3, 9); R(g, '#c89070', bx + 13, by, 2, 2); }
    else { R(g, INK, bx - 2, by + 9, 3, 7); R(g, INK, bx + 11, by + 9, 3, 7); }
    c.ax = bx + 6; c.ay = sit ? 28 : 29;
    PC[k] = c; return c;
  }

  /* ---------------- íconos de comida nueva ---------------- */
  function icon(draw) { var c = mk(12, 12), g = c.getContext('2d'); draw(g); var b = mk(24, 24); b.getContext('2d').imageSmoothingEnabled = false; b.getContext('2d').drawImage(c, 0, 0, 24, 24); c.big = b; return c; }
  var ICONS = null;
  function icons() {
    if (ICONS) return ICONS;
    ICONS = {
      canchita: icon(function (g) { R(g, INK, 2, 3, 8, 9); R(g, '#e8402c', 3, 4, 6, 7); R(g, '#f3efe2', 4, 4, 1, 7); R(g, '#f3efe2', 7, 4, 1, 7); R(g, '#f3e8b0', 2, 1, 8, 3); R(g, '#ffffff', 3, 0, 2, 2); R(g, '#ffffff', 7, 1, 2, 2); }),
      frappe: icon(function (g) { R(g, INK, 3, 2, 6, 10); R(g, '#f3efe2', 4, 3, 4, 8); R(g, '#a07a5a', 4, 6, 4, 5); R(g, '#00704A', 4, 8, 4, 1); R(g, '#ffffff', 3, 1, 6, 2); R(g, INK, 7, 0, 1, 3); }),
      causa: icon(function (g) { R(g, INK, 1, 8, 10, 3); R(g, '#f3efe2', 2, 9, 8, 1); R(g, INK, 3, 2, 6, 7); R(g, '#f0c030', 4, 3, 4, 2); R(g, '#e8e0cf', 4, 5, 4, 1); R(g, '#f0c030', 4, 6, 4, 2); R(g, '#1fe07a', 5, 2, 2, 1); })
    };
    return ICONS;
  }

  S.cv.t2 = {
    get dron() { return dron(); },
    room: room, para: para,
    get icons() { return icons(); }
  };
})();
