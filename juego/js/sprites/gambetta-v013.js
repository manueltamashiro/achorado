/* ACHORADO — js/sprites/gambetta-v013.js (v0.13 T2, agente GB): el arte nuevo de la Gambetta.
   Todo procedural, pixel art desaturado («cielo panza de burro»), escala SPEC v0.4 (1 m = 16 px). Autosuficiente; se carga después de
   retratos.js y antes de gambetta.js / prologo.js.
     ACH.sprites.gb.npc(id, f)      sobrevivientes de pie, de frente: charo · eusebio · fosforito · vecina (20×30, ancla = pies) · perro (18×12)
     ACH.sprites.gb.chofer(pose, f) la combi zombi de El Chofer (de costado, mira al este; ancla = centro de las llantas). pose: move · aviso · stun · hurt · dead
     ACH.sprites.gb.calamina(open)  las calaminas que tapan la escalera (64×34, ancla abajo a la izquierda)
     ACH.sprites.gb.escalera()      la escalera improvisada a la azotea sur (14×34, ancla abajo al centro)
     ACH.sprites.gb.combiInterior(w, h)  el interior de la combi del prólogo (fondo)
     ACH.sprites.gb.pasajero(kind, f, zombi) pasajeros del prólogo, sentados o de pie (20×30)
   Retratos: envuelve ACH.retratos.draw para los personajes nuevos (charo, eusebio, fosforito, lucho, chofer, vecina): 48×48 pixelado a 96×96,
   con boca 0/1/2 y ojos abiertos/medio/cerrados. ACH.retratos.NOMBRES = {quien: 'NOMBRE'} (dialogo.js lo lee para el rótulo). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var S = ACH.sprites = ACH.sprites || {};

  function cv(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function hexRgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function rgbHex(r) { return '#' + r.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function dark(h, k) { var r = hexRgb(h); return rgbHex([r[0] * k, r[1] * k, r[2] * k]); }

  /* ---------------- Lienzo de píxeles ---------------- */
  function Px(w, h) { this.w = w; this.h = h; this.d = new Array(w * h); }
  Px.prototype.set = function (x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; };
  Px.prototype.get = function (x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? undefined : this.d[y * this.w + x]; };
  Px.prototype.rect = function (x, y, w, h, c) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.set(x + i, y + j, c); };
  Px.prototype.ell = function (cx, cy, rx, ry, c, clip) {
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      var u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
      if (u * u + v * v <= 1 && (!clip || clip(x, y))) this.set(x, y, c);
    }
  };
  Px.prototype.line = function (x0, y0, x1, y1, c) {
    var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (var i = 0; i <= n; i++) this.set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c);
  };
  // contorno selout: cada píxel vacío junto a uno lleno toma el color del vecino oscurecido (nunca negro puro)
  Px.prototype.outline = function (k) {
    var add = [], w = this.w, h = this.h, x, y, i;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      if (this.d[y * w + x]) continue;
      var n = this.get(x, y + 1) || this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1);
      if (n) add.push([x, y, dark(n, k || 0.42)]);
    }
    for (i = 0; i < add.length; i++) this.set(add[i][0], add[i][1], add[i][2]);
    return this;
  };
  Px.prototype.canvas = function (scale) {
    scale = scale || 1;
    var c = cv(this.w * scale, this.h * scale), g = c.getContext('2d');
    for (var y = 0; y < this.h; y++) for (var x = 0; x < this.w; x++) { var col = this.d[y * this.w + x]; if (col) { g.fillStyle = col; g.fillRect(x * scale, y * scale, scale, scale); } }
    return c;
  };

  /* ---------------- Personajes ---------------- */
  var PJ = {
    charo:     { skin: '#b98262', hair: '#3a302c', hair2: '#8c8680', style: 'bun', shirt: '#7a5a6a', apron: '#d2ccba', pants: '#4a3f48', blush: 1, name: 'DOÑA CHARO' },
    eusebio:   { skin: '#8f5e3e', hair: '#4a4a44', cap: '#5a5a4a', style: 'cap', shirt: '#5f6a5a', straps: '#b8a23a', pants: '#3f3f3a', stache: '#bcb8b0', name: 'DON EUSEBIO' },
    fosforito: { skin: '#b07a55', hair: '#1b1b1b', cap: '#b23a6c', style: 'cap', shirt: '#c2ac3a', pants: '#2e3a52', phones: 1, chain: 1, name: 'DJ FOSFORITO' },
    lucho:     { skin: '#8a9a7c', hair: '#2c2c2a', cap: '#3a4a6a', style: 'cap', shirt: '#7a8a9a', pants: '#3a3a44', zombie: 1, bag: '#6a4a2a', name: 'DON LUCHO' },
    chofer:    { skin: '#7f906f', hair: '#2a2622', cap: '#2a2a30', style: 'cap', shirt: '#5a6a7a', pants: '#2a2a30', zombie: 1, shades: 1, name: 'EL CHOFER' },
    luchovivo: { skin: '#b98a6a', hair: '#2c2c2a', cap: '#3a4a6a', style: 'cap', shirt: '#7a8a9a', pants: '#3a3a44', bag: '#6a4a2a', name: 'DON LUCHO' },
    vecina:    { skin: '#c49270', hair: '#5a3a2a', style: 'rulos', shirt: '#6a8a9a', pants: '#5a4a5a', blush: 1, name: 'LA VECINA' }
  };
  var NOMBRES = {}; for (var nk in PJ) NOMBRES[nk] = PJ[nk].name;

  /* ---- retrato 48×48 → 96×96 ---- */
  var EYE_W = '#f0ece0', INK = '#2a2228';
  function portrait(q, cara, boca, ojos) {
    var o = PJ[q], P = new Px(48, 48), sk = o.skin, skD = dark(sk, 0.8);
    // hombros y ropa
    P.ell(24, 52, 21, 15, o.shirt);
    if (o.apron) { P.rect(16, 40, 16, 8, o.apron); P.rect(17, 37, 2, 4, o.apron); P.rect(29, 37, 2, 4, o.apron); }
    if (o.straps) { P.line(14, 39, 18, 47, o.straps); P.line(34, 39, 30, 47, o.straps); P.line(15, 39, 19, 47, o.straps); }
    if (o.bag) { P.line(13, 38, 34, 47, o.bag); P.line(13, 39, 33, 47, o.bag); }
    if (o.zombie) { P.set(19, 44, dark(o.shirt, 0.6)); P.set(20, 45, dark(o.shirt, 0.6)); P.set(31, 42, '#6a2a26'); P.set(32, 43, '#6a2a26'); P.set(30, 44, '#6a2a26'); }
    // cuello
    P.rect(20, 31, 9, 7, skD);
    if (o.phones) { P.rect(15, 35, 19, 2, '#2a2a30'); P.ell(14, 37, 3, 3, '#b23a6c'); P.ell(34, 37, 3, 3, '#b23a6c'); }
    if (o.chain) { for (var ch = 0; ch < 7; ch++) P.set(21 + ch, 38 + (ch === 3 ? 2 : ch === 2 || ch === 4 ? 1 : 0), '#d8c04a'); }
    // orejas y cabeza
    P.ell(12.5, 22, 2.2, 3.2, skD); P.ell(35.5, 22, 2.2, 3.2, skD);
    P.ell(24, 21, 11, 12.5, sk);
    P.ell(28, 27, 6, 5, dark(sk, 0.93));   // sombra suave de la mejilla
    // pelo / gorra
    if (o.style === 'bun') {
      P.ell(24, 13, 12, 7.5, o.hair, function (x, y) { return y <= 15; });
      P.rect(12, 13, 3, 9, o.hair); P.rect(33, 13, 3, 9, o.hair);
      P.ell(24, 4.5, 5, 4, o.hair);
      P.line(17, 9, 22, 7, o.hair2); P.line(27, 8, 31, 11, o.hair2);
    } else if (o.style === 'rulos') {
      for (var rk = 0; rk < 9; rk++) P.ell(14 + rk * 2.5, 10 + Math.abs(rk - 4) * 0.8, 3, 3, rk % 2 ? o.hair : dark(o.hair, 0.85));
      P.rect(12, 12, 3, 10, o.hair); P.rect(33, 12, 3, 10, o.hair);
    } else {
      P.rect(12, 14, 3, 7, o.hair); P.rect(33, 14, 3, 7, o.hair);
      P.ell(24, 11, 12.5, 7, o.cap, function (x, y) { return y <= 13; });
      P.rect(11, 13, 26, 2, dark(o.cap, 0.8));
      P.rect(9, 14, 22, 2, dark(o.cap, 0.65));   // visera hacia la izquierda
      if (q === 'chofer') P.rect(20, 7, 8, 3, '#c8b04a');   // placa de la gorra
    }
    // cejas según la cara
    var bL = 16, bR = 26, by = 16;
    var browCol = o.style === 'bun' || o.style === 'rulos' ? dark(o.hair, 0.9) : dark(o.hair === '#1b1b1b' ? '#3a3a3a' : o.hair, 0.9);
    if (cara === 'molesta' || cara === 'serio') { P.line(bL, by - 1, bL + 5, by + 1, browCol); P.line(bR + 1, by + 1, bR + 6, by - 1, browCol); }
    else if (cara === 'triste' || cara === 'cansado') { P.line(bL, by + 1, bL + 5, by - 1, browCol); P.line(bR + 1, by - 1, bR + 6, by + 1, browCol); }
    else if (cara === 'sorpresa') { P.rect(bL, by - 2, 6, 1, browCol); P.rect(bR + 1, by - 2, 6, 1, browCol); }
    else { P.rect(bL, by, 6, 1, browCol); P.rect(bR + 1, by, 6, 1, browCol); }
    // ojos
    var ex = [17, 28], ey = 19;
    for (var e = 0; e < 2; e++) {
      var x0 = ex[e];
      if (o.shades) { P.rect(x0 - 1, ey - 1, 6, 3, '#1c1a20'); P.set(x0, ey - 1, '#5a5a66'); if (e === 0) { P.rect(22, ey, 3, 1, '#1c1a20'); P.set(x0 + 3, ey + 1, '#e8e4d8'); } continue; }
      if (ojos === 'cerrados') { P.rect(x0, ey + 1, 4, 1, INK); continue; }
      if (ojos === 'medio') { P.rect(x0, ey + 1, 4, 1, o.zombie ? '#d8d0a0' : EYE_W); P.rect(x0, ey, 4, 1, dark(sk, 0.6)); if (!o.zombie) P.rect(x0 + (e ? 1 : 2), ey + 1, 1, 1, INK); continue; }
      if (o.zombie) { P.rect(x0, ey, 4, 3, '#d8d0a0'); P.set(x0 + 1, ey + 1, '#8a2a24'); P.rect(x0, ey + 3, 4, 1, '#6a3a3a'); }
      else {
        P.rect(x0, ey, 4, 3, EYE_W); P.rect(x0 + (e ? 1 : 2), ey, 2, 3, INK); P.set(x0 + (e ? 1 : 2), ey, '#f8f8f0');
        if (cara === 'sorpresa') P.rect(x0, ey - 1, 4, 1, EYE_W);
      }
    }
    // nariz
    P.set(24, 23, skD); P.set(24, 24, skD); P.set(23, 25, skD); P.set(25, 25, dark(sk, 0.7));
    if (o.blush && cara !== 'serio' && cara !== 'molesta') { P.rect(15, 25, 3, 1, '#c86a6a'); P.rect(31, 25, 3, 1, '#c86a6a'); }
    if (o.stache) { P.rect(20, 27, 9, 2, o.stache); P.set(19, 28, o.stache); P.set(29, 28, o.stache); }
    // boca
    var mx = 22, my = 29, mw = 5, lip = o.zombie ? '#4a3a3a' : '#6a3438';
    var smile = cara === 'feliz' || cara === 'risa' || cara === 'picaro';
    if (boca === 0) {
      if (smile) { P.rect(mx, my, mw, 1, lip); P.set(mx - 1, my - 1, lip); P.set(mx + mw, my - 1, lip); }
      else if (cara === 'triste' || cara === 'molesta') { P.rect(mx, my, mw, 1, lip); P.set(mx - 1, my + 1, lip); P.set(mx + mw, my + 1, lip); }
      else P.rect(mx, my, mw, 1, lip);
    } else {
      var hgt = boca === 1 ? 2 : 4;
      P.rect(mx, my - 1, mw, hgt, '#3a1a20');
      P.rect(mx + 1, my - 1 + hgt - 1, mw - 2, 1, o.zombie ? '#6a4a40' : '#b85a5a');
      if (smile) { P.set(mx - 1, my - 2, lip); P.set(mx + mw, my - 2, lip); }
      if (o.zombie) { P.set(mx + 1, my - 1, '#d8d0a0'); P.set(mx + 3, my - 1, '#d8d0a0'); }
    }
    if (o.zombie) { P.set(31, 15, '#6a2a26'); P.set(32, 16, '#6a2a26'); P.set(30, 17, '#8a3a2a'); P.rect(14, 26, 2, 1, dark(sk, 0.7)); }
    P.outline(0.42);
    return P.canvas(2);
  }
  var pcache = {};
  function portraitCached(q, cara, boca, ojos) {
    var k = q + '|' + cara + '|' + boca + '|' + ojos;
    return pcache[k] || (pcache[k] = portrait(q, cara, boca, ojos));
  }

  // Envuelve ACH.retratos.draw: los personajes nuevos se dibujan aquí; Alexander y Titina siguen con el original.
  (function wrapRetratos() {
    var R = ACH.retratos; if (!R || typeof R.draw !== 'function' || R._gbWrap) return;
    var orig = R.draw;
    R.draw = function (ctx, quien, cara, boca, ojos, t) {
      if (!PJ[quien]) return orig.apply(this, arguments);
      try {
        var b = boca === 1 || boca === 2 ? boca : 0, o = ojos === 'medio' || ojos === 'cerrados' ? ojos : 'abiertos';
        var img = portraitCached(quien, cara || 'habla', b, o), dy = (cara === 'sorpresa' && t >= 0 && t < 0.3) ? -Math.round(Math.sin(t / 0.3 * Math.PI) * 2) : 0;
        if (PJ[quien].zombie) dy += Math.round(Math.sin((t || 0) * 3) * 0.6);   // los zombis se mecen un poquito
        ctx.drawImage(img, 0, dy);
      } catch (e) { /* nunca romper el diálogo */ }
    };
    R._gbWrap = true;
    R.NOMBRES = R.NOMBRES || {}; for (var k in NOMBRES) R.NOMBRES[k] = NOMBRES[k];
  })();

  /* ---- sobrevivientes de pie (20×30, de frente) ---- */
  function npcSprite(id, f) {
    var o = PJ[id], P = new Px(20, 30), sk = o.skin, bob = f % 2 ? 1 : 0;
    // piernas y zapatos
    P.rect(7, 22, 2, 6, o.pants); P.rect(11, 22, 2, 6, o.pants); P.rect(6, 27, 3, 2, '#2a2428'); P.rect(11, 27, 3, 2, '#2a2428');
    // cuerpo
    P.rect(5, 12 + bob, 10, 11 - bob, o.shirt);
    if (o.apron) { P.rect(6, 15 + bob, 8, 9 - bob, o.apron); P.set(6, 13 + bob, o.apron); P.set(13, 13 + bob, o.apron); }
    if (o.straps) { P.rect(6, 12 + bob, 1, 8, o.straps); P.rect(13, 12 + bob, 1, 8, o.straps); P.rect(14, 13 + bob, 4, 7, '#8a7a52'); P.rect(15, 12 + bob, 2, 1, '#6e6244'); }   // el costal
    if (o.chain) { P.rect(8, 13 + bob, 4, 1, '#d8c04a'); }
    if (o.phones) { P.rect(6, 11 + bob, 8, 1, '#2a2a30'); P.set(5, 12 + bob, '#b23a6c'); P.set(14, 12 + bob, '#b23a6c'); }
    // brazos
    if (id === 'fosforito') {   // atrapado: agita los brazos pidiendo ayuda
      if (f % 2) { P.rect(2, 4, 2, 9, o.shirt); P.rect(16, 7, 2, 7, o.shirt); P.rect(2, 3, 2, 2, sk); P.rect(16, 6, 2, 2, sk); }
      else { P.rect(2, 7, 2, 7, o.shirt); P.rect(16, 4, 2, 9, o.shirt); P.rect(2, 6, 2, 2, sk); P.rect(16, 3, 2, 2, sk); }
    } else {
      P.rect(3, 13 + bob, 2, 8, o.shirt); P.rect(15, 13 + bob, 2, 8, o.shirt);
      P.rect(3, 21 + bob, 2, 2, sk); P.rect(15, 21 + bob, 2, 2, sk);
      if (id === 'charo') { P.line(16, 22 + bob, 17, 14 + bob, '#8a8a88'); P.rect(16, 13 + bob, 3, 2, '#8a8a88'); }   // el cucharón
    }
    // cabeza
    P.rect(8, 10 + bob, 4, 2, dark(sk, 0.8));
    P.ell(10, 7 + bob, 4.2, 4.6, sk);
    if (o.style === 'bun') { P.ell(10, 4 + bob, 4.6, 2.6, o.hair, function (x, y) { return y <= 5 + bob; }); P.rect(5, 4 + bob, 2, 4, o.hair); P.rect(13, 4 + bob, 2, 4, o.hair); P.ell(10, 1 + bob, 2, 1.6, o.hair); P.set(8, 3 + bob, o.hair2); }
    else if (o.style === 'rulos') { P.ell(10, 4 + bob, 5, 3, o.hair, function (x, y) { return y <= 6 + bob; }); P.rect(5, 4 + bob, 2, 5, o.hair); P.rect(13, 4 + bob, 2, 5, o.hair); }
    else { P.ell(10, 4 + bob, 4.8, 2.6, o.cap, function (x, y) { return y <= 4 + bob; }); P.rect(4, 5 + bob, 8, 1, dark(o.cap, 0.7)); }
    P.set(8, 7 + bob, INK); P.set(11, 7 + bob, INK);
    if (o.stache) P.rect(8, 9 + bob, 4, 1, o.stache); else P.rect(9, 9 + bob, 2, 1, '#6a3438');
    P.outline(0.45);
    var c = P.canvas(1); c.ax = 10; c.ay = 29; return c;
  }
  function dogSprite(f, healed) {
    var P = new Px(18, 12), fur = '#a08a6a', furD = '#7a6a52';
    P.rect(4, 5, 10, 4, fur); P.rect(5, 9, 2, 3 - (f % 2), furD); P.rect(11, 9, 2, 3 - ((f + 1) % 2), furD);
    P.ell(14.5, 4.5, 3, 2.6, fur); P.rect(16, 5, 2, 2, furD); P.set(17, 5, '#2a2228'); P.set(14, 3, '#2a2228'); P.rect(13, 1, 2, 2, furD);
    if (healed) { P.line(2, 4 - (f % 2), 4, 6, fur); P.line(1, 3 - (f % 2), 2, 4 - (f % 2), fur); }   // mueve la cola
    else { P.line(1, 8, 4, 7, furD); P.rect(7, 5, 3, 4, '#e8e4d8'); P.set(8, 6, '#b84a3a'); }   // venda con sangre, cola gacha
    P.outline(0.45);
    var c = P.canvas(1); c.ax = 9; c.ay = 11; return c;
  }
  var ncache = {};
  function npc(id, f) {
    f = (f | 0) % 2;
    var k = id + f;
    if (ncache[k]) return ncache[k];
    if (id === 'perro' || id === 'perroSano') return (ncache[k] = dogSprite(f, id === 'perroSano'));
    if (!PJ[id]) return null;
    return (ncache[k] = npcSprite(id, f));
  }

  /* ---------------- El Chofer: la combi zombi ---------------- */
  var ccache = {};
  function baseCombi() {
    var P = S.props, arr = P && P.combiE, b = Array.isArray(arr) ? arr[1] || arr[0] : arr;
    if (b && b.width) return b;
    var c = cv(80, 46), g = c.getContext('2d');   // respaldo si falta el arte de vehiculos.js
    g.fillStyle = '#c8c0a0'; g.fillRect(2, 8, 76, 28); g.fillStyle = '#4a5a6a'; g.fillRect(8, 12, 60, 10); g.fillStyle = '#1c1a20'; g.fillRect(12, 34, 12, 10); g.fillRect(56, 34, 12, 10);
    return c;
  }
  function chofer(pose, f) {
    f = (f | 0) % 2; pose = pose || 'move';
    var k = pose + f;
    if (ccache[k]) return ccache[k];
    var b = baseCombi(), W = b.width, H = b.height, pad = 10, c = cv(W + pad * 2, H + 8), g = c.getContext('2d');
    var bob = pose === 'move' ? f : 0, by = 4 + bob;
    g.drawImage(b, pad, by);
    // mugre verdosa y óxido: solo sobre los píxeles opacos de la combi
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = pose === 'dead' ? 'rgba(20,18,24,0.55)' : 'rgba(60,82,48,0.28)'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(90,40,30,0.55)';
    [[18, 30, 7, 2], [44, 26, 3, 8], [60, 32, 9, 2], [30, 12, 2, 5], [70, 20, 2, 6]].forEach(function (r) { g.fillRect(pad + r[0], by + r[1], r[2], r[3]); });
    g.fillStyle = 'rgba(30,26,30,0.6)'; g.fillRect(pad + 4, by + H - 14, W - 8, 2);
    g.globalCompositeOperation = 'source-over';
    // el chofer en el parabrisas (adelante = derecha): ojos amarillos
    var wx = pad + W - 18, wy = by + 12;
    g.fillStyle = '#7f906f'; g.fillRect(wx, wy, 5, 5); g.fillStyle = '#2a2a30'; g.fillRect(wx - 1, wy - 2, 7, 2);
    g.fillStyle = pose === 'dead' ? '#3a3a3a' : '#e8e060'; g.fillRect(wx + 1, wy + 2, 1, 1); g.fillRect(wx + 3, wy + 2, 1, 1);
    // parabrisas rajado
    g.fillStyle = 'rgba(230,230,220,0.7)'; [[0, 0], [1, 1], [2, 1], [3, 2], [2, 3], [4, 3], [5, 4]].forEach(function (q) { g.fillRect(wx - 6 + q[0], wy - 1 + q[1], 1, 1); });
    // faros
    var fx = pad + W - 3, fy = by + H - 20;
    if (pose === 'aviso') {
      var on = f === 0;
      g.fillStyle = on ? '#fff6c0' : '#e8d870'; g.fillRect(fx - 1, fy, 4, 4);
      if (on) { g.fillStyle = 'rgba(255,246,190,0.55)'; g.beginPath(); g.moveTo(fx + 3, fy + 2); g.lineTo(c.width, fy - 6); g.lineTo(c.width, fy + 10); g.closePath(); g.fill(); }
    } else { g.fillStyle = pose === 'dead' ? '#4a4a44' : '#a8a070'; g.fillRect(fx - 1, fy, 3, 3); }
    // aturdida: humo del capó y estrellitas
    if (pose === 'stun' || pose === 'dead') {
      g.fillStyle = 'rgba(200,200,196,0.75)';
      var sy = f ? 0 : 2; g.fillRect(fx - 8, sy + 2, 4, 3); g.fillRect(fx - 5, sy, 3, 3); g.fillRect(fx - 11, sy + 4, 3, 2);
      if (pose === 'stun') { g.fillStyle = '#ffe500'; g.fillRect(wx + (f ? 6 : -2), wy - 6, 1, 1); g.fillRect(wx + (f ? -3 : 7), wy - 4, 1, 1); g.fillRect(wx + 2, wy - 8 + f, 1, 1); }
    }
    if (pose === 'hurt') { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over'; }
    c.ax = Math.round(pad + W / 2); c.ay = by + H - 2;
    return (ccache[k] = c);
  }
  // el formato de ACH.sprites.zvar (zombies.js frame()): move, hurt, dead y poses propias (z.zpose = 'aviso' | 'stun')
  function choferSet() {
    return { move: [chofer('move', 0), chofer('move', 1)], hurt: [chofer('hurt', 0)], dead: [chofer('dead', 0)],
      aviso: [chofer('aviso', 0), chofer('aviso', 1)], stun: [chofer('stun', 0), chofer('stun', 1)] };
  }

  /* ---------------- Calamina de la escalera y escalera improvisada ---------------- */
  var calC = null, escC = null;
  function calamina() {
    if (calC) return calC;
    var P = new Px(64, 34), i, x;
    var cols = ['#8a8c88', '#9c9a90', '#7e7a70', '#a08a6a'];
    for (i = 0; i < 4; i++) {   // 4 planchas un poco torcidas
      var x0 = i * 16, h0 = 26 + (i % 2) * 4, base = cols[i];
      for (x = 0; x < 16; x++) for (var y = 34 - h0 + ((x + i) % 5 === 0 ? 1 : 0); y < 34; y++) P.set(x0 + x, y, x % 3 === 0 ? dark(base, 0.78) : base);
      P.rect(x0 + 3, 34 - h0 + 6, 3, 2, '#8a4a2a'); P.rect(x0 + 10, 30, 4, 2, '#7a4022');   // óxido
    }
    P.line(2, 14, 61, 22, '#6a4a2a'); P.line(2, 15, 61, 23, '#7a5a32');   // tablón cruzado
    P.line(4, 27, 58, 12, '#c23a3a'); P.line(5, 27, 59, 12, '#c23a3a');   // la cruz roja pintada
    for (i = 0; i < 6; i++) P.set(8 + i * 10, 18 + (i % 2), '#2a2a30');   // clavos
    P.outline(0.5);
    calC = P.canvas(1); calC.ax = 0; calC.ay = 33;
    return calC;
  }
  function escalera() {
    if (escC) return escC;
    var P = new Px(14, 34), wood = '#9a7a4a', woodD = '#6e5232';
    P.rect(1, 0, 2, 34, wood); P.rect(11, 0, 2, 34, wood);
    for (var y = 3; y < 34; y += 5) P.rect(3, y, 8, 2, y % 2 ? woodD : wood);
    P.set(4, 12, '#2a2a30'); P.set(9, 22, '#2a2a30');
    P.outline(0.45);
    escC = P.canvas(1); escC.ax = 7; escC.ay = 33;
    return escC;
  }

  /* ---------------- Prólogo: interior de la combi y pasajeros ---------------- */
  var icache = {};
  function combiInterior(w, h) {
    var k = w + 'x' + h; if (icache[k]) return icache[k];
    var c = cv(w, h), g = c.getContext('2d');
    // afuera: la Gambetta que pasa (cielo panza de burro)
    g.fillStyle = '#9ea2a3'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#8a8e8e'; for (var bx = 0; bx < w; bx += 46) g.fillRect(bx, 40 + (bx % 3) * 4, 38, 40);
    // carrocería: techo, ventanas, piso
    var top = 30, win0 = 44, win1 = 92, floor0 = 150, floorY = h - 40;
    g.fillStyle = '#d8d0b0'; g.fillRect(0, 0, w, top);                     // techo interior crema
    g.fillStyle = '#c8bc98'; g.fillRect(0, top - 4, w, 4);
    g.fillStyle = '#ece4c4'; for (var lx = 30; lx < w; lx += 90) g.fillRect(lx, 8, 30, 5);   // fluorescentes
    g.fillStyle = '#b8b098'; g.fillRect(0, top, w, win0 - top);
    for (var wx = 12; wx < w - 40; wx += 74) {                             // ventanas con la ciudad gris detrás
      g.fillStyle = 'rgba(160,170,172,0.55)'; g.fillRect(wx, win0, 62, win1 - win0);
      g.fillStyle = '#6a6e70'; g.fillRect(wx, win0, 62, 2); g.fillRect(wx, win1 - 2, 62, 2);
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(wx + 6, win0 + 6, 2, 30); g.fillRect(wx + 10, win0 + 6, 1, 20);
    }
    g.fillStyle = '#b8b098'; g.fillRect(0, win1, w, floor0 - win1);
    // stickers y letreros de combi (sin marcas)
    g.fillStyle = '#c23a3a'; g.fillRect(40, win1 + 6, 46, 9); g.fillStyle = '#f0e8d0'; g.fillRect(43, win1 + 9, 40, 3);
    g.fillStyle = '#2a6a9a'; g.fillRect(200, win1 + 6, 30, 12); g.fillStyle = '#ffe500'; g.fillRect(204, win1 + 9, 22, 2); g.fillRect(204, win1 + 13, 14, 2);
    g.fillStyle = '#e86aa0'; g.fillRect(330, win1 + 5, 20, 14); g.fillStyle = '#f0e8d0'; g.fillRect(333, win1 + 9, 14, 2);
    // pasamanos
    g.fillStyle = '#a8a8a8'; g.fillRect(0, top + 2, w, 2);
    for (var hx = 20; hx < w; hx += 38) { g.fillRect(hx, top + 4, 1, 10); g.fillStyle = '#c23a74'; g.fillRect(hx - 2, top + 13, 5, 4); g.fillStyle = '#a8a8a8'; }
    // piso: jebe acanalado
    g.fillStyle = '#4a4a4e'; g.fillRect(0, floor0, w, h - floor0);
    g.fillStyle = '#3a3a3e'; for (var fy = floor0 + 3; fy < h; fy += 4) g.fillRect(0, fy, w, 1);
    // asientos (respaldo arriba y abajo del pasillo)
    function seat(x, y) { g.fillStyle = '#6a2a2a'; g.fillRect(x, y, 26, 14); g.fillStyle = '#8a3a34'; g.fillRect(x + 2, y + 2, 22, 5); g.fillStyle = '#3a3a3e'; g.fillRect(x + 4, y + 14, 3, 6); g.fillRect(x + 19, y + 14, 3, 6); }
    for (var sx = 60; sx < w - 60; sx += 56) { seat(sx, floor0 - 18); seat(sx, h - 22); }
    // puerta trasera (izquierda) y adelante el chofer (derecha)
    g.fillStyle = '#5a5a5e'; g.fillRect(0, top, 14, h - top); g.fillStyle = '#7a7a7e'; g.fillRect(2, win0, 10, 60); g.fillStyle = '#c23a3a'; g.fillRect(3, win0 + 64, 8, 5);
    g.fillStyle = '#2a2a30'; g.fillRect(w - 30, top, 30, h - top); g.fillStyle = '#5a5a60'; g.fillRect(w - 26, win0, 22, 40);
    g.fillStyle = '#1c1a20'; g.beginPath(); g.arc(w - 18, floor0 - 4, 9, 0, Math.PI * 2); g.fill(); g.fillStyle = '#4a4a50'; g.fillRect(w - 19, floor0 - 12, 2, 16);
    c.floor0 = floor0; c.floorY = floorY; c.top = top;
    return (icache[k] = c);
  }
  var PAX = { celular: { skin: '#b88a6a', shirt: '#5a6a8a', hair: '#2a2420' }, duerme: { skin: '#9a6a4c', shirt: '#8a6a4a', hair: '#3a3a36' },
    audifonos: { skin: '#c49270', shirt: '#3a7a5a', hair: '#1b1b1b' }, tose: { skin: '#a8866a', shirt: '#7a7a6a', hair: '#8c8680' },
    lucho: { skin: '#b98a6a', shirt: '#7a8a9a', hair: '#2c2c2a' } };
  var pxc = {};
  function pasajero(kind, f, zombi) {
    var k = kind + (f | 0) % 2 + (zombi ? 'z' : '');
    if (pxc[k]) return pxc[k];
    var o = PAX[kind] || PAX.celular, P = new Px(20, 30), sk = zombi ? '#8a9a7c' : o.skin, bob = (f | 0) % 2;
    P.rect(7, 20, 2, 8, '#3a3a44'); P.rect(11, 20, 2, 8, '#3a3a44'); P.rect(6, 27, 3, 2, '#2a2428'); P.rect(11, 27, 3, 2, '#2a2428');
    P.rect(5, 11 + bob, 10, 10 - bob, o.shirt);
    if (zombi) { P.rect(3, 12, 2, 3, o.shirt); P.rect(15, 12, 2, 3, o.shirt); P.rect(1, 12 + bob, 3, 2, sk); P.rect(16, 13 - bob, 3, 2, sk); }   // brazos estirados
    else { P.rect(3, 12 + bob, 2, 8, o.shirt); P.rect(15, 12 + bob, 2, 8, o.shirt); }
    if (kind === 'celular' && !zombi) { P.rect(8, 15, 3, 4, '#1c1c22'); P.set(9, 16, '#8ac8e8'); }
    if (kind === 'lucho') { P.line(5, 12, 14, 20, '#6a4a2a'); P.rect(12, 18, 4, 3, '#6a4a2a'); }   // canguro de las monedas
    P.ell(10, 6 + bob, 4.2, 4.6, sk);
    P.ell(10, 3 + bob, 4.6, 2.4, o.hair, function (x, y) { return y <= 4 + bob; });
    if (kind === 'audifonos' && !zombi) { P.rect(5, 5 + bob, 1, 3, '#c23a74'); P.rect(14, 5 + bob, 1, 3, '#c23a74'); }
    if (zombi) { P.set(8, 6 + bob, '#e8e060'); P.set(11, 6 + bob, '#e8e060'); P.rect(9, 9 + bob, 2, 1, '#3a1a20'); P.set(13, 4 + bob, '#6a2a26'); }
    else if (kind === 'duerme') { P.rect(7, 6 + bob, 2, 1, INK); P.rect(11, 6 + bob, 2, 1, INK); }
    else { P.set(8, 6 + bob, INK); P.set(11, 6 + bob, INK); }
    P.outline(0.45);
    var c = P.canvas(1); c.ax = 10; c.ay = 29;
    return (pxc[k] = c);
  }

  S.gb = { npc: npc, chofer: chofer, choferSet: choferSet, calamina: calamina, escalera: escalera, combiInterior: combiInterior, pasajero: pasajero,
    portrait: portraitCached, PJ: PJ, NOMBRES: NOMBRES };
})();
