/* ACHORADO — js/barranco/nivel.js (B1a): el nivel Barranco, de la Playa Barranco a la Peña La Última Jarana (BARRANCO.md §1, §2).
   Se carga PRIMERO en barranco.html. Define:
     ACH.nivel  la MISMA forma que el de Costa Verde (id 'barranco'). Los despachadores recorren ACH.br.systems.
     ACH.br     { systems, register(sys), sfx, toast, say, brandName, brandColors, BRANDS, prov, label, mk, dist, safe, U (= 10),
                  freeze(bool) / frozen(), talk(lines, onDone), finish(stats), runFinale(), setCheckpoint(id), checkpoint(), flag(k[, v]),
                  abrirPena(quien), on(ev, fn) / emit(ev, data), hora() / setHora(t), deseo(), stats{} }
                + el reloj del compás: beat() → {bpm, meter, beat, phase, bar, beatInBar, toNext, src:'audio'|'interno'} · onTime(tol=0.12)
                  · setTempo(bpm, meter)
     ACH.cv = ACH.mira = ACH.br (el MISMO objeto: juguetes.js e inflables.js corren igual)
     ACH.debug.br  tp, skip('jefe'|'final'), god, give, hora, routeCheck, spawnCheck, state  (+ ?br=jefe | final | noche | <lugar>)
   Congelar: G.state = 'cine' (como Costa Verde). Ver ../diseno/br-B1a.md. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var M = ACH.br = ACH.cv = ACH.mira = (ACH.br || ACH.cv || ACH.mira || {});
  M.systems = M.systems || [];
  M.register = function (sys) { if (sys && M.systems.indexOf(sys) < 0) M.systems.push(sys); return sys; };
  M.U = 10;
  M.stats = M.stats || {};

  /* ---------------- Marcas (los nombres los trae arte-casonas.js; esto es el respaldo) ---------------- */
  var BRANDS = {
    javier: { real: 'JAVIER', parodia: 'JABIEL EL BAJADERO', bg: '#2f5d3a', fg: '#f3efe2' }, posadaMirador: { real: 'LA POSADA DEL MIRADOR', parodia: 'LA POSADA DEL MIRADOR', bg: '#5b3a29', fg: '#f2d480' },
    isolina: { real: 'ISOLINA', parodia: 'ISOQUINA', bg: '#b5523b', fg: '#f3efe2' }, ayahuasca: { real: 'AYAHUASCA', parodia: 'CASONA TUÉTANO', bg: '#3a2a5a', fg: '#f2d480' },
    santos: { real: 'SANTOS', parodia: 'SANTOS CADÁVER', bg: '#1c1a22', fg: '#e3b94f' }, tioMario: { real: 'EL TÍO MARIO', parodia: 'EL TÍO MARIO', bg: '#b5523b', fg: '#ffe9b0' },
    juanito: { real: 'JUANITO', parodia: 'JUANITO', bg: '#2a2a2e', fg: '#f3efe2' }, oitaNoma: { real: 'OITA NOMÁ', parodia: 'OITA NO MATA', bg: '#5a2a2a', fg: '#f2d480' },
    barrancoBeer: { real: 'BARRANCO BEER COMPANY', parodia: 'BARRANCO BIRRA MUERTA CO.', bg: '#1c1a22', fg: '#e3b94f' }, piselli: { real: 'BODEGA PISELLI', parodia: 'BODEGA PISOTELI', bg: '#2f5d3a', fg: '#f3efe2' },
    sargento: { real: 'SARGENTO PIMIENTA', parodia: 'SARGENTO PIMIENTO ZOMBI', bg: '#c8402c', fg: '#ffe500' }, laNoche: { real: 'LA NOCHE', parodia: 'LA NOCHE ETERNA', bg: '#1c2a5a', fg: '#f3efe2' },
    candelaria: { real: 'LA CANDELARIA', parodia: 'LA CANDELABRA', bg: '#6a1a2a', fg: '#f2d480' }, donPorfirio: { real: 'PEÑA DON PORFIRIO', parodia: 'PEÑA DON PODRIDO', bg: '#5b3a29', fg: '#f3efe2' },
    laOficina: { real: 'LA OFICINA', parodia: 'LA OFICINA', bg: '#2a2a2e', fg: '#e3b94f' }, penaCarajo: { real: 'LA PEÑA DEL CARAJO', parodia: 'LA PEÑA DEL CEMENTERIO', bg: '#b5523b', fg: '#1c1a22' },
    estacion: { real: 'LA ESTACIÓN', parodia: 'LA ESTACIÓN', bg: '#3e6a7e', fg: '#f3efe2' }, victoria: { real: 'VICTORIA BAR', parodia: 'VICTORIA MUERTA BAR', bg: '#1c1a22', fg: '#e0457b' },
    cala: { real: 'CALA', parodia: 'CALAVERA', bg: '#f3efe2', fg: '#1c1a22' }, picas: { real: 'PICAS', parodia: 'PICAS DEL MÁS ALLÁ', bg: '#2f5d3a', fg: '#f3efe2' },
    cantaRana: { real: 'CANTA RANA', parodia: 'CANTA RANA PODRIDA', bg: '#4f7a3f', fg: '#f3efe2' }, floCanela: { real: 'LA FLOR DE LA CANELA', parodia: 'LA FLOR DE LA CANILLA', bg: '#8a4b32', fg: '#f2d480' },
    ultimaJarana: { real: 'PEÑA LA ÚLTIMA JARANA', parodia: 'PEÑA LA ÚLTIMA JARANA', bg: '#5a2a2a', fg: '#ffc766' },
    barLucho: { real: 'BAR LUCHO', parodia: 'BAR LUCHO', bg: '#2a2a2e', fg: '#ffc766' }, zaguanCeledonio: { real: 'ZAGUÁN', parodia: 'ZAGUÁN', bg: '#5b3a29', fg: '#f3efe2' }
  };
  M.BRANDS = BRANDS;
  function realMode() { return !(ACH.cfg && ACH.cfg.marcasReales === false); }
  M.brandName = function (id) {
    var K = ACH.sprites && ACH.sprites.br && ACH.sprites.br.casona;
    if (K && typeof K.brandName === 'function') { try { var n = K.brandName(id); if (typeof n === 'string' && n) return n.toUpperCase(); } catch (e) { /* tabla de aquí */ } }
    var b = BRANDS[id]; return b ? (realMode() ? b.real : b.parodia) : String(id || '').toUpperCase();
  };
  M.brandColors = function (id) { var b = BRANDS[id] || {}; return { bg: b.bg || '#555', fg: b.fg || '#fff', accent: b.fg || '#fff' }; };

  /* ---------------- Utilidades compartidas (las mismas de Costa Verde) ---------------- */
  M.sfx = function (name, data) { var a = ACH.audio; if (a && a.emit) { try { a.emit(name, data); } catch (e) { /* el sonido nunca rompe el juego */ } } };
  M.toast = function (t) { if (ACH.hud && ACH.hud.toast) { try { ACH.hud.toast(t); } catch (e) { /* nada */ } } };
  M.say = function (idOrText, o, fallbackText) {
    var a = ACH.audio; if (!a || !a.say) return false;
    try {
      if (a.phrases && a.phrases[idOrText]) return !!a.say(idOrText, o || {}) || true;
      var d = {}; for (var k in (o || {})) d[k] = o[k]; d.force = true;
      return !!a.say(fallbackText || idOrText, d) || true;
    } catch (e) { return false; }
  };
  M.dist = function (ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); };
  function mkc(w, h) { var c = null; try { if (ACH.px && ACH.px.canvas) c = ACH.px.canvas(w, h); } catch (e) { c = null; } if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; } return c; }
  M.mk = mkc;
  var provCache = {};
  M.prov = function (key, w, h, col, label, opt) {
    opt = opt || {};
    var ck = key + '|' + w + '|' + h + '|' + col;
    if (provCache[ck]) return provCache[ck];
    var c = mkc(w, h), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    if (opt.draw) opt.draw(g, w, h);
    else {
      g.fillStyle = '#1c1a22'; g.fillRect(0, 0, w, h);
      g.fillStyle = col; g.fillRect(1, 1, w - 2, h - 2);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(1, 1, w - 2, 1);
      g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(1, h - 3, w - 2, 2);
    }
    if (label) M.label(g, label, w, h, opt.ink);
    c.ax = opt.ax !== undefined ? opt.ax : Math.floor(w / 2); c.ay = opt.ay !== undefined ? opt.ay : h - 1;
    if (opt.fw !== undefined) c.fw = opt.fw;
    if (opt.fh !== undefined) c.fh = opt.fh;
    c.prov = true;
    provCache[ck] = c;
    return c;
  };
  M.label = function (g, label, w, h, ink, y) {
    var px = ACH.px, s = String(label).toUpperCase();
    try {
      if (px && px.G && px.text && px.measure) {
        while (s.length > 1 && px.measure(s, 'a5') > w - 2) s = s.slice(0, -1);
        if (px.measure(s, 'a5') > w - 2) return;
        // tildes y virgulilla (Á É Í Ó Ú Ñ) van 2 filas por ENCIMA de la letra: con una banda de 7 px y el texto en y=1 se recortaban (ajustes 2026-11-21)
        var mk = /[ÁÉÍÓÚÜÑ]/.test(s), bh = mk ? 9 : 7, tg = new px.G(w, bh);
        px.text(tg, s, Math.floor(w / 2), mk ? 3 : 1, { font: 'a5', ink: ink || '#f3efe2', align: 'c' });
        var tc = tg.toCanvas(), yy = y !== undefined ? y : Math.max(0, Math.floor(h / 2) - 4);
        if (mk) yy = Math.max(0, Math.min(yy - 1, h - bh));
        g.fillStyle = 'rgba(19,16,21,.55)'; g.fillRect(0, yy, w, bh);
        g.drawImage(tc, 0, yy);
        return;
      }
    } catch (e) { /* letra de sistema */ }
    g.font = '5px monospace'; g.fillStyle = ink || '#f3efe2'; g.textAlign = 'center'; g.fillText(s, w / 2, h / 2 + 2); g.textAlign = 'start';
  };
  function safe(o, fn, a, b, c) { if (o && typeof o[fn] === 'function') { try { return o[fn](a, b, c); } catch (e) { console.warn('[ACHORADO br] ' + fn, e); } } return undefined; }
  M.safe = safe;
  function CFG() { return (ACH.ent && ACH.ent.CFG) || {}; }

  /* ---------------- Eventos entre sistemas (p. ej. 'poetaRojo.muerto') ---------------- */
  var EV = {};
  M.on = function (ev, fn) { (EV[ev] = EV[ev] || []).push(fn); return function () { var L = EV[ev], i = L ? L.indexOf(fn) : -1; if (i >= 0) L.splice(i, 1); }; };
  M.emit = function (ev, data) { var L = EV[ev] || [], n = 0; for (var i = 0; i < L.length; i++) { try { if (L[i](data) !== false) n++; } catch (e) { console.warn('[ACHORADO br] evento ' + ev, e); } } return n; };

  /* ---------------- Despachadores ---------------- */
  var warned = {};
  function call(s, fn, a, b, c, d) {
    try { return s[fn](a, b, c, d); }
    catch (e) { var k = (s.name || s.id || '?') + '.' + fn; if (!warned[k]) { warned[k] = 1; console.warn('[ACHORADO br] ' + k, e); } return undefined; }
  }
  function each(fn, a, b, c, d) { var L = M.systems; for (var i = 0; i < L.length; i++) if (typeof L[i][fn] === 'function') call(L[i], fn, a, b, c, d); }

  /* ---------------- El reloj del compás (§1) ---------------- */
  var TEMPO = { bpm: 100, meter: 3, t0: 0 };
  function nowS() { return ((window.performance || Date).now()) / 1000; }
  M.setTempo = function (bpm, meter) {
    var b = +bpm, m = +meter;
    if (!(b > 20 && b < 400)) b = TEMPO.bpm;
    if (!(m >= 1 && m <= 12)) m = TEMPO.meter;
    if (b !== TEMPO.bpm || m !== TEMPO.meter) {   // se conserva la fase: el pulso nuevo arranca en el próximo pulso viejo
      var cur = internalBeat();
      TEMPO.t0 = nowS() + cur.toNext - Math.ceil(cur.beat + 1e-6) * (60 / b);
      TEMPO.bpm = b; TEMPO.meter = m;
    }
    return { bpm: TEMPO.bpm, meter: TEMPO.meter };
  };
  function internalBeat() {
    var per = 60 / TEMPO.bpm, el = nowS() - TEMPO.t0, f = el / per, beat = Math.floor(f), phase = f - beat;
    return { bpm: TEMPO.bpm, meter: TEMPO.meter, beat: beat, phase: phase, bar: Math.floor(beat / TEMPO.meter), beatInBar: ((beat % TEMPO.meter) + TEMPO.meter) % TEMPO.meter, toNext: (1 - phase) * per, src: 'interno', pulse: per };
  }
  function audioBeat() {
    var A = ACH.audio && ACH.audio.br; if (!A || typeof A.beat !== 'function') return null;
    var b = null; try { b = A.beat(); } catch (e) { b = null; }
    if (!b || !(b.bpm > 0) || !isFinite(b.phase)) return null;
    if (b.src === undefined) b.src = 'audio';
    if (b.meter > 0 && (b.bpm !== TEMPO.bpm || b.meter !== TEMPO.meter)) { TEMPO.bpm = b.bpm; TEMPO.meter = b.meter; }
    // el interno queda alineado al de la música: si el audio se corta, el pulso sigue sin saltar
    TEMPO.t0 = nowS() + (b.toNext || 0) - (b.beat + 1) * (60 / b.bpm);
    return b;
  }
  M.beat = function () { return audioBeat() || internalBeat(); };
  M.onTime = function (tol) {
    var t = tol === undefined ? 0.12 : +tol, b = M.beat(), per = b.pulse || 60 / b.bpm;
    var since = b.phase * per, until = b.toNext !== undefined ? b.toNext : (1 - b.phase) * per;
    return Math.min(since, until) <= t;
  };
  TEMPO.t0 = nowS();

  /* ---------------- La hora: atardecer → noche con el recorrido (§2.2) ---------------- */
  // 0 = atardecer dorado (playa) · ~0.3 = crepúsculo morado (Bajada) · 0.45 = se hace de noche (Puente) · 1 = noche cerrada (peña)
  var NIGHT_AT = 0.45;
  var HORA = { h: 0, forced: null };
  function targetHora(G) {
    var W = ACH.world, p = G.player; if (!W || !p || !W.zona) return HORA.h;
    var z = W.zona(p.x, p.y), pr = W.progress ? W.progress(p) : 0;
    switch (z) {
      case 'playa': return 0.08 * Math.max(0, Math.min(1, (p.x - 10 * W.T) / (26 * W.T)));
      case 'bajada': return 0.1 + 0.3 * Math.max(0, Math.min(1, (pr - 0.06) / 0.24));
      case 'puente': return NIGHT_AT;
      case 'ermita': return 0.5;
      case 'parque': return 0.6 + 0.1 * Math.max(0, Math.min(1, (pr - 0.45) / 0.1));
      case 'bohemia': return 0.8 + 0.1 * Math.max(0, Math.min(1, (pr - 0.6) / 0.25));
      case 'pena': return 1;
    }
    return HORA.h;
  }
  /* ---------------- Objetivo que sigue el recorrido (ajustes 2026-11-21) ----------------
     playa → Bajada → puente/Ermita → Parque/Grau → calles bohemias (buscar a Don Celedonio) → peña. Solo avanza; no pisa lo que
     ponen el jefe y el final (cuando Jaranón ya no está en «espera» o el jefe ya cayó, se calla). */
  var OBJ = { stage: -1, t: 0 };
  var OBJ_TXT = [
    'Sube por la Bajada de Baños y busca la jarana',
    'Sube la Bajada de Baños hasta el puente',
    'Cruza el Puente de los Suspiros y sigue al Parque Municipal',
    'Sigue por la Av. Grau hasta las calles bohemias',
    'Busca a Don Celedonio en su zaguán, cerca de la peña',
    'Entra a la Peña La Última Jarana · T = Landó del Contrapunto'
  ];
  var OBJ_STAGE = { playa: 0, bajada: 1, puente: 2, gardel: 2, zepita: 2, ermita: 2, mirador: 2, parque: 3, grau: 3, bohemia: 4, pena: 4 };
  function updateObjetivo(G, dt) {
    OBJ.t -= dt; if (OBJ.t > 0) return; OBJ.t = 0.4;
    var O = ACH.objetivo, W = ACH.world, p = G && G.player;
    if (!O || typeof O.set !== 'function' || !p || G.state !== 'playing') return;
    if (M.flag('jefe')) return;
    var J = M.jaranon; if (J && J.state && J.state !== 'espera') return;
    var z = W && typeof W.tramoAt === 'function' ? W.tramoAt(p.x, p.y) : (W && W.zona ? W.zona(p.x, p.y) : null);
    var s = OBJ_STAGE[z] !== undefined ? OBJ_STAGE[z] : OBJ.stage;
    if (M.flag('celedonio')) s = 5;
    if (s <= OBJ.stage) return;
    OBJ.stage = s;
    try { O.set(OBJ_TXT[s]); } catch (e) { /* nada */ }
  }
  function updateHora(G, dt) {
    var tg = HORA.forced !== null ? HORA.forced : Math.max(HORA.h, targetHora(G));
    if (HORA.forced !== null) HORA.h = tg;
    else if (tg > HORA.h) HORA.h = Math.min(tg, HORA.h + Math.max(0.02, (tg - HORA.h) * 1.5) * dt);
    var N = ACH.noche;
    if (N && HORA.h >= NIGHT_AT && !(N.isNight && N.isNight()) && G.state === 'playing') { safe(N, 'start', G); }
    G.brHora = HORA.h;
    try { var L = ACH.sprites && ACH.sprites.br && ACH.sprites.br.lugar; if (L) L.hora = HORA.h; } catch (e) { /* nada */ }
  }
  M.hora = function () { return HORA.h; };
  M.setHora = function (t, keep) {
    var v = Math.max(0, Math.min(1, +t || 0)), N = ACH.noche;
    HORA.h = v; HORA.forced = keep ? v : null;
    if (N) { if (v >= NIGHT_AT) safe(N, 'force', true); else safe(N, 'force', false); }
    var G = ACH.G; if (G) G.brHora = v;
    return v;
  };
  // tinte del atardecer (antes de la noche del motor): un relleno de color con multiplicar, y el sol detrás de la neblina sobre el mar
  var DUSK = [[0, [255, 214, 160], 0.26], [0.18, [240, 170, 150], 0.3], [0.32, [196, 150, 206], 0.34], [0.45, [150, 140, 210], 0.3]];
  function duskAt(h) {
    for (var i = 0; i + 1 < DUSK.length; i++) {
      var a = DUSK[i], b = DUSK[i + 1];
      if (h <= b[0]) { var k = (h - a[0]) / (b[0] - a[0]); k = k < 0 ? 0 : k > 1 ? 1 : k; return { c: [0, 1, 2].map(function (j) { return Math.round(a[1][j] + (b[1][j] - a[1][j]) * k); }), a: a[2] + (b[2] - a[2]) * k }; }
    }
    var L2 = DUSK[DUSK.length - 1]; return { c: L2[1], a: L2[2] };
  }
  var SUN = null;
  function bakeSun() {
    var c = mkc(200, 200), g = c.getContext('2d');
    var gr = g.createRadialGradient(100, 100, 4, 100, 100, 100);   // horneado UNA vez
    gr.addColorStop(0, 'rgba(255,236,190,0.9)'); gr.addColorStop(0.15, 'rgba(255,196,120,0.55)'); gr.addColorStop(0.5, 'rgba(255,140,80,0.16)'); gr.addColorStop(1, 'rgba(255,120,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 200, 200);
    SUN = c;
  }
  function drawDusk(ctx, G) {
    var N = ACH.noche, nt = N ? (+N.t || 0) : 0, h = HORA.h;
    var k = 1 - nt; if (k <= 0.01) return;
    var V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }, d = duskAt(h);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = d.a * k;
    ctx.fillStyle = 'rgb(' + d.c[0] + ',' + d.c[1] + ',' + d.c[2] + ')';
    ctx.fillRect(0, 0, V.w, V.h);
    // el sol que rompe la panza de burro: solo mirando al mar, al principio
    var W = ACH.world, T = (W && W.T) || 16, sk = Math.max(0, 1 - h / 0.3) * k;
    if (sk > 0.02 && G.cam && G.cam.x < 40 * T) {
      if (!SUN) bakeSun();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 * sk;
      var sx = Math.round(3 * T - G.cam.x - 100), sy = Math.round(V.h * 0.32 - 100 + h * 120);
      ctx.drawImage(SUN, sx, sy);
    }
    ctx.restore();
  }

  /* ---------------- La leyenda del Puente de los Suspiros (§2.5) ---------------- */
  var LEY = { toast: false, on: false, dir: 0, hp: 0, fail: null, failT: 0, tries: 0, wish: null, base: 0, set: 0 };
  function wishApply() {   // vida máxima +10 por el resto del nivel (habilidades.js recalcula hpMax: se vuelve a sumar)
    if (LEY.wish !== 'vida') return;
    var C = CFG(); if (!(C.hpMax > 0)) return;
    if (C.hpMax !== LEY.set) { LEY.base = C.hpMax; LEY.set = C.hpMax + 10; C.hpMax = LEY.set; }
  }
  function wishGrant(G) {
    var p = G.player, defs = ACH.inv && ACH.inv.defs, r = Math.random(), kind, txt;
    if (r < 0.34) kind = 'vida'; else if (r < 0.67 && defs && defs.botellaDorada) kind = 'sabor'; else kind = 'monedas';
    if (kind === 'vida') { LEY.wish = 'vida'; LEY.set = 0; wishApply(); p.hp = Math.min(CFG().hpMax, p.hp + 10); txt = '¡Vida máxima +10 por el resto de Barranco!'; }
    else if (kind === 'sabor') { safe(ACH.hab, 'addSabor', 100); safe(ACH.inv, 'add', 'botellaDorada', 1); txt = '¡Sabor lleno y una botella dorada!'; }
    else { if (ACH.inv && ACH.inv.drop) { try { ACH.inv.drop(p.x, p.y + 6, [{ id: 'sencillo', n: 10 }], true); } catch (e) { safe(ACH.inv, 'add', 'sencillo', 10); } } else safe(ACH.inv, 'add', 'sencillo', 10); txt = '¡Llueven 10 monedas!'; }
    M.flag('deseo', kind); M.stats.deseo = kind;
    M.sfx('br.deseo', { x: p.x, y: p.y });
    if (ACH.fx && ACH.fx.burst) { try { ACH.fx.burst(p.x, p.y - 14, '#ffe08a', 18); } catch (e) { /* nada */ } }
    spark(p.x, p.y);
    M.toast('★ ' + txt);
    M.say('br_deseo', { x: p.x, y: p.y, who: 'alex', always: true }, '¡Deseo concedido!');
    M.talk([{ quien: 'alexander', cara: 'risa', texto: '¡Deseo concedido! Pedí que la cura exista… y que me paguen por cantar.' }]);
  }
  var SPARKS = [];
  function spark(x, y) { for (var i = 0; i < 22; i++) { var a = Math.random() * 6.283, s = 20 + Math.random() * 50; SPARKS.push({ x: x, y: y - 14, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, t: 0, l: 0.6 + Math.random() * 0.6 }); } }
  function updateLeyenda(G, dt) {
    var W = ACH.world, p = G.player, D = W && W.deck; if (!D || !p || !W.onDeck) return;
    var on = W.onDeck(p);
    for (var i = SPARKS.length - 1; i >= 0; i--) { var s = SPARKS[i]; s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 60 * dt; if (s.t > s.l) SPARKS.splice(i, 1); }
    if (LEY.failT > 0) LEY.failT -= dt;
    if (on && !LEY.toast) { LEY.toast = true; M.toast('Cuentan que si cruzas sin respirar, se cumple tu deseo…'); M.sfx('br.puente.crujido', { x: p.x, y: p.y }); }
    if (M.flag('deseo')) { LEY.on = false; return; }
    var edge = 28;
    if (!LEY.on) {
      if (on && p.running && p.moving && !p.exhausted && (p.x < D.x0 + edge || p.x > D.x1 - edge)) { LEY.on = true; LEY.dir = p.x < (D.x0 + D.x1) / 2 ? 1 : -1; LEY.hp = p.hp; LEY.tries++; }
      return;
    }
    var prog = LEY.dir > 0 ? (p.x - D.x0) / (D.x1 - D.x0) : (D.x1 - p.x) / (D.x1 - D.x0);
    if (prog >= 0.97 || (!on && prog > 0.9)) { LEY.on = false; wishGrant(G); return; }
    var why = null;
    if (!on) why = prog > 0.1 ? 'te bajaste del puente' : null;
    else if (p.hp < LEY.hp) why = 'te pegaron';
    else if (p.exhausted) why = 'se te acabó el aliento';
    else if (!p.running) why = 'soltaste correr';
    else if (!p.moving) why = 'te paraste';
    if (why || !on) {
      LEY.on = false;
      if (why && prog > 0.15 && LEY.failT <= 0) { LEY.failT = 3; M.toast('Respiraste… (' + why + '). Otra vez, de punta a punta.'); }
    }
  }
  M.deseo = function () { return { flag: M.flag('deseo') || null, intentando: LEY.on, intentos: LEY.tries, wish: LEY.wish }; };

  /* ---------------- El cartel de victoria (§2.4) ---------------- */
  function wrapWin() {
    var H = ACH.hud; if (!H || !H.showWin || H.showWin._br) return;
    var orig = H.showWin;
    H.showWin = function (G, info) {
      var o = {}; for (var k in (info || {})) o[k] = info[k];
      o.title = ACH.nivel.win.title; o.go = winGoText(); o.rows = null;
      var r = orig.call(this, G, o);
      try { fillWinRows(); } catch (e) { /* nada */ }
      return r;
    };
    H.showWin._br = true;
  }
  function canTravel() { return !!(ACH.viaje && typeof ACH.viaje.go === 'function' && ACH.viaje.PAGES && ACH.viaje.PAGES.main); }
  function winGoText() { return canTravel() ? 'ENTER — VOLVER AL MAPA' : ACH.nivel.win.go; }
  var traveling = false;
  function winTravel() {
    var G = ACH.G; if (traveling || !G || G.state !== 'won') return false;
    if (!canTravel()) { replay(); return true; }
    traveling = true;
    var carry = null; try { carry = ACH.game && ACH.game.carryState ? ACH.game.carryState() : null; } catch (e) { carry = null; }
    if (!carry && G.player) carry = { hp: G.player.hp, fans: G.fans, deaths: G.deaths };
    try { if (ACH.viaje.setDone) ACH.viaje.setDone('barranco'); } catch (e2) { /* nada */ }
    try { if (ACH.partida && ACH.partida.save) ACH.partida.save(G, { force: true, level: 'mapa', page: 'main', fresh: true, carry: carry }); } catch (e5) { /* nada */ }
    M.sfx('ui.ok');
    var ok = false;
    try { M.freeze(true); safe(ACH.input, 'reset'); ok = ACH.viaje.go('main', carry, { mapa: true, from: 'barranco' }) !== false; } catch (e3) { ok = false; }
    if (!ok) { traveling = false; try { M.freeze(false); G.state = 'won'; ACH.hud.setState('won'); } catch (e4) { /* nada */ } return false; }
    return true;
  }
  // sin viaje (página suelta): jugar de nuevo aquí mismo
  function replay() {
    try { if (ACH.game && ACH.game.startIntro) ACH.game.startIntro('barranco'); } catch (e) { console.warn('[ACHORADO br] replay', e); }
  }
  M.winTravel = winTravel;
  function datosN() {
    var V = M.vecinos, d = null;
    if (V && typeof V.datos === 'function') { try { d = V.datos(); } catch (e) { d = null; } }
    return d && typeof d === 'object' ? { n: d.n | 0, total: d.total | 0 } : { n: 0, total: 30 };
  }
  function fillWinRows() {
    var d = datosN(), w = M.flag('deseo');
    var WISH = { vida: 'sí · vida +10', sabor: 'sí · sabor lleno', monedas: 'sí · 10 monedas' };
    [['winDatosRow', 'winDatos', d.n + ' / ' + (d.total || 30)], ['winDeseoRow', 'winDeseo', w ? (WISH[w] || 'sí') : 'no']].forEach(function (q) {
      var row = document.getElementById(q[0]), b = document.getElementById(q[1]);
      if (b) b.textContent = q[2];
      if (row) row.classList.remove('hide');
    });
  }

  /* ---------------- Teclas: filtro en captura (este archivo se carga primero) ---------------- */
  // game.js trata esta página como la principal (no es Miraflores ni Costa Verde): ENTER/clic en el título haría startIntro('gambetta').
  M.keyGate = M.keyGate || [];
  function startHere() {
    try { if (ACH.audio && ACH.audio.unlock) ACH.audio.unlock(); } catch (er) { /* nada */ }
    M.sfx('ui.ok');
    try { ACH.game.startIntro('barranco'); } catch (er2) { console.warn('[ACHORADO br] startIntro', er2); return false; }
    return true;
  }
  M.keyGate.push(function (e) {
    var G = ACH.G; if (!G || G.state !== 'title') return false;
    var c = e.code;
    if (c === 'Digit2' || c === 'Numpad2' || c === 'Digit3' || c === 'Numpad3') return true;
    if ((c === 'Enter' || c === 'NumpadEnter' || c === 'Space') && !e.repeat && ACH.game && ACH.game.startIntro) return startHere();
    return false;
  });
  M.keyGate.push(function (e) {
    var G = ACH.G; if (!G || G.state !== 'won') return false;
    if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') { if (!e.repeat && (G.wonT || 0) >= 0.6) winTravel(); return true; }
    return false;
  });
  window.addEventListener('keydown', function (e) {
    for (var i = 0; i < M.keyGate.length; i++) {
      var r = false; try { r = M.keyGate[i](e); } catch (err) { /* un filtro roto nunca rompe el teclado */ }
      if (r === true) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    }
  }, true);
  // clic / toque: en el título arranca Barranco; en el cartel, ENTER
  function ptr(e) {
    var G = ACH.G; if (!G) return;
    var t = e.target, inUi = t && t.closest && t.closest('button, a, input, select, .pz, #pausa, #muteBtn, #fsBtn');
    if (G.state === 'title' && !inUi && ACH.game && ACH.game.startIntro) { e.preventDefault(); e.stopImmediatePropagation(); startHere(); return; }
    if (G.state === 'won' && (G.wonT || 0) >= 0.6) { e.preventDefault(); e.stopImmediatePropagation(); winTravel(); }
  }
  window.addEventListener('mousedown', ptr, true);
  window.addEventListener('touchstart', function (e) { var G = ACH.G; if (G && (G.state === 'title' || G.state === 'won')) ptr(e); }, { capture: true, passive: false });
  document.addEventListener('click', function (e) {
    var G = ACH.G; if (!G || (G.state !== 'won' && G.state !== 'title')) return;
    var t = e.target; if (t && t.closest && t.closest('#winGo')) { e.preventDefault(); e.stopImmediatePropagation(); if (G.state === 'won') winTravel(); }
  }, true);

  // game.js loadLevel('barranco') (reinicio, CONTINUAR) → el mismo mundo. 'gambetta' NO se define a propósito: así toTitle no rehornea
  // (loadLevel falla callado y reinicia este mundo) y el mapa de la pausa no «viaja» a una Gambetta que aquí no existe.
  ACH.levels = ACH.levels || {};
  if (!ACH.levels.barranco) ACH.levels.barranco = { id: 'barranco', name: 'Barranco', build: function () { return ACH.world; } };
  // CONTINUAR (partida.js guarda page/level 'barranco' + cp): game.resumeAt → loadLevel('barranco') → este gancho pone a Alexander en el punto de control guardado
  var pendingCp = null;
  ACH.levelHooks = ACH.levelHooks || [];
  ACH.levelHooks.push(function (id) {
    if (id !== 'barranco' || !pendingCp) return;
    var name = pendingCp; pendingCp = null;
    try {
      var c = M.setCheckpoint(name), G = ACH.G;
      if (c && G && G.player) { G.player.x = c.x; G.player.y = c.y; G.player.brUp = true; if (ACH.world && ACH.world.fixLayer) ACH.world.fixLayer(G.player); if (G.cam) { G.cam.x = c.x; G.cam.y = c.y; } }
    } catch (e) { console.warn('[ACHORADO br] checkpoint al continuar', e); }
  });

  /* ---------------- Congelar el mundo ---------------- */
  var FZ = { on: false, prev: null };
  M.freeze = function (on) {
    var G = ACH.G; if (!G) return false;
    if (on) {
      if (FZ.on && G.state === 'cine') return true;
      FZ.prev = (G.state === 'playing' || G.state === 'intro' || G.state === 'dead') ? G.state : 'playing';
      if (FZ.prev === 'dead') FZ.prev = 'playing';
      G.state = 'cine'; FZ.on = true;
      safe(ACH.hud, 'setState', 'cine');
      safe(ACH.input, 'reset');
      return true;
    }
    if (!FZ.on) return false;
    FZ.on = false;
    if (G.state === 'cine') { G.state = FZ.prev || 'playing'; G.hitstop = 0; safe(ACH.hud, 'setState', G.state); }
    safe(ACH.input, 'reset');
    FZ.prev = null;
    return true;
  };
  M.frozen = function () { return FZ.on && ACH.G && ACH.G.state === 'cine'; };
  // ajustes 2026-11-21: el «disco negro» sobre el menú CUÉNTAME era el iris de transición de ui-v014.js (v0.14.1), que se dispara
  // cuando body[data-state] pasa de 'cine' a 'playing'. Una charla congela con 'cine' → al cerrarla, iris de pantalla completa.
  // Al descongelar tras una charla se apaga el iris un instante y se deja que ui-v014 registre el cambio (ACH.ui.transCheck) sin animarlo.
  function unfreezeQuiet() {
    var U = ACH.ui, P = U && U.P, old = P ? P.iris : undefined;
    if (P) P.iris = 0;
    try { M.freeze(false); if (U && typeof U.transCheck === 'function') U.transCheck(); } catch (e) { console.warn('[ACHORADO br] unfreezeQuiet', e); }
    if (P) P.iris = old;
  }
  M.talk = function (lines, onDone, opt) {
    var D = ACH.dialogo;
    function done() { unfreezeQuiet(); if (typeof onDone === 'function') { try { onDone(); } catch (e) { console.warn('[ACHORADO br] talk.onDone', e); } } }
    if (!D || typeof D.play !== 'function') { done(); return false; }
    M.freeze(true);
    var ok = false, o = { onDone: done }; if (opt && opt.id) o.id = opt.id;
    try { ok = D.play(lines, o); } catch (e) { ok = false; }
    if (!ok) done();
    return ok;
  };

  /* ---------------- Final del nivel (§2.4) ---------------- */
  var finished = false;
  M.finish = function (stats) {
    var G = ACH.G; if (!G) return false;
    if (stats) for (var k in stats) M.stats[k] = stats[k];
    M.freeze(false);
    if (G.state === 'won') return true;
    if (G.state !== 'playing' && G.state !== 'paused' && G.state !== 'dead') G.state = 'playing';
    if (G.player && G.player.hp <= 0) G.player.hp = 1;
    finished = true;
    M.flag('ganado', true);
    if (ACH.debug && typeof ACH.debug.win === 'function') { try { ACH.debug.win(); } catch (e) { console.warn('[ACHORADO br] finish', e); } }
    if (G.state !== 'won' && ACH.world) ACH.world._forceExit = true;
    return true;
  };
  M.finished = function () { return finished; };
  // runFinale(): la cinemática de B5 y el cartel. jaranon.js (B1b) llama a final.play y luego a finish() él mismo; esto es para debug/respaldo.
  M.runFinale = function () {
    var F = M.final;
    M.freeze(true);
    if (F && typeof F.play === 'function') { try { var r = F.play({ onEnd: function () { M.finish(); } }); if (r !== false) return true; } catch (e) { console.warn('[ACHORADO br] final.play', e); } }
    M.finish();
    return true;
  };

  /* ---------------- Puntos de control, banderas, peña ---------------- */
  M.setCheckpoint = function (name) {
    var W = ACH.world, G = ACH.G; if (!W || !W.checkpoints) return null;
    var cps = W.checkpoints, i;
    for (i = 0; i < cps.length; i++) if (cps[i].id === name) break;
    if (i >= cps.length) return null;
    if (G) G.brCp = i;
    W.start.x = cps[i].x; W.start.y = cps[i].y;
    return cps[i];
  };
  M.flag = function (k, v) {
    var P = ACH.partida; if (!P || typeof P.flag !== 'function') { if (v === undefined) return !!LOCALF[k] && LOCALF[k]; LOCALF[k] = v; return v; }
    try { if (v === undefined) return P.flag('barranco.' + k) || false; return P.flag('barranco.' + k, v); } catch (e) { return false; }
  };
  var LOCALF = {};
  M.checkpoint = function () { var W = ACH.world, G = ACH.G; return W && W.checkpoints && G ? W.checkpoints[G.brCp | 0] : null; };
  M.abrirPena = function (quien) { var g = M.penaGate; if (!g || !g.open) return false; return g.open(false, quien === 'celedonio' ? '¡Don Celedonio te abrió el portón de la peña!' : null); };

  /* ---------------- ACH.nivel ---------------- */
  var NOCHE = { atTime: 1e9, atX: null };
  function applyNoche() {
    var cfg = ACH.noche && ACH.noche.cfg; if (!cfg) return;
    cfg.atTime = NOCHE.atTime; cfg.triggerX = null; if ('triggerY' in cfg) cfg.triggerY = null;
    cfg.kicker = 'BARRANCO · 7:00 P.M.';
  }
  // de noche el motor ya los apura (×2 persiguiendo); además, el aura del músico y las rachas del jaranero (z.brSpd)
  function wrapZMul() {
    var N = ACH.noche; if (!N || typeof N.zMul !== 'function' || N.zMul._br) return;
    var orig = N.zMul;
    N.zMul = function (z) { var m = orig.apply(this, arguments); if (z && typeof z === 'object' && z.brSpd > 0 && ACH.world && ACH.world.id === 'barranco') m *= z.brSpd; return m; };
    N.zMul._br = true;
  }
  ACH.nivel = {
    id: 'barranco',
    intro: [
      { quien: 'alexander', cara: 'sorpresa', texto: '¡Barranco, causa! Aterricé en la playa con todo y paloma.' },
      { quien: 'alexander', cara: 'serio', texto: 'El sol ya se está yendo. De noche los muertos se ponen más bravos.' },
      { quien: 'titina', cara: 'feliz', texto: '¡Gurú-gurú!' },
      { quien: 'alexander', cara: 'picaro', texto: 'Dicen que aquí todos cantan. A ver si me dejan un sitio en la jarana… Subo por la Bajada de Baños.' }],
    camPeek: false,
    noche: NOCHE,
    win: { title: '¡BARRANCO SE QUEDÓ EN PAZ!', go: 'ENTER para jugar de nuevo' },
    update: function (G, dt) {
      updateHora(G, dt); updateLeyenda(G, dt); wishApply(); try { updateObjetivo(G, dt); } catch (eo) { /* nada */ }
      each('update', G, dt);
    },
    reset: function (G) {
      applyNoche(); wrapWin(); wrapZMul(); finished = false; traveling = false; if (FZ.on) { FZ.on = false; FZ.prev = null; }
      var P = ACH.partida, cont = false;
      try { cont = !!(P && P.continuando && P.continuando()); } catch (e) { cont = false; }
      if (!cont) { try { if (P && P.freshLevel) P.freshLevel('barranco'); } catch (e2) { /* nada */ } LOCALF = {}; }
      M.continuando = cont;
      HORA.h = 0; HORA.forced = null; G.brHora = 0;
      LEY.on = false; LEY.toast = false; LEY.tries = 0; LEY.failT = 0; SPARKS.length = 0;
      LEY.wish = M.flag('deseo') === 'vida' ? 'vida' : null; LEY.set = 0;
      M.stats = { deseo: M.flag('deseo') || null };
      if (ACH.world) { ACH.world.vendors = []; }   // §1: nada de vendedores de Miraflores/Costa Verde aquí
      each('reset', G);
      OBJ.stage = M.flag('celedonio') ? 5 : 0; OBJ.t = 0;
      try { if (ACH.objetivo && ACH.objetivo.set) ACH.objetivo.set(OBJ_TXT[OBJ.stage]); } catch (e3) { /* nada */ }
      try { if (ACH.objetivo && ACH.objetivo.diario && !cont) ACH.objetivo.diario('br-llegada', 'BARRANCO', 'Aterricé en la Playa Barranco al atardecer. Hay que subir por la Bajada de Baños, cruzar el puente y llegar a las peñas antes de que la noche se ponga brava.'); } catch (e4) { /* nada */ }
    },
    onRespawn: function (G) { each('onRespawn', G); },
    onWin: function (G) {
      try { if (ACH.viaje && ACH.viaje.setDone) ACH.viaje.setDone('barranco'); } catch (e) { /* nada */ }
      each('onWin', G);
    },
    mood: function (G) {
      var L = M.systems;
      for (var i = 0; i < L.length; i++) if (typeof L[i].mood === 'function') { var r = call(L[i], 'mood', G); if (r && r.m) return r; }
      return null;
    },
    drawables: function (G, out) { each('drawables', G, out); },
    drawTop: function (ctx, G, cx, cy) {
      try { drawDusk(ctx, G); } catch (e) { if (!warned.dusk) { warned.dusk = 1; console.warn('[ACHORADO br] dusk', e); } }
      if (SPARKS.length) { ctx.fillStyle = '#ffe08a'; for (var i = 0; i < SPARKS.length; i++) { var s = SPARKS[i]; ctx.globalAlpha = Math.max(0, 1 - s.t / s.l); ctx.fillRect(Math.round(s.x - cx), Math.round(s.y - cy), 2, 2); } ctx.globalAlpha = 1; }
      each('drawTop', ctx, G, cx, cy);
    },
    onSwing: function (G, sw) {
      var L = M.systems, tot = 0, blocked = false;
      if (sw && sw.bees === undefined) sw.bees = sw.dmg;
      for (var i = 0; i < L.length; i++) if (typeof L[i].onSwing === 'function') {
        var r = +call(L[i], 'onSwing', G, sw) || 0;
        if (r > 0) tot += r; else if (r < 0) blocked = true;
      }
      return tot > 0 ? tot : (blocked ? -1 : 0);
    },
    onProjectile: function (G, pr) {
      var L = M.systems;
      if (pr && pr.bees === undefined) pr.bees = pr.dmg;
      for (var i = 0; i < L.length; i++) if (typeof L[i].onProjectile === 'function' && call(L[i], 'onProjectile', G, pr) === true) return true;
      return false;
    },
    speedMul: function (G) {
      var L = M.systems, k = 1;
      for (var i = 0; i < L.length; i++) if (typeof L[i].speedMul === 'function') { var r = +call(L[i], 'speedMul', G); if (r > 0 && isFinite(r)) k *= r; }
      return k;
    }
  };

  /* ---------------- Llegada desde otra página (§2.3) ---------------- */
  var VKEY = 'achorado.viaje.v1', MAX_AGE = 10 * 60 * 1000;
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) { /* nada */ } }
  function parse(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function fresh(r) { return r && typeof r === 'object' && r.to === 'barranco' && typeof r.t === 'number' && Math.abs(Date.now() - r.t) < MAX_AGE; }
  function takeArrival() {
    var V = ACH.viaje, rec = null;
    try { if (V && typeof V.here === 'function' && V.here() === 'barranco' && typeof V.take === 'function') { var t = V.take(); if (t) return t; } } catch (e) { /* cae al manual */ }
    var h = ''; try { h = window.location.hash || ''; } catch (e2) { h = ''; }
    var m = /[#&]viaje=([^&]*)/.exec(h);
    if (m) { try { rec = parse(decodeURIComponent(m[1])); } catch (e3) { rec = null; } }
    var st = parse(lsGet(VKEY));
    if (!fresh(rec)) rec = fresh(st) ? st : null;
    if (!rec) return null;
    if (m) { try { if (window.history && history.replaceState) history.replaceState(null, '', location.pathname + location.search); } catch (e4) { /* nada */ } }
    if (fresh(st)) lsDel(VKEY);
    return { from: rec.from || null, carry: rec.carry || null, extra: rec.extra || {} };
  }
  var arrival = null;
  // inflables.js (Miraflores) y vecinos.js envuelven ACH.inv.isOpen cada uno con su marca (_mira / _brMenu): si el otro envolvió después,
  // inflables vuelve a envolver y su variable origInvOpen queda apuntando a sí misma → recursión infinita. Aquí la marca pasa a la función nueva.
  function guardIsOpen() {
    var I = ACH.inv; if (!I || I._brGuard) return;
    var d = Object.getOwnPropertyDescriptor(I, 'isOpen'); if (d && !d.configurable) return;
    var cur = I.isOpen;
    try {
      Object.defineProperty(I, 'isOpen', { configurable: true, enumerable: true, get: function () { return cur; },
        set: function (f) { if (cur && f && f !== cur) { ['_mira', '_brMenu'].forEach(function (k) { if (cur[k]) { try { f[k] = true; } catch (e) { /* nada */ } } }); } cur = f; } });
      I._brGuard = true;
    } catch (e) { /* nada */ }
  }
  function onReady() {
    guardIsOpen();
    try { arrival = takeArrival(); } catch (e) { arrival = null; }
    setTimeout(afterInit, 0);   // game.js init() corre en el mismo DOMContentLoaded, después de este
  }
  function afterInit() {
    wrapGame();
    var G = ACH.G, q = (location.search || '');
    if (arrival && ACH.game && ACH.game.arrive) {
      var k = arrival.carry || null;
      if (k && k.hab) safe(ACH.hab, 'restore', k.hab);   // game.js ya no lo ve (el viaje lo tomamos antes)
      if (arrival.extra && arrival.extra.continuar && arrival.extra.cp) pendingCp = arrival.extra.cp;   // CONTINUAR: el punto de control guardado (lo aplica el levelHook de abajo)
      try { ACH.game.arrive(k); } catch (e) { console.warn('[ACHORADO br] arrive', e); }
      return;
    }
    var m = /[?&]br=([a-zA-Z0-9]+)/.exec(q);
    if (m && G) {
      try { if (ACH.audio && ACH.audio.unlock) ACH.audio.unlock(); } catch (e2) { /* nada */ }
      setTimeout(function () {
        var D = ACH.debug && ACH.debug.br; if (!D) return;
        if (m[1] === 'jefe' || m[1] === 'final') D.skip(m[1]);
        else if (m[1] === 'noche') { D.tp('bohemia1'); D.hora(0.9); }
        else D.tp(m[1]);
      }, 80);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady); else setTimeout(onReady, 0);

  /* ---------------- Ajustes a game.js en tiempo de ejecución (esta página no es la principal) ---------------- */
  var wrapped = false;
  function wrapGame() {
    if (wrapped) return; wrapped = true;
    var GM = ACH.game, V = ACH.viaje;
    // salir al título: el título con CONTINUAR vive en index.html (como Miraflores y Costa Verde)
    if (GM && typeof GM.toTitle === 'function') {
      var origTT = GM.toTitle;
      GM.toTitle = function () {
        var G = ACH.G, Vv = ACH.viaje;
        if (Vv && Vv.go && Vv.PAGES && Vv.PAGES.main) {
          try { if (GM.autoSave) GM.autoSave(); } catch (e) { /* nada */ }
          M.freeze(true); M.sfx('ui.back');
          if (Vv.go('main', null, { titulo: true }) !== false) return true;
          M.freeze(false); if (G) { G.state = 'paused'; safe(ACH.hud, 'setState', 'paused'); }
        }
        return origTT.apply(this, arguments);
      };
    }
    // mapa de la pausa: Gambetta y Cerro viven en index.html (game.js aquí los buscaría en esta página)
    var CI = ACH.cima;
    if (CI && typeof CI.showMap === 'function' && !CI.showMap._br) {
      var origSM = CI.showMap;
      CI.showMap = function (opts) {
        if (opts && opts.desdePausa && !opts.here) opts.here = 'barranco';
        if (opts && typeof opts.onChoose === 'function') {
          var oc = opts.onChoose;
          opts.onChoose = function (id) {
            var Vv = ACH.viaje;
            if ((id === 'gambetta' || id === 'cerro') && Vv && Vv.go && Vv.PAGES && Vv.PAGES.main) {
              var k = null; try { k = ACH.game.carryState(); } catch (e) { k = null; }
              return Vv.go('main', k, { nivel: id, from: 'barranco' }) !== false;
            }
            if (id === 'barranco') { M.toast('Ya estás aquí, causa.'); return false; }
            return oc.apply(this, arguments);
          };
        }
        return origSM.apply(this, arguments);
      };
      CI.showMap._br = true;
    }
    // guardado: partida.js todavía no conoce la página de Barranco (su tabla PAGEOF); un registro con level 'barranco' se descartaría
    // al leerlo y borraría la partida. Mientras tanto se guarda como «mapa» (CONTINUAR abre el mapa, desde donde se entra a Barranco).
    var P = ACH.partida;
    if (P && typeof P.save === 'function' && !P.save._br) {
      var origSave = P.save;
      P.save = function (G, o) {
        o = o || {};
        if (M.saveAsMapa !== false && (!o.level || o.level === 'barranco')) { var c = {}; for (var k in o) c[k] = o[k]; c.level = 'mapa'; c.page = 'main'; o = c; }
        return origSave.call(this, G, o);
      };
      P.save._br = true;
    }
    if (V && V.here && V.here() !== 'barranco') console.warn('[ACHORADO br] viaje.here() no conoce barranco');
    noPortraits();
  }
  // Diálogos: retratos.js solo dibuja a Alexander y a Titina (y final.js agrega a Jaranón). Un vecino sin retrato propio sale SOLO con su
  // nombre (sin la cara de Alexander): se oculta el marco por CSS (dialogo.js pone data-quien en .dlgx) y su dibujo no se pide.
  // Si alguien trae el retrato de un vecino: ACH.retratos.CON = { tomas: 1, … } y vuelve a salir.
  var SIN_RETRATO = ['tomas', 'rosa', 'lucia', 'lucho', 'celedonio', 'vecino', 'vendedor', 'bohemio'];
  function noPortraits() {
    var R = ACH.retratos, con = (R && R.CON) || {};
    var list = SIN_RETRATO.filter(function (q) { return !con[q]; });
    if (!list.length) return;
    try {
      var st = document.createElement('style');
      st.textContent = list.map(function (q) { return '.dlgx[data-quien="' + q + '"] .dlgx-frame'; }).join(',') + '{display:none !important}';
      document.head.appendChild(st);
    } catch (e) { /* nada */ }
    if (R && typeof R.draw === 'function' && !R.draw._br) {
      var od = R.draw;
      R.draw = function (g, quien) { if (list.indexOf(quien) >= 0 && !((R.CON || {})[quien])) return; return od.apply(this, arguments); };
      R.draw._br = true;
    }
  }
  M.saveAsMapa = false;   // QA: partida.js ya conoce 'barranco' (PAGEOF); true volvería al guardado «Mapa de Lima» de antes

  /* ---------------- Debug (§2.6) ---------------- */
  var dbg = { god: false };
  M.register({
    name: 'debug',
    update: function (G) { if (dbg.god && G.player) { G.player.hp = CFG().hpMax || 100; G.player.stamina = CFG().staminaMax || 100; } }
  });
  function ensurePlaying() {
    var G = ACH.G; if (!G) return false;
    if (ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active() && (G.state === 'intro' || G.state === 'cine')) { try { ACH.dialogo.close(); } catch (e) { /* nada */ } }
    if (M.frozen()) M.freeze(false);
    if (G.state === 'title' || G.state === 'won' || G.state === 'intro') { if (ACH.debug && ACH.debug.start) ACH.debug.start(); }
    if (G.state === 'paused' || G.state === 'dead' || G.state === 'cine') { var pv = G.state; G.state = 'playing'; safe(ACH.hud, 'setState', 'playing'); safe(ACH.pausa, 'onState', 'playing', pv); }
    return G.state === 'playing';
  }
  ACH.debug = ACH.debug || {};
  var DB = ACH.debug.br = ACH.debug.br || {};
  DB.tp = function (place) {
    var W = ACH.world, P = W && W.places, q = P && P[place];
    if (!q) return { error: 'lugar desconocido', places: P ? Object.keys(P) : [] };
    ensurePlaying();
    if (ACH.debug.teleport) ACH.debug.teleport(q.x, q.y);
    var G = ACH.G; if (G && G.player && W.fixLayer) { G.player.brUp = undefined; W.fixLayer(G.player); if (place === 'puenteMedio') G.player.brUp = true; }
    return { place: place, x: q.x, y: q.y, zona: W.zona ? W.zona(q.x, q.y) : null };
  };
  DB.skip = function (what) {
    var J = DB.jefe, G = ACH.G;
    if (what === 'jefe') {
      DB.tp('penaPuerta'); if (M.penaGate) M.penaGate.open(true);
      M.setCheckpoint('penaPuerta'); M.setHora(1);
      if (J && typeof J.start === 'function') { try { return J.start(); } catch (e) { console.warn(e); } }
      return DB.tp('penaCentro');
    }
    if (what === 'final') {
      ensurePlaying(); DB.tp('penaCentro'); M.setHora(1);
      if (J && typeof J.win === 'function') { try { return J.win(true); } catch (e2) { console.warn(e2); } }
      M.runFinale(); return 'final';
    }
    if (G) return 'skip: jefe | final';
    return null;
  };
  DB.god = function (on) { dbg.god = on === undefined ? !dbg.god : !!on; return dbg.god; };
  DB.give = function (id, n) { n = n === undefined ? 1 : n; if (ACH.debug.give) return ACH.debug.give(id, n); var iv = ACH.inv; return iv && iv.add ? iv.add(id, n) : 'sin inventario'; };
  DB.hora = function (t, keep) { if (t === undefined) return HORA.h; return M.setHora(t, keep); };
  DB.routeCheck = function (R) { return ACH.world && ACH.world.routeCheck ? ACH.world.routeCheck(R) : null; };
  DB.spawnCheck = function () { return ACH.world && ACH.world.spawnCheck ? ACH.world.spawnCheck() : null; };
  DB.finish = function (st) { return M.finish(st); };
  DB.freeze = function (on) { return M.freeze(on); };
  DB.beat = function () { return M.beat(); };
  DB.deseo = function (force) { if (force) { var G = ACH.G; if (G) wishGrant(G); } return M.deseo(); };
  DB.state = function () {
    var G = ACH.G, W = ACH.world, p = G && G.player, types = {};
    (G ? G.zombies : []).forEach(function (z) { if (z.state !== 'muerto') types[z.type] = (types[z.type] || 0) + 1; });
    var cp = M.checkpoint(), N = ACH.noche;
    return {
      state: G && G.state, frozen: M.frozen(), x: p && Math.round(p.x), y: p && Math.round(p.y), hp: p && p.hp, hpMax: CFG().hpMax,
      tile: p && W ? [Math.floor(p.x / W.T), Math.floor(p.y / W.T)] : null, arriba: p ? !!p.brUp : null,
      zona: p && W && W.zona ? W.zona(p.x, p.y) : null, tramo: p && W && W.tramoAt ? W.tramoAt(p.x, p.y) : null,
      hora: +HORA.h.toFixed(3), noche: N ? { t: +(+N.t || 0).toFixed(2), on: !!(N.isNight && N.isNight()) } : null,
      checkpoint: cp ? cp.id : null, porton: M.penaGate ? (M.penaGate.isOpen() ? 'abierto' : 'cerrado') : null,
      deseo: M.deseo(), beat: (function () { var b = M.beat(); return { bpm: b.bpm, meter: b.meter, src: b.src }; })(),
      zombies: types, god: dbg.god, systems: M.systems.map(function (s) { return s.name || s.id || '?'; }), stats: M.stats,
      jefe: !!M.jaranon, final: !!M.final, vecinos: !!M.vecinos, objetos: !!M.objetos
    };
  };
})();
