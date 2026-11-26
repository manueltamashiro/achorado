/* ACHORADO — js/engine/senoras.js (v0.9, H2): las señoras zombie del Cerro (SPEC v0.9 §4).
   Publica ACH.zbeh.senoraBalde y ACH.zbeh.senoraOlla = {init(G, z), update(G, z, dt) → true si ya lo manejó, onHit(G, z, src, opts) → 'block'|'parry'|undefined,
   onDeath(G, z)} (entities.js llama init/update/onHit; zombies.js llama onDeath una vez y ACH.senoras.tick cada paso).
   Más ACH.senoras = {K, puddles, puddleAt(x, y) → bool, text(x, y, s, col), tick(G, dt), reset()}.
   - Balde: a 40–75 px y con línea de vista se planta, carga 0.6 s (aviso: balde atrás, grito y un cono tenue en el piso) y tira el agua en un
     cono de 60° y 75 px: 6 de daño, empuje 35, mojado 4 s (p.wetT). Apaga el fuego (ACH.fuego.extinguish) y deja un charco 6 s.
     Con el balde vacío va a la fuente de agua más cercana (W.waterSources, < 160 px) o pelea de contacto 6 s.
   - Olla: a 16 px levanta la olla 0.45 s (olla arriba, brillo, grito) y la baja: 14 de daño, empuje 60, aturde 0.3 s. Si le pegas mientras la
     levanta: contragolpe (¡CLONG!, daño doble, aturdida 1 s). La olla es escudo de frente contra piedras (no contra el guitarrazo ni el fuego).
   - Los grupos pacíficos (cola del cisterna, olla común) los maneja social.js: aquí solo se le pregunta (ACH.social.senoraCalm / senoraHit).
   El dibujo va por ACH.zvar.frame (z.zpose = 'windup' | 'attack', z.zposeF) y por ACH.drawHooks (chorro, aviso, charcos, mojado, textos). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  var K = {
    balde: { rMin: 40, rMax: 75, wind: 0.6, track: 1.0, throwT: 0.38, hitAt: 0.12, cone: 75, half: Math.PI / 6, dmg: 6, push: 35, wet: 4,
      cd: 1.4, emptyT: 6, refillR: 160, refillWait: 1.2, refillStuck: 1.8, fireR: 40, puddleAt: 44 },
    olla: { range: 16, reach: 22, wind: 0.45, dmg: 14, push: 60, stun: 0.3, strikeT: 0.32, cd: 1.0, daze: 1.0, shieldArc: Math.PI / 3 },
    puddle: { t: 6, r: 16, wetT: 1.5, fireEvery: 0.5 },
    loot: [['sencillo', 0.50, 1, 3], ['taper', 0.20, 1, 1], ['trapo', 0.20, 1, 1], ['botella', 0.15, 1, 1]], escoba: 0.08,
    yellCD: 2.2
  };
  var RANGED = { stone: 1, molotov: 1, fire: 1, burn: 1, carretilla: 1, tele: 1, thrown: 1 };   // lo que no es un golpe de la mano
  var MELEE = { guitar: 1, fist: 1, punch: 1, swing: 1, escoba: 1 };
  // ¿golpe de la mano? Un objeto en mano (skate…) llega con su id como src: es melee solo si Alexander está en pleno golpe con ese arma.
  function isMelee(G, src) {
    if (MELEE[src]) return true;
    if (RANGED[src]) return false;
    var p = G && G.player, w = p && p.atkW;
    return !!(w && p.atkT >= 0 && w.kind === src);
  }

  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function irnd(a, b) { return Math.floor(rand(a, b + 1)); }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function sfx(name, data) { var a = ACH.audio; if (a && a.emit) { try { a.emit(name, data); } catch (e) { /* nada */ } } }
  function say(id, x, y) { var a = ACH.audio; if (a && a.say) { try { a.say(id, { who: 'senora', x: x, y: y }); } catch (e) { /* sin voz */ } } }
  function R() { return (ACH.ent && ACH.ent.CFG && ACH.ent.CFG.zRadius) || 5; }
  function now(G) { return G ? (G.time || 0) : 0; }
  function playing(G) { return G && G.state === 'playing' && G.player && G.player.hp > 0; }
  function chasing(z) { return z.state === 'perseguir' || z.state === 'atacar'; }
  function faceTo(z, x) { if (x < z.x - 0.5) z.flip = true; else if (x > z.x + 0.5) z.flip = false; }
  var lastYell = -1e9;
  function yell(G, z, id) {
    sfx('senora.yell', { x: z.x, y: z.y, type: z.type });
    if (now(G) - lastYell >= K.yellCD) { lastYell = now(G); say(id, z.x, z.y); }
  }
  function shake(G, amp, dur) { if (!G) return; var cur = G.shake ? G.shake.amp * (G.shake.t / G.shake.dur) : 0; if (amp >= cur) G.shake = { amp: amp, t: dur, dur: dur }; }
  function extinguish(x, y, r) { var F = ACH.fuego; if (F && typeof F.extinguish === 'function') { try { F.extinguish(x, y, r); } catch (e) { /* nada */ } } }
  function skinSet(z) { var S = ACH.sprites && ACH.sprites.zvar; return S && z.skin ? S[z.skin] : null; }
  // punto caliente del cuadro (boca del balde / centro de la olla) en el mundo; hot mira a la derecha, relativo a los pies
  function hotPoint(z, which, f) {
    var set = skinSet(z), ex = set && set.extra, arr = ex && (which === 'windup' ? ex.hotWindup : ex.hot), h = arr && arr[Math.min(arr.length - 1, f | 0)];
    var hx = h ? h.x : 8, hy = h ? h.y : -14;
    return { x: z.x + (z.flip ? -hx : hx), y: z.y + hy };
  }

  /* ---------------- textos flotantes propios (fx.js no tiene una API de texto suelto) ---------------- */
  var texts = [];
  function text(x, y, s, col) { texts.push({ x: x, y: y, s: s, t: 0, col: col || '#ffe500' }); if (texts.length > 6) texts.shift(); }

  /* ---------------- charcos del baldazo ---------------- */
  var puddles = [];
  function addPuddle(x, y) {
    puddles.push({ x: x, y: y, t: 0, f: 0 });
    if (puddles.length > 8) puddles.shift();
    extinguish(x, y, K.puddle.r + 8);
  }
  function puddleAt(x, y) {
    for (var i = 0; i < puddles.length; i++) { var q = puddles[i]; var dx = (x - q.x) / (K.puddle.r * 1.4), dy = (y - q.y) / K.puddle.r; if (dx * dx + dy * dy <= 1) return true; }
    return false;
  }

  /* ---------------- Señora del balde ---------------- */
  function nearestWater(z) {
    var L = (ACH.world && ACH.world.waterSources) || [], best = null, bd = K.balde.refillR;
    for (var i = 0; i < L.length; i++) { var d = dist(z.x, z.y, L[i].x, L[i].y); if (d < bd) { bd = d; best = L[i]; } }
    return best;
  }
  function baldeThrow(G, z) {
    var B = K.balde, p = G.player, a = z.sb.ang, ux = Math.cos(a), uy = Math.sin(a);
    var dx = p.x - z.x, dy = p.y - z.y, d = Math.sqrt(dx * dx + dy * dy), hit = false;
    if (d <= B.cone + 4 && d > 0.01) {
      var da = Math.abs(wrap(Math.atan2(dy, dx) - a)), tol = Math.atan2(5, Math.max(8, d));   // el cuerpo de Alexander suma un poco
      if (da <= B.half + tol && ACH.world.los(z.x, z.y - 4, p.x, p.y - 4)) {
        hit = ACH.ent.hurtPlayer(G, B.dmg, { push: { x: ux, y: uy, f: B.push }, src: 'balde' });
        if (hit) { p.wetT = Math.max(p.wetT || 0, B.wet); text(p.x, p.y - 30, '¡SPLASH!', '#a6dcf0'); }
      }
    }
    sfx('balde.splash', { x: z.x + ux * 30, y: z.y + uy * 30, hit: hit });
    // el agua apaga el fuego del cono y deja un charco al final del chorro
    extinguish(z.x + ux * 38, z.y + uy * 38, B.fireR);
    var px = z.x + ux * B.puddleAt, py = z.y + uy * B.puddleAt;
    if (!ACH.world.collideCircle(px, py, 3)) addPuddle(px, py);
    else addPuddle(z.x + ux * 20, z.y + uy * 20);
  }
  function baldeUpdate(G, z, dt) {
    var sb = z.sb || (z.sb = newBalde()), B = K.balde, p = G.player;
    if (sb.cd > 0) sb.cd -= dt;
    if (ACH.social && ACH.social.senoraCalm && ACH.social.senoraCalm(G, z, dt)) { z.zpose = null; return true; }
    if (sb.phase === 'wind') {
      sb.t -= dt; z.moving = false;
      if (playing(G)) {   // corrige un poco la puntería: salir del cono lo esquiva
        var want = Math.atan2(p.y - z.y, p.x - z.x), da = wrap(want - sb.ang), mt = B.track * dt;
        sb.ang = wrap(sb.ang + Math.max(-mt, Math.min(mt, da)));
      }
      z.flip = Math.cos(sb.ang) < 0;
      z.zpose = 'windup'; z.zposeF = sb.t < B.wind / 2 ? 1 : 0;
      if (sb.t <= 0) { sb.phase = 'throw'; sb.t = 0; sb.hit = false; }
      return true;
    }
    if (sb.phase === 'throw') {
      sb.t += dt; z.moving = false;
      z.zpose = 'attack'; z.zposeF = sb.t < B.throwT * 0.4 ? 0 : 1;
      if (!sb.hit && sb.t >= B.hitAt) { sb.hit = true; if (G.player) baldeThrow(G, z); }
      if (sb.t >= B.throwT) {
        z.zpose = null; sb.full = false; sb.cd = B.cd;
        var src = nearestWater(z);
        if (src) { sb.phase = 'refill'; sb.src = src; sb.t = 0; sb.stuck = 0; }
        else { sb.phase = 'empty'; sb.t = B.emptyT; }
      }
      return true;
    }
    if (sb.phase === 'refill') {
      var s = sb.src, ds = dist(z.x, z.y, s.x, s.y);
      if (ds <= 10) {   // llenando el balde
        z.moving = false; sb.t += dt;
        if (sb.t >= B.refillWait) { sb.full = true; sb.phase = 'ready'; sb.cd = 0.4; sfx('balde.windup', { x: z.x, y: z.y, refill: true }); }
        return true;
      }
      var sp = ((ACH.ent.ZT[z.type] || {}).speed || 30) * (ACH.ent.nightMul ? ACH.ent.nightMul(z) : 1);
      var hit = ACH.world.moveCircle(z, (s.x - z.x) / ds * sp * dt, (s.y - z.y) / ds * sp * dt, R());
      z.moving = true; faceTo(z, s.x);
      sb.stuck = hit ? sb.stuck + dt : 0;
      if (sb.stuck > B.refillStuck) { sb.phase = 'empty'; sb.t = B.emptyT; }   // no llega: pelea con el balde vacío
      return true;
    }
    if (sb.phase === 'empty') {   // pelea de contacto (la IA normal) durante 6 s; después busca agua otra vez o «ya encontró»
      sb.t -= dt;
      if (sb.t <= 0) { var w2 = nearestWater(z); if (w2) { sb.phase = 'refill'; sb.src = w2; sb.t = 0; sb.stuck = 0; } else { sb.full = true; sb.phase = 'ready'; } }
      z.zpose = null;
      return false;
    }
    // listo con el balde lleno: ¿se planta?
    z.zpose = null;
    if (!sb.full || sb.cd > 0 || !chasing(z) || !playing(G) || (p.invisT > 0)) return false;
    var d = dist(z.x, z.y, p.x, p.y);
    if (d < B.rMin || d > B.rMax) return false;
    if (!ACH.world.los(z.x, z.y - 6, p.x, p.y - 6)) return false;
    sb.phase = 'wind'; sb.t = B.wind; sb.ang = Math.atan2(p.y - z.y, p.x - z.x); z.moving = false; z.lungeT = 0;
    z.flip = Math.cos(sb.ang) < 0; z.zpose = 'windup'; z.zposeF = 0;
    sfx('balde.windup', { x: z.x, y: z.y }); yell(G, z, 'senoraBalde');
    return true;
  }
  function newBalde() { return { phase: 'ready', full: true, t: 0, cd: rand(0, 0.8), ang: 0, src: null, stuck: 0, hit: false }; }

  /* ---------------- Señora de la olla ---------------- */
  function ollaStrike(G, z) {
    var O = K.olla, p = G.player, dx = p.x - z.x, dy = p.y - z.y, d = Math.sqrt(dx * dx + dy * dy), fx = z.flip ? -1 : 1, hit = false;
    if (d <= O.reach && (dx * fx > -4 || d < 9)) {
      hit = ACH.ent.hurtPlayer(G, O.dmg, { push: { x: dx || fx, y: dy, f: O.push }, stun: O.stun, src: 'olla' });
    }
    var hp = hotPoint(z, 'attack', 1);
    if (hit) { sfx('olla.clong', { x: z.x, y: z.y, hit: true }); text(p.x, p.y - 32, '¡CLONG!'); shake(G, 3, 0.18); }
    else sfx('whiff', { x: hp.x, y: hp.y });
  }
  function ollaUpdate(G, z, dt) {
    var so = z.so || (z.so = newOlla()), O = K.olla, p = G.player;
    if (so.cd > 0) so.cd -= dt;
    if (so.dazeT > 0) { so.dazeT -= dt; if (so.dazeT <= 0) so.parried = false; z.moving = false; z.zpose = null; so.phase = 'ready'; return true; }   // aturdida por el contragolpe
    if (ACH.social && ACH.social.senoraCalm && ACH.social.senoraCalm(G, z, dt)) { z.zpose = null; return true; }
    if (so.phase === 'wind') {
      so.t -= dt; z.moving = false;
      if (playing(G)) faceTo(z, p.x);
      z.zpose = 'windup'; z.zposeF = so.t < O.wind / 2 ? 1 : 0;
      var hp = hotPoint(z, 'windup', z.zposeF);
      if (ACH.render && ACH.render.addLight) ACH.render.addLight(hp.x, hp.y, 22, '#fff2b0', 1 / 30, 0.9);
      if (so.t <= 0) { so.phase = 'strike'; so.t = 0; if (G.player) ollaStrike(G, z); }
      return true;
    }
    if (so.phase === 'strike') {
      so.t += dt; z.moving = false;
      z.zpose = 'attack'; z.zposeF = so.t < O.strikeT * 0.45 ? 0 : 1;
      if (so.t >= O.strikeT) { so.phase = 'ready'; so.cd = O.cd; z.zpose = null; }
      return true;
    }
    z.zpose = null;
    if (!chasing(z) || !playing(G)) return false;
    var d = dist(z.x, z.y, p.x, p.y);
    if (d > O.range) { if (z.state === 'atacar') z.state = 'perseguir'; return false; }
    // al alcance: la olla reemplaza la mordida (se queda plantada mirando)
    z.state = 'atacar'; z.moving = false; faceTo(z, p.x);
    if (so.cd <= 0 && !(p.invisT > 0)) {
      so.phase = 'wind'; so.t = O.wind; z.zpose = 'windup'; z.zposeF = 0;
      sfx('olla.windup', { x: z.x, y: z.y }); yell(G, z, 'senoraOlla');
    }
    return true;
  }
  function newOlla() { return { phase: 'ready', t: 0, cd: rand(0.2, 0.6), dazeT: 0 }; }

  /* ---------------- Golpes ---------------- */
  function srcFrom(G, opts) {
    if (opts && opts.from) return opts.from;
    return G && G.player;
  }
  function baldeHit(G, z, src, opts) {
    if (ACH.social && ACH.social.senoraHit) ACH.social.senoraHit(G, z);
    var sb = z.sb; if (!sb) return;
    if (sb.phase === 'wind') { sb.phase = 'ready'; sb.cd = 1.0; z.zpose = null; }   // le cortaste el baldazo
    else if (sb.phase === 'throw' && sb.hit) { z.zpose = null; sb.phase = 'ready'; sb.full = false; sb.cd = K.balde.cd; var w = nearestWater(z); if (w) { sb.phase = 'refill'; sb.src = w; sb.t = 0; sb.stuck = 0; } else { sb.phase = 'empty'; sb.t = K.balde.emptyT; } }
  }
  function ollaHit(G, z, src, opts) {
    if (ACH.social && ACH.social.senoraHit) ACH.social.senoraHit(G, z);
    var so = z.so || (z.so = newOlla()), O = K.olla;
    src = (opts && opts.src) || src || 'swing';
    if (src === 'stone') {   // solo la piedra rebota, y solo de frente (§4.2)
      var f = srcFrom(G, opts); if (!f) return;
      var a = Math.atan2(f.y - z.y, f.x - z.x), face = z.flip ? Math.PI : 0;
      if (Math.abs(wrap(a - face)) <= O.shieldArc) {   // escudo de frente: la piedra rebota en la olla
        sfx('olla.clong', { x: z.x, y: z.y, shield: true }); text(z.x, z.y - 30, '¡CLANG!');
        z.clangT = 0.2;
        return 'block';
      }
      return;
    }
    if (!isMelee(G, src)) return;   // fuego, molotov, tele, carretilla, objeto lanzado: ni escudo ni contragolpe
    if (so.phase === 'wind') {   // contragolpe: la interrumpiste con la olla arriba
      so.phase = "ready"; so.dazeT = O.daze; so.parried = true; so.cd = O.cd; z.zpose = null;
      sfx('olla.parry', { x: z.x, y: z.y }); sfx('olla.clong', { x: z.x, y: z.y, parry: true });
      text(z.x, z.y - 32, '¡CLONG!', '#ff2e88'); shake(G, 2, 0.12);
      if (G && G.stats) G.stats.parries = (G.stats.parries || 0) + 1;
      return 'parry';
    }
    if (so.phase === 'strike') { so.phase = 'ready'; so.cd = O.cd; z.zpose = null; }
  }

  /* ---------------- Botín (SPEC §4.3): sencillo 50 %, taper 20 %, trapo 20 %, botella 15 %, escoba 8 % (en el suelo, agarrable) ---------------- */
  function onDeath(G, z) {
    z.zpose = null;
    if (ACH.social && ACH.social.senoraDied) { try { ACH.social.senoraDied(G, z); } catch (e) { /* nada */ } }
    var items = [];
    K.loot.forEach(function (L) { if (Math.random() < L[1]) items.push({ id: L[0], n: irnd(L[2], L[3]) }); });
    if (items.length && ACH.inv && ACH.inv.drop) { try { ACH.inv.drop(z.x, z.y, items, true); } catch (e) { console.warn('[ACHORADO] senoras: botín', e); } }
    if (Math.random() < K.escoba && ACH.armas && ACH.armas.spawnLoose) { try { ACH.armas.spawnLoose('escoba', z.x + (z.flip ? -8 : 8), z.y + 2, 0, 0); } catch (e2) { /* sin escoba todavía */ } }
    return items;
  }

  ACH.zbeh = ACH.zbeh || {};
  ACH.zbeh.senoraBalde = {
    init: function (G, z) { z.sb = newBalde(); z.zpose = null; },
    update: baldeUpdate, onHit: baldeHit, onDeath: onDeath
  };
  ACH.zbeh.senoraOlla = {
    init: function (G, z) { z.so = newOlla(); z.zpose = null; },
    update: ollaUpdate, onHit: ollaHit, onDeath: onDeath
  };

  /* ---------------- Cada paso (lo llama zombies.js): mojado, charcos, textos ---------------- */
  var lastT = -1;
  function tick(G, dt) {
    if (!G) return;
    if (G.time < lastT - 1e-6) reset();   // partida nueva
    lastT = G.time;
    var p = G.player, i;
    if (p && p.wetT > 0) p.wetT = Math.max(0, p.wetT - dt);
    for (i = puddles.length - 1; i >= 0; i--) {
      var q = puddles[i];
      q.t += dt; q.f -= dt;
      if (q.t >= K.puddle.t) { puddles.splice(i, 1); continue; }
      if (q.f <= 0) { q.f = K.puddle.fireEvery; extinguish(q.x, q.y, K.puddle.r + 6); }   // apaga molotovs que caigan encima
      var ex = (p ? (p.x - q.x) / (K.puddle.r * 1.4) : 9), ey = (p ? (p.y - q.y) / K.puddle.r : 9);
      if (p && p.hp > 0 && !((p.z || 0) > 6) && ex * ex + ey * ey <= 1) p.wetT = Math.max(p.wetT || 0, K.puddle.wetT);
    }
    for (i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; if (texts[i].t > 0.8) texts.splice(i, 1); }
  }
  function reset() { puddles.length = 0; texts.length = 0; lastYell = -1e9; }
  if (ACH.levelHooks) ACH.levelHooks.push(function () { reset(); }); else setTimeout(function () { if (ACH.levelHooks) ACH.levelHooks.push(function () { reset(); }); }, 0);

  /* ---------------- Dibujo ---------------- */
  function V() { return (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }; }
  function onScreen(x, y, cx, cy, m) { var v = V(); return x > cx - m && x < cx + v.w + m && y > cy - m && y < cy + v.h + m; }
  function chorro(f) { var F = ACH.sprites && ACH.sprites.fx && ACH.sprites.fx.chorro; return F && F.length ? F[Math.max(0, Math.min(F.length - 1, f))] : null; }
  function drawCone(ctx, x, y, a, f, alpha, cx, cy) {
    var c = chorro(f);
    ctx.globalAlpha = alpha;
    ctx.save(); ctx.translate(Math.round(x) - cx, Math.round(y) - cy); ctx.rotate(a);
    if (c) ctx.drawImage(c, -(c.ax || 0), -(c.ay === undefined ? c.height >> 1 : c.ay));
    else {   // sin sprite: abanico de puntos
      ctx.fillStyle = '#a6dcf0';
      for (var r = 6; r <= K.balde.cone * (f + 1) / 3; r += 6) for (var k = -3; k <= 3; k++) { var aa = k / 3 * K.balde.half; ctx.fillRect(Math.round(Math.cos(aa) * r), Math.round(Math.sin(aa) * r), 2, 2); }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  // Suelo: charcos y el aviso del baldazo (el cono tenue donde va a caer el agua)
  function drawGround(ctx, G, cx, cy) {
    var D = ACH.sprites && ACH.sprites.decals, ch = D && D.charcoCerro, sp = ch ? (ch[1] || ch[0] || ch) : null, i;
    for (i = 0; i < puddles.length; i++) {
      var q = puddles[i];
      if (!onScreen(q.x, q.y, cx, cy, 30)) continue;
      ctx.globalAlpha = Math.min(1, (K.puddle.t - q.t) / 1.2) * 0.9;
      if (sp && sp.getContext) ctx.drawImage(sp, Math.round(q.x - sp.width / 2) - cx, Math.round(q.y - sp.height / 2) - cy);
      else { ctx.fillStyle = '#5b86a0'; ctx.fillRect(Math.round(q.x) - 12 - cx, Math.round(q.y) - 4 - cy, 24, 8); ctx.fillRect(Math.round(q.x) - 8 - cx, Math.round(q.y) - 6 - cy, 16, 12); }
    }
    ctx.globalAlpha = 1;
    var zs = G.zombies;
    for (i = 0; i < zs.length; i++) {
      var z = zs[i];
      if (!z.sb || z.sb.phase !== 'wind' || z.state === 'muerto' || !onScreen(z.x, z.y, cx, cy, 90)) continue;
      var k = 1 - z.sb.t / K.balde.wind, blink = (Math.floor(G.clock * 12) & 1) ? 1 : 0.6;
      drawCone(ctx, z.x, z.y, z.sb.ang, 2, (0.3 + 0.4 * k) * blink, cx, cy);
    }
  }
  // Por orden de y: el chorro del baldazo sale de la boca del balde
  function ysort(G) {
    var out = [], zs = G.zombies;
    for (var i = 0; i < zs.length; i++) {
      var z = zs[i];
      if (!z.sb || z.sb.phase !== 'throw' || z.state === 'muerto') continue;
      (function (z) {
        out.push({ y: z.y + 0.5, draw: function (ctx, cx, cy) {
          var t = z.sb.t / K.balde.throwT, f = t < 0.25 ? 0 : (t < 0.5 ? 1 : 2), m = hotPoint(z, 'attack', 1);
          drawCone(ctx, m.x, m.y, z.sb.ang, f, t > 0.75 ? Math.max(0, (1 - t) / 0.25) : 1, cx, cy);
        } });
      })(z);
    }
    return out;
  }
  // Aire: gotas sobre Alexander mojado, brillo de la olla arriba y estrellitas de la aturdida
  function drawAir(ctx, G, cx, cy) {
    var p = G.player, i;
    if (p && p.wetT > 0 && p.hp > 0) {
      var A = ACH.sprites && ACH.sprites.alex, set = A && A[p.bird ? 'bird' : 'nobird'], W = set && set.wet;
      var c = W && W.length ? W[Math.floor(G.clock * 4) & 1] : null;
      if (c) { ctx.globalAlpha = Math.min(1, p.wetT / 0.6); ctx.drawImage(c, Math.round(p.x) - (c.ax === undefined ? c.width >> 1 : c.ax) - cx, Math.round(p.y - (p.z || 0)) - (c.ay === undefined ? c.height - 1 : c.ay) - cy); ctx.globalAlpha = 1; }
      else { ctx.fillStyle = '#a6dcf0'; for (i = 0; i < 4; i++) ctx.fillRect(Math.round(p.x) - 6 + i * 4 - cx, Math.round(p.y - (p.z || 0)) - 26 + ((i + Math.floor(G.clock * 6)) % 3) * 4 - cy, 1, 2); }
    }
    var zs = G.zombies;
    for (i = 0; i < zs.length; i++) {
      var z = zs[i];
      if (!z.so || z.state === 'muerto' || !onScreen(z.x, z.y, cx, cy, 40)) continue;
      if (z.so.phase === 'wind') {   // brillo en la olla levantada
        var hp = hotPoint(z, 'windup', z.zposeF || 0), x = Math.round(hp.x) - cx, y = Math.round(hp.y) - cy, b = Math.floor(G.clock * 16) & 1;
        ctx.fillStyle = b ? '#ffffff' : '#fff2b0';
        ctx.fillRect(x - 3, y - 6, 1, 1); ctx.fillRect(x + 3, y - 7, 1, 1); ctx.fillRect(x, y - 9 - b, 1, 3); ctx.fillRect(x - 1, y - 8 - b, 3, 1);
      }
      if (z.so.dazeT > 0 || (z.state === "golpeado" && z.so.parried)) {
        var hx = Math.round(z.x) - cx, hy = Math.round(z.y) - 30 - cy, t = G.clock * 6;
        ctx.fillStyle = '#ffe500';
        for (var k = 0; k < 3; k++) { var a = t + k * 2.094; ctx.fillRect(hx + Math.round(Math.cos(a) * 6), hy + Math.round(Math.sin(a) * 2), 2, 1); }
      }
    }
  }
  function drawScreen(ctx, G, cx, cy) {
    if (!texts.length) return;
    ctx.font = '8px Silkscreen, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var i = 0; i < texts.length; i++) {
      var t = texts[i], tx = Math.round(t.x) - cx, ty = Math.round(t.y - t.t * 16) - cy;
      ctx.globalAlpha = t.t > 0.55 ? Math.max(0, 1 - (t.t - 0.55) / 0.25) : 1;
      ctx.fillStyle = '#131015'; ctx.fillText(t.s, tx + 1, ty + 1);
      ctx.fillStyle = t.col; ctx.fillText(t.s, tx, ty);
    }
    ctx.globalAlpha = 1;
  }
  var DH = ACH.drawHooks = ACH.drawHooks || { ground: [], ysort: [], air: [], screen: [] };
  ['ground', 'ysort', 'air', 'screen'].forEach(function (k) { if (!Array.isArray(DH[k])) DH[k] = []; });
  DH.ground.push(drawGround); DH.ysort.push(ysort); DH.air.push(drawAir); DH.screen.push(drawScreen);

  /* ---------------- Debug ---------------- */
  function info() {
    var G = ACH.G, p = G && G.player;
    var list = (G ? G.zombies : []).filter(function (z) { return z.type === 'senoraBalde' || z.type === 'senoraOlla'; }).map(function (z) {
      var b = z.sb || z.so || {};
      return { i: G.zombies.indexOf(z), type: z.type, x: Math.round(z.x), y: Math.round(z.y), hp: z.hp, state: z.state, phase: b.phase, full: b.full, dazeT: b.dazeT,
        calm: !!z.calm, grp: z.grp ? z.grp.kind : undefined, skin: z.skin, d: p ? Math.round(dist(z.x, z.y, p.x, p.y)) : null };
    });
    return { n: list.length, alive: list.filter(function (o) { return o.state !== 'muerto'; }).length, wetT: p ? +(p.wetT || 0).toFixed(2) : 0, puddles: puddles.length,
      groups: ACH.social && ACH.social.senoraGroups ? ACH.social.senoraGroups() : null, list: list };
  }
  ACH.debug = ACH.debug || {};
  ACH.debug.senoras = info;
  // ACH.debug.senora('balde'|'olla', dx, dy): una señora junto a Alexander (por defecto 50 px a la derecha)
  ACH.debug.senora = function (kind, dx, dy) {
    var G = ACH.G, p = G.player, z = ACH.ent.makeZombie(kind === 'olla' ? 'senoraOlla' : 'senoraBalde', p.x + (dx === undefined ? 50 : dx), p.y + (dy || 0));
    G.zombies.push(z); return G.zombies.length - 1;
  };

  ACH.senoras = { K: K, puddles: puddles, puddleAt: puddleAt, text: text, tick: tick, reset: reset, info: info };
})();
