/* ACHORADO — js/barranco/mundo.js (B1a): el mapa de Barranco, de la playa a la Peña La Última Jarana (BARRANCO.md §2).
   Reemplaza a js/engine/world.js en barranco.html y publica ACH.world con la MISMA forma que js/costaverde/mundo.js (mismas claves)
   con id 'barranco', más:
     places{}       px de mundo (ver PLACES abajo y ../diseno/br-B1a.md)
     zona(x, y)     'playa' | 'bajada' | 'puente' | 'ermita' | 'parque' | 'bohemia' | 'pena'
     tramos[]       {id, name}; tramoAt(x, y) = zona más fina (playa, bajada, puente, ermita, mirador, zepita, parque, grau, bohemia, pena)
     checkpoints[]  playa · bajadaCima · parque · penaPuerta
     deck           el Puente de los Suspiros {c0, c1, r0, r1, x0, y0, x1, y1}: se camina ARRIBA (capa alta) y la Bajada pasa DEBAJO (capa baja).
                    Cada entidad lleva ent.brUp (true = arriba). moveCircle(ent) lo actualiza; collideCircle(x, y, r) sin entidad usa la
                    del movimiento en curso o la entidad más cercana. W.layerAt(x, y, up) · W.onDeck(ent).
     pena           {c0, r0, c1, r1, x0, y0, x1, y1, escenario:{…}, pista:{…}, puerta:{…}} (tiles y px): arena del jefe (B1b)
     bajada         {pts:[[c, r]…], half, wall} polilínea de la Bajada de Baños (tiles)
     vendorSpots    {tomas, rosa, lucia, lucho, celedonio} px: dónde van los vendedores/sobrevivientes (B1c)
     heladeroPath / dogZones: un corral sellado lejos (los de Costa Verde no salen al mapa: §1)
   Arte (BARRANCO.md §10): tiles 'br_<nombre>' en ACH.sprites.tiles desde ACH.sprites.br.lugar.tiles / casona.tiles (o provisorios);
   props 'br_<k>' desde lugar[k] / lugar.props[k] / casona[k] / casona.props[k]; lotes br_casona1..6, br_fachada (casona.fachada(brand, w)),
   br_iglesia, br_biblioteca. Mar y Morro: lugar.mar.draw / lugar.morro.draw por cuadro (drawHooks.ground), recortados a la banda del mar.
   Mapa: 250 × 100 tiles. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var BR = ACH.br = ACH.br || {};
  BR.systems = BR.systems || [];
  if (!BR.register) BR.register = function (s) { if (BR.systems.indexOf(s) < 0) BR.systems.push(s); return s; };

  var T = 16, COLS = 250, ROWS = 100;
  /* ---------------- Geografía (tiles). Mar al OESTE, avance de oeste a este ----------------
     Chars: V mar · o orilla · k canto rodado · w muro de la playa · C Circuito de Playas (pista, no se cruza) · K puente peatonal
            A quebrada/roca · M muro de la Bajada · b adoquín de la Bajada · e escalón · j terraza (Javier)
            h plaza de la Ermita · m mirador (Calle Ermita) · v vereda/adoquín de calle · g pista de calle · p parque
            L lote · R manzana/techos · P piso de la peña · T tabladillo · D pista de baile · W pared de la peña · q zaguán/portón · i corral */
  var SOLID = { V: 1, w: 1, C: 1, A: 1, M: 1, L: 1, R: 1, W: 1 };
  var BAJ = { pts: [[36.5, 78], [44, 78], [50, 72], [56, 66], [62, 60], [68, 54], [74, 48], [80, 42], [86, 36], [90, 33]], half: 2.6, wall: 3.8 };
  var BEACH = { c0: 10, c1: 27, r0: 60, r1: 96 };
  var ROAD = { c0: 29, c1: 35 };
  var FOOTB = { c0: 28, c1: 36, r0: 77, r1: 79 };                        // puente peatonal sobre el Circuito de Playas
  var JAVIER = { c0: 45, c1: 49, r0: 66, r1: 70 };                        // terraza del Restaurante Javier (al costado de la Bajada)
  var ERMITA = { c0: 37, c1: 62, r0: 30, r1: 50 };                        // meseta de la Ermita (solo se llega por el puente)
  var MIRADOR = { c0: 37, c1: 41, r0: 30, r1: 50 };                       // Calle Ermita: el borde del acantilado
  var DECK = { c0: 63, c1: 85, r0: 47, r1: 49 };                          // Puente de los Suspiros (E–O), capa alta
  var OZ = { c0: 63, c1: 81, r0: 45, r1: 51 };                            // zona donde la capa importa (v0.16: hasta la columna 81; la punta este
                                                                          //   del puente, 82–85, es piso alto normal: el descanso de la escalera)
  var LANDING = { c0: 82, c1: 85, r0: 45, r1: 49 };                       // v0.16: descanso al este del puente (piso alto)
  var SIDESTAIR = { c0: 81, c1: 85, r0: 41, r1: 44 };                     // v0.16: escalera lateral de la Bajada al puente
  var GARDEL = { c0: 86, c1: 99, r0: 24, r1: 35 };                        // Plazuela Gardel: arriba de la Bajada
  var SANMARTIN = { c0: 100, c1: 105, r0: 24, r1: 30 };                   // tramo de la Av. San Martín al parque
  var AYACUCHO = { c0: 94, c1: 99, r0: 36, r1: 51 };
  var ZEPITA = { c0: 86, c1: 105, r0: 45, r1: 51 };                       // Pasaje Zepita (Paseo Chabuca Granda) al parque
  var PARQUE = { c0: 106, c1: 138, r0: 30, r1: 62 };
  var GRAU = { c0: 139, c1: 144, r0: 12, r1: 74 };
  var CALLE_A = { c0: 145, c1: 213, r0: 20, r1: 24, name: 'AV. BOLOGNESI' };
  var CALLE_B = { c0: 145, c1: 247, r0: 46, r1: 50, name: 'JR. MANUEL SEGURA' };
  var UNION = { c0: 176, c1: 180, r0: 25, r1: 45, name: 'JR. UNIÓN' };
  var ZAGUAN = { c0: 205, c1: 208, r0: 42, r1: 45 };                     // escondite de Don Celedonio
  var PENA = { c0: 216, c1: 244, r0: 12, r1: 39, wall: { c0: 215, c1: 245, r0: 11 }, front: { r0: 40, r1: 45 },
    door: { c0: 228, c1: 232 }, escenario: { c0: 223, c1: 237, r0: 12, r1: 16 }, pista: { c0: 223, c1: 237, r0: 21, r1: 31 } };
  var CORRAL = { c0: 2, c1: 8, r0: 2, r1: 7 };                            // sellado: aquí viven el heladero y los perritos de Costa Verde
  function inR(c, r, q) { return c >= q.c0 && c <= q.c1 && r >= q.r0 && r <= q.r1; }

  // distancia (tiles) de un punto a la polilínea de la Bajada; .s = avance 0..1 a lo largo
  var BLEN = 0, BSEG = [];
  (function () { for (var k = 0; k + 1 < BAJ.pts.length; k++) { var a = BAJ.pts[k], b = BAJ.pts[k + 1], l = Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1])); BSEG.push({ a: a, b: b, l: l, s0: BLEN }); BLEN += l; } })();
  function bajDist(x, y) {
    var best = 1e9, bs = 0;
    for (var k = 0; k < BSEG.length; k++) {
      var S = BSEG[k], vx = S.b[0] - S.a[0], vy = S.b[1] - S.a[1], t = ((x - S.a[0]) * vx + (y - S.a[1]) * vy) / (S.l * S.l);
      t = t < 0 ? 0 : (t > 1 ? 1 : t);
      var dx = x - (S.a[0] + vx * t), dy = y - (S.a[1] + vy * t), d = Math.sqrt(dx * dx + dy * dy);
      if (d < best) { best = d; bs = (S.s0 + S.l * t) / BLEN; }
    }
    return { d: best, s: bs };
  }

  /* ---------------- LOTS (fachadas y casonas) ----------------
     br_fachada + brand → ACH.sprites.br.casona.fachada(brand, wTiles) (B2b); br_casona1..6; br_iglesia / br_biblioteca (B2a). */
  var LOTS = [];
  function lot(id, c0, c1, r0, r1, arch, o) {
    var f = { id: id, side: 'N', c0: c0, c1: c1, r0: r0, r1: r1, arch: arch, floors: 2, color: 'crema', name: '', corner: '', br: true };
    for (var k in (o || {})) f[k] = o[k];
    LOTS.push(f); return f;
  }
  var CAS = 0;
  function casona(c0, c1, r0, r1, o) { CAS++; return lot('CAS' + CAS, c0, c1, r0, r1, 'br_casona' + (1 + (CAS % 6)), o); }
  function fach(brand, c0, c1, r0, r1, o) { var q = { brand: brand, face: Math.min(7, r1 - r0 + 1) }; for (var k in (o || {})) q[k] = o[k]; return lot('F_' + brand, c0, c1, r0, r1, 'br_fachada', q); }
  // la Bajada y la Ermita
  fach('javier', 44, 50, 59, 65);
  fach('posadaMirador', 37, 46, 23, 29);
  casona(47, 54, 23, 29); casona(55, 62, 23, 29);
  // Plazuela Gardel / Av. San Martín (Isolina, Ayahuasca) y Zepita (Santos, El Tío Mario)
  fach('isolina', 86, 92, 14, 23); fach('ayahuasca', 93, 99, 14, 23); casona(100, 105, 14, 23);
  fach('santos', 88, 93, 38, 44);
  lot('MUNI', 100, 105, 31, 44, 'br_casona3', { name: 'MUNICIPALIDAD', face: 7, floors: 2, muni: true });
  fach('tioMario', 86, 93, 52, 58);
  casona(94, 105, 52, 58);
  // el parque: la iglesia de la Santísima Cruz al norte, la Biblioteca al sur
  lot('IGLESIA', 112, 130, 20, 29, 'br_iglesia', { name: 'SANTÍSIMA CRUZ', face: 10, floors: 3 });
  lot('BIBLIO', 112, 130, 63, 71, 'br_biblioteca', { name: 'BIBLIOTECA MUNICIPAL', face: 9, floors: 2 });
  casona(106, 111, 20, 29); casona(131, 138, 20, 29); casona(106, 111, 63, 71); casona(131, 138, 63, 71);
  // calles bohemias: al norte de la Av. Bolognesi
  fach('juanito', 145, 151, 8, 19); fach('oitaNoma', 152, 158, 8, 19); fach('barrancoBeer', 159, 166, 8, 19); fach('piselli', 167, 174, 8, 19);
  casona(175, 180, 8, 19); fach('sargento', 181, 188, 8, 19); fach('laNoche', 189, 195, 8, 19); fach('candelaria', 196, 202, 8, 19); casona(203, 213, 8, 19);
  // manzana entre Bolognesi y Manuel Segura (la cara mira al sur, a Manuel Segura)
  fach('donPorfirio', 145, 152, 25, 45); fach('laOficina', 153, 160, 25, 45); fach('penaCarajo', 161, 168, 25, 45); casona(169, 175, 25, 45);
  fach('barLucho', 181, 189, 25, 45); fach('estacion', 190, 196, 25, 45); fach('victoria', 197, 204, 25, 45);
  fach('zaguanCeledonio', 205, 208, 25, 41, { face: 6 }); casona(209, 213, 25, 45);
  // al sur de Manuel Segura
  casona(145, 156, 51, 60); casona(157, 168, 51, 60); casona(169, 180, 51, 60); casona(181, 192, 51, 60); casona(193, 204, 51, 60); casona(205, 213, 51, 60);
  // la peña del jefe: fachada en la fila 40–45 (portón en las columnas 228–232, que se caminan)
  fach('ultimaJarana', 214, 246, 40, 45, { face: 6, pena: true });
  function brandName(id) { return BR.brandName ? BR.brandName(id) : String(id).toUpperCase(); }
  LOTS.forEach(function (f) { if (f.brand && !f.name) f.name = brandName(f.brand); f.name = f.name || ''; f.damage = 0; f.roof = []; f.front = []; });
  (function () {   // semilla, cara visible y vecinos (como world.js)
    function seedOf(id) { var h = 2166136261; for (var i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 10000; }
    for (var i = 0; i < LOTS.length; i++) {
      var f = LOTS[i];
      f.seed = seedOf(f.id); f.face = Math.min(f.face || 7, f.r1 - f.r0 + 1); f.nbW = -1; f.nbE = -1;
      for (var j = 0; j < LOTS.length; j++) { var g = LOTS[j]; if (g === f || g.r1 !== f.r1) continue; if (g.c1 === f.c0 - 1) f.nbW = g.floors; if (g.c0 === f.c1 + 1) f.nbE = g.floors; }
    }
  })();

  /* ---------------- Grilla ---------------- */
  function baseChar(c, r) {
    if (inR(c, r, CORRAL)) return 'i';
    if (c <= 9) return 'V';
    if (c <= 28) {
      if (r >= 97) return 'V';
      if (inR(c, r, FOOTB)) return 'K';
      if (r >= BEACH.r0 && r <= BEACH.r1) { if (c === 28) return 'w'; return c <= 11 || r === 96 ? 'o' : 'k'; }
      return 'A';
    }
    if (c <= ROAD.c1) { if (inR(c, r, FOOTB)) return 'K'; return r >= 97 ? 'V' : 'C'; }
    if (c === 36 && inR(c, r, FOOTB)) return 'K';
    if (inR(c, r, ERMITA)) return inR(c, r, MIRADOR) ? 'm' : 'h';
    if (inR(c, r, JAVIER)) return 'j';
    if (inR(c, r, GARDEL) || inR(c, r, SANMARTIN) || inR(c, r, AYACUCHO) || inR(c, r, ZEPITA)) return 'v';
    if (inR(c, r, PARQUE)) return 'p';
    if (inR(c, r, GRAU)) return (c === GRAU.c0 || c === GRAU.c1) ? 'v' : 'g';
    if (inR(c, r, CALLE_A) || inR(c, r, CALLE_B)) { var q = inR(c, r, CALLE_A) ? CALLE_A : CALLE_B; return (r === q.r0 || r === q.r1) ? 'v' : 'g'; }
    if (inR(c, r, UNION) || inR(c, r, ZAGUAN)) return 'v';
    if (c >= PENA.wall.c0 && c <= PENA.wall.c1 && r >= PENA.wall.r0 && r < PENA.front.r0) {
      if (c === PENA.wall.c0 || c === PENA.wall.c1 || r === PENA.wall.r0) return 'W';
      if (inR(c, r, PENA.escenario)) return 'T';
      if (inR(c, r, PENA.pista)) return 'D';
      return 'P';
    }
    if (c < 86 && r >= 30) return 'A';
    return 'R';
  }
  var grid = [], lotAt = [], r, c, i;
  for (r = 0; r < ROWS; r++) { var row = [], lrow = []; for (c = 0; c < COLS; c++) { row.push(baseChar(c, r)); lrow.push(-1); } grid.push(row); lotAt.push(lrow); }
  for (i = 0; i < LOTS.length; i++) {
    var L0 = LOTS[i];
    for (r = L0.r0; r <= L0.r1; r++) for (c = L0.c0; c <= L0.c1; c++) {
      if (L0.pena && r >= PENA.front.r0 && c >= PENA.door.c0 && c <= PENA.door.c1) { grid[r][c] = 'q'; continue; }
      grid[r][c] = 'L'; lotAt[r][c] = i;
    }
  }
  // la Bajada: el piso gana a todo (menos al mar y la pista); los muros solo cierran lo que ya era sólido
  var BAJS = [];   // avance 0..1 por tile de la Bajada (para la hora y las escaleras)
  for (r = 20; r < 90; r++) for (c = 34; c < 95; c++) {
    var bd = bajDist(c + 0.5, r + 0.5), ch0 = grid[r][c];
    if (ch0 === 'V' || ch0 === 'C') continue;
    if (bd.d < BAJ.half) { grid[r][c] = (r >= 54 && r <= 76) ? 'e' : 'b'; lotAt[r][c] = -1; BAJS[r * COLS + c] = bd.s; }
    else if (bd.d < BAJ.wall && SOLID[ch0]) grid[r][c] = 'M';
  }
  // v0.16: la escalera lateral (abre el muro este de la Bajada justo arriba del puente) y el descanso que la une al puente
  for (r = SIDESTAIR.r0; r <= SIDESTAIR.r1; r++) for (c = SIDESTAIR.c0; c <= SIDESTAIR.c1; c++) if (grid[r][c] === 'M' || grid[r][c] === 'A') grid[r][c] = 'e';
  for (r = LANDING.r0; r <= LANDING.r1; r++) for (c = LANDING.c0; c <= LANDING.c1; c++) grid[r][c] = 'v';
  var MAP = grid.map(function (rw) { return rw.join(''); });

  /* ---------------- Lugares, inicio, puntos de control ---------------- */
  function px(cc, rr) { return { x: Math.round(cc * T), y: Math.round(rr * T) }; }
  var PLACES = {
    playa: px(19.5, 82.5), orilla: px(11.5, 80), parapente: px(13, 82), tomas: px(23.5, 72.5),
    bajadaPie: px(39, 78), bajadaMedio: px(56, 66), javier: px(47, 68.5), bajoPuente: px(74.5, 48.6), bajadaCima: px(92, 30),
    puenteA: px(61, 48.5), puenteB: px(87.5, 48.5), puenteMedio: px(74, 48.5),
    ermita: px(50, 46.5), mirador: px(39.5, 41), chabuca: px(58.5, 45.5), rosa: px(89.5, 50.6),
    parque: px(122, 54), fuente: px(122, 50.5), biblioteca: px(121, 61.5), iglesia: px(121, 31.5), muni: px(103, 46.5),
    grau: px(141.5, 40), bohemia1: px(162, 22.5), bohemia2: px(185.5, 48.5), lucho: px(185.5, 48.5), union: px(178, 35),
    celedonio: px(206.5, 44), penaPuerta: px(230.5, 48.5), penaAdentro: px(230.5, 36), penaCentro: px(230.5, 26), penaEscenario: px(230.5, 14.5)
  };
  var START_HOME = { x: PLACES.playa.x, y: PLACES.playa.y };
  var START = { x: START_HOME.x, y: START_HOME.y };
  var CHECKPOINTS = [
    { id: 'playa', x: START_HOME.x, y: START_HOME.y, label: 'la Playa Barranco' },
    { id: 'bajadaCima', x: PLACES.bajadaCima.x, y: PLACES.bajadaCima.y, label: 'la cima de la Bajada de Baños' },
    { id: 'parque', x: Math.round(108 * T), y: Math.round(48 * T), label: 'el Parque Municipal' },
    { id: 'penaPuerta', x: PLACES.penaPuerta.x, y: PLACES.penaPuerta.y, label: 'la puerta de la peña' }
  ];
  var VENDOR_SPOTS = { tomas: PLACES.tomas, rosa: PLACES.rosa, lucia: PLACES.mirador, lucho: PLACES.lucho, celedonio: PLACES.celedonio };
  var CORRAL_PX = { x0: (CORRAL.c0 + 0.5) * T, y0: (CORRAL.r0 + 0.5) * T, x1: (CORRAL.c1 + 0.5) * T, y1: (CORRAL.r1 + 0.5) * T };
  var HELADERO_PATH = [[[CORRAL_PX.x0 + 8, CORRAL_PX.y0 + 20], [CORRAL_PX.x1 - 8, CORRAL_PX.y0 + 20]]];
  var DOG_ZONES = [{ id: 'corral', x0: CORRAL_PX.x0 + 8, y0: CORRAL_PX.y0 + 8, x1: CORRAL_PX.x1 - 8, y1: CORRAL_PX.y1 - 8 }];
  var DECKPX = { c0: DECK.c0, c1: DECK.c1, r0: DECK.r0, r1: DECK.r1, x0: DECK.c0 * T, y0: DECK.r0 * T, x1: (DECK.c1 + 1) * T, y1: (DECK.r1 + 1) * T };
  var OZPX = { x0: OZ.c0 * T, y0: OZ.r0 * T, x1: (OZ.c1 + 1) * T, y1: (OZ.r1 + 1) * T };
  function rpx(q) { return { c0: q.c0, r0: q.r0, c1: q.c1, r1: q.r1, x0: q.c0 * T, y0: q.r0 * T, x1: (q.c1 + 1) * T, y1: (q.r1 + 1) * T }; }
  var PENAPX = rpx(PENA); PENAPX.escenario = rpx(PENA.escenario); PENAPX.pista = rpx(PENA.pista);
  PENAPX.puerta = { c0: PENA.door.c0, c1: PENA.door.c1, r0: PENA.front.r0, r1: PENA.front.r1, x0: PENA.door.c0 * T, x1: (PENA.door.c1 + 1) * T, y0: PENA.front.r0 * T, y1: (PENA.front.r1 + 1) * T };
  var SEA = [{ x0: 0, y0: 0, x1: 10 * T, y1: ROWS * T }, { x0: 10 * T, y0: 97 * T, x1: 36 * T, y1: ROWS * T }];
  var TRAMOS = [
    { id: 'playa', name: 'Playa Barranco' }, { id: 'bajada', name: 'Bajada de Baños' }, { id: 'puente', name: 'Puente de los Suspiros' },
    { id: 'ermita', name: 'La Ermita y el mirador' }, { id: 'parque', name: 'Parque Municipal' }, { id: 'bohemia', name: 'Calles bohemias' },
    { id: 'pena', name: 'Peña La Última Jarana' }
  ];

  /* ---------------- Acceso al arte (BARRANCO.md §10) ---------------- */
  function SBR() { return (ACH.sprites && ACH.sprites.br) || {}; }
  function isCv(o) { return o && typeof o === 'object' && typeof o.width === 'number' && o.width > 0; }
  function okArt(o) { return Array.isArray(o) ? !!(o.length && isCv(o[0])) : isCv(o); }
  function brTile(name) {
    var S = SBR(), l = S.lugar || {}, k = S.casona || {}, o;
    o = l.tiles && l.tiles[name]; if (okArt(o)) return o;
    o = k.tiles && k.tiles[name]; if (okArt(o)) return o;
    o = k[name]; if (okArt(o) && Array.isArray(o)) return o;
    return null;
  }
  function brProp(name) {
    var S = SBR(), l = S.lugar || {}, k = S.casona || {}, o;
    o = l.props && l.props[name]; if (okArt(o)) return o;
    o = l[name]; if (okArt(o)) return o;
    o = k.props && k.props[name]; if (okArt(o)) return o;
    o = k[name]; if (okArt(o)) return o;
    return null;
  }
  BR.art = { tile: brTile, prop: brProp };

  /* ---------------- Tiles provisorios ---------------- */
  function hashT(cc, rr) { var h = (cc * 374761393 + rr * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return (h ^ (h >>> 16)) >>> 0; }
  function mkc(w, h) { if (BR.mk) return BR.mk(w, h); var cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; }
  function mkTile(draw) { var t = mkc(16, 16), g = t.getContext('2d'); g.imageSmoothingEnabled = false; draw(g); return t; }
  function dots(g, seed, col, n, sz) { g.fillStyle = col; for (var q = 0; q < n; q++) { var h = hashT(seed, q * 7 + 1); g.fillRect(h % 16, (h >>> 8) % 16, sz || 1, sz || 1); } }
  function flat(base, spk, seed, line, n) { return function (v) { return mkTile(function (g) { g.fillStyle = base[v % base.length]; g.fillRect(0, 0, 16, 16); dots(g, seed + v, spk, n || 10); if (line) { g.fillStyle = line; g.fillRect(0, 15, 16, 1); g.fillRect(15, 0, 1, 16); } }); }; }
  function brick(a, b, mortar) { return function (v) { return mkTile(function (g) { g.fillStyle = mortar; g.fillRect(0, 0, 16, 16); for (var y = 0; y < 16; y += 4) for (var x = ((y / 4) % 2) * 4 - 4; x < 16; x += 8) { g.fillStyle = (hashT(x + v * 3, y) % 3) ? a : b; g.fillRect(x + 1, y + 1, 7, 3); } }); }; }
  var TILE_PROV = {
    canto: function (v) { return mkTile(function (g) { g.fillStyle = ['#8c7b64', '#877660', '#917f68'][v % 3]; g.fillRect(0, 0, 16, 16); for (var q = 0; q < 14; q++) { var h = hashT(v + 3, q); g.fillStyle = q % 3 ? '#b9a58a' : '#5e564c'; g.fillRect(h % 15, (h >>> 7) % 15, 2 + (h >>> 12) % 2, 2); } }); },
    orilla: function (v) { return mkTile(function (g) { g.fillStyle = '#6f6a5e'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#3e6a7e'; g.fillRect(0, 0, 5 + (v % 3), 16); g.fillStyle = '#e9e4d8'; for (var y = (v * 5) % 4; y < 16; y += 4) g.fillRect(4 + (v % 3), y, 3, 1); dots(g, 31 + v, '#5e564c', 6, 2); }); },
    mar: flat(['#3e6a7e', '#3a6578', '#426e82'], '#5f8a98', 41, null, 6),
    adoquin: brick('#a5583f', '#94503a', '#6e3a2a'),
    escalon: function (v) { return mkTile(function (g) { g.fillStyle = '#b8aa94'; g.fillRect(0, 0, 16, 16); for (var y = 0; y < 16; y += 4) { g.fillStyle = '#7a6e5e'; g.fillRect(0, y + 3, 16, 1); g.fillStyle = '#d8cdb6'; g.fillRect(0, y, 16, 1); } dots(g, 51 + v, '#9a8e7a', 5); }); },
    tierraQuebrada: function (v) { return mkTile(function (g) { g.fillStyle = ['#5e8f4e', '#577f45', '#4f7a3f'][v % 3]; g.fillRect(0, 0, 16, 16); dots(g, 61 + v, '#2f5d3a', 14, 2); dots(g, 71 + v, '#8a7a5a', 4, 1); if (v % 4 === 0) dots(g, 81, '#c2185b', 4, 2); }); },
    muro: function (v) { return mkTile(function (g) { g.fillStyle = '#ede6d6'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#c9c0ac'; g.fillRect(0, 12, 16, 4); g.fillStyle = '#1c1a22'; g.fillRect(0, 15, 16, 1); if (v % 2) { g.fillStyle = '#e0457b'; g.fillRect(2, 1, 4, 3); g.fillRect(9, 3, 3, 2); g.fillStyle = '#2f5d3a'; g.fillRect(5, 2, 3, 2); } }); },
    muroPlaya: flat(['#a8a196', '#a29b90'], '#8a8478', 91, '#3a3a40'),
    pista: flat(['#4a4a50', '#46464c', '#4e4e54'], '#5a5a60', 101),
    pistaCircuito: function (v) { return mkTile(function (g) { g.fillStyle = '#4a4a50'; g.fillRect(0, 0, 16, 16); dots(g, 111 + v, '#5a5a60', 8); if (v % 4 === 1) { g.fillStyle = '#d8d2b8'; g.fillRect(7, 2, 2, 8); } if (v % 4 === 3) { g.fillStyle = '#9a9a9e'; g.fillRect(0, 0, 2, 16); } }); },
    tablasPeatonal: function (v) { return mkTile(function (g) { g.fillStyle = '#8a8478'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#6e6a60'; g.fillRect(0, 3, 16, 1); g.fillRect(0, 7, 16, 1); g.fillRect(0, 11, 16, 1); g.fillStyle = '#3a3a40'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); }); },
    vereda: flat(['#c9c0ac', '#cfc6b2', '#c4bba7'], '#ada490', 121, '#ada490'),
    pisoErmita: flat(['#d9c79a', '#d4c294', '#dccb9f'], '#b8a478', 131),
    pasto: function (v) { return mkTile(function (g) { g.fillStyle = ['#5e8f4e', '#5a8a4a', '#629452'][v % 3]; g.fillRect(0, 0, 16, 16); dots(g, 141 + v, '#4a7a3c', 10); if (v % 5 === 0) dots(g, 151 + v, v % 2 ? '#e3b94f' : '#e0457b', 3, 1); }); },
    losetaParque: function (v) { return mkTile(function (g) { g.fillStyle = '#c8b58e'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#a8956e'; g.fillRect(0, 7, 16, 1); g.fillRect(7, 0, 1, 16); g.fillRect(0, 15, 16, 1); g.fillRect(15, 0, 1, 16); dots(g, 161 + v, '#b8a57e', 5); }); },
    arena: flat(['#d8c8a0', '#d2c29a'], '#b8a880', 171),
    pisoPena: function (v) { return mkTile(function (g) { g.fillStyle = v % 2 ? '#6b4a2f' : '#644528'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#4f3420'; g.fillRect(0, 7, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect((v * 5) % 16, 0, 1, 7); }); },
    tabladillo: function (v) { return mkTile(function (g) { g.fillStyle = '#8a5a34'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#5b3a29'; for (var x = 0; x < 16; x += 4) g.fillRect(x, 0, 1, 16); g.fillStyle = '#b07a45'; g.fillRect(0, 0, 16, 1); }); },
    pistaBaile: function (v) { return mkTile(function (g) { g.fillStyle = v % 2 ? '#2a2236' : '#e8dcc0'; g.fillRect(0, 0, 16, 16); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 15, 16, 1); g.fillRect(15, 0, 1, 16); }); },
    paredPena: flat(['#5a2a2a', '#562828'], '#3a1a1a', 181, '#2a1414')
  };
  var TILE_KEYS = Object.keys(TILE_PROV);
  // tile del contrato de B2a/B2b que reemplaza a cada provisorio (si no viene, queda el provisorio)
  var TILE_ART = { canto: 'canto', orilla: 'orilla', adoquin: 'adoquin', escalon: 'escalon', tierraQuebrada: 'tierraQuebrada', pista: 'pista', pistaCircuito: 'pista',
    vereda: 'vereda', pisoErmita: 'pisoErmita', pasto: 'pasto', losetaParque: 'losetaParque', arena: 'arena', pisoPena: 'pisoPena', tabladillo: 'tabladillo', pistaBaile: 'pistaBaile' };
  function ensureTiles() {
    var S = ACH.sprites = ACH.sprites || {}, TT = S.tiles = S.tiles || {};
    TILE_KEYS.forEach(function (k) {
      var art = TILE_ART[k] ? brTile(TILE_ART[k]) : null;
      if (art) { TT['br_' + k] = Array.isArray(art) ? art : [art]; return; }
      if (TT['br_' + k] && TT['br_' + k].brProv) return;
      var arr = []; for (var n = 0; n < 4; n++) arr.push(TILE_PROV[k](n)); arr.brProv = true; TT['br_' + k] = arr;
    });
    // la pista de baile encendida (ataque del jefe): B2b la trae como pistaBaileOn; si no, el motor no la necesita
  }
  function nVar(name) { var o = ACH.sprites && ACH.sprites.tiles && ACH.sprites.tiles[name]; return Array.isArray(o) ? Math.max(1, o.length) : 1; }
  function V(name, h) { return ['br_' + name, h % nVar('br_' + name)]; }
  // senderos del parque (diagonales y cruz) y la plaza de la fuente
  var PK = { cx: 122, cy: 46 };
  function parkTile(cc, rr, h) {
    var x = cc + 0.5 - PK.cx, y = rr + 0.5 - PK.cy, ax = Math.abs(x), ay = Math.abs(y);
    if (x * x + y * y < 30) return V('losetaParque', h);
    if (ax < 1.2 || ay < 1.2) return V('losetaParque', h);
    if (Math.abs(ax - ay * (16 / 16)) < 1.0) return V('losetaParque', h);
    if (cc === PARQUE.c0 || cc === PARQUE.c1 || rr === PARQUE.r0 || rr === PARQUE.r1) return V('vereda', h);
    return V('pasto', h >>> 4);
  }
  function groundTile(cc, rr, h) {
    var ch = grid[rr][cc];
    switch (ch) {
      case 'V': return V('mar', h);
      case 'o': return V('orilla', h);
      case 'k': return V('canto', h);
      case 'w': return V('muroPlaya', h);
      case 'C': return ['br_pistaCircuito', (rr % 4 === 1 && cc === 32) ? 1 : (cc === ROAD.c0 || cc === ROAD.c1 ? 3 : 0) % nVar('br_pistaCircuito')];
      case 'K': return V('tablasPeatonal', h);
      case 'A': return V('tierraQuebrada', h);
      case 'M': return V('muro', h);
      case 'b': case 'j': case 'q': return V('adoquin', h);
      case 'e': return V('escalon', rr);
      case 'h': return V('pisoErmita', h);
      case 'm': case 'v': return V('vereda', h);
      case 'g': return V('pista', h);
      case 'p': return parkTile(cc, rr, h);
      case 'P': return V('pisoPena', h);
      case 'T': return V('tabladillo', h);
      case 'D': return ['br_pistaBaile', (cc + rr) % 2 % nVar('br_pistaBaile')];
      case 'W': return V('paredPena', h);
      case 'i': return V('arena', h);
      default: return ['roof', h % 7];   // L y R: techos (el lote horneado tapa lo suyo)
    }
  }

  /* ---------------- Props ----------------
     k = clave del contrato (§10.1 / §10.2); en ACH.sprites.props van como 'br_' + k. Sin el arte: bloque provisorio con su nombre. */
  var PROV = {   // [ancho, alto, color, fw, fh, rótulo, tall]
    torreSalvavidas: [26, 52, '#e8402c', 14, 8, 'SALVAVIDAS', 1], sombrillaPlaya: [30, 34, '#f2d480', 4, 4, 'SOMBRILLA', 1], restoPlaya: [60, 44, '#3e6a7e', 56, 12, 'RESTAURANT', 1],
    puentePeatonal: [148, 56, '#8a8478', 0, 0, 'PUENTE PEATONAL', 1], autoAbandonado: [60, 28, '#c8402c', 0, 0, 'AUTO'], parapenteTirado: [64, 20, '#e84a8a', 30, 6, 'PARAPENTE'],
    farolBR: [10, 46, '#2b2b30', 3, 3, '', 1], bancaBR: [26, 14, '#7a5a3d', 22, 6, 'BANCA'], basureroBR: [9, 13, '#2f5d3a', 6, 4, ''],
    buganvilia: [32, 26, '#c2185b', 0, 0, ''], palmeraBR: [26, 84, '#6f8f3e', 4, 4, 'PALMERA', 1], ficusBR: [54, 60, '#2f5d3a', 6, 4, 'FICUS', 1],
    casitaBajada: [48, 40, '#e8b7a0', 0, 0, 'CASITA', 1], ermita: [190, 120, '#e3b94f', 176, 40, 'LA ERMITA', 1], barandaMirador: [32, 14, '#3a3a40', 0, 0, ''],
    fuenteParque: [56, 40, '#e7e2d4', 44, 18, 'FUENTE', 1], estatuaCantora: [20, 44, '#a8a196', 12, 8, 'MONUMENTO', 1], kioscoParque: [36, 40, '#2f5d3a', 30, 12, 'KIOSCO', 1],
    carritoAnticuchos: [30, 26, '#b5523b', 24, 8, 'ANTICUCHOS', 1], cajaCervezas: [14, 12, '#e3b94f', 10, 5, ''], muroBajada: [32, 18, '#ede6d6', 0, 0, '']
  };
  // huellas fijas (solo el tronco/poste, aunque el arte traiga otra)
  var FOOTFIX = { palmeraBR: { fw: 4, fh: 4, tall: 1, tree: 1 }, ficusBR: { fw: 6, fh: 4, tall: 1, tree: 1 }, farolBR: { fw: 3, fh: 3, tall: 1 },
    sombrillaPlaya: { fw: 4, fh: 4, tall: 1 }, buganvilia: { fw: 0, fh: 0 }, casitaBajada: { fw: 0, fh: 0, tall: 1 }, barandaMirador: { fw: 0, fh: 0 },
    puentePeatonal: { fw: 0, fh: 0, tall: 1 }, autoAbandonado: { fw: 0, fh: 0 }, muroBajada: { fw: 0, fh: 0 }, ermita: { fw: 176, fh: 40, tall: 1 } };
  var LAMPS = { farolBR: [{ x: 0, y: -40 }] };
  var BREAK = {   // props rompibles (interaccion.js, clase 'junk'): sueltan monedas o botellas (propHook de abajo)
    br_sombrillaPlaya: { cls: 'junk', hp: 2, h: 30, loot: null, mat: 'wood', hitSfx: 'prop.hit.wood', breakSfx: 'prop.break.cart', noise: 60 },
    br_cajaCervezas: { cls: 'junk', hp: 1, h: 12, loot: null, mat: 'wood', hitSfx: 'prop.hit.wood', breakSfx: 'prop.break.cart', noise: 50, botellas: true },
    br_basureroBR: { cls: 'trash', hp: 2, h: 14 },
    br_parapenteTirado: { cls: 'junk', hp: 2, h: 10, loot: null, mat: 'wood', hitSfx: 'prop.hit.wood', breakSfx: 'prop.break.cart', noise: 40 }
  };
  var PROPS = [
    // ---- Playa Barranco (canto rodado) ----
    { k: 'parapenteTirado', c: 15.5, r: 86.6 }, { k: 'torreSalvavidas', c: 16, r: 71 }, { k: 'sombrillaPlaya', v: 0, c: 13.5, r: 76 }, { k: 'sombrillaPlaya', v: 1, c: 21, r: 90 },
    { k: 'sombrillaPlaya', v: 2, c: 18, r: 64 }, { k: 'restoPlaya', v: 0, c: 23, r: 69.4 }, { k: 'restoPlaya', v: 1, c: 23, r: 89.4 },
    { k: 'cajaCervezas', c: 22.5, r: 70.6 }, { k: 'cajaCervezas', c: 22.6, r: 91 }, { k: 'basureroBR', c: 26.4, r: 75.2 }, { k: 'basureroBR', c: 26.4, r: 82.2 },
    // ---- Circuito de Playas: autos abandonados y el puente peatonal (decoración sobre la pista, no se camina) ----
    { k: 'autoAbandonado', v: 0, c: 32, r: 62 }, { k: 'autoAbandonado', v: 1, c: 32.4, r: 92 }, { k: 'autoAbandonado', v: 0, c: 31.6, r: 40 }, { k: 'autoAbandonado', v: 1, c: 32.2, r: 14 },
    // v0.16: el puente peatonal ya no es un prop (su tablero quedaba 3 filas al norte de por donde se camina): ver drawFoot()
    // ---- Terraza del Restaurante Javier ----
    { k: 'bancaBR', c: 47, r: 67.6 }, { k: 'cajaCervezas', c: 47.5, r: 69.6 },
    // ---- La Ermita, la plazuela y el mirador (Calle Ermita) ----
    { k: 'ermita', c: 50.5, r: 43 }, { k: 'estatuaCantora', c: 58.5, r: 43.6 }, { k: 'bancaBR', c: 55, r: 49.6 }, { k: 'bancaBR', c: 45, r: 49.6 },
    { k: 'ficusBR', c: 60, r: 33 }, { k: 'palmeraBR', v: 0, c: 43, r: 33.5 }, { k: 'farolBR', c: 52, r: 46.5 }, { k: 'farolBR', c: 60.5, r: 46.4 },
    { k: 'bancaBR', c: 39.5, r: 36 }, { k: 'farolBR', c: 40.8, r: 44 },
    // ---- Zepita, Gardel, Doña Rosa ----
    { k: 'carritoAnticuchos', c: 92.5, r: 50.4 }, { k: 'farolBR', c: 87, r: 45.4 }, { k: 'farolBR', c: 98.5, r: 45.4 }, { k: 'bancaBR', c: 92, r: 27 },
    { k: 'ficusBR', v: 1, c: 88, r: 26 }, { k: 'farolBR', c: 96, r: 33.4 }, { k: 'palmeraBR', v: 1, c: 97.5, r: 38 },
    // ---- Parque Municipal ----
    { k: 'fuenteParque', c: 122, r: 47.2 }, { k: 'kioscoParque', v: 0, c: 110.5, r: 35 }, { k: 'kioscoParque', v: 1, c: 134, r: 59 },
    { k: 'bancaBR', c: 116, r: 41.6 }, { k: 'bancaBR', c: 128, r: 41.6 }, { k: 'bancaBR', c: 116, r: 52 }, { k: 'bancaBR', c: 128, r: 52 },
    { k: 'bancaBR', c: 111, r: 55.6 }, { k: 'bancaBR', c: 133, r: 36.6 }, { k: 'basureroBR', c: 119, r: 58 }, { k: 'basureroBR', c: 125, r: 34.4 },
    { k: 'palmeraBR', v: 0, c: 109, r: 31.6 }, { k: 'palmeraBR', v: 1, c: 136, r: 31.6 }, { k: 'palmeraBR', v: 0, c: 109, r: 61 }, { k: 'palmeraBR', v: 1, c: 136, r: 61 },
    { k: 'ficusBR', v: 0, c: 113, r: 39 }, { k: 'ficusBR', v: 1, c: 131, r: 55 }, { k: 'ficusBR', v: 0, c: 131, r: 38.6 }, { k: 'ficusBR', v: 1, c: 113, r: 56 },
    // ---- Calles bohemias: cajas de cerveza vacías de los bares (rompibles: sueltan botellas) ----
    { k: 'cajaCervezas', c: 149, r: 45.8 }, { k: 'cajaCervezas', c: 157.5, r: 45.8 }, { k: 'cajaCervezas', c: 185, r: 45.8 }, { k: 'cajaCervezas', c: 193.5, r: 45.8 },
    { k: 'cajaCervezas', c: 148, r: 19.8 }, { k: 'cajaCervezas', c: 184.5, r: 19.8 }, { k: 'cajaCervezas', c: 199, r: 19.8 }, { k: 'cajaCervezas', c: 221, r: 45.8 },
    { k: 'bancaBR', c: 172, r: 46.95 }, { k: 'bancaBR', c: 200.5, r: 46.95 }, { k: 'basureroBR', c: 177, r: 24.6 }, { k: 'basureroBR', c: 211, r: 50.6 }
  ];
  (function () {
    // la Bajada: faroles, buganvilias en los muros y casitas a los costados (siguiendo la polilínea)
    var n = 0;
    for (var k = 0; k < BSEG.length; k++) {
      var S = BSEG[k], ux = (S.b[0] - S.a[0]) / S.l, uy = (S.b[1] - S.a[1]) / S.l, nx = -uy, ny = ux;
      for (var s = 2; s < S.l - 1; s += 4.5) {
        var cx = S.a[0] + ux * s, cy = S.a[1] + uy * s, side = (n % 2) ? 1 : -1;
        if (cy > OZ.r0 - 3 && cy < OZ.r1 + 3) { n++; continue; }   // nada debajo del puente
        if (n % 3 === 0) PROPS.push({ k: 'farolBR', c: cx + nx * side * 1.9, r: cy + ny * side * 1.9 + 0.4 });
        PROPS.push({ k: 'buganvilia', v: n % 3, c: cx + nx * -side * 3.3, r: cy + ny * -side * 3.3 + 0.6 });
        if (n % 2 === 0) PROPS.push({ k: 'casitaBajada', v: (n / 2) % 3, c: cx + nx * side * 6.5, r: cy + ny * side * 6.5 + 1 });
        else PROPS.push({ k: 'ficusBR', v: n % 2, c: cx + nx * side * 6, r: cy + ny * side * 6 + 0.6, decor: true });
        n++;
      }
    }
    // v0.16: la escalera lateral y el descanso del puente quedan despejados (nada de árboles ni casitas encima)
    for (var q = PROPS.length - 1; q >= 0; q--) { var pq = PROPS[q]; if (pq.c > SIDESTAIR.c0 - 2.5 && pq.c < LANDING.c1 + 2 && pq.r > SIDESTAIR.r0 - 2 && pq.r < LANDING.r0 + 1.5 && pq.k !== 'farolBR') PROPS.splice(q, 1); }
    // el mirador: baranda al borde del acantilado (columna 36)
    for (var rr = 31; rr <= 50; rr += 2) PROPS.push({ k: 'barandaMirador', c: 36.6, r: rr + 0.9 });
    // faroles de fierro: Grau y las dos calles bohemias (en la vereda norte y sur)
    for (rr = 14; rr <= 72; rr += 8) PROPS.push({ k: 'farolBR', c: GRAU.c0 + 0.5, r: rr + 0.6 });
    for (var cc = 150; cc <= 244; cc += 9) {
      if (cc <= CALLE_A.c1) PROPS.push({ k: 'farolBR', c: cc + 0.5, r: CALLE_A.r1 + 0.5 });
      if (!(cc >= PENA.door.c0 - 2 && cc <= PENA.door.c1 + 2)) PROPS.push({ k: 'farolBR', c: cc + 4.5, r: CALLE_B.r1 + 0.5 });
    }
    // el parque: faroles en las veredas
    for (cc = 108; cc <= 136; cc += 7) { PROPS.push({ k: 'farolBR', c: cc + 0.5, r: PARQUE.r0 + 0.6 }); PROPS.push({ k: 'farolBR', c: cc + 0.5, r: PARQUE.r1 + 0.6 }); }
    // buganvilias cayendo por las casonas de la calle (decoración)
    for (cc = 147; cc <= 211; cc += 11) PROPS.push({ k: 'buganvilia', v: cc % 3, c: cc + 0.5, r: 45.2 });
  })();
  var CATS = [{ x: 20 * T, y: 66 * T, mode: 'sleep' }, { x: 56 * T, y: 48.6 * T, mode: 'sit' }, { x: 126 * T, y: 57 * T, mode: 'lick' }, { x: 170 * T, y: 49.4 * T, mode: 'sleep' }];
  var DOGS = [];
  function birdSpawns() { return [{ x: 20 * T, y: 74 * T, z: 0, pole: false }, { x: 50 * T, y: 36 * T, z: 0, pole: false }, { x: 118 * T, y: 58 * T, z: 0, pole: false }]; }
  var HIDDEN_LOOT = [{ id: 'gaseosa', x: 47.5 * T, y: 66.8 * T, p: 1 }, { id: 'curitas', x: 38.5 * T, y: 31 * T, p: 0.8 }, { id: 'sencillo', x: 207 * T, y: 42.6 * T, p: 1 }];
  var DOORS = {};
  LOTS.forEach(function (f) { if (!f.brand) return; (DOORS[f.brand] = DOORS[f.brand] || []).push({ x: Math.round((f.c0 + f.c1 + 1) / 2 * T), y: (f.r1 + 1) * T + 10, lot: f.id }); });

  /* ---------------- Colisión, con dos capas en el puente ---------------- */
  function tileAt(cc, rr) { if (cc < 0 || rr < 0 || cc >= COLS || rr >= ROWS) return null; return grid[rr][cc]; }
  function inOZt(cc, rr) { return cc >= OZ.c0 && cc <= OZ.c1 && rr >= OZ.r0 && rr <= OZ.r1; }
  function inDeckT(cc, rr) { return cc >= DECK.c0 && cc <= DECK.c1 && rr >= DECK.r0 && rr <= DECK.r1; }
  var curUp = null;   // capa del movimiento en curso (moveCircle) / del routeCheck
  function solidL(cc, rr, up) {
    var ch = tileAt(cc, rr); if (ch === null) return true;
    if (up && inOZt(cc, rr)) return !inDeckT(cc, rr);
    return !!SOLID[ch];
  }
  function isSolidTile(cc, rr) { return solidL(cc, rr, curUp === null ? false : curUp); }
  var props = [], poles = { N: [], S: [] }, looseDecor = [], dynSolids = [];
  var routeMode = false;
  function circleRect(x, y, rad, x0, y0, x1, y1) {
    var cx = x < x0 ? x0 : (x > x1 ? x1 : x), cy = y < y0 ? y0 : (y > y1 ? y1 : y), dx = x - cx, dy = y - cy;
    return dx * dx + dy * dy < rad * rad;
  }
  function dynSkip(p) { return !p || p.off || (routeMode && (p.jefe || p.brGate || p.jefa)); }
  function touchesOZ(x, y, rad) { return x + rad > OZPX.x0 && x - rad < OZPX.x1 && y + rad > OZPX.y0 && y - rad < OZPX.y1; }
  // sin entidad: la capa del movimiento en curso o la de la entidad más cercana (solo si el círculo toca el puente)
  function guessUp(x, y) {
    if (curUp !== null) return curUp;
    var G = ACH.G; if (!G) return false;
    var best = 24 * 24, up = false, p = G.player;
    if (p) { var d0 = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y); if (d0 < best) { best = d0; up = !!p.brUp; } }
    var Z = G.zombies || [];
    for (var k = 0; k < Z.length; k++) { var z = Z[k], d = (z.x - x) * (z.x - x) + (z.y - y) * (z.y - y); if (d < best) { best = d; up = !!z.brUp; } }
    return up;
  }
  function collideL(x, y, rad, up) {
    var c0 = Math.floor((x - rad) / T), c1 = Math.floor((x + rad) / T), r0 = Math.floor((y - rad) / T), r1 = Math.floor((y + rad) / T), n, p;
    for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) if (solidL(cc, rr, up) && circleRect(x, y, rad, cc * T, rr * T, cc * T + T, rr * T + T)) return true;
    // los props y sólidos de la capa baja no estorban arriba del puente (y viceversa: el puente no tiene props)
    if (up && touchesOZ(x, y, rad) && x > OZPX.x0 && x < OZPX.x1) return false;
    for (n = 0; n < props.length; n++) { p = props[n]; if (p.fw > 0 && p.fh > 0 && circleRect(x, y, rad, p.x0, p.y0, p.x1, p.y1)) return true; }
    for (n = 0; n < dynSolids.length; n++) { p = dynSolids[n]; if (!dynSkip(p) && circleRect(x, y, rad, p.x0, p.y0, p.x1, p.y1)) return true; }
    return false;
  }
  function collideCircle(x, y, rad) { return collideL(x, y, rad, touchesOZ(x, y, rad) ? guessUp(x, y) : false); }
  function pointBlocked(x, y) {
    if (solidL(Math.floor(x / T), Math.floor(y / T), false)) return true;
    var n, p;
    for (n = 0; n < props.length; n++) { p = props[n]; if (p.fw > 0 && x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1) return true; }
    for (n = 0; n < dynSolids.length; n++) { p = dynSolids[n]; if (p && !p.off && x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1) return true; }
    return false;
  }
  function propAt(x, y) { for (var n = 0; n < props.length; n++) { var p = props[n]; if (p.fw > 0 && x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1) return p; } return null; }
  // línea de mira: el mar, el muro bajo de la playa, la pista y los muros de la Bajada no tapan (son bajos)
  var LOW = { V: 1, w: 1, C: 1, M: 1 };
  function los(x0, y0, x1, y1) {
    var dx = x1 - x0, dy = y1 - y0, d = Math.sqrt(dx * dx + dy * dy), n = Math.ceil(d / 6);
    for (var k = 1; k < n; k++) {
      var t = k / n, qx = x0 + dx * t, qy = y0 + dy * t, ch = tileAt(Math.floor(qx / T), Math.floor(qy / T));
      if (LOW[ch]) continue;
      if (inOZt(Math.floor(qx / T), Math.floor(qy / T))) continue;
      if (pointBlocked(qx, qy)) return false;
    }
    return true;
  }
  // capa: fuera del puente se decide por el piso (en la Bajada = abajo; en cualquier otro lado = arriba); dentro se conserva
  function fixLayer(ent) {
    if (!ent) return;
    var cc = Math.floor(ent.x / T), rr = Math.floor(ent.y / T);
    if (inOZt(cc, rr)) { if (ent.brUp === undefined) ent.brUp = false; return; }
    var ch = tileAt(cc, rr);
    ent.brUp = !(ch === 'b' || ch === 'e' || ch === 'M');
  }
  function moveCircle(ent, dx, dy, rad) {
    var hit = false, prev = curUp;
    if (ent && ent.brUp === undefined) fixLayer(ent);
    curUp = ent ? !!ent.brUp : false;
    try {
      if (dx !== 0) { if (!collideL(ent.x + dx, ent.y, rad, curUp)) ent.x += dx; else hit = true; }
      if (dy !== 0) { if (!collideL(ent.x, ent.y + dy, rad, curUp)) ent.y += dy; else hit = true; }
    } finally { curUp = prev; }
    fixLayer(ent);
    return hit;
  }
  function onDeck(ent) { return !!(ent && ent.brUp && ent.x >= DECKPX.x0 && ent.x <= DECKPX.x1 && ent.y >= DECKPX.y0 - 4 && ent.y <= DECKPX.y1 + 4); }
  // Salida: no hay salida caminando; el final lo dispara ACH.br.finish() (después del jefe y la cinemática).
  function inExitZone() { return false; }
  function inExit() { if (ACH.world && ACH.world._forceExit) { ACH.world._forceExit = false; return true; } return false; }
  function isStairs(x, y) { return tileAt(Math.floor(x / T), Math.floor(y / T)) === 'e'; }
  function inPena(x, y) { return x >= PENAPX.x0 && x < PENAPX.x1 && y >= PENAPX.y0 && y < PENAPX.y1; }
  function zona(x, y) {
    var cc = Math.floor(x / T), rr = Math.floor(y / T), ch = tileAt(cc, rr);
    if (cc <= 36) return 'playa';
    if (inOZt(cc, rr)) { var G = ACH.G, p = G && G.player; return (p && Math.abs(p.x - x) < 2 && Math.abs(p.y - y) < 2 && !p.brUp) ? 'bajada' : 'puente'; }
    if (ch === 'b' || ch === 'e' || ch === 'j' || (cc < 86 && rr >= 51)) return 'bajada';
    if (inR(cc, rr, ERMITA)) return 'ermita';
    if (cc < 106) return rr < 36 && cc >= 86 && cc < 100 ? 'bajada' : 'puente';
    if (cc <= GRAU.c1) return 'parque';
    if (cc >= PENA.wall.c0 && rr <= PENA.front.r1) return 'pena';
    if (cc >= PENA.wall.c0 - 2 && rr >= CALLE_B.r0 && rr <= CALLE_B.r1) return 'pena';
    return 'bohemia';
  }
  function tramoAt(x, y) {
    var z = zona(x, y), cc = Math.floor(x / T), rr = Math.floor(y / T);
    if (z === 'ermita' && inR(cc, rr, MIRADOR)) return 'mirador';
    if (z === 'puente' && !inOZt(cc, rr)) return cc >= 86 && rr >= 36 ? 'zepita' : 'gardel';
    if (z === 'parque' && cc >= GRAU.c0) return 'grau';
    return z;
  }
  // avance del recorrido 0..1 (la música de exploración y la hora lo leen)
  function progress(p) {
    var cc = Math.floor(p.x / T), rr = Math.floor(p.y / T), z = zona(p.x, p.y);
    if (z === 'playa') return 0.02 + 0.04 * Math.max(0, Math.min(1, (p.x - 10 * T) / (26 * T)));
    if (z === 'bajada') { var b = BAJS[rr * COLS + cc]; return 0.06 + 0.24 * (b === undefined ? bajDist(p.x / T, p.y / T).s : b); }
    if (z === 'puente' || z === 'ermita') return 0.34;
    if (z === 'parque') return 0.45 + 0.1 * Math.max(0, Math.min(1, (p.x - 106 * T) / (38 * T)));
    if (z === 'bohemia') return 0.6 + 0.25 * Math.max(0, Math.min(1, (p.x - 145 * T) / (70 * T)));
    return 0.9;
  }
  function respawnOk(ch) { return ch === 'k' || ch === 'b' || ch === 'h' || ch === 'v' || ch === 'g' || ch === 'p'; }

  /* ---------------- Props horneados ---------------- */
  function ensureProps() {
    var S = ACH.sprites = ACH.sprites || {}, P = S.props = S.props || {};
    Object.keys(PROV).forEach(function (k) {
      var art = brProp(k), key = 'br_' + k;
      if (art) { P[key] = art; return; }
      if (P[key] && (Array.isArray(P[key]) ? P[key].brProv : P[key].brProv)) return;
      var d = PROV[k], spr = BR.prov ? BR.prov('brprop.' + k, d[0], d[1], d[2], d[5], { fw: d[3], fh: d[4] }) : null;
      if (!spr) return;
      if (LAMPS[k]) spr.lamp = LAMPS[k][0];
      if (d[6]) spr.tall = true;
      spr.placeholder = true; spr.brProv = true;
      P[key] = spr;
    });
  }
  function footFor(k, spr, decor) {
    if (decor) return { fw: 0, fh: 0, tall: !!spr.tall, tree: false };
    var F = FOOTFIX[k];
    if (F) return { fw: F.fw, fh: F.fh, tall: spr.tall !== undefined ? (!!spr.tall || !!F.tall) : !!F.tall, tree: !!F.tree };
    return { fw: typeof spr.fw === 'number' ? spr.fw : 0, fh: typeof spr.fh === 'number' ? spr.fh : 0, tall: !!spr.tall, tree: false };
  }
  var buildMs = 0;
  function buildProps() {
    var t0 = (window.performance || Date).now();
    ensureTiles(); ensureProps(); ensureLotArchs(); ensureBreakables();
    props.length = 0; poles.N.length = 0; poles.S.length = 0; looseDecor.length = 0;
    for (var d = decals.length - 1; d >= 0; d--) if (decals[d].auto) decals.splice(d, 1);
    var shadeN = 0;
    for (var n = 0; n < PROPS.length; n++) {
      var p = PROPS[n], k = 'br_' + p.k, v = p.v || 0;
      var spr = ACH.gfx.prop(k, v, p.dir, null);
      var x = Math.round(p.c * T), y = Math.round(p.r * T);
      // decoración sobre sólido (muros, quebrada, pista): sin huella
      var onSolid = SOLID[tileAt(Math.floor(p.c), Math.floor(p.r - 0.01))];
      var f = footFor(p.k, spr, p.decor || onSolid);
      var bp = { k: k, v: v, dir: p.dir || 'E', x: x, y: y, fw: f.fw, fh: f.fh, tall: f.tall, tree: f.tree,
        x0: x - f.fw / 2, x1: x + f.fw / 2, y0: y - f.fh, y1: y, cob: false, fade: 1, fb: null, lift: 0, sortDy: 0, br: true };
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
        if (!pr || !pr.br || !info || !info.broke || !BREAK[pr.k] || pr._brLoot) return false;
        pr._brLoot = true;
        var defs = ACH.inv && ACH.inv.defs, items;
        if (BREAK[pr.k].botellas && defs && defs.botella) items = [{ id: 'botella', n: 1 + Math.floor(Math.random() * 3) }];   // §4.2: 1–3 botellas
        else items = [{ id: 'sencillo', n: 1 + Math.floor(Math.random() * 3) }];
        try { if (ACH.inv && ACH.inv.drop) ACH.inv.drop(pr.x, pr.y + 4, items, true); } catch (e) { /* nada */ }
        return false;
      });
    }
  }

  /* ---------------- Arquetipos de lote ---------------- */
  // Fachada de bar/peña: ACH.sprites.br.casona.fachada(brand, wTiles) → {cv, ax, ay, lights, noche}. Sin el arte: casona con el letrero.
  var PCOL = [['#f0e4c8', '#b5523b'], ['#d9a441', '#5b3a29'], ['#a9d0c4', '#2f5d3a'], ['#9db7d6', '#5e7fa3'], ['#e8b7a0', '#b5523b'], ['#d98c8c', '#5b3a29'], ['#efead8', '#2b2b30']];
  function provCasona(g, w, h, face, seed, name) {
    var top = Math.max(0, h - face * T), C = PCOL[seed % PCOL.length];
    g.fillStyle = '#1c1a22'; g.fillRect(1, top, w - 2, h - top);
    g.fillStyle = C[0]; g.fillRect(2, top + 1, w - 4, h - top - 2);
    g.fillStyle = 'rgba(0,0,0,.12)'; for (var q = 0; q < 10; q++) { var hh = hashT(seed, q); g.fillRect(3 + hh % Math.max(1, w - 10), top + 4 + (hh >>> 8) % Math.max(1, h - top - 10), 4, 3); }   // descascarado
    g.fillStyle = C[1]; g.fillRect(2, top, w - 4, 3);                                                   // cornisa
    g.fillStyle = '#5b3a29'; g.fillRect(4, top + 8, w - 8, 9);                                            // balcón de cajón
    g.fillStyle = '#8a5a34'; for (var x = 6; x < w - 8; x += 6) g.fillRect(x, top + 9, 4, 7);
    g.fillStyle = '#2b2b30'; for (x = 8; x < w - 10; x += 14) g.fillRect(x, h - 24, 6, 12);               // ventanas con reja
    g.fillStyle = '#5b3a29'; g.fillRect(Math.floor(w / 2) - 6, h - 22, 12, 22);                           // portón de dos hojas
    g.fillStyle = '#3a2418'; g.fillRect(Math.floor(w / 2), h - 22, 1, 22);
    if (name && BR.label) { g.fillStyle = '#1c1a22'; g.fillRect(4, top + 19, w - 8, 9); BR.label(g, name, w, 9, '#f2d480', top + 20); }
    return [{ x: Math.floor(w / 2), y: h - 18, w: 10, h: 14, kind: 'local' }, { x: 11, y: h - 18, w: 6, h: 10, kind: 'ventana' }];
  }
  function fachadaLot(f) {
    var w = (f.c1 - f.c0 + 1) * T, h = (f.r1 - f.r0 + 1) * T, cv = mkc(w, h), g = cv.getContext('2d'), lights = [];
    g.imageSmoothingEnabled = false;
    var K = SBR().casona, res = null;
    if (K && typeof K.fachada === 'function') { try { res = K.fachada(f.brand, f.c1 - f.c0 + 1); } catch (e) { res = null; console.warn('[ACHORADO br] fachada ' + f.brand, e); } }
    if (res && isCv(res.cv)) {
      var ax = typeof res.ax === 'number' ? res.ax : res.cv.width / 2, ay = typeof res.ay === 'number' ? res.ay : res.cv.height;
      var dx = Math.round(w / 2 - ax), dy = Math.round(h - ay);
      g.drawImage(res.cv, dx, dy);
      (res.lights || []).forEach(function (q) { lights.push({ x: q.x + dx, y: q.y + dy, w: q.w, h: q.h, kind: q.kind || 'local', col: q.col }); });
    } else lights = provCasona(g, w, h, f.face || 7, f.seed || 0, f.name);
    return { canvas: cv, over: null, overX: 0, overY: 0, lights: lights, face: f.face || 7 };
  }
  function casonaLot(f) {
    var w = (f.c1 - f.c0 + 1) * T, h = (f.r1 - f.r0 + 1) * T, cv = mkc(w, h), g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    var lights = provCasona(g, w, h, f.face || 7, f.seed || 0, f.muni ? f.name : '');
    return { canvas: cv, over: null, overX: 0, overY: 0, lights: lights, face: f.face || 7 };
  }
  function ensureLotArchs() {
    var S = ACH.sprites, LA = S && S.lotArch; if (!LA) { if (S) LA = S.lotArch = {}; else return; }
    for (var n = 1; n <= 6; n++) { var a = 'br_casona' + n; if (typeof LA[a] !== 'function') { LA[a] = casonaLot; LA[a].prov = true; } }
    ['br_iglesia', 'br_biblioteca'].forEach(function (a) { if (typeof LA[a] !== 'function') { LA[a] = casonaLot; LA[a].prov = true; } });
    LA.br_fachada = fachadaLot;   // propio del motor de Barranco (usa casona.fachada() de B2b adentro)
  }

  /* ---------------- Horneado extra del suelo: sombra del puente y el letrero de las calles ---------------- */
  function bakeExtra(g) {
    // la sombra del Puente de los Suspiros sobre la Bajada (el sol del atardecer viene del mar: corrida al este)
    var sh = spriteOf('puente', 'sombra');
    if (sh) { for (var x = DECKPX.x0; x < DECKPX.x1; x += sh.width) g.drawImage(sh, x, DECKPX.y0 + 6); }
    else { g.fillStyle = 'rgba(28,22,40,.38)'; g.fillRect(DECKPX.x0 + 10, DECKPX.y0 + 8, DECKPX.x1 - DECKPX.x0 - 6, DECKPX.y1 - DECKPX.y0); }
    // nombres de calle pintados en la vereda (rótulos chicos)
    if (BR.label) {
      [[CALLE_A, 150], [CALLE_B, 150], [UNION, 0]].forEach(function (q) {
        var c2 = mkc(96, 8); BR.label(c2.getContext('2d'), q[0].name, 96, 8, '#f3efe2', 0);
        if (q[1]) g.drawImage(c2, q[1] * T, q[0].r0 * T + 4); else g.drawImage(c2, (q[0].c0 - 1) * T, (q[0].r0 + 2) * T);
      });
      var c3 = mkc(120, 8); BR.label(c3.getContext('2d'), 'CIRCUITO DE PLAYAS', 120, 8, '#f3efe2', 0); g.save(); g.translate(31 * T, 30 * T); g.rotate(Math.PI / 2); g.drawImage(c3, 0, 0); g.restore();
    }
  }
  function spriteOf(k, sub) { var o = brProp(k); if (o && sub) o = o[sub]; if (Array.isArray(o)) o = o[0]; return isCv(o) ? o : null; }

  /* ---------------- El Puente de los Suspiros (por cuadro) y el techo de la peña ----------------
     v0.16: el puente es un objeto con profundidad (drawHooks.ysort), no una capa entera de suelo o de aire:
       · cuerpo (orden y = borde sur + 2): estribos de piedra, tornapuntas, fascia, tablas, baranda norte y faroles del norte.
         Lo que está DEBAJO (capa baja, y menor) queda tapado del todo, también en las capas de tinte/rim (el motor borra con su forma).
       · baranda sur (orden y = borde sur + 5): va DELANTE de quien camina arriba.
       · quien está arriba sobre el tablero se ordena entre las dos (ver bumpUp); quien está en la Bajada al sur queda delante. */
  var brg = null;
  function kitPuente() { var l = SBR().lugar || {}, k = l.puente; return k && typeof k === 'object' && isCv(k.baranda) ? k : null; }
  function bakeBridge() {
    var K = kitPuente(), W = DECKPX.x1 - DECKPX.x0, DH = DECKPX.y1 - DECKPX.y0, TOP = 60, FAS = 12, LOW = 46;
    var Y0 = TOP, Y1 = TOP + DH, H = Y1 + FAS + LOW;
    var body = mkc(W, H), g = body.getContext('2d'), rail = mkc(W, H), rg = rail.getContext('2d');
    g.imageSmoothingEnabled = false; rg.imageSmoothingEnabled = false;
    var gapX = (LANDING.c0 - DECK.c0) * T;                    // sin baranda norte frente al descanso (por ahí se sube)
    var x, y, i;
    function px1(gg, xx, yy, ww, hh, c) { gg.fillStyle = c; gg.fillRect(xx, yy, ww, hh); }
    // --- estribos de piedra: sobre los muros de la Bajada, enmarcando el paso de abajo (columnas 65 y 75, donde están los muros al sur)
    function pier(cxp, hgt) {
      var pw = 22, x0 = Math.round(cxp - pw / 2), y0 = Y1 + 6;
      px1(g, x0 - 2, y0 + hgt - 4, pw + 4, 4, '#3a3440');                                    // zapata
      for (var yy = 0; yy < hgt - 4; yy += 6) for (var xx = ((yy / 6) % 2) * 5 - 5; xx < pw; xx += 10) {
        var bx = Math.max(0, xx), bw = Math.min(pw, xx + 9) - bx; if (bw <= 0) continue;
        var tone = hashT(cxp + xx, yy) % 3, base = ['#8d8276', '#7d7368', '#968a7c'][tone];
        px1(g, x0 + bx, y0 + yy, bw, 5, base); px1(g, x0 + bx, y0 + yy, bw, 1, '#b3a796'); px1(g, x0 + bx, y0 + yy + 5, bw, 1, '#4c4450');
      }
      px1(g, x0, y0, 2, hgt - 4, 'rgba(255,240,215,.18)');                                     // luz del oeste (el mar)
      px1(g, x0 + pw - 4, y0, 4, hgt - 4, 'rgba(20,16,30,.35)');                              // sombra del este
      px1(g, x0 - 1, y0, 1, hgt, '#1c1a22'); px1(g, x0 + pw, y0, 1, hgt, '#1c1a22');
      px1(g, x0 - 3, y0 - 2, pw + 6, 3, '#a39886'); px1(g, x0 - 3, y0 - 2, pw + 6, 1, '#cfc4b0');   // cornisa bajo la viga
      return { x0: x0, x1: x0 + pw, top: y0 };
    }
    var pW = pier((65.5 - DECK.c0) * T, LOW - 4), pE = pier((75 - DECK.c0) * T, LOW - 4);
    // --- tornapuntas de madera bajo el tramo (de cada estribo hacia el centro) y vigas bajo la fascia
    function beam(x1, y1, x2, y2, w) {
      for (var t = 0; t <= 1; t += 1 / Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))) {
        var xx = Math.round(x1 + (x2 - x1) * t), yy = Math.round(y1 + (y2 - y1) * t);
        px1(g, xx, yy, w, 1, '#1c1a22'); px1(g, xx, yy + 1, w, 2, '#6e3a28'); px1(g, xx, yy + 1, 1, 2, '#8a4b32'); px1(g, xx, yy + 3, w, 1, '#1c1a22');
      }
    }
    var mid = (pW.x1 + pE.x0) / 2, span = pE.x0 - pW.x1;
    beam(pW.x1, pW.top + 16, pW.x1 + span * 0.32, Y1 + FAS, 3); beam(pE.x0 - 3, pE.top + 16, pE.x0 - span * 0.32, Y1 + FAS, 3);
    beam(mid - span * 0.18, Y1 + FAS, mid - 2, Y1 + FAS + 8, 2); beam(mid + span * 0.18, Y1 + FAS, mid + 2, Y1 + FAS + 8, 2);
    // postes de madera sobre la quebrada, fuera de los estribos
    for (x = 18; x < W - 6; x += 48) {
      if (x > pW.x0 - 14 && x < pE.x1 + 6) continue;
      if (x >= gapX - 8) continue;                                                             // el descanso ya es piso firme
      px1(g, x - 1, Y1 + FAS - 2, 6, 26, '#1c1a22'); px1(g, x, Y1 + FAS - 2, 4, 25, '#6e3a28'); px1(g, x, Y1 + FAS - 2, 1, 25, '#a05e3e');
      px1(g, x - 3, Y1 + FAS + 22, 10, 3, '#4c4450');
    }
    // sombra bajo el tablero (sobre lo que cuelga)
    var sg = g.createLinearGradient(0, Y1 + FAS, 0, Y1 + FAS + 10); sg.addColorStop(0, 'rgba(14,10,22,.55)'); sg.addColorStop(1, 'rgba(14,10,22,0)');
    g.fillStyle = sg; g.fillRect(0, Y1 + FAS, gapX, 10);
    // --- fascia (cara sur de la viga): la del kit (filas 40–52 de pisoAlto) o una viga dibujada
    var pa = K && K.pisosAlto;
    for (x = 0; x < W; x += 16) {
      if (pa && isCv(pa[0]) && pa[0].height >= 52) g.drawImage(pa[(x / 16 * 7) % pa.length], 0, 40, 16, 12, x, Y1, 16, FAS);
      else { px1(g, x, Y1, 16, FAS, '#6e3a28'); px1(g, x, Y1, 16, 2, '#b9714a'); px1(g, x, Y1 + FAS - 1, 16, 1, '#2a1a16'); px1(g, x + 15, Y1 + 2, 1, FAS - 3, '#4f2a1e'); }
    }
    px1(g, 0, Y1 + FAS, W, 1, '#1c1a22');
    // --- tablero: tablas cruzadas (N–S, se camina de través), 4 px, con juntas de tope, clavos sobre las dos vigas y desgaste al centro
    var TB = ['#8a4b32', '#94523a', '#a05e3e', '#86482f', '#9a5a3a'];
    for (x = 0; x < W; x += 4) {
      var hp = hashT(x, 77), base0 = TB[hp % TB.length], jy = Y0 + 8 + (hp >>> 5) % (DH - 16);
      px1(g, x, Y0, 4, DH, base0);
      px1(g, x, Y0, 1, DH, 'rgba(255,214,160,.16)');                                          // canto con luz (oeste)
      px1(g, x + 3, Y0, 1, DH, '#4f2a1e');                                                    // rendija
      if ((hp >>> 3) % 3 === 0) px1(g, x, jy, 3, 1, '#5a3022');                              // junta de tope
      px1(g, x + 1, Y0 + 7, 1, 1, '#2a2228'); px1(g, x + 1, Y1 - 8, 1, 1, '#2a2228');           // clavos sobre las vigas
      if ((hp >>> 9) % 7 === 0) px1(g, x + 1, Y0 + 12 + (hp >>> 12) % (DH - 24), 2, 2, '#6e3a28');   // nudo
    }
    var wg = g.createLinearGradient(0, Y0, 0, Y1);                                             // desgaste: el centro, más claro
    wg.addColorStop(0, 'rgba(255,220,170,0)'); wg.addColorStop(0.5, 'rgba(255,220,170,.10)'); wg.addColorStop(1, 'rgba(255,220,170,0)');
    g.fillStyle = wg; g.fillRect(0, Y0, W, DH);
    px1(g, 0, Y0, gapX, 3, 'rgba(28,20,30,.45)');                                              // sombra de la baranda norte
    px1(g, 0, Y1 - 1, W, 1, 'rgba(255,220,170,.35)');                                           // canto sur con luz
    px1(g, 0, Y0, 2, DH, '#1c1a22'); px1(g, W - 2, Y0, 2, DH, 'rgba(28,26,34,.5)');
    // --- baranda norte (vista por dentro) y la del sur (delante), del kit o dibujadas
    var bn = K && K.barandaN, bs = K && K.baranda;
    function railRow(gg, spr, yb, x0, x1, north) {
      if (spr && isCv(spr)) { for (var xx = x0; xx < x1; xx += spr.width) gg.drawImage(spr, 0, 0, Math.min(spr.width, x1 - xx), spr.height, xx, yb - spr.height, Math.min(spr.width, x1 - xx), spr.height); return; }
      var hh = north ? 14 : 20, yy = yb - hh;
      px1(gg, x0, yy, x1 - x0, 3, '#1c1a22'); px1(gg, x0, yy + 1, x1 - x0, 1, '#b9714a');
      for (var bx = x0 + 2; bx < x1; bx += 4) { px1(gg, bx, yy + 3, 2, hh - 5, '#1c1a22'); px1(gg, bx, yy + 3, 1, hh - 6, '#8a4b32'); }
      px1(gg, x0, yb - 3, x1 - x0, 3, '#4f2a1e');
    }
    railRow(g, bn, Y0 + 4, 0, gapX, true);
    px1(g, gapX - 3, Y0 - 14, 4, 18, '#1c1a22'); px1(g, gapX - 2, Y0 - 13, 2, 16, '#a05e3e');   // poste de remate junto al descanso
    railRow(rg, bs, Y1 + 3, 0, W, false);
    // --- faroles en las cabeceras (norte en el cuerpo, sur delante)
    var fs = K && K.farol;
    function lamp(gg, lx, ly) {
      if (fs && isCv(fs)) { gg.drawImage(fs, Math.round(lx - (fs.ax !== undefined ? fs.ax : fs.width / 2)), Math.round(ly - (fs.ay !== undefined ? fs.ay : fs.height))); return; }
      px1(gg, lx - 1, ly - 40, 3, 40, '#1c1a22'); px1(gg, lx - 3, ly - 46, 7, 7, '#1c1a22'); px1(gg, lx - 2, ly - 45, 5, 5, '#ffc766');
    }
    lamp(g, 6, Y0 + 2); lamp(g, gapX - 10, Y0 + 2);
    lamp(rg, 6, Y1 + 4); lamp(rg, W - 8, Y1 + 4);
    brg = { body: body, rail: rail, top: TOP, w: W, h: H };
  }
  // quien camina ARRIBA del tablero se dibuja después del cuerpo del puente y antes de la baranda sur
  function onDeckRect(e) { return e && e.brUp && e.x >= DECKPX.x0 - 4 && e.x <= DECKPX.x1 + 4 && e.y >= DECKPX.y0 - 8 && e.y <= DECKPX.y1 + 4; }
  function bumpUp(list) {
    for (var i = 0; i < list.length; i++) {
      var e = list[i], ent = e.player || e.z || e.dog || e.cat;
      if (ent && onDeckRect(ent)) e.y = DECKPX.y1 + 3 + (ent.y - DECKPX.y0) * 0.02;
    }
  }
  function blitBridge(g, cx, cy, which, G) {
    if (!brg) bakeBridge();
    var cv = which === 'rail' ? brg.rail : brg.body, x = DECKPX.x0 - cx, y = DECKPX.y0 - brg.top - cy;
    g.drawImage(cv, Math.round(x), Math.round(y));
    if (which === 'body' && G) {   // sombras de contacto de quien está arriba (las del suelo quedan debajo del tablero)
      var ents = [G.player].concat(G.zombies || []);
      g.fillStyle = 'rgba(20,12,24,.32)';
      for (var i = 0; i < ents.length; i++) {
        var e = ents[i]; if (!e || !onDeckRect(e) || (e.state === 'muerto') || (e === G.player && e.hp <= 0)) continue;
        g.beginPath(); g.ellipse(Math.round(e.x) - cx, Math.round(e.y) - cy + 1, 7, 2.5, 0, 0, Math.PI * 2); g.fill();
      }
    }
  }
  /* v0.16: el puente peatonal sobre el Circuito de Playas, dibujado justo sobre lo que se camina (FOOTB, filas 77–79):
     tablero de concreto sobre la pista, escaleras en las dos puntas (bajan hacia la playa y hacia la Bajada: la cara sur es un
     triángulo que se achica), columnas, baranda norte (en el suelo, detrás) y baranda sur (delante de quien cruza). */
  var foot = null, FPX = { x0: 26 * T, x1: 39 * T, y0: FOOTB.r0 * T, y1: (FOOTB.r1 + 1) * T };
  function bakeFoot() {
    var W = FPX.x1 - FPX.x0, DH = FPX.y1 - FPX.y0, TOP = 26, EL = 30, Y0 = TOP, Y1 = TOP + DH, H = Y1 + EL + 6;
    var body = mkc(W, H), g = body.getContext('2d'), rail = mkc(W, H), rg = rail.getContext('2d');
    g.imageSmoothingEnabled = false; rg.imageSmoothingEnabled = false;
    function f(gg, x, y, w, h, c) { gg.fillStyle = c; gg.fillRect(x, y, w, h); }
    var dx0 = (ROAD.c0 - 26) * T, dx1 = (ROAD.c1 + 1 - 26) * T;                // tablero sobre la pista
    var sw0 = dx0 - 2 * T, sx1 = dx1 + 2 * T;                                  // escaleras: 2 tiles a cada lado
    var CON = ['#5f5a56', '#77716a', '#8e877d', '#a39b8f', '#bdb5a6'], RA = ['#203a30', '#2f5242', '#3f6a56', '#56856e', '#79a690'];
    var x, y, k;
    // columnas bajo el tablero (sobre la pista)
    [dx0 + 22, dx1 - 30].forEach(function (cxp) {
      f(g, cxp - 1, Y1 + 6, 12, EL - 4, '#1c1a22'); f(g, cxp, Y1 + 6, 10, EL - 5, CON[2]); f(g, cxp, Y1 + 6, 2, EL - 5, CON[4]); f(g, cxp + 7, Y1 + 6, 3, EL - 5, CON[1]);
      f(g, cxp - 3, Y1 + EL, 16, 3, CON[1]); f(g, cxp - 3, Y1 + EL, 16, 1, CON[3]);
    });
    // cara sur del tablero (viga) y sombra debajo
    f(g, dx0, Y1, dx1 - dx0, 8, CON[1]); f(g, dx0, Y1, dx1 - dx0, 2, CON[3]); f(g, dx0, Y1 + 7, dx1 - dx0, 1, '#2a2630');
    var sg = g.createLinearGradient(0, Y1 + 8, 0, Y1 + 18); sg.addColorStop(0, 'rgba(14,10,22,.5)'); sg.addColorStop(1, 'rgba(14,10,22,0)');
    g.fillStyle = sg; g.fillRect(dx0, Y1 + 8, dx1 - dx0, 10);
    // caras sur de las escaleras: triángulos que bajan hacia afuera (de la altura de la viga a cero)
    function stairFace(xa, xb) {                                               // xa = punta alta (junto al tablero), xb = pie
      var n = Math.abs(xb - xa), dir = xb > xa ? 1 : -1;
      for (k = 0; k <= n; k++) {
        var hh = Math.round(8 * (1 - k / n)); if (hh <= 0) continue;
        var xx = xa + k * dir;
        f(g, xx, Y1, 1, hh, (k % 6 < 1) ? CON[0] : CON[1]); f(g, xx, Y1, 1, 1, CON[3]); f(g, xx, Y1 + hh, 1, 1, '#2a2630');
      }
    }
    stairFace(dx0 - 1, sw0); stairFace(dx1, sx1);
    // tablero: losas de concreto con juntas y desgaste
    for (x = dx0; x < dx1; x++) for (y = Y0; y < Y1; y++) {
      var h0 = hashT(x, y), c = ((x - dx0) % 24 === 0 || (y - Y0) % 16 === 15) ? CON[1] : (h0 % 23 === 0 ? CON[1] : (h0 % 7 === 0 ? CON[4] : CON[3]));
      f(g, x, y, 1, 1, c);
    }
    // escaleras: peldaños con contrahuella vertical (bajan hacia afuera), luz en la huella
    function steps(xa, xb) {
      var dir = xb > xa ? 1 : -1, n = 6, len = Math.abs(xb - xa), sw = len / n;
      for (k = 0; k < n; k++) {
        var s0 = Math.round(xa + dir * k * sw), s1 = Math.round(xa + dir * (k + 1) * sw), lo = Math.min(s0, s1), hi = Math.max(s0, s1);
        var tone = 1 - k / n * 0.18;
        f(g, lo, Y0, hi - lo, DH, shadeHex(CON[3], tone));
        f(g, dir > 0 ? hi - 1 : lo, Y0, 1, DH, '#3a3640');                    // contrahuella (borde que baja)
        f(g, dir > 0 ? lo : hi - 1, Y0, 1, DH, CON[4]);                       // nariz del peldaño con luz
      }
    }
    steps(dx0, sw0); steps(dx1, sx1);
    f(g, sw0, Y0, sx1 - sw0, 2, 'rgba(28,20,30,.35)');                       // sombra de la baranda norte
    // barandas de tubo verde (malla), norte detrás y sur delante; siguen por las escaleras
    function railRow(gg, x0, x1, yb, hh, front) {
      var yt = yb - hh;
      f(gg, x0, yt, x1 - x0, 2, RA[3]); f(gg, x0, yt, x1 - x0, 1, RA[4]); f(gg, x0, yb - 2, x1 - x0, 2, RA[1]);
      for (var px_ = x0; px_ < x1; px_ += 3) f(gg, px_, yt + 2, 1, hh - 4, front ? RA[2] : RA[1]);
      for (px_ = x0; px_ <= x1 - 2; px_ += 16) { f(gg, px_, yt - 1, 2, hh + 1, RA[0]); f(gg, px_, yt - 1, 1, hh, RA[3]); }
      f(gg, x0, yt - 1, x1 - x0, 1, '#1c1a22');
    }
    railRow(g, sw0, sx1, Y0 + 3, 14, false);
    railRow(rg, sw0, sx1, Y1 + 2, 18, true);
    foot = { body: body, rail: rail, top: TOP, w: W, h: H };
  }
  function shadeHex(h, t) { var r = parseInt(h.substr(1, 2), 16) * t, g2 = parseInt(h.substr(3, 2), 16) * t, b = parseInt(h.substr(5, 2), 16) * t; return 'rgb(' + (r | 0) + ',' + (g2 | 0) + ',' + (b | 0) + ')'; }
  function footVisible(cx, cy) {
    var V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
    return !(FPX.x0 - cx > V.w || FPX.x1 - cx < 0 || FPX.y0 - 30 - cy > V.h || FPX.y1 + 40 - cy < 0);
  }
  function drawFoot(g, cx, cy, which) {
    if (!foot) bakeFoot();
    g.drawImage(which === 'rail' ? foot.rail : foot.body, Math.round(FPX.x0 - cx), Math.round(FPX.y0 - foot.top - cy));
  }
  var FOOT_RAIL = { x: 0, y: 0, vol: false, draw: function (g, cx, cy) { drawFoot(g, cx, cy, 'rail'); } };
  var BR_BODY = { x: 0, y: 0, vol: false, draw: function (g, cx, cy, G) { blitBridge(g, cx, cy, 'body', G); } };
  var BR_RAIL = { x: 0, y: 0, vol: false, draw: function (g, cx, cy) { blitBridge(g, cx, cy, 'rail'); } };
  function bridgeVisible(cx, cy) {
    var V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }, h = brg ? brg.h : 180, top = brg ? brg.top : 60;
    return !(DECKPX.x0 - cx > V.w || DECKPX.x1 - cx < 0 || DECKPX.y0 - top - cy > V.h || DECKPX.y0 - top + h - cy < 0);
  }
  var roofCv = null;   // techo de la peña (horneado una vez)
  function bakeRoof() {
    var x0 = PENA.wall.c0 * T, x1 = (PENA.wall.c1 + 1) * T, y0 = PENA.wall.r0 * T - 8, y1 = PENA.front.r0 * T, w = x1 - x0, h = y1 - y0, c2 = mkc(w, h), g = c2.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#1c1a22'; g.fillRect(0, 0, w, h);
    for (var y = 2; y < h - 2; y += 6) for (var x = ((y / 6) % 2) * 5 + 2; x < w - 2; x += 10) { g.fillStyle = (hashT(x, y) % 4) ? '#9c4636' : '#7a3330'; g.fillRect(x, y, 9, 5); g.fillStyle = '#cf7a58'; g.fillRect(x, y, 9, 1); }
    g.fillStyle = '#5b3a29'; g.fillRect(0, h - 6, w, 6);
    if (BR.label) { var lc = mkc(160, 9); BR.label(lc.getContext('2d'), 'PEÑA LA ÚLTIMA JARANA', 160, 9, '#ffc766', 1); g.drawImage(lc, Math.round(w / 2 - 80), Math.round(h / 2)); }
    roofCv = { cv: c2, x: x0, y: y0, a: 1 };
  }
  function playerUp(G) { var p = G && G.player; return !!(p && p.brUp); }
  ACH.drawHooks = ACH.drawHooks || { ground: [], ysort: [], air: [], screen: [] };
  ['ground', 'ysort', 'air', 'screen'].forEach(function (kk) { if (!Array.isArray(ACH.drawHooks[kk])) ACH.drawHooks[kk] = []; });
  function isBR() { return ACH.world && ACH.world.id === 'barranco'; }
  ACH.drawHooks.ground.unshift(function (ctx, G, cx, cy) { if (isBR()) drawSea(ctx, G, cx, cy); });
  // v0.16: el puente va en el orden por profundidad (ver bakeBridge); el motor le pasa la lista para ordenar a quien está arriba
  ACH.drawHooks.ground.push(function (ctx, G, cx, cy) { if (isBR() && footVisible(cx, cy)) drawFoot(ctx, cx, cy, 'body'); });
  ACH.drawHooks.ysort.push(function (G) {
    if (!isBR() || !G || !G.cam || !footVisible(Math.round(G.cam.x), Math.round(G.cam.y))) return null;
    FOOT_RAIL.x = (FPX.x0 + FPX.x1) / 2; FOOT_RAIL.y = FPX.y1 + 5;
    return [FOOT_RAIL];
  });
  ACH.drawHooks.ysort.push(function (G, list) {
    if (!isBR() || !G || !G.cam) return null;
    var cx = Math.round(G.cam.x), cy = Math.round(G.cam.y);
    if (!bridgeVisible(cx, cy)) return null;
    if (list) bumpUp(list);
    BR_BODY.x = BR_RAIL.x = (DECKPX.x0 + DECKPX.x1) / 2;
    BR_BODY.y = DECKPX.y1 + 2; BR_RAIL.y = DECKPX.y1 + 5;
    return [BR_BODY, BR_RAIL];
  });
  ACH.drawHooks.air.push(function (ctx, G, cx, cy) {
    if (!isBR()) return;
    // techo de la peña: se ve desde la calle; adentro se aparta
    if (!roofCv) bakeRoof();
    var p = G.player, jb = BR.jaranon, inside = (p && inPena(p.x, p.y + 6)) || !!(jb && (jb.state === 'entrada' || jb.state === 'pelea' || jb.state === 'muriendo')), want = inside ? 0 : 1;   // QA: la entrada del jefe salta con Alexander en el umbral (y≈636, fuera de inPena): el techo tapaba toda la peña
    roofCv.a += (want - roofCv.a) * 0.15; if (Math.abs(want - roofCv.a) < 0.02) roofCv.a = want;
    if (roofCv.a <= 0.01) return;
    var V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }, rx = roofCv.x - cx, ry = roofCv.y - cy;
    if (rx > V.w || rx + roofCv.cv.width < 0 || ry > V.h || ry + roofCv.cv.height < 0) return;
    ctx.globalAlpha = roofCv.a; ctx.drawImage(roofCv.cv, Math.round(rx), Math.round(ry)); ctx.globalAlpha = 1;
  });
  if (ACH.lienzo && typeof ACH.lienzo.onRebake === 'function') { try { ACH.lienzo.onRebake(function () { brg = null; foot = null; roofCv = null; }); } catch (e) { /* nada */ } }

  /* ---------------- El mar al oeste (por cuadro, en drawHooks.ground) ---------------- */
  // B2a: lugar.mar.draw(ctx, camX, camY, t, anchoVista) y lugar.morro.draw(...) en coordenadas de PANTALLA, recortados a la banda del mar
  // (columnas 0–9 de todo el alto, más el mar del sur, filas 97–99 hasta la pista). Sin el arte: tiles de mar horneados + olas que corren.
  function drawSea(ctx, G, cx, cy) {
    var Vw = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }, any = false, k;
    for (k = 0; k < SEA.length; k++) { var s = SEA[k]; if (s.x1 - cx > 0 && s.x0 - cx < Vw.w && s.y1 - cy > 0 && s.y0 - cy < Vw.h) any = true; }
    if (!any) return;
    var L = SBR().lugar || {}, t = G.clock || 0;
    ctx.save(); ctx.beginPath();
    for (k = 0; k < SEA.length; k++) ctx.rect(SEA[k].x0 - cx, SEA[k].y0 - cy, SEA[k].x1 - SEA[k].x0, SEA[k].y1 - SEA[k].y0);
    ctx.clip();
    var ok = false;
    if (L.mar && typeof L.mar.draw === 'function' && !drawSea.bad) { try { L.mar.draw(ctx, cx, cy, t, Vw.w); ok = true; } catch (e) { drawSea.bad = true; console.warn('[ACHORADO br] mar.draw', e); } }
    if (L.morro && typeof L.morro.draw === 'function' && !drawSea.mbad) { try { L.morro.draw(ctx, cx, cy, t, Vw.w); } catch (e2) { drawSea.mbad = true; console.warn('[ACHORADO br] morro.draw', e2); } }
    if (!ok) {   // olas provisorias: rayas de espuma que corren hacia la orilla
      ctx.fillStyle = 'rgba(233,228,216,.55)';
      for (var y = Math.floor(cy / 12) * 12; y < cy + Vw.h; y += 12) {
        var off = ((t * 14 + y * 0.7) % 160);
        for (var x = -40 + off; x < 10 * T; x += 160) ctx.fillRect(Math.round(x - cx), Math.round(y - cy), 18, 1);
      }
    }
    ctx.restore();
  }

  /* ---------------- Debug: ruta y spawns ---------------- */
  // BFS en celdas de 4 px. up = capa (false = abajo: la ruta de la Bajada pasa BAJO el puente; true = arriba: cruzar el puente).
  function bfs(a, b, R, up) {
    routeMode = true; var prevUp = curUp; curUp = !!up;
    try {
      var S = 4, gw = Math.ceil(COLS * T / S), gh = Math.ceil(ROWS * T / S);
      var prev = new Int32Array(gw * gh).fill(-1), q = new Int32Array(gw * gh), free = new Int8Array(gw * gh), seen = new Uint8Array(gw * gh);
      var ok = function (ix, iy) { var id = iy * gw + ix, v = free[id]; if (v) return v === 1; var bl = collideL(ix * S + S / 2, iy * S + S / 2, R, !!up); free[id] = bl ? 2 : 1; return !bl; };
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
      if (goal < 0) return { ok: false, steps: 0, explored: tail };
      var steps = 0, via = {}, cur, order = [];
      for (cur = goal; prev[cur] >= 0; cur = prev[cur]) { steps++; var tr = zona((cur % gw) * S, Math.floor(cur / gw) * S); if (!via[tr]) { via[tr] = 1; order.unshift(tr); } }
      return { ok: true, steps: steps, px: steps * S, pasaPor: order };
    } finally { routeMode = false; curUp = prevUp; }
  }
  // routeCheck(R): playa → puerta de la peña por la Bajada (bajo el puente) + la vuelta por el puente a la Ermita + entrar a la peña con el portón abierto
  function routeCheck(Rarg) {
    var R = Rarg || (ACH.ent && ACH.ent.CFG.radius) || 5;
    var main = bfs(START_HOME, PLACES.penaPuerta, R, false);
    var bajo = bfs(PLACES.bajadaMedio, PLACES.bajadaCima, R, false);
    var puente = bfs(PLACES.puenteB, PLACES.ermita, R, true);
    var gateOff = gateDs.off; gateDs.off = true;
    var adentro = bfs(PLACES.penaPuerta, PLACES.penaEscenario, R, false);
    gateDs.off = gateOff;
    return { ok: !!(main.ok && bajo.ok && puente.ok && adentro.ok), steps: main.steps, px: main.px, pasaPor: main.pasaPor, bajoPuente: bajo.ok, porElPuente: puente.ok, puentePx: puente.px, entraPena: adentro.ok };
  }
  function spawnCheck() {
    var out = [], ZR = (ACH.ent && ACH.ent.CFG.zRadius) || 5;
    function chk(what, x, y, rad, up) { if (collideL(x, y, rad, !!up)) out.push({ what: what, x: Math.round(x), y: Math.round(y) }); }
    chk('inicio', START_HOME.x, START_HOME.y, 5);
    CHECKPOINTS.forEach(function (c2) { chk('punto de control ' + c2.id, c2.x, c2.y, 5); });
    for (var pl in PLACES) chk('lugar ' + pl, PLACES[pl].x, PLACES[pl].y, 5, pl === 'puenteMedio');
    for (var vs in VENDOR_SPOTS) chk('vendedor ' + vs, VENDOR_SPOTS[vs].x, VENDOR_SPOTS[vs].y, 5);
    HELADERO_PATH.forEach(function (pl2, n) { pl2.forEach(function (pt, j) { chk('heladero#' + n + '.' + j, pt[0], pt[1], 6); }); });
    DOG_ZONES.forEach(function (z) { chk('perros ' + z.id, (z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2, 4); });
    (BR.zSpawns ? BR.zSpawns() : []).forEach(function (s, n) { chk('zombie ' + s.type + '#' + n, s.x, s.y, ZR, s.up); });
    props.forEach(function (p, n) {
      if (!(p.fw > 0)) return;
      var c0 = Math.floor(p.x0 / T), c1 = Math.floor((p.x1 - 0.01) / T), r0 = Math.floor(p.y0 / T), r1 = Math.floor((p.y1 - 0.01) / T);
      for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) if (solidL(cc, rr, false)) { out.push({ what: 'prop ' + p.k + '#' + n + ' pisa sólido', x: p.x, y: p.y }); return; }
    });
    return out;
  }
  function effFace(f, res) { if (res && typeof res.face === 'number') return res.face; return Math.min(Math.max(3, f.face || 3), f.r1 - f.r0 + 1); }
  var decals = [], decor = [];
  (function () { decals.push({ k: 'charco', v: 0, x: 120 * T, y: 22.4 * T, rot: 0, br: true }); decals.push({ k: 'sangre', v: 0, x: 172 * T, y: 48.4 * T, rot: 0, br: true }); })();
  function bloodPerScreen() { var b = decals.filter(function (d) { return d.k === 'sangre'; }); return { total: b.length, maxPerScreen: Math.min(1, b.length) }; }

  /* ---------------- El portón de la peña ---------------- */
  var gateDs = { x0: PENA.door.c0 * T, y0: (PENA.front.r1 - 1) * T, x1: (PENA.door.c1 + 1) * T, y1: (PENA.front.r1 + 1) * T, brGate: true, off: false };
  dynSolids.push(gateDs);
  var gate = {
    rect: gateDs, x: (PENA.door.c0 + PENA.door.c1 + 1) / 2 * T, y: (PENA.front.r1 + 1) * T,
    isOpen: function () { return !!gateDs.off; },
    open: function (silent, msg) {
      if (gateDs.off) return false; gateDs.off = true;
      if (!silent) { BR.sfx && BR.sfx('br.porton', { x: gate.x, y: gate.y }); BR.toast && BR.toast(msg || '¡Se abrió el portón de la peña! Suena una guitarra adentro…'); }
      return true;
    },
    close: function () { gateDs.off = false; BR.sfx && BR.sfx('br.porton', { x: gate.x, y: gate.y, close: true }); },
    hold: false   // true = no se abre sola (por si el jefe quiere encerrar a Alexander)
  };
  BR.penaGate = gate;

  var spawns = [];   // sin caminantes de la grilla: los zombies los pone zombis.js
  ACH.world = {
    T: T, COLS: COLS, ROWS: ROWS, W: COLS * T, H: ROWS * T, ROW: null, JIRONES: [], PASAJES: [],
    MAP: MAP, grid: grid, lotAt: lotAt, LOTS: LOTS, FOOT: {}, spawns: spawns, props: props,
    start: START, lights: [],
    over: {}, decals: decals, decor: decor, poles: poles, dogSpawns: DOGS, birdSpawns: birdSpawns,
    tileAt: tileAt, isSolidTile: isSolidTile, buildProps: buildProps, groundTile: groundTile,
    collideCircle: collideCircle, moveCircle: moveCircle, los: los, inExit: inExit,
    routeCheck: routeCheck, spawnCheck: spawnCheck, SOCIAL: null, lotsBaked: [], cables: [], effFace: effFace,
    bloodPerScreen: bloodPerScreen, propAt: propAt, catSpawns: CATS, FOOD_CARTS: {}, foodCarts: [], hiddenLoot: HIDDEN_LOOT, looseDecor: looseDecor,
    // claves de Miraflores / Costa Verde (misma forma)
    level: 'barranco', D: function () { return 0; }, water: [], inWater: function () { return null; }, dynSolids: dynSolids, places: PLACES, doors: DOORS,
    vendors: [], checkpoint: CHECKPOINTS[1], startHome: START_HOME, pizza: null, inExitZone: inExitZone, rotonda: null, mercado: null,
    buildMs: function () { return buildMs; },
    cfgNoche: { atTime: 1e9, triggerX: null, kicker: 'BARRANCO · 7:00 P.M.' },
    terr: [], stairs: [], checkpoints: CHECKPOINTS, heladeroPath: HELADERO_PATH, dogZones: DOG_ZONES, vista: null, quebrada: null, larco: null,
    tramos: TRAMOS, vendorSpots: VENDOR_SPOTS, goals: [], ballSpots: [], shops: [], rooms: [], roomAt: function () { return null; },
    tramoAt: tramoAt, terraceAt: function () { return null; }, isStairs: isStairs, inLarco: function () { return false; }, respawnOk: respawnOk, progress: progress,
    bakeExtra: bakeExtra, camUp: 0,
    // claves nuevas de Barranco (§2)
    id: 'barranco', zona: zona, deck: DECKPX, overlap: OZPX, pena: PENAPX, bajada: { pts: BAJ.pts, half: BAJ.half, wall: BAJ.wall, dist: bajDist },
    sea: SEA, corral: CORRAL_PX, layerAt: function (x, y, up) { return collideL(x, y, 1, !!up) ? 'solido' : (up ? 'arriba' : 'abajo'); }, onDeck: onDeck, fixLayer: fixLayer, collideLayer: collideL,
    inPena: inPena, penaGate: gate, regions: { beach: BEACH, ermita: ERMITA, mirador: MIRADOR, gardel: GARDEL, zepita: ZEPITA, parque: PARQUE, grau: GRAU, calleA: CALLE_A, calleB: CALLE_B, union: UNION, zaguan: ZAGUAN }
  };

  /* ---------------- Sistema: puntos de control, portón, capas, escalones ---------------- */
  var CPN = { bajadaCima: 1, parque: 2, penaPuerta: 3 };
  function cpUpgrade(G, id) {
    var i = CPN[id]; if (!(i > (G.brCp | 0))) return;
    G.brCp = i; START.x = CHECKPOINTS[i].x; START.y = CHECKPOINTS[i].y;
    BR.toast && BR.toast('Punto de control: ' + CHECKPOINTS[i].label);
    BR.sfx && BR.sfx('checkpoint', { x: G.player.x, y: G.player.y });
  }
  var gateHint = { t: -99, n: 0 };
  function celedonioListo() {
    try { if (BR.flag && (BR.flag('celedonio') || BR.flag('maestro') || BR.flag('contrapunto'))) return true; } catch (e) { /* nada */ }
    try { var H = ACH.hab; if (H && typeof H.rank === 'function' && H.rank('contrapunto') > 0) return true; } catch (e2) { /* nada */ }
    return false;
  }
  BR.register({
    name: 'mundo',
    reset: function (G) {
      G.brCp = 0; START.x = START_HOME.x; START.y = START_HOME.y;
      gateDs.off = false; gate.hold = false; gateHint.t = -99; gateHint.n = 0;
      if (G && G.player) { G.player.x = START.x; G.player.y = START.y; G.player.brUp = true; }
    },
    onRespawn: function (G) { if (G.player) fixLayer(G.player); },
    update: function (G, dt) {
      var p = G.player; if (!p) return;
      // teletransportes y empujones sin moveCircle: la capa se recalcula fuera del puente
      fixLayer(p);
      var Z = G.zombies;
      for (var k = 0; k < Z.length; k++) { var z = Z[k]; if (z.brUp === undefined || (Math.abs(z.x - (OZPX.x0 + OZPX.x1) / 2) < 260 && Math.abs(z.y - (OZPX.y0 + OZPX.y1) / 2) < 140)) fixLayer(z); }
      // puntos de control (solo suben)
      var tc = Math.floor(p.x / T), tr = Math.floor(p.y / T);
      if (inR(tc, tr, GARDEL) || inR(tc, tr, AYACUCHO)) cpUpgrade(G, 'bajadaCima');
      if (tc >= PARQUE.c0 && tc <= PARQUE.c1 + 6) cpUpgrade(G, 'parque');
      if (tc >= PENA.door.c0 - 10 && tr >= CALLE_B.r0 - 1 && tr <= CALLE_B.r1) cpUpgrade(G, 'penaPuerta');
      if (tc >= PENA.door.c0 - 10 && inPena(p.x, p.y)) cpUpgrade(G, 'penaPuerta');
      // portón: se abre al llegar si Don Celedonio ya te enseñó; si no, aviso, y a la segunda se abre igual (con aviso)
      if (!gateDs.off && !gate.hold && Math.abs(p.x - gate.x) < 44 && p.y > gate.y - 10 && p.y < gate.y + 64) {
        if (celedonioListo()) gate.open(false, '¡Adentro, compadre! La jarana ya empezó…');
        else if (G.time - gateHint.t > 4) {
          gateHint.t = G.time; gateHint.n++;
          if (gateHint.n === 1) BR.toast && BR.toast('Cerrado… Una voz desde un zaguán: «¡Psst, muchacho! Ven acá primero».');
          else gate.open(false, '¡Entras sin la lección de Don Celedonio! Que sea lo que Dios quiera, compadre.');
        }
      }
    },
    // escalones de la Bajada: subir un poco más lento (×0.9), bajar normal
    speedMul: function (G) {
      var p = G.player; if (!p || p.brUp || !isStairs(p.x, p.y)) return 1;
      var a = ACH.input && ACH.input.axis ? ACH.input.axis() : { x: 0, y: 0 };
      return (a.y < -0.1 || a.x > 0.1) ? 0.9 : 1;
    },
    drawables: function (G, out) {
      var V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }, cam = G.cam;
      if (gateDs.off || gate.x < cam.x - 60 || gate.x > cam.x + V.w + 60 || gate.y < cam.y - 80 || gate.y > cam.y + V.h + 40) return;
      out.push({ y: gateDs.y1, x: gate.x, draw: function (g, cx, cy) {
        var s = spriteOf('ultimaJaranaPorton') || spriteOf('portonPena');
        if (s) { g.drawImage(s, Math.round(gate.x - cx - (s.ax !== undefined ? s.ax : s.width / 2)), Math.round(gateDs.y1 - cy - (s.ay !== undefined ? s.ay : s.height))); return; }
        var x0 = Math.round(gateDs.x0 - cx), y1 = Math.round(gateDs.y1 - cy), w = gateDs.x1 - gateDs.x0;
        g.fillStyle = '#1c1a22'; g.fillRect(x0 - 1, y1 - 40, w + 2, 40);
        g.fillStyle = '#5b3a29'; g.fillRect(x0, y1 - 39, w, 38);
        g.fillStyle = '#8a5a34'; for (var xx = x0 + 3; xx < x0 + w - 2; xx += 6) g.fillRect(xx, y1 - 37, 3, 34);
        g.fillStyle = '#3a2418'; g.fillRect(x0 + Math.floor(w / 2), y1 - 39, 1, 38);
        g.fillStyle = '#e3b94f'; g.fillRect(x0 + Math.floor(w / 2) - 4, y1 - 20, 2, 3); g.fillRect(x0 + Math.floor(w / 2) + 3, y1 - 20, 2, 3);
      } });
    }
  });
})();
