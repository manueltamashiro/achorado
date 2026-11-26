/* ACHORADO — js/engine/noche.js (v0.8, G2): la noche.
   Anochece una sola vez por partida: a los 5 min de juego (G.time) o al cruzar el segundo jirón (x > 84*16), lo que pase primero.
   Transición de 20 s (ACH.noche.t va de 0 a 1): el mapa de luz baja a oscuro, la niebla se vuelve azul, se prenden más postes y ventanas
   (render.js y social.js leen ACH.noche), la música pasa a la variante nocturna y sale el afiche «SE HIZO DE NOCHE…».
   API:
     ACH.noche.update(G, dt) idempotente (se basa en G.time): la llama render.js cada cuadro; si game.js también la llama, no pasa nada.
     ACH.noche.reset(G)    partida nueva: vuelve el atardecer (también se detecta sola: estado 'intro' o G.time que vuelve a 0).
     ACH.noche.zMul(z|state) multiplicador de velocidad de un zombie: 1 de día; de noche 2.0 persiguiendo/atacando/embistiendo y 1.5 si no.
                           Sube con la transición. Al despertar de noche (después de morir), 10 s de gracia con zMul = 1 (y 1.5 s de rampa).
     ACH.noche.sightMul()  0.8 de noche (ven 20 % menos) · ACH.noche.hearMul() 1.3 (oyen 30 % más). Suben con la transición.
     ACH.noche.t, isNight(), graceLeft(), ambient(dayHex), info().
     ACH.noche.force(on)   noche al instante (true) / atardecer (false). ACH.noche.cfg: atTime, triggerX (px; null = solo por tiempo), triggerY (v0.9: y < triggerY), trans, grace…
     ACH.noche.applyLevel(world): pone el cfg del nivel (world.cfgNoche); está registrado en ACH.levelHooks.
   Debug: ACH.debug.night(true|false) hace la transición al instante (true) o vuelve al atardecer (false). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  var CFG = {
    atTime: 300,            // s de juego hasta que anochece
    triggerX: 84 * 16,      // px: cruzar el segundo jirón (nivel 1). Otro nivel lo cambia en ACH.noche.cfg.triggerX; null = solo por tiempo
    triggerY: null,         // v0.9 (H3): px; anochece al subir por encima (y < triggerY). El Cerro: fila 70. null = no aplica
    trans: 20,              // s de transición
    grace: 10, graceRamp: 1.5,   // s de gracia al despertar de noche, y rampa de vuelta a la doble velocidad
    chase: 2.0, roam: 1.5, sight: 0.8, hear: 1.3,
    bannerT: 5.2,           // s que se ve el afiche
    kicker: 'AV. GAMBETTA · 7:00 P.M.',   // línea chica del afiche (otro nivel la cambia en ACH.noche.cfg.kicker)
    nightAmbient: [70, 82, 124]   // ambiente de noche (multiplica: azul oscuro; los personajes se leen por entityLift y el halo)
  };

  // v0.9 (H3): cada nivel trae su disparador (ACH.world.cfgNoche = {atTime, triggerX, triggerY, kicker}); sin él, los del nivel 1.
  var DEF = { atTime: CFG.atTime, triggerX: CFG.triggerX, kicker: CFG.kicker };
  function applyLevel(W) {
    var c = W && W.cfgNoche;
    CFG.atTime = c && c.atTime !== undefined ? c.atTime : DEF.atTime;
    CFG.triggerX = c ? (c.triggerX !== undefined ? c.triggerX : null) : DEF.triggerX;
    CFG.triggerY = c && c.triggerY !== undefined ? c.triggerY : null;
    CFG.kicker = (c && c.kicker) || DEF.kicker;
  }
  (ACH.levelHooks = ACH.levelHooks || []).push(function (id, W) { applyLevel(W || ACH.world); });
  if (ACH.world && ACH.world.cfgNoche) applyLevel(ACH.world);

  var S = { started: false, startAt: 0, t: 0, graceUntil: -1, graceFrom: -1, lastTime: 0, lastState: '', lastCall: 0, banner: null, bannerAt: -1, music: false, hold: false };
  var N = { t: 0, CFG: CFG };

  function getG() { return (ACH.game && ACH.game.G) || ACH.G || null; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function sfx(name, data) { var a = ACH.audio; if (a && a.emit) { try { a.emit(name, data); } catch (e) { /* el audio nunca rompe el juego */ } } }
  function setMusicNight(on) {
    S.music = on;
    var a = ACH.audio, mu = a && a.music, me = a && a.musicEngine;
    try {
      if (mu && mu.setNight) mu.setNight(!!on);            // motor.js: recuerda la variante si la música aún no arranca
      else if (me && me.setNight) me.setNight(!!on);
    } catch (e) { /* nada */ }
  }
  function say(G) {
    var a = ACH.audio, p = G && G.player;
    if (!a || !a.say || !p) return;
    try {
      if (a.phrases && a.phrases.night) a.say('night', { who: 'alex', x: p.x, y: p.y, always: true });
      else a.say('¡Ya se hizo de noche, causa! Ahora sí se pone feo.', { who: 'alex', x: p.x, y: p.y, force: true });
    } catch (e) { /* nada */ }
  }

  /* ---------------- Afiche chicha ---------------- */
  var styled = false;
  function injectStyle() {
    if (styled) return; styled = true;
    var st = document.createElement('style');
    st.textContent =
      '#nightBanner{position:absolute;left:50%;top:22%;transform:translate(-50%,-50%) rotate(-3deg);z-index:6;pointer-events:none;display:none;' +
      'text-align:center;background:#131015;border:calc(var(--u)*2) solid #ff2e88;box-shadow:calc(var(--u)*3) calc(var(--u)*3) 0 #1fe07a,calc(var(--u)*-2) calc(var(--u)*-2) 0 #ffe500;' +
      'padding:calc(var(--u)*5) calc(var(--u)*10) calc(var(--u)*6);max-width:92%}' +
      '#nightBanner.on{display:block;animation:nbIn 5.2s ease-out forwards}' +
      'body[data-state="paused"] #nightBanner,body[data-state="dead"] #nightBanner,body[data-state="won"] #nightBanner{animation-play-state:paused;visibility:hidden}' +   // QA v0.13: tampoco sobre el cartel de victoria
      '#nightBanner .k{display:block;font-family:var(--pixel);font-size:calc(var(--u)*5);letter-spacing:.2em;color:#4aa8ff;margin-bottom:calc(var(--u)*2)}' +
      '#nightBanner .a{display:block;font-family:var(--display);font-size:calc(var(--u)*17);line-height:1;color:#ffe500;' +
      'text-shadow:calc(var(--u)*1) calc(var(--u)*1) 0 #ff2e88,calc(var(--u)*2) calc(var(--u)*2) 0 #131015;white-space:nowrap}' +
      '#nightBanner .b{display:block;font-family:var(--display);font-size:calc(var(--u)*9);line-height:1.1;color:#1fe07a;margin-top:calc(var(--u)*3);' +
      'text-shadow:calc(var(--u)*1) calc(var(--u)*1) 0 #131015;white-space:nowrap}' +
      '#nightBanner i{position:absolute;width:calc(var(--u)*22);height:calc(var(--u)*6);background:rgba(226,214,170,.78);top:calc(var(--u)*-3)}' +
      '#nightBanner i.l{left:calc(var(--u)*-6);transform:rotate(-24deg)}#nightBanner i.r{right:calc(var(--u)*-6);transform:rotate(20deg)}' +
      '@keyframes nbIn{0%{opacity:0;transform:translate(-50%,-50%) rotate(-3deg) scale(1.6)}7%{opacity:1;transform:translate(-50%,-50%) rotate(-3deg) scale(.94)}' +
      '11%{transform:translate(-50%,-50%) rotate(-3deg) scale(1.03)}14%,82%{opacity:1;transform:translate(-50%,-50%) rotate(-3deg) scale(1)}' +
      '100%{opacity:0;transform:translate(-50%,-56%) rotate(-3deg) scale(1)}}' +
      '@media (max-aspect-ratio:4/3){#nightBanner .a{font-size:calc(var(--u)*12)}#nightBanner .b{font-size:calc(var(--u)*7)}}';
    document.head.appendChild(st);
  }
  function bannerEl() {
    if (S.banner) return S.banner;
    var stage = document.getElementById('stage'); if (!stage) return null;
    injectStyle();
    var d = document.createElement('div'); d.id = 'nightBanner';
    d.innerHTML = '<i class="l"></i><i class="r"></i><span class="k"></span><span class="a">SE HIZO DE NOCHE…</span><span class="b">¡LOS MUERTOS SE PONEN ACHORADOS!</span>';
    stage.appendChild(d);
    S.banner = d;
    return d;
  }
  function showBanner() {
    var b = bannerEl(); if (!b) return;
    var k = b.querySelector('.k'); if (k) k.textContent = CFG.kicker || '';
    b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
    S.bannerAt = (getG() || {}).time || 0;
  }
  function hideBanner() { if (S.banner) S.banner.classList.remove('on'); S.bannerAt = -1; }

  /* ---------------- Núcleo ---------------- */
  function start(G, instant) {
    if (S.started) return;
    S.started = true;
    S.startAt = (G.time || 0) - (instant ? CFG.trans : 0);
    S.graceUntil = -1;
    setMusicNight(true);
    sfx('night.fall', { x: G.player ? G.player.x : 0, y: G.player ? G.player.y : 0 });
    showBanner();
    say(G);
    if (ACH.hud && ACH.hud.toast && !S.banner) ACH.hud.toast('¡SE HIZO DE NOCHE!');
    N.t = S.t = instant ? 1 : 0;
  }
  function reset() {
    S.started = false; S.startAt = 0; N.t = S.t = 0; S.graceUntil = -1; S.graceFrom = -1;
    hideBanner();
    if (S.music) setMusicNight(false);
  }
  function update(G) {
    G = G || getG();
    S.lastCall = performance.now();
    if (!G || !G.player) return;
    var st = G.state, tm = G.time || 0;
    // partida nueva: estado 'intro' recién entrado, o el reloj de juego volvió a cero
    if ((st === 'intro' && S.lastState !== 'intro') || (st === 'title' && S.started) || tm < S.lastTime - 0.5) { reset(); S.hold = false; }
    // despertar de noche: 10 s de gracia
    if (S.started && S.lastState === 'dead' && st === 'playing') { S.graceFrom = tm; S.graceUntil = tm + CFG.grace; }
    if (!S.started && !S.hold && st === 'playing' && (tm >= CFG.atTime || (CFG.triggerX != null && G.player.x > CFG.triggerX) ||
        (CFG.triggerY != null && G.player.y < CFG.triggerY))) start(G, false);
    if (S.started) N.t = S.t = clamp01((tm - S.startAt) / CFG.trans);
    if (S.bannerAt >= 0 && tm - S.bannerAt > CFG.bannerT + 0.5) hideBanner();
    S.lastTime = tm; S.lastState = st;
  }
  function graceK(G) {
    if (S.graceUntil < 0) return 1;
    var tm = (G && G.time) || 0;
    if (tm < S.graceFrom) return 1;
    if (tm < S.graceUntil) return 0;
    return clamp01((tm - S.graceUntil) / CFG.graceRamp);
  }
  function chasing(z) {
    if (typeof z === 'string') return z === 'perseguir' || z === 'atacar' || z === 'embestir' || z === 'chase';   // zMul('perseguir')
    return !!z && (z.state === 'perseguir' || z.state === 'atacar' || z.lungeT > 0 || z.lunging || z.state === 'embestir'); }
  function zMul(z) {
    if (!(S.t > 0)) return 1;
    var k = S.t * graceK(getG());
    if (!(k > 0)) return 1;
    return 1 + ((chasing(z) ? CFG.chase : CFG.roam) - 1) * k;
  }
  function sightMul() { return 1 + (CFG.sight - 1) * S.t; }
  function hearMul() { return 1 + (CFG.hear - 1) * S.t; }
  function isNight() { return S.started; }
  function graceLeft() { var G = getG(); return S.graceUntil < 0 || !G ? 0 : Math.max(0, S.graceUntil - (G.time || 0)); }

  // Color del ambiente del mapa de luz: el de la tarde (hex de CFG.fx.lightAmbient) mezclado hacia la noche. Cacheado por paso de t.
  var ambCache = { key: '', val: '' };
  function ambient(dayHex) {
    var t = S.t;
    if (!(t > 0)) return dayHex;
    var q = Math.round(t * 64), key = dayHex + q;
    if (ambCache.key === key) return ambCache.val;
    var h = String(dayHex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var d = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)], n = CFG.nightAmbient, k = q / 64;
    var ease = k * k * (3 - 2 * k), out = '#';
    for (var i = 0; i < 3; i++) { var v = Math.round(d[i] + (n[i] - d[i]) * ease); out += (v < 16 ? '0' : '') + v.toString(16); }
    ambCache.key = key; ambCache.val = out;
    return out;
  }
  function info() {
    var G = getG();
    return { t: +S.t.toFixed(3), night: S.started, startAt: S.started ? +S.startAt.toFixed(1) : null, time: G ? +(G.time || 0).toFixed(1) : null,
      grace: +graceLeft().toFixed(2), zMulChase: +zMul({ state: 'perseguir' }).toFixed(2), zMulRoam: +zMul({ state: 'deambular' }).toFixed(2),
      sight: +sightMul().toFixed(2), hear: +hearMul().toFixed(2), music: S.music };
  }

  // Respaldo: si nadie llama a update (render.js la llama en cada cuadro), un rAF propio la mantiene viva.
  function fallback() {
    requestAnimationFrame(fallback);
    if (performance.now() - S.lastCall > 300) update(getG());
  }
  requestAnimationFrame(fallback);

  // Fuerza la noche al instante (true) o vuelve al atardecer (false); sin argumento, alterna.
  function force(on) {
    var G = getG();
    if (on === undefined) on = !S.started;
    if (on) { if (!G) return info(); if (S.started) { S.startAt = (G.time || 0) - CFG.trans; N.t = S.t = 1; S.graceUntil = -1; } else start(G, true); }
    else { reset(); S.hold = true; }   // QA v0.8: el atardecer forzado no se vuelve a apagar por el reloj hasta la próxima partida
    return info();
  }

  function installDebug() {
    ACH.debug = ACH.debug || {};
    if (ACH.debug.night && ACH.debug.night._noche) return;
    var f = function (on) { return force(on); };
    f._noche = true;
    ACH.debug.night = f;
    ACH.debug.noche = info;
  }
  installDebug();
  window.addEventListener('load', installDebug);
  var dbgTries = 0, dbgTimer = setInterval(function () { installDebug(); if (++dbgTries > 20) clearInterval(dbgTimer); }, 300);

  N.update = update; N.reset = reset; N.zMul = zMul; N.sightMul = sightMul; N.hearMul = hearMul; N.isNight = isNight;
  N.force = force; N.cfg = CFG; N.applyLevel = applyLevel; N.graceLeft = graceLeft; N.ambient = ambient; N.info = info; N.start = function (G) { start(G || getG(), false); };
  ACH.noche = N;
})();
