/* ACHORADO — js/engine/fuego.js (v0.9, H3): el fuego del molotov, las quemaduras y el agua que lo apaga.
   API (ACH.fuego):
     zones[]                    {x, y, r, t, life} zonas de fuego vivas (solo en el suelo; las casas no se queman)
     ignite(x, y, r=34, t=5)    → zona | null (null si cae en un charco: se apaga con un siseo)
     extinguish(x, y, r)        → n apagadas: zonas, zombies y Alexander quemándose dentro de r (baldazo, charco, cilindro roto, agua)
     puddle(x, y, r, t)         charco que apaga lo que cae encima (cilindro roto; las señoras también pueden usarlo)
     burnZombie(z, t=4)         lo deja quemándose t s (z.burnT): 0,6 de daño por segundo, llamas encima y corre desorientado (entities.js)
     inFire(x, y) → bool        ¿(x, y) está dentro de una zona? (cerro.js: la carretilla que entra al fuego se voltea)
     update(G, dt)              la llama game.js cada paso (también muerto)        reset()
   Daño: zona → zombie 1/s y queda quemándose 4 s; quemándose 0,6/s y contagia al que toca (30 %/s); Alexander en la zona 4/s
   (salvo en el aire, p.z > 6) y queda quemándose 1,5 s (2/s); mojado (p.wetT > 0) no se quema. Gallinazos con z < 30 que cruzan → ACH.aves.burn.
   Bolsas dentro de la zona se queman: se rompen y echan una columna de humo 15 s. Ruido 160 al prender (y cada 2 s): atrae zombies.
   Dibujo: ACH.drawHooks.ground (charcos, piso chamuscado), .ysort (llamas, zombies en llamas, Alexander quemándose o mojado), .air (humo).
   Debug: ACH.debug.fire(x, y). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  var CFG = {
    r: 34, t: 5, maxZones: 6,
    zoneDps: 1, burnT: 4, burnDps: 0.6, spreadP: 0.3, spreadR: 10,
    pDps: 4, pBurnT: 1.5, pBurnDps: 2, pChunk: 2, safeZ: 6,
    noise: 160, noiseEvery: 2, birdZ: 30,
    lightEvery: 0.1, lightK: 2.3, lightCol: '#ff8a30',
    smokeEvery: 0.16, smokeMax: 70, smokeLife: 2.4, columnT: 15, columnEvery: 0.28,
    propEvery: 0.5, screamCD: 0.8
  };

  var zones = [], puddles = [], columns = [], smoke = [];
  var propT = 0, screamAt = -1e9;

  function sfx(name, data) { var au = ACH.audio; if (au && au.emit) { try { au.emit(name, data); } catch (e) { /* nada */ } } }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function d2(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; }
  function clock() { var G = ACH.G; return G ? G.clock || 0 : 0; }
  function noise(G, x, y, r) { if (ACH.ent && ACH.ent.emitNoise) ACH.ent.emitNoise(G, x, y, r); }
  function fxText(x, y, s, c) { if (ACH.fx && ACH.fx.text) ACH.fx.text(x, y, s, c); }

  /* ---------------- Zonas ---------------- */
  function inPuddle(x, y) {
    for (var i = 0; i < puddles.length; i++) { var q = puddles[i]; if (d2(x, y, q.x, q.y) < q.r * q.r) return q; }
    var S = ACH.senoras;   // charcos de los baldes de las señoras (H2)
    if (S && typeof S.puddleAt === 'function') { try { if (S.puddleAt(x, y)) return true; } catch (e) { /* nada */ } }
    return null;
  }
  function makeFlames(z) {
    var n = Math.round(4 + z.r * z.r / 160), out = [];
    for (var i = 0; i < n; i++) {
      var a = rand(0, Math.PI * 2), k = i === 0 ? 0 : Math.sqrt(Math.random()) * 0.82, dx = Math.cos(a) * z.r * k, dy = Math.sin(a) * z.r * k;
      out.push({ dx: dx, dy: dy, sz: k < 0.35 ? 2 : (k < 0.65 ? 1 : 0), ph: Math.floor(rand(0, 4)), sp: rand(8, 12), item: null });
    }
    out.sort(function (a, b) { return a.dy - b.dy; });
    return out;
  }
  function ignite(x, y, r, t) {
    var G = ACH.G; r = r || CFG.r; t = t || CFG.t;
    var pd = inPuddle(x, y);
    if (pd) { sfx('fire.out', { x: x, y: y }); steam(x, y, 6); fxText(x, y - 14, '¡PSSS!', '#bfe0ea'); return null; }
    for (var i = 0; i < zones.length; i++) {   // otra botella sobre el mismo fuego: lo aviva
      var o = zones[i];
      if (d2(x, y, o.x, o.y) < (o.r * 0.5) * (o.r * 0.5)) { o.t = Math.max(o.t, t); o.life = Math.max(o.life, o.t); return o; }
    }
    var z = { x: x, y: y, r: r, t: t, life: t, lt: 0, nt: CFG.noiseEvery, st: 0, loop: null, flames: null, ph: rand(0, 6) };
    z.flames = makeFlames(z);
    zones.push(z);
    while (zones.length > CFG.maxZones) killZone(zones[0], false);
    if (G) noise(G, x, y, CFG.noise);
    sfx('fire.whoosh', { x: x, y: y });
    var au = ACH.audio;
    if (au && typeof au.loop === 'function') { try { z.loop = au.loop('fire.loop', { x: x, y: y, intensity: 1 }); } catch (e) { z.loop = null; } }
    propT = 0;   // las bolsas de adentro arden al tiro
    return z;
  }
  function killZone(z, hiss) {
    var i = zones.indexOf(z); if (i >= 0) zones.splice(i, 1);
    if (z.loop) { try { z.loop.stop(); } catch (e) { /* nada */ } z.loop = null; }
    if (hiss) { sfx('fire.out', { x: z.x, y: z.y }); steam(z.x, z.y, 8); }
  }
  function inFire(x, y) {
    for (var i = 0; i < zones.length; i++) { var z = zones[i]; if (d2(x, y, z.x, z.y) < z.r * z.r) return true; }
    return false;
  }
  function zoneAt(x, y) {
    for (var i = 0; i < zones.length; i++) { var z = zones[i]; if (d2(x, y, z.x, z.y) < z.r * z.r) return z; }
    return null;
  }
  function burnZombie(z, t) {
    if (!z || z.state === 'muerto') return false;
    t = t === undefined ? CFG.burnT : t;
    var was = z.burnT > 0;
    z.burnT = Math.max(z.burnT || 0, t);
    if (!was) {
      z.burnDirT = 0;
      if (clock() - screamAt > CFG.screamCD) { screamAt = clock(); sfx('zombie.burn', { x: z.x, y: z.y, type: z.type }); }
    }
    return true;
  }
  function extinguish(x, y, r) {
    var G = ACH.G, n = 0, i, rr = (r || 20);
    for (i = zones.length - 1; i >= 0; i--) {
      var z = zones[i], k = rr + z.r * 0.6;
      if (d2(x, y, z.x, z.y) < k * k) { killZone(z, false); n++; }
    }
    if (G) {
      for (i = 0; i < G.zombies.length; i++) { var q = G.zombies[i]; if (q.burnT > 0 && d2(x, y, q.x, q.y) < rr * rr) { q.burnT = 0; n++; } }
      var p = G.player;
      if (p && p.burnT > 0 && d2(x, y, p.x, p.y) < rr * rr) { p.burnT = 0; p.fireAcc = 0; n++; }
    }
    if (n) { sfx('fire.out', { x: x, y: y }); steam(x, y, 4 + Math.min(10, n * 2)); }
    return n;
  }
  function puddle(x, y, r, t) {
    puddles.push({ x: x, y: y, r: r || 24, t: t || 20, life: t || 20, big: (r || 24) >= 20 ? 1 : 0 });
    if (puddles.length > 10) puddles.shift();
    extinguish(x, y, (r || 24) + 4);
  }

  /* ---------------- Humo ---------------- */
  function puff(x, y, big, gray) {
    if (smoke.length >= CFG.smokeMax) smoke.shift();
    smoke.push({ x: x + rand(-3, 3), y: y, t: 0, life: CFG.smokeLife * rand(0.8, 1.2), vx: rand(-3, 3), sz: big ? 2 : (Math.random() < 0.5 ? 0 : 1), gray: !!gray, steam: false });
  }
  function steam(x, y, n) {
    for (var i = 0; i < n; i++) {
      if (smoke.length >= CFG.smokeMax) smoke.shift();
      smoke.push({ x: x + rand(-10, 10), y: y + rand(-4, 4), t: 0, life: rand(0.7, 1.2), vx: rand(-6, 6), sz: Math.random() < 0.5 ? 0 : 1, gray: false, steam: true });
    }
  }

  /* ---------------- Paso ---------------- */
  function hurtZombie(G, z, dmg) {
    z.hp -= dmg;
    if (z.hp > 0) return;
    // el último punto pasa por hitZombie (fans, botín, cadáver); desde atrás, para que el escudo de la carretilla no lo pare
    z.hp = 0.001;
    var f = z.face !== undefined ? z.face : (z.flip ? Math.PI : 0), from = { x: z.x - Math.cos(f) * 8, y: z.y - Math.sin(f) * 8 };
    var r;
    try { r = ACH.ent.hitZombie(G, z, 0, 0, { dmg: 1, knock: 0, from: from, src: 'fire' }); } catch (e) { r = false; }
    if (r === undefined && z.state !== 'muerto') {   // bloqueado igual (gancho de otro módulo): se cae quemado
      z.hp = 0; z.state = 'muerto'; z.deadT = 0; z.stunT = 0.25; G.fans++;
      if (ACH.inv && ACH.inv.dropFor) { try { ACH.inv.dropFor(z); } catch (e2) { /* nada */ } }
    }
    if (z.state === 'muerto') sfx('kill', { x: z.x, y: z.y, type: z.type });
  }
  function updateZombies(G, dt) {
    var zs = G.zombies, i, j;
    for (i = 0; i < zs.length; i++) {
      var z = zs[i];
      if (z.state === 'muerto') { if (z.burnT > 0) z.burnT = Math.max(0, z.burnT - dt * 2); continue; }
      var inside = zones.length && inFire(z.x, z.y), dps = 0;
      if (inside) { burnZombie(z, CFG.burnT); dps = CFG.zoneDps; }
      else if (z.burnT > 0) { z.burnT -= dt; dps = CFG.burnDps; if (z.burnT <= 0) { z.burnT = 0; continue; } }
      if (!dps) continue;
      z.fireAcc = (z.fireAcc || 0) + dps * dt;
      if (z.fireAcc >= 0.2) { var dm = z.fireAcc; z.fireAcc = 0; hurtZombie(G, z, dm); }
      // contagio: 30 % por segundo de contacto
      if (z.state !== 'muerto') for (j = 0; j < zs.length; j++) {
        var o = zs[j];
        if (o === z || o.state === 'muerto' || o.burnT > 0) continue;
        if (Math.abs(o.x - z.x) > CFG.spreadR || Math.abs(o.y - z.y) > CFG.spreadR) continue;
        if (d2(o.x, o.y, z.x, z.y) < CFG.spreadR * CFG.spreadR && Math.random() < CFG.spreadP * dt) burnZombie(o, CFG.burnT);
      }
    }
  }
  function updatePlayer(G, dt) {
    var p = G.player; if (!p || p.hp <= 0) { if (p) { p.burnT = 0; p.fireAcc = 0; } return; }
    if (p.wetT > 0) { if (p.burnT > 0) { p.burnT = 0; steam(p.x, p.y - 10, 3); } p.fireAcc = 0; return; }   // mojado no se quema
    var air = (p.z || 0) > CFG.safeZ, dps = 0;
    if (!air && zones.length && inFire(p.x, p.y)) {
      if (!(p.burnT > 0)) fxText(p.x, p.y - 34, '¡QUEMA, QUEMA!', '#ff8a30');
      p.burnT = CFG.pBurnT; dps = CFG.pDps;
    } else if (p.burnT > 0) { p.burnT = Math.max(0, p.burnT - dt); dps = CFG.pBurnDps; }
    if (!dps) { p.fireAcc = 0; return; }
    p.fireAcc = (p.fireAcc || 0) + dps * dt;
    if (p.fireAcc >= CFG.pChunk) {
      var dmg = Math.floor(p.fireAcc); p.fireAcc -= dmg;
      var fz = zoneAt(p.x, p.y); ACH.ent.hurtPlayer(G, dmg, { src: 'fire', ignoreAir: true, from: fz ? { x: fz.x, y: fz.y } : null });   // v0.13 (F6): centro del fuego para el escudo
    }
  }
  function birdList() {
    var A = ACH.aves; if (!A) return null;
    var L = typeof A.list === 'function' ? A.list() : A.list;
    return Array.isArray(L) ? L : null;
  }
  function updateBirds(G) {
    var L = birdList(); if (!L || !L.length || !zones.length || !ACH.aves.burn) return;
    for (var i = 0; i < L.length; i++) {
      var b = L[i]; if (!b || b.burnedByFire || b.dead || b.state === 'cae' || b.state === 'muerto') continue;
      if ((b.z || 0) < CFG.birdZ && inFire(b.x, b.y)) { b.burnedByFire = true; try { ACH.aves.burn(b); } catch (e) { /* nada */ } }
    }
  }
  function updateProps(G, dt) {
    propT -= dt; if (propT > 0 || !zones.length) return;
    propT = CFG.propEvery;
    var I = ACH.inter, P = ACH.world && ACH.world.props; if (!I || !I.kindOf || !I.damageProp || !P) return;
    for (var i = 0; i < P.length; i++) {
      var pr = P[i]; if (pr.broken) continue;
      var K = I.kindOf(pr.k); if (!K || K.cls !== 'trash') continue;
      var z = zoneAt(pr.x, pr.y - 2); if (!z) continue;
      try { I.damageProp(G, pr, 99, 'fire'); } catch (e) { continue; }
      if (pr.broken) columns.push({ x: pr.x, y: pr.y - 6, t: CFG.columnT, st: 0 });
      if (columns.length > 8) columns.shift();
    }
  }
  function update(G, dt) {
    if (!G || !(dt > 0)) return;
    var i, c = G.clock || 0, R = ACH.render;
    for (i = zones.length - 1; i >= 0; i--) {
      var z = zones[i];
      z.t -= dt;
      if (z.t <= 0) { killZone(z, false); continue; }
      z.lt -= dt;
      if (z.lt <= 0 && R && R.addLight) {
        z.lt = CFG.lightEvery;
        var k = Math.min(1, z.t / 0.8), fl = 0.4 + 0.2 * Math.sin(c * 17 + z.ph) + 0.1 * Math.sin(c * 31 + z.ph * 2);
        R.addLight(z.x, z.y - 6, z.r * CFG.lightK * (0.7 + 0.3 * k), CFG.lightCol, 0.3, fl * k);
      }
      z.nt -= dt; if (z.nt <= 0) { z.nt = CFG.noiseEvery; noise(G, z.x, z.y, CFG.noise); }
      z.st -= dt; if (z.st <= 0) { z.st = CFG.smokeEvery; var f = z.flames[Math.floor(Math.random() * z.flames.length)]; puff(z.x + f.dx, z.y + f.dy - 14, false, false); }
      if (z.loop) { try { z.loop.set({ intensity: Math.min(1, z.t / 1.5) }); z.loop.touch(); } catch (e) { /* nada */ } }
    }
    for (i = columns.length - 1; i >= 0; i--) {
      var q = columns[i]; q.t -= dt; q.st -= dt;
      if (q.t <= 0) { columns.splice(i, 1); continue; }
      if (q.st <= 0) { q.st = CFG.columnEvery * (q.t < 3 ? 2 : 1); puff(q.x, q.y, true, true); }
    }
    for (i = puddles.length - 1; i >= 0; i--) { puddles[i].t -= dt; if (puddles[i].t <= 0) puddles.splice(i, 1); }
    for (i = smoke.length - 1; i >= 0; i--) {
      var s = smoke[i]; s.t += dt;
      if (s.t >= s.life) { smoke.splice(i, 1); continue; }
      s.x += (s.vx + 4 * s.t) * dt; s.y -= (s.steam ? 22 : 13) * dt;
    }
    if (G.state !== 'playing' && G.state !== 'dead') return;
    updateZombies(G, dt);
    if (G.state === 'playing') updatePlayer(G, dt);
    updateBirds(G);
    updateProps(G, dt);
  }
  function reset() {
    for (var i = zones.length - 1; i >= 0; i--) killZone(zones[i], false);
    zones.length = 0; puddles.length = 0; columns.length = 0; smoke.length = 0; propT = 0;
    var G = ACH.G;
    if (G && G.player) { G.player.burnT = 0; G.player.fireAcc = 0; }
  }

  /* ---------------- Dibujo ---------------- */
  function dig(path) { var o = ACH.sprites; var k = path.split('.'); for (var i = 0; i < k.length && o; i++) o = o[k[i]]; return o; }
  function isCv(o) { return o && typeof o.width === 'number' && o.width > 0 && typeof o.getContext === 'function'; }
  function anch(c) { if (c && c.ax === undefined) { c.ax = c.width >> 1; c.ay = c.height - 1; } return c; }
  // Reemplazos provisorios (si falta el arte): se hornean una vez.
  var PH = {};
  function mk(w, h, fn, ax, ay) { var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d'); fn(g); c.ax = ax; c.ay = ay; return c; }
  var FCOL = ['#7a1a10', '#d8401a', '#ff8a1a', '#ffd23a', '#fff6c0'];
  function flamePH(sz, f) {
    var key = 'f' + sz + f; if (PH[key]) return PH[key];
    var w = [10, 18, 26][sz], h = [12, 20, 28][sz];
    PH[key] = mk(w, h, function (g) {
      for (var l = 0; l < 4; l++) {
        var hh = Math.round(h * (1 - l * 0.22) * (0.85 + 0.15 * ((f + l) % 2))), ww = Math.max(2, Math.round(w * (1 - l * 0.24)));
        g.fillStyle = FCOL[l + 1 > 4 ? 4 : l + 1]; g.fillRect((w - ww) >> 1, h - hh, ww, hh - 1);
      }
    }, w >> 1, h - 1);
    return PH[key];
  }
  function flameSpr(sz, f) {
    var F = dig('fx.fuego'), set = F && (F[sz] || F[['s', 'm', 'l'][sz]]);
    var c = Array.isArray(set) ? set[f % set.length] : null;
    return isCv(c) ? anch(c) : flamePH(sz, f);
  }
  function burnSpr(f) {
    var Q = dig('fx.quemadura'), c = Array.isArray(Q) ? Q[f % Q.length] : null;
    if (isCv(c)) return anch(c);
    var key = 'q' + (f & 1); if (PH[key]) return PH[key];
    PH[key] = mk(16, 18, function (g) { g.fillStyle = '#ff8a1a'; g.fillRect(3, 4 + (f & 1), 3, 10); g.fillRect(10, 2, 3, 12); g.fillStyle = '#ffd23a'; g.fillRect(4, 8, 1, 6); g.fillRect(11, 6 + (f & 1), 1, 8); }, 8, 16);
    return PH[key];
  }
  var SMOKE_PH = null;
  function smokeSpr(sz) {
    var H = dig('fx.humo'), c = Array.isArray(H) ? H[Math.min(H.length - 1, sz)] : null;
    if (isCv(c)) { if (c.ax === undefined) { c.ax = c.width >> 1; c.ay = c.height >> 1; } return c; }
    if (!SMOKE_PH) SMOKE_PH = [4, 6, 9].map(function (r) { return mk(r * 2, r * 2, function (g) { g.fillStyle = '#8f8a84'; g.beginPath(); g.arc(r, r, r - 0.5, 0, 6.3); g.fill(); }, r, r); });
    return SMOKE_PH[Math.min(2, sz)];
  }
  // piso chamuscado (precalculado: una elipse oscura por radio)
  var SCORCH = {};
  function scorchSpr(r) {
    r = Math.round(r); if (SCORCH[r]) return SCORCH[r];
    SCORCH[r] = mk(r * 2 + 2, r + 2, function (g) {
      g.fillStyle = 'rgba(30,18,12,0.35)'; g.beginPath(); g.ellipse(r + 1, (r >> 1) + 1, r, r / 2, 0, 0, 6.3); g.fill();
      g.fillStyle = 'rgba(20,10,6,0.35)'; g.beginPath(); g.ellipse(r + 1, (r >> 1) + 1, r * 0.6, r * 0.3, 0, 0, 6.3); g.fill();
    }, r + 1, (r >> 1) + 1);
    return SCORCH[r];
  }
  function puddleSpr(big) {
    var D = dig('decals.charcoCerro') || dig('cerro.charcoCerro') || dig('suelo.charcoCerro') || dig('tiles.charcoCerro');
    var c = Array.isArray(D) ? D[big ? 1 : 0] : null;
    if (isCv(c)) { if (c.ax === undefined) { c.ax = c.width >> 1; c.ay = c.height >> 1; } return c; }
    var key = 'pd' + big; if (PH[key]) return PH[key];
    var w = big ? 46 : 28, h = big ? 20 : 13;
    PH[key] = mk(w, h, function (g) { g.fillStyle = 'rgba(70,96,110,0.55)'; g.beginPath(); g.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, 0, 0, 6.3); g.fill(); g.fillStyle = 'rgba(190,220,232,0.5)'; g.fillRect(w * 0.3, h * 0.35, 5, 1); }, w >> 1, h >> 1);
    return PH[key];
  }
  function onScreen(x, y, cx, cy, m) { var V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }; return x > cx - m && x < cx + V.w + m && y > cy - m && y < cy + V.h + m; }
  function drawGround(ctx, G, cx, cy) {
    var i;
    for (i = 0; i < puddles.length; i++) {
      var q = puddles[i]; if (!onScreen(q.x, q.y, cx, cy, 30)) continue;
      var s = puddleSpr(q.big);
      ctx.globalAlpha = Math.min(1, q.t / 1.5);
      ctx.drawImage(s, Math.round(q.x - s.ax) - cx, Math.round(q.y - s.ay) - cy, s.width, s.height);
    }
    ctx.globalAlpha = 1;
    for (i = 0; i < zones.length; i++) {
      var z = zones[i]; if (!onScreen(z.x, z.y, cx, cy, z.r + 4)) continue;
      var sc = scorchSpr(z.r);
      ctx.globalAlpha = Math.min(1, z.t / 1.2);
      ctx.drawImage(sc, Math.round(z.x - sc.ax) - cx, Math.round(z.y - sc.ay) - cy);
    }
    ctx.globalAlpha = 1;
  }
  // y-sort: cada llama, cada zombie en llamas, Alexander quemándose o mojado. Objetos reciclados (sin basura por cuadro).
  var pool = [], out = [];
  function item(y, kind, a, b) {
    var it = pool[out.length];
    if (!it) { it = pool[out.length] = { y: 0, k: '', a: null, b: null, draw: null }; it.draw = drawItem.bind(null, it); }
    it.y = y; it.k = kind; it.a = a; it.b = b; out.push(it);
  }
  function drawItem(it, ctx, cx, cy) {
    var c = clock(), s;
    if (it.k === 'flame') {
      var z = it.a, f = it.b, life = Math.min(1, z.t / 0.9), sz = life < 0.5 ? Math.max(0, f.sz - 1) : f.sz;
      if (life < 0.25 && f.sz === 0 && (f.ph & 1)) return;   // al apagarse quedan menos llamas
      s = flameSpr(sz, (Math.floor(c * f.sp) + f.ph) & 3);
      ctx.globalAlpha = Math.min(1, z.t / 0.4);
      ctx.drawImage(s, Math.round(z.x + f.dx - s.ax) - cx, Math.round(z.y + f.dy - s.ay) - cy);
      ctx.globalAlpha = 1;
    } else if (it.k === 'burn') {
      var q = it.a; s = burnSpr((Math.floor(c * 12) + (q._bph || 0)) & 3);
      ctx.globalAlpha = q.state === 'muerto' ? 0.7 : 1;
      ctx.drawImage(s, Math.round(q.x - s.ax) - cx, Math.round(q.y - (q.state === 'muerto' ? -4 : 0) - s.ay) - cy);
      ctx.globalAlpha = 1;
    } else if (it.k === 'pburn') {
      var p = it.a; s = burnSpr(Math.floor(c * 12) & 3);
      ctx.drawImage(s, Math.round(p.x - s.ax) - cx, Math.round(p.y - (p.z || 0) - s.ay) - cy);
    } else if (it.k === 'wet') {
      var pw = it.a, set = pw.bird ? 'bird' : 'nobird', W = dig('alex.' + set + '.wet');
      var wc = Array.isArray(W) ? W[Math.floor(c * 3) & 1] : null; if (!isCv(wc)) return;
      if (wc.ax === undefined) { wc.ax = 10; wc.ay = 26; }
      ctx.drawImage(wc, Math.round(pw.x - wc.ax) - cx, Math.round(pw.y - (pw.z || 0) - wc.ay) - cy);
    }
  }
  function ysort(G) {
    out.length = 0;
    var cam = G.cam, cx = Math.round(cam.x), cy = Math.round(cam.y), i, j;
    for (i = 0; i < zones.length; i++) {
      var z = zones[i]; if (!onScreen(z.x, z.y, cx, cy, z.r + 30)) continue;
      for (j = 0; j < z.flames.length; j++) item(z.y + z.flames[j].dy, 'flame', z, z.flames[j]);
    }
    for (i = 0; i < G.zombies.length; i++) {
      var q = G.zombies[i]; if (!(q.burnT > 0) || !onScreen(q.x, q.y, cx, cy, 20)) continue;
      if (q._bph === undefined) q._bph = Math.floor(Math.random() * 4);
      item(q.y + 0.6, 'burn', q, null);
    }
    var p = G.player;
    if (p && p.hp > 0) {
      if (p.burnT > 0) item(p.y + 0.6, 'pburn', p, null);
      else if (p.wetT > 0 && !(p.invisT > 0)) item(p.y + 0.5, 'wet', p, null);
    }
    return out;
  }
  function drawAir(ctx, G, cx, cy) {
    for (var i = 0; i < smoke.length; i++) {
      var s = smoke[i]; if (!onScreen(s.x, s.y, cx, cy, 20)) continue;
      var k = s.t / s.life, sp = smokeSpr(s.sz + (k > 0.5 ? 1 : 0));
      ctx.globalAlpha = (s.steam ? 0.55 : (s.gray ? 0.5 : 0.42)) * (1 - k) * Math.min(1, s.t * 6);
      ctx.drawImage(sp, Math.round(s.x - sp.ax) - cx, Math.round(s.y - sp.ay) - cy);
    }
    ctx.globalAlpha = 1;
  }
  var DH = ACH.drawHooks = ACH.drawHooks || { ground: [], ysort: [], air: [], screen: [] };
  ['ground', 'ysort', 'air', 'screen'].forEach(function (k) { if (!Array.isArray(DH[k])) DH[k] = []; });
  DH.ground.push(drawGround); DH.ysort.push(ysort); DH.air.push(drawAir);
  (ACH.levelHooks = ACH.levelHooks || []).push(function () { reset(); });

  /* ---------------- Debug ---------------- */
  ACH.debug = ACH.debug || {};
  ACH.debug.fire = function (x, y, r, t) {
    var G = ACH.G, p = G && G.player; if (!p) return null;
    if (x === undefined) { var v = (ACH.ent && ACH.ent.DIRV[p.dir]) || [1, 0]; x = p.x + v[0] * 46; y = p.y + v[1] * 40; }
    var z = ignite(x, y, r, t);
    return z ? { x: Math.round(z.x), y: Math.round(z.y), r: z.r, t: z.t, zones: zones.length } : null;
  };
  ACH.debug.fuego = function () {
    return { zones: zones.map(function (z) { return { x: Math.round(z.x), y: Math.round(z.y), r: z.r, t: +z.t.toFixed(2) }; }), puddles: puddles.length, smoke: smoke.length, columns: columns.length,
      burning: ACH.G ? ACH.G.zombies.filter(function (z) { return z.burnT > 0; }).length : 0, player: ACH.G && ACH.G.player ? +(ACH.G.player.burnT || 0).toFixed(2) : 0 };
  };

  ACH.fuego = { CFG: CFG, zones: zones, puddles: puddles, ignite: ignite, extinguish: extinguish, puddle: puddle, burnZombie: burnZombie,
    inFire: inFire, update: update, reset: reset };
})();
