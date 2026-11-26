/* ACHORADO v0.15 — js/sprites/hd-barranco.js (Agente D): familias HD de Barranco y de los jefes/especiales de Callao/Cerro.
 * Se carga DESPUÉS de js/sprites/hd-callao.js (la última familia registrada que hace match gana). Notas: diseno/v015-d.md.
 * Marca (sin hornear nada: las perezosas se envuelven):
 *   br.jaranon.<pose>.<f>         Don Jaranón (ACH.sprites.br.pj.jaranon)
 *   br.banda.<guitarrista|cajonero>.<toca|cae>.<f>   banda del tabladillo
 *   br.npc.<id>.<idle|habla>.<f>  sobrevivientes (Tomás, Rosa, Lucía, Lucho, Don Celedonio)
 *   alex.cajon.*                  Alexander con el cajón (familia alex + detalle del cajón)
 *   zvar.br_*                     (ya los marca hd-callao) zombies bohemios: familia zombie + accesorios por tipo, semilla estable por tipo
 *   zvar.presidenta.*             La Presidenta del Comité (cerroArte.presidenta envuelto): HD re-muestreada desde la señora HD + permanente/banda/prendedor
 *   zombie.musico.* / zombie.baile.*   orquesta «Velorio en Clave»: familia zombie + instrumentos
 *   zombie.ventana.cantante.<f>   la cantante de la ventana (fx.cantanteVentana)
 * Red de seguridad: ACH.zvar.frame se envuelve (en load) para marcar cualquier lienzo zvar que llegue sin marca (skins registradas tarde).
 */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var HD = ACH.hd; if (!HD || !HD.toolkit) return;
  var T = HD.toolkit, col = function (h) { return typeof h === 'number' ? h : T.col(h); }, set = T.set, shade = T.shade, mix = T.mix, lum = T.lum, sk = T.skinish;
  var px = ACH.px || {};
  function pxShade(h, f) { return px.shade ? px.shade(h, f) : h; }
  function pxMix(a, b, t) { return px.mix ? px.mix(a, b, t) : a; }
  function rp(b) { return [pxShade(b, 0.42), pxShade(b, 0.7), b, pxMix(b, '#ffffff', 0.34)]; }          // rampa de los zombies de B2c
  function rh(b, k) { return [pxShade(b, 0.5), pxShade(b, 0.76), b, pxMix(b, '#ffffff', k || 0.3)]; }  // rampa de vivos/banda de B2c
  function C(list) { return list.map(col); }
  function S(list) { return set(list); }

  /* ---------------- utilidades HD ---------------- */
  function each(g, st, fn) { var L = g.find(st); for (var i = 0; i < L.length; i++) fn(L[i][0], L[i][1]); return L; }
  function quad(g, x, y, fn) { for (var q = 0; q < 4; q++) { var X = 2 * x + (q & 1), Y = 2 * y + (q >> 1); if (!g.isOutline(X, Y)) fn(X, Y, q); } }
  function bboxOf(L) { var b = { x0: 1e9, y0: 1e9, x1: -1, y1: -1, n: L.length, cx: 0, cy: 0 }; L.forEach(function (p) { if (p[0] < b.x0) b.x0 = p[0]; if (p[0] > b.x1) b.x1 = p[0]; if (p[1] < b.y0) b.y0 = p[1]; if (p[1] > b.y1) b.y1 = p[1]; b.cx += p[0]; b.cy += p[1]; }); if (L.length) { b.cx /= L.length; b.cy /= L.length; } return b; }
  // pinta (X,Y) solo si viene de un píxel 1× del conjunto st y no es contorno
  function on(g, X, Y, st) { return g.in(X, Y) && !g.isOutline(X, Y) && (!st || st[g.at(X >> 1, Y >> 1)]); }
  function put(g, X, Y, c, st) { if (on(g, X, Y, st)) g.set(X, Y, c); }
  function famOf(key) { var f = HD.famFor(key); return f && f.paint ? f : null; }
  var ZFAM = null, AFAM = null;
  function zbase(g, src, info) { if (!ZFAM) ZFAM = famOf('zombie.caminante.walk.0'); if (ZFAM) ZFAM.paint(g, src, info); }
  function abase(g, src, info) { if (!AFAM) AFAM = famOf('alex.bird.walk.down.0'); if (AFAM) AFAM.paint(g, src, info); }

  /* texturas */
  function knit(g, st, dk, li) {           // punto de tejido: «v» en filas pares
    each(g, st, function (x, y) { quad(g, x, y, function (X, Y) { var c = g.get(X, Y); if (Y % 2 === 0 && (X % 2 === 0)) g.set(X, Y, dk ? dk : T.shadowOf(c, 0.86)); else if (li && Y % 2 === 1 && X % 4 === 1) g.set(X, Y, li); }); });
  }
  function weave(g, st) {                  // paja trenzada: ladrillito 2×1 alterno (no damero)
    each(g, st, function (x, y) { quad(g, x, y, function (X, Y) { var c = g.get(X, Y), k = ((X >> 1) + (Y % 2)) % 2; if (k && Y % 2 === 0) g.set(X, Y, T.shadowOf(c, 0.86)); else if (!k && Y % 2 === 1 && X % 3 === 0) g.set(X, Y, T.lightOf(c, 0.12)); }); });
  }
  function grain(g, st, dk, salt) {        // vetas de madera: trazos horizontales cortos
    each(g, st, function (x, y) { quad(g, x, y, function (X, Y) { if (T.hash3(X >> 2, Y, (salt | 0) + 91) < 0.22 && T.hash3(X, Y, salt | 0) < 0.7) g.set(X, Y, dk || T.shadowOf(g.get(X, Y), 0.82)); }); });
  }
  function folds(g, st, every, dk) {      // pliegues verticales finos (guayabera, vestido)
    each(g, st, function (x, y) { quad(g, x, y, function (X, Y) { if ((X + ((Y >> 3) & 1)) % every === 0) g.set(X, Y, dk || T.shadowOf(g.get(X, Y), 0.86)); }); });
  }
  function shine(g, X, Y, c) { put(g, X, Y, c); }
  // gota/brillo redondo sobre un píxel 1× aislado: 2×2 con luz arriba-izquierda
  function gem(g, x, y, base, lite, dark) {
    var X = 2 * x, Y = 2 * y; put(g, X, Y, lite); put(g, X + 1, Y, base); put(g, X, Y + 1, base); put(g, X + 1, Y + 1, dark);
  }
  function hairStrands(g, st, salt) {     // pelo: mechones inclinados + banda de brillo (versión corta del de hd-callao)
    var L = g.find(st); if (!L.length) return;
    var b = bboxOf(L), Y0 = 2 * b.y0;
    L.forEach(function (p) {
      quad(g, p[0], p[1], function (X, Y) {
        var c = g.get(X, Y), ry = Y - Y0, s2 = (X + (Y >> 1) + (salt | 0)) % 4;
        if (ry >= 1 && ry <= 2 && s2 === 1) g.set(X, Y, T.mix(c, col('#7a8aa8'), 0.28));     // brillo frío, sin agrisar
        else if (ry >= 3 && s2 === 0) g.set(X, Y, T.shadowOf(c, 0.7));
      });
    });
  }

  /* =====================================================================================================
     ZOMBIES BOHEMIOS (zvar.br_*): cara de la familia zombie + accesorios propios
     ===================================================================================================== */
  var R_MUST = rp('#c8942a'), R_VIO = rp('#35264a'), R_BURG = rp('#5e1c2c'), R_GRN = rp('#26382e'), R_LILA = rp('#b8a0d8'), R_SMOCK = rp('#cfc09a');
  var R_RED = rp('#c4202c'), R_RED2 = rp('#d8142a'), R_ROSA = rp('#e8382c'), R_WINE = rp('#6a0a14');
  var R_CREAM = ['#8a7f60', '#b8ad8a', '#e2d8b8', '#f6f0d8'], R_WH = ['#6a6c78', '#a4a6b0', '#dcdcda', '#fbfaf2'];
  var R_STRAW = ['#7a6430', '#a88f4c', '#d8c48f', '#efe0aa'], R_PANU = rp('#f4f0e4');
  var WD = ['#5a3416', '#7a4a22', '#b07a45', '#d29a5c'];
  var HAIRS_BR = S(['#0e0c0e', '#241e1f', '#3e3434', '#5a4c46', '#1c120f', '#3a2519', '#5e402b', '#85603f', '#3a3a3a', '#6a6964', '#9a988e', '#c4c1b3']);

  var BOOK_K = col('#3a2418'), BOOK_D = col('#6a3a24'), BOOK_L = col('#f6f0d8'), BOOK_P = col('#e2d8b8');
  function libro(g) {
    var L = g.find(S([BOOK_K, BOOK_D])); if (L.length < 2) return;
    var b = bboxOf(L), y0 = b.y0 - 1, y1 = b.y1, x0 = b.x0, x1 = b.x1;
    if (x1 - x0 < 3) return;
    for (var Y = 2 * y0; Y <= 2 * y1 + 1; Y++) for (var X = 2 * x0; X <= 2 * x1 + 1; X++) {
      var c = g.at(X >> 1, Y >> 1); if (!(c === BOOK_K || c === BOOK_D || c === BOOK_L || c === BOOK_P) || g.isOutline(X, Y)) continue;
      var ry = Y - 2 * y0;
      if (ry === 0) g.set(X, Y, col('#fffbe8'));                                     // canto de las páginas
      else if (Y >= 2 * y1) g.set(X, Y, Y === 2 * y1 ? col('#8a4a2c') : col('#4a2414'));   // tapa de cuero
      else if (X === 2 * x0 + Math.floor((x1 - x0 + 1))) g.set(X, Y, col('#b8a888'));      // lomo central
      else g.set(X, Y, (ry % 2 === 0 && (X % 5) !== 0) ? col('#6a5a48') : col('#efe6c8'));   // renglones
    }
  }
  var CUAD = S(['#b8202c', '#8a1418', '#f2c81c', '#5e0a10']);
  function cuaderno(g) {
    var L = g.find(CUAD); if (L.length < 4) return;
    var b = bboxOf(L);
    L.forEach(function (p) { quad(g, p[0], p[1], function (X, Y) {
      var c = g.at(X >> 1, Y >> 1);
      if (X === 2 * b.x0 + 1 && Y % 2 === 0) g.set(X, Y, col('#d8d8d0'));             // espiral
      else if (X === 2 * b.x0) g.set(X, Y, col('#3a0a10'));
      else if (c === col('#f2c81c')) g.set(X, Y, (Y % 2) ? col('#c89a10') : col('#fff2a0'));   // etiqueta
      else if (Y === 2 * b.y0) g.set(X, Y, col('#e04050'));
    }); });
  }
  function bufanda(g, R, tail) {
    var st = S(R); knit(g, st, col(R[1]), col(R[3]));
    // flecos: las puntas más bajas de la bufanda
    var L = g.find(st); if (!L.length) return;
    var b = bboxOf(L);
    L.forEach(function (p) { if (p[0] <= b.x0 + 1 && p[1] >= b.y1 - 1) quad(g, p[0], p[1], function (X, Y, q) { if (q >= 2 && X % 2) g.set(X, Y, col(R[0])); }); });
  }
  function sombrero(g, R, band) {
    var st = S(R); var L = g.find(st); if (!L.length) return;
    var b = bboxOf(L);
    L.forEach(function (p) { quad(g, p[0], p[1], function (X, Y) {
      if (Y === 2 * b.y0 + 1 && X > 2 * b.x0 + 2 && X < 2 * b.x1 - 2) g.set(X, Y, T.shadowOf(g.get(X, Y), 0.7));   // abolladura de la copa
      else if (p[1] === b.y1 && Y % 2 === 0) g.set(X, Y, T.lightOf(g.get(X, Y), 0.18));                              // ala con luz
    }); });
    if (band) each(g, S([band]), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, q < 2 ? T.lightOf(col(band), 0.12) : T.shadowOf(col(band), 0.75)); }); });
  }
  function boina(g, R, band) {
    var st = S(R); var L = g.find(st); if (!L.length) return;
    var b = bboxOf(L), cx = Math.round(b.cx * 2 + 1);
    knit(g, st, T.shadowOf(col(R[2]), 0.9), null);
    put(g, cx, 2 * b.y0, col(R[3])); put(g, cx + 1, 2 * b.y0, col(R[1]));              // pitoncito
    if (band) each(g, S([band]), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, q < 2 ? col(band) : T.shadowOf(col(band), 0.7)); }); });
  }
  var SPLAT = C(['#e8382c', '#2a62d0', '#f2c81c', '#2aa860', '#e060a8']);
  function salpicado(g) {   // pintura del blusón y de la paleta: goterones redondos con brillo
    SPLAT.forEach(function (c) {
      each(g, S([c]), function (x, y) {
        var X = 2 * x, Y = 2 * y, li = T.lightOf(c, 0.35), dk = T.shadowOf(c, 0.7), r = g.h3(x, y, 7);
        put(g, X, Y, li); put(g, X + 1, Y, c); put(g, X, Y + 1, c); put(g, X + 1, Y + 1, dk);
        if (r < 0.5) put(g, X + 2, Y + 1, c, S(R_SMOCK)); else put(g, X - 1, Y + 2, dk, S(R_SMOCK));   // salpicón que se corre
      });
    });
  }
  function pincel(g) {
    each(g, S(['#a06a36', '#6b4223']), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, (q & 1) ? col('#5a3418') : col('#c08a50')); }); });
    each(g, S(['#c9c5b5']), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, q === 0 ? col('#f2f0e6') : (q === 3 ? col('#7e7a70') : col('#c9c5b5'))); }); });   // virola
  }
  var PALETA = S(['#6a4223', '#8a5a2c', '#b07a45', '#d29a5c']);
  function paleta(g) {
    var L = g.find(PALETA); if (L.length < 4) return;
    var b = bboxOf(L), hx = 2 * b.x0 + 2, hy = Math.round(2 * b.cy + 1);
    put(g, hx, hy, col('#3a2414'), PALETA); put(g, hx + 1, hy, col('#3a2414'), PALETA); put(g, hx, hy + 1, col('#5a3418'), PALETA);   // agujero del pulgar
    grain(g, PALETA, col('#7a4a22'), 3);
  }
  var ZAMP = S(['#d8c070', '#efdc92', '#3a2a14', '#8a6a30', '#6a4a2a']);
  function zampona(g) {
    var L = g.find(S(['#d8c070', '#efdc92'])); if (!L.length) return;
    L.forEach(function (p) { quad(g, p[0], p[1], function (X, Y, q) { g.set(X, Y, (q & 1) ? col('#b89a4c') : col('#fff0b0')); }); });   // caña con luz y separación
    each(g, S(['#3a2a14']), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, q < 2 ? col('#140c06') : col('#6a4a20')); }); });         // boca de cada caña
    each(g, S(['#6a4a2a']), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, (X % 3 === 0) ? col('#e8d8a0') : col('#5a3a1e')); }); }); // amarre tejido
  }
  function andino(g, R) {   // chompa: grecas en zigzag sobre las franjas claras
    var st = S([R[2], R[3]]), base = col(R[2]);
    each(g, S([col(rp('#e8d8a0')[2]), col(rp('#3a6a58')[2])]), function (x, y) {
      var c = g.at(x, y); quad(g, x, y, function (X, Y) { var z = (X + (Y % 2 ? 1 : 0)) % 4; if (z === 0) g.set(X, Y, c === col(rp('#3a6a58')[2]) ? col('#c84a2c') : col('#3a6a58')); });
    });
    void st; void base;
  }
  function guitarraZ(g) {   // la guitarra del músico: roseta, cuerdas, trastes, clavijas
    var W = g.find(S([WD[1], WD[2], WD[3]])); if (W.length < 6) return;
    var hole = g.find(S(['#1a1010'])), N = g.find(S(['#2a1a10', '#4a3220'])), H = g.find(S(['#3a2418']));
    grain(g, S([WD[2], WD[3]]), col('#96602e'), 5);
    hole.forEach(function (p) {
      var X = 2 * p[0], Y = 2 * p[1];
      for (var dy = -2; dy <= 3; dy++) for (var dx = -2; dx <= 3; dx++) {
        var d = Math.max(Math.abs(dx - 0.5), Math.abs(dy - 0.5));
        if (d > 2.4) continue;
        if (d < 1) put(g, X + dx, Y + dy, col('#0a0604')); else if (d < 2) { if (!S(['#1a1010'])[g.at((X + dx) >> 1, (Y + dy) >> 1)]) put(g, X + dx, Y + dy, col('#e8c890')); }
      }
    });
    N.forEach(function (p) { quad(g, p[0], p[1], function (X, Y, q) { g.set(X, Y, q === 0 ? col('#d8c8a4') : ((X + Y) % 4 === 0 ? col('#a8a090') : col('#2a1a10'))); }); });   // cuerda sobre el mástil y trastes
    H.forEach(function (p) { quad(g, p[0], p[1], function (X, Y, q) { if (q === 0 || q === 3) g.set(X, Y, col('#d8d8cc')); }); });                                         // clavijas
  }
  function cajonZ(g) {      // el cajón: tapa con tornillos, vetas y boca
    var L = g.find(S(WD)); if (L.length < 8) return;
    var b = bboxOf(L);
    grain(g, S([WD[2]]), col('#96602e'), 9);
    [[2 * b.x0 + 1, 2 * b.y0 + 1], [2 * b.x1, 2 * b.y0 + 1], [2 * b.x0 + 1, 2 * b.y1], [2 * b.x1, 2 * b.y1]].forEach(function (p) { put(g, p[0], p[1], col('#e8e2d0'), S(WD)); });
    var hx = Math.round(b.cx * 2 + 1), hy = Math.round(b.cy * 2 + 1);
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) if (Math.abs(dx) + Math.abs(dy) < 2) put(g, hx + dx, hy + dy, dy < 0 ? col('#2a1608') : col('#140a04'), S(WD));
  }
  function panueloRojo(g, R) {   // pañuelo rojo al cuello con lunarcitos
    each(g, S([R[1], R[2], R[3]]), function (x, y) { quad(g, x, y, function (X, Y) { if ((X * 3 + Y * 5) % 7 === 0) g.set(X, Y, col('#fbf0e0')); }); });
  }
  function terno(g, R) {         // terno: costura de la solapa y botones
    var L = g.find(S([R[1], R[2], R[3]])); if (!L.length) return;
    var b = bboxOf(L);
    L.forEach(function (p) { quad(g, p[0], p[1], function (X, Y) {
      var e = g.at((X + 1) >> 1, Y >> 1);
      if ((X & 1) && e && !S(R)[e] && Y % 3 !== 2) g.set(X, Y, col(R[3]));        // pespunte junto a la camisa
    }); });
    for (var y = b.y0 + 3; y <= b.y1 - 1; y += 3) { var X0 = Math.round(b.x0 + (b.x1 - b.x0) * 0.6) * 2; put(g, X0, 2 * y, col('#1a0a10'), S(R)); put(g, X0 + 1, 2 * y, col(R[3]), S(R)); }
  }
  function corbata(g) {
    each(g, S([R_RED2[2], R_ROSA[3]]), function (x, y) { quad(g, x, y, function (X, Y) { if ((X + Y) % 3 === 0) g.set(X, Y, col('#ff6a5a')); else if ((X + Y) % 3 === 1) g.set(X, Y, col('#9a0a1a')); }); });
  }
  function rosa(g) {
    each(g, S(['#ff7aa8', '#ff4a88']), function (x, y) {
      var X = 2 * x, Y = 2 * y; put(g, X, Y, col('#ffc0d8')); put(g, X + 1, Y, col('#ff4a88')); put(g, X, Y + 1, col('#d01a5a')); put(g, X + 1, Y + 1, col('#ff7aa8'));
    });
  }
  function corazon(g) {
    each(g, S(['#ff5aa8', '#ffb0d0']), function (x, y) {
      var c = g.at(x, y); quad(g, x, y, function (X, Y, q) {
        var up = !S(['#ff5aa8', '#ffb0d0'])[g.at(x, y - 1)], lf = !S(['#ff5aa8', '#ffb0d0'])[g.at(x - 1, y)];
        if (c === col('#ffb0d0') || (up && lf && q === 0)) g.set(X, Y, col('#ffe0ee'));
        else if (q === 3) g.set(X, Y, col('#d02a78'));
      });
    });
  }
  function flor(g) {   // flor en el pelo de la novia
    each(g, S(['#ffd75a']), function (x, y) { gem(g, x, y, col('#ffd75a'), col('#fff6c0'), col('#c89a20')); });
  }
  function lagrimas(g) {
    each(g, S(['#8fd0f0', '#e0f6ff']), function (x, y) {
      var X = 2 * x, Y = 2 * y; put(g, X, Y, col('#ffffff')); put(g, X + 1, Y, col('#8fd0f0')); put(g, X, Y + 1, col('#5aa8d8')); put(g, X + 1, Y + 1, col('#8fd0f0'));
    });
  }
  function vestido(g) {
    folds(g, S([R_LILA[2]]), 5, col(R_LILA[1]));
    each(g, S([R_RED2[2]]), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, q < 2 ? col('#ff4a5a') : col('#9a0a1a')); }); });   // cinta con lazo
  }
  function chaleco(g) {
    each(g, S([R_BURG[2]]), function (x, y) { quad(g, x, y, function (X, Y) { if (X % 4 === 0 && Y % 6 === 2) g.set(X, Y, col('#e0c060')); }); });   // botoncitos dorados
  }
  function panueloBlanco(g) {
    each(g, S(R_PANU), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, q === 0 ? col('#ffffff') : (q === 3 ? col('#c8c0b0') : col('#f4f0e4'))); if ((X + Y) % 5 === 0) g.set(X, Y, col('#d8142a')); }); });
  }
  function guayabera(g) { folds(g, S([R_CREAM[2], R_CREAM[3]]), 4, col(R_CREAM[1])); }

  var BRZ_ACC = {
    poeta: function (g) { libro(g); bufanda(g, R_MUST); terno(g, R_VIO); },
    poetaRojo: function (g) { cuaderno(g); bufanda(g, R_RED); sombrero(g, R_RED, R_WINE[1]); terno(g, R_GRN); },
    pintor: function (g) { salpicado(g); pincel(g); paleta(g); boina(g, rp('#2a6a78'), rp('#1a4a56')[1]); },
    musico_zampona: function (g) { zampona(g); knit(g, S(rp('#b8452c')), null, col('#e8d8a0')); andino(g, rp('#8a5a3a')); },
    musico_guitarra: function (g) { guitarraZ(g); weave(g, S(R_STRAW)); guayabera(g); },
    musico_cajon: function (g) { cajonZ(g); panueloRojo(g, R_RED); boina(g, rp('#3a3a44'), null); },
    novio: function (g) { terno(g, R_BURG); corbata(g); rosa(g); corazon(g); lagrimas(g); },
    novia: function (g) { vestido(g); flor(g); corazon(g); lagrimas(g); },
    jaranero: function (g) { chaleco(g); panueloBlanco(g); weave(g, S(R_STRAW)); }
  };
  HD.family('br-zombie', {
    match: function (k) { return /^zvar\.br_/.test(k); },
    paint: function (g, src, info) {
      var m = /^zvar\.br_([A-Za-z]+(?:_[a-z]+)?)/.exec(g.key), type = m ? m[1] : '';
      g.seed = (T.hash('br.' + type) + (g.v | 0) * 7919) >>> 0;     // misma semilla en move/declama/toca/mano/despechado: la misma cara
      zbase(g, src, info);
      hairStrands(g, HAIRS_BR, 4);
      if (BRZ_ACC[type]) BRZ_ACC[type](g);
    }
  });

  /* =====================================================================================================
     DON JARANÓN (br.jaranon.*): el mayor cariño
     ===================================================================================================== */
  var JJ = {
    jk: ['#8c8a93', '#bdb9ab', '#e6e2d4', '#fbf8ec'], sh: ['#566680', '#8ea0b8', '#bcd0e4', '#e4f0fa'], tie: ['#3e0a14', '#6e1220', '#a21e2e', '#d4384a'],
    pt: ['#7e7b72', '#aaa798', '#d2cfc0', '#eeebda'], sk: ['#46564a', '#657866', '#8fa088', '#b8c8aa'], hair: ['#0a080c', '#1c1820', '#2e2a34', '#6a7a96'],
    mic: ['#2a2e36', '#5a6270', '#9aa6b4', '#e0e8f0'], shoe: ['#08080a', '#1c1c22', '#34343c', '#6a6a76'], cloth: ['#a8a69a', '#d4d2c6', '#f4f2ea', '#ffffff'], red: ['#6a0e18', '#a41a26', '#d4283a', '#f2584a']
  };
  var J = {}; Object.keys(JJ).forEach(function (k) { J[k] = C(JJ[k]); J[k + 'S'] = set(J[k]); });
  var J_EYE = S(['#a8c860', '#e6f4a0', '#fbffd8', '#2a3418', '#ffffff']), J_MOUTH = col('#2a1214'), J_TEETH = col('#f2eedc'), J_TONG = S(['#8a3a40', '#a84a54', '#b0505c']);
  function jEyes(g) {
    // grupos de ojo: el halo verde-amarillo; el pupilo #2a3418 está al centro abajo
    var P = g.find(S(['#2a3418']));
    P.forEach(function (p) {
      var X = 2 * p[0], Y = 2 * p[1];
      for (var dy = -5; dy <= 4; dy++) for (var dx = -6; dx <= 7; dx++) {
        var XX = X + dx, YY = Y + dy; if (!J_EYE[g.at(XX >> 1, YY >> 1)] || g.isOutline(XX, YY)) continue;
        var ex = dx - 0.5, ey = dy + 0.5, d = Math.sqrt(ex * ex / 1.4 + ey * ey);
        var c = d < 1.3 ? col('#101808') : d < 2.6 ? col('#d8f060') : d < 3.6 ? col('#8aa83a') : d < 4.6 ? col('#f4fbd8') : col('#a8c860');
        g.set(XX, YY, c);
      }
      put(g, X - 2, Y - 2, col('#ffffff')); put(g, X - 1, Y - 2, col('#ffffff')); put(g, X - 2, Y - 1, col('#ffffff'));   // brillo grande
      put(g, X + 1, Y + 1, col('#e8ffb0'));                                                                                  // brillo chico
    });
  }
  function jMouth(g) {
    each(g, S([J_TEETH]), function (x, y) {
      if (g.at(x, y - 1) !== J_MOUTH && g.at(x, y + 1) !== J_MOUTH) return;
      quad(g, x, y, function (X, Y, q) { if (X % 3 === 0) g.set(X, Y, col('#b8b098')); else if (q >= 2) g.set(X, Y, col('#d8d0b8')); });   // dientes separados
    });
    each(g, J_TONG, function (x, y) { quad(g, x, y, function (X, Y, q) { if (q === 0) g.set(X, Y, col('#d07078')); else if (q === 3) g.set(X, Y, col('#7a2a34')); }); });
    // labio inferior: una fila de piel más clara bajo la boca
    each(g, S([J_MOUTH]), function (x, y) { var s2 = g.at(x, y + 1); if (J.skS[s2]) quad(g, x, y + 1, function (X, Y, q) { if (q < 2) g.set(X, Y, col('#7a6a68')); }); });
  }
  function jMustache(g) {   // bigote fino de cantante de peña: la fila de abajo se vuelve punta y la de arriba pelo con brillo
    each(g, S([J.hair[0], J.hair[1]]), function (x, y) {
      var bel = g.at(x, y + 1), abv = g.at(x, y - 1);
      if (!(J.skS[bel] || bel === J_MOUTH) || !J.skS[abv]) return;
      quad(g, x, y, function (X, Y, q) {
        if (q < 2) g.set(X, Y, (X % 3 === 0) ? col('#3a3442') : J.hair[0]);
        else g.set(X, Y, (X % 2) ? J.hair[1] : g.get(X, Y + 1) || J.sk[2]);
      });
    });
  }
  function jHair(g) {       // gomina: vetas peinadas hacia atrás con brillo azulado
    each(g, S([J.hair[1], J.hair[2], J.hair[3]]), function (x, y) {
      quad(g, x, y, function (X, Y) {
        var k = (X * 2 + Y * 3) % 7;
        if (k === 0) g.set(X, Y, col('#4a5670')); else if (k === 3) g.set(X, Y, col('#0e0c12'));
        if (g.at(x, y) === J.hair[3]) g.set(X, Y, (X % 2) ? col('#9aaed0') : col('#6a7a96'));
      });
    });
  }
  function jSuit(g) {
    var jk = J.jkS;
    each(g, jk, function (x, y) {
      var c = g.at(x, y);
      quad(g, x, y, function (X, Y) {
        // trama de lino: hilos muy suaves
        if (c === J.jk[2] && (X * 5 + Y * 3) % 11 === 0) g.set(X, Y, col('#d8d4c4'));
        // pespunte de la solapa: junto a la camisa celeste
        var e = g.at((X + 1) >> 1, Y >> 1), w = g.at((X - 1) >> 1, Y >> 1);
        if ((J.shS[e] || J.shS[w]) && Y % 3 === 0) g.set(X, Y, col('#a8a498'));
      });
    });
    // botones del saco (jk[0] de a 2): con aro y brillo
    each(g, S([J.jk[0]]), function (x, y) {
      var i2 = J.jk[2];
      if (!(g.at(x, y - 1) === i2 && g.at(x, y + 1) === i2 && (g.at(x - 1, y) === i2 || g.at(x - 1, y) === J.jk[0]) && (g.at(x + 1, y) === i2 || g.at(x + 1, y) === J.jk[0]))) return;
      var X = 2 * x, Y = 2 * y; put(g, X, Y, col('#fbf8ec')); put(g, X + 1, Y, col('#6a6872')); put(g, X, Y + 1, col('#6a6872')); put(g, X + 1, Y + 1, col('#3a3842'));
    });
    // camisa celeste: rayita fina
    each(g, J.shS, function (x, y) { quad(g, x, y, function (X, Y) { if (X % 3 === 0) g.set(X, Y, T.shadowOf(g.get(X, Y), 0.9)); }); });
    // corbata: rayas diagonales de regimiento y nudo con brillo
    each(g, J.tieS, function (x, y) { quad(g, x, y, function (X, Y) { var k = (X + Y) % 5; if (k === 0) g.set(X, Y, col('#e8c060')); else if (k === 1) g.set(X, Y, J.tie[0]); }); });
    // pantalón: raya con brillo
    each(g, S([J.pt[1]]), function (x, y) { if (J.ptS[g.at(x - 1, y)] && J.ptS[g.at(x + 1, y)]) quad(g, x, y, function (X, Y, q) { g.set(X, Y, (q & 1) ? J.pt[1] : J.pt[3]); }); });
    // zapatos de charol
    each(g, S([J.shoe[1]]), function (x, y) { if (g.at(x, y - 1) === J.shoe[3]) quad(g, x, y, function (X, Y, q) { if (q < 2 && X % 4 !== 3) g.set(X, Y, col('#8a8a9a')); }); });
    // pañuelos: bordado granate y doblez
    each(g, S([J.cloth[2], J.cloth[3]]), function (x, y) { quad(g, x, y, function (X, Y) { var k = (X * 3 + Y) % 13; if (k === 0) g.set(X, Y, J.red[2]); else if (k === 6) g.set(X, Y, J.cloth[1]); }); });
    // micrófono: rejilla fina y cromo
    var rowN = {}; g.find(J.micS).forEach(function (p) { rowN[p[1]] = (rowN[p[1]] || 0) + 1; });
    each(g, J.micS, function (x, y) {
      if ((rowN[y] || 0) < 5 || y > g.h - 10) {                                        // pedestal: tubo cromado con un hilo de luz
        if (g.at(x, y) === J.mic[2]) quad(g, x, y, function (X, Y, q) { if (q & 1) g.set(X, Y, col('#e8eef6')); });
        return;
      }
      quad(g, x, y, function (X, Y) { var c = g.at(x, y); if (c === J.mic[2] || c === J.mic[3]) { if (Y % 2) g.set(X, Y, col('#6a7484')); } });   // cápsula: rejilla fina
    });
    // costilla del roto
    each(g, S(['#d8d4c0']), function (x, y) { gem(g, x, y, col('#e8e4d0'), col('#ffffff'), col('#a8a490')); });
  }
  function jSkin(g) {       // piel de muerto: puntadas en la mejilla y manchas (relativas al primer ojo)
    var P = g.find(S(['#2a3418'])); if (!P.length) return;
    P.sort(function (a, b) { return a[0] - b[0]; });
    var e = P[0], X0 = 2 * e[0] - 6, Y0 = 2 * e[1] + 6;
    for (var i = 0; i < 6; i++) { put(g, X0 - i, Y0 + (i >> 1), col('#2a2420'), J.skS); if (i % 2 === 0) { put(g, X0 - i, Y0 - 1 + (i >> 1), col('#4a5446'), J.skS); put(g, X0 - i, Y0 + 1 + (i >> 1), col('#4a5446'), J.skS); } }
    each(g, J.skS, function (x, y) { quad(g, x, y, function (X, Y) { var h = T.hash3(X, Y, 1234); if (h < 0.025) g.set(X, Y, col('#5a6a52')); else if (h > 0.985) g.set(X, Y, col('#c8d8b8')); }); });
    // nudillos de las manos: sombra fina en la fila baja de cada mano
    each(g, S([J.sk[1]]), function (x, y) { if (J.shS[g.at(x, y - 3)] || J.shS[g.at(x - 3, y)]) quad(g, x, y, function (X, Y, q) { if (q >= 2 && X % 2) g.set(X, Y, J.sk[0]); }); });
  }
  HD.family('br-jaranon', {
    match: function (k) { return /^br\.jaranon\./.test(k); },
    paint: function (g) { jSuit(g); jHair(g); jMustache(g); jEyes(g); jMouth(g); jSkin(g); }
  });

  /* =====================================================================================================
     BANDA DEL TABLADILLO (br.banda.*) y caras de frente
     ===================================================================================================== */
  var ZSK = C(['#46564a', '#657866', '#8fa088', '#b8c8aa']), ZSKS = set(ZSK), BEYE = col('#e8f0c0'), BPUP = col('#3a4430');
  function frontZEyes(g) {
    each(g, S([BEYE]), function (x, y) {
      if (g.at(x - 1, y) === BEYE || g.at(x, y - 1) === BEYE) return;                 // esquina arriba-izquierda del ojo 2×2
      var X = 2 * x, Y = 2 * y, pr = g.at(x, y + 1) === BPUP ? 0 : 1;                  // pupila en la columna de la izquierda o de la derecha
      for (var dy = 0; dy < 4; dy++) for (var dx = 0; dx < 4; dx++) {
        var c = (dy === 0) ? col('#c8d0a0') : col('#eef4cc');
        if (dy >= 1 && dy <= 2 && (dx === 1 + pr || dx === 2 + pr - 1) && dx === 1 + pr) c = col('#1a2010');
        if (dy === 2 && dx === 2 - pr) c = col('#c03a30');                             // venita roja
        if (dy === 3) c = col('#a8b088');
        put(g, X + dx, Y + dy, c);
      }
      put(g, X + 1 + pr, Y + 1, col('#1a2010')); put(g, X + 1 + pr, Y + 2, col('#3a4a20'));
      for (var k = -1; k <= 4; k++) put(g, X + k, Y - 1, ZSK[0], ZSKS);               // cuenca
    });
  }
  function frontZMouth(g) {
    each(g, S(['#2a1214']), function (x, y) { quad(g, x, y, function (X, Y, q) { if (q < 2 && !S(['#2a1214'])[g.at(x, y - 1)]) g.set(X, Y, (X % 2) ? col('#c8c0a0') : col('#8a8470')); }); });
  }
  var B_HAT = C(rh('#d8c48f')), B_BOINA = C(rh('#3a3a44'));
  var B_WD = set(C(WD));
  function frontGuitar(g) {
    grain(g, B_WD, col('#96602e'), 11);
    each(g, S(['#1a1010']), function (x, y) {
      var X = 2 * x + 1, Y = 2 * y + 1;
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.sqrt(dx * dx + dy * dy); if (d > 4) continue;
        var cc = g.at((X + dx) >> 1, (Y + dy) >> 1); if (!(B_WD[cc] || cc === col('#1a1010'))) continue;
        if (d < 2.2) put(g, X + dx, Y + dy, col('#0a0604')); else if (d < 3.2 && cc !== col('#1a1010')) put(g, X + dx, Y + dy, (Math.round(Math.atan2(dy, dx) * 3) % 2) ? col('#e8c890') : col('#5a8a5a'));
      }
    });
    each(g, S(['#e8dcb8']), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, q < 2 ? col('#fff4d8') : col('#2a1a10')); }); });          // cuerdas
    each(g, S(['#2a1a10', '#4a3220']), function (x, y) { quad(g, x, y, function (X, Y) { if (Y % 4 === 0) g.set(X, Y, col('#d8d0b8')); }); });          // trastes
    each(g, S(['#d8c8a0']), function (x, y) { gem(g, x, y, col('#d8d8cc'), col('#ffffff'), col('#8a8a80')); });                                     // clavijas
  }
  HD.family('br-banda', {
    match: function (k) { return /^br\.banda\./.test(k); },
    paint: function (g) {
      frontZEyes(g); frontZMouth(g);
      weave(g, set(B_HAT)); boina(g, B_BOINA, null);
      each(g, S(['#a02a1c']), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, q < 2 ? col('#d04030') : col('#6a1a10')); }); });   // cinta del sombrero
      panueloRojo(g, C(['#c4202c', '#c4202c', '#c4202c', '#f2584a']).map(T.hex));
      folds(g, set(C(rh('#e2d8b8'))), 4, col('#c8bc98'));
      frontGuitar(g); cajonZ(g);
      each(g, S(['#fff0a0', '#f2e63c', '#fff6a0']), function (x, y) { gem(g, x, y, col('#f2e63c'), col('#ffffff'), col('#c8a020')); });               // marquitas de golpe / estrellas
      each(g, S(['#2a2420']), function (x, y) { if (ZSKS[g.at(x, y - 1)]) quad(g, x, y, function (X, Y, q) { if (q >= 2 && X % 2) g.set(X, Y, g.get(X, Y - 2)); }); });   // bigote fino
    }
  });

  /* =====================================================================================================
     SOBREVIVIENTES (br.npc.*): caras de frente, vivas, y su oficio
     ===================================================================================================== */
  var EYE_K = col('#141010'), WH = col('#ffffff');
  var SURVSK = { tomas: '#9a6a48', rosa: '#b07852', lucia: '#c48f63', lucho: '#d6a67a', celedonio: '#a8704c' };
  var BROW = { tomas: '#d8d8d0', rosa: '#2a1a14', lucia: '#1a1210', lucho: '#1a1210', celedonio: '#d0d0c8' };
  var IRIS = { tomas: '#4a6a7a', rosa: '#3a2014', lucia: '#5a3a1a', lucho: '#2a1a10', celedonio: '#4a3018' };
  function liveEyes(g, id) {
    var R = C(rh(SURVSK[id] || '#b07852', 0.28)), SKS = set(R), skin = R[2], skinD = R[1], brow = col(BROW[id] || '#1a1210'), iris = col(IRIS[id] || '#3a2418');
    // piel limpia: sin el bisel por parches (en caras chicas sale como barba de tres días); se queda el sombreado del arte 1×
    each(g, SKS, function (x, y) { var c0 = g.at(x, y); quad(g, x, y, function (X, Y) { g.set(X, Y, c0); }); });
    var L = g.find(S([EYE_K])); if (!L.length) return;
    var top = Math.min.apply(null, L.map(function (p) { return p[1]; }));
    // ojo abierto: bloque 2×2 (con el brillo blanco arriba-izquierda); parpadeo: tira de 2×1
    var used = {};
    L.forEach(function (p) {
      var x = p[0], y = p[1]; if (y > top + 1 || used[x + ',' + y]) return;
      var isW = g.at(x - 1, y) === WH || g.at(x - 1, y - 1) === WH;
      var x0 = isW ? x - 1 : x;
      if (g.at(x0, y) !== WH && g.at(x0, y) !== EYE_K) return;
      var y0 = g.at(x0, y - 1) === WH || g.at(x0 + 1, y - 1) === EYE_K ? y - 1 : y;
      used[x0 + ',' + y0] = used[(x0 + 1) + ',' + y0] = used[x0 + ',' + (y0 + 1)] = used[(x0 + 1) + ',' + (y0 + 1)] = 1;
      var open = g.at(x0, y0 + 1) === EYE_K || g.at(x0 + 1, y0 + 1) === EYE_K;
      var X = 2 * x0, Y = 2 * y0;
      if (open) {
        var cxf = g.w / 2, out = (x0 + 1 < cxf) ? -1 : 1;
        var row = [[brow === col('#d8d8d0') ? col('#3a2a20') : col('#2a1a14')], [], [], []];
        for (var dx = 0; dx < 4; dx++) {
          put(g, X + dx, Y, col('#2a1a14'));                                                       // pestañas
          var sc = col('#f4f0e6'), inner = out < 0 ? dx >= 1 && dx <= 2 : dx >= 1 && dx <= 2;
          put(g, X + dx, Y + 1, inner ? iris : sc); put(g, X + dx, Y + 2, inner ? (dx === (out < 0 ? 2 : 1) ? col('#0a0606') : iris) : mix(sc, skin, 0.3));
          put(g, X + dx, Y + 3, dx === 0 || dx === 3 ? skinD : T.lightOf(skin, 0.1));              // párpado de abajo
        }
        put(g, X + (out < 0 ? 1 : 2), Y + 1, col('#ffffff'));                                     // brillo
        for (var b = -1; b <= 4; b++) put(g, X + b, Y - 2 - ((b === (out < 0 ? 4 : -1)) ? 1 : 0), brow, SKS);   // ceja con punta hacia afuera
        void row;
      } else {
        for (var d2 = 0; d2 < 4; d2++) { put(g, X + d2, Y, skin); put(g, X + d2, Y + 1, d2 === 0 || d2 === 3 ? skinD : col('#2a1a14')); }
        for (var b2 = 0; b2 <= 3; b2++) put(g, X + b2, Y - 2, brow, SKS);
      }
    });
    // nariz y boca: en la columna central, bajo los ojos
    var cx = Math.round(bboxOf(L).cx * 2 + 1), ny = 2 * top + 5;
    put(g, cx - 1, ny, T.lightOf(skin, 0.22)); put(g, cx, ny + 1, skinD); put(g, cx - 1, ny + 1, skin); put(g, cx + 1, ny + 1, T.shadowOf(skin, 0.86));
    each(g, S(['#7a2a28']), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, q < 2 ? col('#6a2420') : col('#c8706a')); }); });   // labios
    each(g, S(['#5a1a1a']), function (x, y) { quad(g, x, y, function (X, Y, q) { if (q < 2 && g.at(x, y - 1) !== col('#5a1a1a')) g.set(X, Y, col('#f0e8dc')); else g.set(X, Y, col('#3a0e0e')); }); });   // boca abierta con dientes
    each(g, S(['#e8707a']), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, q === 0 ? col('#f0909a') : col('#c85060')); }); });
    each(g, S(['#e08a7a']), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, (q === 1 || q === 2) ? col('#e8988a') : mix(col('#e08a7a'), skin, 0.6)); }); });   // chapitas suaves
  }
  function lentes(g) {
    var F = col('#1c1a22');
    each(g, S([F]), function (x, y) {
      quad(g, x, y, function (X, Y) {
        // la mitad que mira al ojo pasa a ser vidrio
        var toEye = 0; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var c = g.at((X + d[0] * 2) >> 1, (Y + d[1] * 2) >> 1); if (c === EYE_K || c === WH) toEye++; });
        if (toEye) g.set(X, Y, (X + Y) % 5 === 0 ? col('#e8f0f8') : col('#8a9aac'));
      });
    });
  }
  function mostacho(g, hc) {
    var c0 = col(hc[1]);
    each(g, S([c0]), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, q < 2 ? (X % 2 ? col(hc[1]) : col(hc[0])) : (X % 2 ? col(hc[0]) : g.get(X, Y + 1) || col(hc[0]))); }); });
  }
  var SURV_ACC = {
    tomas: function (g) {
      knit(g, set(C(rh('#2a4a6a'))), null, null);                                                           // chompa marinera
      weave(g, set(C(rh('#d8c88a'))));                                                                     // gorro de pescador
      each(g, S(['#f2f0e8', '#d0d0c8', '#b8b8b0', '#e8e8e0']), function (x, y) { quad(g, x, y, function (X, Y) { if (Y % 3 === 2 && (X + ((Y / 3) | 0)) % 3 === 0) g.set(X, Y, col('#b8b8b0')); else if (Y % 3 === 0 && X % 4 === 1) g.set(X, Y, col('#ffffff')); }); });   // barba rizada
      each(g, S(['#a8b8c8', '#c0ccd8', '#8898a8', '#d8dce0']), function (x, y) { quad(g, x, y, function (X, Y) { if (Y % 2 === 0 && (X + (Y % 4 ? 2 : 0)) % 4 === 0) g.set(X, Y, col('#6a7a8a')); else if (Y % 4 === 1 && X % 4 === 2) g.set(X, Y, col('#e8f0f8')); }); });   // escamas del pescado
      each(g, S(['#2a62d0']), function (x, y) { quad(g, x, y, function (X, Y) { if (Y % 4 === 0) g.set(X, Y, col('#1a4aa8')); }); });   // balde con aros
      each(g, S(['#1a1a1e']), function (x, y) { if (g.at(x, y - 1) === col('#4a4a52')) quad(g, x, y, function (X, Y, q) { if (q < 2 && X % 3) g.set(X, Y, col('#4a4a58')); }); });   // botas de jebe: brillo en la caña
    },
    rosa: function (g) {
      each(g, S(['#fbf8ec']), function (x, y) { if (S(rh('#c42a30'))[g.at(x + 1, y)] || S(rh('#c42a30'))[g.at(x - 1, y)]) gem(g, x, y, col('#f4f0e0'), col('#ffffff'), col('#c8b8a8')); });   // lunares
      each(g, S(['#8a1c20', '#d8484c', '#3a2418']), function (x, y) { quad(g, x, y, function (X, Y) { if (T.hash3(X, Y, 77) < 0.06) g.set(X, Y, col('#5a1410')); }); });   // manchas de anticucho
      each(g, S(['#c8a062', '#e8c88a', '#8a6a30']), function (x, y) { quad(g, x, y, function (X, Y) { if (X % 2 === 0) g.set(X, Y, col('#a88048')); }); });   // cartón corrugado
      each(g, S(['#8a4a24', '#c0763a']), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, q === 0 ? col('#e0904a') : ((X + Y) % 3 === 0 ? col('#2a1408') : col('#8a4a24'))); }); });   // carne con marcas de parrilla
      each(g, S(['#1c1414', '#2a2420']), function (x, y) { quad(g, x, y, function (X, Y) { if ((Y + (X % 2) * 2) % 4 === 0) g.set(X, Y, col('#4a3a34')); }); });   // trenza
    },
    lucia: function (g) {
      lentes(g);
      boina(g, rh('#2a6a50'), null);
      knit(g, set(C(rh('#c8942a'))), null, null);                                                           // bufanda mostaza
      hairStrands(g, set(C(rh('#14100e'))), 2);
      each(g, S(['#f2c81c', '#ffe870']), function (x, y) { quad(g, x, y, function (X, Y, q) { if (q & 1) g.set(X, Y, col('#c89a10')); }); });   // lápiz facetado
      each(g, S(['#e888a8']), function (x, y) { gem(g, x, y, col('#e888a8'), col('#ffc0d0'), col('#a84868')); });
    },
    lucho: function (g) {
      mostacho(g, ['#14100e', '#2a2420']);
      each(g, S(['#c8a850']), function (x, y) { gem(g, x, y, col('#e0c060'), col('#fff0a0'), col('#8a6a20')); });   // botones dorados
      each(g, S(['#d8142a', '#f2584a']), function (x, y) { var up = !S(['#d8142a', '#f2584a'])[g.at(x, y - 1)], dn = !S(['#d8142a', '#f2584a'])[g.at(x, y + 1)];
        quad(g, x, y, function (X, Y, q) { g.set(X, Y, (up && q < 2) ? col('#ff7a6a') : ((dn && q >= 2) ? col('#8a0a1a') : col('#d8142a'))); }); });   // corbatín
      each(g, S(['#b8c4d0', '#f2f6fa', '#6a7480', '#8a96a2']), function (x, y) { quad(g, x, y, function (X, Y) { var k = X % 4; if (k === 0) g.set(X, Y, col('#ffffff')); else if (k === 3) g.set(X, Y, col('#5a6470')); }); });   // coctelera de acero
      each(g, S(['#e8dcb0']), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, q < 2 ? col('#f8f0d0') : col('#c8102a')); }); });   // etiqueta de la botella
      each(g, S(['#1c6a34']), function (x, y) { quad(g, x, y, function (X, Y) { if (X % 3 === 0 && Y % 2) g.set(X, Y, col('#3aa858')); }); });
    },
    celedonio: function (g) {
      mostacho(g, ['#c8c8c0', '#e8e8e2']);
      weave(g, set(C(rh('#d8c48f'))));
      each(g, S(['#a02a1c']), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, q < 2 ? col('#d04030') : col('#6a1a10')); }); });
      folds(g, set(C(rh('#e8dcb8'))), 4, col('#c8bc98'));                                                     // guayabera
      frontGuitar(g);
    }
  };
  HD.family('br-vivo', {
    match: function (k) { return /^br\.npc\./.test(k); },
    paint: function (g) {
      var m = /^br\.npc\.(\w+)/.exec(g.key), id = m ? m[1] : '';
      liveEyes(g, id);
      if (SURV_ACC[id]) SURV_ACC[id](g);
    }
  });

  /* =====================================================================================================
     ALEXANDER CON EL CAJÓN (alex.cajon.*): Alexander de siempre + cajón con tornillos, vetas y boca
     ===================================================================================================== */
  var AWD = C(['#4a2a12', '#7a4a22', '#b07a45', '#dcaa6a']), AWDS = set(AWD), AHOLE = col('#1a0e06');
  HD.family('br-alexCajon', {
    match: function (k) { return /^alex\.cajon\./.test(k); },
    paint: function (g, src, info) {
      abase(g, src, info);
      var L = g.find(AWDS); if (L.length < 6) return;
      var b = bboxOf(L);
      grain(g, set([AWD[2]]), col('#8a5a2c'), 13);
      [[2 * b.x0 + 1, 2 * b.y0 + 1], [2 * b.x1, 2 * b.y0 + 1], [2 * b.x0 + 1, 2 * b.y1], [2 * b.x1, 2 * b.y1]].forEach(function (p) { put(g, p[0], p[1], col('#f0e8d0'), AWDS); });
      each(g, S([AHOLE]), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, q === 0 ? col('#4a2a12') : col('#0a0604')); }); });
    }
  });

  /* =====================================================================================================
     CALLAO / CERRO: la Presidenta, la orquesta, la cantante de la ventana
     ===================================================================================================== */
  // La Presidenta se hornea escalando la señora 1,25× con suavizado (borrosa en 1×): su HD se re-muestrea desde la HD de la señora
  // (vecino más cercano) y se le pinta encima, en HD, la permanente, la banda y el prendedor. Mismo rect, misma huella aproximada.
  var PRES_HAIR = C(['#2a2030', '#3a2e44', '#4c405a']);
  HD.family('presidenta', {
    match: function (k) { return /^zvar\.presidenta\./.test(k); },
    paint: function (g, src, info) {
      var s = info && info.src; if (!s || !s.__hd) return;
      var e = HD.src(s); if (!e) return;
      var id; try { id = e.img.getContext('2d').getImageData(e.sx, e.sy, e.w, e.h).data; } catch (er) { return; }
      var W = g.W, H = g.H, d = g.d, sc = (src.width / s.width) || 1.25, sx, sy, i, top = -1, xs = 0, xn = 0;
      for (var Y = 0; Y < H; Y++) for (var X = 0; X < W; X++) {
        sx = Math.floor((X + 0.5) / sc); sy = Math.floor((Y + 0.5) / sc);
        if (sx >= e.w || sy >= e.h) { d[Y * W + X] = 0; continue; }
        i = (sy * e.w + sx) * 4;
        d[Y * W + X] = id[i + 3] > 127 ? T.pack(id[i], id[i + 1], id[i + 2], 255) : 0;
      }
      if (!info.dress) { presFit(g); return; }
      for (Y = 0; Y < H && top < 0; Y++) for (X = 0; X < W; X++) if (d[Y * W + X]) { top = Y; break; }
      if (top < 0) return;
      for (Y = top; Y < top + 8; Y++) for (X = 0; X < W; X++) if (d[Y * W + X]) { xs += X; xn++; }
      var cx = Math.round(xs / Math.max(1, xn));
      function P(X2, Y2, c, over) { if (X2 < 0 || Y2 < 0 || X2 >= W || Y2 >= H) return; if (!over && !d[Y2 * W + X2]) return; d[Y2 * W + X2] = c; }
      // permanente: rulos redondos con brillo, un poco más arriba y ancha que la cabeza
      [[-10, 2], [-6, -2], [-2, -4], [2, -4], [6, -2], [10, 2], [-12, 6], [12, 6], [-4, 0], [4, 0]].forEach(function (q, k) {
        var ox = cx + q[0], oy = top + q[1] + 1;
        for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) {
          if (dx * dx + dy * dy > 5) continue;
          var c = (dx + dy <= -2) ? PRES_HAIR[2] : (dx + dy >= 2 ? col('#1a1420') : PRES_HAIR[k % 2]);
          P(ox + dx, oy + dy, c, dy < 0);
        }
        P(ox - 1, oy - 1, col('#6a5a7a'), false);
      });
      // banda roja y blanca de presidenta: de un hombro a la cadera, con ribete blanco y flequito dorado
      for (var t = 0; t <= 26; t++) {
        var bx = cx - 12 + t, by = top + 24 + t;
        for (var w = 0; w < 5; w++) P(bx, by + w, w === 0 ? col('#f2f2f2') : (w === 4 ? col('#7a0e1e') : (w === 2 ? col('#f2f2f2') : col('#c81e30'))), false);
      }
      // prendedor dorado con brillo
      for (var dy2 = 0; dy2 < 6; dy2++) for (var dx2 = 0; dx2 < 6; dx2++) { var r2 = (dx2 - 2.5) * (dx2 - 2.5) + (dy2 - 2.5) * (dy2 - 2.5); if (r2 < 7) P(cx - 7 + dx2, top + 25 + dy2, r2 < 2 ? col('#fff2b0') : (dx2 + dy2 > 6 ? col('#a87a18') : col('#e0b030')), false); }
      P(cx - 6, top + 26, col('#ffffff'), false);
      presFit(g);
    }
  });
  // F6: la HD re-muestreada (y la permanente) se recorta/rellena a la silueta 1× al doble: misma huella exacta que el 1×.
  // Lo que sobra se borra; lo que falta toma el vecino HD más cercano (o el relleno 1×) y el borde lleva su contorno oscuro.
  function presFit(g) {
    var W = g.W, H = g.H, d = g.d, X, Y, i, k, fill = [];
    for (Y = 0; Y < H; Y++) for (X = 0; X < W; X++) {
      i = Y * W + X;
      if (!g.in(X, Y)) { d[i] = 0; continue; }
      if (!d[i]) fill.push(i);
    }
    var NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1], [2, 0], [-2, 0], [0, 2], [0, -2]];
    fill.forEach(function (j) {
      var x = j % W, y = (j / W) | 0, c = 0;
      for (k = 0; k < NB.length && !c; k++) { var xx = x + NB[k][0], yy = y + NB[k][1]; if (xx >= 0 && yy >= 0 && xx < W && yy < H) c = d[yy * W + xx]; }
      if (!c) c = g.fillAt(x >> 1, y >> 1);
      var out = !g.in(x - 1, y) || !g.in(x + 1, y) || !g.in(x, y - 1) || !g.in(x, y + 1);
      d[j] = c ? (out ? T.deep(c) : c) : col('#2a2430');
    });
  }

  var RAMPS = px.RAMPS || {}, METAL = set(C(RAMPS.metal || [])), GOLD = set(C(RAMPS.curbYellow || []));
  HD.family('zombie-orquesta', {
    match: function (k) { return /^zombie\.(musico|baile|ventana)\./.test(k); },
    paint: function (g, src, info) {
      zbase(g, src, info);
      // metal (timbales, aros, válvulas): reflejos verticales; dorado (trompeta, cencerro): brillo y sombra fina
      each(g, METAL, function (x, y) { quad(g, x, y, function (X, Y) { var k = X % 5; if (k === 0) g.set(X, Y, col('#f0f2ec')); else if (k === 3) g.set(X, Y, T.shadowOf(g.get(X, Y), 0.8)); }); });
      each(g, GOLD, function (x, y) { quad(g, x, y, function (X, Y, q) { if (q === 0 && (X % 3 === 0)) g.set(X, Y, col('#fff6c8')); else if (q === 3) g.set(X, Y, T.shadowOf(g.get(X, Y), 0.82)); }); });
      // parches de tambor: trama de cuero
      each(g, S(['#e8e2d2', '#efe3a8']), function (x, y) { quad(g, x, y, function (X, Y) { if ((X * 3 + Y * 7) % 9 === 0) g.set(X, Y, T.shadowOf(g.get(X, Y), 0.9)); }); });
      // congas: duelas de madera
      each(g, S(['#8a2a2c', '#c0392b', '#6b4223', '#a86e38', '#2f4470', '#4a6498']), function (x, y) { quad(g, x, y, function (X, Y) { if (X % 3 === 0) g.set(X, Y, T.shadowOf(g.get(X, Y), 0.8)); }); });
      // bajo eléctrico: cuerpo sunburst con brillo; cuerdas
      each(g, S(['#c9601a', '#e9822f', '#a84a22']), function (x, y) { quad(g, x, y, function (X, Y, q) { if (q === 0 && (X + Y) % 4 === 0) g.set(X, Y, col('#ffc070')); }); });
      each(g, S(['#a86e38', '#6b4223']), function (x, y) { quad(g, x, y, function (X, Y, q) { if (q === 0) g.set(X, Y, col('#e0d8c0')); }); });
      // lentejuelas y notitas que brillan
      each(g, S(['#e8a6d6', '#ffffff']), function (x, y) { if (S(['#8a3a7a', '#7a2f6a', '#9a4a8a', '#4a1a42'])[g.at(x + 1, y)] || S(['#8a3a7a', '#7a2f6a'])[g.at(x - 1, y)]) gem(g, x, y, col('#f0b8e0'), col('#ffffff'), col('#a05a90')); });
      each(g, S(['#f2e63c']), function (x, y) { gem(g, x, y, col('#f2e63c'), col('#ffffb0'), col('#b8a020')); });
      // flores de la camisa del bailarín
      each(g, S(['#f3efe2']), function (x, y) { if (S(['#c9501a'])[g.at(x, y + 1)] || S(['#c9501a'])[g.at(x + 1, y)]) gem(g, x, y, col('#f3efe2'), col('#ffffff'), col('#e8a040')); });
    }
  });

  /* =====================================================================================================
     MARCADO
     ===================================================================================================== */
  function isCv(o) { return o && typeof o === 'object' && o.getContext && typeof o.width === 'number'; }
  // marca obj[k] con prefijo sin hornearlo: si es perezosa (getter), se envuelve y se marca al hornearse
  function tagKey(obj, k, prefix) {
    if (!obj) return;
    var d = Object.getOwnPropertyDescriptor(obj, k); if (!d) return;
    if (d.get) {
      if (d.get.__hdD || !d.configurable) return;
      var og = d.get, os = d.set;
      var ng = function () { var v = og.call(this); try { if (v && typeof v === 'object') HD.tagTree(v, prefix); } catch (e) { /* nada */ } return v; };
      ng.__hdD = true;
      try { Object.defineProperty(obj, k, { get: ng, set: os, enumerable: d.enumerable, configurable: true }); } catch (e) { /* nada */ }
    } else if (d.value && typeof d.value === 'object') HD.tagTree(d.value, prefix);
  }
  function tagPres(e) {
    if (!e || e.__hdPres) return e;
    var Z = ACH.sprites && ACH.sprites.zvar, B = Z && (Z.senoraOlla_normal_olla || null);
    if (!B && ACH.sprites && ACH.sprites.senoraList && ACH.sprites.senoraList.olla && ACH.sprites.senoraList.olla.length) { var L0 = ACH.sprites.senoraList.olla[0]; B = Z[typeof L0 === 'string' ? L0 : L0.skin]; }
    function arr(a) { return Array.isArray(a) ? a : a ? [a] : []; }
    ['move', 'windup', 'attack'].forEach(function (k) { arr(e[k]).forEach(function (c, i) { if (isCv(c)) HD.tag(c, 'zvar.presidenta.' + k + '.' + i, { src: B && arr(B[k])[i], dress: true }); }); });
    ['hurt', 'hurtWindup', 'hurtAttack'].forEach(function (k) { arr(e[k]).forEach(function (c, i) { if (isCv(c)) HD.tag(c, 'zvar.presidenta.' + k + '.' + i, { src: B && arr(B[k])[i], dress: false }); }); });
    if (isCv(e.dead)) HD.tag(e.dead, 'zvar.presidenta.dead', { src: B && arr(B.dead)[0], dress: false });
    try { Object.defineProperty(e, '__hdPres', { value: true }); } catch (er) { /* nada */ }
    return e;
  }
  function wrapPres() {
    var A = ACH.cerroArte; if (!A || typeof A.presidenta !== 'function' || A.presidenta.__hdD) return;
    var f = A.presidenta, w = function () { var r = f.apply(this, arguments); try { tagPres(r); } catch (e) { /* nada */ } return r; };
    w.__hdD = true; A.presidenta = w;
    var Z = ACH.sprites && ACH.sprites.zvar; if (Z && Z.presidenta) tagPres(Z.presidenta);
  }
  // red de seguridad: cualquier cuadro zvar que se dibuje sin marca (skin registrada después de la carga) se marca al vuelo
  function wrapFrame() {
    var Zv = ACH.zvar; if (!Zv || typeof Zv.frame !== 'function' || Zv.frame.__hdD) return;
    var f = Zv.frame, w = function (z) {
      var c = f.apply(this, arguments);
      if (c && !c.__hd && z && z.skin && c.width > 0) {
        if (z.skin === 'presidenta') { var P = ACH.sprites && ACH.sprites.zvar && ACH.sprites.zvar.presidenta; if (P) tagPres(P); }
        if (!c.__hd) HD.tag(c, 'zvar.' + z.skin + '.f');
      }
      return c;
    };
    w.__hdD = true; for (var k in f) if (Object.prototype.hasOwnProperty.call(f, k)) w[k] = f[k];
    Zv.frame = w;
  }
  function tagAll() {
    var SP = ACH.sprites || {}, PJ = SP.br && SP.br.pj;
    if (PJ) {
      tagKey(PJ, 'jaranon', 'br.jaranon');
      tagKey(PJ, 'guitarristaZ', 'br.banda.guitarrista');
      tagKey(PJ, 'cajoneroZ', 'br.banda.cajonero');
      if (PJ.npc) HD.tagTree(PJ.npc, 'br.npc');
      if (PJ.alex && PJ.alex.cajon) HD.tagTree(PJ.alex.cajon, 'alex.cajon');
    }
    if (SP.fx && SP.fx.cantanteVentana) HD.tagTree(SP.fx.cantanteVentana, 'zombie.ventana.cantante');
    wrapPres(); wrapFrame();
  }
  tagAll();
  window.addEventListener('load', function () { tagAll(); setTimeout(tagAll, 1500); });
  ACH.hdBarranco = { tagAll: tagAll, tagPres: tagPres };
})();
