/* ACHORADO — js/engine/cerro.js (v0.9, H1): las carretillas que bajan del cerro (SPEC v0.9 §5).
   Publica ACH.cerro = { carts, spawnCart(laneId) → cart|null, update(G, dt), stats:{jumped, hit, crashed}, reset(), knock(cart), CFG }.
   Solo corre si el mundo trae `lanes` (el Cerro). Cada 25–40 s, si Alexander está a menos de 40 px de un carril y no hay otra en curso,
   aparece una carretilla con un zombie sentado arriba del carril, fuera de cámara: 1,5 s de aviso (traqueteo, grito, flecha «¡!» en el
   borde de la pantalla) y baja por la polilínea acelerando hasta 170 px/s. Atropella zombies; a Alexander le pega salvo que la salte (p.z ≥ 8).
   Al final del carril (o en el fuego, o con knock()) se voltea: queda la carretilla rota, el pasajero se vuelve gusano y suelta botín de mercado.
   Se dibuja por ACH.drawHooks.ysort (carretilla + pasajero) y ACH.drawHooks.screen (la flecha).
   v0.13 (C4): también la radio a pilas de la ladera alta (ACH.cerro.radio) y los carteles de zona (ACH.cerro.zones); ver más abajo. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  var CFG = {
    everyMin: 25, everyMax: 40, firstMin: 14, firstMax: 22,   // s entre carretillas (la primera llega antes) — nunca dos en menos de 25 s
    laneNear: 40, warnT: 1.5, v0: 40, acc: 95, vmax: 170,     // px, s, px/s, px/s², px/s
    hitR: 12, hitZ: 8, dmg: 18, push: 90, zDmg: 2, zKnock: 70, zR: 10,
    rollEvery: 0.3, brokenT: 14, maxBroken: 3, offscreen: 24,
    gasChance: 0.3, gasR: 50, gasDmg: 3, gasKnock: 90, gasPlayer: 12, chuzaGap: 12, chuzaN: 3, chuzaLaneR: 18, chuzaNear: 220,   // v0.13 T2 (C5)
    yells: ['¡AHÍ VOOOY!', '¡ABRAN CANCHA!', '¡SIN FRENOS, CAUSA!']
  };
  var C = { carts: [], broken: [], stats: { jumped: 0, hit: 0, crashed: 0, spawned: 0 }, CFG: CFG, timer: 0, lastAt: -1e9, worldId: null };

  function rand(a, b) { return a + Math.random() * (b - a); }
  function sfx(name, data) { var au = ACH.audio; if (au && au.emit) { try { au.emit(name, data); } catch (e) { /* nada */ } } }
  function say(id, who, x, y) { var au = ACH.audio; if (au && au.say) { try { au.say(id, { who: who, x: x, y: y }); } catch (e) { /* nada */ } } }
  function W() { return ACH.world; }
  function lanes() { var L = W() && W().lanes; return Array.isArray(L) ? L : []; }
  function laneById(id) { var L = lanes(); for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; }
  function prep(L) {   // largo acumulado por punto (world-cerro.js ya lo trae; otros mundos quizá no)
    if (L.s && L.s.length === L.pts.length && L.len) return L;
    var s = 0; L.s = [0];
    for (var k = 1; k < L.pts.length; k++) { s += Math.hypot(L.pts[k].x - L.pts[k - 1].x, L.pts[k].y - L.pts[k - 1].y); L.s.push(s); }
    L.len = s; return L;
  }
  function posAt(L, s) {
    var P = L.pts, S = L.s, k = 1;
    if (s <= 0) k = 1; else { while (k < P.length - 1 && S[k] < s) k++; }
    var a = P[k - 1], b = P[k], seg = Math.max(0.001, S[k] - S[k - 1]), t = Math.max(0, Math.min(1, (s - S[k - 1]) / seg));
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: (b.x - a.x) / seg, dy: (b.y - a.y) / seg };
  }
  function nearest(L, x, y) {   // punto del carril más cercano: {s, d}
    var P = L.pts, best = { s: 0, d: 1e9 };
    for (var k = 1; k < P.length; k++) {
      var a = P[k - 1], b = P[k], vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy || 1;
      var t = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / l2)), qx = a.x + vx * t, qy = a.y + vy * t;
      var d = Math.hypot(x - qx, y - qy);
      if (d < best.d) best = { s: L.s[k - 1] + t * Math.sqrt(l2), d: d };
    }
    return best;
  }
  function onScreen(G, x, y, m) {
    var V = ACH.render && ACH.render.VIEW, cam = G.cam; if (!V || !cam) return false;
    return x > cam.x - m && x < cam.x + V.w + m && y > cam.y - m && y < cam.y + V.h + m;
  }

  /* ---------------- aparición ---------------- */
  function spawnCart(laneId, G) {
    G = G || ACH.G;
    if (!G || !G.player) return null;
    var p = G.player, L = laneId ? laneById(laneId) : null, near = null;
    if (!L) {   // el carril más cercano a Alexander
      lanes().forEach(function (q) { prep(q); var n = nearest(q, p.x, p.y); if (!near || n.d < near.d) { near = n; L = q; } });
    }
    if (!L) return null;
    prep(L);
    var sp = near && L ? near.s : nearest(L, p.x, p.y).s, s0 = sp;
    // arriba del carril, fuera de cámara: se retrocede desde el punto de Alexander hasta salir de la vista
    while (s0 > 0 && onScreen(G, posAt(L, s0).x, posAt(L, s0).y, CFG.offscreen)) s0 -= 8;
    s0 = Math.max(0, s0 - 16);
    var kinds = ['senor', 'senora', 'escolar'], q0 = posAt(L, s0);
    var c = { lane: L, laneId: L.id, s: s0, v: 0, x: q0.x, y: q0.y, dx: q0.dx, dy: q0.dy, state: 'warn', t: 0, rollT: 0,
      kind: kinds[Math.floor(Math.random() * kinds.length)], alt: Math.floor(Math.random() * 4), hitZ: [], hitP: false, jumped: false, anim: 0,
      gas: Math.random() < CFG.gasChance };   // v0.13 T2 (C5): con balón de gas: revienta con el molotov o la tele
    C.carts.push(c); C.stats.spawned++; C.lastAt = G.time || 0;
    var yell = CFG.yells[Math.floor(Math.random() * CFG.yells.length)];
    if (ACH.hud && ACH.hud.toast) ACH.hud.toast(yell);
    sfx('carretilla.warn', { x: c.x, y: c.y, lane: L.id, t: CFG.warnT });
    say('carretilla', 'pasajero', c.x, c.y);
    return c;
  }

  /* ---------------- choque al final ---------------- */
  function crash(G, c, why) {
    if (c.state === 'crash') return;
    c.state = 'crash'; c.t = 0; C.stats.crashed++;
    sfx('carretilla.crash', { x: c.x, y: c.y, why: why || 'fin' });
    if (c.gas && (why === 'fuego' || why === 'knock')) gasBoom(G, c);
    if (c.chuza && c.hitZ.length >= CFG.chuzaN) { C.stats.chuzas = (C.stats.chuzas || 0) + 1; }
    if (ACH.ent && ACH.ent.emitNoise) ACH.ent.emitNoise(G, c.x, c.y, 140);
    C.broken.push({ x: Math.round(c.x), y: Math.round(c.y), flip: c.dx < 0, t: 0, alt: c.alt });
    while (C.broken.length > CFG.maxBroken) C.broken.shift();
    // el pasajero cae al suelo y sigue reptando; suelta lo que llevaba la carretilla
    if (ACH.ent && ACH.ent.makeZombie) {
      try {
        var ox = c.x - c.dx * 10, oy = c.y - c.dy * 10 + 4;
        if (W().collideCircle(ox, oy, 5)) { ox = c.x; oy = c.y; }
        var z = ACH.ent.makeZombie(c.kind === 'escolar' ? 'escolar' : 'caminante', ox, oy, { loco: 'gusano' });
        z.lootCart = true; z.fromCart = true;
        if (z.state !== 'muerto') { z.state = 'golpeado'; z.stunT = 0.6; z.kbx = c.dx * 60; z.kby = c.dy * 60; }
        G.zombies.push(z);
        if (ACH.inv && ACH.inv.drop) ACH.inv.drop(c.x, c.y, [{ id: Math.random() < 0.5 ? 'panChicharron' : 'anticucho', n: 1 }, Math.random() < 0.5 ? { id: 'gaseosa', n: 1 } : { id: 'sencillo', n: 3 }], false);
      } catch (e) { console.warn('[ACHORADO] cerro.crash', e); }
    }
    if (G.shake !== undefined && ACH.fx && ACH.fx.shake) { try { ACH.fx.shake(G, 3, 0.2); } catch (e2) { /* nada */ } }
  }
  function knock(c) {   // H3: la tele o el molotov la paran antes (el pasajero cae)
    if (typeof c === 'number') c = C.carts[c];
    if (!c || c.state === 'crash') return false;
    crash(ACH.G, c, 'knock'); return true;
  }

  /* ---------------- paso ---------------- */
  function update(G, dt) {
    var w = W();
    if (!w || !lanes().length) { if (C.carts.length) reset(); return; }
    if (C.worldId !== w.id) { reset(); C.worldId = w.id; }
    var p = G.player, i;
    try { radioUpdate(G, dt); zonesUpdate(G); } catch (eV) { console.warn('[ACHORADO] cerro radio/zonas', eV); }
    try { v13Update(G, dt); } catch (eV13) { if (!update.e13) { update.e13 = 1; console.warn('[ACHORADO] cerro v0.13', eV13); } }
    if (ACH.presidenta && ACH.presidenta.tick) { try { ACH.presidenta.tick(G, dt); } catch (eP) { if (!update.eP) { update.eP = 1; console.warn('[ACHORADO] presidenta.tick', eP); } } }
    // v0.13 T2 (C5): carretilla «chuza»: con 3 o más zombies juntos en un carril cerca de Alexander baja una (12 s entre carretillas)
    if (!C.carts.length && p && p.hp > 0 && (G.time || 0) - C.lastAt >= CFG.chuzaGap) {
      C.chuzaT = (C.chuzaT || 0) - dt;
      if (C.chuzaT <= 0) { C.chuzaT = 0.5; var cl = chuzaLane(G); if (cl) { var cc = spawnCart(cl.id, G); if (cc) { cc.chuza = true; C.timer = rand(CFG.everyMin, CFG.everyMax); } } }
    }
    // temporizador: solo cuenta si Alexander está cerca de un carril y no hay otra en curso
    if (!C.carts.length && p && p.hp > 0) {
      C.timer -= dt;
      if (C.timer <= 0) {
        var near = false;
        lanes().forEach(function (L) { prep(L); if (nearest(L, p.x, p.y).d <= CFG.laneNear) near = true; });
        if (near && (G.time || 0) - C.lastAt >= CFG.everyMin) { spawnCart(null, G); C.timer = rand(CFG.everyMin, CFG.everyMax); }
        else C.timer = 1;   // se vuelve a probar cada segundo
      }
    }
    for (i = C.carts.length - 1; i >= 0; i--) {
      var c = C.carts[i];
      c.t += dt; c.anim += dt;
      if (c.state === 'warn') {
        if (c.t >= CFG.warnT) { c.state = 'roll'; c.t = 0; c.v = CFG.v0; }
        continue;
      }
      if (c.state === 'crash') { C.carts.splice(i, 1); continue; }
      // rodar
      c.v = Math.min(CFG.vmax, c.v + CFG.acc * dt);
      c.s += c.v * dt;
      var q = posAt(c.lane, Math.min(c.s, c.lane.len));
      c.x = q.x; c.y = q.y; c.dx = q.dx; c.dy = q.dy;
      c.rollT -= dt;
      if (c.rollT <= 0) { c.rollT = CFG.rollEvery; sfx('carretilla.roll', { x: c.x, y: c.y, v: c.v }); }
      if (c.s >= c.lane.len) { crash(G, c, 'fin'); continue; }
      if (ACH.fuego && typeof ACH.fuego.inFire === 'function') { try { if (ACH.fuego.inFire(c.x, c.y)) { crash(G, c, 'fuego'); continue; } } catch (e) { /* nada */ } }
      // Alexander: la salta o se la come
      if (p && p.hp > 0 && !c.hitP) {
        var dx = p.x - c.x, dy = p.y - c.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < CFG.hitR) {
          if ((p.z || 0) >= CFG.hitZ) {
            if (!c.jumped) {
              c.jumped = true; C.stats.jumped++;
              ACH.hud.toast('¡OLÉ!');
              sfx('carretilla.jumped', { x: p.x, y: p.y });
              say('ole', 'alex', p.x, p.y);
            }
          } else if (!c.jumped || d < CFG.hitR * 0.6) {
            c.hitP = true; C.stats.hit++;
            if (ACH.ent && ACH.ent.hurtPlayer) ACH.ent.hurtPlayer(G, CFG.dmg, { push: { x: c.dx, y: c.dy, f: CFG.push }, src: 'carretilla', ignoreAir: true });
          }
        }
      }
      // atropella zombies
      for (var k = 0; k < G.zombies.length; k++) {
        var z = G.zombies[k];
        if (z.state === 'muerto' || z.social || c.hitZ.indexOf(z) >= 0) continue;
        var zx = z.x - c.x, zy = z.y - c.y;
        if (zx * zx + zy * zy > CFG.zR * CFG.zR) continue;
        c.hitZ.push(z);
        if (c.hitZ.length === CFG.chuzaN) { toast('¡CHUZAAA!'); sfx('carretilla.jumped', { x: c.x, y: c.y, chuza: true }); }   // v0.13 T2: tres de una
        var zl = Math.sqrt(zx * zx + zy * zy) || 1, nx = c.dx * 0.7 + zx / zl * 0.3, ny = c.dy * 0.7 + zy / zl * 0.3;
        var killed = ACH.ent.hitZombie(G, z, nx, ny, { dmg: CFG.zDmg, knock: CFG.zKnock, src: 'carretilla', from: { x: c.x - c.dx * 20, y: c.y - c.dy * 20 } });
        if (killed !== undefined && ACH.fx && ACH.fx.hit) { try { ACH.fx.hit(G, z, nx, ny, killed, true); } catch (e4) { /* nada */ } }
      }
    }
    for (i = C.broken.length - 1; i >= 0; i--) { C.broken[i].t += dt; if (C.broken[i].t > CFG.brokenT) C.broken.splice(i, 1); }
  }

  function reset() {
    C.carts.length = 0; C.broken.length = 0; C.timer = rand(CFG.firstMin, CFG.firstMax); C.lastAt = -1e9;
    C.stats.jumped = 0; C.stats.hit = 0; C.stats.crashed = 0; C.stats.spawned = 0;
    C.worldId = W() ? W().id : null;
  }

  /* ---------------- dibujo ---------------- */
  function dig(path) { var o = ACH.sprites; path.split('.').forEach(function (k) { o = o && o[k]; }); return o; }
  function isCv(o) { return o && typeof o.width === 'number' && o.width > 0 && typeof o.getContext === 'function'; }
  var ph = null;
  function cartSpr(alt, broken) {
    var S = dig('props.carretillaSuelta');
    if (isCv(S)) {
      if (broken && isCv(S.broken)) return S.broken;
      if (Array.isArray(S.alt) && isCv(S.alt[alt % S.alt.length])) return S.alt[alt % S.alt.length];
      return S;
    }
    if (!ph) {
      ph = document.createElement('canvas'); ph.width = 26; ph.height = 14;
      var g = ph.getContext('2d'); g.fillStyle = '#1c1a22'; g.fillRect(2, 2, 22, 8); g.fillStyle = '#5f6a74'; g.fillRect(3, 3, 20, 6);
      g.fillStyle = '#c9a03a'; g.fillRect(5, 1, 6, 3); g.fillRect(13, 1, 6, 3); g.fillStyle = '#1c1a22'; g.fillRect(4, 10, 4, 4); g.fillRect(18, 10, 4, 4);
      ph.ax = 13; ph.ay = 13;
    }
    return ph;
  }
  function seatSpr(kind, f, hurt) {
    var P = dig('zombie.pasajero');
    if (!P) return null;
    var set = hurt && P.hurt && P.hurt[kind] ? P.hurt[kind] : P[kind];
    var c = Array.isArray(set) ? set[f % set.length] : set;
    return isCv(c) ? c : null;
  }
  function blit(ctx, s, x, y, flip) {
    var ax = s.ax === undefined ? Math.floor(s.width / 2) : s.ax, ay = s.ay === undefined ? s.height - 1 : s.ay;
    if (!flip) { ctx.drawImage(s, Math.round(x - ax), Math.round(y - ay)); return; }
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(-1, 1); ctx.drawImage(s, -ax, -ay); ctx.restore();
  }
  function drawCart(ctx, c, cx, cy) {
    var flip = c.dx < -0.2, bob = c.state === 'roll' ? (Math.floor(c.anim * 14) % 2) : 0;
    var x = c.x - cx, y = c.y - cy - bob, s = cartSpr(c.alt, false);
    blit(ctx, s, x, y, flip);
    var P = dig('zombie.pasajero'), seat = (P && P.seat) || { x: 4, y: -11 }, ps = seatSpr(c.kind, Math.floor(c.anim * 6), false);
    var sx = x + (flip ? -seat.x : seat.x), sy = y + seat.y;
    if (c.gas) { var GB = ACH.cerroArte && ACH.cerroArte.balon(); if (GB) blit(ctx, GB, x + (flip ? 7 : -7), y - 6, flip); }   // v0.13 T2: balón de gas
    if (ps) blit(ctx, ps, sx, sy, flip);
    else { ctx.fillStyle = '#1c1a22'; ctx.fillRect(Math.round(sx) - 4, Math.round(sy) - 12, 8, 12); ctx.fillStyle = '#6f7a5e'; ctx.fillRect(Math.round(sx) - 3, Math.round(sy) - 11, 6, 10); }
  }
  function ysort(G) {
    var out = [], V = ACH.render && ACH.render.VIEW, i;
    C.carts.forEach(function (c) {
      if (c.state !== 'roll') return;
      if (V && !onScreen(G, c.x, c.y, 40)) return;
      out.push({ y: c.y, x: c.x, draw: function (ctx, cx, cy) { drawCart(ctx, c, cx, cy); } });
    });
    for (i = 0; i < C.broken.length; i++) (function (b) {
      if (V && !onScreen(G, b.x, b.y, 40)) return;
      out.push({ y: b.y, draw: function (ctx, cx, cy) { var a = b.t > CFG.brokenT - 1 ? Math.max(0, CFG.brokenT - b.t) : 1; ctx.globalAlpha = a; blit(ctx, cartSpr(b.alt, true), b.x - cx, b.y - cy, b.flip); ctx.globalAlpha = 1; } });
    })(C.broken[i]);
    return out;
  }
  // Aviso: flecha amarilla con «¡!» en el borde de la pantalla, del lado por donde viene (con el carril en esa columna/fila).
  function screen(ctx, G, cx, cy) {
    var V = ACH.render.VIEW;
    C.carts.forEach(function (c) {
      if (c.state !== 'warn' && !(c.state === 'roll' && c.t < 0.6)) return;
      var sx = c.x - cx, sy = c.y - cy, M = 12;
      if (sx > M && sx < V.w - M && sy > M && sy < V.h - M && c.state === 'roll') return;
      var ax = Math.max(M, Math.min(V.w - M, sx)), ay = Math.max(M + 2, Math.min(V.h - 30, sy));
      var ang = Math.atan2(sy - ay, sx - ax); if (sx === ax && sy === ay) ang = -Math.PI / 2;
      var pulse = (Math.floor(G.clock * 8) % 2) ? 1 : 0.75;
      ctx.save(); ctx.translate(Math.round(ax), Math.round(ay)); ctx.globalAlpha = pulse;
      ctx.save(); ctx.rotate(ang);
      ctx.fillStyle = '#131015'; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, -8); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd21e'; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
      var tx = Math.round(-Math.cos(ang) * 12), ty = Math.round(-Math.sin(ang) * 12);
      ctx.fillStyle = '#131015'; ctx.fillRect(tx - 5, ty - 6, 10, 12); ctx.fillStyle = '#ffd21e'; ctx.fillRect(tx - 4, ty - 5, 8, 10);
      ctx.fillStyle = '#131015'; ctx.fillRect(tx - 2, ty - 4, 1, 5); ctx.fillRect(tx - 2, ty + 2, 1, 1); ctx.fillRect(tx + 1, ty - 4, 1, 5); ctx.fillRect(tx + 1, ty + 2, 1, 1);
      ctx.restore();
    });
  }
  /* =====================================================================================================
     v0.13 (C4) · La radio a pilas de la ladera alta y los carteles de zona del Cerro.
       ACH.cerro.radio = { heard, near, busy, lines } — `heard` lo dejó escuchado: la primera vez E prende la radio (estática + noticiero con retrato, ACH.dialogo);
       después solo estática. El juego queda congelado mientras dura el noticiero (G.hitstop fijo desde el dibujo; la simulación no corre).
       ACH.cerro.zones = { shown, cur, show(id) } — al entrar a cada franja (world.zones) sale el cartel chicha 2,4 s, una vez por visita al nivel.
     ===================================================================================================== */
  var NEWS = [
    { quien: 'alexander', cara: 'habla', texto: 'Una radio a pilas, causa… a ver si todavía agarra algo.' },
    { quien: 'alexander', cara: 'sorpresa', texto: 'RADIO: «…kssshh… ¡ÚLTIMA HORA, amigos oyentes! Los muertos que caminan ya subieron hasta los cerros del Callao…»' },
    { quien: 'alexander', cara: 'sorpresa', texto: 'RADIO: «…pero ojo, ojo: corre un rumor por toda Lima. Una cura. Dicen que en Miraflores…»' },
    { quien: 'alexander', cara: 'feliz', texto: 'RADIO: «…un laboratorio cerca del parque. Las autoridades no confirman nada… kzzt… krrrr…»' },
    { quien: 'alexander', cara: 'feliz', texto: '¿Una cura? ¿En Miraflores? Ese es distrito pituco, pero si hay cura… ahí voy. ¿Escuchaste, Titina?' }
  ];
  var RD = { heard: false, near: false, busy: false, line: -1, waveT: 0, lines: NEWS, touched: 0 };
  var ZN = { cur: null, shown: {}, el: null, pend: null };
  C.radio = RD; C.zones = ZN;

  function toast(t) { if (ACH.hud && ACH.hud.toast) { try { ACH.hud.toast(t); } catch (e) { /* nada */ } } }
  function radioPos() { var w = W(); return w && w.radio ? w.radio : null; }
  function nearRadio(G) {
    var rd = radioPos(), p = G && G.player; if (!rd || !p || p.hp <= 0) return false;
    var dx = p.x - rd.x, dy = p.y - (rd.y - 4);
    return dx * dx + dy * dy <= (rd.r || 26) * (rd.r || 26);
  }
  function endRadio(G) {
    RD.busy = false; RD.line = -1; RD.waveT = 1.2;
    if (G) G.hitstop = 0;
    var rd = radioPos(); sfx('radio.static', { x: rd ? rd.x : undefined, y: rd ? rd.y : undefined, dur: 0.7 });
    try { if (ACH.input && ACH.input.reset) ACH.input.reset(); } catch (e) { /* nada */ }
  }
  function startRadio(G) {
    var rd = radioPos(), D = ACH.dialogo;
    if (!RD.heard) {
      RD.heard = true;
      try { if (ACH.partida && ACH.partida.flag) ACH.partida.flag('cerro.radio', true); } catch (eF) { /* nada */ }   // v0.13 fix: CONTINUAR no repite el noticiero
      if (D && typeof D.play === 'function') {
        RD.busy = true; RD.line = -1; RD.waveT = 99; G.hitstop = Math.max(G.hitstop || 0, 2);
        var ok = false;
        try { ok = D.play(NEWS, { onDone: function () { endRadio(ACH.G); } }); } catch (e) { ok = false; console.warn('[ACHORADO] radio dialogo', e); }
        if (!ok) endRadio(G);
      } else {   // sin dialogo.js: el rumor va en avisos
        sfx('radio.static', { x: rd.x, y: rd.y, tune: true, dur: 1.2 }); RD.waveT = 3;
        toast('RADIO: «…una cura… en Miraflores… un laboratorio cerca del parque… kzzt…»');
      }
      return;
    }
    RD.touched++; RD.waveT = 1.6;
    sfx('radio.static', { x: rd.x, y: rd.y, tune: true, dur: 1.5 });
    toast(RD.touched % 2 ? 'Puro ruido… la señal se fue.' : 'Solo estática. Ya escuchaste lo importante.');
  }
  function radioUpdate(G, dt) {
    if (RD.waveT > 0 && !RD.busy) RD.waveT = Math.max(0, RD.waveT - dt);
    RD.near = false;
    if (RD.busy || !G.player || G.state !== 'playing') return;
    if (!nearRadio(G) || G.player.held) return;
    RD.near = true;
    var In = ACH.input;
    if (In && In.pressed && In.pressed('KeyE') && !(ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active())) {
      if (In.consume) In.consume('KeyE');
      startRadio(G);
    }
  }
  // sonido atado a la línea del noticiero (se lee desde el dibujo: el juego está congelado y no corre update)
  function radioLineSfx(i) {
    if (i === 0) sfx('radio.static', { tune: true, dur: 1.3 });
    else if (i === 1) { sfx('radio.news', {}); sfx('radio.static', { dur: 0.7 }); }
    else if (i === 2) sfx('radio.static', { dur: 0.4 });
    else if (i === 3) sfx('radio.static', { dur: 1.6 });
    RD.waveT = 99;
  }

  function zoneAt(w, row) {
    var zs = w.zones || [];
    for (var i = 0; i < zs.length; i++) if (row >= zs[i].rows[0] && row <= zs[i].rows[1]) return zs[i];
    return null;
  }
  var styled = false;
  function zoneStyle() {
    if (styled) return; styled = true;
    var st = document.createElement('style');
    st.textContent =
      '#zonaCartel{position:absolute;right:calc(var(--u)*10);top:calc(var(--u)*26);z-index:6;pointer-events:none;display:none;text-align:center;transform:rotate(2.5deg);' +
      'background:#131015;border:calc(var(--u)*1.5) solid #ff2e88;box-shadow:calc(var(--u)*2) calc(var(--u)*2) 0 #1fe07a;padding:calc(var(--u)*3) calc(var(--u)*8) calc(var(--u)*4);max-width:60%}' +
      '#zonaCartel.on{display:block;animation:zcIn 2.4s ease-out forwards}' +
      '#stage.zc-on #toasts{right:calc(var(--u)*72)}' +   // v0.13 cierre (B6): con el cartel a la vista, los toasts se corren a la izquierda
      'body[data-state="paused"] #zonaCartel,body[data-state="dead"] #zonaCartel{animation-play-state:paused;visibility:hidden}' +
      '#zonaCartel .k{display:block;font-family:var(--pixel);font-size:calc(var(--u)*4.5);letter-spacing:.2em;color:#4aa8ff;margin-bottom:calc(var(--u)*1.5)}' +
      '#zonaCartel .a{display:block;font-family:var(--display);font-size:calc(var(--u)*11);line-height:1;color:#ffe500;white-space:nowrap;' +
      'text-shadow:calc(var(--u)*1) calc(var(--u)*1) 0 #ff2e88,calc(var(--u)*2) calc(var(--u)*2) 0 #131015}' +
      '#zonaCartel i{position:absolute;width:calc(var(--u)*14);height:calc(var(--u)*4.5);background:rgba(226,214,170,.78);top:calc(var(--u)*-2.5)}' +
      '#zonaCartel i.l{left:calc(var(--u)*-4);transform:rotate(-24deg)}#zonaCartel i.r{right:calc(var(--u)*-4);transform:rotate(20deg)}' +
      '@keyframes zcIn{0%{opacity:0;transform:translateX(40%) rotate(2.5deg)}9%{opacity:1;transform:translateX(-3%) rotate(2.5deg)}13%{transform:translateX(0) rotate(2.5deg)}' +
      '80%{opacity:1;transform:translateX(0) rotate(2.5deg)}100%{opacity:0;transform:translateY(-8%) rotate(2.5deg)}}' +
      '@media (max-aspect-ratio:4/3){#zonaCartel .a{font-size:calc(var(--u)*8)}}';
    document.head.appendChild(st);
  }
  function cartelEl() {
    if (ZN.el) return ZN.el;
    var stage = document.getElementById('stage'); if (!stage) return null;
    zoneStyle();
    var d = document.createElement('div'); d.id = 'zonaCartel'; d.setAttribute('role', 'status'); d.setAttribute('aria-live', 'polite');
    d.innerHTML = '<i class="l"></i><i class="r"></i><span class="k"></span><span class="a"></span>';
    d.addEventListener('animationend', function () { d.classList.remove('on'); stage.classList.remove('zc-on'); });
    stage.appendChild(d);
    ZN.el = d;
    return d;
  }
  function toastsBusy() { var t = document.getElementById('toasts'); return !!(t && t.children.length); }
  function showZone(z, force) {
    ZN.shown[z.id] = true;
    var d = cartelEl(); if (!d) return false;
    if (!force && toastsBusy()) { ZN.pend = z; return true; }   // v0.13 cierre (B6): el cartel espera a que se vayan los toasts (subida de nivel, recompensas)
    ZN.pend = null;
    var stg = document.getElementById('stage'); if (stg) stg.classList.add('zc-on');
    d.querySelector('.k').textContent = z.kicker || '';
    d.querySelector('.a').textContent = z.name;
    d.classList.remove('on'); void d.offsetWidth; d.classList.add('on');
    sfx('zona.cartel', { zone: z.id });
    return true;
  }
  function zonesUpdate(G) {
    var w = W(), p = G.player; if (!w || !w.zones || !p || p.hp <= 0) return;
    if (ZN.pend && !toastsBusy()) showZone(ZN.pend, true);
    var row = Math.floor(p.y / (w.T || 16)), z = zoneAt(w, row);
    if (!z) return;
    if (ZN.cur && ZN.cur.id !== z.id && z.rows[1] - z.rows[0] >= 2 && (row === z.rows[0] || row === z.rows[1])) return;   // histéresis: hay que entrar una fila en la franja nueva
    if (!ZN.cur || ZN.cur.id !== z.id) { ZN.cur = z; if (!ZN.shown[z.id]) showZone(z); }
  }
  ZN.show = function (id) { var w = W(), zs = (w && w.zones) || [], i; for (i = 0; i < zs.length; i++) if (zs[i].id === id) return showZone(zs[i]); return false; };
  function zonesReset() { ZN.cur = null; ZN.shown = {}; ZN.pend = null; if (ZN.el) ZN.el.classList.remove('on'); var sg = document.getElementById('stage'); if (sg) sg.classList.remove('zc-on'); }

  // dibujo (en pantalla): aviso «E», ondas de la radio, y el congelado del noticiero
  function radioScreen(ctx, G, cx, cy) {
    var rd = radioPos(); if (!rd) return;
    if (RD.busy) {
      var D = ACH.dialogo, st = D && D.state && D.state();
      if (!st) endRadio(G);   // el diálogo se cerró por fuera (debug, otro diálogo encima)
      else if (st.i !== RD.line) { RD.line = st.i; radioLineSfx(st.i); }
      if (RD.busy) G.hitstop = Math.max(G.hitstop || 0, 1);
    }
    var sx = Math.round(rd.x) - cx, sy = Math.round(rd.y) - cy, i;
    if (sx < -40 || sx > ACH.render.VIEW.w + 40 || sy < -60 || sy > ACH.render.VIEW.h + 40) return;
    if (RD.waveT > 0 || RD.busy) {   // ondas que salen de la antena
      var ph = (G.clock * 2.2) % 1;
      ctx.save();
      for (i = 0; i < 3; i++) {
        var q = (ph + i / 3) % 1;
        ctx.globalAlpha = (1 - q) * 0.85; ctx.strokeStyle = i % 2 ? '#ffe500' : '#ff2e88'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(sx + 6, sy - 21, 3 + q * 9, -Math.PI * 0.85, -Math.PI * 0.1); ctx.stroke();
      }
      if (Math.floor(G.clock * 7) % 2) { ctx.globalAlpha = 1; ctx.fillStyle = '#ffe500'; ctx.fillRect(sx + 2, sy - 13, 1, 1); }
      ctx.restore();
    }
    if (RD.near && !RD.busy && G.state === 'playing' && !(ACH.touch && ACH.touch.on)) {
      var s = RD.heard ? 'E sintonizar' : 'E prender la radio', by = sy - 31;
      ctx.save();
      ctx.font = '8px Silkscreen, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var w = Math.ceil(ctx.measureText(s).width) + 6;
      ctx.globalAlpha = 0.82; ctx.fillStyle = '#131015'; ctx.fillRect(sx - (w >> 1), by - 5, w, 10);
      ctx.globalAlpha = 1; ctx.fillStyle = '#ff2e88'; ctx.fillRect(sx - (w >> 1), by + 5, w, 1);
      ctx.fillStyle = '#f2f2f2'; ctx.fillText(s, sx, by);
      ctx.fillStyle = '#ffe500'; ctx.fillText('E', sx - (w >> 1) + 3 + Math.ceil(ctx.measureText('E').width / 2) - 0.5, by);
      ctx.restore();
    }
  }
  function wrapContext() {   // botón de acción táctil: PRENDER junto a la radio (vendedores.js envuelve después y respeta esta cadena)
    var A = ACH.armas; if (!A || typeof A.context !== 'function' || A.context._cerroRadio) return;
    var orig = A.context;
    A.context = function () { if (RD.near && !RD.busy) return { label: RD.heard ? 'SINTONIZAR' : 'PRENDER', code: 'KeyE' }; if (OL.near) return { label: 'PEDIR PLATO', code: 'KeyE' }; return orig.apply(this, arguments); };
    A.context._cerroRadio = true;
  }

  /* =====================================================================================================
     v0.13 T2 (agente CE): C3 la olla común y el encargo de Doña Meche · C5 carretillas de gas y «chuza», nido de gallinazos · C2 aviso del huaico.
       ACH.cerro.olla  = { near, plates, lastPlate, prov, provT, meche }   E junto al fogón (si no peleaste ahí en 90 s): plato +25 cada 90 s.
                         La primera vez te dan además 3 táperes «para la Meche».
       ACH.cerro.meche = { st: 'none' | 'pedido' | 'hecho' }   Doña Meche (bodeguita junto a la cisterna) pide 3 táperes de la olla común;
                         paga 1 molotov y un lamparín para el cuarto. Bandera de partida 'cerro.meche' (CONTINUAR no lo repite).
       ACH.cerro.nido  = { n, done }   espantar o tumbar 3 gallinazos cerca del nido del basural lo deja solo: suelta botín.
     ===================================================================================================== */
  var OL = { near: false, plates: 0, lastPlate: -1e9, prov: 0, provT: -1e9, meche: false, msgT: -1e9 };
  var ME = { st: 'none', busy: false, warnT: -1e9 };
  var NI = { n: 0, done: false };
  var HU = { told: {} };
  var OLLA = { plateEvery: 90, calmT: 90, heal: 25, r: 34, encargo: 3 };
  C.olla = OL; C.meche = ME; C.nido = NI;

  function inv() { return ACH.inv; }
  function flagP(k, v) { var P = ACH.partida; if (!P || typeof P.flag !== 'function') return undefined; try { return v === undefined ? (P.continuando && P.continuando() ? P.flag(k) : undefined) : P.flag(k, v); } catch (e) { return undefined; } }
  function give(G, id, n) {
    var I = inv(); if (!I || !I.add) return;
    var left = I.add(id, n); if (left > 0 && I.drop && G && G.player) I.drop(G.player.x, G.player.y + 6, [{ id: id, n: left }], false);
  }
  function dlgOn() { return !!(ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active()); }
  var frozen = false;
  function freezeOn(G, on) {
    if (on) { if (G.state === 'playing') { G.state = 'cine'; if (ACH.hud && ACH.hud.setState) ACH.hud.setState('cine'); frozen = true; } }
    else if (frozen) { frozen = false; var g = ACH.G; if (g && g.state === 'cine') { g.state = 'playing'; if (ACH.hud && ACH.hud.setState) ACH.hud.setState('playing'); } if (ACH.input && ACH.input.reset) ACH.input.reset(); }
  }
  function talk(G, lines, cb) {
    var D = ACH.dialogo, done = false, end = function () { if (done) return; done = true; freezeOn(ACH.G, false); if (cb) cb(); };
    freezeOn(G, true);
    if (D && typeof D.play === 'function') { try { if (D.play(lines, { onDone: end }) !== false) return; } catch (e) { /* cae a avisos */ } }
    lines.forEach(function (l) { toast(l.texto); }); setTimeout(end, 30);
  }
  function ollaGroup() { var S = ACH.social; if (!S || !S.senoraGroups) return null; var gs = S.senoraGroups(); for (var i = 0; i < gs.length; i++) if (gs[i].kind === 'olla') return gs[i]; return null; }
  function ollaUpdate(G) {
    var w = W(), o = w.ollaComun, p = G.player; OL.near = false;
    if (!o || !p || p.hp <= 0) return;
    var g = ollaGroup();
    if (g && g.provokes > OL.prov) { OL.prov = g.provokes; OL.provT = G.time; }
    if (g && g.mode === 'angry') OL.provT = G.time;
    if (!g || g.mode === 'gone') return;
    if (Math.hypot(p.x - o.x, p.y - o.y) > OLLA.r || p.held || G.state !== 'playing') return;
    OL.near = true;
    var In = ACH.input;
    if (!(In && In.pressed && In.pressed('KeyE')) || dlgOn()) return;
    if (In.consume) In.consume('KeyE');
    if (g.mode !== 'calm' || G.time - OL.provT < OLLA.calmT) { toast('«Aquí no se pelea, jovencito. Cuando te calmes, conversamos.»'); return; }
    var wait = OLLA.plateEvery - (G.time - OL.lastPlate);
    if (wait > 0) { toast('«Ya comiste, hijito. La olla sigue al fuego: vuelve en ' + Math.ceil(wait) + ' s.»'); return; }
    OL.lastPlate = G.time; OL.plates++;
    var hm = p.hpMax || (ACH.ent && ACH.ent.CFG.hpMax) || 100; p.hp = Math.min(hm, p.hp + OLLA.heal);
    sfx('eat', { x: p.x, y: p.y, id: 'taper' }); sfx('rest', { x: o.x, y: o.y, label: 'Olla común' });
    if (!OL.meche && ME.st !== 'hecho') {
      OL.meche = true; give(G, 'taper', OLLA.encargo);
      talk(G, [
        { quien: 'olla', cara: 'feliz', texto: 'Siéntate, hijito, que aquí a nadie se le niega un plato. Come, come.' },
        { quien: 'alexander', cara: 'feliz', texto: '¡Gracias, señito! Esto sí es dignidad, Titina. (+' + OLLA.heal + ')' },
        { quien: 'olla', cara: 'serio', texto: 'Y llévale estos tres táperes a la Meche, la de la bodeguita junto a la cisterna. No baja hace días.' }
      ], function () { if (ME.st === 'none' && ACH.objetivo) { try { ACH.objetivo.set('Lleva los 3 táperes a Doña Meche (bodeguita junto a la cisterna)'); } catch (e) { /* nada */ } } });
    } else toast('Un plato de la olla común: +' + OLLA.heal + ' de vida. ¡Gracias, señito!');
  }
  function mechePos() { var V = ACH.vendedores; if (!V || !V.list) return null; var L = V.list(); for (var i = 0; i < L.length; i++) if (L[i].id === 'meche') return L[i]; return null; }
  function mecheUpdate(G) {
    if (ME.st === 'hecho' || dlgOn() || G.state !== 'playing') return;
    var m = mechePos(), p = G.player; if (!m || !p || p.hp <= 0) return;
    var d = Math.hypot(p.x - m.x, p.y - m.y), I = inv(), have = I && I.count ? I.count('taper') : 0;
    if (d > 44) return;
    if (ACH.tienda && ACH.tienda.isOpen && ACH.tienda.isOpen()) return;
    if (have >= OLLA.encargo) { deliver(G, ME.st === 'none'); return; }
    if (ME.st === 'none') {
      ME.st = 'pedido';
      talk(G, [
        { quien: 'meche', cara: 'sorpresa', texto: '¡Hijito! ¿Bajaste por la olla común? Hace días que no como nada caliente.' },
        { quien: 'meche', cara: 'habla', texto: 'Tráeme tres táperes de la olla, ¿ya? Te pago con algo que te va a servir… para los muertos y para tu cuartito.' },
        { quien: 'alexander', cara: 'habla', texto: 'Hecho, Doña Meche. Tres táperes de la olla común.' }
      ], function () { if (ACH.objetivo) { try { ACH.objetivo.set('Trae 3 táperes de la olla común a Doña Meche'); } catch (e) { /* nada */ } } });
    }
  }
  function deliver(G, first) {
    var I = inv(); if (!I || !I.take) return;
    ME.st = 'hecho'; flagP('cerro.meche', true);
    I.take('taper', OLLA.encargo);
    give(G, 'molotov', 1);
    var B = ACH.base, ok = false; if (B && B.give) { try { ok = B.give('lamparin', 1) !== false; } catch (e) { ok = false; } }
    var lines = [];
    if (first) lines.push({ quien: 'meche', cara: 'sorpresa', texto: '¿Y esos táperes? ¿De la olla común? ¡Ay, hijito, me leíste el pensamiento!' });
    lines.push({ quien: 'meche', cara: 'feliz', texto: 'Toma: un molotov que armó mi finado para el huaico del 98, y un lamparín para tu cuarto. Que Dios te bendiga.' });
    lines.push({ quien: 'alexander', cara: 'feliz', texto: '¡Gracias, Doña Meche! Con esto subo hasta la cruz.' + (ok ? ' (El lamparín va a tu cuarto.)' : '') });
    talk(G, lines, function () { toast('ENCARGO CUMPLIDO: +1 MOLOTOV' + (ok ? ' · LAMPARÍN AL CUARTO' : '')); if (ACH.objetivo) { try { ACH.objetivo.set('Sube hasta la cruz de la cima'); } catch (e) { /* nada */ } } });
  }
  function nidoScare(b) {
    var w = W(), q = w && w.nido; if (!q || NI.done) return;
    if (Math.hypot(b.x - q.x, b.y - q.y) > q.r) return;
    NI.n++;
    if (NI.n >= 3) {
      NI.done = true;
      var I = inv(); if (I && I.drop) { try { I.drop(q.x, q.y + 8, [{ id: 'sencillo', n: 6 }, { id: 'gasolina', n: 1 }, { id: 'trapo', n: 1 }, { id: 'cuerdas', n: 1 }], true); } catch (e) { /* nada */ } }
      toast('¡El nido de gallinazos quedó solo! Hay cachina brillante adentro');
      sfx('fridge.open', { x: q.x, y: q.y });
    } else toast('Nido de gallinazos: ' + NI.n + '/3 espantados');
  }
  function huaicoUpdate(G) {
    var w = W(), hs = w.huaicos, p = G.player; if (!hs || !p) return;
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i]; if (HU.told[i]) continue;
      if (Math.abs(p.x - h.x) < 70 && p.y > h.y - 10 && p.y < h.y + 70) {
        HU.told[i] = true;
        toast('¡Huaico! La escalera está tapada: sube por el zigzag');
        if (ACH.tuto && ACH.tuto.vez) { try { ACH.tuto.vez('cerro.huaico', 'Escalera tapada: sigue la trocha en zigzag'); ACH.tuto.hecho('cerro.huaico'); } catch (e) { /* nada */ } }
      }
    }
  }
  function v13Update(G, dt) {
    if (!W() || W().id !== 'cerro') return;
    if (!v13Update.init || G.time < v13Update.lastT - 1e-6) {
      v13Update.init = true;
      OL.plates = 0; OL.lastPlate = -1e9; OL.prov = 0; OL.provT = -1e9; OL.meche = false; NI.n = 0; NI.done = false; HU.told = {};
      ME.st = flagP('cerro.meche') ? 'hecho' : 'none';
    }
    v13Update.lastT = G.time;
    if (ACH.aves && ACH.aves.onScare !== nidoScare) ACH.aves.onScare = nidoScare;
    ollaUpdate(G); mecheUpdate(G); huaicoUpdate(G);
  }
  function gasBoom(G, c) {
    var R0 = CFG.gasR, p = G.player, i;
    sfx('prop.break.car', { x: c.x, y: c.y, gas: true });
    toast('¡BUUUM! ¡El balón de gas!');
    if (ACH.fx && ACH.fx.shake) { try { ACH.fx.shake(G, 5, 0.35); } catch (e) { /* nada */ } }
    if (ACH.ent && ACH.ent.emitNoise) ACH.ent.emitNoise(G, c.x, c.y, 220);
    for (i = 0; i < G.zombies.length; i++) {
      var z = G.zombies[i]; if (z.state === 'muerto' || z.social) continue;
      var dx = z.x - c.x, dy = z.y - c.y, d = Math.sqrt(dx * dx + dy * dy); if (d > R0) continue;
      var nx = dx / (d || 1), ny = dy / (d || 1);
      try { ACH.ent.hitZombie(G, z, nx, ny, { dmg: CFG.gasDmg, knock: CFG.gasKnock, src: 'gas', from: { x: c.x, y: c.y } }); } catch (e2) { /* nada */ }
    }
    if (p && p.hp > 0 && Math.hypot(p.x - c.x, p.y - c.y) < R0 && ACH.ent && ACH.ent.hurtPlayer) {
      var pl = Math.hypot(p.x - c.x, p.y - c.y) || 1;
      ACH.ent.hurtPlayer(G, CFG.gasPlayer, { push: { x: (p.x - c.x) / pl, y: (p.y - c.y) / pl, f: 70 }, src: 'gas', ignoreAir: true, from: { x: c.x, y: c.y } });
    }
    if (ACH.aves && ACH.aves.hitCircle) { try { ACH.aves.hitCircle(G, c.x, c.y, R0, 40, 2, 'fire'); } catch (e3) { /* nada */ } }
    if (ACH.fuego && ACH.fuego.ignite) { try { ACH.fuego.ignite(c.x, c.y, 24, 3); } catch (e4) { /* nada */ } }
    C.stats.booms = (C.stats.booms || 0) + 1;
  }
  function chuzaLane(G) {
    var p = G.player, best = null;
    lanes().forEach(function (L) {
      prep(L); if (nearest(L, p.x, p.y).d > CFG.laneNear * 2) return;
      var n = 0;
      for (var i = 0; i < G.zombies.length; i++) {
        var z = G.zombies[i]; if (z.state === 'muerto' || z.social || z.presi) continue;
        if (Math.hypot(z.x - p.x, z.y - p.y) > CFG.chuzaNear) continue;
        if (nearest(L, z.x, z.y).d <= CFG.chuzaLaneR) n++;
      }
      if (n >= CFG.chuzaN && (!best || n > best.n)) best = { id: L.id, n: n };
    });
    return best;
  }
  function v13Ysort(G) {
    var out = [], w = W(); if (!w || w.id !== 'cerro') return out;
    var A = ACH.cerroArte; if (!A) return out;
    var q = w.nido;
    if (q && onScreen(G, q.x, q.y, 40)) out.push({ y: q.y, draw: function (ctx, cx, cy) { var s = A.nido(NI.done); blit(ctx, s, q.x - cx, q.y - cy, false); } });
    (w.huaicos || []).forEach(function (h) {
      if (!onScreen(G, h.x, h.y, 60)) return;
      out.push({ y: h.y, draw: function (ctx, cx, cy) { blit(ctx, A.cartel('¡HUAICO!\nSUBE X EL ZIGZAG'), h.x - 16 - cx, h.y - cy, false); } });
    });
    return out;
  }
  function v13Screen(ctx, G, cx, cy) {
    var w = W(), o = w && w.ollaComun; if (!o || !OL.near || G.state !== 'playing' || (ACH.touch && ACH.touch.on)) return;
    var s = 'E pedir un plato', sx = Math.round(o.x) - cx, by = Math.round(o.y) - cy - 30;
    ctx.save(); ctx.font = '8px Silkscreen, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var tw = Math.ceil(ctx.measureText(s).width) + 6;
    ctx.globalAlpha = 0.82; ctx.fillStyle = '#131015'; ctx.fillRect(sx - (tw >> 1), by - 5, tw, 10);
    ctx.globalAlpha = 1; ctx.fillStyle = '#1fe07a'; ctx.fillRect(sx - (tw >> 1), by + 5, tw, 1); ctx.fillStyle = '#f2f2f2'; ctx.fillText(s, sx, by);
    ctx.restore();
  }

  // render.js y game.js crean estos mismos arreglos con `||`: el que carga primero los pone
  var H = ACH.drawHooks = ACH.drawHooks || { ground: [], ysort: [], air: [], screen: [] };
  H.ysort.push(ysort); H.screen.push(screen); H.screen.push(radioScreen); H.ysort.push(v13Ysort); H.screen.push(v13Screen);
  (ACH.levelHooks = ACH.levelHooks || []).push(function (id) { reset(); zonesReset(); RD.busy = false; RD.waveT = 0; if (id && id !== 'cerro') RD.heard = false; if (id === 'cerro') { try { var PP = ACH.partida; if (PP && PP.continuando && PP.continuando() && PP.flag('cerro.radio')) RD.heard = true; } catch (eR) { /* nada */ } } v13Update.init = false; if (frozen) freezeOn(ACH.G, false); });
  wrapContext();

  C.spawnCart = function (laneId) { return spawnCart(laneId, ACH.G); };
  C.update = update; C.reset = reset; C.knock = knock;
  ACH.cerro = C;
  reset();

  // Debug: ACH.debug.carretilla(laneId?) → fuerza una carretilla (en el carril más cercano si no se dice cuál)
  ACH.debug = ACH.debug || {};
  ACH.debug.carretilla = function (laneId) {
    var c = spawnCart(laneId, ACH.G);
    return c ? { lane: c.laneId, x: Math.round(c.x), y: Math.round(c.y), kind: c.kind } : null;
  };
})();
