/* ACHORADO — engine/habilidades.js → ACH.hab (v0.11, contrato HABILIDADES.md): la guitarra despierta.
   XP y niveles desde el inicio del juego (regla del dueño: nada se desbloquea), recurso SABOR (0–100), árbol de 5 melodías × 3 rangos,
   efectos, HUD propio (DOM dentro de #hud), pantalla del árbol (afiche chicha, K), pista de la primera vez y premio de la picaronera
   (diálogos con retrato), persistencia y debug.
   Ganchos (todos protegidos: si este módulo falla o no está, el juego es el de v0.10):
     entities.js  hitZombie al morir → onKill(G, z, src) · guitarrazo que conecta → onHit(G, z) · hurtPlayer → filterHurt(G, dmg, opts, src)
                  moveZombie lee z.habSlowT / z.habSlowMul · updatePlayer lee p.habStrumT (no ataca, camina al 50 %)
     game.js      freeze(G, dt) (árbol abierto / diálogo del despertar: congela) · update(G, dt) · carry() / restore(k)
     hud.js       syncHud(G, hudEl) · tactil.js  castSelected / toggleTree / learned / select
     input.js     addKeyFilter: con el árbol abierto se tragan las teclas (K y ESC lo cierran, ESC no abre la pausa)
   Dibujo en el mundo por ACH.drawHooks.screen (notas, espirales, arco del escudo, ondas, destello y «¡SUBISTE DE NIVEL!»). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  var KEY = 'achorado.habilidades.v1';
  var MAXL = 15, SMAX = 100, GCD = 1.2, STRUM_T = 0.6, MEL_T = 1.6, SAVE_EVERY = 10;
  // Barranco (BARRANCO.md §5.5, B1c): 6.ª melodía «LANDÓ DEL CONTRAPUNTO», bloqueada hasta que la enseña Don Celedonio (S.regalos.contrapunto).
  var IDS = ['alivio', 'mareo', 'escudo', 'lamento', 'rasgueo', 'contrapunto'];
  var DEF = {
    contrapunto: { name: 'LANDÓ DEL CONTRAPUNTO', short: 'LANDÓ', key: 'KeyT', k: 'T', cost: 50, cd: 14, col: '#3ad6ff', t: [6, 8, 10], mul: [1.5, 1.75, 2], tol: [0.12, 0.16, 0.2] },
    alivio: { name: 'HUAYNO DEL ALIVIO', short: 'HUAYNO', key: 'KeyZ', k: 'Z', cost: 40, cd: 10, col: '#1fe07a', heal: [20, 30, 45] },
    mareo: { name: 'CUMBIA DEL MAREO', short: 'CUMBIA', key: 'KeyX', k: 'X', cost: 35, cd: 12, col: '#ff2e88', r: [72, 88, 104], slow: [0.35, 0.5, 0.65], t: [5, 6.5, 8] },
    escudo: { name: 'VALS DEL ESCUDO', short: 'VALS', key: 'KeyV', k: 'V', cost: 45, cd: 16, col: '#ffe500', t: [5, 8, 11], cone: [140, 160, 180], push: 24, stun3: 0.8 },
    lamento: { name: 'LAMENTO CHALACO', short: 'LAMENTO', key: 'KeyB', k: 'B', cost: 60, cd: 18, col: '#b46bff', r: [64, 96, 112], dmg: [1, 1, 2], weak: [0, 0.5, 0.5], weakT: 6 },
    rasgueo: { name: 'EL ÚLTIMO RASGUEO', short: 'RASGUEO', key: 'KeyG', k: 'G', cost: 100, cd: 30, col: '#ff8a2e', r: [60, 85, 110], push: [80, 110, 140], stun: [1, 1.5, 2], dmg: [0, 0, 1] }
  };
  // v0.13 T2 (P · G3): rama pasiva «Cuerpo de combi». Cuesta puntos como las melodías, no gasta SABOR y se aplica mutando ACH.ent.CFG (applyStats).
  var PIDS = ['vida', 'aliento', 'fuerza'], ALL = IDS.concat(PIDS);
  var PDEF = {
    vida: { name: 'LOMO DE COMBI', short: 'VIDA', k: 'HP', col: '#ff5a4a', max: 3, v: [10, 20, 30] },
    aliento: { name: 'PULMÓN DE COBRADOR', short: 'ALIENTO', k: 'AL', col: '#4ad0e0', max: 2, v: [15, 30] },
    fuerza: { name: 'GUITARRAZO CHALACO', short: 'GUITARRAZO', k: '!!', col: '#e0a040', max: 2, v: [1.25, 1.5] }
  };
  function maxRank(id) { return PDEF[id] ? PDEF[id].max : 3; }
  var XP_T = { escolar: 5, caminante: 8, cobrador: 8, ciego: 12, senoraOlla: 15, senoraBalde: 15 };
  var XP_AVE = 3, XP_JEFA = 150;
  // v0.11 (regla del dueño): todo está disponible desde el inicio. La jefa de Miraflores ya no desbloquea: premia (+150 XP, sabor lleno, una vez).
  var JEFA_LINES = [
    { quien: 'alexander', cara: 'sorpresa', texto: '¿Qué fue eso? La guitarra está vibrando sola...' },
    { quien: 'alexander', cara: 'risa', texto: '¡La picaronera me dejó con sabor, causa!' },
    { quien: 'alexander', cara: 'habla', texto: 'Siento que mis canciones pegan más fuerte.' }];
  var PISTA_LINES = [   // la primera vez que se juega con puntos sin gastar y sin partida guardada
    { quien: 'alexander', cara: 'sorpresa', texto: 'Oe... la guitarra suena distinto desde que empezó todo esto.' },
    { quien: 'alexander', cara: 'habla', texto: 'Aprieta K: creo que me salen canciones con poder.' }];

  /* ---------------- Estado ---------------- */
  function fresh() { return { v: 1, despierta: true, xp: 0, nivel: 1, puntos: 1, rangos: { alivio: 0, mareo: 0, escudo: 0, lamento: 0, rasgueo: 0, contrapunto: 0, vida: 0, aliento: 0, fuerza: 0 }, sabor: 40, pista: false, jefaPremio: false, regalos: {} }; }
  var S = fresh(), mem = null;
  var R = { cd: {}, gcd: 0, heal: null, shieldT: 0, shieldRank: 0, pend: [], sel: null, tree: false, awk: null, saveT: 0, avesK: null, pRef: null,
    msgAt: {}, rasReady: false, rasSaidAt: -99, noSave: false, castN: 0, wantTree: false, pausaItem: false, melT: 0, melId: null };
  function warn(k, e) { if (!warn[k]) { warn[k] = 1; console.warn('[ACHORADO] hab.' + k, e); } }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function need(L) { return 40 + 20 * (L - 1); }
  function spent() { var n = 0; for (var i = 0; i < ALL.length; i++) n += S.rangos[ALL[i]] | 0; return n; }
  function nReg(s) { var n = 0, r = (s || S).regalos; if (r) for (var k in r) if (r[k]) n++; return n; }   // cada regalo de un sobreviviente = 1 punto extra
  function points() { return S.despierta ? Math.max(0, S.nivel + nReg() - spent()) : 0; }
  function totalXP(s) { var n = s.xp || 0; for (var L = 1; L < (s.nivel || 1); L++) n += need(L); return n; }
  function sanitize(o) {
    var s = fresh(); if (!o || typeof o !== 'object') return s;
    // despierta queda por compatibilidad, siempre true (las partidas viejas con false se migran conservando xp y rangos)
    s.despierta = true; s.nivel = clamp(o.nivel | 0 || 1, 1, MAXL); s.xp = Math.max(0, +o.xp || 0); s.sabor = clamp(o.sabor == null ? 40 : +o.sabor || 0, 0, SMAX);
    s.pista = !!o.pista; s.jefaPremio = !!o.jefaPremio;
    if (o.regalos && typeof o.regalos === 'object') ALL.forEach(function (id) { if (o.regalos[id]) s.regalos[id] = 1; });
    var rg = o.rangos || {}, tot = 0, cap = s.nivel + nReg(s);
    ALL.forEach(function (id) { s.rangos[id] = clamp(rg[id] | 0, 0, maxRank(id)); tot += s.rangos[id]; });
    if (tot > cap) ALL.forEach(function (id) { s.rangos[id] = 0; });   // corrupto: se devuelven los puntos
    s.puntos = cap - (tot > cap ? 0 : tot);
    return s;
  }
  function load() {
    var raw = null;
    try { raw = window.localStorage.getItem(KEY); } catch (e) { raw = null; }
    if (raw) { try { S = sanitize(JSON.parse(raw)); R.hadSave = true; return; } catch (e) { /* corrupto */ } }
    S = mem ? sanitize(mem) : fresh();
  }
  function snap() { S.puntos = points(); return JSON.parse(JSON.stringify(S)); }
  function save() {
    if (R.noSave) return;
    var o = snap(); mem = o;
    try { window.localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* sin almacenamiento: queda en memoria */ }
  }
  load();

  /* ---------------- Utilidades del juego ---------------- */
  function G0() { return ACH.G; }
  function sfx(n, d) { try { var a = ACH.audio; if (a && a.emit) a.emit(n, d); } catch (e) { /* el sonido nunca rompe */ } }
  function toast(s) { try { if (ACH.hud && ACH.hud.toast) ACH.hud.toast(s); } catch (e) { /* nada */ } }
  function hpMax() { return (ACH.ent && ACH.ent.CFG && ACH.ent.CFG.hpMax) || 100; }
  function guitarOk(p) {
    if (!p || !p.guitar || !(p.guitar.dur > 0)) return false;
    try { if (ACH.ent && ACH.ent.carrying && ACH.ent.carrying(p)) return false; } catch (e) { /* nada */ }
    return true;
  }
  function dlgOn() { try { return !!(ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active()); } catch (e) { return false; } }
  function invOn() { try { return !!(ACH.inv && ACH.inv.isOpen && ACH.inv.isOpen()); } catch (e) { return false; } }
  function zAlive(z) { return z && z.state !== 'muerto' && !z.social; }
  function dirv(p) { var D = ACH.ent && ACH.ent.DIRV; return (D && D[p.dir]) || [1, 0]; }
  function kbV0(d) { var k = (ACH.ent && ACH.ent.CFG.knockDecay) || 18; return d * (1 - Math.exp(-k / 60)) * 60; }
  function pushZ(z, nx, ny, d, stun) {
    var v0 = kbV0(d); z.kbx = nx * v0; z.kby = ny * v0;
    if (z.state !== 'muerto') { z.state = 'golpeado'; z.stunT = Math.max(z.stunT || 0, stun); z.lungeT = 0; }
  }
  function rank(id) { return S.rangos[id] | 0; }
  function reqOk(id) {
    if (id === 'escudo') return rank('alivio') >= 1;
    if (id === 'lamento') return rank('mareo') >= 1;
    if (id === 'rasgueo') return rank('escudo') >= 1 || rank('lamento') >= 1;
    if (id === 'contrapunto') return !!(S.regalos && S.regalos.contrapunto) || rank('contrapunto') > 0;   // Barranco: solo la enseña Don Celedonio
    return true;
  }
  var REQ_TXT = { escudo: 'PIDE HUAYNO 1', lamento: 'PIDE CUMBIA 1', rasgueo: 'PIDE VALS O LAMENTO 1', contrapunto: 'TE LA ENSEÑA DON CELEDONIO (BARRANCO)' };
  /* Barranco (B1c): reloj del compás para el Landó del Contrapunto. En Barranco manda ACH.br.beat(); en las otras páginas, un reloj propio
     de 100 bpm sobre G.clock (se congela con el juego). offBeat = segundos al pulso más cercano. */
  var METRO_BPM = 100;
  function beatNow() {
    try { var B = ACH.br; if (B && typeof B.beat === 'function') { var b = B.beat(); if (b && b.bpm > 0 && isFinite(b.phase)) return b; } } catch (e) { /* reloj propio */ }
    var G = G0(), per = 60 / METRO_BPM, x = ((G && G.clock) || 0) / per, ph = x - Math.floor(x);
    return { bpm: METRO_BPM, meter: 4, beat: x, phase: ph, bar: Math.floor(x / 4), beatInBar: Math.floor(x) % 4, toNext: (1 - ph) * per, src: 'interno' };
  }
  function offBeat(b) { b = b || beatNow(); var per = 60 / b.bpm, tn = typeof b.toNext === 'number' ? b.toNext : (1 - b.phase) * per; return Math.min(b.phase * per, tn); }
  function onBeat(tol) { return offBeat() <= (tol > 0 ? tol : 0.12); }
  function metroOn() { return R.metroT > 0; }
  function metroInfo() {
    var d = DEF.contrapunto, rk = clamp(R.metroRank || rank('contrapunto') || 1, 1, 3);
    return { on: metroOn(), left: +Math.max(0, R.metroT || 0).toFixed(2), rank: metroOn() ? rk : rank('contrapunto'), tol: d.tol[rk - 1], mul: d.mul[rk - 1], hits: R.metroHits || 0, beat: beatNow() };
  }
  var castFns = [];
  function fireCast(id, rk) { for (var i = 0; i < castFns.length; i++) { try { castFns[i](id, rk); } catch (e) { warn('onCast', e); } } }
  // golpe de guitarra que conecta con el metrónomo prendido: a tiempo = daño ×mul, «¡A TIEMPO!» y +4 sabor (una vez por golpe)
  function metroHit(G, z) {
    if (!metroOn() || !G || !z) return false;
    var d = DEF.contrapunto, rk = clamp(R.metroRank, 1, 3);
    if (!onBeat(d.tol[rk - 1])) return false;
    var first = R.metroSwing !== G.clock; R.metroSwing = G.clock;
    if (z.state !== 'muerto' && !z.social) {
      var C = ACH.ent && ACH.ent.CFG, extra = ((C && C.atkDmg) || 1) * (d.mul[rk - 1] - 1), p = G.player, dx = z.x - p.x, dy = z.y - p.y, dl = Math.sqrt(dx * dx + dy * dy) || 1;
      try { ACH.ent.hitZombie(G, z, dx / dl, dy / dl, { dmg: extra, knock: 6, src: 'contrapunto' }); } catch (e) { warn('metroHit', e); }
    }
    if (first) { R.metroHits = (R.metroHits || 0) + 1; addSabor(4); wtext(z.x, z.y - 30, '¡A TIEMPO!', d.col); sfx('hab.contrapunto.atiempo', { x: z.x, y: z.y }); }
    return true;
  }
  function learned() { return IDS.filter(function (id) { return rank(id) > 0; }); }
  function rasLow(p) { return p && p.hp > 0 && p.hp < hpMax() * 0.25; }
  function rasAvail(p) { return S.despierta && rank('rasgueo') > 0 && rasLow(p) && S.sabor >= SMAX && !(R.cd.rasgueo > 0); }

  /* ---------------- Efectos visuales (px de mundo; se dibujan en drawHooks.screen) ---------------- */
  var parts = [], rings = [], bigs = [], flash = null;
  var NOTE = ['..##.', '..#.#', '..#..', '..#..', '###..', '###..'];
  var NOTE2 = ['.####', '.#..#', '.#..#', '##.##', '##.##'];
  function addNote(x, y, col, vx, vy, life, spin) {
    parts.push({ x: x, y: y, vx: vx || 0, vy: vy || -18, t: 0, life: life || 1, col: col, k: Math.random() < 0.3 ? 2 : 1, spin: spin || 0, a0: Math.random() * 6.28 });
    if (parts.length > 90) parts.shift();
  }
  function noteBurst(x, y, col, n, sp) {
    for (var i = 0; i < n; i++) { var a = Math.random() * Math.PI * 2, s = (sp || 30) * (0.5 + Math.random() * 0.7); addNote(x, y, col, Math.cos(a) * s, Math.sin(a) * s * 0.7 - 10, 0.8 + Math.random() * 0.5); }
  }
  function ring(x, y, r1, col, dur, w, r0) { rings.push({ x: x, y: y, r0: r0 || 4, r1: r1, col: col, t: 0, dur: dur || 0.6, w: w || 2 }); if (rings.length > 16) rings.shift(); }
  function bigText(s, col, dur) { bigs.push({ s: s, col: col || '#ff2e88', t: 0, dur: dur || 1.8 }); if (bigs.length > 2) bigs.shift(); }
  function wtext(x, y, s, c) { try { if (ACH.fx && ACH.fx.text) ACH.fx.text(x, y, s, c); } catch (e) { /* nada */ } }
  function stepFx(dt) {
    var i;
    for (i = parts.length - 1; i >= 0; i--) { var q = parts[i]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= Math.exp(-1.5 * dt); if (q.t >= q.life) parts.splice(i, 1); }
    for (i = rings.length - 1; i >= 0; i--) { rings[i].t += dt; if (rings[i].t >= rings[i].dur) rings.splice(i, 1); }
    for (i = bigs.length - 1; i >= 0; i--) { bigs[i].t += dt; if (bigs[i].t >= bigs[i].dur) bigs.splice(i, 1); }
    if (flash) { flash.t += dt; if (flash.t >= flash.dur) flash = null; }
  }
  function pix(ctx, rows, x, y, col) {
    ctx.fillStyle = '#131015';
    for (var r = 0; r < rows.length; r++) for (var c = 0; c < rows[r].length; c++) if (rows[r][c] === '#') ctx.fillRect(x + c + 1, y + r + 1, 1, 1);
    ctx.fillStyle = col;
    for (r = 0; r < rows.length; r++) for (c = 0; c < rows[r].length; c++) if (rows[r][c] === '#') ctx.fillRect(x + c, y + r, 1, 1);
  }
  function drawHook(ctx, G, cx, cy) {
    if (!G || !G.player) return;
    var p = G.player, i, t = G.clock || 0, V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
    // ondas (lamento morado, rasgueo, despertar)
    for (i = 0; i < rings.length; i++) {
      var g = rings[i], u = g.t / g.dur, rr = g.r0 + (g.r1 - g.r0) * (1 - (1 - u) * (1 - u));
      ctx.globalAlpha = Math.max(0, 1 - u); ctx.strokeStyle = g.col; ctx.lineWidth = g.w;
      ctx.beginPath(); ctx.ellipse(Math.round(g.x - cx), Math.round(g.y - cy), rr, rr * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
      if (g.w > 1) { ctx.globalAlpha *= 0.5; ctx.beginPath(); ctx.ellipse(Math.round(g.x - cx), Math.round(g.y - cy), rr * 0.8, rr * 0.5, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    // zombies mareados (espiral) y debilitados (gota morada)
    for (i = 0; i < G.zombies.length; i++) {
      var z = G.zombies[i]; if (z.state === 'muerto') continue;
      var zx = Math.round(z.x - cx), zy = Math.round(z.y - cy) - 24;
      if (zx < -10 || zy < -10 || zx > V.w + 10 || zy > V.h + 30) continue;
      if (z.habSlowT > 0) {
        for (var pass = 0; pass < 2; pass++) for (var k = 0; k < 18; k++) {   // espiral que gira sobre la cabeza (≈9×6 px, línea de 1 px con sombra)
          var a = -t * 4 + k * 0.6 + (z.animT || 0), rs = 0.3 + k * 0.25, sx = zx + Math.round(Math.cos(a) * rs), sy = zy - 2 + Math.round(Math.sin(a) * rs * 0.68);
          if (pass === 0) { ctx.fillStyle = '#131015'; ctx.fillRect(sx, sy + 1, 1, 1); }
          else { ctx.fillStyle = k < 4 ? '#ffffff' : k < 11 ? '#ff2e88' : '#ffe500'; ctx.fillRect(sx, sy, 1, 1); }
        }
      }
      if (z.habWeakT > 0) { ctx.fillStyle = '#b46bff'; ctx.fillRect(zx - 1, zy - 5, 3, 2); ctx.fillRect(zx, zy - 3, 1, 2); }
    }
    var px = Math.round(p.x - cx), py = Math.round(p.y - cy), v = dirv(p);
    if (R.heal && p.hp > 0) {   // huayno: brillo verde suave sobre Alexander mientras cura
      var gl = 0.42 + 0.14 * Math.sin(t * 9), gr = ctx.createRadialGradient(px, py - 11, 1, px, py - 11, 17);
      gr.addColorStop(0, 'rgba(125,255,176,' + gl + ')'); gr.addColorStop(0.55, 'rgba(31,224,122,' + (gl * 0.45) + ')'); gr.addColorStop(1, 'rgba(31,224,122,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(px, py - 11, 17, 19, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    // arco dorado de pentagrama delante de Alexander
    if (R.shieldT > 0 && p.hp > 0) {
      var cone = DEF.escudo.cone[clamp(R.shieldRank, 1, 3) - 1] * Math.PI / 180, f = Math.atan2(v[1], v[0]), blink = R.shieldT < 1.5 && Math.floor(t * 8) % 2;
      ctx.globalAlpha = blink ? 0.35 : 0.85; ctx.lineWidth = 1;
      for (var l = 0; l < 5; l++) {
        ctx.strokeStyle = l === 2 ? '#fff6b0' : '#ffe500';
        ctx.beginPath(); ctx.ellipse(px, py - 8, 15 + l * 2, (15 + l * 2) * 0.75, 0, f - cone / 2, f + cone / 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      var na = f + Math.sin(t * 3) * cone * 0.4; pix(ctx, NOTE, px + Math.round(Math.cos(na) * 19) - 2, py - 8 + Math.round(Math.sin(na) * 14) - 3, '#ffe500');
    }
    // Barranco: metrónomo del Landó del Contrapunto (anillo celeste que late en cada pulso; parpadea al final)
    if (R.metroT > 0 && p.hp > 0) {
      var mb = beatNow(), mph = mb.phase, mk2 = 1 - mph, mblink = R.metroT < 1.5 && Math.floor(t * 8) % 2;
      var mr = 16 + 7 * mk2 * mk2 * mk2, mon = offBeat(mb) <= DEF.contrapunto.tol[clamp(R.metroRank, 1, 3) - 1];
      ctx.globalAlpha = mblink ? 0.3 : 0.35 + 0.55 * mk2; ctx.lineWidth = mon ? 2 : 1; ctx.strokeStyle = mon ? '#ffffff' : DEF.contrapunto.col;
      ctx.beginPath(); ctx.ellipse(px, py - 4, mr, mr * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1; ctx.strokeStyle = DEF.contrapunto.col; ctx.globalAlpha = mblink ? 0.25 : 0.6;
      ctx.beginPath(); ctx.ellipse(px, py - 4, 15, 9.3, 0, 0, Math.PI * 2); ctx.stroke();
      var ma = -Math.PI / 2 + mph * Math.PI * 2;   // aguja que da la vuelta en cada pulso
      ctx.globalAlpha = 1; ctx.fillStyle = '#131015'; ctx.fillRect(px + Math.round(Math.cos(ma) * 15) - 1, py - 4 + Math.round(Math.sin(ma) * 9.3) - 1, 3, 3);
      ctx.fillStyle = mon ? '#ffffff' : DEF.contrapunto.col; ctx.fillRect(px + Math.round(Math.cos(ma) * 15), py - 4 + Math.round(Math.sin(ma) * 9.3), 2, 2);
      ctx.globalAlpha = 1;
    }
    // pose de rasgueo: cuerdas que vibran sobre la guitarra
    if (p.habStrumT > 0) {
      var gx = px + (v[0] < 0 ? -3 : 3), gy = py - 10, col = (DEF[R.melId] || DEF.alivio).col;
      for (var s = 0; s < 3; s++) { ctx.fillStyle = s === 1 ? '#ffffff' : col; for (var xx = -4; xx <= 4; xx++) ctx.fillRect(gx + xx, gy + s * 2 + Math.round(Math.sin(t * 40 + xx + s) * 0.8), 1, 1); }
    }
    // notas
    for (i = 0; i < parts.length; i++) {
      var q = parts[i], al = q.t / q.life;
      ctx.globalAlpha = al > 0.6 ? Math.max(0, 1 - (al - 0.6) / 0.4) : 1;
      pix(ctx, q.k === 2 ? NOTE2 : NOTE, Math.round(q.x - cx) - 2, Math.round(q.y - cy) - 3, q.col);
    }
    ctx.globalAlpha = 1;
    if (flash) { ctx.globalAlpha = 0.55 * (1 - flash.t / flash.dur); ctx.fillStyle = flash.col; ctx.fillRect(0, 0, V.w, V.h); ctx.globalAlpha = 1; }
    // «¡SUBISTE DE NIVEL!» en chicha
    for (i = 0; i < bigs.length; i++) {
      var b = bigs[i], bu = b.t / b.dur, sc = bu < 0.08 ? 1.5 - bu / 0.08 * 0.5 : 1;
      ctx.save();
      ctx.globalAlpha = bu > 0.75 ? Math.max(0, 1 - (bu - 0.75) / 0.25) : 1;
      ctx.translate(Math.round(V.w / 2), Math.round(V.h * 0.3 - bu * 8)); ctx.rotate(-0.04); ctx.scale(sc, sc);
      ctx.font = '18px Bungee, "Arial Black", Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1fe07a'; ctx.fillText(b.s, 4, 4);
      ctx.fillStyle = '#ffe500'; ctx.fillText(b.s, 2, 2);
      ctx.fillStyle = b.col; ctx.fillText(b.s, 0, 0);
      ctx.restore();
    }
  }
  try { var DH = ACH.drawHooks = ACH.drawHooks || { ground: [], ysort: [], air: [], screen: [] }; if (!Array.isArray(DH.screen)) DH.screen = []; DH.screen.push(drawHook); } catch (e) { warn('drawHooks', e); }

  /* ---------------- XP, niveles y sabor ---------------- */
  function addXP(n, silent) {
    if (!S.despierta || !(n > 0)) return 0;
    var ups = 0;
    S.xp += n;
    while (S.nivel < MAXL && S.xp >= need(S.nivel)) { S.xp -= need(S.nivel); S.nivel++; ups++; }
    if (S.nivel >= MAXL) S.xp = 0;
    if (ups) {
      S.puntos = points();
      if (!silent) {
        bigText('¡SUBISTE DE NIVEL!', '#ff2e88', 1.9);
        sfx('hab.nivel');
        toast('+' + ups + ' punto' + (ups > 1 ? 's' : '') + ' · K para el árbol');
        var G = G0(); if (G && G.player) noteBurst(G.player.x, G.player.y - 14, '#ffe500', 8, 40);
      }
      save(); renderTree();
    }
    return ups;
  }
  // v0.13 T2 (P): la API pública para los jefes y encargos. motivo: texto del toast («+150 XP · motivo»); true = callado; false/omitido = como antes.
  function addXPPub(n, motivo) {
    n = +n; if (!(n > 0) || !isFinite(n)) return 0;
    if (motivo === true) { var u0 = addXP(n, true); save(); return u0; }
    var ups = addXP(n);
    if (typeof motivo === 'string' && motivo) toast('+' + Math.round(n) + ' XP · ' + motivo);
    if (!ups) save();
    return ups;
  }
  // v0.13 T2: regalo de un sobreviviente (decisión del dueño): 1 rango gratis de esa melodía, o 1 punto si ya estaba al máximo. Una vez por id.
  function regalar(id, quien) {
    if (!DEF[id] && !PDEF[id]) return 'no';
    if (S.regalos[id]) return 'ya';
    S.regalos[id] = 1;
    var nm = (DEF[id] || PDEF[id]).name, r;
    if (rank(id) < maxRank(id)) {
      S.rangos[id]++; r = 'rango';
      if (DEF[id] && S.rangos[id] === 1 && !R.sel) R.sel = id;
      toast((quien ? quien + ' te enseñó ' : '¡Aprendiste ') + nm + (S.rangos[id] > 1 ? ' · rango ' + S.rangos[id] : '') + (DEF[id] ? ' · tecla ' + DEF[id].k : ''));
    } else { r = 'punto'; toast('+1 punto de regalo · K para el árbol'); }
    S.puntos = points(); sfx('hab.nivel'); save(); renderTree(); applyStats();
    return r;
  }
  function addSabor(n) { if (S.despierta) S.sabor = clamp(S.sabor + n, 0, SMAX); }

  /* ---------------- v0.13 T2 (P): stats de la rama pasiva + taller del cuarto (ACH.taller, en base.js) ---------------- */
  // Base = CFG tal como lo dejó entities.js al cargar. Vida/aliento: +v; guitarrazo: ×v y +0,25 (cuerdas de acero); correa: cd ×0,85;
  // guitarra reforzada: +30 de durabilidad máxima (ACH.armas.K.guitarMax, que armas.js escala con ACH.cfg.durMul).
  var BASE = null;
  function tallerHas(id) { try { var T = ACH.taller; return !!(T && typeof T.has === 'function' && T.has(id)); } catch (e) { return false; } }
  function applyStats() {
    var C = ACH.ent && ACH.ent.CFG; if (!C) return null;
    if (!BASE) BASE = { hpMax: C.hpMax, staminaMax: C.staminaMax, atkDmg: C.atkDmg, atkCD: C.atkCD };
    var rv = rank('vida'), ra = rank('aliento'), rf = rank('fuerza');
    var hp = BASE.hpMax + (rv ? PDEF.vida.v[rv - 1] : 0), st = BASE.staminaMax + (ra ? PDEF.aliento.v[ra - 1] : 0);
    var dmg = Math.round((BASE.atkDmg * (rf ? PDEF.fuerza.v[rf - 1] : 1) + (tallerHas('acero') ? 0.25 : 0)) * 100) / 100;
    var cd = Math.round(BASE.atkCD * (tallerHas('correa') ? 0.85 : 1) * 1000) / 1000;
    var G = G0(), p = G && G.player;
    if (p) {   // subir da la diferencia ya; bajar (devolver puntos) recorta
      if (hp !== C.hpMax && p.hp > 0) p.hp = Math.min(hp, hp > C.hpMax ? p.hp + (hp - C.hpMax) : p.hp);
      if (st !== C.staminaMax && typeof p.stamina === 'number') p.stamina = Math.min(st, st > C.staminaMax ? p.stamina + (st - C.staminaMax) : p.stamina);
    }
    C.hpMax = hp; C.staminaMax = st; C.atkDmg = dmg; C.atkCD = cd;
    var A = ACH.armas, K = A && A.K;
    if (K && typeof A.guitarMax === 'function') {
      if (BASE.gK === undefined) BASE.gK = K.guitarMax;
      var dm = ACH.cfg && +ACH.cfg.durMul > 0 ? +ACH.cfg.durMul : 1, before = A.guitarMax();
      K.guitarMax = BASE.gK + (tallerHas('guitarra') ? 30 / dm : 0);
      var after = A.guitarMax();
      if (p && p.guitar && after !== before && Math.round(p.guitar.max) === before) {
        if (p.guitar.dur > 0) p.guitar.dur = Math.max(1, Math.min(after, p.guitar.dur + after - before));
        p.guitar.max = after;
      }
    }
    return stats();
  }
  function stats() {
    var C = ACH.ent && ACH.ent.CFG || {}, A = ACH.armas;
    return { hpMax: C.hpMax, staminaMax: C.staminaMax, atkDmg: C.atkDmg, atkCD: C.atkCD, guitarMax: A && A.guitarMax ? A.guitarMax() : null,
      pasivas: { vida: rank('vida'), aliento: rank('aliento'), fuerza: rank('fuerza') }, base: BASE ? JSON.parse(JSON.stringify(BASE)) : null };
  }
  function onKill(G, z, src) {
    if (!S.despierta || !z) return;
    var xp = XP_T[z.type];
    if (z.punch3 || z.shield) xp = Math.max(xp || 0, 15);
    addXP(xp || 8);
    addSabor(src === 'guitar' || src === 'lamento' || src === 'rasgueo' ? 10 : 3);
  }
  function onHit(G, z) { if (S.despierta) addSabor(4); try { metroHit(G, z); } catch (e) { warn('metro', e); } }

  /* ---------------- Melodías ---------------- */
  function say(msg) { var G = G0(), now = G ? G.clock : 0, last = R.msgAt[msg]; if (last !== undefined && now - last < 1 && now >= last) return; R.msgAt[msg] = now; toast(msg); }   // throttle por texto
  function canCast(id, force) {
    var G = G0(), p = G && G.player, d = DEF[id];
    if (!d) return 'no existe';
    if (!S.despierta) return 'dormida';
    if (!G || G.state !== 'playing' || R.tree || R.awk || dlgOn() || invOn()) return 'estado';
    if (!(rank(id) > 0)) return 'no aprendida';
    if (!p || p.hp <= 0) return 'muerto';
    if (!guitarOk(p)) return 'sin guitarra';
    if (force) return '';
    if (p.habStrumT > 0 || R.gcd > 0) return 'gcd';
    if (R.cd[id] > 0) return 'cd';
    if (id === 'rasgueo') { if (!rasLow(p)) return 'vida'; if (S.sabor < SMAX) return 'sabor'; }
    else if (S.sabor < d.cost) return 'sabor';
    return '';
  }
  var WHY = { 'sin guitarra': '¡Sin guitarra no hay sabor, causa!', sabor: 'Falta sabor, causa: pega con la guitarra', vida: 'El último rasgueo es para cuando estás casi muerto',
    'no aprendida': 'Esa todavía no me la sé (K)' };
  function cast(id, force) {
    var why = canCast(id, force), G = G0(), p = G && G.player, d = DEF[id];
    if (why) {
      if (WHY[why]) say(why === 'sabor' && id === 'rasgueo' ? 'El último rasgueo pide el sabor lleno' : WHY[why]);
      else if (why === 'cd' && G) say(d.short + ': espera ' + Math.ceil(R.cd[id]) + ' s');
      if (why !== 'estado' && why !== 'dormida' && why !== 'gcd') sfx('ui.back');
      return why;
    }
    var rk = clamp(rank(id), 1, 3);
    if (!force) { S.sabor = id === 'rasgueo' ? 0 : clamp(S.sabor - d.cost, 0, SMAX); R.cd[id] = d.cd; }
    R.gcd = GCD; R.melId = id; R.melT = MEL_T; R.castN++;
    p.habStrumT = STRUM_T; p.atkCD = Math.max(p.atkCD || 0, STRUM_T); p.atkBuf = 0;
    sfx('hab.' + id, { x: p.x, y: p.y });
    if (id === 'alivio') R.heal = { left: d.heal[rk - 1], rate: d.heal[rk - 1] / MEL_T };
    R.pend.push({ id: id, rk: rk, t: id === 'alivio' ? 0 : id === 'rasgueo' ? 0.82 : STRUM_T });
    R.sel = id;
    fireCast(id, rk);   // Barranco: ACH.hab.onCast(fn) (el jefe lo usa para el contrapunto)
    return '';
  }
  function zombiesIn(G, x, y, r) {
    var out = [];
    for (var i = 0; i < G.zombies.length; i++) { var z = G.zombies[i]; if (!zAlive(z)) continue; var dx = z.x - x, dy = z.y - y; if (dx * dx + dy * dy <= r * r) out.push(z); }
    return out;
  }
  function apply(G, e) {
    var p = G.player, d = DEF[e.id], rk = e.rk, i, zs;
    if (e.id === 'alivio') { noteBurst(p.x, p.y - 10, '#7dffb0', 8, 24); ring(p.x, p.y - 4, 22, '#7dffb0', 0.6, 1); return; }
    if (e.id === 'mareo') {
      zs = zombiesIn(G, p.x, p.y, d.r[rk - 1]);
      for (i = 0; i < zs.length; i++) { zs[i].habSlowT = d.t[rk - 1]; zs[i].habSlowMul = 1 - d.slow[rk - 1]; addNote(zs[i].x, zs[i].y - 20, d.col, 0, -12, 0.8); }
      ring(p.x, p.y - 2, d.r[rk - 1], d.col, 0.7, 1);
      R.lastN = zs.length;
      return;
    }
    if (e.id === 'contrapunto') {   // metrónomo celeste alrededor de Alexander durante t s
      R.metroT = d.t[rk - 1]; R.metroRank = rk; R.metroHits = 0;
      noteBurst(p.x, p.y - 10, d.col, 6, 25); ring(p.x, p.y - 4, 30, d.col, 0.6, 2);
      return;
    }
    if (e.id === 'escudo') {
      R.shieldT = d.t[rk - 1]; R.shieldRank = rk;
      noteBurst(p.x, p.y - 10, d.col, 6, 25);
      return;
    }
    if (e.id === 'lamento') {
      zs = zombiesIn(G, p.x, p.y, d.r[rk - 1]);
      for (i = 0; i < zs.length; i++) {
        var z = zs[i], dx = z.x - p.x, dy = z.y - p.y, dl = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d.weak[rk - 1] > 0) z.habWeakT = d.weakT;
        try { ACH.ent.hitZombie(G, z, dx / dl, dy / dl, { dmg: d.dmg[rk - 1], knock: 12, src: 'lamento' }); } catch (eH) { warn('lamento', eH); }
        addNote(z.x, z.y - 18, d.col, 0, -14, 0.9);
      }
      ring(p.x, p.y - 2, d.r[rk - 1], d.col, 0.6, 2); ring(p.x, p.y - 2, d.r[rk - 1] * 0.7, d.col, 0.8, 1);
      R.lastN = zs.length;
      return;
    }
    if (e.id === 'rasgueo') {
      var r = d.r[rk - 1], push = d.push[rk - 1], stun = d.stun[rk - 1];
      zs = zombiesIn(G, p.x, p.y, r);
      for (i = 0; i < zs.length; i++) {
        var w = zs[i], wx = w.x - p.x, wy = w.y - p.y, wl = Math.sqrt(wx * wx + wy * wy);
        var nx = wl > 0.5 ? wx / wl : dirv(p)[0], ny = wl > 0.5 ? wy / wl : dirv(p)[1];
        if (d.dmg[rk - 1] > 0) { try { ACH.ent.hitZombie(G, w, nx, ny, { dmg: d.dmg[rk - 1], knock: push, src: 'rasgueo' }); } catch (eR) { warn('rasgueo', eR); } }
        if (w.state !== 'muerto') pushZ(w, nx, ny, push, stun);
      }
      ring(p.x, p.y - 2, r, '#ffe500', 0.5, 3); ring(p.x, p.y - 2, r * 1.15, '#ff2e88', 0.7, 2); ring(p.x, p.y - 2, r * 0.6, '#ffffff', 0.35, 1);
      noteBurst(p.x, p.y - 10, d.col, 14, 70); noteBurst(p.x, p.y - 10, '#ffe500', 8, 55);
      flash = { t: 0, dur: 0.3, col: '#fff6b0' };
      try { if (ACH.fx && ACH.fx.shake) ACH.fx.shake(G, 6, 0.5); } catch (eS) { /* nada */ }
      R.lastN = zs.length;
    }
  }

  // El escudo y el debilitamiento, en hurtPlayer. src: el zombie que pegaba (lo pasa entities.js) si se sabe.
  function filterHurt(G, dmg, opts, src) {
    if (!S.despierta || !G || !G.player) return dmg;
    var p = G.player, o = null;
    // v0.13 (F6): el zombie que pega manda; si no hay, opts.from (abejas, picarón, aceite, fuego, muletazo); si no, el empuje
    if (src && typeof src.x === 'number') o = src;
    else if (opts && opts.from && typeof opts.from.x === 'number') o = opts.from;
    else if (opts && opts.push && (opts.push.x || opts.push.y)) { var pl = Math.sqrt(opts.push.x * opts.push.x + opts.push.y * opts.push.y) || 1; o = { x: p.x - opts.push.x / pl * 10, y: p.y - opts.push.y / pl * 10 }; }
    if (src && src.habWeakT > 0) dmg *= 0.5;
    if (R.shieldT > 0 && o) {
      var dx = o.x - p.x, dy = o.y - p.y, dl = Math.sqrt(dx * dx + dy * dy);
      if (dl > 0.5) {
        var v = dirv(p), cos = (dx * v[0] + dy * v[1]) / dl, half = DEF.escudo.cone[clamp(R.shieldRank, 1, 3) - 1] / 2 * Math.PI / 180;
        if (cos >= Math.cos(half) - 1e-6) {
          R.blocked = (R.blocked || 0) + 1;
          wtext(p.x + dx / dl * 10, p.y - 18, '¡CLANG!', '#ffe500');
          noteBurst(p.x + dx / dl * 12, p.y - 8 + dy / dl * 8, '#ffe500', 3, 25);
          sfx('hab.clang', { x: p.x, y: p.y });
          var z = src && src.state ? src : null;
          if (!z) { var best = 9; for (var i = 0; i < G.zombies.length; i++) { var q = G.zombies[i]; if (!zAlive(q)) continue; var qd = Math.abs(q.x - o.x) + Math.abs(q.y - o.y); if (qd < best) { best = qd; z = q; } } }
          if (z && zAlive(z)) pushZ(z, dx / dl, dy / dl, DEF.escudo.push, R.shieldRank >= 3 ? DEF.escudo.stun3 : 0.25);
          return 0;
        }
      }
    }
    return dmg;
  }

  /* ---------------- Árbol: gastar y devolver puntos ---------------- */
  function spend(id) {
    if ((!DEF[id] && !PDEF[id]) || !S.despierta) return 'no';
    if (points() <= 0) { sfx('ui.back'); flashTree('NO TIENES PUNTOS, CAUSA'); return 'sin puntos'; }
    if (rank(id) >= maxRank(id)) { sfx('ui.back'); flashTree('YA ESTÁ AL MÁXIMO'); return 'max'; }
    if (!reqOk(id)) { sfx('ui.back'); flashTree(REQ_TXT[id]); return 'bloqueada'; }
    S.rangos[id]++; S.puntos = points();
    if (PDEF[id]) { flashTree(PDEF[id].name + (S.rangos[id] > 1 ? ' RANGO ' + S.rangos[id] : '') + ': ' + effTxt(id, S.rangos[id]).toUpperCase()); applyStats(); }
    else if (S.rangos[id] === 1) { flashTree('¡APRENDISTE ' + DEF[id].name + '! TECLA ' + DEF[id].k); if (!R.sel) R.sel = id; }
    else flashTree(DEF[id].short + ' RANGO ' + S.rangos[id]);
    sfx('ui.ok'); save(); renderTree();
    return '';
  }
  function refund() { ALL.forEach(function (id) { S.rangos[id] = 0; }); S.puntos = points(); R.sel = null; applyStats(); save(); renderTree(); sfx('ui.back'); flashTree('PUNTOS DEVUELTOS'); }

  /* ---------------- El despertar ---------------- */
  function jefaDead() { try { var M = ACH.mira, J = M && M.jefa; return !!(J && J.dead); } catch (e) { return false; } }
  // premio de la picaronera (una vez por partida guardada): +150 XP y el sabor lleno
  function finishAwake(silent) {
    if (S.jefaPremio) return;
    S.jefaPremio = true; S.sabor = SMAX;
    var ups = addXP(XP_JEFA, silent);
    S.puntos = points(); save();
    if (!silent && !ups) { toast('+' + XP_JEFA + ' XP · ¡sabor lleno!'); sfx('hab.nivel'); }
    if (!silent) { try { if (ACH.game && typeof ACH.game.autoSave === 'function') ACH.game.autoSave(); } catch (eA) { /* nada */ } }   // v0.13 fix: el premio de Chancaca queda guardado (CONTINUAR no lo pierde)
  }
  // sin escena: el premio entra callado, con un toast (nunca un diálogo sobre la victoria u otra pantalla)
  function finishQuiet() { if (S.jefaPremio) return; finishAwake(true); toast('+' + XP_JEFA + ' XP · ¡sabor lleno!'); }
  function awkFree(G) { return G && G.state === 'playing' && !dlgOn() && !invOn() && !R.tree && !bossBusy(); }
  // v0.12 (integración): ningún diálogo de la guitarra con un jefe en pelea (picaronera del Kennedy, chef de Larcomar, la caída en tabla)
  var JEFA_ON = { tutorial: 1, yendo: 1, pelea: 1, muriendo: 1 }, CHEF_ON = { entrada: 1, pelea: 1, muriendo: 1 };
  function bossBusy() {
    try {
      var C = ACH.cv, J = ACH.mira && ACH.mira.jefa, K = C && C.chef;
      if (C && C.caida && typeof C.caida.isOn === 'function' && C.caida.isOn()) return true;
      if (K && CHEF_ON[K.state]) return true;
      if (J && JEFA_ON[J.state]) return true;
      if (C && typeof C.frozen === 'function' && C.frozen()) return true;
    } catch (e) { /* nada */ }
    return false;
  }
  // game.js → setState: si el juego sale de 'playing' (victoria, muerte, cine, mapa, cuarto) con la escena abierta, se cierra y se premia callado
  function onState(s) {
    R.calmT = 0;   // v0.12: cada cambio de estado (intro → playing, pausa, cine…) vuelve a esperar
    var A = R.awk;
    if (!A && s === 'won' && !S.jefaPremio && jefaDead()) { R.awkWait = 0; finishQuiet(); return; }   // ganó antes de la escena
    if (!A || s === 'playing' || s === 'paused') return;
    if (A.stage === 'dlg' && dlgOn()) { try { ACH.dialogo.close(true); } catch (e) { warn('dlgClose', e); } }
    R.awk = null;
    try { ACH.input.reset(); } catch (e) { /* nada */ }
    if (A.kind !== 'pista') finishQuiet();
  }
  function startAwake(G) {
    var p = G.player;
    R.awk = { stage: 'flash', t: 0.9, kind: 'jefa' };
    flash = { t: 0, dur: 0.5, col: '#ffffff' };
    for (var i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2; addNote(p.x + Math.cos(a) * 14, p.y - 10 + Math.sin(a) * 9, i % 3 === 0 ? '#ffe500' : i % 3 === 1 ? '#ff2e88' : '#1fe07a', -Math.sin(a) * 25, Math.cos(a) * 18 - 6, 1.4); }
    ring(p.x, p.y - 8, 40, '#ffe500', 0.8, 2);
    sfx('hab.despertar', { x: p.x, y: p.y });
  }
  function stepAwake(G, dt) {
    var A = R.awk; if (!A) return false;
    stepFx(dt);
    if (A.stage === 'flash') {
      A.t -= dt;
      if (A.t <= 0) {
        if (G.state !== 'playing') { R.awk = null; finishQuiet(); return false; }
        if (dlgOn() || invOn()) { A.t = 0; return true; }   // otro diálogo encima: espera
        A.stage = 'dlg';
        var ok = false;
        try { if (ACH.dialogo && ACH.dialogo.play) ok = ACH.dialogo.play(A.lines || JEFA_LINES, { onDone: function () { var k = A.kind; R.awk = null; if (k !== 'pista') finishAwake(false); try { ACH.input.reset(); } catch (e) { /* nada */ } } }); } catch (e) { warn('dialogo', e); ok = false; }
        if (!ok) { R.awk = null; if (A.kind !== 'pista') finishAwake(false); }
      }
      return true;
    }
    if (A.stage === 'dlg') { if (!dlgOn()) { R.awk = null; if (A.kind !== 'pista') finishAwake(false); return false; } return true; }
    return false;
  }

  /* ---------------- Paso de juego ---------------- */
  // Desde game.js, antes de simular: true = congelar este paso (árbol abierto o secuencia del despertar).
  function freeze(G, dt) {
    if (R.awk) return stepAwake(G, dt);
    if (R.tree) {
      var I = ACH.input;
      if (I && (I.pressed('KeyK') || I.pressed('Escape'))) closeTree();
      return R.tree || (I && I.pressed('Escape'));   // la misma ESC que cerró no pausa
    }
    return false;
  }
  function update(G, dt) {
    var p = G.player, I = ACH.input, i;
    if (!p) return;
    if (R.pRef !== p || R.deaths !== G.deaths) {   // partida nueva o murió: sin curas, escudos ni efectos pendientes
      if (R.pRef) { R.heal = null; R.shieldT = 0; R.metroT = 0; R.pend.length = 0; R.melT = 0; p.habStrumT = 0; }
      R.pRef = p; R.deaths = G.deaths;
    }
    if (p.habStrumT > 0) p.habStrumT = Math.max(0, p.habStrumT - dt);
    for (i = 0; i < G.zombies.length; i++) { var z = G.zombies[i]; if (z.habSlowT > 0) z.habSlowT -= dt; if (z.habWeakT > 0) z.habWeakT -= dt; }
    stepFx(dt);
    R.calmT = awkFree(G) ? (R.calmT || 0) + dt : 0;   // v0.12: segundos seguidos jugando sin diálogo, mochila, árbol ni jefe
    // premio: la picaronera cayó (una vez por partida guardada)
    if (!S.jefaPremio && !R.awk) {
      if (jefaDead()) { R.awkWait = (R.awkWait || 0) + dt; if (R.awkWait >= 1.2 && awkFree(G) && R.calmT >= 1.2) { R.awkWait = 0; startAwake(G); return; } }   // con otro diálogo o pantalla encima, espera
      else R.awkWait = 0;
    }
    // pista de la primera vez: sin partida guardada y con puntos sin gastar, apenas termina la intro del nivel
    if (!S.pista && !R.hadSave && !R.awk && points() > 0 && awkFree(G)) {
      R.pistaT = (R.pistaT || 0) + dt;
      if (R.pistaT >= 0.8 && R.calmT >= 2.5) {   // v0.12: con la llegada ya cerrada y 2.5 s de calma
        S.pista = true; save();
        var okP = false;
        try { if (ACH.dialogo && ACH.dialogo.play) { R.awk = { stage: 'dlg', kind: 'pista' }; okP = ACH.dialogo.play(PISTA_LINES, { onDone: function () { R.awk = null; try { ACH.input.reset(); } catch (e) { /* nada */ } } }); } } catch (e) { warn('pista', e); }
        if (!okP) { R.awk = null; toast('K: árbol de melodías'); }
        else return;
      }
    }
    // tiempos
    if (R.gcd > 0) R.gcd -= dt;
    for (var id in R.cd) if (R.cd[id] > 0) R.cd[id] = Math.max(0, R.cd[id] - dt);
    if (R.shieldT > 0) R.shieldT = Math.max(0, R.shieldT - dt);
    if (R.metroT > 0) R.metroT = Math.max(0, R.metroT - dt);
    if (R.melT > 0) {
      R.melT -= dt;
      R.noteT = (R.noteT || 0) - dt;
      if (R.noteT <= 0) { R.noteT = R.melId === 'alivio' ? 0.09 : 0.13; var c = R.melId === 'alivio' ? (Math.random() < 0.5 ? '#7dffb0' : '#c8ffe0') : (DEF[R.melId] || DEF.alivio).col; addNote(p.x + (Math.random() * 12 - 6), p.y - 14, c, Math.random() * 16 - 8, -20 - Math.random() * 10, 1.1); }
    }
    if (R.heal && p.hp > 0) {
      var h = Math.min(R.heal.left, R.heal.rate * dt);
      p.hp = Math.min(hpMax(), p.hp + h); R.heal.left -= h; R.healed = (R.healed || 0) + h;
      if (R.heal.left <= 1e-6) R.heal = null;
    }
    for (i = R.pend.length - 1; i >= 0; i--) { R.pend[i].t -= dt; if (R.pend[i].t <= 0) { var e = R.pend.splice(i, 1)[0]; if (p.hp > 0) apply(G, e); } }
    S.sabor = clamp(S.sabor + 0.8 * dt, 0, SMAX);
    // gallinazos muertos
    var AV = ACH.aves, k = AV && AV.stats ? AV.stats.killed | 0 : null;
    if (k !== null) { if (R.avesK === null || k < R.avesK) R.avesK = k; else if (k > R.avesK) { addXP((k - R.avesK) * XP_AVE); R.avesK = k; } }
    // el último rasgueo disponible: late el ícono y Alexander lo dice
    var ra = rasAvail(p);
    if (ra && !R.rasReady && G.clock - R.rasSaidAt > 8) { R.rasSaidAt = G.clock; wtext(p.x, p.y - 30, '¡Ahora sí, mi última canción!', '#ffe500'); }
    R.rasReady = ra;
    // teclas
    if (I && !dlgOn()) {
      if (I.pressed('KeyK') || R.wantTree) { R.wantTree = false; openTree(); return; }
      for (i = 0; i < IDS.length; i++) if (I.pressed(DEF[IDS[i]].key)) { cast(IDS[i]); break; }
    }
    R.saveT += dt;
    if (R.saveT >= SAVE_EVERY) { R.saveT = 0; save(); }
  }

  /* ---------------- HUD (DOM dentro de #hud) ---------------- */
  var H = null, last = {};
  function mk(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
  function noteIcon(cv, col) {
    var g = cv.getContext('2d'); cv.width = 7; cv.height = 7; g.clearRect(0, 0, 7, 7); g.fillStyle = col;
    ['...XX..', '...X.X.', '...X...', '...X...', '.XXX...', 'XXXX...', '.XX....'].forEach(function (r, y) { for (var x = 0; x < 7; x++) if (r[x] === 'X') g.fillRect(x, y, 1, 1); });
  }
  function buildHud(hud) {
    if (H || !hud) return H;
    var rows = hud.querySelectorAll('.barrow'), hpRow = rows[0], st = document.getElementById('st'), stRow = st && st.closest ? st.closest('.barrow') : rows[1];
    var xp = mk('div', 'habxp hide', '<b class="habnv">NV 1</b><div class="habxpbar"><i></i></div><em class="habpts">+1</em>');
    if (hpRow && hpRow.parentNode === hud) hud.insertBefore(xp, hpRow.nextSibling); else hud.appendChild(xp);
    var sb = mk('div', 'barrow habsabrow hide', '<canvas width="7" height="7"></canvas><div class="bar habsab"><i></i></div>');
    if (stRow && stRow.parentNode === hud) hud.insertBefore(sb, stRow.nextSibling); else hud.appendChild(sb);
    noteIcon(sb.querySelector('canvas'), '#ffe500');
    var mr = mk('div', 'habmels hide');
    var inv = hud.querySelector('.invrow');
    if (inv && inv.parentNode === hud) hud.insertBefore(mr, inv); else hud.appendChild(mr);
    H = { xp: xp, nv: xp.querySelector('.habnv'), xpi: xp.querySelector('i'), pts: xp.querySelector('.habpts'), sb: sb, sbBar: sb.querySelector('.habsab'), sbi: sb.querySelector('i'), mr: mr, ic: {} };
    IDS.forEach(function (id) {
      var d = mk('div', 'habic hide', '<span>' + DEF[id].k + '</span>'); d.style.setProperty('--c', DEF[id].col); d.title = DEF[id].name + ' (' + DEF[id].k + ')';
      d.setAttribute('data-id', id);
      mr.appendChild(d); H.ic[id] = d;
    });
    return H;
  }
  function tog(e, on) { if (e) e.classList.toggle('hide', !on); }
  function syncHud(G, hud) {
    if (!S.despierta) { if (H && last.on !== false) { tog(H.xp, false); tog(H.sb, false); tog(H.mr, false); last.on = false; } return; }
    if (!buildHud(hud || document.getElementById('hud'))) return;
    if (last.on !== true) { tog(H.xp, true); tog(H.sb, true); last.on = true; }
    var nv = 'NV ' + S.nivel; if (last.nv !== nv) { H.nv.textContent = nv; last.nv = nv; }
    var xpP = S.nivel >= MAXL ? 100 : Math.round(S.xp / need(S.nivel) * 100); if (last.xp !== xpP) { H.xpi.style.width = xpP + '%'; last.xp = xpP; }
    var pt = points(); if (last.pt !== pt) { H.pts.textContent = '+' + pt; tog(H.pts, pt > 0); H.xp.classList.toggle('pts', pt > 0); last.pt = pt; }
    var sp = Math.round(S.sabor); if (last.sab !== sp) { H.sbi.style.width = sp + '%'; H.sbBar.classList.toggle('full', sp >= SMAX); last.sab = sp; }
    var p = G && G.player, any = false, gOk = guitarOk(p);
    for (var i = 0; i < IDS.length; i++) {
      var id = IDS[i], e = H.ic[id], on = rank(id) > 0; if (on) any = true;
      if (e._on !== on) { tog(e, on); e._on = on; }
      if (!on) continue;
      var cdf = R.cd[id] > 0 ? R.cd[id] / DEF[id].cd : 0, cdq = Math.round(cdf * 24);
      if (e._cd !== cdq) { e.style.setProperty('--cd', (cdq / 24 * 360).toFixed(0) + 'deg'); e.classList.toggle('cd', cdq > 0); e._cd = cdq; }
      var low = !gOk || (id === 'rasgueo' ? S.sabor < SMAX || !rasLow(p) : S.sabor < DEF[id].cost);
      if (e._low !== low) { e.classList.toggle('low', low); e._low = low; }
      var rdy = id === 'rasgueo' && rasAvail(p);
      if (e._rdy !== rdy) { e.classList.toggle('ready', rdy); e._rdy = rdy; }
      var sel = R.sel === id; if (e._sel !== sel) { e.classList.toggle('sel', sel); e._sel = sel; }
    }
    if (last.mr !== any) { tog(H.mr, any); last.mr = any; }
  }

  /* ---------------- Pantalla del árbol (afiche chicha) ---------------- */
  var T = null, flashTO = 0;
  var LAYOUT = { raiz: [2, 1], contrapunto: [1, 1], alivio: [1, 2], mareo: [3, 2], escudo: [1, 3], rasgueo: [2, 3], lamento: [3, 3], vida: [4, 1], aliento: [4, 2], fuerza: [4, 3] };
  var LINKS = [['raiz', 'contrapunto'], ['raiz', 'alivio'], ['raiz', 'mareo'], ['alivio', 'escudo'], ['mareo', 'lamento'], ['escudo', 'rasgueo'], ['lamento', 'rasgueo'], ['vida', 'aliento'], ['aliento', 'fuerza']];
  function effTxt(id, r) {
    var d = DEF[id] || PDEF[id], i = clamp(r, 1, maxRank(id)) - 1;
    switch (id) {
      case 'vida': return 'Vida máxima +' + d.v[i];
      case 'aliento': return 'Aliento máximo +' + d.v[i];
      case 'fuerza': return 'Guitarrazo ×' + String(d.v[i]).replace('.', ',');
      case 'alivio': return 'Cura ' + d.heal[i] + ' de vida en 1,6 s';
      case 'mareo': return 'Lentos −' + Math.round(d.slow[i] * 100) + ' % · radio ' + d.r[i] + ' · ' + String(d.t[i]).replace('.', ',') + ' s';
      case 'escudo': return 'Bloquea el frente ' + d.cone[i] + '° · ' + d.t[i] + ' s' + (i === 2 ? ' · aturde' : '');
      case 'lamento': return '−' + d.dmg[i] + ' de vida · radio ' + d.r[i] + (d.weak[i] ? ' · pegan 50 % menos' : '');
      case 'contrapunto': return 'Metrónomo ' + d.t[i] + ' s · a tiempo ×' + String(d.mul[i]).replace('.', ',') + ' · ventana ' + String(d.tol[i]).replace('.', ',') + ' s';
      case 'rasgueo': return 'Empuja ' + d.push[i] + ' px · radio ' + d.r[i] + ' · aturde ' + String(d.stun[i]).replace('.', ',') + ' s' + (d.dmg[i] ? ' · −1 vida' : '');
    }
    return '';
  }
  function buildTree() {
    if (T) return T;
    var stage = document.getElementById('stage') || document.body;
    var root = mk('div', 'screen dim habtree');
    root.id = 'habTree'; root.setAttribute('data-ui', '');
    var nodes = '';
    nodes += '<div class="habnode root" data-n="raiz" style="grid-column:2;grid-row:1"><i class="disc">♪</i><b>GUITARRA DESPIERTA</b><small>la raíz: gratis</small></div>';
    IDS.forEach(function (id) {
      var L = LAYOUT[id];
      nodes += '<button type="button" class="habnode" data-n="' + id + '" style="grid-column:' + L[0] + ';grid-row:' + L[1] + ';--c:' + DEF[id].col + '">' +
        '<i class="disc">' + DEF[id].k + '</i><b>' + DEF[id].name + '</b><span class="dots"><u></u><u></u><u></u></span><small class="eff"></small><small class="cost"></small></button>';
    });
    PIDS.forEach(function (id) {   // v0.13 T2: rama pasiva «Cuerpo de combi» (4.ª columna)
      var L = LAYOUT[id], dots = ''; for (var k = 0; k < PDEF[id].max; k++) dots += '<u></u>';
      nodes += '<button type="button" class="habnode pas" data-n="' + id + '" style="grid-column:' + L[0] + ';grid-row:' + L[1] + ';--c:' + PDEF[id].col + '">' +
        (L[1] === 1 ? '<em class="habpashead">CUERPO DE COMBI</em>' : '') +
        '<i class="disc">' + PDEF[id].k + '</i><b>' + PDEF[id].name + '</b><span class="dots">' + dots + '</span><small class="eff"></small><small class="cost">PASIVA · SIEMPRE ACTIVA</small></button>';
    });
    root.innerHTML = '<div class="habposter"><div class="habhead"><p class="kicker">ÁRBOL DE MELODÍAS</p><h2 class="habnvbig">NV 1</h2>' +
      '<div class="habxpbig"><div class="bar"><i></i></div><span class="xpt">0 / 60 XP</span></div><p class="habptsbig">0 PUNTOS</p></div>' +
      '<div class="habgrid"><svg class="habstr" preserveAspectRatio="none"></svg>' + nodes + '</div>' +
      '<div class="habfoot"><button type="button" class="habrefund">DEVOLVER PUNTOS</button><span class="habmsg"></span><button type="button" class="habback"><span class="habkb">K / ESC — </span>VOLVER</button></div></div>';
    stage.appendChild(root);
    var q = function (s) { return root.querySelector(s); };
    T = { root: root, nv: q('.habnvbig'), xpi: q('.habxpbig i'), xpt: q('.xpt'), pts: q('.habptsbig'), grid: q('.habgrid'), svg: q('.habstr'), msg: q('.habmsg'), nodes: {} };
    ALL.forEach(function (id) { T.nodes[id] = root.querySelector('[data-n="' + id + '"]'); });
    T.nodes.raiz = root.querySelector('[data-n="raiz"]');
    root.addEventListener('click', function (e) {
      var t = e.target, b = t && t.closest ? t.closest('button') : null; if (!b) return;
      e.preventDefault(); e.stopPropagation();
      if (b.classList.contains('habrefund')) refund();
      else if (b.classList.contains('habback')) closeTree();
      else { var n = b.getAttribute('data-n'); if (DEF[n] || PDEF[n]) spend(n); }
      try { b.blur(); } catch (x) { /* nada */ }
    });
    root.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    window.addEventListener('resize', function () { if (R.tree) setTimeout(drawStrings, 30); });
    return T;
  }
  function drawStrings() {
    if (!T || !R.tree) return;
    var gr = T.grid.getBoundingClientRect(); if (!gr.width) return;
    T.svg.setAttribute('viewBox', '0 0 ' + gr.width.toFixed(1) + ' ' + gr.height.toFixed(1));
    var html = '';
    LINKS.forEach(function (l) {
      var a = T.nodes[l[0]].querySelector('.disc').getBoundingClientRect(), b = T.nodes[l[1]].querySelector('.disc').getBoundingClientRect();
      var x1 = a.left + a.width / 2 - gr.left, y1 = a.top + a.height / 2 - gr.top, x2 = b.left + b.width / 2 - gr.left, y2 = b.top + b.height / 2 - gr.top;
      var on = l[1] === 'rasgueo' ? rank(l[0]) > 0 : (l[0] === 'raiz' || rank(l[0]) > 0) && rank(l[1]) > 0;
      var dx = x2 - x1, dy = y2 - y1, dl = Math.sqrt(dx * dx + dy * dy) || 1, ox = -dy / dl * 2, oy = dx / dl * 2;
      for (var s = -1; s <= 1; s++) html += '<line x1="' + (x1 + ox * s).toFixed(1) + '" y1="' + (y1 + oy * s).toFixed(1) + '" x2="' + (x2 + ox * s).toFixed(1) + '" y2="' + (y2 + oy * s).toFixed(1) + '" class="' + (on ? 'on' : '') + (s === 0 ? ' mid' : '') + '"/>';
    });
    T.svg.innerHTML = html;
  }
  function renderTree() {
    if (!T || !R.tree) return;
    T.nv.textContent = 'NIVEL ' + S.nivel;
    var nd = need(S.nivel);
    T.xpi.style.width = (S.nivel >= MAXL ? 100 : Math.round(S.xp / nd * 100)) + '%';
    T.xpt.textContent = S.nivel >= MAXL ? 'NIVEL MÁXIMO' : Math.floor(S.xp) + ' / ' + nd + ' XP';
    var pt = points(); T.pts.textContent = pt + (pt === 1 ? ' PUNTO' : ' PUNTOS') + ' PARA GASTAR'; T.pts.classList.toggle('has', pt > 0);
    IDS.forEach(function (id) {
      var n = T.nodes[id], r = rank(id), ok = reqOk(id), d = DEF[id];
      n.classList.toggle('locked', !ok && r === 0); n.classList.toggle('learned', r > 0); n.classList.toggle('max', r >= 3); n.classList.toggle('can', ok && r < 3 && pt > 0);
      var dots = n.querySelectorAll('.dots u'); for (var i = 0; i < 3; i++) dots[i].classList.toggle('on', i < r);
      n.querySelector('.eff').textContent = !ok && r === 0 ? REQ_TXT[id] : r >= 3 ? 'AL MÁXIMO: ' + effTxt(id, 3) : (r ? 'Próximo: ' : '') + effTxt(id, r + 1);
      n.querySelector('.cost').textContent = (id === 'rasgueo' ? 'SABOR 100 · vida < 25 %' : 'SABOR ' + d.cost) + ' · ' + d.cd + ' s';
    });
    PIDS.forEach(function (id) {
      var n = T.nodes[id], r = rank(id), mx = maxRank(id);
      n.classList.toggle('learned', r > 0); n.classList.toggle('max', r >= mx); n.classList.toggle('can', r < mx && pt > 0);
      var dots = n.querySelectorAll('.dots u'); for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('on', i < r);
      n.querySelector('.eff').textContent = r >= mx ? 'AL MÁXIMO: ' + effTxt(id, mx) : (r ? 'Próximo: ' : '') + effTxt(id, r + 1);
    });
    drawStrings();
  }
  function flashTree(s) {
    if (!T) return;
    T.msg.textContent = s; T.msg.classList.remove('go'); void T.msg.offsetWidth; T.msg.classList.add('go');
    clearTimeout(flashTO); flashTO = setTimeout(function () { if (T) T.msg.textContent = ''; }, 2200);
  }
  function openTree() {
    var G = G0();
    if (!S.despierta || !G || G.state !== 'playing' || R.awk || dlgOn() || invOn()) return false;
    buildTree(); R.tree = true;
    T.root.classList.add('on'); document.body.classList.add('hab-on');
    try { ACH.input.reset(); } catch (e) { /* nada */ }
    sfx('inv.open'); renderTree();
    return true;
  }
  function closeTree() {
    if (!R.tree) return false;
    R.tree = false;
    if (T) T.root.classList.remove('on');
    document.body.classList.remove('hab-on');
    try { ACH.input.reset(); } catch (e) { /* nada */ }
    sfx('inv.close'); save();
    return true;
  }
  // con el árbol abierto: K / ESC lo cierran (ESC no llega a la pausa) y el resto de teclas se tragan (salvo M, el silencio)
  try {
    if (ACH.input && ACH.input.addKeyFilter) ACH.input.addKeyFilter(function (e) {
      if (!R.tree) return false;
      var c = e.code || e.key;
      if (c === 'KeyM' || c === 'F3' || e.ctrlKey || e.metaKey) return false;
      if ((c === 'KeyK' || c === 'Escape') && !e.repeat) closeTree();
      return true;
    });
  } catch (e) { warn('keyFilter', e); }
  // si el árbol queda abierto y el juego cambia de estado (muerte, pausa por foco), se cierra
  setInterval(function () { var G = G0(); if (R.tree && G && G.state !== 'playing') closeTree(); }, 250);

  function addPausaItem() {
    if (R.pausaItem || !S.despierta) return;
    var P = ACH.pausa; if (!P || typeof P.addItem !== 'function') return;
    R.pausaItem = true;
    try {
      if (!R.ctlAdded && typeof P.addControl === 'function') { R.ctlAdded = true; P.addControl('K', 'árbol de melodías'); P.addControl('Z X V B G T', 'tocar melodías'); }
      P.addItem({ id: 'arbol', label: 'ÁRBOL DE MELODÍAS (K)', order: 55, note: 'Ahorita no se puede, causa.',
        enabled: function () { var g = G0(); return S.despierta && !!g && (!g.resumeTo || g.resumeTo === 'playing'); }, onClick: function () {
        try { if (P.close) P.close(); } catch (e) { /* nada */ }
        R.wantTree = true;
      } });
    } catch (e) { warn('pausa.addItem', e); }
  }

  /* ---------------- Persistencia entre páginas ---------------- */
  function carry() { return snap(); }
  function restore(k) {
    if (!k || typeof k !== 'object') return false;
    var s = sanitize(k);
    if (!s.despierta) return false;
    if (totalXP(S) > totalXP(s)) { var nr = false; for (var rq in s.regalos) if (s.regalos[rq] && !S.regalos[rq]) { S.regalos[rq] = 1; nr = true; } if (nr) { S.puntos = points(); save(); } if (s.jefaPremio && !S.jefaPremio) { S.jefaPremio = true; save(); } return false; }
    var oldReg = S.regalos || {}; var keepSabor = S.sabor, fl = { pista: S.pista || s.pista, jefaPremio: S.jefaPremio || s.jefaPremio }; S = s; for (var rk in oldReg) if (oldReg[rk]) S.regalos[rk] = 1; S.pista = fl.pista; S.jefaPremio = fl.jefaPremio; if (!(k.sabor >= 0)) S.sabor = keepSabor;
    save(); addPausaItem(); renderTree(); applyStats();
    return true;
  }

  /* ---------------- Arranque: respaldo por progreso y ?hab=1 ---------------- */
  function boot() {
    try {
      if (/[?&]hab=1(&|$)/.test(location.search || '')) { R.noSave = true; S.despierta = true; S.nivel = MAXL; S.sabor = SMAX; ALL.forEach(function (id) { S.rangos[id] = 0; }); S.puntos = points(); }
      else if (!S.jefaPremio && ACH.viaje && ACH.viaje.progress && ACH.viaje.progress().miraflores) { finishAwake(true); }   // ya la había vencido antes: el premio, en silencio
    } catch (e) { warn('boot', e); }
    try { applyStats(); } catch (e) { warn("stats", e); }
    addPausaItem();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 0); }); else setTimeout(boot, 0);

  /* ---------------- API ---------------- */
  function info() {
    var G = G0(), p = G && G.player;
    return { state: snap(), points: points(), need: need(S.nivel), cd: JSON.parse(JSON.stringify(R.cd)), gcd: +Math.max(0, R.gcd).toFixed(2), strumT: p ? +(p.habStrumT || 0).toFixed(2) : 0,
      shieldT: +R.shieldT.toFixed(2), shieldRank: R.shieldRank, heal: R.heal ? +R.heal.left.toFixed(2) : 0, healed: +(R.healed || 0).toFixed(2), blocked: R.blocked || 0,
      pend: R.pend.map(function (e) { return e.id; }), tree: R.tree, awk: R.awk ? R.awk.stage : null, sel: R.sel, learned: learned(), rasAvail: rasAvail(p), lastN: R.lastN, casts: R.castN, noSave: R.noSave, metro: metroInfo() };
  }
  function reset() {
    S = fresh(); mem = null; R.cd = {}; R.gcd = 0; R.heal = null; R.shieldT = 0; R.metroT = 0; R.pend.length = 0; R.sel = null; R.awk = null; R.awkWait = 0;
    R.hadSave = false; R.pistaT = 0; applyStats();
    try { window.localStorage.removeItem(KEY); } catch (e) { /* nada */ }
    closeTree(); last = {}; addPausaItem();
    return info();
  }
  var HAB = ACH.hab = {
    KEY: KEY, DEF: DEF, IDS: IDS, need: need,
    update: function (G, dt) { try { update(G, dt); } catch (e) { warn('update', e); } },
    freeze: function (G, dt) { try { return freeze(G, dt); } catch (e) { warn('freeze', e); R.awk = null; return false; } },
    onKill: onKill, onHit: onHit, filterHurt: filterHurt, syncHud: syncHud, onState: function (s, prev) { try { onState(s, prev); } catch (e) { warn("onState", e); } },
    cast: cast, castSelected: function () { var l = learned(); if (!l.length) { say('Primero aprende una melodía (ÁRBOL)'); return 'no aprendida'; } var id = R.sel && rank(R.sel) > 0 ? R.sel : l[0]; return cast(id); },
    select: function (id) { if (DEF[id] && rank(id) > 0) R.sel = id; return R.sel; }, selected: function () { return R.sel; },
    learned: learned, spend: spend, refund: refund,
    openTree: openTree, closeTree: closeTree, toggleTree: function () { return R.tree ? closeTree() : openTree(); }, treeOpen: function () { return R.tree; },
    carry: carry, restore: restore, save: save, info: info, reset: reset, addXP: addXPPub,
    PDEF: PDEF, PIDS: PIDS, regalar: regalar, applyStats: applyStats, stats: stats, rank: rank,   // v0.13 T2 (P)
    busy: function () { return bossBusy(); }, calm: function () { return +(R.calmT || 0).toFixed(2); },   // v0.12
    // Barranco (B1c): onCast(fn(id, rank)) → función para quitarlo · teach('contrapunto', 'Don Celedonio') → 'rango' | 'punto' | 'ya' | 'no'
    // metro() → {on, left, rank, tol, mul, hits, beat} · beat() → el pulso (ACH.br.beat o reloj propio de 100 bpm) · onBeat(tol) · offBeat()
    onCast: function (fn) { if (typeof fn !== 'function') return function () {}; castFns.push(fn); return function () { var i = castFns.indexOf(fn); if (i >= 0) castFns.splice(i, 1); }; },
    teach: function (id, quien) { if (!DEF[id]) return 'no'; var r = regalar(id, quien || null); return r; },
    taught: function (id) { return !!(S.regalos && S.regalos[id]) || rank(id) > 0; },
    metro: metroInfo, beat: beatNow, onBeat: onBeat, offBeat: function () { return +offBeat().toFixed(3); },
    addSabor: function (n) { addSabor(+n || 0); return Math.round(S.sabor); }   // Barranco: picarones (+15 sabor)
  };
  try { applyStats(); } catch (e) { warn("stats0", e); }   // v0.13 T2: con lo guardado, antes de que game.js cree a Alexander
  Object.defineProperty(HAB, 'despierta', { get: function () { return S.despierta; }, enumerable: true });

  ACH.debug = ACH.debug || {};
  var DBG = ACH.debug.hab = function (o) {
    o = o || {};
    if (o.pista !== undefined) S.pista = !!o.pista;
    if (o.jefaPremio !== undefined) S.jefaPremio = !!o.jefaPremio;
    if (o.nivel !== undefined) S.nivel = clamp(o.nivel | 0, 1, MAXL);
    if (o.xp !== undefined) S.xp = Math.max(0, +o.xp || 0);
    if (o.sabor !== undefined) S.sabor = clamp(+o.sabor || 0, 0, SMAX);
    if (o.rangos) ALL.forEach(function (id) { if (o.rangos[id] !== undefined) S.rangos[id] = clamp(o.rangos[id] | 0, 0, maxRank(id)); });
    if (o.cd === 0) { R.cd = {}; R.gcd = 0; var G = G0(); if (G && G.player) G.player.habStrumT = 0; }
    if (spent() > S.nivel) S.nivel = Math.min(MAXL, spent());
    S.puntos = points(); applyStats();
    if (o.save !== false) { R.noSave = false; save(); }
    addPausaItem(); renderTree();
    return info();
  };
  DBG.info = info;
  DBG.cast = function (id, force) { return cast(id, force) || 'ok'; };
  DBG.reset = reset;
  DBG.spend = spend;
  DBG.awaken = DBG.jefa = function () { var G = G0(); S.jefaPremio = false; if (G && G.player) startAwake(G); return info(); };
})();
