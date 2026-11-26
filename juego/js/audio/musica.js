var A = ACH.audio = ACH.audio || {};
/* ACHORADO - js/audio/musica.js  (v0.5 + v0.6: orquesta zombie diegética)
 * Dueño: compositor.  ACH.audio.musicEngine: secuenciador con programación anticipada, instrumentos sintetizados
 * y composiciones. Todo es original: melodías, riffs y progresiones escritas para este juego.
 *
 * Tonalidad común: La menor en todos los ánimos (la mayor en el final de fiesta).
 * Rejilla común: una "barra" son 16 pasos. En cumbia (96 bpm) el paso es la semicorchea; en salsa (192 bpm) el paso es
 * la corchea y la barra es un ciclo de clave 2-3 (dos compases). Las dos rejillas duran lo mismo (0,15625 s por paso,
 * 2,5 s por barra), así que el cambio cumbia <-> salsa cae siempre en barra y suena a doble tiempo, no a corte.
 *
 * API: start(ctx, out, reverbSend), setMood(m), setIntensity(v), stinger(name), stop().
 * v0.6: diegetic(x, y, on, mode) = orquesta zombie posicional («Velorio en Clave», 168 bpm, Re menor);
 *       setListener(x, y) = centro de cámara; band() = estado de la orquesta; pauseFilter (null = automático).
 *       Entrada a chase/horde a medio compás o en el pulso (<= ~1,2 s) con anacrusa de timbal; fundido de arranque.
 * v0.8: setNight(on[, secs]) = variante nocturna con fundido de ~8 s (secs = 0: al instante). Explore: medio tiempo (bajo y conga ralos), voicings
 *       oscuros (sextas = menores relativos), más eco y reverb, bordón La1 y güiro suelto; el diegético va más lento y borracho. Chase/horde: stabs de metales
 *       en menor / disminuido y percusión extra a contratiempo, misma rejilla. Todo se mezcla con N(t) (0 día … 1 noche); el script offline acepta {t, night}.
 * v0.9: setLevel('gambetta' | 'cerro'). En el Cerro el explore es otra pieza: «Huayno de la Ladera» (chicha con aire de huayno, 96 bpm, La menor, la misma rejilla de 16 pasos que la cumbia):
 *       ritmo de galope de huayno (corchea, 2 semicorcheas, corchea, corchea), bajo saltarín, güiro, guitarra punteada con eco largo y quena sintetizada (capa nueva `quena`).
 *       La persecución y la horda siguen en salsa brava pero con otra cadencia (Am-G | F-G | Dm-Am | E7) y otro mambo de metales y coro. Mismo La menor y misma rejilla: los cambios
 *       explore <-> chase siguen cayendo en barra con el mismo puente (E-G#-B -> La). setNight funciona igual que en la Gambetta (misma maquinaria N(t)). El script offline acepta {level}.
 * Pruebas: _offline(ctx, out, reverbSend, script, dur) programa todo contra un reloj simulado (OfflineAudioContext).
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------------------------------------
  // utilidades
  var PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function M(name) {               // 'A4', 'C#5', 'Bb3' → midi
    var r = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    return 12 * (+r[3] + 1) + PC[r[1]] + (r[2] === '#' ? 1 : r[2] === 'b' ? -1 : 0);
  }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // melodía: "paso:nota:dur[flags]"  flags: ~ = sube arrastrando desde abajo, v = vibrato, ! = acento
  function P(str) {
    if (!str) return [];
    return str.trim().split(/\s+/).map(function (tok) {
      var p = tok.split(':');
      return { s: +p[0], n: M(p[1]), d: parseFloat(p[2]), f: p[2].replace(/[\d.]/g, '') };
    });
  }
  var seed = 1;
  function rnd() {                  // mulberry32, determinista por arranque
    seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function hum(v, a) { return v * (1 - a + 2 * a * rnd()); }

  // acordes: símbolo → clases de altura
  var Q = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], '6': [0, 4, 7, 9] };
  var chordCache = {};
  function chord(sym) {
    if (chordCache[sym]) return chordCache[sym];
    var r = /^([A-G])([#b]?)(.*)$/.exec(sym);
    var root = (PC[r[1]] + (r[2] === '#' ? 1 : r[2] === 'b' ? -1 : 0) + 12) % 12;
    var pcs = Q[r[3]].map(function (i) { return (root + i) % 12; });
    return (chordCache[sym] = { root: root, pcs: pcs, sym: sym });
  }
  function isTone(c, m) { return c.pcs.indexOf(((m % 12) + 12) % 12) >= 0; }
  function rootIn(c, lo) { var m = lo; while (((m % 12) + 12) % 12 !== c.root) m++; return m; }   // primera raíz >= lo
  function below(c, m) { var k = m - 1; while (!isTone(c, k)) k--; return k; }                  // tono del acorde inmediatamente debajo
  function voicing(c, lo, n) { var out = [], k = lo; while (out.length < n) { if (isTone(c, k)) out.push(k); k++; } return out; }
  // tercera diatónica debajo, en La menor (sobre E7 / E, sol sostenido)
  function thirdBelow(m, c, major) {
    var sc = [9, 11, 0, 2, 4, 5, 7];
    if (c && c.root === 4) sc = [9, 11, 0, 2, 4, 5, 8];
    if (major) sc = [9, 11, 1, 2, 4, 6, 8];                                  // La mayor
    var k = m, steps = 0;
    while (steps < 2) { k--; if (sc.indexOf(((k % 12) + 12) % 12) >= 0) steps++; }
    return k;
  }

  // ---------------------------------------------------------------------------------------------------------
  // estado
  var S = null;               // todo lo que vive mientras suena
  var wantMood = 'title', wantI = 0;
  var wantBand = null;                         // orquesta pedida antes de arrancar
  var wantNight = false;                       // noche pedida antes de arrancar
  var wantLevel = 'gambetta';                  // v0.9: nivel pedido (también antes de arrancar)
  var gLX = 240, gLY = 135, gLSet = false;     // oyente (centro de cámara) del juego en vivo

  function now() { return S.offline ? S.vnow : S.ctx.currentTime; }

  // v0.8: la noche. S.nTarget (0|1), S.nFrom, S.nT0, S.nTc: N(t) = objetivo + (desde - objetivo) * e^(-(t - t0) / tc), con tc = segundos / 3 (95 % a los 8 s).
  function nightAt(t) { if (!S) return 0; var d = t - S.nT0; return d <= 0 ? S.nFrom : S.nTarget + (S.nFrom - S.nTarget) * Math.exp(-d / S.nTc); }
  function nightOn() { return !!S && (S.nTarget > 0.5 || nightAt(now()) > 0.15); }
  function nightX(t) { return S && S.mood === 'explore' ? nightAt(t) : 0; }      // solo el explore se vuelve medio tiempo
  // multiplicador de cada capa de noche (1 = igual que de día). Solo el explore se apaga: lo nocturno entra por la capa 'nperc' y el bordón.
  var NM = { explore: { guiro: 0.22, rhythm: 0.55, lead: 0.62, lead2: 0, conga: 0.5, timb: 0.3, bass: 0.9 } };
  var DRONE = { explore: 0.12, chase: 0.08, horde: 0.08 };
  var DARK = { Am: 'Am7', Dm: 'Dm7', G: 'G6', F: 'F6', C: 'C6', E7: 'E7' };      // sextas = séptimas menores del relativo: acordes más oscuros con la misma raíz
  function darker(ch) { return chord(DARK[ch.sym] || ch.sym); }

  // ---------------------------------------------------------------------------------------------------------
  // DSP en JS para muestras precalculadas (percusión, piano, guitarra Karplus-Strong)
  function biq(x, type, f, q, sr) {
    var w = 2 * Math.PI * Math.min(f, sr * 0.45) / sr, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    var b0, b1, b2, a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; }
    else { b0 = al; b1 = 0; b2 = -al; }
    b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
    var x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (var i = 0; i < x.length; i++) {
      var xi = x[i], y = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = xi; y2 = y1; y1 = y; x[i] = y;
    }
    return x;
  }
  function noise(n) { var d = new Float32Array(n); for (var i = 0; i < n; i++) d[i] = rnd() * 2 - 1; return d; }
  function norm(d, peak) {
    var m = 0, i; for (i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
    if (m > 0) { var k = peak / m; for (i = 0; i < d.length; i++) d[i] *= k; }
    var fade = Math.min(d.length, Math.floor(S.sr * 0.01));      // sin clic al final
    for (i = 0; i < fade; i++) d[d.length - 1 - i] *= i / fade;
    return d;
  }
  function toBuf(d) { var b = S.ctx.createBuffer(1, d.length, S.sr); b.getChannelData(0).set(d); return b; }

  // parche (membrana o casco): modos inharmónicos + golpe de ruido filtrado + caída de afinación
  function drum(f, dur, modes, bend, nz) {
    var sr = S.sr, n = Math.ceil(dur * sr), d = new Float32Array(n), ph = modes.map(function () { return rnd() * 0.2; });
    for (var i = 0; i < n; i++) {
      var t = i / sr, b = 1 + bend * Math.exp(-t / 0.012), y = 0;
      for (var k = 0; k < modes.length; k++) {
        var md = modes[k];
        ph[k] += 2 * Math.PI * f * md[0] * b / sr;
        y += md[1] * Math.exp(-t / md[2]) * Math.sin(ph[k]);
      }
      d[i] = y;
    }
    if (nz) {
      var nn = noise(n); biq(nn, 'bp', nz[1], nz[2], sr); biq(nn, 'bp', nz[1], nz[2], sr);
      for (i = 0; i < n; i++) d[i] += nz[0] * 3 * nn[i] * Math.exp(-i / sr / nz[3]);
    }
    var att = Math.floor(sr * 0.0007);
    for (i = 0; i < att; i++) d[i] *= i / att;
    return norm(d, 0.9);
  }
  // campana: dos parciales metálicos (onda cuadrada de pocos armónicos), filtro de banda, doble caída
  function bell(f1, f2, tA, tB, bp, dur) {
    var sr = S.sr, n = Math.ceil(dur * sr), d = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var t = i / sr, y = 0;
      for (var h = 1; h <= 7; h += 2) y += (Math.sin(2 * Math.PI * f1 * h * t) + 0.8 * Math.sin(2 * Math.PI * f2 * h * t + 1)) / h;
      d[i] = y * (0.7 * Math.exp(-t / tA) + 0.3 * Math.exp(-t / tB));
    }
    biq(d, 'bp', bp, 1.1, sr); biq(d, 'hp', 350, 0.7, sr); biq(d, 'lp', 6000, 0.7, sr);
    return norm(d, 0.9);
  }
  // güiro: tren de crestas sobre ruido de banda alta; la velocidad de raspado acelera un poco
  function guiro(dur, ridges, accel) {
    var sr = S.sr, n = Math.ceil((dur + 0.03) * sr), nz = noise(n), env = new Float32Array(n), i, r;
    biq(nz, 'bp', 3600, 0.8, sr); biq(nz, 'hp', 1400, 0.7, sr); biq(nz, 'lp', 7000, 0.7, sr);
    for (r = 0; r < ridges; r++) {
      var ti = dur * Math.pow(r / ridges, accel) + (rnd() - 0.5) * 0.002, i0 = Math.max(0, Math.floor(ti * sr)), a = 0.7 + 0.3 * rnd();
      for (i = i0; i < Math.min(n, i0 + Math.floor(0.012 * sr)); i++) env[i] += a * Math.exp(-(i - i0) / sr / 0.0022);
    }
    for (i = 0; i < n; i++) {
      var t = i / sr, sw = t < dur ? Math.pow(Math.sin(Math.PI * Math.min(1, t / dur * 0.9 + 0.05)), 0.5) : Math.exp(-(t - dur) / 0.006);
      nz[i] *= (env[i] + 0.12) * sw;
    }
    return norm(nz, 0.9);
  }
  function chuckNoise() {
    var sr = S.sr, n = Math.ceil(0.05 * sr), d = noise(n);
    biq(d, 'bp', 1900, 1.2, sr); biq(d, 'lp', 4000, 0.7, sr);
    for (var i = 0; i < n; i++) d[i] *= Math.exp(-i / sr / 0.009);
    return norm(d, 0.9);
  }

  // Karplus-Strong: cuerda pulsada con excitación filtrada y posición de púa; devuelve buffer + playbackRate de afinación
  var KS = {
    lead:  { bright: 0.8, t60: 2.4, dur: 2.2, pick: 0.18 },
    title: { bright: 0.62, t60: 3.0, dur: 2.8, pick: 0.22 },
    solo:  { bright: 0.5, t60: 3.6, dur: 3.6, pick: 0.25 },
    clean: { bright: 0.55, t60: 0.9, dur: 0.9, pick: 0.2 },
    mute:  { bright: 0.42, t60: 0.09, dur: 0.16, pick: 0.15 }
  };
  function ks(midi, kind) {
    var key = kind + midi;
    if (S.cache[key]) return S.cache[key];
    var o = KS[kind], sr = S.sr, f = hz(midi);
    var N = Math.max(2, Math.floor(sr / f - 0.5)), f0 = sr / (N + 0.5);
    var n = Math.ceil(o.dur * sr), y = new Float32Array(n), ex = noise(N), i, lp = 0, a = 0.08 + 0.9 * o.bright * o.bright;
    for (i = 0; i < N; i++) { lp += a * (ex[i] - lp); ex[i] = lp; }
    var p = Math.max(1, Math.floor(N * o.pick)), ex2 = new Float32Array(N), mean = 0;
    for (i = 0; i < N; i++) { ex2[i] = ex[i] - 0.9 * ex[(i - p + N) % N]; mean += ex2[i]; }
    mean /= N;
    var g = Math.pow(10, -3 / (o.t60 * f0));
    for (i = 0; i < n; i++) {
      var x = i < N ? ex2[i] - mean : 0;
      var fb = i > N ? 0.5 * (y[i - N] + y[i - N - 1]) : (i === N ? 0.5 * y[0] : 0);
      y[i] = x + g * fb;
    }
    biq(y, 'hp', 70, 0.7, sr);
    norm(y, 0.9);
    return (S.cache[key] = { buf: toBuf(y), rate: f / f0 });
  }

  // piano: aditivo con inarmonicidad, dos cuerdas levemente desafinadas por parcial, doble caída y martillo
  function piano(midi) {
    var key = 'pno' + midi;
    if (S.cache[key]) return S.cache[key];
    var sr = S.sr, f = hz(midi), dur = 1.2, n = Math.ceil(dur * sr), d = new Float32Array(n), B = 0.00035;
    var nk = Math.min(9, Math.floor(6500 / f)), i, k, s;
    for (k = 1; k <= nk; k++) {
      var fk = f * k * Math.sqrt(1 + B * k * k), ak = Math.pow(k, -1.25) * (1 - 0.06 * k) * (k === 1 ? 0.9 : 1);
      if (ak <= 0) continue;
      var tf = 0.09 + 0.25 / k, ts = Math.max(0.12, 1.6 * Math.pow(0.5, (midi - 60) / 24) / (0.7 + 0.3 * k));
      var df = Math.exp(-1 / (sr * tf)), ds = Math.exp(-1 / (sr * ts)), ef = 0.55 * ak, es = 0.45 * ak;
      for (s = 0; s < 2; s++) {           // dos cuerdas por nota, levemente desafinadas (batido)
        var w = 2 * Math.PI * fk * (s ? 1.0007 : 1) / sr, c2 = 2 * Math.cos(w), ph = rnd() * 6, amp = s ? 0.7 : 1;
        var y1 = Math.sin(ph - w), y2 = Math.sin(ph - 2 * w), e1 = ef * amp, e2 = es * amp;
        for (i = 0; i < n; i++) {
          var y = c2 * y1 - y2; y2 = y1; y1 = y;
          d[i] += (e1 + e2) * y; e1 *= df; e2 *= ds;
        }
      }
    }
    var hm = noise(Math.floor(0.03 * sr)); biq(hm, 'lp', 2200 + f, 0.8, sr);
    for (i = 0; i < hm.length; i++) d[i] += 0.35 * hm[i] * Math.exp(-i / sr / 0.005);
    for (i = 0; i < Math.floor(0.025 * sr); i++) d[i] += 0.25 * Math.sin(2 * Math.PI * 70 * i / sr) * Math.exp(-i / sr / 0.008);
    var att = Math.floor(sr * 0.001); for (i = 0; i < att; i++) d[i] *= i / att;
    biq(d, 'lp', 6500, 0.7, sr);
    norm(d, 0.9);
    return (S.cache[key] = toBuf(d));
  }

  function buildSamples() {
    var B = S.buf = {};
    // congas (conga 205 Hz, tumba 152 Hz)
    var CO = 205, TU = 152;
    B.cOpen = toBuf(drum(CO, 0.6, [[1, 1, 0.2], [1.59, 0.25, 0.07], [2.14, 0.1, 0.04]], 0.05, [0.3, 1300, 0.8, 0.008]));
    B.tOpen = toBuf(drum(TU, 0.7, [[1, 1, 0.24], [1.59, 0.22, 0.08], [2.14, 0.08, 0.04]], 0.05, [0.25, 1100, 0.8, 0.008]));
    B.cSlap = toBuf(drum(CO, 0.25, [[1, 0.45, 0.05], [1.59, 0.5, 0.035], [2.3, 0.4, 0.025], [3.1, 0.2, 0.02]], 0.02, [1.1, 2500, 0.7, 0.016]));
    B.cMute = toBuf(drum(CO * 1.08, 0.15, [[1, 1, 0.032], [1.6, 0.3, 0.018]], 0.02, [0.35, 900, 1, 0.006]));
    B.cHeel = toBuf(drum(CO * 0.75, 0.15, [[1, 1, 0.045]], 0.01, [0.12, 500, 1, 0.006]));
    B.cToe = toBuf(drum(CO * 1.1, 0.1, [[1, 0.6, 0.02]], 0.01, [0.6, 1800, 1, 0.005]));
    // bongó (macho 430, hembra 310)
    B.bMacho = toBuf(drum(430, 0.35, [[1, 1, 0.1], [1.6, 0.35, 0.04]], 0.05, [0.4, 2600, 0.9, 0.006]));
    B.bHembra = toBuf(drum(310, 0.4, [[1, 1, 0.13], [1.6, 0.3, 0.05]], 0.05, [0.35, 2200, 0.9, 0.006]));
    B.bFing = toBuf(drum(450, 0.12, [[1, 0.6, 0.025]], 0.01, [0.7, 2800, 1, 0.005]));
    // timbales (macho 545, hembra 405), rim, cáscara, campana
    var tm = [[1, 1, 0.4], [1.47, 0.5, 0.25], [1.98, 0.35, 0.18], [2.44, 0.25, 0.11], [3.05, 0.15, 0.07]];
    B.tH = toBuf(drum(545, 0.8, tm, 0.015, [0.6, 3200, 0.7, 0.006]));
    B.tL = toBuf(drum(405, 0.9, tm, 0.015, [0.6, 2800, 0.7, 0.006]));
    B.tRim = toBuf(drum(545, 0.8, [[1, 0.8, 0.35], [1.47, 0.5, 0.2], [2.44, 0.7, 0.12], [3.6, 0.3, 0.05]], 0.02, [1.4, 3800, 0.6, 0.02]));
    B.casc = toBuf(drum(1350, 0.12, [[1, 0.5, 0.02], [1.7, 0.2, 0.012]], 0, [1.2, 3400, 1.4, 0.011]));
    B.clave = toBuf(drum(2350, 0.12, [[1, 1, 0.042], [2.7, 0.1, 0.01]], 0, [0.15, 3000, 1, 0.003]));
    B.campana = toBuf(bell(820, 1235, 0.015, 0.22, 1500, 0.7));
    B.cenM = toBuf(bell(565, 838, 0.022, 0.26, 1050, 0.8));
    B.cenN = toBuf(bell(590, 872, 0.012, 0.07, 1450, 0.35));
    // güiro: tres variantes de cada uno
    B.gL = [0, 1, 2].map(function () { return toBuf(guiro(0.2, 12, 0.92)); });
    B.gLs = [0, 1, 2].map(function () { return toBuf(guiro(0.15, 9, 0.92)); });
    B.gS = [0, 1, 2].map(function () { return toBuf(guiro(0.045, 4, 1)); });
    B.chk = toBuf(chuckNoise());
    B.qn = toBuf(noise(2 * S.sr));                    // v0.9: soplo de la quena (ruido blanco de 2 s, en bucle)
    // guitarra y piano: precalentar el registro que se usa
    var m;
    for (m = M('C4'); m <= M('C6'); m++) ks(m, 'lead');
    for (m = M('G3'); m <= M('E5'); m++) ks(m, 'mute');
    for (m = M('E3'); m <= M('C6'); m++) piano(m);
  }

  // impulso de reverb de resorte (cuerpo de amplificador): ruido con ecos dispersos cada ~31 ms, banda metálica
  function springIR() {
    var sr = S.sr, n = Math.floor(sr * 1.0), b = S.ctx.createBuffer(2, n, sr);
    for (var ch = 0; ch < 2; ch++) {
      var d = noise(n), D = Math.floor((0.031 + ch * 0.0023) * sr), i;
      for (i = 0; i < n; i++) d[i] *= Math.exp(-i / sr / 0.32) * 0.6;
      for (i = D; i < n; i++) d[i] += 0.55 * d[i - D];
      biq(d, 'bp', 2100, 0.6, sr); biq(d, 'lp', 4200, 0.7, sr);
      for (i = 0; i < n; i++) d[i] *= Math.exp(-i / sr / 0.4);
      norm(d, 0.5);
      b.getChannelData(ch).set(d);
    }
    return b;
  }
  function roomIR() {                 // solo si el motor no nos da reverbSend (pruebas)
    var sr = S.sr, n = Math.floor(sr * 1.2), b = S.ctx.createBuffer(2, n, sr);
    for (var ch = 0; ch < 2; ch++) {
      var d = b.getChannelData(ch), lp = 0;
      for (var i = 0; i < n; i++) { var t = i / sr; lp += (rnd() * 2 - 1 - lp) * (0.55 - 0.5 * t / 1.2); d[i] = lp * Math.exp(-t * 5.2) * (t < 0.004 ? t / 0.004 : 1); }
    }
    return b;
  }

  // ---------------------------------------------------------------------------------------------------------
  // mezcla
  //  capa → fade(gain) → panorama → preBus → brillo cálido → paso bajo de pausa → ganancia de pausa → compresor → trim → out
  //  envíos de reverb: sendBus → (paso bajo de pausa) → reverbSend del motor (o sala propia en pruebas)
  var LAYERS = {
    guiro:  { vol: 0.5, pan: 0.38, send: 0.15 },
    bass:   { vol: 0.28, pan: 0.0, send: 0.0 },
    rhythm: { vol: 1.0, pan: 0.42, send: 0.12, spring: 0.25 },
    lead:   { vol: 0.28, pan: -0.22, send: 0.18 },
    lead2:  { vol: 0.17, pan: 0.3, send: 0.18 },
    solo:   { vol: 0.42, pan: 0.0, send: 0.35 },
    conga:  { vol: 0.3, pan: -0.36, send: 0.12 },
    timb:   { vol: 0.32, pan: 0.32, send: 0.18 },
    bell:   { vol: 0.33, pan: -0.12, send: 0.1 },
    bongo:  { vol: 0.28, pan: 0.18, send: 0.12 },
    clave:  { vol: 0.14, pan: 0.5, send: 0.1 },
    piano:  { vol: 0.23, pan: -0.2, send: 0.16 },
    brass:  { vol: 0.11, pan: 0.08, send: 0.3 },
    coro:   { vol: 0.85, pan: 0.0, send: 0.4 },
    fill:   { vol: 0.3, pan: 0.32, send: 0.18 },
    stg:    { vol: 0.45, pan: 0.0, send: 0.25 },
    nperc:  { vol: 0.5, pan: 0.36, send: 0.35 },         // v0.8: percusión nocturna (güiro suelto, contratiempos); siempre abierta, la dosifica N(t)
    quena:  { vol: 0.2, pan: 0.28, send: 0.4 }           // v0.9: quena del Cerro (flauta andina sintetizada), con eco y reverb largos
  };
  var ALWAYS = { fill: 1, stg: 1, nperc: 1 };
  var TRIM = 0.62;

  function build(ctx, out, reverbSend) {
    var c = ctx, n = {};
    n.pre = c.createGain();
    n.warm = c.createBiquadFilter(); n.warm.type = 'highshelf'; n.warm.frequency.value = 6500; n.warm.gain.value = -4;
    n.lowc = c.createBiquadFilter(); n.lowc.type = 'highpass'; n.lowc.frequency.value = 32; n.lowc.Q.value = 0.7;
    n.duck = c.createGain();             // la banda sonora baja cerca de la orquesta zombie
    n.plp = c.createBiquadFilter(); n.plp.type = 'lowpass'; n.plp.frequency.value = 20000; n.plp.Q.value = 0.6;
    n.pg = c.createGain();
    n.comp = c.createDynamicsCompressor();
    n.comp.threshold.value = -16; n.comp.knee.value = 8; n.comp.ratio.value = 3; n.comp.attack.value = 0.006; n.comp.release.value = 0.2;
    n.trim = c.createGain(); n.trim.gain.value = TRIM;
    n.pre.connect(n.lowc); n.lowc.connect(n.warm); n.warm.connect(n.duck); n.duck.connect(n.plp); n.plp.connect(n.pg); n.pg.connect(n.comp); n.comp.connect(n.trim); n.trim.connect(out);
    // reverb
    n.send = c.createGain();
    n.slp = c.createBiquadFilter(); n.slp.type = 'lowpass'; n.slp.frequency.value = 20000;
    n.sg = c.createGain();
    n.send.connect(n.slp); n.slp.connect(n.sg);
    if (reverbSend) { n.sg.gain.value = TRIM; n.sg.connect(reverbSend); }
    else { var rc = c.createConvolver(); rc.buffer = roomIR(); var rr = c.createGain(); rr.gain.value = 0.32; n.sg.connect(rc); rc.connect(rr); rr.connect(n.pre); n.sg.gain.value = 1; }
    // resorte para guitarras
    n.spring = c.createConvolver(); n.spring.buffer = springIR();
    n.springRet = c.createGain(); n.springRet.gain.value = 0.5;
    n.spring.connect(n.springRet); n.springRet.connect(n.pre);
    // capas
    n.L = {};
    Object.keys(LAYERS).forEach(function (k) {
      var d = LAYERS[k], g = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : null;
      g.gain.value = ALWAYS[k] ? d.vol : 0;
      if (pan) { pan.pan.value = d.pan; g.connect(pan); pan.connect(n.pre); } else g.connect(n.pre);
      if (d.send) { var s = c.createGain(); s.gain.value = d.send; g.connect(s); s.connect(n.send); }
      if (d.spring) { var sp = c.createGain(); sp.gain.value = d.spring; g.connect(sp); sp.connect(n.spring); }
      var nm = c.createGain(); nm.gain.value = 1; nm.connect(g);       // v0.8: multiplicador nocturno de la capa (antes del fade, de los ecos y del resorte)
      n.L[k] = { fade: g, input: nm, nm: nm, on: !!ALWAYS[k] };
    });
    // cadena de guitarra eléctrica chicha (lead, lead2, solo): saturación suave → EQ → trémolo → capa; eco y resorte después
    var cv = new Float32Array(1024); for (var i = 0; i < 1024; i++) { var x = i / 511.5 - 1; cv[i] = Math.tanh(1.8 * x) / Math.tanh(1.8); }
    ['lead', 'lead2', 'solo'].forEach(function (k) {
      var inp = c.createGain(), dr = c.createWaveShaper(), eq1 = c.createBiquadFilter(), eq2 = c.createBiquadFilter(), trem = c.createGain();
      dr.curve = cv; dr.oversample = '2x';
      eq1.type = 'peaking'; eq1.frequency.value = 850; eq1.Q.value = 0.9; eq1.gain.value = 3;
      eq2.type = 'lowpass'; eq2.frequency.value = 4600; eq2.Q.value = 0.6;
      inp.connect(dr); dr.connect(eq1); eq1.connect(eq2); eq2.connect(trem); trem.connect(n.L[k].nm);
      n.L[k].input = inp; n.L[k].trem = trem;
    });
    // trémolo compartido (LFO → profundidad → ganancia de cada guitarra)
    n.tlfo = c.createOscillator(); n.tlfo.frequency.value = 6;
    n.tdepth = c.createGain(); n.tdepth.gain.value = 0;
    n.tlfo.connect(n.tdepth);
    ['lead', 'lead2', 'solo'].forEach(function (k) { n.tdepth.connect(n.L[k].trem.gain); });
    n.tlfo.start();
    // eco corto (slapback) y eco largo a tiempo, ambos oscuros, desde la salida de las guitarras
    function delay(t, fb, lp) {
      var dl = c.createDelay(2), f = c.createGain(), l = c.createBiquadFilter(), inG = c.createGain();
      dl.delayTime.value = t; f.gain.value = fb; l.type = 'lowpass'; l.frequency.value = lp;
      inG.connect(dl); dl.connect(l); l.connect(f); f.connect(dl); l.connect(n.pre);
      return { inp: inG, dl: dl, fb: f };
    }
    n.slap = delay(0.112, 0.16, 3000);
    n.echo = delay(0.5, 0.33, 2300);
    n.slapG = c.createGain(); n.slapG.gain.value = 0.32;
    n.echoG = c.createGain(); n.echoG.gain.value = 0;
    n.sprG = c.createGain(); n.sprG.gain.value = 0.35;
    ['lead', 'lead2', 'solo'].forEach(function (k) { var f = n.L[k].fade; f.connect(n.slapG); f.connect(n.echoG); f.connect(n.sprG); });
    n.L.quena.fade.connect(n.echoG); n.L.quena.fade.connect(n.sprG);          // v0.9: la quena también va al eco largo y al resorte
    n.slapG.connect(n.slap.inp); n.echoG.connect(n.echo.inp); n.sprG.connect(n.spring);
    // metales: EQ cálido
    n.brassIn = c.createGain();
    var bq1 = c.createBiquadFilter(); bq1.type = 'peaking'; bq1.frequency.value = 1300; bq1.Q.value = 0.8; bq1.gain.value = 2;
    var bq2 = c.createBiquadFilter(); bq2.type = 'highshelf'; bq2.frequency.value = 4500; bq2.gain.value = -6;
    n.brassIn.connect(bq1); bq1.connect(bq2); bq2.connect(n.L.brass.fade);
    n.stgBrass = c.createGain();          // stingers de metal: EQ propio, a la capa stg (no dependen del fade de 'brass')
    var sq1 = c.createBiquadFilter(); sq1.type = 'highshelf'; sq1.frequency.value = 4500; sq1.gain.value = -6;
    n.stgBrass.connect(sq1); sq1.connect(n.L.stg.fade);
    // coro: suma de voces → banco de 3 formantes en paralelo
    n.coroIn = c.createGain();
    n.form = [0, 1, 2].map(function (k) {
      var f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'bandpass'; f.Q.value = [5, 8, 10][k]; f.frequency.value = [730, 1090, 2440][k];
      g.gain.value = [1.6, 1.0, 0.45][k];
      n.coroIn.connect(f); f.connect(g); g.connect(n.L.coro.fade);
      return f;
    });
    n.cvib = c.createOscillator(); n.cvib.frequency.value = 5.3; n.cvibG = c.createGain(); n.cvibG.gain.value = 9;
    n.cvib.connect(n.cvibG); n.cvib.start();
    // ondas
    var re = new Float32Array([0, 0, 0, 0, 0, 0, 0]), im = new Float32Array([0, 1, 0.45, 0.22, 0.1, 0.05, 0.025]);
    n.bassWave = c.createPeriodicWave(re, im);
    // v0.8: bordón nocturno (La1 + La2 con un batido lento), siempre corriendo y mudo de día; el nivel lo pone applyNight
    n.drone = c.createGain(); n.drone.gain.value = 0;
    var dlp = c.createBiquadFilter(), dsend = c.createGain();
    dlp.type = 'lowpass'; dlp.frequency.value = 240; dlp.Q.value = 0.6; dsend.gain.value = 0.2;
    dlp.connect(n.drone); n.drone.connect(n.pre); n.drone.connect(dsend); dsend.connect(n.send);
    n.droneOsc = [[55, 'sine', 0.55], [55.16, 'sine', 0.45], [110, 'triangle', 0.22], [110.27, 'sawtooth', 0.07]].map(function (x) {
      var o = c.createOscillator(), g = c.createGain(); o.type = x[1]; o.frequency.value = x[0]; g.gain.value = x[2]; o.connect(g); g.connect(dlp); o.start(); return o;
    });
    var dl = c.createOscillator(), dg = c.createGain(); dl.frequency.value = 0.055; dg.gain.value = 70; dl.connect(dg); dg.connect(dlp.frequency); dl.start(); n.droneOsc.push(dl);
    return n;
  }

  // ---------------------------------------------------------------------------------------------------------
  // instrumentos en tiempo real (cada nota crea sus nodos justo antes de sonar)
  function layerIn(name) { return typeof name === 'string' ? S.n.L[name].input : name; }   // capa del score o nodo directo (orquesta)
  function play(t, buf, layer, vel, rate) {
    var c = S.ctx, s = c.createBufferSource(), g = c.createGain();
    s.buffer = buf; if (rate) s.playbackRate.value = rate;
    g.gain.value = vel; s.connect(g); g.connect(layerIn(layer)); s.start(t);
  }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }

  // guitarra eléctrica chicha con auto-wah por nota
  function gtr(t, midi, dur, o) {
    o = o || {};
    var c = S.ctx, kind = o.kind || 'lead', k = ks(midi, kind), s = c.createBufferSource();
    s.buffer = k.buf;
    var r = k.rate;
    if (o.scoop) { s.playbackRate.setValueAtTime(r * 0.891, t); s.playbackRate.setTargetAtTime(r, t + 0.015, 0.045); }   // arrastre desde un tono abajo
    else if (o.slide) { s.playbackRate.setValueAtTime(r * 0.944, t); s.playbackRate.linearRampToValueAtTime(r, t + 0.05); }
    else s.playbackRate.value = r;
    var stopAt = t + Math.min(dur + 0.35, k.buf.duration);
    if (o.vib && dur > 0.3) {
      var l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = 5.4; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(r * 0.009, t + Math.min(0.5, dur * 0.6));
      l.connect(lg); lg.connect(s.playbackRate); l.start(t); l.stop(stopAt);
    }
    var env = c.createGain(), vel = o.vel || 0.8;
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(vel, t + 0.003);
    env.gain.setTargetAtTime(0, t + dur, 0.05);
    var wah = o.wah === undefined ? 1 : o.wah;
    if (wah > 0) {
      var bp = c.createBiquadFilter(), dry = c.createGain();
      bp.type = 'bandpass'; bp.Q.value = 2.6;
      var lo = 420, hi = 420 + 1700 * wah;
      bp.frequency.setValueAtTime(lo, t); bp.frequency.exponentialRampToValueAtTime(hi, t + 0.055);
      bp.frequency.setTargetAtTime(lo * 1.6, t + 0.06, Math.max(0.08, dur * 0.4));
      dry.gain.value = 0.35;
      var bpg = c.createGain(); bpg.gain.value = 2.2;
      s.connect(bp); bp.connect(bpg); bpg.connect(env); s.connect(dry); dry.connect(env);
    } else {
      var lpf = c.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 2800; lpf.Q.value = 0.5;
      s.connect(lpf); lpf.connect(env);
    }
    env.connect(layerIn(o.layer || 'lead'));
    s.start(t); s.stop(stopAt);
  }
  // guitarra rítmica: rasgueo de 3 cuerdas apagadas (chuck) o abiertas
  function strum(t, notes, kind, vel, up) {
    var c = S.ctx, i, ord = up ? notes.slice().reverse() : notes;
    for (i = 0; i < ord.length; i++) {
      var k = ks(ord[i], kind), s = c.createBufferSource(), g = c.createGain();
      s.buffer = k.buf; s.playbackRate.value = k.rate;
      g.gain.value = vel * (0.55 + 0.15 * i / ord.length);
      s.connect(g); g.connect(layerIn('rhythm')); s.start(t + i * 0.007);
    }
    if (kind === 'mute') play(t, S.buf.chk, 'rhythm', vel * 0.45);
  }
  // bajo eléctrico (cumbia: púa brillante; tumbao: redondo, entra deslizando)
  function bass(t, midi, dur, vel, tumbao, dest) {
    var c = S.ctx, o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(), f = hz(midi);
    o.setPeriodicWave(S.n.bassWave);
    if (tumbao) { o.frequency.setValueAtTime(f * 0.97, t); o.frequency.setTargetAtTime(f, t, 0.012); }
    else o.frequency.value = f;
    lp.type = 'lowpass'; lp.Q.value = 1.1;
    lp.frequency.setValueAtTime(tumbao ? 900 : 1500, t); lp.frequency.setTargetAtTime(tumbao ? 320 : 420, t + 0.01, 0.1);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.006);
    g.gain.setTargetAtTime(vel * 0.55, t + 0.02, 0.28);
    g.gain.setTargetAtTime(0, t + dur, 0.035);
    o.connect(lp); lp.connect(g); g.connect(dest || layerIn('bass'));
    o.start(t); o.stop(t + dur + 0.3);
  }
  function pno(t, notes, dur, vel) {
    var c = S.ctx;
    for (var i = 0; i < notes.length; i++) {
      var s = c.createBufferSource(), g = c.createGain();
      s.buffer = piano(notes[i]);
      g.gain.setValueAtTime(vel, t); g.gain.setTargetAtTime(0, t + dur, 0.06);
      s.connect(g); g.connect(layerIn('piano')); s.start(t + i * 0.002); s.stop(t + dur + 0.4);
    }
  }
  // metal: trompeta o trombón = pila de sierras desafinadas + filtro con envolvente ("blat") + arrastre de afinación
  function horn(t, midi, dur, o) {
    o = o || {};
    var c = S.ctx, tbn = o.tbn, f = hz(midi), vel = (o.vel || 0.8) * (tbn ? 1.15 : 1);
    var lp = c.createBiquadFilter(), g = c.createGain(), end = t + dur, stop = end + 0.4;
    lp.type = 'lowpass'; lp.Q.value = 1.3;
    var top = Math.min(f * (tbn ? 5.5 : 6.5), tbn ? 2400 : 4600) * (o.bright || 1), sus = Math.min(f * (tbn ? 3.2 : 3.8), tbn ? 1600 : 3000) * (o.bright || 1);
    lp.frequency.setValueAtTime(f * 1.2, t); lp.frequency.linearRampToValueAtTime(top, t + (tbn ? 0.045 : 0.03));
    lp.frequency.setTargetAtTime(sus, t + 0.05, 0.1);
    var att = tbn ? 0.035 : 0.022, pk = vel * (o.acc ? 1.25 : 1.05);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + att);
    g.gain.setTargetAtTime(vel * 0.72, t + att, 0.07);
    if (o.fall) {
      g.gain.setTargetAtTime(0, end + o.fall * 0.5, o.fall * 0.25);
      stop = end + o.fall + 0.3;
    } else g.gain.setTargetAtTime(0, end, 0.045);
    var dets = [-7, 6], mod = null;
    if (o.shake) {
      var sl = c.createOscillator(); mod = c.createGain(); sl.frequency.value = 9; mod.gain.value = 45; sl.connect(mod); sl.start(t + 0.06); sl.stop(stop);
    } else if (dur > 0.35) {
      var vl = c.createOscillator(); mod = c.createGain(); vl.frequency.value = 5.6;
      mod.gain.setValueAtTime(0, t); mod.gain.linearRampToValueAtTime(11, t + 0.35); vl.connect(mod); vl.start(t); vl.stop(stop);
    }
    for (var i = 0; i < dets.length; i++) {
      var os = c.createOscillator(); os.type = 'sawtooth'; os.frequency.value = f;
      var d = dets[i] + (o.cents || 0);
      if (o.scoop !== false) { os.detune.setValueAtTime(d - (o.scoop || 45), t); os.detune.linearRampToValueAtTime(d, t + 0.05); } else os.detune.value = d;
      if (o.fall) { os.detune.setValueAtTime(d, end); os.detune.linearRampToValueAtTime(d - 900, end + o.fall); }
      if (mod) mod.connect(os.detune);
      os.connect(lp); os.start(t); os.stop(stop);
    }
    lp.connect(g); g.connect(o.dest || (o.stg ? S.n.stgBrass : S.n.brassIn));
  }
  // coro de vocales: voces de sierra con vibrato → banco de formantes compartido
  var VOW = { a: [730, 1090, 2440], o: [520, 860, 2550], e: [470, 1750, 2500], u: [360, 720, 2400] };
  function coro(t, notes, dur, vowel, vel) {
    var c = S.ctx, v = VOW[vowel] || VOW.a, i;
    for (i = 0; i < 3; i++) S.n.form[i].frequency.setTargetAtTime(v[i], t, 0.03);
    var g = c.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.06); g.gain.setTargetAtTime(0, t + dur, 0.08);
    g.connect(S.n.coroIn);
    for (i = 0; i < notes.length; i++) {
      for (var j = 0; j < 2; j++) {
        var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(notes[i]); o.detune.value = j ? 9 : -8;
        o.detune.setValueAtTime(o.detune.value - 35, t); o.detune.linearRampToValueAtTime(j ? 9 : -8, t + 0.07);
        S.n.cvibG.connect(o.detune);
        o.onended = (function (o) { return function () { try { S && S.n.cvibG.disconnect(o.detune); } catch (e) { /* nada */ } }; })(o);
        o.connect(g); o.start(t); o.stop(t + dur + 0.5);
      }
    }
  }

  // v0.9: quena sintetizada = fundamental casi pura + 2.º y 3.er armónico suaves + soplo de ruido filtrado + «chiff» al atacar; entra con un arrastre corto desde abajo
  // y, en notas largas, un vibrato lento que se abre. o: {vel, scoop, vib, breath}
  function quena(t, midi, dur, o) {
    o = o || {};
    var c = S.ctx, f = hz(midi), vel = o.vel || 0.7, end = t + dur, br = o.breath || 1, i, os, og;
    var g = c.createGain(), lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = Math.min(f * 4.5, 4800); lp.Q.value = 0.4;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.55, t + 0.025); g.gain.linearRampToValueAtTime(vel, t + Math.min(0.12, dur * 0.4));
    g.gain.setTargetAtTime(vel * 0.82, t + 0.14, 0.25); g.gain.setTargetAtTime(0, end, 0.07);
    var vl = null, vg = null;
    if (o.vib || dur > 0.5) {
      vl = c.createOscillator(); vg = c.createGain(); vl.frequency.value = 4.8;
      vg.gain.setValueAtTime(0, t); vg.gain.setValueAtTime(0, t + Math.min(0.3, dur * 0.4)); vg.gain.linearRampToValueAtTime(13, t + Math.min(0.9, dur * 0.9));
      vl.connect(vg); vl.start(t); vl.stop(end + 0.5);
    }
    [[1, 1, 'sine'], [2, 0.13, 'sine'], [3, 0.05, 'triangle']].forEach(function (h) {
      os = c.createOscillator(); og = c.createGain(); os.type = h[2];
      if (o.scoop) { os.frequency.setValueAtTime(f * h[0] * 0.93, t); os.frequency.linearRampToValueAtTime(f * h[0], t + 0.08); } else os.frequency.value = f * h[0];
      og.gain.value = h[1]; if (vg) vg.connect(os.detune);
      os.connect(og); og.connect(lp); os.start(t); os.stop(end + 0.5);
    });
    lp.connect(g); g.connect(layerIn('quena'));
    // soplo: ruido en banda alrededor de la nota, con el mismo contorno de aire
    var ns = c.createBufferSource(), nb = c.createBiquadFilter(), ng = c.createGain();
    ns.buffer = S.buf.qn; ns.loop = true; nb.type = 'bandpass'; nb.frequency.value = Math.min(f * 2, 5200); nb.Q.value = 1.4;
    ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(vel * 0.2 * br, t + 0.03); ng.gain.setTargetAtTime(vel * 0.06 * br, t + 0.06, 0.15); ng.gain.setTargetAtTime(0, end, 0.06);
    ns.connect(nb); nb.connect(ng); ng.connect(layerIn('quena')); ns.start(t, rnd() * 1.5); ns.stop(end + 0.4);
  }

  // ---------------------------------------------------------------------------------------------------------
  // cola de eventos (se crean nodos justo dentro del horizonte)
  function ev(t, kind, fn) { S.queue.push({ t: t, k: kind, fn: fn }); }
  function sortQ() { S.queue.sort(function (a, b) { return a.t - b.t; }); }

  // --- patrones compartidos ------------------------------------------------------------------------------
  function cumbiaGuiro(t0, sd, v) {
    for (var b = 0; b < 4; b++) {
      (function (b) {
        ev(t0 + (4 * b) * sd + 0.004, 'perc', function (t) { play(t, pick(S.buf.gL), 'guiro', hum(v, 0.06)); });
        ev(t0 + (4 * b + 2) * sd, 'perc', function (t) { play(t, pick(S.buf.gS), 'guiro', hum(v * 0.55, 0.1)); });
        ev(t0 + (4 * b + 3) * sd, 'perc', function (t) { play(t, pick(S.buf.gS), 'guiro', hum(v * 0.75, 0.1)); });
      })(b);
    }
  }
  function cumbiaBass(t0, sd, ch, nx, v) {
    var sparse = rnd() < nightX(t0);                                                   // noche: medio tiempo, notas largas
    var r = rootIn(ch, 33), fifth = r + 7, third = voicing(ch, r + 1, 1)[0];
    if (fifth > 45) fifth -= 12;
    var nr = rootIn(nx, 33), appr = nr === r ? r + 12 : (nr > r ? nr - 1 : nr + 1);
    if (!isTone(chord('Am'), appr) && !isTone(nx, appr)) appr = third - 12 >= 33 ? third - 12 : third;
    var notes = sparse ? [[0, r, 11, 1], [8, fifth, 6.5, 0.75]] : [[0, r, 5, 1], [6, r, 1.6, 0.55], [8, fifth, 5, 0.9], [14, appr, 1.8, 0.7]];
    notes.forEach(function (x) { ev(t0 + x[0] * sd, 'bass', function (t) { bass(t, x[1], x[2] * sd, hum(v * x[3], 0.05), false); }); });
  }
  function cumbiaRhythm(t0, sd, ch, v) {
    var dark = rnd() < nightX(t0), vo = dark ? voicing(darker(ch), M('A3'), 4) : voicing(ch, M('D4'), 3);     // noche: 4 notas con sexta, una octava más grave
    [2, 6, 10, 14].forEach(function (s, i) {
      ev(t0 + s * sd + (rnd() - 0.5) * 0.004, 'mel', function (t) { strum(t, vo, 'mute', hum(v * (i % 2 ? 1 : 0.85), 0.06), false); });
    });
    [7, 15].forEach(function (s) { ev(t0 + s * sd, 'perc', function (t) { play(t, S.buf.chk, 'rhythm', v * 0.22); }); });
  }
  function cumbiaConga(t0, sd, v) {
    var sparse = rnd() < nightX(t0);
    for (var h = 0; h < (sparse ? 1 : 2); h++) {
      var b = t0 + h * 8 * sd;
      (sparse ? [[0, 'cMute', 0.3], [4, 'cSlap', 0.5], [6, 'cOpen', 0.55], [7, 'tOpen', 0.6]] : [[0, 'cMute', 0.45], [2, 'cToe', 0.3], [4, 'cSlap', 0.75], [6, 'cOpen', 0.7], [7, 'tOpen', 0.85]]).forEach(function (x) {
        ev(b + x[0] * sd + (rnd() - 0.5) * 0.006, 'perc', function (t) { play(t, S.buf[x[1]], 'conga', hum(v * x[2], 0.08)); });
      });
    }
  }
  function cumbiaTimb(t0, sd, b, v) {
    [0, 4, 8, 12].forEach(function (s) { ev(t0 + s * sd, 'perc', function (t) { play(t, S.buf.campana, 'timb', hum(v * 0.38, 0.08)); }); });
    [2, 6, 10, 14].forEach(function (s) { ev(t0 + s * sd, 'perc', function (t) { play(t, S.buf.campana, 'timb', hum(v * 0.7, 0.06)); }); });
    if (b % 4 === 3) {
      [[8, 'tH', 0.5], [10, 'tH', 0.6], [11, 'tL', 0.6], [12, 'tL', 0.7], [13, 'tH', 0.6], [14, 'tL', 0.85]].forEach(function (x) {
        ev(t0 + x[0] * sd, 'perc', function (t) { play(t, S.buf[x[1]], 'timb', hum(v * x[2], 0.06)); });
      });
    } else if (b % 2 === 1) {
      ev(t0 + 15 * sd, 'perc', function (t) { play(t, S.buf.tH, 'timb', v * 0.45); });
    }
  }
  function melody(t0, sd, notes, ch, o) {
    o = o || {};
    if (o.thin) notes = notes.filter(function (x) { return x.d >= 3 || x.s % 8 === 0; });     // noche: solo las notas largas y los tiempos fuertes
    notes.forEach(function (x) {
      var midi = o.harm ? thirdBelow(x.n, ch, o.major) : x.n;
      ev(t0 + x.s * sd + (rnd() - 0.5) * 0.008, 'mel', function (t) {
        gtr(t, midi, x.d * sd * 0.95, { vel: hum((o.vel || 0.8) * (x.f.indexOf('!') >= 0 ? 1.15 : 1), 0.06), scoop: x.f.indexOf('~') >= 0, vib: x.f.indexOf('v') >= 0 || x.d >= 6, kind: o.kind, layer: o.layer, wah: o.wah, slide: !x.f && x.d <= 1 && rnd() < 0.15 });
      });
    });
  }

  // salsa
  var CLAVE23 = [2, 4, 8, 11, 14], CASC23 = [0, 2, 3, 5, 7, 8, 10, 12, 13, 15];
  function salsaBass(t0, sd, pair, nextFirst, v, entering) {
    for (var j = 0; j < 2; j++) {
      var ch = chord(pair[j]), nx = chord(j === 0 ? pair[1] : nextFirst), r = rootIn(ch, 33), nr = rootIn(nx, 33), f5 = r + 7;
      if (f5 > 45) f5 -= 12;
      (function (j, f5, nr) {
        ev(t0 + (8 * j + 3) * sd, 'bass', function (t) { bass(t, f5, 2.6 * sd, hum(v * 0.85, 0.05), true); });
        ev(t0 + (8 * j + 6) * sd, 'bass', function (t) { bass(t, nr, 4.6 * sd, hum(v, 0.05), true); });
      })(j, f5, nr);
    }
    if (entering) { var r0 = rootIn(chord(pair[0]), 33); ev(t0, 'bass', function (t) { bass(t, r0, 2.6 * sd, v, true); }); }
  }
  function montuno(t0, sd, pair, nextFirst, v, b) {
    for (var j = 0; j < 2; j++) {
      for (var e = 0; e < 8; e++) {
        if (j === 0 && e === 0 && b % 4 !== 0) continue;      // respira en el uno del ciclo (salvo al empezar frase)
        var ch = chord(e === 7 ? (j === 0 ? pair[1] : nextFirst) : pair[j]);
        var step = 8 * j + e, acc = CLAVE23.indexOf(step) >= 0 ? 1.15 : 1, notes, vel;
        var lo = voicing(ch, M('G4'), 3)[[0, 1, 2, 1][(e / 2) | 0]];
        if (e % 2 === 0) { notes = [lo, lo + 12]; vel = 0.55; }
        else { notes = voicing(ch, lo + 1, 2); vel = 0.68; }
        (function (notes, vel, acc, step) {
          ev(t0 + step * sd + (rnd() - 0.5) * 0.006, 'mel', function (t) { pno(t, notes, sd * 0.85, hum(v * vel * acc, 0.07)); });
        })(notes, vel, acc, step);
      }
    }
  }
  function salsaPerc(t0, sd, v, L) {
    for (var j = 0; j < 2; j++) {
      var m0 = t0 + 8 * j * sd;
      if (L.conga) [[0, 'cHeel', 0.35], [1, 'cToe', 0.25], [2, 'cSlap', 0.85], [3, 'cToe', 0.3], [4, 'cHeel', 0.35], [5, 'cToe', 0.25], [6, 'cOpen', 0.8], [7, 'tOpen', 0.9]].forEach(function (x) {
        ev(m0 + x[0] * sd + (rnd() - 0.5) * 0.005, 'perc', function (t) { play(t, S.buf[x[1]], 'conga', hum(v * x[2], 0.08)); });
      });
      if (L.bell) [[0, 'cenM', 1], [2, 'cenN', 0.7], [4, 'cenM', 0.9], [5, 'cenN', 0.4], [6, 'cenN', 0.7]].forEach(function (x) {
        ev(m0 + x[0] * sd, 'perc', function (t) { play(t, S.buf[x[1]], 'bell', hum(v * x[2], 0.06)); });
      });
      if (L.guiro) [[0, 'gLs', 0.8], [2, 'gS', 0.55], [3, 'gS', 0.7], [4, 'gLs', 0.75], [6, 'gS', 0.55], [7, 'gS', 0.7]].forEach(function (x) {
        ev(m0 + x[0] * sd, 'perc', function (t) { play(t, pick(S.buf[x[1]]), 'guiro', hum(v * x[2], 0.08)); });
      });
      if (L.bongo) [[0, 'bMacho', 0.6], [1, 'bFing', 0.3], [2, 'bMacho', 0.4], [3, 'bFing', 0.3], [4, 'bMacho', 0.55], [5, 'bFing', 0.3], [6, 'bHembra', 0.8], [7, 'bFing', 0.35]].forEach(function (x) {
        ev(m0 + x[0] * sd + (rnd() - 0.5) * 0.005, 'perc', function (t) { play(t, S.buf[x[1]], 'bongo', hum(v * x[2], 0.08)); });
      });
    }
    if (L.clave) CLAVE23.forEach(function (s) { ev(t0 + s * sd, 'perc', function (t) { play(t, S.buf.clave, 'clave', v * 0.8); }); });
    if (L.timb) CASC23.forEach(function (s, i) { ev(t0 + s * sd, 'perc', function (t) { play(t, S.buf.casc, 'timb', hum(v * (CLAVE23.indexOf(s) >= 0 ? 1.4 : 0.95), 0.08)); }); });
  }
  // sección de metales: trompetas en terceras + trombón contracanto
  function section(t0, sd, tpt, tbn, chords, v, o) {
    o = o || {};
    tpt.forEach(function (x) {
      var ch = chord(chords[x.s < 8 ? 0 : 1]);
      ev(t0 + x.s * sd, 'mel', function (t) {
        var d = x.d * sd * 0.88, acc = x.f.indexOf('!') >= 0;
        horn(t, x.n, d, { vel: hum(v, 0.05), acc: acc });
        horn(t + 0.004, thirdBelow(x.n, ch, o.major), d, { vel: hum(v * 0.85, 0.05), acc: acc });
        if (o.block) horn(t + 0.007, below(ch, thirdBelow(x.n, ch, o.major)), d, { vel: hum(v * 0.75, 0.05) });
      });
    });
    tbn.forEach(function (x) {
      ev(t0 + x.s * sd, 'mel', function (t) { horn(t, x.n, x.d * sd * 0.9, { tbn: true, vel: hum(v * 0.95, 0.05), acc: x.f.indexOf('!') >= 0 }); });
    });
  }
  // fill de timbal al final de la barra que termina en tEnd (n pasos) + puente de bajo a la dominante
  function timbalFill(tEnd, sd, steps, bridge) {
    var t0 = tEnd - steps * sd;
    var full = [[0, 'tH', 0.65], [0.5, 'tH', 0.5], [1, 'tL', 0.75], [1.5, 'tL', 0.55], [2, 'tH', 0.8], [2.5, 'tH', 0.6], [3, 'tL', 0.85], [3.5, 'tL', 0.95]];
    var short = [[0, 'tH', 0.7], [0.5, 'tL', 0.6], [1, 'tH', 0.8], [1.5, 'tL', 0.95]];
    (steps >= 4 ? full : short).forEach(function (x) {
      ev(t0 + x[0] * sd, 'fill', function (t) { play(t, S.buf[x[1]], 'fill', hum(x[2], 0.05)); });
    });
    ev(tEnd, 'fill', function (t) { play(t, S.buf.tRim, 'fill', 0.95); play(t, S.buf.tL, 'fill', 0.5); });
    if (bridge) {      // puente: Mi – Sol# – Si → La (dominante que resuelve en cualquier ánimo, todos empiezan en La)
      var bb = steps >= 4 ? [[0, M('E2'), 1.8], [2, M('G#2'), 0.9], [3, M('B2'), 0.9]] : [[0, M('E2'), 0.9], [1, M('B2'), 0.9]];
      bb.forEach(function (x) { ev(t0 + x[0] * sd, 'fill', function (t) { bass(t, x[1], x[2] * sd, 0.9, true); }); });
    }
  }

  // ---------------------------------------------------------------------------------------------------------
  // composiciones (todas originales)

  // 1) «Garúa sobre Gambetta» — chicha lenta, 90 bpm, La menor, 16 barras
  var TITLE_CH = ['Am', 'Am', 'F', 'F', 'Dm', 'Dm', 'E7', 'E7', 'Am', 'Am', 'C', 'G', 'F', 'Dm', 'E7', 'Am'];
  var TITLE_MEL = [
    '0:A4:4 4:C5:4 8:E5:8v', '0:D5:4 4:C5:2 6:B4:2 8:C5:8v', '0:A4:4 4:C5:4 8:F5:6v 14:E5:2', '0:D5:4 4:C5:4 8:A4:8v',
    '0:D5:4 4:F5:4 8:A5:6~ 14:G5:2', '0:F5:4 4:E5:2 6:D5:2 8:E5:8v', '0:G#4:4 4:B4:4 8:D5:4 12:F5:4', '0:E5:12v 12:B4:2 14:D5:2',
    '0:C5:4 4:E5:4 8:A5:8v', '0:G5:4 4:E5:2 6:D5:2 8:E5:8v', '0:G5:4 4:E5:4 8:C5:4 12:E5:4', '0:D5:8v 8:B4:4 12:D5:4',
    '0:C5:4 4:A4:4 8:F5:8~', '0:E5:4 4:D5:4 8:A4:8v', '0:B4:4 4:D5:4 8:G#4:4 12:B4:4', '0:A4:14v'
  ].map(P);

  // 2) «Cumbia del Primer Puerto» — cumbia chicha, 96 bpm, La menor, 32 barras (A: 1-16, B: 17-32 en Do)
  var EXP_CH = ['Am', 'Am', 'G', 'G', 'F', 'F', 'E7', 'E7', 'Am', 'Am', 'Dm', 'Dm', 'Am', 'G', 'E7', 'E7',
                'C', 'C', 'G', 'G', 'Dm', 'Dm', 'Am', 'Am', 'F', 'G', 'C', 'Am', 'Dm', 'E7', 'Am', 'E7'];
  var EXP_MEL = [
    '0:E5:3! 3:D5:1 4:C5:2 6:D5:2 8:E5:4 12:A4:2 14:C5:2',
    '0:B4:2 2:A4:2 4:G4:2 6:A4:6~ 12:E4:2 14:G4:2',
    '0:D5:3! 3:C5:1 4:B4:2 6:C5:2 8:D5:4 12:G4:2 14:B4:2',
    '0:A4:2 2:B4:2 4:D5:4 8:B4:8v',
    '0:C5:3! 3:B4:1 4:A4:2 6:C5:2 8:F5:4~ 12:E5:2 14:D5:2',
    '0:C5:2 2:A4:2 4:C5:2 6:D5:2 8:C5:8v',
    '0:B4:2 2:G#4:2 4:E4:2 6:G#4:2 8:B4:2 10:D5:2 12:F5:2 14:E5:2',
    '0:E5:6v 6:D5:2 8:B4:2 10:G#4:2 12:B4:4',
    '0:E5:3! 3:D5:1 4:C5:2 6:D5:2 8:E5:2 10:G5:2 12:A5:4',
    '0:G5:2 2:E5:2 4:D5:2 6:E5:6v 12:C5:2 14:D5:2',
    '0:F5:3! 3:E5:1 4:D5:2 6:F5:2 8:A5:4~ 12:G5:2 14:F5:2',
    '0:E5:2 2:D5:2 4:C5:2 6:D5:6v 12:A4:2 14:C5:2',
    '0:E5:4 4:C5:2 6:A4:2 8:C5:2 10:E5:2 12:D5:2 14:C5:2',
    '0:B4:4 4:D5:2 6:B4:2 8:G4:4 12:A4:2 14:B4:2',
    '0:C5:2 2:B4:2 4:A4:2 6:G#4:2 8:A4:2 10:B4:2 12:D5:2 14:C5:2',
    '0:B4:8v 8:E4:2 10:G#4:2 12:B4:2 14:D5:2',
    '0:E5:6~ 6:G5:2 8:E5:2 10:D5:2 12:C5:4',
    '0:D5:2 2:E5:2 4:G5:4 8:E5:8v',
    '0:D5:6~ 6:B4:2 8:D5:2 10:G5:2 12:F5:2 14:D5:2',
    '0:B4:4 4:G4:2 6:A4:2 8:B4:2 10:D5:2 12:C5:2 14:B4:2',
    '0:A4:4 4:D5:4 8:F5:6~ 14:E5:2',
    '0:D5:2 2:C5:2 4:A4:2 6:C5:2 8:D5:8v',
    '0:C5:3! 3:B4:1 4:A4:2 6:E5:6~ 12:D5:2 14:C5:2',
    '0:A4:8v 12:E5:2 14:G5:2',
    '0:A5:6~ 6:G5:2 8:F5:2 10:E5:2 12:F5:2 14:A5:2',
    '0:G5:6 6:F5:2 8:D5:2 10:B4:2 12:D5:2 14:F5:2',
    '0:E5:4 4:G5:4 8:C6:4~ 12:B5:2 14:G5:2',
    '0:A5:8v 8:G5:2 10:E5:2 12:C5:2 14:E5:2',
    '0:F5:3! 3:E5:1 4:D5:2 6:A4:2 8:D5:2 10:F5:2 12:A5:2 14:G5:2',
    '0:G#5:4~ 4:F5:2 6:E5:2 8:D5:2 10:B4:2 12:G#4:2 14:B4:2',
    '0:A4:2 2:C5:2 4:E5:2 6:A5:6v 12:G5:2 14:E5:2',
    '0:D5:2 2:C5:2 4:B4:2 6:G#4:2 8:E4:4 12:G#4:2 14:B4:2'
  ].map(P);

  // 3) «Corre, Chalaco» — salsa brava, 192 bpm, La menor, clave 2-3. Cada barra = un ciclo de clave (2 compases).
  var CHASE_CH = [['Am', 'Dm'], ['G', 'C'], ['F', 'Dm'], ['E7', 'E7']];
  var MAMBO_T = ['2:E5:1 4:E5:2! 7:D5:1 8:C5:1 11:D5:2! 14:F5:2',
                 '2:D5:1 4:D5:2! 7:C5:1 8:B4:1 11:C5:2! 14:E5:2',
                 '2:C5:1 4:C5:2! 7:A4:1 8:C5:1 11:D5:2! 14:F5:1 15:E5:1',
                 '0:E5:3! 4:D5:1 5:B4:1 6:G#4:1 8:B4:2 11:D5:2! 14:E5:2'].map(P);
  var MAMBO_B = ['0:A3:2 6:G3:1 9:F3:2 12:A3:2', '0:G3:2 6:F3:1 9:E3:2 12:G3:2',
                 '0:F3:2 6:E3:1 9:D3:2 12:F3:2', '0:E3:2 3:G#3:1 6:B3:1 9:D4:2 12:E4:3'].map(P);
  // coro (pregón de vocales): [paso, nota, dur, vocal]
  var CORO = [[[0, 'A4', 2, 'o'], [2, 'C5', 2, 'o'], [4, 'E5', 4, 'e'], [10, 'D5', 2, 'a'], [12, 'C5', 3, 'o']],
              [[0, 'D5', 2, 'a'], [2, 'B4', 2, 'a'], [4, 'G4', 4, 'e'], [10, 'C5', 2, 'a'], [12, 'E5', 3, 'o']],
              [[0, 'A4', 2, 'o'], [2, 'C5', 2, 'o'], [4, 'F5', 4, 'e'], [10, 'E5', 2, 'a'], [12, 'D5', 3, 'o']],
              [[0, 'E5', 3, 'a'], [3, 'D5', 1, 'a'], [4, 'B4', 4, 'o'], [10, 'G#4', 2, 'u'], [12, 'B4', 3, 'o']]];
  // 4) «La Mancha Brava» — horda: A = mambo + coro; B = shout chorus sobre Rem – Lam – Sib (napolitano) – Mi7
  var HORDE_B = [['Dm', 'Dm'], ['Am', 'Am'], ['Bb', 'Bb'], ['E7', 'E7']];
  var SHOUT = ['0:A5:2! 3:F5:1 4:A5:2! 7:G5:1 8:F5:1 10:E5:1 11:D5:2! 14:F5:2',
               '0:E5:2! 3:C5:1 4:E5:2! 7:D5:1 8:C5:1 10:B4:1 11:A4:2! 14:C5:2',
               '0:D5:2! 3:F5:1 4:Bb5:3! 8:A5:1 9:F5:1 10:D5:1 11:F5:2! 14:Bb5:1 15:A5:1',
               '0:G#5:3! 3:F5:1 4:E5:1 5:D5:1 6:B4:2 8:E5:1 10:G#5:1 11:B5:2!'].map(P);
  var SHOUT_B = ['0:D3:2 3:D3:1 4:F3:2 8:A3:1 11:D3:2', '0:A2:2 3:A2:1 4:C3:2 8:E3:1 11:A2:2',
                 '0:Bb2:2 3:Bb2:1 4:D3:2 8:F3:1 11:Bb2:2', '0:E3:3 4:D3:1 6:B2:2 8:E3:1 11:G#3:2'].map(P);
  // 5) «Último Pasaje» — muerte: guitarra sola, ~66 bpm
  var DEAD_MEL = ['0:E5:2~ 2:D5:2 4:C5:3 7:B4:1 8:A4:4v 12:C5:2 14:B4:2', '0:G#4:3~ 3:B4:1 4:A4:12v'].map(P);
  // 6) «Fiesta en la Escalera» — final: cumbia en La mayor que se vuelve salsa con cierre grande
  var WON_MEL = ['0:E5:2 2:C#5:2 4:E5:2 6:A5:4~ 10:G#5:2 12:F#5:2 14:E5:2', '0:D5:2 2:B4:2 4:G#4:2 6:B4:2 8:E5:4~ 12:D5:2 14:B4:2'].map(P);
  var WON_T = P('0:F#5:2! 3:F#5:1 4:A5:2! 7:G#5:2 9:E5:1 10:G#5:1 11:B5:3!');
  var WON_B = P('0:D3:2 3:D3:1 4:F#3:2 8:E3:2 11:G#3:2 14:B3:2');

  // v0.8: lo nocturno del explore: güiro suelto (un raspado largo de vez en cuando) y un cencerro lejano; N(t) lo dosifica en cada golpe
  function nightExplore(t0, sd, b) {
    var pat = b % 2 === 0 ? [[0, 'gL', 0.55, 0.9], [7, 'gS', 0.3, 0.5], [10, 'gLs', 0.4, 0.6]] : [[2, 'gS', 0.3, 0.5], [12, 'gLs', 0.35, 0.5]];
    pat.forEach(function (x) {
      if (rnd() > x[3]) return;
      ev(t0 + x[0] * sd + (rnd() - 0.5) * 0.014, 'perc', function (t) { var N = nightAt(t); if (N > 0.08) play(t, pick(S.buf[x[1]]), 'nperc', hum(x[2] * N, 0.12)); });
    });
    if (b % 4 === 1) ev(t0 + 8 * sd, 'perc', function (t) { var N = nightAt(t); if (N > 0.08) play(t, S.buf.cenN, 'nperc', 0.24 * N, 0.82); });
  }
  // v0.8: persecución de noche: stabs de metales en menor / disminuido (A m7, D m7, G7, C7, F7, E7b9 sin raíz) a contratiempo + percusión extra entre los pasos
  var NSTAB = { Am: ['A4', 'C5', 'E5', 'G5'], Dm: ['D5', 'F5', 'A5', 'C6'], G: ['B4', 'D5', 'F5', 'G5'], C: ['C5', 'E5', 'G5', 'Bb5'], F: ['A4', 'C5', 'Eb5', 'F5'], E7: ['G#4', 'B4', 'D5', 'F5'] };
  function nightChase(b, t0, sd, pair, mambo, L) {
    if (!nightOn()) return;
    var pat = b % 2 === 0 ? [2, 6, 11, 14] : [3, 7, 10, 13], j;
    if (!(mambo && L.brass)) pat.forEach(function (s, k) {
      var nt = NSTAB[pair[s < 8 ? 0 : 1]]; if (!nt) return;
      var notes = nt.slice(k % 2 ? 0 : 1, 4).map(M);
      ev(t0 + s * sd, 'mel', function (t) {
        var N = nightAt(t); if (N < 0.08) return;
        notes.forEach(function (m, i) { horn(t + i * 0.004, m, 0.8 * sd, { vel: hum((k === 1 || k === 2 ? 1.25 : 1.05) * N, 0.06), acc: true, scoop: 25 }); });
      });
    });
    for (j = 0; j < 2; j++) {
      var m0 = t0 + 8 * j * sd;
      [[0.5, 'cToe', 0.2], [1.5, 'cHeel', 0.18], [3.5, 'cToe', 0.22], [4.5, 'cToe', 0.2], [5.5, 'cHeel', 0.2], [7.5, 'cToe', 0.26], [0.5, 'gS', 0.3], [2.5, 'gS', 0.3], [4.5, 'gS', 0.3], [6.5, 'gS', 0.36],
       [1.5, 'bFing', 0.22], [3.5, 'bFing', 0.22], [5.5, 'bFing', 0.26]].forEach(function (x) {
        ev(m0 + x[0] * sd + (rnd() - 0.5) * 0.004, 'perc', function (t) { var N = nightAt(t); if (N > 0.08) play(t, x[1] === 'gS' ? pick(S.buf.gS) : S.buf[x[1]], 'nperc', hum(x[2] * N, 0.1)); });
      });
    }
    if (b % 4 === 3) [[14, 'tH', 0.3], [14.5, 'tL', 0.36], [15, 'tH', 0.46], [15.5, 'tL', 0.58]].forEach(function (x) {
      ev(t0 + x[0] * sd, 'perc', function (t) { var N = nightAt(t); if (N > 0.08) play(t, S.buf[x[1]], 'nperc', x[2] * N); });
    });
  }

  var PIECES = {
    title: {
      bpm: 90, sd: 60 / 90 / 4, len: 16, loop: true,
      layers: function () { return { guiro: 1, bass: 1, conga: 1, rhythm: 1, lead: 1 }; },
      fx: { trem: 0.55, tremHz: 6.75, slap: 0.15, echo: 0.42, echoT: 0.5, spring: 0.55 },
      bar: function (b, t0, sd, L) {
        var i = b % 16, ch = chord(TITLE_CH[i]), r = rootIn(ch, 33), f5 = r + 7 > 45 ? r - 5 : r + 7;
        [0, 8].forEach(function (s) { ev(t0 + s * sd, 'perc', function (t) { play(t, pick(S.buf.gL), 'guiro', hum(0.55, 0.08)); }); });
        [3, 11].forEach(function (s) { ev(t0 + s * sd, 'perc', function (t) { play(t, pick(S.buf.gS), 'guiro', 0.35); }); });
        ev(t0, 'bass', function (t) { bass(t, r, 6 * sd, 0.75, false); });
        ev(t0 + 8 * sd, 'bass', function (t) { bass(t, f5, 6 * sd, 0.6, false); });
        [[6, 'cOpen', 0.35], [7, 'tOpen', 0.45], [14, 'cOpen', 0.35], [15, 'tOpen', 0.5], [0, 'cMute', 0.25], [8, 'cMute', 0.25]].forEach(function (x) {
          ev(t0 + x[0] * sd, 'perc', function (t) { play(t, S.buf[x[1]], 'conga', hum(x[2], 0.08)); });
        });
        var vo = voicing(ch, M('D4'), 3);
        [6, 14].forEach(function (s) { ev(t0 + s * sd, 'mel', function (t) { strum(t, vo, 'mute', 0.6, false); }); });
        melody(t0, sd, TITLE_MEL[i], ch, { vel: 0.75, kind: 'title', wah: 0.25 });
      }
    },
    explore: {
      kind: 'explore', bpm: 96, sd: 60 / 96 / 4, len: 32, loop: true, resume: 8,
      layers: function (I, b) {
        var L = { guiro: 1, bass: 1, rhythm: 1 };
        if (I >= 0.4) { L.lead = 1; L.conga = 1; }
        if (I >= 0.85) { L.timb = 1; if (b % 32 >= 16) L.lead2 = 1; }
        return L;
      },
      fx: { trem: 0.12, tremHz: 6.4, slap: 0.32, echo: 0.1, echoT: 0.469, spring: 0.35 },
      bar: function (b, t0, sd, L) {
        var i = b % 32, ch = chord(EXP_CH[i]), nx = chord(EXP_CH[(i + 1) % 32]);
        if (L.guiro) cumbiaGuiro(t0, sd, 0.9);
        if (L.bass) cumbiaBass(t0, sd, ch, nx, 0.85);
        if (L.rhythm) cumbiaRhythm(t0, sd, ch, 0.75);
        if (L.conga) cumbiaConga(t0, sd, 0.9);
        if (L.timb) cumbiaTimb(t0, sd, b, 0.9);
        var nx = nightX(t0);
        if (L.lead) melody(t0, sd, EXP_MEL[i], ch, { vel: 0.82 * (1 - 0.2 * nx), thin: rnd() < nx });
        if (L.lead2) melody(t0, sd, EXP_MEL[i], ch, { vel: 0.6, harm: true, layer: 'lead2' });
        if (nx > 0.02) nightExplore(t0, sd, b);
      }
    },
    chase: {
      bpm: 192, sd: 60 / 192 / 2, len: 8, loop: true,
      layers: function (I, b) {
        var L = { bass: 1, piano: 1, conga: 1, bell: 1, guiro: 1, clave: 1 };
        if (I >= 0.25) L.bongo = 1;
        if (I >= 0.5) { L.timb = 1; if (b % 8 >= 4) L.brass = 1; }
        if (I >= 0.75 && b % 8 < 4) L.coro = 1;
        if (nightOn()) L.brass = 1;                                    // de noche: la capa de metales siempre abierta (stabs)
        return L;
      },
      fx: { trem: 0, tremHz: 6, slap: 0.3, echo: 0, echoT: 0.469, spring: 0.3 },
      bar: function (b, t0, sd, L, entering) { salsaBar(b, t0, sd, L, entering, chaseCh(b % 4), chaseCh((b + 1) % 4)[0], b % 8 >= 4); }
    },
    horde: {
      bpm: 192, sd: 60 / 192 / 2, len: 8, loop: true,
      layers: function (I, b) {
        var L = { bass: 1, piano: 1, conga: 1, bell: 1, guiro: 1, clave: 1, bongo: 1, timb: 1, brass: 1 };
        if (b % 8 < 4) L.coro = 1;
        return L;
      },
      fx: { trem: 0, tremHz: 6, slap: 0.3, echo: 0, echoT: 0.469, spring: 0.3 },
      bar: function (b, t0, sd, L, entering) {
        var i = b % 8;
        if (i < 4) salsaBar(b, t0, sd, L, entering, chaseCh(i), (i === 3 ? HORDE_B[0] : chaseCh(i + 1))[0], true);
        else {
          var pair = HORDE_B[i - 4], nf = (i === 7 ? chaseCh(0) : HORDE_B[i - 3])[0];
          salsaBass(t0, sd, pair, nf, 0.95, entering);
          montuno(t0, sd, pair, nf, 0.85, b);
          salsaPerc(t0, sd, 1, L);
          section(t0, sd, SHOUT[i - 4], SHOUT_B[i - 4], pair, 0.95, { block: true });
          SHOUT[i - 4].forEach(function (x) { if (x.f.indexOf('!') >= 0) ev(t0 + x.s * sd, 'perc', function (t) { play(t, S.buf.tH, 'timb', 0.5); }); });
        }
        if (i === 3 || i === 7) timbalFill(t0 + 16 * sd, sd, 4, false);
      }
    },
    dead: {
      bpm: 66, sd: 60 / 66 / 4, len: 2, loop: false,
      layers: function () { return { solo: 1 }; },
      fx: { trem: 0.0, tremHz: 5, slap: 0.12, echo: 0.3, echoT: 0.682, spring: 0.6 },
      bar: function (b, t0, sd) {
        melody(t0, sd, DEAD_MEL[b], chord(b ? 'E7' : 'Am'), { vel: 0.7, kind: 'solo', layer: 'solo', wah: 0 });
        if (b === 1) { [M('A2'), M('E3'), M('A3')].forEach(function (m, k) { ev(t0 + 4 * sd + k * 0.03, 'mel', function (t) { gtr(t, m, 12 * sd, { kind: 'solo', layer: 'solo', wah: 0, vel: 0.45 }); }); }); }
      }
    },
    won: {
      bpm: 96, sd: 60 / 96 / 4, len: 5, loop: false,
      layers: function (I, b) {
        return b < 2 ? { guiro: 1, bass: 1, rhythm: 1, lead: 1, conga: 1, timb: 1 }
                     : { guiro: 1, bass: 1, piano: 1, conga: 1, bell: 1, timb: 1, brass: 1, bongo: 1, clave: 1 };
      },
      fx: { trem: 0.1, tremHz: 6.4, slap: 0.32, echo: 0.12, echoT: 0.469, spring: 0.35 },
      bar: function (b, t0, sd, L) {
        if (b < 2) {
          var ch = chord(b ? 'E7' : 'A');
          cumbiaGuiro(t0, sd, 0.9); cumbiaBass(t0, sd, ch, chord(b ? 'D' : 'E7'), 0.85); cumbiaRhythm(t0, sd, ch, 0.75);
          cumbiaConga(t0, sd, 0.75); cumbiaTimb(t0, sd, 1, 0.9);
          melody(t0, sd, WON_MEL[b], ch, { vel: 0.85 });
          melody(t0, sd, WON_MEL[b], ch, { vel: 0.55, harm: true, layer: 'lead', major: true });
          if (b === 1) timbalFill(t0 + 16 * sd, sd, 4, false);
        } else if (b === 2) {
          salsaBass(t0, sd, ['D', 'E7'], 'A', 0.95, true);
          montuno(t0, sd, ['D', 'E7'], 'A', 0.85, 0);
          salsaPerc(t0, sd, 1, L); cumbiaGuiro(t0, sd, 0.6);
          section(t0, sd, WON_T, WON_B, ['D', 'E7'], 0.95, { major: true });
        } else if (b === 3) {
          var A = chord('A6');
          salsaPerc(t0, sd, 1, { conga: 1, bell: 1, clave: 1, bongo: 1 });
          ev(t0, 'bass', function (t) { bass(t, M('A1'), 2 * sd, 1, true); });
          [[0, M('E5'), 1], [3, M('E5'), 1], [4, M('F#5'), 1]].forEach(function (x) {
            ev(t0 + x[0] * sd, 'mel', function (t) { horn(t, x[1], x[2] * sd * 0.8, { vel: 0.95, acc: true }); horn(t, below(A, x[1]), x[2] * sd * 0.8, { vel: 0.8 }); horn(t, M('A3'), x[2] * sd * 0.8, { tbn: true, vel: 0.9 }); pno(t, voicing(A, M('C#4'), 4), sd, 0.8); });
          });
          ev(t0 + 6 * sd, 'mel', function (t) {
            var d = 9.5 * sd;
            [M('A5'), M('F#5'), M('E5'), M('C#5')].forEach(function (m, k) { horn(t + k * 0.004, m, d, { vel: 0.85 - k * 0.05, acc: true }); });
            horn(t, M('A3'), d, { tbn: true, vel: 0.9 }); horn(t, M('E3'), d, { tbn: true, vel: 0.7 });
            bass(t, M('E2'), d, 0.8, true);
            voicing(A, M('A3'), 9).forEach(function (m, k) { pno(t + k * 0.035, [m], d, 0.5); });     // glissando ascendente
          });
          for (var k = 0; k < 18; k++) (function (k) { ev(t0 + (6 + k * 0.5) * sd, 'fill', function (t) { play(t, S.buf[k % 2 ? 'tL' : 'tH'], 'fill', 0.35 + 0.035 * k); }); })(k);
        } else if (b === 4) {
          var A2 = chord('A');
          ev(t0, 'fill', function (t) {
            [M('A5'), M('E5'), M('C#5')].forEach(function (m) { horn(t, m, 0.32, { vel: 1, acc: true, scoop: false }); });
            horn(t, M('A3'), 0.32, { tbn: true, vel: 1 }); horn(t, M('A2'), 0.32, { tbn: true, vel: 0.8 });
            bass(t, M('A1'), 1.2, 1, true); pno(t, voicing(A2, M('A3'), 5), 1.4, 0.8);
            play(t, S.buf.tRim, 'fill', 1); play(t, S.buf.tL, 'fill', 0.9); play(t, S.buf.cSlap, 'conga', 0.9); play(t, S.buf.cenM, 'bell', 1);
            gtr(t, M('A4'), 1.6, { vel: 0.6, vib: true }); gtr(t, M('E5'), 1.6, { vel: 0.5, vib: true });
          });
        }
      }
    }
  };
  function salsaBar(b, t0, sd, L, entering, pair, nextFirst, mambo) {
    if (L.bass) salsaBass(t0, sd, pair, nextFirst, 0.92, entering);
    if (L.piano) montuno(t0, sd, pair, nextFirst, 0.8, b);
    salsaPerc(t0, sd, 0.95, L);
    if (L.brass && mambo && (S.I >= 0.5 || S.mood !== 'chase')) section(t0, sd, (cerroOn() ? MAMBO2_T : MAMBO_T)[b % 4], (cerroOn() ? MAMBO2_B : MAMBO_B)[b % 4], pair, 0.85, {});
    if (S.mood === 'chase' || S.mood === 'horde') nightChase(b, t0, sd, pair, mambo, L);
    if (L.coro) (cerroOn() ? CORO2 : CORO)[b % 4].forEach(function (x) {
      var ch = chord(pair[x[0] < 8 ? 0 : 1]), n = M(x[1]);
      ev(t0 + x[0] * sd, 'mel', function (t) { coro(t, [n, thirdBelow(n, ch), n - 12], x[2] * sd * 0.92, x[3], 0.11); });
    });
    if (entering) ev(t0, 'mel', function (t) {     // golpe de entrada: metales + timbal en el uno
      var c0 = chord(pair[0]), top = M('E5');
      horn(t, top, sd * 0.9, { vel: 0.9, acc: true }); horn(t, below(c0, top), sd * 0.9, { vel: 0.8 }); horn(t, rootIn(c0, M('E3')), sd * 0.9, { tbn: true, vel: 0.9 });
      play(t, S.buf.tRim, 'fill', 0.8);
    });
  }


  // ---------------------------------------------------------------------------------------------------------
  // 8) v0.9 — EL CERRO. «Huayno de la Ladera»: chicha con aire de huayno, 96 bpm, La menor, 16 barras (A: 1-8 en Am-G-F-E7 / Am-C-Dm-E7; B: 9-16 en Do, más cantable).
  //    Cada barra son 16 pasos = dos compases de 2/4. Ritmo de galope de huayno por compás (pasos 0, 2, 3, 4, 6): corchea, dos semicorcheas, corchea, corchea.
  //    Capas: güiro + bajo saltarín (raíz, octava, quinta, octava) + guitarra rítmica apagada + guitarra punteada con eco largo (a negra con puntillo); la quena (flauta andina)
  //    contesta con notas largas (siempre en los dos últimos compases de cada frase de 8; con intensidad >= 0,2 en todas); conga y bombo con >= 0,5; campana y segunda
  //    guitarra en terceras con >= 0,85. Melodía pentatónica menor (La Do Re Mi Sol), original.
  var CER_CH = ['Am', 'G', 'F', 'E7', 'Am', 'C', 'Dm', 'E7', 'C', 'G', 'Am', 'Am', 'F', 'C', 'Dm', 'E7'];
  var CER_MEL = [
    '0:E5:2! 2:D5:1 3:C5:1 4:D5:2 6:C5:2 8:A4:3! 11:C5:1 12:D5:2 14:E5:2',
    '0:D5:2! 2:C5:1 3:B4:1 4:C5:2 6:B4:2 8:G4:3! 11:B4:1 12:D5:2 14:G5:2',
    '0:C5:2! 2:A4:1 3:C5:1 4:F5:2 6:E5:2 8:C5:3! 11:A4:1 12:C5:2 14:D5:2',
    '0:B4:2! 2:G#4:1 3:B4:1 4:E5:2 6:D5:2 8:B4:6v 14:G#4:1 15:B4:1',
    '0:E5:2! 2:D5:1 3:C5:1 4:D5:2 6:E5:2 8:A5:3! 11:G5:1 12:E5:2 14:G5:2',
    '0:G5:2! 2:E5:1 3:D5:1 4:E5:2 6:G5:2 8:C6:3!~ 11:B5:1 12:G5:2 14:E5:2',
    '0:F5:2! 2:E5:1 3:D5:1 4:E5:2 6:F5:2 8:A5:3 11:F5:1 12:D5:2 14:E5:2',
    '0:D5:2! 2:B4:1 3:G#4:1 4:B4:2 6:D5:2 8:E5:8v',
    '0:E5:4! 4:G5:2 6:E5:2 8:D5:2 10:E5:2 12:C5:4',
    '0:D5:4! 4:B4:2 6:D5:2 8:G5:4 12:E5:2 14:D5:2',
    '0:C5:2! 2:E5:2 4:A5:4v 8:G5:2 10:E5:2 12:D5:2 14:C5:2',
    '0:D5:2 2:C5:2 4:A4:4v 8:A4:2 10:C5:2 12:E5:4',
    '0:A5:4! 4:C6:2 6:A5:2 8:F5:2 10:A5:2 12:C5:4~',
    '0:G5:4! 4:E5:2 6:C5:2 8:E5:2 10:G5:2 12:E5:4',
    '0:F5:2! 2:A5:2 4:F5:2 6:D5:2 8:E5:2 10:D5:2 12:C5:2 14:D5:2',
    '0:B4:2! 2:G#4:2 4:B4:2 6:D5:2 8:E5:2 10:D5:1 11:B4:1 12:G#4:4v'
  ].map(P);
  var CER_Q = [
    '', '', '0:C6:6~v 8:A5:8v', '0:G#5:8~v 8:B5:4 12:E6:4v', '', '', '0:F5:8~v 8:A5:8v', '0:G#5:6~v 8:E5:8v',
    '8:E5:4~ 12:G5:4v', '0:D5:6v 8:B4:8v', '0:E5:8v 8:C6:8~v', '0:A5:12v', '0:F5:6~ 6:A5:2 8:C6:8v', '0:E6:6~v 8:C6:4 12:G5:4v', '0:D6:4~ 4:C6:4 8:A5:4 12:F5:4v', '0:G#5:4~ 4:B5:4 8:E6:8v'
  ].map(P);
  function huaynoGuiro(t0, sd, v) {
    for (var m = 0; m < 2; m++) {
      [[0, 'gL', 0.9], [2, 'gS', 0.5], [3, 'gS', 0.65], [4, 'gLs', 0.7], [6, 'gS', 0.55]].forEach(function (x) {
        ev(t0 + (8 * m + x[0]) * sd + 0.003, 'perc', function (t) { play(t, pick(S.buf[x[1]]), 'guiro', hum(v * x[2], 0.07)); });
      });
    }
  }
  // bajo saltarín: raíz grave, salto de octava, quinta, salto de octava; el último paso se acerca a la raíz del acorde siguiente. De noche, a medio tiempo (notas largas).
  function huaynoBass(t0, sd, ch, nx, v) {
    var sparse = rnd() < nightX(t0);
    var r = rootIn(ch, 33), f5 = r + 7, third = voicing(ch, r + 1, 1)[0];
    if (f5 > 45) f5 -= 12;
    var nr = rootIn(nx, 33), appr = nr === r ? r + 12 : (nr > r ? nr - 1 : nr + 1);
    if (!isTone(chord('Am'), appr) && !isTone(nx, appr)) appr = third - 12 >= 33 ? third - 12 : third;
    var notes = sparse ? [[0, r, 7, 1], [8, f5, 6.5, 0.75]]
      : [[0, r, 1.7, 1], [2, r + 12, 1.1, 0.62], [4, f5, 1.7, 0.85], [6, r + 12, 1.1, 0.6], [8, r, 1.7, 0.95], [10, r + 12, 1.1, 0.62], [12, f5, 1.7, 0.85], [14, appr, 1.4, 0.72]];
    notes.forEach(function (x) { ev(t0 + x[0] * sd, 'bass', function (t) { bass(t, x[1], x[2] * sd, hum(v * x[3], 0.05), false); }); });
  }
  function huaynoRhythm(t0, sd, ch, v) {
    var dark = rnd() < nightX(t0), vo = dark ? voicing(darker(ch), M('A3'), 4) : voicing(ch, M('D4'), 3);
    for (var m = 0; m < 2; m++) {
      [[0, 0.85, false], [2, 0.55, true], [3, 0.7, false], [4, 0.8, false], [6, 0.6, true]].forEach(function (x) {
        ev(t0 + (8 * m + x[0]) * sd + (rnd() - 0.5) * 0.004, 'mel', function (t) { strum(t, vo, 'mute', hum(v * x[1], 0.06), x[2]); });
      });
      ev(t0 + (8 * m + 7) * sd, 'perc', function (t) { play(t, S.buf.chk, 'rhythm', v * 0.22); });
    }
  }
  function huaynoConga(t0, sd, v) {
    var sparse = rnd() < nightX(t0);
    for (var m = 0; m < 2; m++) {
      var b0 = t0 + 8 * m * sd;
      (sparse ? [[4, 'cSlap', 0.5], [6, 'tOpen', 0.6]] : [[0, 'cMute', 0.4], [3, 'cSlap', 0.6], [4, 'cOpen', 0.55], [6, 'tOpen', 0.7], [7, 'cToe', 0.3]]).forEach(function (x) {
        ev(b0 + x[0] * sd + (rnd() - 0.5) * 0.006, 'perc', function (t) { play(t, S.buf[x[1]], 'conga', hum(v * x[2], 0.08)); });
      });
      if (!sparse) [0, 4].forEach(function (s) { ev(b0 + s * sd, 'perc', function (t) { play(t, S.buf.tL, 'conga', hum(v * 0.42, 0.08), 0.45); }); });   // bombo: timbal grave bajado una octava
    }
  }
  function huaynoTimb(t0, sd, b, v) {
    for (var m = 0; m < 2; m++) {
      [[0, 0.4], [2, 0.65], [3, 0.5], [4, 0.4], [6, 0.65]].forEach(function (x) {
        ev(t0 + (8 * m + x[0]) * sd, 'perc', function (t) { play(t, S.buf.campana, 'timb', hum(v * x[1], 0.07)); });
      });
    }
    if (b % 4 === 3) [[10, 'tH', 0.5], [11, 'tL', 0.6], [12, 'tH', 0.6], [13, 'tL', 0.7], [14, 'tH', 0.7], [15, 'tL', 0.9]].forEach(function (x) {
      ev(t0 + x[0] * sd, 'perc', function (t) { play(t, S.buf[x[1]], 'timb', hum(v * x[2], 0.06)); });
    });
  }
  function quenaLine(t0, sd, notes, N) {
    notes.forEach(function (x) {
      if (N > 0.5 && x.d < 4) return;                                          // de noche solo las notas largas
      ev(t0 + x.s * sd + (rnd() - 0.5) * 0.01, 'mel', function (t) {
        quena(t, x.n, x.d * sd * 0.97, { vel: hum(0.7 * (1 - 0.25 * N), 0.06), scoop: x.f.indexOf('~') >= 0, vib: x.f.indexOf('v') >= 0 || x.d >= 6, breath: 1 + 0.8 * N });
      });
    });
  }
  var CERRO_P = {
    explore: {
      kind: 'explore', bpm: 96, sd: 60 / 96 / 4, len: 16, loop: true, resume: 8,
      layers: function (I, b) {
        var L = { guiro: 1, bass: 1, rhythm: 1, lead: 1 };
        if (I >= 0.2 || b % 8 >= 6) L.quena = 1;
        if (I >= 0.5) L.conga = 1;
        if (I >= 0.85) { L.timb = 1; if (b % 16 >= 8) L.lead2 = 1; }
        return L;
      },
      fx: { trem: 0.04, tremHz: 6, slap: 0.2, echo: 0.5, echoT: 0.469, spring: 0.45 },
      bar: function (b, t0, sd, L) {
        var i = b % 16, ch = chord(CER_CH[i]), nx = chord(CER_CH[(i + 1) % 16]), N = nightX(t0);
        if (L.guiro) huaynoGuiro(t0, sd, 0.9);
        if (L.bass) huaynoBass(t0, sd, ch, nx, 0.85);
        if (L.rhythm) huaynoRhythm(t0, sd, ch, 0.72);
        if (L.conga) huaynoConga(t0, sd, 0.9);
        if (L.timb) huaynoTimb(t0, sd, i, 0.85);
        if (L.lead) melody(t0, sd, CER_MEL[i], ch, { vel: 0.82 * (1 - 0.2 * N), thin: rnd() < N, wah: 0.3 });
        if (L.lead2) melody(t0, sd, CER_MEL[i], ch, { vel: 0.5, harm: true, layer: 'lead2', wah: 0.3 });
        if (L.quena) quenaLine(t0, sd, CER_Q[i], N);
        if (N > 0.02) nightExplore(t0, sd, i);
      }
    }
  };
  // La salsa del Cerro: otra cadencia (la misma La menor: empieza en Am y termina en E7, así el puente E-G#-B -> La sirve igual) y otro mambo de metales y coro.
  var CHASE_CH2 = [['Am', 'G'], ['F', 'G'], ['Dm', 'Am'], ['E7', 'E7']];
  var MAMBO2_T = ['0:A4:1 2:C5:1 3:E5:2! 6:A5:2 8:G5:1 10:D5:1 11:B4:2! 14:D5:2',
                  '0:C5:2! 3:A4:1 4:F4:2 6:A4:2 8:B4:1 10:D5:1 11:G5:2! 14:F5:2',
                  '0:A5:2! 3:F5:1 4:D5:2 6:F5:2 8:E5:1 10:C5:1 11:A4:2! 14:C5:2',
                  '0:G#5:3! 4:E5:1 5:D5:1 6:B4:1 8:G#4:2 11:B4:2! 14:D5:1 15:E5:1'].map(P);
  var MAMBO2_B = ['0:A3:2 4:C4:2 8:G3:2 12:B3:2', '0:F3:2 4:A3:2 8:G3:2 12:D4:2', '0:D3:2 4:F3:2 8:A3:2 12:C4:2', '0:E3:2 3:B3:1 6:G#3:1 8:E3:2 12:G#3:2'].map(P);
  var CORO2 = [[[0, 'E5', 2, 'o'], [2, 'C5', 2, 'o'], [4, 'A4', 4, 'e'], [10, 'B4', 2, 'a'], [12, 'D5', 3, 'o']],
               [[0, 'F5', 2, 'a'], [2, 'C5', 2, 'a'], [4, 'A4', 4, 'e'], [10, 'D5', 2, 'a'], [12, 'G5', 3, 'o']],
               [[0, 'D5', 2, 'o'], [2, 'F5', 2, 'o'], [4, 'A5', 4, 'e'], [10, 'E5', 2, 'a'], [12, 'C5', 3, 'o']],
               [[0, 'G#4', 3, 'a'], [3, 'B4', 1, 'a'], [4, 'D5', 4, 'o'], [10, 'B4', 2, 'u'], [12, 'G#4', 3, 'o']]];
  function cerroOn() { return !!S && S.level === 'cerro'; }
  function chaseCh(i) { return (cerroOn() ? CHASE_CH2 : CHASE_CH)[((i % 4) + 4) % 4]; }
  function pieceOf(m, lv) { return (lv === 'cerro' && CERRO_P[m]) || PIECES[m]; }
  function pc(m) { return pieceOf(m, S ? S.level : wantLevel); }
  function warmCerro() { for (var m = M('C#6'); m <= M('E6'); m++) ks(m, 'lead'); }      // las notas agudas de la melodía del Cerro, para que no se calculen en pleno compás

  // ---------------------------------------------------------------------------------------------------------
  // 7) La orquesta zombie (diegética): «Velorio en Clave» — salsa dura, 168 bpm, Re menor, clave 2-3.
  //    Timbal, conga, trompeta, bajo y un sonero sin palabras. Banda en vivo, cansada y un poco suelta: cada músico tiene su
  //    propio "lag" que deriva (el bajista y el sonero van atrás, la trompeta se apura) más un temblor por nota, todo dentro
  //    de ±25 ms; el tempo respira ±0,9 % por barra; la trompeta nunca está del todo afinada y a veces se agria; el sonero
  //    entra arrastrando desde abajo, se cae de afinación al final de cada nota y tiene un vibrato ancho e irregular.
  //    Ciclo de 8 barras (cada barra = un ciclo de clave): 0-3 montuno Rem–La7 con coro (sonero + trompeta a la octava)
  //    alternando con pregones; 4-7 mambo de trompeta sobre Solm–Rem / La7–Rem / Solm–Rem / Sib–La7, con fills de timbal.
  //    Fuente posicional: plena a 60 px, muda a ~600 px; paneo y paso bajo por distancia. La banda sonora baja cerca.
  var BAND_SD = 60 / 168 / 2, BAND_NEAR = 60, BAND_FAR = 600;
  var BAND_CH = [['Dm', 'A7'], ['Dm', 'A7'], ['Dm', 'A7'], ['Dm', 'A7'], ['Gm', 'Dm'], ['A7', 'Dm'], ['Gm', 'Dm'], ['Bb', 'A7']];
  var BAND_CORO = P('0:A4:1 1:D5:2 3:F5:1 4:E5:2 6:D5:2 8:E5:2 10:C#5:2 12:A4:4');
  var BAND_CORO_V = ['o', 'e', 'a', 'o', 'e', 'a', 'o', 'u'];
  var BAND_PREGON = ['2:D5:1 3:F5:1 4:A5:3 8:G5:1 9:F5:1 10:E5:2 12:C#5:1 13:E5:2',
                     '1:F5:2 3:E5:1 4:D5:2 8:A4:2 10:C#5:2 12:E5:3',
                     '0:A5:4 4:G5:1 5:F5:1 6:E5:2 8:E5:1 9:F5:1 10:E5:1 11:D5:1 12:C#5:2',
                     '3:D5:1 4:D5:1 5:E5:1 6:F5:2 8:G5:2 10:F5:1 11:E5:1 12:C#5:3'].map(P);
  var BAND_MONA = P('13:E5:1 14:F5:1 15:E5:1');
  var BAND_MAMBO = ['0:D5:1 1:G5:2! 3:Bb5:1 4:A5:2 6:G5:1 7:F5:1 8:A5:3! 11:F5:1 12:D5:2 14:E5:1 15:F5:1',
                    '0:E5:2! 2:G5:1 3:E5:1 4:C#5:2 6:A4:2 8:D5:1 9:F5:1 10:A5:2! 12:F5:1 13:D5:3',
                    '0:Bb5:2! 2:A5:1 3:G5:1 4:F5:1 5:G5:1 6:A5:2 8:F5:3! 11:D5:1 12:A4:2 14:D5:2',
                    '0:D5:2! 2:F5:1 3:Bb5:3 6:A5:2 8:G5:1 9:E5:1 10:C#5:2! 12:E5:1 13:G5:1 14:A5:2'].map(P);
  var BAND_INST = {              // vol, paneo dentro de la tarima, lag propio (s)
    timb:  { vol: 0.34, pan: 0.3, lag: 0 },
    conga: { vol: 0.36, pan: -0.32, lag: -0.003 },
    bass:  { vol: 0.28, pan: 0.05, lag: 0.007 },
    tpt:   { vol: 0.19, pan: 0.18, lag: -0.005 },
    voz:   { vol: 1.5, pan: -0.08, lag: 0.011 }
  };
  var BAND_VOL = 0.95;
  var BVOW = { a: [700, 1220, 2600], o: [500, 880, 2450], e: [430, 1800, 2500], u: [340, 740, 2350], i: [300, 2100, 2850] };
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function cymbalBuf() {
    var sr = S.sr, dur = 2.2, n = Math.ceil(dur * sr), d = noise(n), i, k;
    biq(d, 'hp', 2800, 0.7, sr); biq(d, 'hp', 2800, 0.7, sr);
    var part = [[3150, 0.5, 0.6], [4270, 0.4, 0.5], [5110, 0.35, 0.7], [6820, 0.25, 0.4], [2390, 0.3, 0.3]];
    for (i = 0; i < n; i++) {
      var t = i / sr, y = 0;
      for (k = 0; k < part.length; k++) y += part[k][1] * Math.exp(-t / part[k][2]) * (Math.sin(2 * Math.PI * part[k][0] * t) > 0 ? 1 : -1);
      d[i] = d[i] * 1.6 * (0.75 * Math.exp(-t / 0.7) + 0.25 * Math.exp(-t / 0.05)) + 0.12 * y;
    }
    biq(d, 'lp', 11000, 0.7, sr);
    return toBuf(norm(d, 0.9));
  }
  function buildBand() {
    var c = S.ctx, n = S.n, B = S.B = {
      state: 'off', x: 0, y: 0, bar: 0, nextBar: 0, queue: [], bias: {}, hum: [], sour: 0, cracks: 0, late: 0, dropped: 0,
      bars: [], last: {}, a: 0, g: 0, d: 1e9, duckDb: 0, fadeEnd: 0, cuts: 0, starts: 0
    };
    B.mix = c.createGain(); B.mix.gain.value = BAND_VOL;
    B.hp = c.createBiquadFilter(); B.hp.type = 'highpass'; B.hp.frequency.value = 65; B.hp.Q.value = 0.7;
    B.fade = c.createGain(); B.fade.gain.value = 0;              // tocando / callados (fundido o corte)
    B.post = c.createGain();                                     // el acorde del corte entra aquí (después del fade)
    B.moodG = c.createGain();                                    // un poco más baja si la banda sonora está en persecución
    B.lp = c.createBiquadFilter(); B.lp.type = 'lowpass'; B.lp.frequency.value = 16000; B.lp.Q.value = 0.5;
    B.pan = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
    B.dist = c.createGain(); B.dist.gain.value = 0;
    B.wet = c.createGain(); B.wet.gain.value = 0.2;
    B.mix.connect(B.hp); B.hp.connect(B.fade); B.fade.connect(B.post); B.post.connect(B.moodG); B.moodG.connect(B.lp);
    B.lp.connect(B.pan); B.pan.connect(B.dist); B.dist.connect(n.plp);     // comparte pausa, compresor y trim con la banda sonora
    B.dist.connect(B.wet); B.wet.connect(n.send);
    B.inst = {};
    Object.keys(BAND_INST).forEach(function (k) {
      var d = BAND_INST[k], g = c.createGain(), p = c.createStereoPanner ? c.createStereoPanner() : null;
      g.gain.value = d.vol;
      if (p) { p.pan.value = d.pan; g.connect(p); p.connect(B.mix); } else g.connect(B.mix);
      B.inst[k] = g; B.bias[k] = d.lag;
    });
    // trompeta: campana opaca, algo nasal (trompeta vieja de calle)
    var tin = c.createGain(), e1 = c.createBiquadFilter(), e2 = c.createBiquadFilter(), e3 = c.createBiquadFilter();
    e1.type = 'peaking'; e1.frequency.value = 1450; e1.Q.value = 1.1; e1.gain.value = 4;
    e2.type = 'highshelf'; e2.frequency.value = 4000; e2.gain.value = -8;
    e3.type = 'highpass'; e3.frequency.value = 300; e3.Q.value = 0.6;
    tin.connect(e1); e1.connect(e2); e2.connect(e3); e3.connect(B.inst.tpt);
    B.tptIn = tin;
    // el acorde del corte no pasa por el fade (que se cierra en ese instante): entradas propias después del fade
    var ct = c.createGain(), ce = c.createBiquadFilter();
    ct.gain.value = BAND_INST.tpt.vol * BAND_VOL; ce.type = 'highshelf'; ce.frequency.value = 4000; ce.gain.value = -8;
    ct.connect(ce); ce.connect(B.post); B.tptCut = ct;
    B.vozCut = c.createGain(); B.vozCut.gain.value = BAND_INST.voz.vol * BAND_VOL; B.vozCut.connect(B.post);
    B.cym = cymbalBuf();
    var br = noise(Math.ceil(S.sr * 1.0)); biq(br, 'hp', 500, 0.7, S.sr); B.breath = toBuf(norm(br, 0.9));
  }

  // humanizar: lag del músico + temblor por nota, dentro de ±25 ms
  function bev(t, inst, fn) {
    var B = S.B, nn = nightAt(t), off = clamp(B.bias[inst] + (rnd() * 2 - 1) * (0.015 + 0.012 * nn), -0.025 - 0.015 * nn, 0.025 + 0.015 * nn);   // de noche tocan más sueltos (±40 ms)
    if (B.hum.length < 4000) B.hum.push(off);
    B.queue.push({ t: t + off, fn: fn });
  }
  function bplay(t, buf, inst, vel, rate) { play(t, buf, S.B.inst[inst], vel, rate); }
  function btpt(t, midi, dur, o) {
    o = o || {};
    var B = S.B, nn = nightAt(t), cents = (rnd() - 0.5) * 16 * (1 + nn), scoop = 40 + rnd() * 40, r = rnd();
    if (r < 0.085 + 0.07 * nn) { cents += (rnd() < 0.6 ? 1 : -1) * (35 + rnd() * 35); B.sour++; }    // nota agria
    else if (r < 0.12 + 0.1 * nn) { scoop = 160 + rnd() * 120; B.cracks++; }                        // entra quebrada desde abajo
    horn(t, midi, dur, { vel: o.vel || 0.8, acc: o.acc, dest: o.dest || B.tptIn, cents: cents, scoop: scoop, fall: o.fall, bright: 0.8, shake: o.shake });
  }
  // sonero: diente de sierra → paso bajo "glotal" + aliento → 3 formantes por nota; arrastre, caída y vibrato cansado
  function sonero(t, midi, dur, vowel, vel, o) {
    o = o || {};
    var c = S.ctx, dest = o.dest || S.B.inst.voz, end = t + dur, stop = end + 0.4 + (o.fall || 0);
    var src = c.createOscillator(); src.type = 'sawtooth'; src.frequency.value = hz(midi);
    var sc = o.scoop !== undefined ? o.scoop : 50 + rnd() * 90, sag = -(12 + rnd() * 30);
    src.detune.setValueAtTime(-sc, t); src.detune.setTargetAtTime(sag * 0.25, t, 0.045);
    if (o.fall) { src.detune.setTargetAtTime(-o.fallCents, t + 0.05, o.fall * 0.45); }
    else src.detune.setTargetAtTime(sag, t + dur * 0.55, dur * 0.35 + 0.02);
    var l1 = c.createOscillator(), l2 = c.createOscillator(), g1 = c.createGain(), g2 = c.createGain();
    l1.frequency.value = 4.1 + rnd() * 0.9; l2.frequency.value = 6.6 + rnd() * 1.4;
    g1.gain.setValueAtTime(0, t); g1.gain.linearRampToValueAtTime(22 + rnd() * 24, t + Math.min(0.45, dur * 0.7) + 0.01);
    g2.gain.value = 7 + rnd() * 5;
    l1.connect(g1); l2.connect(g2); g1.connect(src.detune); g2.connect(src.detune);
    var glp = c.createBiquadFilter(); glp.type = 'lowpass'; glp.frequency.value = 2400; glp.Q.value = 0.4;
    src.connect(glp);
    var nz = c.createBufferSource(); nz.buffer = S.B.breath; nz.loop = true;
    var nzg = c.createGain(); nzg.gain.value = 0.06 + rnd() * 0.05; nz.connect(nzg);
    var v = BVOW[vowel] || BVOW.a, v2 = o.to ? BVOW[o.to] : null, sum = c.createGain();
    for (var k = 0; k < 3; k++) {
      var bp = c.createBiquadFilter(), fg = c.createGain();
      bp.type = 'bandpass'; bp.Q.value = [5, 8, 10][k]; bp.frequency.setValueAtTime(v[k] * (0.97 + rnd() * 0.06), t);
      if (v2) bp.frequency.setTargetAtTime(v2[k], t + dur * 0.4, dur * 0.25 + 0.02);
      fg.gain.value = [1.0, 0.6, 0.3][k];
      glp.connect(bp); nzg.connect(bp); bp.connect(fg); fg.connect(sum);
    }
    var env = c.createGain(), pk = vel * (0.85 + rnd() * 0.3);
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(pk, t + 0.05 + rnd() * 0.03);
    env.gain.setTargetAtTime(pk * 0.8, t + 0.1, 0.2);
    env.gain.setTargetAtTime(0, end + (o.fall ? o.fall * 0.4 : 0), o.fall ? o.fall * 0.3 : 0.07);
    sum.connect(env); env.connect(dest);
    src.start(t); l1.start(t); l2.start(t); nz.start(t, rnd() * 0.8);
    src.stop(stop); l1.stop(stop); l2.stop(stop); nz.stop(stop);
  }

  function bandBass(t0, sd, pair, nextFirst) {
    for (var j = 0; j < 2; j++) {
      var ch = chord(pair[j]), nx = chord(j === 0 ? pair[1] : nextFirst), r = rootIn(ch, 38), nr = rootIn(nx, 38), f5 = r + 7;
      if (f5 > 50) f5 -= 12;
      (function (j, f5, nr) {
        bev(t0 + (8 * j + 3) * sd, 'bass', function (t) { bass(t, f5 - 0.09, 2.5 * sd, hum(0.78, 0.1), true, S.B.inst.bass); });
        bev(t0 + (8 * j + 6) * sd, 'bass', function (t) { bass(t, nr - 0.09, 4.4 * sd, hum(0.95, 0.08), true, S.B.inst.bass); });
        if (rnd() < 0.25) bev(t0 + (8 * j + 5) * sd, 'bass', function (t) { bass(t, nr - 0.09, 0.6 * sd, 0.4, true, S.B.inst.bass); });   // nota fantasma
      })(j, f5, nr);
    }
  }
  function bandConga(t0, sd, hot) {
    for (var j = 0; j < 2; j++) {
      var m0 = t0 + 8 * j * sd, pat = [[0, 'cHeel', 0.35], [1, 'cToe', 0.25], [2, 'cSlap', 0.85], [3, 'cToe', 0.28], [4, 'cHeel', 0.35], [5, 'cToe', 0.25], [6, 'cOpen', 0.8], [7, 'tOpen', 0.9]];
      if (hot && rnd() < 0.5) pat.push([3.5, 'cSlap', 0.45]);
      if (rnd() < 0.3) pat.push([5, 'cOpen', 0.5]);
      pat.forEach(function (x) { bev(m0 + x[0] * sd, 'conga', function (t) { bplay(t, S.buf[x[1]], 'conga', hum(x[2], 0.12), 0.93); }); });
    }
  }
  function bandTimbal(t0, sd, i) {
    if (i < 4) CASC23.forEach(function (s) { bev(t0 + s * sd, 'timb', function (t) { bplay(t, S.buf.casc, 'timb', hum(CLAVE23.indexOf(s) >= 0 ? 0.9 : 0.6, 0.12), 0.95); }); });
    else [0, 2, 4, 6, 8, 10, 12, 14].forEach(function (s) { bev(t0 + s * sd, 'timb', function (t) { bplay(t, S.buf.campana, 'timb', hum(s % 4 === 0 ? 0.62 : 0.45, 0.1), 0.88); }); });
    if (i === 0 || i === 4) bev(t0, 'timb', function (t) { bplay(t, S.buf.tRim, 'timb', 0.6, 0.97); bplay(t, S.buf.cym, 'timb', 0.22); });
    if (i === 3 || i === 7) [[12, 'tH', 0.55], [12.5, 'tH', 0.4], [13, 'tL', 0.6], [13.5, 'tL', 0.45], [14, 'tH', 0.7], [14.5, 'tL', 0.6], [15, 'tL', 0.8]].forEach(function (x) {
      bev(t0 + x[0] * sd, 'timb', function (t) { bplay(t, S.buf[x[1]], 'timb', hum(x[2], 0.1), 0.96); });
    });
  }
  function bandVoice(t0, sd, notes, vowels, vel, oct) {
    notes.forEach(function (x, k) {
      var vw = vowels ? vowels[k % vowels.length] : pick(['a', 'o', 'e', 'a', 'o']);
      bev(t0 + x.s * sd, 'voz', function (t) { sonero(t, x.n + (oct || -12), x.d * sd * 0.92, vw, vel, { to: x.d >= 3 ? pick(['o', 'a', 'u']) : null }); });
    });
  }
  function bandMusic(i, t0, sd) {
    var B = S.B, pair = BAND_CH[i], nf = BAND_CH[(i + 1) % 8][0];
    bandBass(t0, sd, pair, nf);
    bandConga(t0, sd, i >= 4);
    bandTimbal(t0, sd, i);
    if (i < 4) {
      if (i % 2 === 0) {                                  // coro: el sonero y la trompeta a la octava
        bandVoice(t0, sd, BAND_CORO, BAND_CORO_V, 0.9);
        BAND_CORO.forEach(function (x) { bev(t0 + x.s * sd, 'tpt', function (t) { btpt(t, x.n, x.d * sd * 0.85, { vel: 0.45 }); }); });
      } else {                                            // pregón (al azar) + moña de trompeta de vuelta al coro
        bandVoice(t0, sd, pick(BAND_PREGON), null, 0.85);
        BAND_MONA.forEach(function (x) { bev(t0 + x.s * sd, 'tpt', function (t) { btpt(t, x.n, x.d * sd * 0.8, { vel: 0.6 }); }); });
      }
    } else {
      BAND_MAMBO[i - 4].forEach(function (x, k, arr) {
        var lastN = k === arr.length - 1;
        bev(t0 + x.s * sd, 'tpt', function (t) { btpt(t, x.n, x.d * sd * 0.86, { vel: 0.8, acc: x.f.indexOf('!') >= 0, fall: lastN && i === 7 ? 0 : (lastN && rnd() < 0.5 ? 0.25 : 0) }); });
      });
      if (i === 4 || i === 6) {                           // «¡oé!» del sonero sobre el mambo
        bev(t0, 'voz', function (t) { sonero(t, M('A3'), sd * 0.9, 'o', 0.8, { scoop: 120 }); });
        bev(t0 + sd, 'voz', function (t) { sonero(t, M('D4'), 2.2 * sd, 'e', 0.85, { to: 'i' }); });
      }
    }
    if (B.fresh) {                                        // golpe de entrada después de la cuenta
      B.fresh = false;
      bev(t0, 'tpt', function (t) { btpt(t, M('A5'), sd * 1.4, { vel: 0.9, acc: true }); });
      bev(t0, 'timb', function (t) { bplay(t, S.buf.tRim, 'timb', 0.85); });
    }
  }
  // cuenta «un, dos… un, dos, tres» con palitos de timbal, y el sonero que masculla
  function bandCountIn(t0, sd) {
    [[0, 1], [4, 1], [8, 0.75], [10, 0.8], [12, 0.9]].forEach(function (x) {
      bev(t0 + x[0] * sd, 'timb', function (t) { bplay(t, S.buf.clave, 'timb', 0.42 * x[1], 0.8); bplay(t + 0.003, S.buf.casc, 'timb', 0.7 * x[1], 1.06); });
    });
    bev(t0, 'voz', function (t) { sonero(t, M('A3'), 1.6 * sd, 'u', 0.55, { scoop: 30 }); });
    bev(t0 + 4 * sd, 'voz', function (t) { sonero(t, M('F3'), 1.8 * sd, 'o', 0.55, { scoop: 30 }); });
    bev(t0 + 14 * sd, 'timb', function (t) { bplay(t, S.buf.tH, 'timb', 0.55); });
    bev(t0 + 15 * sd, 'timb', function (t) { bplay(t, S.buf.tL, 'timb', 0.7); });
    bev(t0 + 14 * sd, 'bass', function (t) { bass(t, M('A2') - 0.09, 1.6 * sd, 0.7, true, S.B.inst.bass); });
  }
  function bandBar() {
    var B = S.B, t0 = B.nextBar, sd = BAND_SD * (1 + (rnd() - 0.5) * 0.018) * (1 + 0.07 * nightAt(t0));          // el tempo respira ±0,9 %; de noche, 7 % más lento
    Object.keys(B.bias).forEach(function (k) { var c0 = BAND_INST[k].lag; B.bias[k] = clamp(B.bias[k] + (rnd() - 0.5) * 0.008, c0 - 0.01, c0 + 0.01); });
    if (B.state === 'countin') { bandCountIn(t0, sd); B.state = 'playing'; B.bar = 0; B.fresh = true; }
    else { bandMusic(B.bar % 8, t0, sd); B.bar++; }
    B.nextBar = t0 + 16 * sd;
    B.bars.push({ t: t0, sd: sd });
    if (!S.offline && B.bars.length > 32) B.bars.shift();
    B.queue.sort(function (a, b) { return a.t - b.t; });
  }
  // el corte: acorde desafinado que se cae + platillo ahogado + manotazo de conga
  function bandCut(t) {
    var B = S.B, c = S.ctx, d = B.post;
    B.queue = [];
    B.fade.gain.cancelScheduledValues(t); B.fade.gain.setTargetAtTime(0, t, 0.02);
    horn(t, M('F5'), 0.16, { vel: 0.95, acc: true, dest: B.tptCut, cents: 38, scoop: 30, fall: 0.85 });
    horn(t + 0.012, M('Ab4'), 0.14, { vel: 0.7, dest: B.tptCut, cents: -27, scoop: 20, fall: 1.0 });
    sonero(t + 0.02, M('D4'), 0.12, 'a', 1.0, { dest: B.vozCut, scoop: 0, fall: 0.8, fallCents: 1100 });
    var o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
    o.setPeriodicWave(S.n.bassWave); o.frequency.setValueAtTime(hz(M('D2') - 0.2), t); o.frequency.exponentialRampToValueAtTime(hz(M('D1')), t + 0.7);
    lp.type = 'lowpass'; lp.frequency.value = 700;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32, t + 0.008); g.gain.setTargetAtTime(0, t + 0.35, 0.15);
    o.connect(lp); lp.connect(g); g.connect(d); o.start(t); o.stop(t + 1.2);
    var cs = c.createBufferSource(), cg = c.createGain();          // platillo ahogado con la mano
    cs.buffer = B.cym; cg.gain.setValueAtTime(0.3, t); cg.gain.setValueAtTime(0.3, t + 0.13); cg.gain.linearRampToValueAtTime(0, t + 0.16);
    cs.connect(cg); cg.connect(d); cs.start(t); cs.stop(t + 0.2);
    play(t, S.buf.cSlap, d, 0.45, 0.93); play(t + 0.01, S.buf.tL, d, 0.4, 0.9);
    B.cuts++;
  }
  // tarima → oyente: ganancia, paneo y oscuridad por distancia; mezcla con la banda sonora
  function bandSpatial(force) {
    var B = S.B; if (!B) return;
    var t = now();
    if (!force && t - (B.lastSp || -1) < 0.04) return;
    B.lastSp = t;
    if (!S.offline && !S.lisSet) {        // el motor aún no reenvía el oyente: usar la cámara del juego
      try { var G = ACH.game.G, V = ACH.render.VIEW; S.lx = G.cam.x + V.w / 2; S.ly = G.cam.y + V.h / 2; } catch (e) { /* nada */ }
    }
    var dx = B.x - S.lx, dy = B.y - S.ly, d = Math.sqrt(dx * dx + dy * dy);
    var u = clamp((d - BAND_NEAR) / (BAND_FAR - BAND_NEAR), 0, 1), g = Math.pow(1 - u, 2.2);
    var on = B.state === 'playing' || B.state === 'countin' ? 1 : 0;
    var chase = S.mood === 'chase' || S.mood === 'horde';
    B.d = d; B.g = g; B.a = Math.pow(g, 0.8) * on;          // cuánto se oye la banda: guía el duck de la banda sonora
    B.duckDb = (chase ? -3 : -12) * B.a;
    var tc = force ? 0.03 : 0.08, L = B.last;
    function set(key, param, v, eps, tcc) { if (L[key] === undefined || Math.abs(L[key] - v) > eps) { L[key] = v; param.setTargetAtTime(v, t, tcc || tc); } }
    set('g', B.dist.gain, g, 0.002);
    if (B.pan.pan) set('p', B.pan.pan, clamp(dx / 260, -1, 1) * 0.85, 0.01);
    set('lp', B.lp.frequency, 16000 * Math.pow(0.12, u), 60);
    set('w', B.wet.gain, 0.2 * (1 + 2 * u), 0.01);
    set('m', B.moodG.gain, chase ? 0.63 : 1, 0.01, 0.5);
    set('duck', S.n.duck.gain, Math.pow(10, B.duckDb / 20), 0.004, 0.35);
  }
  function bandTick(t) {
    var B = S.B; if (!B) return;
    if (B.state === 'fading' && t >= B.fadeEnd) { B.state = 'off'; B.queue = []; }
    if (B.state === 'playing' || B.state === 'countin' || B.state === 'fading') {
      if (B.nextBar < t - 0.02) { B.queue = B.queue.filter(function (e) { return e.t >= t; }); B.nextBar = t + 0.05; }
      while (B.nextBar < t + 0.16) bandBar();
    }
    var q = B.queue, k = 0;
    while (k < q.length && q[k].t < t + 0.13) {
      var e = q[k++];
      if (e.t >= t - 0.01) { if (e.t < t) B.late++; try { e.fn(Math.max(e.t, t + 0.001)); } catch (err) { if (S.offline) throw err; } }
      else B.dropped++;
    }
    if (k) q.splice(0, k);
    bandSpatial(false);
  }
  function bandSet(x, y, on, mode) {
    var B = S.B; if (!B) return;
    if (typeof x === 'number' && isFinite(x)) B.x = x;
    if (typeof y === 'number' && isFinite(y)) B.y = y;
    var t = now();
    if (on) {
      if (B.state === 'playing' || B.state === 'countin') { bandSpatial(true); return; }
      if (B.state === 'fading' && B.fade.gain.value > 0.15) {        // se estaba yendo: vuelve sin contar
        B.state = 'playing'; B.fade.gain.cancelScheduledValues(t); B.fade.gain.setTargetAtTime(1, t, 0.15);
      } else {
        B.queue = []; B.state = 'countin'; B.nextBar = t + 0.12; B.starts++;
        B.fade.gain.cancelScheduledValues(t); B.fade.gain.setTargetAtTime(1, t, 0.01);
      }
    } else if (B.state !== 'off') {
      if (mode === 'cut') { if (B.state !== 'fading' || B.fade.gain.value > 0.05) bandCut(t + 0.01); B.state = 'off'; }
      else if (B.state !== 'fading') { B.state = 'fading'; B.fadeEnd = t + 3; B.fade.gain.cancelScheduledValues(t); B.fade.gain.setTargetAtTime(0, t, 0.6); }
    }
    bandSpatial(true);
  }
  function humStats(a) {
    if (!a.length) return null;
    var n = a.length, s = 0, s2 = 0, mx = 0, ab = 0;
    a.forEach(function (v) { s += v; s2 += v * v; ab += Math.abs(v); mx = Math.max(mx, Math.abs(v)); });
    var m = s / n;
    return { n: n, meanMs: +(m * 1000).toFixed(1), sdMs: +(Math.sqrt(s2 / n - m * m) * 1000).toFixed(1), meanAbsMs: +(ab / n * 1000).toFixed(1), maxAbsMs: +(mx * 1000).toFixed(1) };
  }

  // ---------------------------------------------------------------------------------------------------------
  // secuenciador
  function applyFx(p, t, tcs) {          // tcs: constante de tiempo lenta (fundido de la noche); sin ella, la de siempre
    var n = S.n, f = p.fx, N = S.nTarget;
    if (N > 0 && p.kind === 'explore') f = { trem: f.trem + 0.2 * N, tremHz: f.tremHz * (1 - 0.12 * N), slap: f.slap - 0.12 * N, echo: f.echo + 0.3 * N, echoT: f.echoT + 0.156 * N, spring: f.spring + 0.28 * N };   // más eco y resorte, eco a negras
    n.tdepth.gain.setTargetAtTime(f.trem * 0.5, t, tcs || 0.2);
    ['lead', 'lead2', 'solo'].forEach(function (k) { n.L[k].trem.gain.setTargetAtTime(1 - f.trem * 0.5, t, tcs || 0.2); });
    n.tlfo.frequency.setTargetAtTime(f.tremHz, t, tcs || 0.1);
    n.slapG.gain.setTargetAtTime(f.slap, t, tcs || 0.2);
    n.echoG.gain.setTargetAtTime(f.echo, t, tcs || 0.3);
    n.sprG.gain.setTargetAtTime(f.spring, t, tcs || 0.3);
    if (tcs || Math.abs(n.echo.dl.delayTime.value - f.echoT) > 1e-3) n.echo.dl.delayTime.setTargetAtTime(f.echoT, t, tcs || 0.4);
  }
  // v0.8: parámetros continuos de la noche: sombra de agudos, reverb, bordón y multiplicadores por capa; todos con la misma constante de tiempo
  function applyNight(t, tc) {
    var n = S.n, N = S.nTarget, nm = NM[S.mood] || {};
    function go(p, v) { p.cancelScheduledValues(t); p.setTargetAtTime(v, t, tc); }      // cancelar lo futuro: un cambio de ánimo anterior no pisa a la noche
    go(n.warm.gain, -4 - 7 * N); go(n.warm.frequency, 6500 - 3000 * N);
    go(n.sg.gain, S.sgBase * (1 + 0.9 * N));
    go(n.drone.gain, (DRONE[S.mood] || 0) * N);
    Object.keys(LAYERS).forEach(function (k) { go(n.L[k].nm.gain, 1 + ((nm[k] == null ? 1 : nm[k]) - 1) * N); });
  }
  function nightMoodTc(t) { return t - S.nT0 < 3 * S.nTc ? S.nTc : 0.3; }
  function setNightS(on, secs) {
    var t = now(), d = secs === undefined ? 8 : Math.max(0, +secs || 0);
    S.nFrom = nightAt(t); S.nT0 = t; S.nTarget = on ? 1 : 0; S.nTc = Math.max(0.001, d / 3);
    applyNight(t, S.nTc);
    applyFx(S.piece, t, S.nTc);
  }
  function setLayers(L, t, slow) {
    Object.keys(LAYERS).forEach(function (k) {
      if (ALWAYS[k]) return;
      var on = !!L[k], ly = S.n.L[k];
      if (on !== ly.on) {
        ly.on = on;
        ly.fade.gain.cancelScheduledValues(t);
        ly.fade.gain.setTargetAtTime(on ? LAYERS[k].vol : 0, t, on ? 0.12 : (slow || 0.25));
      }
    });
  }

  function generateBar() {
    var t0 = S.nextBar, entering = false;
    if (S.pending && t0 >= S.pending.at - 1e-6) {
      var from = S.mood;
      if (S.piece && S.piece.resume) S.saved[S.mood] = S.bar;
      S.mood = S.pending.mood; S.pending = null;
      S.piece = pc(S.mood);
      S.bar = S.piece.resume && S.saved[S.mood] ? Math.ceil(S.saved[S.mood] / S.piece.resume) * S.piece.resume : 0;
      entering = (S.mood === 'chase' || S.mood === 'horde') && from !== 'chase' && from !== 'horde';
      applyFx(S.piece, t0); applyNight(t0, nightMoodTc(t0));
      S.L = null;
      S.log.push({ t: t0, mood: S.mood, from: from });
    }
    if (S.piece !== pc(S.mood)) {              // v0.9: cambió el nivel: la pieza del ánimo actual se cambia en esta barra
      S.piece = pc(S.mood); S.bar = 0; S.L = null; applyFx(S.piece, t0); applyNight(t0, nightMoodTc(t0));
      S.log.push({ t: t0, mood: S.mood, from: S.mood, level: S.level });
    }
    var p = S.piece, b = S.bar, sd = p.sd;
    if (!S.L || b % 2 === 0) { S.L = p.layers(S.I, b); }
    else if (p === PIECES.chase || p === PIECES.horde || p === PIECES.won) { S.L = p.layers(S.I, b); }   // ciclos de 2 compases: la frase ya es la barra
    if (p.loop || b < p.len) {
      setLayers(S.L, t0);
      var q0 = S.queue.length;
      p.bar(p.loop ? b % p.len : b, t0, sd, S.L, entering);
      var nl = nightX(t0);
      if (nl > 0.02) for (var qi = q0; qi < S.queue.length; qi++) {          // noche: tocan «atrás del pulso» (la melodía y la percusión se arrastran)
        var qe = S.queue[qi];
        if (qe.k === 'mel') qe.t += 0.03 * nl; else if (qe.k === 'perc') qe.t += 0.012 * nl;
      }
    } else setLayers({}, t0, 0.6);
    S.barStart = t0; S.barSd = sd;
    S.nextBar = t0 + 16 * sd;
    S.bar++;
    S.bars.push({ t: t0, sd: sd, mood: S.mood, b: b });
    if (!S.offline && S.bars.length > 64) S.bars.shift();
    if (S.pending) settle(S.pending);       // fill diferido / corte a media barra cuando el cambio cae dentro de esta barra
    sortQ();
  }
  // El cambio cae dentro de una barra ya generada: poner el fill y, si es a media barra, cortar el resto de la barra actual.
  function settle(pd) {
    if (pd.at > S.nextBar + 1e-6) return;
    if (!pd.filled) addFill(pd);
    if (pd.at < S.nextBar - 1e-6) {
      pd.mid = true;
      S.queue = S.queue.filter(function (e) { return !(e.t >= pd.at - 1e-4 && (e.k === 'perc' || e.k === 'bass' || e.k === 'mel')); });
      S.nextBar = pd.at;                   // la pieza nueva arranca su barra aquí (en pulso: siempre a múltiplo de 4 pasos)
    }
  }
  function addFill(pd) {
    pd.filled = true;
    if (!pd.fill) return;
    var sd = S.barSd, steps = pd.steps || 4, fs = pd.at - steps * sd;
    // la percusión y el bajo del ánimo actual se callan durante el fill
    S.queue = S.queue.filter(function (e) { return !(e.t >= fs - 1e-4 && e.t < pd.at && (e.k === 'perc' || e.k === 'bass')); });
    timbalFill(pd.at, sd, steps, true);
    sortQ();
  }

  var GROOVE = { explore: 1, chase: 1, horde: 1, won: 1 };
  function requestMood(m) {
    var t = now();
    if (S.bar === 0) {                        // aún no sonó nada: cambiar de pieza sin esperar
      S.mood = m; S.piece = pc(m); S.barSd = S.piece.sd; S.pending = null; S.L = null;
      applyFx(S.piece, t); applyNight(t, 0.3); S.log[S.log.length - 1].mood = m;
      return;
    }
    if (S.mood === m && !S.pending) return;
    if (S.pending && S.pending.mood === m) return;
    if (S.pending && S.mood === m) {          // se arrepintió antes de la barra: cancelar
      if (S.pending.mid) S.pending.mood = m;  // la barra ya se cortó: retoma la misma pieza en ese punto (con su fill)
      else S.pending = null;
      return;
    }
    // muerte o salida de un final: corta ya, con fundido
    if (m === 'dead' || S.mood === 'dead' || (S.mood === 'won' && S.bar >= PIECES.won.len)) {
      S.queue = S.queue.filter(function (e) { return e.t < t + 0.05; });
      Object.keys(LAYERS).forEach(function (k) { if (!ALWAYS[k]) { S.n.L[k].fade.gain.cancelScheduledValues(t); S.n.L[k].fade.gain.setTargetAtTime(0, t, 0.15); S.n.L[k].on = false; } });
      S.nextBar = t + 0.6;
      S.pending = { mood: m, at: S.nextBar, fill: false, filled: true };
      return;
    }
    var rem = S.nextBar - t, fill = !!GROOVE[m] && S.mood !== 'title' || m === 'explore';
    var pd = { mood: m, fill: fill, filled: false };
    var sd = S.barSd || S.piece.sd;
    var urgent = (m === 'chase' || m === 'horde') && S.mood !== 'chase' && S.mood !== 'horde';
    if (urgent) {
      // Persecución: no esperar la barra. Entra en el siguiente medio compás (8 pasos) si llega en <= 1,2 s, si no en el
      // siguiente pulso (4 pasos), siempre con un fill de timbal de 2 o 4 pasos como anacrusa. Peor caso ≈ 1,0–1,2 s.
      var first = null, halfC = null, bs = S.barStart;
      for (var k = 1; k <= 12; k++) {
        var at = bs + 4 * k * sd, r = at - t;
        if (r < 2 * sd + 0.06) continue;
        var c = { at: at, steps: r >= 4 * sd + 0.06 ? 4 : 2 };
        if (!first) first = c;
        if (k % 2 === 0 && r <= 1.2) { halfC = c; break; }
        if (r > 1.2) break;
      }
      var ch = halfC || first;
      pd.at = ch.at; pd.steps = ch.steps;
    } else if (rem >= 4 * sd + 0.06) { pd.at = S.nextBar; pd.steps = 4; }
    else if (rem >= 2 * sd + 0.06) { pd.at = S.nextBar; pd.steps = 2; }
    else { pd.at = S.nextBar + 16 * S.piece.sd; pd.steps = 4; }   // muy encima de la barra: la siguiente, con fill completo
    S.pending = pd;
    pd.asked = t;
    (S.pendLog = S.pendLog || []).push({ asked: t, at: pd.at, steps: pd.steps, mood: m, from: S.mood });
    if (!S.offline && S.pendLog.length > 16) S.pendLog.shift();
    settle(pd);
    sortQ();
  }

  function tick() {
    if (!S) return;
    var t = now();
    var hidden = !S.offline && typeof document !== 'undefined' && document.hidden;
    var horizon = hidden ? 1.5 : 0.13;
    if (S.nextBar < t - 0.02) {               // nos quedamos atrás (pestaña dormida, contexto suspendido): re-sincronizar
      S.queue = S.queue.filter(function (e) { return e.t >= t; });
      S.nextBar = t + 0.05;
      if (S.pending) { S.pending.at = S.nextBar; S.pending.filled = true; }
    }
    while (S.nextBar < t + horizon) generateBar();
    var q = S.queue, k = 0;
    while (k < q.length && q[k].t < t + horizon) {
      var e = q[k++];
      if (e.t >= t - 0.01) { if (e.t < t) S.late++; try { e.fn(Math.max(e.t, t + 0.001)); } catch (err) { if (S.offline) throw err; } }
      else S.dropped++;
    }
    bandTick(t);
    if (S.lastTick) S.maxGap = Math.max(S.maxGap, t - S.lastTick);
    S.lastTick = t;
    if (k) q.splice(0, k);
  }

  // ---------------------------------------------------------------------------------------------------------
  // stingers (encima de la música, en el paso siguiente de la rejilla)
  var STG_GAP = { kill: 0.55, hurt: 0.35, horde: 1.5, death: 2, win: 2, cobrador: 2.5 };
  function nextStep(t) {
    var sd = S.barSd || 0.15625, bs = S.barStart || t;
    var k = Math.ceil((t + 0.03 - bs) / sd);
    return bs + Math.max(0, k) * sd;
  }
  function stingerNow(name) {
    var t = now(), last = S.stgLast[name] || -9;
    if (t - last < (STG_GAP[name] || 0.4)) return;
    S.stgLast[name] = t;
    var A4 = M('A4'), g, q;
    if (name === 'kill') {
      q = nextStep(t); S.kills = (S.kills || 0) + 1;
      var v = S.kills % 4;
      if (v === 0) { gtr(q, M('E5'), 0.09, { layer: 'stg', vel: 0.35 }); gtr(q + 0.08, M('G5'), 0.2, { layer: 'stg', vel: 0.4, scoop: true }); }
      else if (v === 1) { horn(q, A4, 0.07, { vel: 0.5, stg: 1 }); horn(q + 0.08, M('E5'), 0.13, { vel: 0.6, acc: true, stg: 1 }); }
      else if (v === 2) { gtr(q, M('A5'), 0.06, { layer: 'stg', vel: 0.3 }); gtr(q + 0.06, M('G5'), 0.06, { layer: 'stg', vel: 0.3 }); gtr(q + 0.12, M('E5'), 0.25, { layer: 'stg', vel: 0.38, vib: true }); }
      else { [M('E5'), M('C5'), M('A4')].forEach(function (m) { horn(q, m, 0.1, { vel: 0.45, acc: true, stg: 1, fall: 0.18 }); }); }
    } else if (name === 'hurt') {
      q = t + 0.01;
      [M('Bb4'), M('B4'), M('F5')].forEach(function (m) { horn(q, m, 0.16, { vel: 0.55, acc: true, stg: 1, scoop: false }); });
      horn(q, M('F3'), 0.16, { tbn: true, vel: 0.6, stg: 1, scoop: false });
      play(q, S.buf.tRim, 'stg', 0.35);
    } else if (name === 'horde') {
      q = t + 0.02;
      [M('A4'), M('C5'), M('E5'), M('A5')].forEach(function (m) { horn(q, m, 0.22, { vel: 0.55, acc: true, stg: 1, fall: 0.7 }); });
      horn(q, M('A3'), 0.22, { tbn: true, vel: 0.6, stg: 1, fall: 0.7 });
      for (var i = 0; i < 20; i++) play(q + 0.3 + i * 0.045, S.buf[i % 2 ? 'tL' : 'tH'], 'stg', 0.12 + i * 0.012);
      play(q + 1.2, S.buf.tRim, 'stg', 0.45);
    } else if (name === 'death') {
      q = t + 0.02;
      [M('A3'), M('E4'), M('C5')].forEach(function (m, k) { horn(q, m, 0.9, { vel: 0.4, tbn: k === 0, stg: 1, fall: 1.4, scoop: 80 }); });
      play(q, S.buf.tL, 'stg', 0.4);
    } else if (name === 'win') {
      q = nextStep(t);
      [M('A4'), M('C#5'), M('E5'), M('A5')].forEach(function (m, k) { horn(q + k * 0.09, m, k === 3 ? 0.6 : 0.08, { vel: 0.55, acc: k === 3, stg: 1 }); });
      horn(q + 0.27, M('E5'), 0.6, { vel: 0.45, stg: 1 }); horn(q + 0.27, M('C#5'), 0.6, { vel: 0.42, stg: 1 }); horn(q + 0.27, M('A3'), 0.6, { tbn: true, vel: 0.5, stg: 1 });
      for (var j = 0; j < 8; j++) play(q + j * 0.035, S.buf[j % 2 ? 'tL' : 'tH'], 'stg', 0.15 + j * 0.03);
    } else if (name === 'cobrador') {
      q = nextStep(t);
      var doodle = [['E5', 0.07], ['G5', 0.07], ['A5', 0.07], ['B5', 0.15], ['A5', 0.07], ['G5', 0.07], ['E5', 0.07], ['G5', 0.32]], tt = q;
      doodle.forEach(function (x, k) { horn(tt, M(x[0]), x[1] * 0.9, { vel: 0.5, stg: 1, acc: k === 3, scoop: k === 3 ? 90 : 30, shake: k === 7 }); tt += x[1]; });
      horn(tt + 0.02, M('E3'), 0.1, { tbn: true, vel: 0.55, stg: 1, scoop: 120 });
    }
  }

  // ---------------------------------------------------------------------------------------------------------
  // API
  function init(ctx, out, reverbSend, offline, mood, I, level) {
    seed = 20251118;
    S = { ctx: ctx, sr: ctx.sampleRate, cache: {}, queue: [], offline: !!offline, vnow: 0, log: [], bars: [], saved: {}, stgLast: {}, I: I, paused: false, late: 0, dropped: 0, maxGap: 0, lastTick: 0,
          lx: offline ? 240 : gLX, ly: offline ? 135 : gLY, lisSet: offline || gLSet,
          nTarget: !offline && wantNight ? 1 : 0, nFrom: !offline && wantNight ? 1 : 0, nT0: 0, nTc: 0.001, level: level === 'cerro' ? 'cerro' : 'gambetta' };
    S.n = build(ctx, out, reverbSend || null);
    S.sgBase = S.n.sg.gain.value;
    buildSamples();
    if (S.level === 'cerro') warmCerro();
    buildBand();
    var t = now() + 0.08;
    // QA v0.5 #2: la música entra con fundido (0,45 s) en vez de golpe
    S.n.trim.gain.setValueAtTime(0, now()); S.n.trim.gain.linearRampToValueAtTime(TRIM, t + 0.45);
    S.mood = mood === 'paused' ? 'title' : mood;
    S.piece = pc(S.mood); S.bar = 0; S.nextBar = t; S.barStart = t; S.barSd = S.piece.sd;
    applyFx(S.piece, t); applyNight(now(), 0.001);
    S.log.push({ t: t, mood: S.mood, from: null });
    if (mood === 'paused') setPaused(true);
    if (!offline && wantBand) bandSet(wantBand.x, wantBand.y, wantBand.on, 'fade');
  }
  // QA v0.5 #3: un solo paso bajo en pausa. Si el motor ya filtra el bus de música (A._nodes.pauseLP), aquí solo se baja el
  // volumen. musicEngine.pauseFilter: null = automático, true = filtrar siempre aquí, false = nunca filtrar aquí.
  function pauseFilterOn() {
    var pf = engine.pauseFilter;
    if (pf === true || pf === false) return pf;
    if (S.offline) return true;                 // render de prueba: no hay motor detrás
    return !(A._nodes && A._nodes.pauseLP);
  }
  function setPaused(on) {
    if (S.paused === on) return;
    S.paused = on;
    var t = now(), n = S.n, f = on && pauseFilterOn() ? 650 : 20000;
    n.plp.frequency.setTargetAtTime(f, t, on ? 0.08 : 0.15);
    n.slp.frequency.setTargetAtTime(f, t, on ? 0.08 : 0.15);
    n.pg.gain.setTargetAtTime(on ? 0.316 : 1, t, 0.1);
    n.send.gain.setTargetAtTime(on ? 0.316 : 1, t, 0.1);
  }

  function isOffline(ctx) {
    var O = typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext : (typeof webkitOfflineAudioContext !== 'undefined' ? webkitOfflineAudioContext : null);
    return !!(O && ctx instanceof O);
  }
  var engine = {
    pauseFilter: null,                         // null: automático (no filtra si el motor ya filtra la música en pausa)
    start: function (ctx, out, reverbSend) {
      try {
        if (S) engine.stop(true);
        init(ctx, out, reverbSend, false, wantMood, wantI, wantLevel);
        S.timer = setInterval(tick, 25);      // el primer tick llega en <25 ms; la primera barra está a 80 ms
      } catch (e) { if (typeof console !== 'undefined') console.warn('musica: no arrancó', e); S = null; }
    },
    setMood: function (m) {
      if (!PIECES[m] && m !== 'paused') return;
      if (!S) { wantMood = m; return; }
      if (m === 'paused') { setPaused(true); return; }
      if (S.paused) setPaused(false);
      if (!S.offline) wantMood = m;
      requestMood(m);
    },
    setIntensity: function (v) {
      v = Math.max(0, Math.min(1, +v || 0));
      if (!S || !S.offline) wantI = v;
      if (S) S.I = v;
    },
    stinger: function (name) { if (S) { try { stingerNow(name); } catch (e) { if (S.offline) throw e; } } },
    // v0.8: variante nocturna. Fundido de ~8 s (secs = 0: al instante). Si la música aún no arrancó, se recuerda.
    setNight: function (on, secs) {
      on = !!on;
      if (!S || !S.offline) wantNight = on;
      if (!S) return;
      try { setNightS(on, secs); } catch (e) { if (S.offline) throw e; }
    },
    night: function () { return S ? +nightAt(now()).toFixed(3) : (wantNight ? 1 : 0); },
    // v0.9: nivel del juego ('gambetta' | 'cerro'). Cambia el explore (huayno en el Cerro) y el mambo de la salsa; la pieza activa se cambia en la siguiente barra.
    // Si la música aún no arrancó, se recuerda. Las posiciones guardadas de cada pieza (resume) se olvidan.
    setLevel: function (id) {
      id = id === 'cerro' ? 'cerro' : 'gambetta';
      if (!S || !S.offline) wantLevel = id;
      if (!S || S.level === id) return;
      S.level = id; S.saved = {};
      if (id === 'cerro') { try { warmCerro(); } catch (e) { if (S.offline) throw e; } }
    },
    level: function () { return S ? S.level : wantLevel; },
    // Orquesta zombie en (x, y) del mundo. on=true: arranca con cuenta «un, dos…» (o sigue, y solo se mueve);
    // on=false: se va con fundido; on=false con mode 'cut': se callan de golpe con acorde desafinado y platillo ahogado.
    diegetic: function (x, y, on, mode) {
      on = !!on;
      if (!S || !S.offline) wantBand = on ? { x: x, y: y, on: true } : null;
      if (!S) return;
      try { bandSet(x, y, on, mode); } catch (e) { if (S.offline) throw e; }
    },
    // centro de la cámara (mundo px); el motor lo reenvía cada cuadro
    setListener: function (x, y) {
      if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) return;
      if (!S || !S.offline) { gLX = x; gLY = y; gLSet = true; }
      if (S) { S.lx = x; S.ly = y; S.lisSet = true; try { bandSpatial(false); } catch (e) { /* nada */ } }
    },
    band: function () {
      var B = S && S.B;
      if (!B) return null;
      return { state: B.state, x: B.x, y: B.y, dist: Math.round(B.d), gain: +B.g.toFixed(3), duckDb: +B.duckDb.toFixed(2), bar: B.bar, queued: B.queue.length,
        late: B.late, dropped: B.dropped, sour: B.sour, cracks: B.cracks, cuts: B.cuts, starts: B.starts, hum: humStats(B.hum), bars: B.bars.slice() };
    },
    stop: function (quick) {
      if (!S) return;
      var s = S; S = null;
      clearInterval(s.timer);
      try {
        var t = s.offline ? s.vnow : s.ctx.currentTime;
        s.n.trim.gain.cancelScheduledValues(t); s.n.trim.gain.setTargetAtTime(0, t, quick ? 0.02 : 0.12);
        setTimeout(function () { try { s.n.trim.disconnect(); s.n.sg.disconnect(); s.n.tlfo.stop(); s.n.cvib.stop(); s.n.droneOsc.forEach(function (o) { o.stop(); }); } catch (e) { /* nada */ } }, quick ? 150 : 900);
      } catch (e) { /* nada */ }
    },
    state: function () { return S ? { night: +nightAt(now()).toFixed(3), mood: S.mood, pending: S.pending && S.pending.mood, bar: S.bar, intensity: S.I, paused: S.paused, queued: S.queue.length, late: S.late, dropped: S.dropped, maxGap: +S.maxGap.toFixed(3), bars: S.bars.length, t: now(), band: S.B ? S.B.state : 'off', bandLate: S.B ? S.B.late : 0 } : null; },
    // Render sin reloj real: script = [{t, mood|intensity|stinger|band:{x,y,on,mode}|listener:{x,y}}], dt fijo. Devuelve el log.
    // QA v0.5 #5: solo acepta OfflineAudioContext y NO toca el motor en vivo (estado propio; el vivo se restaura).
    _offline: function (ctx, out, reverbSend, script, dur) {
      var r = engine._offlineBegin(ctx, out, reverbSend, script);
      r.advance(dur);
      return r.end();
    },
    // versión por tramos: el que prueba llama advance(t) desde ctx.suspend(t) para crear nodos justo a tiempo, como en vivo
    _offlineBegin: function (ctx, out, reverbSend, script) {
      if (!isOffline(ctx)) throw new Error('musicEngine._offline: solo con OfflineAudioContext');
      script = (script || []).slice().sort(function (a, b) { return a.t - b.t; });
      var first = script.length && script[0].t === 0 && script[0].mood ? script.shift() : null;
      var live = S, me;
      try { init(ctx, out, reverbSend, true, first ? first.mood : 'explore', first && first.intensity !== undefined ? first.intensity : 0, first && first.level); me = S; }
      finally { S = live; }
      var si = 0, vt = 0;
      return {
        advance: function (tEnd) {
          var prev = S; S = me;
          try {
            for (; vt <= tEnd + 1e-9; vt += 0.025) {
              S.vnow = vt;
              while (si < script.length && script[si].t <= vt) {
                var c = script[si++];
                if (c.level) engine.setLevel(c.level);
                if (c.intensity !== undefined) engine.setIntensity(c.intensity);
                if (c.mood) engine.setMood(c.mood);
                if (c.stinger) engine.stinger(c.stinger);
                if (c.night !== undefined) engine.setNight(c.night, c.secs);
                if (c.listener) engine.setListener(c.listener.x, c.listener.y);
                if (c.band) engine.diegetic(c.band.x, c.band.y, c.band.on, c.band.mode);
                if (c.bandMute !== undefined && S.B) S.B.mix.gain.value = c.bandMute ? 0 : BAND_VOL;   // medir el duck de la banda sonora sola
                if (c.bandSolo && S.B) Object.keys(BAND_INST).forEach(function (k) { S.B.inst[k].gain.value = c.bandSolo === k ? BAND_INST[k].vol : 0; });
              }
              tick();
            }
          } finally { S = prev; }
        },
        end: function () {
          var B = me.B;
          return { log: me.log.slice(), bars: me.bars.slice(), band: B ? { bars: B.bars.slice(), hum: humStats(B.hum), sour: B.sour, cracks: B.cracks, late: B.late, dropped: B.dropped } : null,
                   pend: me.pendLog || [] };
        }
      };
    },
    _with: function (ctx, out, fn) {   // pruebas: tocar instrumentos sueltos (solo OfflineAudioContext; no toca el motor en vivo)
      if (!isOffline(ctx)) throw new Error('musicEngine._with: solo con OfflineAudioContext');
      var live = S;
      try {
        init(ctx, out, null, true, 'explore', 0);
        ['lead', 'lead2', 'solo', 'piano', 'brass', 'bass', 'coro', 'rhythm', 'stg'].forEach(function (k) { S.n.L[k].fade.gain.value = LAYERS[k].vol; });
        S.n.trim.gain.cancelScheduledValues(0); S.n.trim.gain.value = TRIM;
        fn({ gtr: gtr, pno: pno, horn: horn, bass: bass, coro: coro, strum: strum, sonero: sonero, M: M });
      } finally { S = live; }
    },
    _pieces: PIECES,
    _layers: LAYERS
  };
  A.musicEngine = engine;
})();
