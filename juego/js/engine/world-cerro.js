/* ACHORADO — js/engine/world-cerro.js (v0.9, H1 + H7): nivel 2 «EL CERRO». 64 × 150 tiles, de sur (pie, inicio) a norte (cima, la cruz).
   Misma interfaz de mundo que world.js (ACH.world) más los campos del Cerro (SPEC v0.9 §3): slopeAt, lanes, restPoints, perches,
   waterSources, trashPiles, chickenSpawns, ollaComun, cisterna, cfgNoche, mototaxistas y spawns con O W V K.
   v0.13 (C4): world.zones = [{id, name, kicker, rows:[desde,hasta]}] (carteles de zona, los muestra cerro.js) y world.radio = {x, y, r} (prop 'radioPilas' de la terraza 30, junto a la escalera).
   v0.13 T2 (CE): escalinata en la última escalera (cols 27–34), huaicos que tapan la escalera A en las terrazas 60 y 80 (world.huaicos), 8 spawns más
   arriba (filas 10–50), world.respawnPick (reaparición 250–500 px por delante), world.arena (explanada de la Presidenta: home, box, 4 cilindros `arena`),
   world.nido (nido de gallinazos del basural), inExit solo con ACH.presidenta.crossOpen() e inExitRaw para routeCheck.
   Se registra como ACH.levels.cerro = { id, name, build() }. build() arma el mundo una sola vez y lo devuelve (buildProps lo deja como nuevo).

   H7 (colocación con el arte real): el cerro se genera con curvas de nivel onduladas, no con franjas rectas.
   · Terrazas (muros de pirca / cemento / llantas) en filas 10, 20 … 130. Cada muro baja o sube ±1 fila por tramos; la cara de cada muro se ve.
     Las casas se apoyan en el muro de arriba y dejan un rellano de 3 filas delante (la trocha). Entre casa y casa queda tierra (patios).
   · Franjas (de abajo a arriba): pie (calle de tierra con un tramo de asfalto roto, paradero, ladrillo de 2–3 pisos) · ladera baja (ladrillo 2–3 pisos,
     escalera amarilla, losa, olla común) · media (ladrillo 1–2 pisos + módulos pintados, zigzag, cisterna, quebrada del basural) · alta (esteras y triplay,
     lotes marcados con cal) · cima (roca, cruz, reservorio, antenas).
   · Suelo: se pinta por píxel en bakeExtra (mezcla de los tiles tierra / piedras / arena / roca por ruido suave, con tramado, vetas de erosión en el
     sentido de la pendiente y roca hacia la cima); las trochas se rasterizan siguiendo el zigzag (huellas del tile `trocha`).
   Leyenda de la grilla — sólidos: L lote · R roca · P cara de pirca · M cara de muro de cemento · Y cara de muro de llantas · B/b/y corona de terraza
   Caminables: . tierra · , tierra con piedras · a arena · k roca pisable (cima) · z trocha (rellano) · r rampa de tierra · q quebrada · s calle de tierra ·
   = asfalto roto · E escalera amarilla · e escalera gris · T escalera de tierra con tablones · o losa de cemento · c suelo bajo la cruz */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var T = 16, COLS = 64, ROWS = 150;

  var SOLID = { L: 1, R: 1, P: 1, M: 1, Y: 1, B: 1, b: 1, y: 1 };
  var STAIRS = { E: 1, e: 1, T: 1 };
  var NATURAL = { '.': 1, ',': 1, a: 1, k: 1, q: 1, s: 1, z: 1, t: 1, '=': 1 };

  function bandOf(r) { return r <= 9 ? 'cima' : r <= 49 ? 'alta' : r <= 99 ? 'media' : r <= 132 ? 'baja' : 'pie'; }
  var BAND_SLOPE = { cima: 1, alta: 2, media: 1, baja: 1, pie: 0 };

  /* ---------- utilidades ---------- */
  function mulberry(seed) {
    var a = seed | 0;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function h2(i, j, s) {
    var h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function sm(t) { return t * t * (3 - 2 * t); }
  function vn(x, y, s) {
    var i = Math.floor(x), j = Math.floor(y), fx = sm(x - i), fy = sm(y - j);
    var a = h2(i, j, s), b = h2(i + 1, j, s), c = h2(i, j + 1, s), d = h2(i + 1, j + 1, s);
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  }
  function fbm(x, y, s) { return vn(x, y, s) * 0.55 + vn(x * 2.1, y * 2.1, s + 7) * 0.3 + vn(x * 4.3, y * 4.3, s + 13) * 0.15; }
  function hsh(c, r) { var h = (c * 374761393 + r * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return (h ^ (h >>> 16)) >>> 0; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  var built = null;

  /* =========================================================================================================
     Terrazas
     ========================================================================================================= */
  var TW = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 113, 130];                 // fila de la corona del muro de cada terraza (nominal)
  var TN = TW.length;
  var TSTRIP = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 6, 0];                            // filas de rellano debajo de las casas de cada terraza
  var TBAND = ['alta', 'alta', 'alta', 'alta', 'media', 'media', 'media', 'media', 'media', 'baja', 'baja', 'pie'];
  var RB = [[44, 45], [50, 51], [12, 13], [50, 51], [46, 48], [8, 10], [46, 48], [8, 10], [46, 48], [52, 53], [52, 53], [52, 53]];   // ruta B (rampas / escalera gris)
  var CROWN = { P: 'B', M: 'b', Y: 'y', R: 'R' };
  var ROOFS = {
    estera: [['piedras', 'plastico'], ['estera', 'piedras'], ['lona', 'piedras'], ['calamina', 'piedras', 'tendal'], ['plastico', 'piedras', 'llantas'], ['lona', 'piedras', 'bidones']],
    triplay: [['piedras', 'tendal'], ['piedras', 'bidones'], ['piedras', 'antena'], ['piedras', 'llantas'], ['piedras', 'tanque'], ['piedras', 'macetas'], ['piedras', 'tendal', 'tanque']],
    ladrilloCerro: [['fierros', 'tanque'], ['fierros', 'tendal'], ['fierros', 'ladrillos'], ['tanque', 'antena', 'fierros'], ['fierros', 'bidones', 'antena'], ['fierros', 'llantas', 'tanque'], ['fierros', 'tendal', 'antena']],
    mixta: [['tanque', 'piedras'], ['tendal', 'piedras'], ['antena', 'piedras'], ['bidones', 'piedras'], ['tanque', 'antena'], ['tendal', 'tanque']],
    bodegaCerro: [['tanque', 'fierros']]
  };
  var FRONTS = {
    estera: [['macetas'], ['ropa'], ['balde'], ['bandera', 'macetas'], ['escoba', 'balde'], ['ropa', 'balde']],
    triplay: [['macetas', 'bidon'], ['ropa'], ['bandera'], ['balde', 'macetas'], ['ropa', 'bidon'], ['bandera', 'balde']],
    ladrilloCerro: [['medidor', 'bandera'], ['macetas', 'luz'], ['ropa', 'medidor'], ['gas', 'macetas'], ['luz', 'bandera', 'medidor'], ['ropa', 'luz'], ['medidor', 'macetas', 'bandera']],
    mixta: [['ropa', 'luz'], ['macetas'], ['bandera', 'balde'], ['medidor', 'ropa']],
    bodegaCerro: [['jabas', 'luz', 'gas']]
  };
  var PAINT_HI = ['azul', 'verde', 'turquesa', 'naranja', 'amarillo', 'rosado', 'celeste', 'menta'];

  function build() {
    if (built) return built;
    var t0 = (window.performance || Date).now();
    var rnd = mulberry(240917), r, c, i;
    var grid = [], lotAt = [];
    for (r = 0; r < ROWS; r++) {
      var row = [], lrow = [], b0 = bandOf(r);
      for (c = 0; c < COLS; c++) { row.push(b0 === 'cima' ? 'k' : '.'); lrow.push(-1); }
      grid.push(row); lotAt.push(lrow);
    }
    function inb(cc, rr) { return cc >= 0 && rr >= 0 && cc < COLS && rr < ROWS; }
    function setg(cc, rr, ch) { if (inb(cc, rr)) grid[rr][cc] = ch; }
    function fill(c0, c1, r0, r1, ch) { for (var rr = Math.max(0, r0); rr <= Math.min(ROWS - 1, r1); rr++) for (var cc = Math.max(0, c0); cc <= Math.min(COLS - 1, c1); cc++) grid[rr][cc] = ch; }

    /* ---------------- 1. muros de terraza: fila, alto de cara y material por columna ---------------- */
    var wrow = [], wface = [], wkind = [], wend = [];
    var FLAT = { 6: [[31, 48]], 10: [[0, 16]], 9: [], 11: [[0, 63]] };            // tramos sin ondulación (la cisterna, la olla común y el pie)
    FLAT[10] = [[0, 16]]; FLAT[6] = [[31, 48]]; FLAT[11] = [[0, 63]];
    function kindPick(ti, q) {
      if (ti === 0) return q < 0.55 ? 'R' : 'P';
      if (ti <= 3) return q < 0.5 ? 'P' : (q < 0.82 ? 'Y' : 'P');
      if (ti === 4) return q < 0.5 ? 'P' : (q < 0.75 ? 'Y' : 'M');
      if (ti <= 8) return q < 0.55 ? 'P' : (q < 0.85 ? 'Y' : 'M');
      return ti === 11 ? (q < 0.5 ? 'M' : 'P') : (q < 0.65 ? 'M' : 'P');
    }
    function facePick(ti, q) { if (ti === 0) return q < 0.5 ? 1 : 2; if (ti <= 3) return q < 0.88 ? 1 : 2; if (ti <= 8) return q < 0.88 ? 1 : 2; return q < 0.65 ? 2 : 3; }
    for (var ti = 0; ti < TN; ti++) {
      var wr = new Array(COLS), wf = new Array(COLS), wk = new Array(COLS), srnd = mulberry(100 + ti * 37);
      c = 0;
      while (c < COLS) {
        var sw = 6 + Math.floor(srnd() * 7), cm = c + sw / 2;
        var v = Math.sin(cm / 9 + ti * 1.7) + 0.6 * Math.sin(cm / 4.3 + ti * 0.9), dy = ti === 11 ? 0 : (v > 0.85 ? 1 : v < -0.85 ? -1 : 0);
        var kd = kindPick(ti, srnd()), fc = facePick(ti, srnd());
        for (var cc = c; cc < Math.min(COLS, c + sw); cc++) {
          var flat = (FLAT[ti] || []).some(function (z) { return cc >= z[0] && cc <= z[1]; });
          wr[cc] = TW[ti] + (flat ? 0 : dy); wf[cc] = fc; wk[cc] = kd;
        }
        c += sw;
      }
      wrow.push(wr); wface.push(wf); wkind.push(wk); wend.push(COLS - 1);
    }
    // la quebrada del basural: orilla oeste sinuosa; los muros de las terrazas 60–90 terminan ahí
    function ravC(rr) { return 59.5 + 2.4 * Math.sin(rr / 6.3 + 0.7) + 1.4 * Math.sin(rr / 2.9 + 2.0); }
    function ravH(rr) {
      var tp = sm(clamp((rr - 54) / 8, 0, 1)) * sm(clamp((102 - rr) / 8, 0, 1));
      return (5.2 + 1.4 * Math.sin(rr / 8.1 + 1.3)) * tp;
    }
    function ravL(rr) { return Math.floor(ravC(rr) - ravH(rr)); }
    for (ti = 5; ti <= 8; ti++) wend[ti] = ravL(TW[ti] + 1) - 1;
    function nextRow(t, cc) { return t + 1 < TN ? wrow[t + 1][cc] : 140; }
    function r1Of(t, cc) { return nextRow(t, cc) - TSTRIP[t] - 1; }                // última fila de casas de la terraza t en la columna cc
    for (ti = 0; ti < TN; ti++) for (c = 0; c <= wend[ti]; c++) {
      var rw = wrow[ti][c], kk = wkind[ti][c];
      setg(c, rw, CROWN[kk]);
      for (var f = 1; f <= wface[ti][c]; f++) setg(c, rw + f, kk);
    }
    // quebrada: tiles q (empinados), con algunas rocas en las orillas
    for (r = 55; r <= 101; r++) {
      var qa = Math.max(0, ravL(r)), qh = ravH(r);
      if (qh < 0.5) continue;
      for (c = qa; c < COLS; c++) if (grid[r][c] === '.') grid[r][c] = 'q';
    }
    for (r = 58; r <= 99; r++) {                                                // peñascos en la orilla (rocas sólidas, sin cerrar el paso)
      var el = ravL(r);
      if (el > 2 && vn(r * 0.42, 3.3, 41) > 0.68 && grid[r][el] === 'q' && grid[r][el - 1] === '.') { setg(el, r, 'R'); if (vn(r * 0.9, 1.1, 5) > 0.5) setg(el + 1, r, 'R'); }
    }

    /* ---------------- 2. lotes ---------------- */
    var LOTS = [], nLot = 0, reserved = [];
    for (ti = 0; ti < TN; ti++) reserved.push([]);
    function resv(t, a, b2) { reserved[t].push([a, b2]); }
    // reservas: escaleras (A: 29–33 y B con margen) y los sitios de hito
    for (ti = 0; ti < TN; ti++) { resv(ti, 29, 33); resv(ti, RB[ti][0] - 1, RB[ti][1] + 1); }
    for (ti = 5; ti <= 8; ti++) resv(ti, wend[ti] - 1, COLS - 1);
    resv(5, 4, 26); resv(6, 32, 47); resv(3, 13, 29); resv(0, 1, 0);
    function resAt(t, cc) { for (var q = 0; q < reserved[t].length; q++) if (cc >= reserved[t][q][0] && cc <= reserved[t][q][1]) return reserved[t][q]; return null; }
    function resNext(t, cc, wmax) { var best = cc + wmax; for (var q = 0; q < reserved[t].length; q++) if (reserved[t][q][0] > cc && reserved[t][q][0] < best) best = reserved[t][q][0]; return best - cc; }
    function mkLot(id, side, c0, w, r0, r1, arch, floors, extra) {
      var f = { id: id, side: side, c0: c0, c1: c0 + w - 1, r0: r0, r1: r1, arch: arch, floors: floors, color: '', name: '', damage: 2, roof: [], front: [] };
      if (extra) for (var k in extra) f[k] = extra[k];
      LOTS.push(f); return f;
    }
    function pick(a) { return a[Math.floor(rnd() * a.length)]; }
    var FACE = [0, 3, 5, 7];
    function r0minOf(t, c0, w) { var m = -1; for (var cc = c0; cc < c0 + w; cc++) m = Math.max(m, wrow[t][cc] + wface[t][cc] + 1); return m; }
    function r1maxOf(t, c0, w) { var m = 999; for (var cc = c0; cc < c0 + w; cc++) m = Math.min(m, r1Of(t, cc)); return m; }
    function lastColor() { return null; }
    var prevColor = {};
    function paintOf(t, arch) {
      var band = TBAND[t], q = rnd(), col;
      if (arch === 'ladrilloCerro') return 'ladrillo';
      if (arch === 'estera') return 'tierra';
      if (band === 'alta') col = q < 0.34 ? 'madera' : pick(PAINT_HI);
      else if (band === 'media') col = q < 0.12 ? 'madera' : pick(PAINT_HI);
      else col = pick(PAINT_HI);
      if (col === prevColor[t]) col = pick(PAINT_HI);
      prevColor[t] = col; return col;
    }
    function decorate(f, t) {
      var n = nLot++, a = f.arch;
      if (!f.color || f.color === '') f.color = paintOf(t, a);
      if (!f.roof || !f.roof.length) f.roof = (ROOFS[a] || [[]])[Math.floor(rnd() * (ROOFS[a] || [[]]).length)].slice();
      if (!f.front || !f.front.length) f.front = (FRONTS[a] || [[]])[Math.floor(rnd() * (FRONTS[a] || [[]]).length)].slice();
      f.damage = f.damage && f.damage > 0 && f.damage <= 3 && f._dm ? f.damage : (TBAND[t] === 'alta' ? 2 + (n % 2) : TBAND[t] === 'media' ? 1 + (n * 7) % 3 : 1 + (n % 2));
      return f;
    }
    // lote «a medida»: filas completas entre el muro de arriba y el rellano (olla común, losa)
    function fullLot(id, t, c0, w, arch, floors, extra) {
      var r0 = r0minOf(t, c0, w), r1 = r1maxOf(t, c0, w);
      return mkLot(id, 'N', c0, w, r0, r1, arch, floors, extra);
    }
    var OLLA = fullLot('OLLA', 10, 3, 10, 'ollaComun', 1, { name: 'OLLA COMÚN SEÑOR DE LA CUMBRE', color: 'rojo', damage: 2, roof: [], front: [] });
    resv(10, 2, 14);
    var LOSA = fullLot('LOSA', 9, 38, 12, 'losaDeportiva', 0, { walk: true, color: 'cemento', damage: 2, roof: [], front: [] });
    resv(9, 37, 51);
    var CRUZ = mkLot('CRUZ', 'N', 29, 6, 1, 9, 'cruzCima', 0, { walk: true, color: 'blanco', damage: 1, roof: [], front: [] });
    // bodegas
    var BOD1 = null, BOD2 = null;
    (function () {
      var t = 11, c0 = 7, w = 6, r0 = r0minOf(t, c0, w), r1 = r1maxOf(t, c0, w);
      BOD1 = mkLot('BOD1', 'N', c0, w, r0, r1, 'bodegaCerro', 1, { name: 'BODEGA LA CUMBRE', color: 'amarillo', damage: 2, roof: ['tanque', 'fierros'], front: ['jabas', 'luz', 'gas'] });
      resv(11, 6, 14);
      t = 7; c0 = 50; w = 4;
      if (wend[7] >= c0 + w + 1 || true) { var cc0 = Math.min(c0, wend[7] - w - 1); r0 = r0minOf(t, cc0, w); r1 = r1maxOf(t, cc0, w);
        BOD2 = mkLot('BOD2', 'N', cc0, w, r0, r1, 'bodegaCerro', 1, { name: 'BODEGA DON PANCHO', color: 'verde', damage: 2, roof: ['tanque', 'fierros'], front: ['jabas', 'luz', 'gas'] }); resv(7, cc0 - 1, cc0 + w); }
    })();
    var ARCHW = { estera: [3, 4], triplay: [3, 5], mixta: [5, 6], ladrilloCerro: [5, 8], bodegaCerro: [5, 6] };
    var GAPS = { alta: { p: 0.3, n: 3 }, media: { p: 0.1, n: 2 }, baja: { p: 0.06, n: 2 }, pie: { p: 0.1, n: 3 } };
    function archPick(t) {
      var q = rnd();
      switch (t) {
        case 0: case 1: case 2: case 3: return q < 0.52 ? 'estera' : (q < 0.94 ? 'triplay' : 'ladrilloCerro');
        case 4: return q < 0.15 ? 'estera' : (q < 0.58 ? 'triplay' : (q < 0.78 ? 'mixta' : 'ladrilloCerro'));
        case 5: return q < 0.1 ? 'estera' : (q < 0.5 ? 'triplay' : (q < 0.7 ? 'mixta' : 'ladrilloCerro'));
        case 6: return q < 0.3 ? 'triplay' : (q < 0.5 ? 'mixta' : 'ladrilloCerro');
        case 7: return q < 0.25 ? 'triplay' : (q < 0.5 ? 'mixta' : 'ladrilloCerro');
        case 8: return q < 0.2 ? 'triplay' : (q < 0.45 ? 'mixta' : 'ladrilloCerro');
        case 9: return q < 0.65 ? 'ladrilloCerro' : (q < 0.85 ? 'mixta' : 'triplay');
        case 10: return q < 0.75 ? 'ladrilloCerro' : (q < 0.9 ? 'mixta' : 'triplay');
        default: return q < 0.72 ? 'ladrilloCerro' : (q < 0.87 ? 'mixta' : (q < 0.95 ? 'triplay' : 'ladrilloCerro'));
      }
    }
    function floorsPick(t, arch) {
      var q = rnd();
      if (arch === 'estera' || arch === 'triplay') return 1;
      if (arch === 'mixta') return 2;
      if (t <= 3) return 1;
      if (t <= 5) return q < 0.7 ? 1 : 2;
      if (t <= 8) return q < 0.4 ? 1 : 2;
      if (t === 9) return q < 0.7 ? 2 : 3;
      if (t === 10) return q < 0.35 ? 2 : 3;
      return q < 0.4 ? 2 : 3;
    }
    function fillTerrace(t) {
      var band = TBAND[t], G0 = GAPS[band], cc = 0, endC = wend[t], lastEnd = -1;
      while (cc <= endC) {
        var rv = resAt(t, cc);
        if (rv) { cc = rv[1] + 1; continue; }
        if (rnd() < G0.p) { cc += 1 + Math.floor(rnd() * G0.n); continue; }
        var arch = archPick(t), wr0 = ARCHW[arch], w = wr0[0] + Math.floor(rnd() * (wr0[1] - wr0[0] + 1));
        w = Math.min(w, resNext(t, cc, w), endC - cc + 1);
        if (w < 3) { cc += 1; continue; }
        var fl = floorsPick(t, arch), r0m = r0minOf(t, cc, w), r1m = r1maxOf(t, cc, w), avail = r1m - r0m + 1, rho;
        var maxFl = fl;
        while (maxFl >= 1 && FACE[maxFl] + (maxFl === 1 ? 1 : 0) > avail) maxFl--;
        if (maxFl < 1) { cc += w; continue; }                                    // no cabe: queda de patio
        fl = maxFl;
        rho = fl === 1 ? 1 + Math.floor(rnd() * 3) : Math.floor(rnd() * 3);
        var h = Math.min(avail, FACE[fl] + rho);
        if (arch === 'ladrilloCerro' && t <= 3) h = Math.min(avail, FACE[1] + 1);
        var up = (avail - h > 0 && rnd() < 0.28) ? 1 : 0;                        // algunas casas un escalón más arriba
        var r1 = r1m - up, r0 = r1 - h + 1;
        var ex = { color: '', _dm: 0 };
        var f = mkLot('T' + TW[t] + '-' + cc, 'N', cc, w, r0, r1, arch, fl, ex);
        decorate(f, t);
        cc += w + (band === 'pie' || band === 'baja' ? 0 : (rnd() < 0.3 ? 1 : 0));
      }
    }
    for (ti = 0; ti < TN; ti++) fillTerrace(ti);
    // pie: azoteas de la manzana de enfrente (sur de la calle), con claros
    (function () {
      var cc = 0, k = 0;
      while (cc < COLS - 6) {
        var w = 6 + Math.floor(rnd() * 5); if (cc + w > COLS) w = COLS - cc;
        var f = mkLot('PS' + k, 'S', cc, w, 147, 149, k % 3 === 1 ? 'mixta' : 'ladrilloCerro', 1 + (k % 2), { color: k % 3 === 1 ? 'azul' : 'ladrillo', damage: 1 + (k % 3), roof: pick(ROOFS.ladrilloCerro), front: [] });
        k++; cc += w + 5 + Math.floor(rnd() * 7);
      }
    })();

    // semillas, cara y vecinos
    function seedOf(id) { var h = 2166136261; for (var q = 0; q < id.length; q++) { h ^= id.charCodeAt(q); h = Math.imul(h, 16777619); } return (h >>> 0) % 10000; }
    LOTS.forEach(function (f) {
      if (f.seed === undefined) f.seed = seedOf('cerro-' + f.id);
      f.face = (f.side !== 'N' || f.walk) ? 0 : Math.min({ 0: 3, 1: 3, 2: 5, 3: 7 }[f.floors] || 3, f.r1 - f.r0 + 1);
      f.faceTiles = f.face || undefined;
      f.nbW = -1; f.nbE = -1;
      LOTS.forEach(function (g) {
        if (g === f || g.side !== f.side || g.r1 < f.r0 + 2 || g.r0 > f.r1 - 2) return;
        if (g.c1 === f.c0 - 1) f.nbW = g.floors;
        if (g.c0 === f.c1 + 1) f.nbE = g.floors;
      });
    });
    LOTS.forEach(function (f, k) {
      for (var rr = f.r0; rr <= f.r1; rr++) for (var cc = f.c0; cc <= f.c1; cc++) {
        lotAt[rr][cc] = k;
        grid[rr][cc] = f.walk ? (f.arch === 'losaDeportiva' ? 'o' : 'c') : 'L';
      }
    });

    /* ---------------- 3. cima: borde norte y peñascos ---------------- */
    fill(0, 63, 0, 0, 'R'); for (c = 0; c < COLS; c++) if (c < 28 || c > 35) grid[1][c] = 'R';
    for (r = 2; r <= 9; r++) for (c = 0; c < COLS; c++) {
      if (c >= 26 && c <= 37) continue;                                          // el claro de la cruz
      var rn = fbm(c * 0.33, r * 0.42, 77);
      if ((c < 3 || c > 60) && rn > 0.46) grid[r][c] = 'R';
      else if (rn > 0.76 && r < 9) grid[r][c] = 'R';
    }
    // franjas de arena en la cima
    [[8, 5], [16, 3], [26, 8], [40, 4], [47, 8], [54, 6]].forEach(function (q) { if (grid[q[1]][q[0]] === 'k') grid[q[1]][q[0]] = 'a'; if (grid[q[1]][q[0] + 1] === 'k') grid[q[1]][q[0] + 1] = 'a'; });

    /* ---------------- 4. rutas: se tallan sobre muros, rellenos y huecos (los lotes no pisan esas columnas) ---------------- */
    function carve(c0, c1, t, ch) {
      for (var cc = c0; cc <= c1; cc++) for (var rr = wrow[t][cc]; rr <= r1Of(t, cc); rr++) {
        if (lotAt[rr][cc] >= 0 && !LOTS[lotAt[rr][cc]].walk) console.warn('[ACHORADO] cerro: la ruta pisa el lote ' + LOTS[lotAt[rr][cc]].id, cc, rr);
        grid[rr][cc] = ch;
      }
    }
    for (ti = 0; ti < TN; ti++) {
      var band = TBAND[ti];
      if (band === 'alta') { carve(30, 31, ti, 'T'); carve(RB[ti][0], RB[ti][1], ti, 'r'); }
      else if (band === 'media') { carve(30, 31, ti, 'e'); carve(RB[ti][0], RB[ti][1], ti, 'r'); }
      else { carve(30, 32, ti, 'E'); carve(RB[ti][0], RB[ti][1], ti, 'e'); }
    }
    // v0.13 T2 (C1): la última escalera se abre en escalinata (cols 27–34) para entrar a la explanada por los lados de la base de la cruz
    carve(27, 34, 0, 'T');
    // v0.13 T2 (C2): huaicos que tapan la escalera A en las terrazas 60 y 80 (la cara del muro y una fila más). El zigzag (rampas B) sigue abierto.
    var HUAICO = [];
    [5, 7].forEach(function (t) {
      var rr0 = 99, rr1 = -1;
      for (var cc = 29; cc <= 33; cc++) { var w0 = wrow[t][cc], w1 = wrow[t][cc] + Math.max(1, wface[t][cc]) + 1; for (var rr = w0; rr <= w1; rr++) if (lotAt[rr][cc] < 0) { grid[rr][cc] = 'R'; rr0 = Math.min(rr0, rr); rr1 = Math.max(rr1, rr); } }
      HUAICO.push({ t: t, c0: 29, c1: 33, r0: rr0, r1: rr1, x: 31.5 * T, y: (rr1 + 1) * T + 6 });
    });

    /* ---------------- 5. pie: calle de tierra con un tramo de asfalto roto ---------------- */
    fill(0, 63, 140, 146, 's');
    for (r = 141; r <= 145; r++) for (c = 14; c <= 46; c++) {
      var af = fbm(c * 0.22, r * 0.5, 91) + (r === 143 ? 0.12 : 0) - Math.abs(c - 30) * 0.012;
      if (af > 0.5) grid[r][c] = '=';
    }

    /* ---------------- 6. trochas: rasterizadas por píxel, siguiendo el zigzag ---------------- */
    var Wp = COLS * T, Hp = ROWS * T;
    var pathMask = new Uint8Array(Wp * Hp);
    function strokePath(pts, w, flag, ph) {
      for (var s = 1; s < pts.length; s++) {
        var a = pts[s - 1], bb = pts[s], dx = bb.x - a.x, dy = bb.y - a.y, len = Math.max(1, Math.round(Math.max(Math.abs(dx), Math.abs(dy))));
        var horiz = Math.abs(dx) >= Math.abs(dy), fl2 = flag || (horiz ? 1 : 2);
        for (var k = 0; k <= len; k++) {
          var x = a.x + dx * k / len, y = a.y + dy * k / len, sp = (s * 53 + k) * 0.37 + (ph || 0);
          var hw = w / 2 + 1.6 * Math.sin(sp) + 1.1 * Math.sin(sp * 2.3 + 1.7);
          if (horiz) { var xi = Math.round(x), y0 = Math.round(y - hw), y1 = Math.round(y + hw); if (xi < 0 || xi >= Wp) continue; for (var yy = Math.max(0, y0); yy <= Math.min(Hp - 1, y1); yy++) pathMask[yy * Wp + xi] = fl2; }
          else { var yi = Math.round(y), x0 = Math.round(x - hw), x1 = Math.round(x + hw); if (yi < 0 || yi >= Hp) continue; for (var xx = Math.max(0, x0); xx <= Math.min(Wp - 1, x1); xx++) pathMask[yi * Wp + xx] = fl2; }
        }
      }
    }
    function rampX(t) { return (RB[t][0] + RB[t][1] + 1) / 2 * T; }
    function topY(t, cc) { return (r1Of(t, Math.round(cc / T - 0.5)) + 1) * T; }       // borde norte del rellano de la terraza t (px)
    function botY(t, cc) { return nextRow(t, Math.round(cc / T - 0.5)) * T; }          // borde sur del rellano (corona del muro de abajo)
    var stripPts = [];                                                          // polilínea de cada rellano (de la rampa de abajo a la de arriba)
    for (ti = 0; ti < TN - 1; ti++) {
      var xs = ti + 1 < TN ? rampX(ti + 1) : rampX(ti), xe = rampX(ti), ptsS = [], nseg = Math.max(2, Math.round(Math.abs(xe - xs) / 70));
      var ysS = botY(ti, xs) - 6, yeS = topY(ti, xe) + 6;
      ptsS.push({ x: xs, y: ysS });
      for (var q = 1; q < nseg; q++) {
        var u = q / nseg, px2 = xs + (xe - xs) * u + (rnd() - 0.5) * 22, cen = (topY(ti, px2) + botY(ti, px2)) / 2;
        ptsS.push({ x: px2, y: clamp(cen + (rnd() - 0.5) * 8 + (0.5 - u) * 5, topY(ti, px2) + 8, botY(ti, px2) - 8) });
      }
      ptsS.push({ x: xe, y: yeS });
      stripPts.push(ptsS);
      var wpath = TBAND[ti] === 'alta' ? 15 : (TBAND[ti] === 'media' ? 17 : 24);
      strokePath(ptsS, wpath, 0, ti * 2.1);
      if (TBAND[ti] === 'baja') {                                                // calles de la ladera baja: de lado a lado
        var street = [], sy = (topY(ti, 500) + botY(ti, 500)) / 2;
        for (var sx = 0; sx <= Wp; sx += 64) { var cy = (topY(ti, Math.min(Wp - 8, sx + 8)) + botY(ti, Math.min(Wp - 8, sx + 8))) / 2; street.push({ x: sx, y: cy + Math.sin(sx / 90 + ti) * 3 + (hsh(sx, ti) % 7) - 3 }); }
        strokePath(street, ti === 10 ? 24 : 20, 1, ti);
      }
    }
    // trocha corta que une la escalera A con el rellano en alta y media (desvío hacia los lotes)
    for (ti = 0; ti < 9; ti++) {
      var by = (topY(ti, 500) + botY(ti, 500)) / 2;
      strokePath([{ x: 29 * T, y: by }, { x: 35 * T, y: by + (ti % 2 ? 2 : -2) }], 16, 1, ti);
    }
    // marca los tiles con trocha (rellano plano)
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
      var chn = grid[r][c];
      if (chn !== '.' && chn !== ',' && chn !== 'a') continue;
      var cnt = 0, x0 = c * T, y0 = r * T;
      for (var yy2 = 0; yy2 < T; yy2 += 4) for (var xx2 = 0; xx2 < T; xx2 += 4) if (pathMask[(y0 + yy2) * Wp + x0 + xx2]) cnt++;
      if (cnt >= 6) grid[r][c] = 'z';
    }

    /* ---------------- 7. sólidos finos: base de la cruz, muro/tribuna y bordillo de la losa ---------------- */
    var extraSolid = [];
    function rect(x0, y0, x1, y1, tag) { extraSolid.push({ x0: x0, y0: y0, x1: x1, y1: y1, tag: tag }); }
    var cruzBase = (function () {
      var LI = ACH.sprites && ACH.sprites.lotInfo && ACH.sprites.lotInfo.cruzCima, g = null;
      try { if (LI) g = LI(CRUZ); } catch (e) { g = null; }
      var Wd = (CRUZ.c1 - CRUZ.c0 + 1) * T, Hd = (CRUZ.r1 - CRUZ.r0 + 1) * T;
      if (!g) { var bw = Math.min(48, Wd), bx0 = 16 * Math.max(0, Math.floor((Wd / 16 - 3) / 2)); g = { x0: bx0, x1: bx0 + bw, y0: Hd - 36 }; }
      return { x0: CRUZ.c0 * T + g.x0, x1: CRUZ.c0 * T + g.x1, y0: CRUZ.r0 * T + g.y0, y1: (CRUZ.r1 + 1) * T };
    })();
    rect(cruzBase.x0, cruzBase.y0, cruzBase.x1, cruzBase.y1, 'cruz');
    (function () {   // losa (lado N): muro + tribunita arriba (20 px) y bordillo con baranda abajo (14 px) con una entrada de 24 px
      var lx = LOSA.c0 * T, ly = LOSA.r0 * T, Wd = (LOSA.c1 - LOSA.c0 + 1) * T, Hd = (LOSA.r1 - LOSA.r0 + 1) * T;
      var gapX = Math.round(Wd * (0.58 + (LOSA.seed % 3) * 0.08)), gapW = 24;
      rect(lx, ly, lx + Wd, ly + 20, 'losa');
      rect(lx, ly + Hd - 14, lx + gapX, ly + Hd, 'losa'); rect(lx + gapX + gapW, ly + Hd - 14, lx + Wd, ly + Hd, 'losa');
      rect(lx, ly + 20, lx + 3, ly + Hd - 14, 'losa'); rect(lx + Wd - 3, ly + 20, lx + Wd, ly + Hd - 14, 'losa');
      LOSA.gate = { x: lx + gapX + gapW / 2, y: ly + Hd };
    })();

    var MAP = grid.map(function (rw) { return rw.join(''); });
    var L = { grid: grid, lotAt: lotAt, MAP: MAP, LOTS: LOTS, extraSolid: extraSolid, cruzBase: cruzBase, OLLA: OLLA, LOSA: LOSA, CRUZ: CRUZ, BOD1: BOD1, BOD2: BOD2,
      wrow: wrow, wface: wface, wend: wend, r1Of: r1Of, nextRow: nextRow, stripPts: stripPts, pathMask: pathMask, ravC: ravC, ravH: ravH, ravL: ravL,
      rampX: rampX, topY: topY, botY: botY, rnd: rnd, RB: RB, reserved: reserved, HUAICO: HUAICO };
    var W = makeWorld(L);
    W.buildMs = Math.round((window.performance || Date).now() - t0);
    built = W;
    return W;
  }

  function makeWorld(L) {
    var grid = L.grid, lotAt = L.lotAt, MAP = L.MAP, LOTS = L.LOTS, extraSolid = L.extraSolid, cruzBase = L.cruzBase, OLLA = L.OLLA, LOSA = L.LOSA, CRUZ = L.CRUZ;
    var pathMask = L.pathMask, rnd = L.rnd, Wp = COLS * T, Hp = ROWS * T;
    function P(c, r) { return { x: Math.round(c * T), y: Math.round(r * T) }; }
    var START = { x: 10 * T + 8, y: 145 * T + 8 };

    /* ---------------- consultas de la grilla ---------------- */
    function tileAt(cc, rr) { if (cc < 0 || rr < 0 || cc >= COLS || rr >= ROWS) return null; return grid[rr][cc]; }
    function isSolidTile(cc, rr) { var ch = tileAt(cc, rr); return ch === null || !!SOLID[ch]; }
    function circleRect(x, y, rad, x0, y0, x1, y1) {
      var cx = x < x0 ? x0 : (x > x1 ? x1 : x), cy = y < y0 ? y0 : (y > y1 ? y1 : y), dx = x - cx, dy = y - cy;
      return dx * dx + dy * dy < rad * rad;
    }
    var props = [], poles = { N: [], S: [] }, poleChains = [], looseDecor = [];
    function collideCircle(x, y, rad) {
      var c0 = Math.floor((x - rad) / T), c1 = Math.floor((x + rad) / T), r0 = Math.floor((y - rad) / T), r1 = Math.floor((y + rad) / T), n;
      for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) if (isSolidTile(cc, rr) && circleRect(x, y, rad, cc * T, rr * T, cc * T + T, rr * T + T)) return true;
      for (n = 0; n < extraSolid.length; n++) { var e = extraSolid[n]; if (circleRect(x, y, rad, e.x0, e.y0, e.x1, e.y1)) return true; }
      for (n = 0; n < props.length; n++) { var p = props[n]; if (p.fw > 0 && p.fh > 0 && circleRect(x, y, rad, p.x0, p.y0, p.x1, p.y1)) return true; }
      return false;
    }
    function pointBlocked(x, y) {
      if (isSolidTile(Math.floor(x / T), Math.floor(y / T))) return true;
      var n;
      for (n = 0; n < extraSolid.length; n++) { var e = extraSolid[n]; if (x >= e.x0 && x <= e.x1 && y >= e.y0 && y <= e.y1) return true; }
      for (n = 0; n < props.length; n++) { var p = props[n]; if (p.fw > 0 && x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1) return true; }
      return false;
    }
    function propAt(x, y) { for (var n = 0; n < props.length; n++) { var p = props[n]; if (p.fw > 0 && x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1) return p; } return null; }
    function los(x0, y0, x1, y1) {
      var dx = x1 - x0, dy = y1 - y0, d = Math.sqrt(dx * dx + dy * dy), n = Math.ceil(d / 6);
      for (var k = 1; k < n; k++) { var t = k / n; if (pointBlocked(x0 + dx * t, y0 + dy * t)) return false; }
      return true;
    }
    function moveCircle(ent, dx, dy, rad) {
      var hit = false;
      if (dx !== 0) { if (!collideCircle(ent.x + dx, ent.y, rad)) ent.x += dx; else hit = true; }
      if (dy !== 0) { if (!collideCircle(ent.x, ent.y + dy, rad)) ent.y += dy; else hit = true; }
      return hit;
    }
    // v0.13 T2 (C1): la cruz solo da la victoria cuando ACH.presidenta.crossOpen() (jefa vencida). routeCheck mira la geometría (inExitRaw).
    function inExitRaw(x, y) { return circleRect(x, y, 9, cruzBase.x0, cruzBase.y0, cruzBase.x1, cruzBase.y1); }
    function inExit(x, y) {
      if (!inExitRaw(x, y)) return false;
      var PR = ACH.presidenta;
      if (PR && typeof PR.crossOpen === 'function') { try { if (!PR.crossOpen()) { if (PR.touchCross) PR.touchCross(); return false; } } catch (e) { /* la cruz manda */ } }
      return true;
    }
    function slopeAt(x, y) {
      var cc = Math.floor(x / T), rr = Math.floor(y / T), ch = tileAt(cc, rr);
      if (ch === null) return 0;
      if (ch === 't' || ch === 'z' || ch === 'o' || ch === '=' || ch === 's' || ch === 'c') return 0;
      if (ch === 'q') return 2;
      if (ch === 'r') return bandOf(rr) === 'alta' ? 2 : 1;
      if (STAIRS[ch]) return bandOf(rr) === 'alta' ? 2 : 1;
      return BAND_SLOPE[bandOf(rr)];
    }
    function isStairs(x, y) { return !!STAIRS[tileAt(Math.floor(x / T), Math.floor(y / T))]; }

    /* ---------------- carriles de bajada (zigzag, escalera A, trocha de la alta) ---------------- */
    var rampX = L.rampX, topY = L.topY, botY = L.botY, stripPts = L.stripPts;
    var zz = [];
    for (var ti = 4; ti <= 8; ti++) {
      var sp = stripPts[ti].slice().reverse();                                   // de la rampa de arriba (norte) a la de abajo
      sp.forEach(function (q) { zz.push({ x: Math.round(q.x), y: Math.round(q.y) }); });
      if (ti < 8) { var nx = rampX(ti + 1); zz.push({ x: Math.round(nx), y: Math.round(botY(ti, nx) + 4) }); zz.push({ x: Math.round(nx), y: Math.round(topY(ti + 1, nx) - 2) }); }
    }
    var a10 = (L.wrow[9][31] + 0.4) * T;
    var LANES = [
      { id: 'zigzag', pts: zz },
      { id: 'escalera', pts: [{ x: 31 * T + 8, y: Math.round(a10) }, { x: 31 * T + 8, y: 141.6 * T }] },
      { id: 'trocha', pts: [{ x: 31 * T, y: Math.round((L.wrow[0][31] + 0.6) * T) }, { x: 31 * T, y: Math.round((L.r1Of(4, 31) + 1) * T + 4) }] }
    ];
    LANES.forEach(function (Ln) { var s = 0; Ln.s = [0]; for (var k = 1; k < Ln.pts.length; k++) { s += Math.hypot(Ln.pts[k].x - Ln.pts[k - 1].x, Ln.pts[k].y - Ln.pts[k - 1].y); Ln.s.push(s); } Ln.len = s; });
    function distLane(x, y) {
      var best = 1e9;
      LANES.forEach(function (Ln) {
        for (var k = 1; k < Ln.pts.length; k++) {
          var a = Ln.pts[k - 1], b = Ln.pts[k], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1, t = clamp(((x - a.x) * dx + (y - a.y) * dy) / l2, 0, 1);
          var d = Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t)); if (d < best) best = d;
        }
      });
      return best;
    }
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

    /* ---------------- colocación de props ---------------- */
    var PROPS = [], placed = [];
    function pathAt(x, y) { return pathMask[Math.round(y) * Wp + Math.round(x)] > 0; }
    var FP = { refri: [11, 6], refriTirada: [27, 12], tele: [12, 6], sillaRota: [9, 6], mesaVolteada: [14, 8], colchon: [22, 8], llanta: [10, 5], bolsasCerro: [16, 6], cilindroAzul: [9, 5],
      escobaPared: [5, 3] };
    function okSpot(x, y, rad, o) {
      o = o || {};
      var fw = o.fw || rad * 2, fh = o.fh || Math.max(4, rad);
      if (x < 8 + fw / 2 || y < 8 || x > Wp - 8 - fw / 2 || y > Hp - 4) return false;
      var cc0 = Math.floor((x - fw / 2 - 1) / T), cc1 = Math.floor((x + fw / 2 + 1) / T), rr0 = Math.floor((y - fh - 2) / T), rr1 = Math.floor((y + 1) / T), cc, rr;
      for (rr = rr0; rr <= rr1; rr++) for (cc = cc0; cc <= cc1; cc++) {
        var ch = tileAt(cc, rr);
        if (ch === null || SOLID[ch] || STAIRS[ch] || ch === 'r' || ch === 'o' || ch === 'c') return false;
      }
      for (var e = 0; e < extraSolid.length; e++) { var s = extraSolid[e]; if (x > s.x0 - 12 && x < s.x1 + 12 && y > s.y0 - 12 && y < s.y1 + 12) return false; }
      if (!o.onPath && (pathAt(x, y) || pathAt(x - fw / 2, y) || pathAt(x + fw / 2, y) || pathAt(x, y - fh))) return false;
      if (distLane(x, y) < 14 + fw / 2) return false;
      var sepx = (o.sep || 12);
      for (var n = 0; n < placed.length; n++) { var pq = placed[n]; if (Math.abs(pq.x - x) < sepx * 0.5 + (fw + (pq.fw || pq.rad * 2)) / 2 && Math.abs(pq.y - y) < sepx * 0.35 + (fh + (pq.fh || pq.rad)) / 2) return false; }
      return true;
    }
    function put(k, x, y, extra, rad) {
      var p = { k: k, x: Math.round(x), y: Math.round(y) }, fp = FP[k];
      if (extra) for (var q in extra) p[q] = extra[q];
      p.c = p.x / T; p.r = p.y / T; PROPS.push(p); placed.push({ x: p.x, y: p.y, rad: rad || 7, fw: fp ? fp[0] : undefined, fh: fp ? fp[1] : undefined });
      return p;
    }
    // intenta poner un prop en un punto aleatorio de la zona; pred(c, r) decide si el tile vale
    function scatter(k, n, x0, y0, x1, y1, o) {
      o = o || {}; var got = 0, tries = 0;
      while (got < n && tries < n * 60) {
        tries++;
        var x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0);
        if (o.pred && !o.pred(Math.floor(x / T), Math.floor(y / T), x, y)) continue;
        var rad = o.rad || 7, fp = FP[k], oo = { sep: o.sep, onPath: o.onPath, fw: fp ? fp[0] : undefined, fh: fp ? fp[1] : undefined };
        if (!okSpot(x, y, rad, oo)) continue;
        var v = o.v !== undefined ? (typeof o.v === 'function' ? o.v() : o.v) : undefined;
        put(k, x, y, v !== undefined ? { v: v } : null, rad); got++;
      }
      return got;
    }
    function inRavine(cc, rr) { return tileAt(cc, rr) === 'q'; }
    function natural(cc, rr) { var ch = tileAt(cc, rr); return ch === '.' || ch === ',' || ch === 'z' || ch === 'a'; }

    /* pie: paradero de mototaxis, Tico y station wagon, basura */
    var MOTOS = [];                                                              // mototaxis del paradero; la 0 lleva al mototaxista
    [['mototaxiVar', 0, 4.2, 142.6], ['mototaxiVar', 1, 7.6, 143.7], ['mototaxiVar', 2, 3.5, 145.4], ['mototaxi', undefined, 11.4, 144.3]].forEach(function (m) {
      var p = put(m[0], m[2] * T, m[3] * T, m[1] !== undefined ? { v: m[1] } : null, 20); MOTOS.push(p);
    });
    put('mototaxiVolcada', 8.2 * T, 141.2 * T, null, 18);
    put('tico', 40 * T, 144.4 * T, { v: 1 }, 24); put('carVar', 49 * T, 143.2 * T, { v: 1 }, 28);
    put('cilindroAzul', 1.8 * T, 141.4 * T, null, 6); put('llanta', 13 * T, 145.8 * T, null, 6); put('llanta', 13.9 * T, 145.9 * T, null, 6);

    /* cisterna y su hilera de cilindros (terraza 70, plaza abierta) */
    var cistY = Math.round((L.r1Of(6, 39 * T / T) + 1.2) * T), cistX = Math.round(39.5 * T);
    put('cisterna', cistX, cistY, { cist: 1 }, 40);
    [34, 35.2, 36.4, 41.6, 42.8, 44].forEach(function (cx) { put('cilindroAzul', cx * T, cistY - 38, { water: 1 }, 6); });
    var CIST = { x: cistX, y: cistY, lot: null };
    // placita de tierra (descanso 2): cilindros al borde
    var placY = (L.r1Of(5, 19) + 0.7) * T;
    put('cilindroAzul', 15 * T, placY - 2, { water: 1 }, 6); put('cilindroAzul', 16.2 * T, placY - 2, { water: 1 }, 6);
    // cruz chica y letrero pintado en la roca (descanso 3, lote vacío de la alta)
    var cruzY = (L.r1Of(3, 20) + 0.7) * T;
    put('cruzChica', 16 * T, cruzY, null, 9); put('letreroRoca', 24 * T, cruzY + 2, null, 14);
    put('cilindroAzul', 9 * T, (L.r1Of(2, 9) + 1.6) * T, { water: 1 }, 6); put('cilindroAzul', 10.2 * T, (L.r1Of(2, 9) + 1.6) * T, { water: 1 }, 6); put('cilindroAzul', 41 * T, (L.r1Of(1, 41) + 1.6) * T, { water: 1 }, 6); put('cilindroAzul', 42.2 * T, (L.r1Of(1, 41) + 1.6) * T, { water: 1 }, 6);
    // cima
    put('reservorio', 13 * T, 8.2 * T, { water: 1 }, 24); put('torreAntenas', 52 * T, 7.6 * T, null, 14);
    // v0.13 T2 (C1): la explanada de la cruz es la arena de la Presidenta del Comité. Cuatro cilindros de agua del comité (apagan los molotov; se rompen a guitarrazos).
    var ARENA = { home: { x: 27 * T, y: 7.4 * T }, box: { x0: 15 * T, y0: 2.4 * T, x1: 50 * T, y1: 9.6 * T }, trigger: 150, cyl: [] };
    [[25.5, 4.2], [37.5, 4.2], [24.5, 8.6], [38.5, 8.6]].forEach(function (q) { var p = put('cilindroAzul', q[0] * T, q[1] * T, { water: 1, arena: 1 }, 6); ARENA.cyl.push(p); });
    // v0.13 T2 (C5): el nido de gallinazos en la quebrada del basural (cerro.js lo dibuja; espantar 3 lo deja solo y suelta botín)
    var NIDO = { x: 60 * T, y: 83 * T, r: 170 };
    // v0.13 (C4): la radio a pilas de la ladera alta, sobre un cajón pegado a la casa de triplay junto a la escalera (terraza 30). E la prende (interaccion.js).
    var RADIO = { x: Math.round(35.5 * T), y: Math.round(37.55 * T), r: 26 };
    put('radioPilas', RADIO.x, RADIO.y, { radio: 1 }, 8);

    /* basurales: la quebrada llena (refris, teles, sillas, mesas, bolsas, colchones, llantas) y los bordes */
    var qz = [54 * T, 58 * T, 64 * T, 100 * T];
    var QP = function (cc, rr) { return inRavine(cc, rr); };
    scatter('refri', 3, qz[0], qz[1], qz[2], qz[3], { pred: QP, rad: 7, sep: 18 }); scatter('refriTirada', 4, qz[0], qz[1], qz[2], qz[3], { pred: QP, rad: 8, sep: 18 });
    scatter('tele', 6, qz[0], qz[1], qz[2], qz[3], { pred: QP, rad: 6, sep: 14 }); scatter('sillaRota', 6, qz[0], qz[1], qz[2], qz[3], { pred: QP, rad: 5, sep: 14 });
    scatter('mesaVolteada', 4, qz[0], qz[1], qz[2], qz[3], { pred: QP, rad: 8, sep: 16 }); scatter('colchon', 4, qz[0], qz[1], qz[2], qz[3], { pred: QP, rad: 12, sep: 20 });
    scatter('bolsasCerro', 18, qz[0], qz[1], qz[2], qz[3], { pred: QP, rad: 7, sep: 10, v: function () { return Math.floor(rnd() * 3); } });
    scatter('llanta', 9, qz[0], qz[1], qz[2], qz[3], { pred: QP, rad: 5, sep: 10 }); scatter('cilindroAzul', 2, qz[0], qz[1], qz[2], qz[3], { pred: QP, rad: 6, sep: 16 });
    // basura en bordes de trochas y patios de todas las franjas
    scatter('bolsasCerro', 9, 0, 17 * T, 64 * T, 50 * T, { pred: natural, rad: 7, sep: 30, v: function () { return Math.floor(rnd() * 3); } });
    scatter('bolsasCerro', 14, 0, 50 * T, 54 * T, 100 * T, { pred: natural, rad: 7, sep: 26, v: function () { return Math.floor(rnd() * 3); } });
    scatter('bolsasCerro', 10, 0, 100 * T, 64 * T, 140 * T, { pred: natural, rad: 7, sep: 26, v: function () { return Math.floor(rnd() * 3); } });
    scatter('bolsasCerro', 7, 0, 140 * T, 64 * T, 147 * T, { pred: function (cc, rr) { return tileAt(cc, rr) === 's' || tileAt(cc, rr) === '='; }, rad: 7, sep: 36, v: function () { return Math.floor(rnd() * 3); } });
    scatter('llanta', 12, 0, 17 * T, 54 * T, 147 * T, { pred: natural, rad: 5, sep: 24 });
    scatter('sillaRota', 5, 0, 30 * T, 54 * T, 130 * T, { pred: natural, rad: 5, sep: 40 }); scatter('colchon', 3, 0, 40 * T, 54 * T, 130 * T, { pred: natural, rad: 12, sep: 50 });
    scatter('refriTirada', 2, 0, 90 * T, 54 * T, 135 * T, { pred: natural, rad: 8, sep: 50 }); scatter('mesaVolteada', 2, 0, 60 * T, 54 * T, 130 * T, { pred: natural, rad: 8, sep: 50 });
    scatter('tele', 3, 0, 50 * T, 54 * T, 120 * T, { pred: natural, rad: 6, sep: 50 });
    // cilindros sueltos y escobas apoyadas en las casas
    scatter('cilindroAzul', 7, 0, 17 * T, 54 * T, 135 * T, { pred: natural, rad: 6, sep: 60, v: undefined });
    LOTS.forEach(function (f, k) {
      if (f.side !== 'N' || f.walk || f.arch === 'estera' || f.arch === 'bodegaCerro') return;
      // QA v0.9: antes ey = (r1+1)*T - 1 caía en la fila 'L' de la casa y okSpot lo rechazaba siempre (0 escobas en el mapa): va pegada a la pared, en la fila de afuera
      if (k % 11 === 3) { var ex = (f.c0 + 0.8) * T, ey = (f.r1 + 1) * T + 4; if (okSpot(ex, ey + 3, 3, { sep: 6 })) put('escobaPared', ex, ey, null, 3); }
    });
    // columnas de fierro sin terminar sobre las azoteas de ladrillo (decoración, sin huella)
    LOTS.forEach(function (f, k) {
      if (f.side !== 'N' || f.arch !== 'ladrilloCerro' || (f.r1 - f.r0 + 1) - f.face < 1 || k % 2) return;
      PROPS.push({ k: 'columnaFierro', c: f.c0 + 1.5, r: f.r0 + 0.9, deco: 1 }); if (f.c1 - f.c0 >= 6) PROPS.push({ k: 'columnaFierro', c: f.c1 - 0.5, r: f.r0 + 0.9, deco: 1 });
    });

    /* postes: concreto abajo, madera inclinada en la media y la alta; cables entre consecutivos */
    var poleSpec = {}, chainKeys = [];
    function poleKey(x, y) { return Math.round(x) + ',' + Math.round(y); }
    function stripBaseY(t, cc) { return (L.nextRow(t, Math.floor(cc)) - 1) * T + 14; }
    function addChain(pts, kind) {
      var keys = [];
      pts.forEach(function (q, k) {
        var key = poleKey(q[0], q[1]);
        if (!poleSpec[key]) {
          var kk = kind === 'mix' ? (q[1] > 100 * T ? 'posteCables' : (k % 2 ? 'posteMadera' : 'posteCables')) : kind === 'madera' ? (k % 2 ? 'posteMaderaL' : 'posteMadera') : kind;
          poleSpec[key] = { k: kk, x: q[0], y: q[1], pole: 'chain' };
          PROPS.push(poleSpec[key]); placed.push({ x: q[0], y: q[1], rad: 4 });
        }
        keys.push(key);
      });
      chainKeys.push(keys);
    }
    function nearRamp(t, cc) { return (cc >= L.RB[t][0] - 2 && cc <= L.RB[t][1] + 2) || (cc >= 28 && cc <= 33); }
    addChain([[4, 140.75], [12, 140.75], [20, 140.75], [27.6, 140.75], [36, 140.75], [43, 140.75], [49.5, 140.75], [58, 140.75]].map(function (q) { return [q[0] * T, q[1] * T]; }), 'posteCables');
    // la subida: un poste por rellano al este de la escalera A (col 33)
    var sub = [[33.7 * T, 140.75 * T]];
    for (ti = TN - 2; ti >= 0; ti--) sub.push([33.7 * T, stripBaseY(ti, 33)]);
    addChain(sub.slice(0, 12), 'mix');
    // cadenas horizontales por rellano (concreto en la baja, madera en la media y la alta)
    function strip(ti2, xs, kind) {
      var pts = [];
      xs.forEach(function (cx) { if (!nearRamp(ti2, Math.floor(cx))) pts.push([cx * T, stripBaseY(ti2, cx)]); else if (cx > 31 && cx < 40) pts.push([33.7 * T, stripBaseY(ti2, 33)]); });
      if (pts.length > 1) addChain(pts, kind);
    }
    strip(10, [4, 18, 33.7, 44, 58], 'posteCables'); strip(9, [5, 20, 33.7, 56], 'posteCables');
    strip(8, [4, 17, 33.7, 43], 'madera'); strip(7, [14, 33.7, 44], 'madera'); strip(6, [5, 20, 33.7, 43], 'madera'); strip(5, [6, 18, 33.7, 42], 'madera');
    strip(4, [5, 24, 33.7, 41, 57], 'madera'); strip(3, [6, 33.7, 58], 'madera'); strip(2, [8, 22, 33.7, 40], 'madera'); strip(1, [14, 33.7, 56], 'madera');

    /* ---------------- Spawns: se aterrizan en suelo libre al construir los props ---------------- */
    var SP = [
      ['Z', 26, 143], ['Z', 40, 141.2], ['O', 58, 142.5],
      ['O', 5, 124.6], ['O', 8, 124.8], ['O', 11, 124.6], ['O', 13.6, 125.4], ['Z', 22, 126.5], ['Z', 57, 111], ['K', 12, 110.8],
      ['W', 34.6, 75.2], ['W', 36.2, 77.4], ['W', 37.8, 78.3], ['W', 44.6, 77.6], ['W', 45.2, 75],
      ['W', 25, 88.2], ['Z', 36, 68.4],
      ['Z', 40, 48.4], ['W', 44, 38.4], ['Z', 24, 28.4], ['O', 56, 18.4],
      // v0.13 T2 (C2): 8 que estaban a media altura ahora esperan en la ladera alta (filas 10–50): la subida se pone más brava hacia arriba
      ['Z', 14, 48.4], ['Z', 52, 48.4], ['O', 20, 38.4], ['E', 40, 38.4], ['Z', 6, 28.4], ['Z', 48, 28.4], ['W', 10, 18.4], ['Z', 36, 18.4],
      ['V', 57.5, 76.5], ['V', 59.5, 89.5], ['V', 50, 38.5], ['V', 12, 5.5], ['V', 40, 8.5]
    ];
    var spawns = SP.map(function (s) { return { ch: s[0], x: Math.round(s[1] * T + 8), y: Math.round(s[2] * T + 8) }; });

    /* ---------------- Animales ---------------- */
    function stripZone(t, c0, c1) { var y = (L.r1Of(t, (c0 + c1) >> 1) + 1) * T; return [c0 * T, y + 6, c1 * T, y + 34]; }
    var DOGS = [];
    function pack(zone, n) { for (var k = 0; k < n; k++) DOGS.push({ x: zone[0] + (zone[2] - zone[0]) * (0.3 + 0.2 * k), y: (zone[1] + zone[3]) / 2, zone: zone }); }
    pack([14 * T, 141 * T, 38 * T, 146 * T], 3);                                 // pie: jauría de 3
    pack(stripZone(10, 17, 28), 3); pack(stripZone(8, 14, 28), 2); pack(stripZone(6, 4, 27), 2);
    DOGS.push({ x: 56 * T, y: 74 * T, zone: [53 * T, 70 * T, 63 * T, 80 * T] }); DOGS.push({ x: 59 * T, y: 76 * T, zone: [53 * T, 70 * T, 63 * T, 80 * T] });   // hurgando en la quebrada
    // gatos en techos de calamina (de lotes de triplay y esteras) y uno al pie
    var CATS = [{ x: 12 * T, y: 126.5 * T, mode: 'sit' }];
    var catLots = LOTS.filter(function (f) { return (f.arch === 'triplay' || f.arch === 'estera') && f.r1 - f.r0 + 1 - f.face >= 1; });
    [2, 9, 15, 23, 31].forEach(function (k) { var f = catLots[Math.floor(catLots.length * k / 34)]; if (f) CATS.push({ x: Math.round((f.c0 + f.c1 + 1) / 2 * T) + 6, y: f.r0 * T + 8, mode: k % 2 ? 'lick' : 'sit' }); });
    var CHICKENS = [P(5, 58.5), P(14, 68.2), P(26, 78.5), P(36, 88.6), P(22, 48.4), P(40, 28.5), P(18, 64.5), P(12, 111.5)];
    var REST = [
      { x: START.x, y: START.y, label: 'Pie del cerro' },
      { x: Math.round((LOSA.c0 + LOSA.c1 + 1) / 2 * T), y: Math.round((LOSA.r0 + 4.5) * T), label: 'Losa deportiva' },
      { x: 19 * T + 8, y: Math.round((L.r1Of(5, 19) + 1.4) * T), label: 'Placita de tierra' },
      { x: 19 * T, y: Math.round((L.r1Of(3, 19) + 1.2) * T), label: 'Lote de la cruz chica' }
    ];
    // v0.13 (C4): zonas con nombre, de sur a norte. cerro.js muestra el cartel la primera vez que Alexander entra a cada franja en la visita (`rows` = filas del mundo [desde, hasta]).
    var ZONES = [
      { id: 'paradero', name: 'EL PARADERO', rows: [133, ROWS - 1], kicker: 'PIE DEL CERRO' },
      { id: 'losa', name: 'LA LOSA', rows: [100, 132], kicker: 'LADERA BAJA' },
      { id: 'basural', name: 'EL BASURAL', rows: [76, 99], kicker: 'LA QUEBRADA' },
      { id: 'placita', name: 'LA PLACITA', rows: [50, 75], kicker: 'LADERA MEDIA' },
      { id: 'esteras', name: 'LAS ESTERAS', rows: [10, 49], kicker: 'LADERA ALTA' },
      { id: 'cruz', name: 'LA CRUZ', rows: [0, 9], kicker: 'LA CIMA' }
    ];
    var TRASH = [{ x: 58 * T, y: 70 * T, r: 60 }, { x: 58 * T, y: 86 * T, r: 60 }, { x: 31 * T, y: 143.5 * T, r: 24 }, { x: 14 * T, y: 112 * T, r: 20 }];
    var OLLA_C = { x: Math.round((OLLA.c0 + OLLA.c1 + 1) / 2 * T), y: (OLLA.r1 + 1) * T + 10, lot: 'OLLA' };

    /* ---------------- Calcomanías ---------------- */
    var decals = [];
    function dec(k, v, x, y) { decals.push({ k: k, v: v, x: Math.round(x), y: Math.round(y), rot: 0 }); }
    // lotes aplanados marcados con piedras pintadas de cal: huecos de la alta (rectángulos de cal)
    (function () {
      var n = 0;
      for (var t = 0; t <= 3 && n < 10; t++) {
        var cc = 0;
        while (cc < COLS - 4 && n < 10) {
          var used = lotAt[L.r1Of(t, cc)][cc] >= 0 || lotAt[L.r1Of(t, cc) - 1][cc] >= 0;
          if (used || L.reserved[t].some(function (q) { return cc >= q[0] && cc <= q[1]; })) { cc++; continue; }
          var w = 0; while (cc + w < COLS && w < 7 && lotAt[L.r1Of(t, cc + w)][cc + w] < 0 && !L.reserved[t].some(function (q) { return (cc + w) >= q[0] && (cc + w) <= q[1]; })) w++;
          if (w >= 4) {
            var r1 = L.r1Of(t, cc), x0 = cc * T + 3, x1 = (cc + w) * T - 3, y1 = (r1 + 1) * T - 4, y0 = y1 - 48;
            dec('cal', 0, (x0 + x1) / 2, y0 + 9); dec('cal', 0, (x0 + x1) / 2, y1 + 0); dec('cal', 1, x0 + 4, y1); dec('cal', 1, x1 - 4, y1);
            n++;
          }
          cc += Math.max(1, w);
        }
      }
    })();
    var BS = [[56, 66], [60, 70], [58, 77], [55, 82], [61, 86], [57, 91], [59, 97], [31, 145], [15, 141.6], [14.5, 112.6], [20, 59.8], [42, 99.8], [3, 49.8], [27.6, 39.8], [61, 62], [56, 73], [60, 80], [57, 88], [61, 94], [8, 130], [50, 130], [24, 100]];
    BS.forEach(function (q, k) { dec('basuraSuelta', k % 3, q[0] * T, q[1] * T); });
    for (var pk = 0; pk < 14; pk++) { var rr = 14 + Math.floor(rnd() * 130), cc = 2 + Math.floor(rnd() * 60); if (natural(cc, rr)) dec('polvo', 0, cc * T + 8, rr * T + 12); }
    dec('charcoCerro', 1, 38 * T, cistY + 40); dec('charcoCerro', 0, 43 * T, cistY - 24); dec('charcoCerro', 0, 14.6 * T, placY - 8); dec('charcoCerro', 0, 28.4 * T, 129.6 * T);
    dec('restosTele', 0, 59 * T, 78.8 * T);

    /* ---------------- Apariencia del suelo ---------------- */
    function groundTile(c, r) {
      var ch = grid[r][c], h = hsh(c, r);
      switch (ch) {
        case 'R': return ['roca', h >> 3];
        case 'r': return ['trocha', 1];
        case 'E': { var wl = tileAt(c - 1, r) !== 'E', er = tileAt(c + 1, r) !== 'E'; return ['escaleraCerro', wl && er ? 5 : wl ? 3 : er ? 4 : 2]; }
        case 'e': return ['escaleraCerro', h % 3 ? 0 : 1];
        case 'T': return ['escaleraTierra', h % 2];
        case 'o': return ['losa', 0];
        case 'P': return ['pircaFace', h >> 3];
        case 'M': return ['muroContencion', h % 5 === 0 ? 1 : (h % 7 === 0 ? 2 : 0)];
        case 'Y': return ['muroLlantas', 0];
        case 'B': return ['bordeTerraza', 0];
        case 'b': return ['bordeTerrazaCemento', 0];
        case 'y': return ['bordeTerrazaLlantas', 0];
        case '=': return ['asphalt', h];
        default: return ['tierra', h >> 4];     // lo repinta bakeExtra por píxel; L: lo tapa el lote horneado
      }
    }

    // arreglos de píxeles (ABGR) de un tile 16×16
    var rdC = null, rdG = null;
    function dataOf(cv) {
      if (!rdC) { rdC = document.createElement('canvas'); rdC.width = rdC.height = 16; rdG = rdC.getContext('2d', { willReadFrequently: true }); }
      rdG.clearRect(0, 0, 16, 16); rdG.drawImage(cv, 0, 0);
      var d = rdG.getImageData(0, 0, 16, 16).data;
      return new Uint32Array(d.buffer.slice(0));
    }
    function dataSet(name, n) {
      var arr = ACH.sprites && ACH.sprites.tiles && ACH.sprites.tiles[name], out = [];
      if (!Array.isArray(arr)) arr = arr ? [arr] : [];
      for (var k = 0; k < (n || arr.length); k++) { var cv = arr[k % arr.length]; if (cv) out.push(dataOf(cv)); }
      return out;
    }
    function darken(set, amt) {
      return set.map(function (u) {
        var o = new Uint32Array(256);
        for (var k = 0; k < 256; k++) {
          var v = u[k], rr = v & 255, g = (v >>> 8) & 255, b = (v >>> 16) & 255, a = v >>> 24;
          rr = Math.round(rr * (1 - amt) + 58 * amt); g = Math.round(g * (1 - amt) + 40 * amt); b = Math.round(b * (1 - amt) + 38 * amt);
          o[k] = ((a << 24) | (b << 16) | (g << 8) | rr) >>> 0;
        }
        return o;
      });
    }
    function mixPx(v, r2, g2, b2, t) {
      var rr = Math.round((v & 255) * (1 - t) + r2 * t), g = Math.round(((v >>> 8) & 255) * (1 - t) + g2 * t), b = Math.round(((v >>> 16) & 255) * (1 - t) + b2 * t);
      return ((255 << 24) | (b << 16) | (g << 8) | rr) >>> 0;
    }
    var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    function paintGround(g) {
      var tTier = dataSet('tierra'), tPied = dataSet('tierraPiedras'), tAre = dataSet('arena'), tRoca = dataSet('roca'), tTro = dataSet('trocha'), tAsf = dataSet('asphalt'), tCrk = dataSet('asphaltCrack');
      if (!tTier.length || !tAre.length || !tRoca.length) return;
      if (!tCrk.length) tCrk = tAsf;
      var dTier = darken(tTier, 0.3), dPied = darken(tPied.length ? tPied : tTier, 0.26), dAre = darken(tAre, 0.22), dRoca = darken(tRoca, 0.2);
      var buf = new Uint32Array(Wp * Hp);
      // campos de ruido a 8 px (roca, arena, piedras) y a 2×8 (vetas de erosión)
      var G8 = 8, gw = Math.ceil(Wp / G8) + 2, gh = Math.ceil(Hp / G8) + 2, FR = new Float32Array(gw * gh), FA = new Float32Array(gw * gh), FS = new Float32Array(gw * gh), x, y, k;
      for (y = 0; y < gh; y++) for (x = 0; x < gw; x++) {
        var wx = x * G8, wy = y * G8, o = y * gw + x;
        FR[o] = fbm(wx / 62, wy / 96, 11); FA[o] = fbm(wx / 54, wy / 70, 23); FS[o] = fbm(wx / 24, wy / 30, 37);
      }
      var GX = 2, GY = 8, vw = Math.ceil(Wp / GX) + 2, vh = Math.ceil(Hp / GY) + 2, FG = new Float32Array(vw * vh);
      for (y = 0; y < vh; y++) for (x = 0; x < vw; x++) FG[y * vw + x] = vn(x * GX / 5.5, y * GY / 120, 51) * 0.7 + vn(x * GX / 13, y * GY / 60, 52) * 0.3;
      function samp(F, wd, px, py) {
        var fx = px / G8, fy = py / G8, ix = fx | 0, iy = fy | 0, ax = fx - ix, ay = fy - iy, o = iy * wd + ix;
        return (F[o] * (1 - ax) + F[o + 1] * ax) * (1 - ay) + (F[o + wd] * (1 - ax) + F[o + wd + 1] * ax) * ay;
      }
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        var ch = grid[r][c], ramp = ch === 'r', isR = ch === 'R';
        if (!NATURAL[ch] && !ramp && !isR) continue;
        var nbL = isR && c > 0 && grid[r][c - 1] !== 'R', nbR = isR && c < COLS - 1 && grid[r][c + 1] !== 'R', nbU = isR && r > 0 && grid[r - 1][c] !== 'R', nbD = isR && r < ROWS - 1 && grid[r + 1][c] !== 'R';
        var th = hsh(c, r), tv = th & 3, tv2 = (th >>> 4) & 3;
        var road = ch === 's' || ch === '=';
        var edgeL = ramp && grid[r][c - 1] !== 'r', edgeR = ramp && grid[r][c + 1] !== 'r';
        for (var ty = 0; ty < 16; ty++) for (var tx = 0; tx < 16; tx++) {
          var px = c * 16 + tx, py = r * 16 + ty, idx = py * Wp + px, pk = ty * 16 + tx, pm = pathMask[idx];
          if (ramp && !pm) {
            var jit = 1 + ((hsh(py, 3) >> 3) % 4);
            if (!((edgeL && tx < jit) || (edgeR && tx > 15 - jit))) pm = 2;
          }
          if (pm && tTro.length) { var vi = pm === 1 ? ((th >>> 8) % 5 === 0 ? 0 : ((th >>> 6) % 7 === 0 ? 3 : 2)) : ((th >>> 8) % 5 === 0 ? 0 : ((th >>> 6) % 7 === 0 ? 3 : 1)); buf[idx] = tTro[vi % tTro.length][pk]; continue; }
          var alt = 1 - py / Hp, bd = BAYER[((py & 3) << 2) | (px & 3)] / 16 - 0.47;
          if (isR) {   // peñasco sólido: roca por píxel, con el borde irregular (1–4 px) donde linda con suelo
            var jr = 1 + ((hsh(px * 3 + 1, py * 5 + 2) >>> 5) & 3);
            if (!((nbL && tx < jr) || (nbR && tx > 15 - jr) || (nbU && ty < jr) || (nbD && ty > 15 - jr))) {
              var dk = vn(px / 9, py / 7, 61) > 0.62;
              buf[idx] = (dk ? dRoca : tRoca)[tv % tRoca.length][pk]; continue;
            }
          }
          if (road) {
            // calle de tierra del pie: polvo con huellas al centro, arena y tierra a los lados, y el asfalto roto a manchas
            var yc = (143.5 * T), dd = Math.abs(py - yc);
            if (tAsf.length) {
              var env = clamp(Math.min((px - 13.5 * T) / 22, (46.5 * T - px) / 22), 0, 1) * clamp(1 - (Math.abs(py - yc) - 20) / 22, 0, 1);
              var an = fbm(px / 20, py / 12, 91) * 0.8 + fbm(px / 6, py / 5, 92) * 0.2;
              if (env > 0 && an * env + bd * 0.1 > 0.34 && vn(px / 14, py / 9, 93) < 0.9) { var av = ((th >>> 3) % 100 < 14 ? tCrk : tAsf)[(th >>> 5) % 6 % (((th >>> 3) % 100 < 14 ? tCrk : tAsf).length)][pk]; buf[idx] = mixPx(av, 156, 146, 128, 0.4 + 0.12 * ((hsh(px, py) >>> 4) & 1)); continue; }
            }
            if (dd < 26 + 7 * vn(px / 40, 1, 7) + bd * 8 && tTro.length) { buf[idx] = tTro[(th >>> 3) % 6 === 0 ? 0 : 2][pk]; continue; }
            var rf = vn(px / 30, py / 16, 8) + bd * 0.15;
            buf[idx] = (rf > 0.55 ? tAre[tv] : (rf > 0.42 ? tTier[tv] : tAre[tv2]))[pk];
            continue;
          }
          var fr = samp(FR, gw, px, py), fa = samp(FA, gw, px, py), fs = samp(FS, gw, px, py);
          var gl = FG[((py / GY) | 0) * vw + ((px / GX) | 0)];
          var rockThr = 0.93 - 0.36 * Math.pow(alt, 1.4) - (ch === 'k' ? 0.15 : 0) - (ch === 'q' ? 0.12 : 0);
          var areThr = 0.64 - 0.1 * alt - (ch === 'a' ? 0.3 : 0) - (ch === 'k' ? 0.14 : 0);
          var stoThr = 0.64 - (ch === 'q' ? 0.12 : 0);
          var dark = gl + bd * 0.1 > 0.7 || (ch === 'q' && fs + bd * 0.1 > 0.5);
          var sel;
          if (fr + bd * 0.14 > rockThr) sel = dark ? dRoca : tRoca;
          else if (fa + bd * 0.12 > areThr) sel = dark ? dAre : tAre;
          else if (fs + bd * 0.1 > stoThr && tPied.length) sel = dark ? dPied : tPied;
          else sel = dark ? dTier : tTier;
          buf[idx] = sel[tv % sel.length][pk];
        }
      }
      var cv = document.createElement('canvas'); cv.width = Wp; cv.height = Hp;
      var cg = cv.getContext('2d');
      cg.putImageData(new ImageData(new Uint8ClampedArray(buf.buffer), Wp, Hp), 0, 0);
      g.drawImage(cv, 0, 0);
    }

    // Lo que no es un tile: el suelo orgánico y la vista de la ciudad en garúa al norte de la cima (filas 0–1)
    function bakeExtra(g) {
      try { paintGround(g); } catch (e) { console.warn('[ACHORADO] cerro: paintGround', e); }
      var Wpx = COLS * T, y, x, k;
      g.save();
      g.fillStyle = '#d9d7d3'; g.fillRect(0, 0, Wpx, 32);
      g.fillStyle = '#c3c6c8'; g.fillRect(0, 6, Wpx, 5);
      g.fillStyle = '#b4b8bb'; g.fillRect(0, 10, Wpx, 2);
      for (x = 0, k = 0; x < Wpx; k++) {
        var w = 6 + (hsh(k, 3) % 14), hh = 3 + (hsh(k, 7) % 5);
        g.fillStyle = ['#a8a49c', '#9d978d', '#b0a89a', '#958f86'][k % 4]; g.fillRect(x, 13 + (hsh(k, 9) % 4), w, hh + 6);
        g.fillStyle = 'rgba(40,36,48,0.18)'; g.fillRect(x, 13 + (hsh(k, 9) % 4), 1, hh + 6);
        x += w;
      }
      for (x = 0, k = 0; x < Wpx; k++) { var w2 = 8 + (hsh(k, 13) % 18); g.fillStyle = ['#8d867b', '#847d72', '#958d80'][k % 3]; g.fillRect(x, 20 + (hsh(k, 17) % 3), w2, 12); x += w2; }
      g.fillStyle = 'rgba(224,221,219,0.35)'; g.fillRect(0, 0, Wpx, 32);
      for (y = 28; y < 32; y++) { g.fillStyle = 'rgba(58,52,44,' + (0.15 * (y - 27)) + ')'; g.fillRect(0, y, Wpx, 1); }
      g.restore();
    }

    var SURF = { '.': 'tierra', ',': 'piedra', a: 'tierra', k: 'piedra', t: 'tierra', z: 'tierra', r: 'tierra', q: 'piedra', s: 'tierra', '=': 'asfalto', E: 'escalera', e: 'escalera', T: 'escalera', o: 'piedra', c: 'piedra', L: 'tierra' };
    function surfaceAt(x, y) {
      for (var i = 0; i < TRASH.length; i++) { var tr = TRASH[i]; if ((x - tr.x) * (x - tr.x) + (y - tr.y) * (y - tr.y) < tr.r * tr.r * 0.6) return 'basura'; }
      return SURF[tileAt(Math.floor(x / T), Math.floor(y / T))] || 'tierra';
    }
    function respawnOk(ch) { return ch === 't' || ch === 'z' || ch === 's' || ch === 'q'; }
    // v0.13 T2 (C2): la reaparición prefiere la ruta POR DELANTE (más arriba): 250–500 px al norte de Alexander. entities.js la pregunta
    // en los primeros 40 intentos (respawnPick(p, intento) → {c, r} | null); después, en cualquier parte como antes. Nunca en la arena de la cruz.
    function respawnPick(p, k) {
      if (!p || k >= 40) return null;
      var ahead = 250 + Math.random() * 250, r = Math.floor((p.y - ahead) / T), c = Math.floor(Math.random() * COLS);
      if (r < 11) r = 11 + Math.floor(rnd() * 6);
      return { c: c, r: r };
    }

    /* ---------------- Props horneados ---------------- */
    var FOOT = {
      mototaxi: { w: 44, h: 36, fw: 38, fh: 13 }, mototaxiVar: { w: 44, h: 36, fw: 38, fh: 13 }, carVar: { w: 68, h: 34, fw: 62, fh: 17 },
      tico: { w: 56, h: 30, fw: 50, fh: 15 }
    };
    var FALLBACK = { refriTirada: 'refri', posteMaderaL: 'posteMadera', bolsasCerro: 'bolsas', carVar: 'car', mototaxiVolcada: 'mototaxiVar' };
    function footFor(k, spr) {
      var F = FOOT[k];
      if (!F) return { fw: spr.fw || 0, fh: spr.fh || 0, tall: !!spr.tall };
      var ok = spr.width >= F.w - 4 && !spr.placeholder;
      return { fw: ok && typeof spr.fw === 'number' ? spr.fw : F.fw, fh: ok && typeof spr.fh === 'number' ? spr.fh : F.fh, tall: !!spr.tall };
    }
    // la mototaxi volcada: la misma, boca abajo (volteada en vertical), 1 sola vez
    function makeVolcada() {
      var S = ACH.sprites; if (!S || !S.props || S.props.mototaxiVolcada) return;
      var src = S.props.mototaxiVar, base = Array.isArray(src) ? src[1] || src[0] : src;
      if (!base || !base.width) return;
      var cv = document.createElement('canvas'); cv.width = base.width; cv.height = base.height;
      var cg = cv.getContext('2d'); cg.imageSmoothingEnabled = false;
      cg.translate(0, base.height); cg.scale(1, -1); cg.drawImage(base, 0, 0);
      cg.setTransform(1, 0, 0, 1, 0, 0); cg.globalCompositeOperation = 'source-atop'; cg.fillStyle = 'rgba(40,30,40,0.18)'; cg.fillRect(0, 0, cv.width, cv.height);
      cv.ax = base.ax === undefined ? base.width >>> 1 : base.ax; cv.ay = base.ay === undefined ? base.height - 1 : base.ay;
      cv.fw = base.fw ? base.fw - 6 : 32; cv.fh = base.fh ? base.fh : 13; cv.shadowIn = true;
      S.props.mototaxiVolcada = cv;
    }
    var perches = [], waterSources = [], mototaxistas = [];
    function freeAt(x, y, rad, offs) {
      if (!offs) return !collideCircle(x, y, rad);
      for (var i = 0; i < offs.length; i++) if (collideCircle(x + offs[i][0], y + offs[i][1], rad)) return false;
      return true;
    }
    function snapFree(x, y, rad, offs) {
      if (freeAt(x, y, rad, offs)) return { x: x, y: y };
      for (var d = 4; d <= 140; d += 4) for (var a = 0; a < 16; a++) {
        var ang = a / 16 * Math.PI * 2 + d * 0.3, nx = x + Math.cos(ang) * d, ny = y + Math.sin(ang) * d * 0.7;
        if (freeAt(nx, ny, rad, offs)) return { x: Math.round(nx), y: Math.round(ny) };
      }
      return { x: x, y: y };
    }
    function buildProps() {
      props.length = 0; poles.N.length = 0; poles.S.length = 0; poleChains.length = 0; looseDecor.length = 0; perches.length = 0; waterSources.length = 0; mototaxistas.length = 0;
      makeVolcada();
      var byKey = {}, motoSet = {};
      MOTOS.forEach(function (m) { motoSet[poleKey(m.x, m.y)] = 1; });
      for (var n = 0; n < PROPS.length; n++) {
        var p = PROPS[n], k = p.k, spr = ACH.gfx.prop(k, p.v, p.dir, FALLBACK[k]);
        var x = p.x !== undefined ? Math.round(p.x) : Math.round(p.c * T), y = p.y !== undefined ? Math.round(p.y) : Math.round(p.r * T), f = footFor(k, spr);
        var bp = { k: k, v: p.v || 0, dir: 'E', x: x, y: y, fw: f.fw, fh: f.fh, tall: f.tall, tree: false, x0: x - f.fw / 2, x1: x + f.fw / 2, y0: y - f.fh, y1: y,
          cob: false, fade: 1, fb: FALLBACK[k], lift: 0, sortDy: 0 };
        if (spr.tops && spr.tops.length) {
          var ty = 1e9, tx = 0;
          spr.tops.forEach(function (q) { tx += q.x; if (q.y < ty) ty = q.y; });
          bp.top = { x: x + Math.round(tx / spr.tops.length), y: y + ty };
        } else if (spr.top) bp.top = { x: x + spr.top.x, y: y + spr.top.y };
        if (spr.smoke) bp.smoke = { x: x + spr.smoke.x, y: y + spr.smoke.y };
        if (p.pole) { bp.pole = 'chain'; byKey[poleKey(p.x, p.y)] = bp; }
        if (p.arena) bp.arena = 1;   // v0.13 T2: cilindro de la arena de la Presidenta
        props.push(bp);
        if (p.water || p.cist) waterSources.push({ x: x, y: y + 6, kind: p.cist ? 'cisterna' : k });
        if (motoSet[poleKey(x, y)] && mototaxistas.length < 1 && k === 'mototaxiVar') mototaxistas.push({ x: x, y: y, prop: bp });
      }
      chainKeys.forEach(function (keys) { poleChains.push(keys.map(function (kk) { return byKey[kk]; }).filter(Boolean)); });
      // aterrizar spawns, perros, gallinas y descansos en suelo libre
      spawns.forEach(function (s) { var q = snapFree(s.x, s.y, s.ch === 'V' ? 3 : 6, (s.ch === 'E' || s.ch === 'K') ? [[-7, 4], [7, 4], [0, -6]] : null); s.x = q.x; s.y = q.y; });
      DOGS.forEach(function (d) { var q = snapFree(d.x, d.y, 4); d.x = q.x; d.y = q.y; });
      CHICKENS.forEach(function (d) { var q = snapFree(d.x, d.y, 4); d.x = q.x; d.y = q.y; });
      REST.forEach(function (d) { var q = snapFree(d.x, d.y, 6); d.x = q.x; d.y = q.y; });
      // el mototaxista: sentado al volante de la primera mototaxi (social.js lo crea)
      mototaxistas.forEach(function (m) { m.sx = m.x + 8; m.sy = m.y - 3; });
      // perchas de gallinazo: travesaños de poste, techos de esteras y módulos, y el basural
      props.forEach(function (bp, i) { if (bp.pole && bp.top && i % 2 === 0) perches.push({ x: bp.x, y: bp.y, z: bp.y - bp.top.y, kind: 'poste' }); });
      LOTS.forEach(function (f, i) { if ((f.arch === 'estera' || f.arch === 'triplay') && i % 3 === 0 && f.face) perches.push({ x: Math.round((f.c0 + f.c1 + 1) / 2 * T), y: (f.r1 + 1) * T - 2, z: f.face * T + 4, kind: 'techo' }); });
      [[56.5, 66], [60, 72], [57, 80], [61, 85], [58, 93]].forEach(function (q) { perches.push({ x: q[0] * T, y: q[1] * T, z: 0, kind: 'basural' }); });
      spawns.forEach(function (s) { if (s.ch === 'V') perches.push({ x: s.x, y: s.y, z: 0, kind: s.y < 60 * T ? 'techo' : 'basural', spawn: true }); });
    }
    function birdSpawns() {
      if (ACH.aves && typeof ACH.aves.update === 'function') return [];
      return perches.filter(function (q, i) { return q.kind !== 'basural' && i % 2 === 0; }).slice(0, 8).map(function (q) { return { x: q.x, y: q.y, z: q.z, pole: q.kind === 'poste' }; });
    }

    /* ---------------- Debug: rutas y spawns ---------------- */
    function bfs(fx, fy, R) {
      var S = 4, gw = Math.ceil(COLS * T / S), gh = Math.ceil(ROWS * T / S);
      var seen = new Uint8Array(gw * gh), prev = new Int32Array(gw * gh).fill(-1), q = new Int32Array(gw * gh), free = new Int8Array(gw * gh);
      function ok(ix, iy) { var id = iy * gw + ix, v = free[id]; if (v) return v === 1; var b = collideCircle(ix * S + S / 2, iy * S + S / 2, R); free[id] = b ? 2 : 1; return !b; }
      var sx = Math.floor(fx / S), sy = Math.floor(fy / S), head = 0, tail = 0, goal = -1;
      if (!ok(sx, sy)) return { ok: false, steps: 0, why: 'inicio bloqueado' };
      seen[sy * gw + sx] = 1; q[tail++] = sy * gw + sx;
      var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      while (head < tail) {
        var id = q[head++], ix = id % gw, iy = (id - ix) / gw;
        if (inExitRaw(ix * S + S / 2, iy * S + S / 2)) { goal = id; break; }
        for (var k = 0; k < 4; k++) {
          var nx = ix + nb[k][0], ny = iy + nb[k][1];
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          var nid = ny * gw + nx;
          if (seen[nid] || !ok(nx, ny)) continue;
          seen[nid] = 1; prev[nid] = id; q[tail++] = nid;
        }
      }
      if (goal < 0) return { ok: false, steps: 0, explored: tail };
      var steps = 0; for (var cur = goal; prev[cur] >= 0; cur = prev[cur]) steps++;
      return { ok: true, steps: steps, px: steps * S };
    }
    function routeCheck(Rarg) {
      var R = Rarg || (ACH.ent && ACH.ent.CFG.radius) || 5, all = true, checks = [];
      REST.forEach(function (rp) { var res = bfs(rp.x, rp.y, R); res.from = rp.label; checks.push(res); if (!res.ok) all = false; });
      return { ok: all, steps: checks[0].steps, px: checks[0].px, checks: checks };
    }
    function spawnCheck() {
      var out = [], ZR = (ACH.ent && ACH.ent.CFG.zRadius) || 5;
      function chk(what, x, y, rad) { if (collideCircle(x, y, rad)) out.push({ what: what, x: Math.round(x), y: Math.round(y) }); }
      chk('inicio', START.x, START.y, 5);
      var NAME = { Z: 'caminante', C: 'ciego', B: 'cobrador', E: 'escolar', O: 'senoraOlla', W: 'senoraBalde', K: 'señoras', V: 'gallinazo' };
      spawns.forEach(function (s, n) {
        var name = NAME[s.ch] + '#' + n;
        if (s.ch === 'E' || s.ch === 'K') { chk(name + 'a', s.x - 7, s.y + 4, ZR); chk(name + 'b', s.x + 7, s.y + 4, ZR); chk(name + 'c', s.x, s.y - 6, ZR); }
        else chk(name, s.x, s.y, s.ch === 'V' ? 3 : ZR);
      });
      DOGS.forEach(function (d, n) { chk('perro#' + n, d.x, d.y, 4); });
      CHICKENS.forEach(function (d, n) { chk('gallina#' + n, d.x, d.y, 3); });
      REST.forEach(function (d, n) { chk('descanso#' + n, d.x, d.y, 5); });
      mototaxistas.forEach(function (m, n) { /* sentado dentro de la mototaxi: no cuenta como choque */ });
      props.forEach(function (p, n) {
        if (!(p.fw > 0)) return;
        var c0 = Math.floor(p.x0 / T), c1 = Math.floor((p.x1 - 0.01) / T), r0 = Math.floor(p.y0 / T), r1 = Math.floor((p.y1 - 0.01) / T);
        for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) if (isSolidTile(cc, rr)) { out.push({ what: 'prop ' + p.k + '#' + n + ' pisa sólido', x: p.x, y: p.y }); return; }
      });
      LANES.forEach(function (Ln) {
        for (var k = 1; k < Ln.pts.length; k++) {
          var a = Ln.pts[k - 1], b = Ln.pts[k], n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6);
          for (var j = 0; j <= n; j++) { var x = a.x + (b.x - a.x) * j / n, y = a.y + (b.y - a.y) * j / n, pr = propAt(x, y); if (pr && !(pr.k === 'bolsasCerro' && k === Ln.pts.length - 1)) { out.push({ what: 'carril ' + Ln.id + ' cruza ' + pr.k, x: Math.round(x), y: Math.round(y) }); return; } }
        }
      });
      return out;
    }
    function effFace(f, res) {
      if (res && typeof res.face === 'number') return res.face;
      return f.face || 0;
    }

    var LM = ACH.ent && ACH.ent.CFG && ACH.ent.CFG.fx && ACH.ent.CFG.fx.lotLandmarks;
    if (Array.isArray(LM)) ['OLLA', 'LOSA', 'CRUZ', 'BOD1', 'BOD2'].forEach(function (id) { if (LM.indexOf(id) < 0) LM.push(id); });

    return {
      id: 'cerro', name: 'EL CERRO',
      T: T, COLS: COLS, ROWS: ROWS, W: COLS * T, H: ROWS * T, ROW: null, JIRONES: [], PASAJES: [],
      MAP: MAP, grid: grid, lotAt: lotAt, LOTS: LOTS, FOOT: FOOT, spawns: spawns, props: props,
      start: START, lights: [], over: {}, decals: decals, decor: [], poles: poles, poleChains: poleChains, dogSpawns: DOGS, birdSpawns: birdSpawns,
      tileAt: tileAt, isSolidTile: isSolidTile, buildProps: buildProps,
      collideCircle: collideCircle, moveCircle: moveCircle, los: los, inExit: inExit,
      routeCheck: routeCheck, spawnCheck: spawnCheck, SOCIAL: null, lotsBaked: [], cables: [], effFace: effFace,
      bloodPerScreen: function () { return { total: 0, maxPerScreen: 0 }; }, propAt: propAt, catSpawns: CATS, FOOD_CARTS: {}, foodCarts: [],
      hiddenLoot: [{ id: 'colaInglesa', x: 62 * T, y: 97.4 * T, p: 0.5 }], looseDecor: looseDecor,
      slopeAt: slopeAt, isStairs: isStairs, surfaceAt: surfaceAt, respawnOk: respawnOk, respawnPick: respawnPick, inExitRaw: inExitRaw,
      arena: ARENA, nido: NIDO, huaicos: L.HUAICO, groundTile: groundTile, bakeExtra: bakeExtra, extraSolid: extraSolid,
      lanes: LANES, restPoints: REST, zones: ZONES, radio: RADIO, perches: perches, waterSources: waterSources, trashPiles: TRASH, chickenSpawns: CHICKENS, mototaxistas: mototaxistas,
      ollaComun: OLLA_C, cisterna: CIST, cruz: cruzBase, losa: { x: LOSA.c0 * T, y: LOSA.r0 * T, gate: LOSA.gate },
      cfgNoche: { triggerX: null, triggerY: 70 * T, atTime: 300, kicker: 'A.H. LUCERO ALTO · 7:00 P.M.' },
      lookAheadY: 40, progress: function (p) { return Math.max(0, Math.min(1, 1 - p.y / (ROWS * T))); },
      bandOf: function (y) { return bandOf(Math.floor(y / T)); }
    };
  }

  ACH.levels = ACH.levels || {};
  ACH.levels.cerro = { id: 'cerro', name: 'EL CERRO', build: build };
})();
