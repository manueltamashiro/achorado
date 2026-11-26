/* ACHORADO — audio/sfx.js (v0.5): diseño de sonido, todo sintetizado con Web Audio (sin archivos, sin librerías).
   Contiene:
     ACH.audio.lib      sintes compartidos (ruido en caché, ADSR, cuerda Karplus-Strong, rasgueo, cuerpo de guitarra,
                        voz de formantes, resonadores modales, percusión de ruido, limitador suave, rand con semilla).
     ACH.audio.recipes  una receta por evento: fn(ctx, out, data, lib). Programa desde ctx.currentTime y conecta a `out`.
                        Cada receta pasa por lib.bus(): limitador suave → pico máximo ≈ −1,4 dBFS con ganancia 1.
     ACH.audio.amb      ambiente: start(ctx, out, lib) → controlador (ver abajo).

   ── lib (firmas) ─────────────────────────────────────────────────────────────────────────────────────────────
   rand(seed) → () → [0,1)          rnd() Math.random   rr(a,b)   vary(v, pct)   pick(arr)   st(semitonos) → razón   mtof(midi)
   noise(ctx, 'white'|'pink'|'brown') → AudioBuffer 4 s en bucle (caché por ctx, RMS 0,25)
   noiseSrc(ctx, kind, t, dur, loop) → AudioBufferSourceNode ya iniciado en t (offset al azar)
   filter(ctx, type, f, q, gainDb) → BiquadFilterNode
   adsr(param, t, {a,d,s,r,peak,dur}) → t fin      (decaimiento exponencial)
   bus(ctx, out, gain) → GainNode de entrada (limitador suave → out)
   tone(ctx, out, t, {type,f0,f1,sweep,a,d,gain})     seno con barrido y caída (golpe de cuerpo, bombo)
   noiseHit(ctx, out, t, {kind,type,f,f1,q,a,d,gain}) ruido filtrado con caída; `gain` ≈ pico (autocompensado)
   modal(ctx, out, t, {freqs,decays|decay,gains,gain,a}) banco de senos que decaen (madera, metal)
   pluck(ctx, out, freq, t, {decay,bright,pick,pos,vel,dur,bend,bendT}) → source   cuerda Karplus-Strong
   bodyResonance(ctx, out, {wet}) → nodo de entrada   cuerpo de guitarra acústica (modos 100/205/400/1100/2400 Hz)
   strum(ctx, out, freqs, t, {dir,spread,decay,bright,vel,bend,body}) → t fin    rasgueo de varias cuerdas
   chord(name, mul) → [Hz…]   (Em Am G D C E A Dm)
   harmonic(ctx, out, f, t, {gain,decay})   «plink» de armónico de guitarra
   voice(ctx, out, t, {dur,f0:[[u,Hz]…],vowels:[[u,'a'|[F1,F2,F3]]…],amp:[[u,g]…],fscale,bw,breath,rasp,raspHz,
         gargle,gargleHz,vib,vibHz,jitter,src,drive,gain})   voz: fuente glotal + banco de formantes (u = 0..1 de dur)
   flaps(ctx, out, t, times[], {gain,pitch,low})    aleteos (paloma / gallinazo)
   curve(keys, n, jitter) → Float32Array    ·    VOW tabla de vocales

   ── v0.6 (F4) ──────────────────────────────────────────────────────────────────────────────────────────────
   lib.loop(ctx, out, {data, setup(h), step(h,t)→t, set(h,patch)}) → stop()  reloj de programación anticipada para loops (stop.set(patch), stop.pump(t) offline)
   lib.clang(ctx,out,t,{f,gain,decay,n})  metal golpeado   ·   lib.bell(ctx,out,t,{f,gain,decay})  timbre de bici
   Recetas con `.loop = true` devuelven stop(): car.alarm, sling.stretch, zombie.wheel/skate/bike/cart, zombie.sing, singer.window.
     · emit(name, {x,y,dur}) las toca `dur` s (o `.dur`) y se apagan solas; ACH.audio.stop(name) las corta antes.
     · ACH.audio.loop(name, data) → {move(x,y[,patch]), set(patch), stop(), alive}: el motor las panea/atenúa y las mantiene vivas
       mientras alguien llame move/set/touch (≤4 s de silencio = se apagan); patch: {speed} en ruedas (px/s o 0..1), {charge} 0..1 en la resortera.
   Nuevas: prop.hit.metal/glass, prop.break.car/trash/cart, car.alarm, pole.spark, glass.crunch, dog.yelp, cat.meow/hiss/run, sling.stretch/release,
     stone.hit.zombie/metal/glass/wood, stone.land, loot.drop/pickup/rare/coins, inv.open/close, item.eat/drink, bag.full, singer.window,
     zombie.hop/crutch/crawl/wheel/skate/bike/cart/sing, shield.clang, vehicle.fall.

   ── v0.8 (G5) ──────────────────────────────────────────────────────────────────────────────────────────────
   Nuevas: guitar.crack/break, punch.swing/hit, skate.swing/hit/break, throw.skate, roll.skate (loop), throw.bici, throw.moto (loop), moto.crash,
     kick.cart, cart.roll (loop), cart.spill, cart.take, grab, night.fall, invis.on/off, item.sick, zombie.moto (loop).
     Loops con {speed} (px/s o 0..1): roll.skate (ref 260), cart.roll (ref 240), throw.moto (ref 380, acelera solo ~1 s), zombie.moto (ref 160; patch {rev:true} = rugido).

   ── v0.9 (H6) · Nivel 2: EL CERRO ──────────────────────────────────────────────────────────────────
   Nuevas: jump, land, carretilla.warn/roll(loop)/crash/jumped, gallinazo.screech/flap/peck/hit/fall, senora.yell (formantes, sin palabras), balde.windup/splash,
     olla.windup/clong/parry, escoba.swing/hit/break, molotov.light/throw/break, fire.whoosh, fire.loop (loop), fire.out, zombie.burn, tele.crash, throw.tele,
     fridge.hit/open, chicken.cluck/flee, wind.dust ({intensity}), radio.cumbia (loop).
     Loops (ACH.audio.loop): carretilla.roll {speed px/s | 0..1, ref 170}, fire.loop {intensity 0..1, posicional por zona}, radio.cumbia {intensity 0..1; radio lejana, filtrada, «Cumbia del Tendal»}.
     Ambiente por nivel: ACH.audio.amb.setLevel(id) / ctl.setLevel(id), id = 'gambetta' | 'cerro' (fundido ~2 s; se recuerda si el ambiente aún no arrancó). cerro: garúa x0,15, viento x1,6 +0,28 con polvo
     (arena que roza, ligada al viento), mar casi mudo, rumor de ciudad abajo, perros a coro (evento 'chorus'), bocinas lejanas ('bocina'), radio lejana ('radio'). ctl.event acepta también esos nombres.

   ── v0.13 (C4) ────────────────────────────────────────────────────────────────────────────────────────────
   Nuevas: rest (acorde cálido de guitarra al tocar un descanso; game.js la emite con {x, y, label}), radio.static ({dur, tune}), radio.news (sintonía), zona.cartel (cartel de zona del Cerro).

   ── amb.start(ctx, out, lib) → controlador ───────────────────────────────────────────────────────────────────
   setRain(v 0..1)             garúa (por defecto 1)
   setWind(v 0..1)             nivel de viento EN VIVO (game.js lo llama cada 0,5 s con fx.ambient.wind); al primer
                               llamado se apagan las ráfagas autónomas internas.
   gust(strength)              ráfaga autónoma (solo si nadie maneja setWind)
   setListener(x, y)           centro de la cámara (mundo px) para los zumbidos posicionales (se puede llamar cada cuadro)
   lampBuzz(x, y, on, sub)     registra/quita un poste: sub 'sodium' (60 Hz de red peruana, por defecto) | 'neon' (cruz de botica)
   flies(x, y, on)             registra/quita un nido de moscas (basura)
   setLamps(list)              alternativa: reemplaza todos los postes con [{x,y,sub}] o [[x,y]]
   event(name, t)              fuerza un evento lejano: 'alarm' | 'dog' | 'calamina' | 'horn'
   pump(untilTime)             programa eventos hasta ese instante (lo llama un timer solo; se usa a mano con OfflineAudioContext)
   setBed(v)                   nivel del colchón (lluvia+viento+mar), 0..2 (por defecto 0,5), para mezclar o aislar eventos
   stop()                      apaga con fundido y libera todo
   Solo suenan los 3 postes y las 2 nubes de moscas más cercanos (piscina fija de voces). */
