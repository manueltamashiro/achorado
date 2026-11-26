/* ACHORADO v0.15 — js/sprites/hd-mira-cv.js (Agente C): personajes HD de Miraflores (Parque Kennedy) y Costa Verde.
 * Se carga después de js/sprites/hd-callao.js (las familias registradas aquí ganan sobre las genéricas de Callao).
 * Notas: diseno/v015-c.md.  No cambia jugabilidad: solo marca lienzos (ACH.hd.tag/tagTree/wrapFn) y registra pintores de detalle.
 */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var HD = ACH.hd; if (!HD) return;
  var T = HD.toolkit, col = T.col, set = T.set;

  /* =====================================================================================================
     UTILIDADES
     ===================================================================================================== */
  var sh = T.shadowOf, li = T.lightOf, mix = T.mix, lum = T.lum, sk = T.skinish, deep = T.deep, h3 = T.hash3;
  // familias de Callao que se reutilizan como base (capturadas ANTES de registrar las propias)
  var ZF = HD.famFor('zvar.x', {}), HF = HD.famFor('npc.v011.x', {}), AF = HD.famFor('npc.perro.idle.0', {});
  function each(g, S, fn) { var L = g.find(S); for (var i = 0; i < L.length; i++) fn(L[i][0], L[i][1]); return L; }
  function quad(g, x, y, fn) { for (var q = 0; q < 4; q++) { var X = 2 * x + (q & 1), Y = 2 * y + (q >> 1); if (!g.isOutline(X, Y)) fn(X, Y, q); } }
  function bboxOf(L) { var b = { x0: 1e9, y0: 1e9, x1: -1, y1: -1, n: L.length, cx: 0, cy: 0 }; L.forEach(function (p) { if (p[0] < b.x0) b.x0 = p[0]; if (p[0] > b.x1) b.x1 = p[0]; if (p[1] < b.y0) b.y0 = p[1]; if (p[1] > b.y1) b.y1 = p[1]; b.cx += p[0]; b.cy += p[1]; }); if (L.length) { b.cx /= L.length; b.cy /= L.length; } return b; }
  function S2(list) { return set(list); }
  function put(g, X, Y, c, S) { if (g.isOutline(X, Y)) return; if (S && !S[g.at(X >> 1, Y >> 1)]) return; g.set(X, Y, c); }
  var ZSK = S2(['#3f4a44', '#5f6b55', '#7f8c71', '#a3ad8a', '#3a3f46', '#575d66', '#7a8189', '#a2a8aa', '#4d4543', '#736760', '#9a8d7d', '#c2b7a0',
    '#47432f', '#6b663c', '#948a52', '#bab172', '#38343f', '#524c5e', '#736d7c', '#989299', '#38292a', '#573f35', '#7a5a45', '#9f7d62', '#8a9a7c']);
  var HAIR = S2(['#0e0c0e', '#241e1f', '#3e3434', '#5a4c46', '#1c120f', '#3a2519', '#5e402b', '#85603f', '#3a3a3a', '#6a6964',
    '#4a3c20', '#7a6636', '#a88f4c', '#cdb468', '#3a1812', '#6a2c1c', '#984628', '#c4683a', '#796e67', '#3a2a26', '#291d1d', '#3e3e44', '#26262a']);
  var ZEYE = S2(['#eef0d2', '#e9ecd5', '#e8e4cc']);
  function zskin(c) { return !!(c && (ZSK[c] || sk(c))); }
  // ojo de zombi visible (el más alto), o null
  function eyeOf(g) {
    var L = g.find(ZEYE).filter(function (p) { return zskin(g.at(p[0] - 1, p[1])) || zskin(g.at(p[0], p[1] + 1)) || zskin(g.at(p[0] + 1, p[1])); });
    if (!L.length) return null;
    L.sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
    return { x: L[0][0], y: L[0][1] };
  }

  /* ---------- pelo: mechones inclinados, brillo arriba, puntas abajo ---------- */
  function hair(g, HS, yMax, dir) {
    var L = g.find(HS).filter(function (p) { return p[1] <= yMax; }); if (L.length < 3) return;
    var b = bboxOf(L), Y0 = 2 * b.y0; dir = dir || 1;
    L.forEach(function (p) {
      var x = p[0], y = p[1], c = g.at(x, y), below = g.at(x, y + 1), face = below && !HS[below] && zskin(below);
      var lt = li(c, 0.28), md = li(c, 0.12), dk = sh(c, 0.62);
      quad(g, x, y, function (X, Y, q) {
        var ry = Y - Y0, st = ((X * dir + (Y >> 1)) % 4 + 4) % 4;
        if (ry <= 2 && st === 1) g.set(X, Y, lt);
        else if (ry <= 3 && st === 2) g.set(X, Y, md);
        else if (ry > 3 && st === 0) g.set(X, Y, dk);
        if (face && q >= 2) g.set(X, Y, (X % 3 === 0) ? below : sh(c, 0.8));
      });
    });
  }
  /* ---------- perfil (los zvar miran a la derecha): nariz, oreja, labio ---------- */
  function profile(g, e) {
    if (!e) return;
    // nariz: la piel más adelantada en la fila del ojo o la de abajo
    for (var r = 0; r <= 1; r++) {
      var y = e.y + r, xs = -1;
      for (var x = g.w - 1; x > e.x; x--) if (zskin(g.at(x, y)) && !g.edge(x, y)) { xs = x; break; }
      if (xs > 0) { var c = g.at(xs, y); put(g, 2 * xs + 1, 2 * y, li(c, 0.22)); put(g, 2 * xs, 2 * y + 1, sh(c, 0.72)); break; }
    }
    // oreja: la piel más atrás de la cabeza en la fila del ojo
    for (var x2 = 0; x2 < e.x - 1; x2++) {
      var c2 = g.at(x2, e.y);
      if (zskin(c2) && !g.edge(x2, e.y)) {
        var X = 2 * x2 + 1, Y = 2 * e.y;
        put(g, X, Y, li(c2, 0.18)); put(g, X + 1, Y, sh(c2, 0.62)); put(g, X + 1, Y + 1, sh(c2, 0.7)); put(g, X, Y + 1, sh(c2, 0.82));
        break;
      }
    }
  }
  /* ---------- ropa: bastas/costuras entre prendas, pliegues estables, suela ---------- */
  function clothes(g, yTop, salt) {
    var bb = g.bbox(); salt = salt || 0;
    for (var y = Math.max(yTop, bb.y0); y <= bb.y1; y++) for (var x = bb.x0; x <= bb.x1; x++) {
      var c = g.at(x, y); if (!c || g.edge(x, y) || zskin(c) || T.isInk(c) || lum(c) < 34) continue;
      var s = g.at(x, y + 1), n = g.at(x, y - 1);
      // costura/basta: abajo otra prenda bien distinta
      if (s && !T.isInk(s) && !g.edge(x, y + 1) && T.dist(s, c) > 2600) quad(g, x, y, function (X, Y, q) { if (q >= 2) g.set(X, Y, sh(c, 0.74)); });
      // pliegue: trazo diagonal corto, anclado a la fila (estable entre cuadros)
      else if (n === c && s === c && h3(x * 3 + salt, y - yTop, 11) < 0.16) { put(g, 2 * x + 1, 2 * y, sh(c, 0.84)); put(g, 2 * x, 2 * y + 1, sh(c, 0.84)); }
      else if (n === c && h3(x + salt, y - yTop, 23) < 0.08) put(g, 2 * x, 2 * y, li(c, 0.12));
    }
    // suela: la última fila opaca de cada columna (zapato) se divide en empeine + suela
    for (var x3 = bb.x0; x3 <= bb.x1; x3++) {
      for (var y3 = bb.y1; y3 >= bb.y1 - 3; y3--) {
        var c3 = g.at(x3, y3); if (!c3) continue; if (g.edge(x3, y3) && !g.op(x3, y3 - 1)) continue;
        if (g.edge(x3, y3)) continue;
        if (zskin(c3)) { put(g, 2 * x3 + (x3 & 1), 2 * y3 + 1, sh(c3, 0.7)); break; }   // pie descalzo: dedos
        put(g, 2 * x3, 2 * y3 + 1, lum(c3) < 60 ? li(c3, 0.3) : sh(c3, 0.6)); put(g, 2 * x3 + 1, 2 * y3 + 1, lum(c3) < 60 ? li(c3, 0.22) : sh(c3, 0.6));
        if (h3(x3, 0, 5) < 0.5) put(g, 2 * x3 + 1, 2 * y3 - 1, li(c3, 0.4));                // cordón / brillo del empeine
        break;
      }
    }
  }
  // fotocheck (credencial) en el pecho: marca de los trabajadores
  function badge(g, e, w) {
    if (!e) return;
    for (var dy = 4; dy <= 6; dy++) {
      var y = e.y + dy, best = -1;
      for (var x = e.x - 1; x >= 1; x--) { var c = g.at(x, y), c2 = g.at(x - 1, y); if (c && c2 && !zskin(c) && !zskin(c2) && !T.isInk(c) && !g.edge(x, y) && !g.edge(x - 1, y) && lum(c) > 20) { best = x; break; } }
      if (best > 0) {
        var X = 2 * best - 1, Y = 2 * y;
        g.set(X, Y - 1, col('#3a5a8a'));                                   // clip
        g.set(X, Y, col('#f4f2e8')); g.set(X + 1, Y, col('#f4f2e8')); g.set(X, Y + 1, w || col('#c84a3a')); g.set(X + 1, Y + 1, col('#d8d4c8'));
        return;
      }
    }
  }
  function glint(g, S, c) { var L = g.find(S); if (!L.length) return; var b = bboxOf(L); put(g, 2 * b.x0 + 1, 2 * b.y0 + 1, c || col('#ffffff'), S); }
  // franja reflectante que brilla a trechos
  function shimmer(g, S, c1, c2) { each(g, S, function (x, y) { quad(g, x, y, function (X, Y) { var k = (X + Y) % 5; if (k === 0) g.set(X, Y, c1); else if (k === 3) g.set(X, Y, c2); }); }); }

  /* =====================================================================================================
     ZOMBIS DE MIRAFLORES Y COSTA VERDE (zvar.trab_* · mira_* · cv_*): base de Callao + perfil, pelo, ropa y accesorios por tipo
     ===================================================================================================== */
  var ACC = {
    trab: function (g, e) { badge(g, e); },
    cv_surfista: function (g, e) {
      var BRD = S2(['#9af0ea', '#2ed0d0', '#0c6a78']), L = g.find(BRD);
      if (L.length) {
        var rows = {}; L.forEach(function (p) { var r = rows[p[1]] = rows[p[1]] || [1e9, -1]; r[0] = Math.min(r[0], p[0]); r[1] = Math.max(r[1], p[0]); });
        Object.keys(rows).forEach(function (k) { var y = +k, r = rows[k], X = r[0] + r[1] + 1; put(g, X, 2 * y, col('#e8fffb'), BRD); put(g, X, 2 * y + 1, col('#d0f6f2'), BRD); });   // alma de la tabla
        var b = bboxOf(L);
        put(g, 2 * b.x0 + 2, 2 * b.y1 - 4, col('#ff8a2a'), BRD); put(g, 2 * b.x0 + 3, 2 * b.y1 - 4, col('#ff8a2a'), BRD);                    // calcomanía
        for (var i = 0; i < 3; i++) put(g, 2 * b.x1 - i, 2 * b.y0 + 6 + i, col('#0c6a78'), BRD);                                              // mordida / rajadura
      }
      var NEO = S2(['#1d3138', '#142227', '#0e1a20', '#0c1518']);
      each(g, NEO, function (x, y) { quad(g, x, y, function (X, Y, q) { if (Y % 7 === 0) g.set(X, Y, col('#2c4a52')); else if ((q & 1) === 0 && !NEO[g.at(x - 1, y)]) g.set(X, Y, col('#3a5a62')); }); });   // neopreno: costuras y brillo
    },
    cv_turista: function (g) {
      var SH = S2(['#2aa8a0', '#72c6c0', '#1d7670']);
      each(g, SH, function (x, y) { if (h3(x, y, 7) < 0.22) { var X = 2 * x, Y = 2 * y; put(g, X, Y, col('#ff7fb2'), SH); put(g, X + 1, Y + 1, col('#ff7fb2'), SH); put(g, X + 1, Y, col('#ffd740'), SH); } });   // flores
      glint(g, S2(['#7ec8e8', '#d6f4ff']), col('#ffffff'));
    },
    mira_turista: function (g) {
      var HAT = S2(['#e4d8b0', '#d8c68e', '#978b6c']);
      each(g, HAT, function (x, y) { quad(g, x, y, function (X, Y) { if ((X * 2 + Y) % 5 === 0) g.set(X, Y, sh(g.at(x, y), 0.86)); }); });   // paja tejida
      each(g, S2(['#c8483a']), function (x, y) { quad(g, x, y, function (X, Y, q) { if (q < 2) g.set(X, Y, col('#e06a58')); }); });         // cinta del sombrero
      var LENS = S2(['#d6f4ff', '#7ec8e8', '#2a5a8a']), L = g.find(LENS);
      if (L.length) { var b = bboxOf(L), cx = b.x0 + b.x1 + 1, cy = b.y0 + b.y1 + 1; put(g, cx - 1, cy - 1, col('#ffffff')); put(g, cx, cy, col('#1a2a40'), LENS); put(g, cx + 1, cy, col('#a8dcf0'), LENS); }
      glint(g, S2(['#1c1a22']), col('#6a7a98'));                                                           // lentes de sol
      var SHT = S2(['#dfae3c', '#e9c877']);
      each(g, SHT, function (x, y) { if (h3(x, y, 9) < 0.2) put(g, 2 * x + 1, 2 * y, col('#c8483a'), SHT); });   // camisa floreada
    },
    mira_jogger: function (g) {
      shimmer(g, S2(['#f27aae', '#e0407f']), col('#ffb0d0'), col('#b02a62'));                               // vincha
      var TR = S2(['#35c777', '#76d9a0', '#258b5a']);
      each(g, TR, function (x, y) { if (!TR[g.at(x + 1, y)]) put(g, 2 * x + 1, 2 * y + (y & 1), col('#f3efe2'), TR); });   // franja del buzo
      glint(g, S2(['#e8e4d4']), col('#ffffff'));                                                            // audífono
    },
    mira_sereno: function (g, e) {
      var CAP = S2(['#e0c030', '#ead46e']); each(g, CAP, function (x, y) { quad(g, x, y, function (X, Y) { if ((X + Y) % 3 === 0) g.set(X, Y, col('#fff0a0')); }); });   // cordón dorado
      glint(g, S2(['#c8ccd4', '#ffffff', '#cdd2d8']), col('#ffffff'));                                     // silbato
      var UNI = S2(['#32466e']); var L = g.find(UNI), b = bboxOf(L);
      if (L.length) for (var y = b.y0 + 1; y <= b.y1; y += 2) { for (var x = b.x1; x >= b.x0; x--) if (UNI[g.at(x, y)] && !g.edge(x, y)) { put(g, 2 * x, 2 * y, col('#e0c030')); break; } }   // botones
      badge(g, e, col('#c8a020'));
    },
    cv_corredor: function (g, e) {
      var TOP = S2(['#b8e82a', '#81a21d', '#d0f072']), L = g.find(TOP);
      if (L.length > 6) {                                                                                      // dorsal con número
        var b = bboxOf(L), X = Math.round(b.cx * 2) - 1, Y = Math.round(b.cy * 2) - 1;
        for (var i = 0; i < 4; i++) for (var j = 0; j < 3; j++) put(g, X + i, Y + j, col('#f4f2e8'), TOP);
        put(g, X + 1, Y + 1, col('#202028'), TOP); put(g, X + 2, Y + 1, col('#202028'), TOP); put(g, X, Y, col('#c8483a'), TOP);
      }
      shimmer(g, S2(['#ff5aa8', '#ff3d8a']), col('#ff9ac8'), col('#b02a62'));
    },
    cv_parapentista: function (g) {
      var HEL = S2(['#f5b269', '#f08a1c', '#a86114']);
      each(g, HEL, function (x, y) { if (!HEL[g.at(x, y - 1)]) quad(g, x, y, function (X, Y, q) { if (q < 2 && X % 3 === 0) g.set(X, Y, col('#ffd8a0')); }); });   // brillo del casco
      each(g, S2(['#653a0c']), function (x, y) { quad(g, x, y, function (X, Y) { if (X % 2) g.set(X, Y, col('#2a2830')); }); });            // visera con rejilla
      var SAIL = S2(['#ff5aa8', '#f2d21a', '#38c8e8']);
      each(g, SAIL, function (x, y) { quad(g, x, y, function (X, Y) { if (X % 4 === 0 || Y % 4 === 0) g.set(X, Y, sh(g.at(x, y), 0.8)); }); });   // tela rip-stop
      glint(g, S2(['#c9c5b5']), col('#ffffff'));
    },
    cv_seguridad: function (g, e) {
      shimmer(g, S2(['#e8f0d8']), col('#ffffff'), col('#c8d0bc'));                                         // reflectivo
      var V = S2(['#bcd82a', '#d3e572', '#84971d']);
      each(g, V, function (x, y) { quad(g, x, y, function (X, Y) { if (Y % 6 === 0) g.set(X, Y, col('#9ab81e')); }); });                  // malla del chaleco
      var CAP = g.find(S2(['#1c2a4a', '#141d34'])).filter(function (p) { return e && p[1] < e.y; });
      if (CAP.length) { var b = bboxOf(CAP); put(g, 2 * b.x0 + 4, 2 * b.y0 + 2, col('#e0c030')); put(g, 2 * b.x0 + 5, 2 * b.y0 + 2, col('#fff0a0')); }   // placa de la gorra
      glint(g, S2(['#6a2a2c']), col('#ff3a3a'));                                                            // luz de la radio
    },
    cv_barista: function (g, e) {
      var AP = S2(['#1d6a4c', '#2a5a44', '#659a82']), L = g.find(AP);
      if (L.length > 5) { var b = bboxOf(L), X = Math.round(b.cx * 2), Y = Math.round(b.cy * 2);                               // insignia redonda
        [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(function (d) { put(g, X + d[0], Y + d[1], col('#f3efe2'), AP); }); put(g, X, Y, col('#1d6a4c'), AP); }
      var CUP = S2(['#5a3a24', '#7a5a3a']); each(g, CUP, function (x, y) { quad(g, x, y, function (X, Y) { if (Y % 3 === 0) g.set(X, Y, col('#9a7a50')); }); });   // manga de cartón
      glint(g, S2(['#cfc8b4', '#f3efe2']), col('#ffffff'));
      badge(g, e, col('#1d6a4c'));
    },
    cv_reySelfie: function (g) {
      var GOLD = S2(['#e0b82c', '#eacf6b', '#9d8121']);
      each(g, GOLD, function (x, y) { quad(g, x, y, function (X, Y) { if (!GOLD[g.at(x, y - 1)] && Y % 2 === 0 && X % 3 === 0) g.set(X, Y, col('#fff6a0')); }); });
      each(g, S2(['#c8483a', '#3a9ad8']), function (x, y) { var X = 2 * x, Y = 2 * y; g.set(X, Y, col('#ffffff')); });                  // joyas con brillo
      var CAPE = S2(['#5a2a82', '#7a4aa8', '#553480', '#8f6ea8', '#a584c2']);
      each(g, CAPE, function (x, y) { quad(g, x, y, function (X, Y) { if (X % 4 === 1) g.set(X, Y, sh(g.at(x, y), 0.82)); }); });          // pliegues de la capa
      var SCR = S2(['#7ec8e8']), L = g.find(SCR); if (L.length) { var b = bboxOf(L); for (var i = 0; i < 3; i++) put(g, 2 * b.x0 + i + 1, 2 * b.y0 + 3 - i, col('#e8f8ff'), SCR); }   // pantalla
    },
    cv_dronero: function (g) {
      var V = S2(['#cf7a2e', '#dea56d', '#915523']);
      each(g, V, function (x, y) { if (V[g.at(x, y - 1)] && !V[g.at(x, y + 1)]) quad(g, x, y, function (X, Y, q) { if (q >= 2) g.set(X, Y, col('#6a3a14')); }); });   // bolsillos del chaleco
      var RC = S2(['#80848e', '#5a5e68']); each(g, RC, function (x, y) { quad(g, x, y, function (X, Y) { if (X % 4 === 1 && Y % 4 === 1) g.set(X, Y, col('#2a2c34')); }); });   // control remoto
      glint(g, S2(['#c8483a']), col('#ff6a5a')); glint(g, S2(['#d6f4ff', '#7ec8e8']), col('#ffffff'));
    }
  };
  function zMain(g, src, info) {
    if (ZF) { try { ZF.paint(g, src, info); } catch (e) { /* sigue */ } }
    var e = eyeOf(g), key = g.key, m = /^zvar\.(\w+?)\./.exec(key + '.'), id = m ? m[1] : '';
    var yHead = e ? e.y + 2 : Math.round(g.bbox().y0 + (g.bbox().y1 - g.bbox().y0) * 0.3);
    hair(g, HAIR, yHead, -1);
    profile(g, e);
    clothes(g, e ? e.y + 3 : yHead + 1, g.seed & 7);
    if (/^(cv_trab_|trab_)/.test(id)) ACC.trab(g, e);
    if (ACC[id]) ACC[id](g, e);
  }
  HD.family('mira-cv-zombi', {
    match: function (k) { return /^zvar\.(trab_|mira_|cv_)/.test(k); },
    paint: zMain
  });

  /* =====================================================================================================
     JEFA DE MIRAFLORES: DOÑA CHANCACA, LA PICARONERA (de frente; frie = de espaldas)
     ===================================================================================================== */
  var PK = { white: col('#eef0d2'), pupil: col('#1a1814'), mouth: col('#2a1214'), tooth: col('#eae6cc'), gold: col('#f0c838') };
  var P_SCARF = S2(['#c8382e', '#ee6c58', '#8e2220']), P_APRON = S2(['#dcd2b4', '#f4ecd4', '#8a7e60', '#b8ad8a']), P_SKIRT = S2(['#4c68a4', '#2e4478', '#1c2a4c', '#10182e']);
  var P_BLOUSE = S2(['#e0aa50', '#b8832c', '#8a5a1c', '#5a3a10']), P_METAL = S2(['#cfd3cc', '#8c949a', '#5c6570', '#3b4250']), P_SKIN = S2(['#a3ad8a', '#7f8c71', '#5f6b55', '#3f4a44']);
  function picaronera(g) {
    // ojos: blanco amarillento con venitas, iris rojo vino, pupila y brillo; cejas bravas
    var W = g.find(S2([PK.white])), pupils = g.find(S2([PK.pupil]));
    W.forEach(function (p) { quad(g, p[0], p[1], function (X, Y, q) { g.set(X, Y, q < 2 ? col('#f2f2dc') : col('#d6d8b8')); if (q === 3 && h3(X, Y, 3) < 0.5) g.set(X, Y, col('#c86a5a')); }); });
    pupils.forEach(function (p) {
      var X = 2 * p[0], Y = 2 * p[1];
      g.set(X, Y, col('#7a1a1a')); g.set(X + 1, Y, col('#a02a22')); g.set(X, Y + 1, col('#140c0c')); g.set(X + 1, Y + 1, col('#3a0e0e')); g.set(X + 1, Y, col('#ffe0c0'));
      for (var i = -1; i <= 2; i++) put(g, X + i, Y - 2, col('#2a3226'), P_SKIN);                                     // ceja
      put(g, X + (p[0] * 2 < g.w ? 2 : -1), Y - 3, col('#2a3226'), P_SKIN);
    });
    // boca: labio, dientes con huecos y el diente de oro
    each(g, S2([PK.mouth]), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, q < 2 ? col('#3a1418') : col('#1a0a0c')); }); });
    each(g, S2([PK.tooth]), function (x, y) { quad(g, x, y, function (X, Y, q) { if (q >= 2 && h3(X, 0, 9) < 0.3) g.set(X, Y, col('#1a0a0c')); else g.set(X, Y, q < 2 ? col('#f4f0d8') : col('#c8c2a0')); }); });
    each(g, S2([PK.gold]), function (x, y) { var X = 2 * x, Y = 2 * y; g.set(X, Y, col('#fff4a0')); g.set(X + 1, Y, col('#f0c838')); g.set(X, Y + 1, col('#c89820')); g.set(X + 1, Y + 1, col('#8a6410')); });
    // piel: verrugas y arrugas de la frente
    var SK = g.find(P_SKIN), sb = bboxOf(SK);
    SK.forEach(function (p) { if (p[1] <= sb.y0 + 6) quad(g, p[0], p[1], function (X, Y) { var h = h3(X - 2 * sb.x0, Y - 2 * sb.y0, 41); if (h < 0.05) g.set(X, Y, col('#4a5640')); else if (h > 0.97) g.set(X, Y, col('#c2cca4')); }); });
    // pañuelo: lunares blancos, nudo con brillo, pliegues
    each(g, P_SCARF, function (x, y) { quad(g, x, y, function (X, Y) { var k = (X + 3 * (Y >> 1)) % 7; if (k === 0) g.set(X, Y, col('#f6efe2')); else if ((X - Y) % 5 === 0) g.set(X, Y, sh(g.at(x, y), 0.8)); }); });
    // mandil: ribete pespunteado, bolsillo, manchas de miel y masa
    var AP = g.find(P_APRON), ab = bboxOf(AP);
    AP.forEach(function (p) { var x = p[0], y = p[1];
      quad(g, x, y, function (X, Y) {
        var edge = !P_APRON[g.at((X - 1) >> 1, Y >> 1)] || !P_APRON[g.at((X + 1) >> 1, Y >> 1)] || !P_APRON[g.at(X >> 1, (Y + 1) >> 1)];
        if (edge && (X + Y) % 3 === 0 && !g.isOutline(X, Y)) g.set(X, Y, col('#b8a880'));
        var h = h3(X - 2 * ab.x0, Y - 2 * ab.y0, 77); if (h < 0.012) g.set(X, Y, col('#d89a30'));
      }); });
    if (AP.length > 20) { var px = Math.round(ab.cx * 2) - 3, py = Math.round(ab.cy * 2) + 2; for (var i = 0; i < 7; i++) { put(g, px + i, py, col('#a89a78'), P_APRON); put(g, px + i, py + 5, col('#c8bc98'), P_APRON); } for (var j = 0; j < 5; j++) { put(g, px, py + j, col('#a89a78'), P_APRON); put(g, px + 6, py + j, col('#a89a78'), P_APRON); } }
    // pollera: tablas verticales y basta bordada
    each(g, P_SKIRT, function (x, y) { quad(g, x, y, function (X, Y) { if (X % 4 === 0) g.set(X, Y, sh(g.at(x, y), 0.78)); else if (X % 4 === 1) g.set(X, Y, li(g.at(x, y), 0.1)); if (!P_SKIRT[g.at(x, y + 1)] && Y % 2 && (X % 3 === 0)) g.set(X, Y, col('#e0c030')); }); });
    // blusa: bordado en el canesú
    // cucharón: metal con brillo
    each(g, P_METAL, function (x, y) { quad(g, x, y, function (X, Y, q) { if (q === 0 && lum(g.at(x, y)) > 120) g.set(X, Y, col('#ffffff')); }); });
    // aretes de oro: a los lados de la cara, bajo el pañuelo
    if (SK.length) [sb.x0, sb.x1].forEach(function (x, i) { for (var y = sb.y0 + 3; y <= sb.y0 + 6; y++) if (P_SKIN[g.at(x, y)] && !g.edge(x, y)) { put(g, 2 * x + (i ? 1 : 0), 2 * y + 1, col('#f0c838')); break; } });
  }
  HD.family('mira-picaronera', { match: function (k) { return /^mira\.picaronera\./.test(k); }, paint: picaronera });

  /* =====================================================================================================
     JEFE DE COSTA VERDE: EL MAESTRO WANTÁN (chef de chifa)
     ===================================================================================================== */
  var C_TOQUE = S2(['#fbf8ec', '#e6e2d4', '#bdb9ab', '#8c8a93']), C_SKIN = S2(['#f0c9a4', '#dba583', '#b88068', '#8c5a44', '#f2c0a8', '#e0a088', '#c88068']);
  var C_BLADE = S2(['#a4b0bc', '#5e6a7a', '#3c4552']), C_WOOD = S2(['#c99458', '#a06a36', '#6b4223']), C_APRON = S2(['#dcd2b4', '#b8ad8a', '#f4ecd4', '#8a7e60']);
  var C_MUST = S2(['#0e0c0e', '#241e1f', '#3e3434']), C_RED = S2(['#d4382e', '#f2705a', '#a0201c']);
  function chef(g) {
    // gorro: tablas verticales del gorro alto y banda almidonada
    each(g, C_TOQUE, function (x, y) { if (y > g.h * 0.24) return; quad(g, x, y, function (X, Y) { var c = g.at(x, y); if (X % 6 === 0 && lum(c) > 180) g.set(X, Y, col('#d4d0c2')); else if (X % 6 === 1 && lum(c) > 180) g.set(X, Y, col('#ffffff')); }); });
    // ojos: blanco + iris café + pupila + brillo; párpado
    var WHT = S2(['#ffffff']);
    each(g, S2(['#1a1418']), function (x, y) { if (!WHT[g.at(x - 1, y)] && !WHT[g.at(x + 1, y)] && !WHT[g.at(x, y - 1)]) return;
      var X = 2 * x, Y = 2 * y; g.set(X, Y, col('#4a2a18')); g.set(X + 1, Y, col('#6a3a20')); g.set(X, Y + 1, col('#100a0a')); g.set(X + 1, Y + 1, col('#2a1810')); g.set(X, Y, col('#fff4e0')); });
    each(g, S2(['#ffffff']), function (x, y) { if (C_SKIN[g.at(x, y - 1)]) quad(g, x, y, function (X, Y, q) { if (q < 2) g.set(X, Y, col('#e8dcd0')); }); });
    // bigote: hebras finas que caen
    each(g, C_MUST, function (x, y) { if (y < g.h * 0.2) return; quad(g, x, y, function (X, Y) { if ((X + (Y >> 1)) % 5 === 0) g.set(X, Y, col('#5a4c46')); else if (!g.op(x, y + 1) || !C_MUST[g.at(x, y + 1)]) { if (X % 2) g.set(X, Y, col('#3e3434')); } }); });
    // mejillas y nariz
    each(g, S2(['#e88a7a']), function (x, y) { quad(g, x, y, function (X, Y, q) { if (q === 0) g.set(X, Y, col('#f6b0a0')); }); });
    // cuchillo de carnicero: filo brillante, remaches y vetas del mango
    each(g, C_BLADE, function (x, y) { quad(g, x, y, function (X, Y) { var c = g.at(x, y); if (lum(c) > 150 && (X + Y) % 4 === 0) g.set(X, Y, col('#eef4fa')); if (!C_BLADE[g.at(x, y + 1)] && !C_BLADE[g.at(x + 1, y)]) g.set(X, Y, col('#ffffff')); }); });
    each(g, C_WOOD, function (x, y) { quad(g, x, y, function (X, Y) { if (h3(X + Y, Y, 13) < 0.15) g.set(X, Y, sh(g.at(x, y), 0.75)); }); });
    // botones de sapo (alamares) dorados en la chaqueta, ribete rojo con brillo
    each(g, C_RED, function (x, y) { quad(g, x, y, function (X, Y, q) { if (q === 0 && (X + Y) % 4 === 0) g.set(X, Y, col('#ff9a80')); }); });
    // mandil: pespunte y manchas de salsa
    var AP = g.find(C_APRON), ab = bboxOf(AP);
    AP.forEach(function (p) { quad(g, p[0], p[1], function (X, Y) {
      var edge = !C_APRON[g.at((X - 1) >> 1, Y >> 1)] || !C_APRON[g.at((X + 1) >> 1, Y >> 1)];
      if (edge && Y % 2) g.set(X, Y, col('#a89a78'));
      if (h3(X - 2 * ab.x0, Y - 2 * ab.y0, 51) < 0.012) g.set(X, Y, col('#8a2a1c'));
    }); });
    // pantalón de cuadritos: hilo cruzado
    each(g, S2(['#cfcfc6', '#e0e0d8']), function (x, y) { quad(g, x, y, function (X, Y) { if ((X + Y) % 4 === 0) g.set(X, Y, col('#a8a8a0')); }); });
  }
  HD.family('cv-chef', { match: function (k) { return /^cv\.chef\./.test(k); }, paint: chef });

  /* dumplings y baozi: pliegues de la masa, ojos con brillo, dientes */
  HD.family('cv-dumpling', {
    match: function (k) { return /^cv\.(dumpling|baozi)\./.test(k); },
    paint: function (g) {
      var DOUGH = S2(['#fffaf0', '#f2e9d0', '#d8caa8', '#b8a888']);
      each(g, DOUGH, function (x, y) { quad(g, x, y, function (X, Y) { var h = h3(X, Y, 17); if (h > 0.99) g.set(X, Y, col('#fffff8')); }); });
      var EY = g.find(S2(['#3a2418']));
      var eb = bboxOf(EY), groups = {}; EY.forEach(function (p) { var k = p[0] < eb.cx ? 'l' : 'r'; (groups[k] = groups[k] || []).push(p); });
      Object.keys(groups).forEach(function (k) { var b = bboxOf(groups[k]); put(g, 2 * b.x0 + 1, 2 * b.y0 + 1, col('#ffffff')); put(g, 2 * b.x0 + 2, 2 * b.y0 + 1, col('#d8c8b0')); });
      each(g, S2(['#fffdf4']), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, q >= 2 ? col('#d8d0b8') : col('#fffdf4')); }); });   // dientes
      each(g, S2(['#e8707a']), function (x, y) { quad(g, x, y, function (X, Y, q) { if (q === 0) g.set(X, Y, col('#ff9aa0')); }); });                 // lengua
      // pliegues en la coronilla: arcos desde el nudo
      var top = g.bbox(); for (var i = 0; i < 6; i++) { var X = 2 * top.x0 + 4 + i * 4, Y = 2 * top.y0 + 6 + (i % 2); put(g, X, Y, col('#c8b890'), DOUGH); put(g, X + 1, Y + 1, col('#c8b890'), DOUGH); }
    }
  });

  /* =====================================================================================================
     VIVOS: Don Tito / Don Pepe (inflables), vendedores de Larcomar, heladero, parapentistas sobrevivientes
     ===================================================================================================== */
  var V_SKIN = S2(['#c48f63', '#a8714c', '#80523a', '#dcae80', '#c89070', '#d09a76', '#b0785a', '#865b44', '#583c2d', '#e08a7a', '#f0c9a4', '#dba583']);
  var V_EYE = S2(['#141414', '#141010', '#0a0a0c']);
  function vivoFace(g) {
    var segs = g.find(V_EYE).filter(function (p) { return V_SKIN[g.at(p[0] - 1, p[1])] || V_SKIN[g.at(p[0] + 1, p[1])]; });
    var cx = g.bbox(); cx = (cx.x0 + cx.x1 + 1) / 2;
    segs.forEach(function (p) { var sk0 = g.at(p[0], p[1] + 1); T.eyeHuman(g, 2 * p[0], 2 * p[1], V_SKIN[sk0] ? sk0 : col('#c48f63'), p[0] + 0.5 < cx ? -1 : 1, col('#3a2414')); });
    // bigote: hebras
    each(g, S2(['#26262a', '#3e3e44']), function (x, y) { if (!segs.length || y <= segs[0][1]) return; quad(g, x, y, function (X, Y) { if ((X + Y) % 3 === 0) g.set(X, Y, col('#5a5a62')); }); });
    // boca
    each(g, S2(['#7a3a30']), function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, q < 2 ? col('#5a2420') : col('#b06a58')); }); });
    return segs.length;
  }
  function vivo(g, src, info) {
    if (HF) { try { HF.paint(g, src, info); } catch (e) { /* nada */ } }
    var n = vivoFace(g);
    if (!n) T.autoFace(g);
    var bb = g.bbox(); clothes(g, bb.y0 + Math.round((bb.y1 - bb.y0) * 0.45), 3);
    // globos (Don Tito/Don Pepe): brillo especular y nudo
    var BAL = S2(['#f07eb3', '#e8388a', '#8fcc88', '#52b048', '#7fa3d9', '#3a72c4', '#f2c81c', '#e37e77', '#d4382e', '#428d3a', '#ba2d6e', '#2e5b9d']);
    var seen = {};
    each(g, BAL, function (x, y) { var c = g.at(x, y); if (!BAL[g.at(x, y - 1)] && !BAL[g.at(x - 1, y)] && !seen[x + ',' + y]) { seen[x + ',' + y] = 1; put(g, 2 * x + 2, 2 * y + 2, col('#ffffff')); put(g, 2 * x + 3, 2 * y + 2, li(c, 0.5)); } });
    // gorra: visera con sombra y botón
    var CAP = g.find(S2(['#3a72c4', '#68a4ec', '#244a92', '#14284e'])).filter(function (p) { return p[1] > bb.y0 + (bb.y1 - bb.y0) * 0.4; });
    if (CAP.length) { var cb = bboxOf(CAP); put(g, 2 * Math.round(cb.cx), 2 * cb.y0, col('#c8d8f8')); for (var X = 2 * cb.x0; X <= 2 * cb.x1 + 1; X++) put(g, X, 2 * cb.y1 + 1, col('#0e1a34')); }
  }
  HD.family('mira-cv-vivo', { match: function (k) { return /^(mira\.vendedor|cv\.npc|cv\.heladero|cv\.para)\./.test(k); }, face: false, paint: function (g, src, info) {
    vivo(g, src, info);
    if (/^cv\.heladero/.test(g.key)) {                                                       // carrito: franjas, timbre y rayos de la rueda
      each(g, S2(['#b3201c']), function (x, y) { quad(g, x, y, function (X, Y, q) { if (q === 0) g.set(X, Y, col('#e04a40')); }); });
      glint(g, S2(['#cfd3cc']), col('#ffffff'));
      each(g, S2(['#3a3840']), function (x, y) { quad(g, x, y, function (X, Y) { if ((X + Y) % 3 === 0) g.set(X, Y, col('#8c949a')); }); });
    }
    if (/^cv\.para/.test(g.key)) {                                                            // parapentista: cara, casco con visera, arnés
      var F = g.find(S2(['#c89070'])); if (F.length) { var b = bboxOf(F), y = Math.round((b.y0 + b.y1) / 2), X0 = 2 * b.x0, X1 = 2 * b.x1 + 1;
        T.eyeHuman(g, X0 + 3, 2 * y - 1, col('#c89070'), -1, col('#3a2414')); T.eyeHuman(g, X1 - 4, 2 * y - 1, col('#c89070'), 1, col('#3a2414'));
        put(g, Math.round((X0 + X1) / 2), 2 * y + 1, col('#a8704c')); put(g, Math.round((X0 + X1) / 2) - 1, 2 * b.y1 + 1, col('#8a4a36')); put(g, Math.round((X0 + X1) / 2), 2 * b.y1 + 1, col('#8a4a36')); }
      var HEL = S2(['#ffe500', '#1fe07a', '#ffb020', '#2fb8e8', '#e84a8a', '#d8402c']);
      each(g, HEL, function (x, y) { if (!HEL[g.at(x, y - 1)]) quad(g, x, y, function (X, Y, q) { if (q < 2 && X % 3) g.set(X, Y, li(g.at(x, y), 0.4)); }); });
    }
  } });

  /* perros de la Costa Verde: el pintor de animales de Callao + collar con placa */
  HD.family('cv-perro', { match: function (k) { return /^cv\.perro\./.test(k); }, paint: function (g, src, info) { if (AF) { try { AF.paint(g, src, info); } catch (e) { /* nada */ } } } });

  /* =====================================================================================================
     MARCADO
     ===================================================================================================== */
  // marca obj[k] con prefijo; si es perezosa (getter), la envuelve: se marca al hornearse (sin dispararla ahora)
  function tagKey(obj, k, prefix) {
    var d = Object.getOwnPropertyDescriptor(obj, k); if (!d) return;
    if (!d.get) { if (d.value && typeof d.value === 'object') HD.tagTree(d.value, prefix); return; }
    if (d.get.__hdC || !d.configurable) return;
    var og = d.get, ng = function () { var v = og.call(this); try { if (v && typeof v === 'object') HD.tagTree(v, prefix); } catch (e) { /* nada */ } return v; };
    ng.__hdC = true;
    try { Object.defineProperty(obj, k, { get: ng, set: d.set, enumerable: d.enumerable, configurable: true }); } catch (e) { /* nada */ }
  }
  function tagAll() {
    var S = ACH.sprites || {}, M = S.mira, C = S.cv, PJ = C && C.pj;
    if (M) {
      if (M.picaronera) HD.tagTree(M.picaronera, 'mira.picaronera');
      if (M.vendedor) HD.tagTree(M.vendedor, 'mira.vendedor');
    }
    if (S.alexInflable) HD.tagTree(S.alexInflable, 'alex.inflable');
    if (PJ) {
      ['chef', 'dumpling', 'baozi', 'perro', 'heladero', 'npc', 'pareja', 'alexHeld', 'alexKick'].forEach(function (k) {
        tagKey(PJ, k, k === 'alexHeld' ? 'alex.held' : k === 'alexKick' ? 'alex.kick' : 'cv.' + k);
      });
    }
    if (C && C.t2 && C.t2.para) HD.wrapFn(C.t2, 'para', function (i, pose) { return 'cv.para.' + ((i | 0) % 3) + '.' + (pose || 'parado'); });
  }
  tagAll();
  window.addEventListener('load', function () { tagAll(); setTimeout(tagAll, 1600); });
  ACH.hdMiraCv = { tagAll: tagAll };
})();
