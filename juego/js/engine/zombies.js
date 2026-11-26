/* ACHORADO — js/engine/zombies.js (v0.6b, F8e): zombies variados. Cada zombie suma a su tipo (comportamiento) una forma
   de moverse (`loco`), un cuerpo (`height`) y un `skin` de ACH.sprites.zvar. Publica ACH.zvar = {assign, move, onHit, update, frame}.
   Los ganchos en entities.js / render.js los pone F1 (SPEC v0.6b). Sin sprites nuevos, frame() devuelve null y se dibuja lo de hoy. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  /* ---------------- Afinación (todo en px, s, px/s) ---------------- */
  var K = {
    caminaShare: 0.40,                 // reparto general: ~40 % camina
    // cojo: impulso y pausa
    hopT: 0.26, hopPause: 0.42, hopMul: 2.3, hopMax: 110, hopVulnDmg: 1,   // golpe en la pausa: +1 de daño
    // muletas
    crutchMul: 0.72, crutchEvery: 0.55, pokeRange: 17, pokeWind: 0.3,
    // silla de ruedas
    silla: { vmax: 58, acc: 40, dec: 70, turn: 2.2 },
    // skate
    skate: { vmax: 110, acc: 75, dec: 90, turn: 2.4, wind: 0.4 },
    // bici (solo por la pista)
    bici: { vmax: 125, acc: 70, dec: 110, wind: 0.5, steer: 45, crashSp: 45, uturnSp: 15 },
    // v0.8: repartidor en moto: como la bici, más rápido y con rugido antes de arrancar
    moto: { vmax: 160, acc: 95, dec: 130, wind: 0.85, steer: 50, crashSp: 55, uturnSp: 18 }, motoMax: 2,
    // gusano
    wormMul: 0.45, wormLunge: 1.5, crawlEvery: 0.9,
    // en cuatro patas
    fourMul: 1.6, fourCap: 62, leapRange: 60, leapMin: 14, leapWind: 0.35, leapT: 0.4, leapSp: 155, leapRec: 0.55, leapCD: 2.4,
    // carretilla
    cartMul: 0.7, cartTurn: 1.8, shieldArc: Math.PI / 3,                   // ±60° de frente
    // cantor
    singMul: 0.85, singEvery: 4, singNoise: 90,
    // audio
    audioR: 300, maxLoops: 4,
    // props sueltos
    looseMax: 10
  };
  var HPADD = { camina: 0, cojo: 0, muletas: 0, silla: 0, gusano: 0, cuatro: 0, skate: 0, bici: 0, carretilla: 0, cantor: 0 };
  var HPMIN = { silla: 2, skate: 2, bici: 2 };          // aguantan la caída (el primer golpe los baja del vehículo)
  var HPFIX = { cuatro: 1, moto: 1 };
  var PUNCH3 = { skate: 1, bici: 1, moto: 1, cuatro: 1 };                            // rápidos: poca vida
  var LOCOS = ['camina', 'cojo', 'muletas', 'silla', 'gusano', 'cuatro', 'skate', 'bici', 'carretilla', 'cantor', 'moto'];
  var FPS = { camina: 0, cojo: 11, muletas: 6, silla: 0, gusano: 4, cuatro: 12, skate: 0, bici: 0, carretilla: 6, cantor: 7, moto: 0 };
  var LOOP = { silla: 'zombie.wheel', skate: 'zombie.skate', bici: 'zombie.bike', carretilla: 'zombie.cart', cantor: 'zombie.sing', moto: 'zombie.moto' };
  var LOOP_EVERY = { 'zombie.wheel': 0.6, 'zombie.skate': 0.5, 'zombie.bike': 0.7, 'zombie.cart': 0.8, 'zombie.sing': 3, 'zombie.moto': 0.5 };
  var NOENGINELUNGE = { cojo: 1, muletas: 1, silla: 1, cuatro: 1, skate: 1, bici: 1, carretilla: 1, moto: 1 };
  var VEH = { silla: 1, skate: 1, bici: 1, moto: 1 };
  var LOOSEK = { silla: 'sillaRuedas', skate: 'skateSuelto', bici: 'biciCaida', moto: 'motoCaida' };
  var FRIC = { sillaRuedas: 1.6, skateSuelto: 0.9, biciCaida: 4, motoCaida: 4 };
  var ARMID = { silla: 'silla', skate: 'skate', bici: 'bici', moto: 'moto' };   // v0.8: ids de ACH.armas.spawnLoose
  function onLane(l) { return l === 'bici' || l === 'moto'; }
  // permitidos por comportamiento (el escolar no va en bici; el ciego no maneja nada rápido)
  var ALLOW = {
    caminante: null,
    cobrador: { camina: 1, cojo: 1, muletas: 1, gusano: 1, carretilla: 1, cantor: 1, cuatro: 1 },
    escolar: { camina: 1, cojo: 1, gusano: 1, cuatro: 1, skate: 1, cantor: 1 },
    ciego: { camina: 1, cojo: 1, muletas: 1, gusano: 1, silla: 1, carretilla: 1, cantor: 1 }
  };
  var OUTFITS = ['reflectivo', 'enfermera', 'cocinero', 'buzo', 'delivery', 'casaca', 'floreada', 'estibador', 'terno', 'bividi'];
  var HEIGHTS = ['bajo', 'normal', 'alto'];
  var LOWVEH = /^(car|tico|combi|custer|mototaxi|trailer|tracto)/;   // el gusano pasa por debajo

  /* ---------------- Utilidades ---------------- */
  function W() { return ACH.world; }
  function CFG() { return ACH.ent.CFG; }
  function ZT(z) { return ACH.ent.ZT[z.type] || ACH.ent.ZT.caminante; }
  function R() { return (ACH.ent && ACH.ent.CFG.zRadius) || 5; }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function sfx(name, data) { var au = ACH.audio; if (au && au.emit) au.emit(name, data); }
  function camC() {
    var G = ACH.G, V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
    return G && G.cam ? { x: G.cam.x + V.w / 2, y: G.cam.y + V.h / 2 } : { x: 0, y: 0 };
  }
  function audible(z) { var c = camC(); return dist(c.x, c.y, z.x, z.y) <= K.audioR; }
  function oneShot(z, name, extra) {
    if (!audible(z)) return;
    var d = { x: z.x, y: z.y, type: z.type, loco: z.loco };
    if (extra) for (var k in extra) d[k] = extra[k];
    sfx(name, d);
  }
  function face(z, vx) { if (vx < -0.5) z.flip = true; else if (vx > 0.5) z.flip = false; }
  function step(z, vx, vy, dt) {
    var hit = W().moveCircle(z, vx * dt, vy * dt, R());
    z.moving = vx !== 0 || vy !== 0; face(z, vx); z.zvHit = hit;
    return hit;
  }

  /* ---------------- Lugar del spawn ---------------- */
  // v0.9 (H2): el Cerro (mundo con carriles de bajada) no tiene pistas, veredas de bodega en filas fijas ni cuadras por columna:
  // aquí nada usa filas ni columnas del nivel 1 cuando isCerro().
  function isCerro() { var w = W(); return !!(w && ((w.lanes && w.lanes.length) || w.id === 'cerro')); }
  var CERRO_MIX = [['camina', 6], ['cojo', 1.5], ['muletas', 1], ['cuatro', 1], ['gusano', 1], ['carretilla', 0.6]];   // = entities.js
  var CERRO_NO = { bici: 1, moto: 1, skate: 1 };   // sin pistas: pasan a camina
  function rowOf(y) { return Math.floor(y / (W().T || 16)); }
  function colOf(x) { return Math.floor(x / (W().T || 16)); }
  function laneBand(y) {   // filas 15–22 (pista norte) y 27–34 (pista sur)
    if (isCerro()) return null;
    var T = W().T || 16, r = rowOf(y);
    if (r >= 15 && r <= 22) return { y0: 15 * T + 7, y1: 23 * T - 7, dir: -1 };
    if (r >= 27 && r <= 34) return { y0: 27 * T + 7, y1: 35 * T - 7, dir: 1 };
    return null;
  }
  function nearestBand(y) {
    var T = W().T || 16;
    if (isCerro()) return null;
    return laneBand(y) || (y < 25 * T ? laneBand(18 * T) : laneBand(30 * T));
  }
  function nearVehicle(x, y, d) {
    var P = W().props;
    for (var i = 0; i < P.length; i++) {
      var p = P[i];
      if (!LOWVEH.test(p.k) || !(p.fw > 0)) continue;
      if (x > p.x0 - d && x < p.x1 + d && y > p.y0 - d && y < p.y1 + d) return true;
    }
    return false;
  }
  function inPasaje(x, y) {
    var c = colOf(x), r = rowOf(y), Ps = W().PASAJES || [];
    for (var i = 0; i < Ps.length; i++) if (c >= Ps[i].c0 && c <= Ps[i].c1 && r >= Ps[i].r0 && r <= Ps[i].r1 + 1) return true;
    return false;
  }
  function nearMarket(x, y) {   // bodegas (veredas frente al lote) y puestos de vendedores
    var c = colOf(x), r = rowOf(y), L = W().LOTS || [], i;
    for (i = 0; i < L.length && !isCerro(); i++) {   // las veredas de bodega (filas 10–15 y 34–39) son del nivel 1
      var f = L[i];
      if (f.arch !== 'bodega') continue;
      if (c < f.c0 - 3 || c > f.c1 + 3) continue;
      if (f.side === 'N' && r >= 10 && r <= 15) return true;
      if (f.side === 'S' && r >= 34 && r <= 39) return true;
    }
    var P = W().props;
    for (i = 0; i < P.length; i++) {
      var k = P[i].k;
      if ((k === 'triciclo' || k === 'emoliente' || k === 'anticuchos' || k === 'quiosco') && dist(x, y, P[i].x, P[i].y) < 56) return true;
    }
    return false;
  }
  function blockOf(x, y) {   // cuadras del nivel 1 por columna; en el Cerro, franjas de 30 filas
    if (isCerro()) return 'r' + Math.floor(rowOf(y === undefined ? 0 : y) / 30);
    var c = colOf(x); return c < 42 ? 0 : (c < 86 ? 1 : 2);
  }
  function cantoresIn(b) {
    var G = ACH.G, n = 0;
    if (!G || !G.zombies) return 0;
    for (var i = 0; i < G.zombies.length; i++) {
      var o = G.zombies[i];
      if (o.loco === 'cantor' && o.state !== 'muerto' && blockOf(o.x, o.y) === b) n++;
    }
    return n;
  }

  /* ---------------- Skins ---------------- */
  function pickSkin(z, loco, rnd) {
    var list = ACH.sprites && ACH.sprites.zvarList, c = [], i;
    if (Array.isArray(list) && list.length) {
      for (i = 0; i < list.length; i++) if (list[i].loco === loco && (!z.height || list[i].height === z.height) && (!z.outfit || list[i].outfit === z.outfit)) c.push(list[i]);
      if (!c.length) for (i = 0; i < list.length; i++) if (list[i].loco === loco && (!z.height || list[i].height === z.height)) c.push(list[i]);
      if (!c.length) for (i = 0; i < list.length; i++) if (list[i].loco === loco) c.push(list[i]);
      if (!c.length && loco === 'moto') for (i = 0; i < list.length; i++) if (list[i].loco === 'bici') c.push(list[i]);   // v0.8: sin moto_* → bici
      if (c.length) {
        var e = c[Math.floor(rnd() * c.length)];
        z.skin = e.skin; z.height = e.height || z.height; z.outfit = e.outfit || z.outfit;
        return;
      }
    }
    var S = ACH.sprites && ACH.sprites.zvar;
    if (loco === 'moto' && S && !Object.keys(S).some(function (k) { return k.indexOf('moto_') === 0; })) {   // v0.8: sin skins moto_* → uno de bici
      var bk = Object.keys(S).filter(function (k) { return k.indexOf('bici_') === 0; });
      if (bk.length) { z.skin = bk[Math.floor(rnd() * bk.length)]; return; }
    }
    z.skin = loco + '_' + (z.height || 'normal') + '_' + (z.outfit || 'buzo');   // clave del contrato; sin sprite → frame() da null
  }

  function setLoco(z, loco, rnd) {
    rnd = rnd || Math.random;
    if (CERRO_NO[loco] && isCerro()) loco = 'camina';
    z.loco = loco;
    pickSkin(z, loco, rnd);
    z.low = loco === 'gusano';
    z.shield = loco === 'carretilla';
    z.hd = z.flip ? Math.PI : 0; z.sp = 0;
    z.windT = 0; z.leap = 0; z.leapT = 0; z.leapCD = 0; z.pokeT = 0;
    z.hop = 0; z.hopT = rnd() * K.hopPause; z.sndT = rnd() * 0.8;
    z.hdSet = false;
    if (onLane(loco)) {
      if (z.homeY === undefined) z.homeY = z.y;               // el lugar de nacimiento (balance() lo restaura al repartir de nuevo)
      var b = nearestBand(z.y); z.band = b; z.bdir = b.dir; z.hd = b.dir < 0 ? Math.PI : 0;
      if (z.y < b.y0) z.y = b.y0; else if (z.y > b.y1) z.y = b.y1;
    }
    if (loco === 'carretilla') z.face = z.flip ? Math.PI : 0;
    if (loco === 'cantor') { z.singT = rnd() * K.singEvery; z.dispersed = false; }
    if (z._loop && z._loopName !== LOOP[loco]) stopLoop(z);
  }

  /* ---------------- assign ---------------- */
  function chooseLoco(z, rnd) {
    var allow = ALLOW[z.type], ok = function (l) { return !allow || !!allow[l]; };
    var x = z.x, y = z.y, T = W().T || 16, r = rowOf(y);
    if (isCerro()) {   // v0.9: reparto del Cerro (el mismo que usa entities.js al crear)
      var ct = 0, cq, ci;
      for (ci = 0; ci < CERRO_MIX.length; ci++) if (ok(CERRO_MIX[ci][0])) ct += CERRO_MIX[ci][1];
      cq = rnd() * ct;
      for (ci = 0; ci < CERRO_MIX.length; ci++) { if (!ok(CERRO_MIX[ci][0])) continue; cq -= CERRO_MIX[ci][1]; if (cq <= 0) return CERRO_MIX[ci][0]; }
      return 'camina';
    }
    // 1) cantor: 1–2 por cuadra
    var b = blockOf(x, y), nc = cantoresIn(b);
    if (ok('cantor') && ((nc === 0 && rnd() < 0.22) || (nc === 1 && rnd() < 0.05))) return 'cantor';
    // 2) por lugar
    if ((r >= 15 && r <= 22) || (r >= 27 && r <= 34)) {
      var q = rnd();
      if (q < 0.22 && ok('bici')) return 'bici';
      if (q < 0.36 && ok('skate')) return 'skate';
    }
    if ((nearVehicle(x, y, 28) || inPasaje(x, y)) && rnd() < 0.35 && ok('gusano')) return 'gusano';
    if (nearMarket(x, y) && rnd() < 0.5 && ok('carretilla')) return 'carretilla';
    // 3) reparto general
    if (rnd() < K.caminaShare / 0.7) return 'camina';
    var mix = [['cojo', 3], ['muletas', 2.5], ['cuatro', 2.5], ['silla', 2], ['gusano', 1], ['carretilla', 1]];
    var tot = 0, i;
    for (i = 0; i < mix.length; i++) if (ok(mix[i][0])) tot += mix[i][1];
    var p = rnd() * tot;
    for (i = 0; i < mix.length; i++) { if (!ok(mix[i][0])) continue; p -= mix[i][1]; if (p <= 0) return mix[i][0]; }
    return 'camina';
  }

  function assign(z, rng, force) {
    var rnd = typeof rng === 'function' ? rng : Math.random;
    var hq = rnd();
    z.height = z.type === 'escolar' ? (hq < 0.7 ? 'bajo' : 'normal') : (hq < 0.2 ? 'bajo' : (hq < 0.75 ? 'normal' : 'alto'));
    z.outfit = z.type === 'escolar' && rnd() < 0.7 ? 'buzo' : OUTFITS[Math.floor(rnd() * OUTFITS.length)];
    var loco = force && LOCOS.indexOf(force) >= 0 ? force : chooseLoco(z, rnd);
    setLoco(z, loco, rnd);
    setHp(z, loco);
    return z;
  }
  function setHp(z, loco) {   // vida por forma de moverse
    var hp = ZT(z).hp + (HPADD[loco] || 0);
    if (HPMIN[loco]) hp = Math.max(hp, HPMIN[loco]);
    if (HPFIX[loco]) hp = HPFIX[loco];
    z.hp = Math.max(1, hp); z.hpMax = z.hp;
    z.punch3 = !!PUNCH3[loco];   // QA v0.8: a puñetes (dmg < 0.5) caen en 3 golpes aunque la guitarra necesite 2 (hitZombie en entities.js)
  }

  /* ---- balance (QA v0.6): reparto del nivel inicial. ~40 % camina y un mínimo garantizado por estilo ---- */
  var QUOTA = [['bici', 2], ['skate', 2], ['carretilla', 2], ['cantor', 2], ['gusano', 2], ['silla', 2], ['cuatro', 2], ['muletas', 2], ['cojo', 2]];
  var EXTRA = [['cojo', 3], ['muletas', 2.5], ['cuatro', 2.5], ['silla', 2], ['gusano', 1], ['carretilla', 1]];
  var FAST = { cuatro: 1, skate: 1, bici: 1, moto: 1 }, SAFE_R = 200;   // sin estilos rápidos a ≤ 200 px del inicio
  function laneDist(y) { var b = nearestBand(y); if (!b) return 1e6; return y < b.y0 ? b.y0 - y : (y > b.y1 ? y - b.y1 : 0); }
  function balScore(z, loco, st, rnd) {
    var al = ALLOW[z.type];
    if (al && !al[loco]) return Infinity;
    if (FAST[loco] && dist(z.x, z.y, st.x, st.y) < SAFE_R) return Infinity;
    var j = rnd() * 30;
    switch (loco) {   // el lugar solo ordena a los candidatos: si ninguno cumple, igual gana el menos malo (no se descarta el estilo)
      case 'bici': case 'moto': return laneDist(z.y) + j;
      case 'skate': return laneDist(z.y) * 0.5 + j;
      case 'carretilla': return (nearMarket(z.x, z.y) ? 0 : 60) + j;
      case 'gusano': return (nearVehicle(z.x, z.y, 28) || inPasaje(z.x, z.y) ? 0 : 60) + j;
      case 'cantor': return cantoresIn(blockOf(z.x, z.y)) * 100 + j;
    }
    return j;
  }
  function placeBici(z) {   // la bici va por la pista: si el cuerpo no cabe donde lo dejó setLoco, busca un carril libre en esa x
    var Wd = W(), b = z.band, r = R(), y;
    if (!Wd.collideCircle(z.x, z.y, r)) return true;
    for (var d = 6; d <= b.y1 - b.y0; d += 6) {
      y = z.y - d; if (y >= b.y0 && !Wd.collideCircle(z.x, y, r)) { z.y = y; return true; }
      y = z.y + d; if (y <= b.y1 && !Wd.collideCircle(z.x, y, r)) { z.y = y; return true; }
    }
    return false;
  }
  function balance(G, rng) {
    if (isCerro()) return {};   // v0.9: el Cerro no usa los cupos del nivel 1 (pistas, bodegas, cuadras): entities.js ya eligió con su reparto
    var rnd = typeof rng === 'function' ? rng : Math.random, st = W().start || { x: 0, y: 0 };
    var pool = [], i, n, z;
    for (i = 0; i < G.zombies.length; i++) { z = G.zombies[i]; if (z.state !== 'muerto' && !z.social) pool.push(z); }
    pool.forEach(function (q) {   // todos a camina, en su lugar de nacimiento
      if (q.homeY !== undefined) { q.y = q.homeY; q.homeY = undefined; }
      setLoco(q, 'camina', rnd); setHp(q, 'camina');
    });
    var plan = [], quotaN = 0, nCam = Math.round(pool.length * K.caminaShare), tot = 0, p;
    QUOTA.forEach(function (e) { for (n = 0; n < e[1]; n++) plan.push(e[0]); quotaN += e[1]; });
    var nMoto = Math.min(K.motoMax, 1 + (rnd() < 0.5 ? 1 : 0));   // v0.8: 1 o 2 repartidores en moto por partida (primero: eligen la mejor pista)
    for (n = 0; n < nMoto; n++) plan.unshift('moto');
    quotaN += nMoto;
    EXTRA.forEach(function (e) { tot += e[1]; });
    for (n = pool.length - nCam - quotaN; n > 0; n--) {
      p = rnd() * tot;
      for (i = 0; i < EXTRA.length; i++) { p -= EXTRA[i][1]; if (p <= 0) { plan.push(EXTRA[i][0]); break; } }
    }
    var free = pool.slice(), res = {};
    plan.forEach(function (loco) {
      var cand = free.map(function (q) { return { z: q, s: balScore(q, loco, st, rnd) }; }).filter(function (e) { return e.s < Infinity; })
        .sort(function (a, b) { return a.s - b.s; });
      for (var k = 0; k < cand.length; k++) {
        var q = cand[k].z, ox = q.x, oy = q.y;
        setLoco(q, loco, rnd);
        if (onLane(loco) && (!placeBici(q) || dist(q.x, q.y, st.x, st.y) < SAFE_R)) { q.x = ox; q.y = oy; q.homeY = undefined; setLoco(q, 'camina', rnd); continue; }
        setHp(q, loco);
        free.splice(free.indexOf(q), 1); res[loco] = (res[loco] || 0) + 1;
        return;
      }
    });
    return res;
  }

  /* ---------------- move ---------------- */
  // Lo que pide la IA, sin el salto del motor (los que tienen salto propio o no saltan lo ignoran).
  function wantOf(z, want) {
    var vx = want ? want.vx || 0 : 0, vy = want ? want.vy || 0 : 0, sp = Math.sqrt(vx * vx + vy * vy);
    var lunging = z.lungeT > 0;
    var base = ZT(z).speed, raw = lunging ? sp / CFG().lungeMult : sp;
    // v0.8: de noche la IA pide más velocidad (ACH.noche.zMul): ratio queda en la escala del día y cada forma de moverse multiplica por nm
    var nm = ACH.ent && ACH.ent.nightMul ? ACH.ent.nightMul(z) : 1;
    return { nx: sp > 0.001 ? vx / sp : 0, ny: sp > 0.001 ? vy / sp : 0, sp: raw, ratio: Math.min(1.2, raw / (base * nm)), base: base, lunging: lunging, nm: nm };
  }
  function chasing(z) { return z.state === 'perseguir'; }

  function moveCojo(G, z, dt, w) {
    if (z.hop === 0) {                       // pausa: quieto y vulnerable
      z.moving = false; face(z, w.nx);
      if (z.hopT <= 0) { z.hop = 1; z.hopT = K.hopT; oneShot(z, 'zombie.hop'); }
      return true;
    }
    var s = Math.min(K.hopMax * w.nm, w.base * w.ratio * K.hopMul * w.nm);
    step(z, w.nx * s, w.ny * s, dt);
    if (z.hopT <= 0) { z.hop = 0; z.hopT = K.hopPause * (0.85 + Math.random() * 0.3); }
    return true;
  }

  function moveMuletas(G, z, dt, w) {
    var p = G.player, pd = dist(z.x, z.y, p.x, p.y);
    if (z.pokeT > 0) { z.moving = false; face(z, p.x - z.x); return true; }        // preparando el muletazo
    if (chasing(z) && p.hp > 0 && pd <= K.pokeRange && z.atkCD <= 0) {           // las muletas alcanzan más que la mordida
      z.pokeT = K.pokeWind; z.moving = false; face(z, p.x - z.x);
      return true;
    }
    var s = w.base * w.ratio * K.crutchMul * w.nm;
    step(z, w.nx * s, w.ny * s, dt);
    if (z.sndT <= 0) { z.sndT = K.crutchEvery; oneShot(z, 'zombie.crutch'); }
    return true;
  }

  // Vehículo genérico (silla, skate): rumbo z.hd, rapidez z.sp, giro limitado (más amplio cuanto más rápido).
  function moveVehicle(G, z, dt, w, P) {
    if (z.windT > 0) {                          // amago antes de la carga: frena y se acomoda
      z.sp = Math.max(0, z.sp - P.dec * dt);
      if (w.sp > 0.01) z.hd += clamp(wrap(Math.atan2(w.ny, w.nx) - z.hd), -P.turn * 2 * dt, P.turn * 2 * dt);
      if (z.sp > 1) step(z, Math.cos(z.hd) * z.sp, Math.sin(z.hd) * z.sp, dt); else z.moving = false;
      face(z, Math.cos(z.hd));
      return true;
    }
    var target = 0, diff = 0;
    if (!z.hdSet && w.sp > 0.01) { z.hd = Math.atan2(w.ny, w.nx); z.hdSet = true; face(z, w.nx); }   // QA v0.6: arranca mirando hacia donde va
    if (w.sp > 0.01) {
      target = P.vmax * w.nm * Math.min(1, w.ratio) * (chasing(z) ? 1 : 0.6);
      diff = wrap(Math.atan2(w.ny, w.nx) - z.hd);
      var mt = P.turn * (1 - 0.4 * Math.min(1, z.sp / P.vmax)) * dt;
      z.hd = wrap(z.hd + clamp(diff, -mt, mt));
      if (Math.abs(diff) > 1.6) target = Math.min(target, P.vmax * w.nm * 0.3);   // vuelta en U: abre y frena
      else if (Math.abs(diff) > 0.8) target *= 0.6;                      // curva: afloja
    }
    if (z.sp < target) z.sp = Math.min(target, z.sp + P.acc * dt); else z.sp = Math.max(target, z.sp - P.dec * dt);
    if (z.sp > 0.5) {
      var hit = step(z, Math.cos(z.hd) * z.sp, Math.sin(z.hd) * z.sp, dt);
      if (hit) {
        z.sp *= 0.4; if (w.sp > 0.01) z.hd = wrap(z.hd + clamp(diff, -0.6, 0.6));
        // QA v0.6: atascado contra un poste o una palma (la rapidez se apaga cada choque): después de 0,3 s se desvía de lado
        z.vStuck = (z.vStuck || 0) + dt;
        if (z.vStuck > 0.3) { z.vStuck = 0; z.vSide = -(z.vSide || 1); z.hd = wrap(z.hd + z.vSide * 1.3); z.sp = Math.max(z.sp, 22); }
      } else z.vStuck = 0;
    } else z.moving = false;
    face(z, Math.cos(z.hd));
    return true;
  }

  function moveBici(G, z, dt, w) {
    var P = K[z.loco] || K.bici, b = z.band || (z.band = nearestBand(z.y)), Wd = W(), r = R();
    if (z.windT > 0) {                           // timbrazo y arranque
      z.sp = Math.max(0, z.sp - P.dec * dt); z.moving = false;
      if (w.nx * z.bdir < -0.3 && z.sp < P.uturnSp) z.bdir = -z.bdir;
      face(z, z.bdir); return true;
    }
    var target = w.sp > 0.01 ? P.vmax * w.nm * Math.min(1, w.ratio) * (chasing(z) ? 1 : 0.6) : 0;
    if (w.sp > 0.01 && w.nx * z.bdir < -0.3) {   // el objetivo quedó atrás: frena y da la vuelta
      target = 0;
      if (z.sp < P.uturnSp) { z.bdir = -z.bdir; z.sp = 0; }
    }
    if (z.sp < target) z.sp = Math.min(target, z.sp + P.acc * dt); else z.sp = Math.max(target, z.sp - P.dec * dt);
    // dirección lateral: hacia lo que pide la IA, esquivando lo que tiene delante
    var vy = w.ny * P.steer, ahead = z.x + z.bdir * (r + 10 + z.sp * 0.25);
    if (z.sp > 20 && Wd.collideCircle(ahead, z.y, r + 1)) {
      var up = !Wd.collideCircle(ahead, z.y - 14, r + 1) && z.y - 14 >= b.y0, dn = !Wd.collideCircle(ahead, z.y + 14, r + 1) && z.y + 14 <= b.y1;
      vy = up && (!dn || w.ny < 0) ? -60 : (dn ? 60 : vy);
    }
    if ((z.y + vy * dt < b.y0 && vy < 0) || (z.y + vy * dt > b.y1 && vy > 0)) vy = 0;
    var dx = z.bdir * z.sp * dt, hitX = false;
    if (dx !== 0) { if (!Wd.collideCircle(z.x + dx, z.y, r)) z.x += dx; else hitX = true; }
    if (vy !== 0 && !Wd.collideCircle(z.x, z.y + vy * dt, r)) z.y += vy * dt;
    z.hd = z.bdir < 0 ? Math.PI : 0;
    z.moving = z.sp > 2; face(z, z.bdir); z.zvHit = hitX;
    if (hitX) {
      if (z.sp > P.crashSp) dismount(G, z, z.x + z.bdir * 10, z.y, true);   // se estrella: cae y queda camina
      else z.sp = 0;
    }
    return true;
  }

  // Gusano: choca con tiles y props, salvo vehículos (pasa por debajo).
  function lowCollide(x, y, rad) {
    var Wd = W(), T = Wd.T, c0 = Math.floor((x - rad) / T), c1 = Math.floor((x + rad) / T), r0 = Math.floor((y - rad) / T), r1 = Math.floor((y + rad) / T);
    for (var rr = r0; rr <= r1; rr++) for (var cc = c0; cc <= c1; cc++) {
      if (!Wd.isSolidTile(cc, rr)) continue;
      var nx = clamp(x, cc * T, cc * T + T), ny = clamp(y, rr * T, rr * T + T);
      if ((x - nx) * (x - nx) + (y - ny) * (y - ny) < rad * rad) return true;
    }
    var P = Wd.props;
    for (var n = 0; n < P.length; n++) {
      var p = P[n];
      if (!(p.fw > 0 && p.fh > 0) || LOWVEH.test(p.k)) continue;
      var px = clamp(x, p.x0, p.x1), py = clamp(y, p.y0, p.y1);
      if ((x - px) * (x - px) + (y - py) * (y - py) < rad * rad) return true;
    }
    return false;
  }
  function moveGusano(G, z, dt, w) {
    var s = w.base * w.ratio * w.nm * K.wormMul * (w.lunging ? K.wormLunge : 1), r = R(), hit = false;
    var dx = w.nx * s * dt, dy = w.ny * s * dt;
    if (dx !== 0) { if (!lowCollide(z.x + dx, z.y, r)) z.x += dx; else hit = true; }
    if (dy !== 0) { if (!lowCollide(z.x, z.y + dy, r)) z.y += dy; else hit = true; }
    z.moving = s > 0; face(z, w.nx); z.zvHit = hit;
    if (z.moving && z.sndT <= 0) { z.sndT = K.crawlEvery; oneShot(z, 'zombie.crawl'); }
    return true;
  }

  function moveCuatro(G, z, dt, w) {
    var p = G.player, pd = dist(z.x, z.y, p.x, p.y);
    if (z.leap === 1) { z.moving = false; face(z, p.x - z.x); return true; }                 // amago (agachado)
    if (z.leap === 2) {                                                                       // embestida en línea recta
      if (step(z, z.lx * K.leapSp * w.nm, z.ly * K.leapSp * w.nm, dt)) { z.leap = 3; z.leapT = K.leapRec; }
      return true;
    }
    if (z.leap === 3) { z.moving = false; return true; }                                      // recuperación: la ventana para pegarle
    if (chasing(z) && p.hp > 0 && z.leapCD <= 0 && pd <= K.leapRange && pd > K.leapMin && W().los(z.x, z.y - 4, p.x, p.y - 4)) {
      z.leap = 1; z.leapT = K.leapWind; z.moving = false; face(z, p.x - z.x);
      oneShot(z, 'zombie.lunge', { charge: true });
      return true;
    }
    var s = Math.max(w.base * 1.05, Math.min(w.base * K.fourMul, K.fourCap)) * w.ratio * w.nm;
    s *= 0.6 + 0.8 * Math.abs(Math.sin(z.animT * 7));                                          // a saltos
    step(z, w.nx * s, w.ny * s, dt);
    return true;
  }

  function moveCarretilla(G, z, dt, w) {
    if (z.face === undefined) z.face = z.flip ? Math.PI : 0;
    var diff = wrap(Math.atan2(w.ny, w.nx) - z.face), mt = K.cartTurn * dt;
    z.face = wrap(z.face + clamp(diff, -mt, mt));
    var s = w.base * w.ratio * w.nm * K.cartMul * Math.max(0, Math.cos(diff));   // la carretilla va adelante: gira antes de avanzar
    if (s > 0.5) step(z, Math.cos(z.face) * s, Math.sin(z.face) * s, dt); else z.moving = false;
    face(z, Math.cos(z.face) * 10);
    return true;
  }

  function moveCantor(G, z, dt, w) {
    var s = w.sp * K.singMul;                     // conserva el salto del motor
    var sway = Math.sin(z.animT * 3) * 0.25;      // camina meciéndose
    step(z, (w.nx - w.ny * sway) * s, (w.ny + w.nx * sway) * s, dt);
    return true;
  }

  function move(G, z, dt, want) {
    var loco = z.loco;
    if (!loco || loco === 'camina') return false;
    if (NOENGINELUNGE[loco]) { z.lungeT = 0; if (z.lungeCD < 0.5) z.lungeCD = 0.5; }
    var w = wantOf(z, want), r = false;
    z.zvHit = false;
    switch (loco) {
      case 'cojo': r = moveCojo(G, z, dt, w); break;
      case 'muletas': r = moveMuletas(G, z, dt, w); break;
      case 'silla': r = moveVehicle(G, z, dt, w, K.silla); break;
      case 'skate': r = moveVehicle(G, z, dt, w, K.skate); break;
      case 'bici': r = moveBici(G, z, dt, w); break;
      case 'moto': r = moveBici(G, z, dt, w); break;
      case 'gusano': r = moveGusano(G, z, dt, w); break;
      case 'cuatro': r = moveCuatro(G, z, dt, w); break;
      case 'carretilla': r = moveCarretilla(G, z, dt, w); break;
      case 'cantor': r = moveCantor(G, z, dt, w); break;
    }
    if (want) want.hit = !!z.zvHit;   // entities.js lo usa para "atascado" y para cambiar de rumbo al deambular
    return r;
  }

  /* ---------------- Props sueltos (silla, skate, bici) ---------------- */
  var loose = [];
  function mkCanvas(w, h, draw, ax, ay) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d'); draw(g); c.ax = ax; c.ay = ay; return c;
  }
  var PH = {};
  function placeholder(k) {
    if (PH[k]) return PH[k];
    if (k === 'skateSuelto') PH[k] = mkCanvas(14, 6, function (g) {
      g.fillStyle = '#6b3b2a'; g.fillRect(1, 1, 12, 2); g.fillStyle = '#c8402c'; g.fillRect(2, 1, 10, 1);
      g.fillStyle = '#dcd8cc'; g.fillRect(2, 3, 2, 2); g.fillRect(10, 3, 2, 2);
    }, 7, 5);
    else if (k === 'sillaRuedas') PH[k] = mkCanvas(16, 16, function (g) {
      g.strokeStyle = '#9aa0a6'; g.lineWidth = 1; g.beginPath(); g.arc(8, 10, 5, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#2d4d7a'; g.fillRect(4, 4, 8, 3); g.fillRect(10, 1, 2, 6);
      g.fillStyle = '#c9ccd0'; g.fillRect(7, 9, 2, 2);
    }, 8, 15);
    else PH[k] = mkCanvas(26, 10, function (g) {
      g.strokeStyle = '#2a2a2e'; g.lineWidth = 1;
      g.beginPath(); g.arc(5, 5, 4, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(20, 5, 4, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#b8322a'; g.beginPath(); g.moveTo(5, 5); g.lineTo(12, 3); g.lineTo(20, 5); g.moveTo(12, 3); g.lineTo(10, 7); g.stroke();
    }, 13, 9);
    return PH[k];
  }
  function looseSprite(k, flip) {
    var P = ACH.sprites && ACH.sprites.props, c = P && P[k];
    if (Array.isArray(c)) c = c[0];
    if (c && c.getContext) { if (c.ax === undefined) { c.ax = c.width >> 1; c.ay = c.height - 1; } return c; }
    return placeholder(k);
  }
  function syncRect(pr) {
    var s = pr._spr; if (!s) return;
    pr.rx0 = pr.x - s.ax; pr.ry0 = pr.y - s.ay; pr.rx1 = pr.rx0 + s.width; pr.ry1 = pr.ry0 + s.height;
  }
  function spawnLoose(k, x, y, vx, vy) {
    var props = W().props;
    var pr = { k: k, v: 0, dir: vx < 0 ? 'W' : 'E', x: Math.round(x), y: Math.round(y), fw: 0, fh: 0, tall: false, tree: false,
      x0: x, x1: x, y0: y, y1: y, cob: false, fade: 1, fb: null, lift: 0, sortDy: 0, loose: true };
    pr._spr = looseSprite(k); syncRect(pr);
    props.push(pr);
    loose.push({ pr: pr, x: x, y: y, vx: vx, vy: vy, f: FRIC[k] || 2 });
    while (loose.length > K.looseMax) removeLoose(0);
    return pr;
  }
  function removeLoose(i) {
    var L = loose[i], props = W().props, j = props.indexOf(L.pr);
    if (j >= 0) props.splice(j, 1);
    loose.splice(i, 1);
  }
  function updateLoose(dt) {
    var Wd = W();
    for (var i = 0; i < loose.length; i++) {
      var L = loose[i];
      if (Wd.props.indexOf(L.pr) < 0) { loose.splice(i--, 1); continue; }   // el mundo se rehízo
      var sp = Math.sqrt(L.vx * L.vx + L.vy * L.vy);
      if (sp < 2) continue;
      var dx = L.vx * dt, dy = L.vy * dt;
      if (!Wd.collideCircle(L.x + dx, L.y, 3)) L.x += dx; else L.vx = -L.vx * 0.35;   // rebota
      if (!Wd.collideCircle(L.x, L.y + dy, 3)) L.y += dy; else L.vy = -L.vy * 0.35;
      var f = Math.exp(-L.f * dt); L.vx *= f; L.vy *= f;
      L.pr.x = Math.round(L.x); L.pr.y = Math.round(L.y); L.pr.x0 = L.pr.x1 = L.pr.x; L.pr.y0 = L.pr.y1 = L.pr.y;
      if (!L.pr._spr) L.pr._spr = looseSprite(L.pr.k);
      syncRect(L.pr);
    }
  }

  function dismount(G, z, fromX, fromY, crash) {
    var k = LOOSEK[z.loco]; if (!k) return;
    var vx, vy;
    if (onLane(z.loco)) { vx = z.bdir * z.sp * 0.5; vy = 0; }
    else { vx = Math.cos(z.hd) * z.sp; vy = Math.sin(z.hd) * z.sp; }
    var ax = z.x - fromX, ay = z.y - fromY, al = Math.sqrt(ax * ax + ay * ay) || 1;
    var push = crash ? 0 : (z.loco === 'skate' ? 90 : 50);           // la tabla sale despedida; la silla rueda
    vx += ax / al * push; vy += ay / al * push;
    if (crash) { vx = z.bdir * Math.max(30, z.sp * 0.5); }
    var lx = z.x + (crash ? z.bdir * 4 : 0), ly = z.y + 1;
    if (ACH.armas && ACH.armas.spawnLoose) ACH.armas.spawnLoose(ARMID[z.loco], lx, ly, vx, vy);   // v0.8: la API única de objetos sueltos
    else spawnLoose(k, lx, ly, vx, vy);
    sfx('vehicle.fall', { x: z.x, y: z.y, loco: z.loco, kind: k, crash: !!crash });
    var next = z.loco === 'silla' ? 'gusano' : 'camina';
    setLoco(z, next);
    if (crash && z.state !== 'muerto') {
      z.state = 'golpeado'; z.stunT = 0.8; z.hurtT = 0.2;
      z.kbx = -vx * 0.3; z.kby = 0;   // el empuje decae con el del motor (estado golpeado)
    }
  }

  /* ---------------- onHit ---------------- */
  // Chispas + texto flotante. entities.js no llama a fx.hit en un golpe bloqueado, así que lo llamamos aquí con FX.hitText
  // cambiado solo durante la llamada (fx.js no publica una API de texto suelto).
  function clangFx(G, z, fromX, fromY, s) {
    var fx = ACH.fx; if (!fx) return;
    if (typeof fx.text === 'function') fx.text(G, z.x, z.y - 28, s);
    if (typeof fx.hit !== 'function' || !fx.FX) return;
    var dx = z.x - fromX, dy = z.y - fromY, l = Math.sqrt(dx * dx + dy * dy) || 1;
    var FX = fx.FX, old = FX.hitText;
    if (typeof fx.text !== 'function') FX.hitText = [s];
    try { fx.hit(G, z, dx / l, dy / l, false, typeof fx.text !== 'function'); } finally { FX.hitText = old; }
  }
  function onHit(G, z, fromX, fromY) {
    if (!z.loco || z.state === 'muerto') return;
    if (z.loco === 'carretilla') {
      var a = Math.atan2(fromY - z.y, fromX - z.x), f = z.face === undefined ? (z.flip ? Math.PI : 0) : z.face;
      if (Math.abs(wrap(a - f)) <= K.shieldArc) {
        sfx('shield.clang', { x: z.x, y: z.y });
        clangFx(G, z, fromX, fromY, '¡CLANG!');
        z.clangT = 0.2; z.lungeT = 0;
        return 'block';
      }
      return;
    }
    if (z.loco === 'cojo' && z.hop === 0) { z.hp -= K.hopVulnDmg; return; }   // lo agarraste parado en un pie
    if (VEH[z.loco]) dismount(G, z, fromX, fromY, false);
  }

  /* ---------------- update ---------------- */
  var lastTime = -1, lastUpd = 0;
  function tick(G, z, dt) {
    if (z.windT > 0) z.windT -= dt;
    if (z.sndT > 0) z.sndT -= dt;
    if (z.clangT > 0) z.clangT -= dt;
    if (z.hopT > 0) z.hopT -= dt;
    if (z.leapCD > 0) z.leapCD -= dt;
    if (z.leap) {
      z.leapT -= dt;
      if (z.leapT <= 0) {
        if (z.leap === 1) {
          var p = G.player, dx = p.x - z.x, dy = p.y - z.y, l = Math.sqrt(dx * dx + dy * dy) || 1;
          z.leap = 2; z.leapT = K.leapT; z.lx = dx / l; z.ly = dy / l;
        } else if (z.leap === 2) { z.leap = 3; z.leapT = K.leapRec; }
        else { z.leap = 0; z.leapCD = K.leapCD; }
      }
      if (z.state === 'golpeado' && z.leap) { z.leap = 0; z.leapCD = K.leapCD; }
    }
    if (z.pokeT > 0) {
      z.pokeT -= dt;
      if (z.pokeT <= 0) {
        z.pokeT = 0;
        var pl = G.player;
        if (z.state !== 'golpeado' && pl.hp > 0 && dist(z.x, z.y, pl.x, pl.y) <= K.pokeRange + 2) {
          z.atkCD = CFG().zAttackCD;
          oneShot(z, 'zombie.crutch', { poke: true });
          sfx('zombie.bite', { x: z.x, y: z.y, type: z.type, loco: 'muletas' });
          ACH.ent.hurtPlayer(G, ZT(z).dmg, { from: { x: z.x, y: z.y }, src: 'muleta', ignoreAir: true });   // v0.13 (F6): el escudo ve de dónde viene
        }
      }
    }
    // telegrafía de la carga de los rápidos sobre ruedas: al empezar a perseguir, amago + sonido
    if (z.state === 'perseguir' && z._ps !== 'perseguir' && (z.loco === 'skate' || onLane(z.loco))) {
      z.windT = K[z.loco].wind;
      if (z.loco === 'bici') oneShot(z, 'zombie.bike', { bell: true });
      if (z.loco === 'moto') oneShot(z, 'zombie.moto', { roar: true });   // v0.8: rugido antes de arrancar
      oneShot(z, 'zombie.lunge', { charge: true });
    }
    z._ps = z.state;
    // la carretilla sigue apuntando a Alexander mientras muerde (el motor no llama a move en 'atacar')
    if (z.loco === 'carretilla' && z.state === 'atacar') {
      var pp = G.player, d = wrap(Math.atan2(pp.y - z.y, pp.x - z.x) - z.face), mt = K.cartTurn * dt;
      z.face = wrap(z.face + clamp(d, -mt, mt));
    }
    // bici: no se sale de su pista aunque la empujen
    if (onLane(z.loco) && z.band && z.state !== 'muerto') { if (z.y < z.band.y0 - 6 || z.y > z.band.y1 + 6) setLoco(z, 'camina'); }
  }

  function sing(G, z, dt) {
    if (z.state === 'muerto') {
      if (!z.dispersed && z.singX !== undefined) {           // muerto el cantor, la mancha se dispersa
        z.dispersed = true;
        for (var i = 0; i < G.zombies.length; i++) {
          var o = G.zombies[i];
          if (o.state === 'investigar' && dist(o.tx, o.ty, z.singX, z.singY) < 16) { o.state = 'deambular'; o.wT = 0; }
        }
      }
      return;
    }
    if (z.state === 'golpeado') return;
    z.singT -= dt;
    if (z.singT > 0) return;
    z.singT = K.singEvery;
    z.singX = z.x; z.singY = z.y;
    var was = z.state;
    if (ACH.ent.emitNoise) ACH.ent.emitNoise(G, z.x, z.y, K.singNoise);
    else if (G.noises) G.noises.push({ x: z.x, y: z.y, r: K.singNoise, t: 0 });
    if (z.state === 'investigar' && was !== 'investigar') z.state = was;   // el cantor no se jala a sí mismo
  }

  /* ---- audio: loops posicionales (máx. 4, a ≤300 px de la cámara) o, sin loop(), one-shots espaciados ---- */
  var looping = [];
  function stopLoop(z) {
    if (z._loop) { try { z._loop.stop(); } catch (e) { /* nada */ } }
    z._loop = null; z._loopName = null;
    var i = looping.indexOf(z); if (i >= 0) looping.splice(i, 1);
  }
  function stopAllLoops() { while (looping.length) stopLoop(looping[0]); }
  function loopWanted(z) {
    var n = LOOP[z.loco];
    if (!n || z.state === 'muerto') return null;
    if (n !== 'zombie.sing' && !z.moving) return null;
    return n;
  }
  function updateAudio(G, dt) {
    var c = camC(), cand = [], i, z;
    for (i = 0; i < G.zombies.length; i++) {
      z = G.zombies[i];
      var n = loopWanted(z);
      if (!n) continue;
      var d = dist(c.x, c.y, z.x, z.y);
      if (d <= K.audioR) cand.push({ z: z, d: d, n: n });
    }
    cand.sort(function (a, b) { return a.d - b.d; });
    if (cand.length > K.maxLoops) cand.length = K.maxLoops;
    var hasLoop = ACH.audio && typeof ACH.audio.loop === 'function';
    var keep = cand.map(function (e) { return e.z; });
    for (i = looping.length - 1; i >= 0; i--) {
      z = looping[i];
      var j = keep.indexOf(z);
      if (j < 0 || cand[j].n !== z._loopName) stopLoop(z);
    }
    for (i = 0; i < cand.length; i++) {
      z = cand[i].z;
      var data = { x: z.x, y: z.y, loco: z.loco, type: z.type, speed: z.sp || 0 };
      if (hasLoop) {
        if (!z._loop) {
          var h = null;
          try { h = ACH.audio.loop(cand[i].n, data); } catch (e) { h = null; }
          if (h) { z._loop = h; z._loopName = cand[i].n; looping.push(z); }
        } else if (z._loop.move) z._loop.move(z.x, z.y);
      } else {
        z.loopSndT = (z.loopSndT || 0) - dt;
        if (z.loopSndT <= 0) { z.loopSndT = LOOP_EVERY[cand[i].n] || 1; sfx(cand[i].n, data); }
      }
    }
  }

  function update(G, dt) {
    installDebug();
    lastUpd = Date.now();
    if (G.time < lastTime - 1e-6) reset();         // partida nueva
    lastTime = G.time;
    var ZB = ACH.zbeh;
    for (var i = 0; i < G.zombies.length; i++) {
      var z = G.zombies[i];
      // v0.9 (H2): al morir, el comportamiento propio (senoras.js) suelta su botín una sola vez
      if (z.state === 'muerto' && !z._zbDead && ZB && ZB[z.type] && ZB[z.type].onDeath) {
        z._zbDead = true;
        try { ZB[z.type].onDeath(G, z); } catch (eD) { console.warn('[ACHORADO] zbeh.onDeath', eD); }
      }
      if (!z.loco) continue;
      if (z.state !== 'muerto') tick(G, z, dt);
      if (z.loco === 'cantor') sing(G, z, dt);
      // v0.8: muerto el de la carretilla, la carretilla queda suelta (se patea con F)
      if (z.loco === 'carretilla' && z.state === 'muerto' && !z._cartLoose && ACH.armas && ACH.armas.spawnLoose) {
        z._cartLoose = true;
        var cf = z.face === undefined ? (z.flip ? Math.PI : 0) : z.face;
        ACH.armas.spawnLoose('carretilla', z.x + Math.cos(cf) * 9, z.y + Math.sin(cf) * 4 + 1, 0, 0);
      }
    }
    updateLoose(dt);
    updateAudio(G, dt);
    if (ACH.senoras && ACH.senoras.tick) { try { ACH.senoras.tick(G, dt); } catch (eT) { if (!update.senErr) { update.senErr = 1; console.warn('[ACHORADO] senoras.tick', eT); } } }   // v0.9: mojado, charcos
  }
  function reset() {
    stopAllLoops();
    for (var i = loose.length - 1; i >= 0; i--) removeLoose(i);
  }
  // pausa / título / pestaña oculta: si update() deja de correr, se callan los loops
  setInterval(function () { if (looping.length && Date.now() - lastUpd > 300) stopAllLoops(); }, 300);

  /* ---------------- frame ---------------- */
  function anch(c) { if (c && c.ax === undefined) { c.ax = c.width >> 1; c.ay = c.height - 1; } return c; }
  function pick(arr, f) {
    if (!arr) return null;
    if (arr.getContext) return anch(arr);
    if (!arr.length) return null;
    return anch(arr[((f % arr.length) + arr.length) % arr.length]);
  }
  function animFps(z) {
    switch (z.loco) {
      case 'silla': return (z.sp || 0) / 9;
      case 'skate': return (z.sp || 0) / 16;
      case 'bici': case 'moto': return (z.sp || 0) / 11;
      case 'camina': return ZT(z).anim;
      default: return FPS[z.loco] || ZT(z).anim;
    }
  }
  // Devuelve el lienzo sin voltear: render.js voltea con z.flip (drawSpr), igual que hoy.
  function frame(z) {
    var S = ACH.sprites && ACH.sprites.zvar, set = S && z.skin && S[z.skin];
    if (!set) return null;
    var flashT = (ACH.ent && ACH.ent.CFG.fx.killFlashT) || 0.05;
    if (z.state === 'muerto' && z.deadT >= flashT) return pick(set.dead, 0) || null;
    var f = Math.floor(z.animT * animFps(z));
    // v0.9 (H2): poses de ataque de las señoras (senoras.js pone z.zpose = 'windup' | 'attack' y el cuadro z.zposeF); golpeada: su cuadro blanco
    if (z.zpose && set[z.zpose] && z.state !== 'muerto') {
      var hk = z.zpose === 'windup' ? 'hurtWindup' : 'hurtAttack';
      if ((z.state === 'golpeado' || z.clangT > 0) && set[hk]) return pick(set[hk], z.zposeF | 0);
      if (z.state !== 'golpeado') return pick(set[z.zpose], z.zposeF | 0);
    }
    if (z.state === 'golpeado' || z.state === 'muerto' || z.clangT > 0) return pick(set.hurt, f) || pick(set.move, f);
    if ((z.windT > 0 || z.leap === 1 || z.pokeT > 0) && Array.isArray(set.extra) && set.extra.length) return pick(set.extra, 0);
    if (z.loco === 'cojo' && z.hop === 0) return pick(set.move, 0);
    return pick(set.move, z.moving ? f : 0);
  }

  /* ---------------- Debug ---------------- */
  function installDebug() {
    var D = ACH.debug;
    if (!D || D.zvar) return;
    D.zvar = function () {
      var G = ACH.G, out = { total: 0 };
      LOCOS.forEach(function (l) { out[l] = 0; });
      (G ? G.zombies : []).forEach(function (z) { if (z.state === 'muerto') return; out.total++; out[z.loco || 'camina']++; });
      out.loose = loose.length; out.loops = looping.length;
      return out;
    };
    D.spawnZ = function (loco, x, y, type) {
      var G = ACH.G, p = G.player;
      if (x === undefined) { x = p.x + 40; y = p.y; }
      var z = ACH.ent.makeZombie(type || 'caminante', x, y);
      assign(z, Math.random, loco || 'camina');
      G.zombies.push(z);
      return { loco: z.loco, skin: z.skin, hp: z.hp, x: z.x, y: z.y, i: G.zombies.length - 1 };
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installDebug); else setTimeout(installDebug, 0);

  ACH.zvar = { assign: assign, balance: balance, move: move, onHit: onHit, update: update, frame: frame, setLoco: setLoco, K: K, LOCOS: LOCOS, loose: loose };
})();
