/* ACHORADO - js/barranco/criolla.js  (B3, nivel Barranco: playa al atardecer → Bajada de Baños → Puente → Ermita → Parque → calles bohemias → peña de Don Jaranón)
 * Música criolla de peña, ORIGINAL y 100 % sintetizada con Web Audio (sin samples, sin melodías ni letras reconocibles): guitarra criolla de nailon con bordones y contracanto (Karplus-Strong),
 * cajón peruano (grave + slap + tapa), quijada, cajita, palmas, checo, coro tarareado y, de fondo, olas, murmullo y aplausos de peña. Reemplaza a js/costaverde/surf.js en barranco.html:
 * se registra en el mismo lugar (ACH.audio.musicEngine) y tiene la MISMA API (start, setMood, setIntensity, stinger, setNight, night, diegetic, setListener, band, stop, state, setLevel,
 * setBoss, pauseFilter, _offline/_offlineBegin/_with). Parte del motor de surf.js (mismo secuenciador, mismas capas, mismo limitador a -3,2 dBFS); los temas son nuevos.
 *
 * RELOJ DE COMPÁS (lo usan el jefe, el cajón y el Landó del Contrapunto)
 *   ACH.audio.br.beat() → { bpm, meter, beat, phase, bar, beatInBar, toNext, src:'audio', key, piece, boss, barInPiece, pulse, t, latency } o null (si no hay música sonando)
 *     · «pulso» = la unidad del tema: la negra en el vals (meter 3); la negra con puntillo en el festejo 6/8 (meter 2) y en el landó 12/8 (meter 4). bpm = pulsos por minuto.
 *     · beat = nº de pulso REAL desde que arrancó la música (no se reinicia al cambiar de tema); bar = nº de compás, igual; beatInBar 0..meter-1; phase 0..1 dentro del pulso;
 *       toNext = segundos hasta el próximo pulso; pulse = duración del pulso en s.
 *     · Sale del MISMO programador de notas (ctx.currentTime del que oye el jugador: se descuenta la latencia de salida, ctx.outputLatency/baseLatency). Las notas fuertes del cajón y la cajita
 *       caen EXACTAMENTE en el pulso (sin humanización). Calibración fina: ACH.audio.br.offset (s; + = el pulso se lee más tarde).
 *   ACH.audio.br.onTime(tol = 0.12) → true si ahora está a ≤ tol s de un pulso.
 *
 * ÁNIMOS DEL JUEGO (los que ya pide game.js; setIntensity 0..1 = avance por el mapa)
 *   explore  por zona (ACH.world.zona(x,y), autodetección con ACH.nivel.id === 'barranco', o br.setZone):
 *       playa            «Playa al atardecer»   vals criollo suave, 3/4, 92 bpm, La menor → Do; guitarra, bordones y olas. Contracanto desde 0,35 · cajón suave 0,55 · palmas 0,75
 *       bajada/puente/ermita «Bajada de Baños»  vals con contracanto y toques de festejo suave (cajón en hemiola), 3/4, 104 bpm, Re menor → Fa
 *       parque           «Parque Municipal»     vals alegre en Sol mayor, 3/4, 108 bpm, con contracanto y cajón más temprano
 *       bohemia/pena     «Calles bohemias»      de noche: peña lejana mezclada (guitarra y cajón al fondo, murmullo, aplausos), 3/4, 84 bpm, Si menor. Más cerca de la peña = se abre
 *   chase    «Corre, que se arma la jarana»  festejo rápido, 6/8, 138 bpm (pulso = negra con puntillo), Mi menor; cajón, quijada, cajita, palmas, checo
 *   horde    «Landó de los muertos»           landó oscuro y pesado, 12/8, 72 bpm, Re menor; bordones graves, cajón grueso, quijada lenta, coro grave
 *   title = la playa con la mezcla fija · dead = lamento de guitarra · won = silencio (el stinger `win` trae el final)
 *
 * TEMAS POR NOMBRE (ACH.audio.br.play(id); se pisan sobre cualquier ánimo hasta br.stop())
 *   jefe1  «Vals de la Voz de Oro»   3/4, 100 bpm, Sol menor · jefe2 «Festejo en la pista»  6/8, 108 bpm (pulso), La menor, br.setTempoMul(m) · jefe3 «Landó del pecho»  12/8, 66 bpm, Mi menor
 *   final  «La última jarana»        vals lento, 3/4, 66 bpm, Sol mayor, guitarra y «mmm» tarareado  ·  deseo = jingle corto sobre la música (no la corta)
 *   también chase, horde, playa, bajada, parque, bohemia (por nombre); 'explore' / zonas fijan la zona y quitan el tema pedido.
 *   API pública (también en ACH.audio.br): play(id[, {now}]) · stop() · playing() · setZone(z) · zone() · auto(on) · setNear(0..1) · setTempoMul(m) / tempoMul() · setLayerMute('cajon'|…, on)
 *     · silence(on, secs) (fundido a silencio sin cambiar de tema) · beat() · onTime(tol) · info() · themes[] · zones[]
 *   Cambio de ánimo/tema: en el siguiente pulso (≤ ~0,5–0,9 s) con anacrusa de cajón; entre temas de exploración (zona), en el siguiente compás sin cortar las colas. Con {now:true}, en 60 ms.
 *   setBoss(true): con horde/chase toca jefe1 (el jefe nuevo pide sus temas con play()).
 * Salida: compresor + limitador + recorte suave con techo en -3,2 dBFS (nunca pasa de 0,69).
 * Pruebas: _offline(ctx, out, reverbSend, script, dur) / _offlineBegin(...) con OfflineAudioContext, script {t, mood, intensity, stinger, night, secs, boss, zone, play, stop, tempo, solo, mute, near, listener, band}.
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
    if (!r) throw new Error('criolla.js: nota mal escrita ' + name);
    return 12 * (+r[3] + 1) + PC[r[1]] + (r[2] === '#' ? 1 : r[2] === 'b' ? -1 : 0);
  }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // línea: "inicio:nota:dur[flags]" con inicio y duración en PULSOS (la unidad del tema); notas juntas con +
  // flags: ~ = sube arrastrando desde abajo, v = vibrato, ! = acento, . = picado
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

  var Q = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], dim: [0, 3, 6, 9], '5': [0, 7] };
  var chordCache = {};
  function chord(sym) {
    if (chordCache[sym]) return chordCache[sym];
    var r = /^([A-G])([#b]?)(.*)$/.exec(sym);
    var root = (PC[r[1]] + (r[2] === '#' ? 1 : r[2] === 'b' ? -1 : 0) + 12) % 12;
    var pcs = Q[r[3]].map(function (i) { return (root + i) % 12; });
    return (chordCache[sym] = { root: root, pcs: pcs, sym: sym, q: r[3] });
  }
  function isTone(c, m) { return c.pcs.indexOf(((m % 12) + 12) % 12) >= 0; }
  function inPcs(pcs, m) { return pcs.indexOf(((m % 12) + 12) % 12) >= 0; }
  function rootIn(c, lo) { var m = lo; while (((m % 12) + 12) % 12 !== c.root) m++; return m; }
  function voicing(c, lo, n) { var out = [], k = lo; while (out.length < n) { if (isTone(c, k)) out.push(k); k++; } return out; }
  function fitBord(m) { while (m > 52) m -= 12; while (m < 40) m += 12; return m; }          // bordones: de Mi2 a Mi3
  function segs(def, nb) {                                  // un símbolo = todo el compás; dos = medio compás cada uno
    if (typeof def === 'string') return [{ ch: chord(def), s: 0, e: nb }];
    var w = nb / def.length;
    return def.map(function (s, i) { return { ch: chord(s), s: i * w, e: (i + 1) * w }; });
  }
  function firstSym(def) { return typeof def === 'string' ? def : def[0]; }
  function chordAtBeat(sg, beat) { for (var i = sg.length - 1; i >= 0; i--) if (beat >= sg[i].s - 1e-6) return sg[i].ch; return sg[0].ch; }
  // tercera (o sexta) por debajo, sobre un tono del acorde o de la escala: el contracanto «en terceras» de la guitarra segunda
  function third(m, ch, pcs) {
    var offs = [-3, -4, -8, -9, -5, -7], i, c;
    for (i = 0; i < 4; i++) { c = m + offs[i]; if (isTone(ch, c)) return c; }
    for (i = 0; i < offs.length; i++) { c = m + offs[i]; if (inPcs(pcs, c)) return c; }
    return m - 4;
  }

  // ---------------------------------------------------------------------------------------------------------
  // estado
  var S = null;               // todo lo que vive mientras suena
  var wantMood = 'title', wantI = 0, wantBoss = false, wantNight = false, wantLevel = 'barranco', wantBand = null;
  var wantZone = 'playa', wantNear = null, wantOv = null, wantAuto = true, wantTM = 1, wantSilence = 0, wantMute = {};
  var CFG = { every: 0.4 };                    // autodetección de zona cada 0,4 s
  var gLX = 240, gLY = 135, gLSet = false;     // oyente (centro de cámara) del juego en vivo

  function now() { return S.offline ? S.vnow : S.ctx.currentTime; }
  // la noche: N(t) = objetivo + (desde - objetivo) * e^(-(t - t0) / tc); tc = segundos / 3 (95 % a los 8 s)
  function nightAt(t) { if (!S) return 0; var d = t - S.nT0; return d <= 0 ? S.nFrom : S.nTarget + (S.nFrom - S.nTarget) * Math.exp(-d / S.nTc); }
  var NM = { lead: 0.88, contra: 0.85, rhy: 0.85, palmas: 0.8, cajon: 0.92, perc: 0.9 };          // de noche, lo que se apaga un poco

  // ---------------------------------------------------------------------------------------------------------
  // DSP en JS para muestras precalculadas (percusión, guitarra Karplus-Strong)
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
  // cajón peruano: caja de madera con tapa que vibra y bordones (cuerdas de caja) pegados por dentro
  function wires(d, amt, tau) {        // el zumbido de los bordones del cajón (ruido agudo que decae)
    var sr = S.sr, n = d.length, w = noise(n), i; biq(w, 'hp', 3800, 0.7, sr); biq(w, 'lp', 9500, 0.7, sr);
    for (i = 0; i < n; i++) d[i] += amt * w[i] * Math.exp(-i / sr / tau) * Math.min(1, i / sr / 0.002);
    return d;
  }
  function cajonBass() {               // golpe al centro: golpe grave de caja de madera + un poco de zumbido
    var sr = S.sr, d = drum(76, 0.36, [[1, 1, 0.13], [1.85, 0.22, 0.05], [2.7, 0.1, 0.03]], 0.8, [0.2, 650, 0.8, 0.03]);
    return norm(wires(d, 0.09, 0.07), 0.9);
  }
  function cajonSlap(dur, amt) {       // golpe de palma arriba, cerca del borde: seco, con la tapa y los bordones
    var sr = S.sr, n = Math.ceil(dur * sr), d = noise(n), i;
    biq(d, 'bp', 1900, 0.8, sr); biq(d, 'hp', 800, 0.7, sr);
    for (i = 0; i < n; i++) { var t = i / sr; d[i] = d[i] * Math.exp(-t / (0.03 * amt)) * Math.min(1, t / 0.0006) + 0.55 * Math.sin(2 * Math.PI * 320 * t) * Math.exp(-t / (0.022 * amt)) + 0.3 * Math.sin(2 * Math.PI * 145 * t) * Math.exp(-t / (0.04 * amt)); }
    return norm(wires(d, 0.35, 0.05 * amt), 0.9);
  }
  function cajonTok() { return toBuf(norm(wires(drum(430, 0.13, [[1, 1, 0.032], [2.3, 0.4, 0.015]], 0.2, [0.4, 1800, 1.1, 0.01]), 0.15, 0.03), 0.9)); }
  // cajita: tablita de madera (dos tonos)
  function cajita(f) { return toBuf(drum(f, 0.1, [[1, 1, 0.015], [2.7, 0.5, 0.008], [4.1, 0.25, 0.005]], 0, [0.35, f * 2, 1.2, 0.006])); }
  // quijada de burro: golpe en la mandíbula + los dientes sueltos que vibran (cascabeleo); `scrape` = raspado de una baqueta por los dientes (clics que se aceleran)
  function quijadaBuf(scrape) {
    var sr = S.sr, dur = scrape ? 0.3 : 0.55, n = Math.ceil(dur * sr), d = new Float32Array(n), i, j;
    function click(t0, amp, f) {
      var i0 = Math.floor(t0 * sr), len = Math.floor(0.004 * sr);
      for (var k = 0; k < len && i0 + k < n; k++) d[i0 + k] += amp * Math.sin(2 * Math.PI * f * k / sr) * Math.exp(-k / sr / 0.0011) + amp * 0.5 * (rnd() * 2 - 1) * Math.exp(-k / sr / 0.0007);
    }
    if (scrape) {
      var t = 0.005, rate = 38;
      while (t < 0.26) { var u = t / 0.26; click(t, 0.8 * Math.sin(Math.PI * Math.min(1, u * 1.1 + 0.05)), 2600 + 700 * rnd()); rate = 38 + 70 * u; t += (1 / rate) * (0.8 + 0.4 * rnd()); }
    } else {
      for (i = 0; i < Math.floor(0.05 * sr); i++) d[i] += 0.8 * Math.sin(2 * Math.PI * 190 * i / sr) * Math.exp(-i / sr / 0.014);
      var nz = noise(Math.floor(0.03 * sr)); biq(nz, 'bp', 1400, 1.0, sr);
      for (i = 0; i < nz.length; i++) d[i] += 0.5 * nz[i] * Math.exp(-i / sr / 0.008);
      var tt = 0.012, k2 = 0;
      while (tt < 0.5) { click(tt, 0.8 * Math.exp(-tt / 0.17), 2300 + 900 * rnd()); tt += (1 / 62) * (0.7 + 0.6 * rnd()); k2++; }
    }
    biq(d, 'hp', 400, 0.7, sr);
    return norm(d, 0.9);
  }
  // huevito/checo (calabaza con semillas): ráfaga de ruido agudo con ataque lento
  function shakerBuf(dur) {
    var sr = S.sr, n = Math.ceil(dur * sr), d = noise(n), i;
    biq(d, 'hp', 5000, 0.7, sr); biq(d, 'bp', 8500, 0.5, sr);
    for (i = 0; i < n; i++) { var t = i / sr; d[i] *= Math.min(1, t / 0.012) * Math.exp(-t / (dur * 0.35)); }
    return norm(d, 0.9);
  }
  function clapBuf(soft) {             // palmas: ráfagas encimadas, cola corta de sala
    var sr = S.sr, n = Math.ceil(0.34 * sr), d = new Float32Array(n), i, k, off = [0, 0.007, 0.0135, 0.021, 0.03];
    for (k = 0; k < off.length; k++) {
      var nz = noise(n); biq(nz, 'bp', (soft ? 1100 : 1500) + 220 * k, 1.1, sr); biq(nz, 'hp', 600, 0.7, sr);
      var i0 = Math.floor(off[k] * sr), tau = k === off.length - 1 ? 0.11 : 0.009;
      for (i = i0; i < n; i++) d[i] += nz[i] * Math.exp(-(i - i0) / sr / tau) * Math.min(1, (i - i0) / sr / 0.0006) * (k === off.length - 1 ? 0.8 : 1);
    }
    if (soft) biq(d, 'lp', 3600, 0.7, sr);
    return norm(d, 0.9);
  }
  // aplausos de peña: muchas palmas sueltas que se espesan y se apagan (2,6 s)
  function applauseBuf() {
    var sr = S.sr, dur = 2.6, n = Math.ceil(dur * sr), d = new Float32Array(n), i, j, hits = 170;
    for (j = 0; j < hits; j++) {
      var u = rnd(), t0 = dur * (0.04 + 0.9 * Math.pow(u, 1.5)), dens = Math.sin(Math.PI * Math.min(1, t0 / dur)) * (1 - 0.3 * t0 / dur);
      if (rnd() > 0.35 + 0.65 * dens) continue;
      var i0 = Math.floor(t0 * sr), len = Math.floor(0.022 * sr), amp = (0.3 + 0.7 * rnd()) * (0.5 + dens), f = 1200 + 1600 * rnd();
      for (i = 0; i < len && i0 + i < n; i++) d[i0 + i] += amp * (rnd() * 2 - 1) * Math.exp(-i / sr / 0.005) * (0.6 + 0.4 * Math.sin(2 * Math.PI * f * i / sr));
    }
    biq(d, 'bp', 2100, 0.55, sr); biq(d, 'hp', 500, 0.7, sr);
    for (i = 0; i < n; i++) { var t = i / sr; d[i] *= Math.min(1, t / 0.18) * Math.min(1, (dur - t) / 0.8); }
    return norm(d, 0.9);
  }
  // campana pequeña / gong de peña (bronce): parciales inarmónicos
  function bellBuf(f, dur, tau) {
    var sr = S.sr, n = Math.ceil(dur * sr), d = new Float32Array(n), R = [1, 2.76, 5.4, 8.9, 1.008], G = [1, 0.5, 0.25, 0.1, 0.7], i, k;
    for (i = 0; i < n; i++) { var t = i / sr, y = 0; for (k = 0; k < 5; k++) y += G[k] * Math.sin(2 * Math.PI * f * R[k] * t) * Math.exp(-t / (tau / (1 + k * 0.55))); d[i] = y; }
    var att = Math.floor(sr * 0.0008); for (i = 0; i < att; i++) d[i] *= i / att;
    return norm(d, 0.9);
  }

  // Karplus-Strong: cuerda de nailon pulsada, con excitación filtrada y posición del dedo; devuelve buffer + playbackRate de afinación.
  var KS = {
    punt: { bright: 0.42, t60: 1.5, dur: 1.5, pick: 0.2 },        // primera guitarra: nota punteada cálida
    bord: { bright: 0.2, t60: 2.1, dur: 2.0, pick: 0.28 },        // bordón: cuerda grave de nailon entorchada, redonda y larga
    chop: { bright: 0.36, t60: 0.1, dur: 0.2, pick: 0.2 },        // rasgueo apagado (la «tundete»)
    open: { bright: 0.5, t60: 0.8, dur: 0.9, pick: 0.2 },         // rasgueo abierto
    har:  { bright: 0.9, t60: 1.2, dur: 1.3, pick: 0.1 },         // brillo de armónico (jingles)
    last: { bright: 0.55, t60: 5.0, dur: 5.0, pick: 0.2 }         // nota final que se queda sonando
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
    biq(y, 'hp', 60, 0.7, sr);
    norm(y, 0.9);
    return (S.cache[key] = { buf: toBuf(y), rate: f / f0 });
  }

  function buildSamples() {
    var B = S.buf = {};
    B.cajB = toBuf(cajonBass());
    B.cajS = toBuf(cajonSlap(0.18, 1));
    B.cajG = toBuf(cajonSlap(0.09, 0.55));                       // golpe fantasma, suave y corto
    B.cajT = cajonTok();
    B.cajitaH = cajita(1750); B.cajitaL = cajita(1250);
    B.quij = toBuf(quijadaBuf(false)); B.quijS = toBuf(quijadaBuf(true));
    B.checo = toBuf(shakerBuf(0.09)); B.checoL = toBuf(shakerBuf(0.14));
    B.clap = toBuf(clapBuf(false)); B.clapS = toBuf(clapBuf(true));
    B.vsr = toBuf(noise(2 * S.sr));                              // ruido de uso general (en bucle)
  }
  var LAZY = {
    applause: function () { return toBuf(applauseBuf()); },
    bellH: function () { return toBuf(bellBuf(1900, 1.4, 0.5)); },
    bellL: function () { return toBuf(bellBuf(620, 3.2, 1.3)); }
  };
  function lazy(name) { return S.buf[name] || (LAZY[name] ? (S.buf[name] = LAZY[name]()) : null); }

  function roomIR(secs) {              // sala de peña / patio de casona: reverb cálido y corto
    var sr = S.sr, n = Math.floor(sr * secs), b = S.ctx.createBuffer(2, n, sr);
    for (var ch = 0; ch < 2; ch++) {
      var d = b.getChannelData(ch), lp = 0;
      for (var i = 0; i < n; i++) { var t = i / sr; lp += (rnd() * 2 - 1 - lp) * (0.5 - 0.42 * t / secs); d[i] = lp * Math.exp(-t * 3.2) * (t < 0.006 ? t / 0.006 : 1); }
    }
    return b;
  }

  // ---------------------------------------------------------------------------------------------------------
  // mezcla
  //  capa -> multiplicador nocturno -> volumen -> panorama -> preBus -> HP -> brillo cálido -> duck -> paso bajo de pausa -> ganancia de pausa
  //       -> compresor -> trim (fundido de entrada y silencio) -> limitador -> recorte suave (techo CEIL) -> out
  //  envíos: send -> sala propia (vuelve a preBus) y -> reverbSend del motor (calle húmeda, poco)
  var LAYERS = {
    lead:   { vol: 1.0, pan: -0.12, send: 0.26 },       // primera guitarra (punteada)
    contra: { vol: 0.8, pan: 0.22, send: 0.3 },         // contracanto / segunda guitarra
    bordon: { vol: 1.15, pan: 0.08, send: 0.1 },        // bordones (cuerdas graves)
    rhy:    { vol: 1.2, pan: 0.3, send: 0.16 },         // rasgueos y arpegios
    cajon:  { vol: 1.35, pan: 0.0, send: 0.1 },
    perc:   { vol: 1.0, pan: 0.22, send: 0.16 },        // quijada, cajita, checo
    palmas: { vol: 0.95, pan: -0.2, send: 0.3 },
    coro:   { vol: 0.85, pan: 0.0, send: 0.42 },
    bass:   { vol: 0.3, pan: 0.0, send: 0.0 },
    sea:    { vol: 0.55, pan: 0.0, send: 0.06 },
    crowd:  { vol: 0.7, pan: 0.0, send: 0.3 },          // murmullo y aplausos de peña
    far:    { vol: 1.8, pan: 0.12, send: 0.5 },         // la peña lejana (guitarra y cajón al fondo); 2.1→1.8 (ajustes 2026-11-21): bohemia ≈ −22,5 dB RMS como las demás
    stg:    { vol: 0.8, pan: 0.0, send: 0.28 }
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
    n.sil = c.createGain(); n.sil.gain.value = 1;              // silencio (br.silence): fundido sin cambiar de tema
    n.lim = c.createDynamicsCompressor();
    n.lim.threshold.value = -8; n.lim.knee.value = 3; n.lim.ratio.value = 20; n.lim.attack.value = 0.001; n.lim.release.value = 0.1;
    n.clip = c.createWaveShaper();
    var cc = new Float32Array(2049), kn = 0.5;
    for (i = 0; i < 2049; i++) { x = i / 1024 - 1; var ax = Math.abs(x), y = ax <= kn ? ax : kn + (CEIL - kn) * Math.tanh((ax - kn) / (CEIL - kn)); cc[i] = (x < 0 ? -1 : 1) * Math.min(y, CEIL); }
    n.clip.curve = cc; n.clip.oversample = '2x';
    n.pre.connect(n.lowc); n.lowc.connect(n.warm); n.warm.connect(n.duck); n.duck.connect(n.plp); n.plp.connect(n.pg); n.pg.connect(n.comp); n.comp.connect(n.trim);
    n.trim.connect(n.sil); n.sil.connect(n.lim); n.lim.connect(n.clip); n.clip.connect(out);
    // reverb: sala propia (siempre) + calle húmeda del motor (poca)
    n.send = c.createGain();
    n.plate = c.createConvolver(); n.plate.buffer = roomIR(1.9);
    n.plateRet = c.createGain(); n.plateRet.gain.value = 0.34; n.plateBase = 0.34;
    n.send.connect(n.plate); n.plate.connect(n.plateRet); n.plateRet.connect(n.pre);
    n.slp = c.createBiquadFilter(); n.slp.type = 'lowpass'; n.slp.frequency.value = 20000;
    n.sg = c.createGain(); n.sg.gain.value = reverbSend ? TRIM * PRE * 0.9 : 0; n.sgBase = n.sg.gain.value;
    n.send.connect(n.slp); n.slp.connect(n.sg); if (reverbSend) n.sg.connect(reverbSend);
    // capas
    n.L = {};
    Object.keys(LAYERS).forEach(function (k) {
      var d = LAYERS[k], g = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : null;
      g.gain.value = d.vol;
      if (pan) { pan.pan.value = d.pan; g.connect(pan); pan.connect(n.pre); } else g.connect(n.pre);
      if (d.send) { var s = c.createGain(); s.gain.value = d.send; g.connect(s); s.connect(n.send); }
      var nm = c.createGain(); nm.gain.value = 1; nm.connect(g);           // multiplicador nocturno (antes del volumen y de los envíos)
      n.L[k] = { fade: g, input: nm, nm: nm, vol: d.vol };
    });
    // caja de resonancia de la guitarra criolla: EQ de madera (200 Hz y 2,4 kHz) -> paso bajo -> capa (lead, contra, rhy y bordón comparten el mismo carácter)
    ['lead', 'contra', 'rhy', 'bordon'].forEach(function (k) {
      var inp = c.createGain(), b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(), lp = c.createBiquadFilter();
      b1.type = 'peaking'; b1.frequency.value = k === 'bordon' ? 110 : 200; b1.Q.value = 1.0; b1.gain.value = 3.5;
      b2.type = 'peaking'; b2.frequency.value = 2400; b2.Q.value = 0.9; b2.gain.value = k === 'bordon' ? 0 : 2;
      lp.type = 'lowpass'; lp.frequency.value = k === 'bordon' ? 2600 : 6200; lp.Q.value = 0.6;
      inp.connect(b1); b1.connect(b2); b2.connect(lp); lp.connect(n.L[k].nm); n.L[k].input = inp;
    });
    // la peña lejana: guitarra y cajón por un paso bajo que se abre al acercarse, con hueco de medios (pared de casona)
    var fin = c.createGain(), fhp = c.createBiquadFilter(), fpk = c.createBiquadFilter();
    n.farLP = c.createBiquadFilter();
    fhp.type = 'highpass'; fhp.frequency.value = 160; fhp.Q.value = 0.7;
    n.farLP.type = 'lowpass'; n.farLP.frequency.value = 1100; n.farLP.Q.value = 0.7;
    fpk.type = 'peaking'; fpk.frequency.value = 700; fpk.Q.value = 0.8; fpk.gain.value = 2;
    fin.connect(fhp); fhp.connect(n.farLP); n.farLP.connect(fpk); fpk.connect(n.L.far.nm); n.L.far.input = fin;
    // coro: suma de voces -> banco de 3 formantes en paralelo
    n.coroIn = c.createGain();
    n.form = [0, 1, 2].map(function (k) {
      var f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'bandpass'; f.Q.value = [5, 8, 10][k]; f.frequency.value = [360, 720, 2400][k];
      g.gain.value = [1.6, 1.0, 0.45][k];
      n.coroIn.connect(f); f.connect(g); g.connect(n.L.coro.nm);
      return f;
    });
    n.cvib = c.createOscillator(); n.cvib.frequency.value = 5.1; n.cvibG = c.createGain(); n.cvibG.gain.value = 9; n.cvib.connect(n.cvibG); n.cvib.start();
    n.bassWave = c.createPeriodicWave(new Float32Array(7), new Float32Array([0, 1, 0.4, 0.2, 0.08, 0.04, 0.02]));
    return n;
  }

  // ---------------------------------------------------------------------------------------------------------
  // instrumentos en tiempo real (cada nota crea sus nodos justo antes de sonar)
  // Todas las notas de la música se anotan en S.live con su ganancia: al cambiar de tema se cortan en el tiempo elegido.
  // S.dry = calentamiento: solo se rellena la caché de cuerdas (ks), no se crea ningún nodo.
  function layerIn(name) { return typeof name === 'string' ? S.n.L[name].input : name; }
  function reg(param, t0, te, kind) { if (kind !== 'x') S.live.push({ p: param, t0: t0, te: te, k: kind || 'm' }); }
  function play(t, buf, layer, vel, rate, kind) {
    if (S.dry || !buf) return;
    var c = S.ctx, s = c.createBufferSource(), g = c.createGain();
    s.buffer = buf; if (rate) s.playbackRate.value = rate;
    g.gain.value = 0; g.gain.setValueAtTime(vel, t);
    s.connect(g); g.connect(layerIn(layer)); s.start(t);
    reg(g.gain, t, t + buf.duration / (rate || 1), kind || 'p');
  }
  // guitarra: cuerda Karplus-Strong con entrada deslizada y vibrato. o: {kind, vel, layer, scoop, drip, vib, rel, k}
  function gtr(t, midi, dur, o) {
    o = o || {};
    var kind = o.kind || 'punt', k = ks(midi, kind);
    if (S.dry) return;
    var c = S.ctx, s = c.createBufferSource(), r = k.rate;
    s.buffer = k.buf;
    if (o.scoop) { s.playbackRate.setValueAtTime(r * 0.944, t); s.playbackRate.setTargetAtTime(r, t + 0.01, 0.04); }          // arrastre desde un semitono abajo
    else if (o.drip) { s.playbackRate.setValueAtTime(r * 1.0595, t); s.playbackRate.linearRampToValueAtTime(r, t + 0.14); }
    else s.playbackRate.value = r;
    var stopAt = t + Math.min(dur + 0.5, k.buf.duration / r);
    if (o.vib && dur > 0.3) {
      var l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = 5.0; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(r * 0.007, t + Math.min(0.5, dur * 0.6));
      l.connect(lg); lg.connect(s.playbackRate); l.start(t); l.stop(stopAt);
    }
    var env = c.createGain(), vel = o.vel || 0.8;
    env.gain.value = 0; env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(vel, t + 0.003);
    env.gain.setTargetAtTime(0, t + dur, o.rel || 0.09);
    s.connect(env); env.connect(layerIn(o.layer || 'lead'));
    s.start(t); s.stop(stopAt);
    reg(env.gain, t, stopAt, o.k);
  }
  // rasgueo de varias cuerdas (chop = apagado, open = abierto); dur recorta el abierto
  function strum(t, notes, kind, vel, up, layer, dur, k) {
    var c = S.ctx, i, ord = up ? notes.slice().reverse() : notes;
    for (i = 0; i < ord.length; i++) {
      var kk = ks(ord[i], kind);
      if (S.dry) continue;
      var s = c.createBufferSource(), g = c.createGain(), tt = t + i * 0.007, stop = tt + Math.min(dur ? dur + 0.2 : 9, kk.buf.duration / kk.rate);
      s.buffer = kk.buf; s.playbackRate.value = kk.rate;
      g.gain.value = 0; g.gain.setValueAtTime(vel * (0.6 + 0.12 * i / ord.length), tt);
      if (dur) g.gain.setTargetAtTime(0, t + dur, 0.03);
      s.connect(g); g.connect(layerIn(layer || 'rhy')); s.start(tt); s.stop(stop);
      reg(g.gain, tt, stop, k);
    }
  }
  // bajo de sinusoides suaves (apoyo grave del landó)
  function bass(t, midi, dur, vel, layer) {
    if (S.dry) return;
    var c = S.ctx, f = hz(midi), o1 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
    o1.setPeriodicWave(S.n.bassWave); o1.frequency.value = f;
    lp.type = 'lowpass'; lp.Q.value = 0.8; lp.frequency.setValueAtTime(900, t); lp.frequency.setTargetAtTime(280, t + 0.01, 0.15);
    g.gain.value = 0; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.012); g.gain.setTargetAtTime(vel * 0.6, t + 0.03, 0.4); g.gain.setTargetAtTime(0, t + dur, 0.06);
    o1.connect(lp); lp.connect(g); g.connect(layerIn(layer || 'bass'));
    o1.start(t); o1.stop(t + dur + 0.4);
    reg(g.gain, t, t + dur + 0.4, 'b');
  }
  // coro de vocales («uuh», «mmm»): voces de sierra con vibrato -> banco de formantes compartido
  var VOW = { a: [730, 1090, 2440], o: [520, 860, 2550], e: [470, 1750, 2500], u: [330, 780, 2400], m: [260, 1000, 2200] };
  function coro(t, notes, dur, vowel, vel, k) {
    if (S.dry) return;
    var c = S.ctx, v = VOW[vowel] || VOW.u, i;
    for (i = 0; i < 3; i++) S.n.form[i].frequency.setTargetAtTime(v[i], t, 0.03);
    var g = c.createGain();
    g.gain.value = 0; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + 0.12); g.gain.setTargetAtTime(0, t + dur, 0.14);
    g.connect(S.n.coroIn);
    for (i = 0; i < notes.length; i++) {
      for (var j = 0; j < 2; j++) {
        var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(notes[i]);
        var d0 = j ? 8 : -7; o.detune.setValueAtTime(d0 - 25, t); o.detune.linearRampToValueAtTime(d0, t + 0.12);
        S.n.cvibG.connect(o.detune);
        o.onended = (function (o) { return function () { try { if (S) S.n.cvibG.disconnect(o.detune); } catch (e) { /* nada */ } }; })(o);
        o.connect(g); o.start(t); o.stop(t + dur + 0.6);
      }
    }
    reg(g.gain, t, t + dur + 0.6, k);
  }

  // ---------------------------------------------------------------------------------------------------------
  // cola de eventos (se crean nodos justo dentro del horizonte)
  function ev(t, kind, fn) { if (S.dry) { fn(0); return; } S.queue.push({ t: t, k: kind, fn: fn }); }
  function sortQ() { S.queue.sort(function (a, b) { return a.t - b.t; }); }
  // contexto de un compás: c.at(pulsos) -> segundos. u = duración del pulso.
  function barCtx(t0, u, nb) { return { t0: t0, u: u, nb: nb, at: function (beat) { return t0 + beat * u; } }; }
  // golpe de percusión; exact = sin humanización (los pulsos del cajón y la cajita caen justo en el reloj)
  function hit(c, beat, name, vel, layer, rate, exact) {
    var t = c.at(beat) + (exact ? 0 : (rnd() - 0.5) * 0.006);
    ev(t, 'perc', function (tt) { var bf = S.buf[name] || lazy(name); if (bf) play(tt, bf, layer || 'cajon', exact ? vel : hum(vel, 0.08), rate); });
  }
  // línea melódica: fn(t, midi, dur, nota, acento) por cada nota (y cada nota de una doble cuerda)
  function line(c, notes, kind, fn) {
    notes.forEach(function (x) {
      var d = x.d * c.u * (x.f.indexOf('.') >= 0 ? 0.5 : 0.97), acc = x.f.indexOf('!') >= 0;
      ev(c.at(x.s) + (rnd() - 0.5) * 0.006, kind, function (t) { for (var k = 0; k < x.n.length; k++) fn(t + k * 0.003, x.n[k], d, x, acc); });
    });
  }
  // melodía de la primera guitarra con su contracanto en terceras (L.contra) y, si se pide, el «mmm» tarareado (L.hum)
  function melody(c, notes, sg, p, L, o) {
    o = o || {};
    var vel = o.vel || 0.8;
    line(c, notes, 'mel', function (t, m, d, x, acc) {
      gtr(t, m, d, { kind: 'punt', vel: hum(vel * (acc ? 1.12 : 1), 0.06), vib: x.f.indexOf('v') >= 0 || x.d >= 1.5, scoop: x.f.indexOf('~') >= 0 || (acc && o.scoop), layer: 'lead' });
    });
    if (L.contra) line(c, notes, 'mel', function (t, m, d, x) {
      var ch = chordAtBeat(sg, x.s);
      gtr(t + 0.004, third(m, ch, p.sc), d * 0.96, { kind: 'punt', vel: hum(vel * 0.62, 0.08), layer: 'contra', vib: x.d >= 1.5 });
    });
    if (L.hum) line(c, notes, 'mel', function (t, m, d, x) { coro(t, [m - 12], d * 1.02, 'm', 0.5 * (o.humVel || 1)); });
  }

  // =========================================================================================================
  // GENERADORES DE COMPÁS por estilo
  // ---- VALS (3/4): bordón en el 1, rasgueo apagado en el 2 y el 3 («tundete»); cajón grave en el 1 y palmas; en los compases «hemi» el cajón sueña a festejo suave (6/8 dentro del 3/4)
  function valsBar(b, c, L, N, p) {
    var i = b % p.ch.length, sg = segs(p.ch[i], 3), nx = chord(firstSym(p.ch[(i + 1) % p.ch.length])), ch0 = sg[0].ch;
    var r = fitBord(rootIn(ch0, 40)), nr = fitBord(rootIn(nx, 40)), cad = i % 4 === 3, hemi = !!(p.hemi && p.hemi(i)), ap = nr > r ? nr - 1 : nr + 1, vo = voicing(ch0, M('G3'), 3);
    var third3 = r + (ch0.q === 'm' ? 3 : 4), fifth = r + 7;
    // bordones
    ev(c.at(0), 'bass', function (t) { gtr(t, r, 1.9 * c.u, { kind: 'bord', vel: hum(p.strong ? 0.95 : 0.8, 0.05), layer: 'bordon', rel: 0.14 }); });
    if (cad) {
      ev(c.at(1), 'bass', function (t) { gtr(t, third3, 0.9 * c.u, { kind: 'bord', vel: hum(0.6, 0.06), layer: 'bordon' }); });
      ev(c.at(2), 'bass', function (t) { gtr(t, ap, 0.9 * c.u, { kind: 'bord', vel: hum(0.66, 0.06), layer: 'bordon' }); });
    } else if (hemi) {
      ev(c.at(1.5), 'bass', function (t) { gtr(t, fifth > 52 ? fifth - 12 : fifth, 1.2 * c.u, { kind: 'bord', vel: hum(0.7, 0.06), layer: 'bordon' }); });
      ev(c.at(1) + (rnd() - 0.5) * 0.006, 'mel', function (t) { strum(t, vo, 'chop', hum(0.4, 0.1), false, 'rhy'); });
      ev(c.at(2.5) + (rnd() - 0.5) * 0.006, 'mel', function (t) { strum(t, vo, 'chop', hum(0.34, 0.1), true, 'rhy'); });
    } else {
      if (i % 2 === 1) ev(c.at(2.5), 'bass', function (t) { gtr(t, fifth > 52 ? fifth - 12 : fifth, 0.5 * c.u, { kind: 'bord', vel: hum(0.45, 0.08), layer: 'bordon' }); });
      var v2 = voicing(chordAtBeat(sg, 1), M('G3'), 3), v3 = voicing(chordAtBeat(sg, 2), M('G3'), 3);
      ev(c.at(1) + (rnd() - 0.5) * 0.006, 'mel', function (t) { strum(t, v2, 'chop', hum(0.42 * (p.rhyVel || 1), 0.1), false, 'rhy'); });
      ev(c.at(2) + (rnd() - 0.5) * 0.006, 'mel', function (t) { strum(t, v3, 'chop', hum(0.36 * (p.rhyVel || 1), 0.1), true, 'rhy'); });
    }
    // cajón
    if (L.cajon) {
      var cv = p.cajVel || 1;
      hit(c, 0, 'cajB', 0.5 * cv, 'cajon', 1, true);
      if (hemi || p.festejo) { hit(c, 1, 'cajS', 0.3 * cv, 'cajon'); hit(c, 1.5, 'cajB', 0.34 * cv, 'cajon', 1.05); hit(c, 2.5, 'cajS', 0.32 * cv, 'cajon'); if (p.festejo && i % 2) hit(c, 2, 'cajG', 0.2 * cv, 'cajon'); }
      else { hit(c, 1, 'cajG', 0.22 * cv, 'cajon'); hit(c, 2, 'cajS', 0.3 * cv, 'cajon'); if (cad) hit(c, 2.5, 'cajG', 0.2 * cv, 'cajon'); }
      if (p.tok && i % 2) hit(c, 2.5, 'cajT', 0.22, 'perc');
    }
    if (L.quij) { hit(c, 2, 'quij', 0.34, 'perc'); if (i % 4 === 3) hit(c, 2.5, 'quijS', 0.34, 'perc'); }
    if (L.palmas) { hit(c, 1, 'clapS', 0.34, 'palmas'); hit(c, 2, 'clapS', 0.3, 'palmas'); }
    if (L.tick) { hit(c, 0, 'cajitaH', 0.42, 'perc', 1, true); hit(c, 1, 'cajitaL', 0.3, 'perc', 1, true); hit(c, 2, 'cajitaL', 0.3, 'perc', 1, true); }
    // melodía
    melody(c, p.mel[i], sg, p, L, { vel: p.melVel || 0.8, scoop: p.scoop, humVel: p.humVel });
    if (L.coro && i % 4 === 3) { var vc = voicing(ch0, M('A3'), 3); ev(c.at(0), 'mel', function (t) { coro(t, vc, 2.9 * c.u, 'o', 0.32); }); }
    if (p.after) p.after(b, c, L, N, p, i, sg);
  }

  // ---- FESTEJO (6/8): pulso = negra con puntillo, 2 por compás, corcheas a 1/3. Cajón: grave, golpe, tapa, grave suave y golpe; quijada, cajita, palmas y checo
  function festBar(b, c, L, N, p) {
    var i = b % p.ch.length, sg = segs(p.ch[i], 2), nx = chord(firstSym(p.ch[(i + 1) % p.ch.length])), ch0 = sg[0].ch, last = i === p.ch.length - 1;
    var r = fitBord(rootIn(ch0, 40)), nr = fitBord(rootIn(nx, 40)), ap = nr > r ? nr - 1 : nr + 1, fifth = r + 7, vo = voicing(ch0, M('G3'), 3), s = 1 / 3;
    // bordones: raíz, raíz suave, quinta, raíz (o aproximación al compás que sigue)
    ev(c.at(0), 'bass', function (t) { gtr(t, r, 0.62 * c.u, { kind: 'bord', vel: hum(p.strong ? 0.95 : 0.82, 0.05), layer: 'bordon' }); });
    ev(c.at(2 * s), 'bass', function (t) { gtr(t, r, 0.3 * c.u, { kind: 'bord', vel: hum(0.45, 0.08), layer: 'bordon' }); });
    ev(c.at(1), 'bass', function (t) { gtr(t, fifth > 52 ? fifth - 12 : fifth, 0.6 * c.u, { kind: 'bord', vel: hum(0.62, 0.06), layer: 'bordon' }); });
    ev(c.at(5 * s), 'bass', function (t) { gtr(t, last || i % 4 === 3 ? ap : r, 0.3 * c.u, { kind: 'bord', vel: hum(0.55, 0.06), layer: 'bordon' }); });
    // rasgueo de festejo
    [[0, 0.46, false], [2 * s, 0.3, true], [4 * s, 0.42, false], [5 * s, 0.26, true]].forEach(function (q) {
      var v = voicing(chordAtBeat(sg, q[0]), M('G3'), 3);
      ev(c.at(q[0]) + (rnd() - 0.5) * 0.005, 'mel', function (t) { strum(t, v, 'chop', hum(q[1] * (p.rhyVel || 1), 0.1), q[2], 'rhy'); });
    });
    if (L.cajon) {
      var cv = p.cajVel || 1;
      hit(c, 0, 'cajB', 0.85 * cv, 'cajon', 1, true); hit(c, 2 * s, 'cajS', 0.45 * cv, 'cajon'); hit(c, 1, 'cajT', 0.4 * cv, 'cajon', 1, true); hit(c, 4 * s, 'cajB', 0.55 * cv, 'cajon', 1.06); hit(c, 5 * s, 'cajS', 0.5 * cv, 'cajon');
      if (L.fill) { hit(c, s, 'cajG', 0.22 * cv, 'cajon'); hit(c, 3 * s, 'cajG', 0.2 * cv, 'cajon'); }
    }
    if (L.quij) { hit(c, 1, 'quij', 0.5, 'perc'); hit(c, 5 * s, 'quijS', 0.42, 'perc'); if (i % 2) hit(c, 0, 'quijS', 0.3, 'perc'); }
    if (L.palmas) { hit(c, 2 * s, 'clap', 0.4, 'palmas'); hit(c, 4 * s, 'clap', 0.4, 'palmas'); if (L.fill) { hit(c, s, 'clapS', 0.24, 'palmas'); hit(c, 1, 'clapS', 0.26, 'palmas'); } }
    if (L.checo) for (var k = 0; k < 6; k++) hit(c, k * s, k % 3 === 0 ? 'checoL' : 'checo', k % 3 === 0 ? 0.3 : 0.2, 'perc');
    if (L.tick) { hit(c, 0, 'cajitaH', 0.45, 'perc', 1, true); hit(c, 1, 'cajitaL', 0.36, 'perc', 1, true); }
    melody(c, p.mel[i], sg, p, L, { vel: p.melVel || 0.8, scoop: p.scoop });
    if (L.coro && i % 4 === 3) { var vc = voicing(ch0, M('A3'), 3); ev(c.at(0), 'mel', function (t) { coro(t, vc, 1.9 * c.u, 'a', 0.3); }); }
  }

  // ---- LANDÓ (12/8): pulso = negra con puntillo, 4 por compás (12 corcheas a 1/3). Lento y pesado: bordones largos, arpegio amplio, cajón suave con «cerrado» en el 2.º y 4.º pulso
  function landoBar(b, c, L, N, p) {
    var i = b % p.ch.length, sg = segs(p.ch[i], 4), nx = chord(firstSym(p.ch[(i + 1) % p.ch.length])), ch0 = sg[0].ch, s = 1 / 3;
    var r = fitBord(rootIn(ch0, 40)), nr = fitBord(rootIn(nx, 40)), ap = nr > r ? nr - 1 : nr + 1, fifth = r + 7;
    ev(c.at(0), 'bass', function (t) { gtr(t, r, 3.6 * c.u, { kind: 'bord', vel: hum(p.strong ? 1.0 : 0.88, 0.04), layer: 'bordon', rel: 0.25 }); });
    ev(c.at(2), 'bass', function (t) { gtr(t, fifth > 52 ? fifth - 12 : fifth, 1.7 * c.u, { kind: 'bord', vel: hum(0.62, 0.06), layer: 'bordon' }); });
    if (i % 2 === 1) ev(c.at(3.34), 'bass', function (t) { gtr(t, ap, 0.6 * c.u, { kind: 'bord', vel: hum(0.55, 0.06), layer: 'bordon' }); });
    if (p.drone) ev(c.at(0), 'bass', function (t) { bass(t, r - 12 < 28 ? r : r - 12, 4 * c.u * 0.98, 0.55); });
    // arpegio amplio sobre el acorde (de abajo arriba y de vuelta), uno por corchea
    var seq = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1], k;
    for (k = 0; k < 12; k++) (function (k) {
      var ch = chordAtBeat(sg, k * s), v = voicing(ch, M('E3'), 4), m = v[seq[k]];
      ev(c.at(k * s) + (rnd() - 0.5) * 0.006, 'mel', function (t) { gtr(t, m, 0.6 * c.u, { kind: 'punt', vel: hum((k % 3 === 0 ? 0.42 : 0.3) * (p.rhyVel || 1), 0.1), layer: 'rhy', rel: 0.12 }); });
    })(k);
    if (L.cajon) {
      var cv = p.cajVel || 1;
      hit(c, 0, 'cajB', 0.62 * cv, 'cajon', 0.95, true);
      hit(c, 1, 'cajG', 0.4 * cv, 'cajon'); hit(c, 3, 'cajG', 0.4 * cv, 'cajon');
      if (p.heavy) { hit(c, 2, 'cajB', 0.7 * cv, 'cajon', 0.9, true); hit(c, 1, 'cajS', 0.4 * cv, 'cajon'); hit(c, 3, 'cajS', 0.46 * cv, 'cajon'); }
      else if (i % 2) hit(c, 2, 'cajB', 0.4 * cv, 'cajon', 1.0, true);
    }
    if (L.quij) { hit(c, 3 + s, 'quij', 0.5, 'perc', 0.9); if (i % 2) hit(c, 1 + s, 'quijS', 0.34, 'perc'); }
    if (L.palmas) { hit(c, 1, 'clapS', 0.3, 'palmas'); hit(c, 3, 'clapS', 0.3, 'palmas'); }
    if (L.tick) { for (k = 0; k < 4; k++) hit(c, k, k === 0 ? 'cajitaH' : 'cajitaL', k === 0 ? 0.45 : 0.32, 'perc', 1, true); }
    melody(c, p.mel[i], sg, p, L, { vel: p.melVel || 0.78, scoop: p.scoop });
    if (L.coro) { var vc = [rootIn(ch0, M('D3')), rootIn(ch0, M('D3')) + 7]; ev(c.at(0), 'mel', function (t) { coro(t, vc, 3.9 * c.u, 'o', 0.34); }); }
  }

  // ---- CALLES BOHEMIAS (3/4 de noche): la peña de lejos (guitarra y cajón por el paso bajo), una guitarra suave de este lado, murmullo y aplausos cada 8 compases
  function boheBar(b, c, L, N, p) {
    var i = b % p.ch.length, sg = segs(p.ch[i], 3), ch0 = sg[0].ch, r = fitBord(rootIn(ch0, 40)), vo = voicing(ch0, M('G3'), 3), nx = chord(firstSym(p.ch[(i + 1) % p.ch.length])), nr = fitBord(rootIn(nx, 40)), cad = i % 4 === 3;
    ev(c.at(0), 'bass', function (t) { gtr(t, r, 1.9 * c.u, { kind: 'bord', vel: hum(0.9, 0.05), layer: 'far' }); });
    if (cad) ev(c.at(2), 'bass', function (t) { gtr(t, nr > r ? nr - 1 : nr + 1, 0.9 * c.u, { kind: 'bord', vel: hum(0.7, 0.06), layer: 'far' }); });
    else {
      ev(c.at(1), 'mel', function (t) { strum(t, vo, 'chop', hum(0.5, 0.1), false, 'far'); });
      ev(c.at(2), 'mel', function (t) { strum(t, vo, 'chop', hum(0.44, 0.1), true, 'far'); });
    }
    hit(c, 0, 'cajB', 0.55, 'far', 1, true); hit(c, 1, 'cajG', 0.3, 'far'); hit(c, 2, 'cajS', 0.42, 'far');
    if (i % 2) hit(c, 2.5, 'cajG', 0.25, 'far');
    if (L.palmas) { hit(c, 1, 'clapS', 0.4, 'far'); hit(c, 2, 'clapS', 0.34, 'far'); }
    // la guitarra de este lado: melodía quieta con eco de contracanto
    line(c, p.mel[i], 'mel', function (t, m, d, x) { gtr(t, m, d, { kind: 'punt', vel: hum(0.85, 0.08), vib: x.d >= 1.5, layer: 'lead' }); });
    if (L.contra) line(c, p.mel[i], 'mel', function (t, m, d, x) { gtr(t + 0.004, third(m, chordAtBeat(sg, x.s), p.sc), d * 0.96, { kind: 'punt', vel: hum(0.5, 0.08), layer: 'contra' }); });
    // aplausos y griterío de peña: al empezar cada 8 compases (más fuertes si estás cerca)
    if (b % 8 === 7) ev(c.at(1.5), 'perc', function (t) { var bf = lazy('applause'); if (bf) play(t, bf, 'crowd', 0.55 + 0.4 * (S.near || 0), 0, 'x'); });
  }

  // ---- LAMENTO (muerte): guitarra sola, lenta, que cae
  var DEAD_MEL = ['0:E5:1.5v 1.5:D5:0.5 2:C5:1', '0:B4:1.5 1.5:C5:0.5 2:A4:1v'].map(P);
  function deadBar(b, c) {
    line(c, DEAD_MEL[b], 'mel', function (t, m, d, x) { gtr(t, m, d * 1.1, { kind: 'punt', vel: 0.7, vib: x.d >= 1.5, scoop: true, layer: 'lead', rel: 0.3 }); });
    var vo = voicing(chord(b ? 'E7' : 'Am'), M('G3'), 3);
    ev(c.at(0), 'bass', function (t) { gtr(t, b ? M('E2') : M('A2'), 2.8 * c.u, { kind: 'bord', vel: 0.8, layer: 'bordon', rel: 0.3 }); });
    ev(c.at(0.02), 'mel', function (t) { strum(t, vo, 'open', 0.5, false, 'rhy', 2.4 * c.u); });
    ev(c.at(0), 'perc', function (t) { play(t, S.buf.cajB, 'cajon', 0.5); });
    if (b === 1) ev(c.at(0.2), 'mel', function (t) { coro(t, [M('E3'), M('B3')], 2.6 * c.u, 'o', 0.3); });
  }

  // =========================================================================================================
  // TEMAS · cada uno: bpm (pulsos por minuto), nb (pulsos por compás), len (compases), ch (acordes), mel (melodías por compás), sc (escala para el contracanto)
  var SC_AM = [9, 11, 0, 2, 4, 5, 7, 8], SC_DM = [2, 4, 5, 7, 9, 10, 0, 1], SC_G = [7, 9, 11, 0, 2, 4, 6], SC_BM = [11, 1, 2, 4, 6, 7, 9, 10], SC_EM = [4, 6, 7, 9, 11, 0, 2, 3], SC_GM = [7, 9, 10, 0, 2, 3, 5, 6];

  // PLAYA · vals criollo suave, 3/4, 92 bpm, La menor → Do · 16 compases
  var PLA = {
    ch: ['Am', 'Am', 'Dm', 'E7', 'Am', 'C', 'F', 'E7', 'C', 'G7', 'C', 'A7', 'Dm', 'F', 'E7', 'E7'], sc: SC_AM,
    mel: ['0:E5:1 1:A5:1.5v 2.5:G5:0.5', '0:E5:0.5 0.5:F5:0.5 1:E5:1 2:C5:1', '0:D5:1 1:F5:1 2:A5:1', '0:G#5:1.5 1.5:B5:0.5 2:E5:1',
      '0:E5:1 1:A5:1 2:C6:1', '0:C6:1 1:G5:0.5 1.5:E5:0.5 2:G5:1', '0:A5:1 1:F5:1 2:C5:1', '0:B4:1 1:D5:0.5 1.5:E5:0.5 2:G#5:1',
      '0:E5:1 1:G5:1 2:C6:1', '0:B5:1.5 1.5:A5:0.5 2:G5:1', '0:E5:0.5 0.5:G5:0.5 1:C6:1.5 2.5:B5:0.5', '0:A5:1 1:C#6:1 2:E6:1',
      '0:D6:1.5 1.5:C6:0.5 2:A5:1', '0:F5:0.5 0.5:A5:0.5 1:C6:1 2:A5:1', '0:B5:1 1:G#5:1 2:E5:1', '0:D5:1 1:B4:1 2:G#4:1'].map(P)
  };
  // BAJADA · vals con contracanto y toques de festejo suave (hemiola en el cajón), 3/4, 104 bpm, Re menor → Fa · 16 compases
  var BAJ = {
    ch: ['Dm', 'Dm', 'Gm', 'A7', 'Dm', 'Bb', 'Gm', 'A7', 'F', 'C7', 'F', 'D7', 'Gm', 'Dm', 'A7', 'A7'], sc: SC_DM,
    hemi: function (i) { return (i >= 4 && i <= 6) || (i >= 12 && i <= 13); },
    mel: ['0:A4:0.5 0.5:D5:0.5 1:F5:1 2:E5:0.5 2.5:D5:0.5', '0:A5:1.5 1.5:F5:0.5 2:D5:1', '0:G5:1 1:Bb5:1 2:A5:0.5 2.5:G5:0.5', '0:E5:1 1:G5:0.5 1.5:E5:0.5 2:C#5:1',
      '0:D5:0.5 0.5:F5:0.5 1:A5:1 2:D6:1', '0:D6:1.5 1.5:Bb5:0.5 2:F5:1', '0:G5:0.5 0.5:Bb5:0.5 1:D6:1 2:C6:0.5 2.5:Bb5:0.5', '0:A5:1 1:E5:0.5 1.5:G5:0.5 2:C#6:1',
      '0:C6:1 1:A5:0.5 1.5:F5:0.5 2:A5:1', '0:G5:1 1:Bb5:1 2:E5:1', '0:F5:0.5 0.5:A5:0.5 1:C6:1.5 2.5:D6:0.5', '0:F#5:1 1:A5:0.5 1.5:C6:0.5 2:D6:1',
      '0:Bb5:1 1:A5:0.5 1.5:G5:0.5 2:D5:1', '0:F5:0.5 0.5:A5:0.5 1:D6:1.5 2.5:C6:0.5', '0:A5:1 1:G5:1 2:E5:1', '0:C#5:1 1:E5:0.5 1.5:G5:0.5 2:A5:1'].map(P)
  };
  // PARQUE · vals alegre, 3/4, 108 bpm, Sol mayor · 16 compases
  var PAR = {
    ch: ['G', 'D7', 'G', 'C', 'G', 'Em', 'A7', 'D7', 'G', 'B7', 'Em', 'C', 'G', 'D7', 'G', 'D7'], sc: SC_G,
    hemi: function (i) { return i >= 8 && i <= 10; },
    mel: ['0:D5:0.5 0.5:G5:0.5 1:B5:1 2:A5:0.5 2.5:G5:0.5', '0:F#5:1 1:A5:1 2:C6:1', '0:B5:1.5 1.5:G5:0.5 2:D5:1', '0:E5:0.5 0.5:G5:0.5 1:C6:1 2:B5:1',
      '0:A5:0.5 0.5:B5:0.5 1:D6:1.5 2.5:B5:0.5', '0:G5:1 1:E5:0.5 1.5:G5:0.5 2:B5:1', '0:C#6:1 1:E6:1 2:A5:1', '0:F#5:0.5 0.5:A5:0.5 1:C6:1.5 2.5:A5:0.5',
      '0:G5:1 1:D6:1 2:B5:1', '0:D#6:1 1:F#6:1 2:B5:1', '0:G5:1 1:B5:0.5 1.5:E6:1.5', '0:E6:1 1:C6:1 2:G5:1',
      '0:D6:0.5 0.5:B5:0.5 1:G5:1 2:B5:1', '0:A5:1 1:F#5:0.5 1.5:A5:0.5 2:C6:1', '0:B5:1.5 1.5:A5:0.5 2:G5:1', '0:A5:1 1:F#5:1 2:D5:1'].map(P)
  };
  // BOHEMIA · calles de noche, 3/4, 84 bpm, Si menor · 8 compases
  var BOH = {
    ch: ['Bm', 'Bm', 'Em', 'F#7', 'Bm', 'G', 'F#7', 'F#7'], sc: SC_BM,
    mel: ['0:F#5:1 1:B5:1.5v 2.5:A5:0.5', '0:F#5:1 1:D5:1 2:F#5:1', '0:G5:1 1:E5:1 2:B4:1', '0:A#5:1 1:C#6:1 2:F#5:1',
      '0:D6:1 1:B5:0.5 1.5:A5:0.5 2:F#5:1', '0:G5:1 1:B5:1 2:D6:1', '0:C#6:1.5 1.5:A#5:0.5 2:E5:1', '0:F#5:1 1:A#5:1 2:C#6:1'].map(P)
  };
  // CHASE · festejo rápido, 6/8, 138 bpm (pulso = negra con puntillo), Mi menor · 8 compases
  var CHS = {
    ch: ['Em', 'Em', 'Am', 'B7', 'Em', 'Am', 'B7', ['Em', 'B7']], sc: SC_EM, strong: true, cajVel: 1.05, scoop: true,
    mel: ['0:E5:0.333 0.333:G5:0.333 0.667:B5:0.333 1:A5:0.667 1.667:G5:0.333', '0:E5:0.667 0.667:G5:0.333 1:B5:0.667 1.667:D6:0.333', '0:C6:0.333 0.333:B5:0.333 0.667:A5:0.333 1:E5:0.667 1.667:A5:0.333',
      '0:D#6:0.667 0.667:F#6:0.333 1:B5:0.667 1.667:A5:0.333', '0:G5:0.333 0.333:B5:0.333 0.667:E6:0.333 1:D6:0.667 1.667:B5:0.333', '0:A5:0.667 0.667:C6:0.333 1:E6:0.667 1.667:C6:0.333',
      '0:B5:0.333 0.333:A5:0.333 0.667:F#5:0.333 1:D#5:0.667 1.667:F#5:0.333', '0:E5:1.333 1.333:B4:0.667'].map(P)
  };
  // HORDA · landó oscuro y pesado, 12/8, 72 bpm (pulso = negra con puntillo), Re menor → La frigio · 8 compases
  var HRD = {
    ch: ['Dm', 'Dm', 'Bb', 'A7', 'Dm', 'Gm', 'A', 'A7'], sc: SC_DM, heavy: true, strong: true, drone: true, cajVel: 1.05,
    mel: ['0:A4:1.667 1.667:D5:0.333 2:F5:1.333v 3.333:E5:0.667', '0:D5:2v 2:C5:0.667 2.667:D5:0.667 3.333:A4:0.667', '0:Bb4:1.333 1.333:D5:0.667 2:F5:1.667v 3.667:E5:0.333', '0:E5:1 1:C#5:1 2:A4:2v',
      '0:F5:1.333 1.333:A5:0.667 2:G5:1 3:F5:1', '0:G5:1.333v 1.333:Bb5:0.667 2:A5:1.333 3.333:G5:0.667', '0:E5:1 1:A5:1 2:G5:1 3:E5:1', '0:C#5:1.333 1.333:E5:0.667 2:A5:2v'].map(P)
  };
  // JEFE 1 · vals de la Voz de Oro, 3/4, 100 bpm, Sol menor · 8 compases
  var JF1 = {
    ch: ['Gm', 'Gm', 'Cm', 'D7', 'Gm', 'Eb', 'Cm', 'D7'], sc: SC_GM, strong: true, cajVel: 1.15, rhyVel: 1.15, melVel: 0.86, scoop: true,
    mel: ['0:D5:1 1:G5:1 2:Bb5:1!', '0:A5:1.5 1.5:G5:0.5 2:D5:1', '0:C5:0.5 0.5:Eb5:0.5 1:G5:1 2:C6:1', '0:Bb5:1 1:A5:1 2:F#5:1',
      '0:G5:1 1:Bb5:0.5 1.5:D6:1.5!', '0:Bb5:1 1:G5:1 2:Eb5:1', '0:Eb5:1 1:G5:1 2:C6:1', '0:A5:0.5 0.5:C6:0.5 1:D6:1 2:F#5:1'].map(P)
  };
  // JEFE 2 · festejo en la pista, 6/8, 108 bpm (pulso), La menor · 8 compases
  var JF2 = {
    ch: ['Am', 'Am', 'Dm', 'E7', 'Am', 'Dm', 'E7', 'Am'], sc: SC_AM, strong: true, cajVel: 1.15, rhyVel: 1.15, melVel: 0.86, scoop: true,
    mel: ['0:A4:0.333 0.333:C5:0.333 0.667:E5:0.333 1:A5:0.667 1.667:G5:0.333', '0:E5:0.667 0.667:G5:0.333 1:A5:0.333 1.333:C6:0.333 1.667:B5:0.333', '0:A5:0.333 0.333:F5:0.333 0.667:D5:0.333 1:F5:0.667 1.667:A5:0.333',
      '0:G#5:0.667 0.667:B5:0.333 1:E5:0.667 1.667:D5:0.333', '0:C6:0.667 0.667:B5:0.333 1:A5:0.667 1.667:E5:0.333', '0:D5:0.333 0.333:F5:0.333 0.667:A5:0.333 1:D6:0.667 1.667:C6:0.333',
      '0:B5:0.333 0.333:G#5:0.333 0.667:E5:0.333 1:G#5:0.667 1.667:B5:0.333', '0:A5:1.333 1.333:E5:0.667'].map(P)
  };
  // JEFE 3 · landó del pecho, 12/8, 66 bpm (pulso), Mi menor · 8 compases
  var JF3 = {
    ch: ['Em', 'Em', 'C', 'B7', 'Em', 'Am', 'B7', ['Em', 'B7']], sc: SC_EM, heavy: true, strong: true, drone: true, cajVel: 1.1, rhyVel: 1.1, melVel: 0.86,
    mel: ['0:B4:1.667 1.667:E5:0.333 2:G5:1.333v 3.333:F#5:0.667', '0:E5:2v 2:D5:0.667 2.667:E5:0.667 3.333:B4:0.667', '0:C5:1.333 1.333:E5:0.667 2:G5:1.667v 3.667:F#5:0.333', '0:D#5:1 1:F#5:1 2:B5:2v',
      '0:G5:1.333 1.333:B5:0.667 2:A5:1 3:G5:1', '0:A5:1.333v 1.333:C6:0.667 2:B5:1.333 3.333:A5:0.667', '0:F#5:1 1:D#5:1 2:F#5:1 3:A5:1', '0:E5:1.333 1.333:G5:0.667 2:F#5:1.333 3.333:D#5:0.667'].map(P)
  };
  // FINAL · La última jarana, vals lento, 3/4, 66 bpm, Sol mayor · 8 compases (guitarra, bordones y «mmm»)
  var FIN = {
    ch: ['G', 'D', 'Em', 'C', 'G', 'D7', 'C', 'G'], sc: SC_G, melVel: 0.74, rhyVel: 0.8, humVel: 1,
    mel: ['0:B4:1 1:D5:1 2:G5:1', '0:F#5:1.5 1.5:E5:0.5 2:D5:1', '0:E5:1 1:G5:1 2:B5:1', '0:C6:1.5 1.5:B5:0.5 2:G5:1',
      '0:D5:1 1:G5:1 2:B5:1', '0:A5:1.5 1.5:F#5:0.5 2:D5:1', '0:E5:1 1:G5:1 2:E5:1', '0:D5:3v'].map(P)
  };

  // capas por intensidad (0..1): lo que entra al avanzar por el mapa
  var PIECES = {
    playa:   { song: 'playa', bpm: 92, nb: 3, len: 16, loop: true, resume: 4, name: 'Playa al atardecer', def: PLA, bar: valsBar,
      layers: function (I) { return { contra: I >= 0.35, cajon: I >= 0.55, palmas: I >= 0.75 }; } },
    bajada:  { song: 'bajada', bpm: 104, nb: 3, len: 16, loop: true, resume: 4, name: 'Bajada de Baños', def: BAJ, bar: valsBar,
      layers: function (I) { return { contra: I >= 0.1, cajon: I >= 0.25, palmas: I >= 0.6, quij: I >= 0.85 }; } },
    parque:  { song: 'parque', bpm: 108, nb: 3, len: 16, loop: true, resume: 4, name: 'Parque Municipal', def: PAR, bar: valsBar,
      layers: function (I) { return { contra: true, cajon: I >= 0.1, palmas: I >= 0.45, quij: I >= 0.8 }; } },
    bohemia: { song: 'bohemia', bpm: 84, nb: 3, len: 8, loop: true, resume: 2, name: 'Calles bohemias', def: BOH, bar: boheBar,
      layers: function (I) { return { contra: I >= 0.5, palmas: I >= 0.3 }; } },
    chase:   { song: 'chase', bpm: 138, nb: 2, len: 8, loop: true, resume: 0, name: 'Corre, que se arma la jarana', def: CHS, bar: festBar,
      layers: function (I) { return { cajon: true, quij: true, palmas: I >= 0.25, checo: I >= 0.5, fill: I >= 0.5, contra: I >= 0.75, coro: I >= 0.9 }; } },
    horde:   { song: 'horde', bpm: 72, nb: 4, len: 8, loop: true, resume: 0, name: 'Landó de los muertos', def: HRD, bar: landoBar,
      layers: function (I) { return { cajon: true, quij: I >= 0.2, coro: I >= 0.5, palmas: I >= 0.8 }; } },
    jefe1:   { song: 'jefe1', bpm: 100, nb: 3, len: 8, loop: true, resume: 0, name: 'Vals de la Voz de Oro', def: JF1, bar: valsBar,
      layers: function () { return { cajon: true, tick: true, palmas: true, contra: true, quij: true }; } },
    jefe2:   { song: 'jefe2', bpm: 108, nb: 2, len: 8, loop: true, resume: 0, name: 'Festejo en la pista', def: JF2, bar: festBar,
      layers: function () { return { cajon: true, tick: true, quij: true, palmas: true, checo: true, fill: true, contra: true }; } },
    jefe3:   { song: 'jefe3', bpm: 66, nb: 4, len: 8, loop: true, resume: 0, name: 'Landó del pecho', def: JF3, bar: landoBar,
      layers: function () { return { cajon: true, tick: true, quij: true, coro: true, contra: true }; } },
    final:   { song: 'final', bpm: 66, nb: 3, len: 8, loop: true, resume: 0, name: 'La última jarana', def: FIN, bar: valsBar,
      layers: function () { return { contra: true, hum: true }; } },
    dead:    { song: 'dead', bpm: 56, nb: 3, len: 2, loop: false, resume: 0, name: 'lamento', def: {}, bar: deadBar, layers: function () { return {}; } },
    won:     { song: 'won', bpm: 90, nb: 3, len: 0, loop: false, resume: 0, name: 'final', def: {}, bar: function () {}, layers: function () { return {}; } }
  };
  PIECES.title = { song: 'playa', bpm: 92, nb: 3, len: 16, loop: true, resume: 0, name: 'Playa al atardecer (título)', def: PLA, bar: valsBar, layers: function () { return PIECES.playa.layers(0.6); } };
  var OVERRIDES = { jefe1: 1, jefe2: 1, jefe3: 1, final: 1, chase: 1, horde: 1 };       // temas que se piden por nombre (ACH.audio.br.play)
  var ZONE_PIECE = { playa: 'playa', bajada: 'bajada', puente: 'bajada', ermita: 'bajada', parque: 'parque', bohemia: 'bohemia', pena: 'bohemia' };
  var ZONE_NEAR = { bohemia: 0.3, pena: 0.85 };
  var ZONES = Object.keys(ZONE_PIECE);
  function urgent(k) { return k === 'chase' || k === 'horde' || k === 'jefe1' || k === 'jefe2' || k === 'jefe3'; }
  function resumeAt(key) { var p = PIECES[key], sv = S.saved[key]; return p.resume && sv ? Math.ceil(sv / p.resume) * p.resume : 0; }
  var ALL_LAYERS = { contra: 1, cajon: 1, palmas: 1, quij: 1, tick: 1, checo: 1, fill: 1, coro: 1, hum: 1 };

  // calentamiento: genera de mentira todos los compases de un tema (S.dry) para rellenar la caché de cuerdas sin crear nodos
  function warmBars(key, from, to) {
    var p = PIECES[key], prevDry = S.dry, b;
    if (!p || p.len === 0) return;
    S.dry = true;
    try { for (b = from; b < Math.min(to, p.len); b++) p.bar(b, barCtx(0, 0.5, p.nb), ALL_LAYERS, 0, p.def); }
    finally { S.dry = prevDry; }
  }
  function warm(key) { warmBars(key, 0, 99); }

  // =========================================================================================================
  // COMBO DE LA CALLE (diegetic): un trío criollo (guitarra, bordón y cajón) tocando un vals en La menor, 96 bpm, en una posición del mundo.
  var BAND_BPM = 96, BAND_CH = ['Am', 'Dm', 'E7', 'Am'], BAND_VOL = 0.9;
  var BAND_LICK = ['0:E5:1 1:A5:1 2:G5:1', '0:F5:1 1:A5:1 2:D5:1', '0:G#5:1.5 1.5:B5:0.5 2:E5:1', '0:C6:1 1:A5:1 2:E5:1'].map(P);
  function buildBand() {
    var c = S.ctx, B = S.B = { x: 0, y: 0, state: 'off', bar: 0, nextBar: 0, queue: [], late: 0, dropped: 0, starts: 0, cuts: 0, d: 9999, g: 0, a: 0, duckDb: 0, last: {}, lastSp: -1, fadeEnd: 0 };
    B.fade = c.createGain(); B.fade.gain.value = 0;
    B.dist = c.createGain(); B.dist.gain.value = 0;
    B.pan = c.createStereoPanner ? c.createStereoPanner() : null;
    B.lp = c.createBiquadFilter(); B.lp.type = 'lowpass'; B.lp.frequency.value = 16000;
    B.wet = c.createGain(); B.wet.gain.value = 0.22;
    B.mix = c.createGain(); B.mix.gain.value = BAND_VOL;
    B.inst = {};
    ['gtr', 'bord', 'drums'].forEach(function (k) { var g = c.createGain(); g.gain.value = { gtr: 0.8, bord: 0.7, drums: 0.8 }[k]; g.connect(B.mix); B.inst[k] = g; });
    B.mix.connect(B.fade); B.fade.connect(B.dist); B.dist.connect(B.lp);
    if (B.pan) { B.lp.connect(B.pan); B.pan.connect(S.n.pre); } else B.lp.connect(S.n.pre);
    B.lp.connect(B.wet); B.wet.connect(S.n.send);
  }
  function bev(t, fn) { S.B.queue.push({ t: t, fn: fn }); }
  function bandBar() {
    var B = S.B, t0 = B.nextBar, u = 60 / BAND_BPM, c = barCtx(t0, u, 3), i = B.bar % 4, ch = chord(BAND_CH[i]), r = fitBord(rootIn(ch, 40)), vo = voicing(ch, M('G3'), 3);
    function hb(beat, name, vel, inst) { bev(c.at(beat), function (t) { play(t, S.buf[name], B.inst[inst], hum(vel, 0.1), 0, 'x'); }); }
    hb(0, 'cajB', 0.6, 'drums'); hb(1, 'cajG', 0.3, 'drums'); hb(2, 'cajS', 0.42, 'drums');
    bev(c.at(0), function (t) { gtr(t, r, 1.8 * u, { kind: 'bord', vel: 0.9, layer: B.inst.bord, k: 'x' }); });
    bev(c.at(1), function (t) { strum(t, vo, 'chop', 0.55, false, B.inst.gtr, 0, 'x'); });
    bev(c.at(2), function (t) { strum(t, vo, 'chop', 0.48, true, B.inst.gtr, 0, 'x'); });
    BAND_LICK[i].forEach(function (x) { bev(c.at(x.s), function (t) { gtr(t, x.n[0], x.d * u * 0.95, { kind: 'punt', vel: 0.6, vib: x.d >= 1.5, layer: B.inst.gtr, k: 'x' }); }); });
    B.nextBar += 3 * u; B.bar++;
    B.queue.sort(function (a, b) { return a.t - b.t; });
  }
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
    set('w', B.wet.gain, 0.22 * (1 + 2 * u), 0.01);
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
  // ambiente de fondo: olas, murmullo de peña; efectos por pieza, noche
  //   sea: oleaje · crowd: murmullo (no aplausos) · far: la peña lejana (1 = suena; el filtro se abre con S.near)
  var FX = {
    playa: { sea: 1.0, seaF: 650, crowd: 0, far: 0 }, title: { sea: 0.8, seaF: 650, crowd: 0, far: 0 },
    bajada: { sea: 0.3, seaF: 520, crowd: 0.04, far: 0 }, parque: { sea: 0.1, seaF: 500, crowd: 0.1, far: 0 },
    bohemia: { sea: 0, seaF: 500, crowd: 0.5, far: 1 },
    chase: { sea: 0, seaF: 800, crowd: 0, far: 0 }, horde: { sea: 0, seaF: 800, crowd: 0, far: 0 },
    jefe1: { sea: 0, seaF: 800, crowd: 0.2, far: 0 }, jefe2: { sea: 0, seaF: 800, crowd: 0.28, far: 0 }, jefe3: { sea: 0, seaF: 800, crowd: 0.15, far: 0 },
    final: { sea: 0, seaF: 800, crowd: 0.12, far: 0 }, dead: { sea: 0.2, seaF: 600, crowd: 0, far: 0 }, won: { sea: 0.4, seaF: 650, crowd: 0, far: 0 }
  };
  var SEA_VOL = 0.9, CROWD_VOL = 0.9;
  // brisa y oleaje: ruido en bucle por un paso de banda; un LFO lento (0,11 Hz) lo hace subir y bajar como el mar contra las piedras
  function buildAmb() {
    var c = S.ctx, n = S.n, src = c.createBufferSource(), bp = c.createBiquadFilter(), sw = c.createGain(), lg = c.createGain(), lfo = c.createOscillator(), sg = c.createGain();
    src.buffer = S.buf.vsr; src.loop = true;
    bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 0.35;
    sw.gain.value = 0.55; lfo.frequency.value = 0.1; lg.gain.value = 0.4; lfo.connect(lg); lg.connect(sw.gain);
    sg.gain.value = 0; src.connect(bp); bp.connect(sw); sw.connect(sg); sg.connect(n.L.sea.input);
    src.start(); lfo.start();
    n.seaSrc = src; n.seaLfo = lfo; n.seaBp = bp; n.seaG = sg;
    // murmullo: tres bandas de ruido con modulaciones lentas e incomensurables (se parece a mucha gente hablando en otra sala)
    var cs = c.createBufferSource(), cg = c.createGain(), bands = [[420, 0.9, 0.7], [1150, 1.1, 0.5], [2500, 1.5, 0.22]], rates = [0.7, 1.3, 2.1];
    cs.buffer = S.buf.vsr; cs.loop = true; cs.loopStart = 0.31;
    cg.gain.value = 0;
    n.crowdLfos = [];
    bands.forEach(function (b, k) {
      var f = c.createBiquadFilter(), g = c.createGain(), l = c.createOscillator(), lg2 = c.createGain();
      f.type = 'bandpass'; f.frequency.value = b[0]; f.Q.value = b[1]; g.gain.value = b[2] * 0.5;
      l.frequency.value = rates[k]; lg2.gain.value = b[2] * 0.4; l.connect(lg2); lg2.connect(g.gain); l.start(); n.crowdLfos.push(l);
      cs.connect(f); f.connect(g); g.connect(cg);
    });
    cg.connect(n.L.crowd.input); cs.start();
    n.crowdSrc = cs; n.crowdG = cg;
  }
  function applyFx(key, t, tcs) {
    var n = S.n, f = FX[key] || FX.playa, tc = tcs ? Math.max(0.3, tcs * 3) : 0.6;
    var near = S.near == null ? (ZONE_NEAR[S.zone] == null ? 0.3 : ZONE_NEAR[S.zone]) : S.near;
    S.nearEff = near;
    // ajustes 2026-11-21: dos applyFx en el MISMO instante (setNight + tema nuevo al arrancar, CONTINUAR o ?br=noche) dejaban la automatización
    // anterior ganando y la peña lejana (far, la capa más fuerte de «bohemia») en silencio: −26,5 dB RMS en vez de −22. Se limpia lo programado desde t.
    [n.seaG.gain, n.seaBp.frequency, n.crowdG.gain, n.farLP.frequency, n.L.far.fade.gain].forEach(function (pp) { try { pp.cancelScheduledValues(t); } catch (e) { /* nada */ } });
    n.seaG.gain.setTargetAtTime(f.sea * SEA_VOL, t, tc);
    n.seaBp.frequency.setTargetAtTime(f.seaF, t, 0.8);
    n.crowdG.gain.setTargetAtTime(f.crowd * CROWD_VOL * (1 + 0.5 * near * (f.far ? 1 : 0)), t, tc);
    n.farLP.frequency.setTargetAtTime(900 + 2600 * near, t, 0.6);
    n.L.far.fade.gain.setTargetAtTime(LAYERS.far.vol * (0.9 + 0.6 * near) * (f.far ? 1 : 0.0001), t, tc);
  }
  // noche: sombra de agudos, reverb y multiplicadores por capa; todos con la misma constante de tiempo
  function applyNight(t, tc) {
    var n = S.n, N = S.nTarget;
    function go(p, v) { p.cancelScheduledValues(t); p.setTargetAtTime(v, t, tc); }
    go(n.warm.gain, -3 - 6 * N); go(n.warm.frequency, 6500 - 2600 * N);
    go(n.plateRet.gain, n.plateBase * (1 + 0.9 * N)); go(n.sg.gain, n.sgBase * (1 + 0.7 * N));
    Object.keys(LAYERS).forEach(function (k) { go(n.L[k].nm.gain, 1 + ((NM[k] == null ? 1 : NM[k]) - 1) * N); });
  }
  function setNightS(on, secs) {
    var t = now(), d = secs === undefined ? 8 : Math.max(0, +secs || 0);
    S.nFrom = nightAt(t); S.nT0 = t; S.nTarget = on ? 1 : 0; S.nTc = Math.max(0.001, d / 3);
    applyNight(t, S.nTc);
    applyFx(S.key, t, S.nTc);
  }
  function nightTc(t) { return t - S.nT0 < 3 * S.nTc ? S.nTc : 0.25; }

  // pieza que toca un ánimo: un tema por nombre (br.play) manda sobre todo; con setBoss(true) horde y chase tocan jefe1; explore toca la pieza de la zona
  function keyFor(m) {
    if (S.ov) return S.ov;
    if (m === 'title') return 'title';
    if ((m === 'horde' || m === 'chase') && S.boss) return 'jefe1';
    if (m === 'explore') return ZONE_PIECE[S.zone] || 'playa';
    return m;
  }

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

  // cambio de pieza.
  //  · entre temas de exploración (y final): en el siguiente COMPÁS, sin cortar las colas (suena como un cambio de sección)
  //  · si algún lado es urgente (chase, horde, jefes) o es el tema pedido: en el siguiente PULSO, corta la cola y mete una anacrusa de cajón; la pieza nueva arranca ahí mismo
  //  · muerte / final del juego (o `now`): inmediato
  function switchTo(key, imm0) {
    var t = now(), from = S.key, p = PIECES[key];
    if (!p || key === from) return;
    if (S.fresh) {                                                         // aún no se generó ninguna barra: cambiar de pieza sin cortar nada
      S.key = key; S.piece = p; S.bar = resumeAt(key); S.cur = { t0: S.nextBar, u: 60 / (p.bpm * S.tm), nb: p.nb };
      applyFx(key, t, 0.1); applyNight(t, 0.2);
      return;
    }
    var po = PIECES[from];
    if (po.song === p.song && from !== 'dead' && from !== 'won') {            // título <-> playa: la misma canción, solo cambian las capas
      S.key = key; S.piece = p; S.log.push({ t: S.nextBar, from: from, key: key, same: true }); applyFx(key, t, 0.2); applyNight(t, 0.3);
      return;
    }
    var imm = imm0 || key === 'dead' || key === 'won' || from === 'dead' || from === 'won';
    var cut = imm || urgent(key) || urgent(from) || key === 'final' || from === 'final';
    var at = null, k, cur = S.cur;
    if (!cut) {                                                            // siguiente compás: las barras ya generadas siguen; la nueva pieza entra en S.nextBar
      if (po.resume) S.saved[from] = S.bar;
      S.key = key; S.piece = p; S.bar = resumeAt(key);
      S.log.push({ t: S.nextBar, from: from, key: key, asked: t, soft: true });
      (S.sw = S.sw || []).push({ asked: t, at: S.nextBar, from: from, key: key, bar: S.bar });
      applyFx(key, S.nextBar, 0.3); applyNight(S.nextBar, nightTc(S.nextBar));
      return;
    }
    if (imm) at = t + (key === 'dead' ? 0.12 : 0.06);
    else {
      for (k = 0; k <= cur.nb; k++) { var cand = cur.t0 + k * cur.u; if (cand >= t + 0.05) { at = cand; break; } }
      if (at === null) at = Math.max(S.nextBar, t + 0.05);
    }
    var fl = imm ? 0 : Math.min(0.5 * cur.u, at - t - 0.02), fs = fl > 0.06 ? at - fl : null;     // anacrusa
    if (po.resume) S.saved[from] = S.bar;
    S.queue = S.queue.filter(function (e) { return !(e.t >= at - 1e-4 && e.k !== 'stg') && !(fs !== null && e.k === 'perc' && e.t >= fs - 1e-4); });
    cutLive(at, fs);
    // el reloj: se recorta el último compás registrado al corte; los pulsos siguen contando
    var lb = S.bars[S.bars.length - 1], bc = S.beatCount;
    if (lb) {
      if (lb.t >= at - 1e-6) { while (S.bars.length && S.bars[S.bars.length - 1].t >= at - 1e-6) { var rm = S.bars.pop(); bc = rm.n0; } }
      else if (at < lb.t + lb.nb * lb.u - 1e-6) { lb.end = at; bc = lb.n0 + Math.round((at - lb.t) / lb.u); }
    }
    S.beatCount = bc;
    if (fs !== null) {                                                     // anacrusa directa (no se vuelve a cortar)
      if (urgent(key)) { play(fs, S.buf.cajS, 'cajon', 0.5, 0, 'x'); play(fs + fl * 0.5, S.buf.cajS, 'cajon', 0.62, 0, 'x'); play(fs + fl * 0.75, S.buf.cajB, 'cajon', 0.8, 0, 'x'); }
      else { play(fs + fl * 0.4, S.buf.checo, 'perc', 0.4, 0, 'x'); play(fs + fl * 0.8, S.buf.checoL, 'perc', 0.5, 0, 'x'); }
    }
    S.key = key; S.piece = p; S.bar = resumeAt(key); S.nextBar = at;
    S.cur = { t0: at, u: 60 / (p.bpm * S.tm), nb: p.nb };
    applyFx(key, at, 0.1); applyNight(at, nightTc(at));
    S.log.push({ t: at, from: from, key: key, asked: t });
    (S.sw = S.sw || []).push({ asked: t, at: at, from: from, key: key, bar: S.bar });
    if (!S.offline && S.sw.length > 24) S.sw.shift();
  }
  function requestMood(imm) { if (S.paused) return; switchTo(keyFor(S.mood), imm); }

  function generateBar() {
    var t0 = S.nextBar, p = S.piece, b = S.bar, N = nightAt(t0), u = 60 / (p.bpm * S.tm), c = barCtx(t0, u, p.nb);
    if (p.loop || b < p.len) {
      var L = p.layers(S.I, b, N), key, k2;
      for (key in S.mute) if (S.mute[key]) L[key] = false;
      p.bar(p.loop ? b % p.len : b, c, L, N, p.def);
    }
    S.cur = { t0: t0, u: u, nb: p.nb }; S.fresh = false;
    S.bars.push({ t: t0, u: u, nb: p.nb, n0: S.beatCount, bar: S.barCount, key: S.key, b: b, end: 0 });
    S.beatCount += p.nb; S.barCount++;
    S.nextBar = t0 + u * p.nb; S.bar++;
    if (!S.offline && S.bars.length > 48) S.bars.shift();
    else if (S.offline && S.bars.length > 4000) S.bars.shift();
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
    if (S.live.length > 200 || (S.live.length && S.live[0].te < t - 0.5)) S.live = S.live.filter(function (v) { return v.te > t - 0.2; });
    if (S.lastTick) S.maxGap = Math.max(S.maxGap, t - S.lastTick);
    S.lastTick = t;
  }

  // =========================================================================================================
  // RELOJ DE COMPÁS: lo que oye el jugador, calculado del registro de compases del mismo programador de notas
  var CHAIN_LAT = 0.0153, MOTOR_LAT = 0.006;      // CHAIN_LAT: medido con la cajita en OfflineAudioContext (desfase constante, ±0,06 ms)
  function heardTime() {
    var c = S.ctx, t = c.currentTime, lat = 0;
    if (S.offline) return S.vnow;
    try { lat = isFinite(c.outputLatency) && c.outputLatency > 0 ? c.outputLatency : (isFinite(c.baseLatency) ? c.baseLatency : 0); } catch (e) { lat = 0; }
    lat = clamp(lat, 0, 0.35) + CHAIN_LAT + (A._nodes && A._nodes.comp ? MOTOR_LAT : 0);     // + retardo de los compresores de esta mezcla (2 × 6 ms de anticipación, medido) y del compresor maestro del motor
    S.lat = lat;
    return t - lat - (A.br.offset || 0);
  }
  function beatAt(t) {
    var B = S.bars, i, e = null;
    for (i = B.length - 1; i >= 0; i--) if (t >= B[i].t - 1e-6) { e = B[i]; break; }
    if (!e) return null;
    var end = e.end || (e.t + e.nb * e.u);
    if (t > end + 0.35) return null;                     // el programador se detuvo (contexto suspendido / pausa dura)
    var pos = (t - e.t) / e.u, k = Math.max(0, Math.min(e.nb - 1, Math.floor(pos))), ph = clamp(pos - k, 0, 1), toNext = (k + 1 - pos) * e.u;
    if (e.end) toNext = Math.min(toNext, e.end - t);
    var nxt = null;
    for (i = B.length - 1; i >= 0; i--) if (B[i].t > t) nxt = B[i]; else break;
    if (nxt) toNext = Math.min(toNext, nxt.t - t);
    var pc = PIECES[e.key] || {};
    return { bpm: +(60 / e.u).toFixed(2), meter: e.nb, beat: e.n0 + k, phase: ph, bar: e.bar, beatInBar: k, toNext: Math.max(0, toNext), src: 'audio',
             key: e.key, piece: pc.name || e.key, boss: e.key === 'jefe1' || e.key === 'jefe2' || e.key === 'jefe3', barInPiece: e.b, pulse: e.u, t: t, latency: S.lat || 0 };
  }
  function beatNow() {
    if (!S) return null;
    if (!S.offline && (!S.ctx || S.ctx.state !== 'running')) return null;
    return beatAt(heardTime());
  }

  // =========================================================================================================
  // stingers (encima de la música; no se cortan al cambiar de ánimo)
  var STG_GAP = { kill: 0.5, hurt: 0.35, horde: 1.5, death: 2, win: 2, cobrador: 2.5, 'boss.intro': 2, 'boss.down': 2, gong: 1, 'br.atiempo': 0.15, 'br.contrapunto': 0.8, 'br.deseo': 1.5, 'br.pregon': 1, 'br.respuesta': 1 };
  function nextStep(t) {
    var cur = S.cur, step = cur.u / (cur.nb === 3 ? 2 : 3), kk = Math.ceil((t + 0.03 - cur.t0) / step);
    return cur.t0 + Math.max(0, kk) * step;
  }
  function tonic() {                                       // tónica y escala del tema que suena (para los stingers)
    var k = S.key;
    if (k === 'jefe1') return { r: 67, pcs: [7, 9, 10, 0, 2, 3, 6] };                         // Sol menor armónico
    if (k === 'jefe2' || k === 'playa' || k === 'title') return { r: 69, pcs: [9, 11, 0, 2, 4, 5, 8] };   // La menor armónica
    if (k === 'bajada' || k === 'horde') return { r: 62, pcs: [2, 4, 5, 7, 9, 10, 1] };       // Re menor armónico
    if (k === 'parque' || k === 'final') return { r: 67, pcs: [7, 9, 11, 0, 2, 4, 6] };       // Sol mayor
    if (k === 'bohemia') return { r: 71, pcs: [11, 1, 2, 4, 6, 7, 10] };                      // Si menor armónico
    return { r: 64, pcs: [4, 6, 7, 9, 11, 0, 3] };                                            // Mi menor armónico
  }
  function scaleUp(lo, n, pcs) { var out = [], m = lo; while (out.length < n) { if (pcs.indexOf(((m % 12) + 12) % 12) >= 0) out.push(m); m++; } return out; }
  function stingerNow(name) {
    var t = now(), last = S.stgLast[name] || -9;
    if (t - last < (STG_GAP[name] || 0.4)) return;
    S.stgLast[name] = t;
    var q, tn = tonic(), r = tn.r, i, G = { layer: 'stg', k: 'x' };
    if (name === 'kill') {
      q = nextStep(t); S.kills = (S.kills || 0) + 1;
      var v = S.kills % 4;
      if (v === 0) { gtr(q, r + 7, 0.09, { layer: 'stg', k: 'x', vel: 0.45 }); gtr(q + 0.09, r + 12, 0.24, { layer: 'stg', k: 'x', vel: 0.55, scoop: true, vib: true }); }
      else if (v === 1) { scaleUp(r - 5, 5, tn.pcs).forEach(function (m, k2) { gtr(q + k2 * 0.045, m + 12, 0.15, { layer: 'stg', k: 'x', vel: 0.4 + 0.04 * k2, kind: 'har' }); }); play(q + 0.24, S.buf.cajitaH, 'stg', 0.4, 0, 'x'); }
      else if (v === 2) { play(q, S.buf.cajitaH, 'stg', 0.5, 0, 'x'); play(q + 0.1, S.buf.cajitaL, 'stg', 0.5, 0, 'x'); play(q + 0.2, S.buf.clap, 'stg', 0.5, 0, 'x'); }
      else { play(q, S.buf.cajS, 'stg', 0.6, 0, 'x'); play(q + 0.11, S.buf.cajB, 'stg', 0.7, 0, 'x'); play(q + 0.22, S.buf.quijS, 'stg', 0.5, 0, 'x'); }       // «ta-tum-rrr»
    } else if (name === 'hurt') {
      q = t + 0.01;
      strum(q, [r - 24, r - 23, r - 18, r - 12], 'open', 0.7, false, 'stg', 0.3, 'x');                                  // acorde que se muerde: semitono contra la tónica
      play(q, S.buf.cajB, 'stg', 0.8, 0.9, 'x'); play(q + 0.02, S.buf.quij, 'stg', 0.55, 0, 'x');
    } else if (name === 'horde') {
      q = t + 0.02;
      for (i = 0; i < 14; i++) play(q + i * 0.06, S.buf[i % 3 === 2 ? 'cajB' : 'cajS'], 'stg', 0.22 + i * 0.04, i % 3 === 2 ? 0.95 : 0, 'x');
      play(q + 0.05, S.buf.quij, 'stg', 0.7, 0, 'x'); play(q + 0.5, S.buf.quijS, 'stg', 0.6, 0, 'x');
      strum(q + 0.86, [r - 24, r - 17, r - 12, r - 8, r - 5], 'open', 0.9, false, 'stg', 0.5, 'x'); play(q + 0.86, S.buf.cajB, 'stg', 1, 0, 'x'); play(q + 0.86, S.buf.clap, 'stg', 0.7, 0, 'x');
    } else if (name === 'death') {
      q = t + 0.02;
      [r + 7, r + 5, r + 3, r].forEach(function (m, k2) { gtr(q + k2 * 0.5, m, 0.8, { layer: 'stg', k: 'x', vel: 0.6, vib: true, scoop: k2 === 0 }); });
      coro(q, [r - 12, r - 5], 2.4, 'o', 0.5, 'x'); strum(q + 0.05, [r - 24, r - 17, r - 12], 'open', 0.6, false, 'stg', 1.8, 'x');
      play(q, S.buf.cajB, 'stg', 0.7, 0.9, 'x'); play(q + 1.9, S.buf.cajB, 'stg', 0.5, 0.85, 'x');
    } else if (name === 'win') {
      // final de jarana: redoble de cajón, acorde grande de guitarra, palmas y la última nota que se queda sonando
      q = nextStep(t);
      for (i = 0; i < 6; i++) play(q + i * 0.05, S.buf.cajS, 'stg', 0.25 + i * 0.1, 0, 'x');
      var t1 = q + 0.36, t2 = t1 + 0.5, dom = r - 5;
      strum(t1, [dom - 12, dom - 5, dom, dom + 4, dom + 10], 'open', 0.85, false, 'stg', 0.5, 'x'); play(t1, S.buf.cajB, 'stg', 1, 0, 'x'); play(t1, S.buf.clap, 'stg', 0.8, 0, 'x');
      strum(t2, [r - 24, r - 17, r - 12, r - 8, r - 5], 'open', 0.95, false, 'stg', 2.4, 'x'); play(t2, S.buf.cajB, 'stg', 1, 0, 'x'); play(t2 + 0.02, S.buf.cajS, 'stg', 0.8, 0, 'x'); play(t2, lazy('applause'), 'crowd', 0.6, 0, 'x');
      gtr(t2 + 0.04, r + 12, 4.8, { kind: 'last', layer: 'stg', k: 'x', vel: 0.6, vib: true, rel: 0.5 });
    } else if (name === 'cobrador') {
      q = nextStep(t);
      var doodle = [[0, 0.08], [4, 0.08], [7, 0.08], [12, 0.16], [7, 0.08], [4, 0.08], [0, 0.08], [4, 0.3]], tt = q;
      doodle.forEach(function (x, k2) { gtr(tt, r + x[0], x[1] * 0.9, { layer: 'stg', k: 'x', vel: 0.55, kind: 'har' }); if (k2 % 2 === 0) play(tt, S.buf.cajitaH, 'stg', 0.3, 0, 'x'); tt += x[1]; });
    } else if (name === 'boss.intro') {
      // se encienden las luces del tabladillo: redoble de cajón, acorde grande y aplausos zombies
      q = t + 0.02;
      for (i = 0; i < 12; i++) play(q + i * 0.07, S.buf[i % 4 === 3 ? 'cajB' : 'cajS'], 'stg', 0.2 + i * 0.06, i % 4 === 3 ? 0.95 : 0, 'x');
      var tb = q + 0.95;
      strum(tb, [r - 24, r - 17, r - 12, r - 9, r - 5], 'open', 0.95, false, 'stg', 1.2, 'x'); play(tb, S.buf.cajB, 'stg', 1, 0, 'x'); play(tb, lazy('bellL'), 'stg', 0.5, 0, 'x'); play(tb, lazy('applause'), 'crowd', 0.7, 0, 'x');
      play(q + 0.3, S.buf.quij, 'stg', 0.6, 0, 'x');
    } else if (name === 'boss.down') {
      q = t + 0.02;
      play(q, lazy('bellL'), 'stg', 0.7, 0.8, 'x');
      var tw = q + 0.8;
      strum(tw, [r - 24, r - 17, r - 12, r - 8, r - 5], 'open', 0.8, false, 'stg', 1.8, 'x'); coro(tw, [r - 12, r - 5, r], 3, 'o', 0.45, 'x');
      gtr(tw + 0.05, r + 12, 3.2, { kind: 'last', layer: 'stg', k: 'x', vel: 0.5, vib: true, rel: 0.4 });
    } else if (name === 'gong') {
      play(t + 0.01, lazy('bellL'), 'stg', 0.85, 0, 'x');
    } else if (name === 'br.atiempo') {                       // ¡A TIEMPO!: campanita y tic de madera
      q = t + 0.005; play(q, lazy('bellH'), 'stg', 0.55, 1.2, 'x'); play(q, S.buf.cajitaH, 'stg', 0.5, 0, 'x');
    } else if (name === 'br.contrapunto') {                   // ¡CONTRAPUNTO!: arpegio de armónicos que sube, campana y palmas
      q = t + 0.01;
      scaleUp(r, 6, tn.pcs).forEach(function (m, k2) { gtr(q + k2 * 0.055, m + 12, 0.3, { layer: 'stg', k: 'x', vel: 0.45 + 0.05 * k2, kind: 'har' }); });
      play(q + 0.33, lazy('bellH'), 'stg', 0.6, 0, 'x'); play(q + 0.33, S.buf.clap, 'stg', 0.55, 0, 'x'); play(q + 0.33, S.buf.cajB, 'stg', 0.7, 0, 'x');
    } else if (name === 'br.pregon') {                        // el pregón de Jaranón: tres notas largas que anuncian
      q = t + 0.01; [0, 4, 7].forEach(function (iv, k2) { gtr(q + k2 * 0.2, r + iv, 0.6, { layer: 'stg', k: 'x', vel: 0.55, vib: true, scoop: true }); });
      coro(q, [r - 12], 1.0, 'a', 0.3, 'x');
    } else if (name === 'br.respuesta') {                     // ¡RESPONDE!: llamada de cajón (tres golpes)
      q = t + 0.01; play(q, S.buf.cajS, 'stg', 0.7, 0, 'x'); play(q + 0.13, S.buf.cajS, 'stg', 0.7, 0, 'x'); play(q + 0.26, S.buf.cajB, 'stg', 0.9, 0, 'x'); play(q + 0.26, lazy('bellH'), 'stg', 0.35, 0.8, 'x');
    } else if (name === 'br.deseo') {                         // el deseo del puente: arpegio brillante, campanas y un «aah» suave
      q = t + 0.02;
      var wish = [0, 4, 7, 12, 16, 19, 24].map(function (iv) { return r + 12 + iv; });
      wish.forEach(function (m, k2) { gtr(q + k2 * 0.09, m, 0.5, { layer: 'stg', k: 'x', vel: 0.42 + 0.04 * k2, kind: 'har' }); });
      play(q + 0.55, lazy('bellH'), 'stg', 0.6, 0, 'x'); play(q + 0.7, lazy('bellH'), 'stg', 0.4, 1.5, 'x'); play(q + 0.55, lazy('bellL'), 'stg', 0.3, 1.5, 'x');
      coro(q + 0.2, [r, r + 7, r + 12], 2.2, 'a', 0.34, 'x');
    }
  }

  // =========================================================================================================
  // API
  function init(ctx, out, reverbSend, offline, mood, I, boss) {
    seed = 20261121;
    S = { ctx: ctx, sr: ctx.sampleRate, cache: {}, queue: [], live: [], offline: !!offline, vnow: 0, log: [], bars: [], saved: {}, stgLast: {}, I: I, mood: mood, boss: offline ? !!boss : wantBoss, paused: false,
          late: 0, dropped: 0, maxGap: 0, lastTick: 0, resyncs: 0, sw: [], fresh: true, dry: false, beatCount: 0, barCount: 0, mute: offline ? {} : Object.assign({}, wantMute), tm: offline ? 1 : wantTM, tmCur: 1,
          lx: offline ? 240 : gLX, ly: offline ? 135 : gLY, lisSet: offline || gLSet, lat: 0,
          nTarget: !offline && wantNight ? 1 : 0, nFrom: !offline && wantNight ? 1 : 0, nT0: 0, nTc: 0.001, level: wantLevel,
          zone: offline ? 'playa' : wantZone, near: offline ? null : wantNear, nearEff: 0.3, ov: offline ? null : wantOv, auto: !offline && wantAuto, autoT: 0, silence: !offline && wantSilence ? 1 : 0 };
    S.n = build(ctx, out, reverbSend || null);
    buildSamples(); buildAmb();
    Object.keys(S.mute).forEach(function (k) { if (S.mute[k]) S.n.L[k] && (S.n.L[k].fade.gain.value = 0); });
    if (S.silence) S.n.sil.gain.value = 0.0001;
    var t = now() + 0.08;
    S.n.trim.gain.setValueAtTime(0, now()); S.n.trim.gain.linearRampToValueAtTime(TRIM, t + 0.9);        // fundido de entrada
    S.key = keyFor(mood === 'paused' ? 'title' : mood); S.piece = PIECES[S.key]; S.bar = 0; S.nextBar = t;
    warm(S.key);
    S.cur = { t0: t, u: 60 / (S.piece.bpm * S.tm), nb: S.piece.nb };
    applyFx(S.key, t, 0.05); applyNight(now(), 0.001);
    S.log.push({ t: t, key: S.key, from: null });
    if (mood === 'paused') setPaused(true);
    buildBand();
    if (!offline && wantBand) bandSet(wantBand.x, wantBand.y, wantBand.on, 'fade');
    // el resto de los temas se calientan en pausas pequeñas (4 compases cada 60 ms) para no cortar el programador
    var keys = ['bajada', 'parque', 'bohemia', 'chase', 'horde', 'jefe1', 'jefe2', 'jefe3', 'final', 'playa'].filter(function (k) { return k !== S.key; }), wq = [];
    keys.forEach(function (k) { for (var b = 0; b < PIECES[k].len; b += 4) wq.push([k, b]); });
    if (!offline) { S.warmList = wq; S.warmTimer = setTimeout(function wl() { if (!S || !S.warmList) return; var x = S.warmList.shift(); if (x) { try { warmBars(x[0], x[1], x[1] + 4); } catch (e) { /* nada */ } } if (S && S.warmList.length) S.warmTimer = setTimeout(wl, 60); }, 500); }
    else wq.forEach(function (x) { warmBars(x[0], x[1], x[1] + 4); });
    lazy('bellH');
  }
  // zona de explore; tema pedido por nombre; autodetección por la posición de Alexander
  function setZoneS(z) {
    if (ZONES.indexOf(z) < 0) return false;
    if (!S) { wantZone = z; return true; }
    if (!S.offline) wantZone = z;
    if (S.zone === z) return true;
    S.zone = z;
    applyFx(S.key, now(), 0.3);
    requestMood();
    return true;
  }
  function autoZone() {
    var G = ACH.G || (ACH.game && ACH.game.G), nv = ACH.nivel, W = ACH.world;
    if (!G || !G.player || !nv || nv.id !== 'barranco' || !W || typeof W.zona !== 'function' || typeof G.player.x !== 'number') return;
    var z = W.zona(G.player.x, G.player.y);
    if (z && ZONE_PIECE[z]) setZoneS(z);
  }
  function brPlayS(id, o) {
    id = String(id || '').replace(/^br\./, '');
    var imm = !!(o && o.now);
    if (id === 'deseo') { if (S) stingerNow('br.deseo'); return true; }
    if (id === 'explore') { engine.brStop(); return true; }
    if (ZONE_PIECE[id]) { wantAuto = false; if (S) S.auto = false; setZoneS(id); engine.brStop(); return true; }
    if (!OVERRIDES[id]) return false;
    var changed = (S ? S.ov : wantOv) !== id;
    if (!S || !S.offline) wantOv = id;
    if (changed) { if (!S || !S.offline) wantTM = 1; if (S) S.tm = 1; }
    if (!S) return true;
    S.ov = id;
    requestMood(imm);
    return true;
  }
  function brStopS() {
    if (!S || !S.offline) wantOv = null;
    if (!S) return;
    S.tm = 1; if (!S.offline) wantTM = 1;
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
  var MOODS = ['title', 'explore', 'chase', 'horde', 'paused', 'dead', 'won'];
  var engine = {
    pauseFilter: null,                         // null: automático (no filtra si el motor ya filtra la música en pausa)
    start: function (ctx, out, reverbSend) {
      try {
        if (S) engine.stop(true);
        init(ctx, out, reverbSend, false, wantMood, wantI);
        S.timer = setInterval(tick, 25);       // el primer tick llega en <25 ms; la primera barra está a 80 ms
      } catch (e) { if (typeof console !== 'undefined') console.warn('criolla: no arrancó', e); S = null; }
    },
    // ánimos: title | explore | chase | horde | paused | dead | won. Cambia en el siguiente pulso (<= ~0,9 s).
    setMood: function (m) {
      if (typeof m === 'string' && m.indexOf('br.') === 0) { if (m === 'br.off' || m === 'br.stop') brStopS(); else brPlayS(m); return; }
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
    // jefe: con setBoss(true) y ánimo horde/chase toca jefe1 (el jefe de Barranco pide sus temas con br.play); con false vuelve
    setBoss: function (on) {
      on = !!on;
      if (!S || !S.offline) wantBoss = on;
      if (!S) return;
      S.boss = on;
      try { requestMood(); } catch (e) { if (S.offline) throw e; }
    },
    boss: function () { return S ? !!S.boss : wantBoss; },
    // Barranco: zona de explore, cercanía a la peña (0..1), tema por nombre, tempo del tema, capa en silencio, autodetección
    setZone: function (z) { if (!S || !S.offline) { wantAuto = false; if (S) S.auto = false; } try { setZoneS(z); } catch (e) { if (S && S.offline) throw e; } },
    zone: function () { return S ? S.zone : wantZone; },
    setNear: function (v) { v = v == null ? null : clamp(+v || 0, 0, 1); if (!S || !S.offline) wantNear = v; if (S) { S.near = v; try { applyFx(S.key, now(), 0.4); } catch (e) { /* nada */ } } },
    auto: function (on) { if (on === undefined) return S ? !!S.auto : wantAuto; on = !!on; wantAuto = on; if (S && !S.offline) { S.auto = on; S.autoT = 0; } return on; },
    brPlay: function (id, o) { try { return brPlayS(id, o); } catch (e) { if (S && S.offline) throw e; return false; } },
    brStop: function () { try { brStopS(); } catch (e) { if (S && S.offline) throw e; } },
    brPlaying: function () { return S ? S.ov : wantOv; },
    setTempoMul: function (m) { m = clamp(+m || 1, 0.5, 1.6); if (!S || !S.offline) wantTM = m; if (S) S.tm = m; return m; },
    tempoMul: function () { return S ? S.tm : wantTM; },
    setLayerMute: function (name, on) {
      on = !!on;
      if (!S || !S.offline) wantMute[name] = on;
      if (!S) return;
      S.mute[name] = on;
      var Ly = S.n.L[name]; if (Ly) { var t = now(); Ly.fade.gain.cancelScheduledValues(t); Ly.fade.gain.setTargetAtTime(on ? 0.0001 : Ly.vol, t, 0.06); }
    },
    silence: function (on, secs) {
      on = !!on; if (!S || !S.offline) wantSilence = on ? 1 : 0;
      if (!S) return;
      var t = now(); S.silence = on ? 1 : 0; S.n.sil.gain.cancelScheduledValues(t); S.n.sil.gain.setTargetAtTime(on ? 0.0001 : 1, t, Math.max(0.01, (secs === undefined ? 1.2 : +secs) / 3));
    },
    beat: beatNow,
    chainLatency: function () { return CHAIN_LAT; },
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
    setLevel: function (id) { wantLevel = id; if (S) S.level = id; },
    level: function () { return S ? S.level : wantLevel; },
    // combo de la calle en (x, y): trío criollo (guitarra, bordón y cajón). on=false: se va con fundido; mode 'cut': se calla de golpe.
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
      return { state: B.state, x: B.x, y: B.y, dist: Math.round(B.d), gain: +B.g.toFixed(3), duckDb: +B.duckDb.toFixed(2), bar: B.bar, queued: B.queue.length, late: B.late, dropped: B.dropped, cuts: B.cuts, starts: B.starts, hum: null };
    },
    stop: function (quick) {
      if (!S) return;
      var s = S; S = null;
      clearInterval(s.timer); clearTimeout(s.warmTimer);
      try {
        var t = s.offline ? s.vnow : s.ctx.currentTime;
        s.n.trim.gain.cancelScheduledValues(t); s.n.trim.gain.setTargetAtTime(0, t, quick ? 0.02 : 0.12);
        setTimeout(function () { try { s.n.trim.disconnect(); s.n.sg.disconnect(); s.n.cvib.stop(); s.n.seaLfo.stop(); s.n.seaSrc.stop(); s.n.crowdSrc.stop(); s.n.crowdLfos.forEach(function (l) { l.stop(); }); } catch (e) { /* nada */ } }, quick ? 150 : 900);
      } catch (e) { /* nada */ }
    },
    state: function () {
      return S ? { night: +nightAt(now()).toFixed(3), mood: S.mood, key: S.key, piece: S.piece.name, boss: !!S.boss, zone: S.zone, near: +(S.nearEff || 0).toFixed(2), ov: S.ov, auto: !!S.auto, bar: S.bar, intensity: S.I, paused: S.paused, queued: S.queue.length, live: S.live.length,
                   late: S.late, dropped: S.dropped, resyncs: S.resyncs, maxGap: +S.maxGap.toFixed(3), t: now(), band: S.B ? S.B.state : 'off', bpm: S.cur ? +(60 / S.cur.u).toFixed(1) : 0, tempoMul: S.tm, switches: (S.sw || []).slice(-8) } : null;
    },
    // Render sin reloj real: script = [{t, mood|intensity|stinger|night|secs|boss|zone|play|stop|tempo|solo|mute|near|band:{x,y,on,mode}|listener:{x,y}}], dt fijo. Solo con OfflineAudioContext; no toca el motor en vivo.
    _offline: function (ctx, out, reverbSend, script, dur) {
      var r = engine._offlineBegin(ctx, out, reverbSend, script);
      r.advance(dur);
      return r.end();
    },
    _offlineBegin: function (ctx, out, reverbSend, script) {
      if (!isOffline(ctx)) throw new Error('musicEngine._offline: solo con OfflineAudioContext');
      script = (script || []).slice().sort(function (a, b) { return a.t - b.t; });
      var first = script.length && script[0].t === 0 && script[0].mood ? script.shift() : null;
      if (first && (first.solo || first.mute)) script.unshift({ t: 0, solo: first.solo, mute: first.mute });       // lo que init no hace, se aplica en el primer cuadro
      var live = S, me;
      try {
        init(ctx, out, reverbSend, true, first ? first.mood : 'explore', first && first.intensity !== undefined ? first.intensity : 0, first && first.boss); me = S;
        if (first && first.night) setNightS(true, 0);
        if (first && (first.zone || first.play || first.tempo)) {
          if (first.zone && ZONE_PIECE[first.zone]) S.zone = first.zone;
          if (first.play && OVERRIDES[first.play]) S.ov = first.play;
          if (first.tempo) S.tm = clamp(+first.tempo || 1, 0.5, 1.6);
          S.key = keyFor(S.mood); S.piece = PIECES[S.key]; warm(S.key); S.cur = { t0: S.nextBar, u: 60 / (S.piece.bpm * S.tm), nb: S.piece.nb }; applyFx(S.key, now(), 0.05);
        }
      } finally { S = live; }
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
                if (c.mute) Object.keys(c.mute).forEach(function (k) { engine.setLayerMute(k, c.mute[k]); });
                if (c.intensity !== undefined) engine.setIntensity(c.intensity);
                if (c.boss !== undefined) engine.setBoss(c.boss);
                if (c.zone) engine.setZone(c.zone);
                if (c.near !== undefined) engine.setNear(c.near);
                if (c.tempo !== undefined) engine.setTempoMul(c.tempo);
                if (c.play) engine.brPlay(c.play, c.opts);
                if (c.stop) engine.brStop();
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
        end: function () { return { log: me.log.slice(), bars: me.bars.slice(), sw: me.sw.slice(), late: me.late, dropped: me.dropped, resyncs: me.resyncs, beatAt: function (t) { var pv = S; S = me; try { return beatAt(t); } finally { S = pv; } } }; }
      };
    },
    _with: function (ctx, out, fn) {   // pruebas: tocar instrumentos sueltos (solo OfflineAudioContext)
      if (!isOffline(ctx)) throw new Error('musicEngine._with: solo con OfflineAudioContext');
      var live = S;
      try {
        init(ctx, out, null, true, 'explore', 0);
        S.n.trim.gain.cancelScheduledValues(0); S.n.trim.gain.value = TRIM;
        fn({ gtr: gtr, strum: strum, bass: bass, coro: coro, play: play, buf: S.buf, M: M, lazy: lazy, S: function () { return S; } });
      } finally { S = live; }
    },
    _pieces: PIECES,
    _layers: LAYERS,
    _theory: function () { return { PLA: PLA, BAJ: BAJ, PAR: PAR, BOH: BOH, CHS: CHS, HRD: HRD, JF1: JF1, JF2: JF2, JF3: JF3, FIN: FIN, chord: chord, isTone: isTone, segs: segs, M: M, third: third }; }
  };
  A.musicEngine = engine;

  // ---------------------------------------------------------------------------------------------------------
  // ACH.audio.br - atajo para pedir los temas de Barranco y el reloj de compás. Todo funciona aunque el audio aún esté bloqueado (se recuerda y suena al desbloquear).
  //   br.beat()                              reloj de compás (ver arriba) o null; br.onTime(tol) true si estás a ≤ tol s de un pulso
  //   br.play("jefe1"|"jefe2"|"jefe3"|"final"|"chase"|"horde")  toca ese tema sobre cualquier ánimo (siguiente pulso; {now:true}: en 60 ms) hasta br.stop();
  //   br.play("deseo")                       jingle del deseo (sobre la música, no la corta) · br.play("explore"|"playa"|"bajada"|"parque"|"bohemia"…) fija la zona y quita el tema pedido
  //   br.stop()                              quita el tema por nombre, vuelve al ánimo del juego y deja el tempo en 1
  //   br.playing()                           id del tema activo o null
  //   br.setZone(z) / br.zone() / br.auto(on)  zona de explore (playa, bajada, puente, ermita, parque, bohemia, pena); la autodetección usa ACH.world.zona(x, y) con ACH.nivel.id === 'barranco'
  //   br.setNear(0..1 | null)                cercanía a la peña (abre la peña lejana de la zona bohemia); null = según la zona
  //   br.setTempoMul(m) / br.tempoMul()      tempo del tema que suena (0.5..1.6): cambia en el siguiente compás; se pone en 1 al pedir otro tema con play()
  //   br.setLayerMute(capa, on)              silencia una capa (por ejemplo 'cajon' cuando el cajonero se cae del cajón); capas: lead, contra, bordon, rhy, cajon, perc, palmas, coro, bass, crowd, far
  //   br.silence(on, secs)                   fundido a silencio (el jefe se sienta) y de vuelta, sin cambiar de tema
  //   br.stinger(name)                       stingers de música: kill, hurt, horde, death, win, cobrador, boss.intro, boss.down, gong, br.atiempo, br.contrapunto, br.pregon, br.respuesta, br.deseo
  //   br.info()                              {playing, zone, auto, tempoMul, state, beat}
  A.br = A.br || {};
  A.br.themes = ['explore', 'playa', 'bajada', 'parque', 'bohemia', 'chase', 'horde', 'jefe1', 'jefe2', 'jefe3', 'final', 'deseo'];
  A.br.zones = ZONES;
  A.br.offset = A.br.offset || 0;
  A.br.beat = function () { try { return beatNow(); } catch (e) { return null; } };
  A.br.onTime = function (tol) {
    var b = A.br.beat(); if (!b) return false;
    tol = typeof tol === 'number' ? tol : 0.12;
    return Math.min(b.phase * b.pulse, b.toNext) <= tol;
  };
  A.br.play = function (id, o) { return engine.brPlay(id, o); };
  A.br.stop = function () { engine.brStop(); };
  A.br.playing = function () { return engine.brPlaying(); };
  A.br.setZone = function (z) { engine.setZone(z); };
  A.br.zone = function () { return engine.zone(); };
  A.br.auto = function (on) { return engine.auto(on); };
  A.br.setNear = function (v) { engine.setNear(v); };
  A.br.setTempoMul = function (m) { return engine.setTempoMul(m); };
  A.br.tempoMul = function () { return engine.tempoMul(); };
  A.br.setLayerMute = function (n, on) { engine.setLayerMute(n, on); };
  A.br.silence = function (on, secs) { engine.silence(on, secs); };
  A.br.stinger = function (n) { engine.stinger(n); };
  A.br.cfg = CFG;
  A.br.info = function () { var st = engine.state(); return { playing: engine.brPlaying(), zone: engine.zone(), auto: engine.auto(), tempoMul: engine.tempoMul(), state: st, beat: A.br.beat() }; };
})();
