/* ACHORADO — js/sprites/retratos-v013.js (v0.13 T3, agente R): retratos de diálogo de los personajes del Cerro, Kennedy y Costa Verde.
   Mismo patrón que js/sprites/gambetta-v013.js: envuelve ACH.retratos.draw (encadenando al envoltorio anterior), lienzo 48×48
   pixelado a 96×96, boca 0/1/2 y ojos abiertos/medio/cerrados. Se carga justo después de retratos.js (y de gambetta-v013.js si la página lo carga).
     Cerro:       presidenta (zombi conocida) · meche · olla (la señora de la olla común)
     Kennedy:     chancaca (zombi conocida) · pintor · rosa · pepe · tito
     Costa Verde: turista (el del dron, zombi conocido) · chalo · mayra · brayan · fosfo
   Caras: habla · feliz · risa · picaro · serio · sorpresa · molesta · triste (cualquier otra cae en «habla»).
   ACH.retratos.NOMBRES[id] = 'NOMBRE' (dialogo.js lo usa para el rótulo). ACH.retratos.V013 = { ids, caras, portrait }. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  function cv(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function hexRgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function rgbHex(r) { return '#' + r.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function dark(h, k) { var r = hexRgb(h); return rgbHex([r[0] * k, r[1] * k, r[2] * k]); }
  function light(h, k) { var r = hexRgb(h); return rgbHex([r[0] + (255 - r[0]) * k, r[1] + (255 - r[1]) * k, r[2] + (255 - r[2]) * k]); }

  /* ---------------- Lienzo de píxeles (igual que gambetta-v013.js) ---------------- */
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
  // sombrea los píxeles que ya tienen el color c (para luz de arriba-izquierda sin pintar fuera de la forma)
  Px.prototype.tint = function (c, c2, test) {
    for (var y = 0; y < this.h; y++) for (var x = 0; x < this.w; x++) if (this.d[y * this.w + x] === c && test(x, y)) this.d[y * this.w + x] = c2;
  };
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

  /* ---------------- Personajes ----------------
     skin, hair (+hair2 brillo), style (peinado o sombrero), shirt (+shirt2 acento), y rasgos: zombie, old, glasses, stache, beard, blush, earrings. */
  var ZSK = '#8a9a7c';   // piel gris verdosa de los zombis conocidos (misma que Don Lucho)
  var PJ = {
    presidenta: { skin: ZSK, hair: '#3a2e44', hair2: '#5c4e6a', style: 'perma', shirt: '#8a3a4a', zombie: 1, sash: 1, pin: 1, earrings: '#e0b030', name: 'LA PRESIDENTA' },
    meche:      { skin: '#b4826a', hair: '#8c8680', hair2: '#b8b4ac', style: 'bun', shirt: '#7a6a4a', shirt2: '#5e5038', old: 1, glasses: 1, blush: 1, cardigan: 1, name: 'DOÑA MECHE' },
    olla:       { skin: '#a87458', hair: '#2e2622', hair2: '#4a3e36', style: 'panuelo', kerch: '#3a6a8a', shirt: '#8a4a5a', apron: '#d8d0bc', blush: 1, name: 'LA SEÑORA DE LA OLLA' },
    chancaca:   { skin: ZSK, hair: '#9a988e', hair2: '#c4c1b3', style: 'panuelo', kerch: '#c8382e', shirt: '#b8832c', apron: '#dcd2b4', zombie: 1, old: 1, earrings: '#f0c838', name: 'DOÑA CHANCACA' },
    pintor:     { skin: '#c09070', hair: '#5a4a3a', hair2: '#7a6a58', style: 'boina', beret: '#3a3a52', shirt: '#d8d0bc', shirt2: '#2a2a30', beard: '#5a4a3a', paint: 1, scarf: '#b85a3a', name: 'EL PINTOR' },
    rosa:       { skin: '#9a6448', hair: '#1e1a1a', hair2: '#3a3030', style: 'trenzas', shirt: '#c23a4a', shawl: 1, blush: 1, earrings: '#e8c040', name: 'DOÑA ROSA' },
    pepe:       { skin: '#b07a5a', hair: '#3a302a', hair2: '#5a4a40', style: 'cap', cap: '#2a6a9a', capMark: '#f2d21a', shirt: '#e8d870', shirt2: '#c8a838', stache: '#3a302a', name: 'DON PEPE' },
    tito:       { skin: '#8f5e3e', hair: '#bcb8b0', hair2: '#d8d4cc', style: 'sombrero', hat: '#c8b078', hatBand: '#3a3a44', shirt: '#5a7a6a', shirt2: '#e8e4d8', old: 1, stache: '#d0ccc4', name: 'DON TITO' },
    turista:    { skin: ZSK, hair: '#c8a060', hair2: '#e0c080', style: 'bucket', hat: '#c8b48a', shirt: '#2a9a9a', flowers: 1, zombie: 1, camStrap: 1, sunburn: 0, name: 'EL TURISTA' },
    chalo:      { skin: '#b07a55', hair: '#1e1a1a', hair2: '#3a3030', style: 'casco', helmet: '#ffe500', shirt: '#e84a8a', harness: '#2a2a30', goggles: 1, name: 'CHALO' },
    mayra:      { skin: '#c49270', hair: '#3a2420', hair2: '#5a3a30', style: 'casco', helmet: '#2fb8e8', shirt: '#1fe07a', harness: '#2a2a30', pony: 1, blush: 1, earrings: '#f2f2ee', name: 'MAYRA' },
    brayan:     { skin: '#9a6a4c', hair: '#141210', hair2: '#2e2a26', style: 'casco', helmet: '#d8402c', shirt: '#ffb020', harness: '#2a2a30', young: 1, name: 'BRAYAN' },
    fosfo:      { skin: '#b0785a', hair: '#14100e', hair2: '#2a2420', style: 'cap', cap: '#1c1a22', shirt: '#26242e', stache: '#14100e', stacheUp: 1, neon: 1, name: 'DON FOSFO' }
  };
  var IDS = Object.keys(PJ);
  var CARAS = ['habla', 'feliz', 'risa', 'picaro', 'serio', 'sorpresa', 'molesta', 'triste'];
  var ALIAS = { mueca: 'molesta', asco: 'molesta', cansado: 'triste', miedo: 'sorpresa' };
  var NOMBRES = {}; IDS.forEach(function (k) { NOMBRES[k] = PJ[k].name; });

  var EYE_W = '#f0ece0', INK = '#2a2228', ZEYE = '#d8d0a0', ZPUP = '#8a2a24', BLOOD = '#6a2a26';
  var NEON = ['#3adc50', '#ff3aa0', '#f2e63c', '#38c8e8'];

  /* ---------------- el retrato ---------------- */
  function portrait(q, cara, boca, ojos) {
    var o = PJ[q], P = new Px(48, 48), sk = o.skin, skD = dark(sk, 0.82), skDD = dark(sk, 0.7), skL = light(sk, 0.14);
    var sh = o.shirt, shD = dark(sh, 0.78);
    var i, x, y;

    /* --- ropa y hombros --- */
    P.ell(24, 52, 21, 15, sh);
    P.tint(sh, shD, function (x, y) { return x > 33 || y > 45 && x > 28; });
    if (o.cardigan) { P.ell(24, 52, 21, 15, o.shirt2, function (x, y) { return x < 18 || x > 30; }); P.tint(o.shirt2, dark(o.shirt2, 0.8), function (x) { return x > 33; }); for (y = 40; y < 48; y += 3) P.set(17, y, '#d8d0bc'); }
    if (o.apron) { P.rect(16, 40, 16, 8, o.apron); P.rect(17, 37, 2, 4, o.apron); P.rect(29, 37, 2, 4, o.apron); P.rect(28, 40, 4, 8, dark(o.apron, 0.88)); }
    if (q === 'pintor') {   // bata de pintor con manchas y polo oscuro debajo
      P.rect(20, 37, 9, 4, o.shirt2);
      [[14, 42, '#c23a3a'], [15, 43, '#c23a3a'], [33, 40, '#3a7ac8'], [34, 41, '#3a7ac8'], [19, 46, '#e8c040'], [30, 45, '#4a9a4a'], [31, 45, '#4a9a4a']].forEach(function (p) { P.set(p[0], p[1], p[2]); });
    }
    if (o.shawl) {   // manta andina con franjas
      var SH = ['#e8b030', '#2a7a6a', '#d84a8a', '#3a4a8a'];
      P.ell(24, 52, 21, 15, SH[0], function (x, y) { return y < 44 && (x < 19 || x > 29); });
      for (y = 38; y < 48; y++) for (x = 3; x < 46; x++) { var c0 = P.get(x, y); if (c0 === SH[0] && (y % 4 === 0)) P.set(x, y, SH[1 + ((x >> 2) % 3)]); }
      P.rect(22, 40, 4, 3, '#d8c060');   // el prendedor (tupu)
    }
    if (o.flowers) {   // camisa hawaiana
      [[12, 42], [18, 46], [30, 41], [36, 44], [24, 45], [9, 46], [40, 47]].forEach(function (p, k) { var fc = k % 2 ? '#ff5aa8' : '#ffd740'; P.set(p[0], p[1], fc); P.set(p[0] + 1, p[1], fc); P.set(p[0], p[1] + 1, fc); P.set(p[0] + 1, p[1] + 1, '#ffffff'); });
      P.line(19, 37, 22, 44, light(sh, 0.4)); P.line(29, 37, 26, 44, light(sh, 0.4));   // cuello abierto
    }
    if (o.camStrap) { P.line(14, 38, 22, 46, '#2a2a2a'); P.line(34, 38, 26, 46, '#2a2a2a'); P.rect(21, 44, 7, 4, '#3a3a40'); P.rect(23, 45, 3, 3, '#1a1a20'); P.set(24, 46, '#6ac8e8'); }
    if (o.harness) { P.line(16, 38, 18, 47, o.harness); P.line(32, 38, 30, 47, o.harness); P.rect(16, 44, 16, 2, o.harness); P.rect(23, 44, 3, 2, '#c8c8c0'); P.line(12, 41, 13, 47, light(sh, 0.35)); }
    if (q === 'pepe') { P.rect(20, 40, 9, 8, o.shirt2); P.rect(22, 42, 5, 3, '#d8263a'); }   // canguro de vendedor
    if (q === 'tito') { P.line(18, 37, 24, 44, o.shirt2); P.line(30, 37, 24, 44, o.shirt2); }   // cuello de camisa
    if (o.neon) { for (i = 0; i < 4; i++) { var r = 9 + i * 1.6; for (var a = 0.35; a < 2.8; a += 0.09) P.set(24 + Math.cos(a) * r * 1.15, 35 + Math.sin(a) * r * 0.55, NEON[i]); } }
    if (o.sash) {   // banda roja y blanca de presidenta, del hombro derecho a la cadera izquierda
      for (i = 0; i < 16; i++) { var bx = 33 - i * 1.2, by = 37 + i * 0.7; P.rect(bx, by, 3, 2, i % 4 < 2 ? '#c82a3a' : '#f2f2f2'); }
    }
    if (o.pin) { P.rect(15, 40, 3, 3, '#e0b030'); P.set(16, 40, '#fff2b0'); }
    if (o.scarf) { P.rect(19, 35, 11, 3, o.scarf); P.rect(26, 37, 3, 6, o.scarf); P.set(27, 43, dark(o.scarf, 0.8)); }
    if (o.zombie) { P.set(19, 44, dark(sh, 0.6)); P.set(20, 45, dark(sh, 0.6)); P.set(31, 42, BLOOD); P.set(32, 43, BLOOD); P.set(30, 44, BLOOD); }

    /* --- cuello, orejas y cabeza --- */
    P.rect(20, 30, 9, 7, skD); P.rect(26, 30, 3, 7, skDD);
    if (o.scarf) P.rect(19, 35, 11, 3, o.scarf);
    if (o.neon) { P.set(20, 36, NEON[0]); P.set(28, 36, NEON[1]); }
    P.ell(12.5, 22, 2.2, 3.2, skD); P.ell(35.5, 22, 2.2, 3.2, skDD);
    var headRy = o.young ? 12 : 12.5;
    P.ell(24, 21, 11, headRy, sk);
    P.tint(sk, skD, function (x, y) { var u = (x - 24) / 11, v = (y - 21) / 12.5; return u * 0.8 + v * 0.35 > 0.55; });   // lado en sombra
    P.ell(19, 15, 3.5, 2, skL, function (x, y) { return P.get(x, y) === sk; });   // brillo de la frente
    if (o.earrings) { P.set(12, 26, o.earrings); P.set(12, 27, o.earrings); P.set(35, 26, o.earrings); }

    /* --- pelo y sombreros --- */
    var hr = o.hair, h2 = o.hair2, hD = dark(hr, 0.8);
    switch (o.style) {
      case 'perma':   // permanente voluminosa
        for (i = 0; i < 11; i++) { var px = 11 + i * 2.6, py = 9 + Math.abs(i - 5) * 0.9; P.ell(px, py, 3.2, 3.2, i % 2 ? hr : hD); }
        P.ell(11, 16, 3.4, 4.5, hr); P.ell(37, 16, 3.4, 4.5, hD); P.ell(10.5, 21, 2.5, 3, hD); P.ell(37.5, 21, 2.5, 3, hD);
        [[15, 7], [20, 5], [26, 5], [31, 7], [13, 13]].forEach(function (p) { P.set(p[0], p[1], h2); P.set(p[0] + 1, p[1], h2); });
        break;
      case 'bun':
        P.ell(24, 13, 12, 7.5, hr, function (x, y) { return y <= 15; });
        P.rect(12, 13, 3, 9, hr); P.rect(33, 13, 3, 9, hD);
        P.ell(24, 4.5, 5, 4, hr); P.ell(25, 4.5, 2.5, 2, h2);
        P.line(17, 9, 22, 7, h2); P.line(27, 8, 31, 11, h2); P.line(14, 12, 16, 10, h2);
        break;
      case 'panuelo':   // pañuelo amarrado; asoma el pelo en las sienes
        P.rect(12, 14, 3, 8, hr); P.rect(33, 14, 3, 8, hD); P.set(13, 15, h2); P.set(34, 16, h2);
        P.ell(24, 12, 12.6, 7.5, o.kerch, function (x, y) { return y <= 15; });
        P.rect(11, 14, 26, 1, dark(o.kerch, 0.75));
        P.tint(o.kerch, dark(o.kerch, 0.82), function (x) { return x > 31; });
        P.line(15, 8, 21, 6, light(o.kerch, 0.3)); P.set(28, 9, light(o.kerch, 0.3)); P.set(19, 11, light(o.kerch, 0.3));
        P.ell(37, 12, 2.5, 2, o.kerch); P.line(37, 13, 40, 17, o.kerch); P.line(38, 13, 41, 16, dark(o.kerch, 0.8));   // el nudo
        if (q === 'chancaca') { P.set(16, 9, '#f2ece0'); P.set(23, 7, '#f2ece0'); P.set(30, 10, '#f2ece0'); }   // lunares
        break;
      case 'boina':
        P.rect(12, 14, 3, 7, hr); P.rect(33, 14, 3, 7, hD);
        P.ell(23, 10, 13, 5.2, o.beret); P.tint(o.beret, dark(o.beret, 0.8), function (x, y) { return y > 12 || x > 31; });
        P.rect(11, 13, 23, 1, dark(o.beret, 0.65)); P.rect(22, 3, 2, 2, o.beret); P.line(14, 8, 19, 7, light(o.beret, 0.25));
        break;
      case 'trenzas':   // raya al medio y dos trenzas al frente
        P.ell(24, 12, 12, 7, hr, function (x, y) { return y <= 15; });
        P.rect(12, 12, 3, 12, hr); P.rect(33, 12, 3, 12, hD);
        P.line(24, 6, 24, 9, dark(hr, 0.6)); P.line(18, 8, 22, 7, h2); P.line(27, 8, 31, 9, h2);
        for (y = 24; y < 46; y += 2) { P.rect(11 + (y % 4 ? 1 : 0), y, 3, 2, y % 4 ? hr : hD); P.rect(34 - (y % 4 ? 1 : 0), y, 3, 2, y % 4 ? hD : hr); }
        P.rect(11, 44, 3, 2, '#d8263a'); P.rect(34, 44, 3, 2, '#d8263a');   // cintas
        break;
      case 'cap':
        P.rect(12, 14, 3, 7, hr); P.rect(33, 14, 3, 7, hD);
        P.ell(24, 11, 12.5, 7, o.cap, function (x, y) { return y <= 13; });
        P.tint(o.cap, dark(o.cap, 0.8), function (x) { return x > 31; });
        P.rect(11, 13, 26, 2, dark(o.cap, 0.8));
        P.rect(9, 14, 22, 2, dark(o.cap, 0.65));
        P.line(16, 7, 21, 5, light(o.cap, 0.22));
        if (o.capMark) { P.rect(21, 8, 5, 3, o.capMark); P.set(22, 9, dark(o.capMark, 0.7)); }
        break;
      case 'sombrero':   // sombrero de paja de ala ancha
        P.rect(12, 14, 3, 6, hr); P.rect(33, 14, 3, 6, hD);
        P.ell(24, 9, 9, 6, o.hat, function (x, y) { return y <= 12; });
        P.rect(15, 10, 18, 2, o.hatBand);
        P.ell(24, 13, 19, 2.6, dark(o.hat, 0.9)); P.ell(24, 12.5, 18, 1.6, o.hat);
        for (x = 7; x < 42; x += 3) P.set(x, 13, dark(o.hat, 0.75));
        P.line(18, 5, 22, 4, light(o.hat, 0.3));
        break;
      case 'bucket':   // sombrero de pescador
        P.rect(12, 14, 3, 6, hr); P.rect(33, 14, 3, 6, hD);
        P.ell(24, 10, 10.5, 6.5, o.hat, function (x, y) { return y <= 13; });
        P.tint(o.hat, dark(o.hat, 0.85), function (x) { return x > 30; });
        P.rect(13, 11, 22, 2, dark(o.hat, 0.7));
        for (x = 10; x <= 38; x++) { var dd = Math.abs(x - 24) > 11 ? 1 : 0; P.set(x, 13 + dd, dark(o.hat, 0.92)); P.set(x, 14 + dd, dark(o.hat, 0.8)); }
        P.rect(28, 8, 6, 2, '#2a2a30'); P.set(29, 8, '#6a6a7a');   // los lentes de sol sobre el sombrero
        break;
      case 'casco':   // casco de parapente con lentes
        if (o.pony) { P.ell(37, 18, 3, 4, hr); P.line(38, 21, 40, 30, hr); P.line(39, 21, 41, 29, hD); P.line(40, 26, 41, 32, hD); }
        P.rect(12, 15, 3, 6, hr); P.rect(33, 15, 3, 6, hD);
        P.ell(24, 12, 12.8, 9, o.helmet, function (x, y) { return y <= 15; });
        P.tint(o.helmet, dark(o.helmet, 0.8), function (x, y) { return x > 31 || y > 14; });
        P.ell(18, 7, 3, 1.5, light(o.helmet, 0.55));
        P.rect(11, 15, 3, 7, dark(o.helmet, 0.7)); P.rect(34, 15, 3, 7, dark(o.helmet, 0.6));   // orejeras
        P.line(13, 22, 18, 31, '#2a2a30'); P.line(35, 22, 30, 31, '#2a2a30');                  // barbiquejo
        if (o.goggles) { P.rect(15, 11, 18, 3, '#2a2a30'); P.rect(16, 11, 7, 2, '#6ab0d8'); P.rect(25, 11, 7, 2, '#6ab0d8'); P.set(17, 11, '#e0f4ff'); P.set(26, 11, '#e0f4ff'); }
        else P.line(14, 10, 33, 10, light(o.helmet, 0.3));
        break;
    }
    if (o.style !== 'casco' && o.style !== 'perma') { /* flequillo suave */ }

    /* --- cejas --- */
    var bL = 16, bR = 26, by0 = 16, bc = o.zombie && o.style === 'perma' ? '#2a2030' : dark(hr === '#14100e' || hr === '#141210' || hr === '#1e1a1a' ? '#3a3434' : hr, 0.8);
    if (o.old && (hr === '#9a988e' || hr === '#bcb8b0' || hr === '#8c8680')) bc = dark(hr, 0.72);
    if (o.style === 'casco' && o.goggles) by0 = 16;
    if (cara === 'molesta' || cara === 'serio') {
      P.line(bL, by0 - 1, bL + 5, by0 + 1, bc); P.line(bR + 1, by0 + 1, bR + 6, by0 - 1, bc);
      if (cara === 'molesta') { P.set(23, by0 + 1, skDD); P.set(24, by0, skDD); }
    } else if (cara === 'triste') { P.line(bL, by0 + 1, bL + 5, by0 - 1, bc); P.line(bR + 1, by0 - 1, bR + 6, by0 + 1, bc); }
    else if (cara === 'sorpresa') { P.rect(bL, by0 - 2, 6, 1, bc); P.rect(bR + 1, by0 - 2, 6, 1, bc); P.set(bL, by0 - 1, bc); P.set(bR + 6, by0 - 1, bc); }
    else if (cara === 'picaro') { P.rect(bL, by0 - 1, 6, 1, bc); P.line(bR + 1, by0 + 1, bR + 6, by0, bc); }
    else { P.rect(bL, by0, 6, 1, bc); P.rect(bR + 1, by0, 6, 1, bc); }

    /* --- ojos --- */
    var ex = [17, 28], ey = 19;
    var closedArc = cara === 'risa' && ojos === 'abiertos';   // de risa: ojitos en arco ^^
    for (var e = 0; e < 2; e++) {
      var x0 = ex[e], ink = o.zombie ? dark(sk, 0.45) : INK;
      if (ojos === 'cerrados' || closedArc) {
        if (closedArc || cara === 'feliz') { P.rect(x0 + 1, ey, 2, 1, ink); P.set(x0, ey + 1, ink); P.set(x0 + 3, ey + 1, ink); }
        else P.rect(x0, ey + 1, 4, 1, ink);
        continue;
      }
      var half = ojos === 'medio' || (cara === 'picaro' && e === 1) || (cara === 'serio' && o.zombie);
      if (o.zombie) {
        if (half) { P.rect(x0, ey + 1, 4, 2, ZEYE); P.rect(x0, ey, 4, 1, dark(sk, 0.6)); P.set(x0 + (e ? 1 : 2), ey + 1, ZPUP); }
        else { P.rect(x0, ey, 4, 3, ZEYE); P.set(x0 + (e ? 1 : 2), ey + 1, ZPUP); P.rect(x0, ey + 3, 4, 1, '#6a5a5a'); if (cara === 'sorpresa') P.rect(x0, ey - 1, 4, 1, ZEYE); }
        continue;
      }
      if (half) { P.rect(x0, ey + 1, 4, 2, EYE_W); P.rect(x0, ey, 4, 1, skDD); P.rect(x0 + (e ? 1 : 1), ey + 1, 2, 2, INK); continue; }
      P.rect(x0, ey, 4, 3, EYE_W);
      var pxo = cara === 'picaro' ? 2 : (e ? 1 : 1);
      P.rect(x0 + pxo, ey, 2, 3, INK); P.set(x0 + pxo, ey, '#f8f8f0');
      if (cara === 'sorpresa') { P.rect(x0, ey - 1, 4, 1, EYE_W); P.rect(x0 + 1, ey, 2, 2, INK); P.rect(x0 + pxo, ey, 0, 0); }
      if (cara === 'triste') P.set(x0 + (e ? 3 : 0), ey, skDD);
    }
    if (cara === 'triste' && ojos !== 'cerrados' && !o.zombie) { P.set(20, 23, '#8ac8e8'); P.set(20, 24, '#6aa8d8'); }   // lagrimita
    if (o.glasses) {   // lentes de abuelita
      var gc = '#6a5a4a';
      for (e = 0; e < 2; e++) { var gx = ex[e] - 1; P.rect(gx, ey - 1, 6, 1, gc); P.rect(gx, ey + 3, 6, 1, gc); P.rect(gx, ey, 1, 3, gc); P.rect(gx + 5, ey, 1, 3, gc); P.set(gx + 1, ey, '#f8f8f0'); }
      P.rect(22, ey, 4, 1, gc); P.line(14, ey, 12, ey - 1, gc); P.line(33, ey, 35, ey - 1, gc);
    }
    if (o.old) { P.set(15, ey + 2, skDD); P.set(33, ey + 2, skDD); P.line(19, 27, 20, 28, skD); P.line(29, 27, 28, 28, skDD); }

    /* --- nariz, mejillas, barba --- */
    P.set(24, 23, skD); P.set(24, 24, skD); P.set(23, 25, skD); P.set(25, 25, skDD); P.set(24, 25, light(sk, 0.08));
    var smile = cara === 'feliz' || cara === 'risa' || cara === 'picaro';
    if (o.blush && cara !== 'serio' && cara !== 'molesta') { P.rect(15, 25, 3, 1, '#c86a6a'); P.rect(31, 25, 3, 1, '#c86a6a'); }
    else if (smile && !o.zombie) { P.rect(15, 25, 2, 1, dark(sk, 0.9)); P.rect(32, 25, 2, 1, dark(sk, 0.85)); }
    if (o.beard) {
      P.ell(24, 30, 9.5, 5, o.beard, function (x, y) { return y >= 27 && P.get(x, y) && P.get(x, y) !== o.shirt; });
      P.rect(19, 26, 11, 2, o.beard); P.tint(o.beard, dark(o.beard, 0.8), function (x) { return x > 29; });
      P.set(18, 29, light(o.beard, 0.2)); P.set(21, 32, light(o.beard, 0.2));
    }
    if (o.stache) {
      P.rect(20, 27, 9, 2, o.stache);
      if (o.stacheUp) { P.set(19, 26, o.stache); P.set(29, 26, o.stache); P.set(18, 25, o.stache); P.set(30, 25, o.stache); }
      else { P.set(19, 28, o.stache); P.set(29, 28, o.stache); }
      P.set(21, 27, light(o.stache, 0.18));
    }
    if (o.young) { P.set(17, 25, dark(sk, 0.85)); P.set(31, 24, dark(sk, 0.85)); }   // pequitas

    /* --- boca --- */
    var mx = 22, my = 29, mw = 5, lip = o.zombie ? '#4a3a3a' : dark(sk, 0.5);
    if (o.beard || o.stache) my = 30;
    if (boca === 0) {
      if (smile) { P.rect(mx, my, mw, 1, lip); P.set(mx - 1, my - 1, lip); P.set(mx + mw, my - 1, lip); if (cara === 'picaro') P.set(mx - 1, my - 1, skD); }
      else if (cara === 'triste' || cara === 'molesta') { P.rect(mx, my, mw, 1, lip); P.set(mx - 1, my + 1, lip); P.set(mx + mw, my + 1, lip); }
      else if (cara === 'sorpresa') { P.rect(mx + 1, my - 1, 3, 3, '#3a1a20'); P.set(mx + 2, my + 1, '#b85a5a'); }
      else P.rect(mx, my, mw, 1, lip);
    } else {
      var hgt = boca === 1 ? 2 : 4, mw2 = cara === 'sorpresa' ? 3 : mw, mx2 = cara === 'sorpresa' ? mx + 1 : mx;
      if (cara === 'risa' && boca === 2) { mx2 = mx - 1; mw2 = mw + 2; }
      P.rect(mx2, my - 1, mw2, hgt, '#3a1a20');
      P.rect(mx2 + 1, my - 1 + hgt - 1, mw2 - 2, 1, o.zombie ? '#6a4a40' : '#b85a5a');
      if (smile && hgt > 2) P.rect(mx2, my - 1, mw2, 1, '#f0ece0');   // dientes
      if (smile) { P.set(mx2 - 1, my - 2, lip); P.set(mx2 + mw2, my - 2, lip); }
      if (cara === 'molesta' || cara === 'triste') { P.set(mx2 - 1, my + hgt - 1, lip); P.set(mx2 + mw2, my + hgt - 1, lip); }
      if (o.zombie) { P.set(mx2 + 1, my - 1, ZEYE); P.set(mx2 + mw2 - 2, my - 1, ZEYE); }
    }

    /* --- detalles de zombi conocido: rasguño, ojeras --- */
    if (o.zombie) { P.set(31, 15, BLOOD); P.set(32, 16, BLOOD); P.set(30, 17, '#8a3a2a'); P.rect(14, 26, 2, 1, dark(sk, 0.7)); P.rect(17, 22, 4, 1, dark(sk, 0.85)); P.rect(28, 22, 4, 1, dark(sk, 0.8)); }

    P.outline(0.42);
    return P.canvas(2);
  }
  var pcache = {};
  function portraitCached(q, cara, boca, ojos) {
    var k = q + '|' + cara + '|' + boca + '|' + ojos;
    return pcache[k] || (pcache[k] = portrait(q, cara, boca, ojos));
  }
  function normCara(c) { c = ALIAS[c] || c; return CARAS.indexOf(c) >= 0 ? c : 'habla'; }

  // Envuelve ACH.retratos.draw encadenando: los personajes de aquí se dibujan aquí; el resto pasa al envoltorio anterior (Gambetta → Alexander/Titina).
  (function wrapRetratos() {
    var R = ACH.retratos; if (!R || typeof R.draw !== 'function' || R._v013Wrap) return;
    var prev = R.draw;
    R.draw = function (ctx, quien, cara, boca, ojos, t) {
      if (!PJ[quien]) return prev.apply(this, arguments);
      try {
        var b = boca === 1 || boca === 2 ? boca : 0, o = ojos === 'medio' || ojos === 'cerrados' ? ojos : 'abiertos', c = normCara(cara);
        var img = portraitCached(quien, c, b, o), dy = (c === 'sorpresa' && t >= 0 && t < 0.3) ? -Math.round(Math.sin(t / 0.3 * Math.PI) * 2) : 0;
        if (PJ[quien].zombie) dy += Math.round(Math.sin((t || 0) * 3) * 0.6);   // los zombis conocidos se mecen un poquito
        ctx.drawImage(img, 0, dy);
      } catch (e) { /* nunca romper el diálogo */ }
    };
    R._v013Wrap = true;
    R.NOMBRES = R.NOMBRES || {}; for (var k in NOMBRES) R.NOMBRES[k] = NOMBRES[k];
    R.V013 = { ids: IDS, caras: CARAS, portrait: portraitCached, PJ: PJ };
  })();
})();
