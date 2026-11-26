/* ACHORADO — js/engine/social.js (v0.6, F7): la vida social del barrio.
   1. La orquesta zombie: 5 músicos + 3 bailarines sobre la tarima (prop `tarima`, esquina del 2º jirón). Son zombies del motor con la marca
      `z.social = 'musico' | 'baile'`: updateZombie los salta, emitNoise y los gemidos los ignoran, pero el guitarrazo y las piedras los golpean
      (hitZombie llama a ACH.social.onHit). Música posicional con ACH.audio.musicEngine.diegetic(x, y, on, mode).
   2. La cantante de la ventana (fx.cantanteVentana) con la voz posicional `singer.window`.
   3. Siluetas en ventanas encendidas (fx.siluetaVentana): solo dibujo, animadas con desfases.
   Ganchos (marcados // F7): entities.js (updateZombie, emitNoise, groan, hitZombie), render.js (drawWindows tras el suelo, drawEmissive,
   zombieSprite), game.js (reset al crear el mundo, update en 'playing' y 'dead').
   Estado del grupo (band.mode): 'idle' (pacíficos; la música suena si Alexander está a < near px) · 'stare' (alguien golpeó: se cortó la música,
   los demás músicos miran fijo; a los 20 s sin combate cerca vuelven a tocar con cuenta) · 'gone' (ya no queda ningún músico pacífico). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  var CFG = {
    near: 700, far: 780,            // px: la banda arranca a < near de la tarima y se va (con fundido) a > far
    restart: 20,                    // s sin combate cerca para que los sobrevivientes vuelvan a tocar
    combatR: 360,                   // px a la redonda de la tarima donde cuenta el combate
    musicianHp: 2,
    fps: 5.6,                       // cuadros/s de músicos y bailarines (168 bpm: 2 cuadros por pulso)
    silFps: 2.2, singFps: 3.2,      // siluetas (lento, arrastran los pies) y cantante
    singNear: 400, singFar: 470     // px: la voz de la ventana suena a < singNear y se apaga a > singFar
  };

  var S = {
    t: 0, stage: null, band: null, zs: [], wins: [], singer: null, loop: null, loopT: 0, touchT: 0, lightSig: '', glow: null, glowBig: null, white: null
  };
  function newBand() { return { mode: 'idle', playing: false, combatAt: -1e9, cutAt: -1e9, starts: 0, cuts: 0, restarts: 0 }; }
  S.band = newBand();

  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function eng() { var a = ACH.audio; return a && a.musicEngine; }
  function bandSet(on, mode) {
    var e = eng(), st = S.stage;
    if (!e || !st) return;
    try { e.diegetic(st.x, st.y - 14, on, mode); } catch (err) { /* el sonido nunca rompe el juego */ }
  }
  function sfx(name, data) { var a = ACH.audio; if (a && a.emit) { try { a.emit(name, data); } catch (e) { /* nada */ } } }

  /* ---------------- Montaje (al crear el mundo) ---------------- */
  function mkZ(G, kind, which, x, y, ph) {
    var z = ACH.ent.makeZombie('caminante', x, y);
    z.loco = undefined; z.skin = undefined; z.height = undefined; z.outfit = undefined;   // sin forma de moverse de zvar: usan su propio sprite
    z.hp = z.hpMax = CFG.musicianHp;
    z.social = kind; z.soc = { kind: which, ph: ph, hx: x, hy: y };
    z.flip = ph > 1.5; z.state = 'deambular';
    G.zombies.push(z);
    S.zs.push(z);
    return z;
  }

  function reset(G) {
    var W = ACH.world, D = W.SOCIAL, i, p;
    stopSinger();
    if (S.band.playing) bandSet(false, 'cut');
    S.band = newBand(); S.zs.length = 0; S.t = 0; S.stage = null; S.wins.length = 0; S.singer = null;
    setupCerro(G);                  // v0.9 (H2): cola del cisterna y olla común (si el mundo las trae)
    setupLife(G);                   // v0.9 (H7): gallinas, mototaxista, ladridos a coro
    if (!D) return;
    // la tarima la pone world.js como prop
    for (i = 0; i < W.props.length; i++) if (W.props[i].k === 'tarima') { p = W.props[i]; break; }
    if (!p) return;
    S.stage = { x: p.x, y: p.y };
    D.musicians.forEach(function (m, k) { mkZ(G, 'musico', m[0], p.x + m[1], p.y + m[2], k * 0.7); });
    D.dancers.forEach(function (d, k) { mkZ(G, 'baile', 'baile', p.x + d[0], p.y + d[1], k * 1.3 + 0.4); });
    // ventanas
    var SV = ACH.sprites && ACH.sprites.fx;
    if (SV && SV.cantanteVentana && SV.siluetaVentana) {
      S.singer = { x: D.singer.x, y: D.singer.y, cx: D.singer.x + 9, cy: D.singer.y + 12, lot: D.singer.lot };
      D.windows.forEach(function (w, k) { S.wins.push({ x: w.x, y: w.y, ph: k * 1.7 + 0.3, own: true, lot: w.lot }); });
      scanLights(true);
    }
  }

  // Ventanas encendidas de 16×14 que ya traen las fichas de lote (ACH.world.lights): `.sil` sobre su vidrio. Se relee si cambian (rebake).
  function scanLights(force) {
    var W = ACH.world, L = W.lights, sig = L.length + ':', i, l;
    for (i = 0; i < L.length; i++) sig += Math.round(L[i].x + L[i].y * 3) + ',';
    if (!force && sig === S.lightSig) return;
    S.lightSig = sig;
    for (i = S.wins.length - 1; i >= 0; i--) if (!S.wins[i].own) S.wins.splice(i, 1);
    for (i = 0; i < L.length; i++) {
      l = L[i];
      if (l.kind && l.kind !== 'local') continue;
      if (l.w >= 14 && l.w <= 18 && l.h >= 12 && l.h <= 16) S.wins.push({ x: Math.round(l.x - 9), y: Math.round(l.y - 8), ph: i * 1.1 + 0.9, own: false, lot: l.lot });
    }
  }

  /* ---------------- Golpe: la orquesta se rompe ---------------- */
  function offStage(z) {
    var st = S.stage, W = ACH.world, G = ACH.G, py = G && G.player ? G.player.y : st.y + 40, R = ACH.ent.CFG.zRadius;
    var front = [[z.x, st.y + 12], [z.x + 9, st.y + 14], [z.x - 9, st.y + 14]], back = [[z.x, st.y - 22], [z.x + 9, st.y - 22], [z.x - 9, st.y - 22]];
    var c = (py > st.y ? front.concat(back) : back.concat(front)), i;
    for (i = 0; i < c.length; i++) if (!W.collideCircle(c[i][0], c[i][1], R)) { z.x = c[i][0]; z.y = c[i][1]; return; }
  }
  function peaceful(kind) {
    var n = 0;
    for (var i = 0; i < S.zs.length; i++) { var z = S.zs[i]; if (z.social === kind && z.state !== 'muerto') n++; }
    return n;
  }
  // Lo llama hitZombie (guitarrazo o piedra) ANTES de aplicar el daño: el golpeado deja de ser pacífico y se vuelve un zombie normal.
  function onHit(G, z) {
    if (z.social === 'mototaxista') { wakeMoto(G, z); return; }
    if (!z.social || !S.stage) return;
    var kind = z.social, B = S.band, i, o, p = G.player;
    if (B.mode !== 'stare') { bandSet(false, 'cut'); if (B.playing) B.cuts++; }   // acorde desafinado y platillo ahogado (musica.js)
    B.playing = false; B.mode = 'stare'; B.combatAt = G.time; B.cutAt = G.time;
    z.social = null; z.staring = false;
    if (kind === 'musico') offStage(z);
    // los bailarines pelean, enseguida
    for (i = 0; i < S.zs.length; i++) {
      o = S.zs[i];
      if (o === z || !o.social || o.state === 'muerto') continue;
      if (o.social === 'baile') {
        o.social = null; o.state = 'perseguir'; o.lostT = 0; o.lastX = p.x; o.lastY = p.y;
        sfx('zombie.alert', { x: o.x, y: o.y, type: o.type });
      } else o.staring = true;                       // los otros músicos se quedan mirando
    }
    if (!peaceful('musico')) B.mode = 'gone';
  }

  /* ---------------- Cuadro a cuadro ---------------- */
  function update(G, dt) {
    var B = S.band, st = S.stage, p = G.player, i, z, o;
    S.t += dt;
    if (!p) return;
    if (st) {
      // combate cerca de la tarima: Alexander dando guitarrazos, o un ex-integrante hostil peleando
      var combat = p.atkT >= 0 && dist(p.x, p.y, st.x, st.y) < CFG.combatR;
      for (i = 0; i < S.zs.length && !combat; i++) {
        z = S.zs[i];
        if (z.social || z.state === 'muerto' || z.state === 'deambular' || z.state === 'investigar') continue;
        if (dist(z.x, z.y, st.x, st.y) < CFG.combatR) combat = true;
      }
      if (combat && B.mode === 'stare') B.combatAt = G.time;
      // los pacíficos se quedan en su sitio (por si Alexander los empujó) y, si miran fijo, se voltean hacia él
      for (i = 0; i < S.zs.length; i++) {
        z = S.zs[i];
        if (!z.social || z.state === 'muerto') continue;
        o = z.soc;
        if (Math.abs(z.x - o.hx) > 0.2 || Math.abs(z.y - o.hy) > 0.2) { z.x += (o.hx - z.x) * 0.2; z.y += (o.hy - z.y) * 0.2; }
        z.moving = false; z.state = 'deambular';
        if (z.staring) z.flip = p.x < z.x;
      }
      if (B.mode === 'idle' && !peaceful('musico')) B.mode = 'gone';
      if (B.mode === 'stare') {
        if (!peaceful('musico')) B.mode = 'gone';
        else if (G.time - B.combatAt >= CFG.restart) {            // calma: los sobrevivientes vuelven a tocar (la cuenta la hace musica.js)
          B.mode = 'idle'; B.restarts++;
          for (i = 0; i < S.zs.length; i++) S.zs[i].staring = false;
        }
      }
      var d = dist(p.x, p.y, st.x, st.y);
      if (B.mode === 'idle') {
        if (!B.playing && d < CFG.near) { B.playing = true; B.starts++; bandSet(true); }
        else if (B.playing && d > CFG.far) { B.playing = false; bandSet(false); }
      } else if (B.playing) { B.playing = false; bandSet(false, B.mode === 'gone' ? 'cut' : undefined); }
    }
    updateCerro(G, dt);             // v0.9 (H2)
    updateLife(G, dt);              // v0.9 (H7)
    updateSinger(p, dt);
    if ((S.t * 2 | 0) !== ((S.t - dt) * 2 | 0)) scanLights(false);
  }

  function stopSinger() { if (S.loop) { try { S.loop.stop(); } catch (e) { /* nada */ } } S.loop = null; S.loopT = 0; }
  function updateSinger(p, dt) {
    var s = S.singer, A = ACH.audio;
    if (!s || !A || !A.loop) return;
    var d = dist(p.x, p.y, s.cx, s.cy);
    if (d < CFG.singNear) {
      if (S.loop && S.loop.alive) {
        S.touchT -= dt;
        if (S.touchT <= 0) { S.touchT = 0.5; S.loop.touch(); }
      } else {
        S.loopT -= dt;
        if (S.loopT <= 0) { S.loopT = 1; S.touchT = 0.5; S.loop = A.loop('singer.window', { x: s.cx, y: s.cy }); }   // sin contexto de audio devuelve un asa inerte: se reintenta
      }
    } else if (d > CFG.singFar && S.loop) stopSinger();
  }

  /* ---------------- Dibujo ---------------- */
  function whiteOf(c) {
    if (c._soc) return c._soc;
    var w = document.createElement('canvas'); w.width = c.width; w.height = c.height;
    var g = w.getContext('2d'); g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, w.width, w.height);
    w.ax = c.ax; w.ay = c.ay;
    c._soc = w;
    return w;
  }
  // Lienzo de un zombie de la orquesta (pacífico: tocando o mirando fijo; hostil: el mismo cuerpo caminando). null si no es de la orquesta.
  function sprite(z, ghost) {
    var o = z.soc, Z = ACH.sprites && ACH.sprites.zombie;
    if (!o || !Z) return null;
    var set = o.kind === 'baile' ? Z.baile : (Z.musico && Z.musico[o.kind]);
    if (!set || !set.length) return null;
    var f;
    if (z.social) f = z.staring ? 0 : Math.floor(S.t * CFG.fps + o.ph);
    else f = z.moving ? Math.floor(z.animT * 8) : 0;
    var c = set[((f % set.length) + set.length) % set.length];
    return (ghost || z.state === 'golpeado') ? whiteOf(c) : c;
  }

  function visible(x, y, w, h, cx, cy) {
    var V = ACH.render.VIEW;
    return !(x + w < cx || x > cx + V.w || y + h < cy || y > cy + V.h);
  }
  // Tras el suelo y antes de las entidades: la cantante y las siluetas (cada ventana con su desfase).
  function drawWindows(ctx, cx, cy, t) {
    var F = ACH.sprites && ACH.sprites.fx, i, w, s;
    if (!F || !F.siluetaVentana) return;
    s = S.singer;
    if (s && F.cantanteVentana && visible(s.x, s.y, 18, 16, cx, cy)) ctx.drawImage(F.cantanteVentana[Math.floor(t * CFG.singFps) & 3], s.x - cx, s.y - cy);
    for (i = 0; i < S.wins.length; i++) {
      w = S.wins[i];
      if (!visible(w.x, w.y, 18, 16, cx, cy)) continue;
      var spr = F.siluetaVentana[Math.floor(t * CFG.silFps + w.ph) & 3];
      ctx.drawImage(w.own ? spr : (spr.sil || spr), w.x - cx, w.y - cy);
    }
  }
  // Brillo cálido de las ventanas propias y de la cantante (el compuesto 'lighter' ya está puesto por drawEmissive).
  function drawEmissive(ctx, cx, cy, t) {
    var LS = ACH.sprites && ACH.sprites.light, i, w, a, s = S.singer;
    if (!LS || !LS.glow) return;
    if (!S.glow) { S.glow = LS.glow(12, '#ffb45a'); S.glowBig = LS.glow(20, '#ffb45a'); }
    function win(x, y, strength, big) {
      if (!visible(x - 20, y - 20, 58, 56, cx, cy)) return;
      var fl = 0.92 + 0.08 * Math.sin(t * 7 + x * 0.13);
      ctx.fillStyle = '#5a3a14'; ctx.globalAlpha = Math.min(1, strength * fl);
      ctx.fillRect(x + 1 - cx, y + 1 - cy, 16, 14);
      var g = big ? S.glowBig : S.glow;
      ctx.globalAlpha = Math.min(1, strength * 0.45 * fl);
      ctx.drawImage(g, Math.round(x + 9 - cx - g.cx), Math.round(y + 8 - cy - g.cy));
    }
    var nk = 1 + 0.7 * ((ACH.noche && ACH.noche.t) || 0);   // v0.8 (G2): de noche las ventanas con siluetas y la cantante destacan más
    for (i = 0; i < S.wins.length; i++) { w = S.wins[i]; if (w.own) win(w.x, w.y, 0.55 * nk, false); }
    if (s) win(s.x, s.y, 0.8 * nk, true);
    ctx.globalAlpha = 1;
  }

  /* ======================================================================================================
     v0.9 (H2): encuentros de señoras del Cerro (SPEC v0.9 §4.3), con el patrón de la orquesta:
     - 'cola' (cola del cisterna): señoras del balde esperando junto al camión. Pacíficas mientras no te vean a < 50 px (con línea de vista),
       no hagas ruido fuerte cerca (G.noises con r ≥ 100) ni les pegues; entonces van todas.
     - 'olla' (olla común): señoras de la olla cocinando. Pacíficas hasta que les pegues. Si sobreviven y te vas, a los 20 s vuelven a su
       sitio y a cocinar. Si las tumbas a todas, queda comida (taper) en el fogón.
     Las señoras del grupo llevan z.grp (el grupo) y z.calm; senoras.js pregunta a senoraCalm(G, z, dt) en su update (true = se queda en su sitio)
     y avisa con senoraHit(G, z) (antes del daño) y senoraDied(G, z). Estado del grupo: 'calm' · 'angry' · 'return' (volviendo a su sitio) · 'gone'.
     ====================================================================================================== */
  var SG = { groups: [], world: null };
  var SCFG = {
    restart: 20,                     // s sin combate cerca para que vuelvan a su sitio
    combatR: 170,                    // px alrededor del grupo donde cuenta el combate (o tu presencia)
    colaSee: 50, colaNoise: 100,     // cola: te ven a < 50 px; ruido fuerte = r ≥ 100 que las alcance
    pick: { olla: 140, cola: 130 }, max: { olla: 4, cola: 6 },
    returnMul: 0.7, tapers: 1
  };
  function mkGroup(G, kind, at, type) {
    if (!at) return null;
    var g = { kind: kind, x: at.x, y: at.y, members: [], mode: 'calm', combatAt: -1e9, provokes: 0, restarts: 0, fed: false }, cand = [];
    for (var i = 0; i < G.zombies.length; i++) {
      var z = G.zombies[i];
      if (z.type !== type || z.grp || z.state === 'muerto') continue;
      var d = dist(z.x, z.y, at.x, at.y);
      if (d <= SCFG.pick[kind]) cand.push({ z: z, d: d });
    }
    cand.sort(function (a, b) { return a.d - b.d; });
    cand.slice(0, SCFG.max[kind]).forEach(function (e, k) {
      var z = e.z;
      z.grp = g; z.calm = true; z.home = { x: z.x, y: z.y, flip: kind === 'cola' ? z.x > at.x : z.x > at.x, ph: k * 1.3 };
      z.flip = z.home.flip; z.state = 'deambular';
      g.members.push(z);
    });
    if (!g.members.length) return null;
    SG.groups.push(g);
    return g;
  }
  function setupCerro(G) {
    var W = ACH.world;
    SG.groups.length = 0; SG.world = W;
    if (!G || !W || !W.ollaComun && !W.cisterna) return;
    mkGroup(G, 'olla', W.ollaComun, 'senoraOlla');
    mkGroup(G, 'cola', W.cisterna, 'senoraBalde');
  }
  function provoke(G, g, why) {
    if (!g || g.mode === 'angry' || g.mode === 'gone') { if (g && g.mode === 'angry') g.combatAt = G.time; return; }
    var p = G.player, first = true;
    g.mode = 'angry'; g.combatAt = G.time; g.provokes++; g.why = why;
    g.members.forEach(function (z) {
      if (z.state === 'muerto') return;
      z.calm = false; z.ret = false;
      if (z.state !== 'golpeado') { z.state = 'perseguir'; z.lostT = 0; z.lastX = p.x; z.lastY = p.y; }
      sfx('zombie.alert', { x: z.x, y: z.y, type: z.type });
      if (first) { first = false; sfx('senora.yell', { x: z.x, y: z.y, type: z.type }); var A = ACH.audio; if (A && A.say) { try { A.say(g.kind === 'olla' ? 'senoraOlla' : 'senoraBalde', { who: 'senora', x: z.x, y: z.y }); } catch (e) { /* nada */ } } }
    });
  }
  function senoraHit(G, z) { if (z && z.grp) provoke(G, z.grp, 'hit'); }
  function senoraDied(G, z) {
    var g = z && z.grp; if (!g) return;
    z.calm = false;
    var alive = g.members.filter(function (o) { return o.state !== 'muerto'; }).length;
    if (!alive) {
      g.mode = 'gone';
      if (g.kind === 'olla' && !g.fed && ACH.inv && ACH.inv.drop) {   // queda comida en el fogón
        g.fed = true;
        try { ACH.inv.drop(g.x, g.y - 6, [{ id: 'taper', n: SCFG.tapers }], true); } catch (e) { /* nada */ }
      }
    }
  }
  // true = está en su sitio (cocinando o esperando) o volviendo a él: la IA normal no corre este paso
  function senoraCalm(G, z, dt) {
    var g = z.grp; if (!g) return false;
    var h = z.home, p = G.player;
    if (z.ret) {
      var d = dist(z.x, z.y, h.x, h.y);
      if (d <= 2) { z.ret = false; z.calm = true; z.x = h.x; z.y = h.y; }
      else {
        var sp = ((ACH.ent.ZT[z.type] || {}).speed || 30) * SCFG.returnMul;
        var hit = ACH.world.moveCircle(z, (h.x - z.x) / d * sp * dt, (h.y - z.y) / d * sp * dt, ACH.ent.CFG.zRadius);
        z.moving = true; z.flip = h.x < z.x;
        z.retStuck = hit ? (z.retStuck || 0) + dt : 0;
        if (z.retStuck > 3) { z.retStuck = 0; z.ret = false; z.calm = true; }   // atascada: se queda donde está
        z.state = 'deambular';
        return true;
      }
    }
    if (!z.calm) return false;
    z.state = 'deambular'; z.lungeT = 0;
    if (Math.abs(z.x - h.x) > 0.3 || Math.abs(z.y - h.y) > 0.3) { z.x += (h.x - z.x) * 0.2; z.y += (h.y - z.y) * 0.2; }
    // olla: removiendo (se mece hacia el fogón); cola: esperando, de vez en cuando mira a Alexander
    var t = S.t + h.ph;
    z.moving = g.kind === 'olla' ? (Math.sin(t * 1.7) > 0.6) : false;
    z.flip = g.kind === 'cola' && p && dist(z.x, z.y, p.x, p.y) < 110 && Math.sin(t * 0.7) > 0.3 ? p.x < z.x : h.flip;
    return true;
  }
  function updateCerro(G, dt) {
    var p = G.player; if (!p || !SG.groups.length) return;
    if (SG.world !== ACH.world) { SG.groups.length = 0; return; }
    for (var gi = 0; gi < SG.groups.length; gi++) {
      var g = SG.groups[gi], i, z, alive = 0;
      for (i = 0; i < g.members.length; i++) if (g.members[i].state !== 'muerto') alive++;
      if (!alive) { g.mode = 'gone'; continue; }
      if (g.mode === 'calm' && G.state === 'playing' && p.hp > 0 && !(p.invisT > 0)) {
        if (g.kind === 'cola') {
          for (i = 0; i < g.members.length; i++) {
            z = g.members[i];
            if (!z.calm || z.state === 'muerto') continue;
            if (dist(z.x, z.y, p.x, p.y) < SCFG.colaSee && ACH.world.los(z.x, z.y - 6, p.x, p.y - 6)) { provoke(G, g, 'seen'); break; }
          }
          for (i = 0; i < G.noises.length && g.mode === 'calm'; i++) {
            var n = G.noises[i];
            if (n.r >= SCFG.colaNoise && n.t < 0.05 && dist(n.x, n.y, g.x, g.y) <= n.r) provoke(G, g, 'noise');
          }
        }
        continue;
      }
      if (g.mode === 'angry') {
        var combat = dist(p.x, p.y, g.x, g.y) < SCFG.combatR && p.hp > 0;
        for (i = 0; i < g.members.length && !combat; i++) {
          z = g.members[i];
          if (z.state === 'muerto') continue;
          if ((z.state === 'atacar' || z.state === 'golpeado' || (z.state === 'perseguir' && z.lostT < 1)) && dist(z.x, z.y, p.x, p.y) < SCFG.combatR + 60) combat = true;
        }
        if (combat) g.combatAt = G.time;
        else if (G.time - g.combatAt >= SCFG.restart) {   // se fue: vuelven a lo suyo
          g.mode = 'calm'; g.restarts++;
          for (i = 0; i < g.members.length; i++) { z = g.members[i]; if (z.state === 'muerto') continue; z.ret = true; z.calm = false; z.state = 'deambular'; z.retStuck = 0; }
        }
      }
    }
  }
  function senoraGroups() {
    var G = ACH.G;
    return SG.groups.map(function (g) {
      return { kind: g.kind, x: g.x, y: g.y, mode: g.mode, why: g.why, provokes: g.provokes, restarts: g.restarts, fed: g.fed,
        restartIn: g.mode === 'angry' && G ? Math.max(0, +(SCFG.restart - (G.time - g.combatAt)).toFixed(1)) : null,
        members: g.members.map(function (z) { return { x: Math.round(z.x), y: Math.round(z.y), hp: z.hp, state: z.state, calm: !!z.calm, ret: !!z.ret }; }) };
    });
  }


  /* ======================================================================================================
     v0.9 (H7): la vida del Cerro (SPEC v0.9 §9). Solo si el mundo trae chickenSpawns / mototaxistas / perros.
     - Gallinas (ACH.sprites.npc.gallina[Var]): picotean, caminan cortito y, si corres cerca (o te les pegas), huyen cacareando (chicken.flee,
       ruido de radio 60). Nunca reciben daño. Se dibujan por ACH.drawHooks.ysort.
     - El mototaxista: un zombie sentado al volante de la primera mototaxi del paradero (z.social = 'mototaxista'): quieto, gruñe cuando
       Alexander pasa cerca; si le pegas o te le pegas demasiado, se baja y te persigue como un zombie normal.
     - Ladridos a coro: cuando un perro de una jauría ladra, los vecinos (a < 110 px) le contestan unas décimas después.
     - Polvo: motas ocres que pasan con el viento, más en la ladera alta (capa aérea, sin estado de juego).
     ====================================================================================================== */
  var LF = { hens: [], moto: [], barkQ: [], world: null, t: 0, noiseCD: 0, dust: [], wasBark: [] };
  var HC = { fleeNear: 30, runNear: 84, fleeT: [1.2, 2.0], fleeSp: 96, walkSp: 13, homeR: 46, cluck: [5, 12], noiseR: 60, noiseCD: 3.5, vision: 280 };
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function mkHen(c, k) {
    return { x: c.x, y: c.y, hx: c.x, hy: c.y, v: k % 3, state: Math.random() < 0.5 ? 'peck' : 'idle', t: rnd(0.4, 2.5), vx: 0, vy: 0, face: Math.random() < 0.5 ? -1 : 1,
      anim: rnd(0, 3), cluckT: rnd(1, 8), hurtCD: 0, stuck: 0, id: k };
  }
  function seat(m) { return { x: m.x + (m.dx === undefined ? 6 : m.dx), y: m.y - (m.dy === undefined ? 4 : m.dy) }; }
  function mkMoto(G, m) {
    var sp = seat(m), z = ACH.ent.makeZombie('caminante', sp.x, sp.y);
    try { if (ACH.zvar && ACH.zvar.assign) ACH.zvar.assign(z, Math.random, 'camina'); } catch (e) { /* nada */ }
    z.hp = z.hpMax = 3; z.social = 'mototaxista'; z.flip = false; z.state = 'deambular'; z.moving = false;
    z.moto = { hx: sp.x, hy: sp.y, mx: m.x, my: m.y, groanT: rnd(2, 5) };
    G.zombies.push(z);
    return z;
  }
  function setupLife(G) {
    var W = ACH.world, i;
    LF.hens.length = 0; LF.moto.length = 0; LF.barkQ.length = 0; LF.wasBark.length = 0; LF.world = W; LF.t = 0; LF.noiseCD = 0;
    if (!W || !G) return;
    (W.chickenSpawns || []).forEach(function (c, k) { LF.hens.push(mkHen(c, k)); });
    (W.mototaxistas || []).forEach(function (m) { LF.moto.push(mkMoto(G, m)); });
    if (!LF.dust.length) for (i = 0; i < 28; i++) LF.dust.push({ x: Math.random(), y: Math.random(), s: rnd(0.5, 1.4), ph: rnd(0, 6.3) });
  }
  function wakeMoto(G, z) {
    if (z.social !== 'mototaxista') return;
    var W = ACH.world, M = z.moto || {}, p = G.player, R = ACH.ent.CFG.zRadius, spots = [[-14, 12], [14, 12], [0, 16], [-22, 4], [22, 4], [0, -14]], i;
    z.social = null; z.staring = false;
    for (i = 0; i < spots.length; i++) { var nx = (M.mx || z.x) + spots[i][0], ny = (M.my || z.y) + spots[i][1]; if (!W.collideCircle(nx, ny, R)) { z.x = nx; z.y = ny; break; } }
    z.state = 'perseguir'; z.lostT = 0; z.lastX = p.x; z.lastY = p.y;
    sfx('zombie.alert', { x: z.x, y: z.y, type: z.type });
    if (ACH.game && ACH.game.G && ACH.fx && ACH.fx.text) { try { ACH.fx.text(z.x, z.y - 30, '¡CARRERA!', '#ffd24a'); } catch (e) { /* nada */ } }
  }
  function updateMoto(G, dt) {
    var p = G.player, i, z, M;
    for (i = 0; i < LF.moto.length; i++) {
      z = LF.moto[i]; M = z.moto;
      if (!z.social || z.state === 'muerto') continue;
      z.x = M.hx; z.y = M.hy; z.moving = false; z.state = 'deambular'; z.lungeT = 0;
      var d = dist(z.x, z.y, p.x, p.y);
      z.flip = d < 150 ? p.x < z.x : false;
      if (d < 21 && p.hp > 0 && !(p.invisT > 0)) { wakeMoto(G, z); continue; }          // te le pegas demasiado: se baja
      M.groanT -= dt;
      if (M.groanT <= 0) { M.groanT = rnd(4, 8); if (d < 320) sfx('zombie.idle', { x: z.x, y: z.y, type: z.type }); }
    }
  }
  function updateHens(G, dt) {
    var p = G.player, W = ACH.world, alive = p.hp > 0, i, h, d;
    LF.noiseCD -= dt;
    for (i = 0; i < LF.hens.length; i++) {
      h = LF.hens[i]; h.anim += dt; h.t -= dt; h.cluckT -= dt;
      d = dist(h.x, h.y, p.x, p.y);
      if (alive && h.state !== 'flee' && (d < HC.fleeNear || (p.running && d < HC.runNear))) {
        var ax = h.x - p.x, ay = h.y - p.y, al = Math.sqrt(ax * ax + ay * ay) || 1, rot = rnd(-0.5, 0.5);
        h.vx = (ax / al * Math.cos(rot) - ay / al * Math.sin(rot)) * HC.fleeSp; h.vy = (ax / al * Math.sin(rot) + ay / al * Math.cos(rot)) * HC.fleeSp * 0.7;
        h.state = 'flee'; h.t = rnd(HC.fleeT[0], HC.fleeT[1]); h.face = h.vx < 0 ? -1 : 1; h.anim = 0; h.stuck = 0;
        sfx('chicken.flee', { x: h.x, y: h.y });
        if (LF.noiseCD <= 0 && ACH.ent.emitNoise) { LF.noiseCD = HC.noiseCD; ACH.ent.emitNoise(G, h.x, h.y, HC.noiseR); }
      }
      if (h.state === 'flee') {
        var hit = W.moveCircle(h, h.vx * dt, h.vy * dt, 3);
        if (hit) { h.stuck += dt; var a = Math.atan2(h.vy, h.vx) + (Math.random() < 0.5 ? 1.6 : -1.6) + rnd(-0.4, 0.4); h.vx = Math.cos(a) * HC.fleeSp; h.vy = Math.sin(a) * HC.fleeSp * 0.7; h.face = h.vx < 0 ? -1 : 1; }
        if (h.t <= 0 || h.stuck > 0.6) { h.state = 'idle'; h.t = rnd(1, 2.5); h.vx = h.vy = 0; }
        continue;
      }
      if (h.cluckT <= 0) { h.cluckT = rnd(HC.cluck[0], HC.cluck[1]); if (d < HC.vision) sfx('chicken.cluck', { x: h.x, y: h.y }); }
      if (h.state === 'walk') {
        if (W.moveCircle(h, h.vx * dt, h.vy * dt, 3)) { h.state = 'peck'; h.t = rnd(0.8, 2); h.vx = h.vy = 0; }
        else if (h.t <= 0) { h.state = 'peck'; h.t = rnd(1, 3); h.vx = h.vy = 0; }
      } else if (h.t <= 0) {
        var q = Math.random();
        if (q < 0.55) { h.state = 'peck'; h.t = rnd(1.2, 3.2); }
        else if (q < 0.8) {
          h.state = 'walk'; h.t = rnd(0.7, 1.8);
          var tx = h.hx - h.x, ty = h.hy - h.y, td = Math.sqrt(tx * tx + ty * ty), ang = td > HC.homeR ? Math.atan2(ty, tx) + rnd(-0.5, 0.5) : rnd(0, 6.28);
          h.vx = Math.cos(ang) * HC.walkSp; h.vy = Math.sin(ang) * HC.walkSp * 0.6; h.face = h.vx < 0 ? -1 : 1;
        } else { h.state = 'idle'; h.t = rnd(0.8, 2); h.face = Math.random() < 0.5 ? -1 : 1; }
      }
    }
  }
  function updateBarks(G, dt) {
    var dogs = G.npcs && G.npcs.dogs, i, j, d, o, C = ACH.ent.CFG;
    if (!dogs || !dogs.length) return;
    for (i = 0; i < dogs.length; i++) {
      d = dogs[i];
      var wb = !!d._wb;
      if (d.state === 'bark' && !wb) {
        for (j = 0; j < dogs.length; j++) {
          o = dogs[j];
          if (o === d || o.wary || o.state === 'flee' || o.state === 'bark' || o.barkCD > 0 || dist(o.x, o.y, d.x, d.y) > 110) continue;
          LF.barkQ.push({ d: o, at: LF.t + rnd(0.15, 0.55) });
        }
      }
      d._wb = d.state === 'bark';
    }
    for (i = LF.barkQ.length - 1; i >= 0; i--) {
      var b = LF.barkQ[i];
      if (LF.t < b.at) continue;
      LF.barkQ.splice(i, 1);
      o = b.d; if (o.state === 'flee' || o.state === 'bark' || o.wary) continue;
      o.state = 'bark'; o.t = (C.dogBarkT || 1) * rnd(0.7, 1); o.barkCD = C.dogBarkCD || 4; o.vx = o.vy = 0; o.moving = false; o.anim = 0;
      o.face = G.player.x < o.x ? -1 : 1;
      sfx('dog.bark', { x: o.x, y: o.y });
    }
  }
  function updateLife(G, dt) {
    if (!G.player || LF.world !== ACH.world) return;
    LF.t += dt;
    if (LF.hens.length) updateHens(G, dt);
    if (LF.moto.length) updateMoto(G, dt);
    updateBarks(G, dt);
  }
  function henSprite(h) {
    var N = ACH.sprites && ACH.sprites.npc, set = N && ((N.gallinaVar && N.gallinaVar[h.v % N.gallinaVar.length]) || N.gallina);
    if (!set) return null;
    var c, flip = false;
    if (h.state === 'flee') { var run = h.vx < 0 ? set.run.left : set.run.right; c = run[Math.floor(h.anim * 14) % run.length]; }
    else if (h.state === 'peck') { c = set.peck[Math.floor(h.anim * 3.4) % set.peck.length]; flip = h.face < 0; }
    else if (h.state === 'walk') { var wr = h.vx < 0 ? set.run.left : set.run.right; c = wr[Math.floor(h.anim * 6) % wr.length]; }
    else { c = set.idle[Math.floor(h.anim * 1.3) % set.idle.length]; flip = h.face < 0; }
    return c ? { c: c, flip: flip } : null;
  }
  // El mototaxista sentado: el cuerpo real queda detrás de la mototaxi (la tapa), así que su busto se dibuja encima, recortado, dentro de la cabina
  var SEAT = { up: 10, h: 16, dx: 7 };
  function motoBust(z) {
    return { y: z.moto.my + 1, draw: function (ctx, cx, cy) {
      if (!z.social || z.state === 'muerto') return;
      var spr = (ACH.zvar && ACH.zvar.frame && ACH.zvar.frame(z)) || (ACH.gfx && ACH.gfx.zombie && ACH.gfx.zombie('caminante', 'walk', 0));
      if (!spr) return;
      var ax = spr.ax === undefined ? spr.width >> 1 : spr.ax, ay = spr.ay === undefined ? spr.height - 1 : spr.ay;
      var bob = Math.sin(LF.t * 2.3 + z.moto.mx) > 0.75 ? 1 : 0;
      var bx = Math.round(z.moto.mx + SEAT.dx) - cx, top = Math.round(z.moto.my - 32 + SEAT.up) - cy + bob;   // `top` = fila de la cabeza del busto
      ctx.save(); ctx.beginPath(); ctx.rect(bx - 14, top - 1, 28, SEAT.h + 1); ctx.clip();
      if (z.flip) { ctx.translate(bx, 0); ctx.scale(-1, 1); ctx.drawImage(spr, -ax, top); }
      else ctx.drawImage(spr, bx - ax, top);
      ctx.restore();
    } };
  }
  function lifeYsort(G) {
    if (LF.world !== ACH.world) return null;
    var V = ACH.render.VIEW, cam = G.cam, out = [], i;
    for (i = 0; i < LF.moto.length; i++) { var mz = LF.moto[i]; if (mz.social && mz.state !== 'muerto' && Math.abs(mz.moto.mx - cam.x - V.w / 2) < V.w / 2 + 40 && Math.abs(mz.moto.my - cam.y - V.h / 2) < V.h / 2 + 40) out.push(motoBust(mz)); }
    if (!LF.hens.length) return out;
    for (i = 0; i < LF.hens.length; i++) {
      var h = LF.hens[i];
      if (h.x < cam.x - 20 || h.x > cam.x + V.w + 20 || h.y < cam.y - 10 || h.y > cam.y + V.h + 30) continue;
      out.push({ y: h.y, x: h.x, draw: (function (hh) { return function (ctx, cx, cy) {
        var sp = henSprite(hh); if (!sp) return;
        var c = sp.c, x = Math.round(hh.x) - cx, y = Math.round(hh.y) - cy, ax = c.ax === undefined ? c.width >> 1 : c.ax, ay = c.ay === undefined ? c.height - 1 : c.ay;
        if (!sp.flip) { ctx.drawImage(c, x - ax, y - ay); return; }
        ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(c, -ax, -ay); ctx.restore();
      }; })(h) });
    }
    return out;
  }
  // polvo del cerro: motas ocres que cruzan la pantalla con el viento (más cuanto más arriba)
  function lifeAir(ctx, G, cx, cy) {
    var W = ACH.world; if (LF.world !== W || !LF.dust.length || !W.cfgNoche) return;
    var V = ACH.render.VIEW, alt = 1 - Math.min(1, Math.max(0, G.cam.y / W.H)), n = Math.round(LF.dust.length * (0.35 + 0.65 * alt)), t = G.clock || LF.t, gust = 0.5 + 0.5 * Math.sin(t * 0.21) * Math.sin(t * 0.09 + 1);
    ctx.save();
    for (var i = 0; i < n; i++) {
      var m = LF.dust[i], sp = (14 + 26 * gust) * m.s, x = ((m.x * (V.w + 80) + t * sp) % (V.w + 80)) - 40, y = ((m.y * V.h + Math.sin(t * 0.8 + m.ph) * 6 + t * 3 * m.s) % V.h);
      ctx.globalAlpha = 0.16 + 0.26 * gust * m.s;
      ctx.fillStyle = i % 3 ? '#c9a778' : '#e0cca2';
      ctx.fillRect(Math.round(x), Math.round(y), m.s > 1 ? 2 : 1, 1);
      if (gust > 0.55 && i % 2) ctx.fillRect(Math.round(x) - 2, Math.round(y), 1, 1);
    }
    ctx.restore();
  }
  (function () {
    var DH = ACH.drawHooks = ACH.drawHooks || { ground: [], ysort: [], air: [], screen: [] };
    ['ground', 'ysort', 'air', 'screen'].forEach(function (k) { if (!Array.isArray(DH[k])) DH[k] = []; });
    DH.ysort.push(lifeYsort); DH.air.push(lifeAir);
  })();
  function lifeInfo() {
    return { hens: LF.hens.map(function (h) { return { x: Math.round(h.x), y: Math.round(h.y), state: h.state, v: h.v }; }),
      moto: LF.moto.map(function (z) { return { x: Math.round(z.x), y: Math.round(z.y), hp: z.hp, social: z.social || null, state: z.state }; }), barkQ: LF.barkQ.length };
  }

  /* ---------------- Debug ---------------- */
  function info() {
    var B = S.band, st = S.stage, e = eng(), p = ACH.G && ACH.G.player;
    function row(z) { return { kind: z.soc && z.soc.kind, x: Math.round(z.x), y: Math.round(z.y), hp: z.hp, state: z.state, peaceful: !!z.social, staring: !!z.staring }; }
    var mus = [], dan = [];
    S.zs.forEach(function (z) { (z.soc.kind === 'baile' ? dan : mus).push(row(z)); });
    return {
      band: { mode: B.mode, playing: B.playing, starts: B.starts, cuts: B.cuts, restarts: B.restarts,
        restartIn: B.mode === 'stare' && ACH.G ? Math.max(0, +(CFG.restart - (ACH.G.time - B.combatAt)).toFixed(1)) : null,
        stage: st && { x: st.x, y: st.y }, dist: st && p ? Math.round(dist(p.x, p.y, st.x, st.y)) : null,
        engine: e && e.band ? e.band() : null },
      musicians: mus, dancers: dan,
      singer: S.singer && { x: S.singer.cx, y: S.singer.cy, dist: p ? Math.round(dist(p.x, p.y, S.singer.cx, S.singer.cy)) : null, loopAlive: !!(S.loop && S.loop.alive) },
      windows: S.wins.map(function (w) { return { x: w.x, y: w.y, own: w.own, lot: w.lot }; })
    };
  }
  ACH.debug = ACH.debug || {};
  ACH.debug.social = info;
  ACH.debug.life = lifeInfo;
  // toBand(): Alexander delante de la tarima, a ~30 px (fuera del arco del guitarrazo). toBand(true): pegado a ella, al alcance de los músicos.
  ACH.debug.toBand = function (close) {
    var st = S.stage; if (!st) return null;
    ACH.debug.teleport(st.x, st.y + (close ? 8 : 34));
    return info();
  };

  ACH.social = { CFG: CFG, reset: reset, update: update, onHit: onHit, sprite: sprite, drawWindows: drawWindows, drawEmissive: drawEmissive, info: info,
    SCFG: SCFG, senoraCalm: senoraCalm, senoraHit: senoraHit, senoraDied: senoraDied, senoraGroups: senoraGroups, provoke: function (kind) { var G = ACH.G; SG.groups.forEach(function (g) { if (!kind || g.kind === kind) provoke(G, g, "debug"); }); return senoraGroups(); } };
  // v0.9: lo social se rehace por nivel. game.js ya llama a reset(G) al crear el mundo; el gancho solo lo repite si este mundo no se montó.
  if (!ACH.levelHooks) ACH.levelHooks = [];
  ACH.levelHooks.push(function () { var G = ACH.G; if (G && SG.world !== ACH.world) reset(G); });
})();
