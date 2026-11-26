/* ACHORADO — world.js (v0.4): la Gambetta girada oeste → este. Grilla generada desde el corte transversal + LOTS,
   solidez de tiles, props con huellas a escala final, spawns, colisiones y línea de vista. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  var T = 16, COLS = 128, ROWS = 46;

  /* ---------------- Leyenda de la grilla (un carácter por tile) ----------------
     L  lote (edificio, retiro o cerro; sólido)     X  barricada al final de un jirón (sólido)
     s  vereda                                       n  sardinel norte (curbN)      u  sardinel sur (curbS)
     .  asfalto de la avenida                        -  raya discontinua (laneDashH)
     b  berma central                                j  asfalto de jirón (calle norte–sur)
     a  pasaje (callejón sin salida)                 S  escalera pintada al cerro (salida; caminable)
     Spawns: lista `spawns` con ch Z caminante · E grupo de 3 escolares · C ciego · B cobrador. */
  var SOLID = { L: 1, X: 1 };

  /* ---------------- Corte transversal de norte a sur (SPEC v0.4) ---------------- */
  var ROW = {
    blockN: [0, 10], walkN: [11, 13], curbN: 14, laneN: [15, 22], dashN: [18, 19],
    berma: [23, 26], laneS: [27, 34], dashS: [30, 31], curbS: 35, walkS: [36, 38], blockS: [39, 45]
  };
  function inR(r, a) { return r >= a[0] && r <= a[1]; }
  function sectionChar(r) {
    if (inR(r, ROW.blockN) || inR(r, ROW.blockS)) return 'L';
    if (inR(r, ROW.walkN) || inR(r, ROW.walkS)) return 's';
    if (r === ROW.curbN) return 'n';
    if (r === ROW.curbS) return 'u';
    if (inR(r, ROW.berma)) return 'b';
    if (inR(r, ROW.dashN) || inR(r, ROW.dashS)) return '-';
    return '.';
  }

  // Jirones (calles norte–sur de 4 tiles) y pasajes (callejones sin salida de 3 tiles en la manzana norte).
  var JIRONES = [[40, 43], [84, 87]];
  var PASAJES = [{ c0: 24, c1: 26, r0: 4, r1: 10 }, { c0: 66, c1: 68, r0: 4, r1: 10 }, { c0: 96, c1: 98, r0: 4, r1: 10 }];
  function inJiron(c) { for (var i = 0; i < JIRONES.length; i++) if (c >= JIRONES[i][0] && c <= JIRONES[i][1]) return true; return false; }

  /* ---------------- LOTS: una ficha por edificio (SPEC v0.4, revisión 3.2–3.4) ----------------
     Manzana norte = vitrina: cada lote muestra su cara sur entera a la vereda. Manzana sur = azoteas con parapeto.
     Vecinos nunca comparten arquetipo, color ni pisos. Hitos de oeste a este: paradero + combi volcada (inicio) ·
     bodega (N1) · chifa de esquina en el 1er jirón (N4) · mural CALLAO (N6) · tráiler de 40 pies (pista, col ~72) ·
     botica (N10) · patio de contenedores (S10) · escalera pintada (ESC). `face` = tiles de cara visible (lo calcula el motor). */
  var LOTS = [
    // ---- Manzana norte, cuadra 1 (cols 0–39) ----
    { id: 'N0', side: 'N', c0: 0, c1: 7, r0: 0, r1: 10, arch: 'ladrillo', floors: 3, color: 'ladrillo', name: '', damage: 2, roof: ['tanque', 'fierros'], front: ['medidor'] },
    { id: 'N1', side: 'N', c0: 8, c1: 17, r0: 0, r1: 10, arch: 'bodega', floors: 1, color: 'celeste', name: 'BODEGA DOÑA LUZ', damage: 1, roof: ['tanque', 'tendal'], front: ['toldo', 'bandera', 'gas'] },
    { id: 'N2', side: 'N', c0: 18, c1: 23, r0: 0, r1: 10, arch: 'pintada', floors: 2, color: 'durazno', name: '', damage: 2, roof: ['tendal', 'bidones'], front: ['balcon', 'bandera'] },
    { id: 'NP1', side: 'N', c0: 24, c1: 26, r0: 0, r1: 3, arch: 'loteObra', floors: 1, color: 'cemento', name: '', damage: 3, roof: ['ladrillos'], front: ['afiches'] },
    { id: 'N3', side: 'N', c0: 27, c1: 32, r0: 0, r1: 10, arch: 'ferreteria', floors: 1, color: 'ocre', name: 'FERRETERÍA EL PERNO', damage: 3, roof: ['antena', 'silla'], front: ['toldo'] },
    { id: 'N4', side: 'N', c0: 33, c1: 39, r0: 0, r1: 10, arch: 'chifa', floors: 2, color: 'rojo', name: 'CHIFA LA SUERTE', damage: 1, roof: ['tanque', 'campana'], front: ['bandera', 'pizarra'], corner: 'E' },
    // ---- Manzana norte, cuadra 2 (cols 44–83) ----
    { id: 'N5', side: 'N', c0: 44, c1: 49, r0: 0, r1: 10, arch: 'oficina', floors: 3, color: 'ocre', name: '', damage: 2, roof: ['antena', 'tanque'], front: [], corner: 'W' },
    { id: 'N6', side: 'N', c0: 50, c1: 59, r0: 0, r1: 10, arch: 'almacen', floors: 1, face: 5, color: 'azul', name: 'CALLAO', mural: true, damage: 1, roof: ['claraboyas'], front: ['porton', 'reflector'] },
    { id: 'N7', side: 'N', c0: 60, c1: 65, r0: 0, r1: 10, arch: 'polleria', floors: 2, color: 'rosado', name: 'POLLERÍA EL BRAVO', damage: 2, roof: ['tendal', 'tanque'], front: ['bandera', 'toldo'] },
    { id: 'NP2', side: 'N', c0: 66, c1: 68, r0: 0, r1: 3, arch: 'taller', floors: 1, color: 'cemento', name: '', damage: 2, roof: ['llantas'], front: [] },
    { id: 'N8', side: 'N', c0: 69, c1: 77, r0: 0, r1: 10, arch: 'taller', floors: 1, color: 'cemento', name: 'TALLER EL TUERCAS', damage: 3, roof: ['llantas', 'cilindro'], front: ['aceite', 'llantas'] },
    { id: 'N9', side: 'N', c0: 78, c1: 83, r0: 0, r1: 10, arch: 'ladrillo', floors: 3, color: 'ladrillo', name: '', damage: 2, roof: ['fierros', 'ladrillos'], front: ['medidor'], corner: 'E' },
    // ---- Manzana norte, cuadra 3 (cols 88–127) + pie del cerro ----
    { id: 'N10', side: 'N', c0: 88, c1: 95, r0: 0, r1: 10, arch: 'botica', floors: 1, color: 'blanco', name: 'BOTICA LA CHALACA', damage: 1, roof: ['tanque', 'antena'], front: ['cruz', 'reja'], corner: 'W' },
    { id: 'NP3', side: 'N', c0: 96, c1: 98, r0: 0, r1: 3, arch: 'ladrillo', floors: 1, color: 'ladrillo', name: '', damage: 3, roof: ['fierros'], front: [] },
    { id: 'N11', side: 'N', c0: 99, c1: 106, r0: 0, r1: 10, arch: 'pintada', floors: 2, color: 'menta', name: '', damage: 2, roof: ['tendal', 'perro'], front: ['balcon', 'macetas'] },
    { id: 'N12', side: 'N', c0: 107, c1: 113, r0: 0, r1: 10, arch: 'ladrillo', floors: 3, color: 'ladrillo', name: '', damage: 3, roof: ['fierros', 'tanque'], front: ['escaleraExt'] },
    { id: 'N13', side: 'N', c0: 114, c1: 119, r0: 0, r1: 10, arch: 'cerro', floors: 1, color: 'rosado', name: '', damage: 2, roof: ['calamina', 'tendal'], front: ['macetas'] },
    { id: 'ESC', side: 'N', c0: 120, c1: 123, r0: 0, r1: 10, arch: 'escalera', floors: 0, color: 'celeste', name: '', damage: 1, roof: [], front: ['baranda', 'macetas', 'ropa'], walk: true },
    { id: 'N14', side: 'N', c0: 124, c1: 127, r0: 0, r1: 10, arch: 'cerro', floors: 1, color: 'menta', name: '', damage: 1, roof: ['calamina'], front: ['macetas'] },
    // ---- Manzana sur (se ve desde atrás: azoteas con parapeto al norte) ----
    { id: 'S0', side: 'S', c0: 0, c1: 9, r0: 39, r1: 45, arch: 'ladrillo', floors: 2, color: 'ladrillo', name: '', damage: 2, roof: ['tanque', 'tendal'], front: ['panel'] },
    { id: 'S1', side: 'S', c0: 10, c1: 17, r0: 39, r1: 45, arch: 'bodega', floors: 1, color: 'rosado', name: 'BODEGA ROSITA', damage: 1, roof: ['bidones'], front: ['panel'] },
    { id: 'S2', side: 'S', c0: 18, c1: 27, r0: 39, r1: 45, arch: 'pintada', floors: 2, color: 'celeste', name: '', damage: 2, roof: ['tendal', 'tanque'], front: [] },
    { id: 'S3', side: 'S', c0: 28, c1: 33, r0: 39, r1: 45, arch: 'loteObra', floors: 1, color: 'cemento', name: 'SE VENDE', damage: 3, roof: ['arena'], front: ['afiches'] },
    { id: 'S4', side: 'S', c0: 34, c1: 39, r0: 39, r1: 45, arch: 'ladrillo', floors: 2, color: 'ladrillo', name: '', damage: 2, roof: ['fierros'], front: [], corner: 'E' },
    { id: 'S5', side: 'S', c0: 44, c1: 53, r0: 39, r1: 45, arch: 'fabrica', floors: 2, color: 'gris', name: '', damage: 2, roof: ['dientes'], front: ['panel'], corner: 'W' },
    { id: 'S6', side: 'S', c0: 54, c1: 61, r0: 39, r1: 45, arch: 'oficina', floors: 1, color: 'ocre', name: '', damage: 1, roof: ['antena'], front: [] },
    { id: 'S7', side: 'S', c0: 62, c1: 73, r0: 39, r1: 45, arch: 'almacen', floors: 2, color: 'verde', name: 'DEPÓSITO 12', damage: 2, roof: ['claraboyas'], front: ['panel'] },
    { id: 'S8', side: 'S', c0: 74, c1: 83, r0: 39, r1: 45, arch: 'pintada', floors: 1, color: 'durazno', name: '', damage: 3, roof: ['tendal'], front: [], corner: 'E' },
    { id: 'S9', side: 'S', c0: 88, c1: 95, r0: 39, r1: 45, arch: 'ferreteria', floors: 2, color: 'menta', name: 'GAS', damage: 2, roof: ['bidones', 'tanque'], front: ['panel'], corner: 'W' },
    { id: 'S10', side: 'S', c0: 96, c1: 107, r0: 39, r1: 45, arch: 'contenedores', floors: 0, color: 'oxido', name: 'BMRU 301 7', damage: 2, roof: ['contenedores'], front: ['malla'] },
    { id: 'S11', side: 'S', c0: 108, c1: 119, r0: 39, r1: 45, arch: 'ladrillo', floors: 1, color: 'cemento', name: '', damage: 1, roof: ['tanque'], front: [] },
    { id: 'K1', side: 'S', c0: 120, c1: 127, r0: 14, r1: 45, arch: 'cerro', floors: 0, color: 'tierra', name: '', damage: 1, roof: ['casitas'], front: [] }
  ];
  // Datos que buildLot necesita y que no puede leer del mapa: semilla, cara visible, vecinos (pisos; -1 = calle/pasaje abierto).
  (function () {
    function seedOf(id) { var h = 2166136261; for (var i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 10000; }
    function faceOf(f) {
      if (f.side !== 'N' || f.walk) return 0;
      if (f.face) return f.face;
      var v = { 0: 3, 1: 3, 2: 5, 3: 7 }[f.floors] || 3;
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
  var grid = [], lotAt = [], r, c, i;
  for (r = 0; r < ROWS; r++) {
    var row = [], lrow = [];
    for (c = 0; c < COLS; c++) {
      var ch = sectionChar(r);
      if (inJiron(c) && ch !== '.' && ch !== '-') ch = (r === 0 || r === ROWS - 1) ? 'X' : 'j';
      row.push(ch); lrow.push(-1);
    }
    grid.push(row); lotAt.push(lrow);
  }
  PASAJES.forEach(function (p) { for (var rr = p.r0; rr <= p.r1; rr++) for (var cc = p.c0; cc <= p.c1; cc++) grid[rr][cc] = 'a'; });
  for (i = 0; i < LOTS.length; i++) {
    var L = LOTS[i];
    for (r = L.r0; r <= L.r1; r++) for (c = L.c0; c <= L.c1; c++) { grid[r][c] = L.walk ? 'S' : 'L'; lotAt[r][c] = i; }
  }
  // Las filas de vereda y sardinel al pie del cerro (cols 120+, filas 11–13) siguen siendo vereda; el cerro K1 tapa el resto.
  // v0.13 T2 (B5): azotea sur de S2 (cols 19–26, filas 40–44) caminable ('R'), con la boca de la escalera improvisada en la col 22, fila 39.
  var AZOTEA = { c0: 19, c1: 26, r0: 40, r1: 44, ladder: { c: 22, r: 39 } };
  for (r = AZOTEA.r0; r <= AZOTEA.r1; r++) for (c = AZOTEA.c0; c <= AZOTEA.c1; c++) grid[r][c] = 'R';
  grid[AZOTEA.ladder.r][AZOTEA.ladder.c] = 'R';
  var MAP = grid.map(function (rw) { return rw.join(''); });

  /* ---------------- Inicio y salida ---------------- */
  var START = { x: 6 * T + 8, y: 29 * T + 8 };
  var EXIT_ROW = 9;   // hay que subir un par de escalones (filas ≤ 9 de la escalera) para ganar

  /* ---------------- Huellas a escala final (revisión 2.2) ----------------
     De costado: fw = largo px − 6, fh = ancho real × 10. De punta: fw = ancho px − 2, fh = largo real × 13 − 6.
     w/h = tamaño final del sprite. Si el sprite entregado ya mide eso (±4 px), manda su propio fw/fh. */
  var FOOT = {
    combi:        { w: 80, h: 46, fw: 74, fh: 18, tall: true },   // la volcada del inicio (de costado)
    combiE:       { w: 80, h: 46, fw: 74, fh: 18, tall: true },
    combiN:       { w: 28, h: 80, fw: 26, fh: 58, tall: true },   // de punta, cruzada en la pista
    custerE:      { w: 112, h: 56, fw: 106, fh: 21, tall: true },
    custerW:      { w: 112, h: 56, fw: 106, fh: 21, tall: true },
    car:          { w: 28, h: 66, fw: 26, fh: 50 },               // el sprite viejo es de punta: se usa cruzado
    carVar:       { w: 68, h: 34, fw: 62, fh: 17 },
    mototaxi:     { w: 44, h: 36, fw: 38, fh: 13 },
    mototaxiVar:  { w: 44, h: 36, fw: 38, fh: 13 },
    trailer:      { w: 168, h: 76, fw: 162, fh: 25, tall: true },
    trailerLargo: { w: 256, h: 76, fw: 250, fh: 25, tall: true },
    paradero:     { w: 64, h: 52, fw: 58, fh: 8, tall: true },
    treeWhite:    { w: 52, h: 68, fw: 6, fh: 4, tall: true, tree: true },
    palm:         { w: 44, h: 88, fw: 4, fh: 4, tall: true, tree: true },
    emoliente:    { w: 30, h: 40, fw: 22, fh: 8 }
  };
  // Si falta un sprite nuevo, se usa el viejo equivalente (el motor lo dibuja chico hasta que llegue el arte).
  var FALLBACK = { trailerLargo: 'trailer', carVar: 'car', posteAfiches: 'posteAfiche', papaHuevo: 'anticuchos', choclo: 'anticuchos' };   // v0.8: carretillas nuevas (G4) mientras no llegue su arte

  /* ---------------- Props ----------------
     c/r en tiles; ancla (pies, centro) en (c*16, r*16) px. v = variante. Los vehículos de la pista norte (hacia el oeste)
     usan su clave W explícita (combiW, carVarW, ticoW, tractoW, mototaxiVarW…): el texto nunca se voltea.
     cob:1 = junto a este vehículo aparece un cobrador. lift = px que el sprite se dibuja por encima de su ancla (carteles en postes). */
  var PROPS = [
    // ---- INICIO: combi volcada + paradero; restos de la huida (revisión 5.10) ----
    { k: 'combi', c: 9.5, r: 34.3 },
    { k: 'paradero', c: 5, r: 37.5 },
    { k: 'bolsas', v: 1, c: 13.7, r: 34.7 }, { k: 'bags', c: 6.6, r: 33.9 }, { k: 'zapatilla', c: 12.2, r: 33.1 }, { k: 'zapatilla', c: 12.9, r: 33.45 },
    // ---- pista sur (hacia el este) ----
    { k: 'combiE', v: 0, c: 20, r: 30.6, cob: 1 },
    { k: 'mototaxiVar', v: 0, c: 28, r: 33.5 },
    { k: 'tico', v: 1, c: 34, r: 33.2 },
    { k: 'combiN', v: 2, c: 37, r: 21 },                       // cruzada en la pista norte (de punta)
    { k: 'custerE', c: 47, r: 31 },
    { k: 'carVar', v: 1, c: 52.5, r: 33.6 },
    { k: 'mototaxiVar', v: 1, c: 58, r: 28.8 },
    { k: 'tico', v: 0, c: 62, r: 33.4 },
    { k: 'trailerLargo', c: 72, r: 32 },                         // hito: tráiler de 40 pies
    { k: 'combiN', v: 0, c: 92, r: 33.5 },
    { k: 'tracto', c: 98.5, r: 32.6 },                          // patio de contenedores: el tracto que ya no volvió (el único cabezal con el del tráiler: 33 cols de distancia)
    { k: 'combiE', v: 2, c: 104, r: 29.2, cob: 1 },             // fuera del tracto (antes en la col 100 se tapaban)
    { k: 'contenedor', v: 0, c: 106.8, r: 33.9 },               // contenedor suelto sobre la pista
    { k: 'combiN', v: 1, c: 112, r: 33 },
    // ---- pista norte (hacia el oeste) ----
    { k: 'ticoW', v: 0, c: 14, r: 17.8 },
    { k: 'combiW', v: 1, c: 26, r: 18.2, cob: 1 },
    { k: 'carVarW', v: 2, c: 56, r: 21.5 },                     // frente al mural: ningún cabezal ni tráiler (reglas: un solo tracto por pantalla, sin vehículos iguales)
    { k: 'combiW', v: 1, c: 70, r: 20.6, cob: 1 },
    { k: 'carVarW', v: 0, c: 78, r: 21.3 },
    { k: 'ticoW', v: 1, c: 91.5, r: 17.7 },
    { k: 'mototaxiVarW', v: 2, c: 97, r: 21, dir: 'W' },
    { k: 'custerW', c: 106, r: 17.8 },
    { k: 'ticoW', v: 0, c: 115, r: 21.4 },
    // ---- berma: estorbos ----
    { k: 'mototaxiVar', v: 2, c: 62, r: 25.5 }, { k: 'trash', c: 45, r: 24.7 }, { k: 'bags', c: 89, r: 25 },
    // ---- vendedores abandonados ----
    { k: 'emoliente', c: 21.5, r: 12.9 }, { k: 'anticuchos', c: 47, r: 12.6 },
    { k: 'emoliente', c: 79, r: 37.5 }, { k: 'anticuchos', c: 104, r: 12.6 },
    // ---- v0.8 (G2): carretillas de comida con porciones (E saca una; ACH.inv.cartAt / takeFromCart). Las de anticuchos de arriba también cuentan.
    { k: 'choclo', c: 37.5, r: 12.6 }, { k: 'papaHuevo', c: 72.5, r: 12.6 },
    { k: 'choclo', c: 47, r: 37.6 }, { k: 'papaHuevo', c: 68, r: 37.6 },
    // ---- BODEGA (N1): el coche de bebé vacío y el triciclo de reparto saqueado ----
    { k: 'cocheBebe', c: 12.4, r: 12.6 }, { k: 'triciclo', c: 16.6, r: 13.2 }, { k: 'bolsas', v: 0, c: 10.2, r: 13.4 }, { k: 'zapatilla', c: 14.4, r: 13.3 },
    // ---- BOTICA (N10): barrera de la cuadra, conos y bolsas; el vidrio va en el suelo ----
    { k: 'cono', c: 93.8, r: 13.5 }, { k: 'cono', c: 95.2, r: 13.1 }, { k: 'bolsas', v: 1, c: 92.6, r: 13.4 },
    // ---- PATIO DE CONTENEDORES (S10): un contenedor abierto y cajas regadas ----
    { k: 'contenedor', v: 2, c: 103, r: 38.2 }, { k: 'bolsas', v: 0, c: 99.8, r: 37.5 }, { k: 'bolsas', v: 1, c: 107.4, r: 37.8 },
    { k: 'trash', c: 98.2, r: 37.9 }, { k: 'zapatilla', c: 101.2, r: 37.1 },
    // ---- mobiliario urbano ----
    { k: 'quiosco', c: 31.5, r: 13.2 }, { k: 'quiosco', c: 94, r: 37.6 },
    { k: 'triciclo', c: 60.5, r: 37.9 },
    { k: 'barrera', c: 82.4, r: 25.4 }, { k: 'cono', c: 80.6, r: 26.2 }, { k: 'cono', c: 84.4, r: 24.4 }, { k: 'cono', c: 85.5, r: 26 },
    { k: 'cono', c: 118.6, r: 36.9 },
    // ---- v0.6 (F7): tarima de la orquesta zombie en la vereda norte, esquina del 2º jirón, al pie de N9 (cols 78–83). Su huella (66×14) queda
    // entre la pared (y 176) y el sardinel: deja pasar por detrás (176–190) y por delante (204–224). sortDy: los músicos (pies en y 188–193) se
    // dibujan DESPUÉS de la tarima. Los músicos y bailarines los pone social.js (ver SOCIAL abajo).
    { k: 'tarima', c: 81.25, r: 12.75, sortDy: -20 },
    // ---- v0.6 (F7): restos de los zombies de movilidad como escenografía (F8e solo los suelta al caer): bici en la berma, skate y silla en la vereda sur
    { k: 'biciCaida', c: 19, r: 25.3 }, { k: 'skateSuelto', c: 76, r: 37 }, { k: 'sillaRuedas', c: 31, r: 37.6 },
    // semáforos en las dos bocacalles (esquinas NE y SW del cruce)
    { k: 'semaforo', c: 44.5, r: 13.6 }, { k: 'semaforo', c: 39.4, r: 37.6 },
    { k: 'semaforo', c: 88.5, r: 13.6 }, { k: 'semaforo', c: 83.5, r: 37.6 },
    // barricadas de vecinos en las bocas de los jirones: el pie va sobre el tile sólido X (filas 0 y 45)
    { k: 'barricada', v: 0, c: 42, r: 1.75 }, { k: 'barricada', v: 1, c: 42, r: 45.9 },
    { k: 'barricada', v: 0, c: 86, r: 1.75 }, { k: 'barricada', v: 1, c: 86, r: 45.9 },
    // ---- basura en veredas, pasajes y jirones ----
    { k: 'trash', c: 14, r: 37.8 }, { k: 'bags', c: 35.4, r: 12.4 }, { k: 'bags', c: 25.1, r: 7 }, { k: 'trash', c: 57, r: 37.6 },
    { k: 'bags', c: 67.1, r: 6 }, { k: 'trash', c: 96.9, r: 8 }, { k: 'trash', c: 91, r: 12.5 }, { k: 'bags', c: 110, r: 37.6 },
    { k: 'trash', c: 117, r: 12.4 }, { k: 'bags', c: 41, r: 38 }, { k: 'trash', c: 85.3, r: 3.1 }, { k: 'bags', c: 41.1, r: 2.9 },
    { k: 'bags', c: 85.2, r: 42.2 }, { k: 'trash', c: 41.3, r: 42.7 }
  ];
  /* ---------------- Vida social (F7, social.js): colocación ----------------
     stage = la tarima (prop `tarima` de PROPS). Los músicos y bailarines se miden en px desde su ancla (pies): deck de la tarima x ±30,
     pies a 11–16 px sobre el ancla. Los bailarines van delante, en el sardinel (y 228–234 de mundo), para no tapar el frente de jabas.
     Ventanas: esquina superior izquierda (px de mundo) del marco de 18×16 de una ventana que ya existe en la fachada (medidas del arte actual).
     `singer` = la ventana del 2º piso de N2 (casa pintada durazno, cols 18–23); `windows` llevan siluetas con su propio vidrio cálido.
     Además social.js pone `.sil` sobre cada ventana encendida de 16×14 que traiga ACH.world.lights (N4, N13, cerro). */
  var SOCIAL = {
    stage: { c: 81.25, r: 12.75 },
    musicians: [['bajo', -26, -15], ['conga', -13, -12], ['cantante', 0, -11], ['timbal', 13, -14], ['trompeta', 26, -12]],
    dancers: [[-26, 24], [1, 30], [27, 26]],
    singer: { x: 301, y: 102, lot: 'N2' },
    windows: [{ x: 13, y: 104, lot: 'N0' }, { x: 1264, y: 103, lot: 'N9' }, { x: 1616, y: 102, lot: 'N11' }, { x: 1732, y: 104, lot: 'N12' }, { x: 1786, y: 104, lot: 'N12' }]
  };

  // Postes: en los límites entre lotes (nunca de frente a un letrero, una puerta o el mural), mezcla de concreto (con cables,
  // con afiches, liso) y de fierro de dos brazos. Norte en la fila 13,8; sur en la 36,9. Las cuadras salen de LOTS.
  var POLE_PICK = {   // columnas de límite de lote elegidas a mano (x = col*16; -6 px junto a la boca de un jirón)
    N: [8, 18, 27, 33, 40, 48, 60, 69, 78, 84, 96, 107, 114],   // 48 (antes 50): su sprite de 88 px ya no cruza las letras del mural (cols 52–57)
    S: [18, 28, 40, 54, 62, 74, 84, 96, 108]
  };
  var POLE_KIND = {   // por índice: c = posteCables, a = posteAfiche(s), p = poste liso, L = posteLuz (fierro)
    N: 'cLaPcaLcaPcLa', S: 'LcpaLPcLa'
  };
  (function () {
    var k, cc, n = 0, side, nA = 0, nL = 0, nC = 0;
    var afiPoles = [];
    ['N', 'S'].forEach(function (sd) {
      POLE_PICK[sd].forEach(function (col, i) {
        var x = col * T + (col === 40 || col === 84 ? -6 : 0), ch = POLE_KIND[sd].charAt(i % POLE_KIND[sd].length);
        var kk = ch === 'c' ? 'posteCables' : ch === 'a' ? 'posteAfiche' : ch === 'p' ? 'poste' : 'posteLuz';
        var v = kk === 'posteLuz' ? (nL++ % 2) : 0;
        var r = sd === 'N' ? 13.8 : 36.9;
        var pp = { k: kk, v: v, c: x / T, r: r, pole: sd, afi: kk === 'posteAfiche' };
        PROPS.push(pp);
        if (pp.afi) afiPoles.push(pp);
        // un cartel amarrado al poste (22 px sobre el suelo, mirando al sur) en uno de cada tres postes de concreto con cables / lisos
        if ((ch === 'c' || ch === 'p') && (nC++ % 2 === 0)) PROPS.push({ k: 'cartel', v: [0, 1, 3][(nC >> 1) % 3], c: x / T, r: r, lift: 22, sortDy: 1 });
      });
    });
    // afiches: variante por orden de oeste a este (0,1,2,3,0,1…), así dos postes de afiches a la vista nunca repiten
    afiPoles.sort(function (a, b) { return a.c - b.c; }).forEach(function (pp, i) { pp.v = i; });
    // berma: treeWhite y palm alternados cada 6 columnas, saltando jirones y estorbos de la berma
    var berma = PROPS.filter(function (p) { return p.r >= 23 && p.r <= 27; });
    for (k = 0, cc = 4; cc <= 116; cc += 6, k++) {
      if (inJiron(cc) || inJiron(cc - 1) || inJiron(cc + 1)) continue;
      var ok = true;
      for (var j = 0; j < berma.length; j++) if (Math.abs(berma[j].c - cc) < 3) ok = false;
      if (ok) PROPS.push({ k: k % 2 ? 'palm' : 'treeWhite', v: (k >> 1) % 2, c: cc, r: k % 2 ? 24.6 : 25.8, tree: 1 });
    }
  })();

  /* ---------------- Spawns (v0.2: 23 caminantes, 5 ciegos, 2 grupos de escolares = 34; más densos al este) ---------------- */
  var SPAWNS = [
    ['Z', 16, 17], ['Z', 24, 12], ['Z', 25, 8], ['Z', 30, 37], ['Z', 35, 16], ['Z', 41, 6], ['Z', 45, 27], ['Z', 50, 12],
    ['Z', 55, 25], ['Z', 58, 33], ['Z', 63, 12], ['Z', 67, 8], ['Z', 72, 37], ['Z', 76, 24], ['Z', 80, 20], ['Z', 86, 40],
    ['Z', 89, 12], ['Z', 94, 28], ['Z', 97, 6], ['Z', 103, 20], ['Z', 112, 37], ['Z', 112, 25], ['Z', 116, 30],
    ['C', 33, 25], ['C', 60, 12], ['C', 85, 5], ['C', 102, 29.7], ['C', 114, 17],
    ['E', 52, 36], ['E', 95, 18]
  ];
  var spawns = SPAWNS.map(function (s) { return { ch: s[0], x: s[1] * T + 8, y: s[2] * T + 8 }; });

  /* ---------------- Apariencia del suelo (solo dibujo; la solidez sale de `grid`) ---------------- */
  var over = {};      // r*COLS+c → capas [[tile, variante], …] que reemplazan al tile base
  var decals = [];    // {k, v, x, y, rot?}: calcomanías (ancla = centro inferior), horneadas en el suelo
  var decor = [];     // {k, v, x, y}: decoración de azotea (tank, rebar) para lotes provisorios
  function setOver(cc, rr, layers) { over[rr * COLS + cc] = layers; }
  function addDecal(k, v, cc, rr, dx) { decals.push({ k: k, v: v, x: cc * T + 8 + (dx || 0), y: (rr + 1) * T - 1 }); }
  function dec(k, v, x, y, rot) { decals.push({ k: k, v: v, x: Math.round(x), y: Math.round(y), rot: rot || 0 }); }
  (function () {
    var cc, rr;
    // Humos y cebras cruzan SOLO las pistas (y las veredas, por la cebra de jirón); nunca la berma (filas 23–26).
    function lanesCol(col, name) {
      for (rr = ROW.laneN[0]; rr <= ROW.laneN[1]; rr++) setOver(col, rr, [[name, 0]]);
      for (rr = ROW.laneS[0]; rr <= ROW.laneS[1]; rr++) setOver(col, rr, [[name, 0]]);
    }
    JIRONES.forEach(function (J) {
      for (cc = J[0]; cc <= J[1]; cc++) { lanesCol(cc, 'zebraH'); setOver(cc, 12, [['zebra', 0]]); setOver(cc, 37, [['zebra', 0]]); }
    });
    [16, 60, 104].forEach(function (col) { lanesCol(col, 'humpV'); });
    // sardinel pintado de amarillo, y franjas rosadas de barrio
    [[30, 38], [60, 70], [100, 108]].forEach(function (t) { for (cc = t[0]; cc <= t[1]; cc++) setOver(cc, ROW.curbN, [['curbNYellow', 0]]); });
    [[12, 22], [50, 58], [90, 98]].forEach(function (t) { for (cc = t[0]; cc <= t[1]; cc++) setOver(cc, ROW.curbS, [['curbSYellow', 0]]); });
    [[2, 4], [74, 76], [110, 112]].forEach(function (t) { for (cc = t[0]; cc <= t[1]; cc++) addDecal('pinkStripes', 0, cc, ROW.curbN); });
    [[24, 26], [64, 66]].forEach(function (t) { for (cc = t[0]; cc <= t[1]; cc++) addDecal('pinkStripes', 0, cc, ROW.curbS); });
    // pintas en las paredes de los pasajes (al fondo)
    PASAJES.forEach(function (p, k) { addDecal('graffiti', k % 2, p.c0 + 1, p.r0 - 1); });
  })();

  /* ---------------- Calcomanías de suelo con intención (revisión 5.8 y 5.10) ----------------
     Centros de carril (px): N1 271, N2 335 (hacia el oeste) · S1 463, S2 528 (hacia el este). y de la calcomanía = borde inferior.
     Regla 70/30: el 70 % de la pista queda limpio entre hitos; el detalle se agrupa en el inicio, la bodega, el 1er jirón y la chifa,
     el mural, el tráiler, el 2º jirón y la botica, el patio de contenedores y el pie del cerro. Sangre: ≤ 3 por pantalla (≤ 2 en la práctica). */
  var NL1 = 271, NL2 = 335, SL1 = 463, SL2 = 528;
  (function () {
    // pintura vial en su carril y sentido: la del este se lee normal. En el carril hacia el oeste NO hay palabras (de cabeza
    // o en espejo se leen mal): solo flechas ← (legend 4). `rot: 2` (giro de 180°) queda sin uso: solo sirve para calcomanías sin letras.
    function legend(v, x, yc, west) { if (west) dec('legend', 4, x, yc + 14); else dec('legend', v, x, yc + 14); }
    legend(2, 64, SL1);                    // BUS junto al paradero
    legend(0, 840, SL2);                   // DESPACIO antes del resalto de la col 60 (hacia el este)
    legend(0, 1100, NL1, true);            // DESPACIO antes del resalto de la col 60 (hacia el oeste)
    legend(0, 1790, SL2 - 2);          // DESPACIO antes de la cuesta (hacia el este)
    legend(1, 575, SL1);                   // PARE antes del 1er jirón (este)
    legend(1, 748, NL1, true);             // PARE antes del 1er jirón (oeste)
    legend(1, 1262, SL1);                  // PARE antes del 2º jirón (este)
    legend(1, 1490, NL2, true);            // PARE antes del 2º jirón (oeste)
    legend(5, 1655, SL1);                  // CEDA al pie del cerro (este)
    legend(2, 330, NL2, true);             // BUS (oeste)
    dec('legend', 3, 1470, SL2 + 14);      // flecha → en el carril sur
    dec('legend', 4, 440, NL1 + 14);       // flecha ← en el carril norte
    dec('legend', 3, 160, SL2 + 14 - 0);   // flecha → junto al inicio
    // arena junto a los sardineles (norte: densa arriba; sur: densa abajo), más cerca de la obra, los jirones y el cerro
    [[90, 0], [560, 0], [1035, 0], [1440, 0], [1790, 0], [330, 0]].forEach(function (a) { dec('arena', a[1] ? 2 : 0, a[0], 251); });
    [[150, 1], [640, 1], [1330, 1], [1520, 1], [1850, 1], [905, 1]].forEach(function (a) { dec('arena', 1, a[0], 563); });
    dec('arena', 2, 408, 220); dec('arena', 2, 1070, 214); dec('arena', 2, 470, 650);   // montoncitos de obra
    // INICIO: la combi volcada dejó vidrio, aceite y una frenada larga
    dec('frenada', 0, 92, 541); dec('aceite', 0, 178, 556); dec('vidrio', 0, 112, 551); dec('vidrio', 1, 204, 546); dec('charco', 0, 48, 500);
    dec('buzon', 0, 238, 534); dec('rodada', 0, 215, SL1 + 20);
    // BODEGA (N1): charco en la vereda, restos de bolsa abierta, sumidero
    dec('charco', 2, 232, 222); dec('buzon', 1, 262, 258);
    // 1er JIRÓN y CHIFA: frenada hacia la cruzada, huella de mano seca, parche
    dec('frenada', 1, 596, 349); dec('sangre', 1, 598, 206); dec('parche', 0, 560, 500); dec('charco', 3, 760, 505);
    dec('buzon', 0, 682, 400); dec('aceite', 1, 640, 490);
    // MURAL (N6): la pista queda limpia; solo un charco y una rodada en el carril
    dec('charco', 1, 874, 221); dec('rodada', 1, 880, NL1 + 20);
    // TRÁILER de 40 pies (S, col 72): arrastre seco y aceite
    dec('aceite', 0, 1128, 540); dec('sangre', 0, 1220, 515); dec('rodada', 0, 1170, SL2 + 18); dec('parche', 1, 1010, 335);
    // 2º JIRÓN y BOTICA: vidrio roto bajo la vitrina, sumidero, frenada
    dec('vidrio', 0, 1448, 214); dec('vidrio', 1, 1495, 207); dec('vidrio', 1, 1476, 219); dec('frenada', 0, 1400, 349); dec('buzon', 1, 1508, 258);
    dec('parche', 2, 1312, 470); dec('charco', 0, 1380, 232);
    // PATIO DE CONTENEDORES (S10): la lona rota, aceite y un arrastre seco de la caja que se abrió
    dec('aceite', 1, 1640, 558); dec('sangre', 2, 1700, 595); dec('lavado', 1, 1650, SL2 + 20); dec('charco', 2, 1592, 600); dec('vidrio', 1, 1632, 606);
    // PIE DEL CERRO: polvo, parche y el último arrastre
    dec('lavado', 0, 1770, NL2 + 18); dec('sangre', 1, 1860, 214); dec('parche', 0, 1800, 505); dec('charco', 1, 1736, 380);
    // desgaste suelto en el resto de la avenida, con semilla; mínimo 110 px entre sí y lejos de los hitos
    var seed = 1993, hit = [[150, 130], [610, 110], [880, 100], [1180, 110], [1460, 110], [1640, 90], [1800, 90]];
    function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    var kinds = [['parche', 3], ['charco', 4], ['aceite', 2], ['rodada', 2], ['lavado', 2], ['buzon', 1], ['frenada', 2]], pts = [], tries = 0;
    var lanes = [NL1, NL2, SL1, SL2];
    while (pts.length < 7 && tries++ < 400) {
      var x = 120 + rnd() * 1760, kk = kinds[Math.floor(rnd() * kinds.length)], yc = lanes[Math.floor(rnd() * 4)] + (rnd() - 0.5) * 22, ok = true;
      for (var i = 0; i < pts.length; i++) if (Math.abs(pts[i][0] - x) < 110) ok = false;
      for (i = 0; i < hit.length; i++) if (Math.abs(hit[i][0] - x) < hit[i][1] * 0.55) ok = false;
      for (i = 0; i < JIRONES.length; i++) if (x > JIRONES[i][0] * T - 40 && x < (JIRONES[i][1] + 1) * T + 40) ok = false;
      if (!ok) continue;
      pts.push([x, yc]);
      dec(kk[0], Math.floor(rnd() * kk[1]), x, yc + 8);
    }
    // calcomanías cartel sobre muros y cercos (se hornean sobre las fachadas); chicha y bandera en caras sur
    dec('cartel', 3, 1080, 61);                        // NO ENTRAR en el fondo del pasaje 2
    dec('cartel', 1, 1560, 61);                        // NO HAY AGUA en el fondo del pasaje 3
    dec('chicha', 0, 393, 60); dec('chicha', 1, 409, 60); dec('chicha', 2, 425, 60);       // serie de afiches en el muro del pasaje 1
    dec('flag', 0, 1064, 30);                          // bandera atada en la pared del taller del pasaje 2
    dec('cartel', 2, 1516, 171);                       // AYUDA: la sábana colgada de la reja de la botica (junto a la vitrina)
    dec('chicha', 2, 1610, 60); dec('chicha', 0, 1626, 60);                               // y en el pasaje 3
    // sombras de copa bajo algunos árboles de la berma (se calculan al construir los props)
  })();

  function tileAt(cc, rr) {
    if (cc < 0 || rr < 0 || cc >= COLS || rr >= ROWS) return null;
    return grid[rr][cc];
  }
  // v0.13 T2 (B2): la escalera al cerro queda tapada con calamina (filas 9–10) hasta vencer a El Chofer (ACH.world.setEscalera(true)).
  var ESC_CLOSED_FROM = 9, escCerrada = false;
  function isSolidTile(cc, rr) {
    var ch = tileAt(cc, rr);
    if (ch === 'S' && escCerrada && rr >= ESC_CLOSED_FROM) return true;
    return ch === null || !!SOLID[ch];
  }

  /* ---------------- Props horneados con huellas ---------------- */
  var props = [], poles = { N: [], S: [] };
  // QA v0.8: bici caída, skate y silla de ruedas del escenario son objetos sueltos de verdad (los agarra y lanza armas.js): no son props fijos.
  var LOOSE_DECOR = { biciCaida: "bici", skateSuelto: "skate", sillaRuedas: "silla" }, looseDecor = [];
  function footFor(k, spr) {
    var F = FOOT[k];
    if (!F) return { fw: spr.fw, fh: spr.fh, tall: !!spr.tall, tree: false };
    var delivered = spr.width >= F.w - 4 && !spr.placeholder;
    return {
      fw: delivered && typeof spr.fw === 'number' ? spr.fw : F.fw,
      fh: delivered && typeof spr.fh === 'number' ? spr.fh : F.fh,
      tall: spr.tall !== undefined ? !!spr.tall || !!F.tall : !!F.tall, tree: !!F.tree
    };
  }
  // B2: props bajos cuya huella era más angosta que el arte de su base (basura, carretillas, coche, barrera): la huella pasa a ser
  // el ancho real de los píxeles opacos de la franja inferior (2 px de holgura por lado). Solo ensancha; la profundidad no cambia.
  var WIDEN = { trash: 1, emoliente: 1, anticuchos: 1, papaHuevo: 1, choclo: 1, triciclo: 1, barrera: 1, cocheBebe: 1, bags: 1, bolsas: 1 };
  // v0.8 (G2): carretillas de comida (prop → objeto de la porción) y neveras escondidas con Cola Inglesa (fondo de los pasajes 1 y 3).
  var FOOD_CARTS = { anticuchos: 'anticucho', papaHuevo: 'papaHuevo', choclo: 'chocloQueso' };
  var HIDDEN_LOOT = [{ id: 'colaInglesa', x: 25.5 * 16, y: 4.9 * 16, p: 1 }, { id: 'colaInglesa', x: 97.5 * 16, y: 4.9 * 16, p: 0.6 },
    { id: 'uhu', x: 67.5 * 16, y: 4.9 * 16, p: 1 }];   // v0.13 T2 (B5): el escondite de Uhu al fondo del pasaje 2
  function widenFoot(bp, spr) {
    var b = ACH.gfx.opaqueBox(spr, 128, -Math.max(bp.fh, 6), 1);
    if (!b) return;
    var nx0 = bp.x + b.x0 + 2, nx1 = bp.x + b.x1 - 1;
    if (nx0 < bp.x0) bp.x0 = nx0;
    if (nx1 > bp.x1) bp.x1 = nx1;
    bp.fw = bp.x1 - bp.x0;
  }
  // M3: barricada de jirón. Huella = píxeles opacos del arte (x recortada a las 4 columnas del jirón, y sin las filas de tiles X, que ya son
  // sólidas). Así nadie entra al arte, y Alexander nunca queda detrás de las láminas (siempre al lado de «delante» en el orden de dibujo).
  function artFoot(bp, spr) {
    var b = ACH.gfx.opaqueBox(spr, 128);
    bp.fw = bp.fh = 0; bp.x0 = bp.x1 = bp.x; bp.y0 = bp.y1 = bp.y;
    if (!b) return;
    var x0 = bp.x + b.x0, x1 = bp.x + b.x1 + 1, y0 = bp.y + b.y0, y1 = bp.y + b.y1 + 1, cc = Math.floor(bp.x / T), i;
    for (i = 0; i < JIRONES.length; i++) if (cc >= JIRONES[i][0] && cc <= JIRONES[i][1]) { x0 = Math.max(x0, JIRONES[i][0] * T); x1 = Math.min(x1, (JIRONES[i][1] + 1) * T); }
    while (y0 < y1 && isSolidTile(cc, Math.floor(y0 / T))) y0 = (Math.floor(y0 / T) + 1) * T;
    while (y1 > y0 && isSolidTile(cc, Math.floor((y1 - 0.01) / T))) y1 = Math.floor((y1 - 0.01) / T) * T;
    if (x1 <= x0 || y1 <= y0) return;
    bp.x0 = x0; bp.x1 = x1; bp.y0 = y0; bp.y1 = y1; bp.fw = x1 - x0; bp.fh = y1 - y0;
  }
  // F7: señales de poste que publica letreros.js: ACH.letreros.senales = [{n, x, y}] (x, y = pie, px) con sprite ACH.sprites.props.senal[n].
  // Defensivo: sirve en cualquier orden de carga (se lee al construir los props) y sin letreros.js / sin sprite no pone nada.
  function senalProps() {
    var L = ACH.letreros, P = ACH.sprites && ACH.sprites.props && ACH.sprites.props.senal, out = [];
    if (!L || !Array.isArray(L.senales) || !Array.isArray(P)) return out;
    L.senales.forEach(function (s) {
      if (!s || typeof s.n !== 'number' || !P[s.n] || typeof s.x !== 'number' || typeof s.y !== 'number') return;
      out.push({ k: 'senal', v: s.n, c: s.x / T, r: s.y / T, sign: 1 });
    });
    return out;
  }
  // ¿La huella de la señal cabe? No pisa tiles sólidos ni props con huella, y no cae sobre un spawn (zombies, cobradores, escolares), perro ni el inicio.
  function signFits(bp, spr) {
    if (!(bp.fw > 0 && bp.fh > 0)) return true;
    // el arte (alto) de la señal no tapa a la orquesta: zona de la tarima y sus músicos (x ±40, 45 px arriba, 32 abajo)
    var st = SOCIAL.stage, sx = st.c * T, sy = st.r * T, ax0 = bp.x - (spr.ax || 0), ay0 = bp.y - (spr.ay || 0);
    if (ax0 < sx + 40 && ax0 + spr.width > sx - 40 && ay0 < sy + 32 && ay0 + spr.height > sy - 45) return false;
    var x0 = bp.x0 - 1, x1 = bp.x1 + 1, y0 = bp.y0 - 1, y1 = bp.y1 + 1, cc, rr, i, q;
    for (rr = Math.floor(y0 / T); rr <= Math.floor((y1 - 0.01) / T); rr++) for (cc = Math.floor(x0 / T); cc <= Math.floor((x1 - 0.01) / T); cc++) if (isSolidTile(cc, rr)) return false;
    for (i = 0; i < props.length; i++) { q = props[i]; if (q.fw > 0 && q.fh > 0 && x0 < q.x1 && x1 > q.x0 && y0 < q.y1 && y1 > q.y0) return false; }
    var ZR = (ACH.ent && ACH.ent.CFG.zRadius) || 5;
    function near(px, py, rad) { return circleRect(px, py, rad, x0, y0, x1, y1); }
    if (near(START.x, START.y, 8)) return false;
    for (i = 0; i < spawns.length; i++) { q = spawns[i]; if (near(q.x, q.y, ZR + 4) || (q.ch === 'E' && (near(q.x - 7, q.y + 4, ZR + 2) || near(q.x + 7, q.y + 4, ZR + 2) || near(q.x, q.y - 6, ZR + 2)))) return false; }
    for (i = 0; i < DOGS.length; i++) if (near(DOGS[i].x, DOGS[i].y, 6)) return false;
    return true;
  }
  // QA v0.6: franja de letreros de la planta baja de los locales (lado N): el arte opaco de una señal de calle no debe pisarla.
  var SHOPS = { bodega: 1, chifa: 1, polleria: 1, botica: 1, ferreteria: 1, taller: 1 };
  function signBandHit(bp, spr) {
    var b = ACH.gfx.opaqueBox && ACH.gfx.opaqueBox(spr, 128), x0, x1, y0, y1;   // opaqueBox: relativo al ancla (x, y)
    if (b) { x0 = bp.x + b.x0; x1 = bp.x + b.x1 + 1; y0 = bp.y + b.y0; y1 = bp.y + b.y1 + 1; }
    else { x0 = bp.x - (spr.ax || 0); x1 = x0 + spr.width; y0 = bp.y - (spr.ay || 0); y1 = y0 + spr.height; }
    for (var i = 0; i < LOTS.length; i++) {
      var f = LOTS[i];
      if (f.side !== 'N' || !SHOPS[f.arch]) continue;
      var lb = (f.r1 + 1) * T;
      if (x0 < (f.c1 + 1) * T && x1 > f.c0 * T && y0 < lb - 12 && y1 > lb - 50) return true;
    }
    return false;
  }
  function buildProps() {
    props.length = 0; poles.N.length = 0; poles.S.length = 0; looseDecor.length = 0;
    var P = ACH.sprites && ACH.sprites.props, nAfi = 0, shadeN = 0, i;
    var hasAfi = !!(P && Array.isArray(P.posteAfiches) && P.posteAfiches.length);
    for (i = decals.length - 1; i >= 0; i--) if (decals[i].auto) decals.splice(i, 1);
    var list = PROPS.concat(senalProps());                              // F7: + señales de F6 (ACH.letreros.senales), si existen
    for (var n = 0; n < list.length; n++) {
      var p = list[n], k = p.k, v = p.v;
      if (p.afi && hasAfi) { k = 'posteAfiches'; v = p.v; }          // variantes de afiches: ya vienen repartidas por orden de x
      var spr = ACH.gfx.prop(k, v, p.dir, FALLBACK[k]);
      var x = Math.round(p.c * T), y = Math.round(p.r * T);
      if (LOOSE_DECOR[k]) { looseDecor.push({ id: LOOSE_DECOR[k], x: x, y: y }); continue; }
      var f = footFor(k, spr);
      var bp = { k: k, v: v || 0, dir: p.dir || (/W$/.test(k) ? 'W' : 'E'), x: x, y: y, fw: f.fw, fh: f.fh, tall: f.tall, tree: f.tree || !!p.tree,
        x0: x - f.fw / 2, x1: x + f.fw / 2, y0: y - f.fh, y1: y, cob: !!p.cob, fade: 1, fb: FALLBACK[k], lift: p.lift || 0, sortDy: p.sortDy || 0 };
      // punto más alto del poste: de los aisladores (tops), no del viejo `top`
      if (spr.tops && spr.tops.length) {
        var ty = 1e9, tx = 0;
        spr.tops.forEach(function (t) { tx += t.x; if (t.y < ty) ty = t.y; });
        bp.top = { x: x + Math.round(tx / spr.tops.length), y: y + ty };
      } else if (spr.top) bp.top = { x: x + spr.top.x, y: y + spr.top.y };
      if (spr.smoke) bp.smoke = { x: x + spr.smoke.x, y: y + spr.smoke.y };
      if (WIDEN[k] && !bp.tall && !bp.tree) widenFoot(bp, spr);   // B2: la huella cubre el arte de la base
      if (k === 'barricada') artFoot(bp, spr);                    // M3: la huella cubre el arte hasta los tiles X
      if (p.sign && !(signFits(bp, spr) && !signBandHit(bp, spr))) {   // F7: una señal que estorbaría (sólido, spawn, otro prop) se omite
        var moved = false;                                              // QA v0.6: si tapa el letrero de un local, se corre de lado (hasta 96 px) antes de omitirla
        for (var sh = 1; sh <= 12 && !moved; sh++) {
          for (var sg = 1; sg >= -1 && !moved; sg -= 2) {
            var dx = sg * sh * 8;
            bp.x += dx; bp.x0 += dx; bp.x1 += dx;
            if (signFits(bp, spr) && !signBandHit(bp, spr)) moved = true; else { bp.x -= dx; bp.x0 -= dx; bp.x1 -= dx; }
          }
        }
        if (!moved) continue;
      }
      props.push(bp);
      if (p.pole) poles[p.pole].push(bp);
      // sombra de copa en el suelo bajo algunos árboles (1 de cada 3)
      if (p.tree && (shadeN++ % 3 === 0)) decals.push({ k: 'sombraArbol', v: shadeN % 2, x: x + 10, y: y + 14, rot: 0, auto: 1 });
    }
    for (var side in poles) poles[side].sort(function (a, b) { return a.x - b.x; });
    placeCobradores();
  }

  // Cobradores: junto a 4 vehículos (cob:1) el caminante más cercano se vuelve cobrador (el total de zombies no cambia).
  function placeCobradores() {
    var a, b, n = 0;
    for (a = 0; a < spawns.length; a++) if (spawns[a].ch === 'B') { spawns[a].ch = 'Z'; if (spawns[a].oldX !== undefined) { spawns[a].x = spawns[a].oldX; spawns[a].y = spawns[a].oldY; } }
    for (a = 0; a < props.length; a++) {
      var p = props[a];
      if (!p.cob) continue;
      var best = -1, bd = 1e9;
      for (b = 0; b < spawns.length; b++) {
        if (spawns[b].ch !== 'Z') continue;
        var dx = spawns[b].x - p.x, dy = spawns[b].y - p.y, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = b; }
      }
      if (best < 0) continue;
      // la puerta corrediza está en el costado (sur de la huella): primero ahí, luego en los extremos
      var cand = [[p.x - 10, p.y + 9], [p.x + 14, p.y + 9], [p.x + p.fw / 2 + 9, p.y - 3], [p.x - p.fw / 2 - 9, p.y - 3], [p.x, p.y - p.fh - 9]];
      for (b = 0; b < cand.length; b++) {
        if (collideCircle(cand[b][0], cand[b][1], 6)) continue;
        var ch = tileAt(Math.floor(cand[b][0] / T), Math.floor(cand[b][1] / T));
        if (ch === null || ch === 'S') continue;
        var s = spawns[best];
        s.oldX = s.x; s.oldY = s.y; s.x = cand[b][0]; s.y = cand[b][1]; s.ch = 'B'; n++;
        break;
      }
    }
    return n;
  }

  // Perros (zona = rectángulo en px donde deambulan, alargado a lo largo de la avenida) y gallinazos.
  var DOGS = [
    { x: 420, y: 200, zone: [160, 182, 600, 220] },     // vereda norte, cuadra 1
    { x: 900, y: 606, zone: [700, 582, 1100, 620] },    // vereda sur, cuadra 2
    { x: 1260, y: 400, zone: [1150, 374, 1330, 428] },  // berma, cuadra 3
    { x: 1600, y: 200, zone: [1500, 182, 1880, 220] }   // vereda norte, antes del cerro
  ];
  // v0.6: gatos (3–6). mode: sleep (azotea baja / contenedor) · sit · lick. roof:1 = encima de un techo o contenedor (z en px).
  var CATS = [
    { x: 13 * T, y: 39 * T + 6, mode: 'sleep', roof: 1 },          // parapeto de la bodega Rosita (azotea baja, manzana sur)
    { x: 29 * T, y: 13 * T + 12, mode: 'sit' },                     // borde de la vereda norte, frente a la ferretería
    { x: 846, y: 548, mode: 'lick' },                               // junto al auto de la pista sur (col 52)
    { x: 67 * T + 8, y: 8 * T + 4, mode: 'sit' },                   // fondo del pasaje 2
    { x: 1240, y: 600, mode: 'lick' },                              // vereda sur, junto a la emoliente
    { x: 103 * T, y: 38.2 * T + 1, mode: 'sleep', onProp: 'contenedor' } // encima del contenedor del patio
  ];
  function birdSpawns() {
    var out = [];
    [[poles.N, 1], [poles.N, 4], [poles.N, 7], [poles.N, 10], [poles.S, 2], [poles.S, 6], [poles.S, 9]].forEach(function (q) {
      var p = q[0][q[1]]; if (!p || !p.top) return;
      out.push({ x: p.x, y: p.y, z: p.y - p.top.y, pole: true });   // en el travesaño: z = alto del poste
    });
    [[12, 4], [56, 3], [92, 5], [30, 42], [100, 41]].forEach(function (q) { out.push({ x: q[0] * T + 8, y: q[1] * T + 8, z: 0, pole: false }); });
    return out;
  }

  function circleRect(x, y, rad, x0, y0, x1, y1) {
    var cx = x < x0 ? x0 : (x > x1 ? x1 : x);
    var cy = y < y0 ? y0 : (y > y1 ? y1 : y);
    var dx = x - cx, dy = y - cy;
    return dx * dx + dy * dy < rad * rad;
  }

  // ¿Un círculo en (x,y) de radio rad choca con tiles sólidos o huellas de props?
  function collideCircle(x, y, rad) {
    var c0 = Math.floor((x - rad) / T), c1 = Math.floor((x + rad) / T);
    var r0 = Math.floor((y - rad) / T), r1 = Math.floor((y + rad) / T);
    for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) {
      if (isSolidTile(cc, rr) && circleRect(x, y, rad, cc * T, rr * T, cc * T + T, rr * T + T)) return true;
    }
    for (var n = 0; n < props.length; n++) {
      var p = props[n];
      if (p.fw > 0 && p.fh > 0 && circleRect(x, y, rad, p.x0, p.y0, p.x1, p.y1)) return true;
    }
    return false;
  }

  function pointBlocked(x, y) {
    if (isSolidTile(Math.floor(x / T), Math.floor(y / T))) return true;
    for (var n = 0; n < props.length; n++) {
      var p = props[n];
      if (p.fw > 0 && x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1) return true;
    }
    return false;
  }

  // v0.6: el prop cuya huella contiene el punto (o null). Lo usan las piedras (interaccion.js).
  function propAt(x, y) {
    for (var n = 0; n < props.length; n++) {
      var p = props[n];
      if (p.fw > 0 && x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1) return p;
    }
    return null;
  }

  // Línea de vista (edificios y vehículos tapan).
  function los(x0, y0, x1, y1) {
    var dx = x1 - x0, dy = y1 - y0, d = Math.sqrt(dx * dx + dy * dy);
    var n = Math.ceil(d / 6);
    for (var k = 1; k < n; k++) {
      var t = k / n;
      if (pointBlocked(x0 + dx * t, y0 + dy * t)) return false;
    }
    return true;
  }

  // Mueve un círculo separando ejes; devuelve true si chocó en algún eje.
  function moveCircle(ent, dx, dy, rad) {
    var hit = false;
    if (dx !== 0) { if (!collideCircle(ent.x + dx, ent.y, rad)) ent.x += dx; else hit = true; }
    if (dy !== 0) { if (!collideCircle(ent.x, ent.y + dy, rad)) ent.y += dy; else hit = true; }
    return hit;
  }

  function inExit(x, y) {
    var cc = Math.floor(x / T), rr = Math.floor(y / T);
    return tileAt(cc, rr) === 'S' && rr <= EXIT_ROW;
  }

  /* ---------------- Debug: ruta y spawns ---------------- */
  // BFS en celdas de 4 px con el círculo de radio 5 de Alexander, del inicio a la escalera.
  function routeCheck(Rarg) {
    var S = 4, gw = Math.ceil(COLS * T / S), gh = Math.ceil(ROWS * T / S), R = Rarg || (ACH.ent && ACH.ent.CFG.radius) || 5;
    var seen = new Uint8Array(gw * gh), prev = new Int32Array(gw * gh).fill(-1), q = new Int32Array(gw * gh);
    var free = new Int8Array(gw * gh); // 0 = sin calcular, 1 = libre, 2 = choca
    function ok(ix, iy) {
      var id = iy * gw + ix, v = free[id];
      if (v) return v === 1;
      var b = collideCircle(ix * S + S / 2, iy * S + S / 2, R);
      free[id] = b ? 2 : 1; return !b;
    }
    var sx = Math.floor(START.x / S), sy = Math.floor(START.y / S), head = 0, tail = 0, goal = -1;
    if (!ok(sx, sy)) return { ok: false, steps: 0, why: 'inicio bloqueado' };
    seen[sy * gw + sx] = 1; q[tail++] = sy * gw + sx;
    while (head < tail) {
      var id = q[head++], ix = id % gw, iy = (id - ix) / gw;
      if (inExit(ix * S + S / 2, iy * S + S / 2)) { goal = id; break; }
      var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
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

  // Lista todo lo que aparece dentro de una huella o de un tile sólido: spawns (con los 3 escolares), cobradores,
  // perros, inicio; y props cuya huella pisa un tile sólido.
  function spawnCheck() {
    var out = [], ZR = (ACH.ent && ACH.ent.CFG.zRadius) || 5;
    function chk(what, x, y, rad) { if (collideCircle(x, y, rad)) out.push({ what: what, x: Math.round(x), y: Math.round(y) }); }
    chk('inicio', START.x, START.y, 5);
    spawns.forEach(function (s, n) {
      var name = { Z: 'caminante', C: 'ciego', B: 'cobrador', E: 'escolar' }[s.ch] + '#' + n;
      if (s.ch === 'E') { chk(name + 'a', s.x - 7, s.y + 4, ZR); chk(name + 'b', s.x + 7, s.y + 4, ZR); chk(name + 'c', s.x, s.y - 6, ZR); }
      else chk(name, s.x, s.y, ZR);
    });
    DOGS.forEach(function (d, n) { chk('perro#' + n, d.x, d.y, 4); });
    props.forEach(function (p, n) {
      if (!(p.fw > 0)) return;
      var c0 = Math.floor(p.x0 / T), c1 = Math.floor((p.x1 - 0.01) / T), r0 = Math.floor(p.y0 / T), r1 = Math.floor((p.y1 - 0.01) / T);
      for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) if (isSolidTile(cc, rr)) { out.push({ what: 'prop ' + p.k + '#' + n + ' pisa sólido', x: p.x, y: p.y }); return; }
    });
    return out;
  }

  // Tiles de cara visible de un lote del lado N: lo que devuelve buildLot (res.face) o, si no, la misma regla del arquetipo.
  function effFace(f, res) {
    if (res && typeof res.face === 'number') return res.face;
    var rows = f.r1 - f.r0 + 1, W = (f.c1 - f.c0 + 1) * T, ft = f.face || 3;
    if (f.side !== 'N' || f.walk) return 0;
    if (f.arch === 'almacen') ft = f.face >= 5 ? f.face : ((W >= 144 || (f.name && !f.mural)) ? 5 : 4);
    else if (f.arch === 'fabrica' || f.arch === 'loteObra') ft = Math.max(4, f.face || 4);
    else ft = Math.max(3, f.face || 3);
    return Math.min(ft, rows);
  }
  // Prueba: máximo de manchas de sangre que caben en una pantalla de 480×270 (revisión 5.10: ≤ 3).
  function bloodPerScreen() {
    var b = decals.filter(function (d) { return d.k === 'sangre'; }), best = 0;
    b.forEach(function (a) { b.forEach(function (c) {
      var n = 0; b.forEach(function (d) { if (d.x >= a.x - 20 && d.x <= a.x + 460 && d.y >= c.y - 250 && d.y <= c.y + 20) n++; }); if (n > best) best = n;
    }); });
    return { total: b.length, maxPerScreen: best };
  }

  // v0.9 (H1): campos del Cerro que el nivel 1 deja vacíos o neutros
  function slopeAt() { return 0; }
  function isStairs(x, y) { return tileAt(Math.floor(x / T), Math.floor(y / T)) === 'S'; }
  // v0.13 (A2): puntos de descanso de la Gambetta (mismo formato que world-cerro): el inicio y 3 más. Reapareces en el último que tocaste.
  var REST = [
    { x: START.x, y: START.y, label: 'Inicio' },
    { x: 12 * T + 8, y: 13 * T + 2, label: 'Bodega Doña Luz' },     // vereda norte, frente a N1 (cols 8–17)
    { x: 86 * T, y: 37 * T + 8, label: 'El segundo jirón' },        // esquina sur del 2º jirón (cols 84–87)
    { x: 91 * T, y: 13 * T + 2, label: 'Botica La Chalaca' }    // vereda norte, frente a N10 (cols 88–95)
  ];
  var W1 = ACH.world = {
    id: 'gambetta', name: 'AV. GAMBETTA',
    slopeAt: slopeAt, isStairs: isStairs, lanes: [], restPoints: REST, perches: [], waterSources: [], trashPiles: [], chickenSpawns: [],
    ollaComun: null, cisterna: null, cfgNoche: { triggerX: 84 * T, triggerY: null, atTime: 300, kicker: 'AV. GAMBETTA · 7:00 P.M.' },
    T: T, COLS: COLS, ROWS: ROWS, W: COLS * T, H: ROWS * T, ROW: ROW, JIRONES: JIRONES, PASAJES: PASAJES,
    MAP: MAP, grid: grid, lotAt: lotAt, LOTS: LOTS, FOOT: FOOT, spawns: spawns, props: props,
    start: START, lights: [],
    over: over, decals: decals, decor: decor, poles: poles, dogSpawns: DOGS, birdSpawns: birdSpawns,
    tileAt: tileAt, isSolidTile: isSolidTile, buildProps: buildProps,
    collideCircle: collideCircle, moveCircle: moveCircle, los: los, inExit: inExit,
    routeCheck: routeCheck, spawnCheck: spawnCheck, SOCIAL: SOCIAL, lotsBaked: [], cables: [], effFace: effFace,
    bloodPerScreen: bloodPerScreen, propAt: propAt, catSpawns: CATS, FOOD_CARTS: FOOD_CARTS, foodCarts: [] /* lo llena inventario.js: {x, y, kind, portions, max, food, prop} */, hiddenLoot: HIDDEN_LOOT, looseDecor: looseDecor,
    // v0.13 T2 (GB): la escalera con calamina (B2) y los puntos de la historia de la Gambetta (gambetta.js los lee)
    setEscalera: function (abierta) { escCerrada = !abierta; return !escCerrada; },
    escaleraCerrada: function () { return escCerrada; },
    GB: {
      escalera: { x0: 120 * T, x1: 124 * T, y: 11 * T, c0: 120, c1: 123 },                 // la calamina tapa las filas 9–10
      charo: { x: 11 * T, y: 11 * T + 10 },                                             // puerta de la Bodega Doña Luz (N1)
      eusebio: { x: 100.5 * T, y: 37 * T + 6 },                                         // vereda sur, frente al patio de contenedores (S10)
      fosforito: { x: 79 * T, y: 24 * T + 12 },                                         // en la berma, cerca de la tarima (2º jirón)
      lucho: { x: 20 * T, y: 30.6 * T },                                                // el cobrador de la combi de la cuadra 1
      combi: { x: 9.5 * T, y: 34.3 * T },                                               // la combi volcada del paradero
      azotea: AZOTEA,
      perro: { x: 25.5 * T, y: 8 * T },                                                 // pasaje 1
      uhu: { x: 67.5 * T, y: 5.6 * T },                                                 // pasaje 2 (el Uhu va en hiddenLoot)
      vecina: { x: 97.5 * T, y: 5.2 * T },                                              // pasaje 3
      manchas: [{ x: 81.25 * T, y: 13.6 * T, label: 'la tarima' }, { x: 12 * T, y: 13.4 * T, label: 'la bodega' }],
      chofer: { x0: 92 * T, x1: 119 * T, y0: 15.5 * T, y1: 34.5 * T }                   // arena: las dos pistas frente a la escalera
    }
  };
  // v0.9 (H1): varios niveles. build() devuelve siempre el mismo mundo (buildProps y el horneado lo dejan como nuevo).
  ACH.levels = ACH.levels || {};
  ACH.levels.gambetta = { id: 'gambetta', name: 'AV. GAMBETTA', build: function () { return W1; } };
})();
