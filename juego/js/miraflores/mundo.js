/* ACHORADO — js/miraflores/mundo.js (M1a): el mapa del Parque Kennedy + Parque 7 de Junio (MIRAFLORES.md §3).
   Reemplaza a js/engine/world.js en miraflores.html y publica ACH.world con la MISMA forma (mismas claves y tipos), más claves nuevas:
     D(c)            fila donde empieza la Diagonal en la columna c (escalera: 27 + floor(c / 4.2))
     water[]         {id, x, y, r} piletas (px de mundo): Óvalo, NE y SO. inWater(x, y) → pileta o null
     dynSolids[]     {x0, y0, x1, y1, off?, jefa?}: sólidos que ponen otros módulos en tiempo de ejecución (la carretilla de la jefa, los vendedores).
                     collideCircle y los() los respetan; routeCheck ignora los que llevan `jefa` (la prueba considera muerta a la jefa).
     places{}        puntos con nombre (px) para ACH.debug.mira.tp y para los otros sistemas: ovalo, rotonda, iglesia, pizzas, juegos, catpark, wong…
     doors{}         puerta de cada negocio (px, en la vereda) para los trabajadores: doors.bembos = [{x, y}, …]
     vendors[]       {id, name, x, y}: Don Tito y Don Pepe (los dibuja y atiende inflables.js)
     checkpoint      {x, y, col}: plazuela de la iglesia (al pasar la col 88)
     startHome       {x, y}: el inicio del Óvalo (ACH.world.start se muta en el punto de control y vuelve aquí en reset)
   Mapa: 160 × 80 tiles. Arriba la manzana de Larco (vitrina), luego Larco y la ciclovía; el parque en cuña (angosto al oeste, ancho al este);
   la Diagonal baja en escalera y abajo queda la manzana de la Diagonal (azoteas) con la Calle de las Pizzas (cols 99–102) como salida. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var MIRA = ACH.mira = ACH.mira || {}; MIRA.systems = MIRA.systems || [];

  var T = 16, COLS = 160, ROWS = 80;
  function D(c) { c = Math.max(0, Math.min(COLS - 1, Math.floor(c))); return 27 + Math.floor(c / 4.2); }

  /* ---------------- Leyenda de la grilla ----------------
     L lote (sólido) · X barricada (sólido) · s vereda · n sardinel norte · u sardinel sur · . pista · - raya discontinua (Larco)
     j jirón (asfalto) · c ciclovía · p parque (pasto, caminos, plazas: lo pinta W.over) · z calle peatonal (Calle de las Pizzas, Diez Canseco) */
  var SOLID = { L: 1, X: 1 };
  var ROW = {
    blockN: [0, 10], walkN: [11, 13], curbN: 14, laneN: [15, 19], dashN: [16, 16.67], dashS: [18, 18.33],
    curbS: 20, bici: 21, walkPark: 22, park: [23, 26], laneS: [29, 33], berma: [-9, -9], walkS: [35, 36], blockS: [37, 79]
  };
  var JIRONES = [[40, 43], [118, 121], [146, 149]];
  var PASAJES = [];
  var PIZZA = { c0: 99, c1: 102, exitR0: 74, exitR1: 79 };
  function inJiron(c) { for (var i = 0; i < JIRONES.length; i++) if (c >= JIRONES[i][0] && c <= JIRONES[i][1]) return JIRONES[i]; return null; }
  function rS(c0, c1) { var m = 0; for (var c = c0; c <= c1; c++) m = Math.max(m, D(c) + 10); return m; }

  /* ---------------- LOTS (MIRAFLORES.md §3.3): de oeste a este ----------------
     arch mf_tienda + brand · mf_generico + giro · mf_torre · mf_iglesia · mf_muni · mf_pizzeria · mf_banos. Sin arte, render.js usa
     el bloque provisorio de base.js; este archivo agrega encima la banda de la marca (ver provLot). */
  var LOTS = [
    // ---- Manzana de Larco (lado N: fachada al sur) ----
    { id: 'N0', side: 'N', c0: 0, c1: 11, r0: 0, r1: 10, arch: 'mf_tienda', brand: 'saga', floors: 4, face: 9, color: 'menta', corner: 'W' },
    { id: 'N1', side: 'N', c0: 12, c1: 19, r0: 0, r1: 10, arch: 'mf_generico', giro: 'hotel', floors: 3, color: 'durazno', name: 'HOTEL' },
    { id: 'N2', side: 'N', c0: 20, c1: 29, r0: 0, r1: 10, arch: 'mf_torre', floors: 7, face: 7, color: 'gris', name: '' },
    { id: 'N3', side: 'N', c0: 30, c1: 39, r0: 0, r1: 10, arch: 'mf_generico', giro: 'ropa', floors: 2, color: 'rosado', name: 'MODA', corner: 'E' },
    { id: 'N4', side: 'N', c0: 44, c1: 51, r0: 0, r1: 10, arch: 'mf_tienda', brand: 'tailoy', floors: 2, color: 'menta', corner: 'W' },
    { id: 'N5', side: 'N', c0: 52, c1: 58, r0: 0, r1: 10, arch: 'mf_generico', giro: 'farmacia', floors: 1, color: 'blanco', name: 'FARMACIA' },
    { id: 'N6', side: 'N', c0: 59, c1: 65, r0: 0, r1: 10, arch: 'mf_generico', giro: 'polloFrito', floors: 2, color: 'ocre', name: 'POLLO FRITO' },
    { id: 'N7', side: 'N', c0: 66, c1: 73, r0: 0, r1: 10, arch: 'mf_torre', floors: 6, color: 'vidrio', name: '' },
    { id: 'N8', side: 'N', c0: 74, c1: 82, r0: 0, r1: 10, arch: 'mf_generico', giro: 'galeria', floors: 2, color: 'crema', name: 'GALERÍA' },
    { id: 'N9', side: 'N', c0: 83, c1: 91, r0: 0, r1: 10, arch: 'mf_generico', giro: 'banco', floors: 2, color: 'azul', name: 'BANCO' },
    { id: 'N10', side: 'N', c0: 92, c1: 98, r0: 0, r1: 10, arch: 'mf_tienda', brand: 'chinawok', floors: 2, color: 'rojo' },
    { id: 'N11', side: 'N', c0: 99, c1: 105, r0: 0, r1: 10, arch: 'mf_tienda', brand: 'bembos', floors: 2, color: 'azul' },
    { id: 'N12', side: 'N', c0: 106, c1: 112, r0: 0, r1: 10, arch: 'mf_tienda', brand: 'belisario', floors: 2, color: 'crema' },
    { id: 'N13', side: 'N', c0: 113, c1: 117, r0: 0, r1: 10, arch: 'mf_generico', giro: 'heladeria', floors: 1, color: 'rosado', name: 'HELADOS', corner: 'E' },
    { id: 'N14', side: 'N', c0: 122, c1: 129, r0: 0, r1: 10, arch: 'mf_tienda', brand: 'lalucha', floors: 2, color: 'gris', corner: 'W' },
    { id: 'N15', side: 'N', c0: 130, c1: 137, r0: 0, r1: 10, arch: 'mf_tienda', brand: 'starbucks', floors: 2, color: 'crema' },
    { id: 'N16', side: 'N', c0: 138, c1: 145, r0: 0, r1: 10, arch: 'mf_generico', giro: 'churreria', floors: 1, color: 'durazno', name: 'CHURROS', corner: 'E' },
    { id: 'N17', side: 'N', c0: 150, c1: 159, r0: 0, r1: 10, arch: 'mf_tienda', brand: 'ripley', floors: 4, face: 9, color: 'gris', corner: 'W' },
    // ---- Dentro de la banda del parque (fachada al sur) ----
    { id: 'IGL', side: 'N', c0: 90, c1: 101, r0: 25, r1: 36, arch: 'mf_iglesia', floors: 3, face: 9, color: 'crema', name: 'VIRGEN MILAGROSA', park: true },
    { id: 'MUNI', side: 'N', c0: 103, c1: 116, r0: 23, r1: 31, arch: 'mf_muni', floors: 2, face: 7, color: 'crema', name: 'MUNICIPALIDAD', park: true },
    { id: 'GAL', side: 'N', c0: 122, c1: 145, r0: 23, r1: 30, arch: 'mf_generico', giro: 'galeria', floors: 2, color: 'celeste', name: 'GALERÍAS', park: true },
    { id: 'BAN', side: 'N', c0: 79, c1: 82, r0: 41, r1: 43, arch: 'mf_banos', floors: 1, color: 'blanco', name: 'BAÑOS', park: true },
    { id: 'WONG', side: 'N', c0: 150, c1: 159, r0: 23, r1: D(150) - 1, arch: 'mf_tienda', brand: 'wong', floors: 2, color: 'blanco', park: true },
    // ---- Manzana de la Diagonal (lado S: azoteas con letrero de azotea y toldos vistos desde arriba) ----
    { id: 'S0', side: 'S', c0: 0, c1: 11, arch: 'mf_generico', giro: 'cafe', floors: 2, color: 'durazno', name: 'CAFÉ' },
    { id: 'S1', side: 'S', c0: 12, c1: 24, arch: 'mf_generico', giro: 'cine', floors: 2, color: 'gris', name: 'CINE' },
    { id: 'S2', side: 'S', c0: 25, c1: 39, arch: 'mf_generico', giro: 'galeria', floors: 2, color: 'crema', name: '' },
    { id: 'S3', side: 'S', c0: 40, c1: 50, arch: 'mf_generico', giro: 'hotel', floors: 3, color: 'rosado', name: '' },
    { id: 'S4', side: 'S', c0: 51, c1: 59, arch: 'mf_generico', giro: 'banco', floors: 2, color: 'celeste', name: '' },
    { id: 'S5', side: 'S', c0: 60, c1: 66, arch: 'mf_tienda', brand: 'lalucha', floors: 1, color: 'gris' },
    { id: 'S6', side: 'S', c0: 67, c1: 72, arch: 'mf_tienda', brand: 'starbucks', floors: 1, color: 'crema' },
    { id: 'S7', side: 'S', c0: 73, c1: 80, arch: 'mf_generico', giro: 'heladeria', floors: 1, color: 'rosado', name: 'HELADERÍA' },
    { id: 'S8', side: 'S', c0: 81, c1: 91, arch: 'mf_generico', giro: 'sangucheria', floors: 2, color: 'ocre', name: 'SANGUCHERÍA' },
    { id: 'S9', side: 'S', c0: 92, c1: 98, arch: 'mf_pizzeria', floors: 2, color: 'verde', name: 'PIZZERÍA', pizza: 'W', dir: 'E', names: ['LA TRATTORIA', 'PIZZA NOSTRA'] },
    { id: 'S10', side: 'S', c0: 103, c1: 109, arch: 'mf_pizzeria', floors: 2, color: 'verde', name: 'PIZZERÍA', pizza: 'E', dir: 'W', names: ['MAMMA MÍA', 'DON CORLEONE'] },
    { id: 'S11', side: 'S', c0: 110, c1: 121, arch: 'mf_generico', giro: 'polloFrito', floors: 2, color: 'ocre', name: '' },
    { id: 'S12', side: 'S', c0: 122, c1: 133, arch: 'mf_generico', giro: 'ropa', floors: 2, color: 'menta', name: '' },
    { id: 'S13', side: 'S', c0: 134, c1: 147, arch: 'mf_generico', giro: 'cafe', floors: 1, color: 'durazno', name: '' },
    { id: 'S14', side: 'S', c0: 148, c1: 159, arch: 'mf_torre', floors: 6, color: 'gris', name: '' }
  ];
  LOTS.forEach(function (f) {
    if (f.side === 'S') { f.r0 = rS(f.c0, f.c1); f.r1 = ROWS - 1; }
    if (f.brand && !f.name) f.name = brandName(f.brand);
    f.name = f.name || ''; f.damage = f.damage || 0; f.roof = f.roof || []; f.front = f.front || [];
  });
  function brandName(id) { return MIRA.brandName ? MIRA.brandName(id) : String(id).toUpperCase(); }
  (function () {   // semilla, cara visible y vecinos (como world.js)
    function seedOf(id) { var h = 2166136261; for (var i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 10000; }
    function faceOf(f) {
      if (f.side !== 'N' || f.walk) return 0;
      if (f.face) return Math.min(f.face, f.r1 - f.r0 + 1);
      var v = { 0: 3, 1: 3, 2: 5, 3: 7 }[f.floors] || 7;
      return Math.min(v, f.r1 - f.r0 + 1);
    }
    for (var i = 0; i < LOTS.length; i++) {
      var f = LOTS[i];
      if (f.seed === undefined) f.seed = seedOf(f.id);
      f.face = faceOf(f);
      f.nbW = -1; f.nbE = -1;
      for (var j = 0; j < LOTS.length; j++) {
        var g = LOTS[j];
        if (g === f || g.side !== f.side || g.r1 < f.r0 || g.r0 > f.r1) continue;
        if (g.c1 === f.c0 - 1 && g.r0 === f.r0) f.nbW = g.floors;
        if (g.c0 === f.c1 + 1 && g.r0 === f.r0) f.nbE = g.floors;
      }
    }
  })();

  /* ---------------- Grilla ---------------- */
  function bandChar(c, r) {
    var d = D(c);
    if (r <= 10) return 'L';
    if (r <= 13) return 's';
    if (r === 14) return 'n';
    if (r <= 19) return r === 16 || r === 18 ? '-' : '.';
    if (r === 20) return 'u';
    if (r === 21) return 'c';
    if (r === 22) return 's';
    if (r < d) return 'p';
    if (r === d) return 's';
    if (r === d + 1) return 'n';
    if (r <= d + 6) return '.';
    if (r === d + 7) return 'u';
    if (r <= d + 9) return 's';
    return 'L';
  }
  var grid = [], lotAt = [], r, c, i;
  for (r = 0; r < ROWS; r++) {
    var row = [], lrow = [];
    for (c = 0; c < COLS; c++) {
      var ch = bandChar(c, r), J = inJiron(c);
      if (J && r <= 13) ch = r === 0 ? 'X' : 'j';                                  // jirones al norte, con barricada al fondo
      if (J && J[0] === 118 && r >= 21 && r <= 31) ch = 'z';                       // Diez Canseco sigue peatonal hasta el parque
      if (J && J[0] === 146 && r >= 23 && r < D(c)) ch = 'j';                      // Schell baja de Larco a la Diagonal
      if (c >= PIZZA.c0 && c <= PIZZA.c1 && r >= D(c) + 10) ch = 'z';             // Calle de las Pizzas
      row.push(ch); lrow.push(-1);
    }
    grid.push(row); lotAt.push(lrow);
  }
  for (i = 0; i < LOTS.length; i++) {
    var L = LOTS[i];
    for (r = L.r0; r <= L.r1; r++) for (c = L.c0; c <= L.c1; c++) { grid[r][c] = 'L'; lotAt[r][c] = i; }
  }
  // las filas de la manzana de la Diagonal que no tapa ningún lote (lote más bajo que la Diagonal en esa columna) quedan de vereda
  for (c = 0; c < COLS; c++) for (r = D(c) + 10; r < ROWS; r++) if (grid[r][c] === 'L' && lotAt[r][c] < 0) grid[r][c] = 's';
  for (c = 0; c < COLS; c++) for (r = D(c) + 8; r < ROWS; r++) {
    if (lotAt[r][c] >= 0 || grid[r][c] === 'z') break;
    if (grid[r][c] === 'L') grid[r][c] = 's';
  }
  var MAP = grid.map(function (rw) { return rw.join(''); });

  /* ---------------- Inicio, punto de control y salida ---------------- */
  var START_HOME = { x: 4 * T + 8, y: 25 * T + 8 };
  var START = { x: START_HOME.x, y: START_HOME.y };
  var CHECKPOINT = { x: 95 * T + 8, y: 38 * T + 8, col: 88 };
  function px(cc, rr) { return { x: Math.round(cc * T), y: Math.round(rr * T) }; }
  var PLACES = {
    ovalo: { x: START_HOME.x, y: START_HOME.y }, rotonda: px(57.5, 41.2), rotondaC: px(57.5, 35.5), iglesia: { x: CHECKPOINT.x, y: CHECKPOINT.y },
    pizzas: px(100.9, D(100) + 4.5), pizzasEntrada: px(101, D(101) + 9.5), juegos: px(128, 49.6), catpark: px(110, 46.6), wong: px(155, D(155) + 0.6),
    mercado: px(100, 44.5), juegosChicos: px(30, 31), salida: px(101, 76.5)
  };

  /* ---------------- Piletas (agua donde Alexander se puede meter) ---------------- */
  // {id, x, y, r, ry}: elipse del agua (px de mundo). El centro es el ancla de la pileta; si el sprite trae `water: {x, y, r}` (relativo al ancla), manda.
  var WATER_DEF = { ovalo: { c: 0.5, r: 27.3, rad: 44, ry: 14 }, ne: { c: 85, r: 26.6, rad: 20, ry: 8 }, so: { c: 136, r: 57.4, rad: 20, ry: 8 } };
  var water = Object.keys(WATER_DEF).map(function (id) { var w = WATER_DEF[id]; return { id: id, x: Math.round(w.c * T), y: Math.round(w.r * T), r: w.rad, ry: w.ry }; });
  function inWater(x, y) {
    for (var k = 0; k < water.length; k++) { var w = water[k], dx = (x - w.x) / w.r, dy = (y - w.y) / (w.ry || w.r * 0.4); if (dx * dx + dy * dy < 1) return w; }
    return null;
  }

  /* ---------------- Huellas a escala final ----------------
     Árboles y faroles: siempre la huella de aquí (solo el tronco o el poste), aunque el arte traiga otra (w: 9999 = nunca «entregado»).
     Los demás props usan el fw/fh de su sprite (o el del provisorio). */
  var FOOT = {
    palmera: { w: 9999, fw: 4, fh: 4, tall: true, tree: true }, palmeraSeca: { w: 9999, fw: 4, fh: 4, tall: true, tree: true },
    ficus: { w: 9999, fw: 6, fh: 4, tall: true, tree: true }, jacaranda: { w: 9999, fw: 5, fh: 4, tall: true, tree: true },
    farolGlobo: { w: 9999, fw: 3, fh: 3, tall: true }, farolGloboDoble: { w: 9999, fw: 4, fh: 3, tall: true }, mastilBandera: { w: 9999, fw: 3, fh: 3, tall: true },
    pergolaSalmon: { w: 9999, fw: 0, fh: 0, tall: true, tree: true }, arcoPizzas: { w: 9999, fw: 0, fh: 0, tall: true, tree: true }, cortinaLuces: { w: 9999, fw: 0, fh: 0, tall: true },
    piletaOvalo: { w: 9999, fw: 10, fh: 6, tall: false }, piletaChica: { w: 9999, fw: 8, fh: 5, tall: false },
    caballetePintor: { w: 9999, fw: 8, fh: 4 }, rejita: { w: 9999, fw: 0, fh: 0 },
    // vehículos del motor (los mismos de world.js)
    carVar: { w: 68, h: 34, fw: 62, fh: 17 }, custerE: { w: 112, h: 56, fw: 106, fh: 21, tall: true }, custerW: { w: 112, h: 56, fw: 106, fh: 21, tall: true },
    combiE: { w: 80, h: 46, fw: 74, fh: 18, tall: true }, mototaxiVar: { w: 44, h: 36, fw: 38, fh: 13 }
  };
  var FALLBACK = { carVar: 'car', palmera: 'palm', ficus: 'treeWhite', basureroMira: 'trash' };

  // Provisorios de los props de M2a: [ancho, alto, color, fw, fh, rótulo]. Se registran en ACH.sprites.props SOLO si faltan.
  var PROV = {
    palmera: [26, 84, '#6f8f3e', 4, 4, 'PALMERA'], palmeraSeca: [16, 64, '#9a8a6a', 4, 4, 'SECA'], ficus: [54, 60, '#3f6b38', 6, 4, 'FICUS'],
    jacaranda: [48, 54, '#8a64b8', 5, 4, 'JACARANDÁ'], seto: [32, 12, '#3f7a3a', 30, 7, 'SETO'], parterreRojo: [30, 9, '#c8402c', 28, 6, ''],
    parterreAmarillo: [30, 9, '#e8b830', 28, 6, ''], rejita: [32, 6, '#1c1a22', 0, 0, ''], banca: [26, 16, '#8a5a32', 22, 6, 'BANCA'],
    muroBanca: [40, 12, '#cdbb98', 38, 7, 'MURO'], cilindroGranito: [10, 10, '#9a9690', 8, 5, ''], farolGlobo: [10, 46, '#2a2a30', 3, 3, ''],
    farolGloboDoble: [24, 46, '#2a2a30', 4, 3, ''], piletaOvalo: [96, 44, '#7fa8b8', 10, 6, 'PILETA'], piletaChica: [48, 28, '#7fa8b8', 8, 5, 'PILETA'],
    gradaRotonda: [30, 14, '#d8c8a2', 26, 9, 'GRADA'], toritoPucara: [20, 26, '#3a64b8', 14, 7, 'TORITO'], busto: [14, 30, '#8a8478', 10, 6, 'BUSTO'],
    vasija: [14, 18, '#b8744a', 10, 6, ''], mastilBandera: [6, 64, '#d8d8d0', 3, 3, ''], columpio: [42, 34, '#c8402c', 36, 7, 'COLUMPIO'],
    tobogan: [40, 30, '#e8b830', 32, 9, 'TOBOGÁN'], subeBaja: [40, 14, '#3a8ac8', 34, 6, 'SUBE-BAJA'], toldoFeria: [36, 30, '#d86a3a', 30, 10, 'FERIA'],
    caballetePintor: [14, 26, '#a07a4a', 8, 4, ''], mesaAjedrez: [20, 14, '#8a8478', 14, 7, 'AJEDREZ'], kioscoGolosinas: [30, 40, '#e04a4a', 24, 9, 'KIOSCO'],
    basureroMira: [9, 13, '#3a5a3a', 6, 4, ''], cajaGatos: [16, 10, '#b8925a', 12, 5, 'CAJA'], pergolaSalmon: [80, 52, '#e8a08a', 0, 0, 'PÉRGOLA'],
    arcoPizzas: [76, 64, '#8a2a20', 0, 0, 'CALLE DE LAS PIZZAS'], cortinaLuces: [64, 18, '#ffe08a', 0, 0, ''], mesaPizzeria: [22, 16, '#c8b89a', 15, 7, 'MESA'],
    atrilMenu: [10, 18, '#3a2a20', 6, 4, ''],
    maceteroMira: [14, 16, '#b8744a', 10, 5, '']   // v0.11: macetero de vereda (cargables.js lo arranca)
  };
  var LAMPS = { farolGlobo: [{ x: 0, y: -42 }], farolGloboDoble: [{ x: -8, y: -40 }, { x: 8, y: -40 }] };
  var PROV_TALL = { palmera: 1, palmeraSeca: 1, ficus: 1, jacaranda: 1, farolGlobo: 1, farolGloboDoble: 1, mastilBandera: 1, pergolaSalmon: 1, arcoPizzas: 1, kioscoGolosinas: 1, cortinaLuces: 1 };
  function drawProvShape(k, col) {
    return function (g, w, h) {
      var K = '#1c1a22';
      function rr(x, y, ww, hh, cc) { g.fillStyle = K; g.fillRect(x - 1, y - 1, ww + 2, hh + 2); g.fillStyle = cc; g.fillRect(x, y, ww, hh); }
      if (k === 'palmera' || k === 'palmeraSeca') {
        rr(Math.floor(w / 2) - 2, 16, 4, h - 17, '#c8c2b4');
        if (k === 'palmera') { rr(2, 4, w - 4, 12, col); g.fillStyle = '#4f6f2e'; g.fillRect(4, 12, w - 8, 3); }
        else { g.fillStyle = '#7a6a4a'; g.fillRect(Math.floor(w / 2) - 5, 12, 10, 4); }
      } else if (k === 'ficus' || k === 'jacaranda') {
        rr(Math.floor(w / 2) - 3, h - 22, 6, 21, '#7a7068'); rr(2, 2, w - 4, h - 24, col);
        g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(4, 4, w - 8, 4);
      } else if (k === 'farolGlobo' || k === 'farolGloboDoble') {
        rr(Math.floor(w / 2) - 1, 6, 2, h - 7, col);
        g.fillStyle = K; if (k === 'farolGlobo') { g.fillRect(1, 0, 8, 8); g.fillStyle = '#f3efe2'; g.fillRect(2, 1, 6, 6); }
        else { g.fillRect(0, 2, 8, 8); g.fillRect(w - 8, 2, 8, 8); g.fillRect(4, 8, w - 8, 2); g.fillStyle = '#f3efe2'; g.fillRect(1, 3, 6, 6); g.fillRect(w - 7, 3, 6, 6); }
      } else if (k === 'mastilBandera') {
        rr(2, 0, 2, h - 1, col); g.fillStyle = '#d8263a'; g.fillRect(4, 2, 2, 6);
      } else if (k === 'piletaOvalo' || k === 'piletaChica') {
        g.fillStyle = K; g.beginPath(); g.ellipse(w / 2, h / 2 + 4, w / 2, h / 2 - 4, 0, 0, 6.3); g.fill();
        g.fillStyle = '#cdbb98'; g.beginPath(); g.ellipse(w / 2, h / 2 + 4, w / 2 - 1, h / 2 - 5, 0, 0, 6.3); g.fill();
        g.fillStyle = col; g.beginPath(); g.ellipse(w / 2, h / 2 + 4, w / 2 - 4, h / 2 - 8, 0, 0, 6.3); g.fill();
        rr(Math.floor(w / 2) - 2, 2, 4, h / 2, '#cdbb98');
      } else if (k === 'pergolaSalmon' || k === 'arcoPizzas') {
        rr(2, 8, 5, h - 9, col); rr(w - 7, 8, 5, h - 9, col); rr(0, 2, w, 10, col);
      } else if (k === 'maceteroMira') {   // v0.11
        rr(2, 6, w - 4, h - 7, col); g.fillStyle = '#8a4f2a'; g.fillRect(2, 6, w - 4, 2); g.fillStyle = '#2f6a2a'; g.fillRect(3, 0, w - 6, 6); g.fillStyle = '#4f9a3a'; g.fillRect(4, 1, 3, 3); g.fillStyle = '#d8402c'; g.fillRect(w - 6, 1, 2, 2);
      } else if (k === 'cortinaLuces') {
        g.fillStyle = '#2a2a30'; g.fillRect(0, 1, w, 1);
        for (var x = 2; x < w; x += 5) { g.fillStyle = '#2a2a30'; g.fillRect(x, 1, 1, 4 + (x % 3) * 3); g.fillStyle = col; g.fillRect(x, 5 + (x % 3) * 3, 2, 2); }
      } else rr(1, 1, w - 2, h - 2, col);
    };
  }
  function ensureProps() {
    var S = ACH.sprites = ACH.sprites || {}, P = S.props = S.props || {}, k;
    for (k in PROV) {
      var have = P[k], ok = Array.isArray(have) ? have.length && have[0] && have[0].width : (have && have.width);
      if (ok) continue;
      var d = PROV[k], label = d[5], shaped = !!{ palmera: 1, palmeraSeca: 1, ficus: 1, jacaranda: 1, farolGlobo: 1, farolGloboDoble: 1, mastilBandera: 1, piletaOvalo: 1, piletaChica: 1, pergolaSalmon: 1, arcoPizzas: 1, cortinaLuces: 1, maceteroMira: 1 }[k];
      if (FALLBACK[k] && (Array.isArray(P[FALLBACK[k]]) ? P[FALLBACK[k]].length : P[FALLBACK[k]])) continue;   // el arte del Callao equivalente (palmera, árbol) antes que un bloque
      var pil = k === 'piletaOvalo' || k === 'piletaChica';
      var spr = MIRA.prov ? MIRA.prov('mprop.' + k, d[0], d[1], d[2], label, { fw: d[3], fh: d[4], ay: pil ? Math.floor(d[1] / 2) + 4 : undefined, draw: shaped ? drawProvShape(k, d[2]) : null }) : null;
      if (!spr) continue;
      if (LAMPS[k]) { if (LAMPS[k].length > 1) spr.lamps = LAMPS[k]; else spr.lamp = LAMPS[k][0]; }
      if (PROV_TALL[k]) spr.tall = true;
      spr.placeholder = true;
      P[k] = spr;
    }
  }

  /* ---------------- Tiles provisorios (M2a los trae en ACH.sprites.tiles; solo se crean los que falten) ---------------- */
  function hashT(cc, rr) { var h = (cc * 374761393 + rr * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return (h ^ (h >>> 16)) >>> 0; }
  function mkTile(draw) { var t = document.createElement('canvas'); t.width = 16; t.height = 16; var g = t.getContext('2d'); g.imageSmoothingEnabled = false; draw(g); return t; }
  function dots(g, seed, col, n) { g.fillStyle = col; for (var q = 0; q < n; q++) { var h = hashT(seed, q * 7 + 1); g.fillRect(h % 16, (h >>> 8) % 16, 1, 1); } }
  var TILE_PROV = {
    pasto: function (v) { return mkTile(function (g) { g.fillStyle = ['#5f8f3e', '#5a8a3a', '#64933f'][v % 3]; g.fillRect(0, 0, 16, 16); dots(g, 11 + v, '#4d7a32', 14); dots(g, 31 + v, '#78a84c', 8); }); },
    pastoFlor: function (v) { return mkTile(function (g) { g.fillStyle = '#5f8f3e'; g.fillRect(0, 0, 16, 16); dots(g, 41 + v, '#4d7a32', 12); dots(g, 51 + v, v % 2 ? '#e8b830' : '#d8402c', 5); }); },
    adoquinEspiga: function (v) {
      return mkTile(function (g) {
        var a = v % 2 ? '#8A8A8A' : '#A8735A', b = v % 2 ? '#767676' : '#8e5f49';
        g.fillStyle = a; g.fillRect(0, 0, 16, 16); g.fillStyle = b;
        for (var y = 0; y < 16; y += 4) for (var x = ((y / 4) % 2) * 4; x < 16; x += 8) { g.fillRect(x, y, 4, 1); g.fillRect(x + 3, y, 1, 4); }
      });
    },
    adoquinGris: function (v) { return mkTile(function (g) { g.fillStyle = v % 2 ? '#8A8A8A' : '#929290'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#767674'; for (var y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1); for (var x = 0; x < 16; x += 8) g.fillRect(x + (v % 2) * 4, 0, 1, 16); }); },
    veredaMira: function (v) { return mkTile(function (g) { g.fillStyle = ['#cfc8ba', '#d4cdbf', '#c9c2b4'][v % 3]; g.fillRect(0, 0, 16, 16); g.fillStyle = '#b4ad9f'; g.fillRect(0, 15, 16, 1); g.fillRect(15, 0, 1, 16); g.fillRect(0, 7, 16, 1); dots(g, 61 + v, '#bdb6a8', 4); }); },
    ciclovia: function (v) { return mkTile(function (g) { g.fillStyle = v % 2 ? '#b8453a' : '#b24036'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#e8e0cf'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); dots(g, 71 + v, '#9a362d', 6); }); },
    pisoRotonda: function (v) { return mkTile(function (g) { g.fillStyle = v % 2 ? '#d2c09e' : '#cdb89a'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#b8a482'; g.fillRect(0, 15, 16, 1); g.fillRect(7, 0, 1, 16); dots(g, 81 + v, '#c0ac8a', 5); }); }
  };
  var TILE_ALIAS = { bordilloAmarilloN: 'curbNYellow', bordilloAmarilloS: 'curbSYellow' };
  function ensureTiles() {
    var S = ACH.sprites = ACH.sprites || {}, TT = S.tiles = S.tiles || {}, k, n;
    for (k in TILE_PROV) {
      var have = TT[k];
      if (Array.isArray(have) ? (have.length && have[0] && have[0].width) : (have && have.width)) continue;
      var arr = []; for (n = 0; n < 4; n++) arr.push(TILE_PROV[k](n)); arr.prov = true; TT[k] = arr;
    }
    for (k in TILE_ALIAS) {
      if (TT[k] && (Array.isArray(TT[k]) ? TT[k].length : TT[k].width)) continue;
      if (ACH.gfx && ACH.gfx.tile) { try { TT[k] = [ACH.gfx.tile(TILE_ALIAS[k], 0), ACH.gfx.tile(TILE_ALIAS[k], 1)]; } catch (e) { /* nada */ } }
    }
  }
  function hasTile(name) { var o = ACH.sprites && ACH.sprites.tiles && ACH.sprites.tiles[name]; return !!(Array.isArray(o) ? (o.length && o[0] && o[0].width) : (o && o.width)); }
  function nVar(name) { var o = ACH.sprites && ACH.sprites.tiles && ACH.sprites.tiles[name]; return Array.isArray(o) ? Math.max(1, o.length) : 1; }

  /* ---------------- Suelo del parque (W.over) ---------------- */
  var over = {}, decals = [], decor = [];
  function setOver(cc, rr, layers) { over[rr * COLS + cc] = layers; }
  // caminos de adoquín en espiga: segmentos (col, fila) con medio ancho en tiles
  var PATHS = [
    [[3, 25], [18, 26.5], [34, 29], [46, 31], [53.5, 34.5]],                  // Óvalo → 7 de Junio → rotonda
    [[61.5, 36.5], [72, 37.5], [88, 38.5]],                                   // rotonda → plazuela de la iglesia
    [[86, 23], [76, 45]],                                                     // Calle Virgen Milagrosa (sendero en diagonal)
    [[95.5, 39.5], [100, 44.5], [100.5, 50.2]],                               // plazuela → Mercado de Pulgas → Calle de las Pizzas
    [[105, 44.5], [110, 44.5], [119.5, 40], [119.5, 31.5]],                    // mercado → Cat Park → Diez Canseco
    [[110, 44.5], [121, 46.5], [128, 48.5], [136, 54]],                        // Cat Park → juegos de Kennedy → pileta SO
    [[30, 31], [30, 33.5]], [[44, 26], [46, 31]], [[66, 27], [61, 31.5]]       // ramales cortos
  ];
  function segDist(x, y, a, b) {
    var vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy, t = l2 ? ((x - a[0]) * vx + (y - a[1]) * vy) / l2 : 0;
    t = Math.max(0, Math.min(1, t)); var dx = x - (a[0] + vx * t), dy = y - (a[1] + vy * t); return Math.sqrt(dx * dx + dy * dy);
  }
  function onPath(x, y) {
    for (var k = 0; k < PATHS.length; k++) for (var j = 0; j + 1 < PATHS[k].length; j++) if (segDist(x, y, PATHS[k][j], PATHS[k][j + 1]) < 0.85) return true;
    return false;
  }
  function pathDist(x, y) {   // v0.13 (D5): distancia (en tiles) al camino más cercano
    var best = 99;
    for (var k = 0; k < PATHS.length; k++) for (var j = 0; j + 1 < PATHS[k].length; j++) { var d = segDist(x, y, PATHS[k][j], PATHS[k][j + 1]); if (d < best) best = d; }
    return best;
  }
  var ROTONDA = { c: 57.5, r: 35.5, rad: 4.2 }, MERCADO = { c: 100, r: 44.5, rad: 5 };
  function parkLayers(cc, rr) {
    var x = cc + 0.5, y = rr + 0.5, h = hashT(cc, rr), dx, dy;
    dx = x - ROTONDA.c; dy = y - ROTONDA.r;
    if (dx * dx + dy * dy <= ROTONDA.rad * ROTONDA.rad) return [['pisoRotonda', h % nVar('pisoRotonda')]];
    dx = x - MERCADO.c; dy = y - MERCADO.r;
    if (dx * dx + dy * dy <= MERCADO.rad * MERCADO.rad) return [['adoquinEspiga', (Math.abs(dx) < 0.6 || Math.abs(dy) < 0.6 || Math.abs(Math.abs(dx) - Math.abs(dy)) < 0.6) ? 0 : 1]];
    if (cc <= 9) return [['adoquinGris', h % nVar('adoquinGris')]];                                       // plaza del Óvalo
    if (cc >= 90 && cc <= 101 && rr >= 37 && rr <= 39) return [['adoquinGris', h % nVar('adoquinGris')]];  // plazuela de la iglesia
    if (cc >= 103 && cc <= 116 && rr >= 32 && rr <= 34) return [['adoquinGris', h % nVar('adoquinGris')]]; // plazuela Porras
    if (cc >= 77 && cc <= 84 && rr === 44) return [['adoquinGris', h % nVar('adoquinGris')]];              // delante de los baños
    // v0.13 (D5): borde irregular pasto/adoquín: el centro del camino es adoquín; en la franja de afuera quedan adoquines sueltos entre el pasto
    var pd = pathDist(x, y);
    if (pd < 0.85) return [['adoquinEspiga', pd < 0.55 ? 0 : (h >>> 5) % 2]];
    if (pd < 1.5 && (h % 100) < Math.round((1.5 - pd) / 0.65 * 62)) return [['adoquinEspiga', (h >>> 6) % nVar('adoquinEspiga')]];
    return [[h % 100 < 9 ? 'pastoFlor' : 'pasto', (h >>> 8) % nVar('pasto')]];
  }
  function buildOver() {
    for (var k in over) delete over[k];
    var cc, rr;
    for (rr = 0; rr < ROWS; rr++) for (cc = 0; cc < COLS; cc++) {
      var ch = grid[rr][cc], h = hashT(cc, rr), d = D(cc), L = null;
      if (ch === 'p') L = parkLayers(cc, rr);
      else if (ch === 's') L = [['veredaMira', h % nVar('veredaMira')]];
      else if (ch === 'c') L = [['ciclovia', h % nVar('ciclovia')]];
      else if (ch === 'z' && cc >= PIZZA.c0 && cc <= PIZZA.c1) L = [['adoquinGris', h % nVar('adoquinGris')]];   // Calle de las Pizzas: adoquín gris (no tablones)
      else if (ch === 'z') L = [['adoquinEspiga', (cc + rr) % 2 ? 0 : 0]];
      else if (ch === 'u' && rr === 20) L = [['bordilloAmarilloS', 0]];
      else if (ch === 'n' && rr === d + 1) L = [['bordilloAmarilloN', 0]];
      else if (ch === '.' && rr === d + 4 && cc > 1) L = [['asphalt', h % 5], ['laneDashH', 0]];     // raya de la Diagonal (sigue la escalera)
      // escalones de la Diagonal: rampa de 45° de M2a (ACH.sprites.mira.diagRamp) en la primera columna de cada escalón nuevo
      if (cc > 0 && D(cc) > D(cc - 1)) {
        var RP = (ACH.sprites.mira && ACH.sprites.mira.diagRamp) || { north: [{ dr: -1, tile: 'pastoDiag' }, { dr: 0, tile: 'veredaDiag' }, { dr: 1, tile: 'curbDiagA' }], south: [{ dr: 6, tile: 'curbDiagB' }, { dr: 7, tile: 'curbDiagB2' }] };
        (RP.north || []).concat(RP.south || []).forEach(function (q) { if (rr === d + q.dr && hasTile(q.tile)) L = [[q.tile, 0]]; });
      }
      if (!L) continue;
      setOver(cc, rr, L);
    }
  }
  // calcomanías grandes de M2a (si las trae): rotonda, plaza circular y sendero; y algo de desgaste (poca sangre, poca basura)
  (function () {
    var DM = function (k, x, y) { decals.push({ k: k, v: 0, x: Math.round(x), y: Math.round(y), rot: 0, mira: true }); };
    DM('charco', 30 * T, 17.4 * T); DM('parche', 70 * T, 18.8 * T); DM('charco', 122 * T, 16.6 * T);
    DM('frenada', 40 * T, (D(40) + 4) * T); DM('parche', 88 * T, (D(88) + 5) * T); DM('charco', 140 * T, (D(140) + 3) * T);
    DM('sangre', 64 * T, (D(64) + 8.6) * T);              // la única mancha de la cuadra
  })();
  function addMiraDecals() {
    var MD = ACH.sprites && ACH.sprites.mira && ACH.sprites.mira.decals;
    for (var k = decals.length - 1; k >= 0; k--) if (decals[k].miraBig) decals.splice(k, 1);
    if (!MD) return;
    function big(k, x, y) { var s = MD[k]; if (Array.isArray(s)) s = s[0]; if (!s || !s.width) return; ACH.sprites.decals = ACH.sprites.decals || {}; if (!ACH.sprites.decals['mira_' + k]) ACH.sprites.decals['mira_' + k] = s; decals.push({ k: 'mira_' + k, v: 0, x: Math.round(x), y: Math.round(y), rot: 0, miraBig: true }); }
    big('rotonda', ROTONDA.c * T, ROTONDA.r * T);
    big('plazaCircular', MERCADO.c * T, MERCADO.r * T);
    big('virgenMilagrosaSendero', 86 * T, 23 * T);   // ancla = inicio del sendero (86,23) → fin (76,45)
    addParkDetail();
  }
  // v0.13 (D5): hojas moradas de jacaranda (alrededor de cada jacaranda y sobre los caminos) y charcos de lluvia en el adoquín. Cosméticos, horneados con el suelo.
  function detailSprites() {
    var S = ACH.sprites = ACH.sprites || {}, DD = S.decals = S.decals || {};
    if (DD.mira_hojas && DD.mira_charco) return;
    var cols = ['#8a6aa8', '#a98bc0', '#6f5590', '#c4a8d6'], arr = [], v, n, c, g;
    for (v = 0; v < 3; v++) {
      c = mkTile(function () {}); c.width = 30; c.height = 16; g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      for (n = 0; n < 12 + v * 5; n++) { var hh = hashT(v * 31 + n, n * 7 + 3); g.fillStyle = cols[hh % 4]; g.fillRect(2 + (hh >>> 4) % 26, 1 + (hh >>> 9) % 13, 1 + (hh >>> 14) % 2, 1); }
      c.ax = 15; c.ay = 8; arr.push(c);
    }
    DD.mira_hojas = arr;
    var pc = [];
    for (v = 0; v < 2; v++) {
      c = mkTile(function () {}); c.width = 32; c.height = 14; g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      g.fillStyle = '#5d717c'; g.beginPath(); g.ellipse(16, 7, 14 - v * 3, 5 - v, 0, 0, 6.3); g.fill();
      g.fillStyle = '#7e95a1'; g.beginPath(); g.ellipse(15, 6.5, 11 - v * 3, 3.6 - v * 0.6, 0, 0, 6.3); g.fill();
      g.fillStyle = '#b9ccd6'; g.fillRect(9 + v * 2, 5, 4, 1); g.fillRect(19 - v, 7, 3, 1);
      c.ax = 16; c.ay = 7; pc.push(c);
    }
    DD.mira_charco = pc;
  }
  function addParkDetail() {
    detailSprites();
    var n, k, j, pr;
    function put(kk, v, x, y) { decals.push({ k: kk, v: v, x: Math.round(x), y: Math.round(y), rot: 0, miraBig: true }); }
    for (n = 0; n < PROPS.length; n++) {
      pr = PROPS[n]; if (pr.k !== 'jacaranda') continue;
      for (k = 0; k < 4; k++) { var hh = hashT(n * 13 + k, 5); put('mira_hojas', hh % 3, pr.c * T + ((hh >>> 3) % 56) - 28, pr.r * T + ((hh >>> 9) % 30) - 6); }
    }
    // hojas sueltas sobre los caminos, y charcos (uno cada ~9 tiles de camino, a un costado)
    for (k = 0; k < PATHS.length; k++) for (j = 0; j + 1 < PATHS[k].length; j++) {
      var a = PATHS[k][j], b = PATHS[k][j + 1], len = Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1])), steps = Math.max(1, Math.round(len / 9));
      for (n = 0; n < steps; n++) {
        var t = (n + 0.5) / steps, h2 = hashT(k * 17 + j * 5 + n, 91), off = ((h2 % 9) - 4) * 0.12, nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
        var cx = a[0] + (b[0] - a[0]) * t + nx * off, cy = a[1] + (b[1] - a[1]) * t + ny * off;
        if (h2 % 3 === 0) put('mira_charco', h2 % 2, cx * T, cy * T + 4);
        else if (h2 % 3 === 1) put('mira_hojas', h2 % 3, cx * T, cy * T + 4);
      }
    }
  }

  /* ---------------- Props ---------------- */
  var PROPS = [
    // ---- Óvalo: pileta grande cortada por el borde, pérgola salmón, palmeras decapitadas ----
    { k: 'piletaOvalo', c: 0.5, r: 27.3, water: 'ovalo' },
    { k: 'pergolaSalmon', c: 3.6, r: 23.4 },
    { k: 'palmeraSeca', c: 6, r: 23.6, tree: 1 }, { k: 'palmeraSeca', v: 1, c: 8.6, r: 26.5, tree: 1 }, { k: 'palmeraSeca', c: 11.2, r: 23.7, tree: 1 },
    { k: 'palmera', v: 0, c: 1.6, r: 23.4, tree: 1 }, { k: 'palmera', v: 1, c: 6.2, r: 26.6, tree: 1 },
    // ---- Parque 7 de Junio ----
    { k: 'ficus', c: 13, r: 24.3, tree: 1 }, { k: 'banca', c: 16, r: 25.0 }, { k: 'parterreRojo', c: 19, r: 24.5 }, { k: 'ficus', v: 1, c: 24.5, r: 24.6, tree: 1 },
    { k: 'parterreAmarillo', c: 22, r: 28.6 }, { k: 'banca', c: 26.5, r: 28.5 }, { k: 'jacaranda', c: 38, r: 32.2, tree: 1 },
    { k: 'toritoPucara', c: 36, r: 27.4 },
    { k: 'columpio', c: 27.8, r: 28.2 }, { k: 'tobogan', c: 31.6, r: 28.3 }, { k: 'subeBaja', c: 29.6, r: 30.6 },
    { k: 'seto', c: 41, r: 25.4 }, { k: 'busto', c: 46, r: 30.2, name: 'BENAVIDES' }, { k: 'mesaAjedrez', c: 44.4, r: 31.6 }, { k: 'mesaAjedrez', c: 47.8, r: 31.6 },
    { k: 'ficus', c: 50.5, r: 27, tree: 1 }, { k: 'basureroMira', c: 34.5, r: 31.2 },
    // ---- Rotonda / anfiteatro Chabuca Granda ----
    { k: 'gradaRotonda', v: 0, c: 55.8, r: 33.6 }, { k: 'gradaRotonda', v: 1, c: 59.2, r: 33.6 },
    { k: 'gradaRotonda', v: 2, c: 55.8, r: 38.2 }, { k: 'gradaRotonda', v: 3, c: 59.2, r: 38.2 },
    { k: 'vasija', c: 55, r: 31.2 },
    { k: 'farolGloboDoble', c: 53, r: 35.8 }, { k: 'farolGloboDoble', c: 62, r: 35.8 },
    // ---- entre la rotonda y la iglesia ----
    { k: 'ficus', c: 68, r: 27.4, tree: 1 }, { k: 'jacaranda', c: 64, r: 38, tree: 1 }, { k: 'banca', c: 70, r: 36.6 }, { k: 'parterreRojo', c: 72, r: 30.6 },
    { k: 'ficus', v: 1, c: 75, r: 33, tree: 1 }, { k: 'busto', c: 78, r: 38.4, name: 'PLACENCIA' }, { k: 'parterreAmarillo', c: 82, r: 32.6 },
    { k: 'piletaChica', c: 85, r: 26.6, water: 'ne' }, { k: 'mastilBandera', c: 84, r: 24.3 }, { k: 'mastilBandera', c: 85.5, r: 24.0 }, { k: 'mastilBandera', c: 87, r: 24.3 },
    { k: 'jacaranda', v: 1, c: 88, r: 32, tree: 1 }, { k: 'busto', c: 86, r: 43.2, name: 'QUIÑONES' }, { k: 'basureroMira', c: 84.2, r: 39.4 },
    // ---- plazuela de la iglesia y Mercado de Pulgas ----
    { k: 'banca', c: 91.5, r: 39.6 }, { k: 'banca', c: 100.2, r: 39.6 },
    { k: 'kioscoGolosinas', c: 93.4, r: 43.6 },
    { k: 'ficus', c: 106, r: 40.4, tree: 1 }, { k: 'busto', c: 114, r: 33.6, name: 'PORRAS' }, { k: 'ficus', v: 1, c: 116.5, r: 38.4, tree: 1 },
    // ---- Cat Park, Kennedy y los juegos ----
    { k: 'cajaGatos', c: 108.8, r: 42.6 }, { k: 'cajaGatos', c: 111.8, r: 44.2 },
    { k: 'busto', c: 113, r: 50.4, name: 'KENNEDY' }, { k: 'jacaranda', c: 120.5, r: 44.4, tree: 1 }, { k: 'seto', c: 123, r: 37.4 },
    { k: 'columpio', c: 125.8, r: 45.6 }, { k: 'tobogan', c: 129.6, r: 45.9 }, { k: 'subeBaja', c: 128, r: 48.6 },
    { k: 'ficus', c: 124, r: 52.4, tree: 1 }, { k: 'ficus', v: 1, c: 138, r: 36.6, tree: 1 }, { k: 'jacaranda', v: 1, c: 140.5, r: 48.4, tree: 1 },
    { k: 'parterreRojo', c: 141, r: 41.6 }, { k: 'banca', c: 134, r: 41.4 }, { k: 'banca', c: 118, r: 48.2 }, { k: 'ficus', c: 144, r: 46.4, tree: 1 },
    { k: 'piletaChica', c: 136, r: 57.4, water: 'so' }, { k: 'basureroMira', c: 132.6, r: 52.2 },
    // ---- Calle de las Pizzas ----
    { k: 'arcoPizzas', c: 101, r: 60.6 },
    // 3 cortinas de luces ralas y espaciadas; mesas y atriles pegados a los bordes (pasillo central libre de 32 px o más hasta la salida, filas 74–79)
    { k: 'cortinaLuces', c: 101, r: 65.3, sortDy: 400 }, { k: 'cortinaLuces', c: 101, r: 69.8, sortDy: 400 }, { k: 'cortinaLuces', c: 101, r: 74.3, sortDy: 400 },
    { k: 'mesaPizzeria', v: 0, c: 100.125, r: 64.8 }, { k: 'atrilMenu', c: 102.5, r: 67.2 }, { k: 'mesaPizzeria', v: 1, c: 101.8, r: 69.4 }, { k: 'mesaPizzeria', v: 0, c: 100.125, r: 72.0 },
    { k: 'farolGlobo', c: 99.3, r: 67.8 }, { k: 'farolGlobo', c: 102.7, r: 62.6 },
    // v0.11 (A, V011.md §2.4): fuentes de cargables cerca de la boca de la calle (autos en la Diagonal, basureros, maceteros, un toldo de artesanía)
    { k: 'carVar', v: 2, c: 93, r: D(93) + 4.4 }, { k: 'tico', v: 1, c: 107.5, r: D(107.5) + 4.6 },
    { k: 'carVar', v: 1, c: 97, r: D(97) + 6.0 }, { k: 'tico', v: 0, c: 104.8, r: D(104.8) + 5.9 },   // v0.13 (D2): dos autos más a los lados de la boca de la calle (contra qué choca la embestida)
    { k: 'basureroMira', c: 95.3, r: 59.0 }, { k: 'basureroMira', c: 107.2, r: 60.4 }, { k: 'maceteroMira', c: 96.6, r: 59.2 }, { k: 'maceteroMira', c: 105.6, r: 60.0 },
    { k: 'toldoFeria', v: 1, c: 106, r: 49.6 },
    // ---- vereda de la Diagonal: mesas de ajedrez (col 26) y los vehículos abandonados ----
    { k: 'mesaAjedrez', c: 24.6, r: D(24) + 8.7 }, { k: 'mesaAjedrez', c: 27.4, r: D(27) + 8.7 },
    // Larco (3 carriles, hacia el este): autos, taxis y una cúster
    { k: 'carVar', v: 0, c: 18, r: 17.3 }, { k: 'tico', v: 1, c: 33, r: 19.2 }, { k: 'custerE', c: 62, r: 17.8 },
    { k: 'carVar', v: 1, c: 84, r: 19.3 }, { k: 'tico', v: 0, c: 112, r: 16.6 }, { k: 'carVar', v: 2, c: 138, r: 18.6 },
    // Diagonal (en escalera): casi ninguna combi
    { k: 'carVar', v: 1, c: 20, r: D(20) + 4.4 }, { k: 'tico', v: 0, c: 47, r: D(47) + 5.6 }, { k: 'combiE', v: 1, c: 74, r: D(74) + 4.8 },
    { k: 'carVarW', v: 0, c: 113, r: D(113) + 4.6, dir: 'W' }, { k: 'ticoW', v: 1, c: 128, r: D(128) + 3.6 }, { k: 'carVar', v: 2, c: 143, r: D(143) + 5.4 }
  ];
  // palmeras en fila a lo largo de Larco (fila 22–23), cada 6 columnas, sin pisar jirones ni peatonales
  (function () {
    for (var cc = 15, n = 0; cc <= 144; cc += 6, n++) {
      if (inJiron(cc) || inJiron(cc - 1) || inJiron(cc + 1)) continue;
      PROPS.push({ k: 'palmera', v: n % 3, c: cc, r: 22.7, tree: 1 });
    }
    // palmeras alrededor de la rotonda (6)
    for (var a = 0; a < 6; a++) {
      var ang = a * Math.PI / 3 + Math.PI / 6;
      PROPS.push({ k: 'palmera', v: a % 3, c: ROTONDA.c + Math.cos(ang) * 5.6, r: ROTONDA.r + Math.sin(ang) * 4.6 + 0.4, tree: 1 });
    }
    // Mercado de Pulgas: toldos de artesanía en anillo (sin el lado norte, que es la entrada desde la plazuela) y cilindros de granito
    [30, 90, 150, 210, 330].forEach(function (deg, k) {
      var q = deg * Math.PI / 180;
      PROPS.push({ k: 'toldoFeria', v: k % 3, c: MERCADO.c + Math.cos(q) * 3.7, r: MERCADO.r + Math.sin(q) * 3.4 + 0.5 });
    });
    [45, 135, 225, 315].forEach(function (deg) { var q = deg * Math.PI / 180; PROPS.push({ k: 'cilindroGranito', c: MERCADO.c + Math.cos(q) * 1.7, r: MERCADO.r + Math.sin(q) * 1.6 + 0.4 }); });
    // Paseo de los Pintores: caballetes en la vereda del parque sobre la Diagonal
    for (var cp = 108, j = 0; cp <= 125; cp += 4, j++) PROPS.push({ k: 'caballetePintor', v: j % 3, c: cp + 0.5, r: D(cp) + 0.7 });
    // faroles de globo: vereda del parque en Larco y en la Diagonal, cada 12 columnas
    for (var cf = 9; cf <= 150; cf += 12) {
      if (!inJiron(cf)) PROPS.push({ k: cf % 24 === 9 ? 'farolGloboDoble' : 'farolGlobo', c: cf, r: 22.9 });
      if (cf + 6 < 97 || cf + 6 > 104) PROPS.push({ k: 'farolGlobo', c: cf + 6, r: D(cf + 6) + 0.92 });
    }
    PROPS.push({ k: 'farolGloboDoble', c: 96, r: 39.9 }, { k: 'farolGlobo', c: 110, r: 41.2 }, { k: 'farolGlobo', c: 131.5, r: 50.4 }, { k: 'farolGlobo', c: 28, r: 26.2 });
  })();

  /* ---------------- Gatos (~26), perros, palomas ---------------- */
  function cp(cc, rr, mode, extra) { var o = { x: Math.round(cc * T), y: Math.round(rr * T), mode: mode }; if (extra) for (var k in extra) o[k] = extra[k]; return o; }
  var CATS = [
    // Cat Park: 8
    cp(108.2, 42.0, 'sleep'), cp(110.0, 41.4, 'sit'), cp(111.6, 42.1, 'lick'), cp(108.9, 44.1, 'sit'), cp(110.6, 44.9, 'sleep'),
    cp(112.8, 43.2, 'lick'), cp(107.6, 43.4, 'sit'), cp(109.8, 46.0, 'sleep'),
    // gradas de la rotonda: 2 (encima de la grada) y 1 en el piso
    cp(55.8, 33.6, 'sleep', { onProp: 'gradaRotonda' }), cp(59.2, 38.2, 'sit', { onProp: 'gradaRotonda' }), cp(57.5, 36.2, 'lick'),
    // Parque 7 de Junio: 4
    cp(16.4, 26.6, 'sit'), cp(24.8, 27.6, 'sleep'), cp(33.8, 30.6, 'lick'), cp(42.2, 29.0, 'sit'),
    // pasto, muros y bancas del resto
    cp(62.4, 30.2, 'sleep'), cp(71.8, 35.0, 'sit'), cp(80.2, 30.0, 'lick'), cp(86.6, 40.2, 'sleep'), cp(92.4, 41.2, 'sit'),
    cp(104.4, 37.6, 'lick'), cp(115.4, 46.2, 'sit'), cp(121.4, 49.6, 'sleep'), cp(126.6, 41.0, 'lick'), cp(133.2, 43.4, 'sit'), cp(139.4, 53.4, 'sleep')
  ];
  var DOGS = [
    { x: 22 * T, y: 26.5 * T, zone: [14 * T, 24.2 * T, 34 * T, 28.6 * T] },
    { x: 126 * T, y: 39 * T, zone: [118 * T, 33 * T, 142 * T, 47 * T] }
  ];
  function birdSpawns() {   // pocas palomas en el piso (no hay postes con travesaño)
    return [{ x: 20 * T + 8, y: 24 * T + 8, z: 0, pole: false }, { x: 97 * T + 8, y: 40 * T + 4, z: 0, pole: false }, { x: 131 * T, y: 40 * T, z: 0, pole: false }];
  }
  var HIDDEN_LOOT = [{ id: 'colaInglesa', x: 95.5 * T, y: 24.2 * T, p: 1 }, { id: 'gaseosa', x: 97.2 * T, y: 24.0 * T, p: 1 }];   // la nevera detrás de la iglesia

  /* ---------------- Puertas (trabajadores) y vendedores ---------------- */
  var DOORS = {};
  LOTS.forEach(function (f) {
    if (!f.brand) return;
    var x = Math.round((f.c0 + f.c1 + 1) / 2 * T), y;
    if (f.side === 'N') y = (f.r1 + 1) * T + (f.park ? 10 : 12);
    else y = f.r0 * T - 9;
    (DOORS[f.brand] = DOORS[f.brand] || []).push({ x: x, y: y, lot: f.id, side: f.side });
  });
  var VENDORS = [
    { id: 'tito', name: 'DON TITO', x: Math.round(34.4 * T), y: Math.round(30.0 * T), v: 0 },
    { id: 'pepe', name: 'DON PEPE', x: Math.round(98.9 * T), y: Math.round(41.6 * T), v: 1 }   // v0.13 (D3): mudado a la ruta (antes 30 columnas al este, en los juegos): entre la plazuela y el Mercado de Pulgas
  ];

  /* ---------------- Colisión ---------------- */
  function tileAt(cc, rr) { if (cc < 0 || rr < 0 || cc >= COLS || rr >= ROWS) return null; return grid[rr][cc]; }
  function isSolidTile(cc, rr) { var ch = tileAt(cc, rr); return ch === null || !!SOLID[ch]; }
  var props = [], poles = { N: [], S: [] }, looseDecor = [], dynSolids = [];
  var routeMode = false;
  function skipProp(p) { return routeMode && (p.jefa || /picaron/i.test(p.k)); }
  function circleRect(x, y, rad, x0, y0, x1, y1) {
    var cx = x < x0 ? x0 : (x > x1 ? x1 : x), cy = y < y0 ? y0 : (y > y1 ? y1 : y), dx = x - cx, dy = y - cy;
    return dx * dx + dy * dy < rad * rad;
  }
  function collideCircle(x, y, rad) {
    var c0 = Math.floor((x - rad) / T), c1 = Math.floor((x + rad) / T), r0 = Math.floor((y - rad) / T), r1 = Math.floor((y + rad) / T), n, p;
    for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) if (isSolidTile(cc, rr) && circleRect(x, y, rad, cc * T, rr * T, cc * T + T, rr * T + T)) return true;
    for (n = 0; n < props.length; n++) { p = props[n]; if (p.fw > 0 && p.fh > 0 && !skipProp(p) && circleRect(x, y, rad, p.x0, p.y0, p.x1, p.y1)) return true; }
    for (n = 0; n < dynSolids.length; n++) { p = dynSolids[n]; if (p && !p.off && !(routeMode && p.jefa) && circleRect(x, y, rad, p.x0, p.y0, p.x1, p.y1)) return true; }
    return false;
  }
  function pointBlocked(x, y) {
    if (isSolidTile(Math.floor(x / T), Math.floor(y / T))) return true;
    var n, p;
    for (n = 0; n < props.length; n++) { p = props[n]; if (p.fw > 0 && x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1) return true; }
    for (n = 0; n < dynSolids.length; n++) { p = dynSolids[n]; if (p && !p.off && x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1) return true; }
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
  function inExitZone(x, y) {
    var cc = Math.floor(x / T), rr = Math.floor(y / T);
    return cc >= PIZZA.c0 && cc <= PIZZA.c1 && rr >= PIZZA.exitR0 && rr <= PIZZA.exitR1;
  }
  // Salida: solo con la jefa muerta (la pone jefa.js en ACH.mira.jefa).
  function inExit(x, y) { var J = ACH.mira && ACH.mira.jefa; return !!(J && J.dead) && inExitZone(x, y); }

  /* ---------------- Props horneados ---------------- */
  function footFor(k, spr) {
    var F = FOOT[k];
    if (!F) return { fw: typeof spr.fw === 'number' ? spr.fw : 0, fh: typeof spr.fh === 'number' ? spr.fh : 0, tall: !!spr.tall, tree: false };
    var delivered = spr.width >= (F.w || 0) - 4 && !spr.placeholder;
    return { fw: delivered && typeof spr.fw === 'number' ? spr.fw : F.fw, fh: delivered && typeof spr.fh === 'number' ? spr.fh : F.fh,
      tall: spr.tall !== undefined ? !!spr.tall || !!F.tall : !!F.tall, tree: !!F.tree };
  }
  function buildProps() {
    var t0 = (window.performance || Date).now();
    ensureTiles(); ensureProps(); ensureLotArchs();
    buildOver(); addMiraDecals();
    props.length = 0; anims.length = 0; poles.N.length = 0; poles.S.length = 0; looseDecor.length = 0;
    for (var i = decals.length - 1; i >= 0; i--) if (decals[i].auto) decals.splice(i, 1);
    var shadeN = 0;
    for (var n = 0; n < PROPS.length; n++) {
      var p = PROPS[n], k = p.k, v = p.v;
      var spr = ACH.gfx.prop(k, v, p.dir, FALLBACK[k]);
      var x = Math.round(p.c * T), y = Math.round(p.r * T);
      if (k === 'gradaRotonda' && typeof spr.dx === 'number') { x = Math.round(ROTONDA.c * T + spr.dx); y = Math.round(ROTONDA.r * T + spr.dy); }   // M2a: .dx/.dy desde el centro
      var f = footFor(k, spr);
      var bp = { k: k, v: v || 0, dir: p.dir || (/W$/.test(k) ? 'W' : 'E'), x: x, y: y, fw: f.fw, fh: f.fh, tall: f.tall, tree: f.tree || !!p.tree,
        x0: x - f.fw / 2, x1: x + f.fw / 2, y0: y - f.fh, y1: y, cob: false, fade: 1, fb: FALLBACK[k], lift: p.lift || 0, sortDy: p.sortDy || 0, mira: true };
      if (p.name) bp.name = p.name;
      if (p.water) bp.water = p.water;
      if (spr.tops && spr.tops.length) { var ty = 1e9, tx = 0; spr.tops.forEach(function (tt) { tx += tt.x; if (tt.y < ty) ty = tt.y; }); bp.top = { x: x + Math.round(tx / spr.tops.length), y: y + ty }; }
      else if (spr.top) bp.top = { x: x + spr.top.x, y: y + spr.top.y };
      props.push(bp);
      // pérgola: columnas con colisión en la base de cada una (M2a: pergolaSalmon.colAt)
      if (k === 'pergolaSalmon' && spr.colAt && ACH.sprites.props && ACH.sprites.props.columnaPergola) {
        var cs = ACH.gfx.prop('columnaPergola', 0), cf = footFor('columnaPergola', cs);
        spr.colAt.forEach(function (q) { var qx = x + q.x, qy = y + q.y; if (qx - cf.fw / 2 < 2 || isSolidTile(Math.floor(qx / T), Math.floor(qy / T))) return; props.push({ k: 'columnaPergola', v: 0, dir: 'E', x: qx, y: qy, fw: cf.fw, fh: cf.fh, tall: cf.tall, tree: false,
          x0: qx - cf.fw / 2, x1: qx + cf.fw / 2, y0: qy - cf.fh, y1: qy, cob: false, fade: 1, fb: null, lift: 0, sortDy: 0, mira: true }); });
      }
      // piletas animadas (array de cuadros con animFrames): se repintan encima del suelo en drawables
      if (spr.animFrames > 1) anims.push({ k: k, v: v || 0, x: x, y: y, n: spr.animFrames });
      if (bp.tree && (shadeN++ % 3 === 0)) decals.push({ k: 'sombraArbol', v: shadeN % 2, x: x + 10, y: y + 14, rot: 0, auto: 1 });
      // agua de la pileta: la que trae el sprite (px relativos al ancla) manda sobre la de aquí
      if (p.water) for (var w = 0; w < water.length; w++) if (water[w].id === p.water) {
        var sw = spr.water && typeof spr.water.r === 'number' ? spr.water : null, wd = WATER_DEF[p.water];
        water[w].x = x + (sw ? sw.x || 0 : 0); water[w].y = y + (sw ? sw.y || 0 : 0); water[w].r = sw ? sw.r : wd.rad; water[w].ry = sw ? (sw.ry || Math.round(sw.r * 0.45)) : wd.ry;
      }
    }
    buildMs = Math.round((window.performance || Date).now() - t0);
  }
  var buildMs = 0, anims = [];

  /* ---------------- Lotes provisorios con la marca (solo si M2b aún no registró el arquetipo) ---------------- */
  function ensureLotArchs() {
    var S = ACH.sprites, LA = S && S.lotArch, PXL = ACH.px;
    if (!LA || !PXL || typeof PXL.placeholderLot !== 'function') return;
    ['mf_tienda', 'mf_generico', 'mf_torre', 'mf_iglesia', 'mf_muni', 'mf_pizzeria', 'mf_banos'].forEach(function (a) {
      if (typeof LA[a] === 'function') return;
      LA[a] = provLot; LA[a].prov = true;
    });
    // Calle de las Pizzas: la capa alta de cada pizzería (toldos de 15 px + cortina de luces densa de 20 px) se pisaba con la del otro lado y cubría
    // toda la calle de brillo y «tablones». Se envuelve el arquetipo: toldo medio transparente, sin la cortina densa (las cortinas son props ralos).
    if (typeof LA.mf_pizzeria === 'function' && !LA.mf_pizzeria.sparse) {
      var orig = LA.mf_pizzeria;
      LA.mf_pizzeria = function (f) { var res = orig.apply(this, arguments); try { return thinPizzaOver(res, f); } catch (e) { return res; } };
      LA.mf_pizzeria.sparse = true; LA.mf_pizzeria.prov = orig.prov;
    }
  }
  function thinPizzaOver(res, f) {
    if (!res || !res.over || !res.over.width || f.side !== 'S') return res;
    var ov = res.over, w = ov.width, h = ov.height, east = (f.dir || (f.c1 < 100 ? 'E' : 'W')) === 'E';
    var cut = Math.min(w, 30);                                   // el toldo ocupa x 14–29 desde el canto (espejado si la calle queda al oeste)
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.globalAlpha = 0.5;
    if (east) g.drawImage(ov, 0, 0, cut, h, 0, 0, cut, h); else g.drawImage(ov, w - cut, 0, cut, h, w - cut, 0, cut, h);
    g.globalAlpha = 1;
    res.over = c;
    return res;
  }
  function provLot(f) {
    var res = ACH.px.placeholderLot(f); if (!res || !res.canvas) return res;
    var cv = res.canvas, g = cv.getContext('2d'), w = cv.width, h = cv.height, B = f.brand && MIRA.brandColors ? MIRA.brandColors(f.brand) : null;
    var PZ = { bg: '#2f6a3a', fg: '#f3efe2' }, IG = { bg: '#efe6cf', fg: '#6a4a2a' }, MU = { bg: '#f3ecd8', fg: '#5a3a1e' };
    var C = B || (f.arch === 'mf_pizzeria' ? PZ : f.arch === 'mf_iglesia' ? IG : f.arch === 'mf_muni' ? MU : null);
    var label = f.brand ? brandName(f.brand) : (f.name || '');
    if (f.side === 'N') {
      if (C) {   // banda de letrero de la planta baja con los colores de la marca
        var gTop = h - Math.min(48, (f.face || 3) * 16);
        g.fillStyle = '#1c1a22'; g.fillRect(3, gTop + 1, w - 6, 12);
        g.fillStyle = C.bg; g.fillRect(4, gTop + 2, w - 8, 10);
        if (MIRA.label && label) MIRA.label(g, label, w, 7, C.fg, gTop + 3);
        if (f.arch === 'mf_iglesia') {   // torre provisoria
          var tx = w - 46, ty = Math.max(0, h - (f.face || 7) * 16 - 26);
          g.fillStyle = '#1c1a22'; g.fillRect(tx - 1, ty - 1, 26, h - ty - 40); g.fillStyle = '#efe6cf'; g.fillRect(tx, ty, 24, h - ty - 42);
          g.fillStyle = '#6a4a2a'; g.fillRect(tx + 9, ty + 6, 6, 9); g.fillRect(tx + 11, ty - 8, 2, 8); g.fillRect(tx + 8, ty - 5, 8, 2);
        }
      }
    } else if (C || label) {   // azotea: letrero de azotea mirando a la cámara
      var bw = Math.min(w - 8, 86), bx = Math.floor((w - bw) / 2), by = 12, cc = C || { bg: '#3a3a40', fg: '#f3efe2' };
      g.fillStyle = '#1c1a22'; g.fillRect(bx - 1, by - 1, bw + 2, 13); g.fillStyle = cc.bg; g.fillRect(bx, by, bw, 11);
      g.fillStyle = '#1c1a22'; g.fillRect(bx + 6, by + 12, 2, 6); g.fillRect(bx + bw - 8, by + 12, 2, 6);
      if (MIRA.label && label) { var tmp = document.createElement('canvas'); tmp.width = bw; tmp.height = 11; MIRA.label(tmp.getContext('2d'), label, bw, 11, cc.fg, 2); g.drawImage(tmp, bx, by); }
      if (f.arch === 'mf_pizzeria') {   // toldos marrones vistos desde arriba hacia la calle
        var side = f.pizza === 'W' ? w - 14 : 0;
        for (var yy = 24; yy < h - 8; yy += 6) { g.fillStyle = (yy / 6) % 2 ? '#7a4a2a' : '#e8e0cf'; g.fillRect(side, yy, 14, 6); }
      }
    }
    res.lights = res.lights || [];
    return res;
  }

  /* ---------------- Debug: ruta y spawns ---------------- */
  // BFS en celdas de 4 px del inicio del Óvalo a la salida de la Calle de las Pizzas, con la jefa considerada muerta.
  function routeCheck(Rarg) {
    var J = ACH.mira && ACH.mira.jefa, oldDead = J ? J.dead : undefined;
    if (J) J.dead = true;
    routeMode = true;
    try {
      var S = 4, gw = Math.ceil(COLS * T / S), gh = Math.ceil(ROWS * T / S), R = Rarg || (ACH.ent && ACH.ent.CFG.radius) || 5;
      var seen = new Uint8Array(gw * gh), prev = new Int32Array(gw * gh).fill(-1), q = new Int32Array(gw * gh), free = new Int8Array(gw * gh);
      var ok = function (ix, iy) { var id = iy * gw + ix, v = free[id]; if (v) return v === 1; var b = collideCircle(ix * S + S / 2, iy * S + S / 2, R); free[id] = b ? 2 : 1; return !b; };
      var sx = Math.floor(START_HOME.x / S), sy = Math.floor(START_HOME.y / S), head = 0, tail = 0, goal = -1;
      if (!ok(sx, sy)) return { ok: false, steps: 0, why: 'inicio bloqueado' };
      seen[sy * gw + sx] = 1; q[tail++] = sy * gw + sx;
      var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      while (head < tail) {
        var id = q[head++], ix = id % gw, iy = (id - ix) / gw;
        if (inExitZone(ix * S + S / 2, iy * S + S / 2)) { goal = id; break; }
        for (var k = 0; k < 4; k++) {
          var nx = ix + nb[k][0], ny = iy + nb[k][1];
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          var nid = ny * gw + nx;
          if (seen[nid] || !ok(nx, ny)) continue;
          seen[nid] = 1; prev[nid] = id; q[tail++] = nid;
        }
      }
      if (goal < 0) return { ok: false, steps: 0, explored: tail, jefaMuerta: true };
      var steps = 0; for (var cur = goal; prev[cur] >= 0; cur = prev[cur]) steps++;
      return { ok: true, steps: steps, px: steps * S, jefaMuerta: true };
    } finally { routeMode = false; if (J) J.dead = oldDead; }
  }
  function spawnCheck() {
    var out = [], ZR = (ACH.ent && ACH.ent.CFG.zRadius) || 5;
    function chk(what, x, y, rad) { if (collideCircle(x, y, rad)) out.push({ what: what, x: Math.round(x), y: Math.round(y) }); }
    chk('inicio', START_HOME.x, START_HOME.y, 5);
    chk('punto de control', CHECKPOINT.x, CHECKPOINT.y, 5);
    spawns.forEach(function (s, n) { chk('spawn#' + n, s.x, s.y, ZR); });
    for (var b in DOORS) DOORS[b].forEach(function (d, n) { chk('puerta ' + b + '#' + n, d.x, d.y, ZR); });
    VENDORS.forEach(function (v) { var saved = v._ds; if (saved) saved.off = true; chk('vendedor ' + v.id, v.x, v.y, 5); if (saved) saved.off = false; });
    DOGS.forEach(function (d, n) { chk('perro#' + n, d.x, d.y, 4); });
    for (var pl in PLACES) chk('lugar ' + pl, PLACES[pl].x, PLACES[pl].y, 5);
    props.forEach(function (p, n) {
      if (!(p.fw > 0)) return;
      var c0 = Math.floor(p.x0 / T), c1 = Math.floor((p.x1 - 0.01) / T), r0 = Math.floor(p.y0 / T), r1 = Math.floor((p.y1 - 0.01) / T);
      for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) if (isSolidTile(cc, rr)) { out.push({ what: 'prop ' + p.k + '#' + n + ' pisa sólido', x: p.x, y: p.y }); return; }
    });
    return out;
  }
  function effFace(f, res) {
    if (res && typeof res.face === 'number') return res.face;
    if (f.side !== 'N' || f.walk) return 0;
    return Math.min(Math.max(3, f.face || 3), f.r1 - f.r0 + 1);
  }
  function bloodPerScreen() {
    var b = decals.filter(function (d) { return d.k === 'sangre'; }), best = 0;
    b.forEach(function (a) { b.forEach(function (c2) {
      var n = 0; b.forEach(function (d) { if (d.x >= a.x - 20 && d.x <= a.x + 460 && d.y >= c2.y - 250 && d.y <= c2.y + 20) n++; }); if (n > best) best = n;
    }); });
    return { total: b.length, maxPerScreen: best };
  }

  var spawns = [];   // sin caminantes: los únicos zombies son los 12 trabajadores (trabajadores.js) y la jefa (jefa.js)
  var SOCIAL = null;  // sin orquesta en Miraflores

  ACH.world = {
    T: T, COLS: COLS, ROWS: ROWS, W: COLS * T, H: ROWS * T, ROW: ROW, JIRONES: JIRONES, PASAJES: PASAJES,
    MAP: MAP, grid: grid, lotAt: lotAt, LOTS: LOTS, FOOT: FOOT, spawns: spawns, props: props,
    start: START, lights: [],
    over: over, decals: decals, decor: decor, poles: poles, dogSpawns: DOGS, birdSpawns: birdSpawns,
    tileAt: tileAt, isSolidTile: isSolidTile, buildProps: buildProps,
    collideCircle: collideCircle, moveCircle: moveCircle, los: los, inExit: inExit,
    routeCheck: routeCheck, spawnCheck: spawnCheck, SOCIAL: SOCIAL, lotsBaked: [], cables: [], effFace: effFace,
    bloodPerScreen: bloodPerScreen, propAt: propAt, catSpawns: CATS, FOOD_CARTS: {}, foodCarts: [], hiddenLoot: HIDDEN_LOOT, looseDecor: looseDecor,
    // claves nuevas de Miraflores
    level: 'miraflores', D: D, water: water, inWater: inWater, dynSolids: dynSolids, places: PLACES, doors: DOORS, vendors: VENDORS,
    checkpoint: CHECKPOINT, startHome: START_HOME, pizza: PIZZA, inExitZone: inExitZone, rotonda: ROTONDA, mercado: MERCADO,
    buildMs: function () { return buildMs; },
    // QA: noche.js (levelHook) y game.js (applyLevelCfg) leen W.cfgNoche al recargar el nivel; mismo valor que ACH.nivel.noche
    cfgNoche: { atTime: 99999, triggerX: null, kicker: 'PARQUE KENNEDY · 7:00 P.M.' }   // v0.13 (D5): anochece al entrar la jefa en su fase 3 (jefa.js), no por tiempo
  };
  MIRA.water = water;

  /* ---------------- Sistema: punto de control (§3.6) ---------------- */
  var cp0 = { passed: false };
  MIRA.register({
    name: 'mundo',
    reset: function (G) {
      cp0.passed = false;
      START.x = START_HOME.x; START.y = START_HOME.y;
      // v0.13 T2: CONTINUAR con la jefa ya vencida → arranca en la plazuela de la iglesia (punto de control), no en el Óvalo
      if (MIRA.cont && typeof MIRA.flag === 'function' && MIRA.flag('jefa')) { cp0.passed = true; START.x = CHECKPOINT.x; START.y = CHECKPOINT.y; }
      if (G && G.player) { G.player.x = START.x; G.player.y = START.y; }
    },
    update: function (G) {
      var p = G.player; if (!p || cp0.passed) return;
      if (p.x > CHECKPOINT.col * T) {
        cp0.passed = true;
        START.x = CHECKPOINT.x; START.y = CHECKPOINT.y;   // se muta el mismo objeto: game.js lo lee en respawn()
        MIRA.toast('Punto de control: la Virgen Milagrosa te cuida, causa');
        MIRA.sfx('checkpoint', { x: p.x, y: p.y });
      }
    },
    // piletas: el agua se mueve (M2a: 3 cuadros, v = floor(t*3) % 3). y muy bajo = se pinta antes que todo lo de pie (son planas)
    drawables: function (G, out) {
      var V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }, cam = G.cam;
      anims.forEach(function (a) {
        var fr = Math.floor((G.clock || 0) * 3) % a.n, s = ACH.gfx.prop(a.k, fr);
        if (!s || !s.width || a.x - s.ax > cam.x + V.w || a.x - s.ax + s.width < cam.x || a.y - s.ay > cam.y + V.h || a.y - s.ay + s.height < cam.y) return;
        out.push({ y: -1e6, x: a.x, draw: function (g, cx, cy) { g.drawImage(s, a.x - s.ax - cx, a.y - s.ay - cy); } });
      });
    }
  });
})();
