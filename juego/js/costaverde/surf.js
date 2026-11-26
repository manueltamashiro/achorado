/* ACHORADO - js/costaverde/surf.js  (C3, nivel Costa Verde: malecón de Miraflores → Larcomar → chef chifa → caída en parapente → Chorrillos)
 * Música de surf rock, bossa de centro comercial, rock pentatónico y épica criolla, 100 % sintetizada con Web Audio (sin samples). Reemplaza a js/audio/musica.js
 * (y a js/miraflores/rock.js) en costaverde.html: se registra en el mismo lugar (ACH.audio.musicEngine) y tiene la MISMA API (start, setMood, setIntensity, stinger,
 * setNight, night, diegetic, setListener, band, stop, state, setLevel, pauseFilter, _offline/_offlineBegin/_with) más setBoss(on) (heredada de rock.js), setZone,
 * setDirt, cvPlay y cvStop. Parte del motor de rock.js (mismo secuenciador, mismas capas y mismo limitador); los temas son nuevos y originales.
 *
 * ÁNIMOS DEL JUEGO (los que ya pide game.js; setIntensity 0..1 como siempre)
 *   explore «Brisa del Malecón»   126 bpm recto, Mi menor armónico → Mi mayor, 16 compases. Surf: melodía con picado trémolo (guitarra de pastilla con eco de resorte),
 *                                 bajo de púa a corcheas, charles y toms de surf, rasgueos a contratiempo y oleaje de fondo.
 *                                 Intensidad (= avance por el mapa): guitarra desde 0,04 · órgano 0,5 · palmas 0,65 · coro «aah» 0,8.
 *   chase   «Corre, que viene la ola»   168 bpm, La menor armónica → Do. Surf galopante: trémolo, dobles cuerdas con crunch, caja en 2 y 4, órgano y grito.
 *   horde   «Ola de muertos»      150 bpm, Mi menor. Garaje con surf: fuzz con palm mutes, trémolo, órgano Farfisa, pandereta y toms.
 *   boss    (setBoss(true))       «Mesa cuatro» = el tema del chef (ver cv.chef). Con setBoss(true), el ánimo horde/chase toca el tema del chef; con false vuelve.
 *
 * ZONAS DE EXPLORE (Larcomar)
 *   larco   «Terraza Larcomar»    104 bpm, bossa nova de centro comercial (nailon, piano eléctrico, cuerdas, clave de rim, huevito) que se va ENSUCIANDO con la suciedad
 *                                 S.dirt 0..1 (ingreso → arena del chifa): entran charles, bombo, caja, guitarra con crunch, fuzz, órgano y picado trémolo; el tempo sube hasta +18 %.
 *                                 Se activa solo en el ánimo explore. Lo pide el nivel con setZone('larcomar') + setDirt(d), o solo (autodetección por la posición de Alexander, ver CFG).
 *
 * TEMAS POR NOMBRE (se pisan sobre cualquier ánimo hasta stop; el juego puede seguir llamando setMood/setIntensity: no los cambia)
 *   cv.chef   «Mesa cuatro»       144 bpm, Mi menor pentatónica: riff al fuzz, gong, wok y cucharón como percusión, melodía pentatónica con pluck. Intensidad = capas (0 / 0,5 / 0,75).
 *   cv.caida  «Caída libre»       176 bpm, Mi frigio dominante → Mi mayor épico: trémolo, cuerdas, órgano, coro, viento.
 *   cv.heroe  «Aterrizaje en Chorrillos»  104 bpm, pulso de 6/8 (hemiola criolla): guitarra de nailon rasgueada → cajón y trémolo → surf rock épico con coro. 16 compases (~37 s), en bucle.
 *   API pública (también en ACH.audio.cv): cv.play(id) · cv.stop() · cv.playing() · cv.setZone('malecon'|'larcomar') · cv.setDirt(0..1) · cv.auto(on) · cv.info().
 *
 * Cambio de ánimo: en el siguiente tiempo (<= ~0,5 s), nunca en barras largas. Se corta la cola de eventos y las notas vivas en ese tiempo, con una
 * anacrusa de caja/toms, y la pieza nueva arranca ahí mismo. Programación anticipada de 0,25 s con temporizador de 25 ms.
 * Salida: compresor + limitador + recorte suave con techo en -3,2 dBFS (nunca pasa de 0,69).
 * Pruebas: _offline(ctx, out, reverbSend, script, dur) / _offlineBegin(...) con OfflineAudioContext, como musica.js; el script acepta {t, mood, intensity, stinger, night, secs, boss, listener, band, zone, dirt, play, stop}.
 */
