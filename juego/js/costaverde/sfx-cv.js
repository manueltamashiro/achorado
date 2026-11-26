/* ACHORADO - js/costaverde/sfx-cv.js  (C3, nivel Costa Verde: malecón de Miraflores → Larcomar → chef chifa → caída en parapente → Chorrillos)
 * Sonidos nuevos del nivel, todo sintetizado con Web Audio (usa ACH.audio.lib de sfx.js). Se registran SIN editar sfx.js ni motor.js, igual que js/miraflores/sfx-mira.js:
 * motor.js busca cada evento en ACH.audio.recipes[name] (A.emit y A.loop), así que basta con agregar recetas ahí. Carga DESPUÉS de motor.js (si cargara antes tampoco pasa nada).
 * Sin estos sonidos el juego sigue igual: un evento sin receta no suena.
 *
 * EVENTOS (nombre exacto para ACH.audio.emit(name, data); data = {x, y} si es posicional; data.boost 1..10 sube el nivel)
 *   heladero    cv.corneta (bocina de bulbo, dos notas «pa-púu»)
 *   pelota      cv.patada ({charge 0..1}: más fuerte y grave) · cv.rebote ({v 0..1}: velocidad del bote) · cv.gol (ovación + fanfarria; llama al stinger de música `cv.gol`)
 *   barra       cv.fosfo.zumbido (el golpe al aire: zumbido eléctrico) · cv.fosfo.golpe (pega en un zombie)
 *   helado      cv.helado.lanza · cv.helado.splat · cv.lamida (el zombie lame el charquito) · cv.helado.come (¡cerebro congelado!)
 *   perritos    cv.ladrido.chico · cv.ladrido.grande · cv.ladrido.pug · cv.ladrido.husky (aullido) · cv.ladrido (sortea uno) · cv.gemido (el perro chilla/huye)
 *   zombies     cv.selfie (flash de cámara con carga previa) · cv.tabla.golpe (golpe ancho de tabla de surf)
 *   chef        cv.palito.silbido · cv.palito.toc · cv.dumpling.salto · cv.dumpling.muerde · cv.dumpling.muere · cv.gong ({size 0.6..1.6}) · cv.wok ({big}) · cv.vaporera (tapa y vapor)
 *               cv.onda (el chef cae de un salto: onda de choque) · cv.chef.caida (muere: cae como una montaña)
 *   caída       cv.flecha ({c 0..3}: color verde, rosado, amarillo, celeste = notas de una pentatónica) · cv.flecha.golpe · cv.tabla.rompe · cv.splash · cv.parapente.abre · cv.pelicano
 *   bucles      cv.viento ({speed 0..1} viento del parapente) · cv.tabla.gira ({speed 0..1} tabla de surf girando por el aire) · cv.olas ({intensity 0..1} oleaje del malecón)
 *   ambiente    cv.gaviota (grito de gaviota, 2–3 gritos)
 *
 * NOMBRES QUE USAN LOS SISTEMAS DEL JUEGO (chef.js, juguetes.js, caida.js, nivel.js; todos son recetas o alias, ninguno queda mudo):
 *   barra      cv.barra.swing (= cv.fosfo.zumbido) · cv.barra.hit (= cv.fosfo.golpe) · cv.barra.tiro {color} · cv.barra.cae · cv.barra.crack {color} · cv.barra.off
 *   pelota     cv.pelota.patada {charge, leather} (= cv.patada) · cv.pelota.rebote {soft, hit} · cv.pelota.bote (= cv.rebote) · cv.pelota.golpe {killed} · cv.patadita (a un perro)
 *   helado     cv.helado.tiro {charge} (= cv.helado.lanza) · cv.helado.lamer (= cv.lamida) · cv.helado.splat {hit}
 *   perros     cv.ladrido {size: chico|medio|grande|pug, breed} · cv.perro.gemido (= cv.gemido) · cv.perro.contento · cv.perro.mordida {size}
 *   chef       cv.chef.alza · cv.chef.duele · cv.chef.grito · cv.chef.salta · cv.chef.muere (= cv.chef.caida) · cv.palito {n} (volea) · cv.palito.lluvia · cv.dumpling.salen {n} · cv.dumpling.golpe
 *              cv.wok.rueda · cv.reja {close} / cv.reja.abre / cv.reja.cierra · cv.baranda (se abre la baranda del borde)
 *   caída      cv.parapente (= cv.parapente.abre) · cv.parapente.corre · cv.flecha {snap, fan} · cv.tabla.gira {intro, rage, wave, kind} (golpe de aire de una tabla; el bucle es cv.tabla.gira.loop)
 *              cv.tabla.golpe {player, broke, boss} · cv.viento {gust, dur} (como bucle con ACH.audio.loop('cv.viento', {intensity}); ahí no se apaga solo: lo para quien lo pidió)
 *   Todas las recetas aceptan data.delay (segundos) para encadenarlas.
 *
 * BUCLES (ACH.audio.loop(name, data) -> {move(x,y[,patch]), set(patch), touch(), stop()}; se apagan solos a los 4 s sin move/set/touch; data.ttl = 0: nunca):
 *   cv.viento       data/patch {speed: 0..1}. Sin posición: suena centrado (es el viento que le pega a Alexander). Sube de tono y de nivel con la velocidad.
 *   cv.tabla.gira   data/patch {speed: 0..1}: la hélice de la tabla (AM a 5–9 Hz). Posicional (x,y del proyectil): pasa de izquierda a derecha con el paneo del motor.
 *   cv.olas         data/patch {intensity: 0..1}. Lo mantiene vivo el director de ambiente.
 *
 * DIRECTOR DE AMBIENTE (ACH.audio.cv.amb): si ACH.nivel.id === 'costaverde', cada 250 ms (solo con el juego en 'playing' y el audio desbloqueado)
 *   · mantiene el oleaje (cv.olas): fuerte en el malecón, un poco menos en las terrazas altas de Larcomar y más cerca de la arena (según ACH.audio.cv.dirt());
 *   · grito de gaviota cada 7–16 s cerca del oyente (a veces dos gaviotas seguidas, y un pelícano de vez en cuando).
 *   ACH.audio.cv.amb.enabled = false / start() / stop() / setBed(k) (multiplicador 0..2 del oleaje) / state().
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

  /* ============================================== HELADERO ============================================== */
  // bocina de bulbo del triciclo: dos notas, «pa-púu». Caña nasal: cuadrada + sierra por un paso de banda, tono que se curva hacia abajo al soltar.
  function horn(ctx, o, t, f, dur, gn) {
    var a = ctx.createOscillator(), b = ctx.createOscillator(), bp = L0.filter(ctx, 'bandpass', F(f * 3.2), 1.1), hp = L0.filter(ctx, 'highpass', 220, 0.7), g = ctx.createGain(), lf = ctx.createOscillator(), lg = ctx.createGain();
    a.type = 'square'; b.type = 'sawtooth';
    a.frequency.setValueAtTime(F(f * 1.05), t); a.frequency.exponentialRampToValueAtTime(F(f), t + 0.035); a.frequency.setTargetAtTime(F(f * 0.9), t + dur * 0.75, 0.05);
    b.frequency.setValueAtTime(F(f * 1.052 * 1.004), t); b.frequency.exponentialRampToValueAtTime(F(f * 1.004), t + 0.035); b.frequency.setTargetAtTime(F(f * 0.9 * 1.004), t + dur * 0.75, 0.05);
    lf.frequency.value = 6.5; lg.gain.value = f * 0.012; lf.connect(lg); lg.connect(a.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gn, t + 0.012); g.gain.setTargetAtTime(gn * 0.75, t + 0.02, 0.1); g.gain.setTargetAtTime(0, t + dur, 0.03);
    a.connect(bp); b.connect(bp); bp.connect(hp); hp.connect(g); g.connect(o);
    a.start(t); b.start(t); lf.start(t); a.stop(t + dur + 0.2); b.stop(t + dur + 0.2); lf.stop(t + dur + 0.2);
  }
  def('cv.corneta', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.005 + num(d.delay, 0), o = L.bus(ctx, out, 0.5 * boost(d)), f = vary(392, 0.02);
    horn(ctx, o, t, f, 0.16, 0.5); horn(ctx, o, t + 0.2, f * 1.26, 0.4, 0.55);
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 1800, q: 1.2, a: 0.004, d: 0.06, gain: 0.12 });                    // el soplo del bulbo
    return 0.9;
  }, { cd: 0.4, dur: 1, prio: 3, wet: 0.2 });

  /* ============================================== PELOTA ============================================== */
  def('cv.patada', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), k = clamp(num(d.charge, 0), 0, 1), o = L.bus(ctx, out, 0.85 * (0.7 + 0.4 * k)), p = vary(1, 0.05) * (1 - 0.15 * k);
    L.tone(ctx, o, t, { f0: 175 * p, f1: 58, sweep: 0.1, d: 0.14, gain: 0.8 });                                         // el golpe sordo de la pelota hinchada
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(1300, 0.1), q: 1, a: 0.001, d: 0.035, gain: 0.55 });             // el cuero
    L.noiseHit(ctx, o, t + 0.004, { kind: 'brown', type: 'lowpass', f: 420, a: 0.002, d: 0.08, gain: 0.45 });
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 700, f1: 280, q: 0.8, a: 0.012, d: 0.12, sweep: 0.12, gain: 0.25 * (0.5 + k) });   // el aire que sale
    return 0.4;
  }, { cd: 0.08, dur: 0.5, prio: 4, wet: 0.12 });

  def('cv.rebote', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.002 + num(d.delay, 0), v = clamp(num(d.v, 0.6), 0.05, 1), o = L.bus(ctx, out, 0.7 * (0.3 + 0.8 * v));
    L.tone(ctx, o, t, { f0: vary(150, 0.08) * (0.8 + 0.4 * v), f1: 70, sweep: 0.08, d: 0.13, gain: 0.8 });
    L.modal(ctx, o, t, { freqs: [vary(215, 0.05), vary(340, 0.05)], decays: [0.09, 0.06], gains: [0.3, 0.2], a: 0.001 });
    L.noiseHit(ctx, o, t, { type: 'lowpass', f: 900, a: 0.001, d: 0.03, gain: 0.3 * v });
    return 0.3;
  }, { cd: 0.05, dur: 0.35, prio: 3, wet: 0.1 });

  // «¡GOOOL!»: ovación (ruido en banda que crece y se queda), coro de voces abiertas, y la fanfarria de música (stinger cv.gol)
  def('cv.gol', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.01 + num(d.delay, 0), o = L.bus(ctx, out, 0.5 * boost(d)), D = 2.6, i, g = ctx.createGain(), lp = L.filter(ctx, 'bandpass', 1400, 0.45), ns = L.noiseSrc(ctx, 'pink', t, D + 0.2);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.9, t + 0.55); g.gain.setValueAtTime(0.8, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + D);
    lp.frequency.setValueAtTime(900, t); lp.frequency.linearRampToValueAtTime(1800, t + 0.7); lp.frequency.exponentialRampToValueAtTime(900, t + D);
    ns.connect(lp); lp.connect(g); g.connect(o);
    for (i = 0; i < 7; i++) {                                                                                           // «goooool» a muchas voces, cada una un poco distinta
      var f = rr(190, 330), tt = t + rr(0, 0.25), D2 = rr(1.1, 1.7);
      L.voice(ctx, o, tt, { dur: D2, f0: [[0, f * 0.9], [0.2, f * 1.1], [0.7, f * 1.05], [1, f * 0.8]], vowels: [[0, 'o'], [0.3, 'o'], [0.8, 'a'], [1, 'u']], amp: [[0, 0], [0.15, 1], [0.8, 0.7], [1, 0]], fscale: 1.05, bw: 1.2, breath: 0.2, vib: 0.01, vibHz: 6, jitter: 0.03, gain: 0.7 });
    }
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 3000, a: 0.002, d: 0.3, gain: 0.2 });
    try { var m = A.music; if (m && typeof m.stinger === 'function') m.stinger('cv.gol'); } catch (e) { /* la música es opcional */ }
    return D + 0.3;
  }, { cd: 1.5, dur: 3, prio: 4, wet: 0.2 });

  /* ============================================== BARRA FOSFORESCENTE ============================================== */
  // el golpe al aire: zumbido de tubo con barrido (sierra por un paso de banda que sube y baja) y un soplido
  def('cv.fosfo.zumbido', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.85), D = 0.3, f = vary(150, 0.1), os = ctx.createOscillator(), bp = L.filter(ctx, 'bandpass', 600, 2.2), g = ctx.createGain();
    os.type = 'sawtooth'; os.frequency.setValueAtTime(F(f * 0.7), t); os.frequency.exponentialRampToValueAtTime(F(f * 1.8), t + D * 0.45); os.frequency.exponentialRampToValueAtTime(F(f * 1.1), t + D);
    bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(2400, t + D * 0.45); bp.frequency.exponentialRampToValueAtTime(900, t + D);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.55, t + 0.08); g.gain.setTargetAtTime(0, t + D * 0.55, 0.06);
    os.connect(bp); bp.connect(g); g.connect(o); os.start(t); os.stop(t + D + 0.2);
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 1200, f1: 3200, q: 0.9, a: 0.06, d: 0.2, sweep: 0.2, gain: 0.45 });
    L.noiseHit(ctx, o, t + 0.08, { type: 'bandpass', f: vary(3800, 0.1), q: 6, a: 0.001, d: 0.012, gain: 0.12 });     // chispita eléctrica
    return D + 0.3;
  }, { cd: 0.1, dur: 0.6, prio: 3, wet: 0.12 });

  def('cv.fosfo.golpe', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.8), i;
    L.tone(ctx, o, t, { f0: vary(190, 0.1), f1: 85, sweep: 0.07, d: 0.1, gain: 0.7 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(2800, 0.1), q: 1.2, a: 0.001, d: 0.03, gain: 0.6 });
    L.modal(ctx, o, t, { freqs: [1100, 2300, 3700].map(function (f) { return f * vary(1, 0.03); }), decays: [0.08, 0.05, 0.03], gains: [0.35, 0.22, 0.12], a: 0.0008 });   // tubo de plástico hueco
    for (i = 0; i < 3; i++) L.noiseHit(ctx, o, t + 0.01 + i * rr(0.012, 0.03), { type: 'highpass', f: 5000, a: 0.0005, d: 0.006, gain: 0.2 });
    return 0.4;
  }, { cd: 0.06, dur: 0.45, prio: 4, wet: 0.1 });

  /* ============================================== HELADO ============================================== */
  def('cv.helado.lanza', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.004 + num(d.delay, 0), o = L.bus(ctx, out, 0.85);
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 500, f1: 1500, q: 0.8, a: 0.04, d: 0.2, sweep: 0.2, gain: 0.5 });
    L.tone(ctx, o, t, { f0: 310, f1: 180, sweep: 0.08, d: 0.1, gain: 0.3 });
    L.noiseHit(ctx, o, t, { type: 'lowpass', f: 900, a: 0.002, d: 0.04, gain: 0.25 });
    return 0.4;
  }, { cd: 0.1, dur: 0.5, prio: 3, wet: 0.1 });

  def('cv.helado.splat', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.75), i;
    L.noiseHit(ctx, o, t, { type: 'lowpass', f: vary(1300, 0.1), q: 0.8, a: 0.001, d: 0.09, gain: 0.8 });
    L.tone(ctx, o, t, { f0: 230, f1: 62, sweep: 0.12, d: 0.14, gain: 0.55 });
    var os = ctx.createOscillator(), bp = L.filter(ctx, 'bandpass', 700, 3), g = ctx.createGain();                      // chorro que se aplasta: sierra que cae por un filtro agudo
    os.type = 'sawtooth'; os.frequency.setValueAtTime(420, t + 0.02); os.frequency.exponentialRampToValueAtTime(110, t + 0.2);
    bp.frequency.setValueAtTime(1800, t + 0.02); bp.frequency.exponentialRampToValueAtTime(380, t + 0.2);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.03); g.gain.setTargetAtTime(0, t + 0.06, 0.05);
    os.connect(bp); bp.connect(g); g.connect(o); os.start(t); os.stop(t + 0.4);
    for (i = 0; i < 2; i++) L.tone(ctx, o, t + 0.12 + i * rr(0.06, 0.12), { f0: rr(700, 1100), f1: rr(350, 500), sweep: 0.04, a: 0.002, d: 0.04, gain: 0.14 });   // gotitas
    return 0.6;
  }, { cd: 0.06, dur: 0.7, prio: 4, wet: 0.12 });

  // lamida: tres lengüetazos húmedos (ruido en banda que sube y baja por formantes) con chasquidos de saliva
  def('cv.lamida', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.01 + num(d.delay, 0), o = L.bus(ctx, out, 0.6), i, tt = t;
    for (i = 0; i < 3; i++) {
      L.noiseHit(ctx, o, tt, { type: 'bandpass', f: 700, f1: 2000, q: 3.5, a: 0.05, d: 0.14, sweep: 0.15, gain: 0.5 });
      L.noiseHit(ctx, o, tt + 0.14, { type: 'bandpass', f: 1900, f1: 650, q: 3.5, a: 0.01, d: 0.08, sweep: 0.1, gain: 0.35 });
      L.tone(ctx, o, tt + 0.02, { f0: rr(1500, 2300), f1: rr(2800, 3600), sweep: 0.02, a: 0.001, d: 0.02, gain: 0.07 });
      tt += vary(0.26, 0.15);
    }
    return 1;
  }, { cd: 0.3, dur: 1.1, prio: 2, wet: 0.1 });

  // ¡cerebro congelado!: dos mordidas crocantes del barquillo y el escalofrío (ruido agudo con temblor que cae)
  def('cv.helado.come', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.01 + num(d.delay, 0), o = L.bus(ctx, out, 0.5), i, g = ctx.createGain(), lf = ctx.createOscillator(), lg = ctx.createGain(), ns = L.noiseSrc(ctx, 'white', t + 0.3, 0.8), hp = L.filter(ctx, 'highpass', 3000, 0.7);
    for (i = 0; i < 2; i++) { var tt = t + i * 0.16; L.noiseHit(ctx, o, tt, { type: 'bandpass', f: 2600, q: 0.7, a: 0.001, d: 0.05, gain: 0.5 }); for (var k = 0; k < 4; k++) L.noiseHit(ctx, o, tt + rr(0, 0.05), { type: 'highpass', f: 4500, a: 0.0005, d: 0.008, gain: 0.2 }); L.tone(ctx, o, tt, { f0: 220, f1: 110, d: 0.06, gain: 0.3 }); }
    g.gain.setValueAtTime(0.0001, t + 0.3); g.gain.linearRampToValueAtTime(0.5, t + 0.4); g.gain.setTargetAtTime(0, t + 0.6, 0.15);
    lf.frequency.value = 17; lg.gain.value = 0.35; lf.connect(lg); lg.connect(g.gain); lf.start(t + 0.3); lf.stop(t + 1.2);
    ns.connect(hp); hp.connect(g); g.connect(o);
    L.tone(ctx, o, t + 0.3, { type: 'triangle', f0: 2400, f1: 900, sweep: 0.5, a: 0.02, d: 0.5, gain: 0.12 });
    return 1.3;
  }, { cd: 0.3, dur: 1.4, prio: 3, wet: 0.12 });

  /* ============================================== PERRITOS ============================================== */
  // ladridos: voz de formantes (fuente glotal + banco de formantes) como dog.bark de sfx.js
  function bark(ctx, o, L, tt, base, dur, o2) {
    L.voice(ctx, o, tt, { dur: dur, f0: [[0, base * 1.25], [0.2, base * 1.08], [1, base * (o2.fall || 0.62)]], vowels: o2.vowels || [[0, 'u'], [0.2, 'a'], [0.6, 'o'], [1, 'o']],
      amp: [[0, 0], [0.05, 1], [0.5, 0.75], [1, 0]], fscale: o2.fscale || 1.1, bw: o2.bw || 1.3, breath: o2.breath == null ? 0.3 : o2.breath, rasp: o2.rasp == null ? 0.25 : o2.rasp, raspHz: o2.raspHz || 60,
      jitter: 0.03, gain: o2.gain || 2, drive: o2.drive == null ? 0.5 : o2.drive });
    L.noiseHit(ctx, o, tt, { type: 'bandpass', f: vary(o2.nf || 2500, 0.15), q: 0.9, d: 0.03, gain: o2.ng || 0.22 });
  }
  def('cv.ladrido.chico', function (ctx, out, d, L) {                                                                  // «¡yip-yip-yip!»
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.01 + num(d.delay, 0), o = L.bus(ctx, out, 0.3 * boost(d)), n = 2 + ((rnd() * 2) | 0), i, base = vary(820, 0.1), tt = t;
    for (i = 0; i < n; i++) { var du = vary(0.1, 0.2); bark(ctx, o, L, tt, base * (1 + i * 0.04), du, { fall: 0.78, vowels: [[0, 'i'], [0.3, 'a'], [1, 'e']], fscale: 1.3, gain: 1.9, nf: 3600, ng: 0.15 }); tt += du + vary(0.075, 0.3); }
    return (tt - t) + 0.25;
  }, { cd: 0.3, dur: 0.9, prio: 3, wet: 0.14 });
  def('cv.ladrido.grande', function (ctx, out, d, L) {                                                                 // «¡GUAU!» grave, de perro grande (golden, chusco)
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.01 + num(d.delay, 0), o = L.bus(ctx, out, 0.32 * boost(d)), n = 1 + ((rnd() * 2) | 0), i, base = vary(190, 0.1) * num(d.pitch, 1), tt = t;
    for (i = 0; i < n; i++) { var du = vary(0.3, 0.15); bark(ctx, o, L, tt, base * (1 + i * 0.03), du, { fall: 0.7, vowels: [[0, 'u'], [0.2, 'a'], [0.5, 'o'], [1, 'u']], fscale: 0.88, gain: 2.4, drive: 0.6, nf: 1500, ng: 0.25 }); tt += du + vary(0.18, 0.3); }
    L.tone(ctx, o, t, { f0: base * 0.5, f1: base * 0.35, d: 0.18, gain: 0.25 });
    return (tt - t) + 0.3;
  }, { cd: 0.35, dur: 1.2, prio: 3, wet: 0.16 });
  def('cv.ladrido.pug', function (ctx, out, d, L) {                                                                    // ladrido nasal y resoplido de pug
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.01 + num(d.delay, 0), o = L.bus(ctx, out, 0.32 * boost(d)), base = vary(430, 0.08), i, tt = t;
    for (i = 0; i < 2; i++) { var du = vary(0.15, 0.15); bark(ctx, o, L, tt, base * (1 + i * 0.05), du, { fall: 0.7, vowels: [[0, 'ae'], [0.4, 'uh'], [1, 'ae']], fscale: 1.05, bw: 0.7, breath: 0.5, rasp: 0.4, raspHz: 45, gain: 1.9, nf: 1900, ng: 0.3 }); tt += du + 0.1; }
    L.noiseHit(ctx, o, tt + 0.02, { type: 'bandpass', f: 1100, f1: 700, q: 2, a: 0.03, d: 0.18, sweep: 0.15, gain: 0.45 });   // resoplido
    L.noiseHit(ctx, o, tt + 0.22, { type: 'bandpass', f: 900, f1: 1300, q: 2, a: 0.02, d: 0.1, sweep: 0.08, gain: 0.3 });
    return (tt - t) + 0.6;
  }, { cd: 0.35, dur: 1.2, prio: 3, wet: 0.14 });
  def('cv.ladrido.husky', function (ctx, out, d, L) {                                                                  // aullido-jadeo de husky: «awuuu»
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.01 + num(d.delay, 0), o = L.bus(ctx, out, 0.3 * boost(d)), D = vary(1.1, 0.1), f = vary(360, 0.08);
    L.voice(ctx, o, t, { dur: D, f0: [[0, f], [0.25, f * 1.5], [0.6, f * 1.55], [1, f * 1.1]], vowels: [[0, 'a'], [0.25, 'o'], [0.7, 'u'], [1, 'm']], amp: [[0, 0], [0.15, 0.9], [0.7, 1], [1, 0]], fscale: 1.05, bw: 0.9, breath: 0.2, vib: 0.02, vibHz: 6, jitter: 0.015, gain: 1.6 });
    return D + 0.3;
  }, { cd: 0.8, dur: 1.5, prio: 2, wet: 0.2 });
  def('cv.ladrido', function (ctx, out, d, L) {                                                                        // {size: chico|medio|grande|pug, breed}: elige el ladrido; sin datos sortea
    d = d || {};
    var n = d.breed === 'husky' ? 'cv.ladrido.husky' : d.size === 'chico' ? 'cv.ladrido.chico' : d.size === 'grande' ? 'cv.ladrido.grande' : d.size === 'pug' ? 'cv.ladrido.pug'
      : d.size === 'medio' ? 'cv.ladrido.grande' : pick(['cv.ladrido.chico', 'cv.ladrido.grande', 'cv.ladrido.pug']);
    return R[n](ctx, out, d.size === 'medio' ? mix(d, { pitch: 1.5 }) : d, L);
  }, { cd: 0.3, dur: 1.5, prio: 3, wet: 0.15 });
  def('cv.gemido', function (ctx, out, d, L) {                                                                         // chillido corto y gemido (la patadita, o un zombie le pegó)
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.01 + num(d.delay, 0), o = L.bus(ctx, out, 0.6), f = vary(620, 0.08);
    L.voice(ctx, o, t, { dur: 0.16, f0: [[0, f * 0.8], [0.4, f * 1.7], [1, f * 1.3]], vowels: [[0, 'i'], [1, 'e']], amp: [[0, 0], [0.1, 1], [1, 0]], fscale: 1.2, bw: 0.9, breath: 0.15, jitter: 0.02, gain: 1.7 });
    L.voice(ctx, o, t + 0.22, { dur: vary(0.6, 0.15), f0: [[0, f * 1.4], [0.4, f * 1.55], [0.8, f * 1.2], [1, f * 1.0]], vowels: [[0, 'i'], [0.5, 'e'], [1, 'uh']], amp: [[0, 0], [0.2, 0.8], [0.6, 0.9], [1, 0]], fscale: 1.15, bw: 1, breath: 0.25, vib: 0.03, vibHz: 6, jitter: 0.015, gain: 1.4 });
    return 1.0;
  }, { cd: 0.5, dur: 1.1, prio: 3, wet: 0.14 });

  /* ============================================== ZOMBIES NUEVOS ============================================== */
  // turista con palo de selfie: carga del flash (sube rápido), pop, y el clic del obturador de dos tiempos
  def('cv.selfie', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.5 * boost(d));
    L.tone(ctx, o, t, { f0: 1200, f1: 5200, sweep: 0.14, a: 0.01, d: 0.15, gain: 0.1 });
    var tf = t + 0.16;
    L.noiseHit(ctx, o, tf, { type: 'highpass', f: 2600, a: 0.001, d: 0.09, gain: 0.7 });                                // el destello
    L.tone(ctx, o, tf, { f0: 3200, f1: 1800, sweep: 0.06, a: 0.001, d: 0.07, gain: 0.25 });
    L.noiseHit(ctx, o, tf + 0.02, { type: 'bandpass', f: 1500, q: 1.5, a: 0.001, d: 0.02, gain: 0.45 });               // clic del obturador (abre)
    L.noiseHit(ctx, o, tf + 0.07, { type: 'bandpass', f: 1100, q: 1.5, a: 0.001, d: 0.025, gain: 0.35 });              // y cierra
    return 0.55;
  }, { cd: 0.25, dur: 0.7, prio: 3, wet: 0.14 });

  // golpe ancho de tabla de surf: fibra de vidrio hueca (golpe grave, resonancia y un «crac» de plástico)
  def('cv.tabla.golpe', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.85 * boost(d));
    L.tone(ctx, o, t, { f0: vary(150, 0.08), f1: 60, sweep: 0.1, d: 0.16, gain: 0.8 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(900, 0.1), q: 0.9, a: 0.001, d: 0.06, gain: 0.55 });
    L.modal(ctx, o, t, { freqs: [vary(260, 0.04), vary(610, 0.04), vary(1180, 0.04)], decays: [0.22, 0.12, 0.07], gains: [0.45, 0.25, 0.12], a: 0.001 });          // la tabla hueca «bonga»
    L.noiseHit(ctx, o, t + 0.003, { type: 'highpass', f: 3500, a: 0.0005, d: 0.018, gain: 0.3 });
    return 0.5;
  }, { cd: 0.06, dur: 0.6, prio: 4, wet: 0.12 });

  /* ============================================== CHEF ============================================== */
  def('cv.palito.silbido', function (ctx, out, d, L) {                                                                  // palito que pasa cortando el aire
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.6), f = vary(3300, 0.12);
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: f, f1: f * 0.45, q: 9, a: 0.03, d: 0.2, sweep: 0.2, gain: 0.6 });
    L.tone(ctx, o, t, { type: 'sine', f0: f * 0.8, f1: f * 0.38, sweep: 0.2, a: 0.03, d: 0.2, gain: 0.06 });
    return 0.45;
  }, { cd: 0.04, dur: 0.5, prio: 2, wet: 0.1 });
  def('cv.palito.toc', function (ctx, out, d, L) {                                                                      // se clava en el piso: «toc» de madera
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.002 + num(d.delay, 0), o = L.bus(ctx, out, 0.55), f = vary(860, 0.08);
    L.modal(ctx, o, t, { freqs: [f, f * 2.3, f * 3.9], decays: [0.06, 0.035, 0.02], gains: [0.6, 0.3, 0.15], a: 0.0005 });
    L.tone(ctx, o, t, { type: 'triangle', f0: 420, f1: 190, sweep: 0.04, d: 0.05, gain: 0.4 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 3600, q: 1.5, a: 0.0005, d: 0.01, gain: 0.35 });
    return 0.25;
  }, { cd: 0.03, dur: 0.3, prio: 2, wet: 0.1 });
  def('cv.dumpling.salto', function (ctx, out, d, L) {                                                                  // «boing»: seno que sube y baja con temblor de gelatina
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.5), os = ctx.createOscillator(), g = ctx.createGain(), lf = ctx.createOscillator(), lg = ctx.createGain(), f = vary(180, 0.1);
    os.type = 'sine'; os.frequency.setValueAtTime(F(f), t); os.frequency.exponentialRampToValueAtTime(F(f * 2.8), t + 0.07); os.frequency.exponentialRampToValueAtTime(F(f * 0.9), t + 0.26);
    lf.frequency.value = 24; lg.gain.setValueAtTime(f * 0.12, t + 0.07); lg.gain.setTargetAtTime(0, t + 0.1, 0.07); lf.connect(lg); lg.connect(os.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.7, t + 0.008); g.gain.setTargetAtTime(0, t + 0.1, 0.06);
    os.connect(g); g.connect(o); os.start(t); os.stop(t + 0.5); lf.start(t); lf.stop(t + 0.5);
    L.noiseHit(ctx, o, t, { type: 'lowpass', f: 600, a: 0.002, d: 0.05, gain: 0.3 });                                  // el «plof» de masa al despegar
    return 0.5;
  }, { cd: 0.08, dur: 0.55, prio: 2, wet: 0.1 });
  def('cv.dumpling.muerde', function (ctx, out, d, L) {                                                                 // «¡ñam!»: boca que se cierra, con dientitos
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.5), f = vary(250, 0.1);
    L.voice(ctx, o, t, { dur: 0.22, f0: [[0, f * 1.1], [0.5, f], [1, f * 0.8]], vowels: [[0, 'i'], [0.3, 'a'], [0.7, 'a'], [1, 'm']], amp: [[0, 0], [0.15, 1], [0.75, 0.9], [0.92, 0.15], [1, 0]], fscale: 1, bw: 1.1, breath: 0.1, jitter: 0.02, gain: 1.2 });
    L.noiseHit(ctx, o, t + 0.2, { type: 'highpass', f: 2800, a: 0.0005, d: 0.02, gain: 0.5 });                           // dientes que chocan
    L.noiseHit(ctx, o, t + 0.205, { type: 'lowpass', f: 500, a: 0.001, d: 0.07, gain: 0.4 });                           // masa que se aplasta
    return 0.5;
  }, { cd: 0.1, dur: 0.55, prio: 3, wet: 0.1 });
  def('cv.dumpling.muere', function (ctx, out, d, L) {                                                                  // «pop» del wantán que revienta, con chillido
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.5);
    L.tone(ctx, o, t, { f0: 520, f1: 1000, sweep: 0.05, d: 0.06, gain: 0.45 });
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 3000, a: 0.0005, d: 0.03, gain: 0.5 });
    L.noiseHit(ctx, o, t + 0.01, { type: 'lowpass', f: 700, a: 0.001, d: 0.08, gain: 0.4 });
    L.voice(ctx, o, t + 0.02, { dur: 0.1, f0: [[0, 900], [1, 1500]], vowels: [[0, 'i'], [1, 'i']], amp: [[0, 0], [0.2, 1], [1, 0]], fscale: 1.2, bw: 1, breath: 0.1, gain: 0.7 });
    return 0.35;
  }, { cd: 0.05, dur: 0.4, prio: 3, wet: 0.1 });

  // gong de chifa: modos inarmónicos de lámina con batido (dos parciales casi iguales), un soplo grave al principio y un fondo que se queda
  function gongHit(ctx, o, t, gn, f) {
    var R2 = [1, 1.007, 1.47, 2.02, 2.56, 3.31, 4.74, 5.93], dec = [3.4, 3.2, 2.6, 2.0, 1.4, 1.0, 0.65, 0.4], gs = [1, 0.8, 0.7, 0.55, 0.42, 0.3, 0.2, 0.12];
    L0.modal(ctx, o, t, { freqs: R2.map(function (r) { return F(f * r); }), decays: dec, gains: gs.map(function (g) { return g * gn; }), a: 0.012 });
    L0.noiseHit(ctx, o, t, { type: 'bandpass', f: 1400, q: 0.5, a: 0.02, d: 0.5, gain: 0.35 * gn });
    L0.tone(ctx, o, t, { f0: f * 0.5, f1: f * 0.46, a: 0.03, d: 1.2, gain: 0.3 * gn });
  }
  def('cv.gong', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.42 * boost(d)), sz = clamp(num(d.size, 1), 0.6, 1.6);
    gongHit(ctx, o, t, 0.9, 112 / sz);
    return 4;
  }, { cd: 0.6, dur: 4.2, prio: 5, wet: 0.3 });
  def('cv.wok', function (ctx, out, d, L) {                                                                             // golpe de cucharón en el wok: cuenco de metal
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.55), f = (d.big ? 440 : 720) * vary(1, 0.04);
    L.clang(ctx, o, t, { f: f, gain: 0.7, decay: d.big ? 0.8 : 0.5, n: 5 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 3400, q: 0.9, a: 0.0005, d: 0.02, gain: 0.4 });
    L.tone(ctx, o, t, { f0: f * 0.5, f1: f * 0.46, d: 0.3, gain: 0.2 });
    return 1.0;
  }, { cd: 0.06, dur: 1.1, prio: 4, wet: 0.2 });
  def('cv.vaporera', function (ctx, out, d, L) {                                                                        // destapa la vaporera: tapa de metal que se levanta y vapor que sisea
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.005 + num(d.delay, 0), o = L.bus(ctx, out, 0.5), D = 1.4;
    L.clang(ctx, o, t, { f: 520, gain: 0.35, decay: 0.3, n: 4 }); L.clang(ctx, o, t + 0.1, { f: 760, gain: 0.2, decay: 0.2, n: 3 });
    L.noiseHit(ctx, o, t + 0.08, { type: 'highpass', f: 2600, f1: 4800, q: 0.7, a: 0.15, d: 1.0, sweep: 1.0, gain: 0.5 });
    L.noiseHit(ctx, o, t + 0.1, { kind: 'pink', type: 'bandpass', f: 1500, q: 0.6, a: 0.12, d: 0.8, gain: 0.35 });
    return D + 0.2;
  }, { cd: 0.5, dur: 1.6, prio: 3, wet: 0.18 });
  def('cv.onda', function (ctx, out, d, L) {                                                                            // el chef cae de un salto de wok: golpe grave, onda de choque y platos
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.004 + num(d.delay, 0), o = L.bus(ctx, out, 0.8 * boost(d)), i;
    L.tone(ctx, o, t, { f0: 95, f1: 28, sweep: 0.5, d: 0.7, gain: 1 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 380, q: 0.7, a: 0.002, d: 0.5, gain: 0.9 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 1000, q: 0.7, a: 0.001, d: 0.08, gain: 0.5 });
    L.clang(ctx, o, t + 0.01, { f: 330, gain: 0.5, decay: 0.7, n: 5 });
    for (i = 0; i < 6; i++) L.clang(ctx, o, t + 0.12 + i * rr(0.05, 0.12), { f: rr(500, 1300), gain: 0.18 * (1 - i * 0.1), decay: 0.12, n: 3 });
    return 1.5;
  }, { cd: 0.4, dur: 1.6, prio: 5, wet: 0.2 });
  def('cv.chef.caida', function (ctx, out, d, L) {                                                                      // cae de espaldas como una montaña: sub grave, gong, wok que rueda
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.005 + num(d.delay, 0), o = L.bus(ctx, out, 0.8 * boost(d)), i;
    L.tone(ctx, o, t, { f0: 80, f1: 24, sweep: 0.9, a: 0.01, d: 1.2, gain: 1 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 300, q: 0.7, a: 0.01, d: 0.9, gain: 1 });
    gongHit(ctx, o, t + 0.25, 0.7, 96);
    for (i = 0; i < 14; i++) L.clang(ctx, o, t + 0.6 + i * (0.09 + i * 0.012), { f: rr(300, 600), gain: 0.22 * (1 - i * 0.05), decay: 0.25, n: 3 });      // el wok rueda y se asienta
    return 4.6;
  }, { cd: 1, dur: 4.8, prio: 5, wet: 0.25 });

  /* ============================================== CAÍDA EN PARAPENTE ============================================== */
  // flechita fosforescente: el soltar de la resortera, y un «fiuu» brillante que sube y se apaga. c = color 0..3 → pentatónica (verde, rosado, amarillo, celeste)
  var PENT = [1, 1.2599, 1.4983, 1.7818];
  def('cv.flecha', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.55), p = PENT[clamp(Math.round(num(d.c, 0)), 0, 3)] * vary(1, 0.01), f = 1500 * p;
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'lowpass', f: 2200, a: 0.001, d: 0.05, gain: 0.35 });                    // «tuip» de la liga
    L.tone(ctx, o, t, { f0: 420, f1: 260, sweep: 0.05, d: 0.06, gain: 0.25 });
    L.tone(ctx, o, t + 0.01, { f0: f, f1: f * 2.1, sweep: 0.13, a: 0.005, d: 0.2, gain: 0.5 });
    L.tone(ctx, o, t + 0.01, { type: 'triangle', f0: f * 1.5, f1: f * 3.1, sweep: 0.13, a: 0.005, d: 0.18, gain: 0.2 });
    for (var i = 0; i < 3; i++) L.tone(ctx, o, t + 0.05 + i * 0.04, { f0: F(f * rr(2.4, 3.6)), a: 0.001, d: 0.03, gain: 0.08 });   // chispas
    return 0.45;
  }, { cd: 0.05, dur: 0.5, prio: 3, wet: 0.2 });
  def('cv.flecha.golpe', function (ctx, out, d, L) {                                                                    // la flecha le pega al Tablazo / a una vela: ping y chasquido
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.5);
    L.modal(ctx, o, t, { freqs: [2400, 3600, 5200].map(function (f) { return f * vary(1, 0.02); }), decays: [0.12, 0.08, 0.05], gains: [0.4, 0.25, 0.15], a: 0.0006 });
    L.tone(ctx, o, t, { f0: 800, f1: 300, sweep: 0.05, d: 0.06, gain: 0.4 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 2000, q: 1, a: 0.0005, d: 0.03, gain: 0.4 });
    return 0.35;
  }, { cd: 0.05, dur: 0.4, prio: 4, wet: 0.15 });
  def('cv.tabla.rompe', function (ctx, out, d, L) {                                                                     // una flechita rompe una tabla en el aire: crujido de fibra
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.7), i;
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 1600, a: 0.001, d: 0.12, gain: 0.6 });
    L.modal(ctx, o, t, { freqs: [900, 1700, 2600].map(function (f) { return f * vary(1, 0.05); }), decays: [0.1, 0.07, 0.04], gains: [0.3, 0.2, 0.12], a: 0.0006 });
    L.tone(ctx, o, t, { f0: 200, f1: 70, sweep: 0.1, d: 0.12, gain: 0.55 });
    for (i = 0; i < 5; i++) L.noiseHit(ctx, o, t + 0.04 + i * rr(0.02, 0.06), { type: 'bandpass', f: rr(1500, 4500), q: 2, a: 0.0005, d: 0.01, gain: 0.15 });    // astillas
    return 0.6;
  }, { cd: 0.05, dur: 0.7, prio: 4, wet: 0.14 });
  def('cv.splash', function (ctx, out, d, L) {                                                                          // el Tablazo cae al mar: plaf grande, burbujas, rocío
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.005 + num(d.delay, 0), o = L.bus(ctx, out, 0.75 * boost(d)), i;
    L.tone(ctx, o, t, { f0: 110, f1: 38, sweep: 0.4, a: 0.005, d: 0.6, gain: 0.9 });
    L.noiseHit(ctx, o, t, { type: 'lowpass', f: 2400, f1: 500, q: 0.7, a: 0.01, d: 0.9, sweep: 0.8, gain: 0.9 });
    L.noiseHit(ctx, o, t + 0.02, { type: 'highpass', f: 3500, a: 0.01, d: 0.6, gain: 0.45 });
    for (i = 0; i < 8; i++) L.tone(ctx, o, t + 0.12 + i * rr(0.03, 0.09), { f0: rr(300, 700), f1: rr(800, 1500), sweep: 0.05, a: 0.002, d: 0.05, gain: 0.12 });
    return 1.8;
  }, { cd: 0.5, dur: 2, prio: 5, wet: 0.3 });
  def('cv.parapente.abre', function (ctx, out, d, L) {                                                                  // la vela se infla: tela que flamea y «fump» de aire
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.004 + num(d.delay, 0), o = L.bus(ctx, out, 0.6), g = ctx.createGain(), ns = L.noiseSrc(ctx, 'pink', t, 0.9), bp = L.filter(ctx, 'bandpass', 400, 0.8), lf = ctx.createOscillator(), lg = ctx.createGain();
    bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(1100, t + 0.4); bp.frequency.exponentialRampToValueAtTime(600, t + 0.8);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.8, t + 0.12); g.gain.setTargetAtTime(0, t + 0.3, 0.14);
    lf.frequency.value = 17; lg.gain.value = 0.3; lf.connect(lg); lg.connect(g.gain); lf.start(t); lf.stop(t + 1);
    ns.connect(bp); bp.connect(g); g.connect(o);
    L.tone(ctx, o, t + 0.08, { f0: 90, f1: 42, sweep: 0.3, a: 0.01, d: 0.35, gain: 0.6 });
    return 1.0;
  }, { cd: 0.4, dur: 1.1, prio: 4, wet: 0.15 });
  def('cv.pelicano', function (ctx, out, d, L) {                                                                        // pelícano que pasa: aleteos lentos y pesados
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.01 + num(d.delay, 0), o = L.bus(ctx, out, 0.5 * boost(d)), ts = [], x = rr(0, 0.1), i;
    for (i = 0; i < 4; i++) { ts.push(x); x += vary(0.34, 0.1); }
    L.flaps(ctx, o, t, ts, { gain: 0.5, pitch: 0.5, low: 1.2 });
    return 1.8;
  }, { cd: 1, dur: 1.9, prio: 2, wet: 0.2 });

  /* ============================================== BUCLES ============================================== */
  // viento del parapente: ruido en banda que sube con la velocidad, con ráfagas lentas. {speed} 0..1
  def('cv.viento', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var o = L.bus(ctx, out, 0.6);
    function lv(h) { return h.data.gust ? 0.9 : clamp(num(h.data.speed, num(h.data.intensity, 0.5)), 0, 1); }
    function apply(h, t) { var k = lv(h); h.mg.gain.setTargetAtTime(0.06 + 0.7 * k, t, 0.15); h.bp.frequency.setTargetAtTime(F(420 + 1500 * k), t, 0.2); h.hg.gain.setTargetAtTime(0.02 + 0.3 * k * k, t, 0.2); }
    return L.loop(ctx, o, {
      data: d,
      setup: function (h) {
        var n1 = h.src('pink'), n2 = h.src('white'), hp = L.filter(ctx, 'highpass', 90, 0.7), hh = L.filter(ctx, 'highpass', 3800, 0.7);
        h.bp = L.filter(ctx, 'bandpass', 900, 0.5); h.mg = ctx.createGain(); h.mg.gain.value = 0; h.hg = ctx.createGain(); h.hg.gain.value = 0;
        n1.connect(h.bp); h.bp.connect(hp); hp.connect(h.mg); h.mg.connect(h.out);
        n2.connect(hh); hh.connect(h.hg); h.hg.connect(h.out);                                                          // silbido agudo del viento rápido
        var gl = h.osc('sine', 0.27), gg = ctx.createGain(); gg.gain.value = 0.2; gl.connect(gg); gg.connect(h.mg.gain);   // ráfagas lentas
        apply(h, h.t0);
      },
      set: function (h) { apply(h, ctx.currentTime); },
      step: function (h, t) { apply(h, t); return t + 0.25; }
    });
  }, { cd: 0.3, dur: 2, prio: 2, wet: 0.05, loop: true });

  // tabla de surf girando por el aire: ruido en banda con modulación de amplitud a la velocidad de giro (la «hélice») y un golpe grave por vuelta. {speed} 0..1
  def('cv.tabla.gira.loop', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var o = L.bus(ctx, out, 0.45);
    function lv(h) { return clamp(num(h.data.speed, 0.6), 0, 1); }
    function apply(h, t) { var k = lv(h); h.lf.frequency.setTargetAtTime(5 + 4 * k, t, 0.1); h.bp.frequency.setTargetAtTime(F(700 + 900 * k), t, 0.15); h.og.gain.setTargetAtTime(0.4 + 0.5 * k, t, 0.1); }
    return L.loop(ctx, o, {
      data: d,
      setup: function (h) {
        var n1 = h.src('pink'); h.bp = L.filter(ctx, 'bandpass', 1200, 1.4); h.am = ctx.createGain(); h.am.gain.value = 0.5; h.og = ctx.createGain(); h.og.gain.value = 0.7;
        h.lf = h.osc('sine', 7); var lg = ctx.createGain(); lg.gain.value = 0.5; h.lf.connect(lg); lg.connect(h.am.gain);
        n1.connect(h.bp); h.bp.connect(h.am); h.am.connect(h.og); h.og.connect(h.out);
        var sb = h.osc('triangle', 110), sg = ctx.createGain(); sg.gain.value = 0.08; var ml = h.osc('sine', 7), mg = ctx.createGain(); mg.gain.value = 0.08; ml.connect(mg); mg.connect(sg.gain);   // zumbido grave de la masa, con el mismo giro
        sb.connect(sg); sg.connect(h.out);
        apply(h, h.t0);
      },
      set: function (h) { apply(h, ctx.currentTime); },
      step: function (h, t) { apply(h, t); return t + 0.25; }
    });
  }, { cd: 0.3, dur: 2, prio: 3, wet: 0.08, loop: true });

  // oleaje del malecón: marea que sube y baja (dos LFO lentos, no sincronizados) sobre ruido rosa grave + espuma aguda que acompaña a la cresta. {intensity} 0..1
  def('cv.olas', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var o = L.bus(ctx, out, 0.6);
    function ik(h) { return clamp(num(h.data.intensity, 0.7), 0, 1.3); }
    function apply(h, t) { var k = ik(h); h.g1.gain.setTargetAtTime(0.06 + 0.3 * k, t, 0.5); h.g2.gain.setTargetAtTime(0.01 + 0.1 * k, t, 0.5); }
    return L.loop(ctx, o, {
      data: d,
      setup: function (h) {
        var n1 = h.src('pink'), b1 = L.filter(ctx, 'lowpass', 750, 0.6); h.g1 = ctx.createGain(); h.g1.gain.value = 0.1; n1.connect(b1); b1.connect(h.g1); h.g1.connect(h.out);
        var n2 = h.src('white'), b2 = L.filter(ctx, 'bandpass', 3200, 0.5); h.g2 = ctx.createGain(); h.g2.gain.value = 0.03; n2.connect(b2); b2.connect(h.g2); h.g2.connect(h.out);
        var l1 = h.osc('sine', 0.09), lg1 = ctx.createGain(); lg1.gain.value = 0.07; l1.connect(lg1); lg1.connect(h.g1.gain);
        var l2 = h.osc('sine', 0.063), lg2 = ctx.createGain(); lg2.gain.value = 0.03; l2.connect(lg2); lg2.connect(h.g2.gain);
        var l3 = h.osc('sine', 0.09), lg3 = ctx.createGain(); lg3.gain.value = 600; l3.connect(lg3); lg3.connect(b1.frequency);      // el rugido de la ola se abre al subir
        apply(h, h.t0);
      },
      set: function (h) { apply(h, ctx.currentTime); },
      step: function (h, t) { apply(h, t); return t + 0.5; }
    });
  }, { cd: 0.3, dur: 2, prio: 1, wet: 0.15, loop: true });

  /* ============================================== GAVIOTA ============================================== */
  // grito de gaviota: «kiáaah, kia, kia», voz aguda con formantes abiertos y algo de aspereza
  def('cv.gaviota', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.01 + num(d.delay, 0), o = L.bus(ctx, out, 0.6 * boost(d)), n = 2 + ((rnd() * 2) | 0), i, tt = t, p = vary(1, 0.08);
    for (i = 0; i < n; i++) {
      var du = i === 0 ? vary(0.7, 0.15) : vary(0.32, 0.2);
      L.voice(ctx, o, tt, { dur: du, f0: [[0, 1150 * p], [0.18, 2000 * p], [0.55, 1650 * p], [1, 1000 * p]], vowels: [[0, 'i'], [0.3, 'ae'], [0.7, 'a'], [1, 'e']], amp: [[0, 0], [0.1, 1], [0.6, 0.8], [1, 0]],
        fscale: 1.4, bw: 1.2, breath: 0.2, rasp: 0.3, raspHz: 55, vib: 0.02, vibHz: 9, jitter: 0.03, gain: 1.4 });
      tt += du + vary(0.1, 0.4);
    }
    return (tt - t) + 0.4;
  }, { cd: 2, dur: 2.2, prio: 2, wet: 0.3 });

  /* ============================================== NOMBRES DE LOS SISTEMAS DEL JUEGO ============================================== */
  function props(n) { var T = R[n]; return { cd: T.cooldown, dur: T.dur, prio: T.priority, wet: T.wet }; }
  function call(n, ctx, out, d, L, e) { return R[n](ctx, out, e ? mix(d, e) : d, L || L0); }
  function ali(name, target, mapper) {                    // alias de un sonido que ya existe (mapper(d) → datos para el original)
    def(name, function (ctx, out, d, L) { d = d || {}; return call(target, ctx, out, d, L, mapper ? mapper(d) : null); }, props(target));
  }
  function sizeK(d) { return { chico: 1.35, medio: 1, grande: 0.62, pug: 1.0 }[d.size] || 1; }
  function colorK(d) { var c = String(d.color || ''); return /ros|pink|f0|ff2e|ff4/i.test(c) ? 1 : /amar|yel|ffe/i.test(c) ? 2 : /cel|cyan|blue|3bd|8f/i.test(c) ? 3 : 0; }

  ali('cv.barra.swing', 'cv.fosfo.zumbido'); ali('cv.barra.hit', 'cv.fosfo.golpe');
  ali('cv.helado.tiro', 'cv.helado.lanza'); ali('cv.helado.lamer', 'cv.lamida'); ali('cv.perro.gemido', 'cv.gemido');
  ali('cv.pelota.patada', 'cv.patada'); ali('cv.pelota.bote', 'cv.rebote'); ali('cv.chef.muere', 'cv.chef.caida'); ali('cv.parapente', 'cv.parapente.abre');

  def('cv.pelota.rebote', function (ctx, out, d, L) {                                                                    // {soft}: bote flojo · {hit}: rebota en un zombie
    d = d || {};
    var r = call('cv.rebote', ctx, out, d, L, { v: d.soft ? 0.25 : d.hit ? 0.95 : 0.6 });
    if (d.hit) { var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = (L || L0).bus(ctx, out, 0.5); (L || L0).noiseHit(ctx, o, t, { type: 'bandpass', f: 1800, q: 1, a: 0.001, d: 0.025, gain: 0.5 }); }
    return r;
  }, { cd: 0.05, dur: 0.35, prio: 3, wet: 0.1 });
  def('cv.pelota.golpe', function (ctx, out, d, L) {                                                                     // la pelota le pega a un zombie ({killed}: más fuerte, con crujido)
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, d.killed ? 0.95 : 0.75);
    L.tone(ctx, o, t, { f0: 120, f1: 52, sweep: 0.1, d: 0.14, gain: 0.8 });
    L.noiseHit(ctx, o, t, { type: 'lowpass', f: 520, a: 0.001, d: 0.07, gain: 0.7 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 1500, q: 1, a: 0.0005, d: 0.02, gain: 0.5 });
    if (d.killed) { L.noiseHit(ctx, o, t + 0.04, { type: 'bandpass', f: 700, q: 2, a: 0.002, d: 0.1, gain: 0.35 }); L.tone(ctx, o, t + 0.03, { f0: 90, f1: 40, sweep: 0.2, d: 0.25, gain: 0.45 }); }
    return 0.5;
  }, { cd: 0.05, dur: 0.55, prio: 4, wet: 0.1 });
  def('cv.patadita', function (ctx, out, d, L) {                                                                         // empujoncito con el pie a un perro: golpe blando y roce
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.55);
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 900, f1: 400, q: 0.9, a: 0.01, d: 0.07, sweep: 0.07, gain: 0.35 });
    L.tone(ctx, o, t + 0.04, { f0: 150, f1: 70, sweep: 0.07, d: 0.09, gain: 0.55 });
    L.noiseHit(ctx, o, t + 0.04, { type: 'lowpass', f: 500, a: 0.002, d: 0.04, gain: 0.4 });
    return 0.35;
  }, { cd: 0.1, dur: 0.4, prio: 3, wet: 0.1 });

  def('cv.perro.mordida', function (ctx, out, d, L) {                                                                    // gruñido corto y dos mordidas ({size})
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.005 + num(d.delay, 0), o = L.bus(ctx, out, 0.32), k = sizeK(d), f = 210 * k * vary(1, 0.08), i;
    L.voice(ctx, o, t, { dur: 0.32, f0: [[0, f], [0.5, f * 0.9], [1, f * 0.8]], vowels: [[0, 'o'], [0.5, 'a'], [1, 'u']], amp: [[0, 0], [0.15, 1], [0.8, 0.8], [1, 0]], fscale: 0.95, bw: 1.2, breath: 0.4, rasp: 0.6, raspHz: 30, jitter: 0.04, gain: 1.6, drive: 0.4 });
    for (i = 0; i < 2; i++) L.noiseHit(ctx, o, t + 0.05 + i * 0.16, { type: 'bandpass', f: 2200, q: 1.2, a: 0.0005, d: 0.02, gain: 0.35 });
    return 0.7;
  }, { cd: 0.2, dur: 0.8, prio: 3, wet: 0.14 });
  def('cv.perro.contento', function (ctx, out, d, L) {                                                                   // ladridito alegre y jadeo
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.005 + num(d.delay, 0), o = L.bus(ctx, out, 0.3), k = sizeK(d), base = 560 * Math.pow(k, 0.8) * vary(1, 0.08), i, tt = t;
    for (i = 0; i < 2; i++) { bark(ctx, o, L, tt, base * (1 + i * 0.08), 0.11, { fall: 0.85, vowels: [[0, 'i'], [0.3, 'a'], [1, 'o']], gain: 1.7, nf: 3000, ng: 0.12 }); tt += 0.2; }
    for (i = 0; i < 4; i++) L.noiseHit(ctx, o, tt + 0.05 + i * 0.13, { type: 'bandpass', f: 1500, q: 1.2, a: 0.02, d: 0.07, gain: 0.25 });          // jadeo
    return (tt - t) + 0.8;
  }, { cd: 0.4, dur: 1.4, prio: 2, wet: 0.14 });

  // el chef: gruñidos de esfuerzo (voz grave de formantes). Sin palabras ni acentos.
  def('cv.chef.alza', function (ctx, out, d, L) {                                                                        // levanta los brazos: resoplido, tela y un zumbido grave de aviso
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.005 + num(d.delay, 0), o = L.bus(ctx, out, 0.6);
    L.voice(ctx, o, t, { dur: 0.5, f0: [[0, 95], [0.5, 125], [1, 108]], vowels: [[0, 'o'], [1, 'a']], amp: [[0, 0], [0.3, 0.8], [0.8, 0.8], [1, 0]], fscale: 0.85, bw: 1.2, breath: 0.45, vib: 0.015, vibHz: 6, jitter: 0.03, gain: 1.3 });
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 500, f1: 1100, q: 0.7, a: 0.2, d: 0.35, sweep: 0.4, gain: 0.4 });
    return 0.9;
  }, { cd: 0.4, dur: 1, prio: 3, wet: 0.2 });
  def('cv.chef.duele', function (ctx, out, d, L) {                                                                       // «¡uf!»: lo golpean en la barriga
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.65);
    L.voice(ctx, o, t, { dur: 0.35, f0: [[0, 150], [1, 85]], vowels: [[0, 'o'], [0.4, 'a'], [1, 'u']], amp: [[0, 0], [0.1, 1], [0.7, 0.7], [1, 0]], fscale: 0.85, bw: 1.2, breath: 0.3, rasp: 0.3, raspHz: 35, jitter: 0.03, gain: 1.8, drive: 0.3 });
    L.tone(ctx, o, t, { f0: 80, f1: 42, sweep: 0.12, d: 0.15, gain: 0.5 });
    return 0.6;
  }, { cd: 0.2, dur: 0.7, prio: 4, wet: 0.2 });
  def('cv.chef.grito', function (ctx, out, d, L) {                                                                       // «¡HAAA!» grave y largo al llamar a los dumplings
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.005 + num(d.delay, 0), o = L.bus(ctx, out, 0.65), D = 0.9;
    L.voice(ctx, o, t, { dur: D, f0: [[0, 110], [0.2, 175], [0.7, 160], [1, 100]], vowels: [[0, 'o'], [0.25, 'a'], [0.8, 'a'], [1, 'o']], amp: [[0, 0], [0.1, 1], [0.8, 0.9], [1, 0]], fscale: 0.88, bw: 1.2, breath: 0.2, rasp: 0.35, raspHz: 40, vib: 0.015, vibHz: 6, jitter: 0.02, gain: 2, drive: 0.5 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 300, a: 0.05, d: 0.6, gain: 0.4 });
    return D + 0.3;
  }, { cd: 0.5, dur: 1.4, prio: 4, wet: 0.25 });
  def('cv.chef.salta', function (ctx, out, d, L) {                                                                       // «¡hup!» y el aire que levanta su peso
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.6);
    L.voice(ctx, o, t, { dur: 0.25, f0: [[0, 120], [1, 160]], vowels: [[0, 'u'], [1, 'a']], amp: [[0, 0], [0.2, 1], [1, 0]], fscale: 0.9, bw: 1.2, breath: 0.35, jitter: 0.03, gain: 1.7 });
    L.tone(ctx, o, t, { f0: 60, f1: 130, sweep: 0.2, a: 0.02, d: 0.3, gain: 0.5 });
    L.noiseHit(ctx, o, t + 0.05, { kind: 'pink', type: 'bandpass', f: 400, f1: 1200, q: 0.7, a: 0.1, d: 0.3, sweep: 0.3, gain: 0.35 });
    return 0.7;
  }, { cd: 0.4, dur: 0.8, prio: 4, wet: 0.2 });

  def('cv.dumpling.golpe', function (ctx, out, d, L) {                                                                   // le pegan a un dumpling: golpe blando y chillido
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.55);
    L.tone(ctx, o, t, { f0: 210, f1: 90, sweep: 0.07, d: 0.09, gain: 0.55 });
    L.noiseHit(ctx, o, t, { type: 'lowpass', f: 800, a: 0.001, d: 0.06, gain: 0.5 });
    L.voice(ctx, o, t + 0.01, { dur: 0.1, f0: [[0, 1000], [1, 650]], vowels: [[0, 'i'], [1, 'e']], amp: [[0, 0], [0.2, 1], [1, 0]], fscale: 1.2, bw: 1, breath: 0.1, gain: 0.7 });
    return 0.35;
  }, { cd: 0.05, dur: 0.4, prio: 3, wet: 0.1 });
  def('cv.dumpling.salen', function (ctx, out, d, L) {                                                                   // la vaporera suelta {n} dumplings: plof-boing escalonado, con vapor
    d = d || {}; L = L || L0;
    var n = clamp(Math.round(num(d.n, 3)), 1, 6), i, base = num(d.delay, 0);
    for (i = 0; i < n; i++) call('cv.dumpling.salto', ctx, out, d, L, { delay: base + 0.05 + i * 0.13, n: 1 });
    var t = ctx.currentTime + 0.003 + base, o = L.bus(ctx, out, 0.3);
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 3000, a: 0.05, d: 0.5, gain: 0.3 });
    return n * 0.13 + 0.7;
  }, { cd: 0.3, dur: 1.5, prio: 3, wet: 0.15 });

  def('cv.palito', function (ctx, out, d, L) {                                                                           // abanico de {n} palitos: silbidos casi juntos
    d = d || {};
    var n = clamp(Math.round(num(d.n, 5)), 1, 9), i, base = num(d.delay, 0);
    for (i = 0; i < n; i++) call('cv.palito.silbido', ctx, out, d, L, { delay: base + i * 0.014 });
    return 0.7;
  }, { cd: 0.2, dur: 0.8, prio: 3, wet: 0.1 });
  def('cv.palito.lluvia', function (ctx, out, d, L) {                                                                    // lluvia: silbidos que caen a destiempo y luego los «toc» al clavarse
    d = d || {};
    var i, base = num(d.delay, 0);
    for (i = 0; i < 8; i++) call('cv.palito.silbido', ctx, out, d, L, { delay: base + i * 0.04 + rnd() * 0.04 });
    for (i = 0; i < 8; i++) call('cv.palito.toc', ctx, out, d, L, { delay: base + 0.55 + i * 0.05 + rnd() * 0.06 });
    return 1.4;
  }, { cd: 0.4, dur: 1.5, prio: 3, wet: 0.1 });

  def('cv.wok.rueda', function (ctx, out, d, L) {                                                                        // el wok rueda por la terraza y se asienta: tintineos cada vez más juntos
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.005 + num(d.delay, 0), o = L.bus(ctx, out, 0.5), i, tt = t, gap = 0.2;
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 450, a: 0.1, d: 1.4, gain: 0.5 });
    for (i = 0; i < 12; i++) { L.clang(ctx, o, tt, { f: rr(480, 640), gain: 0.35 * (1 - i * 0.06), decay: 0.3, n: 4 }); tt += gap; gap = Math.max(0.035, gap * 0.8); }
    return (tt - t) + 0.8;
  }, { cd: 0.5, dur: 2.4, prio: 3, wet: 0.2 });

  // rejas y barandas
  function creak(ctx, o, L, t, D, f) {                                                                                   // chirrido de bisagra: sierra lenta por un filtro estrecho que sube y baja
    var os = ctx.createOscillator(), bp = L.filter(ctx, 'bandpass', f, 6), g = ctx.createGain(), lf = ctx.createOscillator(), lg = ctx.createGain();
    os.type = 'sawtooth'; os.frequency.setValueAtTime(F(f * 0.28), t); os.frequency.linearRampToValueAtTime(F(f * 0.4), t + D);
    bp.frequency.setValueAtTime(F(f), t); bp.frequency.linearRampToValueAtTime(F(f * 1.8), t + D * 0.6); bp.frequency.linearRampToValueAtTime(F(f * 1.2), t + D);
    lf.frequency.value = 11; lg.gain.value = f * 0.01; lf.connect(lg); lg.connect(os.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.1); g.gain.setValueAtTime(0.35, t + D * 0.8); g.gain.linearRampToValueAtTime(0, t + D);
    os.connect(bp); bp.connect(g); g.connect(o); os.start(t); lf.start(t); os.stop(t + D + 0.1); lf.stop(t + D + 0.1);
  }
  def('cv.reja.abre', function (ctx, out, d, L) {                                                                        // portón de chifa que se abre: chirrido y golpe al tope
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.005 + num(d.delay, 0), o = L.bus(ctx, out, 0.6), D = 1.0, i;
    L.clang(ctx, o, t, { f: 300, gain: 0.35, decay: 0.2, n: 3 });                                                           // se suelta el pasador
    creak(ctx, o, L, t + 0.1, D, 1400);
    for (i = 0; i < 4; i++) L.clang(ctx, o, t + 0.15 + i * rr(0.1, 0.2), { f: rr(500, 900), gain: 0.1, decay: 0.08, n: 2 });   // las barras que vibran
    L.clang(ctx, o, t + D + 0.12, { f: 220, gain: 0.7, decay: 0.7, n: 5 }); L.tone(ctx, o, t + D + 0.12, { f0: 90, f1: 45, sweep: 0.2, d: 0.3, gain: 0.5 });   // golpe al tope
    return D + 1.2;
  }, { cd: 0.5, dur: 2.4, prio: 4, wet: 0.25 });
  def('cv.reja.cierra', function (ctx, out, d, L) {                                                                      // se cierra de golpe: portazo metálico, traqueteo y pasador
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.005 + num(d.delay, 0), o = L.bus(ctx, out, 0.65), i;
    creak(ctx, o, L, t, 0.35, 1600);
    L.clang(ctx, o, t + 0.35, { f: 210, gain: 0.8, decay: 0.8, n: 5 }); L.tone(ctx, o, t + 0.35, { f0: 90, f1: 40, sweep: 0.2, d: 0.35, gain: 0.6 });
    L.noiseHit(ctx, o, t + 0.35, { type: 'bandpass', f: 1800, q: 0.8, a: 0.0005, d: 0.04, gain: 0.5 });
    for (i = 0; i < 6; i++) L.clang(ctx, o, t + 0.4 + i * rr(0.04, 0.09), { f: rr(500, 1100), gain: 0.14 * (1 - i * 0.12), decay: 0.1, n: 2 });
    L.clang(ctx, o, t + 0.85, { f: 900, gain: 0.3, decay: 0.12, n: 2 });                                                    // pasador
    return 1.8;
  }, { cd: 0.5, dur: 2, prio: 4, wet: 0.25 });
  def('cv.reja', function (ctx, out, d, L) { d = d || {}; return R[d.close ? 'cv.reja.cierra' : 'cv.reja.abre'](ctx, out, d, L); }, { cd: 0.5, dur: 2.4, prio: 4, wet: 0.25 });
  def('cv.baranda', function (ctx, out, d, L) {                                                                          // baranda de vidrio y metal que se abre: pasador, deslizamiento y tope suave
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.005 + num(d.delay, 0), o = L.bus(ctx, out, 0.5);
    L.clang(ctx, o, t, { f: 700, gain: 0.3, decay: 0.15, n: 3 });
    L.noiseHit(ctx, o, t + 0.12, { type: 'bandpass', f: 1200, f1: 2200, q: 2, a: 0.05, d: 0.5, sweep: 0.5, gain: 0.35 });
    L.clang(ctx, o, t + 0.75, { f: 420, gain: 0.5, decay: 0.4, n: 4 }); L.tone(ctx, o, t + 0.75, { f0: 110, f1: 55, sweep: 0.15, d: 0.2, gain: 0.35 });
    return 1.6;
  }, { cd: 0.5, dur: 1.8, prio: 4, wet: 0.25 });

  // barra fosforescente: partirla para encenderla, tirarla, que caiga al suelo y que se apague
  def('cv.barra.crack', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.7), p = PENT[colorK(d)];
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 2500, a: 0.0005, d: 0.012, gain: 0.7 });
    L.modal(ctx, o, t, { freqs: [1400, 2900, 4300].map(function (f) { return f * vary(1, 0.04); }), decays: [0.04, 0.025, 0.015], gains: [0.4, 0.25, 0.12], a: 0.0005 });
    L.noiseHit(ctx, o, t + 0.03, { type: 'bandpass', f: 3500, q: 1.5, a: 0.04, d: 0.3, gain: 0.18 });                       // burbujeo del líquido
    L.tone(ctx, o, t + 0.05, { f0: 600 * p, f1: 1500 * p, sweep: 0.15, a: 0.02, d: 0.2, gain: 0.07 });                      // se enciende
    return 0.6;
  }, { cd: 0.1, dur: 0.7, prio: 3, wet: 0.12 });
  def('cv.barra.tiro', function (ctx, out, d, L) {                                                                       // la tira girando: soplido con modulación de giro y zumbido
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.7), g = ctx.createGain(), ns = L.noiseSrc(ctx, 'pink', t, 0.5), bp = L.filter(ctx, 'bandpass', 800, 1.2), lf = ctx.createOscillator(), lg = ctx.createGain();
    bp.frequency.setValueAtTime(800, t); bp.frequency.exponentialRampToValueAtTime(1700, t + 0.3);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.7, t + 0.05); g.gain.setTargetAtTime(0, t + 0.2, 0.08);
    lf.frequency.value = 13; lg.gain.value = 0.4; lf.connect(lg); lg.connect(g.gain); lf.start(t); lf.stop(t + 0.6);
    ns.connect(bp); bp.connect(g); g.connect(o);
    L.tone(ctx, o, t, { type: 'sawtooth', f0: 120, f1: 220, sweep: 0.25, a: 0.03, d: 0.25, gain: 0.06 });
    return 0.6;
  }, { cd: 0.1, dur: 0.7, prio: 3, wet: 0.12 });
  def('cv.barra.cae', function (ctx, out, d, L) {                                                                        // cae al piso: tres golpecitos de plástico hueco que se apagan
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.6), i, tt = t, gap = 0.1;
    for (i = 0; i < 3; i++) { L.modal(ctx, o, tt, { freqs: [980 * vary(1, 0.05), 2100, 3500], decays: [0.07, 0.04, 0.02], gains: [0.5 * (1 - i * 0.3), 0.25, 0.12], a: 0.0005 }); L.noiseHit(ctx, o, tt, { type: 'bandpass', f: 2500, q: 1.2, a: 0.0005, d: 0.012, gain: 0.3 * (1 - i * 0.3) }); tt += gap; gap *= 0.65; }
    return 0.7;
  }, { cd: 0.1, dur: 0.8, prio: 3, wet: 0.12 });
  def('cv.barra.off', function (ctx, out, d, L) {                                                                        // se apaga: el zumbido cae y muere
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.5), os = ctx.createOscillator(), lp = L.filter(ctx, 'lowpass', 1500, 1), g = ctx.createGain();
    os.type = 'sawtooth'; os.frequency.setValueAtTime(260, t); os.frequency.exponentialRampToValueAtTime(55, t + 0.4);
    lp.frequency.setValueAtTime(1500, t); lp.frequency.exponentialRampToValueAtTime(200, t + 0.4);
    g.gain.setValueAtTime(0.4, t); g.gain.setTargetAtTime(0, t + 0.15, 0.1);
    os.connect(lp); lp.connect(g); g.connect(o); os.start(t); os.stop(t + 0.6);
    L.noiseHit(ctx, o, t + 0.38, { type: 'bandpass', f: 3000, q: 4, a: 0.0005, d: 0.01, gain: 0.15 });
    return 0.65;
  }, { cd: 0.1, dur: 0.7, prio: 2, wet: 0.1 });

  // parapente: los pasos de la carrera al borde (grava y tela)
  def('cv.parapente.corre', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.005 + num(d.delay, 0), o = L.bus(ctx, out, 0.6), i, tt = t, gap = 0.22, g = ctx.createGain(), ns = L.noiseSrc(ctx, 'pink', t, 1.3), bp = L.filter(ctx, 'bandpass', 500, 0.8);
    for (i = 0; i < 6; i++) {
      L.noiseHit(ctx, o, tt, { type: 'bandpass', f: rr(900, 1400), q: 0.9, a: 0.002, d: 0.05, gain: 0.45 }); L.tone(ctx, o, tt, { f0: 130, f1: 70, sweep: 0.05, d: 0.06, gain: 0.35 });
      tt += gap; gap = Math.max(0.1, gap * 0.85);
    }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 1.0); g.gain.setTargetAtTime(0, t + 1.05, 0.1);
    bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(1100, t + 1.0);
    ns.connect(bp); bp.connect(g); g.connect(o);                                                                            // la tela que se llena de aire
    return (tt - t) + 0.5;
  }, { cd: 0.5, dur: 1.6, prio: 3, wet: 0.12 });

  // tabla que gira: golpe de aire (NO bucle; el bucle es cv.tabla.gira.loop). {intro, rage, wave, kind}
  def('cv.tabla.gira', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003 + num(d.delay, 0), D = d.wave ? 1.0 : d.intro ? 1.1 : d.rage ? 0.9 : 0.45, o = L.bus(ctx, out, d.rage || d.intro ? 0.7 : 0.45), g = ctx.createGain();
    var ns = L.noiseSrc(ctx, 'pink', t, D + 0.2), bp = L.filter(ctx, 'bandpass', 600, 1.1), lf = ctx.createOscillator(), lg = ctx.createGain();
    bp.frequency.setValueAtTime(d.rage ? 300 : 700, t); bp.frequency.exponentialRampToValueAtTime(d.rage ? 1200 : 1600, t + D * 0.5); bp.frequency.exponentialRampToValueAtTime(d.wave ? 500 : 900, t + D);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.8, t + D * 0.35); g.gain.setTargetAtTime(0, t + D * 0.55, D * 0.15);
    lf.frequency.value = d.wave ? 5 : 9; lg.gain.value = 0.4; lf.connect(lg); lg.connect(g.gain); lf.start(t); lf.stop(t + D + 0.2);
    ns.connect(bp); bp.connect(g); g.connect(o);
    if (d.rage || d.intro) L.tone(ctx, o, t, { f0: 70, f1: d.rage ? 40 : 110, sweep: D * 0.8, a: 0.05, d: D * 0.7, gain: 0.5 });
    return D + 0.3;
  }, { cd: 0.08, dur: 1.3, prio: 3, wet: 0.1 });

  // flecha: {snap} solo el soltar de la liga; {fan} abanico de 3 con tres colores
  var flechaBase = R['cv.flecha'];
  def('cv.flecha', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    if (d.fan) { call_flecha(ctx, out, d, L, 0, 0); call_flecha(ctx, out, d, L, 0.025, 1); call_flecha(ctx, out, d, L, 0.05, 2); return 0.6; }
    if (d.snap) {
      var t = ctx.currentTime + 0.003 + num(d.delay, 0), o = L.bus(ctx, out, 0.5);
      L.noiseHit(ctx, o, t, { kind: 'pink', type: 'lowpass', f: 2200, a: 0.001, d: 0.05, gain: 0.35 }); L.tone(ctx, o, t, { f0: 420, f1: 260, sweep: 0.05, d: 0.06, gain: 0.25 });
      return 0.2;
    }
    return flechaBase(ctx, out, d, L);
  }, { cd: 0.05, dur: 0.6, prio: 3, wet: 0.2 });
  function call_flecha(ctx, out, d, L, delay, c) { return flechaBase(ctx, out, mix(d, { delay: num(d.delay, 0) + delay, c: c }), L); }

  // golpe de tabla: {broke} se rompe · {boss} le pega al Tablazo · {player} le pega a Alexander
  var tablaBase = R['cv.tabla.golpe'];
  def('cv.tabla.golpe', function (ctx, out, d, L) {
    d = d || {};
    if (d.broke) return R['cv.tabla.rompe'](ctx, out, d, L);
    if (d.boss) { R['cv.flecha.golpe'](ctx, out, d, L); return tablaBase(ctx, out, mix(d, { boost: 0.7 }), L); }
    return tablaBase(ctx, out, d.player ? mix(d, { boost: 1.3 }) : d, L);
  }, { cd: 0.06, dur: 0.7, prio: 4, wet: 0.12 });

  // el viento del parapente debe seguir sonando mientras dure la caída aunque nadie lo «toque» (caida.js lo pide sin ttl y lo para al terminar): ttl 4 min en vez de 4 s
  if (typeof A.loop === 'function' && !A.loop.__cv) {
    var origLoop = A.loop;
    A.loop = function (name, data) {
      if (name === 'cv.viento' && (!data || typeof data.ttl !== 'number')) { data = data || {}; data.ttl = 240; }
      return origLoop.call(A, name, data);
    };
    A.loop.__cv = true;
  }

  /* ================================================ DIRECTOR DE AMBIENTE ================================================ */
  var CV = A.cv = A.cv || {};
  var D = CV.amb = CV.amb || {};
  D.enabled = true; D.bed = 1;
  var st = { timer: 0, olas: null, nextGull: 0, nextPel: 0, t0: 0 };
  function G() { return ACH.G || (ACH.game && ACH.game.G) || null; }
  function listener() {
    var g = G(), V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
    if (g && g.cam) return { x: g.cam.x + V.w / 2, y: g.cam.y + V.h / 2 };
    return null;
  }
  function nowS() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000; }
  D.setBed = function (k) { D.bed = clamp(+k || 0, 0, 2); };
  function tick() {
    if (!D.enabled || !(ACH.nivel && ACH.nivel.id === 'costaverde')) return;
    if (!A.ctx || A.ctx.state !== 'running') return;
    var g = G(), lis = listener();
    if (!g || g.state !== 'playing' || !lis) { if (st.olas && st.olas.alive) { /* se apaga solo a los 4 s */ } return; }
    var t = nowS(), zone = typeof CV.zone === 'function' ? CV.zone() : 'malecon', dirt = typeof CV.dirt === 'function' ? CV.dirt() : 0;
    var k = (zone === 'larcomar' ? 0.35 + 0.5 * dirt : 0.8) * D.bed;
    if (!st.t0) { st.t0 = t; st.nextGull = t + rr(3, 8); st.nextPel = t + rr(30, 60); }
    if (st.olas && st.olas.alive) st.olas.set({ intensity: k });
    else { st.olas = A.loop('cv.olas', { intensity: k, ttl: 2 }); }
    if (t >= st.nextGull) {
      st.nextGull = t + rr(7, 16);
      A.emit('cv.gaviota', { x: lis.x + rr(-190, 190), y: lis.y + rr(-80, 40), boost: 1.3 });
      if (rnd() < 0.3) setTimeout(function () { try { A.emit('cv.gaviota', { x: lis.x + rr(-250, 250), y: lis.y + rr(-90, 30) }); } catch (e) { /* nada */ } }, rr(900, 2200));
    }
    if (t >= st.nextPel) { st.nextPel = t + rr(40, 90); A.emit('cv.pelicano', { x: lis.x + rr(-200, 200), y: lis.y - 60 }); }
  }
  D.start = function () { if (!st.timer) st.timer = setInterval(function () { try { tick(); } catch (e) { /* el sonido nunca rompe el juego */ } }, 250); };
  D.stop = function () { if (st.timer) { clearInterval(st.timer); st.timer = 0; } if (st.olas) { try { st.olas.stop(); } catch (e) { /* nada */ } st.olas = null; } };
  D.state = function () { return { running: !!st.timer, olas: !!(st.olas && st.olas.alive), nextGull: st.nextGull ? +(st.nextGull - nowS()).toFixed(1) : null, bed: D.bed }; };
  D.start();

  CV.sfx = Object.keys(R).filter(function (k) { return k.indexOf('cv.') === 0; });         // lista de eventos de este archivo (para la página de prueba)
})();
