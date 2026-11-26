/* ACHORADO v0.13 (T3, agente S) — js/sprites/zombis-v013.js: skins propios (no un caminante repintado) para seis zombis de los niveles nuevos.
   Gambetta:     gb_lucho (Don Lucho, el cobrador conocido: quepí, canguro de monedas, talonario; lo pone gambetta.js en setupLucho)
   Kennedy:      mira_turista (cámara al cuello, sombrero de paja, camisa floreada) · mira_jogger (trota inclinado, vincha, auriculares) · mira_sereno (uniforme, quepí, silbato)
   Costa Verde:  cv_barista (delantal verde, gorra, vaso en la mano) · cv_reySelfie (corona, capa, palo de selfie) · cv_dronero (chaleco safari, mochila, control remoto)
   Formato ACH.sprites.zvar[tipo] = { move[6], hurt[6], dead, windup[2], hurtWindup[2] }  (windup: lo elige ACH.zvar.frame cuando z.zpose = 'windup').
   Mismo tamaño y ancla que los demás zombis de la Costa Verde: 36×36 con ancla (16,34); los altos (sereno, dronero) 36×42 con ancla (16,40).
   Se hornean al primer acceso (propiedad perezosa de zvar, igual que costaverde/arte-personajes.js): no cuestan nada en las páginas que no los usan.
   También: ACH.sprites.cv.t2.dron (el dron del turista, 4 cuadros más grandes y con luces) y ACH.sprites.zv13 = { build(key), keys, dronShadow() } para las hojas de prueba.
   Estilo: pixel art desaturado (SPEC v0.4), contorno #141216 y reborde claro arriba/izquierda como los demás zombis. Piel verdosa de zombi. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var S = ACH.sprites = ACH.sprites || {};
  var INK = '#141216', RIM_T = '#d5dbe0', RIM_L = '#9fb0c4';

  /* ---------------- color ---------------- */
  function rgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function hx(a) { return '#' + a.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return ('0' + v.toString(16)).slice(-2); }).join(''); }
  // rampa de 4 tonos [oscuro, sombra, base, luz] a partir de la base
  function ramp(h) {
    var c = rgb(h);
    return [hx([c[0] * 0.42 + 6, c[1] * 0.42 + 6, c[2] * 0.48 + 12]), hx([c[0] * 0.7, c[1] * 0.7, c[2] * 0.76]), h, hx([c[0] + (255 - c[0]) * 0.32, c[1] + (255 - c[1]) * 0.32, c[2] + (255 - c[2]) * 0.3])];
  }
  var SK = ['#3f4a44', '#5f6b55', '#7f8c71', '#a3ad8a'];          // piel verdosa de los zombis (la misma de arte-personajes)
  var SKY = ['#4a4a34', '#6b663c', '#948a52', '#bab172'];         // piel amarillenta (turista quemado de sol)
  var BLK = ramp('#2a2830'), WHT = ramp('#e8e4d4');

  /* ---------------- buffer de píxeles ---------------- */
  function Buf(w, h) { this.w = w; this.h = h; this.d = new Array(w * h); }
  Buf.prototype.set = function (x, y, c) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.d[y * this.w + x] = c; };
  Buf.prototype.get = function (x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? undefined : this.d[y * this.w + x]; };
  Buf.prototype.rect = function (x, y, w, h, c) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.set(x + i, y + j, c); };
  // caja con volumen: luz a la izquierda y arriba, sombra a la derecha y abajo
  Buf.prototype.sh = function (x, y, w, h, R) {
    this.rect(x, y, w, h, R[2]);
    if (w >= 3) { this.rect(x, y, 1, h, R[3]); this.rect(x + w - 1, y, 1, h, R[1]); } else if (w === 2) this.rect(x + 1, y, 1, h, R[1]);
    if (h >= 3) this.rect(x, y + h - 1, w, 1, R[1]);
    if (h >= 4 && w >= 3) this.rect(x + 1, y, w - 2, 1, R[3]);
  };
  Buf.prototype.ell = function (cx, cy, rx, ry, R) {
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      var nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny > 1) continue;
      var v = nx + ny;
      this.set(x, y, v < -0.75 ? R[3] : (v > 0.6 ? R[1] : R[2]));
    }
  };
  // tubo de ancho w por una recta (cada paso pone una caja w×w); sombra en la columna derecha
  Buf.prototype.tube = function (x0, y0, x1, y1, w, R) {
    var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1), i, x, y;
    for (i = 0; i <= n; i++) {
      x = Math.round(x0 + (x1 - x0) * i / n); y = Math.round(y0 + (y1 - y0) * i / n);
      for (var k = 0; k < w; k++) this.set(x + k, y, k === w - 1 && w > 1 ? R[1] : (k === 0 && w > 2 ? R[3] : R[2]));
    }
  };
  // tubo horizontal con el grosor en vertical (cadáveres): arriba claro, abajo sombra
  Buf.prototype.tubeH = function (x0, y0, x1, y1, h, R) {
    var n = Math.max(Math.abs(x1 - x0), 1), i, x, y;
    for (i = 0; i <= n; i++) {
      x = Math.round(x0 + (x1 - x0) * i / n); y = Math.round(y0 + (y1 - y0) * i / n);
      for (var k = 0; k < h; k++) this.set(x, y + k, k === h - 1 && h > 1 ? R[1] : (k === 0 && h > 2 ? R[3] : R[2]));
    }
  };
  Buf.prototype.line = function (x0, y0, x1, y1, c) {
    var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (var i = 0; i <= n; i++) this.set(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c);
  };
  Buf.prototype.canvas = function (ax, ay, white) {
    var W = this.w, H = this.h, d = this.d, c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d'), im = g.createImageData(W, H), px = im.data, x, y;
    function f(xx, yy) { return xx >= 0 && yy >= 0 && xx < W && yy < H && !!d[yy * W + xx]; }
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var col = d[y * W + x], o = (y * W + x) * 4;
      if (!col) {
        if (f(x, y + 1)) col = RIM_T; else if (f(x + 1, y)) col = RIM_L;
        else if (f(x - 1, y) || f(x, y - 1)) col = INK;
        else continue;
      }
      if (white) col = '#ffffff';
      var q = rgb(col); px[o] = q[0]; px[o + 1] = q[1]; px[o + 2] = q[2]; px[o + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    c.ax = ax; c.ay = ay; c.prov = false;
    return c;
  };

  /* ---------------- humanoide genérico de perfil (mira a la derecha; el motor voltea) ---------------- */
  // o: {H, AY, body:{legL, torsoL, tw, armL, hunch, legW}, skin, top, sleeve:'short'|'long'|'none', pants, legSeg:[[filas, rampa]…], shoe, gait, hat(c), deco(c), front(c), back(c), arms(c), face(c)}
  function gait(f, k) {
    var th = f / 6 * Math.PI * 2, s = Math.sin(th), cs = Math.cos(th), A = k.stride === undefined ? 3 : k.stride, Lf = k.lift === undefined ? 2 : k.lift;
    var bob = k.run ? (Math.abs(cs) > 0.55 ? 0 : 1) : (Math.abs(s) > 0.8 ? 1 : 0);
    return { s: s, c: cs, dy: k.still ? 0 : bob, nx: Math.round(s * A), nl: Math.max(0, Math.round(cs * Lf)), fx: Math.round(-s * A), fl: Math.max(0, Math.round(-cs * Lf)), arm: k.arm === undefined ? 2 : k.arm, lean: k.lean || 0, run: !!k.run };
  }
  function leg(c, hipX, dx, lift, near) {
    var o = c.o, B = o.body, b = c.b, gy = c.gy, hipY = c.hipY, w = B.legW || 3, shoeTop = gy - 1 - lift, y, x, t;
    var segs = o.legSeg || [[99, o.pants]], rows = shoeTop - 1 - hipY, acc = 0, si = 0;
    for (y = hipY + 1; y <= shoeTop - 1; y++) {
      t = rows > 0 ? (y - hipY - 1) / Math.max(1, rows - 1) : 0;
      x = Math.round(hipX + dx * t);
      var from = y - hipY - 1;
      while (si < segs.length - 1 && from >= acc + segs[si][0]) { acc += segs[si][0]; si++; }
      var R = segs[si][1];
      if (!near) R = [R[0], R[0], R[1], R[1]];
      for (var k = 0; k < w; k++) b.set(x - (w >> 1) + k, y, k === w - 1 ? R[1] : (k === 0 && w > 2 ? R[3] : R[2]));
    }
    var fx = Math.round(hipX + dx), SR = near ? o.shoe : [o.shoe[0], o.shoe[0], o.shoe[1], o.shoe[1]];
    b.rect(fx - 1, shoeTop, w + 2, 1, SR[3]); b.rect(fx - 1, shoeTop + 1, w + 2, 1, SR[1]);
    b.set(fx + w + 0, shoeTop, SR[2]); b.set(fx + w + 0, shoeTop + 1, SR[0]);
    if (o.sole) b.rect(fx - 1, shoeTop + 1, w + 3, 1, o.sole);
  }
  // brazo: hombro → codo → mano, 2 px de ancho
  function armDraw(c, S0, E, Hd, near) {
    var o = c.o, b = c.b, sl = o.sleeve || 'short', TR = o.top, SR = o.skin;
    if (!near) { TR = [TR[0], TR[0], TR[1], TR[1]]; SR = [SR[0], SR[0], SR[1], SR[1]]; }
    b.tube(S0[0], S0[1], E[0], E[1], 2, sl === 'none' ? SR : TR);
    if (sl === 'long') b.tube(E[0], E[1], Hd[0], Hd[1] - 1, 2, o.cuff ? (near ? o.cuff : [o.cuff[0], o.cuff[0], o.cuff[1], o.cuff[1]]) : TR);
    else b.tube(E[0], E[1], Hd[0], Hd[1] - 1, 2, SR);
    b.rect(Hd[0], Hd[1] - 1, 2, 2, SR[2]); b.set(Hd[0], Hd[1] - 1, SR[3]); b.set(Hd[0] + 1, Hd[1], SR[1]);
  }
  function human(o, f, pose) {
    var B = o.body, b = new Buf(36, o.H), gy = o.AY - 1, hipY = gy - B.legL;
    var G = gait(f, pose === 'windup' ? { still: true, stride: 1, lift: 0, arm: 0 } : (o.gait || {}));
    var cx = 16, tw = B.tw, tl = Math.round(G.lean / 2);
    var tTop = hipY - B.torsoL + 1 + G.dy, tx = cx - (tw >> 1) + tl;
    var hcx = cx + 1 + G.lean, ht = tTop - 7 + (B.hunch || 0) + (o.headDy || 0);
    var c = { b: b, o: o, cx: cx, gy: gy, hipY: hipY, tTop: tTop, tx: tx, tw: tw, hcx: hcx, ht: ht, G: G, f: f, pose: pose, tl: tl };
    // atrás: mochila, capa…
    if (o.back) o.back(c);
    // brazo lejano
    var armL = B.armL || 8, sFx = tx + 1, sFy = tTop + 2, sNx = tx + tw - 2, sNy = tTop + 2, A = o.arms ? o.arms(c) : null;
    var fh = A && A.f ? A.f : { e: [sFx + G.arm, sFy + (armL >> 1)], h: [sFx + 1 + G.arm * 2 - 0, sFy + armL] };
    var nh = A && A.n ? A.n : { e: [sNx - G.arm + 1, sNy + (armL >> 1)], h: [sNx + 1 - G.arm * 2 + 1, sNy + armL] };
    var farFront = A && A.farFront;
    if (!farFront) armDraw(c, [sFx, sFy], fh.e, fh.h, false);
    // piernas (la lejana primero)
    leg(c, cx - 1 + tl, G.fx, G.fl, false);
    leg(c, cx + 1 + tl, G.nx, G.nl, true);
    // torso
    o.torso ? o.torso(c) : torso(c);
    if (o.deco) o.deco(c);
    // cabeza
    head(c);
    if (o.hat) o.hat(c);
    // brazo cercano delante del torso
    armDraw(c, [sNx, sNy], nh.e, nh.h, true);
    if (farFront) armDraw(c, [sFx + 1, sFy], fh.e, fh.h, true);
    if (o.front) o.front(c, nh, fh);
    return b;
  }
  function torso(c) {
    var o = c.o, b = c.b, B = o.body, tx = c.tx, tw = c.tw, top = c.tTop, h = c.hipY - top + 1, R = o.top;
    b.sh(tx, top, tw, h, R);
    b.set(tx, top, null); b.set(tx + tw - 1, top, null);                 // hombros redondeados
    b.rect(tx, top + 1, 1, 1, R[3]);
    // cinturón / bajos
    if (o.belt) { b.rect(tx, c.hipY - 1, tw, 1, o.belt); b.rect(tx + (tw >> 1) + 1, c.hipY - 1, 2, 1, o.buckle || '#cdbf8e'); }
    else b.rect(tx, c.hipY, tw, 1, o.pants[1]);
  }
  function head(c) {
    var o = c.o, b = c.b, hcx = c.hcx, ht = c.ht, SR = o.skin;
    // cuello
    b.rect(hcx - 2, ht + 7, 4, 2, SR[1]);
    b.ell(hcx, ht + 3.5, 4.1, 4.2, SR);
    b.set(hcx - 4, ht + 2, null); b.set(hcx - 4, ht + 5, SR[1]);
    // oreja
    b.set(hcx - 2, ht + 4, SR[1]); b.set(hcx - 2, ht + 5, SR[0]);
    if (o.face) { o.face(c); return; }
    // ojo y boca
    b.set(hcx + 1, ht + 3, '#e8e4cc'); b.set(hcx + 2, ht + 3, '#e8e4cc'); b.set(hcx + 2, ht + 4, '#2a1a1c'); b.set(hcx + 1, ht + 2, SR[0]);
    b.rect(hcx + 1, ht + 6, 3, 1, '#2c1a1c'); if (c.f % 2) b.set(hcx + 2, ht + 7, '#7a2a2a');
    b.set(hcx + 3, ht + 5, SR[1]);
  }

  /* ---------------- cadáver visto desde arriba (cabeza a la izquierda, como los de zombies.js) ---------------- */
  function deadFig(o) {
    var W = o.deadW || 31, b = new Buf(W, 18), cy = 9, tx0 = 9, tl = o.deadTorso || 11, th = o.deadTh || 8;
    var top = cy - (th >> 1), bot = top + th - 1, lx = tx0 + tl, legL = W - lx - 3, SR = o.skin;
    // brazos
    [[top - 2, -1], [bot + 1, 1]].forEach(function (a, i) {
      b.tubeH(tx0 + 2, a[0], tx0 + 9, a[0] + a[1], 2, o.sleeve === 'long' ? o.top : SR);
      b.rect(tx0 + 9, a[0] + a[1], 2, 2, SR[2]);
    });
    // piernas y zapatos
    b.tubeH(lx - 1, cy - 4, lx + legL - 1, cy - 4, 3, o.pants); b.tubeH(lx - 1, cy + 1, lx + legL - 2, cy + 2, 3, o.pants);
    b.rect(lx + legL, cy - 4, 3, 3, o.shoe[2]); b.rect(lx + legL - 1, cy + 1, 3, 3, o.shoe[2]);
    b.sh(tx0, top, tl, th, o.top);
    if (o.deadDeco) o.deadDeco(b, tx0, top, th, tl, cy);
    b.rect(tx0, bot, tl, 1, o.top[0]);
    b.ell(5, cy, 4.1, 4.1, SR);
    if (o.deadHat) o.deadHat(b, 5, cy); else if (o.hairC) b.ell(4, cy, 3.2, 3.6, ramp(o.hairC));
    b.set(7, cy - 1, '#e8e4cc'); b.set(7, cy + 1, '#e8e4cc'); b.set(8, cy, '#2c1a1c');
    b.set(tx0 + 3, top + 1, SR[1]); b.set(tx0 + 4, top + 1, SR[2]); b.set(tx0 + 5, bot - 1, '#7a2a26');
    return b.canvas(o.deadAx || 15, 9, false);
  }

  /* ---------------- accesorios sueltos ---------------- */
  function cameraBody(b, x, y, big) {   // cámara réflex mirando a la derecha: cuerpo 7×5, lente 3×3, flash arriba
    b.rect(x - 1, y - 1, 9, 7, INK); b.rect(x, y, 7, 5, '#3a3a42'); b.rect(x, y, 7, 1, '#5a5a64'); b.rect(x + 1, y - 2, 3, 1, '#2a2a30'); b.set(x + 5, y - 2, '#e8e4d0');
    b.rect(x + 7, y + 1, 3, 3, INK); b.rect(x + 7, y + 1, 2, 2, '#7ec8e8'); b.set(x + 7, y + 1, '#d6f4ff'); b.set(x + 8, y + 2, '#2a5a8a');
    b.set(x + 1, y + 1, '#c8483a');
  }

  /* ============================ TURISTA CON CÁMARA (Kennedy) ============================ */
  var HAWAI = ramp('#dfae3c');
  var TUR = {
    H: 36, AY: 34, body: { legL: 10, torsoL: 10, tw: 12, armL: 8, hunch: 1 }, skin: SKY, top: HAWAI, sleeve: 'short',
    pants: ramp('#b9a671'), legSeg: [[3, ramp('#b9a671')], [4, SKY], [2, WHT]], shoe: ramp('#6a4a32'), sole: '#2a2018',
    gait: { stride: 3, lift: 2, arm: 2 }, deadW: 31, deadTh: 10, hairC: '#9a9a8a',
    torso: function (c) {
      var b = c.b, tx = c.tx, tw = c.tw, top = c.tTop, h = c.hipY - top + 1;
      torso(c);
      // camisa floreada: flores rojas, hojas verdes, cuello abierto
      var dots = [[2, 2, '#c8483a'], [7, 1, '#3a9a8a'], [9, 4, '#c8483a'], [4, 5, '#f3efe2'], [1, 7, '#3a9a8a'], [8, 8, '#f3efe2'], [5, 8, '#c8483a'], [10, 6, '#3a9a8a']];
      dots.forEach(function (d) { if (d[0] < tw - 1 && d[1] < h) b.set(tx + d[0], top + d[1], d[2]); });
      b.set(tx + 3, top + 1, '#c8483a'); b.set(tx + 4, top + 2, '#c8483a');
      b.rect(c.tx + (tw >> 1) - 1, top, 3, 2, SKY[1]); b.set(c.tx + (tw >> 1), top + 2, SKY[0]);   // cuello en V
      b.rect(tx + (tw >> 1) - 3, top, 2, 2, HAWAI[3]); b.rect(tx + (tw >> 1) + 2, top, 2, 2, HAWAI[3]);
      b.rect(tx, c.hipY, tw, 1, ramp('#b9a671')[1]);
      b.rect(tx, c.hipY - 1, tw, 1, HAWAI[1]);
    },
    deco: function (c) {
      var b = c.b;
      if (c.pose === 'windup') return;
      // correa y cámara colgada al pecho
      var cxm = c.tx + c.tw - 4, cym = c.tTop + 5;
      b.line(c.tx + 2, c.tTop, cxm, cym, '#2a2830'); b.line(c.tx + c.tw - 3, c.tTop, cxm + 4, cym, '#2a2830');
      cameraBody(b, cxm, cym, false);
    },
    hat: function (c) {
      var b = c.b, hcx = c.hcx, ht = c.ht, ST = ramp('#d8c68e');
      b.ell(hcx, ht + 1.5, 7, 1.9, ST);                                   // ala ancha
      b.rect(hcx - 3, ht - 3, 7, 4, ST[2]); b.rect(hcx - 3, ht - 3, 1, 4, ST[3]); b.rect(hcx + 3, ht - 3, 1, 4, ST[1]); b.rect(hcx - 2, ht - 4, 5, 1, ST[3]);
      b.rect(hcx - 3, ht - 1, 7, 1, '#c8483a');                           // cinta roja
      // lentes oscuros
      b.rect(hcx, ht + 3, 5, 2, '#1c1a22'); b.set(hcx + 1, ht + 3, '#4a5a7a'); b.set(hcx + 3, ht + 3, '#4a5a7a');
      if (c.pose === 'windup') { b.rect(hcx + 1, ht + 3, 6, 6, INK); }
    },
    arms: function (c) {
      if (c.pose !== 'windup') return null;
      var hx_ = c.hcx + 3, hy_ = c.ht + 6;
      return { n: { e: [c.tx + c.tw - 1, c.tTop + 6], h: [hx_, hy_ + 1] }, f: { e: [c.tx + 5, c.tTop + 6], h: [hx_ - 1, hy_ + 3] }, farFront: true };
    },
    front: function (c) {
      if (c.pose !== 'windup') return;
      var b = c.b, x = c.hcx + 1, y = c.ht + 1;
      b.rect(x - 1, y - 1, 10, 8, INK); b.rect(x, y, 8, 6, '#3a3a42'); b.rect(x, y, 8, 1, '#5a5a64'); b.rect(x + 1, y - 2, 4, 1, '#2a2a30'); b.set(x + 6, y - 2, '#fff6a0');
      b.rect(x + 8, y + 1, 3, 4, INK); b.rect(x + 8, y + 1, 2, 3, '#7ec8e8'); b.set(x + 8, y + 1, '#ffffff');
      // destello
      b.set(x + 12, y + 2, '#fff6a0'); b.set(x + 13, y + 1, '#ffffff'); b.set(x + 13, y + 3, '#ffffff'); b.set(x + 14, y + 2, '#fff6a0'); b.set(x + 12, y - 1, '#ffffff'); b.set(x + 12, y + 5, '#ffffff');
    },
    deadDeco: function (b, tx0, top, th, tl, cy) {
      b.set(tx0 + 2, top + 2, '#c8483a'); b.set(tx0 + 5, top + 5, '#3a9a8a'); b.set(tx0 + 8, top + 3, '#f3efe2'); b.set(tx0 + 3, top + 6, '#c8483a'); b.set(tx0 + 7, top + 7, '#3a9a8a');
      b.rect(tx0 + 4, top - 2, 5, 3, INK); b.rect(tx0 + 5, top - 1, 3, 1, '#7ec8e8');          // la cámara tirada al lado
    },
    deadHat: function (b, hx_, cy) { var ST = ramp('#d8c68e'); b.ell(hx_ - 0.5, cy, 6.5, 6.5, ST); b.ell(hx_ - 0.5, cy, 3.2, 3.2, [ST[1], ST[2], ST[2], ST[3]]); b.set(hx_ - 0.5, cy, '#c8483a'); }
  };

  /* ============================ JOGGER (Kennedy) ============================ */
  var NEON = ramp('#35c777'), SHORTS = ramp('#2a2832');
  var JOG = {
    H: 36, AY: 34, body: { legL: 11, torsoL: 9, tw: 8, armL: 7, hunch: 1, legW: 3 }, skin: ['#3f4a44', '#6a7a60', '#8a9a7e', '#aab594'], top: NEON, sleeve: 'none',
    pants: SHORTS, legSeg: [[3, SHORTS], [5, ['#3f4a44', '#6a7a60', '#8a9a7e', '#aab594']], [1, WHT]], shoe: ramp('#e8e4d4'), sole: '#e0407f',
    gait: { stride: 5, lift: 4, arm: 3, lean: 3, run: true }, deadW: 31, deadTh: 7, hairC: '#3a2a26', headDy: 0,
    belt: '#e0407f',
    torso: function (c) {
      var b = c.b, tx = c.tx, tw = c.tw, top = c.tTop, h = c.hipY - top + 1;
      b.sh(tx, top, tw, h, NEON);
      b.set(tx, top, null); b.set(tx + tw - 1, top, null);
      b.rect(tx, c.hipY - 1, tw, 2, SHORTS[2]); b.rect(tx, c.hipY - 1, tw, 1, '#e0407f');   // cintura
      // tirantes de camiseta sin mangas + dorsal con número
      b.rect(tx + 2, top, 1, 2, c.o.skin[2]); b.rect(tx + tw - 3, top, 1, 2, c.o.skin[2]);
      b.rect(tx + 2, top + 2, 4, 4, '#f3efe2'); b.set(tx + 3, top + 3, '#2a2830'); b.set(tx + 3, top + 4, '#2a2830'); b.set(tx + 4, top + 5, '#2a2830'); b.set(tx + 4, top + 3, '#2a2830');
      b.set(tx + 2, top + 2, '#c8cbb8');
    },
    hat: function (c) {
      var b = c.b, hcx = c.hcx, ht = c.ht, HR = ramp('#3a2a26');
      b.ell(hcx - 0.5, ht + 1.5, 4.2, 2.6, HR); b.set(hcx + 3, ht + 1, null);
      b.rect(hcx - 4, ht + 2, 9, 2, '#e0407f'); b.rect(hcx - 4, ht + 2, 9, 1, '#f27aae');         // vincha rosada
      b.set(hcx - 5, ht + 3, '#e0407f');
      b.set(hcx - 1, ht + 5, '#f3efe2'); b.line(hcx - 1, ht + 6, hcx - 3, ht + 9, '#e8e4d4');     // auricular y cable
      b.set(hcx + 2, ht + 6, '#e8e4d4');
    },
    arms: function (c) {   // brazos doblados en 90° que bombean al ritmo del paso
      var G = c.G, b0 = G.s, sNx = c.tx + c.tw - 2, sNy = c.tTop + 2, sFx = c.tx + 1, sFy = c.tTop + 2;
      var nf = Math.round(-b0 * 3), ff = Math.round(b0 * 3);
      return { n: { e: [sNx + 2 + nf, sNy + 4], h: [sNx + 4 + Math.round(nf / 2), sNy + 1 + Math.round(-nf / 2)] }, f: { e: [sFx - 1 + ff, sFy + 4], h: [sFx + 1 + Math.round(ff / 2), sFy + 1 + Math.round(-ff / 2)] } };
    },
    deadDeco: function (b, tx0, top, th, tl, cy) { b.rect(tx0 + 2, top + 1, 4, 5, '#f3efe2'); b.set(tx0 + 3, top + 2, '#2a2830'); b.set(tx0 + 3, top + 3, '#2a2830'); b.rect(tx0 + tl - 3, top, 3, th, SHORTS[2]); b.rect(tx0 + tl - 3, top, 3, 1, '#e0407f'); },
    deadHat: function (b, hx_, cy) { b.ell(hx_ - 1, cy, 3.3, 3.8, ramp('#3a2a26')); b.rect(hx_ - 4, cy - 1, 8, 2, '#e0407f'); }
  };

  /* ============================ SERENO (Kennedy) ============================ */
  var NAVY = ramp('#32466e'), NAVY2 = ramp('#252f4a'), GOLD = ramp('#e0c030');
  var SER = {
    H: 42, AY: 40, body: { legL: 12, torsoL: 11, tw: 12, armL: 9, hunch: 1 }, skin: SK, top: NAVY, sleeve: 'long', cuff: NAVY, pants: NAVY2, legSeg: [[99, NAVY2]],
    shoe: ramp('#2a2830'), sole: '#0e0c12', gait: { stride: 2, lift: 2, arm: 2 }, deadW: 34, deadAx: 17, deadTh: 10, belt: '#1c1a22', buckle: '#cdd2d8', hairC: '#2a2830',
    torso: function (c) {
      var b = c.b, tx = c.tx, tw = c.tw, top = c.tTop, h = c.hipY - top + 1;
      torso(c);
      b.rect(tx + 1, top, 2, 2, GOLD[2]); b.rect(tx + tw - 3, top, 2, 2, GOLD[2]); b.set(tx + 1, top, GOLD[3]);   // charreteras
      b.rect(tx + (tw >> 1) - 1, top, 3, 3, '#a8c0d8'); b.set(tx + (tw >> 1), top + 3, '#a8c0d8'); b.set(tx + (tw >> 1), top + 1, '#c8483a');      // camisa celeste y corbata
      b.rect(tx + 1, top + 4, 3, 3, NAVY[1]); b.rect(tx + 1, top + 4, 3, 1, NAVY[3]); b.set(tx + 2, top + 5, GOLD[3]);   // bolsillo con insignia
      b.rect(tx + tw - 5, top + 4, 3, 1, '#9aa4b4');                                                                  // placa de nombre
      b.rect(tx, c.hipY, tw, 1, '#1c1a22');
    },
    deco: function (c) {
      var b = c.b, x = c.tx + (c.tw >> 1);
      if (c.pose === 'windup') return;
      // cordón amarillo y silbato plateado colgando
      b.line(c.hcx - 2, c.tTop, x + 1, c.tTop + 5, GOLD[2]); b.line(c.hcx + 2, c.tTop, x + 1, c.tTop + 5, GOLD[1]);
      b.rect(x, c.tTop + 5, 3, 2, '#c8ccd4'); b.set(x + 3, c.tTop + 5, '#8a8f98'); b.set(x, c.tTop + 5, '#ffffff');
      // porra al cinto
      b.rect(c.tx + c.tw - 2, c.hipY - 1, 2, 5, '#1c1a22');
    },
    hat: function (c) {
      var b = c.b, hcx = c.hcx, ht = c.ht;
      b.rect(hcx - 4, ht, 9, 3, NAVY[2]); b.rect(hcx - 4, ht, 9, 1, NAVY[3]); b.rect(hcx - 4, ht + 2, 9, 1, NAVY[1]);   // quepí
      b.rect(hcx - 3, ht - 2, 7, 2, NAVY[2]); b.rect(hcx - 3, ht - 2, 7, 1, NAVY[3]);
      b.rect(hcx + 1, ht + 3, 6, 1, '#1c1a22');                                                                         // visera
      b.rect(hcx - 1, ht - 1, 3, 3, GOLD[2]); b.set(hcx, ht, GOLD[3]); b.set(hcx, ht + 1, '#c8483a');
      if (c.pose === 'windup') {    // mejillas hinchadas y el silbato en la boca
        b.set(hcx + 4, ht + 5, c.o.skin[3]); b.set(hcx + 4, ht + 6, c.o.skin[2]); b.set(hcx + 4, ht + 7, c.o.skin[1]);
        b.rect(hcx + 3, ht + 6, 4, 2, '#c8ccd4'); b.set(hcx + 3, ht + 6, '#ffffff'); b.set(hcx + 6, ht + 7, '#8a8f98');
        if (c.f % 2) { b.set(hcx + 8, ht + 5, '#ffe500'); b.set(hcx + 9, ht + 7, '#ffe500'); b.set(hcx + 8, ht + 9, '#ffe500'); }
      }
    },
    arms: function (c) {
      if (c.pose !== 'windup') return null;
      var hx_ = c.hcx + 3, hy_ = c.ht + 8;
      return { n: { e: [c.tx + c.tw + 1, c.tTop + 6], h: [hx_, hy_] }, f: null };
    },
    deadDeco: function (b, tx0, top, th, tl, cy) { b.rect(tx0 + 1, top, 2, 2, GOLD[2]); b.rect(tx0 + tl - 3, top + th - 3, 3, 3, GOLD[1]); b.rect(tx0 + 3, top, 1, th, '#1c1a22'); },
    deadHat: function (b, hx_, cy) { b.ell(hx_ - 0.5, cy, 4.7, 4.7, NAVY); b.rect(hx_ + 3, cy - 2, 3, 4, '#1c1a22'); b.set(hx_ - 1, cy, GOLD[3]); b.set(hx_ - 1, cy - 1, GOLD[2]); }
  };

  /* ============================ BARISTA (Costa Verde) ============================ */
  var GREEN = ramp('#1f7a5a'), APR = ramp('#1d6a4c');
  function cup(b, x, y, hot) {   // vaso de papel blanco con manga verde, tapa marrón y vapor
    b.rect(x - 1, y - 1, 5, 7, INK); b.rect(x, y, 3, 5, '#f3efe2'); b.rect(x, y + 2, 3, 2, GREEN[2]); b.rect(x - 1, y - 1, 5, 2, '#5a3a24'); b.set(x, y - 1, '#7a5a3a');
    b.set(x + 2, y, '#cfc8b4'); b.set(x + 2, y + 1, '#cfc8b4');
    if (hot) { b.set(x + 1, y - 3, '#e8e4d4'); b.set(x + 2, y - 4, '#e8e4d4'); b.set(x + 1, y - 5, '#cfc8b4'); }
  }
  var BAR = {
    H: 36, AY: 34, body: { legL: 10, torsoL: 10, tw: 10, armL: 8, hunch: 1 }, skin: SK, top: WHT, sleeve: 'short', pants: ramp('#2c2a32'), legSeg: [[99, ramp('#2c2a32')]],
    shoe: ramp('#3a3a42'), sole: '#141216', gait: { stride: 3, lift: 2, arm: 2 }, deadW: 31, deadTh: 8, hairC: '#5a3a2a',
    torso: function (c) {
      var b = c.b, tx = c.tx, tw = c.tw, top = c.tTop, h = c.hipY - top + 1;
      torso(c);
      // delantal verde: peto + falda, tiras al cuello
      b.sh(tx + 1, top + 2, tw - 2, h - 2, APR); b.rect(tx + 2, top + 1, tw - 4, 1, APR[2]);
      b.line(tx + 2, top, tx + 2, top + 1, APR[1]); b.line(tx + tw - 3, top, tx + tw - 3, top + 1, APR[1]);
      b.rect(tx + 3, top + 4, 4, 3, '#2a5a44'); b.rect(tx + 3, top + 4, 4, 1, APR[3]);                    // bolsillo
      b.rect(tx + (tw >> 1) - 1, top + 2, 3, 3, '#f3efe2'); b.set(tx + (tw >> 1), top + 3, GREEN[1]);      // logo redondo
      b.set(tx + tw - 4, top + 2, '#e8e4d4'); b.set(tx + tw - 4, top + 3, '#c8483a');                      // gafete
      b.rect(tx, c.hipY, tw, 1, '#2c2a32');
    },
    hat: function (c) {
      var b = c.b, hcx = c.hcx, ht = c.ht;
      b.ell(hcx - 0.5, ht + 1.5, 4.3, 2.8, GREEN); b.rect(hcx - 4, ht + 2, 9, 1, GREEN[1]);
      b.rect(hcx + 2, ht + 2, 5, 1, GREEN[0]); b.set(hcx, ht, '#f3efe2'); b.set(hcx + 1, ht, '#f3efe2');   // visera + logo
      b.set(hcx - 4, ht + 3, '#5a3a2a'); b.set(hcx - 4, ht + 4, '#5a3a2a'); b.set(hcx - 5, ht + 4, '#5a3a2a');   // colita
    },
    arms: function (c) {
      var armL = 8, sNx = c.tx + c.tw - 2, sNy = c.tTop + 2, G = c.G;
      if (c.pose === 'windup') {       // brazo atrás, vaso en alto, listo para lanzar
        var up = c.f % 2;
        return { n: { e: [sNx + 1, sNy - 1], h: [sNx + 2 - (up ? 2 : 0), sNy - 6 + (up ? 2 : 0)] }, f: null };
      }
      // el brazo cercano sostiene el vaso adelante, a media altura
      return { n: { e: [sNx + 3 - G.arm * 0, sNy + 3], h: [sNx + 5, sNy + 5 + (c.f % 3 === 1 ? 1 : 0)] }, f: null };
    },
    front: function (c, nh) {
      if (c.pose === 'windup') { cup(c.b, nh.h[0] - 1, nh.h[1] - 6, true); return; }
      cup(c.b, nh.h[0] + 1, nh.h[1] - 5, c.f % 2 === 0);
    },
    deadDeco: function (b, tx0, top, th, tl, cy) { b.rect(tx0 + 3, top + 1, tl - 3, th - 1, APR[2]); b.rect(tx0 + 3, top + 1, tl - 3, 1, APR[3]); b.set(tx0 + 5, cy, '#f3efe2'); b.rect(tx0 + 5, top - 3, 3, 3, '#f3efe2'); b.set(tx0 + 6, top - 2, GREEN[1]); },
    deadHat: function (b, hx_, cy) { b.ell(hx_ - 1, cy, 3.6, 3.8, GREEN); b.rect(hx_ + 2, cy - 2, 3, 4, GREEN[0]); b.set(hx_ - 1, cy, '#f3efe2'); }
  };

  /* ============================ REY DEL SELFIE (Costa Verde) ============================ */
  var PURP = ramp('#7a4aa8'), GOLDK = ramp('#e0b82c');
  var REY = {
    H: 36, AY: 34, body: { legL: 10, torsoL: 10, tw: 11, armL: 8, hunch: 0 }, skin: SK, top: PURP, sleeve: 'long', cuff: GOLDK, pants: ramp('#d8d0b8'), legSeg: [[99, ramp('#d8d0b8')]],
    shoe: ramp('#e8e4d4'), sole: '#e0b82c', gait: { stride: 3, lift: 2, arm: 1 }, deadW: 31, deadTh: 9, hairC: '#2a2830',
    back: function (c) {           // capa que ondea
      var b = c.b, sw = Math.round(Math.sin(c.f / 6 * Math.PI * 2 + 1) * 1.5), x0 = c.tx - 2, top = c.tTop + 1, hh = c.hipY - top + 7;
      var CR = ramp('#5a2a82');
      for (var y = 0; y < hh; y++) b.rect(x0 - Math.round(y * 0.35) - (y > hh - 3 ? sw : 0), top + y, 4 + Math.round(y * 0.2), 1, y > hh - 2 ? CR[0] : (y % 4 === 3 ? CR[1] : CR[2]));
      b.rect(x0 + 1, top, 1, hh, CR[3]);
    },
    torso: function (c) {
      var b = c.b, tx = c.tx, tw = c.tw, top = c.tTop, h = c.hipY - top + 1;
      torso(c);
      b.rect(tx + (tw >> 1) - 1, top, 2, h - 1, GOLDK[2]); b.rect(tx + (tw >> 1) - 1, top, 1, h - 1, GOLDK[3]);              // solapa dorada
      b.rect(tx + 1, top, 3, 2, GOLDK[2]); b.rect(tx + tw - 4, top, 3, 2, GOLDK[2]);
      b.set(tx + (tw >> 1) + 1, top + 3, GOLDK[3]); b.set(tx + (tw >> 1) + 1, top + 6, GOLDK[3]); b.set(tx + (tw >> 1) + 1, top + 8, GOLDK[3]);     // botones
      b.rect(tx + 2, top + 2, 2, 2, '#ffd200'); b.set(tx + 2, top + 2, '#fff6a0');                                          // medallón
      b.rect(tx, c.hipY - 1, tw, 1, GOLDK[1]); b.rect(tx, c.hipY, tw, 1, c.o.pants[1]);
    },
    hat: function (c) {
      var b = c.b, hcx = c.hcx, ht = c.ht;
      // pelo engominado y corona
      b.ell(hcx - 0.5, ht + 1.5, 4.2, 2.4, ramp('#2a2830'));
      b.rect(hcx - 3, ht - 3, 8, 3, GOLDK[2]); b.rect(hcx - 3, ht - 3, 8, 1, GOLDK[3]); b.rect(hcx - 3, ht - 1, 8, 1, GOLDK[1]);
      b.set(hcx - 3, ht - 4, GOLDK[2]); b.set(hcx - 1, ht - 5, GOLDK[3]); b.set(hcx - 1, ht - 4, GOLDK[2]); b.set(hcx + 1, ht - 4, GOLDK[2]); b.set(hcx + 2, ht - 5, GOLDK[3]); b.set(hcx + 2, ht - 4, GOLDK[2]); b.set(hcx + 4, ht - 4, GOLDK[2]);
      b.set(hcx + 0, ht - 2, '#c8483a'); b.set(hcx + 3, ht - 2, '#3a9ad8');
      // lentes de sol
      b.rect(hcx, ht + 3, 5, 2, '#1c1a22'); b.set(hcx + 1, ht + 3, '#e0407f'); b.set(hcx + 3, ht + 3, '#e0407f');
    },
    arms: function (c) {
      var sNx = c.tx + c.tw - 2, sNy = c.tTop + 2, G = c.G;
      if (c.pose === 'windup') return { n: { e: [sNx + 3, sNy + 1], h: [sNx + 7, sNy - 4 - (c.f % 2)] }, f: null };
      return { n: { e: [sNx + 3, sNy + 2], h: [sNx + 6, sNy - 1 + (c.f % 3 === 1 ? 1 : 0)] }, f: null };
    },
    front: function (c, nh) {     // palo de selfie con el celular arriba
      var b = c.b, hx_ = nh.h[0], hy_ = nh.h[1], tx_ = hx_ + 4, ty_ = hy_ - 11;
      b.line(hx_ + 1, hy_ - 1, tx_ + 1, ty_ + 6, INK); b.line(hx_ + 1, hy_ - 2, tx_ + 1, ty_ + 6, '#5a5a64');
      b.rect(tx_ - 1, ty_ - 1, 5, 8, INK); b.rect(tx_, ty_, 3, 6, '#2a2830'); b.rect(tx_, ty_, 3, 5, c.pose === 'windup' ? '#ffffff' : '#7ec8e8'); b.set(tx_, ty_, '#ffffff');
      if (c.pose === 'windup') { b.set(tx_ + 5, ty_ + 1, '#fff6a0'); b.set(tx_ + 6, ty_, '#ffffff'); b.set(tx_ + 5, ty_ + 4, '#ffffff'); b.set(tx_ + 1, ty_ - 3, '#ffffff'); b.set(tx_ - 3, ty_ + 1, '#fff6a0'); }
      else b.set(tx_ + 2, ty_ - 1, '#fff6a0');
    },
    deadDeco: function (b, tx0, top, th, tl, cy) { b.rect(tx0 + 4, top, 2, th, GOLDK[2]); b.rect(tx0 - 3, top - 1, 4, th + 2, ramp('#5a2a82')[2]); b.line(tx0 + 5, top - 4, tx0 + 9, top - 6, '#5a5a64'); b.rect(tx0 + 9, top - 8, 3, 4, '#2a2830'); b.set(tx0 + 9, top - 7, '#7ec8e8'); },
    deadHat: function (b, hx_, cy) { b.ell(hx_ - 1, cy, 3.4, 3.6, ramp('#2a2830')); b.rect(hx_ - 3, cy - 3, 3, 6, GOLDK[2]); b.set(hx_ - 4, cy - 2, GOLDK[3]); b.set(hx_ - 4, cy + 2, GOLDK[3]); b.set(hx_ - 4, cy, GOLDK[3]); }
  };

  /* ============================ TURISTA DEL DRON (Costa Verde, mini-jefe) ============================ */
  var VEST = ramp('#cf7a2e'), KHAKI = ramp('#c9bd8e'), BEIGE = ramp('#d8cfa8');
  function controller(b, x, y, up) {      // control remoto: caja gris, dos palancas, celular, antenas
    b.rect(x - 1, y - 1, 10, 6, INK); b.rect(x, y, 8, 4, '#5a5e68'); b.rect(x, y, 8, 1, '#80848e'); b.rect(x, y + 3, 8, 1, '#3a3c44');
    b.rect(x + 2, y - 3, 4, 3, INK); b.rect(x + 3, y - 2, 2, 1, '#7ec8e8'); b.set(x + 3, y - 2, '#d6f4ff');   // celular encima
    b.set(x + 1, y + 1, INK); b.set(x + 6, y + 1, INK); b.set(x + 1, y + 2, '#c8483a'); b.set(x + 6, y + 2, '#c8483a');   // palancas
    b.set(x - 1, y - 2, INK); b.set(x - 1, y - 3, INK); b.set(x + 8, y - 2, INK); b.set(x + 8, y - 3, INK);               // antenas
    if (up) { b.set(x + 4, y - 5, '#ff2e2e'); b.set(x + 4, y - 4, '#ffffff'); }
  }
  var DRO = {
    H: 42, AY: 40, body: { legL: 12, torsoL: 11, tw: 13, armL: 9, hunch: 0 }, skin: SKY, top: VEST, sleeve: 'short', pants: KHAKI, legSeg: [[4, KHAKI], [5, SKY], [2, WHT]],
    shoe: ramp('#6a4a32'), sole: '#2a2018', gait: { stride: 3, lift: 2, arm: 1 }, deadW: 34, deadAx: 17, deadTh: 11, hairC: '#9a9a8a', headDy: -1,
    back: function (c) {
      var b = c.b, x0 = c.tx - 3, top = c.tTop + 1, BP = ramp('#4a5a78');
      b.sh(x0, top, 5, c.hipY - top - 3, BP); b.rect(x0 + 1, top + 3, 3, 1, BP[0]); b.rect(x0 + 1, top + 1, 3, 1, BP[3]);           // mochila
      b.rect(x0 + 1, top - 1, 3, 1, BP[2]); b.rect(x0 + 1, top + 5, 2, 2, BP[1]);
    },
    torso: function (c) {
      var b = c.b, tx = c.tx, tw = c.tw, top = c.tTop, h = c.hipY - top + 1;
      b.sh(tx, top, tw, h, BEIGE); b.set(tx, top, null); b.set(tx + tw - 1, top, null);
      // chaleco safari naranja abierto, con bolsillos
      b.sh(tx, top, 4, h - 1, VEST); b.sh(tx + tw - 4, top, 4, h - 1, VEST);
      b.rect(tx + 1, top + 5, 3, 3, VEST[1]); b.rect(tx + 1, top + 5, 3, 1, VEST[3]); b.rect(tx + tw - 4, top + 5, 3, 3, VEST[1]); b.rect(tx + tw - 4, top + 5, 3, 1, VEST[3]);
      b.set(tx + 2, top + 6, '#e8e4d4'); b.set(tx + tw - 3, top + 6, '#e8e4d4');
      b.rect(tx + 4, top, 5, 3, SKY[1]);                                                                                          // cuello de la camisa
      b.rect(tx, c.hipY - 1, tw, 1, '#5a4a32'); b.rect(tx + 5, c.hipY - 1, 2, 1, '#cdbf8e'); b.rect(tx, c.hipY, tw, 1, KHAKI[1]);
      b.line(tx + 4, top, tx + 6, top + 3, '#2a2830');                                                                            // correa de la cámara cruzada
    },
    hat: function (c) {
      var b = c.b, hcx = c.hcx, ht = c.ht, ST = ramp('#cdbf8e');
      b.ell(hcx, ht + 1.5, 7, 2, ST);                                                   // sombrero de pescador
      b.rect(hcx - 3, ht - 3, 7, 4, ST[2]); b.rect(hcx - 3, ht - 3, 1, 4, ST[3]); b.rect(hcx + 3, ht - 3, 1, 4, ST[1]); b.rect(hcx - 2, ht - 4, 5, 1, ST[3]);
      b.rect(hcx - 3, ht - 1, 7, 1, '#3a5a8a');
      b.rect(hcx, ht + 3, 5, 3, '#2a3040'); b.set(hcx + 1, ht + 3, '#8ac0e8'); b.set(hcx + 3, ht + 3, '#8ac0e8');          // gafas espejadas grandes
    },
    arms: function (c) {
      var sNx = c.tx + c.tw - 2, sNy = c.tTop + 2, sFx = c.tx + 1;
      if (c.pose === 'windup') return { n: { e: [sNx + 2, sNy - 2], h: [sNx + 3, sNy - 8] }, f: { e: [sFx + 6, sNy - 2], h: [sNx + 1, sNy - 8] }, farFront: true };
      var bob = c.f % 3 === 1 ? 1 : 0;
      return { n: { e: [sNx + 2, sNy + 5], h: [sNx + 3, sNy + 8 + bob] }, f: { e: [sFx + 7, sNy + 5], h: [sNx - 2, sNy + 8 + bob] }, farFront: true };
    },
    front: function (c, nh) {
      if (c.pose === 'windup') { controller(c.b, nh.h[0] - 4, nh.h[1] - 4, true); return; }
      controller(c.b, nh.h[0] - 7, nh.h[1] - 3, false);
    },
    deadDeco: function (b, tx0, top, th, tl, cy) { b.rect(tx0 + 1, top, 4, th, VEST[2]); b.rect(tx0 + tl - 5, top, 4, th, VEST[2]); b.rect(tx0 - 4, top + 1, 4, th - 2, ramp('#3a4a6a')[2]); b.rect(tx0 + 4, top - 4, 7, 4, '#5a5e68'); b.set(tx0 + 5, top - 2, '#c8483a'); b.set(tx0 + 9, top - 2, '#c8483a'); },
    deadHat: function (b, hx_, cy) { var ST = ramp('#cdbf8e'); b.ell(hx_ - 0.5, cy, 6.8, 6.8, ST); b.ell(hx_ - 0.5, cy, 3.4, 3.4, [ST[1], ST[2], ST[2], ST[3]]); b.set(hx_ - 0.5, cy, '#3a5a8a'); }
  };

  /* ============================ DON LUCHO (Gambetta, cobrador conocido) ============================ */
  var LSH = ramp('#7f90a4'), LCAP = ramp('#3a4a6a'), POUCH = ramp('#7a5530');
  var LUC = {
    H: 36, AY: 34, body: { legL: 10, torsoL: 10, tw: 11, armL: 8, hunch: 1 }, skin: SK, top: LSH, sleeve: 'short', pants: ramp('#3a3a46'), legSeg: [[99, ramp('#3a3a46')]],
    shoe: ramp('#4a3a2e'), sole: '#141216', gait: { stride: 3, lift: 2, arm: 2 }, deadW: 31, deadTh: 9, hairC: '#2c2c2a',
    torso: function (c) {
      var b = c.b, tx = c.tx, tw = c.tw, top = c.tTop;
      torso(c);
      b.rect(tx + 3, top, 5, 2, LSH[3]); b.set(tx + 5, top + 2, LSH[1]); b.rect(tx + 4, top, 3, 1, SK[1]);   // cuello abierto
      b.rect(tx, c.hipY - 1, tw, 1, '#2a2830');
      // canguro de las monedas cruzado al pecho
      b.line(tx + 1, top + 1, tx + tw - 2, top + 7, '#4a3220'); b.line(tx + 2, top + 1, tx + tw - 1, top + 7, '#4a3220');
      b.sh(tx + tw - 6, top + 6, 6, 4, POUCH); b.rect(tx + tw - 5, top + 6, 4, 1, POUCH[0]); b.set(tx + tw - 3, top + 8, '#e0c030'); b.set(tx + tw - 2, top + 7, '#fff0a0');
    },
    hat: function (c) {
      var b = c.b, hcx = c.hcx, ht = c.ht;
      b.rect(hcx - 4, ht, 9, 3, LCAP[2]); b.rect(hcx - 4, ht, 9, 1, LCAP[3]); b.rect(hcx - 3, ht - 2, 7, 2, LCAP[2]); b.rect(hcx - 3, ht - 2, 7, 1, LCAP[3]); b.rect(hcx - 4, ht + 2, 9, 1, LCAP[1]);
      b.rect(hcx + 1, ht + 3, 6, 1, '#1c1a22'); b.rect(hcx - 1, ht - 1, 3, 2, '#e0c030'); b.set(hcx, ht - 1, '#fff0a0');
    },
    arms: function (c) {
      var sNx = c.tx + c.tw - 2, sNy = c.tTop + 2;
      if (c.pose === 'windup') return { n: { e: [sNx + 3, sNy], h: [sNx + 6, sNy - 6 - (c.f % 2)] }, f: null };
      return { n: { e: [sNx + 3, sNy + 3], h: [sNx + 6, sNy + 5 + (c.f % 3 === 1 ? 1 : 0)] }, f: null };
    },
    front: function (c, nh) {      // puñado de monedas y el talonario de pasajes
      var b = c.b, x = nh.h[0], y = nh.h[1];
      b.rect(x - 1, y - 3, 4, 3, '#e8e4d4'); b.rect(x - 1, y - 3, 4, 1, '#fff'); b.set(x, y - 2, '#c8483a');
      b.set(x + 3, y - 1, '#e0c030'); b.set(x + 4, y - 2, '#fff0a0'); b.set(x + 4, y, '#e0c030');
      if (c.pose === 'windup') { b.set(x + 6, y - 5, '#ffe500'); b.set(x + 7, y - 3, '#ffe500'); b.set(x + 6, y - 7, '#ffe500'); }
    },
    deadDeco: function (b, tx0, top, th, tl, cy) { b.rect(tx0 + 3, top + 1, 5, 3, POUCH[2]); b.set(tx0 + 5, top + 2, '#e0c030'); b.rect(tx0 + 2, top - 3, 4, 3, '#e8e4d4'); b.set(tx0 + 8, top + 7, '#e0c030'); },
    deadHat: function (b, hx_, cy) { b.ell(hx_ - 1, cy, 3.6, 3.8, LCAP); b.rect(hx_ + 2, cy - 2, 3, 4, '#1c1a22'); b.set(hx_ - 1, cy, '#e0c030'); }
  };

  /* ---------------- hornear ---------------- */
  var SPECS = { mira_turista: TUR, mira_jogger: JOG, mira_sereno: SER, cv_barista: BAR, cv_reySelfie: REY, cv_dronero: DRO, gb_lucho: LUC };
  function build(key) {
    var o = SPECS[key]; if (!o) return null;
    var move = [], hurt = [], i, b;
    for (i = 0; i < 6; i++) { b = human(o, i, 'walk'); move.push(b.canvas(16, o.AY, false)); hurt.push(b.canvas(16, o.AY, true)); }
    var e = { move: move, hurt: hurt, dead: deadFig(o), windup: [], hurtWindup: [] };
    for (i = 0; i < 2; i++) { b = human(o, i, 'windup'); e.windup.push(b.canvas(16, o.AY, false)); e.hurtWindup.push(b.canvas(16, o.AY, true)); }
    return e;
  }
  function register() {
    var Z = S.zvar; if (!Z) { return false; }
    Object.keys(SPECS).forEach(function (key) {
      var d = Object.getOwnPropertyDescriptor(Z, key);
      if (d && ((d.value && !d.value.prov) || d.get)) return;                    // ya hay un skin propio (otro agente) o ya está registrado
      try {
        Object.defineProperty(Z, key, { enumerable: true, configurable: true,
          get: function () { var v = null; try { v = build(key); } catch (er) { if (window.console) console.warn('[zombis-v013] ' + key, er); } if (v) Object.defineProperty(Z, key, { value: v, writable: true, enumerable: true, configurable: true }); return v || undefined; },
          set: function (v) { Object.defineProperty(Z, key, { value: v, writable: true, enumerable: true, configurable: true }); } });
      } catch (er2) { /* zvar congelado */ }
    });
    return true;
  }
  register();

  /* ============================ EL DRON (4 cuadros, 28×16, ancla en el centro) ============================ */
  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function dronFrames() {
    var out = [];
    for (var k = 0; k < 4; k++) {
      var b = new Buf(30, 18), blur = k % 2, ph = k >> 1;
      // brazos en X y motores
      b.line(5, 5, 11, 9, '#3a3a42'); b.line(24, 5, 18, 9, '#3a3a42'); b.line(5, 13, 11, 10, '#2a2a30'); b.line(24, 13, 18, 10, '#2a2a30');
      // cuerpo
      b.rect(10, 6, 10, 6, '#d8d8d0'); b.rect(10, 6, 10, 1, '#f3f3ea'); b.rect(10, 11, 10, 1, '#8a8a94'); b.rect(12, 7, 6, 3, '#b8b8b0'); b.rect(13, 8, 4, 1, '#8a8a94');
      b.rect(13, 12, 4, 3, '#2a2a30'); b.rect(14, 13, 2, 1, '#7ec8e8'); b.set(14, 13, '#d6f4ff');                         // cámara-gimbal
      b.rect(9, 8, 1, 2, '#c8483a'); b.rect(20, 8, 1, 2, '#3a9a58');                                                       // luces de posición
      // hélices
      [[4, 4], [25, 4], [4, 13], [25, 13]].forEach(function (p, i) {
        b.rect(p[0] - 1, p[1] - 1, 3, 3, '#2a2a30'); b.set(p[0], p[1], '#5a5a64');
        var long = (i + ph) % 2 ? 4 : 2;
        for (var x = -long; x <= long; x++) b.set(p[0] + x, p[1] - 2, blur ? 'rgba(0,0,0,0)' : '#9a9aa4');
        if (blur) for (var x2 = -4; x2 <= 4; x2++) { b.set(p[0] + x2, p[1] - 2, x2 % 2 ? '#7a7a84' : '#a8a8b2'); }
      });
      out.push(b.canvas(15, 9, false));
    }
    return out;
  }
  var DRON = null;
  function dron() { if (!DRON) DRON = dronFrames(); return DRON; }
  // el dron.js hace S.dron[floor(t*16)%2]: dos cuadros con hélices alternas
  var T2 = S.cv && S.cv.t2;
  if (T2) { try { Object.defineProperty(T2, 'dron', { enumerable: true, configurable: true, get: function () { var d = dron(); return [d[0], d[1]]; } }); } catch (e) { /* nada */ } }

  // sombra del dron sobre el piso (una elipse suave) para que se lea que vuela
  var SHD = null;
  function dronShadow() { if (SHD) return SHD; var c = mk(22, 8), g = c.getContext('2d'); g.fillStyle = 'rgba(10,8,14,0.32)'; g.fillRect(4, 2, 14, 4); g.fillRect(2, 3, 18, 2); g.fillRect(6, 1, 10, 1); g.fillRect(6, 6, 10, 1); c.ax = 11; c.ay = 4; SHD = c; return c; }

  // hoja de prueba (solo para QA): ACH.sprites.zv13.sheet(['cv_barista'], ['move:0','windup:0','dead'], 6) dibuja los cuadros ampliados en una esquina de la página
  function sheet(keys, which, scale) {
    scale = scale || 6; which = which || ['move:0', 'move:3', 'windup:0', 'windup:1', 'hurt:0', 'dead'];
    var old = document.getElementById('zv13Sheet'); if (old) old.remove();
    var rows = keys.map(function (k) { var Z = S.zvar[k]; return which.map(function (w) { var p = w.split(':'), a = Z[p[0]]; return Array.isArray(a) ? a[+p[1] || 0] : a; }).filter(Boolean); });
    var cw = 42 * scale, ch = 46 * scale, c = document.createElement('canvas'); c.id = 'zv13Sheet'; c.width = cw * which.length; c.height = ch * keys.length;
    c.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#6a6e60;image-rendering:pixelated;width:' + c.width + 'px;height:' + c.height + 'px';
    document.body.appendChild(c);
    var g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    rows.forEach(function (r, j) { r.forEach(function (f, i) { g.drawImage(f, i * cw + 3 * scale, j * ch + 2 * scale + (f.height < 20 ? 14 * scale : 0), f.width * scale, f.height * scale); }); });
    return c.width + 'x' + c.height;
  }
  S.zv13 = { build: build, keys: Object.keys(SPECS), dronShadow: dronShadow, dron: dron, SPECS: SPECS, sheet: sheet };
})();
