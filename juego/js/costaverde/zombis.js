/* ACHORADO — js/costaverde/zombis.js (C1a): los zombies de la Costa Verde (COSTAVERDE.md §3).
   Tipos nuevos en ACH.ent.ZT (extensión en tiempo de ejecución, sin tocar el motor) con su comportamiento en ACH.zbeh[tipo]
   = {init, update → true si ya lo manejó, onHit, onDeath} (el mismo gancho que senoras.js). Skins en ACH.sprites.zvar['cv_…'] (C2c);
   si falta, se hornea uno provisorio (caminante + color de ropa), como trabajadores.js.
     cv_corredor      todo el malecón · corre en línea recta por los caminos (×1.6), vida 1.5, frena al chocar
     cv_pareja        Parque del Amor · dos abrazados (vida 4); a la mitad se separan en dos caminantes
     cv_turista       Amor → Salazar · lento; al verte, a veces flash de selfie (0.3 s) que avisa a los zombies a 120 px
     cv_surfista      Amor y Letonia · tabla bajo el brazo, golpe ancho (140°) que empuja, vida 3
     cv_parapentista  parapuerto y Amor · cae del cielo (sombra 1.2 s), deja el parapente tirado (se rompe), 1 de daño si cae encima; máx. 1 c/15 s
     cv_trabajador    terrazas A–C · uniforme de la tienda más cercana (cv_trab_<marca>), lento, no se aleja de su local
     cv_seguridad     terrazas B y C · chaleco y gorra, vida 5, lento, empuja fuerte
   Más algunos caminantes sueltos. Densidad: más que el Kennedy, menos que el Callao (≈ 40 al empezar, reaparición hasta 16 vivos).
   ACH.cv.zSpawns() → los puntos de aparición (para spawnCheck). ACH.cv.zombis.state() para QA. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var CV = ACH.cv = ACH.cv || ACH.mira || {}; CV.systems = CV.systems || [];
  if (!CV.register) CV.register = function (s) { CV.systems.push(s); return s; };
  var ENT = ACH.ent, ZT = ENT && ENT.ZT;
  var U = CV.U || 10;   // «1 de daño» del contrato = un mordisco (10 de 100)
  if (!ZT) { console.warn('[ACHORADO cv] zombis.js: falta ACH.ent'); return; }

  var TYPES = {
    cv_corredor: { hp: 1.5, speed: 51, anim: 12, sight: 85, dmg: 8, blind: false, lunge: false },
    cv_pareja: { hp: 4, speed: 24, anim: 6, sight: 80, dmg: 12, blind: false, lunge: false },
    cv_turista: { hp: 2, speed: 20, anim: 5.5, sight: 110, dmg: 8, blind: false, lunge: false },
    cv_surfista: { hp: 3, speed: 30, anim: 7, sight: 90, dmg: 10, blind: false, lunge: false },
    cv_parapentista: { hp: 2, speed: 32, anim: 7.4, sight: 90, dmg: 10, blind: false, lunge: true },
    cv_trabajador: { hp: 2, speed: 22, anim: 6, sight: 75, dmg: 8, blind: false, lunge: false },
    cv_seguridad: { hp: 5, speed: 19, anim: 5.5, sight: 95, dmg: 12, blind: false, lunge: false },
    // v0.13 T2 (E2): barista (tira vasos calientes) y rey del selfie (flash en cadena). E1: el turista del dron (mini-jefe, dron.js)
    cv_barista: { hp: 3, speed: 21, anim: 6, sight: 130, dmg: 8, blind: false, lunge: false },
    cv_reySelfie: { hp: 3, speed: 20, anim: 5.5, sight: 135, dmg: 8, blind: false, lunge: false },
    cv_dronero: { hp: 12, speed: 24, anim: 6, sight: 220, dmg: 10, blind: false, lunge: false }
  };
  for (var tk in TYPES) if (!ZT[tk]) ZT[tk] = TYPES[tk];
  var SKIN_COL = { cv_corredor: ['#1fe07a', '#131015'], cv_turista: ['#e8b830', '#d8402c'], cv_surfista: ['#2a3a5a', '#2fb8e8'],
    cv_parapentista: ['#e84a8a', '#ffe500'], cv_seguridad: ['#2a2a30', '#e8e830'], cv_trabajador: ['#888888', '#ffffff'],
    cv_barista: ['#00704A', '#f3efe2'], cv_reySelfie: ['#7a2ab8', '#ffd200'], cv_dronero: ['#e86a1a', '#2fb8e8'] };

  function T() { return (ACH.world && ACH.world.T) || 16; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function sfx(n, d) { if (CV.sfx) CV.sfx(n, d); }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function mkc(w, h) { return CV.mk ? CV.mk(w, h) : (function () { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; })(); }

  /* ---------------- Skins (provisorios si C2c no llegó) ---------------- */
  function baseSkin() {
    var S = ACH.sprites, L = S && S.zvarList, Z = S && S.zvar, i;
    if (!Z) return null;
    if (Array.isArray(L)) for (i = 0; i < L.length; i++) if (L[i].loco === 'camina' && /normal/.test(L[i].skin) && Z[L[i].skin] && Z[L[i].skin].move) return Z[L[i].skin];
    if (Array.isArray(L)) for (i = 0; i < L.length; i++) if (L[i].loco === 'camina' && Z[L[i].skin] && Z[L[i].skin].move) return Z[L[i].skin];
    for (var k in Z) if (/^camina_/.test(k) && Z[k] && Z[k].move) return Z[k];
    return null;
  }
  function baseSkinKey() {
    var S = ACH.sprites, L = S && S.zvarList, Z = S && S.zvar;
    if (Array.isArray(L)) for (var i = 0; i < L.length; i++) if (L[i].loco === 'camina' && Z && Z[L[i].skin]) return L[i].skin;
    return null;
  }
  function paint(src, bg, fg, dead) {
    if (!src || !src.width) return src;
    var c = mkc(src.width, src.height), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    var w = src.width, h = src.height;
    if (dead) { g.fillStyle = bg; g.fillRect(Math.floor(w * 0.3), Math.floor(h * 0.25), Math.ceil(w * 0.35), Math.ceil(h * 0.5)); }
    else {
      g.fillStyle = bg; g.fillRect(Math.floor(w * 0.28), Math.floor(h * 0.36), Math.ceil(w * 0.44), Math.ceil(h * 0.34));
      g.fillStyle = fg; g.fillRect(Math.floor(w * 0.28), Math.floor(h * 0.36), Math.ceil(w * 0.44), 1); g.fillRect(Math.floor(w * 0.3), Math.floor(h * 0.08), Math.ceil(w * 0.4), 2);
    }
    g.globalCompositeOperation = 'source-over';
    c.ax = src.ax; c.ay = src.ay; c.prov = true;
    return c;
  }
  function pair(src) {   // pareja provisoria: dos caminantes pegados
    if (!src || !src.width) return src;
    var w = src.width + 8, c = mkc(w, src.height), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0); g.drawImage(src, 8, 1);
    c.ax = (src.ax === undefined ? src.width >> 1 : src.ax) + 4; c.ay = src.ay === undefined ? src.height - 1 : src.ay; c.prov = true;
    return c;
  }
  function mapF(o, fn) { if (Array.isArray(o)) return o.map(fn); return o && o.width ? fn(o) : o; }
  function hasSkin(k) { var Z = ACH.sprites && ACH.sprites.zvar; var s = null; try { s = Z && Z[k]; } catch (e) { s = null; } return !!(s && (s.move || s.walk)); }
  function ensureSkins() {
    var S = ACH.sprites; if (!S) return;
    S.zvar = S.zvar || {};
    var base = baseSkin();
    Object.keys(SKIN_COL).forEach(function (k) {
      if (k === 'cv_trabajador' || hasSkin(k) || !base) return;
      var C = SKIN_COL[k];
      S.zvar[k] = { move: mapF(base.move, function (f) { return paint(f, C[0], C[1]); }), hurt: mapF(base.hurt, function (f) { return f; }), dead: mapF(base.dead, function (f) { return paint(f, C[0], C[1], true); }), prov: true };
    });
    // la pareja: el sprite doble de C2c {walk:{dir:[4]}, hurt:{dir:[4]}} se pasa al formato zvar (move/hurt/dead) en 'cv_pareja'
    var PJ = S.cv && S.cv.pj, pj = PJ && PJ.pareja;
    var have = null; try { have = S.zvar.cv_pareja; } catch (e) { have = null; }
    if (!have || have.prov) {
      if (pj && pj.walk) {
        var wk = pj.walk.right || pj.walk.left || pj.walk.down, hu = pj.hurt && (pj.hurt.right || pj.hurt.left || pj.hurt.down);
        if (wk && wk.length) S.zvar.cv_pareja = { move: wk, hurt: hu || wk, dead: base ? base.dead : wk[0] };
      } else if (base && !have) S.zvar.cv_pareja = { move: mapF(base.move, pair), hurt: mapF(base.hurt, pair), dead: base.dead, prov: true };
    }
    // trabajadores de Larcomar: cv_trab_<marca> (C2c) o mandil de la marca
    var brands = {}; (ACH.world.shops || []).forEach(function (s) { brands[s[1]] = 1; });
    Object.keys(brands).forEach(function (b) {
      var key = 'cv_trab_' + b; if (hasSkin(key) || !base) return;
      var C = CV.brandColors ? CV.brandColors(b) : { bg: '#888', fg: '#fff' };
      S.zvar[key] = { move: mapF(base.move, function (f) { return paint(f, C.bg, C.fg); }), hurt: base.hurt, dead: mapF(base.dead, function (f) { return paint(f, C.bg, C.fg, true); }), prov: true };
    });
  }

  /* ---------------- Aparición ---------------- */
  var SP = [];   // {type, x, y, extra}
  function px(c, r) { return { x: Math.round(c * T()), y: Math.round(r * T()) }; }
  function buildSpawns() {
    SP.length = 0;
    function add(type, c, r, extra) { var q = px(c, r); q.type = type; q.extra = extra || null; SP.push(q); }
    // caminantes sueltos por el malecón (y en la pista)
    [[24, 27], [40, 25], [62, 28], [70, 30.5], [102, 24], [142, 30], [178, 24], [208, 28], [222, 23], [248, 27], [60, 14.5], [120, 15.5], [200, 15.5], [280, 14.5]].forEach(function (q) { add('caminante', q[0], q[1]); });
    // corredores: por los caminos (fila 29.5) y la ciclovía
    [[34, 29.5], [76, 29.6], [118, 29.5], [186, 29.5], [228, 29.4], [64, 20]].forEach(function (q, i) { add('cv_corredor', q[0], q[1], { dir: i % 2 ? -1 : 1 }); });
    // parejas en el Parque del Amor
    [[110, 27], [134, 27.5], [141, 30]].forEach(function (q) { add('cv_pareja', q[0], q[1]); });
    // turistas con selfie: Amor → Salazar
    [[124, 30], [146, 26], [182, 30], [232, 31], [268, 29.5]].forEach(function (q) { add('cv_turista', q[0], q[1]); });
    // surfistas (bajadas a la playa): Amor y Letonia
    [[116, 30.5], [134, 24], [228, 28], [242, 25]].forEach(function (q) { add('cv_surfista', q[0], q[1]); });
    // Larcomar: trabajadores en A–C (en la puerta de su local) y seguridad en B y C
    var D = ACH.world.doors || {}, pick = [['A', 'nike'], ['A', 'tanta'], ['A', 'mangos'], ['A', 'popular'], ['A', 'pardos'], ['B', 'cinepolis'], ['B', 'hm'], ['B', 'adidas'], ['B', 'starbucks'],
      ['C', 'salazar'], ['C', 'haagendazs'], ['C', 'masterkong']];
    pick.forEach(function (p) { var d = D[p[1]] && D[p[1]][0]; if (d) { var q = { type: 'cv_trabajador', x: d.x, y: d.y + 6, extra: { brand: p[1], terr: p[0] } }; SP.push(q); } });
    [[268, 52.5], [290, 52], [282, 61.2], [262, 64.2]].forEach(function (q) { add('cv_seguridad', q[0], q[1]); });
    // v0.13 T2 (E1): los valles ya no están vacíos (faro, puente, Letonia)
    [[14, 24], [20, 31], [27, 22.5], [5, 23], [156, 14.2], [166, 15.8], [160, 26.6], [169, 27.2], [221, 26], [236, 22.6], [245, 30.6], [230, 31.4]].forEach(function (q) { add('caminante', q[0], q[1]); });
    [[10, 29.5, 1], [152, 26.5, 1], [241, 20, -1], [214, 29.5, -1]].forEach(function (q) { add('cv_corredor', q[0], q[1], { dir: q[2] }); });
    add('cv_surfista', 238, 30.4); add('cv_turista', 226, 24.4); add('cv_surfista', 18, 27);
    // v0.13 T2 (E2): barista en la puerta del Starbucks y reyes del selfie en las terrazas A y C
    var sb = D.starbucks && D.starbucks[0]; if (sb) SP.push({ type: 'cv_barista', x: sb.x + 20, y: sb.y + 8, extra: null });
    add('cv_barista', 272, 61.2); add('cv_reySelfie', 277, 41.6); add('cv_reySelfie', 284, 63.4);
  }
  CV.zSpawns = function () { if (!SP.length && ACH.world) buildSpawns(); return SP.slice(); };

  function mk(type, x, y) {
    var z = ENT.makeZombie(type, x, y, { loco: 'camina' });
    if (ACH.zvar && ACH.zvar.setLoco && z.loco !== 'camina') { try { ACH.zvar.setLoco(z, 'camina', Math.random); } catch (e) { /* nada */ } }
    z.loco = z.loco || 'camina'; z.shield = false; z.low = false; z.punch3 = false;
    z.hp = ZT[type] ? ZT[type].hp : z.hp; z.hpMax = z.hp;
    z.cv = true;
    if (type !== 'caminante' && type !== 'cv_trabajador' && hasSkin(type)) z.skin = type;
    if (type === 'cv_pareja' && hasSkin('cv_pareja')) z.skin = 'cv_pareja';
    z.flip = Math.random() < 0.5;
    return z;
  }
  var crew = [];
  function spawnAll(G) {
    crew.length = 0;
    ensureSkins(); buildSpawns();
    var W = ACH.world, R = (ENT.CFG.zRadius) || 5;
    SP.forEach(function (s) {
      var x = s.x, y = s.y;
      if (W.collideCircle(x, y, R)) return;
      var z = mk(s.type, x, y);
      if (s.type === 'cv_corredor') { z.jog = (s.extra && s.extra.dir) || 1; z.jogY = y; }
      if (s.type === 'cv_trabajador' && s.extra) {
        z.brand = s.extra.brand; z.terr = s.extra.terr; z.homeX = x; z.homeY = y;
        if (hasSkin('cv_trab_' + z.brand)) z.skin = 'cv_trab_' + z.brand;
      }
      if (s.type === 'cv_seguridad' || s.type === 'cv_barista') { z.homeX = x; z.homeY = y; }
      G.zombies.push(z); crew.push(z);
    });
  }

  /* ---------------- Ataque propio (surfista: arco ancho; seguridad: empujón fuerte) ---------------- */
  function hurt(G, dmg, opts) { if (ENT.hurtPlayer) return ENT.hurtPlayer(G, dmg, opts); G.player.hp = Math.max(0, G.player.hp - dmg); return true; }
  // true = manejó el paso (cuerpo a cuerpo). range: alcance; arc: abertura total (rad); push: px; wind: aviso (s)
  function melee(G, z, dt, o) {
    var p = G.player; if (!(p.hp > 0) || G.state !== 'playing') return false;
    var d = dist(z.x, z.y, p.x, p.y);
    if (z.cvWind > 0) {
      z.moving = false; z.cvWind -= dt;
      if (z.cvWind <= 0) {
        z.cvWind = 0; z.atkCD = ENT.CFG.zAttackCD * (o.cd || 1);
        var a = Math.atan2(p.y - z.y, p.x - z.x), face = z.cvFace;
        if (d <= o.range && Math.abs(wrap(a - face)) <= o.arc / 2) {
          sfx(o.sfx || 'zombie.bite', { x: z.x, y: z.y, type: z.type });
          hurt(G, o.dmg, { push: { x: Math.cos(a), y: Math.sin(a), f: o.push }, src: z.type });
        } else sfx('whiff', { x: z.x, y: z.y });
      }
      return true;
    }
    if ((z.state === 'perseguir' || z.state === 'atacar') && d <= o.range - 2 && z.atkCD <= 0) {
      z.state = 'atacar'; z.cvWind = o.wind; z.cvFace = Math.atan2(p.y - z.y, p.x - z.x); z.flip = p.x < z.x; z.moving = false;
      return true;
    }
    if (z.state === 'atacar' && d <= ENT.CFG.zAttackRange + 2) { z.moving = false; if (p.x < z.x - 0.5) z.flip = true; else if (p.x > z.x + 0.5) z.flip = false; return true; }   // espera su golpe (no muerde)
    return false;
  }

  /* ---------------- Comportamientos (ACH.zbeh) ---------------- */
  var ZB = ACH.zbeh = ACH.zbeh || {};
  function seesNear(G, z, k) {
    var p = G.player, d = ZT[z.type];
    if (!(p.hp > 0) || p.invisT > 0) return false;
    return dist(z.x, z.y, p.x, p.y) < d.sight * (k || 1) && ACH.world.los(z.x, z.y - 6, p.x, p.y - 6);
  }
  // corredor: trota en línea recta por su camino; al chocar frena (0.6 s) y da la vuelta. Si te ve, el motor lo hace perseguir (×1.6).
  ZB.cv_corredor = {
    update: function (G, z, dt) {
      if (z.cvBrakeT > 0) { z.cvBrakeT -= dt; z.moving = false; return true; }
      if (z.state === 'deambular' && !seesNear(G, z)) {
        var W = ACH.world, sp = ZT.cv_corredor.speed * 0.75, dir = z.jog || 1;
        var vy = ((z.jogY || z.y) - z.y) * 2;
        var hit = W.moveCircle(z, dir * sp * dt, vy * dt, ENT.CFG.zRadius);
        z.moving = true; z.flip = dir < 0;
        if (hit) { z.jog = -dir; z.cvBrakeT = 0.6; sfx('zombie.idle', { x: z.x, y: z.y, type: z.type }); }
        return true;
      }
      // persiguiendo: si se queda pegado contra algo, frena
      if (z.state === 'perseguir') {
        var mv = dist(z.x, z.y, z._lx === undefined ? z.x : z._lx, z._ly === undefined ? z.y : z._ly);
        if (z._lx !== undefined && mv < ZT.cv_corredor.speed * dt * 0.15) { z._stk = (z._stk || 0) + dt; if (z._stk > 0.12) { z._stk = 0; z.cvBrakeT = 0.6; } }
        else z._stk = 0;
      }
      z._lx = z.x; z._ly = z.y;
      return false;
    }
  };
  // pareja: a la mitad de la vida se separan en dos caminantes
  var texts = [];
  function popText(s, x, y, col) { texts.push({ s: s, x: x, y: y, t: 0, col: col || '#ffe500' }); if (texts.length > 6) texts.shift(); }
  ZB.cv_pareja = {
    update: function (G, z) {
      if (!z.cvSplit && z.hp > 0 && z.hp <= (z.hpMax || 4) / 2) {
        z.cvSplit = true;
        var hp = Math.max(1, z.hp), bk = baseSkinKey();
        z.type = 'caminante'; z.hp = hp; z.hpMax = 2; if (bk) z.skin = bk; else delete z.skin;
        var o = mk('caminante', z.x + 8, z.y + 2); o.hp = hp; o.hpMax = 2; o.state = 'perseguir'; o.lastX = G.player.x; o.lastY = G.player.y;
        if (G.world !== undefined) { /* nada */ }
        ACH.world.moveCircle(o, 0, 0, ENT.CFG.zRadius);
        G.zombies.push(o);
        z.x -= 4; z.state = 'perseguir';
        popText('¡SE SEPARARON!', z.x, z.y - 30, '#ff2e88');
        sfx('zombie.alert', { x: z.x, y: z.y, type: 'caminante' });
        return true;
      }
      return false;
    }
  };
  // turista: al verte, a veces un flash de selfie que avisa a los zombies cercanos
  var flashes = [];
  ZB.cv_turista = {
    init: function (G, z) { z.flashCD = rand(2, 5); },
    update: function (G, z, dt) {
      if (z.flashT > 0) { z.flashT -= dt; z.moving = false; return true; }
      if (z.flashCD > 0) z.flashCD -= dt;
      if ((z.state === 'perseguir' || z.state === 'atacar') && z.flashCD <= 0 && seesNear(G, z, 1.4)) {
        z.flashCD = rand(5, 9);
        if (Math.random() < 0.6) {
          z.flashT = 0.3; flashes.push({ x: z.x, y: z.y - 18, t: 0 });
          sfx('cv.selfie', { x: z.x, y: z.y }); if (CV.say) CV.say('cv.turista', { who: 'turista', x: z.x, y: z.y }, '¡Selfie, selfie!');
          var p = G.player, n = 0;
          for (var i = 0; i < G.zombies.length; i++) {
            var o = G.zombies[i];
            if (o === z || o.state === 'muerto' || o.social || dist(o.x, o.y, z.x, z.y) > 120) continue;
            if (o.state === 'deambular' || o.state === 'investigar') { o.state = 'perseguir'; o.lostT = 0; o.lastX = p.x; o.lastY = p.y; n++; }
          }
          if (n) popText('¡FLASH!', z.x, z.y - 30, '#ffffff');
          return true;
        }
      }
      return false;
    }
  };
  // surfista: golpe ancho con la tabla (140°) que empuja
  ZB.cv_surfista = { update: function (G, z, dt) { return melee(G, z, dt, { range: 20, arc: 140 * Math.PI / 180, push: 34, wind: 0.35, dmg: ZT.cv_surfista.dmg, sfx: 'cv.tabla' }); } };
  // seguridad: lento, vida 5, empujón fuerte; no se aleja mucho de su puesto
  ZB.cv_seguridad = {
    update: function (G, z, dt) {
      if (melee(G, z, dt, { range: 15, arc: 100 * Math.PI / 180, push: 56, wind: 0.4, dmg: ZT.cv_seguridad.dmg, cd: 1.3 })) return true;
      if (z.state === 'deambular' && z.homeX !== undefined) leash(z, 60);
      return false;
    }
  };
  // trabajador de Larcomar: sigue en su chamba (como los del Kennedy)
  ZB.cv_trabajador = { update: function (G, z) { if (z.state === 'deambular' && z.homeX !== undefined) leash(z, 40); return false; } };
  function leash(z, R) {
    var dx = z.homeX - z.x, dy = z.homeY - z.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > R) { z.wx = dx / d; z.wy = dy / d; z.wT = Math.max(z.wT || 0, 0.6); }
  }
  ZB.cv_parapentista = {};

  /* ---------------- v0.13 T2 (E2): barista y rey del selfie ---------------- */
  // barista: a media distancia levanta el vaso (0.45 s de aviso) y lo tira; el vaso caliente vuela recto y quema (8) al tocar
  var cups = [], white = { t: 0 };
  var CUP = { sp: 150, life: 1.4, r: 9, dmg: 8, wind: 0.45, cd: [2.6, 3.8], min: 34, max: 160 };
  ZB.cv_barista = {
    init: function (G, z) { z.cupCD = rand(1, 2.5); },
    update: function (G, z, dt) {
      var p = G.player;
      z.zpose = z.cupWind > 0 ? 'windup' : null; z.zposeF = z.cupWind > 0.22 ? 0 : 1;   // v0.13 T3 (S): cuadro de lanzamiento del skin propio
      if (z.cupWind > 0) {
        z.moving = false; z.cupWind -= dt;
        if (z.cupWind <= 0) {
          var a = Math.atan2(p.y - 8 - (z.y - 14), p.x - z.x);
          cups.push({ x: z.x, y: z.y - 14, vx: Math.cos(a) * CUP.sp, vy: Math.sin(a) * CUP.sp, t: 0, gy: z.y, spin: 0 });
          sfx('whiff', { x: z.x, y: z.y }); if (Math.random() < 0.4) popText('¡SU LATTE!', z.x, z.y - 30, '#e8d0a0');
          z.cupCD = rand(CUP.cd[0], CUP.cd[1]);
        }
        return true;
      }
      if (z.cupCD > 0) z.cupCD -= dt;
      var d = dist(z.x, z.y, p.x, p.y);
      if ((z.state === 'perseguir' || z.state === 'atacar') && z.cupCD <= 0 && d > CUP.min && d < CUP.max && seesNear(G, z, 1.3)) {
        z.cupWind = CUP.wind; z.flip = p.x < z.x; z.moving = false; return true;
      }
      if (z.state === 'deambular' && z.homeX !== undefined) leash(z, 50);
      return false;
    }
  };
  // rey del selfie: al verte hace 3 flashes seguidos (0.45 s entre uno y otro): cada uno avisa a los zombis a 160 px y, si estás cerca, te encandila 0.3 s
  var RS = { gap: 0.45, n: 3, alert: 160, dazR: 110, daz: 0.3, cd: [6, 9] };
  ZB.cv_reySelfie = {
    init: function (G, z) { z.chainCD = rand(1.5, 3); z.chainN = 0; },
    update: function (G, z, dt) {
      var p = G.player;
      z.zpose = z.chainN > 0 ? 'windup' : null; z.zposeF = z.chainT > 0.12 ? 0 : 1;   // v0.13 T3 (S): cuadro del flash del skin propio
      if (z.chainN > 0) {
        z.moving = false; z.chainT -= dt;
        if (z.chainT <= 0) {
          z.chainN--; z.chainT = RS.gap;
          flashes.push({ x: z.x, y: z.y - 20, t: 0 }); sfx('cv.selfie', { x: z.x, y: z.y });
          for (var i = 0; i < G.zombies.length; i++) {
            var o = G.zombies[i];
            if (o === z || o.state === 'muerto' || o.social || dist(o.x, o.y, z.x, z.y) > RS.alert) continue;
            if (o.state === 'deambular' || o.state === 'investigar') { o.state = 'perseguir'; o.lostT = 0; o.lastX = p.x; o.lastY = p.y; }
          }
          if (p.hp > 0 && !(p.invisT > 0) && dist(z.x, z.y, p.x, p.y) < RS.dazR) { p.stunT = Math.max(p.stunT || 0, RS.daz); white.t = 0.22; }
          if (!z.chainN) { z.chainCD = rand(RS.cd[0], RS.cd[1]); popText('¡#SINFILTRO!', z.x, z.y - 32, '#ffd200'); }
        }
        return true;
      }
      if (z.chainCD > 0) z.chainCD -= dt;
      if ((z.state === 'perseguir' || z.state === 'atacar') && z.chainCD <= 0 && seesNear(G, z, 1.2)) {
        z.chainN = RS.n; z.chainT = 0.25; z.flip = p.x < z.x;
        if (CV.say) CV.say('cv.turista', { who: 'turista', x: z.x, y: z.y }, '¡Story, story, story!');
        return true;
      }
      return false;
    }
  };
  function updateCups(G, dt) {
    var p = G.player, W = ACH.world;
    if (white.t > 0) white.t -= dt;
    for (var i = cups.length - 1; i >= 0; i--) {
      var c = cups[i]; c.t += dt; c.x += c.vx * dt; c.y += c.vy * dt; c.gy += c.vy * dt; c.spin += dt * 14;
      var hitP = p.hp > 0 && G.state === 'playing' && dist(c.x, c.y, p.x, p.y - 8) < CUP.r;
      if (hitP) { hurt(G, CUP.dmg, { push: { x: c.vx, y: c.vy, f: 18 }, src: 'cv_barista' }); popText('¡QUEMA!', p.x, p.y - 30, '#ff7a3a'); }
      if (hitP || c.t > CUP.life || W.collideCircle(c.x, c.y + 10, 2)) { if (!hitP) sfx('glass', { x: c.x, y: c.y }); cups.splice(i, 1); }
    }
  }
  function drawCup(g, c, cx, cy) {
    var x = Math.round(c.x - cx), y = Math.round(c.y - cy), k = Math.floor(c.spin) % 2;
    g.fillStyle = '#131015'; g.fillRect(x - 3, y - 4, 6 + k, 8);
    g.fillStyle = '#f3efe2'; g.fillRect(x - 2, y - 3, 4 + k, 6);
    g.fillStyle = '#00704A'; g.fillRect(x - 2, y - 1, 4 + k, 2);
    g.fillStyle = '#7a4a2a'; g.fillRect(x - 2, y - 4, 4 + k, 1);
    g.fillStyle = 'rgba(243,239,226,.55)'; g.fillRect(x - 1 + (k ? 1 : 0), y - 7, 1, 2); g.fillRect(x + 1, y - 9, 1, 2);
  }
  // accesorios encima del skin provisorio: vaso + gorrita verde (barista), corona y celular en palo (rey del selfie)
  function drawAccessory(g, z, cx, cy) {
    var x = Math.round(z.x - cx), y = Math.round(z.y - cy), f = z.flip ? -1 : 1;
    // v0.13 T3 (S): con el skin propio (js/sprites/zombis-v013.js) la gorra, el vaso, la corona y el palo ya van dibujados en el sprite
    var Zv = ACH.sprites && ACH.sprites.zvar, Sk = null; try { Sk = Zv && z.skin && Zv[z.skin]; } catch (e) { Sk = null; }
    if (Sk && !Sk.prov) return;
    if (z.type === 'cv_barista') {
      g.fillStyle = '#131015'; g.fillRect(x - 5, y - 31, 10, 3); g.fillStyle = '#00704A'; g.fillRect(x - 4, y - 30, 8, 2);
      var up = z.cupWind > 0 ? -8 : 0;
      g.fillStyle = '#131015'; g.fillRect(x + f * 6 - 2, y - 17 + up, 5, 6); g.fillStyle = '#f3efe2'; g.fillRect(x + f * 6 - 1, y - 16 + up, 3, 4); g.fillStyle = '#00704A'; g.fillRect(x + f * 6 - 1, y - 14 + up, 3, 1);
    } else if (z.type === 'cv_reySelfie') {
      g.fillStyle = '#131015'; g.fillRect(x - 5, y - 34, 10, 4); g.fillStyle = '#ffd200'; g.fillRect(x - 4, y - 33, 8, 2); g.fillRect(x - 4, y - 35, 1, 2); g.fillRect(x - 1, y - 35, 2, 2); g.fillRect(x + 3, y - 35, 1, 2);
      g.fillStyle = '#131015'; g.fillRect(x + f * 6, y - 26, 1, 12); g.fillRect(x + f * 7 - 2, y - 30, 4, 5);
      g.fillStyle = z.chainN > 0 && Math.floor((z.chainT || 0) * 20) % 2 ? '#ffffff' : '#2fb8e8'; g.fillRect(x + f * 7 - 1, y - 29, 2, 3);
    }
  }

  /* ---------------- Parapentistas que caen del cielo ---------------- */
  var K = { every: 15, warn: 1.2, hitR: 13, zones: [[30, 70], [100, 150]], maxWreck: 4 };
  var drops = [], wrecks = [], dropCD = 6;
  function inDropZone(p) {
    var c = p.x / T(); if (p.y > 33 * T()) return false;
    for (var i = 0; i < K.zones.length; i++) if (c >= K.zones[i][0] && c <= K.zones[i][1]) return true;
    return false;
  }
  function freeSpot(x, y) {
    var W = ACH.world, R = 7;
    for (var k = 0; k < 10; k++) { var tx = x + rand(-24, 24) * (k ? 1 : 0), ty = y + rand(-14, 14) * (k ? 1 : 0); if (ty > 19.5 * T() && ty < 32.4 * T() && !W.collideCircle(tx, ty, R)) return { x: tx, y: ty }; }
    return null;
  }
  function updateDrops(G, dt) {
    var p = G.player;
    if (dropCD > 0) dropCD -= dt;
    if (dropCD <= 0 && inDropZone(p) && p.hp > 0 && !drops.length) {
      var fx = (ACH.ent.DIRV[p.dir] || [1, 0])[0], s = freeSpot(p.x + fx * rand(20, 50) + rand(-20, 20), p.y + rand(-16, 16));
      if (s) { drops.push({ x: s.x, y: s.y, t: 0, col: Math.floor(Math.random() * 4) }); dropCD = K.every + rand(0, 4); sfx('cv.parapente', { x: s.x, y: s.y }); }
      else dropCD = 2;
    }
    for (var i = drops.length - 1; i >= 0; i--) {
      var d = drops[i]; d.t += dt;
      if (d.t < K.warn) continue;
      drops.splice(i, 1);
      if (p.hp > 0 && dist(p.x, p.y, d.x, d.y) < K.hitR && G.state === 'playing') { hurt(G, U, { push: { x: p.x - d.x || 1, y: p.y - d.y, f: 24 } }); popText('¡PLAF!', p.x, p.y - 30); }
      var z = mk('cv_parapentista', d.x, d.y); z.state = 'perseguir'; z.lastX = p.x; z.lastY = p.y;
      G.zombies.push(z);
      wrecks.push({ x: d.x + 14, y: d.y + 4, col: d.col, broken: false, t: 0 });
      if (wrecks.length > K.maxWreck) wrecks.shift();
      sfx('zombie.alert', { x: d.x, y: d.y, type: 'cv_parapentista' });
    }
    for (i = 0; i < texts.length; i++) texts[i].t += dt;
    for (i = texts.length - 1; i >= 0; i--) if (texts[i].t > 1) texts.splice(i, 1);
    for (i = flashes.length - 1; i >= 0; i--) { flashes[i].t += dt; if (flashes[i].t > 0.3) flashes.splice(i, 1); }
  }
  // el parapente tirado se rompe de un golpe (suelta 1 sencillo)
  function swingWrecks(G, sw) {
    var n = 0;
    for (var i = 0; i < wrecks.length; i++) {
      var w = wrecks[i]; if (w.broken) continue;
      var dx = w.x - sw.x, dy = w.y - sw.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > (sw.range || 24) + 10) continue;
      if (Math.abs(wrap(Math.atan2(dy, dx) - sw.ang)) > (sw.arc || Math.PI / 2) / 2 + 0.3 && d > 8) continue;
      w.broken = true; n++;
      sfx('prop.break.cart', { x: w.x, y: w.y });
      try { if (ACH.inv && ACH.inv.drop) ACH.inv.drop(w.x, w.y, [{ id: 'sencillo', n: 1 }], true); } catch (e) { /* nada */ }
    }
    return n;
  }
  // sprites baratos (horneados una vez)
  var SH = null, FL = null;
  function bakeFx() {
    SH = [6, 10, 14].map(function (r) { var c = mkc(r * 2 + 2, r + 2), g = c.getContext('2d'); g.fillStyle = 'rgba(28,26,34,.45)'; g.beginPath(); g.ellipse(r + 1, (r + 2) / 2, r, r / 2, 0, 0, 6.3); g.fill(); return c; });
    FL = mkc(48, 48); var g2 = FL.getContext('2d');
    for (var k = 0; k < 6; k++) { g2.fillStyle = 'rgba(255,255,255,' + (0.1 + k * 0.12) + ')'; g2.beginPath(); g2.arc(24, 24, 24 - k * 4, 0, 6.3); g2.fill(); }
  }
  var CANOPY = ['#e84a8a', '#1fe07a', '#2fb8e8', '#ffb020'];
  function canopySpr(i) {
    var P = ACH.sprites && ACH.sprites.cv && ACH.sprites.cv.malecon && ACH.sprites.cv.malecon.parapenteCielo;
    var s = Array.isArray(P) ? P[i % P.length] : null;
    return s && s.width ? s : null;
  }
  function wreckSpr(broken) {
    var o = ACH.sprites && ACH.sprites.props && ACH.sprites.props.cv_parapenteCaido;
    if (!o || !o.width) { var m = ACH.sprites && ACH.sprites.cv && ACH.sprites.cv.malecon; o = m && m.parapenteCaido; }
    if (o && o.width) return broken && o.broken && o.broken.width ? o.broken : o;
    return null;
  }

  CV.zombis = {
    TYPES: TYPES, crew: function () { return crew.slice(); },
    popText: function (s, x, y, col) { popText(s, x, y, col); }, flash: function (x, y) { flashes.push({ x: x, y: y, t: 0 }); },
    cups: function () { return cups.length; },
    drop: function (x, y) { var G = ACH.G; if (!G) return; var p = G.player; drops.push({ x: x === undefined ? p.x + 30 : x, y: y === undefined ? p.y : y, t: 0, col: 0 }); },
    state: function () { var G = ACH.G, o = {}; (G ? G.zombies : []).forEach(function (z) { if (z.state !== 'muerto') o[z.type] = (o[z.type] || 0) + 1; }); return { vivos: o, caidas: drops.length, parapentes: wrecks.length, cd: +dropCD.toFixed(1) }; }
  };

  CV.register({
    name: 'zombis',
    reset: function (G) {
      drops.length = 0; wrecks.length = 0; texts.length = 0; flashes.length = 0; dropCD = 6; cups.length = 0; white.t = 0;
      if (ENT.CFG) { ENT.CFG.respawnBelow = 16; ENT.CFG.cobradorChance = 0; }
      spawnAll(G);
    },
    onRespawn: function () { drops.length = 0; },
    update: function (G, dt) {
      updateDrops(G, dt); updateCups(G, dt);
      // los parapentistas caen solo en el parapuerto y el Amor, los turistas no salen de su tramo… y nadie se mete a la vista
    },
    onSwing: function (G, sw) { return swingWrecks(G, sw); },
    drawables: function (G, out) {
      var cam = G.cam, V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
      if (!SH) bakeFx();
      cups.forEach(function (c) { out.push({ y: c.gy + 2, x: c.x, draw: function (g, cx, cy) { drawCup(g, c, cx, cy); } }); });
      (G.zombies || []).forEach(function (z) {
        if ((z.type !== 'cv_barista' && z.type !== 'cv_reySelfie') || z.state === 'muerto') return;
        if (z.x < cam.x - 30 || z.x > cam.x + V.w + 30 || z.y < cam.y - 10 || z.y > cam.y + V.h + 40) return;
        out.push({ y: z.y + 0.5, x: z.x, draw: function (g, cx, cy) { drawAccessory(g, z, cx, cy); } });
      });
      wrecks.forEach(function (w) {
        if (w.x < cam.x - 40 || w.x > cam.x + V.w + 40 || w.y < cam.y - 20 || w.y > cam.y + V.h + 30) return;
        out.push({ y: w.y - 1, x: w.x, draw: function (g, cx, cy) {
          var s = wreckSpr(w.broken), x = Math.round(w.x - cx), y = Math.round(w.y - cy);
          if (s) { g.drawImage(s, x - (s.ax === undefined ? s.width >> 1 : s.ax), y - (s.ay === undefined ? s.height - 1 : s.ay)); return; }
          g.fillStyle = '#1c1a22'; g.fillRect(x - 13, y - 6, 26, 7);
          g.fillStyle = CANOPY[w.col]; g.fillRect(x - 12, y - 5, w.broken ? 10 : 24, 5);
          if (w.broken) { g.fillRect(x + 2, y - 3, 9, 3); }
          g.fillStyle = '#f3efe2'; g.fillRect(x - 12, y - 5, 24, 1);
        } });
      });
      drops.forEach(function (d) {
        var k = Math.min(1, d.t / K.warn), sh = SH[Math.min(2, Math.floor(k * 3))];
        out.push({ y: -1e5, x: d.x, draw: function (g, cx, cy) { g.drawImage(sh, Math.round(d.x - cx - sh.width / 2), Math.round(d.y - cy - sh.height / 2)); } });
        out.push({ y: d.y + 1, x: d.x, draw: function (g, cx, cy) {
          var h = (1 - k) * 150, x = Math.round(d.x - cx), y = Math.round(d.y - cy - h), c = canopySpr(d.col);
          if (c) g.drawImage(c, x - (c.width >> 1), y - 36 - c.height);
          else { g.fillStyle = '#1c1a22'; g.fillRect(x - 15, y - 47, 30, 8); g.fillStyle = CANOPY[d.col]; g.fillRect(x - 14, y - 46, 28, 6); g.fillStyle = '#f3efe2'; g.fillRect(x - 14, y - 46, 28, 1); g.fillStyle = '#1c1a22'; g.fillRect(x - 12, y - 40, 1, 18); g.fillRect(x + 11, y - 40, 1, 18); }
          var Z = ACH.sprites && ACH.sprites.zvar, set = null; try { set = Z && Z.cv_parapentista; } catch (e) { set = null; }
          var f = set && set.move ? (Array.isArray(set.move) ? set.move[0] : set.move) : null;
          if (f) g.drawImage(f, x - (f.ax === undefined ? f.width >> 1 : f.ax), y - (f.ay === undefined ? f.height - 1 : f.ay));
          else { g.fillStyle = '#1c1a22'; g.fillRect(x - 4, y - 22, 8, 22); g.fillStyle = '#6a8a5a'; g.fillRect(x - 3, y - 21, 6, 20); }
        } });
      });
    },
    drawTop: function (g, G, cx, cy) {
      if (!FL) bakeFx();
      for (var i = 0; i < flashes.length; i++) { var f = flashes[i]; g.globalAlpha = Math.max(0, 1 - f.t / 0.3); g.drawImage(FL, Math.round(f.x - cx - 24), Math.round(f.y - cy - 24)); }
      g.globalAlpha = 1;
      if (white.t > 0) { var V2 = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }; g.globalAlpha = Math.min(0.75, white.t / 0.22 * 0.75) * (ACH.fx && ACH.fx.calma && ACH.fx.calma() ? 0.14 : 1); g.fillStyle = '#ffffff'; g.fillRect(0, 0, V2.w, V2.h); g.globalAlpha = 1; }   // v0.13 T3: «reducir destellos» = apenas un velo
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