var ACH = window.ACH = window.ACH || {};
var A = ACH.audio = ACH.audio || {};
(function () {
  'use strict';
  var lib = A.lib = A.lib || {};
  var R = A.recipes = A.recipes || {};
  var TAU = Math.PI * 2;
  var rnd = Math.random;
  var MAINS = 60;                       // Perú: red de 60 Hz (el zumbido fuerte del sodio es a 120 Hz)

  function rr(a, b) { return a + (b - a) * rnd(); }
  function vary(v, p) { return v * (1 + (rnd() * 2 - 1) * p); }
  function pick(a) { return a[Math.floor(rnd() * a.length) % a.length]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function st(n) { return Math.pow(2, n / 12); }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  lib.rnd = rnd; lib.rr = rr; lib.vary = vary; lib.pick = pick; lib.clamp = clamp; lib.st = st; lib.mtof = mtof;

  /* ---------- rand con semilla (mulberry32) ---------- */
  lib.rand = function (seed) {
    var a = (seed | 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ---------- ruido en caché ---------- */
  function cacheOf(ctx) { return ctx.__achSfx || (ctx.__achSfx = {}); }
  lib.noise = function (ctx, kind) {
    var c = cacheOf(ctx);
    if (c[kind]) return c[kind];
    var sr = ctx.sampleRate, len = Math.floor(sr * 4), X = 4096, n = len + X;
    var r = lib.rand(kind === 'white' ? 11 : kind === 'pink' ? 23 : 37), x = new Float32Array(n), i, w;
    if (kind === 'pink') {
      var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (i = 0; i < n; i++) {
        w = r() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856; b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
        x[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926;
      }
    } else if (kind === 'brown') {
      var b = 0;
      for (i = 0; i < n; i++) { w = r() * 2 - 1; b = (b + 0.02 * w) / 1.02; x[i] = b; }
    } else {
      for (i = 0; i < n; i++) x[i] = r() * 2 - 1;
    }
    var buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0), s = 0, ang;
    for (i = 0; i < len; i++) d[i] = x[i];
    for (i = 0; i < X; i++) {             // bucle sin costura: fundido de potencia constante de la cola sobre la cabeza
      ang = (i / X) * Math.PI / 2;
      d[i] = x[i] * Math.sin(ang) + x[len + i] * Math.cos(ang);
    }
    for (i = 0; i < len; i++) s += d[i] * d[i];
    var k = 0.25 / Math.sqrt(s / len + 1e-12);
    for (i = 0; i < len; i++) d[i] *= k;
    c[kind] = buf;
    return buf;
  };
  lib.noiseSrc = function (ctx, kind, t, dur, loop) {
    var s = ctx.createBufferSource(), buf = lib.noise(ctx, kind);
    s.buffer = buf; s.loop = true;
    s.start(t, rnd() * (buf.duration - 0.2));
    if (dur) s.stop(t + dur);
    return s;
  };

  /* ---------- utilidades de nodos ---------- */
  lib.filter = function (ctx, type, f, q, g) {
    var b = ctx.createBiquadFilter();
    b.type = type; b.frequency.value = Math.max(10, Math.min(f, ctx.sampleRate * 0.45));
    if (q != null) b.Q.value = q;
    if (g != null) b.gain.value = g;
    return b;
  };
  lib.adsr = function (p, t, o) {
    var F = 0.0001, a = o.a == null ? 0.002 : o.a, d = o.d == null ? 0.05 : o.d, s = o.s == null ? 0 : o.s,
      r = o.r == null ? 0.03 : o.r, pk = o.peak == null ? 1 : o.peak, dur = o.dur == null ? a + d : o.dur;
    var sl = Math.max(F, pk * s), te = Math.max(t + a + d, t + dur);
    p.setValueAtTime(F, t);
    p.linearRampToValueAtTime(Math.max(F, pk), t + a);
    p.exponentialRampToValueAtTime(sl, t + a + d);
    if (te > t + a + d) p.setValueAtTime(sl, te);
    p.exponentialRampToValueAtTime(F, te + r);
    return te + r;
  };

  /* Limitador suave: tanh con rodilla en 0,55 → techo 0,82 (−1,7 dBFS; ≈ −1,3 con el sobremuestreo). La entrada se escala ×0,5 para admitir hasta ×2. */
  var LIM = null;
  function limCurve() {
    if (LIM) return LIM;
    var n = 4097, c = new Float32Array(n), i, u, a, k = 0.55, ce = 0.82;
    for (i = 0; i < n; i++) {
      u = (i / (n - 1)) * 2 - 1; a = Math.abs(u) * 2;
      var y = a < k ? a : k + (ce - k) * Math.tanh((a - k) / (ce - k));
      c[i] = u < 0 ? -y : y;
    }
    return (LIM = c);
  }
  lib.bus = function (ctx, out, gain) {
    var pre = ctx.createGain(), sh = ctx.createWaveShaper();
    pre.gain.value = 0.5 * (gain == null ? 1 : gain);
    sh.curve = limCurve();
    try { sh.oversample = '2x'; } catch (e) { /* nada */ }
    pre.connect(sh); sh.connect(out);
    return pre;
  };
  function satCurve(drive) {
    var n = 513, c = new Float32Array(n), k = 1 + drive * 7, i, x, nm = Math.tanh(k);
    for (i = 0; i < n; i++) { x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / nm; }
    return c;
  }

  /* ---------- tono con barrido, ruido filtrado, modal ---------- */
  lib.tone = function (ctx, out, t, o) {
    var os = ctx.createOscillator(), g = ctx.createGain(), a = o.a == null ? 0.002 : o.a, d = o.d == null ? 0.1 : o.d;
    os.type = o.type || 'sine';
    os.frequency.setValueAtTime(Math.max(5, o.f0), t);
    if (o.f1) os.frequency.exponentialRampToValueAtTime(Math.max(5, o.f1), t + (o.sweep || d));
    lib.adsr(g.gain, t, { a: a, d: d, s: 0, peak: o.gain == null ? 1 : o.gain, dur: a + d, r: 0.01 });
    os.connect(g); g.connect(out);
    os.start(t); os.stop(t + a + d + 0.03);
    return g;
  };
  function bandFrac(kind, type, f, q, sr) {
    var ny = sr / 2, lo, hi, bw, fr;
    if (type === 'lowpass') { lo = 20; hi = Math.min(f * 1.3, ny); }
    else if (type === 'highpass') { lo = f * 0.8; hi = ny; }
    else { bw = f / Math.max(q, 0.3); lo = Math.max(20, f - bw * 0.6); hi = Math.min(ny, f + bw * 0.6); }
    if (hi <= lo) hi = lo * 1.1;
    if (kind === 'pink') fr = Math.log(hi / lo) / Math.log(ny / 20);
    else if (kind === 'brown') fr = (1 / lo - 1 / hi) / (1 / 20 - 1 / ny);
    else fr = (hi - lo) / ny;
    return clamp(fr, 1e-5, 1);
  }
  lib.noiseHit = function (ctx, out, t, o) {
    var kind = o.kind || 'white', type = o.type || 'bandpass', f = o.f || 1000, q = o.q == null ? 1 : o.q;
    var a = o.a == null ? 0.001 : o.a, d = o.d == null ? 0.05 : o.d, gn = o.gain == null ? 1 : o.gain;
    var comp = Math.min(80, 1 / (0.25 * Math.sqrt(bandFrac(kind, type, f, q, ctx.sampleRate)) * 3));
    var src = lib.noiseSrc(ctx, kind, t, a + d + 0.06), fl = lib.filter(ctx, type, f, q), g = ctx.createGain();
    if (o.f1) { fl.frequency.setValueAtTime(f, t); fl.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + (o.sweep || a + d)); }
    lib.adsr(g.gain, t, { a: a, d: d, s: 0, peak: gn * comp, dur: a + d, r: 0.01 });
    src.connect(fl); fl.connect(g); g.connect(out);
    return g;
  };
  lib.modal = function (ctx, out, t, o) {
    var fs = o.freqs, i, os, g, dec, ga, a = o.a == null ? 0.001 : o.a;
    for (i = 0; i < fs.length; i++) {
      dec = o.decays ? o.decays[i] : (o.decay || 0.2) / (1 + i * 0.35);
      ga = (o.gains ? o.gains[i] : 1 / (1 + i * 0.6)) * (o.gain == null ? 1 : o.gain);
      if (fs[i] > 19000) continue;   // parciales de vidrio/metal por encima de 19 kHz (f·8,9…): inaudibles y fuera del rango del oscilador (< 24 kHz)
      os = ctx.createOscillator(); g = ctx.createGain();
      os.frequency.value = Math.min(19900, fs[i] * (1 + (rnd() - 0.5) * 0.004));
      lib.adsr(g.gain, t, { a: a, d: dec, s: 0, peak: ga, dur: a + dec, r: 0.01 });
      os.connect(g); g.connect(out); os.start(t); os.stop(t + a + dec + 0.03);
    }
  };

  /* ---------- cuerda Karplus-Strong ---------- */
  function ksBuffer(ctx, freq, decay, bright, pick, pos, dur) {
    var sr = ctx.sampleRate, len = Math.max(256, Math.floor(dur * sr));
    var s = 0.12 + 0.38 * (1 - bright);                              // amortiguamiento del lazo (0,12 brillante … 0,5 apagado)
    var P = sr / freq - s, N = Math.floor(P), dd = P - N;
    if (dd < 0.5) { N -= 1; dd += 1; }
    if (N < 4) { N = 4; dd = 0.7; }
    var C = (1 - dd) / (1 + dd), rho = Math.min(0.99995, Math.pow(10, -3 / (freq * decay)));
    var line = new Float32Array(N), i, y = 0, k = 0.25 + 0.75 * pick, e, mean = 0;
    for (i = 0; i < N; i++) { e = rnd() * 2 - 1; y += k * (e - y); line[i] = y; mean += y; }
    mean /= N;
    var cp = Math.max(1, Math.round(pos * N)), tmp = new Float32Array(N), mx = 1e-6;       // posición del plectro: peine
    for (i = 0; i < N; i++) { tmp[i] = (line[i] - mean) - (line[(i + cp) % N] - mean) * 0.9; if (Math.abs(tmp[i]) > mx) mx = Math.abs(tmp[i]); }
    for (i = 0; i < N; i++) line[i] = tmp[i] / mx;
    var buf = ctx.createBuffer(1, len, sr), o = buf.getChannelData(0), idx = 0, prev = 0, cur, lp, fb, ap, apx = 0, apy = 0, pk = 1e-6;
    for (i = 0; i < len; i++) {
      cur = line[idx]; o[i] = cur;
      lp = (1 - s) * cur + s * prev; prev = cur;
      fb = lp * rho;
      ap = C * (fb - apy) + apx; apx = fb; apy = ap;
      line[idx] = ap; if (++idx >= N) idx = 0;
      if (Math.abs(cur) > pk) pk = Math.abs(cur);
    }
    var fade = Math.min(len, Math.floor(0.05 * sr)), sc = 1 / pk;
    for (i = 0; i < len; i++) o[i] *= sc;
    for (i = 0; i < fade; i++) o[len - 1 - i] *= i / fade;
    return buf;
  }
  lib.pluck = function (ctx, out, freq, t, o) {
    o = o || {};
    var decay = o.decay == null ? 1.2 : o.decay, dur = o.dur || Math.min(2.2, decay * 1.1 + 0.1);
    var buf = ksBuffer(ctx, freq, decay, o.bright == null ? 0.5 : o.bright, o.pick == null ? 0.7 : o.pick, o.pos == null ? 0.16 : o.pos, dur);
    var src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buf; g.gain.value = o.vel == null ? 0.8 : o.vel;
    if (o.bend && o.bend !== 1) {
      src.playbackRate.setValueAtTime(o.bend, t);
      src.playbackRate.exponentialRampToValueAtTime(1, t + (o.bendT || 0.06));
    }
    src.connect(g); g.connect(out); src.start(t);
    return src;
  };
  lib.bodyResonance = function (ctx, out, o) {
    o = o || {};
    var modes = [[98, 6, 4], [205, 4.5, 3], [400, 3, 3], [1100, -2, 1.6], [2400, 2.5, 1.2]], inp = ctx.createGain(), prev = inp, i, f;
    for (i = 0; i < modes.length; i++) {
      f = lib.filter(ctx, 'peaking', vary(modes[i][0], 0.04), modes[i][2], modes[i][1] * (o.wet == null ? 1 : o.wet));
      prev.connect(f); prev = f;
    }
    var lp = lib.filter(ctx, 'lowpass', 7500, 0.6); prev.connect(lp); lp.connect(out);
    return inp;
  };
  lib.strum = function (ctx, out, freqs, t, o) {
    o = o || {};
    var n = freqs.length, i, idx, body = o.body === false ? out : lib.bodyResonance(ctx, out), sp = o.spread == null ? 0.018 : o.spread;
    var up = o.dir === 'up', vel = o.vel == null ? 0.5 : o.vel, tt = t;
    for (i = 0; i < n; i++) {
      idx = up ? n - 1 - i : i;
      tt = t + i * sp * vary(1, 0.3);
      lib.pluck(ctx, body, freqs[idx] * vary(1, 0.0015), tt, {
        decay: vary(o.decay == null ? 1.2 : o.decay, 0.15), bright: clamp(vary(o.bright == null ? 0.6 : o.bright, 0.1), 0, 1),
        pick: o.pick == null ? 0.7 : o.pick, vel: vel * vary(1, 0.2) * (0.85 + 0.15 * (up ? 1 - i / n : i / n)),
        bend: o.bend, bendT: o.bendT, dur: o.dur, pos: rr(0.12, 0.22)
      });
    }
    return tt;
  };
  var CH = { Em: [40, 47, 52, 55, 59, 64], Am: [45, 52, 57, 60, 64], G: [43, 47, 50, 55, 59, 67], D: [50, 57, 62, 66],
    C: [48, 52, 55, 60, 64], E: [40, 47, 52, 56, 59, 64], A: [45, 52, 57, 61, 64], Dm: [50, 57, 62, 65] };
  lib.chord = function (name, mul) {
    var c = CH[name] || CH.Em, r = [], i; mul = mul || 1;
    for (i = 0; i < c.length; i++) r.push(mtof(c[i]) * mul);
    return r;
  };
  lib.harmonic = function (ctx, out, f, t, o) {
    o = o || {};
    var gn = o.gain == null ? 0.4 : o.gain, dc = o.decay || 0.25, c = f * Math.pow(2, (rnd() - 0.5) * 0.04);
    lib.modal(ctx, out, t, { freqs: [c, c * 2.003, c * 3.01], decays: [dc, dc * 0.45, dc * 0.25], gains: [gn, gn * 0.2, gn * 0.07], a: 0.0015 });
    lib.noiseHit(ctx, out, t, { type: 'highpass', f: 5000, d: 0.005, gain: gn * 0.18 });
  };

  /* ---------- voz de formantes ---------- */
  var VOW = lib.VOW = {
    a: [730, 1090, 2440], e: [530, 1840, 2480], i: [270, 2290, 3010], o: [570, 840, 2410], u: [300, 870, 2240],
    ae: [660, 1720, 2410], uh: [520, 1190, 2390], m: [250, 1000, 2200], ee: [400, 2000, 2700]
  };
  function keyAt(keys, u) {
    var i, k0, k1;
    if (u <= keys[0][0]) return keys[0][1];
    for (i = 1; i < keys.length; i++) {
      if (u <= keys[i][0]) { k0 = keys[i - 1]; k1 = keys[i]; return k0[1] + (k1[1] - k0[1]) * (u - k0[0]) / Math.max(1e-6, k1[0] - k0[0]); }
    }
    return keys[keys.length - 1][1];
  }
  lib.curve = function (keys, n, jit) {
    var a = new Float32Array(n), j = 0, i, v;
    for (i = 0; i < n; i++) {
      v = keyAt(keys, i / (n - 1));
      if (jit) { j = j * 0.6 + (rnd() * 2 - 1) * 0.4; v *= 1 + j * jit; }
      a[i] = v;
    }
    return a;
  };
  lib.norm = function (keys, D) { return keys.map(function (k) { return [k[0] / D, k[1]]; }); };
  lib.voice = function (ctx, out, t, o) {
    var dur = o.dur || 0.5, n = clamp(Math.round(dur * 70), 8, 180), i, fs = o.fscale || 1, bwm = o.bw || 1;
    var f0 = lib.curve(o.f0, n, o.jitter == null ? 0.012 : o.jitter);
    var osc = ctx.createOscillator(), end = t + dur + 0.06;
    osc.type = o.src || 'sawtooth';
    osc.frequency.value = f0[0]; osc.frequency.setValueCurveAtTime(f0, t, dur);
    osc.start(t); osc.stop(end);
    if (o.vib) {                                                     // vibrato (en cents)
      var vl = ctx.createOscillator(), vg = ctx.createGain();
      vl.frequency.value = o.vibHz || 5.5; vg.gain.value = o.vib * 1200;
      vl.connect(vg); vg.connect(osc.detune); vl.start(t); vl.stop(end);
    }
    var node = osc;
    if (o.rasp) {                                                    // gruñido: AM rápida
      var am = ctx.createGain(), rl = ctx.createOscillator(), rg = ctx.createGain();
      am.gain.value = 1 - o.rasp * 0.5; rl.type = 'sawtooth'; rl.frequency.value = (o.raspHz || 35) * vary(1, 0.1);
      rg.gain.value = o.rasp * 0.5; rl.connect(rg); rg.connect(am.gain); rl.start(t); rl.stop(end);
      node.connect(am); node = am;
    }
    if (o.gargle) {                                                  // gárgara húmeda
      var ga = ctx.createGain(), gl = ctx.createOscillator(), gg = ctx.createGain();
      ga.gain.value = 1 - o.gargle * 0.5; gl.frequency.value = (o.gargleHz || 16) * vary(1, 0.15);
      gg.gain.value = o.gargle * 0.5; gl.connect(gg); gg.connect(ga.gain); gl.start(t); gl.stop(end);
      node.connect(ga); node = ga;
    }
    var bank = ctx.createGain(), env = ctx.createGain(), k, F = [[], [], []], vk = o.vowels, bw = [80, 100, 140], gains = [1, 0.55, 0.3];
    node.connect(bank);
    if (o.breath) {
      var ns = lib.noiseSrc(ctx, 'white', t, dur + 0.06), ng = ctx.createGain();
      ng.gain.value = o.breath * 0.9; ns.connect(ng); ng.connect(bank);
    }
    for (k = 0; k < 3; k++) {
      var keys = [];
      for (i = 0; i < vk.length; i++) { var v = vk[i][1]; v = (typeof v === 'string' ? VOW[v] : v); keys.push([vk[i][0], v[k] * fs]); }
      var fc = lib.curve(keys, n, 0), fl = ctx.createBiquadFilter(), fg = ctx.createGain(), mid = fc[(n / 2) | 0];
      fl.type = 'bandpass'; fl.Q.value = Math.max(1, mid / (bw[k] * bwm)); fl.frequency.value = fc[0];
      fl.frequency.setValueCurveAtTime(fc, t, dur);
      fg.gain.value = gains[k]; bank.connect(fl); fl.connect(fg); fg.connect(env);
    }
    var f4 = lib.filter(ctx, 'bandpass', 3400 * fs, 4), g4 = ctx.createGain(); g4.gain.value = 0.12 * (o.bright == null ? 1 : o.bright);
    bank.connect(f4); f4.connect(g4); g4.connect(env);
    var am2 = lib.curve(o.amp, n, 0.04), gn = o.gain == null ? 1 : o.gain;
    for (i = 0; i < n; i++) am2[i] = Math.max(0, am2[i] * gn);
    env.gain.value = 0; env.gain.setValueCurveAtTime(am2, t, dur);
    var last = env;
    if (o.drive) { var sh = ctx.createWaveShaper(); sh.curve = satCurve(o.drive); env.connect(sh); last = sh; }
    last.connect(out);
    return env;
  };

  /* ---------- aleteos ---------- */
  lib.flaps = function (ctx, out, t, times, o) {
    o = o || {};
    var gn = o.gain == null ? 0.5 : o.gain, p = o.pitch || 1, i, tt;
    for (i = 0; i < times.length; i++) {
      tt = t + times[i];
      lib.noiseHit(ctx, out, tt, { type: 'bandpass', f: vary(1700 * p, 0.2), q: 0.7, a: 0.005, d: vary(0.05, 0.3), gain: gn * vary(1, 0.3) });
      lib.noiseHit(ctx, out, tt, { type: 'highpass', f: 4200 * p, a: 0.006, d: 0.035, gain: gn * 0.35 * vary(1, 0.3) });
      if (o.low) {
        lib.noiseHit(ctx, out, tt, { kind: 'brown', type: 'lowpass', f: vary(420, 0.2), q: 0.7, a: 0.012, d: vary(0.1, 0.2), gain: gn * o.low });
        lib.tone(ctx, out, tt, { f0: vary(95, 0.2), f1: 55, a: 0.01, d: 0.1, gain: gn * o.low * 0.5 });
      }
    }
  };

  /* =====================================================================================================
     RECETAS
     ===================================================================================================== */
  var DISS = [[40, 47, 53, 58, 62, 65], [40, 46, 52, 59, 63, 66], [43, 49, 55, 58, 64, 70], [38, 44, 50, 57, 63, 67]];

  /* --- el golpe: lo más fuerte y presente de la mezcla --- */
  R.hit = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, type = d.type || 'caminante', killed = !!d.killed, combo = clamp((d.combo | 0) || 1, 1, 6);
    var F = ({ caminante: [1, 1, 0.8], escolar: [1.2, 0.65, 0.4], ciego: [0.95, 1.1, 0.9], cobrador: [0.88, 1.35, 1.25] })[type] || [1, 1, 0.8];
    var pm = st([0, 2, 4, 7, 9, 12][combo - 1]) * F[0] * vary(1, 0.05), th = F[1], meat = F[2], o = L.bus(ctx, out, 1.8), i;
    L.tone(ctx, o, t, { f0: vary(175, 0.07) * Math.sqrt(pm), f1: vary(58, 0.08), d: 0.15, gain: 0.8 * th });         // golpe en la tapa
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(215, 0.06), q: 3, d: 0.13, gain: 0.55 * th });                 // caja de resonancia
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: vary(750, 0.1), q: 0.7, d: 0.06, gain: 0.5 * meat }); // carne
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(2700, 0.1) * Math.sqrt(pm), q: 1.3, d: 0.018, gain: 0.7 });     // crack de madera
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 5200, q: 0.7, d: 0.006, gain: 0.4 });
    L.modal(ctx, o, t, { freqs: [900 * vary(1, 0.05) * Math.sqrt(pm), 1850 * vary(1, 0.05), 3100 * vary(1, 0.05)], decays: [0.05, 0.03, 0.02], gains: [0.3, 0.2, 0.12] });
    var fr = pick(DISS).map(function (m) { return mtof(m) * pm; });                                                  // ¡PLANG!: racimo disonante
    L.strum(ctx, o, fr, t + 0.002, { spread: vary(0.0035, 0.4), decay: killed ? 0.6 : 0.4, bright: 0.9, vel: 0.2, bend: 1.04, bendT: 0.07, dir: rnd() < 0.5 ? 'down' : 'up', dur: killed ? 0.8 : 0.55 });
    if (killed) {
      for (i = 0; i < 4; i++) L.noiseHit(ctx, o, t + 0.008 + i * rr(0.008, 0.02), { type: 'bandpass', f: rr(1300, 3200), q: 2, d: 0.02, gain: 0.5 });
      L.tone(ctx, o, t + 0.005, { f0: vary(82, 0.08), f1: 34, d: 0.5, gain: 0.9 * th });                             // boom grave
      L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 170, q: 0.7, d: 0.42, gain: 0.8 });
      L.strum(ctx, o, L.chord('Em', 1), t + 0.03, { spread: 0.012, decay: 0.8, bright: 0.5, vel: 0.1, dur: 0.9 });
    }
  };
  R.hit.cooldown = 0.04;

  R.swing = function (ctx, out, d, L) {
    L = L || lib;
    var t = ctx.currentTime, dur = vary(0.24, 0.15), o = L.bus(ctx, out, 0.27);
    var src = L.noiseSrc(ctx, 'pink', t, dur + 0.1), bp = L.filter(ctx, 'bandpass', 380, 1.2), g = ctx.createGain();
    bp.frequency.setValueAtTime(vary(380, 0.1), t);
    bp.frequency.exponentialRampToValueAtTime(vary(1900, 0.1), t + dur * 0.4);
    bp.frequency.exponentialRampToValueAtTime(vary(700, 0.1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(5.5, t + dur * 0.38); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(o);
    L.noiseHit(ctx, o, t + dur * 0.15, { type: 'highpass', f: 4000, a: dur * 0.25, d: dur * 0.5, gain: 0.35 });
    L.strum(ctx, o, L.chord(pick(['Em', 'Am', 'D']), vary(1, 0.005)), t + dur * 0.2, { spread: 0.02, decay: 0.7, bright: 0.45, vel: 0.07, dur: 0.7 });
  };
  R.swing.cooldown = 0.08;

  R.whiff = function (ctx, out, d, L) {
    L = L || lib;
    var t = ctx.currentTime, dur = vary(0.13, 0.15), o = L.bus(ctx, out, 0.23);
    var src = L.noiseSrc(ctx, 'pink', t, dur + 0.1), bp = L.filter(ctx, 'bandpass', 900, 1.0), g = ctx.createGain();
    bp.frequency.setValueAtTime(vary(900, 0.1), t); bp.frequency.exponentialRampToValueAtTime(vary(3000, 0.1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(3.2, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(o);
    L.pluck(ctx, o, pick([164.8, 220, 146.8]) * vary(1, 0.01), t + 0.03, { decay: 0.4, bright: 0.4, vel: 0.03, dur: 0.4 });
  };
  R.whiff.cooldown = 0.08;

  R.kill = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.06, type = d.type || 'caminante', o = L.bus(ctx, out, 0.47);
    var light = type === 'escolar', pm = (light ? 1.25 : type === 'ciego' || type === 'cobrador' ? 0.9 : 1) * vary(1, 0.07), gm = light ? 0.65 : 1;
    L.tone(ctx, o, t, { f0: 100 * pm, f1: 42 * pm, d: 0.24, gain: 0.8 * gm });                                       // cuerpo contra el piso
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'lowpass', f: vary(1000, 0.15), q: 0.7, d: 0.08, gain: 0.7 * gm });    // chasquido húmedo
    L.noiseHit(ctx, o, t + 0.01, { type: 'bandpass', f: vary(1800, 0.15), q: 0.6, a: 0.004, d: 0.2, gain: 0.3 });      // agua del asfalto
    L.noiseHit(ctx, o, t + 0.02, { type: 'highpass', f: 4000, a: 0.01, d: 0.22, gain: 0.14 });
    L.noiseHit(ctx, o, t + 0.04, { kind: 'pink', type: 'lowpass', f: 2500, a: 0.06, d: 0.3, gain: 0.22 * gm });        // ropa que se acomoda
    L.tone(ctx, o, t + 0.2, { f0: 70 * pm, f1: 45 * pm, d: 0.12, gain: 0.25 * gm });
    L.noiseHit(ctx, o, t + 0.21, { type: 'bandpass', f: vary(1400, 0.2), q: 0.8, d: 0.05, gain: 0.15 });
  };
  R.kill.cooldown = 0.05;

  /* --- zombies --- */
  function wetSmacks(ctx, o, t, dur, n, L) {                         // chasquidos de saliva / gárgara
    for (var i = 0; i < n; i++) L.tone(ctx, o, t + rr(0.05, dur), { f0: rr(250, 500), f1: rr(600, 1100), d: 0.018, a: 0.003, gain: rr(0.04, 0.09) });
  }
  R['zombie.idle'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.01, type = d.type || 'caminante', o = L.bus(ctx, out, ({ escolar: 0.2, ciego: 0.38 })[type] || 0.14);
    if (type === 'escolar') {
      var base = vary(290, 0.12), D = vary(0.8, 0.2);
      L.voice(ctx, o, t, { dur: D, f0: [[0, base * 1.05], [0.3, base * 1.1], [0.65, base * 0.95], [1, base * 0.7]], vowels: [[0, 'a'], [0.4, 'ae'], [0.7, 'e'], [1, 'uh']],
        amp: [[0, 0], [0.12, 0.8], [0.6, 1], [1, 0]], fscale: 1.28, breath: 0.4, rasp: 0.25, raspHz: 70, vib: 0.03, vibHz: 6.5, jitter: 0.03, gain: 1.6, drive: 0.15, bw: 1.2 });
      L.noiseHit(ctx, o, t, { type: 'bandpass', f: 3200, q: 1, a: 0.05, d: 0.2, gain: 0.06 });
    } else if (type === 'ciego') {
      var n = 2 + ((rnd() * 2) | 0), i, tt = t;
      for (i = 0; i < n; i++) {                                      // olfateo: inhalaciones cortas
        L.noiseHit(ctx, o, tt, { type: 'bandpass', f: vary(2200, 0.15), f1: vary(3400, 0.1), q: 1.1, a: 0.04, d: 0.09, gain: 0.35 });
        L.noiseHit(ctx, o, tt, { kind: 'pink', type: 'bandpass', f: 600, q: 1, a: 0.04, d: 0.1, gain: 0.12 });
        tt += vary(0.2, 0.2);
      }
      tt += 0.12;
      var nc = 1 + ((rnd() * 3) | 0);
      for (i = 0; i < nc; i++) {                                     // chasquidos de lengua
        L.noiseHit(ctx, o, tt, { type: 'bandpass', f: vary(1300, 0.15), q: 7, a: 0.0008, d: 0.012, gain: 0.5 });
        L.tone(ctx, o, tt, { f0: vary(2100, 0.1), f1: vary(1300, 0.1), d: 0.02, gain: 0.12 });
        tt += vary(0.17, 0.25);
      }
      L.voice(ctx, o, t + 0.05, { dur: 0.5, f0: [[0, 70], [1, 58]], vowels: [[0, 'uh'], [1, 'o']], amp: [[0, 0], [0.3, 0.7], [1, 0]], fscale: 0.9, rasp: 0.5, raspHz: 25, breath: 0.3, gain: 0.55 });
    } else {
      var cob = type === 'cobrador', k = (rnd() * 3) | 0, f = cob ? vary(115, 0.12) : vary(80, 0.12), D2 = vary(cob ? 0.9 : 1.15, 0.2);
      var vw = k === 0 ? [[0, 'uh'], [0.4, 'o'], [1, 'u']] : k === 1 ? [[0, 'o'], [0.35, 'a'], [0.7, 'uh'], [1, 'o']] : [[0, 'm'], [0.3, 'u'], [0.7, 'o'], [1, 'a']];
      L.voice(ctx, o, t, { dur: D2, f0: [[0, f * 1.15], [0.25, f * 1.2], [0.7, f * 0.9], [1, f * 0.7]], vowels: vw, amp: [[0, 0], [0.18, 0.85], [0.6, 1], [1, 0]],
        fscale: cob ? 1.0 : 0.88, bw: 1.6, breath: cob ? 0.7 : 0.35, rasp: cob ? 0.55 : 0.4, raspHz: cob ? 45 : 28, gargle: cob ? 0.1 : 0.45, gargleHz: 15, jitter: 0.03, gain: cob ? 2.6 : 3.2, drive: 0.3 });
      wetSmacks(ctx, o, t, D2, cob ? 2 : 4, L);
    }
  };
  R['zombie.idle'].cooldown = 0.25;

  R['zombie.alert'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.01, type = d.type || 'caminante', o = L.bus(ctx, out, 0.25);
    var fm = type === 'escolar' ? 2.5 : type === 'cobrador' ? 1.3 : type === 'ciego' ? 0.85 : 1, fsc = type === 'escolar' ? 1.25 : 0.95, f = 120 * fm * vary(1, 0.1);
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(1500, 0.1), f1: vary(3500, 0.1), q: 0.9, a: 0.08, d: 0.07, gain: 0.5 });  // inhalación brusca
    L.noiseHit(ctx, o, t + 0.01, { kind: 'pink', type: 'bandpass', f: 700, q: 1, a: 0.07, d: 0.09, gain: 0.2 });
    L.voice(ctx, o, t + 0.13, { dur: vary(0.42, 0.15), f0: [[0, f * 1.3], [0.2, f * 1.45], [1, f * 0.7]], vowels: [[0, 'a'], [0.4, 'ae'], [1, 'o']],
      amp: [[0, 0], [0.06, 1], [0.6, 0.8], [1, 0]], fscale: fsc, bw: 1.4, breath: 0.45, rasp: 0.5, raspHz: type === 'escolar' ? 80 : 40, gargle: type === 'escolar' ? 0 : 0.2, jitter: 0.03,
      gain: type === 'escolar' ? 2.2 : 3.4, drive: 0.55 });
    L.tone(ctx, o, t + 0.13, { f0: 140, f1: 70, d: 0.1, gain: 0.15 });
  };
  R['zombie.alert'].cooldown = 0.2;

  R['zombie.lunge'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.005, type = d.type || 'caminante', o = L.bus(ctx, out, 0.19), f = (type === 'escolar' ? 250 : 105) * vary(1, 0.1);
    L.voice(ctx, o, t, { dur: vary(0.32, 0.15), f0: [[0, f * 0.9], [0.4, f * 1.35], [1, f * 0.8]], vowels: [[0, 'o'], [0.4, 'a'], [1, 'uh']], amp: [[0, 0], [0.1, 1], [0.7, 0.8], [1, 0]],
      fscale: type === 'escolar' ? 1.25 : 0.95, bw: 1.4, breath: 0.5, rasp: 0.5, raspHz: 38, jitter: 0.03, gain: type === 'escolar' ? 2.2 : 3.4, drive: 0.5 });
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 450, f1: 1500, q: 0.8, a: 0.1, d: 0.16, gain: 0.4 });          // el cuerpo cortando el aire
    L.noiseHit(ctx, o, t + 0.12, { kind: 'pink', type: 'lowpass', f: 2000, a: 0.04, d: 0.15, gain: 0.18 });                // trapos
  };
  R['zombie.lunge'].cooldown = 0.2;

  R['zombie.bite'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.005, o = L.bus(ctx, out, 0.22), i;
    for (i = 0; i < 2; i++) L.noiseHit(ctx, o, t + i * vary(0.06, 0.2), { type: 'bandpass', f: vary(3200, 0.1), q: 2.5, d: 0.012, gain: 0.55 });   // dientes
    L.tone(ctx, o, t, { f0: 160, f1: 70, d: 0.08, gain: 0.45 });
    L.noiseHit(ctx, o, t + 0.01, { kind: 'pink', type: 'bandpass', f: vary(700, 0.15), q: 1.2, a: 0.01, d: 0.18, gain: 0.45 });                  // masticar húmedo
    L.noiseHit(ctx, o, t + 0.1, { kind: 'pink', type: 'bandpass', f: vary(1000, 0.15), q: 1.5, a: 0.01, d: 0.1, gain: 0.3 });
    wetSmacks(ctx, o, t, 0.25, 4, L);
    L.voice(ctx, o, t + 0.05, { dur: 0.3, f0: [[0, 95], [1, 70]], vowels: [[0, 'uh'], [1, 'o']], amp: [[0, 0], [0.2, 1], [1, 0]], fscale: 0.9, bw: 1.5, breath: 0.4, rasp: 0.5, raspHz: 30, gargle: 0.4, gain: 2.2, drive: 0.3 });
  };
  R['zombie.bite'].cooldown = 0.2;

  /* --- cobrador: «¡al FON-do HAY SI-tio!» con melodía de grito, solo ritmo y entonación --- */
  R['cobrador.shout'] = function (ctx, out, d, L) {
    L = L || lib;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.22), D0 = 1.3, ts = vary(1, 0.06), D = D0 * ts, pm = vary(1, 0.06);
    var f0k = [[0, 170], [0.1, 190], [0.14, 235], [0.3, 295], [0.42, 270], [0.5, 250], [0.58, 240], [0.6, 290], [0.7, 335], [0.8, 315], [0.84, 335], [0.92, 375], [1.04, 345], [1.08, 300], [1.18, 255], [1.3, 195]]
      .map(function (k) { return [k[0], k[1] * pm]; });
    var vk = [[0, 'a'], [0.11, 'a'], [0.14, 'o'], [0.38, 'o'], [0.42, 'm'], [0.46, 'o'], [0.56, 'uh'], [0.6, 'a'], [0.7, 'a'], [0.8, 'i'], [0.88, 'i'], [1.02, 'i'], [1.08, 'i'], [1.2, 'o'], [1.3, 'o']];
    var ak = [[0, 0], [0.02, 0.7], [0.1, 0.75], [0.12, 0.3], [0.15, 0.95], [0.3, 1], [0.38, 0.9], [0.41, 0.5], [0.46, 0.85], [0.49, 0.25], [0.53, 0.7], [0.58, 0.35], [0.62, 0.95], [0.72, 1], [0.79, 0.85],
      [0.82, 0.2], [0.87, 0.9], [0.93, 1], [1.02, 0.85], [1.05, 0.3], [1.09, 0.7], [1.2, 0.75], [1.3, 0]];
    L.voice(ctx, o, t, { dur: D, f0: L.norm(f0k, D0), vowels: L.norm(vk, D0), amp: L.norm(ak, D0), fscale: 1.12, bw: 1.3, breath: 0.35, rasp: 0.35, raspHz: 45,
      vib: 0.012, vibHz: 6, jitter: 0.02, gain: 2.8, drive: 0.5 });
    L.noiseHit(ctx, o, t + 0.07 * ts, { type: 'bandpass', f: 4500, q: 0.8, a: 0.01, d: 0.05, gain: 0.3 });     // f
    L.noiseHit(ctx, o, t + 0.76 * ts, { type: 'bandpass', f: 6500, q: 1, a: 0.01, d: 0.07, gain: 0.35 });      // s
    L.noiseHit(ctx, o, t + 1.03 * ts, { type: 'bandpass', f: 3500, q: 1.5, d: 0.012, gain: 0.4 });             // t
    L.noiseHit(ctx, o, t + 0.5 * ts, { type: 'bandpass', f: 900, q: 1.5, d: 0.01, gain: 0.25 });               // d
  };
  R['cobrador.shout'].cooldown = 1;

  /* --- pasos de Alexander (sandalias) --- */
  R.step = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.002, run = !!d.run, sf = d.surface || 'asfalto', g = run ? 1.3 : 1, k = run ? 0.8 : 1, pm = (run ? 1.08 : 1) * vary(1, 0.08), i;
    var o = L.bus(ctx, out, 0.2 * g * (({ vereda: 0.75, berma: 1.2, escalera: 0.55 })[sf] || 1));
    if (sf === 'vereda') {
      L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(2400, 0.1) * pm, q: 1.6, d: 0.012 * k, gain: 0.8 });
      L.modal(ctx, o, t, { freqs: [vary(620, 0.06) * pm, vary(1450, 0.06) * pm], decays: [0.04, 0.02], gains: [0.35, 0.15] });
      if (run) L.noiseHit(ctx, o, t + 0.035 * k, { type: 'bandpass', f: vary(3500, 0.1), q: 2, d: 0.01, gain: 0.25 });
      else L.noiseHit(ctx, o, t + 0.01, { type: 'bandpass', f: 3000, q: 0.8, a: 0.01, d: 0.03, gain: 0.15 });
    } else if (sf === 'berma') {
      var ng = run ? 8 : 5;
      for (i = 0; i < ng; i++) L.noiseHit(ctx, o, t + i * rr(0.004, 0.012), { type: 'bandpass', f: rr(1500, 3500), q: 1.2, d: rr(0.005, 0.012), gain: rr(0.3, 0.6) });
      L.tone(ctx, o, t, { f0: vary(110, 0.1) * pm, f1: 60, d: 0.07, gain: 0.35 });
      L.noiseHit(ctx, o, t, { kind: 'pink', type: 'lowpass', f: 1200, q: 0.7, a: 0.004, d: 0.09, gain: 0.3 });
    } else if (sf === 'tierra') {
      L.tone(ctx, o, t, { f0: vary(115, 0.1) * pm, f1: 55, d: 0.09, gain: 0.6 });
      L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 500, q: 0.7, d: 0.1, gain: 0.5 });
      L.noiseHit(ctx, o, t + 0.01, { type: 'bandpass', f: 1500, q: 0.7, a: 0.01, d: 0.05, gain: 0.15 });
    } else if (sf === 'escalera') {
      L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(2000, 0.1) * pm, q: 1.4, d: 0.014 * k, gain: 0.9 });
      L.modal(ctx, o, t, { freqs: [vary(250, 0.05), vary(415, 0.05), vary(630, 0.05)], decays: [0.14, 0.1, 0.08], gains: [0.45, 0.3, 0.2] });
      L.tone(ctx, o, t, { f0: 130 * pm, f1: 70, d: 0.05, gain: 0.35 });
      L.noiseHit(ctx, o, t + 0.09, { type: 'bandpass', f: 1700, q: 1.4, d: 0.012, gain: 0.25 });     // eco de la caja de escalera
    } else {                                                           // asfalto mojado: chasquido plano de sandalia
      L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(1100, 0.1) * pm, q: 0.9, d: 0.035 * k, gain: 0.7 });
      L.tone(ctx, o, t, { f0: vary(140, 0.1) * pm, f1: 70, d: 0.05, gain: 0.5 });
      L.noiseHit(ctx, o, t + 0.01, { type: 'highpass', f: 3200, a: 0.004, d: 0.07, gain: 0.25 });
      if (run) L.noiseHit(ctx, o, t + 0.035 * k, { type: 'bandpass', f: 2000, q: 3, d: 0.012, gain: 0.3 });
      if (run) L.noiseHit(ctx, o, t + 0.045, { type: 'bandpass', f: vary(1300, 0.1), q: 0.9, d: 0.025, gain: 0.4 });
    }
    if (run) L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 800, q: 0.6, a: 0.01, d: 0.07, gain: 0.12 });  // arrastre
  };
  R.step.cooldown = 0.1;

  /* --- Alexander --- */
  R['player.hurt'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.005, o = L.bus(ctx, out, 0.31), f = vary(150, 0.1);
    L.tone(ctx, o, t, { f0: 130, f1: 52, d: 0.14, gain: 0.7 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 600, q: 0.7, d: 0.09, gain: 0.55 });
    L.voice(ctx, o, t + 0.03, { dur: vary(0.26, 0.15), f0: [[0, f * 1.1], [0.3, f], [1, f * 0.72]], vowels: [[0, 'a'], [0.5, 'uh'], [1, 'o']], amp: [[0, 0], [0.06, 1], [0.5, 0.8], [1, 0]],
      fscale: 1.05, bw: 1.2, breath: 0.3, rasp: 0.3, raspHz: 50, jitter: 0.02, gain: 3, drive: 0.3 });
    L.strum(ctx, o, pick([L.chord('Em'), L.chord('Am')]), t + 0.01, { spread: 0.006, decay: 0.35, bright: 0.5, vel: 0.07, dir: 'up', dur: 0.4 });  // la guitarra se golpea
  };
  R['player.hurt'].cooldown = 0.15;

  R['player.exhausted'] = function (ctx, out, d, L) {
    L = L || lib;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.31), i, tt, pr = 0.4 * vary(1, 0.06);
    for (i = 0; i < 4; i++) {
      tt = t + i * pr * vary(1, 0.06);
      L.noiseHit(ctx, o, tt, { type: 'bandpass', f: vary(1100, 0.1), f1: vary(1900, 0.1), q: 0.9, a: 0.09, d: 0.1, gain: 0.35 });                     // inhala
      L.noiseHit(ctx, o, tt, { type: 'bandpass', f: 730, q: 4, a: 0.09, d: 0.1, gain: 0.12 });
      L.noiseHit(ctx, o, tt + pr * 0.45, { type: 'bandpass', f: vary(1000, 0.1), f1: 650, q: 0.8, a: 0.04, d: 0.17, gain: 0.5 });                      // exhala
      L.noiseHit(ctx, o, tt + pr * 0.45, { type: 'bandpass', f: 730, q: 5, a: 0.04, d: 0.17, gain: 0.25 });
      L.noiseHit(ctx, o, tt + pr * 0.45, { type: 'bandpass', f: 1090, q: 5, a: 0.04, d: 0.15, gain: 0.18 });
    }
  };
  R['player.exhausted'].cooldown = 1;

  R['player.recovered'] = function (ctx, out, d, L) {
    L = L || lib;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.36);
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 2200, f1: 800, q: 0.8, a: 0.12, d: 0.5, gain: 0.45 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 730, q: 5, a: 0.12, d: 0.45, gain: 0.22 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 1090, q: 5, a: 0.12, d: 0.4, gain: 0.16 });
    L.harmonic(ctx, o, 659.3, t + 0.3, { gain: 0.15, decay: 0.3 });
  };
  R['player.recovered'].cooldown = 1;

  R['player.death'] = function (ctx, out, d, L) {
    L = L || lib;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.33);
    L.voice(ctx, o, t, { dur: 0.4, f0: [[0, 150], [0.3, 125], [1, 70]], vowels: [[0, 'a'], [0.5, 'o'], [1, 'u']], amp: [[0, 0], [0.08, 1], [0.6, 0.7], [1, 0]], fscale: 1.05, breath: 0.4, rasp: 0.35, raspHz: 40, gain: 2.8, drive: 0.3 });
    L.tone(ctx, o, t + 0.2, { f0: 110, f1: 40, d: 0.3, gain: 0.8 });                                              // el cuerpo cae
    L.noiseHit(ctx, o, t + 0.2, { kind: 'brown', type: 'lowpass', f: 400, q: 0.7, d: 0.25, gain: 0.7 });
    L.noiseHit(ctx, o, t + 0.22, { kind: 'pink', type: 'lowpass', f: 2200, a: 0.05, d: 0.3, gain: 0.2 });          // ropa
    L.noiseHit(ctx, o, t + 0.22, { type: 'bandpass', f: 1800, q: 0.6, a: 0.004, d: 0.18, gain: 0.25 });             // charco
    var tg = t + 0.5;                                                                                              // la guitarra cae
    L.noiseHit(ctx, o, tg, { type: 'bandpass', f: 230, q: 3, d: 0.2, gain: 0.75 });
    L.tone(ctx, o, tg, { f0: 150, f1: 60, d: 0.16, gain: 0.7 });
    L.noiseHit(ctx, o, tg, { type: 'bandpass', f: 2600, q: 1.3, d: 0.02, gain: 0.55 });
    L.modal(ctx, o, tg, { freqs: [880, 1750, 2900], decays: [0.06, 0.04, 0.03], gains: [0.3, 0.2, 0.1] });
    L.strum(ctx, o, L.chord('E', 1), tg + 0.005, { spread: 0.006, decay: 1.4, bright: 0.55, vel: 0.2, bend: 1.02, bendT: 0.09, dir: 'up', dur: 1.45 });  // cuerdas al aire
    L.noiseHit(ctx, o, tg + 0.35, { type: 'bandpass', f: 1500, q: 4, d: 0.01, gain: 0.12 });                        // traste vibrando
  };
  R['player.death'].cooldown = 1;

  R['player.respawn'] = function (ctx, out, d, L) {
    L = L || lib;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.5), notes = [392, 494, 587.3, 784], i;
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 1200, f1: 2200, q: 0.9, a: 0.1, d: 0.1, gain: 0.3 });             // jadeo al volver
    for (i = 0; i < notes.length; i++) L.harmonic(ctx, o, notes[i] * vary(1, 0.004), t + 0.18 + i * 0.1, { gain: 0.3 + i * 0.04, decay: 0.3 + i * 0.1 });
    L.noiseHit(ctx, o, t + 0.12, { kind: 'pink', type: 'bandpass', f: 500, f1: 2500, q: 0.7, a: 0.3, d: 0.3, gain: 0.12 });
  };
  R['player.respawn'].cooldown = 1;

  /* --- Titina y los animales --- */
  R['titina.launch'] = function (ctx, out, d, L) {
    L = L || lib;
    var t = ctx.currentTime + 0.005, o = L.bus(ctx, out, 0.4), ts = [0, 0.045, 0.09, 0.135, 0.185, 0.24, 0.3, 0.37, 0.45], i;
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 3000, q: 1.2, d: 0.012, gain: 0.9 });                             // palmada de alas
    for (i = 0; i < ts.length; i++) ts[i] = ts[i] * vary(1, 0.05) + rr(-0.004, 0.004) + 0.012;
    L.flaps(ctx, o, t, ts, { gain: 0.5, pitch: 1.1 });
  };
  R['titina.launch'].cooldown = 0.15;

  function coo(ctx, o, t, d, f, vow, trill, amp, L) {
    L.voice(ctx, o, t, { dur: d, f0: [[0, f * 1.05], [0.4, f], [1, f * 0.88]], vowels: vow, amp: amp, src: 'sawtooth', fscale: 1, bw: 0.6, breath: 0.08,
      gargle: trill, gargleHz: 27, vib: 0.01, vibHz: 6, jitter: 0.015, gain: 1.8 });
  }
  R['titina.coo'] = function (ctx, out, d, L) {
    L = L || lib;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.22), f = vary(420, 0.07), s = vary(1, 0.08);
    coo(ctx, o, t, 0.3 * s, f, [[0, [380, 700, 2300]], [0.4, [400, 800, 2400]], [1, [360, 720, 2300]]], 0.85, [[0, 0], [0.25, 0.9], [0.7, 1], [1, 0]], L);          // «rrrooo»
    coo(ctx, o, t + 0.36 * s, 0.16 * s, f * 1.08, [[0, [330, 760, 2300]], [1, [380, 820, 2350]]], 0.1, [[0, 0], [0.2, 1], [1, 0]], L);                                  // «coo»
    coo(ctx, o, t + 0.56 * s, 0.22 * s, f * 0.98, [[0, [350, 740, 2300]], [1, [330, 700, 2300]]], 0.15, [[0, 0], [0.2, 1], [0.7, 0.8], [1, 0]], L);
  };
  R['titina.coo'].cooldown = 0.4;

  R['titina.return'] = function (ctx, out, d, L) {
    L = L || lib;
    var t = ctx.currentTime + 0.005, o = L.bus(ctx, out, 0.4), ts = [0, 0.07, 0.15, 0.25, 0.37, 0.52], i;
    for (i = 0; i < ts.length; i++) ts[i] *= vary(1, 0.05);
    L.flaps(ctx, o, t, ts, { gain: 0.45, pitch: 1.0 });
    L.noiseHit(ctx, o, t + 0.62, { type: 'bandpass', f: 2800, q: 5, d: 0.01, gain: 0.25 });                           // uñitas en el hombro
    L.noiseHit(ctx, o, t + 0.68, { type: 'bandpass', f: 2400, q: 5, d: 0.01, gain: 0.18 });
    coo(ctx, o, t + 0.78, 0.15, vary(430, 0.06), [[0, [340, 760, 2300]], [1, [380, 820, 2350]]], 0.1, [[0, 0], [0.2, 0.6], [1, 0]], L);
  };
  R['titina.return'].cooldown = 0.3;

  R['titina.grabbed'] = function (ctx, out, d, L) {
    L = L || lib;
    var t = ctx.currentTime + 0.005, o = L.bus(ctx, out, 0.4), ts = [], x = 0, i;
    for (i = 0; i < 16; i++) { ts.push(x); x += rr(0.03, 0.07); }
    L.flaps(ctx, o, t, ts, { gain: 0.5, pitch: 1.2 });
    for (i = 0; i < 3; i++) {
      L.voice(ctx, o, t + 0.1 + i * 0.28, { dur: 0.14, f0: [[0, vary(900, 0.1)], [1, vary(650, 0.1)]], vowels: [[0, 'i'], [1, 'e']], amp: [[0, 0], [0.2, 1], [1, 0]], bw: 1, breath: 0.2, gargle: 0.7, gargleHz: 30, gain: 1.3 });
    }
  };
  R['titina.grabbed'].cooldown = 0.5;

  R['dog.bark'] = function (ctx, out, d, L) {
    L = L || lib;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.25), n = 2 + ((rnd() * 2) | 0), i, base = vary(470, 0.12), tt = t;
    for (i = 0; i < n; i++) {
      var f = base * vary(1, 0.08) * (1 + i * 0.03), dur = vary(0.16, 0.2);
      L.voice(ctx, o, tt, { dur: dur, f0: [[0, f * 1.3], [0.2, f * 1.1], [1, f * 0.62]], vowels: [[0, 'u'], [0.2, 'a'], [0.6, 'o'], [1, 'o']], amp: [[0, 0], [0.05, 1], [0.5, 0.75], [1, 0]],
        fscale: 1.15, bw: 1.3, breath: 0.35, rasp: 0.25, raspHz: 60, jitter: 0.03, gain: 2.2, drive: 0.5 });
      L.noiseHit(ctx, o, tt, { type: 'bandpass', f: vary(2500, 0.15), q: 0.9, d: 0.03, gain: 0.25 });
      tt += dur + vary(0.1, 0.35);
    }
  };
  R['dog.bark'].cooldown = 0.3;

  R['dog.whine'] = function (ctx, out, d, L) {
    L = L || lib;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.26), f = vary(560, 0.08);
    L.voice(ctx, o, t, { dur: vary(0.85, 0.15), f0: [[0, f], [0.25, f * 1.5], [0.5, f * 1.4], [0.8, f * 1.2], [1, f * 1.0]], vowels: [[0, 'i'], [0.4, 'e'], [0.8, 'ae'], [1, 'uh']],
      amp: [[0, 0], [0.2, 0.8], [0.5, 1], [0.85, 0.7], [1, 0]], fscale: 1.15, bw: 1, breath: 0.25, vib: 0.03, vibHz: 6, jitter: 0.015, gain: 1.5 });
  };
  R['dog.whine'].cooldown = 0.5;

  R['birds.fly'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.005, n = clamp((d.n | 0) || 1, 1, 8), o = L.bus(ctx, out, 0.2 + 0.02 * Math.min(n, 6)), b, i, ts;
    var birds = Math.min(5, 1 + Math.ceil(n / 2));
    for (b = 0; b < birds; b++) {
      ts = []; var x = rr(0, 0.25), cnt = Math.round(rr(3, 5) + Math.min(n, 4) * 0.3), step = rr(0.19, 0.26);
      for (i = 0; i < cnt; i++) { ts.push(x); x += step * vary(1, 0.1); }
      L.flaps(ctx, o, t, ts, { gain: 0.45, pitch: rr(0.55, 0.8), low: 0.9 });
    }
  };
  R['birds.fly'].cooldown = 0.3;

  /* --- interfaz y estados --- */
  R['ui.move'] = function (ctx, out, d, L) {
    L = L || lib; var o = L.bus(ctx, out, 0.6);
    L.harmonic(ctx, o, pick([784, 880, 988]) * vary(1, 0.01), ctx.currentTime + 0.003, { gain: 0.45, decay: 0.12 });
  };
  R['ui.move'].cooldown = 0.04;
  R['ui.ok'] = function (ctx, out, d, L) {
    L = L || lib; var o = L.bus(ctx, out, 0.5), t = ctx.currentTime + 0.003;
    L.harmonic(ctx, o, 659.3 * vary(1, 0.02), t, { gain: 0.4, decay: 0.18 });
    L.harmonic(ctx, o, 987.8 * vary(1, 0.02), t + 0.075, { gain: 0.45, decay: 0.4 });
    L.harmonic(ctx, o, 1318.5, t + 0.075, { gain: 0.1, decay: 0.3 });
  };
  R['ui.back'] = function (ctx, out, d, L) {
    L = L || lib; var o = L.bus(ctx, out, 0.6), t = ctx.currentTime + 0.003;
    L.harmonic(ctx, o, 784 * vary(1, 0.02), t, { gain: 0.4, decay: 0.15 });
    L.harmonic(ctx, o, 523.3 * vary(1, 0.02), t + 0.07, { gain: 0.42, decay: 0.3 });
  };
  /* --- v0.10: diálogo con retrato (dialogo.js). dlg.blip cada 2 letras: voz suave y corta (Alexander más grave; Titina, un arrullo); dlg.next al pasar de lámina --- */
  var DLG_BLIP = {   // [Hz base, vocales posibles]
    alexander: [150, ['a', 'o', 'e']], titina: [430, ['u', 'o']], otro: [210, ['a', 'e', 'o']]
  };
  var DLG_CARA = { risa: 1.12, feliz: 1.06, sorpresa: 1.15, miedo: 1.1, cansado: 0.9, triste: 0.9, serio: 0.96, molesta: 0.94 };
  R['dlg.blip'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var who = DLG_BLIP[d.quien] ? d.quien : 'otro', P = DLG_BLIP[who], t = ctx.currentTime + 0.002;
    var f = P[0] * (DLG_CARA[d.cara] || 1) * vary(1, 0.06);
    if (who === 'titina') {
      var o = L.bus(ctx, out, 0.12);
      L.voice(ctx, o, t, { dur: 0.075, f0: [[0, f * 1.04], [1, f * 0.9]], vowels: [[0, [360, 720, 2300]], [1, [330, 700, 2300]]], amp: [[0, 0], [0.25, 1], [1, 0]],
        src: 'sawtooth', bw: 0.6, breath: 0.08, gargle: 0.5, gargleHz: 27, gain: 1.4 });
      return;
    }
    var o2 = L.bus(ctx, out, who === 'alexander' ? 0.16 : 0.13), v = pick(P[1]);
    L.voice(ctx, o2, t, { dur: 0.06, f0: [[0, f * 1.03], [1, f * 0.97]], vowels: [[0, v], [1, v]], amp: [[0, 0], [0.2, 1], [0.7, 0.7], [1, 0]],
      bw: 0.9, breath: 0.12, jitter: 0.01, gain: 1.2 });
  };
  R['dlg.blip'].cooldown = 0.03;
  R['dlg.next'] = function (ctx, out, d, L) {
    L = L || lib; var o = L.bus(ctx, out, 0.4), t = ctx.currentTime + 0.003;
    L.harmonic(ctx, o, 1046.5 * vary(1, 0.01), t, { gain: 0.3, decay: 0.12 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 3200, q: 3, d: 0.012, gain: 0.12 });   // «clic» de lámina
  };
  R['dlg.next'].cooldown = 0.06;
  R['game.pause'] = function (ctx, out, d, L) {
    L = L || lib; var o = L.bus(ctx, out, 0.6), t = ctx.currentTime + 0.003;
    L.harmonic(ctx, o, 880, t, { gain: 0.35, decay: 0.15 }); L.harmonic(ctx, o, 587.3, t + 0.08, { gain: 0.35, decay: 0.3 });
  };
  R['game.resume'] = function (ctx, out, d, L) {
    L = L || lib; var o = L.bus(ctx, out, 0.6), t = ctx.currentTime + 0.003;
    L.harmonic(ctx, o, 587.3, t, { gain: 0.35, decay: 0.15 }); L.harmonic(ctx, o, 880, t + 0.08, { gain: 0.38, decay: 0.3 });
  };
  ['ui.move', 'ui.ok', 'ui.back', 'game.pause', 'game.resume'].forEach(function (k) { R[k].cooldown = k === 'ui.move' ? 0.04 : 0.1; });

  R['game.start'] = function (ctx, out, d, L) {
    L = L || lib;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.65);
    L.strum(ctx, o, L.chord('Em', vary(1, 0.003)), t, { spread: 0.024, decay: 1.5, bright: 0.6, vel: 0.28, dur: 1.9 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 300, q: 0.7, d: 0.1, gain: 0.25 });
    L.strum(ctx, o, L.chord('Em', 1).slice(3), t + 0.38, { spread: 0.012, decay: 1.0, bright: 0.7, vel: 0.2, dir: 'up', dur: 1.5 });
    L.harmonic(ctx, o, 659.3, t + 0.55, { gain: 0.14, decay: 0.8 });
  };
  R['game.start'].cooldown = 1;

  R.horde = function (ctx, out, d, L) {
    L = L || lib;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.07), lp = L.filter(ctx, 'lowpass', 1300, 0.6), sw = ctx.createGain(), i;
    lp.connect(sw); sw.connect(o);
    sw.gain.setValueAtTime(0.05, t); sw.gain.linearRampToValueAtTime(1, t + 1.3); sw.gain.setValueAtTime(1, t + 1.9); sw.gain.exponentialRampToValueAtTime(0.02, t + 3.5);   // la ola crece y se aleja
    var vs = [['uh', 'o', 'u'], ['o', 'a', 'uh'], ['m', 'u', 'o'], ['a', 'o', 'u']];
    for (i = 0; i < 9; i++) {
      var f = rr(60, 105), D = rr(1.8, 2.6), vw = pick(vs), t0 = t + rr(0, 0.9);
      L.voice(ctx, lp, t0, { dur: D, f0: [[0, f * 1.2], [0.3, f * 1.25], [1, f * 0.7]], vowels: [[0, vw[0]], [0.5, vw[1]], [1, vw[2]]], amp: [[0, 0], [0.3, 0.8], [0.6, 1], [1, 0]],
        fscale: rr(0.88, 1.1), bw: 1.6, breath: 0.4, rasp: 0.4, raspHz: rr(22, 40), gargle: 0.3, gargleHz: rr(12, 19), jitter: 0.03, gain: rr(2.2, 3), drive: 0.2 });
    }
    var br = L.noiseSrc(ctx, 'brown', t, 3.6), bl = L.filter(ctx, 'lowpass', 140, 0.7), bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, t); bg.gain.linearRampToValueAtTime(0.2, t + 1.5); bg.gain.exponentialRampToValueAtTime(0.001, t + 3.5);
    br.connect(bl); bl.connect(bg); bg.connect(o);
  };
  R.horde.cooldown = 3;

  R.win = function (ctx, out, d, L) {
    L = L || lib;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.7), ch = L.chord('G', vary(1, 0.003)), i;
    for (i = 0; i < 9; i++) L.noiseHit(ctx, o, t + i * 0.022, { type: 'bandpass', f: vary(5200, 0.1), q: 1.2, a: 0.004, d: 0.025, gain: 0.07 });     // güiro
    L.strum(ctx, o, ch, t + 0.03, { spread: 0.045, decay: 1.2, bright: 0.8, vel: 0.2, dir: 'down', dur: 1.5 });
    L.strum(ctx, o, ch.slice(2).map(function (f) { return f * 2; }), t + 0.36, { spread: 0.014, decay: 1.6, bright: 0.85, vel: 0.28, dir: 'up', dur: 1.9 });
    [784, 1174.7, 987.8, 1568].forEach(function (f, k) { L.harmonic(ctx, o, f * vary(1, 0.003), t + 0.7 + k * 0.13, { gain: 0.2, decay: 0.7 }); });
    L.noiseHit(ctx, o, t + 0.36, { kind: 'brown', type: 'lowpass', f: 350, q: 0.7, d: 0.12, gain: 0.25 });
  };
  R.win.cooldown = 2;

  /* =====================================================================================================
     v0.6 / v0.6b — el barrio reacciona (F4)
     Loops: una receta con `.loop = true` devuelve una función stop (con .set(patch), .pump(t) y .h). Con A.emit(name, {dur}) suena `dur` s y se apaga
     sola; con ACH.audio.loop(name, data) el motor la mantiene viva, la panea y atenúa por distancia (move(x, y, {speed})) y la apaga con stop().
     ===================================================================================================== */

  /* ---------- loop: reloj de programación anticipada para sonidos continuos ----------
     lib.loop(ctx, out, {data, setup(h), step(h, t) → t siguiente, set(h, patch), ahead})
       h.out (nodo de salida con fundido), h.osc(type, f) / h.src(kind) (fuentes ya iniciadas y registradas), h.reg(node), h.t0, h.data, h.st (estado libre).
     Con OfflineAudioContext no hay temporizador: se programa a mano con stop.pump(hastaSegundos). */
  lib.loop = function (ctx, out, o) {
    var lg = ctx.createGain(), regs = [], stopped = false, timer = null, t0 = ctx.currentTime + 0.005, ahead = o.ahead || 0.6;
    lg.gain.value = 1; lg.connect(out);
    var h = { ctx: ctx, out: lg, t0: t0, next: t0, data: o.data || {}, st: {}, stopped: false };
    h.osc = function (type, f) { var s = ctx.createOscillator(); s.type = type || 'sine'; s.frequency.value = f || 440; s.start(t0); regs.push(s); return s; };
    h.src = function (kind) { var s = lib.noiseSrc(ctx, kind || 'white', t0, 0); regs.push(s); return s; };
    h.reg = function (n) { regs.push(n); return n; };
    if (o.setup) o.setup(h);
    var offline = typeof ctx.startRendering === 'function';
    function pump(until) {
      var n = 0;
      while (!stopped && h.next < until && n++ < 400) h.next = Math.max(h.next + 0.005, o.step(h, h.next));
    }
    pump(t0 + ahead);
    if (!offline) timer = setInterval(function () {
      if (h.next < ctx.currentTime) h.next = ctx.currentTime + 0.01;            // se durmió (pestaña oculta): no recuperar lo perdido
      pump(ctx.currentTime + ahead);
    }, 90);
    var stop = function () {
      if (stopped) return;
      stopped = true; h.stopped = true;
      if (timer) clearInterval(timer);
      var t = ctx.currentTime;
      try { lg.gain.cancelScheduledValues(t); lg.gain.setValueAtTime(lg.gain.value, t); lg.gain.linearRampToValueAtTime(0, t + 0.06); } catch (e) { /* nada */ }
      setTimeout(function () {
        for (var i = 0; i < regs.length; i++) { try { regs[i].stop(); } catch (e) { /* nada */ } }
        try { lg.disconnect(); } catch (e) { /* nada */ }
      }, 130);
    };
    stop.pump = pump; stop.h = h;
    stop.set = function (p) { for (var k in p) h.data[k] = p[k]; if (o.set) o.set(h, p); };
    return stop;
  };
  function spd01(d) { var s = d && typeof d.speed === 'number' ? d.speed : 0.6; return clamp(s > 2 ? s / 110 : s, 0, 1); }   // z.sp (px/s) o 0..1

  /* ---------- timbres compartidos ---------- */
  lib.clang = function (ctx, out, t, o) {                        // metal golpeado: parciales inarmónicos
    var f = o.f || 400, g = o.gain == null ? 0.6 : o.gain, dc = o.decay || 0.4, rat = [1, 1.52, 2.31, 2.97, 4.12, 5.43], n = o.n || rat.length, fr = [], gs = [], ds = [], i;
    for (i = 0; i < n; i++) { fr.push(f * rat[i] * vary(1, 0.03)); gs.push(g / (1 + i * 0.55) * vary(1, 0.2)); ds.push(dc / (1 + i * 0.4) * vary(1, 0.15)); }
    lib.modal(ctx, out, t, { freqs: fr, decays: ds, gains: gs, a: 0.0006 });
  };
  lib.bell = function (ctx, out, t, o) {                         // timbre de bicicleta
    o = o || {};
    var f = (o.f || 2350) * vary(1, 0.01), g = o.gain == null ? 0.5 : o.gain, dc = o.decay || 0.5;
    lib.modal(ctx, out, t, { freqs: [f, f * 1.008, f * 2.76, f * 5.4, f * 8.9], decays: [dc, dc * 0.9, dc * 0.35, dc * 0.18, dc * 0.1], gains: [g, g * 0.7, g * 0.4, g * 0.18, g * 0.08], a: 0.0008 });
    lib.noiseHit(ctx, out, t, { type: 'highpass', f: 6000, d: 0.006, gain: g * 0.25 });
  };
  function shard(ctx, o, t, f, g, L, dc) {                       // esquirla de vidrio
    dc = dc || rr(0.05, 0.16);
    L.modal(ctx, o, t, { freqs: [f, f * 2.32, f * 3.9], decays: [dc, dc * 0.55, dc * 0.3], gains: [g, g * 0.45, g * 0.25], a: 0.0006 });
  }
  function tinkles(ctx, o, t, n, span, g, fLo, fHi, L, skew) {    // lluvia de vidrio: más densa al principio y más débil al final
    for (var i = 0; i < n; i++) {
      var u = Math.pow(rnd(), skew || 1.5), tt = t + span * u;
      shard(ctx, o, tt, rr(fLo, fHi), g * (1 - 0.7 * u) * rr(0.5, 1), L);
    }
  }
  function woodHit(ctx, o, t, f, g, L) {
    L.tone(ctx, o, t, { f0: f * 1.3, f1: f * 0.7, d: 0.06, gain: g * 0.8 });
    L.modal(ctx, o, t, { freqs: [f, f * 2.3, f * 4.1], decays: [0.07, 0.04, 0.02], gains: [g * 0.6, g * 0.3, g * 0.15] });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: f * 6, q: 1.5, d: 0.012, gain: g * 0.5 });
  }

  /* --- chapa de auto: abolladura con panel resonante y tornillos --- */
  R['prop.hit.metal'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.3), sev = clamp(+d.dmg || 0, 0, 3) / 3, base = rr(150, 260), i;
    L.tone(ctx, o, t, { f0: vary(130, 0.1), f1: 52, d: 0.2, gain: 0.75 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 500, q: 0.7, d: 0.09, gain: 0.5 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(2300, 0.12), q: 1.3, d: 0.02, gain: 0.55 });
    L.tone(ctx, o, t + 0.006, { type: 'triangle', f0: base * 0.8, f1: base * 1.55, sweep: 0.05, d: 0.14, gain: 0.35 });      // la chapa cede (pop)
    L.tone(ctx, o, t + 0.07, { type: 'triangle', f0: base * 1.45, f1: base * 0.9, sweep: 0.08, d: 0.14, gain: 0.22 });      // y vuelve
    L.clang(ctx, o, t, { f: base * 1.8, gain: 0.45, decay: 0.45 + 0.2 * sev });
    L.clang(ctx, o, t + 0.002, { f: base * 3.7, gain: 0.2, decay: 0.2, n: 4 });
    var n = 4 + ((rnd() * 4) | 0) + Math.round(sev * 3);                                                                    // tornillos sueltos
    for (i = 0; i < n; i++) {
      var u = Math.pow(rnd(), 1.4), tt = t + 0.04 + 0.3 * u, f = rr(1500, 4200);
      L.modal(ctx, o, tt, { freqs: [f, f * 1.9], decays: [0.03, 0.015], gains: [0.2 * (1 - 0.6 * u), 0.1] });
      L.noiseHit(ctx, o, tt, { type: 'bandpass', f: f, q: 3, d: 0.006, gain: 0.15 * (1 - 0.6 * u) });
    }
    L.noiseHit(ctx, o, t + 0.03, { type: 'bandpass', f: vary(1100, 0.2), q: 5, a: 0.01, d: 0.3, gain: 0.12 });             // panel suelto vibrando
  };
  R['prop.hit.metal'].cooldown = 0.06; R['prop.hit.metal'].dur = 1.1;

  R['prop.hit.glass'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.4);
    L.noiseHit(ctx, o, t, { type: 'highpass', f: vary(3500, 0.1), d: 0.015, gain: 0.7 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(5500, 0.1), q: 1.5, d: 0.05, gain: 0.5 });
    L.tone(ctx, o, t, { f0: vary(1900, 0.1), f1: 800, d: 0.03, gain: 0.3 });
    L.tone(ctx, o, t, { f0: vary(150, 0.1), f1: 80, d: 0.08, gain: 0.45 });                                                  // el golpe en la luna
    tinkles(ctx, o, t + 0.02, 6 + ((rnd() * 5) | 0), 0.5, 0.14, 2600, 7500, L);
  };
  R['prop.hit.glass'].cooldown = 0.08; R['prop.hit.glass'].dur = 1.0;

  /* --- auto destruido: abollón, lunas que revientan, chatarra que se asienta y hierve --- */
  R['prop.break.car'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.45), i;
    L.tone(ctx, o, t, { f0: 95, f1: 34, d: 0.4, gain: 0.9 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 420, q: 0.7, d: 0.5, gain: 0.8 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(2100, 0.1), q: 1, d: 0.06, gain: 0.6 });
    for (i = 0; i < 4; i++) {                                                                                               // chapa que se arruga
      var tt = t + i * rr(0.07, 0.15);
      L.clang(ctx, o, tt, { f: rr(140, 420), gain: 0.4 - i * 0.05, decay: 0.35, n: 5 });
      L.tone(ctx, o, tt, { type: 'triangle', f0: rr(200, 420), f1: rr(120, 260), d: 0.12, gain: 0.2 });
    }
    L.noiseHit(ctx, o, t + 0.01, { type: 'highpass', f: 2600, a: 0.002, d: 0.32, gain: 0.55 });                              // revienta el vidrio
    L.noiseHit(ctx, o, t + 0.03, { type: 'bandpass', f: 4500, q: 0.8, a: 0.01, d: 0.35, gain: 0.35 });
    tinkles(ctx, o, t + 0.05, 16 + ((rnd() * 6) | 0), 1.3, 0.16, 2200, 8000, L, 1.2);
    L.noiseHit(ctx, o, t + 0.2, { type: 'highpass', f: 3000, a: 0.15, d: 1.2, gain: 0.12 });                                  // vapor del radiador
    L.modal(ctx, o, t + 0.8, { freqs: [rr(300, 600), rr(900, 1500)], decays: [0.2, 0.1], gains: [0.2, 0.12] });             // un último tornillo cae
    L.noiseHit(ctx, o, t + 0.7, { type: 'bandpass', f: 1400, q: 4, d: 0.01, gain: 0.2 });
  };
  R['prop.break.car'].cooldown = 0.3; R['prop.break.car'].dur = 2.4;

  /* --- alarma de auto de barrio: sirena, trino, «guau-guau», pitidos y bocinazos que van rotando --- */
  R['car.alarm'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var o = L.bus(ctx, out, 0.2), pm = vary(1, 0.08), lp = L.filter(ctx, 'lowpass', 4800, 0.7), sh = ctx.createWaveShaper(), c = new Float32Array(257), i;
    for (i = 0; i < 257; i++) { var x = i / 128 - 1; c[i] = Math.tanh(2.2 * x) / Math.tanh(2.2); }
    sh.curve = c; lp.connect(o); sh.connect(lp);
    function gate(p, t, v) { p.setTargetAtTime(v, t, 0.003); }
    return L.loop(ctx, o, {
      data: d,
      setup: function (h) {
        h.sir = h.osc('square', 800); h.sg = ctx.createGain(); h.sg.gain.value = 0;
        var bp = L.filter(ctx, 'bandpass', 1700, 0.9); h.sir.connect(h.sg); h.sg.connect(bp); bp.connect(sh);
        h.h1 = h.osc('square', 418 * pm); h.h2 = h.osc('square', 523 * pm); h.hg = ctx.createGain(); h.hg.gain.value = 0;
        var hb = L.filter(ctx, 'bandpass', 900, 0.7); h.h1.connect(hb); h.h2.connect(hb); hb.connect(h.hg); h.hg.connect(sh);
        h.st.last = -1;
      },
      step: function (h, t) {
        var k;
        do { k = (rnd() * 5) | 0; } while (k === h.st.last);
        h.st.last = k;
        var f = h.sir.frequency, sg = h.sg.gain, hg = h.hg.gain, n, T = t;
        gate(hg, t, 0);
        if (k === 0) {                                                                    // «uiii-uooo»: subida y bajada
          gate(sg, t, 0.7);
          for (n = 0; n < 3; n++) {
            f.setValueAtTime(650 * pm, T); f.exponentialRampToValueAtTime(1450 * pm, T + 0.34);
            f.exponentialRampToValueAtTime(650 * pm, T + 0.68); T += 0.68;
          }
        } else if (k === 1) {                                                             // trino de dos tonos
          gate(sg, t, 0.7);
          for (n = 0; n < 16; n++) { f.setValueAtTime((n % 2 ? 1250 : 960) * pm, T); T += 0.095; }
        } else if (k === 2) {                                                             // «uiip-uiip-uiip»: subidas secas
          gate(sg, t, 0.7);
          for (n = 0; n < 5; n++) {
            f.setValueAtTime(500 * pm, T); f.exponentialRampToValueAtTime(1700 * pm, T + 0.26);
            gate(sg, T + 0.28, 0); gate(sg, T + 0.34, 0.7); T += 0.34;
          }
        } else if (k === 3) {                                                             // pitidos agudos
          f.setValueAtTime(2100 * pm, t);
          for (n = 0; n < 9; n++) { gate(sg, T, 0.65); gate(sg, T + 0.07, 0); T += 0.15; }
        } else {                                                                          // bocina: «pa-pa-pa-paaa»
          gate(sg, t, 0);
          for (n = 0; n < 4; n++) { gate(hg, T, 0.45); gate(hg, T + (n === 3 ? 0.4 : 0.2), 0); T += n === 3 ? 0.6 : 0.4; }
        }
        gate(sg, T, 0);
        return T + 0.05;
      }
    });
  };
  R['car.alarm'].loop = true; R['car.alarm'].cooldown = 1; R['car.alarm'].dur = 6;

  R['prop.break.trash'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.25), bag = d.type === 'bags' || d.type === 'bolsas', i;
    if (bag) {                                                                          // bolsa: plof blando y crujido
      L.tone(ctx, o, t, { f0: 120, f1: 60, d: 0.14, gain: 0.45 });
      L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: vary(1800, 0.15), q: 0.6, a: 0.02, d: 0.5, gain: 0.6 });
      L.noiseHit(ctx, o, t + 0.1, { kind: 'pink', type: 'highpass', f: 2500, a: 0.02, d: 0.35, gain: 0.25 });
      for (i = 0; i < 3; i++) L.noiseHit(ctx, o, t + 0.05 + rr(0, 0.5), { type: 'bandpass', f: rr(1500, 4000), q: 2, d: 0.015, gain: 0.25 });
    } else {                                                                            // tacho que cae y rueda
      L.tone(ctx, o, t, { f0: vary(170, 0.1), f1: 80, d: 0.12, gain: 0.6 });
      L.modal(ctx, o, t, { freqs: [vary(380, 0.08), vary(850, 0.08), vary(1450, 0.08)], decays: [0.14, 0.09, 0.05], gains: [0.5, 0.3, 0.2] });
      L.noiseHit(ctx, o, t, { type: 'bandpass', f: 1200, q: 0.8, d: 0.03, gain: 0.5 });
      var rr0 = ctx.createGain(), rl = ctx.createOscillator(), rg = ctx.createGain(), src = L.noiseSrc(ctx, 'white', t + 0.08, 0.7), bp = L.filter(ctx, 'bandpass', 1100, 1.2);
      rr0.gain.setValueAtTime(0.0001, t + 0.08); rr0.gain.linearRampToValueAtTime(0.3, t + 0.2); rr0.gain.exponentialRampToValueAtTime(0.001, t + 0.78);
      rl.frequency.setValueAtTime(18, t + 0.08); rl.frequency.exponentialRampToValueAtTime(5, t + 0.78); rg.gain.value = 0.35;   // el tacho rueda y se frena
      rl.connect(rg); rg.connect(rr0.gain); src.connect(bp); bp.connect(rr0); rr0.connect(o); rl.start(t + 0.08); rl.stop(t + 0.8);
      for (i = 0; i < 4; i++) shard(ctx, o, t + 0.1 + rr(0, 0.45), rr(2800, 5000), 0.1, L);                                  // botellas
      L.noiseHit(ctx, o, t + 0.05, { kind: 'pink', type: 'bandpass', f: 2200, q: 0.6, a: 0.03, d: 0.45, gain: 0.3 });          // papeles
    }
  };
  R['prop.break.trash'].cooldown = 0.2; R['prop.break.trash'].dur = 1.2;

  R['prop.break.cart'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.4), i;
    for (i = 0; i < 5; i++) {
      var tt = t + i * rr(0.025, 0.07);
      L.noiseHit(ctx, o, tt, { type: 'bandpass', f: rr(1200, 3200), q: 3, d: 0.02, gain: 0.5 });
      woodHit(ctx, o, tt, rr(180, 420), 0.4, L);
    }
    L.tone(ctx, o, t, { f0: 110, f1: 45, d: 0.25, gain: 0.7 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 600, q: 0.7, d: 0.2, gain: 0.5 });
    for (i = 0; i < 5; i++) shard(ctx, o, t + 0.08 + rr(0, 0.6), rr(2500, 6000), 0.13, L);                                    // vasos y frascos
    L.tone(ctx, o, t + 0.25, { type: 'sawtooth', f0: 1300, f1: 2000, sweep: 0.15, d: 0.16, gain: 0.05 });                       // la rueda chilla al zafarse
    var n = 6; for (i = 0; i < n; i++) L.noiseHit(ctx, o, t + 0.35 + i * (0.05 + i * 0.02), { type: 'bandpass', f: rr(600, 1100), q: 2, d: 0.02, gain: 0.25 * (1 - i / n) });  // rueda que gira y cae
  };
  R['prop.break.cart'].cooldown = 0.2; R['prop.break.cart'].dur = 1.3;

  /* --- poste: arco eléctrico y el zumbido de la red que se corta --- */
  R['pole.spark'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.5), i, n = 14 + ((rnd() * 10) | 0), cut = rr(0.22, 0.38);
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 2500, a: 0.001, d: 0.08, gain: 0.8 });
    L.tone(ctx, o, t, { type: 'sawtooth', f0: vary(3200, 0.1), f1: 700, d: 0.18, gain: 0.2 });
    var os = ctx.createOscillator(), g = ctx.createGain(), bp = L.filter(ctx, 'bandpass', 1800, 1.5);                         // arco: sierra a 120 Hz con aleteo
    os.type = 'sawtooth'; os.frequency.value = 120;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.01);
    for (i = 0; i < 10; i++) g.gain.linearRampToValueAtTime(rr(0.15, 0.55), t + 0.02 + (cut - 0.04) * i / 10);
    g.gain.linearRampToValueAtTime(0.0001, t + cut); os.connect(bp); bp.connect(g); g.connect(o); os.start(t); os.stop(t + cut + 0.02);
    for (i = 0; i < n; i++) {                                                                                               // chisporroteo
      var u = Math.pow(rnd(), 1.7), tt = t + 0.5 * u;
      L.noiseHit(ctx, o, tt, { type: 'bandpass', f: rr(1800, 8000), q: 2.5, d: rr(0.002, 0.006), gain: rr(0.3, 0.9) * (1 - 0.7 * u) });
    }
    var hs = [120, 240, 360], hg = [0.35, 0.2, 0.1];                                                                         // zumbido de red que se corta de golpe
    for (i = 0; i < 3; i++) {
      var ho = ctx.createOscillator(), hgn = ctx.createGain();
      ho.frequency.value = hs[i] * vary(1, 0.003); hgn.gain.setValueAtTime(0.0001, t); hgn.gain.linearRampToValueAtTime(hg[i], t + 0.02);
      hgn.gain.setValueAtTime(hg[i], t + cut + 0.1); hgn.gain.linearRampToValueAtTime(0.0001, t + cut + 0.104);
      ho.connect(hgn); hgn.connect(o); ho.start(t); ho.stop(t + cut + 0.12);
    }
    L.noiseHit(ctx, o, t + cut + 0.1, { kind: 'brown', type: 'lowpass', f: 300, q: 0.7, d: 0.05, gain: 0.35 });              // clac del corte
  };
  R['pole.spark'].cooldown = 0.2; R['pole.spark'].dur = 1.0;

  R['glass.crunch'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.002, o = L.bus(ctx, out, 0.5), i, n = 6 + ((rnd() * 5) | 0);
    for (i = 0; i < n; i++) {
      var tt = t + 0.12 * Math.pow(rnd(), 1.3);
      L.noiseHit(ctx, o, tt, { type: 'bandpass', f: rr(3000, 6500), q: 2, d: rr(0.006, 0.014), gain: rr(0.3, 0.8) });
      if (rnd() < 0.4) shard(ctx, o, tt, rr(3500, 7000), 0.08, L, 0.03);
    }
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 900, q: 0.8, a: 0.005, d: 0.08, gain: 0.25 });
  };
  R['glass.crunch'].cooldown = 0.1; R['glass.crunch'].dur = 0.35;

  /* --- animales --- */
  R['dog.yelp'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.005, o = L.bus(ctx, out, 0.42), n = 2 + ((rnd() * 2) | 0), base = vary(780, 0.1), tt = t, i;
    for (i = 0; i < n; i++) {
      var f = base * (1 + i * 0.06), D = vary(i ? 0.15 : 0.22, 0.2);
      L.voice(ctx, o, tt, { dur: D, f0: [[0, f * 0.9], [0.25, f * 1.7], [0.6, f * 1.45], [1, f * 0.95]], vowels: [[0, 'e'], [0.3, 'ae'], [0.7, 'i'], [1, 'e']],
        amp: [[0, 0], [0.05, 1], [0.6, 0.8], [1, 0]], fscale: 1.2, bw: 1.2, breath: 0.2, vib: 0.025, vibHz: 9, jitter: 0.02, gain: 2, drive: 0.3 });
      tt += D + vary(0.09, 0.3);
    }
    L.voice(ctx, o, tt, { dur: vary(0.4, 0.2), f0: [[0, base * 1.3], [1, base * 0.8]], vowels: [[0, 'i'], [1, 'uh']], amp: [[0, 0], [0.2, 0.7], [1, 0]],
      fscale: 1.15, bw: 1, breath: 0.25, vib: 0.03, vibHz: 7, jitter: 0.02, gain: 1.3 });
  };
  R['dog.yelp'].cooldown = 0.4; R['dog.yelp'].dur = 1.3;

  R['cat.meow'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.36), mew = rnd() < 0.35, D = mew ? vary(0.28, 0.2) : vary(0.75, 0.2), f = rr(480, 640);
    var f0 = mew ? [[0, f], [0.3, f * 1.25], [1, f * 0.85]] : [[0, f * 0.9], [0.12, f * 1.1], [0.45, f * 1.3], [0.8, f * 1.05], [1, f * 0.75]];
    var vow = mew ? [[0, 'i'], [0.4, 'ae'], [1, 'e']] : [[0, 'm'], [0.15, 'i'], [0.4, 'ae'], [0.7, 'a'], [1, 'o']];
    L.voice(ctx, o, t, { dur: D, f0: f0, vowels: vow, amp: [[0, 0], [0.1, 0.9], [0.5, 1], [0.85, 0.6], [1, 0]], fscale: 1.3, bw: 0.9, breath: 0.18,
      vib: 0.01, vibHz: 6.5, jitter: 0.02, gain: 1.8 });
  };
  R['cat.meow'].cooldown = 0.5; R['cat.meow'].dur = 1.0;

  R['cat.hiss'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.005, o = L.bus(ctx, out, 0.38), D = vary(0.55, 0.2);
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 3500, q: 1, a: 0.002, d: 0.025, gain: 0.8 });                                // escupitajo «t»
    L.noiseHit(ctx, o, t + 0.02, { type: 'highpass', f: vary(2800, 0.1), a: 0.04, d: D, gain: 0.7 });
    L.noiseHit(ctx, o, t + 0.02, { type: 'bandpass', f: vary(5000, 0.1), q: 0.6, a: 0.05, d: D, gain: 0.4 });
    L.noiseHit(ctx, o, t + 0.03, { kind: 'pink', type: 'bandpass', f: 1500, q: 0.8, a: 0.05, d: D * 0.9, gain: 0.25 });
    L.voice(ctx, o, t + 0.02, { dur: D * 0.8, f0: [[0, 150], [1, 120]], vowels: [[0, 'uh'], [0.5, 'a'], [1, 'ae']], amp: [[0, 0], [0.3, 0.4], [1, 0]], fscale: 1.2, breath: 0.5, rasp: 0.6, raspHz: 40, gain: 0.8 });
  };
  R['cat.hiss'].cooldown = 0.5; R['cat.hiss'].dur = 0.9;

  R['cat.run'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.28), n = 7 + ((rnd() * 4) | 0), tt = t, gap = 0.085, i;
    for (i = 0; i < n; i++) {
      L.noiseHit(ctx, o, tt, { type: 'bandpass', f: rr(700, 1400), q: 1.2, d: 0.02, gain: rr(0.35, 0.6) });
      L.noiseHit(ctx, o, tt + 0.003, { type: 'highpass', f: 3000, d: 0.006, gain: 0.22 });
      L.tone(ctx, o, tt, { f0: 110, f1: 70, d: 0.03, gain: 0.2 });
      tt += (i % 2 ? gap : 0.02) * vary(1, 0.2); gap = Math.max(0.05, gap * 0.95);
    }
  };
  R['cat.run'].cooldown = 0.5; R['cat.run'].dur = 0.8;

  /* --- resortera --- */
  R['sling.stretch'] = function (ctx, out, d, L) {                                         // goma que se estira: crujido de fricción que sube de tono
    d = d || {}; L = L || lib;
    var o = L.bus(ctx, out, 0.4);
    return L.loop(ctx, o, {
      data: d,
      setup: function (h) {
        h.os = h.osc('sawtooth', 190); h.lfo = h.osc('sawtooth', 28);
        h.am = ctx.createGain(); h.am.gain.value = 0.5; h.lg2 = ctx.createGain(); h.lg2.gain.value = 0.5; h.lfo.connect(h.lg2); h.lg2.connect(h.am.gain);
        h.bp = L.filter(ctx, 'bandpass', 1100, 5); h.vg = ctx.createGain(); h.vg.gain.value = 0.3;
        h.os.connect(h.am); h.am.connect(h.bp); h.bp.connect(h.vg); h.vg.connect(h.out);
        var ns = h.src('pink'), nb = L.filter(ctx, 'bandpass', 420, 3), ng = ctx.createGain(); ng.gain.value = 0.35; ns.connect(nb); nb.connect(ng); ng.connect(h.out);   // cuero y goma
        h.nb = nb;
      },
      step: function (h, t) {
        var c = h.data.charge != null ? clamp(h.data.charge, 0, 1) : clamp((t - h.t0) / 0.8, 0, 1);
        h.os.frequency.setTargetAtTime(160 + 220 * c + rr(-8, 8), t, 0.05);
        h.lfo.frequency.setTargetAtTime(22 + 18 * c + rr(-4, 4), t, 0.05);
        h.bp.frequency.setTargetAtTime(800 + 900 * c, t, 0.05);
        h.nb.frequency.setTargetAtTime(380 + 300 * c, t, 0.05);
        h.vg.gain.setTargetAtTime(0.25 + 0.75 * c, t, 0.05);
        if (rnd() < 0.25) L.noiseHit(ctx, h.out, t, { type: 'bandpass', f: rr(2000, 3200), q: 6, d: 0.008, gain: 0.25 });   // tic de la correa
        return t + 0.08;
      }
    });
  };
  R['sling.stretch'].loop = true; R['sling.stretch'].cooldown = 0.3; R['sling.stretch'].dur = 0.85;

  R['sling.release'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.45), ch = clamp(typeof d.charge === 'number' ? d.charge : 0.7, 0.2, 1), f = rr(220, 300);
    L.tone(ctx, o, t, { type: 'triangle', f0: vary(700, 0.1) * (0.8 + 0.4 * ch), f1: 160, d: 0.09, gain: 0.5 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 3500, f1: 900, q: 0.9, a: 0.001, d: 0.07, gain: 0.7 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 1500, q: 2, d: 0.015, gain: 0.5 });                                         // la correa golpea la horquilla
    L.tone(ctx, o, t, { f0: f * 1.3, f1: f, sweep: 0.06, d: 0.22, gain: 0.35 });                                              // la goma vibra
    L.modal(ctx, o, t, { freqs: [f, f * 2.01, f * 3.02], decays: [0.22, 0.12, 0.07], gains: [0.45, 0.2, 0.1] });
    L.noiseHit(ctx, o, t + 0.01, { type: 'highpass', f: 3500, a: 0.01, d: 0.12, gain: 0.2 });                                // la piedra sale
  };
  R['sling.release'].cooldown = 0.2; R['sling.release'].dur = 0.5;

  /* --- piedras --- */
  R['stone.hit.zombie'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.4);
    L.tone(ctx, o, t, { f0: vary(150, 0.1), f1: 70, d: 0.08, gain: 0.7 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 650, q: 0.7, d: 0.07, gain: 0.55 });
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: vary(1000, 0.15), q: 1, a: 0.003, d: 0.1, gain: 0.35 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 2800, q: 1.5, d: 0.01, gain: 0.35 });
    L.voice(ctx, o, t + 0.03, { dur: 0.22, f0: [[0, 100], [1, 70]], vowels: [[0, 'uh'], [1, 'o']], amp: [[0, 0], [0.2, 1], [1, 0]], fscale: 0.9, bw: 1.5, breath: 0.4, rasp: 0.5, raspHz: 30, gain: 1.6, drive: 0.3 });
  };
  R['stone.hit.zombie'].cooldown = 0.08; R['stone.hit.zombie'].dur = 0.4;

  R['stone.hit.metal'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.002, o = L.bus(ctx, out, 0.28);
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(3000, 0.1), q: 1.5, d: 0.008, gain: 0.7 });
    L.clang(ctx, o, t, { f: rr(500, 1300), gain: 0.55, decay: 0.3 });
    L.tone(ctx, o, t, { f0: 160, f1: 90, d: 0.05, gain: 0.35 });
  };
  R['stone.hit.metal'].cooldown = 0.06; R['stone.hit.metal'].dur = 0.6;

  R['stone.hit.glass'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.002, o = L.bus(ctx, out, 0.3);
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 3500, d: 0.012, gain: 0.7 });
    shard(ctx, o, t, rr(2800, 4200), 0.5, L, 0.25);
    tinkles(ctx, o, t + 0.02, 5, 0.35, 0.14, 3000, 7500, L);
  };
  R['stone.hit.glass'].cooldown = 0.06; R['stone.hit.glass'].dur = 0.8;

  R['stone.hit.wood'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.002, o = L.bus(ctx, out, 0.4);
    woodHit(ctx, o, t, rr(250, 520), 0.8, L);
  };
  R['stone.hit.wood'].cooldown = 0.06; R['stone.hit.wood'].dur = 0.3;

  R['stone.land'] = function (ctx, out, d, L) {                                           // clac de guijarro, rebotes y rodadura
    d = d || {}; L = L || lib;
    var soft = d.surface === 'berma' || d.surface === 'tierra', t = ctx.currentTime + 0.003, o = L.bus(ctx, out, soft ? 0.3 : 0.35), tt = t, gap = 0.08, i, n = 2 + ((rnd() * 3) | 0), f = rr(1500, 2200);
    for (i = 0; i <= n; i++) {
      var a = Math.pow(0.55, i);
      L.noiseHit(ctx, o, tt, { type: 'bandpass', f: (soft ? 1400 : vary(2800, 0.1)) * (1 + i * 0.05), q: 2, d: 0.01, gain: 0.7 * a });
      L.modal(ctx, o, tt, { freqs: [f * (1 + i * 0.04), f * 1.95], decays: [0.03, 0.02], gains: [0.45 * a, 0.2 * a] });
      if (soft) L.noiseHit(ctx, o, tt, { kind: 'brown', type: 'lowpass', f: 600, d: 0.04, gain: 0.3 * a });
      tt += gap * vary(1, 0.2); gap *= 1.35;
    }
    var m = 6 + ((rnd() * 4) | 0);
    for (i = 0; i < m; i++) L.noiseHit(ctx, o, tt + Math.pow(rnd(), 1.2) * 0.3, { type: 'highpass', f: rr(3000, 5000), d: rr(0.003, 0.008), gain: rr(0.08, 0.2) });   // se arrastra y se detiene
  };
  R['stone.land'].cooldown = 0.08; R['stone.land'].dur = 0.9;

  /* --- botín --- */
  R['loot.drop'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.4), tt = t, gap = 0.09, i;
    for (i = 0; i < 3; i++) {
      var a = Math.pow(0.55, i), f = rr(2800, 4200);
      L.modal(ctx, o, tt, { freqs: [f, f * 2.4, f * 3.8], decays: [0.1, 0.05, 0.03], gains: [0.4 * a, 0.2 * a, 0.1 * a] });
      L.noiseHit(ctx, o, tt, { type: 'bandpass', f: 1200, q: 1, d: 0.02, gain: 0.3 * a });
      tt += gap * vary(1, 0.2); gap *= 1.3;
    }
  };
  R['loot.drop'].cooldown = 0.05; R['loot.drop'].dur = 0.7;

  function pickup(ctx, o, t, d, L) {
    var f = pick([1318.5, 1480, 1568, 1396.9]) * vary(1, 0.005), rare = !!(d && d.rare), i;
    if (!rare) {
      L.tone(ctx, o, t, { f0: f, d: 0.09, gain: 0.5 });
      L.tone(ctx, o, t + 0.07, { f0: f * 1.5, d: 0.16, gain: 0.5 });
      L.harmonic(ctx, o, f * 1.5, t + 0.07, { gain: 0.2, decay: 0.2 });
    } else {
      var seq = [1, 1.25, 1.5, 2];
      for (i = 0; i < seq.length; i++) {
        L.tone(ctx, o, t + i * 0.075, { f0: 988 * seq[i], d: 0.14 + i * 0.05, gain: 0.45 });
        L.harmonic(ctx, o, 988 * seq[i] * 2, t + i * 0.075, { gain: 0.15, decay: 0.3 });
      }
      L.noiseHit(ctx, o, t + 0.28, { type: 'highpass', f: 6000, a: 0.01, d: 0.3, gain: 0.08 });
    }
  }
  R['loot.pickup'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var o = L.bus(ctx, out, 0.4);
    pickup(ctx, o, ctx.currentTime + 0.003, d, L);
  };
  R['loot.pickup'].cooldown = 0.05; R['loot.pickup'].dur = 0.7;
  R['loot.rare'] = function (ctx, out, d, L) {
    L = L || lib; var o = L.bus(ctx, out, 0.5);
    pickup(ctx, o, ctx.currentTime + 0.003, { rare: true }, L);
  };
  R['loot.rare'].cooldown = 0.2; R['loot.rare'].dur = 1.0;

  R['loot.coins'] = function (ctx, out, d, L) {                                            // sencillo: monedas de sol que tintinean
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.5), n = 6 + ((rnd() * 5) | 0), i;
    for (i = 0; i < n; i++) {
      var tt = t + 0.35 * Math.pow(rnd(), 1.2), f = rr(2600, 3900), a = rr(0.4, 1) * (1 - 0.5 * (tt - t) / 0.35), long = rnd() < 0.3, dc = long ? 0.45 : rr(0.08, 0.18);
      L.modal(ctx, o, tt, { freqs: [f, f * 2.43, f * 3.77, f * 5.2], decays: [dc, dc * 0.6, dc * 0.4, dc * 0.2], gains: [0.3 * a, 0.2 * a, 0.12 * a, 0.06 * a], a: 0.0006 });
      L.noiseHit(ctx, o, tt, { type: 'bandpass', f: 6000, q: 0.8, d: 0.01, gain: 0.15 * a });
    }
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 4500, q: 0.6, a: 0.04, d: 0.3, gain: 0.08 });                  // ruido de las monedas que se deslizan
  };
  R['loot.coins'].cooldown = 0.08; R['loot.coins'].dur = 1.2;

  /* --- mochila: cierre de tela --- */
  function zipper(ctx, o, t, dur, up, L) {
    var src = L.noiseSrc(ctx, 'white', t, dur + 0.05), bp = L.filter(ctx, 'bandpass', 3800, 1.2), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(), env = ctx.createGain();
    g.gain.value = 0.5; lfo.type = 'square'; lg.gain.value = 0.5;
    var r0 = up ? 150 : 260, r1 = up ? 260 : 150, fk = L.curve([[0, r0], [1, r1]], 40, 0.08);
    lfo.frequency.setValueAtTime(r0, t); lfo.frequency.setValueCurveAtTime(fk, t, dur);
    bp.frequency.setValueAtTime(up ? 2800 : 5200, t); bp.frequency.linearRampToValueAtTime(up ? 5200 : 2800, t + dur);
    env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(1, t + 0.02); env.gain.setValueAtTime(1, t + dur - 0.02); env.gain.linearRampToValueAtTime(0.0001, t + dur);
    lfo.connect(lg); lg.connect(g.gain); src.connect(bp); bp.connect(g); g.connect(env); env.connect(o); lfo.start(t); lfo.stop(t + dur + 0.02);
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 1700, q: 0.5, a: 0.02, d: dur, gain: 0.18 });                  // roce de la tela
    L.noiseHit(ctx, o, t + dur, { type: 'bandpass', f: 2600, q: 3, d: 0.01, gain: 0.3 });                                       // el cursor llega al tope
  }
  R['inv.open'] = function (ctx, out, d, L) {
    L = L || lib; var o = L.bus(ctx, out, 0.7), t = ctx.currentTime + 0.003, D = vary(0.28, 0.15);
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'lowpass', f: 1800, a: 0.01, d: 0.1, gain: 0.3 });
    zipper(ctx, o, t + 0.03, D, true, L);
  };
  R['inv.open'].cooldown = 0.1; R['inv.open'].dur = 0.5;
  R['inv.close'] = function (ctx, out, d, L) {
    L = L || lib; var o = L.bus(ctx, out, 0.7), t = ctx.currentTime + 0.003, D = vary(0.24, 0.15);
    zipper(ctx, o, t, D, false, L);
    L.tone(ctx, o, t + D + 0.02, { f0: 150, f1: 80, d: 0.06, gain: 0.3 });
    L.noiseHit(ctx, o, t + D + 0.02, { kind: 'pink', type: 'lowpass', f: 1500, a: 0.005, d: 0.1, gain: 0.25 });
  };
  R['inv.close'].cooldown = 0.1; R['inv.close'].dur = 0.5;

  R['item.eat'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.55), n = 3 + ((rnd() * 3) | 0), tt = t, i;
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 1200, q: 0.8, a: 0.02, d: 0.08, gain: 0.2 });                  // envoltorio
    for (i = 0; i < n; i++) {
      L.noiseHit(ctx, o, tt, { type: 'bandpass', f: vary(1800, 0.15), q: 1, a: 0.004, d: 0.05, gain: rr(0.4, 0.6) });        // crujido
      L.noiseHit(ctx, o, tt, { type: 'highpass', f: 4000, d: 0.02, gain: 0.2 });
      L.tone(ctx, o, tt + 0.03, { f0: rr(250, 400), f1: rr(600, 1000), d: 0.02, a: 0.003, gain: 0.1 });                       // chasquido húmedo
      L.tone(ctx, o, tt, { f0: 110, f1: 70, d: 0.05, gain: 0.25 });
      tt += vary(0.22, 0.2);
    }
    L.tone(ctx, o, tt + 0.05, { f0: 200, f1: 320, sweep: 0.06, d: 0.14, gain: 0.45 });                                         // trago
    L.noiseHit(ctx, o, tt + 0.05, { kind: 'pink', type: 'lowpass', f: 700, a: 0.02, d: 0.14, gain: 0.3 });
  };
  R['item.eat'].cooldown = 0.4; R['item.eat'].dur = 1.5;

  R['item.drink'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.45), warm = d.item === 'emoliente', tt = t, i, n = 2 + ((rnd() * 2) | 0);
    if (!warm) {                                                                        // lata de gaseosa: chasquido de la anilla y gas
      L.noiseHit(ctx, o, tt, { type: 'bandpass', f: 3000, q: 4, d: 0.008, gain: 0.5 });
      L.clang(ctx, o, tt, { f: 1500, gain: 0.2, decay: 0.12, n: 3 });
      L.noiseHit(ctx, o, tt + 0.03, { type: 'highpass', f: vary(4500, 0.1), a: 0.004, d: 0.55, gain: 0.35 });
      L.noiseHit(ctx, o, tt + 0.03, { type: 'bandpass', f: 8000, q: 0.7, a: 0.004, d: 0.4, gain: 0.2 });
      tt += 0.4;
    } else {
      L.noiseHit(ctx, o, tt, { kind: 'pink', type: 'bandpass', f: 1500, f1: 900, q: 1, a: 0.05, d: 0.2, gain: 0.25 });          // sorbo caliente
      tt += 0.2;
    }
    for (i = 0; i < n; i++) {                                                           // glu, glu
      L.tone(ctx, o, tt, { f0: 190, f1: 320, sweep: 0.05, a: 0.01, d: 0.1, gain: 0.55 });
      L.tone(ctx, o, tt + 0.06, { f0: 320, f1: 150, sweep: 0.08, d: 0.09, gain: 0.35 });
      L.noiseHit(ctx, o, tt, { kind: 'pink', type: 'bandpass', f: vary(700, 0.15), q: 1, a: 0.02, d: 0.14, gain: 0.3 });
      tt += vary(0.26, 0.15);
    }
    L.noiseHit(ctx, o, tt + 0.05, { type: 'bandpass', f: 1500, f1: 700, q: 0.9, a: 0.05, d: 0.2, gain: 0.3 });                 // «aaah»
    L.voice(ctx, o, tt + 0.05, { dur: 0.3, f0: [[0, 130], [1, 100]], vowels: [[0, 'a'], [1, 'uh']], amp: [[0, 0], [0.2, 0.7], [1, 0]], breath: 0.5, gain: 0.9 });
  };
  R['item.drink'].cooldown = 0.4; R['item.drink'].dur = 1.8;

  R['bag.full'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.32), pm = vary(1, 0.12), g2 = vary(0.16, 0.25);
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: vary(1800, 0.2), q: 0.6, a: 0.02, d: vary(0.25, 0.3), gain: 0.35 });
    L.tone(ctx, o, t + 0.08, { f0: 210 * pm, f1: 120 * pm, d: 0.1, gain: 0.5 });
    L.modal(ctx, o, t + 0.08, { freqs: [330 * pm, 790 * pm], decays: [0.1, 0.05], gains: [0.3, 0.15] });
    L.tone(ctx, o, t + 0.08 + g2, { f0: 170 * pm, f1: 95 * pm, d: 0.14, gain: 0.5 });
    L.modal(ctx, o, t + 0.08 + g2, { freqs: [262 * pm, 640 * pm], decays: [0.12, 0.06], gains: [0.3, 0.15] });
  };
  R['bag.full'].cooldown = 0.4; R['bag.full'].dur = 0.6;

  /* --- voces musicales en loop --- */
  // Cantante en la ventana: bolero sin palabras, vibrato lento, frases de 4–6 notas con portamento que se resuelven en la tónica (La menor armónica).
  R['singer.window'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var o = L.bus(ctx, out, 0.25), win = L.filter(ctx, 'lowpass', 3800, 0.5), hp = L.filter(ctx, 'highpass', 150, 0.7), SC = [57, 59, 60, 62, 64, 65, 68, 69, 71, 72];
    win.connect(hp); hp.connect(o);
    return L.loop(ctx, win, {
      data: d,
      setup: function (h) { h.st.idx = 3 + ((rnd() * 4) | 0); h.st.prev = mtof(SC[h.st.idx]); },
      step: function (h, t) {
        var n = 4 + ((rnd() * 3) | 0), k, idx = h.st.idx, u = 0, fk = [], vk = [], ak = [], D = 0, durs = [], notes = [], f, prev = h.st.prev;
        for (k = 0; k < n; k++) {
          var last = k === n - 1;
          idx = last ? (rnd() < 0.6 ? 7 : 4) : clamp(idx + pick([-2, -1, -1, 0, 1, 1, 2]), 0, SC.length - 1);
          notes.push(idx); durs.push(last ? rr(1.4, 2.0) : pick([0.45, 0.6, 0.8, 1.1]) * vary(1, 0.08)); D += durs[k];
        }
        for (k = 0; k < n; k++) {
          var u0 = u / D, u1 = (u + durs[k]) / D, sl = Math.min(0.14 / D, (u1 - u0) * 0.4);
          f = mtof(SC[notes[k]]) * vary(1, 0.003);
          fk.push([u0, prev * 0.97], [u0 + sl, f * 0.99], [u1 - 0.02 / D, f * (k === n - 1 ? 0.985 : 1)]);
          vk.push([u0, pick(['a', 'o', 'a', 'e'])]);
          ak.push([u0, k ? 0.6 : 0], [u0 + 0.05 / D, 0.85], [u0 + (u1 - u0) * 0.6, 1]);
          prev = f; u += durs[k];
        }
        ak.push([1, 0]); vk.push([1, 'o']); fk.push([1, prev * 0.97]);
        h.st.idx = notes[n - 1]; h.st.prev = prev;
        L.voice(ctx, h.out, t, { dur: D, f0: fk, vowels: vk, amp: ak, fscale: 1.12, bw: 0.8, breath: 0.12, vib: 0.013, vibHz: 5.2, jitter: 0.006, gain: 2.2 });
        return t + D + rr(0.8, 1.9);
      }
    });
  };
  R['singer.window'].loop = true; R['singer.window'].cooldown = 2; R['singer.window'].dur = 8; R['singer.window'].wet = 0.3;

  // Zombie cantor: melodía de pentatónica menor desafinada, notas que se hunden, voz rota.
  R['zombie.sing'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var o = L.bus(ctx, out, 0.15), root = rr(98, 140), PS = [0, 3, 5, 7, 10, 12];
    return L.loop(ctx, o, {
      data: d,
      step: function (h, t) {
        var n = 3 + ((rnd() * 3) | 0), k, D = 0, durs = [], u = 0, fk = [], vk = [], ak = [], idx = (rnd() * 4) | 0;
        for (k = 0; k < n; k++) { durs.push(rr(0.35, 0.95)); D += durs[k]; }
        for (k = 0; k < n; k++) {
          idx = clamp(idx + pick([-2, -1, 0, 1, 2]), 0, PS.length - 1);
          var u0 = u / D, u1 = (u + durs[k]) / D, f = root * st(PS[idx]) * Math.pow(2, rr(-60, 60) / 1200);
          fk.push([u0, f * 1.04], [u0 + 0.1 / D, f], [u1 - 0.05 / D, f * Math.pow(2, -rr(10, 45) / 1200)]);
          vk.push([u0, pick(['o', 'a', 'uh', 'u'])]);
          ak.push([u0, 0.3], [u0 + 0.06 / D, 0.9], [(u0 + u1) / 2, rnd() < 0.3 ? 0.25 : 1], [u1 - 0.04 / D, 0.5]);
          u += durs[k];
        }
        if (rnd() < 0.35) { fk.push([0.985, fk[fk.length - 1][1] * 2], [1, fk[fk.length - 1][1] * 1.6]); vk.push([1, 'a']); ak.push([0.985, 0.8], [1, 0]); }       // gallo
        else { fk.push([1, fk[fk.length - 1][1] * 0.9]); vk.push([1, 'o']); ak.push([1, 0]); }
        L.voice(ctx, h.out, t, { dur: D, f0: fk, vowels: vk, amp: ak, fscale: 0.9, bw: 1.4, breath: 0.45, rasp: 0.45, raspHz: 40, gargle: 0.15, gargleHz: 14, vib: 0.02, vibHz: 4.6,
          jitter: 0.03, gain: 3, drive: 0.25 });
        return t + D + rr(0.5, 1.6);
      }
    });
  };
  R['zombie.sing'].loop = true; R['zombie.sing'].cooldown = 2; R['zombie.sing'].dur = 5;

  /* --- locomoción (zombies v0.6b) --- */
  R['zombie.hop'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.3);
    L.tone(ctx, o, t, { f0: vary(125, 0.1), f1: 60, d: 0.07, gain: 0.6 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(900, 0.15), q: 0.9, d: 0.035, gain: 0.6 });
    L.noiseHit(ctx, o, t + 0.004, { type: 'highpass', f: 3200, d: 0.015, gain: 0.2 });
    if (rnd() < 0.3) L.voice(ctx, o, t, { dur: 0.14, f0: [[0, 90], [1, 80]], vowels: [[0, 'uh'], [1, 'o']], amp: [[0, 0], [0.3, 1], [1, 0]], breath: 0.5, rasp: 0.4, gain: 1.4 });
  };
  R['zombie.hop'].cooldown = 0.12; R['zombie.hop'].dur = 0.3;

  R['zombie.crutch'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, d.poke ? 0.45 : 0.38), f = vary(780, 0.06);
    L.tone(ctx, o, t, { f0: vary(210, 0.1), f1: 110, d: 0.05, gain: 0.55 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(1500, 0.1), q: 1.2, d: 0.02, gain: 0.5 });
    L.modal(ctx, o, t, { freqs: [f, f * 2.4], decays: [0.11, 0.05], gains: [0.25, 0.12] });
    if (d.poke) L.noiseHit(ctx, o, t - 0.0, { kind: 'pink', type: 'bandpass', f: 1500, f1: 600, q: 0.8, a: 0.04, d: 0.1, gain: 0.25 });
    else if (rnd() < 0.2) L.tone(ctx, o, t + 0.03, { type: 'triangle', f0: 1500, f1: 2100, sweep: 0.08, d: 0.09, gain: 0.04 });   // chirrido de goma
  };
  R['zombie.crutch'].cooldown = 0.15; R['zombie.crutch'].dur = 0.35;

  R['zombie.crawl'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.35), i;
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 500, f1: 900, q: 0.9, a: 0.15, d: 0.25, gain: 0.5 });
    L.noiseHit(ctx, o, t + 0.05, { kind: 'pink', type: 'lowpass', f: 2200, a: 0.1, d: 0.3, gain: 0.25 });
    for (i = 0; i < 5; i++) L.noiseHit(ctx, o, t + 0.05 + rr(0, 0.4), { type: 'bandpass', f: rr(2500, 5000), q: 3, d: 0.006, gain: rr(0.15, 0.35) });     // uñas
    L.tone(ctx, o, t + 0.3, { f0: 100, f1: 65, d: 0.07, gain: 0.25 });
  };
  R['zombie.crawl'].cooldown = 0.2; R['zombie.crawl'].dur = 0.7;

  // Silla de ruedas: caucho sobre asfalto con golpecito por vuelta, rodamiento agudo y crujidos del bastidor.
  R['zombie.wheel'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var o = L.bus(ctx, out, 0.28);
    function apply(h, t) {
      var s = spd01(h.data);
      h.bp.frequency.setTargetAtTime(300 + 600 * s, t, 0.1); h.lfo.frequency.setTargetAtTime(3 + 9 * s, t, 0.1);
      h.rg.gain.setTargetAtTime(0.2 + 0.8 * s, t, 0.1); h.hg.gain.setTargetAtTime(0.04 + 0.12 * s, t, 0.1); h.be.gain.setTargetAtTime(0.01 + 0.02 * s, t, 0.1);
    }
    return L.loop(ctx, o, {
      data: d,
      setup: function (h) {
        var ns = h.src('pink'); h.bp = L.filter(ctx, 'bandpass', 420, 0.8); h.rg = ctx.createGain(); h.rg.gain.value = 0.5;
        ns.connect(h.bp); h.bp.connect(h.rg); h.rg.connect(h.out);
        h.lfo = h.osc('sine', 5); var lg = ctx.createGain(); lg.gain.value = 0.3; h.lfo.connect(lg); lg.connect(h.rg.gain);         // golpecito por vuelta
        var nh = h.src('white'), hb = L.filter(ctx, 'bandpass', 2000, 1); h.hg = ctx.createGain(); h.hg.gain.value = 0.1; nh.connect(hb); hb.connect(h.hg); h.hg.connect(h.out);
        var bo = h.osc('sine', 1700 * vary(1, 0.05)); h.be = ctx.createGain(); h.be.gain.value = 0.015; bo.connect(h.be); h.be.connect(h.out);   // rodamiento
        apply(h, h.t0);
      },
      set: function (h) { apply(h, ctx.currentTime); },
      step: function (h, t) {
        apply(h, t);
        if (rnd() < 0.12) L.tone(ctx, h.out, t, { type: 'triangle', f0: rr(1000, 1300), f1: rr(1300, 1700), sweep: 0.08, d: 0.09, gain: 0.08 });   // chirrido del bastidor
        if (rnd() < 0.1) L.noiseHit(ctx, h.out, t, { kind: 'brown', type: 'lowpass', f: 300, d: 0.05, gain: 0.25 });
        return t + 0.1;
      }
    });
  };
  R['zombie.wheel'].loop = true; R['zombie.wheel'].cooldown = 0.3; R['zombie.wheel'].dur = 0.75;

  // Skate: ruedas de uretano duras, rugosas, con «tac-tac» en cada junta del pavimento.
  R['zombie.skate'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var o = L.bus(ctx, out, 0.24);
    function apply(h, t) {
      var s = spd01(h.data);
      h.bp.frequency.setTargetAtTime(1000 + 1400 * s, t, 0.1); h.lfo.frequency.setTargetAtTime(25 + 40 * s, t, 0.1);
      h.rg.gain.setTargetAtTime(0.2 + 0.8 * s, t, 0.1); h.lg.gain.setTargetAtTime(0.4 * h.rg.gain.value, t, 0.1);
    }
    return L.loop(ctx, o, {
      data: d,
      setup: function (h) {
        var ns = h.src('white'); h.bp = L.filter(ctx, 'bandpass', 1500, 0.7); h.rg = ctx.createGain(); h.rg.gain.value = 0.5; ns.connect(h.bp); h.bp.connect(h.rg); h.rg.connect(h.out);
        h.lfo = h.osc('sine', 40); h.lg = ctx.createGain(); h.lg.gain.value = 0.2; h.lfo.connect(h.lg); h.lg.connect(h.rg.gain);        // rugosidad de las ruedas
        var nl = h.src('pink'), lp = L.filter(ctx, 'lowpass', 500, 0.7), lgn = ctx.createGain(); lgn.gain.value = 0.35; nl.connect(lp); lp.connect(lgn); lgn.connect(h.out);   // la tabla
        apply(h, h.t0);
      },
      set: function (h) { apply(h, ctx.currentTime); },
      step: function (h, t) {
        var s = spd01(h.data);
        apply(h, t);
        L.noiseHit(ctx, h.out, t, { kind: 'brown', type: 'lowpass', f: 900, d: 0.02, gain: 0.5 });                                   // junta: tac…
        L.tone(ctx, h.out, t, { f0: 95, f1: 60, d: 0.05, gain: 0.4 });
        L.noiseHit(ctx, h.out, t, { type: 'highpass', f: 3000, d: 0.005, gain: 0.3 });
        L.noiseHit(ctx, h.out, t + 0.07, { kind: 'brown', type: 'lowpass', f: 800, d: 0.02, gain: 0.4 });                           // …tac
        return t + (0.55 - 0.35 * s) * vary(1, 0.25);
      }
    });
  };
  R['zombie.skate'].loop = true; R['zombie.skate'].cooldown = 0.3; R['zombie.skate'].dur = 0.6;

  // Bicicleta: piñón libre que traquetea, cadena, caucho y un timbre que suena de vez en cuando (o con {bell:true}).
  function bellRing(ctx, o, t, L, n) {
    var k, tt = t, f = rr(2200, 2500);
    for (k = 0; k < n; k++) { L.bell(ctx, o, tt, { f: f, gain: 0.35, decay: 0.45 }); tt += rr(0.05, 0.075); }
  }
  R['zombie.bike'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var o = L.bus(ctx, out, 0.34);
    if (d.bell) { bellRing(ctx, o, ctx.currentTime + 0.003, L, 3 + ((rnd() * 3) | 0)); return 1.0; }
    return L.loop(ctx, o, {
      data: d,
      setup: function (h) {
        var nc = h.src('white'), cb = L.filter(ctx, 'bandpass', 2800, 2), cg = ctx.createGain(); cg.gain.value = 0.06; nc.connect(cb); cb.connect(cg); cg.connect(h.out);   // cadena
        var nt = h.src('pink'), tl = L.filter(ctx, 'lowpass', 700, 0.7); h.tg = ctx.createGain(); h.tg.gain.value = 0.25; nt.connect(tl); tl.connect(h.tg); h.tg.connect(h.out);   // caucho
        h.st.bell = h.t0 + rr(0.5, 2.5);
      },
      set: function (h) { h.tg.gain.setTargetAtTime(0.1 + 0.3 * spd01(h.data), ctx.currentTime, 0.1); },
      step: function (h, t) {
        var s = spd01(h.data);
        h.tg.gain.setTargetAtTime(0.1 + 0.3 * s, t, 0.1);
        L.noiseHit(ctx, h.out, t, { type: 'bandpass', f: vary(4200, 0.1), q: 5, d: 0.004, gain: 0.35 });                           // piñón libre
        L.modal(ctx, h.out, t, { freqs: [vary(3200, 0.03)], decays: [0.02], gains: [0.12] });
        if (t > h.st.bell) { bellRing(ctx, h.out, t, L, 2 + ((rnd() * 4) | 0)); h.st.bell = t + rr(2, 5); }
        return t + (0.09 - 0.05 * s) * vary(1, 0.1);
      }
    });
  };
  R['zombie.bike'].loop = true; R['zombie.bike'].cooldown = 0.3; R['zombie.bike'].dur = 0.8;

  // Carretilla de mercado: rueda que chilla, bastidor que traquetea.
  R['zombie.cart'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var o = L.bus(ctx, out, 0.28);
    function apply(h, t) {
      var s = spd01(h.data);
      h.rg.gain.setTargetAtTime(0.2 + 0.6 * s, t, 0.1); h.lfo.frequency.setTargetAtTime(6 + 8 * s, t, 0.1);
    }
    return L.loop(ctx, o, {
      data: d,
      setup: function (h) {
        var nr = h.src('white'), rb = L.filter(ctx, 'bandpass', 900, 1.2); h.rg = ctx.createGain(); h.rg.gain.value = 0.3; nr.connect(rb); rb.connect(h.rg); h.rg.connect(h.out);
        h.lfo = h.osc('sine', 10); var lg = ctx.createGain(); lg.gain.value = 0.15; h.lfo.connect(lg); lg.connect(h.rg.gain);                      // rueda descentrada
        var nl = h.src('brown'), ll = L.filter(ctx, 'lowpass', 350, 0.7), lgn = ctx.createGain(); lgn.gain.value = 0.5; nl.connect(ll); ll.connect(lgn); lgn.connect(h.out);
        h.sq = h.osc('sawtooth', 1800); var sb = L.filter(ctx, 'bandpass', 2200, 8); h.sg = ctx.createGain(); h.sg.gain.value = 0; h.sq.connect(sb); sb.connect(h.sg); h.sg.connect(h.out);
        h.st.nextSq = h.t0 + rr(0.2, 0.6);
        apply(h, h.t0);
      },
      set: function (h) { apply(h, ctx.currentTime); },
      step: function (h, t) {
        apply(h, t);
        if (t >= h.st.nextSq) {                                                                                                     // «iii-ek»
          var f0 = rr(1500, 1900), gl = rr(0.12, 0.2);
          h.sq.frequency.setValueAtTime(f0, t); h.sq.frequency.linearRampToValueAtTime(f0 * rr(1.2, 1.5), t + gl);
          h.sg.gain.setTargetAtTime(0.25, t, 0.01); h.sg.gain.setTargetAtTime(0, t + gl, 0.02);
          h.st.nextSq = t + rr(0.45, 1.1);
        }
        if (rnd() < 0.5) L.modal(ctx, h.out, t + rr(0, 0.08), { freqs: [rr(900, 1800), rr(2000, 3500)], decays: [0.03, 0.015], gains: [0.12, 0.06] });   // traqueteo del bastidor
        return t + 0.1;
      }
    });
  };
  R['zombie.cart'].loop = true; R['zombie.cart'].cooldown = 0.3; R['zombie.cart'].dur = 0.85;

  R['shield.clang'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.002, o = L.bus(ctx, out, 0.5), f = rr(240, 330);
    L.tone(ctx, o, t, { f0: 120, f1: 50, d: 0.15, gain: 0.8 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(2600, 0.1), q: 1.2, d: 0.02, gain: 0.7 });
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 5000, d: 0.05, gain: 0.3 });
    L.clang(ctx, o, t, { f: f, gain: 0.8, decay: 0.8 });
    L.clang(ctx, o, t + 0.001, { f: f * 2.2, gain: 0.35, decay: 0.3, n: 4 });
    L.tone(ctx, o, t + 0.01, { type: 'triangle', f0: f * 1.3, f1: f * 0.9, sweep: 0.25, d: 0.3, gain: 0.2 });                        // la chapa tiembla
  };
  R['shield.clang'].cooldown = 0.1; R['shield.clang'].dur = 1.3;

  R['vehicle.fall'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.35), k = d.kind || d.loco || pick(['skate', 'bici', 'silla']), i, tt;
    L.tone(ctx, o, t, { f0: 110, f1: 50, d: 0.15, gain: 0.6 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 500, d: 0.12, gain: 0.5 });
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'lowpass', f: 2200, a: 0.02, d: 0.25, gain: 0.25 });
    if (k === 'skate') {
      tt = t + 0.05; for (i = 0; i < 5; i++) { woodHit(ctx, o, tt, rr(200, 400), 0.5 / (1 + i * 0.5), L); tt += 0.08 + i * 0.05; }
      for (i = 0; i < 10; i++) L.noiseHit(ctx, o, t + 0.2 + i * (0.03 + i * 0.012), { type: 'bandpass', f: rr(1500, 2500), q: 1, d: 0.02, gain: 0.25 * (1 - i / 11) });   // ruedas que giran
    } else if (k === 'bici') {
      L.clang(ctx, o, t, { f: rr(300, 520), gain: 0.5, decay: 0.5 });
      L.clang(ctx, o, t + 0.12, { f: rr(500, 800), gain: 0.3, decay: 0.3, n: 4 });
      for (i = 0; i < 12; i++) L.noiseHit(ctx, o, t + 0.25 + i * (0.02 + i * 0.012), { type: 'bandpass', f: 4200, q: 5, d: 0.004, gain: 0.25 * (1 - i / 13) });        // rayos
      if (rnd() < 0.5) L.bell(ctx, o, t + 0.1, { f: 2350, gain: 0.3, decay: 0.3 });
    } else {
      L.clang(ctx, o, t, { f: rr(250, 400), gain: 0.4, decay: 0.4 });
      for (i = 0; i < 8; i++) L.noiseHit(ctx, o, t + 0.1 + i * (0.04 + i * 0.012), { type: 'bandpass', f: rr(500, 900), q: 1.5, d: 0.025, gain: 0.25 * (1 - i / 9) });
    }
    if (d.crash) L.noiseHit(ctx, o, t + 0.02, { type: 'bandpass', f: 1800, q: 0.7, d: 0.1, gain: 0.35 });
  };
  R['vehicle.fall'].cooldown = 0.15; R['vehicle.fall'].dur = 1.5;

  /* Duración (s) que la receta puede vivir: el motor la usa para contar voces (tope de 24). */
  var DUR = { hit: 0.9, swing: 0.8, whiff: 0.45, kill: 0.7, 'zombie.idle': 1.5, 'zombie.alert': 0.8, 'zombie.lunge': 0.5, 'zombie.bite': 0.5, 'cobrador.shout': 1.5,
    step: 0.2, 'player.hurt': 0.5, 'player.exhausted': 1.9, 'player.recovered': 0.9, 'player.death': 2.1, 'player.respawn': 1.1,
    'titina.launch': 0.7, 'titina.coo': 0.9, 'titina.return': 1.1, 'titina.grabbed': 1.1, 'dog.bark': 1.1, 'dog.whine': 1.0, 'birds.fly': 1.8,
    'ui.move': 0.25, 'ui.ok': 0.6, 'ui.back': 0.5, 'game.pause': 0.5, 'game.resume': 0.5, 'game.start': 2.3, horde: 3.7, win: 2.6 };
  Object.keys(DUR).forEach(function (k) { R[k].dur = DUR[k]; });

  /* =====================================================================================================
     v0.8 (G5) — armas de la calle, la noche y la comida
     guitar.crack/break, punch.swing/hit, skate.swing/hit/break, throw.skate + roll.skate (loop), throw.bici, throw.moto (loop),
     moto.crash, kick.cart, cart.roll (loop), cart.spill, cart.take, grab, night.fall, invis.on/off, item.sick, zombie.moto (loop).
     Loops (roll.skate, cart.roll, throw.moto, zombie.moto): ACH.audio.loop(name, {x, y, speed}) → move(x, y, {speed}); speed en px/s o 0..1.
       roll.skate ref 260 px/s · cart.roll ref 240 · throw.moto ref 380 (acelera solo durante el primer segundo) · zombie.moto ref 160 ({rev:true} = rugido).
     ===================================================================================================== */
  function spdN(d, ref, def) { var s = d && typeof d.speed === 'number' ? d.speed : def; return clamp(s > 2 ? s / ref : s, 0, 1); }

  /* --- guitarra: cruje la madera, la cuerda hace «boing» --- */
  R['guitar.crack'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.5), i, u, tt, sev = clamp(d.sev == null ? rr(0.4, 1) : +d.sev, 0, 1);
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(1900, 0.12), q: 1.6, d: 0.022, gain: 0.55 });                     // tac de la madera
    L.tone(ctx, o, t, { f0: vary(210, 0.1), f1: 85, d: 0.1, gain: 0.5 });
    L.modal(ctx, o, t, { freqs: [vary(430, 0.08), vary(980, 0.06), vary(1750, 0.06)], decays: [0.16, 0.08, 0.04], gains: [0.35, 0.22, 0.12] });
    var n = 14 + ((rnd() * 14) | 0), span = rr(0.35, 0.6) * (0.8 + 0.4 * sev), base = vary(880, 0.15);
    for (i = 0; i < n; i++) {                                                                                         // crujido: deslizar-pegar
      u = Math.pow(i / n, 1.25); tt = t + 0.014 + span * u;
      L.noiseHit(ctx, o, tt, { type: 'bandpass', f: base * (1 + 0.55 * u) * vary(1, 0.08), q: 7, d: rr(0.005, 0.012), gain: 0.22 * rr(0.6, 1) });
      if (rnd() < 0.3) L.tone(ctx, o, tt, { f0: rr(180, 330), f1: rr(110, 200), d: 0.015, a: 0.002, gain: 0.07 });
    }
    var gr = ctx.createOscillator(), gb = L.filter(ctx, 'bandpass', vary(720, 0.12), 4), gg = ctx.createGain();      // gemido de la veta
    gr.type = 'sawtooth'; gr.frequency.setValueAtTime(vary(96, 0.1), t + 0.01); gr.frequency.linearRampToValueAtTime(vary(66, 0.15), t + 0.01 + span);
    gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(0.16, t + 0.06); gg.gain.setTargetAtTime(0, t + span * 0.7, 0.08);
    var am = ctx.createOscillator(), ag = ctx.createGain(); am.type = 'square'; am.frequency.value = rr(55, 80); ag.gain.value = 0.4; am.connect(ag); ag.connect(gg.gain);
    gr.connect(gb); gb.connect(gg); gg.connect(o); gr.start(t); gr.stop(t + span + 0.5); am.start(t); am.stop(t + span + 0.5);
    var body = L.bodyResonance(ctx, o, { wet: 1 }), ns = 2 + ((rnd() * 2) | 0), ts = t + 0.018;                          // la cuerda: ¡boing!
    for (i = 0; i < ns; i++) {
      var f = pick([82.4, 110, 146.8, 196, 246.9, 329.6]) * vary(1, 0.01);
      L.pluck(ctx, body, f, ts + i * rr(0.004, 0.02), { decay: rr(0.5, 0.9), bright: 0.85, pick: 0.95, vel: 0.38 * rr(0.7, 1), bend: rr(1.05, 1.12), bendT: rr(0.1, 0.2), dur: 1.0 });
    }
    L.modal(ctx, o, ts, { freqs: [vary(1320, 0.1), vary(2650, 0.1)], decays: [0.18, 0.08], gains: [0.1, 0.06] });
    L.noiseHit(ctx, o, ts + 0.02, { type: 'bandpass', f: 4200, q: 3, a: 0.004, d: 0.1, gain: 0.07 });                  // traste vibrando
  };
  R['guitar.crack'].cooldown = 0.25; R['guitar.crack'].dur = 1.3;

  /* --- la guitarra se rompe: madera que revienta, cuerdas que saltan, cuerpo disonante que se apaga; triste --- */
  R['guitar.break'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.95), i, u, tt, f;
    L.tone(ctx, o, t, { f0: vary(125, 0.08), f1: 38, d: 0.5, gain: 0.95 });                                           // el golpe
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: vary(520, 0.1), q: 0.7, d: 0.6, gain: 0.9 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(2300, 0.1), q: 1.1, d: 0.06, gain: 0.9 });
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 5200, d: 0.025, gain: 0.5 });
    var n = 34 + ((rnd() * 18) | 0);
    for (i = 0; i < n; i++) {                                                                                         // astillas
      u = Math.pow(rnd(), 1.6); tt = t + 0.006 + 0.8 * u; f = rr(1100, 4800);
      L.noiseHit(ctx, o, tt, { type: 'bandpass', f: f, q: 3.5, d: rr(0.004, 0.018), gain: 0.5 * (1 - 0.65 * u) * rr(0.5, 1) });
      if (rnd() < 0.4) L.modal(ctx, o, tt, { freqs: [rr(500, 1700), rr(1800, 3600)], decays: [0.03, 0.015], gains: [0.16 * (1 - 0.6 * u), 0.08] });
    }
    for (i = 0; i < 7; i++) woodHit(ctx, o, t + 0.03 + i * rr(0.05, 0.13), rr(170, 520) * (1 - 0.04 * i), 0.6 / (1 + 0.3 * i), L);   // trozos de tapa y mástil
    var si = 0;
    for (i = 0; i < 6; i++) {                                                                                         // cuerdas que saltan, una por una
      tt = t + 0.006 + i * rr(0.012, 0.045) + (i > 2 ? 0.05 : 0); f = rr(1800, 5500); si++;
      L.noiseHit(ctx, o, tt, { type: 'highpass', f: 6200, d: 0.004, gain: 0.45 });
      L.tone(ctx, o, tt, { f0: f, f1: f * 0.22, sweep: 0.1, a: 0.001, d: 0.11, gain: 0.17 });                            // «zing» que cae
      L.pluck(ctx, o, [82.4, 110, 146.8, 196, 246.9, 329.6][i] * vary(1, 0.012), tt, { decay: 0.5, bright: 0.9, pick: 1, vel: 0.2, bend: rr(1.15, 1.35), bendT: 0.14, dur: 0.7 });   // látigo suelto
    }
    var bs = pick([[98, 103.8], [110, 116.5], [87.3, 92.5]]);                                                          // cuerpo disonante: dos tonos casi pegados que baten
    L.modal(ctx, o, t + 0.01, { freqs: [bs[0], bs[1], bs[0] * 1.5 * vary(1, 0.01), bs[1] * 2.1, bs[0] * 3.03, bs[1] * 4.1],
      decays: [1.9, 1.7, 1.2, 0.95, 0.7, 0.5], gains: [0.55, 0.5, 0.26, 0.2, 0.13, 0.09], a: 0.004 });
    var body = L.bodyResonance(ctx, o, { wet: 1.4 });
    L.strum(ctx, body, pick(DISS).map(function (m) { return mtof(m); }), t + 0.012, { spread: 0.006, decay: 1.5, bright: 0.35, vel: 0.2, bend: 1.05, bendT: 0.4, dur: 2.2, body: false });
    var sg = ctx.createOscillator(), sgg = ctx.createGain(), s0 = t + 0.7;                                             // el suspiro: un tono que se cae despacio
    sg.type = 'sine'; sg.frequency.setValueAtTime(vary(262, 0.03), s0); sg.frequency.exponentialRampToValueAtTime(vary(174, 0.03), s0 + 1.6);
    var vb = ctx.createOscillator(), vbg = ctx.createGain(); vb.frequency.value = 4.6; vbg.gain.value = 3; vb.connect(vbg); vbg.connect(sg.detune);
    sgg.gain.setValueAtTime(0.0001, s0); sgg.gain.linearRampToValueAtTime(0.1, s0 + 0.35); sgg.gain.exponentialRampToValueAtTime(0.0005, s0 + 1.8);
    sg.connect(sgg); sgg.connect(o); sg.start(s0); sg.stop(s0 + 1.9); vb.start(s0); vb.stop(s0 + 1.9);
    var fl = [220, 196, 164.8], ft = t + 0.85;                                                                         // tres notas flojas que bajan: La, Sol, Mi
    for (i = 0; i < 3; i++) { L.pluck(ctx, body, fl[i] * vary(1, 0.004), ft, { decay: 1.5, bright: 0.2, pick: 0.4, vel: 0.14 - 0.02 * i, bend: 0.985, bendT: 0.5, dur: 1.8 }); ft += rr(0.5, 0.7); }
    for (i = 0; i < 4; i++) woodHit(ctx, o, t + 1.7 + i * rr(0.1, 0.3) + i * i * 0.08, rr(200, 420), 0.07 / (1 + i * 0.4), L);   // la madera se acomoda
  };
  R['guitar.break'].cooldown = 1; R['guitar.break'].dur = 3.4; R['guitar.break'].wet = 0.34; R['guitar.break'].priority = 5;

  /* --- puñetes: un golpe de carne, más flojo que la guitarra --- */
  R['punch.swing'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime, dur = vary(0.14, 0.15), o = L.bus(ctx, out, 0.3);
    var src = L.noiseSrc(ctx, 'pink', t, dur + 0.1), bp = L.filter(ctx, 'bandpass', 500, 0.9), g = ctx.createGain();
    bp.frequency.setValueAtTime(vary(420, 0.1), t); bp.frequency.exponentialRampToValueAtTime(vary(1500, 0.1), t + dur * 0.5); bp.frequency.exponentialRampToValueAtTime(vary(700, 0.1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(3.0, t + dur * 0.42); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(o);
    L.noiseHit(ctx, o, t + dur * 0.2, { kind: 'brown', type: 'lowpass', f: 350, a: dur * 0.2, d: dur * 0.5, gain: 0.25 });
  };
  R['punch.swing'].cooldown = 0.08; R['punch.swing'].dur = 0.35;

  R['punch.hit'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.42), th = vary(1, 0.12);
    L.tone(ctx, o, t, { f0: vary(135, 0.08), f1: vary(52, 0.1), d: 0.13, gain: 0.8 * th });                           // puño contra el pecho
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: vary(420, 0.1), q: 0.7, d: 0.1, gain: 0.7 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(950, 0.12), q: 1.1, d: 0.035, gain: 0.4 });                      // palmada
    L.noiseHit(ctx, o, t + 0.004, { type: 'bandpass', f: vary(2200, 0.1), q: 0.9, d: 0.012, gain: 0.18 });
    L.noiseHit(ctx, o, t + 0.02, { kind: 'pink', type: 'lowpass', f: 2400, a: 0.015, d: 0.13, gain: 0.16 });            // ropa
    if (rnd() < 0.45) L.tone(ctx, o, t + 0.06, { f0: 90, f1: 60, d: 0.07, gain: 0.18 });
  };
  R['punch.hit'].cooldown = 0.05; R['punch.hit'].dur = 0.5;

  /* --- skate de madera: un «clac» hueco --- */
  R['skate.swing'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime, dur = vary(0.17, 0.15), o = L.bus(ctx, out, 0.22);
    var src = L.noiseSrc(ctx, 'pink', t, dur + 0.1), bp = L.filter(ctx, 'bandpass', 600, 1.1), g = ctx.createGain();
    bp.frequency.setValueAtTime(vary(560, 0.1), t); bp.frequency.exponentialRampToValueAtTime(vary(2300, 0.1), t + dur * 0.45); bp.frequency.exponentialRampToValueAtTime(vary(900, 0.1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(3.6, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(o);
    for (var i = 0; i < 2; i++) L.modal(ctx, o, t + dur * rr(0.1, 0.5), { freqs: [vary(2900, 0.05), vary(4100, 0.05)], decays: [0.03, 0.015], gains: [0.09, 0.05] });   // los ejes tintinean
  };
  R['skate.swing'].cooldown = 0.08; R['skate.swing'].dur = 0.4;

  function plank(ctx, o, t, f, g, L) {                                         // golpe sobre una tabla hueca de arce
    L.tone(ctx, o, t, { f0: f * 1.25, f1: f * 0.62, d: 0.07, gain: g * 0.7 });
    L.modal(ctx, o, t, { freqs: [f, f * 2.07, f * 3.6, f * 6.1], decays: [0.1, 0.06, 0.035, 0.02], gains: [g * 0.6, g * 0.4, g * 0.22, g * 0.12] });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: f * 8, q: 1.6, d: 0.01, gain: g * 0.55 });
  }
  R['skate.hit'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.4), f = vary(255, 0.1), i;
    plank(ctx, o, t, f, 0.8, L);
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 600, d: 0.07, gain: 0.45 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(3200, 0.1), q: 1.2, d: 0.012, gain: 0.45 });                     // clac
    L.clang(ctx, o, t + 0.004, { f: vary(1800, 0.1), gain: 0.16, decay: 0.12, n: 3 });                                 // los ejes
    for (i = 0; i < 3; i++) L.noiseHit(ctx, o, t + 0.05 + i * rr(0.03, 0.06), { type: 'bandpass', f: rr(1500, 2300), q: 2, d: 0.03, gain: 0.1 * (1 - i * 0.3) });   // ruedas que giran un poco
    L.modal(ctx, o, t + 0.045, { freqs: [f * 1.42, f * 2.5], decays: [0.06, 0.03], gains: [0.14, 0.08] });
  };
  R['skate.hit'].cooldown = 0.05; R['skate.hit'].dur = 0.7;

  R['skate.break'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.55), i, u;
    L.tone(ctx, o, t, { f0: 150, f1: 48, d: 0.2, gain: 0.8 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(2400, 0.1), q: 1.0, d: 0.05, gain: 0.8 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 480, d: 0.22, gain: 0.6 });
    for (i = 0; i < 18; i++) {
      u = Math.pow(rnd(), 1.5);
      L.noiseHit(ctx, o, t + 0.005 + 0.38 * u, { type: 'bandpass', f: rr(1200, 4200), q: 3.5, d: rr(0.004, 0.015), gain: 0.4 * (1 - 0.6 * u) * rr(0.5, 1) });   // fibras de la madera
    }
    plank(ctx, o, t + 0.07, vary(205, 0.1), 0.6, L);                                                                   // la mitad con ruedas cae
    plank(ctx, o, t + 0.16, vary(165, 0.1), 0.45, L);                                                                  // y la otra
    plank(ctx, o, t + 0.29, vary(135, 0.1), 0.3, L);
    L.clang(ctx, o, t + 0.07, { f: vary(1500, 0.1), gain: 0.25, decay: 0.3, n: 4 });
    for (i = 0; i < 9; i++) L.noiseHit(ctx, o, t + 0.2 + i * (0.04 + i * 0.015), { type: 'bandpass', f: rr(1500, 2600), q: 1.3, d: 0.025, gain: 0.16 * (1 - i / 10) });    // rueda que rueda
    L.modal(ctx, o, t + 0.55, { freqs: [rr(1000, 1800), rr(2400, 3600)], decays: [0.04, 0.02], gains: [0.12, 0.07] });
  };
  R['skate.break'].cooldown = 0.3; R['skate.break'].dur = 1.6;

  /* --- lanzar el skate y rodar: ruedas de uretano sobre asfalto, el tono sube con la velocidad --- */
  R['throw.skate'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.004, dur = vary(0.26, 0.15), o = L.bus(ctx, out, 0.3);
    var src = L.noiseSrc(ctx, 'pink', t, dur + 0.1), bp = L.filter(ctx, 'bandpass', 500, 1.0), g = ctx.createGain();
    bp.frequency.setValueAtTime(vary(420, 0.1), t); bp.frequency.exponentialRampToValueAtTime(vary(1800, 0.1), t + dur * 0.5); bp.frequency.exponentialRampToValueAtTime(vary(800, 0.1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(3.6, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(o);
    L.noiseHit(ctx, o, t + 0.03, { type: 'bandpass', f: vary(2400, 0.1), f1: 1500, q: 0.8, a: 0.02, d: 0.28, gain: 0.3 });     // las ruedas entran al asfalto
    L.tone(ctx, o, t, { f0: 140, f1: 80, d: 0.05, gain: 0.3 });                                                          // el empujón de la mano
    L.noiseHit(ctx, o, t + dur * 0.8, { kind: 'brown', type: 'lowpass', f: 800, d: 0.03, gain: 0.4 });                  // primer tac en el piso
    L.modal(ctx, o, t + dur * 0.8, { freqs: [vary(2600, 0.05), vary(3900, 0.05)], decays: [0.04, 0.02], gains: [0.12, 0.07] });
  };
  R['throw.skate'].cooldown = 0.12; R['throw.skate'].dur = 0.6;

  R['roll.skate'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var o = L.bus(ctx, out, 0.3);
    function apply(h, t) {
      var s = spdN(h.data, 260, 0.8), a = Math.pow(s, 0.7);
      h.bp.frequency.setTargetAtTime(650 + 2300 * s, t, 0.08); h.rg.gain.setTargetAtTime(0.02 + 0.9 * a, t, 0.08);
      h.lfo.frequency.setTargetAtTime(14 + 70 * s, t, 0.08); h.lg.gain.setTargetAtTime(0.35 * h.rg.gain.value, t, 0.08);
      h.hg.gain.setTargetAtTime(0.01 + 0.13 * a, t, 0.08);
      h.wo.frequency.setTargetAtTime(240 + 900 * s, t, 0.08); h.wg.gain.setTargetAtTime(0.002 + 0.02 * a, t, 0.08);
      h.bg.gain.setTargetAtTime(0.05 + 0.3 * a, t, 0.1);
    }
    return L.loop(ctx, o, {
      data: d,
      setup: function (h) {
        var ns = h.src('white'); h.bp = L.filter(ctx, 'bandpass', 1400, 0.9); h.rg = ctx.createGain(); h.rg.gain.value = 0.4; ns.connect(h.bp); h.bp.connect(h.rg); h.rg.connect(h.out);   // rumor del uretano
        h.lfo = h.osc('sine', 40); h.lg = ctx.createGain(); h.lg.gain.value = 0.2; h.lfo.connect(h.lg); h.lg.connect(h.rg.gain);                                                    // rugosidad
        var nh = h.src('white'), hb = L.filter(ctx, 'highpass', 4200, 0.7); h.hg = ctx.createGain(); h.hg.gain.value = 0.05; nh.connect(hb); hb.connect(h.hg); h.hg.connect(h.out);   // siseo
        h.wo = h.osc('triangle', 400); var wb = L.filter(ctx, 'bandpass', 1200, 6); h.wg = ctx.createGain(); h.wg.gain.value = 0.01; h.wo.connect(wb); wb.connect(h.wg); h.wg.connect(h.out);   // zumbido de rodamiento
        var nb = h.src('brown'), bl = L.filter(ctx, 'lowpass', 420, 0.7); h.bg = ctx.createGain(); h.bg.gain.value = 0.2; nb.connect(bl); bl.connect(h.bg); h.bg.connect(h.out);              // la tabla
        h.st.skip = h.t0 + rr(0.8, 2);
        apply(h, h.t0);
      },
      set: function (h) { apply(h, ctx.currentTime); },
      step: function (h, t) {
        var s = spdN(h.data, 260, 0.8);
        apply(h, t);
        if (s > 0.05) {
          L.noiseHit(ctx, h.out, t, { kind: 'brown', type: 'lowpass', f: 900, d: 0.02, gain: 0.5 * s });                  // tac de junta de asfalto
          L.tone(ctx, h.out, t, { f0: 100, f1: 62, d: 0.045, gain: 0.35 * s });
          if (t > h.st.skip && s > 0.3) { L.noiseHit(ctx, h.out, t, { type: 'bandpass', f: rr(1500, 2600), q: 2, d: 0.05, gain: 0.35 * s }); h.st.skip = t + rr(0.9, 2.4); }   // salta una piedrita
        }
        return t + Math.max(0.045, (0.42 - 0.36 * s) * vary(1, 0.25));
      }
    });
  };
  R['roll.skate'].loop = true; R['roll.skate'].cooldown = 0.2; R['roll.skate'].dur = 1.2;

  /* --- bici lanzada: timbre suelto, cuadro que clanga, rayos y cadena --- */
  R['throw.bici'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.004, dur = vary(0.3, 0.15), o = L.bus(ctx, out, 0.3), i;
    var src = L.noiseSrc(ctx, 'pink', t, dur + 0.1), bp = L.filter(ctx, 'bandpass', 400, 0.9), g = ctx.createGain();
    bp.frequency.setValueAtTime(vary(350, 0.1), t); bp.frequency.exponentialRampToValueAtTime(vary(1500, 0.1), t + dur * 0.45); bp.frequency.exponentialRampToValueAtTime(vary(600, 0.1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(3.4, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(o);
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 3000, q: 1.2, d: 0.01, gain: 0.3 });                                       // el agarrón
    L.clang(ctx, o, t + 0.02, { f: rr(300, 520), gain: 0.4, decay: 0.5 });                                                 // el cuadro
    L.clang(ctx, o, t + 0.05, { f: rr(500, 800), gain: 0.22, decay: 0.3, n: 4 });
    for (i = 0; i < 3 + ((rnd() * 3) | 0); i++) L.bell(ctx, o, t + 0.04 + i * rr(0.07, 0.15), { f: rr(2250, 2500), gain: 0.28 * (1 - i * 0.12), decay: 0.4 });    // timbre suelto
    for (i = 0; i < 12; i++) L.noiseHit(ctx, o, t + 0.1 + i * (0.018 + i * 0.01), { type: 'bandpass', f: 4200, q: 5, d: 0.004, gain: 0.22 * (1 - i / 13) });        // rayos
    L.noiseHit(ctx, o, t + 0.05, { type: 'highpass', f: 5500, a: 0.01, d: 0.3, gain: 0.1 });                                // cadena
  };
  R['throw.bici'].cooldown = 0.15; R['throw.bici'].dur = 1.2;

  /* --- motor de dos tiempos (compartido): tren de pulsos estrecho → resonador de escape + siseo AM; pierde un tiempo de vez en cuando --- */
  var PW = null;
  function pulseWave(ctx, duty) {
    var N = 96, re = new Float32Array(N + 1), im = new Float32Array(N + 1), k;
    for (k = 1; k <= N; k++) re[k] = Math.sin(k * Math.PI * duty) / (k * Math.PI);
    return ctx.createPeriodicWave(re, im);
  }
  function engineLoop(ctx, o, d, L, cfg) {
    function apply(h, t, e) {
      var f = cfg.idle + (cfg.top - cfg.idle) * Math.pow(e, 1.15);
      h.fo.frequency.setTargetAtTime(f, t, 0.05); h.fq.frequency.setTargetAtTime(f * 1.004, t, 0.05); h.fn.frequency.setTargetAtTime(f, t, 0.05);
      h.b1.frequency.setTargetAtTime(220 + 520 * e, t, 0.06); h.b2.frequency.setTargetAtTime(900 + 1700 * e, t, 0.06);
      h.ng.gain.setTargetAtTime(0.22 + 0.5 * e, t, 0.06); h.mg.gain.setTargetAtTime(cfg.gain * (0.55 + 0.45 * e) * h.dip, t, 0.02);
    }
    return L.loop(ctx, o, {
      data: d,
      setup: function (h) {
        var wave = pulseWave(ctx, 0.11), wave2 = pulseWave(ctx, 0.2);
        h.fo = h.osc('sawtooth', cfg.idle); h.fq = h.osc('sawtooth', cfg.idle); h.fn = h.osc('sine', cfg.idle);
        h.fo.setPeriodicWave(wave); h.fq.setPeriodicWave(wave2);
        var sum = ctx.createGain(); h.fo.connect(sum); var qg = ctx.createGain(); qg.gain.value = 0.5; h.fq.connect(qg); qg.connect(sum);
        h.b1 = L.filter(ctx, 'bandpass', 300, 2.2); h.b2 = L.filter(ctx, 'peaking', 1100, 1.4, 8); var hp = L.filter(ctx, 'highpass', 55, 0.7), sg = ctx.createGain(); sg.gain.value = 1.4;
        sum.connect(h.b2); sum.connect(h.b1); h.b1.connect(sg); sg.connect(h.b2); h.b2.connect(hp);
        var ns = h.src('white'), nb = L.filter(ctx, 'bandpass', 2400, 1.2); h.ng = ctx.createGain(); h.ng.gain.value = 0.3;                       // siseo del escape, pulsado a la frecuencia de encendido
        var nn = ctx.createGain(); nn.gain.value = 0; h.fn.connect(nn.gain); ns.connect(nb); nb.connect(nn); nn.connect(h.ng); h.ng.connect(hp);
        var sh = ctx.createWaveShaper(), cv = new Float32Array(257), i, x;
        for (i = 0; i < 257; i++) { x = i / 128 - 1; cv[i] = Math.tanh(1.6 * x) / Math.tanh(1.6); }
        sh.curve = cv; h.mg = ctx.createGain(); h.mg.gain.value = cfg.gain; hp.connect(sh); sh.connect(h.mg); h.mg.connect(h.out);
        h.dip = 1; h.st.nextDip = h.t0 + rr(0.2, 0.6); h.st.dipEnd = 0; h.st.blipT = h.t0 + rr(0.8, 2); h.st.blipS = -9; h.st.blipD = 0.5;
        apply(h, h.t0, 0);
      },
      set: function (h, p) { if (p && p.rev) { h.st.blipT = ctx.currentTime; } },
      step: function (h, t) {
        var base = spdN(h.data, cfg.ref, cfg.def), e;
        if (cfg.accel) e = base * (0.3 + 0.7 * Math.min(1, (t - h.t0) / 1.0));               // arranca y sube de vueltas solo
        else {
          e = base;
          if (t >= h.st.blipT) {                                                              // rugido (zombie.moto): un acelerón
            h.st.blipS = t; h.st.blipD = h.data.rev ? rr(0.6, 0.9) : rr(0.3, 0.6); h.st.blipA = h.data.rev ? 0.95 : rr(0.4, 0.7);
            h.st.blipT = t + h.st.blipD + rr(1.6, 4.2); h.data.rev = false;
          }
          var u = (t - h.st.blipS) / h.st.blipD;
          if (u >= 0 && u <= 1) e = Math.max(e, h.st.blipA * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.7)), 1.2));
        }
        if (t >= h.st.nextDip) {                                                              // pierde un tiempo: «brap-b-brap»
          h.dip = 0.25; h.st.dipEnd = t + rr(0.03, 0.07); h.st.nextDip = t + (cfg.accel ? rr(0.5, 1.5) : rr(0.25, 0.9) * (1.3 - e));
        }
        if (t >= h.st.dipEnd) h.dip = 1;
        apply(h, t, e);
        if (e < 0.4 && rnd() < 0.08) L.noiseHit(ctx, h.out, t, { kind: 'brown', type: 'lowpass', f: 450, d: 0.03, gain: 0.25 });                   // petardeo en el escape
        return t + 0.05;
      }
    });
  }
  R['throw.moto'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    return engineLoop(ctx, L.bus(ctx, out, 0.27), d, L, { idle: 30, top: 118, gain: 0.7, ref: 380, def: 0.9, accel: true });
  };
  R['throw.moto'].loop = true; R['throw.moto'].cooldown = 0.3; R['throw.moto'].dur = 3; R['throw.moto'].priority = 3;
  R['zombie.moto'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    return engineLoop(ctx, L.bus(ctx, out, 0.2), d, L, { idle: 27, top: 96, gain: 0.7, ref: 160, def: 0.15, accel: false });
  };
  R['zombie.moto'].loop = true; R['zombie.moto'].cooldown = 0.3; R['zombie.moto'].dur = 3; R['zombie.moto'].priority = 2;

  /* --- choque grande de la moto: chapa, vidrio, arrastre y un motor que tose --- */
  R['moto.crash'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.9), i, tt;
    L.tone(ctx, o, t, { f0: 85, f1: 30, d: 0.5, gain: 0.95 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 480, q: 0.7, d: 0.55, gain: 0.85 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(2000, 0.1), q: 1, d: 0.07, gain: 0.7 });
    for (i = 0; i < 7; i++) {                                                                                           // chapa que se aplasta
      tt = t + i * rr(0.03, 0.12);
      L.clang(ctx, o, tt, { f: rr(130, 700), gain: 0.45 - i * 0.04, decay: rr(0.25, 0.5), n: 5 });
      L.tone(ctx, o, tt, { type: 'triangle', f0: rr(220, 520), f1: rr(110, 260), d: 0.12, gain: 0.18 });
    }
    L.noiseHit(ctx, o, t + 0.01, { type: 'highpass', f: 2800, a: 0.002, d: 0.35, gain: 0.5 });                           // el faro y el espejo revientan
    tinkles(ctx, o, t + 0.04, 18 + ((rnd() * 8) | 0), 1.4, 0.17, 2200, 8000, L, 1.2);
    var sc = ctx.createOscillator(), sb = L.filter(ctx, 'bandpass', 1800, 2.2), sgn = ctx.createGain(), nz = L.noiseSrc(ctx, 'white', t, 1.7), ng = ctx.createGain();  // arrastre de metal sobre asfalto
    var s0 = t + 0.08, sdur = rr(1.0, 1.35);
    sc.type = 'sawtooth'; sc.frequency.setValueAtTime(vary(210, 0.1), s0); sc.frequency.exponentialRampToValueAtTime(70, s0 + sdur);
    sb.frequency.setValueAtTime(vary(2400, 0.1), s0); sb.frequency.exponentialRampToValueAtTime(380, s0 + sdur);
    sgn.gain.setValueAtTime(0.0001, s0); sgn.gain.linearRampToValueAtTime(0.5, s0 + 0.06); sgn.gain.setTargetAtTime(0, s0 + sdur * 0.6, sdur * 0.22);
    var lf = ctx.createOscillator(), lg = ctx.createGain(); lf.type = 'square'; lf.frequency.setValueAtTime(48, s0); lf.frequency.linearRampToValueAtTime(14, s0 + sdur); lg.gain.value = 0.35; lf.connect(lg); lg.connect(sgn.gain);
    ng.gain.value = 0.45; sc.connect(sb); nz.connect(ng); ng.connect(sb); sb.connect(sgn); sgn.connect(o);
    sc.start(s0); sc.stop(s0 + sdur + 0.3); lf.start(s0); lf.stop(s0 + sdur + 0.3);
    for (i = 0; i < 6; i++) L.noiseHit(ctx, o, s0 + sdur * rr(0.05, 0.9), { type: 'bandpass', f: rr(2500, 5000), q: 3, d: 0.01, gain: 0.12 });   // chispas
    var st = t + 0.7 + rr(0, 0.15), iv = 0.08, np = 6 + ((rnd() * 2) | 0);                                               // el motor tose y se apaga
    for (i = 0; i < np; i++) {
      var fr = 62 - i * 2.5;
      L.tone(ctx, o, st, { type: 'sawtooth', f0: fr * 1.6, f1: fr, sweep: 0.04, a: 0.002, d: 0.045, gain: 0.3 * (1 - i / (np + 2)) });
      L.noiseHit(ctx, o, st, { type: 'bandpass', f: 1500, q: 1.2, d: 0.03, gain: 0.25 * (1 - i / (np + 2)) });
      L.noiseHit(ctx, o, st, { kind: 'brown', type: 'lowpass', f: 380, d: 0.05, gain: 0.3 * (1 - i / np) });
      st += iv; iv *= rr(1.2, 1.3);
    }
    L.noiseHit(ctx, o, st + 0.05, { type: 'highpass', f: 4000, a: 0.05, d: 0.9, gain: 0.07 });                           // vapor
    L.modal(ctx, o, st + 0.4, { freqs: [rr(1500, 2600), rr(3200, 4600)], decays: [0.08, 0.04], gains: [0.1, 0.06] });   // un tornillo cae
    L.clang(ctx, o, st + 0.8, { f: rr(500, 800), gain: 0.07, decay: 0.2, n: 3 });                                          // chapa que enfría
  };
  R['moto.crash'].cooldown = 0.4; R['moto.crash'].dur = 3.3; R['moto.crash'].wet = 0.26; R['moto.crash'].priority = 5;

  /* --- carretilla: patada, rodar, volcar su carga, sacar una porción --- */
  R['kick.cart'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.35), f = rr(210, 340), i;
    L.tone(ctx, o, t, { f0: vary(150, 0.1), f1: 65, d: 0.13, gain: 0.7 });                                               // la patada
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 500, d: 0.1, gain: 0.5 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(2400, 0.1), q: 1.2, d: 0.02, gain: 0.45 });
    L.clang(ctx, o, t + 0.003, { f: f, gain: 0.55, decay: 0.55 });
    L.clang(ctx, o, t + 0.004, { f: f * 2.4, gain: 0.2, decay: 0.2, n: 4 });
    var sq = ctx.createOscillator(), sg = ctx.createGain(), sb = L.filter(ctx, 'bandpass', 2100, 8), s0 = t + 0.05;      // la rueda chilla un momento
    sq.type = 'sawtooth'; sq.frequency.setValueAtTime(rr(1500, 1850), s0); sq.frequency.linearRampToValueAtTime(rr(1900, 2400), s0 + 0.25);
    sg.gain.setValueAtTime(0.0001, s0); sg.gain.linearRampToValueAtTime(0.16, s0 + 0.04); sg.gain.setTargetAtTime(0, s0 + 0.1, 0.07);
    sq.connect(sb); sb.connect(sg); sg.connect(o); sq.start(s0); sq.stop(s0 + 0.5);
    for (i = 0; i < 8; i++) L.modal(ctx, o, t + 0.04 + i * rr(0.03, 0.07), { freqs: [rr(900, 1900), rr(2200, 3600)], decays: [0.03, 0.015], gains: [0.12 * (1 - i / 9), 0.06] });   // traqueteo
  };
  R['kick.cart'].cooldown = 0.15; R['kick.cart'].dur = 1.0;

  R['cart.roll'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var o = L.bus(ctx, out, 0.3);
    function apply(h, t) {
      var s = spdN(h.data, 240, 0.7), a = Math.pow(s, 0.7);
      h.rg.gain.setTargetAtTime(0.02 + 0.55 * a, t, 0.08); h.lfo.frequency.setTargetAtTime(5 + 11 * s, t, 0.08); h.lb.gain.setTargetAtTime(0.03 + 0.5 * a, t, 0.1);
      h.rb.frequency.setTargetAtTime(700 + 900 * s, t, 0.08);
    }
    return L.loop(ctx, o, {
      data: d,
      setup: function (h) {
        var nr = h.src('white'); h.rb = L.filter(ctx, 'bandpass', 900, 1.1); h.rg = ctx.createGain(); h.rg.gain.value = 0.3; nr.connect(h.rb); h.rb.connect(h.rg); h.rg.connect(h.out);        // ruedas de goma sobre asfalto
        h.lfo = h.osc('sine', 9); var lg = ctx.createGain(); lg.gain.value = 0.18; h.lfo.connect(lg); lg.connect(h.rg.gain);
        var nl = h.src('brown'), ll = L.filter(ctx, 'lowpass', 380, 0.7); h.lb = ctx.createGain(); h.lb.gain.value = 0.3; nl.connect(ll); ll.connect(h.lb); h.lb.connect(h.out);
        h.st.nextSq = h.t0 + rr(0.2, 0.6);
        h.sq = h.osc('sawtooth', 1800); var sb = L.filter(ctx, 'bandpass', 2200, 8); h.sg = ctx.createGain(); h.sg.gain.value = 0; h.sq.connect(sb); sb.connect(h.sg); h.sg.connect(h.out);
        apply(h, h.t0);
      },
      set: function (h) { apply(h, ctx.currentTime); },
      step: function (h, t) {
        var s = spdN(h.data, 240, 0.7);
        apply(h, t);
        if (s > 0.05) {
          if (t >= h.st.nextSq && s > 0.15) {
            var f0 = rr(1500, 1900), gl = rr(0.1, 0.2);
            h.sq.frequency.setValueAtTime(f0, t); h.sq.frequency.linearRampToValueAtTime(f0 * rr(1.2, 1.5), t + gl);
            h.sg.gain.setTargetAtTime(0.18 * s, t, 0.01); h.sg.gain.setTargetAtTime(0, t + gl, 0.02);
            h.st.nextSq = t + rr(0.5, 1.3);
          }
          L.noiseHit(ctx, h.out, t, { kind: 'brown', type: 'lowpass', f: 700, d: 0.03, gain: 0.3 * s });                                       // baches
          if (rnd() < 0.7) L.clang(ctx, h.out, t + rr(0, 0.07), { f: rr(260, 520), gain: 0.09 * s, decay: 0.1, n: 3 });                          // la lata de la canasta
          if (rnd() < 0.6) L.modal(ctx, h.out, t + rr(0, 0.08), { freqs: [rr(900, 1900), rr(2200, 3600)], decays: [0.03, 0.015], gains: [0.12 * s, 0.06 * s] });
        }
        return t + 0.09;
      }
    });
  };
  R['cart.roll'].loop = true; R['cart.roll'].cooldown = 0.2; R['cart.roll'].dur = 1.2;

  R['cart.spill'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.33), i, u, tt;
    L.clang(ctx, o, t, { f: rr(220, 330), gain: 0.55, decay: 0.7 });                                                      // la canasta cae de lado
    L.tone(ctx, o, t, { f0: 120, f1: 50, d: 0.15, gain: 0.55 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 500, d: 0.15, gain: 0.5 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(2400, 0.1), q: 1.1, d: 0.025, gain: 0.45 });
    var nf = 9 + ((rnd() * 6) | 0);
    for (i = 0; i < nf; i++) {                                                                                            // fruta que cae y rebota
      u = Math.pow(rnd(), 1.1); tt = t + 0.05 + 0.85 * u; var fr = rr(90, 170);
      L.tone(ctx, o, tt, { f0: fr * 1.5, f1: fr * 0.6, d: 0.06, gain: 0.3 * (1 - 0.5 * u) });
      L.noiseHit(ctx, o, tt, { kind: 'pink', type: 'bandpass', f: rr(500, 1000), q: 1, d: 0.04, gain: 0.2 * (1 - 0.5 * u) });
      if (rnd() < 0.5) L.tone(ctx, o, tt + rr(0.09, 0.15), { f0: fr * 1.3, f1: fr * 0.7, d: 0.04, gain: 0.12 });      // segundo bote
    }
    for (i = 0; i < 6; i++) {                                                                                             // sencillo que tintinea
      tt = t + 0.12 + 0.8 * Math.pow(rnd(), 1.3); var f = rr(2500, 4600);
      L.modal(ctx, o, tt, { freqs: [f, f * 2.4, f * 3.7], decays: [rr(0.15, 0.35), 0.1, 0.05], gains: [0.1, 0.05, 0.03] });
    }
    for (i = 0; i < 8; i++) L.noiseHit(ctx, o, t + 0.4 + i * (0.05 + i * 0.025), { kind: 'pink', type: 'bandpass', f: rr(300, 700), q: 0.8, a: 0.01, d: 0.07, gain: 0.1 * (1 - i / 9) });   // algo rueda
    L.clang(ctx, o, t + 0.5, { f: rr(500, 800), gain: 0.18, decay: 0.3, n: 4 });
  };
  R['cart.spill'].cooldown = 0.3; R['cart.spill'].dur = 1.7;

  R['grab'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.002, o = L.bus(ctx, out, 0.55);
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: vary(1500, 0.15), q: 0.8, a: 0.012, d: 0.07, gain: 0.35 });   // tela
    L.noiseHit(ctx, o, t + 0.035, { type: 'bandpass', f: vary(2300, 0.1), q: 1.2, d: 0.01, gain: 0.2 });
    L.tone(ctx, o, t + 0.04, { f0: vary(190, 0.1), f1: 100, d: 0.06, gain: 0.35 });                                       // la mano cierra
    L.modal(ctx, o, t + 0.045, { freqs: [vary(520, 0.1), vary(1250, 0.08)], decays: [0.05, 0.025], gains: [0.14, 0.07] });
  };
  R['grab'].cooldown = 0.12; R['grab'].dur = 0.3;

  R['cart.take'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.65), i, tt = t;
    for (i = 0; i < 3; i++) { L.noiseHit(ctx, o, tt, { kind: 'pink', type: 'bandpass', f: vary(2600, 0.2), q: 0.7, a: 0.01, d: rr(0.04, 0.08), gain: 0.3 }); tt += rr(0.05, 0.1); }   // papel y trapo
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 5000, a: 0.02, d: 0.2, gain: 0.1 });
    L.clang(ctx, o, t + 0.04, { f: rr(700, 1100), gain: 0.18, decay: 0.2, n: 3 });                                        // la bandeja
    L.tone(ctx, o, tt + 0.02, { f0: 170, f1: 110, d: 0.05, gain: 0.3 });                                                   // palito sobre la madera
    L.modal(ctx, o, tt + 0.02, { freqs: [vary(430, 0.1), vary(1100, 0.1)], decays: [0.06, 0.03], gains: [0.14, 0.07] });
  };
  R['cart.take'].cooldown = 0.15; R['cart.take'].dur = 0.6;

  /* --- cae la noche: swell grave de metales, aullido lejano y árbol de campanillas --- */
  R['night.fall'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.02, o = L.bus(ctx, out, 0.5), pm = vary(1, 0.015), i, k;
    var lp = L.filter(ctx, 'lowpass', 150, 0.9), env = ctx.createGain(), notes = [[55, 0.55], [110, 0.9], [116.54, 0.5], [164.81, 0.55], [220, 0.28]];   // La1, La2, Sib2 (segunda menor), Mi3, La3
    lp.frequency.setValueAtTime(150, t); lp.frequency.exponentialRampToValueAtTime(1150, t + 3.4); lp.frequency.exponentialRampToValueAtTime(320, t + 7.4);
    L.adsr(env.gain, t, { a: 2.9, d: 2.3, s: 0.55, dur: 5.6, r: 2.0, peak: 0.75 });
    var vb = ctx.createOscillator(), vbg = ctx.createGain(); vb.frequency.value = 4.4; vbg.gain.setValueAtTime(0, t); vbg.gain.linearRampToValueAtTime(11, t + 4); vb.connect(vbg); vb.start(t); vb.stop(t + 8);
    for (i = 0; i < notes.length; i++) for (k = 0; k < 2; k++) {
      var os = ctx.createOscillator(), og = ctx.createGain();
      os.type = 'sawtooth'; os.frequency.value = notes[i][0] * pm; os.detune.value = k ? 8 : -7;
      os.detune.setValueAtTime((k ? 8 : -7) - 70, t); os.detune.linearRampToValueAtTime(k ? 8 : -7, t + 0.9);
      vbg.connect(os.detune); og.gain.value = notes[i][1] * 0.5; os.connect(og); og.connect(lp); os.start(t); os.stop(t + 8);
    }
    lp.connect(env); env.connect(o);
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 420, q: 0.6, a: 3.0, d: 3.6, gain: 0.22 });                                     // viento que sube
    L.tone(ctx, o, t + 2.7, { f0: 70, f1: 34, d: 1.3, a: 0.01, gain: 0.5 });                                                                   // bombo lejano al llegar
    L.noiseHit(ctx, o, t + 2.7, { kind: 'brown', type: 'lowpass', f: 160, d: 1.0, gain: 0.35 });
    var howl = L.filter(ctx, 'lowpass', 2600, 0.5), hg = ctx.createGain(); hg.gain.value = 0.45; howl.connect(hg); hg.connect(o);                // aullido lejano
    var h0 = vary(2.0, 0.12), f = vary(330, 0.08);
    L.voice(ctx, howl, t + h0, { dur: vary(2.4, 0.1), f0: [[0, f * 0.95], [0.18, f * 1.25], [0.5, f * 1.7], [0.82, f * 1.55], [1, f * 1.0]], vowels: [[0, 'u'], [0.3, 'o'], [0.75, 'o'], [1, 'u']],
      amp: [[0, 0], [0.15, 0.9], [0.72, 1], [1, 0]], vib: 0.02, vibHz: 5, breath: 0.3, fscale: 1.1, jitter: 0.015, gain: 0.8 });
    L.voice(ctx, howl, t + h0 + 3.2, { dur: vary(1.8, 0.1), f0: [[0, f * 0.8], [0.25, f * 1.1], [0.6, f * 1.35], [1, f * 0.8]], vowels: [[0, 'u'], [0.5, 'o'], [1, 'u']],       // otro responde
      amp: [[0, 0], [0.2, 0.8], [0.7, 0.9], [1, 0]], vib: 0.02, vibHz: 5.5, breath: 0.3, fscale: 1.05, jitter: 0.015, gain: 0.45 });
    var nb = 11 + ((rnd() * 4) | 0), f0 = vary(1500, 0.05), tt = t + 3.0, up = rnd() < 0.5;                                                     // árbol de campanillas
    for (i = 0; i < nb; i++) {
      var fr = f0 * Math.pow(3.2, (up ? i : nb - 1 - i) / nb) * vary(1, 0.006);
      L.modal(ctx, o, tt, { freqs: [fr, fr * 2.76, fr * 5.4], decays: [1.5, 0.6, 0.3], gains: [0.16, 0.07, 0.035], a: 0.001 });
      tt += rr(0.045, 0.075);
    }
    L.clang(ctx, o, t + 3.4, { f: vary(170, 0.03), gain: 0.28, decay: 2.6, n: 4 });                                                              // campana grave tañida
    tt = t + 5.2;
    for (i = 0; i < 7; i++) { var fr2 = f0 * 0.82 * Math.pow(2.6, (nb - i) / nb) * vary(1, 0.01); L.modal(ctx, o, tt, { freqs: [fr2, fr2 * 2.76], decays: [1.0, 0.4], gains: [0.07, 0.03] }); tt += rr(0.08, 0.14); }
  };
  R['night.fall'].cooldown = 5; R['night.fall'].dur = 8.5; R['night.fall'].wet = 0.4; R['night.fall'].priority = 5;

  /* --- invisibilidad: barrido burbujeante de gaseosa --- */
  function fizz(ctx, o, t, dur, n, rising, L) {
    for (var i = 0; i < n; i++) {
      var u = rnd(), tt = t + 0.02 + dur * 1.05 * (rising ? Math.pow(u, 0.85) : 1 - Math.pow(u, 0.7)), f = rr(900, 3600) * (rising ? 1 + 1.2 * u : 1 + 1.2 * (1 - u));
      L.tone(ctx, o, tt, { f0: f, f1: f * rr(1.25, 1.65), sweep: 0.02, a: 0.001, d: rr(0.015, 0.045), gain: rr(0.05, 0.13) });
      if (rnd() < 0.12) L.noiseHit(ctx, o, tt, { type: 'highpass', f: 6500, d: 0.006, gain: 0.07 });
    }
  }
  function shimmer(ctx, o, t, dur, f0, f1, L) {
    var rat = [1, 1.5, 2.01], gn = [0.12, 0.08, 0.05], k, i, ty = ['sine', 'triangle', 'sine'];
    for (k = 0; k < 3; k++) {
      var os = ctx.createOscillator(), g = ctx.createGain(), lf = ctx.createOscillator(), lg = ctx.createGain(), tr = ctx.createGain();
      os.type = ty[k]; os.frequency.setValueAtTime(f0 * rat[k], t); os.frequency.exponentialRampToValueAtTime(f1 * rat[k], t + dur);
      L.adsr(g.gain, t, { a: dur * 0.3, d: dur * 0.6, s: 0.3, peak: gn[k], dur: dur * 0.9, r: 0.18 });
      tr.gain.value = 0.6; lf.frequency.value = rr(11, 17) * (1 + k * 0.2); lg.gain.value = 0.4; lf.connect(lg); lg.connect(tr.gain);
      os.connect(tr); tr.connect(g); g.connect(o); os.start(t); os.stop(t + dur + 0.4); lf.start(t); lf.stop(t + dur + 0.4);
    }
    for (i = 0; i < 4; i++) L.noiseHit(ctx, o, t + dur * i / 4, { type: 'bandpass', f: vary(f0 * 3 + (f1 * 3 - f0 * 3) * i / 4, 0.1), q: 5, a: 0.01, d: 0.1, gain: 0.05 });
  }
  R['invis.on'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.85), dur = vary(0.85, 0.1), i;
    L.noiseHit(ctx, o, t, { type: 'highpass', f: vary(5500, 0.1), a: 0.004, d: 0.2, gain: 0.5 });                          // pshhh de la tapa
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 7500, q: 0.8, a: 0.01, d: 0.4, gain: 0.25 });
    L.tone(ctx, o, t, { f0: 300, f1: 200, d: 0.03, gain: 0.2 });
    shimmer(ctx, o, t + 0.03, dur, vary(520, 0.1), vary(2600, 0.1), L);
    fizz(ctx, o, t + 0.04, dur, 55 + ((rnd() * 25) | 0), true, L);
    var te = t + dur + 0.05, fs = rr(1800, 2500);
    for (i = 0; i < 3; i++) L.modal(ctx, o, te + i * 0.07, { freqs: [fs * Math.pow(1.26, i), fs * Math.pow(1.26, i) * 2.76], decays: [0.5, 0.2], gains: [0.1, 0.04] });          // brillito final
  };
  R['invis.on'].cooldown = 0.5; R['invis.on'].dur = 1.8; R['invis.on'].wet = 0.3;

  R['invis.off'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.85), dur = vary(0.75, 0.1);
    shimmer(ctx, o, t, dur, vary(2400, 0.1), vary(420, 0.1), L);
    fizz(ctx, o, t, dur, 45 + ((rnd() * 20) | 0), false, L);
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 6000, a: 0.02, d: dur, gain: 0.18 });
    var te = t + dur;
    L.tone(ctx, o, te, { f0: rr(420, 520), f1: 170, sweep: 0.08, d: 0.1, gain: 0.32 });                                     // glup: se cierra
    L.noiseHit(ctx, o, te, { kind: 'pink', type: 'bandpass', f: 700, q: 1.2, a: 0.01, d: 0.1, gain: 0.2 });
    L.modal(ctx, o, te + 0.02, { freqs: [rr(900, 1300), rr(2200, 3000)], decays: [0.08, 0.04], gains: [0.1, 0.05] });
  };
  R['invis.off'].cooldown = 0.5; R['invis.off'].dur = 1.6; R['invis.off'].wet = 0.28;

  /* --- le cayó mal: gruñido de panza y un eructo --- */
  R['item.sick'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.28), D = vary(1.15, 0.15), i;
    L.voice(ctx, o, t, { dur: D, f0: [[0, 70], [0.25, 98], [0.55, 58], [0.8, 82], [1, 50]], vowels: [[0, 'uh'], [0.5, 'o'], [1, 'uh']], amp: [[0, 0], [0.1, 0.7], [0.35, 1], [0.6, 0.6], [0.85, 0.9], [1, 0]],
      fscale: 0.7, bw: 2.2, breath: 0.25, rasp: 0.6, raspHz: vary(22, 0.2), gargle: 0.7, gargleHz: vary(11, 0.2), jitter: 0.05, gain: 2.6, drive: 0.2 });
    var ng = 9 + ((rnd() * 6) | 0);
    for (i = 0; i < ng; i++) {                                                                                              // gorgoteos
      var tt = t + rr(0, D);
      L.tone(ctx, o, tt, { f0: rr(120, 260), f1: rr(300, 720), sweep: 0.05, a: 0.004, d: rr(0.04, 0.09), gain: rr(0.07, 0.16) });
      L.noiseHit(ctx, o, tt, { kind: 'pink', type: 'bandpass', f: rr(400, 700), q: 1.5, d: 0.05, gain: 0.08 });
    }
    var tb = t + D + rr(0.12, 0.25), bd = vary(0.5, 0.2), f = vary(62, 0.15);                                               // el eructo
    L.voice(ctx, o, tb, { dur: bd, f0: [[0, f * 1.4], [0.2, f * 1.7], [0.6, f * 1.1], [1, f * 0.8]], vowels: [[0, 'uh'], [0.3, 'a'], [0.7, 'o'], [1, 'uh']], amp: [[0, 0], [0.06, 1], [0.5, 0.85], [1, 0]],
      fscale: 0.85, bw: 1.8, breath: 0.55, rasp: 0.8, raspHz: vary(48, 0.1), gargle: 0.35, gargleHz: 20, jitter: 0.05, gain: 3.0, drive: 0.35 });
    L.tone(ctx, o, tb + bd * 0.9, { f0: 230, f1: 110, sweep: 0.05, d: 0.07, gain: 0.25 });                                   // blup final
    L.noiseHit(ctx, o, tb, { kind: 'pink', type: 'bandpass', f: 600, q: 0.9, a: 0.01, d: 0.18, gain: 0.2 });
  };
  R['item.sick'].cooldown = 0.6; R['item.sick'].dur = 2.1;

  /* --- genéricos para ids nuevos (nivel 2: throw.tele, hit.escoba…) ---
     motor.js resuelve `throw.<id>` y `hit.<id>` sin receta propia a `throw.generic` / `hit.generic`; los ids de v0.8 tienen su receta. */
  R['throw.generic'] = function (ctx, out, d, L) {                                              // «fuuu» de algo pesado que sale volando + traqueteo
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.004, dur = vary(0.26, 0.15), o = L.bus(ctx, out, 0.3), i;
    var src = L.noiseSrc(ctx, 'pink', t, dur + 0.1), bp = L.filter(ctx, 'bandpass', 400, 0.9), g = ctx.createGain();
    bp.frequency.setValueAtTime(vary(380, 0.1), t); bp.frequency.exponentialRampToValueAtTime(vary(1400, 0.1), t + dur * 0.45); bp.frequency.exponentialRampToValueAtTime(vary(600, 0.1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(3.2, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(o);
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 500, d: 0.06, gain: 0.35 });                                  // el empujón
    for (i = 0; i < 4; i++) L.modal(ctx, o, t + 0.03 + i * rr(0.04, 0.09), { freqs: [rr(700, 1800), rr(2400, 3800)], decays: [0.04, 0.02], gains: [0.1 * (1 - i / 5), 0.05] });
  };
  R['throw.generic'].cooldown = 0.12; R['throw.generic'].dur = 0.6;

  R['hit.generic'] = function (ctx, out, d, L) {                                                // objeto lanzado que pega en un cuerpo: golpe seco y un tintineo
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.4), f = vary(240, 0.12);
    L.tone(ctx, o, t, { f0: vary(160, 0.1), f1: 60, d: 0.12, gain: 0.75 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 520, d: 0.1, gain: 0.55 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(1800, 0.12), q: 1.1, d: 0.03, gain: 0.4 });
    L.modal(ctx, o, t, { freqs: [f, f * 2.3, f * 4.1], decays: [0.1, 0.05, 0.025], gains: [0.3, 0.18, 0.1] });
  };
  R['hit.generic'].cooldown = 0.05; R['hit.generic'].dur = 0.6;

  R['hit.skate'] = function (ctx, out, d, L) { return R['skate.hit'](ctx, out, d, L); };         // skate lanzado: la tabla
  R['hit.skate'].cooldown = 0.05; R['hit.skate'].dur = 0.7;

  R['hit.bici'] = function (ctx, out, d, L) {                                                   // bici lanzada: cuadro de fierro y rayos
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.4), f = rr(260, 420), i;
    L.tone(ctx, o, t, { f0: vary(170, 0.1), f1: 62, d: 0.13, gain: 0.75 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 550, d: 0.1, gain: 0.5 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(2600, 0.1), q: 1.2, d: 0.02, gain: 0.45 });
    L.clang(ctx, o, t + 0.003, { f: f, gain: 0.5, decay: 0.45 });
    L.clang(ctx, o, t + 0.005, { f: f * 2.2, gain: 0.2, decay: 0.2, n: 4 });
    for (i = 0; i < 3; i++) L.bell(ctx, o, t + 0.03 + i * rr(0.05, 0.1), { f: rr(2250, 2500), gain: 0.2 * (1 - i * 0.25), decay: 0.3 });          // timbre
    for (i = 0; i < 8; i++) L.noiseHit(ctx, o, t + 0.05 + i * (0.02 + i * 0.008), { type: 'bandpass', f: 4200, q: 5, d: 0.004, gain: 0.16 * (1 - i / 9) });   // rayos
  };
  R['hit.bici'].cooldown = 0.05; R['hit.bici'].dur = 0.8;

  R['hit.moto'] = function (ctx, out, d, L) {                                                   // moto contra un zombi: chapa y golpe pesado
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.45), f = rr(150, 230), i;
    L.tone(ctx, o, t, { f0: vary(130, 0.1), f1: 46, d: 0.2, gain: 0.9 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 420, d: 0.16, gain: 0.7 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(1500, 0.1), q: 1.0, d: 0.04, gain: 0.5 });
    L.clang(ctx, o, t + 0.004, { f: f, gain: 0.6, decay: 0.5 });
    L.clang(ctx, o, t + 0.006, { f: f * 3.1, gain: 0.22, decay: 0.2, n: 4 });
    for (i = 0; i < 5; i++) L.noiseHit(ctx, o, t + 0.05 + i * rr(0.02, 0.05), { type: 'bandpass', f: rr(1800, 3600), q: 3, d: 0.02, gain: 0.12 * (1 - i / 6) });
  };
  R['hit.moto'].cooldown = 0.05; R['hit.moto'].dur = 0.8;

  R['hit.carretilla'] = function (ctx, out, d, L) { return R['kick.cart'](ctx, out, d, L); };   // carretilla pateada que pega: golpe, chirrido y traqueteo
  R['hit.carretilla'].cooldown = 0.08; R['hit.carretilla'].dur = 1.0;


  /* =====================================================================================================
     v0.9 — NIVEL 2: EL CERRO (H6)
     jump, land, carretilla.warn/roll(loop)/crash/jumped, gallinazo.screech/flap/peck/hit/fall, senora.yell, balde.windup/splash, olla.windup/clong/parry,
     escoba.swing/hit/break, molotov.light/throw/break, fire.whoosh/fire.loop(loop)/fire.out, zombie.burn, tele.crash, throw.tele, fridge.hit/open,
     chicken.cluck/flee, wind.dust, radio.cumbia (loop).
     Loops con datos: carretilla.roll {speed px/s | 0..1, ref 170}, fire.loop {intensity 0..1}, radio.cumbia {intensity 0..1}.
     ===================================================================================================== */

  /* --- Alexander salta y cae (tierra seca de cerro) --- */
  R.jump = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.52);
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 650, d: 0.07, gain: 0.5 });                                   // el empujón de la sandalia en la tierra
    L.noiseHit(ctx, o, t + 0.015, { type: 'bandpass', f: 800, f1: 2600, q: 0.9, a: 0.025, d: 0.14, gain: 0.5 });             // aire y ropa
    L.tone(ctx, o, t, { type: 'triangle', f0: 125, f1: 215, sweep: 0.12, d: 0.13, gain: 0.2 });                                // el esfuerzo
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(3400, 0.1), q: 1.5, d: 0.012, gain: 0.28 });                           // arenita que sale disparada
  };
  R.jump.cooldown = 0.15; R.jump.dur = 0.4;

  R.land = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.75), k = d.hard ? 1.3 : 1, i;
    L.tone(ctx, o, t, { f0: vary(135, 0.08), f1: 48, d: 0.14, gain: 0.75 * k });                                              // el cuerpo contra el suelo
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 560, d: 0.11, gain: 0.55 * k });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(1500, 0.1), q: 1, d: 0.06, gain: 0.3 });                                // polvo
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 3500, d: 0.02, gain: 0.16 });                                                // la sandalia
    for (i = 0; i < 5; i++) L.noiseHit(ctx, o, t + 0.02 + i * rr(0.012, 0.03), { type: 'bandpass', f: rr(1800, 4200), q: 3, d: 0.015, gain: 0.12 });   // gravilla
  };
  R.land.cooldown = 0.1; R.land.dur = 0.45;

  /* --- carretilla que baja del cerro --- */
  // aviso (1,5 s): retumbo que crece, traqueteo de tablas que se acelera, rueda que chilla
  R['carretilla.warn'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, D = vary(1.5, 0.04), o = L.bus(ctx, out, 0.36), tt = t, iv, u, a;
    var rb = L.noiseSrc(ctx, 'brown', t, D + 0.3), rl = L.filter(ctx, 'lowpass', 150, 0.8), rg = ctx.createGain();
    rl.frequency.setValueAtTime(150, t); rl.frequency.exponentialRampToValueAtTime(950, t + D);
    rg.gain.setValueAtTime(0.0001, t); rg.gain.exponentialRampToValueAtTime(1.1, t + D); rg.gain.setTargetAtTime(0, t + D + 0.04, 0.06);
    rb.connect(rl); rl.connect(rg); rg.connect(o);
    var pb = L.noiseSrc(ctx, 'pink', t, D + 0.3), pf = L.filter(ctx, 'bandpass', 650, 0.9), pg = ctx.createGain();           // ruedas de madera sobre tierra
    pf.frequency.setValueAtTime(650, t); pf.frequency.exponentialRampToValueAtTime(1700, t + D);
    pg.gain.setValueAtTime(0.0001, t); pg.gain.exponentialRampToValueAtTime(0.7, t + D); pg.gain.setTargetAtTime(0, t + D + 0.04, 0.06);
    pb.connect(pf); pf.connect(pg); pg.connect(o);
    iv = 0.14;
    while (tt < t + D) {                                                                                                       // traqueteo que se acelera
      u = (tt - t) / D; a = 0.1 + 0.9 * u * u;
      woodHit(ctx, o, tt, rr(300, 900), 0.34 * a, L);
      L.noiseHit(ctx, o, tt, { kind: 'brown', type: 'lowpass', f: 700, d: 0.035, gain: 0.35 * a });
      if (rnd() < 0.5) L.clang(ctx, o, tt + rr(0, 0.03), { f: rr(260, 520), gain: 0.14 * a, decay: 0.1, n: 3 });
      iv = (0.14 - 0.095 * u) * vary(1, 0.2); tt += Math.max(0.04, iv);
    }
    var sq = ctx.createOscillator(), sg = ctx.createGain(), sb = L.filter(ctx, 'bandpass', 2100, 7), s0 = t + D * 0.35;     // chirrido de rueda sin grasa
    sq.type = 'sawtooth'; sq.frequency.setValueAtTime(1500, s0); sq.frequency.linearRampToValueAtTime(2600, t + D);
    sg.gain.setValueAtTime(0.0001, s0); sg.gain.linearRampToValueAtTime(0.2, t + D * 0.95); sg.gain.setTargetAtTime(0, t + D + 0.02, 0.05);
    sq.connect(sb); sb.connect(sg); sg.connect(o); sq.start(s0); sq.stop(t + D + 0.4);
  };
  R['carretilla.warn'].cooldown = 1; R['carretilla.warn'].dur = 1.9; R['carretilla.warn'].priority = 5;

  // bucle: ruedas de madera sobre tierra apisonada, tablas sueltas, lata que golpea, chirrido; {speed} px/s (ref 170) o 0..1
  R['carretilla.roll'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var o = L.bus(ctx, out, 0.3);
    function apply(h, t) {
      var s = spdN(h.data, 170, 0.6), a = Math.pow(s, 0.7);
      h.rg.gain.setTargetAtTime(0.04 + 0.62 * a, t, 0.1); h.rb.frequency.setTargetAtTime(500 + 1100 * s, t, 0.1);
      h.lfo.frequency.setTargetAtTime(4 + 19 * s, t, 0.1); h.lb.gain.setTargetAtTime(0.05 + 0.6 * a, t, 0.1); h.hg.gain.setTargetAtTime(0.004 + 0.06 * a, t, 0.1);
    }
    return L.loop(ctx, o, {
      data: d,
      setup: function (h) {
        var nr = h.src('pink'); h.rb = L.filter(ctx, 'bandpass', 800, 0.9); h.rg = ctx.createGain(); h.rg.gain.value = 0.2; nr.connect(h.rb); h.rb.connect(h.rg); h.rg.connect(h.out);   // madera sobre tierra
        h.lfo = h.osc('sine', 8); var lg = ctx.createGain(); lg.gain.value = 0.3; h.lfo.connect(lg); lg.connect(h.rg.gain);                                                     // vuelta de la rueda
        var nl = h.src('brown'), ll = L.filter(ctx, 'lowpass', 300, 0.7); h.lb = ctx.createGain(); h.lb.gain.value = 0.2; nl.connect(ll); ll.connect(h.lb); h.lb.connect(h.out);
        var nh = h.src('white'), hh = L.filter(ctx, 'highpass', 3800, 0.7); h.hg = ctx.createGain(); h.hg.gain.value = 0.01; nh.connect(hh); hh.connect(h.hg); h.hg.connect(h.out);     // gravilla
        h.st.nextSq = h.t0 + rr(0.3, 0.9);
        h.sq = h.osc('sawtooth', 1500); var sb = L.filter(ctx, 'bandpass', 2000, 8); h.sg = ctx.createGain(); h.sg.gain.value = 0; h.sq.connect(sb); sb.connect(h.sg); h.sg.connect(h.out);
        apply(h, h.t0);
      },
      set: function (h) { apply(h, ctx.currentTime); },
      step: function (h, t) {
        var s = spdN(h.data, 170, 0.6);
        apply(h, t);
        if (s > 0.05) {
          if (t >= h.st.nextSq && s > 0.2) {
            var f0 = rr(1400, 1900), gl = rr(0.12, 0.25);
            h.sq.frequency.setValueAtTime(f0, t); h.sq.frequency.linearRampToValueAtTime(f0 * rr(1.2, 1.6), t + gl);
            h.sg.gain.setTargetAtTime(0.2 * s, t, 0.01); h.sg.gain.setTargetAtTime(0, t + gl, 0.025);
            h.st.nextSq = t + rr(0.45, 1.2);
          }
          L.noiseHit(ctx, h.out, t, { kind: 'brown', type: 'lowpass', f: 650, d: 0.035, gain: 0.42 * s });                       // baches
          if (rnd() < 0.8 * s) woodHit(ctx, h.out, t + rr(0, 0.06), rr(300, 800), 0.2 * s, L);                                     // tabla suelta
          if (rnd() < 0.5 * s) L.clang(ctx, h.out, t + rr(0, 0.07), { f: rr(240, 520), gain: 0.1 * s, decay: 0.1, n: 3 });          // lata
        }
        return t + 0.075;
      }
    });
  };
  R['carretilla.roll'].loop = true; R['carretilla.roll'].cooldown = 0.2; R['carretilla.roll'].dur = 1.4; R['carretilla.roll'].priority = 3;

  // choque al final del carril: madera que revienta, rueda que sale girando, tablas y lata, polvo
  R['carretilla.crash'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.56), i, tt, u;
    L.tone(ctx, o, t, { f0: 120, f1: 40, d: 0.32, gain: 1.0 });                                                                // el golpe contra la pirca
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 380, d: 0.35, gain: 0.9 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(1900, 0.1), q: 0.9, d: 0.06, gain: 0.7 });
    woodHit(ctx, o, t, vary(240, 0.1), 0.9, L); woodHit(ctx, o, t + 0.012, vary(430, 0.1), 0.6, L);                              // revienta el bastidor
    for (i = 0; i < 9; i++) woodHit(ctx, o, t + 0.03 + Math.pow(rnd(), 1.4) * 0.6, rr(260, 1300), 0.32 * (1 - i / 11), L);      // astillas y tablas
    L.clang(ctx, o, t + 0.04, { f: rr(220, 330), gain: 0.45, decay: 0.6 });                                                     // la lata de la carga
    L.clang(ctx, o, t + 0.3, { f: rr(500, 800), gain: 0.16, decay: 0.3, n: 4 });
    var st = t + 0.18, iv = 0.05;                                                                                              // una rueda sale girando y se apaga
    for (i = 0; i < 11; i++) { L.noiseHit(ctx, o, st, { kind: 'brown', type: 'lowpass', f: 600, d: 0.03, gain: 0.28 * (1 - i / 12) }); L.modal(ctx, o, st, { freqs: [rr(900, 1700)], decays: [0.02], gains: [0.12 * (1 - i / 12)] }); st += iv; iv *= 1.16; }
    var sq = ctx.createOscillator(), sg = ctx.createGain(), sb = L.filter(ctx, 'bandpass', 2000, 7), s0 = t + 0.12;
    sq.type = 'sawtooth'; sq.frequency.setValueAtTime(2600, s0); sq.frequency.exponentialRampToValueAtTime(900, s0 + 0.5);
    sg.gain.setValueAtTime(0.0001, s0); sg.gain.linearRampToValueAtTime(0.14, s0 + 0.04); sg.gain.setTargetAtTime(0, s0 + 0.15, 0.1);
    sq.connect(sb); sb.connect(sg); sg.connect(o); sq.start(s0); sq.stop(s0 + 0.8);
    L.noiseHit(ctx, o, t + 0.05, { kind: 'pink', type: 'bandpass', f: 1400, q: 0.5, a: 0.04, d: 0.9, gain: 0.22 });             // polvareda
    for (i = 0; i < 6; i++) { tt = t + 0.5 + i * (0.07 + i * 0.03); L.noiseHit(ctx, o, tt, { kind: 'pink', type: 'bandpass', f: rr(300, 800), q: 0.8, a: 0.01, d: 0.07, gain: 0.1 * (1 - i / 7) }); }
  };
  R['carretilla.crash'].cooldown = 0.5; R['carretilla.crash'].dur = 2.0; R['carretilla.crash'].wet = 0.26; R['carretilla.crash'].priority = 5;

  // la saltaste: la carretilla pasa por debajo (barrido + traqueteo que se aleja) y un adorno brillante de guitarra
  R['carretilla.jumped'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.42), D = 0.8, i, tt;
    var src = L.noiseSrc(ctx, 'pink', t, D + 0.1), bp = L.filter(ctx, 'bandpass', 700, 0.9), g = ctx.createGain();
    bp.frequency.setValueAtTime(900, t); bp.frequency.exponentialRampToValueAtTime(320, t + D);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(2.6, t + 0.12); g.gain.exponentialRampToValueAtTime(0.001, t + D);
    src.connect(bp); bp.connect(g); g.connect(o);
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 300, a: 0.05, d: 0.6, gain: 0.5 });
    tt = t; for (i = 0; i < 9; i++) { woodHit(ctx, o, tt, rr(300, 900), 0.2 * (1 - i / 10), L); tt += 0.045 + i * 0.012; }
    [76, 81, 84].forEach(function (m, k) { L.pluck(ctx, o, mtof(m), t + 0.16 + k * 0.065, { decay: 0.5, bright: 0.85, vel: 0.42 - k * 0.04, dur: 0.7 }); });   // ¡olé!: Mi–La–Do
    L.modal(ctx, o, t + 0.34, { freqs: [mtof(88), mtof(88) * 2.01], decays: [0.3, 0.12], gains: [0.1, 0.04], a: 0.002 });
  };
  R['carretilla.jumped'].cooldown = 0.5; R['carretilla.jumped'].dur = 1.3; R['carretilla.jumped'].wet = 0.3;

  /* --- gallinazos --- */
  R['gallinazo.screech'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.24), D = vary(0.75, 0.08), pm = vary(1, 0.07);
    L.voice(ctx, o, t, { dur: D, f0: L.norm([[0, 760], [0.08, 1250], [0.35, 1750], [0.6, 1500], [0.85, 1750], [1.0, 1000]].map(function (k) { return [k[0] * D, k[1] * pm]; }), D),
      vowels: [[0, 'ae'], [0.3, 'ee'], [0.7, 'ae'], [1, 'uh']], amp: [[0, 0], [0.05, 1], [0.4, 0.95], [0.8, 0.7], [1, 0]], fscale: 1.1, bw: 1.6, breath: 0.65, rasp: 0.8, raspHz: 72,
      gargle: 0.3, gargleHz: 24, jitter: 0.03, drive: 0.6, gain: 2.4 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 3200, q: 0.8, a: 0.01, d: 0.12, gain: 0.3 });
    L.noiseHit(ctx, o, t + D * 0.7, { type: 'highpass', f: 4500, a: 0.02, d: 0.14, gain: 0.18 });
  };
  R['gallinazo.screech'].cooldown = 0.5; R['gallinazo.screech'].dur = 1.0; R['gallinazo.screech'].priority = 4;

  R['gallinazo.flap'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.52), ts = [0, vary(0.2, 0.15)], i;
    ts.push(ts[1] + vary(0.21, 0.15)); ts.push(ts[2] + vary(0.23, 0.15));
    L.flaps(ctx, o, t, ts, { gain: 0.7, pitch: 0.75, low: 0.55 });                                                              // alas grandes y lentas
    for (i = 0; i < ts.length; i++) L.noiseHit(ctx, o, t + ts[i] + 0.02, { kind: 'pink', type: 'bandpass', f: 900, q: 0.6, a: 0.06, d: 0.12, gain: 0.2 });   // el aire que empujan
  };
  R['gallinazo.flap'].cooldown = 0.35; R['gallinazo.flap'].dur = 1.0;

  R['gallinazo.peck'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.95);
    L.tone(ctx, o, t, { f0: 210, f1: 85, d: 0.06, gain: 0.5 });                                                                 // el pico en la carne
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(2600, 0.1), q: 1.6, d: 0.012, gain: 0.7 });
    L.modal(ctx, o, t, { freqs: [vary(1100, 0.08), vary(2500, 0.08)], decays: [0.025, 0.012], gains: [0.3, 0.15] });
    L.noiseHit(ctx, o, t + 0.015, { type: 'highpass', f: 5000, a: 0.01, d: 0.09, gain: 0.12 });                                  // plumas
  };
  R['gallinazo.peck'].cooldown = 0.1; R['gallinazo.peck'].dur = 0.35;

  R['gallinazo.hit'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.32), i;
    L.tone(ctx, o, t, { f0: 170, f1: 60, d: 0.1, gain: 0.7 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 700, d: 0.08, gain: 0.55 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(2400, 0.1), q: 1.1, d: 0.02, gain: 0.45 });
    for (i = 0; i < 5; i++) L.noiseHit(ctx, o, t + 0.01 + i * rr(0.02, 0.05), { type: 'highpass', f: rr(3500, 6000), a: 0.01, d: 0.08, gain: 0.12 });    // lluvia de plumas
    L.voice(ctx, o, t + 0.02, { dur: 0.3, f0: [[0, 800], [0.2, 1150], [1, 650]], vowels: [[0, 'ae'], [1, 'uh']], amp: [[0, 0], [0.08, 1], [0.7, 0.6], [1, 0]], fscale: 1.1, bw: 1.5, breath: 0.5, rasp: 0.7, raspHz: 60, drive: 0.5, gain: 2 });
  };
  R['gallinazo.hit'].cooldown = 0.08; R['gallinazo.hit'].dur = 0.7;

  R['gallinazo.fall'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.28), D = 0.85, i, u, tt;
    L.voice(ctx, o, t, { dur: D, f0: [[0, 1250], [0.25, 1000], [1, 280]], vowels: [[0, 'ae'], [0.5, 'uh'], [1, 'o']], amp: [[0, 0], [0.06, 1], [0.6, 0.8], [1, 0]], fscale: 1.05, bw: 1.6, breath: 0.5,
      rasp: 0.7, raspHz: 45, vib: 0.05, vibHz: 11, jitter: 0.04, drive: 0.5, gain: 2.1 });
    tt = t; for (i = 0; i < 6; i++) { L.flaps(ctx, o, tt, [0], { gain: 0.55 * (1 - i / 7), pitch: 1 - i * 0.05 }); tt += 0.07 + i * 0.045; }          // aleteo desordenado
    for (i = 0; i < 7; i++) L.noiseHit(ctx, o, t + 0.1 + i * 0.1, { type: 'highpass', f: rr(3500, 6000), a: 0.01, d: 0.1, gain: 0.1 });
    tt = t + 1.0;                                                                                                              // cae al suelo
    L.tone(ctx, o, tt, { f0: 100, f1: 42, d: 0.14, gain: 0.7 });
    L.noiseHit(ctx, o, tt, { kind: 'brown', type: 'lowpass', f: 450, d: 0.12, gain: 0.55 });
    L.noiseHit(ctx, o, tt, { type: 'bandpass', f: 1500, q: 0.8, d: 0.05, gain: 0.25 });
  };
  R['gallinazo.fall'].cooldown = 0.4; R['gallinazo.fall'].dur = 1.6;

  /* --- señoras zombie --- */
  // grito de regaño con formantes: sílabas [dur, Hz ini, Hz fin, vocal, ruido], sin palabras reales (cadencia de «¡FUE-ra de mi PUER-ta!»)
  var SYL = [
    [[0.14, 330, 420, 'e'], [0.2, 520, 450, 'a'], [0.07, 400, 340, 'e'], [0.07, 380, 330, 'i'], [0.2, 520, 400, 'o'], [0.34, 470, 270, 'a']],
    [[0.1, 360, 400, 'a'], [0.1, 430, 520, 'e'], [0.26, 580, 460, 'a'], [0.08, 400, 350, 'o'], [0.08, 380, 340, 'e'], [0.3, 520, 300, 'o']],
    [[0.18, 300, 470, 'a'], [0.1, 480, 420, 'i'], [0.1, 420, 380, 'e'], [0.22, 560, 480, 'e'], [0.1, 420, 360, 'a'], [0.32, 500, 250, 'a']]
  ];
  R['senora.yell'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.008, o = L.bus(ctx, out, 0.17), pat = SYL[(typeof d.v === 'number' ? d.v : (rnd() * SYL.length)) % SYL.length | 0], pm = vary(1, 0.08), tt = t, i, s, last;
    for (i = 0; i < pat.length; i++) {
      s = pat[i]; last = i === pat.length - 1;
      if (i % 2 === 0 || rnd() < 0.4) L.noiseHit(ctx, o, tt, { type: 'bandpass', f: rr(2500, 5200), q: 0.9, a: 0.004, d: 0.022, gain: 0.2 });          // consonante
      L.voice(ctx, o, tt, { dur: s[0], f0: [[0, s[1] * pm], [1, s[2] * pm]], vowels: [[0, s[3]], [0.6, s[3]], [1, last ? 'o' : s[3]]], amp: [[0, 0], [0.12, 1], [0.8, 0.9], [1, last ? 0 : 0.35]],
        fscale: 1.18, bw: 1.2, breath: 0.22, rasp: 0.32, raspHz: 55, vib: last ? 0.015 : 0.006, vibHz: 6.2, jitter: 0.03, drive: 0.45, gain: 2.8 });
      tt += s[0] * 0.96;
    }
    L.noiseHit(ctx, o, tt - 0.05, { type: 'highpass', f: 4000, a: 0.02, d: 0.18, gain: 0.1 });                                  // el resuello final
  };
  R['senora.yell'].cooldown = 0.6; R['senora.yell'].dur = 1.2; R['senora.yell'].priority = 4;

  R['balde.windup'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.45), i;
    for (i = 0; i < 3; i++) L.noiseHit(ctx, o, t + i * 0.13, { kind: 'pink', type: 'bandpass', f: rr(450, 800), q: 1.4, a: 0.04, d: 0.12, gain: 0.5 });   // el agua se mece dentro
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 400, a: 0.2, d: 0.35, gain: 0.3 });                              // el balde pesado
    var sq = ctx.createOscillator(), sg = ctx.createGain(), sb = L.filter(ctx, 'bandpass', 1300, 8), s0 = t + 0.05;               // plástico que cruje
    sq.type = 'sawtooth'; sq.frequency.setValueAtTime(900, s0); sq.frequency.linearRampToValueAtTime(1500, s0 + 0.3);
    sg.gain.setValueAtTime(0.0001, s0); sg.gain.linearRampToValueAtTime(0.1, s0 + 0.08); sg.gain.setTargetAtTime(0, s0 + 0.2, 0.06);
    sq.connect(sb); sb.connect(sg); sg.connect(o); sq.start(s0); sq.stop(s0 + 0.6);
    L.modal(ctx, o, t + 0.02, { freqs: [2100, 3200], decays: [0.06, 0.03], gains: [0.12, 0.07] });                             // el asa
    L.modal(ctx, o, t + 0.31, { freqs: [2150, 3300], decays: [0.05, 0.025], gains: [0.09, 0.05] });
    for (i = 0; i < 4; i++) L.tone(ctx, o, t + 0.1 + i * 0.1, { f0: rr(900, 1600), f1: rr(1700, 2600), d: 0.03, gain: 0.05 });  // gotitas que saltan
  };
  R['balde.windup'].cooldown = 0.3; R['balde.windup'].dur = 0.75;

  R['balde.splash'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.54), i, u, f;
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 1500, f1: 900, q: 0.5, a: 0.006, d: 0.38, gain: 0.95 });         // el agua sale volando
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 650, a: 0.02, d: 0.4, gain: 0.7 });
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 4200, a: 0.004, d: 0.18, gain: 0.25 });
    L.tone(ctx, o, t + 0.12, { f0: 150, f1: 70, d: 0.1, gain: 0.45 });                                                          // chancho de agua en el suelo
    L.noiseHit(ctx, o, t + 0.12, { type: 'bandpass', f: 800, q: 0.9, d: 0.14, gain: 0.55 });
    for (i = 0; i < 16; i++) {                                                                                                 // goterío y burbujas
      u = Math.pow(rnd(), 1.4); f = rr(900, 2600);
      L.tone(ctx, o, t + 0.1 + u * 0.95, { f0: f, f1: f * rr(1.4, 1.9), sweep: 0.025, d: 0.035, gain: 0.12 * (1 - 0.6 * u) });
    }
    L.noiseHit(ctx, o, t + 0.25, { kind: 'pink', type: 'bandpass', f: 1100, q: 0.6, a: 0.05, d: 0.5, gain: 0.14 });             // charco que se esparce
  };
  R['balde.splash'].cooldown = 0.25; R['balde.splash'].dur = 1.4; R['balde.splash'].wet = 0.22; R['balde.splash'].priority = 4;

  R['olla.windup'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.37), i;
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 2200, f1: 5200, q: 4, a: 0.18, d: 0.27, gain: 0.35 });                           // metal que se arrastra: aviso brillante que sube
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 500, a: 0.1, d: 0.25, gain: 0.25 });                              // tela y brazo
    for (i = 0; i < 4; i++) L.clang(ctx, o, t + 0.04 + i * 0.09, { f: rr(700, 1000), gain: 0.1 + i * 0.02, decay: 0.12, n: 3 });  // la tapa tintinea
    L.modal(ctx, o, t + 0.42, { freqs: [1480, 2200], decays: [0.18, 0.09], gains: [0.14, 0.08] });                               // la olla llega arriba: brillo
  };
  R['olla.windup'].cooldown = 0.3; R['olla.windup'].dur = 0.8;

  R['olla.clong'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.6), f = vary(235, 0.06);
    L.tone(ctx, o, t, { f0: f * 1.2, f1: f * 0.55, d: 0.12, gain: 0.75 });                                                       // golpe hueco
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(2200, 0.1), q: 1.1, d: 0.025, gain: 0.7 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 600, d: 0.1, gain: 0.5 });
    L.modal(ctx, o, t, { freqs: [f, f * 2.32, f * 4.04, f * 6.1, f * 8.3], decays: [0.9, 0.55, 0.3, 0.18, 0.1], gains: [0.9, 0.7, 0.45, 0.25, 0.14], a: 0.0006 });   // ¡CLONG!
    L.modal(ctx, o, t, { freqs: [f * 1.01, f * 2.33], decays: [0.7, 0.35], gains: [0.4, 0.25], a: 0.0008 });                       // batido de la pared fina
    L.clang(ctx, o, t + 0.002, { f: f * 3.3, gain: 0.3, decay: 0.3, n: 5 });
    L.clang(ctx, o, t + 0.18, { f: vary(1100, 0.08), gain: 0.08, decay: 0.12, n: 3 });                                           // la tapa rebota
  };
  R['olla.clong'].cooldown = 0.15; R['olla.clong'].dur = 1.5; R['olla.clong'].wet = 0.24; R['olla.clong'].priority = 5;

  R['olla.parry'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.64), f = vary(520, 0.06), i, tt;
    L.tone(ctx, o, t, { f0: 330, f1: 120, d: 0.07, gain: 0.55 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(3000, 0.1), q: 1.2, d: 0.015, gain: 0.55 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 700, d: 0.06, gain: 0.4 });
    L.clang(ctx, o, t, { f: f, gain: 0.6, decay: 0.35 });                                                                         // «¡CLONG!» seco, más agudo: la olla se interrumpe
    L.clang(ctx, o, t + 0.002, { f: f * 2.4, gain: 0.25, decay: 0.15, n: 4 });
    tt = t + 0.09; for (i = 0; i < 6; i++) { L.modal(ctx, o, tt, { freqs: [rr(1300, 2000), rr(3000, 4400)], decays: [0.05, 0.02], gains: [0.16 * (1 - i / 7), 0.08 * (1 - i / 7)] }); tt += 0.05 * Math.pow(0.82, i) + 0.02; }   // la tapa rueda y se asienta
  };
  R['olla.parry'].cooldown = 0.15; R['olla.parry'].dur = 0.9; R['olla.parry'].priority = 4;

  /* --- escoba --- */
  R['escoba.swing'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.28), D = vary(0.42, 0.06);
    var src = L.noiseSrc(ctx, 'pink', t, D + 0.1), bp = L.filter(ctx, 'bandpass', 500, 1.1), g = ctx.createGain();                 // giro de 360°: dos pasadas de cerdas (el palo pasa por tu lado y por el otro)
    bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(2300, t + D * 0.25); bp.frequency.exponentialRampToValueAtTime(700, t + D * 0.5);
    bp.frequency.exponentialRampToValueAtTime(2000, t + D * 0.75); bp.frequency.exponentialRampToValueAtTime(600, t + D);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(3.0, t + D * 0.22); g.gain.linearRampToValueAtTime(1.1, t + D * 0.5);
    g.gain.linearRampToValueAtTime(3.2, t + D * 0.74); g.gain.exponentialRampToValueAtTime(0.001, t + D);
    src.connect(bp); bp.connect(g); g.connect(o);
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 4500, a: 0.1, d: D * 0.8, gain: 0.14 });                                       // siseo de las cerdas
    L.tone(ctx, o, t, { type: 'triangle', f0: 180, f1: 420, sweep: D * 0.4, a: 0.05, d: D * 0.6, gain: 0.07 });                  // el palo corta el aire
  };
  R['escoba.swing'].cooldown = 0.12; R['escoba.swing'].dur = 0.6;

  R['escoba.hit'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 1.0);
    L.tone(ctx, o, t, { f0: 160, f1: 70, d: 0.08, gain: 0.6 });
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: vary(1800, 0.1), q: 0.7, d: 0.06, gain: 0.75 });                  // las cerdas azotan
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 5200, d: 0.025, gain: 0.28 });
    woodHit(ctx, o, t + 0.004, vary(300, 0.1), 0.3, L);                                                                          // el palo
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 600, d: 0.07, gain: 0.4 });
  };
  R['escoba.hit'].cooldown = 0.06; R['escoba.hit'].dur = 0.45;

  R['escoba.break'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.85), i;
    woodHit(ctx, o, t, vary(520, 0.06), 0.95, L);                                                                                // ¡crac!
    woodHit(ctx, o, t + 0.014, vary(1150, 0.06), 0.55, L);
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 2600, q: 1.2, d: 0.03, gain: 0.7 });
    L.tone(ctx, o, t, { f0: 150, f1: 60, d: 0.1, gain: 0.5 });
    for (i = 0; i < 6; i++) woodHit(ctx, o, t + 0.07 + i * (0.045 + i * 0.015), rr(400, 1300), 0.2 * (1 - i / 7), L);             // astillas y mango que rueda
    for (i = 0; i < 5; i++) L.noiseHit(ctx, o, t + 0.03 + i * rr(0.03, 0.06), { type: 'highpass', f: rr(3500, 6000), a: 0.005, d: 0.08, gain: 0.12 });   // cerdas sueltas
  };
  R['escoba.break'].cooldown = 0.4; R['escoba.break'].dur = 0.9;

  /* --- molotov y fuego --- */
  R['molotov.light'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.4), i;
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 4200, q: 3, d: 0.008, gain: 0.6 });                                             // rueda del encendedor: dos raspones
    L.noiseHit(ctx, o, t + 0.045, { type: 'bandpass', f: 3600, q: 3, d: 0.01, gain: 0.7 });
    L.modal(ctx, o, t + 0.05, { freqs: [3100, 4700], decays: [0.03, 0.015], gains: [0.12, 0.06] });
    L.noiseHit(ctx, o, t + 0.07, { kind: 'brown', type: 'lowpass', f: 850, a: 0.05, d: 0.25, gain: 0.6 });                      // prende la mecha: whump chico
    L.noiseHit(ctx, o, t + 0.08, { kind: 'pink', type: 'bandpass', f: 1300, f1: 700, q: 0.7, a: 0.05, d: 0.35, gain: 0.35 });
    for (i = 0; i < 8; i++) L.noiseHit(ctx, o, t + 0.12 + i * rr(0.03, 0.06), { type: 'bandpass', f: rr(2500, 6000), q: 3, d: 0.008, gain: 0.16 });   // chisporroteo de la tela con gasolina
  };
  R['molotov.light'].cooldown = 0.4; R['molotov.light'].dur = 0.75;

  R['molotov.throw'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.004, dur = vary(0.4, 0.12), o = L.bus(ctx, out, 0.3), i;
    var src = L.noiseSrc(ctx, 'pink', t, dur + 0.1), bp = L.filter(ctx, 'bandpass', 400, 0.9), g = ctx.createGain();
    bp.frequency.setValueAtTime(vary(380, 0.1), t); bp.frequency.exponentialRampToValueAtTime(vary(1500, 0.1), t + dur * 0.4); bp.frequency.exponentialRampToValueAtTime(vary(650, 0.1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(2.6, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(o);
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 500, d: 0.05, gain: 0.3 });
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 3000, a: 0.02, d: dur * 1.1, gain: 0.16 });                                     // la mecha chisporrotea en el aire
    for (i = 0; i < 10; i++) L.noiseHit(ctx, o, t + 0.03 + i * rr(0.025, 0.045), { type: 'bandpass', f: rr(2500, 6500), q: 3, d: 0.008, gain: 0.14 });
    for (i = 0; i < 3; i++) L.tone(ctx, o, t + 0.04 + i * 0.07, { f0: rr(500, 900), f1: rr(300, 600), d: 0.03, gain: 0.06 });    // gasolina que se mece en la botella
  };
  R['molotov.throw'].cooldown = 0.15; R['molotov.throw'].dur = 0.65;

  R['molotov.break'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.6), i;
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 3500, d: 0.03, gain: 0.8 });                                                    // el vidrio revienta
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 2800, q: 0.8, d: 0.05, gain: 0.6 });
    tinkles(ctx, o, t + 0.005, 22, 0.55, 0.2, 2500, 6500, L, 1.4);
    L.tone(ctx, o, t + 0.01, { f0: 85, f1: 34, d: 0.34, gain: 0.95 });                                                          // whump de la gasolina
    L.noiseHit(ctx, o, t + 0.01, { kind: 'brown', type: 'lowpass', f: 420, a: 0.015, d: 0.5, gain: 0.85 });
    L.noiseHit(ctx, o, t + 0.03, { kind: 'pink', type: 'bandpass', f: 650, f1: 1500, q: 0.6, a: 0.09, d: 0.8, gain: 0.5 });      // llamarada
    for (i = 0; i < 14; i++) L.noiseHit(ctx, o, t + 0.15 + i * rr(0.03, 0.09), { type: 'bandpass', f: rr(1800, 5500), q: 3, d: 0.01, gain: 0.14 * (1 - i / 16) });    // chisporroteo
    L.noiseHit(ctx, o, t + 0.1, { kind: 'brown', type: 'lowpass', f: 300, a: 0.1, d: 0.9, gain: 0.3 });
  };
  R['molotov.break'].cooldown = 0.3; R['molotov.break'].dur = 1.8; R['molotov.break'].wet = 0.26; R['molotov.break'].priority = 5;

  R['hit.molotov'] = function (ctx, out, d, L) {                                           // la botella revienta en un cuerpo: vidrio, llamarada corta y chisporroteo
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.55), i;
    L.noiseHit(ctx, o, t, { type: 'highpass', f: 3500, d: 0.025, gain: 0.75 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 2600, q: 0.8, d: 0.04, gain: 0.5 });
    tinkles(ctx, o, t + 0.004, 12, 0.3, 0.2, 2500, 6500, L, 1.4);
    L.tone(ctx, o, t + 0.008, { f0: 100, f1: 40, d: 0.2, gain: 0.7 });                                                          // golpe sordo
    L.noiseHit(ctx, o, t + 0.02, { kind: 'pink', type: 'bandpass', f: 700, f1: 1700, q: 0.6, a: 0.05, d: 0.35, gain: 0.5 });     // llamarada corta
    for (i = 0; i < 6; i++) L.noiseHit(ctx, o, t + 0.1 + i * rr(0.03, 0.07), { type: 'bandpass', f: rr(1800, 5000), q: 3, d: 0.01, gain: 0.12 * (1 - i / 8) });
  };
  R['hit.molotov'].cooldown = 0.1; R['hit.molotov'].dur = 0.9; R['hit.molotov'].wet = 0.2; R['hit.molotov'].priority = 4;

  /* golpes a objetos blandos del basural (interaccion.js: sillaRota/mesaVolteada → wood, colchón → soft, llanta → rubber) */
  R['prop.hit.wood'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.002, o = L.bus(ctx, out, 0.4);
    woodHit(ctx, o, t, rr(220, 420), 0.8, L);
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 600, d: 0.08, gain: 0.35 });
  };
  R['prop.hit.wood'].cooldown = 0.05; R['prop.hit.wood'].dur = 0.35;
  R['prop.hit.soft'] = function (ctx, out, d, L) {                                         // colchón: golpe amortiguado y polvo
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.002, o = L.bus(ctx, out, 0.4);
    L.tone(ctx, o, t, { f0: 110, f1: 55, d: 0.12, gain: 0.7 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 380, d: 0.14, gain: 0.7 });
    L.noiseHit(ctx, o, t + 0.01, { kind: 'pink', type: 'bandpass', f: 1400, q: 0.7, d: 0.06, gain: 0.18 });
  };
  R['prop.hit.soft'].cooldown = 0.05; R['prop.hit.soft'].dur = 0.3;
  R['prop.hit.rubber'] = function (ctx, out, d, L) {                                       // llanta: bum de goma con rebote
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.002, o = L.bus(ctx, out, 0.4);
    L.tone(ctx, o, t, { f0: 150, f1: 70, d: 0.16, gain: 0.8 });
    L.tone(ctx, o, t + 0.05, { type: 'triangle', f0: 95, f1: 150, sweep: 0.06, d: 0.14, gain: 0.3 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 450, d: 0.1, gain: 0.5 });
  };
  R['prop.hit.rubber'].cooldown = 0.05; R['prop.hit.rubber'].dur = 0.35;

  // llamarada: ruido que se abre y cae, retumbo y chisporroteo; {intensity} 0..1
  R['fire.whoosh'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, k = clamp(typeof d.intensity === 'number' ? d.intensity : 1, 0.2, 1.3), o = L.bus(ctx, out, 0.3), D = 1.1 * (0.8 + 0.3 * k), i;
    var src = L.noiseSrc(ctx, 'pink', t, D + 0.2), bp = L.filter(ctx, 'bandpass', 300, 0.6), g = ctx.createGain();
    bp.frequency.setValueAtTime(260, t); bp.frequency.exponentialRampToValueAtTime(1100, t + D * 0.3); bp.frequency.exponentialRampToValueAtTime(400, t + D);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(2.4 * k, t + 0.14); g.gain.setTargetAtTime(0, t + D * 0.35, D * 0.25);
    src.connect(bp); bp.connect(g); g.connect(o);
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 300, a: 0.1, d: D, gain: 0.7 * k });
    L.tone(ctx, o, t, { f0: 70, f1: 40, d: 0.3, gain: 0.35 * k });
    for (i = 0; i < 10; i++) L.noiseHit(ctx, o, t + 0.2 + i * rr(0.04, 0.09), { type: 'bandpass', f: rr(1800, 5500), q: 3, d: 0.01, gain: 0.12 * k * (1 - i / 12) });
  };
  R['fire.whoosh'].cooldown = 0.2; R['fire.whoosh'].dur = 1.5; R['fire.whoosh'].priority = 4;

  // bucle posicional por zona: rugido grave que respira + chisporroteo + estallidos; {intensity} 0..1 (por defecto 0,6)
  R['fire.loop'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var o = L.bus(ctx, out, 0.53);
    function ik(h) { return clamp(typeof h.data.intensity === 'number' ? h.data.intensity : 0.6, 0, 1.2); }
    function apply(h, t) {
      var k = ik(h);
      h.rg.gain.setTargetAtTime(0.05 + 0.55 * k, t, 0.15); h.rf.frequency.setTargetAtTime(160 + 160 * k, t, 0.2); h.cg.gain.setTargetAtTime(0.03 + 0.35 * k, t, 0.15);
    }
    return L.loop(ctx, o, {
      data: d,
      setup: function (h) {
        var nr = h.src('brown'); h.rf = L.filter(ctx, 'bandpass', 240, 0.7); var rl = L.filter(ctx, 'lowpass', 800, 0.6); h.rg = ctx.createGain(); h.rg.gain.value = 0.2;
        nr.connect(h.rf); h.rf.connect(rl); rl.connect(h.rg); h.rg.connect(h.out);                                              // rugido de la llama
        h.lfo = h.osc('sine', 0.4); var lg = ctx.createGain(); lg.gain.value = 0.12; h.lfo.connect(lg); lg.connect(h.rg.gain);   // respira
        var nm = h.src('pink'), mf = L.filter(ctx, 'bandpass', 900, 0.6); h.mg = ctx.createGain(); h.mg.gain.value = 0.05; nm.connect(mf); mf.connect(h.mg); h.mg.connect(h.out);   // soplo
        var cs = ctx.createBufferSource(), ch = L.filter(ctx, 'highpass', 1500, 0.7); cs.buffer = crackleBuf(ctx); cs.loop = true; cs.playbackRate.value = 1.05; cs.start(h.t0, rnd() * 2.5); h.reg(cs);
        h.cg = ctx.createGain(); h.cg.gain.value = 0.15; cs.connect(ch); ch.connect(h.cg); h.cg.connect(h.out);                   // chisporroteo
        apply(h, h.t0);
      },
      set: function (h) { apply(h, ctx.currentTime); },
      step: function (h, t) {
        var k = ik(h);
        apply(h, t);
        h.mg.gain.setTargetAtTime(0.03 + 0.1 * k * (0.5 + rnd()), t, 0.08);                                                      // parpadeo
        if (rnd() < 0.35 * (0.3 + k)) L.noiseHit(ctx, h.out, t + rr(0, 0.1), { type: 'bandpass', f: rr(1600, 5000), q: 3, d: 0.012, gain: 0.25 * k });               // estallido de leña
        if (rnd() < 0.06 * k) L.modal(ctx, h.out, t, { freqs: [rr(300, 700), rr(900, 1700)], decays: [0.05, 0.02], gains: [0.15 * k, 0.07 * k] });                  // un tronco cruje
        return t + 0.12;
      }
    });
  };
  R['fire.loop'].loop = true; R['fire.loop'].cooldown = 0.3; R['fire.loop'].dur = 2; R['fire.loop'].priority = 2; R['fire.loop'].wet = 0.12;

  R['fire.out'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.5), D = 1.1, i;
    var src = L.noiseSrc(ctx, 'white', t, D + 0.2), hp = L.filter(ctx, 'highpass', 2500, 0.7), lp = L.filter(ctx, 'lowpass', 9000, 0.6), g = ctx.createGain();      // siseo de vapor
    lp.frequency.setValueAtTime(9000, t); lp.frequency.exponentialRampToValueAtTime(3500, t + D);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.55, t + 0.06); g.gain.setTargetAtTime(0, t + 0.2, D * 0.3);
    var am = ctx.createOscillator(), ag = ctx.createGain(); am.type = 'sawtooth'; am.frequency.value = 38; ag.gain.value = 0.25; am.connect(ag); ag.connect(g.gain); am.start(t); am.stop(t + D + 0.2);
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(o);
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 1000, q: 0.6, a: 0.01, d: 0.25, gain: 0.5 });                       // el agua cae
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 450, d: 0.15, gain: 0.35 });
    for (i = 0; i < 9; i++) L.noiseHit(ctx, o, t + 0.1 + i * rr(0.05, 0.1), { type: 'bandpass', f: rr(2500, 6000), q: 4, d: 0.01, gain: 0.14 * (1 - i / 10) });   // chasquidos
  };
  R['fire.out'].cooldown = 0.3; R['fire.out'].dur = 1.4; R['fire.out'].priority = 3;

  // zombie que se quema: alarido con aleteo de voz rota y chisporroteo; {type} con «senora» → más agudo
  R['zombie.burn'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.005, o = L.bus(ctx, out, 0.18), D = vary(1.15, 0.1), fem = /senora|escolar/.test(String(d.type || '')), pm = (fem ? 1.7 : 1) * vary(1, 0.08), i;
    L.voice(ctx, o, t, { dur: D, f0: [[0, 150 * pm], [0.12, 270 * pm], [0.5, 240 * pm], [0.85, 200 * pm], [1, 130 * pm]], vowels: [[0, 'o'], [0.15, 'a'], [0.6, 'ae'], [1, 'o']],
      amp: [[0, 0], [0.06, 1], [0.7, 0.9], [1, 0]], fscale: fem ? 1.17 : 1, bw: 1.3, breath: 0.4, rasp: 0.6, raspHz: 40, gargle: 0.4, gargleHz: 13, vib: 0.05, vibHz: 9.5, jitter: 0.04, drive: 0.6, gain: 2.4 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 400, a: 0.05, d: D, gain: 0.4 });                                 // la llama sobre él
    for (i = 0; i < 12; i++) L.noiseHit(ctx, o, t + i * D / 12 * rr(0.6, 1.2), { type: 'bandpass', f: rr(1800, 5500), q: 3, d: 0.01, gain: 0.16 });
  };
  R['zombie.burn'].cooldown = 0.35; R['zombie.burn'].dur = 1.4; R['zombie.burn'].priority = 3;

  /* --- tele y refrigeradora --- */
  R['tele.crash'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.68), i;
    L.tone(ctx, o, t, { f0: 130, f1: 44, d: 0.3, gain: 0.95 });                                                                  // el golpe de algo pesado
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 500, d: 0.25, gain: 0.8 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(1800, 0.1), q: 0.9, d: 0.05, gain: 0.6 });
    woodHit(ctx, o, t + 0.004, vary(350, 0.1), 0.55, L);                                                                         // la carcasa de plástico se raja
    L.noiseHit(ctx, o, t + 0.02, { kind: 'brown', type: 'lowpass', f: 250, a: 0.002, d: 0.22, gain: 1.0 });                      // el tubo implosiona: puf grave
    L.noiseHit(ctx, o, t + 0.025, { type: 'highpass', f: 3500, d: 0.04, gain: 0.8 });                                            // vidrio
    tinkles(ctx, o, t + 0.03, 28, 0.9, 0.2, 2200, 7000, L, 1.3);
    L.noiseHit(ctx, o, t + 0.06, { type: 'highpass', f: 6000, a: 0.02, d: 0.5, gain: 0.14 });                                    // fuga de vacío
    for (i = 0; i < 9; i++) L.noiseHit(ctx, o, t + 0.05 + i * rr(0.02, 0.07), { type: 'bandpass', f: rr(3000, 7500), q: 4, d: 0.006, gain: 0.3 * (1 - i / 11) });   // chispas del tubo
    var bz = ctx.createOscillator(), bg = ctx.createGain(), bb = L.filter(ctx, 'bandpass', 900, 2);                              // zumbido eléctrico que cae
    bz.type = 'square'; bz.frequency.setValueAtTime(240, t + 0.05); bz.frequency.exponentialRampToValueAtTime(60, t + 0.5);
    bg.gain.setValueAtTime(0.0001, t + 0.05); bg.gain.linearRampToValueAtTime(0.2, t + 0.07); bg.gain.setTargetAtTime(0, t + 0.15, 0.1);
    bz.connect(bb); bb.connect(bg); bg.connect(o); bz.start(t + 0.05); bz.stop(t + 0.8);
    L.tone(ctx, o, t + 0.06, { f0: 3200, f1: 420, sweep: 0.4, d: 0.45, gain: 0.06 });                                            // el aparato se apaga
    for (i = 0; i < 6; i++) L.clang(ctx, o, t + 0.25 + i * (0.08 + i * 0.03), { f: rr(500, 1200), gain: 0.07 * (1 - i / 7), decay: 0.15, n: 3 });   // piezas que caen
  };
  R['tele.crash'].cooldown = 0.5; R['tele.crash'].dur = 1.9; R['tele.crash'].wet = 0.26; R['tele.crash'].priority = 5;

  R['throw.tele'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.004, dur = vary(0.45, 0.1), o = L.bus(ctx, out, 0.25);
    L.voice(ctx, o, t, { dur: 0.26, f0: [[0, 160], [0.4, 140], [1, 105]], vowels: [[0, 'a'], [0.6, 'o'], [1, 'o']], amp: [[0, 0], [0.1, 1], [0.6, 0.8], [1, 0]], bw: 1.3, breath: 0.4, rasp: 0.25, drive: 0.35, gain: 2.0 });   // el empujón con ¡uf!
    var src = L.noiseSrc(ctx, 'pink', t + 0.12, dur + 0.1), bp = L.filter(ctx, 'bandpass', 250, 0.8), g = ctx.createGain(), s0 = t + 0.12;                 // «fuuu» pesado
    bp.frequency.setValueAtTime(240, s0); bp.frequency.exponentialRampToValueAtTime(1000, s0 + dur * 0.4); bp.frequency.exponentialRampToValueAtTime(420, s0 + dur);
    g.gain.setValueAtTime(0.0001, s0); g.gain.linearRampToValueAtTime(3.0, s0 + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.001, s0 + dur);
    src.connect(bp); bp.connect(g); g.connect(o);
    L.noiseHit(ctx, o, t + 0.1, { kind: 'brown', type: 'lowpass', f: 400, d: 0.1, gain: 0.45 });
    L.modal(ctx, o, t + 0.13, { freqs: [rr(900, 1500), rr(2200, 3400)], decays: [0.06, 0.03], gains: [0.1, 0.05] });                  // el cable que se zarandea
  };
  R['throw.tele'].cooldown = 0.2; R['throw.tele'].dur = 0.8;

  R['fridge.hit'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.6), i;
    L.tone(ctx, o, t, { f0: 115, f1: 44, d: 0.15, gain: 0.85 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 450, d: 0.1, gain: 0.6 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: vary(1700, 0.1), q: 1.0, d: 0.03, gain: 0.55 });
    L.modal(ctx, o, t, { freqs: [vary(78, 0.04), vary(152, 0.04), vary(233, 0.04), vary(410, 0.04)], decays: [0.4, 0.28, 0.2, 0.12], gains: [0.8, 0.6, 0.4, 0.25], a: 0.001 });   // la caja hueca de chapa
    L.clang(ctx, o, t + 0.002, { f: rr(280, 340), gain: 0.4, decay: 0.45 });
    for (i = 0; i < 4; i++) L.modal(ctx, o, t + 0.04 + i * rr(0.03, 0.07), { freqs: [rr(1800, 3200), rr(4200, 6000)], decays: [0.06, 0.03], gains: [0.1, 0.05] });          // parrillas y botellas adentro
  };
  R['fridge.hit'].cooldown = 0.07; R['fridge.hit'].dur = 1.0;

  R['fridge.open'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.65), i;
    L.noiseHit(ctx, o, t, { kind: 'pink', type: 'bandpass', f: 700, q: 0.8, a: 0.008, d: 0.12, gain: 0.7 });                      // el sello de goma se despega: fwup
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 300, d: 0.14, gain: 0.5 });
    L.noiseHit(ctx, o, t + 0.04, { type: 'bandpass', f: 1300, f1: 2600, q: 1.1, a: 0.08, d: 0.2, gain: 0.25 });
    var sq = ctx.createOscillator(), sg = ctx.createGain(), sb = L.filter(ctx, 'bandpass', 1500, 8), s0 = t + 0.06;               // bisagra oxidada
    sq.type = 'sawtooth'; sq.frequency.setValueAtTime(1100, s0); sq.frequency.linearRampToValueAtTime(1800, s0 + 0.32);
    sg.gain.setValueAtTime(0.0001, s0); sg.gain.linearRampToValueAtTime(0.11, s0 + 0.08); sg.gain.setTargetAtTime(0, s0 + 0.22, 0.07);
    sq.connect(sb); sb.connect(sg); sg.connect(o); sq.start(s0); sq.stop(s0 + 0.6);
    L.modal(ctx, o, t + 0.4, { freqs: [2600], decays: [0.02], gains: [0.1] });                                                    // clic de la luz
    for (i = 0; i < 3; i++) L.modal(ctx, o, t + 0.1 + i * 0.05, { freqs: [rr(1800, 3000), rr(4000, 5600)], decays: [0.05, 0.02], gains: [0.07, 0.03] });    // botellas que se mueven
    L.modal(ctx, o, t + 0.3, { freqs: [MAINS * 2, MAINS * 4, MAINS * 6], decays: [0.5, 0.3, 0.2], gains: [0.09, 0.07, 0.04], a: 0.05 });   // el motor del compresor arranca
  };
  R['fridge.open'].cooldown = 0.3; R['fridge.open'].dur = 1.0;

  /* --- gallinas --- */
  R['chicken.cluck'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.005, o = L.bus(ctx, out, 0.16), n = 3 + ((rnd() * 3) | 0), tt = t, i, f, dur;
    for (i = 0; i < n; i++) {
      f = vary(520, 0.1) * (1 + 0.06 * i); dur = i === n - 1 ? 0.17 : vary(0.075, 0.2);
      L.voice(ctx, o, tt, { dur: dur, f0: [[0, f * 0.9], [0.5, f * 1.35], [1, f * (i === n - 1 ? 1.7 : 1.15)]], vowels: [[0, 'o'], [0.5, 'a'], [1, i === n - 1 ? 'e' : 'o']], amp: [[0, 0], [0.15, 1], [0.7, 0.8], [1, 0]],
        fscale: 1.45, bw: 1.0, breath: 0.2, rasp: 0.2, jitter: 0.03, drive: 0.3, gain: 2.5 });
      tt += dur + vary(0.06, 0.3);
    }
  };
  R['chicken.cluck'].cooldown = 0.5; R['chicken.cluck'].dur = 1.0;

  R['chicken.flee'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.004, o = L.bus(ctx, out, 0.18), n = 3 + ((rnd() * 2) | 0), i, tt = t, f, ts = [];
    for (i = 0; i < n; i++) {
      f = vary(900, 0.12);
      L.voice(ctx, o, tt, { dur: 0.26, f0: [[0, f], [0.35, f * 1.55], [1, f * 1.05]], vowels: [[0, 'ae'], [0.5, 'ee'], [1, 'ae']], amp: [[0, 0], [0.08, 1], [0.7, 0.8], [1, 0]], fscale: 1.4, bw: 1.2, breath: 0.4, rasp: 0.5, raspHz: 55,
        jitter: 0.04, drive: 0.4, gain: 2.3 });
      tt += vary(0.3, 0.2);
    }
    for (i = 0; i < 14; i++) ts.push(i * (0.06 + i * 0.003) * vary(1, 0.15));                                                      // aleteo frenético
    L.flaps(ctx, o, t, ts, { gain: 0.45, pitch: 1.3 });
    for (i = 0; i < 8; i++) L.noiseHit(ctx, o, t + 0.1 + i * 0.12, { type: 'bandpass', f: rr(1800, 3500), q: 2, d: 0.015, gain: 0.12 });   // patitas rascando la tierra
  };
  R['chicken.flee'].cooldown = 0.5; R['chicken.flee'].dur = 1.7;

  /* --- viento con polvo (también lo usa el ambiente del Cerro): ráfaga con arena; {intensity} 0..1 --- */
  R['wind.dust'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.01, k = clamp(typeof d.intensity === 'number' ? d.intensity : 0.6, 0.1, 1.2), o = L.bus(ctx, out, 0.1), rise = 1.4, hold = 0.7, fall = 2.2, D = rise + hold + fall, i;
    var b = L.noiseSrc(ctx, 'brown', t, D + 0.4), bl = L.filter(ctx, 'lowpass', 200, 0.8), bg = ctx.createGain();                      // cuerpo grave del viento
    bl.frequency.setValueAtTime(200, t); bl.frequency.linearRampToValueAtTime(200 + 800 * k, t + rise); bl.frequency.linearRampToValueAtTime(200, t + D);
    bg.gain.setValueAtTime(0.0001, t); bg.gain.linearRampToValueAtTime(0.5 + 0.9 * k, t + rise); bg.gain.setValueAtTime(0.5 + 0.8 * k, t + rise + hold); bg.gain.linearRampToValueAtTime(0.0001, t + D);
    b.connect(bl); bl.connect(bg); bg.connect(o);
    var w = L.noiseSrc(ctx, 'pink', t, D + 0.4), wb = L.filter(ctx, 'bandpass', 800, 4), wg = ctx.createGain();                        // silbido entre calaminas y cables
    wb.frequency.setValueAtTime(700, t); wb.frequency.linearRampToValueAtTime(700 + 600 * k, t + rise); wb.frequency.linearRampToValueAtTime(650, t + D);
    wg.gain.setValueAtTime(0.0001, t); wg.gain.linearRampToValueAtTime(0.1 * k * k, t + rise); wg.gain.linearRampToValueAtTime(0.0001, t + D);
    w.connect(wb); wb.connect(wg); wg.connect(o);
    var dn = L.noiseSrc(ctx, 'white', t, D + 0.4), dh = L.filter(ctx, 'highpass', 1700, 0.7), dl = L.filter(ctx, 'lowpass', 6500, 0.6), dg = ctx.createGain();   // polvo: arena que roza
    dg.gain.setValueAtTime(0.0001, t); dg.gain.linearRampToValueAtTime(0.1 + 0.3 * k, t + rise * 0.9); dg.gain.setValueAtTime(0.1 + 0.28 * k, t + rise + hold); dg.gain.linearRampToValueAtTime(0.0001, t + D);
    var sl = ctx.createOscillator(), sg = ctx.createGain(); sl.frequency.value = 5.5; sg.gain.value = 0.3 * (0.1 + 0.3 * k); sl.connect(sg); sg.connect(dg.gain); sl.start(t); sl.stop(t + D + 0.4);   // remolinos
    dn.connect(dh); dh.connect(dl); dl.connect(dg); dg.connect(o);
    for (i = 0; i < 40; i++) L.noiseHit(ctx, o, t + rise * 0.3 + rnd() * (D - rise * 0.5), { type: 'highpass', f: rr(3000, 6500), d: 0.006, gain: 0.05 + 0.08 * k * rnd() });    // granos que golpean
  };
  R['wind.dust'].cooldown = 2; R['wind.dust'].dur = 5; R['wind.dust'].priority = 1;

  /* --- radio de cumbia (lejana, posicional): «Cumbia del Tendal», Re menor, 94 bpm, 8 compases, original --- */
  // todo suena por una cadena de radio de parlante chico: pasa banda 380–3600 Hz, saturación suave y un siseo de fondo
  var RAD = { bpm: 94, sd: 60 / 94 / 4,
    chords: [[50, 53, 57], [50, 53, 57], [55, 58, 62], [57, 61, 64], [50, 53, 57], [58, 62, 65], [57, 61, 64], [50, 53, 57]],
    bass: [38, 38, 43, 45, 38, 46, 45, 38],
    mel: ['0:69:2 2:74:2 4:77:2 6:76:1 7:74:1 8:77:4 12:76:2 14:74:2', '0:69:2 2:74:2 4:77:2 6:81:2 8:79:4 12:77:2 14:76:2', '0:74:2 2:79:2 4:82:2 6:81:1 7:79:1 8:82:4 12:81:2 14:79:2',
      '0:76:2 2:81:2 4:79:2 6:76:2 8:73:4 12:76:2 14:69:2', '0:74:2 2:77:2 4:81:2 6:79:1 7:77:1 8:81:4 12:79:2 14:77:2', '0:77:2 2:82:2 4:81:2 6:79:2 8:77:4 12:74:2 14:77:2',
      '0:76:2 2:79:2 4:73:2 6:76:2 8:81:4 12:79:2 14:76:2', '0:77:4 4:74:4 8:69:2 10:74:2 12:74:4'] };
  RAD.mel = RAD.mel.map(function (s) { return s.split(' ').map(function (x) { var p = x.split(':'); return { s: +p[0], n: +p[1], d: +p[2] }; }); });
  function radioChain(ctx, dest, L, lvl) {                                                                                       // entrada → pasa banda → saturación → siseo → dest
    var inp = ctx.createGain(), hp = L.filter(ctx, 'highpass', 380, 0.8), pk = L.filter(ctx, 'peaking', 1500, 1, 5), lp = L.filter(ctx, 'lowpass', 3600, 0.8), sh = ctx.createWaveShaper(), g = ctx.createGain();
    sh.curve = satCurve(0.25); g.gain.value = lvl == null ? 1 : lvl;
    inp.connect(hp); hp.connect(pk); pk.connect(lp); lp.connect(sh); sh.connect(g); g.connect(dest);
    return { inp: inp, gain: g };
  }
  function radioNote(ctx, dest, t, midi, dur, g) {                                                                                // melódica / órgano de cumbia: dos sierras desafinadas + cuadrada
    var f = mtof(midi), a = ctx.createGain(), lp = ctx.createBiquadFilter(), vl = ctx.createOscillator(), vg = ctx.createGain(), end = t + dur, i, os, dets = [-6, 5];
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(f * 3, t); lp.frequency.linearRampToValueAtTime(Math.min(f * 6, 3200), t + 0.02); lp.frequency.setTargetAtTime(f * 3.2, t + 0.04, 0.1); lp.Q.value = 0.9;
    a.gain.setValueAtTime(0.0001, t); a.gain.linearRampToValueAtTime(g, t + 0.012); a.gain.setTargetAtTime(g * 0.7, t + 0.02, 0.08); a.gain.setTargetAtTime(0, end, 0.035);
    vl.frequency.value = 5.2; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(9, t + Math.max(0.1, dur * 0.7)); vl.connect(vg); vl.start(t); vl.stop(end + 0.3);
    for (i = 0; i < 3; i++) {
      os = ctx.createOscillator(); os.type = i < 2 ? 'sawtooth' : 'square'; os.frequency.value = f; os.detune.value = i < 2 ? dets[i] : 0;
      vg.connect(os.detune); os.connect(lp); os.start(t); os.stop(end + 0.3);
    }
    lp.connect(a); a.connect(dest);
  }
  // programa el paso `idx` (semicorchea) de la cumbia en el instante t
  function radioStep(ctx, dest, t, idx, L, gs) {
    var sd = RAD.sd, bar = ((idx / 16) | 0) % 8, s = idx % 16, ch = RAD.chords[bar], b = RAD.bass[bar], k, m, mel = RAD.mel[bar];
    if (s % 4 === 0) L.noiseHit(ctx, dest, t, { type: 'bandpass', f: 4200, q: 1, a: 0.004, d: 0.07, gain: 0.35 * gs });                // güiro largo
    else if (s % 4 === 2 || s % 4 === 3) L.noiseHit(ctx, dest, t, { type: 'bandpass', f: 4600, q: 1, d: 0.025, gain: 0.25 * gs });     // güiro corto
    if (s === 0 || s === 6 || s === 8 || s === 14) {                                                                              // bajo
      var bn = s === 8 ? b + 7 : (s === 14 ? b + 2 : b);
      L.tone(ctx, dest, t, { type: 'triangle', f0: mtof(bn), f1: mtof(bn) * 0.985, sweep: 0.25, d: s === 0 || s === 8 ? 0.3 : 0.16, gain: 0.5 * gs });
      L.tone(ctx, dest, t, { f0: mtof(bn + 12), d: 0.12, gain: 0.12 * gs });
    }
    if (s === 2 || s === 6 || s === 10 || s === 14) L.modal(ctx, dest, t, { freqs: [mtof(ch[0] + 12), mtof(ch[1] + 12), mtof(ch[2] + 12)], decays: [0.09, 0.09, 0.09], gains: [0.13 * gs, 0.12 * gs, 0.11 * gs], a: 0.002 });   // chasquido de guitarra rítmica
    if (s === 4 || s === 12) L.tone(ctx, dest, t, { f0: 190, f1: 120, d: 0.08, gain: 0.2 * gs });                                    // tumbadora
    for (k = 0; k < mel.length; k++) {
      m = mel[k];
      if (m.s === s) radioNote(ctx, dest, t, m.n, Math.max(0.1, m.d * sd * 0.95), 0.16 * gs);
    }
  }
  R['radio.cumbia'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var o = L.bus(ctx, out, 0.09), ch;
    function lvl(h) { var k = clamp(typeof h.data.intensity === 'number' ? h.data.intensity : 0.7, 0, 1.2); return 0.25 + 0.9 * k; }
    return L.loop(ctx, o, {
      data: d, ahead: 0.5,
      setup: function (h) {
        ch = radioChain(ctx, h.out, L, lvl(h)); h.ch = ch;
        var ns = h.src('white'), nf = L.filter(ctx, 'bandpass', 2200, 0.6), ng = ctx.createGain(); ng.gain.value = 0.012; ns.connect(nf); nf.connect(ng); ng.connect(ch.inp);                  // siseo del dial
        h.st.i = 0; h.st.off = rr(0, 0.5);
      },
      set: function (h) { h.ch.gain.gain.setTargetAtTime(lvl(h), ctx.currentTime, 0.2); },
      step: function (h, t) {
        radioStep(ctx, h.ch.inp, t, h.st.i++, L, 1);
        return t + RAD.sd;
      }
    });
  };
  R['radio.cumbia'].loop = true; R['radio.cumbia'].cooldown = 0.5; R['radio.cumbia'].dur = 12; R['radio.cumbia'].priority = 1; R['radio.cumbia'].wet = 0.22;

  /* =====================================================================================================
     v0.13 (C4) · Descansos, radio a pilas y carteles de zona del Cerro
       rest         (game.js, al tocar un punto de descanso) acorde corto y cálido de guitarra: Sol rasgueado hacia abajo + armónico alto
       radio.static estática de radio de pilas (data {dur s, tune: true = barrido de dial + clic de encendido}); se oye al prender la radio y en cada E posterior
       radio.news   sintonía de noticiero (4 notas por un filtro de teléfono); abre las líneas del noticiero
       zona.cartel  «plin-plin» al salir el cartel con el nombre de la zona del Cerro (cerro.js)
     ===================================================================================================== */
  R['rest'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.72), name = String(d.label || ''), h = 0, i;
    for (i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 7;
    var ch = ['G', 'C', 'D', 'G', 'Em', 'C', 'G'][h];                                   // cada descanso suena apenas distinto, siempre en tonalidad
    L.strum(ctx, o, L.chord(ch, vary(1, 0.003)), t, { spread: 0.026, decay: 1.0, bright: 0.38, vel: 0.24, dir: 'down', dur: 1.5 });
    L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 260, q: 0.7, d: 0.09, gain: 0.16 });                       // el cuerpo de la guitarra
    L.strum(ctx, o, L.chord(ch, 2).slice(2, 5), t + 0.32, { spread: 0.014, decay: 0.7, bright: 0.55, vel: 0.1, dir: 'up', dur: 1.1 });
    L.harmonic(ctx, o, 783.99, t + 0.5, { gain: 0.1, decay: 0.7 });
  };
  R['rest'].cooldown = 0.8; R['rest'].dur = 1.8; R['rest'].wet = 0.22;

  R['radio.static'] = function (ctx, out, d, L) {
    d = d || {}; L = L || lib;
    var dur = clamp(+d.dur || 1.3, 0.3, 3), t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.42), i, tt;
    var bp = L.filter(ctx, 'bandpass', 2300, 0.55), hp = L.filter(ctx, 'highpass', 500, 0.7); bp.connect(hp); hp.connect(o);
    if (d.tune) {
      L.noiseHit(ctx, o, t, { type: 'highpass', f: 2500, a: 0.001, d: 0.02, gain: 0.5 });                                 // clic del interruptor
      L.tone(ctx, bp, t + 0.03, { f0: 420, f1: 2100, sweep: 0.5, a: 0.04, d: 0.55, gain: 0.12 });                           // silbido del dial
      L.tone(ctx, bp, t + 0.55, { f0: 1900, f1: 700, sweep: 0.35, a: 0.02, d: 0.4, gain: 0.07 });
    }
    L.noiseHit(ctx, bp, t, { kind: 'white', type: 'bandpass', f: 2300, f1: 1700, q: 0.5, a: 0.03, d: dur, gain: 0.5 });      // el siseo
    L.noiseHit(ctx, bp, t, { kind: 'pink', type: 'lowpass', f: 900, a: 0.05, d: dur * 0.8, gain: 0.25 });
    for (i = 0; i < Math.round(dur * 9); i++) {                                                                          // chisporroteo
      tt = t + rr(0.02, dur);
      L.noiseHit(ctx, o, tt, { type: 'bandpass', f: rr(2500, 6500), q: 1.2, a: 0.001, d: rr(0.008, 0.035), gain: rr(0.15, 0.45) });
    }
    L.noiseHit(ctx, bp, t + dur * 0.55, { kind: 'white', type: 'bandpass', f: 3000, q: 0.9, a: 0.02, d: dur * 0.4, gain: 0.22 });   // una ráfaga más fuerte, de señal que se va
  };
  R['radio.static'].cooldown = 0.3; R['radio.static'].dur = 3.2; R['radio.static'].wet = 0.08;

  R['radio.news'] = function (ctx, out, d, L) {
    L = L || lib;
    var t = ctx.currentTime + 0.01, o = L.bus(ctx, out, 0.46), nf = [392, 523.3, 659.3, 784], i;
    var bp = L.filter(ctx, 'bandpass', 1500, 0.5), lp = L.filter(ctx, 'lowpass', 3200, 0.7); bp.connect(lp); lp.connect(o);   // voz de parlante chico
    for (i = 0; i < nf.length; i++) L.tone(ctx, bp, t + i * 0.13, { type: 'square', f0: nf[i], a: 0.004, d: i === nf.length - 1 ? 0.5 : 0.11, gain: 0.3 });
    L.noiseHit(ctx, bp, t, { type: 'bandpass', f: 2600, q: 0.7, a: 0.02, d: 0.9, gain: 0.1 });
  };
  R['radio.news'].cooldown = 1; R['radio.news'].dur = 1.2;

  R['zona.cartel'] = function (ctx, out, d, L) {
    L = L || lib;
    var o = L.bus(ctx, out, 0.34), t = ctx.currentTime + 0.003;
    L.harmonic(ctx, o, 659.3, t, { gain: 0.3, decay: 0.2 });
    L.harmonic(ctx, o, 987.8, t + 0.09, { gain: 0.34, decay: 0.45 });
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 1800, q: 1.2, d: 0.05, gain: 0.12 });                                      // papel pegado con cinta
  };
  R['zona.cartel'].cooldown = 0.5; R['zona.cartel'].dur = 0.8;

  /* v0.13 verificación: nombres que el juego emitía sin receta (sonaban mudos). Dos recetas nuevas (door, tire.burst) y alias perezosos
     (buscan el original al sonar, así sirven aunque la receta venga de sfx-cv.js o sfx-mira.js, que cargan después). */
  R['door'] = function (ctx, out, d, L) {   // puerta de local / del cuarto: chirrido corto de bisagra + golpe de marco
    L = L || lib;
    var o = L.bus(ctx, out, 0.9), t = ctx.currentTime + 0.004;
    L.tone(ctx, o, t, { type: 'sawtooth', f0: 520, f1: 760, sweep: 0.22, a: 0.03, d: 0.22, gain: 0.05 });
    L.noiseHit(ctx, o, t + 0.05, { type: 'bandpass', f: 2400, q: 2, a: 0.04, d: 0.16, gain: 0.05 });
    L.noiseHit(ctx, o, t + 0.27, { kind: 'brown', type: 'lowpass', f: 320, q: 0.8, d: 0.1, gain: 0.5 });
    L.tone(ctx, o, t + 0.27, { type: 'sine', f0: 110, f1: 70, sweep: 0.1, d: 0.12, gain: 0.35 });
  };
  R['door'].cooldown = 0.3; R['door'].dur = 0.6;
  R['tire.burst'] = function (ctx, out, d, L) {   // llanta que revienta: estallido seco + soplido de aire
    L = L || lib; d = d || {};
    var o = L.bus(ctx, out, d.small ? 0.35 : 0.55), t = ctx.currentTime + 0.003;
    L.noiseHit(ctx, o, t, { type: 'bandpass', f: 900, q: 0.6, d: 0.06, gain: 0.7 });
    L.noiseHit(ctx, o, t + 0.02, { type: 'highpass', f: 1800, q: 0.7, a: 0.01, d: 0.45, gain: 0.12, f1: 700 });
    L.tone(ctx, o, t, { type: 'sine', f0: 140, f1: 50, sweep: 0.12, d: 0.14, gain: 0.4 });
  };
  R['tire.burst'].cooldown = 0.2; R['tire.burst'].dur = 0.7;
  (function () {
    var ALIAS = {   // nombre emitido → [receta, datos fijos]
      'tire.pop': ['tire.burst', { small: true }], 'base.enter': ['door'], 'base.exit': ['door'],
      'base.cajon': ['inv.open'], 'base.dormir': ['rest', { label: 'cama' }], 'base.poner': ['loot.drop'], 'base.quitar': ['grab'],
      'base.radio': ['radio.static', { dur: 0.45, tune: true }], 'ui.open': ['inv.open'], 'ui.no': ['ui.back'], 'item.use': ['loot.pickup'],
      'uhu.use': ['loot.pickup'], 'craft': ['loot.rare'], 'eat': ['item.eat'], 'glass': ['prop.hit.glass'], 'guitar.swing': ['swing'],
      'heavy.land': ['stone.land'], 'vendor.hello': ['ui.ok'], 'boss.fryWarn': ['olla.windup'],
      'cv.perro.ladra': ['cv.ladrido'], 'cv.tabla': ['cv.tabla.golpe'],
      // index.html no carga sfx-mira.js: la Presidenta (megáfono, caída) y las tiendas de la Gambetta/Cerro sonaban mudas. En Miraflores y
      // Costa Verde sfx-mira.js (carga después) las reemplaza por sus recetas propias.
      'boss.yell': ['senora.yell'], 'boss.down': ['vehicle.fall'], 'shop.open': ['inv.open'], 'shop.buy': ['loot.coins'], 'shop.nomoney': ['ui.back']
    };
    Object.keys(ALIAS).forEach(function (name) {
      if (R[name]) return;
      var to = ALIAS[name][0], fix = ALIAS[name][1];
      var f = function (ctx, out, d, L) {
        var r = R[to]; if (typeof r !== 'function') return 0.05;
        var dd = {}, k; if (d) for (k in d) dd[k] = d[k]; if (fix) for (k in fix) dd[k] = fix[k];
        return r(ctx, out, dd, L);
      };
      f.cooldown = 0.15; f.dur = 1.2; f.alias = to; R[name] = f;
    });
  })();

  /* =====================================================================================================
     AMBIENTE
     ===================================================================================================== */
  function crackleBuf(ctx) {
    var c = cacheOf(ctx);
    if (c.crackle) return c.crackle;
    var sr = ctx.sampleRate, len = Math.floor(sr * 3.1), buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0), r = lib.rand(77), i, j, p = 6 / sr;
    for (i = 0; i < len; i++) {
      if (r() < p) { var a = (r() * 0.7 + 0.3) * (r() < 0.5 ? -1 : 1); d[i] += a; d[i + 1 < len ? i + 1 : i] -= a * 0.6; }
      if (r() < 0.9 / sr * 1.5) for (j = 0; j < 5; j++) { var k = i + Math.floor(r() * 0.02 * sr); if (k < len) d[k] += (r() * 2 - 1) * 0.8; }     // ráfaga de chisporroteo
    }
    return (c.crackle = buf);
  }
  function fliesBuf(ctx) {
    var c = cacheOf(ctx);
    if (c.flies) return c.flies;
    var sr = ctx.sampleRate, len = Math.floor(sr * 2.5), buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0), r = lib.rand(99), x = new Float32Array(len + 2048);
    var ph = [0, 0], base = [190, 255], w = [0, 0], am = [1, 1], tgt = [1, 1], i, f, k, v;
    for (i = 0; i < x.length; i++) {
      v = 0;
      for (k = 0; k < 2; k++) {
        if (i % 2000 === 0) { tgt[k] = r() < 0.3 ? 0.05 : 0.4 + r() * 0.6; }
        am[k] += (tgt[k] - am[k]) * 0.0006; w[k] += ((r() - 0.5) * 0.02 - w[k] * 0.0005) * 0.5;
        f = base[k] * (1 + w[k]); ph[k] += TAU * f / sr;
        v += am[k] * (Math.sin(ph[k]) + 0.55 * Math.sin(2 * ph[k]) + 0.35 * Math.sin(3 * ph[k]) + 0.2 * Math.sin(4 * ph[k] + 1) + 0.12 * Math.sin(6 * ph[k]));
      }
      x[i] = v * (0.8 + 0.4 * Math.sin(i * TAU * 31 / sr)) * 0.2;
    }
    var X = 2048;
    for (i = 0; i < len; i++) d[i] = x[i];
    for (i = 0; i < X; i++) { var an = (i / X) * Math.PI / 2; d[i] = x[i] * Math.sin(an) + x[len + i] * Math.cos(an); }
    return (c.flies = buf);
  }
  function lampWave(ctx) {
    var im = new Float32Array([0, 0.4, 1, 0.3, 0.55, 0.15, 0.2, 0.1]), re = new Float32Array(im.length);
    return ctx.createPeriodicWave(re, im);
  }
  function dripBufs(ctx) {
    var c = cacheOf(ctx);
    if (c.drips) return c.drips;
    var sr = ctx.sampleRate, r = lib.rand(5), out = [], k, i;
    for (k = 0; k < 5; k++) {
      var len = Math.floor(sr * 0.09), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0), f = 1600 + r() * 2400, f2 = f * (k < 3 ? 2.4 : 1.7), dc = 0.012 + r() * 0.02 + (k >= 3 ? 0.03 : 0);
      for (i = 0; i < len; i++) {
        var tt = i / sr, e = Math.exp(-tt / dc);
        d[i] = (Math.sin(TAU * f * tt * (1 + 0.15 * Math.exp(-tt / 0.004))) * e + (k >= 3 ? 0.4 * Math.sin(TAU * f2 * tt) * Math.exp(-tt / (dc * 0.7)) : 0) + (i < 30 ? (r() - 0.5) * 0.6 : 0)) * 0.5;
      }
      out.push(b);
    }
    return (c.drips = out);
  }

  /* Niveles del ambiente (v0.9): multiplicadores sobre la capa de base. gambetta = como siempre; cerro = menos garúa, más viento (con polvo), mar casi
     ausente, rumor de ciudad abajo, perros lejanos a coro y alguna radio lejana. A.amb.setLevel(id) o ACH.audio.setLevel(id) los cambia con fundido de ~2 s. */
  var LVL = {
    gambetta: { rain: 1, wind: 1, windAdd: 0, sea: 1, dust: 0, city: 0, dogs: 0, radio: 0 },
    cerro:    { rain: 0.15, wind: 1.6, windAdd: 0.28, sea: 0.12, dust: 1, city: 1, dogs: 1, radio: 1 }
  };
  A.amb = {
    level: 'gambetta',
    setLevel: function (id) {                       // si el ambiente aún no arrancó, se recuerda
      A.ambLevel = LVL[id] ? id : 'gambetta'; A.amb.level = A.ambLevel;
      var c = A.ambCtl; if (c && typeof c.setLevel === 'function') { try { c.setLevel(A.ambLevel); } catch (e) { /* nada */ } }
    },
    start: function (ctx, out, L) {
      L = L || lib;
      var now = ctx.currentTime, srcs = [], oscs = [], timer = null, stopped = false, offline = (typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext);
      var root = ctx.createGain(); root.gain.value = 1; root.connect(out);
      var bed = ctx.createGain(); bed.gain.value = 0.5; bed.connect(root);                        // rain + wind + sea (setBed(0) para aislar eventos)
      function loop(kind, rate) {
        var s = ctx.createBufferSource(), b = L.noise(ctx, kind);
        s.buffer = b; s.loop = true; s.playbackRate.value = rate || 1; s.start(now, rnd() * (b.duration - 0.2)); srcs.push(s); return s;
      }
      function lfo(freq, depth, target) {
        var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = freq; g.gain.value = depth;
        o.connect(g); g.connect(target); o.start(now); oscs.push(o); return o;
      }
      function pan(p) {
        if (!ctx.createStereoPanner) { var g = ctx.createGain(); g.connect(root); return g; }
        var s = ctx.createStereoPanner(); s.pan.value = p; s.connect(root); return s;
      }
      var rain = 1, windExt = false, windV = 0, wind = 1;
      var levelId = LVL[A.ambLevel] ? A.ambLevel : 'gambetta', lv = LVL[levelId];
      function effWind(v) { return clamp(v * lv.wind + lv.windAdd, 0, 1.6); }

      /* garúa: velo de ruido rosa filtrado + lluvia fina + lavado sordo de techos */
      var rainG = ctx.createGain(); rainG.gain.value = lv.rain; rainG.connect(bed);
      var r1 = loop('pink'), h1 = L.filter(ctx, 'highpass', 900, 0.6), l1 = L.filter(ctx, 'lowpass', 6500, 0.5), g1 = ctx.createGain(); g1.gain.value = 0.06;
      r1.connect(h1); h1.connect(l1); l1.connect(g1); g1.connect(rainG);
      var r2 = loop('white', 0.97), b2 = L.filter(ctx, 'bandpass', 4200, 0.5), g2 = ctx.createGain(); g2.gain.value = 0.025;
      r2.connect(b2); b2.connect(g2); g2.connect(rainG);
      var r3 = loop('brown'), b3 = L.filter(ctx, 'bandpass', 520, 0.6), g3 = ctx.createGain(); g3.gain.value = 0.07;
      r3.connect(b3); b3.connect(g3); g3.connect(rainG);
      lfo(0.13, 0.02, g1.gain);                                                                   // la garúa respira
      var lanes = [pan(-0.7), pan(0), pan(0.7)];

      /* viento: ruido pardo con lowpass; el nivel lo maneja setWind (o ráfagas propias) */
      var w1 = loop('brown', 0.8), wl = L.filter(ctx, 'lowpass', 220, 0.8), wg = ctx.createGain(), wm = ctx.createGain();
      wg.gain.value = 0.04; wm.gain.value = 1;
      w1.connect(wl); wl.connect(wg); wg.connect(wm); wm.connect(bed);
      var w2 = loop('pink', 1.1), wb = L.filter(ctx, 'bandpass', 800, 5), wg2 = ctx.createGain();               // silbido entre cables
      wg2.gain.value = 0.0; w2.connect(wb); wb.connect(wg2); wg2.connect(bed);
      lfo(0.07, 50, wl.frequency);
      /* polvo (Cerro): arena que roza, ligada al viento (nada en la Gambetta) */
      var dn = loop('white', 1), dh = L.filter(ctx, 'highpass', 1600, 0.7), dlp = L.filter(ctx, 'lowpass', 3800, 0.6), dg = ctx.createGain(), dFlt = L.filter(ctx, 'bandpass', 2600, 0.5);
      dg.gain.value = 0; dn.connect(dh); dh.connect(dlp); dlp.connect(dg); dg.connect(bed);
      dn.connect(dFlt); var dg2 = ctx.createGain(); dg2.gain.value = 0; dFlt.connect(dg2); dg2.connect(bed); lfo(0.19, 0.002, dg2.gain);
      function dustSet(ev, tc) {
        var tt = ctx.currentTime;
        dg.gain.cancelScheduledValues(tt); dg.gain.setTargetAtTime(lv.dust * (0.003 + 0.045 * ev * ev), tt, tc || 0.5);
        dg2.gain.setTargetAtTime(lv.dust * (0.002 + 0.012 * ev), tt, tc || 0.5);
        dFlt.frequency.setTargetAtTime(2200 + 1800 * ev, tt, 1);
      }
      function windSet(v, tc) {
        var tt = ctx.currentTime;
        v = effWind(v);
        dustSet(v, tc);
        wl.frequency.cancelScheduledValues(tt); wg.gain.cancelScheduledValues(tt); wg2.gain.cancelScheduledValues(tt);
        wl.frequency.setTargetAtTime(220 + 900 * v, tt, tc || 0.5);
        wg.gain.setTargetAtTime(0.04 + 0.1 * v, tt, tc || 0.5);
        wg2.gain.setTargetAtTime(0.05 * v * v, tt, tc || 0.5);
        wb.frequency.setTargetAtTime(700 + 500 * v, tt, 1);
      }

      /* mar y puerto: rumor grave con oleaje lento */
      var seaMul = ctx.createGain(); seaMul.gain.value = lv.sea; seaMul.connect(bed);
      var s1 = loop('brown', 0.7), sl = L.filter(ctx, 'lowpass', 130, 0.7), sg = ctx.createGain(); sg.gain.value = 0.055;
      s1.connect(sl); sl.connect(sg); sg.connect(seaMul); lfo(0.11, 0.02, sg.gain);
      var s2 = loop('pink', 0.8), sl2 = L.filter(ctx, 'lowpass', 420, 0.6), sg2 = ctx.createGain(); sg2.gain.value = 0.04;
      s2.connect(sl2); sl2.connect(sg2); sg2.connect(seaMul); lfo(0.085, 0.035, sg2.gain);

      /* rumor de la ciudad abajo (Cerro): tráfico y motores lejanos como un colchón grave que respira + un poco de siseo urbano */
      var cityG = ctx.createGain(); cityG.gain.value = lv.city; cityG.connect(bed);
      var cy1 = loop('pink', 0.6), cyl = L.filter(ctx, 'lowpass', 480, 0.6), cyg = ctx.createGain(); cyg.gain.value = 0.08; cy1.connect(cyl); cyl.connect(cyg); cyg.connect(cityG); lfo(0.05, 0.02, cyg.gain);
      var cy2 = loop('brown', 0.9), cyl2 = L.filter(ctx, 'bandpass', 120, 0.6), cyg2 = ctx.createGain(); cyg2.gain.value = 0.09; cy2.connect(cyl2); cyl2.connect(cyg2); cyg2.connect(cityG); lfo(0.037, 0.025, cyg2.gain);
      var cy3 = loop('pink', 1.2), cyb = L.filter(ctx, 'bandpass', 1500, 0.5), cyg3 = ctx.createGain(); cyg3.gain.value = 0.004; cy3.connect(cyb); cyb.connect(cyg3); cyg3.connect(cityG); lfo(0.08, 0.002, cyg3.gain);

      /* piscina de zumbidos posicionales */
      var wave = lampWave(ctx), lampV = [], flyV = [], i;
      for (i = 0; i < 3; i++) {
        var lo = ctx.createOscillator(), lg = ctx.createGain(), lp = pan(0), cs = ctx.createBufferSource(), ch = L.filter(ctx, 'highpass', 1800, 0.7), cg = ctx.createGain();
        lo.setPeriodicWave(wave); lo.frequency.value = MAINS * (1 + (i - 1) * 0.004); lo.start(now); oscs.push(lo);
        lg.gain.value = 0; lo.connect(lg); lg.connect(lp);
        cs.buffer = crackleBuf(ctx); cs.loop = true; cs.playbackRate.value = 0.9 + i * 0.1; cs.start(now, rnd() * 2.5); srcs.push(cs);
        cg.gain.value = 0; cs.connect(ch); ch.connect(cg); cg.connect(lg);
        lampV.push({ osc: lo, g: lg, p: lp, cg: cg });
      }
      for (i = 0; i < 2; i++) {
        var fs = ctx.createBufferSource(), fb = L.filter(ctx, 'bandpass', 700, 0.5), fg = ctx.createGain(), fp = pan(0);
        fs.buffer = fliesBuf(ctx); fs.loop = true; fs.playbackRate.value = 0.92 + i * 0.13; fs.start(now, rnd() * 2); srcs.push(fs);
        fg.gain.value = 0; fs.connect(fb); fb.connect(fg); fg.connect(fp); flyV.push({ g: fg, p: fp });
      }
      var em = { lamp: [], flies: [] }, lx = 0, ly = 0, lastUpd = -1;
      function setEm(kind, x, y, on, sub) {
        var arr = em[kind], k, found = -1;
        for (k = 0; k < arr.length; k++) if (Math.abs(arr[k].x - x) < 1 && Math.abs(arr[k].y - y) < 1) { found = k; break; }
        if (on === false) { if (found >= 0) arr.splice(found, 1); } else if (found >= 0) { arr[found].sub = sub; } else arr.push({ x: x, y: y, sub: sub });
        update(true);
      }
      function nearest(arr, n) {
        var res = arr.map(function (e) { var dx = e.x - lx, dy = e.y - ly; return { e: e, d: Math.sqrt(dx * dx + dy * dy), dx: dx }; });
        res.sort(function (a, b) { return a.d - b.d; });
        return res.slice(0, n);
      }
      function update(force) {
        var tt = ctx.currentTime;
        if (!force && tt - lastUpd < 0.1) return;
        lastUpd = tt;
        var k, v, nl = nearest(em.lamp, 3), nf = nearest(em.flies, 2), s, g;
        for (k = 0; k < 3; k++) {
          v = lampV[k]; s = nl[k];
          if (s) {
            g = 1 - clamp((s.d - 60) / 190, 0, 1); g = g * g * (3 - 2 * g);
            var neon = s.e.sub === 'neon';
            v.g.gain.setTargetAtTime(0.04 * g, tt, 0.08); v.cg.gain.setTargetAtTime((neon ? 1.6 : 0.8) * g, tt, 0.08);
            v.osc.frequency.setTargetAtTime(neon ? MAINS * 2 : MAINS * (1 + (k - 1) * 0.004), tt, 0.05);
            if (v.p.pan) v.p.pan.setTargetAtTime(clamp(s.dx / 200, -1, 1), tt, 0.08);
          } else { v.g.gain.setTargetAtTime(0, tt, 0.15); }
        }
        for (k = 0; k < 2; k++) {
          v = flyV[k]; s = nf[k];
          if (s) {
            g = 1 - clamp((s.d - 40) / 150, 0, 1); g = g * g * (3 - 2 * g);
            v.g.gain.setTargetAtTime(0.12 * g, tt, 0.1);
            if (v.p.pan) v.p.pan.setTargetAtTime(clamp(s.dx / 180, -1, 1), tt, 0.1);
          } else { v.g.gain.setTargetAtTime(0, tt, 0.15); }
        }
      }

      /* gotas: buffers precalculados, repartidos en 3 carriles */
      function drip(t) {
        var bs = dripBufs(ctx), s = ctx.createBufferSource(), g = ctx.createGain();
        s.buffer = bs[(rnd() * bs.length) | 0]; s.playbackRate.value = rr(0.8, 1.35);
        g.gain.value = rr(0.15, 0.55) * 0.06 * rain * lv.rain; s.connect(g); g.connect(lanes[(rnd() * 3) | 0]); s.start(t);
      }
      var gustEnd = 0;
      function gust(t, s) {
        t = Math.max(t, gustEnd, ctx.currentTime); s = (s == null ? rr(0.5, 1) : s) * wind * lv.wind;
        var rise = rr(1.5, 3), hold = rr(0.4, 1.2), fall = rr(2, 4);
        wl.frequency.setValueAtTime(220, t); wl.frequency.linearRampToValueAtTime(220 + 900 * s, t + rise);
        wl.frequency.linearRampToValueAtTime(220 + 800 * s, t + rise + hold); wl.frequency.linearRampToValueAtTime(220, t + rise + hold + fall);
        wg.gain.setValueAtTime(0.04, t); wg.gain.linearRampToValueAtTime(0.04 + 0.1 * s, t + rise);
        wg.gain.linearRampToValueAtTime(0.04 + 0.09 * s, t + rise + hold); wg.gain.linearRampToValueAtTime(0.04, t + rise + hold + fall);
        wg2.gain.setValueAtTime(0, t); wg2.gain.linearRampToValueAtTime(0.05 * s * s, t + rise); wg2.gain.linearRampToValueAtTime(0, t + rise + hold + fall);
        dg.gain.setValueAtTime(lv.dust * 0.004, t); dg.gain.linearRampToValueAtTime(lv.dust * (0.004 + 0.05 * s * s), t + rise); dg.gain.linearRampToValueAtTime(lv.dust * 0.004, t + rise + hold + fall);
        gustEnd = t + rise + hold + fall;
        return t;
      }

      /* ciudad muerta lejana */
      var evt = {
        alarm: function (t) {                                       // alarma de auto, lejos y apagada
          var o1 = ctx.createOscillator(), bp = L.filter(ctx, 'bandpass', 1300, 0.9), lp = L.filter(ctx, 'lowpass', 2000, 0.7), g = ctx.createGain(), p = pan(rr(-0.8, 0.8)), x = t, k;
          o1.type = 'square'; o1.frequency.setValueAtTime(700, t);
          for (k = 0; k < 7; k++) { o1.frequency.setValueAtTime(700, x); o1.frequency.linearRampToValueAtTime(1500, x + 0.45); x += 0.45; }
          for (k = 0; k < 10; k++) { o1.frequency.setValueAtTime(k % 2 ? 960 : 640, x); x += 0.2; }
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.009, t + 0.3); g.gain.setValueAtTime(0.009, x - 0.2); g.gain.linearRampToValueAtTime(0, x + 0.1);
          o1.connect(bp); bp.connect(lp); lp.connect(g); g.connect(p); o1.start(t); o1.stop(x + 0.2);
        },
        dog: function (t) {                                         // perro lejano
          var p = pan(rr(-0.9, 0.9)), lp = L.filter(ctx, 'lowpass', 1100, 0.7), g = ctx.createGain(), n = 2 + ((rnd() * 3) | 0), k, tt = t;
          g.gain.value = 0.055; lp.connect(g); g.connect(p);
          for (k = 0; k < n; k++) {
            var f = rr(260, 380), dur = rr(0.2, 0.3);
            L.voice(ctx, lp, tt, { dur: dur, f0: [[0, f * 1.3], [0.2, f * 1.1], [1, f * 0.65]], vowels: [[0, 'u'], [0.2, 'a'], [0.6, 'o'], [1, 'o']], amp: [[0, 0], [0.05, 1], [0.5, 0.75], [1, 0]], bw: 1.4, breath: 0.3, jitter: 0.03, gain: 0.5, drive: 0.3 });
            tt += dur + rr(0.25, 0.7);
          }
        },
        calamina: function (t) {                                    // chapa suelta golpeando con el viento
          var p = pan(rr(-0.8, 0.8)), lp = L.filter(ctx, 'lowpass', 3200, 0.7), g = ctx.createGain(), n = 2 + ((rnd() * 3) | 0), k, tt = t;
          g.gain.value = 0.1; lp.connect(g); g.connect(p);
          for (k = 0; k < n; k++) {
            var f = rr(170, 230), a = rr(0.25, 0.7);
            L.modal(ctx, lp, tt, { freqs: [f, f * 2.31, f * 4.7, f * 8.1, f * 12.6], decays: [0.7, 0.5, 0.35, 0.22, 0.12], gains: [0.12 * a, 0.09 * a, 0.07 * a, 0.05 * a, 0.03 * a], a: 0.002 });
            L.noiseHit(ctx, lp, tt, { type: 'bandpass', f: 1800, q: 1, d: 0.03, gain: 0.05 * a });
            tt += rr(0.35, 1.3);
          }
        },
        chorus: function (t) {                                      // perros del cerro ladrando a coro: uno arranca y los demás le contestan
          var n = 3 + ((rnd() * 3) | 0), k, b, t0, tt, p, lp, g, nb, base, f, dur;
          for (k = 0; k < n; k++) {
            p = pan(rr(-0.95, 0.95)); lp = L.filter(ctx, 'lowpass', rr(700, 1300), 0.7); g = ctx.createGain(); nb = 2 + ((rnd() * 4) | 0); base = rr(200, 430);
            t0 = t + (k ? 0.3 + k * rr(0.25, 0.8) : 0); tt = t0; g.gain.value = rr(0.02, 0.055) * (k ? 1 : 1.2); lp.connect(g); g.connect(p);
            for (b = 0; b < nb; b++) {
              f = base * rr(0.92, 1.08); dur = rr(0.14, 0.3);
              L.voice(ctx, lp, tt, { dur: dur, f0: [[0, f * 1.3], [0.2, f * 1.1], [1, f * 0.65]], vowels: [[0, 'u'], [0.2, 'a'], [0.6, 'o'], [1, 'o']], amp: [[0, 0], [0.05, 1], [0.5, 0.75], [1, 0]], bw: 1.4, breath: 0.3, jitter: 0.03, gain: 0.5, drive: 0.3 });
              tt += dur + rr(0.16, 0.55);
            }
          }
        },
        bocina: function (t) {                                      // bocinazo de combi o mototaxi, muy abajo en la ciudad
          var p = pan(rr(-0.7, 0.7)), lp = L.filter(ctx, 'lowpass', 1100, 0.7), g = ctx.createGain(), n = 1 + ((rnd() * 3) | 0), k, tt = t, f = rr(380, 520);
          g.gain.value = 0.012; lp.connect(g); g.connect(p);
          for (k = 0; k < n; k++) {
            var dd = rr(0.12, 0.35);
            [1, 1.26].forEach(function (m) { var o1 = ctx.createOscillator(), og = ctx.createGain(); o1.type = 'square'; o1.frequency.value = f * m; og.gain.setValueAtTime(0, tt); og.gain.linearRampToValueAtTime(0.5, tt + 0.01); og.gain.setValueAtTime(0.5, tt + dd); og.gain.linearRampToValueAtTime(0, tt + dd + 0.03); o1.connect(og); og.connect(lp); o1.start(tt); o1.stop(tt + dd + 0.1); });
            tt += dd + rr(0.1, 0.3);
          }
        },
        radio: function (t) {                                       // radio de cumbia en algún patio, muy lejos y apagada por el aire y los techos
          var p = pan(rr(-0.9, 0.9)), far = L.filter(ctx, 'lowpass', 1700, 0.6), g = ctx.createGain(), r = radioChain(ctx, far, L, 1), base = rnd() < 0.5 ? 16 * 8 : 16 * 4, k, nSteps = 16 * (3 + ((rnd() * 3) | 0));
          g.gain.value = 0.016; far.connect(g); g.connect(p);
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.016, t + 0.5); g.gain.setValueAtTime(0.016, t + nSteps * RAD.sd - 0.6); g.gain.linearRampToValueAtTime(0, t + nSteps * RAD.sd);
          for (k = 0; k < nSteps; k++) radioStep(ctx, r.inp, t + k * RAD.sd, base + k, L, 1);
        },
        horn: function (t) {                                        // sirena de barco, muy lejos (Callao)
          var p = pan(rr(-0.6, 0.6)), lp = L.filter(ctx, 'lowpass', 420, 0.7), g = ctx.createGain(), k;
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.009, t + 0.5); g.gain.setValueAtTime(0.009, t + 2.1); g.gain.linearRampToValueAtTime(0, t + 3.4);
          lp.connect(g); g.connect(p);
          [98, 146.8, 196].forEach(function (f, i) {
            var o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = f * 1.002; og.gain.value = [1, 0.6, 0.3][i];
            o.connect(og); og.connect(lp); o.start(t); o.stop(t + 3.5);
          });
        }
      };
      function event(name, t) { var f = evt[name]; if (f) f(t == null ? ctx.currentTime + 0.05 : t); }
      var nx = { drip: now + 0.2, gust: now + rr(3, 8), alarm: now + rr(45, 90), dog: now + rr(12, 28), calamina: now + rr(10, 25), horn: now + rr(70, 130), chorus: now + rr(6, 14), bocina: now + rr(15, 40), radio: now + rr(30, 70) };
      function expRand(m) { return -m * Math.log(1 - rnd() * 0.999); }
      function pump(until) {
        if (stopped) return;
        while (nx.drip < until) { drip(nx.drip); nx.drip += expRand(0.5) / Math.max(0.25, rain); }
        if (!windExt) { while (nx.gust < until) { var tg = gust(nx.gust); nx.gust = gustEnd + rr(5, 12); if (rnd() < 0.4) nx.calamina = Math.min(nx.calamina, tg + rr(1, 3)); } }
        if (nx.alarm < until) { evt.alarm(nx.alarm); nx.alarm += rr(90, 200); }
        if (nx.dog < until) { evt.dog(nx.dog); nx.dog += rr(20, 50); }
        if (nx.calamina < until) {
          if (windExt && effWind(windV) < 0.3) nx.calamina = until + 3; else { evt.calamina(nx.calamina); nx.calamina += rr(15, 40); }
        }
        if (nx.horn < until) { if (lv.sea > 0.5) evt.horn(nx.horn); nx.horn += rr(120, 240); }
        if (nx.chorus < until) { if (lv.dogs) evt.chorus(nx.chorus); nx.chorus += rr(14, 34); }
        if (nx.bocina < until) { if (lv.city) evt.bocina(nx.bocina); nx.bocina += rr(18, 50); }
        if (nx.radio < until) { if (lv.radio) evt.radio(nx.radio); nx.radio += rr(55, 110); }
      }
      pump(now + 1.5);
      if (levelId !== 'gambetta') windSet(0, 0.05);
      if (!offline) timer = setInterval(function () { try { pump(ctx.currentTime + 1.5); } catch (e) { /* nada */ } }, 400);

      var ctl = {
        setRain: function (v) { rain = clamp(+v || 0, 0, 1.5); rainG.gain.setTargetAtTime(rain * lv.rain, ctx.currentTime, 0.4); },
        setLevel: function (id) {
          if (!LVL[id]) id = 'gambetta';
          levelId = id; lv = LVL[id]; A.ambLevel = id; A.amb.level = id;
          var tt = ctx.currentTime, tc = 0.8;
          rainG.gain.setTargetAtTime(rain * lv.rain, tt, tc); seaMul.gain.setTargetAtTime(lv.sea, tt, tc); cityG.gain.setTargetAtTime(lv.city, tt, tc);
          windSet(windExt ? windV : 0, tc);
          nx.chorus = Math.min(nx.chorus, tt + rr(4, 9)); nx.radio = Math.min(nx.radio, tt + rr(20, 45)); nx.bocina = Math.min(nx.bocina, tt + rr(8, 20));
        },
        level: function () { return levelId; },
        setWind: function (v) { windExt = true; windV = clamp(+v || 0, 0, 1.5); windSet(windV, 0.5); },
        gust: function (s) { if (!windExt) gust(ctx.currentTime, s); },
        setListener: function (x, y) { lx = x; ly = y; update(false); },
        lampBuzz: function (x, y, on, sub) { setEm('lamp', x, y, on !== false, sub || 'sodium'); },
        flies: function (x, y, on) { setEm('flies', x, y, on !== false); },
        setLamps: function (list) {
          em.lamp = (list || []).map(function (e) { return Array.isArray(e) ? { x: e[0], y: e[1], sub: e[2] || 'sodium' } : { x: e.x, y: e.y, sub: e.sub || 'sodium' }; });
          update(true);
        },
        event: event,
        pump: pump,
        setBed: function (v) { bed.gain.setTargetAtTime(clamp(+v || 0, 0, 2), ctx.currentTime, 0.2); },
        stop: function () {
          if (stopped) return; stopped = true;
          if (timer) clearInterval(timer);
          var tt = ctx.currentTime;
          try { root.gain.cancelScheduledValues(tt); root.gain.setTargetAtTime(0, tt, 0.1); } catch (e) { /* nada */ }
          setTimeout(function () {
            srcs.concat(oscs).forEach(function (s) { try { s.stop(); } catch (e) { /* nada */ } });
            try { root.disconnect(); } catch (e) { /* nada */ }
          }, 600);
        }
      };
      return ctl;
    }
  };
})();
