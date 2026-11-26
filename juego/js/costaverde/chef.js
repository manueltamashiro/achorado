/* ACHORADO — js/costaverde/chef.js (C1b): Jefe 1 de la Costa Verde, EL MAESTRO WANTÁN (chef de chifa gigante), sus palitos,
   dumplings y baozi, la arena del Chifa Gran Dragón (reja, barra de jefe) y el salto al parapente que encadena caída → Chorrillos → final.
   Contrato: COSTAVERDE.md §5 (+ §2.4 reja de la arena, §2.6 final, §10.3 sprites), MIRAFLORES.md §2 (ganchos), V011.md §2 (jefe justo).
   Patrón copiado de js/miraflores/jefa.js (sin editarlo).

   SE REGISTRA con ACH.cv.register(sys) (si no existe, crea ACH.cv = {systems: [], register}) como
     { id/name: 'chef', update, reset, onRespawn, mood, drawables, drawTop, onSwing, onProjectile }.
   El chef y los dumplings NO están en G.zombies.

   PUBLICA ACH.cv.chef (el mismo objeto siempre):
     state     'cocina' (no salió) | 'entrada' (diálogo) | 'pelea' | 'muriendo' | 'muerto'
     dead, hp, hpMax (40), phase (1–3), x, y (pies, px), edgeOpen (true: se abrió la baranda del borde), jumps (saltos al parapente)
     targets() → [{x, y, r, kind: 'chef'|'dumpling', id, big}]   lo que se puede morder / golpear ahora (para los perros de juguetes.js)
     hitBy(src, dmg, x, y, id) → daño aplicado (0 = nada)         golpe genérico: con id, a ese blanco; sin id, al blanco más cercano
                                                                   a (x, y); sin x/y, al chef. src 'dog': al chef 0,3 por mordida (si dmg
                                                                   no viene), a los dumplings los mata. src 'ball'/'helado' como los proyectiles.
     info() resumen para QA · K afinación.
   PROYECTILES (onProjectile, pr.kind): 'ball' (pelota: ×1,5 al chef; mata dumplings) · 'throw:helado' (0,5 y lo ralentiza 2 s, cada 6 s
     como mucho; mata dumplings) · 'throw:barraFosfo*' (0,5) · 'heavy:<id>' (daño completo) · 'stone' (1) · 'bubble' (0, se consume) ·
     otros 'throw:*' rebotan (false). Al pegar devuelve true y marca pr.cvHit = 'chef'|'dumpling', pr.cvNx/cvNy (normal para rebotar).
     Un mismo proyectil no vuelve a pegar antes de 0,35 s (pr._cvHitAt), por si su dueño no lo quita.
   SÓLIDOS en ACH.world.dynSolids (con jefa: true, así routeCheck los ignora): 'chef.cuerpo' (en la pelea, en el suelo) y 'chef.reja'
     (cierra la entrada mientras dura la pelea). Si C1a ya publica un sólido de la reja (id /reja/i o rejaChifa: true), se usa ESE:
     se le pone off = true (abierta) / false (cerrada). Al prop 'rejaChifa' se le pone prop.open = true/false.
   ARENA: ACH.world.terr (id 'D' o 'arena', o la más baja) → caja; si no, ACH.world.places.arena ± 12 × 4,5 tiles; borde: places.borde.
   CONGELAR: ACH.cv.freeze(bool) de nivel.js; si no está, G.state = 'cine' (game.js no actualiza ni lee input ahí) y de vuelta a 'playing'.
   CADENA FINAL: E en el borde → diálogo (1.ª vez) → carrera y salto 0,8 s → ACH.cv.caida.start({onWin, onLose}) → onWin →
     ACH.cv.chorrillos.play({onEnd}) → ACH.cv.finish(stats). Lo que falte se salta. onLose: vuelve al borde con vida llena (el chef sigue muerto).
   DEBUG: ACH.debug.cv.chef = { kill(quick), hp(n), phase(n), fight(), info(), arenaHere(), edge() } y ACH.debug.cv.skip('chef') pasa por aquí.
   Sin getImageData, shadowBlur, filter ni degradados en el bucle: los reemplazos y textos se hornean una vez. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var CV = ACH.cv = ACH.cv || {};
  CV.systems = CV.systems || [];
  if (typeof CV.register !== 'function') CV.register = function (s) { if (s && CV.systems.indexOf(s) < 0) CV.systems.push(s); return s; };

  /* ---------------- Afinación ---------------- */
  var D2R = Math.PI / 180, U = 10;   // U = «1 de daño» del contrato = una mordida de zombie (10 de 100 de vida)
  var K = {
    hp: 40, ph2: 0.6, ph3: 0.25,
    bodyW: 15, bodyUp: 7, bodyDn: 3, nearBody: 38, hitRx: 22, hitRy: 14, walk: 24, keepDist: 46, tiredMul: 2,
    // abanico de palitos
    fanTele: 0.5, fanLock: 0.35, fanN1: 5, fanN2: 7, fanArc: 50 * D2R, stickSpd: 260, stickDmg: 0.85 * U,   /* v0.13 cierre: ACHORADO (×1,3) mata al bot en ~25 s: palitos y mordidas bajan un poco */ stickR: 5, stickRange: 320, stickStuck: 1.0,
    // lluvia de palitos
    rainN: 8, rainTele: 0.7, rainR: 9, rainSpread: 90, rainGap: 16, rainDmg: 0.85 * U,
    // ritmo
    atk1: 2.6, atk2: 2.3, atk3: 1.2, summonEvery: [0, 8, 8, 11], summonN: [0, 3, 4, 2], summonTele: 0.7, dumpMax: 6,
    // salto de wok
    slamRise: 0.45, slamAir: 1.0, slamR: 40, slamDmg: 1.5 * U, slamPush: 22, tiredT: 2.5, recoverT: 0.6,
    // dumplings
    dHp: 1.5, bHp: 3, hopEvery: 0.6, hopT: 0.32, hopSpd: 70, biteR: 11, biteDmg: 0.75 * U, biteCD: 1.0, bounceSpd: 90,
    // helado y perros
    slowT: 2, slowMul: 0.5, slowCD: 6, dogDmg: 0.3,
    // final
    edgeR: 28, runT: 0.5, jumpT: 0.3, fallLoot: 12
  };
  var TXT = {
    mesa: '¡Mesa cuatro, un cantante al vapor! ¡Y bien cocido!',
    guitarra: 'En mi cocina nadie toca guitarra, compadre.',
    otraVez: '¡Otra vez tú! ¡Pedido listo!',
    llama: ['¡Wantancitos, a la mesa!', '¡Pedido listo!', '¡Salen calientitos!'],
    fase2: '¡Ahora sí: lluvia de palitos!',
    fase3: '¡Se me sube la presión… al wok!',
    tecito: '¡Un tecito, un tecito!',
    muere: '¡Mi… mi chifa…!',
    firstHit: '¡Dale nomás! Esquiva los palitos y métele guitarra',
    tired: '¡Está cansado! Ahora le duele el doble: ¡dale con todo!',
    helado: '¡Cerebro congelado! El maestro va más lento',
    edge: '¡Se abrió la baranda! Parapente de alquiler: ¡AL BORDE!',
    lose: '¡Otra vez al borde! E para tirarte de nuevo',
    prompt: 'E  TIRARSE EN PARAPENTE', arrow: '¡AL BORDE!'
  };
  var DLG_IN = [
    { quien: 'alexander', cara: 'miedo', texto: '¡Asu mare! Ese cocinero es más grande que una combi, Titina.' },
    { quien: 'alexander', cara: 'picaro', texto: 'Tranquilo, maestro. Yo solo vengo a tocar una cancioncita, nomás.' }];
  var DLG_DEAD = [{ quien: 'alexander', cara: 'risa', texto: 'Ese pedido salió crudo, maestro.' }];
  var DLG_EDGE = [
    { quien: 'alexander', cara: 'serio', texto: '¿Y si me tiro? Peor es quedarme con los muertos.' },
    { quien: 'alexander', cara: 'risa', texto: 'Titina, agárrate fuerte. ¡Ahí vamos!' }];

  /* ---------------- Utilidades ---------------- */
  function T() { return (ACH.world && ACH.world.T) || 16; }
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function now() { return ((window.performance && performance.now) ? performance.now() : Date.now()) / 1000; }
  function fn(o, k) { return o && typeof o[k] === 'function'; }
  function safe(f) { try { return f(); } catch (e) { warnOnce(e); return undefined; } }
  var warned = {};
  function warnOnce(e) { var k = String(e && e.message); if (warned[k]) return; warned[k] = 1; try { console.warn('[chef]', e); } catch (er) { /* nada */ } }
  function sfx(name, data) {
    if (fn(CV, 'sfx')) { try { CV.sfx(name, data); return; } catch (e) { /* cae al motor */ } }
    var A = ACH.audio; if (fn(A, 'emit')) { try { A.emit(name, data); } catch (e) { /* nada */ } }
  }
  function toast(s) {
    if (fn(CV, 'toast')) { try { CV.toast(s); return; } catch (e) { /* sigue */ } }
    if (ACH.hud && fn(ACH.hud, 'toast')) ACH.hud.toast(s);
  }
  var bossOn = false;
  function bossMusic(on) {
    on = !!on; if (on === bossOn) return; bossOn = on;
    var A = ACH.audio, cvA = A && A.cv, m = A && A.music, e = A && A.musicEngine;
    try {
      if (cvA && fn(cvA, 'play')) { if (on) cvA.play('cv.chef'); else if (fn(cvA, 'stop')) cvA.stop('cv.chef'); }
      else if (m && fn(m, 'setBoss')) m.setBoss(on);
      else if (e && fn(e, 'setBoss')) e.setBoss(on);
    } catch (er) { /* nada */ }
  }
  function stinger(name) { var m = ACH.audio && ACH.audio.music; if (m && fn(m, 'stinger')) { try { m.stinger(name); } catch (e) { /* nada */ } } }
  var bubble = null;   // globo propio (si no hay ACH.audio.say): {s, t, life}
  function voz(text, opts) {
    var A = ACH.audio;
    bubble = null;
    if (A && fn(A, 'say')) {
      try { if (A.say(text, { who: chefWho(), x: J.x, y: J.y - 84, force: true })) { if (opts && opts.bubble) bubble = { s: text, t: 0, life: opts.life || 2 }; return; } } catch (e) { /* cae al globo */ }
    }
    bubble = { s: text, t: 0, life: (opts && opts.life) || 2 };
  }
  function chefWho() {   // C3 puede agregar la voz 'chef' a voces-cv.js; si no, la grave de zombie
    var ph = ACH.audio && ACH.audio.phrases;
    if (ph) for (var k in ph) if (ph[k] && ph[k].who === 'chef') return 'chef';
    return 'zombie';
  }
  function hurtPlayer(G, dmg, opts) { if (ACH.ent && fn(ACH.ent, 'hurtPlayer')) return ACH.ent.hurtPlayer(G, dmg, opts); G.player.hp = Math.max(0, G.player.hp - dmg); return true; }
  function CFGE() { return (ACH.ent && ACH.ent.CFG) || { walk: 80, run: 135, radius: 5, hpMax: 100 }; }
  function collide(x, y, r) { var W = ACH.world; if (!W || !fn(W, 'collideCircle')) return false; selfIgnore = true; try { return !!W.collideCircle(x, y, r); } catch (e) { return false; } finally { selfIgnore = false; } }
  function shake(a, t) { if (ACH.fx && fn(ACH.fx, 'shake')) { try { ACH.fx.shake(a, t); } catch (e) { /* nada */ } } }

  /* ---------------- Congelar el mundo ---------------- */
  var frozenByMe = false;
  function freeze(on) {
    var G = ACH.G;
    if (fn(CV, 'freeze')) { try { CV.freeze(!!on); frozenByMe = !!on; return; } catch (e) { warnOnce(e); } }
    if (!G) return;
    if (on) {
      if (G.state === 'playing') { G.state = 'cine'; safe(function () { ACH.hud.setState('cine'); }); frozenByMe = true; }
    } else if (frozenByMe) {
      frozenByMe = false;
      if (G.state === 'cine') { G.state = 'playing'; safe(function () { ACH.hud.setState('playing'); }); }
      safe(function () { ACH.input.reset(); });
    }
  }
  function dlgActive() { try { return !!(ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active()); } catch (e) { return false; } }
  function playDlg(lines, cb) {
    var D = ACH.dialogo, done = false, once = function () { if (done) return; done = true; if (cb) cb(); };
    if (D && fn(D, 'play')) {
      try { var r = D.play(lines, { onDone: once }); if (r !== false) return; } catch (e) { warnOnce(e); }
    }
    for (var i = 0; i < lines.length; i++) toast(lines[i].texto || lines[i]);
    setTimeout(once, 50);
  }

  /* ---------------- Secuencias en tiempo real (mientras el mundo está congelado) ---------------- */
  var SQ = null, sqRaf = 0, sqLast = 0;
  function gamePaused() { var G = ACH.G; return !!(G && G.state === 'paused'); }
  /* v0.13 (F7): ESC / P pausan las secuencias (entrada del chef y salto al parapente). Con el mundo congelado ('cine') game.js no deja pausar,
     así que aquí: se frena el tiempo de la secuencia y sale un cartel de PAUSA. Los diálogos con retrato van a ritmo del jugador: ahí no se pausa.
     La caída libre y Chorrillos tienen su propia pausa (caida.js / chorrillos.js). */
  var PZ = { on: false, el: null, ls: false };
  function pzCard(on) {
    var st = document.getElementById('stage') || document.body;
    if (on) {
      if (!PZ.el) {
        var d = document.createElement('div'); d.className = 'chf-pausa'; d.setAttribute('data-ui', '');
        d.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;z-index:7;display:flex;align-items:center;justify-content:center;flex-direction:column;background:rgba(8,7,10,.62);pointer-events:none;--cu:' + ((st.clientHeight || 540) / 270) + 'px';
        d.innerHTML = '<b style="font-family:Bungee,\'Arial Black\',Impact,sans-serif;font-weight:400;font-size:calc(var(--cu)*26);line-height:1;color:#ffe500;text-shadow:calc(var(--cu)*2) calc(var(--cu)*2) 0 #ff2e88,calc(var(--cu)*4) calc(var(--cu)*4) 0 #131015;transform:rotate(-2deg)">PAUSA</b>' +
          '<i style="display:block;margin-top:calc(var(--cu)*8);font-family:Silkscreen,\'Courier New\',monospace;font-style:normal;font-size:calc(var(--cu)*6);color:#f2f2ee;background:#131015;padding:calc(var(--cu)*2) calc(var(--cu)*5);border:calc(var(--cu)*1) solid #1fe07a">ESC / P PARA SEGUIR</i>';
        st.appendChild(d); PZ.el = d;
      }
      PZ.el.style.display = 'flex';
    } else if (PZ.el) { PZ.el.style.display = 'none'; }
  }
  function pzSet(on) { if (!SQ && on) return; PZ.on = !!on; pzCard(PZ.on); try { var c = ACH.audio && ACH.audio.ctx; if (c) { if (on && c.suspend) c.suspend(); else if (!on && c.resume) c.resume(); } } catch (e) { /* nada */ } }
  function pzKey(e) {
    if (!SQ) return;
    var c = e.code || e.key, esc = c === 'Escape' || c === 'KeyP';
    if (!esc && !(PZ.on && (c === 'Enter' || c === 'NumpadEnter'))) return;
    if (dlgActive() || (CV.caida && fn(CV.caida, 'isOn') && CV.caida.isOn()) || (CV.chorrillos && fn(CV.chorrillos, 'isOn') && CV.chorrillos.isOn())) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (!e.repeat) pzSet(!PZ.on);
  }
  function pzVis() { if (SQ && document.hidden && !PZ.on && !dlgActive()) pzSet(true); }
  function pzListen(on) {
    if (on === PZ.ls) return; PZ.ls = on;
    var m = on ? 'addEventListener' : 'removeEventListener';
    window[m]('keydown', pzKey, true); document[m]('visibilitychange', pzVis);
    if (!on && PZ.on) { PZ.on = false; pzCard(false); try { var c = ACH.audio && ACH.audio.ctx; if (c && c.resume) c.resume(); } catch (e) { /* nada */ } }
  }
  function runSeq(steps, onEnd) {
    SQ = { steps: steps, i: -1, t: 0, onEnd: onEnd, waiting: false };
    pzListen(true);
    nextStep();
    if (SQ && !sqRaf) { sqLast = now(); sqRaf = requestAnimationFrame(sqLoop); }
  }
  function nextStep() {
    var my = SQ; if (!my) return;
    my.i++; my.t = 0; my.waiting = false;
    var s = my.steps[my.i];
    if (!s) { SQ = null; pzListen(false); if (my.onEnd) safe(my.onEnd); return; }
    if (s.enter) safe(s.enter);
    if (s.dlg) { my.waiting = true; playDlg(s.dlg, function () { if (SQ === my) nextStep(); }); }
  }
  function sqLoop() {
    sqRaf = 0; if (!SQ) return;
    var t = now(), dt = Math.min(0.05, t - sqLast); sqLast = t;
    if (!gamePaused() && !PZ.on) {
      tickVisual(dt);
      var s = SQ.steps[SQ.i];
      if (s && !SQ.waiting) { SQ.t += dt; if (s.tick) safe(function () { s.tick(dt, SQ.t); }); if (SQ && SQ.t >= (s.dur || 0)) nextStep(); }
    }
    if (SQ) sqRaf = requestAnimationFrame(sqLoop);
  }
  function stopSeq() { SQ = null; pzListen(false); if (sqRaf) { cancelAnimationFrame(sqRaf); sqRaf = 0; } }

  /* ---------------- Geometría de la arena ---------------- */
  function ptFrom(p, def) {
    var t = T(), W = ACH.world || {};
    if (p) {
      if (typeof p.c === 'number' && typeof p.r === 'number') return { x: (p.c + 0.5) * t, y: (p.r + 0.5) * t };
      if (typeof p.x === 'number' && typeof p.y === 'number') {
        if (W.COLS && p.x <= W.COLS && p.y <= (W.ROWS || 1e9) && (W.W || 0) > W.COLS * 2) return { x: p.x * t, y: p.y * t };   // vino en tiles
        return { x: p.x, y: p.y };
      }
    }
    return def ? { x: def.x, y: def.y } : null;
  }
  var GEO = null, testArena = null;
  function places() { return (ACH.world && ACH.world.places) || {}; }
  function gateProp() {
    var W = ACH.world, P = W && W.props; if (!P) return null;
    for (var i = 0; i < P.length; i++) if (P[i] && P[i].k === 'rejaChifa') return P[i];
    return null;
  }
  function geo() {
    if (GEO) return GEO;
    var W = ACH.world || {}, t = T(), L = places(), box = null, i;
    if (testArena) box = testArena;
    var tr = W.terr;
    if (!box && Array.isArray(tr) && tr.length) {
      var best = null;
      for (i = 0; i < tr.length; i++) { var q = tr[i]; if (!q) continue; if (/^(d|arena)$/i.test(String(q.id))) { best = q; break; } if (!best || q.r0 > best.r0) best = q; }
      if (best && typeof best.r0 === 'number') box = { x0: best.c0 * t, x1: (best.c1 + 1) * t, y0: best.r0 * t, y1: (best.r1 + 1) * t };
    }
    var ac = ptFrom(L.arena, null);
    if (!box) { var c = ac || { x: 285 * t, y: 74 * t }; box = { x0: c.x - 12 * t, x1: c.x + 12 * t, y0: c.y - 4.5 * t, y1: c.y + 4.5 * t }; }
    var cx = ac && ac.x > box.x0 && ac.x < box.x1 ? ac.x : (box.x0 + box.x1) / 2;
    // casa del chef: lo más al norte que esté libre (la fachada del chifa queda detrás)
    var hy = box.y0 + 26;
    for (var k = 0; k < 12 && collide(cx, hy, 12); k++) hy += 6;
    var home = { x: cx, y: Math.min(hy, (box.y0 + box.y1) / 2) };
    var gp = gateProp(), gate = gp ? { x: gp.x, y: gp.y, w: Math.max(24, gp.fw || 48), prop: gp } : null;
    var borde = ptFrom(L.borde, { x: box.x1 - 3 * t, y: box.y1 - 12 });
    var vap = { x: home.x - 46, y: home.y + 4 };
    if (collide(vap.x, vap.y, 6)) vap = { x: home.x + 46, y: home.y + 4 };
    GEO = { box: box, home: home, door: { x: home.x, y: home.y - 12 }, gate: gate, borde: borde, vap: vap };
    return GEO;
  }
  function inBox(x, y, pad) { var b = geo().box; pad = pad || 0; return x > b.x0 + pad && x < b.x1 - pad && y > b.y0 + pad && y < b.y1 - pad; }
  function clampBox(o, pad) { var b = geo().box; o.x = clamp(o.x, b.x0 + pad, b.x1 - pad); o.y = clamp(o.y, b.y0 + pad, b.y1 - pad); }

  /* ---------------- Estado ---------------- */
  var J = CV.chef = {
    state: 'cocina', dead: false, hp: K.hp, hpMax: K.hp, phase: 1, x: 0, y: 0, z: 0, edgeOpen: false, jumps: 0,
    t: 0, anim: 0, act: null, actT: 0, atkT: 0, summonT: 0, slowT: 0, slowCD: 0, hurtT: 0, pose: '', poseT: 0, flip: false,
    introSeen: false, firstHit: false, firstTired: false, ph2Yelled: false, ph3Yelled: false, fightT: 0, tries: 0, hits: 0,
    aim: null, slam: null, nextAct: 'fan', ph3Step: 0, deadT: 0, deadDlg: false,
    targets: targets, hitBy: hitBy, info: info, K: K
  };
  var DUMP = [];     // dumplings y baozis
  var STK = [];      // palitos (vuelo, lluvia, clavados)
  var parts = [], texts = [], waves = [];
  var wok = null;    // el wok que rueda al morir
  var jumpAnim = null;
  var selfIgnore = false, dumpId = 0, barHideAt = -1;

  function clearField() {
    DUMP.length = 0; STK.length = 0; parts.length = 0; texts.length = 0; waves.length = 0; bubble = null;
    J.act = null; J.aim = null; J.slam = null; J.z = 0;
  }
  function resetChef(full) {
    var g = geo();
    J.state = 'cocina'; J.dead = false; J.hp = J.hpMax = K.hp; J.phase = 1; J.t = 0; J.act = null; J.actT = 0; J.atkT = 0; J.summonT = 0;
    J.slowT = 0; J.slowCD = 0; J.hurtT = 0; J.pose = ''; J.poseT = 0; J.ph2Yelled = false; J.ph3Yelled = false; J.fightT = 0; J.nextAct = 'fan'; J.ph3Step = 0;
    J.deadT = 0; J.deadDlg = false; J.z = 0;
    if (full) { J.introSeen = false; J.firstHit = false; J.firstTired = false; J.edgeOpen = false; J.jumps = 0; J.tries = 0; J.hits = 0; wok = null; }
    J.x = g.door.x; J.y = g.door.y;
    syncSolids();
  }

  /* ---------------- Sólidos ---------------- */
  var RS = { id: 'chef.cuerpo', jefa: true, chef: true, off: true, x0: 0, y0: 0, x1: 0, y1: 0 };
  var RG = { id: 'chef.reja', jefa: true, chef: true, off: true, x0: 0, y0: 0, x1: 0, y1: 0 };
  // gateMode: 'idle' (la reja de C1a queda como C1a la tenga) · 'open' (Alexander llegó / el chef murió) · 'lock' (pelea)
  var foreignGate = null, gateLocked = false, gateMode = 'idle';
  function findForeignGate() {
    var W = ACH.world, L = W && W.dynSolids; if (!Array.isArray(L)) return null;
    for (var i = 0; i < L.length; i++) { var s = L[i]; if (s && s !== RG && s !== RS && (s.rejaChifa || /reja/i.test(String(s.id || '')))) return s; }
    return null;
  }
  function circleRect(x, y, r, x0, y0, x1, y1) { var cx = clamp(x, x0, x1), cy = clamp(y, y0, y1), dx = x - cx, dy = y - cy; return dx * dx + dy * dy < r * r; }
  function bodySolid() { return J.state === 'pelea' && !J.dead && J.z < 4; }
  function syncSolids() {
    var on = bodySolid() && !selfIgnore;
    RS.x0 = J.x - K.bodyW; RS.x1 = J.x + K.bodyW; RS.y0 = J.y - K.bodyUp; RS.y1 = J.y + K.bodyDn; RS.off = !on;
    var g = GEO, gt = g && g.gate;
    if (gt) { RG.x0 = gt.x - gt.w / 2; RG.x1 = gt.x + gt.w / 2; RG.y0 = gt.y - 8; RG.y1 = gt.y + 2; }
    else if (g) { var b = g.box; RG.x0 = b.x0; RG.x1 = b.x1; RG.y0 = b.y0 - 6; RG.y1 = b.y0; }   // sin reja: no hace nada (queda fuera)
    RG.off = !gateLocked || !!foreignGate || selfIgnore || !gt;
    if (foreignGate && gateMode !== 'idle') foreignGate.off = gateMode === 'open';
    CV.chefDead = !!J.dead;
    var W = ACH.world, L = W && W.dynSolids;
    if (Array.isArray(L)) { if (L.indexOf(RS) < 0) L.push(RS); if (L.indexOf(RG) < 0) L.push(RG); }
  }
  function setGate(mode) {   // 'idle' | 'open' | 'lock'
    if (mode === true) mode = 'lock'; else if (mode === false) mode = 'open';
    var prev = gateMode; gateMode = mode; gateLocked = mode === 'lock';
    if (!foreignGate) foreignGate = findForeignGate();
    var g = geo(); if (g.gate && g.gate.prop && mode !== 'idle') g.gate.prop.open = mode === 'open';
    var GA = CV.gate;   // mundo.js (C1a) puede traer su reja: open()/close()
    if (GA && mode !== 'idle') { try { if (mode === 'open' && fn(GA, 'open')) GA.open(); else if (mode === 'lock' && fn(GA, 'close')) GA.close(); } catch (e) { warnOnce(e); } }
    if (prev !== mode && mode !== 'idle' && prev !== 'idle') sfx(mode === 'lock' ? 'cv.reja.cierra' : 'cv.reja.abre', g.gate ? { x: g.gate.x, y: g.gate.y } : null);
    syncSolids();
  }
  function pushOut(G) {
    var p = G.player; if (!p || RS.off) return;
    var pr = CFGE().radius || 5;
    if (!circleRect(p.x, p.y, pr, RS.x0, RS.y0, RS.x1, RS.y1)) return;
    var cx = clamp(p.x, RS.x0, RS.x1), cy = clamp(p.y, RS.y0, RS.y1), dx = p.x - cx, dy = p.y - cy, d = Math.sqrt(dx * dx + dy * dy), tx = p.x, ty = p.y;
    if (d > 0.01) { tx = cx + dx / d * (pr + 0.3); ty = cy + dy / d * (pr + 0.3); }
    else { var l = p.x - RS.x0, rr = RS.x1 - p.x, u = p.y - RS.y0, dn = RS.y1 - p.y, m = Math.min(l, rr, u, dn);
      if (m === dn) ty = RS.y1 + pr + 0.3; else if (m === u) ty = RS.y0 - pr - 0.3; else if (m === l) tx = RS.x0 - pr - 0.3; else tx = RS.x1 + pr + 0.3; }
    RS.off = true; var free = !collide(tx, ty, pr); RS.off = false;
    if (free) { p.x = tx; p.y = ty; } else { p.y = RS.y1 + pr + 0.5; }
  }

  /* ---------------- Fases ---------------- */
  function phaseOf() { var r = J.hp / J.hpMax; return r < K.ph3 ? 3 : r < K.ph2 ? 2 : 1; }
  function liveDumps() { var n = 0; for (var i = 0; i < DUMP.length; i++) if (DUMP[i].state !== 'dead') n++; return n; }
  function slowK() { return J.slowT > 0 ? K.slowMul : 1; }

  /* ---------------- Entrada ---------------- */
  function startIntro(G) {
    J.tries++;
    setGate('lock');
    sfx('cv.gong', { x: J.x, y: J.y });
    var g = geo();
    J.x = g.door.x; J.y = g.door.y; J.state = 'entrada'; J.t = 0;
    if (J.introSeen) {   // reintento: sin retrato, solo el globo y a pelear
      J.x = g.home.x; J.y = g.home.y;
      voz(TXT.otraVez, { life: 1.6 }); J.pose = 'llama'; J.poseT = 0.8;
      startFight(G);
      return;
    }
    J.introSeen = true;
    freeze(true);
    runSeq([
      { dur: 0.9, tick: function (dt, t) { var k = Math.min(1, t / 0.9); J.x = g.door.x; J.y = g.door.y + (g.home.y - g.door.y) * k; J.pose = 'idle'; J.poseT = 0.1; } },
      { dur: 2.1, enter: function () { J.pose = 'llama'; J.poseT = 2.1; voz(TXT.mesa, { life: 2.1, bubble: true }); sfx('cv.chef.grito', { x: J.x, y: J.y }); } },
      { dlg: DLG_IN },
      { dur: 2.0, enter: function () { J.pose = 'alza'; J.poseT = 2.0; voz(TXT.guitarra, { life: 2.0, bubble: true }); sfx('cv.gong', { x: J.x, y: J.y }); } }
    ], function () { freeze(false); startFight(ACH.G); });
  }
  function startFight(G) {
    var g = geo();
    J.state = 'pelea'; J.t = 0; J.fightT = 0; J.x = g.home.x; J.y = g.home.y; J.z = 0;
    J.atkT = 1.4; J.summonT = 3.5; J.act = null; J.nextAct = 'fan'; J.ph3Step = 0;
    J.phase = phaseOf(); J.ph2Yelled = J.phase >= 2; J.ph3Yelled = J.phase >= 3;
    showBar(true); syncBar(true);
    stinger('boss.intro'); bossMusic(true);
    syncSolids(); if (G) pushOut(G);
  }

  /* ---------------- Ataques ---------------- */
  function handPt() { return { x: J.x + (J.flip ? -14 : 14), y: J.y - 4 }; }
  function beginFan(n) { J.act = 'fan'; J.actT = 0; J.fanN = n; J.aim = null; J.pose = 'alza'; J.poseT = K.fanTele; sfx('cv.chef.alza', { x: J.x, y: J.y }); }
  function releaseFan(G) {
    var h = handPt(), a0 = J.aim !== null ? J.aim : Math.atan2(G.player.y - h.y, G.player.x - h.x), n = J.fanN;
    for (var i = 0; i < n; i++) {
      var a = a0 + (n > 1 ? (i / (n - 1) - 0.5) * K.fanArc : 0);
      STK.push({ mode: 'fly', x: h.x, y: h.y, vx: Math.cos(a) * K.stickSpd, vy: Math.sin(a) * K.stickSpd, ang: a, d: 0, t: 0 });
    }
    J.pose = 'lanza'; J.poseT = 0.3;
    sfx('cv.palito', { x: h.x, y: h.y, n: n });
  }
  function beginRain(G) {
    J.act = 'rain'; J.actT = 0; J.pose = 'alza'; J.poseT = 0.4;
    var p = G.player, spots = [{ x: p.x, y: p.y }], tries = 0;
    while (spots.length < K.rainN && tries++ < 80) {
      var a = rand(0, 6.283), r = rand(20, K.rainSpread), s = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.7 };
      if (!inBox(s.x, s.y, 6)) continue;
      var ok = true; for (var k = 0; k < spots.length; k++) if (dist(s.x, s.y, spots[k].x, spots[k].y) < K.rainGap) { ok = false; break; }
      if (ok) spots.push(s);
    }
    for (var i = 0; i < spots.length; i++) STK.push({ mode: 'rain', x: spots[i].x, y: spots[i].y, t: -i * 0.06, ang: rand(1.3, 1.8) });
    voz(TXT.fase2, { life: 1.2 });
    sfx('cv.palito.lluvia', { x: p.x, y: p.y });
  }
  function beginSummon() { J.act = 'summon'; J.actT = 0; J.pose = 'llama'; J.poseT = K.summonTele; sfx('cv.vaporera', { x: geo().vap.x, y: geo().vap.y }); }
  function releaseSummon(G) {
    var ph = J.phase, n = Math.min(K.summonN[ph], K.dumpMax - liveDumps()), v = geo().vap;
    for (var i = 0; i < n; i++) {
      var big = ph === 2 && i === 0;
      var a = Math.atan2(G.player.y - v.y, G.player.x - v.x) + (i - (n - 1) / 2) * 0.6;
      DUMP.push({ id: ++dumpId, kind: 'dumpling', dead: false, r: big ? 8 : 6, big: big, x: v.x, y: v.y - 2, z: 10, hp: big ? K.bHp : K.dHp, hpMax: big ? K.bHp : K.dHp, state: 'out', t: -i * 0.12,
        sx: v.x, sy: v.y - 2, tx: v.x + Math.cos(a) * 26, ty: v.y + Math.abs(Math.sin(a)) * 16 + 8, hopCD: rand(0.2, 0.5), vx: 0, vy: 0, biteCD: 0.6, hurtT: 0, face: 1 });
    }
    for (var k = 0; k < 10; k++) parts.push({ x: v.x + rand(-8, 8), y: v.y, z: rand(10, 20), vx: rand(-12, 12), vy: rand(-4, 4), vz: rand(20, 40), t: 0, life: rand(0.6, 1.0), c: '#eef2f2', w: 2, h: 2, g: -10 });
    if (n > 0) { voz(TXT.llama[Math.floor(Math.random() * TXT.llama.length)], { life: 1.2 }); sfx('cv.dumpling.salen', { x: v.x, y: v.y, n: n }); }
  }
  function beginSlam(G) {
    var p = G.player, tx = p.x, ty = p.y, o = { x: tx, y: ty }; clampBox(o, 18);
    J.act = 'slam'; J.actT = 0; J.slam = { sx: J.x, sy: J.y, tx: o.x, ty: o.y, landed: false };
    J.pose = 'salta'; J.poseT = K.slamRise + K.slamAir;
    if (!J.ph3Yelled) { J.ph3Yelled = true; voz(TXT.fase3, { life: 1.4 }); }
    sfx('cv.chef.salta', { x: J.x, y: J.y });
  }
  function landSlam(G) {
    var s = J.slam, p = G.player; s.landed = true;
    J.x = s.tx; J.y = s.ty; J.z = 0;
    waves.push({ x: J.x, y: J.y, t: 0 });
    shake(4, 0.35); sfx('cv.wok', { x: J.x, y: J.y });
    for (var k = 0; k < 14; k++) { var a = k / 14 * 6.283; parts.push({ x: J.x + Math.cos(a) * 10, y: J.y + Math.sin(a) * 5, z: 1, vx: Math.cos(a) * 60, vy: Math.sin(a) * 30, vz: rand(10, 30), t: 0, life: rand(0.35, 0.55), c: '#c9bfa8', w: 2, h: 2, g: 120 }); }
    var d = dist(p.x, p.y, J.x, J.y);
    if (p.hp > 0 && d < K.slamR) {
      var ux = d > 0.5 ? (p.x - J.x) / d : 0, uy = d > 0.5 ? (p.y - J.y) / d : 1;
      hurtPlayer(G, K.slamDmg, { push: { x: ux, y: uy, f: K.slamPush }, src: 'chef.wok' });
      addText('¡PUM!', p.x, p.y - 26, '#ffe500');
    }
    syncSolids(); pushOut(G);
    // aplasta dumplings que estén debajo
    for (var i = 0; i < DUMP.length; i++) if (DUMP[i].state !== 'dead' && dist(DUMP[i].x, DUMP[i].y, J.x, J.y) < 18) killDump(DUMP[i]);
    // a sentarse cansado
    J.act = 'tired'; J.actT = 0; J.pose = 'sentado'; J.poseT = K.tiredT;
    voz(TXT.tecito, { life: 1.8 });
    if (!J.firstTired) { J.firstTired = true; toast(TXT.tired); }
  }

  function updateFight(G, dt) {
    var p = G.player, ph = phaseOf(), sk = slowK(), dts = dt * sk;
    J.fightT += dt;
    if (ph !== J.phase) {
      J.phase = ph; syncBar(true);
      if (ph >= 2 && !J.ph2Yelled) { J.ph2Yelled = true; J.atkT = Math.min(J.atkT, 1); }
      if (ph >= 3 && J.act !== 'slam' && J.act !== 'tired') { J.atkT = Math.min(J.atkT, 0.8); J.ph3Step = 0; }
    }
    if (J.slowT > 0) J.slowT -= dt;
    if (J.slowCD > 0) J.slowCD -= dt;
    if (p.hp > 0) J.flip = p.x < J.x;
    // acción en curso
    if (J.act) {
      J.actT += dts;
      switch (J.act) {
        case 'fan':
          if (J.aim === null && J.actT >= K.fanLock) { var h = handPt(); J.aim = Math.atan2(p.y - h.y, p.x - h.x); }
          if (J.actT >= K.fanTele) { releaseFan(G); J.act = 'post'; J.actT = 0; }
          break;
        case 'rain':
          if (J.actT >= 0.5) { J.act = 'post'; J.actT = 0; }
          break;
        case 'summon':
          if (J.actT >= K.summonTele) { releaseSummon(G); J.act = 'post'; J.actT = 0; }
          break;
        case 'slam': {
          var s = J.slam, tr = K.slamRise, ta = K.slamAir;
          if (J.actT < tr) J.z = 0;
          else if (J.actT < tr + ta) {
            var k = (J.actT - tr) / ta;
            J.z = k < 0.75 ? 220 * Math.min(1, k / 0.25) : 220 * (1 - (k - 0.75) / 0.25);
            J.x = s.sx + (s.tx - s.sx) * Math.min(1, k * 1.2); J.y = s.sy + (s.ty - s.sy) * Math.min(1, k * 1.2);
          } else if (!s.landed) landSlam(G);
          break;
        }
        case 'tired':
          if (J.actT >= K.tiredT) { J.act = 'post'; J.actT = 0; J.pose = 'idle'; J.poseT = 0; J.postLen = K.recoverT; }
          break;
        case 'post':
          if (J.actT >= (J.postLen || 0.35)) { J.act = null; J.postLen = 0; }
          break;
      }
    } else {
      // caminar hacia la x de Alexander, sin pegarse
      var g = geo(), tx = clamp(p.x, g.box.x0 + 24, g.box.x1 - 24), ty = J.phase >= 3 ? J.y : g.home.y;
      var dx = tx - J.x, dy = ty - J.y, dd = Math.sqrt(dx * dx + dy * dy), dp = dist(p.x, p.y, J.x, J.y);
      if (dd > 4 && dp > K.keepDist) {
        var st = Math.min(dd, K.walk * sk * dt), nx = J.x + dx / dd * st, ny = J.y + dy / dd * st;
        RS.off = true; var free = !collide(nx, ny, 10); RS.off = false;
        if (free) { J.x = nx; J.y = ny; J.walking = true; } else J.walking = false;
      } else J.walking = false;
      // próximo ataque
      J.atkT -= dts; J.summonT -= dts;
      if (p.hp > 0) {
        if (J.summonT <= 0 && (J.phase < 3 || J.ph3Step !== 0)) {
          if (liveDumps() < K.dumpMax) beginSummon();
          J.summonT = K.summonEvery[J.phase];
        } else if (J.atkT <= 0) {
          if (J.phase === 1) { beginFan(K.fanN1); J.atkT = K.atk1; }
          else if (J.phase === 2) {
            if (J.nextAct === 'rain') { beginRain(G); J.nextAct = 'fan'; } else { beginFan(K.fanN2); J.nextAct = 'rain'; }
            J.atkT = K.atk2;
          } else {   // fase 3: wok → cansado → abanico de 7 → wok…
            if (J.ph3Step === 0) { beginSlam(G); J.ph3Step = 1; J.atkT = 0.5; }
            else { beginFan(K.fanN2); J.ph3Step = 0; J.atkT = K.atk3 + 0.8; }
          }
        }
      }
    }
    if (J.act !== 'slam') J.z = 0;
    updateDumps(G, dt);
  }

  /* ---------------- Palitos ---------------- */
  function updateSticks(G, dt) {
    var p = G.player;
    for (var i = STK.length - 1; i >= 0; i--) {
      var s = STK[i]; s.t += dt;
      if (s.mode === 'fly') {
        var st = K.stickSpd * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.d += st;
        if (p.hp > 0 && dist(s.x, s.y, p.x, p.y) < K.stickR + 1) {
          if (hurtPlayer(G, K.stickDmg, { push: { x: s.vx, y: s.vy, f: 6 }, src: 'chef.palito' })) { addText('¡TOC!', p.x, p.y - 26, '#ffd36b'); STK.splice(i, 1); continue; }
        }
        if (s.d > K.stickRange || collide(s.x, s.y, 1.5) || !inBox(s.x, s.y, -40)) { s.mode = 'stuck'; s.t = 0; sfx('cv.palito.toc', { x: s.x, y: s.y }); }
      } else if (s.mode === 'rain') {
        if (s.t >= K.rainTele) {
          s.mode = 'stuck'; s.t = 0; sfx('cv.palito.toc', { x: s.x, y: s.y });
          parts.push({ x: s.x, y: s.y, z: 1, vx: rand(-20, 20), vy: rand(-8, 8), vz: 20, t: 0, life: 0.3, c: '#c9bfa8', w: 2, h: 1, g: 120 });
          if (p.hp > 0 && dist(s.x, s.y, p.x, p.y) < K.rainR) { hurtPlayer(G, K.rainDmg, { src: 'chef.lluvia', ignoreAir: true }); addText('¡TOC!', p.x, p.y - 26, '#ffd36b'); }
        }
      } else if (s.mode === 'stuck') {
        if (s.t >= K.stickStuck + 0.3) STK.splice(i, 1);
      }
    }
    if (STK.length > 80) STK.splice(0, STK.length - 80);
  }

  /* ---------------- Dumplings ---------------- */
  function killDump(d) {
    if (d.state === 'dead') return;
    d.state = 'dead'; d.dead = true; d.t = 0; d.hp = 0; d.z = 0;
    sfx('cv.dumpling.muere', { x: d.x, y: d.y, big: d.big });
    for (var k = 0; k < 6; k++) parts.push({ x: d.x + rand(-4, 4), y: d.y, z: rand(2, 8), vx: rand(-30, 30), vy: rand(-12, 12), vz: rand(10, 30), t: 0, life: rand(0.4, 0.6), c: k % 2 ? '#f2e6c4' : '#eef2f2', w: 2, h: 2, g: 100 });
    addText(d.big ? '¡PLAF!' : '¡PLOP!', d.x, d.y - 16, '#f2e6c4');
  }
  function hitDump(d, dmg, fx, fy, instakill) {
    if (d.state === 'dead' || !(dmg > 0)) return 0;
    if (instakill && !d.big) dmg = d.hp;
    else if (!d.big && dmg >= 1) dmg = Math.max(dmg, d.hp);   // golpe fuerte: el chiquito revienta
    d.hp -= dmg; d.hurtT = 0.15;
    var dd = dist(fx, fy, d.x, d.y) || 1; d.vx = (d.x - fx) / dd * 80; d.vy = (d.y - fy) / dd * 80; d.state = d.state === 'out' ? 'out' : 'knock'; d.t = 0;
    if (d.hp <= 0.001) killDump(d); else sfx('cv.dumpling.golpe', { x: d.x, y: d.y });
    return dmg;
  }
  function moveDump(d, vx, vy, dt) {
    var nx = d.x + vx * dt, ny = d.y + vy * dt;
    if (!collide(nx, ny, d.big ? 6 : 4) && inBox(nx, ny, 4)) { d.x = nx; d.y = ny; return true; }
    if (!collide(nx, d.y, d.big ? 6 : 4) && inBox(nx, d.y, 4)) { d.x = nx; return true; }
    if (!collide(d.x, ny, d.big ? 6 : 4) && inBox(d.x, ny, 4)) { d.y = ny; return true; }
    return false;
  }
  function updateDumps(G, dt) {
    var p = G.player, i, j;
    for (i = DUMP.length - 1; i >= 0; i--) {
      var d = DUMP[i]; d.t += dt; if (d.hurtT > 0) d.hurtT -= dt; if (d.biteCD > 0) d.biteCD -= dt;
      if (d.state === 'dead') { if (d.t > 0.45) DUMP.splice(i, 1); continue; }
      if (d.state === 'out') {   // sale saltando de la vaporera
        if (d.t < 0) continue;
        var k = Math.min(1, d.t / 0.5);
        d.x = d.sx + (d.tx - d.sx) * k; d.y = d.sy + (d.ty - d.sy) * k; d.z = 18 * 4 * k * (1 - k) + 10 * (1 - k);
        if (k >= 1) { d.state = 'idle'; d.t = 0; d.z = 0; sfx('cv.dumpling.salto', { x: d.x, y: d.y }); }
        continue;
      }
      if (d.state === 'knock' || d.state === 'bounce') {
        moveDump(d, d.vx, d.vy, dt); d.vx *= Math.pow(0.02, dt); d.vy *= Math.pow(0.02, dt);
        d.z = d.state === 'bounce' ? 8 * Math.sin(Math.min(1, d.t / 0.28) * Math.PI) : 0;
        if (d.t >= 0.28) { d.state = 'idle'; d.t = 0; d.z = 0; d.hopCD = K.hopEvery * 0.8; }
        continue;
      }
      if (d.state === 'bite') { if (d.t >= 0.22) { d.state = 'bounce'; d.t = 0; } continue; }
      if (d.state === 'hop') {
        var kk = Math.min(1, d.t / K.hopT);
        moveDump(d, d.vx, d.vy, dt);
        d.z = (d.big ? 6 : 8) * Math.sin(kk * Math.PI);
        if (kk >= 1) { d.state = 'idle'; d.t = 0; d.z = 0; d.hopCD = K.hopEvery; sfx('cv.dumpling.salto', { x: d.x, y: d.y, big: d.big }); }
      } else {   // idle: espera y salta hacia Alexander
        d.hopCD -= dt;
        if (d.hopCD <= 0 && p.hp > 0) {
          var dx = p.x - d.x, dy = p.y - d.y, dd = Math.sqrt(dx * dx + dy * dy) || 1, sp = K.hopSpd * (d.big ? 0.8 : 1);
          d.vx = dx / dd * sp; d.vy = dy / dd * sp; d.face = dx < 0 ? -1 : 1; d.state = 'hop'; d.t = 0;
        }
      }
      // mordida (en el suelo o aterrizando)
      if (p.hp > 0 && d.z < 4 && d.biteCD <= 0 && dist(d.x, d.y, p.x, p.y) < K.biteR + (d.big ? 4 : 0)) {
        d.biteCD = K.biteCD;
        var bx = d.x - p.x, by = d.y - p.y, bl = Math.sqrt(bx * bx + by * by) || 1;
        if (hurtPlayer(G, K.biteDmg, { push: { x: -bx, y: -by, f: 5 }, src: 'chef.dumpling' })) { addText('¡ÑAM!', p.x, p.y - 26, '#ff8aa8'); sfx('cv.dumpling.muerde', { x: d.x, y: d.y }); }
        d.state = 'bite'; d.t = 0; d.vx = bx / bl * K.bounceSpd; d.vy = by / bl * K.bounceSpd;
      }
    }
    // separación entre ellos
    for (i = 0; i < DUMP.length; i++) for (j = i + 1; j < DUMP.length; j++) {
      var a = DUMP[i], b = DUMP[j]; if (a.state === 'dead' || b.state === 'dead' || a.state === 'out' || b.state === 'out') continue;
      var ex = b.x - a.x, ey = b.y - a.y, ed = Math.sqrt(ex * ex + ey * ey), md = (a.big ? 8 : 6) + (b.big ? 8 : 6);
      if (ed > 0.01 && ed < md) { var push = (md - ed) / 2; moveDump(a, -ex / ed * push * 30, -ey / ed * push * 30, 1 / 30); moveDump(b, ex / ed * push * 30, ey / ed * push * 30, 1 / 30); }
    }
  }

  /* ---------------- Daño al chef ---------------- */
  function hittable() { return J.state === 'pelea' && !J.dead && J.z < 30; }
  function hitChef(G, dmg, fx, fy, tag) {
    if (!hittable() || !(dmg > 0)) return 0;
    if (J.act === 'tired') dmg *= K.tiredMul;
    J.hp = Math.max(0, J.hp - dmg); J.hurtT = 0.18; J.hits++;
    if (!J.firstHit) { J.firstHit = true; toast(TXT.firstHit); }
    sfx('cv.chef.duele', { x: J.x, y: J.y, hp: J.hp, src: tag });
    var d = dist(fx, fy, J.x, J.y) || 1;
    if (ACH.fx && fn(ACH.fx, 'hit')) { try { ACH.fx.hit(G, { x: J.x, y: J.y - 10 }, (J.x - fx) / d, (J.y - fy) / d, J.hp <= 0, true); } catch (e) { /* nada */ } }
    if (J.act === 'tired') addText('×2', J.x + rand(-8, 8), J.y - 70, '#ff2e88');
    syncBar(true); flashBar();
    if (J.hp <= 0) die(G);
    return dmg;
  }
  function onChef(x, y, r) { var dx = (x - J.x) / (K.hitRx + r), dy = (y - (J.y - 4)) / (K.hitRy + r); return dx * dx + dy * dy < 1; }

  /* ---------------- Muerte y botín ---------------- */
  function die(G, quick) {
    if (J.dead) return;
    J.hp = 0; J.dead = true; J.state = 'muriendo'; J.t = 0; J.deadT = 0; J.act = null; J.slam = null; J.z = 0; J.pose = 'cae'; J.poseT = 0.6;
    for (var i = 0; i < DUMP.length; i++) killDump(DUMP[i]);
    STK.length = 0;
    voz(TXT.muere, { life: 1.4 });
    stinger('boss.down'); sfx('cv.chef.muere', { x: J.x, y: J.y }); bossMusic(false);
    shake(5, 0.5);
    if (G && ACH.fx && fn(ACH.fx, 'hitstop')) ACH.fx.hitstop(G, 0.15);
    syncBar(true); barHideAt = 1.8;
    setGate('open');
    syncSolids();
    var g = geo();
    wok = { x: J.x + 10, y: J.y + 2, vx: (J.x < (g.box.x0 + g.box.x1) / 2 ? 1 : -1) * 90, t: 0, rot: 0, done: false };
    if (quick) { dropLoot(J.x, J.y + 10); wok.done = true; wok.vx = 0; J.state = 'muerto'; J.deadDlg = true; barHideAt = -1; showBar(false); openEdge(); }
    // v0.13 T2: +150 XP (una vez por pelea) y bandera de partida para CONTINUAR en el borde
    if (!J.xpGiven) { J.xpGiven = true; try { if (ACH.hab && fn(ACH.hab, 'addXP')) ACH.hab.addXP(150, false); } catch (e) { warnOnce(e); } toast('+150 XP · ¡El Maestro Wantán cayó!'); }
    try { if (ACH.partida && fn(ACH.partida, 'flag')) ACH.partida.flag('costaverde.chef', true); } catch (e2) { /* nada */ }
    try { if (ACH.objetivo && fn(ACH.objetivo, 'set')) ACH.objetivo.set('Ve al borde de la arena y tírate en parapente (E)'); } catch (e3) { /* nada */ }
  }
  // v0.13 T2: CONTINUAR con el chef ya vencido (bandera costaverde.chef): queda muerto, la reja abierta y el borde listo, sin pelea.
  function deadFromSave() {
    J.dead = true; J.hp = 0; J.state = 'muerto'; J.deadT = 99; J.deadDlg = true; J.introSeen = true; J.edgeOpen = true; J.xpGiven = true; wok = null;
    setGate('open'); syncSolids();
    try { if (CV.gate && fn(CV.gate, 'open')) CV.gate.open(true); } catch (e) { /* nada */ }
  }
  function dropLoot(x, y) {
    var iv = ACH.inv; if (!iv || !fn(iv, 'drop')) return;
    var defs = iv.defs || null, items = [{ id: 'sencillo', n: K.fallLoot }];
    if (!defs || defs.chaufa) items.push({ id: 'chaufa', n: 1 }, { id: 'chaufa', n: 1 });
    try { iv.drop(x, y, items, false); } catch (e) { try { iv.drop(x, y, [{ id: 'sencillo', n: K.fallLoot }], false); } catch (e2) { /* nada */ } }
  }
  function openEdge() {
    if (J.edgeOpen) return;
    J.edgeOpen = true; toast(TXT.edge); sfx('cv.baranda', { x: geo().borde.x, y: geo().borde.y });
  }
  function updateDeath(G, dt) {
    J.deadT += dt;
    if (wok && !wok.done) {
      wok.t += dt; wok.x += wok.vx * dt; wok.rot += wok.vx * dt / 8; wok.vx *= Math.pow(0.35, dt);
      if (collide(wok.x + (wok.vx > 0 ? 10 : -10), wok.y, 4) || !inBox(wok.x, wok.y, 14)) wok.vx = -wok.vx * 0.4;
      if (wok.t > 0.3 && Math.floor(wok.t * 6) !== Math.floor((wok.t - dt) * 6)) sfx('cv.wok.rueda', { x: wok.x, y: wok.y });
      if (wok.t >= 1.5) { wok.done = true; dropLoot(wok.x, wok.y); addText('¡CLANG!', wok.x, wok.y - 14, '#ffe500'); sfx('cv.wok', { x: wok.x, y: wok.y }); }
    }
    if (J.state === 'muriendo' && J.deadT >= 1.0) J.state = 'muerto';
    if (!J.deadDlg && J.deadT >= 2.2 && wok && wok.done) {
      J.deadDlg = true;
      freeze(true);
      playDlg(DLG_DEAD, function () { freeze(false); openEdge(); });
    }
  }

  /* ---------------- El borde y el parapente ---------------- */
  function nearEdge(p) { var b = geo().borde; return dist(p.x, p.y, b.x, b.y) < K.edgeR; }
  function startJump(G) {
    var p = G.player, b = geo().borde, first = J.jumps === 0;
    J.jumps++;
    barHideAt = -1; showBar(false);
    freeze(true);
    var steps = [];
    if (first) steps.push({ dlg: DLG_EDGE });
    var x0, y0;
    steps.push({ dur: K.runT, enter: function () { x0 = p.x; y0 = p.y; p.dir = 'down'; p.moving = true; jumpAnim = { k: 0, canopy: 0 }; sfx('cv.parapente.corre', { x: p.x, y: p.y }); },
      tick: function (dt, t) { var k = t / K.runT; p.x = x0 + (b.x - x0) * k; p.y = y0 + (b.y + 6 - y0) * k; p.animT = (p.animT || 0) + dt * 12; p.moving = true; } });
    steps.push({ dur: K.jumpT, enter: function () { p.moving = false; p.jumpT = 0; sfx('cv.parapente', { x: p.x, y: p.y }); },
      tick: function (dt, t) { var k = t / K.jumpT; p.z = 22 * Math.sin(k * Math.PI * 0.8); p.y += 60 * dt; p.jumpT = Math.min(0.5, k * 0.55); jumpAnim.canopy = k; } });
    steps.push({ dur: 0.35, tick: function (dt, t) { p.y += 50 * dt; p.z = Math.max(0, p.z - 30 * dt); jumpAnim.canopy = 1; jumpAnim.fade = t / 0.35; } });
    runSeq(steps, function () { startCaida(); });
  }
  function caidaOn() { return CV.caida && fn(CV.caida, 'start'); }
  function startCaida() {
    if (!caidaOn()) { caidaWin(); return; }
    try { CV.caida.start({ onWin: caidaWin, onLose: caidaLose }); }
    catch (e) { warnOnce(e); caidaWin(); }
  }
  function backToEdge() {
    var G = ACH.G, p = G && G.player; if (!p) return;
    var b = geo().borde;
    p.x = b.x; p.y = b.y - 16; p.z = 0; p.jumpT = -1; p.moving = false; p.dir = 'down';
    p.hp = CFGE().hpMax || 100; p.stamina = CFGE().staminaMax || p.stamina; p.kbx = 0; p.kby = 0;
    jumpAnim = null;
  }
  function caidaLose() {
    if (fn(CV, 'setCheckpoint')) safe(function () { CV.setCheckpoint('borde'); });
    backToEdge();
    freeze(false);
    toast(TXT.lose);
  }
  function caidaWin() {
    var C5 = CV.chorrillos;
    if (C5 && fn(C5, 'play')) { try { C5.play({ onEnd: finish }); return; } catch (e) { warnOnce(e); } }
    finish();
  }
  var finished = false;
  function finish() {
    if (finished) return; finished = true;
    backToEdge();
    freeze(false);
    var stats = { chef: { fightT: Math.round(J.fightT), tries: J.tries, jumps: J.jumps } };
    if (fn(CV, 'finish')) { try { CV.finish(stats); return; } catch (e) { warnOnce(e); } }
    if (ACH.debug && fn(ACH.debug, 'win')) { try { ACH.debug.win(); } catch (e) { warnOnce(e); } }
  }

  /* ---------------- Partículas y textos ---------------- */
  function addText(s, x, y, col) { texts.push({ s: s, x: x, y: y, t: 0, c: col }); if (texts.length > 6) texts.shift(); }
  function tickVisual(dt) {
    J.anim += dt;
    if (J.poseT > 0) J.poseT -= dt;
    for (var i = parts.length - 1; i >= 0; i--) {
      var q = parts[i]; q.t += dt;
      if (q.t >= q.life) { parts.splice(i, 1); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.vz -= (q.g || 0) * dt; q.z = Math.max(0, q.z + q.vz * dt);
    }
    if (parts.length > 100) parts.splice(0, parts.length - 100);
    for (var j = texts.length - 1; j >= 0; j--) { texts[j].t += dt; if (texts[j].t > 0.6) texts.splice(j, 1); }
    for (var w = waves.length - 1; w >= 0; w--) { waves[w].t += dt; if (waves[w].t > 0.35) waves.splice(w, 1); }
    if (bubble) { bubble.t += dt; if (bubble.t > bubble.life) bubble = null; }
  }

  /* ---------------- Ganchos ---------------- */
  function update(G, dt) {
    if (!G || !G.player) return;
    var p = G.player;
    if (!foreignGate) foreignGate = findForeignGate();
    tickVisual(dt);
    if (J.hurtT > 0) J.hurtT -= dt;
    if (barHideAt > 0) { barHideAt -= dt; if (barHideAt <= 0) { barHideAt = -1; showBar(false); } }
    J.t += dt;
    // la reja se abre al acercarse (si la puso C1a) y la pelea empieza al pasar
    var g = geo();
    if (J.state === 'cocina' && !J.dead) {
      if (g.gate && gateMode === 'idle' && dist(p.x, p.y, g.gate.x, g.gate.y) < 56) setGate('open');   // se abre al llegar a ella
      if (p.hp > 0 && inBox(p.x, p.y, 6) && (!g.gate || dist(p.x, p.y, g.gate.x, g.gate.y) > 22)) startIntro(G);
    } else if (J.state === 'pelea') updateFight(G, dt);
    else if (J.dead) updateDeath(G, dt);
    updateSticks(G, dt);
    if (J.state !== 'pelea') updateDumps(G, dt);
    // el borde: E para tirarse
    if (J.edgeOpen && G.state === 'playing' && !SQ && !dlgActive() && p.hp > 0 && nearEdge(p) && ACH.input && fn(ACH.input, 'pressed') && ACH.input.pressed('KeyE')) startJump(G);
    syncSolids(); pushOut(G);
  }
  function reset(G) {
    stopSeq(); if (frozenByMe) freeze(false);
    GEO = null; foreignGate = null; gateLocked = false; finished = false; jumpAnim = null;
    clearField(); resetChef(true); setGate('idle'); J.xpGiven = false;
    bossMusic(false); showBar(false); barHideAt = -1;
    var P = ACH.partida, cont = false;
    try { cont = !!(P && fn(P, 'continuando') && P.continuando()); } catch (e) { cont = false; }
    if (cont && fn(P, 'flag') && P.flag('costaverde.chef')) deadFromSave();
    installDebug();
  }
  function onRespawn(G) {
    stopSeq(); jumpAnim = null;
    if (J.dead) { syncSolids(); return; }   // el chef sigue muerto: nada cambia
    clearField(); resetChef(false); setGate('open');
    bossMusic(false); showBar(false); barHideAt = -1;
  }
  function mood(G) {
    if (J.state === 'pelea' || J.state === 'entrada') return { m: 'horde', i: 1 };
    return null;
  }
  function inArc(x, y, sw, pad) {
    var dx = x - sw.x, dy = y - sw.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > (sw.range || 24) + pad) return false;
    if (d < 5) return true;
    return Math.abs(wrap(Math.atan2(dy, dx) - (sw.ang || 0))) <= (sw.arc || Math.PI / 2) / 2;
  }
  // guitarrazo 1, puñete 0,5, lo demás su dmg (barra fosforescente 0,8, skate, escoba, inflables)
  function swingDmg(sw) {
    var d = typeof sw.dmg === 'number' ? sw.dmg : 1;
    if (sw.kind === 'guitar') return Math.max(1, d);
    if (sw.kind === 'punch') return Math.max(0.5, d);
    return d;
  }
  function onSwing(G, sw) {
    if (!sw) return 0;
    var n = 0, dm = swingDmg(sw);
    for (var i = 0; i < DUMP.length; i++) {
      var d = DUMP[i]; if (d.state === 'dead' || d.z > 10) continue;
      if (inArc(d.x, d.y, sw, d.big ? 8 : 6) && hitDump(d, dm, sw.x, sw.y, false) > 0) n++;
    }
    // golpe de cercanía (V011 §2.3): a ≤ 38 px de los pies le entra, mire a donde mire
    if (hittable() && dm > 0 && (dist(sw.x, sw.y, J.x, J.y) <= K.nearBody || dist(sw.x, sw.y, J.x, J.y - 20) <= K.nearBody - 8 || inArc(J.x, J.y, sw, K.bodyW + 2))) {
      if (hitChef(G, dm, sw.x, sw.y, sw.kind) > 0) n++;
    }
    return n;   // nunca −1: no hay «¡CLANC!»
  }
  function projDmg(pr, onChefHit) {
    var kind = pr.kind || 'stone', pd = typeof pr.dmg === 'number' ? pr.dmg : 1;
    if (kind === 'ball') return onChefHit ? pd * 1.5 : pd;
    if (/^throw:helado/.test(kind)) return 0.5;
    if (/^throw:barraFosfo/.test(kind) || /^throw:fosfo/.test(kind)) return 0.5;
    if (/^heavy:/.test(kind)) return pd;
    if (kind === 'bubble') return 0;
    if (kind === 'stone') return Math.min(1, pd);
    return pd;
  }
  function projectileCounts(kind) { return !/^throw:/.test(kind) || /^throw:(helado|barraFosfo|fosfo)/.test(kind); }
  // perro sin hitBy (respaldo de juguetes.js): kind 'dog'
  function onProjectile(G, pr) {
    if (!pr) return false;
    var kind = pr.kind || 'stone', r = pr.r || 2, t = G ? G.time || 0 : 0;
    if (!projectileCounts(kind)) return false;   // inflables lanzados: rebotan sin daño
    if (pr._cvHitAt !== undefined && t - pr._cvHitAt < 0.35) return false;
    if (kind === 'dog') return hitBy('dog', pr.dmg, pr.x, pr.y) > 0;
    var instakill = kind === 'ball' || /^throw:helado/.test(kind) || /^heavy:/.test(kind);
    for (var i = 0; i < DUMP.length; i++) {
      var d = DUMP[i]; if (d.state === 'dead' || d.z > 12) continue;
      if (dist(pr.x, pr.y, d.x, d.y) < r + (d.big ? 8 : 6)) {
        var dd = projDmg(pr, false); if (kind === 'bubble') dd = 0;
        if (dd > 0) hitDump(d, dd, pr.x - (pr.vx || 0) * 0.05, pr.y - (pr.vy || 0) * 0.05, instakill);
        mark(pr, t, 'dumpling', d.x, d.y);
        return true;
      }
    }
    if (!hittable() || !onChef(pr.x, pr.y, r)) return false;
    mark(pr, t, 'chef', J.x, J.y - 4);
    if (kind === 'bubble') { parts.push({ x: pr.x, y: pr.y, z: 10, vx: 0, vy: 0, vz: 0, t: 0, life: 0.2, c: '#dff6ff', w: 2, h: 2, g: 0 }); return true; }
    hitChef(G, projDmg(pr, true), pr.x, pr.y, kind);
    if (/^throw:helado/.test(kind)) slowChef();
    if (kind === 'ball') addText('¡GOL!', J.x, J.y - 74, '#1fe07a');
    if (/^heavy:/.test(kind)) addText('¡PUM!', J.x, J.y - 74, '#ffe500');
    return true;
  }
  function mark(pr, t, what, cx, cy) {
    pr._cvHitAt = t; pr.cvHit = what;
    var dx = pr.x - cx, dy = pr.y - cy, d = Math.sqrt(dx * dx + dy * dy) || 1; pr.cvNx = dx / d; pr.cvNy = dy / d;
  }
  function slowChef() {
    if (J.slowCD > 0) return false;
    J.slowT = K.slowT; J.slowCD = K.slowCD; toast(TXT.helado); addText('¡BRRR!', J.x, J.y - 80, '#9fe8ff');
    return true;
  }

  /* ---------------- API para los perros y otros (juguetes.js) ---------------- */
  // Devuelve los objetos VIVOS (el mismo objeto se mueve y pasa a dead = true): el chef es ACH.cv.chef (boss: true).
  function targets() {
    var out = [];
    J.r = K.bodyW; J.kind = 'chef'; J.id = 'chef'; J.boss = true; J.chef = true; J.big = true;
    if (hittable()) out.push(J);
    for (var i = 0; i < DUMP.length; i++) { var d = DUMP[i]; if (d.state !== 'dead' && d.state !== 'out') out.push(d); }
    return out;
  }
  // hitBy(src, dmg, x, y, id)  o  hitBy(blanco, {dmg, kind, x, y})  (blanco = un objeto de targets(); así lo llama juguetes.js)
  function hitBy(src, dmg, x, y, id) {
    var G = ACH.G; if (!G) return 0;
    if (src && typeof src === 'object') {
      var tg = src, o = (dmg && typeof dmg === 'object') ? dmg : { dmg: dmg };
      src = o.kind || o.src || 'dog'; dmg = o.dmg; x = o.x; y = o.y;
      if (tg === J || tg.kind === 'chef') id = 'chef'; else if (tg.id !== undefined) id = tg.id; else return 0;
      if (id !== 'chef' && (dmg === undefined || /dog|perro/.test(src))) dmg = 0;   // perro: el dumpling revienta
    }
    src = src || 'dog';
    var isDog = /dog|perro/.test(src), insta = isDog || src === 'ball' || src === 'helado';
    var i, d, best = null, bd = 1e9;
    if (id !== undefined && id !== null && id !== 'chef') {
      for (i = 0; i < DUMP.length; i++) if (DUMP[i].id === id) best = DUMP[i];
      if (!best || best.state === 'dead') return 0;
      return hitDump(best, dmg > 0 ? dmg : (isDog ? best.hp : 1), x === undefined ? best.x - 1 : x, y === undefined ? best.y : y, insta);
    }
    if (id !== 'chef' && typeof x === 'number' && typeof y === 'number') {
      for (i = 0; i < DUMP.length; i++) { d = DUMP[i]; if (d.state === 'dead' || d.state === 'out') continue; var q = dist(x, y, d.x, d.y); if (q < (d.big ? 8 : 6) + 6 && q < bd) { bd = q; best = d; } }
      if (best) return hitDump(best, dmg > 0 ? dmg : (isDog ? best.hp : 1), x, y, insta);
      if (!onChef(x, y, 8)) return 0;
    }
    if (!hittable()) return 0;
    var cd = isDog ? (dmg > 0 ? dmg : K.dogDmg) : src === 'ball' ? (dmg > 0 ? dmg : 1) * 1.5 : src === 'helado' ? 0.5 : (dmg > 0 ? dmg : 1);
    var got = hitChef(G, cd, typeof x === 'number' ? x : J.x - 10, typeof y === 'number' ? y : J.y, src);
    if (src === 'helado') slowChef();
    if (isDog && got > 0) addText('¡GRR!', J.x + rand(-10, 10), J.y - 60, '#ffd36b');
    return got;
  }

  /* ---------------- Sprites: los de C2c o reemplazos provisorios ---------------- */
  function mk(w, h) {
    if (ACH.px && fn(ACH.px, 'canvas')) { try { var c0 = ACH.px.canvas(w, h); if (c0 && c0.getContext) return c0; } catch (e) { /* sigue */ } }
    if (ACH.lienzo && fn(ACH.lienzo, 'canvas')) { try { var c1 = ACH.lienzo.canvas(w, h); if (c1 && c1.getContext) return c1; } catch (e) { /* sigue */ } }
    var c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  }
  function outlined(src, ax, ay, ink) {
    var c = mk(src.width + 2, src.height + 2), g = c.getContext('2d'), m = mk(src.width, src.height), mg = m.getContext('2d');
    mg.drawImage(src, 0, 0); mg.globalCompositeOperation = 'source-in'; mg.fillStyle = ink || '#1a1216'; mg.fillRect(0, 0, m.width, m.height);
    g.drawImage(m, 0, 1); g.drawImage(m, 2, 1); g.drawImage(m, 1, 0); g.drawImage(m, 1, 2); g.drawImage(src, 1, 1);
    c.ax = ax + 1; c.ay = ay + 1; return c;
  }
  function tint(src, col) {
    var c = mk(src.width, src.height), g = c.getContext('2d');
    g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.75; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
    c.ax = src.ax; c.ay = src.ay; return c;
  }
  function rotated(src, ang) {
    var s = Math.ceil(Math.sqrt(src.width * src.width + src.height * src.height)), c = mk(s, s), g = c.getContext('2d');
    g.imageSmoothingEnabled = false; g.translate(s / 2, s / 2); g.rotate(ang); g.drawImage(src, -src.width / 2, -src.height / 2);
    c.ax = Math.round(s / 2); c.ay = Math.round(s / 2 + Math.min(src.width, src.height) / 2); return c;
  }
  function line(g, x0, y0, x1, y1, col) {
    var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; g.fillStyle = col;
    for (var k = 0; k <= n; k++) g.fillRect(Math.round(x0 + (x1 - x0) * k / (n || 1)), Math.round(y0 + (y1 - y0) * k / (n || 1)), 1, 1);
  }
  // Chef provisorio: 60×92, pies en (30, 90). Gorro alto, chaquetilla blanca con ribete rojo, mandil, bigote, cucharón, wok a la espalda.
  function bakeChef(pose, f) {
    var Wd = 60, Hd = 92, c = mk(Wd, Hd), g = c.getContext('2d'), ox = 2, oy = 10;
    var dy = 0, legs = 'stand', arms = 'down', mouth = 'shut';
    if (pose === 'idle') dy = f === 1 ? 1 : 0;
    else if (pose === 'alza') { arms = 'up'; mouth = 'open'; dy = f; }
    else if (pose === 'lanza') { arms = f === 0 ? 'up' : f === 1 ? 'fwd' : 'low'; mouth = 'open'; }
    else if (pose === 'llama') { arms = 'ladle' + f; mouth = 'open'; }
    else if (pose === 'salta') { if (f === 0) { dy = 6; arms = 'low'; } else if (f === 1) { arms = 'up'; dy = -2; } else { arms = 'wide'; legs = 'tuck'; } mouth = 'open'; }
    else if (pose === 'sentado') { dy = 16; legs = 'sit'; arms = 'tea'; mouth = f ? 'shut' : 'open'; }
    function R(col, x, y, w, h) { g.fillStyle = col; g.fillRect(ox + x, oy + y + dy, w, h); }
    function Rf(col, x, y, w, h) { g.fillStyle = col; g.fillRect(ox + x, oy + y, w, h); }   // sin dy (piernas)
    var WH = '#f4f2ea', SH = '#cfcabc', RED = '#c8202a', SKIN = '#a9b892', SK2 = '#8d9c78', PANT = '#3a3a44', INK = '#2a1d16', STICK = '#d9b26a';
    // wok a la espalda
    R('#2c2c30', 0, 30, 6, 20); R('#4a4a50', 1, 32, 2, 14);
    // piernas
    if (legs === 'stand') { Rf(PANT, 15, 62 + Math.max(0, dy), 9, 14 - Math.max(0, dy)); Rf(PANT, 32, 62 + Math.max(0, dy), 9, 14 - Math.max(0, dy)); Rf('#111', 13, 76, 11, 3); Rf('#111', 32, 76, 11, 3); }
    else if (legs === 'tuck') { R(PANT, 14, 60, 10, 8); R(PANT, 32, 60, 10, 8); R('#111', 12, 66, 11, 3); R('#111', 33, 66, 11, 3); }
    else { Rf(PANT, 8, 72, 40, 6); Rf('#111', 4, 72, 5, 6); Rf('#111', 47, 72, 5, 6); }
    // barriga y chaquetilla
    R(WH, 8, 30, 40, 34); R(WH, 5, 36, 46, 22); R(WH, 11, 28, 34, 2);
    R(SH, 5, 54, 46, 4); R(SH, 8, 60, 40, 4);
    R(RED, 18, 27, 20, 3);                                    // cuello rojo
    for (var b = 0; b < 3; b++) { R(RED, 23, 34 + b * 5, 2, 2); R(RED, 31, 34 + b * 5, 2, 2); }
    R('#ece6d6', 13, 46, 30, 20); R('#d8d0bc', 13, 64, 30, 2); R('#b9a88a', 30, 52, 4, 3);   // mandil con manchita
    R('#9aa0a6', 46, 44, 2, 14); R('#c3c8cc', 44, 57, 6, 3);   // cucharón al cinto
    // cabeza
    R(SKIN, 18, 13, 20, 16); R(SK2, 18, 26, 20, 3);
    R(INK, 22, 16, 5, 1); R(INK, 30, 16, 5, 1);                // cejas bravas
    R('#1a1216', 23, 19, 2, 2); R('#1a1216', 31, 19, 2, 2);
    R(INK, 20, 23, 16, 2); R(INK, 19, 25, 2, 2); R(INK, 35, 25, 2, 2);   // bigote
    if (mouth === 'open') { R('#3a1010', 25, 26, 6, 3); R('#e8e0d0', 26, 26, 4, 1); } else R(SK2, 25, 27, 6, 1);
    // gorro alto
    R('#ffffff', 18, 9, 20, 5); R(SH, 18, 13, 20, 1);
    R('#ffffff', 20, -2, 16, 12); R('#ffffff', 17, 0, 22, 7); R('#ffffff', 22, -4, 12, 3); R(SH, 22, 4, 1, 5); R(SH, 30, 3, 1, 6);
    // brazos y palitos
    function arm(x, y, w, h, hx, hy) { R(WH, x, y, w, h); R(SH, x, y + h - 2, w, 2); R(SKIN, hx, hy, 6, 5); }
    function sticks(hx, hy, ex, ey) { for (var s = 0; s < 4; s++) line(g, ox + hx + 2 + s, oy + hy + dy + 2, ox + ex + s * 2 - 3, oy + ey + dy, STICK); }
    if (arms === 'down') { arm(0, 32, 7, 20, 0, 51); arm(49, 32, 7, 20, 50, 51); sticks(0, 53, -2, 66); sticks(50, 53, 56, 66); }
    else if (arms === 'up' || arms === 'wide') {
      var sp = arms === 'wide' ? 4 : 0;
      arm(2 - sp, 6, 7, 26, 2 - sp, 2); arm(47 + sp, 6, 7, 26, 48 + sp, 2);
      sticks(2 - sp, 2, -4 - sp, -8); sticks(48 + sp, 2, 58 + sp, -8);
    } else if (arms === 'fwd') { arm(0, 32, 7, 18, 0, 49); R(WH, 46, 30, 12, 7); R(SKIN, 54, 30, 4, 7); sticks(52, 30, 58, 22); }
    else if (arms === 'low') { arm(0, 34, 7, 18, 0, 52); R(WH, 46, 36, 10, 14); R(SKIN, 50, 50, 6, 5); sticks(50, 52, 58, 60); }
    else if (arms.indexOf('ladle') === 0) {
      var lf = +arms.slice(5) || 0, ly = [14, 4, 10][lf];
      arm(0, 32, 7, 20, 0, 51); arm(47, ly, 7, 32 - ly, 48, ly - 4);
      line(g, ox + 51, oy + ly - 4 + dy, ox + 54, oy + ly - 16 + dy, '#9aa0a6'); R('#c3c8cc', 51, ly - 20, 7, 4);
    } else if (arms === 'tea') { arm(0, 34, 7, 16, 0, 49); R(WH, 40, 36, 14, 6); R(SKIN, 34, 34, 6, 5); R('#f4f4f0', 33, 30, 5, 4); R('#7a5a2a', 34, 30, 3, 1); }
    return outlined(c, ox + 28, oy + 79);
  }
  // Dumpling provisorio: 16×14 (baozi 22×19), pies abajo al centro. Boca enorme con dientitos, ojitos cerrados ^ ^.
  function bakeDump(big, pose, f) {
    var w = big ? 22 : 16, h = big ? 20 : 15, c = mk(w, h), g = c.getContext('2d'), s = big ? 1.35 : 1;
    function R(col, x, y, ww, hh) { g.fillStyle = col; g.fillRect(Math.round(x * s), Math.round(y * s), Math.max(1, Math.round(ww * s)), Math.max(1, Math.round(hh * s))); }
    var sq = pose === 'hop' ? (f === 0 ? 1 : f === 2 ? -1 : 0) : pose === 'dead' ? 3 : 0;
    var top = 3 + sq, body = big ? '#f7f3ea' : '#f2e6c4', shade = big ? '#ddd6c6' : '#d9c79c';
    R(body, 3 - Math.max(0, sq), top + 2, 10 + 2 * Math.max(0, sq), 12 - top - 2 + 0);
    R(body, 4, top, 8, 2); R(body, 2 - Math.max(0, sq), top + 4, 12 + 2 * Math.max(0, sq), 6 - Math.max(0, sq));
    R(shade, 3, 12, 10, 2);
    if (big) { R('#e2402c', 7, top - 1, 2, 2); } else { R('#cdb98a', 6, top - 1, 4, 1); R('#cdb98a', 5, top, 1, 2); R('#cdb98a', 8, top - 1, 1, 2); R('#cdb98a', 10, top, 1, 2); }
    if (pose === 'dead') { R('#3a2418', 5, 10, 2, 1); R('#3a2418', 9, 10, 2, 1); }
    else {
      // ojitos ^ ^
      R('#3a2418', 4, top + 3, 1, 1); R('#3a2418', 5, top + 2, 1, 1); R('#3a2418', 6, top + 3, 1, 1);
      R('#3a2418', 9, top + 3, 1, 1); R('#3a2418', 10, top + 2, 1, 1); R('#3a2418', 11, top + 3, 1, 1);
      R('#f2a0a0', 3, top + 5, 1, 1); R('#f2a0a0', 12, top + 5, 1, 1);
      var mh = pose === 'muerde' ? (f === 0 ? 5 : 1) : 4;
      R('#5a1a22', 5, top + 5, 6, mh); R('#ffffff', 5, top + 5, 1, 1); R('#ffffff', 7, top + 5, 1, 1); R('#ffffff', 9, top + 5, 1, 1);
      if (mh > 2) { R('#ffffff', 6, top + 4 + mh, 1, 1); R('#ffffff', 8, top + 4 + mh, 1, 1); R('#e86a7a', 7, top + 3 + mh, 2, 1); }
    }
    return outlined(c, Math.round(w / 2), h - 1);
  }
  function bakeStick(stuck) {
    var c = mk(stuck ? 4 : 12, stuck ? 9 : 3), g = c.getContext('2d');
    if (stuck) { g.fillStyle = '#d9b26a'; g.fillRect(1, 0, 1, 8); g.fillRect(2, 1, 1, 7); g.fillStyle = '#8a6a3a'; g.fillRect(1, 7, 2, 1); c.ax = 2; c.ay = 8; return c; }
    g.fillStyle = '#d9b26a'; g.fillRect(0, 1, 12, 1); g.fillStyle = '#b8914a'; g.fillRect(0, 2, 12, 1); g.fillStyle = '#c8202a'; g.fillRect(0, 1, 3, 2);
    c.ax = 6; c.ay = 2; return c;
  }
  function bakeVap(open) {
    var c = mk(30, 26), g = c.getContext('2d');
    function R(col, x, y, w, h) { g.fillStyle = col; g.fillRect(x, y, w, h); }
    R('#b88a4a', 2, 10, 26, 14); R('#9a7038', 2, 14, 26, 2); R('#9a7038', 2, 20, 26, 2); R('#7a5428', 2, 23, 26, 2);
    if (!open) { R('#c89a5a', 1, 6, 28, 5); R('#e0b878', 4, 5, 22, 2); R('#7a5428', 13, 3, 4, 2); }
    else { R('#c89a5a', 16, 0, 14, 4); R('#f6f6f2', 6, 7, 3, 2); R('#f6f6f2', 14, 6, 3, 2); }
    return outlined(c, 15, 24);
  }
  function bakeWok() {
    var c = mk(22, 10), g = c.getContext('2d');
    g.fillStyle = '#2c2c30'; g.fillRect(2, 3, 16, 5); g.fillRect(4, 8, 12, 1); g.fillStyle = '#55555c'; g.fillRect(3, 3, 14, 1);
    g.fillStyle = '#7a5428'; g.fillRect(18, 4, 4, 2);
    return outlined(c, 11, 9);
  }
  function bakeCanopy() {   // parapente rosado y amarillo chicha (el de la caída lo pinta C4)
    var c = mk(56, 16), g = c.getContext('2d');
    for (var x = 0; x < 56; x++) {
      var y0 = Math.round(8 - 7 * Math.sin(x / 55 * Math.PI)), col = Math.floor(x / 7) % 2 ? '#ffe500' : '#ff2e88';
      g.fillStyle = col; g.fillRect(x, y0, 1, 6);
    }
    g.fillStyle = '#131015'; for (var k = 4; k < 56; k += 12) g.fillRect(k, 12, 1, 4);
    return outlined(c, 28, 15);
  }
  function bakeGateFallback(w) {
    var c = mk(w, 30), g = c.getContext('2d');
    g.fillStyle = '#8a1a1a'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, 30); g.fillRect(w - 3, 0, 3, 30);
    g.fillStyle = '#d4a23a'; for (var x = 5; x < w - 4; x += 5) g.fillRect(x, 3, 1, 27);
    g.fillStyle = '#ffd36b'; g.fillRect(0, 12, w, 1);
    return outlined(c, Math.round(w / 2), 29);
  }
  function textSpr(s, col, font) {
    var key = s + '|' + col + '|' + (font || ''), P0 = ph().txt;
    if (P0[key]) return P0[key];
    var w = 6 * s.length + 8, c = mk(w, 14), g = c.getContext('2d');
    if (ACH.px && fn(ACH.px, 'text')) { try { ACH.px.text(g, s, 3, 4, { font: font || 'a7', ink: col, outline: '#131015' }); } catch (e) { g.fillStyle = col; g.font = 'bold 8px monospace'; g.textBaseline = 'top'; g.fillText(s, 3, 3); } }
    else { g.fillStyle = '#131015'; g.font = 'bold 8px monospace'; g.textBaseline = 'top'; g.fillText(s, 4, 4); g.fillStyle = col; g.fillText(s, 3, 3); }
    c.ax = Math.round(w / 2); c.ay = 7;
    P0[key] = c; return c;
  }
  function bubbleSpr(s) {   // globo blanco con colita, partido en dos líneas si es largo
    var P0 = ph().bub; if (P0[s]) return P0[s];
    var words = s.split(' '), lines = [''], maxC = 26;
    for (var i = 0; i < words.length; i++) { var L = lines[lines.length - 1]; if ((L + ' ' + words[i]).trim().length > maxC && L) lines.push(words[i]); else lines[lines.length - 1] = (L + ' ' + words[i]).trim(); }
    var tw = 0, hasPx = ACH.px && fn(ACH.px, 'text') && fn(ACH.px, 'measure');
    for (var j = 0; j < lines.length; j++) { var mw = 5 * lines[j].length; if (hasPx) { try { mw = ACH.px.measure(lines[j], 'a5') || mw; } catch (e) { /* nada */ } } tw = Math.max(tw, mw); }
    var w = tw + 10, h = lines.length * 8 + 8, c = mk(w + 2, h + 6), g = c.getContext('2d');
    g.fillStyle = '#131015'; g.fillRect(0, 0, w + 2, h + 2); g.fillStyle = '#fffbe8'; g.fillRect(1, 1, w, h);
    g.fillStyle = '#131015'; g.fillRect(Math.round(w / 2) - 2, h + 1, 6, 2); g.fillRect(Math.round(w / 2) - 1, h + 3, 4, 2); g.fillRect(Math.round(w / 2), h + 5, 2, 1);
    g.fillStyle = '#fffbe8'; g.fillRect(Math.round(w / 2) - 1, h, 4, 2); g.fillRect(Math.round(w / 2), h + 2, 2, 2);
    for (var k = 0; k < lines.length; k++) {
      if (hasPx) { try { ACH.px.text(g, lines[k], Math.round((w + 2) / 2), 5 + k * 8, { font: 'a5', ink: '#131015', align: 'c' }); continue; } catch (e) { /* sigue */ } }
      g.fillStyle = '#131015'; g.font = '6px monospace'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(lines[k], Math.round((w + 2) / 2), 4 + k * 8);
    }
    c.ax = Math.round((w + 2) / 2); c.ay = h + 6;
    P0[s] = c; return c;
  }
  var PHC = null;
  function ph() {
    if (PHC) return PHC;
    PHC = { chef: {}, dump: {}, baozi: {}, txt: {}, bub: {}, stickFly: bakeStick(false), stickStuck: bakeStick(true), vap: bakeVap(false), vapOpen: bakeVap(true),
      wok: bakeWok(), canopy: bakeCanopy(), gate: null };
    var poses = { idle: 2, alza: 2, lanza: 3, llama: 3, salta: 3, sentado: 2 };
    for (var k in poses) { PHC.chef[k] = []; for (var f = 0; f < poses[k]; f++) PHC.chef[k].push(bakeChef(k, f)); }
    PHC.chef.hurt = tint(PHC.chef.idle[0], '#ffffff');
    PHC.chef.cae = rotated(PHC.chef.idle[0], -0.6);
    PHC.chef.dead = rotated(PHC.chef.idle[0], -Math.PI / 2);
    var dp = { hop: 3, muerde: 2 };
    for (var q in dp) { PHC.dump[q] = []; PHC.baozi[q] = []; for (var e = 0; e < dp[q]; e++) { PHC.dump[q].push(bakeDump(false, q, e)); PHC.baozi[q].push(bakeDump(true, q, e)); } }
    PHC.dump.dead = bakeDump(false, 'dead', 0); PHC.baozi.dead = bakeDump(true, 'dead', 0);
    PHC.dump.hurt = tint(PHC.dump.hop[1], '#ffffff'); PHC.baozi.hurt = tint(PHC.baozi.hop[1], '#ffffff');
    return PHC;
  }
  function PJ() { return (ACH.sprites && ACH.sprites.cv && ACH.sprites.cv.pj) || null; }
  function LARCO() { return (ACH.sprites && ACH.sprites.cv && ACH.sprites.cv.larco) || null; }
  function frame(list, f) { if (!list) return null; if (Array.isArray(list)) return list.length ? list[((f % list.length) + list.length) % list.length] : null; return list; }
  function good(c) { return !!(c && c.width > 0); }
  function chefSprite(pose, f) {
    var m = PJ(), set = m && m.chef, c = set ? frame(set[pose], f) : null;
    if (good(c)) return c;
    var p = ph();
    if (pose === 'dead' || pose === 'cae' || pose === 'hurt') return p.chef[pose];
    return frame(p.chef[pose] || p.chef.idle, f);
  }
  function dumpSprite(big, pose, f) {
    var m = PJ(), set = m && (big ? m.baozi : m.dumpling), c = set ? frame(set[pose], f) : null;
    if (good(c)) return c;
    var p = ph(), s = big ? p.baozi : p.dump;
    if (pose === 'hurt') return s.hurt;
    return frame(s[pose] || s.hop, f);
  }
  function stickSprite(stuck) {
    var m = PJ(), set = m && m.palito, c = set ? frame(stuck ? set.clavado : set.vuela, 0) : null;
    return good(c) ? c : (stuck ? ph().stickStuck : ph().stickFly);
  }
  function larcoProp(k) {
    var L = LARCO(); if (!L) return null;
    var c = L[k] || (L.props && L.props[k]);
    c = frame(c, 0); return good(c) ? c : null;
  }
  function drawC(ctx, c, x, y, flip) {
    if (!c) return;
    var ax = c.ax !== undefined ? c.ax : Math.round(c.width / 2), ay = c.ay !== undefined ? c.ay : c.height;
    if (!flip) { ctx.drawImage(c, Math.round(x - ax), Math.round(y - ay)); return; }
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(-1, 1); ctx.drawImage(c, -ax, -ay); ctx.restore();
  }
  function shadowE(ctx, x, y, rx, a) {
    ctx.globalAlpha = a; ctx.fillStyle = '#141018';
    ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), rx, Math.max(1, rx * 0.45), 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  }
  function sombra(ctx, x, y, k, rx) {   // aviso de caída: sprite de C2c (3 tamaños) o elipse
    var m = PJ(), set = m && m.sombra, c = set ? frame(set, Math.min(2, Math.floor(k * 3))) : null;
    if (good(c)) { ctx.globalAlpha = 0.5 + 0.4 * k; drawC(ctx, c, x, y + (c.ay === undefined ? c.height / 2 : 0), false); ctx.globalAlpha = 1; return; }
    shadowE(ctx, x, y, rx * (0.4 + 0.6 * k), 0.25 + 0.4 * k);
    if (k > 0.6 && Math.floor(k * 20) % 2) { ctx.globalAlpha = 0.8; ctx.fillStyle = '#ff2e88'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); ctx.globalAlpha = 1; }
  }

  /* ---------------- Dibujo ---------------- */
  function poseNow() {
    if (J.state === 'muriendo') return J.deadT < 0.25 ? 'hurt' : J.deadT < 0.6 ? 'cae' : 'dead';
    if (J.state === 'muerto') return 'dead';
    if (J.act === 'tired') return 'sentado';
    if (J.act === 'slam') return 'salta';
    if (J.hurtT > 0.08) return 'hurt';
    if (J.poseT > 0 && J.pose) return J.pose;
    if (J.act === 'fan') return 'alza';
    return 'idle';
  }
  function chefFrame(pose) {
    if (pose === 'lanza') return Math.min(2, Math.floor((0.3 - Math.max(0, J.poseT)) * 10));
    if (pose === 'salta') { var t = J.actT; return t < 0.25 ? 0 : t < K.slamRise ? 1 : 2; }
    if (pose === 'alza') return Math.floor(J.anim * 8);
    if (pose === 'llama') return Math.floor(J.anim * 6);
    if (pose === 'sentado') return Math.floor(J.anim * 1.6);
    return Math.floor(J.anim * (J.walking ? 4 : 2));
  }
  function chefVisible() { return J.state !== 'cocina'; }
  function onScreen(x, y, cx, cy, m) { var V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }; return x > cx - m && x < cx + V.w + m && y > cy - m && y < cy + V.h + m * 1.5; }
  function drawChef(ctx, cx, cy) {
    var pose = poseNow(), c = chefSprite(pose, chefFrame(pose));
    if (J.slowT > 0 && Math.floor(J.anim * 6) % 2 === 0) ctx.globalAlpha = 0.85;
    drawC(ctx, c, J.x - cx, J.y - cy - J.z, J.flip && pose !== 'dead' && pose !== 'cae');
    ctx.globalAlpha = 1;
    if (J.slowT > 0) { ctx.fillStyle = '#9fe8ff'; for (var i = 0; i < 4; i++) ctx.fillRect(Math.round(J.x - cx - 16 + i * 10 + Math.sin(J.anim * 5 + i) * 2), Math.round(J.y - cy - 60 - J.z - ((J.anim * 20 + i * 7) % 18)), 2, 2); }
  }
  function drawDump(ctx, d, cx, cy) {
    var pose, f = 0;
    if (d.state === 'dead') pose = 'dead';
    else if (d.hurtT > 0.05) pose = 'hurt';
    else if (d.state === 'bite') { pose = 'muerde'; f = d.t < 0.1 ? 0 : 1; }
    else if (d.state === 'hop' || d.state === 'out' || d.state === 'bounce') { pose = 'hop'; f = d.z > 3 ? 2 : 0; }
    else { pose = 'hop'; f = 1; }
    var c = dumpSprite(d.big, pose, f);
    if (d.state === 'dead') ctx.globalAlpha = Math.max(0, 1 - d.t / 0.45);
    drawC(ctx, c, d.x - cx, d.y - cy - d.z, d.face < 0);
    ctx.globalAlpha = 1;
  }
  function drawables(G, out) {
    if (!out || !G) return;
    var cx0 = G.cam ? G.cam.x : 0, cy0 = G.cam ? G.cam.y : 0, i, g = geo();
    if (!onScreen((g.box.x0 + g.box.x1) / 2, (g.box.y0 + g.box.y1) / 2, cx0, cy0, (g.box.x1 - g.box.x0) / 2 + 80)) return;
    // en el piso: sombras de lluvia, del wok y de los dumplings en el aire
    out.push({ y: -1e6 + 60, draw: function (ctx, cx, cy) {
      for (var k = 0; k < STK.length; k++) { var s = STK[k]; if (s.mode === 'rain' && s.t > -0.01) sombra(ctx, s.x - cx, s.y - cy, Math.min(1, Math.max(0, s.t) / K.rainTele), 7); }
      if (J.act === 'slam' && J.slam && !J.slam.landed) { var kk = Math.min(1, J.actT / (K.slamRise + K.slamAir)); sombra(ctx, J.slam.tx - cx, J.slam.ty - cy, kk, 26); }
      if (chefVisible() && J.state !== 'muerto') shadowE(ctx, J.x - cx, J.y - cy + 1, J.z > 0 ? Math.max(6, 22 - J.z / 12) : 22, 0.3);
      for (var q = 0; q < DUMP.length; q++) { var d = DUMP[q]; if (d.z > 1 && d.state !== 'dead') shadowE(ctx, d.x - cx, d.y - cy, d.big ? 6 : 4, 0.3); }
      for (var w = 0; w < waves.length; w++) { var wv = waves[w], r = 8 + (K.slamR - 8) * (wv.t / 0.35); ctx.globalAlpha = 1 - wv.t / 0.35; ctx.strokeStyle = '#fff1a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(Math.round(wv.x - cx), Math.round(wv.y - cy), r, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
    } });
    // vaporera gigante
    var v = g.vap;
    out.push({ y: v.y, draw: function (ctx, cx, cy) {
      var open = J.act === 'summon' || (J.poseT > 0 && J.pose === 'llama' && J.state === 'pelea');
      var c = larcoProp('vaporeraGrande') || (open ? ph().vapOpen : ph().vap);
      drawC(ctx, c, v.x - cx, v.y - cy, false);
      if (open || J.state === 'pelea') { ctx.fillStyle = '#eef2f2'; ctx.globalAlpha = open ? 0.9 : 0.45; for (var k = 0; k < 3; k++) ctx.fillRect(Math.round(v.x - cx - 6 + k * 6 + Math.sin(J.anim * 3 + k) * 2), Math.round(v.y - cy - 26 - ((J.anim * 14 + k * 5) % 12)), 2, 2); ctx.globalAlpha = 1; }
    } });
    // palitos clavados
    for (i = 0; i < STK.length; i++) (function (s) {
      if (s.mode !== 'stuck') return;
      out.push({ y: s.y, draw: function (ctx, cx, cy) { var a = s.t > K.stickStuck ? Math.max(0, 1 - (s.t - K.stickStuck) / 0.3) : 1; ctx.globalAlpha = a; drawC(ctx, stickSprite(true), s.x - cx, s.y - cy, Math.cos(s.ang || 0) < 0); ctx.globalAlpha = 1; } });
    })(STK[i]);
    for (i = 0; i < DUMP.length; i++) (function (d) { out.push({ y: d.y, draw: function (ctx, cx, cy) { drawDump(ctx, d, cx, cy); } }); })(DUMP[i]);
    if (chefVisible() && J.z < 30) out.push({ y: J.y + 0.1, x: J.x, draw: function (ctx, cx, cy) { drawChef(ctx, cx, cy); } });
    if (wok) out.push({ y: wok.y, draw: function (ctx, cx, cy) {
      var pj = PJ(), c = (pj && pj.chef && good(frame(pj.chef.wok, 0))) ? frame(pj.chef.wok, 0) : ph().wok;
      ctx.save(); ctx.translate(Math.round(wok.x - cx), Math.round(wok.y - cy - 5)); if (!wok.done) ctx.rotate(Math.sin(wok.rot) * 0.4); ctx.drawImage(c, -c.ax, -c.ay + 5); ctx.restore();
    } });
    // reja provisoria encima del prop si el arte de C2b no está (cerrada en la pelea)
    if (g.gate && gateLocked && !larcoProp('rejaChifa')) out.push({ y: g.gate.y + 0.2, draw: function (ctx, cx, cy) { if (!PHC.gate) PHC.gate = bakeGateFallback(g.gate.w); drawC(ctx, PHC.gate, g.gate.x - cx, g.gate.y - cy, false); } });
    // parapente de alquiler en el borde
    if (J.edgeOpen && !jumpAnim) {
      var b = g.borde;
      out.push({ y: b.y - 2, draw: function (ctx, cx, cy) {
        var ct = larcoProp('casetaTandem');
        if (ct) drawC(ctx, ct, b.x - 34 - cx, b.y - 8 - cy, false);
        else {
          var x = Math.round(b.x - 46 - cx), y = Math.round(b.y - 36 - cy);
          ctx.fillStyle = '#131015'; ctx.fillRect(x - 1, y - 1, 30, 30); ctx.fillStyle = '#2e6fd8'; ctx.fillRect(x, y, 28, 28); ctx.fillStyle = '#ffe500'; ctx.fillRect(x, y, 28, 9);
          drawC(ctx, textSpr('VUELOS', '#131015', 'a5'), x + 14, y + 4, false); drawC(ctx, textSpr('TANDEM', '#ffffff', 'a5'), x + 14, y + 16, false);
        }
        drawC(ctx, ph().canopy, b.x - cx + 6, b.y - cy + 2, false);
      } });
    }
  }
  function drawTop(ctx, G, cx, cy) {
    if (!G) return;
    var i, p = G.player;
    if (!onScreen(geo().home.x, geo().home.y, cx, cy, 420)) { if (!jumpAnim) return; }
    // aviso del abanico: líneas punteadas desde la mano
    if (J.act === 'fan' && J.state === 'pelea') {
      var h = handPt(), a0 = J.aim !== null ? J.aim : Math.atan2(p.y - h.y, p.x - h.x), n = J.fanN, blink = J.aim !== null ? 1 : (Math.floor(J.anim * 12) % 2 ? 0.7 : 0.35);
      ctx.globalAlpha = blink; ctx.fillStyle = J.aim !== null ? '#ff2e88' : '#ffe500';
      for (var k = 0; k < n; k++) { var a = a0 + (n > 1 ? (k / (n - 1) - 0.5) * K.fanArc : 0); for (var r = 14; r < 70; r += 6) ctx.fillRect(Math.round(h.x + Math.cos(a) * r - cx), Math.round(h.y + Math.sin(a) * r - cy - 12), 2, 1); }
      ctx.globalAlpha = 1;
      drawC(ctx, textSpr('!', '#ffe500'), J.x - cx, J.y - cy - 96, false);
    }
    if (J.act === 'summon') drawC(ctx, textSpr('!', '#1fe07a'), geo().vap.x - cx, geo().vap.y - cy - 34, false);
    // palitos en vuelo (a la altura de la mano) y los que caen
    for (i = 0; i < STK.length; i++) {
      var s = STK[i];
      if (s.mode === 'fly') {
        var c = stickSprite(false);
        ctx.save(); ctx.translate(Math.round(s.x - cx), Math.round(s.y - cy - 12)); ctx.rotate(s.ang); ctx.drawImage(c, -c.ax, -c.ay); ctx.restore();
      } else if (s.mode === 'rain' && s.t > K.rainTele - 0.18) {
        var zf = (K.rainTele - s.t) / 0.18 * 100, c2 = stickSprite(true);
        ctx.save(); ctx.translate(Math.round(s.x - cx), Math.round(s.y - cy - zf)); ctx.drawImage(c2, -c2.ax, -c2.ay - 6); ctx.restore();
      }
    }
    // el chef en el aire (salto de wok)
    if (chefVisible() && J.z >= 30) drawChef(ctx, cx, cy);
    for (i = 0; i < parts.length; i++) {
      var q = parts[i], al = 1 - q.t / q.life;
      ctx.globalAlpha = Math.max(0, Math.min(1, al * 1.6)); ctx.fillStyle = q.c;
      ctx.fillRect(Math.round(q.x - cx), Math.round(q.y - q.z - cy), q.w, q.h);
    }
    ctx.globalAlpha = 1;
    for (i = 0; i < texts.length; i++) {
      var tt = texts[i], ts = textSpr(tt.s, tt.c);
      ctx.globalAlpha = tt.t > 0.4 ? Math.max(0, 1 - (tt.t - 0.4) / 0.2) : 1;
      drawC(ctx, ts, tt.x - cx, tt.y - cy - tt.t * 16, false);
    }
    ctx.globalAlpha = 1;
    if (bubble && chefVisible()) drawC(ctx, bubbleSpr(bubble.s), J.x - cx, J.y - cy - J.z - 88, false);
    // el borde: flecha chicha y la tecla
    if (J.edgeOpen && !jumpAnim) {
      var b = geo().borde, bob = Math.round(Math.sin((G.clock || 0) * 5) * 2);
      var ar = textSpr(TXT.arrow, Math.floor((G.clock || 0) * 3) % 2 ? '#ffe500' : '#ff2e88');
      drawC(ctx, ar, b.x - cx, b.y - cy - 44 + bob, false);
      ctx.fillStyle = '#1fe07a'; var ax = Math.round(b.x - cx), ay = Math.round(b.y - cy - 34 + bob);
      ctx.fillRect(ax - 1, ay, 3, 5); ctx.fillRect(ax - 3, ay + 5, 7, 1); ctx.fillRect(ax - 2, ay + 6, 5, 1); ctx.fillRect(ax - 1, ay + 7, 3, 1);
      if (p && nearEdge(p) && G.state === 'playing') drawC(ctx, textSpr(TXT.prompt, '#ffffff', 'a5'), p.x - cx, p.y - cy + 14, false);
    }
    // el salto: la vela se abre sobre Alexander
    if (jumpAnim && p && jumpAnim.canopy > 0) {
      var ca = ph().canopy, sc = Math.min(1, jumpAnim.canopy * 1.4);
      ctx.globalAlpha = jumpAnim.fade ? Math.max(0, 1 - jumpAnim.fade * 0.6) : 1;
      ctx.save(); ctx.translate(Math.round(p.x - cx), Math.round(p.y - cy - (p.z || 0) - 38)); ctx.scale(sc, sc); ctx.drawImage(ca, -ca.ax, -ca.ay); ctx.restore();
      ctx.strokeStyle = '#131015'; ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(Math.round(p.x - cx - 20 * sc) + 0.5, Math.round(p.y - cy - (p.z || 0) - 40)); ctx.lineTo(Math.round(p.x - cx) + 0.5, Math.round(p.y - cy - (p.z || 0) - 22));
      ctx.moveTo(Math.round(p.x - cx + 20 * sc) + 0.5, Math.round(p.y - cy - (p.z || 0) - 40)); ctx.lineTo(Math.round(p.x - cx) + 0.5, Math.round(p.y - cy - (p.z || 0) - 22)); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  /* ---------------- Barra de jefe (HTML chicha sobre #stage) ---------------- */
  var UI = { styled: false, bar: null, fill: null, shown: false, lastW: -1 };
  function injectStyle() {
    if (UI.styled) return; UI.styled = true;
    var st = document.createElement('style'); st.id = 'chefStyle';
    st.textContent =
      '#chefBar{position:absolute;left:50%;top:calc(var(--u)*3);transform:translateX(-50%) rotate(1deg);z-index:5;pointer-events:none;display:none;' +
      'width:calc(var(--u)*160);background:#131015;border:var(--u) solid #ffe500;box-shadow:calc(var(--u)*2) calc(var(--u)*2) 0 #ff2e88;' +
      'padding:calc(var(--u)*2) calc(var(--u)*3);text-align:center}' +
      '#chefBar.on{display:block;animation:cbIn .45s ease-out}' +
      '#chefBar .jn{display:block;font-family:var(--display);font-size:calc(var(--u)*6);line-height:1;color:#ffe500;white-space:nowrap;letter-spacing:.02em;' +
      'text-shadow:var(--u) var(--u) 0 #c8202a;margin-bottom:calc(var(--u)*1)}' +
      '#chefBar .jb{position:relative;height:calc(var(--u)*4);background:#2a2630;border:var(--u) solid #000}' +
      '#chefBar .jb i{position:absolute;left:0;top:0;bottom:0;width:100%;background:#1fe07a;border-top:var(--u) solid #9dffc8;transition:width .15s linear}' +
      '#chefBar .jb u{position:absolute;top:0;bottom:0;width:var(--u);background:rgba(255,255,255,.55)}' +
      '#chefBar.hit .jb i{background:#fff6b0}' +
      '#chefBar[data-ph="2"] .jb i{background:#ffb000}#chefBar[data-ph="3"] .jb i{background:#ff2e88;animation:blink .5s steps(2) infinite}' +
      '#chefBar.tired .jn{color:#1fe07a}#chefBar.dead{opacity:.6}' +
      '@keyframes cbIn{0%{opacity:0;transform:translateX(-50%) translateY(calc(var(--u)*-8)) rotate(1deg)}100%{opacity:1;transform:translateX(-50%) rotate(1deg)}}';
    (document.head || document.documentElement).appendChild(st);
  }
  function stage() { return typeof document !== 'undefined' ? document.getElementById('stage') : null; }
  function barEl() {
    if (UI.bar) return UI.bar;
    var s = stage(); if (!s) return null;
    injectStyle();
    var d = document.createElement('div'); d.id = 'chefBar'; d.setAttribute('data-ph', '1');
    d.innerHTML = '<span class="jn">EL MAESTRO WANTÁN · CHIFA GRAN DRAGÓN</span><div class="jb"><i></i><u style="left:60%"></u><u style="left:25%"></u></div>';
    s.appendChild(d);
    UI.bar = d; UI.fill = d.querySelector('i');
    return d;
  }
  function showBar(on) {
    var b = on ? barEl() : UI.bar; if (!b) return;
    UI.shown = !!on; b.classList.toggle('on', !!on); b.classList.toggle('dead', false);
    if (on) syncBar(true);
  }
  function syncBar(force) {
    if (!UI.bar || !UI.shown) return;
    var w = Math.round(1000 * J.hp / J.hpMax) / 10;
    UI.bar.classList.toggle('tired', J.act === 'tired');
    if (!force && w === UI.lastW) return;
    UI.lastW = w; UI.fill.style.width = w + '%';
    UI.bar.setAttribute('data-ph', String(J.dead ? 1 : phaseOf()));
    UI.bar.classList.toggle('dead', J.dead);
  }
  var hitTO = 0;
  function flashBar() { if (!UI.bar) return; UI.bar.classList.add('hit'); clearTimeout(hitTO); hitTO = setTimeout(function () { if (UI.bar) UI.bar.classList.remove('hit'); }, 90); }

  /* ---------------- Debug ---------------- */
  function info() {
    var g = geo();
    return { state: J.state, dead: J.dead, hp: +J.hp.toFixed(2), hpMax: J.hpMax, phase: J.state === 'pelea' ? phaseOf() : null, act: J.act, x: Math.round(J.x), y: Math.round(J.y), z: Math.round(J.z),
      dumplings: liveDumps(), sticks: STK.length, slowT: +Math.max(0, J.slowT).toFixed(2), slowCD: +Math.max(0, J.slowCD).toFixed(2), fightT: +J.fightT.toFixed(1), tries: J.tries, hits: J.hits,
      edgeOpen: J.edgeOpen, jumps: J.jumps, gateLocked: gateLocked, foreignGate: !!foreignGate, gateProp: !!(g.gate && g.gate.prop),
      box: { x0: Math.round(g.box.x0), y0: Math.round(g.box.y0), x1: Math.round(g.box.x1), y1: Math.round(g.box.y1) }, home: g.home, borde: g.borde, vap: g.vap,
      frozenByMe: frozenByMe, seq: SQ ? SQ.i : null, bossMusic: bossOn,
      caida: !!caidaOn(), chorrillos: !!(CV.chorrillos && fn(CV.chorrillos, 'play')), finish: fn(CV, 'finish'), freezeApi: fn(CV, 'freeze') };
  }
  function ensureFight() {
    var G = ACH.G; if (!G || J.dead) return;
    if (J.state !== 'pelea') { stopSeq(); if (frozenByMe) freeze(false); J.introSeen = true; setGate('lock'); startFight(G); }
  }
  function toArena(G, where) { var g = geo(), p = G && G.player; if (!p) return; var t = where || { x: g.home.x, y: g.home.y + 60 }; p.x = t.x; p.y = t.y; if (ACH.debug && fn(ACH.debug, 'teleport')) ACH.debug.teleport(t.x, t.y); }
  var DBG = {
    info: info,
    // v0.13 cierre: solo lectura, para los bots de QA (palitos en vuelo / lluvia / posición del aterrizaje del wok)
    field: function () {
      return { sticks: STK.map(function (s) { return { mode: s.mode, x: s.x, y: s.y, vx: s.vx || 0, vy: s.vy || 0, t: s.t }; }),
        slam: J.slam ? { tx: J.slam.tx, ty: J.slam.ty, landed: J.slam.landed } : null, act: J.act, actT: J.actT, K: K };
    },
    kill: function (quick) {
      var G = ACH.G; if (J.dead) return info();
      if (J.state !== 'pelea') { stopSeq(); if (frozenByMe) freeze(false); J.introSeen = true; startFight(G); }
      die(G, quick !== false); return info();
    },
    hp: function (n) { if (typeof n === 'number') { ensureFight(); J.hp = clamp(n, 0, J.hpMax); syncBar(true); if (J.hp <= 0) die(ACH.G, false); } return info(); },
    phase: function (n) { ensureFight(); n = n | 0; J.hp = n >= 3 ? J.hpMax * K.ph3 - 0.01 : n === 2 ? J.hpMax * K.ph2 - 0.01 : J.hpMax; J.atkT = 0.3; syncBar(true); return info(); },
    fight: function () { var G = ACH.G; toArena(G); ensureFight(); return info(); },
    intro: function () { var G = ACH.G; if (J.dead) return info(); J.introSeen = false; toArena(G); return info(); },
    edge: function () { var G = ACH.G; if (!J.dead) DBG.kill(true); toArena(G, { x: geo().borde.x, y: geo().borde.y - 14 }); return info(); },
    jump: function () { var G = ACH.G; DBG.edge(); startJump(G); return info(); },
    // para probar en una página sin la arena de C1a: la arena alrededor de Alexander (±10 × ±4 tiles)
    arenaHere: function (wt, ht) {
      var G = ACH.G, p = G && G.player; if (!p) return null; var t = T(); wt = wt || 10; ht = ht || 4;
      testArena = { x0: p.x - wt * t, x1: p.x + wt * t, y0: p.y - ht * t - 20, y1: p.y + ht * t };
      GEO = null; clearField(); resetChef(false); J.introSeen = false; return info();
    }
  };
  function installDebug() {
    var D = ACH.debug = ACH.debug || {};
    var DC = D.cv = D.cv || {};
    DC.chef = DBG;
    J.debug = DBG;
    J.jump = function () { var G = ACH.G; if (!G || !J.dead) return false; if (!J.edgeOpen) openEdge(); J.jumps = Math.max(1, J.jumps); startJump(G); return true; };   // sin diálogo
    var orig = DC.skip;
    if (typeof orig !== 'function') {
      var sk = function (what) {
        if (what === 'chef') { var r = DBG.edge(); return r; }
        if (what === 'caida') { DBG.edge(); startCaida(); return info(); }
        if (what === 'chorrillos') { DBG.edge(); freeze(true); caidaWin(); return info(); }
        return null;
      };
      sk._chef = true; DC.skip = sk;
    }
  }
  installDebug();
  setTimeout(installDebug, 0);   // por si nivel.js instala su ACH.debug.cv después

  /* ---------------- Registro ---------------- */
  var SYS = { id: 'chef', name: 'chef', update: update, reset: reset, onRespawn: onRespawn, mood: mood, drawables: drawables, drawTop: drawTop,
    onSwing: onSwing, onProjectile: onProjectile };
  CV.register(SYS);
  CV.chefK = K;
})();
