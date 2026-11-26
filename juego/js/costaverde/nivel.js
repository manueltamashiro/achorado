/* ACHORADO — js/costaverde/nivel.js (C1a): Miraflores nivel 2, el Malecón de la Costa Verde (COSTAVERDE.md §1, §2.6–2.8).
   Se carga PRIMERO en costaverde.html. Define:
     ACH.nivel  la MISMA forma que el de Miraflores (MIRAFLORES.md §2), con id 'costaverde'. Los despachadores recorren ACH.cv.systems.
     ACH.cv     { systems, register(sys), sfx(name, data), toast(t), say(id|texto, o, texto), brandName(id), brandColors(id), BRANDS,
                  prov(...), label(...), dist(...), keyGate[], U (= 10: «1 de daño» del contrato en vida del motor),
                  freeze(bool) / frozen(), talk(lines, onDone), finish(stats), runFinale('caida'|'chorrillos'), stats{},
                  setCheckpoint(name), checkpoint() }   (mundo.js agrega gate, terraceAt, place…; los demás, lo suyo: chef, caida, chorrillos…)
     ACH.mira   = ACH.cv (el MISMO objeto: inflables.js y el arte de Miraflores corren igual; ACH.mira.systems === ACH.cv.systems)
     ACH.debug.cv  tp, skip, god, give, routeCheck, spawnCheck, state  (+ ?cv=caida | ?cv=chorrillos | ?cv=<lugar> en la URL)
   Congelar (freeze): G.state = 'cine' (el estado de cinemática de game.js: su update no corre el mundo ni lee input, render sigue
   dibujando, blur no pausa) + ACH.hud.setState('cine'). Al soltar, vuelve al estado de antes. Ver ../diseno/cv-C1a.md. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var M = ACH.cv = ACH.mira = (ACH.cv || ACH.mira || {});
  M.systems = M.systems || [];
  M.register = function (sys) { if (sys && M.systems.indexOf(sys) < 0) M.systems.push(sys); return sys; };
  M.U = 10;
  M.stats = M.stats || { perros: 0, helados: 0, goles: 0 };

  /* ---------------- Marcas (Larcomar, COSTAVERDE.md §10.2) + las de Miraflores por si algo de allá las pide ---------------- */
  var BRANDS = {
    nike: { real: 'NIKE', parodia: 'NAIK', bg: '#111111', fg: '#ffffff' },
    bananarepublic: { real: 'BANANA REPUBLIC', parodia: 'BANANA REPÚBLICA', bg: '#1c1c1c', fg: '#e8e0cf' },
    tanta: { real: 'TANTA', parodia: 'TANTITA', bg: '#d8263a', fg: '#ffffff' },
    mangos: { real: 'MANGOS', parodia: 'MANGAZOS', bg: '#f0a020', fg: '#2a1a10' },
    koasian: { real: 'KO ASIAN', parodia: 'K.O. ASIÁTICO', bg: '#2a2a2e', fg: '#e8402c' },
    popular: { real: 'POPULAR', parodia: 'POPULACHO', bg: '#e8b830', fg: '#1c1a22' },
    bonbonniere: { real: 'LA BONBONNIERE', parodia: 'LA BOMBONERA', bg: '#5a2a3a', fg: '#f3d8a0' },
    fridays: { real: "T.G.I. FRIDAY'S", parodia: 'T.G.I. JUEVES', bg: '#c8102e', fg: '#ffffff' },
    pardos: { real: "PARDOS CHICKEN", parodia: 'PARDOS POLLITO', bg: '#e05a1a', fg: '#ffffff' },
    cinepolis: { real: 'CINÉPOLIS', parodia: 'CINEPOLIZ', bg: '#0a2a6a', fg: '#ffd200' },
    hm: { real: 'H&M', parodia: 'H&N', bg: '#ffffff', fg: '#e50010' },
    miniso: { real: 'MINISO', parodia: 'MINIZO', bg: '#e8202a', fg: '#ffffff' },
    adidas: { real: 'ADIDAS', parodia: 'ADIDA', bg: '#111111', fg: '#ffffff' },
    starbucks: { real: 'STARBUCKS', parodia: 'ESTARBAKS', bg: '#00704A', fg: '#ffffff' },
    freddo: { real: 'FREDDO', parodia: 'FREDO', bg: '#3a2a6a', fg: '#ffffff' },
    cinnabon: { real: 'CINNABON', parodia: 'CINNABUN', bg: '#1c3a7a', fg: '#ffffff' },
    salazar: { real: 'SALAZAR FOOD & DRINKS', parodia: 'SALAZAR FOOD & DRINKS', bg: '#2a2a2e', fg: '#f0c030' },
    haagendazs: { real: 'HÄAGEN-DAZS', parodia: 'HÄGEN-DAZE', bg: '#5a1a2a', fg: '#f3e8d0' },
    masterkong: { real: 'MASTER KONG', parodia: 'MASTER KUNG', bg: '#b8141e', fg: '#ffd24a' },
    kiosco: { real: 'KIOSCO LARCOMAR', parodia: 'KIOSCO LARCOMAR', bg: '#1f8a5a', fg: '#ffffff' },
    deportes: { real: 'DEPORTES MALECÓN', parodia: 'DEPORTES MALECÓN', bg: '#1a4ab8', fg: '#ffe500' },
    fuente: { real: 'FUENTE DE SODA', parodia: 'FUENTE DE SODA', bg: '#e84a8a', fg: '#ffffff' },
    granDragon: { real: 'CHIFA GRAN DRAGÓN', parodia: 'CHIFA GRAN DRAGÓN', bg: '#b8141e', fg: '#ffd24a' },
    // Miraflores (inflables.js / arte de allá)
    bembos: { real: 'BEMBOS', parodia: 'BOMBOS', bg: '#1100CF', fg: '#FFB500' }, lalucha: { real: 'LA LUCHA', parodia: 'LA LUCHITA', bg: '#2A2A2E', fg: '#FFFFFF' },
    chinawok: { real: 'CHINA WOK', parodia: 'CHINA WAK', bg: '#E30613', fg: '#FFFFFF' }, belisario: { real: 'DON BELISARIO', parodia: 'DON BELICOSO', bg: '#E5133A', fg: '#FFFFFF' },
    wong: { real: 'WONG', parodia: 'WANG', bg: '#EC1C24', fg: '#FFFFFF' }, ripley: { real: 'RIPLEY', parodia: 'RIPLAY', bg: '#333333', fg: '#F3EFE2' },
    saga: { real: 'SAGA FALABELLA', parodia: 'SAGA FALABOLA', bg: '#8DC63F', fg: '#FFFFFF' }, tailoy: { real: 'TAI LOY', parodia: 'TAI LOI', bg: '#00A160', fg: '#FFFFFF' }
  };
  M.BRANDS = BRANDS;
  function realMode() { return !(ACH.cfg && ACH.cfg.marcasReales === false); }
  M.brandName = function (id) {
    var L = ACH.sprites && ACH.sprites.cv && ACH.sprites.cv.larco;
    if (L && typeof L.brandName === 'function' && BRANDS[id] && !/^(bembos|lalucha|chinawok|belisario|wong|ripley|saga|tailoy)$/.test(id)) {
      try { var n = L.brandName(id); if (typeof n === 'string' && n) return n.toUpperCase(); } catch (e) { /* tabla de aquí */ }
    }
    if (M.marcas && typeof M.marcas.name === 'function') { try { var nm = M.marcas.name(id); if (typeof nm === 'string' && nm) return nm.toUpperCase(); } catch (e2) { /* nada */ } }
    var b = BRANDS[id]; return b ? (realMode() ? b.real : b.parodia) : String(id || '').toUpperCase();
  };
  M.brandColors = function (id) { var b = BRANDS[id] || {}; return { bg: b.bg || '#555', fg: b.fg || '#fff', accent: b.accent || b.fg || '#fff' }; };

  /* ---------------- Utilidades compartidas ---------------- */
  M.sfx = function (name, data) { var a = ACH.audio; if (a && a.emit) { try { a.emit(name, data); } catch (e) { /* el sonido nunca rompe el juego */ } } };
  M.toast = function (t) { if (ACH.hud && ACH.hud.toast) { try { ACH.hud.toast(t); } catch (e) { /* nada */ } } };
  M.say = function (idOrText, o, fallbackText) {
    var a = ACH.audio; if (!a || !a.say) return false;
    try {
      if (a.phrases && a.phrases[idOrText]) return !!a.say(idOrText, o || {}) || true;
      var d = {}; for (var k in (o || {})) d[k] = o[k]; d.force = true;
      return !!a.say(fallbackText || idOrText, d) || true;
    } catch (e) { return false; }
  };
  M.dist = function (ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); };
  function mkc(w, h) { var c = null; try { if (ACH.px && ACH.px.canvas) c = ACH.px.canvas(w, h); } catch (e) { c = null; } if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; } return c; }
  M.mk = mkc;
  // Sprite provisorio legible: bloque de color con contorno oscuro y su nombre en ACH5. Ancla = centro inferior.
  var provCache = {};
  M.prov = function (key, w, h, col, label, opt) {
    opt = opt || {};
    var ck = key + '|' + w + '|' + h + '|' + col;
    if (provCache[ck]) return provCache[ck];
    var c = mkc(w, h);
    var g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    if (opt.draw) opt.draw(g, w, h);
    else {
      g.fillStyle = '#1c1a22'; g.fillRect(0, 0, w, h);
      g.fillStyle = col; g.fillRect(1, 1, w - 2, h - 2);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(1, 1, w - 2, 1);
      g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(1, h - 3, w - 2, 2);
    }
    if (label) M.label(g, label, w, h, opt.ink);
    c.ax = opt.ax !== undefined ? opt.ax : Math.floor(w / 2); c.ay = opt.ay !== undefined ? opt.ay : h - 1;
    if (opt.fw !== undefined) c.fw = opt.fw;
    if (opt.fh !== undefined) c.fh = opt.fh;
    c.prov = true;
    provCache[ck] = c;
    return c;
  };
  M.label = function (g, label, w, h, ink, y) {
    var px = ACH.px, s = String(label).toUpperCase();
    try {
      if (px && px.G && px.text && px.measure) {
        while (s.length > 1 && px.measure(s, 'a5') > w - 2) s = s.slice(0, -1);
        if (px.measure(s, 'a5') > w - 2) return;
        var tg = new px.G(w, 7);
        px.text(tg, s, Math.floor(w / 2), 1, { font: 'a5', ink: ink || '#f3efe2', align: 'c' });
        var tc = tg.toCanvas();
        var yy = y !== undefined ? y : Math.max(0, Math.floor(h / 2) - 4);
        g.fillStyle = 'rgba(19,16,21,.55)'; g.fillRect(0, yy, w, 7);
        g.drawImage(tc, 0, yy);
        return;
      }
    } catch (e) { /* letra de sistema */ }
    g.font = '5px monospace'; g.fillStyle = ink || '#f3efe2'; g.textAlign = 'center'; g.fillText(s, w / 2, h / 2 + 2); g.textAlign = 'start';
  };
  function safe(o, fn, a, b, c) { if (o && typeof o[fn] === 'function') { try { return o[fn](a, b, c); } catch (e) { console.warn('[ACHORADO cv] ' + fn, e); } } return undefined; }
  M.safe = safe;

  /* ---------------- Despachadores ---------------- */
  var warned = {};
  function call(s, fn, a, b, c, d) {
    try { return s[fn](a, b, c, d); }
    catch (e) { var k = (s.name || '?') + '.' + fn; if (!warned[k]) { warned[k] = 1; console.warn('[ACHORADO cv] ' + k, e); } return undefined; }
  }
  function each(fn, a, b, c, d) { var L = M.systems; for (var i = 0; i < L.length; i++) if (typeof L[i][fn] === 'function') call(L[i], fn, a, b, c, d); }

  var NOCHE = { atTime: 420, atX: null };
  function applyNoche() {
    var cfg = ACH.noche && ACH.noche.cfg; if (!cfg) return;
    cfg.atTime = NOCHE.atTime; cfg.triggerX = null;
    cfg.kicker = 'MALECÓN DE MIRAFLORES · 7:00 P.M.';
  }

  // El cartel de victoria de game.js (winInfo) es el de la Gambetta: aquí va el de la Costa Verde, sin tocar el motor.
  function wrapWin() {
    var H = ACH.hud; if (!H || !H.showWin || H.showWin._cv) return;
    var orig = H.showWin;
    H.showWin = function (G, info) {
      var o = {}; for (var k in (info || {})) o[k] = info[k];
      o.title = ACH.nivel.win.title; o.go = winGoText(); o.rows = null;
      var r = orig.call(this, G, o);
      try { fillWinRows(); } catch (e) { /* nada */ }
      return r;
    };
    H.showWin._cv = true;
  }
  // ENTER/toque en el cartel: con ACH.viaje se vuelve al mapa (index.html, extra.mapa); sin él, jugar de nuevo (game.js winGo).
  function canTravel() { return !!(ACH.viaje && typeof ACH.viaje.go === 'function'); }
  // BARRANCO.md §7.2: el cartel dice A BARRANCO si esa página existe en ACH.viaje.PAGES; si no, vuelve al mapa como antes
  function toBarranco() { return !!(ACH.viaje && ACH.viaje.PAGES && ACH.viaje.PAGES.barranco); }
  function winGoText() { return canTravel() ? (toBarranco() ? 'ENTER — A BARRANCO' : 'ENTER — VOLVER AL MAPA') : ACH.nivel.win.go; }
  var traveling = false;
  function winTravel() {
    var G = ACH.G; if (traveling || !G || G.state !== 'won' || !canTravel()) return false;
    traveling = true;
    var carry = null; try { carry = ACH.game && ACH.game.carryState ? ACH.game.carryState() : null; } catch (e) { carry = null; }
    if (!carry && G.player) carry = { hp: G.player.hp, fans: G.fans, deaths: G.deaths };
    try { if (ACH.viaje.setDone) ACH.viaje.setDone('costaverde'); } catch (e2) { /* nada */ }
    M.sfx('ui.ok');
    var ok = false;
    try {
      M.freeze(true); if (ACH.input && ACH.input.reset) ACH.input.reset();
      // BARRANCO.md §7.2: directo al nivel Barranco con la mochila; si esa página no existe (o el viaje falla), respaldo: el mapa como antes
      if (toBarranco()) ok = ACH.viaje.go('barranco', carry, { from: 'costaverde' }) !== false;
      if (!ok) ok = ACH.viaje.go('main', carry, { mapa: true }) !== false;
    } catch (e3) { ok = false; }
    if (!ok) { traveling = false; try { M.freeze(false); G.state = 'won'; ACH.hud.setState('won'); } catch (e4) { /* nada */ } return false; }
    return true;
  }
  M.winTravel = winTravel;
  M.keyGate = M.keyGate || [];
  M.keyGate.push(function (e) {
    var G = ACH.G; if (!G || G.state !== 'won' || !canTravel()) return false;
    if ((e.code === 'Enter' || e.code === 'NumpadEnter') && !e.repeat && (G.wonT || 0) >= 0.6) return winTravel();
    return false;
  });
  document.addEventListener('click', function (e) {
    var G = ACH.G; if (!G || G.state !== 'won' || !canTravel() || (G.wonT || 0) < 0.6) return;
    var t = e.target; if (t && t.closest && t.closest('#winGo')) { e.preventDefault(); e.stopImmediatePropagation(); winTravel(); }
  }, true);
  function statN(k) {
    var n = +M.stats[k] || 0, J = M.juguetes;
    if (!n && J && J.stats && +J.stats[k]) n = +J.stats[k];
    return n | 0;
  }
  function fillWinRows() {
    var pairs = [['winDogsRow', 'winDogs', 'perros'], ['winIceRow', 'winIce', 'helados']];
    pairs.forEach(function (q) {
      var row = document.getElementById(q[0]), b = document.getElementById(q[1]);
      if (b) b.textContent = statN(q[2]);
      if (row) row.classList.remove('hide');
    });
  }

  /* ---------------- Teclas: filtro en captura (este archivo se carga primero) ---------------- */
  // 2 (Cerro) y 3 (mapa) del título de la página principal no existen aquí. ENTER en el título arranca el nivel actual sin volver a hornear
  // (game.js haría startIntro('gambetta') → loadLevel → rehorneado de 300×86 tiles).
  M.keyGate = M.keyGate || [];
  M.keyGate.push(function (e) {
    var G = ACH.G; if (!G || G.state !== 'title') return false;
    var c = e.code;
    if (c === 'Digit2' || c === 'Numpad2' || c === 'Digit3' || c === 'Numpad3') return true;
    if ((c === 'Enter' || c === 'NumpadEnter') && !e.repeat && ACH.game && ACH.game.startIntro) {
      try { if (ACH.audio && ACH.audio.unlock) ACH.audio.unlock(); } catch (er) { /* nada */ }
      M.sfx('ui.ok');
      try { ACH.game.startIntro(ACH.game.levelId ? ACH.game.levelId() : 'costaverde'); } catch (er2) { console.warn('[ACHORADO cv] startIntro', er2); return false; }
      return true;
    }
    return false;
  });
  window.addEventListener('keydown', function (e) {
    for (var i = 0; i < M.keyGate.length; i++) {
      var r = false; try { r = M.keyGate[i](e); } catch (err) { /* un filtro roto nunca rompe el teclado */ }
      if (r === true) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    }
  }, true);

  // game.js: tras ganar hace loadLevel('gambetta'). Este «nivel» devuelve el mismo mundo de la Costa Verde (como en miraflores.html).
  ACH.levels = ACH.levels || {};
  if (!ACH.levels.gambetta) ACH.levels.gambetta = { id: 'gambetta', name: 'Costa Verde', build: function () { return ACH.world; } };
  if (!ACH.levels.costaverde) ACH.levels.costaverde = { id: 'costaverde', name: 'Costa Verde', build: function () { return ACH.world; } };

  /* ---------------- Congelar el mundo (caída, cinemática, diálogos en pleno juego) ---------------- */
  var FZ = { on: false, prev: null };
  M.freeze = function (on) {
    var G = ACH.G; if (!G) return false;
    if (on) {
      if (FZ.on && G.state === 'cine') return true;
      FZ.prev = (G.state === 'playing' || G.state === 'intro' || G.state === 'dead') ? G.state : 'playing';
      if (FZ.prev === 'dead') FZ.prev = 'playing';
      G.state = 'cine'; FZ.on = true;
      safe(ACH.hud, 'setState', 'cine');
      safe(ACH.input, 'reset');
      return true;
    }
    if (!FZ.on) return false;
    FZ.on = false;
    if (G.state === 'cine') {
      G.state = FZ.prev || 'playing'; G.hitstop = 0;
      safe(ACH.hud, 'setState', G.state);
    }
    safe(ACH.input, 'reset');
    FZ.prev = null;
    return true;
  };
  M.frozen = function () { return FZ.on && ACH.G && ACH.G.state === 'cine'; };
  // Diálogo con retrato en pleno juego: congela, habla y suelta.
  M.talk = function (lines, onDone) {
    var D = ACH.dialogo;
    function done() { M.freeze(false); if (typeof onDone === 'function') { try { onDone(); } catch (e) { console.warn('[ACHORADO cv] talk.onDone', e); } } }
    if (!D || typeof D.play !== 'function') { done(); return false; }
    M.freeze(true);
    var ok = false; try { ok = D.play(lines, { onDone: done }); } catch (e) { ok = false; }
    if (!ok) done();
    return ok;
  };

  /* ---------------- Final del nivel (§2.6): caída → Chorrillos → cartel ---------------- */
  var finished = false;
  M.finish = function (stats) {
    var G = ACH.G; if (!G) return false;
    if (stats) for (var k in stats) M.stats[k] = stats[k];
    M.freeze(false);
    if (G.state === 'won') return true;
    if (G.state !== 'playing' && G.state !== 'paused' && G.state !== 'dead') G.state = 'playing';
    if (G.player && G.player.hp <= 0) G.player.hp = 1;
    finished = true;
    // v0.13 T2: el ampli del concierto venía en la tabla del Tablazo (se entrega al aterrizar, una vez)
    try { var CO = ACH.concierto; if (CO && typeof CO.dar === 'function' && !(typeof CO.tiene === 'function' && CO.tiene('ampli'))) CO.dar('ampli'); } catch (eA) { /* nada */ }
    if (ACH.debug && typeof ACH.debug.win === 'function') { try { ACH.debug.win(); } catch (e) { console.warn('[ACHORADO cv] finish', e); } }
    if (G.state !== 'won' && ACH.world) ACH.world._forceExit = true;   // respaldo: inExit() da true en el próximo paso
    return true;
  };
  M.finished = function () { return finished; };
  // runFinale('caida'): la caída (C4) y luego Chorrillos (C5) y el cartel. Sin C4 / C5 se salta lo que falte. C1b puede usarla o hacer lo suyo.
  M.runFinale = function (from) {
    var CA = M.caida, CH = M.chorrillos;
    function toCartel() { M.finish(); }
    function toChorrillos() {
      M.freeze(true);
      if (CH && typeof CH.play === 'function') { try { CH.play({ onEnd: toCartel }); return; } catch (e) { console.warn('[ACHORADO cv] chorrillos.play', e); } }
      toCartel();
    }
    function lose() {
      M.freeze(false);
      var G = ACH.G, p = G && G.player;
      M.setCheckpoint('borde');
      if (p) {
        p.hp = (ACH.ent && ACH.ent.CFG.hpMax) || 100; p.stamina = (ACH.ent && ACH.ent.CFG.staminaMax) || 100;
        var b = ACH.world && ACH.world.places && ACH.world.places.borde;
        if (b && ACH.debug && ACH.debug.teleport) ACH.debug.teleport(b.x, b.y);
      }
      if (G && G.state !== 'playing') { G.state = 'playing'; safe(ACH.hud, 'setState', 'playing'); }
      M.toast('¡Otra vez al borde, causa! Respira y tírate de nuevo.');
    }
    if (from === 'chorrillos') { toChorrillos(); return true; }
    M.freeze(true);
    if (CA && typeof CA.start === 'function') {
      try { CA.start({ onWin: toChorrillos, onLose: lose }); return true; } catch (e) { console.warn('[ACHORADO cv] caida.start', e); }
    }
    toChorrillos();
    return true;
  };

  /* ---------------- Puntos de control (los define mundo.js en ACH.world.checkpoints) ---------------- */
  M.setCheckpoint = function (name) {
    var W = ACH.world, G = ACH.G; if (!W || !W.checkpoints) return null;
    var cps = W.checkpoints, i;
    for (i = 0; i < cps.length; i++) if (cps[i].id === name) break;
    if (i >= cps.length) return null;
    if (G) G.cvCp = i;
    W.start.x = cps[i].x; W.start.y = cps[i].y;   // game.js respawn() lee ACH.world.start (se muta el mismo objeto)
    return cps[i];
  };
  // banderas de partida del nivel (ACH.partida.flag con prefijo costaverde.): M.flag('dron') lee, M.flag('dron', true) marca
  M.flag = function (k, v) {
    var P = ACH.partida; if (!P || typeof P.flag !== 'function') return v === undefined ? false : v;
    try { if (v === undefined) return !!P.flag('costaverde.' + k); return P.flag('costaverde.' + k, v); } catch (e) { return false; }
  };
  M.checkpoint = function () { var W = ACH.world, G = ACH.G; return W && W.checkpoints && G ? W.checkpoints[G.cvCp | 0] : null; };

  /* ---------------- ACH.nivel ---------------- */
  ACH.nivel = {
    id: 'costaverde',
    intro: [
      { quien: 'alexander', cara: 'sorpresa', texto: 'La Calle de las Pizzas me botó al malecón... ¡Qué tal vista, causa! Lástima los muertos.' },
      { quien: 'alexander', cara: 'picaro', texto: 'Del faro hasta Larcomar, por todos los parques. Y si veo parapentes, mejor no miro pa\' abajo.' },
      { quien: 'titina', cara: 'feliz', texto: '¡Grrú!' },
      { quien: 'alexander', cara: 'serio', texto: 'Dicen que la pista de la cura sigue por la costa. A Larcomar, de frente.' }],
    camPeek: false,
    noche: NOCHE,
    win: { title: '¡ATERRIZASTE EN BARRANCO!', go: 'ENTER para jugar de nuevo' },   // BARRANCO.md §7.2
    update: function (G, dt) { each('update', G, dt); },
    reset: function (G) {
      applyNoche(); wrapWin(); finished = false; if (FZ.on) { FZ.on = false; FZ.prev = null; }
      // v0.13 T2 (ACH.partida): visita nueva → se borran las banderas costaverde.*; al CONTINUAR, los sistemas las leen en su reset
      var P = ACH.partida, cont = false;
      try { cont = !!(P && P.continuando && P.continuando()); } catch (e) { cont = false; }
      if (!cont) { try { if (P && P.freshLevel) P.freshLevel('costaverde'); } catch (e2) { /* nada */ } }
      M.continuando = cont;
      each('reset', G);
      try { if (ACH.objetivo && ACH.objetivo.set) ACH.objetivo.set(M.flag('chef') ? 'Tírate en parapente desde el borde de la arena' : 'Recorre el malecón hasta Larcomar'); } catch (e3) { /* nada */ }
    },
    onRespawn: function (G) { each('onRespawn', G); },
    onWin: function (G) {
      try { if (ACH.viaje && ACH.viaje.setDone) ACH.viaje.setDone('costaverde'); } catch (e) { /* nada */ }
      each('onWin', G);
    },
    mood: function (G) {
      var L = M.systems;
      for (var i = 0; i < L.length; i++) if (typeof L[i].mood === 'function') { var r = call(L[i], 'mood', G); if (r && r.m) return r; }
      return null;
    },
    drawables: function (G, out) { each('drawables', G, out); },
    drawTop: function (ctx, G, cx, cy) { each('drawTop', ctx, G, cx, cy); },
    onSwing: function (G, sw) {
      var L = M.systems, tot = 0, blocked = false;
      if (sw && sw.bees === undefined) sw.bees = sw.dmg;
      for (var i = 0; i < L.length; i++) if (typeof L[i].onSwing === 'function') {
        var r = +call(L[i], 'onSwing', G, sw) || 0;
        if (r > 0) tot += r; else if (r < 0) blocked = true;
      }
      return tot > 0 ? tot : (blocked ? -1 : 0);
    },
    onProjectile: function (G, pr) {
      var L = M.systems;
      if (pr && pr.bees === undefined) pr.bees = pr.dmg;
      for (var i = 0; i < L.length; i++) if (typeof L[i].onProjectile === 'function' && call(L[i], 'onProjectile', G, pr) === true) return true;
      return false;
    },
    speedMul: function (G) {
      var L = M.systems, k = 1;
      for (var i = 0; i < L.length; i++) if (typeof L[i].speedMul === 'function') { var r = +call(L[i], 'speedMul', G); if (r > 0 && isFinite(r)) k *= r; }
      return k;
    }
  };

  /* ---------------- Llegada desde otra página (§2.7) ---------------- */
  // Se lee ANTES que game.js (este oyente de DOMContentLoaded se registró primero). Solo vale un viaje con to === 'costaverde'.
  var VKEY = 'achorado.viaje.v1', MAX_AGE = 10 * 60 * 1000;
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) { /* nada */ } }
  function parse(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function fresh(r) { return r && typeof r === 'object' && r.to === 'costaverde' && typeof r.t === 'number' && Math.abs(Date.now() - r.t) < MAX_AGE; }
  function takeArrival() {
    var V = ACH.viaje, rec = null;
    // integrado (viaje.here() ya conoce esta página): take() de siempre
    try { if (V && typeof V.here === 'function' && V.here() === 'costaverde' && typeof V.take === 'function') { var t = V.take(); if (t) return t; } } catch (e) { /* cae al manual */ }
    var h = ''; try { h = window.location.hash || ''; } catch (e2) { h = ''; }
    var m = /[#&]viaje=([^&]*)/.exec(h);
    if (m) { try { rec = parse(decodeURIComponent(m[1])); } catch (e3) { rec = null; } }
    var st = parse(lsGet(VKEY));
    if (!fresh(rec)) rec = fresh(st) ? st : null;
    if (!rec) return null;
    if (m) { try { if (window.history && history.replaceState) history.replaceState(null, '', location.pathname + location.search); } catch (e4) { /* nada */ } }
    if (fresh(st)) lsDel(VKEY);
    return { from: rec.from || null, carry: rec.carry || null, extra: rec.extra || {} };
  }
  var arrival = null;
  function onReady() {
    try { arrival = takeArrival(); } catch (e) { arrival = null; }
    setTimeout(afterInit, 0);   // game.js init() corre en el mismo DOMContentLoaded, después de este
  }
  function afterInit() {
    var G = ACH.G, q = (location.search || '');
    if (arrival && ACH.game && ACH.game.arrive) { try { ACH.game.arrive(arrival.carry || null); } catch (e) { console.warn('[ACHORADO cv] arrive', e); } return; }
    var m = /[?&]cv=([a-zA-Z]+)/.exec(q);
    if (m && G) {
      try { if (ACH.audio && ACH.audio.unlock) ACH.audio.unlock(); } catch (e2) { /* nada */ }
      setTimeout(function () {
        var D = ACH.debug && ACH.debug.cv; if (!D) return;
        if (m[1] === 'caida' || m[1] === 'chorrillos' || m[1] === 'chef') D.skip(m[1]);
        else D.tp(m[1]);
      }, 60);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady); else setTimeout(onReady, 0);

  /* ---------------- Debug (§2.8) ---------------- */
  var dbg = { god: false };
  M.register({
    name: 'debug',
    update: function (G) { if (dbg.god && G.player) { G.player.hp = (ACH.ent && ACH.ent.CFG.hpMax) || 100; } }
  });
  function ensurePlaying() {
    var G = ACH.G; if (!G) return false;
    if (ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active() && G.state === 'intro') { try { ACH.dialogo.close(); } catch (e) { /* nada */ } }
    if (G.state === 'title' || G.state === 'won' || G.state === 'intro') { if (ACH.debug && ACH.debug.start) ACH.debug.start(); }
    if (G.state === 'paused' || G.state === 'dead') { var pv = G.state; G.state = 'playing'; safe(ACH.hud, 'setState', 'playing'); safe(ACH.pausa, 'onState', 'playing', pv); }
    return G.state === 'playing';
  }
  ACH.debug = ACH.debug || {};
  ACH.debug.cv = {
    tp: function (place) {
      var W = ACH.world, P = W && W.places, q = P && P[place];
      if (!q) return { error: 'lugar desconocido', places: P ? Object.keys(P) : [] };
      if (M.frozen()) M.freeze(false);
      ensurePlaying();
      if (ACH.debug.teleport) ACH.debug.teleport(q.x, q.y);
      safe(M, 'snapCam');
      return { place: place, x: q.x, y: q.y };
    },
    // skip('chef' | 'caida' | 'chorrillos'): delega en ACH.cv.chef / caida / chorrillos si existen
    skip: function (what) {
      ensurePlaying();
      var C = M.chef;
      if (what === 'chef') {
        if (C && C.debug && typeof C.debug.kill === 'function') { try { C.debug.kill(); } catch (e) { console.warn(e); } }
        else if (C && typeof C.kill === 'function') { try { C.kill(); } catch (e2) { console.warn(e2); } }
        else M.chefDead = true;
        return ACH.debug.cv.tp('borde');
      }
      if (what === 'caida') {
        ACH.debug.cv.tp('borde');
        if (C && C.debug && typeof C.debug.kill === 'function') { try { C.debug.kill(); } catch (e3) { /* nada */ } } else M.chefDead = true;
        if (C && typeof C.jump === 'function') { try { C.jump(true); return 'chef.jump'; } catch (e4) { console.warn(e4); } }
        M.runFinale('caida'); return 'caida';
      }
      if (what === 'chorrillos') { M.runFinale('chorrillos'); return 'chorrillos'; }
      return 'skip: chef | caida | chorrillos';
    },
    god: function (on) {
      dbg.god = on === undefined ? !dbg.god : !!on;
      var CA = M.caida; if (CA && CA.debug && typeof CA.debug.god === 'function') { try { CA.debug.god(dbg.god); } catch (e) { /* nada */ } }
      return dbg.god;
    },
    give: function (id, n) {
      n = n === undefined ? 1 : n;
      if (ACH.debug.give) return ACH.debug.give(id, n);
      var iv = ACH.inv; return iv && iv.add ? iv.add(id, n) : 'sin inventario';
    },
    routeCheck: function (R) { return ACH.world && ACH.world.routeCheck ? ACH.world.routeCheck(R) : null; },
    spawnCheck: function () { return ACH.world && ACH.world.spawnCheck ? ACH.world.spawnCheck() : null; },
    finish: function (st) { return M.finish(st); },
    freeze: function (on) { return M.freeze(on); },
    state: function () {
      var G = ACH.G, W = ACH.world, p = G && G.player, types = {};
      (G ? G.zombies : []).forEach(function (z) { if (z.state !== 'muerto') types[z.type] = (types[z.type] || 0) + 1; });
      var cp = M.checkpoint();
      return {
        state: G && G.state, frozen: M.frozen(), x: p && Math.round(p.x), y: p && Math.round(p.y), hp: p && p.hp,
        tile: p && W ? [Math.floor(p.x / W.T), Math.floor(p.y / W.T)] : null,
        tramo: p && W && W.tramoAt ? W.tramoAt(p.x, p.y) : null, terraza: p && W && W.terraceAt ? (W.terraceAt(p.x, p.y) || {}).id || null : null,
        checkpoint: cp ? cp.id : null, gate: M.gate && M.gate.isOpen ? (M.gate.isOpen() ? 'abierta' : 'cerrada') : null,
        zombies: types, god: dbg.god, cam: G ? { x: Math.round(G.cam.x), y: Math.round(G.cam.y), up: W ? Math.round(W.camUp || 0) : 0 } : null,
        systems: M.systems.map(function (s) { return s.name || '?'; }), stats: M.stats,
        chef: !!M.chef, caida: !!M.caida, chorrillos: !!M.chorrillos
      };
    }
  };
})();
