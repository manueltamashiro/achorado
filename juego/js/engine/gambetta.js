/* ACHORADO — js/engine/gambetta.js (v0.13 T2, agente GB): la historia de la Av. Gambetta (propuesta-mejoras-v013 B1, B2, B4, B5).
   Estructura del nivel: sobrevivientes → El Chofer → escalera → Cerro.
     B1  Doña Charo (bodega): le cantas (E o cualquier melodía) → comida, Huayno del Alivio gratis y la pista cura-1.
         Don Eusebio (patio de contenedores): 2 chatarra + 1 jebe + 1 tablas → Vals del Escudo gratis.
         DJ Fosforito (berma, cerca de la tarima): limpia la mancha que lo rodea → Cumbia del Mareo gratis y EL SETLIST (concierto).
         «Gratis» = +1 nivel de XP justo (un punto) que se gasta solo en su melodía (si ya está al máximo, el punto queda libre).
     B2  El Chofer: la escalera está tapada con calamina hasta vencerlo. Sale al acercarte a la escalera después de rescatar a Fosforito
         (o a los 12 min de juego si falta algo). Combi zombi: bocina + faros 1 s, embestida en línea a 220 px/s; si choca con un carro,
         una barricada o el cerro queda aturdida 2,5 s (daño ×2). Vida 25, 120 XP. Zombi de tipo gb_chofer (ACH.ent.ZT + ACH.zbeh).
     B4  Don Lucho: el cobrador de la combi de la cuadra 1. La primera vez que te ve se queda quieto 2 s («…¿pasaje, joven?») y hay escena con
         retrato; las melodías lo frenan. Suelta siempre las LLAVES DE COMBI, que abren la combi volcada del paradero (botín fijo).
         (La estampita: game.js, te deja en 1 de vida una vez.)
     B5  Pasajes: perro herido (E con comida: te sigue un rato) · el Uhu escondido · la vecina que pide canción y paga. Azotea sur (S2) por
         la escalera improvisada, con botín fijo. Pasar la lata: melodía (o E) bajo una ventana con silueta → caen sencillos o comida, una vez
         por ventana. Noche: se cortan los postes y cada 45 s llega una mancha de 5–6 zombis hacia la tarima o la bodega.
   Banderas (ACH.partida.flag, solo valen al CONTINUAR): gambetta.charo · eusebio · fosforito · chofer · choferVisto · lucho · combi · perro ·
     vecina · azotea · lata0..lata4. Partida nueva o volver a jugar el nivel = de cero (ACH.partida.freshLevel('gambetta')).
   Ganchos en game.js: ACH.gambetta.reset(G) al final de resetWorld y ACH.gambetta.update(G, dt) en tickLevel. Debug: ACH.debug.gb.* */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var T = 16;

  function G0() { return ACH.G || null; }
  function Wd() { return ACH.world; }
  function GB() { var W = Wd(); return W && W.id === 'gambetta' ? W.GB : null; }
  function sfx(n, d) { try { if (ACH.audio && ACH.audio.emit) ACH.audio.emit(n, d); } catch (e) { /* nada */ } }
  function toast(s) { try { ACH.hud.toast(s); } catch (e) { /* nada */ } }
  function call(o, f, a, b, c) { if (o && typeof o[f] === 'function') { try { return o[f](a, b, c); } catch (e) { warn(f, e); } } return undefined; }
  function warn(k, e) { if (!warn[k]) { warn[k] = 1; try { console.warn('[ACHORADO gb] ' + k, e); } catch (x) { /* nada */ } } }
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function flag(k, v) { var P = ACH.partida; if (!P || typeof P.flag !== 'function') { return v === undefined ? MEMF[k] : (MEMF[k] = v); } try { return P.flag('gambetta.' + k, v); } catch (e) { return undefined; } }
  var MEMF = {};
  function dlgOn() { try { return !!(ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active()); } catch (e) { return false; } }
  function inv() { return ACH.inv || null; }
  function has(id, n) { var I = inv(); return !!(I && I.has && I.has(id, n)); }
  function pressedE() { var I = ACH.input; return !!(I && I.pressed && I.pressed('KeyE')); }

  /* ---------------- CONTINUAR: game.continuar() llama markContinue antes de cargar el nivel ---------------- */
  var pendingCont = false;
  (function () {
    var P = ACH.partida; if (!P || typeof P.markContinue !== 'function' || P._gbWrap) return;
    var mc = P.markContinue;
    P.markContinue = function () { pendingCont = true; return mc.apply(this, arguments); };
    P._gbWrap = true;
  })();

  /* ---------------- Sonidos propios (recetas en ACH.audio.recipes, sin editar sfx.js) ---------------- */
  (function () {
    var A = ACH.audio, L0 = A && A.lib, R = A && A.recipes;
    if (!L0 || !L0.bus || !R) return;
    function def(name, fn, o) { fn.cooldown = o.cd; fn.dur = o.dur; fn.priority = o.prio || 3; R[name] = fn; }
    // bocina de combi: dos cornetas desafinadas «piii-piii»
    def('gb.bocina', function (ctx, out, d, L) {
      L = L || L0; var t = ctx.currentTime + 0.005, o = L.bus(ctx, out, 0.55);
      [0, 0.32].forEach(function (dt0, k) {
        [311, 392].forEach(function (f) {
          var a = ctx.createOscillator(), g = ctx.createGain(), bp = L.filter(ctx, 'bandpass', f * 2.6, 1.3);
          a.type = 'square'; a.frequency.setValueAtTime(f * (k ? 1.0 : 1.01), t + dt0);
          g.gain.setValueAtTime(0, t + dt0); g.gain.linearRampToValueAtTime(0.42, t + dt0 + 0.015); g.gain.setTargetAtTime(0, t + dt0 + (k ? 0.42 : 0.2), 0.03);
          a.connect(bp); bp.connect(g); g.connect(o); a.start(t + dt0); a.stop(t + dt0 + 0.7);
        });
      });
      return 0.9;
    }, { cd: 0.5, dur: 1 });
    // choque: golpe grave + latas + vidrio
    def('gb.choque', function (ctx, out, d, L) {
      L = L || L0; var t = ctx.currentTime + 0.003, o = L.bus(ctx, out, 0.9);
      if (L.tone) L.tone(ctx, o, t, { f0: 120, f1: 38, sweep: 0.25, d: 0.45, gain: 0.9 });
      if (L.noiseHit) { L.noiseHit(ctx, o, t, { kind: 'brown', type: 'lowpass', f: 700, a: 0.002, d: 0.35, gain: 0.8 }); L.noiseHit(ctx, o, t + 0.02, { type: 'bandpass', f: 3200, q: 0.9, a: 0.001, d: 0.25, gain: 0.35 }); }
      return 0.6;
    }, { cd: 0.2, dur: 0.7 });
  })();

  /* ---------------- Estado ---------------- */
  var St = null;
  function freshSt() {
    return { on: true, t: 0, bubbles: [], notes: [], sing: null, lastStrum: 0, objLast: '', objT: 0,
      charo: { done: false, called: false }, eusebio: { done: false, met: false, nagT: 0 },
      fos: { done: false, mancha: null, called: false, nagT: 0 },
      lucho: null, combiOpen: false, chofer: null, choferOn: false, choferIntro: false, choferDone: false, calT: 0, cal: 'cerrada',
      perro: { state: 'herido', x: 0, y: 0, t: 0, f: 0 }, vecina: { done: false, called: false }, uhuSeen: false, azotea: false,
      lata: {}, night: { cut: false, nextT: 0, n: 0, side: 0 }, played: false };
  }
  // reset: lo llama game.js al final de resetWorld (partida nueva, otro nivel, CONTINUAR, volver al título)
  function reset(G) {
    var gb = GB();
    if (!gb) { St = null; pendingCont = false; return; }
    var cont = pendingCont; pendingCont = false;
    if (!cont) call(ACH.partida, 'freshLevel', 'gambetta');
    St = freshSt();
    St.charo.done = !!flag('charo'); St.eusebio.done = !!flag('eusebio'); St.fos.done = !!flag('fosforito');
    St.choferDone = !!flag('chofer'); St.choferIntro = !!flag('choferVisto'); St.combiOpen = !!flag('combi');
    St.vecina.done = !!flag('vecina'); St.azotea = !!flag('azotea');
    if (flag('perro')) St.perro.state = 'sano';
    for (var i = 0; i < 6; i++) if (flag('lata' + i)) St.lata[i] = true;
    var W = Wd();
    call(W, 'setEscalera', St.choferDone);
    St.cal = St.choferDone ? 'abierta' : 'cerrada';
    St.perro.x = gb.perro.x; St.perro.y = gb.perro.y;
    setupLucho(G, !!flag('lucho'));
    objective(true);
  }

  /* ---------------- Diálogo con el juego congelado (como el chef de Costa Verde: estado 'cine' mientras habla) ---------------- */
  function talk(lines, done) {
    var G = G0();
    if (!(ACH.dialogo && ACH.dialogo.play)) { if (done) done(); return false; }
    var froze = false;
    if (G && G.state === 'playing') { G.state = 'cine'; call(ACH.hud, 'setState', 'cine'); froze = true; }
    ACH.dialogo.play(lines, { onDone: function () {
      if (froze && G.state === 'cine') { G.state = 'playing'; call(ACH.hud, 'setState', 'playing'); call(ACH.input, 'reset'); }
      if (done) { try { done(); } catch (e) { warn('talk.done', e); } }
    } });
    return true;
  }
  function L(quien, cara, texto) { return { quien: quien, cara: cara, texto: texto }; }
  function bubble(x, y, text, dur) { if (!St) return; St.bubbles.push({ x: x, y: y, s: text, t: 0, dur: dur || 2.6 }); if (St.bubbles.length > 4) St.bubbles.shift(); }

  /* ---------------- Rango gratis de una melodía (HABILIDADES.md: un punto = nivel; se gasta en la melodía) ---------------- */
  var MEL = { alivio: 'HUAYNO DEL ALIVIO', escudo: 'VALS DEL ESCUDO', mareo: 'CUMBIA DEL MAREO' };
  var QUIEN = { alivio: 'Doña Charo', escudo: 'Don Eusebio', mareo: 'DJ Fosforito' };
  function regalar(id) {
    var H = ACH.hab, res;
    if (H && typeof H.regalar === 'function') res = call(H, 'regalar', id, QUIEN[id]);   // P: 1 rango gratis (o 1 punto si ya está al máximo), una vez por id
    else res = 'no';
    // v0.13 fix: el aviso (con la tecla) ya lo da ACH.hab.regalar: un solo toast; aquí solo si no hay habilidades.js
    if (res === 'no' && !(H && typeof H.regalar === 'function')) toast('¡' + QUIEN[id].toUpperCase() + ' TE ENSEÑÓ ' + MEL[id] + '!');
    sfx('hab.nivel');
    return res;
  }

  /* ---------------- Cantar con E (Alexander rasguea 1,4 s y suena una melodía) ---------------- */
  function sing(G, done) {
    var p = G.player; if (!St || St.sing) return;
    St.sing = { t: 0, dur: 1.4, done: done };
    p.habStrumT = 1.4;
    sfx(['hab.alivio', 'hab.mareo', 'hab.escudo'][Math.floor(Math.random() * 3)], { x: p.x, y: p.y });
  }
  function tickSing(G, dt) {
    var s = St.sing; if (!s) return;
    s.t += dt;
    if (Math.random() < dt * 9) St.notes.push({ x: G.player.x + rand(-6, 6), y: G.player.y - 22, vy: -rand(14, 24), vx: rand(-8, 8), t: 0, life: 1.1, c: ['#ff2e88', '#ffe500', '#1fe07a'][Math.floor(Math.random() * 3)] });
    if (s.t >= s.dur) { St.sing = null; if (s.done) { try { s.done(); } catch (e) { warn('sing.done', e); } } }
  }

  /* ---------------- B1: los sobrevivientes ---------------- */
  function charo(G, near, cast) {
    var gb = GB(), c = St.charo, p = G.player, d = dist(p.x, p.y, gb.charo.x, gb.charo.y);
    if (!c.done && !c.called && d < 140) { c.called = true; bubble(gb.charo.x, gb.charo.y - 32, '¡Flaco! ¡Ven, cántate algo!'); }
    if (d > 30 && !(cast && d < 90)) return false;
    if (c.done) { if (near && pressedE()) bubble(gb.charo.x, gb.charo.y - 32, ['Cuídate, flaco.', '¿Otra canción? Ahorita no, que se me quema.', 'Sube al cerro, que allá hay gente.'][Math.floor(Math.random() * 3)]); return d <= 30; }
    if (!(pressedE() || cast)) return true;
    var A1 = [L('charo', 'feliz', 'Ya, causa, cántate algo y te sirvo tu plato. Pero al toque, que se enfría.'),
      L('alexander', 'picaro', 'Con su permiso, doña... un bolero, para el corazón.')];
    var A2 = [L('charo', 'risa', '¡Ay, qué bonito! Mi mamá me cantaba uno así cuando me enfermaba.'),
      L('charo', 'habla', 'Mira, te enseño el Huayno del Alivio. Con ese, hasta el cuerpo se te compone.'),
      L('charo', 'serio', 'Y oye... dicen que allá arriba, por el cerro, hay gente que se curó. Lo dijo una radio, la noche que se fue la luz.'),
      L('alexander', 'sorpresa', '¿Curarse? ¿De esto?'),
      L('charo', 'habla', 'Eso dijeron. Toma tu plato, flaco. Y no te mueras, que me debes otra canción.')];
    var go = function () { sing(G, function () { talk(A2, function () { finishCharo(G); }); }); };
    if (cast) talk(A2, function () { finishCharo(G); }); else talk(A1, go);
    return true;
  }
  function finishCharo(G) {
    if (St.charo.done) return;
    St.charo.done = true; flag('charo', true);
    var I = inv(), gb = GB();
    if (I && I.drop) I.drop(gb.charo.x + 6, gb.charo.y + 10, [{ id: 'papaHuevo', n: 1 }, { id: 'chocloQueso', n: 1 }, { id: 'emoliente', n: 1 }], false);
    regalar('alivio');
    call(ACH.objetivo, 'diario', 'cura-1', 'El rumor de la radio', 'Doña Charo: «Allá arriba, por el cerro, hay gente que se curó. Lo dijo una radio, la noche que se fue la luz.»');
    call(ACH.hab, 'addXP', 15);
    objective(); call(ACH.game, 'autoSave');
  }
  var EUS_NEED = [['chatarra', 2], ['jebe', 1], ['tablas', 1]];
  function eusebio(G, near) {
    var gb = GB(), e = St.eusebio, p = G.player, d = dist(p.x, p.y, gb.eusebio.x, gb.eusebio.y);
    if (d > 30) return false;
    if (!pressedE()) return true;
    if (e.done) { bubble(gb.eusebio.x, gb.eusebio.y - 32, ['Nada es basura, causa.', 'Todo es repuesto.', 'Ese vals silbalo bajito, que la mancha escucha.'][Math.floor(Math.random() * 3)]); return true; }
    var falta = EUS_NEED.filter(function (q) { return !has(q[0], q[1]); });
    if (!falta.length) {
      EUS_NEED.forEach(function (q) { call(inv(), 'take', q[0], q[1]); });
      talk([L('eusebio', 'feliz', '¡Eso, causa! Con esto armo hasta un escenario.'),
        L('eusebio', 'habla', 'Te silbo el Vals del Escudo. Mi viejo lo silbaba reciclando: nada te toca de frente.'),
        L('alexander', 'risa', '¡Un vals pa\' la mancha!'),
        L('eusebio', 'serio', 'Y no te confíes: por la espalda sí te muerden.')], function () {
        if (e.done) return;
        e.done = true; flag('eusebio', true);
        call(inv(), 'add', 'cuerdas', 2);
        regalar('escudo'); call(ACH.hab, 'addXP', 15);
        objective(); call(ACH.game, 'autoSave');
      });
      return true;
    }
    if (!e.met) {
      e.met = true;
      talk([L('eusebio', 'habla', 'Nada es basura, causa. Todo es repuesto.'),
        L('eusebio', 'habla', 'Tráeme 2 de chatarra, 1 de jebe y 1 de tablas, y te enseño un vals de los de antes.'),
        L('alexander', 'mueca', '¿Y de dónde saco eso, don?'),
        L('eusebio', 'picaro', 'Rompe carros, carretillas, triciclos... con la guitarra, pues. Y fíjate en la azotea de enfrente del paradero: alguien dejó una escalera.')], function () { objective(); });
      return true;
    }
    var names = { chatarra: 'chatarra', jebe: 'jebe', tablas: 'tablas' };
    bubble(gb.eusebio.x, gb.eusebio.y - 32, 'Me falta: ' + falta.map(function (q) { var I = inv(), n = q[1] - (I && I.count ? I.count(q[0]) : 0); return n + ' ' + names[q[0]]; }).join(', '));
    return true;
  }
  function fosforito(G, near) {
    var gb = GB(), F = St.fos, p = G.player, fx = gb.fosforito.x, fy = gb.fosforito.y, d = dist(p.x, p.y, fx, fy);
    if (F.done) {
      if (d <= 30 && pressedE()) bubble(fx, fy - 32, ['¡Habla, Callao!', 'Esto no es el fin del mundo, es el after.', 'La 73 anda suelta por la escalera, ojo.'][Math.floor(Math.random() * 3)]);
      return d <= 30;
    }
    if (!F.mancha && d < 340) spawnMancha(G, fx, fy);
    if (!F.called && d < 260) { F.called = true; bubble(fx, fy - 34, '¡Auxilio! ¡Sáquenme de aquí, causa!', 3); }
    var alive = 0;
    if (F.mancha) for (var i = 0; i < F.mancha.length; i++) {
      var z = F.mancha[i];
      if (z.state === 'muerto' || G.zombies.indexOf(z) < 0) continue;
      alive++;
      // la mancha no se aleja de su presa
      if ((z.state === 'deambular' || z.state === 'investigar') && dist(z.x, z.y, fx, fy) > 46) { z.state = 'investigar'; z.tx = fx + rand(-24, 24); z.ty = fy + rand(-14, 14); z.lostT = 0; }
    }
    F.alive = alive;
    F.nagT -= 1 / 60;
    if (alive && d < 60 && F.nagT <= 0) { F.nagT = 3; bubble(fx, fy - 34, '¡Primero los zombis, causa! Son ' + alive + '.'); }
    if (F.mancha && !alive && d < 70) {
      talk([L('fosforito', 'risa', '¡Habla, Callao! Esto no es el fin del mundo, es el after.'),
        L('fosforito', 'habla', 'Me salvaste, mano. Toma: la Cumbia del Mareo. Con esta hasta los muertos bailan. Literal.'),
        L('fosforito', 'feliz', 'Y llévate mi setlist. Cuando armes tu concierto, me avisas.'),
        L('alexander', 'sorpresa', '¿Un concierto? ¿Ahorita?'),
        L('fosforito', 'picaro', 'El fin del mundo también necesita música, causa.'),
        L('fosforito', 'serio', 'Anda a la escalera del cerro... pero ojo: la combi de la 73 anda dando vueltas, y su chofer ya no frena.')], function () {
        if (F.done) return;
        F.done = true; flag('fosforito', true);
        regalar('mareo'); call(ACH.hab, 'addXP', 20);
        call(ACH.concierto, 'dar', 'setlist');
        objective(); call(ACH.game, 'autoSave');
      });
      return true;
    }
    return d <= 30;
  }
  function spawnMancha(G, fx, fy) {
    var W = Wd(), E = ACH.ent, out = [], k, a, x, y;
    for (k = 0; k < 6; k++) {
      for (var tries = 0; tries < 10; tries++) {
        a = k / 6 * Math.PI * 2 + rand(-0.3, 0.3); x = fx + Math.cos(a) * rand(26, 40); y = fy + Math.sin(a) * rand(14, 22);
        if (!W.collideCircle(x, y, 6)) break;
      }
      var z = E.makeZombie('caminante', x, y); z.gbMancha = true; z.state = 'investigar'; z.tx = fx; z.ty = fy;
      G.zombies.push(z); out.push(z);
    }
    St.fos.mancha = out;
  }

  /* ---------------- B4: Don Lucho (cobrador de la cuadra 1) ---------------- */
  function setupLucho(G, dead) {
    var gb = GB(); St.lucho = null;
    if (dead || !G || !G.zombies) return;
    var best = null, bd = 1e9;
    for (var i = 0; i < G.zombies.length; i++) { var z = G.zombies[i]; if (z.type !== 'cobrador') continue; var d = dist(z.x, z.y, gb.lucho.x, gb.lucho.y); if (d < bd) { bd = d; best = z; } }
    if (!best || bd > 120) return;
    best.lucho = true; best.luchoF = 'espera'; best.hp = Math.max(best.hp, 4); best.hpMax = best.hp; best.noLoot = false;
    try { var Zl = ACH.sprites && ACH.sprites.zvar; if (Zl && Zl.gb_lucho && ACH.zvar && ACH.zvar.setLoco) { ACH.zvar.setLoco(best, 'camina', Math.random); best.loco = 'camina'; best.skin = 'gb_lucho'; best.shield = false; best.low = false; } } catch (eL) { /* queda su skin de cobrador */ }   // v0.13 T3 (S): skin propio de Don Lucho
    St.lucho = best;
  }
  function luchoUpdate(G, z, dt) {
    z.zpose = z.luchoF === 'quieto' ? 'windup' : null; z.zposeF = 0;   // v0.13 T3 (S): levanta el talonario al pedir el pasaje
    if (z.skin !== 'gb_lucho') { try { var Zl2 = ACH.sprites && ACH.sprites.zvar; if (Zl2 && Zl2.gb_lucho && ACH.zvar && ACH.zvar.setLoco) { ACH.zvar.setLoco(z, 'camina', Math.random); z.loco = 'camina'; z.skin = 'gb_lucho'; z.shield = false; z.low = false; } } catch (eL2) { /* nada */ } }   // por si zvar.balance le cambió el skin
    var p = G.player, d = dist(z.x, z.y, p.x, p.y);
    if (z.luchoFreeze > 0) { z.luchoFreeze -= dt; z.moving = false; if (z.state === 'atacar') z.state = 'perseguir'; return true; }
    if (z.luchoF === 'espera') {
      if (d < 100 && p.hp > 0 && Wd().los(z.x, z.y - 6, p.x, p.y - 6)) { z.luchoF = 'quieto'; z.luchoT = 2; z.moving = false; bubble(z.x, z.y - 36, '...¿pasaje, joven?', 2.2); sfx('zombie.idle', { x: z.x, y: z.y }); }
      return false;
    }
    if (z.luchoF === 'quieto') {
      z.luchoT -= dt; z.moving = false; z.flip = p.x < z.x;
      if (z.luchoT <= 0) {
        z.luchoF = 'pelea';
        talk([L('lucho', 'habla', '...¿Pasaje, joven? ¿Pasaje?'),
          L('alexander', 'sorpresa', '¿Don Lucho? ¡Usted me bajaba de la combi todos los días!'),
          L('lucho', 'molesta', '¡Baja, baja, aquí no se canta! ¡Al fondo hay sitio! ¡Al fondooo!'),
          L('alexander', 'triste', 'Hasta muerto me bota...'),
          L('alexander', 'serio', 'Esta vez no me bajas, Don Lucho.')]);
      }
      return true;
    }
    return false;
  }
  function luchoDeath(G, z) {
    if (!St) return;
    flag('lucho', true);
    var I = inv();
    if (I && I.drop && !has('llavesCombi')) I.drop(z.x, z.y, [{ id: 'llavesCombi', n: 1 }], false);
    toast('Don Lucho soltó las LLAVES DE COMBI');
    bubble(G.player.x, G.player.y - 34, 'Descanse, Don Lucho. Pasaje libre.', 3);
    St.lucho = null; objective();
  }
  ACH.zbeh = ACH.zbeh || {};
  (function () {
    var prev = ACH.zbeh.cobrador;
    ACH.zbeh.cobrador = {
      init: prev && prev.init, onHit: prev && prev.onHit,
      update: function (G, z, dt) { if (z.lucho && St) return luchoUpdate(G, z, dt); return prev && prev.update ? prev.update(G, z, dt) : false; },
      onDeath: function (G, z) { if (z.lucho) luchoDeath(G, z); if (prev && prev.onDeath) prev.onDeath(G, z); }
    };
  })();
  // la combi volcada del paradero: con las llaves se abre (botín fijo)
  function combiVolcada(G) {
    var gb = GB(), p = G.player, cx = gb.combi.x, cy = gb.combi.y - 8;
    if (Math.abs(p.x - cx) > 54 || Math.abs(p.y - cy) > 34) return false;
    if (!pressedE()) return true;
    if (St.combiOpen) { bubble(cx, cy - 34, 'Ya no queda nada, causa.'); return true; }
    // anti-atasco: las llaves del suelo se borran a los 60 s (o se guardó antes de recogerlas); si Don Lucho ya cayó, aparecen aquí
    if (!has('llavesCombi') && flag('lucho') && !(call(inv(), 'groundItems') || []).some(function (g) { return g.id === 'llavesCombi'; })) { call(inv(), 'add', 'llavesCombi', 1); toast('Encontraste las LLAVES DE COMBI tiradas junto a la puerta'); }
    if (!has('llavesCombi')) { bubble(cx, cy - 34, 'Cerrada con llave. El cobrador de la cuadra siempre las tenía...', 3); return true; }
    St.combiOpen = true; flag('combi', true);
    call(inv(), 'drop', cx + 8, cy + 22, [{ id: 'resortera', n: 1 }, { id: 'piedras', n: 15 }, { id: 'uhu', n: 1 }, { id: 'sencillo', n: 10 }], false);
    sfx('fridge.open', { x: cx, y: cy }); ACH.fx && ACH.fx.text && ACH.fx.text(cx, cy - 30, '¡CLIC!', '#ffe500');
    bubble(p.x, p.y - 34, '¡La guantera de la combi! Resortera, piedras, Uhu... ¡y el sencillo del pasaje!', 3.2);
    objective(); call(ACH.game, 'autoSave');
    return true;
  }

  /* ---------------- B2: El Chofer ---------------- */
  var CH = { hp: 25, warn: 1, speed: 220, stun: 2.5, cruise: 70, hit: 24, xp: 120, maxRun: 560, r: 9 };
  if (ACH.ent && ACH.ent.ZT && !ACH.ent.ZT.gb_chofer) ACH.ent.ZT.gb_chofer = { hp: CH.hp, speed: 40, anim: 6, sight: 400, dmg: CH.hit, blind: false, lunge: false };
  ACH.zbeh.gb_chofer = {
    init: function (G, z) {
      z.skin = 'gb_chofer'; z.loco = null; z.hp = CH.hp; z.hpMax = CH.hp; z.noLoot = true; z.boss = 'chofer';
      z.cs = 'entra'; z.csT = 0; z.dir = 1; z.zpose = null; z.zposeF = 0;
    },
    update: function (G, z, dt) { try { choferUpdate(G, z, dt); } catch (e) { warn('chofer', e); } return true; },
    onHit: function (G, z, src, ho) { if (z.cs === 'aturdida') return 'parry'; return undefined; },
    onDeath: function (G, z) { choferDeath(G, z); }
  };
  function ensureChoferArt() {
    var Z = ACH.sprites && (ACH.sprites.zvar = ACH.sprites.zvar || {});
    if (Z && !Z.gb_chofer && ACH.sprites.gb) { try { Z.gb_chofer = ACH.sprites.gb.choferSet(); } catch (e) { warn('choferArt', e); } }
  }
  function choferTrigger(G) {
    if (St.choferDone || St.choferOn) return;
    var gb = GB(), p = G.player;
    var ready = St.fos.done || G.time >= 720;
    if (p.x < 104 * T) return;
    if (!ready) {
      if (p.x > 112 * T && p.y < 15 * T && !St.calNag) { St.calNag = true; bubble(p.x, p.y - 34, 'Tapado con calamina... Primero ayudo a la gente del barrio.', 3); }
      return;
    }
    St.choferOn = true;
    ensureChoferArt();
    var W = Wd(), sx = 96 * T, sy = 28.5 * T;
    for (var tr = 0; tr < 40 && W.collideCircle(sx, sy, CH.r + 2); tr++) { sx = (94 + (tr % 8) * 2) * T; sy = (16.5 + Math.floor(tr / 8) * 4) * T; }
    var z = ACH.ent.makeZombie('gb_chofer', sx, sy);
    z.cs = 'entra'; z.dir = 1;
    G.zombies.push(z); St.chofer = z;
    sfx('gb.bocina', { x: z.x, y: z.y });
    var go = function () { z.cs = 'acecho'; z.csT = 0; objective(); };
    if (St.choferIntro) { go(); return; }
    St.choferIntro = true; flag('choferVisto', true);
    talk([L('chofer', 'molesta', '¡AL FONDO HAY SITIO! ¡AL FONDO HAY SITIOOO!'),
      L('alexander', 'sorpresa', '¿El chofer de la 73? ¡Ese nunca frenaba en el paradero!'),
      L('alexander', 'serio', 'Si me le cruzo, que se estrelle contra algo: un carro, una barricada... ¡el cerro!'),
      L('alexander', 'picaro', 'Y cuando quede atontado, guitarrazo. O lo que tenga a la mano.'),
      L('titina', 'molesta', '¡Grrú!')], go);
  }
  function laneY(y) { var gb = GB(); return Math.max(gb.chofer.y0, Math.min(gb.chofer.y1, y)); }
  function choferUpdate(G, z, dt) {
    var p = G.player, W = Wd(), alive = p.hp > 0 && G.state === 'playing';
    z.kbx = 0; z.kby = 0; z.animT += 0;
    z.csT += dt;
    if (z.habSlowT > 0) dt *= Math.max(0.35, z.habSlowMul || 1);   // la cumbia también la marea un poco
    switch (z.cs) {
      case 'entra': z.zpose = null; z.moving = true; z.flip = false; W.moveCircle(z, 60 * dt, 0, CH.r); if (z.csT > 3) { z.cs = 'acecho'; z.csT = 0; } return;
      case 'acecho': {
        z.zpose = null;
        var far = dist(z.x, z.y, p.x, p.y) > 520 || !alive;
        var side = (z.x < p.x ? -1 : 1), tx = far ? 108 * T : p.x + side * 170, ty = far ? 30.6 * T : laneY(p.y);
        tx = Math.max(60 * T, Math.min(118 * T, tx));
        var dx = tx - z.x, dy = ty - z.y, l = Math.sqrt(dx * dx + dy * dy);
        if (l > 3) { var sp = CH.cruise; W.moveCircle(z, dx / l * sp * dt, dy / l * sp * dt, CH.r); z.moving = true; if (Math.abs(dx) > 2) z.flip = dx < 0; } else z.moving = false;
        if (!far && z.csT > 1.4 && (Math.abs(z.y - ty) < 10 || z.csT > 3.5)) { z.cs = 'aviso'; z.csT = 0; z.dir = p.x > z.x ? 1 : -1; z.flip = z.dir < 0; sfx('gb.bocina', { x: z.x, y: z.y }); }
        return;
      }
      case 'aviso':
        z.zpose = 'aviso'; z.zposeF = Math.floor(z.csT * 8) % 2; z.moving = false;
        if (Math.abs(p.y - z.y) > 4 && z.csT < 0.5) W.moveCircle(z, 0, (p.y > z.y ? 1 : -1) * 30 * dt, CH.r);   // se acomoda medio carril
        if (z.csT >= CH.warn) { z.cs = 'carrera'; z.csT = 0; z.run = 0; z.hitP = false; }
        return;
      case 'carrera': {
        z.zpose = null; z.moving = true; z.animT += dt * 2;
        var step = CH.speed * dt, n = Math.ceil(step / 4), hit = false;
        for (var i = 0; i < n && !hit; i++) {
          var bx = z.x; hit = W.moveCircle(z, z.dir * step / n, 0, CH.r);
          if (Math.abs(z.x - bx) < 0.01) hit = true;
        }
        z.run += step;
        // atropella a Alexander (salvo que salte) y a los zombis que se cruzan
        var fx0 = z.x + z.dir * 8, inFront = Math.abs(p.x - fx0) < 34 && Math.abs(p.y - (z.y - 4)) < 13;
        if (alive && !z.hitP && inFront && (p.z || 0) <= 6) {
          z.hitP = true;
          ACH.ent.hurtPlayer(G, CH.hit, { from: { x: z.x, y: z.y }, push: { x: z.dir, y: p.y < z.y ? -0.8 : 0.8, f: 46 }, stun: 0.5, src: 'chofer' });
          call(ACH.fx, 'shake', 4, 0.3);
        }
        for (var k = 0; k < G.zombies.length; k++) {
          var o = G.zombies[k]; if (o === z || o.state === 'muerto' || o.social) continue;
          if (Math.abs(o.x - fx0) < 30 && Math.abs(o.y - z.y) < 12) { try { ACH.ent.hitZombie(G, o, z.dir, 0, { dmg: 9, knock: 30, src: 'chofer', from: { x: z.x - z.dir * 20, y: z.y } }); } catch (e) { /* nada */ } }
        }
        if (hit) {
          z.cs = 'aturdida'; z.csT = 0; z.moving = false;
          sfx('gb.choque', { x: z.x, y: z.y }); sfx('prop.break.car', { x: z.x + z.dir * 30, y: z.y });
          call(ACH.fx, 'shake', 5, 0.45); call(ACH.fx, 'text', z.x, z.y - 46, '¡CRASH!', '#ffe500');
          if (!St.stunTip) { St.stunTip = true; bubble(p.x, p.y - 34, '¡Se estrelló! ¡Ahora, guitarrazo!', 2.4); }
        } else if (z.run > CH.maxRun || z.x < 58 * T || z.x > 122 * T) { z.cs = 'frena'; z.csT = 0; }
        return;
      }
      case 'frena':
        z.zpose = null; z.moving = false;
        if (z.csT > 0.7) { z.cs = 'acecho'; z.csT = 0; z.flip = p.x < z.x; }
        return;
      case 'aturdida':
        z.zpose = 'stun'; z.zposeF = Math.floor(z.csT * 5) % 2; z.moving = false;
        if (z.csT >= CH.stun) {
          z.cs = 'acecho'; z.csT = 0;
          W.moveCircle(z, -z.dir * 10, 0, CH.r);   // retrocede del choque
        }
        return;
    }
  }
  // el golpe de guitarra deja al zombi en 'golpeado' un paso: lo devolvemos a su estado (sin empuje)
  function choferFix(G) {
    var z = St.chofer; if (!z || z.state === 'muerto') return;
    if (z.state === 'golpeado') { z.state = 'perseguir'; z.kbx = 0; z.kby = 0; z.stunT = 0; }
    else if (z.state !== 'perseguir') z.state = 'perseguir';
  }
  function choferDeath(G, z) {
    if (!St || St.choferDone) return;
    St.choferDone = true; St.choferOn = false; flag('chofer', true);
    call(ACH.hab, 'addXP', CH.xp - 8);   // onKill ya dio 8: 120 en total
    call(ACH.fx, 'shake', 6, 0.6);
    sfx('gb.choque', { x: z.x, y: z.y }); sfx('vehicle.fall', { x: z.x, y: z.y });
    St.cal = 'cae'; St.calT = 0;
    call(Wd(), 'setEscalera', true);
    talk([L('alexander', 'cansado', 'Uff... Última parada, compadre.'),
      L('alexander', 'picaro', 'Y sin pagar pasaje. ¡La escalera está libre!'),
      L('titina', 'feliz', '¡Grrú!')], function () { objective(); call(ACH.game, 'autoSave'); });
  }

  /* ---------------- B5: pasajes, azotea, la lata y la noche ---------------- */
  var FOODS = ['anticucho', 'panChicharron', 'papaHuevo', 'chocloQueso', 'emoliente', 'gaseosa', 'agua', 'taper'];
  function firstFood() {
    var I = inv(); if (!I || !I.has) return null;
    for (var i = 0; i < FOODS.length; i++) if (I.has(FOODS[i])) return FOODS[i];
    var sn = I.snapshot ? I.snapshot() : null;
    if (sn && sn.slots) for (var j = 0; j < sn.slots.length; j++) { var s = sn.slots[j]; if (s && I.isFood && I.isFood(s.id)) return s.id; }
    return null;
  }
  function perro(G, dt) {
    var gb = GB(), P = St.perro, p = G.player;
    P.f += dt;
    if (P.state === 'herido') {
      var d = dist(p.x, p.y, P.x, P.y);
      if (d < 28) {
        if (pressedE()) {
          var food = firstFood();
          if (!food) { bubble(P.x, P.y - 22, 'El perrito tiene hambre... ¿no tienes algo de comer?', 2.6); return true; }
          call(inv(), 'take', food, 1);
          talk([L('alexander', 'triste', 'Ya, ya, compadre... ¿quién te hizo eso?'), L('alexander', 'feliz', 'Toma, come. Hoy invito yo.'), L('titina', 'molesta', '¡Grrú! ¡Grrú!')], function () {
            P.state = 'sigue'; P.t = 90; flag('perro', true); sfx('dog.bark', { x: P.x, y: P.y });
          });
        }
        return true;
      }
      return false;
    }
    if (P.state === 'sigue') {
      P.t -= dt;
      var tx = p.x - 16, ty = p.y + 6, dx = tx - P.x, dy = ty - P.y, l = Math.sqrt(dx * dx + dy * dy);
      if (l > 140) { P.x = tx; P.y = ty; }
      else if (l > 10) { var sp = Math.min(110, l * 3); Wd().moveCircle(P, dx / l * sp * dt, dy / l * sp * dt, 4); }
      // ladra a los zombis que se acercan: los distrae un momento
      P.barkCD = (P.barkCD || 0) - dt;
      if (P.barkCD <= 0) for (var i = 0; i < G.zombies.length; i++) {
        var z = G.zombies[i]; if (z.state === 'muerto' || z.social || z.boss) continue;
        if (dist(z.x, z.y, P.x, P.y) < 56) { P.barkCD = 2.5; sfx('dog.bark', { x: P.x, y: P.y }); z.state = 'investigar'; z.tx = P.x; z.ty = P.y; z.lostT = 0; break; }
      }
      if (P.t <= 0) { P.state = 'sano'; bubble(P.x, P.y - 20, '¡Guau!', 1.5); P.x = gb.perro.x; P.y = gb.perro.y; }
    }
    return false;
  }
  function vecina(G, near, cast) {
    var gb = GB(), V = St.vecina, p = G.player, d = dist(p.x, p.y, gb.vecina.x, gb.vecina.y);
    if (V.done) return false;
    if (!V.called && d < 90) { V.called = true; bubble(gb.vecina.x, gb.vecina.y - 32, '¡Joven! ¡Cántese algo, que acá no hay ni radio!', 3); }
    var sang = cast && d < 90;
    if (d > 30 && !sang) return false;
    if (!(pressedE() || sang)) return true;
    var lines = [L('vecina', 'feliz', '¡Ay, qué rico! Hace días que no escucho nada que no sea gemido.'), L('vecina', 'habla', 'Tome, por la molestia. Ahora sí le pagan, ¿no?'), L('alexander', 'risa', '¡Ahora sí me pagan!')];
    var end = function () { if (V.done) return; V.done = true; flag('vecina', true); call(inv(), 'drop', gb.vecina.x, gb.vecina.y + 14, [{ id: 'sencillo', n: 8 }, { id: 'gaseosa', n: 1 }], false); };
    if (sang) talk(lines, end); else sing(G, function () { talk(lines, end); });
    return true;
  }
  function pasaje2(G) {
    var gb = GB(), p = G.player;
    if (!St.uhuSeen && dist(p.x, p.y, gb.uhu.x, gb.uhu.y) < 46) { St.uhuSeen = true; bubble(p.x, p.y - 34, '¡Un Uhu escondido! Alguien lo guardaba pa\' su guitarra.', 3); }
  }
  function azotea(G) {
    if (St.azotea) return;
    var gb = GB(), A = gb.azotea, p = G.player;
    if (p.y < (A.r0 + 0.2) * T || p.x < A.c0 * T || p.x > (A.c1 + 1) * T) return;
    St.azotea = true; flag('azotea', true);
    call(inv(), 'drop', (A.c0 + 4) * T, (A.r0 + 2.5) * T, [{ id: 'chatarra', n: 2 }, { id: 'jebe', n: 1 }, { id: 'tablas', n: 1 }, { id: 'gaseosa', n: 1 }, { id: 'sencillo', n: 6 }], false);
    bubble(p.x, p.y - 34, '¡La azotea tenía de todo! Esto le sirve a Don Eusebio.', 3);
  }
  function windows() { var W = Wd(); return (W.SOCIAL && W.SOCIAL.windows) || []; }
  function lata(G, near, cast) {
    var ws = windows(), p = G.player;
    if (p.y < 11 * T || p.y > 14 * T + 4) return false;
    for (var i = 0; i < ws.length; i++) {
      if (St.lata[i]) continue;
      var w = ws[i], cx = w.x + 9;
      if (Math.abs(p.x - cx) > 26) continue;
      if (cast || (pressedE() && !St.sing)) {
        var go = function (idx, wx) { return function () { lataPay(G, idx, wx); }; };
        if (cast) go(i, cx)(); else sing(G, go(i, cx));
      }
      return true;
    }
    return false;
  }
  var LATA_TXT = ['¡Ahora sí me pagan!', '¡Gracias, vecino!', '¡Una más, una más!', '¡Que viva el Callao!', '¡Por fin un público que paga!'];
  function lataPay(G, i, x) {
    if (St.lata[i]) return;
    St.lata[i] = true; flag('lata' + i, true);
    var r = Math.random(), items = r < 0.6 ? [{ id: 'sencillo', n: 1 + Math.floor(Math.random() * 3) }] : [{ id: r < 0.8 ? 'panChicharron' : 'gaseosa', n: 1 }];
    call(inv(), 'drop', x, 11 * T + 8, items, false);
    bubble(G.player.x, G.player.y - 34, LATA_TXT[i % LATA_TXT.length], 2.2);
    sfx('loot.coins', { x: x, y: 11 * T });
  }
  function night(G, dt) {
    var N = ACH.noche, nt = N && N.isNight && N.isNight() ? (N.t === undefined ? 1 : N.t) : 0;
    if (!nt) return;
    var W = Wd(), Nn = St.night;
    if (!Nn.cut && nt >= 0.5) {
      Nn.cut = true;
      ['N', 'S'].forEach(function (s) { (W.poles[s] || []).forEach(function (pr) { pr.lampOut = true; pr.lampFlickUntil = G.clock + rand(0.4, 2.2); }); });
      if (ACH.inter && typeof ACH.inter.onLampOut === 'function') { try { ACH.inter.onLampOut(); } catch (e) { /* nada */ } }
      toast('¡Se fue la luz en toda la Gambetta!'); sfx('pole.spark', { x: G.player.x, y: G.player.y - 40 });
      Nn.nextT = 20;
    }
    if (!Nn.cut) return;
    Nn.nextT -= dt;
    if (Nn.nextT > 0) return;
    Nn.nextT = 45;
    var alive = 0; for (var i = 0; i < G.zombies.length; i++) if (G.zombies[i].state !== 'muerto') alive++;
    if (alive > 48) return;
    var gb = GB(), tgt = gb.manchas[Nn.side++ % gb.manchas.length], V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
    var side = Math.random() < 0.5 ? -1 : 1, sx = G.cam.x + V.w / 2 + side * (V.w / 2 + 50);
    if (sx < 3 * T || sx > 117 * T) sx = G.cam.x + V.w / 2 - side * (V.w / 2 + 50);
    sx = Math.max(3 * T, Math.min(117 * T, sx));
    var n = 5 + (Math.random() < 0.5 ? 1 : 0), made = 0;
    for (var k = 0; k < n; k++) {
      var x = sx + rand(-20, 20), y = rand(17, 33) * T;
      if (W.collideCircle(x, y, 6)) continue;
      var z = ACH.ent.makeZombie('caminante', x, y); z.state = 'investigar'; z.tx = tgt.x + rand(-30, 30); z.ty = tgt.y + rand(-8, 8);
      G.zombies.push(z); made++;
    }
    if (made) { Nn.n++; toast('¡Se viene la mancha hacia ' + tgt.label + '!'); G.hordeAt = G.time; }
  }

  /* ---------------- Objetivo (ACH.objetivo): guía en orden, pero todo se puede hacer en cualquier orden ---------------- */
  function objText() {
    if (!St) return '';
    if (St.choferDone) return 'Sube la escalera al cerro';
    if (St.choferOn) return 'Vence a El Chofer: que se estrelle contra algo y castígalo';
    if (!St.charo.done) return 'Encuentra a Doña Charo en su bodega (vereda norte, al inicio)';
    if (!St.eusebio.done && !St.fos.done) return St.eusebio.met ? 'Junta 2 chatarra, 1 jebe y 1 tablas para Don Eusebio · o rescata a DJ Fosforito' : 'Busca a Don Eusebio en el patio de contenedores (vereda sur)';
    if (!St.fos.done) return 'Rescata a DJ Fosforito: lo rodea una mancha cerca de la tarima';
    if (!St.eusebio.done) return 'Ve a la escalera del cerro · Don Eusebio todavía espera sus materiales';
    return 'Ve a la escalera del cerro, al final de la avenida';
  }
  function objective(force) {
    if (!St) return;
    var t = objText();
    if (force || t !== St.objLast) { St.objLast = t; call(ACH.objetivo, 'set', t); }
  }

  /* ---------------- Paso de juego ---------------- */
  function update(G, dt) {
    if (!St || !GB() || !G.player) return;
    St.t += dt;
    if (!St.played) { St.played = true; objective(true); }
    var p = G.player, strum = p.habStrumT || 0, cast = strum > 0 && St.lastStrum <= 0 && !St.sing;
    St.lastStrum = strum;
    tickSing(G, dt);
    if (cast) {   // una melodía frena a Don Lucho
      var Lz = St.lucho;
      if (Lz && Lz.state !== 'muerto' && dist(Lz.x, Lz.y, p.x, p.y) < 120) { Lz.luchoFreeze = 3; bubble(Lz.x, Lz.y - 36, '...esa... me la sé...', 2.4); }
    }
    var busy = dlgOn() || St.sing || G.state !== 'playing';
    St.near = null;
    if (!busy) {
      var nears = [['charo', charo(G, true, cast)], ['eusebio', eusebio(G, true)], ['fosforito', fosforito(G, true)], ['combi', combiVolcada(G)],
        ['perro', perro(G, dt)], ['vecina', vecina(G, true, cast)], ['lata', lata(G, true, cast)]];
      for (var i = 0; i < nears.length; i++) if (nears[i][1]) { St.near = nears[i][0]; break; }
    } else if (St.perro.state === 'sigue') perro(G, dt);
    pasaje2(G); azotea(G);
    if (!St.choferDone) choferTrigger(G);
    if (St.chofer) choferFix(G);
    night(G, dt);
    pushNPCs(G);
    if (St.cal === 'cae') { St.calT += dt; if (St.calT > 0.9) St.cal = 'abierta'; }
    for (var b = St.bubbles.length - 1; b >= 0; b--) { St.bubbles[b].t += dt; if (St.bubbles[b].t > St.bubbles[b].dur) St.bubbles.splice(b, 1); }
    for (var n = St.notes.length - 1; n >= 0; n--) { var q = St.notes[n]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.t > q.life) St.notes.splice(n, 1); }
    St.objT -= dt; if (St.objT <= 0) { St.objT = 1; objective(); }
  }
  function npcList() {
    var gb = GB(); if (!gb) return [];
    return [{ id: 'charo', x: gb.charo.x, y: gb.charo.y }, { id: 'eusebio', x: gb.eusebio.x, y: gb.eusebio.y }, { id: 'fosforito', x: gb.fosforito.x, y: gb.fosforito.y },
      { id: 'vecina', x: gb.vecina.x, y: gb.vecina.y }];
  }
  function pushNPCs(G) {
    var p = G.player, l = npcList();
    for (var i = 0; i < l.length; i++) {
      var dx = p.x - l[i].x, dy = p.y - l[i].y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < 7 && d > 0.01) Wd().moveCircle(p, dx / d * (7 - d), dy / d * (7 - d), (ACH.ent.CFG.radius || 5));
    }
  }

  /* ---------------- Dibujo ---------------- */
  function spr(id, f) { var A = ACH.sprites && ACH.sprites.gb; return A ? A.npc(id, f) : null; }
  function blit(g, c, x, y, flip) {
    if (!c) return;
    if (!flip) { g.drawImage(c, Math.round(x - c.ax), Math.round(y - c.ay)); return; }
    g.save(); g.translate(Math.round(x), Math.round(y)); g.scale(-1, 1); g.drawImage(c, -c.ax, -c.ay); g.restore();
  }
  function drawables(G) {
    if (!St || !GB()) return null;
    var gb = GB(), out = [], t = St.t, A = ACH.sprites && ACH.sprites.gb;
    npcList().forEach(function (n) {
      out.push({ y: n.y, x: n.x, draw: function (g, cx, cy) {
        var f = n.id === 'fosforito' && !St.fos.done ? Math.floor(t * 4) : Math.floor(t * 1.6 + n.x);
        blit(g, spr(n.id, f), n.x - cx, n.y - cy, n.id === 'eusebio');
      } });
    });
    var P = St.perro;
    out.push({ y: P.y, x: P.x, draw: function (g, cx, cy) { blit(g, spr(P.state === 'herido' ? 'perro' : 'perroSano', Math.floor(t * (P.state === 'sigue' ? 6 : 1.2))), P.x - cx, P.y - cy, P.state === 'sigue' && G.player.x < P.x); } });
    if (A) {
      var E = gb.escalera;
      if (St.cal !== 'abierta') out.push({ y: E.y - 1, draw: function (g, cx, cy) {
        var c = A.calamina(); if (!c) return;
        if (St.cal === 'cae') { var k = Math.min(1, St.calT / 0.9); g.save(); g.globalAlpha = 1 - k; g.translate(E.x0 - cx, E.y - cy); g.rotate(-k * 0.5); g.drawImage(c, 0, -c.height + k * 10); g.restore(); return; }
        g.drawImage(c, E.x0 - cx, E.y - cy - c.ay);
      } });
      var Az = gb.azotea, lx = Az.ladder.c * T + 8, ly = Az.ladder.r * T + 14;
      out.push({ y: ly, draw: function (g, cx, cy) { blit(g, A.escalera(), lx - cx, ly - cy, false); } });
    }
    return out;
  }
  function textBox(g, s, x, y, col) {
    g.font = '8px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    var w = Math.ceil(g.measureText(s).width) + 8, V = (ACH.render && ACH.render.VIEW) || { w: 480 };
    x = Math.max(w / 2 + 2, Math.min(V.w - w / 2 - 2, x));
    g.fillStyle = 'rgba(19,16,21,0.86)'; g.fillRect(Math.round(x - w / 2), Math.round(y - 6), w, 12);
    g.fillStyle = col || '#f3efe2'; g.fillText(s, Math.round(x), Math.round(y) + 0.5);
  }
  var PROMPT = { charo: 'E cantar', eusebio: 'E hablar', fosforito: 'E hablar', combi: 'E abrir', perro: 'E dar comida', vecina: 'E cantar', lata: 'E pasar la lata' };
  function isTouch() { return !!(document.body && document.body.classList.contains('touch')); }
  function nearCtx() {   // v0.13: en táctil el botón contextual hace de E con los vecinos de la Gambetta
    var G = G0(); if (!St || !St.near || !PROMPT[St.near] || St.sing || !G || G.state !== 'playing') return null;
    if ((St.near === 'perro' && St.perro.state !== 'herido') || (St.near === 'combi' && St.combiOpen)) return null;
    return { label: PROMPT[St.near].slice(2).toUpperCase(), code: 'KeyE' };
  }
  (function wrapCtx() {
    var A = ACH.armas; if (!A || typeof A.context !== 'function' || A.context._gb) { if (!A) setTimeout(wrapCtx, 500); return; }
    var oC = A.context; A.context = function () { return nearCtx() || oC.apply(this, arguments); }; A.context._gb = true;
  })();
  function drawScreen(g, G, cx, cy) {
    if (!St || !GB() || !G.player) return;
    var p = G.player;
    if (G.state === 'playing' && St.near && PROMPT[St.near] && !St.sing) {
      var ok = !(St.near === 'perro' && St.perro.state !== 'herido') && !(St.near === 'combi' && St.combiOpen);
      if (ok) textBox(g, isTouch() ? '▸ ' + PROMPT[St.near].slice(2) : PROMPT[St.near], p.x - cx, p.y - cy - 40, '#ffe500');
    }
    St.bubbles.forEach(function (b) { var a = b.t < 0.15 ? b.t / 0.15 : 1; g.globalAlpha = a; textBox(g, b.s, b.x - cx, b.y - cy - b.t * 3, '#f3efe2'); g.globalAlpha = 1; });
    St.notes.forEach(function (q) { g.globalAlpha = Math.max(0, 1 - q.t / q.life); g.fillStyle = q.c; var x = Math.round(q.x - cx), y = Math.round(q.y - cy); g.fillRect(x, y, 2, 2); g.fillRect(x + 1, y - 4, 1, 4); g.fillRect(x + 2, y - 4, 2, 1); g.globalAlpha = 1; });
    // nombre de Don Lucho
    var Lz = St.lucho;
    if (Lz && Lz.state !== 'muerto' && dist(Lz.x, Lz.y, p.x, p.y) < 170) textBox(g, 'DON LUCHO', Lz.x - cx, Lz.y - cy - 40, '#ff8a30');
    // barra de vida de El Chofer
    var z = St.chofer;
    if (z && St.choferOn && z.state !== 'muerto') {
      var V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }, bw = 150, bx = Math.round(V.w / 2 - bw / 2), by = 34, k = Math.max(0, z.hp / (z.hpMax || CH.hp));
      g.fillStyle = 'rgba(19,16,21,0.85)'; g.fillRect(bx - 3, by - 11, bw + 6, 20);
      g.font = '8px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = z.cs === 'aturdida' ? '#ffe500' : '#ff2e88';
      g.fillText(z.cs === 'aturdida' ? 'EL CHOFER · ¡ATURDIDO!' : 'EL CHOFER', V.w / 2, by - 4.5);
      g.fillStyle = '#3a3440'; g.fillRect(bx, by + 1, bw, 5); g.fillStyle = '#ff2e88'; g.fillRect(bx, by + 1, Math.round(bw * k), 5);
    }
  }
  try {
    var DH = ACH.drawHooks = ACH.drawHooks || { ground: [], ysort: [], air: [], screen: [] };
    if (!Array.isArray(DH.ysort)) DH.ysort = []; if (!Array.isArray(DH.screen)) DH.screen = [];
    DH.ysort.push(drawables); DH.screen.push(drawScreen);
  } catch (e) { warn('drawHooks', e); }

  /* ---------------- API y debug ---------------- */
  function info() {
    if (!St) return { on: false };
    var z = St.chofer;
    return { on: true, charo: St.charo.done, eusebio: St.eusebio.done, fosforito: St.fos.done, mancha: St.fos.mancha ? St.fos.alive : null,
      chofer: z ? { cs: z.cs, hp: z.hp, x: Math.round(z.x), y: Math.round(z.y), state: z.state } : null, choferOn: St.choferOn, choferDone: St.choferDone,
      escaleraCerrada: call(Wd(), 'escaleraCerrada'), lucho: St.lucho ? { f: St.lucho.luchoF, hp: St.lucho.hp, x: Math.round(St.lucho.x), y: Math.round(St.lucho.y) } : null,
      combi: St.combiOpen, perro: St.perro.state, vecina: St.vecina.done, azotea: St.azotea, lata: Object.keys(St.lata).length, night: St.night, objetivo: St.objLast, near: St.near };
  }
  ACH.gambetta = { reset: function (G) { try { reset(G); } catch (e) { warn('reset', e); } }, update: function (G, dt) { try { update(G, dt); } catch (e) { warn('update', e); } },
    info: info, regalar: regalar, talk: talk, CH: CH };
  ACH.debug = ACH.debug || {};
  ACH.debug.gb = {
    info: info,
    // salta a un punto de la historia: 'charo' | 'eusebio' | 'fosforito' | 'escalera' | 'lucho' | 'combi' | 'azotea' | 'perro' | 'vecina'
    ir: function (k) {
      var gb = GB(), G = G0(); if (!gb || !G) return null;
      var P = { charo: [gb.charo.x, gb.charo.y + 16], eusebio: [gb.eusebio.x, gb.eusebio.y - 14], fosforito: [gb.fosforito.x, gb.fosforito.y + 40], escalera: [121.5 * T, 13 * T],
        lucho: [gb.lucho.x - 60, gb.lucho.y], combi: [gb.combi.x, gb.combi.y + 20], azotea: [gb.azotea.ladder.c * T + 8, 38 * T + 6], perro: [gb.perro.x, gb.perro.y + 16], vecina: [gb.vecina.x, gb.vecina.y + 16] }[k];
      if (!P) return null; ACH.debug.teleport(P[0], P[1]); return P;
    },
    done: function (k) { if (!St) return null; if (k === 'charo') finishCharo(G0()); if (k === 'fosforito') { St.fos.done = true; flag('fosforito', true); } if (k === 'eusebio') { St.eusebio.done = true; flag('eusebio', true); } objective(); return info(); },
    mancha: function () { var G = G0(), gb = GB(); if (St && gb && !St.fos.mancha) spawnMancha(G, gb.fosforito.x, gb.fosforito.y); return St && St.fos.mancha ? St.fos.mancha.length : 0; },
    killMancha: function () { var G = G0(); if (!St || !St.fos.mancha) return 0; St.fos.mancha.forEach(function (z) { if (z.state !== 'muerto') ACH.ent.hitZombie(G, z, 1, 0, { dmg: 99 }); }); return 0; },
    chofer: function () { if (!St) return null; St.fos.done = true; var G = G0(); if (G.player.x < 104 * T) ACH.debug.teleport(110 * T, 22 * T); choferTrigger(G); return info().chofer; },
    hitChofer: function (dmg) { var z = St && St.chofer, G = G0(); if (!z || z.state === 'muerto') return null; ACH.ent.hitZombie(G, z, 0, 0, { dmg: dmg || 1 }); return { hp: z.hp, cs: z.cs }; },
    stunChofer: function () { var z = St && St.chofer; if (z) { z.cs = 'aturdida'; z.csT = 0; } return z ? z.cs : null; },
    night: function () { if (ACH.debug.night) ACH.debug.night(true); if (St) St.night.nextT = 0; return St ? St.night : null; }
  };
})();