var ACH = window.ACH = window.ACH || {};
var A = ACH.audio = ACH.audio || {};
(function () {
  'use strict';

  // ---------------------------------------------------------------------------------------------------------
  // utilidades
  var PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function M(name) {               // 'A4', 'C#5', 'Bb3' -> midi
    var r = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    if (!r) throw new Error('surf.js: nota mal escrita ' + name);
    return 12 * (+r[3] + 1) + PC[r[1]] + (r[2] === '#' ? 1 : r[2] === 'b' ? -1 : 0);
  }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // línea: "tiempo:nota:dur[flags]" con el tiempo y la duración en negras; notas juntas con + (dobles cuerdas).
  // flags: ~ = sube arrastrando desde abajo, v = vibrato, ! = acento, . = picado, \ = cae al final
  function P(str) {
    if (!str) return [];
    return str.trim().split(/\s+/).map(function (tok) {
      var p = tok.split(':');
      return { s: parseFloat(p[0]), n: p[1].split('+').map(M), d: parseFloat(p[2]), f: p[2].replace(/[\d.]/g, '') };
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
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }

  var Q = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], '6': [0, 4, 7, 9], m6: [0, 3, 7, 9], dim: [0, 3, 6, 9], '9': [0, 4, 7, 10, 14],
    M7: [0, 4, 7, 11], m7b5: [0, 3, 6, 10], '7b9': [0, 4, 7, 10, 13], m9: [0, 3, 7, 10, 14], M9: [0, 4, 7, 11, 14], sus: [0, 5, 7], '5': [0, 7] };
  var chordCache = {};
  function chord(sym) {
    if (chordCache[sym]) return chordCache[sym];
    var r = /^([A-G])([#b]?)(.*)$/.exec(sym);
    var root = (PC[r[1]] + (r[2] === '#' ? 1 : r[2] === 'b' ? -1 : 0) + 12) % 12;
    var pcs = Q[r[3]].map(function (i) { return (root + i) % 12; });
    return (chordCache[sym] = { root: root, pcs: pcs, sym: sym, q: r[3] });
  }
  function isTone(c, m) { return c.pcs.indexOf(((m % 12) + 12) % 12) >= 0; }
  function rootIn(c, lo) { var m = lo; while (((m % 12) + 12) % 12 !== c.root) m++; return m; }      // primera raíz >= lo
  function voicing(c, lo, n) { var out = [], k = lo; while (out.length < n) { if (isTone(c, k)) out.push(k); k++; } return out; }
  function isMinor(c) { return c.q === 'm' || c.q === 'm7' || c.q === 'm6' || c.q === 'm7b5' || c.q === 'm9'; }

  // ---------------------------------------------------------------------------------------------------------
  // estado
  var S = null;               // todo lo que vive mientras suena
  var wantMood = 'title', wantI = 0, wantBoss = false, wantNight = false, wantLevel = 'costaverde', wantBand = null;
  var wantZone = 'malecon', wantDirt = 0, wantOv = null, wantAuto = true;      // Costa Verde: zona de explore, suciedad de Larcomar, tema pedido por nombre, autodetección de zona
  var CFG = { y0: 36 * 16, y1: 69 * 16, hys: 24, every: 0.4 };               // autodetección: y de Alexander en el mundo (fila 36 = ingreso de Larcomar, fila 69 = arena del chifa)
  var gLX = 240, gLY = 135, gLSet = false;     // oyente (centro de cámara) del juego en vivo

  function now() { return S.offline ? S.vnow : S.ctx.currentTime; }

  // la noche: N(t) = objetivo + (desde - objetivo) * e^(-(t - t0) / tc); tc = segundos / 3 (95 % a los 8 s)
  function nightAt(t) { if (!S) return 0; var d = t - S.nT0; return d <= 0 ? S.nFrom : S.nTarget + (S.nFrom - S.nTarget) * Math.exp(-d / S.nTc); }
  // multiplicador nocturno de cada capa (1 = igual que de día). Solo lo que se apaga; lo nuevo (órgano de salón) entra por su capa.
  var NM = {
    explore: { drums: 0.7, hats: 0.55, snaps: 0, bass: 0.85, piano: 0.0, rhy: 0.35, lead: 0.7, sax: 0.0, coro: 0 },
    chase: { drums: 0.9, hats: 0.8, bass: 0.9, piano: 0.8, rhy: 0.8, lead: 0.8, sax: 0.8, snaps: 0.5 },
    horde: { drums: 0.9, hats: 0.8, bass: 0.9, rhy: 0.9, fuzz: 0.85, organ: 0.85, snaps: 0.5 },
    boss: { drums: 0.9, hats: 0.8, bass: 0.9, rhy: 0.9, fuzz: 0.85, organ: 0.85, snaps: 0.5 }
  };
  var SALON_VOL = { explore: 1, chase: 0.35, horde: 0.3, boss: 0.3 };       // cuánto entra el órgano de salón de noche por ánimo

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

  // parche (membrana o casco): modos inarmónicos + golpe de ruido filtrado + caída de afinación
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
  // platillo / charles: seis cuadradas inarmónicas (como una caja de ritmos de los 70) + ruido, filtrado alto
  function metal(dur, tau, hp, nzAmt, atk) {
    var sr = S.sr, n = Math.ceil(dur * sr), d = new Float32Array(n), fr = [263, 400, 421, 474, 587, 845], ph = fr.map(function () { return rnd(); }), i, k;
    var nz = noise(n);
    for (i = 0; i < n; i++) {
      var t = i / sr, y = 0;
      for (k = 0; k < 6; k++) { ph[k] += fr[k] / sr; if (ph[k] >= 1) ph[k] -= 1; y += ph[k] < 0.5 ? 1 : -1; }
      d[i] = (y * 0.3 + nz[i] * nzAmt) * Math.exp(-t / tau) * (t < atk ? t / atk : 1);
    }
    biq(d, 'hp', hp, 0.8, sr); biq(d, 'lp', 14000, 0.7, sr);
    return norm(d, 0.9);
  }
  // plato ride: ping inarmónico + lavado
  function ride(dur) {
    var sr = S.sr, n = Math.ceil(dur * sr), d = new Float32Array(n), i, k, fr = [530, 783, 1245, 1790, 2680, 3410, 4790];
    for (i = 0; i < n; i++) {
      var t = i / sr, y = 0;
      for (k = 0; k < fr.length; k++) y += Math.sin(2 * Math.PI * fr[k] * t + k) * (0.9 / (1 + k * 0.5)) * Math.exp(-t / (0.5 / (1 + k * 0.3)));
      d[i] = y;
    }
    var w = noise(n); biq(w, 'hp', 4500, 0.7, sr);
    for (i = 0; i < n; i++) d[i] += 0.28 * w[i] * Math.exp(-i / sr / 0.32) * Math.min(1, i / sr / 0.01);
    biq(d, 'hp', 300, 0.7, sr);
    return norm(d, 0.9);
  }
  // escobilla: barrido de ruido que sube y baja (suave) o golpe corto con cuerpo
  function swish(dur, f, peakAt) {
    var sr = S.sr, n = Math.ceil(dur * sr), d = noise(n), i;
    biq(d, 'hp', 1400, 0.7, sr); biq(d, 'bp', f, 0.6, sr); biq(d, 'lp', 8500, 0.7, sr);
    for (i = 0; i < n; i++) { var u = i / n; d[i] *= u < peakAt ? Math.pow(u / peakAt, 1.3) : Math.pow((1 - u) / (1 - peakAt), 1.6); }
    return norm(d, 0.9);
  }
  function brushHit() {
    var sr = S.sr, n = Math.ceil(0.22 * sr), d = noise(n), i;
    biq(d, 'bp', 3200, 0.7, sr); biq(d, 'hp', 1500, 0.7, sr);
    for (i = 0; i < n; i++) { var t = i / sr; d[i] *= (0.45 + 0.55 * Math.exp(-t / 0.03)) * Math.exp(-t / 0.09) * Math.min(1, t / 0.004); }
    for (i = 0; i < Math.floor(0.04 * sr); i++) d[i] += 0.5 * Math.sin(2 * Math.PI * 175 * i / sr) * Math.exp(-i / sr / 0.015);
    return norm(d, 0.9);
  }
  // pandereta: golpe + cascabeles (ráfaga de ruido agudo con resonancias)
  function tamb(hit) {
    var sr = S.sr, n = Math.ceil((hit ? 0.35 : 0.16) * sr), d = new Float32Array(n), i, k;
    var bursts = hit ? [0, 0.011, 0.024] : [0, 0.016];
    for (k = 0; k < bursts.length; k++) {
      var nz = noise(n); biq(nz, 'hp', 5200, 0.8, sr); biq(nz, 'bp', 8200, 0.7, sr);
      var i0 = Math.floor(bursts[k] * sr);
      for (i = i0; i < n; i++) { var t = (i - i0) / sr; d[i] += nz[i] * Math.exp(-t / (hit ? 0.09 : 0.035)) * (k === 0 ? 1 : 0.7) * Math.min(1, t / 0.0008); }
    }
    var fr = [5900, 7100, 8400, 9700];
    for (i = 0; i < n; i++) { var tt = i / sr, y = 0; for (k = 0; k < 4; k++) y += Math.sin(2 * Math.PI * fr[k] * tt) * 0.12; d[i] += y * Math.exp(-tt / 0.05) * (hit ? 1 : 0.5); }
    return norm(d, 0.9);
  }
  function snapBuf() {                 // chasquido de dedos: «tac» seco con resonancia de la palma
    var sr = S.sr, n = Math.ceil(0.14 * sr), d = noise(n), i;
    biq(d, 'bp', 2700, 1.6, sr); biq(d, 'hp', 1200, 0.7, sr);
    for (i = 0; i < n; i++) { var t = i / sr; d[i] *= Math.exp(-t / 0.018) * Math.min(1, t / 0.0004); d[i] += 0.65 * Math.sin(2 * Math.PI * 1350 * t) * Math.exp(-t / 0.011) + 0.5 * Math.sin(2 * Math.PI * 420 * t) * Math.exp(-t / 0.03); }
    return norm(d, 0.9);
  }
  function clapBuf() {                 // palmas: ráfagas encimadas, cola corta de sala
    var sr = S.sr, n = Math.ceil(0.34 * sr), d = new Float32Array(n), i, k, off = [0, 0.007, 0.0135, 0.021, 0.03];
    for (k = 0; k < off.length; k++) {
      var nz = noise(n); biq(nz, 'bp', 1500 + 220 * k, 1.1, sr); biq(nz, 'hp', 700, 0.7, sr);
      var i0 = Math.floor(off[k] * sr), tau = k === off.length - 1 ? 0.11 : 0.009;
      for (i = i0; i < n; i++) d[i] += nz[i] * Math.exp(-(i - i0) / sr / tau) * Math.min(1, (i - i0) / sr / 0.0006) * (k === off.length - 1 ? 0.8 : 1);
    }
    return norm(d, 0.9);
  }

  // Karplus-Strong: cuerda pulsada con excitación filtrada y posición de púa; devuelve buffer + playbackRate de afinación.
  // «pastilla»: dos parciales de banda sumados (el brillo de la pastilla del puente) en los timbres claros.
  var KS = {
    twang: { bright: 0.8, t60: 1.5, dur: 1.5, pick: 0.11, pu: 0.9 },       // guitarra limpia de los 60: ataque de púa y brillo de pastilla
    chop:  { bright: 0.5, t60: 0.1, dur: 0.18, pick: 0.2, pu: 0.4 },       // rasgueo apagado (backbeat)
    open:  { bright: 0.55, t60: 0.7, dur: 0.8, pick: 0.2, pu: 0.5 },       // rasgueo abierto
    fuzz:  { bright: 0.6, t60: 2.0, dur: 1.0, pick: 0.15, pu: 0 },         // cuerda que va al fuzz
    fmute: { bright: 0.42, t60: 0.1, dur: 0.22, pick: 0.15, pu: 0 },       // palm mute al fuzz
    last:  { bright: 0.72, t60: 5.5, dur: 5.5, pick: 0.11, pu: 0.8 },      // nota final que se queda sonando (win)
    trem:  { bright: 0.8, t60: 0.3, dur: 0.38, pick: 0.11, pu: 0.8 },       // un golpe de púa del picado trémolo (surf): corto, brillante
    nylon: { bright: 0.3, t60: 1.4, dur: 1.4, pick: 0.2, pu: 0 }            // guitarra criolla / de bossa: cálida, sin pastilla
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
    biq(y, 'hp', 75, 0.7, sr);
    if (o.pu) { var bp = Float32Array.prototype.slice.call(y); biq(bp, 'bp', 2500, 1.0, sr); for (i = 0; i < n; i++) y[i] += o.pu * bp[i]; }
    norm(y, 0.9);
    return (S.cache[key] = { buf: toBuf(y), rate: f / f0 });
  }

  // piano: aditivo con inarmonicidad, dos cuerdas levemente desafinadas (un poco «de bar», honky-tonk), doble caída y martillo
  function piano(midi) {
    var key = 'pno' + midi;
    if (S.cache[key]) return S.cache[key];
    var sr = S.sr, f = hz(midi), dur = 0.85, n = Math.ceil(dur * sr), d = new Float32Array(n), B = 0.0004;
    var nk = Math.min(6, Math.floor(6500 / f)), i, k, s;
    for (k = 1; k <= nk; k++) {
      var fk = f * k * Math.sqrt(1 + B * k * k), ak = Math.pow(k, -1.2) * (1 - 0.07 * k) * (k === 1 ? 0.9 : 1);
      if (ak <= 0) continue;
      var tf = 0.08 + 0.22 / k, ts = Math.max(0.12, 1.3 * Math.pow(0.5, (midi - 60) / 24) / (0.7 + 0.3 * k));
      var df = Math.exp(-1 / (sr * tf)), ds = Math.exp(-1 / (sr * ts)), ef = 0.55 * ak, es = 0.45 * ak;
      for (s = 0; s < 2; s++) {
        var w = 2 * Math.PI * fk * (s ? 1.0011 : 1) / sr, c2 = 2 * Math.cos(w), ph = rnd() * 6, amp = s ? 0.75 : 1;
        var y1 = Math.sin(ph - w), y2 = Math.sin(ph - 2 * w), e1 = ef * amp, e2 = es * amp;
        for (i = 0; i < n; i++) {
          var y = c2 * y1 - y2; y2 = y1; y1 = y;
          d[i] += (e1 + e2) * y; e1 *= df; e2 *= ds;
        }
      }
    }
    var hm = noise(Math.floor(0.03 * sr)); biq(hm, 'lp', 2400 + f, 0.8, sr);
    for (i = 0; i < hm.length; i++) d[i] += 0.4 * hm[i] * Math.exp(-i / sr / 0.005);
    for (i = 0; i < Math.floor(0.025 * sr); i++) d[i] += 0.25 * Math.sin(2 * Math.PI * 70 * i / sr) * Math.exp(-i / sr / 0.008);
    var att = Math.floor(sr * 0.001); for (i = 0; i < att; i++) d[i] *= i / att;
    biq(d, 'lp', 7000, 0.7, sr);
    norm(d, 0.9);
    return (S.cache[key] = toBuf(d));
  }

  function buildSamples() {
    var B = S.buf = {};
    B.kick = toBuf(drum(60, 0.32, [[1, 1, 0.1], [2.1, 0.18, 0.04]], 1.2, [0.22, 2400, 0.8, 0.012]));
    B.kickS = toBuf(drum(52, 0.26, [[1, 1, 0.075]], 0.7, [0.06, 900, 0.9, 0.01]));              // pedal suave de combo de jazz
    B.snare = toBuf(drum(195, 0.34, [[1, 0.8, 0.06], [1.6, 0.4, 0.04], [2.4, 0.25, 0.03]], 0.15, [1.1, 3600, 0.55, 0.12]));
    B.rim = toBuf(drum(1150, 0.1, [[1, 1, 0.018], [2.4, 0.5, 0.012], [3.9, 0.25, 0.008]], 0, [0.5, 3000, 1, 0.01]));
    B.tomH = toBuf(drum(205, 0.5, [[1, 1, 0.18], [1.7, 0.3, 0.07]], 0.3, [0.2, 1500, 0.9, 0.012]));
    B.tomM = toBuf(drum(150, 0.6, [[1, 1, 0.22], [1.7, 0.3, 0.08]], 0.3, [0.2, 1300, 0.9, 0.012]));
    B.tomL = toBuf(drum(105, 0.7, [[1, 1, 0.28], [1.7, 0.3, 0.09]], 0.3, [0.2, 1100, 0.9, 0.012]));
    B.hatC = toBuf(metal(0.08, 0.02, 7000, 0.35, 0.0006));
    B.hatO = toBuf(metal(0.45, 0.15, 6500, 0.3, 0.0008));
    B.ride = toBuf(ride(1.0));
    B.crash = toBuf(metal(2.4, 0.75, 3200, 0.9, 0.001));
    B.swish = toBuf(swish(0.2, 4200, 0.45));
    B.swishL = toBuf(swish(0.34, 3600, 0.5));
    B.brush = toBuf(brushHit());
    B.tamb = toBuf(tamb(false));
    B.tambH = toBuf(tamb(true));
    B.snap = toBuf(snapBuf());
    B.clap = toBuf(clapBuf());
    B.shaker = toBuf(shakerBuf(0.07)); B.shakerL = toBuf(shakerBuf(0.12));
    B.cajon = toBuf(drum(88, 0.27, [[1, 1, 0.09], [1.8, 0.25, 0.04]], 0.9, [0.18, 700, 0.8, 0.02])); B.cajonH = toBuf(cajonSlap());
    B.wokH = toBuf(wokBuf(760)); B.wokL = toBuf(wokBuf(520)); B.ladle = toBuf(ladleBuf());
    B.vsr = toBuf(noise(2 * S.sr));                        // soplo de caña y ruido de uso general (en bucle)
  }

  // huevito (shaker): ráfaga de ruido muy agudo con ataque lento
  function shakerBuf(dur) {
    var sr = S.sr, n = Math.ceil(dur * sr), d = noise(n), i;
    biq(d, 'hp', 5500, 0.7, sr); biq(d, 'bp', 9000, 0.5, sr);
    for (i = 0; i < n; i++) { var t = i / sr; d[i] *= Math.min(1, t / 0.012) * Math.exp(-t / (dur * 0.35)); }
    return norm(d, 0.9);
  }
  // cajón peruano, golpe de palma (slap): ruido de banda media y un tono de caja de madera
  function cajonSlap() {
    var sr = S.sr, n = Math.ceil(0.16 * sr), d = noise(n), i;
    biq(d, 'bp', 1900, 0.8, sr); biq(d, 'hp', 800, 0.7, sr);
    for (i = 0; i < n; i++) { var t = i / sr; d[i] = d[i] * Math.exp(-t / 0.03) * Math.min(1, t / 0.0006) + 0.55 * Math.sin(2 * Math.PI * 320 * t) * Math.exp(-t / 0.022) + 0.3 * Math.sin(2 * Math.PI * 145 * t) * Math.exp(-t / 0.04); }
    return norm(d, 0.9);
  }
  // wok golpeado con cucharón: cuenco de metal (modos inarmónicos que decaen) + golpe seco
  function wokBuf(f) {
    var sr = S.sr, n = Math.ceil(0.5 * sr), d = new Float32Array(n), R = [1, 1.51, 2.21, 2.93, 4.07], T = [0.3, 0.2, 0.13, 0.09, 0.06], A0 = [1, 0.7, 0.5, 0.35, 0.25], i, k;
    for (i = 0; i < n; i++) { var t = i / sr, y = 0; for (k = 0; k < 5; k++) y += A0[k] * Math.sin(2 * Math.PI * f * R[k] * t) * Math.exp(-t / T[k]); d[i] = y; }
    var nz = noise(n); biq(nz, 'bp', 3500, 0.8, sr);
    for (i = 0; i < n; i++) d[i] += 0.6 * nz[i] * Math.exp(-i / sr / 0.01);
    var att = Math.floor(sr * 0.0006); for (i = 0; i < att; i++) d[i] *= i / att;
    return norm(d, 0.9);
  }
  // cucharón: tic metálico corto y agudo
  function ladleBuf() {
    var sr = S.sr, n = Math.ceil(0.13 * sr), d = new Float32Array(n), R = [1, 1.34, 2.1, 3.3], T = [0.05, 0.035, 0.022, 0.014], i, k;
    for (i = 0; i < n; i++) { var t = i / sr, y = 0; for (k = 0; k < 4; k++) y += Math.sin(2 * Math.PI * 2100 * R[k] * t) * Math.exp(-t / T[k]) / (1 + k * 0.4); d[i] = y; }
    var nz = noise(n); biq(nz, 'bp', 6000, 0.8, sr);
    for (i = 0; i < n; i++) d[i] += 0.4 * nz[i] * Math.exp(-i / sr / 0.006);
    var att = Math.floor(sr * 0.0004); for (i = 0; i < att; i++) d[i] *= i / att;
    return norm(d, 0.9);
  }
  // gong grande (4,6 s): modos inarmónicos de una lámina con batido, ataque rápido pero redondo
  function gongBuf() {
    var sr = S.sr, dur = 4.6, n = Math.ceil(dur * sr), d = new Float32Array(n), f = 112, R = [1, 1.007, 1.47, 2.02, 2.56, 3.31, 4.74, 5.93], T = [2.6, 2.4, 2.0, 1.5, 1.1, 0.8, 0.5, 0.32],
        A0 = [1, 0.8, 0.7, 0.55, 0.42, 0.3, 0.2, 0.12], i, k, w = [];
    for (k = 0; k < R.length; k++) w.push(2 * Math.PI * f * R[k] / sr);
    for (k = 0; k < R.length; k++) {
      var tau = T[k] * sr, ph = 0, e = A0[k], dec = Math.exp(-1 / tau), att = Math.floor(sr * (0.012 + 0.01 * k)), ra = Math.exp(-1 / (sr * 0.04 * (1 + 0.3 * k)));
      for (i = 0; i < n; i++) { ph += w[k] * (1 + 0.004 * Math.sin(i * 2 * Math.PI * 0.8 / sr)); d[i] += e * Math.sin(ph) * (i < att ? i / att : 1); e *= dec; }
    }
    var nz = noise(Math.floor(0.2 * sr)); biq(nz, 'bp', 1400, 0.5, sr);
    for (i = 0; i < nz.length; i++) d[i] += 0.5 * nz[i] * Math.exp(-i / sr / 0.05);
    return norm(d, 0.9);
  }
  // subida de ruido (riser) de 1,6 s: aire que crece
  function riserBuf() {
    var sr = S.sr, n = Math.ceil(1.6 * sr), d = noise(n), i;
    biq(d, 'hp', 2400, 0.7, sr); biq(d, 'lp', 12000, 0.7, sr);
    for (i = 0; i < n; i++) { var u = i / n; d[i] = d[i] * Math.pow(u, 2.2) + 0.25 * Math.sin(2 * Math.PI * (300 * u + 700 * u * u) * i / sr) * Math.pow(u, 3); }
    return norm(d, 0.9);
  }
  var LAZY = { gong: function () { return toBuf(gongBuf()); }, riser: function () { return toBuf(riserBuf()); } };     // muestras pesadas o poco usadas: se hornean al pedirlas
  function lazy(name) { return S.buf[name] || (LAZY[name] ? (S.buf[name] = LAZY[name]()) : null); }

  // reverb de resorte (cuerpo de amplificador): ruido con ecos dispersos cada ~31 ms, banda metálica
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
  function roomIR(secs) {              // sala/placa propia (más larga que la calle húmeda del motor): reverb de salón
    var sr = S.sr, n = Math.floor(sr * secs), b = S.ctx.createBuffer(2, n, sr);
    for (var ch = 0; ch < 2; ch++) {
      var d = b.getChannelData(ch), lp = 0;
      for (var i = 0; i < n; i++) { var t = i / sr; lp += (rnd() * 2 - 1 - lp) * (0.5 - 0.42 * t / secs); d[i] = lp * Math.exp(-t * 3.6) * (t < 0.006 ? t / 0.006 : 1); }
    }
    return b;
  }

  // ---------------------------------------------------------------------------------------------------------
  // mezcla
  //  capa -> multiplicador nocturno -> volumen -> panorama -> preBus -> HP -> brillo cálido -> duck -> paso bajo de pausa -> ganancia de pausa
  //       -> compresor -> trim (fundido de entrada) -> limitador -> recorte suave (techo CEIL) -> out
  //  envíos: send -> sala/placa propia (vuelve a preBus) y -> reverbSend del motor (calle húmeda, poco)
  var LAYERS = {
    drums: { vol: 1.2, pan: 0.0, send: 0.07 },
    hats:  { vol: 0.9, pan: 0.3, send: 0.07 },
    snaps: { vol: 0.9, pan: -0.28, send: 0.3 },
    bass:  { vol: 0.28, pan: 0.0, send: 0.0 },
    piano: { vol: 0.36, pan: -0.28, send: 0.16 },
    rhy:   { vol: 1.6, pan: 0.42, send: 0.1, spring: 0.22 },
    lead:  { vol: 0.7, pan: -0.12, send: 0.2 },
    fuzz:  { vol: 0.75, pan: -0.2, send: 0.1 },
    crunch: { vol: 0.85, pan: -0.25, send: 0.08, spring: 0.12 },
    sax:   { vol: 0.3, pan: 0.25, send: 0.3 },
    organ: { vol: 0.28, pan: 0.2, send: 0.22 },
    salon: { vol: 0.4, pan: 0.0, send: 0.5 },
    coro:  { vol: 0.9, pan: 0.0, send: 0.42 },
    stg:   { vol: 0.6, pan: 0.0, send: 0.26 },
    nylon: { vol: 0.9, pan: -0.1, send: 0.25 },
    epiano: { vol: 0.5, pan: -0.3, send: 0.3 },
    strings: { vol: 0.35, pan: 0.0, send: 0.45 },
    perc:  { vol: 1.0, pan: 0.15, send: 0.18 },
    pluck: { vol: 0.5, pan: 0.2, send: 0.35 },
    sea:   { vol: 0.5, pan: 0.0, send: 0.06 }
  };
  var TRIM = 0.62, CEIL = 0.69, PRE = 0.3;      // CEIL = 0,69 -> -3,2 dBFS

  function build(ctx, out, reverbSend) {
    var c = ctx, n = {}, i, x;
    n.pre = c.createGain(); n.pre.gain.value = PRE;
    n.lowc = c.createBiquadFilter(); n.lowc.type = 'highpass'; n.lowc.frequency.value = 34; n.lowc.Q.value = 0.7;
    n.warm = c.createBiquadFilter(); n.warm.type = 'highshelf'; n.warm.frequency.value = 6500; n.warm.gain.value = -3;
    n.duck = c.createGain();             // la música baja cerca del combo de la calle
    n.plp = c.createBiquadFilter(); n.plp.type = 'lowpass'; n.plp.frequency.value = 20000; n.plp.Q.value = 0.6;
    n.pg = c.createGain();
    n.comp = c.createDynamicsCompressor();
    n.comp.threshold.value = -22; n.comp.knee.value = 8; n.comp.ratio.value = 3; n.comp.attack.value = 0.005; n.comp.release.value = 0.18;
    n.trim = c.createGain(); n.trim.gain.value = TRIM;
    n.lim = c.createDynamicsCompressor();
    n.lim.threshold.value = -8; n.lim.knee.value = 3; n.lim.ratio.value = 20; n.lim.attack.value = 0.001; n.lim.release.value = 0.1;
    n.clip = c.createWaveShaper();
    var cc = new Float32Array(2049), kn = 0.5;
    for (i = 0; i < 2049; i++) { x = i / 1024 - 1; var ax = Math.abs(x), y = ax <= kn ? ax : kn + (CEIL - kn) * Math.tanh((ax - kn) / (CEIL - kn)); cc[i] = (x < 0 ? -1 : 1) * Math.min(y, CEIL); }
    n.clip.curve = cc; n.clip.oversample = '2x';
    n.pre.connect(n.lowc); n.lowc.connect(n.warm); n.warm.connect(n.duck); n.duck.connect(n.plp); n.plp.connect(n.pg); n.pg.connect(n.comp); n.comp.connect(n.trim);
    n.trim.connect(n.lim); n.lim.connect(n.clip); n.clip.connect(out);
    // reverb: sala propia (siempre) + calle húmeda del motor (poca)
    n.send = c.createGain();
    n.plate = c.createConvolver(); n.plate.buffer = roomIR(1.7);
    n.plateRet = c.createGain(); n.plateRet.gain.value = 0.34; n.plateBase = 0.34;
    n.send.connect(n.plate); n.plate.connect(n.plateRet); n.plateRet.connect(n.pre);
    n.slp = c.createBiquadFilter(); n.slp.type = 'lowpass'; n.slp.frequency.value = 20000;
    n.sg = c.createGain(); n.sg.gain.value = reverbSend ? TRIM * PRE * 0.9 : 0; n.sgBase = n.sg.gain.value;
    n.send.connect(n.slp); n.slp.connect(n.sg); if (reverbSend) n.sg.connect(reverbSend);
    // resorte para guitarras
    n.spring = c.createConvolver(); n.spring.buffer = springIR();
    n.springRet = c.createGain(); n.springRet.gain.value = 0.5;
    n.spring.connect(n.springRet); n.springRet.connect(n.pre);
    // capas
    n.L = {};
    Object.keys(LAYERS).forEach(function (k) {
      var d = LAYERS[k], g = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : null;
      g.gain.value = d.vol;
      if (pan) { pan.pan.value = d.pan; g.connect(pan); pan.connect(n.pre); } else g.connect(n.pre);
      if (d.send) { var s = c.createGain(); s.gain.value = d.send; g.connect(s); s.connect(n.send); }
      if (d.spring) { var sp = c.createGain(); sp.gain.value = d.spring; g.connect(sp); sp.connect(n.spring); }
      var nm = c.createGain(); nm.gain.value = 1; nm.connect(g);           // multiplicador nocturno (antes del volumen, de los envíos y del resorte)
      n.L[k] = { fade: g, input: nm, nm: nm };
    });
    // guitarra limpia de los 60: saturación muy suave -> EQ de pastilla -> trémolo del amplificador -> capa; después eco corto (slapback) y resorte
    var cv = new Float32Array(1024); for (i = 0; i < 1024; i++) { x = i / 511.5 - 1; cv[i] = Math.tanh(1.4 * x) / Math.tanh(1.4); }
    var linp = c.createGain(), ldr = c.createWaveShaper(), lhp = c.createBiquadFilter(), leq = c.createBiquadFilter(), llp = c.createBiquadFilter(), ltr = c.createGain();
    ldr.curve = cv; lhp.type = 'highpass'; lhp.frequency.value = 110; lhp.Q.value = 0.7;
    leq.type = 'peaking'; leq.frequency.value = 2700; leq.Q.value = 0.9; leq.gain.value = 3;
    llp.type = 'lowpass'; llp.frequency.value = 6000; llp.Q.value = 0.6;
    linp.connect(ldr); ldr.connect(lhp); lhp.connect(leq); leq.connect(llp); llp.connect(ltr); ltr.connect(n.L.lead.nm);
    n.L.lead.input = linp; n.ltrem = ltr;
    n.tlfo = c.createOscillator(); n.tlfo.frequency.value = 5.4;
    n.tdepth = c.createGain(); n.tdepth.gain.value = 0;
    n.tlfo.connect(n.tdepth); n.tdepth.connect(ltr.gain); n.tlfo.start();
    n.slapDl = c.createDelay(1); n.slapDl.delayTime.value = 0.118;
    var slf = c.createGain(), slp2 = c.createBiquadFilter(); slf.gain.value = 0.2; slp2.type = 'lowpass'; slp2.frequency.value = 3200;
    n.slapDl.connect(slp2); slp2.connect(slf); slf.connect(n.slapDl); slp2.connect(n.pre);
    n.slapG = c.createGain(); n.slapG.gain.value = 0.3; n.L.lead.fade.connect(n.slapG); n.slapG.connect(n.slapDl);
    n.sprG = c.createGain(); n.sprG.gain.value = 0.5; n.L.lead.fade.connect(n.sprG); n.sprG.connect(n.spring);
    // fuzz de garaje: HP -> ganancia -> curva asimétrica (armónicos pares: sonido «cara de fuzz») -> paso bajo + medios -> capa
    var fin = c.createGain(), fhp = c.createBiquadFilter(), fpre = c.createGain(), fsh = c.createWaveShaper(), flp = c.createBiquadFilter(), fmid = c.createBiquadFilter(), fpo = c.createGain();
    var fc = new Float32Array(2048), fm = 0;
    for (i = 0; i < 2048; i++) { x = i / 1023.5 - 1; fc[i] = Math.tanh(7 * x + 0.45) - Math.tanh(0.45); fm = Math.max(fm, Math.abs(fc[i])); }
    for (i = 0; i < 2048; i++) fc[i] /= fm;
    fhp.type = 'highpass'; fhp.frequency.value = 95; fhp.Q.value = 0.7; fpre.gain.value = 2.6;
    fsh.curve = fc; fsh.oversample = '4x';
    flp.type = 'lowpass'; flp.frequency.value = 3400; flp.Q.value = 0.7; fmid.type = 'peaking'; fmid.frequency.value = 1100; fmid.Q.value = 0.8; fmid.gain.value = 3; fpo.gain.value = 0.55;
    fin.connect(fhp); fhp.connect(fpre); fpre.connect(fsh); fsh.connect(flp); flp.connect(fmid); fmid.connect(fpo); fpo.connect(n.L.fuzz.nm);
    n.L.fuzz.input = fin;
    // guitarra rítmica con crunch (persecución): HP -> saturación media -> paso bajo -> capa
    var cin = c.createGain(), chp = c.createBiquadFilter(), csh = c.createWaveShaper(), clp = c.createBiquadFilter(), cpo = c.createGain(), cck = new Float32Array(1024);
    for (i = 0; i < 1024; i++) { x = i / 511.5 - 1; cck[i] = Math.tanh(3.2 * x + 0.12) - Math.tanh(0.12); }
    csh.curve = cck; chp.type = 'highpass'; chp.frequency.value = 120; chp.Q.value = 0.7; clp.type = 'lowpass'; clp.frequency.value = 4800; clp.Q.value = 0.6; cpo.gain.value = 0.75;
    cin.connect(chp); chp.connect(csh); csh.connect(clp); clp.connect(cpo); cpo.connect(n.L.crunch.nm); n.L.crunch.input = cin;
    // saxo: curva de caña (saturación suave) y EQ de campana
    var rc = new Float32Array(1024); for (i = 0; i < 1024; i++) { x = i / 511.5 - 1; rc[i] = Math.tanh(1.9 * x) / Math.tanh(1.9); }
    n.reedCurve = rc;
    var sin = c.createGain(), seq = c.createBiquadFilter(), slo = c.createBiquadFilter();
    seq.type = 'peaking'; seq.frequency.value = 1250; seq.Q.value = 1.1; seq.gain.value = 4;
    slo.type = 'lowpass'; slo.frequency.value = 5200; slo.Q.value = 0.5;
    sin.connect(seq); seq.connect(slo); slo.connect(n.L.sax.nm); n.L.sax.input = sin;
    // órgano Farfisa: onda de caña (armónicos impares + un poco de pares), vibrato compartido, paso bajo nasal
    var re = new Float32Array(10), im = new Float32Array(10);
    [1, 0.34, 0.24, 0.06, 0.15, 0.03, 0.09, 0.02, 0.06].forEach(function (a, k) { im[k + 1] = a; });
    n.orgWave = c.createPeriodicWave(re, im);
    var oin = c.createGain(), olp = c.createBiquadFilter(), onasal = c.createBiquadFilter();
    olp.type = 'lowpass'; olp.frequency.value = 4300; olp.Q.value = 0.6; onasal.type = 'peaking'; onasal.frequency.value = 1700; onasal.Q.value = 1.2; onasal.gain.value = 3;
    oin.connect(olp); olp.connect(onasal); onasal.connect(n.L.organ.nm); n.L.organ.input = oin;
    n.ovib = c.createOscillator(); n.ovib.frequency.value = 6.1; n.ovibG = c.createGain(); n.ovibG.gain.value = 8; n.ovib.connect(n.ovibG); n.ovib.start();
    // órgano de salón: trémolo lento tipo altavoz rotatorio
    var sal = c.createGain(); sal.gain.value = 0.84; sal.connect(n.L.salon.nm); n.L.salon.input = sal;
    n.llfo = c.createOscillator(); n.llfo.frequency.value = 0.9; n.lg = c.createGain(); n.lg.gain.value = 0.16; n.llfo.connect(n.lg); n.lg.connect(sal.gain); n.llfo.start();
    // coro: suma de voces -> banco de 3 formantes en paralelo
    n.coroIn = c.createGain();
    n.form = [0, 1, 2].map(function (k) {
      var f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'bandpass'; f.Q.value = [5, 8, 10][k]; f.frequency.value = [360, 720, 2400][k];
      g.gain.value = [1.6, 1.0, 0.45][k];
      n.coroIn.connect(f); f.connect(g); g.connect(n.L.coro.nm);
      return f;
    });
    n.cvib = c.createOscillator(); n.cvib.frequency.value = 5.3; n.cvibG = c.createGain(); n.cvibG.gain.value = 9; n.cvib.connect(n.cvibG); n.cvib.start();
    // cuerdas sintéticas: paso bajo suave. Piano eléctrico: paso bajo y trémolo de amplificador suave
    var stIn = c.createGain(), stlp = c.createBiquadFilter(); stlp.type = 'lowpass'; stlp.frequency.value = 2600; stlp.Q.value = 0.5; stIn.connect(stlp); stlp.connect(n.L.strings.nm); n.L.strings.input = stIn;
    var epIn = c.createGain(), eplp = c.createBiquadFilter(), eptr = c.createGain();
    eplp.type = 'lowpass'; eplp.frequency.value = 4200; eplp.Q.value = 0.6; eptr.gain.value = 0.86;
    n.eplfo = c.createOscillator(); n.eplfo.frequency.value = 4.3; n.epdepth = c.createGain(); n.epdepth.gain.value = 0.14; n.eplfo.connect(n.epdepth); n.epdepth.connect(eptr.gain); n.eplfo.start();
    epIn.connect(eplp); eplp.connect(eptr); eptr.connect(n.L.epiano.nm); n.L.epiano.input = epIn;
    // soplo de caña: ruido en bucle
    n.bassWave = c.createPeriodicWave(new Float32Array(7), new Float32Array([0, 1, 0.5, 0.25, 0.12, 0.06, 0.03]));
    return n;
  }

  // ---------------------------------------------------------------------------------------------------------
  // instrumentos en tiempo real (cada nota crea sus nodos justo antes de sonar)
  // Todas las notas de la música se anotan en S.live con su ganancia: al cambiar de ánimo se cortan en el tiempo elegido.
  function layerIn(name) { return typeof name === 'string' ? S.n.L[name].input : name; }
  function reg(param, t0, te, kind) { if (kind !== 'x') S.live.push({ p: param, t0: t0, te: te, k: kind || 'm' }); }
  function play(t, buf, layer, vel, rate, kind) {
    var c = S.ctx, s = c.createBufferSource(), g = c.createGain();
    s.buffer = buf; if (rate) s.playbackRate.value = rate;
    g.gain.value = 0; g.gain.setValueAtTime(vel, t);
    s.connect(g); g.connect(layerIn(layer)); s.start(t);
    reg(g.gain, t, t + buf.duration / (rate || 1), kind || 'p');
  }
  function noiseLoop(t, dur, dest, f, q, gain) {            // soplo filtrado de banda (caña de saxo, platillo de aire)
    var c = S.ctx, s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = S.buf.vsr; s.loop = true; bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.025); g.gain.setTargetAtTime(gain * 0.5, t + 0.05, 0.1); g.gain.setTargetAtTime(0, t + dur, 0.05);
    s.connect(bp); bp.connect(g); g.connect(dest); s.start(t, rnd() * 1.5); s.stop(t + dur + 0.3);
    return g;
  }

  // guitarra eléctrica (limpia o al fuzz según la capa): cuerda Karplus-Strong con entrada deslizada y vibrato
  function gtr(t, midi, dur, o) {
    o = o || {};
    var c = S.ctx, kind = o.kind || 'twang', k = ks(midi, kind), s = c.createBufferSource(), r = k.rate;
    s.buffer = k.buf;
    if (o.scoop) { s.playbackRate.setValueAtTime(r * 0.891, t); s.playbackRate.setTargetAtTime(r, t + 0.015, 0.045); }        // arrastre desde un tono abajo
    else if (o.slide) { s.playbackRate.setValueAtTime(r * 0.944, t); s.playbackRate.linearRampToValueAtTime(r, t + 0.05); }
    else if (o.drip) { s.playbackRate.setValueAtTime(r * 1.0595, t); s.playbackRate.linearRampToValueAtTime(r, t + 0.16); }       // entra un semitono arriba y se escurre hacia la nota (miel)
    else s.playbackRate.value = r;
    if (o.dive) { s.playbackRate.setValueAtTime(r, t + dur * 0.15); s.playbackRate.exponentialRampToValueAtTime(r * o.dive, t + dur); }   // caída de palanca (surf)
    var stopAt = t + Math.min(dur + 0.4, k.buf.duration / r);
    if (o.vib && dur > 0.3) {
      var l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(r * 0.008, t + Math.min(0.5, dur * 0.6));
      l.connect(lg); lg.connect(s.playbackRate); l.start(t); l.stop(stopAt);
    }
    var env = c.createGain(), vel = o.vel || 0.8;
    env.gain.value = 0; env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(vel, t + 0.003);
    env.gain.setTargetAtTime(0, t + dur, o.rel || 0.06);
    s.connect(env); env.connect(layerIn(o.layer || 'lead'));
    s.start(t); s.stop(stopAt);
    reg(env.gain, t, stopAt, o.k);
  }
  // rasgueo de varias cuerdas (chop = apagado, open = abierto); dur recorta el abierto
  function strum(t, notes, kind, vel, up, layer, dur, k) {
    var c = S.ctx, i, ord = up ? notes.slice().reverse() : notes;
    for (i = 0; i < ord.length; i++) {
      var kk = ks(ord[i], kind), s = c.createBufferSource(), g = c.createGain(), tt = t + i * 0.006;
      s.buffer = kk.buf; s.playbackRate.value = kk.rate;
      g.gain.value = 0; g.gain.setValueAtTime(vel * (0.6 + 0.12 * i / ord.length), tt);
      if (dur) g.gain.setTargetAtTime(0, t + dur, 0.03);
      s.connect(g); g.connect(layerIn(layer || 'rhy')); s.start(tt); s.stop(tt + Math.min(dur ? dur + 0.2 : 9, kk.buf.duration / kk.rate));
      reg(g.gain, tt, tt + Math.min(dur ? dur + 0.2 : 9, kk.buf.duration / kk.rate), k);
    }
  }
  // acorde de potencia al fuzz (fundamental + quinta + octava); mute = palm mute corto
  function pwr(t, root, dur, o) {
    o = o || {};
    var kind = o.mute ? 'fmute' : 'fuzz', notes = [root, root + 7, root + 12], i;
    for (i = 0; i < notes.length; i++) gtr(t + i * 0.004, notes[i], dur, { kind: kind, vel: (o.vel || 0.8) * (i === 2 ? 0.8 : 1), layer: o.layer || 'fuzz', rel: o.mute ? 0.02 : 0.05, scoop: o.scoop && i === 0, k: o.k });
  }
  // bajo eléctrico: 'walk' = redondo, de dedo (bajo caminante de los 60); 'pick' = de púa, brillante y con pegada (persecución, garaje)
  function bass(t, midi, dur, vel, kind, layer) {
    var c = S.ctx, f = hz(midi), pk = kind === 'pick', o1 = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(), og = c.createGain();
    o1.setPeriodicWave(S.n.bassWave); o1.frequency.value = f;
    o2.type = pk ? 'sawtooth' : 'sine'; o2.frequency.value = f * (pk ? 1.004 : 1); og.gain.value = pk ? 0.22 : 0.55;
    lp.type = 'lowpass'; lp.Q.value = pk ? 1.2 : 1.0;
    lp.frequency.setValueAtTime(pk ? 2300 : 1100, t); lp.frequency.setTargetAtTime(pk ? 520 : 300, t + 0.008, pk ? 0.07 : 0.11);
    g.gain.value = 0; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.005);
    g.gain.setTargetAtTime(vel * (pk ? 0.7 : 0.55), t + 0.02, pk ? 0.2 : 0.3);
    g.gain.setTargetAtTime(0, t + dur, 0.03);
    o1.connect(lp); o2.connect(og); og.connect(lp); lp.connect(g); g.connect(layerIn(layer || 'bass'));
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.25); o2.stop(t + dur + 0.25);
    reg(g.gain, t, t + dur + 0.25, 'b');
  }
  function pno(t, notes, dur, vel, k) {
    var c = S.ctx;
    for (var i = 0; i < notes.length; i++) {
      var s = c.createBufferSource(), g = c.createGain(), tt = t + i * 0.003;
      s.buffer = piano(notes[i]);
      g.gain.value = 0; g.gain.setValueAtTime(vel, tt); g.gain.setTargetAtTime(0, t + dur, 0.07);
      s.connect(g); g.connect(layerIn('piano')); s.start(tt); s.stop(t + dur + 0.45);
      reg(g.gain, tt, t + dur + 0.45, k);
    }
  }
  // saxo tenor: sierra + cuadrada desafinadas (caña), saturación suave, filtro con envolvente («ataque de lengua»), soplo, vibrato que se abre,
  // arrastre de entrada, caída al final y gruñido (AM). o: {vel, scoop, fall, growl, honk, vib, bright, layer, k, stg}
  function sax(t, midi, dur, o) {
    o = o || {};
    var c = S.ctx, f = hz(midi), vel = o.vel || 0.7, end = t + dur, stop = end + (o.fall ? o.fall + 0.3 : 0.4), br = o.bright || 1;
    var lp = c.createBiquadFilter(), sh = c.createWaveShaper(), g = c.createGain(), am = null;
    sh.curve = S.n.reedCurve; lp.type = 'lowpass'; lp.Q.value = 1.0;
    lp.frequency.setValueAtTime(Math.max(1000, Math.min(f * 2.2, 2600)), t);
    lp.frequency.linearRampToValueAtTime(Math.max(2200, Math.min(f * (o.honk ? 8 : 5.5), 5600)) * br, t + (o.honk ? 0.02 : 0.04));
    lp.frequency.setTargetAtTime(Math.max(1400, Math.min(f * 3.4, 3400)) * br, t + 0.06, 0.12);
    var att = o.honk ? 0.012 : 0.028;
    g.gain.value = 0; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * (o.honk ? 1.15 : 1), t + att); g.gain.setTargetAtTime(vel * 0.82, t + att, 0.09);
    if (o.fall) g.gain.setTargetAtTime(0, end + o.fall * 0.4, o.fall * 0.25); else g.gain.setTargetAtTime(0, end, 0.05);
    var oscs = [['sawtooth', 1, -4, 1], ['square', 1, 5, 0.5], ['sawtooth', 2, 2, 0.1]], mod = null, i;
    if (dur > 0.45 && !o.honk) {
      var vl = c.createOscillator(); mod = c.createGain(); vl.frequency.value = 5.3;
      mod.gain.setValueAtTime(0, t); mod.gain.setValueAtTime(0, t + 0.22); mod.gain.linearRampToValueAtTime(o.vib || 16, t + Math.min(0.9, dur * 0.9));
      vl.connect(mod); vl.start(t); vl.stop(stop);
    }
    for (i = 0; i < oscs.length; i++) {
      var os = c.createOscillator(), og = c.createGain(), d = oscs[i][2];
      os.type = oscs[i][0]; os.frequency.value = f * oscs[i][1]; og.gain.value = oscs[i][3];
      if (o.scoop) { os.detune.setValueAtTime(d - o.scoop, t); os.detune.linearRampToValueAtTime(d, t + 0.06); } else os.detune.value = d;
      if (o.fall) { os.detune.setValueAtTime(d, end); os.detune.linearRampToValueAtTime(d - 700, end + o.fall); }
      if (mod) mod.connect(os.detune);
      os.connect(og); og.connect(sh); os.start(t); os.stop(stop);
    }
    sh.connect(lp);
    if (o.growl) {                                                       // gruñido de saxo de rock and roll: modulación de amplitud rápida
      var gl = c.createOscillator(), gg = c.createGain(); am = c.createGain();
      am.gain.value = 0.78; gl.frequency.value = 31; gg.gain.value = 0.22; gl.connect(gg); gg.connect(am.gain); gl.start(t); gl.stop(stop);
      lp.connect(am); am.connect(g);
    } else lp.connect(g);
    g.connect(layerIn(o.layer || (o.stg ? 'stg' : 'sax')));
    noiseLoop(t, dur, g, Math.min(f * 2.6, 5200), 1.2, vel * 0.09);
    reg(g.gain, t, stop, o.k);
  }
  // órgano: 'farfisa' (cuadradas de caña a 8', 4' y 16', vibrato) o 'salon' (barras de órgano de salón, sinusoidales, ataque lento)
  function organ(t, notes, dur, o) {
    o = o || {};
    var c = S.ctx, type = o.type || 'farfisa', vel = (o.vel || 0.7) / Math.sqrt(notes.length), sal = type === 'salon', att = sal ? 0.08 : 0.007, rel = sal ? 0.4 : 0.05;
    var g = c.createGain(), stop = t + dur + rel + 0.15, i, j;
    g.gain.value = 0; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + att); g.gain.setTargetAtTime(0, t + dur, rel / 3);
    var parts = sal ? [['sine', 1, 1], ['sine', 2, 0.5], ['sine', 3, 0.3], ['sine', 4, 0.18]] : [['wave', 1, 1], ['wave', 2, 0.42], ['sine', 0.5, 0.3]];
    for (i = 0; i < notes.length; i++) {
      for (j = 0; j < parts.length; j++) {
        var os = c.createOscillator(), og = c.createGain();
        if (parts[j][0] === 'wave') os.setPeriodicWave(S.n.orgWave); else os.type = parts[j][0];
        os.frequency.value = hz(notes[i]) * parts[j][1]; og.gain.value = parts[j][2];
        if (!sal) {
          S.n.ovibG.connect(os.detune);
          os.onended = (function (os) { return function () { try { if (S) S.n.ovibG.disconnect(os.detune); } catch (e) { /* nada */ } }; })(os);
        }
        os.connect(og); og.connect(g); os.start(t); os.stop(stop);
      }
    }
    g.connect(layerIn(o.layer || (sal ? 'salon' : 'organ')));
    reg(g.gain, t, stop, o.k);
  }
  // coro de vocales («uuh-uh»): voces de sierra con vibrato -> banco de formantes compartido
  var VOW = { a: [730, 1090, 2440], o: [520, 860, 2550], e: [470, 1750, 2500], u: [330, 780, 2400] };
  function coro(t, notes, dur, vowel, vel, k) {
    var c = S.ctx, v = VOW[vowel] || VOW.u, i;
    for (i = 0; i < 3; i++) S.n.form[i].frequency.setTargetAtTime(v[i], t, 0.03);
    var g = c.createGain();
    g.gain.value = 0; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.07); g.gain.setTargetAtTime(0, t + dur, 0.09);
    g.connect(S.n.coroIn);
    for (i = 0; i < notes.length; i++) {
      for (var j = 0; j < 2; j++) {
        var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(notes[i]);
        var d0 = j ? 9 : -8; o.detune.setValueAtTime(d0 - 30, t); o.detune.linearRampToValueAtTime(d0, t + 0.08);
        S.n.cvibG.connect(o.detune);
        o.onended = (function (o) { return function () { try { if (S) S.n.cvibG.disconnect(o.detune); } catch (e) { /* nada */ } }; })(o);
        o.connect(g); o.start(t); o.stop(t + dur + 0.5);
      }
    }
    reg(g.gain, t, t + dur + 0.5, k);
  }

  // ---------------------------------------------------------------------------------------------------------
  // cola de eventos (se crean nodos justo dentro del horizonte)
  function ev(t, kind, fn) { S.queue.push({ t: t, k: kind, fn: fn }); }
  function sortQ() { S.queue.sort(function (a, b) { return a.t - b.t; }); }
  // contexto de una barra: c.at(tiempoEnNegras) -> segundos. Con swing, la corchea de contratiempo (x.5) cae en x + sw (tresillo 0,667).
  function barCtx(t0, bd, sw) {
    var u = bd / 4;
    return { t0: t0, bd: bd, u: u, sw: sw, at: function (beat) {
      var f = beat - Math.floor(beat);
      if (sw && Math.abs(f - 0.5) < 1e-6) beat = Math.floor(beat) + sw;
      return t0 + beat * u;
    } };
  }
  function hit(c, beat, name, vel, layer, rate) {
    var t = c.at(beat) + (rnd() - 0.5) * 0.006;
    ev(t, 'perc', function (tt) { var bf = S.buf[name] || lazy(name); if (bf) play(tt, bf, layer || 'drums', hum(vel, 0.08), rate); });
  }
  function segs(def) {                // un símbolo = todo el compás; dos = medio compás cada uno
    if (typeof def === 'string') return [{ ch: chord(def), s: 0, e: 4 }];
    var w = 4 / def.length;
    return def.map(function (s, i) { return { ch: chord(s), s: i * w, e: (i + 1) * w }; });
  }
  function firstSym(def) { return typeof def === 'string' ? def : def[0]; }
  function chordAtBeat(sg, beat) { for (var i = sg.length - 1; i >= 0; i--) if (beat >= sg[i].s - 1e-6) return sg[i].ch; return sg[0].ch; }
  // línea melódica: fn(t, midi, dur, nota, acento) se llama por cada nota (y cada nota de una doble cuerda)
  function line(c, notes, kind, fn) {
    notes.forEach(function (x) {
      var d = x.d * c.u * (x.f.indexOf('.') >= 0 ? 0.5 : 0.96), acc = x.f.indexOf('!') >= 0;
      ev(c.at(x.s) + (rnd() - 0.5) * 0.008, kind, function (t) { for (var k = 0; k < x.n.length; k++) fn(t + k * 0.003, x.n[k], d, x, acc); });
    });
  }
  function fitBass(m) { while (m > 48) m -= 12; while (m < 36) m += 12; return m; }
  // bajo caminante en negras (raíz, tercera, quinta, aproximación cromática a la raíz que viene)
  function walkNotes(sg, nxt, alt) {
    var out = [], s;
    for (s = 0; s < sg.length; s++) {
      var ch = sg[s].ch, nb = sg[s].e - sg[s].s, r = fitBass(rootIn(ch, 38)), last = s === sg.length - 1, st = sg[s].s;
      var third = r + (isMinor(ch) ? 3 : 4), fifth = r + 7, tgt = last ? nxt : sg[s + 1].ch, nr = fitBass(rootIn(tgt, 38)), ap = nr > fifth ? nr - 1 : nr + 1;
      if (nb >= 4) { out.push([st, r], [st + 1, alt ? fifth : third], [st + 2, alt ? (isMinor(ch) ? r + 10 : r + 9) : fifth], [st + 3, ap]); }
      else { out.push([st, r], [st + 1, last ? ap : fifth]); }
    }
    return out;
  }
  var SCALE_A = [9, 11, 1, 2, 4, 6, 8];                          // La mayor (para glissandos del piano)
  function scaleUp(lo, n, pcs) { var out = [], m = lo; while (out.length < n) { if (pcs.indexOf(((m % 12) + 12) % 12) >= 0) out.push(m); m++; } return out; }


  // ---------------------------------------------------------------------------------------------------------
  // instrumentos nuevos de Costa Verde
  // picado trémolo (surf): la nota se re-pica a ~19 golpes/s; cada golpe es una cuerda corta (KS «trem») y el último se deja sonar
  function tremPick(t, midi, dur, o) {
    o = o || {};
    var step = o.step || 0.053, n = Math.max(1, Math.floor(dur / step)), i, vel = o.vel || 0.7;
    for (i = 0; i < n; i++) {
      gtr(t + i * step, midi, i === n - 1 ? Math.max(step, dur - i * step) : step * 1.15,
        { kind: 'trem', vel: vel * (i % 2 ? 0.7 : 0.92) * (i === 0 ? 1.12 : 1), layer: o.layer || 'lead', rel: 0.02, k: o.k });
    }
  }
  // piano eléctrico (tipo Rhodes): FM de dos senos con índice que decae, un parcial de «diente» agudo y trémolo en la capa
  function rhodes(t, notes, dur, vel, k) {
    var c = S.ctx, i, v = vel / Math.sqrt(notes.length), stop = t + dur + 0.6;
    for (i = 0; i < notes.length; i++) {
      var f = hz(notes[i]), tt = t + i * 0.004, car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
      var tine = c.createOscillator(), tg = c.createGain();
      car.frequency.value = f; mod.frequency.value = f;
      mg.gain.setValueAtTime(f * 1.9, tt); mg.gain.setTargetAtTime(f * 0.18, tt + 0.004, 0.22);
      mod.connect(mg); mg.connect(car.frequency);
      tine.frequency.value = f * 5.02; tg.gain.setValueAtTime(0.1, tt); tg.gain.setTargetAtTime(0, tt + 0.004, 0.05); tine.connect(tg); tg.connect(g);
      g.gain.value = 0; g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(v, tt + 0.004); g.gain.setTargetAtTime(v * 0.55, tt + 0.01, 0.5); g.gain.setTargetAtTime(0, t + dur, 0.14);
      car.connect(g); g.connect(layerIn('epiano'));
      car.start(tt); mod.start(tt); tine.start(tt); car.stop(stop); mod.stop(stop); tine.stop(stop);
      reg(g.gain, tt, stop, k);
    }
  }
  // cuerdas sintéticas (pad): dos sierras desafinadas por nota, ataque lento
  function strings(t, notes, dur, vel, o) {
    o = o || {};
    var c = S.ctx, att = o.att || 0.35, rel = o.rel || 0.4, g = c.createGain(), stop = t + dur + rel * 1.6 + 0.1, i, j;
    g.gain.value = 0; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel / Math.sqrt(notes.length), t + att); g.gain.setTargetAtTime(0, t + dur, rel / 3);
    for (i = 0; i < notes.length; i++) for (j = 0; j < 2; j++) {
      var os = c.createOscillator(); os.type = 'sawtooth'; os.frequency.value = hz(notes[i]); os.detune.value = j ? 7 : -7; os.connect(g); os.start(t); os.stop(stop);
    }
    g.connect(layerIn(o.layer || 'strings'));
    reg(g.gain, t, stop, o.k);
  }

  // =========================================================================================================
  // EXPLORE · «Brisa del Malecón» · 126 bpm recto, Mi menor armónico → Mi mayor · 16 compases (A 8 en menor + puente 8 en mayor)
  //   surf rock miraflorino: melodía con picado trémolo y eco de resorte, bajo a corcheas, charles y toms de surf, rasgueos a contratiempo, oleaje de fondo.
  //   forma: Em | Em | C | B7 | Em | Em | Am | B7  ·  E | E | C#m | A | E | B | A | B7
  var MAL_CH = ['Em', 'Em', 'C', 'B7', 'Em', 'Em', 'Am', 'B7', 'E', 'E', 'C#m', 'A', 'E', 'B', 'A', 'B7'];
  var MAL_MEL = [
    '0:B4:0.5 0.5:E5:0.5 1:G5:1z 2:F#5:0.5 2.5:E5:0.5 3:D#5:1',
    '0:E5:1.5z 1.5:G5:0.5 2:B5:1.5z 3.5:A5:0.5',
    '0:G5:1z 1:E5:1 2:C5:0.5 2.5:E5:0.5 3:G5:1',
    '0:F#5:1z 1:D#5:0.5 1.5:F#5:0.5 2:B5:1.5z 3.5:A5:0.5',
    '0:B4:0.5 0.5:E5:0.5 1:G5:1z 2:B5:1 3:G5:1',
    '0:F#5:0.5 0.5:G5:0.5 1:A5:1 2:B5:2z',
    '0:A5:1z 1:G5:0.5 1.5:E5:0.5 2:C5:1 3:E5:1',
    '0:D#5:0.5 0.5:F#5:0.5 1:A5:1 2:G5:0.5 2.5:F#5:0.5 3:D#5:1',
    '0:G#5:1z 1:B5:1 2:C#6:1.5z 3.5:B5:0.5',
    '0:B5:0.5 0.5:G#5:0.5 1:E5:1 2:G#5:0.5 2.5:B5:0.5 3:E6:1',
    '0:C#6:1z 1:B5:0.5 1.5:G#5:0.5 2:E5:2z',
    '0:E5:0.5 0.5:A5:0.5 1:C#6:1z 2:B5:0.5 2.5:A5:0.5 3:E5:1',
    '0:G#5:1z 1:E5:0.5 1.5:G#5:0.5 2:B5:1z 3:G#5:1',
    '0:F#5:1z 1:B5:1 2:D#6:1.5z 3.5:B5:0.5',
    '0:C#6:0.5 0.5:B5:0.5 1:A5:1 2:E5:1 3:A5:1',
    '0:D#6:1z 1:B5:0.5 1.5:A5:0.5 2:F#5:1 3:D#5:1'
  ].map(P);

  function malDrums(c, i, br, L, N) {
    var d = 1 - 0.3 * N, k, fill = i % 4 === 3;
    hit(c, 0, 'kickS', 0.62 * d, 'drums'); hit(c, 2.5, 'kickS', 0.5 * d, 'drums');
    if (br) hit(c, 1.5, 'kickS', 0.4 * d, 'drums');
    hit(c, 1, 'snare', 0.55 * d, 'drums'); if (!fill) hit(c, 3, 'snare', 0.55 * d, 'drums');
    for (k = 0; k < 4; k++) {
      if (br) { hit(c, k, 'ride', (k % 2 ? 0.3 : 0.42) * d, 'hats'); hit(c, k + 0.5, 'hatC', 0.24 * d, 'hats'); }
      else { hit(c, k, 'hatC', (k % 2 ? 0.4 : 0.48) * d, 'hats'); hit(c, k + 0.5, k === 3 && i % 2 ? 'hatO' : 'hatC', 0.26 * d, 'hats'); }
    }
    if (fill) { hit(c, 3, 'tomH', 0.6 * d, 'drums'); hit(c, 3.25, 'tomH', 0.5 * d, 'drums'); hit(c, 3.5, 'tomM', 0.62 * d, 'drums'); hit(c, 3.75, 'tomL', 0.72 * d, 'drums'); }
    if ((i === 0 || i === 8) && L.lead) hit(c, 0, 'crash', 0.3 * d, 'drums');
    if (L.palmas) { hit(c, 1, 'clap', 0.45, 'snaps'); hit(c, 3, 'clap', 0.45, 'snaps'); }
  }
  function malBass(c, i, ch, nx) {
    var r = fitBass(rootIn(ch, 38)), nr = fitBass(rootIn(nx, 38)), ap = nr > r ? nr - 1 : nr + 1, j;
    for (j = 0; j < 8; j++) (function (j) {
      var m = r;
      if (j === 3 || j === 7) m = r + 7;
      if (j === 7 && i % 4 === 3) m = ap;
      ev(c.at(j * 0.5) + (rnd() - 0.5) * 0.004, 'bass', function (t) { bass(t, m, 0.46 * c.u, hum(j % 2 ? 0.62 : 0.84, 0.06), 'pick'); });
    })(j);
  }
  function malRhy(c, sg) {                                   // rasgueo a contratiempo, apagado, con eco de resorte
    sg.forEach(function (x) {
      var vo = voicing(x.ch, M('G3'), 3);
      [0.5, 1.5, 2.5, 3.5].forEach(function (b2) {
        if (b2 >= x.s && b2 < x.e) ev(c.at(b2) + (rnd() - 0.5) * 0.006, 'mel', function (t) { strum(t, vo, 'chop', hum(b2 === 1.5 ? 0.5 : 0.42, 0.1), true, 'rhy'); });
      });
    });
  }
  function surfLine(c, notes, o) {                           // melodía de surf: 'z' = picado trémolo, lo demás, nota normal con el eco de resorte
    line(c, notes, 'mel', function (t, m, d, x, acc) {
      var v = hum((o.vel || 0.72) * (acc ? 1.12 : 1), 0.06);
      if (x.f.indexOf('z') >= 0 && d > 0.3) tremPick(t, m, d, { vel: v, layer: o.layer || 'lead' });
      else gtr(t, m, d, { kind: o.kind || 'twang', vel: v, vib: x.f.indexOf('v') >= 0 || x.d >= 1.5, scoop: x.f.indexOf('~') >= 0, layer: o.layer || 'lead' });
    });
  }
  function malBar(b, c, L, ent, N) {
    var i = b % 16, sg = segs(MAL_CH[i]), nxt = chord(firstSym(MAL_CH[(i + 1) % 16])), br = i >= 8;
    malDrums(c, i, br, L, N);
    malBass(c, i, sg[0].ch, nxt);
    if (L.rhy) malRhy(c, sg);
    if (L.lead) {
      surfLine(c, MAL_MEL[i], { vel: 0.72 * (1 - 0.2 * N) });
      if (i === 8) ev(c.at(0), 'mel', function (t) { gtr(t, M('E6'), 1.4, { kind: 'twang', vel: 0.4, dive: 0.5, layer: 'lead' }); });     // caída de palanca al entrar al puente
    }
    if (L.organ) line(c, MAL_MEL[i], 'mel', function (t, m, d) { organ(t, [m], d, { type: 'farfisa', vel: 0.34 }); });
    if (L.coro && i % 4 === 3) {
      var vo = voicing(chordAtBeat(sg, 2), M('G#3'), 3);
      ev(c.at(2), 'mel', function (t) { coro(t, vo, 1.15 * c.u, 'a', 0.45); });
    }
  }

  // =========================================================================================================
  // LARCOMAR · «Terraza Larcomar» · 104 bpm (hasta ~123 con la suciedad), bossa nova de centro comercial que se va ensuciando · 16 compases
  //   S.dirt 0..1 (0 = ingreso, 1 = la arena del chifa): <0,25 nailon + piano eléctrico + cuerdas + clave de rim + huevito; 0,25+ charles, bombo y guitarra de surf doblando;
  //   0,5+ el piano se va y entra la guitarra con crunch, caja de backbeat; 0,75+ fuzz en los acentos, órgano y picado trémolo; 1 = surf rock con ritmo de bossa.
  //   forma: Am7 | D9 | GM7 | CM7 | F#m7b5 | B7b9 | Em7 | Em7 A9  ·  Dm7 | G9 | CM7 | CM7 | Bm7b5 | E7b9 | Am7 | Am7 E7b9
  var LAR_CH = ['Am7', 'D9', 'GM7', 'CM7', 'F#m7b5', 'B7b9', 'Em7', ['Em7', 'A9'], 'Dm7', 'G9', 'CM7', 'CM7', 'Bm7b5', 'E7b9', 'Am7', ['Am7', 'E7b9']];
  var LAR_MEL = [
    '0:C5:1 1:E5:0.5 1.5:G5:1.5 3:E5:1',
    '0:F#5:1 1:A5:0.5 1.5:G5:0.5 2:E5:1 3:D5:1',
    '0:B4:1.5 1.5:D5:0.5 2:F#5:2v',
    '0:E5:1 1:G5:0.5 1.5:E5:0.5 2:D5:1 3:C5:1',
    '0:A4:1 1:C5:0.5 1.5:E5:1.5 3:C5:1',
    '0:D#5:1 1:F#5:0.5 1.5:A5:1.5 3:C6:1',
    '0:B5:1.5 1.5:G5:0.5 2:E5:2v',
    '0:G5:1 1:B4:1 2:E5:1 3:C#5:1',
    '0:A4:1 1:D5:0.5 1.5:F5:1.5 3:A5:1',
    '0:B5:1 1:G5:0.5 1.5:D5:0.5 2:F5:1 3:E5:1',
    '0:E5:2v 2:G5:1 3:B5:1',
    '0:C6:1.5 1.5:B5:0.5 2:G5:1 3:E5:1',
    '0:D5:1 1:F5:0.5 1.5:A5:1.5 3:F5:1',
    '0:G#5:1 1:B5:0.5 1.5:D6:1.5 3:F5:1',
    '0:C6:1 1:B5:0.5 1.5:A5:0.5 2:E5:2v',
    '0:E5:1 1:A5:1 2:G#5:1 3:B5:1'
  ].map(P);
  function clampD(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function larBar(b, c, L, ent, N) {
    var i = b % 16, sg = segs(LAR_CH[i]), D = S.dirt, nxt = chord(firstSym(LAR_CH[(i + 1) % 16])), k, odd = i % 2 === 1, fill = i % 4 === 3;
    // percusión: clave de bossa 3-2 con rim, huevito (shaker), bombo suave; con la suciedad entran charles, bombo, caja y toms
    (odd ? [1, 2] : [0, 1.5, 3]).forEach(function (b2) { hit(c, b2, 'rim', 0.42 + 0.1 * D, 'drums'); });
    for (k = 0; k < 8; k++) hit(c, k * 0.5, k % 2 ? 'shaker' : 'shakerL', (k % 2 ? 0.3 : 0.42) * (0.7 + 0.5 * D), 'hats');
    hit(c, 0, 'kickS', 0.36 + 0.3 * D, 'drums'); hit(c, 2, 'kickS', 0.3 + 0.3 * D, 'drums');
    if (D >= 0.25) for (k = 0; k < 4; k++) hit(c, k + 0.5, 'hatC', 0.16 + 0.28 * D, 'hats');
    if (D >= 0.5) { hit(c, 1.5, 'kick', 0.5 * D, 'drums'); hit(c, 3.5, 'kick', 0.45 * D, 'drums'); hit(c, 1, 'snare', 0.28 + 0.5 * (D - 0.5), 'drums'); if (!fill) hit(c, 3, 'snare', 0.28 + 0.5 * (D - 0.5), 'drums'); }
    if (D >= 0.5 && fill) { hit(c, 3, 'tomH', 0.5, 'drums'); hit(c, 3.25, 'tomM', 0.55, 'drums'); hit(c, 3.5, 'tomM', 0.6, 'drums'); hit(c, 3.75, 'tomL', 0.7, 'drums'); }
    if (D >= 0.7 && i % 8 === 0) hit(c, 0, 'crash', 0.3 * D, 'drums');
    // bajo de bossa: raíz, quinta a contratiempo
    sg.forEach(function (x) {
      var r = fitBass(rootIn(x.ch, 38)), pat = (x.e - x.s) >= 4 ? [[0, r, 1.3], [1.5, r + 7, 0.5], [2, r, 1.3], [3.5, r + 7, 0.5]] : [[0, r, 1.3], [1.5, r + 7, 0.5]];
      pat.forEach(function (p) {
        ev(c.at(x.s + p[0]) + (rnd() - 0.5) * 0.006, 'bass', function (t) { bass(t, p[1], p[2] * c.u * 0.9, hum(0.7 + 0.2 * D, 0.06), D < 0.5 ? 'walk' : 'pick'); });
      });
    });
    // armonía: huecos del ritmo de bossa
    var hits = odd ? [0, 2, 3.5] : [0, 1.5, 3];
    hits.forEach(function (b2) {
      var ch = chordAtBeat(sg, b2), vo = voicing(ch, M('C4'), 4), g3 = voicing(ch, M('E3'), 4);
      if (D < 0.55) ev(c.at(b2) + (rnd() - 0.5) * 0.008, 'mel', function (t) { rhodes(t, vo, 0.9 * c.u, hum(0.5 * (1 - 0.5 * D), 0.1)); });
      if (D < 0.5) ev(c.at(b2) + (rnd() - 0.5) * 0.008, 'mel', function (t) { strum(t, g3, 'nylon', hum(0.5, 0.1), false, 'nylon', 0.8 * c.u); });
      if (D >= 0.45) ev(c.at(b2) + (rnd() - 0.5) * 0.006, 'mel', function (t) { strum(t, voicing(ch, M('G3'), 3), b2 === 0 ? 'open' : 'chop', hum(0.45 + 0.4 * D, 0.08), false, 'crunch', b2 === 0 ? 0.8 * c.u : 0); });
      if (D >= 0.75 && (b2 === 0 || b2 === 1.5 || b2 === 3.5)) ev(c.at(b2), 'mel', function (t) { pwr(t, rootIn(ch, 36), 0.3 * c.u, { mute: true, vel: 0.5 + 0.35 * (D - 0.75) * 4 }); });
    });
    // cuerdas de salón que se van con la suciedad
    if (D < 0.7) sg.forEach(function (x) {
      var vo = voicing(x.ch, M('E4'), 3);
      ev(c.at(x.s), 'mel', function (t) { strings(t, vo, (x.e - x.s) * c.u * 0.98, 0.34 * (1 - D), { att: 0.5, rel: 0.6 }); });
    });
    // melodía: nailon limpio → guitarra de surf con picado trémolo → órgano
    var nv = 0.82 * (1 - 0.55 * D), tv = 0.72 * clampD((D - 0.2) / 0.6);
    surfLine(c, LAR_MEL[i], { kind: 'nylon', layer: 'nylon', vel: nv });
    if (D >= 0.2) surfLine(c, LAR_MEL[i], { kind: 'twang', layer: 'lead', vel: tv });
    if (D >= 0.75) line(c, LAR_MEL[i], 'mel', function (t, m, d) { organ(t, [m], d, { type: 'farfisa', vel: 0.38 }); });
    if (D >= 0.9 && i % 4 === 3) ev(c.at(2), 'mel', function (t) { coro(t, voicing(chordAtBeat(sg, 2), M('G3'), 3), 1.4 * c.u, 'a', 0.4); });
  }

  // =========================================================================================================
  // CHASE · «Corre, que viene la ola» · 168 bpm, La menor (armónica) → Do · 16 compases · surf galopante: picado trémolo, bajo a corcheas, caja en 2 y 4, órgano y grito
  //   forma: Am | Am | F | E7 | Am | Am | Dm | E7  ·  C | G | Am | E7 | C | G | F | E7
  var SCH_CH = ['Am', 'Am', 'F', 'E7', 'Am', 'Am', 'Dm', 'E7', 'C', 'G', 'Am', 'E7', 'C', 'G', 'F', 'E7'];
  var SCH_MEL = [
    '0:A4:0.25 0.25:C5:0.25 0.5:E5:0.25 0.75:A5:0.25 1:E5:0.5 1.5:C5:0.5 2:A4:1z 3:B4:0.5 3.5:C5:0.5',
    '0:E5:0.25 0.25:A5:0.25 0.5:C6:0.25 0.75:A5:0.25 1:E5:1 2:E5:1z 3:A5:1',
    '0:F5:0.5 0.5:A5:0.5 1:C6:1z 2:A5:0.5 2.5:F5:0.5 3:C5:1',
    '0:E5:0.25 0.25:G#5:0.25 0.5:B5:0.25 0.75:D6:0.25 1:B5:0.5 1.5:G#5:0.5 2:E5:2z',
    '0:A4:0.25 0.25:C5:0.25 0.5:E5:0.25 0.75:A5:0.25 1:C6:1z 2:B5:0.5 2.5:A5:0.5 3:E5:1',
    '0:A5:0.5 0.5:E5:0.5 1:C6:0.5 1.5:A5:0.5 2:E6:2z',
    '0:D5:0.5 0.5:F5:0.5 1:A5:1z 2:D6:1 3:A5:0.5 3.5:F5:0.5',
    '0:G#5:0.5 0.5:B5:0.5 1:D6:1z 2:B5:0.5 2.5:G#5:0.5 3:E5:1',
    '0:E5:0.5 0.5:G5:0.5 1:C6:1z 2:G5:0.5 2.5:E5:0.5 3:G5:1',
    '0:D5:0.5 0.5:G5:0.5 1:B5:1z 2:G5:0.5 2.5:D5:0.5 3:B4:1',
    '0:C5:0.5 0.5:E5:0.5 1:A5:1z 2:E5:0.5 2.5:C5:0.5 3:A4:1',
    '0:B4:0.5 0.5:G#5:0.5 1:B5:1z 2:D6:1 3:B5:1',
    '0:C6:1z 1:G5:0.5 1.5:E5:0.5 2:G5:0.5 2.5:C6:0.5 3:E6:1',
    '0:D6:1z 1:B5:0.5 1.5:G5:0.5 2:D5:0.5 2.5:G5:0.5 3:B5:1',
    '0:A5:0.5 0.5:C6:0.5 1:F6:1z 2:C6:0.5 2.5:A5:0.5 3:F5:1',
    '0:E5:0.25 0.25:G#5:0.25 0.5:B5:0.25 0.75:D6:0.25 1:E6:1z 2:B5:2'
  ].map(P);
  function chaseDrumsS(c, i, br, L, ent) {
    var k, fill = i % 4 === 3, big = i === 15;
    (fill ? [0, 2] : [0, 1.5, 2, 3.5]).forEach(function (b2) { hit(c, b2, 'kick', b2 === 0 ? 1 : 0.8, 'drums'); });
    for (k = 0; k < 4; k++) { hit(c, k, 'hatC', 0.8, 'hats'); hit(c, k + 0.5, k === 3 && !fill ? 'hatO' : 'hatC', 0.55, 'hats'); }
    hit(c, 1, 'snare', 0.95, 'drums'); if (!fill) hit(c, 3, 'snare', 0.95, 'drums');
    if (fill) {
      if (big) { for (k = 0; k < 8; k++) hit(c, 2 + k * 0.25, k < 6 ? 'snare' : (k === 6 ? 'tomM' : 'tomL'), 0.5 + 0.06 * k, 'drums'); }
      else { hit(c, 3, 'tomH', 0.8, 'drums'); hit(c, 3.25, 'tomH', 0.7, 'drums'); hit(c, 3.5, 'tomM', 0.8, 'drums'); hit(c, 3.75, 'tomL', 0.9, 'drums'); }
    }
    if (i % 4 === 0 && (ent || L.lead)) hit(c, 0, 'crash', 0.5, 'drums');
    if (L.palmas) { hit(c, 1, 'clap', 0.5, 'snaps'); hit(c, 3, 'clap', 0.5, 'snaps'); }
  }
  function chaseBarS(b, c, L, ent, N) {
    var i = b % 16, ch = chord(SCH_CH[i]), nx = chord(SCH_CH[(i + 1) % 16]), br = i >= 8, j;
    chaseDrumsS(c, i, br, L, ent);
    var r = fitBass(rootIn(ch, 38)), nr = fitBass(rootIn(nx, 38)), ap = nr > r ? nr - 1 : nr + 1;
    for (j = 0; j < 8; j++) (function (j) {
      var m = (j === 2 || j === 6) ? r + 12 : r;
      if (j === 7 && i % 4 === 3) m = ap;
      ev(c.at(j * 0.5) + (rnd() - 0.5) * 0.004, 'bass', function (t) { bass(t, m, 0.42 * c.u, hum(j % 2 ? 0.7 : 0.92, 0.06), 'pick'); });
    })(j);
    var rg = rootIn(ch, M('A2'));                                              // riff de dobles cuerdas a corcheas, palm mute con el acento abierto
    for (j = 0; j < 8; j++) (function (j) {
      ev(c.at(j * 0.5) + (rnd() - 0.5) * 0.005, 'mel', function (t) {
        if (j % 4 === 0) strum(t, [rg, rg + 7], 'open', hum(0.85, 0.06), false, 'crunch', 0.42 * c.u);
        else strum(t, [rg, rg + 7], 'chop', hum(0.58, 0.08), false, 'crunch');
      });
    })(j);
    if (L.lead) surfLine(c, SCH_MEL[i], { vel: 0.74 });
    if (L.organ) {
      var vo = voicing(ch, M('C4'), 3);
      [0, 1.5, 3].forEach(function (b2) { ev(c.at(b2), 'mel', function (t) { organ(t, vo, 0.4 * c.u, { type: 'farfisa', vel: 0.5 }); }); });
    }
    if (L.coro && i % 4 === 0) { var vc = voicing(ch, M('A3'), 3); [0, 1.5].forEach(function (b2) { ev(c.at(b2), 'mel', function (t) { coro(t, vc, 0.3 * c.u, 'e', 0.9); }); }); }
  }

  // =========================================================================================================
  // HORDE · «Ola de muertos» · 150 bpm, Mi menor, garaje con surf: fuzz con palm mutes, picado trémolo, órgano, pandereta, toms, grito «¡hey!» · 8 compases
  //   forma: Em | Em | C | B7 | Em | Em | Am | B7
  var SHD_CH = ['Em', 'Em', 'C', 'B7', 'Em', 'Em', 'Am', 'B7'];
  var SHD_MEL = [
    '0:E5:0.25 0.25:G5:0.25 0.5:B5:0.25 0.75:G5:0.25 1:E5:0.5 1.5:B4:0.5 2:E5:1z 3:D#5:1',
    '0:E5:0.25 0.25:G5:0.25 0.5:B5:0.25 0.75:G5:0.25 1:E6:1.5z 2.5:B5:0.5 3:G5:1',
    '0:C6:0.5 0.5:G5:0.5 1:E5:1 2:G5:0.5 2.5:C6:0.5 3:E6:1z',
    '0:D#6:1z 1:B5:0.5 1.5:F#5:0.5 2:D#5:0.5 2.5:F#5:0.5 3:A5:1',
    '0:E5:0.25 0.25:G5:0.25 0.5:B5:0.25 0.75:G5:0.25 1:E5:0.5 1.5:B4:0.5 2:E5:1z 3:D#5:1',
    '0:B5:0.5 0.5:G5:0.5 1:E5:0.5 1.5:G5:0.5 2:B5:2z',
    '0:A5:0.5 0.5:E5:0.5 1:C6:1z 2:A5:1 3:E5:1',
    '0:F#5:0.25 0.25:A5:0.25 0.5:B5:0.25 0.75:D#6:0.25 1:F#6:2z 3:D#6:1!'
  ].map(P);
  var SHD_PAT = ['AmmAAmmA', 'AmmtAmmu', 'AmAmAmAm', 'AmmAmmAm', 'AmmAAmmA', 'AmmtAmmv', 'AmAmAmAm', 'AAmAAmAA'];   // A = abierto, m = palm mute, t/u/v = nota de paso (+3, +5, +7)
  function hordeDrumsS(c, i, L, ent) {
    var k, fill = i % 4 === 3;
    [0, 1.5, 2, 3.5].forEach(function (b2) { hit(c, b2, 'kick', b2 === 0 ? 1 : 0.8, 'drums'); });
    for (k = 0; k < 4; k++) { hit(c, k, 'hatC', 0.5, 'hats'); hit(c, k + 0.5, (k === 1 || k === 3) ? 'hatO' : 'hatC', 0.38, 'hats'); }
    hit(c, 1, 'snare', 1, 'drums');
    if (!fill) hit(c, 3, 'snare', 1, 'drums');
    else { hit(c, 3, 'tomH', 0.8, 'drums'); hit(c, 3.25, 'tomH', 0.7, 'drums'); hit(c, 3.5, 'tomM', 0.8, 'drums'); hit(c, 3.75, 'tomL', 0.9, 'drums'); }
    for (k = 0; k < 8; k++) hit(c, k * 0.5, k % 4 === 2 ? 'tambH' : 'tamb', k % 4 === 2 ? 0.75 : 0.45, 'hats');
    if (i === 7) for (k = 0; k < 8; k++) hit(c, k * 0.5 + 0.25, 'tamb', 0.3, 'hats');
    if (i % 4 === 0 && (ent || i === 0)) hit(c, 0, 'crash', 0.5, 'drums');
  }
  function hordeBarS(b, c, L, ent, N) {
    var i = b % 8, ch = chord(SHD_CH[i]), nx = chord(SHD_CH[(i + 1) % 8]), j;
    hordeDrumsS(c, i, L, ent);
    var r = fitBass(rootIn(ch, 38)), nr = fitBass(rootIn(nx, 38)), ap = nr > r ? nr - 1 : nr + 1;
    for (j = 0; j < 8; j++) (function (j) {
      var m = j === 3 || j === 7 ? r + 12 : r;
      if (j === 7 && i % 2 === 1) m = ap;
      ev(c.at(j * 0.5) + (rnd() - 0.5) * 0.004, 'bass', function (t) { bass(t, m, 0.4 * c.u, hum(j % 2 ? 0.72 : 0.95, 0.06), 'pick'); });
    })(j);
    var rt = rootIn(ch, 36), pat = SHD_PAT[i];
    for (j = 0; j < 8; j++) (function (j) {
      var f = pat.charAt(j), m = rt + (f === 't' ? 3 : f === 'u' ? 5 : f === 'v' ? 7 : 0), mute = f === 'm';
      ev(c.at(j * 0.5) + (rnd() - 0.5) * 0.004, 'mel', function (t) { pwr(t, m, mute ? 0.2 * c.u : 0.46 * c.u, { mute: mute, vel: hum(0.8 * (mute ? 0.78 : 1), 0.06) }); });
    })(j);
    surfLine(c, SHD_MEL[i], { vel: 0.66 });
    line(c, SHD_MEL[i], 'mel', function (t, m, d, x, acc) { organ(t, [m], d, { type: 'farfisa', vel: acc ? 0.6 : 0.46 }); });
    if (i === 3 || i === 7) { var vo = voicing(ch, M('A3'), 3); ev(c.at(3.5), 'mel', function (t) { coro(t, vo, 0.28 * c.u, 'e', 0.7); }); }
  }

  // =========================================================================================================
  // CHEF · «Mesa cuatro» (cv.chef, también setBoss(true) con ánimo horde) · 144 bpm, Mi menor pentatónica (E G A B D) · 8 compases
  //   riff de guitarra al fuzz (mayúscula = acorde abierto, minúscula = palm mute, . = silencio; e g a b d = Mi Sol La Si Re), bajo de púa, bombo de marcha, CAJA = el wok (agudo y grave en 2 y 4),
  //   el cucharón repica a corcheas (a semicorcheas en la fase 3), GONG cada 4 compases y en el 1.º. Melodía pentatónica de guitarra con vibrato; de la fase 2 en adelante la dobla un pluck una octava arriba.
  //   Intensidad: 0 = riff + percusión + gong + melodía  ·  0,5 = + pluck y órgano  ·  0,75 = cucharón doble y platillo en cada compás (el chef cansado o furioso).
  var CHF_CH = ['Em', 'Em', 'Am', 'G', 'Em', 'Em', 'Am', 'B7'];
  var CHF_RIFF = ['E.eeG.ea', 'E.eeG.gb', 'A.aaB.ag', 'G.ggA.ge', 'E.eeG.ea', 'E.eeG.gb', 'A.aaA.bd', 'b.bbD.bb'];
  var CHF_OFF = { e: 0, g: 3, a: 5, b: 7, d: 10 };
  var CHF_MEL = [
    '0:B4:0.5 0.5:B4:0.5 1:D5:1 2:B4:0.5 2.5:A4:0.5 3:G4:1',
    '0:A4:1 1:G4:0.5 1.5:E4:0.5 2:G4:2v',
    '0:E5:0.5 0.5:E5:0.5 1:G5:1 2:E5:0.5 2.5:D5:0.5 3:B4:1',
    '0:D5:1 1:B4:0.5 1.5:A4:0.5 2:B4:2v',
    '0:B4:0.5 0.5:D5:0.5 1:E5:1 2:G5:1.5! 3.5:E5:0.5',
    '0:D5:1 1:B4:1 2:A4:2v',
    '0:A4:0.5 0.5:B4:0.5 1:D5:1 2:E5:0.5 2.5:G5:0.5 3:A5:1!',
    '0:G5:1 1:E5:0.5 1.5:D5:0.5 2:B4:2!'
  ].map(P);
  function chfBar(b, c, L, ent, N) {
    var i = b % 8, ch = chord(CHF_CH[i]), pat = CHF_RIFF[i], j, k, fill = i % 4 === 3;
    // percusión: bombo de marcha, caja = wok (agudo en 2, grave en 4), cucharón a corcheas, gong
    [0, 1.5, 2].concat(i % 2 ? [3.5] : []).forEach(function (b2) { hit(c, b2, 'kick', b2 === 0 ? 1 : 0.8, 'drums'); });
    hit(c, 1, 'wokH', 0.85, 'perc'); hit(c, 1, 'snare', 0.45, 'drums');
    if (!fill) { hit(c, 3, 'wokL', 0.9, 'perc'); hit(c, 3, 'snare', 0.45, 'drums'); }
    for (k = 0; k < 8; k++) hit(c, k * 0.5, 'ladle', (k % 2 ? 0.26 : 0.42) * (k === 0 ? 1.2 : 1), 'perc');
    if (L.fast) { for (k = 0; k < 8; k++) hit(c, k * 0.5 + 0.25, 'ladle', 0.2, 'perc'); }
    if (fill) {
      hit(c, 3, 'tomH', 0.8, 'drums'); hit(c, 3.25, 'tomM', 0.75, 'drums'); hit(c, 3.5, 'tomM', 0.8, 'drums'); hit(c, 3.75, 'tomL', 0.9, 'drums');
      if (i === 7) for (k = 0; k < 4; k++) hit(c, 2 + k * 0.25, k % 2 ? 'wokH' : 'wokL', 0.4 + 0.12 * k, 'perc');          // redoble de wok antes de volver al principio
    }
    if (i % 4 === 0) { hit(c, 0, 'gong', i === 0 ? 0.95 : 0.7, 'perc'); hit(c, 0, 'crash', 0.45, 'drums'); }
    else if (L.fast) hit(c, 0, 'crash', 0.3, 'drums');
    // guitarra al fuzz y bajo siguen el riff
    for (j = 0; j < 8; j++) (function (j) {
      var f = pat.charAt(j), o = CHF_OFF[f.toLowerCase()];
      if (o === undefined) return;
      var open = f === f.toUpperCase();
      ev(c.at(j * 0.5) + (rnd() - 0.5) * 0.004, 'mel', function (t) { pwr(t, 40 + o, open ? 0.46 * c.u : 0.2 * c.u, { mute: !open, vel: hum(open ? 0.85 : 0.66, 0.06) }); });
      ev(c.at(j * 0.5) + (rnd() - 0.5) * 0.004, 'bass', function (t) { bass(t, fitBass(40 + o), 0.4 * c.u, hum(open ? 0.95 : 0.78, 0.06), 'pick'); });
    })(j);
    // melodía pentatónica; de la fase 2, doblada por un pluck una octava arriba
    if (L.lead) line(c, CHF_MEL[i], 'mel', function (t, m, d, x, acc) {
      gtr(t, m + 12, d, { kind: 'twang', vel: hum(0.72 * (acc ? 1.15 : 1), 0.06), vib: x.f.indexOf('v') >= 0 || x.d >= 1.5, layer: 'lead' });
      if (L.pluck) gtr(t + 0.012, m + 24, Math.min(d, 0.6), { kind: 'twang', vel: 0.34, layer: 'pluck', rel: 0.1 });
    });
    if (L.organ) {
      var vo = voicing(ch, M('E4'), 2);
      [0, 2].forEach(function (b2) { ev(c.at(b2), 'mel', function (t) { organ(t, vo, 1.8 * c.u, { type: 'farfisa', vel: 0.42 }); }); });
    }
  }

  // =========================================================================================================
  // CAÍDA · «Caída libre» (cv.caida) · 176 bpm, Mi dominante frigia (E F G# A B C D#) → Mi mayor épico · 16 compases · surf épico y rápido
  //   picado trémolo sobre la escala de la «ola», bajo a corcheas, riff de dobles cuerdas, caja en 2 y 4 con semicorcheas, cuerdas y órgano que suben con la intensidad, vuelo de viento de fondo.
  //   forma: E | F | E | F | Am | B | E | B7  ·  A | B | C#m | B | A | B | E | E
  var CAI_CH = ['E', 'F', 'E', 'F', 'Am', 'B', 'E', 'B7', 'A', 'B', 'C#m', 'B', 'A', 'B', 'E', 'E'];
  var CAI_MEL = [
    '0:E5:0.25 0.25:F5:0.25 0.5:G#5:0.25 0.75:F5:0.25 1:E5:0.5 1.5:G#5:0.5 2:B5:1z 3:A5:0.5 3.5:G#5:0.5',
    '0:F5:0.25 0.25:G#5:0.25 0.5:A5:0.25 0.75:G#5:0.25 1:F5:0.5 1.5:A5:0.5 2:C6:1z 3:B5:0.5 3.5:A5:0.5',
    '0:G#5:0.5 0.5:B5:0.5 1:E6:1z 2:D#6:0.5 2.5:B5:0.5 3:G#5:1',
    '0:A5:0.5 0.5:C6:0.5 1:F6:1z 2:E6:0.5 2.5:C6:0.5 3:A5:1',
    '0:A5:0.5 0.5:C6:0.5 1:E6:1.5z 2.5:C6:0.5 3:A5:1',
    '0:B5:0.5 0.5:D#6:0.5 1:F#6:1.5z 2.5:D#6:0.5 3:B5:1',
    '0:E6:1z 1:B5:0.5 1.5:G#5:0.5 2:E5:0.5 2.5:F5:0.5 3:G#5:1',
    '0:B5:0.5 0.5:D#6:0.5 1:A5:0.5 1.5:F#5:0.5 2:D#5:2z',
    '0:E6:2z 2:C#6:1 3:E6:1',
    '0:D#6:2z 2:F#6:1 3:D#6:1',
    '0:E6:1.5z 1.5:C#6:0.5 2:G#5:1 3:C#6:1',
    '0:D#6:1.5z 1.5:B5:0.5 2:F#5:1 3:B5:1',
    '0:A5:0.5 0.5:C#6:0.5 1:E6:1z 2:A6:1z 3:E6:1',
    '0:F#6:1z 1:D#6:1 2:B5:1 3:D#6:1',
    '0:E6:1z 1:G#5:0.5 1.5:B5:0.5 2:E6:2z',
    '0:G#6:1z 1:E6:1 2:B5:1 3:D#6:1'
  ].map(P);
  function caiBar(b, c, L, ent, N) {
    var i = b % 16, ch = chord(CAI_CH[i]), nx = chord(CAI_CH[(i + 1) % 16]), br = i >= 8, k, j, fill = i % 4 === 3, big = i === 7 || i === 15;
    (fill ? [0, 2] : [0, 1.5, 2, 3.5]).forEach(function (b2) { hit(c, b2, 'kick', b2 === 0 ? 1 : 0.82, 'drums'); });
    for (k = 0; k < 4; k++) {
      hit(c, k, br ? 'ride' : 'hatC', br ? 0.4 : 0.85, 'hats'); hit(c, k + 0.5, k === 3 && !fill ? 'hatO' : 'hatC', 0.55, 'hats');
      if (!fill) { hit(c, k + 0.25, 'hatC', 0.2, 'hats'); hit(c, k + 0.75, 'hatC', 0.2, 'hats'); }
    }
    hit(c, 1, 'snare', 0.95, 'drums'); if (!fill) hit(c, 3, 'snare', 0.95, 'drums');
    if (fill) {
      if (big) { for (k = 0; k < 8; k++) hit(c, 2 + k * 0.25, k < 6 ? 'snare' : (k === 6 ? 'tomM' : 'tomL'), 0.45 + 0.07 * k, 'drums'); hit(c, 1.5, 'riser', 0.5, 'perc'); }
      else { hit(c, 3, 'tomH', 0.8, 'drums'); hit(c, 3.25, 'tomM', 0.75, 'drums'); hit(c, 3.5, 'tomM', 0.8, 'drums'); hit(c, 3.75, 'tomL', 0.9, 'drums'); }
    }
    if (i % 4 === 0 && (i > 0 || ent)) hit(c, 0, 'crash', i === 8 ? 0.65 : 0.45, 'drums');
    var r = fitBass(rootIn(ch, 38)), nr = fitBass(rootIn(nx, 38)), ap = nr > r ? nr - 1 : nr + 1;
    for (j = 0; j < 8; j++) (function (j) {
      var m = (j === 2 || j === 6) ? r + 12 : r;
      if (j === 7 && fill) m = ap;
      ev(c.at(j * 0.5) + (rnd() - 0.5) * 0.004, 'bass', function (t) { bass(t, m, 0.42 * c.u, hum(j % 2 ? 0.7 : 0.92, 0.06), 'pick'); });
    })(j);
    var rg = rootIn(ch, M('A2'));
    for (j = 0; j < 8; j++) (function (j) {
      ev(c.at(j * 0.5) + (rnd() - 0.5) * 0.005, 'mel', function (t) {
        if (j % 4 === 0) strum(t, [rg, rg + 7], 'open', hum(0.82, 0.06), false, 'crunch', 0.42 * c.u);
        else strum(t, [rg, rg + 7], 'chop', hum(0.55, 0.08), false, 'crunch');
      });
    })(j);
    surfLine(c, CAI_MEL[i], { vel: 0.78 });
    if (L.strings) { var sv = voicing(ch, M('E4'), 3); ev(c.at(0), 'mel', function (t) { strings(t, sv, 4 * c.u * 0.98, br ? 0.5 : 0.38, { att: 0.35, rel: 0.4 }); }); }
    if (L.organ) { var vo = voicing(ch, M('C4'), 3); [0, 1.5, 3].forEach(function (b2) { ev(c.at(b2), 'mel', function (t) { organ(t, vo, 0.4 * c.u, { type: 'farfisa', vel: 0.46 }); }); }); }
    if (L.coro && (i % 4 === 0 || big)) { var vc = voicing(ch, M('G3'), 3); ev(c.at(0), 'mel', function (t) { coro(t, vc, 2 * c.u, 'a', 0.6); }); }
  }

  // =========================================================================================================
  // HEROE · «Aterrizaje en Chorrillos» (cv.heroe) · 104 bpm con pulso de 6/8 (dos grupos de tres por pulso, hemiola de marinera/festejo), Re mayor · 16 compases
  //   compases 0-3 guitarra criolla de nailon rasgueada con bajo y cuerdas que crecen (el planeo); 4-7 entra el cajón y la melodía de picado trémolo (el aterrizaje);
  //   8-15 surf rock épico: crunch, batería, melodía alta con pluck y coro «aah» (la pose de héroe). Cierra en Re y vuelve al compás 0 sin corte.
  //   forma: D | A | Bm | G | D | A | G | A7  ·  G | D | Em | A | G | D | A | D
  var HER_CH = ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A7', 'G', 'D', 'Em', 'A', 'G', 'D', 'A', 'D'];
  var HER_MEL = [
    '0:A4:1 1:D5:1 2:F#5:2z',
    '0:E5:1 1:C#5:1 2:A4:2',
    '0:D5:1 1:F#5:1 2:B5:2z',
    '0:A5:1 1:G5:0.667 1.6667:F#5:0.3333 2:E5:2',
    '0:F#5:1 1:A5:1 2:D6:2z',
    '0:C#6:1 1:A5:1 2:E5:2',
    '0:B5:1 1:D6:1 2:G5:2z',
    '0:E5:1 1:G5:1 2:C#6:2!',
    '0:D6:1.5z 1.5:B5:0.5 2:G5:1 3:B5:1',
    '0:A5:1 1:D6:1 2:F#6:2z',
    '0:E6:1.5z 1.5:D6:0.5 2:B5:1 3:G5:1',
    '0:E6:1 1:C#6:1 2:A5:2z',
    '0:D6:1 1:G6:1 2:F#6:1 3:D6:1',
    '0:F#6:1.5z 1.5:E6:0.5 2:D6:1 3:A5:1',
    '0:C#6:1 1:E6:1 2:A5:1 3:C#6:1',
    '0:D6:2z 2:A5:1 3:F#5:1'
  ].map(P);
  var HER_PAT = [[0, false, 0.95], [0.667, true, 0.45], [1.333, false, 0.7], [2, false, 0.85], [2.667, true, 0.45], [3.333, false, 0.7]];   // rasgueo en seis pulsos
  function herBar(b, c, L, ent, N) {
    var i = b % 16, ch = chord(HER_CH[i]), nx = chord(HER_CH[(i + 1) % 16]), epic = i >= 8, mid = i >= 4, k;
    var vo5 = voicing(ch, M('D3'), 5), rg = rootIn(ch, M('D2')), r = fitBass(rootIn(ch, 38)), nr = fitBass(rootIn(nx, 38)), ap = nr > r ? nr - 1 : nr + 1;
    HER_PAT.forEach(function (p) {
      ev(c.at(p[0]) + (rnd() - 0.5) * 0.006, 'mel', function (t) { strum(t, vo5, 'nylon', hum(p[2] * (epic ? 0.55 : 0.85), 0.08), p[1], 'nylon', 0.62 * c.u); });
      if (epic && !p[1]) ev(c.at(p[0]) + (rnd() - 0.5) * 0.005, 'mel', function (t) { strum(t, [rg, rg + 7, rg + 12], p[0] === 0 ? 'open' : 'chop', hum(p[2] * 0.95, 0.06), false, 'crunch', p[0] === 0 ? 0.9 * c.u : 0); });
    });
    // bajo
    if (!epic) {
      ev(c.at(0), 'bass', function (t) { bass(t, r, 1.8 * c.u, hum(0.85, 0.05), 'walk'); });
      ev(c.at(2), 'bass', function (t) { bass(t, r + 7, 1.4 * c.u, hum(0.75, 0.05), 'walk'); });
      if (mid) ev(c.at(3.333), 'bass', function (t) { bass(t, ap, 0.5 * c.u, hum(0.6, 0.05), 'walk'); });
    } else {
      [0, 0.667, 1.333, 2, 2.667, 3.333].forEach(function (b2, q) {
        ev(c.at(b2) + (rnd() - 0.5) * 0.004, 'bass', function (t) { bass(t, q === 3 ? r + 12 : (q === 5 && i % 2 ? ap : r), 0.58 * c.u, hum(q % 3 === 0 ? 0.95 : 0.72, 0.06), 'pick'); });
      });
    }
    // percusión
    if (!mid) { hit(c, 0, 'cajon', 0.38, 'drums'); hit(c, 2, 'cajonH', 0.3, 'drums'); for (k = 0; k < 6; k++) hit(c, HER_PAT[k][0], 'shakerL', 0.24, 'hats'); }
    else {
      hit(c, 0, 'cajon', 0.8, 'drums'); hit(c, 2, 'cajon', 0.65, 'drums');
      hit(c, 1.333, 'cajonH', 0.7, 'drums'); hit(c, 3.333, 'cajonH', 0.7, 'drums'); hit(c, 0.667, 'cajonH', 0.28, 'drums'); hit(c, 2.667, 'cajonH', 0.28, 'drums');
      for (k = 0; k < 6; k++) hit(c, HER_PAT[k][0], 'shakerL', 0.3, 'hats');
    }
    if (epic) {
      hit(c, 0, 'kick', 0.9, 'drums'); hit(c, 2, 'kick', 0.8, 'drums'); hit(c, 1, 'snare', 0.7, 'drums'); hit(c, 3, 'snare', 0.7, 'drums');
      for (k = 0; k < 6; k++) hit(c, HER_PAT[k][0], 'ride', k % 2 ? 0.28 : 0.4, 'hats');
      if (i === 8 || i === 12) hit(c, 0, 'crash', 0.6, 'drums');
      if (i === 15) { hit(c, 2, 'snare', 0.5, 'drums'); hit(c, 2.667, 'snare', 0.6, 'drums'); hit(c, 3, 'tomH', 0.75, 'drums'); hit(c, 3.333, 'tomM', 0.8, 'drums'); hit(c, 3.667, 'tomL', 0.9, 'drums'); }
    }
    if (i === 0) hit(c, 0, 'crash', 0.45, 'drums');
    if (i === 7) { hit(c, 1.5, 'riser', 0.55, 'perc'); hit(c, 3, 'tomH', 0.6, 'drums'); hit(c, 3.333, 'tomM', 0.65, 'drums'); hit(c, 3.667, 'tomL', 0.75, 'drums'); }
    // cuerdas (el planeo crece)
    var sv = voicing(ch, M('F#3'), 3);
    ev(c.at(0), 'mel', function (t) { strings(t, sv, 4 * c.u * 0.98, i < 4 ? 0.2 + 0.07 * i : 0.45, { att: 0.6, rel: 0.5 }); });
    // melodía
    if (i < 4) surfLine(c, HER_MEL[i], { kind: 'nylon', layer: 'nylon', vel: 0.82 });
    else surfLine(c, HER_MEL[i], { vel: 0.74 });
    if (mid && !epic) line(c, HER_MEL[i], 'mel', function (t, m, d) { gtr(t, m, d, { kind: 'nylon', vel: 0.4, layer: 'nylon' }); });
    if (epic) line(c, HER_MEL[i], 'mel', function (t, m, d, x, acc) { gtr(t + 0.01, m + 12, Math.min(d, 0.7), { kind: 'twang', vel: 0.28, layer: 'pluck', rel: 0.1 }); });
    if (i >= 12) { var vc = voicing(ch, M('A3'), 3); ev(c.at(0), 'mel', function (t) { coro(t, vc, 3.6 * c.u, 'a', 0.5); }); }
  }
  // =========================================================================================================
  // TÍTULO = el explore con la mezcla fija; MUERTE = lamento de saxo; GANÓ = silencio (el stinger `win` trae el final completo)
  var DEAD_MEL = ['0:B4:1.5v 1.5:A4:0.5 2:G4:1 3:E4:1', '0:F#4:1 1:G4:1 2:E4:2v'].map(P);
  function deadBar(b, c) {
    line(c, DEAD_MEL[b], 'mel', function (t, m, d, x) { sax(t, m, d, { vel: 0.62, scoop: 40, vib: 18, fall: x.d >= 2 ? 0.8 : 0, layer: 'sax' }); });
    var vo = voicing(chord('Em'), M('G3'), 3);
    ev(c.at(0), 'mel', function (t) { organ(t, vo, 3.9 * c.u, { type: 'salon', vel: 0.5 }); });
    ev(c.at(0), 'perc', function (t) { play(t, S.buf.tomL, 'drums', 0.5); });
  }

  // temas: bpm, swing, compases, ánimo de reanudación (resume), ritmo nocturno (nt), suciedad (dt: el tempo sube con S.dirt), capas según la intensidad
  var PIECES = {
    explore: { bpm: 126, sw: 0, len: 16, loop: true, resume: 4, nt: 0.2, name: 'Brisa del Malecón', bar: malBar,
      layers: function (I, b, N) { return { drums: 1, bass: 1, rhy: 1, lead: I >= 0.04, organ: I >= 0.5, palmas: I >= 0.65, coro: I >= 0.8 }; } },
    larco: { bpm: 104, sw: 0, len: 16, loop: true, resume: 4, nt: 0.1, dt: 0.18, name: 'Terraza Larcomar', bar: larBar, layers: function () { return {}; } },
    chase: { bpm: 168, sw: 0, len: 16, loop: true, resume: 0, nt: 0.05, name: 'Corre, que viene la ola', bar: chaseBarS,
      layers: function (I, b, N) { return { lead: I >= 0.25, organ: I >= 0.5, palmas: I >= 0.5, coro: I >= 0.75 }; } },
    horde: { bpm: 150, sw: 0, len: 8, loop: true, resume: 0, nt: 0.04, name: 'Ola de muertos', bar: hordeBarS, layers: function () { return {}; } },
    boss: { bpm: 144, sw: 0, len: 8, loop: true, resume: 0, nt: 0.04, name: 'Mesa cuatro (chef)', bar: chfBar,
      layers: function (I, b, N) { return { lead: true, pluck: I >= 0.5, organ: I >= 0.5, fast: I >= 0.75 }; } },
    caida: { bpm: 176, sw: 0, len: 16, loop: true, resume: 0, nt: 0, name: 'Caída libre', bar: caiBar,
      layers: function (I, b, N) { return { strings: I >= 0.25, organ: I >= 0.5, coro: I >= 0.75 }; } },
    heroe: { bpm: 104, sw: 0, len: 16, loop: true, resume: 0, nt: 0, name: 'Aterrizaje en Chorrillos', bar: herBar, layers: function () { return {}; } },
    dead: { bpm: 66, sw: 0, len: 2, loop: false, resume: 0, nt: 0, name: 'lamento', bar: deadBar, layers: function () { return {}; } },
    won: { bpm: 138, sw: 0, len: 0, loop: false, resume: 0, nt: 0, name: 'final', bar: function () {}, layers: function () { return {}; } }
  };
  PIECES.chef = PIECES.boss;                            // cv.chef: el mismo tema que setBoss(true)
  PIECES.title = { bpm: 126, sw: 0, len: 16, loop: true, resume: 0, nt: 0.2, name: 'Brisa del Malecón (título)', bar: malBar,
    layers: function (I, b, N) { return PIECES.explore.layers(0.55, b, N); } };
  var OVERRIDES = { chef: 1, caida: 1, heroe: 1 };      // temas que se piden por nombre (ACH.audio.cv.play)

  // notas que se usan en los primeros compases (cada una cuesta unos ms): se calientan al arrancar; lo demás, en pausas pequeñas o al vuelo
  function warmLines(lines, kind) { lines.forEach(function (ln) { ln.forEach(function (x) { x.n.forEach(function (n) { ks(n, kind); }); }); }); }
  function warm(key) {
    if (key === 'explore') {
      warmLines(MAL_MEL, 'twang'); warmLines(MAL_MEL, 'trem');
      MAL_CH.forEach(function (d) { segs(d).forEach(function (x) { voicing(x.ch, M('G3'), 3).forEach(function (n) { ks(n, 'chop'); }); }); });
      ks(M('E6'), 'twang');
    } else if (key === 'larco') {
      warmLines(LAR_MEL, 'nylon'); warmLines(LAR_MEL, 'twang'); warmLines(LAR_MEL, 'trem');
      LAR_CH.forEach(function (d) { segs(d).forEach(function (x) { voicing(x.ch, M('E3'), 4).forEach(function (n) { ks(n, 'nylon'); }); voicing(x.ch, M('G3'), 3).forEach(function (n) { ks(n, 'chop'); ks(n, 'open'); }); }); });
    } else if (key === 'chase') {
      warmLines(SCH_MEL, 'twang'); warmLines(SCH_MEL, 'trem');
      SCH_CH.forEach(function (s) { var rg = rootIn(chord(s), M('A2')); [0, 7].forEach(function (iv) { ks(rg + iv, 'open'); ks(rg + iv, 'chop'); }); });
    } else if (key === 'horde') {
      warmLines(SHD_MEL, 'twang'); warmLines(SHD_MEL, 'trem');
      SHD_CH.forEach(function (s) { var r = rootIn(chord(s), 36); [0, 3, 5, 7].forEach(function (iv) { [0, 7, 12].forEach(function (k) { ks(r + iv + k, 'fuzz'); ks(r + iv + k, 'fmute'); }); }); });
    } else if (key === 'boss' || key === 'chef') {
      [0, 3, 5, 7, 10].forEach(function (o) { [0, 7, 12].forEach(function (k) { ks(40 + o + k, 'fuzz'); ks(40 + o + k, 'fmute'); }); });
      warmLines(CHF_MEL, 'twang');
      CHF_MEL.forEach(function (ln) { ln.forEach(function (x) { x.n.forEach(function (n) { ks(n + 12, 'twang'); ks(n + 24, 'twang'); }); }); });
      lazy('gong');
    } else if (key === 'caida') {
      warmLines(CAI_MEL, 'trem');
      CAI_CH.forEach(function (s) { var rg = rootIn(chord(s), M('A2')); [0, 7].forEach(function (iv) { ks(rg + iv, 'open'); ks(rg + iv, 'chop'); }); });
      lazy('riser');
    } else if (key === 'heroe') {
      warmLines(HER_MEL, 'nylon'); warmLines(HER_MEL, 'trem');
      HER_CH.forEach(function (s) { var ch = chord(s); voicing(ch, M('D3'), 5).forEach(function (n) { ks(n, 'nylon'); }); var rg = rootIn(ch, M('D2')); [0, 7, 12].forEach(function (iv) { ks(rg + iv, 'open'); ks(rg + iv, 'chop'); }); });
      lazy('riser');
    }
  }
  // =========================================================================================================
  // COMBO DE LA CALLE (diegetic): un saxo, guitarra, bajo y escobillas tocando un blues de bar en Mi, 104 bpm con shuffle, en una posición del mundo.
  var BAND_BPM = 104, BAND_CH = ['E7', 'A7', 'E7', 'B7'], BAND_VOL = 0.9;
  var BAND_LICK = [
    '0:G4:0.5 0.5:B4:0.5 1:E5:1 2:D5:0.5 2.5:B4:0.5 3:G4:1',
    '0:A4:0.5 0.5:C5:0.5 1:E5:1 2:D5:0.5 2.5:C5:0.5 3:A4:1',
    '0:E5:1.5 1.5:D5:0.5 2:B4:1 3:G4:1',
    '0:F#5:1 1:D#5:0.5 1.5:B4:0.5 2:A4:1 3:F#4:1'
  ].map(P);
  function buildBand() {
    var c = S.ctx, B = S.B = { x: 0, y: 0, state: 'off', bar: 0, nextBar: 0, queue: [], late: 0, dropped: 0, starts: 0, cuts: 0, d: 9999, g: 0, a: 0, duckDb: 0, last: {}, lastSp: -1, fadeEnd: 0 };
    B.fade = c.createGain(); B.fade.gain.value = 0;
    B.dist = c.createGain(); B.dist.gain.value = 0;
    B.pan = c.createStereoPanner ? c.createStereoPanner() : null;
    B.lp = c.createBiquadFilter(); B.lp.type = 'lowpass'; B.lp.frequency.value = 16000;
    B.wet = c.createGain(); B.wet.gain.value = 0.2;
    B.mix = c.createGain(); B.mix.gain.value = BAND_VOL;
    B.inst = {};
    ['sax', 'gtr', 'bass', 'drums'].forEach(function (k) { var g = c.createGain(); g.gain.value = { sax: 0.5, gtr: 0.75, bass: 0.55, drums: 0.7 }[k]; g.connect(B.mix); B.inst[k] = g; });
    B.mix.connect(B.fade); B.fade.connect(B.dist); B.dist.connect(B.lp);
    if (B.pan) { B.lp.connect(B.pan); B.pan.connect(S.n.pre); } else B.lp.connect(S.n.pre);
    B.lp.connect(B.wet); B.wet.connect(S.n.send);
  }
  function bev(t, fn) { S.B.queue.push({ t: t, fn: fn }); }
  function bandBar() {
    var B = S.B, t0 = B.nextBar, bd = 240 / BAND_BPM, c = barCtx(t0, bd, SW_BAND), i = B.bar % 4, ch = chord(BAND_CH[i]), nx = chord(BAND_CH[(i + 1) % 4]), k;
    function hb(beat, name, vel, inst) { bev(c.at(beat), function (t) { play(t, S.buf[name], B.inst[inst], hum(vel, 0.1), 0, 'x'); }); }
    hb(0, 'kickS', 0.5, 'drums'); hb(2, 'kickS', 0.4, 'drums'); hb(1, 'brush', 0.7, 'drums'); hb(3, 'brush', 0.75, 'drums');
    for (k = 0; k < 4; k++) { hb(k, 'hatC', 0.38, 'drums'); hb(k + 0.5, 'hatC', 0.22, 'drums'); }
    walkNotes([{ ch: ch, s: 0, e: 4 }], nx, i % 2 === 1).forEach(function (x) { bev(c.at(x[0]), function (t) { bass(t, x[1], 0.9 * c.u, hum(0.9, 0.06), 'walk', B.inst.bass); }); });
    var vo = voicing(ch, M('G3'), 4);
    [1, 3].forEach(function (b2) { bev(c.at(b2), function (t) { strum(t, vo, 'chop', 0.7, false, B.inst.gtr, 0, 'x'); }); });
    BAND_LICK[i].forEach(function (x) { bev(c.at(x.s), function (t) { sax(t, x.n[0], x.d * c.u * 0.95, { vel: 0.7, scoop: 30, vib: 14, layer: B.inst.sax, k: 'x' }); }); });
    B.nextBar += bd; B.bar++;
    B.queue.sort(function (a, b) { return a.t - b.t; });
  }
  var SW_BAND = 0.667;
  function bandSpatial(force) {
    var B = S.B; if (!B) return;
    var t = now();
    if (!force && t - B.lastSp < 0.04) return;
    B.lastSp = t;
    if (!S.offline && !S.lisSet) { try { var G = ACH.game.G, V = ACH.render.VIEW; S.lx = G.cam.x + V.w / 2; S.ly = G.cam.y + V.h / 2; } catch (e) { /* nada */ } }
    var dx = B.x - S.lx, dy = B.y - S.ly, d = Math.sqrt(dx * dx + dy * dy), u = clamp((d - 60) / 540, 0, 1), g = Math.pow(1 - u, 2.2);
    var on = B.state === 'playing' ? 1 : 0, tc = force ? 0.03 : 0.08, L = B.last;
    B.d = d; B.g = g; B.a = Math.pow(g, 0.8) * on; B.duckDb = -6 * B.a;
    function set(key, param, v, eps, tcc) { if (L[key] === undefined || Math.abs(L[key] - v) > eps) { L[key] = v; param.setTargetAtTime(v, t, tcc || tc); } }
    set('g', B.dist.gain, g, 0.002);
    if (B.pan) set('p', B.pan.pan, clamp(dx / 260, -1, 1) * 0.85, 0.01);
    set('lp', B.lp.frequency, 16000 * Math.pow(0.12, u), 60);
    set('w', B.wet.gain, 0.2 * (1 + 2 * u), 0.01);
    set('duck', S.n.duck.gain, Math.pow(10, B.duckDb / 20), 0.004, 0.35);
  }
  function bandTick(t) {
    var B = S.B; if (!B) return;
    if (B.state === 'fading' && t >= B.fadeEnd) { B.state = 'off'; B.queue = []; }
    if (B.state === 'playing' || B.state === 'fading') {
      if (B.nextBar < t - 0.02) { B.queue = B.queue.filter(function (e) { return e.t >= t; }); B.nextBar = t + 0.05; }
      while (B.nextBar < t + 0.25) bandBar();
    }
    var q = B.queue, k = 0;
    while (k < q.length && q[k].t < t + 0.25) {
      var e = q[k++];
      if (e.t >= t - 0.01) { if (e.t < t) B.late++; try { e.fn(Math.max(e.t, t + 0.001)); } catch (err) { if (S.offline) throw err; } } else B.dropped++;
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
      if (B.state === 'playing') { bandSpatial(true); return; }
      B.queue = []; B.state = 'playing'; B.nextBar = t + 0.12; B.bar = 0; B.starts++;
      B.fade.gain.cancelScheduledValues(t); B.fade.gain.setTargetAtTime(1, t, 0.15);
    } else if (B.state !== 'off') {
      if (mode === 'cut') { B.fade.gain.cancelScheduledValues(t); B.fade.gain.setTargetAtTime(0, t, 0.02); B.state = 'off'; B.queue = []; B.cuts++; }
      else if (B.state !== 'fading') { B.state = 'fading'; B.fadeEnd = t + 3; B.fade.gain.cancelScheduledValues(t); B.fade.gain.setTargetAtTime(0, t, 0.6); }
    }
    bandSpatial(true);
  }

  // =========================================================================================================
  // ánimos: efectos por pieza, noche, secuenciador con cambio en el siguiente tiempo
  var FX = {
    explore: { trem: 0.22, hz: 5.2, slap: 0.16, spring: 0.7, sea: 1.0, seaF: 650 }, title: { trem: 0.22, hz: 5.2, slap: 0.16, spring: 0.7, sea: 1.0, seaF: 650 },
    larco: { trem: 0.16, hz: 4.6, slap: 0.2, spring: 0.4, sea: 0.4, seaF: 600 },
    chase: { trem: 0.08, hz: 6, slap: 0.14, spring: 0.55, sea: 0, seaF: 800 }, horde: { trem: 0, hz: 6, slap: 0.14, spring: 0.5, sea: 0, seaF: 800 },
    boss: { trem: 0, hz: 6, slap: 0.12, spring: 0.3, sea: 0, seaF: 800 },
    caida: { trem: 0.08, hz: 6, slap: 0.12, spring: 0.5, sea: 0.9, seaF: 1600 },
    heroe: { trem: 0.1, hz: 5, slap: 0.18, spring: 0.55, sea: 0.7, seaF: 700 },
    dead: { trem: 0.3, hz: 4.5, slap: 0.12, spring: 0.6, sea: 0, seaF: 600 }, won: { trem: 0.2, hz: 5, slap: 0.2, spring: 0.5, sea: 0.5, seaF: 650 }
  };
  FX.chef = FX.boss;
  var SEA_VOL = 0.9;
  // brisa y oleaje: ruido en bucle por un paso de banda; un LFO lento (0,11 Hz) lo hace subir y bajar como el mar contra el malecón. En caída: viento más agudo.
  function buildSea() {
    var c = S.ctx, n = S.n, src = c.createBufferSource(), bp = c.createBiquadFilter(), sw = c.createGain(), lg = c.createGain(), lfo = c.createOscillator(), sg = c.createGain();
    src.buffer = S.buf.vsr; src.loop = true;
    bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 0.35;
    sw.gain.value = 0.55; lfo.frequency.value = 0.11; lg.gain.value = 0.4; lfo.connect(lg); lg.connect(sw.gain);
    sg.gain.value = 0; src.connect(bp); bp.connect(sw); sw.connect(sg); sg.connect(n.L.sea.input);
    src.start(); lfo.start();
    n.seaSrc = src; n.seaLfo = lfo; n.seaBp = bp; n.seaG = sg;
  }
  function applyFx(key, t, tcs) {
    var n = S.n, f = FX[key] || FX.explore, N = S.nTarget;
    var D = key === 'larco' ? S.dirt : 0;                                           // la suciedad de Larcomar: más trémolo, más resorte y más eco
    var tr = f.trem + (key === 'explore' || key === 'title' ? 0.2 * N : 0) + 0.34 * D, hzv = f.hz * (1 - 0.15 * N) * (1 + 0.3 * D), sp = f.spring + 0.28 * N + 0.45 * D, sl = f.slap - 0.1 * N + 0.12 * D;
    if (n.seaG) {
      n.seaG.gain.setTargetAtTime(f.sea * (key === 'larco' ? 1 - D : 1) * SEA_VOL, t, tcs ? Math.max(0.3, tcs * 3) : 0.5);
      n.seaBp.frequency.setTargetAtTime(f.seaF, t, 0.8);
    }
    n.tdepth.gain.setTargetAtTime(tr * 0.5, t, tcs || 0.15);
    n.ltrem.gain.setTargetAtTime(1 - tr * 0.5, t, tcs || 0.15);
    n.tlfo.frequency.setTargetAtTime(hzv, t, tcs || 0.1);
    n.slapG.gain.setTargetAtTime(sl, t, tcs || 0.2);
    n.sprG.gain.setTargetAtTime(sp, t, tcs || 0.3);
  }
  // noche: sombra de agudos, reverb, multiplicadores por capa y órgano de salón; todos con la misma constante de tiempo
  function applyNight(t, tc) {
    var n = S.n, N = S.nTarget, nm = NM[S.key] || {};
    function go(p, v) { p.cancelScheduledValues(t); p.setTargetAtTime(v, t, tc); }
    go(n.warm.gain, -3 - 7 * N); go(n.warm.frequency, 6500 - 3200 * N);
    go(n.plateRet.gain, n.plateBase * (1 + 1.0 * N)); go(n.sg.gain, n.sgBase * (1 + 0.8 * N));
    Object.keys(LAYERS).forEach(function (k) { go(n.L[k].nm.gain, k === 'salon' ? N * (SALON_VOL[S.key] || 0.3) : 1 + ((nm[k] == null ? 1 : nm[k]) - 1) * N); });
  }
  function setNightS(on, secs) {
    var t = now(), d = secs === undefined ? 8 : Math.max(0, +secs || 0);
    S.nFrom = nightAt(t); S.nT0 = t; S.nTarget = on ? 1 : 0; S.nTc = Math.max(0.001, d / 3);
    applyNight(t, S.nTc);
    applyFx(S.key, t, S.nTc);
  }
  function nightTc(t) { return t - S.nT0 < 3 * S.nTc ? S.nTc : 0.25; }

  // pieza que toca un ánimo: un tema pedido por nombre (cv.play) manda sobre todo; con setBoss(true) horde y chase tocan el tema del chef; explore en Larcomar toca la bossa sucia
  function keyFor(m) { if (S.ov) return S.ov; if (m === 'title') return 'title'; if ((m === 'horde' || m === 'chase') && S.boss) return 'boss'; if (m === 'explore' && S.zone === 'larcomar') return 'larco'; return m; }
  function urgent(k) { return k === 'chase' || k === 'horde' || k === 'boss' || k === 'chef' || k === 'caida'; }
  function resumeAt(key) { var p = PIECES[key], sv = S.saved[key]; return p.resume && sv ? Math.ceil(sv / p.resume) * p.resume : 0; }

  // silencia lo que ya está creado: las notas que cruzan `at` se apagan en 12 ms; las que empiezan después, no suenan; la percusión de la anacrusa (>= fs), tampoco
  function cutLive(at, fs) {
    var i, v;
    for (i = 0; i < S.live.length; i++) {
      v = S.live[i];
      if (v.te <= at - 1e-4) continue;
      try {
        if (v.t0 >= at - 1e-4 || (fs !== null && v.k === 'p' && v.t0 >= fs - 1e-4)) v.p.cancelScheduledValues(v.t0 - 1e-4);
        else { v.p.cancelScheduledValues(at); v.p.setTargetAtTime(0, at, v.k === 'p' ? 0.03 : 0.012); }
      } catch (e) { /* nada */ }
    }
    S.live = S.live.filter(function (x) { return x.te > at - 1e-4 && x.t0 < at - 1e-4; });
  }

  // cambio de pieza: en el tiempo siguiente de la rejilla (>= 50 ms después de pedirlo). Corta la cola y las notas vivas ahí, mete una anacrusa de caja/toms
  // y la pieza nueva arranca en ese mismo instante. Salir de la muerte o del final (o ir a ellos) es inmediato.
  function switchTo(key) {
    var t = now(), from = S.key, p = PIECES[key];
    if (!p || key === from) return;
    if (S.fresh) {                                                         // aún no se generó ninguna barra: cambiar de pieza sin cortar nada
      S.key = key; S.piece = p; S.bar = resumeAt(key); S.cur = { t0: S.nextBar, bd: 240 / p.bpm, u: 60 / p.bpm, sw: p.sw };
      applyFx(key, t, 0.1); applyNight(t, 0.2);
      return;
    }
    var po = PIECES[from];
    if (po.bar === p.bar && from !== 'dead' && from !== 'won') {            // título <-> explore: la misma canción, solo cambian las capas
      S.key = key; S.piece = p; S.log.push({ t: S.nextBar, from: from, key: key, same: true }); applyFx(key, t, 0.2); applyNight(t, 0.3);
      return;
    }
    var imm = key === 'dead' || key === 'won' || from === 'dead' || from === 'won';
    var at = null, k, cur = S.cur;
    if (imm) at = t + (key === 'dead' ? 0.12 : 0.06);
    else {
      for (k = 0; k <= 4; k++) { var cand = cur.t0 + k * cur.u; if (cand >= t + 0.05) { at = cand; break; } }
      if (at === null) at = Math.max(S.nextBar, t + 0.05);
    }
    var fl = imm ? 0 : Math.min(0.5 * cur.u, at - t - 0.02), fs = fl > 0.06 ? at - fl : null;     // anacrusa
    if (po.resume) S.saved[from] = S.bar;
    S.queue = S.queue.filter(function (e) { return !(e.t >= at - 1e-4 && e.k !== 'stg') && !(fs !== null && e.k === 'perc' && e.t >= fs - 1e-4); });
    cutLive(at, fs);
    if (fs !== null) {                                                     // anacrusa directa (no se vuelve a cortar)
      if (urgent(key)) { play(fs, S.buf.snare, 'drums', 0.55, 0, 'x'); play(fs + fl * 0.5, S.buf.snare, 'drums', 0.7, 0, 'x'); play(fs + fl * 0.75, S.buf.tomL, 'drums', 0.85, 0, 'x'); }
      else if (key === 'explore' || key === 'title' || key === 'larco') { play(fs + fl * 0.4, S.buf.shaker, 'hats', 0.5, 0, 'x'); play(fs + fl * 0.8, S.buf.shaker, 'hats', 0.6, 0, 'x'); }
      else if (key === 'heroe') { play(fs + fl * 0.5, S.buf.cajonH, 'drums', 0.5, 0, 'x'); play(fs + fl * 0.8, S.buf.cajon, 'drums', 0.6, 0, 'x'); }
    }
    S.key = key; S.piece = p; S.bar = resumeAt(key); S.nextBar = at; S.entering = urgent(key) && !urgent(from);
    S.cur = { t0: at, bd: 240 / p.bpm, u: 60 / p.bpm, sw: p.sw };
    applyFx(key, at, 0.1); applyNight(at, nightTc(at));
    S.log.push({ t: at, from: from, key: key, asked: t });
    (S.sw = S.sw || []).push({ asked: t, at: at, from: from, key: key, bar: S.bar });
    if (!S.offline && S.sw.length > 24) S.sw.shift();
  }
  function requestMood() { if (S.paused) return; switchTo(keyFor(S.mood)); }

  function generateBar() {
    var t0 = S.nextBar, p = S.piece, b = S.bar, N = nightAt(t0), bpm = p.bpm * (1 - p.nt * N) * (1 + (p.dt || 0) * S.dirt), bd = 240 / bpm, c = barCtx(t0, bd, p.sw);
    if (p.loop || b < p.len) {
      var L = p.layers(S.I, b, N), q0 = S.queue.length, qi;
      p.bar(p.loop ? b % p.len : b, c, L, S.entering, N);
      S.entering = false;
      if (N > 0.02) for (qi = q0; qi < S.queue.length; qi++) {                    // noche: tocan «atrás del pulso» (la melodía y la percusión se arrastran un poco)
        var qe = S.queue[qi];
        if (qe.k === 'mel') qe.t += 0.03 * N; else if (qe.k === 'perc') qe.t += 0.012 * N;
      }
    }
    S.cur = { t0: t0, bd: bd, u: bd / 4, sw: p.sw }; S.fresh = false;
    S.nextBar = t0 + bd; S.bar++;
    S.bars.push({ t: t0, bd: bd, key: S.key, b: b });
    if (!S.offline && S.bars.length > 64) S.bars.shift();
    sortQ();
  }
  function tick() {
    if (!S) return;
    var t = now(), hidden = !S.offline && typeof document !== 'undefined' && document.hidden, horizon = hidden ? 1.5 : 0.25;
    if (S.nextBar < t - 0.02) {                       // nos quedamos atrás (pestaña dormida, contexto suspendido): re-sincronizar
      S.queue = S.queue.filter(function (e) { return e.t >= t; });
      S.nextBar = t + 0.05; S.resyncs++;
    }
    while (S.nextBar < t + horizon) generateBar();
    var q = S.queue, k = 0;
    while (k < q.length && q[k].t < t + horizon) {
      var e = q[k++];
      if (e.t >= t - 0.01) { if (e.t < t) S.late++; try { e.fn(Math.max(e.t, t + 0.001)); } catch (err) { if (S.offline) throw err; } }
      else S.dropped++;
    }
    if (k) q.splice(0, k);
    bandTick(t);
    if (!S.offline && S.auto && t - S.autoT >= CFG.every) { S.autoT = t; try { autoZone(); } catch (e) { /* nada */ } }
    if (S.live.length > 160 || (S.live.length && S.live[0].te < t - 0.5)) S.live = S.live.filter(function (v) { return v.te > t - 0.2; });
    if (S.lastTick) S.maxGap = Math.max(S.maxGap, t - S.lastTick);
    S.lastTick = t;
  }

  // =========================================================================================================
  // stingers (encima de la música; no se cortan al cambiar de ánimo)
  var STG_GAP = { kill: 0.5, hurt: 0.35, horde: 1.5, death: 2, win: 2, cobrador: 2.5, 'boss.intro': 2, 'boss.down': 2, gong: 1, 'cv.gol': 1.5 };
  function nextStep(t) {
    var cur = S.cur, step = cur.u / (cur.sw ? 3 : 4), kk = Math.ceil((t + 0.03 - cur.t0) / step);
    return cur.t0 + Math.max(0, kk) * step;
  }
  function tonic() {                                       // tónica y escala del tema que suena (para los stingers)
    var k = S.key;
    if (k === 'chase' || k === 'larco') return { r: 69, pcs: [9, 11, 0, 2, 4, 5, 8] };       // La menor armónica
    if (k === 'caida') return { r: 64, pcs: [4, 5, 8, 9, 11, 0, 3] };                         // Mi frigio dominante
    if (k === 'heroe') return { r: 62, pcs: [2, 4, 6, 7, 9, 11, 1] };                         // Re mayor
    return { r: 64, pcs: [4, 6, 7, 9, 11, 0, 3] };                                            // Mi menor armónico
  }
  function stingerNow(name) {
    var t = now(), last = S.stgLast[name] || -9;
    if (t - last < (STG_GAP[name] || 0.4)) return;
    S.stgLast[name] = t;
    var q, tn = tonic(), r = tn.r, i, g;
    var O = { layer: 'stg', k: 'x' };
    if (name === 'kill') {
      q = nextStep(t); S.kills = (S.kills || 0) + 1;
      var v = S.kills % 4;
      if (v === 0) { gtr(q, r + 7, 0.09, { layer: 'stg', k: 'x', vel: 0.42 }); gtr(q + 0.09, r + 12, 0.22, { layer: 'stg', k: 'x', vel: 0.5, scoop: true, vib: true }); }
      else if (v === 1) { sax(q, r + 7, 0.08, { layer: 'stg', k: 'x', vel: 0.5, honk: true }); sax(q + 0.09, r + 12, 0.16, { layer: 'stg', k: 'x', vel: 0.6, honk: true, growl: true }); }
      else if (v === 2) { scaleUp(r - 5, 5, tn.pcs).forEach(function (m, k2) { pno(q + k2 * 0.04, [m + 12], 0.15, 0.3 + 0.04 * k2, 'x'); }); play(q + 0.22, S.buf.rim, 'stg', 0.4, 0, 'x'); }
      else { play(q, S.buf.rim, 'stg', 0.5, 0, 'x'); play(q + 0.11, S.buf.tomL, 'stg', 0.6, 0, 'x'); play(q + 0.22, S.buf.crash, 'stg', 0.22, 0, 'x'); }     // «ba-dum-tss»
    } else if (name === 'hurt') {
      q = t + 0.01;
      sax(q, r - 2, 0.2, { layer: 'stg', k: 'x', vel: 0.6, honk: true, fall: 0.35, scoop: 0 });                          // «¡uah!» que cae medio tono mal afinado
      sax(q + 0.004, r - 8, 0.2, { layer: 'stg', k: 'x', vel: 0.45, honk: true, fall: 0.35 });
      pno(q, [r - 24, r - 17, r - 13, r - 10], 0.18, 0.4, 'x'); play(q, S.buf.rim, 'stg', 0.4, 0, 'x');
    } else if (name === 'horde') {
      q = t + 0.02;
      for (i = 0; i < 16; i++) play(q + i * 0.055, S.buf[i % 3 === 2 ? 'snare' : (i % 2 ? 'tomM' : 'tomH')], 'stg', 0.2 + i * 0.03, 0, 'x');
      gtr(q, r + 12, 1.1, { layer: 'stg', k: 'x', vel: 0.55, dive: 0.5, kind: 'twang' });                              // caída de palanca de guitarra surf
      organ(q + 0.9, [r, r + 1, r + 6], 0.45, { layer: 'stg', k: 'x', vel: 0.9 });
      play(q + 0.92, S.buf.crash, 'stg', 0.45, 0, 'x');
    } else if (name === 'death') {
      q = t + 0.02;
      sax(q, r, 1.1, { layer: 'stg', k: 'x', vel: 0.55, fall: 1.4, scoop: 80, vib: 10 }); sax(q + 0.005, r - 5, 1.1, { layer: 'stg', k: 'x', vel: 0.4, fall: 1.4, scoop: 80 });
      organ(q, [r - 12, r - 8, r - 5], 2.4, { type: 'salon', layer: 'stg', k: 'x', vel: 0.6 });
      gtr(q + 0.05, r - 12, 1.6, { layer: 'stg', k: 'x', vel: 0.5, dive: 0.6, kind: 'twang' });
      play(q, S.buf.tomL, 'stg', 0.5, 0, 'x'); play(q + 0.3, S.buf.crash, 'stg', 0.2, 0.85, 'x');
    } else if (name === 'win') {
      // final de rock and roll: redoble, acorde de séptima (B7), golpe de batería, y la última nota (Mi5) que se queda sonando
      q = nextStep(t);
      for (i = 0; i < 7; i++) play(q + i * 0.045, S.buf.snare, 'stg', 0.25 + i * 0.1, 0, 'x');
      var t1 = q + 0.38, t2 = t1 + 0.52;
      pno(t1, [M('B3'), M('D#4'), M('F#4'), M('A4')], 0.5, 0.7, 'x'); strum(t1, [M('B2'), M('F#3'), M('A3'), M('D#4'), M('F#4')], 'open', 0.8, false, 'stg', 0.5, 'x');
      sax(t1, M('F#4'), 0.4, { layer: 'stg', k: 'x', vel: 0.7, honk: true, growl: true }); bass(t1, M('B1'), 0.5, 0.9, 'walk', 'stg');
      play(t1, S.buf.kick, 'stg', 1, 0, 'x'); play(t1, S.buf.snare, 'stg', 0.9, 0, 'x'); play(t1, S.buf.crash, 'stg', 0.5, 0, 'x');
      strum(t2, [M('E2'), M('B2'), M('E3'), M('G#3'), M('B3'), M('E4')], 'open', 0.95, false, 'stg', 2.4, 'x');
      pno(t2, [M('E3'), M('B3'), M('E4'), M('G#4'), M('E5')], 2.0, 0.8, 'x'); organ(t2, [M('E3'), M('B3'), M('G#4')], 3.2, { type: 'salon', layer: 'stg', k: 'x', vel: 0.6 });
      bass(t2, M('E1'), 2.4, 1, 'walk', 'stg'); play(t2, S.buf.kick, 'stg', 1, 0, 'x'); play(t2, S.buf.crash, 'stg', 0.7, 0, 'x'); play(t2, S.buf.tomL, 'stg', 0.8, 0, 'x');
      gtr(t2 + 0.04, M('E5'), 4.8, { kind: 'last', layer: 'stg', k: 'x', vel: 0.62, vib: true, rel: 0.5 });
    } else if (name === 'cobrador') {
      q = nextStep(t);
      var doodle = [[0, 0.07], [4, 0.07], [7, 0.07], [11, 0.15], [7, 0.07], [4, 0.07], [0, 0.07], [4, 0.32]], tt = q;
      doodle.forEach(function (x, k2) { sax(tt, r + x[0], x[1] * 0.9, { layer: 'stg', k: 'x', vel: 0.55, honk: true, growl: k2 === 7 }); tt += x[1]; });
    } else if (name === 'boss.intro') {
      // el chef sale de la cocina: gong, acorde de Mi menor al fuzz, bajo que cae y redoble de wok
      q = t + 0.02;
      play(q, lazy('gong'), 'stg', 0.95, 0, 'x'); play(q, S.buf.crash, 'stg', 0.5, 0, 'x'); play(q, S.buf.kick, 'stg', 1, 0, 'x'); play(q, S.buf.tomL, 'stg', 0.8, 0, 'x');
      pwr(q + 0.05, M('E2'), 1.2, { layer: 'stg', k: 'x', vel: 0.9 }); bass(q, M('E1'), 1.7, 1, 'pick', 'stg');
      [M('B3'), M('A3'), M('G3'), M('E3')].forEach(function (m, k2) { gtr(q + 0.55 + k2 * 0.22, m, 0.2, { kind: 'fuzz', layer: 'stg', k: 'x', vel: 0.8, rel: 0.08 }); });
      for (i = 0; i < 8; i++) play(q + 1.45 + i * 0.05, S.buf[i % 2 ? 'wokL' : 'wokH'], 'stg', 0.25 + i * 0.08, 0, 'x');
    } else if (name === 'boss.down') {
      // cayó el chef: gong grave, acorde de victoria en Mi mayor y la nota final de guitarra
      q = t + 0.02;
      play(q, lazy('gong'), 'stg', 0.9, 0.8, 'x'); sax(q, M('B4'), 0.35, { layer: 'stg', k: 'x', vel: 0.5, fall: 0.5, scoop: 40 });
      var tw = q + 0.9;
      strum(tw, [M('E2'), M('B2'), M('E3'), M('G#3'), M('B3'), M('E4')], 'open', 0.9, false, 'stg', 1.6, 'x');
      scaleUp(M('E3'), 9, [4, 6, 8, 9, 11, 1, 3]).forEach(function (m, k2) { pno(tw - 0.3 + k2 * 0.035, [m], 0.3, 0.3 + 0.04 * k2, 'x'); });
      organ(tw, [M('E4'), M('G#4'), M('B4')], 0.8, { layer: 'stg', k: 'x', vel: 0.8 }); bass(tw, M('E1'), 1.5, 1, 'walk', 'stg');
      play(tw, S.buf.kick, 'stg', 1, 0, 'x'); play(tw, S.buf.crash, 'stg', 0.7, 0, 'x'); play(tw, S.buf.snare, 'stg', 0.8, 0, 'x');
      gtr(tw + 0.04, M('E5'), 2.4, { kind: 'twang', layer: 'stg', k: 'x', vel: 0.6, vib: true, rel: 0.3 });
    } else if (name === 'gong') {
      play(t + 0.01, lazy('gong'), 'stg', 0.9, 0, 'x');                          // un gong suelto (pedible desde el juego)
    } else if (name === 'cv.gol') {
      // «¡GOOOL!»: redoble, platillo y la fanfarria de trompeta al estilo de estadio
      q = t + 0.02;
      for (i = 0; i < 6; i++) play(q + i * 0.05, S.buf.snare, 'stg', 0.2 + i * 0.1, 0, 'x');
      play(q + 0.3, S.buf.crash, 'stg', 0.7, 0, 'x'); play(q + 0.3, S.buf.kick, 'stg', 1, 0, 'x');
      [[0, 0.12], [0.14, 0.12], [0.28, 0.5]].forEach(function (x2, k2) { sax(q + 0.3 + x2[0], M('G4') + (k2 === 2 ? 4 : 0), x2[1], { layer: 'stg', k: 'x', vel: 0.6, honk: true, growl: k2 === 2 }); });
      strum(q + 0.3, [M('G2'), M('D3'), M('G3'), M('B3'), M('D4')], 'open', 0.8, false, 'stg', 1.2, 'x');
    }
  }

  // =========================================================================================================
  // API
  function init(ctx, out, reverbSend, offline, mood, I, boss) {
    seed = 20261118;
    S = { ctx: ctx, sr: ctx.sampleRate, cache: {}, queue: [], live: [], offline: !!offline, vnow: 0, log: [], bars: [], saved: {}, stgLast: {}, I: I, mood: mood, boss: offline ? !!boss : wantBoss, paused: false,
          late: 0, dropped: 0, maxGap: 0, lastTick: 0, resyncs: 0, sw: [], entering: false, fresh: true,
          lx: offline ? 240 : gLX, ly: offline ? 135 : gLY, lisSet: offline || gLSet,
          nTarget: !offline && wantNight ? 1 : 0, nFrom: !offline && wantNight ? 1 : 0, nT0: 0, nTc: 0.001, level: wantLevel,
          zone: offline ? 'malecon' : wantZone, dirt: offline ? 0 : wantDirt, ov: offline ? null : wantOv, auto: !offline && wantAuto, autoT: 0 };
    S.n = build(ctx, out, reverbSend || null);
    buildSamples(); buildSea();
    warm('explore'); ks(M('E5'), 'last');
    buildBand();
    var t = now() + 0.08;
    S.n.trim.gain.setValueAtTime(0, now()); S.n.trim.gain.linearRampToValueAtTime(TRIM, t + 0.9);        // fundido de entrada
    S.key = keyFor(mood === 'paused' ? 'title' : mood); S.piece = PIECES[S.key]; S.bar = 0; S.nextBar = t;
    if (S.key !== 'explore' && S.key !== 'title') warm(S.key);
    S.cur = { t0: t, bd: 240 / S.piece.bpm, u: 60 / S.piece.bpm, sw: S.piece.sw };
    applyFx(S.key, t, 0.05); applyNight(now(), 0.001);
    S.log.push({ t: t, key: S.key, from: null });
    if (mood === 'paused') setPaused(true);
    if (!offline && wantBand) bandSet(wantBand.x, wantBand.y, wantBand.on, 'fade');
    if (!offline) { S.warmList = ['larco', 'chase', 'horde', 'boss', 'caida', 'heroe']; S.warmTimer = setTimeout(function wl() { if (!S || !S.warmList) return; var k = S.warmList.shift(); if (k) { try { warm(k); } catch (e) { /* nada */ } } if (S && S.warmList.length) S.warmTimer = setTimeout(wl, 60); }, 400); }
    else { ['larco', 'chase', 'horde', 'boss', 'caida', 'heroe'].forEach(warm); }
  }
  // zona de explore y suciedad de Larcomar; tema pedido por nombre; autodetección por la posición de Alexander
  function setZoneS(z) {
    z = z === 'larcomar' ? 'larcomar' : 'malecon';
    if (!S || S.offline) { if (!S) wantZone = z; }
    if (!S) return;
    if (S.zone === z) return;
    S.zone = z;
    if (!S.offline) wantZone = z;
    applyFx(S.key, now(), 0.3);
    requestMood();
  }
  function setDirtS(d) {
    d = clamp(+d || 0, 0, 1);
    if (!S) { wantDirt = d; return; }
    if (!S.offline) wantDirt = d;
    if (Math.abs(S.dirt - d) < 0.005) return;
    S.dirt = d;
    if (S.key === 'larco') applyFx('larco', now(), 0.5);
  }
  function autoZone() {
    var G = ACH.G || (ACH.game && ACH.game.G), nv = ACH.nivel;
    if (!G || !G.player || !nv || nv.id !== 'costaverde' || typeof G.player.y !== 'number') return;
    var y = G.player.y, inL = S.zone === 'larcomar', lim = inL ? CFG.y0 - CFG.hys : CFG.y0;
    var z = y >= lim ? 'larcomar' : 'malecon';
    setZoneS(z); setDirtS(z === 'larcomar' ? clamp((y - CFG.y0) / (CFG.y1 - CFG.y0), 0, 1) : 0);
  }
  function cvPlayS(id) {
    id = String(id || '').replace(/^cv\./, '');
    if (id === 'malecon' || id === 'larcomar') { wantAuto = false; if (S) S.auto = false; setZoneS(id); engine.cvStop(); return true; }
    if (!OVERRIDES[id]) return false;
    if (!S || !S.offline) wantOv = id;
    if (!S) return true;
    S.ov = id;
    requestMood();
    return true;
  }
  function cvStopS() {
    if (!S || !S.offline) wantOv = null;
    if (!S) return;
    if (!S.ov) return;
    S.ov = null;
    requestMood();
  }
  // pausa: un solo paso bajo. Si el motor ya filtra el bus de música (A._nodes.pauseLP), aquí solo se baja el volumen. engine.pauseFilter: null = automático.
  function pauseFilterOn() {
    var pf = engine.pauseFilter;
    if (pf === true || pf === false) return pf;
    if (S.offline) return true;
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
  function humStats() { return null; }
  var MOODS = ['title', 'explore', 'chase', 'horde', 'paused', 'dead', 'won'];
  var engine = {
    pauseFilter: null,                         // null: automático (no filtra si el motor ya filtra la música en pausa)
    start: function (ctx, out, reverbSend) {
      try {
        if (S) engine.stop(true);
        init(ctx, out, reverbSend, false, wantMood, wantI);
        S.timer = setInterval(tick, 25);       // el primer tick llega en <25 ms; la primera barra está a 80 ms
      } catch (e) { if (typeof console !== 'undefined') console.warn('surf: no arrancó', e); S = null; }
    },
    // ánimos: title | explore | chase | horde | paused | dead | won. Cambia en el siguiente tiempo (<= ~0,5 s).
    setMood: function (m) {
      if (typeof m === 'string' && m.indexOf('cv.') === 0) { if (m === 'cv.off' || m === 'cv.stop') cvStopS(); else cvPlayS(m); return; }
      if (MOODS.indexOf(m) < 0) return;
      if (!S) { wantMood = m; return; }
      if (m === 'paused') { setPaused(true); return; }
      if (S.paused) setPaused(false);
      if (!S.offline) wantMood = m;
      S.mood = m;
      try { requestMood(); } catch (e) { if (S.offline) throw e; }
    },
    setIntensity: function (v) {
      v = Math.max(0, Math.min(1, +v || 0));
      if (!S || !S.offline) wantI = v;
      if (S) S.I = v;
    },
    // jefa: con setBoss(true) y ánimo horde entra el motivo de la jefa (riff cromático + pregón de órgano); con false vuelve al garaje
    setBoss: function (on) {
      on = !!on;
      if (!S || !S.offline) wantBoss = on;
      if (!S) return;
      S.boss = on;
      try { requestMood(); } catch (e) { if (S.offline) throw e; }
    },
    boss: function () { return S ? !!S.boss : wantBoss; },
    // Costa Verde: zona de explore ('malecon' | 'larcomar'), suciedad 0..1 de Larcomar, tema por nombre (chef | caida | heroe), autodetección
    setZone: function (z) { if (!S || !S.offline) { wantAuto = false; if (S) S.auto = false; } try { setZoneS(z); } catch (e) { if (S && S.offline) throw e; } },
    zone: function () { return S ? S.zone : wantZone; },
    setDirt: function (d) { if (!S || !S.offline) { wantAuto = false; if (S) S.auto = false; } try { setDirtS(d); } catch (e) { if (S && S.offline) throw e; } },
    dirt: function () { return S ? +S.dirt.toFixed(3) : wantDirt; },
    auto: function (on) { if (on === undefined) return S ? !!S.auto : wantAuto; on = !!on; wantAuto = on; if (S && !S.offline) { S.auto = on; S.autoT = 0; } return on; },
    cvPlay: function (id) { try { return cvPlayS(id); } catch (e) { if (S && S.offline) throw e; return false; } },
    cvStop: function () { try { cvStopS(); } catch (e) { if (S && S.offline) throw e; } },
    cvPlaying: function () { return S ? S.ov : wantOv; },
    cfg: CFG,
    stinger: function (name) { if (S) { try { stingerNow(name); } catch (e) { if (S.offline) throw e; } } },
    // variante nocturna: fundido de ~8 s (secs = 0: al instante). Si la música aún no arrancó, se recuerda.
    setNight: function (on, secs) {
      on = !!on;
      if (!S || !S.offline) wantNight = on;
      if (!S) return;
      try { setNightS(on, secs); } catch (e) { if (S.offline) throw e; }
    },
    night: function () { return S ? +nightAt(now()).toFixed(3) : (wantNight ? 1 : 0); },
    // el motor llama a setLevel('gambetta' | 'cerro') si el juego lo pide: Miraflores solo tiene una música; se acepta y se ignora
    setLevel: function (id) { wantLevel = id; if (S) S.level = id; },
    level: function () { return S ? S.level : wantLevel; },
    // combo de la calle en (x, y): sax, guitarra, bajo y escobillas. on=false: se va con fundido; mode 'cut': se calla de golpe.
    diegetic: function (x, y, on, mode) {
      on = !!on;
      if (!S || !S.offline) wantBand = on ? { x: x, y: y, on: true } : null;
      if (!S) return;
      try { bandSet(x, y, on, mode); } catch (e) { if (S.offline) throw e; }
    },
    setListener: function (x, y) {
      if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) return;
      if (!S || !S.offline) { gLX = x; gLY = y; gLSet = true; }
      if (S) { S.lx = x; S.ly = y; S.lisSet = true; try { bandSpatial(false); } catch (e) { /* nada */ } }
    },
    band: function () {
      var B = S && S.B;
      if (!B) return null;
      return { state: B.state, x: B.x, y: B.y, dist: Math.round(B.d), gain: +B.g.toFixed(3), duckDb: +B.duckDb.toFixed(2), bar: B.bar, queued: B.queue.length, late: B.late, dropped: B.dropped, cuts: B.cuts, starts: B.starts, hum: humStats() };
    },
    stop: function (quick) {
      if (!S) return;
      var s = S; S = null;
      clearInterval(s.timer); clearTimeout(s.warmTimer);
      try {
        var t = s.offline ? s.vnow : s.ctx.currentTime;
        s.n.trim.gain.cancelScheduledValues(t); s.n.trim.gain.setTargetAtTime(0, t, quick ? 0.02 : 0.12);
        setTimeout(function () { try { s.n.trim.disconnect(); s.n.sg.disconnect(); s.n.tlfo.stop(); s.n.ovib.stop(); s.n.llfo.stop(); s.n.cvib.stop(); s.n.eplfo.stop(); s.n.seaLfo.stop(); s.n.seaSrc.stop(); } catch (e) { /* nada */ } }, quick ? 150 : 900);
      } catch (e) { /* nada */ }
    },
    state: function () {
      return S ? { night: +nightAt(now()).toFixed(3), mood: S.mood, key: S.key, piece: S.piece.name, boss: !!S.boss, zone: S.zone, dirt: +S.dirt.toFixed(3), ov: S.ov, auto: !!S.auto, bar: S.bar, intensity: S.I, paused: S.paused, queued: S.queue.length, live: S.live.length,
                   late: S.late, dropped: S.dropped, resyncs: S.resyncs, maxGap: +S.maxGap.toFixed(3), t: now(), band: S.B ? S.B.state : 'off', bpm: S.cur ? +(240 / S.cur.bd).toFixed(1) : 0, switches: (S.sw || []).slice(-8) } : null;
    },
    // Render sin reloj real: script = [{t, mood|intensity|stinger|night|secs|boss|band:{x,y,on,mode}|listener:{x,y}}], dt fijo. Solo con OfflineAudioContext; no toca el motor en vivo.
    _offline: function (ctx, out, reverbSend, script, dur) {
      var r = engine._offlineBegin(ctx, out, reverbSend, script);
      r.advance(dur);
      return r.end();
    },
    _offlineBegin: function (ctx, out, reverbSend, script) {
      if (!isOffline(ctx)) throw new Error('musicEngine._offline: solo con OfflineAudioContext');
      script = (script || []).slice().sort(function (a, b) { return a.t - b.t; });
      var first = script.length && script[0].t === 0 && script[0].mood ? script.shift() : null;
      var live = S, me;
      try { init(ctx, out, reverbSend, true, first ? first.mood : 'explore', first && first.intensity !== undefined ? first.intensity : 0, first && first.boss); me = S; if (first && first.night) { setNightS(true, 0); }
        if (first && (first.zone || first.dirt !== undefined || first.play)) { if (first.zone) S.zone = first.zone === 'larcomar' ? 'larcomar' : 'malecon'; if (first.dirt !== undefined) S.dirt = clamp(+first.dirt || 0, 0, 1); if (first.play && OVERRIDES[first.play]) S.ov = first.play; S.key = keyFor(S.mood); S.piece = PIECES[S.key]; warm(S.key); S.cur = { t0: S.nextBar, bd: 240 / S.piece.bpm, u: 60 / S.piece.bpm, sw: S.piece.sw }; applyFx(S.key, now(), 0.05); } }
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
                if (c.solo) { var sl = c.solo === true ? [] : [].concat(c.solo); Object.keys(S.n.L).forEach(function (k) { S.n.L[k].fade.gain.value = sl.indexOf(k) >= 0 || !sl.length ? LAYERS[k].vol : 0; }); }
                if (c.intensity !== undefined) engine.setIntensity(c.intensity);
                if (c.boss !== undefined) engine.setBoss(c.boss);
                if (c.zone) engine.setZone(c.zone);
                if (c.dirt !== undefined) engine.setDirt(c.dirt);
                if (c.play) engine.cvPlay(c.play);
                if (c.stop) engine.cvStop();
                if (c.mood) engine.setMood(c.mood);
                if (c.stinger) engine.stinger(c.stinger);
                if (c.night !== undefined) engine.setNight(c.night, c.secs);
                if (c.listener) engine.setListener(c.listener.x, c.listener.y);
                if (c.band) engine.diegetic(c.band.x, c.band.y, c.band.on, c.band.mode);
              }
              tick();
            }
          } finally { S = prev; }
        },
        end: function () { return { log: me.log.slice(), bars: me.bars.slice(), sw: me.sw.slice(), late: me.late, dropped: me.dropped, resyncs: me.resyncs }; }
      };
    },
    _with: function (ctx, out, fn) {   // pruebas: tocar instrumentos sueltos (solo OfflineAudioContext)
      if (!isOffline(ctx)) throw new Error('musicEngine._with: solo con OfflineAudioContext');
      var live = S;
      try {
        init(ctx, out, null, true, 'explore', 0);
        S.n.trim.gain.cancelScheduledValues(0); S.n.trim.gain.value = TRIM;
        fn({ gtr: gtr, sax: sax, organ: organ, pno: pno, bass: bass, coro: coro, strum: strum, pwr: pwr, play: play, buf: S.buf, M: M, S: function () { return S; } });
      } finally { S = live; }
    },
    _pieces: PIECES,
    _layers: LAYERS,
    _theory: function () { return { MAL_CH: MAL_CH, MAL_MEL: MAL_MEL, LAR_CH: LAR_CH, LAR_MEL: LAR_MEL, SCH_CH: SCH_CH, SCH_MEL: SCH_MEL, SHD_CH: SHD_CH, SHD_MEL: SHD_MEL, CHF_CH: CHF_CH, CHF_MEL: CHF_MEL, CAI_CH: CAI_CH, CAI_MEL: CAI_MEL, HER_CH: HER_CH, HER_MEL: HER_MEL, chord: chord, isTone: isTone, segs: segs, M: M }; }
  };
  A.musicEngine = engine;

  // ---------------------------------------------------------------------------------------------------------
  // ACH.audio.cv - atajo para pedir los temas de Costa Verde. Todo funciona aunque el audio aún esté bloqueado (se recuerda y suena al desbloquear).
  //   cv.play("chef" | "caida" | "heroe")   toca ese tema (con o sin prefijo «cv.») sobre cualquier ánimo; setMood/setIntensity del juego siguen funcionando pero no lo cambian.
  //                                          cv.play("malecon" | "larcomar") fija la zona de explore y apaga la autodetección. Devuelve true si el tema existe.
  //   cv.stop()                              quita el tema por nombre y vuelve al ánimo del juego (en el siguiente tiempo, con la anacrusa de siempre).
  //   cv.playing()                           id del tema activo o null.
  //   cv.setZone("malecon" | "larcomar")     zona de explore (solo suena en el ánimo explore). cv.setDirt(0..1): suciedad de la bossa de Larcomar (ingreso 0, arena del chifa 1).
  //                                          Ambos apagan la autodetección; cv.auto(true) la reactiva.
  //   cv.auto(on)                            autodetección: con ACH.nivel.id === "costaverde", y de Alexander (ACH.G.player.y) >= cv.cfg.y0 (fila 36) = Larcomar; suciedad = (y - y0) / (y1 - y0).
  //   cv.info()                              {playing, zone, dirt, auto, state}
  // Si el nivel prefiere el estilo de rock.js (setBoss), con setBoss(true) en ánimo horde o chase toca el tema del chef igual que cv.play("chef").
  A.cv = A.cv || {};
  A.cv.themes = ["malecon", "larcomar", "chef", "caida", "heroe"];
  A.cv.play = function (id, o) { return engine.cvPlay(id, o); };
  A.cv.stop = function () { engine.cvStop(); };
  A.cv.playing = function () { return engine.cvPlaying(); };
  A.cv.setZone = function (z) { engine.setZone(z); };
  A.cv.setDirt = function (d) { engine.setDirt(d); };
  A.cv.zone = function () { return engine.zone(); };
  A.cv.dirt = function () { return engine.dirt(); };
  A.cv.auto = function (on) { return engine.auto(on); };
  A.cv.cfg = CFG;
  A.cv.info = function () { var st = engine.state(); return { playing: engine.cvPlaying(), zone: engine.zone(), dirt: engine.dirt(), auto: engine.auto(), state: st }; };
})();
