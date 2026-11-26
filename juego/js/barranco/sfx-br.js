/* ACHORADO - js/barranco/sfx-br.js  (B3, nivel Barranco: playa → Bajada de Baños → Puente de los Suspiros → Ermita → Parque Municipal → calles bohemias → peña de Don Jaranón)
 * Sonidos nuevos del nivel, todo sintetizado con Web Audio (usa ACH.audio.lib de sfx.js). Se registran SIN editar sfx.js ni motor.js, igual que js/costaverde/sfx-cv.js:
 * motor.js busca cada evento en ACH.audio.recipes[name] (A.emit y A.loop), así que basta con agregar recetas ahí. Carga DESPUÉS de motor.js (si cargara antes tampoco pasa nada).
 * Sin estos sonidos el juego sigue igual: un evento sin receta no suena. Todas las recetas aceptan data.delay (s) para encadenarlas y data.boost 1..10 para subir el nivel.
 *
 * EVENTOS (nombre exacto para ACH.audio.emit(name, data); data = {x, y} si es posicional)
 *   ambiente   br.gaviota · br.escalon ({n}: paso en piedra) · br.puente.paso (tabla de madera) · br.puente.crujido (al entrar al puente) · br.porton (se abre el portón de la peña)
 *   cajón      br.cajon.golpe ({tiempo}: el golpe con la palma) · br.cajon.onda ({tiempo, r}: la onda de sonido de 360°) · br.cajon.atiempo («¡A TIEMPO!» dorado) · br.cajon.rompe (la onda rompe un prop liviano)
 *   botellas   br.botella.lanza · br.botella.rompe ({gold}) · br.botella.vidrios (cae el vidrio) · br.charco (se forma el charco) · br.resbalon ({player}) · br.caida (cae al piso, aturdido)
 *   poeta      br.poeta.murmullo (declama bajito) · br.poeta.declama (el verso largo) · br.letra.lanza · br.letra.golpe (lo ralentiza) · br.letra.rompe
 *   pintor     br.brochazo.lanza (aviso) · br.brochazo.splat ({hit}) · br.mancha (queda la mancha) · br.caballete.rompe
 *   músico     br.musico.nota ({kind: zampona|guitarra|cajon, n: 0..4}) · br.musico.zampona · br.musico.guitarra · br.musico.cajon
 *   parejas    br.pareja.suspiro · br.pareja.beso · br.pareja.despechado (el grito) · br.pareja.llanto
 *   jaranero   br.zapateo ({n}: taconeo) · br.zapateo.empuja (el pisotón que empuja)
 *   peña       br.pena.aplausos ({size 0.4..1.6}) · br.pena.eso («¡eso!» a coro) · br.pena.risas · br.pena.brindis
 *   Jaranón    br.jefe.entra · br.jefe.nota ({i: 0..2}) · br.jefe.panuelo · br.jefe.loseta.aviso · br.jefe.loseta.quema · br.jefe.sostenida ({dur}) · br.jefe.sinaire · br.jefe.pisoton
 *              br.jefe.pregon · br.jefe.herido ({big}) · br.jefe.aturdido · br.jefe.cae · br.jefe.muere (se sienta, ya en paz) · br.cajonero.cae · br.cajonero.golpe
 *   ritmo      br.metronomo ({accent}: el tic del metrónomo visible) · br.atiempo (campanita) · br.contrapunto («¡CONTRAPUNTO!») · br.respuesta (llamada del cajón) · br.destiempo (golpe fuera de tiempo)
 *   premios    br.deseo (chispas del deseo del puente; llama también al jingle de música) · br.dato (dato nuevo de Barranco)
 *   bucles     br.olas ({intensity 0..1.3}: oleaje de canto rodado) · br.grillos ({intensity}: grillos del parque al anochecer)
 *   los sistemas del juego (jaranon.js, objetos.js…): br.cajon ({atiempo}) · br.cajon.alza · br.cajon.roto · br.botella.tiro ({charge, dorada}) · br.aplausos ({n}) · br.mesa.rompe · br.caja.rompe · br.pena.focos · br.porton.abre / .cierra
 *              br.jefe.voz ({text}) · br.jefe.grito · br.jefe.sienta · br.jefe.resbala · br.jefe.duele ({aTiempo}) · br.jefe.loseta (= quema) · br.jaranero.llega · br.cajonero.duele · br.metronomo.responde (= br.respuesta)
 *   alias      br.cajon.hit = br.cajon.golpe · br.botella.break = br.botella.rompe · br.jefe.hurt = br.jefe.herido · br.jefe.stomp = br.jefe.pisoton · br.jefe.zapateo = br.jefe.pisoton · br.tiempo = br.atiempo
 *
 * BUCLES (ACH.audio.loop(name, data) -> {move(x,y[,patch]), set(patch), touch(), stop()}; se apagan solos a los 4 s sin move/set/touch; data.ttl = 0: nunca)
 *
 * DIRECTOR DE AMBIENTE (ACH.audio.br.amb): si ACH.nivel.id === 'barranco', cada 250 ms (solo con el juego en 'playing' y el audio desbloqueado)
 *   · mantiene el oleaje (br.olas) según la zona (ACH.audio.br.zone()): fuerte en la playa, lejano en la bajada y la Ermita, nada en las calles bohemias
 *   · grito de gaviota cada 8–18 s en la playa, la bajada, el puente y la Ermita (no de noche cerrada: cuando setNight está activo) · grillos en el parque y la Ermita al anochecer
 *   ACH.audio.br.amb.enabled = false / start() / stop() / setBed(k) (multiplicador 0..2 del oleaje) / state().
 */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var A = ACH.audio = ACH.audio || {};
  A.lib = A.lib || {};
  A.recipes = A.recipes || {};
  var R = A.recipes, L0 = A.lib;
  if (!L0.bus) return;                     // sfx.js no cargó: nada que registrar

  var rnd = Math.random;
  function rr(a, b) { return a + (b - a) * rnd(); }
  function vary(v, p) { return v * (1 + (rnd() * 2 - 1) * p); }
  function pick(a) { return a[Math.floor(rnd() * a.length) % a.length]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function boost(d) { return typeof d.boost === 'number' ? clamp(d.boost, 1, 10) : 1; }
  function num(v, def) { return typeof v === 'number' && isFinite(v) ? v : def; }
  function def(name, fn, o) { fn.cooldown = o.cd == null ? 0.05 : o.cd; fn.dur = o.dur || 1; if (o.prio) fn.priority = o.prio; if (o.wet != null) fn.wet = o.wet; if (o.loop) fn.loop = true; R[name] = fn; }
  function mix(d, e) { var o = {}, k; for (k in d) o[k] = d[k]; for (k in e) o[k] = e[k]; return o; }
  function F(f) { return clamp(f, 25, 18000); }          // las frecuencias de los osciladores y filtros siempre entre 25 Hz y 18 kHz
  function T0(ctx, d, ahead) { return ctx.currentTime + (ahead == null ? 0.004 : ahead) + num(d.delay, 0); }

  // ---- piezas compartidas ----
  // golpe de madera: tono que cae + modos de tabla + clic
  function wood(ctx, o, t, f, g, L) {
    L.tone(ctx, o, t, { f0: f * 1.3, f1: f * 0.7, d: 0.06, gain: g * 0.8 });
    L.modal(ctx, o, t, { freqs: [f, f * 2.3, f * 4.1], decays: [0.07, 0.04, 0.02], gains: [g * 0.6, g * 0.3, g * 0.15], a: 0.0006 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: f * 6, q: 1.5, d: 0.012, gain: g * 0.5 });
  }
  // palmada de cajón: golpe agudo con los bordones
  function slap(ctx, o, t, g, L, bright) {
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(1900, 0.06) * (bright || 1), q: 0.8, a: 0.0006, d: 0.05, gain: 0.7 * g });
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 4200, a: 0.0008, d: 0.09, gain: 0.3 * g });                           // los bordones (cuerdas de la caja) zumban
    L.tone(ctx, o, t, { f0: 330, f1: 290, sweep: 0.04, d: 0.05, gain: 0.45 * g });
    L.tone(ctx, o, t, { f0: 150, f1: 130, sweep: 0.06, d: 0.07, gain: 0.3 * g });
  }
  // golpe grave de cajón (al centro): caja de madera que retumba
  function cajBass(ctx, o, t, g, L) {
    L.tone(ctx, o, t, { f0: 92, f1: 56, sweep: 0.1, d: 0.2, gain: 0.95 * g });
    L.noiseHit(ctx, o, t, { type: 'lowpass', f: 700, a: 0.001, d: 0.05, gain: 0.45 * g });
    L.modal(ctx, o, t, { freqs: [100, 190, 310], decays: [0.14, 0.08, 0.05], gains: [0.3 * g, 0.2 * g, 0.12 * g], a: 0.001 });
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 4200, a: 0.001, d: 0.06, gain: 0.1 * g });
  }
  // esquirla de vidrio y lluvia de vidrio
  function shard(ctx, o, t, f, g, L, dc) {
    dc = dc || rr(0.05, 0.16);
    L.modal(ctx, o, t, { freqs: [f, f * 2.32, f * 3.9], decays: [dc, dc * 0.55, dc * 0.3], gains: [g, g * 0.45, g * 0.25], a: 0.0006 });
  }
  function tinkles(ctx, o, t, n, span, g, fLo, fHi, L) {
    for (var i = 0; i < n; i++) { var u = Math.pow(rnd(), 1.5); shard(ctx, o, t + span * u, rr(fLo, fHi), g * (1 - 0.7 * u) * rr(0.5, 1), L); }
  }
  // voz de zombi: fuente glotal + formantes. dur, f0 [[u,f]...], vowels, rasp...
  function zv(ctx, o, L, t, f0, vowels, dur, x) {
    x = x || {};
    return L.voice(ctx, o, t, { dur: dur, f0: f0, vowels: vowels, amp: x.amp || [[0, 0], [0.1, 1], [0.7, 0.8], [1, 0]], fscale: x.fs || 1, bw: x.bw || 1.2, breath: x.breath == null ? 0.2 : x.breath,
      rasp: x.rasp == null ? 0.25 : x.rasp, raspHz: x.raspHz || 38, vib: x.vib || 0, vibHz: x.vibHz || 5.5, jitter: x.jitter == null ? 0.03 : x.jitter, gain: x.gain || 1.4, drive: x.drive });
  }

  /* ============================================== AMBIENTE ============================================== */
  // grito de gaviota (propio, para que Barranco no dependa de sfx-cv)
  def('br.gaviota', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.6 * boost(d)), n = 2 + ((rnd() * 2) | 0), i, tt = t, p = vary(1, 0.08);
    for (i = 0; i < n; i++) {
      var du = i === 0 ? vary(0.7, 0.15) : vary(0.32, 0.2);
      L.voice(ctx, o, tt, { dur: du, f0: [[0, 1150 * p], [0.18, 2000 * p], [0.55, 1650 * p], [1, 1000 * p]], vowels: [[0, 'i'], [0.3, 'ae'], [0.7, 'a'], [1, 'e']], amp: [[0, 0], [0.1, 1], [0.6, 0.8], [1, 0]],
        fscale: 1.4, bw: 1.2, breath: 0.2, rasp: 0.3, raspHz: 55, vib: 0.02, vibHz: 9, jitter: 0.03, gain: 1.4 });
      tt += du + vary(0.1, 0.4);
    }
    return (tt - t) + 0.4;
  }, { cd: 2, dur: 2.2, prio: 2, wet: 0.3 });

  // paso en piedra (escalón de la Bajada de Baños): tac seco de suela sobre piedra con un grano de arena
  def('br.escalon', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.002), o = L.bus(ctx, out, 0.42), k = 0.8 + 0.4 * ((num(d.n, rnd() * 4) | 0) % 3) / 2;
    L.tone(ctx, o, t, { f0: vary(190, 0.1) * k, f1: 95, sweep: 0.04, d: 0.06, gain: 0.55 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(1800, 0.15) * k, q: 1.1, a: 0.0006, d: 0.03, gain: 0.5 });
    L.modal(ctx, o, t, { freqs: [vary(760, 0.05) * k, vary(1450, 0.05) * k], decays: [0.04, 0.025], gains: [0.18, 0.1], a: 0.0006 });
    L.noiseHit(ctx, o, t + 0.012, { type: 'highpass', f: 4000, a: 0.0006, d: 0.02, gain: 0.12 });                       // grava suelta
    return 0.2;
  }, { cd: 0.09, dur: 0.25, prio: 1, wet: 0.1 });

  // paso en tabla del puente: madera hueca que cruje
  def('br.puente.paso', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.002), o = L.bus(ctx, out, 0.45);
    wood(ctx, o, t, vary(210, 0.1), 0.7, L);
    L.tone(ctx, o, t, { f0: 110, f1: 62, sweep: 0.08, d: 0.12, gain: 0.35 });
    if (rnd() < 0.35) L.noiseHit(ctx, o, t + 0.03, { type: 'bandpass', f: vary(900, 0.2), f1: vary(500, 0.2), q: 6, a: 0.01, d: 0.12, sweep: 0.12, gain: 0.12 });         // un crujido
    return 0.3;
  }, { cd: 0.1, dur: 0.35, prio: 1, wet: 0.1 });

  // al entrar al puente de madera: crujido largo de tablones viejos
  def('br.puente.crujido', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.5), D = 0.7, os = ctx.createOscillator(), bp = L.filter(ctx, 'bandpass', 400, 5), g = ctx.createGain(), am = ctx.createOscillator(), ag = ctx.createGain();
    os.type = 'sawtooth'; os.frequency.setValueAtTime(F(vary(150, 0.1)), t); os.frequency.linearRampToValueAtTime(F(vary(115, 0.1)), t + D);
    bp.frequency.setValueAtTime(350, t); bp.frequency.exponentialRampToValueAtTime(900, t + D * 0.6); bp.frequency.exponentialRampToValueAtTime(500, t + D);
    am.frequency.value = 23; ag.gain.value = 0.4; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.08); g.gain.setTargetAtTime(0, t + D * 0.6, 0.1);
    am.connect(ag); ag.connect(g.gain); os.connect(bp); bp.connect(g); g.connect(o); os.start(t); am.start(t); os.stop(t + D + 0.3); am.stop(t + D + 0.3);
    wood(ctx, o, t, 190, 0.5, L);
    return D + 0.3;
  }, { cd: 0.8, dur: 1.1, prio: 2, wet: 0.2 });

  // portón de la peña: bisagras largas que chillan y golpe de madera pesada
  def('br.porton', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.6), D = 1.1, os = ctx.createOscillator(), bp = L.filter(ctx, 'bandpass', 700, 7), g = ctx.createGain();
    os.type = 'sawtooth'; os.frequency.setValueAtTime(F(310), t); os.frequency.linearRampToValueAtTime(F(520), t + D * 0.5); os.frequency.linearRampToValueAtTime(F(430), t + D);
    bp.frequency.setValueAtTime(800, t); bp.frequency.linearRampToValueAtTime(1500, t + D * 0.5); bp.frequency.linearRampToValueAtTime(1000, t + D);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.15); g.gain.setTargetAtTime(0, t + D * 0.8, 0.1);
    os.connect(bp); bp.connect(g); g.connect(o); os.start(t); os.stop(t + D + 0.3);
    L.tone(ctx, o, t + D, { f0: 80, f1: 40, sweep: 0.25, d: 0.4, gain: 0.9 }); L.noiseHit(ctx, o, t + D, { type: 'lowpass', f: 600, a: 0.002, d: 0.2, gain: 0.6 }); wood(ctx, o, t + D, 140, 0.8, L);
    return D + 0.6;
  }, { cd: 1.5, dur: 1.8, prio: 3, wet: 0.3 });

  /* ============================================== CAJÓN PERUANO ============================================== */
  def('br.cajon.golpe', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.003), o = L.bus(ctx, out, 0.9 * boost(d)), up = (d.tiempo || d.atiempo) ? 1.25 : 1;
    cajBass(ctx, o, t, 1, L); slap(ctx, o, t + 0.004, 0.45, L, up);
    return 0.4;
  }, { cd: 0.05, dur: 0.45, prio: 4, wet: 0.14 });

  // la onda de sonido: un «bum» grave que se abre como un anillo (ruido filtrado que se aleja) y resonancia de madera
  def('br.cajon.onda', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.85 * boost(d)), big = (d.tiempo || d.atiempo) ? 1.3 : 1, rk = clamp(num(d.r, 56) / 56, 0.7, 1.6);
    L.tone(ctx, o, t, { f0: 85 * big, f1: 34, sweep: 0.35, a: 0.003, d: 0.5, gain: 1.0 });
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 2600 * big, f1: 280, q: 0.9, a: 0.01, d: 0.3 * rk, sweep: 0.3 * rk, gain: 0.55 });                // el anillo que se abre
    L.noiseHit(ctx, o, t, { type: 'lowpass', f: 900, a: 0.001, d: 0.08, gain: 0.5 });
    L.modal(ctx, o, t, { freqs: [vary(196, 0.02), vary(392, 0.02), vary(588, 0.02)], decays: [0.3, 0.2, 0.12], gains: [0.3, 0.2, 0.1], a: 0.002 });
    slap(ctx, o, t, 0.35, L, big);
    return 0.8;
  }, { cd: 0.1, dur: 0.9, prio: 5, wet: 0.22 });

  // «¡A TIEMPO!»: campanita dorada y golpe seco
  def('br.cajon.atiempo', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.6);
    L.bell(ctx, o, t, { f: 2640, gain: 0.5, decay: 0.7 }); L.bell(ctx, o, t + 0.045, { f: 3960, gain: 0.35, decay: 0.55 });
    slap(ctx, o, t, 0.4, L, 1.2);
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 7000, a: 0.001, d: 0.3, gain: 0.12 });
    return 0.9;
  }, { cd: 0.08, dur: 1.0, prio: 5, wet: 0.2 });

  def('br.cajon.rompe', function (ctx, out, d, L) {                                              // la onda quiebra un prop liviano: crujido de madera y astillas
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.6), i;
    wood(ctx, o, t, 240, 0.7, L); L.noiseHit(ctx, o, t, { type: 'highpass', f: 1800, a: 0.001, d: 0.1, gain: 0.5 });
    for (i = 0; i < 5; i++) wood(ctx, o, t + 0.03 + i * rr(0.025, 0.06), rr(300, 800), 0.2, L);
    return 0.5;
  }, { cd: 0.08, dur: 0.6, prio: 3, wet: 0.12 });

  /* ============================================== BOTELLAS ============================================== */
  def('br.botella.lanza', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), k = clamp(num(d.charge, 0), 0, 1), o = L.bus(ctx, out, 0.5 + 0.2 * k);
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 700 + 400 * k, f1: 2100 + 600 * k, q: 0.9, a: 0.03, d: 0.18, sweep: 0.18, gain: 0.5 });
    L.modal(ctx, o, t, { freqs: [vary(2250, 0.03), vary(5200, 0.03)], decays: [0.09, 0.05], gains: [0.12, 0.05], a: 0.0006 });                           // el pico de la botella
    L.tone(ctx, o, t, { f0: 300, f1: 190, sweep: 0.08, d: 0.08, gain: 0.25 });
    return 0.4;
  }, { cd: 0.1, dur: 0.45, prio: 3, wet: 0.1 });

  def('br.botella.rompe', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.003), o = L.bus(ctx, out, 0.75 * boost(d)), gold = !!(d.gold || d.dorada), k = gold ? 1.25 : 1;
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 2400, a: 0.0005, d: 0.13, gain: 0.9 });
    L.tone(ctx, o, t, { f0: 420, f1: 150, sweep: 0.05, d: 0.09, gain: 0.5 });
    L.modal(ctx, o, t, { freqs: [vary(1800, 0.05) * k, vary(2900, 0.05) * k, vary(4600, 0.05) * k], decays: [0.18, 0.12, 0.08], gains: [0.3, 0.22, 0.14], a: 0.0005 });
    tinkles(ctx, o, t + 0.03, gold ? 20 : 14, 0.5, 0.3, 2200 * k, 7500 * k, L);
    if (gold) { L.bell(ctx, o, t + 0.02, { f: 3300, gain: 0.35, decay: 0.8 }); L.noiseHit(ctx, o, t + 0.04, { type: 'highpass', f: 6500, a: 0.01, d: 0.45, gain: 0.15 }); }
    return 0.9;
  }, { cd: 0.05, dur: 1.0, prio: 5, wet: 0.2 });

  def('br.botella.vidrios', function (ctx, out, d, L) {                                                // los pedazos que terminan de caer
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.35);
    tinkles(ctx, o, t, 9, 0.7, 0.22, 2400, 7000, L);
    return 0.9;
  }, { cd: 0.2, dur: 1, prio: 2, wet: 0.2 });

  // se forma el charco: chapoteo, gotas y un siseo que se extiende
  def('br.charco', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.5), i;
    L.noiseHit(ctx, o, t, { type: 'lowpass', f: vary(1500, 0.1), q: 0.8, a: 0.002, d: 0.14, gain: 0.7 });
    L.noiseHit(ctx, o, t + 0.04, { kind: 'pink', type: 'bandpass', f: 1200, f1: 2600, q: 0.7, a: 0.06, d: 0.35, sweep: 0.35, gain: 0.22 });
    for (i = 0; i < 4; i++) L.tone(ctx, o, t + 0.06 + i * rr(0.04, 0.1), { f0: rr(500, 900), f1: rr(1100, 1700), sweep: 0.04, a: 0.002, d: 0.05, gain: 0.13 });
    return 0.8;
  }, { cd: 0.12, dur: 0.9, prio: 3, wet: 0.15 });

  // resbalón: chirrido que sube y baja (como un silbato de resbaladilla) y la suela que patina
  def('br.resbalon', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, d.player ? 0.4 : 0.55), D = d.player ? 0.32 : 0.45, os = ctx.createOscillator(), g = ctx.createGain(), lf = ctx.createOscillator(), lg = ctx.createGain();
    os.type = 'triangle'; os.frequency.setValueAtTime(F(rr(700, 900)), t); os.frequency.exponentialRampToValueAtTime(F(rr(1500, 1900)), t + D * 0.45); os.frequency.exponentialRampToValueAtTime(F(300), t + D);
    lf.frequency.value = 14; lg.gain.value = 40; lf.connect(lg); lg.connect(os.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.28, t + 0.04); g.gain.setTargetAtTime(0, t + D * 0.6, 0.08);
    os.connect(g); g.connect(o); os.start(t); lf.start(t); os.stop(t + D + 0.2); lf.stop(t + D + 0.2);
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 2500, f1: 1100, q: 2.2, a: 0.01, d: D * 0.8, sweep: D * 0.8, gain: 0.35 });                                  // la suela patina
    return D + 0.25;
  }, { cd: 0.15, dur: 0.8, prio: 4, wet: 0.12 });

  // caída de cuerpo al piso (aturdido): golpe sordo, ropa y un «uf»
  def('br.caida', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.7 * boost(d));
    L.tone(ctx, o, t, { f0: 130, f1: 44, sweep: 0.12, d: 0.22, gain: 0.95 });
    L.noiseHit(ctx, o, t, { type: 'lowpass', f: 700, a: 0.001, d: 0.12, gain: 0.7 });
    L.noiseHit(ctx, o, t + 0.02, { kind: 'pink', type: 'bandpass', f: 1500, q: 0.6, a: 0.01, d: 0.12, gain: 0.25 });
    zv(ctx, o, L, t + 0.03, [[0, 200], [0.5, 150], [1, 110]], [[0, 'o'], [1, 'uh']], 0.18, { gain: 1.1, rasp: 0.3, breath: 0.4 });
    return 0.5;
  }, { cd: 0.1, dur: 0.6, prio: 4, wet: 0.15 });

  /* ============================================== POETA, PINTOR, MÚSICO ============================================== */
  // zombi poeta declamando bajito: balbuceo de sílabas lentas
  def('br.poeta.murmullo', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.45 * boost(d)), vs = ['o', 'a', 'u', 'e', 'o'], i, tt = t, f = vary(125, 0.15);
    for (i = 0; i < 5; i++) { var du = vary(0.16, 0.25); zv(ctx, o, L, tt, [[0, f * 1.1], [1, f * (0.9 + 0.15 * (i % 2))]], [[0, vs[i]], [1, vs[(i + 1) % 5]]], du, { gain: 1.1, rasp: 0.3, breath: 0.3 }); tt += du + vary(0.05, 0.4); }
    return (tt - t) + 0.2;
  }, { cd: 0.5, dur: 1.4, prio: 2, wet: 0.2 });

  // el verso largo: sube, se sostiene, «¡oh, luna!» y se apaga arrastrando
  def('br.poeta.declama', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.6 * boost(d)), f = vary(135, 0.1);
    zv(ctx, o, L, t, [[0, f], [0.3, f * 1.3], [0.7, f * 1.25], [1, f * 0.85]], [[0, 'o'], [0.4, 'a'], [0.8, 'o'], [1, 'u']], 1.3, { gain: 1.6, rasp: 0.3, vib: 0.02, breath: 0.25 });
    zv(ctx, o, L, t + 0.02, [[0, f * 0.5], [1, f * 0.45]], [[0, 'o'], [1, 'o']], 1.2, { gain: 0.8, rasp: 0.4 });
    return 1.7;
  }, { cd: 1.2, dur: 1.8, prio: 3, wet: 0.25 });

  // letras flotantes: lanzamiento aéreo (pff), golpe pegajoso (te ralentiza) y se rompen (papel y campanita)
  def('br.letra.lanza', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.35);
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 1800, f1: 900, q: 1, a: 0.03, d: 0.15, sweep: 0.15, gain: 0.35 });
    L.tone(ctx, o, t, { type: 'triangle', f0: rr(500, 700), f1: rr(700, 900), sweep: 0.1, d: 0.1, gain: 0.1 });
    return 0.3;
  }, { cd: 0.08, dur: 0.35, prio: 2, wet: 0.12 });
  def('br.letra.golpe', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.55), os = ctx.createOscillator(), g = ctx.createGain(), lf = ctx.createOscillator(), lg = ctx.createGain();
    os.type = 'sine'; os.frequency.setValueAtTime(F(820), t); os.frequency.exponentialRampToValueAtTime(F(210), t + 0.5);
    lf.frequency.value = 9; lg.gain.value = 60; lf.connect(lg); lg.connect(os.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.4, t + 0.02); g.gain.setTargetAtTime(0, t + 0.2, 0.12);
    os.connect(g); g.connect(o); os.start(t); lf.start(t); os.stop(t + 0.7); lf.stop(t + 0.7);                                                       // «bluuuum» pegajoso y lento
    L.noiseHit(ctx, o, t, { type: 'lowpass', f: 900, a: 0.002, d: 0.08, gain: 0.4 });
    return 0.7;
  }, { cd: 0.2, dur: 0.8, prio: 4, wet: 0.12 });
  def('br.letra.rompe', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.003), o = L.bus(ctx, out, 0.45), i;
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 3000, q: 0.7, a: 0.001, d: 0.05, gain: 0.5 });
    for (i = 0; i < 4; i++) L.noiseHit(ctx, o, t + i * rr(0.01, 0.03), { type: 'highpass', f: 4500, a: 0.0005, d: 0.01, gain: 0.2 });
    L.bell(ctx, o, t + 0.01, { f: vary(2900, 0.1), gain: 0.25, decay: 0.3 });
    return 0.4;
  }, { cd: 0.05, dur: 0.45, prio: 3, wet: 0.14 });

  // pintor: brochazo (aviso: silbido húmedo), splat contra el piso o contra Alexander, mancha que queda, caballete que se rompe
  def('br.brochazo.lanza', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.5);
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 500, f1: 1800, q: 0.9, a: 0.05, d: 0.25, sweep: 0.25, gain: 0.45 });
    L.tone(ctx, o, t, { f0: 260, f1: 170, sweep: 0.15, d: 0.15, gain: 0.2 });
    return 0.45;
  }, { cd: 0.15, dur: 0.5, prio: 3, wet: 0.1 });
  def('br.brochazo.splat', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.003), o = L.bus(ctx, out, d.hit ? 0.75 : 0.55), i;
    L.noiseHit(ctx, o, t, { type: 'lowpass', f: vary(1200, 0.1), q: 0.8, a: 0.001, d: 0.09, gain: 0.8 });
    L.tone(ctx, o, t, { f0: 260, f1: 70, sweep: 0.1, d: 0.13, gain: 0.5 });
    L.noiseHit(ctx, o, t + 0.02, { type: 'bandpass', f: 1900, f1: 600, q: 3, a: 0.003, d: 0.16, sweep: 0.15, gain: 0.35 });                                 // chorreo
    for (i = 0; i < 3; i++) L.tone(ctx, o, t + 0.07 + i * rr(0.04, 0.09), { f0: rr(500, 800), f1: rr(900, 1500), sweep: 0.04, a: 0.002, d: 0.04, gain: 0.12 });
    return 0.5;
  }, { cd: 0.06, dur: 0.6, prio: 4, wet: 0.12 });
  def('br.mancha', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.4);
    L.noiseHit(ctx, o, t, { type: 'lowpass', f: 900, a: 0.002, d: 0.1, gain: 0.55 }); L.tone(ctx, o, t, { f0: 180, f1: 60, sweep: 0.1, d: 0.12, gain: 0.4 });
    return 0.25;
  }, { cd: 0.1, dur: 0.3, prio: 2, wet: 0.1 });
  def('br.caballete.rompe', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.003), o = L.bus(ctx, out, 0.65), i;
    wood(ctx, o, t, 280, 0.8, L); L.noiseHit(ctx, o, t, { type: 'highpass', f: 2200, a: 0.001, d: 0.08, gain: 0.35 });
    for (i = 0; i < 4; i++) wood(ctx, o, t + 0.05 + i * rr(0.04, 0.08), rr(400, 900), 0.22, L);
    L.noiseHit(ctx, o, t + 0.1, { type: 'bandpass', f: 1600, q: 1, a: 0.01, d: 0.12, gain: 0.15 });                                                       // la tela de la tela
    return 0.6;
  }, { cd: 0.08, dur: 0.7, prio: 3, wet: 0.14 });

  // músico callejero zombi: tres instrumentos desafinados. n = 0..4 (notas de una pentatónica de La menor)
  var PENTA = [440, 523.25, 587.33, 659.25, 783.99];
  function zampona(ctx, o, t, f, dur, L) {                                        // flauta de pan: seno con soplo de caña, un poco floja
    var os = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), vb = ctx.createOscillator(), vg = ctx.createGain(), bp = L.filter(ctx, 'bandpass', F(f * 2), 9), ng = ctx.createGain(), ns = L.noiseSrc(ctx, 'white', t, dur + 0.1);
    os.type = 'sine'; os.frequency.setValueAtTime(F(f * 0.97), t); os.frequency.linearRampToValueAtTime(F(f * 1.0), t + 0.12); o2.type = 'triangle'; o2.frequency.value = F(f * 2.01);
    vb.frequency.value = 5.2; vg.gain.value = f * 0.012; vb.connect(vg); vg.connect(os.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.05); g.gain.setTargetAtTime(0, t + dur, 0.08);
    ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(0.5, t + 0.03); ng.gain.setTargetAtTime(0.14, t + 0.1, 0.1); ng.gain.setTargetAtTime(0, t + dur, 0.06);
    var og2 = ctx.createGain(); og2.gain.value = 0.12; os.connect(g); o2.connect(og2); og2.connect(g); ns.connect(bp); bp.connect(ng); ng.connect(g); g.connect(o);
    os.start(t); o2.start(t); vb.start(t); os.stop(t + dur + 0.4); o2.stop(t + dur + 0.4); vb.stop(t + dur + 0.4);
  }
  def('br.musico.nota', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.5 * boost(d)), kind = String(d.kind || 'zampona'), f = PENTA[((num(d.n, (rnd() * 5) | 0)) | 0) % 5 + (num(d.n, 0) < 0 ? 5 : 0)] * (kind === 'guitarra' ? 0.5 : 1);
    if (kind === 'guitarra') {
      L.pluck(ctx, L.bodyResonance(ctx, o, { wet: 0.8 }), f * vary(1, 0.012), t, { vel: 0.7, decay: 0.7, bright: 0.55, pick: 0.75, bend: 1.035, bendT: 0.12, dur: 0.9 });
      L.pluck(ctx, L.bodyResonance(ctx, o, { wet: 0.8 }), f * 1.498, t + 0.01, { vel: 0.35, decay: 0.6, bright: 0.5, pick: 0.75, dur: 0.8 });
      return 1.0;
    }
    if (kind === 'cajon') { cajBass(ctx, o, t, 0.7, L); slap(ctx, o, t + 0.16, 0.5, L); return 0.5; }
    zampona(ctx, o, t, f, vary(0.38, 0.2), L);
    return 0.9;
  }, { cd: 0.15, dur: 1.0, prio: 2, wet: 0.25 });
  function alias(name, target, mapper) {
    def(name, function (ctx, out, d, L) { d = d || {}; return R[target](ctx, out, mapper ? mix(d, mapper(d)) : d, L || L0); }, { cd: R[target].cooldown, dur: R[target].dur, prio: R[target].priority, wet: R[target].wet });
  }
  alias('br.musico.zampona', 'br.musico.nota', function () { return { kind: 'zampona' }; });
  alias('br.musico.guitarra', 'br.musico.nota', function () { return { kind: 'guitarra' }; });
  alias('br.musico.cajon', 'br.musico.nota', function () { return { kind: 'cajon' }; });

  /* ============================================== PAREJAS DE ENAMORADOS ============================================== */
  def('br.pareja.suspiro', function (ctx, out, d, L) {                                       // «aaah…»: aire con voz que cae
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.5 * boost(d)), f = rnd() < 0.5 ? vary(190, 0.1) : vary(300, 0.1);
    zv(ctx, o, L, t, [[0, f * 1.1], [0.4, f * 1.0], [1, f * 0.8]], [[0, 'a'], [0.6, 'o'], [1, 'u']], 0.9, { gain: 1.1, breath: 0.7, rasp: 0.15, amp: [[0, 0], [0.3, 1], [0.7, 0.6], [1, 0]], vib: 0.012 });
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 1800, q: 0.6, a: 0.25, d: 0.5, gain: 0.12 });
    return 1.1;
  }, { cd: 0.6, dur: 1.2, prio: 2, wet: 0.25 });
  def('br.pareja.beso', function (ctx, out, d, L) {                                          // beso tronado: chasquido de labios que sube
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.55);
    L.tone(ctx, o, t, { f0: 500, f1: 1400, sweep: 0.05, a: 0.002, d: 0.06, gain: 0.35 });
    L.tone(ctx, o, t + 0.07, { f0: 1500, f1: 420, sweep: 0.04, a: 0.001, d: 0.05, gain: 0.4 });
    L.noiseHit(ctx, o, t + 0.07, { type: 'bandpass', f: 2200, q: 1.5, a: 0.0008, d: 0.03, gain: 0.45 });
    return 0.3;
  }, { cd: 0.2, dur: 0.35, prio: 3, wet: 0.15 });
  def('br.pareja.despechado', function (ctx, out, d, L) {                                    // «¡¿Por quéee?!»: alarido de dolor de amor, con vibrato y aspereza
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.75 * boost(d)), f = vary(rnd() < 0.5 ? 250 : 380, 0.06);
    zv(ctx, o, L, t, [[0, f], [0.15, f * 2.0], [0.6, f * 1.7], [1, f * 0.8]], [[0, 'o'], [0.25, 'e'], [0.6, 'a'], [1, 'o']], 1.3, { gain: 1.9, rasp: 0.5, raspHz: 42, vib: 0.035, vibHz: 6.5, breath: 0.35, drive: 0.35, amp: [[0, 0], [0.08, 1], [0.7, 0.9], [1, 0]] });
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 3500, a: 0.01, d: 0.3, gain: 0.12 });
    return 1.6;
  }, { cd: 1, dur: 1.8, prio: 5, wet: 0.25 });
  def('br.pareja.llanto', function (ctx, out, d, L) {                                         // sollozos: tres «hu, hu, hu» que van cayendo
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.5), i, tt = t, f = vary(330, 0.08);
    for (i = 0; i < 4; i++) { var du = vary(0.2, 0.2); zv(ctx, o, L, tt, [[0, f * (1.2 - 0.1 * i)], [1, f * (0.85 - 0.08 * i)]], [[0, 'u'], [1, 'o']], du, { gain: 1.2, breath: 0.5, rasp: 0.2, vib: 0.03, vibHz: 8 }); tt += du + vary(0.09, 0.3); }
    return (tt - t) + 0.2;
  }, { cd: 0.8, dur: 1.5, prio: 3, wet: 0.2 });

  /* ============================================== JARANERO / PEÑA ============================================== */
  // zapateo: taconeo rápido sobre tabla (n golpes, alternando tacón y punta)
  def('br.zapateo', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.003), o = L.bus(ctx, out, 0.5 * boost(d)), n = clamp(num(d.n, 4) | 0, 1, 12), i, tt = t;
    for (i = 0; i < n; i++) { wood(ctx, o, tt, i % 2 ? 330 : 220, i % 2 ? 0.45 : 0.7, L); L.noiseHit(ctx, o, tt, { type: 'highpass', f: 3500, a: 0.0005, d: 0.012, gain: 0.18 }); tt += vary(i % 3 === 2 ? 0.07 : 0.11, 0.1); }
    return (tt - t) + 0.15;
  }, { cd: 0.12, dur: 0.9, prio: 3, wet: 0.14 });
  def('br.zapateo.empuja', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.003), o = L.bus(ctx, out, 0.75 * boost(d));
    L.tone(ctx, o, t, { f0: 105, f1: 42, sweep: 0.2, d: 0.28, gain: 0.95 });
    L.noiseHit(ctx, o, t, { type: 'lowpass', f: 800, a: 0.001, d: 0.12, gain: 0.7 });
    wood(ctx, o, t, 170, 0.8, L);
    L.noiseHit(ctx, o, t + 0.02, { kind: 'pink', type: 'bandpass', f: 1800, f1: 300, q: 0.8, a: 0.01, d: 0.25, sweep: 0.25, gain: 0.3 });               // la onda sale
    return 0.55;
  }, { cd: 0.15, dur: 0.6, prio: 4, wet: 0.2 });

  // aplausos de peña: muchas palmas sueltas que se espesan y se apagan. size 0.4..1.6 → duración y densidad
  def('br.pena.aplausos', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.005), o = L.bus(ctx, out, 0.45 * boost(d)), sz = clamp(num(d.size, 1), 0.4, 1.6), D = 1.4 * sz + 0.4, n = Math.floor(40 * sz + 10), i, g = ctx.createGain(), ns = L.noiseSrc(ctx, 'pink', t, D + 0.1), bp = L.filter(ctx, 'bandpass', 2100, 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.35, t + D * 0.25); g.gain.setTargetAtTime(0, t + D * 0.55, D * 0.18);
    ns.connect(bp); bp.connect(g); g.connect(o);                                                                                                           // el colchón
    for (i = 0; i < n; i++) {
      var u = Math.pow(rnd(), 1.4), tt = t + 0.03 + (D - 0.2) * u, w = Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.05));
      L.noiseHit(ctx, o, tt, { type: 'bandpass', f: rr(1200, 3200), q: rr(0.6, 1.4), a: 0.0006, d: rr(0.012, 0.03), gain: (0.3 + 0.7 * rnd()) * (0.4 + 0.6 * w) * 0.55 });
    }
    return D + 0.3;
  }, { cd: 0.5, dur: 2.2, prio: 3, wet: 0.3 });
  // «¡eso!»: tres o cuatro voces de hombre que gritan a la vez
  def('br.pena.eso', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.5 * boost(d)), i, n = 3 + ((rnd() * 2) | 0);
    for (i = 0; i < n; i++) { var f = rr(120, 190), tt = t + rr(0, 0.07); zv(ctx, o, L, tt, [[0, f * 1.1], [0.35, f * 1.5], [1, f * 1.25]], [[0, 'e'], [0.4, 'e'], [0.55, 'o'], [1, 'o']], vary(0.45, 0.2), { gain: 1.3, rasp: 0.2, breath: 0.25, amp: [[0, 0], [0.1, 1], [0.4, 1], [0.6, 0.85], [1, 0]] }); }
    return 0.7;
  }, { cd: 0.6, dur: 0.9, prio: 3, wet: 0.3 });
  // risas: cuatro voces con «ja ja ja» que se aflojan
  def('br.pena.risas', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.4 * boost(d)), v, i;
    for (v = 0; v < 3; v++) {
      var f = rr(130, 330), tv = t + rr(0, 0.25), tt = tv, k = 4 + ((rnd() * 3) | 0);
      for (i = 0; i < k; i++) { var du = 0.09; zv(ctx, o, L, tt, [[0, f * 1.15 * (1 - 0.03 * i)], [1, f * (1 - 0.03 * i)]], [[0, 'a'], [1, 'ae']], du, { gain: 1.2 * (1 - 0.08 * i), rasp: 0.1, breath: 0.4, amp: [[0, 0], [0.2, 1], [0.6, 0.7], [1, 0]] }); tt += vary(0.17, 0.15); }
    }
    return 1.6;
  }, { cd: 1, dur: 1.8, prio: 2, wet: 0.3 });
  def('br.pena.brindis', function (ctx, out, d, L) {                                         // copas que chocan y la celebración
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.005), o = L.bus(ctx, out, 0.5);
    L.bell(ctx, o, t, { f: vary(3200, 0.03), gain: 0.5, decay: 0.9 }); L.bell(ctx, o, t + 0.012, { f: vary(3800, 0.03), gain: 0.35, decay: 0.7 });
    shard(ctx, o, t, 5200, 0.15, L, 0.12);
    return 1.1;
  }, { cd: 0.3, dur: 1.2, prio: 2, wet: 0.25 });

  /* ============================================== DON JARANÓN ============================================== */
  // se encienden las luces del tabladillo: relé que cierra, zumbido de focos, acorde de guitarra y aplausos zombies
  def('br.jefe.entra', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.7);
    wood(ctx, o, t, 120, 0.7, L); L.tone(ctx, o, t, { f0: 70, f1: 38, sweep: 0.3, d: 0.4, gain: 0.8 });
    L.noiseHit(ctx, o, t + 0.1, { type: 'bandpass', f: 4000, f1: 9000, q: 6, a: 0.1, d: 0.5, sweep: 0.5, gain: 0.12 });                         // zumbido de focos que suben
    L.strum(ctx, L.bodyResonance(ctx, o, { wet: 0.9 }), L.chord('Em'), t + 0.45, { vel: 0.5, decay: 1.6, bright: 0.55, dur: 2, spread: 0.02 });
    R['br.pena.aplausos'](ctx, out, { size: 1.1, delay: num(d.delay, 0) + 0.7 }, L);
    return 2.8;
  }, { cd: 2, dur: 3.2, prio: 5, wet: 0.3 });

  // nota de vals (proyectil): una nota cantada con vibrato, de tenor cascado. i = 0..2 (sol, si bemol, re)
  var JNOTE = [196, 233.1, 293.7];
  def('br.jefe.nota', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.6 * boost(d)), f = JNOTE[(num(d.i, num(d.n, (rnd() * 3) | 0)) | 0) % 3];
    zv(ctx, o, L, t, [[0, f * 0.97], [0.15, f], [1, f]], [[0, 'o'], [0.4, 'a'], [1, 'o']], 0.5, { gain: 1.7, rasp: 0.2, vib: 0.018, vibHz: 5.5, breath: 0.2, drive: 0.2 });
    L.bell(ctx, o, t, { f: f * 8, gain: 0.12, decay: 0.3 });
    return 0.7;
  }, { cd: 0.12, dur: 0.8, prio: 4, wet: 0.22 });

  // pañuelazo: tela que corta el aire en arco, con un revoloteo
  def('br.jefe.panuelo', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.65 * boost(d)), g = ctx.createGain(), ns = L.noiseSrc(ctx, 'pink', t, 0.7), bp = L.filter(ctx, 'bandpass', 400, 0.8), lf = ctx.createOscillator(), lg = ctx.createGain();
    bp.frequency.setValueAtTime(350, t); bp.frequency.exponentialRampToValueAtTime(1900, t + 0.2); bp.frequency.exponentialRampToValueAtTime(500, t + 0.55);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.9, t + 0.16); g.gain.setTargetAtTime(0, t + 0.28, 0.1);
    lf.frequency.value = 15; lg.gain.value = 0.25; lf.connect(lg); lg.connect(g.gain); lf.start(t); lf.stop(t + 0.8);
    ns.connect(bp); bp.connect(g); g.connect(o);
    L.tone(ctx, o, t, { f0: 150, f1: 60, sweep: 0.4, a: 0.05, d: 0.35, gain: 0.35 });
    return 0.8;
  }, { cd: 0.2, dur: 0.85, prio: 4, wet: 0.15 });

  // losetas de la pista: aviso (tic que sube, brillo) y quema (zumbido eléctrico)
  def('br.jefe.loseta.aviso', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.003), o = L.bus(ctx, out, 0.35);
    L.tone(ctx, o, t, { type: 'triangle', f0: 880, f1: 1500, sweep: 0.08, a: 0.002, d: 0.1, gain: 0.3 }); L.noiseHit(ctx, o, t, { type: 'highpass', f: 5000, a: 0.001, d: 0.05, gain: 0.12 });
    return 0.2;
  }, { cd: 0.04, dur: 0.25, prio: 2, wet: 0.12 });
  def('br.jefe.loseta.quema', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.003), o = L.bus(ctx, out, 0.55 * boost(d)), D = 0.28, os = ctx.createOscillator(), bp = L.filter(ctx, 'bandpass', 1400, 2), g = ctx.createGain(), i;
    os.type = 'sawtooth'; os.frequency.setValueAtTime(F(120), t); os.frequency.exponentialRampToValueAtTime(F(260), t + D);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.45, t + 0.01); g.gain.setTargetAtTime(0, t + D * 0.5, 0.07);
    os.connect(bp); bp.connect(g); g.connect(o); os.start(t); os.stop(t + D + 0.2);
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 3000, a: 0.001, d: 0.2, gain: 0.35 });
    for (i = 0; i < 6; i++) L.noiseHit(ctx, o, t + rr(0, 0.2), { type: 'bandpass', f: rr(3000, 7000), q: 4, a: 0.0004, d: 0.006, gain: 0.25 });                // chispas
    return D + 0.3;
  }, { cd: 0.06, dur: 0.6, prio: 3, wet: 0.14 });

  // nota sostenida: la nota larga de Jaranón (cono de sonido que barre la peña): voz grave con vibrato, aire y un zumbido sub
  def('br.jefe.sostenida', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.7 * boost(d)), D = clamp(num(d.dur, 2.6), 0.8, 8), f = 196;
    zv(ctx, o, L, t, [[0, f * 0.96], [0.12, f], [1, f * 1.01]], [[0, 'o'], [0.3, 'a'], [0.75, 'a'], [1, 'o']], D, { gain: 1.9, rasp: 0.18, vib: 0.025, vibHz: 5.2, breath: 0.2, drive: 0.25, amp: [[0, 0], [0.1, 1], [0.8, 0.95], [1, 0]] });
    zv(ctx, o, L, t + 0.02, [[0, f * 0.5], [1, f * 0.5]], [[0, 'o'], [1, 'o']], D, { gain: 1.0, rasp: 0.3, vib: 0.02, amp: [[0, 0], [0.15, 1], [0.8, 0.9], [1, 0]] });
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 1400, q: 0.7, a: 0.2, d: D, gain: 0.1 });
    return D + 0.3;
  }, { cd: 0.5, dur: 3, prio: 5, wet: 0.25 });

  // se queda sin aire: inhalación con silbido y tos
  def('br.jefe.sinaire', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.6);
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 600, f1: 2800, q: 1.2, a: 0.25, d: 0.45, sweep: 0.6, gain: 0.55 });
    L.tone(ctx, o, t + 0.1, { type: 'triangle', f0: 1500, f1: 2100, sweep: 0.5, a: 0.1, d: 0.5, gain: 0.08 });
    zv(ctx, o, L, t + 0.75, [[0, 150], [1, 100]], [[0, 'a'], [1, 'uh']], 0.18, { gain: 1.3, rasp: 0.6, breath: 0.5 }); zv(ctx, o, L, t + 0.98, [[0, 140], [1, 95]], [[0, 'a'], [1, 'uh']], 0.18, { gain: 1.1, rasp: 0.6, breath: 0.5 });
    return 1.5;
  }, { cd: 1, dur: 1.6, prio: 4, wet: 0.2 });

  // zapatazo grande (zapateo del jefe): tablado que retumba
  def('br.jefe.pisoton', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.003), o = L.bus(ctx, out, 0.9 * boost(d));
    L.tone(ctx, o, t, { f0: 80, f1: 30, sweep: 0.4, a: 0.002, d: 0.55, gain: 1.0 });
    L.noiseHit(ctx, o, t, { type: 'lowpass', f: 700, a: 0.001, d: 0.2, gain: 0.8 });
    wood(ctx, o, t, 150, 1.0, L);
    L.modal(ctx, o, t, { freqs: [120, 235, 410], decays: [0.5, 0.3, 0.2], gains: [0.4, 0.3, 0.2], a: 0.002 });
    L.noiseHit(ctx, o, t + 0.02, { kind: 'pink', type: 'bandpass', f: 1800, f1: 250, q: 0.8, a: 0.01, d: 0.4, sweep: 0.4, gain: 0.35 });
    return 0.9;
  }, { cd: 0.15, dur: 1, prio: 5, wet: 0.25 });

  // pregón: tres notas sostenidas que anuncian el verso («¡a-a-aa!» con aire de pregonero)
  def('br.jefe.pregon', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.7 * boost(d)), notes = [196, 261.6, 233.1], i;
    for (i = 0; i < 3; i++) zv(ctx, o, L, t + i * 0.32, [[0, notes[i] * 0.96], [0.2, notes[i]], [1, notes[i] * (i === 2 ? 0.9 : 1.0)]], [[0, 'a'], [0.6, 'o'], [1, 'o']], i === 2 ? 0.7 : 0.3, { gain: 1.7, rasp: 0.2, vib: 0.02, breath: 0.2, drive: 0.2 });
    return 1.5;
  }, { cd: 1, dur: 1.6, prio: 4, wet: 0.25 });

  def('br.jefe.herido', function (ctx, out, d, L) {                                         // «¡uh!» grave de un gigante
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.65 * boost(d)), big = (d.big || d.aTiempo) ? 1.2 : 1;
    zv(ctx, o, L, t, [[0, 170 * big], [0.3, 140], [1, 85]], [[0, 'a'], [0.4, 'o'], [1, 'o']], 0.4, { gain: 1.9, rasp: 0.45, breath: 0.3, drive: 0.3 });
    L.tone(ctx, o, t, { f0: 90, f1: 50, sweep: 0.12, d: 0.15, gain: 0.4 });
    return 0.6;
  }, { cd: 0.2, dur: 0.7, prio: 4, wet: 0.2 });

  // aturdido: estrellitas de caricatura (tonos que se bambolean) y mareo
  def('br.jefe.aturdido', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.5), i;
    for (i = 0; i < 6; i++) L.tone(ctx, o, t + i * 0.12, { type: 'triangle', f0: i % 2 ? 1100 : 740, f1: i % 2 ? 760 : 1180, sweep: 0.1, a: 0.004, d: 0.12, gain: 0.22 });
    zv(ctx, o, L, t, [[0, 220], [0.5, 150], [1, 190]], [[0, 'o'], [1, 'u']], 0.7, { gain: 0.9, rasp: 0.3, vib: 0.05, vibHz: 4 });
    return 1;
  }, { cd: 0.5, dur: 1.1, prio: 3, wet: 0.2 });

  def('br.jefe.cae', function (ctx, out, d, L) {                                             // resbala y se desploma (gigante)
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.85 * boost(d));
    R['br.resbalon'](ctx, out, { delay: num(d.delay, 0) }, L);
    L.tone(ctx, o, t + 0.4, { f0: 90, f1: 28, sweep: 0.4, d: 0.6, gain: 1.0 }); L.noiseHit(ctx, o, t + 0.4, { type: 'lowpass', f: 600, a: 0.002, d: 0.3, gain: 0.8 });
    wood(ctx, o, t + 0.4, 130, 0.9, L);
    zv(ctx, o, L, t + 0.42, [[0, 150], [1, 70]], [[0, 'a'], [1, 'o']], 0.4, { gain: 1.6, rasp: 0.5, breath: 0.4 });
    return 1.3;
  }, { cd: 1, dur: 1.5, prio: 5, wet: 0.25 });

  // muere en paz: suspiro largo que cae, cuerda que se afloja y el brillo que se apaga
  def('br.jefe.muere', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.7);
    zv(ctx, o, L, t, [[0, 190], [0.3, 175], [1, 90]], [[0, 'a'], [0.5, 'o'], [1, 'u']], 2.2, { gain: 1.5, rasp: 0.25, breath: 0.6, vib: 0.02, amp: [[0, 0], [0.12, 1], [0.6, 0.6], [1, 0]] });
    L.pluck(ctx, L.bodyResonance(ctx, o, { wet: 0.9 }), 82.4, t + 0.5, { vel: 0.7, decay: 2.5, bright: 0.35, pick: 0.75, dur: 2.6 });
    L.pluck(ctx, L.bodyResonance(ctx, o, { wet: 0.9 }), 196, t + 0.8, { vel: 0.45, decay: 2, bright: 0.4, pick: 0.75, dur: 2.4, bend: 0.96, bendT: 1.2 });
    L.tone(ctx, o, t + 1.2, { f0: 120, f1: 40, sweep: 1.2, a: 0.1, d: 1.4, gain: 0.25 });
    L.bell(ctx, o, t + 1.4, { f: 880, gain: 0.18, decay: 1.6 });
    return 3.4;
  }, { cd: 2, dur: 3.6, prio: 5, wet: 0.4 });

  // el cajonero se cae de la silla: cajón y silla de madera por el piso
  def('br.cajonero.cae', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.8 * boost(d)), i;
    wood(ctx, o, t, 200, 0.9, L); cajBass(ctx, o, t + 0.02, 0.6, L); L.tone(ctx, o, t + 0.05, { f0: 110, f1: 40, sweep: 0.3, d: 0.4, gain: 0.7 });
    for (i = 0; i < 5; i++) wood(ctx, o, t + 0.12 + i * rr(0.05, 0.11), rr(250, 700), 0.3 * (1 - 0.15 * i), L);
    zv(ctx, o, L, t + 0.05, [[0, 160], [1, 100]], [[0, 'o'], [1, 'u']], 0.25, { gain: 1.2, rasp: 0.4 });
    return 1.1;
  }, { cd: 1, dur: 1.2, prio: 4, wet: 0.2 });
  def('br.cajonero.golpe', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.003), o = L.bus(ctx, out, 0.7 * boost(d));
    cajBass(ctx, o, t, 0.9, L); slap(ctx, o, t + 0.006, 0.5, L);
    return 0.4;
  }, { cd: 0.1, dur: 0.45, prio: 3, wet: 0.15 });

  /* ============================================== RITMO ============================================== */
  // el tic del metrónomo visible: tablita de madera (accent = el 1 del compás, más agudo y lleno)
  def('br.metronomo', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.002), o = L.bus(ctx, out, 0.3), f = d.accent ? 1750 : 1250;
    L.modal(ctx, o, t, { freqs: [f, f * 2.7, f * 4.1], decays: [0.03, 0.016, 0.01], gains: [0.6, 0.3, 0.14], a: 0.0004 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: f * 1.6, q: 1.2, a: 0.0004, d: 0.008, gain: 0.3 });
    if (d.accent) L.tone(ctx, o, t, { f0: 140, f1: 95, sweep: 0.05, d: 0.06, gain: 0.35 });
    return 0.1;
  }, { cd: 0.03, dur: 0.15, prio: 2, wet: 0.08 });
  // ¡A TIEMPO!: campanita brillante
  def('br.atiempo', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.002), o = L.bus(ctx, out, 0.55);
    L.bell(ctx, o, t, { f: 2640, gain: 0.55, decay: 0.7 }); L.bell(ctx, o, t + 0.04, { f: 3960, gain: 0.35, decay: 0.5 });
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 6500, a: 0.001, d: 0.2, gain: 0.1 });
    return 0.9;
  }, { cd: 0.06, dur: 1, prio: 5, wet: 0.2 });
  R['br.tiempo'] = R['br.atiempo'];
  // ¡CONTRAPUNTO!: arpegio de campanas que sube y golpe de palmas con cajón
  def('br.contrapunto', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.7 * boost(d)), notes = [1320, 1568, 1976, 2349, 2637, 3136], i;
    for (i = 0; i < notes.length; i++) L.bell(ctx, o, t + i * 0.055, { f: notes[i], gain: 0.3 + 0.04 * i, decay: 0.55 });
    var t2 = t + 0.36;
    cajBass(ctx, o, t2, 0.9, L); slap(ctx, o, t2, 0.5, L, 1.2);
    L.noiseHit(ctx, o, t2, { type: 'bandpass', f: 2000, q: 0.7, a: 0.001, d: 0.1, gain: 0.5 });
    L.bell(ctx, o, t2, { f: 1980, gain: 0.5, decay: 1.1 }); L.noiseHit(ctx, o, t2, { type: 'highpass', f: 6000, a: 0.005, d: 0.4, gain: 0.12 });
    return 1.5;
  }, { cd: 0.5, dur: 1.7, prio: 5, wet: 0.25 });
  // ¡RESPONDE!: llamada del cajón (tres golpes: tac, tac, tum)
  def('br.respuesta', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.7);
    slap(ctx, o, t, 0.8, L); slap(ctx, o, t + 0.13, 0.8, L); cajBass(ctx, o, t + 0.26, 1, L);
    L.bell(ctx, o, t + 0.26, { f: 1500, gain: 0.25, decay: 0.5 });
    return 0.8;
  }, { cd: 0.5, dur: 0.9, prio: 4, wet: 0.2 });
  // fuera de tiempo: golpe sordo y chato
  def('br.destiempo', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.003), o = L.bus(ctx, out, 0.5);
    L.tone(ctx, o, t, { f0: 120, f1: 70, sweep: 0.05, d: 0.1, gain: 0.6 }); L.noiseHit(ctx, o, t, { type: 'lowpass', f: 600, a: 0.001, d: 0.05, gain: 0.5 });
    return 0.25;
  }, { cd: 0.08, dur: 0.3, prio: 2, wet: 0.1 });

  /* ============================================== PREMIOS ============================================== */
  // el deseo del Puente de los Suspiros: lluvia de campanitas que sube, brillo y un «aah» suave; y el jingle de música
  def('br.deseo', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.6 * boost(d)), i, D = 1.6;
    for (i = 0; i < 16; i++) { var u = i / 15; L.bell(ctx, o, t + 0.1 + u * 1.0 + rr(0, 0.04), { f: rr(1800, 5200) * (0.8 + 0.4 * u), gain: 0.22 * (1 - 0.5 * u), decay: rr(0.3, 0.8) }); }
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 6000, a: 0.3, d: 1.1, gain: 0.14 });
    L.tone(ctx, o, t, { type: 'sine', f0: 440, f1: 880, sweep: 0.9, a: 0.3, d: 1.2, gain: 0.12 });
    L.voice(ctx, o, t + 0.2, { dur: 1.3, f0: [[0, 523], [1, 523]], vowels: [[0, 'a'], [1, 'o']], amp: [[0, 0], [0.4, 1], [1, 0]], breath: 0.15, vib: 0.01, vibHz: 5, gain: 0.6 });
    try { var m = A.music; if (m && typeof m.stinger === 'function') m.stinger('br.deseo'); } catch (e) { /* la música es opcional */ }
    return D + 0.4;
  }, { cd: 1.5, dur: 2.2, prio: 5, wet: 0.35 });
  // dato nuevo de Barranco: dos notitas de guitarra y campanita
  def('br.dato', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.5), body = L.bodyResonance(ctx, o, { wet: 0.8 });
    L.pluck(ctx, body, 659.25, t, { vel: 0.6, decay: 0.6, bright: 0.65, pick: 0.75, dur: 0.7 }); L.pluck(ctx, body, 880, t + 0.1, { vel: 0.6, decay: 0.8, bright: 0.7, pick: 0.75, dur: 0.9 });
    L.bell(ctx, o, t + 0.1, { f: 2640, gain: 0.25, decay: 0.7 });
    return 1.0;
  }, { cd: 0.4, dur: 1.1, prio: 3, wet: 0.25 });

  /* ============================================== BUCLES ============================================== */
  // oleaje de canto rodado: marea grave (dos LFO no sincronizados) + espuma aguda + el castañeteo de las piedras cuando el agua se retira. {intensity} 0..1.3
  def('br.olas', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var o = L.bus(ctx, out, 0.6);
    function ik(h) { return clamp(num(h.data.intensity, 0.7), 0, 1.3); }
    function apply(h, t) { var k = ik(h); h.g1.gain.setTargetAtTime(0.06 + 0.3 * k, t, 0.5); h.g2.gain.setTargetAtTime(0.01 + 0.1 * k, t, 0.5); }
    return L.loop(ctx, o, {
      data: d,
      setup: function (h) {
        var n1 = h.src('pink'), b1 = L.filter(ctx, 'lowpass', 700, 0.6); h.g1 = ctx.createGain(); h.g1.gain.value = 0.1; n1.connect(b1); b1.connect(h.g1); h.g1.connect(h.out);
        var n2 = h.src('white'), b2 = L.filter(ctx, 'bandpass', 3000, 0.5); h.g2 = ctx.createGain(); h.g2.gain.value = 0.03; n2.connect(b2); b2.connect(h.g2); h.g2.connect(h.out);
        var l1 = h.osc('sine', 0.09), lg1 = ctx.createGain(); lg1.gain.value = 0.07; l1.connect(lg1); lg1.connect(h.g1.gain);
        var l2 = h.osc('sine', 0.063), lg2 = ctx.createGain(); lg2.gain.value = 0.03; l2.connect(lg2); lg2.connect(h.g2.gain);
        var l3 = h.osc('sine', 0.09), lg3 = ctx.createGain(); lg3.gain.value = 550; l3.connect(lg3); lg3.connect(b1.frequency);
        apply(h, h.t0);
      },
      set: function (h) { apply(h, ctx.currentTime); },
      step: function (h, t) {
        apply(h, t);
        var k = ik(h), ph = (t - h.t0) * 0.09 * 2 * Math.PI, back = Math.max(0, -Math.cos(ph)), i;               // «back» = el agua se retira (la ola baja)
        var n = rnd() < back * 0.9 * k ? 2 + ((rnd() * 4) | 0) : 0;
        for (i = 0; i < n; i++) L.noiseHit(ctx, h.out, t + i * 0.012 + rr(0, 0.02), { type: 'bandpass', f: rr(2200, 6500), q: rr(1.5, 3), a: 0.0004, d: rr(0.006, 0.016), gain: 0.07 * (0.4 + k) });   // piedritas que ruedan
        return t + 0.1;
      }
    });
  }, { cd: 0.3, dur: 2, prio: 1, wet: 0.15, loop: true });

  // grillos del parque: tres grillos con trinos de tres pulsos a distinto tono. {intensity}
  def('br.grillos', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var o = L.bus(ctx, out, 0.5);
    return L.loop(ctx, o, {
      data: d,
      setup: function (h) { h.cr = [{ f: 4300, per: 0.62, next: h.t0 + rr(0, 0.5) }, { f: 4700, per: 0.47, next: h.t0 + rr(0, 0.5) }, { f: 3900, per: 0.8, next: h.t0 + rr(0, 0.8) }]; },
      step: function (h, t) {
        var k = clamp(num(h.data.intensity, 0.6), 0, 1.2), i, j;
        for (i = 0; i < h.cr.length; i++) {
          var c = h.cr[i];
          while (c.next < t + 0.2) {
            for (j = 0; j < 3; j++) L.tone(ctx, h.out, c.next + j * 0.05, { type: 'sine', f0: c.f * (1 + 0.01 * j), d: 0.03, a: 0.004, gain: 0.07 * k * (j === 1 ? 1 : 0.8) });
            c.next += c.per * rr(0.92, 1.1);
          }
        }
        return t + 0.2;
      }
    });
  }, { cd: 0.3, dur: 2, prio: 1, wet: 0.1, loop: true });


  /* ============================================== NOMBRES QUE USAN LOS SISTEMAS DEL JUEGO (jaranon.js, objetos.js, vecinos.js, nivel.js) ============================================== */
  // alias de un sonido que ya existe (mapper(d) → datos para el original)
  alias('br.aplausos', 'br.pena.aplausos', function (d) { return { size: d.size || (d.n ? clamp(d.n / 10, 0.4, 1.6) : 1) }; });
  alias('br.cajon.roto', 'br.cajon.rompe');
  alias('br.botella.tiro', 'br.botella.lanza');
  alias('br.jefe.loseta', 'br.jefe.loseta.quema');
  alias('br.metronomo.responde', 'br.respuesta');
  alias('br.jefe.resbala', 'br.jefe.cae');
  alias('br.jefe.duele', 'br.jefe.herido');
  alias('br.porton.abre', 'br.porton');
  // el golpe de cajón del arma: palmada grave + onda que se abre; a tiempo (atiempo) suma la campanita dorada
  def('br.cajon', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var g = ctx.createGain(), e = { delay: num(d.delay, 0) }, at = !!(d.atiempo || d.tiempo || d.aTiempo);
    g.gain.value = at ? 0.55 : 0.8; g.connect(out);
    R['br.cajon.onda'](ctx, g, mix(d, e), L);
    if (at) R['br.cajon.atiempo'](ctx, g, mix(d, { delay: num(d.delay, 0) + 0.01 }), L);
    return 0.9;
  }, { cd: 0.1, dur: 1, prio: 5, wet: 0.2 });
  // levantar el cajón de la espalda: tela, madera que se arrastra y un golpecito al apoyarlo
  def('br.cajon.alza', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.4);
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 500, f1: 1400, q: 0.9, a: 0.06, d: 0.16, sweep: 0.16, gain: 0.3 });
    wood(ctx, o, t + 0.12, 160, 0.5, L); L.tone(ctx, o, t + 0.12, { f0: 100, f1: 70, sweep: 0.06, d: 0.1, gain: 0.35 });
    return 0.4;
  }, { cd: 0.2, dur: 0.45, prio: 2, wet: 0.12 });
  // mesa de la peña que se rompe (cobertura): tablero partido, patas y copas que caen
  def('br.mesa.rompe', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.003), o = L.bus(ctx, out, 0.8), i;
    wood(ctx, o, t, 200, 1.0, L); L.tone(ctx, o, t, { f0: 95, f1: 40, sweep: 0.25, d: 0.3, gain: 0.7 }); L.noiseHit(ctx, o, t, { type: 'highpass', f: 1800, a: 0.001, d: 0.12, gain: 0.45 });
    for (i = 0; i < 6; i++) wood(ctx, o, t + 0.06 + i * rr(0.04, 0.1), rr(250, 800), 0.3 * (1 - 0.1 * i), L);
    tinkles(ctx, o, t + 0.1, 5, 0.4, 0.18, 2400, 6500, L);
    return 0.9;
  }, { cd: 0.1, dur: 1, prio: 4, wet: 0.2 });
  // caja de cerveza vacía: tablitas y botellas que tintinean al caer
  def('br.caja.rompe', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.003), o = L.bus(ctx, out, 0.65), i;
    wood(ctx, o, t, 330, 0.8, L); L.noiseHit(ctx, o, t, { type: 'highpass', f: 2200, a: 0.001, d: 0.08, gain: 0.35 });
    for (i = 0; i < 3; i++) wood(ctx, o, t + 0.05 + i * rr(0.04, 0.08), rr(400, 900), 0.2, L);
    for (i = 0; i < 4; i++) L.bell(ctx, o, t + 0.04 + i * rr(0.04, 0.1), { f: rr(2500, 4200), gain: 0.18, decay: 0.2 });
    return 0.6;
  }, { cd: 0.08, dur: 0.7, prio: 3, wet: 0.14 });
  // luces del tabladillo: relé que cierra y focos que zumban y suben (sin música: br.jefe.entra suma el acorde y los aplausos)
  def('br.pena.focos', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.55);
    wood(ctx, o, t, 120, 0.7, L); L.tone(ctx, o, t, { f0: 70, f1: 38, sweep: 0.3, d: 0.4, gain: 0.7 });
    L.noiseHit(ctx, o, t + 0.08, { type: 'bandpass', f: 4000, f1: 9000, q: 6, a: 0.12, d: 0.7, sweep: 0.7, gain: 0.14 });
    L.tone(ctx, o, t + 0.1, { type: 'sawtooth', f0: 100, f1: 120, sweep: 0.8, a: 0.2, d: 0.7, gain: 0.05 });
    return 1.1;
  }, { cd: 0.5, dur: 1.2, prio: 3, wet: 0.2 });
  def('br.porton.cierra', function (ctx, out, d, L) {                                         // el portón se cierra de un golpe: tabla pesada, aldaba y cerrojo
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.8);
    L.tone(ctx, o, t, { f0: 85, f1: 38, sweep: 0.3, d: 0.5, gain: 1.0 }); L.noiseHit(ctx, o, t, { type: 'lowpass', f: 600, a: 0.001, d: 0.2, gain: 0.7 }); wood(ctx, o, t, 140, 0.9, L);
    L.bell(ctx, o, t + 0.12, { f: 1100, gain: 0.2, decay: 0.3 }); L.noiseHit(ctx, o, t + 0.25, { type: 'bandpass', f: 2800, q: 3, a: 0.001, d: 0.03, gain: 0.3 });
    return 0.8;
  }, { cd: 0.5, dur: 0.9, prio: 4, wet: 0.25 });
  // voz de Jaranón al hablar (la frase con texto la dice voces-br; esto es el rugido cantado debajo): sílabas graves según el largo del texto
  def('br.jefe.voz', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.4), n = clamp(Math.round(String(d.text || 'aaaaaa').length / 6), 2, 7), i, tt = t, vs = ['a', 'o', 'e', 'o', 'a', 'u', 'o'];
    for (i = 0; i < n; i++) { var du = vary(0.18, 0.2), f = rr(110, 160); zv(ctx, o, L, tt, [[0, f * 1.1], [1, f * (0.85 + 0.3 * rnd())]], [[0, vs[i % 7]], [1, vs[(i + 1) % 7]]], du, { gain: 1.2, rasp: 0.35, breath: 0.25 }); tt += du + vary(0.07, 0.4); }
    return (tt - t) + 0.2;
  }, { cd: 0.5, dur: 1.6, prio: 2, wet: 0.25 });
  def('br.jefe.grito', function (ctx, out, d, L) {                                           // «¡Silencio en la sala!»: grito de barítono
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.75 * boost(d));
    zv(ctx, o, L, t, [[0, 150], [0.15, 230], [0.7, 210], [1, 120]], [[0, 'a'], [0.4, 'a'], [1, 'o']], 1.1, { gain: 2.0, rasp: 0.4, vib: 0.02, breath: 0.25, drive: 0.4 });
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 3500, a: 0.01, d: 0.3, gain: 0.1 });
    return 1.4;
  }, { cd: 0.6, dur: 1.6, prio: 5, wet: 0.3 });
  def('br.jefe.sienta', function (ctx, out, d, L) {                                          // se sienta en el borde del tabladillo: tablas que crujen y un suspiro
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.01), o = L.bus(ctx, out, 0.6);
    wood(ctx, o, t, 150, 0.7, L); L.tone(ctx, o, t, { f0: 80, f1: 45, sweep: 0.2, d: 0.3, gain: 0.6 });
    L.noiseHit(ctx, o, t + 0.05, { type: 'bandpass', f: 600, f1: 350, q: 6, a: 0.02, d: 0.3, sweep: 0.3, gain: 0.12 });
    zv(ctx, o, L, t + 0.2, [[0, 170], [1, 100]], [[0, 'a'], [1, 'u']], 1.2, { gain: 1.0, breath: 0.6, rasp: 0.15, amp: [[0, 0], [0.2, 1], [1, 0]] });
    return 1.7;
  }, { cd: 1, dur: 1.8, prio: 4, wet: 0.3 });
  def('br.jaranero.llega', function (ctx, out, d, L) {                                       // entran los jaraneros: taconeo y un «¡jarana!» a coro
    d = d || {}; L = L || L0;
    var dl = num(d.delay, 0);
    R['br.zapateo'](ctx, out, { n: 5, delay: dl }, L); R['br.pena.eso'](ctx, out, { delay: dl + 0.25 }, L);
    return 1.2;
  }, { cd: 0.6, dur: 1.4, prio: 4, wet: 0.2 });
  def('br.cajonero.duele', function (ctx, out, d, L) {                                       // le pegan al cajonero: golpe seco y un «¡ay!»
    d = d || {}; L = L || L0;
    var t = T0(ctx, d, 0.004), o = L.bus(ctx, out, 0.65);
    wood(ctx, o, t, 220, 0.7, L); cajBass(ctx, o, t + 0.01, 0.5, L);
    zv(ctx, o, L, t + 0.03, [[0, 240], [1, 150]], [[0, 'a'], [1, 'o']], 0.25, { gain: 1.3, rasp: 0.4, breath: 0.3 });
    return 0.5;
  }, { cd: 0.15, dur: 0.6, prio: 4, wet: 0.15 });

  /* ============================================== ALIAS ============================================== */
  alias('br.cajon.hit', 'br.cajon.golpe');
  alias('br.botella.break', 'br.botella.rompe');
  alias('br.jefe.hurt', 'br.jefe.herido');
  alias('br.jefe.stomp', 'br.jefe.pisoton');
  alias('br.jefe.zapateo', 'br.jefe.pisoton');

  /* ================================================ DIRECTOR DE AMBIENTE ================================================ */
  var BR = A.br = A.br || {};
  var D = BR.amb = BR.amb || {};
  D.enabled = true; D.bed = 1;
  var st = { timer: 0, olas: null, grillos: null, nextGull: 0, t0: 0 };
  var OLAS_K = { playa: 0.9, bajada: 0.35, puente: 0.22, ermita: 0.28, parque: 0, bohemia: 0, pena: 0 };
  function G() { return ACH.G || (ACH.game && ACH.game.G) || null; }
  function listener() {
    var g = G(), V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
    if (g && g.cam) return { x: g.cam.x + V.w / 2, y: g.cam.y + V.h / 2 };
    return null;
  }
  function nowS() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000; }
  D.setBed = function (k) { D.bed = clamp(+k || 0, 0, 2); };
  function tick() {
    if (!D.enabled || !(ACH.nivel && ACH.nivel.id === 'barranco')) return;
    if (!A.ctx || A.ctx.state !== 'running') return;
    var g = G(), lis = listener();
    if (!g || g.state !== 'playing' || !lis) return;
    var t = nowS(), zone = typeof BR.zone === 'function' ? BR.zone() : 'playa', night = A.music && typeof A.music.night === 'function' && A.music.night();
    var k = (OLAS_K[zone] == null ? 0 : OLAS_K[zone]) * D.bed;
    if (!st.t0) { st.t0 = t; st.nextGull = t + rr(3, 8); }
    if (k > 0.01) { if (st.olas && st.olas.alive) st.olas.set({ intensity: k }); else st.olas = A.loop('br.olas', { intensity: k, ttl: 2 }); }
    var gc = (zone === 'parque' || zone === 'ermita') ? (night ? 0.7 : 0.4) : 0;
    if (gc > 0) { if (st.grillos && st.grillos.alive) st.grillos.set({ intensity: gc }); else st.grillos = A.loop('br.grillos', { intensity: gc, ttl: 2 }); }
    if (t >= st.nextGull) {
      st.nextGull = t + rr(8, 18);
      if (!night && (zone === 'playa' || zone === 'bajada' || zone === 'puente' || zone === 'ermita')) {
        A.emit('br.gaviota', { x: lis.x + rr(-190, 190), y: lis.y + rr(-80, 40), boost: zone === 'playa' ? 1.3 : 0.9 });
        if (rnd() < 0.3) setTimeout(function () { try { A.emit('br.gaviota', { x: lis.x + rr(-250, 250), y: lis.y + rr(-90, 30) }); } catch (e) { /* nada */ } }, rr(900, 2200));
      }
    }
  }
  D.start = function () { if (!st.timer) st.timer = setInterval(function () { try { tick(); } catch (e) { /* el sonido nunca rompe el juego */ } }, 250); };
  D.stop = function () { if (st.timer) { clearInterval(st.timer); st.timer = 0; } ['olas', 'grillos'].forEach(function (k) { if (st[k]) { try { st[k].stop(); } catch (e) { /* nada */ } st[k] = null; } }); };
  D.state = function () { return { running: !!st.timer, olas: !!(st.olas && st.olas.alive), grillos: !!(st.grillos && st.grillos.alive), nextGull: st.nextGull ? +(st.nextGull - nowS()).toFixed(1) : null, bed: D.bed }; };
  D.start();

  BR.sfx = Object.keys(R).filter(function (k) { return k.indexOf('br.') === 0; });         // lista de eventos de este archivo (para la página de prueba)
})();
