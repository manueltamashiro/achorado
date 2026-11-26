/* ACHORADO - js/miraflores/sfx-mira.js  (M3, nivel 3: Miraflores)
 * Sonidos nuevos del nivel, todo sintetizado con Web Audio (usa ACH.audio.lib de sfx.js). Se registran SIN editar sfx.js ni motor.js:
 * motor.js busca cada evento en ACH.audio.recipes[name] (A.emit y A.loop), así que basta con agregar recetas ahí. Carga DESPUÉS de motor.js
 * (si cargara antes tampoco pasa nada: solo usa ACH.audio.recipes y ACH.audio.lib). Sin estos sonidos el juego sigue igual: un evento sin receta no suena.
 *
 * EVENTOS (nombre exacto para ACH.audio.emit(name, data), con data = {x, y} si es posicional):
 *   abejas   bees.spawn · bees.sting · bees.hit · bees.die · bees.loop (bucle, ver abajo)
 *   jefa     boss.yell · boss.fry (bucle) · boss.throw · miel.splat · boss.block · boss.hurt · boss.down · boss.cart (se va empujando la carretilla)
 *   tienda   shop.open · shop.buy · shop.nomoney   ·   checkpoint (campanitas del punto de control)
 *   inflables y piletas   inflable.swing · inflable.hit · inflable.pop · burbujas.shot · burbujas.pop · pileta.coins
 *   ambiente iglesia.campanas · paloma.coo · pileta.murmullo (bucle). Maullidos y bufidos: se reusan cat.meow y cat.hiss de sfx.js.
 *
 * BUCLES (ACH.audio.loop(name, data) -> {move(x,y[,patch]), set(patch), touch(), stop()}; se apagan solos a los 4 s sin move/set/touch):
 *   bees.loop       zumbido de enjambre. data/patch: {n: abejas que quedan (0..14; 12 = nube llena)} o {intensity: 0..1}. Con n = 0 queda mudo.
 *   boss.fry        chisporroteo de aceite de la paila. data/patch: {intensity: 0..1}. Posicional en la carretilla.
 *   pileta.murmullo agua de pileta. data/patch: {intensity: 0..1}. Lo mantiene vivo el director de ambiente (abajo).
 *
 * DIRECTOR DE AMBIENTE (ACH.mira.audio): si ACH.nivel.id === 'miraflores', cada 250 ms (solo con el juego en 'playing' y el audio desbloqueado)
 *   · mantiene el murmullo de las 2 piletas más cercanas (a < 360 px);
 *   · toca iglesia.campanas cada ~90 s (la primera a los ~25 s), posicional en la iglesia; si el oyente está lejos, se oye apagada en vez de nada;
 *   · palomas zureando de vez en cuando cerca del oyente y maullidos de los gatos más cercanos (G.cats).
 *   ACH.mira.audio.setFountains([{x,y}…]) / setChurch(x, y) / enabled = false / stop() / start(). Por defecto usa las posiciones de MIRAFLORES.md (col·16+8, fila·16+8).
 */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var A = ACH.audio = ACH.audio || {};
  A.lib = A.lib || {};
  A.recipes = A.recipes || {};
  var R = A.recipes, L0 = A.lib;
  if (!L0.bus) return;                     // sfx.js no cargó: nada que registrar (el juego sigue mudo en esos eventos)

  var rnd = Math.random;
  function rr(a, b) { return a + (b - a) * rnd(); }
  function vary(v, p) { return v * (1 + (rnd() * 2 - 1) * p); }
  function pick(a) { return a[Math.floor(rnd() * a.length) % a.length]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function boost(d) { return typeof d.boost === 'number' ? clamp(d.boost, 1, 10) : 1; }
  function def(name, fn, o) { fn.cooldown = o.cd == null ? 0.05 : o.cd; fn.dur = o.dur || 1; if (o.prio) fn.priority = o.prio; if (o.wet != null) fn.wet = o.wet; if (o.loop) fn.loop = true; R[name] = fn; }

  // zumbido de alas: pila de sierras/cuadradas desafinadas, cada una con vibrato propio (el enjambre «respira»), amplitud con aleteo rápido
  function buzz(ctx, dest, t, D, o) {
    var n = o.n || 7, bp = L0.filter(ctx, 'bandpass', o.fc || 950, o.q || 0.6), i;
    bp.connect(dest);
    for (i = 0; i < n; i++) {
      var os = ctx.createOscillator(), og = ctx.createGain(), f = rr(o.lo || 170, o.hi || 300), lf = ctx.createOscillator(), lg = ctx.createGain();
      os.type = i % 3 === 0 ? 'square' : 'sawtooth';
      os.frequency.setValueAtTime(f * (o.f0 || 1), t);
      if (o.f1) os.frequency.exponentialRampToValueAtTime(Math.max(20, f * o.f1), t + (o.sweep || D));
      lf.frequency.value = rr(4, 10); lg.gain.value = f * 0.04; lf.connect(lg); lg.connect(os.frequency); lf.start(t); lf.stop(t + D + 0.1);
      og.gain.value = (o.g || 0.14) / Math.sqrt(n / 7);
      os.connect(og); og.connect(bp); os.start(t); os.stop(t + D + 0.1);
    }
    return bp;
  }

  /* ===================================================== ABEJAS ===================================================== */
  def('bees.spawn', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.005, o = L.bus(ctx, out, 0.84 * boost(d)), D = 1.0, g = ctx.createGain(), am = ctx.createGain(), al = ctx.createOscillator(), ag = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + 0.32); g.gain.setValueAtTime(1, t + 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + D);
    am.gain.value = 0.72; al.frequency.value = 38; ag.gain.value = 0.28; al.connect(ag); ag.connect(am.gain); al.start(t); al.stop(t + D + 0.1);
    buzz(ctx, am, t, D, { n: 9, f0: 0.78, f1: 1.1, sweep: 0.4, g: 0.15 });
    am.connect(g); g.connect(o);
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 2600, q: 0.8, a: 0.3, d: 0.5, gain: 0.16 });
    return D + 0.2;
  }, { cd: 0.2, dur: 1.2, prio: 3, wet: 0.14 });

  def('bees.sting', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 1);
    L.tone(ctx, o, t, { type: 'sawtooth', f0: vary(1350, 0.1), f1: 420, sweep: 0.12, a: 0.002, d: 0.16, gain: 0.5 });
    L.tone(ctx, o, t + 0.01, { type: 'square', f0: vary(230, 0.1), f1: 170, sweep: 0.2, a: 0.004, d: 0.22, gain: 0.22 });
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 5200, a: 0.001, d: 0.014, gain: 0.4 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 1800, q: 1.4, a: 0.002, d: 0.08, gain: 0.25 });
    return 0.4;
  }, { cd: 0.12, dur: 0.5, prio: 4, wet: 0.1 });

  def('bees.hit', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.5), i;
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 1500, f1: 320, q: 0.9, a: 0.003, d: 0.28, sweep: 0.26, gain: 0.5 });
    L.tone(ctx, o, t, { type: 'sawtooth', f0: 260, f1: 90, sweep: 0.2, d: 0.22, gain: 0.35 });
    L.tone(ctx, o, t, { f0: 140, f1: 60, d: 0.1, gain: 0.5 });                         // golpe seco al pasar la guitarra
    for (i = 0; i < 6; i++) L.noiseHit(ctx, o, t + rr(0.02, 0.25), { type: 'bandpass', f: rr(900, 2600), q: 3, d: 0.02, gain: 0.14 });
    return 0.5;
  }, { cd: 0.08, dur: 0.6, prio: 4, wet: 0.1 });

  def('bees.die', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.005, o = L.bus(ctx, out, 0.5 * boost(d)), D = 1.0, g = ctx.createGain(), lp = L.filter(ctx, 'lowpass', 2200, 0.7);
    g.gain.setValueAtTime(0.8, t); g.gain.exponentialRampToValueAtTime(0.0001, t + D);
    lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(260, t + D);
    buzz(ctx, lp, t, D, { n: 7, f0: 1, f1: 0.38, sweep: D, g: 0.15 });
    lp.connect(g); g.connect(o);
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 1700, f1: 400, q: 0.8, a: 0.01, d: 0.5, sweep: 0.5, gain: 0.2 });
    return D + 0.2;
  }, { cd: 0.2, dur: 1.2, prio: 3, wet: 0.14 });

  // bucle: nube de zumbido. {n} abejas que quedan (12 = nube llena) o {intensity} 0..1
  def('bees.loop', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var o = L.bus(ctx, out, 0.6);
    function lvl(h) { var n = typeof h.data.n === 'number' ? h.data.n : (typeof h.data.intensity === 'number' ? h.data.intensity * 12 : 10); return clamp(n / 12, 0, 1.3); }
    function apply(h, t) { var k = lvl(h); h.mg.gain.setTargetAtTime(k <= 0 ? 0 : 0.06 + 0.8 * Math.sqrt(k), t, 0.12); h.bp.frequency.setTargetAtTime(760 + 420 * k, t, 0.2); }
    return L.loop(ctx, o, {
      data: d,
      setup: function (h) {
        var i;
        h.bp = L.filter(ctx, 'bandpass', 1000, 0.55); var hp = L.filter(ctx, 'highpass', 130, 0.7); h.mg = ctx.createGain(); h.mg.gain.value = 0;
        var am = ctx.createGain(); am.gain.value = 0.72; var al = h.osc('sine', 37), ag = ctx.createGain(); ag.gain.value = 0.28; al.connect(ag); ag.connect(am.gain);
        h.os = [];
        for (i = 0; i < 9; i++) {
          var f = rr(165, 310), os = h.osc(i % 3 === 0 ? 'square' : 'sawtooth', f), og = ctx.createGain(), lf = h.osc('sine', rr(3.5, 10)), lg = ctx.createGain();
          lg.gain.value = f * 0.045; lf.connect(lg); lg.connect(os.frequency); og.gain.value = 0.13; os.connect(og); og.connect(h.bp); h.os.push({ o: os, f: f });
        }
        var nz = h.src('pink'), nb = L.filter(ctx, 'bandpass', 2700, 0.9), ng = ctx.createGain(); ng.gain.value = 0.035; nz.connect(nb); nb.connect(ng); ng.connect(h.bp);
        h.bp.connect(hp); hp.connect(am); am.connect(h.mg); h.mg.connect(h.out);
        apply(h, h.t0);
      },
      set: function (h) { apply(h, ctx.currentTime); },
      step: function (h, t) {
        apply(h, t);
        for (var i = 0; i < h.os.length; i++) if (rnd() < 0.25) h.os[i].o.frequency.setTargetAtTime(h.os[i].f * rr(0.88, 1.18), t, 0.25);      // la nube se mueve
        return t + 0.2;
      }
    });
  }, { cd: 0.3, dur: 2, prio: 2, wet: 0.1, loop: true });

  /* ===================================================== JEFA ===================================================== */
  // la picaronera grita «¡pi-ca-RO-nes!» (voz de señora, sin palabras: tres golpes de voz con formantes)
  def('boss.yell', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 1.3), D = vary(1.0, 0.06), p = vary(1, 0.04);
    L.voice(ctx, o, t, { dur: D, f0: [[0, 300 * p], [0.2, 310 * p], [0.3, 335 * p], [0.5, 350 * p], [0.55, 440 * p], [0.8, 400 * p], [1, 290 * p]],
      vowels: [[0, 'i'], [0.2, 'i'], [0.3, 'a'], [0.45, 'a'], [0.55, 'o'], [0.8, 'e'], [1, 'e']],
      amp: [[0, 0], [0.04, 0.8], [0.16, 0.5], [0.2, 0.05], [0.26, 0.05], [0.3, 0.8], [0.42, 0.55], [0.46, 0.05], [0.52, 0.05], [0.55, 1], [0.8, 0.9], [1, 0]],
      fscale: 1.18, bw: 0.9, breath: 0.14, vib: 0.02, vibHz: 6, jitter: 0.02, rasp: 0.12, raspHz: 40, gain: 1.4 });
    return D + 0.2;
  }, { cd: 0.5, dur: 1.3, prio: 5, wet: 0.2 });

  // la paila: chisporroteo de aceite (siseo + estallidos + burbujeo). {intensity} 0..1
  def('boss.fry', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var o = L.bus(ctx, out, 0.5);
    function ik(h) { return clamp(typeof h.data.intensity === 'number' ? h.data.intensity : 0.8, 0, 1.2); }
    function apply(h, t) { var k = ik(h); h.hg.gain.setTargetAtTime(0.03 + 0.2 * k, t, 0.15); h.lg.gain.setTargetAtTime(0.02 + 0.2 * k, t, 0.15); }
    return L.loop(ctx, o, {
      data: d,
      setup: function (h) {
        var n1 = h.src('white'), hp = L.filter(ctx, 'highpass', 3500, 0.7), lp = L.filter(ctx, 'lowpass', 9500, 0.6); h.hg = ctx.createGain(); h.hg.gain.value = 0.1; n1.connect(hp); hp.connect(lp); lp.connect(h.hg); h.hg.connect(h.out);        // siseo
        var n2 = h.src('brown'), bp = L.filter(ctx, 'bandpass', 260, 0.8); h.lg = ctx.createGain(); h.lg.gain.value = 0.1; n2.connect(bp); bp.connect(h.lg); h.lg.connect(h.out);                                  // burbujeo grave
        var lf = h.osc('sine', 3.1), lgn = ctx.createGain(); lgn.gain.value = 0.05; lf.connect(lgn); lgn.connect(h.lg.gain);
        apply(h, h.t0);
      },
      set: function (h) { apply(h, ctx.currentTime); },
      step: function (h, t) {
        var k = ik(h), i, n = 1 + Math.floor(rnd() * (2 + 4 * k));
        apply(h, t);
        for (i = 0; i < n; i++) L.noiseHit(ctx, h.out, t + rr(0, 0.11), { type: 'bandpass', f: rr(1800, 6500), q: 4, a: 0.0005, d: rr(0.006, 0.02), gain: rr(0.1, 0.35) * (0.4 + k) });      // estallidos de aceite
        if (rnd() < 0.25 * (0.3 + k)) L.tone(ctx, h.out, t + rr(0, 0.1), { f0: rr(300, 480), f1: rr(110, 200), sweep: 0.05, a: 0.003, d: 0.07, gain: 0.14 * k });                                           // burbuja que revienta
        return t + 0.12;
      }
    });
  }, { cd: 0.3, dur: 2, prio: 2, wet: 0.1, loop: true });

  // lanza un picarón: soplido + plof de masa
  def('boss.throw', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.45);
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 450, f1: 1700, q: 0.8, a: 0.03, d: 0.25, sweep: 0.22, gain: 0.7 });
    L.tone(ctx, o, t, { f0: 150, f1: 320, sweep: 0.12, a: 0.01, d: 0.2, gain: 0.4 });
    L.noiseHit(ctx, o, t + 0.01, { type: 'lowpass', f: 700, a: 0.002, d: 0.08, gain: 0.35 });
    L.tone(ctx, o, t, { type: 'triangle', f0: 90, f1: 55, d: 0.1, gain: 0.45 });
    return 0.6;
  }, { cd: 0.15, dur: 0.7, prio: 4, wet: 0.12 });

  // charco de miel: chapoteo espeso, chasquido pegajoso y gotas
  def('miel.splat', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.45), i;
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 600, q: 0.7, a: 0.003, d: 0.16, gain: 0.8 });
    L.tone(ctx, o, t, { f0: 190, f1: 62, sweep: 0.09, a: 0.002, d: 0.2, gain: 0.7 });
    L.noiseHit(ctx, o, t + 0.01, { type: 'bandpass', f: 1100, q: 2, a: 0.002, d: 0.05, gain: 0.3 });
    var sq = L.tone(ctx, o, t + 0.05, { type: 'sawtooth', f0: 420, f1: 140, sweep: 0.14, a: 0.004, d: 0.17, gain: 0.2 });     // «squelch» pegajoso
    for (i = 0; i < 4; i++) L.tone(ctx, o, t + 0.12 + i * rr(0.05, 0.1), { f0: rr(500, 900), f1: rr(250, 400), sweep: 0.04, d: 0.05, gain: 0.12 });   // gotas
    return 0.7;
  }, { cd: 0.1, dur: 0.8, prio: 3, wet: 0.14 });

  // la carretilla tapa el golpe: clanc de lata y de olla
  def('boss.block', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.28), f = vary(440, 0.06);
    L.modal(ctx, o, t, { freqs: [f, f * 1.504, f * 2.31, f * 3.38, f * 4.7, f * 6.2], decays: [0.34, 0.26, 0.2, 0.13, 0.08, 0.05], gains: [1, 0.8, 0.6, 0.4, 0.3, 0.2], a: 0.0005 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 3200, q: 1.2, a: 0.0005, d: 0.02, gain: 0.55 });
    L.tone(ctx, o, t, { f0: 210, f1: 95, d: 0.06, gain: 0.5 });
    L.modal(ctx, o, t + 0.003, { freqs: [f * 0.5, f * 0.76], decays: [0.5, 0.4], gains: [0.5, 0.35], a: 0.001 });                  // cuerpo hueco de la paila
    return 0.6;
  }, { cd: 0.08, dur: 0.7, prio: 5, wet: 0.14 });

  def('boss.hurt', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.005, o = L.bus(ctx, out, 1.5), D = vary(0.4, 0.1), p = vary(1, 0.06);
    L.voice(ctx, o, t, { dur: D, f0: [[0, 440 * p], [0.25, 520 * p], [1, 300 * p]], vowels: [[0, 'ae'], [0.5, 'a'], [1, 'e']], amp: [[0, 0], [0.08, 1], [0.6, 0.7], [1, 0]],
      fscale: 1.18, bw: 0.9, breath: 0.12, vib: 0.025, vibHz: 7, jitter: 0.03, gain: 1.4 });
    return D + 0.2;
  }, { cd: 0.15, dur: 0.7, prio: 4, wet: 0.16 });

  // su muerte: «¡se me acabó la masa…!» que se deshace en un quejido, sartenes que ruedan, y el golpe de la carretilla al caer
  def('boss.down', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.36), D = 1.5, i;
    L.voice(ctx, o, t, { dur: D, f0: [[0, 330], [0.3, 300], [0.6, 235], [1, 105]], vowels: [[0, 'a'], [0.3, 'e'], [0.6, 'o'], [1, 'uh']],
      amp: [[0, 0], [0.05, 1], [0.35, 0.85], [0.42, 0.4], [0.5, 0.85], [0.8, 0.7], [1, 0]],
      fscale: 1.1, bw: 0.9, breath: 0.15, vib: 0.03, vibHz: 5.5, jitter: 0.03, gargle: 0.25, gargleHz: 14, gain: 1.4 });
    for (i = 0; i < 4; i++) L.clang(ctx, o, t + 0.55 + i * rr(0.12, 0.2), { f: rr(260, 520), gain: 0.35 * (1 - i * 0.18), decay: 0.45, n: 4 });         // cacharros que ruedan
    var tf = t + 1.45;
    L.tone(ctx, o, tf, { f0: 110, f1: 40, d: 0.5, gain: 0.8 });                                                                                     // la carretilla cae
    L.noiseHit(ctx, o, tf, { kind: 'brown', type: 'lowpass', f: 380, q: 0.7, d: 0.4, gain: 0.7 });
    L.clang(ctx, o, tf, { f: 330, gain: 0.5, decay: 0.7 });
    L.noiseHit(ctx, o, tf + 0.02, { type: 'bandpass', f: 2600, q: 1, d: 0.05, gain: 0.35 });
    return 2.6;
  }, { cd: 1, dur: 2.8, prio: 5, wet: 0.2 });

  /* ===================================================== TIENDA ===================================================== */
  // campanilla de la puerta de la tienda: ding-dong agudo
  def('shop.open', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.005, o = L.bus(ctx, out, 0.4);
    L.bell(ctx, o, t, { f: 1760, gain: 0.5, decay: 0.7 }); L.bell(ctx, o, t + 0.16, { f: 1397, gain: 0.5, decay: 0.9 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 2600, q: 1.5, d: 0.01, gain: 0.2 });
    return 1.2;
  }, { cd: 0.3, dur: 1.4, prio: 4, wet: 0.14 });

  // caja registradora: traqueteo mecánico, campanilla «¡cling!» y el cajón que se abre
  def('shop.buy', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.005, o = L.bus(ctx, out, 0.42), i;
    for (i = 0; i < 5; i++) L.noiseHit(ctx, o, t + i * 0.03 + rr(0, 0.01), { type: 'bandpass', f: rr(1800, 3400), q: 3, a: 0.0005, d: 0.012, gain: 0.35 });    // teclas
    L.tone(ctx, o, t + 0.15, { type: 'square', f0: 900, f1: 400, sweep: 0.03, d: 0.04, gain: 0.25 });                                                              // tope del mecanismo
    L.bell(ctx, o, t + 0.17, { f: 2000, gain: 0.55, decay: 1.0 }); L.bell(ctx, o, t + 0.18, { f: 2300, gain: 0.35, decay: 0.8 });                                // cling
    L.noiseHit(ctx, o, t + 0.2, { type: 'bandpass', f: 1200, q: 1, a: 0.003, d: 0.1, gain: 0.35 });                                                              // cajón
    for (i = 0; i < 4; i++) L.clang(ctx, o, t + 0.28 + i * rr(0.02, 0.05), { f: rr(2800, 4200), gain: 0.14, decay: 0.12, n: 2 });                                // monedas
    return 1.4;
  }, { cd: 0.15, dur: 1.5, prio: 4, wet: 0.12 });

  // sin plata: zumbador y «womp-womp» triste
  def('shop.nomoney', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.68);
    L.tone(ctx, o, t, { type: 'square', f0: 150, f1: 140, d: 0.18, gain: 0.45 });
    [[0.18, 392, 349], [0.42, 330, 262]].forEach(function (x) {
      var os = ctx.createOscillator(), g = ctx.createGain(), lp = L.filter(ctx, 'lowpass', 900, 1.2), tt = t + x[0];
      os.type = 'sawtooth'; os.frequency.setValueAtTime(x[1], tt); os.frequency.linearRampToValueAtTime(x[2], tt + 0.2);
      L.adsr(g.gain, tt, { a: 0.02, d: 0.24, s: 0.3, peak: 0.55, dur: 0.22, r: 0.05 });
      os.connect(lp); lp.connect(g); g.connect(o); os.start(tt); os.stop(tt + 0.4);
    });
    return 0.9;
  }, { cd: 0.2, dur: 1, prio: 4, wet: 0.1 });

  /* ============================================ INFLABLES, BURBUJAS Y PILETAS ============================================ */
  def('inflable.swing', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.002, o = L.bus(ctx, out, 0.6), D = vary(0.2, 0.15);
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 500, f1: 1700, q: 0.7, a: 0.04, d: D, sweep: D, gain: 0.6 });
    L.tone(ctx, o, t, { type: 'triangle', f0: 180, f1: 420, sweep: D * 0.8, a: 0.03, d: D, gain: 0.22 });
    return D + 0.15;
  }, { cd: 0.05, dur: 0.4, prio: 3, wet: 0.08 });

  // juguete que chilla: «¡piii!» (chirrido de goma, sube y baja)
  def('inflable.hit', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.58), p = vary(1, 0.08) * (d.pitch || 1), D = 0.17;
    [[1, 0.5], [2.01, 0.2]].forEach(function (x) {
      var os = ctx.createOscillator(), g = ctx.createGain(), bp = L.filter(ctx, 'bandpass', 2200, 1.2);
      os.type = 'square'; os.frequency.setValueAtTime(820 * p * x[0], t); os.frequency.exponentialRampToValueAtTime(1950 * p * x[0], t + D * 0.45); os.frequency.exponentialRampToValueAtTime(1500 * p * x[0], t + D);
      L.adsr(g.gain, t, { a: 0.006, d: D, s: 0.5, peak: x[1], dur: D * 0.7, r: 0.03 });
      os.connect(bp); bp.connect(g); g.connect(o); os.start(t); os.stop(t + D + 0.1);
    });
    L.tone(ctx, o, t, { f0: 160, f1: 80, d: 0.06, gain: 0.3 });                                                       // el golpe blando
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 500, d: 0.04, gain: 0.3 });
    return 0.4;
  }, { cd: 0.05, dur: 0.45, prio: 4, wet: 0.1 });

  // globo que revienta: chasquido agudo, golpe grave y restos de goma
  def('inflable.pop', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.45), i;
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 900, a: 0.0003, d: 0.035, gain: 1.0 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 3000, q: 0.7, a: 0.0003, d: 0.05, gain: 0.6 });
    L.tone(ctx, o, t, { f0: 150, f1: 55, d: 0.12, gain: 0.8 });
    L.noiseHit(ctx, o, t + 0.01, { kind: 'brown', type: 'lowpass', f: 450, d: 0.14, gain: 0.5 });
    for (i = 0; i < 5; i++) L.noiseHit(ctx, o, t + 0.04 + i * rr(0.02, 0.05), { type: 'bandpass', f: rr(1500, 4200), q: 2, d: 0.012, gain: 0.2 * (1 - i * 0.15) });
    return 0.5;
  }, { cd: 0.1, dur: 0.6, prio: 5, wet: 0.12 });

  // pistola de burbujas: soplido y tres «bloop» que salen en abanico
  def('burbujas.shot', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.68), i;
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 1900, q: 0.8, a: 0.01, d: 0.1, gain: 0.45 });
    for (i = 0; i < 3; i++) L.tone(ctx, o, t + 0.02 + i * 0.045, { f0: rr(500, 760), f1: rr(1100, 1600), sweep: 0.05, a: 0.004, d: 0.08, gain: 0.3 });
    L.tone(ctx, o, t, { f0: 200, f1: 120, d: 0.05, gain: 0.2 });
    return 0.35;
  }, { cd: 0.05, dur: 0.45, prio: 3, wet: 0.12 });

  def('burbujas.pop', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.002, o = L.bus(ctx, out, 0.5);
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 4200, a: 0.0003, d: 0.012, gain: 0.5 });
    L.tone(ctx, o, t, { f0: vary(1700, 0.12), f1: 750, sweep: 0.03, a: 0.0008, d: 0.045, gain: 0.5 });
    return 0.2;
  }, { cd: 0.03, dur: 0.25, prio: 2, wet: 0.1 });

  // monedas al agua: tintineos metálicos y «plinc» de gotas con chapoteo suave
  def('pileta.coins', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.005, o = L.bus(ctx, out, 0.6), i;
    for (i = 0; i < 3; i++) {
      var tt = t + i * rr(0.07, 0.13);
      L.clang(ctx, o, tt, { f: rr(2500, 3500), gain: 0.28, decay: 0.2, n: 3 });
      L.tone(ctx, o, tt + 0.04, { f0: rr(500, 900), f1: rr(1100, 1800), sweep: 0.05, a: 0.003, d: 0.08, gain: 0.16 });
    }
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 1200, q: 0.8, a: 0.01, d: 0.3, gain: 0.2 });
    for (i = 0; i < 4; i++) L.tone(ctx, o, t + 0.25 + i * rr(0.05, 0.12), { f0: rr(600, 1000), f1: rr(1200, 2000), sweep: 0.04, d: 0.05, gain: 0.1 });
    return 1.0;
  }, { cd: 0.2, dur: 1.2, prio: 4, wet: 0.2 });

  /* ===================================================== AMBIENTE ===================================================== */
  // campanas de la iglesia: dos campanas de bronce que alternan (La3 y Mi4), 6 campanadas con ~2 s de separación; parciales de campana de iglesia.
  // data.boost (lo pone el director cuando el oyente está lejos) sube el nivel y data.far oscurece el sonido.
  def('iglesia.campanas', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.05, o = L.bus(ctx, out, 0.15 * boost(d)), n = d.strikes || 6, i, dst = o;
    if (d.far) { var lp = L.filter(ctx, 'lowpass', 1500, 0.7); lp.connect(o); dst = lp; }
    for (i = 0; i < n; i++) {
      var f = i % 2 ? 330 : 220, tt = t + i * vary(2.1, 0.03), r = [0.5, 1, 1.183, 1.506, 2, 2.514, 3.011, 4.166];
      L.modal(ctx, dst, tt, { freqs: r.map(function (x) { return f * x; }), decays: [4.6, 3.8, 3.0, 2.4, 1.8, 1.2, 0.7, 0.4], gains: [0.5, 1, 0.65, 0.45, 0.4, 0.26, 0.16, 0.1], a: 0.002 });
      L.noiseHit(ctx, dst, tt, { type: 'bandpass', f: 2200, q: 1.2, a: 0.0005, d: 0.015, gain: 0.25 });
      L.tone(ctx, dst, tt, { f0: f * 0.5, f1: f * 0.5, d: 0.2, gain: 0.35 });
    }
    return n * 2.1 + 4;
  }, { cd: 10, dur: 16, prio: 3, wet: 0.35 });

  // murmullo de pileta (bucle): agua que corre y gotas sueltas. {intensity} 0..1
  def('pileta.murmullo', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var o = L.bus(ctx, out, 0.7);
    function ik(h) { return clamp(typeof h.data.intensity === 'number' ? h.data.intensity : 0.7, 0, 1.2); }
    function apply(h, t) { var k = ik(h); h.g1.gain.setTargetAtTime(0.1 + 0.25 * k, t, 0.2); h.g2.gain.setTargetAtTime(0.04 + 0.12 * k, t, 0.2); }
    return L.loop(ctx, o, {
      data: d,
      setup: function (h) {
        var n1 = h.src('brown'), b1 = L.filter(ctx, 'bandpass', 380, 0.6); h.g1 = ctx.createGain(); h.g1.gain.value = 0.2; n1.connect(b1); b1.connect(h.g1); h.g1.connect(h.out);
        var n2 = h.src('pink'), b2 = L.filter(ctx, 'bandpass', 1700, 0.5); h.g2 = ctx.createGain(); h.g2.gain.value = 0.08; n2.connect(b2); b2.connect(h.g2); h.g2.connect(h.out);
        var l1 = h.osc('sine', 0.7), lg1 = ctx.createGain(); lg1.gain.value = 0.05; l1.connect(lg1); lg1.connect(h.g1.gain);
        var l2 = h.osc('sine', 1.9), lg2 = ctx.createGain(); lg2.gain.value = 0.03; l2.connect(lg2); lg2.connect(h.g2.gain);
        apply(h, h.t0);
      },
      set: function (h) { apply(h, ctx.currentTime); },
      step: function (h, t) {
        var k = ik(h);
        apply(h, t);
        if (rnd() < 0.5 * (0.3 + k)) L.tone(ctx, h.out, t + rr(0, 0.2), { f0: rr(700, 1200), f1: rr(1300, 2200), sweep: 0.04, a: 0.002, d: 0.05, gain: 0.07 * k });      // gota
        return t + 0.25;
      }
    });
  }, { cd: 0.3, dur: 2, prio: 1, wet: 0.2, loop: true });

  // paloma: «grruu-cu-cuuu» (voz grave con formantes u/o, tres golpes)
  def('paloma.coo', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.34 * boost(d)), D = vary(1.0, 0.1), p = vary(1, 0.08);
    L.voice(ctx, o, t, { dur: D, f0: [[0, 300 * p], [0.18, 430 * p], [0.3, 330 * p], [0.5, 440 * p], [0.62, 340 * p], [0.8, 430 * p], [1, 250 * p]], vowels: [[0, 'u'], [0.4, 'o'], [0.8, 'u'], [1, 'm']],
      amp: [[0, 0], [0.04, 0.8], [0.22, 0.6], [0.28, 0.1], [0.34, 0.8], [0.5, 0.55], [0.56, 0.1], [0.62, 0.9], [0.88, 0.7], [1, 0]], fscale: 0.95, bw: 1.3, breath: 0.08, vib: 0.015, vibHz: 7, jitter: 0.03, gain: 1.4 });
    return D + 0.2;
  }, { cd: 3, dur: 1.3, prio: 2, wet: 0.2 });

  // la carretilla de la jefa se va empujada: ruedas que chirrían, ruido de rodadura y cacharros que traquetean
  def('boss.cart', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.005, o = L.bus(ctx, out, 0.5), D = 1.6, i;
    var rn = L.noiseSrc(ctx, 'brown', t, D + 0.2), lp = L.filter(ctx, 'lowpass', 280, 0.7), rg = ctx.createGain();
    rg.gain.setValueAtTime(0.0001, t); rg.gain.linearRampToValueAtTime(0.9, t + 0.25); rg.gain.setValueAtTime(0.9, t + 0.9); rg.gain.exponentialRampToValueAtTime(0.0001, t + D);
    rn.connect(lp); lp.connect(rg); rg.connect(o);
    var sq = ctx.createOscillator(), sg = ctx.createGain(), sbp = L.filter(ctx, 'bandpass', 1500, 4), vl = ctx.createOscillator(), vg = ctx.createGain();
    sq.type = 'triangle'; sq.frequency.setValueAtTime(1250, t); sq.frequency.linearRampToValueAtTime(1550, t + D);
    vl.frequency.value = 7; vg.gain.value = 60; vl.connect(vg); vg.connect(sq.frequency); vl.start(t); vl.stop(t + D + 0.1);
    sg.gain.setValueAtTime(0.0001, t); sg.gain.linearRampToValueAtTime(0.12, t + 0.3); sg.gain.setValueAtTime(0.12, t + 0.9); sg.gain.exponentialRampToValueAtTime(0.0001, t + D);
    sq.connect(sbp); sbp.connect(sg); sg.connect(o); sq.start(t); sq.stop(t + D + 0.1);
    for (i = 0; i < 9; i++) L.clang(ctx, o, t + 0.08 + i * rr(0.1, 0.17), { f: rr(300, 700), gain: 0.2 * (1 - i * 0.08), decay: 0.12, n: 3 });
    return D + 0.3;
  }, { cd: 0.5, dur: 1.9, prio: 3, wet: 0.14 });

  // punto de control: campanitas de capilla que suben en tres notas (Mi, Sol#, Si)
  def('checkpoint', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.36);
    [[0, 659], [0.14, 831], [0.28, 988]].forEach(function (x) { L.bell(ctx, o, t + x[0], { f: x[1], gain: 0.5, decay: 1.4 }); L.tone(ctx, o, t + x[0], { f0: x[1] * 0.5, f1: x[1] * 0.5, d: 0.5, gain: 0.12 }); });
    return 2.2;
  }, { cd: 1, dur: 2.4, prio: 4, wet: 0.3 });

  /* ===================================== v0.13 (T2, KE): flash, silbato, ronroneo, rociador ===================================== */
  // flash de cámara: chasquido de capacitor y destello (el aviso de 0,55 s trae el zumbido que sube)
  def('mira.flashWind', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.3);
    L.tone(ctx, o, t, { type: 'sine', f0: 700, f1: 4200, sweep: 0.5, a: 0.05, d: 0.55, gain: 0.14 });
    L.tone(ctx, o, t + 0.02, { type: 'triangle', f0: 1400, f1: 6200, sweep: 0.5, a: 0.05, d: 0.5, gain: 0.05 });
    return 0.6;
  }, { cd: 0.3, dur: 0.7, prio: 3, wet: 0.1 });
  def('mira.flash', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.42);
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 2600, a: 0.0008, d: 0.16, gain: 0.8 });
    L.tone(ctx, o, t, { type: 'square', f0: 2400, f1: 240, sweep: 0.06, a: 0.001, d: 0.09, gain: 0.3 });
    L.noiseHit(ctx, o, t + 0.01, { kind: 'brown', type: 'lowpass', f: 500, a: 0.002, d: 0.1, gain: 0.35 });
    return 0.4;
  }, { cd: 0.2, dur: 0.5, prio: 5, wet: 0.14 });
  // silbato del sereno: dos pitidos agudos con trino y aire
  def('mira.silbato', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.4), i;
    for (i = 0; i < 6; i++) L.tone(ctx, o, t + i * 0.09, { type: 'sine', f0: i % 2 ? 2480 : 2720, f1: i % 2 ? 2540 : 2660, sweep: 0.04, a: 0.006, d: 0.1, gain: 0.3 });
    L.tone(ctx, o, t + 0.6, { type: 'sine', f0: 2800, f1: 2750, sweep: 0.3, a: 0.01, d: 0.45, gain: 0.26 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 3400, q: 1.4, a: 0.01, d: 1.0, gain: 0.12 });
    return 1.2;
  }, { cd: 1, dur: 1.4, prio: 5, wet: 0.2 });
  // ronroneo del gato (acariciado): trémolo grave
  def('mira.purr', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.3), i;
    for (i = 0; i < 36; i++) L.noiseHit(ctx, o, t + i * 0.042, { kind: 'brown', type: 'lowpass', f: 240 + (i % 3) * 20, a: 0.004, d: 0.035, gain: 0.5 * (i < 4 ? i / 4 : i > 30 ? (36 - i) / 6 : 1) });
    L.tone(ctx, o, t + 0.05, { type: 'triangle', f0: 70, f1: 58, sweep: 1.4, a: 0.1, d: 1.5, gain: 0.1 });
    return 1.7;
  }, { cd: 0.5, dur: 1.8, prio: 2, wet: 0.08 });
  // rociador (spray anti-abejas): siseo largo
  def('mira.rocio', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.4);
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 4200, q: 0.8, a: 0.03, d: 0.7, gain: 0.55 });
    L.noiseHit(ctx, o, t + 0.02, { type: 'highpass', f: 6000, a: 0.03, d: 0.6, gain: 0.25 });
    L.tone(ctx, o, t, { type: 'square', f0: 120, f1: 90, sweep: 0.6, a: 0.02, d: 0.7, gain: 0.03 });
    return 0.8;
  }, { cd: 0.2, dur: 0.9, prio: 3, wet: 0.1 });
  // embestida: bocinazo de carretilla (se usa en el aviso de 0,8 s)
  def('mira.bocina', function (ctx, out, d, L) {
    d = d || {}; L = L || L0;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.35);
    L.tone(ctx, o, t, { type: 'sawtooth', f0: 392, f1: 392, a: 0.01, d: 0.28, gain: 0.22 });
    L.tone(ctx, o, t, { type: 'sawtooth', f0: 523, f1: 523, a: 0.01, d: 0.28, gain: 0.18 });
    L.tone(ctx, o, t + 0.34, { type: 'sawtooth', f0: 392, f1: 392, a: 0.01, d: 0.3, gain: 0.22 });
    L.tone(ctx, o, t + 0.34, { type: 'sawtooth', f0: 523, f1: 523, a: 0.01, d: 0.3, gain: 0.18 });
    return 0.8;
  }, { cd: 0.5, dur: 0.9, prio: 4, wet: 0.12 });

  /* ================================================ DIRECTOR DE AMBIENTE ================================================ */
  function px(col, row) { return { x: col * 16 + 8, y: row * 16 + 8 }; }
  var M = ACH.mira = ACH.mira || {};
  var D = M.audio = M.audio || {};
  D.enabled = true;
  D.fountains = D.fountains || [px(1, 28), px(85, 25), px(136, 57)];     // Óvalo (cortada por el borde oeste), pileta chica NE, pileta chica SO (MIRAFLORES.md 3.3)
  D.church = D.church || px(95.5, 30.5);
  D.setFountains = function (list) { D.fountains = (list || []).filter(function (p) { return p && isFinite(p.x) && isFinite(p.y); }); };
  D.setChurch = function (x, y) { D.church = { x: x, y: y }; };
  var st = { timer: 0, loops: [], nextBell: 0, nextBird: 0, nextCat: 0, t0: 0 };
  function G() { return ACH.G || (ACH.game && ACH.game.G) || null; }
  function listener() {
    var g = G(), V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
    if (g && g.cam) return { x: g.cam.x + V.w / 2, y: g.cam.y + V.h / 2 };
    return null;
  }
  function nowS() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000; }
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function tick() {
    if (!D.enabled || !(ACH.nivel && ACH.nivel.id === 'miraflores')) return;
    if (!A.ctx || A.ctx.state !== 'running') return;
    var g = G(), lis = listener();
    if (!g || g.state !== 'playing' || !lis) return;
    var t = nowS(), i;
    if (!st.t0) { st.t0 = t; st.nextBell = t + rr(20, 30); st.nextBird = t + rr(4, 9); st.nextCat = t + rr(8, 16); }
    // piletas: el murmullo de las dos más cercanas, mientras estén a < 360 px
    var near = D.fountains.map(function (p) { return { p: p, d: dist(p, lis) }; }).filter(function (o) { return o.d < 360; }).sort(function (a, b) { return a.d - b.d; }).slice(0, 2);
    for (i = st.loops.length - 1; i >= 0; i--) if (!st.loops[i].h.alive || !near.some(function (o) { return o.p === st.loops[i].p; })) { try { st.loops[i].h.stop(); } catch (e) { /* nada */ } st.loops.splice(i, 1); }
    near.forEach(function (o) {
      var ex = st.loops.filter(function (l) { return l.p === o.p; })[0];
      if (ex) { ex.h.move(o.p.x, o.p.y); }
      else { var h = A.loop('pileta.murmullo', { x: o.p.x, y: o.p.y, intensity: 0.8, ttl: 2 }); if (h && h.alive) st.loops.push({ p: o.p, h: h }); }
    });
    // campanas
    if (t >= st.nextBell) {
      st.nextBell = t + rr(80, 100);
      var c = D.church, d = dist(c, lis), data = { x: c.x, y: c.y };
      if (d > 360) { var k = 360 / d; data = { x: lis.x + (c.x - lis.x) * k, y: lis.y + (c.y - lis.y) * k, far: true, boost: clamp(5 + (d - 360) / 200, 5, 9) }; }
      else if (d > 150) data.boost = 1.6;
      A.emit('iglesia.campanas', data);
    }
    // palomas
    if (t >= st.nextBird) {
      st.nextBird = t + rr(7, 16);
      A.emit('paloma.coo', { x: lis.x + rr(-150, 150), y: lis.y + rr(-60, 60), boost: 1.4 });
    }
    // gatos: el más cercano (a < 260 px) maúlla de vez en cuando
    if (t >= st.nextCat) {
      st.nextCat = t + rr(9, 22);
      var cats = g.cats || [], best = null, bd = 260;
      for (i = 0; i < cats.length; i++) { var dd = dist(cats[i], lis); if (dd < bd) { bd = dd; best = cats[i]; } }
      if (best) A.emit('cat.meow', { x: best.x, y: best.y });
    }
  }
  D.start = function () { if (!st.timer) st.timer = setInterval(function () { try { tick(); } catch (e) { /* el sonido nunca rompe el juego */ } }, 250); };
  D.stop = function () { if (st.timer) { clearInterval(st.timer); st.timer = 0; } st.loops.forEach(function (l) { try { l.h.stop(); } catch (e) { /* nada */ } }); st.loops = []; };
  D.state = function () { return { running: !!st.timer, loops: st.loops.length, nextBell: st.nextBell ? +(st.nextBell - nowS()).toFixed(1) : null, nextBird: st.nextBird ? +(st.nextBird - nowS()).toFixed(1) : null }; };
  D.start();
})();
