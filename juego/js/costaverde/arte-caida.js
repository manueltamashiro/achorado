/* ACHORADO — js/costaverde/arte-caida.js → ACH.sprites.cv.caida (C4)
   Arte del jefe 2 en caída libre: «El Tablazo». Todo se hornea UNA vez en bake() (lienzos en memoria, sin getImageData,
   sin shadowBlur, sin filter y sin degradados por cuadro). Funciona solo: si falta ACH.px usa su propia rejilla y fillText.

   A = ACH.sprites.cv.caida.bake()  (idempotente) →
     bg            480×270 cielo panza de burro + mar al horizonte (HOR = 150)
     clouds        480×300 nubes (se repiten en vertical; solo se dibuja la parte sobre el horizonte)
     rain          240×240 garúa (mosaico)
     coast         480×40 costa lejana de Barranco/Chorrillos (abajo en el horizonte)
     morro         220×86 bahía de Chorrillos con botes + Morro Solar con la Cruz y el Cristo del Pacífico (ancla abajo-derecha)
     cliff         112×256 acantilado de la Costa Verde con malla verde (mosaico vertical, borde derecho irregular)
     base          480×90 Circuito de Playas + playa de piedras + mar cercano; waves[3] 480×12
     fog[2], gull[2], pelican[3]
     alex: {fly[2], shoot, charge, snap[2], load, hurt}  32×36, ancla (16,18) = pecho     alexWing 76×56, ancla (38,54) = arnés
     boss: {idle[2], pull, throw, rage[2], hurt, dead}   38×40, ancla (19,18)              bossWing 84×58 ancla (42,56), wingTorn[2]
     board[c][r] (c 0..4, r 0..7: giro de 0 a 180°) 30×30 centro (15,15); arrow[4] 11×5, trail[4] 24×5, halo[4] 15×11, spark[4]
     splash[5] 64×48 ancla (32,47)
     hud: heart, heartE, heartHalf, bossFrame, altBar, card, digits{0-9,m,' '}, toasts{luces, rasa, splash, furioso, pausa, ...}
     text(str, o) → lienzo horneado (caché)
     COL: {arrow:[verde, rosado, amarillo, celeste]}   */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  ACH.sprites = ACH.sprites || {};
  var SC = ACH.sprites.cv = ACH.sprites.cv || {};

  var W = 480, H = 270, HOR = 150;
  var K = '#141216';
  var P = {
    skin: '#a8714c', skinD: '#80523a', face: '#c48f63', faceL: '#dcae80', hair: '#34261f', eye: '#141414',
    blue: '#1f2f66', white: '#e6e6e0', shorts: '#5d6150', shortsD: '#464a3c', sandal: '#5e3f27',
    wood: '#a86e38', woodD: '#6b4223', strap: '#3b2b21', band: '#ff6fb5',
    pg: '#8e939b', pgD: '#5d6168', pgL: '#b6bac0', irG: '#3f9a7c', irP: '#8a5aa6', beak: '#3b3436', peye: '#e07a2a',
    zs: '#93a083', zsD: '#5f6b55', zsL: '#b4be9a', zeye: '#e9ecd5', suit: '#1f2228', suitL: '#3a3f49', bleach: '#f2e7a0', bleachD: '#c9b45e',
    pink: '#ff2e88', yellow: '#ffe500', green: '#1fe07a', turq: '#22c9bf', turqD: '#128c86', turqL: '#8ff0e6'
  };
  var ARROW = ['#39ff6a', '#ff4fb3', '#fff13a', '#4fe3ff'];
  var BOARD = [['#ff5a3c', '#ffffff', '#b8331d'], ['#ffd23a', '#2f5fb8', '#b9921a'], ['#3ad0ff', '#ffe500', '#1c86ad'],
    ['#f4f0e6', '#ff2e88', '#bdb6a6'], ['#b04aff', '#1fe07a', '#7420b8']];   // [4] = bumerán

  function mk(w, h) { var c = (ACH.px && ACH.px.canvas) ? ACH.px.canvas(w, h) : document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function c2(c) { var g = c.getContext('2d'); g.imageSmoothingEnabled = false; return g; }
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; }; }

  /* ---------- rejilla propia (compatible con ACH.px.text: solo usa set) ---------- */
  function Gr(w, h) { this.w = w; this.h = h; this.d = new Array(w * h); }
  Gr.prototype = {
    set: function (x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; },
    get: function (x, y) { return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.d[y * this.w + x] : null; },
    rect: function (x, y, w, h, c) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.set(x + i, y + j, c); },
    line: function (x0, y0, x1, y1, c) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, e = dx + dy;
      for (var n = 0; n < 600; n++) { this.set(x0, y0, c); if (x0 === x1 && y0 === y1) break; var e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
    },
    disc: function (cx, cy, r, c) { for (var y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (var x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) this.set(x, y, c); },
    ell: function (cx, cy, rx, ry, c) { for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { var a = (x - cx) / rx, b = (y - cy) / ry; if (a * a + b * b <= 1) this.set(x, y, c); } },
    outline: function (c) {
      c = c || K; var add = [], x, y;
      for (y = 0; y < this.h; y++) for (x = 0; x < this.w; x++) { if (this.get(x, y)) continue; if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push(x, y); }
      for (var i = 0; i < add.length; i += 2) this.set(add[i], add[i + 1], c);
      return this;
    },
    solid: function (c) { var n = new Gr(this.w, this.h); for (var i = 0; i < this.d.length; i++) if (this.d[i]) n.d[i] = c; return n; },
    flip: function () { var n = new Gr(this.w, this.h); for (var y = 0; y < this.h; y++) for (var x = 0; x < this.w; x++) n.d[y * this.w + this.w - 1 - x] = this.d[y * this.w + x]; return n; },
    toCanvas: function (ax, ay) {
      var c = mk(this.w, this.h), g = c2(c);
      for (var y = 0; y < this.h; y++) {
        var x = 0;
        while (x < this.w) {
          var col = this.d[y * this.w + x];
          if (!col) { x++; continue; }
          var x1 = x + 1; while (x1 < this.w && this.d[y * this.w + x1] === col) x1++;
          g.fillStyle = col; g.fillRect(x, y, x1 - x, 1); x = x1;
        }
      }
      c.ax = ax || 0; c.ay = ay || 0; return c;
    }
  };

  /* ---------- texto horneado ---------- */
  var tcache = {};
  function text(str, o) {
    o = o || {};
    var key = str + '|' + (o.font || 'a7') + '|' + (o.ink || '') + '|' + (o.outline || '') + '|' + (o.shadow || '') + '|' + (o.scale || 1);
    if (tcache[key]) return tcache[key];
    var font = o.font || 'a7', s = o.scale || 1, c;
    var px = ACH.px;
    if (px && px.text && px.measure) {
      var w = px.measure(str, font, s) + 4, fi = px.fontInfo(font, s), h = fi.h + fi.top + 4;
      var g = new Gr(Math.max(1, w), h);
      px.text(g, str, 2, 1 + fi.top, { font: font, ink: o.ink || '#f3efe2', outline: o.outline, shadow: o.shadow, scale: s });
      c = g.toCanvas(0, 0);
    } else {
      var fs = { a5: 6, a7: 8, a12: 13 }[font] * s;
      c = mk(Math.ceil(str.length * fs * 0.7) + 6, fs + 6); var x = c2(c);
      x.font = 'bold ' + fs + 'px monospace'; x.textBaseline = 'top';
      if (o.outline) { x.fillStyle = o.outline; for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) x.fillText(str, 3 + dx, 3 + dy); }
      x.fillStyle = o.ink || '#f3efe2'; x.fillText(str, 3, 3);
    }
    tcache[key] = c; return c;
  }

  /* ==================== FONDOS ==================== */
  function bakeBg() {
    var c = mk(W, H), g = c2(c), i, y;
    var sky = ['#7f838d', '#868a94', '#8d919b', '#959aa2', '#9da1a9', '#a5a9b0', '#adb1b7', '#b5b8bd', '#bcbfc3'];
    var bh = Math.ceil(HOR / sky.length);
    for (i = 0; i < sky.length; i++) { g.fillStyle = sky[i]; g.fillRect(0, i * bh, W, bh + 1); }
    // tramado entre bandas (1 px de cada color alternado)
    for (i = 1; i < sky.length; i++) { g.fillStyle = sky[i - 1]; for (var x = (i & 1); x < W; x += 2) g.fillRect(x, i * bh, 1, 1); }
    // horizonte con neblina
    g.fillStyle = '#c3c6c9'; g.fillRect(0, HOR - 3, W, 3);
    var sea = ['#8aa0a0', '#7f9797', '#738d8e', '#688485', '#5e7a7c', '#557173', '#4c686b', '#446064', '#3d585d'];
    var sh = Math.ceil((H - HOR) / sea.length);
    for (i = 0; i < sea.length; i++) { g.fillStyle = sea[i]; g.fillRect(0, HOR + i * sh, W, sh + 1); }
    var r = rng(77);
    for (i = 0; i < 260; i++) {   // brillos y rayitas de olas (más largas cerca)
      y = HOR + 2 + Math.floor(Math.pow(r(), 1.6) * (H - HOR - 2));
      var near = (y - HOR) / (H - HOR), len = 2 + Math.floor(near * 10 * r());
      g.fillStyle = r() < .5 ? '#9fb4b2' : '#36505a'; g.fillRect(Math.floor(r() * W), y, len, 1);
    }
    return c;
  }
  function blob(g, x, y, w, h, col) { for (var j = 0; j < h; j++) { var k = Math.sin(Math.PI * (j + .5) / h); var ww = Math.round(w * (.55 + .45 * k)); g.fillStyle = col; g.fillRect(Math.round(x + (w - ww) / 2), y + j, ww, 1); } }
  function bakeClouds() {
    var c = mk(W, 300), g = c2(c), r = rng(5), i;
    var cols = ['#9a9ea7', '#a3a7af', '#8c9099', '#b0b3b9'];
    for (i = 0; i < 70; i++) {
      var w = 40 + r() * 120, h = 6 + r() * 14, x = r() * W - 20, y = r() * 300, col = cols[i % 4];
      for (var dy = -300; dy <= 300; dy += 300) for (var dx = -W; dx <= W; dx += W) blob(g, x + dx, Math.round(y + dy), w, Math.round(h), col);
    }
    return c;
  }
  function bakeRain() {
    var c = mk(240, 240), g = c2(c), r = rng(9);
    for (var i = 0; i < 130; i++) {
      var x = Math.floor(r() * 240), y = Math.floor(r() * 240);
      g.fillStyle = r() < .5 ? 'rgba(220,226,232,0.42)' : 'rgba(200,208,216,0.30)';
      g.fillRect(x, y, 1, 1); g.fillRect((x + 1) % 240, (y + 1) % 240, 1, 1); g.fillRect((x + 1) % 240, (y + 2) % 240, 1, 1);
    }
    return c;
  }
  function bakeCoast() {   // Barranco y Chorrillos de lejos, a la izquierda del Morro
    var c = mk(W, 40), g = c2(c), r = rng(31), x;
    // acantilado lejano que baja hacia la derecha (Barranco → Chorrillos)
    for (x = 70; x < 380; x++) {
      var t = (x - 70) / 310, top = Math.round(14 + t * 16 + Math.sin(x * .09) * 1.5), bot = 39;
      g.fillStyle = '#9e9488'; g.fillRect(x, top, 1, bot - top);
      g.fillStyle = '#8fa088'; g.fillRect(x, top + 2, 1, 2);   // talud verde
      g.fillStyle = '#b4aa9c'; g.fillRect(x, top, 1, 1);
      if (r() < .45 && x < 330) {   // edificios de Barranco/Chorrillos
        var bh = 2 + Math.floor(r() * (x < 200 ? 9 : 5)), bc = ['#d8d4cc', '#c9c2b6', '#b9c3c4', '#e0cfc2', '#a9b3b8'][Math.floor(r() * 5)];
        var bw = 2 + Math.floor(r() * 4); g.fillStyle = bc; g.fillRect(x, top - bh, bw, bh); g.fillStyle = '#8b8a8c'; g.fillRect(x, top - bh, bw, 1);
        x += bw - 1;
      }
    }
    // playa y la Costa Verde baja (pista de Barranco/Chorrillos) con espuma
    g.fillStyle = '#b8ad97'; g.fillRect(70, 37, 310, 2);
    g.fillStyle = '#dfe3e2'; for (x = 70; x < 380; x += 3) g.fillRect(x, 39, 2, 1);
    return c;
  }
  function bakeMorro() {   // ancla abajo-derecha (220, 86): bahía con botes y el Morro Solar
    var w = 220, h = 86, c = mk(w, h), g = c2(c), r = rng(41), x, y;
    function prof(x) { // silueta del Morro: sube desde la bahía, cumbre doble
      var u = x / w;
      var a = Math.exp(-Math.pow((u - .66) / .2, 2)) * 58 + Math.exp(-Math.pow((u - .86) / .12, 2)) * 22 + Math.max(0, (u - .35)) * 30;
      return h - 10 - Math.round(a);
    }
    for (x = 40; x < w; x++) {
      var top = prof(x);
      for (y = top; y < h - 8; y++) {
        var d = (y - top) / (h - 8 - top + 1);
        g.fillStyle = d < .08 ? '#a08f7a' : (d < .45 ? '#8a7b69' : '#776a5b');
        if (((x * 7 + y * 13) % 23) === 0) g.fillStyle = '#6a5e51';
        if (((x * 5 + y * 3) % 31) === 0) g.fillStyle = '#9b8c78';
        g.fillRect(x, y, 1, 1);
      }
    }
    // laderas con quebradas y caminitos
    g.fillStyle = '#6b5f52'; for (var q = 0; q < 6; q++) { var qx = 70 + q * 22; for (y = 0; y < 18; y++) g.fillRect(qx + Math.round(Math.sin(y * .5 + q) * 2) + y, prof(qx + y) + 6 + y, 1, 1); }
    // la Cruz del Morro en la cumbre y el Cristo del Pacífico en la loma
    var cx = Math.round(w * .66), cy = prof(cx);
    g.fillStyle = '#f2f0ea'; g.fillRect(cx, cy - 13, 2, 13); g.fillRect(cx - 4, cy - 10, 10, 2);
    g.fillStyle = '#c9c6bf'; g.fillRect(cx + 1, cy - 13, 1, 13);
    var sx = Math.round(w * .48), sy = prof(sx);
    g.fillStyle = '#dcd8d0'; g.fillRect(sx - 1, sy - 5, 4, 5);                    // pedestal
    g.fillStyle = '#f4f2ec'; g.fillRect(sx, sy - 12, 2, 7); g.fillRect(sx - 3, sy - 11, 8, 1); g.fillRect(sx, sy - 14, 2, 2);   // Cristo con brazos abiertos
    // antenas en la segunda cumbre
    var ax = Math.round(w * .86), ay = prof(ax); g.fillStyle = '#5a5552'; g.fillRect(ax, ay - 8, 1, 8); g.fillRect(ax + 6, ay - 5, 1, 5);
    // Chorrillos al pie: malecón, casitas de colores y muelle
    for (x = 0; x < 80; x++) {
      var th = h - 12 - (x < 40 ? 0 : Math.round((x - 40) * .1));
      if (r() < .6) { var bh = 1 + Math.floor(r() * 4), bc = ['#e8d6b8', '#d58a6a', '#e7c94f', '#8fb5c9', '#efefe8', '#c98fb0'][Math.floor(r() * 6)]; g.fillStyle = bc; g.fillRect(x, th - bh, 2, bh); }
    }
    g.fillStyle = '#b8ad97'; g.fillRect(0, h - 12, 120, 2);
    g.fillStyle = '#6e7a7c'; g.fillRect(0, h - 10, w, 2);
    g.fillStyle = '#5a5047'; g.fillRect(52, h - 10, 26, 1);   // muelle de pescadores
    for (x = 54; x < 78; x += 4) g.fillRect(x, h - 9, 1, 2);
    // botes pesqueros de colores en la bahía
    var bc2 = ['#e0392b', '#2f6fd8', '#ffd23a', '#26a85c', '#f2f2ee', '#ff7a1a'];
    for (var b = 0; b < 16; b++) {
      var bx = 6 + Math.floor(r() * 120), by = h - 7 + Math.floor(r() * 6);
      g.fillStyle = bc2[b % 6]; g.fillRect(bx, by, 4, 1); g.fillRect(bx + 1, by + 1, 2, 1);
      g.fillStyle = '#f2f2ee'; g.fillRect(bx + 1, by - 1, 1, 1);
    }
    c.ax = w; c.ay = h; return c;
  }
  function bakeCliff() {   // 112×256, mosaico vertical; el borde derecho es irregular pero periódico
    var w = 112, h = 256, g = new Gr(w, h), x, y, r = rng(13);
    function edge(y) { return Math.round(84 + Math.sin(y * 2 * Math.PI / h) * 8 + Math.sin(y * 6 * Math.PI / h) * 4 + Math.sin(y * 14 * Math.PI / h) * 2); }
    for (y = 0; y < h; y++) {
      var e = edge(y);
      for (x = 0; x < e; x++) {
        var band = (Math.floor((y + Math.sin(x * .12) * 4) / 9)) % 3;
        var col = ['#9a7b55', '#8a6c49', '#a9895f'][band];
        if (x > e - 6) col = '#6f5638';   // sombra del borde (cara que se aleja)
        else if (x > e - 10) col = '#7d6242';
        g.set(x, y, col);
      }
    }
    // grietas y piedras (con periodicidad vertical: y módulo h)
    for (var i = 0; i < 120; i++) {
      var px0 = Math.floor(r() * 80), py0 = Math.floor(r() * h);
      g.set(px0, py0, '#6d5437'); g.set(px0 + 1, (py0 + 1) % h, '#6d5437');
      if (r() < .4) g.set(px0 + 1, py0, '#c2a476');
    }
    // malla verde (geomalla en rombos) sobre la cara
    for (y = 0; y < h; y++) for (x = 0; x < edge(y) - 3; x++) {
      if (((x + y) % 10 === 0) || ((x - y + 1000) % 10 === 0)) g.set(x, y, ((x + y) % 20 === 0) ? '#2f7d2e' : '#3f8f3a');
    }
    // vegetación colgante (manchas verdes que gotean)
    for (i = 0; i < 26; i++) {
      var vx = Math.floor(r() * 70), vy = Math.floor(r() * h), vw = 6 + Math.floor(r() * 14);
      for (var k = 0; k < vw; k++) {
        var len = 2 + Math.floor(r() * 9);
        for (var j = 0; j < len; j++) g.set(vx + k, (vy + j) % h, j === len - 1 ? '#2f7d2e' : (j < 2 ? '#5fc24e' : '#4caf3e'));
      }
    }
    // borde con contorno
    for (y = 0; y < h; y++) g.set(edge(y), y, '#4e3c27');
    return g.toCanvas(0, 0);
  }
  function bakeBase() {   // 480×90: pie del acantilado, Circuito de Playas, playa de canto rodado y mar cercano
    var c = mk(W, 90), g = c2(c), r = rng(55), x, y;
    // mar cercano
    g.fillStyle = '#4f7f7a'; g.fillRect(0, 8, W, 82);
    g.fillStyle = '#5f8f86'; g.fillRect(0, 8, W, 6);
    for (var i = 0; i < 160; i++) { g.fillStyle = r() < .5 ? '#79a79d' : '#3e6b68'; g.fillRect(Math.floor(r() * W), 14 + Math.floor(r() * 76), 3 + Math.floor(r() * 10), 1); }
    // a la izquierda: pie del acantilado, pista y playa (en diagonal hacia el mar)
    for (x = 0; x < 170; x++) {
      var shore = Math.round(40 + x * .2);   // la orilla
      var road0 = 0, road1 = Math.round(22 - x * .06);
      if (x < 150) {
        g.fillStyle = '#4a4a50'; g.fillRect(x, road0, 1, road1);
        g.fillStyle = '#8a8a90'; g.fillRect(x, road1, 1, 2);            // sardinel
        if ((x >> 3) % 2 === 0) { g.fillStyle = '#e8e6dc'; g.fillRect(x, Math.round(road1 / 2), 1, 1); }
        g.fillStyle = '#7d7b74'; g.fillRect(x, road1 + 2, 1, shore - road1 - 2);   // playa de piedras
      }
    }
    for (i = 0; i < 500; i++) { var sx = Math.floor(r() * 150), sy = 24 + Math.floor(r() * 40); if (sy < 40 + sx * .2) { g.fillStyle = ['#9a988f', '#6b6a64', '#b3b1a8', '#5c5b56'][i % 4]; g.fillRect(sx, sy, 2, 1); } }
    // autos quietos en la pista
    var cars = ['#d23a2a', '#e8e6dc', '#2f5fb8', '#ffd23a'];
    for (i = 0; i < 4; i++) { var cx = 10 + i * 34, cy = 6 + (i % 2) * 6; g.fillStyle = cars[i]; g.fillRect(cx, cy, 14, 5); g.fillStyle = '#9fc3d1'; g.fillRect(cx + 3, cy + 1, 7, 2); g.fillStyle = K; g.fillRect(cx + 1, cy + 5, 3, 1); g.fillRect(cx + 10, cy + 5, 3, 1); }
    // espuma de la orilla
    for (x = 0; x < 175; x++) { var s2 = Math.round(40 + x * .2); g.fillStyle = '#e8efee'; g.fillRect(x, s2, 1, 2); }
    return c;
  }
  function bakeWaves() {
    var out = [];
    for (var f = 0; f < 3; f++) {
      var c = mk(W, 12), g = c2(c);
      for (var x = 0; x < W; x++) {
        var y = Math.round(5 + Math.sin((x + f * 11) * .07) * 2 + Math.sin((x - f * 7) * .19));
        g.fillStyle = '#e8efee'; g.fillRect(x, y, 1, 1);
        if (((x + f * 5) % 9) < 4) { g.fillStyle = '#c6d9d6'; g.fillRect(x, y + 1, 1, 1); }
        if (((x * 3 + f * 13) % 41) < 3) { g.fillStyle = '#ffffff'; g.fillRect(x, y - 1, 1, 1); }
      }
      out.push(c);
    }
    return out;
  }
  function bakeFog() {
    var out = [];
    for (var f = 0; f < 2; f++) {
      var c = mk(150, 26), g = c2(c), r = rng(90 + f);
      for (var i = 0; i < 9; i++) { g.fillStyle = i % 2 ? 'rgba(226,229,233,0.16)' : 'rgba(240,242,244,0.12)'; blob(g, r() * 90, Math.floor(r() * 14), 50 + r() * 60, 8 + Math.floor(r() * 8), g.fillStyle); }
      out.push(c);
    }
    return out;
  }
  function bakeGull() {
    var out = [];
    [[[0, 1], [1, 0], [2, 0], [3, 1], [4, 2], [5, 1], [6, 0], [7, 0], [8, 1]], [[0, 2], [1, 2], [2, 1], [3, 1], [4, 2], [5, 1], [6, 1], [7, 2], [8, 2]]].forEach(function (pts) {
      var g = new Gr(9, 4); pts.forEach(function (p) { g.set(p[0], p[1], '#f2f2ee'); g.set(p[0], p[1] + 1, '#8e939b'); }); g.set(4, 3, '#f2f2ee');
      out.push(g.toCanvas(4, 2));
    });
    return out;
  }
  function bakePelican() {   // de perfil, mirando a la izquierda; 3 aleteos
    var out = [];
    for (var f = 0; f < 3; f++) {
      var g = new Gr(34, 20);
      g.ell(18, 11, 8, 4, '#8a7f70'); g.ell(18, 12, 7, 2.5, '#a0947f');     // cuerpo
      g.rect(9, 8, 4, 3, '#efe8d8'); g.set(11, 7, '#efe8d8');               // cabeza blanca
      g.set(10, 8, K);
      g.line(1, 10, 9, 9, '#d9a35a'); g.line(1, 11, 9, 11, '#c28a45'); g.line(3, 12, 9, 12, '#a7774a');   // pico con buche
      g.rect(25, 10, 5, 2, '#6f6558');                                       // cola
      var wy = [3, 8, 14][f];
      g.line(14, 9, 20, wy, '#6f6558'); g.line(15, 10, 22, wy, '#6f6558'); g.line(20, wy, 28, wy + (f === 1 ? 0 : (f === 0 ? -1 : 2)), '#4e463d'); g.line(16, 10, 24, wy + 1, '#8a7f70');
      g.outline(K);
      out.push(g.toCanvas(17, 11));
    }
    return out;
  }

  /* ==================== ALEXANDER EN EL PARAPENTE ==================== */
  function titina(g, x, y) {   // palomita gris mirando a la derecha, 6×5
    g.set(x + 4, y, P.pg); g.set(x + 3, y, P.pg); g.set(x + 4, y + 1, P.pg); g.set(x + 3, y + 1, P.pg);
    g.set(x + 5, y + 1, P.beak); g.set(x + 4, y, P.peye);
    g.set(x + 4, y + 2, P.irP); g.set(x + 3, y + 2, P.irG); g.set(x + 2, y + 2, P.pg); g.set(x + 1, y + 2, P.pg);
    g.set(x + 4, y + 3, P.pg); g.set(x + 3, y + 3, P.pg); g.set(x + 2, y + 3, P.pgD); g.set(x + 1, y + 3, P.pg); g.set(x, y + 3, P.pgD);
    g.set(x, y + 2, P.pgL); g.set(x + 3, y - 1, P.pgL); g.set(x + 4, y - 1, P.pgL); g.set(x + 2, y + 1, P.pgL); g.set(x + 1, y + 1, P.pgL);
    g.set(x + 2, y + 4, P.peye); g.set(x + 3, y + 4, P.peye);   // patitas
  }
  // pose: 'fly' (flap 0/1), 'shoot', 'charge', 'snap' (0/1), 'load', 'hurt'
  function alexFrame(pose, flap) {
    var g = new Gr(32, 36), u = 0;
    // guitarra a la espalda
    g.line(5, 7, 8, 15, P.woodD); g.line(6, 7, 9, 15, P.woodD); g.rect(4, 5, 3, 2, '#3a2a1e');
    g.disc(8, 19, 3.2, P.wood); g.disc(9, 16, 2.4, P.wood); g.set(9, 18, P.woodD);
    // pierna de atrás
    g.rect(18, 23, 6, 2, P.skinD); g.rect(22, 25, 2, 6, P.skinD); g.rect(22, 31, 3, 1, P.sandal);
    // arnés (asiento)
    g.rect(11, 22, 11, 3, P.strap); g.rect(11, 25, 4, 1, P.strap);
    // shorts (muslo adelante)
    g.rect(13, 20, 10, 3, P.shorts); g.rect(13, 20, 10, 1, P.shortsD);
    // pierna de adelante (cuelga, se mece con el viento)
    var sw = flap ? 1 : 0;
    g.rect(22, 21, 3, 2, P.skin); g.rect(23 + sw, 23, 2, 7, P.skin); g.rect(23 + sw, 30, 4, 1, P.sandal); g.set(26 + sw, 29, P.sandal);
    // torso: camiseta a rayas azules y blancas (inclinado hacia atrás)
    for (var y = 12; y < 21; y++) { var lean = y < 15 ? -1 : 0; for (var x = 13; x < 20; x++) g.set(x + lean, y, ((x >> 1) % 2) ? P.white : P.blue); }
    // la camiseta flamea hacia atrás
    if (flap) { g.set(11, 16, P.white); g.set(11, 17, P.blue); g.set(12, 18, P.white); g.set(11, 19, P.blue); }
    else { g.set(12, 15, P.blue); g.set(11, 17, P.white); g.set(12, 19, P.blue); }
    // cabeza
    g.rect(13, 2, 7, 4, P.hair); g.set(14, 1, P.hair); g.set(17, 1, P.hair); g.rect(12, 4, 3, 5, P.hair);
    g.rect(15, 5, 5, 6, P.face); g.set(15, 6, P.faceL); g.set(16, 6, P.faceL); g.set(15, 8, P.faceL); g.set(20, 7, P.face); g.set(20, 8, P.face);
    g.set(18, 7, P.eye); g.set(15, 7, P.skinD); g.rect(16, 11, 3, 1, P.face); g.rect(16, 12, 2, 1, P.skinD);
    if (pose === 'hurt') { g.set(18, 7, P.eye); g.set(19, 6, P.eye); g.rect(17, 9, 3, 2, '#2a1515'); }
    else if (pose === 'charge' || pose === 'shoot') { g.set(18, 9, P.skinD); g.set(19, 9, P.skinD); }
    else g.set(19, 9, P.skinD);
    // pelo al viento
    if (flap) { g.set(11, 3, P.hair); g.set(10, 4, P.hair); g.set(11, 5, P.hair); } else { g.set(11, 4, P.hair); g.set(10, 5, P.hair); g.set(12, 2, P.hair); }
    // Titina en el hombro (atrás)
    titina(g, 9, 8);
    // brazos + resortera
    function sling(hx, hy, pull, glow) {
      // horqueta de madera
      g.line(hx, hy + 2, hx, hy - 1, P.woodD); g.line(hx, hy - 1, hx + 2, hy - 4, P.wood); g.line(hx, hy - 1, hx - 1, hy - 4, P.wood);
      g.set(hx + 2, hy - 5, P.woodD); g.set(hx - 1, hy - 5, P.woodD);
      if (pull != null) { g.line(hx + 2, hy - 4, pull, hy - 1, P.band); g.line(hx - 1, hy - 4, pull, hy - 1, P.band); if (glow) { g.rect(pull, hy - 2, 5, 2, glow); g.set(pull + 5, hy - 2, '#ffffff'); } }
      else { g.line(hx + 2, hy - 4, hx + 1, hy - 3, P.band); g.line(hx - 1, hy - 4, hx, hy - 3, P.band); }
    }
    if (pose === 'snap') {   // parte las barras con las dos manos frente al pecho
      var gl = flap ? ARROW[1] : ARROW[0];
      g.rect(17, 13, 4, 2, P.skin); g.rect(21, 12, 2, 3, P.skin); g.rect(21, 15, 2, 2, P.skin);
      if (flap) { g.line(23, 10, 25, 13, gl); g.line(23, 16, 25, 14, gl); g.set(26, 13, '#ffffff'); g.set(26, 11, '#fff6c8'); g.set(27, 15, '#fff6c8'); }
      else { g.line(22, 10, 22, 17, gl); g.set(22, 13, '#ffffff'); }
    } else if (pose === 'load') {
      g.rect(17, 13, 5, 2, P.skin); g.rect(22, 13, 3, 2, P.skin); sling(26, 14, 19, ARROW[2]);
      g.rect(18, 15, 3, 2, P.skin);
    } else if (pose === 'charge') {
      g.rect(17, 13, 6, 2, P.skin); g.rect(23, 13, 3, 2, P.skin); sling(27, 14, 18, '#ffffff'); g.rect(17, 15, 3, 2, P.skin);
    } else if (pose === 'shoot') {
      g.rect(17, 13, 7, 2, P.skin); g.rect(24, 13, 3, 2, P.skin); sling(28, 14, null); g.rect(18, 15, 3, 2, P.skin);
    } else if (pose === 'hurt') {
      g.rect(17, 12, 3, 2, P.skin); g.rect(20, 9, 2, 4, P.skin); sling(22, 9, null);
    } else {
      g.rect(17, 13, 6, 2, P.skin); g.rect(23, 14, 2, 2, P.skin); sling(25, 15, 24, null);
    }
    // correas al parapente (salen de los hombros)
    g.line(14, 12, 12, 7, P.strap); g.line(19, 12, 21, 9, P.strap);
    g.outline(K);
    return g.toCanvas(16, 18);
  }
  function wingCanvas(w, h, hx, hy, cols, trim, label, labInk, labBg, seed) {   // vela curva con cordinos que bajan al arnés (hx, hy)
    var g = new Gr(w, h), x, y, cells = 9;
    var cw = w / cells;
    function top(x) { var u = (x - w / 2) / (w / 2); return Math.round(3 + u * u * 9); }
    for (x = 2; x < w - 2; x++) {
      var t0 = top(x), th = 7 - Math.round(Math.abs((x - w / 2) / (w / 2)) * 1.5);
      var ci = Math.floor((x - 2) / cw) % cols.length;
      for (y = t0; y < t0 + th; y++) g.set(x, y, cols[ci]);
      g.set(x, t0 + th, trim); g.set(x, t0, mixLight(cols[ci]));
      if (((x - 2) % Math.round(cw)) === 0) for (y = t0 + 1; y < t0 + th; y++) g.set(x, y, shade(cols[ci]));   // costuras
    }
    // cordinos
    var anchors = [6, Math.round(w * .28), Math.round(w * .5), Math.round(w * .72), w - 7];
    anchors.forEach(function (ax) { var t = top(ax) + 7; g.line(ax, t, hx, hy, '#cfcac0'); });
    g.outline(K);
    // etiqueta (logo) en el centro de la vela
    if (label && ACH.px && ACH.px.text) {
      var m = ACH.px.measure(label, 'a5', 1), lx = Math.round(w / 2 - m / 2), ly = top(w / 2) + 1;
      g.rect(lx - 2, ly - 1, m + 4, 7, labBg); ACH.px.text(g, label, lx, ly, { font: 'a5', ink: labInk });
    }
    return g.toCanvas(hx, hy);
  }
  function shade(h) { var n = parseInt(h.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return 'rgb(' + Math.round(r * .78) + ',' + Math.round(g * .78) + ',' + Math.round(b * .78) + ')'; }
  function mixLight(h) { var n = parseInt(h.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return 'rgb(' + Math.round(r + (255 - r) * .45) + ',' + Math.round(g + (255 - g) * .45) + ',' + Math.round(b + (255 - b) * .45) + ')'; }

  /* ==================== EL TABLAZO ==================== */
  // pose: 'idle' (f), 'pull', 'throw', 'rage' (f), 'dead'
  function bossFrame(pose, f) {
    var g = new Gr(38, 40), rage = pose === 'rage';
    var sk = rage ? '#a39276' : P.zs, skD = rage ? '#6f5c48' : P.zsD;
    // tablas colgando del arnés (detrás, lado derecho)
    var bc = [BOARD[0][0], BOARD[1][0], BOARD[2][0], BOARD[3][0]];
    for (var i = 0; i < 4; i++) {
      var bx = 24 + i * 3, by = 12 + (i % 2) * 2 + (f && i % 2 ? 1 : 0);
      g.rect(bx, by + 1, 3, 15, bc[i]); g.rect(bx + 1, by, 1, 17, bc[i]); g.rect(bx + 1, by + 3, 1, 10, BOARD[i][1]);
    }
    // arnés
    g.rect(12, 23, 14, 3, '#2a2a2a'); g.rect(22, 21, 4, 5, '#2a2a2a');
    // piernas hacia la izquierda (neopreno con botines)
    g.rect(8, 22, 8, 3, P.suit); g.rect(7, 25, 3, 7 + (f ? 1 : 0), P.suit); g.rect(5, 32 + (f ? 1 : 0), 5, 2, '#111');
    g.rect(13, 24, 3, 6, P.suitL); g.rect(12, 30, 4, 2, '#111');
    g.set(8, 27, sk); g.set(9, 28, sk);   // roto en la canilla
    // torso de neopreno roto
    g.rect(14, 12, 9, 11, P.suit); g.rect(15, 13, 1, 8, P.suitL);
    g.rect(17, 15, 3, 3, sk); g.set(16, 16, sk); g.set(20, 19, sk); g.set(21, 20, sk); g.set(18, 18, skD);
    g.set(22, 14, P.turq); g.set(22, 15, P.turq);   // logo del traje
    // cabeza
    g.rect(13, 4, 8, 8, sk); g.rect(12, 6, 1, 4, sk); g.rect(13, 11, 6, 1, skD);
    g.set(14, 6, rage ? '#ff3b3b' : P.zeye); g.set(15, 6, rage ? '#ff3b3b' : P.zeye); g.set(14, 7, K);
    if (rage) { g.set(13, 5, '#5b1d1d'); g.set(16, 5, '#5b1d1d'); }
    // boca abierta con dientes
    g.rect(12, 8, 4, 3, '#2a1515'); g.set(13, 8, '#e9e4cf'); g.set(15, 8, '#e9e4cf'); g.set(14, 10, '#e9e4cf');
    g.set(17, 9, skD); g.set(19, 7, skD);
    // pelo decolorado en púas (raíces oscuras)
    g.rect(14, 1, 8, 3, P.bleach); g.set(13, 2, P.bleach); g.set(12, 3, P.bleach); g.set(15, 0, P.bleach); g.set(18, 0, P.bleach); g.set(21, 0, P.bleach);
    g.set(22, 2, P.bleach); g.set(23, 3, P.bleach); g.set(22, 4, P.bleachD); g.rect(19, 4, 3, 2, P.bleachD); g.set(16, 3, P.bleachD); g.set(20, 2, P.bleachD);
    if (f) { g.set(24, 2, P.bleach); g.set(23, 1, P.bleach); }
    g.set(20, 7, sk); g.set(20, 8, skD);   // oreja
    // brazos
    if (pose === 'pull') {   // saca una tabla por encima de la cabeza (aviso)
      g.rect(19, 12, 3, 2, sk); g.rect(20, 5, 2, 7, sk); g.rect(17, 2, 2, 4, sk);
      g.rect(4, 0, 22, 4, BOARD[0][0]); g.rect(5, 1, 20, 1, BOARD[0][1]); g.set(3, 1, BOARD[0][0]); g.set(26, 2, BOARD[0][0]);
    } else if (pose === 'throw') {
      g.rect(9, 13, 6, 2, sk); g.rect(5, 12, 4, 2, sk); g.set(4, 11, skD); g.set(4, 14, skD);
      g.rect(16, 16, 2, 4, sk);
    } else if (pose === 'dead') {
      g.rect(10, 8, 2, 5, sk); g.rect(21, 8, 2, 5, sk); g.set(14, 6, K); g.set(15, 7, K); g.set(15, 6, P.zeye);
    } else {
      g.rect(11, 14, 4, 2, sk); g.rect(10, 16, 2, 3 + (f ? 1 : 0), sk); g.set(10, 19 + (f ? 1 : 0), skD);
      g.rect(20, 13, 2, 5, sk);
    }
    // cordinos al ala
    g.line(15, 12, 13, 7, '#2a2a2a'); g.line(21, 12, 23, 8, '#2a2a2a');
    g.outline(K);
    return g.toCanvas(19, 18);
  }
  function tornWing(hx, hy, side) {   // media vela rota (side 0 izquierda, 1 derecha)
    var w = 44, h = 30, g = new Gr(w, h), x, y, r = rng(60 + side);
    for (x = 0; x < w; x++) {
      var t0 = Math.round(4 + (side ? x : w - x) * .12), th = 6 - Math.floor(r() * 3);
      for (y = t0; y < t0 + th; y++) g.set(x, y, (Math.floor(x / 9) % 2) ? P.turq : P.turqD);
      if (r() < .3) g.set(x, t0 + th, P.turqD);
    }
    var ax = side ? 4 : w - 5; for (var k = 0; k < 3; k++) g.line(ax + (side ? k * 10 : -k * 10), 10, side ? 2 : w - 3, h - 2, '#cfcac0');
    g.outline(K);
    return g.toCanvas(w / 2, h / 2);
  }

  /* ==================== PROYECTILES ==================== */
  function boardBase(ci) {
    var g = new Gr(26, 8), c = BOARD[ci];
    g.ell(12.5, 3.5, 12, 3.2, c[0]); g.rect(2, 3, 22, 1, c[1]); g.rect(1, 4, 24, 1, c[2]);
    g.set(20, 6, '#2a2a2a'); g.set(21, 7, '#2a2a2a');   // quilla
    g.outline(K);
    return g.toCanvas(13, 4);
  }
  function rotations(src, n, size) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var c = mk(size, size), g = c2(c);
      g.translate(size / 2, size / 2); g.rotate(i * Math.PI / n); g.drawImage(src, -src.ax, -src.ay);
      c.ax = size / 2; c.ay = size / 2; out.push(c);
    }
    return out;
  }
  function bakeArrows(A) {
    A.arrow = []; A.trail = []; A.halo = []; A.spark = [];
    ARROW.forEach(function (col) {
      var g = new Gr(11, 5);
      g.rect(1, 1, 7, 3, col); g.rect(2, 2, 5, 1, '#ffffff'); g.set(8, 2, col); g.set(9, 2, '#ffffff');   // barrita con punta
      g.set(0, 1, '#e6e6e0'); g.set(0, 3, '#e6e6e0');                                           // pluma
      g.outline('#1c1a22');
      A.arrow.push(g.toCanvas(9, 2));
      var t = mk(24, 5), tg = c2(t), rgb = hexRgb(col);
      for (var x = 0; x < 24; x++) { var a = (x / 24); tg.fillStyle = 'rgba(' + rgb + ',' + (a * .55).toFixed(3) + ')'; tg.fillRect(x, 1, 1, 3); tg.fillStyle = 'rgba(255,255,255,' + (a * .5).toFixed(3) + ')'; tg.fillRect(x, 2, 1, 1); }
      t.ax = 24; t.ay = 2; A.trail.push(t);
      var hc = mk(15, 11), hg = c2(hc);
      hg.fillStyle = 'rgba(' + rgb + ',0.16)'; hg.fillRect(2, 0, 11, 11); hg.fillRect(0, 2, 15, 7);
      hg.fillStyle = 'rgba(' + rgb + ',0.22)'; hg.fillRect(3, 2, 9, 7); hg.fillRect(2, 3, 11, 5);
      hc.ax = 7; hc.ay = 5; A.halo.push(hc);
      var sg = new Gr(7, 7); sg.set(3, 0, col); sg.set(3, 6, col); sg.set(0, 3, col); sg.set(6, 3, col); sg.set(3, 3, '#ffffff'); sg.set(2, 3, col); sg.set(4, 3, col); sg.set(3, 2, col); sg.set(3, 4, col);
      A.spark.push(sg.toCanvas(3, 3));
    });
  }
  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255); }
  function bakeSplash() {
    var out = [];
    for (var f = 0; f < 5; f++) {
      var g = new Gr(64, 48), k = (f + 1) / 5, x;
      var hgt = Math.round([10, 30, 42, 30, 14][f]), wid = Math.round(10 + k * 22);
      for (x = -wid; x <= wid; x++) {
        var u = x / wid, hh = Math.round(hgt * (1 - u * u) * (Math.abs(u) > .25 ? 1 : (f > 1 ? .55 : 1)));
        for (var y = 0; y < hh; y++) g.set(32 + x, 46 - y, y > hh - 3 ? '#ffffff' : (y > hh * .5 ? '#d6ecec' : '#9cc7c4'));
      }
      for (var d = 0; d < 10 + f * 3; d++) { var a = Math.PI * (d / (10 + f * 3)), rr = hgt * .9 + (d % 3) * 3; g.set(32 + Math.cos(a) * rr * (wid / 22), 46 - Math.sin(a) * rr, '#ffffff'); }
      g.rect(32 - wid - 4, 46, wid * 2 + 8, 2, '#e8efee');
      g.outline('#2c4b55');
      out.push(g.toCanvas(32, 47));
    }
    return out;
  }

  /* ==================== HUD ==================== */
  function bakeHud(A) {
    var hd = {};
    function heart(c1, c2) { var g = new Gr(9, 8); g.rect(1, 1, 3, 3, c1); g.rect(5, 1, 3, 3, c1); g.rect(1, 3, 7, 2, c1); g.rect(2, 5, 5, 1, c1); g.rect(3, 6, 3, 1, c1); g.set(4, 7, c1); g.set(2, 2, c2); g.outline(K); return g.toCanvas(0, 0); }
    hd.heart = heart('#ff2e88', '#ffc1dd'); hd.heartE = heart('#3a3240', '#4b4252');
    // marco de la barra del jefe (chicha)
    var bf = mk(176, 12), bg = c2(bf);
    bg.fillStyle = K; bg.fillRect(0, 0, 176, 12); bg.fillStyle = '#ff2e88'; bg.fillRect(1, 1, 174, 1); bg.fillRect(1, 10, 174, 1); bg.fillStyle = '#1fe07a'; bg.fillRect(1, 2, 1, 8); bg.fillRect(174, 2, 1, 8);
    bg.fillStyle = '#2a2430'; bg.fillRect(3, 3, 170, 6);
    hd.bossFrame = bf;
    // barra de altura
    var ab = mk(14, 208), ag = c2(ab);
    ag.fillStyle = K; ag.fillRect(0, 0, 14, 208);
    var seg = ['#9fb6c9', '#93adc0', '#86a2b5', '#7896a8', '#6a8a9b', '#5d7e8e', '#507282', '#456776'];
    for (var i = 0; i < 8; i++) { ag.fillStyle = seg[i]; ag.fillRect(3, 2 + i * 25.5, 8, 26); }
    ag.fillStyle = '#4f7f7a'; ag.fillRect(3, 196, 8, 10); ag.fillStyle = '#e8efee'; ag.fillRect(3, 196, 8, 1);
    for (i = 0; i <= 10; i++) { ag.fillStyle = '#f2f2ee'; ag.fillRect(1, Math.round(2 + i * 20.4), i % 5 ? 2 : 4, 1); }
    ag.fillStyle = '#ff2e88'; ag.fillRect(0, Math.round(2 + 204 * (1 - 30 / 300)), 14, 1);   // los 30 m
    hd.altBar = ab;
    // cartel del jefe (estilo chicha)
    var cw = 236, ch = 58, cv = mk(cw, ch), cg = c2(cv);
    cg.fillStyle = K; cg.fillRect(0, 0, cw, ch);
    var bandC = ['#ff2e88', '#ffe500', '#1fe07a'];
    for (i = 0; i < 3; i++) { cg.fillStyle = bandC[i]; cg.fillRect(2 + i * 2, 2 + i * 2, cw - 4 - i * 4, 1); cg.fillRect(2 + i * 2, ch - 3 - i * 2, cw - 4 - i * 4, 1); cg.fillRect(2 + i * 2, 2 + i * 2, 1, ch - 4 - i * 4); cg.fillRect(cw - 3 - i * 2, 2 + i * 2, 1, ch - 4 - i * 4); }
    for (i = 0; i < 18; i++) { cg.fillStyle = bandC[i % 3]; cg.fillRect(10 + i * 12, 9, 6, 2); cg.fillRect(10 + i * 12, ch - 11, 6, 2); }
    var kick = text('JEFE DE LA COSTA VERDE', { font: 'a5', ink: '#1fe07a' });
    var name = text('EL TABLAZO', { font: 'a12', ink: '#ffe500', outline: '#ff2e88', shadow: '#5a1036', scale: 1 });
    var sub = text('SURFISTA ZOMBI - TIRA TABLAS', { font: 'a5', ink: '#f2f2ee' });
    cg.drawImage(kick, Math.round(cw / 2 - kick.width / 2), 13);
    cg.drawImage(name, Math.round(cw / 2 - name.width / 2), 21);
    cg.drawImage(sub, Math.round(cw / 2 - sub.width / 2), 39);
    hd.card = cv;
    hd.digits = {};
    '0123456789m '.split('').forEach(function (d) { hd.digits[d] = text(d, { font: 'a5', ink: '#f2f2ee', outline: K }); });
    var tl = function (s, ink, ol, f, sc) { return text(s, { font: f || 'a12', ink: ink, outline: ol || K, shadow: '#000000', scale: sc || 1 }); };
    hd.toasts = {
      luces: tl('¡LUCES DE FIESTA!', '#1fe07a', '#ff2e88'),
      rasa: tl('¡TABLA RASA, COMPADRE!', '#ffe500', '#ff2e88'),
      splash: tl('¡SPLASH!', '#ffffff', '#1c86ad', 'a12', 2),
      furioso: tl('¡SE PICÓ EL TABLAZO!', '#ff4b4b', K),
      ola: tl('¡SE VIENE LA OLA, CAUSA!', '#4fe3ff', K, 'a7'),
      tablazo: tl('¡TABLAZO!', '#ffe500', K, 'a7'),
      pausa: tl('PAUSA', '#ffe500', '#ff2e88', 'a12', 2),
      pausaSub: tl('ESC PARA SEGUIR', '#f2f2ee', K, 'a7'),
      revolcon: tl('¡TE REVOLCÓ LA OLA!', '#ff2e88', K),
      altura: text('ALTURA', { font: 'a5', ink: '#ffe500', outline: K }),
      fuego: text('ESPACIO / CLIC: DISPARA - MANTÉN: ABANICO', { font: 'a5', ink: '#f2f2ee', outline: K }),
      mueve: text('W/S ↕  A/D ↔', { font: 'a5', ink: '#f2f2ee', outline: K }),
      tactil: text('TOCA Y ARRASTRA PARA MOVERTE', { font: 'a5', ink: '#f2f2ee', outline: K }),
      bonus: text('+0%', { font: 'a5', ink: '#1fe07a', outline: K })
    };
    hd.toasts.mueve = text('W/S Y A/D PARA MOVERTE', { font: 'a5', ink: '#f2f2ee', outline: K });
    // botón táctil de disparo
    var fb = new Gr(44, 44); fb.disc(22, 22, 20, '#ff2e88'); fb.disc(22, 22, 17, '#2a1430'); fb.disc(22, 22, 15, '#ff2e88'); fb.outline(K);
    var fc = fb.toCanvas(22, 22), fg = c2(fc), ft = text('¡PUM!', { font: 'a7', ink: '#ffe500', outline: K }); fg.drawImage(ft, Math.round(22 - ft.width / 2), 17);
    hd.fireBtn = fc;
    A.hud = hd;
  }

  var A = null;
  function bake() {
    if (A) return A;
    var t0 = (window.performance || Date).now();
    A = { W: W, H: H, HOR: HOR, COL: { arrow: ARROW, board: BOARD }, text: text };
    A.bg = bakeBg(); A.clouds = bakeClouds(); A.rain = bakeRain(); A.coast = bakeCoast(); A.morro = bakeMorro();
    A.cliff = bakeCliff(); A.base = bakeBase(); A.waves = bakeWaves(); A.fog = bakeFog(); A.gull = bakeGull(); A.pelican = bakePelican();
    A.alex = { fly: [alexFrame('fly', 0), alexFrame('fly', 1)], shoot: alexFrame('shoot', 0), charge: alexFrame('charge', 0),
      snap: [alexFrame('snap', 0), alexFrame('snap', 1)], load: alexFrame('load', 0), hurt: alexFrame('hurt', 1) };
    A.alexWing = wingCanvas(76, 56, 38, 46, ['#ff2e88', '#ffe500'], '#1fe07a', 'ACHORADO', '#ffe500', K);
    A.boss = { idle: [bossFrame('idle', 0), bossFrame('idle', 1)], pull: bossFrame('pull', 0), throw: bossFrame('throw', 0),
      rage: [bossFrame('rage', 0), bossFrame('rage', 1)], dead: bossFrame('dead', 0) };
    // silueta blanca para el golpe (parpadeo)
    A.bossHurt = whiteOf(A.boss.idle[0]);
    A.alexHurtW = whiteOf(A.alex.hurt);
    A.bossWing = wingCanvas(84, 58, 42, 48, [P.turq, P.turqD], P.turqL, 'SURF', '#ffffff', P.turqD);
    A.wingTorn = [tornWing(0, 0, 0), tornWing(0, 0, 1)];
    A.board = []; for (var i = 0; i < BOARD.length; i++) A.board.push(rotations(boardBase(i), 8, 30));
    bakeArrows(A);
    A.splash = bakeSplash();
    bakeHud(A);
    A.bakeMs = Math.round((window.performance || Date).now() - t0);
    return A;
  }
  function whiteOf(cv) {   // copia en blanco (sin getImageData): se pinta con composición source-in
    var c = mk(cv.width, cv.height), g = c2(c);
    g.drawImage(cv, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
    c.ax = cv.ax; c.ay = cv.ay; return c;
  }

  SC.caida = { bake: bake, ready: function () { return !!A; }, text: text };
})();
