/* ACHORADO v0.13 (T2, KE) — js/miraflores/emboscadas.js: D1, el parque con vida en la ruta.
   · 9 EMBOSCADAS (zonas de disparo sobre la ruta Óvalo → rotonda → iglesia): al pasar, un grupo sale por Larco o por la Diagonal y va por ti.
     Cada una se dispara una sola vez (y CONTINUAR con la jefa vencida las da por hechas). Los 12 oficinistas salen de ahí (trabajadores.js: M.trabMake),
     salvo los 3 del extremo este (Belisario, Wong y Ripley), que siguen en su puerta.
   · 3 zombis pitucos nuevos (tipos en ACH.ent.ZT, comportamiento en ACH.zbeh, como senoras.js y costaverde/zombis.js):
       mira_turista  turista con cámara: al verte levanta la cámara (0,55 s de aviso) y su FLASH te aturde 1 s si estás a ≤150 px con vista libre. Vida 2, lento.
       mira_jogger   jogger de la ciclovía: trota en línea recta por el carril (fila 21) y, si te ve, te persigue rápido (72 px/s; v0.13 T3: -15 % desde 85). Vida 1 (frágil).
       mira_sereno   sereno con silbato: al verte pita (0,6 s de aviso), todos los zombis a ≤280 px van por ti y la primera vez llegan 2 caminantes de refuerzo. Vida 4.
   · 8–10 encuentros, no una horda: 12 oficinistas + 2 turistas + 2 joggers + 1 sereno (+2 de refuerzo).
   API: ACH.mira.emb = { enc() → lista con su estado, fire(id), tipos } · ACH.debug.mira.emb(), .fireEmb(id), .embCheck() (spawns libres y con vista al disparador). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var M = ACH.mira = ACH.mira || {}; M.systems = M.systems || [];
  if (!M.register) M.register = function (s) { M.systems.push(s); return s; };
  var ENT = ACH.ent, ZT = ENT && ENT.ZT;
  if (!ZT) { console.warn('[ACHORADO mira] emboscadas.js: falta ACH.ent'); return; }
  var T = 16, TAU = Math.PI * 2;

  var TYPES = {
    mira_turista: { hp: 2, speed: 20, anim: 5.5, sight: 110, dmg: 8, blind: false, lunge: false },
    mira_jogger: { hp: 1, speed: 72, anim: 14, sight: 100, dmg: 7, blind: false, lunge: false },
    mira_sereno: { hp: 4, speed: 24, anim: 6, sight: 120, dmg: 8, blind: false, lunge: false }
  };
  for (var tk in TYPES) if (!ZT[tk]) ZT[tk] = TYPES[tk];
  var K = { flashWind: 0.55, flashR: 150, flashStun: 1.0, flashCD: [6, 9], whistleWind: 0.6, whistleR: 280, whistleCD: 9, jogLane: 21.5 * T, jogBrake: 0.5, awareT: 9 };

  function rand(a, b) { return a + Math.random() * (b - a); }
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function sfx(n, d) { if (M.sfx) M.sfx(n, d); }
  function toast(t) { if (M.toast) M.toast(t); }
  function mkc(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  /* ---------------- Skins provisorios: un caminante vestido para su papel ---------------- */
  function baseSkin() {
    var S = ACH.sprites, L = S && S.zvarList, Z = S && S.zvar, i;
    if (!Z) return null;
    if (Array.isArray(L)) for (i = 0; i < L.length; i++) if (L[i].loco === 'camina' && Z[L[i].skin] && /normal/.test(L[i].skin) && Z[L[i].skin].move) return Z[L[i].skin];
    if (Array.isArray(L)) for (i = 0; i < L.length; i++) if (L[i].loco === 'camina' && Z[L[i].skin] && Z[L[i].skin].move) return Z[L[i].skin];
    for (var k in Z) if (/^camina_/.test(k) && Z[k] && Z[k].move) return Z[k];
    return null;
  }
  var LOOK = {
    mira_turista: { shirt: '#e8b830', trim: '#d8402c', hat: '#d8c89a', cam: true },
    mira_jogger: { shirt: '#1fe07a', trim: '#131015', band: '#ff2e88' },
    mira_sereno: { shirt: '#2a3a5a', trim: '#e8e830', cap: '#1c1a22', badge: true }
  };
  function paint(src, L, dead) {
    if (!src || !src.width) return src;
    var w = src.width, h = src.height, c = mkc(w, h), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    if (dead) { g.fillStyle = L.shirt; g.fillRect(Math.floor(w * 0.3), Math.floor(h * 0.25), Math.ceil(w * 0.35), Math.ceil(h * 0.5)); }
    else {
      var x0 = Math.floor(w * 0.28), x1 = Math.ceil(w * 0.72), y0 = Math.floor(h * 0.4), y1 = Math.floor(h * 0.74);
      g.fillStyle = L.shirt; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      g.fillStyle = L.trim; g.fillRect(x0, y0, x1 - x0, 1);
      if (L.cam) { g.fillStyle = '#131015'; g.fillRect(Math.floor(w * 0.5), y0 + 3, 4, 3); g.fillStyle = '#c8ccd4'; g.fillRect(Math.floor(w * 0.5) + 1, y0 + 4, 1, 1); g.fillStyle = L.trim; for (var q = 0; q < 4; q++) g.fillRect(x0 + 1 + q * 3, y0 + 8, 1, 1); }
      if (L.band) { g.fillStyle = L.band; g.fillRect(Math.floor(w * 0.3), Math.floor(h * 0.12), Math.ceil(w * 0.4), 2); }
      if (L.cap) { g.fillStyle = L.cap; g.fillRect(Math.floor(w * 0.28), Math.floor(h * 0.05), Math.ceil(w * 0.44), 3); g.fillRect(Math.floor(w * 0.55), Math.floor(h * 0.1), Math.ceil(w * 0.3), 1); }
      if (L.hat) { g.fillStyle = L.hat; g.fillRect(Math.floor(w * 0.26), Math.floor(h * 0.06), Math.ceil(w * 0.48), 2); g.fillRect(Math.floor(w * 0.34), Math.floor(h * 0.02), Math.ceil(w * 0.3), 4); }
      if (L.badge) { g.fillStyle = L.trim; g.fillRect(x0 + 2, y0 + 2, 2, 2); g.fillRect(x1 - 4, y1 - 4, 1, 3); }
    }
    g.globalCompositeOperation = 'source-over';
    c.ax = src.ax; c.ay = src.ay; c.prov = true;
    return c;
  }
  function mapF(o, fn) { if (Array.isArray(o)) return o.map(fn); return o && o.width ? fn(o) : o; }
  function ensureSkins() {
    var S = ACH.sprites; if (!S) return;
    S.zvar = S.zvar || {};
    var base = baseSkin(); if (!base) return;
    Object.keys(LOOK).forEach(function (k) {
      if (S.zvar[k] && !S.zvar[k].prov) return;
      if (S.zvar[k]) return;
      var L = LOOK[k], e = { move: mapF(base.move, function (f) { return paint(f, L); }), hurt: mapF(base.hurt, function (f) { return f; }), dead: mapF(base.dead, function (f) { return paint(f, L, true); }), prov: true };
      if (base.extra) e.extra = base.extra;
      S.zvar[k] = e;
    });
  }
  function hasSkin(k) { var Z = ACH.sprites && ACH.sprites.zvar; var s = null; try { s = Z && Z[k]; } catch (e) { s = null; } return !!(s && (s.move || s.walk)); }

  /* ---------------- Crear zombis ---------------- */
  function mk(type, x, y) {
    var z = ENT.makeZombie(type, x, y, { loco: 'camina' });
    if (ACH.zvar && ACH.zvar.setLoco && z.loco !== 'camina') { try { ACH.zvar.setLoco(z, 'camina', Math.random); } catch (e) { /* nada */ } }
    z.loco = z.loco || 'camina'; z.shield = false; z.low = false; z.punch3 = false;
    if (ZT[type]) { z.hp = ZT[type].hp; z.hpMax = z.hp; }
    if (hasSkin(type)) z.skin = type;
    z.flip = Math.random() < 0.5; z.mamb = type;
    return z;
  }
  function freeSpot(x, y, R) {
    var W = ACH.world; R = R || (ENT.CFG && ENT.CFG.zRadius) || 5;
    if (!W.collideCircle(x, y, R)) return { x: x, y: y };
    for (var d = 6; d <= 60; d += 6) for (var a = 0; a < 12; a++) {
      var nx = x + Math.cos(a / 12 * TAU) * d, ny = y + Math.sin(a / 12 * TAU) * d;
      if (!W.collideCircle(nx, ny, R)) return { x: nx, y: ny };
    }
    return null;
  }

  /* ---------------- Comportamientos (ACH.zbeh) ---------------- */
  var ZB = ACH.zbeh = ACH.zbeh || {};
  var texts = [], flashes = [], flashA = 0;
  function popText(s, x, y, col) { texts.push({ s: s, x: x, y: y, t: 0, col: col || '#ffe500' }); if (texts.length > 6) texts.shift(); }
  function sees(G, z, k) {
    var p = G.player, d = ZT[z.type];
    if (!(p.hp > 0) || p.invisT > 0) return false;
    return dist(z.x, z.y, p.x, p.y) < d.sight * (k || 1) && ACH.world.los(z.x, z.y - 6, p.x, p.y - 6);
  }
  // los que salen de una emboscada saben dónde estás los primeros K.awareT s (no se pierden por el camino)
  function aware(G, z, dt) {
    if (!(z.ambT >= 0)) return;
    z.ambT += dt;
    if (z.ambT > K.awareT) { z.ambT = -1; return; }
    var p = G.player;
    if (!(p.hp > 0) || p.invisT > 0) return;
    if (z.state === 'deambular' || z.state === 'investigar') z.state = 'perseguir';
    if (z.state === 'perseguir') { z.lostT = 0; z.lastX = p.x; z.lastY = p.y; }
  }
  function alertAround(G, x, y, R, except) {
    var p = G.player, n = 0;
    for (var i = 0; i < G.zombies.length; i++) {
      var o = G.zombies[i];
      if (o === except || o.state === 'muerto' || o.social || dist(o.x, o.y, x, y) > R) continue;
      if (o.state === 'deambular' || o.state === 'investigar') { o.state = 'perseguir'; o.lostT = 0; o.lastX = p.x; o.lastY = p.y; n++; }
    }
    return n;
  }

  // turista con cámara
  ZB.mira_turista = {
    init: function (G, z) { z.flashCD = rand(1, 3); z.flashT = 0; },
    update: function (G, z, dt) {
      z.zpose = z.flashT > 0 ? 'windup' : null; z.zposeF = 0;   // v0.13 T3 (S): la cámara al ojo (cuadro windup del skin propio, js/sprites/zombis-v013.js)
      if (z.flashT > 0) {
        z.flashT -= dt; z.moving = false; z.flip = G.player.x < z.x;
        if (z.flashT <= 0) doFlash(G, z);
        return true;
      }
      if (z.flashCD > 0) z.flashCD -= dt;
      if ((z.state === 'perseguir' || z.state === 'atacar') && z.flashCD <= 0 && sees(G, z, K.flashR / ZT.mira_turista.sight)) {
        z.flashCD = rand(K.flashCD[0], K.flashCD[1]); z.flashT = K.flashWind; z.moving = false;
        popText('¡UNA FOTITO!', z.x, z.y - 36, '#ffffff'); sfx('mira.flashWind', { x: z.x, y: z.y });
        if (M.say) M.say('turista', { who: 'vendedor', x: z.x, y: z.y }, '¡Una fotito, causa!');
        return true;
      }
      return false;
    },
    onDeath: function (G, z) { /* el botín lo reparte dropFor (propinas) */ }
  };
  function doFlash(G, z) {
    var p = G.player;
    flashes.push({ x: z.x, y: z.y - 18, t: 0 });
    sfx('mira.flash', { x: z.x, y: z.y });
    if (p.hp > 0 && p.invisT <= 0 && dist(p.x, p.y, z.x, z.y) <= K.flashR && ACH.world.los(z.x, z.y - 6, p.x, p.y - 6)) {
      p.stunT = Math.max(p.stunT || 0, K.flashStun); flashA = 1;
      popText('¡FLASH!', p.x, p.y - 30, '#ffffff');
      if (!doFlash.said) { doFlash.said = true; toast('¡El flash te dejó ciego un segundo! Rómpele la cámara antes'); }
    }
    alertAround(G, z.x, z.y, 110, z);
  }

  // jogger: trota por la ciclovía; al chocar frena
  ZB.mira_jogger = {
    init: function (G, z) { z.jog = 1; z.jogY = K.jogLane; z.jogBrake = 0; },
    update: function (G, z, dt) {
      if (z.jogBrake > 0) { z.jogBrake -= dt; z.moving = false; return true; }
      if (z.state === 'deambular' && !sees(G, z)) {
        var W = ACH.world, sp = ZT.mira_jogger.speed * 0.75, dir = z.jog || 1, vy = ((z.jogY || z.y) - z.y) * 2.5;
        var hit = W.moveCircle(z, dir * sp * dt, vy * dt, ENT.CFG.zRadius);
        z.moving = true; z.flip = dir < 0;
        if (hit || z.x < 3 * T || z.x > (W.COLS - 3) * T) { z.jog = -dir; z.jogBrake = K.jogBrake; }
        return true;
      }
      return false;
    }
  };

  // sereno: silbato
  ZB.mira_sereno = {
    init: function (G, z) { z.whCD = rand(0.5, 2); z.whT = 0; z.refuerzo = false; },
    update: function (G, z, dt) {
      z.zpose = z.whT > 0 ? 'windup' : null; z.zposeF = Math.floor(z.whT * 12) % 2;   // v0.13 T3 (S): el silbato en la boca
      if (z.whT > 0) {
        z.whT -= dt; z.moving = false; z.flip = G.player.x < z.x;
        if (z.whT <= 0) doWhistle(G, z);
        return true;
      }
      if (z.whCD > 0) z.whCD -= dt;
      if ((z.state === 'perseguir' || z.state === 'atacar') && z.whCD <= 0 && sees(G, z, 1.4)) {
        z.whCD = K.whistleCD; z.whT = K.whistleWind; z.moving = false;
        popText('¡PIIIIII!', z.x, z.y - 36, '#ffe500');
        sfx('mira.silbato', { x: z.x, y: z.y });
        if (M.say) M.say('sereno', { who: 'trabajador', x: z.x, y: z.y }, '¡Alto ahí, no se puede pasar!');
        return true;
      }
      return false;
    }
  };
  function doWhistle(G, z) {
    var n = alertAround(G, z.x, z.y, K.whistleR, z);
    if (!z.refuerzo) {   // la primera vez llegan dos caminantes más
      z.refuerzo = true;
      var got = refuerzo(G, 2);
      if (got) toast('¡El sereno pitó y vienen más! Calla ese silbato');
    } else if (n) popText('¡VIENEN!', z.x, z.y - 30, '#ff5a2e');
  }
  function refuerzo(G, n) {
    var p = G.player, cam = G.cam, V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }, got = 0, tries = 0, alive = 0, i;
    for (i = 0; i < G.zombies.length; i++) if (G.zombies[i].state !== 'muerto') alive++;
    if (alive > 30) return 0;
    while (got < n && tries++ < 60) {
      var a = Math.random() * TAU, d = rand(150, 230), x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d * 0.7;
      if (cam && x > cam.x - 8 && x < cam.x + V.w + 8 && y > cam.y - 8 && y < cam.y + V.h + 8) continue;
      if (x < 16 || y < 16 || x > ACH.world.W - 16 || y > ACH.world.H - 16) continue;
      var s = freeSpot(x, y); if (!s || dist(s.x, s.y, p.x, p.y) < 120) continue;
      var z = ENT.makeZombie('caminante', s.x, s.y);
      z.state = 'perseguir'; z.lastX = p.x; z.lastY = p.y; z.ambT = 0; z.mamb = 'refuerzo';
      G.zombies.push(z); got++;
    }
    return got;
  }

  /* ---------------- Botín (propinas, agua de jogger…) ---------------- */
  var LOOT = {
    mira_turista: function () { var o = [{ id: 'sencillo', n: 1 + Math.floor(Math.random() * 3) }]; if (Math.random() < 0.3) o.push({ id: 'colaInglesa', n: 1 }); return o; },
    mira_jogger: function () { var o = []; if (Math.random() < 0.6) o.push({ id: 'agua', n: 1 }); o.push({ id: 'sencillo', n: 1 }); return o; },
    mira_sereno: function () { return [{ id: 'sencillo', n: 2 + Math.floor(Math.random() * 3) }, { id: Math.random() < 0.5 ? 'curitas' : 'gaseosa', n: 1 }]; }
  };
  function wrapDrop() {
    var I = ACH.inv; if (!I || !I.dropFor || I.dropFor._emb) return;
    var orig = I.dropFor;
    I.dropFor = function (z) {
      if (z && LOOT[z.type]) {
        var items = LOOT[z.type](), defs = I.defs;
        if (defs) items = items.filter(function (it) { return defs[it.id]; });
        if (items.length && I.drop) I.drop(z.x, z.y, items, true);
        return items;
      }
      return orig.apply(this, arguments);
    };
    I.dropFor._emb = true;
  }

  /* ---------------- Las emboscadas ---------------- */
  // c, r = rango de columnas y filas donde se dispara (tiles); from = por dónde salen (tiles); units: ['trab', marca] | ['turista'] | ['jogger', dir] | ['sereno']
  var ENC = [
    { id: 'saga', c: [14, 20], r: [22, 34], from: [[11, 17.6], [13, 17.6]], units: [['trab', 'saga'], ['trab', 'saga']], msg: '¡Oficinistas cruzando Larco! Vienen por ti' },
    { id: 'turista1', c: [22, 28], r: [22, 34], from: [[26, 19.4]], units: [['turista']] },
    { id: 'jogger1', c: [30, 35], r: [22, 34], from: [[18, 21.5]], units: [['jogger', 1]] },
    { id: 'tailoy', c: [38, 44], r: [22, 36], from: [[46.5, 17.6], [48.5, 17.6]], units: [['trab', 'tailoy'], ['trab', 'tailoy']] },
    { id: 'sereno', c: [46, 51], r: [22, 38], from: [[52, 19.4]], units: [['sereno']], msg: 'Un sereno con silbato: cállalo antes de que pite' },
    { id: 'almuerzo', c: [66, 72], r: [33, 43], from: [[62, 45.6], [65, 45.9], [68, 45.6]], units: [['trab', 'lalucha'], ['trab', 'lalucha'], ['trab', 'starbucks']], msg: '¡Hora de almuerzo! Salen por la Diagonal' },
    { id: 'turista2', c: [74, 80], r: [22, 40], from: [[78, 19.4]], units: [['turista']] },
    { id: 'jogger2', c: [82, 87], r: [22, 40], from: [[104, 21.5]], units: [['jogger', -1]] },
    { id: 'plazuela', c: [91, 97], r: [36, 42], from: [[104.6, 37.4], [106.8, 37.9]], units: [['trab', 'bembos'], ['trab', 'chinawok']], msg: '¡Más oficinistas! Salen de Porras, por el este' }
  ];
  var done = {}, fired = 0;
  function inEnc(e, p) { var c = p.x / T, r = p.y / T; return c >= e.c[0] && c <= e.c[1] && r >= e.r[0] && r <= e.r[1]; }
  function fire(G, e, quiet) {
    if (done[e.id]) return 0;
    done[e.id] = true; fired++;
    var p = G.player, n = 0;
    e.units.forEach(function (u, i) {
      var f = e.from[Math.min(i, e.from.length - 1)], x = f[0] * T + (i >= e.from.length ? (i % 2 ? 12 : -12) : 0), y = f[1] * T;
      var s = freeSpot(x, y); if (!s) return;
      var z = null;
      if (u[0] === 'trab') { z = M.trabMake ? M.trabMake(G, u[1], s.x, s.y, s.x, s.y) : null; }
      else if (u[0] === 'turista') { z = mk('mira_turista', s.x, s.y); G.zombies.push(z); }
      else if (u[0] === 'sereno') { z = mk('mira_sereno', s.x, s.y); G.zombies.push(z); }
      else if (u[0] === 'jogger') { z = mk('mira_jogger', s.x, s.y); z.jog = u[1] || 1; z.jogY = K.jogLane; G.zombies.push(z); }
      if (!z) return;
      z.state = 'perseguir'; z.lastX = p.x; z.lastY = p.y; z.lostT = 0; z.ambT = 0; z.amb = e.id; n++;
      if (u[0] === 'trab') z.said = true;
    });
    if (n) {
      sfx('zombie.alert', { x: e.from[0][0] * T, y: e.from[0][1] * T });
      if (!quiet && e.msg) toast(e.msg);
    }
    return n;
  }
  M.emb = {
    enc: function () { return ENC.map(function (e) { return { id: e.id, c: e.c.slice(), r: e.r.slice(), done: !!done[e.id], n: e.units.length }; }); },
    fire: function (id) { var G = ACH.G; for (var i = 0; i < ENC.length; i++) if (ENC[i].id === id) return fire(G, ENC[i]); return -1; },
    types: TYPES, K: K, ENC: ENC
  };

  /* ---------------- Sistema ---------------- */
  var started = false;
  M.register({
    name: 'emboscadas',
    reset: function (G) {
      done = {}; fired = 0; texts.length = 0; flashes.length = 0; flashA = 0; started = false; doFlash.said = false;
      ensureSkins(); wrapDrop();
      // CONTINUAR con la jefa vencida: arranca en la plazuela y las emboscadas de atrás ya no corren
      if (M.cont && M.flag && M.flag('jefa')) ENC.forEach(function (e) { done[e.id] = true; });
    },
    onRespawn: function () { flashA = 0; },
    update: function (G, dt) {
      var p = G.player, i;
      if (p && p.hp > 0 && G.state === 'playing') for (i = 0; i < ENC.length; i++) if (!done[ENC[i].id] && inEnc(ENC[i], p)) fire(G, ENC[i]);
      for (i = 0; i < G.zombies.length; i++) if (G.zombies[i].ambT >= 0 && G.zombies[i].state !== 'muerto' && G.state === 'playing') aware(G, G.zombies[i], dt);
      for (i = 0; i < texts.length; i++) texts[i].t += dt;
      for (i = texts.length - 1; i >= 0; i--) if (texts[i].t > 1) texts.splice(i, 1);
      for (i = flashes.length - 1; i >= 0; i--) { flashes[i].t += dt; if (flashes[i].t > 0.3) flashes.splice(i, 1); }
      if (flashA > 0) flashA = Math.max(0, flashA - dt * 1.6);
    },
    drawTop: function (g, G, cx, cy) {
      var i, V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
      // cámara levantándose sobre el turista (aviso) y el silbato del sereno
      for (i = 0; i < G.zombies.length; i++) {
        var z = G.zombies[i];
        if (z.state === 'muerto') continue;
        if (z.mamb === 'mira_turista' && z.flashT > 0) {
          var x = Math.round(z.x - cx), y = Math.round(z.y - cy - 30), on = (ACH.fx && ACH.fx.calma && ACH.fx.calma()) ? 0 : Math.floor(z.flashT * 14) % 2;   // v0.13 T3: con «reducir destellos» no parpadea
          g.fillStyle = '#131015'; g.fillRect(x - 6, y - 4, 12, 8); g.fillStyle = on ? '#ffffff' : '#ffe500'; g.fillRect(x - 5, y - 3, 10, 6);
          g.fillStyle = '#131015'; g.fillRect(x - 2, y - 2, 4, 4); g.fillStyle = '#3a8ae8'; g.fillRect(x - 1, y - 1, 2, 2);
        } else if (z.mamb === 'mira_sereno' && z.whT > 0) {
          var sx = Math.round(z.x - cx), sy = Math.round(z.y - cy - 28);
          g.fillStyle = '#131015'; g.fillRect(sx - 4, sy - 2, 9, 5); g.fillStyle = '#e8e830'; g.fillRect(sx - 3, sy - 1, 7, 3);
          g.fillStyle = '#ffe500'; for (var q = 0; q < 3; q++) g.fillRect(sx + 6 + q * 3, sy - 3 + (q % 2) * 4, 2, 1);
        }
      }
      for (i = 0; i < flashes.length; i++) { var f = flashes[i]; var cm = ACH.fx && ACH.fx.calma && ACH.fx.calma(); g.globalAlpha = Math.max(0, 1 - f.t / 0.3) * (cm ? 0.35 : 0.9); g.fillStyle = '#ffffff'; var r = 6 + f.t * (cm ? 24 : 90); g.fillRect(Math.round(f.x - cx - r), Math.round(f.y - cy - r * 0.6), Math.round(r * 2), Math.round(r * 1.2)); }
      g.globalAlpha = 1;
      if (flashA > 0) { g.globalAlpha = Math.min(1, flashA) * (ACH.fx && ACH.fx.calma && ACH.fx.calma() ? 0.14 : 1); g.fillStyle = '#ffffff'; g.fillRect(0, 0, V.w, V.h); g.globalAlpha = 1; }
      if (!texts.length) return;
      g.font = '7px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (i = 0; i < texts.length; i++) {
        var t = texts[i], tx = Math.round(t.x - cx), ty = Math.round(t.y - cy - t.t * 14);
        g.globalAlpha = Math.max(0, 1 - t.t); g.fillStyle = '#131015'; g.fillText(t.s, tx + 1, ty + 1); g.fillStyle = t.col; g.fillText(t.s, tx, ty);
      }
      g.globalAlpha = 1; g.textAlign = 'start'; g.textBaseline = 'alphabetic';
    }
  });

  /* ---------------- Debug ---------------- */
  ACH.debug = ACH.debug || {};
  var DM = ACH.debug.mira = ACH.debug.mira || {};
  DM.emb = function () { return M.emb.enc(); };
  DM.fireEmb = function (id) { return M.emb.fire(id); };
  // ¿Cada punto de salida está libre y, desde el centro de su disparador, hay vista (los.zombis pueden llegar en línea recta)?
  DM.embCheck = function () {
    var W = ACH.world, out = [];
    ENC.forEach(function (e) {
      var cx = (e.c[0] + e.c[1]) / 2 * T, cy = Math.min(Math.max(30 * T, e.r[0] * T + 40), e.r[1] * T);
      e.from.forEach(function (f, i) {
        var x = f[0] * T, y = f[1] * T, free = !W.collideCircle(x, y, 5);
        out.push({ enc: e.id, i: i, libre: free, los: W.los(x, y, cx, cy), d: Math.round(dist(x, y, cx, cy)) });
      });
    });
    return out;
  };
})();
