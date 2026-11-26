/* ACHORADO — audio/motor.js (motor de audio, v0.5): AudioContext perezoso, desbloqueo con la primera tecla o clic, buses,
   limitador, reverb de calle húmeda, paneo y atenuación por distancia, límite de voces, emit, volumen, silencio y preferencias.
   No asume sfx.js ni musica.js al cargar: los busca recién al sonar. Nada de aquí lanza errores hacia el juego. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var A = ACH.audio = ACH.audio || {};
  A.lib = A.lib || {};
  A.recipes = A.recipes || {};

  var MAX_VOICES = 24, DEF_CD = 0.03, DEF_DUR = 2.5;
  var PAN_R = 260, NEAR = 120, FAR = 420;
  var DEF = { master: 0.8, music: 0.5, sfx: 0.9, amb: 0.85, voces: 0.9 };   // QA v0.5: música −0,8 dB (el golpe queda 6 dB sobre ella), ambiente +3 dB (con la música a −24 dBFS el ambiente quedaba tapado)
  var KEY = 'achorado.audio.v1';
  var DUCK = Math.pow(10, -6 / 20);              // ambiente −6 dB en chase y horda
  var PEAK = Math.pow(10, -1 / 20);              // techo duro del limitador: −1 dBFS
  // Ajuste fino por evento (dB), medido con el analizador del QA: el golpe es lo más fuerte (−2 dB para que no apriete tanto el limitador
  // cuando se apilan golpes en una horda) y lo que quedaba 15–20 dB bajo el golpe sube un poco para oírse sobre la música.
  var TRIM_DB = { hit: -2, step: 4, whiff: 3, 'zombie.idle': 4, 'zombie.bite': 2, 'zombie.lunge': 1, swing: 1,
    // v0.8 (G5): lo más flojo de las armas nuevas queda 8–11 dB bajo `hit` (medido offline); sube lo que tiene que oírse sobre la música
    'punch.hit': 3, 'skate.hit': 3, 'hit.skate': 3, 'hit.generic': 2, 'hit.carretilla': 2, 'guitar.crack': 2, 'punch.swing': 2, 'skate.swing': 2, 'throw.skate': 2, 'throw.generic': 2, grab: 2,
    // v0.9 (nivel 2): lo flojo sube un poco para oírse sobre la música; las voces graves y los gritos de señora no necesitan ayuda
    jump: 3, land: 2, 'gallinazo.peck': 3, 'escoba.hit': 2, 'escoba.swing': 1 };
  var TRIM = {}; for (var tk in TRIM_DB) TRIM[tk] = Math.pow(10, TRIM_DB[tk] / 20);
  // prioridad por defecto (la receta puede traer .priority): la voz más vieja de menor prioridad es la que se descarta
  var PRIO = { hit: 5, kill: 5, 'player.hurt': 5, 'player.death': 5, win: 5, horde: 4, 'cobrador.shout': 4, swing: 4, whiff: 3,
    'zombie.bite': 4, 'zombie.lunge': 3, 'zombie.alert': 3, 'ui.ok': 4, 'ui.back': 4, 'ui.move': 3, 'game.pause': 4, 'game.resume': 4,
    'titina.launch': 3, step: 1, 'zombie.idle': 1, 'birds.fly': 2, 'dog.bark': 2, 'dog.whine': 2,
    // v0.6: golpes de objetos y chillidos importan; los loops de ambiente y los pasos menudos se descartan primero
    'prop.hit.metal': 4, 'prop.hit.glass': 4, 'prop.break.car': 5, 'prop.break.trash': 3, 'prop.break.cart': 3, 'pole.spark': 4, 'car.alarm': 3,
    'dog.yelp': 4, 'cat.meow': 3, 'cat.hiss': 3, 'cat.run': 2, 'sling.release': 4, 'stone.hit.zombie': 4, 'stone.hit.metal': 4, 'stone.hit.glass': 4, 'stone.hit.wood': 4,
    'stone.land': 3, 'loot.pickup': 4, 'loot.coins': 3, 'loot.drop': 2, 'loot.rare': 4, 'inv.open': 3, 'inv.close': 3, 'item.eat': 4, 'item.drink': 4, 'bag.full': 3,
    'shield.clang': 5, 'vehicle.fall': 3, 'glass.crunch': 2, 'zombie.hop': 1, 'zombie.crutch': 1, 'zombie.crawl': 1, 'zombie.wheel': 1, 'zombie.skate': 1,
    'zombie.bike': 1, 'zombie.cart': 1, 'zombie.sing': 2, 'singer.window': 2, 'sling.stretch': 3,
    // v0.8: armas de la calle, la noche y la comida
    'guitar.break': 5, 'guitar.crack': 4, 'punch.hit': 5, 'punch.swing': 3, 'skate.hit': 4, 'skate.swing': 3, 'skate.break': 4, 'throw.skate': 4, 'throw.bici': 4,
    'throw.moto': 3, 'moto.crash': 5, 'kick.cart': 4, 'cart.spill': 3, 'cart.take': 3, grab: 3, 'night.fall': 5, 'invis.on': 4, 'invis.off': 4, 'item.sick': 4,
    'roll.skate': 2, 'cart.roll': 2, 'zombie.moto': 2, 'hit.skate': 4, 'hit.bici': 4, 'hit.moto': 5, 'hit.carretilla': 4, 'hit.generic': 4, 'throw.generic': 4,
    // v0.9: nivel 2 (carretillas, gallinazos, señoras, fuego, tele). Los avisos y los golpes grandes importan; los bucles y el polvo se descartan primero
    jump: 4, land: 3, 'carretilla.warn': 5, 'carretilla.roll': 3, 'carretilla.crash': 5, 'carretilla.jumped': 4, 'gallinazo.screech': 4, 'gallinazo.flap': 2, 'gallinazo.peck': 4,
    'gallinazo.hit': 4, 'gallinazo.fall': 3, 'senora.yell': 4, 'balde.windup': 4, 'balde.splash': 4, 'olla.windup': 4, 'olla.clong': 5, 'olla.parry': 4,
    'escoba.swing': 3, 'escoba.hit': 4, 'escoba.break': 4, 'molotov.light': 4, 'molotov.throw': 4, 'molotov.break': 5, 'fire.whoosh': 4, 'fire.loop': 2,
    'fire.out': 3, 'zombie.burn': 3, 'tele.crash': 5, 'throw.tele': 4, 'fridge.hit': 4, 'fridge.open': 3, 'chicken.cluck': 2, 'chicken.flee': 3,
    'wind.dust': 1, 'radio.cumbia': 1 };

  A.ctx = null;
  A.bus = { master: null, music: null, sfx: null, amb: null, voces: null };
  A.reverbSend = null;
  A.log = false;                 // ACH.audio.log = true → console.log de cada evento con su contador
  A.counts = {};                 // eventos emitidos por nombre (también antes del desbloqueo)
  A.ambCtl = null;               // lo que devuelve amb.start: {setRain, setWind, lampBuzz, stop}

  var vol = load();
  var isMuted = !!vol.muted, vocesOn = vol.vocesOn !== false;
  var lx = 240, ly = 135;        // oyente (centro de la cámara)
  var voices = [], lastAt = {};
  var loops = [], MAX_LOOPS = 8, LOOP_TTL = 4;   // loops posicionales activos (ver A.loop)
  var mDuck = 1;                                  // factor de la música mientras alguien habla (A.duckMusic)
  var mood = 'title', intensity = 0, paused = false, night = false, level = 'gambetta';
  var musicOn = false, ambOn = false;
  var nodes = {};                // compresor, recorte, filtros internos

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function safe(fn) { try { return fn(); } catch (e) { if (A.log) console.warn('[audio]', e); } }

  /* ---------------- Preferencias ---------------- */
  function load() {
    var o = { master: DEF.master, music: DEF.music, sfx: DEF.sfx, amb: DEF.amb, voces: DEF.voces, muted: false, vocesOn: true };
    try {
      var s = window.localStorage && window.localStorage.getItem(KEY);
      if (s) { var j = JSON.parse(s); for (var k in o) if (j && typeof j[k] === typeof o[k]) o[k] = j[k]; }
    } catch (e) { /* almacenamiento bloqueado: valores por defecto */ }
    return o;
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify({ master: vol.master, music: vol.music, sfx: vol.sfx, amb: vol.amb, voces: vol.voces, muted: isMuted, vocesOn: vocesOn })); } catch (e) { /* nada */ }
  }

  /* ---------------- Grafo ---------------- */
  function ramp(param, v, tc) {
    if (!param || !A.ctx) return;
    var t = A.ctx.currentTime;
    param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); param.setTargetAtTime(v, t, tc || 0.03);
  }

  // Cadena final: master → compresor (limitador) → recorte suave con techo en −1 dBFS → destination.
  // El compresor hace el trabajo; el recorte garantiza que ningún pico pase de −1 dBFS aunque el ataque llegue tarde.
  function buildMaster(ctx, dest) {
    var master = ctx.createGain();
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -9; comp.knee.value = 4; comp.ratio.value = 20; comp.attack.value = 0.002; comp.release.value = 0.18;
    var clip = ctx.createWaveShaper(), n = 2048, curve = new Float32Array(n), knee = 0.6;
    for (var i = 0; i < n; i++) {
      var x = i / (n - 1) * 2 - 1, ax = Math.abs(x), y;
      // lineal hasta knee·PEAK, luego tanh hacia PEAK
      y = ax <= knee * PEAK ? ax : knee * PEAK + (1 - knee) * PEAK * Math.tanh((ax - knee * PEAK) / ((1 - knee) * PEAK));
      curve[i] = (x < 0 ? -1 : 1) * Math.min(y, PEAK);
    }
    clip.curve = curve; clip.oversample = '2x';
    master.connect(comp); comp.connect(clip); clip.connect(dest);
    return { master: master, comp: comp, clip: clip };
  }

  // IR generado de calle húmeda (~1,2 s): ruido estéreo que decae, cada vez más oscuro, con reflexiones tempranas de fachadas.
  function makeIR(ctx, secs) {
    var sr = ctx.sampleRate, len = Math.floor(sr * secs), buf = ctx.createBuffer(2, len, sr);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch), lp = 0, seed = ch ? 0x9e3779b9 : 0x2545f491;
      for (var i = 0; i < len; i++) {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
        var w = ((seed >>> 0) / 4294967296) * 2 - 1, t = i / sr;
        var k = 0.55 - 0.5 * (t / secs);          // el paso bajo se cierra con el tiempo (piso mojado: agudos que mueren rápido)
        lp += (w - lp) * k;
        d[i] = lp * Math.exp(-t * 5.2) * (t < 0.004 ? t / 0.004 : 1);
      }
      var er = [0.011, 0.019, 0.027, 0.041, 0.057], eg = [0.5, 0.35, 0.3, 0.2, 0.14];
      for (var e = 0; e < er.length; e++) { var at = Math.floor((er[e] + ch * 0.0037) * sr); if (at < len) d[at] += eg[e] * (ch ? -1 : 1); }
    }
    return buf;
  }

  function build() {
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    var ctx = new C();
    var m = buildMaster(ctx, ctx.destination);
    nodes.comp = m.comp; nodes.clip = m.clip;
    var bus = { master: m.master, music: ctx.createGain(), sfx: ctx.createGain(), amb: ctx.createGain(), voces: ctx.createGain() };
    // pausa: paso bajo compartido por música, efectos y su reverb
    var pauseLP = ctx.createBiquadFilter(); pauseLP.type = 'lowpass'; pauseLP.frequency.value = 20000; pauseLP.Q.value = 0.5;
    pauseLP.connect(bus.master);
    bus.music.connect(pauseLP); bus.sfx.connect(pauseLP); bus.voces.connect(pauseLP);   // voces: grabaciones de ACH.audio.voiceClips (la voz sintética sale por speechSynthesis, fuera del grafo)
    var duck = ctx.createGain(); bus.amb.connect(duck); duck.connect(bus.master);
    // reverb
    var send = ctx.createGain(), conv = ctx.createConvolver(), ret = ctx.createGain();
    conv.buffer = makeIR(ctx, 1.2); ret.gain.value = 0.32;
    send.connect(conv); conv.connect(ret); ret.connect(pauseLP);
    // envíos por bus (siguen el volumen de su bus) hacia el mismo convolver
    var sfxSend = ctx.createGain(), musicSend = ctx.createGain();
    sfxSend.connect(send); musicSend.connect(send);
    nodes.pauseLP = pauseLP; nodes.duck = duck; nodes.sfxSend = sfxSend; nodes.musicSend = musicSend; nodes.conv = conv;
    A.ctx = ctx; A.bus = bus; A.reverbSend = send;
    applyVolumes(true);
    return ctx;
  }

  function applyVolumes(now) {
    if (!A.ctx) return;
    var set = now ? function (p, v) { p.value = v; } : function (p, v) { ramp(p, v, 0.03); };
    set(A.bus.master.gain, isMuted ? 0 : vol.master);
    set(A.bus.music.gain, vol.music * mDuck); set(nodes.musicSend.gain, vol.music * mDuck);
    set(A.bus.voces.gain, vocesOn ? vol.voces : 0);
    set(A.bus.sfx.gain, vol.sfx); set(nodes.sfxSend.gain, vol.sfx);
    set(A.bus.amb.gain, vol.amb);
    set(nodes.duck.gain, (mood === 'chase' || mood === 'horde') ? DUCK : 1);
    set(nodes.pauseLP.frequency, paused ? 650 : 20000);
  }

  /* ---------------- Desbloqueo ---------------- */
  function unlock() {
    safe(function () {
      if (!A.ctx) build();
      if (!A.ctx) return;
      if (A.ctx.state !== 'running' && A.ctx.resume) {
        var pr = A.ctx.resume();
        if (pr && pr.then) pr.then(startLayers, function () {});
      }
      startLayers();
    });
  }
  function startLayers() {
    safe(function () {
      if (!A.ctx || A.ctx.state !== 'running') return;
      if (!ambOn && A.amb && typeof A.amb.start === 'function') {
        ambOn = true;
        if (level !== 'gambetta' && typeof A.amb.setLevel === 'function') safe(function () { A.amb.setLevel(level); });   // v0.9: se recuerda hasta que el ambiente arranque
        A.ambCtl = safe(function () { return A.amb.start(A.ctx, A.bus.amb, A.lib); }) || null;
      }
      if (!musicOn && A.musicEngine && typeof A.musicEngine.start === 'function') {
        musicOn = true;
        safe(function () { A.musicEngine.start(A.ctx, A.bus.music, nodes.musicSend); });
        musicCall('setMood', mood); musicCall('setIntensity', intensity);
        if (night) safe(function () { A.musicEngine.setNight(true, 0); });
        if (level !== 'gambetta' && typeof A.musicEngine.setLevel === 'function') safe(function () { A.musicEngine.setLevel(level); });
      }
    });
  }
  window.addEventListener('keydown', unlock, true);
  window.addEventListener('pointerdown', unlock, true);
  A.unlock = unlock;   // tactil.js: iOS solo deja reanudar el contexto en touchend / pointerup
  window.addEventListener('keydown', function (e) {
    if ((e.code === 'KeyM' || e.key === 'm' || e.key === 'M') && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) A.mute(!isMuted);
  });

  // Pestaña oculta: el navegador frena los temporizadores (el secuenciador de la música se atrasaría) → se suspende el contexto entero.
  document.addEventListener('visibilitychange', function () {
    safe(function () {
      if (!A.ctx) return;
      if (document.hidden) { if (A.ctx.state === 'running') A.ctx.suspend(); }
      else if (A.ctx.state === 'suspended') A.ctx.resume();
    });
  });

  /* ---------------- Posición ---------------- */
  function spatial(data) {
    if (!data || typeof data.x !== 'number' || typeof data.y !== 'number' || !isFinite(data.x) || !isFinite(data.y)) return { pan: 0, gain: 1, dist: 0 };
    var dx = data.x - lx, dy = data.y - ly, d = Math.sqrt(dx * dx + dy * dy), g;
    if (d <= NEAR) g = 1; else if (d >= FAR) g = 0;
    else { var t = (d - NEAR) / (FAR - NEAR); g = 1 - t * t * (3 - 2 * t); }
    return { pan: clamp(dx / PAN_R, -1, 1), gain: g, dist: d };
  }

  /* ---------------- Voces ---------------- */
  function killVoice(v, fast) {
    if (v.dead) return;
    v.dead = true;
    safe(function () {
      var t = A.ctx.currentTime;
      if (fast) { v.out.gain.cancelScheduledValues(t); v.out.gain.setValueAtTime(v.out.gain.value, t); v.out.gain.linearRampToValueAtTime(0, t + 0.02); }
      if (typeof v.stop === 'function') safe(function () { v.stop(); });
      var nodesV = v.nodes;
      // una receta con stop() (loops) hace su propio fundido de 60 ms: no cortar el cable antes
      setTimeout(function () { for (var i = 0; i < nodesV.length; i++) safe(function () { nodesV[i].disconnect(); }); }, fast ? 40 : (typeof v.stop === 'function' ? 220 : 0));
    });
  }
  function sweep() {
    if (!A.ctx) return;
    var t = A.ctx.currentTime;
    for (var i = voices.length - 1; i >= 0; i--) if (voices[i].dead || t >= voices[i].endAt) { killVoice(voices[i], false); voices.splice(i, 1); }
  }
  function makeRoom(prio) {
    sweep();
    if (voices.length < MAX_VOICES) return true;
    var vi = -1;
    for (var i = 0; i < voices.length; i++) if (vi < 0 || voices[i].prio < voices[vi].prio || (voices[i].prio === voices[vi].prio && voices[i].t0 < voices[vi].t0)) vi = i;
    if (voices[vi].prio > prio) return false;   // todo lo que suena importa más: se descarta la nueva
    killVoice(voices[vi], true); voices.splice(vi, 1);
    return true;
  }

  /* ---------------- API ---------------- */
  // Cadena de una voz: out (ganancia por distancia) → pan → bus.sfx, más un envío a la reverb que crece con la distancia.
  function mkChain(r, name, sp) {
    var ctx = A.ctx, out = ctx.createGain(), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null, wet = ctx.createGain();
    var trim = TRIM[name] || 1, wetBase = typeof r.wet === 'number' ? r.wet : 0.18;
    out.gain.value = sp.gain * trim;
    wet.gain.value = wetBase * (0.6 + 0.8 * clamp(sp.dist / FAR, 0, 1));
    if (pan) { pan.pan.value = sp.pan; out.connect(pan); pan.connect(A.bus.sfx); } else out.connect(A.bus.sfx);
    out.connect(wet); wet.connect(nodes.sfxSend);
    return { out: out, pan: pan, wet: wet, trim: trim, wetBase: wetBase, nodes: pan ? [out, pan, wet] : [out, wet] };
  }

  // v0.8: `throw.<id>` y `hit.<id>` resuelven aunque el id sea nuevo (nivel 2: throw.tele, hit.escoba…): sin receta propia caen a `throw.generic` / `hit.generic`.
  function recipeFor(name) {
    var R = A.recipes, r = R && R[name];
    if (typeof r === 'function') return r;
    var m = R && /^(throw|hit)\.[^.]+$/.exec(name);
    return m && typeof R[m[1] + '.generic'] === 'function' ? R[m[1] + '.generic'] : null;
  }
  A.recipeFor = recipeFor;

  A.emit = function (name, data) {
    A.counts[name] = (A.counts[name] || 0) + 1;
    if (A.log) console.log('[audio] ' + name + ' #' + A.counts[name], data || '');
    if (name === 'game.pause') setPaused(true);
    else if (name === 'game.resume') setPaused(false);
    if (name === 'noise') return;                  // solo para mezcla: no tiene sonido propio
    var ctx = A.ctx;
    if (!ctx || ctx.state !== 'running') return;
    safe(function () {
      var r = recipeFor(name);
      if (typeof r !== 'function') return;     // sin receta no suena nada (ya no hay pitidos de relleno)
      var now = ctx.currentTime, cd = typeof r.cooldown === 'number' ? r.cooldown : DEF_CD;
      if (lastAt[name] !== undefined && now - lastAt[name] < cd) return;
      var sp = spatial(data);
      if (sp.gain <= 0.001) return;
      var prio = typeof r.priority === 'number' ? r.priority : (PRIO[name] || 2);
      if (!makeRoom(prio)) return;
      lastAt[name] = now;
      var ch = mkChain(r, name, sp);
      var res = r(ctx, ch.out, data || {}, A.lib);
      var dur = typeof res === 'number' ? res : (typeof r.dur === 'number' ? r.dur : DEF_DUR);
      // una receta en loop (r.loop) llamada con emit suena `data.dur` segundos (la alarma de auto, el estirón de la resortera) y se apaga sola
      if (r.loop && data && typeof data.dur === 'number' && data.dur > 0) dur = data.dur;
      voices.push({ name: name, prio: prio, t0: now, endAt: now + dur, out: ch.out, stop: typeof res === 'function' ? res : null, nodes: ch.nodes });
    });
  };

  // A.stop(name): corta ya (con fundido) toda voz y todo loop de ese nombre. Úsalo con emit(name, {dur}) cuando la acción termina antes (soltar la resortera, apagar la alarma).
  A.stop = function (name) {
    safe(function () {
      for (var i = voices.length - 1; i >= 0; i--) if (voices[i].name === name) { killVoice(voices[i], false); voices.splice(i, 1); }
      for (var j = loops.length - 1; j >= 0; j--) if (loops[j].name === name) stopLoop(loops[j]);
      delete lastAt[name];
    });
  };

  /* ---------------- Loops posicionales ----------------
     ACH.audio.loop(name, data) → { move(x, y[, patch]), set(patch), touch(), stop(), alive }
     Para sonidos continuos que siguen a algo que se mueve (ruedas de zombies, voz del cantor, alarma). La receta debe tener `.loop = true`
     y devolver una función stop (lo hacen: car.alarm, sling.stretch, zombie.wheel/skate/bike/cart/sing, singer.window).
       · el motor mantiene el paneo y la ganancia por distancia de cada loop: se recalculan en cada setListener (cada cuadro) y en move();
       · move(x, y, patch?) → actualiza la posición del sonido (y, opcional, parámetros: {speed: px/s} en las ruedas, {charge: 0..1} en la resortera);
       · set(patch) → solo parámetros; stop() → fundido de 60 ms y se libera todo;
       · seguro contra fugas: si nadie llama move/touch/set en 4 s (data.ttl, 0 = nunca) el loop se apaga solo; el reloj no corre en pausa;
       · tope de 8 loops a la vez; al pasarse se descarta el más lejano (si el nuevo es más lejano, no suena y devuelve un handle inerte);
       · si la receta no es un loop, se emite como un golpe suelto y el handle es inerte.
     A.stopLoops() apaga todos (partida nueva). Sin contexto desbloqueado devuelve un handle inerte (alive:false). */
  function inertHandle(name) {
    var h = { name: name, alive: false, move: function () {}, set: function () {}, touch: function () {}, stop: function () {} };
    return h;
  }
  function respat(L) {
    var sp = spatial(L.data), t = A.ctx.currentTime;
    L.sp = sp;
    L.out.gain.setTargetAtTime(sp.gain * L.trim, t, 0.05);
    if (L.pan) L.pan.pan.setTargetAtTime(sp.pan, t, 0.05);
    L.wet.gain.setTargetAtTime(L.wetBase * (0.6 + 0.8 * clamp(sp.dist / FAR, 0, 1)), t, 0.1);
  }
  function stopLoop(L) {
    if (L.dead) return;
    L.dead = true; L.h.alive = false;
    var i = loops.indexOf(L); if (i >= 0) loops.splice(i, 1);
    safe(function () { if (typeof L.res === 'function') L.res(); });
    setTimeout(function () { for (var k = 0; k < L.nodes.length; k++) safe(function () { L.nodes[k].disconnect(); }); }, 250);
  }
  A.loop = function (name, data) {
    var H = inertHandle(name), ctx = A.ctx;
    if (!ctx || ctx.state !== 'running') return H;
    safe(function () {
      var r = recipeFor(name);
      if (typeof r !== 'function') return;
      if (!r.loop) { A.emit(name, data); return; }
      data = data || {};
      var sp = spatial(data);
      if (loops.length >= MAX_LOOPS) {
        var far = loops[0], k;
        for (k = 1; k < loops.length; k++) if (loops[k].sp.dist > far.sp.dist) far = loops[k];
        if (far.sp.dist <= sp.dist) return;
        stopLoop(far);
      }
      var ch = mkChain(r, name, sp);
      var res = r(ctx, ch.out, data, A.lib);
      if (typeof res !== 'function') { for (var q = 0; q < ch.nodes.length; q++) ch.nodes[q].disconnect(); return; }
      A.counts[name] = (A.counts[name] || 0) + 1;
      var L = { name: name, h: H, data: data, res: res, out: ch.out, pan: ch.pan, wet: ch.wet, trim: ch.trim, wetBase: ch.wetBase, nodes: ch.nodes, sp: sp,
        touched: ctx.currentTime, ttl: typeof data.ttl === 'number' ? data.ttl : LOOP_TTL, dead: false };
      loops.push(L);
      H.alive = true;
      H.touch = function () { L.touched = A.ctx ? A.ctx.currentTime : 0; };
      H.set = function (patch) { if (L.dead || !patch) return; H.touch(); if (typeof res.set === 'function') safe(function () { res.set(patch); }); };
      H.move = function (x, y, patch) {
        if (L.dead) return;
        if (typeof x === 'number' && isFinite(x)) L.data.x = x;
        if (typeof y === 'number' && isFinite(y)) L.data.y = y;
        safe(function () { respat(L); });
        H.touch();
        if (patch) H.set(patch);
      };
      H.stop = function () { stopLoop(L); };
      // los datos de arranque (speed, charge…) ya los leyó la receta; no hace falta set aquí
    });
    return H;
  };
  A.stopLoops = function () { for (var i = loops.length - 1; i >= 0; i--) stopLoop(loops[i]); };
  function tickLoops() {
    if (!loops.length || !A.ctx) return;
    var now = A.ctx.currentTime;
    for (var i = loops.length - 1; i >= 0; i--) {
      var L = loops[i];
      safe(function () { respat(L); });
      if (!paused && L.ttl > 0 && now - L.touched > L.ttl) stopLoop(L);
    }
  }

  A.setListener = function (x, y) {
    if (typeof x === 'number' && isFinite(x)) lx = x;
    if (typeof y === 'number' && isFinite(y)) ly = y;
    if (A.ctx) { safe(sweep); safe(tickLoops); }
    if (A.ambCtl && A.ambCtl.setListener) safe(function () { A.ambCtl.setListener(lx, ly); });   // zumbidos de postes y moscas, posicionales
    var me = A.musicEngine;
    if (musicOn && me && typeof me.setListener === 'function') safe(function () { me.setListener(lx, ly); });   // banda diegética posicional
  };

  A.setVolume = function (bus, v) {
    if (!(bus in DEF)) return;
    vol[bus] = clamp(+v || 0, 0, 1);
    safe(function () { applyVolumes(false); });
    save();
  };
  A.getVolume = function (bus) { return vol[bus]; };
  A.mute = function (on) {
    isMuted = !!on;
    safe(function () { applyVolumes(false); });
    save();
    syncUI();
  };
  A.muted = function () { return isMuted; };

  // Voces (v0.6): interruptor propio, guardado. Lo lee voces.js; el deslizador es A.setVolume('voces', v) o [data-vol="voces"].
  A.voicesOn = function () { return vocesOn; };
  A.setVoicesOn = function (on) {
    vocesOn = !!on;
    safe(function () { applyVolumes(false); });
    save(); syncUI();
    if (!vocesOn && A.cancelSpeech) safe(A.cancelSpeech);
  };

  // Música −db mientras alguien habla (la usa voces.js). Rampa corta.
  A.duckMusic = function (on, db) {
    mDuck = on ? Math.pow(10, -(typeof db === 'number' ? db : 4) / 20) : 1;
    if (!A.ctx) return;
    safe(function () { ramp(A.bus.music.gain, vol.music * mDuck, 0.08); ramp(nodes.musicSend.gain, vol.music * mDuck, 0.08); });
  };

  function setPaused(on) {
    paused = !!on;
    if (!paused && A.ctx) { var tn = A.ctx.currentTime; for (var i = 0; i < loops.length; i++) loops[i].touched = tn; }   // el reloj de los loops no corre en pausa
    safe(function () { applyVolumes(false); });
  }

  function musicCall(fn, arg) {
    if (!musicOn) { startLayers(); if (!musicOn) return; }
    var e = A.musicEngine;
    if (e && typeof e[fn] === 'function') safe(function () { e[fn](arg); });
  }
  A.music = {
    setMood: function (m) {
      if (m === mood) return;
      mood = m;
      if (A.ctx) safe(function () { ramp(nodes.duck.gain, (m === 'chase' || m === 'horde') ? DUCK : 1, 0.25); });
      musicCall('setMood', m);
    },
    setIntensity: function (v) {
      v = clamp(+v || 0, 0, 1);
      if (Math.abs(v - intensity) < 1e-3) return;
      intensity = v;
      musicCall('setIntensity', v);
    },
    stinger: function (name) { musicCall('stinger', name); },
    // v0.8: variante nocturna (explore lento y oscuro, persecución tensa). Fundido de ~8 s; secs = 0 lo hace al instante. Se recuerda hasta que la música arranque.
    setNight: function (on, secs) {
      on = !!on;
      if (on === night && secs === undefined) return;
      night = on;
      if (!musicOn) { startLayers(); if (!musicOn) return; }
      var e = A.musicEngine;
      if (e && typeof e.setNight === 'function') safe(function () { e.setNight(on, secs); });
    },
    night: function () { return night; },
    mood: function () { return mood; },
    intensity: function () { return intensity; }
  };

  // v0.9: nivel del juego. ACH.audio.setLevel('gambetta' | 'cerro') cambia el ambiente (garúa, viento con polvo, perros, ciudad abajo) y la música (explore con aire de huayno,
  // otro mambo en la salsa). Se puede llamar antes del desbloqueo: se recuerda y se aplica al arrancar las capas. No corta loops ni voces.
  A.setLevel = function (id) {
    id = id === 'cerro' ? 'cerro' : 'gambetta';
    level = id;
    if (A.amb && typeof A.amb.setLevel === 'function') safe(function () { A.amb.setLevel(id); });
    var e = A.musicEngine;
    if (e && typeof e.setLevel === 'function') safe(function () { e.setLevel(id); });
  };
  A.level = function () { return level; };

  A.info = function () {
    if (A.ctx) safe(sweep);
    return { state: A.ctx ? A.ctx.state : 'locked', mood: mood, night: night, level: level, intensity: +intensity.toFixed(3), voices: voices.length, muted: isMuted,
      paused: paused, reduction: nodes.comp ? +nodes.comp.reduction.toFixed(2) : 0, music: musicOn, amb: ambOn,
      volumes: { master: vol.master, music: vol.music, sfx: vol.sfx, amb: vol.amb, voces: vol.voces }, voicesOn: vocesOn, loops: loops.length };
  };
  A.voiceList = function () { return voices.map(function (v) { return v.name; }); };
  A.spatial = spatial;
  A._nodes = nodes;               // para QA: toma de medición (clip = salida final)
  A._buildMaster = buildMaster;   // para la prueba con OfflineAudioContext

  /* ---------------- Deslizadores de la pausa ---------------- */
  function syncUI() {
    var els = document.querySelectorAll ? document.querySelectorAll('[data-vol]') : [];
    for (var i = 0; i < els.length; i++) {
      var b = els[i].getAttribute('data-vol');
      els[i].value = Math.round(vol[b] * 100);
      var o = els[i].parentNode && els[i].parentNode.querySelector('output');
      if (o) o.textContent = Math.round(vol[b] * 100);
    }
    var m = document.getElementById('muteState');
    if (m) m.textContent = isMuted ? 'SIN SONIDO' : 'CON SONIDO';
    var vs = document.getElementById('vocesState');
    if (vs) vs.textContent = vocesOn ? 'CON VOCES' : 'SIN VOCES';
    var vt = document.querySelectorAll ? document.querySelectorAll('[data-voces-toggle]') : [];
    for (var j = 0; j < vt.length; j++) { vt[j].setAttribute('aria-pressed', vocesOn ? 'true' : 'false'); if (vt[j].type === 'checkbox') vt[j].checked = vocesOn; }
  }
  function bindUI() {
    var els = document.querySelectorAll('[data-vol]');
    for (var i = 0; i < els.length; i++) (function (inp) {
      inp.addEventListener('input', function () {
        A.setVolume(inp.getAttribute('data-vol'), inp.value / 100);
        var o = inp.parentNode.querySelector('output'); if (o) o.textContent = inp.value;
        A.emit('ui.move');
      });
      inp.addEventListener('keydown', function (e) { if (e.code === 'Space') e.preventDefault(); });
    })(els[i]);
    // interruptor de voces: cualquier elemento con data-voces-toggle (botón o casilla)
    var vt = document.querySelectorAll('[data-voces-toggle]');
    for (var k = 0; k < vt.length; k++) (function (el) {
      el.addEventListener('click', function () { A.setVoicesOn(!vocesOn); A.emit('ui.move'); });
      el.addEventListener('keydown', function (e) { if (e.code === 'Space') e.preventDefault(); });
    })(vt[k]);
    syncUI();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { safe(bindUI); }); else safe(bindUI);
})();
