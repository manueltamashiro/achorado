/* ACHORADO — js/costaverde/mundo.js (C1a): el mapa del Malecón de Miraflores, del Faro La Marina a Larcomar (COSTAVERDE.md §2).
   Reemplaza a js/engine/world.js en costaverde.html y publica ACH.world con la MISMA forma que js/miraflores/mundo.js (mismas claves y
   tipos) con id 'costaverde', más:
     places{}       px de mundo: faro parapuerto deporte losa amor beso puente intihuatana letonia salazar larcoA larcoB larcoC arena borde
     terr[]         terrazas de Larcomar {id, r0, r1, c0, c1, wall:[r0,r1], floor:[r0,r1], rail}  (A ingreso · B plaza central · C plaza del mar · D arena)
     stairs[]       {x0, y0, x1, y1, dir:'S', id, gate?}  px; bajar (sur) ×1.25, subir ×0.8 (speedMul)
     checkpoints[]  {id, x, y, label}  faro · amor · salazar · arena (+ borde, que pone el chef/caída con ACH.cv.setCheckpoint('borde'))
     heladeroPath[] polilíneas [[x, y], …] (px) por donde pasa el heladero
     dogZones[]     {id, x0, y0, x1, y1} (px) zonas de paseo de los perritos
     vista          {r0, r1, y0, y1, x0, x1, parallax, holes[]}: la banda de mar (no se camina). Se dibuja en drawHooks.ground con
                    ACH.sprites.cv.malecon.vista.draw(ctx, camX, camY, t, W) (recortado fuera de Larcomar) o con un degradado provisorio horneado.
     quebrada       {x0, y0, x1, y1, bridges[]} la Bajada Balta (sólida); se hornea al suelo con ACH.sprites.cv.malecon.quebradaBalta.draw(g, 0, 0, 0, W)
     dynSolids[]    como Miraflores. {chef:true} / {cvGate:true} no cuentan en routeCheck. La reja del chifa es {cvGate:true}.
     vendors[]      [] (Don Tito y Don Pepe no salen). vendorSpots{fosfo, kioscoLarco, deportes, fuente}: dónde van los de juguetes.js
     goals[]        arcos de la losa {id, x0, y0, x1, y1} · ballSpots[] 3 pelotas sueltas · doors{marca: [{x, y}]} puertas de Larcomar
     tramos[]       {id, c0, c1, name}; tramoAt(x, y) · terraceAt(x, y) · isStairs(x, y) · inLarco(x, y)
   La cámara: el sistema 'camara' mueve W.camUp (game.js lo resta del objetivo y cada paso): en los parques no baja de la fila ~38
   (se ven 4–5 tiles de vista) y en Larcomar centra la terraza en la que está Alexander (fachada arriba, baranda y mar abajo).
   Mapa: 300 × 86 tiles. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var CV = ACH.cv = ACH.cv || ACH.mira || {}; ACH.mira = ACH.mira || CV;
  CV.systems = CV.systems || [];
  if (!CV.register) CV.register = function (s) { if (CV.systems.indexOf(s) < 0) CV.systems.push(s); return s; };

  var T = 16, COLS = 300, ROWS = 86;
  var ROW = { blockN: [0, 9], walkN: [10, 11], curbN: 12, laneN: [13, 16], dashN: [15, 15], dashS: [15, 15], curbS: 17, sardinel: 18,
    bici: [19, 20], park: [21, 32], parapeto: 33, vista: [34, ROWS - 1], berma: [-9, -9] };
  var JIRONES = [[86, 89], [140, 143], [254, 257]];   // Av. Jorge Chávez · Av. Diagonal / Malecón Balta · Av. Larco
  var PASAJES = [];
  var QB = { c0: 150, c1: 172, r0: 0, r1: 33 };          // la Bajada Balta (quebrada)
  var BRIDGES = [{ id: 'villena', r0: 12, r1: 17, name: 'PUENTE VILLENA REY' }, { id: 'mellizo', r0: 25, r1: 28, name: 'PUENTE MELLIZO' }];
  var LARCO = { c0: 254, c1: 296, r0: 33, r1: 80 };      // lo que se camina debajo del parapeto
  var TERR = [
    { id: 'A', name: 'Nivel de ingreso', wall: [34, 37], floor: [38, 43], rail: 44 },
    { id: 'B', name: 'Plaza Central', wall: [45, 48], floor: [49, 54], rail: 55 },
    { id: 'C', name: 'Plaza del Mar', wall: [56, 59], floor: [60, 65], rail: 66 },
    { id: 'D', name: 'Arena', wall: [67, 72], floor: [73, 79], rail: 80 }
  ];
  TERR.forEach(function (t) { t.r0 = t.wall[0]; t.r1 = t.rail; t.c0 = LARCO.c0; t.c1 = LARCO.c1; });
  // escaleras (en tiles): cortan la pared y la baranda; la de C→D lleva la reja del chifa
  var STAIRS_T = [
    { id: 'ingreso', c0: 266, c1: 268, r0: 33, r1: 37 },
    { id: 'AB-o', c0: 258, c1: 260, r0: 44, r1: 48 }, { id: 'AB-e', c0: 288, c1: 290, r0: 44, r1: 48 },
    { id: 'BC-o', c0: 262, c1: 264, r0: 55, r1: 59 }, { id: 'BC-e', c0: 284, c1: 286, r0: 55, r1: 59 },
    { id: 'CD', c0: 258, c1: 260, r0: 66, r1: 72, gate: true }
  ];
  var TRAMOS = [
    { id: 'faro', c0: 0, c1: 29, name: 'Faro La Marina y Parque Raimondi' }, { id: 'parapuerto', c0: 30, c1: 69, name: 'Parapuerto' },
    { id: 'deporte', c0: 70, c1: 99, name: 'Complejo deportivo' }, { id: 'amor', c0: 100, c1: 149, name: 'Parque del Amor' },
    { id: 'puente', c0: 150, c1: 172, name: 'Puente Villena Rey' }, { id: 'intihuatana', c0: 173, c1: 214, name: 'Parque Intihuatana' },
    { id: 'letonia', c0: 215, c1: 249, name: 'Parque Letonia' }, { id: 'salazar', c0: 250, c1: 299, name: 'Parque Salazar' }
  ];
  function inJiron(c) { for (var i = 0; i < JIRONES.length; i++) if (c >= JIRONES[i][0] && c <= JIRONES[i][1]) return JIRONES[i]; return null; }
  function inQB(c, r) { return c >= QB.c0 && c <= QB.c1 && r >= QB.r0 && r <= QB.r1; }
  function bridgeAt(r) { for (var i = 0; i < BRIDGES.length; i++) if (r >= BRIDGES[i].r0 && r <= BRIDGES[i].r1) return BRIDGES[i]; return null; }
  function inLarcoT(c, r) { return c >= LARCO.c0 && c <= LARCO.c1 && r > LARCO.r0 && r <= LARCO.r1; }
  function stairAtT(c, r) { for (var i = 0; i < STAIRS_T.length; i++) { var s = STAIRS_T[i]; if (c >= s.c0 && c <= s.c1 && r >= s.r0 && r <= s.r1) return s; } return null; }
  function terrAtRow(r) { for (var i = 0; i < TERR.length; i++) if (r >= TERR[i].r0 && r <= TERR[i].r1) return TERR[i]; return null; }

  /* ---------------- LOTS ----------------
     Lado tierra (filas 0–9, fachada al sur): cv_torre (vidrio teal con franjas doradas), cv_casona, cv_hotel (JW MARRIOTT con f.name).
     Paredes norte de las terrazas de Larcomar: cv_fachada + brand (se hornea con ACH.sprites.cv.larco.fachada(brand, wTiles)). */
  var LOTS = [];
  (function () {
    var segs = [[0, 85], [90, 139], [144, 149], [173, 253]], W8 = [10, 8, 12, 9, 11, 7, 10, 9], AR = ['cv_torre', 'cv_torre', 'cv_casona', 'cv_hotel', 'cv_torre', 'cv_casona'];
    var COL = ['teal', 'beige', 'blanco', 'rosado', 'teal', 'crema'], NAMES = { cv_hotel: ['HOTEL', 'HOSTAL', 'APART HOTEL'] }, n = 0;
    segs.forEach(function (s) {
      var c = s[0];
      while (c <= s[1]) {
        var w = W8[n % W8.length], c1 = Math.min(s[1], c + w - 1);
        if (s[1] - c1 < 4) c1 = s[1];
        var arch = AR[n % AR.length];
        LOTS.push({ id: 'N' + n, side: 'N', c0: c, c1: c1, r0: 0, r1: 9, arch: arch, floors: arch === 'cv_casona' ? 2 : (arch === 'cv_hotel' ? 5 : 8 + (n % 3) * 2),
          color: COL[n % COL.length], name: arch === 'cv_hotel' ? NAMES.cv_hotel[n % 3] : '', corner: inJiron(c - 1) ? 'W' : (inJiron(c1 + 1) ? 'E' : '') });
        n++; c = c1 + 1;
      }
    });
    LOTS.push({ id: 'N' + (n++), side: 'N', c0: 258, c1: 267, r0: 0, r1: 9, arch: 'cv_torre', floors: 10, color: 'teal', name: '', corner: 'W' });
    LOTS.push({ id: 'MARRIOTT', side: 'N', c0: 268, c1: 285, r0: 0, r1: 9, arch: 'cv_hotel', floors: 12, face: 9, color: 'teal', name: 'JW MARRIOTT', marriott: true });
    LOTS.push({ id: 'N' + (n++), side: 'N', c0: 286, c1: 299, r0: 0, r1: 9, arch: 'cv_torre', floors: 9, color: 'beige', name: '' });
  })();
  // fachadas de Larcomar: [terraza, marca, c0, c1]
  var SHOPS = [
    ['A', 'nike', 254, 257], ['A', 'bananarepublic', 258, 262], ['A', 'tanta', 263, 265], ['A', 'mangos', 269, 272],
    ['A', 'koasian', 279, 281], ['A', 'popular', 282, 284], ['A', 'bonbonniere', 285, 287], ['A', 'fridays', 288, 290], ['A', 'pardos', 291, 293], ['A', 'kiosco', 294, 296],
    ['B', 'cinepolis', 261, 269], ['B', 'hm', 270, 273], ['B', 'miniso', 274, 276], ['B', 'adidas', 277, 280], ['B', 'starbucks', 281, 283], ['B', 'freddo', 284, 287],
    ['B', 'cinnabon', 291, 293], ['B', 'deportes', 294, 296],
    ['C', 'salazar', 265, 275], ['C', 'haagendazs', 276, 279], ['C', 'masterkong', 280, 283], ['C', 'fuente', 287, 290],
    ['D', 'granDragon', 266, 286]
  ];
  var LETRERO = { c0: 273, c1: 278, terr: 'A' };   // el letrero LARCOMAR en la pared del nivel A (hueco sin tienda)
  SHOPS.forEach(function (s) {
    var t = TERR.filter(function (q) { return q.id === s[0]; })[0];
    LOTS.push({ id: 'LC_' + s[1], side: 'N', c0: s[2], c1: s[3], r0: t.wall[0], r1: t.wall[1], arch: 'cv_fachada', brand: s[1], floors: 1,
      face: t.wall[1] - t.wall[0] + 1, color: 'crema', terr: s[0], park: true, larco: true });
  });
  function brandName(id) { return CV.brandName ? CV.brandName(id) : String(id).toUpperCase(); }
  LOTS.forEach(function (f) { if (f.brand && !f.name) f.name = brandName(f.brand); f.name = f.name || ''; f.damage = 0; f.roof = []; f.front = []; });
  (function () {   // semilla, cara visible y vecinos (como world.js)
    function seedOf(id) { var h = 2166136261; for (var i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 10000; }
    function faceOf(f) {
      if (f.face) return Math.min(f.face, f.r1 - f.r0 + 1);
      var v = { 0: 3, 1: 3, 2: 5, 3: 7 }[f.floors] || 7;
      return Math.min(v, f.r1 - f.r0 + 1);
    }
    for (var i = 0; i < LOTS.length; i++) {
      var f = LOTS[i];
      f.seed = seedOf(f.id); f.face = faceOf(f); f.nbW = -1; f.nbE = -1;
      for (var j = 0; j < LOTS.length; j++) {
        var g = LOTS[j];
        if (g === f || g.r0 !== f.r0) continue;
        if (g.c1 === f.c0 - 1) f.nbW = g.floors;
        if (g.c0 === f.c1 + 1) f.nbE = g.floors;
      }
    }
  })();

  /* ---------------- Grilla ----------------
     L lote · X barricada · s vereda · n sardinel norte · u sardinel sur · . pista · - raya · j jirón · c ciclovía · p parque
     P parapeto (sólido) · V vista al mar (sólido, no se camina) · Q quebrada (sólido) · B puente Villena (pista) · K puente mellizo (peatonal)
     R pared de roca de Larcomar (sólido) · G baranda de vidrio (sólido) · f piso de Larcomar · h piso del chifa · S escalera */
  var SOLID = { L: 1, X: 1, P: 1, V: 1, Q: 1, R: 1, G: 1, W: 1 };
  // v0.13 T2 (E2): interiores de 3 locales de Larcomar. Salas chicas talladas en la vista (filas 40-79, lejos de la ruta), aisladas:
  // W pared (sólida) · i piso. Se entra con E en la puerta del local (locales.js teletransporta) y se sale por la puerta de abajo.
  var ROOMS = [
    { id: 'cine', brand: 'cinepolis', terr: 'B', c0: 20, c1: 45, r0: 42, r1: 57, wallH: 3 },
    { id: 'cafe', brand: 'starbucks', terr: 'B', c0: 60, c1: 79, r0: 44, r1: 56, wallH: 3 },
    { id: 'tanta', brand: 'tanta', terr: 'A', c0: 96, c1: 117, r0: 43, r1: 56, wallH: 3 }
  ];
  ROOMS.forEach(function (q) { q.x0 = q.c0 * 16; q.x1 = (q.c1 + 1) * 16; q.y0 = q.r0 * 16; q.y1 = (q.r1 + 1) * 16; q.fy0 = (q.r0 + q.wallH) * 16; q.fy1 = q.r1 * 16; q.fx0 = (q.c0 + 1) * 16; q.fx1 = q.c1 * 16; });
  function roomCharAt(c, r) {
    for (var k = 0; k < ROOMS.length; k++) {
      var q = ROOMS[k]; if (c < q.c0 || c > q.c1 || r < q.r0 || r > q.r1) continue;
      return (c === q.c0 || c === q.c1 || r === q.r1 || r < q.r0 + q.wallH) ? 'W' : 'i';
    }
    return null;
  }
  function roomAt(x, y) { for (var k = 0; k < ROOMS.length; k++) { var q = ROOMS[k]; if (x >= q.x0 && x < q.x1 && y >= q.y0 && y < q.y1) return q; } return null; }
  function baseChar(c, r) {
    if (r <= 9) return 'L';
    if (r <= 11) return 's';
    if (r === 12) return 'n';
    if (r <= 16) return r === 15 ? '-' : '.';
    if (r === 17) return 'u';
    if (r === 18) return 's';
    if (r <= 20) return 'c';
    if (r <= 32) return 'p';
    if (r === 33) return 'P';
    return 'V';
  }
  var grid = [], lotAt = [], r, c, i;
  for (r = 0; r < ROWS; r++) {
    var row = [], lrow = [];
    for (c = 0; c < COLS; c++) {
      var ch = baseChar(c, r), J = inJiron(c);
      if (J && r <= 11) ch = r === 0 ? 'X' : 'j';
      if (inQB(c, r)) { var B = bridgeAt(r); ch = B ? (B.id === 'villena' ? (r === 12 ? 'n' : r === 17 ? 'u' : r === 15 ? '-' : 'B') : 'K') : 'Q'; }
      if (inLarcoT(c, r)) {
        var t = terrAtRow(r);
        if (t) {
          if (r >= t.wall[0] && r <= t.wall[1]) ch = 'R';
          else if (r === t.rail) ch = 'G';
          else ch = t.id === 'D' ? 'h' : 'f';
        }
      }
      var st = stairAtT(c, r); if (st) ch = 'S';
      var rc = roomCharAt(c, r); if (rc) ch = rc;
      row.push(ch); lrow.push(-1);
    }
    grid.push(row); lotAt.push(lrow);
  }
  for (i = 0; i < LOTS.length; i++) {
    var L0 = LOTS[i];
    for (r = L0.r0; r <= L0.r1; r++) for (c = L0.c0; c <= L0.c1; c++) { if (grid[r][c] === 'S') continue; grid[r][c] = 'L'; lotAt[r][c] = i; }
  }
  var MAP = grid.map(function (rw) { return rw.join(''); });

  /* ---------------- Lugares, inicio, puntos de control ---------------- */
  function px(cc, rr) { return { x: Math.round(cc * T), y: Math.round(rr * T) }; }
  var PLACES = {
    faro: px(8.5, 26.5), parapuerto: px(48, 27.5), deporte: px(76, 26), losa: px(90, 27.5), amor: px(108, 27.5), beso: px(125, 29.6),
    puente: px(161, 26.8), puenteVillena: px(161, 14.5), intihuatana: px(185, 27.5), letonia: px(232, 29.2), salazar: px(260, 28.5),
    ingreso: px(267.5, 32), larcoA: px(276, 40.6), larcoB: px(276, 51.6), larcoC: px(279, 62.6), rejaChifa: px(259.5, 64.6),
    arena: px(276, 77), borde: px(294, 78.6)
  };
  var START_HOME = { x: PLACES.faro.x, y: PLACES.faro.y };
  var START = { x: START_HOME.x, y: START_HOME.y };
  var CHECKPOINTS = [
    { id: 'faro', x: START_HOME.x, y: START_HOME.y, label: 'el Faro La Marina' },
    { id: 'amor', x: PLACES.amor.x, y: PLACES.amor.y, col: 104, label: 'el Parque del Amor' },
    { id: 'salazar', x: PLACES.salazar.x, y: PLACES.salazar.y, col: 250, label: 'el Parque Salazar' },
    { id: 'arena', x: Math.round(262 * T), y: Math.round(62.6 * T), label: 'la entrada de la arena' },
    { id: 'borde', x: PLACES.borde.x, y: PLACES.borde.y, label: 'el borde del acantilado' }
  ];
  var STAIRS = STAIRS_T.map(function (s) { return { id: s.id, x0: s.c0 * T, y0: s.r0 * T, x1: (s.c1 + 1) * T, y1: (s.r1 + 1) * T, dir: 'S', gate: !!s.gate }; });
  var HELADERO_PATH = [
    [[104 * T, 28.2 * T], [176 * T, 28.2 * T], [178 * T, 22.25 * T], [248 * T, 22.25 * T]],
    [[30 * T, 25 * T], [100 * T, 25 * T]],
    // v0.13 T2 (E2): el heladero baja a las terrazas de Larcomar (ingreso → A → escalera AB-e → B)
    [[252 * T, 28.5 * T], [267.5 * T, 28.5 * T], [267.5 * T, 40.6 * T], [289.5 * T, 40.6 * T], [289.5 * T, 51.6 * T], [262 * T, 51.6 * T]]
  ];
  var DOG_ZONES = [
    { id: 'parapuerto', x0: 32 * T, y0: 22 * T, x1: 68 * T, y1: 31 * T },
    { id: 'amor', x0: 102 * T, y0: 21.5 * T, x1: 116 * T, y1: 30.5 * T },
    { id: 'intihuatana', x0: 176 * T, y0: 21.5 * T, x1: 212 * T, y1: 31 * T },
    { id: 'letonia', x0: 218 * T, y0: 21.5 * T, x1: 249 * T, y1: 31.5 * T },
    { id: 'letonia2', x0: 222 * T, y0: 24 * T, x1: 244 * T, y1: 30 * T }
  ];
  var VENDOR_SPOTS = { fosfo: px(114, 22.2), kioscoLarco: px(295, 39.4), deportes: px(295, 50.4), fuente: px(288.5, 61.4) };
  var GOALS = [{ id: 'oeste', x0: 81.4 * T, y0: 25.6 * T, x1: 82.6 * T, y1: 29.2 * T }, { id: 'este', x0: 97.4 * T, y0: 25.6 * T, x1: 98.6 * T, y1: 29.2 * T }];
  var BALL_SPOTS = [px(86, 26.6), px(90, 28.2), px(94, 25.8)];
  var VISTA = { r0: 34, r1: ROWS - 1, y0: 34 * T, y1: ROWS * T, x0: 0, x1: COLS * T, parallax: 0.85,
    holes: [{ x0: LARCO.c0 * T, y0: 34 * T, x1: (LARCO.c1 + 1) * T, y1: (LARCO.r1 + 1) * T }] };
  var QUEBRADA = { x0: QB.c0 * T, y0: 0, x1: (QB.c1 + 1) * T, y1: (QB.r1 + 1) * T,
    bridges: BRIDGES.map(function (b) { return { id: b.id, name: b.name, x0: QB.c0 * T, x1: (QB.c1 + 1) * T, y0: b.r0 * T, y1: (b.r1 + 1) * T }; }) };

  /* ---------------- Acceso al arte (COSTAVERDE.md §10) ---------------- */
  function SCV() { return (ACH.sprites && ACH.sprites.cv) || {}; }
  function isCv(o) { return o && typeof o === 'object' && typeof o.width === 'number' && o.width > 0; }
  function okArt(o) { return Array.isArray(o) ? !!(o.length && isCv(o[0])) : isCv(o); }
  function cvTile(name) {
    var S = SCV(), m = S.malecon || {}, l = S.larco || {}, o;
    o = m.tiles && m.tiles[name]; if (okArt(o)) return o;
    o = l.tiles && l.tiles[name]; if (okArt(o)) return o;
    o = m[name]; if (okArt(o)) return o;
    o = l[name]; if (okArt(o)) return o;
    return null;
  }
  function cvProp(name) {
    var S = SCV(), m = S.malecon || {}, l = S.larco || {}, o;
    o = m.props && m.props[name]; if (okArt(o)) return o;
    o = l.props && l.props[name]; if (okArt(o)) return o;
    o = m[name]; if (okArt(o)) return o;
    o = l[name]; if (okArt(o)) return o;
    return null;
  }
  CV.art = { tile: cvTile, prop: cvProp };

  /* ---------------- Tiles: alias 'cv_<nombre>' en ACH.sprites.tiles (render.js los lee de ahí) o provisorios ---------------- */
  function hashT(cc, rr) { var h = (cc * 374761393 + rr * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return (h ^ (h >>> 16)) >>> 0; }
  function mkc(w, h) { return CV.mk ? CV.mk(w, h) : (function () { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; })(); }
  function mkTile(draw) { var t = mkc(16, 16), g = t.getContext('2d'); g.imageSmoothingEnabled = false; draw(g); return t; }
  function dots(g, seed, col, n) { g.fillStyle = col; for (var q = 0; q < n; q++) { var h = hashT(seed, q * 7 + 1); g.fillRect(h % 16, (h >>> 8) % 16, 1, 1); } }
  function flat(base, spk, seed, line) { return function (v) { return mkTile(function (g) { g.fillStyle = base[v % base.length]; g.fillRect(0, 0, 16, 16); dots(g, seed + v, spk, 10); if (line) { g.fillStyle = line; g.fillRect(0, 15, 16, 1); g.fillRect(15, 0, 1, 16); } }); }; }
  var TILE_PROV = {
    pasto: flat(['#5f9a3e', '#5a943a', '#64a040'], '#4d7a32', 11),
    pastoFlor: function (v) { return mkTile(function (g) { g.fillStyle = '#5f9a3e'; g.fillRect(0, 0, 16, 16); dots(g, 41 + v, '#4d7a32', 10); dots(g, 51 + v, v % 2 ? '#e8b830' : '#d8402c', 5); }); },
    caminoLadrillo: flat(['#b8644e', '#b05e4a', '#bc6a52'], '#94503e', 21, '#9a5442'),
    ciclovia: function (v) { return mkTile(function (g) { g.fillStyle = v % 2 ? '#b8574a' : '#b25246'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#e8e0cf'; if (v % 4 === 0) g.fillRect(6, 7, 4, 2); dots(g, 71 + v, '#9a463a', 6); }); },
    veredaCV: flat(['#cfc8ba', '#d4cdbf', '#c9c2b4'], '#b4ad9f', 61, '#b4ad9f'),
    adoquinLetonia: function (v) { return mkTile(function (g) { var a = v % 2 ? '#e0b030' : '#c8402c'; g.fillStyle = a; g.fillRect(0, 0, 16, 16); g.fillStyle = 'rgba(0,0,0,.25)'; for (var y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1); for (var x = (v % 2) * 4; x < 16; x += 8) g.fillRect(x, 0, 1, 16); }); },
    losa: flat(['#3a7a6a', '#38766a', '#3c7e6e'], '#336a5c', 91),
    losaLinea: function (v) { return mkTile(function (g) { g.fillStyle = '#3a7a6a'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#f3efe2'; if (v % 2) g.fillRect(7, 0, 2, 16); else g.fillRect(0, 7, 16, 2); }); },
    mosaicoPiso: function (v) { return mkTile(function (g) { var P = ['#2a6ac8', '#d8402c', '#f0a020', '#e8d040']; g.fillStyle = '#c8a07a'; g.fillRect(0, 0, 16, 16); for (var q = 0; q < 10; q++) { var h = hashT(v + 5, q); g.fillStyle = P[h % 4]; g.fillRect(h % 14, (h >>> 6) % 14, 2, 2); } }); },
    pedestalBeso: flat(['#20283a', '#1c2434', '#242c40'], '#3a4a6a', 31, '#121826'),
    tierraAmor: flat(['#c89a6a', '#c49466', '#cca06e'], '#a87a50', 33),
    pisoLarco: flat(['#e0d6c0', '#dcd2bc', '#e4dac4'], '#c8bea8', 101, '#c4baa4'),
    deck: function (v) { return mkTile(function (g) { g.fillStyle = v % 2 ? '#a07a4a' : '#9a7446'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#7a5a34'; g.fillRect(0, 3, 16, 1); g.fillRect(0, 7, 16, 1); g.fillRect(0, 11, 16, 1); g.fillRect(0, 15, 16, 1); }); },
    escalera: function (v) { return mkTile(function (g) { g.fillStyle = '#d8ceb8'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#9a9080'; for (var y = 3; y < 16; y += 4) g.fillRect(0, y, 16, 1); g.fillStyle = '#f0e8d4'; for (y = 0; y < 16; y += 4) g.fillRect(0, y, 16, 1); }); },
    paredRoca: function (v) { return mkTile(function (g) { g.fillStyle = ['#8a7a66', '#84745f', '#907f6a'][v % 3]; g.fillRect(0, 0, 16, 16); dots(g, 121 + v, '#6e604e', 14); dots(g, 131 + v, '#a8977e', 6); }); },
    pisoChifa: function (v) { return mkTile(function (g) { g.fillStyle = v % 2 ? '#7a1a1a' : '#701818'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#c8962a'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16); }); },
    // solo del motor (provisorios sin arte en el contrato)
    marProv: flat(['#5f7f78', '#5a7a74', '#62847c'], '#7a9a92', 141),
    quebradaProv: flat(['#6a8a4a', '#648446', '#709050'], '#4f6e3a', 151),
    puente: flat(['#9a9890', '#96948c', '#a09e96'], '#7a786f', 161, '#83817a')
  };
  var TILE_KEYS = Object.keys(TILE_PROV);
  function ensureTiles() {
    var S = ACH.sprites = ACH.sprites || {}, TT = S.tiles = S.tiles || {};
    TILE_KEYS.forEach(function (k) {
      var art = cvTile(k);
      if (art) { TT['cv_' + k] = Array.isArray(art) ? art : [art]; return; }
      if (TT['cv_' + k] && TT['cv_' + k].cvProv) return;
      var arr = []; for (var n = 0; n < 4; n++) arr.push(TILE_PROV[k](n)); arr.cvProv = true; TT['cv_' + k] = arr;
    });
  }
  function nVar(name) { var o = ACH.sprites && ACH.sprites.tiles && ACH.sprites.tiles[name]; return Array.isArray(o) ? Math.max(1, o.length) : 1; }

  /* ---------------- Suelo (W.over) ---------------- */
  var over = {}, decals = [], decor = [];
  function setOver(cc, rr, layers) { over[rr * COLS + cc] = layers; }
  // caminos de ladrillo (tiles: col, fila); medio ancho 0.9
  var PATHS = [
    [[0, 29.5], [149, 29.5]], [[173, 29.5], [249, 29.5]],                         // el paseo junto al parapeto
    [[16, 22], [24, 29.5]], [[34, 22], [44, 29.5]], [[60, 22], [54, 29.5]],        // ramales al norte
    [[102, 22], [112, 26.5], [118, 29.5]], [[148, 22], [140, 26], [134, 29.5]],
    [[176, 22], [182, 26], [194, 29.5]], [[205, 22], [198, 29.5]], [[212, 22], [222, 26]]
  ];
  function segDist(x, y, a, b) {
    var vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy, t = l2 ? ((x - a[0]) * vx + (y - a[1]) * vy) / l2 : 0;
    t = Math.max(0, Math.min(1, t)); var dx = x - (a[0] + vx * t), dy = y - (a[1] + vy * t); return Math.sqrt(dx * dx + dy * dy);
  }
  function onPath(x, y) {
    for (var k = 0; k < PATHS.length; k++) for (var j = 0; j + 1 < PATHS[k].length; j++) if (segDist(x, y, PATHS[k][j], PATHS[k][j + 1]) < 0.95) return true;
    return false;
  }
  function V(name, h) { return ['cv_' + name, h % nVar('cv_' + name)]; }
  function parkLayers(cc, rr) {
    var x = cc + 0.5, y = rr + 0.5, h = hashT(cc, rr), dx, dy;
    dx = x - 12; dy = (y - 25) * 1.3;
    if (cc < 30 && dx * dx + dy * dy < 22) return [V('veredaCV', h)];                                     // plaza del faro
    if (cc >= 82 && cc <= 97 && rr >= 24 && rr <= 30) {                                                   // losa de fulbito
      if (cc === 82 || cc === 97 || rr === 24 || rr === 30) return [['cv_losaLinea', 0]];
      if (cc === 89 || cc === 90) return [['cv_losaLinea', 1]];
      return [V('losa', h)];
    }
    if (cc >= 119 && cc <= 131 && rr >= 25 && rr <= 28) return [V('pedestalBeso', h)];                    // pedestal de El Beso
    if (cc >= 103 && cc <= 145 && rr >= 30 && rr <= 32) return [V('mosaicoPiso', h)];                     // pie de las bancas-muro
    if (cc >= 115 && cc <= 135 && rr >= 23 && rr <= 29) return [V('tierraAmor', h)];                      // tierra ocre del Amor
    if (cc >= 226 && cc <= 238 && rr >= 22 && rr <= 30) return [['cv_adoquinLetonia', (cc + rr) % 2 ? 1 : 0]];   // Letonia
    if (cc >= 250 && rr >= 27) return [V('veredaCV', h)];                                                  // loseta del Salazar
    if (onPath(x, y)) return [V('caminoLadrillo', h)];
    return [h % 100 < 8 ? V('pastoFlor', h >>> 8) : V('pasto', h >>> 8)];
  }
  function buildOver() {
    for (var k in over) delete over[k];
    var cc, rr;
    for (rr = 0; rr < ROWS; rr++) for (cc = 0; cc < COLS; cc++) {
      var ch = grid[rr][cc], h = hashT(cc, rr), L = null;
      if (ch === 'p') L = parkLayers(cc, rr);
      else if (ch === 'c') L = [V('ciclovia', h)];
      else if (ch === 's' && rr === 18) L = [V('veredaCV', h)];
      else if (ch === 'P') L = [V('veredaCV', h)];
      else if (ch === 'V') L = [V('marProv', h)];
      else if (ch === 'Q') L = [V('quebradaProv', h)];
      else if (ch === 'K') L = [V('puente', h)];
      else if (ch === 'R') L = [V('paredRoca', h)];
      else if (ch === 'f' || ch === 'G') { var tt = terrAtRow(rr); L = [(tt && tt.id === 'C' && cc >= 262 && cc <= 284) || (tt && tt.id === 'A' && cc >= 268 && cc <= 278 && rr >= 41) ? V('deck', h) : V('pisoLarco', h)]; }
      else if (ch === 'h') L = [V('pisoChifa', h)];
      else if (ch === 'i') L = [V('pisoLarco', h)];
      else if (ch === 'W') L = [V('paredRoca', h)];
      else if (ch === 'S') L = [V('escalera', rr)];
      if (L) setOver(cc, rr, L);
    }
  }
  (function () {   // un poco de desgaste (poca sangre)
    var DM = function (k, x, y) { decals.push({ k: k, v: 0, x: Math.round(x), y: Math.round(y), rot: 0, cv: true }); };
    DM('charco', 40 * T, 14.4 * T); DM('parche', 120 * T, 16.2 * T); DM('frenada', 200 * T, 14.6 * T); DM('charco', 240 * T, 16.4 * T);
    DM('sangre', 186 * T, 30.4 * T);
  })();

  /* ---------------- Props ----------------
     k = clave del contrato (§10); en ACH.sprites.props van como 'cv_' + k. Si falta el arte: bloque provisorio con su nombre. */
  var PROV = {   // [ancho, alto, color, fw, fh, rótulo, tall]
    faro: [28, 112, '#1d2a44', 12, 7, 'FARO', 1], farolCV: [10, 46, '#1f3a2a', 3, 3, '', 1], bancaCV: [26, 14, '#2f5a3a', 22, 6, 'BANCA'],
    basureroCV: [9, 13, '#2f5a3a', 6, 4, ''], bebedero: [10, 14, '#8a8a90', 6, 4, ''], cartelMiraflores: [28, 26, '#2a6ab8', 6, 4, 'MIRAFLORES'],
    palmeraCV: [26, 84, '#6f8f3e', 4, 4, 'PALMERA', 1], ficusCV: [54, 60, '#3f6b38', 6, 4, 'FICUS', 1], setoCV: [32, 12, '#3f7a3a', 30, 7, 'SETO'],
    flores: [24, 9, '#d8402c', 0, 0, ''], beso: [176, 54, '#d88a6a', 150, 14, 'EL BESO', 1], muroMosaico: [64, 18, '#3a6ac8', 60, 6, 'TE AMO'],
    solMosaico: [44, 30, '#e8402c', 36, 8, 'SOL'], cupido: [20, 42, '#d8263a', 10, 6, 'CUPIDO', 1], gradaAnfi: [48, 16, '#cdbb98', 44, 10, 'GRADA'],
    casetaParapente: [42, 38, '#2f8a4a', 38, 10, 'PARAPENTE', 1], mangaViento: [12, 42, '#d8402c', 3, 3, '', 1],
    maquinaGym: [18, 22, '#3a9a3a', 14, 6, 'GYM'], arcoFulbito: [12, 30, '#e8e8e8', 0, 0, 'ARCO'], rejaCancha: [32, 22, '#4a5a5a', 30, 3, ''],
    gradaDeporte: [64, 20, '#9a9a9a', 60, 10, 'GRADAS'], intihuatana: [38, 44, '#8a8a88', 30, 10, 'INTIHUATANA', 1], totemEspejo: [16, 58, '#c8d8e0', 10, 8, 'TÓTEM', 1],
    pergolaOndulada: [84, 42, '#a07a4a', 0, 0, 'PÉRGOLA', 1], chimeneaVidrio: [22, 44, '#3a7ad8', 14, 8, '', 1], cabezaCondor: [50, 38, '#d8b8a8', 40, 12, 'CÓNDOR', 1],
    macetaLarco: [14, 16, '#b8744a', 10, 5, ''], sombrillaTerraza: [38, 40, '#e8402c', 4, 4, 'SOMBRILLA', 1], mesaSalazar: [22, 14, '#c8b89a', 16, 6, 'MESA'],
    barCentral: [70, 30, '#6a4a2a', 64, 12, 'BAR', 1], farolRojo: [10, 30, '#d8263a', 3, 3, '', 1], mesaRedonda: [26, 14, '#8a2a20', 20, 7, 'MESA'],
    pecera: [20, 22, '#6ac8e8', 14, 6, 'PECERA'], casetaTandem: [40, 38, '#e8b830', 34, 10, 'VUELOS TANDEM', 1]
  };
  // huellas fijas (solo el tronco/poste, aunque el arte traiga otra): árboles, faroles, pérgolas
  var FOOTFIX = { palmeraCV: { fw: 4, fh: 4, tall: 1, tree: 1 }, ficusCV: { fw: 6, fh: 4, tall: 1, tree: 1 }, farolCV: { fw: 3, fh: 3, tall: 1 },
    farolRojo: { fw: 3, fh: 3, tall: 1 }, mangaViento: { fw: 3, fh: 3, tall: 1 }, pergolaOndulada: { fw: 0, fh: 0, tall: 1, tree: 1 }, flores: { fw: 0, fh: 0 },
    arcoFulbito: { fw: 0, fh: 0 }, sombrillaTerraza: { fw: 5, fh: 4, tall: 1 } };
  var LAMPS = { farolCV: [{ x: 0, y: -42 }], farolRojo: [{ x: 0, y: -26 }] };
  var BREAK = {   // props rompibles (interaccion.js, clase 'junk'): sueltan monedas y comida (propHook de abajo)
    cv_cartelMiraflores: { cls: 'junk', hp: 2, h: 22, loot: null, mat: 'metal', hitSfx: 'prop.hit.metal', breakSfx: 'prop.break.cart', noise: 70 },
    cv_sombrillaTerraza: { cls: 'junk', hp: 2, h: 30, loot: null, mat: 'wood', hitSfx: 'prop.hit.wood', breakSfx: 'prop.break.cart', noise: 60 },
    cv_mesaSalazar: { cls: 'junk', hp: 2, h: 14, loot: null, mat: 'wood', hitSfx: 'prop.hit.wood', breakSfx: 'prop.break.cart', noise: 60 },
    cv_macetaLarco: { cls: 'junk', hp: 1, h: 14, loot: null, mat: 'wood', hitSfx: 'prop.hit.wood', breakSfx: 'prop.break.cart', noise: 50 },
    cv_basureroCV: { cls: 'trash', hp: 2, h: 14 }
  };
  var PROPS = [
    // ---- Faro La Marina y Parque Raimondi ----
    { k: 'faro', c: 12, r: 24.6 }, { k: 'bancaCV', c: 18, r: 31.6 }, { k: 'palmeraCV', v: 0, c: 4, r: 22.4 }, { k: 'palmeraCV', v: 1, c: 21, r: 22.4 },
    { k: 'ficusCV', c: 26, r: 25.5 }, { k: 'bebedero', c: 16, r: 27.6 }, { k: 'cartelMiraflores', c: 30, r: 21.7 },
    // ---- Parapuerto ----
    { k: 'casetaParapente', c: 45, r: 23.4 }, { k: 'mangaViento', c: 38, r: 31.6 }, { k: 'mangaViento', c: 57, r: 31.6 },
    { k: 'bancaCV', c: 64, r: 31.6 }, { k: 'ficusCV', v: 1, c: 66, r: 24.5 },
    // ---- Complejo deportivo ----
    { k: 'maquinaGym', v: 0, c: 71.5, r: 23.6 }, { k: 'maquinaGym', v: 1, c: 74.5, r: 23.6 }, { k: 'maquinaGym', v: 2, c: 77.5, r: 23.6 },
    { k: 'maquinaGym', v: 3, c: 73, r: 27.4 }, { k: 'maquinaGym', v: 0, c: 76.5, r: 27.4 },
    { k: 'arcoFulbito', v: 0, c: 82.1, r: 29.2 }, { k: 'arcoFulbito', v: 1, c: 97.9, r: 29.2, dir: 'W' },
    { k: 'rejaCancha', c: 84, r: 23.6 }, { k: 'rejaCancha', c: 88.6, r: 23.6 }, { k: 'rejaCancha', c: 93.4, r: 23.6 }, { k: 'rejaCancha', c: 96, r: 23.6 },
    { k: 'gradaDeporte', c: 90, r: 32.6 }, { k: 'basureroCV', c: 80, r: 31.6 },
    // ---- Parque del Amor ----
    { k: 'beso', c: 125, r: 27.6 }, { k: 'setoCV', c: 120.5, r: 24.6 }, { k: 'setoCV', c: 129.5, r: 24.6 },
    { k: 'muroMosaico', v: 0, c: 106, r: 32.4 }, { k: 'muroMosaico', v: 1, c: 111, r: 32.4 }, { k: 'muroMosaico', v: 2, c: 116, r: 32.4 },
    { k: 'muroMosaico', v: 3, c: 135, r: 32.4 }, { k: 'muroMosaico', v: 4, c: 140, r: 32.4 }, { k: 'solMosaico', c: 112, r: 24.8 },
    { k: 'cupido', c: 146.5, r: 23.8 }, { k: 'gradaAnfi', v: 0, c: 136, r: 23.6 }, { k: 'gradaAnfi', v: 1, c: 139.4, r: 23.6 },
    { k: 'flores', v: 0, c: 108, r: 22.6 }, { k: 'flores', v: 1, c: 128, r: 22.6 }, { k: 'flores', v: 2, c: 143, r: 26.6 },
    { k: 'palmeraCV', v: 2, c: 103, r: 25.5 }, { k: 'palmeraCV', v: 0, c: 144, r: 22.6 }, { k: 'bancaCV', c: 126, r: 31.4 },
    // ---- Intihuatana (y Ferrero, Champagnat) ----
    { k: 'intihuatana', c: 182, r: 26.2 }, { k: 'bancaCV', c: 190, r: 31.6 }, { k: 'bancaCV', c: 204, r: 31.6 }, { k: 'ficusCV', c: 196, r: 24.6 },
    { k: 'ficusCV', v: 1, c: 210, r: 26.4 }, { k: 'basureroCV', c: 200, r: 31.6 }, { k: 'cartelMiraflores', c: 200, r: 21.7 },
    // ---- Letonia ----
    { k: 'totemEspejo', c: 232, r: 26.4 }, { k: 'bancaCV', c: 224, r: 31.6 }, { k: 'bancaCV', c: 240, r: 31.6 }, { k: 'ficusCV', c: 218, r: 24.8 },
    { k: 'palmeraCV', v: 1, c: 246, r: 23.4 }, { k: 'cartelMiraflores', c: 245, r: 21.7 },
    // ---- Parque Salazar ----
    { k: 'pergolaOndulada', v: 0, c: 255, r: 31.4 }, { k: 'pergolaOndulada', v: 1, c: 290, r: 31.4 }, { k: 'cabezaCondor', c: 260, r: 24.8 },
    { k: 'chimeneaVidrio', c: 274, r: 25.4 }, { k: 'chimeneaVidrio', c: 280, r: 24.6 }, { k: 'chimeneaVidrio', c: 286, r: 25.4 },
    { k: 'bancaCV', c: 276, r: 31.6 }, { k: 'palmeraCV', v: 2, c: 296, r: 23.4 },
    // ---- Larcomar A (ingreso / Plaza Coral) ----
    { k: 'macetaLarco', c: 255.5, r: 43.6 }, { k: 'macetaLarco', c: 263, r: 43.6 }, { k: 'macetaLarco', c: 282, r: 43.6 }, { k: 'macetaLarco', c: 294, r: 43.6 },
    { k: 'sombrillaTerraza', v: 0, c: 270, r: 42.6 }, { k: 'sombrillaTerraza', v: 1, c: 275, r: 42.6 }, { k: 'mesaSalazar', c: 272.5, r: 42.8 },
    // ---- Larcomar B (Plaza Central) ----
    { k: 'macetaLarco', c: 256, r: 54.6 }, { k: 'macetaLarco', c: 268, r: 54.6 }, { k: 'macetaLarco', c: 280, r: 54.6 }, { k: 'macetaLarco', c: 294, r: 54.6 },
    { k: 'farolRojo', c: 266, r: 49.4 }, { k: 'farolRojo', c: 282, r: 49.4 }, { k: 'mesaSalazar', c: 283, r: 52.2 },
    // ---- Larcomar C (Plaza del Mar / Salazar Food & Drinks) ----
    { k: 'barCentral', c: 272, r: 63.2 }, { k: 'mesaSalazar', c: 266, r: 61.8 }, { k: 'mesaSalazar', c: 266, r: 64.4 }, { k: 'mesaSalazar', c: 278.5, r: 61.8 },
    { k: 'mesaSalazar', c: 278.5, r: 64.4 }, { k: 'sombrillaTerraza', v: 2, c: 291, r: 64.4 }, { k: 'macetaLarco', c: 256, r: 65.6 }, { k: 'macetaLarco', c: 295, r: 65.6 },
    // ---- Larcomar D (arena, CHIFA GRAN DRAGÓN): el centro queda libre para la pelea ----
    { k: 'farolRojo', c: 263, r: 73.4 }, { k: 'farolRojo', c: 289, r: 73.4 }, { k: 'pecera', c: 262.5, r: 74.2 }, { k: 'pecera', c: 288.5, r: 74.2 },
    { k: 'mesaRedonda', c: 262, r: 78.2 }, { k: 'mesaRedonda', c: 290, r: 78.2 }, { k: 'casetaTandem', c: 295, r: 75.6 },
    // ---- Malecón Cisneros / de la Reserva: autos abandonados (se rompen como en la Gambetta) ----
    { k: 'carVar', v: 0, c: 22, r: 14.4 }, { k: 'tico', v: 1, c: 44, r: 16.5 }, { k: 'carVar', v: 1, c: 66, r: 16.4 }, { k: 'combiE', v: 0, c: 112, r: 16.4 },
    { k: 'carVar', v: 2, c: 132, r: 14.4 }, { k: 'ticoW', v: 0, c: 192, r: 14.3 }, { k: 'carVar', v: 0, c: 212, r: 16.4 }, { k: 'custerE', c: 236, r: 14.7 },
    { k: 'carVarW', v: 1, c: 272, r: 14.4, dir: 'W' }, { k: 'tico', v: 0, c: 290, r: 16.5 }
  ];
  (function () {
    // faroles verde oscuro con globo blanco: al borde de la ciclovía y junto al parapeto
    for (var cc = 6; cc <= 296; cc += 12) {
      if (cc >= QB.c0 - 1 && cc <= QB.c1 + 1) continue;
      PROPS.push({ k: 'farolCV', c: cc, r: 21.2 });
      if (!(cc >= 264 && cc <= 270) && cc + 6 <= 296) PROPS.push({ k: 'farolCV', c: cc + 6, r: 32.5 });
    }
    // palmeras en fila (fila 21) cada 18 columnas, lejos de faroles y jirones
    for (cc = 10, i = 0; cc <= 290; cc += 18, i++) {
      if ((cc >= QB.c0 - 2 && cc <= QB.c1 + 2) || (cc >= 80 && cc <= 99) || (cc >= 115 && cc <= 135)) continue;
      PROPS.push({ k: 'palmeraCV', v: i % 3, c: cc + 3, r: 21.9 });
    }
    // macetas de Larcomar al pie de las barandas ya puestas; flores en Salazar
    PROPS.push({ k: 'flores', v: 1, c: 266, r: 22.6 }, { k: 'flores', v: 2, c: 283, r: 22.6 });
  })();
  var CATS = [   // pocos gatos (no es el Kennedy)
    { x: 18 * T, y: 31.2 * T, mode: 'sleep' }, { x: 126 * T, y: 31 * T, mode: 'sit' }, { x: 205 * T, y: 31.2 * T, mode: 'lick' }, { x: 276 * T, y: 31.2 * T, mode: 'sleep' }
  ];
  var DOGS = [];   // los perritos de la Costa Verde los pone juguetes.js (dogZones)
  function birdSpawns() { return [{ x: 60 * T, y: 30 * T, z: 0, pole: false }, { x: 200 * T, y: 29 * T, z: 0, pole: false }, { x: 268 * T, y: 30 * T, z: 0, pole: false }]; }
  var HIDDEN_LOOT = [{ id: 'gaseosa', x: 46.5 * T, y: 21.6 * T, p: 1 }, { id: 'curitas', x: 296 * T, y: 31.6 * T, p: 0.7 }];

  /* ---------------- Puertas de Larcomar (trabajadores) ---------------- */
  var DOORS = {};
  LOTS.forEach(function (f) {
    if (!f.larco || !f.brand) return;
    (DOORS[f.brand] = DOORS[f.brand] || []).push({ x: Math.round((f.c0 + f.c1 + 1) / 2 * T), y: (f.r1 + 1) * T + 10, lot: f.id, terr: f.terr });
  });
  var VENDORS = [];

  /* ---------------- Colisión ---------------- */
  function tileAt(cc, rr) { if (cc < 0 || rr < 0 || cc >= COLS || rr >= ROWS) return null; return grid[rr][cc]; }
  function isSolidTile(cc, rr) { var ch = tileAt(cc, rr); return ch === null || !!SOLID[ch]; }
  var props = [], poles = { N: [], S: [] }, looseDecor = [], dynSolids = [];
  var routeMode = false;
  function circleRect(x, y, rad, x0, y0, x1, y1) {
    var cx = x < x0 ? x0 : (x > x1 ? x1 : x), cy = y < y0 ? y0 : (y > y1 ? y1 : y), dx = x - cx, dy = y - cy;
    return dx * dx + dy * dy < rad * rad;
  }
  function dynSkip(p) { return !p || p.off || (routeMode && (p.chef || p.cvGate || p.jefa)); }
  function collideCircle(x, y, rad) {
    var c0 = Math.floor((x - rad) / T), c1 = Math.floor((x + rad) / T), r0 = Math.floor((y - rad) / T), r1 = Math.floor((y + rad) / T), n, p;
    for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) if (isSolidTile(cc, rr) && circleRect(x, y, rad, cc * T, rr * T, cc * T + T, rr * T + T)) return true;
    for (n = 0; n < props.length; n++) { p = props[n]; if (p.fw > 0 && p.fh > 0 && circleRect(x, y, rad, p.x0, p.y0, p.x1, p.y1)) return true; }
    for (n = 0; n < dynSolids.length; n++) { p = dynSolids[n]; if (!dynSkip(p) && circleRect(x, y, rad, p.x0, p.y0, p.x1, p.y1)) return true; }
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
  // la vista (filas 34+) no tapa la línea de mira: la baranda y el mar son bajos, pero el parapeto sí cuenta como sólido para caminar
  function los(x0, y0, x1, y1) {
    var dx = x1 - x0, dy = y1 - y0, d = Math.sqrt(dx * dx + dy * dy), n = Math.ceil(d / 6);
    for (var k = 1; k < n; k++) {
      var t = k / n, qx = x0 + dx * t, qy = y0 + dy * t, ch = tileAt(Math.floor(qx / T), Math.floor(qy / T));
      if (ch === 'G' || ch === 'V' || ch === 'P') continue;
      if (pointBlocked(qx, qy)) return false;
    }
    return true;
  }
  function moveCircle(ent, dx, dy, rad) {
    var hit = false;
    if (dx !== 0) { if (!collideCircle(ent.x + dx, ent.y, rad)) ent.x += dx; else hit = true; }
    if (dy !== 0) { if (!collideCircle(ent.x, ent.y + dy, rad)) ent.y += dy; else hit = true; }
    return hit;
  }
  // Salida: no hay salida caminando; el final lo dispara ACH.cv.finish() (después de la caída y Chorrillos).
  function inExitZone(x, y) { return false; }
  function inExit(x, y) { if (ACH.world && ACH.world._forceExit) { ACH.world._forceExit = false; return true; } return false; }
  function terraceAt(x, y) {
    var cc = Math.floor(x / T), rr = Math.floor(y / T);
    if (cc < LARCO.c0 - 1 || cc > LARCO.c1 + 1 || rr <= LARCO.r0) return null;
    return terrAtRow(rr);
  }
  function isStairs(x, y) { return tileAt(Math.floor(x / T), Math.floor(y / T)) === 'S'; }
  function tramoAt(x, y) {
    if (y > 33 * T && x >= LARCO.c0 * T) { var t = terraceAt(x, y); return t ? 'larco' + t.id : 'larcomar'; }
    var cc = Math.floor(x / T);
    for (var k = 0; k < TRAMOS.length; k++) if (cc >= TRAMOS[k].c0 && cc <= TRAMOS[k].c1) return TRAMOS[k].id;
    return null;
  }
  function inLarco(x, y) { return y > 33.5 * T && x >= LARCO.c0 * T - 8 && x <= (LARCO.c1 + 1) * T + 8; }
  function respawnOk(ch) { return ch === 's' || ch === 'p'; }
  function progress(p) { var k = (p.x + Math.max(0, p.y - 33 * T) * 3) / (COLS * T + 46 * T * 3); return Math.max(0, Math.min(1, k)); }

  /* ---------------- Props horneados ---------------- */
  function ensureProps() {
    var S = ACH.sprites = ACH.sprites || {}, P = S.props = S.props || {};
    Object.keys(PROV).forEach(function (k) {
      var art = cvProp(k), key = 'cv_' + k;
      if (art) { P[key] = art; return; }
      if (P[key] && (Array.isArray(P[key]) ? P[key].cvProv : P[key].cvProv)) return;
      var d = PROV[k], spr = CV.prov ? CV.prov('cvprop.' + k, d[0], d[1], d[2], d[5], { fw: d[3], fh: d[4] }) : null;
      if (!spr) return;
      if (LAMPS[k]) spr.lamp = LAMPS[k][0];
      if (d[6]) spr.tall = true;
      spr.placeholder = true; spr.cvProv = true;
      P[key] = spr;
    });
  }
  function footFor(k, spr) {
    var F = FOOTFIX[k];
    if (F) return { fw: F.fw, fh: F.fh, tall: spr.tall !== undefined ? (!!spr.tall || !!F.tall) : !!F.tall, tree: !!F.tree };
    return { fw: typeof spr.fw === 'number' ? spr.fw : 0, fh: typeof spr.fh === 'number' ? spr.fh : 0, tall: !!spr.tall, tree: false };
  }
  var VEH = { carVar: 1, carVarW: 1, tico: 1, ticoW: 1, combiE: 1, custerE: 1 };
  var VFOOT = { carVar: [62, 17], carVarW: [62, 17], tico: [50, 15], ticoW: [50, 15], combiE: [74, 18], custerE: [106, 21] };
  var buildMs = 0;
  function buildProps() {
    var t0 = (window.performance || Date).now();
    ensureTiles(); ensureProps(); ensureLotArchs(); ensureBreakables();
    buildOver();
    props.length = 0; poles.N.length = 0; poles.S.length = 0; looseDecor.length = 0;
    for (var d = decals.length - 1; d >= 0; d--) if (decals[d].auto) decals.splice(d, 1);
    var shadeN = 0;
    for (var n = 0; n < PROPS.length; n++) {
      var p = PROPS[n], veh = !!VEH[p.k], k = veh ? p.k : 'cv_' + p.k, v = p.v || 0;
      var spr = ACH.gfx.prop(k, v, p.dir, veh && /^carVar/.test(p.k) ? 'car' : null);
      var x = Math.round(p.c * T), y = Math.round(p.r * T);
      var f = veh ? { fw: (spr.placeholder || spr.width < 30) ? VFOOT[p.k][0] : (typeof spr.fw === 'number' ? spr.fw : VFOOT[p.k][0]), fh: typeof spr.fh === 'number' ? spr.fh : VFOOT[p.k][1], tall: !!spr.tall, tree: false } : footFor(p.k, spr);
      var bp = { k: k, v: v, dir: p.dir || (/W$/.test(k) ? 'W' : 'E'), x: x, y: y, fw: f.fw, fh: f.fh, tall: f.tall, tree: f.tree,
        x0: x - f.fw / 2, x1: x + f.fw / 2, y0: y - f.fh, y1: y, cob: false, fade: 1, fb: null, lift: 0, sortDy: 0, cv: true };
      if (spr.top) bp.top = { x: x + spr.top.x, y: y + spr.top.y };
      props.push(bp);
      if (bp.tree && (shadeN++ % 3 === 0)) decals.push({ k: 'sombraArbol', v: shadeN % 2, x: x + 10, y: y + 14, rot: 0, auto: 1 });
    }
    buildMs = Math.round((window.performance || Date).now() - t0);
  }
  function ensureBreakables() {
    var I = ACH.inter; if (!I || !I.KINDS) return;
    for (var k in BREAK) if (!I.KINDS[k]) I.KINDS[k] = BREAK[k];
    if (!ensureBreakables.hooked) {
      ensureBreakables.hooked = true;
      (ACH.propHooks = Array.isArray(ACH.propHooks) ? ACH.propHooks : []).push(function (G, pr, info) {
        if (!pr || !pr.cv || !info || !info.broke || !BREAK[pr.k] || pr._cvLoot) return false;
        pr._cvLoot = true;
        var items = [{ id: 'sencillo', n: 1 + Math.floor(Math.random() * 3) }], defs = ACH.inv && ACH.inv.defs;
        var foods = ['wantan', 'chicha', 'gaseosa', 'agua'].filter(function (id) { return defs && defs[id]; });
        if (foods.length && Math.random() < 0.45) items.push({ id: foods[Math.floor(Math.random() * foods.length)], n: 1 });
        try { if (ACH.inv && ACH.inv.drop) ACH.inv.drop(pr.x, pr.y + 4, items, true); } catch (e) { /* nada */ }
        return false;
      });
    }
  }

  /* ---------------- Arquetipos de lote ---------------- */
  // Fachada de Larcomar: pared de roca (paredRoca) + fachada(brand, wTiles) de C2b pegada al piso. Sin el arte: bloque con la marca.
  function fachadaLot(f) {
    var w = (f.c1 - f.c0 + 1) * T, h = (f.r1 - f.r0 + 1) * T, cv = mkc(w, h), g = cv.getContext('2d'), lights = [];
    g.imageSmoothingEnabled = false;
    var rock = ACH.sprites.tiles && ACH.sprites.tiles.cv_paredRoca;
    for (var yy = 0; yy < h; yy += T) for (var xx = 0; xx < w; xx += T) { var tl = Array.isArray(rock) ? rock[hashT(f.c0 + xx, yy) % rock.length] : null; if (tl) g.drawImage(tl, xx, yy); }
    var L = SCV().larco, res = null;
    if (L && typeof L.fachada === 'function') { try { res = L.fachada(f.brand, f.c1 - f.c0 + 1); } catch (e) { res = null; } }
    if (res && isCv(res.cv)) {
      var ax = typeof res.ax === 'number' ? res.ax : res.cv.width / 2, ay = typeof res.ay === 'number' ? res.ay : res.cv.height;
      var dx = Math.round(w / 2 - ax), dy = Math.round(h - ay);
      g.drawImage(res.cv, dx, dy);
      (res.lights || []).forEach(function (q) { lights.push({ x: q.x + dx, y: q.y + dy, w: q.w, h: q.h, kind: q.kind || 'local', col: q.col }); });
    } else {
      var C = CV.brandColors ? CV.brandColors(f.brand) : { bg: '#555', fg: '#fff' }, gh = Math.min(h, 52);
      g.fillStyle = '#1c1a22'; g.fillRect(1, h - gh, w - 2, gh);
      g.fillStyle = '#cfe4ec'; g.fillRect(3, h - gh + 14, w - 6, gh - 16);                          // vitrina
      g.fillStyle = 'rgba(40,60,80,.35)'; for (var q = 6; q < w - 6; q += 12) g.fillRect(q, h - gh + 14, 1, gh - 16);
      g.fillStyle = '#3a3036'; g.fillRect(Math.floor(w / 2) - 6, h - 20, 12, 20);                     // puerta
      g.fillStyle = C.bg; g.fillRect(2, h - gh + 2, w - 4, 11);
      if (CV.label) CV.label(g, brandName(f.brand), w, 11, C.fg, h - gh + 4);
      lights.push({ x: Math.floor(w / 2), y: h - gh + 26, w: w - 8, h: gh - 20, kind: 'local' });
    }
    return { canvas: cv, over: null, overX: 0, overY: 0, lights: lights, face: f.r1 - f.r0 + 1 };
  }
  var PROV_COLS = { teal: ['#2f7f86', '#e0b04a'], beige: ['#cdbb98', '#8a7a5a'], blanco: ['#e8e4da', '#9a968c'], rosado: ['#e0a8a0', '#8a5a50'], crema: ['#efe6cf', '#9a8a6a'] };
  function provLandLot(f) {
    var res = ACH.px && ACH.px.placeholderLot ? ACH.px.placeholderLot(f) : null; if (!res || !res.canvas) return res;
    var g = res.canvas.getContext('2d'), w = res.canvas.width, h = res.canvas.height, C = PROV_COLS[f.color] || PROV_COLS.beige;
    var top = Math.max(0, h - (f.face || 7) * T);
    if (f.arch === 'cv_torre' || f.marriott) {   // vidrio teal con franjas doradas
      g.fillStyle = '#1c1a22'; g.fillRect(2, top, w - 4, h - top);
      g.fillStyle = C[0]; g.fillRect(3, top + 1, w - 6, h - top - 2);
      g.fillStyle = C[1]; for (var yy = top + 10; yy < h - 4; yy += 14) g.fillRect(3, yy, w - 6, 2);
      g.fillStyle = 'rgba(255,255,255,.18)'; for (var xx = 8; xx < w - 6; xx += 10) g.fillRect(xx, top + 2, 2, h - top - 6);
    } else if (f.arch === 'cv_casona') {
      g.fillStyle = '#1c1a22'; g.fillRect(2, top, w - 4, h - top); g.fillStyle = C[0]; g.fillRect(3, top + 1, w - 6, h - top - 2);
      g.fillStyle = '#6a4a2a'; for (var x2 = 8; x2 < w - 8; x2 += 14) g.fillRect(x2, h - 26, 7, 12);
      g.fillStyle = '#b8443a'; g.fillRect(2, top, w - 4, 4);
    }
    if (f.name && CV.label) { g.fillStyle = '#1c1a22'; g.fillRect(4, top + 3, w - 8, 10); CV.label(g, f.name, w, 10, '#f0c030', top + 4); }
    res.lights = res.lights || [];
    return res;
  }
  function ensureLotArchs() {
    var S = ACH.sprites, LA = S && S.lotArch; if (!LA) return;
    ['cv_torre', 'cv_casona', 'cv_hotel'].forEach(function (a) { if (typeof LA[a] !== 'function') { LA[a] = provLandLot; LA[a].prov = true; } });
    LA.cv_fachada = fachadaLot;   // propio del motor de Costa Verde (usa fachada() de C2b adentro)
  }

  /* ---------------- Horneado extra del suelo: quebrada, parapeto, barandas, letrero LARCOMAR, escaleras mecánicas ---------------- */
  function spriteOf(k, v) { var o = cvProp(k); if (Array.isArray(o)) o = o[(v || 0) % o.length]; return isCv(o) ? o : null; }
  function bakeExtra(g) {
    var x, y, k, s;
    // 1. la Bajada Balta con el Club Tennis Las Terrazas
    // C2a: draw(ctx, camX, camY, t, anchoVista) en coordenadas de PANTALLA y con un alto de pantalla fijo de 270 adentro; para hornearlo al
    // suelo se traslada el lienzo a su esquina (x0, y0) y se le pasa cam = (x0, y0), así su calcomanía cae en (0, 0) y pasa sus recortes.
    // Abajo de la fila 18 queda el respaldo provisorio (el arte cubre las filas 19-45; lo de la fila 34 para abajo se pinta por cuadro, sobre la vista).
    var QA = SCV().malecon && SCV().malecon.quebradaBalta;
    provQuebrada(g);
    if (QA && typeof QA.draw === 'function') {
      g.save(); g.beginPath(); g.rect(QUEBRADA.x0, QUEBRADA.y0, QUEBRADA.x1 - QUEBRADA.x0, QUEBRADA.y1 - QUEBRADA.y0); g.clip();
      var qx = typeof QA.x0 === 'number' ? QA.x0 : QB.c0 * T, qy = typeof QA.y0 === 'number' ? QA.y0 : 19 * T;
      g.translate(qx, qy);
      try { QA.draw(g, qx, qy, 0, Math.max(480, QA.w || 0)); } catch (e) { console.warn('[ACHORADO cv] quebradaBalta.draw', e); }
      g.restore();
    }
    // los puentes encima de la quebrada (el arte de la quebrada puede pintar debajo)
    BRIDGES.forEach(function (b) {
      for (var rr = b.r0; rr <= b.r1; rr++) for (var cc = QB.c0; cc <= QB.c1; cc++) {
        var ch = grid[rr][cc], tl = ch === 'K' ? ACH.gfx.tile('cv_puente', hashT(cc, rr)) : (ch === 'n' ? ACH.gfx.tile('curbN', 0) : ch === 'u' ? ACH.gfx.tile('curbS', 0) : ACH.gfx.tile('asphalt', hashT(cc, rr) % 5));
        g.drawImage(tl, cc * T, rr * T);
      }
      var bs = spriteOf('barandaPuente');
      for (x = QB.c0 * T; x < (QB.c1 + 1) * T; x += bs ? bs.width : 16) {
        if (bs) { g.drawImage(bs, x, b.r0 * T - bs.height + 4); g.drawImage(bs, x, (b.r1 + 1) * T - bs.height + 2); }
        else { g.fillStyle = '#1c1a22'; g.fillRect(x, b.r0 * T - 6, 16, 2); g.fillRect(x, (b.r1 + 1) * T - 4, 16, 2); g.fillStyle = '#d8d4c8'; g.fillRect(x, b.r0 * T - 8, 16, 2); g.fillRect(x, (b.r1 + 1) * T - 6, 16, 2); g.fillRect(x + 7, b.r0 * T - 8, 2, 8); }
      }
    });
    // 2. el parapeto de ladrillo con pilastras (fila 33), menos la bajada a Larcomar
    var pp = spriteOf('parapeto'), pil = spriteOf('parapetoPilastra');
    for (var cc = 0; cc < COLS; cc++) {
      if (grid[33][cc] !== 'P') continue;
      x = cc * T; y = 34 * T;
      var spr = (cc % 6 === 0 && pil) ? pil : pp;
      if (spr) { var ax = typeof spr.ax === 'number' ? spr.ax : spr.width / 2, ay = typeof spr.ay === 'number' ? spr.ay : spr.height; g.drawImage(spr, Math.round(x + 8 - ax), Math.round(y - ay)); }
      else {
        g.fillStyle = '#4e2226'; g.fillRect(x, y - 14, 16, 14);
        g.fillStyle = '#9c4636'; g.fillRect(x, y - 13, 16, 12);
        g.fillStyle = '#7a3330'; g.fillRect(x, y - 9, 16, 1); g.fillRect(x, y - 5, 16, 1); g.fillRect(x + (cc % 2) * 8, y - 13, 1, 4); g.fillRect(x + 4 + (cc % 2) * 8, y - 9, 1, 4);
        g.fillStyle = '#cf7a58'; g.fillRect(x, y - 14, 16, 2);
        if (cc % 6 === 0) { g.fillStyle = '#1c1a22'; g.fillRect(x, y - 18, 7, 18); g.fillStyle = '#b85c44'; g.fillRect(x + 1, y - 17, 5, 16); g.fillStyle = '#e8d0b0'; g.fillRect(x, y - 19, 7, 2); }
      }
    }
    // 3. barandas de vidrio de las terrazas (y la de la punta de la arena)
    var bv = spriteOf('barandaVidrio');
    TERR.forEach(function (t) {
      for (var c2 = LARCO.c0; c2 <= LARCO.c1; c2++) {
        if (grid[t.rail][c2] !== 'G') continue;
        x = c2 * T; y = (t.rail + 1) * T;
        if (bv) g.drawImage(bv, Math.round(x + 8 - (typeof bv.ax === 'number' ? bv.ax : 8)), Math.round(y - (typeof bv.ay === 'number' ? bv.ay : bv.height)));
        else { g.fillStyle = 'rgba(170,220,235,.55)'; g.fillRect(x, y - 14, 16, 12); g.fillStyle = '#1c1a22'; g.fillRect(x, y - 15, 16, 1); g.fillRect(x, y - 2, 16, 2); g.fillStyle = '#e8f4f8'; g.fillRect(x, y - 14, 16, 1); if (c2 % 3 === 0) { g.fillStyle = '#5a6a70'; g.fillRect(x, y - 15, 2, 14); } }
      }
      // los bordes laterales de la terraza: roca
    });
    // 4. letrero LARCOMAR en la pared del nivel A (hueco sin tienda)
    var tA = TERR[0], lx = LETRERO.c0 * T, lw = (LETRERO.c1 - LETRERO.c0 + 1) * T, ly = tA.wall[0] * T, lh = (tA.wall[1] - tA.wall[0] + 1) * T;
    var ll = spriteOf('letreroLarcomar');
    if (ll) {   // el letrero de C2b (184 px) no entra en el hueco de 6 tiles: se achica a la mitad (horneado una vez, vecino más cercano)
      var kk = Math.min(1, (lw - 4) / ll.width) >= 1 ? 1 : 0.5, dw = Math.round(ll.width * kk), dh = Math.round(ll.height * kk);
      g.imageSmoothingEnabled = false;
      g.drawImage(ll, 0, 0, ll.width, ll.height, Math.round(lx + lw / 2 - dw / 2), Math.round(ly + lh - 10 - dh), dw, dh);
    }
    else { g.fillStyle = '#1c1a22'; g.fillRect(lx + 4, ly + 18, lw - 8, 16); g.fillStyle = '#f3efe2'; g.fillRect(lx + 5, ly + 19, lw - 10, 14); if (CV.label) { var tc = mkc(lw - 10, 14); CV.label(tc.getContext('2d'), 'LARCOMAR', lw - 10, 14, '#1c1a22', 4); g.drawImage(tc, lx + 5, ly + 19); } }
    // 5. escaleras mecánicas de adorno (rotas, quietas) al lado de cada escalera de Larcomar
    var em = spriteOf('escaleraMecanica');
    STAIRS_T.forEach(function (st) {
      if (st.id === 'ingreso') return;
      var ex = (st.c1 + 1) * T, ey = (st.r1 + 1) * T;
      if (grid[st.r1][st.c1 + 1] !== 'R' && grid[st.r1][st.c1 + 1] !== 'L' && grid[st.r1][st.c1 + 1] !== 'G') return;
      if (em) g.drawImage(em, ex, ey - em.height);
      else { g.fillStyle = '#1c1a22'; g.fillRect(ex, ey - (st.r1 - st.r0 + 1) * T, 10, (st.r1 - st.r0 + 1) * T); g.fillStyle = '#8a8a90'; g.fillRect(ex + 1, ey - (st.r1 - st.r0 + 1) * T + 1, 8, (st.r1 - st.r0 + 1) * T - 2); g.fillStyle = '#5a5a60'; for (y = ey - (st.r1 - st.r0 + 1) * T + 3; y < ey; y += 3) g.fillRect(ex + 2, y, 6, 1); }
    });
    // 6. respaldo estático de la vista (si el gancho por cuadro fallara, al menos se lee mar)
  }
  function provQuebrada(g) {
    var x0 = QUEBRADA.x0, x1 = QUEBRADA.x1, y1 = QUEBRADA.y1, w = x1 - x0;
    g.fillStyle = '#5f7f45'; g.fillRect(x0, 0, w, y1);
    g.fillStyle = '#4c6a38'; for (var y = 0; y < y1; y += 6) for (var x = x0 + ((y / 6) % 2) * 5; x < x1; x += 11) g.fillRect(x, y, 3, 2);
    // la calzada adoquinada de la Bajada Balta, al fondo, y el Club Tennis Las Terrazas (canchas de arcilla, muros turquesa)
    g.fillStyle = '#8a8478'; g.fillRect(x0 + w / 2 - 14, 0, 28, y1);
    g.fillStyle = '#76706a'; for (y = 2; y < y1; y += 5) g.fillRect(x0 + w / 2 - 14, y, 28, 1);
    [[1.5, 2, 7, 5], [14, 2, 7, 5], [1.5, 19, 7, 4.5], [14, 19, 7, 4.5]].forEach(function (q) {   // [col desde el borde, fila, ancho, alto] en tiles
      var cx = x0 + q[0] * T, cy = q[1] * T, cw = q[2] * T, ch = q[3] * T;
      g.fillStyle = '#2fb8a8'; g.fillRect(cx - 2, cy - 2, cw + 4, ch + 4);
      g.fillStyle = '#c8683a'; g.fillRect(cx, cy, cw, ch);
      g.fillStyle = '#f3efe2'; g.fillRect(cx, cy, cw, 1); g.fillRect(cx, cy + ch - 1, cw, 1); g.fillRect(cx, cy, 1, ch); g.fillRect(cx + cw - 1, cy, 1, ch); g.fillRect(cx + cw / 2, cy, 1, ch);
      g.fillStyle = '#1c1a22'; g.fillRect(cx + cw / 2 - 1, cy + 2, 2, ch - 4);
    });
    if (CV.label) { var tc = mkc(120, 9); CV.label(tc.getContext('2d'), 'CLUB TENNIS LAS TERRAZAS', 120, 9, '#f3efe2', 1); g.drawImage(tc, x0 + 18, 8.6 * T); }
  }

  /* ---------------- La vista al mar (por cuadro, en drawHooks.ground) ---------------- */
  var vistaCv = null, VW = 1440;
  function buildVistaProv() {
    var h = (ROWS - 34) * T, c = mkc(VW, h), g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    if (ACH.lienzo && ACH.lienzo.noSnap) { try { ACH.lienzo.noSnap(c); } catch (e) { /* nada */ } }
    var cliff = 92, road = 26, beach = 18, y;
    // acantilado de tierra clara con malla verde y vegetación colgante
    g.fillStyle = '#b8a888'; g.fillRect(0, 0, VW, cliff);
    for (y = 0; y < cliff; y += 4) { g.fillStyle = y % 8 ? '#ac9c7c' : '#c2b294'; for (var x = (y * 7) % 13; x < VW; x += 13) g.fillRect(x, y, 6, 1); }
    g.fillStyle = 'rgba(60,110,60,.55)'; for (x = 0; x < VW; x += 8) g.fillRect(x, 0, 1, cliff); for (y = 4; y < cliff; y += 8) g.fillRect(0, y, VW, 1);
    g.fillStyle = '#4f7a3a'; for (x = 0; x < VW; x += 23) { var hh = 8 + (x * 37) % 22; g.fillRect(x, 0, 9, hh); g.fillRect(x + 3, hh, 3, 6); }
    // Circuito de Playas (con autos quietos)
    g.fillStyle = '#5a5a5e'; g.fillRect(0, cliff, VW, road);
    g.fillStyle = '#d8d2b8'; for (x = 0; x < VW; x += 24) g.fillRect(x, cliff + 12, 12, 2);
    var CAR = ['#c8402c', '#e8e4da', '#2a6ab8', '#3a3a40', '#e8b830'];
    for (x = 40; x < VW; x += 170) { var cc2 = CAR[(x / 170 | 0) % 5]; g.fillStyle = '#1c1a22'; g.fillRect(x - 1, cliff + 3, 28, 9); g.fillStyle = cc2; g.fillRect(x, cliff + 4, 26, 7); g.fillStyle = '#9fc4d0'; g.fillRect(x + 6, cliff + 5, 12, 3); }
    // playa de canto rodado
    g.fillStyle = '#8a8478'; g.fillRect(0, cliff + road, VW, beach);
    for (y = cliff + road; y < cliff + road + beach; y += 3) for (x = (y * 5) % 7; x < VW; x += 7) { g.fillStyle = (x + y) % 3 ? '#a09a8c' : '#6e6a60'; g.fillRect(x, y, 3, 2); }
    // mar gris verdoso con olas (bandas horneadas)
    var y0 = cliff + road + beach, MAR = ['#7a9a90', '#6a8c84', '#5f8078', '#56766f', '#4e6e68', '#48665f'];
    for (y = y0; y < h; y++) { var k = Math.min(MAR.length - 1, Math.floor((y - y0) / ((h - y0) / MAR.length))); g.fillStyle = MAR[k]; g.fillRect(0, y, VW, 1); }
    g.fillStyle = '#e8f0ec'; for (var w = 0; w < 4; w++) { var wy = y0 + 3 + w * 9; for (x = (w * 31) % 40; x < VW; x += 40 + w * 6) g.fillRect(x, wy, 14 - w * 2, 1); }
    g.fillStyle = 'rgba(232,240,236,.35)'; for (y = y0 + 44; y < h; y += 17) for (x = (y * 11) % 60; x < VW; x += 60) g.fillRect(x, y, 10, 1);
    // el muelle de la Rosa Náutica, de lejos y sin nombre
    g.fillStyle = '#1c1a22'; g.fillRect(900, y0 - 2, 6, 70); g.fillRect(880, y0 + 64, 48, 16); g.fillStyle = '#e8e4da'; g.fillRect(882, y0 + 66, 44, 12); g.fillStyle = '#c8402c'; g.fillRect(880, y0 + 62, 48, 4);
    vistaCv = c;
  }
  function drawVista(ctx, G, cx, cy) {
    var Vw = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }, top = VISTA.y0 - cy;
    if (top >= Vw.h) return;
    var hole = VISTA.holes[0], hx0 = hole.x0 - cx, hx1 = hole.x1 - cx, hy1 = hole.y1 - cy;
    ctx.save();
    ctx.beginPath();
    var ty = Math.max(0, top);
    if (hx0 > 0) ctx.rect(0, ty, Math.min(Vw.w, hx0), Vw.h - ty);
    if (hx1 < Vw.w) ctx.rect(Math.max(0, hx1), ty, Vw.w - Math.max(0, hx1), Vw.h - ty);
    if (hy1 < Vw.h) ctx.rect(Math.max(0, hx0), Math.max(ty, hy1), Math.min(Vw.w, hx1) - Math.max(0, hx0), Vw.h - Math.max(ty, hy1));
    ctx.clip();
    var A = SCV().malecon && SCV().malecon.vista, ok = false;
    if (A && typeof A.draw === 'function' && !drawVista.bad) {
      // C2a: draw(ctx, camX, camY, t, anchoVista) con un alto de pantalla fijo de 270 adentro: si la vista es más alta, una segunda pasada corrida
      try {
        A.draw(ctx, cx, cy, G.clock || 0, Vw.w);
        var extra = Vw.h - 270;
        if (extra > 0) { ctx.save(); ctx.translate(0, extra); A.draw(ctx, cx, cy + extra, G.clock || 0, Vw.w); ctx.restore(); }
        ok = true;
      } catch (e) { drawVista.bad = true; console.warn('[ACHORADO cv] vista.draw', e); }
      // la boca de la quebrada (filas 34-45) va encima de la vista, con sus tenistas
      var QA = SCV().malecon && SCV().malecon.quebradaBalta;
      if (ok && QA && typeof QA.draw === 'function' && !drawVista.qbad) {
        var qy0 = VISTA.y0 - cy, qx0 = (typeof QA.x0 === 'number' ? QA.x0 : QB.c0 * T) - cx, qw = QA.w || (QB.c1 - QB.c0 + 1) * T;
        if (qx0 < Vw.w && qx0 + qw > 0 && qy0 < Vw.h) {
          ctx.save(); ctx.beginPath(); ctx.rect(qx0, Math.max(0, qy0), qw, Vw.h); ctx.clip();
          try { QA.draw(ctx, cx, cy, G.clock || 0, Vw.w); if (extra > 0) { ctx.translate(0, extra); QA.draw(ctx, cx, cy + extra, G.clock || 0, Vw.w); } } catch (e) { drawVista.qbad = true; }
          ctx.restore();
        }
      }
    }
    if (!ok) {
      if (!vistaCv) buildVistaProv();
      var sx = ((cx * VISTA.parallax) % VW + VW) % VW, dy = Math.round(top);
      var w1 = Math.min(Vw.w, VW - sx);
      ctx.drawImage(vistaCv, Math.floor(sx), 0, Math.ceil(w1), vistaCv.height, 0, dy, Math.ceil(w1), vistaCv.height);
      if (w1 < Vw.w) ctx.drawImage(vistaCv, 0, 0, Math.ceil(Vw.w - w1), vistaCv.height, Math.floor(w1), dy, Math.ceil(Vw.w - w1), vistaCv.height);
    }
    // v0.14.1 (capa B): brillo/reflejo animado del mar, dentro del mismo recorte (no pisa Larcomar). Mar desde y = 296 de la vista (136 en el respaldo)
    if (ACH.volumen && ACH.volumen.seaGlints) { try { ACH.volumen.seaGlints(ctx, G, cx, cy, Math.max(0, VISTA.y0 + (ok ? 296 : 136) - cy), Vw.w, Vw.h); } catch (eg) { /* nada */ } }
    ctx.restore();
  }
  ACH.drawHooks = ACH.drawHooks || { ground: [], ysort: [], air: [], screen: [] };
  ['ground', 'ysort', 'air', 'screen'].forEach(function (kk) { if (!Array.isArray(ACH.drawHooks[kk])) ACH.drawHooks[kk] = []; });
  ACH.drawHooks.ground.unshift(function (ctx, G, cx, cy) { if (ACH.world && ACH.world.id === 'costaverde') drawVista(ctx, G, cx, cy); });
  if (ACH.lienzo && typeof ACH.lienzo.onRebake === 'function') { try { ACH.lienzo.onRebake(function () { vistaCv = null; }); } catch (e) { /* nada */ } }

  /* ---------------- Debug: ruta y spawns ---------------- */
  // BFS en celdas de 4 px del faro a la arena (centro del nivel D), con el chef muerto y la reja abierta.
  function routeCheck(Rarg, from, to) {
    routeMode = true;
    try {
      var S = 4, gw = Math.ceil(COLS * T / S), gh = Math.ceil(ROWS * T / S), R = Rarg || (ACH.ent && ACH.ent.CFG.radius) || 5;
      var a = from || START_HOME, b = to || PLACES.arena;
      var prev = new Int32Array(gw * gh).fill(-1), q = new Int32Array(gw * gh), free = new Int8Array(gw * gh), seen = new Uint8Array(gw * gh);
      var ok = function (ix, iy) { var id = iy * gw + ix, v = free[id]; if (v) return v === 1; var bl = collideCircle(ix * S + S / 2, iy * S + S / 2, R); free[id] = bl ? 2 : 1; return !bl; };
      var sx = Math.floor(a.x / S), sy = Math.floor(a.y / S), gx = Math.floor(b.x / S), gy = Math.floor(b.y / S), head = 0, tail = 0, goal = -1;
      if (!ok(sx, sy)) return { ok: false, steps: 0, why: 'inicio bloqueado' };
      seen[sy * gw + sx] = 1; q[tail++] = sy * gw + sx;
      var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      while (head < tail) {
        var id = q[head++], ix = id % gw, iy = (id - ix) / gw;
        if (Math.abs(ix - gx) <= 2 && Math.abs(iy - gy) <= 2) { goal = id; break; }
        for (var k = 0; k < 4; k++) {
          var nx = ix + nb[k][0], ny = iy + nb[k][1];
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          var nid = ny * gw + nx;
          if (seen[nid] || !ok(nx, ny)) continue;
          seen[nid] = 1; prev[nid] = id; q[tail++] = nid;
        }
      }
      if (goal < 0) return { ok: false, steps: 0, explored: tail, chefMuerto: true };
      var steps = 0, via = {}, cur;
      for (cur = goal; prev[cur] >= 0; cur = prev[cur]) { steps++; var cx2 = (cur % gw) * S, cy2 = Math.floor(cur / gw) * S, tr = tramoAt(cx2, cy2); if (tr) via[tr] = 1; }
      var order = TRAMOS.map(function (t) { return t.id; }).concat(['larcoA', 'larcoB', 'larcoC', 'larcoD']).filter(function (t) { return via[t]; });
      return { ok: true, steps: steps, px: steps * S, chefMuerto: true, rejaAbierta: true, pasaPor: order };
    } finally { routeMode = false; }
  }
  function spawnCheck() {
    var out = [], ZR = (ACH.ent && ACH.ent.CFG.zRadius) || 5;
    function chk(what, x, y, rad) { if (collideCircle(x, y, rad)) out.push({ what: what, x: Math.round(x), y: Math.round(y) }); }
    chk('inicio', START_HOME.x, START_HOME.y, 5);
    CHECKPOINTS.forEach(function (c) { chk('punto de control ' + c.id, c.x, c.y, 5); });
    for (var pl in PLACES) chk('lugar ' + pl, PLACES[pl].x, PLACES[pl].y, 5);
    for (var b in DOORS) DOORS[b].forEach(function (d, n) { chk('puerta ' + b + '#' + n, d.x, d.y, ZR); });
    for (var vs in VENDOR_SPOTS) chk('vendedor ' + vs, VENDOR_SPOTS[vs].x, VENDOR_SPOTS[vs].y, 5);
    BALL_SPOTS.forEach(function (s, n) { chk('pelota#' + n, s.x, s.y, 4); });
    HELADERO_PATH.forEach(function (pl2, n) { pl2.forEach(function (pt, j) { chk('heladero#' + n + '.' + j, pt[0], pt[1], 6); }); });
    DOG_ZONES.forEach(function (z) { chk('perros ' + z.id, (z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2, 4); });
    (CV.zSpawns ? CV.zSpawns() : []).forEach(function (s, n) { chk('zombie ' + s.type + '#' + n, s.x, s.y, ZR); });
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
    var b = decals.filter(function (d) { return d.k === 'sangre'; });
    return { total: b.length, maxPerScreen: Math.min(1, b.length) };
  }

  var spawns = [];   // sin caminantes de la grilla: los zombies los pone zombis.js
  ACH.world = {
    T: T, COLS: COLS, ROWS: ROWS, W: COLS * T, H: ROWS * T, ROW: ROW, JIRONES: JIRONES, PASAJES: PASAJES,
    MAP: MAP, grid: grid, lotAt: lotAt, LOTS: LOTS, FOOT: {}, spawns: spawns, props: props,
    start: START, lights: [],
    over: over, decals: decals, decor: decor, poles: poles, dogSpawns: DOGS, birdSpawns: birdSpawns,
    tileAt: tileAt, isSolidTile: isSolidTile, buildProps: buildProps,
    collideCircle: collideCircle, moveCircle: moveCircle, los: los, inExit: inExit,
    routeCheck: routeCheck, spawnCheck: spawnCheck, SOCIAL: null, lotsBaked: [], cables: [], effFace: effFace,
    bloodPerScreen: bloodPerScreen, propAt: propAt, catSpawns: CATS, FOOD_CARTS: {}, foodCarts: [], hiddenLoot: HIDDEN_LOOT, looseDecor: looseDecor,
    // claves de Miraflores (misma forma)
    level: 'costaverde', D: function () { return 33; }, water: [], inWater: function () { return null; }, dynSolids: dynSolids, places: PLACES, doors: DOORS,
    vendors: VENDORS, checkpoint: CHECKPOINTS[1], startHome: START_HOME, pizza: null, inExitZone: inExitZone, rotonda: null, mercado: null,
    buildMs: function () { return buildMs; },
    cfgNoche: { atTime: 420, triggerX: null, kicker: 'MALECÓN DE MIRAFLORES · 7:00 P.M.' },
    // claves nuevas de la Costa Verde (§2)
    id: 'costaverde', terr: TERR, stairs: STAIRS, checkpoints: CHECKPOINTS, heladeroPath: HELADERO_PATH, dogZones: DOG_ZONES, vista: VISTA,
    quebrada: QUEBRADA, larco: LARCO, tramos: TRAMOS, vendorSpots: VENDOR_SPOTS, goals: GOALS, ballSpots: BALL_SPOTS, shops: SHOPS,
    tramoAt: tramoAt, terraceAt: terraceAt, isStairs: isStairs, inLarco: inLarco, respawnOk: respawnOk, progress: progress,
    bakeExtra: bakeExtra, camUp: 0, rooms: ROOMS, roomAt: roomAt
  };

  /* ---------------- Sistema: puntos de control, reja del chifa, cámara por terraza, escaleras ---------------- */
  var CPN = { amor: 1, salazar: 2, arena: 3, borde: 4 };
  function cpUpgrade(G, id) {
    var i = CPN[id]; if (!(i > (G.cvCp | 0))) return;
    G.cvCp = i; START.x = CHECKPOINTS[i].x; START.y = CHECKPOINTS[i].y;
    CV.toast && CV.toast('Punto de control: ' + CHECKPOINTS[i].label);
    CV.sfx && CV.sfx('checkpoint', { x: G.player.x, y: G.player.y });
  }
  var gateDs = { x0: 258 * T, y0: 66 * T, x1: 261 * T, y1: 67 * T, cvGate: true, off: false };
  dynSolids.push(gateDs);
  var gate = {
    rect: gateDs, x: 259.5 * T, y: 66 * T,
    isOpen: function () { return !!gateDs.off; },
    open: function (silent) { if (gateDs.off) return; gateDs.off = true; if (!silent) { CV.sfx && CV.sfx('cv.reja', { x: gate.x, y: gate.y }); CV.toast && CV.toast('¡Se abrió la reja del chifa! Huele a chaufa...'); } },
    close: function () { gateDs.off = false; CV.sfx && CV.sfx('cv.reja', { x: gate.x, y: gate.y, close: true }); },
    hold: false   // true = no se abre sola al acercarse (por si el chef quiere manejarla)
  };
  CV.gate = gate;
  function gateSpr() { var o = cvProp('rejaChifa'); if (Array.isArray(o)) o = o[0]; return isCv(o) ? o : null; }
  var gateProv = null;
  // v0.13 (E5): la cámara sube ~40 px en los parques (se ve venir a los zombis desde el norte) y, cerca del faro y de El Beso, lo justo para que
  // salgan enteros (la cima de cada uno se lee de sus props: rx0/rx1/ry0; si no están, valen las medidas del arte actual).
  var NORTH_PEEK = 40, LM_FALLOFF = 200, LM_MARGIN = 8, LM_PYMAX = 205;
  var LMS = null;
  function landmarks() {
    if (LMS && LMS.real) return LMS;
    var L = [{ k: 'cv_faro', x0: 160, x1: 255, top: 226 }, { k: 'cv_beso', x0: 1884, x1: 2151, top: 292 }], P = props || [], real = 0;
    for (var i = 0; i < P.length; i++) for (var j = 0; j < L.length; j++) if (P[i] && P[i].k === L[j].k && typeof P[i].ry0 === 'number') { L[j].x0 = P[i].rx0; L[j].x1 = P[i].rx1; L[j].top = P[i].ry0; real++; }
    L.real = real >= 2; LMS = L; return L;
  }
  function landmarkLift(p, want) {
    var L = landmarks(), best = 0;
    for (var i = 0; i < L.length; i++) {
      var dx = Math.max(0, L[i].x0 - p.x, p.x - L[i].x1), k = Math.min(1, dx / LM_FALLOFF), w = 1 - k * k * (3 - 2 * k);
      var need = want - Math.max(L[i].top - LM_MARGIN, p.y - LM_PYMAX);   // cuánto habría que subir para ver la cima (sin sacar a Alexander de pantalla)
      if (need > 0 && need * w > best) best = need * w;
    }
    return best;
  }
  function camFor(G) {
    var p = G.player, Vw = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }, base = p.y - 10 + (G.look ? G.look.y : 0) - Vw.h / 2, want = base;
    var t = inLarco(p.x, p.y) ? terraceAt(p.x, p.y) : null, rm = roomAt(p.x, p.y);
    if (rm) want = (rm.y0 + rm.y1) / 2 - Vw.h / 2;   // v0.13 T2: interior de local, centrado
    else if (t) want = ((t.r0 + t.r1 + 1) / 2) * T - Vw.h / 2 + 6;
    else {
      want = Math.max(base, Math.min(41 * T - Vw.h, p.y - 90));   // en los parques la cámara baja: se ven el parapeto y el mar
      want = Math.max(0, want - NORTH_PEEK) ;                     // v0.13: …pero 40 px menos, para ver más al norte
      want -= landmarkLift(p, want);                              // v0.13: faro y El Beso enteros
    }
    return base - want;
  }
  CV.snapCam = function () { var G = ACH.G; if (!G || !G.player || !ACH.world) return; ACH.world.camUp = camFor(G); if (ACH.debug && ACH.debug.teleport) ACH.debug.teleport(G.player.x, G.player.y); };
  CV.terraceAt = terraceAt; CV.place = function (n) { return PLACES[n] || null; };
  CV.register({
    name: 'mundo',
    reset: function (G) {
      G.cvCp = 0; START.x = START_HOME.x; START.y = START_HOME.y;
      gateDs.off = false; gate.hold = false;
      if (G && G.player) { G.player.x = START.x; G.player.y = START.y; ACH.world.camUp = camFor(G); }
    },
    onRespawn: function (G) { ACH.world.camUp = camFor(G); if (ACH.debug && ACH.debug.teleport) ACH.debug.teleport(G.player.x, G.player.y); },
    update: function (G, dt) {
      var p = G.player; if (!p) return;
      // puntos de control (solo suben)
      if (p.y < 33 * T) {
        if (p.x > CHECKPOINTS[1].col * T) cpUpgrade(G, 'amor');
        if (p.x > CHECKPOINTS[2].col * T) cpUpgrade(G, 'salazar');
      }
      // reja del chifa: se abre al llegar a ella desde la terraza C
      // QA: chef.js también abre la reja (a < 56 px) y la dejaba abierta antes de que este chequeo corriera: el punto de control
      // «arena» se saltaba. Ahora sube aunque la reja ya esté abierta.
      if (Math.abs(p.x - gate.x) < 40 && p.y < gate.y + 120 && p.y > gate.y - 48) {
        if (!gateDs.off && !gate.hold && p.y < gate.y) gate.open();
        cpUpgrade(G, 'arena');
      }
      // cámara: W.camUp (game.js lo resta del objetivo)
      var want = camFor(G), W = ACH.world;
      W.camUp = want;
    },
    // escaleras de Larcomar: bajar más rápido, subir más lento (×1.25 / ×0.8)
    speedMul: function (G) {
      var p = G.player; if (!p || !isStairs(p.x, p.y)) return 1;
      var a = ACH.input && ACH.input.axis ? ACH.input.axis() : { y: 0 };
      return a.y > 0.1 ? 1.25 : (a.y < -0.1 ? 0.8 : 1);
    },
    drawables: function (G, out) {
      var V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }, cam = G.cam;
      if (gate.x < cam.x - 60 || gate.x > cam.x + V.w + 60 || gate.y < cam.y - 80 || gate.y > cam.y + V.h + 40) return;
      var s = gateSpr(), open = gateDs.off;
      if (s && open && isCv(s.open)) s = s.open;
      out.push({ y: gateDs.y1, x: gate.x, draw: function (g, cx, cy) {
        var x0 = Math.round(gateDs.x0 - cx), y1 = Math.round(gateDs.y1 - cy), w = gateDs.x1 - gateDs.x0;
        if (s) { var ax = typeof s.ax === 'number' ? s.ax : s.width / 2, ay = typeof s.ay === 'number' ? s.ay : s.height; g.drawImage(s, Math.round(gate.x - cx - ax), Math.round(gateDs.y1 - cy - ay)); return; }
        if (open) { g.fillStyle = '#1c1a22'; g.fillRect(x0 - 3, y1 - 30, 4, 30); g.fillRect(x0 + w - 1, y1 - 30, 4, 30); g.fillStyle = '#c8962a'; g.fillRect(x0 - 2, y1 - 29, 2, 28); g.fillRect(x0 + w, y1 - 29, 2, 28); return; }
        g.fillStyle = '#1c1a22'; g.fillRect(x0 - 1, y1 - 31, w + 2, 31);
        g.fillStyle = '#b8141e'; g.fillRect(x0, y1 - 30, w, 29);
        g.fillStyle = '#c8962a'; for (var xx = x0 + 3; xx < x0 + w - 1; xx += 5) g.fillRect(xx, y1 - 30, 1, 29); g.fillRect(x0, y1 - 30, w, 2); g.fillRect(x0, y1 - 16, w, 1);
        if (!gateProv && CV.label) { gateProv = mkc(w, 9); CV.label(gateProv.getContext('2d'), 'CHIFA', w, 9, '#ffd24a', 1); }
        if (gateProv) g.drawImage(gateProv, x0, y1 - 26);
      } });
    }
  });
})();
