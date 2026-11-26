/* ACHORADO — js/barranco/zombis.js (B1a): los zombies de Barranco (BARRANCO.md §3).
   Tipos nuevos en ACH.ent.ZT con su comportamiento en ACH.zbeh[tipo] (mismo patrón que js/costaverde/zombis.js, sin editarlo).
   Skins: ACH.sprites.zvar['br_…'] de arte-personajes.js (B2c) con poses z.zpose = 'declama' | 'lanza' | 'toca' | 'mano';
   si falta, un caminante teñido (provisorio).
     br_poeta / br_poetaRojo  parque, Ermita, bohemia · lento; se para a declamar 1.5 s y suelta 3–4 letras flotantes (A M O R) que van
                              hacia Alexander: si lo tocan, ×0.6 de velocidad 1.5 s (p.brSlowT). Las letras se rompen de un golpe. Vida 3.
                              (El del sombrero rojo con el cuaderno de Lucía lo pone vecinos.js como br_poeta + skin br_poetaRojo.)
     br_pintor        parque, mirador · caballete al lado (rompible: 1–3 monedas). A ≤110 px: aviso 0.5 s y brochazo (1 de daño) que deja
                      una mancha en el piso que frena (×0.7). Vida 3.
     br_musico        playa, bajada, bohemia · skin zampoña/guitarra/cajón (z.brInst). Tocando: los zombies a ≤90 px van +25 % (z.brSpd,
                      ver nivel.js wrapZMul) y salen notitas. Persigue poco (vuelve a su sitio). Vida 2.5.
     br_novio + br_novia  puente, Ermita, parque · separados, de la mano; persiguen flanqueando (±26 px). Si muere uno, el otro queda
                      br_despechado: grito, lágrimas, ×1.5 velocidad y daño. Vida 2.5 cada uno.
     br_jaranero      bohemia, peña · rachas de velocidad; zapateo que empuja si estás pegado. Vida 2.
   Más caminantes de siempre. ~50 al empezar; de noche, más en las calles bohemias. Reaparición hasta 16 vivos, por delante.
   XP: habilidades.js da 8 a un tipo que no conoce; aquí se suma la diferencia (ACH.hab.addXP(n, true)).
   API: ACH.br.zSpawns() · ACH.br.zombis = { TYPES, state(), popText(), curarLento(p), letras(), manchas() } */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var BR = ACH.br = ACH.br || {}; BR.systems = BR.systems || [];
  if (!BR.register) BR.register = function (s) { if (BR.systems.indexOf(s) < 0) BR.systems.push(s); return s; };
  var ENT = ACH.ent, ZT = ENT && ENT.ZT;
  var U = BR.U || 10;
  if (!ZT) { console.warn('[ACHORADO br] zombis.js: falta ACH.ent'); return; }

  var TYPES = {
    br_poeta: { hp: 3, speed: 18, anim: 5, sight: 100, dmg: 8, blind: false, lunge: false },
    br_poetaRojo: { hp: 3.5, speed: 18, anim: 5, sight: 100, dmg: 8, blind: false, lunge: false },
    br_pintor: { hp: 3, speed: 20, anim: 5.5, sight: 120, dmg: 8, blind: false, lunge: false },
    br_musico: { hp: 2.5, speed: 20, anim: 5.5, sight: 80, dmg: 10, blind: false, lunge: false },
    br_novio: { hp: 2.5, speed: 26, anim: 6.5, sight: 95, dmg: 10, blind: false, lunge: false },
    br_novia: { hp: 2.5, speed: 26, anim: 6.5, sight: 95, dmg: 10, blind: false, lunge: false },
    br_despechado: { hp: 2.5, speed: 39, anim: 9, sight: 140, dmg: 15, blind: false, lunge: true },
    br_jaranero: { hp: 2, speed: 30, anim: 8, sight: 100, dmg: 8, blind: false, lunge: false }
  };
  for (var tk in TYPES) if (!ZT[tk]) ZT[tk] = TYPES[tk];
  var XP = { br_poeta: 12, br_poetaRojo: 15, br_pintor: 12, br_musico: 10, br_novio: 10, br_novia: 10, br_despechado: 15, br_jaranero: 10 };
  var SKIN_COL = { br_poeta: ['#2a2a2e', '#f3efe2'], br_poetaRojo: ['#2a2a2e', '#c4202c'], br_pintor: ['#e8dcc0', '#2a62d0'], br_musico_zampona: ['#b5523b', '#efdc92'],
    br_musico_guitarra: ['#5b3a29', '#e3b94f'], br_musico_cajon: ['#2f5d3a', '#8a5a34'], br_novio: ['#1c1a22', '#f3efe2'], br_novia: ['#f3efe2', '#e0457b'], br_jaranero: ['#f3efe2', '#c8402c'] };

  function T() { return (ACH.world && ACH.world.T) || 16; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function sfx(n, d) { if (BR.sfx) BR.sfx(n, d); }
  function say(id, z, txt) { if (BR.say) BR.say(id, { who: 'zombie', x: z.x, y: z.y }, txt); }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function mkc(w, h) { return BR.mk ? BR.mk(w, h) : (function () { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; })(); }
  function PJ() { return (ACH.sprites && ACH.sprites.br && ACH.sprites.br.pj) || {}; }
  function pjGet(k) { var o = null; try { o = PJ()[k]; } catch (e) { o = null; } return o; }
  function isCv(o) { return o && typeof o.width === 'number' && o.width > 0; }
  function pick(o, i) { if (Array.isArray(o)) return o.length ? o[((i % o.length) + o.length) % o.length] : null; return isCv(o) ? o : null; }
  function blit(g, s, x, y) { if (!isCv(s)) return false; g.drawImage(s, Math.round(x - (s.ax !== undefined ? s.ax : s.width >> 1)), Math.round(y - (s.ay !== undefined ? s.ay : s.height - 1))); return true; }
  function nightMul(z) { var N = ACH.noche; if (!N || !N.zMul) return 1; var m = +N.zMul(z); return m > 0 ? m : 1; }

  /* ---------------- Skins ---------------- */
  function zv() { var S = ACH.sprites; return S && (S.zvar = S.zvar || {}); }
  function hasSkin(k) { var Z = zv(), s = null; try { s = Z && Z[k]; } catch (e) { s = null; } return !!(s && (s.move || s.walk)); }
  function baseSkin() {
    var S = ACH.sprites, L = S && S.zvarList, Z = S && S.zvar, i;
    if (!Z) return null;
    if (Array.isArray(L)) for (i = 0; i < L.length; i++) if (L[i].loco === 'camina' && Z[L[i].skin] && Z[L[i].skin].move) return Z[L[i].skin];
    for (var k in Z) if (/^camina_/.test(k) && Z[k] && Z[k].move) return Z[k];
    return null;
  }
  function paint(src, bg, fg, dead) {
    if (!src || !src.width) return src;
    var c = mkc(src.width, src.height), g = c.getContext('2d'), w = src.width, h = src.height; g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    if (dead) { g.fillStyle = bg; g.fillRect(Math.floor(w * 0.3), Math.floor(h * 0.25), Math.ceil(w * 0.35), Math.ceil(h * 0.5)); }
    else { g.fillStyle = bg; g.fillRect(Math.floor(w * 0.28), Math.floor(h * 0.36), Math.ceil(w * 0.44), Math.ceil(h * 0.34)); g.fillStyle = fg; g.fillRect(Math.floor(w * 0.3), Math.floor(h * 0.08), Math.ceil(w * 0.4), 2); }
    g.globalCompositeOperation = 'source-over';
    c.ax = src.ax; c.ay = src.ay; c.prov = true;
    return c;
  }
  function mapF(o, fn) { if (Array.isArray(o)) return o.map(fn); return o && o.width ? fn(o) : o; }
  function ensureSkins() {
    var Z = zv(); if (!Z) return;
    var base = baseSkin();
    Object.keys(SKIN_COL).forEach(function (k) {
      if (hasSkin(k) || !base) return;
      var C = SKIN_COL[k];
      Z[k] = { move: mapF(base.move, function (f) { return paint(f, C[0], C[1]); }), hurt: base.hurt, dead: mapF(base.dead, function (f) { return paint(f, C[0], C[1], true); }), prov: true };
    });
    // el despechado: la variante con lágrimas de B2c (set.despechado) como skin propia
    ['br_novio', 'br_novia'].forEach(function (k) {
      var s = null; try { s = Z[k]; } catch (e) { s = null; }
      var d = s && s.despechado, key = k + '_despe';
      if (hasSkin(key)) return;
      if (d && (d.move || d.walk)) Z[key] = d;
      else if (s && base) Z[key] = { move: mapF(s.move, function (f) { return paint(f, '#4a3436', '#8fd0f0'); }), hurt: s.hurt, dead: s.dead, prov: true };
    });
  }

  /* ---------------- Aparición ---------------- */
  var SP = [];
  function buildSpawns() {
    SP.length = 0;
    function add(type, c, r, extra) { SP.push({ type: type, x: Math.round(c * T()), y: Math.round(r * T()), extra: extra || null, up: !!(extra && extra.up) }); }
    // playa (pocos) y la Bajada
    [[16, 78], [22, 86], [14, 92], [44.5, 78], [52, 70.4], [64, 58.4], [84, 38.4], [82, 40.4], [88, 34.4]].forEach(function (q) { add('caminante', q[0], q[1]); });
    add('br_musico', 21, 73, { inst: 'guitarra' }); add('br_musico', 25.5, 79.5, { inst: 'zampona' }); add('br_musico', 58, 64.4, { inst: 'cajon' });
    // arriba: Gardel, Ermita, mirador, el puente (parejas arriba), Zepita
    add('caminante', 92, 27.6); add('caminante', 60, 37); add('caminante', 102, 49);
    add('pareja', 95, 32); add('pareja', 45, 47.5); add('pareja', 56, 47.8); add('pareja', 98, 48.4);
    add('pareja', 70, 48.4, { up: true }); add('pareja', 80, 48.4, { up: true });
    add('br_poeta', 40, 35); add('br_pintor', 39, 45.5);
    // Parque Municipal: poetas y pintores
    add('br_poeta', 116, 45); add('br_poeta', 128.5, 56.5); add('br_poeta', 112, 58.5);
    add('br_pintor', 132, 40.4); add('br_pintor', 110, 40.4);
    add('pareja', 120, 50.6); add('pareja', 126, 38.4);
    add('br_musico', 118, 34.4, { inst: 'guitarra' });
    add('caminante', 135, 50); add('caminante', 108, 52.4); add('caminante', 141.5, 30); add('caminante', 141.5, 60);
    // calles bohemias
    add('br_musico', 160, 22.4, { inst: 'zampona' }); add('br_jaranero', 170, 22.4); add('br_jaranero', 195, 22.4); add('br_poeta', 185, 22.6);
    add('caminante', 205, 22.4); add('br_pintor', 150, 22.6);
    [[150, 48.4], [175, 48.6], [200, 48.4], [222, 48.6]].forEach(function (q) { add('br_jaranero', q[0], q[1]); });
    add('br_musico', 190, 48.4, { inst: 'cajon' }); add('pareja', 165, 48.4); add('br_poeta', 158, 48.6);
    add('caminante', 212, 48.4); add('caminante', 238, 48.6); add('caminante', 180, 48.4); add('caminante', 178, 32); add('br_jaranero', 178, 40);
  }
  var NIGHT_SP = [[148, 22.4, 'br_jaranero'], [166, 48.4, 'caminante'], [188, 22.4, 'br_jaranero'], [196, 48.6, 'br_jaranero'], [208, 22.6, 'caminante'],
    [216, 48.4, 'br_jaranero'], [226, 48.6, 'caminante'], [244, 48.4, 'br_jaranero'], [178, 28, 'caminante'], [154, 48.6, 'pareja']];
  BR.zSpawns = function () {
    if (!SP.length && ACH.world) buildSpawns();
    var out = [];
    SP.forEach(function (s) {
      if (s.type === 'pareja') { out.push({ type: 'br_novio', x: s.x - 8, y: s.y, up: s.up }); out.push({ type: 'br_novia', x: s.x + 8, y: s.y, up: s.up }); }
      else out.push({ type: s.type, x: s.x, y: s.y, up: s.up });
    });
    return out;
  };

  function mk(type, x, y, up) {
    var z = ENT.makeZombie(type, x, y, { loco: 'camina' });
    if (ACH.zvar && ACH.zvar.setLoco && z.loco !== 'camina') { try { ACH.zvar.setLoco(z, 'camina', Math.random); } catch (e) { /* nada */ } }
    z.loco = z.loco || 'camina'; z.shield = false; z.low = false; z.punch3 = false;
    z.hp = ZT[type] ? ZT[type].hp : z.hp; z.hpMax = z.hp;
    z.br = true; z.brUp = !!up; z.homeX = x; z.homeY = y;
    if (type !== 'caminante' && hasSkin(type)) z.skin = type;
    z.flip = Math.random() < 0.5;
    return z;
  }
  var easels = [];
  function placeGroup(G, s) {
    var W = ACH.world, R = ENT.CFG.zRadius || 5, out = [];
    function ok(x, y, up) {
      return W.collideLayer ? !W.collideLayer(x, y, R, !!up) : !W.collideCircle(x, y, R);
    }
    if (s.type === 'pareja') {
      if (!ok(s.x - 8, s.y, s.up) || !ok(s.x + 8, s.y, s.up)) return out;
      var a = mk('br_novio', s.x - 8, s.y, s.up), b = mk('br_novia', s.x + 8, s.y, s.up);
      a.brMate = b; b.brMate = a; a.brSide = -1; b.brSide = 1;
      G.zombies.push(a, b); out.push(a, b);
      return out;
    }
    if (!ok(s.x, s.y, s.up)) return out;
    var z = mk(s.type, s.x, s.y, s.up);
    if (s.type === 'br_musico') {
      var inst = (s.extra && s.extra.inst) || 'guitarra'; z.brInst = inst;
      if (hasSkin('br_musico_' + inst)) z.skin = 'br_musico_' + inst;
    }
    if (s.type === 'br_pintor') easels.push({ x: s.x + 16, y: s.y + 2, broken: false, z: z });
    G.zombies.push(z); out.push(z);
    return out;
  }
  function spawnAll(G) {
    easels.length = 0;
    ensureSkins(); buildSpawns();
    SP.forEach(function (s) { placeGroup(G, s); });
  }

  /* ---------------- Ayudas ---------------- */
  function hurt(G, dmg, opts) { if (ENT.hurtPlayer) return ENT.hurtPlayer(G, dmg, opts); G.player.hp = Math.max(0, G.player.hp - dmg); return true; }
  function seesNear(G, z, k) {
    var p = G.player, d = ZT[z.type] || ZT.caminante;
    if (!(p.hp > 0) || p.invisT > 0) return false;
    return dist(z.x, z.y, p.x, p.y) < d.sight * (k || 1) && ACH.world.los(z.x, z.y - 6, p.x, p.y - 6);
  }
  function sameLayer(G, z) { var p = G.player; return !!p.brUp === !!z.brUp || !inOZ(z) && !inOZ(p); }
  function inOZ(e) { var O = ACH.world && ACH.world.overlap; return !!(O && e.x >= O.x0 && e.x <= O.x1 && e.y >= O.y0 && e.y <= O.y1); }
  function walk(G, z, tx, ty, sp, dt) {
    var dx = tx - z.x, dy = ty - z.y, d = Math.sqrt(dx * dx + dy * dy); if (d < 1) { z.moving = false; return false; }
    var v = Math.min(sp * dt, d);
    var hit = ACH.world.moveCircle(z, dx / d * v, dy / d * v, ENT.CFG.zRadius || 5);
    z.moving = true; if (Math.abs(dx) > 0.5) z.flip = dx < 0;
    return hit;
  }
  var texts = [];
  function popText(s, x, y, col) { texts.push({ s: s, x: x, y: y, t: 0, col: col || '#ffe500' }); if (texts.length > 8) texts.shift(); }

  /* ---------------- Comportamientos (ACH.zbeh) ---------------- */
  var ZB = ACH.zbeh = ACH.zbeh || {};
  var letras = [], brochas = [], manchas = [], notas = [], tears = [];
  // POETA: declama y suelta letras
  var poeta = {
    init: function (G, z) { z.decCD = rand(2.5, 5); },
    update: function (G, z, dt) {
      if (z.decCD > 0) z.decCD -= dt;
      if (z.decT > 0) {
        z.decT -= dt; z.moving = false; z.zpose = 'declama'; z.zposeF = Math.floor(z.decT * 4) % 2;
        var p = G.player;
        if (z.decN < z.decMax && z.decT < 1.5 - 0.3 * (z.decN + 1)) {
          z.decN++;
          var a = Math.atan2(p.y - 10 - (z.y - 26), p.x - z.x) + rand(-0.5, 0.5);
          letras.push({ x: z.x + (z.flip ? -6 : 6), y: z.y - 26, vx: Math.cos(a) * 34, vy: Math.sin(a) * 34, t: 0, i: (z.decN - 1) % 4, up: !!z.brUp });
          sfx('br.letra.lanza', { x: z.x, y: z.y });
        }
        if (z.decT <= 0) { z.zpose = null; z.decCD = rand(4, 7); }
        return true;
      }
      z.zpose = null;
      if (z.decCD <= 0 && (z.state === 'perseguir' || z.state === 'atacar') && sameLayer(G, z) && dist(z.x, z.y, G.player.x, G.player.y) < 150 && dist(z.x, z.y, G.player.x, G.player.y) > 24 && seesNear(G, z, 1.6)) {
        z.decT = 1.5; z.decN = 0; z.decMax = 3 + (Math.random() < 0.5 ? 1 : 0); z.flip = G.player.x < z.x;
        sfx('br.poeta.declama', { x: z.x, y: z.y }); say(z.type === 'br_poetaRojo' ? 'br_poetaRojo' : 'br_poeta', z, '¡Oh, luna de Barranco!');
        return true;
      }
      return false;
    }
  };
  ZB.br_poeta = poeta; ZB.br_poetaRojo = poeta;
  // PINTOR: brochazo a distancia (aviso 0.5 s)
  ZB.br_pintor = {
    init: function (G, z) { z.brCD = rand(1.5, 3); },
    update: function (G, z, dt) {
      var p = G.player, d = dist(z.x, z.y, p.x, p.y);
      if (z.brCD > 0) z.brCD -= dt;
      if (z.brWind > 0) {
        z.brWind -= dt; z.moving = false; z.zpose = 'lanza'; z.zposeF = 0; z.flip = p.x < z.x;
        if (z.brWind <= 0) {
          var tx = z.brTx, ty = z.brTy, a = Math.atan2(ty - (z.y - 16), tx - z.x), L = Math.min(110, dist(z.x, z.y - 16, tx, ty));
          brochas.push({ x: z.x, y: z.y - 16, x0: z.x, y0: z.y - 16, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, L: L, t: 0, col: Math.floor(Math.random() * 4), up: !!z.brUp });
          sfx('br.brochazo.lanza', { x: z.x, y: z.y }); z.brPost = 0.25; z.brCD = rand(3.2, 4.5);
        }
        return true;
      }
      if (z.brPost > 0) { z.brPost -= dt; z.zpose = 'lanza'; z.zposeF = 1; z.moving = false; return true; }
      z.zpose = null;
      if (z.brCD <= 0 && d <= 110 && d > 18 && sameLayer(G, z) && seesNear(G, z, 1.2)) {
        z.brWind = 0.5; z.brTx = p.x; z.brTy = p.y - 4; z.state = 'perseguir';
        say('br_pintor', z, '¡No te muevas, que te pinto!');
        return true;
      }
      return false;
    }
  };
  // MÚSICO: toca en su sitio (aura +25 %); persigue poco
  ZB.br_musico = {
    update: function (G, z, dt) {
      var p = G.player, d = dist(z.x, z.y, p.x, p.y), dh = dist(z.x, z.y, z.homeX, z.homeY);
      z.brPlay = false;
      if ((z.state === 'perseguir' || z.state === 'atacar') && d < 70 && dh < 150) { z.zpose = null; return false; }   // pelea con el instrumento
      if (z.state === 'golpeado') { z.zpose = null; return false; }
      if (dh > 10) { walk(G, z, z.homeX, z.homeY, ZT.br_musico.speed, dt); z.zpose = null; if (z.state !== 'deambular') z.state = 'deambular'; return true; }
      z.moving = false; z.brPlay = true; z.zpose = 'toca'; z.zposeF = Math.floor(G.clock * 6) % 4;
      z.noteT = (z.noteT || rand(0, 0.6)) - dt;
      if (z.noteT <= 0) { z.noteT = rand(0.45, 0.8); notas.push({ x: z.x + rand(-6, 6), y: z.y - 30, t: 0, k: Math.floor(Math.random() * 2) }); if (Math.random() < 0.35) sfx('br.musico.nota', { x: z.x, y: z.y, kind: z.brInst, n: Math.floor(Math.random() * 5) }); }
      if (d < 70 && seesNear(G, z)) { z.state = 'perseguir'; z.lastX = p.x; z.lastY = p.y; say('br_musico', z, '¡Una monedita pa\'l artista!'); }
      return true;
    }
  };
  // NOVIOS: de la mano, flanquean
  function pareja(G, z, dt) {
    var m = z.brMate, p = G.player;
    if (m && m.state === 'muerto' && !z.brDespe && z.state !== 'muerto') { despechar(G, z); return true; }
    if (z.state === 'golpeado' || z.state === 'muerto') return false;
    var alone = !m || m.state === 'muerto';
    if (z.state === 'perseguir' || z.state === 'atacar') {
      z.zpose = null;
      var d = dist(z.x, z.y, p.x, p.y);
      if (d < 26 || alone || !sameLayer(G, z)) return false;
      var a = Math.atan2(z.y - p.y, z.x - p.x), side = z.brSide || 1, fa = a + side * 0.9;
      var r = Math.max(22, d * 0.7);
      walk(G, z, p.x + Math.cos(fa) * r, p.y + Math.sin(fa) * r, ZT[z.type].speed * nightMul(z), dt);
      return true;
    }
    if (!alone && z.type === 'br_novia' && (m.state === 'deambular' || m.state === 'investigar')) {   // la novia va al lado del novio
      var tx = m.x + 14, ty = m.y + 1, dd = dist(z.x, z.y, tx, ty);
      if (dd > 2) walk(G, z, tx, ty, ZT.br_novia.speed * (dd > 30 ? 1.4 : 1), dt); else z.moving = m.moving;
      z.flip = m.flip;
      if (seesNear(G, z)) { z.state = 'perseguir'; z.lastX = p.x; z.lastY = p.y; }
      z.zpose = 'mano'; z.zposeF = Math.floor(G.clock * 6.5) % 6;
      return true;
    }
    if (!alone && dist(z.x, z.y, m.x, m.y) < 22 && z.moving) { z.zpose = 'mano'; z.zposeF = Math.floor(G.clock * 6.5) % 6; } else z.zpose = null;
    if (!alone && (z.state === 'perseguir') === false && m.state === 'perseguir') { z.state = 'perseguir'; z.lastX = p.x; z.lastY = p.y; }
    return false;
  }
  function despechar(G, z) {
    z.brDespe = true; z.type = 'br_despechado'; z.zpose = null;
    var key = (z.skin === 'br_novia' || z.brSide === 1 ? 'br_novia' : 'br_novio') + '_despe';
    if (hasSkin(key)) z.skin = key;
    z.state = 'perseguir'; z.lastX = G.player.x; z.lastY = G.player.y; z.brTearT = 0;
    popText('¡¿POR QUÉEE?!', z.x, z.y - 32, '#8fd0f0');
    sfx('br.pareja.despechado', { x: z.x, y: z.y }); say('br_despechado', z, '¡¿Por quéee?!');
  }
  ZB.br_novio = { update: pareja }; ZB.br_novia = { update: pareja };
  ZB.br_despechado = {
    update: function (G, z, dt) {
      z.brTearT = (z.brTearT || 0) - dt;
      if (z.brTearT <= 0 && z.state !== 'muerto') { z.brTearT = 0.18; tears.push({ x: z.x + rand(-3, 3), y: z.y - 24, vy: 10, t: 0 }); }
      if (z.state !== 'perseguir' && z.state !== 'atacar' && z.state !== 'golpeado' && z.state !== 'muerto' && G.player.hp > 0) { z.state = 'perseguir'; z.lastX = G.player.x; z.lastY = G.player.y; }
      return false;
    }
  };
  // JARANERO: rachas y zapateo
  ZB.br_jaranero = {
    init: function (G, z) { z.burstCD = rand(2, 4); z.zapCD = 0; },
    update: function (G, z, dt) {
      var p = G.player, d = dist(z.x, z.y, p.x, p.y);
      if (z.burstT > 0) { z.burstT -= dt; z.brSpd = 1.7; } else { z.brSpd = 0; z.burstCD -= dt; if (z.burstCD <= 0 && (z.state === 'perseguir' || Math.random() < 0.3)) { z.burstT = 1.2; z.burstCD = rand(3, 5); if (Math.random() < 0.4) say('br_jaranero', z, '¡Jarana, jarana!'); } }
      if (z.zapCD > 0) z.zapCD -= dt;
      if (z.zapT > 0) {
        z.zapT -= dt; z.moving = false;
        if (Math.floor(z.zapT * 16) % 2 === 0 && !z.zapS) { z.zapS = true; sfx('br.zapateo', { x: z.x, y: z.y, n: Math.floor(Math.random() * 3) }); } else if (Math.floor(z.zapT * 16) % 2) z.zapS = false;
        if (z.zapT <= 0) {
          z.zapCD = 2.4;
          if (d < 22 && sameLayer(G, z) && G.state === 'playing') {
            var a = Math.atan2(p.y - z.y, p.x - z.x);
            hurt(G, 4, { push: { x: Math.cos(a), y: Math.sin(a), f: 60 }, src: 'br_jaranero' });
            popText('¡ZAPATEO!', z.x, z.y - 30, '#ffc766'); sfx('br.zapateo.empuja', { x: z.x, y: z.y });
          }
        }
        return true;
      }
      if (z.zapCD <= 0 && d < 18 && sameLayer(G, z) && (z.state === 'perseguir' || z.state === 'atacar')) { z.zapT = 0.45; z.zapS = false; return true; }
      return false;
    }
  };

  /* ---------------- Proyectiles, manchas, muertes ---------------- */
  function slow(p, t, mul) { p.brSlowT = Math.max(p.brSlowT || 0, t); p.brSlowMul = Math.min(p.brSlowMul && p.brSlowT > 0 ? p.brSlowMul : 1, mul); }
  function updateFx(G, dt) {
    var p = G.player, i, W = ACH.world;
    if (p.brSlowT > 0) { p.brSlowT -= dt; if (p.brSlowT <= 0) { p.brSlowT = 0; p.brSlowMul = 1; } }
    for (i = letras.length - 1; i >= 0; i--) {
      var L = letras[i]; L.t += dt;
      var a = Math.atan2(p.y - 12 - L.y, p.x - L.x), sp = 34, k = Math.min(1, dt * 1.2);   // giran despacio hacia Alexander
      L.vx += (Math.cos(a) * sp - L.vx) * k; L.vy += (Math.sin(a) * sp - L.vy) * k;
      L.x += L.vx * dt; L.y += L.vy * dt;
      if (L.t > 4) { letras.splice(i, 1); continue; }
      if (p.hp > 0 && dist(L.x, L.y, p.x, p.y - 10) < 9 && (!!L.up === !!p.brUp || !inOZ(p))) {
        letras.splice(i, 1); slow(p, 1.5, 0.6); sfx('br.letra.golpe', { x: p.x, y: p.y }); popText('¡LENTO!', p.x, p.y - 30, '#b06af0');
      }
    }
    for (i = brochas.length - 1; i >= 0; i--) {
      var B = brochas[i]; B.t += dt; B.x += B.vx * dt; B.y += B.vy * dt;
      var gone = dist(B.x0, B.y0, B.x, B.y) >= B.L, hitP = p.hp > 0 && dist(B.x, B.y, p.x, p.y - 8) < 10 && (!!B.up === !!p.brUp || !inOZ(p));
      if (hitP && G.state === 'playing') { hurt(G, U, { push: { x: B.vx / 170, y: B.vy / 170, f: 20 }, src: 'br_pintor' }); sfx('br.brochazo.splat', { x: B.x, y: B.y, hit: true }); }
      if (hitP || gone || B.t > 1.2) {
        brochas.splice(i, 1);
        var my = hitP ? p.y : B.y + 12;
        if (!W.collideCircle(B.x, my, 2)) { manchas.push({ x: B.x, y: my, t: 0, col: B.col, r: 14 }); if (manchas.length > 10) manchas.shift(); sfx('br.mancha', { x: B.x, y: my }); }
      }
    }
    var inM = false;
    for (i = manchas.length - 1; i >= 0; i--) { var Mn = manchas[i]; Mn.t += dt; if (Mn.t > 9) { manchas.splice(i, 1); continue; } if (Math.abs(p.x - Mn.x) < Mn.r && Math.abs(p.y - Mn.y) < Mn.r * 0.6) inM = true; }
    p.brPaint = inM;
    for (i = notas.length - 1; i >= 0; i--) { notas[i].t += dt; notas[i].y -= 14 * dt; if (notas[i].t > 1.2) notas.splice(i, 1); }
    for (i = tears.length - 1; i >= 0; i--) { var Tt = tears[i]; Tt.t += dt; Tt.y += Tt.vy * dt; Tt.vy += 60 * dt; if (Tt.t > 0.5) tears.splice(i, 1); }
    for (i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; if (texts[i].t > 1) texts.splice(i, 1); }
  }
  function updateZombies(G, dt) {
    var Z = G.zombies, p = G.player, i, j, z;
    for (i = 0; i < Z.length; i++) { z = Z[i]; if (z.type !== 'br_jaranero') z.brSpd = 0; }
    for (i = 0; i < Z.length; i++) {
      z = Z[i];
      // el aura del músico (+25 %)
      if (z.type === 'br_musico' && z.brPlay && z.state !== 'muerto') {
        for (j = 0; j < Z.length; j++) { var o = Z[j]; if (o !== z && o.state !== 'muerto' && Math.abs(o.x - z.x) < 90 && Math.abs(o.y - z.y) < 90 && dist(o.x, o.y, z.x, z.y) < 90) o.brSpd = Math.max(o.brSpd || 0, 1.25); }
      }
      // capas del puente: uno abajo no muerde a Alexander arriba (ni al revés)
      if (z.state !== 'muerto' && (inOZ(z) || inOZ(p)) && !!z.brUp !== !!p.brUp && dist(z.x, z.y, p.x, p.y) < 30) { z.atkCD = Math.max(z.atkCD || 0, 0.3); if (z.state === 'atacar') z.state = 'perseguir'; }
      // XP extra al morir
      if (z.state === 'muerto' && !z._brXp) {
        z._brXp = true;
        var xp = XP[z.type]; if (xp && xp > 8 && ACH.hab && ACH.hab.addXP) { try { ACH.hab.addXP(xp - 8, true); } catch (e) { /* nada */ } }
        if (z.brCuaderno && BR.emit) BR.emit('poetaRojo.muerto', z);
      }
    }
  }
  // noche: más jaraneros en las calles bohemias (una vez)
  var nightDone = false;
  function nightSpawns(G) {
    if (nightDone) return;
    var N = ACH.noche, W = ACH.world, p = G.player;
    if (!(N && N.isNight && N.isNight()) || !W.zona || W.zona(p.x, p.y) !== 'parque' && W.zona(p.x, p.y) !== 'bohemia') return;
    nightDone = true;
    var cam = G.cam, V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
    NIGHT_SP.forEach(function (q) {
      var x = q[0] * T(), y = q[1] * T();
      if (x > cam.x - 20 && x < cam.x + V.w + 20 && y > cam.y - 20 && y < cam.y + V.h + 40) return;
      placeGroup(G, { type: q[2], x: x, y: y, extra: null, up: false });
    });
  }
  // reaparición por delante de Alexander (no en el corral, la peña por dentro ni la pista)
  function respawnPick(p) {
    var W = ACH.world, c0 = Math.floor(p.x / W.T);
    return { c: Math.max(10, Math.min(W.COLS - 3, c0 + Math.floor(rand(-14, 40)))), r: Math.floor(rand(10, W.ROWS - 4)) };
  }

  /* ---------------- Golpes: letras, caballetes ---------------- */
  function inArc(sw, x, y, extra) {
    var dx = x - sw.x, dy = y - sw.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > (sw.range || 24) + (extra || 10)) return false;
    return d < 8 || Math.abs(wrap(Math.atan2(dy, dx) - (sw.ang || 0))) <= (sw.arc || Math.PI / 2) / 2 + 0.3;
  }
  function onSwing(G, sw) {
    var n = 0, i;
    for (i = letras.length - 1; i >= 0; i--) if (inArc(sw, letras[i].x, letras[i].y + 10, 14)) { letras.splice(i, 1); n++; sfx('br.letra.rompe', { x: sw.x, y: sw.y }); }
    for (i = 0; i < easels.length; i++) {
      var e = easels[i]; if (e.broken || !inArc(sw, e.x, e.y - 6, 10)) continue;
      e.broken = true; n++;
      sfx('br.caballete.rompe', { x: e.x, y: e.y });
      try { if (ACH.inv && ACH.inv.drop) ACH.inv.drop(e.x, e.y + 4, [{ id: 'sencillo', n: 1 + Math.floor(Math.random() * 3) }], true); } catch (er) { /* nada */ }
    }
    return n;
  }
  // onda del cajón / botella: también rompe letras
  function onProjectile(G, pr) {
    if (!pr) return false;
    if (pr.kind === 'cajon' && pr.area) { var r = pr.r || 56; for (var i = letras.length - 1; i >= 0; i--) if (dist(letras[i].x, letras[i].y + 10, pr.x, pr.y) < r) letras.splice(i, 1); }
    return false;
  }

  /* ---------------- Dibujo ---------------- */
  var PAINT = ['#e8382c', '#2a62d0', '#f2c81c', '#2aa860'];
  function drawLetra(g, L, cx, cy) {
    var arr = pjGet('letra'), s = pick(arr, L.i), x = Math.round(L.x - cx), y = Math.round(L.y - cy + Math.sin(L.t * 6) * 1.5);
    if (s) { g.drawImage(s, x - (s.width >> 1), y - (s.height >> 1)); return; }
    g.font = '9px Silkscreen, monospace'; g.textAlign = 'center'; g.fillStyle = '#3a1a5a'; g.fillText('AMOR'.charAt(L.i), x + 1, y + 4); g.fillStyle = '#e6c8ff'; g.fillText('AMOR'.charAt(L.i), x, y + 3); g.textAlign = 'start';
  }
  function drawBrocha(g, B, cx, cy) {
    var base = pjGet('brochazo'), s = base && base.colores ? base.colores[B.col] : base, x = Math.round(B.x - cx), y = Math.round(B.y - cy);
    if (s && Math.floor(B.t * 12) % 2 && s.alt) s = s.alt;
    if (isCv(s)) { g.drawImage(s, x - (s.width >> 1), y - (s.height >> 1)); return; }
    g.fillStyle = '#1c1a22'; g.fillRect(x - 4, y - 3, 8, 6); g.fillStyle = PAINT[B.col]; g.fillRect(x - 3, y - 2, 6, 4);
  }
  function drawMancha(g, M, cx, cy) {
    var base = pjGet('mancha'), s = base && base.v ? base.v[M.col] : base, x = Math.round(M.x - cx), y = Math.round(M.y - cy);
    g.globalAlpha = Math.min(1, (9 - M.t) / 1.5);
    if (isCv(s)) { g.drawImage(s, x - (s.width >> 1) - 4, y - (s.height >> 1), s.width + 8, s.height + 4); }
    else { g.fillStyle = PAINT[M.col]; g.fillRect(x - 10, y - 3, 20, 6); g.fillRect(x - 6, y - 5, 12, 10); }
    g.globalAlpha = 1;
  }
  function drawEasel(g, e, cx, cy) {
    var s = pjGet('caballete'); if (s && e.broken && s.broken) s = s.broken;
    if (blit(g, s, e.x - cx, e.y - cy)) return;
    var x = Math.round(e.x - cx), y = Math.round(e.y - cy);
    g.fillStyle = '#1c1a22'; g.fillRect(x - 7, y - (e.broken ? 10 : 30), 14, e.broken ? 10 : 22);
    g.fillStyle = '#a06a36'; g.fillRect(x - 6, y - (e.broken ? 9 : 29), 12, e.broken ? 8 : 16);
    if (!e.broken) { g.fillStyle = '#f3efe2'; g.fillRect(x - 5, y - 28, 10, 12); g.fillStyle = '#2a62d0'; g.fillRect(x - 3, y - 25, 4, 3); g.fillStyle = '#1c1a22'; g.fillRect(x - 6, y - 8, 1, 8); g.fillRect(x + 5, y - 8, 1, 8); }
  }
  function vis(G, x, y, m) { var c = G.cam, V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }; m = m || 40; return x > c.x - m && x < c.x + V.w + m && y > c.y - m && y < c.y + V.h + m + 20; }

  BR.zombis = {
    TYPES: TYPES, XP: XP,
    popText: function (s, x, y, col) { popText(s, x, y, col); },
    curarLento: function (p) { var had = (p && p.brSlowT > 0); if (p) { p.brSlowT = 0; p.brSlowMul = 1; } return had; },
    letras: function () { return letras.length; }, manchas: function () { return manchas.length; }, caballetes: function () { return easels.map(function (e) { return { x: e.x, y: e.y, roto: e.broken }; }); },
    spawn: function (type, x, y, up) { var G = ACH.G; if (!G) return null; var r = placeGroup(G, { type: type, x: x, y: y, extra: null, up: !!up }); return r.length; },
    state: function () {
      var G = ACH.G, o = {}; (G ? G.zombies : []).forEach(function (z) { if (z.state !== 'muerto') o[z.type] = (o[z.type] || 0) + 1; });
      var p = G && G.player;
      return { vivos: o, letras: letras.length, brochazos: brochas.length, manchas: manchas.length, caballetes: easels.length, nocheExtra: nightDone, lento: p ? +(p.brSlowT || 0).toFixed(2) : 0 };
    }
  };
  if (ACH.cv && ACH.cv !== BR && !ACH.cv.zombis) ACH.cv.zombis = BR.zombis;

  BR.register({
    name: 'zombis',
    reset: function (G) {
      letras.length = 0; brochas.length = 0; manchas.length = 0; notas.length = 0; tears.length = 0; texts.length = 0; nightDone = false;
      if (ENT.CFG) { ENT.CFG.respawnBelow = 16; ENT.CFG.cobradorChance = 0; }
      if (ACH.world) ACH.world.respawnPick = respawnPick;
      if (G.player) { G.player.brSlowT = 0; G.player.brSlowMul = 1; }
      spawnAll(G);
    },
    onRespawn: function (G) { letras.length = 0; brochas.length = 0; if (G.player) { G.player.brSlowT = 0; G.player.brSlowMul = 1; } },
    update: function (G, dt) { updateFx(G, dt); updateZombies(G, dt); nightSpawns(G); },
    speedMul: function (G) { var p = G.player; if (!p) return 1; var k = 1; if (p.brSlowT > 0) k *= (p.brSlowMul || 0.6); if (p.brPaint) k *= 0.7; return k; },
    onSwing: onSwing,
    onProjectile: onProjectile,
    drawables: function (G, out) {
      manchas.forEach(function (m) { if (vis(G, m.x, m.y)) out.push({ y: -1e5 + m.y, x: m.x, draw: function (g, cx, cy) { drawMancha(g, m, cx, cy); } }); });
      easels.forEach(function (e) { if (vis(G, e.x, e.y)) out.push({ y: e.y, x: e.x, draw: function (g, cx, cy) { drawEasel(g, e, cx, cy); } }); });
    },
    drawTop: function (g, G, cx, cy) {
      var i;
      for (i = 0; i < letras.length; i++) if (vis(G, letras[i].x, letras[i].y)) drawLetra(g, letras[i], cx, cy);
      for (i = 0; i < brochas.length; i++) drawBrocha(g, brochas[i], cx, cy);
      var nt = pjGet('notitas');
      for (i = 0; i < notas.length; i++) {
        var n = notas[i]; if (!vis(G, n.x, n.y)) continue;
        g.globalAlpha = Math.max(0, 1 - n.t / 1.2);
        var s = pick(nt, n.k); if (s) g.drawImage(s, Math.round(n.x - cx - 5), Math.round(n.y - cy - 6)); else { g.fillStyle = n.k ? '#a8e8ff' : '#ffc766'; g.fillRect(Math.round(n.x - cx), Math.round(n.y - cy), 3, 3); g.fillRect(Math.round(n.x - cx) + 2, Math.round(n.y - cy) - 5, 1, 5); }
      }
      g.globalAlpha = 1; g.fillStyle = '#8fd0f0';
      for (i = 0; i < tears.length; i++) g.fillRect(Math.round(tears[i].x - cx), Math.round(tears[i].y - cy), 1, 2);
      if (!texts.length) return;
      g.font = '7px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (i = 0; i < texts.length; i++) {
        var t = texts[i], x = Math.round(t.x - cx), y = Math.round(t.y - cy - t.t * 14);
        g.globalAlpha = Math.max(0, 1 - t.t); g.fillStyle = '#131015'; g.fillText(t.s, x + 1, y + 1); g.fillStyle = t.col; g.fillText(t.s, x, y);
      }
      g.globalAlpha = 1; g.textAlign = 'start'; g.textBaseline = 'alphabetic';
    }
  });
})();
