/* ACHORADO — js/engine/aves.js (v0.9, H2): gallinazos hostiles del Cerro (SPEC v0.9 §6). En la Gambetta no hace nada (los posados de
   decoración siguen en entities.js / render.js).
   API (§12): ACH.aves = { list, stats:{scared, killed}, hitCircle(G, x, y, r, zMax, dmg, src) → n, hitPoint(G, x, y, z, tol, dmg, src) → ave|null,
   burn(ave) → bool, update(G, dt), reset(G?) }. game.js llama a update (cada paso de juego) y a reset (al crear el mundo).
   Estados: posado → vuela (en círculo a 60–90 px de z, sombra en el suelo) → aviso (0.6 s: chillido, la sombra crece y se oscurece) → picada
   (200 px/s, corrige un poco) → picotea (hasta 2 × 5 de daño en 0.6 s) → sube → vuela. golpeado → huye (8 s). cae → muerto (en el suelo).
   Más: come (baja a un cadáver 6 s y no ataca), regresa (de noche vuelve a dormir a su percha). Dibujo por ACH.drawHooks. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  var K = {
    maxActive: 4, nightActive: 2, maxBirds: 9, respawnEvery: 30, respawnBelow: 2,
    takeoffR: 130, takeoffRHot: 190, hotHigh: 50,           // más bravos cerca de los basurales y en la ladera alta (fila < 50)
    circleR: [50, 80], zFly: [60, 90], angSp: 0.9, followSp: 45, followR: 300, homeR: 420,
    near: 160, diveAfter: [5, 9], warn: 0.6, diveSp: 200, diveTurn: 2.2, diveMaxT: 1.7, oneDiveGap: 3.5,   // v0.13 T2 (C5): menos picadas (antes [3, 6] y 2.0)
    peckR: 10, peckZ: 10, peckDmg: 5, pecks: [0.08, 0.38], peckT: 0.6, peckHitR: 15,
    riseT: 1.0, riseSp: 80, hp: 2, hurtT: 0.35, fleeT: 8, fleeSp: 110, fleeZ: 100,
    eatR: 220, eatT: 6, eatChance: 0.35, eatCheck: 2, eatScare: 26, corpseMaxT: 8,
    bodyR: 7, fallG: 300, deadT: 4, fireZ: 30, invulnT: 0.2, textCD: 2.5
  };
  var A = { list: [], stats: { scared: 0, killed: 0, dives: 0, pecks: 0, eaten: 0 }, K: K };
  var S = { on: false, respawnT: 0, nextId: 1, lastDiveEnd: -1e9, textAt: -1e9, feathers: [], texts: [] };

  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function sfx(name, data) { var a = ACH.audio; if (a && a.emit) { try { a.emit(name, data); } catch (e) { /* nada */ } } }
  function night() { var N = ACH.noche; return !!(N && N.t > 0.5); }
  function W() { return ACH.world; }
  function T() { return (W() && W().T) || 16; }
  function alive(b) { return b.state !== 'cae' && b.state !== 'muerto'; }
  function active(b) { return b.state !== 'posado' && b.state !== 'regresa' && alive(b); }
  function activeN() { var n = 0; for (var i = 0; i < A.list.length; i++) if (active(A.list[i])) n++; return n; }
  function limit() { return night() ? K.nightActive : K.maxActive; }
  function hotSpot(x, y) {
    if (y < K.hotHigh * T()) return true;
    var P = (W() && W().trashPiles) || [];
    for (var i = 0; i < P.length; i++) if (dist(x, y, P[i].x, P[i].y) < (P[i].r || 40) + 80) return true;
    return false;
  }
  function canHunt(G) { var p = G.player; return G.state === 'playing' && p && p.hp > 0 && !(p.invisT > 0); }

  /* ---------------- Creación ---------------- */
  function mk(x, y, z, state, perch) {
    var b = { id: S.nextId++, x: x, y: y, z: z, state: state, t: 0, hp: K.hp, ang: rand(0, 6.28), dir: Math.random() < 0.5 ? 1 : -1,
      cx: x, cy: y, cr: rand(K.circleR[0], K.circleR[1]), zt: rand(K.zFly[0], K.zFly[1]), vx: 0, vy: 0, flip: Math.random() < 0.5, anim: rand(0, 3),
      near: 0, diveAt: rand(K.diveAfter[0], K.diveAfter[1]), perch: perch || null, homeX: x, homeY: y, eatCk: rand(0, K.eatCheck), corpse: null,
      flashT: 0, invulnT: 0, rot: 0, vz: 0, burning: false, peckN: 0, ox: 0 };
    A.list.push(b);
    return b;
  }
  function reset(G) {
    A.list.length = 0; S.feathers.length = 0; S.texts.length = 0;
    A.stats.scared = 0; A.stats.killed = 0; A.stats.dives = 0; A.stats.pecks = 0; A.stats.eaten = 0;
    S.respawnT = 0; S.lastDiveEnd = -1e9; S.textAt = -1e9;
    var Wd = W(), P = Wd && Wd.perches;
    S.on = !!(P && P.length && (!ACH.game || !ACH.game.levelId || ACH.game.levelId() === 'cerro' || Wd.id === 'cerro'));
    S.world = Wd;
    if (!S.on) return;
    // posados al empezar: los marcadores V y algunos del basural
    var basural = 0;
    for (var i = 0; i < P.length; i++) {
      var q = P[i];
      if (q.spawn) mk(q.x, q.y, q.z || 0, 'posado', q);
      else if (q.kind === 'basural' && basural < 3 && i % 2 === 0) { basural++; mk(q.x, q.y, q.z || 0, 'posado', q); }
    }
  }

  /* ---------------- Daño ---------------- */
  function feathers(x, y, z, n) {
    for (var i = 0; i < n; i++) S.feathers.push({ x: x, y: y, z: z, vx: rand(-40, 40), vy: rand(-25, 25), vz: rand(10, 50), t: 0, life: rand(0.8, 1.4), f: i % 3, rot: rand(0, 6.28) });
    if (S.feathers.length > 40) S.feathers.splice(0, S.feathers.length - 40);
  }
  function text(x, y, s) { S.texts.push({ x: x, y: y, s: s, t: 0 }); if (S.texts.length > 3) S.texts.shift(); }
  function shout(G, b) {
    var t = G ? G.time : 0;
    if (t - S.textAt < K.textCD) return;
    S.textAt = t;
    text(b.x, b.y - b.z - 14, '¡FUERA, PAJARRACO!');
    var p = G && G.player, a = ACH.audio;
    if (a && a.say && p) { try { a.say('gallinazo', { who: 'alex', x: p.x, y: p.y }); } catch (e) { /* sin voz */ } }
  }
  function kill(b, burning) {
    b.hp = 0; b.state = 'cae'; b.t = 0; b.vz = 0; b.burning = !!burning; b.corpse = null;
    A.stats.killed++;
    sfx('gallinazo.fall', { x: b.x, y: b.y, z: b.z, burn: !!burning });
  }
  // v0.13 T2 (C5): A.onScare(b, src, killed) — cerro.js cuenta los espantados junto al nido del basural
  function scareHook(b, src, killed) { if (typeof A.onScare === 'function') { try { A.onScare(b, src, killed); } catch (e) { /* nada */ } } }
  function hurtBird(G, b, dmg, src, fx, fy) {
    if (!alive(b) || (b.invulnT > 0 && src !== 'fire' && src !== 'molotov')) return false;
    b.invulnT = K.invulnT;
    b.hp -= dmg === undefined ? 1 : dmg;
    if (src === 'fire' || src === 'molotov') b.hp = 0;   // §6/§7.2: el fuego y el molotov lo prenden: cae quemándose
    feathers(b.x, b.y, b.z + 4, 5);
    sfx('gallinazo.hit', { x: b.x, y: b.y, z: b.z, src: src });
    shout(G, b);
    if (b.corpse) { b.corpse._ave = 0; b.corpse = null; }
    if (b.hp <= 0) { kill(b, src === 'molotov' || src === 'fire'); scareHook(b, src, true); return true; }
    var dx = b.x - (fx === undefined ? b.x : fx), dy = b.y - (fy === undefined ? b.y : fy), l = Math.sqrt(dx * dx + dy * dy);
    if (l < 0.01) { var a = rand(0, 6.28); dx = Math.cos(a); dy = Math.sin(a); l = 1; }
    b.vx = dx / l * 120; b.vy = dy / l * 80;
    if (b.state !== 'golpeado' && b.state !== 'huye') { A.stats.scared++; scareHook(b, src, false); }
    b.state = 'golpeado'; b.t = 0; b.flashT = K.hurtT; b.peckN = 0;
    if (b.z < 6) b.z = 6;
    return true;
  }
  // Círculo en el suelo (guitarrazo, escoba): las aves dentro de r (más su cuerpo) y con z ≤ zMax. Devuelve cuántas.
  function hitCircle(G, x, y, r, zMax, dmg, src) {
    if (!S.on) return 0;
    var n = 0, zm = zMax === undefined ? 24 : zMax;
    for (var i = 0; i < A.list.length; i++) {
      var b = A.list[i];
      if (!alive(b) || b.z > zm) continue;
      if (dist(b.x, b.y, x, y) > r + K.bodyR) continue;
      if (hurtBird(G || ACH.G, b, dmg, src || 'swing', x, y)) n++;
    }
    return n;
  }
  // Punto en el aire (piedra, molotov): la primera ave a ≤ cuerpo en el plano y a ±tol de su z. Devuelve el ave o null.
  function hitPoint(G, x, y, z, tol, dmg, src) {
    if (!S.on) return null;
    var tl = tol === undefined ? 10 : tol, best = null, bd = 1e9;
    for (var i = 0; i < A.list.length; i++) {
      var b = A.list[i];
      if (!alive(b) || Math.abs(b.z - (z || 0)) > tl) continue;
      var d = dist(b.x, b.y, x, y);
      if (d <= K.bodyR + 2 && d < bd) { bd = d; best = b; }
    }
    if (best && hurtBird(G || ACH.G, best, dmg, src || 'stone', x, y)) return best;
    return best && best.invulnT > 0 ? best : null;
  }
  // Ventilador de escoba (armas.fanning): la picada no entra, el gallinazo rebota golpeado (mismo camino que hitCircle).
  function fanBounce(G, b, p) {
    var hit = hurtBird(G, b, 1, 'escoba', p.x, p.y);
    if (!hit && alive(b) && b.state !== 'golpeado') {   // estaba en su 0.2 s de invulnerabilidad: rebota igual, sin daño
      var dx = b.x - p.x, dy = b.y - p.y, l = Math.sqrt(dx * dx + dy * dy) || 1;
      b.vx = dx / l * 120; b.vy = dy / l * 80; b.state = 'golpeado'; b.t = 0; b.flashT = K.hurtT; b.peckN = 0; if (b.z < 6) b.z = 6;
    }
  }
  function fanning(p) { var AR = ACH.armas; if (!AR || !AR.fanning) return false; try { return !!AR.fanning(p); } catch (e) { return false; } }
  function burn(b) {
    if (!b || !alive(b)) return false;
    feathers(b.x, b.y, b.z + 4, 4);
    kill(b, true); scareHook(b, 'fire', true);
    return true;
  }

  /* ---------------- Comportamiento ---------------- */
  function toFly(b) { b.state = 'vuela'; b.t = 0; b.near = 0; b.diveAt = rand(K.diveAfter[0], K.diveAfter[1]); b.cx = b.x - Math.cos(b.ang) * b.cr; b.cy = b.y - Math.sin(b.ang) * b.cr * 0.7; b.zt = rand(K.zFly[0], K.zFly[1]); }
  function toRise(G, b) {
    var p = G.player, dx = b.x - p.x, dy = b.y - p.y, l = Math.sqrt(dx * dx + dy * dy) || 1;
    b.state = 'sube'; b.t = 0; b.vx = dx / l * K.riseSp; b.vy = dy / l * K.riseSp * 0.7;
    if (b.corpse) { b.corpse._ave = 0; b.corpse = null; }
    S.lastDiveEnd = G.time;
    sfx('gallinazo.flap', { x: b.x, y: b.y, z: b.z });
  }
  function nearestPerch(b) {
    var P = (W() && W().perches) || [], best = null, bd = 1e9;
    for (var i = 0; i < P.length; i++) {
      var q = P[i], taken = false;
      for (var j = 0; j < A.list.length; j++) if (A.list[j] !== b && A.list[j].perch === q && (A.list[j].state === 'posado' || A.list[j].state === 'regresa')) { taken = true; break; }
      if (taken) continue;
      var d = dist(b.x, b.y, q.x, q.y); if (d < bd) { bd = d; best = q; }
    }
    return best;
  }
  function findCorpse(G, b) {
    var zs = G.zombies, best = null, bd = K.eatR;
    for (var i = 0; i < zs.length; i++) {
      var z = zs[i];
      if (z.state !== 'muerto' || z._ave || z.deadT > K.corpseMaxT - K.eatT * 0.5) continue;
      var d = dist(b.x, b.y, z.x, z.y); if (d < bd) { bd = d; best = z; }
    }
    return best;
  }
  function diving() { for (var i = 0; i < A.list.length; i++) { var s = A.list[i].state; if (s === 'aviso' || s === 'picada' || s === 'picotea') return true; } return false; }
  function moveTo(b, tx, ty, sp, dt) {
    var dx = tx - b.x, dy = ty - b.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.5) return 0;
    var s = Math.min(d, sp * dt);
    b.vx = dx / d * sp; b.vy = dy / d * sp; b.x += dx / d * s; b.y += dy / d * s;
    return d - s;
  }
  function approach(v, to, k, dt) { return v + (to - v) * (1 - Math.exp(-k * dt)); }

  function updateBird(G, b, dt) {
    var p = G.player, d, i;
    b.t += dt; b.anim += dt;
    if (b.flashT > 0) b.flashT -= dt;
    if (b.invulnT > 0) b.invulnT -= dt;
    // fuego en el suelo: se quema y cae (ACH.fuego.inFire de fuego.js)
    if (alive(b) && b.z < K.fireZ && ACH.fuego && typeof ACH.fuego.inFire === 'function') { var inF = false; try { inF = ACH.fuego.inFire(b.x, b.y); } catch (e) { /* nada */ } if (inF) { burn(b); return; } }
    switch (b.state) {
      case 'posado': {
        if (!p || p.hp <= 0) break;
        d = dist(b.x, b.y, p.x, p.y);
        var R = hotSpot(b.x, b.y) ? K.takeoffRHot : K.takeoffR;
        if (night()) R *= 0.5;   // de noche duermen: hay que pasar más cerca
        if (d < R && activeN() < limit() && G.state === 'playing') {
          b.state = 'despega'; b.t = 0; b.cx = b.x; b.cy = b.y; b.zt = rand(K.zFly[0], K.zFly[1]); b.perch = null;
          sfx('gallinazo.flap', { x: b.x, y: b.y, z: b.z });
        }
        break;
      }
      case 'despega': {
        b.z = approach(b.z, b.zt, 2.2, dt);
        b.ang += K.angSp * b.dir * dt;
        var tx = b.cx + Math.cos(b.ang) * b.cr, ty = b.cy + Math.sin(b.ang) * b.cr * 0.7;
        moveTo(b, tx, ty, 70, dt);
        if (b.t > 1.4) toFly(b);
        break;
      }
      case 'vuela': {
        // el centro del círculo sigue a Alexander de lejos (o vuelve a casa)
        var follow = p && p.hp > 0 && dist(b.cx, b.cy, p.x, p.y) < K.followR;
        var gx = follow ? p.x : b.homeX, gy = follow ? p.y : b.homeY, gd = dist(b.cx, b.cy, gx, gy);
        if (gd > 4) { var fs = Math.min(gd, K.followSp * dt); b.cx += (gx - b.cx) / gd * fs; b.cy += (gy - b.cy) / gd * fs; }
        b.ang += K.angSp * b.dir * dt;
        var nx = b.cx + Math.cos(b.ang) * b.cr, ny = b.cy + Math.sin(b.ang) * b.cr * 0.7;
        b.vx = (nx - b.x) / Math.max(dt, 1e-3); b.vy = (ny - b.y) / Math.max(dt, 1e-3);
        b.x = nx; b.y = ny;
        b.z = approach(b.z, b.zt + Math.sin(b.t * 0.8 + b.id) * 6, 1.5, dt);
        // de noche sobran: vuelven a dormir
        if (night() && activeN() > limit()) { var q = nearestPerch(b); if (q) { b.state = 'regresa'; b.t = 0; b.perch = q; break; } }
        // comer muertos
        b.eatCk -= dt;
        if (b.eatCk <= 0) {
          b.eatCk = K.eatCheck;
          if (Math.random() < K.eatChance) { var c = findCorpse(G, b); if (c) { b.state = 'baja'; b.t = 0; b.corpse = c; c._ave = b.id; break; } }
        }
        if (canHunt(G) && dist(b.x, b.y, p.x, p.y) < K.near) b.near += dt; else b.near = Math.max(0, b.near - dt * 0.5);
        if (b.near >= b.diveAt && canHunt(G) && !diving() && G.time - S.lastDiveEnd > K.oneDiveGap) {
          b.state = 'aviso'; b.t = 0; A.stats.dives++;
          sfx('gallinazo.screech', { x: b.x, y: b.y, z: b.z });
        }
        break;
      }
      case 'aviso': {   // 0.6 s: se frena y chilla; la sombra crece y se oscurece (el aviso)
        b.vx *= Math.exp(-3 * dt); b.vy *= Math.exp(-3 * dt);
        b.x += b.vx * dt * 0.3; b.y += b.vy * dt * 0.3;
        if (b.t >= K.warn) {
          if (!canHunt(G)) { toFly(b); break; }
          b.state = 'picada'; b.t = 0; b.hd = Math.atan2(p.y - b.y, p.x - b.x);
        }
        break;
      }
      case 'picada': {
        d = dist(b.x, b.y, p.x, p.y);
        if (d < 30 && fanning(p)) { fanBounce(G, b, p); break; }
        var want = Math.atan2(p.y - b.y, p.x - b.x), dh = wrap(want - b.hd), mt = K.diveTurn * dt;
        b.hd = wrap(b.hd + Math.max(-mt, Math.min(mt, dh)));
        var stp = K.diveSp * dt;
        b.vx = Math.cos(b.hd) * K.diveSp; b.vy = Math.sin(b.hd) * K.diveSp;
        b.x += Math.cos(b.hd) * stp; b.y += Math.sin(b.hd) * stp;
        var tleft = Math.max(0.12, d / K.diveSp);
        b.z = Math.max(2, b.z - (b.z - 3) / tleft * dt);
        if (d < K.peckR && b.z < K.peckZ) {
          if ((p.z || 0) > 6 || p.hp <= 0) { toRise(G, b); break; }   // saltó: pasó de largo
          b.state = 'picotea'; b.t = 0; b.peckN = 0; b.ox = b.x < p.x ? -7 : 7;
          break;
        }
        if (b.t > K.diveMaxT || (b.z <= 3 && d > 30)) toRise(G, b);
        break;
      }
      case 'picotea': {
        b.x = approach(b.x, p.x + b.ox, 18, dt); b.y = approach(b.y, p.y + 1, 18, dt); b.z = approach(b.z, 0, 18, dt);
        b.flip = b.ox < 0; b.vx = b.flip ? 1 : -1;
        if (fanning(p)) { fanBounce(G, b, p); break; }
        if (b.peckN < K.pecks.length && b.t >= K.pecks[b.peckN]) {
          b.peckN++;
          if (dist(b.x, b.y, p.x, p.y) <= K.peckHitR) {
            var hit = ACH.ent.hurtPlayer(G, K.peckDmg, { push: { x: -b.ox, y: 0, f: 6 }, src: 'gallinazo' });
            if (hit) { A.stats.pecks++; sfx('gallinazo.peck', { x: b.x, y: b.y }); feathers(b.x, b.y, 8, 1); }
          }
        }
        if (b.t >= K.peckT || p.hp <= 0) toRise(G, b);
        break;
      }
      case 'sube': {
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.z = approach(b.z, 70, 2.5, dt);
        if (b.t >= K.riseT) toFly(b);
        break;
      }
      case 'golpeado': {
        b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= Math.exp(-4 * dt); b.vy *= Math.exp(-4 * dt);
        b.z = approach(b.z, b.z + 20, 2, dt);
        if (b.t >= K.hurtT) {
          b.state = 'huye'; b.t = 0;
          var ax = b.x - (p ? p.x : b.x), ay = b.y - (p ? p.y : b.y), al = Math.sqrt(ax * ax + ay * ay) || 1;
          b.vx = ax / al * K.fleeSp; b.vy = ay / al * K.fleeSp * 0.7;
          sfx('gallinazo.flap', { x: b.x, y: b.y, z: b.z });
        }
        break;
      }
      case 'huye': {   // espantado: se aleja 8 s
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.x = Math.max(-40, Math.min((W().W || 1024) + 40, b.x));
        b.z = approach(b.z, K.fleeZ, 1.2, dt);
        if (b.t >= K.fleeT) { b.homeX = b.x; b.homeY = b.y; toFly(b); b.near = -2; }
        break;
      }
      case 'baja': {   // a comer un cadáver
        var cz = b.corpse;
        if (!cz || G.zombies.indexOf(cz) < 0) { toRise(G, b); break; }
        var left = moveTo(b, cz.x + 8, cz.y + 1, 85, dt);
        b.z = approach(b.z, 0, 1.6, dt);
        if (left < 2 && b.z < 2) { b.state = 'come'; b.t = 0; b.z = 0; b.flip = cz.x < b.x; A.stats.eaten++; }
        if (b.t > 5) toRise(G, b);
        break;
      }
      case 'come': {
        var cc = b.corpse;
        if (!cc || G.zombies.indexOf(cc) < 0 || b.t >= K.eatT || (p && p.hp > 0 && dist(b.x, b.y, p.x, p.y) < K.eatScare)) { toRise(G, b); break; }
        break;
      }
      case 'regresa': {   // de noche vuelve a dormir
        var pq = b.perch;
        if (!pq) { toFly(b); break; }
        var lf = moveTo(b, pq.x, pq.y, 70, dt);
        b.z = approach(b.z, (pq.z || 0) + (lf > 20 ? 30 : 0), 1.5, dt);
        if (lf < 2) { b.state = 'posado'; b.x = pq.x; b.y = pq.y; b.z = pq.z || 0; b.t = 0; }
        break;
      }
      case 'cae': {
        b.vz += K.fallG * dt; b.z -= b.vz * dt; b.rot += dt * 9;
        b.x += b.vx * dt * 0.3; b.y += b.vy * dt * 0.3;
        if (b.z <= 0) { b.z = 0; b.state = 'muerto'; b.t = 0; feathers(b.x, b.y, 2, 3); }
        break;
      }
      case 'muerto': break;
    }
    if (b.vx < -1) b.flip = true; else if (b.vx > 1) b.flip = false;
  }

  function respawn(G) {
    var p = G.player, V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
    var a = rand(0, 6.28), R = Math.sqrt(V.w * V.w + V.h * V.h) / 2 + 40;
    var x = Math.max(16, Math.min((W().W || 1024) - 16, p.x + Math.cos(a) * R)), y = Math.max(16, Math.min((W().H || 2400) - 16, p.y + Math.sin(a) * R));
    var b = mk(x, y, rand(K.zFly[0], K.zFly[1]), 'vuela');
    b.cx = x; b.cy = y; b.homeX = p.x; b.homeY = p.y;
    return b;
  }

  function update(G, dt) {
    if (S.world !== W()) reset(G);   // otro mundo (sin pasar por reset)
    if (!S.on || !G) return;
    var i;
    for (i = 0; i < A.list.length; i++) updateBird(G, A.list[i], dt);
    for (i = A.list.length - 1; i >= 0; i--) if (A.list[i].state === 'muerto' && A.list[i].t >= K.deadT) A.list.splice(i, 1);
    // reaparecen desde fuera de cámara cada 30 s si hay menos de 2 volando
    S.respawnT += dt;
    if (S.respawnT >= K.respawnEvery) {
      S.respawnT = 0;
      var n = 0; for (i = 0; i < A.list.length; i++) if (alive(A.list[i])) n++;
      if (G.player && G.player.hp > 0 && activeN() < K.respawnBelow && activeN() < limit() && n < K.maxBirds) respawn(G);
    }
    for (i = S.feathers.length - 1; i >= 0; i--) {
      var f = S.feathers[i];
      f.t += dt; if (f.t >= f.life) { S.feathers.splice(i, 1); continue; }
      f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= Math.exp(-2 * dt); f.vy *= Math.exp(-2 * dt);
      f.vz -= 40 * dt; f.vz = Math.max(f.vz, -14); f.z = Math.max(0, f.z + f.vz * dt); f.rot += dt * 3;
    }
    for (i = S.texts.length - 1; i >= 0; i--) { S.texts[i].t += dt; if (S.texts[i].t > 1) S.texts.splice(i, 1); }
  }

  /* ---------------- Dibujo ---------------- */
  function SPR() { return ACH.sprites || {}; }
  function fr(arr, f) { if (!arr) return null; if (arr.getContext) return arr; if (!arr.length) return null; return arr[((f % arr.length) + arr.length) % arr.length]; }
  function anch(c) { if (c && c.ax === undefined) { c.ax = c.width >> 1; c.ay = c.height >> 1; } return c; }
  var PH = null;
  function placeholder() {
    if (PH) return PH;
    PH = document.createElement('canvas'); PH.width = 22; PH.height = 9;
    var g = PH.getContext('2d'); g.fillStyle = '#16141a'; g.fillRect(0, 3, 22, 3); g.fillRect(8, 1, 6, 7); g.fillStyle = '#b8505a'; g.fillRect(14, 2, 3, 2);
    PH.ax = 11; PH.ay = 4; return PH;
  }
  function spriteOf(b) {
    var H = SPR().npc && SPR().npc.gallinazoHostil, c = null, a = b.anim;
    if (!H) return placeholder();
    switch (b.state) {
      case 'posado': {
        var D = SPR().npc && SPR().npc.gallinazo && SPR().npc.gallinazo.perch;
        c = D ? fr(D, (Math.floor((a + b.id * 1.7) / 1.3) % 4) === 3 ? 1 : 0) : fr(H.peck, 0);
        if (c && c.ax === undefined) { c.ax = c.width >> 1; c.ay = c.height - 1; }
        return c;
      }
      case 'aviso': c = fr(H.dive, Math.floor(a * 10)); break;
      case 'picada': c = fr(H.dive, Math.floor(a * 8)); break;
      case 'picotea': c = fr(H.peck, Math.floor(b.t * 9)); break;
      case 'come': c = fr(H.eat, Math.floor(b.t * 4)); break;
      case 'golpeado': c = fr(H.hurt, Math.floor(b.t * 12)); break;
      case 'cae': c = fr(H.fall, Math.floor(b.t * 10) % 2); break;
      case 'muerto': c = fr(H.fall, 2); break;
      default: c = fr(b.flashT > 0 ? (H.hurtGlide || H.glide) : H.glide, Math.floor(a * (b.state === 'huye' || b.state === 'despega' ? 10 : 6)));
    }
    return anch(c) || placeholder();
  }
  function drawBird(ctx, b, cx, cy, G) {
    var c = spriteOf(b); if (!c) return;
    var x = Math.round(b.x) - cx, y = Math.round(b.y - b.z) - cy;
    if (b.state === 'muerto') ctx.globalAlpha = Math.max(0, Math.min(1, (K.deadT - b.t) / 1));
    if (b.state === 'cae') {
      ctx.save(); ctx.translate(x, y); ctx.rotate(b.rot); if (b.flip) ctx.scale(-1, 1); ctx.drawImage(c, -c.ax, -c.ay); ctx.restore();
    } else if (b.flip) { ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(c, -c.ax, -c.ay); ctx.restore(); }
    else ctx.drawImage(c, x - c.ax, y - c.ay);
    ctx.globalAlpha = 1;
    if (b.burning && (b.state === 'cae' || (b.state === 'muerto' && b.t < 2))) {   // llamitas
      var Q = SPR().fx && SPR().fx.quemadura, q = fr(Q, Math.floor(G.clock * 10));
      if (q) ctx.drawImage(q, x - (q.ax === undefined ? q.width >> 1 : q.ax), y - (q.ay === undefined ? q.height - 1 : q.ay));
      else { ctx.fillStyle = (Math.floor(G.clock * 14) & 1) ? '#ffb22e' : '#ff6a1a'; ctx.fillRect(x - 2, y - 6, 2, 3); ctx.fillRect(x + 1, y - 5, 2, 3); }
    }
  }
  function onScreen(b, cx, cy, m) { var V = ACH.render.VIEW; return b.x > cx - m && b.x < cx + V.w + m && b.y - b.z > cy - m && b.y - b.z < cy + V.h + m + b.z; }
  var LOW = 12;   // por debajo de esta altura van con el orden por y; por encima, en la capa del aire
  function drawGround(ctx, G, cx, cy) {
    if (!S.on) return;
    var SA = SPR().fx && SPR().fx.sombraAve;
    for (var i = 0; i < A.list.length; i++) {
      var b = A.list[i];
      if (b.state === 'muerto' || (b.state === 'posado' && b.z > 0) || !onScreen(b, cx, cy, 40)) continue;
      var idx = b.z > 55 ? 0 : (b.z > 25 ? 1 : 2), al = 0.8, sc = 1.2, dark = 1;
      if (b.state === 'aviso') { var k = Math.min(1, b.t / K.warn); idx = 2; al = 0.7 + 0.3 * k; sc = 1.2 + 0.9 * k; dark = 2 + (k > 0.5 ? 1 : 0); }
      else if (b.state === 'picada') { idx = 2; al = 1; sc = 2.1; dark = 3; }
      var s = SA && SA[idx];
      var x = Math.round(b.x) - cx, y = Math.round(b.y) - cy;
      ctx.globalAlpha = al;
      if (s) {
        var w = Math.round(s.width * sc), h = Math.round(s.height * sc);
        ctx.drawImage(s, x - (w >> 1), y - (h >> 1), w, h);
        for (var dk = 1; dk < dark; dk++) { var w2 = Math.round(w * (1 - dk * 0.22)), h2 = Math.round(h * (1 - dk * 0.22)); ctx.drawImage(s, x - (w2 >> 1), y - (h2 >> 1), w2, h2); }   // más oscura (el aviso)
      }
      else { ctx.fillStyle = '#2a2440'; var ww = [10, 14, 20][idx] * sc; ctx.fillRect(x - ww / 2, y - 2, ww, 4); }
    }
    ctx.globalAlpha = 1;
  }
  function ysort(G) {
    if (!S.on) return [];
    var out = [], cx = G.cam ? G.cam.x : 0, cy = G.cam ? G.cam.y : 0;
    for (var i = 0; i < A.list.length; i++) {
      var b = A.list[i];
      if (b.z >= LOW && b.state !== 'muerto') continue;
      if (!onScreen(b, cx, cy, 60)) continue;
      (function (b) { out.push({ y: b.y + (b.state === 'picotea' ? 0.5 : 0), draw: function (ctx, ox, oy, GG) { drawBird(ctx, b, ox, oy, GG || G); } }); })(b);
    }
    return out;
  }
  function drawAir(ctx, G, cx, cy) {
    if (!S.on) return;
    var i;
    for (i = 0; i < A.list.length; i++) {
      var b = A.list[i];
      if (b.z < LOW || b.state === 'muerto' || !onScreen(b, cx, cy, 40)) continue;
      drawBird(ctx, b, cx, cy, G);
    }
    var PL = SPR().fx && SPR().fx.plumas;
    for (i = 0; i < S.feathers.length; i++) {
      var f = S.feathers[i], c = PL && PL[f.f];
      ctx.globalAlpha = f.t > f.life - 0.3 ? Math.max(0, (f.life - f.t) / 0.3) : 1;
      var x = Math.round(f.x) - cx, y = Math.round(f.y - f.z) - cy;
      if (c) ctx.drawImage(c, x - (c.ax === undefined ? 4 : c.ax), y - (c.ay === undefined ? 3 : c.ay));
      else { ctx.fillStyle = '#1a1a1e'; ctx.fillRect(x, y, 2, 1); }
    }
    ctx.globalAlpha = 1;
  }
  function arrow(ctx, x, y, s) {   // como la de render.js (Q), apuntando hacia abajo, en celeste
    ctx.fillStyle = '#131015';
    ctx.beginPath(); ctx.moveTo(x, y + s + 2); ctx.lineTo(x - s - 1, y - s); ctx.lineTo(x, y - s * 0.4); ctx.lineTo(x + s + 1, y - s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3fe0ff';
    ctx.beginPath(); ctx.moveTo(x, y + s); ctx.lineTo(x - s + 1, y - s + 1); ctx.lineTo(x, y - s * 0.4 + 1); ctx.lineTo(x + s - 1, y - s + 1); ctx.closePath(); ctx.fill();
  }
  function drawScreen(ctx, G, cx, cy) {
    if (!S.on) return;
    var i, V = ACH.render.VIEW;
    // vista de paloma (Q): los gallinazos también, en celeste
    if (G.qT > 0 && G.player) {
      var R = (ACH.ent.CFG.qRange || 400), bob = Math.round(Math.sin(G.clock * 8) * 2), p = G.player;
      for (i = 0; i < A.list.length; i++) {
        var b = A.list[i];
        if (!alive(b) || dist(b.x, b.y, p.x, p.y) > R) continue;
        var sx = Math.round(b.x) - cx, sy = Math.round(b.y - b.z) - cy - 14;
        sx = Math.max(8, Math.min(V.w - 8, sx)); sy = Math.max(8, Math.min(V.h - 24, sy));
        arrow(ctx, sx, sy + bob, 4);
      }
    }
    if (S.texts.length) {
      ctx.font = '8px Silkscreen, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (i = 0; i < S.texts.length; i++) {
        var t = S.texts[i], tx = Math.max(40, Math.min(V.w - 40, Math.round(t.x) - cx)), ty = Math.max(8, Math.round(t.y - t.t * 14) - cy);
        ctx.globalAlpha = t.t > 0.7 ? Math.max(0, 1 - (t.t - 0.7) / 0.3) : 1;
        ctx.fillStyle = '#131015'; ctx.fillText(t.s, tx + 1, ty + 1);
        ctx.fillStyle = '#ffe500'; ctx.fillText(t.s, tx, ty);
      }
      ctx.globalAlpha = 1;
    }
  }
  var DH = ACH.drawHooks = ACH.drawHooks || { ground: [], ysort: [], air: [], screen: [] };
  ['ground', 'ysort', 'air', 'screen'].forEach(function (k) { if (!Array.isArray(DH[k])) DH[k] = []; });
  DH.ground.push(drawGround); DH.ysort.push(ysort); DH.air.push(drawAir); DH.screen.push(drawScreen);

  /* ---------------- Debug ---------------- */
  function row(b) { var p = ACH.G && ACH.G.player; return { id: b.id, state: b.state, x: Math.round(b.x), y: Math.round(b.y), z: Math.round(b.z), hp: b.hp, near: +b.near.toFixed(1), diveAt: +b.diveAt.toFixed(1), d: p ? Math.round(dist(b.x, b.y, p.x, p.y)) : null }; }
  ACH.debug = ACH.debug || {};
  ACH.debug.gallinazos = function () { return { on: S.on, active: activeN(), limit: limit(), stats: A.stats, list: A.list.map(row) }; };
  // fuerza una picada: el que vuela más cerca (o uno nuevo a 60 px) pasa al aviso
  ACH.debug.gallinazo = function () {
    var G = ACH.G, p = G.player, best = null, bd = 1e9;
    if (!S.on) return null;
    A.list.forEach(function (b) { if (!active(b) && b.state !== 'posado') return; var d = dist(b.x, b.y, p.x, p.y); if (d < bd) { bd = d; best = b; } });
    if (!best || bd > 260) { best = mk(p.x + 60, p.y - 20, 70, 'vuela'); best.cx = p.x; best.cy = p.y; }
    if (best.state === 'posado') { best.z = Math.max(best.z, 40); }
    best.state = 'aviso'; best.t = 0; best.perch = null; S.lastDiveEnd = -1e9; A.stats.dives++;
    sfx('gallinazo.screech', { x: best.x, y: best.y, z: best.z });
    return row(best);
  };

  A.hitCircle = hitCircle; A.hitPoint = hitPoint; A.burn = burn; A.update = update; A.reset = reset;
  A.spawn = function (x, y, z) { if (!S.on) return null; return mk(x, y, z === undefined ? 70 : z, z === 0 ? 'posado' : 'vuela'); };
  A.on = function () { return S.on; };
  ACH.aves = A;
})();
