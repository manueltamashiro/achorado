/* ACHORADO — audio/melodias.js (v0.11, HABILIDADES.md): las 5 melodías de la guitarra despierta, más «subir de nivel», «despertar» y el «¡CLANG!» del escudo.
   Todo es original y corto (≤ 1,8 s cada melodía; la cola se apaga en el bus), guitarra punteada con la cuerda Karplus-Strong de sfx.js (ACH.audio.lib.pluck / strum / harmonic).
   No depende de musica.js ni de rock.js: se registra en ACH.audio.recipes y suena por ACH.audio.emit (bus de efectos: respeta el silencio de M).
     hab.alivio    huayno: pentatónica menor aguda, ritmo corto-largo saltadito
     hab.mareo     cumbia: bajo en tierra, rasgueo a contratiempo, güiro, melodía que se tuerce (bend) como mareado
     hab.escudo    vals: bajo en el 1, acorde en el 2 y el 3, melodía en terceras que sube
     hab.lamento   lamento criollo: menor, lento, notas que caen arrastradas y trémolo
     hab.rasgueo   el último rasgueo: rasgueado rápido abajo-arriba y un acorde final enorme con golpe de caja
     hab.contrapunto  (Barranco) landó 6/8 lento con cajón y guitarra punteada · hab.contrapunto.atiempo  campanita «¡A TIEMPO!»
     hab.nivel     acorde ascendente con armónicos  ·  hab.despertar  cuerdas que despiertan solas  ·  hab.clang  escudo de notas
   Sin contexto de audio (antes del primer clic) no suena nada y no falla. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var A = ACH.audio = ACH.audio || {};
  var R = A.recipes = A.recipes || {};

  function L0(L) { return L || A.lib; }
  function f(L, m) { return L.mtof(m); }
  // nota punteada: m (midi), t (s), o {vel, decay, bright, bend, bendT, dur}
  function nt(ctx, L, out, m, t, o) {
    o = o || {};
    return L.pluck(ctx, out, f(L, m), t, { vel: o.vel == null ? 0.7 : o.vel, decay: o.decay || 0.9, bright: o.bright == null ? 0.65 : o.bright,
      pick: 0.75, pos: o.pos || 0.14, bend: o.bend, bendT: o.bendT, dur: o.dur || 0.9 });
  }
  // v0.11 QA: cada melodía dura ≤ 1,8 s (casi no se pisan con el GCD de 1,2 s): la cola se apaga en el bus
  var MEL_END = 1.75;
  function tail(o, t, end) { var g = o.gain.value; end = end || MEL_END; o.gain.setValueAtTime(g, t + end - 0.4); o.gain.exponentialRampToValueAtTime(0.0008, t + end); }
  function chordM(L, ms) { return ms.map(function (m) { return f(L, m); }); }
  function reg(name, fn, dur, prio, wet) { fn.dur = dur; fn.priority = prio || 4; fn.cooldown = 0.3; fn.wet = wet == null ? 0.22 : wet; R[name] = fn; }

  /* ---- HUAYNO DEL ALIVIO: pentatónica menor de La, aguda, saltadita (corta-larga), cierra arriba ---- */
  reg('hab.alivio', function (ctx, out, d, L) {
    L = L0(L);
    var t = ctx.currentTime + 0.02, o = L.bus(ctx, out, 0.9), body = L.bodyResonance(ctx, o, { wet: 0.8 });
    // [midi, inicio en corcheas de 0,1 s]: figura propia de corta-larga (0,1 + 0,2)
    var mel = [[76, 0], [79, 1], [76, 3], [74, 4], [72, 6], [74, 7], [76, 9], [81, 10], [79, 12.5]];
    for (var i = 0; i < mel.length; i++) nt(ctx, L, body, mel[i][0], t + mel[i][1] * 0.075, { vel: i === mel.length - 1 ? 0.75 : 0.6, decay: i === mel.length - 1 ? 0.8 : 0.45, bright: 0.75 });
    // bajo que marca el pulso del huayno (tierra en el 1, quinta en el 2)
    [[45, 0], [52, 3], [45, 6], [52, 9], [45, 12.5]].forEach(function (b) { nt(ctx, L, body, b[0], t + b[1] * 0.075, { vel: 0.45, decay: 0.5, bright: 0.35 }); });
    L.harmonic(ctx, o, f(L, 88), t + 0.99, { gain: 0.18, decay: 0.45 });
    tail(o, t);
    return 1.8;
  }, 1.8, 4);

  /* ---- CUMBIA DEL MAREO: bajo, rasgueo a contratiempo, güiro y una melodía que se dobla ---- */
  reg('hab.mareo', function (ctx, out, d, L) {
    L = L0(L);
    var t = ctx.currentTime + 0.02, o = L.bus(ctx, out, 0.85), body = L.bodyResonance(ctx, o, { wet: 0.7 }), b = 0.14, i;
    var bass = [[38, 0], [45, 2], [38, 4], [45, 6]];   // Re – La (1 y 3)
    bass.forEach(function (x) { nt(ctx, L, body, x[0], t + x[1] * b, { vel: 0.6, decay: 0.5, bright: 0.3 }); });
    for (i = 0; i < 4; i++) L.strum(ctx, body, chordM(L, [62, 65, 69]), t + (i * 2 + 1) * b, { spread: 0.008, decay: 0.25, bright: 0.55, vel: 0.28, dur: 0.35, body: false, dir: i % 2 ? 'up' : 'down' });
    for (i = 0; i < 8; i++) L.noiseHit(ctx, o, t + i * b + (i % 2 ? 0.1 : 0), { kind: 'white', type: 'bandpass', f: 4200, q: 2.5, a: 0.03, d: 0.06, gain: 0.06 });   // güiro
    // melodía torcida (los bends la hacen tambalear)
    var mel = [[74, 0.5, 1.06], [72, 1.5, 0.94], [69, 2.5, 1.06], [70, 3.5, 0.94], [69, 4.5, 1.06], [65, 5.5, 0.94], [67, 6.6, 1.0]];
    mel.forEach(function (m) { nt(ctx, L, body, m[0], t + m[1] * b, { vel: 0.55, decay: 0.55, bright: 0.7, bend: m[2], bendT: 0.1 }); });
    tail(o, t);
    return 1.8;
  }, 1.8, 4);

  /* ---- VALS DEL ESCUDO: 3/4, bajo en el 1, acorde en el 2 y el 3, melodía en terceras que sube ---- */
  reg('hab.escudo', function (ctx, out, d, L) {
    L = L0(L);
    var t = ctx.currentTime + 0.02, o = L.bus(ctx, out, 0.85), body = L.bodyResonance(ctx, o, { wet: 0.9 }), q = 0.13, bar, k;
    var bars = [{ b: 40, c: [56, 59, 64] }, { b: 47, c: [54, 59, 63] }, { b: 40, c: [56, 59, 64] }];   // Mi – Si7 – Mi
    for (bar = 0; bar < 3; bar++) {
      var t0 = t + bar * q * 3;
      nt(ctx, L, body, bars[bar].b, t0, { vel: 0.55, decay: 0.8, bright: 0.35 });
      for (k = 1; k < 3; k++) L.strum(ctx, body, chordM(L, bars[bar].c), t0 + k * q, { spread: 0.006, decay: 0.3, bright: 0.5, vel: 0.2, dur: 0.4, body: false });
    }
    var mel = [[68, 71, 0], [71, 75, 1.5], [73, 76, 3], [75, 78, 4.5], [76, 80, 6]];
    mel.forEach(function (m, i) {
      var tt = t + m[2] * q, last = i === mel.length - 1;
      nt(ctx, L, body, m[0], tt, { vel: 0.5, decay: last ? 0.9 : 0.55, bright: 0.7 });
      nt(ctx, L, body, m[1], tt + 0.012, { vel: 0.4, decay: last ? 0.9 : 0.55, bright: 0.75 });
    });
    L.harmonic(ctx, o, f(L, 88), t + 6 * q + 0.05, { gain: 0.22, decay: 0.6 });
    tail(o, t);
    return 1.8;
  }, 1.8, 4);

  /* ---- LAMENTO CHALACO: Mi menor lento, notas que caen arrastradas, trémolo al final ---- */
  reg('hab.lamento', function (ctx, out, d, L) {
    L = L0(L);
    var t = ctx.currentTime + 0.02, o = L.bus(ctx, out, 0.9), body = L.bodyResonance(ctx, o, { wet: 1 });
    nt(ctx, L, body, 40, t, { vel: 0.6, decay: 1.4, bright: 0.3, dur: 1.6 });
    var mel = [[71, 0.0, 1.06], [69, 0.21, 1.0], [67, 0.39, 1.06], [66, 0.56, 1.0], [64, 0.74, 1.12]];
    mel.forEach(function (m) { nt(ctx, L, body, m[0], t + m[1], { vel: 0.55, decay: 0.9, bright: 0.45, bend: m[2], bendT: 0.14 }); });
    for (var i = 0; i < 6; i++) nt(ctx, L, body, 59, t + 0.88 + i * 0.05, { vel: 0.3 * (1 - i / 7), decay: 0.4, bright: 0.4, dur: 0.5 });   // trémolo
    L.strum(ctx, body, chordM(L, [40, 47, 52, 55, 59]), t + 1.06, { spread: 0.04, decay: 0.8, bright: 0.35, vel: 0.3, dur: 0.7, body: false });
    tail(o, t);
    return 1.8;
  }, 1.8, 4, 0.3);

  /* ---- EL ÚLTIMO RASGUEO: rasgueado rápido y el acorde final enorme con golpe ---- */
  reg('hab.rasgueo', function (ctx, out, d, L) {
    L = L0(L);
    var t = ctx.currentTime + 0.02, o = L.bus(ctx, out, 0.85), body = L.bodyResonance(ctx, o, { wet: 1 }), i;
    var Am = chordM(L, [45, 52, 57, 60, 64]), E = chordM(L, [40, 47, 52, 56, 59, 64]);
    var pat = [0, 0.11, 0.18, 0.29, 0.36, 0.47, 0.54, 0.65];
    for (i = 0; i < pat.length; i++) L.strum(ctx, body, i < 4 ? Am : E, t + pat[i], { dir: i % 2 ? 'up' : 'down', spread: 0.006, decay: 0.25, bright: 0.6, vel: 0.3 + i * 0.03, dur: 0.3, body: false });
    var tf = t + 0.82;
    L.strum(ctx, body, E, tf, { spread: 0.012, decay: 1.2, bright: 0.8, vel: 0.85, dur: 0.95, body: false });
    L.strum(ctx, body, chordM(L, [52, 59, 64, 68, 71, 76]), tf + 0.02, { spread: 0.012, decay: 1.0, bright: 0.85, vel: 0.5, dur: 0.9, body: false });
    L.tone(ctx, o, tf, { type: 'sine', f0: 120, f1: 42, sweep: 0.25, a: 0.002, d: 0.45, gain: 0.9 });   // golpe de caja / onda
    L.noiseHit(ctx, o, tf, { kind: 'pink', type: 'lowpass', f: 900, a: 0.002, d: 0.3, gain: 0.5 });
    tail(o, t);
    return 1.8;
  }, 1.8, 5, 0.25);

  /* ---- Barranco (B1c, BARRANCO.md §5.5): LANDÓ DEL CONTRAPUNTO. 6/8 lento: cajón grave en el 1, «cerrado» seco en el 3 y el 5,
     bordón en Mi, arpegio amplio de La menor y una frase propia muy ligada que pregunta y se responde a sí misma. Original. ---- */
  function cajon(ctx, L, o, t, slap, g) {
    if (slap) L.noiseHit(ctx, o, t, { kind: 'white', type: 'bandpass', f: 2400, q: 1.4, a: 0.002, d: 0.07, gain: 0.22 * (g || 1) });
    else { L.tone(ctx, o, t, { type: 'sine', f0: 118, f1: 52, sweep: 0.09, a: 0.002, d: 0.22, gain: 0.55 * (g || 1) }); L.noiseHit(ctx, o, t, { kind: 'pink', type: 'lowpass', f: 700, a: 0.002, d: 0.06, gain: 0.12 * (g || 1) }); }
  }
  reg('hab.contrapunto', function (ctx, out, d, L) {
    L = L0(L);
    var t = ctx.currentTime + 0.02, o = L.bus(ctx, out, 0.85), body = L.bodyResonance(ctx, o, { wet: 0.85 }), e = 0.2;   // corchea de 0,2 s
    [[0, 0], [2, 1], [3, 0, 0.5], [4, 1], [6, 0], [8, 1], [9, 0, 0.6]].forEach(function (c) { cajon(ctx, L, o, t + c[0] * e, c[1], c[2]); });
    nt(ctx, L, body, 40, t, { vel: 0.5, decay: 1.0, bright: 0.3, dur: 1.2 });
    nt(ctx, L, body, 45, t + 6 * e, { vel: 0.45, decay: 0.9, bright: 0.3, dur: 1.0 });
    [52, 57, 60, 64].forEach(function (m, i) { nt(ctx, L, body, m, t + (1 + i) * e * 0.5 + e, { vel: 0.22, decay: 0.6, bright: 0.45 }); });   // arpegio amplio
    // pregunta (sube) y respuesta (cae a la tónica), ligada con bends suaves
    var mel = [[69, 0.5, 1.0], [72, 1.5, 1.03], [71, 2.5, 1.0], [74, 3.5, 0.97], [72, 5.0, 1.0], [71, 6.0, 1.03], [69, 7.0, 1.0]];
    mel.forEach(function (m, i) { nt(ctx, L, body, m[0], t + m[1] * e, { vel: i === mel.length - 1 ? 0.6 : 0.5, decay: i === mel.length - 1 ? 0.9 : 0.6, bright: 0.6, bend: m[2], bendT: 0.12 }); });
    L.harmonic(ctx, o, f(L, 81), t + 7.2 * e, { gain: 0.16, decay: 0.5 });
    tail(o, t);
    return 1.8;
  }, 1.8, 4, 0.26);
  /* campanita del metrónomo: golpe que conecta ¡A TIEMPO! con el Landó prendido (y el cajón a tiempo, el muñeco de práctica) */
  reg('hab.contrapunto.atiempo', function (ctx, out, d, L) {
    L = L0(L);
    var t = ctx.currentTime, o = L.bus(ctx, out, 0.6);
    L.harmonic(ctx, o, f(L, 88), t, { gain: 0.32, decay: 0.3 });
    L.harmonic(ctx, o, f(L, 95), t + 0.03, { gain: 0.2, decay: 0.25 });
    return 0.5;
  }, 0.5, 5, 0.15);
  R['hab.contrapunto.atiempo'].cooldown = 0.06;

  /* ---- SUBIR DE NIVEL: arpegio ascendente y destellos ---- */
  reg('hab.nivel', function (ctx, out, d, L) {
    L = L0(L);
    var t = ctx.currentTime + 0.02, o = L.bus(ctx, out, 0.8), body = L.bodyResonance(ctx, o, { wet: 0.6 });
    [60, 64, 67, 72, 76].forEach(function (m, i) { nt(ctx, L, body, m, t + i * 0.07, { vel: 0.55, decay: 0.9, bright: 0.8 }); });
    L.harmonic(ctx, o, f(L, 84), t + 0.4, { gain: 0.25, decay: 0.6 });
    L.harmonic(ctx, o, f(L, 91), t + 0.5, { gain: 0.18, decay: 0.6 });
    return 1.6;
  }, 1.6, 4);

  /* ---- DESPERTAR: las cuerdas vibran solas, de abajo hacia arriba, con un brillo ---- */
  reg('hab.despertar', function (ctx, out, d, L) {
    L = L0(L);
    var t = ctx.currentTime + 0.02, o = L.bus(ctx, out, 0.85), body = L.bodyResonance(ctx, o, { wet: 1 });
    [40, 45, 50, 55, 59, 64].forEach(function (m, i) { nt(ctx, L, body, m, t + i * 0.16, { vel: 0.35 + i * 0.05, decay: 1.6, bright: 0.5, dur: 1.8, bend: 0.97, bendT: 0.3 }); });
    [76, 83, 88].forEach(function (m, i) { L.harmonic(ctx, o, f(L, m), t + 1.0 + i * 0.12, { gain: 0.2, decay: 0.9 }); });
    var sw = L.noiseSrc(ctx, 'pink', t, 1.6), bp = L.filter(ctx, 'bandpass', 600, 3), g = ctx.createGain();
    bp.frequency.setValueAtTime(600, t); bp.frequency.exponentialRampToValueAtTime(5000, t + 1.4);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 1.0); g.gain.exponentialRampToValueAtTime(0.001, t + 1.55);
    sw.connect(bp); bp.connect(g); g.connect(o);
    return 2.6;
  }, 2.6, 5, 0.35);

  /* ---- ¡CLANG! del escudo: metal + armónico ---- */
  reg('hab.clang', function (ctx, out, d, L) {
    L = L0(L);
    var t = ctx.currentTime, o = L.bus(ctx, out, 0.7);
    L.clang(ctx, o, t, { f: 820, gain: 0.45, decay: 0.3, n: 4 });
    L.harmonic(ctx, o, f(L, 88), t + 0.01, { gain: 0.3, decay: 0.35 });
    return 0.6;
  }, 0.6, 5, 0.15);
  R['hab.clang'].cooldown = 0.08;
})();
