/* ACHORADO - js/audio/himno.js  (v1.0: tema heroico criollo-andino de 18 s + bucle del mapa)
 * Dueño: compositor.  ACH.audio.himno = { start(), t(), toMap(fade), stop(fade), unlock() }  (+ playing(), _offline(), _dbg())
 * Todo sintetizado con Web Audio, sin samples, y original: melodías, armonías y ritmos escritos para este juego.
 *
 * Forma (vals 3/4, 120 bpm: negra 0,5 s, compás 1,5 s, 12 compases = 18 s):
 *   comp.  1-2   (0,0-3,0 s)   La menor. Viento, quena sola (pentatónica, soplo, vibrato retardado, portamento corto), trémolo de charango.
 *   comp.  3-6   (3,0-9,0 s)   La menor. Vals criollo: bordones de guitarra (corridas), rasgueo en 2 y 3, cajón; melodía de quena + 2.ª guitarra
 *                              en terceras; entran bajo y cuerdas. Armonía: Am | Dm | F-E7 | E7 (E7 = dominante de La, pivote hacia el mayor).
 *   comp.  7-11  (9,0-16,5 s)  LA MAYOR. Heroico: cuerdas, trompeta (melodía) y trombón, timbal, bajo, quena y guitarra a la octava.
 *                              A | F#m | D | Bm-E | E7.  Acento tutti en 12,0 s (1.er tiempo del comp. 9, con subida de ruido antes).
 *                              Comp. 11: se aligera (cuerdas suaves + arpegio de guitarra) para que se oiga el arrullo «grrú» a 15,6 s;
 *                              redoble de timbal 16,05-16,5 s.
 *   comp. 12     (16,5-18 s)   Cadencia V7 -> I con golpe tutti de A mayor, cajón y platillo en 16,5 s; la resonancia se apaga.
 *   Bucle del mapa: 8 compases (12 s) en La menor «Am Dm E7 Am | C G F E7» (cadencia andaluza al final; E7 -> Am cierra el bucle sin costura):
 *                   guitarra de bordones y picados suaves + charango (melodía y trémolos). Sin percusión.
 *
 * Mezcla: capas -> (seco + envío) -> reverb propia (convolución) -> compresor -> ganancia -> techo suave (-3,0 dBFS, nunca recorta) -> salida.
 * La salida va a ACH.audio.bus.music si existe junto con ACH.audio.ctx; si no, a un AudioContext propio.
 * La agenda de notas corre en el reloj del AudioContext; un temporizador (cada ~180 ms) solo reparte los compases por tramos (lookahead 2,2 s).
 */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var A = ACH.audio = ACH.audio || {};

  var BEAT = 0.5, BAR = 1.5;
  var LOOK = 2.2, TICK = 180, LEAD = 0.08;
  var CEIL = Math.pow(10, -3 / 20);                 // 0,7079 = -3,0 dBFS
  var TRIM = 0.75, MAPG = 1.4;                  // MAPG: ganancia común del bucle del mapa (más suave que el tema, pero parejo con él)

  // ---------------------------------------------------------------------------------------------------------
  // utilidades
  var PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function M(n) {
    var r = /^([A-G])([#b]?)(-?\d)$/.exec(n);
    return 12 * (+r[3] + 1) + PC[r[1]] + (r[2] === '#' ? 1 : r[2] === 'b' ? -1 : 0);
  }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function RNG(s) {
    var a = s | 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var SK = {};                                      // depuración: voces a omitir en las pruebas offline
  var hr = RNG(1);                                   // humanización (se resiembra en cada start)

  // filtro biquad en JS para muestras precalculadas
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
  function noiseArr(n, rnd) { var d = new Float32Array(n); for (var i = 0; i < n; i++) d[i] = rnd() * 2 - 1; return d; }
  function normArr(d, peak, sr) {
    var m = 0, i; for (i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
    if (m > 0) { var k = peak / m; for (i = 0; i < d.length; i++) d[i] *= k; }
    var fade = Math.min(d.length, Math.floor(sr * 0.012));
    for (i = 0; i < fade; i++) d[d.length - 1 - i] *= i / fade;
    return d;
  }

  // ---------------------------------------------------------------------------------------------------------
  // síntesis de muestras (JS puro). Cada buffer se arma una vez por AudioContext y se guarda en ctx._hb.
  var KSK = {                                        // Karplus-Strong: cuerdas pulsadas
    gtr:  { bright: 0.5,  t60: 1.2, dur: 1.35, pick: 0.17, nz: 0.3 },    // guitarra criolla de nailon
    bor:  { bright: 0.3,  t60: 1.6, dur: 1.7, pick: 0.13, nz: 0.18 },   // bordones (cuerdas graves)
    chr:  { bright: 0.92, t60: 0.4, dur: 0.42, pick: 0.09, nz: 0.6 },    // charango: golpe de trémolo
    chrL: { bright: 0.8,  t60: 1.0, dur: 1.05, pick: 0.12, nz: 0.45 },   // charango: nota suelta
    bass: { bright: 0.45, t60: 0.9, dur: 1.0, pick: 0.1, nz: 0.2 }     // bajo
  };
  function ksData(sr, kind, midi) {
    var o = KSK[kind], f = hz(midi), rnd = RNG(midi * 977 + kind.charCodeAt(0) * 131 + kind.length);
    var N = Math.max(2, Math.floor(sr / f - 0.5)), f0 = sr / (N + 0.5);
    var n = Math.ceil(o.dur * sr), y = new Float32Array(n), ex = new Float32Array(N), i, lp = 0, a = 0.08 + 0.9 * o.bright * o.bright;
    // excitación: cuerda tirada en triángulo (apex en la posición de la púa: el fundamental domina y los armónicos caen como 1/n²) + algo de ruido filtrado (roce de la uña)
    var ex2 = ex, mean = 0, pk = Math.min(0.5, Math.max(0.05, o.pick));
    for (i = 0; i < N; i++) {
      var u = (i + 0.5) / N;
      lp += a * ((rnd() * 2 - 1) - lp);
      ex[i] = (u < pk ? u / pk : (1 - u) / (1 - pk)) + o.nz * lp * 2;
      mean += ex[i];
    }
    mean /= N;
    var g = Math.pow(10, -3 / (o.t60 * f0));
    for (i = 0; i < n; i++) {
      var x = i < N ? ex2[i] - mean : 0;
      var fb = i > N ? 0.5 * (y[i - N] + y[i - N - 1]) : (i === N ? 0.5 * y[0] : 0);
      y[i] = x + g * fb;
    }
    biq(y, 'hp', 60, 0.7, sr);
    normArr(y, 0.9, sr);
    return { d: y, rate: f / f0 };
  }
  // parche: modos inarmónicos + golpe de ruido filtrado + caída de afinación
  function drumData(sr, seed, f, dur, modes, bend, nz) {
    var rnd = RNG(seed), n = Math.ceil(dur * sr), d = new Float32Array(n), ph = modes.map(function () { return rnd() * 0.2; }), i;
    for (i = 0; i < n; i++) {
      var t = i / sr, b = 1 + bend * Math.exp(-t / 0.012), y = 0;
      for (var k = 0; k < modes.length; k++) {
        var md = modes[k];
        ph[k] += 2 * Math.PI * f * md[0] * b / sr;
        y += md[1] * Math.exp(-t / md[2]) * Math.sin(ph[k]);
      }
      d[i] = y;
    }
    if (nz) {
      var nn = noiseArr(n, rnd); biq(nn, 'bp', nz[1], nz[2], sr); biq(nn, 'bp', nz[1], nz[2], sr);
      for (i = 0; i < n; i++) d[i] += nz[0] * 3 * nn[i] * Math.exp(-i / sr / nz[3]);
    }
    var att = Math.floor(sr * 0.0007);
    for (i = 0; i < att; i++) d[i] *= i / att;
    return normArr(d, 0.9, sr);
  }
  function cymbalData(sr) {                           // platillo: ruido brillante + parciales metálicos, doble caída
    var rnd = RNG(4242), dur = 3.2, n = Math.ceil(dur * sr), d = noiseArr(n, rnd), i, k;
    biq(d, 'hp', 3200, 0.7, sr); biq(d, 'lp', 12000, 0.7, sr);
    var fr = [3170, 4210, 4980, 5890, 6970, 8130, 9350], ph = fr.map(function () { return rnd() * 6; });
    for (i = 0; i < n; i++) {
      var t = i / sr, y = 0;
      for (k = 0; k < fr.length; k++) { ph[k] += 2 * Math.PI * fr[k] / sr; y += Math.sin(ph[k]) > 0 ? 0.5 : -0.5; }
      d[i] = (d[i] + y * 0.12) * (0.55 * Math.exp(-t / 0.16) + 0.45 * Math.exp(-t / 0.95));
    }
    var att = Math.floor(sr * 0.0012); for (i = 0; i < att; i++) d[i] *= i / att;
    return normArr(d, 0.9, sr);
  }
  function irData(sr) {                               // reverb de sala de piedra, oscura
    var n = Math.floor(sr * 2.3), L = new Float32Array(n), R = new Float32Array(n), rnd = RNG(99), ch, i;
    for (ch = 0; ch < 2; ch++) {
      var d = ch ? R : L, lp = 0, pd = Math.floor((0.014 + ch * 0.0023) * sr);
      for (i = pd; i < n; i++) {
        var t = (i - pd) / sr, k = 0.62 - 0.55 * Math.min(1, t / 1.8);
        lp += ((rnd() * 2 - 1) - lp) * k;
        d[i] = lp * Math.exp(-t * 3.3) * (t < 0.006 ? t / 0.006 : 1);
      }
      var er = [0.019, 0.031, 0.047, 0.067, 0.089], eg = [0.5, 0.4, 0.3, 0.22, 0.15];
      for (var e = 0; e < er.length; e++) { var at = Math.floor((er[e] + ch * 0.0041) * sr); if (at < n) d[at] += eg[e] * (ch ? -1 : 1); }
    }
    return [L, R];
  }

  // acceso a buffers del contexto (creados bajo demanda)
  function cache(G) { return G.ctx._hb || (G.ctx._hb = {}); }
  function ksb(G, kind, midi) {
    var C = cache(G), key = 'k' + kind + midi;
    if (C[key]) return C[key];
    var r = ksData(G.sr, kind, midi), ab = G.ctx.createBuffer(1, r.d.length, G.sr);
    ab.getChannelData(0).set(r.d);
    return (C[key] = { b: ab, rate: r.rate, dur: r.d.length / G.sr });
  }
  function mono(G, key, make) {
    var C = cache(G);
    if (C[key]) return C[key];
    var d = make(G.sr), ab = G.ctx.createBuffer(1, d.length, G.sr);
    ab.getChannelData(0).set(d);
    return (C[key] = ab);
  }
  function bufCjB(G) {
    return mono(G, 'cjB', function (sr) { return drumData(sr, 11, 78, 0.5, [[1, 1, 0.1], [1.9, 0.3, 0.05], [3.1, 0.12, 0.03]], 0.7, [0.5, 650, 0.8, 0.02]); });
  }
  function bufCjS(G) {
    return mono(G, 'cjS', function (sr) {
      var d = drumData(sr, 12, 190, 0.3, [[1, 0.35, 0.03], [2.3, 0.4, 0.02]], 0.04, [1.4, 3000, 0.6, 0.05]);
      var w = noiseArr(d.length, RNG(13)), i; biq(w, 'hp', 4200, 0.7, sr);
      for (i = 0; i < d.length; i++) d[i] += 0.55 * w[i] * Math.exp(-i / sr / 0.075);
      return normArr(d, 0.9, sr);
    });
  }
  function bufTimp(G) {
    return mono(G, 'timp', function (sr) {
      return drumData(sr, 21, 110, 1.6, [[1, 0.8, 0.55], [1.5, 1, 0.4], [1.99, 0.7, 0.3], [2.44, 0.5, 0.2], [2.9, 0.3, 0.12]], 0.04, [0.4, 900, 0.8, 0.015]);
    });
  }
  function bufTimpR(G) {
    return mono(G, 'timpR', function (sr) {
      return drumData(sr, 22, 110, 0.34, [[1, 0.8, 0.12], [1.5, 1, 0.09], [1.99, 0.7, 0.07], [2.44, 0.45, 0.05]], 0.03, [0.35, 1000, 0.8, 0.008]);
    });
  }
  function bufCym(G) { return mono(G, 'cym', cymbalData); }
  function bufNoise(G) { return mono(G, 'noise', function (sr) { return noiseArr(Math.floor(sr * 4), RNG(31337)); }); }
  function convBuf(G) {
    var C = cache(G);
    if (C.ir) return C.ir;
    var r = irData(G.sr), ab = G.ctx.createBuffer(2, r[0].length, G.sr);
    ab.getChannelData(0).set(r[0]); ab.getChannelData(1).set(r[1]);
    return (C.ir = ab);
  }

  // ---------------------------------------------------------------------------------------------------------
  // armonía
  var CH = {
    'Am':  { b: 'A2',  up: ['E3', 'A3', 'C4', 'E4'] },
    'Dm':  { b: 'D3',  up: ['A3', 'D4', 'F4', 'A4'] },
    'E7':  { b: 'E2',  up: ['E3', 'B3', 'D4', 'G#4'] },
    'E':   { b: 'E2',  up: ['E3', 'B3', 'E4', 'G#4'] },
    'F':   { b: 'F2',  up: ['A3', 'C4', 'F4', 'A4'] },
    'C':   { b: 'C3',  up: ['E3', 'G3', 'C4', 'E4'] },
    'G':   { b: 'G2',  up: ['B3', 'D4', 'G4', 'B4'] },
    'A':   { b: 'A2',  up: ['E3', 'A3', 'C#4', 'E4'] },
    'F#m': { b: 'F#2', up: ['A3', 'C#4', 'F#4', 'A4'] },
    'D':   { b: 'D3',  up: ['A3', 'D4', 'F#4', 'A4'] },
    'Bm':  { b: 'B2',  up: ['F#3', 'B3', 'D4', 'F#4'] }
  };
  Object.keys(CH).forEach(function (k) {
    var c = CH[k]; c.bm = M(c.b); c.um = c.up.map(M);
    var pad = [c.bm + 12].concat(c.um), out = [];
    pad.forEach(function (m) { if (out.indexOf(m) < 0) out.push(m); });
    c.pad = out;
  });
  // compás -> [[pulso, acorde], ...]
  var THC = [
    [[0, 'Am']], [[0, 'Am']], [[0, 'Am']], [[0, 'Dm']], [[0, 'F'], [2, 'E7']], [[0, 'E7']],
    [[0, 'A']], [[0, 'F#m']], [[0, 'D']], [[0, 'Bm'], [2, 'E']], [[0, 'E7']], [[0, 'A']]
  ];
  var THW = { 2: 'C3', 3: 'E2', 5: 'G#2' };                 // corridas de bordón a la corchea final del compás (índice 0)
  var MCH = ['Am', 'Dm', 'E7', 'Am', 'C', 'G', 'F', 'E7'];
  var MW = { 0: 'C3', 3: 'B2' };

  function segs(ch) {                                        // [[desde, hasta, acorde]]
    var o = [], k;
    for (k = 0; k < ch.length; k++) o.push([ch[k][0], k + 1 < ch.length ? ch[k + 1][0] : 3, ch[k][1]]);
    return o;
  }

  // melodías: [pulso, nota, duración en pulsos, opciones]. Pulsos globales (0 = inicio del tema; 3 por compás).
  var QUENA = [
    [0.4, 'E5', 1.8, { gl: 1.6, v: 0.8, vib: 12 }], [2.3, 'D5', 0.7, { gl: 0.3, v: 0.8 }],
    [3.0, 'C5', 1.0, { gl: 0.3, v: 0.85 }], [4.0, 'D5', 0.4, { gl: 0, v: 0.8 }], [4.4, 'C5', 0.5, { gl: 0, v: 0.75 }], [4.9, 'A4', 1.1, { gl: 0.5, v: 0.9, vib: 18 }],
    [6, 'E5', 1], [7, 'E5', 0.5], [7.5, 'D5', 0.5], [8, 'C5', 1],
    [9, 'D5', 1], [10, 'F5', 0.5], [10.5, 'E5', 0.5], [11, 'D5', 1],
    [12, 'C5', 1], [13, 'A4', 0.5], [13.5, 'C5', 0.5], [14, 'B4', 1],
    [15, 'G#4', 1], [16, 'B4', 0.5], [16.5, 'D5', 0.5], [17, 'B4', 0.5], [17.5, 'C#5', 0.5],
    [18, 'E5', 1.5], [19.5, 'F#5', 0.5], [20, 'A5', 1],
    [21, 'A5', 1.5], [22.5, 'G#5', 0.5], [23, 'F#5', 1],
    [24, 'D6', 1.5, { v: 1.1 }], [25.5, 'C#6', 0.5], [26, 'B5', 1],
    [27, 'A5', 1], [28, 'F#5', 0.5], [28.5, 'D5', 0.5], [29, 'E5', 2.0, { vib: 14 }],
    [33, 'A5', 4.5, { v: 1.05, vib: 20, att: 0.05, rel: 0.5 }]
  ];
  // mapa (pulsos 0..24 del bucle): nota, duración
  var MEL = [
    [0, 'A4', 0.5], [0.5, 'C5', 0.5], [1, 'E5', 1.0], [2, 'D5', 0.5], [2.5, 'C5', 0.5],
    [3, 'D5', 1.5], [4.5, 'E5', 0.5], [5, 'F5', 1.0],
    [6, 'E5', 1.0], [7, 'D5', 0.5], [7.5, 'B4', 0.5], [8, 'G#4', 1.0],
    [9, 'A4', 1.5], [10.5, 'B4', 0.5], [11, 'C5', 1.0],
    [12, 'E5', 1.5], [13.5, 'D5', 0.5], [14, 'C5', 1.0],
    [15, 'D5', 1.0], [16, 'B4', 0.5], [16.5, 'G4', 0.5], [17, 'B4', 1.0],
    [18, 'A4', 1.5], [19.5, 'C5', 0.5], [20, 'F5', 1.0],
    [21, 'E5', 1.0], [22, 'D5', 0.5], [22.5, 'B4', 0.5], [23, 'G#4', 0.5], [23.5, 'B4', 0.5]
  ];
  function inBar(list, i) { var a = i * 3 - 1e-6, b = i * 3 + 3 - 1e-6; return list.filter(function (n) { return n[0] >= a && n[0] < b; }); }

  // tercera diatónica por debajo (La menor; con sol sostenido sobre E7)
  function thirdBelow(m, harm) {
    var sc = harm ? [9, 11, 0, 2, 4, 5, 8] : [9, 11, 0, 2, 4, 5, 7], k = m, steps = 0;
    while (steps < 2) { k--; if (sc.indexOf(((k % 12) + 12) % 12) >= 0) steps++; }
    return k;
  }

  // ---------------------------------------------------------------------------------------------------------
  // capas de mezcla
  var LAYERS = {
    quena:    { vol: 0.25, pan: -0.1,  send: 0.55 },
    charango: { vol: 1.2, pan: 0.32,  send: 0.35, lp: 7500 },
    gtr:      { vol: 0.36, pan: 0.22,  send: 0.22, lp: 5200 },
    gtr2:     { vol: 0.5, pan: -0.28, send: 0.26, lp: 4800 },
    bor:      { vol: 0.60, pan: -0.04, send: 0.10, lp: 2400 },
    bass:     { vol: 0.85, pan: 0,     send: 0.04, lp: 650 },
    cajon:    { vol: 0.62, pan: 0.05,  send: 0.12 },
    strings:  { vol: 0.56, pan: 0,     send: 0.60 },
    brass:    { vol: 0.26, pan: 0.08,  send: 0.42 },
    timp:     { vol: 0.5, pan: -0.1,  send: 0.34 },
    cym:      { vol: 0.34, pan: 0.2,   send: 0.40, hp: 450 },
    fx:       { vol: 0.50, pan: 0,     send: 0.50 },
    dove:     { vol: 0.2, pan: 0.25,  send: 0.45 }
  };

  // ---------------------------------------------------------------------------------------------------------
  // grafo de audio
  function ceilCurve() {
    var n = 4096, c = new Float32Array(n), K = 0.52, W = CEIL - K;
    for (var i = 0; i < n; i++) {
      var x = i / (n - 1) * 2 - 1, s = 2 * x, ax = Math.abs(s), y = (ax <= K ? ax : K + W * Math.tanh((ax - K) / W)) / 2;
      c[i] = x < 0 ? -y : y;
    }
    return c;
  }
  function buildGraph(ctx, out) {
    var G = { ctx: ctx, sr: ctx.sampleRate, scenes: {}, ev: [], live: true, t0: 0, tM: 0, timer: 0, own: false, dead: false };
    G.pre = ctx.createGain();
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 30; hp.Q.value = 0.7;
    G.comp = ctx.createDynamicsCompressor();
    G.comp.threshold.value = -14; G.comp.knee.value = 12; G.comp.ratio.value = 3; G.comp.attack.value = 0.008; G.comp.release.value = 0.25;
    G.trim = ctx.createGain(); G.trim.gain.value = TRIM;
    G.shIn = ctx.createGain(); G.shIn.gain.value = 0.5; G.shOut = ctx.createGain(); G.shOut.gain.value = 2;   // el techo trabaja en un dominio ×2: tolera picos previos hasta +6 dBFS sin recorte duro
    G.sh = ctx.createWaveShaper(); G.sh.curve = ceilCurve(); try { G.sh.oversample = '2x'; } catch (e) { /* sin oversample */ }
    G.fade = ctx.createGain();
    G.dyn = ctx.createGain();
    G.pre.connect(G.dyn); G.dyn.connect(hp); hp.connect(G.comp); G.comp.connect(G.trim); G.trim.connect(G.shIn); G.shIn.connect(G.sh); G.sh.connect(G.shOut); G.shOut.connect(G.fade); G.fade.connect(out);
    G.out = out; G.hp = hp;
    G.conv = ctx.createConvolver(); G.conv.buffer = convBuf(G);
    G.rev = ctx.createGain(); G.rev.gain.value = 0.6;
    G.conv.connect(G.rev); G.rev.connect(G.pre);
    G.noise = bufNoise(G);
    return G;
  }
  function newScene(G, name, gain) {
    var c = G.ctx, sc = { name: name, nodes: [], L: {}, alive: true, next: 0 };
    sc.dry = c.createGain(); sc.wet = c.createGain();
    sc.dry.gain.value = gain; sc.wet.gain.value = gain;
    sc.dry.connect(G.pre); sc.wet.connect(G.conv);
    Object.keys(LAYERS).forEach(function (k) {
      var d = LAYERS[k], inp = c.createGain(), last = inp;
      inp.gain.value = G.solo && G.solo.indexOf(k) < 0 ? 0 : d.vol;
      if (d.hp) { var h = c.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = d.hp; h.Q.value = 0.7; last.connect(h); last = h; }
      if (d.lp) { var l = c.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = d.lp; l.Q.value = 0.6; last.connect(l); last = l; }
      if (c.createStereoPanner) { var p = c.createStereoPanner(); p.pan.value = d.pan; last.connect(p); last = p; }
      last.connect(sc.dry);
      if (d.send > 0) { var s = c.createGain(); s.gain.value = d.send; last.connect(s); s.connect(sc.wet); }
      sc.L[k] = inp;
    });
    G.scenes[name] = sc;
    return sc;
  }
  function trk(sc, node, end) { sc.nodes.push({ n: node, e: end }); }
  function prune(sc, now) { sc.nodes = sc.nodes.filter(function (r) { return r.e > now - 0.2; }); }
  function killScene(sc) {
    if (!sc || !sc.alive) return;
    sc.alive = false;
    sc.nodes.forEach(function (r) { try { r.n.stop(0); } catch (e) { /* ya parado */ } });
    sc.nodes = [];
    try { sc.dry.disconnect(); } catch (e1) { /* nada */ }
    try { sc.wet.disconnect(); } catch (e2) { /* nada */ }
  }
  function ev(G, name, t) { G.ev.push({ n: name, t: +(t - G.t0).toFixed(4) }); }
  function done(src, nodes) {                      // al terminar la fuente, suelta el cableado de la voz
    src.onended = function () { for (var i = 0; i < nodes.length; i++) { try { nodes[i].disconnect(); } catch (e) { /* nada */ } } };
  }

  // ---------------------------------------------------------------------------------------------------------
  // voces
  function pluck(G, sc, layer, kind, midi, t, v, cents, damp) {
    if (SK.pluck) return;
    var c = G.ctx, k = ksb(G, kind, midi), s = c.createBufferSource(), g = c.createGain();
    s.buffer = k.b; s.playbackRate.value = k.rate * (cents ? Math.pow(2, cents / 1200) : 1);
    g.gain.value = v; s.connect(g); g.connect(sc.L[layer]);
    if (damp) g.gain.setTargetAtTime(0, t + damp, 0.06);
    s.start(t); trk(sc, s, t + k.dur); done(s, [g]);
  }
  function strum(G, sc, layer, kind, t, midis, v, up, spread) {
    var n = midis.length, i;
    for (i = 0; i < n; i++) {
      var j = up ? n - 1 - i : i;
      pluck(G, sc, layer, kind, midis[j], t + i * spread, v * (up ? 0.9 : 1) * (1 - 0.06 * i), 0, 0);
    }
  }
  function sample(G, sc, layer, buf, t, v, rate, stopAfter) {
    if (SK.sample) return;
    var c = G.ctx, s = c.createBufferSource(), g = c.createGain(), r = rate || 1;
    s.buffer = buf; s.playbackRate.value = r; g.gain.value = v; s.connect(g); g.connect(sc.L[layer]);
    if (stopAfter) g.gain.setTargetAtTime(0, t + stopAfter, stopAfter * 0.35);
    s.start(t); trk(sc, s, t + buf.duration / r); done(s, [g]);
  }

  // charango: trémolo = golpes rápidos alternando cuerdas, con ligero desafinado entre órdenes
  function charTrem(G, sc, t, notes, dur, rate, v, shape) {
    var n = Math.max(1, Math.floor(dur * rate)), k;
    for (k = 0; k < n; k++) {
      var u = n > 1 ? k / (n - 1) : 0, f = shape === 'swell' ? 0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, u * 1.04)) : shape === 'fade' ? 1 - 0.6 * u : 1;
      pluck(G, sc, 'charango', 'chr', notes[k % notes.length], t + k / rate + (k ? (hr() - 0.5) * 0.012 : 0), v * f * (k ? 0.68 + 0.3 * hr() : 1), (hr() - 0.5) * 12, 0);
    }
  }
  function charNote(G, sc, t, midi, durBeats, v) {   // nota de melodía: golpe doble (órdenes) + trémolo si es larga
    var dur = durBeats * BEAT;
    pluck(G, sc, 'charango', 'chrL', midi, t, v, -5, 0);
    pluck(G, sc, 'charango', 'chrL', midi, t + 0.006, v * 0.7, 6, 0);
    if (dur >= 0.9) {
      var n = Math.floor((dur - 0.16) * 10), k;
      for (k = 1; k <= n; k++) pluck(G, sc, 'charango', 'chr', midi, t + 0.14 + k * 0.1 + (hr() - 0.5) * 0.01, v * (0.5 - 0.15 * k / n), (hr() - 0.5) * 10, 0);
    }
  }

  // quena: seno con dos armónicos suaves + soplo (ruido de banda) con golpe al inicio, vibrato que entra tarde, portamento corto desde abajo
  function quena(G, sc, t, midi, dur, o) {
    if (SK.quena) return;
    o = o || {};
    var c = G.ctx, f = hz(midi), v = o.v == null ? 1 : o.v, att = o.att || 0.07, rel = o.rel || 0.13;
    var end = t + Math.max(dur, att + 0.05), tail = end + rel * 2.5, gl = o.gl == null ? 1.0 : o.gl;
    var g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(), osc, all = [g, lg];
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.56 * v, t + att);
    g.gain.setTargetAtTime(0.42 * v, t + att, 0.15); g.gain.setTargetAtTime(0, end, rel / 3);
    g.connect(sc.L.quena);
    lfo.frequency.value = 5.0 + hr() * 0.8; lfo.connect(lg);
    var vd = o.vib == null ? 16 : o.vib, d1 = Math.min(0.3, (end - t) * 0.4), d2 = Math.min(0.8, (end - t) * 0.85);
    lg.gain.setValueAtTime(0, t); lg.gain.setValueAtTime(0, t + d1); lg.gain.linearRampToValueAtTime(vd, t + d2);
    lfo.start(t); lfo.stop(tail); trk(sc, lfo, tail);
    osc = c.createOscillator();                                   // un solo oscilador con onda periódica (fundamental + 2.º y 3.º armónico suaves)
    osc.setPeriodicWave(G.qwave || (G.qwave = c.createPeriodicWave(new Float32Array([0, 0, 0, 0]), new Float32Array([0, 1, 0.16, 0.05]))));
    osc.frequency.setValueAtTime(f * Math.pow(2, -gl / 12), t);
    osc.frequency.exponentialRampToValueAtTime(f, t + 0.075);
    osc.connect(g); lg.connect(osc.detune);
    osc.start(t); osc.stop(tail); trk(sc, osc, tail);
    done(osc, all);
    var ns = c.createBufferSource(), bp = c.createBiquadFilter(), ng = c.createGain();
    ns.buffer = G.noise; ns.loop = true;
    bp.type = 'bandpass'; bp.frequency.value = Math.min(f * 2.3, 9000); bp.Q.value = 1.3;
    ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(0.34 * v, t + 0.02);
    ng.gain.setTargetAtTime(0.075 * v, t + 0.03, 0.07); ng.gain.setTargetAtTime(0, end, rel / 3);
    ns.connect(bp); bp.connect(ng); ng.connect(g);
    ns.start(t, hr() * 3); ns.stop(tail); trk(sc, ns, tail); all.push(bp, ng);
  }

  // pad de cuerdas: dientes de sierra desafinados (coro) por nota, paso bajo que se abre, vibrato lento
  function pad(G, sc, t, notes, dur, v, att, rel) {
    if (SK.pad) return;
    var c = G.ctx, end = Math.max(t + dur, t + att), tail = end + rel * 2.5, g = c.createGain(), lp = c.createBiquadFilter(), pv = v * 0.55 / notes.length, all = [g, lp], first = true;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pv, t + att); g.gain.setValueAtTime(pv, end); g.gain.setTargetAtTime(0, end, rel / 3);
    lp.type = 'lowpass'; lp.Q.value = 0.5; lp.frequency.setValueAtTime(900, t); lp.frequency.linearRampToValueAtTime(2100, t + att + 0.2);
    g.connect(lp); lp.connect(sc.L.strings);
    notes.forEach(function (m) {
      [-7, 7].forEach(function (cents) {
        var o = c.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = cents;
        o.connect(g); o.start(t); o.stop(tail); trk(sc, o, tail);
        if (first) { done(o, all); first = false; }
      });
    });
  }

  // metales (acorde de una o más notas con una sola cadena de ganancia y filtro): trompeta (brillante, el filtro se abre en el ataque) y trombón (más oscuro y blando).
  // vib: vibrato retardado (solo en notas largas, porque el detune modulado cuesta CPU)
  function brass(G, sc, t, notes, dur, v, kind, vib) {
    if (SK.brass) return;
    var c = G.ctx, tpt = kind !== 'tbn', att = tpt ? 0.045 : 0.09, rel = tpt ? 0.07 : 0.12;
    var end = t + Math.max(dur, att + 0.04), tail = end + rel * 3, pv = v * 0.5;
    var g = c.createGain(), lp = c.createBiquadFilter(), pk = c.createBiquadFilter(), all = [g, lp, pk], lfo = null, lg = null, first = true;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pv, t + att); g.gain.setTargetAtTime(pv * 0.82, t + att, 0.12); g.gain.setTargetAtTime(0, end, rel / 3);
    lp.type = 'lowpass'; lp.Q.value = tpt ? 1.2 : 0.8;
    var top = (tpt ? 3600 : 1500) * (0.55 + 0.45 * Math.min(1.2, v / 0.6)), rest = tpt ? 2300 : 1050;
    lp.frequency.setValueAtTime(tpt ? 650 : 420, t); lp.frequency.linearRampToValueAtTime(top, t + att + 0.05); lp.frequency.setTargetAtTime(rest, t + att + 0.06, 0.18);
    pk.type = 'peaking'; pk.frequency.value = tpt ? 1250 : 520; pk.Q.value = 1.1; pk.gain.value = tpt ? 4 : 3;
    g.connect(lp); lp.connect(pk); pk.connect(sc.L.brass);
    if (vib) {
      lfo = c.createOscillator(); lg = c.createGain(); all.push(lg);
      lfo.frequency.value = 5.3 + hr() * 0.5; lfo.connect(lg);
      lg.gain.setValueAtTime(0, t); lg.gain.setValueAtTime(0, t + 0.35); lg.gain.linearRampToValueAtTime(tpt ? 9 : 6, t + 0.8);
      lfo.start(t); lfo.stop(tail); trk(sc, lfo, tail);
    }
    notes.forEach(function (m) {
      [-5, 5].forEach(function (cents) {
        var o = c.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = cents;
        if (lg) lg.connect(o.detune);
        o.connect(g); o.start(t); o.stop(tail); trk(sc, o, tail);
        if (first) { done(o, all); first = false; }
      });
    });
    if (!tpt) {                                    // trombón: sub una octava abajo de la nota más grave, redondea
      var lo = Math.min.apply(null, notes), s = c.createOscillator(), sg = c.createGain(); s.type = 'triangle'; s.frequency.value = hz(lo) / 2; sg.gain.value = 0.5;
      s.connect(sg); sg.connect(g); s.start(t); s.stop(tail); trk(sc, s, tail); all.push(sg);
    }
  }

  function timp(G, sc, t, f, v) { sample(G, sc, 'timp', bufTimp(G), t, v, f / 110); }
  function timpRoll(G, sc, t, dur, f, v0, v1) {
    var step = 0.074, n = Math.max(1, Math.floor(dur / step)), k, b = bufTimpR(G);
    for (k = 0; k < n; k++) {
      var u = n > 1 ? k / (n - 1) : 0;
      sample(G, sc, 'timp', b, t + k * step + (k ? (hr() - 0.5) * 0.008 : 0), (v0 + (v1 - v0) * u) * (k % 2 ? 0.8 : 1), f / 110);
    }
  }
  function cymbal(G, sc, t, v, damp) { sample(G, sc, 'cym', bufCym(G), t, v, 1, damp || 0); }
  function cajon(G, sc, t, kind, v) {
    if (kind === 'b') sample(G, sc, 'cajon', bufCjB(G), t, v, 1);
    else sample(G, sc, 'cajon', bufCjS(G), t, v, kind === 'g' ? 1.12 : 0.97 + hr() * 0.06);
  }
  // viento: ruido en banda que se desplaza, con ráfagas lentas
  function wind(G, sc, t, dur, peak) {
    if (SK.wind) return;
    var c = G.ctx, ns = c.createBufferSource(), bp = c.createBiquadFilter(), bp2 = c.createBiquadFilter(), g = c.createGain(), g2 = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(), end = t + dur;
    ns.buffer = G.noise; ns.loop = true;
    bp.type = 'bandpass'; bp.Q.value = 0.9; bp.frequency.setValueAtTime(420, t); bp.frequency.linearRampToValueAtTime(850, t + dur * 0.4); bp.frequency.linearRampToValueAtTime(520, end);
    bp2.type = 'bandpass'; bp2.Q.value = 2.2; bp2.frequency.setValueAtTime(1500, t); bp2.frequency.linearRampToValueAtTime(2300, t + dur * 0.5); bp2.frequency.linearRampToValueAtTime(1300, end);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 1.3); g.gain.linearRampToValueAtTime(peak * 0.9, t + 2.7); g.gain.linearRampToValueAtTime(peak * 0.28, t + 4.8); g.gain.linearRampToValueAtTime(0, end);
    g2.gain.value = 0.22;
    lfo.frequency.value = 0.37; lg.gain.value = peak * 0.3; lfo.connect(lg); lg.connect(g.gain);
    ns.connect(bp); bp.connect(g); ns.connect(bp2); bp2.connect(g2); g2.connect(g); g.connect(sc.L.fx);
    ns.start(t, hr() * 3); ns.stop(end + 0.1); lfo.start(t); lfo.stop(end + 0.1);
    trk(sc, ns, end + 0.1); trk(sc, lfo, end + 0.1); done(ns, [g, g2, bp, bp2, lg]);
  }
  // subida de ruido (anticipo del acento y de la cadencia)
  function riser(G, sc, t, dur, peak) {
    var c = G.ctx, ns = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(), end = t + dur;
    ns.buffer = G.noise; ns.loop = true;
    bp.type = 'bandpass'; bp.Q.value = 1.6; bp.frequency.setValueAtTime(700, t); bp.frequency.exponentialRampToValueAtTime(7500, end);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, end - 0.02); g.gain.linearRampToValueAtTime(0, end + 0.015);
    ns.connect(bp); bp.connect(g); g.connect(sc.L.fx);
    ns.start(t, hr() * 3); ns.stop(end + 0.05); trk(sc, ns, end + 0.05); done(ns, [bp, g]);
  }
  // arrullo de paloma «grrú»: «grr» = tono grave con modulación de amplitud rápida; «rú» = glissando redondo ascendente-descendente
  function dove(G, sc, t, v) {
    var c = G.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), am = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    var lp = c.createBiquadFilter(), bp = c.createBiquadFilter(), mix = c.createGain(), tail = t + 0.7;
    o.type = 'triangle'; o2.type = 'sine';
    [o, o2].forEach(function (x, i) {
      var m = i ? 2 : 1;
      x.frequency.setValueAtTime(300 * m, t); x.frequency.linearRampToValueAtTime(335 * m, t + 0.17);
      x.frequency.linearRampToValueAtTime(560 * m, t + 0.29); x.frequency.exponentialRampToValueAtTime(430 * m, t + 0.5);
    });
    am.gain.value = 0.55; lfo.type = 'sine'; lfo.frequency.value = 27;
    lg.gain.setValueAtTime(0.45, t); lg.gain.setValueAtTime(0.45, t + 0.17); lg.gain.linearRampToValueAtTime(0, t + 0.27);
    lfo.connect(lg); lg.connect(am.gain);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.7 * v, t + 0.04); g.gain.linearRampToValueAtTime(0.55 * v, t + 0.17);
    g.gain.linearRampToValueAtTime(1.0 * v, t + 0.3); g.gain.setTargetAtTime(0, t + 0.38, 0.05);
    lp.type = 'lowpass'; lp.frequency.value = 1500; lp.Q.value = 0.6; bp.type = 'peaking'; bp.frequency.value = 520; bp.Q.value = 1.4; bp.gain.value = 5;
    mix.gain.value = 0.35;
    o.connect(am); o2.connect(mix); mix.connect(am); am.connect(g); g.connect(lp); lp.connect(bp); bp.connect(sc.L.dove);
    o.start(t); o2.start(t); lfo.start(t); o.stop(tail); o2.stop(tail); lfo.stop(tail);
    trk(sc, o, tail); trk(sc, o2, tail); trk(sc, lfo, tail); done(o, [g, am, lg, lp, bp, mix]);
  }

  // ---------------------------------------------------------------------------------------------------------
  // el tema: un compás por llamada (i = 0..11, t = tiempo absoluto del inicio del compás)
  function themeBar(G, sc, i, t) {
    var bar = i + 1, ch = THC[i], sg = segs(ch), b0 = i * 3, c0 = CH[ch[0][1]];
    function chAt(beat) { var s = ch[0][1]; for (var q = 0; q < ch.length; q++) if (beat >= ch[q][0]) s = ch[q][1]; return CH[s]; }
    function T(beat) { return t + beat * BEAT; }
    function lowBass(m) { return m - 12 < M('E1') ? m : m - 12; }

    // ---- T1: viento, quena sola, trémolo de charango, colchón grave de cuerdas
    if (bar === 1) {
      wind(G, sc, t, 8.0, 1.0);
      charTrem(G, sc, t + 0.05, [M('A4'), M('C5'), M('E5'), M('C5')], 2.95, 11, 0.5, 'swell');
      pad(G, sc, t + 0.3, [M('A2'), M('E3'), M('A3')], 2.9, 0.34, 1.5, 0.9);
    }
    if (bar === 2) cajon(G, sc, T(2), 'b', 0.3);                                  // la llamada al vals

    // ---- melodías
    inBar(QUENA, i).forEach(function (n) {
      var o = n[3] || {}, nt = M(n[1]), tt = t + (n[0] - b0) * BEAT, dd = n[2] * BEAT * (bar >= 7 && bar <= 10 ? 0.96 : 1);
      var op = { v: o.v == null ? 1 : o.v, gl: o.gl, vib: o.vib, att: o.att, rel: o.rel };
      if (bar >= 3 && bar <= 6) op.v *= 0.9;
      if (bar >= 7 && bar <= 10) op.v *= 0.85;
      quena(G, sc, tt, nt, dd, op);
      if (bar >= 3 && bar <= 6) {                                                      // 2.ª guitarra: terceras por debajo
        pluck(G, sc, 'gtr2', 'gtr', thirdBelow(nt, n[0] >= 14.5 && n[0] < 18), tt, 0.8, 0, dd + 0.12);
      } else if (bar >= 7 && bar <= 10) {                                              // unísono: guitarra y trompeta una octava abajo
        pluck(G, sc, 'gtr2', 'gtr', nt - 12, tt, 0.95, 0, dd + 0.15);
        brass(G, sc, tt, [nt - 12], dd, 0.5 * (o.v || 1), 'tpt', dd > 0.9);
      }
    });

    // ---- guitarra criolla: bordones, rasgueo en 2 y 3, corridas
    if (bar >= 3 && bar <= 10) {
      var heroic = bar >= 7, vb = heroic ? 1.0 : (bar < 5 ? 0.8 : 0.9), vs = heroic ? 0.85 : (bar < 5 ? 0.55 : 0.65), tutti = bar === 9;
      pluck(G, sc, 'bor', 'bor', c0.bm, t, vb, 0, 0.9);
      if (heroic) strum(G, sc, 'gtr', 'gtr', t + 0.002, c0.um, tutti ? 1.0 : 0.6, false, tutti ? 0.02 : 0.012);
      strum(G, sc, 'gtr', 'gtr', T(1), chAt(1).um, vs, false, 0.014);
      strum(G, sc, 'gtr', 'gtr', T(2), chAt(2).um, vs * 0.95, false, 0.014);
      strum(G, sc, 'gtr', 'gtr', T(2.5), chAt(2).um.slice(1), vs * 0.38, true, 0.01);
      if (THW[i]) pluck(G, sc, 'bor', 'bor', M(THW[i]), T(2.5), 0.7, 0, 0.3);
      if (ch.length > 1) pluck(G, sc, 'bor', 'bor', chAt(2).bm, T(2), 0.75, 0, 0.7);
    }

    // ---- cajón peruano
    if (bar >= 3 && bar <= 10) {
      var cv = bar < 5 ? 0.55 : bar < 7 ? 0.75 : 1.0;
      cajon(G, sc, t, 'b', cv * (bar === 9 ? 1.1 : 1));
      cajon(G, sc, T(1), 's', cv * 0.62);
      cajon(G, sc, T(2), 's', cv * 0.68);
      cajon(G, sc, T(1.5) + (hr() - 0.5) * 0.008, 'g', cv * 0.22);
      if (bar >= 7) cajon(G, sc, T(2.5), 'g', cv * 0.2);
    }

    // ---- charango en el vals y en el heroico
    if (bar >= 3 && bar <= 10) {
      sg.forEach(function (s) {
        var cc = CH[s[2]], from = Math.max(s[0], 1);
        if (bar < 7) {
          if (s[1] - from < 0.5) return;
          charTrem(G, sc, T(from), [cc.um[3], cc.um[2] + 12, cc.um[3]], (s[1] - from) * BEAT - 0.04, 10, 0.5, 'fade');
        } else {
          charTrem(G, sc, T(s[0]) + 0.01, [cc.um[2] + 12, cc.um[3] + 12, cc.um[1] + 12, cc.um[3] + 12], (s[1] - s[0]) * BEAT - 0.04, 11, 0.32, 'flat');
        }
      });
    }

    // ---- bajo (desde el compás 5) y cuerdas
    if (bar >= 5 && bar <= 10) {
      sg.forEach(function (s) {
        var cc = CH[s[2]], tt = T(s[0]), lb = lowBass(cc.bm);
        pluck(G, sc, 'bass', 'bass', lb, tt, bar >= 7 ? 1.0 : 0.7, 0, 0.9);
        if (s[1] - s[0] >= 2 && bar >= 7) pluck(G, sc, 'bass', 'bass', lb + 7, T(s[0] + 2), 0.6, 0, 0.4);
      });
    }
    if (bar >= 4 && bar <= 10) {
      sg.forEach(function (s) {
        var v = bar < 7 ? 0.28 + 0.07 * (bar - 4) : bar === 7 ? 0.7 : bar === 9 ? 1.0 : 0.8;
        pad(G, sc, T(s[0]), CH[s[2]].pad, (s[1] - s[0]) * BEAT + 0.25, v, bar < 7 ? 0.6 : (bar === 9 && s[0] === 0 ? 0.03 : 0.25), 0.4);
      });
    }

    // ---- metales de acompañamiento (trombón sostenido + golpes en 2 y 3)
    if (bar >= 7 && bar <= 10) {
      sg.forEach(function (s) {
        var cc = CH[s[2]], big = bar === 9 && s[0] === 0;
        brass(G, sc, T(s[0]), [cc.bm, cc.bm + 12], (s[1] - s[0]) * BEAT - 0.03, big ? 0.85 : 0.5, 'tbn', (s[1] - s[0]) > 1.5);
      });
      [1, 2].forEach(function (bt) {
        var cc = chAt(bt);
        brass(G, sc, T(bt), [cc.um[1], cc.um[2], cc.um[3]], 0.27, bar === 9 ? 0.34 : 0.28, 'tpt', false);
      });
    }

    // ---- timbal
    if (bar === 7) { timp(G, sc, t, 110, 0.75); timp(G, sc, T(2), 110, 0.45); }
    if (bar === 8) { timp(G, sc, t, 92.5, 0.7); timpRoll(G, sc, T(1.2), 1.7, 92.5, 0.18, 0.8); }
    if (bar === 9) { timp(G, sc, t, 146.8, 1.0); timpRoll(G, sc, t + 0.28, 1.2, 146.8, 0.5, 0.45); timp(G, sc, T(2.6), 146.8, 0.5); }
    if (bar === 10) { timp(G, sc, t, 123.5, 0.55); timpRoll(G, sc, T(0.3), 1.2, 123.5, 0.42, 0.5); timp(G, sc, T(2), 82.4, 0.75); }

    // ---- compás 8: subida de ruido hacia el acento de 12,0 s; compás 9: acento «MIRAFLORES»
    if (bar === 8) riser(G, sc, T(1.2), 0.9, 0.9);
    if (bar === 9) { cymbal(G, sc, t, 0.8, 0.7); ev(G, 'acento', t); }

    // ---- compás 11: se aligera; arrullo de paloma y redoble final
    if (bar === 11) {
      pad(G, sc, t, [M('E3'), M('B3'), M('D4'), M('G#4')], 1.0, 0.38, 0.35, 0.55);
      [['E3', 0], ['B3', 0.16], ['E4', 0.32], ['G#4', 0.48], ['B4', 0.64]].forEach(function (a) { pluck(G, sc, 'gtr2', 'gtr', M(a[0]), t + 0.05 + a[1], 0.3, 0, 0.5); });
      pluck(G, sc, 'bor', 'bor', M('E2'), t + 0.02, 0.45, 0, 0.9);
      dove(G, sc, t + 0.6, 1.0); ev(G, 'grru', t + 0.6);
      pad(G, sc, t + 0.95, [M('E3'), M('B3'), M('E4'), M('G#4')], 0.62, 0.55, 0.5, 0.2);
      timpRoll(G, sc, t + 1.05, 0.43, 82.4, 0.12, 0.62);
      riser(G, sc, t + 1.1, 0.4, 0.34);
      charTrem(G, sc, t + 1.1, [M('G#5'), M('B5'), M('E5')], 0.38, 12, 0.16, 'flat');
    }

    // ---- compás 12: cadencia final y golpe tutti (16,5 s)
    if (bar === 12) {
      ev(G, 'golpe', t);
      cymbal(G, sc, t, 1.0, 0);
      timp(G, sc, t, 110, 1.0); timp(G, sc, t, 55, 0.8);
      cajon(G, sc, t, 'b', 1.15); cajon(G, sc, t + 0.003, 's', 0.7);
      strum(G, sc, 'gtr', 'gtr', t, [M('A3'), M('E4'), M('A4'), M('C#5'), M('E5')], 1.0, false, 0.03);
      strum(G, sc, 'gtr', 'gtr', t, CH.A.um, 0.8, false, 0.026);
      pluck(G, sc, 'bor', 'bor', M('A2'), t, 1.0, 0, 0);
      pluck(G, sc, 'bass', 'bass', M('A1'), t, 1.0, 0, 0);
      pad(G, sc, t, [M('A2'), M('E3'), M('A3'), M('C#4'), M('E4'), M('A4')], 1.5, 1.0, 0.04, 1.3);
      brass(G, sc, t, [M('A4'), M('C#5')], 1.4, 0.7, 'tpt', true);
      brass(G, sc, t, [M('A2'), M('E3')], 1.4, 0.8, 'tbn', true);
      pluck(G, sc, 'gtr2', 'gtr', M('A4'), t, 0.9, 0, 1.2);
      charTrem(G, sc, t, [M('E5'), M('A5'), M('C#6'), M('A5')], 1.4, 12, 0.36, 'fade');
    }
  }

  // ---------------------------------------------------------------------------------------------------------
  // bucle del mapa: un compás por llamada (k = 0..7)
  function mapBar(G, sc, k, t) {
    var cc = CH[MCH[k]];
    function T(beat) { return t + beat * BEAT; }
    pluck(G, sc, 'bor', 'bor', cc.bm, t, 0.62, 0, 1.0);
    if (MW[k]) pluck(G, sc, 'bor', 'bor', M(MW[k]), T(2.5), 0.45, 0, 0.3);
    if (k === 7) {                                                    // arpegio rodado antes de cerrar el bucle
      [cc.um[0], cc.um[1], cc.um[2], cc.um[3], cc.um[2]].forEach(function (m, q) { pluck(G, sc, 'gtr', 'gtr', m, T(1 + q * 0.4), 0.3 - 0.01 * q, 0, 0.5); });
    } else {
      strum(G, sc, 'gtr', 'gtr', T(1), [cc.um[1], cc.um[2], cc.um[3]], 0.30, false, 0.011);
      strum(G, sc, 'gtr', 'gtr', T(2), [cc.um[0], cc.um[2], cc.um[3]], 0.28, false, 0.011);
    }
    inBar(MEL, k).forEach(function (n) { charNote(G, sc, t + (n[0] - k * 3) * BEAT, M(n[1]), n[2], 0.62); });
  }

  // ---------------------------------------------------------------------------------------------------------
  // agenda por tramos
  function pump(G, upTo) {
    var sc, bt;
    if ((sc = G.scenes.T) && sc.alive) {
      while (sc.next < 12) {
        bt = G.t0 + sc.next * BAR;
        if (bt >= upTo) break;
        if (!G.live || bt + BAR > G.ctx.currentTime) themeBar(G, sc, sc.next, bt);
        sc.next++;
      }
    }
    if ((sc = G.scenes.M) && sc.alive) {
      for (;;) {
        bt = G.tM + sc.next * BAR;
        if (bt >= upTo) break;
        if (!G.live || bt + 0.05 > G.ctx.currentTime) mapBar(G, sc, sc.next % 8, bt);
        sc.next++;
      }
    }
  }
  function tick(g) {
    try {
      if (g.dead) return;
      var now = g.ctx.currentTime;
      pump(g, now + LOOK);
      Object.keys(g.scenes).forEach(function (k) { prune(g.scenes[k], now); });
    } catch (e) { if (A.log) console.warn('[himno]', e); }
  }

  // arco dinámico del tema (ganancia común antes del compresor): intro baja, vals medio, heroico más fuerte, aligerado en 11, final fuerte
  var DYN = [[0, 0.75], [3.0, 0.85], [8.9, 0.95], [9.1, 1.25], [14.9, 1.25], [15.1, 1.0], [16.4, 1.1], [16.5, 1.2]];
  function dynTheme(g) {
    var p = g.dyn.gain, t0 = g.t0;
    p.setValueAtTime(DYN[0][1], t0 + DYN[0][0]);
    for (var i = 1; i < DYN.length; i++) p.linearRampToValueAtTime(DYN[i][1], t0 + DYN[i][0]);
  }

  // paso al bucle del mapa en el instante `at` (tiempo del contexto)
  function toMapAt(g, at, fade) {
    var th = g.scenes.T, n = 48, ci = new Float32Array(n), co = new Float32Array(n), i;
    try { g.dyn.gain.cancelScheduledValues(at); g.dyn.gain.setTargetAtTime(MAPG, at, fade / 3); } catch (e) { g.dyn.gain.value = MAPG; }
    for (i = 0; i < n; i++) { var u = i / (n - 1); ci[i] = Math.sin(u * Math.PI / 2); co[i] = Math.cos(u * Math.PI / 2); }
    var sc = newScene(g, 'M', 0);
    g.tM = at; sc.next = 0;
    sc.dry.gain.setValueAtTime(0, at); sc.dry.gain.setValueCurveAtTime(ci, at, fade);
    sc.wet.gain.setValueAtTime(0, at); sc.wet.gain.setValueCurveAtTime(ci, at, fade);
    if (th && th.alive) {
      th.dry.gain.setValueAtTime(1, at); th.dry.gain.setValueCurveAtTime(co, at, fade);
      th.wet.gain.setValueAtTime(1, at); th.wet.gain.setValueCurveAtTime(co, at, fade);
      th.next = 99;                                       // no más compases del tema
    }
    ev(g, 'toMap', at);
    return sc;
  }

  // ---------------------------------------------------------------------------------------------------------
  // estado y API
  var G = null, own = null, ownHook = false;

  function getTarget() {
    if (A.ctx && A.bus && A.bus.music) return { ctx: A.ctx, out: A.bus.music, own: false };
    if (!own) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      own = new C();
      if (!ownHook) {
        ownHook = true;
        document.addEventListener('visibilitychange', function () {
          try {
            if (!own || !G || G.ctx !== own) return;
            if (document.hidden) { if (own.state === 'running') own.suspend(); } else if (own.state === 'suspended') own.resume();
          } catch (e) { /* nada */ }
        });
      }
    }
    return { ctx: own, out: own.destination, own: true };
  }
  function resume(ctx) { try { if (ctx.state !== 'running' && ctx.resume) { var p = ctx.resume(); if (p && p.then) p.then(null, function () {}); } } catch (e) { /* nada */ } }

  function destroy(g) {
    if (!g || g.dead) return;
    g.dead = true;
    if (g.timer) { clearInterval(g.timer); g.timer = 0; }
    Object.keys(g.scenes).forEach(function (k) { killScene(g.scenes[k]); });
    try { g.fade.disconnect(); } catch (e1) { /* nada */ }
    try { g.pre.disconnect(); } catch (e2) { /* nada */ }
    try { g.conv.disconnect(); } catch (e3) { /* nada */ }
    try { g.rev.disconnect(); } catch (e4) { /* nada */ }
    if (G === g) G = null;
  }
  function ensure() {                                   // grafo vivo (lo crea si falta); null si no hay Web Audio
    if (G && !G.dead) return G;
    var tg = getTarget(); if (!tg) return null;
    resume(tg.ctx);
    var g = buildGraph(tg.ctx, tg.out); g.own = tg.own;
    g.t0 = tg.ctx.currentTime + LEAD;
    G = g;
    return g;
  }
  function startTimer(g) { g.timer = setInterval(function () { tick(g); }, TICK); }

  var H = A.himno = {
    start: function () {
      try {
        if (G) destroy(G);
        hr = RNG(20241118);
        var g = ensure(); if (!g) return false;
        newScene(g, 'T', 1);
        dynTheme(g);
        pump(g, g.ctx.currentTime + LOOK);
        startTimer(g);
        return true;
      } catch (e) { if (A.log) console.warn('[himno] start', e); return false; }
    },
    t: function () {                                    // segundos desde start() (ctx.currentTime - inicio); -1 si no está sonando
      try {
        if (!G || G.dead) return -1;
        return Math.max(0, G.ctx.currentTime - G.t0);
      } catch (e) { return -1; }
    },
    playing: function () { try { return !!G && !G.dead && G.ctx.state === 'running'; } catch (e) { return false; } },
    toMap: function (fade) {
      try {
        fade = fade == null ? 1 : Math.max(0.02, +fade || 1);
        var g = G && !G.dead ? G : null;
        if (!g) { hr = RNG(20241119); g = ensure(); if (!g) return false; g.t0 = g.ctx.currentTime; }
        if (g.scenes.M && g.scenes.M.alive) return true;
        var now = g.ctx.currentTime + 0.03, th = g.scenes.T;
        toMapAt(g, now, fade);
        if (!g.timer) startTimer(g);
        pump(g, now + LOOK);
        if (th) setTimeout(function () { try { killScene(th); } catch (e) { /* nada */ } }, (fade + 0.4) * 1000);
        return true;
      } catch (e) { if (A.log) console.warn('[himno] toMap', e); return false; }
    },
    stop: function (fade) {
      try {
        var g = G; if (!g || g.dead) return;
        fade = fade == null ? 0.6 : Math.max(0.01, +fade || 0.6);
        var now = g.ctx.currentTime, p = g.fade.gain;
        try { p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.linearRampToValueAtTime(0, now + fade); } catch (e1) { p.value = 0; }
        if (g.timer) { clearInterval(g.timer); g.timer = 0; }
        G = null;                                       // t() = -1 desde ya; el grafo viejo se desmonta al acabar el fundido
        setTimeout(function () {
          destroy(g);
          try { if (g.own && !G && own && own.state === 'running') own.suspend(); } catch (e2) { /* nada */ }
        }, fade * 1000 + 80);
      } catch (e) { /* nunca lanza */ }
    },
    unlock: function () {
      try { var tg = getTarget(); if (tg) resume(tg.ctx); } catch (e) { /* nada */ }
    }
  };

  // pruebas: o = {mapAt: segundos | undefined, fade, dur}.  Programa todo de golpe sobre un OfflineAudioContext.
  H._offline = function (ctx, o) {
    o = o || {};
    hr = RNG(20241118);
    var g = buildGraph(ctx, ctx.destination); g.live = false; g.t0 = 0;
    SK = o.skip || {}; if (o.solo) g.solo = o.solo;                                       // depuración: solo estas capas
    if (o.noCeil) { g.trim.disconnect(); g.trim.connect(g.fade); }      // depuración: sin techo (mide el pico previo)
    newScene(g, 'T', 1);
    if (!o.noDyn) dynTheme(g);
    if (o.mapAt != null) {
      pump(g, o.mapAt);
      toMapAt(g, o.mapAt, o.fade == null ? 1 : o.fade);
      pump(g, o.dur || (o.mapAt + 14));
    } else {
      pump(g, 1e9);
    }
    return g.ev;
  };
  H._dbg = function () {
    if (!G) return null;
    var n = 0, s = {}; Object.keys(G.scenes).forEach(function (k) { s[k] = G.scenes[k].nodes.length; n += s[k]; });
    return { ctx: G.ctx, out: G.out, fade: G.fade, sh: G.sh, ev: G.ev, t0: G.t0, nodes: n, scenes: s, timer: !!G.timer };
  };
})();
