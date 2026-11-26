/* ACHORADO v0.15 — js/sprites/hd-callao.js (Agente B): familias HD y marcado de los personajes de Callao / Gambetta / Cerro.
 * Se carga después de js/sprites/zombis-v013.js (y de hd.js), antes de js/engine/game.js.
 * Marca (ACH.hd.tagTree) tras el horneado: alex.*, titina.*, zombie.*, zvar.* (las perezosas se marcan al hornearse), npc.*,
 * npc.v011.* (vendedores), npc.gb.<id>.<f> y npc.gbPasajero.* (fábricas de gambetta-v013 envueltas).
 * Familias: alex, titina, zombie (base + zvar + v013 + señoras + pasajeros), animal (perro, gato, gallinazo, gallina), humano (NPC).
 */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var HD = ACH.hd; if (!HD) return;
  var T = HD.toolkit, col = T.col, S = ACH.sprites || {};

  var set = T.set, shade = T.shade, mix = T.mix, lum = T.lum, sk = T.skinish;
  function each(g, set1, fn) { var L = g.find(set1); for (var i = 0; i < L.length; i++) fn(L[i][0], L[i][1]); return L; }
  // los 4 píxeles HD del bloque 1× (x,y) que no son contorno
  function quad(g, x, y, fn) { for (var q = 0; q < 4; q++) { var X = 2 * x + (q & 1), Y = 2 * y + (q >> 1); if (!g.isOutline(X, Y)) fn(X, Y, q); } }
  function bboxOf(L) { var b = { x0: 1e9, y0: 1e9, x1: -1, y1: -1, n: L.length, cx: 0, cy: 0 }; L.forEach(function (p) { if (p[0] < b.x0) b.x0 = p[0]; if (p[0] > b.x1) b.x1 = p[0]; if (p[1] < b.y0) b.y0 = p[1]; if (p[1] > b.y1) b.y1 = p[1]; b.cx += p[0]; b.cy += p[1]; }); if (L.length) { b.cx /= L.length; b.cy /= L.length; } return b; }

  /* ---------- pelo con mechones y banda de brillo ---------- */
  function paintHair(g, HS, base, opt) {
    opt = opt || {};
    var L = g.find(HS); if (!L.length) return;
    var b = bboxOf(L), sheen = T.pack(T.R(base) * 1.75 + 8, T.G(base) * 1.6 + 6, T.B(base) * 1.4 + 4), mid = T.pack(T.R(base) * 1.3 + 4, T.G(base) * 1.25 + 3, T.B(base) * 1.15 + 2), dk = shade(base, 0.62), tip = shade(base, 0.8);
    var Y0 = 2 * b.y0, salt = opt.salt || 0;
    L.forEach(function (p) {
      var x = p[0], y = p[1], below = g.at(x, y + 1), belowFace = below && !HS[below] && sk(below);
      quad(g, x, y, function (X, Y, q) {
        var ry = Y - Y0;
        var st = (X + (Y >> 1) + salt) % 4;                       // mechones inclinados (nunca damero)
        if (ry >= 2 && ry <= 3 && st !== 0 && st !== 3) g.set(X, Y, st === 1 ? sheen : mid);
        else if (ry === 4 && st === 2) g.set(X, Y, mid);
        else if (ry >= 5 && st === 0 && Y % 3 !== 0) g.set(X, Y, dk);
        // flequillo en puntas: la fila HD de abajo alterna pelo / cara
        if (belowFace && q >= 2) g.set(X, Y, ((X + salt) % 3 === 0) ? below : tip);
      });
    });
  }

  /* ---------- ojos, cejas, nariz, boca (humanos) ---------- */
  function eyeSegs(g, EYE, FACE) {
    var L = g.find(EYE), segs = [], used = {};
    L.forEach(function (p) {
      var k = p[0] + ',' + p[1]; if (used[k]) return;
      var x = p[0], n = 1; used[k] = 1;
      while (EYE[g.at(x + n, p[1])]) { used[(x + n) + ',' + p[1]] = 1; n++; }
      var around = 0; [[-1, 0], [n, 0], [0, -1], [0, 1]].forEach(function (d) { if (FACE[g.at(x + d[0], p[1] + d[1])]) around++; });
      if (around >= 1) segs.push({ x: x, y: p[1], n: n });
    });
    return segs;
  }
  function faceCenterX(g, y, FACE) { var s = 0, n = 0; for (var x = 0; x < g.w; x++) if (FACE[g.at(x, y)]) { s += x; n++; } return n ? s / n + 0.5 : g.w / 2; }

  /* =====================================================================================================
     ALEXANDER (todas las poses; los colores son los de P en js/sprites.js)
     ===================================================================================================== */
  var AP = {
    face: col('#c48f63'), faceL: col('#dcae80'), skin: col('#a8714c'), skinD: col('#80523a'), hair: col('#34261f'), eye: col('#141414'),
    blue: col('#1f2f66'), white: col('#e6e6e0'), shorts: col('#5d6150'), shortsD: col('#464a3c'), sandal: col('#5e3f27'),
    wood: col('#a86e38'), woodD: col('#6b4223'), head: col('#3a2a1e'), metal: col('#c9c9be'), tape: col('#cbbf98'), strap: col('#3b2b21'),
    mouth: col('#2a1515'), blush: col('#b5675a'),
    pg: col('#8e939b'), pgD: col('#5d6168'), pgL: col('#b6bac0'), irG: col('#3f9a7c'), irP: col('#8a5aa6'), beak: col('#3b3436'), cere: col('#ece7de'), peye: col('#e07a2a')
  };
  var A_FACE = set([AP.face, AP.faceL, AP.skin, AP.skinD, AP.blush]), A_EYE = set([AP.eye]), A_HAIR = set([AP.hair]);
  var A_SHIRT = set([AP.blue, AP.white]), A_SHORTS = set([AP.shorts, AP.shortsD]), A_SKIN = set([AP.skin, AP.skinD, AP.face, AP.faceL]);

  function alexFace(g) {
    var segs = eyeSegs(g, A_EYE, A_FACE);
    var open = segs.filter(function (s) { return s.n === 1; });
    var front = open.length === 2 && open[0].y === open[1].y;
    var lid = col('#5a3626'), brow = col('#3b2a20');
    segs.forEach(function (s) {
      var X = 2 * s.x, Y = 2 * s.y;
      if (s.n === 1) {
        var cx = faceCenterX(g, s.y, A_FACE), out;
        if (front) out = (s.x + 0.5 < cx) ? -1 : 1;
        else out = (s.x + 0.5 < cx) ? 1 : -1;                   // de perfil: el blanco queda atrás, la pupila mira al frente
        T.eyeHuman(g, X, Y, AP.face, out, col('#4a2c1c'));
        // ceja tímida: la punta interior sube
        if (front) {
          var inX = out < 0 ? X + 2 : X - 1, ox = out < 0 ? X - 1 : X + 2;
          [[ox, Y - 3], [X, Y - 3], [X + 1, Y - 3], [inX, Y - 4]].forEach(function (p) { if (A_FACE[g.at(p[0] >> 1, p[1] >> 1)]) g.set(p[0], p[1], brow); });
        } else { [[X, Y - 3], [X + 1, Y - 3], [X + 2, Y - 4]].forEach(function (p) { if (A_FACE[g.at(p[0] >> 1, p[1] >> 1)]) g.set(p[0], p[1], brow); }); }
      } else {                                                    // ojos cerrados / apretados: arco de pestañas
        for (var i = 0; i < 2 * s.n; i++) { g.set(X + i, Y, AP.face); g.set(X + i, Y + 1, (i === 0 || i === 2 * s.n - 1) ? lid : col('#2a1810')); }
        g.set(X + 1, Y, lid); g.set(X + 2 * s.n - 2, Y, lid);
      }
    });
    // nariz y boca
    if (front) {
      var e1 = open[0].x < open[1].x ? open[0] : open[1], e2 = e1 === open[0] ? open[1] : open[0];
      var NX = e1.x + e2.x + 1, NY = 2 * e1.y + 3;
      g.set(NX - 1, NY - 1, AP.faceL); g.set(NX, NY, col('#a8714c')); g.set(NX - 1, NY + 1, col('#b07a52'));
      // mejillas tímidas
      g.set(2 * e1.x, 2 * e1.y + 4, col('#cc9070')); g.set(2 * e2.x + 1, 2 * e2.y + 4, col('#cc9070'));
    } else if (open.length === 1) {
      var e = open[0], cxs = faceCenterX(g, e.y, A_FACE), dir = e.x + 0.5 > cxs ? 1 : -1;
      // la punta de la nariz: el píxel de cara más adelantado una fila debajo del ojo
      for (var x = dir > 0 ? g.w - 1 : 0; dir > 0 ? x > e.x : x < e.x; x -= dir) if (A_FACE[g.at(x, e.y + 1)]) { var PX = 2 * x + (dir > 0 ? 1 : 0); g.set(PX, 2 * e.y + 2, AP.faceL); g.set(PX - dir, 2 * e.y + 3, col('#a8714c')); break; }
    }
    // boca: skinD bajo los ojos y entre ellos (sonrisa chica), o P.mouth (abierta)
    var eyRow = segs.length ? segs[0].y : -1;
    if (eyRow >= 0) {
      var xs = segs.map(function (s) { return s.x; }), xa = Math.min.apply(null, xs) - (front ? 0 : 3), xb = Math.max.apply(null, xs) + (front ? 1 : 3);
      for (var y = eyRow + 1; y <= eyRow + 4; y++) for (var x2 = xa; x2 <= xb; x2++) {
        var c = g.at(x2, y);
        if (c === AP.skinD && A_FACE[g.at(x2, y - 1)] && g.at(x2, y - 1) !== AP.skinD && (front ? (A_FACE[g.at(x2 - 1, y)] && A_FACE[g.at(x2 + 1, y)]) : true) && y >= eyRow + 2) {
          var X2 = 2 * x2, Y2 = 2 * y, left = g.at(x2 - 1, y) !== AP.skinD, right = g.at(x2 + 1, y) !== AP.skinD;
          g.set(X2, Y2, left ? col('#8a4a36') : AP.face); g.set(X2 + 1, Y2, right ? col('#8a4a36') : AP.face);
          g.set(X2, Y2 + 1, left ? AP.face : col('#7a3e2e')); g.set(X2 + 1, Y2 + 1, right ? AP.face : col('#7a3e2e'));
          if (left) g.set(X2 + 1, Y2 + 1, col('#7a3e2e')); if (right) g.set(X2, Y2 + 1, col('#7a3e2e'));
          if (A_FACE[g.at(x2, y + 1)]) { g.set(X2, Y2 + 2, col('#d29c74')); g.set(X2 + 1, Y2 + 2, col('#d29c74')); }
        } else if (c === AP.mouth) {
          var X3 = 2 * x2, Y3 = 2 * y, up = g.at(x2, y - 1) !== AP.mouth, dn = g.at(x2, y + 1) !== AP.mouth;
          g.set(X3, Y3, up ? col('#e8e0d0') : col('#2a1212')); g.set(X3 + 1, Y3, up ? col('#d6ccba') : col('#2a1212'));
          g.set(X3, Y3 + 1, dn ? col('#a44a44') : col('#2a1212')); g.set(X3 + 1, Y3 + 1, dn ? col('#8a3a36') : col('#2a1212'));
        }
      }
    }
    // orejas: cara pegada al pelo a un costado, a la altura de los ojos
    if (eyRow >= 0) for (var y3 = eyRow - 1; y3 <= eyRow + 1; y3++) for (var x3 = 0; x3 < g.w; x3++) {
      if (!A_FACE[g.at(x3, y3)]) continue;
      var l = g.at(x3 - 1, y3), r = g.at(x3 + 1, y3);
      if ((A_HAIR[l] || !l) && A_HAIR[g.at(x3, y3 - 1)] && A_FACE[r]) { g.set(2 * x3 + 1, 2 * y3 + 1, AP.skinD); g.set(2 * x3, 2 * y3, AP.faceL); }
      if ((A_HAIR[r] || !r) && A_HAIR[g.at(x3, y3 - 1)] && A_FACE[l]) { g.set(2 * x3, 2 * y3 + 1, AP.skinD); g.set(2 * x3 + 1, 2 * y3, AP.faceL); }
    }
  }

  function alexShirt(g) {
    var rib = col('#16224c'), ribW = col('#bfc0b8'), foldW = col('#cdcec8'), liB = col('#2b3d7e'), hemB = col('#151f48'), hemW = col('#b8b9b2');
    each(g, A_SHIRT, function (x, y) {
      var c = g.at(x, y), n = g.at(x, y - 1), s = g.at(x, y + 1), e = g.at(x + 1, y), w = g.at(x - 1, y), isW = c === AP.white;
      quad(g, x, y, function (X, Y, q) {
        var top = q < 2, left = !(q & 1);
        if (top && n && A_SKIN[n] && !A_SHIRT[n]) g.set(X, Y, isW ? ribW : rib);                       // cuello
        else if (!top && s && (A_SHORTS[s] || A_SKIN[s]) ) g.set(X, Y, isW ? hemW : hemB);              // basta / manga
        else if (isW && !left && e === AP.blue) g.set(X, Y, foldW);                                    // pliegue entre franjas
        else if (!isW && left && w === AP.white) g.set(X, Y, liB);
        else if (isW && ((X * 2 + Y) % 9 === 0)) g.set(X, Y, col('#d9d9d2'));                         // trama
      });
    });
    // tirante de la guitarra: puntadas
    each(g, set([AP.strap]), function (x, y) { quad(g, x, y, function (X, Y) { if ((X + Y) % 3 === 0) g.set(X, Y, col('#6a5240')); else if ((X + Y) % 3 === 1) g.set(X, Y, col('#4a3628')); }); });
  }

  function alexShorts(g) {
    var L = g.find(A_SHORTS); if (L.length < 4) return;
    var b = bboxOf(L), X0 = 2 * b.x0, X1 = 2 * b.x1 + 1, Y0 = 2 * b.y0, Y1 = 2 * b.y1 + 1, XC = b.x0 + b.x1 + 1, sd = col('#3e4234'), band = col('#565a48');
    var on = function (X, Y) { return A_SHORTS[g.at(X >> 1, Y >> 1)] && !g.isOutline(X, Y); };
    for (var X = X0; X <= X1; X++) { if (on(X, Y0 + 1)) g.set(X, Y0 + 1, band); if (on(X, Y0)) g.set(X, Y0, sd); }
    if (on(XC, Y0 + 2)) g.set(XC, Y0 + 2, AP.tape); if (on(XC - 1, Y0 + 3)) g.set(XC - 1, Y0 + 3, AP.tape);        // cordón
    var wide = b.x1 - b.x0 >= 6;
    if (wide) {
      for (var Y = Y0 + 2; Y <= Y1 - 2; Y++) if (on(XC, Y) && Y > Y0 + 3) g.set(XC, Y, sd);                       // bragueta
      for (var t = 0; t < 3; t++) { if (on(X0 + 1 + t, Y0 + 2 + t)) g.set(X0 + 1 + t, Y0 + 2 + t, sd); if (on(X1 - 1 - t, Y0 + 2 + t)) g.set(X1 - 1 - t, Y0 + 2 + t, sd); }   // bolsillos
    } else {
      var px = Math.round((X0 + X1) / 2);                                                                          // de lado: bolsillo con tapa
      for (var i = -1; i <= 1; i++) if (on(px + i, Y0 + 3)) g.set(px + i, Y0 + 3, sd);
      if (on(px + 1, Y0 + 4)) g.set(px + 1, Y0 + 4, sd);
    }
    // basta: la última fila HD de cada columna
    L.forEach(function (p) { var s = g.at(p[0], p[1] + 1); if (!A_SHORTS[s]) quad(g, p[0], p[1], function (X, Y, q) { if (q >= 2) g.set(X, Y, sd); }); });
  }

  function alexFeet(g) {
    var sole = col('#2f1f14'), strap = col('#7d5636'), strapL = col('#9a6c44');
    each(g, set([AP.sandal]), function (x, y) {
      var n = g.at(x, y - 1), skinUp = n && A_SKIN[n] && !A_SHIRT[n];
      quad(g, x, y, function (X, Y, q) {
        if (q >= 2) g.set(X, Y, sole);
        else if (skinUp) g.set(X, Y, (X % 2) ? strap : n);                              // dedos entre correas
        else g.set(X, Y, (X % 3 === 0) ? strapL : strap);
      });
      // correa del tobillo sobre la pierna
      if (skinUp) quad(g, x, y - 1, function (X, Y, q) { if (q >= 2) g.set(X, Y, (X % 2) ? AP.sandal : strap); });
    });
    // manos: dedos en la punta de los brazos
    each(g, set([AP.skin]), function (x, y) {
      var s = g.at(x, y + 1), n = g.at(x, y - 1);
      if ((!s || T.isInk(s) || T.isRim(s)) && A_SKIN[n] && y < g.h * 0.8) quad(g, x, y, function (X, Y, q) { if (q >= 2 && (X % 2)) g.set(X, Y, AP.skinD); });
    });
  }

  function guitar(g, WOOD, NECK, HEAD, palette) {
    palette = palette || {};
    var W = g.find(WOOD); if (W.length < 5) return;
    var N = g.find(NECK), H = g.find(HEAD), bw = bboxOf(W), bn = bboxOf(N.length ? N : H);
    if (!N.length && !H.length) return;
    var ux = bn.cx - bw.cx, uy = bn.cy - bw.cy, ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
    var cx = 2 * bw.cx + 1 + ux * 1.6, cy = 2 * bw.cy + 1 + uy * 1.6;             // la boca, un poco hacia el mástil
    var inGtr = function (X, Y) { var c = g.at(X >> 1, Y >> 1); return WOOD[c] || NECK[c] || HEAD[c]; };
    var dark = palette.hole || col('#22140c'), ros = palette.ros || col('#e0b882'), grain = palette.grain || col('#96602e');
    // vetas
    W.forEach(function (p) { quad(g, p[0], p[1], function (X, Y) { if (T.hash3(X + Y * 3, Y, 77) < 0.1) g.set(X, Y, grain); }); });
    // roseta y boca
    for (var Y = Math.floor(cy - 3); Y <= Math.ceil(cy + 3); Y++) for (var X = Math.floor(cx - 3); X <= Math.ceil(cx + 3); X++) {
      var d = Math.hypot(X + 0.5 - cx, Y + 0.5 - cy);
      if (!WOOD[g.at(X >> 1, Y >> 1)] || g.isOutline(X, Y)) continue;
      if (d < 1.5) g.set(X, Y, dark); else if (d < 2.3) g.set(X, Y, ros);
    }
    // puente
    var bx = cx - ux * 4.2, by = cy - uy * 4.2;
    for (var t = -1.5; t <= 1.5; t += 0.5) { var X4 = Math.round(bx - uy * t), Y4 = Math.round(by + ux * t); if (WOOD[g.at(X4 >> 1, Y4 >> 1)] && !g.isOutline(X4, Y4)) g.set(X4, Y4, col('#3a2414')); }
    // cuerdas: del puente al clavijero
    var far = 0; N.concat(H).forEach(function (p) { var a = (2 * p[0] + 1 - cx) * ux + (2 * p[1] + 1 - cy) * uy; if (a > far) far = a; });
    [-0.6, 0.6].forEach(function (o, i) {
      g.line(bx - uy * o, by + ux * o, cx + ux * far - uy * o, cy + uy * far + ux * o, i ? col('#b89a72') : col('#d8c8a4'),
        function (X, Y) { return inGtr(X, Y) && !g.isOutline(X, Y); });
    });
    // clavijas: puntos de metal en el borde del clavijero
    H.forEach(function (p) { quad(g, p[0], p[1], function (X, Y) { if ((X + Y) % 2 === 0 && (!HEAD[g.at((X - 1) >> 1, Y >> 1)] || !HEAD[g.at((X + 1) >> 1, Y >> 1)])) g.set(X, Y, AP.metal); }); });
    // trastes sobre el mástil
    N.forEach(function (p) { quad(g, p[0], p[1], function (X, Y) { var a = (X + 0.5 - cx) * ux + (Y + 0.5 - cy) * uy; if (Math.round(a) % 6 === 0) g.set(X, Y, col('#57351c')); }); });
  }

  function titinaDetail(g) {
    var PG = set([AP.pg]), IR = set([AP.irG, AP.irP]);
    each(g, PG, function (x, y) { quad(g, x, y, function (X, Y) { var k = (X + 2 * Y) % 4; if (k === 0) g.set(X, Y, AP.pgL); else if (k === 2 && Y % 2) g.set(X, Y, col('#7a7f87')); }); });
    each(g, IR, function (x, y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, q === 0 ? col('#7fd0b0') : ((X + Y) % 2 ? AP.irP : AP.irG)); if (q === 3) g.set(X, Y, col('#5e3a7a')); }); });
    each(g, set([AP.peye]), function (x, y) {
      var bk = g.find(set([AP.beak])), toR = bk.length && bk[0][0] > x;
      var X = 2 * x, Y = 2 * y;
      g.set(X, Y, col('#f6a858')); g.set(X + 1, Y, col('#e07a2a')); g.set(X, Y + 1, col('#c0601e')); g.set(X + 1, Y + 1, col('#c0601e'));
      g.set(toR ? X + 1 : X, Y + 1, col('#141012')); g.set(toR ? X + 1 : X, Y, col('#fff4e0'));
    });
    each(g, set([AP.beak]), function (x, y) {
      var headR = PG[g.at(x + 1, y)] || PG[g.at(x + 1, y - 1)];
      var X = 2 * x, Y = 2 * y;
      g.set(headR ? X + 1 : X, Y, AP.cere); g.set(headR ? X : X + 1, Y + 1, col('#6a6266'));
    });
  }

  HD.family('alex', {
    match: function (k) { return /^alex\./.test(k); },
    paint: function (g) {
      paintHair(g, A_HAIR, AP.hair, { salt: 1 });
      alexFace(g);
      alexShirt(g);
      alexShorts(g);
      alexFeet(g);
      guitar(g, set([AP.wood]), set([AP.woodD]), set([AP.head]));
      titinaDetail(g);
    }
  });
  HD.family('titina', { match: function (k) { return /^titina\./.test(k); }, paint: function (g) { titinaDetail(g); } });

  /* =====================================================================================================
     ZOMBIES (base de sprites.js, músicos, pasajeros, 45 zvar, señoras, v013): un solo pintor guiado por color + accesorios por tipo
     ===================================================================================================== */
  var ZEYE = set(['#e9ecd5', '#eef0d2', '#a8ad8c', '#e8e4cc']), ZFAR = col('#a8ad8c'), ZBLIND = set(['#d6d1bf', '#cfcbbb']);
  var ZMOUTH = set(['#2a1515', '#241214', '#2c1a1c']), ZTONGUE = set(['#6a2a2c', '#7a2a2a']), ZBLOOD = set(['#5b1d1d', '#7a2a26', '#3a1518', '#9a3a30']);
  var ZSKIN = set(['#93a083', '#5f6b55', '#b4be9a', '#3f4a44', '#7f8c71', '#a3ad8a', '#3a3f46', '#575d66', '#7a8189', '#a2a8aa', '#4d4543', '#736760', '#9a8d7d', '#c2b7a0',
    '#47432f', '#6b663c', '#948a52', '#bab172', '#38343f', '#524c5e', '#736d7c', '#989299', '#38292a', '#573f35', '#7a5a45', '#9f7d62', '#8a9a7c', '#4a4a34']);
  function zskin(c) { return !!(c && (ZSKIN[c] || sk(c))); }
  var EYE_KINDS = ['milky', 'red', 'pin', 'yellow'];

  function zEyes(g) {
    var cand = g.find(ZEYE).filter(function (p) {
      var x = p[0], y = p[1], near = 0;
      if (ZMOUTH[g.at(x, y + 1)] || ZMOUTH[g.at(x - 1, y)] || ZMOUTH[g.at(x + 1, y)] || ZTONGUE[g.at(x, y + 1)]) return false;   // dientes de la boca abierta
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { if (zskin(g.at(x + d[0], y + d[1]))) near++; });
      return near >= 1;
    });
    if (!cand.length) return [];
    var minY = Math.min.apply(null, cand.map(function (p) { return p[1]; }));
    cand = cand.filter(function (p) { return p[1] === minY; }).sort(function (a, b) { return a[0] - b[0]; });
    var groups = [];
    cand.forEach(function (p) { var l = groups[groups.length - 1]; if (l && l.x + l.n === p[0]) l.n++; else groups.push({ x: p[0], y: p[1], n: 1, far: g.at(p[0], p[1]) === ZFAR }); });
    return groups.slice(0, 2);
  }
  function zEyePaint(g, e, kind, i, lite) {
    var X = 2 * e.x, Y = 2 * e.y, wdt = 2 * e.n, skin = g.at(e.x, e.y + 1);
    if (!zskin(skin)) skin = g.at(e.x - 1, e.y);
    if (!zskin(skin)) skin = col('#7f8c71');
    var sock = T.shadowOf(skin, 0.58), sock2 = T.shadowOf(skin, 0.74), brow = T.shadowOf(skin, 0.5);
    var onSkin = function (X1, Y1) { return zskin(g.at(X1 >> 1, Y1 >> 1)) && !g.isOutline(X1, Y1); };
    // F5: cabeza chica / de perfil -> lectura limpia: el ojo lejano se hunde en la cuenca (sin blanco) y el cercano solo lleva ceja
    if (lite && e.far) {
      for (var a = 0; a < wdt; a++) { g.set(X + a, Y, sock2); g.set(X + a, Y + 1, a === wdt - 1 ? col('#8e927c') : sock2); }
      return;
    }
    if (lite) {
      for (var b = 0; b < wdt; b++) if (onSkin(X + b, Y - 1)) g.set(X + b, Y - 1, brow);
      for (var j0 = 0; j0 < wdt; j0++) { g.set(X + j0, Y, col('#e6e8cf')); g.set(X + j0, Y + 1, col('#c2c5ac')); }
      var p0 = X + ((g.seed >> (3 + i)) & 1 ? wdt - 1 : 0);
      if (kind === 'red') { g.set(p0, Y + 1, col('#9a2a22')); g.set(p0, Y, col('#c84a3a')); }
      else if (kind === 'pin') { for (var j4 = 0; j4 < wdt; j4++) { g.set(X + j4, Y, col('#2a2422')); g.set(X + j4, Y + 1, col('#2a2422')); } g.set(p0, Y, col('#f4f2c4')); }
      else if (kind === 'yellow') { for (var j5 = 0; j5 < wdt; j5++) g.set(X + j5, Y, col('#d8cf92')); g.set(p0, Y + 1, col('#141012')); }
      else g.set(p0, Y + 1, col('#9ea392'));
      return;
    }
    for (var k = -1; k <= wdt; k++) {
      if (onSkin(X + k, Y - 1)) g.set(X + k, Y - 1, k === -1 || k === wdt ? sock2 : brow);
      if (onSkin(X + k, Y + 2)) g.set(X + k, Y + 2, sock2);
    }
    if (onSkin(X - 1, Y)) g.set(X - 1, Y, sock); if (onSkin(X - 1, Y + 1)) g.set(X - 1, Y + 1, sock2);
    if (onSkin(X + wdt, Y)) g.set(X + wdt, Y, sock2); if (onSkin(X + wdt, Y + 1)) g.set(X + wdt, Y + 1, sock);
    var WH = e.far ? col('#b4b89c') : col('#e6e8cf'), WS = e.far ? col('#949880') : col('#c2c5ac');
    for (var j = 0; j < wdt; j++) { g.set(X + j, Y, WH); g.set(X + j, Y + 1, WS); }
    var px = X + ((g.seed >> (3 + i)) & 1 ? wdt - 1 : 0);
    if (kind === 'red') { g.set(px, Y + 1, col('#9a2a22')); g.set(px, Y, col('#c84a3a')); }
    else if (kind === 'pin') { for (var j2 = 0; j2 < wdt; j2++) { g.set(X + j2, Y, col('#1e1a1a')); g.set(X + j2, Y + 1, col('#2a2422')); } g.set(px, Y, col('#f4f2c4')); }
    else if (kind === 'yellow') { for (var j3 = 0; j3 < wdt; j3++) g.set(X + j3, Y, col('#d8cf92')); g.set(px, Y + 1, col('#141012')); }
    else { g.set(px, Y + 1, col('#9ea392')); }   // lechoso
  }
  // F5: ¿cabeza chica o de perfil? (zvar: ojo cercano + ojo lejano #a8ad8c pegados; cara de ≤ 10 px de ancho)
  function zNear(eyes) { for (var i = 0; i < eyes.length; i++) if (!eyes[i].far) return eyes[i]; return eyes[0] || null; }
  function zLite(g, eyes) {
    if (!eyes.length) return false;
    if (eyes.length === 1 || eyes[0].far || eyes[1].far) return true;
    if (eyes[1].x - (eyes[0].x + eyes[0].n) <= 1) return true;
    var e = eyes[0], w = 0;
    for (var x = 0; x < g.w; x++) { var c = g.at(x, e.y); if (zskin(c) || ZEYE[c] || ZBLIND[c]) w++; }
    return w <= 10;
  }
  function zMouth(g, eyeY) {
    var M = g.find(ZMOUTH).filter(function (p) { return p[1] > eyeY; });
    if (!M.length) return;
    var b = bboxOf(M), salt = g.seed;
    M.forEach(function (p) {
      var x = p[0], y = p[1], X = 2 * x, Y = 2 * y, top = !ZMOUTH[g.at(x, y - 1)], bot = !ZMOUTH[g.at(x, y + 1)] && !ZTONGUE[g.at(x, y + 1)];
      for (var q = 0; q < 2; q++) {
        var gap = T.hash3(X + q - 2 * b.x0, 1, salt) < 0.28;
        if (top) g.set(X + q, Y, gap ? col('#160c0c') : ((X + q) % 2 ? col('#cfc8a4') : col('#a9a284')));
        else g.set(X + q, Y, col('#1c0e0e'));
        if (bot && T.hash3(X + q - 2 * b.x0, 2, salt) < 0.5) g.set(X + q, Y + 1, col('#b8b090'));
      }
    });
    // babeo: la sangre bajo la boca chorrea un píxel más
    g.find(ZBLOOD).forEach(function (p) { if (ZMOUTH[g.at(p[0], p[1] - 1)] || ZTONGUE[g.at(p[0], p[1] - 1)]) { var X = 2 * p[0] + (salt & 1), Y = 2 * p[1] + 2; if (zskin(g.at(X >> 1, Y >> 1))) g.set(X, Y, col('#5b1d1d')); } });
  }
  // heridas, puntadas y venas en la cara: posición relativa al primer ojo (estable entre cuadros)
  function zScars(g, e, lite) {
    var X0 = 2 * e.x, Y0 = 2 * e.y, r = g.rnd(31), n = lite ? 1 : 1 + (r() < 0.6 ? 1 : 0), opts = lite ? [0, 1, 2] : [0, 1, 2, 3, 4], picked = [];
    while (picked.length < n) { var k = opts.splice(Math.floor(r() * opts.length), 1)[0]; picked.push(k); }
    var ok = function (X, Y) { return zskin(g.at(X >> 1, Y >> 1)) && !g.isOutline(X, Y) && !ZEYE[g.at(X >> 1, Y >> 1)]; };
    var put = function (X, Y, c) { if (ok(X, Y)) g.set(X, Y, c); };
    var skin = g.at(e.x, e.y + 1); if (!zskin(skin)) skin = col('#7f8c71');
    var flip = r() < 0.5 ? 1 : -1, ox = flip > 0 ? 0 : 2 * e.n - 1;
    picked.forEach(function (k) {
      if (k === 0) {                                   // puntadas en la mejilla
        for (var i = lite ? 1 : 0; i < (lite ? 4 : 5); i++) { put(X0 + ox + flip * (i - 2), Y0 + 4, col('#2a2420')); if (i % 2 === 0) { put(X0 + ox + flip * (i - 2), Y0 + 3, col('#4a443a')); put(X0 + ox + flip * (i - 2), Y0 + 5, col('#4a443a')); } }
      } else if (k === 1) {                            // tajo en la frente
        for (var j = 0; j < 4; j++) { put(X0 + 1 + j * flip, Y0 - 4 - (j >> 1), col('#7a2a26')); put(X0 + 1 + j * flip, Y0 - 3 - (j >> 1), col('#3a1518')); }
      } else if (k === 2) {                            // venas en la sien
        var vx = X0 - 2 * flip + ox, vy = Y0 - 1;
        [[0, 0], [0, -1], [-1, -2], [-1, -3], [-2, -4], [0, -3], [1, -4]].forEach(function (d) { put(vx + d[0] * flip, vy + d[1], col('#5a5870')); });
      } else if (k === 3) {                            // podredumbre: parche oscuro con puntos claros
        // F5: parche liso (antes alternaba tonos en damero) con un solo punto claro
        for (var a = 0; a < 3; a++) for (var b2 = 0; b2 < 2; b2++) put(X0 + ox - flip * (2 + a), Y0 + 6 + b2, b2 ? T.shadowOf(skin, 0.74) : T.shadowOf(skin, 0.82));
        put(X0 + ox - flip * 3, Y0 + 6, T.lightOf(skin, 0.3));
      } else {                                         // cicatriz cosida vertical
        for (var i2 = 0; i2 < 4; i2++) { put(X0 + 2 * e.n + 1, Y0 - 2 + i2 * 2, col('#2a2420')); put(X0 + 2 * e.n, Y0 - 1 + i2 * 2, col('#2a2420')); put(X0 + 2 * e.n + 2, Y0 - 1 + i2 * 2, col('#4a443a')); }
      }
    });
    // piel moteada en la cabeza (F5: solo en cabezas grandes y de frente; en las chicas ensuciaba la cara)
    if (!lite) for (var Y = Y0 - 12; Y <= Y0 + 10; Y++) for (var X = X0 - 10; X <= X0 + 12; X++) {
      if (!ok(X, Y)) continue;
      var h = T.hash3(X - X0, Y - Y0, g.seed);
      if (h < 0.03) g.set(X, Y, T.shadowOf(g.get(X, Y), 0.88)); else if (h > 0.985) g.set(X, Y, T.lightOf(g.get(X, Y), 0.12));
    }
  }
  // ropa rasgada: muescas en la basta y un desgarrón con piel debajo (relativo al ojo)
  function zClothes(g, e) {
    var bb = g.bbox(), yTop = e ? e.y + 4 : Math.round(bb.y0 + (bb.y1 - bb.y0) * 0.35), X0 = e ? 2 * e.x : 0;
    for (var y = yTop; y <= bb.y1 - 2; y++) for (var x = bb.x0; x <= bb.x1; x++) {
      var c = g.at(x, y); if (!c || g.edge(x, y) || zskin(c) || T.isInk(c) || ZBLOOD[c] || lum(c) < 40) continue;
      var s = g.at(x, y + 1);
      // F5: muescas solo en la basta de verdad (abajo vacío/contorno o una prenda muy distinta), nunca entre los tonos de una
      // misma tela (los uniformes blancos se llenaban de píxeles sueltos); muesca de 2 px HD, no píxel suelto
      var hem = s === 0 || g.edge(x, y + 1) || (!zskin(s) && T.dist(s, c) > 9000 && Math.abs(lum(s) - lum(c)) > 40);
      if (s !== c && !ZBLOOD[s] && hem && T.hash3(x - (X0 >> 1), 9, g.seed) < 0.3) {
        quad(g, x, y, function (X, Y, q) { if (q >= 2) g.set(X, Y, T.deep(c)); });
      }
    }
    if (!e) return;
    var r = g.rnd(57), tx = 2 * e.x + Math.round((r() - 0.3) * 8), ty = 2 * e.y + 13 + Math.floor(r() * 5), dir = r() < 0.5 ? 1 : -1;
    for (var i = 0; i < 4; i++) {
      var X = tx + i * dir, Y = ty + i, c2 = g.at(X >> 1, Y >> 1);
      if (!c2 || zskin(c2) || g.isOutline(X, Y) || T.isInk(c2)) continue;
      g.set(X, Y, T.deep(c2)); if (i === 1 || i === 2) { var c3 = g.at((X + dir) >> 1, Y >> 1); if (c3 === c2) g.set(X + dir, Y, col('#7f8c71')); }
    }
  }

  /* accesorios por tipo (zombies de frente de sprites.js) */
  var ACC = {
    cobrador: function (g) {
      var CAP = col('#8f3d35'), capL = g.find(set([CAP]));
      if (capL.length) {
        var b = bboxOf(capL);
        capL.forEach(function (p) { quad(g, p[0], p[1], function (X, Y, q) {
          if (p[1] === b.y1 && q >= 2) g.set(X, Y, col('#5e2420'));                    // sombra de la visera
          else if (p[1] === b.y0 && q < 2 && X % 3) g.set(X, Y, col('#b85a4e'));
        }); });
        var cx = b.x0 + b.x1 + 1; g.set(cx, 2 * b.y1 - 1, col('#d8c070')); g.set(cx - 1, 2 * b.y1 - 1, col('#a89040'));   // placa genérica
      }
      // canguro: cierre y billetes asomando
      var BEL = col('#5a3a22'), BAG = col('#754b2c'), bag = g.find(set([BAG]));
      if (bag.length) {
        var bb = bboxOf(bag), Yt = 2 * bb.y0, Ym = 2 * bb.y0 + 3;
        for (var X = 2 * bb.x0; X <= 2 * bb.x1 + 1; X++) {
          if (g.from(X, Ym, set([BAG]))) g.set(X, Ym, X % 2 ? col('#c9c5b5') : col('#4a2e1a'));
          if (g.from(X, Yt, set([BAG, BEL])) && X > 2 * bb.x0 + 1 && X < 2 * bb.x0 + 6) g.set(X, Yt, X % 2 ? col('#8aa070') : col('#6f8a5a'));
          if (g.from(X, Yt + 1, set([BAG])) && X > 2 * bb.x0 + 2 && X < 2 * bb.x0 + 5) g.set(X, Yt + 1, col('#5a7048'));
        }
      }
      // monedas con brillo
      g.find(set(['#e0c24a', '#f2dc7a', '#b99a32'])).forEach(function (p) {
        var X = 2 * p[0], Y = 2 * p[1]; g.set(X, Y, col('#fff0a0')); g.set(X + 1, Y, col('#e0c24a')); g.set(X, Y + 1, col('#c8a838')); g.set(X + 1, Y + 1, col('#8a6a20'));
      });
    },
    escolar: function (g) {
      var STR = col('#3b4f8a'), SH = col('#dcdcd4'), straps = g.find(set([STR]));
      // tirantes de mochila acolchados con hebilla
      var byX = {}; straps.forEach(function (p) { (byX[p[0]] = byX[p[0]] || []).push(p[1]); });
      Object.keys(byX).forEach(function (k) {
        var ys = byX[k], x = +k, yb = Math.max.apply(null, ys) - 1;
        ys.forEach(function (y) { quad(g, x, y, function (X, Y, q) { g.set(X, Y, (q & 1) ? col('#2c3c6c') : col('#4a62a0')); }); });
        g.set(2 * x, 2 * yb, col('#c8c0a0')); g.set(2 * x + 1, 2 * yb, col('#8a846c')); g.set(2 * x, 2 * yb + 1, col('#8a846c'));
      });
      // camisa: botones al centro, insignia genérica en el pecho
      var sh = g.find(set([SH])); if (!sh.length) return;
      var b = bboxOf(sh), cx = b.x0 + b.x1 + 1;
      for (var Y = 2 * b.y0 + 2; Y < 2 * b.y1; Y += 3) if (g.from(cx, Y, set([SH]))) g.set(cx, Y, col('#9a9a92'));
      for (var Y2 = 2 * b.y0 + 1; Y2 < 2 * b.y1; Y2++) if (g.from(cx - 1, Y2, set([SH])) && Y2 % 3 !== 2) g.set(cx - 1, Y2, col('#c6c6be'));
      var ix = cx + 3, iy = 2 * b.y0 + 3;
      [[0, 0, '#2b3a6a'], [1, 0, '#2b3a6a'], [2, 0, '#2b3a6a'], [0, 1, '#2b3a6a'], [1, 1, '#d8c070'], [2, 1, '#2b3a6a'], [1, 2, '#2b3a6a']].forEach(function (d) { if (g.from(ix + d[0], iy + d[1], set([SH]))) g.set(ix + d[0], iy + d[1], col(d[2])); });
      // pantalón gris: raya
      g.find(set(['#7a7c80'])).forEach(function (p) { quad(g, p[0], p[1], function (X, Y, q) { if ((q & 1) && (p[0] % 2)) g.set(X, Y, col('#6a6c70')); }); });
    },
    ciego: function (g) {
      var band = g.find(ZBLIND); if (!band.length) return;
      var rows = {}; band.forEach(function (p) { (rows[p[1]] = rows[p[1]] || []).push(p[0]); });
      var ey = +Object.keys(rows).sort(function (a, b) { return rows[b].length - rows[a].length; })[0], xs = rows[ey].sort(function (a, b) { return a - b; });
      var x0 = xs[0], x1 = xs[xs.length - 1], mid = (x0 + x1 + 1) / 2, Y = 2 * ey, frame = col('#2a2830'), lens = col('#1a1920'), glint = col('#7a8098'), crack = col('#9aa0b0');
      for (var X = 2 * x0; X <= 2 * x1 + 1; X++) { g.set(X, Y, frame); g.set(X, Y + 1, frame); }
      [[mid * 2 - 7, mid * 2 - 2], [mid * 2 + 1, mid * 2 + 6]].forEach(function (L, i) {
        for (var X2 = Math.round(L[0]); X2 <= Math.round(L[1]); X2++) for (var Y2 = Y; Y2 <= Y + 2; Y2++) {
          if (Y2 === Y + 2 && (X2 === Math.round(L[0]) || X2 === Math.round(L[1]))) continue;
          g.set(X2, Y2, lens);
        }
        g.set(Math.round(L[0]) + 1, Y, glint); g.set(Math.round(L[0]) + 2, Y, glint);
        if (i === ((g.seed & 1))) {            // un lente partido deja ver el ojo lechoso
          g.set(Math.round(L[0]) + 3, Y + 1, col('#e6e8cf')); g.set(Math.round(L[0]) + 2, Y + 1, crack); g.set(Math.round(L[0]) + 4, Y + 2, crack);
        }
      });
      g.set(Math.round(mid * 2 - 1), Y + 1, frame); g.set(Math.round(mid * 2), Y + 1, frame);
    }
  };
  ACC.escolarSling = ACC.escolar;

  HD.family('zombie', {
    match: function (k) { return /^zombie\./.test(k) || /^zvar\./.test(k); },
    paint: function (g, src, info) {
      var eyes = zEyes(g), kinds = EYE_KINDS.slice(), r = g.rnd(5);
      var k1 = kinds.splice(Math.floor(r() * kinds.length), 1)[0], k2 = r() < 0.7 ? kinds[Math.floor(r() * kinds.length)] : k1;
      if (/ciego/.test(g.key) || g.kind === 'ciego') { k1 = 'milky'; k2 = 'milky'; }
      if (g.v === 3) k1 = 'red';                                   // F3: la variante 3 siempre con el ojo cercano rojo
      var lite = zLite(g, eyes);
      eyes.forEach(function (e, i) { zEyePaint(g, e, i ? k2 : k1, i, lite); });
      var e0 = zNear(eyes);
      zMouth(g, e0 ? e0.y : 0);
      if (e0) zScars(g, e0, lite);
      zClothes(g, e0);
      var m = /^zombie\.(\w+)/.exec(g.key);
      if (m && ACC[m[1]]) ACC[m[1]](g, info);
      // pelo de zombi: mechones ralos
      var HAIRS = set(['#3a322c', '#2c2826', '#332c28', '#2a2420', '#34261f', '#2a1a22']);
      paintHair(g, HAIRS, col('#3a322c'), { salt: 2 });
    }
  });

  /* =====================================================================================================
     VARIANTES POR INSTANCIA (F3) + accesorios del tipo en pieles zvar (F8)
     Corre DESPUÉS de la familia (hd.js variantPainter), así vale también para los zvar de Miraflores / Costa Verde / Barranco.
     Ranura 0 = la figura de siempre. 1..5: piel, pelo (o calvicie), ropa, un accesorio y una mancha en otro lugar.
     Todo se ancla al ojo cercano 1× y a los colores 1× -> igual en todos los cuadros y direcciones del mismo zombi.
     ===================================================================================================== */
  var VHAIR = set(['#3a322c', '#2c2826', '#332c28', '#2a2420', '#34261f', '#2a1a22',
    '#0e0c0e', '#241e1f', '#3e3434', '#5a4c46', '#1c120f', '#3a2519', '#5e402b', '#85603f', '#3a3a3a', '#6a6964', '#9a988e', '#c4c1b3',
    '#4a3c20', '#7a6636', '#a88f4c', '#cdb468', '#3a1812', '#6a2c1c', '#984628', '#c4683a']);
  // pieles «genéricas» (ropa libre): las de Callao/Cerro sin disfraz que las identifique; uniformes y disfraces no cambian de color
  var VGENERIC = /^(zvar\.(camina|cojo|muletas|silla|gusano|cuatro|skate|bici|moto|carretilla|cantor|senoraBalde|senoraOlla)_|zombie\.caminante\.)/;
  var VSPEC = [null,
    { skin: '#c8c6b4', sa: 0.32, sl: 1.1, hair: '#9a988e', cloth: '#8a3a34', acc: 'panuelo', scarf: '#c8483a' },
    { skin: '#8a9094', sa: 0.45, sl: 0.97, hair: '#3e3434', bald: true, cloth: '#34507a', acc: 'corbata' },
    { skin: '#9aa0a4', sa: 0.3, sl: 1.04, hair: '#984628', cloth: '#5a6a3a', acc: 'lentes' },
    { skin: '#c4bc94', sa: 0.28, sl: 1.06, hair: '#a88f4c', cloth: '#8a6a3a', acc: 'barba' },
    { skin: '#8c8496', sa: 0.32, sl: 0.98, hair: '#2a2a34', cloth: '#5a3a6a', acc: 'parche', scarf: '#d8c060' }];
  function hsv(c) {
    var r = T.R(c) / 255, gg = T.G(c) / 255, b = T.B(c) / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), d = mx - mn, h = 0;
    if (d > 1e-6) { if (mx === r) h = ((gg - b) / d) % 6; else if (mx === gg) h = (b - r) / d + 2; else h = (r - gg) / d + 4; h *= 60; if (h < 0) h += 360; }
    return { h: h, s: mx ? d / mx : 0, v: mx };
  }
  function hueD(a, b) { var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
  function chroma(c) { var s = T.R(c) + T.G(c) + T.B(c) + 3; return [3 * T.R(c) / s, 3 * T.G(c) / s, 3 * T.B(c) / s]; }
  function sameChroma(a, b) { var p = chroma(a), q = chroma(b); return Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) < 0.3; }
  // el color destino con la luminancia del actual (conserva el sombreado ya pintado)
  function tintLum(c, target, amt, lf) {
    var L = lum(c) * (lf || 1), Lt = lum(target) || 1, f = L / Lt;
    return mix(c, T.pack(T.R(target) * f, T.G(target) * f, T.B(target) * f, T.A(c)), amt);
  }
  function vCloth(g, e, sp) {
    var y0 = e ? e.y + 5 : Math.round(g.h * 0.35), y1 = Math.min(g.h - 1, y0 + 7), cnt = {}, best = 0, D = 0, x, y, c;
    for (y = y0; y <= y1; y++) for (x = 0; x < g.w; x++) {
      c = g.fillAt(x, y); if (!c || ZSKIN[c] || VHAIR[c] || ZBLOOD[c] || ZEYE[c] || ZMOUTH[c] || T.isInk(c) || lum(c) < 35) continue;
      cnt[c] = (cnt[c] || 0) + 1; if (cnt[c] > best) { best = cnt[c]; D = c; }
    }
    if (best < 4) return null;
    var hd = hsv(D), low = hd.s < 0.14, CL = {}, n = 0;
    for (y = e ? e.y + 4 : 0; y < g.h; y++) for (x = 0; x < g.w; x++) {
      c = g.fillAt(x, y); if (!c || CL[c] || ZSKIN[c] || ZBLOOD[c] || ZEYE[c] || ZMOUTH[c] || T.isInk(c)) continue;
      var h = hsv(c);
      if (low ? (h.s < 0.16 && lum(c) >= 60) : (h.s >= 0.12 && hueD(h.h, hd.h) < 22)) { CL[c] = 1; n++; }
    }
    var tgt = col(sp.cloth);
    if (!low && hueD(hsv(tgt).h, hd.h) < 35) {                       // la tela ya era de ese tono: otro de reserva, lejos del original
      var ALT = ['#34507a', '#5a6a3a', '#2f5e5a', '#6a5a2a', '#4a3a5a'], vi = VSPEC.indexOf(sp) - 1;
      tgt = col(ALT[vi]); if (hueD(hsv(tgt).h, hd.h) < 35) tgt = col(ALT[(vi + 2) % 5]);
    }
    return n ? { set: CL, tgt: tgt, amt: low ? 0.36 : 0.72, y0: e ? e.y + 4 : 0, desat: low ? 0.35 : 0.2 } : null;
  }
  function vRecolor(g, e, sp, generic) {
    var bb = g.bbox(), hairY = e ? e.y + 4 : bb.y0 + 6, CLO = generic ? vCloth(g, e, sp) : null;
    var skT = col(sp.skin), hrT = col(sp.hair), W = g.W, H = g.H, d = g.d;
    // luminancia media del pelo 1× (para pasar de negro a rubio sin perder el sombreado)
    var hs = 0, hn = 0, x, y;
    for (y = bb.y0; y <= Math.min(hairY, bb.y1); y++) for (x = bb.x0; x <= bb.x1; x++) { var c0 = g.fillAt(x, y); if (VHAIR[c0]) { hs += lum(c0); hn++; } }
    var hairF = hn ? lum(hrT) / Math.max(12, hs / hn) : 1;
    for (var Y = 0; Y < H; Y++) for (var X = 0; X < W; X++) {
      var i = Y * W + X, cur = d[i]; if (!cur || !g.in(X, Y)) continue;
      var x1 = X >> 1, y1 = Y >> 1, s = g.fillAt(x1, y1), ol = g.isOutline(X, Y);
      if (ZSKIN[s]) { if (ol || sameChroma(cur, s)) d[i] = tintLum(cur, skT, sp.sa, ol ? 1 : sp.sl); }
      else if (VHAIR[s] && y1 <= hairY) { var L = lum(cur) * hairF, f = L / (lum(hrT) || 1); d[i] = mix(cur, T.pack(T.R(hrT) * f, T.G(hrT) * f, T.B(hrT) * f), 0.9); }
      else if (CLO && CLO.set[s] && y1 >= CLO.y0 && (ol || !ZBLOOD[g.at(x1, y1)])) {
        var tc = tintLum(cur, CLO.tgt, CLO.amt), gl = lum(tc);
        d[i] = mix(tc, T.pack(gl, gl, gl * 1.03), CLO.desat);                 // tela apagada, como el resto de la paleta
      }
    }
    // calvicie: las 2 filas de arriba del pelo pasan a piel (si no hay gorro encima y queda pelo abajo)
    if (sp.bald) {
      var H1 = []; for (y = bb.y0; y <= hairY; y++) for (x = bb.x0; x <= bb.x1; x++) if (VHAIR[g.fillAt(x, y)]) H1.push([x, y]);
      if (H1.length >= 8) {
        var hb = bboxOf(H1), hat = false;
        H1.forEach(function (p) { var up = g.fillAt(p[0], p[1] - 1); if (p[1] === hb.y0 && up && !VHAIR[up]) hat = true; });
        if (!hat && hb.y1 - hb.y0 >= 3) {
          var skB = 0, sn = 0; for (y = hb.y0; y <= hairY; y++) for (x = bb.x0; x <= bb.x1; x++) { var c1 = g.fillAt(x, y); if (ZSKIN[c1] && (!skB || lum(c1) > lum(skB))) { skB = c1; sn++; } }
          if (sn) {
            skB = tintLum(skB, skT, sp.sa, sp.sl);
            H1.forEach(function (p) {
              if (p[1] > hb.y0 + 1) return;
              quad(g, p[0], p[1], function (X2, Y2) { g.set(X2, Y2, Y2 === 2 * hb.y0 ? T.lightOf(skB, 0.14) : (Y2 === 2 * hb.y0 + 3 ? T.shadowOf(skB, 0.9) : skB)); });
              for (var q = 0; q < 4; q++) { var X3 = 2 * p[0] + (q & 1), Y3 = 2 * p[1] + (q >> 1); if (g.isOutline(X3, Y3)) g.set(X3, Y3, T.deep(skB)); }
            });
          }
        }
      }
    }
  }
  function onSrc(g, X, Y, ok) { return g.in(X, Y) && !g.isOutline(X, Y) && ok(g.fillAt(X >> 1, Y >> 1)); }
  function notSkin(c) { return c && !ZSKIN[c] && !VHAIR[c] && !ZEYE[c]; }
  function headish(c) { return c && (ZSKIN[c] || VHAIR[c] || ZEYE[c]); }
  // borde delantero (derecha: los zvar miran a la derecha) de la ropa en la fila y
  function frontX(g, y, ok) { for (var x = g.w - 1; x >= 0; x--) if (g.op(x, y) && !g.edge(x, y) && ok(g.fillAt(x, y))) return x; return -1; }
  function backX(g, y, ok) { for (var x = 0; x < g.w; x++) if (g.op(x, y) && !g.edge(x, y) && ok(g.fillAt(x, y))) return x; return -1; }
  function vGlasses(g, e, lens, frame) {
    var X = 2 * e.x, Y = 2 * e.y, wd = 2 * e.n, fr = col(frame || '#1c1a22');
    for (var k = -1; k <= wd; k++) { g.set(X + k, Y - 1, fr); g.set(X + k, Y + 2, fr); }
    g.set(X - 1, Y, fr); g.set(X - 1, Y + 1, fr); g.set(X + wd, Y, fr); g.set(X + wd, Y + 1, fr);
    if (lens) { for (var a = 0; a < wd; a++) { g.set(X + a, Y, col(lens)); g.set(X + a, Y + 1, col(lens)); } g.set(X, Y, col('#7a8098')); }
    else g.set(X + wd - 1, Y, col('#f4f6f0'));
    for (var t = 2; t <= 7; t++) { if (!onSrc(g, X - t, Y, headish)) break; g.set(X - t, Y, fr); }      // patilla hacia la oreja
  }
  function vAcc(g, e, sp, acc) {
    var X = 2 * e.x, Y = 2 * e.y, ry = e.y + 5;
    if (acc === 'panuelo') {                       // pañuelo al cuello con la punta hacia abajo
      var sc = col(sp.scarf || '#c8483a'), sd = T.shadowOf(sc, 0.72);
      for (var x = e.x - 5; x <= e.x + 2; x++) for (var q = 0; q < 2; q++) { var XX = 2 * x + q; if (onSrc(g, XX, 2 * ry, function (c) { return c && !ZEYE[c]; })) { g.set(XX, 2 * ry, sc); g.set(XX, 2 * ry + 1, (XX % 3) ? sc : sd); } }
      var tx = X - 2; g.set(tx, 2 * ry + 2, sc); g.set(tx + 1, 2 * ry + 2, sd); g.set(tx, 2 * ry + 3, sd);
    } else if (acc === 'corbata') {                // corbata en el pecho, al borde delantero de la ropa
      var fx = frontX(g, ry + 2, notSkin); if (fx < 0) return;
      var TX = 2 * fx - 2, tc = col('#6a1e24'), tl = col('#a8343a');
      for (var j = 0; j < 9; j++) { var w2 = j < 2 ? 2 : (j < 7 ? 2 : 1); for (var a = 0; a < w2; a++) if (onSrc(g, TX + a, 2 * ry + j, notSkin)) g.set(TX + a, 2 * ry + j, j < 2 ? T.shadowOf(tc, 0.8) : ((j + a) % 3 ? tc : tl)); }
    } else if (acc === 'lentes') vGlasses(g, e, null, '#2a2228');
    else if (acc === 'barba') {                    // barba corta y lisa (sin moteado): mejilla y mentón detrás de la boca
      var bc = col('#3a322c');
      for (var y = e.y + 2; y <= e.y + 4; y++) for (var x2 = e.x - 4; x2 <= e.x + 3; x2++) {
        var s = g.fillAt(x2, y); if (!ZSKIN[s] || ZMOUTH[g.at(x2, y)]) continue;
        quad(g, x2, y, function (X2, Y2) { if (Y2 >= 2 * e.y + 5) g.set(X2, Y2, mix(g.get(X2, Y2), bc, 0.7)); });
      }
    } else if (acc === 'parche') {                 // parche en el ojo cercano, con su tira hacia la nuca
      var pc = col('#1a1618');
      for (var yy = Y - 1; yy <= Y + 2; yy++) for (var xx = X - 1; xx <= X + 2 * e.n; xx++) g.set(xx, yy, pc);
      g.set(X, Y - 1, col('#3a3436'));
      g.line(X - 2, Y - 1, X - 9, Y - 5, col('#2a2426'), function (X2, Y2) { return onSrc(g, X2, Y2, headish); });
    }
  }
  function vStain(g, e) {                          // mancha de sangre en la ropa, en otro lugar por variante
    var r = g.rnd(91), cx = 2 * (e.x - 3 + Math.floor(r() * 6)), cy = 2 * (e.y + 7 + Math.floor(r() * 5));
    [[0, 0, '#5b1d1d'], [1, 0, '#7a2a26'], [0, 1, '#7a2a26'], [1, 1, '#5b1d1d'], [2, 1, '#5b1d1d'], [1, 2, '#3a1518'], [1, 3, '#5b1d1d']].forEach(function (p) {
      if (onSrc(g, cx + p[0], cy + p[1], notSkin)) g.set(cx + p[0], cy + p[1], col(p[2]));
    });
  }
  // F8: el tipo del zombi (cobrador / ciego / escolar) sobre una piel zvar de perfil
  var KACC = {
    cobrador: function (g, e) {
      var bb = g.bbox(), top = -1, x, y;
      // la coronilla: lo opaco más alto sobre el ojo (pelo, piel o un gorro/casco: el gorro también pasa a ser la gorra roja)
      for (y = bb.y0; y <= e.y && top < 0; y++) for (x = e.x - 6; x <= e.x + 3; x++) if (g.op(x, y) && !g.edge(x, y)) { top = y; break; }
      if (top < 0) return;
      var hatRows = 0; for (y = top; y < e.y - 1; y++) { var hatty = false; for (x = e.x - 6; x <= e.x + 4; x++) { var c0 = g.fillAt(x, y); if (c0 && !headish(c0)) hatty = true; } if (hatty) hatRows++; }
      var y1c = Math.min(top + Math.max(1, Math.min(3, hatRows)), e.y - 1);
      var CAP = col('#8f3d35'), CL = col('#b85a4e'), CD = col('#5e2420');
      for (y = top; y <= y1c; y++) for (x = e.x - 6; x <= e.x + 4; x++) {
        var cy0 = g.fillAt(x, y); if (!cy0 || ZEYE[cy0] || (hatRows && ZSKIN[cy0] && y > top + 1)) continue;
        quad(g, x, y, function (X, Y) { g.set(X, Y, Y === 2 * top ? CL : (Y === 2 * y1c + 1 ? CD : CAP)); });
        for (var q = 0; q < 4; q++) { var X1 = 2 * x + (q & 1), Y1 = 2 * y + (q >> 1); if (g.isOutline(X1, Y1)) g.set(X1, Y1, T.deep(CAP)); }
      }
      var fx = frontX(g, y1c, function (c) { return !!c; }); if (fx < 0) fx = e.x;
      g.set(2 * fx - 1, 2 * y1c + 1, CD); g.set(2 * fx, 2 * y1c + 1, CD); g.set(2 * fx + 1, 2 * y1c + 1, CD);          // visera
      g.set(2 * fx - 3, 2 * top + 1, col('#d8c070')); g.set(2 * fx - 4, 2 * top + 1, col('#a89040'));                // placa genérica
      // canguro al frente con cierre y billetes
      var by = Math.min(g.h - 3, e.y + 10), bx = frontX(g, by, notSkin); if (bx < 0) return;
      var X0 = 2 * bx - 4, Y0 = 2 * by;
      for (var j = 0; j < 4; j++) for (var a = 0; a < 5; a++) if (onSrc(g, X0 + a, Y0 + j, notSkin)) g.set(X0 + a, Y0 + j, j === 1 ? ((a % 2) ? col('#c9c5b5') : col('#4a2e1a')) : (j === 0 ? col('#8a5a34') : col('#754b2c')));
      for (var b = 0; b < 3; b++) if (onSrc(g, X0 + 1 + b, Y0 - 1, notSkin)) g.set(X0 + 1 + b, Y0 - 1, b % 2 ? col('#8aa070') : col('#6f8a5a'));
      for (var w = 0; w < 9; w++) if (onSrc(g, X0 - 4 + w, Y0 + 1, notSkin) && !(w >= 4)) g.set(X0 - 4 + w, Y0 + 1, col('#5a3a22'));  // correa
    },
    ciego: function (g, e) {
      var X = 2 * e.x, Y = 2 * e.y, fr = col('#2a2830'), ln = col('#1a1920');
      var x1 = X + 2 * e.n + 3;                                                                            // hasta el ojo lejano
      for (var xx = X - 1; xx <= x1; xx++) { if (!g.in(xx, Y)) continue; g.set(xx, Y - 1, fr); g.set(xx, Y, ln); g.set(xx, Y + 1, ln); if (xx === X - 1 || xx === x1) g.set(xx, Y + 2, fr); }
      g.set(X, Y, col('#7a8098')); g.set(X + 1, Y, col('#5a6078'));
      if (g.seed & 1) { g.set(X + 1, Y + 1, col('#e6e8cf')); g.set(X + 2, Y + 1, col('#9aa0b0')); }          // lente partido: se ve el ojo lechoso
      for (var t = 2; t <= 8; t++) { if (!onSrc(g, X - t, Y, headish)) break; g.set(X - t, Y, fr); }
    },
    escolar: function (g, e) {
      var MB = col('#3b4f8a'), ML = col('#4a62a0'), MD = col('#2c3c6c'), y, rows = 0;
      // mochila color ladrillo (contrasta con buzos y uniformes azules); azul solo si la ropa ya es rojiza
      var red = 0, tot = 0;
      for (y = e.y + 5; y <= e.y + 9; y++) for (var x = 0; x < g.w; x++) { var cc = g.fillAt(x, y); if (!notSkin(cc) || T.isInk(cc)) continue; var hh = hsv(cc); if (hh.s < 0.2) continue; tot++; if (hueD(hh.h, 10) < 35) red++; }
      if (!(tot && red / tot > 0.4)) { MB = col('#9a4630'); ML = col('#b85c3c'); MD = col('#6a2c1e'); }
      for (y = e.y + 5; y <= Math.min(g.h - 4, e.y + 11); y++) {
        var bx = backX(g, y, notSkin), fx = frontX(g, y, notSkin); if (bx < 0 || fx - bx < 3) continue;
        rows++;
        for (var q = 0; q < 4; q++) { var X = 2 * bx + q, Yy = 2 * y; [Yy, Yy + 1].forEach(function (YY) { if (onSrc(g, X, YY, notSkin)) g.set(X, YY, q === 3 ? MD : (YY === 2 * (e.y + 5) ? ML : MB)); }); }   // mochila a la espalda
        var sx = 2 * bx + 4 + (y - e.y - 5);                                                              // tirante en diagonal
        if (y <= e.y + 8 && onSrc(g, sx, 2 * y, notSkin)) { g.set(sx, 2 * y, MD); g.set(sx, 2 * y + 1, MD); }
      }
      if (!rows) return;
      var iy = e.y + 7, ix = frontX(g, iy, notSkin); if (ix < 0) return;                                  // insignia genérica
      var IX = 2 * ix - 2, IY = 2 * iy;
      [[0, 0, '#2b3a6a'], [1, 0, '#2b3a6a'], [0, 1, '#2b3a6a'], [1, 1, '#d8c070']].forEach(function (p) { if (onSrc(g, IX + p[0], IY + p[1], notSkin)) g.set(IX + p[0], IY + p[1], col(p[2])); });
    }
  };
  HD.variantPainter('zombie-variante', {
    match: function (k) { return (/^zvar\./.test(k) || /^zombie\./.test(k)) && !/^zvar\.presidenta\./.test(k) && !/\.extra\./.test(k); },
    paint: function (g, v, kind) {
      var key = g.key, eyes = zEyes(g), e = zNear(eyes), dead = /\.dead\b/.test(key), generic = VGENERIC.test(key), sp = VSPEC[v];
      if (sp) vRecolor(g, e, sp, generic);
      if (!e || dead) return;
      if (sp) {
        var acc = sp.acc;
        if (!generic) acc = acc === 'panuelo' ? 'lentes' : acc === 'corbata' ? 'barba' : acc;
        if (kind === 'ciego' && (acc === 'lentes' || acc === 'parche')) acc = 'barba';
        if (kind === 'cobrador' && acc === 'parche') acc = 'barba';
        vAcc(g, e, sp, acc);
        vStain(g, e);
      }
      if (kind && KACC[kind] && /^zvar\./.test(key)) KACC[kind](g, e);
    }
  });

  /* =====================================================================================================
     ANIMALES: ojo con brillo, pelaje/plumas con trazos
     ===================================================================================================== */
  var AEYE1 = col('#141414'), AEYE2 = col('#0a0a0c');
  HD.family('animal', {
    match: function (k) { return /^npc\.(perro|gato|gatoVar|gallinazo|gallinazoHostil|gallina|gallinaVar)\b/.test(k) || /^npc\.gb\.perro/.test(k); },
    paint: function (g) {
      var bb = g.bbox();
      for (var y = bb.y0; y <= bb.y1; y++) for (var x = bb.x0; x <= bb.x1; x++) {
        var c = g.at(x, y); if (!c || g.edge(x, y)) continue;
        var L = lum(c), nb = 0;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var c2 = g.at(x + d[0], y + d[1]); if (c2 && c2 !== c && lum(c2) > L + 40) nb++; });
        if ((c === AEYE1 || c === AEYE2) && nb >= 2) {           // ojo
          var X = 2 * x, Y = 2 * y; g.set(X, Y, col('#f0ead8')); g.set(X + 1, Y, col('#141012')); g.set(X, Y + 1, col('#141012')); g.set(X + 1, Y + 1, col('#2a2018'));
        } else if (L >= 30) {                                                     // trazos de pelo / pluma
          quad(g, x, y, function (X, Y) { var h = (X * 2 + Y * 3) % 9; if (h === 0) g.set(X, Y, T.shadowOf(g.get(X, Y), 0.86)); else if (h === 3 && L > 60) g.set(X, Y, T.lightOf(g.get(X, Y), 0.08)); });
        }
      }
    }
  });

  /* gente viva de Callao: cara automática con iris oscuro + pelo */
  HD.family('humano', {
    match: function (k) { return /^npc\.(v011|gb|gbPasajero)\./.test(k) && !/^npc\.gb\.perro/.test(k); },
    face: true,
    paint: function (g) {
      var bb = g.bbox(), cnt = {};
      for (var y = bb.y0; y < bb.y0 + 6; y++) for (var x = bb.x0; x <= bb.x1; x++) { var c = g.at(x, y); if (c && !g.edge(x, y) && lum(c) < 70 && !sk(c)) cnt[c] = (cnt[c] || 0) + 1; }
      var best = 0, bc = 0; Object.keys(cnt).forEach(function (k) { if (cnt[k] > best) { best = cnt[k]; bc = +k; } });
      if (bc) { var HS = {}; HS[bc] = 1; paintHair(g, HS, bc, { salt: 3 }); }
    }
  });

  /* =====================================================================================================
     MARCADO
     ===================================================================================================== */
  function tagAll() {
    S = ACH.sprites || {};
    if (S.alex) HD.tagTree(S.alex, 'alex');
    if (S.titina) HD.tagTree(S.titina, 'titina');
    if (S.zombie) HD.tagTree(S.zombie, 'zombie');
    if (S.zvar) HD.tagTree(S.zvar, 'zvar');
    if (S.npc) HD.tagTree(S.npc, 'npc');
    if (S.v011 && S.v011.npc) HD.tagTree(S.v011.npc, 'npc.v011');
    if (S.gb) {
      HD.wrapFn(S.gb, 'npc', function (id, f) { return 'npc.gb.' + id + '.' + (f | 0); });
      HD.wrapFn(S.gb, 'pasajero', function (kind, f, z) { return (z ? 'zombie.gbPasajero.' : 'npc.gbPasajero.') + kind + '.' + (f | 0); });
    }
  }
  tagAll();
  // los niveles agregan skins a zvar/npc después: se vuelve a marcar al cargar (idempotente)
  window.addEventListener('load', function () { tagAll(); setTimeout(tagAll, 1500); });
  HD.tagCallao = tagAll;

  ACH.hdCallao = { tagAll: tagAll };
})();
