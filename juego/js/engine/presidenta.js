/* ACHORADO — js/engine/presidenta.js (v0.13 T2, agente CE · C1): «La Presidenta del Comité», jefa del Cerro, en la explanada de la cruz.
   Es un zombie de tipo 'presidenta' en G.zombies (le llegan solos el guitarrazo, las piedras, la tele, el molotov y la carretilla) con su
   comportamiento en ACH.zbeh.presidenta = {init, update, onHit, onDeath} (el mismo gancho que senoras.js). Vida 35 en 3 fases (35–24, 23–12, 11–0).
   - Megáfono: se planta 1,1 s y llama 3–4 señoras (balde u olla) desde los bordes de la explanada (tope de vivas por fase). Un golpe lo corta.
   - Baldazo en abanico: 3 conos (−34°, 0°, +34°) de 100 px; aviso de 0,9/0,8/0,65 s con los conos dibujados en el piso. Entre cono y cono se esquiva.
   - Ollazo a ≤ 20 px: levanta la olla 0,55/0,5/0,42 s; si le pegas de cerca mientras la levanta: contragolpe (¡CLONG!, daño doble, aturdida 1,4 s).
   - Coraza de jefa: los golpes no la tumban (0,08 s de destello y casi sin empuje), salvo el contragolpe.
   - Los 4 cilindros de agua del comité (props cilindroAzul con `arena`) apagan el fuego a 52 px cada 0,35 s; rotos a guitarrazos (3), ya no.
   Antes: diálogo con retrato (Alexander habla con retrato; la Presidenta va con su nombre en el texto). Al vencerla: diálogo, +150 XP
   (ACH.hab.addXP), ACH.concierto.dar('parlante'), diario 'cura-2', objetivo «toca la cruz», bandera de partida 'cerro.presidenta' y la cruz se activa
   (world-cerro.js inExit pregunta ACH.presidenta.crossOpen()). Si Alexander muere en la pelea, ella vuelve a su sitio con la vida llena.
   CONTINUAR con la bandera puesta (o volver a la cruz desde el mapa con el Cerro ya ganado) no la repite.
   Lo llama cerro.js en cada paso de juego: ACH.presidenta.tick(G, dt). Dibujo por ACH.drawHooks (conos, megáfono, barra de vida, avisos).
   API: ACH.presidenta = { K, state() → info, crossOpen(), touchCross(), tick(G, dt), kill(), reset() } · ACH.debug.presidenta(cmd). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var ENT = ACH.ent;
  if (!ENT || !ENT.ZT) { console.warn('[ACHORADO] presidenta.js: falta ACH.ent'); return; }
  ENT.ZT.presidenta = { hp: 35, speed: 30, anim: 6, sight: 220, dmg: 12, blind: false, lunge: false };

  var K = {
    hp: 35, ph2: 23, ph3: 11, speed: [28, 33, 38], keep: 16,
    olla: { range: 20, reach: 26, wind: [0.55, 0.5, 0.42], strikeT: 0.32, dmg: 14, push: 70, stun: 0.35, daze: 1.4, cd: 1.5 },
    fan: { rMin: 26, rMax: 125, wind: [0.9, 0.8, 0.65], throwT: 0.4, len: 100, half: 0.21, angs: [-0.6, 0, 0.6], dmg: 8, push: 45, wet: 4, cd: [4.6, 3.9, 3.2] },
    mega: { wind: 1.1, every: [15, 12, 10], first: 4, n: [3, 3, 4], max: [4, 5, 6] },
    cylR: 52, cylEvery: 0.35, armorStun: 0.08, knockMul: 0.35, xp: 150, flag: 'cerro.presidenta'
  };
  var DLG_INTRO = [
    { quien: 'presidenta', cara: 'molesta', texto: '¡Alto ahí! ¿Quién autorizó a este músico a subir sin firmar el libro de actas?' },
    { quien: 'alexander', cara: 'sorpresa', texto: '¿Libro de actas? Señora, allá abajo hay muertos caminando…' },
    { quien: 'presidenta', cara: 'serio', texto: '¡Aquí arriba manda el Comité! El parlante de la cruz es de la comunidad. Sin asamblea no se toca nada.' },
    { quien: 'alexander', cara: 'picaro', texto: 'Una cancioncita nomás, presi. Para el barrio, pues.' },
    { quien: 'presidenta', cara: 'molesta', texto: '¡Vecinas, a la asamblea! ¡Este joven no ha pagado su cuota!' },
    { quien: 'alexander', cara: 'serio', texto: 'Ya fue, Titina. Esto va a ser a la mala.' }
  ];
  var DLG_DEAD = [
    { quien: 'presidenta', cara: 'triste', texto: 'Ay… mi megáfono… Está bien, joven. Se levanta la sesión.' },
    { quien: 'presidenta', cara: 'habla', texto: 'Llévate el parlante del comité. Y escucha: la radio decía que en Miraflores hay una cura. Un laboratorio cerca del parque.' },
    { quien: 'alexander', cara: 'feliz', texto: '¿O sea que es verdad? Gracias, presi. Le prometo tocar en la próxima pollada.' },
    { quien: 'alexander', cara: 'habla', texto: 'Ahora sí, a la cruz. A ver qué se ve desde arriba, Titina.' }
  ];
  var YELLS = ['¡Orden en la sala!', '¡Que conste en actas!', '¡Vecinas, apoyo!', '¡La cuota, joven!', '¡Se suspende la sesión!'];

  var J = { z: null, st: 'none', dead: false, open: false, hp: K.hp, phase: 1, act: null, actT: 0, cd: 1, megaT: K.mega.first, dazeT: 0,
    intro: false, lastT: -1, deaths: 0, cylT: 0, touchT: -1e9, dmgTaken: 0, fightT: 0, startHp: 0, deathT: -1, rewards: false, decided: false,
    hintFire: false, frozenByMe: false, bossOn: false, summoned: [], barT: 0, hitFlash: 0, yell: null, yellT: 0 };

  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function sfx(n, d) { var a = ACH.audio; if (a && a.emit) { try { a.emit(n, d); } catch (e) { /* nada */ } } }
  function toast(s) { if (ACH.hud && ACH.hud.toast) { try { ACH.hud.toast(s); } catch (e) { /* nada */ } } }
  function call(o, fn, a, b, c) { if (o && typeof o[fn] === 'function') { try { return o[fn](a, b, c); } catch (e) { console.warn('[ACHORADO] presidenta ' + fn, e); } } return undefined; }
  function W() { return ACH.world; }
  function arena() { var w = W(); return w && w.arena; }
  function isCerro() { var w = W(); return !!(w && w.id === 'cerro' && w.arena); }
  function ph() { return J.phase - 1; }
  function playing(G) { return G && G.state === 'playing' && G.player && G.player.hp > 0; }
  function shake(G, amp, dur) { if (G) G.shake = { amp: amp, t: dur, dur: dur }; }
  function stext(x, y, s, col) { if (ACH.senoras && ACH.senoras.text) ACH.senoras.text(x, y, s, col); }
  function setBoss(on) {
    on = !!on; if (on === J.bossOn) return; J.bossOn = on;
    var A = ACH.audio, m = A && A.music, e = A && A.musicEngine;
    try { if (m && typeof m.setBoss === 'function') m.setBoss(on); else if (e && typeof e.setBoss === 'function') e.setBoss(on); } catch (er) { /* nada */ }
  }
  function stinger(n) { var m = ACH.audio && ACH.audio.music; if (m && m.stinger) { try { m.stinger(n); } catch (e) { /* nada */ } } }
  var MELEE = { guitar: 1, fist: 1, punch: 1, swing: 1, escoba: 1 }, RANGED = { stone: 1, molotov: 1, fire: 1, burn: 1, carretilla: 1, tele: 1, thrown: 1, gas: 1 };
  function isMelee(G, src) { if (MELEE[src]) return true; if (RANGED[src]) return false; var p = G && G.player, w = p && p.atkW; return !!(w && p.atkT >= 0 && w.kind === src); }
  function phaseOf(hp) { return hp <= K.ph3 ? 3 : hp <= K.ph2 ? 2 : 1; }

  /* ---------------- banderas de partida (CONTINUAR) ---------------- */
  function P() { return ACH.partida; }
  function flagDead() { var p = P(); if (!p || typeof p.flag !== 'function') return false; try { return !!(p.continuando && p.continuando() && p.flag(K.flag)); } catch (e) { return false; } }
  function backFromMap(G) {   // VOLVER del mapa con el Cerro ganado: se reaparece en el último descanso, junto a la cruz
    var V = ACH.viaje, pr = null; try { pr = V && V.progress && V.progress(); } catch (e) { pr = null; }
    var RP = W().restPoints || [];
    return !!(pr && pr.cerro && G && RP.length && (G.restIdx | 0) === RP.length - 1 && !(G.time > 2));
  }
  function decide(G) {   // primer paso de cada visita al Cerro: ¿ya la vencieron?
    J.decided = true;
    var dead = flagDead() || backFromMap(G);
    var p = P();
    if (!dead && p && typeof p.continuando === 'function' && !p.continuando() && typeof p.freshLevel === 'function') { try { p.freshLevel('cerro'); } catch (e) { /* nada */ } }
    if (dead) { J.dead = true; J.open = true; J.st = 'muerta'; J.rewards = true; call(p, 'flag', K.flag, true); call(ACH.objetivo, 'set', 'Toca la cruz de la cima'); return; }   // v0.13 fix M1: el objetivo refleja la bandera
    J.dead = false; J.open = false; J.rewards = false; J.intro = false; J.st = 'espera';
    spawn(G);
  }

  /* ---------------- la jefa ---------------- */
  function spawn(G) {
    var A = arena(); if (!A || !G) return;
    if (ACH.cerroArte) call(ACH.cerroArte, 'presidenta');
    var z = ENT.makeZombie('presidenta', A.home.x, A.home.y);
    z.hp = K.hp; z.hpMax = K.hp; z.boss = true; z.jefe = true; z.noDifHp = true; z.loco = 'camina'; z.skin = 'presidenta'; z.presi = true;
    G.zombies.push(z); J.z = z; J.hp = K.hp; J.phase = 1; J.act = null; J.cd = 1; J.megaT = K.mega.first; J.dazeT = 0;
    restoreCyl();
  }
  function restoreCyl() {
    var w = W(); if (!w || !w.props) return;
    w.props.forEach(function (pr) { if (pr.arena) { delete pr._ik; pr.dstate = 0; pr.broken = false; } });
  }
  function freeze(on) {
    var G = ACH.G; if (!G) return;
    if (on) { if (G.state === 'playing') { G.state = 'cine'; call(ACH.hud, 'setState', 'cine'); J.frozenByMe = true; } }
    else if (J.frozenByMe) { J.frozenByMe = false; if (G.state === 'cine') { G.state = 'playing'; call(ACH.hud, 'setState', 'playing'); } call(ACH.input, 'reset'); }
  }
  function playDlg(lines, cb) {
    var D = ACH.dialogo, done = false, once = function () { if (done) return; done = true; freeze(false); if (cb) cb(); };
    freeze(true);
    if (D && typeof D.play === 'function') { try { if (D.play(lines, { onDone: once }) !== false) return; } catch (e) { console.warn('[ACHORADO] presidenta dialogo', e); } }
    lines.forEach(function (l) { toast(l.texto); });
    setTimeout(once, 30);
  }
  function encounter(G) {
    if (J.st !== 'espera') return;
    var z = J.z;
    call(ACH.objetivo, 'set', 'Vence a la Presidenta del Comité en la explanada de la cruz');
    if (!J.intro) { J.intro = true; J.st = 'dialogo'; playDlg(DLG_INTRO, function () { startFight(ACH.G); }); }
    else { startFight(G); say(z, '¿Otra vez tú? ¡Que conste en actas!'); }
  }
  function startFight(G) {
    var z = J.z; if (!z || z.state === 'muerto') return;
    J.st = 'pelea'; J.act = null; J.cd = 1.2; J.megaT = K.mega.first; J.fightT = 0; J.startHp = G && G.player ? G.player.hp : 0; J.dmgTaken = 0;
    z.state = 'perseguir'; stinger('boss.intro'); setBoss(true); J.barT = 0;
    if (ACH.tuto && ACH.tuto.vez) call(ACH.tuto, 'vez', 'presi.olla', 'Cuando levanta la olla, pégale: contragolpe', 'ESPACIO');
  }
  function say(z, s) { J.yell = s; J.yellT = 1.6; sfx('senora.yell', { x: z.x, y: z.y, type: 'senoraOlla' }); var A = ACH.audio; if (A && A.say) { try { A.say(s, { who: 'senora', x: z.x, y: z.y - 40, force: true }); } catch (e) { /* nada */ } } }

  function faceTo(z, x) { if (x < z.x - 0.5) z.flip = true; else if (x > z.x + 0.5) z.flip = false; }
  function boxClamp(z) {
    var A = arena(); if (!A) return;
    var b = A.box; if (z.x < b.x0) z.x = b.x0; if (z.x > b.x1) z.x = b.x1; if (z.y < b.y0) z.y = b.y0; if (z.y > b.y1) z.y = b.y1;
  }
  function walk(G, z, tx, ty, sp, dt) {
    var d = dist(z.x, z.y, tx, ty); if (d < 1) { z.moving = false; return; }
    W().moveCircle(z, (tx - z.x) / d * sp * dt, (ty - z.y) / d * sp * dt, (ENT.CFG && ENT.CFG.zRadius) || 5);
    z.moving = true; faceTo(z, tx); boxClamp(z);
  }

  function summon(G, z) {
    var A = arena(), b = A.box, n = K.mega.n[ph()], alive = J.summoned.filter(function (q) { return q.state !== 'muerto' && G.zombies.indexOf(q) >= 0; });
    J.summoned = alive;
    var room = Math.max(0, K.mega.max[ph()] - alive.length); n = Math.min(n, room);
    var pts = [[b.x0 + 8, b.y0 + 18], [b.x1 - 8, b.y0 + 18], [b.x0 + 24, b.y1 - 6], [b.x1 - 24, b.y1 - 6], [z.x - 60, b.y0 + 6], [z.x + 60, b.y0 + 6]];
    pts.sort(function () { return Math.random() - 0.5; });
    var made = 0;
    for (var i = 0; i < pts.length && made < n; i++) {
      var q = free(pts[i][0], pts[i][1]); if (!q) continue;
      var s = ENT.makeZombie(Math.random() < 0.5 ? 'senoraBalde' : 'senoraOlla', q.x, q.y);
      s.state = 'perseguir'; s.lostT = 0; s.lastX = G.player.x; s.lastY = G.player.y; s.summoned = true;
      G.zombies.push(s); J.summoned.push(s); made++;
      if (ACH.fx && ACH.fx.burst) call(ACH.fx, 'burst', G, q.x, q.y);
    }
    if (made) toast(made === 1 ? '¡Llegó una vecina del comité!' : '¡Llegaron ' + made + ' vecinas del comité!');
    else stext(z.x, z.y - 46, '¡VECINAS!', '#ffe500');
    return made;
  }
  function free(x, y) {
    var w = W(), R0 = 6;
    for (var d = 0; d <= 48; d += 6) for (var a = 0; a < 8; a++) {
      var nx = x + Math.cos(a * 0.785) * d, ny = y + Math.sin(a * 0.785) * d * 0.7;
      if (!w.collideCircle(nx, ny, R0)) return { x: Math.round(nx), y: Math.round(ny) };
      if (d === 0) break;
    }
    return null;
  }
  function fanHit(G, z) {
    var F = K.fan, p = G.player, hit = false, base = J.ang;
    for (var k = 0; k < F.angs.length; k++) {
      var a = base + F.angs[k], ux = Math.cos(a), uy = Math.sin(a);
      call(ACH.fuego, 'extinguish', z.x + ux * 50, z.y + uy * 50, 40);
      if (hit || !playing(G)) continue;
      var dx = p.x - z.x, dy = p.y - z.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > F.len + 4 || d < 0.01) continue;
      var da = Math.abs(wrap(Math.atan2(dy, dx) - a)), tol = Math.atan2(5, Math.max(8, d));
      if (da <= F.half + tol && W().los(z.x, z.y - 6, p.x, p.y - 4)) {
        hit = ENT.hurtPlayer(G, F.dmg, { push: { x: ux, y: uy, f: F.push }, src: 'presidenta.balde', from: { x: z.x, y: z.y } });
        if (hit) { p.wetT = Math.max(p.wetT || 0, F.wet); stext(p.x, p.y - 30, '¡SPLASH!', '#a6dcf0'); }
      }
    }
    sfx('balde.splash', { x: z.x, y: z.y, hit: hit });
  }
  function ollaHit(G, z) {
    var O = K.olla, p = G.player, dx = p.x - z.x, dy = p.y - z.y, d = Math.sqrt(dx * dx + dy * dy), hit = false;
    if (playing(G) && d <= O.reach) hit = ENT.hurtPlayer(G, O.dmg, { push: { x: dx || (z.flip ? -1 : 1), y: dy, f: O.push }, stun: O.stun, src: 'presidenta.olla', from: { x: z.x, y: z.y } });
    if (hit) { sfx('olla.clong', { x: z.x, y: z.y, hit: true }); stext(p.x, p.y - 32, '¡CLONG!'); shake(G, 3, 0.2); } else sfx('whiff', { x: z.x, y: z.y });
  }

  function update(G, z, dt) {
    if (!z.presi) return false;
    z.lungeT = 0;
    if (J.st === 'espera') {
      var A = arena(); z.moving = false; z.zpose = null;
      if (A && dist(z.x, z.y, A.home.x, A.home.y) > 3) walk(G, z, A.home.x, A.home.y, 30, dt);
      if (playing(G)) {
        faceTo(z, G.player.x);
        if (dist(z.x, z.y, G.player.x, G.player.y) < (A ? A.trigger : 150) && G.player.y < 11 * 16) encounter(G);
      }
      z.state = 'deambular';
      return true;
    }
    if (J.st !== 'pelea') { z.moving = false; return true; }
    var p = G.player;
    if (J.dazeT > 0) { J.dazeT -= dt; z.moving = false; z.zpose = null; return true; }
    if (!playing(G)) { z.moving = false; z.zpose = null; return true; }
    J.cd -= dt; J.megaT -= dt;
    var d = dist(z.x, z.y, p.x, p.y);
    if (J.act) {
      J.actT -= dt; z.moving = false;
      if (J.act === 'olla') {
        faceTo(z, p.x); z.zpose = 'windup'; z.zposeF = J.actT < K.olla.wind[ph()] / 2 ? 1 : 0;
        if (J.actT <= 0) { J.act = 'ollaS'; J.actT = K.olla.strikeT; ollaHit(G, z); }
      } else if (J.act === 'ollaS') {
        z.zpose = 'attack'; z.zposeF = J.actT > K.olla.strikeT * 0.5 ? 0 : 1;
        if (J.actT <= 0) { J.act = null; J.cd = K.olla.cd; z.zpose = null; }
      } else if (J.act === 'fan') {
        var want = Math.atan2(p.y - z.y, p.x - z.x), da = wrap(want - J.ang), mt = 0.8 * dt;   // corrige un poco la puntería
        J.ang = wrap(J.ang + Math.max(-mt, Math.min(mt, da)));
        z.flip = Math.cos(J.ang) < 0; z.zpose = 'windup'; z.zposeF = 1;
        if (J.actT <= 0) { J.act = 'fanS'; J.actT = K.fan.throwT; fanHit(G, z); }
      } else if (J.act === 'fanS') {
        z.zpose = 'attack'; z.zposeF = 1;
        if (J.actT <= 0) { J.act = null; J.cd = K.fan.cd[ph()]; z.zpose = null; }
      } else if (J.act === 'mega') {
        faceTo(z, p.x); z.zpose = null;
        if (J.actT <= 0) { J.act = null; summon(G, z); J.megaT = K.mega.every[ph()]; J.cd = 1.0; sfx('senora.yell', { x: z.x, y: z.y }); }
      }
      return true;
    }
    z.zpose = null; z.state = 'perseguir';
    // elegir golpe
    if (J.cd <= 0) {
      if (J.megaT <= 0) { J.act = 'mega'; J.actT = K.mega.wind; say(z, YELLS[Math.floor(Math.random() * YELLS.length)]); sfx('boss.yell', { x: z.x, y: z.y }); return true; }
      if (d <= K.olla.range) { J.act = 'olla'; J.actT = K.olla.wind[ph()]; sfx('olla.windup', { x: z.x, y: z.y }); return true; }
      if (d >= K.fan.rMin && d <= K.fan.rMax && W().los(z.x, z.y - 6, p.x, p.y - 6)) {
        J.act = 'fan'; J.actT = K.fan.wind[ph()]; J.ang = Math.atan2(p.y - z.y, p.x - z.x); sfx('balde.windup', { x: z.x, y: z.y }); return true;
      }
    }
    // caminar hacia Alexander (sin salir de la explanada)
    if (d > K.keep) walk(G, z, p.x, p.y, K.speed[ph()], dt); else { z.moving = false; faceTo(z, p.x); }
    return true;
  }
  function onHit(G, z, src, ho) {
    if (!z.presi) return;
    if (J.st === 'espera') encounter(G);
    src = (ho && ho.src) || src;
    J.hitFlash = 0.15;
    if (J.act === 'olla' && isMelee(G, src) && G.player && dist(G.player.x, G.player.y, z.x, z.y) < 34) {
      J.act = null; J.dazeT = K.olla.daze; J.cd = K.olla.cd; z.zpose = null;
      sfx('olla.parry', { x: z.x, y: z.y }); sfx('olla.clong', { x: z.x, y: z.y, parry: true }); stext(z.x, z.y - 40, '¡CLONG!', '#ff2e88'); shake(G, 2, 0.12);
      call(ACH.tuto, 'hecho', 'presi.olla');
      return 'parry';
    }
    if (J.act === 'mega') { J.act = null; J.megaT = 3; J.cd = 0.6; stext(z.x, z.y - 46, '¡ME CORTARON!', '#ffe500'); }
  }
  function onDeath(G, z) {
    if (!z.presi || J.dead) return;
    J.dead = true; J.st = 'muriendo'; J.act = null; J.deathT = 0.9; z.zpose = null;
    setBoss(false); stinger('boss.down'); sfx('boss.down', { x: z.x, y: z.y });
    J.summoned.forEach(function (q) { if (q.state !== 'muerto') { q.hp = 0; q.state = 'muerto'; q.deadT = 0; q.stunT = 0.2; } });
    J.summoned = [];
    call(ACH.inv, 'drop', z.x, z.y + 4, [{ id: 'sencillo', n: 8 }, { id: 'taper', n: 2 }, { id: 'gasolina', n: 1 }], true);
    var fh = G && G.player ? G.player.hp : 0;
    J.result = { won: true, t: +J.fightT.toFixed(1), hpLeft: Math.round(fh), dmgTaken: Math.round(J.dmgTaken) };
  }
  function rewards(G) {
    if (J.rewards) return; J.rewards = true; J.open = true; J.st = 'muerta';
    call(P(), 'flag', K.flag, true);
    call(ACH.hab, 'addXP', K.xp, false);
    call(ACH.concierto, 'dar', 'parlante');
    call(ACH.objetivo, 'diario', 'cura-2', 'La Presidenta del Comité', 'Vencida en la cima, la Presidenta confirmó lo de la radio: en Miraflores hay una cura, en un laboratorio cerca del parque.');
    call(ACH.objetivo, 'set', 'Toca la cruz de la cima');
    toast('+' + K.xp + ' XP · ¡La cruz se prendió!');
    call(P(), 'save', G, { force: true });
  }

  /* ---------------- cada paso (desde cerro.js) ---------------- */
  function tick(G, dt) {
    if (!isCerro() || !G) return;
    if (G.time < J.lastT - 1e-6 || !J.decided) { J.decided = false; J.z = null; J.summoned = []; J.deaths = G.deaths | 0; }   // visita nueva / partida nueva
    J.lastT = G.time;
    if (!J.decided) decide(G);
    var z = J.z;
    if (!J.dead && (!z || G.zombies.indexOf(z) < 0)) { J.st = 'espera'; spawn(G); z = J.z; }
    // Alexander murió: ella vuelve a su sitio con la vida llena; las vecinas se van
    if ((G.deaths | 0) !== J.deaths) {
      J.deaths = G.deaths | 0;
      if (!J.dead && z) {
        if (J.st === 'pelea') J.result = { won: false, t: +J.fightT.toFixed(1), bossHp: z.hp };
        var A = arena(); z.hp = K.hp; z.x = A.home.x; z.y = A.home.y; z.state = 'deambular'; z.burnT = 0; J.st = 'espera'; J.act = null; J.dazeT = 0; J.phase = 1;
        J.summoned.forEach(function (q) { var i = G.zombies.indexOf(q); if (i >= 0) G.zombies.splice(i, 1); }); J.summoned = [];
        restoreCyl(); setBoss(false);
      }
    }
    if (J.st === 'muriendo') { J.deathT -= dt; if (J.deathT <= 0) { J.st = 'final'; playDlg(DLG_DEAD, function () { rewards(ACH.G); }); } }
    if (z && !J.dead) {
      if (J.st === 'pelea') {
        J.fightT += dt;
        var np = phaseOf(z.hp);
        if (np > J.phase) { J.phase = np; J.megaT = Math.min(J.megaT, 0.5); say(z, np === 2 ? '¡Ahora sí me molesté!' : '¡ÚLTIMA ASAMBLEA!'); shake(G, 2, 0.25); }
      }
      // coraza: el golpe casi no la mueve ni la tumba (salvo el contragolpe)
      if (z.state === 'golpeado' && !(J.dazeT > 0)) { if (z.stunT > K.armorStun) z.stunT = K.armorStun; z.kbx *= K.knockMul; z.kby *= K.knockMul; }
      if (z.state !== 'muerto') boxClamp(z);
      J.hp = z.hp;
    }
    if (J.hitFlash > 0) J.hitFlash -= dt;
    if (J.yellT > 0) J.yellT -= dt;
    if (J.st === 'pelea' && G.player) { var hp0 = J.lastHp === undefined ? G.player.hp : J.lastHp; if (G.player.hp < hp0) J.dmgTaken += hp0 - G.player.hp; }
    J.lastHp = G.player ? G.player.hp : undefined;
    // cilindros de agua del comité: apagan el fuego cercano mientras estén enteros
    J.cylT -= dt;
    if (J.cylT <= 0) {
      J.cylT = K.cylEvery;
      var w = W(), F = ACH.fuego, n = 0;
      if (F && F.extinguish && w.props) w.props.forEach(function (pr) { if (pr.arena && !pr.broken) { try { n += +F.extinguish(pr.x, pr.y, K.cylR) || 0; } catch (e) { /* nada */ } } });
      if (n > 0 && !J.hintFire) { J.hintFire = true; toast('¡Los cilindros del comité apagan el fuego! Rómpelos a guitarrazos'); }
    }
  }
  function crossOpen() { return !!J.open; }
  function touchCross() {
    var G = ACH.G; if (!G) return;
    if (G.clock - J.touchT < 4) return; J.touchT = G.clock;
    toast(J.dead ? 'La cruz…' : 'La cruz está apagada. Primero, la Presidenta del Comité.');
  }

  /* ---------------- dibujo ---------------- */
  function V() { return (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }; }
  function chorro() { var F = ACH.sprites && ACH.sprites.fx && ACH.sprites.fx.chorro; return F && F.length ? F[F.length - 1] : null; }
  function drawFan(ctx, z, alpha, cx, cy, full) {
    var c = chorro(), F = K.fan;
    for (var k = 0; k < F.angs.length; k++) {
      var a = J.ang + F.angs[k];
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(Math.round(z.x) - cx, Math.round(z.y) - cy); ctx.rotate(a);
      if (c && full) ctx.drawImage(c, -(c.ax || 0), -(c.ay === undefined ? c.height >> 1 : c.ay));
      else {
        ctx.fillStyle = full ? '#a6dcf0' : '#5b86a0';
        for (var r = 8; r <= F.len; r += 7) for (var j = -2; j <= 2; j++) { var aa = j / 2 * F.half; ctx.fillRect(Math.round(Math.cos(aa) * r), Math.round(Math.sin(aa) * r), 2, 2); }
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  function drawGround(ctx, G, cx, cy) {
    var z = J.z; if (!z || J.dead || !isCerro()) return;
    if (J.act === 'fan') { var blink = (Math.floor(G.clock * 12) & 1) ? 1 : 0.6, k = 1 - J.actT / K.fan.wind[ph()]; drawFan(ctx, z, (0.3 + 0.45 * k) * blink, cx, cy, false); }
    // anillo de agua bajo los cilindros enteros (se ve que mojan alrededor)
    var w = W(); if (w && w.props) w.props.forEach(function (pr) {
      if (!pr.arena || pr.broken || J.st !== 'pelea') return;
      ctx.globalAlpha = 0.16; ctx.strokeStyle = '#a6dcf0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(Math.round(pr.x) - cx, Math.round(pr.y) - cy, K.cylR, K.cylR * 0.55, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    });
  }
  function ysort(G) {
    var out = [], z = J.z; if (!z || J.dead || !isCerro()) return out;
    if (J.act === 'fanS') out.push({ y: z.y + 0.5, draw: function (ctx, cx, cy) { drawFan(ctx, z, Math.max(0, J.actT / K.fan.throwT), cx, cy, true); } });
    return out;
  }
  function drawAir(ctx, G, cx, cy) {
    var z = J.z; if (!z || J.dead || !isCerro() || z.state === 'muerto') return;
    var x = Math.round(z.x) - cx, y = Math.round(z.y) - cy;
    if (J.act === 'mega' || J.yellT > 1.2) {   // megáfono en la mano
      var M = ACH.cerroArte && ACH.cerroArte.megafono();
      if (M) { ctx.save(); ctx.translate(x + (z.flip ? -6 : 6), y - 24); if (z.flip) ctx.scale(-1, 1); ctx.drawImage(M, -M.ax, -M.ay); ctx.restore(); }
      if (J.act === 'mega') { var q = (G.clock * 3) % 1; ctx.strokeStyle = '#ffe500'; ctx.globalAlpha = 1 - q; ctx.beginPath(); ctx.arc(x + (z.flip ? -20 : 20), y - 24, 3 + q * 10, z.flip ? Math.PI * 0.6 : -Math.PI * 0.4, z.flip ? Math.PI * 1.4 : Math.PI * 0.4); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    if (J.act === 'olla') { var b = Math.floor(G.clock * 16) & 1; ctx.fillStyle = b ? '#ffffff' : '#fff2b0'; ctx.fillRect(x - 1, y - 44 - b, 3, 3); ctx.fillRect(x + 4, y - 40, 1, 1); ctx.fillRect(x - 5, y - 41, 1, 1); }
    if (J.dazeT > 0) { var t = G.clock * 6; ctx.fillStyle = '#ffe500'; for (var k = 0; k < 3; k++) { var a = t + k * 2.094; ctx.fillRect(x + Math.round(Math.cos(a) * 7), y - 40 + Math.round(Math.sin(a) * 2), 2, 1); } }
  }
  function drawScreen(ctx, G) {
    if (!isCerro()) return;
    var z = J.z;
    if (z && !J.dead && (J.st === 'pelea')) {   // barra de vida (arriba, debajo de la línea de objetivo)
      var vw = V().w, bw = Math.min(180, vw - 80), bx = Math.round((vw - bw) / 2), by = 24, f = Math.max(0, z.hp) / K.hp;
      ctx.save();
      ctx.font = '8px Silkscreen, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#131015'; ctx.fillText('LA PRESIDENTA DEL COMITÉ', vw / 2 + 1, by - 1); ctx.fillStyle = '#ffe500'; ctx.fillText('LA PRESIDENTA DEL COMITÉ', vw / 2, by - 2);
      ctx.fillStyle = '#131015'; ctx.fillRect(bx - 2, by, bw + 4, 8);
      ctx.fillStyle = '#4a2a34'; ctx.fillRect(bx, by + 2, bw, 4);
      ctx.fillStyle = J.hitFlash > 0 ? '#ffffff' : '#ff2e88'; ctx.fillRect(bx, by + 2, Math.round(bw * f), 4);
      ctx.fillStyle = '#131015'; [K.ph2, K.ph3].forEach(function (h) { ctx.fillRect(bx + Math.round(bw * h / K.hp), by + 1, 1, 6); });
      ctx.restore();
    }
  }
  var DH = ACH.drawHooks = ACH.drawHooks || { ground: [], ysort: [], air: [], screen: [] };
  ['ground', 'ysort', 'air', 'screen'].forEach(function (k) { if (!Array.isArray(DH[k])) DH[k] = []; });
  DH.ground.push(drawGround); DH.ysort.push(ysort); DH.air.push(drawAir); DH.screen.push(drawScreen);

  function reset() { J.decided = false; J.z = null; J.summoned = []; J.dead = false; J.open = false; J.st = 'none'; J.act = null; J.result = null; setBoss(false); if (J.frozenByMe) freeze(false); }
  (ACH.levelHooks = ACH.levelHooks || []).push(function () { reset(); });

  ACH.zbeh = ACH.zbeh || {};
  ACH.zbeh.presidenta = { init: function (G, z) { z.zpose = null; }, update: update, onHit: onHit, onDeath: onDeath };

  function info() {
    var z = J.z;
    return { st: J.st, dead: J.dead, open: J.open, hp: z ? z.hp : null, phase: J.phase, act: J.act, dazeT: +(J.dazeT || 0).toFixed(2), fightT: +J.fightT.toFixed(1),
      x: z ? Math.round(z.x) : null, y: z ? Math.round(z.y) : null, zstate: z ? z.state : null, summoned: J.summoned.length, result: J.result || null,
      cyl: ((W() && W().props) || []).filter(function (p) { return p.arena; }).map(function (p) { return !!p.broken; }) };
  }
  ACH.presidenta = { K: K, state: info, crossOpen: crossOpen, touchCross: touchCross, tick: tick, reset: reset,
    kill: function () { var z = J.z, G = ACH.G; if (!z || J.dead) return false; ENT.hitZombie(G, z, 0, 1, { dmg: 999, src: 'debug' }); return true; } };
  ACH.debug = ACH.debug || {};
  // ACH.debug.presidenta() estado · ('kill') la mata · ('go') lleva a Alexander a la explanada · ('fight') pelea ya, sin diálogo
  ACH.debug.presidenta = function (cmd) {
    var G = ACH.G;
    if (cmd === 'kill') ACH.presidenta.kill();
    else if (cmd === 'go') { var A = arena(); if (A && ACH.debug.teleport) ACH.debug.teleport(31 * 16, 10.5 * 16); }
    else if (cmd === 'fight') { J.intro = true; if (J.st === 'espera') startFight(G); }
    return info();
  };
})();
