/* ACHORADO — js/barranco/jaranon.js (B1b): DON JARANÓN, la Voz de Oro de Barranco (jefe del nivel Barranco), la peña
   «La Última Jarana» como arena (tabladillo, mesas y columnas sólidas, pista de baile con losetas), la banda zombie (guitarrista
   y cajonero), el metrónomo-cajón, el pregón y la RESPUESTA (contrapunto), las 3 fases (vals · festejo · landó), la muerte y el
   disparo de la cinemática final (ACH.br.final.play) con el mundo congelado.
   Contrato: BARRANCO.md §6 (+ §1 reloj del compás, §2.4 final, §10.2/10.3 sprites). Patrón copiado de js/costaverde/chef.js y
   js/miraflores/jefa.js (sin editarlos). «Jefe justo» (V011 §2.3): nunca inmune en la pelea; golpe de cercanía ≤ 42 px.

   SE REGISTRA con ACH.br.register(sys) (si no existe, crea ACH.br = {systems: [], register}) como
     { id/name: 'jaranon', update, reset, onRespawn, mood, drawables, drawTop, onSwing, onProjectile }.
   Jaranón, el cajonero y los proyectiles NO están en G.zombies (los jaraneros que llama en la fase 2 sí: son zombies normales).

   PUBLICA ACH.br.jaranon (el mismo objeto siempre; también como ACH.cv.chef si ACH.cv no trae uno, para que los perros de
   juguetes.js, partida.js, dificultad.js y habilidades.js lo reconozcan como «jefe en pelea»):
     state  'espera' | 'entrada' | 'pelea' | 'muriendo' | 'muerto' (sentado en el tabladillo) · dead · hp/hpMax (48) · phase (1–3)
     x, y (pies, px) · resp (true: compás de RESPUESTA abierto) · stunT · airT · contrapuntos · fightT · info() · targets() · hitBy()
   EL COMPÁS: clock() → {pulse (real, en pulsos efectivos), per (s), meter (pulsos por compás), bpm, src}. Sale de ACH.br.beat()
     (B1a; que a su vez usa ACH.audio.br.beat() de criolla.js); si no está o devuelve basura, reloj interno con el tempo de la fase.
     Si el pulso del reloj es muy corto (< 0,28 s: corcheas del 6/8), se agrupa de a 3 (o de a 2): el «pulso» de la pelea es la
     negra con puntillo. A tiempo = a ≤ tol s del pulso efectivo (tol 0,12; Landó del Contrapunto: su tol; Tranqui: ×1,5).
   MÚSICA: ACH.audio.br.play('jefe1'|'jefe2'|'jefe3') por fase, setTempoMul(m) (cajonero), stop() al morir; ACH.br.setTempo(bpm, meter)
     para el reloj interno de nivel.js. Todo protegido.
   ARENA: ACH.world.pena = {c0, r0, c1, r1, escenario, pista} (tiles; escenario/pista = rect {c0,r0,c1,r1} o {x0,y0,x1,y1} px) y
     places.penaPuerta / penaEscenario. Sin eso: places.penaEscenario ± 11 × 7 tiles; sin nada: debug arenaHere().
   SÓLIDOS en ACH.world.dynSolids (jefa: true → routeCheck los ignora): 'br.jaranon.cuerpo', 'br.pena.portón' (cierra la puerta en la
     pelea, solo si la puerta está en el borde de la caja), 'br.pena.mesaN' (6–8 mesas; se rompen con la nota sostenida: hp 10) y
     'br.pena.columnaN' (2–4 columnas, no se rompen).
   MELODÍAS: ACH.hab.onCast(fn(id, rank)) si existe; si no, flanco de subida de G.player.habStrumT (id = ACH.hab.selected()).
     Cualquier melodía en el compás de RESPUESTA = ¡CONTRAPUNTO! Además: lamento le hace su daño si está en el radio, mareo lo
     ralentiza, rasgueo lo aturde 1 s; contrapunto (Landó) ensancha la ventana y multiplica los golpes a tiempo.
   PROYECTILES (onProjectile, pr.kind): 'cajon' / 'held:cajon' (área: 0,5; a tiempo ×2) · 'botella' / 'throw:botella*' (1; dorada 2;
     si cae a ≤ 30 px de sus pies, RESBALA y cae 1,5 s, máx. cada 8 s; también si pisa un charco de ACH.br.charcos / charcoAt) ·
     'ball' (×1,5) · 'throw:helado' (0,5 y lo ralentiza) · 'heavy:*' · 'stone' (1) · 'dog' · 'bubble' (0). Otros 'throw:*' rebotan.
   FINAL: muere → se sienta en el borde del tabladillo, la banda calla, retrato «Ya, maestro…», +12 sencillos y 1 picarones,
     bandera barranco.jefe, +150 XP → congela (ACH.br.freeze o G.state = 'cine') → ACH.br.final.play({onEnd}) → onEnd →
     ACH.br.finish(stats) (cartel de B1a) → respaldo ACH.debug.win(). Sin final.js, directo a finish.
   DEBUG: ACH.debug.br.jefe = { start(), fase(n), win(quick), state(), hp(n), arenaHere(), field(), resp(), bot(on, {contrapunto}) }.
   Sin getImageData, shadowBlur, filter ni degradados en el bucle: los reemplazos y textos se hornean una vez. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var BR = ACH.br = ACH.br || {};
  BR.systems = BR.systems || [];
  if (typeof BR.register !== 'function') BR.register = function (s) { if (s && BR.systems.indexOf(s) < 0) BR.systems.push(s); return s; };

  /* ---------------- Afinación ---------------- */
  var D2R = Math.PI / 180, U = 10;   // U = «1 de daño» del contrato (10 de 100 de vida)
  var K = {
    hp: 96, ph2: 0.6, ph3: 0.25,   /* ajuste jefe (br-ajustes-jefe.md): 48 → 96 */
    bodyW: 13, bodyUp: 8, bodyDn: 3, nearBody: 42, hitRx: 20, hitRy: 16, walk: 22, keepDist: 40,
    // tempos del reloj interno (y los que se piden a nivel.js)
    tempo: [null, { bpm: 100, meter: 3 }, { bpm: 120, meter: 2 }, { bpm: 80, meter: 4 }],
    minPulse: 0.28, swingLag: 0.09, tol: 0.12, tolEasy: 1.5,
    // ajuste jefe: el compás manda. Golpe cuerpo a cuerpo A TIEMPO ×onMul, a destiempo ×offMul; «SE LUCE» (respuesta sin contestar) = ×vozMul
    // a todo hasta el próximo CONTRAPUNTO (o un resbalón en charco); aturdido y resbalón ignoran la coraza
    onMul: 1.25, offMul: 0.7, vozMul: 0.6, respMissFails: true,
    // notas de vals
    noteN: 3, noteNBig: 5, noteSpd: 180, noteSpdBig: 215, noteArc: 34 * D2R, noteArcBig: 60 * D2R, noteDmg: 1 * U, noteR: 5, noteRange: 330,
    // pañuelazo
    panR: 62, panRBig: 80, panArc: 120 * D2R, panArcBig: 160 * D2R, panDmg: 0.5 * U, panPush: 26, panNear: 96,
    // losetas
    tile: 16, tileDmg: 0.8 * U, burnFx: 0.28,   // ajuste jefe: 1 → 0.8 (la fase 2 dura más)
    // jaraneros
    summonMax: 4, summonEvery: 12,
    // cajonero
    cajHp: 4, tempoStep: 0.05, tempoMax: 1.2,
    // nota sostenida
    coneArc: 50 * D2R, coneRange: 280, coneSweep: 120 * D2R, coneDmg: 1 * U, mesaHp: 10,
    // zapateo
    stompR: 48, stompRBig: 72, stompDmg: 1 * U, stompPush: 24,
    // aturdido, sin aire, resbalón
    stunT: 2.5, airT: 2.5, slipT: 1.5, slipCD: 8, mul: 2, mulCap: 3,
    slowT: 2, slowMul: 0.5, slowCD: 6, dogDmg: 0.3,
    // botín
    loot: 12, xp: 150
  };
  var TXT = {
    silencio: '¡Silencio en la sala! ¡Que aquí canta la Voz de Oro!',
    reta: '¿Un muchacho con guitarra? ¡A ver si me respondes, compadre!',
    otraVez: '¡Otra vez tú! ¡A ver si ahora me respondes!',
    responde: '¡Responde, compadre!',
    eso: '¡Eso es jarana!',
    luce: '¡Así se canta, muchacho! ¡Aprende!',
    aire: '¡Aire, aire, compadre!',
    fase2: '¡Ahora un festejo, que la pista quema!',
    fase3: '¡Y un landó pa\'l final, despacito y con pena!',
    cajonero: '¡Más rápido, cajonero!',
    cajCae: '¡Mi cajonero! ¡Levántate, compadre!',
    resbala: '¡Ay, mi terno!',
    muere: 'Qué bonita… la última jarana…',
    firstHit: '¡Dale nomás! Esquiva al compás y métele guitarra',
    firstResp: 'Cuando diga ¡RESPONDE!, pégale A TIEMPO con el pulso o toca una melodía (a destiempo, la respuesta falla)',
    contra: '¡CONTRAPUNTO!', aTiempo: '¡A TIEMPO!', respLabel: '¡RESPONDE!',
    vozOn: '¡Se luce! Mientras no le respondas, tus golpes le entran menos. En ¡RESPONDE! pégale A TIEMPO', vozRota: '¡SE LE BAJARON LOS HUMOS!',
    sentado: 'E  HABLAR CON DON JARANÓN'
  };
  var PREGON = [
    '¡Del Callao vino un muchacho, con guitarra y sin zapatos!',
    '¡En Barranco la jarana no se acaba hasta mañana!',
    '¡Mi voz de oro no se apaga, ni con muerte ni con plaga!',
    '¡Picarones con su miel, pa\'l que sepa responder!',
    '¡Por el Puente de los Suspiros pasan muertos dando giros!',
    '¡A ver, chalaquito, respóndeme bonito!',
    '¡Cántame algo, compadre, que la noche ya no arde!',
    '¡Si me ganas la jarana, te regalo la mañana!'
  ];
  var DLG_IN = [
    { quien: 'alexander', cara: 'sorpresa', texto: '¿Don Jaranón? ¿La Voz de Oro? Mi abuela lo escuchaba en la radio todos los domingos…' },
    { quien: 'alexander', cara: 'triste', texto: 'Y ahora está… así.' },
    { quien: 'alexander', cara: 'serio', texto: 'Perdón, maestro, pero vamos a tener que hacer jarana de la brava.' }];
  var DLG_DEAD = [{ quien: 'alexander', cara: 'triste', texto: 'Ya, maestro. Ya terminó la función.' }];

  /* ---------------- Utilidades ---------------- */
  function T() { return (ACH.world && ACH.world.T) || 16; }
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function now() { return ((window.performance && performance.now) ? performance.now() : Date.now()) / 1000; }
  function fn(o, k) { return !!o && typeof o[k] === 'function'; }
  var warned = {};
  function warnOnce(e) { var k = String(e && e.message); if (warned[k]) return; warned[k] = 1; try { console.warn('[jaranon]', e); } catch (er) { /* nada */ } }
  function safe(f) { try { return f(); } catch (e) { warnOnce(e); return undefined; } }
  function sfx(name, data) {
    if (fn(BR, 'sfx')) { try { BR.sfx(name, data); return; } catch (e) { /* cae al motor */ } }
    var A = ACH.audio; if (fn(A, 'emit')) { try { A.emit(name, data); } catch (e) { /* nada */ } }
  }
  function toast(s) {
    if (fn(BR, 'toast')) { try { BR.toast(s); return; } catch (e) { /* sigue */ } }
    if (ACH.hud && fn(ACH.hud, 'toast')) { try { ACH.hud.toast(s); } catch (e2) { /* nada */ } }
  }
  function ABR() { return ACH.audio && ACH.audio.br; }
  var musicOn = null;
  function bossMusic(id) {   // 'jefe1' | 'jefe2' | 'jefe3' | null (silencio)
    if (id === musicOn) return; musicOn = id;
    var A = ABR(), m = ACH.audio && ACH.audio.music, e = ACH.audio && ACH.audio.musicEngine;
    try {
      if (A && fn(A, 'play')) { if (id) A.play(id); else if (fn(A, 'stop')) A.stop(); }
      else if (m && fn(m, 'setBoss')) m.setBoss(!!id);
      else if (e && fn(e, 'setBoss')) e.setBoss(!!id);
    } catch (er) { warnOnce(er); }
  }
  function tempoMulAudio(m) { var A = ABR(); if (A && fn(A, 'setTempoMul')) { try { A.setTempoMul(m); } catch (e) { warnOnce(e); } } }
  function stinger(name) { var m = ACH.audio && ACH.audio.music; if (m && fn(m, 'stinger')) { try { m.stinger(name); } catch (e) { /* nada */ } } }
  var bubble = null;   // globo propio sobre Jaranón: {s, t, life}
  function voz(text, opts) {
    var A = ACH.audio; opts = opts || {};
    bubble = { s: text, t: 0, life: opts.life || 2.2 };
    void A; sfx('br.jefe.voz', { x: J.x, y: J.y, text: text, life: bubble.life });   // la voz la pone sfx-br/voces-br (B3); el globo es propio (un solo globo)
  }
  function hurtPlayer(G, dmg, opts) { if (ACH.ent && fn(ACH.ent, 'hurtPlayer')) return ACH.ent.hurtPlayer(G, dmg, opts); G.player.hp = Math.max(0, G.player.hp - dmg); return true; }
  function CFGE() { return (ACH.ent && ACH.ent.CFG) || { walk: 80, run: 135, radius: 5, hpMax: 100 }; }
  var selfIgnore = false;
  function collide(x, y, r) { var W = ACH.world; if (!W || !fn(W, 'collideCircle')) return false; selfIgnore = true; syncBody(); try { return !!W.collideCircle(x, y, r); } catch (e) { return false; } finally { selfIgnore = false; syncBody(); } }
  function shake(a, t) { if (ACH.fx && fn(ACH.fx, 'shake')) { try { ACH.fx.shake(a, t); } catch (e) { /* nada */ } } }
  function easyMode() { try { return !!(ACH.dif && fn(ACH.dif, 'get') && ACH.dif.get() === 'tranqui'); } catch (e) { return false; } }
  function flag(k, v) {
    var P = ACH.partida; if (!P || !fn(P, 'flag')) return false;
    try { return v === undefined ? !!P.flag(k) : P.flag(k, v); } catch (e) { return false; }
  }

  /* ---------------- Congelar el mundo ---------------- */
  var frozenByMe = false;
  function freeze(on) {
    var G = ACH.G;
    if (fn(BR, 'freeze')) { try { BR.freeze(!!on); frozenByMe = !!on; return; } catch (e) { warnOnce(e); } }
    if (!G) return;
    if (on) {
      if (G.state === 'playing') { G.state = 'cine'; safe(function () { ACH.hud.setState('cine'); }); frozenByMe = true; }
    } else if (frozenByMe) {
      frozenByMe = false;
      if (G.state === 'cine') { G.state = 'playing'; safe(function () { ACH.hud.setState('playing'); }); }
      safe(function () { ACH.input.reset(); });
    }
  }
  function dlgActive() { try { return !!(ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active()); } catch (e) { return false; } }
  function playDlg(lines, cb, id) {
    var D = ACH.dialogo, done = false, once = function () { if (done) return; done = true; if (cb) cb(); };
    if (D && fn(D, 'play')) {
      try { var r = D.play(lines, { onDone: once, id: id }); if (r !== false) return; } catch (e) { warnOnce(e); }
    }
    for (var i = 0; i < lines.length; i++) toast(lines[i].texto || lines[i]);
    setTimeout(once, 50);
  }

  /* ---------------- Secuencias en tiempo real (mundo congelado) ---------------- */
  var SQ = null, sqRaf = 0, sqLast = 0;
  function gamePaused() { var G = ACH.G; return !!(G && G.state === 'paused'); }
  function runSeq(steps, onEnd) {
    SQ = { steps: steps, i: -1, t: 0, onEnd: onEnd, waiting: false };
    nextStep();
    if (SQ && !sqRaf) { sqLast = now(); sqRaf = requestAnimationFrame(sqLoop); }
  }
  function nextStep() {
    var my = SQ; if (!my) return;
    my.i++; my.t = 0; my.waiting = false;
    var s = my.steps[my.i];
    if (!s) { SQ = null; if (my.onEnd) safe(my.onEnd); return; }
    if (s.enter) safe(s.enter);
    if (s.dlg) { my.waiting = true; playDlg(s.dlg, function () { if (SQ === my) nextStep(); }, s.id); }
  }
  function sqLoop() {
    sqRaf = 0; if (!SQ) return;
    var t = now(), dt = Math.min(0.05, t - sqLast); sqLast = t;
    if (!gamePaused()) {
      tickVisual(dt); if (camPan.on) panCam(dt);
      var s = SQ.steps[SQ.i];
      if (s && !SQ.waiting) { SQ.t += dt; if (s.tick) safe(function () { s.tick(dt, SQ.t); }); if (SQ && SQ.t >= (s.dur || 0)) nextStep(); }
    }
    if (SQ) sqRaf = requestAnimationFrame(sqLoop);
  }
  function stopSeq() { SQ = null; if (sqRaf) { cancelAnimationFrame(sqRaf); sqRaf = 0; } }

  /* ---------------- Geometría de la peña ---------------- */
  function places() { return (ACH.world && ACH.world.places) || {}; }
  function ptFrom(p, def) {
    var t = T(), W = ACH.world || {};
    if (p) {
      if (typeof p.c === 'number' && typeof p.r === 'number') return { x: (p.c + 0.5) * t, y: (p.r + 0.5) * t };
      if (typeof p.x === 'number' && typeof p.y === 'number') {
        if (W.COLS && p.x <= W.COLS && p.y <= (W.ROWS || 1e9) && (W.W || 0) > W.COLS * 2) return { x: p.x * t, y: p.y * t };
        return { x: p.x, y: p.y };
      }
    }
    return def ? { x: def.x, y: def.y } : null;
  }
  function rectFrom(r) {   // {c0,r0,c1,r1} tiles (inclusive) o {x0,y0,x1,y1} px o {x,y,w,h} px
    if (!r || typeof r !== 'object') return null;
    var t = T();
    if (typeof r.c0 === 'number' && typeof r.r0 === 'number') return { x0: r.c0 * t, y0: r.r0 * t, x1: ((typeof r.c1 === 'number' ? r.c1 : r.c0) + 1) * t, y1: ((typeof r.r1 === 'number' ? r.r1 : r.r0) + 1) * t };
    if (typeof r.x0 === 'number' && typeof r.y0 === 'number') return { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 };
    if (typeof r.x === 'number' && typeof r.w === 'number') return { x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + (r.h || 0) };
    return null;
  }
  var GEO = null, testArena = null, geoSrc = '';
  function geo() {
    if (GEO) return GEO;
    var W = ACH.world || {}, t = T(), L = places(), box = null, pn = W.pena || null;
    if (testArena) { box = testArena; geoSrc = 'debug'; }
    if (!box && pn) { box = rectFrom(pn); if (box) geoSrc = 'world.pena'; }
    var esc = ptFrom(L.penaEscenario, null), door = ptFrom(L.penaPuerta, null);
    if (!box) {
      var c = esc || (door ? { x: door.x, y: door.y - 9 * t } : null);
      if (c) { box = { x0: c.x - 11 * t, x1: c.x + 11 * t, y0: c.y - 2 * t, y1: c.y + 12 * t }; geoSrc = esc ? 'places.penaEscenario' : 'places.penaPuerta'; }
      else { box = { x0: 100 * t, x1: 122 * t, y0: 40 * t, y1: 54 * t }; geoSrc = 'provisorio'; }
    }
    var bw = box.x1 - box.x0, bh = box.y1 - box.y0, cx = (box.x0 + box.x1) / 2;
    var stage = (!testArena && pn && rectFrom(pn.escenario)) || null;
    if (!stage) stage = { x0: cx - Math.min(bw * 0.42, 7 * t), x1: cx + Math.min(bw * 0.42, 7 * t), y0: box.y0, y1: box.y0 + Math.min(40, bh * 0.28) };
    var pista = (!testArena && pn && rectFrom(pn.pista)) || null;
    if (!pista) {
      var pw = Math.min(8, Math.floor((bw - 6 * t) / t)) * t, ph = Math.min(5, Math.floor((bh - (stage.y1 - box.y0) - 4 * t) / t)) * t;
      pw = Math.max(4 * t, pw); ph = Math.max(3 * t, ph);
      var px0 = Math.round((cx - pw / 2) / t) * t, py0 = Math.ceil((stage.y1 + 28) / t) * t;
      pista = { x0: px0, y0: py0, x1: px0 + pw, y1: py0 + ph };
    }
    var home = { x: (stage.x0 + stage.x1) / 2, y: Math.min(stage.y1 + 22, pista.y0 - 2) };
    if (!door) door = { x: cx, y: box.y1 - 6 };
    var seat = { x: home.x, y: stage.y1 + 4 };
    var band = { gui: { x: stage.x0 + (stage.x1 - stage.x0) * 0.25, y: stage.y0 + (stage.y1 - stage.y0) * 0.75 }, caj: { x: stage.x0 + (stage.x1 - stage.x0) * 0.75, y: stage.y0 + (stage.y1 - stage.y0) * 0.75 } };
    var focos = [{ x: stage.x0 + 16, y: stage.y0 + 6 }, { x: home.x, y: stage.y0 + 4 }, { x: stage.x1 - 16, y: stage.y0 + 6 }];
    var onEdge = door.y > box.y1 - 24 || door.y < box.y0 + 24 || door.x < box.x0 + 24 || door.x > box.x1 - 24;
    GEO = { box: box, stage: stage, pista: pista, home: home, door: door, seat: seat, band: band, focos: focos, gateOn: onEdge, src: geoSrc };
    buildTiles(); buildFurniture();
    return GEO;
  }
  function inBox(x, y, pad) { var b = geo().box; pad = pad || 0; return x > b.x0 + pad && x < b.x1 - pad && y > b.y0 + pad && y < b.y1 - pad; }
  function clampBox(o, pad) { var b = geo().box; o.x = clamp(o.x, b.x0 + pad, b.x1 - pad); o.y = clamp(o.y, b.y0 + pad, b.y1 - pad); }

  /* ---------------- Pista de baile (losetas) ---------------- */
  var TILES = { cols: 0, rows: 0, x0: 0, y0: 0, warn: null, burn: null, burnT: 0, pat: 0 };
  function buildTiles() {
    var g = GEO, ts = K.tile;
    TILES.x0 = g.pista.x0; TILES.y0 = g.pista.y0;
    TILES.cols = Math.max(1, Math.floor((g.pista.x1 - g.pista.x0) / ts)); TILES.rows = Math.max(1, Math.floor((g.pista.y1 - g.pista.y0) / ts));
    TILES.warn = null; TILES.burn = null; TILES.burnT = 0;
  }
  function tileAt(x, y) {
    var c = Math.floor((x - TILES.x0) / K.tile), r = Math.floor((y - TILES.y0) / K.tile);
    if (c < 0 || r < 0 || c >= TILES.cols || r >= TILES.rows) return -1;
    return r * TILES.cols + c;
  }
  function makePattern(big) {
    var n = TILES.cols * TILES.rows, a = new Uint8Array(n), kind = TILES.pat++ % 6, i, c, r;
    for (i = 0; i < n; i++) {
      c = i % TILES.cols; r = (i / TILES.cols) | 0;
      if (kind === 0 || kind === 3) a[i] = ((c + r + (kind === 3 ? 1 : 0)) % 2) ? 1 : 0;          // ajedrez y su contrario
      else if (kind === 1) a[i] = r % 2 ? 1 : 0;                                                      // filas
      else if (kind === 4) a[i] = r % 2 ? 0 : 1;
      else if (kind === 2) a[i] = (c % 3 === 1) ? 0 : 1;                                              // columnas: carriles libres
      else a[i] = (c === 0 || r === 0 || c === TILES.cols - 1 || r === TILES.rows - 1) ? 1 : 0;       // el borde
    }
    if (big) {   // se luce: quema más, pero siempre deja carriles de 1 loseta libres
      var keep = (Math.random() * TILES.cols) | 0;
      for (i = 0; i < n; i++) { c = i % TILES.cols; if (!a[i] && c !== keep && Math.random() < 0.5) a[i] = 1; }
    }
    return a;
  }

  /* ---------------- Mesas y columnas (cobertura) ---------------- */
  var FURN = [];   // {kind:'mesa'|'columna', x, y, hp, broken, solid}
  function buildFurniture() {
    removeFurniture();
    var g = GEO, b = g.box, p = g.pista, t = T(), cand = [], i;
    var lx = (b.x0 + p.x0) / 2, rx = (p.x1 + b.x1) / 2, midY = (p.y0 + p.y1) / 2;
    cand.push({ k: 'mesa', x: lx, y: p.y0 + 6 }, { k: 'mesa', x: lx, y: p.y1 - 2 }, { k: 'mesa', x: rx, y: p.y0 + 6 }, { k: 'mesa', x: rx, y: p.y1 - 2 });
    cand.push({ k: 'mesa', x: p.x0 + 20, y: p.y1 + 26 }, { k: 'mesa', x: p.x1 - 20, y: p.y1 + 26 });
    cand.push({ k: 'mesa', x: lx - 22, y: midY + 3 }, { k: 'mesa', x: rx + 22, y: midY + 3 });
    cand.push({ k: 'columna', x: p.x0 - 10, y: p.y0 - 8 }, { k: 'columna', x: p.x1 + 10, y: p.y0 - 8 }, { k: 'columna', x: p.x0 - 10, y: p.y1 + 12 }, { k: 'columna', x: p.x1 + 10, y: p.y1 + 12 });
    var nM = 0, nC = 0;
    for (i = 0; i < cand.length; i++) {
      var q = cand[i], hw = q.k === 'mesa' ? 13 : 6, hu = q.k === 'mesa' ? 7 : 5, hd = 2;
      if (q.x - hw < b.x0 + 6 || q.x + hw > b.x1 - 6 || q.y - hu < g.stage.y1 + 4 || q.y + hd > b.y1 - 6) continue;
      if (dist(q.x, q.y, g.door.x, g.door.y) < 40) continue;
      if (q.y > p.y0 - 4 && q.y < p.y1 + 4 && q.x > p.x0 - 4 && q.x < p.x1 + 4) continue;   // nunca sobre la pista
      if (collide(q.x, q.y, 6)) continue;
      var id = q.k === 'mesa' ? 'br.pena.mesa' + (++nM) : 'br.pena.columna' + (++nC);
      var s = { id: id, jefa: true, br: true, off: false, x0: q.x - hw, y0: q.y - hu, x1: q.x + hw, y1: q.y + hd };
      FURN.push({ kind: q.k, x: q.x, y: q.y, hp: K.mesaHp, broken: false, solid: s, shakeT: 0 });
    }
    buildDecor();
    syncSolids();
  }
  // decoración de B2b (solo si está su arte): sillas junto a las mesas, la barra (sólida), focos de pie, cortina, cuadros y guirnaldas
  var DECOR = [];
  function buildDecor() {
    DECOR.length = 0;
    var g = GEO, b = g.box, s = g.stage, i;
    if (!CAS()) return;
    for (i = 0; i < FURN.length; i++) { var f = FURN[i]; if (f.kind !== 'mesa') continue; DECOR.push({ k: 'sillaPena', x: f.x - 19, y: f.y - 1, flip: false, mesa: f }, { k: 'sillaPena', x: f.x + 19, y: f.y - 1, flip: true, mesa: f }); }
    var bx = b.x0 + 70, by = b.y1 - 10;
    if (!collide(bx, by - 6, 6) && dist(bx, by, g.door.x, g.door.y) > 80) { var bs = { id: 'br.pena.barra', jefa: true, br: true, off: false, x0: bx - 58, y0: by - 14, x1: bx + 58, y1: by }; DECOR.push({ k: 'barraPena', x: bx, y: by, solid: bs }); }
    DECOR.push({ k: 'cortinaEscenario', x: g.home.x, y: s.y0 + 30 });
    DECOR.push({ k: 'focoPena', x: s.x0 + 6, y: s.y1 + 6 }, { k: 'focoPena', x: s.x1 - 6, y: s.y1 + 6, flip: true });
    DECOR.push({ k: 'cuadroCriollo', v: 0, x: b.x0 + 36, y: b.y0 + 1 }, { k: 'cuadroCriollo', v: 1, x: b.x0 + 84, y: b.y0 + 1 }, { k: 'cuadroCriollo', v: 2, x: b.x1 - 50, y: b.y0 + 1 });
    var gx = [b.x0 + 36, b.x0 + 86, b.x1 - 86, b.x1 - 36];
    for (i = 0; i < 4; i++) if (gx[i] < s.x0 - 20 || gx[i] > s.x1 + 20) DECOR.push({ k: 'guirnalda', x: gx[i], y: s.y0 + 40, air: true });
  }
  function removeFurniture() {
    var W = ACH.world, L = W && W.dynSolids;
    if (Array.isArray(L)) { for (var i = 0; i < FURN.length; i++) { var k = L.indexOf(FURN[i].solid); if (k >= 0) L.splice(k, 1); } for (var j = 0; j < DECOR.length; j++) if (DECOR[j].solid) { var k2 = L.indexOf(DECOR[j].solid); if (k2 >= 0) L.splice(k2, 1); } }
    FURN.length = 0; DECOR.length = 0;
  }
  function restoreFurniture() { for (var i = 0; i < FURN.length; i++) { FURN[i].hp = K.mesaHp; FURN[i].broken = false; FURN[i].solid.off = false; } }
  function segRect(x0, y0, x1, y1, r) {   // ¿el segmento cruza el rectángulo (con margen)? muestreo cada 3 px
    var n = Math.max(1, Math.ceil(dist(x0, y0, x1, y1) / 3));
    for (var k = 1; k < n; k++) { var x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; if (x > r.x0 - 1 && x < r.x1 + 1 && y > r.y0 - 6 && y < r.y1 + 1) return true; }
    return false;
  }
  function coverBetween(x0, y0, x1, y1) {   // la mesa o columna que tapa (o null)
    for (var i = 0; i < FURN.length; i++) { var f = FURN[i]; if (f.broken) continue; if (segRect(x0, y0, x1, y1, f.solid)) return f; }
    return null;
  }

  /* ---------------- Estado ---------------- */
  var J = BR.jaranon = {
    state: 'espera', dead: false, hp: K.hp, hpMax: K.hp, phase: 1, x: 0, y: 0, flip: false, resp: false,
    t: 0, anim: 0, hurtT: 0, pose: '', poseT: 0, stunT: 0, airT: 0, slipT: 0, slipCD: 0, slowT: 0, slowCD: 0,
    introSeen: false, firstHit: false, firstResp: false, fightT: 0, tries: 0, hits: 0, contrapuntos: 0, lucidos: 0, lucido: false, voz: false, vozN: 0, offHits: 0, onHits: 0,
    deadT: 0, deadDlg: false, finalDone: false, xpGiven: false, walking: false,
    targets: targets, hitBy: hitBy, info: info, K: K
  };
  var NOTES = [], parts = [], texts = [], waves = [], SUMMON = [];
  var prevBar = '', PLAN = [], curBar = 'ataque', nextBar = 'ataque', barN = 0, phaseBars = 0, pending = [], lastIdx = null;
  var RESP = null;     // {end: idx, ok}
  var CONE = null;     // {a0, a1, start, end (pulsos), warn}
  var caj = { hp: K.cajHp, down: false, hurtT: 0, mul: 1 };
  var band = { play: false, hit: 0 };
  var metro = { k: 0, down: false, flash: 0, label: 0, ok: 0, okTxt: '' };
  var lights = 0.25;   // 0..1 focos del tabladillo
  var lando = { t: 0, rk: 0 };   // Landó del Contrapunto activo

  function clearField() {
    NOTES.length = 0; parts.length = 0; texts.length = 0; waves.length = 0; bubble = null; pending.length = 0;
    CONE = null; RESP = null; TILES.warn = null; TILES.burn = null; TILES.burnT = 0; J.resp = false;
  }
  function killSummons() {
    var G = ACH.G;
    for (var i = 0; i < SUMMON.length; i++) { var z = SUMMON[i]; if (z && z.state !== 'muerto') { z.hp = 0; z.state = 'muerto'; z.deadT = 0; } }
    SUMMON.length = 0;
    if (G && Array.isArray(G.zombies)) for (var k = G.zombies.length - 1; k >= 0; k--) if (G.zombies[k] && G.zombies[k].brJefe && G.zombies[k].state === 'muerto') G.zombies.splice(k, 1);
  }
  function resetBoss(full) {
    var g = geo();
    J.state = 'espera'; J.dead = false; J.hp = J.hpMax = K.hp; J.phase = 1; J.t = 0; J.hurtT = 0; J.pose = ''; J.poseT = 0;
    J.stunT = 0; J.airT = 0; J.slipT = 0; J.slipCD = 0; J.slowT = 0; J.slowCD = 0; J.fightT = 0; J.lucido = false; J.voz = false; J.lastSummonT = -99; J.ph2Sum = false; J.deadT = 0; J.deadDlg = false;
    if (full) { J.introSeen = false; J.firstHit = false; J.firstResp = false; J.tries = 0; J.hits = 0; J.contrapuntos = 0; J.lucidos = 0; J.finalDone = false; J.xpGiven = false; }
    J.x = g.home.x; J.y = g.home.y;
    caj.hp = K.cajHp; caj.down = false; caj.mul = 1; caj.hurtT = 0;
    band.play = false; lights = 0.25; lando.t = 0;
    clearField(); restoreFurniture();
    lastIdx = null; PLAN.length = 0; barN = 0; phaseBars = 0;
    syncSolids();
  }

  /* ---------------- Sólidos ---------------- */
  var RS = { id: 'br.jaranon.cuerpo', jefa: true, br: true, off: true, x0: 0, y0: 0, x1: 0, y1: 0 };
  var RG = { id: 'br.pena.porton', jefa: true, br: true, off: true, x0: 0, y0: 0, x1: 0, y1: 0 };
  var gateLocked = false;
  function foreignGate() { var GA = BR.penaGate || BR.gate; return GA && (fn(GA, 'close') || fn(GA, 'open')) ? GA : null; }
  function circleRect(x, y, r, x0, y0, x1, y1) { var cx = clamp(x, x0, x1), cy = clamp(y, y0, y1), dx = x - cx, dy = y - cy; return dx * dx + dy * dy < r * r; }
  function bodySolid() { return (J.state === 'pelea' || J.state === 'muerto' || J.state === 'muriendo') && J.slipT <= 0; }
  function syncBody() {
    RS.x0 = J.x - K.bodyW; RS.x1 = J.x + K.bodyW; RS.y0 = J.y - K.bodyUp; RS.y1 = J.y + K.bodyDn; RS.off = !bodySolid() || selfIgnore;
    var g = GEO;
    if (g) { var d = g.door, horiz = d.y > g.box.y1 - 24 || d.y < g.box.y0 + 24; if (horiz) { RG.x0 = d.x - 22; RG.x1 = d.x + 22; RG.y0 = d.y - 5; RG.y1 = d.y + 3; } else { RG.x0 = d.x - 3; RG.x1 = d.x + 5; RG.y0 = d.y - 22; RG.y1 = d.y + 22; } }
    RG.off = !gateLocked || selfIgnore || !(g && g.gateOn) || !!foreignGate();
  }
  function syncSolids() {
    syncBody();
    BR.jaranonDead = !!J.dead;
    var W = ACH.world, L = W && W.dynSolids;
    if (W && !Array.isArray(L) && GEO) { try { W.dynSolids = L = []; } catch (e) { L = null; } }
    if (Array.isArray(L)) {
      if (L.indexOf(RS) < 0) L.push(RS); if (L.indexOf(RG) < 0) L.push(RG);
      for (var i = 0; i < FURN.length; i++) if (L.indexOf(FURN[i].solid) < 0) L.push(FURN[i].solid);
      for (var j = 0; j < DECOR.length; j++) if (DECOR[j].solid && L.indexOf(DECOR[j].solid) < 0) L.push(DECOR[j].solid);
    }
  }
  function setGate(lock) {
    if (lock === gateLocked) return; gateLocked = !!lock;
    var GA = foreignGate();   // mundo.js (B1a) trae su portón: ACH.br.penaGate {open(silent), close(), hold}
    if (GA) { try { GA.hold = !!lock; if (lock && fn(GA, 'close')) GA.close(); else if (!lock && fn(GA, 'open')) GA.open(true); } catch (e) { warnOnce(e); } }
    else if (GEO) sfx(lock ? 'br.porton.cierra' : 'br.porton.abre', { x: GEO.door.x, y: GEO.door.y });
    syncSolids();
  }
  function pushOut(G) {
    var p = G.player; if (!p || RS.off) return;
    var pr = CFGE().radius || 5;
    if (!circleRect(p.x, p.y, pr, RS.x0, RS.y0, RS.x1, RS.y1)) return;
    var cx = clamp(p.x, RS.x0, RS.x1), cy = clamp(p.y, RS.y0, RS.y1), dx = p.x - cx, dy = p.y - cy, d = Math.sqrt(dx * dx + dy * dy), tx = p.x, ty = p.y;
    if (d > 0.01) { tx = cx + dx / d * (pr + 0.3); ty = cy + dy / d * (pr + 0.3); }
    else { ty = RS.y1 + pr + 0.3; }
    if (!collide(tx, ty, pr)) { p.x = tx; p.y = ty; } else { p.y = RS.y1 + pr + 0.5; }
  }

  /* ---------------- El compás ---------------- */
  var IC = { pos: 0, bpm: 100, meter: 3, mul: 1 };   // reloj interno (pulsos)
  var lastClock = null;
  function tempoBase() { return K.tempo[J.phase] || K.tempo[1]; }
  function setTempoAll() {
    var tb = tempoBase(), m = J.phase === 2 ? caj.mul : 1;
    IC.bpm = tb.bpm; IC.meter = tb.meter; IC.mul = m;
    if (fn(BR, 'setTempo')) { try { BR.setTempo(tb.bpm * m, tb.meter); } catch (e) { warnOnce(e); } }
    tempoMulAudio(m);
  }
  function clock() {
    var b = null;
    if (fn(BR, 'beat')) { try { b = BR.beat(); } catch (e) { b = null; } }
    if (b && isFinite(b.beat) && b.bpm > 20 && b.bpm < 1000) {
      var P = 60 / b.bpm, m = Math.max(1, Math.round(b.meter || 3)), g = 1;
      while (P * g < K.minPulse && g < 12) g *= (g === 1 && m % 3 === 0) ? 3 : 2;
      var meter = (m % g === 0) ? Math.max(1, m / g) : m;
      var pos = (isFinite(b.phase) && b.phase >= 0 && b.phase < 1) ? Math.floor(b.beat) + b.phase : b.beat;   // beat entero + phase (B1a/B3)
      lastClock = { pulse: pos / g, per: P * g, meter: meter, bpm: b.bpm / g, src: b.src || 'br' };
      return lastClock;
    }
    var per = 60 / (IC.bpm * IC.mul);
    lastClock = { pulse: IC.pos, per: per, meter: IC.meter, bpm: IC.bpm * IC.mul, src: 'propio' };
    return lastClock;
  }
  function tolNow() {
    var t = K.tol;
    if (lando.t > 0) {
      var D = ACH.hab && ACH.hab.DEF && ACH.hab.DEF.contrapunto, tl = (D && D.tol) || [0.12, 0.16, 0.2];
      t = Math.max(t, tl[clamp((lando.rk || 1) - 1, 0, tl.length - 1)] || t);
    }
    if (easyMode()) t *= K.tolEasy;
    return t;
  }
  function offBeat(lag) {   // s al pulso más cercano (con el retraso del golpe)
    var c = lastClock || clock(), ph = c.pulse - (lag || 0) / c.per, f = ph - Math.floor(ph);
    return Math.min(f, 1 - f) * c.per;
  }
  function onTimeNow(lag, pr) {
    if (pr && (pr.aTiempo === true || pr.onTime === true || pr.atiempo === true)) return true;
    return offBeat(lag) <= tolNow();
  }

  /* ---------------- El plan de compases ---------------- */
  function cycleFor(ph, meter) {
    var r = Math.max(1, Math.ceil(3 / Math.max(1, meter))), out = [], i;
    if (ph === 3) { out.push('zapateo', 'sostenida', 'sostenida', 'sinaire'); }
    else { out.push('ataque', 'ataque', 'ataque'); }
    for (i = 0; i < r; i++) out.push('pregon');
    for (i = 0; i < r; i++) out.push('respuesta');
    return out;
  }
  function takeBar() {
    if (!PLAN.length) { var c = lastClock || clock(); PLAN = cycleFor(J.phase, c.meter); }
    return PLAN.shift();
  }
  function startPlan() { PLAN.length = 0; curBar = 'ataque'; nextBar = takeBar(); pending.length = 0; }

  /* ---------------- Entrada ---------------- */
  function startIntro(G) {
    J.tries++;
    setGate(true);
    var g = geo();
    J.x = g.home.x; J.y = g.home.y; J.state = 'entrada'; J.t = 0;
    setCheckpoint();
    if (J.introSeen) {   // reintento: sin retrato
      lights = 1; voz(TXT.otraVez, { life: 1.8 }); J.pose = 'pregon'; J.poseT = 0.9;
      startFight(G);
      return;
    }
    J.introSeen = true;
    freeze(true);
    runSeq([
      { dur: 1.2, enter: function () { sfx('br.pena.focos', { x: J.x, y: J.y }); camPan.on = true; }, tick: function (dt, t) { lights = 0.25 + 0.75 * Math.min(1, t / 1.0); panCam(dt); } },
      { dur: 1.3, enter: function () { sfx('br.aplausos', { x: J.x, y: J.y, n: 12 }); band.play = true; J.pose = 'canta'; J.poseT = 1.3; } },
      { dlg: DLG_IN, id: 'br.jaranon.intro' },
      { dur: 2.4, enter: function () { J.pose = 'pregon'; J.poseT = 2.4; voz(TXT.silencio, { life: 2.4 }); sfx('br.jefe.grito', { x: J.x, y: J.y }); } },
      { dur: 2.4, enter: function () { J.pose = 'canta'; J.poseT = 2.4; voz(TXT.reta, { life: 2.4 }); } }
    ], function () { camPan.on = false; freeze(false); startFight(ACH.G); });
  }
  // la cámara mira el tabladillo durante la entrada (el mundo está congelado: game.js no la mueve); después la retoma el juego
  var camPan = { on: false };
  function panCam(dt) {
    var G = ACH.G, W = ACH.world, V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }; if (!G || !G.cam || !camPan.on) return;
    var g = geo(), p = G.player, tx = clamp((J.x + p.x) / 2 - V.w / 2, 0, Math.max(0, ((W && W.W) || 1e9) - V.w)), ty = clamp(Math.min(g.stage.y0 - 30, (J.y - 60 + p.y) / 2 - V.h / 2), 0, Math.max(0, ((W && W.H) || 1e9) - V.h));
    var k = Math.min(1, dt * 4); G.cam.x += (tx - G.cam.x) * k; G.cam.y += (ty - G.cam.y) * k;
  }
  function startFight(G) {
    var g = geo();
    J.state = 'pelea'; J.t = 0; J.fightT = 0; J.x = g.home.x; J.y = g.home.y;
    J.phase = phaseOf(); J.lucido = false; J.voz = false; lights = 1; band.play = true;
    killSummons(); clearField(); restoreFurniture();
    caj.down = false; caj.hp = K.cajHp; caj.mul = 1;
    IC.pos = 0; lastIdx = null;
    setTempoAll();
    bossMusic('jefe' + J.phase);
    startPlan(); barN = 0; phaseBars = 0;
    showBar(true); syncBar(true);
    stinger('boss.intro');
    syncSolids(); if (G) pushOut(G);
    if (!J.firstResp) toast(TXT.firstResp);
  }
  function setCheckpoint() {
    if (!fn(BR, 'setCheckpoint')) return;
    var ids = ['penaPuerta', 'pena', 'puerta', 'peña'];
    for (var i = 0; i < ids.length; i++) { var r = null; try { r = BR.setCheckpoint(ids[i]); } catch (e) { r = null; } if (r) return; }
  }

  /* ---------------- Fases ---------------- */
  function phaseOf() { var r = J.hp / J.hpMax; return r < K.ph3 ? 3 : r < K.ph2 ? 2 : 1; }
  function changePhase(ph) {
    J.phase = ph; syncBar(true);
    CONE = null; TILES.warn = null; pending.length = 0;
    if (ph === 3) { caj.down = false; caj.mul = 1; }
    if (ph === 2) { caj.mul = 1; caj.hp = K.cajHp; caj.down = false; J.ph2Sum = false; }
    setTempoAll();
    bossMusic('jefe' + ph);
    lastIdx = null; startPlan(); phaseBars = 0;
    voz(ph === 2 ? TXT.fase2 : TXT.fase3, { life: 2.2 });
    sfx('br.aplausos', { x: J.x, y: J.y, n: 6 });
    if (ph === 2) summon(2);
  }
  function liveSummons() { var n = 0; for (var i = SUMMON.length - 1; i >= 0; i--) { var z = SUMMON[i]; if (!z || z.state === 'muerto' || !(z.hp > 0)) SUMMON.splice(i, 1); else n++; } return n; }
  function summon(n) {
    var G = ACH.G, E = ACH.ent; if (!G || !E || !fn(E, 'makeZombie') || !Array.isArray(G.zombies)) return;
    var g = geo(), room = K.summonMax - liveSummons(); n = Math.min(n, room); if (n <= 0) return;
    for (var i = 0; i < n; i++) {
      var side = i % 2 ? 1 : -1, x = side < 0 ? g.stage.x0 + 10 : g.stage.x1 - 10, y = g.stage.y1 + 10, tries = 0;
      while (collide(x, y, 5) && tries++ < 8) y += 6;
      var z = null; try { z = E.makeZombie('br_jaranero', x, y); } catch (e) { warnOnce(e); }
      if (!z) continue;
      z.brJefe = true; z.state = 'perseguir'; z.tx = G.player.x; z.ty = G.player.y; z.hpMax = z.hp = Math.max(z.hp || 2, 2);
      G.zombies.push(z); SUMMON.push(z);
      for (var k = 0; k < 6; k++) parts.push({ x: x + rand(-6, 6), y: y, z: rand(4, 16), vx: rand(-20, 20), vy: rand(-6, 6), vz: rand(10, 30), t: 0, life: rand(0.4, 0.7), c: k % 2 ? '#ffffff' : '#ff2e88', w: 2, h: 2, g: 60 });
    }
    sfx('br.jaranero.llega', { x: g.stage.x0, y: g.stage.y1, n: n });
    addText('¡JARANA, JARANA!', J.x, J.y - 78, '#ff2e88');
  }

  /* ---------------- Pulsos: preparar (aviso) y soltar ---------------- */
  function onPulse(G, idx, c) {
    var meter = c.meter, bib = ((idx % meter) + meter) % meter;
    metro.k = 1; metro.down = bib === 0;
    if (c.src !== 'audio') sfx('br.metronomo', { accent: bib === 0, x: J.x, y: J.y });   // sin música: el tic del metrónomo marca el compás
    band.hit = 1;
    if (bib === 0) {   // compás nuevo
      if (RESP && idx >= RESP.end) endResp();
      prevBar = curBar; curBar = nextBar; nextBar = takeBar(); barN++; phaseBars++;
      startBar(G, curBar, idx, c);
    }
    // 1) suelta lo que se avisó en el pulso anterior
    var act = pending; pending = [];
    if (J.stunT <= 0 && J.slipT <= 0) for (var i = 0; i < act.length; i++) fire(G, act[i], c);
    // 2) el cono: daño por pulso
    if (CONE && idx >= CONE.start) {
      if (idx >= CONE.end) { CONE = null; }
      else if (J.stunT <= 0 && J.slipT <= 0) coneHit(G);
    }
    // 3) prepara (y avisa) lo del próximo pulso
    var nb = (bib + 1) % meter, bar = nb === 0 ? nextBar : curBar;
    if (J.stunT <= 0.6 && J.slipT <= 0.6) prepare(G, bar, nb, meter, idx + 1);
  }
  function startBar(G, bar, idx, c) {
    if (bar === 'pregon') {
      if (!(J.pose === 'pregon' && J.poseT > 0.3)) {
        var pg = PREGON[(Math.random() * PREGON.length) | 0];
        voz(pg, { life: Math.max(2.2, c.per * c.meter * Math.max(1, Math.ceil(3 / c.meter)) - 0.1) });
        J.pose = 'pregon'; J.poseT = c.per * c.meter * Math.max(1, Math.ceil(3 / c.meter));
        sfx('br.jefe.pregon', { x: J.x, y: J.y });
      }
    } else if (bar === 'respuesta') {
      if (!RESP) {
        var r = Math.max(1, Math.ceil(3 / c.meter));
        RESP = { start: idx, end: idx + r * c.meter, ok: false };
        J.resp = true; metro.label = 1;
        sfx('br.metronomo.responde', { x: J.x, y: J.y });
        if (!J.firstResp) { J.firstResp = true; }
        addText(TXT.respLabel, J.x, J.y - 84, '#3ad6ff');
      }
    } else if (bar === 'sinaire') {
      J.airT = K.airT; J.pose = 'sinAire'; J.poseT = K.airT; voz(TXT.aire, { life: 2.2 });
      sfx('br.jefe.sinaire', { x: J.x, y: J.y });
    }
    // fase 2: el cajonero acelera cada 4 compases; los jaraneros se reponen al empezar el ciclo
    if (J.phase === 2) {
      if (phaseBars > 1 && phaseBars % 4 === 1 && !caj.down && caj.mul < K.tempoMax - 1e-6) {
        caj.mul = Math.min(K.tempoMax, caj.mul + K.tempoStep); setTempoAll(); voz(TXT.cajonero, { life: 1.4 }); addText('¡MÁS RÁPIDO!', geo().band.caj.x, geo().band.caj.y - 30, '#ffb000');
      }
      // ajuste jefe: la pareja de jaraneros llega solo si no le respondiste (se luce) y como mucho cada summonEvery s
      if (bar === 'ataque' && prevBar === 'respuesta' && (J.voz || !J.ph2Sum) && liveSummons() === 0 && J.fightT - (J.lastSummonT || -99) >= K.summonEvery) { J.lastSummonT = J.fightT; J.ph2Sum = true; summon(2); }
    }
  }
  function prepare(G, bar, bib, meter, atIdx) {
    var p = G.player, big = J.lucido, ph = J.phase;
    if (bar === 'ataque') {
      if (ph === 1) {
        if (bib === 0) pending.push({ k: 'notas', big: big, aim: aimNow(p) });
        else if (bib === Math.min(2, meter - 1) && meter >= 2 && dist(p.x, p.y, J.x, J.y) < K.panNear + (big ? 16 : 0)) pending.push({ k: 'panuelo', big: big, ang: Math.atan2(p.y - J.y, p.x - J.x) });
      } else if (ph === 2) {
        if (bib === 0) pending.push({ k: 'losetas', big: big, pat: makePattern(big) });
        else if (bib === 1 && (barN % 2 === 0 || big)) pending.push({ k: 'notas', big: false, aim: aimNow(p) });
      }
    } else if (bar === 'zapateo') {
      if (bib === 0 || (bib === 2 && meter >= 4)) pending.push({ k: 'zapateo', big: big });
      else if (bib === 1) pending.push({ k: 'notas', big: false, aim: aimNow(p) });   // ajuste jefe: fase 3 más brava (abanico entre pisotones)
    } else if (bar === 'sostenida') {
      if (bib === 0 && !CONE && (PLAN[0] === 'sostenida' || nextBar === 'sostenida')) {
        var aim = Math.atan2(p.y - (J.y - 30), p.x - J.x), dir = Math.random() < 0.5 ? -1 : 1, len = (K.coneSweep * (big ? 1.25 : 1)) / 2;
        CONE = { a0: aim - dir * len, a1: aim + dir * len, start: atIdx, end: atIdx + 2 * meter, warn: true, big: big };
        pending.push({ k: 'sostenida' });
      }
    }
    var tl = pending.length ? pending[pending.length - 1] : null;
    if (tl && tl.k === 'losetas') TILES.warn = tl.pat;
    if (pending.length) { J.pose = pending[0].k === 'notas' ? 'notas' : pending[0].k === 'panuelo' ? 'panuelo' : pending[0].k === 'zapateo' ? 'zapateo' : J.pose; J.poseT = Math.max(J.poseT, 0.25); J.warnT = 1; }
  }
  function aimNow(p) { var h = mouth(); return Math.atan2(p.y - (h.y + 26), p.x - h.x); }
  function fire(G, a, c) {
    var p = G.player;
    if (a.k === 'notas') {
      var h = mouth(), aim = typeof a.aim === 'number' ? a.aim : aimNow(p), n = a.big ? K.noteNBig : K.noteN, arc = a.big ? K.noteArcBig : K.noteArc, sp = (a.big ? K.noteSpdBig : K.noteSpd) * (J.slowT > 0 ? 0.7 : 1);
      for (var i = 0; i < n; i++) {
        var an = aim + (n > 1 ? (i / (n - 1) - 0.5) * arc : 0);
        NOTES.push({ x: h.x, y: h.y + 26, z: 26, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, d: 0, t: 0, f: (Math.random() * 3) | 0 });
      }
      J.pose = 'canta'; J.poseT = 0.35; sfx('br.jefe.nota', { x: h.x, y: h.y, n: n });
      if (a.big) clearLucido();
    } else if (a.k === 'panuelo') {
      var r = a.big ? K.panRBig : K.panR, arc2 = a.big ? K.panArcBig : K.panArc;
      waves.push({ kind: 'arc', x: J.x, y: J.y, ang: a.ang, arc: arc2, r: r, t: 0, life: 0.3 });
      J.pose = 'panuelo'; J.poseT = 0.4; sfx('br.jefe.panuelo', { x: J.x, y: J.y });
      var d = dist(p.x, p.y, J.x, J.y);
      if (p.hp > 0 && d < r + 4 && (d < 10 || Math.abs(wrap(Math.atan2(p.y - J.y, p.x - J.x) - a.ang)) <= arc2 / 2)) {
        var ux = d > 0.5 ? (p.x - J.x) / d : 0, uy = d > 0.5 ? (p.y - J.y) / d : 1;
        if (hurtPlayer(G, K.panDmg, { push: { x: ux, y: uy, f: K.panPush }, src: 'br.jefe.panuelo' })) addText('¡ZAS!', p.x, p.y - 26, '#ffffff');
      }
      if (a.big) clearLucido();
    } else if (a.k === 'losetas') {
      TILES.burn = a.pat; TILES.warn = null; TILES.burnT = K.burnFx;
      sfx('br.jefe.loseta', { x: (geo().pista.x0 + geo().pista.x1) / 2, y: geo().pista.y0 });
      var ti = tileAt(p.x, p.y);
      if (p.hp > 0 && ti >= 0 && a.pat[ti] && hurtPlayer(G, K.tileDmg, { src: 'br.jefe.loseta' })) addText('¡QUEMA!', p.x, p.y - 26, '#ffb000');
      J.pose = 'zapateo'; J.poseT = 0.3;
      if (a.big) clearLucido();
    } else if (a.k === 'zapateo') {
      var R = a.big ? K.stompRBig : K.stompR;
      waves.push({ kind: 'ring', x: J.x, y: J.y, r: R, t: 0, life: 0.35 });
      shake(3, 0.25); sfx('br.jefe.pisoton', { x: J.x, y: J.y, big: a.big });
      J.pose = 'zapateo'; J.poseT = 0.35;
      var dd = dist(p.x, p.y, J.x, J.y);
      if (p.hp > 0 && dd < R) {
        var qx = dd > 0.5 ? (p.x - J.x) / dd : 0, qy = dd > 0.5 ? (p.y - J.y) / dd : 1;
        if (hurtPlayer(G, K.stompDmg, { push: { x: qx, y: qy, f: K.stompPush }, src: 'br.jefe.zapateo' })) addText('¡PAM!', p.x, p.y - 26, '#ffe500');
      }
      if (a.big) clearLucido();
    } else if (a.k === 'sostenida') {
      if (CONE) { CONE.warn = false; J.pose = 'sostenida'; J.poseT = 2 * c.meter * c.per; sfx('br.jefe.sostenida', { x: J.x, y: J.y, dur: J.poseT }); if (CONE.big) clearLucido(); }
    }
  }
  function clearLucido() { J.lucido = false; }
  function coneAngle() {
    if (!CONE) return 0;
    var c = lastClock || clock(), k = clamp((c.pulse - CONE.start) / Math.max(1, CONE.end - CONE.start), 0, 1);
    return CONE.a0 + (CONE.a1 - CONE.a0) * (CONE.warn ? 0 : k);
  }
  function inCone(x, y) {
    var h = mouth(), oy = h.y + 26, d = dist(x, y, h.x, oy);
    if (d > K.coneRange || d < 4) return d < 4;
    return Math.abs(wrap(Math.atan2(y - oy, x - h.x) - coneAngle())) <= K.coneArc / 2;
  }
  function coneHit(G) {
    var p = G.player; if (!(p.hp > 0)) return;
    if (!inCone(p.x, p.y)) return;
    var h = mouth(), f = coverBetween(h.x, h.y + 26, p.x, p.y);
    if (f) { if (f.kind === 'mesa') { f.hp -= 1; f.shakeT = 0.2; if (f.hp <= 0) breakMesa(f); } addText('¡TAPADO!', p.x, p.y - 26, '#1fe07a'); return; }
    if (hurtPlayer(G, K.coneDmg, { src: 'br.jefe.sostenida', ignoreAir: true })) addText('¡AAAAH!', p.x, p.y - 26, '#ff2e88');
  }
  function breakMesa(f) {
    f.broken = true; f.solid.off = true; sfx('br.mesa.rompe', { x: f.x, y: f.y });
    for (var k = 0; k < 8; k++) parts.push({ x: f.x + rand(-8, 8), y: f.y, z: rand(2, 10), vx: rand(-40, 40), vy: rand(-14, 14), vz: rand(20, 50), t: 0, life: rand(0.4, 0.7), c: k % 2 ? '#8a5a32' : '#f1eee4', w: 2, h: 2, g: 120 });
  }
  function endResp() {
    if (!RESP) return;
    var ok = RESP.ok && !RESP.failed; RESP = null; J.resp = false; metro.label = 0;
    if (!ok) { J.lucido = true; J.lucidos++; voz(TXT.luce, { life: 1.8 }); sfx('br.aplausos', { x: J.x, y: J.y, n: 4 }); addText('¡SE LUCE!', J.x, J.y - 84, '#ffb000'); 
      if (!J.voz) { J.voz = true; J.vozN++; if (J.vozN === 1) toast(TXT.vozOn); } }
  }
  function missResp() {   // ajuste jefe: respuesta a destiempo = respuesta fallida (cierra el compás; al final del compás «se luce»)
    if (!RESP || RESP.ok) return;
    RESP.ok = true; RESP.failed = true; J.resp = false; metro.label = 0; J.misses = (J.misses || 0) + 1;
    metro.ok = 1; metro.okTxt = '¡DESTIEMPO!'; addText('¡DESTIEMPO!', J.x, J.y - 90, '#a89a8a');
  }
  function contrapunto(G, how) {
    if (!RESP || RESP.ok) return false;
    RESP.ok = true; J.contrapuntos++; J.lastCp = String(how);
    if (J.voz) { J.voz = false; addText(TXT.vozRota, J.x, J.y - 100, '#ffe500'); }
    J.stunT = K.stunT; J.pose = 'aturdido'; J.poseT = K.stunT; pending.length = 0; CONE = null; TILES.warn = null;
    metro.ok = 1; metro.okTxt = TXT.contra;
    addText(TXT.contra, J.x, J.y - 90, '#3ad6ff');
    voz(TXT.eso, { life: 1.6 });
    sfx('br.contrapunto', { x: J.x, y: J.y, how: how });
    shake(2, 0.15);
    for (var k = 0; k < 12; k++) { var a = k / 12 * 6.283; parts.push({ x: J.x + Math.cos(a) * 8, y: J.y - 30, z: 0, vx: Math.cos(a) * 70, vy: Math.sin(a) * 40, vz: 0, t: 0, life: 0.5, c: k % 2 ? '#3ad6ff' : '#ffffff', w: 2, h: 2, g: 0 }); }
    J.resp = false; metro.label = 0;
    return true;
  }

  /* ---------------- Melodías (ACH.hab.onCast o respaldo por habStrumT) ---------------- */
  var castHooked = false, lastStrum = 0;
  function hookCast() {
    if (castHooked) return;
    var H = ACH.hab; if (!H || !fn(H, 'onCast')) return;
    try { H.onCast(function (id, rank) { onMelody(ACH.G, id, rank); }); castHooked = true; } catch (e) { warnOnce(e); }
  }
  function onMelody(G, id, rank) {
    if (!G || J.state !== 'pelea' || J.dead) return;
    var p = G.player, d = dist(p.x, p.y, J.x, J.y), D = (ACH.hab && ACH.hab.DEF && ACH.hab.DEF[id]) || {}, rk = clamp(rank || 1, 1, 3);
    if (id === 'contrapunto') { var tt = D.t || [6, 8, 10]; lando.t = tt[rk - 1] || 8; lando.rk = rk; }
    if (RESP && !RESP.ok) contrapunto(G, 'melodia:' + id);
    if (id === 'lamento') { var lr = (D.r || [64, 96, 112])[rk - 1], ld = (D.dmg || [1, 1, 2])[rk - 1]; if (d <= lr + K.bodyW) hitBoss(G, ld, p.x, p.y, 'hab.lamento'); }
    else if (id === 'mareo') { var mr = (D.r || [72, 88, 104])[rk - 1]; if (d <= mr + K.bodyW) { J.slowT = Math.max(J.slowT, (D.t || [5, 6.5, 8])[rk - 1] * 0.5); addText('¡MAREADO!', J.x, J.y - 80, '#ff2e88'); } }
    else if (id === 'rasgueo') { var rr = (D.r || [60, 85, 110])[rk - 1]; if (d <= rr + K.bodyW) { J.stunT = Math.max(J.stunT, 1); pending.length = 0; var rd = (D.dmg || [0, 0, 1])[rk - 1]; if (rd > 0) hitBoss(G, rd, p.x, p.y, 'hab.rasgueo'); } }
  }
  function pollStrum(G) {
    if (castHooked) return;
    var p = G.player, s = p ? (p.habStrumT || 0) : 0;
    if (s > 0 && lastStrum <= 0) { var id = null; try { id = ACH.hab && fn(ACH.hab, 'selected') ? ACH.hab.selected() : null; } catch (e) { id = null; } var rk = 1; try { rk = ACH.hab && fn(ACH.hab, 'rank') ? ACH.hab.rank(id) : 1; } catch (e2) { rk = 1; } onMelody(G, id || '?', rk); }
    lastStrum = s;
  }

  /* ---------------- Daño a Jaranón ---------------- */
  function hittable() { return J.state === 'pelea' && !J.dead; }
  function hitBoss(G, dmg, fx, fy, tag, timing) {   // timing: {lag, pr} para medir el compás; null = no cuenta
    if (!hittable() || !(dmg > 0)) return 0;
    var onT = false, mul = 1;
    if (timing) {
      onT = onTimeNow(timing.lag || 0, timing.pr); J.lastOff = +offBeat(timing.lag || 0).toFixed(3);
      if (onT) { metro.ok = 1; metro.okTxt = TXT.aTiempo; sfx('br.atiempo', { x: J.x, y: J.y }); }
      if (RESP && !RESP.ok && onT) contrapunto(G, tag);
      else if (RESP && !RESP.ok && !onT) { sfx('br.destiempo', { x: J.x, y: J.y }); if (timing.melee && K.respMissFails) missResp(); }
      if (onT && lando.t > 0) { var D = ACH.hab && ACH.hab.DEF && ACH.hab.DEF.contrapunto, ml = (D && D.mul) || [1.5, 1.75, 2]; mul *= ml[clamp(lando.rk - 1, 0, 2)] || 1.5; }
      if (onT && /cajon/.test(String(tag))) mul *= 2;
      if (timing.melee) { mul *= onT ? K.onMul : K.offMul; if (onT) J.onHits++; else J.offHits++; }   // ajuste jefe: a tiempo pega más, a destiempo menos
    }
    if (J.stunT > 0 || J.airT > 0) mul *= K.mul;
    if (J.voz && !(J.stunT > 0 || J.slipT > 0)) mul *= K.vozMul;   // «se luce»: la coraza de la Voz de Oro (la rompe el contrapunto)
    mul = Math.min(K.mulCap, mul);
    var dd = dmg * mul;
    J.hp = Math.max(0, J.hp - dd); J.hurtT = 0.18; J.hits++;
    if (!J.firstHit) { J.firstHit = true; toast(TXT.firstHit); }
    sfx('br.jefe.duele', { x: J.x, y: J.y, hp: J.hp, src: tag, aTiempo: onT });
    var d = dist(fx, fy, J.x, J.y) || 1;
    if (ACH.fx && fn(ACH.fx, 'hit')) { try { ACH.fx.hit(G, { x: J.x, y: J.y - 14 }, (J.x - fx) / d, (J.y - fy) / d, J.hp <= 0, true); } catch (e) { /* nada */ } }
    if (onT) addText(TXT.aTiempo, J.x + rand(-10, 10), J.y - 74, '#3ad6ff');
    if (mul > 1.01) addText('×' + (Math.round(mul * 10) / 10), J.x + rand(-8, 8), J.y - 64, '#ff2e88');
    else if (mul < 0.99 && !(J.lowTxtT > 0)) { J.lowTxtT = 0.45; addText(J.voz ? '¡SE LUCE! ×' + (Math.round(mul * 10) / 10) : 'DESTIEMPO ×' + (Math.round(mul * 10) / 10), J.x + rand(-8, 8), J.y - 64, '#a89a8a'); }
    syncBar(true); flashBar();
    if (J.hp <= 0) { die(G); return dd; }
    var ph = phaseOf(); if (ph > J.phase) changePhase(ph);
    return dd;
  }
  function onBoss(x, y, r) { var dx = (x - J.x) / (K.hitRx + r), dy = (y - (J.y - 14)) / (K.hitRy + 14 + r); return dx * dx + dy * dy < 1; }
  function cajHittable() { return J.state === 'pelea' && J.phase === 2 && !caj.down; }
  function hitCaj(G, dmg, tag) {
    if (!cajHittable() || !(dmg > 0)) return 0;
    caj.hp -= dmg; caj.hurtT = 0.2;
    var b = geo().band.caj;
    sfx('br.cajonero.duele', { x: b.x, y: b.y });
    if (caj.hp <= 0) {
      caj.down = true; caj.mul = 1; setTempoAll();
      voz(TXT.cajCae, { life: 1.8 }); addText('¡SE CAYÓ DE LA SILLA!', b.x, b.y - 34, '#ffe500');
      sfx('br.cajonero.cae', { x: b.x, y: b.y });
      toast('¡Tumbaste al cajonero! El compás vuelve a la normalidad');
    } else addText('¡TUM!', b.x, b.y - 30, '#ffd36b');
    return dmg;
  }
  function trySlip(tag) {
    if (J.slipCD > 0 || !hittable()) return false;
    J.slipT = K.slipT; J.slipCD = K.slipCD; J.pose = 'aturdido'; J.poseT = K.slipT; pending.length = 0; CONE = null; TILES.warn = null;
    voz(TXT.resbala, { life: 1.4 }); addText('¡RESBALÓ!', J.x, J.y - 80, '#9fe8ff');
    if (J.voz) { J.voz = false; addText(TXT.vozRota, J.x, J.y - 98, '#ffe500'); }
    sfx('br.jefe.resbala', { x: J.x, y: J.y }); shake(3, 0.2);
    return true;
  }
  function checkCharcos() {
    if (J.slipCD > 0 || J.state !== 'pelea') return;
    var x = J.x, y = J.y, hit = false;
    try {
      if (fn(BR, 'charcoAt')) hit = !!BR.charcoAt(x, y, 10);
      else if (BR.objetos && fn(BR.objetos, 'inCharco')) hit = !!(BR.objetos.inCharco(x, y) || BR.objetos.inCharco(x - 8, y) || BR.objetos.inCharco(x + 8, y));   // objetos.js (B1c)
      else {
        var L = BR.charcos || (BR.objetos && (fn(BR.objetos, 'charcos') ? BR.objetos.charcos() : BR.objetos.charcos)) || null;
        if (Array.isArray(L)) for (var i = 0; i < L.length; i++) { var c = L[i]; if (c && !c.dead && (c.t === undefined || c.t > 0) && dist(x, y, c.x, c.y) < (c.r || 20) + 8) { hit = true; break; } }
      }
    } catch (e) { hit = false; }
    if (hit) trySlip('charco');
  }

  /* ---------------- Muerte y final ---------------- */
  function die(G, quick) {
    if (J.dead) return;
    J.hp = 0; J.dead = true; J.state = 'muriendo'; J.deadT = 0; J.pose = 'hurt'; J.poseT = 0.4;
    pending.length = 0; CONE = null; TILES.warn = null; TILES.burn = null; NOTES.length = 0; RESP = null; J.resp = false; metro.label = 0;
    killSummons();
    band.play = false; bossMusic(null); stinger('boss.down');
    voz(TXT.muere, { life: 2.4 }); sfx('br.jefe.muere', { x: J.x, y: J.y });
    shake(4, 0.4);
    if (G && ACH.fx && fn(ACH.fx, 'hitstop')) { try { ACH.fx.hitstop(G, 0.15); } catch (e) { /* nada */ } }
    syncBar(true); barHideAt = 1.8;
    flag('barranco.jefe', true);
    if (fn(BR, 'flag')) { try { BR.flag('jefe', true); } catch (e1) { /* nada */ } }
    if (!J.xpGiven) { J.xpGiven = true; try { if (ACH.hab && fn(ACH.hab, 'addXP')) ACH.hab.addXP(K.xp, false); } catch (e2) { warnOnce(e2); } toast('+' + K.xp + ' XP · ¡Don Jaranón se quedó en paz!'); }
    try { if (ACH.objetivo && fn(ACH.objetivo, 'set')) ACH.objetivo.set('Don Jaranón ya no canta… acompáñalo'); } catch (e3) { /* nada */ }
    J.walkFrom = { x: J.x, y: J.y };
    if (quick) { J.x = geo().seat.x; J.y = geo().seat.y; J.state = 'muerto'; J.deadT = 2; }
    syncSolids();
  }
  function giveLoot() {
    var iv = ACH.inv; if (!iv) return;
    var got = [];
    try { if (fn(iv, 'add')) { iv.add('sencillo', K.loot); got.push('+' + K.loot + ' sencillos'); if (!iv.defs || iv.defs.picarones) { iv.add('picarones', 1); got.push('+1 picarones'); } } } catch (e) { warnOnce(e); }
    if (got.length) toast(got.join(' · '));
    for (var k = 0; k < 14; k++) parts.push({ x: J.x + rand(-6, 6), y: J.y - 10, z: rand(6, 20), vx: rand(-50, 50), vy: rand(-10, 20), vz: rand(30, 70), t: 0, life: rand(0.6, 1.0), c: k % 3 ? '#ffd23f' : '#c9772a', w: 2, h: 2, g: 140 });
    sfx('coin', { x: J.x, y: J.y });
  }
  function updateDeath(G, dt) {
    J.deadT += dt;
    var s = geo().seat;
    if (J.state === 'muriendo') {   // camina despacito al borde del tabladillo y se sienta
      var k = clamp((J.deadT - 0.6) / 1.4, 0, 1), f = J.walkFrom || { x: J.x, y: J.y };
      if (J.deadT > 0.6) { J.x = f.x + (s.x - f.x) * k; J.y = f.y + (s.y - f.y) * k; J.walking = k < 1; }
      if (k >= 1) { J.state = 'muerto'; J.walking = false; sfx('br.jefe.sienta', { x: J.x, y: J.y }); }
    }
    lights = Math.max(0.35, lights - dt * 0.3);
    if (J.state === 'muerto' && !J.deadDlg && J.deadT >= 2.6 && G.state === 'playing' && !dlgActive()) {
      J.deadDlg = true;
      freeze(true);
      playDlg(DLG_DEAD, function () { giveLoot(); setGate(false); startFinal(); }, null);
    }
  }
  function startFinal() {
    if (J.finalDone) { freeze(false); return; }
    var F = BR.final;
    showBar(false); barHideAt = -1;
    freeze(true);
    if (F && fn(F, 'play')) {
      try { var r = F.play({ onEnd: finish }); if (r !== false) return; } catch (e) { warnOnce(e); }
    }
    finish();
  }
  var finished = false;
  function finish() {
    if (finished) return; finished = true; J.finalDone = true;
    freeze(false);
    var stats = { jefe: { fightT: Math.round(J.fightT), tries: J.tries, contrapuntos: J.contrapuntos, hits: J.hits } };
    if (fn(BR, 'finish')) { try { BR.finish(stats); return; } catch (e) { warnOnce(e); } }
    if (ACH.debug && fn(ACH.debug, 'win')) { try { ACH.debug.win(); } catch (e2) { warnOnce(e2); } }
  }
  function deadFromSave() {   // CONTINUAR con Jaranón ya vencido: sentado y en paz; E junto a él → la cinemática y el cartel
    var g = geo();
    J.dead = true; J.hp = 0; J.state = 'muerto'; J.deadT = 99; J.deadDlg = true; J.introSeen = true; J.xpGiven = true; J.finalDone = false;
    J.x = g.seat.x; J.y = g.seat.y; lights = 0.4; band.play = false;
    setGate(false); syncSolids();
  }
  function nearSeat(p) { return dist(p.x, p.y, J.x, J.y + 10) < 40; }

  /* ---------------- Notas en vuelo, partículas ---------------- */
  function mouth() { return { x: J.x + (J.flip ? -5 : 5), y: J.y - 58 }; }
  function updateNotes(G, dt) {
    var p = G.player;
    for (var i = NOTES.length - 1; i >= 0; i--) {
      var n = NOTES[i]; n.t += dt;
      var sx = n.vx * dt, sy = n.vy * dt; n.x += sx; n.y += sy; n.d += Math.sqrt(sx * sx + sy * sy);
      n.z = Math.max(8, n.z - 30 * dt);
      if (p.hp > 0 && dist(n.x, n.y, p.x, p.y) < K.noteR + 3) {
        if (hurtPlayer(G, K.noteDmg, { push: { x: n.vx, y: n.vy, f: 6 }, src: 'br.jefe.nota' })) { addText('¡PLIN!', p.x, p.y - 26, '#ffe08a'); NOTES.splice(i, 1); continue; }
      }
      var blocked = false;
      for (var k = 0; k < FURN.length; k++) { var f = FURN[k]; if (!f.broken && n.x > f.solid.x0 && n.x < f.solid.x1 && n.y > f.solid.y0 - 4 && n.y < f.solid.y1) { blocked = true; f.shakeT = 0.12; break; } }
      if (blocked || n.d > K.noteRange || !inBox(n.x, n.y, -30) || (n.t > 0.15 && collide(n.x, n.y, 1.5))) {
        for (var q = 0; q < 3; q++) parts.push({ x: n.x, y: n.y, z: n.z, vx: rand(-30, 30), vy: rand(-10, 10), vz: rand(0, 20), t: 0, life: 0.3, c: '#ffe08a', w: 1, h: 1, g: 40 });
        NOTES.splice(i, 1);
      }
    }
    if (NOTES.length > 40) NOTES.splice(0, NOTES.length - 40);
  }
  function addText(s, x, y, col) { texts.push({ s: s, x: x, y: y, t: 0, c: col }); if (texts.length > 7) texts.shift(); }
  function tickVisual(dt) {
    J.anim += dt;
    if (J.poseT > 0) J.poseT -= dt;
    if (J.warnT > 0) J.warnT -= dt * 2;
    metro.k = Math.max(0, metro.k - dt * 4); metro.ok = Math.max(0, metro.ok - dt * 1.6);
    band.hit = Math.max(0, band.hit - dt * 5);
    if (TILES.burnT > 0) { TILES.burnT -= dt; if (TILES.burnT <= 0) TILES.burn = null; }
    for (var i = parts.length - 1; i >= 0; i--) {
      var q = parts[i]; q.t += dt;
      if (q.t >= q.life) { parts.splice(i, 1); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.vz -= (q.g || 0) * dt; q.z = Math.max(0, q.z + q.vz * dt);
    }
    if (parts.length > 120) parts.splice(0, parts.length - 120);
    for (var j = texts.length - 1; j >= 0; j--) { texts[j].t += dt; if (texts[j].t > 0.7) texts.splice(j, 1); }
    for (var w = waves.length - 1; w >= 0; w--) { waves[w].t += dt; if (waves[w].t > waves[w].life) waves.splice(w, 1); }
    for (var f = 0; f < FURN.length; f++) if (FURN[f].shakeT > 0) FURN[f].shakeT -= dt;
    if (bubble) { bubble.t += dt; if (bubble.t > bubble.life) bubble = null; }
    if (caj.hurtT > 0) caj.hurtT -= dt;
    if (J.lowTxtT > 0) J.lowTxtT -= dt;
  }

  /* ---------------- La pelea ---------------- */
  function updateFight(G, dt) {
    var p = G.player;
    J.fightT += dt;
    syncBar(false);
    if (J.stunT > 0) J.stunT -= dt;
    if (J.airT > 0) J.airT -= dt;
    if (J.slipT > 0) J.slipT -= dt;
    if (J.slipCD > 0) J.slipCD -= dt;
    if (J.slowT > 0) J.slowT -= dt;
    if (J.slowCD > 0) J.slowCD -= dt;
    if (lando.t > 0) lando.t -= dt;
    IC.pos += dt * IC.bpm * IC.mul / 60;
    var c = clock(), idx = Math.floor(c.pulse);
    if (lastIdx === null) { lastIdx = idx; }
    else if (idx !== lastIdx) {
      if (idx > lastIdx && idx - lastIdx <= 2) { for (var k = lastIdx + 1; k <= idx; k++) onPulse(G, k, c); }
      else onPulse(G, idx, c);   // el reloj saltó (tema nuevo): se resincroniza con un solo pulso
      lastIdx = idx;
    }
    if (RESP && lastIdx >= RESP.end) endResp();
    // se mueve: hacia Alexander, sin pegarse (fase 2: baila cerca de su casa)
    var still = J.stunT > 0 || J.slipT > 0 || CONE || J.airT > 0 || (J.poseT > 0 && (J.pose === 'panuelo' || J.pose === 'zapateo'));
    if (p.hp > 0 && !CONE) J.flip = p.x < J.x;
    J.walking = false;
    if (!still) {
      var g = geo(), tx, ty;
      if (J.phase === 2) { tx = g.home.x + Math.sin(J.fightT * 1.3) * 30; ty = g.home.y; }
      else { tx = clamp(p.x, g.box.x0 + 22, g.box.x1 - 22); ty = clamp(p.y - 8, g.home.y, g.box.y1 - 30); }
      var dx = tx - J.x, dy = ty - J.y, dd = Math.sqrt(dx * dx + dy * dy), dp = dist(p.x, p.y, J.x, J.y);
      if (dd > 3 && (dp > K.keepDist || J.phase === 2)) {
        var sp = K.walk * (J.slowT > 0 ? K.slowMul : 1) * (J.phase === 3 ? 0.8 : 1), st = Math.min(dd, sp * dt), nx = J.x + dx / dd * st, ny = J.y + dy / dd * st;
        if (!collide(nx, ny, 9) && inBox(nx, ny, 14)) { J.x = nx; J.y = ny; J.walking = true; }
        else if (!collide(nx, J.y, 9) && inBox(nx, J.y, 14)) { J.x = nx; J.walking = true; }
      }
    }
    checkCharcos();
    // aviso: luces de la peña
    if (ACH.render && fn(ACH.render, 'addLight') && Math.floor(J.fightT * 10) !== Math.floor((J.fightT - dt) * 10)) lightsTick();
  }
  function lightsTick() {
    var g = geo(), R = ACH.render;
    try {
      for (var i = 0; i < g.focos.length; i++) R.addLight(g.focos[i].x, g.focos[i].y + 30, 70, '#ffcf7a', 0.16, 0.6 * lights);
      if (RESP && !RESP.ok) R.addLight(J.x, J.y - 20, 60, '#3ad6ff', 0.16, 0.7);
      if (TILES.burn || TILES.warn) R.addLight((g.pista.x0 + g.pista.x1) / 2, (g.pista.y0 + g.pista.y1) / 2, 80, TILES.burn ? '#ff7a2e' : '#ffcf7a', 0.16, 0.5);
    } catch (e) { warnOnce(e); }
  }

  /* ---------------- Ganchos ---------------- */
  var barHideAt = -1, bot = null;
  function update(G, dt) {
    if (!G || !G.player) return;
    var p = G.player;
    hookCast();
    tickVisual(dt);
    if (J.hurtT > 0) J.hurtT -= dt;
    if (barHideAt > 0) { barHideAt -= dt; if (barHideAt <= 0) { barHideAt = -1; showBar(false); } }
    J.t += dt;
    var g = geo();
    if (J.state === 'espera' && !J.dead) {
      if (p.hp > 0 && G.state === 'playing' && inBox(p.x, p.y, 4) && dist(p.x, p.y, g.door.x, g.door.y) > 30 && !dlgActive()) startIntro(G);
      // la banda calentando: notitas sueltas
      if (inBox(p.x, p.y, -120) && Math.random() < dt * 0.8) band.hit = 1;
    } else if (J.state === 'pelea') {
      pollStrum(G);
      updateFight(G, dt);
      if (bot) safe(function () { botStep(G, dt); });
    } else if (J.dead) {
      updateDeath(G, dt);
      if (J.state === 'muerto' && J.deadDlg && !J.finalDone && !SQ && G.state === 'playing' && !dlgActive() && p.hp > 0 && nearSeat(p) && ACH.input && fn(ACH.input, 'pressed') && ACH.input.pressed('KeyE')) startFinal();
    }
    updateNotes(G, dt);
    camFrame(G, dt);
    syncSolids(); pushOut(G);
  }
  // cámara de la pelea: W.camUp (game.js lo resta del objetivo) sube el encuadre para que Jaranón y el tabladillo se vean con Alexander
  var camMine = false;
  function camFrame(G, dt) {
    var W = ACH.world, p = G.player; if (!W) return;
    var on = (J.state === 'pelea' || J.state === 'muriendo' || (J.state === 'muerto' && !J.finalDone)) && inBox(p.x, p.y, -40);
    if (!on) { if (camMine) { W.camUp = (W.camUp || 0) * Math.max(0, 1 - dt * 4); if (Math.abs(W.camUp) < 0.5) { W.camUp = 0; camMine = false; } } return; }
    var V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }, want = (p.y - 10) - ((p.y + J.y - 50) / 2);
    want = clamp(want, 0, V.h / 2 - 46);   // Alexander nunca baja de ~46 px del borde de abajo
    W.camUp = (W.camUp || 0) + (want - (W.camUp || 0)) * Math.min(1, dt * 4); camMine = true;
  }
  function reset(G) {
    stopSeq(); if (frozenByMe) freeze(false);
    GEO = null; finished = false; gateLocked = false; bot = null; if (camMine && ACH.world) ACH.world.camUp = 0; camMine = false;
    killSummons(); removeFurniture();
    resetBoss(true);
    bossMusic(null); musicOn = null; showBar(false); barHideAt = -1;
    var P = ACH.partida, cont = false;
    try { cont = !!(P && fn(P, 'continuando') && P.continuando()); } catch (e) { cont = false; }
    if (cont && flag('barranco.jefe')) deadFromSave();
    installDebug();
  }
  function onRespawn(G) {
    stopSeq(); bot = null;
    if (J.dead) { syncSolids(); return; }
    var wasFight = J.state === 'pelea' || J.state === 'entrada';
    killSummons(); resetBoss(false); setGate(false);
    bossMusic(null); showBar(false); barHideAt = -1;
    if (wasFight && G && G.player) {   // reaparece en la puerta de la peña con la vida llena
      var g = geo(), d = g.door, p = G.player, tx = d.x, ty = d.y + 14;
      if (ty > g.box.y1 + 30) ty = d.y;
      if (!collide(tx, ty + 6, 5)) { p.x = tx; p.y = ty + 6; } else { p.x = tx; p.y = ty; }
      p.hp = CFGE().hpMax || 100;
      if (ACH.debug && fn(ACH.debug, 'teleport')) safe(function () { ACH.debug.teleport(p.x, p.y); });
    }
  }
  function mood() {
    if (J.state === 'pelea' || J.state === 'entrada') return { m: 'horde', i: 1 };
    return null;
  }
  function inArc(x, y, sw, pad) {
    var dx = x - sw.x, dy = y - sw.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > (sw.range || 24) + pad) return false;
    if (d < 5) return true;
    return Math.abs(wrap(Math.atan2(dy, dx) - (sw.ang || 0))) <= (sw.arc || Math.PI / 2) / 2;
  }
  function swingDmg(sw) {
    var d = typeof sw.dmg === 'number' ? sw.dmg : 1;
    if (sw.kind === 'guitar') return Math.max(1, d);
    if (sw.kind === 'punch') return Math.max(0.5, d);
    if (/cajon/.test(String(sw.kind))) return Math.max(0.5, d);
    return d;
  }
  function onSwing(G, sw) {
    if (!sw) return 0;
    var n = 0, dm = swingDmg(sw), cajK = /cajon/.test(String(sw.kind)), area = cajK || (sw.arc || 0) >= 6;
    var lag = /^(guitar|punch|held:)/.test(String(sw.kind)) && !area ? K.swingLag : 0;
    // el cajonero (fase 2)
    if (cajHittable() && dm > 0) {
      var b = geo().band.caj;
      if (dist(sw.x, sw.y, b.x, b.y) <= 30 || inArc(b.x, b.y, sw, 8)) { if (hitCaj(G, dm, sw.kind) > 0) n++; }
    }
    if (hittable() && dm > 0) {
      var d0 = dist(sw.x, sw.y, J.x, J.y), d1 = dist(sw.x, sw.y, J.x, J.y - 24);
      if (d0 <= K.nearBody || d1 <= K.nearBody - 6 || inArc(J.x, J.y, sw, K.bodyW + 4) || (area && d0 <= (sw.range || 56) + K.bodyW)) {
        if (hitBoss(G, dm, sw.x, sw.y, sw.kind || 'swing', { lag: lag, melee: lag > 0 }) > 0) n++;
      }
    }
    return n;   // nunca −1: no hay «¡CLANC!»
  }
  function projDmg(pr) {
    var kind = String(pr.kind || 'stone'), pd = typeof pr.dmg === 'number' ? pr.dmg : 1;
    if (kind === 'ball') return pd * 1.5;
    if (/^throw:helado/.test(kind)) return 0.5;
    if (/^throw:barraFosfo/.test(kind) || /^throw:fosfo/.test(kind)) return 0.5;
    if (/botellaDorada|dorada/i.test(kind)) return Math.max(2, pd);
    if (/botella/.test(kind)) return Math.max(1, pd);
    if (/cajon/.test(kind)) return pd > 0 ? pd : 0.5;
    if (/^heavy:/.test(kind)) return pd;
    if (kind === 'bubble' || kind === 'water') return 0;
    if (kind === 'stone') return Math.min(1, pd);
    return pd;
  }
  function projectileCounts(kind) { return !/^throw:/.test(kind) || /^throw:(helado|barraFosfo|fosfo|botella)/.test(kind); }
  function onProjectile(G, pr) {
    if (!pr) return false;
    var kind = String(pr.kind || 'stone'), r = pr.r || 2, t = G ? G.time || G.clock || 0 : 0;
    if (!projectileCounts(kind)) return false;
    if (pr._brHitAt !== undefined && t - pr._brHitAt < 0.35) return false;
    if (kind === 'dog') return hitBy('dog', pr.dmg, pr.x, pr.y) > 0;
    var isCaj = /cajon/.test(kind), isBot = /botella/.test(kind), area = isCaj || r >= 30;
    // botella cerca de sus pies: resbala (aunque no le pegue)
    if (isBot && hittable() && dist(pr.x, pr.y, J.x, J.y) < 30 + (r > 10 ? r * 0.5 : 0)) trySlip('botella');
    var hitC = false;
    if (cajHittable()) { var b = geo().band.caj; if (dist(pr.x, pr.y, b.x, b.y) < r + 10) { hitCaj(G, Math.max(0.5, projDmg(pr)), kind); hitC = true; } }
    var onJ = hittable() && (area ? dist(pr.x, pr.y, J.x, J.y) < r + K.bodyW + 4 : onBoss(pr.x, pr.y, r));
    if (!onJ) { if (hitC) mark(pr, t, 'cajonero', geo().band.caj.x, geo().band.caj.y); return hitC; }
    mark(pr, t, 'jaranon', J.x, J.y - 14);
    if (kind === 'bubble' || kind === 'water') { parts.push({ x: pr.x, y: pr.y, z: 10, vx: 0, vy: 0, vz: 0, t: 0, life: 0.2, c: '#dff6ff', w: 2, h: 2, g: 0 }); return true; }
    hitBoss(G, projDmg(pr), pr.x, pr.y, kind, isCaj || isBot || kind === 'ball' || kind === 'stone' ? { lag: 0, pr: pr } : { lag: 0, pr: pr });
    if (/^throw:helado/.test(kind)) slowBoss();
    if (kind === 'ball') addText('¡GOL!', J.x, J.y - 80, '#1fe07a');
    return true;
  }
  function mark(pr, t, what, cx, cy) {
    pr._brHitAt = t; pr._cvHitAt = t; pr.cvHit = what; pr.brHit = what;
    var dx = pr.x - cx, dy = pr.y - cy, d = Math.sqrt(dx * dx + dy * dy) || 1; pr.cvNx = dx / d; pr.cvNy = dy / d;
  }
  function slowBoss() {
    if (J.slowCD > 0) return false;
    J.slowT = K.slowT; J.slowCD = K.slowCD; addText('¡BRRR!', J.x, J.y - 84, '#9fe8ff');
    return true;
  }

  /* ---------------- API para perros y otros (juguetes.js lee ACH.cv.chef) ---------------- */
  function targets() {
    var out = [];
    J.r = K.bodyW; J.kind = 'chef'; J.id = 'chef'; J.boss = true; J.chef = true; J.big = true; J.jaranon = true;
    if (hittable()) out.push(J);
    return out;
  }
  function hitBy(src, dmg, x, y) {
    var G = ACH.G; if (!G) return 0;
    if (src && typeof src === 'object') { var o = (dmg && typeof dmg === 'object') ? dmg : { dmg: dmg }; src = o.kind || o.src || 'dog'; dmg = o.dmg; x = o.x; y = o.y; }
    src = String(src || 'dog');
    if (!hittable()) return 0;
    var isDog = /dog|perro/.test(src);
    var cd = isDog ? (dmg > 0 ? dmg : K.dogDmg) : src === 'ball' ? (dmg > 0 ? dmg : 1) * 1.5 : src === 'helado' ? 0.5 : (dmg > 0 ? dmg : 1);
    var got = hitBoss(G, cd, typeof x === 'number' ? x : J.x - 10, typeof y === 'number' ? y : J.y, src, isDog ? null : { lag: 0 });
    if (src === 'helado') slowBoss();
    if (isDog && got > 0) addText('¡GRR!', J.x + rand(-10, 10), J.y - 70, '#ffd36b');
    return got;
  }

  /* ---------------- Sprites: los de B2c / B2b o reemplazos provisorios ---------------- */
  function mk(w, h) {
    if (ACH.px && fn(ACH.px, 'canvas')) { try { var c0 = ACH.px.canvas(w, h); if (c0 && c0.getContext) return c0; } catch (e) { /* sigue */ } }
    if (ACH.lienzo && fn(ACH.lienzo, 'canvas')) { try { var c1 = ACH.lienzo.canvas(w, h); if (c1 && c1.getContext) return c1; } catch (e) { /* sigue */ } }
    var c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  }
  function outlined(src, ax, ay, ink) {
    var c = mk(src.width + 2, src.height + 2), g = c.getContext('2d'), m = mk(src.width, src.height), mg = m.getContext('2d');
    mg.drawImage(src, 0, 0); mg.globalCompositeOperation = 'source-in'; mg.fillStyle = ink || '#1a1216'; mg.fillRect(0, 0, m.width, m.height);
    g.drawImage(m, 0, 1); g.drawImage(m, 2, 1); g.drawImage(m, 1, 0); g.drawImage(m, 1, 2); g.drawImage(src, 1, 1);
    c.ax = ax + 1; c.ay = ay + 1; return c;
  }
  function tint(src, col) {
    var c = mk(src.width, src.height), g = c.getContext('2d');
    g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.75; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
    c.ax = src.ax; c.ay = src.ay; return c;
  }
  // Jaranón provisorio: 48×74, pies en (24, 72). Terno criollo blanco con pañuelo, bigote fino, engominado despeinado, piel verdosa,
  // ojos con brillo, micrófono antiguo de pedestal (bastón). Poses: idle canta pregon notas panuelo zapateo sostenida sinAire aturdido sentado.
  function bakeJ(pose, f) {
    var Wd = 52, Hd = 76, c = mk(Wd, Hd), g = c.getContext('2d'), ox = 4, oy = 2;
    var dy = 0, mouthK = 'shut', armR = 'mic', armL = 'down', legs = 'stand', eyes = 'glow', micUp = false, tilt = 0;
    if (pose === 'idle') { dy = f ? 1 : 0; }
    else if (pose === 'canta') { mouthK = f === 1 ? 'wide' : 'open'; micUp = true; armL = f === 2 ? 'up' : 'out'; dy = f === 1 ? -1 : 0; }
    else if (pose === 'pregon') { mouthK = 'wide'; micUp = true; armL = 'up'; dy = f ? -1 : 0; }
    else if (pose === 'notas') { mouthK = f ? 'wide' : 'open'; micUp = true; armL = 'out'; }
    else if (pose === 'panuelo') { armL = f === 0 ? 'up' : f === 1 ? 'swing' : 'low'; mouthK = 'open'; }
    else if (pose === 'zapateo') { legs = f === 1 ? 'stomp' : f === 2 ? 'stompR' : 'stand'; armL = 'hip'; mouthK = 'open'; dy = f === 0 ? -2 : 0; }
    else if (pose === 'sostenida') { mouthK = 'wide'; micUp = true; armL = 'up'; tilt = f ? 1 : 0; dy = -1; }
    else if (pose === 'sinAire') { mouthK = 'open'; armL = 'knee'; dy = 4; eyes = 'dim'; }
    else if (pose === 'aturdido') { mouthK = 'open'; eyes = 'x'; dy = f ? 1 : 0; tilt = f ? -1 : 1; }
    else if (pose === 'sentado') { legs = 'sit'; dy = 16; eyes = 'half'; armL = 'knee'; }
    function R(col, x, y, w, h) { g.fillStyle = col; g.fillRect(ox + x + tilt, oy + y + dy, w, h); }
    function Rf(col, x, y, w, h) { g.fillStyle = col; g.fillRect(ox + x, oy + y, w, h); }
    var WH = '#f1eee4', SH = '#cfc8b4', SK = '#8fa088', SK2 = '#748a72', HAIR = '#1b1a22', INK = '#22161a', PANT = '#e6e0cf', SHOE = '#151218', RED = '#c8202a', MIC = '#8a8f98', MICD = '#4a4e56';
    // pedestal del micrófono (bastón) a la derecha
    var mx = 38;
    if (legs !== 'sit') { Rf(MICD, mx - 3, 70, 9, 2); Rf(MIC, mx, micUp ? 26 : 30, 2, 41); }
    // piernas
    if (legs === 'stand') { Rf(PANT, 12, 50, 8, 20); Rf(PANT, 23, 50, 8, 20); Rf(SH, 19, 50, 1, 20); Rf(SHOE, 10, 69, 10, 3); Rf(SHOE, 23, 69, 10, 3); }
    else if (legs === 'stomp') { Rf(PANT, 12, 50, 8, 16); Rf(PANT, 23, 50, 8, 20); Rf(SHOE, 10, 64, 10, 3); Rf(SHOE, 23, 69, 10, 3); }
    else if (legs === 'stompR') { Rf(PANT, 12, 50, 8, 20); Rf(PANT, 23, 50, 8, 16); Rf(SHOE, 10, 69, 10, 3); Rf(SHOE, 23, 64, 10, 3); }
    else { Rf(PANT, 8, 66, 30, 6); Rf(SHOE, 4, 68, 6, 6); Rf(SHOE, 36, 68, 6, 6); }
    // saco (terno blanco criollo), un poco roto
    R(WH, 8, 26, 28, 26); R(WH, 6, 30, 32, 18); R(SH, 6, 46, 32, 3); R(SH, 21, 28, 2, 22);
    R('#e9e3d2', 9, 49, 26, 3);
    R(SK2, 30, 40, 3, 4); R('#d8d2c0', 12, 44, 3, 2);   // roto con hueso asomando
    // camisa, corbata michi y pañuelo al bolsillo
    R('#ffffff', 18, 25, 8, 6); R(INK, 19, 26, 6, 2); R(RED, 21, 26, 2, 2);
    R(RED, 10, 31, 4, 3); R('#ffffff', 11, 30, 2, 2);
    for (var b = 0; b < 2; b++) R('#b9b19a', 20, 35 + b * 6, 2, 2);
    // cabeza grande
    R(SK, 13, 6, 18, 18); R(SK2, 13, 21, 18, 3); R(SK, 12, 10, 1, 8); R(SK, 31, 10, 1, 8);
    // engominado algo despeinado
    R(HAIR, 12, 3, 20, 5); R(HAIR, 11, 5, 3, 6); R(HAIR, 30, 5, 3, 4); R('#3a3846', 15, 3, 10, 1);
    R(HAIR, 27, 1, 2, 3); R(HAIR, 29, 0, 2, 2);   // mechón parado
    // ojos
    if (eyes === 'glow') { R('#ffe08a', 16, 12, 3, 2); R('#ffe08a', 25, 12, 3, 2); R('#fff8d0', 17, 12, 1, 1); R('#fff8d0', 26, 12, 1, 1); }
    else if (eyes === 'dim') { R('#c8b878', 16, 13, 3, 1); R('#c8b878', 25, 13, 3, 1); }
    else if (eyes === 'half') { R('#a89a6a', 16, 13, 3, 1); R('#a89a6a', 25, 13, 3, 1); }
    else { R(INK, 16, 11, 1, 1); R(INK, 18, 13, 1, 1); R(INK, 17, 12, 1, 1); R(INK, 18, 11, 1, 1); R(INK, 16, 13, 1, 1); R(INK, 25, 11, 1, 1); R(INK, 27, 13, 1, 1); R(INK, 26, 12, 1, 1); R(INK, 27, 11, 1, 1); R(INK, 25, 13, 1, 1); }
    R(INK, 15, 10, 5, 1); R(INK, 24, 10, 5, 1);
    // bigote fino y boca
    R(INK, 16, 17, 5, 1); R(INK, 23, 17, 5, 1); R(INK, 15, 18, 1, 1); R(INK, 28, 18, 1, 1);
    if (mouthK === 'wide') { R('#3a1010', 19, 18, 6, 4); R('#e8e0d0', 20, 18, 4, 1); }
    else if (mouthK === 'open') { R('#3a1010', 20, 18, 4, 2); }
    else R(SK2, 20, 19, 4, 1);
    // brazo derecho con el micrófono
    if (micUp) { R(WH, 32, 22, 6, 12); R(SK, 33, 20, 5, 4); R(MIC, 34, 16, 4, 5); R('#c3c8cc', 33, 14, 6, 3); R(MICD, 35, 21, 2, 6); }
    else { R(WH, 34, 28, 6, 14); R(SK, 35, 41, 5, 4); R('#c3c8cc', 36, 24, 6, 4); R(MICD, 37, 28, 2, 2); }
    // brazo izquierdo (el del pañuelo blanco)
    function hand(x, y) { R(SK, x, y, 5, 4); }
    function panuelo(x, y, w, h) { R('#ffffff', x, y, w, h); R('#d8d4c8', x, y + h - 1, w, 1); }
    if (armL === 'down') { R(WH, 2, 28, 6, 16); hand(2, 43); panuelo(1, 46, 5, 5); }
    else if (armL === 'out') { R(WH, -2, 28, 10, 6); hand(-4, 27); panuelo(-6, 22, 6, 5); }
    else if (armL === 'up') { R(WH, 2, 12, 6, 16); hand(2, 8); panuelo(-1, 1, 8, 7); }
    else if (armL === 'swing') { R(WH, -4, 22, 12, 6); hand(-6, 21); panuelo(-10, 17, 8, 9); }
    else if (armL === 'low') { R(WH, 0, 34, 8, 10); hand(-1, 43); panuelo(-5, 46, 8, 4); }
    else if (armL === 'hip') { R(WH, 2, 30, 6, 10); hand(6, 39); panuelo(4, 42, 4, 6); }
    else { R(WH, 4, 34, 8, 10); hand(8, 43); panuelo(9, 45, 5, 4); }
    return outlined(c, ox + 20, oy + 71);
  }
  function bakeMusico(kind, f) {   // guitarrista o cajonero sentados, 26×34
    var c = mk(28, 36), g = c.getContext('2d');
    function R(col, x, y, w, h) { g.fillStyle = col; g.fillRect(x, y, w, h); }
    var SK = '#8fa088', SK2 = '#748a72', HAT = '#d8c48f', WH = '#ece7d8', WOOD = '#b07a45', WD2 = '#7a5230', INK = '#22161a';
    var bob = f % 2;
    if (kind === 'caj') {
      R(WOOD, 6, 22, 16, 13); R(WD2, 6, 33, 16, 2); R('#3a2416', 12, 27, 4, 3);   // cajón
      R('#2a2630', 8, 18, 5, 6); R('#2a2630', 15, 18, 5, 6);                     // piernas
      R(WH, 7, 8 + bob, 14, 12); R(RED2(), 9, 8 + bob, 10, 2);                   // camisa y pañuelo al cuello
      R(SK, 9, 0 + bob, 10, 9); R(SK2, 9, 7 + bob, 10, 2); R('#ffe08a', 11, 3 + bob, 2, 1); R('#ffe08a', 15, 3 + bob, 2, 1);
      var hy = f === 1 || f === 3 ? 20 : 16;                                      // manos golpeando entre las piernas
      R(WH, 3, 12 + bob, 4, 7); R(SK, 4, hy, 5, 4); R(WH, 21, 12 + bob, 4, 7); R(SK, 19, f === 2 ? 20 : 16, 5, 4);
    } else {
      R('#2a2630', 5, 24, 18, 6); R('#151218', 3, 30, 5, 4); R('#151218', 20, 30, 5, 4);   // silla y piernas
      R(WH, 7, 8 + bob, 14, 16); R('#8a6a3a', 7, 14 + bob, 14, 2);                         // guayabera y chaleco
      R(SK, 9, 1 + bob, 10, 9); R(SK2, 9, 8 + bob, 10, 2); R('#ffe08a', 11, 4 + bob, 2, 1); R('#ffe08a', 15, 4 + bob, 2, 1);
      R(HAT, 6, 0 + bob, 16, 2); R(HAT, 9, -2 + bob, 10, 3); R('#8a7a4a', 9, 1 + bob, 10, 1);
      R(WOOD, 2, 16, 14, 10); R(WD2, 2, 24, 14, 2); R('#3a2416', 7, 19, 3, 3); R(WD2, 15, 18, 12, 2);   // guitarra criolla
      R(SK, 8 + (f % 2) * 2, 18, 4, 4); R(SK, 22, 17, 4, 3);
    }
    void INK;
    return outlined(c, 14, 35);
  }
  function RED2() { return '#c8202a'; }
  function bakeMesa(broken) {
    var c = mk(28, 22), g = c.getContext('2d');
    function R(col, x, y, w, h) { g.fillStyle = col; g.fillRect(x, y, w, h); }
    if (!broken) {
      R('#6a4428', 4, 12, 2, 9); R('#6a4428', 22, 12, 2, 9); R('#5a3820', 13, 12, 2, 9);
      R('#f1eee4', 1, 6, 26, 7); R('#d8d2c0', 1, 12, 26, 2); R('#c8202a', 1, 6, 26, 1);   // mantel con ribete
      R('#2e7d4a', 6, 2, 2, 5); R('#e8e0d0', 18, 3, 4, 3); R('#ffd36b', 12, 4, 2, 2);      // botella, plato, vela
    } else {
      R('#6a4428', 3, 16, 2, 5); R('#6a4428', 21, 15, 3, 6);
      R('#f1eee4', 2, 14, 10, 5); R('#d8d2c0', 14, 16, 12, 4); R('#c8202a', 2, 14, 10, 1); R('#8a5a32', 8, 19, 12, 2);
    }
    return outlined(c, 14, 20);
  }
  function bakeColumna() {
    var c = mk(14, 44), g = c.getContext('2d');
    function R(col, x, y, w, h) { g.fillStyle = col; g.fillRect(x, y, w, h); }
    R('#d9c9a8', 1, 0, 12, 4); R('#cdb894', 3, 4, 8, 34); R('#e6d8bc', 4, 4, 2, 34); R('#b39c74', 9, 4, 2, 34);
    R('#d9c9a8', 1, 38, 12, 4); R('#b39c74', 1, 42, 12, 2);
    return outlined(c, 7, 43);
  }
  function bakeNota(f) {
    var c = mk(9, 12), g = c.getContext('2d');
    g.fillStyle = '#ffe08a';
    if (f === 0) { g.fillRect(1, 8, 4, 3); g.fillRect(4, 1, 1, 8); g.fillRect(5, 1, 2, 2); g.fillRect(7, 3, 1, 2); }
    else if (f === 1) { g.fillRect(0, 8, 3, 3); g.fillRect(5, 7, 3, 3); g.fillRect(2, 1, 1, 8); g.fillRect(7, 0, 1, 8); g.fillRect(2, 0, 6, 2); }
    else { g.fillRect(2, 8, 4, 3); g.fillRect(5, 0, 1, 9); }
    g.fillStyle = '#fff8d0'; g.fillRect(1, 8, 1, 1);
    return outlined(c, 4, 6, '#3a1a10');
  }
  function bakeCajonIcon() {   // metrónomo-cajón del HUD, 18×20
    var c = mk(18, 20), g = c.getContext('2d');
    function R(col, x, y, w, h) { g.fillStyle = col; g.fillRect(x, y, w, h); }
    R('#b07a45', 1, 1, 16, 18); R('#c98f55', 2, 2, 14, 2); R('#7a5230', 1, 17, 16, 2); R('#7a5230', 15, 1, 2, 18);
    R('#2a1810', 7, 10, 5, 5); R('#5a3820', 8, 11, 3, 3); R('#e8c08a', 3, 3, 1, 12);
    return outlined(c, 9, 10);
  }
  function textSpr(s, col, font) {
    var key = s + '|' + col + '|' + (font || ''), P0 = ph().txt;
    if (P0[key]) return P0[key];
    var w = 6 * s.length + 10, c = mk(w, 14), g = c.getContext('2d');
    if (ACH.px && fn(ACH.px, 'text')) { try { ACH.px.text(g, s, 3, 4, { font: font || 'a7', ink: col, outline: '#131015' }); } catch (e) { g.fillStyle = col; g.font = 'bold 8px monospace'; g.textBaseline = 'top'; g.fillText(s, 3, 3); } }
    else { g.fillStyle = '#131015'; g.font = 'bold 8px monospace'; g.textBaseline = 'top'; g.fillText(s, 4, 4); g.fillStyle = col; g.fillText(s, 3, 3); }
    c.ax = Math.round(w / 2); c.ay = 7;
    P0[key] = c; return c;
  }
  function bubbleSpr(s) {
    var P0 = ph().bub; if (P0[s]) return P0[s];
    var words = s.split(' '), lines = [''], maxC = 28;
    for (var i = 0; i < words.length; i++) { var L = lines[lines.length - 1]; if ((L + ' ' + words[i]).trim().length > maxC && L) lines.push(words[i]); else lines[lines.length - 1] = (L + ' ' + words[i]).trim(); }
    var tw = 0, hasPx = ACH.px && fn(ACH.px, 'text') && fn(ACH.px, 'measure');
    for (var j = 0; j < lines.length; j++) { var mw = 5 * lines[j].length; if (hasPx) { try { mw = ACH.px.measure(lines[j], 'a5') || mw; } catch (e) { /* nada */ } } tw = Math.max(tw, mw); }
    var w = tw + 10, h = lines.length * 8 + 8, c = mk(w + 2, h + 6), g = c.getContext('2d');
    g.fillStyle = '#131015'; g.fillRect(0, 0, w + 2, h + 2); g.fillStyle = '#fff4d6'; g.fillRect(1, 1, w, h);
    g.fillStyle = '#d4a23a'; g.fillRect(1, 1, w, 1);
    g.fillStyle = '#131015'; g.fillRect(Math.round(w / 2) - 2, h + 1, 6, 2); g.fillRect(Math.round(w / 2) - 1, h + 3, 4, 2); g.fillRect(Math.round(w / 2), h + 5, 2, 1);
    g.fillStyle = '#fff4d6'; g.fillRect(Math.round(w / 2) - 1, h, 4, 2); g.fillRect(Math.round(w / 2), h + 2, 2, 2);
    for (var k = 0; k < lines.length; k++) {
      if (hasPx) { try { ACH.px.text(g, lines[k], Math.round((w + 2) / 2), 5 + k * 8, { font: 'a5', ink: '#131015', align: 'c' }); continue; } catch (e) { /* sigue */ } }
      g.fillStyle = '#131015'; g.font = '6px monospace'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(lines[k], Math.round((w + 2) / 2), 4 + k * 8);
    }
    c.ax = Math.round((w + 2) / 2); c.ay = h + 6;
    P0[s] = c; return c;
  }
  var PHC = null;
  function ph() {
    if (PHC) return PHC;
    PHC = { j: {}, gui: [], caj: [], txt: {}, bub: {}, mesa: bakeMesa(false), mesaRota: bakeMesa(true), columna: bakeColumna(), nota: [bakeNota(0), bakeNota(1), bakeNota(2)], cajon: bakeCajonIcon() };
    var poses = { idle: 2, canta: 3, pregon: 2, notas: 2, panuelo: 3, zapateo: 3, sostenida: 2, sinAire: 2, aturdido: 2 };
    for (var k in poses) { PHC.j[k] = []; for (var f = 0; f < poses[k]; f++) PHC.j[k].push(bakeJ(k, f)); }
    PHC.j.sentado = bakeJ('sentado', 0);
    PHC.j.hurt = tint(PHC.j.idle[0], '#ffffff');
    for (var q = 0; q < 4; q++) { PHC.gui.push(bakeMusico('gui', q)); PHC.caj.push(bakeMusico('caj', q)); }
    var cc = PHC.caj[0], cr = mk(cc.height + 4, cc.width + 4), gg = cr.getContext('2d');
    gg.translate(cr.width / 2, cr.height / 2); gg.rotate(-Math.PI / 2); gg.drawImage(cc, -cc.width / 2, -cc.height / 2);
    cr.ax = Math.round(cr.width / 2); cr.ay = cr.height - 2; PHC.cajCae = cr;
    return PHC;
  }
  function PJ() { return (ACH.sprites && ACH.sprites.br && ACH.sprites.br.pj) || null; }
  function CAS() { return (ACH.sprites && ACH.sprites.br && ACH.sprites.br.casona) || null; }
  function frame(list, f) { if (!list) return null; if (Array.isArray(list)) return list.length ? list[((f % list.length) + list.length) % list.length] : null; return list; }
  function good(c) { return !!(c && c.width > 0); }
  function jSprite(pose, f) {
    var m = PJ(), set = m && m.jaranon, c = set ? frame(set[pose], f) : null;
    if (good(c)) return c;
    var p = ph();
    if (pose === 'hurt' || pose === 'sentado') return p.j[pose];
    return frame(p.j[pose] || p.j.idle, f);
  }
  function bandSprite(kind, f) {
    var m = PJ();
    if (kind === 'caj') {
      var cs = m && m.cajoneroZ;
      if (caj.down) { var cd = cs && frame(cs.cae, 0); return good(cd) ? cd : ph().cajCae; }
      var c1 = cs && frame(cs.toca, f); return good(c1) ? c1 : ph().caj[f % 4];
    }
    var gs = m && m.guitarristaZ, c2 = gs && frame(gs.toca, f); return good(c2) ? c2 : ph().gui[f % 4];
  }
  function casProp(k, broken) {
    var C = CAS(); if (!C) return null;
    var c = C[k] || (C.props && C.props[k]);
    if (broken && c && c.broken) c = c.broken;
    c = frame(c, 0); return good(c) ? c : null;
  }
  function casTile(k, i) { var C = CAS(); if (!C) return null; var L = C[k] || (C.tiles && C.tiles[k]); var c = frame(L, i); return good(c) ? c : null; }
  function notaSprite(f) { var m = PJ(), c = m && frame(m.nota, f); return good(c) ? c : ph().nota[f % 3]; }
  function drawC(ctx, c, x, y, flip) {
    if (!c) return;
    var ax = c.ax !== undefined ? c.ax : Math.round(c.width / 2), ay = c.ay !== undefined ? c.ay : c.height;
    if (!flip) { ctx.drawImage(c, Math.round(x - ax), Math.round(y - ay)); return; }
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(-1, 1); ctx.drawImage(c, -ax, -ay); ctx.restore();
  }
  function shadowE(ctx, x, y, rx, a) {
    ctx.globalAlpha = a; ctx.fillStyle = '#141018';
    ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), rx, Math.max(1, rx * 0.4), 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  }

  /* ---------------- Dibujo ---------------- */
  function poseNow() {
    if (J.state === 'muerto') return 'sentado';
    if (J.state === 'muriendo') return J.deadT < 0.3 ? 'hurt' : 'sinAire';
    if (J.slipT > 0 || J.stunT > 0) return 'aturdido';
    if (J.airT > 0) return 'sinAire';
    if (CONE && !CONE.warn) return 'sostenida';
    if (J.hurtT > 0.08) return 'hurt';
    if (J.poseT > 0 && J.pose) return J.pose;
    if (J.state === 'pelea' && band.play) return 'canta';
    return 'idle';
  }
  function poseFrame(pose) {
    var c = lastClock, beatF = c ? Math.floor(c.pulse * 2) : Math.floor(J.anim * 3);
    if (pose === 'panuelo' || pose === 'zapateo') return Math.min(2, Math.floor((0.4 - Math.max(0, J.poseT)) * 8));
    if (pose === 'canta') return beatF;
    return Math.floor(J.anim * (J.walking ? 4 : 2));
  }
  function visible() { return true; }
  function onScreen(x, y, cx, cy, m) { var V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }; return x > cx - m && x < cx + V.w + m && y > cy - m && y < cy + V.h + m * 1.5; }
  function drawJ(ctx, cx, cy) {
    var pose = poseNow(), c = jSprite(pose, poseFrame(pose));
    if (J.slowT > 0 && Math.floor(J.anim * 6) % 2 === 0) ctx.globalAlpha = 0.85;
    drawC(ctx, c, J.x - cx, J.y - cy, J.flip && pose !== 'sentado');
    ctx.globalAlpha = 1;
  }
  function drawables(G, out) {
    if (!out || !G) return;
    var cx0 = G.cam ? G.cam.x : 0, cy0 = G.cam ? G.cam.y : 0, g = geo(), i;
    if (!onScreen((g.box.x0 + g.box.x1) / 2, (g.box.y0 + g.box.y1) / 2, cx0, cy0, (g.box.x1 - g.box.x0) / 2 + 100)) return;
    // en el piso: tabladillo provisorio (si no hay casona), pista de losetas, sombras
    out.push({ y: -1e6 + 55, draw: function (ctx, cx, cy) {
      var gg = geo(), s = gg.stage, ts = K.tile, r, cc, k, worldPena = !!(ACH.world && ACH.world.pena) && !testArena;
      if (!CAS() && !(ACH.world && ACH.world.pena)) {
        ctx.fillStyle = '#5a3820'; ctx.fillRect(Math.round(s.x0 - cx), Math.round(s.y0 - cy), Math.round(s.x1 - s.x0), Math.round(s.y1 - s.y0));
        ctx.fillStyle = '#7a5230'; for (k = s.y0 + 4; k < s.y1; k += 6) ctx.fillRect(Math.round(s.x0 - cx), Math.round(k - cy), Math.round(s.x1 - s.x0), 1);
        ctx.fillStyle = '#2a1810'; ctx.fillRect(Math.round(s.x0 - cx), Math.round(s.y1 - cy - 3), Math.round(s.x1 - s.x0), 3);
      }
      for (r = 0; r < TILES.rows; r++) for (cc = 0; cc < TILES.cols; cc++) {
        var x = TILES.x0 + cc * ts - cx, y = TILES.y0 + r * ts - cy, idx = r * TILES.cols + cc;
        var spr = worldPena ? null : casTile('pistaBaile', (cc + r) % 2);
        if (worldPena) { /* el piso lo hornea mundo.js */ }
        else if (spr) ctx.drawImage(spr, Math.round(x), Math.round(y));
        else { ctx.fillStyle = (cc + r) % 2 ? '#3a2a34' : '#5a3a3a'; ctx.fillRect(Math.round(x), Math.round(y), ts, ts); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(Math.round(x), Math.round(y), ts, 1); }
        var on = (TILES.burn && TILES.burn[idx]) || (TILES.warn && TILES.warn[idx]);
        if (on) { var so = casTile('pistaBaileOn', (cc + r) % 2); if (so) { ctx.globalAlpha = TILES.burn ? 1 : 0.6; ctx.drawImage(so, Math.round(x), Math.round(y)); ctx.globalAlpha = 1; } }
      }
      if (J.state !== 'espera' || true) shadowE(ctx, J.x - cx, J.y - cy + 1, 18, 0.32);
      for (k = 0; k < NOTES.length; k++) shadowE(ctx, NOTES[k].x - cx, NOTES[k].y - cy, 3, 0.25);
    } });
    // la banda
    var bb = g.band, bf = band.play ? Math.floor((lastClock ? lastClock.pulse : J.anim * 2) * 2) : 0;
    out.push({ y: bb.gui.y, draw: function (ctx, cx, cy) { drawC(ctx, bandSprite('gui', bf), bb.gui.x - cx, bb.gui.y - cy, false); } });
    out.push({ y: bb.caj.y, draw: function (ctx, cx, cy) {
      if (caj.hurtT > 0 && Math.floor(caj.hurtT * 30) % 2) ctx.globalAlpha = 0.6;
      drawC(ctx, bandSprite('caj', bf), bb.caj.x - cx, bb.caj.y - cy, true); ctx.globalAlpha = 1;
      if (cajHittable() && caj.hp < K.cajHp) { ctx.fillStyle = '#131015'; ctx.fillRect(Math.round(bb.caj.x - cx - 9), Math.round(bb.caj.y - cy - 40), 18, 3); ctx.fillStyle = '#ffb000'; ctx.fillRect(Math.round(bb.caj.x - cx - 8), Math.round(bb.caj.y - cy - 39), Math.round(16 * caj.hp / K.cajHp), 1); }
    } });
    // mesas y columnas
    for (i = 0; i < FURN.length; i++) (function (f) {
      out.push({ y: f.y + (f.broken ? -6 : 0), draw: function (ctx, cx, cy) {
        var sh = f.shakeT > 0 ? Math.round(Math.sin(f.shakeT * 80) * 1) : 0, c;
        if (f.kind === 'columna') c = casProp('columnaPena') || ph().columna;
        else c = (f.broken ? casProp('mesaPena', true) : casProp('mesaPena')) || (f.broken ? ph().mesaRota : ph().mesa);
        drawC(ctx, c, f.x - cx + sh, f.y - cy + 2, false);
      } });
    })(FURN[i]);
    for (i = 0; i < DECOR.length; i++) (function (d) {
      out.push({ y: d.air ? g.box.y1 + 200 : d.y, draw: function (ctx, cx, cy) {
        var c = casProp(d.k, d.mesa && d.mesa.broken); if (Array.isArray(c)) c = c[d.v || 0]; if (d.k === 'cuadroCriollo') { var C = CAS(), L = C && (C.cuadroCriollo || (C.props && C.props.cuadroCriollo)); c = frame(L, d.v || 0); }
        if (good(c)) drawC(ctx, c, d.x - cx, d.y - cy, !!d.flip);
      } });
    })(DECOR[i]);
    out.push({ y: J.y + 0.1, x: J.x, draw: function (ctx, cx, cy) { drawJ(ctx, cx, cy); } });
  }
  function drawTop() { /* todo lo brillante va en drawHooks.screen (después del mapa de luz: se lee de noche) */ }
  // Capa de pantalla (después de la luz): focos, avisos, notas, cono, globos, textos y el metrónomo-cajón
  function drawScreen(ctx, G, cx, cy) {
    if (!G || !G.player || !GEO) return;
    var g = GEO, p = G.player, i;
    if (!onScreen((g.box.x0 + g.box.x1) / 2, (g.box.y0 + g.box.y1) / 2, cx, cy, (g.box.x1 - g.box.x0) / 2 + 80)) return;
    // focos del tabladillo (haces cálidos)
    if (lights > 0.05) {
      ctx.globalAlpha = 0.10 * lights; ctx.fillStyle = '#ffd98a';
      for (i = 0; i < g.focos.length; i++) {
        var fx = g.focos[i].x - cx, fy = g.focos[i].y - cy;
        ctx.beginPath(); ctx.moveTo(fx - 3, fy); ctx.lineTo(fx + 3, fy); ctx.lineTo(fx + 30, fy + 74); ctx.lineTo(fx - 30, fy + 74); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (i = 0; i < g.focos.length; i++) { ctx.fillStyle = '#131015'; ctx.fillRect(Math.round(g.focos[i].x - cx - 3), Math.round(g.focos[i].y - cy - 2), 6, 4); ctx.fillStyle = lights > 0.5 ? '#fff1b0' : '#8a7a4a'; ctx.fillRect(Math.round(g.focos[i].x - cx - 2), Math.round(g.focos[i].y - cy), 4, 2); }
    }
    // losetas: aviso (amarillo que parpadea) y quema (naranja)
    if (TILES.warn || TILES.burn) {
      var ts = K.tile, blink = Math.floor((G.clock || 0) * 10) % 2;
      for (var r = 0; r < TILES.rows; r++) for (var c2 = 0; c2 < TILES.cols; c2++) {
        var id2 = r * TILES.cols + c2, x = Math.round(TILES.x0 + c2 * ts - cx), y = Math.round(TILES.y0 + r * ts - cy);
        if (TILES.burn && TILES.burn[id2]) { ctx.globalAlpha = 0.55 * Math.max(0.3, TILES.burnT / K.burnFx); ctx.fillStyle = '#ff5a1e'; ctx.fillRect(x + 1, y + 1, ts - 2, ts - 2); ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffe08a'; ctx.fillRect(x + 5, y + 5, ts - 10, ts - 10); }
        else if (TILES.warn && TILES.warn[id2]) { ctx.globalAlpha = blink ? 0.42 : 0.26; ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 1, y + 1, ts - 2, ts - 2); ctx.globalAlpha = 0.8; ctx.strokeStyle = '#ffe500'; ctx.lineWidth = 1; ctx.strokeRect(x + 1.5, y + 1.5, ts - 3, ts - 3); }
      }
      ctx.globalAlpha = 1;
    }
    // aviso de ataque: destello en el piso y brillo del micrófono
    if (J.state === 'pelea' && pending.length && J.stunT <= 0) {
      var m = mouth(), blink2 = Math.floor((G.clock || 0) * 14) % 2;
      ctx.fillStyle = blink2 ? '#ffe500' : '#ff2e88'; ctx.fillRect(Math.round(m.x - cx) - 2, Math.round(m.y - cy) - 2, 4, 4);
      for (i = 0; i < pending.length; i++) {
        var a = pending[i];
        if (a.k === 'panuelo') { arcFill(ctx, J.x - cx, J.y - cy, a.big ? K.panRBig : K.panR, a.ang, a.big ? K.panArcBig : K.panArc, '#ffffff', blink2 ? 0.28 : 0.16); }
        else if (a.k === 'zapateo') { ringStroke(ctx, J.x - cx, J.y - cy, a.big ? K.stompRBig : K.stompR, '#ffe500', blink2 ? 0.8 : 0.45); }
        else if (a.k === 'notas') { var aim = typeof a.aim === 'number' ? a.aim : aimNow(p), n = a.big ? K.noteNBig : K.noteN, arc = a.big ? K.noteArcBig : K.noteArc; ctx.globalAlpha = blink2 ? 0.8 : 0.4; ctx.fillStyle = '#ffe08a'; for (var q = 0; q < n; q++) { var an = aim + (n > 1 ? (q / (n - 1) - 0.5) * arc : 0); for (var rr = 12; rr < 60; rr += 6) ctx.fillRect(Math.round(m.x + Math.cos(an) * rr - cx), Math.round(m.y + 26 + Math.sin(an) * rr - cy), 2, 1); } ctx.globalAlpha = 1; }
      }
      drawC(ctx, textSpr('!', '#ffe500'), J.x - cx, J.y - cy - 84, false);
    }
    // ondas (pañuelazo y zapateo)
    for (i = 0; i < waves.length; i++) {
      var w = waves[i], k2 = w.t / w.life;
      if (w.kind === 'arc') arcFill(ctx, w.x - cx, w.y - cy, w.r * (0.4 + 0.6 * k2), w.ang, w.arc, '#ffffff', 0.45 * (1 - k2));
      else ringStroke(ctx, w.x - cx, w.y - cy, 8 + (w.r - 8) * k2, '#fff1a8', 1 - k2);
    }
    // nota sostenida: el cono
    if (CONE) {
      var mm = mouth(), ang = coneAngle();
      arcFill(ctx, mm.x - cx, mm.y + 26 - cy, K.coneRange, ang, K.coneArc, CONE.warn ? '#ffe500' : '#ff2e88', CONE.warn ? (Math.floor((G.clock || 0) * 12) % 2 ? 0.18 : 0.08) : 0.22);
      if (!CONE.warn) { ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); for (var s2 = -1; s2 <= 1; s2 += 2) { ctx.moveTo(Math.round(mm.x - cx) + 0.5, Math.round(mm.y + 26 - cy) + 0.5); ctx.lineTo(Math.round(mm.x - cx + Math.cos(ang + s2 * K.coneArc / 2) * K.coneRange) + 0.5, Math.round(mm.y + 26 - cy + Math.sin(ang + s2 * K.coneArc / 2) * K.coneRange) + 0.5); } ctx.stroke(); ctx.globalAlpha = 1; }
    }
    // notas en vuelo
    for (i = 0; i < NOTES.length; i++) { var nn = NOTES[i]; drawC(ctx, notaSprite(nn.f), nn.x - cx, nn.y - nn.z - cy + Math.sin(nn.t * 14) * 1.5, false); }
    // partículas y textos
    for (i = 0; i < parts.length; i++) { var qq = parts[i], al = 1 - qq.t / qq.life; ctx.globalAlpha = Math.max(0, Math.min(1, al * 1.6)); ctx.fillStyle = qq.c; ctx.fillRect(Math.round(qq.x - cx), Math.round(qq.y - qq.z - cy), qq.w, qq.h); }
    ctx.globalAlpha = 1;
    for (i = 0; i < texts.length; i++) { var tt = texts[i]; ctx.globalAlpha = tt.t > 0.5 ? Math.max(0, 1 - (tt.t - 0.5) / 0.2) : 1; drawC(ctx, textSpr(tt.s, tt.c), tt.x - cx, tt.y - cy - tt.t * 16, false); }
    ctx.globalAlpha = 1;
    // estrellitas de aturdido / gotitas de sin aire
    if (J.stunT > 0 || J.slipT > 0) { ctx.fillStyle = '#ffe500'; for (i = 0; i < 3; i++) { var aa = J.anim * 5 + i * 2.09; ctx.fillRect(Math.round(J.x - cx + Math.cos(aa) * 12), Math.round(J.y - cy - 76 + Math.sin(aa) * 3), 2, 2); } }
    if (J.airT > 0) { ctx.fillStyle = '#9fe8ff'; for (i = 0; i < 2; i++) ctx.fillRect(Math.round(J.x - cx - 10 + i * 18), Math.round(J.y - cy - 60 + ((J.anim * 20 + i * 9) % 14)), 1, 2); }
    // globo
    if (bubble) drawC(ctx, bubbleSpr(bubble.s), J.x - cx, J.y - cy - 82, false);
    // E junto a Don Jaranón sentado (al CONTINUAR o si se cerró algo)
    if (J.state === 'muerto' && J.deadDlg && !J.finalDone && nearSeat(p) && G.state === 'playing') drawC(ctx, textSpr(TXT.sentado, '#ffffff', 'a5'), p.x - cx, p.y - cy + 14, false);
    // el metrónomo-cajón, abajo al centro
    if (J.state === 'pelea') drawMetro(ctx, G);
  }
  function arcFill(ctx, x, y, r, ang, arc, col, a) {
    ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(Math.round(x), Math.round(y));
    ctx.arc(Math.round(x), Math.round(y), r, ang - arc / 2, ang + arc / 2); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  }
  function ringStroke(ctx, x, y, r, col, a) { ctx.globalAlpha = Math.max(0, a); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), r, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
  function drawMetro(ctx, G) {
    var V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }, c = lastClock || clock();
    var x = Math.round(V.w / 2), y = Math.round(V.h - 30), resp = !!(RESP && !RESP.ok), celeste = resp || lando.t > 0;
    var pulse = metro.k * (metro.down ? 1.45 : 1.2), sc = 1 + 0.3 * pulse;
    // anillo
    var ring = 13 + 5 * metro.k * (metro.down ? 1.4 : 1);
    ctx.globalAlpha = 0.85; ctx.strokeStyle = '#131015'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, ring, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = celeste ? '#3ad6ff' : (metro.down ? '#ffe500' : '#ff9a3a'); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, ring, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    // cajón
    var cj = ph().cajon;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.drawImage(cj, -cj.ax, -cj.ay); ctx.restore();
    // pulsos del compás
    var meter = c.meter, bib = ((Math.floor(c.pulse) % meter) + meter) % meter, dx = 7, x0 = x - (meter - 1) * dx / 2;
    for (var i = 0; i < meter; i++) { ctx.fillStyle = '#131015'; ctx.fillRect(Math.round(x0 + i * dx) - 2, y + 20, 5, 5); ctx.fillStyle = i === bib ? (celeste ? '#3ad6ff' : '#ffe500') : '#5a4a3a'; ctx.fillRect(Math.round(x0 + i * dx) - 1, y + 21, 3, 3); }
    // la aguja de la ventana: qué tan cerca del pulso
    var f = c.pulse - Math.floor(c.pulse), off = Math.min(f, 1 - f) * c.per, inWin = off <= tolNow();
    if (inWin) { ctx.fillStyle = celeste ? '#3ad6ff' : '#ffffff'; ctx.globalAlpha = 0.7; ctx.fillRect(x - 16, y - 18, 32, 1); ctx.globalAlpha = 1; }
    if (resp) {
      var bl = Math.floor((G.clock || 0) * 6) % 2;
      drawC(ctx, textSpr(TXT.respLabel, bl ? '#3ad6ff' : '#ffe500', 'a7'), x, y - 26, false);
    } else if (lando.t > 0) drawC(ctx, textSpr('LANDÓ', '#3ad6ff', 'a5'), x, y - 24, false);
    else if (J.voz && J.state === 'pelea') drawC(ctx, textSpr('SE LUCE ×' + K.vozMul, '#e0b84a', 'a5'), x, y - 24, false);
    if (metro.ok > 0) { ctx.globalAlpha = Math.min(1, metro.ok * 2); drawC(ctx, textSpr(metro.okTxt || TXT.aTiempo, metro.okTxt === TXT.contra ? '#3ad6ff' : '#ffffff', 'a7'), x, y - 38 - (1 - metro.ok) * 6, false); ctx.globalAlpha = 1; }
  }
  function hookScreen() {
    var DH = ACH.drawHooks = ACH.drawHooks || { ground: [], ysort: [], air: [], screen: [] };
    DH.screen = DH.screen || [];
    if (DH.screen.indexOf(drawScreen) < 0) DH.screen.push(drawScreen);
  }

  /* ---------------- Barra de jefe (HTML chicha sobre #stage) ---------------- */
  var UI = { styled: false, bar: null, fill: null, shown: false, lastW: -1 };
  function injectStyle() {
    if (UI.styled) return; UI.styled = true;
    var st = document.createElement('style'); st.id = 'jaranonStyle';
    st.textContent =
      '#jaranonBar{position:absolute;left:50%;top:calc(var(--u)*3);transform:translateX(-50%) rotate(-1deg);z-index:5;pointer-events:none;display:none;' +
      'width:calc(var(--u)*170);background:#131015;border:var(--u) solid #ffe500;box-shadow:calc(var(--u)*2) calc(var(--u)*2) 0 #3ad6ff;' +
      'padding:calc(var(--u)*2) calc(var(--u)*3);text-align:center}' +
      '#jaranonBar.on{display:block;animation:jbIn .45s ease-out}' +
      '#jaranonBar .jn{display:block;font-family:var(--display);font-size:calc(var(--u)*6);line-height:1;color:#ffe500;white-space:nowrap;letter-spacing:.02em;' +
      'text-shadow:var(--u) var(--u) 0 #c8202a;margin-bottom:calc(var(--u)*1)}' +
      '#jaranonBar .jb{position:relative;height:calc(var(--u)*4);background:#2a2630;border:var(--u) solid #000}' +
      '#jaranonBar .jb i{position:absolute;left:0;top:0;bottom:0;width:100%;background:#1fe07a;border-top:var(--u) solid #9dffc8;transition:width .15s linear}' +
      '#jaranonBar .jb u{position:absolute;top:0;bottom:0;width:var(--u);background:rgba(255,255,255,.55)}' +
      '#jaranonBar.hit .jb i{background:#fff6b0}' +
      '#jaranonBar[data-ph="2"] .jb i{background:#ffb000}#jaranonBar[data-ph="3"] .jb i{background:#ff2e88;animation:blink .5s steps(2) infinite}' +
      '#jaranonBar.voz .jb{border-color:#e0b84a;box-shadow:0 0 0 var(--u) #e0b84a}' +
      '#jaranonBar.stun .jn{color:#3ad6ff}#jaranonBar.dead{opacity:.6}' +
      '@keyframes jbIn{0%{opacity:0;transform:translateX(-50%) translateY(calc(var(--u)*-8)) rotate(-1deg)}100%{opacity:1;transform:translateX(-50%) rotate(-1deg)}}';
    (document.head || document.documentElement).appendChild(st);
  }
  function stage() { return typeof document !== 'undefined' ? document.getElementById('stage') : null; }
  function barEl() {
    if (UI.bar) return UI.bar;
    var s = stage(); if (!s) return null;
    injectStyle();
    var d = document.createElement('div'); d.id = 'jaranonBar'; d.setAttribute('data-ph', '1'); d.setAttribute('data-ui', '');
    d.innerHTML = '<span class="jn">DON JARANÓN · LA VOZ DE ORO DE BARRANCO</span><div class="jb"><i></i><u style="left:60%"></u><u style="left:25%"></u></div>';
    s.appendChild(d);
    UI.bar = d; UI.fill = d.querySelector('i');
    return d;
  }
  function showBar(on) {
    var b = on ? barEl() : UI.bar; if (!b) return;
    UI.shown = !!on; b.classList.toggle('on', !!on); b.classList.toggle('dead', false);
    if (on) syncBar(true);
  }
  function syncBar(force) {
    if (!UI.bar || !UI.shown) return;
    var w = Math.round(1000 * J.hp / J.hpMax) / 10;
    UI.bar.classList.toggle('stun', J.stunT > 0 || J.airT > 0);
    UI.bar.classList.toggle('voz', !!J.voz && !(J.stunT > 0));
    if (!force && w === UI.lastW) return;
    UI.lastW = w; UI.fill.style.width = w + '%';
    UI.bar.setAttribute('data-ph', String(J.dead ? 1 : phaseOf()));
    UI.bar.classList.toggle('dead', J.dead);
  }
  var hitTO = 0;
  function flashBar() { if (!UI.bar) return; UI.bar.classList.add('hit'); clearTimeout(hitTO); hitTO = setTimeout(function () { if (UI.bar) UI.bar.classList.remove('hit'); }, 90); }

  /* ---------------- Bot de prueba (balance): guitarra + 2 comidas ---------------- */
  // ACH.debug.br.jefe.bot(true, {contrapunto: false}) maneja a Alexander con ACH.input (esquiva los avisos, pega de cerca, come 2 veces).
  function botStep(G, dt) {
    var p = G.player, I = ACH.input; if (!I || !(p.hp > 0)) return;
    bot.t += dt;
    var g = geo(), tx = J.x, ty = J.y + 22, danger = false, i;
    // ¿qué viene?
    for (i = 0; i < pending.length; i++) {
      var a = pending[i];
      if (a.k === 'panuelo' || a.k === 'zapateo') { danger = true; var dd = dist(p.x, p.y, J.x, J.y) || 1; tx = J.x + (p.x - J.x) / dd * 100; ty = J.y + (p.y - J.y) / dd * 100; }
      if (a.k === 'notas') { danger = true; var an = (typeof a.aim === 'number' ? a.aim : Math.atan2(p.y - J.y, p.x - J.x)) + Math.PI / 2; tx = p.x + Math.cos(an) * 40 * (bot.side || 1); ty = p.y + Math.sin(an) * 40 * (bot.side || 1); bot.dodge = { x: tx, y: ty, t: 0.6 }; }
    }
    if (bot.dodge && bot.dodge.t > 0 && NOTES.length) { bot.dodge.t -= dt; danger = true; tx = bot.dodge.x; ty = bot.dodge.y; }
    var pat = TILES.warn || null;
    if (pat) { var best = null, bd = 1e9; for (var r = 0; r < TILES.rows; r++) for (var c = 0; c < TILES.cols; c++) { if (pat[r * TILES.cols + c]) continue; var x = TILES.x0 + (c + 0.5) * K.tile, y = TILES.y0 + (r + 0.5) * K.tile, q = dist(p.x, p.y, x, y); if (q < bd) { bd = q; best = { x: x, y: y }; } } if (best && tileAt(p.x, p.y) >= 0) { danger = true; tx = best.x; ty = best.y; } }
    if (CONE) {   // detrás de una mesa o detrás de él
      var hm = mouth(), cov = null, cd = 1e9;
      for (i = 0; i < FURN.length; i++) { var f = FURN[i]; if (f.broken) continue; var ax = f.x - hm.x, ay = f.y - (hm.y + 26), al = Math.sqrt(ax * ax + ay * ay) || 1, hx = f.x + ax / al * 14, hy = f.y + ay / al * 10, q2 = dist(p.x, p.y, hx, hy); if (q2 < cd) { cd = q2; cov = { x: hx, y: hy }; } }
      if (cov && cd < 160) { tx = cov.x; ty = cov.y; danger = true; } else { tx = J.x; ty = J.y - 20; danger = true; }
    }
    if (J.stunT > 0 || J.airT > 0 || J.slipT > 0) { danger = false; tx = J.x; ty = J.y + 20; }
    var zt = null, zd = 70; liveSummons(); for (i = 0; i < SUMMON.length; i++) { var zq = dist(p.x, p.y, SUMMON[i].x, SUMMON[i].y); if (zq < zd) { zd = zq; zt = SUMMON[i]; } }
    if (zt && !danger && J.stunT <= 0 && J.airT <= 0) { tx = zt.x; ty = zt.y; if (zd < 20 && !(bot.contra === 'no' && offBeat(0) <= tolNow() + 0.04)) { if (bot.press <= 0) { I.press('Space', true); bot.press = 0.05; } } }
    // comer (2 veces): +30
    if (p.hp < 40 && bot.food > 0) { bot.food--; p.hp = Math.min(CFGE().hpMax || 100, p.hp + 30); bot.ate++; }
    var dx = tx - p.x, dy = ty - p.y, dl = Math.sqrt(dx * dx + dy * dy);
    if (dl > 4) I.setVAxis(dx / dl, dy / dl); else I.setVAxis(0, 0);
    if (!danger || J.stunT > 0) {
      var near = dist(p.x, p.y, J.x, J.y) < K.nearBody - 4 || (cajHittable() && dist(p.x, p.y, geo().band.caj.x, geo().band.caj.y) < 26);
      var openR = RESP && !RESP.ok, wantTime = (bot.contra === true && openR) || bot.ritmo, avoid = bot.contra === 'no';
      if (near && !((p.atkCD || 0) > 0) && (!wantTime || offBeat(0) < 0.05) && (!avoid || offBeat(0) > tolNow() + 0.04)) { if (bot.press <= 0) { I.press('Space', true); bot.press = 0.05; } }
    }
    if (bot.press > 0) { bot.press -= dt; if (bot.press <= 0) I.release('Space'); }
    if (bot.t > 1 && Math.floor(bot.t) % 3 === 0) bot.side = (Math.floor(bot.t / 3) % 2) ? 1 : -1;
  }

  /* ---------------- Debug ---------------- */
  function info() {
    var g = geo(), c = lastClock || clock();
    return { state: J.state, dead: J.dead, hp: +J.hp.toFixed(2), hpMax: J.hpMax, phase: J.phase, x: Math.round(J.x), y: Math.round(J.y),
      bar: curBar, next: nextBar, plan: PLAN.slice(), resp: !!RESP, lucido: J.lucido, stunT: +Math.max(0, J.stunT).toFixed(2), airT: +Math.max(0, J.airT).toFixed(2),
      slipT: +Math.max(0, J.slipT).toFixed(2), cone: !!CONE, pending: pending.map(function (a) { return a.k; }), notes: NOTES.length,
      fightT: +J.fightT.toFixed(1), lastCp: J.lastCp || null, lastOff: J.lastOff, tries: J.tries, hits: J.hits, contrapuntos: J.contrapuntos, lucidos: J.lucidos, voz: J.voz, onHits: J.onHits, offHits: J.offHits,
      clock: { pulse: +c.pulse.toFixed(2), per: +c.per.toFixed(3), meter: c.meter, bpm: Math.round(c.bpm), src: c.src }, tol: +tolNow().toFixed(3), lando: +Math.max(0, lando.t).toFixed(1),
      cajonero: { hp: caj.hp, down: caj.down, mul: caj.mul }, jaraneros: liveSummons(), mesas: FURN.filter(function (f) { return f.kind === 'mesa' && !f.broken; }).length, columnas: FURN.filter(function (f) { return f.kind === 'columna'; }).length,
      gate: gateLocked, geo: { src: g.src, box: rnd(g.box), stage: rnd(g.stage), pista: rnd(g.pista), door: g.door, home: g.home, tiles: [TILES.cols, TILES.rows] },
      frozenByMe: frozenByMe, seq: SQ ? SQ.i : null, music: musicOn, onCast: castHooked, final: !!(BR.final && fn(BR.final, 'play')), finish: fn(BR, 'finish'), beatApi: fn(BR, 'beat'),
      bot: bot ? { t: +bot.t.toFixed(1), ate: bot.ate, contra: bot.contra } : null };
  }
  function rnd(b) { return { x0: Math.round(b.x0), y0: Math.round(b.y0), x1: Math.round(b.x1), y1: Math.round(b.y1) }; }
  function toArena(G) { var g = geo(), p = G && G.player; if (!p) return; var t = { x: g.home.x, y: Math.min(g.box.y1 - 14, g.pista.y1 + 8) }; p.x = t.x; p.y = t.y; if (ACH.debug && fn(ACH.debug, 'teleport')) safe(function () { ACH.debug.teleport(t.x, t.y); }); }
  function ensurePlaying() {
    var G = ACH.G; if (!G) return false;
    if (G.state === 'title' || G.state === 'won' || G.state === 'intro') { if (ACH.dialogo && fn(ACH.dialogo, 'close') && dlgActive()) safe(function () { ACH.dialogo.close(); }); if (ACH.debug && fn(ACH.debug, 'start')) safe(function () { ACH.debug.start(); }); }
    if (G.state === 'paused' || G.state === 'dead') { G.state = 'playing'; safe(function () { ACH.hud.setState('playing'); }); }
    return G.state === 'playing';
  }
  function ensureFight() {
    var G = ACH.G; if (!G || J.dead) return;
    ensurePlaying();
    if (J.state !== 'pelea') { stopSeq(); if (frozenByMe) freeze(false); J.introSeen = true; setGate(true); startFight(G); }
  }
  var DBG = {
    state: info, info: info,
    start: function (intro) { var G = ACH.G; ensurePlaying(); if (J.dead) { resetBoss(true); finished = false; } toArena(G); if (intro) { J.introSeen = false; J.state = 'espera'; return info(); } ensureFight(); return info(); },
    fase: function (n) { ensureFight(); n = n | 0; J.hp = n >= 3 ? J.hpMax * K.ph3 - 0.01 : n === 2 ? J.hpMax * K.ph2 - 0.01 : J.hpMax; syncBar(true); var ph = phaseOf(); if (ph !== J.phase) changePhase(ph); return info(); },
    hp: function (n) { if (typeof n === 'number') { ensureFight(); J.hp = clamp(n, 0, J.hpMax); syncBar(true); if (J.hp <= 0) die(ACH.G, false); else { var ph = phaseOf(); if (ph > J.phase) changePhase(ph); } } return info(); },
    win: function (quick) { var G = ACH.G; if (J.dead) { if (J.deadDlg && !J.finalDone) startFinal(); return info(); } ensureFight(); die(G, quick !== false); return info(); },
    resp: function () { ensureFight(); PLAN = ['respuesta', 'respuesta']; nextBar = 'respuesta'; return info(); },
    field: function () { return { notes: NOTES.map(function (n) { return { x: n.x, y: n.y, vx: n.vx, vy: n.vy }; }), pending: pending.map(function (a) { return { k: a.k, ang: a.ang }; }), warn: TILES.warn ? Array.prototype.slice.call(TILES.warn) : null, tiles: { x0: TILES.x0, y0: TILES.y0, cols: TILES.cols, rows: TILES.rows }, cone: CONE ? { ang: coneAngle(), warn: CONE.warn } : null, furn: FURN.map(function (f) { return { k: f.kind, x: f.x, y: f.y, broken: f.broken }; }), K: K }; },
    bot: function (on, o) { o = o || {}; if (on === false) { bot = null; if (ACH.input) { ACH.input.setVAxis(0, 0); ACH.input.release('Space'); } return info(); } bot = { t: 0, food: o.food === undefined ? 2 : o.food, ate: 0, contra: o.contrapunto === 'no' ? 'no' : !!o.contrapunto, ritmo: !!o.ritmo, press: 0, side: 1 }; return info(); },
    // para probar en una página sin la peña de B1a: la arena alrededor de Alexander (±11 × −9/+6 tiles)
    arenaHere: function (wt, ht) {
      var G = ACH.G, p = G && G.player; if (!p) return null; var t = T(); wt = wt || 11; ht = ht || 9;
      testArena = { x0: p.x - wt * t, x1: p.x + wt * t, y0: p.y - ht * t, y1: p.y + 5 * t };
      GEO = null; killSummons(); resetBoss(true); geo(); return info();
    },
    tick: function (dt, n) { for (var i = 0; i < (n || 1); i++) { if (!SQ) break; sqLast = now() - (dt || 1 / 30); sqLoop(); } return info(); },   // avanza la secuencia de entrada a mano (pestaña oculta)
    K: K
  };
  function installDebug() {
    var D = ACH.debug = ACH.debug || {};
    var DB = D.br = D.br || {};
    DB.jefe = DBG; J.debug = DBG;
  }
  installDebug();
  setTimeout(installDebug, 0);
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(installDebug, 0); }); }

  /* ---------------- Registro ---------------- */
  var SYS = { id: 'jaranon', name: 'jaranon', update: update, reset: reset, onRespawn: onRespawn, mood: mood, drawables: drawables, drawTop: drawTop,
    onSwing: onSwing, onProjectile: onProjectile };
  BR.register(SYS);
  BR.jaranonK = K;
  hookScreen();
  // alias para los módulos que conocen al «chef» (juguetes.js: perros; partida.js / dificultad.js / habilidades.js: «jefe en pelea»)
  try { var CVo = ACH.cv; if (CVo && !CVo.chef) CVo.chef = J; } catch (e) { /* nada */ }
  setTimeout(function () { try { var CVo = ACH.cv; if (CVo && !CVo.chef) CVo.chef = J; } catch (e) { /* nada */ } }, 0);
  void visible;
})();
