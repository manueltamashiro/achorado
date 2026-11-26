/* ACHORADO — game.js: estados del juego, bucle de paso fijo (60 Hz), cámara, escalado y ACH.debug. Se carga al final. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var STEP = 1 / 60;
  // v0.10: las líneas importantes van por ACH.dialogo (retrato que habla). Cada línea: string (= Alexander, cara 'habla') o {quien, cara, texto}.
  var INTRO = (ACH.nivel && ACH.nivel.intro) || [
    { quien: 'alexander', cara: 'habla', texto: 'Con su permiso, señor conductor... ah, ya no hay conductor.' },
    { quien: 'alexander', cara: 'mueca', texto: 'Bueno. Sin chofer, sin pasajeros... y con zombies. Lunes normal en el Callao.' },
    { quien: 'alexander', cara: 'serio', texto: 'Hay que llegar al cerro. Al este, por Gambetta, hasta la escalera.' },
    { quien: 'titina', cara: 'feliz', texto: '¡Grrú!' }];
  var DEATH_T = 2.5, WON_MIN = 0.6;   // v0.10: sin INTRO_AUTO (la intro ya no avanza sola); WON_MIN = s antes de aceptar ENTER en la victoria
  // v0.9 (H1): varios niveles. ACH.levels.<id>.build() → mundo; ACH.levelHooks: fn(id, world) al cargar un nivel.
  var INTROS = { gambetta: INTRO, cerro: [
    { quien: 'alexander', cara: 'cansado', texto: 'Ya llegué al cerro. Ahora toca subirlo, causa.' },
    { quien: 'alexander', cara: 'picaro', texto: 'Hasta la cruz de arriba. Ojo con las señoras... y con las carretillas.' },
    { quien: 'alexander', cara: 'miedo', texto: '¿Y esos gallinazos? ¿Por qué me miran así?' }] };
  // v0.10: la llegada a la cima, antes de la cinemática
  var CIMA_LINES = [
    { quien: 'alexander', cara: 'cansado', texto: 'Uff... por fin. La cruz del cerro, causa.' },
    { quien: 'alexander', cara: 'sorpresa', texto: 'Asu... desde aquí se ve toda Lima.' }];
  var IS_MIRA = !!(ACH.nivel && ACH.nivel.id === 'miraflores');   // v0.10: miraflores.html (su mundo no trae id)
  var IS_CV = !!(ACH.nivel && ACH.nivel.id === 'costaverde'), IS_SUB = IS_MIRA || IS_CV;   // v0.12: costaverde.html (nivel.js toma su viaje y gana con winTravel)
  function lineText(l) { return typeof l === 'string' ? l : (l && l.texto) || ''; }
  var TEST_KIT = [['resortera', 1], ['piedras', 20], ['molotov', 1], ['botella', 2], ['trapo', 2]];   // mochila de prueba al entrar directo al Cerro
  var REST_R = 40;   // px: tocar un punto de descanso
  var levelId = (ACH.world && ACH.world.id) || 'gambetta', curIntro = INTRO, pendingLevel = null;
  ACH.levelHooks = ACH.levelHooks || [];
  var EXIT_PEEK = 24;   // px que la cámara puede pasar del borde norte del mapa (solo frente a la escalera; lo de afuera se ve oscuro)

  var G = {
    state: 'title', player: null, titina: null, zombies: [], noises: [],
    cam: { x: 0, y: 0 }, look: { x: 0, y: 0 }, hitstop: 0, holdInput: false, shake: null, shakeX: 0, shakeY: 0, fans: 0, deaths: 0, time: 0, clock: 0,
    qT: 0, qCD: 0, respawnT: 0, deadT: 0, introT: 0, introLine: 0, debugOn: false, fps: 60
  };
  ACH.G = G;

  var canvas, ctx;

  /* ---------------- Sonido (v0.5): eventos de estado y ánimo de la música ---------------- */
  function sfx(name, data) { var au = ACH.audio; if (au && au.emit) au.emit(name, data); }
  function music() { var au = ACH.audio; return au && au.music; }
  var MOOD_EVERY = 0.5, CHASE_R = 300, CALM_HOLD = 4, HORDE_TOAST = 8;
  var mood = { cur: 'explore', t: 0, lastChase: -1e9, lastHorde: -1e9, override: null };
  // 0 perseguidores → explore; 1–3 → chase (intensidad n/4); 4+ o aviso de horda en los últimos 8 s → horde.
  // Histéresis: se vuelve a explore tras 4 s sin perseguidores y se baja de horde a chase tras 4 s sin condición de horda.
  function computeMood(force) {
    var m = music(); if (!m) return;
    if (mood.override) { m.setMood(mood.override.m); m.setIntensity(mood.override.i); return; }
    var nm = ACH.nivel && ACH.nivel.mood ? ACH.nivel.mood(G) : null; if (nm) { mood.cur = nm.m; m.setMood(nm.m); m.setIntensity(nm.i); return; }   // Miraflores: la jefa manda
    var p = G.player, n = 0;
    for (var i = 0; i < G.zombies.length; i++) {
      var z = G.zombies[i];
      if (z.state !== 'perseguir' && z.state !== 'atacar') continue;
      var dx = z.x - p.x, dy = z.y - p.y;
      if (dx * dx + dy * dy < CHASE_R * CHASE_R) n++;
    }
    var hordeNow = n >= 4 || (G.time - (G.hordeAt === undefined ? -1e9 : G.hordeAt)) < HORDE_TOAST;
    if (n > 0) mood.lastChase = G.time;
    if (hordeNow) mood.lastHorde = G.time;
    var next, inten;
    if (hordeNow) { next = 'horde'; inten = 1; }
    else if (mood.cur === 'horde' && G.time - mood.lastHorde < CALM_HOLD) { next = 'horde'; inten = 1; }
    else if (n > 0) { next = 'chase'; inten = n / 4; }
    else if ((mood.cur === 'chase' || mood.cur === 'horde') && G.time - mood.lastChase < CALM_HOLD) { next = 'chase'; inten = 0.25; }
    else { next = 'explore'; inten = Math.max(0, Math.min(1, ACH.world.progress ? ACH.world.progress(p) : p.x / ACH.world.W)); } // explore: las capas crecen hacia la meta
    mood.cur = next;
    m.setMood(next); m.setIntensity(inten);
  }
  function tickAudio(dt) {
    var au = ACH.audio; if (!au) return;
    mood.t += dt;
    if (mood.t >= MOOD_EVERY) {
      mood.t = 0;
      computeMood();
    }
  }

  /* Ambiente posicional (corre en todos los estados, también en título y pausa): postes de sodio y cruz de la botica (zumbido),
     moscas en la basura y en los cadáveres, y viento sincronizado con las ráfagas visuales de fx.js (fx.ambient.wind). */
  var FEED_EVERY = 0.2, FLY_FROM = 1.2, FLY_TO = 9.5;   // los mismos tiempos que las moscas dibujadas (fx.js drawFlies)
  var feed = { t: 0, ctl: null, lamps: false, trash: false, reg: [] };
  // v0.6: un poste roto apaga su foco: se vuelve a mandar la lista de zumbidos
  if (ACH.inter) ACH.inter.onLampOut = function () { feed.lamps = false; };
  function feedAudio(dt) {
    var au = ACH.audio, ctl = au && au.ambCtl;
    if (!ctl) { feed.ctl = null; return; }
    if (ctl !== feed.ctl) { feed.ctl = ctl; feed.lamps = feed.trash = false; feed.reg = []; feed.t = 0; }
    feed.t -= dt;
    if (feed.t > 0) return;
    feed.t = FEED_EVERY;
    try {
      var FA = ACH.fx && ACH.fx.ambient, i, r, z;
      if (!feed.lamps && ACH.render && ACH.render.audioLamps) { var ls = ACH.render.audioLamps(); if (ls.length) { ctl.setLamps(ls); feed.lamps = true; } }
      if (!feed.trash && FA && FA.flySrc && FA.flySrc.length) { for (i = 0; i < FA.flySrc.length; i++) ctl.flies(FA.flySrc[i].x, FA.flySrc[i].y, true); feed.trash = true; }
      if (FA && ctl.setWind) ctl.setWind(FA.wind);
      for (i = feed.reg.length - 1; i >= 0; i--) {   // cadáveres que ya no atraen moscas
        r = feed.reg[i]; z = r.z;
        if (z.state !== 'muerto' || z.deadT > FLY_TO || G.zombies.indexOf(z) < 0) { ctl.flies(r.x, r.y, false); feed.reg.splice(i, 1); }
      }
      for (i = 0; i < G.zombies.length; i++) {
        z = G.zombies[i];
        if (z.state !== 'muerto' || z.deadT < FLY_FROM || z.deadT > FLY_TO || z._flyReg === feed.ctl) continue;
        z._flyReg = feed.ctl; feed.reg.push({ z: z, x: z.x, y: z.y - 3 }); ctl.flies(z.x, z.y - 3, true);
      }
    } catch (e) { /* el sonido nunca rompe el juego */ }
  }
  var STATE_MOOD = { title: 'title', intro: 'explore', paused: 'paused', dead: 'dead', won: 'won', base: 'paused' };   // v0.11: en el cuarto la música baja como en la pausa
  function stateAudio(prev, s) {
    if (s === 'paused' && prev !== 'paused') sfx('game.pause');
    else if (prev === 'paused' && s !== 'paused') sfx('game.resume');
    var m = music(); if (!m) return;
    if (mood.override) return;
    if (s === 'playing' || s === 'intro') {
      if (prev === 'title' || prev === 'won' || prev === 'dead') { mood.cur = 'explore'; mood.lastChase = mood.lastHorde = -1e9; }
      mood.t = 0;
      if (s === 'intro') { m.setMood('explore'); m.setIntensity(0); } else computeMood();
    } else m.setMood(STATE_MOOD[s] || 'explore');
  }

  function setState(s) { var prev = G.state; G.state = s; ACH.hud.setState(s); stateAudio(prev, s); if (s === 'title') syncMapBtn(); tryCall(ACH.pausa, 'onState', s, prev); tryCall(ACH.hab, 'onState', s, prev); tryCall(ACH.partida, 'onState', s, prev); }   // v0.11: el menú de pausa; habilidades (premio de la jefa nunca sobre la victoria) · v0.13: menú del título

  function now() { return (window.performance || Date).now(); }
  function tryCall(o, fn, a, b) { if (o && typeof o[fn] === 'function') { try { return o[fn](a, b); } catch (e) { console.warn('[ACHORADO] ' + fn, e); } } return undefined; }
  // Lo que pasa de un nivel al otro (SPEC v0.9 §1): mochila, vida, guitarra, lo que va en la mano, muertes y fans.
  function carryState() {
    var p = G.player; if (!p) return null;
    var iv = ACH.inv, snap = iv && iv.snapshot ? tryCall(iv, 'snapshot') : null;
    return { hp: p.hp, fans: G.fans, deaths: G.deaths, bag: snap, guitar: p.guitar ? { dur: p.guitar.dur, max: p.guitar.max } : null,
      held: p.held ? { id: p.held.id, dur: p.held.dur } : null, hab: tryCall(ACH.hab, 'carry'), dif: tryCall(ACH.dif, 'state') || null };   // v0.11: habilidades · v0.13: camas usadas
  }
  function restoreState(k) {
    var p = G.player, iv = ACH.inv, i;
    p.hp = Math.max(1, k.hp); G.fans = k.fans; G.deaths = k.deaths;
    if (k.dif) tryCall(ACH.dif, 'restore', k.dif);   // v0.13: la cama no vuelve a curar al cambiar de página
    if (k.guitar && p.guitar) { p.guitar.dur = k.guitar.dur; if (k.guitar.max) p.guitar.max = k.guitar.max; }
    if (!k.bagLater) restoreBag(k);
    if (k.hab) tryCall(ACH.hab, 'restore', k.hab);   // v0.11
    if (k.held && ACH.armas && ACH.armas.spawnLoose) {
      var L = null; try { L = ACH.armas.spawnLoose(k.held.id, p.x, p.y, 0, 0); } catch (e) { L = null; }
      if (L) { if (k.held.dur) L.dur = k.held.dur; tryCall(ACH.armas, 'grab', L); }
    }
  }
  function restoreBag(k) {
    var iv = ACH.inv;
    if (!k || !k.bag || !iv || !iv.add) return;
    (k.bag.slots || []).forEach(function (s) { if (s) tryCall(iv, 'add', s.id, s.n); });
    if (iv.assignQuick) (k.bag.quick || []).forEach(function (id, n) { if (id) tryCall(iv, 'assignQuick', n, id); });
  }
  function giveKit() { var iv = ACH.inv; if (!iv || !iv.add) return; TEST_KIT.forEach(function (k) { tryCall(iv, 'add', k[0], k[1]); }); }
  // inventario.js vacía la mochila al ver el estado 'intro' (partida nueva): se lo hacemos ver ya, y después se llena
  function introThenBag(k, kit) { playIntro(); tryCall(ACH.inv, 'sync', G); if (k) restoreBag(k); if (kit) giveKit(); }
  // La noche de cada nivel: el mundo trae cfgNoche {atTime, triggerX, triggerY, kicker}; triggerX/Y null = solo por tiempo.
  function applyLevelCfg(W) {
    var N = ACH.noche, c = W.cfgNoche;
    if (N && N.cfg && c) {
      if (c.atTime !== undefined) N.cfg.atTime = c.atTime;
      N.cfg.triggerX = c.triggerX === undefined ? null : c.triggerX;
      if (c.kicker) N.cfg.kicker = c.kicker;
      if ('triggerY' in N.cfg || c.triggerY !== undefined) N.cfg.triggerY = c.triggerY === undefined ? null : c.triggerY;
    }
    tryCall(N, 'reset');
    if (ACH.audio && typeof ACH.audio.setLevel === 'function') { try { ACH.audio.setLevel(W.id || levelId); } catch (e) { /* el sonido nunca rompe el juego */ } }
  }
  // Cambia de nivel: reemplaza ACH.world, hornea, vacía el estado de la partida (zombies, botín, sueltos, proyectiles, fuego, NPC)
  // y llama a los ganchos. opts: {keep: pasar mochila/vida/guitarra, kit: mochila de prueba}.
  function loadLevel(id, opts) {
    opts = opts || {};
    var Lv = ACH.levels && ACH.levels[id];
    if (!Lv || typeof Lv.build !== 'function') { console.warn('[ACHORADO] nivel desconocido: ' + id); return false; }
    var keep = opts.keep ? (opts.keep === true ? carryState() : opts.keep) : null, t0 = now();
    var W = Lv.build();
    if (!W.id) W.id = id;
    ACH.world = W; levelId = id; curIntro = INTROS[id] || INTRO;
    W.buildProps();
    ACH.render.rebake();
    G.bakeMs = Math.round(now() - t0);
    applyLevelCfg(W);
    resetWorld(keep);
    if (opts.kit) giveKit();
    for (var i = 0; i < ACH.levelHooks.length; i++) { try { ACH.levelHooks[i](id, W); } catch (e) { console.warn('[ACHORADO] levelHook', e); } }
    G.loadMs = Math.round(now() - t0);
    return true;
  }
  function resetWorld(keep) {
    G.player = ACH.ent.makePlayer();
    G.titina = ACH.ent.makeTitina();
    G.noises.length = 0;
    ACH.ent.spawnInitial(G);
    if (ACH.social) ACH.social.reset(G);                          // F7: orquesta zombie, cantante y siluetas
    ACH.ent.makeNPCs(G);
    if (ACH.inter && ACH.inter.reset) ACH.inter.reset(G);       // v0.6: props sanos, gatos en su sitio, sin piedras en vuelo
    if (ACH.armas && ACH.armas.reset) ACH.armas.reset(G);        // v0.8: guitarra sana, sin objetos sueltos ni en la mano
    if (ACH.inv && ACH.inv.reset) { try { ACH.inv.reset(); } catch (e) { console.warn('[ACHORADO] inv.reset', e); } }
    G.fans = 0; G.deaths = 0; G.time = 0; G.qT = 0; G.qCD = 0; G.respawnT = 0; G.hordeAt = -1e9;
    G.restIdx = 0; G.restUsed = {}; G.nightY = false; G.stats = { jumps: 0 };
    tryCall(ACH.aves, 'reset', G); tryCall(ACH.fuego, 'reset', G); tryCall(ACH.cerro, 'reset');   // v0.9: gallinazos, fuego y carretillas
    G.look.x = 0; G.look.y = 0; G.lookAt = null;
    ACH.fx.reset(G);
    ACH.hud.clearToasts(); ACH.hud.resetHint();
    G.resumeTo = null;
    tryCall(ACH.objetivo, 'nivel', hereId());   // v0.13 T2 (U): objetivo por defecto; ACH.nivel.reset y los levelHooks lo afinan después
    if (ACH.nivel && ACH.nivel.reset) ACH.nivel.reset(G);
    tryCall(ACH.gambetta, 'reset', G);   // v0.13 T2 (GB): sobrevivientes, Don Lucho, El Chofer y la calamina (solo en la Gambetta)
    if (keep) restoreState(keep);
    snapCamera();
  }

  // startIntro(id, kit): partida nueva en el nivel id (por defecto la Gambetta); kit = mochila de prueba.
  function startIntro(id, kit) {
    id = id || 'gambetta';
    if (id !== levelId) loadLevel(id);
    else resetWorld();
    sfx('game.start');
    introThenBag(null, kit);
  }
  // v0.10: la intro pasa por ACH.dialogo (retrato que habla) con el juego congelado en 'intro'; al cerrarse, a jugar.
  // Sin dialogo.js queda la caja #intro de siempre, que se avanza con ENTER (ya no sola).
  function playIntro() {
    G.introT = 0; G.introLine = 0;
    setState('intro');
    if (ACH.dialogo && ACH.dialogo.play) ACH.dialogo.play(curIntro, { onDone: introDone, id: 'intro.' + hereId() });   // v0.13 T2 (U): id → saltable si ya se vio
    else ACH.hud.setIntroLine(lineText(curIntro[0]));
  }
  function introDone() {
    if (G.state === 'intro') { ACH.input.reset(); setState('playing'); autoSave(); }
    else if (G.state === 'paused' && G.resumeTo === 'intro') { G.resumeTo = 'playing'; autoSave(); }
  }
  // v0.13 (G1): guardado. Sin partida.js no pasa nada.
  function autoSave(o) { return tryCall(ACH.partida, 'save', G, o) === true; }
  // Ganaste la Gambetta: subes al Cerro con lo que llevas
  function nextLevel(id) { var k = carryState(); if (k) k.bagLater = true; loadLevel(id, { keep: k }); sfx('game.start'); introThenBag(k, false); }
  function advanceIntro() {
    G.introLine++;
    if (G.introLine >= curIntro.length) { setState('playing'); autoSave(); return; }
    ACH.hud.setIntroLine(lineText(curIntro[G.introLine]));
  }

  function respawn() {
    var p = G.player, RP = ACH.world.restPoints, s = (RP && RP.length && RP[G.restIdx | 0]) || ACH.world.start;   // v0.9: en el Cerro, el último punto de descanso
    p.x = s.x; p.y = s.y; p.z = 0; p.jumpT = -1; p.jumpCD = 0; p.kbx = 0; p.kby = 0; p.stunT = 0; p.hp = ACH.ent.CFG.hpMax; p.stamina = ACH.ent.CFG.staminaMax;
    p.exhausted = false; p.dir = 'right'; p.atkT = -1; p.atkCD = 0; p.hurtT = 0; p.bird = true; p.atkBuf = 0; p.qBuf = 0;
    if (ACH.armas && ACH.armas.onRespawn) ACH.armas.onRespawn(G);   // v0.8: guitarra de repuesto (cuarto de la azotea)
    G.titina.state = 'hombro';
    // que nadie lo siga persiguiendo hasta el inicio
    for (var i = 0; i < G.zombies.length; i++) {
      var z = G.zombies[i];
      if (z.state === 'perseguir' || z.state === 'atacar' || z.state === 'investigar') z.state = 'deambular';
    }
    G.look.x = 0; G.look.y = 0;
    ACH.fx.reset(G);
    snapCamera();
    sfx('player.respawn', { x: p.x, y: p.y });
    if (ACH.nivel && ACH.nivel.onRespawn) ACH.nivel.onRespawn(G);
    setState('playing');
  }

  /* ---------------- Cámara ---------------- */
  // La avenida va de oeste a este: la cámara viaja sobre todo en horizontal y se adelanta hacia donde mira Alexander
  // (lookAheadX en x, lookAheadY en y). ACH.debug.look(x, y) la fija en un punto hasta el próximo teleport o input.
  function camTarget() {
    var V = ACH.render.VIEW, W = ACH.world, p = G.player;
    var tx = p.x + G.look.x - V.w / 2, ty = p.y - 10 - (W.camUp || 0) + G.look.y - V.h / 2, minY = 0;
    if (G.lookAt) { tx = G.lookAt.x - V.w / 2; ty = G.lookAt.y - V.h / 2; }
    else {
      // la salida se ve venir: desde la col 105 la cámara sube hasta el borde norte (y = 0) y, frente a la escalera, pasa de él hasta
      // EXIT_PEEK px (lo de afuera se ve oscuro), así la escalera pintada (filas 0–10) queda entera en pantalla y el borde superior no la corta.
      // Alexander nunca baja de y = 212 en pantalla (el borde inferior deja sitio al hint y a las flechas de Q).
      var ex = ((ACH.nivel && ACH.nivel.camPeek === false) || levelId !== 'gambetta') ? 0 : Math.max(0, Math.min(1, (p.x - 105 * W.T) / (14 * W.T))), sm = ex * ex * (3 - 2 * ex);
      if (sm > 0) { ty = ty * (1 - sm) + Math.max(-EXIT_PEEK, p.y - (V.h - 58)) * sm; minY = -EXIT_PEEK * sm; }
    }
    return { x: Math.max(0, Math.min(W.W - V.w, tx)), y: Math.max(minY, Math.min(W.H - V.h, ty)) };
  }
  function snapCamera() { var t = camTarget(); G.cam.x = Math.round(t.x); G.cam.y = Math.round(t.y); }
  function updateCamera(dt) {
    // adelanto: la cámara se asoma hacia donde camina Alexander (suavizado)
    var p = G.player, C = ACH.ent.CFG, kl = 1 - Math.exp(-C.lookSmooth * dt), I = ACH.input;
    if (G.lookAt) {
      var a = I.axis();
      if (a.x || a.y || I.mouse.clicked || I.anyPressed(['Space', 'KeyQ', 'KeyE', 'KeyF', 'ShiftLeft', 'ShiftRight'])) G.lookAt = null;
      else { snapCamera(); return; }
    }
    var fv = ACH.ent.DIRV[p.dir] || [0, 0], ax = C.lookAheadX || C.lookAhead, ay = ACH.world.lookAheadY || C.lookAheadY || C.lookAhead;   // v0.9: el Cerro se asoma más en y
    G.look.x += (fv[0] * ax - G.look.x) * kl;
    G.look.y += (fv[1] * ay - G.look.y) * kl;
    var t = camTarget(), k = 1 - Math.exp(-7 * dt);
    G.cam.x += (t.x - G.cam.x) * k; G.cam.y += (t.y - G.cam.y) * k;
    if (Math.abs(t.x - G.cam.x) < 0.05) G.cam.x = t.x;
    if (Math.abs(t.y - G.cam.y) < 0.05) G.cam.y = t.y;
  }

  function invOpen() { var iv = ACH.inv; try { return !!(iv && iv.isOpen && iv.isOpen()); } catch (e) { return false; } }

  /* ---------------- Update ---------------- */
  function confirmPressed() { var I = ACH.input; return I.anyPressed(['Enter', 'NumpadEnter']); }

  function update(dt) {
    var I = ACH.input;
    G.clock += dt;
    G.holdInput = false;
    if (I.pressed('F3')) G.debugOn = !G.debugOn;

    switch (G.state) {
      case 'title':
        if ((pendingMap || I.pressed('Digit3') || I.pressed('Numpad3')) && mapReady()) { pendingMap = false; sfx('ui.ok'); openMap(null); }   // v0.10: 3 = mapa de Lima
        else if (pendingLevel || (!IS_SUB && dbgTitle() && (I.pressed('Digit2') || I.pressed('Numpad2')))) { var pl = pendingLevel || 'cerro'; pendingLevel = null; sfx('ui.ok'); startIntro(pl, pl !== 'gambetta'); }   // v0.9: 2 = directo al Cerro (v0.13: solo con ?debug=1 o F3)
        else if (!titleMenu() && (confirmPressed() || I.mouse.clicked)) { sfx('ui.ok'); startIntro('gambetta'); }   // v0.13: en index.html manda el menú de partida.js
        break;
      case 'intro':
        G.introT += dt;
        if (!(ACH.dialogo && ACH.dialogo.play) && (confirmPressed() || I.mouse.clicked)) { sfx('ui.ok'); advanceIntro(); }   // respaldo sin dialogo.js
        updateCamera(dt);
        break;
      case 'playing':
        // v0.6: con la mochila abierta la simulación se congela (solo se dibuja); inventario.js maneja sus teclas
        if (invOpen()) break;
        if (ACH.hab && ACH.hab.freeze && ACH.hab.freeze(G, dt)) break;   // v0.11: árbol de melodías abierto o despertar de la guitarra
        if (I.pressed('Escape')) { setState('paused'); break; }
        if (I.pressed('KeyH') && G.clock >= (G.baseCD || 0)) { goBase(); if (G.state !== 'playing') break; }   // v0.11: H = al cuarto
        ACH.fx.updateShake(G, dt);       // la sacudida corre en tiempo real, también durante el hitstop
        if (G.hitstop > STEP / 2) {      // hitstop: la simulación se congela; las pulsaciones esperan al siguiente paso
          G.hitstop -= dt; G.holdInput = true; break;
        }
        G.hitstop = 0;
        G.time += dt;
        ACH.input.setCam(Math.round(G.cam.x), Math.round(G.cam.y));
        ACH.ent.updatePlayer(G, dt);
        if (ACH.armas) ACH.armas.update(G, dt);                   // v0.8: E / F, objetos sueltos y lanzados, temporizadores
        ACH.ent.updateTitina(G, dt);
        ACH.ent.updateZombies(G, dt);
        if (ACH.nivel && ACH.nivel.update) ACH.nivel.update(G, dt);
        if (ACH.hab && ACH.hab.update) ACH.hab.update(G, dt);    // v0.11: XP, sabor, melodías y el despertar
        tickLevel(G, dt);                                         // v0.9: carretillas, gallinazos, fuego, descansos, noche por altura
        ACH.ent.updateNPCs(G, dt);
        ACH.ent.updateRespawn(G, dt);
        ACH.ent.updateNoises(G, dt);
        if (ACH.inter) ACH.inter.update(G, dt);
        if (ACH.social) ACH.social.update(G, dt);                 // F7
        if (ACH.inv && ACH.inv.update) ACH.inv.update(G, dt);
        ACH.fx.update(G, dt);
        updateCamera(dt);
        tickAudio(dt);
        tryCall(ACH.partida, 'tick', G, dt);                      // v0.13: autoguardado cada 30 s
        if (G.safeT > 0) { G.safeT -= dt; if (G.player.hp < G.safeHp) G.player.hp = G.safeHp; }   // v0.11: 1.5 s sin daño al volver del cuarto
        if (G.player.hp <= 0 && ACH.inv && tryCall(ACH.inv, 'take', 'estampita', 1) === true) {   // v0.13 T2 (B4): la estampita te salva una vez (queda en 1)
          G.player.hp = 1; G.safeT = 1.2; G.safeHp = 1; ACH.hud.toast('¡La estampita te salvó, causa! (se gastó)'); sfx('rest', { x: G.player.x, y: G.player.y });
        }
        if (G.player.hp <= 0) {
          G.deaths++; G.deadT = 0;
          tryCall(ACH.dif, 'onDeath', G);                          // v0.13 (A2): la bolsa de la muerte, una vez por muerte
          if (ACH.armas && ACH.armas.onDeath) ACH.armas.onDeath(G);
          sfx('player.death', { x: G.player.x, y: G.player.y }); if (music()) music().stinger('death');
          setState('dead');
        }
        else if (ACH.world.inExit(G.player.x, G.player.y)) doWin();
        break;
      case 'paused':
        if (I.pressed('Escape')) { var back = G.resumeTo || 'playing'; G.resumeTo = null; sfx('ui.back'); setState(back); }
        break;
      case 'dead':
        G.deadT += dt; G.time += dt;
        ACH.ent.updateTitina(G, dt);
        ACH.ent.updateZombies(G, dt);
        ACH.ent.updateNPCs(G, dt);
        ACH.ent.updateNoises(G, dt);
        if (ACH.armas) ACH.armas.update(G, dt);                   // v0.8: lo que va rodando sigue rodando
        tryCall(ACH.fuego, 'update', G, dt);                       // v0.9: el fuego sigue ardiendo
        if (ACH.inter) ACH.inter.update(G, dt);
        if (ACH.social) ACH.social.update(G, dt);                 // F7
        ACH.fx.updateShake(G, dt); ACH.fx.update(G, dt);
        if (G.deadT >= DEATH_T) respawn();
        break;
      case 'won':
        G.wonT = (G.wonT || 0) + dt;
        if (G.wonT >= WON_MIN && (confirmPressed() || winTap)) { sfx('ui.ok'); winGo(); }
        winTap = false;
        break;
      case 'cine':   // v0.10: diálogo de la cima, cinemática y mapa por encima: el juego no corre ni lee input
        if (!musicCut && cineMusicOff) fadeMusic();   // si el audio se desbloquea con el mapa abierto, la música del juego no entra
        break;
    }
    ACH.hud.update(G);
    if (G.state !== 'paused') ACH.hud.tick(dt); // los avisos viven en tiempo de juego: en pausa se congelan
  }

  /* ---------------- v0.9: lo propio de cada nivel en el paso de juego ---------------- */
  function tickLevel(G, dt) {
    var W = ACH.world, p = G.player, i;
    tryCall(ACH.cerro, 'update', G, dt);
    tryCall(ACH.aves, 'update', G, dt);
    tryCall(ACH.fuego, 'update', G, dt);
    tryCall(ACH.gambetta, 'update', G, dt);   // v0.13 T2 (GB): historia de la Gambetta (solo actúa en ese nivel)
    // puntos de descanso: el último que tocaste es donde despiertas. v0.13: el primer toque de cada uno en esta visita cura (+20; Bravazo +10) y guarda.
    var RP = W.restPoints;
    if (RP && RP.length > 1) for (i = 0; i < RP.length; i++) {
      if (i === G.restIdx) continue;
      var dx = p.x - RP[i].x, dy = p.y - RP[i].y;
      if (dx * dx + dy * dy < REST_R * REST_R) {
        G.restIdx = i;
        if (i > 0) {
          var heal = 0;
          if (!G.restUsed) G.restUsed = {};
          if (!G.restUsed[i]) {
            G.restUsed[i] = true;
            heal = tryCall(ACH.dif, 'get') === 'bravazo' ? 10 : 20;
            var hm = p.hpMax || ACH.ent.CFG.hpMax; p.hp = Math.min(hm, Math.max(p.hp, 0) + heal);
          }
          ACH.hud.toast('Descanso: ' + RP[i].label + (heal ? ' (+' + heal + ')' : ''));
          sfx('rest', { x: RP[i].x, y: RP[i].y, label: RP[i].label });
        }
        autoSave();
        break;
      }
    }
    // la noche por altura (Cerro: por encima de la fila 70); noche.js se encarga del tiempo
    var cn = W.cfgNoche, N = ACH.noche;
    if (cn && cn.triggerY != null && !G.nightY && p.y < cn.triggerY && N && N.start) { G.nightY = true; try { N.start(G); } catch (e) { /* nada */ } }
  }
  // Pantalla de victoria según el nivel
  function winInfo() {
    if (levelId === 'cerro') {
      var A = ACH.aves, st = A && A.stats, gall = st ? (st.scared || 0) + (st.killed || 0) : (A && typeof A.scared === 'number' ? A.scared : 0);
      return { level: 'cerro', title: 'LLEGASTE A LA CIMA', go: ACH.cima ? 'ENTER — ASOMARSE' : 'ENTER para volver al título',
        rows: { gallinazos: gall, carretillas: ACH.cerro ? ACH.cerro.stats.jumped : 0 } };
    }
    return { level: levelId, title: 'LLEGASTE AL CERRO', go: ACH.levels && ACH.levels.cerro ? 'ENTER — SUBIR EL CERRO' : 'ENTER para empezar de nuevo', rows: null };
  }

  /* ---------------- v0.10: victoria → cima → cinemática → mapa → viaje (V010 «El recorrido completo») ---------------- */
  var pendingMap = false, winTap = false, musicCut = false, cineMusicOff = false, mapCarry = null;
  var NEXT_LV = { gambetta: 'cerro', cerro: 'miraflores', miraflores: 'costaverde', costaverde: 'mapa' };   // v0.13: destino de la partida al ganar
  function viaje() { return ACH.viaje || null; }
  function doWin() {
    if (IS_MIRA) { tryCall(viaje(), 'setDone', 'miraflores'); tryCall(viaje(), 'visitDistrict', 'miraflores'); }
    else if (levelId === 'cerro') tryCall(viaje(), 'setDone', 'cerro');
    else if (levelId === 'gambetta') tryCall(viaje(), 'setDone', 'gambetta');   // v0.11: el mapa de la pausa se abre al salir de la Gambetta
    tryCall(ACH.nivel, 'onWin', G);
    var nx = NEXT_LV[hereId()]; if (nx) autoSave({ force: true, level: nx, restIdx: 0, fresh: true });   // v0.13: al ganar, la partida apunta al siguiente nivel
    ACH.hud.showWin(G, winInfo()); sfx('win'); ACH.ent.say('win', G.player.x, G.player.y); if (music()) music().stinger('win');
    G.wonT = 0; winTap = false;
    setState('won');
  }
  // ENTER / toque en la victoria: Gambetta → Cerro; Cerro → asomarse a la cima; Miraflores → volver al mapa
  function winGo() {
    if (IS_MIRA) {
      if (viaje()) { setState('cine'); ACH.input.reset(); var toCV = !!(viaje().PAGES && viaje().PAGES.costaverde); viaje().go(toCV ? 'costaverde' : 'main', carryState(), toCV ? {} : { mapa: true }); }   // COSTAVERDE.md: Kennedy → Malecón
      else { loadLevel('gambetta'); setState('title'); }
      return;
    }
    if (levelId === 'gambetta' && ACH.levels && ACH.levels.cerro) nextLevel('cerro');   // «ENTER — SUBIR EL CERRO»
    else if (levelId === 'cerro' && ACH.cima) cimaFlow();                               // «ENTER — ASOMARSE»
    else { loadLevel('gambetta'); setState('title'); }
  }
  var CIMA_SEEN = 'achorado.cima.vista';
  function cimaFlow() {
    mapCarry = carryState();
    setState('cine'); ACH.input.reset();
    function go() {
      cineMusicOff = true; fadeMusic();
      var first = true; try { first = !(ACH.cima.seen ? ACH.cima.seen() : window.localStorage.getItem(CIMA_SEEN) === '1'); } catch (e) { first = true; }
      try { ACH.cima.play({ onChoose: chooseDistrict, onBack: backFromMap, onDone: backFromMap, skippable: !first }); }
      catch (e) { console.warn('[ACHORADO] cima.play', e); backFromMap(); }
    }
    if (ACH.dialogo && ACH.dialogo.play) ACH.dialogo.play(CIMA_LINES, { onDone: go, id: 'cima.llegada' }); else go();
  }
  function mapReady() { var V = viaje(); return !IS_SUB && !!(ACH.cima && ACH.cima.showMap) && !!(V && V.progress().cerro); }
  // El mapa directo (título con tecla 3, o al volver de Miraflores con extra.mapa). carry: lo que se lleva si se viaja.
  function openMap(carry) {
    if (!ACH.cima || !ACH.cima.showMap) return false;
    mapCarry = carry || null;
    setState('cine'); ACH.input.reset();
    cineMusicOff = true; fadeMusic();
    try { ACH.cima.showMap({ onChoose: chooseDistrict, onBack: backFromMap, onDone: backFromMap }); }
    catch (e) { console.warn('[ACHORADO] cima.showMap', e); backFromMap(); return false; }
    return true;
  }
  // v0.13 (F3): VOLVER / ESC en el mapa de la cima. Con lo que llevas (ganaste el Cerro, o volviste de Miraflores / Costa Verde) se vuelve
  // a la cima del Cerro (último descanso, junto a la cruz) con la mochila; sin carry (mapa abierto desde el título) se vuelve al título.
  function backFromMap() {
    if (mapTravel) return;
    if (!mapCarry) { backToTitle(); return; }
    var k = mapCarry;
    mapTravel = true;
    try { if (ACH.cima && ACH.cima.active && ACH.cima.active()) ACH.cima.close(); } catch (e) { /* nada */ }
    mapTravel = false;
    if (G.state !== 'cine') return;
    cineMusicOff = false; mapCarry = null; restoreMusic();
    if (!resumeAt('cerro', k, -1, null, 'De vuelta en la cruz, causa.')) backToTitle();
  }
  // v0.13 (G1): poner a Alexander en un nivel con su carry, en el descanso ri (−1 = el último), sin intro. Página principal: loadLevel;
  // Miraflores y Costa Verde: el mundo ya está, se reinicia. cp = punto de control de Costa Verde.
  function resumeAt(id, k, ri, cp, msg) {
    if (k) k.bagLater = false;
    if (IS_SUB) resetWorld(k || null);
    else if (!loadLevel(id, { keep: k || null })) return false;
    var W = ACH.world, RP = W.restPoints, p = G.player, s = null;
    if (RP && RP.length) { if (ri < 0 || ri >= RP.length) ri = RP.length - 1; G.restIdx = ri | 0; s = RP[G.restIdx]; }
    if (IS_CV && cp) { var c = tryCall(ACH.cv, 'setCheckpoint', cp); if (c) s = { x: c.x, y: c.y }; }
    if (s && p) { p.x = s.x; p.y = s.y; }
    G.lookAt = null; snapCamera();
    G.resumeTo = null; G.baseCD = G.clock + 0.4;
    ACH.input.reset();
    sfx('game.start');
    setState('playing');
    tryCall(ACH.inv, 'sync', G);
    ACH.hud.toast(msg || '¡De vuelta, causa!');
    autoSave();
    return true;
  }
  // CONTINUAR (título de index.html): otra página → viaje con {continuar}; aquí → el nivel guardado (o el mapa).
  function continuar() {
    var P = ACH.partida, r = P && P.load ? tryCall(P, 'load') : null;
    if (!r) return false;
    if (r.dif) tryCall(ACH.dif, 'set', r.dif);
    tryCall(P, 'mergeProg', r);
    var page = r.page || 'main', V = viaje(), here = IS_MIRA ? 'miraflores' : IS_CV ? 'costaverde' : 'main';
    try { if (ACH.audio && ACH.audio.unlock) ACH.audio.unlock(); } catch (e) { /* nada */ }
    if (page !== here) {
      if (!V || !V.go || !(V.PAGES && V.PAGES[page])) return false;
      setState('cine'); ACH.input.reset();
      // fresh = la partida se guardó al ganar el nivel anterior: el siguiente arranca con su llegada de siempre (con diálogo)
      var ex = r.fresh ? { from: 'continuar' } : { continuar: true, restIdx: r.restIdx | 0, cp: r.cp || null, difState: r.difState || null };
      if (V.go(page, r.carry || null, ex) === false) { setState('title'); return false; }
      return true;
    }
    if (r.difState) tryCall(ACH.dif, 'restore', r.difState);
    if (r.carry && r.carry.hab) tryCall(ACH.hab, 'restore', r.carry.hab);
    if (r.level === 'mapa') return openMap(r.carry || null);
    if (r.fresh && ACH.levels && ACH.levels[r.level]) {   // p. ej. ganaste la Gambetta y saliste: el Cerro con su intro
      var k = r.carry || null; if (k) k.bagLater = true;
      if (!loadLevel(r.level, { keep: k })) return false;
      sfx('game.start'); introThenBag(k, false);
      return true;
    }
    tryCall(P, 'markContinue');   // v0.13 T2: las banderas del nivel (jefe vencido…) valen al continuar
    return resumeAt(r.level, r.carry || null, r.restIdx | 0, r.cp, '¡De vuelta, causa!');
  }
  // Llegada a Miraflores / Costa Verde con {continuar}: sin intro, en el descanso / punto de control guardado.
  function arriveContinue(k, ex) {
    if (ex.difState) tryCall(ACH.dif, 'restore', ex.difState);
    return resumeAt(hereId(), k, ex.restIdx | 0, ex.cp || null, '¡De vuelta, causa!');
  }
  // PARTIDA NUEVA (partida.js ya borró la ranura y fijó la dificultad)
  function newGame(mode) {
    if (G.state !== 'title') return false;
    if (mode) tryCall(ACH.dif, 'set', mode);
    tryCall(ACH.dif, 'resetRun');   // A2: las camas vuelven a curar
    tryCall(ACH.objetivo, 'nuevaPartida'); tryCall(ACH.concierto, 'nuevaPartida');   // v0.13 T2 (U): diario y piezas del concierto de cero
    try { if (ACH.audio && ACH.audio.unlock) ACH.audio.unlock(); } catch (e) { /* nada */ }
    sfx('ui.ok');
    if (tryCall(ACH.prologo, 'play', function () { startIntro('gambetta'); }) === true) return true;   // v0.13 T2 (B3): primero el prólogo en la combi
    startIntro('gambetta');
    return true;
  }
  function titleMenu() { return !IS_SUB && tryCall(ACH.partida, 'menuOn') === true; }
  function dbgTitle() { return G.debugOn || /[?&]debug=1\b/.test(location.search || ''); }
  function chooseDistrict(id) {
    var V = viaje();
    if (id === 'miraflores' && V && V.PAGES && V.PAGES.miraflores) { V.go('miraflores', mapCarry, { from: mapCarry ? 'cerro' : 'mapa' }); return; }
    if (id === 'costaverde' && V && V.PAGES && V.PAGES.costaverde) { V.go('costaverde', mapCarry, { from: 'mapa' }); return; }   // v0.12: la tarjeta de Miraflores trae [COSTA VERDE]
    backToTitle();
  }
  function backToTitle() {
    cineMusicOff = false;
    if (ACH.cima && ACH.cima.active && ACH.cima.active()) { try { var c = ACH.cima; c.close(); } catch (e) { /* nada */ } }
    if (G.state !== 'cine') return;   // close() vuelve a llamar onDone: solo la primera vez cuenta
    mapCarry = null;
    restoreMusic();
    if (levelId !== 'gambetta') loadLevel('gambetta'); else resetWorld();
    ACH.input.reset();
    setState('title');
  }
  // La música del juego (musica.js) se apaga con fundido mientras suena el himno de la cima (los dos usan bus.music) y se vuelve a arrancar al salir.
  function fadeMusic() {
    try {
      var A = ACH.audio, e = A && A.musicEngine;
      if (!musicCut && e && typeof e.stop === 'function' && (typeof e.state !== 'function' || e.state())) { e.stop(false); musicCut = true; }
    } catch (x) { /* el sonido nunca rompe el juego */ }
  }
  function restoreMusic() {
    if (!musicCut) return;
    musicCut = false;
    try {
      var A = ACH.audio, e = A && A.musicEngine;
      if (A && A.ctx && A.bus && e && typeof e.start === 'function') e.start(A.ctx, A.bus.music, (A._nodes && A._nodes.musicSend) || A.reverbSend);
    } catch (x) { /* nada */ }
  }
  // Llegada desde otra página con su carry (Miraflores): sin portada, con el diálogo de llegada y la mochila de antes.
  function arrive(k) {
    var lv = null; try { lv = viaje() && viaje().last ? viaje().last() : null; } catch (e) { lv = null; }   // v0.13: CONTINUAR desde el título de index.html
    if (lv && lv.extra && lv.extra.continuar && !lv.used) { lv.used = true; if (k && k.hab) tryCall(ACH.hab, 'restore', k.hab); if (arriveContinue(k, lv.extra)) return; }
    if (k) k.bagLater = true;
    resetWorld(k || null);
    sfx('game.start');
    introThenBag(k || null, false);
  }
  function syncMapBtn() { var b = document.getElementById('mapBtn'); if (b && !titleMenu()) b.classList.toggle('hide', !mapReady()); }

  /* ---------------- v0.11 (agente C): mapa desde la pausa, viajes a niveles vencidos, salir al título y el cuarto ---------------- */
  var VUELTA = {   // intro corta al volver a un nivel ya vencido
    gambetta: [{ quien: 'alexander', cara: 'picaro', texto: 'De vuelta a la Gambetta. A juntar sencillo y cachivaches, causa.' }],
    cerro: [{ quien: 'alexander', cara: 'serio', texto: 'Otra vez el cerro. Ya me sé el camino... creo.' }] };
  var mapTravel = false;
  function hereId() { return IS_MIRA ? 'miraflores' : IS_CV ? 'costaverde' : levelId; }
  // Nivel de la página principal reiniciado (para farmear) con lo que lleva Alexander (k = carryState()).
  function revisit(id, k) {
    if (k) k.bagLater = true;
    if (!loadLevel(id, { keep: k || null })) return false;
    if (VUELTA[id]) curIntro = VUELTA[id];
    sfx('game.start'); introThenBag(k || null, false);
    return true;
  }
  function openMapPause() {
    if (!ACH.cima || !ACH.cima.showMap || G.state !== 'paused') return false;
    mapCarry = carryState();
    if (!G.resumeTo) G.resumeTo = 'playing';
    setState('cine'); ACH.input.reset();
    cineMusicOff = true; fadeMusic();
    try { ACH.cima.showMap({ desdePausa: true, here: hereId(), onChoose: travel, onBack: backToPause, onDone: backToPause }); }
    catch (e) { console.warn('[ACHORADO] cima.showMap', e); backToPause(); return false; }
    return true;
  }
  function backToPause() {
    if (mapTravel) return;
    cineMusicOff = false;
    if (ACH.cima && ACH.cima.active && ACH.cima.active()) { try { ACH.cima.close(); } catch (e) { /* nada */ } }
    if (G.state !== 'cine') return;
    mapCarry = null; restoreMusic(); ACH.input.reset();
    setState('paused');
  }
  // Viajar a un nivel (desde el mapa de la pausa o ACH.debug.v011.ir): Gambetta ⇄ Cerro en esta página; Miraflores ⇄ principal entre páginas.
  // false = no se viaja (ya estás ahí o no se puede): el mapa sigue abierto.
  function travel(id) {
    var V = viaje(), here = hereId(), k = mapCarry || carryState();
    if (id === here) { ACH.hud.toast('Ya estás aquí, causa.'); return false; }
    var sub = id === 'miraflores' || id === 'costaverde';   // v0.12: Costa Verde es otra página, como Miraflores
    if (sub || IS_SUB) {
      if (!V || !V.go || !(sub || id === 'gambetta' || id === 'cerro') || !(V.PAGES && V.PAGES[sub ? id : 'main'])) return false;
      setState('cine'); ACH.input.reset();
      return V.go(sub ? id : 'main', k, sub ? { from: here } : { nivel: id, from: here }) !== false;
    }
    if (!(ACH.levels && ACH.levels[id])) return false;
    mapTravel = true;
    try { if (ACH.cima && ACH.cima.active && ACH.cima.active()) ACH.cima.close(); } catch (e) { /* nada */ }
    mapTravel = false; cineMusicOff = false; mapCarry = null; restoreMusic();
    G.resumeTo = null; ACH.input.reset();
    return revisit(id, k);
  }
  function toTitle() {
    if (G.state === 'paused' || G.state === 'playing' || G.state === 'base') autoSave();   // v0.13: la partida queda guardada (o la última buena)
    if (IS_SUB && viaje() && viaje().go && viaje().PAGES && viaje().PAGES.main) {   // v0.13: el título con CONTINUAR vive en index.html
      setState('cine'); ACH.input.reset(); sfx('ui.back');
      if (viaje().go('main', null, { titulo: true }) !== false) return true;
      setState('paused');
    }
    mapTravel = true;
    try { if (ACH.cima && ACH.cima.active && ACH.cima.active()) ACH.cima.close(); } catch (e) { /* nada */ }
    mapTravel = false; cineMusicOff = false; mapCarry = null; restoreMusic();
    G.resumeTo = null;
    if (levelId !== 'gambetta') loadLevel('gambetta'); else resetWorld();
    ACH.input.reset(); sfx('ui.back');
    setState('title');
    return true;
  }
  function resume() { if (G.state !== 'paused') return false; var back = G.resumeTo || 'playing'; G.resumeTo = null; sfx('ui.back'); setState(back); return true; }
  // El cuarto de Alexander (ACH.base, js/base/base.js): fundido «TITINA TE GUÍA A TU CUARTO…», la escena, y de vuelta al mismo punto.
  var BASE_FADE = 600, SAFE_T = 1.5;
  function goBase() {
    var B = ACH.base;
    if (!B || typeof B.enter !== 'function') { ACH.hud.toast('Todavía no tienes cuarto, causa.'); return false; }
    var s = G.state;
    if (s === 'paused') { if (G.resumeTo && G.resumeTo !== 'playing') return false; }
    else if (s !== 'playing') return false;
    if (invOpen() || (ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active()) || !G.player || G.player.hp <= 0) return false;
    try { if (ACH.tienda && ACH.tienda.isOpen && ACH.tienda.isOpen()) return false; } catch (e) { /* nada */ }
    var d = tryCall(ACH.dif, 'canEnterBase', G);   // v0.13 (A2): ni con jefe ni con zombis encima
    if (d && !d.ok) { G.baseMsg = d.msg || 'Ahorita no se puede, causa.'; ACH.hud.toast(G.baseMsg); return false; }
    G.resumeTo = null;
    setState('base'); ACH.input.reset();
    tryCall(ACH.pausa, 'fade', 'TITINA TE GUÍA A TU CUARTO…');
    setTimeout(function () {
      if (G.state !== 'base') { tryCall(ACH.pausa, 'unfade'); return; }
      var ok = false;
      try { B.enter({ onExit: backFromBase }); ok = true; } catch (e) { console.warn('[ACHORADO] base.enter', e); }
      tryCall(ACH.pausa, 'unfade');
      if (!ok) backFromBase();
    }, BASE_FADE);
    return true;
  }
  function backFromBase() {
    if (G.state !== 'base') return;
    tryCall(ACH.pausa, 'fade', '');
    setTimeout(function () { tryCall(ACH.pausa, 'unfade'); }, 120);
    ACH.input.reset();
    G.safeT = SAFE_T; G.safeHp = G.player.hp; G.baseCD = G.clock + 0.4;   // invulnerable 1.5 s (no hay campo en entities.js: se repone la vida) y H no rebota
    setState('playing');
    snapCamera();
    ACH.hud.toast('¡De vuelta a la calle!');
  }

  /* ---------------- Auto-pausa al perder el foco ---------------- */

  function autoPause() {
    // también en la intro y en la muerte: si no, sus cuentas (7 s y 2,5 s) siguen corriendo con la pestaña oculta
    if (G.state !== 'playing' && G.state !== 'intro' && G.state !== 'dead') return;
    ACH.input.reset();
    G.resumeTo = G.state;
    setState('paused');
  }
  window.addEventListener('blur', autoPause);
  document.addEventListener('visibilitychange', function () { if (document.hidden) autoPause(); });

  /* ---------------- Escalado: la vista lógica se adapta a la ventana ---------------- */
  // La vista ya no es fija en 480×270: la altura lógica ronda 270 y el ancho sigue la proporción de la ventana, así el juego
  // la llena entera sin franjas. Escritorio: escala entera (píxel nítido) y el escenario puede sobrar hasta s−1 px (se recorta, centrado).
  // Táctil o ventana chica: escala fraccionaria s = alto / 270. Solo si la proporción se sale de los límites queda una franja fina.
  var VW_MIN = 400, VW_MAX = 720, VH_MIN = 240, VH_MAX = 300, VH_BASE = 270;
  function fracView(W, H) {
    var a = W / H, h = VH_BASE, w = h * a;
    if (w > VW_MAX) { h = Math.max(VH_MIN, VW_MAX / a); w = Math.min(VW_MAX, h * a); }
    else if (w < VW_MIN) { h = Math.min(VH_MAX, VW_MIN / a); w = Math.max(VW_MIN, h * a); }
    w = Math.round(w); h = Math.round(h);
    return { w: w, h: h, s: Math.min(W / w, H / h), crisp: false };
  }
  function pickView(W, H, touch) {
    if (!touch) {   // la escala entera más grande cuya vista cae dentro de los límites
      for (var s = Math.floor(H / VH_MIN); s >= 1; s--) {
        var w = Math.ceil(W / s), h = Math.ceil(H / s);
        if (w >= VW_MIN && w <= VW_MAX && h >= VH_MIN && h <= VH_MAX) return { w: w, h: h, s: s, crisp: true };
      }
    }
    return fracView(W, H);
  }
  function fit() {
    var stage = document.getElementById('stage'); if (!stage) return;
    var touch = !!(ACH.touch && ACH.touch.on);
    var W = Math.max(1, window.innerWidth), H = Math.max(1, window.innerHeight);
    var v = pickView(W, H, touch);
    if (ACH.render.resize(v.w, v.h) && canvas) {
      var hk = ACH.render.K ? ACH.render.K() : 1;   // v0.15 (A): #world = VIEW×K (render.js lo mantiene y pone setTransform(K))
      canvas.width = v.w * hk; canvas.height = v.h * hk;
      ctx.imageSmoothingEnabled = false;
      if (G.player) snapCamera();   // la cámara se vuelve a acotar a los bordes del mapa con la vista nueva
    }
    var sw = v.crisp ? v.w * v.s : Math.round(v.w * v.s), sh = v.crisp ? v.h * v.s : Math.round(v.h * v.s);
    stage.style.width = sw + 'px'; stage.style.height = sh + 'px';
    document.documentElement.style.setProperty('--u', v.s + 'px');
    G.view = { w: v.w, h: v.h, s: v.s, crisp: v.crisp, stageW: sw, stageH: sh, winW: W, winH: H };
  }
  var fitT = 0;
  function fitSoon() { clearTimeout(fitT); fitT = setTimeout(fit, 60); }

  /* ---------------- Pantalla completa (botón ⛶: esquina del escenario en escritorio, barra de arriba en el táctil) ---------------- */
  // En un iframe sin permiso (claude.ai) o en iPhone no hay: el botón se esconde si fullscreenEnabled es falso.
  var FS = {
    enabled: function () { try { return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled); } catch (e) { return false; } },
    on: function () { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
    toggle: function () {
      try {
        var d = document.documentElement, pr;
        if (FS.on()) { var ex = document.exitFullscreen || document.webkitExitFullscreen; if (ex) pr = ex.call(document); }
        else {
          var rf = d.requestFullscreen || d.webkitRequestFullscreen; if (!rf) return;
          pr = rf.call(d, { navigationUI: 'hide' });
          if (pr && pr.then && ACH.touch && ACH.touch.on) pr.then(function () {
            try { var o = screen.orientation; if (o && o.lock) { var lp = o.lock('landscape'); if (lp && lp.catch) lp.catch(function () {}); } } catch (e) { /* nada */ }
          }, function () {});
        }
        if (pr && pr.catch) pr.catch(function () {});
      } catch (e) { /* bloqueado: da igual */ }
    },
    sync: function () {
      var on = FS.on(), ok = FS.enabled(), bs = document.querySelectorAll('.fsbtn');
      for (var i = 0; i < bs.length; i++) {
        bs[i].classList.toggle('hide', !ok); bs[i].classList.toggle('fs-on', on);
        bs[i].setAttribute('aria-pressed', on ? 'true' : 'false');
        bs[i].title = on ? 'Salir de pantalla completa' : 'Pantalla completa';
      }
    }
  };
  ACH.fullscreen = FS;
  function initFsButton() {
    var b = document.getElementById('fsBtn');
    if (b) b.addEventListener('click', function (e) { e.preventDefault(); FS.toggle(); b.blur(); });
    document.addEventListener('fullscreenchange', FS.sync);
    document.addEventListener('webkitfullscreenchange', FS.sync);
    FS.sync();
  }

  /* ---------------- Bucle ---------------- */
  var acc = 0, lastT = 0, fpsN = 0, fpsT = 0;
  function frame(now) {
    // lienzo.js: con el contexto de #world (o un búfer GPU) perdido, ni se actualiza ni se dibuja; al volver se rehornea
    if (ACH.lienzo && ACH.lienzo.paused()) { lastT = 0; requestAnimationFrame(frame); return; }
    now /= 1000;
    var dt = lastT ? now - lastT : STEP; lastT = now;
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    while (acc >= STEP) { update(STEP); if (!G.holdInput) ACH.input.endStep(); acc -= STEP; }
    ACH.render.render(ctx, G);
    if (ACH.audio && ACH.audio.setListener) ACH.audio.setListener(G.cam.x + ACH.render.VIEW.w / 2, G.cam.y + ACH.render.VIEW.h / 2);
    feedAudio(dt);
    fpsN++; fpsT += dt;
    if (fpsT >= 0.5) { G.fps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; }
    if (G.debugOn) {
      var p = G.player, alive = 0;
      for (var i = 0; i < G.zombies.length; i++) if (G.zombies[i].state !== 'muerto') alive++;
      ACH.hud.debug(true, 'FPS ' + G.fps + ' · ' + G.state + ' · x ' + Math.round(p.x) + ' y ' + Math.round(p.y) +
        ' · zombies ' + alive + (ACH.sprites ? '' : ' · sin sprites.js'));
    } else ACH.hud.debug(false);
    requestAnimationFrame(frame);
  }

  function init() {
    canvas = document.getElementById('world');
    var hk0 = ACH.render.K ? ACH.render.K() : 1;   // v0.15 (A)
    canvas.width = ACH.render.VIEW.w * hk0; canvas.height = ACH.render.VIEW.h * hk0;
    ctx = canvas.getContext('2d');
    // si el navegador nunca devuelve el contexto, lienzo.js cambia #world por un canvas nuevo
    if (ACH.lienzo) ACH.lienzo.bindWorld(canvas, function (c) { canvas = c; ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false; });
    ACH.world.buildProps();
    ACH.render.buildGround();
    ACH.hud.init();
    resetWorld();
    setState('title');
    var lb = document.getElementById('lvl2Btn');   // v0.9: botón «NIVEL 2: EL CERRO» del título
    if (lb) lb.addEventListener('click', function (e) { e.preventDefault(); if (G.state === 'title') pendingLevel = 'cerro'; lb.blur(); });
    var mb = document.getElementById('mapBtn');   // v0.10: «MAPA DE LIMA (tecla 3)», solo si ya se ganó el Cerro
    if (mb) mb.addEventListener('click', function (e) { e.preventDefault(); if (G.state === 'title') pendingMap = true; mb.blur(); });
    var wg = document.getElementById('winGo');   // v0.10: el botón de la victoria se puede tocar (no solo ENTER)
    if (wg) wg.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); if (G.state === 'won') winTap = true; wg.blur(); });
    syncMapBtn();
    var vj = null; try { vj = viaje() ? viaje().take() : null; } catch (e) { vj = null; }
    if (vj && vj.carry && vj.carry.hab) tryCall(ACH.hab, 'restore', vj.carry.hab);   // v0.12: el árbol llega ya (también al volver al mapa, donde el carry espera en mapCarry)
    fit();
    if (vj && IS_MIRA) arrive(vj.carry);                                    // v0.10: viene del mapa → sin portada
    else if (vj && vj.extra && vj.extra.nivel && ACH.levels && ACH.levels[vj.extra.nivel]) revisit(vj.extra.nivel, vj.carry);   // v0.11: de Miraflores a un nivel vencido, sin título
    else if (vj && vj.extra && vj.extra.mapa && ACH.cima) openMap(vj.carry);   // v0.10: vuelve de Miraflores → el mapa directo
    else if (/[?&]nivel=cerro\b/.test(location.search || '') && ACH.levels && ACH.levels.cerro) { try { ACH.audio && ACH.audio.unlock && ACH.audio.unlock(); } catch (e) { /* nada */ } startIntro('cerro', true); }
    initFsButton();
    window.addEventListener('resize', fitSoon);
    window.addEventListener('orientationchange', function () { fitSoon(); setTimeout(fit, 300); });
    document.addEventListener('fullscreenchange', fitSoon);
    document.addEventListener('webkitfullscreenchange', fitSoon);
    if (!ACH.sprites) console.warn('[ACHORADO] ACH.sprites no está: usando placeholders.');
    requestAnimationFrame(frame);
  }

  /* ---------------- Debug para QA ---------------- */
  // v0.6: se fusiona (inventario.js ya pudo poner give/inv)
  var DBG = {
    state: function () { return G.state; },
    player: function () { var p = G.player; return { x: p.x, y: p.y, hp: p.hp, stamina: p.stamina, dir: p.dir, bird: p.bird,
      guitar: p.guitar ? p.guitar.dur : null, held: p.held ? p.held.id : null, invisT: p.invisT || 0, sickT: p.sickT || 0, boostT: p.boostT || 0 }; },
    zombies: function () { return G.zombies.map(function (z) { return { type: z.type, x: z.x, y: z.y, hp: z.hp, state: z.state, social: z.social || (z.soc ? "ex-" + z.soc.kind : undefined) }; }); },
    teleport: function (x, y) { G.player.x = x; G.player.y = y; G.lookAt = null; snapCamera(); },
    look: function (x, y) { G.lookAt = { x: x, y: y }; snapCamera(); return { x: G.cam.x, y: G.cam.y }; },
    routeCheck: function (R) { return ACH.world.routeCheck(R); },   // R = radio del círculo (24 px de paso = 12)
    blood: function () { return ACH.world.bloodPerScreen(); },
    lotsBaked: function () { return ACH.world.lotsBaked.slice(); },
    spawnCheck: function () { return ACH.world.spawnCheck(); },
    lots: function () { return ACH.world.LOTS.map(function (f) { var o = {}; for (var k in f) o[k] = f[k]; return o; }); },
    lights: function () { return ACH.world.lights.slice(); },
    bakeMs: function () { return ACH.render.bakeMs(); },
    dogs: function () { return G.npcs.dogs.map(function (d) { return { x: d.x, y: d.y, state: d.state, face: d.face, barkCD: d.barkCD }; }); },
    birds: function () { return G.npcs.birds.map(function (b) { return { x: b.x, y: b.y, z: b.z, state: b.state, pole: b.pole }; }); },
    // v0.9: ACH.debug.level(id) carga el nivel y juega (con la mochila de prueba); level() → id actual
    level: function (id) { if (id) { if (!loadLevel(id, { kit: true })) return null; ACH.input.reset(); setState('playing'); } return levelId; },
    rest: function (i) { var RP = ACH.world.restPoints || []; if (i === undefined) return { idx: G.restIdx, list: RP }; var r = RP[i]; if (r) { G.restIdx = i; DBG.teleport(r.x, r.y); } return r || null; },
    setHp: function (n) { G.player.hp = Math.max(0, Math.min(ACH.ent.CFG.hpMax, n)); },
    start: function () {
      if (G.state === 'title' || G.state === 'won') resetWorld();
      ACH.input.reset();
      setState('playing');
    },
    // v0.6
    cats: function () { return ACH.inter ? ACH.inter.cats(G) : []; },
    props: function (onlyDamaged) {   // estado de daño de cada prop que reacciona; props(true) = solo los tocados
      var l = ACH.inter ? ACH.inter.props() : [];
      return onlyDamaged ? l.filter(function (o) { return o.state || o.broken || o.alarm || (o.hpMax && o.hp < o.hpMax); }) : l;
    },
    sling: function () { var s = G.sling || {}; return { charging: !!s.charging, charge: s.c || 0, spin: s.spin || 0, cd: s.cd || 0, stones: ACH.inter ? ACH.inter.stones().length : 0, last: G.lastStone ? { x: G.lastStone.x, y: G.lastStone.y } : null }; },
    hitProp: function (i, dmg, src) { var pr = ACH.world.props[i]; return ACH.inter && pr ? ACH.inter.damageProp(G, pr, dmg === undefined ? 1 : dmg, src || 'swing') : false; }
  };
  ACH.debug = ACH.debug || {};
  for (var dk in DBG) ACH.debug[dk] = DBG[dk];
  // respaldo si inventario.js no trae give (se espera: inventario.js lo instala solo si todavía no existe)
  if (ACH.inv && ACH.inv.installDebug) { try { ACH.inv.installDebug(); } catch (e) { /* nada */ } }
  setTimeout(function () {
    if (ACH.debug.give) return;
    ACH.debug.give = function (id, n) { var iv = ACH.inv; n = n === undefined ? 1 : n; return iv && iv.add ? iv.add(id, n) : 'sin inventario'; };
  }, 12000);

  // v0.10 (QA): gana el nivel actual (como tocar la salida); en la intro cierra el diálogo antes
  ACH.debug.win = function () {
    if (ACH.dialogo && ACH.dialogo.active() && G.state === 'intro') ACH.dialogo.close();
    if (G.state === 'title') { DBG.start(); }
    if (G.state === 'playing' || G.state === 'paused' || G.state === 'dead') { if (G.player.hp <= 0) G.player.hp = 1; doWin(); }
    return G.state;
  };
  ACH.debug.winGo = function () { if (G.state === 'won') { G.wonT = WON_MIN; winTap = true; } return G.state; };

  // v0.5: sonido
  ACH.debug.audio = function () { return ACH.audio && ACH.audio.info ? ACH.audio.info() : { state: 'sin motor' }; };
  ACH.debug.sfx = function (name, data) { if (ACH.audio && ACH.audio.emit) ACH.audio.emit(name, data); return ACH.debug.audio(); };
  // ACH.debug.mood('chase', 0.5) fija el ánimo (el juego deja de calcularlo); ACH.debug.mood() lo devuelve al juego.
  ACH.debug.mood = function (m, i) {
    mood.override = m ? { m: m, i: i === undefined ? 0.5 : i } : null;
    if (mood.override) { music().setMood(m); music().setIntensity(mood.override.i); } else stateAudio(G.state, G.state);
    return ACH.debug.audio();
  };

  ACH.game = { G: G, update: update, step: function (n) { for (var i = 0; i < (n || 1); i++) { update(STEP); if (!G.holdInput) ACH.input.endStep(); } },
    respawn: respawn, startIntro: startIntro, arrive: arrive, carryState: carryState, openMap: openMap, winGo: winGo, autoPause: autoPause, loadLevel: loadLevel, levelId: function () { return levelId; }, nextLevel: nextLevel, fit: function () { fit(); }, view: function () { return G.view; },
    // v0.11 (agente C): pausa, mapa desde la pausa, viajes y el cuarto
    state: function () { return G.state; }, resume: resume, goBase: goBase, openMapPause: openMapPause, travel: travel, toTitle: toTitle,
    // v0.13 (A1): guardado y título
    hereId: hereId, continuar: continuar, newGame: newGame, resumeAt: resumeAt, mapReady: mapReady, autoSave: autoSave,
    titleMap: function () { if (G.state === 'title' && mapReady()) { pendingMap = true; return true; } return false; },
    titleLevel: function (id) { if (G.state === 'title') { pendingLevel = id || 'cerro'; return true; } return false; } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
