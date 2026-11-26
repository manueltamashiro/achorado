/* ACHORADO — js/miraflores/jefa.js (M1b): Doña Chancaca, la picaronera (jefa del nivel 3) y sus enjambres de abejas.
   Contrato: MIRAFLORES.md, sección 5, sobre los ganchos de la sección 2 (ACH.nivel → ACH.mira.systems).

   SE REGISTRA con ACH.mira.register (o, si no existe, en ACH.mira.systems) como
     { id/name: 'jefa', update, reset, onRespawn, mood, drawables, drawTop, onSwing, onProjectile, speedMul }.
   La jefa y los enjambres NO están en G.zombies. drawables empuja { y, draw(ctx, camX, camY) }: charcos y avisos de caída en y = −1e6
   (debajo de todo), el cordel, la carretilla y la jefa en su y. drawTop: abejas (con sus sombritas), picarones en vuelo, partículas y textos.

   PUBLICA ACH.mira.jefa (el mismo objeto todo el tiempo; se puede leer y, para pruebas, mutar `dead`):
     dead (bool)       true cuando murió: abre la salida (mundo.js inExit) y apaga lo sólido.
     state             'rotonda' | 'tutorial' | 'yendo' | 'espera' | 'pelea' | 'muriendo' | 'muerta'
     hp, hpMax, phase  vida (20; v0.11), fase 1–3 · x, y (px, pies) · face (rad) · frying (bool) · info() resumen para QA.
   LO SÓLIDO (forma elegida): tres rectángulos con `jefa: true` en ACH.world.dynSolids (mundo.js los respeta en collideCircle y los();
     routeCheck ignora los `jefa`). Se actualizan en cada paso y se apagan con `off` (muerta, o fuera de la boca de la calle):
       cordel con los baldes de masa que cierra la boca de la Calle de las Pizzas (4 tiles × 8 px, detrás de ella): siempre que viva;
       su cuerpo (12 × 10) y la carretilla (18 × 18, a 13 px delante de ella; gira con ella a 70°/s): en 'espera' y 'pelea'.
     Para un mundo sin dynSolids también publica ACH.mira.jefa.solidAt(x, y, r) → bool, con lo mismo.
     Al girar, la carretilla empuja a Alexander; si lo aplastaría contra una pared, no gira.

   POSICIONES (px): ACH.world.places.rotondaC (o ACH.world.rotonda {c, r}) y ACH.world.places.pizzasEntrada; también acepta
     ACH.world.mira.puntos.{rotonda, jefa}; si no hay nada, el contrato: rotonda (57.5, 35.5) y entrada (101, 60.5) en tiles.
   AGUA: ACH.world.inWater(x, y) de mundo.js; si no está, ACH.world.water[] / ACH.world.mira.agua[] {x, y, r}, o los props
     'piletaOvalo' / 'piletaChica' con su `water` {x, y, r} relativo al ancla (sin `water`: centro de la huella y radio 22).
   TITINA (Q): el motor no exporta launchTitina; si el enjambre está cerca y Titina en el hombro, se lanza igual que en entities.js
     (G.titina.state = 'volando', p.bird = false) y el enjambre más cercano la sigue 4 s. Si algún día existe ACH.ent.launchTitina, se usa esa.

   DEBUG: ACH.debug.mira.jefa() estado · killJefa() la mata ya · bees() lista los enjambres · bees(n) suelta n enjambres junto a Alexander · bees(-1) los borra.

   Todo lo de afuera (sprites ACH.sprites.mira.*, sonidos ACH.audio.emit/loop, frases ACH.audio.say con ids jefaPregon/jefaUltimo/jefaMuere
   o el texto con who 'senora', música setBoss, HUD, inventario) se llama protegido: sin eso se dibujan reemplazos provisorios y no suena nada.
   Sin getImageData, shadowBlur, filter ni degradados en el bucle (los reemplazos y textos se hornean una vez). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  ACH.mira = ACH.mira || {};
  if (!ACH.mira.systems) ACH.mira.systems = [];

  /* ---------------- Afinación ---------------- */
  var D2R = Math.PI / 180;
  var K = {
    rotTrigger: 110, fightR: 130, skipR: 260, skipCol: 88, pregonR: 260,
    hp: 35, nearBody: 46, nearCart: 32, fryMul: 1.5, turn: 70 * D2R, fryTurn: 160 * D2R,   // v0.13 (D2): vida 20 → 30 → 35 (arquitecto: entre 28 s con 30 y 47 s con 40). Medido con ACH.debug.mira.trial (ACHORADO, bot que esquiva y pega): 28 s de media (antes, 15 s); con K.hp = 40, 47 s al ganar
    bodyR: 7, cartR: 10, cartOff: 13,
    fryEvery: 9, fryT: 2.5, fryT3: 1.8, fryWarn: 1.1, splashR: 18, splashDmg: 6, splashEvery: 1.0,   // arreglos v0.11: aviso de 1,1 s antes del aceite; 6 cada 1 s
    phases: [null, { every: 6, max: 1, n: 1 }, { every: 5, max: 2, n: 1, throwEvery: 5 }, { every: 4, max: 3, n: 1, throwEvery: 4.5 }],   // arreglos v0.11: menos enjambres a la vez · v0.11b: más dura (pedido del dueño): salen cada 6/5/4 s (antes 8/7/6), mismo tope
    ph2: 0.6, ph3: 0.25, spawnFar: 320,
    throwDmg: 7, throwHitR: 12, throwFlight: 1.0, throwMax: 230, puddleLife: 6, puddleR: 14, puddleSlow: 0.5,
    tutLeaveAt: 4, tutVanishAt: 6.4, leaveSpeed: 46,
    // abejas
    beeMin: 10, beeMax: 14, contactR: 10, stingDmg: 4, stingEvery: 0.9, stingFirst: 0.35, stingGate: 0.6,   // arreglos v0.11: picadura 3 cada 0,9 s (tope global 1 cada 0,6 s) · v0.11b: más dura (pedido del dueño): picadura 3 → 4
    swarmHp: 4, swarmLife: 14, tutHp: 2, tutLife: 8, gatherT: 0.6,   // v0.11b: más dura (pedido del dueño): enjambre aguanta 4 (antes 3)
    accel: 170, speedK: 0.45,      // velocidad = caminar + 45 % de (correr − caminar): ~105 px/s con 80/135
    tiredAt: 9, tiredMul: 0.85,    // pasada la mitad de su vida vuelan 15 % más lento
    lostT: 3, titT: 4, titR: 260, eatR: 30, eatT: 2, catR: 18, catDmg: 0.5, catDistract: 1, catCD: 2.5, farR: 220, farT: 3, disperseT: 1,
    catSeek: 110, catChase: 3.5, catChaseCD: 8   // v0.13 (D4): el gato compañero distrae enjambres
  };
  // v0.13 (D2): la embestida con la carretilla. Aviso de 0,8 s (los primeros 0,4 s todavía apunta; luego la línea queda fija), carrera a 200 px/s en línea recta
  // hasta chocar con algo (auto, basurero, cordel, pared) → aturdida 2 s con daño ×2. Si no choca, se frena a los 270 px y descansa 0,6 s.
  var KC = { warn: 0.8, lock: 0.4, speed: 200, max: 110, recover: 0.7, backSpeed: 80, stun: 2.0, stunMul: 2, dmg: 10, hitR: 16, push: 80, aim: 5.5, minD: 0, maxD: 300,
    first: [0, 5, 4.5, 4], every: [0, 8, 7, 6], cling: 4, bellStun: 1.5, bellMul: 1.5 };
  var TXT = {
    pregon: ['¡Picarones, picarones calientitos!', '¡Con su miel de chancaca, caserito!', '¡Pruebe, pruebe, no sea tímido!'],
    ultimo: '¡Último picarón, casero!', muere: '¡Se me acabó la masa…!',
    tutToast: '¡Abejas! Pégales, corre o métete al agua', fueToast: 'La picaronera se fue para la Calle de las Pizzas…',
    firstHitToast: '¡Dale nomás, que la carretilla no la salva!', fryToast: '¡Está friendo! Ahora le duele más: dale con todo',
    chargeToast: '¡Va a embestir! Hazte a un lado (y que choque con algo)', crashToast: '¡Chocó! Aturdida 2 s: dale, que le duele el doble',
    llegoToast: '¡La picaronera llegó empujando su carretilla!', titToast: '¡Titina se las lleva!', waterToast: 'Las abejas perdieron el rastro…', mielToast: '¡Pegajoso! La miel no te deja correr'
  };

  /* ---------------- Utilidades ---------------- */
  function T() { return (ACH.world && ACH.world.T) || 16; }
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sfx(name, data) { var A = ACH.audio; if (A && typeof A.emit === 'function') { try { A.emit(name, data); } catch (e) { /* nada */ } } }
  function sfxStop(name) { var A = ACH.audio; if (A && typeof A.stop === 'function') { try { A.stop(name); } catch (e) { /* nada */ } } }
  function loopOf(name, data) { var A = ACH.audio; if (A && typeof A.loop === 'function') { try { return A.loop(name, data); } catch (e) { return null; } } return null; }
  function stinger(name) { var m = ACH.audio && ACH.audio.music; if (m && typeof m.stinger === 'function') { try { m.stinger(name); } catch (e) { /* nada */ } } }
  var bossOn = false;
  function setBoss(on) {
    on = !!on; if (on === bossOn) return; bossOn = on;
    var A = ACH.audio, m = A && A.music, e = A && A.musicEngine;
    try {
      if (m && typeof m.setBoss === 'function') m.setBoss(on);
      else if (e && typeof e.setBoss === 'function') e.setBoss(on);
    } catch (er) { /* nada */ }
  }
  function toast(s) { if (ACH.hud && typeof ACH.hud.toast === 'function') ACH.hud.toast(s); }
  var bubble = null;   // globo propio solo si no hay ACH.audio.say
  function voz(id, text, x, y) {
    var A = ACH.audio;
    if (A && typeof A.say === 'function') {
      try {
        var ph = A.phrases;
        if (ph && ph[id]) A.say(id, { who: ph[id].who || 'senora', x: x, y: y - 34, always: true });
        else A.say(text, { who: 'senora', x: x, y: y - 34, force: true });
        return;
      } catch (e) { /* cae al globo */ }
    }
    bubble = { s: text, t: 0 };
  }
  var dmgSrc = {};   // arreglos v0.11: daño recibido por fuente (ACH.debug.v011.jefaDmg())
  // v0.13 (D3): el pañuelo del kit anti-abejas reduce la picadura (ACH.mira.kit lo publica extras.js)
  function stingMul() { var Kt = ACH.mira && ACH.mira.kit; return Kt && typeof Kt.stingMul === 'function' ? Kt.stingMul() : 1; }
  function repelled() { var Kt = ACH.mira && ACH.mira.kit; return !!(Kt && typeof Kt.repelT === 'function' && Kt.repelT() > 0); }
  function hurtPlayer(G, dmg, src, from, extra) { var p0 = G.player.hp; if (src === 'abejas') dmg *= stingMul(); hurtPlayerRaw(G, dmg, src, from, extra); var lost = p0 - G.player.hp; if (lost > 0) dmgSrc[src || 'otro'] = (dmgSrc[src || 'otro'] || 0) + lost; }
  // v0.13 (F6): from = de dónde viene el golpe (el Vals del Escudo lo bloquea si queda al frente); ignoreAir = como antes, pega aunque salte
  // extra (D2): opciones que se suman (push, stun, ignoreAir: false para que se pueda esquivar saltando)
  function hurtPlayerRaw(G, dmg, src, from, extra) {
    if (ACH.ent && typeof ACH.ent.hurtPlayer === 'function') {
      var o = { src: 'jefa.' + (src || 'otro'), ignoreAir: true, from: from || { x: J.x, y: J.y } };
      if (extra) for (var k in extra) o[k] = extra[k];
      ACH.ent.hurtPlayer(G, dmg, o);
    } else G.player.hp = Math.max(0, G.player.hp - dmg);
  }
  // v0.13 (F6): el enjambre se pega encima de Alexander: el golpe viene de donde venía volando (contra su velocidad); quieto, de la jefa
  function beeFrom(s, p) {
    var dx = s.x - p.x, dy = s.y - p.y;
    if (dx * dx + dy * dy > 16) return { x: s.x, y: s.y };
    var vl = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
    if (vl > 2) return { x: p.x - s.vx / vl * 12, y: p.y - s.vy / vl * 12 };
    return { x: J.x, y: J.y };
  }
  function CFGE() { return (ACH.ent && ACH.ent.CFG) || { walk: 80, run: 135, radius: 5 }; }

  /* ---------------- Puntos del mapa ---------------- */
  function ptFrom(p, defC, defR) {
    var t = T(), W = ACH.world || {};
    if (p) {
      if (typeof p.c === 'number' && typeof p.r === 'number') return { x: p.c * t, y: p.r * t };
      if (typeof p.x === 'number' && typeof p.y === 'number') {
        if (W.COLS && p.x <= W.COLS && p.y <= (W.ROWS || 1e9)) return { x: p.x * t, y: p.y * t };   // vino en tiles
        return { x: p.x, y: p.y };
      }
    }
    return { x: defC * t, y: defR * t };
  }
  function puntos() { var M = ACH.world && ACH.world.mira; return (M && M.puntos) || null; }
  function places() { return (ACH.world && ACH.world.places) || null; }
  function rotC() {
    var W = ACH.world || {}, P = puntos(), L = places();
    if (L && L.rotondaC) return ptFrom(L.rotondaC, 57.5, 35.5);
    if (W.rotonda && typeof W.rotonda.c === 'number') return ptFrom(W.rotonda, 57.5, 35.5);
    return ptFrom(P && P.rotonda, 57.5, 35.5);
  }
  // Se para 8 px al sur de la entrada (delante del arco en el orden por y: el letrero no la tapa); puntos.jefa manda tal cual.
  function jefaPt() {
    var P = puntos(), L = places(), pt = ptFrom((P && (P.jefa || P.pizzasEntrada)) || (L && L.pizzasEntrada), 101, 60.5);
    if (!(P && P.jefa)) pt.y += 8;
    return pt;
  }
  function rotSit() { var c = rotC(), t = T(); return { x: c.x + 2.4 * t, y: c.y - 1.5 * t }; }   // en la grada NE
  function barrier() {   // cordel con baldes de masa: 4 tiles de ancho, detrás de ella (boca de la calle)
    var j = jefaPt(), t = T();
    return { x0: j.x - 2 * t, x1: j.x + 2 * t, y0: j.y + 22, y1: j.y + 30 };
  }

  /* ---------------- Agua de las piletas ---------------- */
  // mundo.js: ACH.world.inWater(x, y) → pileta o null (y ACH.world.water[]). Si no está: ACH.world.mira.agua o los props de pileta.
  var wCache = { n: -1, list: [] };
  function waters() {
    var W = ACH.world; if (!W) return wCache.list;
    if (Array.isArray(W.water) && W.water.length) return W.water;
    var M = W.mira;
    if (M && Array.isArray(M.agua) && M.agua.length) return M.agua;
    var props = W.props || [];
    if (wCache.n === props.length) return wCache.list;
    var out = [];
    for (var i = 0; i < props.length; i++) {
      var pr = props[i];
      if (!pr || (pr.k !== 'piletaOvalo' && pr.k !== 'piletaChica')) continue;
      var w = typeof pr.water === 'object' ? pr.water : null;
      if (!w) {   // el sprite puede traer `water`
        var spr = null;
        try { spr = ACH.gfx && ACH.gfx.prop ? ACH.gfx.prop(pr.k, pr.v, pr.dir, pr.fb) : null; } catch (e) { spr = null; }
        w = spr && spr.water;
      }
      if (w && typeof w.r === 'number') out.push({ x: pr.x + (w.x || 0), y: pr.y + (w.y || 0), r: w.r });
      else out.push({ x: pr.x, y: pr.y - (pr.fh || 0) / 2, r: Math.max(22, (pr.fw || 0) / 2) });
    }
    wCache = { n: props.length, list: out };
    return out;
  }
  function inWater(x, y) {
    var W = ACH.world;
    if (W && typeof W.inWater === 'function') { try { return !!W.inWater(x, y); } catch (e) { /* cae a la lista */ } }
    var L = waters();
    for (var i = 0; i < L.length; i++) if (dist(x, y, L[i].x, L[i].y) < L[i].r + 4) return true;
    return false;
  }

  /* ---------------- Estado ---------------- */
  var J = ACH.mira.jefa = {
    dead: false, state: 'rotonda', hp: K.hp, hpMax: K.hp, phase: 1, x: 0, y: 0, face: -Math.PI / 2, frying: false,
    t: 0, anim: 0, rotoDone: false, fightT: 0, spawnT: 0, throwT: 0, fryNext: 0, fryLeft: 0, splashT: 0, splashCD: 0,
    hurtT: 0, yellT: 0, poseT: 0, pose: '', pregonT: 0, ph3Yelled: false, firstHit: false, firstFry: false, deadAt: 0,
    charge: null, stunT: 0, stunMul: 1, chargeNext: 0, dlgSeen: false, nightOn: false, afterDone: false, charges: 0, crashes: 0,
    solidAt: solidAt, info: info
  };
  var S = [];       // enjambres
  var P = [];       // charcos de miel
  var F = [];       // picarones en vuelo
  var parts = [];   // partículas propias (abejas que caen, aceite, miel, polvo)
  var texts = [];   // textos flotantes (CLANC, PIC)
  var flags = { tit: false, water: false, miel: false };
  var lastQT = 0, lastStingAt = -1e9, fryLoop = null, selfIgnore = false, barHideAt = -1;

  function place(pt) { J.x = pt.x; J.y = pt.y; syncSolids(); }
  function resetJefa() {
    J.dead = false; J.state = 'rotonda'; J.hp = J.hpMax = K.hp; J.phase = 1; J.face = Math.PI; J.frying = false;
    J.t = 0; J.rotoDone = false; J.fightT = 0; J.spawnT = 0; J.throwT = 0; J.fryNext = 0; J.fryLeft = 0; J.splashT = 0; J.splashCD = 0;
    J.hurtT = 0; J.yellT = 0; J.poseT = 0; J.pose = ''; J.pregonT = 3; J.ph3Yelled = false; J.firstHit = false; J.firstFry = false; J.hits = 0;
    J.charge = null; J.stunT = 0; J.stunMul = 1; J.chargeNext = 0; J.dlgSeen = false; J.nightOn = false; J.afterDone = false; J.charges = 0; J.crashes = 0;
    place(rotSit());
  }
  // v0.13 T2: CONTINUAR con la jefa ya vencida (bandera miraflores.jefa): queda muerta en la boca de la calle, sin pelea, sin cordel y con la salida abierta
  function deadFromSave() {
    J.hp = 0; J.dead = true; J.state = 'muerta'; J.t = 5; J.phase = 3; J.rotoDone = true; J.afterDone = true; J.dlgSeen = true;
    place(jefaPt()); syncSolids(); showBar(false);
  }
  function toPizzas() {
    J.state = 'espera'; J.t = 0; J.face = -Math.PI / 2; J.frying = false; J.fryLeft = 0; J.fryWarnT = 0; J.poseT = 0; J.yellT = 0;
    place(jefaPt());
  }
  function clearField() {
    for (var i = 0; i < S.length; i++) stopSwarmLoop(S[i]);
    S.length = 0; P.length = 0; F.length = 0; parts.length = 0; texts.length = 0; bubble = null;
    stopFry();
  }
  function stopFry() { if (fryLoop && fryLoop.stop) { try { fryLoop.stop(); } catch (e) { /* nada */ } } fryLoop = null; sfxStop('boss.fry'); }

  /* ---------------- Sólidos ----------------
     Tres rectángulos que se publican en ACH.world.dynSolids (mundo.js los respeta en collideCircle/los y routeCheck ignora los que llevan
     jefa: true): el cordel (siempre que viva), el cuerpo y la carretilla (en 'espera' y 'pelea'; la carretilla gira con ella).
     solidAt(x, y, r) responde lo mismo para un mundo que no tenga dynSolids. */
  function cartPos(face) { var f = face === undefined ? J.face : face; return { x: J.x + Math.cos(f) * K.cartOff, y: J.y + Math.sin(f) * K.cartOff }; }
  function circleRect(x, y, r, x0, y0, x1, y1) {
    var cx = clamp(x, x0, x1), cy = clamp(y, y0, y1), dx = x - cx, dy = y - cy;
    return dx * dx + dy * dy < r * r;
  }
  function bodySolid() { return J.state === 'espera' || J.state === 'pelea'; }
  var RS = [{ id: 'jefa.cordel', jefa: true, off: false, x0: 0, y0: 0, x1: 0, y1: 0 },
            { id: 'jefa.cuerpo', jefa: true, off: true, x0: 0, y0: 0, x1: 0, y1: 0 },
            { id: 'jefa.carretilla', jefa: true, off: true, x0: 0, y0: 0, x1: 0, y1: 0 }];
  function setR(r, x0, y0, x1, y1, off) { r.x0 = x0; r.y0 = y0; r.x1 = x1; r.y1 = y1; r.off = !!off; }
  function syncSolids() {
    var b = barrier(), on = bodySolid() && !J.dead, c = cartPos(), h = K.cartR - 1;
    setR(RS[0], b.x0, b.y0, b.x1, b.y1, J.dead);
    setR(RS[1], J.x - K.bodyR + 1, J.y - K.bodyR + 1, J.x + K.bodyR - 1, J.y + 3, !on);
    setR(RS[2], c.x - h, c.y - h, c.x + h, c.y + h, !on);
    var W = ACH.world, L = W && W.dynSolids;
    if (Array.isArray(L)) for (var i = 0; i < RS.length; i++) if (L.indexOf(RS[i]) < 0) L.push(RS[i]);
  }
  function solidAt(x, y, r) {
    if (J.dead || selfIgnore) return false;
    r = r || 0;
    for (var i = 0; i < RS.length; i++) { var q = RS[i]; if (!q.off && circleRect(x, y, r, q.x0, q.y0, q.x1, q.y1)) return true; }
    return false;
  }
  function worldFree(x, y, r) {   // ¿libre sin contar lo nuestro?
    var W = ACH.world; if (!W || typeof W.collideCircle !== 'function') return true;
    var was = [RS[0].off, RS[1].off, RS[2].off];
    selfIgnore = true; RS[0].off = RS[1].off = RS[2].off = true;
    try { return !W.collideCircle(x, y, r); } finally { selfIgnore = false; RS[0].off = was[0]; RS[1].off = was[1]; RS[2].off = was[2]; }
  }
  // Si algo de lo nuestro quedó encima de Alexander (giro de la carretilla, teletransporte), lo empujamos afuera.
  function pushOut(G) {
    var p = G.player; if (!p || J.dead) return true;
    var pr = CFGE().radius || 5, ok = true;
    for (var i = 0; i < RS.length; i++) {
      var R = RS[i];
      if (R.off || !circleRect(p.x, p.y, pr, R.x0, R.y0, R.x1, R.y1)) continue;
      var cx = clamp(p.x, R.x0, R.x1), cy = clamp(p.y, R.y0, R.y1), dx = p.x - cx, dy = p.y - cy, d = Math.sqrt(dx * dx + dy * dy), tx = p.x, ty = p.y;
      if (d > 0.01) { tx = cx + dx / d * (pr + 0.2); ty = cy + dy / d * (pr + 0.2); }
      else {   // el centro quedó adentro: sale por el lado más cercano
        var l = p.x - R.x0, rr = R.x1 - p.x, u = p.y - R.y0, dn = R.y1 - p.y, m = Math.min(l, rr, u, dn);
        if (m === u) ty = R.y0 - pr - 0.2; else if (m === dn) ty = R.y1 + pr + 0.2; else if (m === l) tx = R.x0 - pr - 0.2; else tx = R.x1 + pr + 0.2;
      }
      if (worldFree(tx, ty, pr)) { p.x = tx; p.y = ty; } else ok = false;
    }
    return ok;
  }
  // Gira hacia `target` a `rate` rad/s; la carretilla empuja a Alexander, pero si lo aplastaría contra una pared no gira.
  function turnTo(G, target, rate, dt) {
    var d = wrap(target - J.face), st = rate * dt;
    if (Math.abs(d) < 0.001) return;
    var old = J.face, px0 = G.player.x, py0 = G.player.y;
    J.face = wrap(J.face + (Math.abs(d) <= st ? d : (d > 0 ? st : -st)));
    syncSolids();
    if (!pushOut(G)) { J.face = old; G.player.x = px0; G.player.y = py0; syncSolids(); }
  }

  /* ---------------- Enjambres ---------------- */
  function beeSpeed() { var C = CFGE(); return C.walk + (C.run - C.walk) * K.speedK; }
  function makeSwarm(x, y, tut) {
    var nb = Math.round(rand(K.beeMin, K.beeMax + 0.99)), bees = [];
    for (var i = 0; i < nb; i++) bees.push({ ph: rand(0, 6.283), sp: rand(3, 6.5) * (Math.random() < 0.5 ? -1 : 1), r: rand(3, 9), z: rand(9, 15), jx: rand(0, 6.283) });
    var s = { x: x, y: y, vx: 0, vy: -10, hp: tut ? K.tutHp : K.swarmHp, hpMax: tut ? K.tutHp : K.swarmHp, age: 0, life: tut ? K.tutLife : K.swarmLife,
      state: 'gather', mode: 'gather', t: 0, nb: nb, bees: bees, stingT: K.stingFirst, farT: 0, lostT: 0, lx: x, ly: y,
      eatT: 0, eatP: null, ate: [], distractT: 0, titT: 0, tut: !!tut, loop: null, hitT: 0, catT: 0, catCD: 0 };
    S.push(s);
    sfx('bees.spawn', { x: x, y: y });
    return s;
  }
  function liveSwarms(includeTut) { var n = 0; for (var i = 0; i < S.length; i++) if (S[i].state !== 'disperse' && (includeTut || !S[i].tut)) n++; return n; }
  function stopSwarmLoop(s) { if (s.loop && s.loop.stop) { try { s.loop.stop(); } catch (e) { /* nada */ } } s.loop = null; }
  function disperse(s) {
    if (s.state === 'disperse') return;
    s.state = 'disperse'; s.mode = 'disperse'; s.t = 0; stopSwarmLoop(s);
  }
  function beesShown(s) { return Math.max(2, Math.round(s.nb * Math.max(0, s.hp) / s.hpMax)); }
  function damageSwarm(G, s, dmg, fromX, fromY, kind) {
    if (s.state === 'disperse' || dmg <= 0) return false;
    var before = beesShown(s);
    s.hp -= dmg; s.hitT = 0.12;
    // se sacude: empujón lejos del golpe
    var d = dist(fromX, fromY, s.x, s.y) || 1;
    s.vx += (s.x - fromX) / d * 70; s.vy += (s.y - fromY) / d * 70;
    var after = s.hp > 0 ? beesShown(s) : 0;
    for (var i = 0; i < Math.max(1, before - after); i++) {   // abejas que caen
      parts.push({ x: s.x + rand(-6, 6), y: s.y, z: rand(8, 14), vx: rand(-25, 25), vy: rand(-10, 10), vz: rand(10, 30), t: 0, life: rand(0.45, 0.7), c: i % 2 ? '#ffd21f' : '#1a1410', w: 2, h: 1, g: 160 });
    }
    if (kind === 'bubble') parts.push({ x: s.x, y: s.y, z: 12, vx: rand(-6, 6), vy: 0, vz: 18, t: 0, life: 1.4, bubble: true, g: -4 });
    if (s.hp <= 0) {
      s.hp = 0;
      sfx('bees.die', { x: s.x, y: s.y });
      for (var k = 0; k < 6; k++) parts.push({ x: s.x + rand(-8, 8), y: s.y, z: rand(8, 16), vx: rand(-30, 30), vy: rand(-12, 12), vz: rand(0, 25), t: 0, life: rand(0.5, 0.8), c: k % 2 ? '#ffd21f' : '#1a1410', w: 2, h: 1, g: 160 });
      disperse(s); s.killed = true;
    } else sfx('bees.hit', { x: s.x, y: s.y, hp: s.hp });
    return true;
  }
  function titinaFlying(G) { var t = G.titina; return t && t.state === 'volando'; }
  function launchTitina(G) {
    var p = G.player, t = G.titina; if (!t || !p || !p.bird) return false;
    if (ACH.ent && typeof ACH.ent.launchTitina === 'function') { ACH.ent.launchTitina(G); return true; }
    // mismo efecto que entities.launchTitina (no se exporta), sin cortar la vista de paloma
    p.bird = false; t.state = 'volando'; t.t = 0; t.x = p.x + 3; t.y = p.y - 1; t.z = 16; t.ang = Math.random() * Math.PI * 2;
    sfx('titina.launch', { x: t.x, y: t.y });
    return true;
  }
  function companionCat() { var g = ACH.mira && ACH.mira.gatos; return g && typeof g.companion === 'function' ? g.companion() : null; }
  function flagCat(c) { var g = ACH.mira && ACH.mira.gatos; if (g && typeof g.distracted === 'function') g.distracted(c); }
  function catsBuf(G, s) {
    var cats = G.cats; if (!cats || !cats.length) return;
    for (var i = 0; i < cats.length; i++) {
      var c = cats[i];
      if (c.state === 'hide' || c.state === 'run') continue;
      if ((c._abejaCD || 0) > G.time) continue;
      if (Math.abs(c.x - s.x) > K.catR || dist(c.x, c.y, s.x, s.y) > K.catR) continue;
      c._abejaCD = G.time + K.catCD;
      var hissed = false;
      if (ACH.inter && typeof ACH.inter.hitAnimals === 'function') { try { hissed = ACH.inter.hitAnimals(G, c.x, c.y, 1.5, 'bees', null) > 0; } catch (e) { hissed = false; } }
      if (!hissed) sfx('cat.hiss', { x: c.x, y: c.y });
      addText('¡FFF!', c.x, c.y - 14, '#ffffff');
      s.distractT = K.catDistract;
      damageSwarm(G, s, K.catDmg, c.x, c.y, 'cat');
      return;
    }
  }
  function updateSwarms(G, dt) {
    var p = G.player, pin = inWater(p.x, p.y), invis = p.invisT > 0 || repelled(), W = ACH.world, spd0 = beeSpeed(), i, s;
    var cc = companionCat();   // v0.13 (D4)
    // Q: el enjambre más cercano sigue a Titina 4 s
    var qRise = G.qT > lastQT + 0.5; lastQT = G.qT;
    if (qRise) {
      var best = null, bd = K.titR;
      for (i = 0; i < S.length; i++) { s = S[i]; if (s.state === 'disperse') continue; var dq = dist(s.x, s.y, p.x, p.y); if (dq < bd) { bd = dq; best = s; } }
      if (best && (titinaFlying(G) || launchTitina(G))) { best.titT = K.titT; if (!flags.tit) { flags.tit = true; toast(TXT.titToast); } }
    }
    for (i = S.length - 1; i >= 0; i--) {
      s = S[i];
      s.age += dt; s.t += dt; if (s.hitT > 0) s.hitT -= dt;
      if (s.state === 'disperse') {
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.t >= K.disperseT) S.splice(i, 1);
        continue;
      }
      if (s.state === 'gather' && s.t >= K.gatherT) { s.state = 'live'; }
      if (s.age >= s.life) { disperse(s); continue; }
      var tx = s.x, ty = s.y, spd = spd0 * (s.age > K.tiredAt ? K.tiredMul : 1), mode;
      var dp = dist(s.x, s.y, p.x, p.y);
      if (s.catCD > 0) s.catCD -= dt;
      if (cc && s.state !== 'gather' && s.catT <= 0 && s.catCD <= 0 && dist(s.x, s.y, cc.x, cc.y) < K.catSeek) { s.catT = K.catChase; s.catCD = K.catChaseCD; flagCat(cc); }
      if (s.state === 'gather') { mode = 'gather'; spd = 20; ty = s.ly - 6; tx = s.lx; }
      else if (s.eatT > 0) {
        s.eatT -= dt; mode = 'eat';
        var ea = G.clock * 4 + s.bees[0].ph; tx = s.eatP.x + Math.cos(ea) * 8; ty = s.eatP.y + Math.sin(ea) * 4; spd = 50;
      } else if (s.distractT > 0) { s.distractT -= dt; mode = 'distract'; spd = 0; }
      else if (s.titT > 0 && titinaFlying(G)) { s.titT -= dt; mode = 'titina'; tx = G.titina.x; ty = G.titina.y; spd = spd0 * 1.05; }
      else if (s.catT > 0 && cc) { s.catT -= dt; mode = 'cat'; tx = cc.x; ty = cc.y; spd = spd0 * 0.9; }
      else {
        if (pin || invis) {
          if (s.lostT <= 0 && pin && !flags.water) { flags.water = true; toast(TXT.waterToast); }
          s.lostT = K.lostT;
        } else if (s.lostT > 0) s.lostT -= dt;
        if (s.lostT > 0) {
          mode = 'lost'; var la = G.clock * 2.2 + s.bees[0].ph; tx = s.lx + Math.cos(la) * 24; ty = s.ly + Math.sin(la) * 14; spd = 55;
        } else { mode = 'chase'; tx = p.x; ty = p.y; s.lx = p.x; s.ly = p.y; }
      }
      s.mode = mode;
      // carnada: charco de miel a menos de 30 px (una vez por charco)
      if (mode === 'chase' || mode === 'lost' || mode === 'titina') {
        for (var k = 0; k < P.length; k++) {
          var pu = P[k];
          if (s.ate.indexOf(pu) >= 0 || dist(s.x, s.y, pu.x, pu.y) > K.eatR) continue;
          s.ate.push(pu); s.eatP = pu; s.eatT = K.eatT; s.titT = 0; break;
        }
        catsBuf(G, s);
        if (s.state === 'disperse') continue;
      }
      // lejos: más de 220 px durante 3 s → se van
      if (dp > K.farR) { s.farT += dt; if (s.farT >= K.farT) { disperse(s); continue; } } else s.farT = 0;
      // movimiento con inercia (aceleración limitada): se pasan de largo y frenan
      var dx = tx - s.x, dy = ty - s.y, dd = Math.sqrt(dx * dx + dy * dy), wantX = 0, wantY = 0;
      if (dd > 0.5 && spd > 0) { var arr = Math.min(1, dd / 10); wantX = dx / dd * spd * arr; wantY = dy / dd * spd * arr; }
      var ax = wantX - s.vx, ay = wantY - s.vy, al = Math.sqrt(ax * ax + ay * ay), amax = K.accel * dt * (mode === 'distract' ? 1.5 : 1);
      if (al > amax) { ax = ax / al * amax; ay = ay / al * amax; }
      s.vx += ax; s.vy += ay;
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (W) { s.x = clamp(s.x, 4, (W.W || 1e6) - 4); s.y = clamp(s.y, 4, (W.H || 1e6) - 4); }
      // picadura: 5 cada 0,5 s mientras toca (no en el agua ni invisible)
      if (mode === 'chase' && p.hp > 0 && !pin && !invis && dist(s.x, s.y, p.x, p.y) < K.contactR) {
        s.stingT -= dt;
        if (s.stingT <= 0) {
          s.stingT = K.stingEvery;
          if (G.time - lastStingAt >= K.stingGate) {
            lastStingAt = G.time;
            hurtPlayer(G, K.stingDmg, 'abejas', beeFrom(s, p));
            sfx('bees.sting', { x: p.x, y: p.y });
            if (Math.random() < 0.5) addText('¡PIC!', p.x + rand(-4, 4), p.y - 26, '#ffd21f');
          }
        }
      } else s.stingT = K.stingFirst;
      // zumbido posicional
      if (!s.loop) s.loop = loopOf('bees.loop', { x: s.x, y: s.y, n: beesShown(s) });
      else if (s.loop.move) { try { s.loop.move(s.x, s.y, { n: beesShown(s) }); } catch (e) { /* nada */ } }
    }
  }

  /* ---------------- Picarones y charcos ---------------- */
  function throwPicaron(G) {
    var p = G.player, sx = J.x, sy = J.y - 22, tx = p.x + rand(-6, 6), ty = p.y + rand(-4, 4);
    F.push({ x0: sx, y0: sy, x1: tx, y1: ty, t: 0, dur: K.throwFlight, h: 26 + dist(sx, sy, tx, ty) * 0.12, spin: rand(0, 6) });
    J.poseT = 0.5; J.pose = 'lanza';
    sfx('boss.throw', { x: sx, y: sy });
  }
  function updateFlying(G, dt) {
    var p = G.player;
    for (var i = F.length - 1; i >= 0; i--) {
      var f = F[i]; f.t += dt;
      if (f.t < f.dur) continue;
      F.splice(i, 1);
      if (p.hp > 0 && dist(p.x, p.y, f.x1, f.y1) < K.throwHitR) { hurtPlayer(G, K.throwDmg, 'picaron', { x: f.x0, y: f.y0 }); addText('¡PLOF!', p.x, p.y - 26, '#ffb347'); }
      P.push({ x: f.x1, y: f.y1, t: 0, life: K.puddleLife, v: Math.floor(Math.random() * 3) });
      if (P.length > 8) P.shift();
      sfx('miel.splat', { x: f.x1, y: f.y1 });
      for (var k = 0; k < 6; k++) parts.push({ x: f.x1, y: f.y1, z: 2, vx: rand(-40, 40), vy: rand(-18, 18), vz: rand(20, 50), t: 0, life: rand(0.3, 0.5), c: k % 2 ? '#d98b1f' : '#f2b84a', w: 1, h: 1, g: 220 });
    }
    for (var j = P.length - 1; j >= 0; j--) { P[j].t += dt; if (P[j].t >= P[j].life) P.splice(j, 1); }
  }
  function inPuddle(x, y) {
    for (var i = 0; i < P.length; i++) { var q = P[i]; var dx = (x - q.x) / K.puddleR, dy = (y - q.y) / (K.puddleR * 0.6); if (dx * dx + dy * dy < 1) return true; }
    return false;
  }

  /* ---------------- La jefa ---------------- */
  function phaseOf() { var r = J.hp / J.hpMax; return r < K.ph3 ? 3 : r < K.ph2 ? 2 : 1; }
  function pregon() { var a = TXT.pregon; voz('jefaPregon', a[Math.floor(Math.random() * a.length)], J.x, J.y); J.yellT = 1.2; sfx('boss.yell', { x: J.x, y: J.y }); }
  function startTutorial(G) {
    J.rotoDone = true; J.state = 'tutorial'; J.t = 0;
    pregon();
    makeSwarm(J.x, J.y - 6, true);
    toast(TXT.tutToast);
  }
  function startFight(G) {
    J.state = 'pelea'; J.t = 0; J.fightT = 0; J.spawnT = 1.2; J.throwT = 4; J.fryNext = K.fryEvery; J.fryLeft = 0; J.fryWarnT = 0; J.frying = false; J.splashT = 0; J.splashCD = 0;
    J.phase = phaseOf(); J.ph3Yelled = J.phase >= 3;
    J.charge = null; J.stunT = 0; J.stunMul = 1; J.chargeNext = KC.first[J.phase] || 6;
    showBar(true); syncBar(true);
    stinger('boss.intro'); setBoss(true);
    pregon();
  }
  function die(G) {
    if (J.dead) return;
    J.hp = 0; J.dead = true; J.state = 'muriendo'; J.t = 0; J.frying = false; J.fryLeft = 0; J.fryWarnT = 0; stopFry(); syncSolids();
    J.charge = null; J.stunT = 0; J.stunMul = 1;
    J.deadAt = G ? G.time : 0;
    if (ACH.mira && ACH.mira.flag) ACH.mira.flag('jefa', true);   // v0.13 T2: CONTINUAR no la repite
    voz('jefaMuere', TXT.muere, J.x, J.y);
    for (var i = 0; i < S.length; i++) { var s = S[i]; if (s.state !== 'disperse') { var a = Math.atan2(s.y - J.y, s.x - J.x); s.vx = Math.cos(a) * 90; s.vy = Math.sin(a) * 90; disperse(s); } }
    F.length = 0;
    // botín: 4 picarones y 5 sencillo (solo lo que el inventario conoce)
    var iv = ACH.inv;
    if (iv && typeof iv.drop === 'function') {
      var items = [], defs = iv.defs || null;
      if (!defs || defs.picarones) items.push({ id: 'picarones', n: 4 });
      if (!defs || defs.sencillo) items.push({ id: 'sencillo', n: 5 });
      try { iv.drop(J.x, J.y + 6, items, true); } catch (e) { try { iv.drop(J.x, J.y + 6, [{ id: 'sencillo', n: 5 }], true); } catch (e2) { /* nada */ } }
    }
    for (var k = 0; k < 8; k++) parts.push({ x: J.x + rand(-10, 10), y: J.y, z: 1, vx: rand(-20, 20), vy: rand(-6, 6), vz: rand(5, 20), t: 0, life: rand(0.4, 0.7), c: '#a8a59a', w: 2, h: 2, g: 60 });
    stinger('boss.down'); sfx('boss.down', { x: J.x, y: J.y }); setBoss(false);
    syncBar(true); barHideAt = 1.6;
    showPoster();
    if (G && ACH.fx && typeof ACH.fx.hitstop === 'function') ACH.fx.hitstop(G, 0.12);
  }
  // v0.13 (D2): al morir suelta la pista concreta de la cura (diario cura-3) y la pieza del concierto (el micrófono)
  function afterDeath(G) {
    var N = ACH.mira;
    if (J.afterDone) return;
    J.afterDone = true;
    try { if (ACH.game && typeof ACH.game.autoSave === 'function') ACH.game.autoSave(); } catch (eS) { /* nada */ }   // v0.13 T2: guarda ya la bandera miraflores.jefa (CONTINUAR no repite la pelea)
    function premio() {
      if (N) {
        N.diario('cura-3', 'LA CURA SE FUE A LA COSTA', 'Doña Chancaca, entre quejidos: «El laboratorio se mudó a la costa, a Larcomar… o más abajo.» Hay que bajar por la Calle de las Pizzas hasta el malecón.');
        N.concierto('microfono');
      }
    }
    if (!N || typeof N.talk !== 'function') { premio(); return; }
    var c = function (t, k) { return N.line('chancaca', t, k || null, 'DOÑA CHANCACA'); };
    N.talk([
      c('Ay, mi masa… mi carretilla… me has dejado sin esquina, joven.', 'triste'),
      N.line('alexander', 'Doña, ¿usted sabe quién anda repartiendo la cura? Dicen que salió de por aquí.', 'serio'),
      c('Ese laboratorio se mudó a la costa. A Larcomar… o más abajo. Yo solo vendo picarones, criatura.'),
      c('Ah, y llévate el micrófono de mi hijo, el que cantaba en las peñas. Ya no lo va a necesitar.', 'feliz'),
      N.line('alexander', 'Larcomar, entonces. Gracias por los picarones, doña. Los de miel estaban ricos.', 'picaro')], premio);
  }
  // v0.11 (V011.md §2.3): nunca es inmune en la pelea; mientras fríe el daño va ×1.5. Devuelve el daño aplicado.
  function hitJefa(G, dmg, fromX, fromY) {
    if (J.dead || !(dmg > 0)) return 0;
    if (J.stunT > 0) { dmg *= J.stunMul; if (J.stunMul >= 2 && Math.random() < 0.5) addText('¡x2!', J.x + rand(-8, 8), J.y - 30, '#ffe500'); }   // v0.13 (D2): aturdida
    else if (J.frying) dmg *= K.fryMul;
    J.hp = Math.max(0, J.hp - dmg); J.hurtT = 0.2; J.hits = (J.hits || 0) + 1;
    if (!J.firstHit) { J.firstHit = true; toast(TXT.firstHitToast); }
    sfx('boss.hurt', { x: J.x, y: J.y, hp: J.hp });
    var d = dist(fromX, fromY, J.x, J.y) || 1, nx = (J.x - fromX) / d, ny = (J.y - fromY) / d;
    if (ACH.fx && typeof ACH.fx.hit === 'function') { try { ACH.fx.hit(G, J, nx, ny, J.hp <= 0, true); } catch (e) { /* nada */ } }
    syncBar(true); flashBar();
    if (J.hp <= 0) die(G);
    return dmg;
  }
  // v0.11: ¿se le puede pegar ahora? En la pelea siempre; si espera en la boca de la calle, un golpe (o un tiro de lejos) arranca la pelea.
  function hittable(G) {
    if (J.dead) return false;
    if (J.state === 'pelea') return true;
    if (J.state === 'espera') return beginFight(G);
    return false;
  }

  // v0.13 (D2): antes de la primera pelea, diálogo con el juego congelado (Alexander con retrato; ella, con su nombre). Devuelve true si la pelea ya empezó.
  function introLines() {
    var N = ACH.mira, c = function (t, k) { return N.line('chancaca', t, k || null, 'DOÑA CHANCACA'); };
    return [
      N.line('alexander', 'Disculpe, señora: necesito pasar por la Calle de las Pizzas.', 'serio'),
      c('¿Pasar? ¡Ja! Mi masa es receta de mi abuela, joven, y esta esquina es mía desde antes del fin del mundo.', 'molesta'),
      N.line('alexander', '¿Y esas abejas, doña? Se ven… entusiastas.', 'sorpresa'),
      c('Son mis socias. Cobran en miel, no faltan nunca y pican parejo. ¡A trabajar, mis amores!', 'risa'),
      N.line('titina', 'Grrú.', 'molesta'),
      N.line('alexander', 'Bueno, Titina. A pelear con una picaronera. Mi mamá no me lo creería.', 'picaro')];
  }
  function beginFight(G) {
    var N = ACH.mira;
    if (J.dlgSeen || !N || typeof N.talk !== 'function') { startFight(G); return true; }
    J.dlgSeen = true; J.state = 'dialogo'; J.t = 0; J.face = Math.atan2(G.player.y - J.y, G.player.x - J.x);
    N.talk(introLines(), function () { if (!J.dead) startFight(G); });
    return false;
  }

  /* ---------------- v0.13 (D2): la embestida ---------------- */
  function cartAt(x, y, f) { return { x: x + Math.cos(f) * K.cartOff, y: y + Math.sin(f) * K.cartOff }; }
  // ¿puede estar su cuerpo en (x, y), con la carretilla al frente (f)? El cordel de la boca de la calle cuenta como pared.
  function chargeClear(x, y, f) {
    var c = cartAt(x, y, f), b = RS[0];
    if (!b.off && circleRect(c.x, c.y, K.cartR - 1, b.x0, b.y0, b.x1, b.y1)) return false;
    return worldFree(c.x, c.y, K.cartR - 2) && worldFree(x, y, K.bodyR - 2);
  }
  // 0 = libre · 1 = tropieza con algo chico o con una pared (basurero, macetero, toldo, árbol…: se frena sin más) · 2 = CHOQUE (auto o cordel: queda aturdida)
  var BIG = /^(car|tico|custer|combi|mototaxi)/i;
  function chargeBlock(x, y, f) {
    var c = cartAt(x, y, f), b = RS[0], W = ACH.world, i, p, r = K.cartR - 2;
    if (!b.off && circleRect(c.x, c.y, K.cartR - 1, b.x0, b.y0, b.x1, b.y1)) return 2;
    if (W && typeof W.isSolidTile === 'function') {
      var T0 = T(), c0 = Math.floor((c.x - r) / T0), c1 = Math.floor((c.x + r) / T0), r0 = Math.floor((c.y - r) / T0), r1 = Math.floor((c.y + r) / T0);
      for (var rr = r0; rr <= r1; rr++) for (var cc2 = c0; cc2 <= c1; cc2++) if (W.isSolidTile(cc2, rr) && circleRect(c.x, c.y, r, cc2 * T0, rr * T0, cc2 * T0 + T0, rr * T0 + T0)) return 1;   // pared: solo tropieza
    }
    var props = W && W.props;
    if (props) for (i = 0; i < props.length; i++) { p = props[i]; if (p.fw > 0 && p.fh > 0 && BIG.test(p.k) && (circleRect(c.x, c.y, r, p.x0, p.y0, p.x1, p.y1) || circleRect(x, y, K.bodyR - 2, p.x0, p.y0, p.x1, p.y1))) return 2; }
    return worldFree(c.x, c.y, r) && worldFree(x, y, K.bodyR - 2) ? 0 : 1;
  }
  function chargeLen(f) {   // hasta dónde llega en línea recta desde donde está (el aviso del piso dibuja esto)
    var n = Math.floor(KC.max / 6), L = KC.max;
    for (var i = 1; i <= n; i++) if (chargeBlock(J.x + Math.cos(f) * i * 6, J.y + Math.sin(f) * i * 6, f)) { L = (i - 1) * 6; break; }
    return L;
  }
  function chargeReady(G) {
    var p = G.player;
    if (J.charge || J.stunT > 0 || J.fryWarnT > 0 || J.frying || J.fryLeft > 0 || J.fryNext < 2.4 || J.dead || !(p.hp > 0)) return false;
    var d = dist(p.x, p.y, J.x, J.y);
    return d >= KC.minD && d <= KC.maxD;
  }
  function startCharge(G) {
    J.charge = { ph: 'warn', t: 0, locked: false, trav: 0, hit: false, len: 0 };
    J.charges++; J.yellT = KC.warn + 0.2;
    addText('¡EMBISTE!', J.x, J.y - 36, '#ff5a2e'); sfx('mira.bocina', { x: J.x, y: J.y });
    voz('jefaEmbiste', '¡Ahí va la carretilla!', J.x, J.y);
    if (!flags.charge) { flags.charge = true; toast(TXT.chargeToast); }
  }
  function endCharge() { J.chargeNext = KC.every[phaseOf()] || 9; goBack(); }
  // vuelve caminando a su puesto de la boca de la calle (así el carril de la embestida siempre sale de ahí)
  function goBack() { var h = jefaPt(); if (dist(J.x, J.y, h.x, h.y) > 8) J.charge = { ph: 'back', t: 0, trav: 0, hit: true }; else J.charge = null; }
  function crash(G) {
    var cp = cartAt(J.x, J.y, J.face), k;
    J.charge = null; J.stunT = KC.stun; J.stunMul = KC.stunMul; J.crashes++; J.chargeNext = (KC.every[phaseOf()] || 9) + KC.stun;
    J.frying = false; J.fryLeft = 0; J.fryWarnT = 0; stopFry();
    sfx('boss.block', { x: cp.x, y: cp.y }); addText('¡CLANC!', cp.x, cp.y - 22, '#ffe500'); toast(TXT.crashToast);
    for (k = 0; k < 12; k++) parts.push({ x: cp.x + Math.cos(J.face) * 8 + rand(-6, 6), y: cp.y + rand(-6, 6), z: rand(2, 14), vx: rand(-45, 45), vy: rand(-20, 20), vz: rand(10, 45), t: 0, life: rand(0.35, 0.7), c: k % 3 === 0 ? '#ffd21f' : k % 3 === 1 ? '#c8c8c8' : '#a8a59a', w: 2, h: 1, g: 180 });
    J.x -= Math.cos(J.face) * 3; J.y -= Math.sin(J.face) * 3; syncSolids();
    if (ACH.fx) { try { if (typeof ACH.fx.shake === 'function') ACH.fx.shake(2.6, 0.25); if (typeof ACH.fx.hitstop === 'function') ACH.fx.hitstop(G, 0.1); } catch (e) { /* nada */ } }
  }
  function bump(G) {   // tropezó con algo chico: se frena, descansa y vuelve (sin aturdirse)
    var cp = cartAt(J.x, J.y, J.face);
    sfx('boss.block', { x: cp.x, y: cp.y }); addText('¡TUNC!', cp.x, cp.y - 20, '#c8c8c8');
    if (J.charge) { J.charge.ph = 'recover'; J.charge.t = 0; }
  }
  function updateCharge(G, dt) {
    var c = J.charge, p = G.player;
    if (!c) return;
    c.t += dt;
    if (c.ph === 'warn') {
      if (!c.locked) {
        if (c.t < KC.lock) turnTo(G, Math.atan2(p.y - J.y, p.x - J.x), KC.aim, dt); else { c.locked = true; sfx('boss.fryWarn', { x: J.x, y: J.y }); }
      }
      if (c.t >= KC.warn) { c.ph = 'run'; c.t = 0; c.len = chargeLen(J.face); sfx('boss.cart', { x: J.x, y: J.y }); }
      return;
    }
    if (c.ph === 'run') {
      var f = J.face, cs = Math.cos(f), sn = Math.sin(f), left = KC.speed * dt;
      while (left > 0.001) {
        var st = Math.min(4, left); left -= st;
        var nx = J.x + cs * st, ny = J.y + sn * st;
        var blk = chargeBlock(nx, ny, f);
        if (blk === 2) { crash(G); return; }
        if (blk === 1) { bump(G); return; }
        J.x = nx; J.y = ny; c.trav += st; syncSolids();
        var cp = cartPos();
        if (!c.hit && p.hp > 0 && (dist(p.x, p.y, cp.x, cp.y) < KC.hitR || dist(p.x, p.y, J.x, J.y) < 11)) {
          c.hit = true;
          hurtPlayer(G, KC.dmg, 'embestida', { x: J.x - cs * 12, y: J.y - sn * 12 }, { push: { x: cs, y: sn, f: KC.push }, ignoreAir: false });
          addText('¡PAM!', p.x, p.y - 26, '#ff5a2e');
        }
        pushOut(G);
        if (c.trav >= KC.max) { c.ph = 'recover'; c.t = 0; break; }
      }
      if (Math.random() < dt * 40) parts.push({ x: J.x - cs * 10 + rand(-5, 5), y: J.y + rand(-2, 3), z: rand(1, 6), vx: -cs * rand(10, 30), vy: rand(-8, 8), vz: rand(5, 20), t: 0, life: rand(0.25, 0.5), c: '#b8b2a4', w: 2, h: 2, g: 40 });
      return;
    }
    if (c.ph === 'back') {
      var h = jefaPt(), bx = h.x - J.x, by = h.y - J.y, bd = Math.sqrt(bx * bx + by * by);
      if (bd <= 4 || c.t > 3.2) { J.charge = null; return; }
      var bs = Math.min(bd, KC.backSpeed * dt), nx2 = J.x + bx / bd * bs, ny2 = J.y + by / bd * bs;
      if (chargeClear(nx2, ny2, J.face)) { J.x = nx2; J.y = ny2; syncSolids(); pushOut(G); } else { J.charge = null; }
      return;
    }
    if (c.t >= KC.recover) endCharge();
  }
  // v0.13 (D3): aturdirla desde fuera (la campana). mul = multiplicador de daño mientras dura.
  function stunJefa(t, mul) {
    if (J.dead || J.state !== 'pelea') return false;
    J.charge = null; J.frying = false; J.fryLeft = 0; J.fryWarnT = 0; stopFry();
    J.stunT = Math.max(J.stunT, t); J.stunMul = Math.max(J.stunT > 0 && J.stunMul > 1 ? J.stunMul : 1, mul || 1);
    J.chargeNext = Math.max(J.chargeNext, 2);
    return true;
  }

  function updateJefa(G, dt) {
    var p = G.player, alive = p.hp > 0, i;
    J.anim += dt; J.t += dt;
    if (J.hurtT > 0) J.hurtT -= dt;
    if (J.yellT > 0) J.yellT -= dt;
    if (J.poseT > 0) J.poseT -= dt;
    if (barHideAt > 0) { barHideAt -= dt; if (barHideAt <= 0) { barHideAt = -1; showBar(false); } }
    // Anti-bloqueo: si Alexander ya pasó la col 88 o se acerca a la calle sin haber terminado el tutorial, ella llega a la entrada (el tutorial se salta).
    if ((J.state === 'rotonda' || J.state === 'tutorial' || J.state === 'yendo') && (p.x > K.skipCol * T() || dist(p.x, p.y, jefaPt().x, jefaPt().y) < K.skipR)) {
      for (i = 0; i < S.length; i++) if (S[i].tut) disperse(S[i]);
      toPizzas(); toast(TXT.llegoToast); sfx('boss.cart', { x: J.x, y: J.y });
    }
    switch (J.state) {
      case 'rotonda':
        place(rotSit());
        var c0 = rotC();
        if (!J.rotoDone && alive && dist(p.x, p.y, c0.x, c0.y) < K.rotTrigger) startTutorial(G);
        break;
      case 'tutorial':
        if (J.t >= K.tutLeaveAt) { J.state = 'yendo'; J.t = 0; sfx('boss.cart', { x: J.x, y: J.y }); }
        break;
      case 'yendo': {
        var tg = jefaPt(), dx = tg.x - J.x, dy = tg.y - J.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        J.x += dx / d * K.leaveSpeed * dt; J.y += dy / d * K.leaveSpeed * dt; J.face = Math.atan2(dy, dx);
        if (J.t >= K.tutVanishAt - K.tutLeaveAt) {
          for (i = 0; i < 14; i++) parts.push({ x: J.x + rand(-10, 10), y: J.y, z: rand(4, 26), vx: rand(-40, 40), vy: rand(-20, 20), vz: rand(-10, 20), t: 0, life: rand(0.5, 0.9), c: i % 2 ? '#ffd21f' : '#1a1410', w: 2, h: 1, g: 0 });
          sfx('bees.spawn', { x: J.x, y: J.y });
          toast(TXT.fueToast);
          toPizzas();
        }
        break;
      }
      case 'espera':
        J.face = -Math.PI / 2;
        var de = dist(p.x, p.y, J.x, J.y);
        if (de < K.pregonR) { J.pregonT -= dt; if (J.pregonT <= 0) { J.pregonT = rand(7, 10); pregon(); } }
        if (alive && de < K.fightR) beginFight(G);
        break;
      case 'pelea':
        updateFight(G, dt);
        break;
      case 'muriendo':
        if (J.t >= 1.0) { J.state = 'muerta'; J.t = 0; afterDeath(G); }
        break;
    }
    syncSolids(); pushOut(G);
  }

  function updateFight(G, dt) {
    var p = G.player, ph = phaseOf(), PH = K.phases[ph], dp = dist(p.x, p.y, J.x, J.y);
    J.fightT += dt;
    if (ph !== J.phase) { J.phase = ph; syncBar(true); }
    if (ph >= 3 && !J.ph3Yelled) { J.ph3Yelled = true; voz('jefaUltimo', TXT.ultimo, J.x, J.y); J.yellT = 1.4; sfx('boss.yell', { x: J.x, y: J.y }); }
    if (ph >= 3 && !J.nightOn) { J.nightOn = true; var Nn = ACH.noche; try { if (Nn && typeof Nn.start === 'function') Nn.start(G); } catch (eN) { /* nada */ } }   // v0.13 (D5): anochece al entrar en la fase 3
    // v0.13 (D2): aturdida (choque o campana): no hace nada y recibe daño multiplicado · embestida en curso
    if (J.stunT > 0) {
      J.stunT -= dt; J.frying = false;
      if (J.stunT <= 0) { J.stunT = 0; J.stunMul = 1; J.chargeNext = Math.max(J.chargeNext, 1.5); goBack(); }
      else if (Math.random() < dt * 8) parts.push({ x: J.x + rand(-8, 8), y: J.y, z: rand(26, 34), vx: rand(-10, 10), vy: 0, vz: rand(0, 8), t: 0, life: 0.5, c: '#ffe500', w: 2, h: 2, g: 0 });
      return;
    }
    if (J.charge) { updateCharge(G, dt); if (J.charge && J.charge.ph !== 'back') return; }   // volviendo a su puesto sigue peleando (pero sin nueva embestida)
    if (!(J.fryWarnT > 0) && !(J.fryLeft > 0)) {
      // si la machacan de cerca más de 2,5 s, se hace a un lado y embiste (no se puede ganar parado encima de ella)
      if (dp < 36 && p.hp > 0) { J.clingT = (J.clingT || 0) + dt; if (J.clingT > KC.cling && J.chargeNext > 0.3) J.chargeNext = 0.3; } else J.clingT = Math.max(0, (J.clingT || 0) - dt * 2);
      if (J.chargeNext > 0) J.chargeNext -= dt;
      else if (chargeReady(G)) { startCharge(G); updateCharge(G, 0); return; }
    }
    // fritura: cada 9 s se voltea a la paila (de espaldas, hacia el norte)
    if (J.fryWarnT > 0) {   // arreglos v0.11: aviso antes del aceite (se voltea a la paila y la mancha parpadea en el piso; todavía no salpica)
      J.fryWarnT -= dt;
      turnTo(G, -Math.PI / 2, K.fryTurn, dt);
      if (J.fryWarnT <= 0) {
        J.fryWarnT = 0; J.fryLeft = ph >= 3 ? K.fryT3 : K.fryT; J.frying = true; J.splashT = 0; J.splashCD = 0;
        fryLoop = loopOf('boss.fry', { x: J.x, y: J.y });
        if (!J.firstFry) { J.firstFry = true; toast(TXT.fryToast); }
      }
    } else if (J.fryLeft > 0) {
      J.fryLeft -= dt;
      turnTo(G, -Math.PI / 2, K.fryTurn, dt);
      J.splashT -= dt;
      if (J.splashT <= 0) {
        J.splashT = 0.35;
        var c = cartPos(), fx = c.x + Math.cos(J.face) * 6, fy = c.y + Math.sin(J.face) * 6;
        for (var k = 0; k < 3; k++) parts.push({ x: fx + rand(-6, 6), y: fy + rand(-3, 3), z: 12, vx: Math.cos(J.face) * rand(10, 40) + rand(-15, 15), vy: Math.sin(J.face) * rand(10, 30), vz: rand(20, 45), t: 0, life: rand(0.35, 0.55), c: k % 2 ? '#f0c04a' : '#fff1a8', w: 1, h: 1, g: 200 });
      }
      if (J.splashCD > 0) J.splashCD -= dt;
      var c2 = cartPos(), sxp = c2.x + Math.cos(J.face) * 10, syp = c2.y + Math.sin(J.face) * 10;
      var ahead = (p.x - c2.x) * Math.cos(J.face) + (p.y - c2.y) * Math.sin(J.face) > 0;
      if (p.hp > 0 && J.splashCD <= 0 && ahead && dist(p.x, p.y, sxp, syp) < K.splashR) {
        J.splashCD = K.splashEvery; hurtPlayer(G, K.splashDmg, 'aceite', { x: c2.x, y: c2.y }); addText('¡CHSS!', p.x, p.y - 26, '#fff1a8');
      }
      if (J.fryLeft <= 0) { J.fryLeft = 0; J.frying = false; J.fryNext = K.fryEvery; stopFry(); }
    } else {
      J.fryNext -= dt;
      if (J.fryNext <= 0) {
        J.fryWarnT = K.fryWarn; addText('¡CUIDADO, ACEITE!', J.x, J.y - 34, '#ffb347'); sfx('boss.fryWarn', { x: J.x, y: J.y });
      } else if (p.hp > 0) turnTo(G, Math.atan2(p.y - J.y, p.x - J.x), K.turn, dt);
    }
    if (fryLoop && fryLoop.touch) { try { fryLoop.touch(); } catch (e) { /* nada */ } }
    // enjambres
    J.spawnT -= dt;
    if (J.spawnT <= 0) {
      var free = PH.max - liveSwarms(false);
      if (free > 0 && dp < K.spawnFar && p.hp > 0) {
        var n = Math.min(PH.n, free), cp = cartPos();
        for (var i = 0; i < n; i++) makeSwarm(cp.x + rand(-4, 4) + i * 8, cp.y - 8, false);
        J.spawnT = PH.every; J.yellT = Math.max(J.yellT, 0.6);
      } else J.spawnT = 1;
    }
    // picarones en arco (fase 2 y 3), nunca mientras fríe
    if (PH.throwEvery && !J.frying) {
      J.throwT -= dt;
      if (J.throwT <= 0) { if (dp < K.throwMax && p.hp > 0) throwPicaron(G); J.throwT = PH.throwEvery; }
    }
  }

  /* ---------------- Partículas y textos ---------------- */
  function addText(s, x, y, col) { texts.push({ s: s, x: x, y: y, t: 0, c: col }); if (texts.length > 5) texts.shift(); }
  function updateParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var q = parts[i]; q.t += dt;
      if (q.t >= q.life) { parts.splice(i, 1); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt; q.vz -= (q.g || 0) * dt; q.z = Math.max(0, q.z + q.vz * dt);
    }
    if (parts.length > 90) parts.splice(0, parts.length - 90);
    for (var j = texts.length - 1; j >= 0; j--) { texts[j].t += dt; if (texts[j].t > 0.6) texts.splice(j, 1); }
    if (bubble) { bubble.t += dt; if (bubble.t > 1.8) bubble = null; }
  }

  /* ---------------- Ganchos ---------------- */
  function update(G, dt) {
    if (!G || !G.player) return;
    updateJefa(G, dt);
    updateSwarms(G, dt);
    updateFlying(G, dt);
    updateParts(dt);
    if (!flags.miel && inPuddle(G.player.x, G.player.y)) { flags.miel = true; toast(TXT.mielToast); }
  }
  function reset(G) {
    clearField(); resetJefa(); flags.tit = flags.water = flags.miel = flags.charge = false; lastQT = 0; lastStingAt = -1e9; barHideAt = -1;
    wCache.n = -1;
    setBoss(false); showBar(false); hidePoster();
    var Pn = ACH.mira; if (Pn && Pn.cont && Pn.flag && Pn.flag('jefa')) deadFromSave();   // v0.13 T2: CONTINUAR con la jefa vencida
    installDebug();
  }
  function onRespawn(G) {
    clearField(); barHideAt = -1; lastStingAt = -1e9;
    if (!J.dead && J.state !== 'rotonda') {
      J.hp = J.hpMax; J.phase = 1; J.ph3Yelled = false; J.charge = null; J.stunT = 0; J.stunMul = 1; toPizzas();
      if (J.nightOn) { J.nightOn = false; var Nn = ACH.noche; try { if (Nn && typeof Nn.force === 'function') Nn.force(false); } catch (eN) { /* nada */ } }   // vuelve el atardecer
    }
    setBoss(false); showBar(false);
  }
  function mood(G) {
    if (J.state === 'pelea') return { m: 'horde', i: 1 };
    for (var i = 0; i < S.length; i++) if (S[i].state !== 'disperse') return { m: 'chase', i: 0.6 };
    return null;
  }
  function speedMul(G) { var p = G && G.player; return p && inPuddle(p.x, p.y) ? K.puddleSlow : 1; }
  function inArc(x, y, sw, pad) {
    var dx = x - sw.x, dy = y - sw.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > (sw.range || 24) + pad) return false;
    if (d < 5) return true;
    return Math.abs(wrap(Math.atan2(dy, dx) - (sw.ang || 0))) <= (sw.arc || Math.PI / 2) / 2;
  }
  function beeDmgSwing(sw) {
    if (typeof sw.bees === 'number') return sw.bees;
    if (sw.kind === 'punch') return 0.5;
    if (sw.kind === 'guitar') return 1;
    return typeof sw.dmg === 'number' ? sw.dmg : 1;
  }
  // v0.11: daño de un golpe cuerpo a cuerpo contra la jefa: guitarrazo 1, puñete 0.5, lo demás su dmg (skate, escoba, inflables)
  function swingDmg(sw) {
    var d = typeof sw.dmg === 'number' ? sw.dmg : 1;
    if (sw.kind === 'guitar') return Math.max(1, d);
    if (sw.kind === 'punch') return Math.max(0.5, d);
    return d;
  }
  // v0.11: golpe de cercanía. A ≤ 32 px del cuerpo o ≤ 26 px de la carretilla le entra, mire a donde mire.
  // La carretilla ya no bloquea: pegarle cuenta como pegarle a ella. Un golpe = un daño (no se suman los dos rectángulos).
  function swingReaches(sw) {
    var c = cartPos();
    if (dist(sw.x, sw.y, J.x, J.y) <= K.nearBody || dist(sw.x, sw.y, c.x, c.y) <= K.nearCart) return true;
    return inArc(J.x, J.y, sw, K.bodyR + 1) || inArc(c.x, c.y, sw, K.cartR);
  }
  function onSwing(G, sw) {
    if (!sw) return 0;
    var n = 0, i;
    for (i = 0; i < S.length; i++) {
      var s = S[i]; if (s.state === 'disperse') continue;
      if (inArc(s.x, s.y, sw, K.contactR) && damageSwarm(G, s, beeDmgSwing(sw), sw.x, sw.y, sw.kind)) n++;
    }
    if (!J.dead && (J.state === 'pelea' || J.state === 'espera') && swingReaches(sw)) {
      var dm = swingDmg(sw);
      if (dm > 0 && hittable(G) && hitJefa(G, dm, sw.x, sw.y) > 0) n++;
    }
    return n;   // v0.11: nunca −1 (se acabó el «¡CLANC!»)
  }
  // pr.kind: 'stone' | 'bubble' | 'throw:<id>' (inflable lanzado: sin daño) | 'heavy:<id>' (cargable de cargables.js: daño completo)
  function onProjectile(G, pr) {
    if (!pr) return false;
    var r = pr.r || 2, kind = pr.kind || 'stone', isThrow = /^throw:/.test(kind), heavy = /^heavy:/.test(kind), i;
    if (isThrow) return false;   // los inflables lanzados rebotan sin daño
    for (i = 0; i < S.length; i++) {
      var s = S[i]; if (s.state === 'disperse') continue;
      if (dist(pr.x, pr.y, s.x, s.y) < r + K.contactR) {
        var dmg = typeof pr.bees === 'number' ? pr.bees : (kind === 'stone' || kind === 'bubble') ? 1 : heavy ? 3 : (typeof pr.dmg === 'number' ? pr.dmg : 1);
        damageSwarm(G, s, dmg, pr.x - (pr.vx || 0) * 0.05, pr.y - (pr.vy || 0) * 0.05, kind);
        return true;
      }
    }
    if (J.dead || (J.state !== 'pelea' && J.state !== 'espera')) return false;
    var c = cartPos(), onBody = dist(pr.x, pr.y, J.x, J.y - 6) < r + K.bodyR + 2 || dist(pr.x, pr.y, J.x, J.y) < r + K.bodyR + 2,
      onCart = dist(pr.x, pr.y, c.x, c.y) < r + K.cartR;
    if (!onBody && !onCart) return false;
    if (!hittable(G)) return false;
    if (kind === 'bubble') { parts.push({ x: pr.x, y: pr.y, z: 10, vx: 0, vy: 0, vz: 0, t: 0, life: 0.2, c: '#dff6ff', w: 2, h: 2, g: 0 }); return true; }
    var pd = typeof pr.dmg === 'number' ? pr.dmg : 1;
    hitJefa(G, heavy ? pd : Math.min(1, pd), pr.x, pr.y);
    if (heavy) addText('¡PUM!', J.x, J.y - 30, '#ffe500');
    return true;
  }

  /* ---------------- Sprites: los de M2c o reemplazos provisorios ---------------- */
  function mk(w, h) {
    if (ACH.px && typeof ACH.px.canvas === 'function') { try { var c0 = ACH.px.canvas(w, h); if (c0 && c0.getContext) return c0; } catch (e) { /* sigue */ } }
    var c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  }
  function outlined(src, ax, ay, ink) {   // contorno oscuro de 1 px (al hornear, nunca en el bucle)
    var c = mk(src.width + 2, src.height + 2), g = c.getContext('2d'), m = mk(src.width, src.height), mg = m.getContext('2d');
    mg.drawImage(src, 0, 0); mg.globalCompositeOperation = 'source-in'; mg.fillStyle = ink || '#1a1216'; mg.fillRect(0, 0, m.width, m.height);
    g.drawImage(m, 0, 1); g.drawImage(m, 2, 1); g.drawImage(m, 1, 0); g.drawImage(m, 1, 2); g.drawImage(src, 1, 1);
    c.ax = ax + 1; c.ay = ay + 1; return c;
  }
  function tint(src, col) {
    var c = mk(src.width, src.height), g = c.getContext('2d');
    g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
    c.ax = src.ax; c.ay = src.ay; return c;
  }
  function label(g, s, x, y, ink) {
    if (ACH.px && typeof ACH.px.text === 'function') { try { ACH.px.text(g, s, x, y, { font: 'a5', ink: ink, align: 'c' }); return; } catch (e) { /* sigue */ } }
    g.fillStyle = ink; g.font = '5px monospace'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(s, x, y);
  }
  // Picaronera provisoria: 16×33, pies en (8, 32). pose: idle | grita | frie | lanza | camina ; f = cuadro
  function bakePica(pose, f) {
    var c = mk(18, 34), g = c.getContext('2d'), back = pose === 'frie', bob = (pose === 'idle' && f === 1) || (pose === 'camina' && f % 2) ? 1 : 0;
    function R(col, x, y, w, h) { g.fillStyle = col; g.fillRect(x, y + bob, w, h); }
    // zapatos
    var l = pose === 'camina' ? (f % 4 === 1 ? -1 : f % 4 === 3 ? 1 : 0) : 0;
    g.fillStyle = '#2a1d16'; g.fillRect(4 + l, 31, 3, 2); g.fillRect(10 - l, 31, 3, 2);
    R('#5b3a8c', 3, 19, 11, 12);                   // pollera morada
    R('#3f2763', 3, 29, 11, 2);
    if (!back) { R('#efe9dc', 5, 17, 7, 12); R('#d6cdb8', 5, 27, 7, 1); }   // mandil
    R('#c94c3a', 4, 11, 9, 8);                     // blusa
    R('#8fa37a', 5, 4, 7, 7);                      // cara (verde zombie)
    R('#d8323c', 4, 2, 9, 4);                      // pañuelo
    R('#d8323c', 4, 6, 2, 3);
    if (back) { R('#d8323c', 5, 4, 7, 6); R('#a8222b', 7, 9, 3, 2); }
    else {
      R('#1a1216', 6, 7, 1, 1); R('#1a1216', 10, 7, 1, 1);
      if (pose === 'grita') R('#3a1010', 7, 9, 3, 2); else R('#5a6b4e', 7, 9, 3, 1);
    }
    // brazo y cucharón
    var arm = { x: 13, y: 12, sx: 14, sy: 18, ex: 16, ey: 8 };
    if (pose === 'grita') arm = { x: 13, y: 8, sx: 14, sy: 9, ex: 15, ey: 1 };
    else if (pose === 'lanza') arm = f === 0 ? { x: 13, y: 8, sx: 14, sy: 8, ex: 12, ey: 1 } : f === 1 ? { x: 13, y: 7, sx: 14, sy: 7, ex: 17, ey: 2 } : { x: 13, y: 12, sx: 14, sy: 12, ex: 17, ey: 13 };
    else if (back) arm = { x: 2, y: 12, sx: 2, sy: 14 + (f % 3), ex: 0, ey: 20 + (f % 3) };
    R('#c94c3a', arm.x, arm.y, 2, 5); R('#8fa37a', arm.sx, arm.sy, 1, 1);
    var steps = 6;
    for (var k = 0; k <= steps; k++) R('#9aa0a6', Math.round(arm.sx + (arm.ex - arm.sx) * k / steps), Math.round(arm.sy + (arm.ey - arm.sy) * k / steps), 1, 1);
    R('#c3c8cc', Math.max(0, arm.ex - 1), Math.max(0, arm.ey - 1), 3, 2);
    return outlined(c, 8, 32);
  }
  function bakeDead() {
    var src = bakePica('idle', 0), c = mk(src.height + 2, src.width + 2), g = c.getContext('2d');
    g.translate(c.width - 1, 1); g.rotate(Math.PI / 2); g.drawImage(src, 0, 0);
    c.ax = Math.round(c.width / 2); c.ay = c.height - 2; return c;
  }
  function bakeCart(broken) {
    var c = mk(46, 38), g = c.getContext('2d');
    function R(col, x, y, w, h) { g.fillStyle = col; g.fillRect(x, y, w, h); }
    if (!broken) {
      R('#555a60', 34, 4, 1, 16);                                         // palo de la sombrilla
      for (var x = 22; x < 46; x++) { var cw = (Math.floor((x - 22) / 3) % 2) ? '#f4f0e6' : '#d8323c'; R(cw, x, x < 26 || x > 41 ? 3 : 1, 1, x < 26 || x > 41 ? 3 : 5); }
      R('#2b2b2b', 7, 16, 14, 4); R('#c98a2a', 8, 16, 12, 1);              // paila con aceite
      R('#7a4b22', 10, 20, 8, 1);
      R('#8a5a2b', 2, 20, 42, 10);                                        // cajón
      R('#e8dcb8', 4, 22, 38, 6);
      label(g, 'PICARONES', 23, 22, '#c42a2a');
      R('#1a1216', 6, 30, 6, 6); R('#1a1216', 34, 30, 6, 6); R('#6b6f75', 8, 32, 2, 2); R('#6b6f75', 36, 32, 2, 2);
    } else {
      R('#8a5a2b', 3, 26, 30, 8); R('#e8dcb8', 5, 28, 26, 4); R('#1a1216', 30, 22, 6, 6); R('#1a1216', 6, 21, 5, 5);   // volteada
      for (var x2 = 30; x2 < 45; x2++) R((Math.floor(x2 / 3) % 2) ? '#f4f0e6' : '#d8323c', x2, 32 - Math.floor((x2 - 30) / 3), 1, 3);
      R('#2b2b2b', 14, 33, 9, 3);
      g.fillStyle = '#b36a2a'; [[10, 35], [24, 36], [38, 35], [18, 36]].forEach(function (q) { g.fillRect(q[0], q[1], 3, 2); });
    }
    return outlined(c, 23, 35);
  }
  function bakeBarrier(w) {   // cordel: postes en los extremos y dos baldes de masa grandes y celestes en el centro libre de la calle (el toldo cubre los bordes)
    var c = mk(w, 28), g = c.getContext('2d');
    function R(col, x, y, ww, h) { g.fillStyle = col; g.fillRect(x, y, ww, h); }
    function bucket(x) {
      R('#2c4a86', x, 10, 12, 16); R('#5f8fe0', x + 1, 10, 4, 15); R('#3a6fc8', x + 5, 10, 6, 15); R('#1f3868', x + 10, 10, 2, 16);   // cuerpo
      R('#efe9dc', x, 15, 12, 3); R('#c42a2a', x, 18, 12, 2); R('#f6f1e4', x + 1, 9, 10, 2); R('#a8a498', x + 3, 8, 6, 1);              // franja, borde y asa
      R('#ffd21f', x + 2, 22, 8, 2);                                                                                                // etiqueta de masa
    }
    R('#6b4a2a', 1, 0, 3, 26); R('#8a6238', 1, 0, 1, 26); R('#6b4a2a', w - 4, 0, 3, 26); R('#8a6238', w - 4, 0, 1, 26);                // postes
    R('#ffd21f', 0, 0, 5, 2); R('#ffd21f', w - 5, 0, 5, 2);
    for (var x = 4; x < w - 4; x++) {                                                                                                // soga con vuelo, a franjas rojiblancas
      var sag = Math.round(5 * Math.sin((x - 4) / (w - 8) * Math.PI)), st = Math.floor((x - 4) / 3) % 2;
      R(st ? '#f4f0e6' : '#d8323c', x, 5 + sag, 1, 2);
      if ((x - 4) % 8 === 4) { R('#ffd21f', x - 1, 7 + sag, 3, 4); R('#d8323c', x - 1, 11 + sag, 3, 1); }                               // banderines
    }
    bucket(12); bucket(w - 24);
    var o = outlined(c, Math.round(w / 2), 26); return o;
  }
  var PH = null;   // caché de provisorios
  function ph() {
    if (PH) return PH;
    PH = { pica: {}, cart: bakeCart(false), cartBroken: bakeCart(true), dead: bakeDead(), barrier: bakeBarrier(4 * T()), txt: {} };
    var poses = { idle: 2, grita: 2, frie: 3, lanza: 3, camina: 4 };
    for (var k in poses) { PH.pica[k] = []; for (var f = 0; f < poses[k]; f++) PH.pica[k].push(bakePica(k, f)); }
    PH.pica.hurt = tint(PH.pica.idle[0], '#ffffff');
    return PH;
  }
  function M() { return (ACH.sprites && ACH.sprites.mira) || null; }
  function frame(list, f) { if (!list) return null; if (Array.isArray(list)) return list.length ? list[((f % list.length) + list.length) % list.length] : null; return list; }
  function good(c) { return !!(c && c.width > 0); }
  function picaSprite(pose, f) {
    var m = M(), set = m && m.picaronera, c = set ? frame(set[pose], f) : null;
    if (good(c)) return c;
    var p = ph();
    if (pose === 'dead') return p.dead;
    if (pose === 'hurt') return p.pica.hurt;
    return frame(p.pica[pose] || p.pica.idle, f);
  }
  function cartSprite(broken) {
    var m = M(), cs = m && m.carretillaPicarones, c = cs ? (broken ? cs.broken : cs.ok) : null;
    if (good(c)) return frame(c, 0);
    return broken ? ph().cartBroken : ph().cart;
  }
  function drawC(ctx, c, x, y, flip) {
    if (!c) return;
    var ax = c.ax !== undefined ? c.ax : Math.round(c.width / 2), ay = c.ay !== undefined ? c.ay : c.height;
    if (!flip) { ctx.drawImage(c, Math.round(x - ax), Math.round(y - ay)); return; }
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(-1, 1); ctx.drawImage(c, -ax, -ay); ctx.restore();
  }
  function textSpr(s, col) {
    var key = s + '|' + col, P0 = ph().txt;
    if (P0[key]) return P0[key];
    var w = 6 * s.length + 6, c = mk(w, 14), g = c.getContext('2d');
    if (ACH.px && typeof ACH.px.text === 'function') { try { ACH.px.text(g, s, 3, 4, { font: 'a7', ink: col, outline: '#131015' }); } catch (e) { g.fillStyle = col; g.font = 'bold 8px monospace'; g.textBaseline = 'top'; g.fillText(s, 3, 3); } }
    else { g.fillStyle = '#131015'; g.font = 'bold 8px monospace'; g.textBaseline = 'top'; g.fillText(s, 4, 4); g.fillStyle = col; g.fillText(s, 3, 3); }
    c.ax = Math.round(w / 2); c.ay = 7;
    P0[key] = c; return c;
  }

  /* ---------------- Dibujo ---------------- */
  function poseNow() {
    if (J.state === 'muriendo') return J.t < 0.3 ? 'hurt' : 'dead';
    if (J.state === 'muerta') return 'dead';
    if (J.stunT > 0) return Math.floor(J.t * 7) % 2 ? 'hurt' : 'idle';
    if (J.hurtT > 0.1) return 'hurt';
    if (J.charge && J.charge.ph !== 'back') return J.charge.ph === 'warn' ? 'grita' : 'camina';
    if (J.frying) return 'frie';
    if (J.poseT > 0 && J.pose === 'lanza') return 'lanza';
    if (J.state === 'yendo') return 'camina';
    if (J.yellT > 0) return 'grita';
    return 'idle';
  }
  var FPS = { idle: 2, grita: 6, frie: 7, lanza: 6, camina: 7 };
  function drawJefa(ctx, cx, cy) {
    var pose = poseNow(), f = pose === 'lanza' ? Math.min(2, Math.floor((0.5 - J.poseT) * 6)) : Math.floor(J.anim * (FPS[pose] || 2));
    var c = picaSprite(pose, f), flip = Math.cos(J.face) < -0.2 && pose !== 'frie';
    if (J.state === 'yendo' && J.t > (K.tutVanishAt - K.tutLeaveAt) - 0.6) ctx.globalAlpha = Math.max(0.15, ((K.tutVanishAt - K.tutLeaveAt) - J.t) / 0.6);
    drawC(ctx, c, J.x - cx, J.y - cy, flip);
    ctx.globalAlpha = 1;
  }
  function cartDrawPos() {
    if (J.state === 'rotonda' || J.state === 'tutorial') return { x: J.x - 18, y: J.y + 4 };
    if (J.state === 'yendo') return { x: J.x + Math.cos(J.face) * 14, y: J.y + Math.sin(J.face) * 14 };
    if (J.state === 'muerta' || J.state === 'muriendo') return { x: J.x + 14, y: J.y - 6 };
    return cartPos();
  }
  function onScreen(x, y, cx, cy, m) { var V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }; return x > cx - m && x < cx + V.w + m && y > cy - m && y < cy + V.h + m * 1.5; }
  function drawPuddle(ctx, q, cx, cy) {
    var a = q.t < 0.2 ? q.t / 0.2 : q.life - q.t < 1 ? Math.max(0, q.life - q.t) : 1;
    var m = M(), spr = m && frame(m.charcoMiel, q.v);
    ctx.globalAlpha = a * 0.9;
    if (good(spr)) drawC(ctx, spr, q.x - cx, q.y - cy + (spr.ay === undefined ? spr.height / 2 : 0), false);
    else {
      ctx.fillStyle = '#b8741c'; ctx.beginPath(); ctx.ellipse(Math.round(q.x - cx), Math.round(q.y - cy), K.puddleR, K.puddleR * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e0a23a'; ctx.beginPath(); ctx.ellipse(Math.round(q.x - cx - 2), Math.round(q.y - cy - 1), K.puddleR * 0.6, K.puddleR * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe39a'; ctx.fillRect(Math.round(q.x - cx - 6), Math.round(q.y - cy - 3), 3, 1);
    }
    ctx.globalAlpha = 1;
  }
  function drawables(G, out) {
    if (!out || !G) return;
    var cx0 = G.cam ? G.cam.x : 0, cy0 = G.cam ? G.cam.y : 0, i;
    for (i = 0; i < P.length; i++) (function (q, k) { if (onScreen(q.x, q.y, cx0, cy0, 30)) out.push({ y: -1e6 + k, draw: function (ctx, cx, cy) { drawPuddle(ctx, q, cx, cy); } }); })(P[i], i);
    for (i = 0; i < F.length; i++) (function (f) {   // aviso en el piso donde va a caer el picarón
      out.push({ y: -1e6 + 50, draw: function (ctx, cx, cy) {
        var k = Math.min(1, f.t / f.dur), r = 3 + 7 * k;
        ctx.globalAlpha = 0.25 + 0.35 * k; ctx.fillStyle = '#1a1216';
        ctx.beginPath(); ctx.ellipse(Math.round(f.x1 - cx), Math.round(f.y1 - cy), r, r * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      } });
    })(F[i]);
    if (J.charge && J.charge.ph === 'warn') {   // v0.13 (D2): carril de la embestida en el piso (llega hasta donde chocaría)
      out.push({ y: -1e6 + 58, draw: function (ctx, cx, cy) {
        var c = J.charge; if (!c || c.ph !== 'warn') return;
        var L = chargeLen(J.face), on = Math.floor(c.t * 12) % 2 === 0;
        ctx.save(); ctx.translate(Math.round(J.x - cx), Math.round(J.y - cy)); ctx.rotate(J.face);
        ctx.globalAlpha = c.locked ? 0.42 : 0.26; ctx.fillStyle = on ? '#ff5a2e' : '#ffb347'; ctx.fillRect(10, -10, L, 20);
        ctx.globalAlpha = 0.9; ctx.fillStyle = c.locked ? '#fff1a8' : '#ff7a1a';
        for (var x = 14; x < L; x += 10) ctx.fillRect(x, -1, 5, 2);
        ctx.fillRect(10 + L, -11, 2, 22);
        ctx.restore(); ctx.globalAlpha = 1;
      } });
    }
    if (J.state === 'pelea' && (J.fryWarnT > 0 || J.fryLeft > 0)) {   // arreglos v0.11: zona del aceite en el piso (parpadea en el aviso, llena mientras fríe)
      out.push({ y: -1e6 + 60, draw: function (ctx, cx, cy) {
        if (!(J.fryWarnT > 0 || J.fryLeft > 0)) return;
        var c = cartPos(), x = Math.round(c.x + Math.cos(J.face) * 10 - cx), y = Math.round(c.y + Math.sin(J.face) * 10 - cy), warn = J.fryWarnT > 0;
        if (!warn) { ctx.globalAlpha = 0.32; ctx.fillStyle = '#ffd21f'; ctx.beginPath(); ctx.ellipse(x, y, K.splashR, K.splashR * 0.55, 0, 0, Math.PI * 2); ctx.fill(); }
        if (!warn || Math.floor(J.fryWarnT * 8) % 2 === 0) {
          ctx.globalAlpha = warn ? 0.9 : 0.7; ctx.strokeStyle = warn ? '#ff7a1a' : '#fff1a8'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(x + 0.5, y + 0.5, K.splashR, K.splashR * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
          if (warn) { ctx.fillStyle = '#ff7a1a'; ctx.fillRect(x - 1, y - 4, 2, 5); ctx.fillRect(x - 1, y + 2, 2, 1); }
        }
        ctx.globalAlpha = 1;
      } });
    }
    if (!J.dead) {   // cordel de baldes que cierra la calle
      var b = barrier();
      if (onScreen((b.x0 + b.x1) / 2, b.y1, cx0, cy0, 60)) out.push({ y: b.y1, draw: function (ctx, cx, cy) { var bb = barrier(); drawC(ctx, ph().barrier, (bb.x0 + bb.x1) / 2 - cx, bb.y1 - cy - 1, false); } });
    }
    if (!onScreen(J.x, J.y, cx0, cy0, 60)) return;
    var cp = cartDrawPos(), broken = J.state === 'muerta' || J.state === 'muriendo';
    out.push({ y: cp.y + (broken ? -2 : 0), draw: function (ctx, cx, cy) { var q = cartDrawPos(); drawC(ctx, cartSprite(J.state === 'muerta' || J.state === 'muriendo'), q.x - cx, q.y - cy, false); } });
    out.push({ y: J.y + 0.1, x: J.x, draw: function (ctx, cx, cy) { drawJefa(ctx, cx, cy); } });
  }
  function drawBees(ctx, G, s, cx, cy) {
    var m = M(), bs = m && m.abeja, n = beesShown(s), clock = G.clock || 0, disp = s.state === 'disperse', k = disp ? s.t / K.disperseT : 0;
    var spread = disp ? 1 + k * 5 : 1, tight = s.mode === 'eat' ? 0.6 : 1, a = disp ? Math.max(0, 1 - k) : 1;
    var sx = s.x - cx, sy = s.y - cy, i, b, bx, by, ang;
    // sombras en el piso
    ctx.globalAlpha = 0.3 * a; ctx.fillStyle = '#141018';
    for (i = 0; i < n; i++) {
      b = s.bees[i]; ang = b.ph + clock * b.sp;
      ctx.fillRect(Math.round(sx + Math.cos(ang) * b.r * spread * tight), Math.round(sy + Math.sin(ang) * b.r * 0.35 * spread + 1), 1, 1);
    }
    ctx.globalAlpha = a;
    for (i = 0; i < n; i++) {
      b = s.bees[i]; ang = b.ph + clock * b.sp;
      var jit = Math.sin(clock * 23 + b.jx) * 1.2, jit2 = Math.cos(clock * 19 + b.jx * 1.7) * 1.2;
      bx = Math.round(sx + Math.cos(ang) * b.r * spread * tight + jit);
      by = Math.round(sy - b.z + Math.sin(ang) * b.r * 0.6 * spread * tight + jit2 - (disp ? k * 10 : 0));
      var wing = (Math.floor(clock * 20 + i) & 1);
      var spr = bs && frame(bs, wing);
      if (good(spr)) { ctx.drawImage(spr, bx - (spr.ax || 1), by - (spr.ay || 1)); continue; }
      ctx.fillStyle = s.hitT > 0 ? '#ffffff' : '#ffd21f'; ctx.fillRect(bx, by, 3, 2);
      ctx.fillStyle = '#1a1410'; ctx.fillRect(bx + 1, by, 1, 2);
      if (wing) { ctx.fillStyle = '#e8f4ff'; ctx.fillRect(bx + 1, by - 1, 1, 1); }
    }
    ctx.globalAlpha = 1;
  }
  function drawArchLights(ctx, G, cx, cy) {
    var W = ACH.world, props = W && W.props; if (!props) return;
    var arch = null;
    for (var i = 0; i < props.length; i++) if (props[i].k === 'arcoPizzas') { arch = props[i]; break; }
    if (!arch) return;
    var spr = null; try { spr = ACH.gfx && ACH.gfx.prop ? ACH.gfx.prop(arch.k, arch.v, arch.dir, arch.fb) : null; } catch (e) { spr = null; }
    var w = spr ? spr.width : 64, ax = spr && spr.ax !== undefined ? spr.ax : w / 2, ay = spr && spr.ay !== undefined ? spr.ay : 48;
    var x0 = arch.x - ax - cx, y0 = arch.y - ay - cy, on = Math.floor((G.clock || 0) * 4) & 1;
    if (x0 > (ACH.render ? ACH.render.VIEW.w : 480) || x0 + w < 0) return;
    for (var x = 3, k = 0; x < w - 2; x += 5, k++) {
      ctx.fillStyle = ((k & 1) === on) ? '#fff6b0' : '#ffb000';
      ctx.fillRect(Math.round(x0 + x), Math.round(y0 + 2), 2, 2);
    }
  }
  function drawTop(ctx, G, cx, cy) {
    if (!G) return;
    var i;
    for (i = 0; i < S.length; i++) if (onScreen(S[i].x, S[i].y, cx, cy, 40)) drawBees(ctx, G, S[i], cx, cy);
    for (i = 0; i < F.length; i++) {
      var f = F[i], k = Math.min(1, f.t / f.dur), x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k - f.h * 4 * k * (1 - k);
      var m = M(), spr = m && frame(m.picaron, Math.floor(f.t * 12));
      if (good(spr)) drawC(ctx, spr, x - cx, y - cy, false);
      else {
        var px = Math.round(x - cx), py = Math.round(y - cy);
        ctx.fillStyle = '#1a1216'; ctx.fillRect(px - 3, py - 2, 7, 5); ctx.fillRect(px - 2, py - 3, 5, 7);
        ctx.fillStyle = '#c4782e'; ctx.fillRect(px - 2, py - 2, 5, 5); ctx.fillStyle = '#7a3e14'; ctx.fillRect(px, py, 1, 1);
        ctx.fillStyle = '#f2b84a'; ctx.fillRect(px - 2, py - 2, 2, 1);
      }
    }
    for (i = 0; i < parts.length; i++) {
      var q = parts[i], a = 1 - q.t / q.life;
      if (q.bubble) {   // abeja atrapada en la burbuja, que sube
        var bx = Math.round(q.x - cx), by = Math.round(q.y - q.z - cy);
        ctx.globalAlpha = Math.min(1, a * 2); ctx.strokeStyle = '#dff6ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bx + 0.5, by + 0.5, 4, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#ffd21f'; ctx.fillRect(bx - 1, by, 3, 2); ctx.fillStyle = '#1a1410'; ctx.fillRect(bx, by, 1, 2);
        continue;
      }
      ctx.globalAlpha = Math.max(0, Math.min(1, a * 1.6)); ctx.fillStyle = q.c;
      ctx.fillRect(Math.round(q.x - cx), Math.round(q.y - q.z - cy), q.w, q.h);
    }
    ctx.globalAlpha = 1;
    for (i = 0; i < texts.length; i++) {
      var t = texts[i], ts = textSpr(t.s, t.c);
      ctx.globalAlpha = t.t > 0.4 ? Math.max(0, 1 - (t.t - 0.4) / 0.2) : 1;
      drawC(ctx, ts, t.x - cx, t.y - cy - t.t * 16, false);
    }
    ctx.globalAlpha = 1;
    if (bubble && !J.dead) { var bs2 = textSpr(bubble.s, '#ffe500'); drawC(ctx, bs2, J.x - cx, J.y - cy - 40, false); }
    if (!J.dead && J.charge && J.charge.ph === 'warn') { var es = textSpr('!', Math.floor(J.charge.t * 10) % 2 ? '#ffe500' : '#ff5a2e'); drawC(ctx, es, J.x - cx, J.y - cy - 44, false); }
    if (!J.dead && J.stunT > 0) {   // v0.13 (D2): estrellitas girando sobre su cabeza
      for (i = 0; i < 3; i++) { var sa = G.clock * 6 + i * 2.094, sx = Math.round(J.x - cx + Math.cos(sa) * 9), sy = Math.round(J.y - cy - 34 + Math.sin(sa) * 3); ctx.fillStyle = '#131015'; ctx.fillRect(sx - 1, sy - 1, 4, 4); ctx.fillStyle = i % 2 ? '#ffe500' : '#fff6b0'; ctx.fillRect(sx, sy, 2, 2); }
    }
    if (J.dead) drawArchLights(ctx, G, cx, cy);
  }

  /* ---------------- Barra de jefa y afiche (HTML chicha sobre #stage) ---------------- */
  var UI = { styled: false, bar: null, fill: null, poster: null, shown: false, lastW: -1 };
  function injectStyle() {
    if (UI.styled) return; UI.styled = true;
    var st = document.createElement('style'); st.id = 'jefaStyle';
    st.textContent =
      '#jefaBar{position:absolute;left:50%;top:calc(var(--u)*3);transform:translateX(-50%) rotate(-1deg);z-index:5;pointer-events:none;display:none;' +
      'width:calc(var(--u)*150);background:#131015;border:var(--u) solid #ff2e88;box-shadow:calc(var(--u)*2) calc(var(--u)*2) 0 #ffe500;' +
      'padding:calc(var(--u)*2) calc(var(--u)*3);text-align:center}' +
      '#jefaBar.on{display:block;animation:jbIn .45s ease-out}' +
      '#jefaBar .jn{display:block;font-family:var(--display);font-size:calc(var(--u)*6);line-height:1;color:#ffe500;white-space:nowrap;letter-spacing:.02em;' +
      'text-shadow:var(--u) var(--u) 0 #ff2e88;margin-bottom:calc(var(--u)*1)}' +
      '#jefaBar .jb{position:relative;height:calc(var(--u)*4);background:#2a2630;border:var(--u) solid #000}' +
      '#jefaBar .jb i{position:absolute;left:0;top:0;bottom:0;width:100%;background:#ff8a2e;border-top:var(--u) solid #ffc36b;transition:width .15s linear}' +
      '#jefaBar .jb u{position:absolute;top:0;bottom:0;width:var(--u);background:rgba(255,255,255,.55)}' +
      '#jefaBar.hit .jb i{background:#fff6b0}' +
      '#jefaBar[data-ph="2"] .jb i{background:#ff5a2e}#jefaBar[data-ph="3"] .jb i{background:#ff2e88;animation:blink .5s steps(2) infinite}' +
      '#jefaBar.dead{opacity:.6}' +
      // arreglos v0.11: la barra no sale sobre la pantalla de victoria, y con la barra puesta los toasts bajan para no pisarse con ella
      'body[data-state="won"] #jefaBar,body[data-state="title"] #jefaBar{display:none!important}' +
      'body.jefa-on #objLine{display:none!important}' +   // v0.13 (G4): la línea de objetivo (objetivo.js) ocupa el mismo sitio que la barra de la jefa: durante la pelea se oculta
      'body.jefa-on #toasts,body.touch.jefa-on #toasts{top:calc(var(--u)*30)}body[data-state="won"].jefa-on #toasts{top:calc(var(--u)*20)}' +
      '@keyframes jbIn{0%{opacity:0;transform:translateX(-50%) translateY(calc(var(--u)*-8)) rotate(-1deg)}100%{opacity:1;transform:translateX(-50%) rotate(-1deg)}}' +
      '#jefaPoster{position:absolute;left:50%;top:30%;transform:translate(-50%,-50%) rotate(2deg);z-index:6;pointer-events:none;display:none;text-align:center;' +
      'background:#131015;border:calc(var(--u)*2) solid #ffe500;box-shadow:calc(var(--u)*3) calc(var(--u)*3) 0 #ff2e88,calc(var(--u)*-2) calc(var(--u)*-2) 0 #1fe07a;' +
      'padding:calc(var(--u)*5) calc(var(--u)*9) calc(var(--u)*6);max-width:92%}' +
      '#jefaPoster.on{display:block;animation:jpIn 5.5s ease-out forwards}' +
      'body[data-state="paused"] #jefaPoster{animation-play-state:paused;visibility:hidden}' +   // v0.13 fix: no sobre el menú de pausa
      '#jefaPoster .k{display:block;font-family:var(--pixel);font-size:calc(var(--u)*5);letter-spacing:.2em;color:#ff8a2e;margin-bottom:calc(var(--u)*2)}' +
      '#jefaPoster .a{display:block;font-family:var(--display);font-size:calc(var(--u)*11);line-height:1;color:#f2f2f2;white-space:nowrap;' +
      'text-shadow:var(--u) var(--u) 0 #ff2e88,calc(var(--u)*2) calc(var(--u)*2) 0 #131015}' +
      '#jefaPoster .b{display:block;font-family:var(--display);font-size:calc(var(--u)*16);line-height:1.05;color:#ffe500;white-space:nowrap;margin-top:calc(var(--u)*1);' +
      'text-shadow:var(--u) var(--u) 0 #ff2e88,calc(var(--u)*2) calc(var(--u)*2) 0 #131015}' +
      '#jefaPoster .c{display:block;font-family:var(--hand);font-size:calc(var(--u)*7);color:#1fe07a;margin-top:calc(var(--u)*2)}' +
      '#jefaPoster i{position:absolute;width:calc(var(--u)*22);height:calc(var(--u)*6);background:rgba(226,214,170,.78);top:calc(var(--u)*-3)}' +
      '#jefaPoster i.l{left:calc(var(--u)*-6);transform:rotate(-22deg)}#jefaPoster i.r{right:calc(var(--u)*-6);transform:rotate(18deg)}' +
      '@keyframes jpIn{0%{opacity:0;transform:translate(-50%,-50%) rotate(2deg) scale(1.6)}7%{opacity:1;transform:translate(-50%,-50%) rotate(2deg) scale(.94)}' +
      '11%{transform:translate(-50%,-50%) rotate(2deg) scale(1.03)}14%,82%{opacity:1;transform:translate(-50%,-50%) rotate(2deg) scale(1)}100%{opacity:0;transform:translate(-50%,-56%) rotate(2deg) scale(1)}}' +
      '@media (max-aspect-ratio:4/3){#jefaPoster .a{font-size:calc(var(--u)*8)}#jefaPoster .b{font-size:calc(var(--u)*11)}}';
    (document.head || document.documentElement).appendChild(st);
  }
  function stage() { return typeof document !== 'undefined' ? document.getElementById('stage') : null; }
  function barEl() {
    if (UI.bar) return UI.bar;
    var s = stage(); if (!s) return null;
    injectStyle();
    var d = document.createElement('div'); d.id = 'jefaBar'; d.setAttribute('data-ph', '1');
    d.innerHTML = '<span class="jn">DOÑA CHANCACA · LA PICARONERA</span><div class="jb"><i></i><u style="left:60%"></u><u style="left:25%"></u></div>';
    s.appendChild(d);
    UI.bar = d; UI.fill = d.querySelector('i');
    return d;
  }
  function showBar(on) {
    var b = on ? barEl() : UI.bar; if (!b) return;
    UI.shown = !!on; b.classList.toggle('on', !!on); b.classList.toggle('dead', false);
    if (document.body) document.body.classList.toggle('jefa-on', !!on);   // arreglos v0.11 (toasts debajo de la barra)
    if (on) syncBar(true);
  }
  function syncBar(force) {
    if (!UI.bar || !UI.shown) return;
    var w = Math.round(1000 * J.hp / J.hpMax) / 10;
    if (!force && w === UI.lastW) return;
    UI.lastW = w; UI.fill.style.width = w + '%';
    UI.bar.setAttribute('data-ph', String(J.dead ? 1 : phaseOf()));
    UI.bar.classList.toggle('dead', J.dead);
  }
  var hitTO = 0;
  function flashBar() { if (!UI.bar) return; UI.bar.classList.add('hit'); clearTimeout(hitTO); hitTO = setTimeout(function () { if (UI.bar) UI.bar.classList.remove('hit'); }, 90); }
  function showPoster() {
    var s = stage(); if (!s) { toast('¡LA CALLE DE LAS PIZZAS ESTÁ LIBRE!'); return; }
    injectStyle();
    if (!UI.poster) {
      var d = document.createElement('div'); d.id = 'jefaPoster';
      d.innerHTML = '<i class="l"></i><i class="r"></i><span class="k">PARQUE KENNEDY · MIRAFLORES</span><span class="a">¡LA CALLE DE LAS PIZZAS</span>' +
        '<span class="b">ESTÁ LIBRE!</span><span class="c">Doña Chancaca cerró su puesto. Al sur, causa.</span>';
      s.appendChild(d); UI.poster = d;
    }
    UI.poster.classList.remove('on'); void UI.poster.offsetWidth; UI.poster.classList.add('on');
  }
  function hidePoster() { if (UI.poster) UI.poster.classList.remove('on'); }

  /* ---------------- Debug ---------------- */
  function info() {
    return { state: J.state, dead: J.dead, hp: +J.hp.toFixed(2), hpMax: J.hpMax, phase: J.state === 'pelea' ? J.phase : null, x: Math.round(J.x), y: Math.round(J.y),
      faceDeg: Math.round(J.face / D2R), frying: J.frying, fryLeft: +J.fryLeft.toFixed(2), fryNext: +J.fryNext.toFixed(2), spawnT: +J.spawnT.toFixed(2),
      throwT: +J.throwT.toFixed(2), charge: J.charge ? J.charge.ph : null, chargeNext: +J.chargeNext.toFixed(2), stun: +J.stunT.toFixed(2), charges: J.charges, crashes: J.crashes, rotoDone: J.rotoDone, swarms: liveSwarms(true), puddles: P.length, flying: F.length,
      rotonda: rotC(), entrada: jefaPt(), barrier: barrier(), waters: waters().length, bossMusic: bossOn,
      solids: RS.map(function (r) { return r.id + (r.off ? ' off' : ' [' + Math.round(r.x0) + ',' + Math.round(r.y0) + ' – ' + Math.round(r.x1) + ',' + Math.round(r.y1) + ']'); }) };
  }
  function installDebug() {
    var D = ACH.debug = ACH.debug || {};
    var DM = D.mira = D.mira || {};
    DM.jefa = function () { return info(); };
    // v0.11 (V011.md §2.5): blocks siempre 0 (la carretilla ya no bloquea)
    var DV = D.v011 = D.v011 || {};
    DV.jefa = function () { return { hp: +J.hp.toFixed(2), hpMax: J.hpMax, state: J.state, phase: J.phase, frying: J.frying, hits: J.hits || 0, blocks: 0, x: Math.round(J.x), y: Math.round(J.y) }; };
    DV.jefaDmg = function (clear) { var o = {}; for (var k in dmgSrc) o[k] = +dmgSrc[k].toFixed(2); if (clear) dmgSrc = {}; return o; };   // arreglos v0.11
    DV.jefaFight = function () {   // la lleva a la boca de la calle y arranca la pelea (para probar)
      var G = ACH.G; if (J.dead) return DV.jefa();
      if (J.state !== 'pelea') { if (J.state !== 'espera') toPizzas(); startFight(G); }
      return DV.jefa();
    };
    DM.charge = function () { var G = ACH.G; if (J.state !== 'pelea') return 'no está en pelea'; if (J.charge || J.stunT > 0) return info(); J.fryWarnT = 0; J.frying = false; J.fryLeft = 0; startCharge(G); return info(); };
    DM.setHp = function (n) { J.hp = Math.max(0.1, Math.min(J.hpMax, n)); syncBar(true); return info(); };
    DM.killJefa = function () {
      var G = ACH.G;
      if (J.dead) return info();
      if (J.state !== 'pelea') { if (J.state !== 'espera') toPizzas(); J.state = 'pelea'; showBar(true); }
      die(G); return info();
    };
    DM.bees = function (n) {
      var G = ACH.G, p = G && G.player;
      if (n < 0) { for (var q = 0; q < S.length; q++) stopSwarmLoop(S[q]); S.length = 0; }
      else if (n && p) { for (var i = 0; i < Math.min(6, n); i++) { var a = rand(0, 6.283); makeSwarm(p.x + Math.cos(a) * 70, p.y + Math.sin(a) * 50, false); } }
      return S.map(function (s) { return { x: Math.round(s.x), y: Math.round(s.y), hp: +s.hp.toFixed(2), state: s.state, mode: s.mode, age: +s.age.toFixed(1), life: s.life, tut: s.tut, bees: beesShown(s) }; });
    };
  }
  installDebug();

  /* ---------------- Registro ---------------- */
  resetJefa();
  var SYS = { id: 'jefa', name: 'jefa', update: update, reset: reset, onRespawn: onRespawn, mood: mood, drawables: drawables, drawTop: drawTop,
    onSwing: onSwing, onProjectile: onProjectile, speedMul: speedMul };
  if (typeof ACH.mira.register === 'function') ACH.mira.register(SYS); else if (ACH.mira.systems.indexOf(SYS) < 0) ACH.mira.systems.push(SYS);
  // v0.13: lo que usan la campana, el kit anti-abejas y el gato compañero (extras.js, gatos.js)
  J.swarms = function () { return S.filter(function (q) { return q.state !== 'disperse'; }); };
  J.hitSwarm = function (q, dmg, fx, fy, kind) { return damageSwarm(ACH.G, q, dmg, fx, fy, kind || 'kit'); };
  J.disperseSwarm = function (q) { disperse(q); };
  J.stun = stunJefa;
  J.bell = function (G, x, y, r) {   // la campana: dispersa los enjambres en r px y aturde a la jefa si está a ese alcance
    var n = 0, i, q;
    for (i = 0; i < S.length; i++) { q = S[i]; if (q.state === 'disperse' || dist(x, y, q.x, q.y) > r) continue; var a = Math.atan2(q.y - y, q.x - x); q.vx = Math.cos(a) * 90; q.vy = Math.sin(a) * 90; disperse(q); n++; }
    var st = false;
    if (!J.dead && J.state === 'pelea' && dist(x, y, J.x, J.y) <= r) st = stunJefa(KC.bellStun, KC.bellMul);
    return { swarms: n, jefa: st };
  };
  ACH.mira.jefaK = K; ACH.mira.jefaKC = KC;   // afinación, para QA
})();
